import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Cpu, HardDrive, Trash2 } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f1f5f9', 
      color: '#1e293b', 
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Premium Gradient Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: 'white',
        padding: '30px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Subtle radial glow decorative element */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.25) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
          <button 
            onClick={() => navigate('/')} 
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'none';
            }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Data Protection & Privacy Policy
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.95rem' }}>
              Medix Institute Doda — Your data privacy, security, and confidentiality are our highest priority.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'grid', gap: '30px' }}>
          
          {/* Introduction Card */}
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0', color: '#0f172a' }}>Our Commitment</h2>
              <p style={{ margin: 0, color: '#475569', lineHeight: '1.6' }}>
                At PaperGen Studio, we operate on a strict privacy model: <strong>Zero Data Transmission</strong>. 
                Unlike standard cloud-based question builders, our system processes everything right on your own computer. 
                We do not collect, view, monitor, or store any of your proprietary exams, teacher documents, or candidate lists on our servers.
              </p>
            </div>
          </div>

          {/* Grid for detailed sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Section 1: In-Browser Client Side Processing */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <Cpu size={20} style={{ color: '#3b82f6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>100% Client-Side Processing</h3>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                All document merging, image watermarking, question shuffling, and rebranding operations take place locally inside your browser sandbox. 
                No files, questions, or teacher assets are ever uploaded to any database, server, or cloud storage. 
                If you disconnect from the internet, the paper generation tool will continue to work perfectly.
              </p>
            </div>

            {/* Section 2: Local Storage Drafts */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #10b981'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <HardDrive size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Local Draft Storage</h3>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                To prevent accidental loss of your work, question drafts are automatically saved to your browser's local sandbox storage (`localStorage`). 
                This data is stored encrypted/raw only on your physical machine and cannot be read or retrieved by anyone else, including Medix Institute.
              </p>
            </div>

            {/* Section 3: Data Deletion & Privacy Controls */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #ef4444',
              gridColumn: '1 / -1'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Your Control: Deleting Local Data</h3>
              </div>
              <p style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                You have absolute ownership and control over your locally stored draft data:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                <li><strong>Clear Current Draft:</strong> You can clear your active draft layout inside the editor, which immediately purges the corresponding storage.</li>
                <li><strong>Clear All Site Data:</strong> You can wipe all local storage anytime through your browser's settings (Clear site data/cookies).</li>
                <li><strong>Backup Export:</strong> We provide export functionalities so you can save draft files to your computer (`.json` backups) and import them later, keeping your backup security completely in your hands.</li>
              </ul>
            </div>

          </div>

          {/* Contact Disclaimer */}
          <div style={{
            background: 'rgba(248, 250, 252, 0.8)',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#64748b'
          }}>
            If you have questions about our local data policy or security features, please contact us at{' '}
            <a href="mailto:hafezzargar987@gmail.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
              hafezzargar987@gmail.com
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
