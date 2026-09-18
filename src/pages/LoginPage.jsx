import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';
import CaptchaWidget from '../components/CaptchaWidget';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [publicSettings, setPublicSettings] = useState(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/public-settings')
      .then((res) => {
        if (res?.settings) setPublicSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  const isCaptchaRequired =
    publicSettings?.captcha_provider &&
    publicSettings.captcha_provider !== 'disabled' &&
    publicSettings.captcha_on_login === '1' &&
    publicSettings.captcha_site_key;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isCaptchaRequired && !captchaToken) {
      setError('Please complete the security challenge before signing in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, captchaToken);
      showToast('Welcome back!', 'success');
      navigate('/files');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendActivation = async () => {
    if (!email) {
      showToast('Please enter your email above', 'error');
      return;
    }
    try {
      showToast('Dispatching activation email...', 'info');
      const res = await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email: email.trim() },
      });
      if (res && res.email_sent) {
        showToast('Activation email sent! Please check your inbox or spam folder.', 'success');
      } else if (res && res.verification_url) {
        showToast('Activation link prepared!', 'info');
        navigate(`/verify-account?token=${encodeURIComponent(res.verification_url.split('token=')[1] || '')}`);
      } else {
        showToast(res.message || 'If an unverified account exists, an email was sent.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to resend link', 'error');
    }
  };

  const isUnverifiedError = error && (error.toLowerCase().includes('activate') || error.toLowerCase().includes('verification'));

  return (
    <div className="auth-layout">
      <CanvasBackground />
      <Header />

      <main className="auth-main">
        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-card-header">
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-subtitle">Sign in to your private cloud storage dashboard</p>
            </div>

            {error && (
              <div className="alert-box error" style={{ marginBottom: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
                {isUnverifiedError && (
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '4px', fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    Resend Activation Link
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
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
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Bot & Abuse Captcha Shield */}
              {isCaptchaRequired && (
                <CaptchaWidget
                  provider={publicSettings.captcha_provider}
                  siteKey={publicSettings.captcha_site_key}
                  onVerify={(tok) => setCaptchaToken(tok)}
                  onExpire={() => setCaptchaToken('')}
                />
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-sm" /> Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="auth-card-footer">
              <span>Don't have an account?</span>{' '}
              <Link to="/register" className="auth-link">
                Create one now
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
