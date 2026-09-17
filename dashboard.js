// =============================================
// CamHost.space — Dashboard JS
// API Client + UI Controller
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

const API_BASE = 'https://api.camhost.space';

// ── State ──────────────────────────────────────────────────────
const state = {
  token:  localStorage.getItem('camhost-token') || null,
  user:   null,
  files:  [],
  signups: [],
  search: '',
  sortBy: 'created_at',
  sortOrder: 'DESC',
  deleteTarget: null,
};

// ── API Helper ──────────────────────────────────────────────────
async function api(path, options = {}) {
  const headers = { 'Accept': 'application/json', ...(options.headers || {}) };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

  // Don't set Content-Type for FormData (let browser set multipart boundary)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(API_BASE + path, { ...options, headers });
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));

  if (!res.ok && !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

// ── Theme ───────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('camhost-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const theme = saved || preferred;
  document.documentElement.setAttribute('data-theme', theme);
})();

function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('camhost-theme', next);
  reinitOrbs();
}

// ── Canvas Background (reused from landing page) ────────────────
let canvas, ctx, orbs = [], W, H, animFrame;

function initCanvas() {
  canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  initOrbs();
  loop();
  window.addEventListener('resize', () => { resize(); initOrbs(); });
}

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }

function makeOrb() {
  const dp = ['rgba(0,212,255,','rgba(123,79,255,','rgba(0,119,255,','rgba(255,107,157,'];
  const lp = ['rgba(0,150,255,','rgba(100,50,220,','rgba(0,100,255,','rgba(200,50,120,'];
  const pal = isLight() ? lp : dp;
  const color = pal[Math.floor(Math.random() * pal.length)];
  return {
    x: Math.random() * W, y: Math.random() * H,
    r: 120 + Math.random() * 220,
    alpha: isLight() ? 0.05 + Math.random() * 0.05 : 0.03 + Math.random() * 0.05,
    vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, color,
  };
}

function initOrbs() { orbs = []; for (let i = 0; i < 7; i++) orbs.push(makeOrb()); }
function reinitOrbs() { initOrbs(); }

function loop() {
  ctx.clearRect(0, 0, W, H);
  orbs.forEach(o => {
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, o.color + o.alpha + ')');
    g.addColorStop(1, o.color + '0)');
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    o.x += o.vx; o.y += o.vy;
    if (o.x < -o.r) o.x = W + o.r;
    if (o.x > W + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = H + o.r;
    if (o.y > H + o.r) o.y = -o.r;
  });
  requestAnimationFrame(loop);
}

// ── Toast Notifications ──────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('hiding');
    t.addEventListener('animationend', () => t.remove());
  }, 3500);
}

// ── Auth ─────────────────────────────────────────────────────────
async function tryAutoLogin() {
  if (!state.token) return showAuthScreen();
  try {
    const res = await api('/auth/me');
    state.user = res;
    showDashboard();
  } catch {
    state.token = null;
    localStorage.removeItem('camhost-token');
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('dashboard').classList.remove('active');
}

function showDashboard() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('dashboard').classList.add('active');
  populateUserBadge();
  navigateTo('files');
  loadFiles();
}

function populateUserBadge() {
  if (!state.user) return;
  const email = state.user.email || '';
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-role').textContent  = state.user.role || 'admin';
  document.getElementById('user-avatar').textContent = email.charAt(0).toUpperCase();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('auth-error');

  errEl.classList.remove('visible');
  btn.disabled = true;
  btn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Logging in...';

  try {
    const res = await api('/auth/login', { method: 'POST', body: { email, password: pass } });
    state.token = res.token;
    state.user  = res.user;
    localStorage.setItem('camhost-token', res.token);
    showDashboard();
    showToast('Welcome back, ' + (res.user.email || 'admin') + '!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign In <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }
}

function logout() {
  state.token = null;
  state.user  = null;
  state.files = [];
  localStorage.removeItem('camhost-token');
  showAuthScreen();
  showToast('Logged out successfully', 'info');
}

// ── Navigation ───────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === 'page-' + page);
  });
  document.getElementById('topbar-title').textContent = {
    files:    '📁 My Files',
    upload:   '⬆️ Upload Files',
    signups:  '📧 Email Signups',
    settings: '⚙️ Settings',
  }[page] || 'Dashboard';

  closeSidebar();

  if (page === 'signups')  loadSignups();
  if (page === 'settings') loadSettings();
  if (page === 'files')    loadFiles();
}

