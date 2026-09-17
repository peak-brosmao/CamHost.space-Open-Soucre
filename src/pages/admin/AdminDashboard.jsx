import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div>
        <p className="admin-stat-label">{label}</p>
        <h2 className="admin-stat-value" style={{ color }}>{value}</h2>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#00e08b' : '#ff4d6d', marginRight: 6, flexShrink: 0,
      boxShadow: ok ? '0 0 6px #00e08b' : '0 0 6px #ff4d6d',
    }} />
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ov, he] = await Promise.all([
          apiRequest('/admin/overview'),
          apiRequest('/admin/health').catch(() => null),
        ]);
        setOverview(ov);
        setHealth(he?.health || null);
      } catch (err) {
        showToast(err.message || 'Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="spinner-lg" />
        <p>Loading system metrics…</p>
      </div>
    );
  }

  const ov = overview?.overview || {};
  const srv = overview?.server || {};

  return (
    <div className="admin-page-content">
      {/* Page Title */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Dashboard Overview
            <span className="admin-page-badge">Live</span>
          </h1>
          <p className="admin-page-desc">Platform metrics, system status, and quick access to management areas.</p>
        </div>
      </div>

      {/* Maintenance Banner */}
      {ov.maintenance_mode && (
        <div className="admin-alert-banner warning">
          <span>⚠️ <strong>Maintenance Mode is Active!</strong> Regular users are seeing a 503 page.</span>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            onClick={() => navigate('/admin/settings/maintenance')}>
            Adjust
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="admin-stat-grid">
        <StatCard
          label="Total Registered Users"
          value={ov.total_users ?? '—'}
          sub={`${ov.verified_users ?? 0} Verified · ${ov.banned_users ?? 0} Suspended`}
          color="#00d4ff"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <StatCard
          label="Total Hosted Files"
          value={ov.total_files ?? '—'}
          sub={`${ov.blocked_files ?? 0} Flagged / Blocked`}
          color="#7b4fff"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
        />
        <StatCard
          label="Storage Consumed"
          value={formatBytes(ov.total_storage_bytes)}
          sub="Telegram Cloud Storage"
          color="#00e08b"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          }
        />
        <StatCard
          label="Total Downloads & Streams"
          value={ov.total_downloads ?? '—'}
          sub={`Rate limit hits: ${ov.rate_limit_hits ?? 0}`}
          color="#ffab2e"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          }
        />
      </div>

      <div className="admin-dashboard-grid">
        {/* System Status */}
        <div className="glass-card admin-card">
          <h3 className="admin-card-title">System Status</h3>
          <div className="admin-status-list">
            <div className="admin-status-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={health?.database?.status === 'healthy'} />
                <span>Database Connection</span>
              </div>
              <span className="admin-status-value">
                {health?.database?.status ?? 'Unknown'} {health?.database?.latency_ms ? `· ${health.database.latency_ms}ms` : ''}
              </span>
            </div>
            <div className="admin-status-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={health?.telegram_api?.status === 'connected'} />
                <span>Telegram API</span>
              </div>
              <span className="admin-status-value">
                {health?.telegram_api?.status ?? 'Unknown'} {health?.telegram_api?.latency_ms ? `· ${health.telegram_api.latency_ms}ms` : ''}
              </span>
            </div>
            <div className="admin-status-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={!ov.maintenance_mode} />
                <span>Platform Availability</span>
              </div>
              <span className="admin-status-value">{ov.maintenance_mode ? 'Maintenance Mode' : 'Operational'}</span>
            </div>
            <div className="admin-status-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot ok={true} />
                <span>Admin Panel</span>
              </div>
              <span className="admin-status-value">Online</span>
            </div>
          </div>
        </div>

        {/* Runtime Environment */}
        <div className="glass-card admin-card">
          <h3 className="admin-card-title">Runtime Environment</h3>
          <div className="admin-env-grid">
            <div className="admin-env-item">
              <span className="admin-env-label">PHP Engine</span>
              <strong>v{srv.php_version ?? '—'}</strong>
            </div>
            <div className="admin-env-item">
              <span className="admin-env-label">Operating System</span>
              <strong>{srv.os ?? '—'}</strong>
            </div>
            <div className="admin-env-item">
              <span className="admin-env-label">Memory Allocated</span>
              <strong>{srv.memory_used_mb ?? '—'} MB</strong>
            </div>
            <div className="admin-env-item">
              <span className="admin-env-label">Web Server</span>
              <strong>{srv.server_software ?? '—'}</strong>
            </div>
            <div className="admin-env-item">
              <span className="admin-env-label">Disk Space Free</span>
              <strong>{health?.system?.disk_free_bytes ? formatBytes(health.system.disk_free_bytes) : 'Shared Host'}</strong>
            </div>
            <div className="admin-env-item">
              <span className="admin-env-label">Telegram Bot</span>
              <strong>@{health?.telegram_api?.bot_username ?? '—'}</strong>
            </div>
          </div>
        </div>

        {/* Storage Usage Bar */}
        <div className="glass-card admin-card">
          <h3 className="admin-card-title">Storage Usage</h3>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: 'var(--text-muted)' }}>
              <span>{formatBytes(ov.total_storage_bytes)} used</span>
              <span>Telegram Cloud (Unlimited)</span>
            </div>
            <div className="admin-progress-track">
              <div className="admin-progress-bar" style={{ width: '100%', background: 'linear-gradient(90deg, #00d4ff, #7b4fff)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div className="admin-mini-stat">
                <span className="admin-env-label">Total Files</span>
                <strong style={{ color: '#7b4fff' }}>{ov.total_files ?? 0}</strong>
              </div>
              <div className="admin-mini-stat">
                <span className="admin-env-label">Blocked Files</span>
                <strong style={{ color: '#ff4d6d' }}>{ov.blocked_files ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card admin-card">
          <h3 className="admin-card-title">Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { label: 'Manage Users', path: '/admin/users', color: '#00d4ff' },
              { label: 'View All Files', path: '/admin/files', color: '#7b4fff' },
              { label: 'Storage Health', path: '/admin/storage', color: '#00e08b' },
              { label: 'Audit Logs', path: '/admin/security', color: '#ffab2e' },
              { label: 'System Health', path: '/admin/health', color: '#ff6b9d' },
              { label: 'Platform Settings', path: '/admin/settings/general', color: '#0077ff' },
            ].map(({ label, path, color }) => (
              <button
                key={path}
                className="admin-quick-action"
                style={{ '--qa-color': color }}
                onClick={() => navigate(path)}
              >
                <span className="admin-qa-dot" style={{ background: color }} />
                {label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ marginLeft: 'auto', opacity: 0.5 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
