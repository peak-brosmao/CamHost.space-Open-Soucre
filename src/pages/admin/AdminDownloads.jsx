import React, { useState, useEffect } from 'react';
import { apiRequest, formatBytes } from '../../api/client';
import { useToast } from '../../components/Toast';

export default function AdminDownloads() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [files, setFiles] = useState([]);
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resOverview, resFiles, resSettings] = await Promise.all([
        apiRequest('/admin/overview').catch(() => null),
        apiRequest('/admin/files?per_page=50').catch(() => null),
        apiRequest('/admin/settings').catch(() => null),
      ]);
      if (resOverview?.overview) setOverview(resOverview.overview);
      if (resFiles?.files) setFiles(resFiles.files);
      if (resSettings?.settings) setSettings(resSettings.settings);
    } catch (err) {
      showToast(err.message || 'Failed to load download metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGuestDownload = async (val) => {
    setSavingSettings(true);
    try {
      const nextVal = val ? '1' : '0';
      await apiRequest('/admin/settings', {
        method: 'POST',
        body: { ...settings, allow_guest_download: nextVal },
      });
      setSettings((prev) => ({ ...prev, allow_guest_download: nextVal }));
      showToast(val ? 'Guest downloads enabled' : 'Guest downloads disabled', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update setting', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleFileStatus = async (file) => {
    try {
      const newStatus = file.is_blocked === 1 ? 0 : 1;
      await apiRequest(`/admin/files/${file.id}/block`, {
        method: 'POST',
        body: { is_blocked: newStatus },
      });
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, is_blocked: newStatus } : f))
      );
      showToast(newStatus === 1 ? `Downloads disabled for "${file.original_name}"` : `Downloads restored for "${file.original_name}"`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update file status', 'error');
    }
  };

  // Sort top downloaded
  const topDownloaded = [...files]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 10);

  const totalDownloads = overview?.total_downloads ?? files.reduce((acc, f) => acc + (f.downloads || 0), 0);
  const totalBandwidthBytes = files.reduce((acc, f) => acc + ((f.downloads || 0) * (f.size_bytes || 0)), 0);
  const sharedFiles = files.filter((f) => f.share_token || f.is_public);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Download & Bandwidth Management</h1>
          <p className="admin-page-desc">
            Monitor real-time download traffic, top downloaded files, bandwidth consumption, and public share links.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Top Level Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Total Download Events</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--adm-text)', marginTop: 6 }}>
            {totalDownloads.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            ✓ Across all user files
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Estimated Bandwidth Served</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginTop: 6 }}>
            {formatBytes(totalBandwidthBytes)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted)', marginTop: 4, display: 'inline-block' }}>
            Direct Telegram CDN streaming
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Active Public Share Links</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a78bfa', marginTop: 6 }}>
            {sharedFiles.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted)', marginTop: 4, display: 'inline-block' }}>
            Files available via /share/*
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Rate-Limit Hits / Defenses</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', marginTop: 6 }}>
            {(overview?.rate_limit_hits || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            Active Anti-Abuse Shield
          </span>
        </div>
      </div>

      {/* Download Governance & Controls */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 className="admin-card-title" style={{ marginBottom: 14 }}>Download Access Policies</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: 'var(--adm-surface-alt, rgba(255,255,255,0.02))', borderRadius: 8, border: '1px solid var(--adm-border)' }}>
            <input
              type="checkbox"
              id="guestDlToggle"
              style={{ marginTop: 3, cursor: 'pointer', width: 16, height: 16 }}
              checked={settings.allow_guest_download !== '0'}
              disabled={savingSettings}
              onChange={(e) => handleToggleGuestDownload(e.target.checked)}
            />
            <div>
              <label htmlFor="guestDlToggle" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--adm-text)', cursor: 'pointer' }}>
                Allow Guest & Anonymous Downloads
              </label>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', margin: '4px 0 0' }}>
                When enabled, visitors who receive a public /share link can download without registering or logging in.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: 'var(--adm-surface-alt, rgba(255,255,255,0.02))', borderRadius: 8, border: '1px solid var(--adm-border)' }}>
            <span style={{ color: '#10b981', fontSize: '1.2rem', lineHeight: 1 }}>⚡</span>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--adm-text)' }}>
                Direct Telegram CDN Acceleration
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', margin: '4px 0 0' }}>
                Zero local server bandwidth bottleneck. File downloads stream directly from high-speed Telegram edge servers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Downloaded Files Table */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 className="admin-card-title" style={{ marginBottom: 14 }}>
          Top Downloaded Files
        </h3>

        {topDownloaded.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--adm-muted)', fontSize: '0.88rem' }}>
            No file downloads recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Owner</th>
                  <th style={{ textAlign: 'center' }}>Downloads</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topDownloaded.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--adm-text)', wordBreak: 'break-word' }}>
                          {f.original_name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>
                        {f.mime_type}
                      </span>
                    </td>
                    <td>{formatBytes(f.size_bytes)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--adm-muted)' }}>
                      {f.owner_email || `User #${f.user_id}`}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                      {f.downloads || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {f.is_blocked === 1 ? (
                        <span className="admin-badge danger">Suspended</span>
                      ) : (
                        <span className="admin-badge success">Active</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {f.share_token && (
                          <a
                            href={`/share/${f.share_token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary btn-sm"
                            style={{ textDecoration: 'none', padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            View Link ↗
                          </a>
                        )}
                        <button
                          type="button"
                          className={f.is_blocked === 1 ? 'btn-primary btn-sm' : 'btn-secondary btn-sm danger'}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleToggleFileStatus(f)}
                        >
                          {f.is_blocked === 1 ? 'Unblock' : 'Disable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
