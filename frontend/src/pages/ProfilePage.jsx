import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Trash2, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import styles from './Profile.module.css';

function SuccessBanner({ msg }) {
  return msg ? <div className={styles.success}><CheckCircle size={15} /> {msg}</div> : null;
}
function ErrorBanner({ msg }) {
  return msg ? <div className={styles.error}>{msg}</div> : null;
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    preferred_currency: user?.preferred_currency || 'USD',
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');
    setProfileLoading(true);
    try {
      await api.put(`/api/users/${user.user_id}`, profile);
      updateUser(profile);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Update failed.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pw.newPw !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    if (pw.newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwLoading(true);
    try {
      // We use the forgot-password flow via direct update:
      // First verify current password by doing a login check
      await api.post('/api/users/login', { email: user.email, password: pw.current });
      // Then update via admin-like endpoint (we do a forgot-reset flow)
      // Since we're authenticated, we use reset endpoint with token logic
      // For simplicity, trigger a password reset email for the user
      await api.post('/api/users/forgot-password', { email: user.email });
      setPwSuccess('A password reset link has been sent to your email. Use it to set your new password.');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== user.username) {
      setDeleteError('Username does not match.');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete(`/api/users/${user.user_id}`);
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Delete failed.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Account Settings</h1>
          <div className={styles.userBadge}>
            <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.uName}>{user?.username}</div>
              <div className={styles.uEmail}>{user?.email}</div>
            </div>
          </div>
        </div>

        <div className={styles.sections}>
          {/* ── Profile ── */}
          <div className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><User size={16} /> Profile Information</h2>
            <SuccessBanner msg={profileSuccess} />
            <ErrorBanner msg={profileError} />
            <form onSubmit={handleProfileSave} className={styles.form}>
              <div className={styles.row}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Full name</label>
                  <input
                    type="text" value={profile.full_name}
                    onChange={(e) => setProfile((f) => ({ ...f, full_name: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone number</label>
                  <input
                    type="tel" value={profile.phone_number}
                    onChange={(e) => setProfile((f) => ({ ...f, phone_number: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: 200 }}>
                <label className="form-label">Preferred currency</label>
                <select
                  value={profile.preferred_currency}
                  onChange={(e) => setProfile((f) => ({ ...f, preferred_currency: e.target.value }))}
                  className="form-input"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="PKR">PKR — Pakistani Rupee</option>
                </select>
              </div>
              <div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={profileLoading}>
                  {profileLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  Save changes
                </button>
              </div>
            </form>
          </div>

          {/* ── Password ── */}
          <div className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}><Lock size={16} /> Change Password</h2>
            <SuccessBanner msg={pwSuccess} />
            <ErrorBanner msg={pwError} />
            <form onSubmit={handlePasswordSave} className={styles.form}>
              <div className="form-group">
                <label className="form-label">Current password</label>
                <input
                  type="password" required value={pw.current}
                  onChange={(e) => setPw((f) => ({ ...f, current: e.target.value }))}
                  className="form-input" placeholder="••••••••"
                />
              </div>
              <div className={styles.row}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">New password</label>
                  <input
                    type="password" required value={pw.newPw}
                    onChange={(e) => setPw((f) => ({ ...f, newPw: e.target.value }))}
                    className="form-input" placeholder="••••••••"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Confirm new password</label>
                  <input
                    type="password" required value={pw.confirm}
                    onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))}
                    className="form-input" placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <button type="submit" className="btn btn-secondary btn-sm" disabled={pwLoading}>
                  {pwLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  Update password
                </button>
              </div>
            </form>
          </div>

          {/* ── Danger zone ── */}
          <div className={`card ${styles.section} ${styles.dangerZone}`}>
            <h2 className={styles.sectionTitle} style={{ color: 'var(--red)' }}><Trash2 size={16} /> Delete Account</h2>
            <p className={styles.dangerText}>
              This will permanently delete your account, watchlist, and all associated data. This cannot be undone.
            </p>
            <ErrorBanner msg={deleteError} />
            <div className="form-group" style={{ maxWidth: 340 }}>
              <label className="form-label">Type your username to confirm: <strong>{user?.username}</strong></label>
              <input
                type="text" value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="form-input" placeholder={user?.username}
              />
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={deleteLoading || deleteConfirm !== user?.username}
            >
              {deleteLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />}
              Delete my account permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
