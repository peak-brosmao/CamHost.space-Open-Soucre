// =============================================
// CamHost.space — Shared App JS (_app.js)
// Auth guard · API client · Sidebar · Toast · Canvas
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

const API = 'https://api.camhost.space';

// ── Token helpers ─────────────────────────────────────────────────
const getToken = () => localStorage.getItem('ch-token');
const getUser  = () => { try { return JSON.parse(localStorage.getItem('ch-user') || 'null'); } catch { return null; } };

// ── API Client ────────────────────────────────────────────────────
async function apiRequest(path, opts = {}) {
  const token = getToken();
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  }
  const res  = await fetch(API + path, { ...opts, headers });
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
  if (!res.ok && !json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// XHR upload with progress callback
function apiUpload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API + path);
    xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload  = () => {
      const j = JSON.parse(xhr.responseText || '{}');
      xhr.status < 300 ? resolve(j) : reject(new Error(j.error || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// ── Auth Guard ─────────────────────────────────────────────────────
async function requireAuth() {
  const token = getToken();
  if (!token) { location.href = '/login.html'; return null; }
  try {
    const res = await apiRequest('/auth/me');
    localStorage.setItem('ch-user', JSON.stringify(res));
    return res;
  } catch {
    localStorage.removeItem('ch-token');
    localStorage.removeItem('ch-user');
    location.href = '/login.html';
    return null;
  }
}

function logout() {
  localStorage.removeItem('ch-token');
  localStorage.removeItem('ch-user');
  location.href = '/login.html';
}

// ── Sidebar ────────────────────────────────────────────────────────
function initSidebar(activePage) {
  // Set active nav link
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === activePage);
  });

  // Mobile toggle
  const menuBtn = document.getElementById('menu-btn');
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (overlay)  overlay.addEventListener('click', closeSidebar);
  function openSidebar()  { sidebar?.classList.add('open'); overlay?.classList.add('open'); }
  function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); }

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  // Theme toggle
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ch-theme', next);
    reinitCanvasOrbs?.();
  });
}

function fillUserBadge(user) {
  if (!user) return;
  const email = user.email || '';
  const el = id => document.getElementById(id);
  if (el('user-avatar')) el('user-avatar').textContent = email.charAt(0).toUpperCase();
  if (el('user-email'))  el('user-email').textContent  = email;
  if (el('user-role'))   el('user-role').textContent   = user.role || 'user';
}

// ── Theme init ─────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('ch-theme');
  const sys   = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', saved || sys);
})();

// ── Canvas background ──────────────────────────────────────────────
let _canvas, _ctx, _orbs = [], _W, _H;

function initCanvas() {
  _canvas = document.getElementById('bg-canvas');
  if (!_canvas) return;
  _ctx = _canvas.getContext('2d');
  resizeCanvas(); initCanvasOrbs(); canvasLoop();
  window.addEventListener('resize', () => { resizeCanvas(); initCanvasOrbs(); });
}

function resizeCanvas() { _W = _canvas.width = window.innerWidth; _H = _canvas.height = window.innerHeight; }

function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

function makeOrb() {
  const dp = ['rgba(0,212,255,','rgba(123,79,255,','rgba(0,119,255,','rgba(255,107,157,'];
  const lp = ['rgba(0,150,255,','rgba(100,50,220,','rgba(0,100,255,','rgba(200,50,120,'];
  const c  = (isLight() ? lp : dp)[Math.floor(Math.random() * 4)];
  return { x: Math.random()*_W, y: Math.random()*_H, r: 120+Math.random()*220,
           a: isLight() ? .04+Math.random()*.05 : .03+Math.random()*.05,
           vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25, c };
}
function initCanvasOrbs() { _orbs = Array.from({length:7}, makeOrb); }
function reinitCanvasOrbs() { initCanvasOrbs(); }
window.reinitCanvasOrbs = reinitCanvasOrbs;

function canvasLoop() {
  _ctx.clearRect(0,0,_W,_H);
  _orbs.forEach(o => {
    const g = _ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
    g.addColorStop(0, o.c+o.a+')'); g.addColorStop(1, o.c+'0)');
    _ctx.beginPath(); _ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
    _ctx.fillStyle = g; _ctx.fill();
    o.x+=o.vx; o.y+=o.vy;
    if(o.x<-o.r) o.x=_W+o.r; if(o.x>_W+o.r) o.x=-o.r;
    if(o.y<-o.r) o.y=_H+o.r; if(o.y>_H+o.r) o.y=-o.r;
  });
  requestAnimationFrame(canvasLoop);
}