// ── Sidebar (mobile) ─────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('visible');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ── Files Page ────────────────────────────────────────────────────
async function loadFiles(search = '') {
  const list = document.getElementById('file-list');
  list.innerHTML = skeletons(4);

  try {
    const params = new URLSearchParams({
      search, sort: state.sortBy, order: state.sortOrder, limit: 100
    });
    const res = await api('/files?' + params);
    state.files = res.files || [];
    renderFiles(state.files, res.total || 0);
  } catch (err) {
    showToast('Failed to load files: ' + err.message, 'error');
    list.innerHTML = '';
  }
}

function renderFiles(files, total) {
  const list    = document.getElementById('file-list');
  const countEl = document.getElementById('file-count');

  countEl.textContent = total + ' file' + (total !== 1 ? 's' : '');

  // Stats
  const totalSize = files.reduce((a, f) => a + (f.size_bytes || 0), 0);
  document.getElementById('stat-files').textContent   = total;
  document.getElementById('stat-storage').textContent = formatBytes(totalSize);

  if (!files.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
            <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="empty-title">No files uploaded yet</div>
        <div class="empty-sub">Go to <b>Upload Files</b> to get started.</div>
      </div>`;
    return;
  }

  list.innerHTML = files.map(f => fileCard(f)).join('');
}

function fileCard(f) {
  const icon = mimeIcon(f.mime_type);
  const date = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `
    <div class="file-card" id="file-${f.id}">
      <div class="file-type-icon ${icon.cls}">${icon.emoji}</div>
      <div class="file-info">
        <div class="file-name" title="${esc(f.original_name)}">${esc(f.original_name)}</div>
        <div class="file-meta">
          <span>${f.size_human || formatBytes(f.size_bytes)}</span>
          <span>·</span>
          <span>${esc(f.mime_type)}</span>
          <span>·</span>
          <span>${date}</span>
          ${f.description ? `<span>· ${esc(f.description)}</span>` : ''}
        </div>
      </div>
      <div class="file-actions">
        <button class="action-btn download" onclick="downloadFile(${f.id}, '${esc(f.original_name)}')" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="action-btn delete" onclick="confirmDelete(${f.id}, '${esc(f.original_name)}')" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`;
}

function mimeIcon(mime = '') {
  if (mime.startsWith('image/'))  return { cls: 'type-image', emoji: '🖼️' };
  if (mime.startsWith('video/'))  return { cls: 'type-video', emoji: '🎬' };
  if (mime.startsWith('audio/'))  return { cls: 'type-audio', emoji: '🎵' };
  if (mime.includes('pdf'))       return { cls: 'type-doc',   emoji: '📄' };
  if (mime.includes('word') || mime.includes('document')) return { cls: 'type-doc', emoji: '📝' };
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar')) return { cls: 'type-zip', emoji: '🗜️' };
  if (mime.includes('text/'))     return { cls: 'type-doc',   emoji: '📃' };
  return { cls: 'type-other', emoji: '📦' };
}

async function downloadFile(id, name) {
  showToast('Preparing download...', 'info');
  const url = `${API_BASE}/files/${id}/download?token=${encodeURIComponent(state.token)}`;
  const a   = document.createElement('a');
  a.href    = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function confirmDelete(id, name) {
  state.deleteTarget = { id, name };
  document.getElementById('modal-filename').textContent = name;
  document.getElementById('confirm-modal').classList.add('visible');
}

async function executeDelete() {
  const { id, name } = state.deleteTarget;
  document.getElementById('confirm-modal').classList.remove('visible');

  try {
    await api('/files/' + id, { method: 'DELETE' });
    document.getElementById('file-' + id)?.remove();
    state.files = state.files.filter(f => f.id !== id);
    showToast(`"${name}" deleted`, 'success');
    loadFiles(state.search); // Refresh stats
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

function onSearch(e) {
  state.search = e.target.value.trim();
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => loadFiles(state.search), 400);
}

// ── Upload Page ───────────────────────────────────────────────────
function initUploadZone() {
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handleFiles(input.files));
}

async function handleFiles(fileList) {
  if (!fileList || !fileList.length) return;
  const progress = document.getElementById('upload-progress');
  progress.classList.add('visible');

  for (const file of fileList) {
    await uploadSingleFile(file);
  }

  setTimeout(() => {
    progress.classList.remove('visible');
    document.getElementById('progress-list').innerHTML = '';
    loadFiles();
    showToast('All uploads complete!', 'success');
    navigateTo('files');
  }, 1500);
}

async function uploadSingleFile(file) {
  const id     = 'prog-' + Date.now() + Math.random().toString(36).slice(2);
  const list   = document.getElementById('progress-list');
  const item   = document.createElement('div');
  item.className = 'progress-item';
  item.id        = id;
  item.innerHTML = `
    <div class="progress-header">
      <span class="progress-name">${esc(file.name)}</span>
      <span class="progress-pct" id="${id}-pct">0%</span>
    </div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" id="${id}-bar"></div>
    </div>`;
  list.appendChild(item);

  try {
    const formData = new FormData();
    formData.append('file', file);

    await uploadWithProgress(`${API_BASE}/upload`, formData, state.token, (pct) => {
      document.getElementById(`${id}-pct`).textContent = pct + '%';
      document.getElementById(`${id}-bar`).style.width  = pct + '%';
    });

    document.getElementById(`${id}-pct`).textContent = '✓';
    document.getElementById(`${id}-bar`).classList.add('done');
    document.getElementById(`${id}-bar`).style.width = '100%';

  } catch (err) {
    document.getElementById(`${id}-pct`).textContent = '✗';
    document.getElementById(`${id}-bar`).classList.add('error');
    document.getElementById(`${id}-bar`).style.width = '100%';
    showToast('Upload failed: ' + err.message, 'error');
  }
}

function uploadWithProgress(url, formData, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        const j = JSON.parse(xhr.responseText || '{}');
        reject(new Error(j.error || 'HTTP ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// ── Signups Page ─────────────────────────────────────────────────
async function loadSignups() {
  const tbody = document.getElementById('signups-body');
  const count = document.getElementById('signups-count');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:32px">Loading...</td></tr>';

  try {
    const res = await api('/signup');
    state.signups = res.signups || [];
    count.textContent = res.total + ' subscriber' + (res.total !== 1 ? 's' : '');

    if (!res.signups.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:32px">No signups yet.</td></tr>';
      return;
    }

    tbody.innerHTML = res.signups.map((s, i) => `
      <tr>
        <td style="color:var(--text-muted);font-size:.8rem">${i + 1}</td>
        <td>${esc(s.email)}</td>
        <td>${new Date(s.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load signups: ' + err.message, 'error');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ff6b6b;padding:32px">Error loading signups.</td></tr>';
  }
}

// ── Settings Page ─────────────────────────────────────────────────
function loadSettings() {
  document.getElementById('settings-email').textContent = state.user?.email || '';
  document.getElementById('settings-role').textContent  = state.user?.role  || 'admin';
}

async function handleChangePassword(e) {
  e.preventDefault();
  const btn     = document.getElementById('change-pass-btn');
  const current = document.getElementById('current-pass').value;
  const newPass = document.getElementById('new-pass').value;
  const confirm = document.getElementById('confirm-pass').value;

  if (newPass !== confirm) {
    showToast('New passwords do not match', 'error');
    return;
  }
  if (newPass.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving...';

  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: { current_password: current, new_password: newPass },
    });
    showToast('Password changed successfully!', 'success');
    e.target.reset();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Update Password';
  }
}

