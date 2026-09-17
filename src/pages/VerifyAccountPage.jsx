import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest, setToken, setUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import CanvasBackground from '../components/CanvasBackground';

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [emailForResend, setEmailForResend] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tokenFromUrl) {
      setStatus('error');
      setMessage('No verification token provided in URL. Please click the link sent to your email.');
      return;
    }

    async function verify() {
      try {
        const res = await apiRequest(`/auth/verify?token=${encodeURIComponent(tokenFromUrl)}`);
        if (res && res.token) {
          setToken(res.token);
          setUser(res.user);
          setStatus('success');
          setMessage('Your account has been successfully activated! Redirecting to your dashboard...');
          showToast('Account activated!', 'success');
          setTimeout(() => {
            navigate('/files');
          }, 2500);
        } else {
          setStatus('error');
          setMessage(res.error || 'Verification failed. The link may have expired.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Invalid or expired verification token.');
      }
    }

    verify();
  }, [tokenFromUrl, navigate, showToast]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!emailForResend) return;

    setResending(true);
    try {
      const res = await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email: emailForResend.trim() },
      });
      setResendSuccess(true);
      showToast('Activation link prepared!', 'success');
      if (res.verification_url) {
        setMessage(`New activation link: ${res.verification_url}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to resend activation link', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-layout">
      <CanvasBackground />
      <Header />

      <main className="auth-main">
        <div className="auth-card-wrap">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            {status === 'verifying' && (
              <div style={{ padding: '30px 10px' }}>
                <span className="spinner-lg" style={{ marginBottom: '20px' }} />
                <h1 className="auth-title" style={{ marginTop: '16px' }}>Activating Account</h1>
                <p className="auth-subtitle">Verifying your secure link and credentials...</p>
              </div>
            )}

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

            {status === 'error' && (
              <div style={{ padding: '10px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'rgba(255, 77, 109, 0.12)',
                    color: 'var(--red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '1px solid rgba(255, 77, 109, 0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="32" height="32">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>

                <h1 className="auth-title">Activation Failed</h1>
                <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                  {message}
                </p>

                {resendSuccess ? (
                  <div className="alert-box" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--cyan)', marginBottom: '20px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Check your email or click the link generated to activate your account.</span>
                  </div>
                ) : (
                  <form onSubmit={handleResend} style={{ marginTop: '20px', textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label htmlFor="resend-email">Enter your email to resend activation link</label>
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
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={resending}>
                      {resending ? 'Generating link...' : 'Resend Activation Link'}
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
