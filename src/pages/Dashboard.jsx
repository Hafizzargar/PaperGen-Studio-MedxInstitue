import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, BookOpen, FlaskConical, Dna, Layers, FolderOpen, ShieldCheck } from 'lucide-react';
import PDFMerger from '../components/PDFMerger';
import PDFRebrander from '../components/PDFRebrander';

export default function Dashboard() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState({});

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
    if (drafts[mode]) {
      const modeNames = {
        'full': 'Full Pattern',
        'physics': 'Physics Only',
        'chemistry': 'Chemistry Only',
        'biology': 'Biology Only'
      };
      if (!window.confirm(`You already have a saved ${modeNames[mode]} draft. Are you sure you want to delete it and start fresh?`)) {
        return;
      }
    }
    // Wipe local storage ONLY for this mode
    localStorage.removeItem(`paperQuestions_${mode}`);
    localStorage.removeItem(`paperCodes_${mode}`);
    localStorage.setItem('paperMode', mode);
    sessionStorage.removeItem('hasPromptedResume');
    navigate('/create');
  };

  const resumePaper = (mode) => {
    localStorage.setItem('paperMode', mode);
    navigate('/create');
  };

  const deleteDraft = (e, mode) => {
    e.stopPropagation(); // prevent resumePaper
    if (window.confirm("Are you sure you want to permanently delete this draft?")) {
      localStorage.removeItem(`paperQuestions_${mode}`);
      localStorage.removeItem(`paperCodes_${mode}`);
      setDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[mode];
        return newDrafts;
      });
    }
  };

  const [showMerger, setShowMerger] = useState(false);
  const [showRebrander, setShowRebrander] = useState(false);

  const CreationCard = ({ title, desc, icon, onClick, gradient }) => (
    <div 
      onClick={onClick}
      style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)', 
        cursor: 'pointer', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start',
        border: '1px solid #f1f5f9',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.borderColor = '#f1f5f9';
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: gradient }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ padding: '10px', borderRadius: '10px', background: `${gradient}20`, color: '#334155' }}>
          {icon}
        </div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#1e293b' }}>{title}</h2>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>{desc}</p>
      
      <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontWeight: '600', fontSize: '0.85rem' }}>
        Start Creating <ArrowRight size={14} />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      
      <div style={{ width: '100%', maxWidth: '1200px', marginBottom: '30px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
        <img src="/companylogo.jpeg" alt="Medix Institute Doda" style={{ maxHeight: '80px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: '0 0 5px 0' }}>PaperGen Studio</h1>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>Select a format to begin crafting your next question paper.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Resume Paper Cards */}
        {Object.keys(drafts).map(mode => {
          const stat = drafts[mode];
          return (
            <div 
              key={mode}
              onClick={() => resumePaper(mode)}
              style={{ 
                gridColumn: '1 / -1', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                padding: '20px 30px', 
                borderRadius: '20px', 
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', 
                cursor: 'pointer', 
                transition: 'transform 0.2s', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                color: 'white',
                flexWrap: 'wrap',
                gap: '20px',
                position: 'relative'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <button 
                onClick={(e) => deleteDraft(e, mode)}
                title="Delete this draft"
                style={{
                  position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'background 0.2s'
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
          icon={<Layers size={24} color="#3b82f6" />} 
          gradient="#3b82f6"
          onClick={() => startNewPaper('full')} 
        />
        <CreationCard 
          title="Physics Only" 
          desc="Generate a focused paper containing only Physics questions." 
          icon={<BookOpen size={24} color="#8b5cf6" />} 
          gradient="#8b5cf6"
          onClick={() => startNewPaper('physics')} 
        />
        <CreationCard 
          title="Chemistry Only" 
          desc="Generate a focused paper containing only Chemistry questions." 
          icon={<FlaskConical size={24} color="#f59e0b" />} 
          gradient="#f59e0b"
          onClick={() => startNewPaper('chemistry')} 
        />
        <CreationCard 
          title="Biology Only" 
          desc="Generate a focused paper containing only Biology questions." 
          icon={<Dna size={24} color="#10b981" />} 
          gradient="#10b981"
          onClick={() => startNewPaper('biology')} 
        />

        <CreationCard 
          title="Merge Teacher PDFs" 
          desc="Combine raw PDF files from multiple teachers into a single Full Pattern paper." 
          icon={<FolderOpen size={24} color="#ec4899" />} 
          gradient="#ec4899"
          onClick={() => setShowMerger(true)} 
        />

        <CreationCard 
          title="White-Label PDF" 
          desc="Upload a competitor's PDF, erase their branding, and convert it to a Medix paper." 
          icon={<ShieldCheck size={24} color="#8b5cf6" />} 
          gradient="#8b5cf6"
          onClick={() => setShowRebrander(true)} 
        />

      </div>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '40px', width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.9rem', borderTop: '1px solid #e2e8f0' }}>
        <div>
          <strong>Medix Institute Doda</strong>
          <p style={{ margin: '4px 0 0 0' }}>Jammu and Kashmir</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0' }}>&copy; {new Date().getFullYear()} All Rights Reserved.</p>
          <a href="https://medxinstitue-doda.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
            medxinstitue-doda.netlify.app
          </a>
        </div>
      </footer>

      {showMerger && <PDFMerger onClose={() => setShowMerger(false)} />}
      {showRebrander && <PDFRebrander onClose={() => setShowRebrander(false)} />}
    </div>
  );
}
