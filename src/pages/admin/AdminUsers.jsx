import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const formatBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
};

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h3 className="admin-modal-title">{title}</h3>
            {subtitle && <p className="admin-modal-sub">{subtitle}</p>}
          </div>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ user }) {
  if (user.is_banned) return <span className="admin-badge danger">Suspended</span>;
  if (user.is_verified) return <span className="admin-badge success">Verified</span>;
  return <span className="admin-badge warning">Unverified</span>;
}

export default function AdminUsers() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActivityView = location.pathname.includes('/activity');

  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'quota' | 'password' | 'detail'
  const [quotaInput, setQuotaInput] = useState('10240');
  const [confirmDelete, setConfirmDelete] = useState(null); // user object to confirm deletion
  const [newPassword, setNewPassword] = useState('');
  const { showToast } = useToast();
  const { user: me } = useAuth();

  const fetchUsers = async (q = '') => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/users?q=${encodeURIComponent(q)}&limit=100`);
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/users/activity');
      setActivities(res.activities || []);
    } catch (err) {
      showToast(err.message || 'Failed to load activity log', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActivityView) {
      fetchActivities();
    } else {
      fetchUsers(search);
    }
  }, [isActivityView]);

  const openModal = (u, type) => {
    setSelectedUser(u);
    if (type === 'quota') setQuotaInput(String(Math.round((u.storage_quota || 0) / 1024 / 1024)));
    if (type === 'password') setNewPassword('');
    setModalType(type);
  };

  const handleToggleBan = async (u) => {
    try {
      const res = await apiRequest(`/admin/users/${u.id}/ban`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchUsers(search);
    } catch (err) { showToast(err.message || 'Action failed', 'error'); }
  };

  const handleToggleRole = async (u) => {
    try {
      const res = await apiRequest(`/admin/users/${u.id}/role`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchUsers(search);
    } catch (err) { showToast(err.message || 'Action failed', 'error'); }
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/admin/users/${selectedUser.id}/quota`, {
        method: 'POST',
        body: { quota_mb: parseInt(quotaInput, 10) },
      });
      showToast(res.message, 'success');
      setModalType(null);
      fetchUsers(search);
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        body: { new_password: newPassword },
      });
      showToast(res.message, 'success');
      setModalType(null);
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleDeleteUser = async (u) => {
    try {
      const res = await apiRequest(`/admin/users/${u.id}/delete`, { method: 'POST' });
      showToast(res.message, 'success');
      setConfirmDelete(null);
      fetchUsers(search);
    } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
  };

  const filteredActivities = activities.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.action && a.action.toLowerCase().includes(q)) ||
      (a.details && a.details.toLowerCase().includes(q)) ||
      (a.admin_email && a.admin_email.toLowerCase().includes(q)) ||
      (a.ip_address && a.ip_address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {isActivityView ? 'User & System Activity' : 'User Management'}
          </h1>
          <p className="admin-page-desc">
            {isActivityView
              ? 'Real-time audit records of user registrations, security events, file updates, and administrative interventions.'
              : 'Search, manage, suspend, configure storage limits, and inspect registered users.'}
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="admin-filter-tabs">
        <button
          className={`admin-filter-tab ${!isActivityView ? 'active' : ''}`}
          onClick={() => navigate('/admin/users')}
        >
          All Users
        </button>
        <button
          className={`admin-filter-tab ${isActivityView ? 'active' : ''}`}
          onClick={() => navigate('/admin/users/activity')}
        >
          User Activity
        </button>
      </div>

      {/* Search + Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="admin-search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder={isActivityView ? 'Filter activities by action, user, or IP…' : 'Search by email or display name…'}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (!isActivityView) fetchUsers(e.target.value);
            }}
          />
        </div>
        {!isActivityView ? (
          <span className="admin-count-badge">{total} user{total !== 1 ? 's' : ''}</span>
        ) : (
          <span className="admin-count-badge">{filteredActivities.length} event{filteredActivities.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* All Users View */}
      {!isActivityView && (
        <div className="admin-card admin-table-card">
          {loading ? (
            <div className="admin-loading"><span className="spinner-lg" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Files</th>
                    <th>Storage</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-table-empty">No users found matching query.</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div className="admin-user-mini-avatar">
                              {(u.display_name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--adm-text)', fontSize: '0.84rem' }}>
                                {u.display_name || u.email.split('@')[0]}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--adm-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${u.role === 'admin' ? 'info' : 'neutral'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td><StatusBadge user={u} /></td>
                        <td>{u.total_files ?? 0}</td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--adm-text)' }}>{formatBytes(u.storage_used_bytes)}</span>
                            <span style={{ color: 'var(--adm-muted)', margin: '0 3px' }}>/</span>
                            <span style={{ color: 'var(--adm-muted)' }}>{formatBytes(u.storage_quota)}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--adm-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="admin-action-row" style={{ justifyContent: 'flex-end' }}>
                            <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'detail')}>View</button>
                            <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'quota')}>Quota</button>
                            <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'password')}>Pass</button>
                            {u.id !== me?.id && (
                              <>
                                <button className="admin-btn-xs secondary" onClick={() => handleToggleRole(u)}>
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                                <button
                                  className={`admin-btn-xs ${u.is_banned ? 'warning' : 'danger'}`}
                                  onClick={() => handleToggleBan(u)}
                                >
                                  {u.is_banned ? 'Unban' : 'Ban'}
                                </button>
                                <button
                                  className="admin-btn-xs danger"
                                  onClick={() => setConfirmDelete(u)}
                                  title="Permanently delete user"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Activity Stream View */}
      {isActivityView && (
        <div className="admin-card admin-table-card">
          {loading ? (
            <div className="admin-loading"><span className="spinner-lg" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Admin / Initiator</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-table-empty">No activity records recorded yet.</td>
                    </tr>
                  ) : (
                    filteredActivities.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', whiteSpace: 'nowrap' }}>
                          {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className={`admin-badge ${
                            a.action.includes('BAN') ? 'danger' :
                            a.action.includes('DELETE') ? 'danger' :
                            a.action.includes('PASSWORD') ? 'warning' :
                            a.action.includes('QUOTA') ? 'info' : 'success'
                          }`}>
                            {a.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--adm-text)' }}>
                          {a.admin_email || 'System'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-secondary)' }}>
                            {a.target_type ? `${a.target_type} #${a.target_id || ''}` : '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--adm-text)' }}>
                          {a.details || '—'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--adm-muted)', fontFamily: 'monospace' }}>
                          {a.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Detail Modal */}
      {modalType === 'detail' && selectedUser && (
        <Modal title="User Details" subtitle={selectedUser.email} onClose={() => setModalType(null)}>
          <div className="admin-detail-grid">
            <div><span className="admin-env-label">Display Name</span><strong>{selectedUser.display_name || '—'}</strong></div>
            <div><span className="admin-env-label">Email</span><strong>{selectedUser.email}</strong></div>
            <div><span className="admin-env-label">Role</span><strong>{selectedUser.role}</strong></div>
            <div><span className="admin-env-label">Status</span><StatusBadge user={selectedUser} /></div>
            <div><span className="admin-env-label">Files</span><strong>{selectedUser.total_files ?? 0}</strong></div>
            <div><span className="admin-env-label">Storage Used</span><strong>{formatBytes(selectedUser.storage_used_bytes)}</strong></div>
            <div><span className="admin-env-label">Quota</span><strong>{formatBytes(selectedUser.storage_quota)}</strong></div>
            <div><span className="admin-env-label">Joined</span><strong>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}</strong></div>
          </div>
          <div className="admin-modal-footer">
            <button className="btn-secondary" onClick={() => setModalType(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Quota Modal */}
      {modalType === 'quota' && selectedUser && (
        <Modal title="Set Storage Quota" subtitle={`Adjust limit for ${selectedUser.email}`} onClose={() => setModalType(null)}>
          <form onSubmit={handleSaveQuota}>
            <label className="form-label">Quota in Megabytes (MB)</label>
            <input type="number" className="input-field" value={quotaInput}
              onChange={e => setQuotaInput(e.target.value)} min="100" required style={{ marginBottom: 20 }} />
            <div className="admin-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Update Quota</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {modalType === 'password' && selectedUser && (
        <Modal title="Admin Password Reset" subtitle={`Set new password for ${selectedUser.email}`} onClose={() => setModalType(null)}>
          <form onSubmit={handleResetPassword}>
            <label className="form-label">New Password (min 8 chars)</label>
            <input type="password" className="input-field" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} minLength={8} required style={{ marginBottom: 20 }} />
            <div className="admin-modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Set Password</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal
          title="⚠️ Delete User Permanently"
          subtitle={`This will permanently remove ${confirmDelete.email}`}
          onClose={() => setConfirmDelete(null)}
        >
          <div style={{ padding: '4px 0 16px', fontSize: '0.88rem', color: 'var(--adm-text-secondary)', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 10 }}>
              Are you sure you want to <strong style={{ color: '#ef4444' }}>permanently delete</strong> this user?
            </p>
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 12,
              fontSize: '0.82rem'
            }}>
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--adm-text)' }}>User:</strong> {confirmDelete.display_name || confirmDelete.email}
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--adm-text)' }}>Email:</strong> {confirmDelete.email}
              </div>
              <div>
                <strong style={{ color: 'var(--adm-text)' }}>Files:</strong> {confirmDelete.total_files ?? 0} file(s) will also be deleted
              </div>
            </div>
            <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
              ⛔ This action cannot be undone. All user data and files will be permanently removed.
            </p>
          </div>
          <div className="admin-modal-footer">
            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              className="btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => handleDeleteUser(confirmDelete)}
            >
              Yes, Delete User
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
