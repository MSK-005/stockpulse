import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import api from '../lib/api';
import styles from './Auth.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/users/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.logoMark}><TrendingUp size={28} strokeWidth={2.5} /></div>
        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.subtitle}>We'll send a reset link to your email</p>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {sent && (
          <div className={styles.successBanner}>
            Check your inbox. If that email exists, a reset link has been sent.
          </div>
        )}

        {!sent && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="form-input" placeholder="you@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Send reset link'}
            </button>
          </form>
        )}

        <p className={styles.switchText}>
          <Link to="/login" className={styles.switchLink}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/users/reset-password', { token, password: form.password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.logoMark}><TrendingUp size={28} strokeWidth={2.5} /></div>
        <h1 className={styles.title}>New password</h1>
        <p className={styles.subtitle}>Choose a strong password</p>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success ? (
          <>
            <div className={styles.successBanner}>Password reset successfully!</div>
            <p className={styles.switchText} style={{ marginTop: 16 }}>
              <Link to="/login" className={styles.switchLink}>Sign in with new password →</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <input
                type="password" required value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="form-input" placeholder="Min. 8 chars, 1 uppercase, 1 number"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                type="password" required value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                className="form-input" placeholder="Repeat password"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
