import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function ObjectStoragePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notified, setNotified] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');

  const handleJoinBeta = (e) => {
    e.preventDefault();
    if (!emailInput) return;
    setNotified(true);
    showToast(`Beta invitation registered for ${emailInput}! We'll send your API keys once S3 storage opens.`, 'success');
  };

  const breadcrumbs = [
    { label: 'Storage', to: '/files' },
    { label: 'Object storage', active: true },
  ];

  const s3Features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
      color: '#7b4fff',
      title: 'Full S3 API Compatibility',
      tag: 'AWS CLI · MinIO · Boto3',
      desc: 'Plug-and-play with any application using the AWS S3 SDK. Works seamlessly with Next.js, Django, Laravel, and WordPress S3 offload plugins.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      color: 'var(--cyan)',
      title: 'Zero Egress & Bandwidth Fees',
      tag: 'Unlimited MTProto CDN',
      desc: 'Free downloads and transfers with zero outbound network charges. Scale static assets, software binaries, and game assets without surprise cloud bills.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      color: '#00e08b',
      title: 'Scoped IAM Access Keys',
      tag: 'Granular Permissions',
      desc: 'Generate separate Access Key IDs and Secret Keys per bucket with read-only, write-only, or full admin permissions.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      color: '#ffab2e',
      title: 'Global Edge Acceleration',
      tag: 'Custom Domain CNAME',
      desc: 'Attach custom domains (e.g. assets.yourdomain.com) with automated Let’s Encrypt SSL and high-performance global CDN edge caching.',
    },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} breadcrumbs={breadcrumbs} />

        <main className="dashboard-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
          {/* Main Coming Soon Card */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(8, 13, 26, 0.95) 0%, rgba(5, 8, 16, 0.98) 100%)',
              border: '1px solid rgba(123, 79, 255, 0.3)',
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
                background: 'radial-gradient(circle, rgba(123, 79, 255, 0.25) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, rgba(123, 79, 255, 0.2) 0%, rgba(0, 212, 255, 0.15) 100%)',
                border: '1px solid rgba(123, 79, 255, 0.4)',
                color: '#a78bfa',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 0 30px rgba(123, 79, 255, 0.25)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
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
                  background: 'rgba(123, 79, 255, 0.15)',
                  color: '#a78bfa',
                  border: '1px solid rgba(123, 79, 255, 0.35)',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 2s infinite' }} />
                Coming Soon · Enterprise S3 Infrastructure
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
              S3-Compatible Object Storage
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
              Programmatic cloud object storage engineered for developers, backend servers, and web applications. Deploy S3 buckets with unlimited capacity and zero bandwidth fees.
            </p>

            {/* Beta Signup Form */}
            {!notified ? (
              <form
                onSubmit={handleJoinBeta}
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
                  placeholder="Enter email for private beta access"
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    background: 'linear-gradient(135deg, #7b4fff 0%, #00d4ff 100%)',
                  }}
                >
                  Join Beta
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
                ✓ Beta registration received! You will receive early access keys.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/files" className="btn btn-secondary">
                ← Back to My Files
              </Link>
              <Link to="/upload" className="btn btn-primary">
                Upload Files via Web ↗
              </Link>
            </div>
          </div>

          {/* S3 Specs & Roadmap Grid */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', textAlign: 'center' }}>
              Architecture & S3 Capabilities
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              {s3Features.map((feat) => (
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
