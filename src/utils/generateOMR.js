import jsPDF from 'jspdf';

export const generateOMRSheet = (numQuestions = 180) => {
  // A4 size is 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = 210;
  const pageH = 297;
  const brandColor = '#5e20a4'; // Purple

  // --- 1. Fiducials (Alignment Markers) ---
  // These MUST be pure black, square, and in the extreme corners.
  doc.setFillColor(0, 0, 0); 
  const fSize = 8;
  const fMargin = 8;
  
  // Top-Left
  doc.rect(fMargin, fMargin, fSize, fSize, 'F');
  // Top-Right
  doc.rect(pageW - fMargin - fSize, fMargin, fSize, fSize, 'F');
  // Bottom-Left
  doc.rect(fMargin, pageH - fMargin - fSize, fSize, fSize, 'F');
  // Bottom-Right
  doc.rect(pageW - fMargin - fSize, pageH - fMargin - fSize, fSize, fSize, 'F');


  // --- 2. Header Banner ---
  const bannerY = fMargin + fSize + 4; // Start below the top fiducials
  const bannerH = 25;
  const contentMargin = 15;
  const contentW = pageW - 2 * contentMargin;

  doc.setFillColor(brandColor);
  doc.rect(contentMargin, bannerY, contentW, bannerH, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MedX Institute — Doda', pageW / 2, bannerY + 10, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('OMR Answer Sheet  |  NEET / JEE Pattern  |  180 Questions', pageW / 2, bannerY + 18, { align: 'center' });


  // --- 3. Student Information Section ---
  const infoY = bannerY + bannerH + 5;
  doc.setTextColor(brandColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);

  // Background for info section
  doc.setFillColor('#f3f0f8');
  doc.rect(contentMargin, infoY, contentW, 15, 'F');

  doc.text('Student Name:', contentMargin + 5, infoY + 10);
  doc.setDrawColor(brandColor);
  doc.setLineWidth(0.3);
  doc.line(contentMargin + 32, infoY + 10, contentMargin + 85, infoY + 10);

  doc.text('Roll No:', contentMargin + 95, infoY + 10);
  doc.line(contentMargin + 110, infoY + 10, contentMargin + 145, infoY + 10);

  doc.text('Subject Code:', contentMargin + 155, infoY + 10);
  doc.line(contentMargin + 180, infoY + 10, contentMargin + 190, infoY + 10);

  // Instructions
  const instY = infoY + 22;
  doc.setFontSize(8);
  doc.text('INSTRUCTIONS: Use Blue/Black ballpoint pen only. Fill bubble completely. Do NOT use whitener. Correct: +4 | Wrong: -1', contentMargin, instY);


  // --- 4. Bubble Grid (4 Columns) ---
  const gridStartY = instY + 4;
  const numCols = 4;
  const questionsPerCol = Math.ceil(numQuestions / numCols); 
  
  const colGap = 6;
  const colW = (contentW - (colGap * (numCols - 1))) / numCols; 
  const rowH = 4.2; // Tighter row spacing
  const bubbleR = 1.4;
  const optSpacing = 5.5;
  const options = ['A', 'B', 'C', 'D'];

  let currentQ = 1;

  for (let col = 0; col < numCols; col++) {
    const startX = contentMargin + col * (colW + colGap);
    
    // Column Header (Purple)
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
      
      // Zebra striping for readability
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
      
      for (let opt = 0; opt < options.length; opt++) {
        const cx = startX + 15 + opt * optSpacing;
        const cy = y;
        
        doc.circle(cx, cy, bubbleR, 'S');
        
        doc.setFontSize(5);
        doc.setTextColor(0, 0, 0); // Black text for letter inside bubble
        doc.text(options[opt], cx - 0.7, cy + 0.7);
      }
      
      currentQ++;
    }
  }

  doc.save('MedX_OMR_Sheet.pdf');
};
