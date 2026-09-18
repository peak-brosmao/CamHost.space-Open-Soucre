import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';
import CaptchaWidget from '../components/CaptchaWidget';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationInfo, setActivationInfo] = useState(null); // { url, token, email, emailSent }
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState('');
  const [publicSettings, setPublicSettings] = useState(null);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/public-settings')
      .then((res) => {
        if (res?.settings) setPublicSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  const isRegistrationAllowed = publicSettings?.allow_registration !== '0';

  const isCaptchaRequired =
    publicSettings?.captcha_provider &&
    publicSettings.captcha_provider !== 'disabled' &&
    publicSettings.captcha_on_register === '1' &&
    publicSettings.captcha_site_key;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRegistrationAllowed) {
      setError('Registration is currently closed by system administrator.');
      return;
    }

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

    if (isCaptchaRequired && !captchaToken) {
      setError('Please complete the security challenge before registering');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await register(email, password, confirmPassword, captchaToken);
      if (res && res.requires_verification) {
        setActivationInfo({
          url: res.verification_url || '',
          token: res.token || '',
          email,
          emailSent: res.email_sent ?? true,
        });
        showToast('Account created! Verification email dispatched.', 'info');
      } else {
        showToast(res.message || 'Account created successfully!', 'success');
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
              <div className="activation-pending">
                <div className="activation-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" style={{ color: '#00d4ff' }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>

                <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>Verify Your Email</h1>
                <p className="auth-subtitle" style={{ marginTop: '8px', lineHeight: 1.6 }}>
                  We sent an activation link to <strong style={{ color: 'var(--text)' }}>{activationInfo.email}</strong>.
                  Please click the link in your email to activate your account.
                </p>

                {activationInfo.emailSent ? (
                  <div className="email-sent-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Activation email dispatched from noreply@camhost.space
                  </div>
                ) : (
                  <div className="email-sent-badge warning" style={{ background: 'rgba(255, 171, 46, 0.1)', borderColor: 'rgba(255, 171, 46, 0.3)', color: '#ffab2e' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    SMTP mailer pending. Direct link provided below:
                  </div>
                )}

                {activationInfo.url && (
                  <div className="direct-link-card">
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Direct activation link:</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={activationInfo.url}
                        className="input-field"
                        style={{ fontSize: '0.78rem', padding: '6px 10px', height: 'auto', background: 'rgba(0,0,0,0.3)' }}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        onClick={copyActivationLink}
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0, padding: '6px 12px' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                  {activationInfo.token && (
                    <Link
                      to={`/verify-account?token=${encodeURIComponent(activationInfo.token)}`}
                      className="btn btn-primary"
                      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                    >
                      Activate Account Now
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                  >
                    {resendCooldown > 0
                      ? `Resend Email (${resendCooldown}s)`
                      : resending
                      ? 'Sending Email...'
                      : 'Resend Activation Email'}
                  </button>

                  <Link
                    to="/login"
                    className="btn btn-secondary"
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

                {!isRegistrationAllowed && (
                  <div className="alert-box warning" style={{ marginBottom: '20px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Public registrations are temporarily closed by system administrator.</span>
                  </div>
                )}

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
                      disabled={!isRegistrationAllowed}
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
                      disabled={!isRegistrationAllowed}
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
                      disabled={!isRegistrationAllowed}
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Bot & Abuse Captcha Shield */}
                  {isCaptchaRequired && isRegistrationAllowed && (
                    <CaptchaWidget
                      provider={publicSettings.captcha_provider}
                      siteKey={publicSettings.captcha_site_key}
                      onVerify={(tok) => setCaptchaToken(tok)}
                      onExpire={() => setCaptchaToken('')}
                    />
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px' }}
                    disabled={loading || !isRegistrationAllowed}
                  >
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
