import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { X, UploadCloud, Download, ShieldCheck } from 'lucide-react';
import CustomAlert from './CustomAlert';

export default function PDFRebrander({ onClose }) {
  const [targetCode, setTargetCode] = useState('A');
  const [competitorPdf, setCompetitorPdf] = useState(null);
  const [topErase, setTopErase] = useState(60);
  const [bottomErase, setBottomErase] = useState(50);
  const [removeFirstPage, setRemoveFirstPage] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAlert, setCustomAlert] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setCompetitorPdf(file);
  };

  const handleProcess = async () => {
    if (!competitorPdf) {
      setCustomAlert({
        title: 'No PDF Uploaded',
        message: 'Please upload a competitor\'s PDF file first to rebrand.',
        type: 'alert',
        variant: 'warning',
        confirmText: 'Okay'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Load the competitor PDF
      const pdfBytes = await competitorPdf.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // 2. Load fonts and logo
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      const logoUrl = '/companylogo.jpeg';
      const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedJpg(logoImageBytes);
      const logoDims = logoImage.scale(0.3); // Scale for header
      const watermarkDims = logoImage.scale(0.6); // Scale for watermark

      // 3. Remove first page if requested
      if (removeFirstPage && pdfDoc.getPageCount() > 0) {
        pdfDoc.removePage(0);
      }

      // 4. Insert Medix Cover Page at the front
      const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]); // A4 size
      const { width, height } = coverPage.getSize();

      // Draw Logo on Cover
      coverPage.drawImage(logoImage, {
        x: width / 2 - logoDims.width / 2,
        y: height - 150,
        width: logoDims.width,
        height: logoDims.height,
      });

      // Title
      coverPage.drawText("NEET UG - FULL MOCK TEST", {
        x: width / 2 - 140,
        y: height - 200,
        size: 20,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });

      // Divider Line
      coverPage.drawLine({
        start: { x: 50, y: height - 220 },
        end: { x: width - 50, y: height - 220 },
        thickness: 2,
        color: rgb(0, 0, 0),
      });

      // Meta row
      coverPage.drawText(`Paper Code: ${targetCode || '-'}`, { x: 50, y: height - 245, size: 12, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
      coverPage.drawText(`Max Marks: 720`, { x: width / 2 - 40, y: height - 245, size: 12, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
      coverPage.drawText(`Time: 3 Hours 20 Mins`, { x: width - 180, y: height - 245, size: 12, font: timesRomanBoldFont, color: rgb(0, 0, 0) });

      // Divider Line 2
      coverPage.drawLine({
        start: { x: 50, y: height - 260 },
        end: { x: width - 50, y: height - 260 },
        thickness: 2,
        color: rgb(0, 0, 0),
      });

      // Candidate Details
      coverPage.drawText("Candidate Details:", { x: 50, y: height - 310, size: 14, font: timesRomanBoldFont, color: rgb(0, 0, 0) });

      const fields = [
        "Candidate Name: ",
        "Roll Number: ",
        "Batch/Section: ",
        "Date: ",
        "Candidate Signature: ",
        "Invigilator Signature: "
      ];

      let currentY = height - 360;
      fields.forEach(field => {
        coverPage.drawText(field, { x: 50, y: currentY, size: 12, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
        // Draw dotted line
        let currentX = 180;
        while (currentX < width - 50) {
          coverPage.drawText(".", { x: currentX, y: currentY, size: 12, font: timesRomanFont, color: rgb(0, 0, 0) });
          currentX += 4;
        }
        currentY -= 45;
      });

      // Watermark on Cover Page
      coverPage.drawImage(logoImage, {
        x: width / 2 - watermarkDims.width / 2,
        y: height / 2 - watermarkDims.height / 2 - 100,
        width: watermarkDims.width,
        height: watermarkDims.height,
        opacity: 0.08,
      });

      // General Instructions
      coverPage.drawText("General Instructions:", { x: 50, y: currentY - 20, size: 14, font: timesRomanBoldFont, color: rgb(0, 0, 0) });
      const instructions = [
        "1. The test is of 3 hours 20 minutes duration and consists of 200 questions.",
        "2. The paper consists of Physics, Chemistry, and Biology (Botany & Zoology).",
        "3. Each correct answer carries 4 marks. For each incorrect answer, 1 mark will be deducted.",
        "4. Use Blue/Black Ball Point Pen only for writing particulars/marking responses on Side-1 and Side-2 of the Answer Sheet.",
        "5. Rough work is to be done in the space provided for this purpose in the Test Booklet only.",
        "6. On completion of the test, the candidate must hand over the Answer Sheet to the Invigilator before leaving the Room/Hall."
      ];
      
      let instY = currentY - 45;
      instructions.forEach(inst => {
        coverPage.drawText(inst, { x: 50, y: instY, size: 10, font: timesRomanFont, color: rgb(0, 0, 0) });
        instY -= 20;
      });

      // 5. Erase headers/footers and stamp watermarks on remaining pages
      const pages = pdfDoc.getPages();
      // Skip page 0 because that's our newly inserted cover page
      for (let i = 1; i < pages.length; i++) {
        const page = pages[i];
        const { width: pW, height: pH } = page.getSize();

        // Erase Top (White Rectangle)
        if (topErase > 0) {
          page.drawRectangle({
            x: 0,
            y: pH - topErase,
            width: pW,
            height: topErase,
            color: rgb(1, 1, 1), // Pure White
          });
        }

        // Erase Bottom (White Rectangle)
        if (bottomErase > 0) {
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pW,
            height: bottomErase,
            color: rgb(1, 1, 1), // Pure White
          });
        }

        // Stamp Watermark
        page.drawImage(logoImage, {
          x: pW / 2 - watermarkDims.width / 2,
          y: pH / 2 - watermarkDims.height / 2,
          width: watermarkDims.width,
          height: watermarkDims.height,
          opacity: 0.08,
        });
      }

      // 6. Save and Download
      const finalPdfBytes = await pdfDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Medix_Rebranded_Paper_${targetCode}.pdf`;
      link.click();
      
      setIsProcessing(false);
      onClose();

    } catch (err) {
      console.error("Error rebranding PDF:", err);
      setCustomAlert({
        title: 'Rebranding Failed',
        message: 'There was an error processing and rebranding the PDF. Please try again with a valid PDF.',
        type: 'alert',
        variant: 'danger',
        confirmText: 'Okay'
      });
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)', 
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'overlayFadeIn 0.3s ease'
    }}>
      <div style={{
        backgroundColor: '#1e293b', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '600px',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        color: '#f8fafc',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'cardSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', color: 'white' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={26} /> Rebrand Competitor PDF
            </h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Erase competitor branding and convert it into a Medix paper.</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', padding: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Target Paper Code (for Cover Page)</label>
            <input 
              type="text" 
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value)}
              placeholder="e.g. A, B, C"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0f172a', color: 'white', fontSize: '1rem', outline: 'none', transition: 'all 0.25s' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Upload Competitor PDF</label>
            <div style={{ 
              border: `1.5px dashed ${competitorPdf ? '#10b981' : '#334155'}`, 
              borderRadius: '12px', 
              padding: '24px 20px', 
              textAlign: 'center', 
              backgroundColor: competitorPdf ? 'rgba(16, 185, 129, 0.05)' : '#0f172a', 
              position: 'relative',
              transition: 'all 0.25s ease-in-out',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              if (!competitorPdf) e.currentTarget.style.borderColor = '#8b5cf6';
            }}
            onMouseOut={(e) => {
              if (!competitorPdf) e.currentTarget.style.borderColor = '#334155';
            }}
            >
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
              />
              <UploadCloud size={36} color={competitorPdf ? "#10b981" : "#64748b"} style={{ marginBottom: '10px' }} />
              {competitorPdf ? (
                <div style={{ color: '#10b981', fontWeight: '700', fontSize: '0.95rem' }}>{competitorPdf.name} uploaded!</div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>Click or drag to upload the PDF file</div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '750', marginBottom: '16px', color: '#f1f5f9' }}>3. Rebranding Settings</h3>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer', selectOrder: 'none' }}>
              <input type="checkbox" checked={removeFirstPage} onChange={(e) => setRemoveFirstPage(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#cbd5e1' }}>Delete Competitor's Cover Page (Page 1)</span>
            </label>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Eraser Height (px)</label>
                <input type="number" value={topErase} onChange={(e) => setTopErase(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#1e293b', color: 'white', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#8b5cf6'} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Erases competitor top logos</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bottom Eraser Height (px)</label>
                <input type="number" value={bottomErase} onChange={(e) => setBottomErase(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#1e293b', color: 'white', outline: 'none' }} onFocus={(e) => e.target.style.borderColor = '#8b5cf6'} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Erases competitor footers</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleProcess}
            disabled={isProcessing}
            style={{
              width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #d946ef)',
              color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 10px 20px -3px rgba(139, 92, 246, 0.35)', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', opacity: isProcessing ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = 'linear-gradient(to right, #7c3aed, #db2777)';
                e.currentTarget.style.boxShadow = '0 12px 25px -3px rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.background = 'linear-gradient(to right, #8b5cf6, #d946ef)';
                e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(139, 92, 246, 0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isProcessing ? 'Rebranding PDF...' : <><Download size={22} /> Erase Brands & Download</>}
          </button>
        </div>
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
    </div>
  );
}
