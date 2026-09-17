import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, formatBytes, relativeDate, mimeInfo, API_BASE, downloadFile } from '../api/client';
import CanvasBackground from '../components/CanvasBackground';
import { useTheme } from '../context/ThemeContext';

export default function SharePage() {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function loadSharedFile() {
      try {
        const res = await apiRequest(`/share/${token}`);
        if (res && res.file) {
          setFile(res.file);
        } else {
          setError('File not found or sharing has been disabled.');
        }
      } catch (err) {
        setError(err.message || 'File not found or link has expired.');
      } finally {
        setLoading(false);
      }
    }
    loadSharedFile();
  }, [token]);

  const downloadUrl = `${API_BASE}/share/${token}/download`;

  return (
    <div className="auth-page">
      <CanvasBackground />

      <header className="auth-header">
        <Link to="/" className="auth-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
              <path
                d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z"
                fill="url(#sp-grad)"
              />
              <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95" />
              <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8" />
              <defs>
                <linearGradient id="sp-grad" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse">
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
        <div className="auth-card" style={{ maxWidth: '520px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <span className="spinner-lg" />
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Retrieving shared file...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(255, 77, 109, 0.12)',
                  color: '#ff4d6d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>File Unavailable</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px' }}>{error}</p>
              <Link to="/" className="btn btn-secondary">
                Back to Home
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Public Shared File
                </span>
                <h1
                  style={{
                    fontSize: '1.28rem',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                    marginBottom: '8px',
                    color: 'var(--text)',
                  }}
                >
                  {file.file_name}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                  Uploaded {relativeDate(file.created_at)}
                </p>
              </div>

              {/* File Specs Box */}
              <div
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {(() => {
                    const info = mimeInfo(file.mime_type || '');
                    return (
                      <span
                        className="file-badge-sm"
                        style={{ background: info.bg, color: info.color }}
                      >
                        {info.label}
                      </span>
                    );
                  })()}
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                      {file.mime_type || 'Generic Document'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formatBytes(file.file_size)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Download Action */}
              <button
                type="button"
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadFile(`/share/${token}/download`, file.file_name);
                  } catch (err) {
                    alert(err.message || 'Download failed');
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  fontSize: '0.96rem',
                }}
              >
                {downloading ? (
                  <>
                    <span className="spinner-sm" /> Downloading from CamHost...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download File ({formatBytes(file.file_size)})
                  </>
                )}
              </button>

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border)',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                }}
              >
                Hosted privately on{' '}
                <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  CamHost.space
                </Link>
                {' · '}
                Free Telegram Cloud Storage
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
