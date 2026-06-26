/**
 * Direct Pixel Reader for PDF-uploaded OMR sheets.
 * 
 * Since we GENERATED the PDF ourselves, we know the EXACT mm coordinates
 * of every bubble. No OpenCV, no marker detection, no perspective transform.
 * Just pure math + direct pixel sampling = 100% accuracy.
 */

// Layout constants (must match generateOMR.js exactly)
const PAGE_W = 210; // A4 width in mm
const CONTENT_MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * CONTENT_MARGIN; // 180
const F_MARGIN = 8;
const F_SIZE = 8;
const BANNER_Y = F_MARGIN + F_SIZE + 4; // 20
const BANNER_H = 25;
const INFO_Y = BANNER_Y + BANNER_H + 5; // 50
const INST_Y = INFO_Y + 22; // 72
const GRID_START_Y = INST_Y + 4; // 76
const NUM_COLS = 4;
const COL_GAP = 6;
const ROW_H = 4.2;
const OPT_SPACING = 5.5;
const OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * Process an OMR sheet by reading pixels directly from canvas ImageData.
 * This is the fast, accurate path for PDF uploads.
 * 
 * @param {ImageData} imageData - Raw pixel data from the PDF canvas
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels  
 * @param {number} numQuestions - Number of questions
 * @param {Object} answerKey - Map of question number to correct answer
 * @param {number} positiveMarks - Marks for correct answer
 * @param {number} negativeMarks - Marks for incorrect answer (negative number)
 * @param {Function} onProgress - Progress callback
 */
export const processOMRDirect = async (imageData, canvasWidth, canvasHeight, numQuestions, answerKey, positiveMarks, negativeMarks, onProgress) => {
  
  const log = (msg) => { if (onProgress) onProgress(-1, msg); };
  
  if (onProgress) { onProgress(10, "Direct PDF Reader initialized. No OpenCV needed!"); await tick(); }

  const pxPerMm = canvasWidth / PAGE_W;
  log(`Resolution: ${pxPerMm.toFixed(2)} pixels/mm (canvas ${canvasWidth}×${canvasHeight})`);

  const questionsPerCol = Math.ceil(numQuestions / NUM_COLS);
  const colW = (CONTENT_W - (COL_GAP * (NUM_COLS - 1))) / NUM_COLS;

  let score = 0, correct = 0, incorrect = 0, unattempted = 0;
  const details = [];

  if (onProgress) { onProgress(30, "Reading bubble intensities directly from PDF pixels..."); await tick(); }

  for (let i = 1; i <= numQuestions; i++) {
    const expected = answerKey[i] || 'A';
    
    const idx = i - 1;
    const col = Math.floor(idx / questionsPerCol);
    const row = idx % questionsPerCol;
    
    const startX = CONTENT_MARGIN + col * (colW + COL_GAP);
    const mmY = GRID_START_Y + 6 + row * ROW_H + 2.5;
    
    let lowestIntensity = 255;
    let bestOption = 'U';
    let debugStr = '';

    for (let oIdx = 0; oIdx < OPTIONS.length; oIdx++) {
      const opt = OPTIONS[oIdx];
      const mmX = startX + 15 + oIdx * OPT_SPACING;
      
      // Convert mm to canvas pixels
      const centerPx = Math.round(mmX * pxPerMm);
      const centerPy = Math.round(mmY * pxPerMm);
      
      // Sample a 6x6 pixel area at the center of the bubble
      // This stays well inside the 1.4mm radius bubble (~8px at this resolution)
      const sampleSize = 6;
      const half = Math.floor(sampleSize / 2);
      let totalGray = 0;
      let count = 0;
      
      for (let dy = -half; dy < half; dy++) {
        for (let dx = -half; dx < half; dx++) {
          const x = centerPx + dx;
          const y = centerPy + dy;
          
          if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
            const offset = (y * canvasWidth + x) * 4; // RGBA
            const r = imageData.data[offset];
            const g = imageData.data[offset + 1];
            const b = imageData.data[offset + 2];
            // Standard grayscale conversion
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            totalGray += gray;
            count++;
          }
        }
      }
      
      const meanIntensity = count > 0 ? totalGray / count : 255;
      
      if (i <= 5) {
        debugStr += `${opt}:${Math.round(meanIntensity)} `;
      }
      
      // A FILLED bubble is DARK → low intensity (< 160)
      // An empty bubble with just outline+letter is BRIGHT → high intensity (> 190)
      // Gap is huge, so this is extremely reliable
      if (meanIntensity < 160 && meanIntensity < lowestIntensity) {
        lowestIntensity = meanIntensity;
        bestOption = opt;
      }
    }
    
    if (i <= 5) {
      log(`Q${i}: ${debugStr} → ${bestOption}`);
    }

    const scanned = bestOption;
    let status = 'Unattempted';
    
    if (scanned === 'U') {
      unattempted++;
    } else if (scanned === expected) {
      correct++;
      score += positiveMarks;
      status = 'Correct';
    } else {
      incorrect++;
      score += negativeMarks;
      status = 'Incorrect';
    }

    details.push({ qNo: i, expected, scanned, status });

    // Progress updates every 45 questions
    if (i % 45 === 0 && onProgress) {
      const pct = 30 + Math.round((i / numQuestions) * 60);
      onProgress(pct, `Scanned ${i}/${numQuestions} questions...`);
      await tick();
    }
  }

  if (onProgress) { onProgress(95, "Finalizing results..."); await tick(); }
  if (onProgress) { onProgress(100, "Done!"); await tick(); }

  return {
    totalScore: score,
    correctCount: correct,
    incorrectCount: incorrect,
    unattemptedCount: unattempted,
    maxScore: numQuestions * positiveMarks,
    details,
    isSimulated: false
  };
};

// Small helper to yield to UI
const tick = () => new Promise(r => setTimeout(r, 10));
