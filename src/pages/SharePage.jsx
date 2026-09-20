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
import Header from '../components/Header';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import AdBanner from '../components/AdBanner';

export default function SharePage() {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadAd, setDownloadAd] = useState('');

  // Report Modal state
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    reason: 'Malware, Virus, or Phishing',
    details: '',
    email: '',
    loading: false,
  });

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

    apiRequest('/public-settings')
      .then((res) => {
        if (res?.settings?.ad_download_code?.trim()) {
          setDownloadAd(res.settings.ad_download_code.trim());
        }
      })
      .catch(() => {});
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
    setCopied(true);
    showToast('Share link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFile(`/share/${token}/download`, fileName);
      setFile((prev) => (prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : prev));
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Get file extension for display
  const fileExt = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '?';
  const info = file ? mimeInfo(file.mime_type || '') : { label: 'FILE', color: '#888', bg: 'rgba(136,136,136,0.12)' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <CanvasBackground />

      <Header />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', zIndex: 1 }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: 'var(--cyan)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Retrieving shared file...</p>
          </div>
        ) : error ? (
          <div style={{
            maxWidth: '460px', width: '100%', textAlign: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '24px', padding: '48px 32px',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'rgba(255, 77, 109, 0.1)', color: '#ff4d6d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '2rem',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text)' }}>File Unavailable</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: '1.6' }}>{error}</p>
            <Link to="/" className="btn btn-primary" style={{ padding: '12px 28px' }}>
              Back to Home
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: '520px', width: '100%' }}>

            {/* File Card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,212,255,0.06)',
            }}>

              {/* Gradient accent top bar */}
              <div style={{
                height: '4px',
                background: 'linear-gradient(90deg, #00d4ff, #7928ca, #ff0080)',
                borderRadius: '24px 24px 0 0',
              }} />

              <div style={{ padding: '32px 28px 28px' }}>

                {/* File icon + name section */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', marginBottom: '24px' }}>

                  {/* Large file type icon */}
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0,
                    background: info.bg, color: info.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em',
                    border: `1px solid ${info.color}22`,
                  }}>
                    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22" style={{ marginBottom: '2px' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div style={{ fontSize: '0.6rem' }}>{fileExt.length > 5 ? info.label : fileExt}</div>
                    </div>
                  </div>

                  {/* File name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{
                      fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)',
                      lineHeight: 1.35, wordBreak: 'break-word', margin: '0 0 6px',
                    }}>
                      {fileName}
                    </h1>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 10px', borderRadius: '8px',
                      background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)',
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      SHARED FILE
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1px', background: 'var(--border)', borderRadius: '14px',
                  overflow: 'hidden', marginBottom: '24px',
                }}>
                  {[
                    {
                      label: 'Size',
                      value: formatBytes(fileSize),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
                    },
                    {
                      label: 'Downloads',
                      value: file.download_limit ? `${downloads}/${file.download_limit}` : `${downloads}`,
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
                    },
                    {
                      label: 'Uploaded',
                      value: formatDateTime(file.created_at),
                      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                    },
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      background: 'var(--surface)', padding: '14px 12px', textAlign: 'center',
                    }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {item.icon}
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Download button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || (Boolean(file.download_limit) && downloads >= file.download_limit)}
                  className="btn btn-primary"
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    gap: '10px', padding: '15px 20px', fontSize: '0.96rem', fontWeight: 700,
                    borderRadius: '14px',
                    boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {downloading ? (
                    <>
                      <span className="spinner-sm" /> Downloading...
                    </>
                  ) : Boolean(file.download_limit) && downloads >= file.download_limit ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Download Limit Reached
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download File
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 500, opacity: 0.8,
                        background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px',
                      }}>
                        {formatBytes(fileSize)}
                      </span>
                    </>
                  )}
                </button>

                {/* Secondary actions row */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={copyShareLink}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      borderRadius: '12px', padding: '10px 14px',
                    }}
                  >
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" width="14" height="14">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Copy Link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setReportModal({ isOpen: true, reason: 'Malware, Virus, or Phishing', details: '', email: '', loading: false })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      borderRadius: '12px', padding: '10px 14px', color: 'var(--text-muted)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                    Report
                  </button>
                </div>

              </div>
            </div>

            {/* Trust badge below card */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
              marginTop: '20px', fontSize: '0.76rem', color: 'var(--text-muted)',
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" width="13" height="13">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Secure Cloud Storage
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" width="13" height="13">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Powered by Telegram
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" width="13" height="13">
                  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                </svg>
                Free & Unlimited
              </span>
            </div>

            {/* Download Page Banner Ad Unit */}
            {downloadAd && (
              <div style={{ marginTop: '24px', width: '100%', maxWidth: '640px' }}>
                <AdBanner htmlCode={downloadAd} />
              </div>
            )}

          </div>
        )}
      </main>

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

      {/* Footer (same as Landing Page) */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 6%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <a href="https://github.com/peak-brosmao/CamHost.space-Open-Soucre" target="_blank" rel="noopener" className="crumb-item">GitHub</a>
          <span>&middot;</span>
          <Link to="/login" className="crumb-item">Sign In</Link>
          <span>&middot;</span>
          <Link to="/register" className="crumb-item">Sign Up</Link>
          <span>&middot;</span>
          <Link to="/files" className="crumb-item">My Files</Link>
          <span>&middot;</span>
          <span>&copy; 2026 CamHost.space</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Developed by <a href="https://peakbrosmao.me" target="_blank" rel="noopener" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none' }}>PEAK BROSMAO</a>
        </div>
      </footer>
    </div>
  );
}
