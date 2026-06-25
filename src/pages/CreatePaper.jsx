import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ControlPanel from '../components/ControlPanel';
import PaperPreview from '../components/PaperPreview';

export default function CreatePaper() {
  const navigate = useNavigate();

  const [paperMode, setPaperMode] = useState(() => {
    return localStorage.getItem('paperMode') || 'full';
  });

  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem(`paperQuestions_${paperMode}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    } else {
      // Fallback for migration
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

  const addQuestion = (section, text, image, options) => {
    setQuestions(prev => ({
      ...prev,
      [section]: [
        ...prev[section],
        { id: Date.now().toString(), text, image, options }
      ]
    }));
  };

  const removeQuestion = (section, id) => {
    setQuestions(prev => ({
      ...prev,
      [section]: prev[section].filter(q => q.id !== id)
    }));
  };

  const clearPaper = () => {
    if(window.confirm('Are you sure you want to start a completely new paper? This will erase the current one.')) {
      setQuestions({ physics: [], chemistry: [], biology: [] });
      setPaperCodes({ A: true, B: false, C: false, D: false });
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `medx_draft_${paperMode}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadPDF = () => {
    window.print();
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

  // For the screen view, we just show the un-shuffled master test.
  // We'll use the first active code, or "None".
  const masterCodeLabel = activeCodesArray.join(', ');

  return (
    <div className="app-container">
      <ControlPanel 
        onBack={() => navigate('/')}
        onAddQuestion={addQuestion}
        paperCodes={paperCodes}
        onTogglePaperCode={togglePaperCode}
        onDownloadPDF={handleDownloadPDF}
        onClearPaper={clearPaper}
        onExportJSON={handleExportJSON}
        counts={{
          physics: questions.physics.length,
          chemistry: questions.chemistry.length,
          biology: questions.biology.length
        }}
        paperMode={paperMode}
      />
      
      {/* SCREEN PREVIEW (Only visible on screen, hidden on print) */}
      <div className="screen-only-preview" style={{ flex: 1, overflowY: 'auto' }}>
        <PaperPreview 
          ref={paperRef}
          questions={questions}
          targetCode={masterCodeLabel}
          isShuffled={false}
          onRemoveQuestion={removeQuestion}
          paperMode={paperMode}
        />
      </div>

      {/* PRINT PREVIEW (Only visible on print, hidden on screen) */}
      <div className="print-only-preview">
        {activeCodesArray.map((code, index) => (
          <div key={code} className="print-page-break-container" style={{ pageBreakBefore: index === 0 ? 'auto' : 'always', breakBefore: index === 0 ? 'auto' : 'page' }}>
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
    </div>
  );
}
