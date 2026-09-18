import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

export default function AdminSecurity() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [rbacUsers, setRbacUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit');
  const { showToast } = useToast();

  const loadData = async (tab) => {
    setLoading(true);
    try {
      let endpoint = '/admin/audit-logs';
      if (tab === 'login') endpoint += '?type=logins';
      else if (tab === 'abuse') endpoint += '?type=abuse';
      else if (tab === 'copyright') endpoint += '?type=copyright';
      else if (tab === 'rbac') endpoint += '?type=rbac';

      const res = await apiRequest(endpoint);
      setLogs(res.audit_logs || []);
      if (res.summary) setSummary(res.summary);
      if (res.rbac_users) setRbacUsers(res.rbac_users);
    } catch (err) {
      showToast(err.message || 'Failed to load security logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const handleToggleRole = async (user) => {
    try {
      const res = await apiRequest(`/admin/users/${user.id}/role`, { method: 'POST' });
      showToast(res.message || 'Role updated', 'success');
      loadData('rbac');
    } catch (err) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  const ACTION_COLORS = {
    ADMIN_LOGIN: '#10b981',
    USER_BANNED: '#ef4444',
    USER_UNBANNED: '#10b981',
    FILE_BLOCKED: '#f59e0b',
    FILE_UNBLOCKED: '#10b981',
    FILE_DELETED: '#ef4444',
    FILE_REPORTED: '#ef4444',
    USER_QUOTA_UPDATED: '#6366f1',
    USER_PASSWORD_RESET: '#0ea5e9',
    USER_ROLE_CHANGED: '#8b5cf6',
    SETTINGS_UPDATED: '#10b981',
    CACHE_CLEARED: '#06b6d4',
    CRON_MANUAL_RUN: '#a855f7',
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
          <h1 className="admin-page-title">Security & Abuse Control</h1>
          <p className="admin-page-desc">Monitor administrator activity, login histories, abuse & copyright reports, and role-based permissions.</p>
        </div>
        <button className="btn-secondary admin-refresh-btn" onClick={() => loadData(activeTab)} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="admin-card" style={{ padding: '14px 18px' }}>
            <span className="admin-env-label">Administrators</span>
            <strong style={{ fontSize: '1.4rem', color: '#6366f1' }}>{summary.total_admins}</strong>
          </div>
          <div className="admin-card" style={{ padding: '14px 18px' }}>
            <span className="admin-env-label">Registered Users</span>
            <strong style={{ fontSize: '1.4rem', color: '#0ea5e9' }}>{summary.total_users}</strong>
          </div>
          <div className="admin-card" style={{ padding: '14px 18px' }}>
            <span className="admin-env-label">Verified Accounts</span>
            <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>{summary.verified_users}</strong>
          </div>
          <div className="admin-card" style={{ padding: '14px 18px' }}>
            <span className="admin-env-label">Suspended / Banned</span>
            <strong style={{ fontSize: '1.4rem', color: summary.banned_users > 0 ? '#ef4444' : 'var(--adm-muted)' }}>
              {summary.banned_users}
            </strong>
          </div>
          <div className="admin-card" style={{ padding: '14px 18px' }}>
            <span className="admin-env-label">Blocked Files</span>
            <strong style={{ fontSize: '1.4rem', color: summary.blocked_files > 0 ? '#f59e0b' : 'var(--adm-muted)' }}>
              {summary.blocked_files}
            </strong>
          </div>
        </div>
      )}

      <div className="admin-filter-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-filter-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Audit Logs, Login Activity, Abuse Reports, Copyright Complaints */}
      {activeTab !== 'rbac' && (
        <div className="admin-card admin-table-card">
          {loading ? (
            <div className="admin-loading"><span className="spinner-lg" /><p>Fetching security records…</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User / Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--adm-muted)', fontSize: '0.8rem' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.admin_email || 'System / Visitor'}</td>
                      <td>
                        <span
                          className="admin-action-tag"
                          style={{
                            background: (ACTION_COLORS[log.action] || '#6366f1') + '20',
                            color: ACTION_COLORS[log.action] || '#6366f1',
                            border: `1px solid ${(ACTION_COLORS[log.action] || '#6366f1')}40`,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: 'var(--adm-muted)', fontSize: '0.83rem' }}>
                        {log.target_type ? `${log.target_type} #${log.target_id}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.83rem', maxWidth: 300, wordBreak: 'break-word' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--adm-muted)', fontSize: '0.8rem' }}>
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="admin-table-empty">
                        No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found. System is secure.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Role-Based Access Control (RBAC) */}
      {activeTab === 'rbac' && (
        <div className="admin-card admin-table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--adm-border)' }}>
            <h3 className="admin-card-title" style={{ margin: 0 }}>Administrator & User Privilege Matrix</h3>
            <p style={{ color: 'var(--adm-muted)', fontSize: '0.82rem', marginTop: 4, marginBottom: 0 }}>
              Admins hold full platform governance, storage management, and setting permissions. Regular users have private personal storage.
            </p>
          </div>

          {loading ? (
            <div className="admin-loading"><span className="spinner-lg" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Account</th>
                    <th>Current Role</th>
                    <th>Verification</th>
                    <th>Account Status</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'right' }}>Role Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rbacUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.email}</td>
                      <td>
                        <span className={`admin-badge ${u.role === 'admin' ? 'indigo' : 'neutral'}`}>
                          {u.role === 'admin' ? '🛡️ Administrator' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.is_verified === 1 ? 'success' : 'warning'}`}>
                          {u.is_verified === 1 ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.is_banned === 1 ? 'danger' : 'success'}`}>
                          {u.is_banned === 1 ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--adm-muted)', fontSize: '0.8rem' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => handleToggleRole(u)}
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin 🛡️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
