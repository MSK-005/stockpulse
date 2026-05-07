import { useState } from 'react';
import { apiFetch } from '../utils/api';

const API = process.env.REACT_APP_NODE_API || 'http://localhost:3001/api';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await apiFetch('/users/login', {
          method: 'POST',
          body: JSON.stringify({ email, password: pass }),
        });
        localStorage.setItem('sp_token', data.token);
        onLogin({ name: data.full_name || data.username, email: data.email, id: data.user_id, token: data.token });
      } else {
        const res = await apiFetch('/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username || email.split('@')[0], email, password: pass, full_name: name, phone_number: '' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        // Auto-login
        const loginRes = await apiFetch('/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error('Registered! Please sign in.');
        localStorage.setItem('sp_token', loginData.token);
        onLogin({ name: loginData.full_name || loginData.username, email: loginData.email, id: loginData.user_id, token: loginData.token });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="grid-overlay" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">SP</div>
          <div className="logo-text">Stock<span>Pulse</span></div>
        </div>
        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-sub">
          {mode === 'login' ? 'Sign in to your alpha detection platform' : 'Join thousands of traders spotting moves early'}
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳ Please wait...' : (mode === 'login' ? '→ Sign In' : '→ Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <a style={{ cursor: 'pointer' }} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </a>
        </div>
      </div>
    </div>
  );
}
