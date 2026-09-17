import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, setToken, setUser } from '../api/client';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [status, setStatus] = useState(tokenFromUrl ? 'verifying' : 'idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [emailForResend, setEmailForResend] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Execute verification with a token
  const runVerification = async (tok) => {
    if (!tok) return;
    setStatus('verifying');
    setMessage('Verifying your credentials and activating cloud storage...');

    try {
      const res = await apiRequest(`/auth/verify?token=${encodeURIComponent(tok.trim())}`);
      if (res && res.token) {
        setToken(res.token);
        setUser(res.user);
        setStatus('success');
        setMessage('Your account has been successfully activated! Redirecting to your dashboard...');
        showToast('Account activated successfully!', 'success');
        setTimeout(() => {
          navigate('/files');
        }, 2200);
      } else {
        setStatus('error');
        setMessage(res.error || 'Verification failed. The link may have expired or is invalid.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Invalid or expired verification token.');
      showToast(err.message || 'Verification failed', 'error');
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      runVerification(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  // Handle manual token submission
  const handleManualTokenSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    runVerification(manualToken);
  };

  // Handle Resend Link / Email Dispatch
  const handleResend = async (e) => {
    e.preventDefault();
    if (!emailForResend.trim()) return;

    setLoadingAction(true);
    try {
      const res = await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email: emailForResend.trim() },
      });
      setResendSuccess(true);
      showToast(res.message || 'Activation link sent to your email!', 'success');
      if (res.verification_url) {
        setGeneratedLink(res.verification_url);
      }
    } catch (err) {
      showToast(err.message || 'Failed to send activation email', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="auth-layout">
      <CanvasBackground />
      <Header />

      <main className="auth-main">
        <div className="auth-card-wrap">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            
            {/* 1. VERIFYING STATE */}
            {status === 'verifying' && (
              <div style={{ padding: '30px 10px' }}>
                <span className="spinner-lg" style={{ marginBottom: '20px' }} />
                <h1 className="auth-title" style={{ marginTop: '16px' }}>Activating Account</h1>
                <p className="auth-subtitle">Verifying your secure link with CamHost.space...</p>
              </div>
            )}

            {/* 2. SUCCESS STATE */}
            {status === 'success' && (
              <div style={{ padding: '20px 10px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(0, 224, 139, 0.12)',
                    color: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '1px solid rgba(0, 224, 139, 0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <h1 className="auth-title">Account Activated</h1>
                <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                  {message}
                </p>

                <Link to="/files" className="btn btn-primary" style={{ width: '100%' }}>
                  Go to My Files
                </Link>
              </div>
            )}

            {/* 3. IDLE OR ERROR STATE (User landed directly or token was invalid) */}
            {(status === 'idle' || status === 'error') && (
              <div style={{ padding: '10px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: status === 'error' ? 'rgba(255, 77, 109, 0.12)' : 'rgba(0, 212, 255, 0.12)',
                    color: status === 'error' ? 'var(--red)' : 'var(--cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: status === 'error' ? '1px solid rgba(255, 77, 109, 0.25)' : '1px solid rgba(0, 212, 255, 0.25)',
                  }}
                >
                  {status === 'error' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                </div>

                <h1 className="auth-title">
                  {status === 'error' ? 'Activation Link Expired' : 'Activate Your Account'}
                </h1>
                <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                  {status === 'error'
                    ? message
                    : 'To start uploading files, enter your verification code or request an activation link to your email.'}
                </p>

                {/* Form A: Enter Token Directly */}
                <form onSubmit={handleManualTokenSubmit} style={{ textAlign: 'left', marginBottom: '24px' }}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label htmlFor="token-input" style={{ fontSize: '0.85rem' }}>Paste Verification Token</label>
                    <input
                      id="token-input"
                      type="text"
                      className="input-field"
                      placeholder="e.g. 4a8b7c6d5e... or full link"
                      value={manualToken}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('token=')) {
                          const extracted = val.split('token=')[1].split('&')[0];
                          setManualToken(extracted);
                        } else {
                          setManualToken(val);
                        }
                      }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Activate Account Now
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Or Resend Email
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                {/* Form B: Resend Email via Hostinger SMTP */}
                {resendSuccess ? (
                  <div style={{ textAlign: 'left', padding: '16px', borderRadius: '12px', background: 'rgba(0, 224, 139, 0.08)', border: '1px solid rgba(0, 224, 139, 0.25)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Activation Email Sent!
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                      We dispatched a verification email from <strong>noreply@camhost.space</strong> to your inbox. Please check your spam or junk folder if you don't see it within 1 minute.
                    </p>
                    {generatedLink && (
                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={generatedLink}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', textAlign: 'center', display: 'block' }}
                        >
                          Click Here to Activate Directly
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label htmlFor="resend-email" style={{ fontSize: '0.85rem' }}>Send link to email</label>
                      <input
                        id="resend-email"
                        type="email"
                        className="input-field"
                        placeholder="you@example.com"
                        value={emailForResend}
                        onChange={(e) => setEmailForResend(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={loadingAction}>
                      {loadingAction ? 'Sending from noreply@camhost.space...' : 'Send Activation Email'}
                    </button>
                  </form>
                )}

                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <Link to="/login" className="auth-link">
                    Back to Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
