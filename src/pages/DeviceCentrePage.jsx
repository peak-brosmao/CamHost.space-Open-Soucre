import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function DeviceCentrePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Simulated sessions
  const [sessions, setSessions] = useState([
    {
      id: 'current',
      device: 'Windows PC · Chrome',
      type: 'desktop',
      ip: 'Current Device (Online)',
      location: 'Phnom Penh, Cambodia',
      isCurrent: true,
      lastActive: 'Active now',
    },
    {
      id: 'session-2',
      device: 'iPhone 15 Pro · Safari',
      type: 'mobile',
      ip: '110.74.214.88',
      location: 'Phnom Penh, Cambodia',
      isCurrent: false,
      lastActive: '2 hours ago',
    },
    {
      id: 'session-3',
      device: 'MacBook Air · Safari',
      type: 'desktop',
      ip: '110.74.201.12',
      location: 'Siem Reap, Cambodia',
      isCurrent: false,
      lastActive: 'Yesterday at 18:30',
    },
  ]);

  const handleRevokeSession = (id, deviceName) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showToast(`Session for ${deviceName} revoked successfully`, 'info');
  };

  const handleRevokeAll = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other device sessions have been revoked', 'success');
  };

  const breadcrumbs = [
    { label: 'Storage', to: '/files' },
    { label: 'Device centre', active: true },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} breadcrumbs={breadcrumbs} />

        <main className="dashboard-container">
          <div className="page-header" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" width="26" height="26">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                Device Centre
              </h1>
              <p className="page-subtitle">
                Manage your authorized devices, active browser sessions, and synchronization apps.
              </p>
            </div>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button className="btn btn-secondary danger" onClick={handleRevokeAll}>
                Revoke All Other Sessions
              </button>
            )}
          </div>

          {/* Connected Apps & Clients */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
              CamHost Official Sync Clients
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Desktop Sync Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(0, 212, 255, 0.12)',
                        color: 'var(--cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                        CamHost Desktop
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#00e08b', fontWeight: 600 }}>v2.4.2 · Stable</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Real-time two-way sync folder for Windows, macOS, and Linux. Automatically back up files directly to CamHost cloud.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => showToast('Download starting for Windows (x64)...', 'info')}
                  >
                    Download Windows (.exe)
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => showToast('macOS & Linux versions available in downloads section', 'info')}
                  >
                    macOS / Linux
                  </button>
                </div>
              </div>

              {/* Mobile App Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(121, 40, 202, 0.12)',
                        color: '#a78bfa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                        CamHost Mobile
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#a78bfa', fontWeight: 600 }}>iOS & Android</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Instant photo & video upload, offline file viewer, and biometric app lock on the go.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => showToast('App Store link copied or QR displayed', 'info')}
                  >
                    Apple App Store
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => showToast('Google Play link ready', 'info')}
                  >
                    Google Play
                  </button>
                </div>
              </div>

              {/* WebDAV / API Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(0, 224, 139, 0.12)',
                        color: '#00e08b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                        WebDAV & CLI Access
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#00e08b', fontWeight: 600 }}>Ready to mount</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Mount CamHost storage directly into Windows Explorer, macOS Finder, Linux rclone, or Synology NAS.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText('https://camhost.space/webdav');
                    showToast('WebDAV endpoint URL copied: https://camhost.space/webdav', 'success');
                  }}
                >
                  Copy WebDAV Endpoint URL
                </button>
              </div>
            </div>
          </div>

          {/* Active Sessions List */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                Active Devices & Sessions ({sessions.length})
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Account: <strong>{user?.email}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sessions.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: item.isCurrent ? 'rgba(0, 212, 255, 0.03)' : 'transparent',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: item.isCurrent ? 'rgba(0, 212, 255, 0.15)' : 'var(--surface-hover)',
                        color: item.isCurrent ? 'var(--cyan)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.type === 'mobile' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                          {item.device}
                        </span>
                        {item.isCurrent && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(0, 224, 139, 0.15)',
                              color: '#00e08b',
                            }}
                          >
                            Current Device
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.location} · <span style={{ fontFamily: 'monospace' }}>{item.ip}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{item.lastActive}</span>
                    </div>
                    {!item.isCurrent ? (
                      <button
                        className="btn btn-secondary btn-sm danger"
                        onClick={() => handleRevokeSession(item.id, item.device)}
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 500 }}>Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
