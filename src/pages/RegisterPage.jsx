import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationInfo, setActivationInfo] = useState(null); // { url, token, email, emailSent }
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
          url: res.verification_url || '',
          token: res.token || '',
          email,
          emailSent: res.email_sent ?? true,
        });
        showToast('Account created! Verification email dispatched.', 'info');
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

  const handleResend = async () => {
    if (resending || resendCooldown > 0 || !activationInfo?.email) return;
    setResending(true);
    try {
      const res = await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email: activationInfo.email },
      });
      showToast('A fresh activation email has been dispatched! Check your inbox.', 'success');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast(err.message || 'Failed to resend activation email', 'error');
    } finally {
      setResending(false);
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
                    width: '68px',
                    height: '68px',
                    borderRadius: '22px',
                    background: 'rgba(0, 212, 255, 0.12)',
                    color: 'var(--cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '1px solid rgba(0, 212, 255, 0.25)',
                    boxShadow: '0 0 24px rgba(0, 212, 255, 0.15)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>

                <h1 className="auth-title">Check Your Email</h1>
                <p className="auth-subtitle" style={{ marginBottom: '22px', lineHeight: 1.6 }}>
                  An activation email has been dispatched from <strong>noreply@camhost.space</strong> to{' '}
                  <strong style={{ color: 'var(--text)' }}>{activationInfo.email}</strong>.
                </p>

                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    marginBottom: '22px',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--cyan)', fontSize: '0.95rem' }}>✓</span>
                    <span>Click the <strong>Activate My Account</strong> button in the email to activate your account.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--cyan)', fontSize: '0.95rem' }}>✓</span>
                    <span>Please check your <strong>Spam</strong> or <strong>Junk</strong> folder if you do not see it in a few minutes.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: 'var(--cyan)', fontSize: '0.95rem' }}>✓</span>
                    <span>The activation link will securely expire in <strong>24 hours</strong>.</span>
                  </div>
                </div>

                {/* Only display fallback direct link if email failed to send (development fallback) */}
                {(!activationInfo.emailSent && activationInfo.url) && (
                  <div
                    style={{
                      background: 'rgba(255, 170, 0, 0.08)',
                      border: '1px solid rgba(255, 170, 0, 0.25)',
                      borderRadius: '14px',
                      padding: '14px',
                      marginBottom: '20px',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--warning, #ffaa00)' }}>
                      Local Dev / Fallback Activation Link:
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
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {resendCooldown > 0
                      ? `Resend Email (${resendCooldown}s)`
                      : resending
                      ? 'Sending Email...'
                      : 'Resend Activation Email'}
                  </button>

                  <Link
                    to="/login"
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                  >
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
