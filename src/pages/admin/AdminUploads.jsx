import React from 'react';

function ScaffoldSection({ title, items }) {
  return (
    <div className="admin-card">
      <h3 className="admin-card-title" style={{ marginBottom: 16 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item} className="admin-scaffold-row">
            <span className="admin-scaffold-dot" />
            <span style={{ fontSize: '0.875rem', color: 'var(--adm-text)' }}>{item}</span>
            <span className="admin-badge neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminUploads() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Upload Management</h1>
          <p className="admin-page-desc">Monitor active uploads, manage failed uploads, and configure upload policies.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScaffoldSection
          title="Active Uploads"
          items={['Live upload progress', 'Uploading users list', 'File name & size preview', 'Cancel active upload']}
        />
        <ScaffoldSection
          title="Completed Uploads"
          items={['Recently completed uploads', 'Success timestamp', 'File size & owner', 'Telegram file ID confirmed']}
        />
        <ScaffoldSection
          title="Failed Uploads"
          items={['Error reason', 'Retry count', 'Owner information', 'Manual retry trigger']}
        />
        <ScaffoldSection
          title="Upload Queue"
          items={['Queued file count', 'Estimated wait time', 'Priority ordering', 'Clear queue']}
        />

        {/* These settings ARE wired to the existing settings API */}
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 4 }}>Upload Policy Settings</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', marginBottom: 16 }}>
            Configure these in <a href="/admin/settings/general" style={{ color: 'var(--adm-indigo)' }}>Platform Core → General Settings</a>
          </p>
          <div className="admin-scaffold-row">
            <span className="admin-scaffold-dot" style={{ background: '#00e08b' }} />
            <span style={{ fontSize: '0.875rem' }}>Maximum File Size (MB) — available in General Settings</span>
            <span className="admin-badge success" style={{ marginLeft: 'auto' }}>Live</span>
          </div>
          <div className="admin-scaffold-row" style={{ marginTop: 8 }}>
            <span className="admin-scaffold-dot" style={{ background: '#00e08b' }} />
            <span style={{ fontSize: '0.875rem' }}>Allowed File Extensions — available in General Settings</span>
            <span className="admin-badge success" style={{ marginLeft: 'auto' }}>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
