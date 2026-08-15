import React, { useState } from 'react';

function Auth({ onLogin }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      if (!res.ok) throw new Error('Authentication failed');
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Welcome back</h2>
        <p style={{ textAlign: 'center', marginBottom: '32px' }}>Enter your details to continue</p>
        
        <form onSubmit={handleSubmit}>
          <div className="gd-field">
            <label>Name <span style={{color: 'var(--grad-orange)'}}>*</span></label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Jane Doe"
            />
          </div>
          <div className="gd-field">
            <label>Email <span style={{color: 'var(--grad-orange)'}}>*</span></label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="jane@example.com"
            />
          </div>
          
          {error && <div style={{ color: 'var(--grad-orange)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          
          <button type="submit" className="gd-btn gd-btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sign In / Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;