// ── Toast ──────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('hiding'); t.addEventListener('animationend', () => t.remove()); }, 3500);
}

// ── Confirm Modal ──────────────────────────────────────────────────
let _confirmCallback = null;
function showConfirm(title, sub, onConfirm, type = 'danger') {
  const el = document.getElementById('confirm-modal');
  if (!el) return;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-sub').textContent   = sub;
  el.classList.add('open');
  _confirmCallback = onConfirm;
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirm-cancel') ?.addEventListener('click', () => { document.getElementById('confirm-modal')?.classList.remove('open'); });
  document.getElementById('confirm-ok')     ?.addEventListener('click', () => { document.getElementById('confirm-modal')?.classList.remove('open'); _confirmCallback?.(); });
});

// ── Utility ────────────────────────────────────────────────────────
function formatBytes(b) {
  if (!b) return '0 B';
  if (b >= 1073741824) return (b/1073741824).toFixed(2)+' GB';
  if (b >= 1048576)    return (b/1048576).toFixed(2)+' MB';
  if (b >= 1024)       return (b/1024).toFixed(2)+' KB';
  return b+' B';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mimeIcon(mime = '') {
  if (mime.startsWith('image/'))  return { emoji: '🖼️', cls: 'type-image' };
  if (mime.startsWith('video/'))  return { emoji: '🎬', cls: 'type-video' };
  if (mime.startsWith('audio/'))  return { emoji: '🎵', cls: 'type-audio' };
  if (mime.includes('pdf'))       return { emoji: '📄', cls: 'type-doc' };
  if (mime.includes('word') || mime.includes('document')) return { emoji: '📝', cls: 'type-doc' };
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return { emoji: '🗜️', cls: 'type-zip' };
  if (mime.includes('text/'))     return { emoji: '📃', cls: 'type-doc' };
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('php') || mime.includes('python')) return { emoji: '💻', cls: 'type-code' };
  return { emoji: '📦', cls: 'type-other' };
}

function relativeDate(iso) {
  const d = new Date(iso), now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60)+'m ago';
  if (diff < 86400)return Math.floor(diff/3600)+'h ago';
  if (diff < 604800) return Math.floor(diff/86400)+'d ago';
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

// ── Shared sidebar HTML snippet (call from each page) ──────────────
function renderSidebar(activePage) {
  const links = [
    { page:'files',    icon:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',                label:'My Files',    href:'files.html' },
    { page:'folders',  icon:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3"/>', label:'My Folders',  href:'folders.html' },
    { page:'upload',   icon:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',label:'Upload',      href:'upload.html' },
    { page:'signups',  icon:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',  label:'Signups',     href:'signups.html', admin:true },
    { page:'settings', icon:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',label:'Settings',    href:'settings.html' },
  ];
  const user = getUser();
  const navHtml = links.map(l => `
    <a class="nav-link${l.page===activePage?' active':''}" data-page="${l.page}" href="${l.href}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17">${l.icon}</svg>
      ${l.label}
    </a>`).join('');

  const el = document.getElementById('sidebar');
  if (!el) return;
  el.innerHTML = `
    <a class="sidebar-logo" href="index.html">
      <div class="sidebar-logo-icon">
        <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
          <path d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z" fill="url(#sl)"/>
          <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95"/>
          <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8"/>
          <defs><linearGradient id="sl" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#00d4ff"/><stop offset="1" stop-color="#0077ff"/></linearGradient></defs>
        </svg>
      </div>
      <div><span class="sidebar-brand">CamHost<span class="sidebar-dot">.space</span></span><span class="sidebar-tag">File Manager</span></div>
    </a>
    <nav class="sidebar-nav">
      <span class="nav-section-label">Storage</span>
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar" id="user-avatar">A</div>
        <div style="flex:1;min-width:0">
          <div class="user-email" id="user-email">${user?.email || ''}</div>
          <div class="user-role"  id="user-role">${user?.role  || 'user'}</div>
        </div>
      </div>
      <button class="logout-btn" id="logout-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    </div>`;
}
