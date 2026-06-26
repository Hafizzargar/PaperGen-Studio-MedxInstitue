import React, { useState, useEffect, useRef } from 'react';
import { processOMR } from '../utils/omrScanner';
import { processOMRDirect } from '../utils/omrDirectReader';
import { ArrowLeft, Settings, CheckCircle, AlertCircle, ScanLine, BrainCircuit, Trash2, Camera, FileImage, Download, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OMRScanner = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [image, setImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const abortScanRef = useRef(false);
  const pdfCanvasDataRef = useRef(null); // Stores raw PDF canvas pixels for direct reading
  
  // Settings State
  const [numQuestions, setNumQuestions] = useState(() => {
    return parseInt(localStorage.getItem('omr_num_questions')) || 180;
  });
  const [positiveMarks, setPositiveMarks] = useState(() => {
    return parseInt(localStorage.getItem('omr_positive_marks')) || 4;
  });
  const [negativeMarks, setNegativeMarks] = useState(() => {
    return parseInt(localStorage.getItem('omr_negative_marks')) || -1;
  });
  const [answerKey, setAnswerKey] = useState({});
  const fileInputRef = useRef(null);

  // Student Info State
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  // Scan History State
  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('omr_scan_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Auto-remove entries older than 7 days (1 week)
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let cleaned = parsed.filter(item => item.timestamp > oneWeekAgo);
        // Cap at maximum of 5 items
        cleaned = cleaned.slice(0, 5);
        setScanHistory(cleaned);
        localStorage.setItem('omr_scan_history', JSON.stringify(cleaned));
      }
    } catch (e) {
      console.error("Failed to load OMR scan history:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('omr_master_answer_key');
      if (storedKey) {
        setAnswerKey(JSON.parse(storedKey));
      } else {
        const initialKey = {};
        for(let i=1; i<=180; i++) initialKey[i] = 'A';
        setAnswerKey(initialKey);
        localStorage.setItem('omr_master_answer_key', JSON.stringify(initialKey));
      }
    } catch (e) {
      console.error("Failed to load OMR master answer key:", e);
    }
  }, []);

  const handleNumQuestionsChange = (e) => {
    const num = parseInt(e.target.value) || 1;
    setNumQuestions(num);
    localStorage.setItem('omr_num_questions', num.toString());
    
    setAnswerKey(prev => {
      const newKey = { ...prev };
      for(let i=1; i<=num; i++) {
        if(!newKey[i]) newKey[i] = 'A';
      }
      localStorage.setItem('omr_master_answer_key', JSON.stringify(newKey));
      return newKey;
    });
  };

  const handleImageUpload = (e) => {
    e.preventDefault();
    let file;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }

    if (file) {
      // Allow images and PDFs, reject folders and other types
      if (!file.type || (!file.type.startsWith('image/') && file.type !== 'application/pdf')) {
        setError('Please upload a valid Image or PDF file. Folders or other files are not supported.');
        return;
      }
      
      if (file.type === 'application/pdf') {
        abortScanRef.current = false;
        setIsScanning(true); // Show loading while converting PDF
        setScanStatusText('Parsing PDF file...');
        setScanProgress(10);
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            if (abortScanRef.current) return;
            // Dynamically load pdf.js to avoid bundle bloat and worker issues
            if (!window.pdfjsLib) {
              setScanStatusText('Loading PDF engine...');
              setScanProgress(20);
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
                script.onload = () => {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                  resolve();
                };
                script.onerror = reject;
                document.body.appendChild(script);
              });
            }
            if (abortScanRef.current) return;
            
            setScanProgress(30);
            setScanStatusText('Reading document...');
            const typedarray = new Uint8Array(evt.target.result);
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            
            if (abortScanRef.current) return;
            setScanProgress(50);
            setScanStatusText('Extracting Page 1...');
            const page = await pdf.getPage(1); // Only scan the first page
            
            const viewport = page.getViewport({ scale: 2.0 }); // Render at 2x scale for clear OpenCV scanning
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            
            // Fill white background to prevent JPEG transparent-to-black conversion
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            setScanProgress(70);
            setScanStatusText('Rendering image...');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            if (abortScanRef.current) return;
            setScanProgress(90);
            
            // Store raw pixel data for direct reading (100% accurate)
            pdfCanvasDataRef.current = {
              imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
              width: canvas.width,
              height: canvas.height
            };
            
            setImage(canvas.toDataURL('image/jpeg', 0.9));
            setError('');
            setScanResult(null);
            setScanProgress(100);
          } catch (err) {
            if (abortScanRef.current) return;
            console.error("PDF rendering failed:", err);
            setError("Failed to read the PDF file. Please ensure it's a valid PDF.");
          } finally {
            if (!abortScanRef.current) {
              setIsScanning(false);
            }
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Handle normal images
        const reader = new FileReader();
        reader.onload = (evt) => {
          setImage(evt.target.result);
          setError('');
          setScanResult(null);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3b82f6';
    e.currentTarget.style.background = '#eff6ff';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#cbd5e1';
    e.currentTarget.style.background = '#f8fafc';
  };

  const handleRetake = () => {
    abortScanRef.current = true;
    setImage(null);
    setScanResult(null);
    setError('');
    setIsScanning(false);
    setLogs([]);
    pdfCanvasDataRef.current = null;
  };

  const handleAnswerChange = (qNo, answer) => {
    setAnswerKey(prev => {
      const updated = {
        ...prev,
        [qNo]: answer
      };
      localStorage.setItem('omr_master_answer_key', JSON.stringify(updated));
      return updated;
    });
  };

  const runScan = async () => {
    if (!image) {
      setError('Please upload an OMR sheet image.');
      return;
    }

    abortScanRef.current = false;
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('Initializing scanner...');
    setLogs(['Scanner initialized.']);
    setError('');
    setScanResult(null);

    const progressCb = (progress, msg) => {
      if (abortScanRef.current) return false;
      if (progress >= 0) setScanProgress(progress);
      if (msg) {
        setScanStatusText(msg);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }
      return true;
    };

    try {
      let result;
      
      if (pdfCanvasDataRef.current) {
        // FAST PATH: PDF was uploaded, use direct pixel reading (no OpenCV)
        const { imageData, width, height } = pdfCanvasDataRef.current;
        result = await processOMRDirect(imageData, width, height, numQuestions, answerKey, positiveMarks, negativeMarks, progressCb);
      } else {
        // FALLBACK: Camera/image upload, use OpenCV pipeline
        result = await processOMR(image, numQuestions, answerKey, positiveMarks, negativeMarks, progressCb);
      }
      
      if (abortScanRef.current) return;
      
      setScanResult(result);
      if (result.isSimulated) {
        setError("Warning: Could not detect corner markers. Showing simulated result.");
      }

      // Save to scan history
      const newHistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        studentName: studentName || 'Unknown Student',
        rollNo: rollNo || '—',
        subjectCode: subjectCode || '—',
        result: result,
        numQuestions: numQuestions,
        positiveMarks: positiveMarks,
        negativeMarks: negativeMarks,
        answerKey: { ...answerKey } // Store the answer key used for this evaluation
      };
      
      setScanHistory(prev => {
        const updated = [newHistoryEntry, ...prev].slice(0, 5); // Limit local storage history to last 5 entries
        localStorage.setItem('omr_scan_history', JSON.stringify(updated));
        return updated;
      });

      setActiveStep(3);
    } catch (err) {
      if (abortScanRef.current || err.message === 'Cancelled') return;
      console.error(err);
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      if (!abortScanRef.current) {
        setIsScanning(false);
      }
    }
  };

  const handleSelectHistoryEntry = (entry) => {
    setStudentName(entry.studentName === 'Unknown Student' ? '' : entry.studentName);
    setRollNo(entry.rollNo === '—' ? '' : entry.rollNo);
    setSubjectCode(entry.subjectCode === '—' ? '' : entry.subjectCode);
    setNumQuestions(entry.numQuestions);
    setPositiveMarks(entry.positiveMarks);
    setNegativeMarks(entry.negativeMarks);
    if (entry.answerKey) {
      setAnswerKey(entry.answerKey);
      localStorage.setItem('omr_master_answer_key', JSON.stringify(entry.answerKey));
    }
    setScanResult(entry.result);
    setImage(null);
    pdfCanvasDataRef.current = null;
    setActiveStep(3); // Go straight to results view
  };

  const handleDeleteHistoryEntry = (id, e) => {
    e.stopPropagation(); // Prevent loading entry on delete
    setScanHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('omr_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDownloadOMR = async () => {
    const { generateOMRSheet } = await import('../utils/generateOMR');
    generateOMRSheet(180);
  };

  const handleDownloadDummy = async () => {
    const { generateDummyOMR } = await import('../utils/generateDummyOMR');
    generateDummyOMR(180);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{
        backgroundColor: '#1e1b4b',
        color: 'white',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '10px', borderRadius: '12px' }}>
            <ScanLine size={24} color="white" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(to right, #ffffff, #c7d2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MedX OMR Scanner
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Vertical Step Indicator - Left Sidebar */}
        <div style={{ 
          width: '200px', 
          minWidth: '200px',
          background: 'white', 
          borderRadius: '20px', 
          padding: '20px 16px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: '100px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {[
            { id: 1, name: 'Setup Rules' },
            { id: 2, name: 'Scan Paper' },
            { id: 3, name: 'Results' }
          ].map((step, idx) => (
            <div key={step.id}>
              <div 
                onClick={() => step.id < activeStep ? setActiveStep(step.id) : null}
                style={{
                  padding: '14px 12px',
                  borderRadius: '12px',
                  background: activeStep === step.id ? 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.08))' : 'transparent',
                  border: `2px solid ${activeStep === step.id ? '#3b82f6' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: step.id < activeStep ? 'pointer' : 'default',
                  opacity: activeStep >= step.id ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: activeStep === step.id ? '#3b82f6' : (activeStep > step.id ? '#10b981' : '#e2e8f0'),
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold'
                }}>
                  {activeStep > step.id ? <CheckCircle size={16} /> : step.id}
                </div>
                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: activeStep === step.id ? '#1e293b' : '#94a3b8' }}>{step.name}</span>
              </div>
              {/* Connecting line between steps */}
              {idx < 2 && (
                <div style={{ 
                  width: '2px', height: '16px', 
                  background: activeStep > step.id ? '#10b981' : '#e2e8f0', 
                  marginLeft: '29px',
                  transition: 'background 0.3s ease'
                }} />
              )}
            </div>
          ))}

          {/* Evaluation History Section */}
          {scanHistory.length > 0 && (
            <>
              <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  History (7 Days)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {scanHistory.map(entry => (
                  <div 
                    key={entry.id}
                    onClick={() => handleSelectHistoryEntry(entry)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', width: '80%', textAlign: 'left' }}>
                      <span style={{ fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.studentName}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                        Score: <strong style={{ color: '#3b82f6' }}>{entry.result.totalScore}</strong>
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryEntry(entry.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>

        {/* Step 1: Setup */}
        {activeStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* OMR Download Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div style={{ flex: '1 1 300px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  <FileImage size={20} /> Official MedX OMR Sheet
                </h2>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Our scanner uses advanced computer vision. It <strong>requires</strong> the use of the official MedX OMR sheet which contains specific alignment markers. Generate and print the sheet for your students before the test.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={handleDownloadOMR}
                  style={{
                    background: '#3b82f6', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(59,130,246,0.3)', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <Download size={20} /> Blank OMR Sheet
                </button>
                <button 
                  onClick={handleDownloadDummy}
                  style={{
                    background: '#8b5cf6', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(139,92,246,0.3)', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  <FlaskConical size={18} /> Dummy Test Sheet
                </button>
              </div>
            </div>

            {/* Rules Card */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={22} color="#3b82f6" /> Evaluation Rules
              </h2>

              {/* Student Info Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 100%)', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.1)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Student Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter student name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', background: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Roll No</label>
                  <input 
                    type="text" 
                    placeholder="Enter roll number"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', background: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Subject Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PHY, CHEM, BIO"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', background: 'white' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Total Questions</label>
                  <input 
                    type="number" min="1" max="180" 
                    value={numQuestions}
                    onChange={handleNumQuestionsChange}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', background: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Marks for Correct (+)</label>
                  <input 
                    type="number" 
                    value={positiveMarks}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPositiveMarks(val);
                      localStorage.setItem('omr_positive_marks', val.toString());
                    }}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', color: '#10b981', background: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Marks for Incorrect (-)</label>
                  <input 
                    type="number" 
                    value={negativeMarks}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setNegativeMarks(val);
                      localStorage.setItem('omr_negative_marks', val.toString());
                    }}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: '600', color: '#ef4444', background: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>Master Answer Key</h3>
                
                {/* Recent Answer Keys Quick-load Dropdown */}
                {scanHistory.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Quick Load:</span>
                    <select 
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId) {
                          const entry = scanHistory.find(h => h.id === selectedId);
                          if (entry && entry.answerKey) {
                            setAnswerKey(entry.answerKey);
                            setNumQuestions(entry.numQuestions);
                            setPositiveMarks(entry.positiveMarks);
                            setNegativeMarks(entry.negativeMarks);
                            setSubjectCode(entry.subjectCode === '—' ? '' : entry.subjectCode);
                            
                            localStorage.setItem('omr_master_answer_key', JSON.stringify(entry.answerKey));
                            localStorage.setItem('omr_num_questions', entry.numQuestions.toString());
                            localStorage.setItem('omr_positive_marks', entry.positiveMarks.toString());
                            localStorage.setItem('omr_negative_marks', entry.negativeMarks.toString());
                            if (entry.subjectCode !== '—') {
                              localStorage.setItem('omr_subject_code', entry.subjectCode);
                            }
                          }
                        }
                      }}
                      style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        border: '1px solid #cbd5e1', 
                        fontSize: '0.8rem', 
                        fontWeight: '600', 
                        cursor: 'pointer', 
                        background: 'white',
                        outline: 'none',
                        color: '#475569'
                      }}
                    >
                      <option value="">Recent Keys...</option>
                      {scanHistory.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.studentName} - {h.subjectCode} ({h.date.split(',')[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
                  {Array.from({ length: numQuestions }).map((_, idx) => {
                    const qNo = idx + 1;
                    return (
                      <div key={qNo} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textAlign: 'center' }}>Q{qNo}</span>
                        <select 
                          value={answerKey[qNo] || 'A'}
                          onChange={(e) => handleAnswerChange(qNo, e.target.value)}
                          style={{ padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '700', cursor: 'pointer', background: 'white', fontSize: '0.9rem' }}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="BONUS">BONUS</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
                <button 
                  onClick={() => setActiveStep(2)}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(59,130,246,0.3)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  Next Step: Scan Sheet <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scan */}
        {activeStep === 2 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px', color: '#1e293b' }}>Upload Completed Sheet</h2>
            <p style={{ color: '#64748b', marginBottom: '40px', fontSize: '1.05rem' }}>Make sure the 4 corner black squares are visible in the photo.</p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px', fontWeight: '600' }}>
                <AlertCircle size={20} /> {error}
              </div>
            )}

            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleImageUpload}
                style={{
                  border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '60px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: '#f8fafc', transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <div style={{ background: 'white', padding: '20px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <Camera size={40} color="#3b82f6" />
                </div>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '1.2rem', margin: '0 0 6px 0', color: '#1e293b' }}>Click or drag to upload</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>PNG, JPG, PDF up to 10MB</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/jpg, application/pdf"
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <img src={image} alt="OMR Sheet" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '16px', objectFit: 'contain', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button 
                    onClick={handleRetake}
                    style={{ background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '14px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}
                  >
                    <Trash2 size={18} /> {isScanning ? 'Cancel Scan' : 'Retake'}
                  </button>
                  <button 
                    onClick={runScan}
                    disabled={isScanning}
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '14px 36px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: isScanning ? 0.7 : 1, fontSize: '1rem', boxShadow: '0 4px 14px rgba(59,130,246,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  >
                    {isScanning ? <><div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Processing...</> : <><ScanLine size={18} /> Evaluate Sheet</>}
                  </button>
                </div>

                {isScanning && (
                  <div style={{ marginTop: '30px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.95rem' }}>{scanStatusText}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                          onClick={() => setShowLogs(!showLogs)} 
                          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}
                        >
                          {showLogs ? 'Hide Logs' : 'Show Logs'}
                        </button>
                        <span style={{ fontWeight: '800', color: '#3b82f6', fontSize: '0.95rem', minWidth: '40px', textAlign: 'right' }}>{scanProgress}%</span>
                      </div>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanProgress}%`, height: '100%', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', transition: 'width 0.2s ease', borderRadius: '4px' }} />
                    </div>

                    {showLogs && (
                      <div style={{ marginTop: '16px', background: '#0f172a', padding: '12px', borderRadius: '8px', height: '150px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#10b981', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {logs.map((log, i) => (
                          <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>{log}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {activeStep === 3 && scanResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header with Scan Another Sheet Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Evaluation Report</h2>
              <button 
                onClick={() => {
                  setImage(null);
                  setActiveStep(2);
                }}
                style={{ 
                  background: 'white', 
                  color: '#3b82f6', 
                  border: '2px solid #3b82f6', 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.08)'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'white'; }}
              >
                Scan Another Sheet
              </button>
            </div>

            {/* Student Info Banner - always shown */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              borderRadius: '20px',
              padding: '20px 28px',
              color: 'white',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              boxShadow: '0 10px 25px rgba(30,27,75,0.3)'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Student Name</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{studentName || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Roll No</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{rollNo || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Subject Code</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{subjectCode || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Exam</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>NEET / JEE Pattern</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Questions</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{numQuestions}</span>
              </div>
            </div>

            {/* Score Cards - compact single row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '16px', padding: '16px 12px', color: 'white', textAlign: 'center', boxShadow: '0 8px 20px rgba(59,130,246,0.3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.9, marginBottom: '4px' }}>Total Score</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', lineHeight: 1 }}>{scanResult.totalScore}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>/ {scanResult.maxScore}</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #dcfce7', borderRadius: '16px', padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>Correct</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#15803d', lineHeight: 1 }}>{scanResult.correctCount}</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #fee2e2', borderRadius: '16px', padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>Incorrect</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#b91c1c', lineHeight: 1 }}>{scanResult.incorrectCount}</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #e0e7ff', borderRadius: '16px', padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', marginBottom: '4px' }}>Attempted</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#4338ca', lineHeight: 1 }}>{scanResult.correctCount + scanResult.incorrectCount}</div>
              </div>
              <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Unattempted</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#475569', lineHeight: 1 }}>{scanResult.unattemptedCount}</div>
              </div>
            </div>

            {/* Answer Distribution A/B/C/D */}
            {(() => {
              const dist = { A: 0, B: 0, C: 0, D: 0, U: 0 };
              scanResult.details.forEach(d => { dist[d.scanned] = (dist[d.scanned] || 0) + 1; });
              const attempted = dist.A + dist.B + dist.C + dist.D;
              const colors = { A: '#3b82f6', B: '#8b5cf6', C: '#f59e0b', D: '#10b981' };
              return (
                <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Answer Distribution</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>{attempted} answered</span>
                  </div>
                  {/* Visual bar */}
                  <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px', background: '#f1f5f9' }}>
                    {['A','B','C','D'].map(opt => (
                      dist[opt] > 0 ? <div key={opt} style={{ width: `${(dist[opt] / numQuestions) * 100}%`, background: colors[opt], transition: 'width 0.5s ease' }} /> : null
                    ))}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['A','B','C','D'].map(opt => (
                      <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: colors[opt] }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>{opt}: {dist[opt]}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8' }}>Blank: {dist.U}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Table */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}>
              <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Detailed Breakdown</h3>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Q. No</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Expected Answer</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Scanned Answer</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                      <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.details.map((row) => (
                      <tr key={row.qNo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: '700', color: '#1e293b' }}>{row.qNo}</td>
                        <td style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>{row.expected}</td>
                        <td style={{ padding: '16px', fontWeight: '800', color: row.scanned === 'U' ? '#94a3b8' : '#1e293b' }}>{row.scanned}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700',
                            background: row.status === 'Correct' ? '#dcfce7' : row.status === 'Incorrect' ? '#fee2e2' : '#f1f5f9',
                            color: row.status === 'Correct' ? '#16a34a' : row.status === 'Incorrect' ? '#ef4444' : '#64748b'
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800', color: row.status === 'Correct' ? '#16a34a' : row.status === 'Incorrect' ? '#ef4444' : '#64748b' }}>
                          {row.status === 'Correct' ? `+${positiveMarks}` : row.status === 'Incorrect' ? `${negativeMarks}` : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        </div>{/* End Main Content Area */}
      </div>{/* End Flex Container */}
    </div>
  );
};

export default OMRScanner;
