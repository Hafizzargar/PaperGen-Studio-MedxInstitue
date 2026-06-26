import jsPDF from 'jspdf';

/**
 * Generates a FILLED dummy OMR sheet with a known answer pattern.
 * Returns the answer map so the scanner result can be verified.
 * 
 * Pattern: Q1=A, Q2=B, Q3=C, Q4=D, Q5=A, Q6=B, ...
 * Every 10th question is left BLANK (unattempted).
 */
export const generateDummyOMR = (numQuestions = 180) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = 210;
  const pageH = 297;
  const brandColor = '#5e20a4';

  // --- 1. Fiducials (EXACT same as generateOMR.js) ---
  doc.setFillColor(0, 0, 0); 
  const fSize = 8;
  const fMargin = 8;
  doc.rect(fMargin, fMargin, fSize, fSize, 'F');
  doc.rect(pageW - fMargin - fSize, fMargin, fSize, fSize, 'F');
  doc.rect(fMargin, pageH - fMargin - fSize, fSize, fSize, 'F');
  doc.rect(pageW - fMargin - fSize, pageH - fMargin - fSize, fSize, fSize, 'F');

  // --- 2. Header Banner ---
  const bannerY = fMargin + fSize + 4;
  const bannerH = 25;
  const contentMargin = 15;
  const contentW = pageW - 2 * contentMargin;

  doc.setFillColor(brandColor);
  doc.rect(contentMargin, bannerY, contentW, bannerH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MedX Institute — Doda', pageW / 2, bannerY + 10, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('OMR Answer Sheet  |  DUMMY TEST SHEET', pageW / 2, bannerY + 18, { align: 'center' });

  // --- 3. Student Information ---
  const infoY = bannerY + bannerH + 5;
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);

  doc.setFillColor('#f3f0f8');
  doc.rect(contentMargin, infoY, contentW, 15, 'F');

  doc.text('Student Name: Test Student', contentMargin + 5, infoY + 10);
  doc.text('Roll No: 001', contentMargin + 95, infoY + 10);
  doc.text('Subject Code: PHY', contentMargin + 155, infoY + 10);

  // Instructions
  const instY = infoY + 22;
  doc.setFontSize(8);
  doc.text('DUMMY TEST SHEET — Pattern: A,B,C,D repeating. Every 10th question is blank. Correct: +4 | Wrong: -1', contentMargin, instY);

  // --- 4. Bubble Grid (4 Columns) - EXACT same layout ---
  const gridStartY = instY + 4;
  const numCols = 4;
  const questionsPerCol = Math.ceil(numQuestions / numCols); 
  
  const colGap = 6;
  const colW = (contentW - (colGap * (numCols - 1))) / numCols; 
  const rowH = 4.2;
  const bubbleR = 1.4;
  const optSpacing = 5.5;
  const options = ['A', 'B', 'C', 'D'];

  // Build the known answer pattern
  const dummyAnswers = {};
  for (let i = 1; i <= numQuestions; i++) {
    if (i % 10 === 0) {
      dummyAnswers[i] = 'U'; // Every 10th question = unattempted
    } else {
      dummyAnswers[i] = options[(i - 1) % 4]; // A, B, C, D repeating
    }
  }

  let currentQ = 1;

  for (let col = 0; col < numCols; col++) {
    const startX = contentMargin + col * (colW + colGap);
    
    // Column Header
    doc.setFillColor(brandColor);
    doc.rect(startX, gridStartY, colW, 6, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const startQ = col * questionsPerCol + 1;
    const endQ = Math.min(startQ + questionsPerCol - 1, numQuestions);
    doc.text(`Q${startQ}-Q${endQ}`, startX + 2, gridStartY + 4);
    doc.text('A     B     C     D', startX + 14, gridStartY + 4);

    // Rows
    doc.setTextColor(brandColor);
    for (let row = 0; row < questionsPerCol; row++) {
      if (currentQ > numQuestions) break;
      
      const y = gridStartY + 6 + row * rowH + 2.5;
      
      // Zebra striping
      if (row % 2 === 1) {
        doc.setFillColor('#faf5ff');
        doc.rect(startX, y - 2, colW, rowH, 'F');
      }

      // Question Number
      doc.setTextColor(brandColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`Q${currentQ}`, startX + 1, y + 1.2);

      // Bubbles (Black Circles)
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      
      const answer = dummyAnswers[currentQ];
      
      for (let opt = 0; opt < options.length; opt++) {
        const cx = startX + 15 + opt * optSpacing;
        const cy = y;
        
        if (answer === options[opt]) {
          // FILL this bubble with solid black (simulating pen marks)
          doc.setFillColor(0, 0, 0);
          doc.circle(cx, cy, bubbleR, 'F');
        } else {
          // Empty bubble outline only
          doc.circle(cx, cy, bubbleR, 'S');
          
          // Letter label (only for unfilled bubbles)
          doc.setTextColor(0); // Black
          doc.setFontSize(5);
          doc.text(options[opt], cx - 0.7, cy + 0.7);
        }
      }
      
      currentQ++;
    }
  }

  doc.save('MedX_OMR_DUMMY_FILLED.pdf');
  
  return dummyAnswers;
};
