import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useToast } from '../components/Toast';
import { apiRequest, uploadWithProgress, formatBytes, mimeInfo } from '../api/client';

export default function UploadPage() {
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
      status: 'pending', // 'pending' | 'uploading' | 'done' | 'error'
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

  const startUpload = async () => {
    if (fileQueue.length === 0) return;
    setUploading(true);

    const folderIdParam = selectedFolderId ? selectedFolderId : null;

    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'done') continue;

      setFileQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 0 } : it))
      );

      const formData = new FormData();
      formData.append('file', item.file);
      if (folderIdParam) {
        formData.append('folder_id', folderIdParam);
      }

      try {
        await uploadWithProgress('/files', formData, (percent) => {
          setFileQueue((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, progress: percent } : it))
          );
        });

        setFileQueue((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'done', progress: 100 } : it))
        );
      } catch (err) {
        setFileQueue((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', error: err.message || 'Upload failed' } : it
          )
        );
        showToast(`Failed to upload ${item.name}: ${err.message || 'Error'}`, 'error');
      }
    }

    setUploading(false);
    setAllDone(true);
    showToast('Upload process completed!', 'success');
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
                              {item.status === 'uploading' && ` · ${item.progress}%`}
                              {item.status === 'done' && ' · Completed'}
                              {item.status === 'error' && ` · ${item.error}`}
                            </div>
                          </div>
                        </div>

                        {item.status === 'uploading' && (
                          <div style={{ width: '120px', background: 'var(--bg3)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.progress}%`,
                                background: 'var(--primary)',
                                height: '100%',
                                transition: 'width 0.2s ease',
                              }}
                            />
                          </div>
                        )}

                        {item.status === 'done' && (
                          <span style={{ color: '#00e08b', display: 'flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
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
