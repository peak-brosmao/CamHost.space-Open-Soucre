// =============================================
// CamHost.space — API Client & Helpers
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

export const API_BASE = import.meta.env.VITE_API_URL || 'https://api.camhost.space';

export function getToken() {
  return localStorage.getItem('ch-token');
}

export function setToken(token) {
  if (token) localStorage.setItem('ch-token', token);
  else localStorage.removeItem('ch-token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ch-user') || 'null');
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) localStorage.setItem('ch-user', JSON.stringify(user));
  else localStorage.removeItem('ch-user');
}

export async function apiRequest(path, opts = {}) {
  const token = getToken();
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
  }

  const url = path.startsWith('http') ? path : API_BASE + path;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({ success: false, error: 'Invalid response from server' }));

  if (!res.ok || (data && data.success === false)) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function downloadFile(path, fileName, token = null) {
  const t = token || getToken();
  let targetUrl = path.startsWith('http') ? path : API_BASE + path;
  if (t && !targetUrl.includes('token=')) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  }

  // Use direct native browser download to avoid Blob URL UUID naming issues in Chromium/Brave
  // and stream directly to disk with proper server Content-Disposition filename
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = targetUrl;
  if (fileName) {
    a.setAttribute('download', fileName);
  }
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
    } catch (e) {}
  }, 3000);
}

export function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();
    const url = path.startsWith('http') ? path : API_BASE + path;

    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
        onProgress(percent, e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status < 300 && json.success !== false) {
          if (onProgress) onProgress(100, 0, 0);
          resolve(json);
        } else {
          reject(new Error(json.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Invalid server response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network connection error'));
    xhr.send(formData);
  });
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function relativeDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    // Format: 9/16/2026, 21:38
    const datePart = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return iso;
  }
}


export function mimeInfo(mime = '') {
  if (mime.startsWith('image/')) return { color: '#00d4ff', label: 'IMG', bg: 'rgba(0,212,255,.12)' };
  if (mime.startsWith('video/')) return { color: '#7b4fff', label: 'VID', bg: 'rgba(123,79,255,.12)' };
  if (mime.startsWith('audio/')) return { color: '#00c97a', label: 'AUD', bg: 'rgba(0,201,122,.12)' };
  if (mime.includes('pdf')) return { color: '#ff4f66', label: 'PDF', bg: 'rgba(255,79,102,.12)' };
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) {
    return { color: '#ffab2e', label: 'ZIP', bg: 'rgba(255,171,46,.12)' };
  }
  if (mime.includes('dosexec') || mime.includes('x-msdownload') || mime.includes('exe')) {
    return { color: '#00d4ff', label: 'EXE', bg: 'rgba(0,212,255,.12)' };
  }
  if (mime.includes('word') || mime.includes('document')) return { color: '#0077ff', label: 'DOC', bg: 'rgba(0,119,255,.12)' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('javascript')) return { color: '#a0aec0', label: 'TXT', bg: 'rgba(160,174,192,.12)' };
  return { color: '#7b4fff', label: 'FILE', bg: 'rgba(123,79,255,.12)' };
}
