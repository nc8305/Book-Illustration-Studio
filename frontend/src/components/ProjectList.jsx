import React, { useState, useEffect } from 'react';

function ProjectList({ user, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [bookText, setBookText] = useState('');

  const loadProjects = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/projects?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !bookText) return;
    setIsCreating(true);
    try {
      const res = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, title, bookText })
      });
      const data = await res.json();
      setProjects([data, ...projects]);
      setTitle('');
      setBookText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setBookText(e.target.result);
      reader.readAsText(file);
    }
  };

  return (
    <div className="app-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h2 style={{ margin: 0 }}>Your Projects</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '48px' }}>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}><span className="spinner"></span></div>
          ) : projects.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', opacity: 0.7 }}>
              <p>No projects yet. Create your first one on the right.</p>
            </div>
          ) : (
            <div>
              {projects.map((p, i) => (
                <div 
                  key={p.id} 
                  className={`project-row animate-fade stagger-${(i%3)+1}`}
                  onClick={() => onSelectProject(p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</h4>
                    <span className="meta">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className={`gd-pill ${p.status === 'done' ? 'done' : p.status === 'draft' ? 'draft' : ''}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="glass-card animate-fade stagger-2">
            <h3>New Project</h3>
            <form onSubmit={handleCreate}>
              <div className="gd-field">
                <label>Project Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Wind in the Willows" />
              </div>
              <div className="gd-field">
                <label>Upload Book (.txt)</label>
                <input type="file" accept=".txt" onChange={handleFileUpload} />
              </div>
              <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>OR PASTE TEXT</div>
              <div className="gd-field">
                <textarea 
                  rows="6" 
                  value={bookText} 
                  onChange={e => setBookText(e.target.value)} 
                  placeholder="Paste book text here..."
                  style={{ resize: 'vertical' }}
                ></textarea>
              </div>
              <button type="submit" className="gd-btn gd-btn-primary" style={{ width: '100%' }} disabled={isCreating || !title || !bookText}>
                {isCreating ? <span className="spinner"></span> : 'Create Project'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectList;
