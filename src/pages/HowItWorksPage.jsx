import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function HowItWorksPage() {
  const { user } = useAuth();

  const steps = [
    {
      num: '01',
      title: 'Browser Multipart Upload',
      tag: 'Client Layer',
      desc: 'You select or drag-and-drop any document, photo, video, or installer into CamHost. The browser sends the file directly to the CamHost API without third-party trackers or client-side file compression.',
      highlight: 'Streams directly from browser',
    },
    {
      num: '02',
      title: 'Security Verification & Forwarding',
      tag: 'API Gateway',
      desc: 'CamHost authenticates your JWT session token, checks rate limits, and inspects file extensions to ensure dangerous server scripts (.php, .htaccess) are blocked while desktop software (.exe, .apk) passes freely.',
      highlight: 'Protects host & keeps credentials private',
    },
    {
      num: '03',
      title: 'Telegram Infrastructure Storage',
      tag: 'Storage Backplane',
      desc: 'Instead of consuming space on your hosting disk, CamHost forwards the stream to your private Telegram storage channel via Telegram Bot API. Telegram assigns an immutable file_id across its global CDN.',
      highlight: 'Unlimited distributed storage for $0',
    },
    {
      num: '04',
      title: 'Lightweight SQLite Indexing',
      tag: 'Database Layer',
      desc: 'Only file metadata (original filename, MIME type, file size, timestamps, folder IDs, and share tokens) is recorded into a self-contained SQLite database with WAL concurrency.',
      highlight: 'Zero storage disk bloat on your host',
    },
    {
      num: '05',
      title: 'Direct Proxy Streaming Download',
      tag: 'Download Engine',
      desc: 'When downloading, CamHost retrieves the file stream from Telegram and proxies it to your browser using RFC 6266 Content-Disposition headers. Your browser saves the file with its exact original name (.exe, .zip).',
      highlight: 'Streams directly to disk with original filename',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '50px 20px 80px' }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
            Under the Hood
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            How CamHost Works
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.65 }}>
            Learn how CamHost combines a lightweight PHP API, encrypted SQLite database, and Telegram’s infinite data center network into a seamless private cloud.
          </p>
        </div>

        {/* Visual Architecture Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '60px' }}>
          {steps.map((step, idx) => (
            <div
              key={step.num}
              style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start',
                padding: '28px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--cyan)',
                  background: 'rgba(0,212,255,0.1)',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  lineHeight: 1,
                }}
              >
                {step.num}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge badge-cyan">{step.tag}</span>
                  <span style={{ fontSize: '0.8rem', color: '#00c97a', fontWeight: 600 }}>
                    {step.highlight}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
                  {step.title}
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>
            Frequently Asked Technical Questions
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--cyan)' }}>
                Can Telegram see my files?
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Files are stored inside your private Telegram Channel accessible only through your bot token. The channel is private and unlisted.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--cyan)' }}>
                Is there really no storage quota?
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Yes! Telegram channels have no total capacity limits. You can store hundreds of gigabytes or terabytes without storage exhaustion.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--cyan)' }}>
                What is the maximum file size?
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                With standard Telegram Bot Cloud API, files up to 50 MB can be sent. With a local Telegram Bot API Server, files up to 2,000 MB (2 GB) are supported.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--cyan)' }}>
                What happens if my web host crashes?
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your files remain completely safe inside Telegram's data centers. Restoring your site merely requires your SQLite database (camhost.db) and .env file.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link to={user ? '/files' : '/register'} className="btn btn-primary" style={{ padding: '14px 32px' }}>
            {user ? 'Open My Storage' : 'Create Free Account Now'}
          </Link>
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
