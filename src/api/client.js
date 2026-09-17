// =============================================
// CamHost.space — API Client & Helpers
// Developer: PEAK BROSMAO · peakbrosmao.me
// =============================================

export const API_BASE = 'https://api.camhost.space';

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

  if (!res.ok && !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
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
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || '{}');
        if (xhr.status < 300 && json.success !== false) {
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

export function mimeInfo(mime = '') {
  if (mime.startsWith('image/')) return { color: '#00d4ff', label: 'IMG', bg: 'rgba(0,212,255,.12)' };
  if (mime.startsWith('video/')) return { color: '#7b4fff', label: 'VID', bg: 'rgba(123,79,255,.12)' };
  if (mime.startsWith('audio/')) return { color: '#00c97a', label: 'AUD', bg: 'rgba(0,201,122,.12)' };
  if (mime.includes('pdf')) return { color: '#ff4f66', label: 'PDF', bg: 'rgba(255,79,102,.12)' };
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) {
    return { color: '#ffab2e', label: 'ZIP', bg: 'rgba(255,171,46,.12)' };
  }
  if (mime.includes('word') || mime.includes('document')) return { color: '#0077ff', label: 'DOC', bg: 'rgba(0,119,255,.12)' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('javascript')) return { color: '#a0aec0', label: 'TXT', bg: 'rgba(160,174,192,.12)' };
  return { color: '#7b4fff', label: 'FILE', bg: 'rgba(123,79,255,.12)' };
}
