import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <Link to="/" className="site-header-logo">
        <div className="sidebar-logo-icon" style={{ width: '40px', height: '40px' }}>
          <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
            <path
              d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z"
              fill="url(#hdr-grad)"
            />
            <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95" />
            <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8" />
            <defs>
              <linearGradient id="hdr-grad" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00d4ff" />
                <stop offset="1" stopColor="#0077ff" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="site-header-brand">
          CamHost<span style={{ color: 'var(--cyan)' }}>.space</span>
        </span>
      </Link>

      <nav className="site-header-nav">
        <Link to="/features" className="crumb-item">Features</Link>
        <Link to="/preview" className="crumb-item">Explorer</Link>
        <Link to="/how-it-works" className="crumb-item">How It Works</Link>
        <Link to="/opensource" className="crumb-item">Open Source</Link>
        <Link to="/blog" className="crumb-item">Blog</Link>
      </nav>

      <div className="site-header-actions">
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

        {user ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-ghost btn-sm" style={{ color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ marginRight: '5px' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Admin
              </Link>
            )}
            <Link to="/files" className="btn btn-primary btn-sm">
              My Files
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
