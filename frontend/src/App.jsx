import { useState, useEffect } from 'react';
import './index.css';

// Mock API service pointing to our backend
const API_URL = 'http://localhost:3001/api';

const fetcher = async (url, options = {}) => {
  const userId = localStorage.getItem('userId') || 'default_user';
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    ...options.headers,
  };
  const res = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'API Error');
  }
  return res.json();
};

function App() {
  const [user, setUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState('list'); // list, detail, new

  useEffect(() => {
    const savedUser = localStorage.getItem('userName');
    const savedUserId = localStorage.getItem('userId');
    if (savedUser && savedUserId) {
      setUser({ name: savedUser, id: savedUserId });
    }
  }, []);

  useEffect(() => {
    if (user && view === 'list') {
      loadProjects();
    }
  }, [user, view]);

  const loadProjects = async () => {
    try {
      const data = await fetcher('/projects');
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const email = e.target.email.value;
    if (name && email) {
      const id = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      localStorage.setItem('userName', name);
      localStorage.setItem('userId', id);
      setUser({ name, id });
      setView('list');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    setUser(null);
  };

  const createProject = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const bookText = e.target.bookText.value;
    try {
      const newProj = await fetcher('/projects', {
        method: 'POST',
        body: JSON.stringify({ title, bookText })
      });
      setCurrentProject(newProj.id);
      setView('detail');
    } catch(err) {
      alert(err.message);
    }
  };

  const openProject = (id) => {
    setCurrentProject(id);
    setView('detail');
  };

  // 1. Identity View
  if (!user) {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-card">
          <h1>Welcome to Gradion Studio</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Enter your details to start illustrating books.
          </p>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Name</label>
              <input type="text" name="name" required placeholder="John Doe" />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" name="email" required placeholder="john@example.com" />
            </div>
            <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  // Header
  const Header = () => (
    <header className="header">
      <h2>Gradion Studio</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Hello, {user.name}</span>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>Sign out</button>
      </div>
    </header>
  );

  // 2. New Project View
  if (view === 'new') {
    return (
      <div className="container">
        <Header />
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2>Create New Project</h2>
            <button className="btn btn-secondary" onClick={() => setView('list')}>Back to Projects</button>
          </div>
          <form onSubmit={createProject}>
            <div className="input-group">
              <label>Project Title</label>
              <input type="text" name="title" required placeholder="e.g. The Wind in the Willows" />
            </div>
            <div className="input-group">
              <label>Book Content (Text)</label>
              <textarea name="bookText" required rows="10" placeholder="Paste the book content here..."></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Create & Start</button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Project Detail View
  if (view === 'detail' && currentProject) {
    return (
      <div className="container">
        <Header />
        <ProjectDetail 
          projectId={currentProject} 
          onBack={() => setView('list')} 
          fetcher={fetcher} 
        />
      </div>
    );
  }

  // 4. Project List View
  return (
    <div className="container">
      <Header />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2>Your Projects</h2>
        <button className="btn btn-primary" onClick={() => setView('new')}>+ New Project</button>
      </div>
      
      {projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>No projects yet. Create one to get started!</h3>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div key={p.id} className="glass-panel project-card" onClick={() => openProject(p.id)}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{p.title}</h3>
                <span className={`status-badge status-${p.status === 'Done' ? 'done' : p.status === 'In progress' ? 'progress' : 'draft'}`}>
                  {p.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Created: {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Project Detail Component (Pipeline logic)
function ProjectDetail({ projectId, onBack, fetcher }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const STEP_ORDER = ['style', 'characters', 'portraits', 'chapters', 'illustrations'];
  const STEP_LABELS = ['Art Style', 'Characters', 'Portraits', 'Chapters', 'Illustrations'];

  const pollProject = async () => {
    try {
      const data = await fetcher(`/projects/${projectId}`);
      setProject(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    pollProject();
    // Poll every 3 seconds
    const interval = setInterval(pollProject, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const runStep = async (stepName, payload = {}) => {
    try {
      // Optimistic update to UI spinner
      setProject(p => {
        const np = {...p};
        np.steps[stepName].status = 'in_progress';
        return np;
      });
      await fetcher(`/projects/${projectId}/steps/${stepName}/run`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      pollProject();
    } catch (err) {
      alert(err.message);
      pollProject();
    }
  };

  if (loading && !project) return <div style={{textAlign: 'center', padding: '4rem'}}><div className="spinner"></div></div>;
  if (error) return <div>Error: {error}</div>;

  // Find current active step
  let currentStepIdx = 0;
  for (let i = 0; i < STEP_ORDER.length; i++) {
    if (project.steps[STEP_ORDER[i]].status === 'done') {
      currentStepIdx = i + 1;
    } else {
      break;
    }
  }

  const currentStepName = STEP_ORDER[currentStepIdx];
  const isFinished = currentStepIdx >= STEP_ORDER.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>&larr; Back</button>
          <h2>{project.title}</h2>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div className="stepper">
          {STEP_ORDER.map((step, idx) => {
            const st = project.steps[step].status;
            const isDone = st === 'done';
            const isActive = idx === currentStepIdx || st === 'in_progress';
            return (
              <div key={step} className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <div className="step-circle">
                  {isDone ? '✓' : (idx + 1)}
                </div>
                <div className="step-label">{STEP_LABELS[idx]}</div>
              </div>
            );
          })}
        </div>

        {!isFinished && currentStepName && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 style={{ marginBottom: '1rem' }}>
              Current Step: {STEP_LABELS[currentStepIdx]}
            </h3>
            
            {project.steps[currentStepName].status === 'in_progress' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="spinner"></div>
                <span>Gemini is generating... This may take a while.</span>
              </div>
            ) : project.steps[currentStepName].status === 'failed' ? (
               <div>
                  <p style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Error: {project.steps[currentStepName].error}</p>
                  <button className="btn btn-primary" onClick={() => runStep(currentStepName)}>Retry Step</button>
               </div>
            ) : (
              <div>
                {currentStepName === 'style' && (
                  <div className="input-group" style={{ maxWidth: '400px' }}>
                    <label>Optional: Suggest an art style, or leave blank to let AI decide</label>
                    <input type="text" id="styleInput" placeholder="e.g. Watercolor painting" />
                  </div>
                )}
                <button 
                  className="btn btn-primary" 
                  onClick={() => runStep(currentStepName, currentStepName === 'style' ? { style: document.getElementById('styleInput')?.value } : {})}
                >
                  Run {STEP_LABELS[currentStepIdx]}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Rendering */}
      {project.steps.style.status === 'done' && (
         <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3>Art Style</h3>
            <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{project.steps.style.result.style}"</p>
         </div>
      )}

      {project.steps.characters.status === 'done' && (
         <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3>Characters</h3>
            <div className="character-grid">
               {project.steps.characters.result.characters.map((c, i) => (
                  <div key={i} className="glass-panel result-card">
                     {c.portraitBase64 ? (
                        <div className="result-img-wrapper">
                           <img src={c.portraitBase64} alt={c.name} className="result-img" />
                        </div>
                     ) : (
                        <div className="result-img-wrapper">
                           <span style={{ color: 'var(--text-secondary)' }}>Portrait pending...</span>
                        </div>
                     )}
                     <div className="result-info">
                        <div className="result-title">{c.name}</div>
                        <div className="result-prompt">{c.prompt}</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {project.steps.chapters.status === 'done' && (
         <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3>Chapters</h3>
            <div className="chapter-grid">
               {project.steps.chapters.result.chapters.map((c, i) => (
                  <div key={i} className="glass-panel result-card">
                     {c.illustrationBase64 ? (
                        <div className="result-img-wrapper">
                           <img src={c.illustrationBase64} alt={c.name} className="result-img" />
                        </div>
                     ) : (
                        <div className="result-img-wrapper">
                           <span style={{ color: 'var(--text-secondary)' }}>Illustration pending...</span>
                        </div>
                     )}
                     <div className="result-info">
                        <div className="result-title">{c.name}</div>
                        <div className="result-prompt">{c.prompt}</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                           Featuring: {c.characters?.join(', ')}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}

export default App;
