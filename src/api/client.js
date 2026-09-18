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

export function uploadWithProgress(path, formData, onProgress, onChunkProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();
    const url = path.startsWith('http') ? path : API_BASE + path;

    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Accept', 'application/json, application/x-ndjson');

    // Track browser → server upload progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
        onProgress(percent, e.loaded, e.total);
      }
    };

    // Track server → Telegram chunk progress (NDJSON streaming)
    let lastParsedLength = 0;
    let streamedResult = null;
    let streamedError = null;

    xhr.onprogress = () => {
      // Parse new NDJSON lines from the response as they arrive
      const text = xhr.responseText || '';
      if (text.length <= lastParsedLength) return;

      const newData = text.substring(lastParsedLength);
      lastParsedLength = text.length;

      const lines = newData.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'progress' && onChunkProgress) {
            onChunkProgress(obj.current, obj.total);
          } else if (obj.type === 'result') {
            streamedResult = obj;
          } else if (obj.type === 'error') {
            streamedError = obj.error || 'Server processing failed';
          }
        } catch {
          // Incomplete line, will be parsed on next onprogress
        }
      }
    };

    xhr.onload = () => {
      // If we already got a streamed error during NDJSON processing
      if (streamedError) {
        reject(new Error(streamedError));
        return;
      }

      // If we got a streamed NDJSON result (chunked upload)
      if (streamedResult) {
        if (onProgress) onProgress(100, 0, 0);
        resolve(streamedResult);
        return;
      }

      // Regular JSON response (non-chunked upload)
      const responseText = xhr.responseText || '';
      try {
        // Detect HTML error pages from reverse proxy timeouts (502/504)
        if (responseText.trim().startsWith('<') || responseText.trim().startsWith('<!')) {
          const statusMatch = responseText.match(/<title>\s*(\d{3}[^<]*)<\/title>/i);
          const statusHint = statusMatch ? statusMatch[1] : `HTTP ${xhr.status}`;
          reject(new Error(`Server gateway timeout (${statusHint}). The file may be too large for the server to process. Try again or contact support.`));
          return;
        }

        // Try parsing as NDJSON (in case onprogress didn't fire, proxy buffered everything)
        if (responseText.includes('\n') && responseText.trim().startsWith('{')) {
          const lines = responseText.trim().split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'error') {
                reject(new Error(obj.error || 'Server processing failed'));
                return;
              }
              if (obj.type === 'result') {
                if (onProgress) onProgress(100, 0, 0);
                resolve(obj);
                return;
              }
            } catch { /* skip malformed lines */ }
          }
        }

        // Standard single JSON response
        const json = JSON.parse(responseText);
        if (xhr.status < 300 && json.success !== false) {
          if (onProgress) onProgress(100, 0, 0);
          resolve(json);
        } else {
          reject(new Error(json.error || `Upload failed (HTTP ${xhr.status})`));
        }
      } catch {
        if (xhr.status === 0) {
          reject(new Error('Connection lost. Check your internet and try again.'));
        } else if (xhr.status >= 502 && xhr.status <= 504) {
          reject(new Error(`Server timeout (HTTP ${xhr.status}). Large files take longer to process — please try again.`));
        } else {
          reject(new Error(`Invalid server response (HTTP ${xhr.status}). The server may have timed out while processing your file.`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network connection error. Check your internet and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. The file may be too large or your connection is slow.'));
    xhr.send(formData);
  });
}

// ── Client-Side Chunked Upload ──────────────────────────────────────
// Splits the file in the browser, uploads each chunk via XHR to /upload-chunk,
// then calls /upload-finalize. Progress is smooth 0→100%.
//
// Key optimizations:
//   • 10MB chunk size → shorter pauses at chunk boundaries
//   • concurrency=2 → browser sends next chunk while server forwards current to Telegram
//   • onProgress(percent, loadedBytes, totalBytes) — smooth 0→100

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const CHUNK_CONCURRENCY = 2;          // 2 parallel — fast enough, avoids rate limit bursts
const CHUNK_STAGGER_MS  = 300;        // stagger each new launch by 300ms to avoid burst

export function uploadChunked(file, extraFields = {}, onProgress) {
  const totalSize = file.size;

  // Small file: use regular upload (no chunking needed)
  if (totalSize <= CHUNK_SIZE) {
    const formData = new FormData();
    formData.append('file', file);
    for (const [k, v] of Object.entries(extraFields)) {
      if (v != null) formData.append(k, String(v));
    }
    return uploadWithProgress('/upload', formData, onProgress);
  }

  // Large file: parallel client-side chunking
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  // Track loaded bytes per chunk slot for accurate combined progress
  const chunkLoaded = new Array(totalChunks).fill(0);
  const chunkDone   = new Array(totalChunks).fill(false);

  // Results array (preserve order for finalize)
  const results = new Array(totalChunks).fill(null);

  const reportProgress = () => {
    const totalLoaded = chunkLoaded.reduce((a, b) => a + b, 0);
    const percent = Math.min(99, Math.round((totalLoaded / totalSize) * 100));
    if (onProgress) onProgress(percent, totalLoaded, totalSize);
  };

  const uploadChunkAt = (index) => new Promise((resolve, reject) => {
    const start = index * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, totalSize);
    const blob  = file.slice(start, end);
    const chunkSize = end - start;

    const fd = new FormData();
    fd.append('chunk', blob, file.name);
    fd.append('chunk_index', String(index));
    fd.append('total_chunks', String(totalChunks));
    fd.append('original_name', file.name);
    fd.append('total_size', String(totalSize));
    if (extraFields.description) fd.append('description', extraFields.description);

    const xhr = new XMLHttpRequest();
    const token = getToken();
    xhr.open('POST', API_BASE + '/upload-chunk');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        chunkLoaded[index] = e.loaded;
        reportProgress();
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status < 300 && json.success !== false && json.file_id) {
          chunkLoaded[index] = chunkSize; // mark as 100% on this chunk
          chunkDone[index]   = true;
          reportProgress();
          resolve(json);
        } else {
          reject(new Error(json.error || `Chunk ${index + 1} failed (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error(`Invalid response for chunk ${index + 1} (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror   = () => reject(new Error(`Network error on chunk ${index + 1}. Check your connection.`));
    xhr.ontimeout = () => reject(new Error(`Chunk ${index + 1} timed out.`));
    xhr.send(fd);
  });

  return (async () => {
    // Smooth interpolation: keep progress bar moving between chunk boundaries
    // When browser is waiting for server→Telegram, estimate progress using last known speed
    let lastReportedLoaded = 0;
    let lastReportTime = Date.now();
    let estimatedSpeed = 0; // bytes/ms

    const smoothInterval = setInterval(() => {
      const now = Date.now();
      const realLoaded = chunkLoaded.reduce((a, b) => a + b, 0);

      // Update speed estimate from real progress
      const dt = now - lastReportTime;
      if (dt > 200 && realLoaded > lastReportedLoaded) {
        estimatedSpeed = (realLoaded - lastReportedLoaded) / dt;
        lastReportedLoaded = realLoaded;
        lastReportTime = now;
      }

      // Interpolate forward using estimated speed
      const elapsed = now - lastReportTime;
      const interpolated = Math.min(totalSize - 1, realLoaded + estimatedSpeed * elapsed);
      const percent = Math.min(99, Math.round((interpolated / totalSize) * 100));
      if (onProgress) onProgress(percent, Math.round(interpolated), totalSize);
    }, 150); // update every 150ms for silky smooth bar

    try {
      // Upload with bounded concurrency using a pool
      let nextIndex = 0;
      const inFlight = new Set();

      await new Promise((resolveAll, rejectAll) => {
        let launching = false;
        const launch = async () => {
          if (launching) return;
          launching = true;
          while (inFlight.size < CHUNK_CONCURRENCY && nextIndex < totalChunks) {
            const i = nextIndex++;
            const p = uploadChunkAt(i).then(
              (res) => {
                results[i] = res;
                inFlight.delete(p);
                if (chunkDone.every(Boolean)) resolveAll();
                else launch();
              },
              (err) => rejectAll(err)
            );
            inFlight.add(p);
            if (nextIndex < totalChunks && inFlight.size < CHUNK_CONCURRENCY) {
              await new Promise((r) => setTimeout(r, CHUNK_STAGGER_MS));
            }
          }
          launching = false;
        };
        launch();
      });
    } finally {
      clearInterval(smoothInterval);
    }

    // All chunks done — finalize
    if (onProgress) onProgress(100, totalSize, totalSize);

    const fileIds    = results.map((r) => r.file_id);
    const messageIds = results.map((r) => r.message_id).filter(Boolean);

    const finalizeRes = await apiRequest('/upload-finalize', {
      method: 'POST',
      body: {
        file_ids:      fileIds,
        message_ids:   messageIds,
        original_name: file.name,
        mime_type:     file.type || 'application/octet-stream',
        total_size:    totalSize,
        folder_id:     extraFields.folder_id ?? null,
        description:   extraFields.description ?? '',
        is_public:     extraFields.is_public ?? false,
      },
    });

    return finalizeRes;
  })();
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
