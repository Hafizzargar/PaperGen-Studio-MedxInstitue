import { useState, useRef, useEffect } from 'react';
import { Download, PlusCircle, Image as ImageIcon, BookOpen, Trash2, Camera, FileDown } from 'lucide-react';
import CustomAlert from './CustomAlert';
import ImageCropper from './ImageCropper';

export default function ControlPanel({ onAddQuestion, paperCodes, onTogglePaperCode, onDownloadPDF, onClearPaper, onExportJSON, counts, onBack, paperMode, onImportJSON, isGeneratingZip, editingQuestion, onUpdateQuestion, onCancelEdit }) {
  const [section, setSection] = useState(paperMode === 'full' ? 'physics' : paperMode);
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [customAlert, setCustomAlert] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (editingQuestion) {
      setSection(editingQuestion.section);
      setText(editingQuestion.text || '');
      setOptions(editingQuestion.options || ['', '', '', '']);
      setImagePreview(editingQuestion.image || null);
    } else {
      setText('');
      setOptions(['', '', '', '']);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [editingQuestion]);

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
        setTempImage(reader.result);
        setShowCropper(true);
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
      setCustomAlert({
        title: 'Camera Access Blocked',
        message: 'Could not access the camera. Please ensure your browser has camera permissions enabled.',
        type: 'alert',
        variant: 'danger',
        confirmText: 'Okay'
      });
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
      setTempImage(dataUrl);
      setShowCropper(true);
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
    
    if (editingQuestion) {
      onUpdateQuestion(editingQuestion.id, section, text, imagePreview, options);
    } else {
      onAddQuestion(section, text, imagePreview, options);
      
      // Reset form (only for new questions since edit auto-clears on updateQuestion setting editingQuestion to null)
      setText('');
      setOptions(['', '', '', '']);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <aside className="sidebar">
      {/* Sticky Back Button Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px 24px',
        borderBottom: editingQuestion ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        transition: 'all 0.3s ease'
      }}>
        {editingQuestion ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b',
                display: 'inline-block'
              }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Editing Mode
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={handleSubmit}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: 'white', 
                  border: 'none',
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  fontSize: '12px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(16, 185, 129, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Save
              </button>
              <button 
                type="button" 
                onClick={onCancelEdit} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.08)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1', 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  fontSize: '12px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={onBack} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#e2e8f0', 
              padding: '8px 16px', 
              borderRadius: '8px',
              fontSize: '13px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: '1' }}>←</span> Back to Dashboard
          </button>
        )}
      </div>



      <div className="control-section" style={
        editingQuestion 
          ? { 
              borderLeft: '4px solid #f59e0b', 
              paddingLeft: '12px', 
              background: 'linear-gradient(to right, rgba(245, 158, 11, 0.05), transparent)', 
              transition: 'all 0.3s ease' 
            } 
          : { transition: 'all 0.3s ease' }
      }>
        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', margin: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} /> 
            {editingQuestion ? 'Edit Question' : 'Add Question'}
          </span>
          {editingQuestion && (
            <span style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              backgroundColor: '#f59e0b', 
              color: '#0f172a', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontWeight: '800',
              letterSpacing: '0.5px'
            }}>
              Active Edit
            </span>
          )}
        </h2>
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
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
              <label 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '12px 10px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px dashed rgba(255, 255, 255, 0.15)', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#cbd5e1',
                  transition: 'all 0.2s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }} 
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.color = '#ffffff';
                }} 
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <ImageIcon size={16} />
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
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  padding: '12px 10px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px dashed rgba(255, 255, 255, 0.15)', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#cbd5e1', 
                  transition: 'all 0.2s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.color = '#ffffff';
                }} 
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <Camera size={16} />
                Camera
              </button>
            </div>
            
            {isCameraActive && !imagePreview && (
              <div style={{marginTop: '10px', border: '1px solid #334155', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: '#0f172a'}}>
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', backgroundColor: '#000', objectFit: 'cover' }}
                 ></video>
                 <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                   <button type="button" onClick={capturePhoto} style={{ flex: 1, padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                     Capture Photo
                   </button>
                   <button type="button" onClick={stopCamera} style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                     Cancel
                   </button>
                 </div>
              </div>
            )}
            
            {imagePreview && (
              <div style={{marginTop: '10px', border: '1px solid #334155', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: '#0f172a'}}>
                <img src={imagePreview} alt="Preview" style={{maxHeight: '120px', maxWidth: '100%', borderRadius: '8px'}} />
                <button 
                  type="button" 
                  style={{marginTop: '10px', display: 'block', width: '100%', padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}
                  onClick={() => setImagePreview(null)}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="form-group options-group" style={{ marginBottom: '25px' }}>
            <label>MCQ Options (Optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    {idx + 1}
                  </span>
                  <input 
                    type="text" 
                    placeholder={`Option ${idx + 1}`} 
                    value={options[idx]} 
                    onChange={(e) => handleOptionChange(idx, e.target.value)} 
                    style={{ 
                      padding: '10px 12px 10px 40px',
                      fontSize: '0.9rem',
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>

          {editingQuestion ? null : (
            <button type="submit" className="btn btn-primary">
              <PlusCircle size={18} /> Add to Paper
            </button>
          )}
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
        <button 
          onClick={onExportJSON} 
          className="btn" 
          style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            color: 'white',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <FileDown size={18} /> Export Draft (.json)
        </button>
        <button 
          onClick={onClearPaper} 
          className="btn" 
          style={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
            color: 'white',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Trash2 size={18} /> Clear Paper
        </button>
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
          onCancel={() => setCustomAlert(null)}
        />
      )}
      {showCropper && tempImage && (
        <ImageCropper
          src={tempImage}
          onCrop={(croppedDataUrl) => {
            setImagePreview(croppedDataUrl);
            setShowCropper(false);
            setTempImage(null);
          }}
          onCancel={() => {
            setShowCropper(false);
            setTempImage(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        />
      )}
    </aside>
  );
}
