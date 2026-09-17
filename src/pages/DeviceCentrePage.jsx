import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function DeviceCentrePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notified, setNotified] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');

  const handleNotifyMe = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setNotified(true);
    showToast(`You're on the list! We will notify ${emailInput} when Device Centre launches.`, 'success');
  };

  const breadcrumbs = [
    { label: 'Storage', to: '/files' },
    { label: 'Device centre', active: true },
  ];

  const upcomingFeatures = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      color: 'var(--cyan)',
      title: 'Native Desktop Sync App',
      tag: 'Windows · macOS · Linux',
      desc: 'Real-time two-way sync folder directly inside Windows File Explorer and macOS Finder. Edit files locally with automatic cloud backup.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
      color: '#a78bfa',
      title: 'iOS & Android Mobile Apps',
      tag: 'Apple App Store · Google Play',
      desc: 'Instant camera roll auto-upload, offline file viewer, biometric face/fingerprint lock, and instant streaming on the go.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      color: '#00e08b',
      title: 'Virtual Network Drive (WebDAV)',
      tag: 'Zero Local Disk Footprint',
      desc: 'Mount unlimited CamHost cloud storage directly as a virtual network drive (Drive Z:) without filling up your internal hard drive.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: '#ffab2e',
      title: 'Remote Device Security & 2FA',
      tag: 'Enterprise Shield',
      desc: 'View all active sessions, inspect device operating systems and IP locations, and remotely revoke any compromised session with one tap.',
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} breadcrumbs={breadcrumbs} />

        <main className="dashboard-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
          {/* Main Coming Soon Hero Card */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(8, 13, 26, 0.95) 0%, rgba(5, 8, 16, 0.98) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              borderRadius: '24px',
              padding: '48px 32px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              marginBottom: '36px',
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '380px',
                height: '240px',
                background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
              }}
            />

            {/* Glowing Icon */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(123, 79, 255, 0.15) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.4)',
                color: 'var(--cyan)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 0 30px rgba(0, 212, 255, 0.25)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>

            {/* Status Pill */}
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  background: 'rgba(0, 212, 255, 0.12)',
                  color: 'var(--cyan)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 2s infinite' }} />
                Coming Soon · In Active Development
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 14px',
                letterSpacing: '-0.02em',
              }}
            >
              CamHost Device Centre
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-muted)',
                maxWidth: '620px',
                margin: '0 auto 28px',
                lineHeight: 1.6,
              }}
            >
              We're building official native desktop synchronization clients, mobile applications with automatic camera roll backup, and virtual network drive integration.
            </p>

            {/* Notify Me Form */}
            {!notified ? (
              <form
                onSubmit={handleNotifyMe}
                style={{
                  display: 'flex',
                  maxWidth: '460px',
                  margin: '0 auto 24px',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '6px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <input
                  type="email"
                  placeholder="Enter your email for early access"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '8px 14px',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                  Notify Me
                </button>
              </form>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'rgba(0, 224, 139, 0.15)',
                  color: '#00e08b',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  marginBottom: '24px',
                  border: '1px solid rgba(0, 224, 139, 0.3)',
                }}
              >
                ✓ You're on the early access priority list!
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/files" className="btn btn-secondary">
                ← Back to My Files
              </Link>
              <Link to="/upload" className="btn btn-primary">
                Upload via Web Browser ↗
              </Link>
            </div>
          </div>

          {/* Feature Preview Roadmap Grid */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', textAlign: 'center' }}>
              What’s Arriving in Device Centre
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              {upcomingFeatures.map((feat) => (
                <div
                  key={feat.title}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: `${feat.color}18`,
                        color: feat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {feat.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'var(--surface-hover)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {feat.tag}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {feat.desc}
                    </p>
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