// ── Utilities ─────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576)    return (bytes / 1048576).toFixed(2)    + ' MB';
  if (bytes >= 1024)       return (bytes / 1024).toFixed(2)       + ' KB';
  return bytes + ' B';
}

function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton" style="width:46px;height:46px;border-radius:12px;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skeleton" style="width:60%;height:14px;margin-bottom:8px"></div>
        <div class="skeleton" style="width:35%;height:11px"></div>
      </div>
    </div>`).join('');
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  tryAutoLogin();
  initUploadZone();

  // Auth form
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Theme toggle
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  // Mobile menu
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Search
  document.getElementById('file-search').addEventListener('input', onSearch);

  // Delete modal
  document.getElementById('modal-cancel').addEventListener('click',  () => document.getElementById('confirm-modal').classList.remove('visible'));
  document.getElementById('modal-confirm').addEventListener('click', executeDelete);

  // Change password form
  document.getElementById('change-pass-form').addEventListener('submit', handleChangePassword);

  // Sort buttons
  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.sort;
      if (state.sortBy === s) {
        state.sortOrder = state.sortOrder === 'DESC' ? 'ASC' : 'DESC';
      } else {
        state.sortBy    = s;
        state.sortOrder = 'DESC';
      }
      loadFiles(state.search);
    });
  });
});
