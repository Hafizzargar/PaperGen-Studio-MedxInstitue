import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, X, RotateCcw, Crop } from 'lucide-react';

export default function ImageCropper({ src, onCrop, onCancel }) {
  const cropRatio = '2:1';
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const imageRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Constants
  const viewportWidth = 320;
  const aspectVal = 1 / 2; // Locked 2:1 ratio
  const viewportHeight = viewportWidth * aspectVal;

  // Recalculate dimensions to fill the viewport
  const imgRatio = imageSize.width / imageSize.height;
  const viewportRatio = viewportWidth / viewportHeight;

  let baseWidth = viewportWidth;
  let baseHeight = viewportHeight;

  if (imageSize.width && imageSize.height) {
    if (imgRatio > viewportRatio) {
      // Image is wider than viewport aspect ratio: fit height, width overflow
      baseHeight = viewportHeight;
      baseWidth = viewportHeight * imgRatio;
    } else {
      // Image is taller than viewport aspect ratio: fit width, height overflow
      baseWidth = viewportWidth;
      baseHeight = viewportWidth / imgRatio;
    }
  }

  const w = baseWidth * zoom;
  const h = baseHeight * zoom;

  // Center alignment offset
  const centerX = (viewportWidth - w) / 2;
  const centerY = (viewportHeight - h) / 2;

  // Drag constraints (to ensure the image always fully covers the crop viewport)
  const maxOffsetX = Math.max(0, (w - viewportWidth) / 2);
  const maxOffsetY = Math.max(0, (h - viewportHeight) / 2);

  // Apply constraints to offsets
  const cx = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
  const cy = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));



  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsDragging(false);
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imageSize.width || !imageSize.height) return;

    const canvas = document.createElement('canvas');
    const targetWidth = 800;
    const targetHeight = 400; // Locked 2:1 aspect ratio

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Scale canvas context to viewport scale, so we draw in viewport coords directly
    const scaleFactor = targetWidth / viewportWidth;
    ctx.scale(scaleFactor, scaleFactor);

    // Position of image top-left relative to viewport
    const imgX = centerX + cx;
    const imgY = centerY + cy;

    const imgElement = imageRef.current;
    if (imgElement) {
      ctx.drawImage(imgElement, imgX, imgY, w, h);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCrop(croppedDataUrl);
    }
  };

  const isImageReady = imageSize.width > 0 && imageSize.height > 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={20} color="#10b981" />
            <h3 style={styles.title}>Crop Image</h3>
          </div>
          <button onClick={onCancel} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Subtitle */}
        <p style={styles.subtitle}>
          Drag to position and use the slider to zoom.
        </p>

        {/* Viewport Box */}
        <div 
          style={{
            ...styles.viewportContainer,
            height: `${viewportHeight}px`,
            width: `${viewportWidth}px`
          }}
        >
          {!isImageReady && (
            <div style={styles.loader}>
              <div className="animate-spin" style={styles.spinner}></div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading image...</span>
            </div>
          )}
          
          <img
            ref={imageRef}
            src={src}
            alt="To crop"
            onLoad={handleImageLoad}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              ...styles.cropImage,
              width: `${w}px`,
              height: `${h}px`,
              transform: `translate(${centerX + cx}px, ${centerY + cy}px)`,
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isImageReady ? 1 : 0
            }}
            draggable={false}
          />
          
          {/* Overlay grid lines for styling (Premium UI) */}
          {isImageReady && (
            <div style={styles.gridOverlay}>
              <div style={styles.gridLineV1}></div>
              <div style={styles.gridLineV2}></div>
              <div style={styles.gridLineH1}></div>
              <div style={styles.gridLineH2}></div>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        {isImageReady && (
          <div style={styles.controlsRow}>
            <button type="button" onClick={handleReset} style={styles.resetBtn} title="Reset Position">
              <RotateCcw size={16} />
            </button>
            <div style={styles.zoomSliderContainer}>
              <ZoomOut size={16} color="#94a3b8" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <ZoomIn size={16} color="#94a3b8" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.btnCancel}>
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            disabled={!isImageReady}
            style={{
              ...styles.btnApply,
              opacity: isImageReady ? 1 : 0.6,
              cursor: isImageReady ? 'pointer' : 'not-allowed'
            }}
          >
            <Check size={18} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// CSS-in-JS styles matching the dark premium glassmorphism theme of the app
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '380px',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.05)',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '0.85rem',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  ratioSelector: {
    display: 'flex',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '16px',
    gap: '4px',
  },
  ratioBtn: {
    flex: 1,
    padding: '8px 10px',
    border: 'none',
    background: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  ratioBtnActive: {
    backgroundColor: '#10b981',
    color: 'white',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  },
  viewportContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '12px',
    border: '2px dashed rgba(255, 255, 255, 0.15)',
    backgroundColor: '#090d16',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
  },
  cropImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    maxWidth: 'none',
    maxHeight: 'none',
    userSelect: 'none',
    touchAction: 'none',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: '1px',
    borderLeft: '1px dashed rgba(255, 255, 255, 0.15)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: '1px',
    borderLeft: '1px dashed rgba(255, 255, 255, 0.15)',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: '1px',
    borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: '1px',
    borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginTop: '16px',
    gap: '12px',
  },
  zoomSliderContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  slider: {
    flex: 1,
    WebkitAppearance: 'none',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    cursor: 'pointer',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#cbd5e1',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  actions: {
    display: 'flex',
    width: '100%',
    marginTop: '20px',
    gap: '12px',
  },
  btnCancel: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnApply: {
    flex: 1.3,
    padding: '10px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
    transition: 'all 0.2s',
  },
  loader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#10b981',
  }
};
