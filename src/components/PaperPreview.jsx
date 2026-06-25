import React, { forwardRef, useState, useLayoutEffect, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

// A simple deterministic pseudo-random number generator
function xfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

// Generate a seed from a string
function generateSeed(str) {
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return h;
}

const PaperPreview = forwardRef(({ questions, targetCode, isShuffled, onRemoveQuestion, paperMode, activeQuestionId, onSelectQuestion }, ref) => {
  const [pages, setPages] = useState([]);
  const measureRef = useRef(null);

  // Determine shuffled arrays
  const getShuffledArray = (arr, code) => {
    // Code A is ALWAYS the master (un-shuffled) copy!
    if (!isShuffled || !code || code === 'A') return arr;
    
    const seed = generateSeed(code);
    const rand = xfc32(seed, seed + 1, seed + 2, seed + 3);
    
    // Create a copy and shuffle using the seeded random
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const physicsArray = getShuffledArray(questions.physics, targetCode);
  const chemistryArray = getShuffledArray(questions.chemistry, targetCode);
  const biologyArray = getShuffledArray(questions.biology, targetCode);

  // Flatten the questions into a single array
  const flatItems = [];
  let globalIndex = 1;
  
  if (physicsArray.length > 0) {
    flatItems.push({ type: 'header', title: 'Physics', id: 'hdr-physics', sectionKey: 'physics' });
    physicsArray.forEach(q => flatItems.push({ type: 'question', number: globalIndex++, sectionKey: 'physics', ...q }));
  }
  if (chemistryArray.length > 0) {
    flatItems.push({ type: 'header', title: 'Chemistry', id: 'hdr-chemistry', sectionKey: 'chemistry' });
    chemistryArray.forEach(q => flatItems.push({ type: 'question', number: globalIndex++, sectionKey: 'chemistry', ...q }));
  }
  if (biologyArray.length > 0) {
    flatItems.push({ type: 'header', title: 'Biology', id: 'hdr-biology', sectionKey: 'biology' });
    biologyArray.forEach(q => flatItems.push({ type: 'question', number: globalIndex++, sectionKey: 'biology', ...q }));
  }

  // A tiny delay to allow images to load before measurement
  const [measurementTrigger, setMeasurementTrigger] = useState(0);
  
  useEffect(() => {
    // Re-measure after a short delay in case images change heights
    const timer = setTimeout(() => setMeasurementTrigger(prev => prev + 1), 300);
    return () => clearTimeout(timer);
  }, [questions]);

  useLayoutEffect(() => {
    if (!measureRef.current || flatItems.length === 0) {
      setPages([]);
      return;
    }

    const items = Array.from(measureRef.current.children);
    
    // Approximate heights for A4 at 96 DPI
    // 297mm = ~1122px. Subtract padding, header, footer.
    const PAGE1_MAX_COL_HEIGHT = 1020; 
    const PAGEX_MAX_COL_HEIGHT = 1020; 
    const HEADER_HEIGHT_REDUCTION = 60; // Standard header height reduction for column height calculations

    const newPages = [];
    let currentPage = [];
    let currentColumn = 1;
    let currentHeight = 0;
    let pageIndex = 0;
    let currentPageHeaderHeight = 0;

    items.forEach((el, index) => {
      const item = flatItems[index];
      // getBoundingClientRect is more accurate than offsetHeight
      const h = el.getBoundingClientRect().height + 15; // 15px buffer for margins
      
      const maxH = pageIndex === 0 ? PAGE1_MAX_COL_HEIGHT : PAGEX_MAX_COL_HEIGHT;

      if (item.type === 'header') {
        // Force every subject header (Chemistry, Biology, Physics) to start a new page
        // to match Physics' clean top-of-page layout, prevent page overflow, and
        // solve Chrome column splitting glitches.
        if (currentPage.length > 0) {
          newPages.push(currentPage);
          currentPage = [];
          currentColumn = 1;
          currentHeight = 0;
          pageIndex++; // Increment page index
        }
        currentPageHeaderHeight = HEADER_HEIGHT_REDUCTION;
      } else {
        const availableColH = maxH - currentPageHeaderHeight;
        if (currentHeight + h > availableColH) {
          if (currentColumn === 1) {
            currentColumn = 2;
            currentHeight = h;
          } else {
            // Push page and start new one
            newPages.push(currentPage);
            currentPage = [];
            currentColumn = 1;
            currentHeight = h;
            currentPageHeaderHeight = 0; // New page starts with no header unless explicitly added
            pageIndex++; // Increment page index
          }
        } else {
          currentHeight += h;
        }
      }
      currentPage.push(item);
    });

    if (currentPage.length > 0) {
      newPages.push(currentPage);
    }
    
    setPages(newPages);
  }, [questions, measurementTrigger, isShuffled, targetCode]); // Also trigger if shuffle changes

  const renderItem = (item) => {
    if (item.type === 'header') {
      return <h3 key={item.id} className="section-header">{item.title}</h3>;
    }
    
    const isActive = item.id === activeQuestionId;
    
    return (
      <div 
        key={item.id} 
        className={`question-item ${isActive ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectQuestion) {
            onSelectQuestion(item.sectionKey, item);
          }
        }}
        style={{ cursor: onSelectQuestion ? 'pointer' : 'default' }}
      >
        <div className="question-item-inner" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <button 
            className="delete-btn delete-btn-overlay no-print" 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveQuestion && onRemoveQuestion(item.sectionKey, item.id);
            }}
            title="Remove question"
            style={{
              backgroundColor: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '8px',
              width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: 0
            }}
          >
            <X size={14} />
          </button>
          <div className="question-number">{item.number}.</div>
          <div className="question-content" style={{ flex: 1 }}>
            {item.text && <div className="question-text">{item.text}</div>}
            {item.image && (
              <div className="question-image-container">
                <img src={item.image} alt={`Question visual`} onLoad={() => setMeasurementTrigger(prev => prev + 1)} />
              </div>
            )}
            {item.options && item.options.some(opt => opt.trim() !== '') && (
              <div className="question-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px' }}>
                {item.options.map((opt, i) => opt.trim() ? (
                  <div key={i} className="option-item">({i + 1}) {opt}</div>
                ) : <div key={i}></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* HIDDEN MEASUREMENT CONTAINER */}
      <div className="no-print" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1000, width: '210mm', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <div style={{ padding: '10mm 18mm', width: '100%' }}>
          {/* We measure assuming one column width to get exact wrapping heights */}
          <div style={{ width: 'calc(50% - 6mm)' }} ref={measureRef}>
            {flatItems.map(item => renderItem(item))}
          </div>
        </div>
      </div>

      <main className="preview-area" ref={ref}>
        {/* ACTUAL VISIBLE PAGES */}
        {pages.length === 0 ? (
          <div className="paper" style={{ minHeight: '297mm' }}>
             <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px' }}>
              Add questions from the left panel to build your paper.
            </div>
          </div>
        ) : (
          <>
            {paperMode === 'full' && (
              <div className="paper page-container cover-page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '297mm', padding: '20mm', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <img src="/companylogo.jpeg" alt="Institute Logo" style={{ maxWidth: '80%', maxHeight: '150px', objectFit: 'contain' }} />
                </div>
                <h1 style={{ textAlign: 'center', fontSize: '28px', borderBottom: '2px solid black', paddingBottom: '10px', textTransform: 'uppercase' }}>NEET UG - Full Mock Test</h1>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', margin: '30px 0', padding: '15px', border: '1px solid black', backgroundColor: '#f9f9f9' }}>
                  <span>Paper Code: {targetCode || 'None'}</span>
                  <span>Max Marks: 720</span>
                  <span>Time: 3 Hours 20 Mins</span>
                </div>

                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '20px', textDecoration: 'underline' }}>Candidate Details:</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', fontSize: '18px' }}>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '160px', fontWeight: 'bold' }}>Candidate Name:</span>
                      <span style={{ flex: 1, borderBottom: '1px dotted black' }}></span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '160px', fontWeight: 'bold' }}>Roll Number:</span>
                      <span style={{ flex: 1, borderBottom: '1px dotted black' }}></span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '160px', fontWeight: 'bold' }}>Batch/Section:</span>
                      <span style={{ flex: 1, borderBottom: '1px dotted black' }}></span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '160px', fontWeight: 'bold' }}>Date:</span>
                      <span style={{ flex: 1, borderBottom: '1px dotted black' }}></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px' }}>
                     <div style={{ width: '250px', textAlign: 'center' }}>
                       <div style={{ borderBottom: '1px solid black', height: '40px' }}></div>
                       <div style={{ marginTop: '5px', fontWeight: 'bold' }}>Candidate's Signature</div>
                     </div>
                     <div style={{ width: '250px', textAlign: 'center' }}>
                       <div style={{ borderBottom: '1px solid black', height: '40px' }}></div>
                       <div style={{ marginTop: '5px', fontWeight: 'bold' }}>Invigilator's Signature</div>
                     </div>
                  </div>
                </div>

                <div style={{ borderTop: '2px solid black', paddingTop: '15px', marginTop: '30px' }}>
                  <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>General Instructions:</h2>
                  <ul style={{ fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
                    <li>The test is of <strong>3 hours 20 minutes</strong> duration and consists of 200 questions.</li>
                    <li>The maximum marks are <strong>720</strong>.</li>
                    <li>Each correct answer carries <strong>4 marks</strong>. For each incorrect answer, <strong>1 mark</strong> will be deducted.</li>
                    <li>Use <strong>Blue/Black Ball Point Pen</strong> only for writing particulars and darkening the circles on the OMR sheet.</li>
                    <li>Rough work is to be done on the space provided for this purpose in the Test Booklet only.</li>
                    <li>Use of electronic devices like mobile phones, calculators, etc., is strictly prohibited.</li>
                  </ul>
                </div>
                
                {/* WATERMARK LOGO FOR COVER PAGE */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50%', height: '50%', backgroundImage: 'url(/companylogo.jpeg)', backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.05, zIndex: 0, pointerEvents: 'none' }} />
              </div>
            )}
            {pages.map((pageItems, pageIndex) => {
              const hasHeader = pageItems[0]?.type === 'header';
              const headerItem = hasHeader ? pageItems[0] : null;
              const questionItems = hasHeader ? pageItems.slice(1) : pageItems;
              const containerHeight = hasHeader ? (1020 - 60) : 1020;

              return (
                <div key={`page-${pageIndex}`} className="paper page-container" style={{ position: 'relative' }}>
                  {/* WATERMARK LOGO */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '50%',
                    height: '50%',
                    backgroundImage: 'url(/companylogo.jpeg)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.08,
                    zIndex: 0,
                    pointerEvents: 'none'
                  }} />
                  
                  {hasHeader && renderItem(headerItem)}
                  
                  <div className="questions-container" style={{ columnFill: 'auto', height: `${containerHeight}px`, position: 'relative', zIndex: 1 }}>
                    {questionItems.map(item => renderItem(item))}
                  </div>
                  
                  <div className="paper-footer" style={{ position: 'absolute', bottom: '10mm', left: '0', right: '0', textAlign: 'center', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>Paper Code: {targetCode || 'None'} - Page {paperMode === 'full' ? pageIndex + 2 : pageIndex + 1}</div>
                    <div style={{ marginTop: '2px', fontSize: '10px', color: '#555' }}>
                      &copy; {new Date().getFullYear()} Medix Institute Doda | Official Website: https://medxinstitute-doda.netlify.app/
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </>
  );
});

PaperPreview.displayName = 'PaperPreview';

export default PaperPreview;
