import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiRequest, uploadWithProgress, formatBytes, mimeInfo } from '../api/client';

export default function UploadPage() {
  const { refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const fileInputRef = useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load folders
  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await apiRequest('/folders');
        if (res && res.folders) setFolders(res.folders);
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    }
    loadFolders();
  }, []);

  const handleFiles = (files) => {
    const newItems = Array.from(files).map((f) => ({
      id: Math.random().toString(36).substring(2),
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      progress: 0,
      speed: 0,
      eta: 0,
      chunkCurrent: 0,
      chunkTotal: 0,
      status: 'pending', // 'pending' | 'uploading' | 'saving' | 'done' | 'error'
      error: null,
    }));

    setFileQueue((prev) => [...prev, ...newItems]);
    setAllDone(false);
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeQueueItem = (id) => {
    if (uploading) return;
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Warn and prevent closing/reloading browser if upload is active
  useEffect(() => {
    if (!uploading) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Upload in progress! Closing or reloading will cancel your upload.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  const startUpload = async () => {
    if (fileQueue.length === 0) return;
    setUploading(true);

    const folderIdParam = selectedFolderId ? selectedFolderId : null;
    const speedTracker = { lastTime: 0, lastLoaded: 0, samples: [] };

    const uploadSingleItem = async (item) => {
      if (item.status === 'done') return;

      setFileQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 0, speed: 0, eta: 0 } : it))
      );

      // Reset speed tracker for each file
      speedTracker.lastTime = Date.now();
      speedTracker.lastLoaded = 0;
      speedTracker.samples = [];

      const formData = new FormData();
      formData.append('file', item.file);
      if (folderIdParam) {
        formData.append('folder_id', folderIdParam);
      }

      try {
        const res = await uploadWithProgress('/upload', formData, (percent, loaded, total) => {
          const now = Date.now();
          const actualLoaded = loaded || Math.round((percent / 100) * item.size);
          const actualTotal = total || item.size;
          const timeDelta = (now - speedTracker.lastTime) / 1000;
          const bytesDelta = actualLoaded - speedTracker.lastLoaded;

          setFileQueue((prev) =>
            prev.map((it) => {
              if (it.id !== item.id) return it;
              let speed = it.speed || 0;
              let eta = it.eta || 0;

              if (timeDelta > 0.1 && bytesDelta > 0) {
                const sample = bytesDelta / timeDelta;
                speedTracker.samples.push(sample);
                if (speedTracker.samples.length > 5) speedTracker.samples.shift();
                speed = speedTracker.samples.reduce((a, b) => a + b, 0) / speedTracker.samples.length;
                speedTracker.lastTime = now;
                speedTracker.lastLoaded = actualLoaded;
              } else if (speedTracker.samples.length > 0) {
                speed = speedTracker.samples.reduce((a, b) => a + b, 0) / speedTracker.samples.length;
              }

              if (speed > 0) {
                eta = Math.max(0, Math.round((actualTotal - actualLoaded) / speed));
              }

              return { ...it, progress: percent, speed, eta };
            })
          );
        }, (chunkCurrent, chunkTotal) => {
          // Server is uploading chunks to Telegram
          setFileQueue((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, status: 'saving', chunkCurrent, chunkTotal, speed: 0, eta: 0 } : it))
          );
        });

        const shareUrl = res?.share_url || res?.file?.share_url || (res?.share_token ? `${window.location.origin}/share/${res.share_token}` : '');

        setFileQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'done', progress: 100, shareUrl, fileData: res?.file }
              : it
          )
        );
      } catch (err) {
        setFileQueue((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', error: err.message || 'Upload failed' } : it
          )
        );
        showToast(`Failed to upload ${item.name}: ${err.message || 'Error'}`, 'error');
      }
    };

    for (let i = 0; i < fileQueue.length; i++) {
      await uploadSingleItem(fileQueue[i]);
    }

    setUploading(false);
    setAllDone(true);
    refreshUser();
    showToast('All files stored in Telegram Cloud successfully!', 'success');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Storage', to: '/files' }, { label: 'Upload Files', active: true }]}
        />

        <main className="dashboard-container">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Upload Files</h1>
              <p className="page-desc">Files are directly streamed and encrypted into Telegram private storage</p>
            </div>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Destination Folder Selector */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <label htmlFor="upload-folder-dest" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                Destination Folder (Optional)
              </label>
              <select
                id="upload-folder-dest"
                className="select-field"
                style={{ width: '100%' }}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                disabled={uploading}
              >
                <option value="">Root Directory (No folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.folder_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag and Drop Zone */}
            <div
              className={`dropzone ${dragActive ? 'dragover' : ''}`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
              />
              <div className="dropzone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="48" height="48">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
                Drag and drop files here
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
                or click to browse your computer
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>

              <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '20px', background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" width="13" height="13">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Max file size: <strong style={{ color: 'var(--cyan)' }}>2 GB</strong> · All file formats supported
                </span>
              </div>
            </div>

            {/* Queued Files */}
            {fileQueue.length > 0 && (
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Selected Files ({fileQueue.length})
                  </h3>
                  {!uploading && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFileQueue([])}
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fileQueue.map((item) => {
                    const info = mimeInfo(item.type);
                    return (
                      <div key={item.id} className="upload-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <span
                            className="file-badge-sm"
                            style={{ background: info.bg, color: info.color }}
                          >
                            {info.label}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="upload-item-name" title={item.name}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {formatBytes(item.size)}
                              {item.size > 2000 * 1024 * 1024 && item.status === 'pending' && (
                                <span style={{ marginLeft: '6px', color: '#ff4d6d', fontSize: '0.72rem', background: 'rgba(255, 77, 109, 0.12)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(255, 77, 109, 0.25)' }}>
                                  &gt; 2 GB (Exceeds maximum limit)
                                </span>
                              )}
                              {item.status === 'uploading' && (
                                item.progress >= 99 ? (
                                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                                    {' · '}
                                    <span className="processing-pulse">Processing & saving to Telegram Cloud</span>
                                    <span className="dot-animation">...</span>
                                  </span>
                                ) : (
                                  <>
                                    <span>{` · ${item.progress}%`}</span>
                                    {item.speed > 0 && (
                                      <span style={{ color: 'var(--cyan)', marginLeft: '6px', fontSize: '0.74rem' }}>
                                        ↑ {formatBytes(item.speed)}/s
                                      </span>
                                    )}
                                    {item.speed > 0 && item.eta > 0 && (
                                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '0.72rem' }}>
                                        · {item.eta < 5 ? 'Almost done…' : item.eta < 60 ? `${item.eta}s left` : item.eta < 3600 ? `${Math.floor(item.eta / 60)}m ${item.eta % 60}s left` : `${Math.floor(item.eta / 3600)}h ${Math.floor((item.eta % 3600) / 60)}m left`}
                                      </span>
                                    )}
                                  </>
                                )
                              )}
                              {item.status === 'saving' && (
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                  {' · '}
                                  {item.chunkTotal > 0
                                    ? <span>Saving to Telegram ({item.chunkCurrent}/{item.chunkTotal})</span>
                                    : <><span className="processing-pulse">Processing</span><span className="dot-animation">...</span></>}
                                </span>
                              )}
                              {item.status === 'done' && <span style={{ color: '#00e08b', fontWeight: 600 }}> · Stored in Telegram Cloud</span>}
                              {item.status === 'error' && <span style={{ color: '#ff4d6d' }}> · {item.error}</span>}
                            </div>
                          </div>
                        </div>

                        {(item.status === 'uploading' || item.status === 'saving') && (
                          <div style={{ width: '120px', background: 'var(--bg3)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              className={item.progress >= 99 && item.status !== 'saving' ? 'progress-bar-processing' : ''}
                              style={{
                                width: item.status === 'saving' && item.chunkTotal > 0
                                  ? `${Math.round((item.chunkCurrent / item.chunkTotal) * 100)}%`
                                  : item.progress >= 99 ? '100%' : `${item.progress}%`,
                                background: item.status === 'saving'
                                  ? 'linear-gradient(90deg, #f59e0b, #ff6b35)'
                                  : item.progress >= 99
                                  ? 'linear-gradient(90deg, var(--cyan), var(--primary), var(--cyan))'
                                  : 'var(--primary)',
                                backgroundSize: item.progress >= 99 && item.status !== 'saving' ? '200% 100%' : 'auto',
                                height: '100%',
                                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            />
                          </div>
                        )}

                        {item.status === 'done' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.shareUrl && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(item.shareUrl);
                                  showToast('Direct public share link copied to clipboard!', 'success');
                                }}
                              >
                                Copy Link ↗
                              </button>
                            )}
                            <span style={{ color: '#00e08b', display: 'flex', alignItems: 'center' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          </div>
                        )}

                        {item.status === 'pending' && !uploading && (
                          <button
                            className="action-btn danger"
                            onClick={() => removeQueueItem(item.id)}
                            title="Remove file"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  {allDone ? (
                    <button className="btn btn-primary" onClick={() => navigate('/files')}>
                      View Files
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={startUpload}
                      disabled={uploading || fileQueue.length === 0}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-sm" /> Uploading...
                        </>
                      ) : (
                        `Upload ${fileQueue.length} File${fileQueue.length > 1 ? 's' : ''}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
