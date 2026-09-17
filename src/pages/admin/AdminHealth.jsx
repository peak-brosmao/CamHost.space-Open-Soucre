import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const formatBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
};

function HealthBadge({ ok, label }) {
  return (
    <span className={`admin-badge ${ok ? 'success' : 'danger'}`}>
      {label || (ok ? 'Healthy' : 'Error')}
    </span>
  );
}

function HealthCard({ title, status, children }) {
  const ok = status === 'healthy' || status === 'connected' || status === 'ok';
  return (
    <div className="glass-card admin-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="admin-card-title" style={{ margin: 0 }}>{title}</h3>
        <HealthBadge ok={ok} label={status?.toUpperCase()} />
      </div>
      {children}
    </div>
  );
}

export default function AdminHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/health');
      setHealth(res.health || null);
    } catch (err) {
      showToast(err.message || 'Failed to probe health', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">System Health</h1>
          <p className="admin-page-desc">Live diagnostics for database, Telegram API, server resources, and failed jobs.</p>
        </div>
        <button className="btn-secondary admin-refresh-btn" onClick={load}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><span className="spinner-lg" /><p>Probing server health…</p></div>
      ) : !health ? (
        <div className="glass-card admin-card admin-scaffold-empty">
          <p>Health data unavailable.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Database */}
          <HealthCard title="Database Connection" status={health.database?.status}>
            <div className="admin-env-grid">
              <div className="admin-env-item"><span className="admin-env-label">Engine</span><strong>{health.database?.driver ?? '—'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Query Latency</span><strong>{health.database?.latency_ms ?? '—'} ms</strong></div>
            </div>
          </HealthCard>

          {/* Telegram API */}
          <HealthCard title="Telegram Cloud Infrastructure" status={health.telegram_api?.status}>
            <div className="admin-env-grid">
              <div className="admin-env-item"><span className="admin-env-label">Bot Handle</span><strong>@{health.telegram_api?.bot_username || 'Not Detected'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">API Latency</span><strong>{health.telegram_api?.latency_ms ?? '—'} ms</strong></div>
            </div>
          </HealthCard>

          {/* Server Resources */}
          <div className="glass-card admin-card">
            <h3 className="admin-card-title">Host Server Resources</h3>
            <div className="admin-env-grid" style={{ marginTop: 12 }}>
              <div className="admin-env-item">
                <span className="admin-env-label">Free Disk Space</span>
                <strong>{health.system?.disk_free_bytes ? formatBytes(health.system.disk_free_bytes) : 'Shared Host'}</strong>
              </div>
              <div className="admin-env-item">
                <span className="admin-env-label">Memory Used by Script</span>
                <strong>{health.system?.memory_usage_mb ?? '—'} MB</strong>
              </div>
              <div className="admin-env-item">
                <span className="admin-env-label">PHP Max Upload</span>
                <strong>{health.system?.upload_max_filesize ?? '—'}</strong>
              </div>
              <div className="admin-env-item">
                <span className="admin-env-label">PHP Post Max Size</span>
                <strong>{health.system?.post_max_size ?? '—'}</strong>
              </div>
              <div className="admin-env-item">
                <span className="admin-env-label">PHP Version</span>
                <strong>v{health.system?.php_version ?? '—'}</strong>
              </div>
              <div className="admin-env-item">
                <span className="admin-env-label">Operating System</span>
                <strong>{health.system?.os ?? '—'}</strong>
              </div>
            </div>
          </div>

          {/* Queue Worker / Failed Jobs */}
          <div className="glass-card admin-card">
            <h3 className="admin-card-title">Queue & Failed Jobs</h3>
            <div className="admin-scaffold-empty" style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Queue worker status and failed job listing will be available once the queue API endpoint is configured.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
