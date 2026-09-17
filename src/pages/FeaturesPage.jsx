import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function FeaturesPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
        </svg>
      ),
      color: 'var(--cyan)',
      title: 'Truly Unlimited Cloud Storage',
      desc: 'By harnessing Telegram’s globally distributed data centers as the storage backend, CamHost provides infinite capacity with no storage tiers, monthly bills, or artificial caps.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      color: '#9d7aff',
      title: 'Massive 2 GB File Uploads',
      desc: 'Upload multi-gigabyte ISOs, installer setups (.exe, .msi), 4K videos, raw audio tracks, and archives without hitting typical web hosting limits.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      color: '#00c97a',
      title: 'Private by Default & Instant Revocation',
      desc: 'Every file uploaded is strictly private. Generate public links when desired, set download limits, or click "Set to Private" to instantly disable access.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      color: '#ffab2e',
      title: 'Configurable Download Limits',
      desc: 'Prevent bandwidth abuse and control distribution by capping how many times a public link can be downloaded before it automatically expires.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      color: '#00d4ff',
      title: 'Nested Folders & Instant Search',
      desc: 'Group documents, projects, and media into custom folders. Search files in real-time with sub-millisecond filtering and flexible sorting.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      color: '#ff4f66',
      title: 'RFC 6266 Direct Streaming',
      desc: 'Direct HTTP proxy streaming ensures browsers download directly to disk without memory exhaustion, preserving original filenames and extensions perfectly.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
        </svg>
      ),
      color: '#ffbd2e',
      title: 'Adaptive Light & Dark Aesthetics',
      desc: 'Crafted with premium glassmorphism, dynamic color accents, and instant theme switching that persists seamlessly across sessions.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: '#9d7aff',
      title: 'Complete Admin Control Center',
      desc: 'Enterprise administrator suite with 18 operational settings panels, live telemetry, user activity feeds, and comprehensive security audit logs.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      color: 'var(--cyan)',
      title: '100% Free & Open Source',
      desc: 'Zero proprietary locks or telemetry. Review the code, fork the repository on GitHub, or self-host your own CamHost instance in under 5 minutes.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1140px', margin: '0 auto', width: '100%', padding: '50px 20px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
            Next-Generation Cloud
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Built for Independence and Speed
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
            Explore every feature that makes CamHost.space the premier open-source cloud storage alternative to big tech subscriptions.
          </p>
        </div>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '60px' }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="stat-card"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '28px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: `${f.color}15`,
                  color: f.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                {f.icon}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
                {f.title}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(123,79,255,0.08) 100%)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '12px' }}>
            Ready to Take Control of Your Cloud?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', maxWidth: '500px', margin: '0 auto 28px' }}>
            Join thousands of users storing their photos, software, and documents securely with zero monthly fees.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link to={user ? '/files' : '/register'} className="btn btn-primary" style={{ padding: '12px 28px' }}>
              {user ? 'Go to My Files' : 'Create Free Account'}
            </Link>
            <Link to="/preview" className="btn btn-ghost" style={{ padding: '12px 24px' }}>
              Test Cloud Explorer
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <Link to="/" className="crumb-item">Home</Link>
          <Link to="/features" className="crumb-item">Features</Link>
          <Link to="/preview" className="crumb-item">Explorer</Link>
          <Link to="/how-it-works" className="crumb-item">How It Works</Link>
          <Link to="/opensource" className="crumb-item">Open Source</Link>
          <Link to="/blog" className="crumb-item">Blog</Link>
        </div>
        <div>&copy; 2026 CamHost.space &middot; Developed by <a href="https://peakbrosmao.me" target="_blank" rel="noopener" style={{ color: 'var(--cyan)', fontWeight: 700, textDecoration: 'none' }}>PEAK BROSMAO</a></div>
      </footer>
    </div>
  );
}
