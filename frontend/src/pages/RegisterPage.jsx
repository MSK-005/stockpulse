import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', password: '', full_name: '', phone_number: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const fieldErrors = {};
        data.errors.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
      } else {
        setServerError(data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel} style={{ maxWidth: 440 }}>
        <div className={styles.logoMark}>
          <TrendingUp size={28} strokeWidth={2.5} />
        </div>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Start tracking the US market</p>

        {serverError && <div className={styles.errorBanner}>{serverError}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Username</label>
              <input
                name="username" required autoComplete="username"
                value={form.username} onChange={handleChange}
                className="form-input" placeholder="johndoe"
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Full name</label>
              <input
                name="full_name"
                value={form.full_name} onChange={handleChange}
                className="form-input" placeholder="John Doe"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              name="email" type="email" required autoComplete="email"
              value={form.email} onChange={handleChange}
              className="form-input" placeholder="you@example.com"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={styles.passWrap}>
              <input
                name="password" type={showPass ? 'text' : 'password'} required
                value={form.password} onChange={handleChange}
                className="form-input" placeholder="Min. 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              name="phone_number" type="tel"
              value={form.phone_number} onChange={handleChange}
              className="form-input" placeholder="+1 555 000 0000"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Create account'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
