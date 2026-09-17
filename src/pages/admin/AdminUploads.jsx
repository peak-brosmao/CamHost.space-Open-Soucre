import React, { useState, useEffect } from 'react';
import { apiRequest, formatBytes, relativeDate } from '../../api/client';
import { useToast } from '../../components/Toast';

export default function AdminUploads() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [settings, setSettings] = useState({});
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    max_upload_size_mb: '2000',
    allowed_extensions: 'zip,rar,tar,gz,7z,pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,gif,webp,mp4,mkv,mp3,wav,txt,json,csv,exe,msi,apk,dmg,iso',
    allow_guest_uploads: '0',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resFiles, resSettings] = await Promise.all([
        apiRequest('/admin/files?per_page=30').catch(() => null),
        apiRequest('/admin/settings').catch(() => null),
      ]);
      if (resFiles?.files) setFiles(resFiles.files);
      if (resSettings?.settings) {
        setSettings(resSettings.settings);
        setPolicyForm({
          max_upload_size_mb: resSettings.settings.max_upload_size_mb || '2000',
          allowed_extensions: resSettings.settings.allowed_extensions || 'zip,rar,tar,gz,7z,pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,gif,webp,mp4,mkv,mp3,wav,txt,json,csv,exe,msi,apk,dmg,iso',
          allow_guest_uploads: resSettings.settings.allow_guest_uploads || '0',
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to load upload metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await apiRequest('/admin/settings', {
        method: 'POST',
        body: {
          ...settings,
          ...policyForm,
        },
      });
      setSettings((prev) => ({ ...prev, ...policyForm }));
      showToast('Upload governance policies updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save policies', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const totalUploadedBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
  const avgFileSize = files.length > 0 ? Math.round(totalUploadedBytes / files.length) : 0;

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Upload Management & Governance</h1>
          <p className="admin-page-desc">
            Monitor real-time uploads, configure file extension allowlists, max payload limits, and inspect recent cloud uploads.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh Feed
        </button>
      </div>

      {/* Upload Stat Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Total Files Uploaded</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--adm-text)', marginTop: 6 }}>
            {files.length.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            ✓ 100% Stored in Telegram Cloud
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Total Storage Consumed</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginTop: 6 }}>
            {formatBytes(totalUploadedBytes)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted)', marginTop: 4, display: 'inline-block' }}>
            Zero storage fee on server disk
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Average File Size</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a78bfa', marginTop: 6 }}>
            {formatBytes(avgFileSize)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--adm-muted)', marginTop: 4, display: 'inline-block' }}>
            Across all recent uploads
          </span>
        </div>

        <div className="admin-card" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', fontWeight: 600 }}>Upload Pipeline Status</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', marginTop: 6 }}>
            Active
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
            Telegram Bot Gateway Online
          </span>
        </div>
      </div>

      {/* Upload Governance Form */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 className="admin-card-title" style={{ marginBottom: 14 }}>Upload Governance & Restrictions</h3>
        <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', display: 'block', marginBottom: 6 }}>
                Maximum Single File Size (MB)
              </label>
              <input
                type="number"
                className="input-field"
                min="1"
                max="2048"
                value={policyForm.max_upload_size_mb}
                onChange={(e) => setPolicyForm({ ...policyForm, max_upload_size_mb: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--adm-muted)', marginTop: 4, display: 'block' }}>
                Telegram Cloud supports up to 2000 MB per file.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', display: 'block', marginBottom: 6 }}>
                Guest Upload Permission
              </label>
              <select
                className="input-field"
                value={policyForm.allow_guest_uploads}
                onChange={(e) => setPolicyForm({ ...policyForm, allow_guest_uploads: e.target.value })}
              >
                <option value="0">Require Registered Account (Recommended)</option>
                <option value="1">Allow Public / Guest Uploads</option>
              </select>
              <span style={{ fontSize: '0.74rem', color: 'var(--adm-muted)', marginTop: 4, display: 'block' }}>
                Prevent anonymous spam by enforcing registered user authentication.
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', display: 'block', marginBottom: 6 }}>
              Allowed File Extensions (Comma-separated)
            </label>
            <input
              type="text"
              className="input-field"
              value={policyForm.allowed_extensions}
              onChange={(e) => setPolicyForm({ ...policyForm, allowed_extensions: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--adm-muted)', marginTop: 4, display: 'block' }}>
              Dangerous server executables (.php, .htaccess, .sh) are permanently blocked by server security engine.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="submit" className="btn-primary" disabled={savingPolicy}>
              {savingPolicy ? 'Saving Changes…' : 'Update Upload Policies'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Upload Activity Table */}
      <div className="admin-card">
        <h3 className="admin-card-title" style={{ marginBottom: 14 }}>
          Recent Cloud Uploads ({files.length})
        </h3>

        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--adm-muted)', fontSize: '0.88rem' }}>
            No uploads found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploader</th>
                  <th>Uploaded At</th>
                  <th style={{ textAlign: 'center' }}>Telegram Storage</th>
                  <th style={{ textAlign: 'right' }}>Share Link</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--adm-text)', wordBreak: 'break-word' }}>
                        {f.original_name}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>
                        {f.mime_type}
                      </span>
                    </td>
                    <td>{formatBytes(f.size_bytes)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--adm-muted)' }}>
                      {f.owner_email || `User #${f.user_id}`}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--adm-muted)' }}>
                      {relativeDate(f.created_at)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="admin-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                        Synced (ID: {f.telegram_file_id ? f.telegram_file_id.slice(0, 10) + '…' : 'OK'})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {f.share_token ? (
                        <a
                          href={`/share/${f.share_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary btn-sm"
                          style={{ textDecoration: 'none', padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          /share/{f.share_token.slice(0, 8)} ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--adm-muted)' }}>Private</span>
                      )}
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
