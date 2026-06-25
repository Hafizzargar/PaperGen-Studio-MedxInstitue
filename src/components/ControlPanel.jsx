import { useState, useRef, useEffect } from 'react';
import { Download, PlusCircle, Image as ImageIcon, BookOpen, Trash2, Camera, FileDown } from 'lucide-react';

export default function ControlPanel({ onAddQuestion, paperCodes, onTogglePaperCode, onDownloadPDF, onClearPaper, onExportJSON, counts, onBack, paperMode }) {
  const [section, setSection] = useState(paperMode === 'full' ? 'physics' : paperMode);
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        if (isCameraActive) stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Could not access the camera. Please ensure your browser has camera permissions enabled.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setImagePreview(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    
    onAddQuestion(section, text, imagePreview, options);
    
    // Reset form
    setText('');
    setOptions(['', '', '', '']);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button 
          onClick={onBack} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.15)', 
            border: '1px solid rgba(255, 255, 255, 0.3)', 
            color: 'white', 
            padding: '6px 12px', 
            borderRadius: '6px',
            fontSize: '13px', 
            alignSelf: 'flex-start',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative',
            zIndex: 10,
            fontWeight: '600',
            transition: 'all 0.2s',
            textDecoration: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
        >
          <span style={{ fontSize: '16px', lineHeight: '1' }}>←</span> Back to Dashboard
        </button>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{ margin: 0 }}>PaperGen</h1>
          <p style={{ margin: 0 }}>Medix Institute Doda</p>
        </div>
      </div>

      <div className="control-section">
        <h2><BookOpen size={20} /> Add Question</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Subject Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              {(paperMode === 'full' || paperMode === 'physics') && <option value="physics">Physics (Target: 45) - Added: {counts.physics}</option>}
              {(paperMode === 'full' || paperMode === 'chemistry') && <option value="chemistry">Chemistry (Target: 45) - Added: {counts.chemistry}</option>}
              {(paperMode === 'full' || paperMode === 'biology') && <option value="biology">Biology (Target: 90) - Added: {counts.biology}</option>}
            </select>
          </div>

          <div className="form-group">
            <label>Question Text</label>
            <textarea 
              rows="3" 
              placeholder="Enter or paste question here..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
              required={!imagePreview}
            ></textarea>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label><ImageIcon size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/> Add Image</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                <ImageIcon size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                Upload
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
              </label>
              
              <button 
                type="button"
                onClick={startCamera}
                style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', color: 'white', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} 
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <Camera size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                Camera
              </button>
            </div>
            
            {isCameraActive && !imagePreview && (
              <div style={{marginTop: '10px', border: '1px solid #334155', borderRadius: '6px', padding: '10px', textAlign: 'center', backgroundColor: '#0f172a'}}>
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   style={{ width: '100%', maxHeight: '200px', borderRadius: '4px', backgroundColor: '#000', objectFit: 'cover' }}
                 ></video>
                 <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                   <button type="button" onClick={capturePhoto} style={{ flex: 1, padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                     Capture Photo
                   </button>
                   <button type="button" onClick={stopCamera} style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                     Cancel
                   </button>
                 </div>
              </div>
            )}
            
            {imagePreview && (
              <div style={{marginTop: '10px', border: '1px solid #334155', borderRadius: '6px', padding: '10px', textAlign: 'center', backgroundColor: '#0f172a'}}>
                <img src={imagePreview} alt="Preview" style={{maxHeight: '120px', maxWidth: '100%', borderRadius: '4px'}} />
                <button 
                  type="button" 
                  style={{marginTop: '10px', display: 'block', width: '100%', padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                  onClick={() => setImagePreview(null)}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="form-group options-group" style={{ marginBottom: '20px' }}>
            <label>MCQ Options (Optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="text" placeholder="(1) Option" value={options[0]} onChange={(e) => handleOptionChange(0, e.target.value)} style={{ padding: '10px 12px' }} />
              <input type="text" placeholder="(2) Option" value={options[1]} onChange={(e) => handleOptionChange(1, e.target.value)} style={{ padding: '10px 12px' }} />
              <input type="text" placeholder="(3) Option" value={options[2]} onChange={(e) => handleOptionChange(2, e.target.value)} style={{ padding: '10px 12px' }} />
              <input type="text" placeholder="(4) Option" value={options[3]} onChange={(e) => handleOptionChange(3, e.target.value)} style={{ padding: '10px 12px' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <PlusCircle size={18} /> Add to Paper
          </button>
        </form>
      </div>

      <div className="control-section">
        <h2>Paper Codes</h2>
        <div className="checkbox-group">
          {['A', 'B', 'C', 'D'].map(code => (
            <label key={code} className="checkbox-label">
              <input 
                type="checkbox" 
                checked={paperCodes[code]}
                onChange={() => onTogglePaperCode(code)}
              /> {code}
            </label>
          ))}
        </div>
      </div>

      <div className="control-section actions" style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <button onClick={onDownloadPDF} className="btn btn-success">
          <Download size={20} /> Download PDF
        </button>
        <button onClick={onExportJSON} className="btn" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
          <FileDown size={20} /> Export Draft (.json)
        </button>
        <button onClick={onClearPaper} className="btn" style={{ backgroundColor: '#ef4444', color: 'white' }}>
          <Trash2 size={20} /> Clear Paper
        </button>
      </div>
    </aside>
  );
}
