import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, Loader } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import CustomAlert from './CustomAlert';

export default function PDFMerger({ onClose }) {
  const [paperCode, setPaperCode] = useState('');
  const [files, setFiles] = useState({ physics: null, chemistry: null, biology: null });
  const [isMerging, setIsMerging] = useState(false);
  const [customAlert, setCustomAlert] = useState(null);

  const handleFileChange = (subject, e) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [subject]: e.target.files[0] });
    }
  };

  const drawCoverPage = async (pdfDoc) => {
    // Add A4 page
    // 595.28 x 841.89 points
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Title
    page.drawText("NEET UG - FULL MOCK TEST", {
      x: width / 2 - 140,
      y: height - 120,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Draw Line
    page.drawLine({
      start: { x: 50, y: height - 130 },
      end: { x: width - 50, y: height - 130 },
      thickness: 2,
    });

    // Meta Info Box
    page.drawRectangle({
      x: 50,
      y: height - 200,
      width: width - 100,
      height: 40,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.97, 0.97, 0.97),
    });

    page.drawText(`Paper Code: ${paperCode || 'None'}`, { x: 60, y: height - 185, size: 12, font: boldFont });
    page.drawText(`Max Marks: 720`, { x: width / 2 - 40, y: height - 185, size: 12, font: boldFont });
    page.drawText(`Time: 3 Hours 20 Mins`, { x: width - 200, y: height - 185, size: 12, font: boldFont });

    // Candidate Details
    page.drawText("Candidate Details:", { x: 50, y: height - 260, size: 14, font: boldFont });
    
    const details = ["Candidate Name:", "Roll Number:", "Batch/Section:", "Date:"];
    let currentY = height - 300;
    for (const d of details) {
      page.drawText(d, { x: 50, y: currentY, size: 12, font: boldFont });
      page.drawLine({
        start: { x: 180, y: currentY - 2 },
        end: { x: width - 50, y: currentY - 2 },
        thickness: 1,
        dashArray: [2, 2]
      });
      currentY -= 40;
    }

    // Signatures
    page.drawLine({ start: { x: 80, y: height - 520 }, end: { x: 230, y: height - 520 }, thickness: 1 });
    page.drawText("Candidate's Signature", { x: 90, y: height - 535, size: 10, font: boldFont });

    page.drawLine({ start: { x: width - 230, y: height - 520 }, end: { x: width - 80, y: height - 520 }, thickness: 1 });
    page.drawText("Invigilator's Signature", { x: width - 220, y: height - 535, size: 10, font: boldFont });

    // Instructions
    page.drawLine({ start: { x: 50, y: height - 600 }, end: { x: width - 50, y: height - 600 }, thickness: 2 });
    page.drawText("General Instructions:", { x: 50, y: height - 625, size: 14, font: boldFont });
    
    const instructions = [
      "1. The test is of 3 hours 20 minutes duration and consists of 200 questions.",
      "2. The maximum marks are 720.",
      "3. Each correct answer carries 4 marks. For each incorrect answer, 1 mark will be deducted.",
      "4. Use Blue/Black Ball Point Pen only for writing particulars and darkening the circles on the OMR sheet.",
      "5. Rough work is to be done on the space provided for this purpose in the Test Booklet only.",
      "6. Use of electronic devices like mobile phones, calculators, etc., is strictly prohibited."
    ];

    let instY = height - 650;
    for (const inst of instructions) {
      page.drawText(inst, { x: 60, y: instY, size: 10, font: font });
      instY -= 20;
    }

    // Footer
    page.drawText(`© ${new Date().getFullYear()} Medix Institute Doda | Official Website: https://medxinstitute-doda.netlify.app/`, {
      x: 100, y: 30, size: 9, font: font, color: rgb(0.3, 0.3, 0.3)
    });
  };

  const handleMerge = async () => {
    if (!files.physics && !files.chemistry && !files.biology) {
      setCustomAlert({
        title: 'No Files Selected',
        message: 'Please upload at least one subject PDF file (Physics, Chemistry, or Biology) to merge.',
        type: 'alert',
        variant: 'warning',
        confirmText: 'Okay'
      });
      return;
    }

    setIsMerging(true);
    try {
      const finalPdf = await PDFDocument.create();
      
      // 1. Draw Cover Page
      await drawCoverPage(finalPdf);

      // 2. Append PDFs
      const subjects = ['physics', 'chemistry', 'biology'];
      for (const subj of subjects) {
        if (files[subj]) {
          const fileBuffer = await files[subj].arrayBuffer();
          const subjPdf = await PDFDocument.load(fileBuffer);
          const copiedPages = await finalPdf.copyPages(subjPdf, subjPdf.getPageIndices());
          copiedPages.forEach((page) => finalPdf.addPage(page));
        }
      }

      // 3. Save and Download
      const pdfBytes = await finalPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Merged_Full_Mock_${paperCode || 'Paper'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose(); // Close modal after successful merge
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: 'Merge Failed',
        message: 'An error occurred while merging PDFs. Please ensure valid, uncorrupted PDF files were selected.',
        type: 'alert',
        variant: 'danger',
        confirmText: 'Okay'
      });
    } finally {
      setIsMerging(false);
    }
  };
  const FileUploader = ({ subject, label, color }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={(e) => handleFileChange(subject, e)}
          style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
        />
        <div style={{ 
          border: `1.5px dashed ${files[subject] ? color : '#334155'}`, 
          padding: '16px 20px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          backgroundColor: files[subject] ? `${color}15` : '#0f172a', 
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}
        onMouseOver={(e) => {
          if (!files[subject]) e.currentTarget.style.borderColor = color;
        }}
        onMouseOut={(e) => {
          if (!files[subject]) e.currentTarget.style.borderColor = '#334155';
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: files[subject] ? '#ffffff' : '#64748b' }}>
            <Upload size={20} color={files[subject] ? color : '#64748b'} />
            <span style={{ fontSize: '0.95rem', fontWeight: files[subject] ? '700' : '500' }}>
              {files[subject] ? files[subject].name : 'Choose PDF file...'}
            </span>
          </div>
          {files[subject] && <CheckCircle size={20} color={color} />}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.75)', 
      backdropFilter: 'blur(12px)', 
      WebkitBackdropFilter: 'blur(12px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 9999, 
      padding: '20px',
      animation: 'overlayFadeIn 0.3s ease'
    }}>
      <div style={{ 
        backgroundColor: '#1e293b', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '600px', 
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex', 
        flexDirection: 'column', 
        maxHeight: '90vh',
        color: '#f8fafc',
        overflow: 'hidden',
        animation: 'cardSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        
        <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ec4899, #be185d)', color: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} />
            PDF Merger Tool
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', padding: '6px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Paper Code (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. A, B, C, D" 
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '16px', boxSizing: 'border-box', outline: 'none', transition: 'all 0.25s' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ec4899';
                e.target.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '25px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '750', color: '#f1f5f9' }}>Upload Teacher PDFs</h3>
            <FileUploader subject="physics" label="1. Physics PDF" color="#8b5cf6" />
            <FileUploader subject="chemistry" label="2. Chemistry PDF" color="#f59e0b" />
            <FileUploader subject="biology" label="3. Biology PDF" color="#10b981" />
          </div>
        </div>

        <div style={{ padding: '24px 30px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#111827' }}>
          <button 
            onClick={handleMerge}
            disabled={isMerging}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '1.05rem', 
              fontWeight: '700', 
              cursor: isMerging ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '10px', 
              opacity: isMerging ? 0.7 : 1, 
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
            onMouseOver={(e) => {
              if (!isMerging) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(236, 72, 153, 0.45)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!isMerging) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(236, 72, 153, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isMerging ? <><Loader size={20} className="animate-spin" /> Generating Final PDF...</> : 'Merge and Download PDF'}
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
