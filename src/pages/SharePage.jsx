import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  apiRequest,
  formatBytes,
  relativeDate,
  formatDateTime,
  mimeInfo,
  API_BASE,
  downloadFile,
} from '../api/client';
import CanvasBackground from '../components/CanvasBackground';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

export default function SharePage() {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  // Report Modal state
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    reason: 'Malware, Virus, or Phishing',
    details: '',
    email: '',
    loading: false,
  });

  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

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

  const fileName = file ? file.file_name || file.original_name || file.name || 'Shared File' : 'Shared File';
  const fileSize = file ? file.file_size ?? file.size_bytes ?? file.size ?? 0 : 0;
  const downloads = file ? file.downloads ?? 0 : 0;

  // Handle file report submit
  const handleReportSubmit = async () => {
    if (!reportModal.reason) {
      showToast('Please select a reason for reporting', 'error');
      return;
    }
    setReportModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await apiRequest(`/share/${token}/report`, {
        method: 'POST',
        body: {
          reason: reportModal.reason,
          details: reportModal.details,
          email: reportModal.email,
        },
      });
      showToast(res.message || 'Report submitted. Our moderation team will review this file.', 'success');
      setReportModal({ isOpen: false, reason: 'Malware, Virus, or Phishing', details: '', email: '', loading: false });
    } catch (err) {
      showToast(err.message || 'Failed to submit report', 'error');
      setReportModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Share link copied to clipboard!', 'success');
  };

  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CanvasBackground />

      {/* Global Public Header */}
      <header
        style={{
          width: '100%',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--header-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00d4ff, #0077ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,212,255,0.3)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" width="18" height="18">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              CamHost<span style={{ color: 'var(--cyan)' }}>.space</span>
            </span>
          </Link>

          {/* Nav Links for Desktop */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <Link to="/features" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>
              Features
            </Link>
            <Link to="/preview" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>
              Explorer
            </Link>
            <Link to="/how-it-works" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>
              How It Works
            </Link>
            <Link to="/opensource" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>
              Open Source
            </Link>
            <Link to="/blog" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500, textDecoration: 'none' }}>
              Blog
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div className="auth-card" style={{ maxWidth: '540px', width: '100%', position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <span className="spinner-lg" />
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Retrieving shared file...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
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
              {/* File Status Tag */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(0, 212, 255, 0.12)',
                    color: 'var(--cyan)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginBottom: '14px',
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
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    wordBreak: 'break-word',
                    marginBottom: '6px',
                    color: 'var(--text)',
                    lineHeight: '1.4',
                  }}
                >
                  {fileName}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  Uploaded on {formatDateTime(file.created_at)}
                </p>
              </div>

              {/* File Specs Box */}
              <div
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
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
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.mime_type || 'Generic Document'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formatBytes(fileSize)}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ opacity: 0.7 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {file.download_limit
                      ? `${downloads} / ${file.download_limit} downloads`
                      : `${downloads} ${downloads === 1 ? 'download' : 'downloads'}`}
                  </span>
                </div>
              </div>

              {/* Direct Download Action */}
              <button
                type="button"
                onClick={async () => {
                  setDownloading(true);
                  try {
                    await downloadFile(`/share/${token}/download`, fileName);
                    setFile((prev) => (prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : prev));
                  } catch (err) {
                    showToast(err.message || 'Download failed', 'error');
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading || (Boolean(file.download_limit) && downloads >= file.download_limit)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  fontSize: '0.96rem',
                  boxShadow: '0 4px 18px rgba(0, 212, 255, 0.28)',
                }}
              >
                {downloading ? (
                  <>
                    <span className="spinner-sm" /> Downloading from CamHost...
                  </>
                ) : Boolean(file.download_limit) && downloads >= file.download_limit ? (
                  <>
                    Download Limit Reached ({file.download_limit}/{file.download_limit})
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download File ({formatBytes(fileSize)})
                  </>
                )}
              </button>

              {/* Utility actions: Copy Link & Report File */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={copyShareLink}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Copy Link
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm danger"
                  onClick={() => setReportModal({ isOpen: true, reason: 'Malware, Virus, or Phishing', details: '', email: '', loading: false })}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  Report File
                </button>
              </div>

              {/* Safe storage guarantee banner */}
              <div
                style={{
                  marginTop: '22px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border)',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="14" height="14">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Distributed Telegram Cloud Storage · Free & Unlimited
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Public Footer */}
      <footer
        style={{
          width: '100%',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: '36px 24px 24px',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                CamHost<span style={{ color: 'var(--cyan)' }}>.space</span>
              </span>
            </div>
            <p style={{ lineHeight: '1.6', fontSize: '0.82rem' }}>
              Decentralized, infinite cloud storage powered by Telegram infrastructure. Zero subscriptions, pure speed.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--text)', fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Platform
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/features" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Features</Link>
              <Link to="/preview" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Interactive Explorer</Link>
              <Link to="/how-it-works" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How It Works</Link>
              <Link to="/upload" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Upload Files</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text)', fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Developers
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/opensource" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Open Source Repo</Link>
              <a href="https://github.com/peak-brosmao/CamHost.space-Open-Soucre" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                GitHub Repository
              </a>
              <Link to="/blog" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Engineering Blog</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text)', fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Trust & Safety
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setReportModal({ isOpen: true, reason: 'Malware, Virus, or Phishing', details: '', email: '', loading: false })}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Report File / Abuse
              </button>
              <span>DMCA & Copyright Compliance</span>
              <span>Encrypted Telegram Protocol</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1100px',
            margin: '28px auto 0',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.78rem',
          }}
        >
          <span>© {new Date().getFullYear()} CamHost.space · Developed by PEAK BROSMAO</span>
          <span>All rights reserved · Powered by Telegram Cloud Backplane</span>
        </div>
      </footer>

      {/* Report File Modal */}
      <Modal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal({ isOpen: false, reason: 'Malware, Virus, or Phishing', details: '', email: '', loading: false })}
        title="Report File / Policy Violation"
        confirmText="Submit Report"
        confirmVariant="danger"
        onConfirm={handleReportSubmit}
        loading={reportModal.loading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
          <p style={{ color: 'var(--text)', margin: 0 }}>
            You are submitting a safety report for <strong>{fileName}</strong>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
            CamHost.space prohibits malware, viruses, copyright infringement, child exploitation, and phishing.
          </p>

          <div className="form-group">
            <label htmlFor="report-reason" style={{ fontWeight: 600, color: 'var(--text)' }}>
              Violation Category
            </label>
            <select
              id="report-reason"
              className="select-field"
              style={{ width: '100%', marginTop: '6px' }}
              value={reportModal.reason}
              onChange={(e) => setReportModal((prev) => ({ ...prev, reason: e.target.value }))}
            >
              <option value="Malware, Virus, or Phishing">Malware, Virus, or Phishing</option>
              <option value="Copyright / DMCA Violation">Copyright / DMCA Violation</option>
              <option value="Illegal / Inappropriate Content">Illegal or Prohibited Material</option>
              <option value="Spam or Unsolicited Distribution">Spam or Unsolicited Distribution</option>
              <option value="Harassment or Impersonation">Harassment or Impersonation</option>
              <option value="Other">Other Policy Violation</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="report-details" style={{ fontWeight: 600, color: 'var(--text)' }}>
              Additional Details (Optional)
            </label>
            <textarea
              id="report-details"
              className="input-field"
              rows={3}
              placeholder="Describe the issue or provide proof/links to help our moderators..."
              value={reportModal.details}
              onChange={(e) => setReportModal((prev) => ({ ...prev, details: e.target.value }))}
              style={{ resize: 'vertical', marginTop: '6px' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="report-email" style={{ fontWeight: 600, color: 'var(--text)' }}>
              Your Contact Email (Optional)
            </label>
            <input
              id="report-email"
              type="email"
              className="input-field"
              placeholder="contact@yourdomain.com"
              value={reportModal.email}
              onChange={(e) => setReportModal((prev) => ({ ...prev, email: e.target.value }))}
              style={{ marginTop: '6px' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
