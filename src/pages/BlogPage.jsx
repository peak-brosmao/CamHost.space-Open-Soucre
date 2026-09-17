import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';

export const BLOG_POSTS = [
  {
    slug: 'how-telegram-cloud-works',
    title: 'How CamHost Uses Telegram as an Infinite Cloud Storage Backplane',
    category: 'Architecture',
    date: 'Sep 17, 2026',
    readTime: '5 min read',
    excerpt: 'Deep dive into the distributed storage architecture that allows CamHost to store files securely on Telegram without subscription fees or storage quotas.',
    content: `
### The Vision: Cloud Storage Without Artificial Limits

Traditional cloud storage providers (Google Drive, Dropbox, OneDrive) impose strict monthly subscription fees, storage quotas, and complex recurring plans. Yet Telegram, built on a robust globally distributed data center network, has offered free, persistent file transmission and storage for over a decade.

CamHost bridges this gap by acting as an enterprise-grade private web client on top of Telegram's infrastructure.

### How The Architecture Operates

1. **Client-to-Proxy Upload**: When you drag and drop a file into CamHost, the browser streams it directly to your CamHost PHP proxy server.
2. **Streaming to Telegram Bot API**: Rather than storing massive gigabytes on your web host's SSD, CamHost immediately forwards the multipart stream to your dedicated private Telegram storage channel via Telegram Bot API.
3. **Telegram Message & File ID Capture**: Telegram returns a persistent \`telegram_file_id\` and \`message_id\`.
4. **Metadata in SQLite**: CamHost saves the original filename, MIME type, file size, timestamps, and ownership securely in a lightweight SQLite database.
5. **Zero Web Host Storage Footprint**: Your web hosting server only acts as a fast transmission pipeline; your actual files reside securely within Telegram's encrypted data centers.

### Privacy & Sovereignty

Your Telegram Bot Token and Chat ID never leave your server's secure \`.env\` configuration. Downloads are proxied with strict authentication and customizable download limits, ensuring your data remains private and strictly under your control.
    `
  },
  {
    slug: 'streaming-2gb-files',
    title: 'Engineering 2GB High-Speed File Streaming with PHP & Telegram Bot API',
    category: 'Engineering',
    date: 'Sep 15, 2026',
    readTime: '6 min read',
    excerpt: 'How we solved memory exhaustion, output buffering, and RFC 6266 Content-Disposition headers for seamless large-file downloads.',
    content: `
### The Challenge of Large File Downloads in PHP

Streaming large files (up to 2GB) through PHP often triggers \`memory_limit\` crashes, script execution timeouts, and browser naming glitches. 

Here is how CamHost achieves smooth, memory-efficient streaming for files of any size:

\`\`\`php
function proxyDownload(string $url, string $name, string $mime): void {
    // Disable all output buffers to prevent RAM exhaustion
    while (ob_get_level()) ob_end_clean();

    $safeName = basename($name);
    $asciiName = preg_replace('/[^\\x20-\\x7e]/', '', str_replace(['"', ';', '\\\\', '/'], '', $safeName));
    $encodedName = rawurlencode($safeName);

    // RFC 6266 headers for universal browser filename preservation
    header('Content-Type: ' . ($mime ?: 'application/octet-stream'));
    header('Content-Disposition: attachment; filename="' . $asciiName . '"; filename*=UTF-8\\'\\'' . $encodedName);
    header('X-Accel-Buffering: no');
    header('Cache-Control: private, no-cache, no-store, must-revalidate');

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_TIMEOUT        => 3600,
        CURLOPT_CONNECTTIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_BUFFERSIZE     => 131072, // 128 KB chunks
        CURLOPT_WRITEFUNCTION  => function($curl, $data) {
            echo $data;
            flush(); // Stream chunks to browser immediately
            return strlen($data);
        },
    ]);
    curl_exec($ch);
    curl_close($ch);
    exit;
}
\`\`\`

### Why Direct Streaming Trumps Client-Side Blobs

Earlier implementations used JavaScript \`fetch() -> res.blob()\`. While acceptable for small documents, fetching a 1.5 GB video into JavaScript memory causes browser tabs to crash and causes Chromium to drop filename headers into UUIDs. 

Switching to native HTTP streams allows the browser's native download manager to handle disk writes directly at maximum line speeds.
    `
  },
  {
    slug: 'securing-personal-cloud',
    title: 'Securing Your Personal Cloud: Passkeys, Download Limits & Audit Trails',
    category: 'Security',
    date: 'Sep 12, 2026',
    readTime: '4 min read',
    excerpt: 'Explore CamHost’s multi-layered security model including JWT authentication, rate limiting, and instant privacy toggles.',
    content: `
### Security by Design

When hosting personal documents, software installers, and sensitive files, cloud security cannot be an afterthought. CamHost is built with defense-in-depth principles:

- **JWT Session Tokens**: Fast, stateless, cryptographically signed JSON Web Tokens (HMAC-SHA256) protect every API request.
- **Instant Privacy Controls**: Files uploaded are private by default. When sharing is enabled, owners can set a **Download Limit** or click **Set to Private** to revoke links in milliseconds.
- **Server Shell Prevention**: Executable server scripts (\`.php\`, \`.phtml\`, \`.htaccess\`) are strictly barred from upload, keeping your host safe while allowing desktop software like \`.exe\`, \`.apk\`, and \`.iso\` to store freely.
- **Admin Audit Trail**: Every critical action &mdash; logins, password resets, file deletions, and user moderation &mdash; is recorded with IP stamps in the audit log.
    `
  },
  {
    slug: 'zero-subscription-storage',
    title: 'Zero Monthly Subscriptions: Why We Built an Open-Source Cloud',
    category: 'Guides',
    date: 'Sep 8, 2026',
    readTime: '4 min read',
    excerpt: 'Why data sovereignty matters, and how open source empowers individuals to own their cloud rather than renting it.',
    content: `
### Renting vs. Owning Your Cloud

Most consumers pay $10–$30 every single month for cloud storage subscriptions. When subscriptions lapse or payment details expire, access to years of photographs and critical documents is held hostage.

CamHost.space was created with one simple conviction: **Personal cloud storage should be permanent, sovereign, and free.**

- **No Vendor Lock-in**: Full access to your SQLite database and raw file tokens.
- **One-Click Deployment**: Runs on any affordable standard PHP web host or self-hosted Docker container.
- **100% Free & Open Source**: Licensed under MIT, so you can inspect, modify, and customize every single line of code.
    `
  }
];

