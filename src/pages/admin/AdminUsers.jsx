import React, { useState, useEffect } from 'react';
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
      <div className="admin-modal glass-card" onClick={e => e.stopPropagation()}>
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
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'quota' | 'password' | 'detail'
  const [quotaInput, setQuotaInput] = useState('10240');
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

  useEffect(() => { fetchUsers(); }, []);

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

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-desc">Search, manage, suspend, and configure all registered users.</p>
        </div>
      </div>

      {/* Search + Count */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="admin-search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by email or display name…"
            value={search}
            onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value); }}
          />
        </div>
        <span className="admin-count-badge">{total} user{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="glass-card admin-table-card">
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
                  <th>Storage Used</th>
                  <th>Quota</th>
                  <th>Files</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-user-mini-avatar">{(u.display_name || u.email || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.display_name || 'No Name'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.role === 'admin' ? 'info' : 'neutral'}`}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td><StatusBadge user={u} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBytes(u.storage_used_bytes)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBytes(u.storage_quota)}</td>
                    <td>{u.total_files ?? 0}</td>
                    <td>
                      <div className="admin-action-row">
                        <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'detail')}>Details</button>
                        <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'quota')}>Quota</button>
                        <button className="admin-btn-xs secondary" onClick={() => openModal(u, 'password')}>Reset Pass</button>
                        {u.id !== me?.id && (
                          <>
                            <button className="admin-btn-xs secondary" onClick={() => handleToggleRole(u)}>
                              {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </button>
                            <button
                              className={`admin-btn-xs ${u.is_banned ? 'secondary' : 'danger'}`}
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
                  <tr><td colSpan="7" className="admin-table-empty">No users found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
}
