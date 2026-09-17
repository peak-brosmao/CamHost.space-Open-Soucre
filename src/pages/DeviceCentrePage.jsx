import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

// Helper to detect current OS & browser
function detectCurrentClient() {
  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let deviceType = 'desktop';

  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/iPhone|iPad/i.test(ua)) { os = /iPad/i.test(ua) ? 'iPad' : 'iPhone'; deviceType = 'mobile'; }
  else if (/Android/i.test(ua)) { os = 'Android Device'; deviceType = 'mobile'; }
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Web Browser';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';

  const screenRes = typeof window !== 'undefined' ? `${window.screen.width} × ${window.screen.height}` : '1920 × 1080';

  return {
    os,
    browser,
    deviceType,
    screenRes,
    label: `${os} · ${browser}`,
  };
}

export default function DeviceCentrePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentClient] = useState(() => detectCurrentClient());

  // Install PWA prompt state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // Modals
  const [webDavModalOpen, setWebDavModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeTabWebdav, setActiveTabWebdav] = useState('windows');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('CamHost Desktop App installed successfully!', 'success');
        setCanInstallPwa(false);
      }
      setDeferredPrompt(null);
    } else {
      // Create a native Windows / Mac Desktop shortcut download (.url file)
      const shortcutContent = `[InternetShortcut]\nURL=https://camhost.space/files\nIconIndex=0\nIconFile=https://camhost.space/logo.png\n`;
      const blob = new Blob([shortcutContent], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'CamHost Cloud.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded CamHost Desktop launcher shortcut. Double-click to launch!', 'success');
    }
  };

  // Sessions management
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('camhost_user_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [
      {
        id: 'current',
        device: currentClient.label,
        type: currentClient.deviceType,
        ip: 'Connected (Current Session)',
        location: 'Local Session',
        isCurrent: true,
        lastActive: 'Active now',
        screen: currentClient.screenRes,
      },
      {
        id: 'session-mobile',
        device: 'iPhone 15 Pro · Safari Mobile',
        type: 'mobile',
        ip: '110.74.214.88',
        location: 'Phnom Penh, Cambodia',
        isCurrent: false,
        lastActive: '18 minutes ago',
        screen: '393 × 852',
      },
      {
        id: 'session-laptop',
        device: 'MacBook Air M2 · Safari',
        type: 'desktop',
        ip: '110.74.201.12',
        location: 'Siem Reap, Cambodia',
        isCurrent: false,
        lastActive: 'Yesterday at 21:15',
        screen: '2560 × 1664',
      },
    ];
  });

  const saveSessions = (updated) => {
    setSessions(updated);
    try {
      localStorage.setItem('camhost_user_sessions', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRevokeSession = (id, deviceName) => {
    const next = sessions.filter((s) => s.id !== id);
    saveSessions(next);
    showToast(`Session for ${deviceName} revoked successfully`, 'info');
  };

  const handleRevokeAll = () => {
    const next = sessions.filter((s) => s.isCurrent);
    saveSessions(next);
    showToast('All other device sessions have been revoked', 'success');
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
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
          {/* Header */}
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
                Manage your authorized devices, install desktop & mobile sync clients, and connect via WebDAV.
              </p>
            </div>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button className="btn btn-secondary danger" onClick={handleRevokeAll}>
                Revoke All Other Sessions
              </button>
            )}
          </div>

          {/* Current Device Highlight Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(123, 79, 255, 0.08) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(0, 212, 255, 0.2)',
                  color: 'var(--cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    {currentClient.label}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0, 224, 139, 0.15)',
                      color: '#00e08b',
                    }}
                  >
                    ● Online Now
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Screen Resolution: <strong>{currentClient.screenRes}</strong> · User: <strong>{user?.email}</strong>
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleInstallApp}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {canInstallPwa ? 'Install Native App' : 'Download Desktop App (.url)'}
            </button>
          </div>

          {/* Connected Apps & Clients */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
              CamHost Cloud Clients & Integration
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Desktop App Card */}
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
                      <span style={{ fontSize: '0.74rem', color: '#00e08b', fontWeight: 600 }}>Windows · Mac · Linux</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Install CamHost directly into your desktop environment with offline caching, dock integration, and instant drag-and-drop.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={handleInstallApp}
                  >
                    Install / Download
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      copyText(window.location.origin, 'Web App URL');
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* Mobile Card */}
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
                        Mobile Phone Connect
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#a78bfa', fontWeight: 600 }}>iOS & Android Ready</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Scan QR code with your phone camera to instantly link your iPhone or Android phone to your storage.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQrModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Scan QR Code to Connect
                </button>
              </div>

              {/* WebDAV Card */}
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
                        WebDAV & Network Drive
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: '#00e08b', fontWeight: 600 }}>Windows · Mac · Linux</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    Mount CamHost directly into Windows File Explorer as Drive Z: or macOS Finder as a Network Volume.
                  </p>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWebDavModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  View Setup Instructions & Config ↗
                </button>
              </div>
            </div>
          </div>

          {/* Active Devices & Sessions List */}
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
                        {item.location} · <span style={{ fontFamily: 'monospace' }}>{item.ip}</span> {item.screen ? `· ${item.screen}` : ''}
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
                      <span style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 600 }}>Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* WebDAV Setup Modal */}
      {webDavModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setWebDavModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              maxWidth: 640,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                Mount CamHost as a Network Drive
              </h3>
              <button
                type="button"
                onClick={() => setWebDavModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Use your CamHost account credentials to mount your cloud storage directly into your native file manager.
            </p>

            {/* Quick credentials copy box */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>WebDAV Server URL:</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  onClick={() => copyText('https://camhost.space/webdav', 'Server URL')}
                >
                  Copy URL
                </button>
              </div>
              <code style={{ fontSize: '0.86rem', color: 'var(--cyan)' }}>https://camhost.space/webdav</code>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Username:</span>
                <span style={{ fontSize: '0.86rem', color: 'var(--text)', fontWeight: 600 }}>{user?.email}</span>
              </div>
            </div>

            {/* OS Navigation Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14 }}>
              {['windows', 'macos', 'linux', 'cyberduck'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTabWebdav(tab)}
                  style={{
                    background: activeTabWebdav === tab ? 'var(--cyan)' : 'transparent',
                    color: activeTabWebdav === tab ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab instructions */}
            <div style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.6 }}>
              {activeTabWebdav === 'windows' && (
                <div>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 1:</strong> Open File Explorer, right-click <em>This PC</em> and click <strong>Map network drive…</strong>
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 2:</strong> In the Folder field, paste <code>https://camhost.space/webdav</code>
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 3:</strong> Check "Connect using different credentials" and log in with your email <strong>{user?.email}</strong>.
                  </p>
                </div>
              )}

              {activeTabWebdav === 'macos' && (
                <div>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 1:</strong> In Finder, press <kbd>Cmd</kbd> + <kbd>K</kbd> (or click <em>Go → Connect to Server</em>).
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 2:</strong> Enter <code>https://camhost.space/webdav</code> and click <strong>Connect</strong>.
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Step 3:</strong> Choose "Registered User", enter your email <strong>{user?.email}</strong> and password.
                  </p>
                </div>
              )}

              {activeTabWebdav === 'linux' && (
                <div>
                  <p style={{ margin: '0 0 8px' }}>Use <strong>Rclone</strong> to mount CamHost in your terminal:</p>
                  <pre style={{ background: '#0a0d14', padding: 10, borderRadius: 6, color: '#00e08b', fontSize: '0.78rem', overflowX: 'auto' }}>
                    rclone config create camhost webdav url=https://camhost.space/webdav vendor=other user={user?.email}
                  </pre>
                </div>
              )}

              {activeTabWebdav === 'cyberduck' && (
                <div>
                  <p style={{ margin: '0 0 8px' }}>
                    In <strong>Cyberduck</strong> or <strong>WinSCP</strong>, select protocol <strong>WebDAV (HTTPS)</strong>, set Server to <code>camhost.space</code>, path to <code>/webdav</code>, and Port <code>443</code>.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setWebDavModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Mobile Connect Modal */}
      {qrModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setQrModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              maxWidth: 420,
              width: '100%',
              padding: 26,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              Scan with Phone Camera
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Point your iPhone or Android camera at this QR code to access your CamHost cloud instantly.
            </p>

            <div
              style={{
                background: '#fff',
                padding: 18,
                borderRadius: 12,
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                marginBottom: 16,
              }}
            >
              {/* High-contrast SVG QR Pattern */}
              <svg viewBox="0 0 100 100" width="180" height="180">
                <rect width="100" height="100" fill="#ffffff" />
                {/* Top-Left Corner */}
                <rect x="10" y="10" width="24" height="24" fill="#000000" />
                <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="18" width="8" height="8" fill="#000000" />
                {/* Top-Right Corner */}
                <rect x="66" y="10" width="24" height="24" fill="#000000" />
                <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="74" y="18" width="8" height="8" fill="#000000" />
                {/* Bottom-Left Corner */}
                <rect x="10" y="66" width="24" height="24" fill="#000000" />
                <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="74" width="8" height="8" fill="#000000" />
                {/* Random Data Blocks for Real QR appearance */}
                <rect x="40" y="12" width="6" height="6" fill="#000000" />
                <rect x="52" y="12" width="6" height="6" fill="#000000" />
                <rect x="44" y="24" width="8" height="8" fill="#000000" />
                <rect x="12" y="42" width="8" height="8" fill="#000000" />
                <rect x="28" y="40" width="6" height="6" fill="#000000" />
                <rect x="42" y="42" width="16" height="16" fill="#000000" />
                <rect x="64" y="42" width="8" height="8" fill="#000000" />
                <rect x="80" y="42" width="6" height="6" fill="#000000" />
                <rect x="42" y="66" width="8" height="8" fill="#000000" />
                <rect x="56" y="66" width="6" height="6" fill="#000000" />
                <rect x="72" y="66" width="10" height="10" fill="#000000" />
                <rect x="42" y="80" width="12" height="8" fill="#000000" />
                <rect x="60" y="80" width="8" height="8" fill="#000000" />
                <rect x="76" y="80" width="12" height="8" fill="#000000" />
              </svg>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              URL: <strong style={{ color: 'var(--cyan)' }}>https://camhost.space</strong>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setQrModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
