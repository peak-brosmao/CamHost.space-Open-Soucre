import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationInfo, setActivationInfo] = useState(null); // { url, token, email }

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await register(email, password, confirmPassword);
      if (res && res.requires_verification) {
        setActivationInfo({
          url: res.verification_url,
          token: res.token,
          email,
        });
        showToast('Account created! Activation required.', 'info');
      } else {
        showToast('Account created successfully!', 'success');
        navigate('/files');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyActivationLink = () => {
    if (!activationInfo?.url) return;
    navigator.clipboard.writeText(activationInfo.url);
    showToast('Activation link copied to clipboard!', 'success');
  };

  return (
    <div className="auth-layout">
      <CanvasBackground />
      <Header />

      <main className="auth-main">
        <div className="auth-card-wrap">
          <div className="auth-card">
            {activationInfo ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(0, 212, 255, 0.12)',
                    color: 'var(--cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '1px solid rgba(0, 212, 255, 0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>

                <h1 className="auth-title">Verify Your Account</h1>
                <p className="auth-subtitle" style={{ marginBottom: '20px' }}>
                  To protect your cloud storage from automated bots, an activation link has been generated for{' '}
                  <strong>{activationInfo.email}</strong>.
                </p>

                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '20px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Your Activation Link:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      readOnly
                      value={activationInfo.url}
                      className="input-field"
                      style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={copyActivationLink}>
                      Copy
                    </button>
                  </div>
                </div>

                <a
                  href={activationInfo.url}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                  Activate Account Now
                </a>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <Link to="/login" className="auth-link">
                    Already activated? Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="auth-card-header">
                  <h1 className="auth-title">Create an Account</h1>
                  <p className="auth-subtitle">Get private unlimited cloud storage for your files</p>
                </div>

                {error && (
                  <div className="alert-box error" style={{ marginBottom: '20px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="reg-email">Email Address</label>
                    <input
                      id="reg-email"
                      type="email"
                      className="input-field"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-password">Password</label>
                    <input
                      id="reg-password"
                      type="password"
                      className="input-field"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-confirm">Confirm Password</label>
                    <input
                      id="reg-confirm"
                      type="password"
                      className="input-field"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-sm" /> Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                <div className="auth-card-footer">
                  <span>Already have an account?</span>{' '}
                  <Link to="/login" className="auth-link">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
