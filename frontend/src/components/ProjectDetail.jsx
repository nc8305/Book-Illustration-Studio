import React, { useState, useEffect } from 'react';

const STEPS = ['style', 'characters', 'portraits', 'chapters', 'illustrations'];
const STEP_LABELS = ['Style', 'Characters', 'Portraits', 'Chapters', 'Illustrations'];

function ProjectDetail({ user, projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customStyle, setCustomStyle] = useState('');

  useEffect(() => {
    // Fetch initial state
    fetch(`http://localhost:3001/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      });

    // Setup SSE
    const evtSource = new EventSource(`http://localhost:3001/api/projects/${projectId}/stream`);
    evtSource.addEventListener('update', (e) => {
      setProject(JSON.parse(e.data));
    });

    return () => {
      evtSource.close();
    };
  }, [projectId]);

  const handleNextStep = async () => {
    if (!project || project.stepState === 'running') return;
    
    const payload = {};
    if (project.currentStep === 'style' && customStyle) {
      payload.style = customStyle;
    }

    try {
      await fetch(`http://localhost:3001/api/projects/${projectId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepName: project.currentStep, payload })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecover = async () => {
    await fetch(`http://localhost:3001/api/projects/${projectId}/recover`, { method: 'POST' });
  };

  if (loading || !project) {
    return <div className="center-screen"><span className="spinner"></span></div>;
  }

  const currentStepIdx = STEPS.indexOf(project.currentStep);
  const isDone = project.status === 'done';

  return (
    <div className="app-container">
      <button onClick={onBack} className="gd-btn gd-btn-secondary" style={{ marginBottom: '24px', padding: '8px 16px', fontSize: '13px' }}>
        ← Back to Projects
      </button>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '8px' }}>{project.title}</h2>
        <span className="meta">Created on {new Date(project.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="stepper animate-fade">
        {STEPS.map((step, idx) => {
          let statusClass = '';
          if (isDone || idx < currentStepIdx) statusClass = 'done';
          else if (idx === currentStepIdx) statusClass = 'current';

          return (
            <React.Fragment key={step}>
              <div className={`step ${statusClass}`}>
                <div className="step-num">{idx + 1}</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{STEP_LABELS[idx]}</div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`stepper-line ${isDone || idx < currentStepIdx ? 'done' : ''}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="detail-grid animate-fade stagger-1">
        <div>
          {project.style && (
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px' }}>Art Style</h4>
              <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--grad-orange-pale)' }}>"{project.style}"</p>
            </div>
          )}

          {project.characters && project.characters.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px' }}>Characters</h3>
              <div className="entity-grid">
                {project.characters.map((char, i) => (
                  <div key={i} className="entity-card animate-fade">
                    <div className="art">
                      {char.portraitBase64 ? (
                        <img src={char.portraitBase64} alt={char.name} />
                      ) : (
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Pending Portrait</span>
                      )}
                    </div>
                    <div className="body">
                      <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>{char.name}</h4>
                      <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>{char.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.chapters && project.chapters.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px' }}>Chapters</h3>
              <div className="entity-grid">
                {project.chapters.map((chap, i) => (
                  <div key={i} className="entity-card animate-fade">
                    <div className="art chapter">
                      {chap.illustrationBase64 ? (
                        <img src={chap.illustrationBase64} alt={chap.name} />
                      ) : (
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Pending Illustration</span>
                      )}
                    </div>
                    <div className="body">
                      <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>{chap.name}</h4>
                      <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>{chap.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="glass-card" style={{ position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '16px' }}>Pipeline Status</h3>
            
            {project.stepState === 'running' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="spinner" style={{ marginBottom: '16px' }}></span>
                <div style={{ fontSize: '14px', color: 'var(--grad-orange)' }}>
                  Running {STEP_LABELS[currentStepIdx]}...
                </div>
                <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <p>Calls can take 10-30s (longer for images). You can safely refresh the page.</p>
                  <button className="gd-btn gd-btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', marginTop: '8px' }} onClick={handleRecover}>
                    Stuck? Recover
                  </button>
                </div>
              </div>
            ) : project.stepState === 'error' ? (
              <div style={{ padding: '16px 0' }}>
                <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
                  <strong>Failed:</strong> {project.errorMsg}
                </div>
                <button className="gd-btn gd-btn-primary" style={{ width: '100%' }} onClick={handleNextStep}>
                  Retry {STEP_LABELS[currentStepIdx]}
                </button>
              </div>
            ) : isDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                <h4 style={{ color: 'var(--grad-orange)' }}>Pipeline Complete</h4>
                <p style={{ fontSize: '13px' }}>Your book has been fully illustrated.</p>
              </div>
            ) : (
              <div>
                {project.currentStep === 'style' && (
                  <div className="gd-field">
                    <label>Custom Style (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Cyberpunk, neon colors" 
                      value={customStyle} 
                      onChange={e => setCustomStyle(e.target.value)} 
                    />
                  </div>
                )}
                
                <button className="gd-btn gd-btn-primary" style={{ width: '100%' }} onClick={handleNextStep}>
                  Run {STEP_LABELS[currentStepIdx]}
                </button>
              </div>
            )}
            
            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <details>
                <summary style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                  View Book Text
                </summary>
                <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                  {project.bookText}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