export default function BlogPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const activePost = slug ? BLOG_POSTS.find((p) => p.slug === slug) : null;

  const categories = ['All', 'Architecture', 'Engineering', 'Security', 'Guides'];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesCat = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '40px 20px 80px' }}>
        {activePost ? (
          /* Single Article Reader View */
          <article style={{ maxWidth: '820px', margin: '0 auto' }}>
            <button
              onClick={() => navigate('/blog')}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Blog
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span className="badge badge-cyan">{activePost.category}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{activePost.date}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>&middot;</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{activePost.readTime}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, lineHeight: 1.25, marginBottom: '20px' }}>
              {activePost.title}
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px', borderLeft: '3px solid var(--cyan)', paddingLeft: '16px' }}>
              {activePost.excerpt}
            </p>

            <div
              className="article-body"
              style={{
                fontSize: '1rem',
                lineHeight: 1.8,
                color: 'var(--text)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '32px',
              }}
            >
              {activePost.content.trim().split('\n\n').map((para, i) => {
                if (para.startsWith('### ')) {
                  return <h3 key={i} style={{ fontSize: '1.28rem', fontWeight: 700, margin: '28px 0 12px', color: 'var(--cyan)' }}>{para.replace('### ', '')}</h3>;
                }
                if (para.startsWith('```')) {
                  const lines = para.split('\n');
                  const code = lines.slice(1, -1).join('\n');
                  return (
                    <pre key={i} style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', overflowX: 'auto', fontSize: '0.86rem', margin: '16px 0', fontFamily: 'monospace' }}>
                      <code>{code}</code>
                    </pre>
                  );
                }
                if (para.startsWith('1. ') || para.startsWith('- ')) {
                  const items = para.split('\n');
                  return (
                    <ul key={i} style={{ paddingLeft: '24px', margin: '14px 0' }}>
                      {items.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>
                          {item.replace(/^[0-9]+\.\s+/, '').replace(/^-\s+/, '')}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i} style={{ marginBottom: '16px' }}>{para}</p>;
              })}
            </div>
          </article>
        ) : (
          /* Blog Post Catalog View */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '50px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Engineering &amp; Insights
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                CamHost Blog
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '580px', margin: '0 auto' }}>
                Technical deep-dives, architectural explorations, and release announcements for modern open-source cloud storage.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`folder-chip ${selectedCategory === cat ? 'active' : ''}`}
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="search-box" style={{ width: '260px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Grid of Articles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px' }}>
              {filteredPosts.map((post) => (
                <div
                  key={post.slug}
                  className="file-card"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  style={{ cursor: 'pointer', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, box-shadow 0.2s' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span className="badge badge-cyan">{post.category}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{post.readTime}</span>
                    </div>

                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '10px', color: 'var(--text)' }}>
                      {post.title}
                    </h2>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                      {post.excerpt}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{post.date}</span>
                    <span style={{ color: 'var(--cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Read Article &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <p>No articles found matching "{search}".</p>
              </div>
            )}
          </div>
        )}
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
