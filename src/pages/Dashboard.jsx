import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowRight, BookOpen, FlaskConical, Dna, Layers, FolderOpen, ShieldCheck } from 'lucide-react';
import PDFMerger from '../components/PDFMerger';
import PDFRebrander from '../components/PDFRebrander';
import CustomAlert from '../components/CustomAlert';

export default function Dashboard() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState({});
  const [customAlert, setCustomAlert] = useState(null);

  useEffect(() => {
    const modes = ['full', 'physics', 'chemistry', 'biology'];
    const foundDrafts = {};

    // Quick migration for legacy 'paperQuestions'
    const oldSaved = localStorage.getItem('paperQuestions');
    if (oldSaved) {
      const oldMode = localStorage.getItem('paperMode') || 'full';
      localStorage.setItem(`paperQuestions_${oldMode}`, oldSaved);
      localStorage.removeItem('paperQuestions');
      
      const oldCodes = localStorage.getItem('paperCodes');
      if (oldCodes) {
        localStorage.setItem(`paperCodes_${oldMode}`, oldCodes);
        localStorage.removeItem('paperCodes');
      }
    }

    modes.forEach(mode => {
      const saved = localStorage.getItem(`paperQuestions_${mode}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const pCount = parsed.physics ? parsed.physics.length : 0;
          const cCount = parsed.chemistry ? parsed.chemistry.length : 0;
          const bCount = parsed.biology ? parsed.biology.length : 0;
          
          if (pCount > 0 || cCount > 0 || bCount > 0) {
            foundDrafts[mode] = { physics: pCount, chemistry: cCount, biology: bCount, total: pCount + cCount + bCount, mode };
          }
        } catch (e) {
          console.error(`Error reading saved data for ${mode}`, e);
        }
      }
    });
    setDrafts(foundDrafts);
  }, []);

  const startNewPaper = (mode) => {
    const handleStart = () => {
      localStorage.removeItem(`paperQuestions_${mode}`);
      localStorage.removeItem(`paperCodes_${mode}`);
      localStorage.setItem('paperMode', mode);
      sessionStorage.removeItem('hasPromptedResume');
      navigate('/create');
    };

    if (drafts[mode]) {
      const modeNames = {
        'full': 'Full Pattern',
        'physics': 'Physics Only',
        'chemistry': 'Chemistry Only',
        'biology': 'Biology Only'
      };
      setCustomAlert({
        title: 'Overwrite Saved Draft?',
        message: `You already have a saved ${modeNames[mode]} draft. Are you sure you want to delete it and start fresh?`,
        type: 'confirm',
        variant: 'warning',
        confirmText: 'Yes, Overwrite',
        cancelText: 'Cancel',
        onConfirm: handleStart
      });
    } else {
      handleStart();
    }
  };

  const resumePaper = (mode) => {
    localStorage.setItem('paperMode', mode);
    navigate('/create');
  };

  const deleteDraft = (e, mode) => {
    e.stopPropagation(); // prevent resumePaper
    setCustomAlert({
      title: 'Delete Saved Draft?',
      message: 'Are you sure you want to permanently delete this draft?',
      type: 'confirm',
      variant: 'danger',
      confirmText: 'Delete Draft',
      cancelText: 'Cancel',
      onConfirm: () => {
        localStorage.removeItem(`paperQuestions_${mode}`);
        localStorage.removeItem(`paperCodes_${mode}`);
        setDrafts(prev => {
          const newDrafts = { ...prev };
          delete newDrafts[mode];
          return newDrafts;
        });
      }
    });
  };

  const [showMerger, setShowMerger] = useState(false);
  const [showRebrander, setShowRebrander] = useState(false);

  const CreationCard = ({ title, desc, icon, onClick, gradient, actionColor = '#3b82f6', actionHover = '#2563eb' }) => (
    <div 
      onClick={onClick}
      className="creation-card"
      style={{ 
        '--card-gradient': gradient,
        '--icon-bg': `${gradient}15`,
        '--icon-color': gradient,
        '--action-color': actionColor,
        '--action-hover': actionHover
      }}
    >
      <div className="icon-wrapper">
        {icon}
      </div>
      <h2>{title}</h2>
      <p>{desc}</p>
      
      <div className="card-action">
        Start Creating <ArrowRight size={14} />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Contact Marquee Banner */}
      <div style={{
        width: '100%',
        backgroundColor: '#1e1b4b',
        color: '#f59e0b',
        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        padding: '10px 0',
        zIndex: 1000,
        fontSize: '0.9rem',
        fontWeight: '600',
        flexShrink: 0
      }}>
        <marquee 
          scrollamount="5"
          onMouseOver={(e) => e.currentTarget.stop()}
          onMouseOut={(e) => e.currentTarget.start()}
        >
          <span>System Notice: Our technical support team is actively working on resolving platform issues. If you experience any technical difficulties, please </span>
          <a href="mailto:hafezzargar987@gmail.com" style={{ color: '#60a5fa', textDecoration: 'underline', margin: '0 4px', fontWeight: '700' }}>contact support</a>
          <span> or visit the official </span>
          <a href="https://medxinstitute-doda.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', margin: '0 4px', fontWeight: '700' }}>Medix Institute Doda Portal</a>
          <span> for assistance.</span>
        </marquee>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px' }}>
      
      {/* Header Banner */}
      <div style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        marginBottom: '40px', 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        gap: '24px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '30px 40px',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <img src="/companylogo.jpeg" alt="Medix Institute Doda" style={{ maxHeight: '85px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }} />
        <div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            color: '#ffffff', 
            letterSpacing: '-0.5px', 
            margin: '0 0 6px 0',
            background: 'linear-gradient(to right, #ffffff, #93c5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            PaperGen Studio
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', margin: 0, fontWeight: '500' }}>
            Select a format to begin crafting your next high-quality question paper.
          </p>
        </div>
      </div>

      <div className="creation-grid">
        
        {/* Resume Paper Cards */}
        {Object.keys(drafts).map(mode => {
          const stat = drafts[mode];
          return (
            <div 
              key={mode}
              onClick={() => resumePaper(mode)}
              className="resume-card"
            >
              <button 
                onClick={(e) => deleteDraft(e, mode)}
                title="Delete this draft"
                style={{
                  position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
                  <FileText size={28} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 4px 0' }}>Resume Draft</h2>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                    {stat.mode === 'full' ? 'Full Pattern' : stat.mode.charAt(0).toUpperCase() + stat.mode.slice(1) + ' Only'} • {stat.total} Questions Added
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', backgroundColor: 'rgba(0,0,0,0.15)', padding: '10px 16px', borderRadius: '10px', flexWrap: 'wrap', marginRight: '40px' }}>
                {(stat.mode === 'full' || stat.mode === 'physics') && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{stat.physics}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Physics</div>
                  </div>
                )}
                {(stat.mode === 'full') && <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>}
                {(stat.mode === 'full' || stat.mode === 'chemistry') && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{stat.chemistry}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chemistry</div>
                  </div>
                )}
                {(stat.mode === 'full') && <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>}
                {(stat.mode === 'full' || stat.mode === 'biology') && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{stat.biology}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Biology</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <CreationCard 
          title="Full Pattern" 
          desc="Create a complete paper with Physics, Chemistry, and Biology sections." 
          icon={<Layers size={24} />} 
          gradient="#3b82f6"
          actionColor="#3b82f6"
          actionHover="#2563eb"
          onClick={() => startNewPaper('full')} 
        />
        <CreationCard 
          title="Physics Only" 
          desc="Generate a focused paper containing only Physics questions." 
          icon={<BookOpen size={24} />} 
          gradient="#8b5cf6"
          actionColor="#8b5cf6"
          actionHover="#7c3aed"
          onClick={() => startNewPaper('physics')} 
        />
        <CreationCard 
          title="Chemistry Only" 
          desc="Generate a focused paper containing only Chemistry questions." 
          icon={<FlaskConical size={24} />} 
          gradient="#f59e0b"
          actionColor="#f59e0b"
          actionHover="#d97706"
          onClick={() => startNewPaper('chemistry')} 
        />
        <CreationCard 
          title="Biology Only" 
          desc="Generate a focused paper containing only Biology questions." 
          icon={<Dna size={24} />} 
          gradient="#10b981"
          actionColor="#10b981"
          actionHover="#059669"
          onClick={() => startNewPaper('biology')} 
        />

        <CreationCard 
          title="Merge Teacher PDFs" 
          desc="Combine raw PDF files from multiple teachers into a single Full Pattern paper." 
          icon={<FolderOpen size={24} />} 
          gradient="#ec4899"
          actionColor="#ec4899"
          actionHover="#db2777"
          onClick={() => setShowMerger(true)} 
        />

        <CreationCard 
          title="White-Label PDF" 
          desc="Upload a competitor's PDF, erase their branding, and convert it to a Medix paper." 
          icon={<ShieldCheck size={24} />} 
          gradient="#8b5cf6"
          actionColor="#8b5cf6"
          actionHover="#7c3aed"
          onClick={() => setShowRebrander(true)} 
        />

      </div>

      {/* Footer */}
      <footer style={{ 
        marginTop: 'auto', 
        paddingTop: '40px', 
        paddingBottom: '20px',
        width: '100%', 
        maxWidth: '1200px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        color: '#64748b', 
        fontSize: '0.9rem', 
        borderTop: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <strong>Medix Institute Doda</strong>
          <p style={{ margin: '4px 0 0 0' }}>Jammu and Kashmir</p>
        </div>
        
        {/* Policy navigation links */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link 
            to="/copyright" 
            style={{ 
              color: '#64748b', 
              textDecoration: 'none', 
              fontWeight: '500',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.color = '#3b82f6'}
            onMouseOut={(e) => e.target.style.color = '#64748b'}
          >
            Copyright Policy
          </Link>
          <Link 
            to="/privacy" 
            style={{ 
              color: '#64748b', 
              textDecoration: 'none', 
              fontWeight: '500',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.color = '#3b82f6'}
            onMouseOut={(e) => e.target.style.color = '#64748b'}
          >
            Privacy & Data Protection
          </Link>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0' }}>&copy; {new Date().getFullYear()} All Rights Reserved.</p>
          <a href="https://medxinstitute-doda.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
            medxinstitute-doda.netlify.app
          </a>
        </div>
      </footer>

      {showMerger && <PDFMerger onClose={() => setShowMerger(false)} />}
      {showRebrander && <PDFRebrander onClose={() => setShowRebrander(false)} />}
      {customAlert && (
        <CustomAlert
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.type}
          variant={customAlert.variant}
          confirmText={customAlert.confirmText}
          cancelText={customAlert.cancelText}
          onConfirm={() => {
            customAlert.onConfirm();
            setCustomAlert(null);
          }}
          onCancel={() => setCustomAlert(null)}
        />
      )}
      </div>
    </div>
  );
}
