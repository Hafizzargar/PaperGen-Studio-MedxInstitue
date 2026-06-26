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

  // Camera State & Refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setError('Could not access the camera. Please ensure your browser has camera permissions enabled.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImage(dataUrl);
      pdfCanvasDataRef.current = null;
      stopCamera();
    }
  };



  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (activeStep !== 2) {
      stopCamera();
    }
  }, [activeStep]);
  
  // Live Frame Auto-Scanner
  useEffect(() => {
    let intervalId;
    let isProcessingFrame = false;
    
    if (isCameraActive && videoRef.current) {
      const checkFrame = async () => {
        if (isProcessingFrame || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
        
        try {
          isProcessingFrame = true;
          const cvModule = await import('../utils/omrScanner');
          const cv = await cvModule.loadOpenCV();
          if (!cv || !cv.Mat || !videoRef.current) return;
          
          // Get the dynamic aspect ratio of the stream to prevent shape stretching/distortion
          const videoW = videoRef.current.videoWidth || 640;
          const videoH = videoRef.current.videoHeight || 480;
          const aspect = videoW / videoH;
          
          // Create offscreen canvas to capture frame
          const canvas = document.createElement('canvas');
          canvas.width = 320; // small size for high speed analysis (~10ms)
          canvas.height = Math.round(320 / aspect);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          // Detect markers
          const numMarkers = cvModule.detectCornersDirect(cv, canvas);
          if (numMarkers === 4 && videoRef.current) {
            // Found all 4 corners! Capture immediately!
            console.log("AUTO-DETECTED 4 CORNERS! Capturing frame...");
            
            // Draw high-res canvas for the actual capture
            const highResCanvas = document.createElement('canvas');
            highResCanvas.width = videoRef.current.videoWidth || 1280;
            highResCanvas.height = videoRef.current.videoHeight || 720;
            const hrCtx = highResCanvas.getContext('2d');
            hrCtx.drawImage(videoRef.current, 0, 0, highResCanvas.width, highResCanvas.height);
            const dataUrl = highResCanvas.toDataURL('image/jpeg', 0.95);
            
            // Visual feedback flash
            const videoParent = videoRef.current.parentElement;
            if (videoParent) {
              videoParent.style.outline = '4px solid #10b981';
              setTimeout(() => {
                if (videoParent) videoParent.style.outline = 'none';
              }, 300);
            }
            
            // Process the capture
            setImage(dataUrl);
            pdfCanvasDataRef.current = null;
            stopCamera();
            
            // Auto run scan!
            setTimeout(() => {
              runScan(dataUrl, true);
            }, 100);
          }
        } catch (e) {
          console.error("Frame analysis error:", e);
        } finally {
          isProcessingFrame = false;
        }
      };
      
      // Analyze a frame every 400ms
      intervalId = setInterval(checkFrame, 400);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraActive]);

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
            setScanProgress(85);
            setScanStatusText('Validating OMR sheet markers...');
            
            const cvModule = await import('../utils/omrScanner');
            const cv = await cvModule.loadOpenCV();
            if (abortScanRef.current) return;
            
            const numMarkers = cvModule.detectCornersDirect(cv, canvas);
            if (numMarkers < 4) {
              setError("Invalid PDF: This document is not a valid MedX OMR Sheet (missing corner black markers).");
              setImage(null);
              pdfCanvasDataRef.current = null;
              setIsScanning(false);
              return;
            }
            
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
        abortScanRef.current = false;
        setIsScanning(true);
        setScanStatusText('Parsing image file...');
        setScanProgress(20);
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (abortScanRef.current) return;
          const imgUrl = evt.target.result;
          
          setScanProgress(40);
          setScanStatusText('Loading image into memory...');
          const img = new Image();
          img.onload = async () => {
            try {
              if (abortScanRef.current) return;
              setScanProgress(60);
              setScanStatusText('Validating OMR sheet markers...');
              
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              
              const cvModule = await import('../utils/omrScanner');
              const cv = await cvModule.loadOpenCV();
              if (abortScanRef.current) return;
              
              const numMarkers = cvModule.detectCornersDirect(cv, canvas);
              if (numMarkers < 4) {
                setError("Invalid Image: This image is not a valid MedX OMR Sheet (missing corner black markers).");
                setImage(null);
                setIsScanning(false);
                return;
              }
              
              setScanProgress(100);
              setImage(imgUrl);
              setError('');
              setScanResult(null);
            } catch (err) {
              console.error("Image validation failed:", err);
              setError("An error occurred while validating the image.");
            } finally {
              if (!abortScanRef.current) {
                setIsScanning(false);
              }
            }
          };
          img.onerror = () => {
            setError("Failed to load image file.");
            setIsScanning(false);
          };
          img.src = imgUrl;
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

  const runScan = async (overrideImage, isFromCamera = false) => {
    const activeImg = overrideImage || image;
    if (!activeImg) {
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
      
      if (result.isSimulated) {
        if (isFromCamera) {
          setError("The captured image was blurry or markers were not clear. Please hold the camera steady and align the OMR sheet again.");
          setIsScanning(false);
          setImage(null);
          startCamera();
        } else {
          setError("Could not detect OMR alignment markers. The image might be blurry or missing corner black squares. Please try again.");
          setIsScanning(false);
        }
        return;
      }

      setScanResult(result);

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
      <style>{`
        .omr-scanner-sidebar {
          width: 200px;
          min-width: 200px;
          background: white; 
          border-radius: 20px; 
          padding: 20px 16px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          position: sticky;
          top: 80px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.3s ease;
        }
        .omr-scanner-content {
          flex: 1;
          min-width: 0;
        }
        .omr-score-grid {
          flex: 3 1 450px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }
        .omr-score-dist-card {
          flex: 2 1 300px;
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .omr-results-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }
        .omr-student-banner {
          background: linear-gradient(135deg, #1e1b4b, #312e81);
          border-radius: 20px;
          padding: 20px 28px;
          color: white;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          box-shadow: 0 10px 25px rgba(30,27,75,0.3);
        }

        @media (max-width: 768px) {
          .omr-sidebar-templates {
            display: none !important;
          }
          .omr-score-dist-row {
            flex-direction: column !important;
            gap: 16px !important;
          }
          .omr-score-dist-card {
            flex: none !important;
            width: 100% !important;
          }
          .omr-scanner-layout {
            flex-direction: column !important;
            gap: 16px !important;
            padding: 0 12px !important;
            margin: 15px auto !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .omr-scanner-content {
            width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          .omr-scanner-sidebar {
            width: 100% !important;
            min-width: 100% !important;
            position: static !important;
            flex-direction: row !important;
            justify-content: space-around !important;
            padding: 12px 8px !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .omr-step-item {
            flex: 1 !important;
            min-width: 75px !important;
            padding: 8px 4px !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 4px !important;
            text-align: center !important;
          }
          .omr-step-item span {
            font-size: 0.7rem !important;
            text-align: center !important;
          }
          .omr-step-line {
            display: none !important;
          }
          .omr-history-section {
            width: 100% !important;
            margin-top: 10px !important;
          }
          .omr-history-list {
            max-height: 160px !important;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important;
            display: grid !important;
            gap: 8px !important;
          }
          .omr-score-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            flex: none !important;
            width: 100% !important;
          }
          .omr-score-grid > div:first-child {
            grid-column: span 2 !important;
          }
          .omr-student-banner {
            grid-template-columns: repeat(2, 1fr) !important;
            padding: 16px 20px !important;
            border-radius: 16px !important;
            gap: 12px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .omr-scanner-header {
            padding: 16px 16px !important;
            gap: 12px !important;
          }
          .omr-results-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            text-align: center !important;
          }
          .omr-results-header button {
            width: 100% !important;
            text-align: center !important;
          }
          .omr-card-mobile-padding {
            padding: 20px 16px !important;
            border-radius: 16px !important;
          }
          .omr-table-wrapper {
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .omr-table-wrapper table {
            min-width: 550px !important;
          }
          .omr-results-container {
            width: 100% !important;
            overflow: hidden !important;
            min-width: 0 !important;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(calc(-50% - 6px), 0); }
          20%, 40%, 60%, 80% { transform: translate(calc(-50% + 6px), 0); }
        }
      `}</style>
      
      {/* Header */}
      <div className="omr-scanner-header" style={{
        backgroundColor: '#1e1b4b',
        color: 'white',
        padding: '12px 24px',
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

      <div className="omr-scanner-layout" style={{ maxWidth: '1440px', margin: '15px auto', padding: '0 20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Vertical Step Indicator - Left Sidebar */}
        <div className="omr-scanner-sidebar">
          {[
            { id: 1, name: 'Setup Rules' },
            { id: 2, name: 'Scan Paper' },
            { id: 3, name: 'Results' }
          ].map((step, idx) => (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                className="omr-step-item"
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
                <div 
                  className="omr-step-line"
                  style={{ 
                    width: '2px', height: '16px', 
                    background: activeStep > step.id ? '#10b981' : '#e2e8f0', 
                    marginLeft: '29px',
                    transition: 'background 0.3s ease'
                  }} 
                />
              )}
            </div>
          ))}

          {/* Download OMR Template Buttons */}
          <div className="omr-sidebar-templates" style={{ margin: '12px 0 0 0', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              OMR Templates
            </span>
            <button 
              onClick={handleDownloadOMR}
              style={{
                width: '100%', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s'
              }}
            >
              <Download size={12} /> Blank A4 Sheet
            </button>
            <button 
              onClick={handleDownloadDummy}
              style={{
                width: '100%', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s'
              }}
            >
              <FlaskConical size={12} /> Dummy Test Sheet
            </button>
          </div>

          {/* Evaluation History Section */}
          {scanHistory.length > 0 && (
            <div className="omr-history-section" style={{ width: '100%' }}>
              <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  History (7 Days)
                </span>
              </div>
              <div className="omr-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
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
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="omr-scanner-content">

        {/* Step 1: Setup */}
        {activeStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Rules Card */}
            <div className="omr-card-mobile-padding" style={{ background: 'white', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={20} color="#3b82f6" /> Evaluation Rules
                </h2>
                <span className="omr-sidebar-templates" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                  Download sheet templates from the left sidebar
                </span>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Left Column: Form Settings */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Student Info */}
                  <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, rgba(139,92,246,0.04) 100%)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Details</span>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>NAME</label>
                        <input 
                          type="text" 
                          placeholder="Name"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>ROLL NO</label>
                        <input 
                          type="text" 
                          placeholder="Roll No"
                          value={rollNo}
                          onChange={(e) => setRollNo(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>SUBJECT CODE</label>
                      <input 
                        type="text" 
                        placeholder="e.g. PHY, CHEM, BIO"
                        value={subjectCode}
                        onChange={(e) => setSubjectCode(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}
                      />
                    </div>
                  </div>

                  {/* Grading config */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>QUESTIONS</label>
                      <input 
                        type="number" min="1" max="180" 
                        value={numQuestions}
                        onChange={handleNumQuestionsChange}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', background: '#f8fafc', color: '#1e293b' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>CORRECT (+)</label>
                      <input 
                        type="number" 
                        value={positiveMarks}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setPositiveMarks(val);
                          localStorage.setItem('omr_positive_marks', val.toString());
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', color: '#10b981', background: '#f8fafc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>INCORRECT (-)</label>
                      <input 
                        type="number" 
                        value={negativeMarks}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setNegativeMarks(val);
                          localStorage.setItem('omr_negative_marks', val.toString());
                        }}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', color: '#ef4444', background: '#f8fafc' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Answer Key Grid */}
                <div style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Master Answer Key</span>
                    
                    {/* Recent Answer Keys Quick-load Dropdown */}
                    {scanHistory.length > 0 && (
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
                            }
                          }
                        }}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: '1px solid #cbd5e1', 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          cursor: 'pointer', 
                          background: 'white',
                          outline: 'none',
                          color: '#475569'
                        }}
                      >
                        <option value="">Quick Load Key...</option>
                        {scanHistory.map(h => (
                          <option key={h.id} value={h.id}>
                            {h.studentName} ({h.date.split(',')[0]})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
                      {Array.from({ length: numQuestions }).map((_, idx) => {
                        const qNo = idx + 1;
                        return (
                          <div key={qNo} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'white', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Q{qNo}</span>
                            <select 
                              value={answerKey[qNo] || 'A'}
                              onChange={(e) => handleAnswerChange(qNo, e.target.value)}
                              style={{ width: '100%', padding: '4px 2px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '700', cursor: 'pointer', background: 'white', fontSize: '0.8rem' }}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="BONUS">BNS</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button 
                  onClick={() => setActiveStep(2)}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(59,130,246,0.2)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                  Next: Scan Sheet <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scan */}
        {activeStep === 2 && (
          <div className="omr-card-mobile-padding" style={{ background: 'white', borderRadius: '20px', padding: isCameraActive ? '16px' : '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)', textAlign: 'center', width: '100%' }}>
            {!isCameraActive && (
              <>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>Scan or Upload OMR Sheet</h2>
                <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.95rem' }}>Capture a photo or upload an image/PDF. Make sure the 4 corner black squares are visible.</p>
              </>
            )}

            {error && (
              <div style={{
                position: 'fixed',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#ef4444',
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: '700',
                fontSize: '0.95rem',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: '90%',
                width: '500px',
                animation: 'shake 0.5s ease-in-out'
              }}>
                <AlertCircle size={20} color="white" />
                <span style={{ flex: 1, textAlign: 'left' }}>{error}</span>
                <button 
                  onClick={() => setError('')} 
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {!image ? (
              isScanning ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', gap: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', maxWidth: '850px', margin: '0 auto' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid rgba(59,130,246,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b', margin: '0 0 4px 0' }}>{scanStatusText}</p>
                    <p style={{ color: '#3b82f6', fontWeight: '800', margin: '0 0 12px 0', fontSize: '0.95rem' }}>{scanProgress}%</p>
                  </div>
                  <div style={{ width: '100%', maxWidth: '260px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${scanProgress}%`, height: '100%', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', transition: 'width 0.2s ease' }} />
                  </div>
                  <button 
                    onClick={handleRetake}
                    style={{ background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : isCameraActive ? (
                <div style={{ background: '#0f172a', borderRadius: '16px', padding: '16px', border: '1px solid #334155', textAlign: 'center', maxWidth: '850px', margin: '0 auto' }}>
                  <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={{ width: '100%', maxHeight: '480px', display: 'block', objectFit: 'contain' }}
                    ></video>
                    
                    {/* Camera Overlay Guide Lines */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px'
                    }}>
                      <div style={{
                        height: '92%',
                        aspectRatio: '0.707',
                        border: '2px dashed rgba(16, 185, 129, 0.5)',
                        borderRadius: '12px',
                        position: 'relative',
                        boxSizing: 'border-box',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
                      }}>
                        {/* 4 Corner Bracket Markers */}
                        {/* Top Left */}
                        <div style={{
                          position: 'absolute',
                          top: '-4px',
                          left: '-4px',
                          width: '24px',
                          height: '24px',
                          borderLeft: '4px solid #10b981',
                          borderTop: '4px solid #10b981',
                          borderTopLeftRadius: '8px'
                        }} />
                        {/* Top Right */}
                        <div style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '24px',
                          height: '24px',
                          borderRight: '4px solid #10b981',
                          borderTop: '4px solid #10b981',
                          borderTopRightRadius: '8px'
                        }} />
                        {/* Bottom Left */}
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          left: '-4px',
                          width: '24px',
                          height: '24px',
                          borderLeft: '4px solid #10b981',
                          borderBottom: '4px solid #10b981',
                          borderBottomLeftRadius: '8px'
                        }} />
                        {/* Bottom Right */}
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          width: '24px',
                          height: '24px',
                          borderRight: '4px solid #10b981',
                          borderBottom: '4px solid #10b981',
                          borderBottomRightRadius: '8px'
                        }} />

                        {/* 4 Black Dot Placement Guides */}
                        {/* Top-Left Target */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          width: '18px',
                          height: '18px',
                          border: '2px solid #10b981',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                        </div>
                        
                        {/* Top-Right Target */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '18px',
                          height: '18px',
                          border: '2px solid #10b981',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                        </div>

                        {/* Bottom-Left Target */}
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '12px',
                          width: '18px',
                          height: '18px',
                          border: '2px solid #10b981',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                        </div>

                        {/* Bottom-Right Target */}
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          width: '18px',
                          height: '18px',
                          border: '2px solid #10b981',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }} />
                        </div>

                        {/* Scanner Laser Line Animation */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                          animation: 'scanLine 3s linear infinite',
                          boxShadow: '0 0 8px #10b981'
                        }} />

                        {/* Text Instruction */}
                        <div style={{
                          position: 'absolute',
                          bottom: '15px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#10b981',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                          Align 4 corner black squares in targets
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                    <button 
                      onClick={stopCamera} 
                      style={{ background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Cancel Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '850px', margin: '0 auto' }}>
                  {/* File Upload Area */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleImageUpload}
                    style={{
                      border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#f8fafc', transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <div style={{ background: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                      <FileImage size={28} color="#3b82f6" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '1.05rem', margin: '0 0 2px 0', color: '#1e293b' }}>Upload OMR Sheet</p>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, fontWeight: '500' }}>Click/drag Image or PDF (Max 10MB)</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/png, image/jpeg, image/jpg, application/pdf"
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>or</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                  </div>

                  {/* Device Camera Button */}
                  <button
                    onClick={startCamera}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      padding: '14px 24px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                  >
                    <Camera size={18} /> Take Photo with Camera
                  </button>
                </div>
              )
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
          <div className="omr-results-container">
            
            {/* Header with Scan Another Sheet Button */}
            <div className="omr-results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
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
            <div className="omr-student-banner">
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

            {/* Score & Distribution Row */}
            <div className="omr-score-dist-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="omr-score-grid">
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
                  <div className="omr-score-dist-card" style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Answer Distribution</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>{attempted} answered</span>
                    </div>
                    {/* Visual bar */}
                    <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px', background: '#f1f5f9' }}>
                      {['A','B','C','D'].map(opt => (
                        dist[opt] > 0 ? <div key={opt} style={{ width: `${(dist[opt] / numQuestions) * 100}%`, background: colors[opt], transition: 'width 0.5s ease' }} /> : null
                      ))}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['A','B','C','D'].map(opt => (
                        <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[opt] }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>{opt}: {dist[opt]}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#cbd5e1' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>Blank: {dist.U}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Detailed Table */}
            <div className="omr-card-mobile-padding" style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}>
              <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Detailed Breakdown</h3>
              </div>
              <div className="omr-table-wrapper" style={{ width: '100%', overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
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
