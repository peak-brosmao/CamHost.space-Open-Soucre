import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active section tab
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [fileTotal, setFileTotal] = useState(0);
  const [fileSearch, setFileSearch] = useState('');
  const [settings, setSettings] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // User modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [quotaInput, setQuotaInput] = useState('10240');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [modalType, setModalType] = useState(null); // 'quota' | 'password'

  const fetchOverview = async () => {
    try {
      const res = await apiRequest('/admin/overview');
      setOverview(res);
    } catch (err) {
      showToast(err.message || 'Failed to load overview data', 'error');
    }
  };

  const fetchUsers = async (search = '') => {
    try {
      const res = await apiRequest(`/admin/users?q=${encodeURIComponent(search)}&limit=50`);
      setUsers(res.users || []);
      setUserTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    }
  };

  const fetchFiles = async (search = '') => {
    try {
      const res = await apiRequest(`/admin/files?q=${encodeURIComponent(search)}&limit=50`);
      setFiles(res.files || []);
      setFileTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load files', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/admin/settings');
      setSettings(res.settings || {});
    } catch (err) {
      showToast(err.message || 'Failed to load settings', 'error');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await apiRequest('/admin/audit-logs');
      setAuditLogs(res.audit_logs || []);
    } catch (err) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await apiRequest('/admin/health');
      setHealth(res.health || null);
    } catch (err) {
      showToast(err.message || 'Failed to probe system health', 'error');
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await fetchOverview();
      setLoading(false);
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(userSearch);
    if (activeTab === 'files') fetchFiles(fileSearch);
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'health') fetchHealth();
  }, [activeTab]);

  // Actions
  const handleToggleBan = async (u) => {
    try {
      const res = await apiRequest(`/admin/users/${u.id}/ban`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchUsers(userSearch);
      fetchOverview();
    } catch (err) {
      showToast(err.message || 'Failed to update user ban status', 'error');
    }
  };

  const handleToggleRole = async (u) => {
    try {
      const res = await apiRequest(`/admin/users/${u.id}/role`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchUsers(userSearch);
    } catch (err) {
      showToast(err.message || 'Failed to change user role', 'error');
    }
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await apiRequest(`/admin/users/${selectedUser.id}/quota`, {
        method: 'POST',
        body: { quota_mb: parseInt(quotaInput, 10) },
      });
      showToast(res.message, 'success');
      setModalType(null);
      fetchUsers(userSearch);
    } catch (err) {
      showToast(err.message || 'Failed to set quota', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPasswordInput) return;
    try {
      const res = await apiRequest(`/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        body: { new_password: newPasswordInput },
      });
      showToast(res.message, 'success');
      setModalType(null);
      setNewPasswordInput('');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  const handleToggleBlockFile = async (f) => {
    try {
      const res = await apiRequest(`/admin/files/${f.id}/block`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchFiles(fileSearch);
      fetchOverview();
    } catch (err) {
      showToast(err.message || 'Failed to block/unblock file', 'error');
    }
  };

  const handleDeleteFile = async (f) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${f.original_name}"?`)) return;
    try {
      const res = await apiRequest(`/admin/files/${f.id}`, { method: 'DELETE' });
      showToast(res.message, 'success');
      fetchFiles(fileSearch);
      fetchOverview();
    } catch (err) {
      showToast(err.message || 'Failed to delete file', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await apiRequest('/admin/settings', {
        method: 'POST',
        body: settings,
      });
      showToast(res.message || 'Platform settings updated', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!window.confirm('Clear all rate-limit counters and security cache?')) return;
    try {
      const res = await apiRequest('/admin/cache-clear', { method: 'POST' });
      showToast(res.message, 'success');
      fetchOverview();
    } catch (err) {
      showToast(err.message || 'Failed to purge cache', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Dashboard', to: '/files' }, { label: 'Admin Control Center', active: true }]}
        />

        <main className="dashboard-container">
          {/* Header */}
          <div className="page-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="page-title">Admin Control Center</h1>
                <span
                  style={{
                    background: 'rgba(0, 119, 255, 0.15)',
                    color: '#00d4ff',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '100px',
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  System Admin
                </span>
              </div>
              <p className="page-desc">
                Enterprise control center for platform settings, governance, user authorization, and system health
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={handlePurgeCache}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                title="Flush Rate Limits & Transient Cache"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Flush Rate Limits
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '12px',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users & Quotas' },
              { id: 'files', label: 'Files & Storage' },
              { id: 'settings', label: 'Platform Core & Settings' },
              { id: 'audit', label: 'Security & Audit Logs' },
              { id: 'health', label: 'System Health & APIs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <span className="spinner-lg" />
                  <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Loading system metrics...
                  </p>
                </div>
              ) : overview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Maintenance Alert Banner if Active */}
                  {overview.overview?.maintenance_mode && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        background: 'rgba(255, 170, 0, 0.12)',
                        border: '1px solid rgba(255, 170, 0, 0.4)',
                        color: '#ffaa00',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>
                          <strong>Maintenance Mode is Active!</strong> Regular users are currently restricted with 503 Maintenance page.
                        </span>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        onClick={() => setActiveTab('settings')}
                      >
                        Adjust in Settings
                      </button>
                    </div>
                  )}

                  {/* 4 Stat Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px',
                    }}
                  >
                    <div className="glass-card" style={{ padding: '20px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Total Registered Users</p>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{overview.overview.total_users}</h2>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {overview.overview.verified_users} Verified · {overview.overview.banned_users} Suspended
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '20px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Total Hosted Files</p>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{overview.overview.total_files}</h2>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {overview.overview.blocked_files} Flagged / Blocked
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '20px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Storage Consumed</p>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: '#00d4ff' }}>
                        {formatBytes(overview.overview.total_storage_bytes)}
                      </h2>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Telegram Cloud Storage
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '20px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Total Downloads & Streams</p>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>{overview.overview.total_downloads}</h2>
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Rate limit hits: {overview.overview.rate_limit_hits}
                      </div>
                    </div>
                  </div>

                  {/* System Environment Summary */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Runtime Environment</h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>PHP Engine</span>
                        <strong>v{overview.server.php_version}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Operating System</span>
                        <strong>{overview.server.os}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Memory Allocated</span>
                        <strong>{overview.server.memory_used_mb} MB</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Web Server</span>
                        <strong>{overview.server.server_software}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search users by email or display name..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    fetchUsers(e.target.value);
                  }}
                  style={{ maxWidth: '400px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{userTotal} Total User(s)</span>
              </div>

              {/* Users Table */}
              <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '14px 18px' }}>User</th>
                      <th style={{ padding: '14px 18px' }}>Role</th>
                      <th style={{ padding: '14px 18px' }}>Status</th>
                      <th style={{ padding: '14px 18px' }}>Storage Used</th>
                      <th style={{ padding: '14px 18px' }}>Quota Limit</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600 }}>{u.display_name || 'No Name'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: u.role === 'admin' ? 'rgba(0, 119, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                              color: u.role === 'admin' ? '#00d4ff' : 'var(--text-muted)',
                            }}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {u.is_banned ? (
                            <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: '0.8rem' }}>Suspended</span>
                          ) : u.is_verified ? (
                            <span style={{ color: '#52c41a', fontWeight: 500, fontSize: '0.8rem' }}>Verified</span>
                          ) : (
                            <span style={{ color: '#faad14', fontWeight: 500, fontSize: '0.8rem' }}>Unverified</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {formatBytes(u.storage_used_bytes)} ({u.total_files} files)
                        </td>
                        <td style={{ padding: '14px 18px' }}>{formatBytes(u.storage_quota)}</td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedUser(u);
                                setQuotaInput((u.storage_quota / 1024 / 1024).toString());
                                setModalType('quota');
                              }}
                            >
                              Quota
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedUser(u);
                                setModalType('password');
                              }}
                            >
                              Reset Pass
                            </button>
                            {u.id !== user?.id && (
                              <>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => handleToggleRole(u)}
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                                <button
                                  className={u.is_banned ? 'btn-secondary' : 'btn-danger'}
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => handleToggleBan(u)}
                                >
                                  {u.is_banned ? 'Unban' : 'Suspend'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FILE & STORAGE GOVERNANCE */}
          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search files by original name or owner email..."
                  value={fileSearch}
                  onChange={(e) => {
                    setFileSearch(e.target.value);
                    fetchFiles(e.target.value);
                  }}
                  style={{ maxWidth: '400px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{fileTotal} Total File(s)</span>
              </div>

              {/* Files Table */}
              <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '14px 18px' }}>File Name</th>
                      <th style={{ padding: '14px 18px' }}>Owner</th>
                      <th style={{ padding: '14px 18px' }}>Size</th>
                      <th style={{ padding: '14px 18px' }}>Downloads</th>
                      <th style={{ padding: '14px 18px' }}>Status</th>
                      <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{f.original_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Telegram ID: {f.telegram_file_id ? f.telegram_file_id.substring(0, 18) + '...' : 'None'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{f.owner_email}</td>
                        <td style={{ padding: '14px 18px' }}>{formatBytes(f.size_bytes)}</td>
                        <td style={{ padding: '14px 18px' }}>{f.downloads || 0}</td>
                        <td style={{ padding: '14px 18px' }}>
                          {f.is_blocked ? (
                            <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: '0.8rem' }}>Blocked / DMCA</span>
                          ) : (
                            <span style={{ color: '#52c41a', fontWeight: 500, fontSize: '0.8rem' }}>Active</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className={f.is_blocked ? 'btn-secondary' : 'btn-danger'}
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleToggleBlockFile(f)}
                            >
                              {f.is_blocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              className="btn-danger"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteFile(f)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {files.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No files found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM CORE & SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '800px' }}>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* General Settings */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>General Platform Settings</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="form-label">Platform Name</label>
                      <input
                        type="text"
                        className="input-field"
                        value={settings.site_name || ''}
                        onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label">Platform Description</label>
                      <textarea
                        className="input-field"
                        rows="2"
                        value={settings.site_description || ''}
                        onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label">Default User Quota (MB)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={settings.default_storage_quota_mb || ''}
                        onChange={(e) => setSettings({ ...settings, default_storage_quota_mb: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Upload & Storage Limits */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Upload & Storage Governance</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="form-label">Maximum Upload Size (MB)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={settings.max_upload_size_mb || ''}
                        onChange={(e) => setSettings({ ...settings, max_upload_size_mb: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label">Allowed File Extensions (comma separated)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={settings.allowed_extensions || ''}
                        onChange={(e) => setSettings({ ...settings, allowed_extensions: e.target.value })}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Dangerous executables (.php, .exe, .sh) are permanently blocked regardless of this setting.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.allow_guest_download === '1'}
                          onChange={(e) => setSettings({ ...settings, allow_guest_download: e.target.checked ? '1' : '0' })}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Allow Unauthenticated Guest Downloads</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Maintenance & Accessibility</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.maintenance_mode === '1'}
                          onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? '1' : '0' })}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: settings.maintenance_mode === '1' ? '#ffaa00' : 'inherit' }}>
                          Enable Maintenance Mode (Only Administrators Can Access Platform)
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="form-label">Maintenance Notice Message</label>
                      <input
                        type="text"
                        className="input-field"
                        value={settings.maintenance_message || ''}
                        onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button type="submit" className="btn-primary" disabled={savingSettings} style={{ padding: '12px 28px' }}>
                    {savingSettings ? 'Saving...' : 'Save Platform Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: SECURITY & AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '14px 18px' }}>Timestamp</th>
                      <th style={{ padding: '14px 18px' }}>Admin</th>
                      <th style={{ padding: '14px 18px' }}>Action</th>
                      <th style={{ padding: '14px 18px' }}>Target</th>
                      <th style={{ padding: '14px 18px' }}>Details</th>
                      <th style={{ padding: '14px 18px' }}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{log.admin_email || 'System'}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'rgba(0, 212, 255, 0.15)',
                              color: '#00d4ff',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                          {log.target_type ? `${log.target_type} #${log.target_id}` : '-'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>{log.details}</td>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {log.ip_address}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM HEALTH & APIS */}
          {activeTab === 'health' && (
            <div>
              {health ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
                  {/* Database Health Card */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Database Connection</h3>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: health.database.status === 'healthy' ? 'rgba(82, 196, 26, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                          color: health.database.status === 'healthy' ? '#52c41a' : '#ff4d4f',
                        }}
                      >
                        {health.database.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Engine: {health.database.driver} · Query Latency: <strong>{health.database.latency_ms} ms</strong>
                    </p>
                  </div>

                  {/* Telegram API Health Card */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Telegram Cloud Infrastructure</h3>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: health.telegram_api.status === 'connected' ? 'rgba(82, 196, 26, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                          color: health.telegram_api.status === 'connected' ? '#52c41a' : '#ff4d4f',
                        }}
                      >
                        {health.telegram_api.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Bot Handle: <strong>@{health.telegram_api.bot_username || 'Not Detected'}</strong> · API Latency:{' '}
                      <strong>{health.telegram_api.latency_ms} ms</strong>
                    </p>
                  </div>

                  {/* Server Resources Card */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Host Server Resources</h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Free Disk Space</span>
                        <strong>{health.system.disk_free_bytes ? formatBytes(health.system.disk_free_bytes) : 'Host Shared'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Memory Used by Script</span>
                        <strong>{health.system.memory_usage_mb} MB</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>PHP Max Upload Limit</span>
                        <strong>{health.system.upload_max_filesize}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>PHP Post Max Size</span>
                        <strong>{health.system.post_max_size}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <span className="spinner-lg" />
                  <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Probing server health...</p>
                </div>
              )}
            </div>
          )}

          {/* Quota Modal */}
          {modalType === 'quota' && selectedUser && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Set Storage Quota</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Adjust storage limit for <strong>{selectedUser.email}</strong>
                </p>
                <form onSubmit={handleSaveQuota}>
                  <label className="form-label">Quota in Megabytes (MB)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(e.target.value)}
                    min="100"
                    required
                    style={{ marginBottom: '20px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Update Quota
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Password Reset Modal */}
          {modalType === 'password' && selectedUser && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Admin Password Reset</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Assign a new password for <strong>{selectedUser.email}</strong>
                </p>
                <form onSubmit={handleResetPassword}>
                  <label className="form-label">New Password (minimum 8 characters)</label>
                  <input
                    type="password"
                    className="input-field"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    minLength={8}
                    required
                    style={{ marginBottom: '20px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Set Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
