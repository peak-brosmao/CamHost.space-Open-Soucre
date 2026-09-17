import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const formatBytes = (b) => {
  if (!b || b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
};

const TAB_FILTERS = [
  { id: 'all', label: 'All Files' },
  { id: 'blocked', label: 'Blocked Files' },
  { id: 'reported', label: 'Reported Files' },
  { id: 'expired', label: 'Expired Files' },
];

export default function AdminFiles() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('filter') || 'all';
  const [activeFilter, setActiveFilter] = useState(defaultTab);
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchFiles = async (q = '', filter = activeFilter) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/files?q=${encodeURIComponent(q)}&filter=${filter}&limit=100`);
      setFiles(res.files || []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(search, activeFilter); }, [activeFilter]);

  const handleBlock = async (f) => {
    try {
      const res = await apiRequest(`/admin/files/${f.id}/block`, { method: 'POST' });
      showToast(res.message, 'success');
      fetchFiles(search, activeFilter);
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Permanently delete "${f.original_name}"?`)) return;
    try {
      const res = await apiRequest(`/admin/files/${f.id}`, { method: 'DELETE' });
      showToast(res.message, 'success');
      fetchFiles(search, activeFilter);
    } catch (err) { showToast(err.message || 'Failed', 'error'); }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">File Management</h1>
          <p className="admin-page-desc">Browse, search, block, and delete files across all users.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        {TAB_FILTERS.map(t => (
          <button
            key={t.id}
            className={`admin-filter-tab ${activeFilter === t.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="admin-search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by file name or owner email…"
            value={search}
            onChange={e => { setSearch(e.target.value); fetchFiles(e.target.value, activeFilter); }}
          />
        </div>
        <span className="admin-count-badge">{total} file{total !== 1 ? 's' : ''}</span>
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
                  <th>File Name</th>
                  <th>Owner</th>
                  <th>Size</th>
                  <th>Downloads</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', wordBreak: 'break-all' }}>{f.original_name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', fontFamily: 'monospace' }}>
                        {f.telegram_file_id ? f.telegram_file_id.substring(0, 22) + '…' : 'No TG ID'}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.owner_email}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBytes(f.size_bytes)}</td>
                    <td>{f.downloads || 0}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {f.is_blocked
                        ? <span className="admin-badge danger">Blocked</span>
                        : <span className="admin-badge success">Active</span>
                      }
                    </td>
                    <td>
                      <div className="admin-action-row" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className={`admin-btn-xs ${f.is_blocked ? 'secondary' : 'warning'}`}
                          onClick={() => handleBlock(f)}
                        >
                          {f.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                        <button className="admin-btn-xs danger" onClick={() => handleDelete(f)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr><td colSpan="7" className="admin-table-empty">No files found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
