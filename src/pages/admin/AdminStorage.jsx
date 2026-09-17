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

export default function AdminStorage() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Storage Management</h1>
          <p className="admin-page-desc">Monitor Telegram storage, upload health, and file integrity across the platform.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScaffoldSection
          title="Telegram Storage Status"
          items={['Bot storage quota usage', 'Active Telegram chat/channel', 'File count in Telegram', 'Storage consumption trend']}
        />
        <ScaffoldSection
          title="Upload Success / Failed"
          items={['Total uploads this period', 'Success rate %', 'Failed upload count', 'Retry queue depth']}
        />
        <ScaffoldSection
          title="Storage Usage"
          items={['Per-user storage breakdown', 'Top storage consumers', 'Orphaned file detection', 'Deduplication analysis']}
        />
        <ScaffoldSection
          title="Failed Upload Retry"
          items={['View failed upload queue', 'Retry individual uploads', 'Bulk retry all failed', 'Clear failed queue']}
        />
        <ScaffoldSection
          title="File Integrity Verification"
          items={['Verify Telegram file IDs', 'Detect broken file references', 'Re-sync missing metadata', 'Integrity report export']}
        />
        <ScaffoldSection
          title="Storage Health Check"
          items={['Database vs Telegram sync check', 'Orphan record detection', 'Size mismatch alerts', 'Auto-repair suggestions']}
        />
      </div>
    </div>
  );
}
