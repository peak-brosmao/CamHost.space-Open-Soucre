import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import CanvasBackground from '../components/CanvasBackground';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      showToast('Welcome back!', 'success');
      navigate('/files');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <CanvasBackground />

      <header className="auth-header">
        <Link to="/" className="auth-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
              <path
                d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z"
                fill="url(#al-grad)"
              />
              <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95" />
              <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8" />
              <defs>
                <linearGradient id="al-grad" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00d4ff" />
                  <stop offset="1" stopColor="#0077ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-text">
            CamHost<span className="brand-sub">.space</span>
          </span>
        </Link>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your private cloud storage dashboard</p>
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
    </div>
  );
}
