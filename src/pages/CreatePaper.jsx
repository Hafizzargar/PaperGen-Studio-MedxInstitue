import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import ControlPanel from '../components/ControlPanel';
import PaperPreview from '../components/PaperPreview';
import CustomAlert from '../components/CustomAlert';

const MOTIVATIONAL_MESSAGES = [
  '📄 Preparing your papers...',
  '🎯 Making every question count!',
  '✨ Crafting Set {code} with care...',
  '🧪 Mixing up the perfect paper...',
  '🔬 Almost there, stay with us!',
  '📝 Your hard work is paying off!',
  '🚀 Finalizing the magic...',
  '💪 Great papers take great patience!',
  '🏆 Excellence is in the details!',
  '📦 Packing everything into a neat ZIP...',
];

export default function CreatePaper() {
  const navigate = useNavigate();
  const [customAlert, setCustomAlert] = useState(null);

  const [paperMode, setPaperMode] = useState(() => {
    return localStorage.getItem('paperMode') || 'full';
  });

  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem(`paperQuestions_${paperMode}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      const oldSaved = localStorage.getItem('paperQuestions');
      if (oldSaved && paperMode === 'full') {
        try { return JSON.parse(oldSaved); } catch(e) {}
      }
    }
    return { physics: [], chemistry: [], biology: [] };
  });

  const [paperCodes, setPaperCodes] = useState(() => {
    const saved = localStorage.getItem(`paperCodes_${paperMode}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return { A: true, B: false, C: false, D: false };
  });

  useEffect(() => {
    localStorage.setItem(`paperQuestions_${paperMode}`, JSON.stringify(questions));
  }, [questions, paperMode]);

  useEffect(() => {
    localStorage.setItem(`paperCodes_${paperMode}`, JSON.stringify(paperCodes));
  }, [paperCodes, paperMode]);

  const paperRef = useRef(null);

  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    setEditingQuestion(null);
  }, [paperMode]);

  const addQuestion = (section, text, image, options) => {
    setQuestions(prev => ({
      ...prev,
      [section]: [
        ...prev[section],
        { id: Date.now().toString(), text, image, options }
      ]
    }));
  };

  const updateQuestion = (id, section, text, image, options) => {
    setQuestions(prev => {
      const oldSection = editingQuestion?.section;
      if (!oldSection) return prev;
      
      const updatedQuestion = { id, text, image, options };
      const newQuestions = { ...prev };
      
      if (oldSection === section) {
        newQuestions[section] = prev[section].map(q => q.id === id ? updatedQuestion : q);
      } else {
        newQuestions[oldSection] = prev[oldSection].filter(q => q.id !== id);
        newQuestions[section] = [...prev[section], updatedQuestion];
      }
      
      return newQuestions;
    });
    setEditingQuestion(null);
  };

  const handleSelectQuestion = (sectionKey, question) => {
    setEditingQuestion({
      id: question.id,
      section: sectionKey,
      text: question.text,
      image: question.image,
      options: question.options
    });
  };

  const removeQuestion = (section, id) => {
    if (editingQuestion && editingQuestion.id === id) {
      setEditingQuestion(null);
    }
    setQuestions(prev => ({
      ...prev,
      [section]: prev[section].filter(q => q.id !== id)
    }));
  };

  const clearPaper = () => {
    setCustomAlert({
      title: 'Clear Mock Paper?',
      message: 'Are you sure you want to start a completely new paper? This will erase the current draft.',
      type: 'confirm',
      variant: 'warning',
      confirmText: 'Yes, Clear Paper',
      cancelText: 'Cancel',
      onConfirm: () => {
        setQuestions({ physics: [], chemistry: [], biology: [] });
        setPaperCodes({ A: true, B: false, C: false, D: false });
      }
    });
  };

  const fileInputRef = useRef(null);

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `medx_draft_${paperMode}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importFromJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setQuestions(parsed);
      } catch (err) {
        setCustomAlert({
          title: 'Invalid File',
          message: 'The uploaded JSON file is invalid or not in the correct format.',
          type: 'alert',
          variant: 'danger',
          confirmText: 'Okay'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipMessage, setZipMessage] = useState('');
  const [zipCurrentSet, setZipCurrentSet] = useState('');

  const handleDownloadPDF = async () => {
    if (activeCodesArray.length === 0) return;
    setIsGeneratingZip(true);
    setZipProgress(0);
    setZipMessage(MOTIVATIONAL_MESSAGES[0]);
    setZipCurrentSet('');

    // Step 1: Make the print preview visible so we can capture it
    const printPreviewDiv = document.querySelector('.print-only-preview');
    if (printPreviewDiv) {
      printPreviewDiv.style.cssText = 'visibility:visible; position:static; left:0; top:0; width:100%; z-index:9999; background:#ffffff;';
    }

    // Step 2: Hide ALL delete buttons and no-print elements so they don't appear in PDF
    const deleteBtns = document.querySelectorAll('.delete-btn, .no-print');
    deleteBtns.forEach(btn => { btn.style.display = 'none'; });

    // Wait for browser to fully paint
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Count total pages across all sets for progress tracking
    let totalPages = 0;
    for (const code of activeCodesArray) {
      totalPages += document.querySelectorAll(`[data-code="${code}"] .page-container`).length;
    }
    let completedPages = 0;

    try {
      const zip = new JSZip();

      for (const code of activeCodesArray) {
        setZipCurrentSet(code);
        const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)].replace('{code}', code);
        setZipMessage(msg);

        const pageElements = document.querySelectorAll(`[data-code="${code}"] .page-container`);
        if (pageElements.length === 0) continue;

        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let i = 0; i < pageElements.length; i++) {
          const el = pageElements[i];

          const dataUrl = await toPng(el, {
            quality: 1.0,
            pixelRatio: 1.5,
            backgroundColor: '#ffffff',
            skipFonts: true,
            filter: (node) => {
              if (node.classList) {
                if (node.classList.contains('delete-btn') || node.classList.contains('no-print')) {
                  return false;
                }
              }
              return true;
            }
          });

          // Convert PNG to JPEG for smaller file size
          const img = new Image();
          await new Promise((resolve) => { img.onload = resolve; img.src = dataUrl; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.75);

          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, 210, 297);

          // Update progress
          completedPages++;
          const pct = Math.round((completedPages / totalPages) * 90); // 90% for pages, 10% for zipping
          setZipProgress(pct);

          // Rotate motivational messages every few pages
          if (completedPages % 3 === 0) {
            const newMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)].replace('{code}', code);
            setZipMessage(newMsg);
          }
        }

        const pdfBlob = pdf.output('blob');
        zip.file(`MediX_Institute_Mock_Test_Set_${code}.pdf`, pdfBlob);
      }

      setZipProgress(95);
      setZipMessage('📦 Packing everything into a neat ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setZipProgress(100);
      setZipMessage('✅ Done! Downloading now...');
      await new Promise(resolve => setTimeout(resolve, 500));
      saveAs(zipBlob, "MediX_Institute_Mock_Tests.zip");

    } catch (error) {
      console.error("Error generating ZIP:", error);
      setCustomAlert({
        title: 'Generation Failed',
        message: 'An error occurred while generating the ZIP of mock papers. Please check the console.',
        type: 'alert',
        variant: 'danger',
        confirmText: 'Okay'
      });
    } finally {
      if (printPreviewDiv) {
        printPreviewDiv.style.cssText = '';
      }
      deleteBtns.forEach(btn => { btn.style.display = ''; });
      setIsGeneratingZip(false);
      setZipProgress(0);
    }
  };

  const togglePaperCode = (code) => {
    setPaperCodes(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const activeCodesArray = Object.entries(paperCodes)
    .filter(([_, isActive]) => isActive)
    .map(([code]) => code);

  const masterCodeLabel = activeCodesArray.length > 0 ? 'Master Draft' : 'None';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Contact Marquee Banner */}
      <div style={{
        width: '100%',
        backgroundColor: '#1e1b4b',
        color: '#f59e0b',
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        padding: '10px 0',
        zIndex: 1000,
        fontSize: '0.9rem',
        fontWeight: '600',
        flexShrink: 0
      }}>
        <marquee 
          scrollamount="5"
          onMouseOver={(e) => e.currentTarget.stop()}
          onMouseOut={(e) => e.currentTarget.start()}
        >
          <span>System Notice: Our technical support team is actively working on resolving platform issues. If you experience any technical difficulties, please </span>
          <a href="mailto:hafezzargar987@gmail.com" style={{ color: '#60a5fa', textDecoration: 'underline', margin: '0 4px', fontWeight: '700' }}>contact support</a>
          <span> or visit the official </span>
          <a href="https://medxinstitute-doda.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', margin: '0 4px', fontWeight: '700' }}>Medix Institute Doda Portal</a>
          <span> for assistance.</span>
        </marquee>
      </div>

      <div className="app-container" style={{ flex: 1, minHeight: 0 }}>
      <ControlPanel 
        onBack={() => navigate('/')}
        onAddQuestion={addQuestion}
        paperCodes={paperCodes}
        onTogglePaperCode={togglePaperCode}
        onDownloadPDF={handleDownloadPDF}
        onClearPaper={clearPaper}
        onExportJSON={exportToJSON}
        onImportJSON={importFromJSON}
        fileInputRef={fileInputRef}
        isGeneratingZip={isGeneratingZip}
        questions={questions}
        paperMode={paperMode}
        setPaperMode={setPaperMode}
        editingQuestion={editingQuestion}
        onUpdateQuestion={updateQuestion}
        onCancelEdit={() => setEditingQuestion(null)}
        counts={{
          physics: questions.physics.length,
          chemistry: questions.chemistry.length,
          biology: questions.biology.length
        }}
      />
      
      {/* FLOATING DOWNLOAD BUTTON - TOP RIGHT */}
      {activeCodesArray.length > 0 && !isGeneratingZip && (
        <button
          onClick={handleDownloadPDF}
          className="floating-download-btn"
          title="Download ZIP of all selected paper sets"
        >
          <Download size={22} />
          <span>Download ZIP</span>
        </button>
      )}

      {/* FULL PAGE LOADING OVERLAY */}
      {isGeneratingZip && (
        <div className="zip-loading-overlay">
          <div className="zip-loading-card">
            <div className="zip-loading-spinner"></div>
            <h2 className="zip-loading-title">
              Generating Paper Set{activeCodesArray.length > 1 ? 's' : ''}
              {zipCurrentSet && <span className="zip-set-badge"> {zipCurrentSet}</span>}
            </h2>
            <div className="zip-progress-bar-container">
              <div className="zip-progress-bar" style={{ width: `${zipProgress}%` }}></div>
            </div>
            <div className="zip-progress-text">{zipProgress}% Complete</div>
            <p className="zip-motivational-text">{zipMessage}</p>
          </div>
        </div>
      )}

      {/* SCREEN PREVIEW (Only visible on screen, hidden on print) */}
      <div className="screen-only-preview" style={{ flex: 1, overflowY: 'auto' }}>
        <PaperPreview 
          ref={paperRef}
          questions={questions}
          targetCode={masterCodeLabel}
          isShuffled={false}
          onRemoveQuestion={removeQuestion}
          paperMode={paperMode}
          activeQuestionId={editingQuestion ? editingQuestion.id : null}
          onSelectQuestion={handleSelectQuestion}
        />
      </div>

      {/* PRINT PREVIEW (Only visible on print, hidden on screen) */}
      <div className="print-only-preview">
        {activeCodesArray.map((code, index) => (
          <div key={code} className="print-page-break-container" data-code={code} style={{ pageBreakBefore: index === 0 ? 'auto' : 'always', breakBefore: index === 0 ? 'auto' : 'page' }}>
            <PaperPreview 
              questions={questions}
              targetCode={code}
              isShuffled={true}
              onRemoveQuestion={removeQuestion}
              paperMode={paperMode}
            />
          </div>
        ))}
      </div>
      {customAlert && (
        <CustomAlert
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.type}
          variant={customAlert.variant}
          confirmText={customAlert.confirmText}
          cancelText={customAlert.cancelText}
          onConfirm={() => {
            customAlert.onConfirm?.();
            setCustomAlert(null);
          }}
          onCancel={() => {
            customAlert.onCancel?.();
            setCustomAlert(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
