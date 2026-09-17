import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useToast } from '../components/Toast';

export default function OpenSourcePage() {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const gitCloneCmd = 'git clone https://github.com/peak-brosmao/CamHost.space-Open-Soucre.git';

  const copyCommand = () => {
    navigator.clipboard.writeText(gitCloneCmd);
    setCopied(true);
    showToast('Command copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const dockerSnippet = `version: '3.8'

services:
  camhost:
    image: php:8.2-apache
    container_name: camhost-cloud
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./api:/var/www/html/api
      - ./dist:/var/www/html
    environment:
      - TELEGRAM_BOT_TOKEN=your_bot_token_here
      - TELEGRAM_CHAT_ID=-100xxxxxxxxxx
      - JWT_SECRET=your_random_secret_string`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '50px 20px 80px' }}>
        {/* Banner */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
            Free Software &middot; MIT License
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Open Source &middot; 100% Community Driven
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.65 }}>
            CamHost.space is completely free software. Inspect the source code, self-host on your own infrastructure, or submit pull requests.
          </p>
        </div>

        {/* GitHub Repository Spotlight Box */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>peak-brosmao / CamHost.space-Open-Soucre</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '560px' }}>
              Official repository containing the full React 18 single-page application and backend PHP Telegram transmission engine.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href="https://github.com/peak-brosmao/CamHost.space-Open-Soucre"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Star on GitHub
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Start Clone */}
        <div style={{ marginBottom: '48px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
            Clone &amp; Run Locally
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px 18px',
            }}
          >
            <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--cyan)' }}>
              {gitCloneCmd}
            </code>
            <button
              onClick={copyCommand}
              className="btn btn-secondary btn-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Docker Self-Hosting Guide */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', marginBottom: '48px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
            Docker Compose Self-Hosting
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.6 }}>
            Run CamHost on your home lab, Raspberry Pi, or VPS with a single command using Docker:
          </p>
          <pre
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--text)',
              lineHeight: 1.6,
            }}
          >
            <code>{dockerSnippet}</code>
          </pre>
        </div>

        {/* Community & Contributing */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cyan)' }}>
              Contribute Code
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Whether fixing a bug, enhancing responsive layouts, or improving Telegram streaming speed, community pull requests are warmly welcomed.
            </p>
          </div>

          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#9d7aff' }}>
              Report Issues
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Found unexpected behavior or have an idea for a new cloud management feature? Submit an issue directly on GitHub.
            </p>
          </div>

          <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '24px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#00c97a' }}>
              MIT License
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Permissive license granting you complete freedom to use, modify, distribute, and self-host for both personal and commercial projects.
            </p>
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
