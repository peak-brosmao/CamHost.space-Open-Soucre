import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest, relativeDate } from '../api/client';

export default function SignupsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Enforce admin permission
  useEffect(() => {
    if (!isAdmin) {
      navigate('/files');
    }
  }, [isAdmin, navigate]);

  const loadSignups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/signup');
      if (res && res.signups) {
        setSignups(res.signups);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load signups', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin) {
      loadSignups();
    }
  }, [isAdmin, loadSignups]);

  // Filter
  const filtered = signups.filter((s) =>
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Export CSV
  const exportCSV = () => {
    if (signups.length === 0) return;
    const header = ['ID', 'Email', 'Signed Up At', 'IP Address'];
    const rows = signups.map((s) => [
      s.id,
      `"${s.email}"`,
      `"${s.created_at || ''}"`,
      `"${s.ip_address || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `camhost_waitlist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Waitlist CSV exported successfully', 'success');
  };

  if (!isAdmin) return null;

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Storage', to: '/files' }, { label: 'Waitlist Subscribers', active: true }]}
          actions={
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={signups.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          }
        />

        <main className="dashboard-container">
          <div className="page-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 className="page-title">Waitlist Signups</h1>
                <span className="shared-badge" style={{ background: 'rgba(255, 171, 46, 0.15)', color: '#ffab2e' }}>
                  Admin Only
                </span>
              </div>
              <p className="page-desc">
                {signups.length} users signed up for CamHost early access notifications
              </p>
            </div>

            <div className="controls-row">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner-lg" />
              <p>Loading waitlist data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h3>No signups recorded</h3>
              <p>When visitors join the waitlist on the landing page, their emails will appear here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Email Address</th>
                    <th>Joined Date</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td style={{ color: 'var(--text-muted)' }}>{s.id || idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--text)' }}>{s.email}</strong>
                      </td>
                      <td>{relativeDate(s.created_at)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {s.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
