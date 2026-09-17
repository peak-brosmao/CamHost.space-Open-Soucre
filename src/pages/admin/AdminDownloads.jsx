import React from 'react';

function ScaffoldSection({ title, items }) {
  return (
    <div className="glass-card admin-card">
      <h3 className="admin-card-title" style={{ marginBottom: 16 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item} className="admin-scaffold-row">
            <span className="admin-scaffold-dot" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item}</span>
            <span className="admin-badge neutral" style={{ marginLeft: 'auto' }}>Coming Soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDownloads() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Download Management</h1>
          <p className="admin-page-desc">Track download stats, bandwidth, shared links, and suspicious activity.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScaffoldSection
          title="Download Statistics"
          items={['Total downloads all time', 'Downloads today / this week', 'Top downloaded files', 'Downloads per user']}
        />
        <ScaffoldSection
          title="Bandwidth Usage"
          items={['Total bandwidth consumed', 'Daily bandwidth graph', 'Bandwidth per user', 'Peak usage hours']}
        />
        <ScaffoldSection
          title="Download Limits"
          items={['Global rate limit settings', 'Per-user download cap', 'Concurrent download limit', 'Guest download toggle']}
        />
        <ScaffoldSection
          title="Suspicious Download Activity"
          items={['Rate-limit hit events', 'Unusual download spikes', 'IP-based activity', 'Auto-block triggers']}
        />

        {/* Shared Link Management */}
        <div className="glass-card admin-card">
          <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Shared Link Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Active Links', color: '#00e08b' },
              { label: 'Expired Links', color: 'var(--text-muted)' },
              { label: 'Disabled Links', color: '#ff4d6d' },
              { label: 'Password-Protected', color: '#7b4fff' },
            ].map(({ label, color }) => (
              <div key={label} className="admin-mini-stat glass-card" style={{ padding: '16px', gap: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                <strong style={{ color, fontSize: '1.5rem' }}>—</strong>
                <span className="admin-badge neutral">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
