import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../api/client';
import { useToast } from '../components/Toast';
import Header from '../components/Header';

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await apiRequest('/signup', {
        method: 'POST',
        body: { email },
      });
      setSubscribed(true);
      showToast('Successfully subscribed to updates!', 'success');
      setEmail('');
    } catch (err) {
      showToast(err.message || 'Subscription failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 20px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '24px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)' }} />
          Open Source &middot; Free Forever &middot; Telegram Powered
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.8rem)', fontWeight: '900', lineHeight: '1.08', letterSpacing: '-0.03em', marginBottom: '20px' }}>
          Unlimited Private<br />
          <span style={{ background: 'linear-gradient(135deg, var(--cyan) 0%, var(--purple) 50%, var(--pink) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cloud Storage
          </span><br />
          Powered by Telegram
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto 36px', lineHeight: '1.65' }}>
          Upload anything directly from your web browser. Files are securely forwarded to Telegram's distributed cloud infrastructure &mdash; completely private, completely free. <strong>No limits. No subscription fees. 100% open source.</strong>
        </p>

        {/* Hero Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <Link to={user ? '/files' : '/register'} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '0.98rem' }}>
            {user ? 'Open My Files' : 'Start Storing Free'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
          {!user && (
            <Link to="/login" className="btn btn-ghost" style={{ padding: '14px 24px', fontSize: '0.98rem' }}>
              Sign In
            </Link>
          )}
          <a href="https://github.com/peak-brosmao/CamHost.space-Open-Soucre" target="_blank" rel="noopener" className="btn btn-ghost" style={{ padding: '14px 24px', fontSize: '0.98rem' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '50px' }}>
          <div className="folder-chip" style={{ cursor: 'default' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" /></svg>
            Unlimited Storage
          </div>
          <div className="folder-chip" style={{ cursor: 'default' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            Telegram Infrastructure
          </div>
          <div className="folder-chip" style={{ cursor: 'default' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Private &amp; Secure
          </div>
          <div className="folder-chip" style={{ cursor: 'default' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Up to 2 GB per File
          </div>
        </div>

        {/* Live Cloud Dashboard Mockup Preview */}
        <div id="preview" style={{ width: '100%', maxWidth: '860px', margin: '0 auto 60px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '20px 24px', textAlign: 'left', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                CamHost Cloud Explorer
              </div>
              <span className="badge badge-cyan">Live React Preview</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '16px' }}>
              <span className="folder-chip active">All Files</span>
              <span className="folder-chip">Media Backups</span>
              <span className="folder-chip">Documents</span>
              <span className="folder-chip">Archives</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(123,79,255,0.15)', color: '#9d7aff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.72rem' }}>MP4</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>project-presentation-4k.mp4</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1.4 GB &middot; Telegram Verified</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,149,0,0.15)', color: '#ffab2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.72rem' }}>ZIP</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>client-assets-final.zip</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>480 MB &middot; Uploaded 100%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Waitlist Form */}
        <div style={{ width: '100%', maxWidth: '520px', marginBottom: '60px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Get notified about major releases and self-hosting Docker updates
          </p>
          <form onSubmit={handleSignup} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ flex: 1, borderRadius: '50px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ borderRadius: '50px' }}>
              {loading ? 'Subscribing...' : 'Notify Me'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </form>
          {subscribed && (
            <p style={{ color: 'var(--cyan)', fontSize: '0.85rem', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12" /></svg>
              You're on the list! We will keep you updated.
            </p>
          )}
        </div>
      </main>

      {/* Stats Strip */}
      <div className="stats-row" style={{ maxWidth: '1000px', margin: '0 auto 70px', padding: '0 20px', width: '100%' }}>
        <div className="stat-card" style={{ textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--cyan)' }}>&infin;</div>
          <div className="stat-label">Storage Limit</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#9d7aff' }}>2 GB</div>
          <div className="stat-label">Max File Size</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--pink)' }}>$0</div>
          <div className="stat-label">Cost Forever</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--green)' }}>100%</div>
          <div className="stat-label">Open Source</div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto 70px', padding: '0 20px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Why Choose CamHost
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: '800', marginBottom: '12px' }}>
            Engineered for speed, privacy, and sovereignty.
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto', fontSize: '0.98rem' }}>
            No subscriptions, no corporate lock-in, and zero artificial limits.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '26px' }}>
            <div className="stat-icon si-cyan" style={{ marginBottom: '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" /></svg>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Truly Unlimited Storage</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Telegram provides infinite distributed cloud storage backplane with zero storage quotas.</p>
          </div>

          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '26px' }}>
            <div className="stat-icon si-purple" style={{ marginBottom: '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Private &amp; Encrypted</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Files stream exclusively to your private Telegram storage channel. Bot credentials stay hidden.</p>
          </div>

          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '26px' }}>
            <div className="stat-icon si-green" style={{ marginBottom: '12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>Fast 2 GB File Uploads</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Direct browser chunked uploading supports large multimedia files, archives, and disk images.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 6%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <a href="https://github.com/peak-brosmao/CamHost.space-Open-Soucre" target="_blank" rel="noopener" className="crumb-item">GitHub</a>
          <span>&middot;</span>
          <Link to="/login" className="crumb-item">Sign In</Link>
          <span>&middot;</span>
          <Link to="/register" className="crumb-item">Sign Up</Link>
          <span>&middot;</span>
          <Link to="/files" className="crumb-item">My Files</Link>
          <span>&middot;</span>
          <span>&copy; 2026 CamHost.space</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Developed by <a href="https://peakbrosmao.me" target="_blank" rel="noopener" style={{ color: 'var(--cyan)', fontWeight: '700', textDecoration: 'none' }}>PEAK BROSMAO</a>
        </div>
      </footer>
    </div>
  );
}
