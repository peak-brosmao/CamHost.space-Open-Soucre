import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { formatBytes, mimeInfo } from '../api/client';

const DEMO_FILES = [
  { id: 1, name: 'Hola-Setup.exe', size: 4833935, mime: 'application/x-dosexec', folder: 'Software', date: '2026-09-17T14:30:00Z', downloads: 14, shared: true },
  { id: 2, name: 'Cambodia-Landscape-4K.mp4', size: 1468006400, mime: 'video/mp4', folder: 'Media', date: '2026-09-17T11:20:00Z', downloads: 38, shared: true },
  { id: 3, name: 'Quarterly-Financial-Report-2026.pdf', size: 3840200, mime: 'application/pdf', folder: 'Documents', date: '2026-09-16T18:45:00Z', downloads: 5, shared: false },
  { id: 4, name: 'Production-Backup-v2.4.tar.gz', size: 852000000, mime: 'application/gzip', folder: 'Archives', date: '2026-09-16T09:12:00Z', downloads: 2, shared: false },
  { id: 5, name: 'Client-Design-System-Assets.zip', size: 503316480, mime: 'application/zip', folder: 'Archives', date: '2026-09-15T15:00:00Z', downloads: 27, shared: true },
  { id: 6, name: 'Acoustic-Guitar-Master-Track.wav', size: 94371840, mime: 'audio/wav', folder: 'Media', date: '2026-09-14T20:10:00Z', downloads: 11, shared: true },
  { id: 7, name: 'Ubuntu-26.04-Server-LTS.iso', size: 1980000000, mime: 'application/octet-stream', folder: 'Software', date: '2026-09-14T08:05:00Z', downloads: 64, shared: true },
  { id: 8, name: 'Company-Overview-Deck.pptx', size: 18450000, mime: 'application/vnd.ms-powerpoint', folder: 'Documents', date: '2026-09-13T16:40:00Z', downloads: 9, shared: false },
];

export default function ExplorerPage() {
  const [activeFolder, setActiveFolder] = useState('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedFile, setSelectedFile] = useState(null);

  const folders = ['All', 'Software', 'Media', 'Documents', 'Archives'];

  const filtered = DEMO_FILES.filter((f) => {
    const matchFolder = activeFolder === 'All' || f.folder === activeFolder;
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1140px', margin: '0 auto', width: '100%', padding: '40px 20px 80px' }}>
        {/* Banner */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
            Interactive Demo
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Live Cloud Explorer
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '580px', margin: '0 auto' }}>
            Experience CamHost’s ultra-fast dashboard interface before signing up. Try organizing folders, searching, and viewing file specs.
          </p>
        </div>

        {/* Explorer Chrome / Frame */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}
        >
          {/* Mock Window Topbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
              <span style={{ marginLeft: '12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                CamHost Drive Explorer &middot; Preview Mode
              </span>
            </div>

            <Link to="/register" className="btn btn-primary btn-sm">
              Create My Drive
            </Link>
          </div>

          {/* Controls Bar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {folders.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={`folder-chip ${activeFolder === f ? 'active' : ''}`}
                >
                  {f === 'All' ? 'All Files' : f}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="search-box" style={{ width: '220px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter demo files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Files Content Area */}
          <div style={{ padding: '20px', minHeight: '360px' }}>
            {viewMode === 'grid' ? (
              <div className="files-grid">
                {filtered.map((f) => {
                  const info = mimeInfo(f.mime);
                  return (
                    <div
                      key={f.id}
                      className="file-card"
                      onClick={() => setSelectedFile(f)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="file-card-preview">
                        <span
                          className="file-badge"
                          style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}40` }}
                        >
                          {info.label}
                        </span>
                        {f.shared && (
                          <span className="shared-badge">Shared</span>
                        )}
                      </div>
                      <div className="file-card-info">
                        <div className="file-card-name" title={f.name}>
                          {f.name}
                        </div>
                        <div className="file-card-meta">
                          <span>{formatBytes(f.size)}</span>
                          <span>{f.downloads} dls</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th>Downloads</th>
                      <th>Folder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => {
                      const info = mimeInfo(f.mime);
                      return (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedFile(f)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="file-badge-sm" style={{ background: info.bg, color: info.color }}>
                                {info.label}
                              </span>
                              <span className="table-file-name" title={f.name}>
                                {f.name}
                              </span>
                              {f.shared && (
                                <span className="shared-badge-mini">Shared</span>
                              )}
                            </div>
                          </td>
                          <td>{formatBytes(f.size)}</td>
                          <td><span className="mime-pill">{f.mime}</span></td>
                          <td>{f.downloads}</td>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.folder}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Selected File Details Modal */}
        {selectedFile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setSelectedFile(null)}
          >
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '28px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span className="badge badge-cyan">{selectedFile.folder}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', wordBreak: 'break-all' }}>
                    {selectedFile.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)', marginBottom: '20px', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>File Size:</span>
                  <strong>{formatBytes(selectedFile.size)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>MIME Type:</span>
                  <span>{selectedFile.mime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Downloads:</span>
                  <span>{selectedFile.downloads} downloads</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Storage Backend:</span>
                  <span style={{ color: '#00c97a', fontWeight: 600 }}>Telegram Channel</span>
                </div>
              </div>

              <Link
                to="/register"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                Sign Up to Store Real Files
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <Link to="/" className="crumb-item">Home</Link>
          <Link to="/features" className="crumb-item">Features</Link>
          <Link to="/preview" className="crumb-item">Explorer</Link>
          <Link to="/how-it-works" className="crumb-item">How It Works</Link>
          <Link to="/opensource" className="crumb-item">Open Source</Link>
          <Link to="/blog" className="crumb-item">Blog</Link>
        </div>
        <div>&copy; 2026 CamHost.space &middot; Developed by <a href="https://peakbrosmao.me" target="_blank" rel="noopener" style={{ color: 'var(--cyan)', fontWeight: 700, textDecoration: 'none' }}>PEAK BROSMAO</a></div>
      </footer>
    </div>
  );
}
