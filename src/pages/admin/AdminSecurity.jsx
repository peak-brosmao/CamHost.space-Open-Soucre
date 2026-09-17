import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const formatBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
};

export default function AdminSecurity() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit');
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/admin/audit-logs');
        setAuditLogs(res.audit_logs || []);
      } catch (err) {
        showToast(err.message || 'Failed to load audit logs', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ACTION_COLORS = {
    ban_user: '#ff4d6d', unban_user: '#00e08b',
    delete_file: '#ff4d6d', block_file: '#ffab2e', unblock_file: '#00e08b',
    set_quota: '#7b4fff', reset_password: '#0077ff',
    change_role: '#00d4ff', save_settings: '#00e08b',
    cache_clear: '#ffab2e',
  };

  const tabs = [
    { id: 'audit', label: 'Audit Logs' },
    { id: 'login', label: 'Login Activity' },
    { id: 'abuse', label: 'Abuse Reports' },
    { id: 'copyright', label: 'Copyright Complaints' },
    { id: 'rbac', label: 'Role-Based Access' },
  ];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Security & Abuse</h1>
          <p className="admin-page-desc">Monitor admin activity, login history, abuse reports, and access control.</p>
        </div>
      </div>

      <div className="admin-filter-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="glass-card admin-table-card">
          {loading ? <div className="admin-loading"><span className="spinner-lg" /></div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.admin_email || 'System'}</td>
                      <td>
                        <span className="admin-action-tag" style={{ background: (ACTION_COLORS[log.action] || '#00d4ff') + '20', color: ACTION_COLORS[log.action] || '#00d4ff' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                        {log.target_type ? `${log.target_type} #${log.target_id}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.83rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.ip_address}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="6" className="admin-table-empty">No audit logs recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Coming-soon scaffolded tabs */}
      {activeTab !== 'audit' && (
        <div className="glass-card admin-card">
          <div className="admin-scaffold-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.3 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
            <p>This section is being built. Backend API endpoint will be connected here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
