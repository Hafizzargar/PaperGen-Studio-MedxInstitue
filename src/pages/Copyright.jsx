import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copyright as CopyIcon, ShieldAlert, FileSignature, CheckCircle } from 'lucide-react';

export default function Copyright() {
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
              Copyright Notice & Terms of Use
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.95rem' }}>
              Medix Institute Doda — Protecting intellectual property and content integrity.
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
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CopyIcon size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0', color: '#0f172a' }}>Overview</h2>
              <p style={{ margin: 0, color: '#475569', lineHeight: '1.6' }}>
                This Copyright Notice governs the use of the <strong>PaperGen Studio</strong> platform and the generated assessment booklets. 
                Our terms are designed to maintain a clear boundary of intellectual property ownership between 
                <strong> Medix Institute Doda</strong> (the platform provider) and the <strong>Educators/Teachers</strong> (the content creators).
              </p>
            </div>
          </div>

          {/* Grid for detailed sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Section 1: Platform IP */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <ShieldAlert size={20} style={{ color: '#3b82f6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Platform Proprietary Rights</h3>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                The design layout templates, code shuffle algorithms, custom PDF page numbering/watermarking logic, and interface designs of PaperGen Studio are the exclusive intellectual property of Medix Institute Doda. 
                Unauthorized reproduction, cloning, or distribution of this software platform is strictly prohibited.
              </p>
            </div>

            {/* Section 2: Teacher Content Ownership */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #10b981'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <FileSignature size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Educator Content Rights</h3>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Teachers and contributors retain full intellectual property ownership of the raw question texts, equations, and images they write or upload into the system. 
                Medix Institute Doda claims no ownership over user-provided question databases or compiled custom questionnaires.
              </p>
            </div>

            {/* Section 3: Generated PDFs & White-labeling */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              borderTop: '4px solid #8b5cf6',
              gridColumn: '1 / -1'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <CheckCircle size={20} style={{ color: '#8b5cf6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Generated Exam Booklets & Rebranding License</h3>
              </div>
              <p style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                When you generate, white-label, or merge question booklets using this platform:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                <li>Generated mock test PDFs incorporating Medix branding, styling, headers, and watermark are licensed to you for non-commercial educational use within your physical classes or institute.</li>
                <li>The "White-Label PDF Rebrander" is provided specifically to clean up legacy documents and format them under Medix Institute Doda standards. Users must ensure they have the necessary rights to process the uploaded PDFs.</li>
                <li>Commercial resell or bulk distribution of the formatted templates or rebranding utility outputs outside of authorized channels is prohibited without written authorization from Medix Institute.</li>
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
            For licensing permissions, copyright claims, or layout usage inquiries, please contact Medix Institute Doda Administration at{' '}
            <a href="mailto:hafezzargar987@gmail.com" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
              hafezzargar987@gmail.com
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
