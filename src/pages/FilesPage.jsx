import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { apiRequest, formatBytes, relativeDate, mimeInfo, API_BASE, downloadFile } from '../api/client';

export default function FilesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & display
  const [selectedFolderId, setSelectedFolderId] = useState('all'); // 'all', 'root', or folder_id string
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Modals state
  const [renameModal, setRenameModal] = useState({ isOpen: false, file: null, newName: '', loading: false });
  const [shareModal, setShareModal] = useState({ isOpen: false, file: null, shareUrl: '', loading: false });
  const [moveModal, setMoveModal] = useState({ isOpen: false, file: null, targetFolderId: '', loading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, file: null, loading: false });

  const { showToast } = useToast();
  const pollTimerRef = useRef(null);

  // Fetch folders
  const loadFolders = useCallback(async () => {
    try {
      const res = await apiRequest('/folders');
      if (res && res.folders) {
        setFolders(res.folders);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  // Fetch files
  const loadFiles = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      let path = '/files';
      if (selectedFolderId !== 'all') {
        path += `?folder_id=${selectedFolderId}`;
      }
      const res = await apiRequest(path);
      if (res && res.files) {
        setFiles(res.files);
      }
    } catch (err) {
      if (!isBackground) {
        showToast(err.message || 'Failed to load files', 'error');
      }
    } finally {
      if (!isBackground) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFolderId, showToast]);

  // Initial load
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadFiles(false);
  }, [loadFiles]);

  // Real-time polling every 8 seconds
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      loadFiles(true);
    }, 8000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadFiles]);

  // Filter & Sort
  const filteredFiles = files
    .filter((f) => {
      if (!searchQuery) return true;
      const name = f.file_name || f.original_name || f.name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const nameA = a.file_name || a.original_name || a.name || '';
      const nameB = b.file_name || b.original_name || b.name || '';
      const sizeA = a.file_size ?? a.size_bytes ?? a.size ?? 0;
      const sizeB = b.file_size ?? b.size_bytes ?? b.size ?? 0;

      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
      if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
      if (sortBy === 'size_desc') return sizeB - sizeA;
      if (sortBy === 'size_asc') return sizeA - sizeB;
      return 0;
    });

  // Action Handlers
  const handleDownload = async (file) => {
    const fileName = file.file_name || file.original_name || file.name || 'download';
    try {
      showToast(`Downloading: ${fileName}...`, 'info');
      await downloadFile(`/files/${file.id}/download`, fileName);
      showToast(`Downloaded: ${fileName}`, 'success');
      // Increment local download count for immediate visual feedback
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, downloads: (f.downloads || 0) + 1 } : f))
      );
    } catch (err) {
      showToast(err.message || 'Download failed', 'error');
    }
  };

  // Open Rename Modal
  const openRename = (file) => {
    const fileName = file.file_name || file.original_name || file.name || '';
    setRenameModal({ isOpen: true, file, newName: fileName, loading: false });
  };

  const handleRenameSubmit = async () => {
    if (!renameModal.newName.trim()) {
      showToast('File name cannot be empty', 'error');
      return;
    }
    setRenameModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/files/${renameModal.file.id}/rename`, {
        method: 'PUT',
        body: { file_name: renameModal.newName.trim() },
      });
      showToast('File renamed successfully', 'success');
      setRenameModal({ isOpen: false, file: null, newName: '', loading: false });
      loadFiles(true);
    } catch (err) {
      showToast(err.message || 'Rename failed', 'error');
      setRenameModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Open Share Modal
  const openShare = async (file) => {
    setShareModal({ isOpen: true, file, shareUrl: '', loading: true });
    try {
      const res = await apiRequest(`/files/${file.id}/share`, {
        method: 'POST',
        body: { is_public: 1 },
      });
      const shareUrl = `${window.location.origin}/share/${res.share_token}`;
      setShareModal({ isOpen: true, file, shareUrl, loading: false });
    } catch (err) {
      showToast(err.message || 'Failed to generate share link', 'error');
      setShareModal({ isOpen: false, file: null, shareUrl: '', loading: false });
    }
  };

  const copyShareLink = () => {
    if (!shareModal.shareUrl) return;
    navigator.clipboard.writeText(shareModal.shareUrl);
    showToast('Share link copied to clipboard!', 'success');
  };

  // Open Move Modal
  const openMove = (file) => {
    setMoveModal({
      isOpen: true,
      file,
      targetFolderId: file.folder_id ? String(file.folder_id) : 'root',
      loading: false,
    });
  };

  const handleMoveSubmit = async () => {
    setMoveModal((prev) => ({ ...prev, loading: true }));
    try {
      const folder_id = moveModal.targetFolderId === 'root' ? null : parseInt(moveModal.targetFolderId, 10);
      await apiRequest(`/files/${moveModal.file.id}`, {
        method: 'PUT',
        body: { folder_id },
      });
      showToast('File moved successfully', 'success');
      setMoveModal({ isOpen: false, file: null, targetFolderId: '', loading: false });
      loadFiles(true);
    } catch (err) {
      showToast(err.message || 'Move failed', 'error');
      setMoveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Open Delete Modal
  const openDelete = (file) => {
    setDeleteModal({ isOpen: true, file, loading: false });
  };

  const handleDeleteSubmit = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/files/${deleteModal.file.id}`, {
        method: 'DELETE',
      });
      showToast('File deleted successfully', 'success');
      setDeleteModal({ isOpen: false, file: null, loading: false });
      loadFiles(true);
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Storage', to: '/files' }, { label: 'My Files', active: true }]}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="icon-btn"
                onClick={() => loadFiles(false)}
                title="Refresh files"
                disabled={loading || refreshing}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                  className={refreshing ? 'spin-icon' : ''}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <Link to="/upload" className="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload File
              </Link>
            </div>
          }
        />

        <main className="dashboard-container">
          {/* Header & stats */}
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Files</h1>
              <p className="page-desc">
                {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} in your cloud storage
                {refreshing && <span className="sync-badge">Syncing...</span>}
              </p>
            </div>
            <div className="controls-row">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    &times;
                  </button>
                )}
              </div>

              <select
                className="select-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title="Sort files"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A to Z)</option>
                <option value="name_desc">Name (Z to A)</option>
                <option value="size_desc">Largest First</option>
                <option value="size_asc">Smallest First</option>
              </select>

              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Folder Chips Filter */}
          <div className="folder-chips">
            <button
              className={`chip ${selectedFolderId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFolderId('all')}
            >
              All Files
            </button>
            <button
              className={`chip ${selectedFolderId === 'root' ? 'active' : ''}`}
              onClick={() => setSelectedFolderId('root')}
            >
              Root
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className={`chip ${selectedFolderId === String(f.id) ? 'active' : ''}`}
                onClick={() => setSelectedFolderId(String(f.id))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {f.folder_name}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          {loading ? (
            <div className="loading-state">
              <span className="spinner-lg" />
              <p>Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <h3>No files found</h3>
              <p>
                {searchQuery
                  ? 'No files matched your search query.'
                  : 'Start uploading your documents, photos, and media.'}
              </p>
              <Link to="/upload" className="btn btn-primary" style={{ marginTop: '14px' }}>
                Upload First File
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="files-grid">
              {filteredFiles.map((f) => {
                const info = mimeInfo(f.mime_type || '');
                const fileName = f.file_name || f.original_name || f.name || 'Untitled File';
                const fileSize = f.file_size ?? f.size_bytes ?? f.size ?? 0;
                const downloads = f.downloads ?? 0;
                return (
                  <div key={f.id} className="file-card">
                    <div className="file-card-preview">
                      <span
                        className="file-badge"
                        style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}40` }}
                      >
                        {info.label}
                      </span>
                      {f.is_public === 1 && (
                        <span className="shared-badge" title="Publicly shared">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                          Shared
                        </span>
                      )}
                    </div>

                    <div className="file-card-info">
                      <div className="file-card-name" title={fileName}>
                        {fileName}
                      </div>
                      <div className="file-card-meta">
                        <span>{formatBytes(fileSize)}</span>
                        <span title={`${downloads} download${downloads !== 1 ? 's' : ''}`}>{downloads} {downloads === 1 ? 'dl' : 'dls'}</span>
                        <span>{relativeDate(f.created_at)}</span>
                      </div>
                    </div>

                    <div className="file-card-actions">
                      <button
                        className="action-btn"
                        onClick={() => handleDownload(f)}
                        title="Download file"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => openShare(f)}
                        title="Share link"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => openRename(f)}
                        title="Rename file"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => openMove(f)}
                        title="Move to folder"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <polyline points="5 9 2 12 5 15" />
                          <polyline points="9 5 12 2 15 5" />
                          <polyline points="15 19 12 22 9 19" />
                          <polyline points="19 9 22 12 19 15" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <line x1="12" y1="2" x2="12" y2="22" />
                        </svg>
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => openDelete(f)}
                        title="Delete file"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Downloads</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((f) => {
                    const info = mimeInfo(f.mime_type || '');
                    const fileName = f.file_name || f.original_name || f.name || 'Untitled File';
                    const fileSize = f.file_size ?? f.size_bytes ?? f.size ?? 0;
                    const downloads = f.downloads ?? 0;
                    return (
                      <tr key={f.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              className="file-badge-sm"
                              style={{ background: info.bg, color: info.color }}
                            >
                              {info.label}
                            </span>
                            <span className="table-file-name" title={fileName}>
                              {fileName}
                            </span>
                            {f.is_public === 1 && (
                              <span className="shared-badge-mini" title="Public link active">
                                Shared
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{formatBytes(fileSize)}</td>
                        <td>
                          <span className="mime-pill">{f.mime_type || 'Unknown'}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ opacity: 0.7 }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            {downloads}
                          </span>
                        </td>
                        <td>{relativeDate(f.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="action-btn"
                              onClick={() => handleDownload(f)}
                              title="Download file"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => openShare(f)}
                              title="Share link"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => openRename(f)}
                              title="Rename file"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => openMove(f)}
                              title="Move to folder"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <polyline points="5 9 2 12 5 15" />
                                <polyline points="9 5 12 2 15 5" />
                                <polyline points="15 19 12 22 9 19" />
                                <polyline points="19 9 22 12 19 15" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <line x1="12" y1="2" x2="12" y2="22" />
                              </svg>
                            </button>
                            <button
                              className="action-btn danger"
                              onClick={() => openDelete(f)}
                              title="Delete file"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, file: null, newName: '', loading: false })}
        title="Rename File"
        confirmText="Save Name"
        onConfirm={handleRenameSubmit}
        loading={renameModal.loading}
      >
        <div className="form-group">
          <label htmlFor="rename-input">File Name</label>
          <input
            id="rename-input"
            type="text"
            className="input-field"
            value={renameModal.newName}
            onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
            placeholder="e.g. presentation.pdf"
            autoFocus
          />
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, file: null, shareUrl: '', loading: false })}
        title="Public Share Link"
        confirmText={shareModal.shareUrl ? 'Copy Link' : null}
        onConfirm={shareModal.shareUrl ? copyShareLink : null}
      >
        {shareModal.loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span className="spinner-sm" /> Generating link...
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
              Anyone with this link can view and download <strong>{shareModal.file?.file_name || shareModal.file?.original_name || 'this file'}</strong> without an account.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                value={shareModal.shareUrl}
                readOnly
                style={{ fontFamily: 'monospace', fontSize: '0.84rem' }}
              />
              <button className="btn btn-secondary" onClick={copyShareLink}>
                Copy
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Move to Folder Modal */}
      <Modal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal({ isOpen: false, file: null, targetFolderId: '', loading: false })}
        title="Move to Folder"
        confirmText="Move File"
        onConfirm={handleMoveSubmit}
        loading={moveModal.loading}
      >
        <div className="form-group">
          <label htmlFor="move-target">Select Destination Folder</label>
          <select
            id="move-target"
            className="select-field"
            style={{ width: '100%' }}
            value={moveModal.targetFolderId}
            onChange={(e) => setMoveModal((prev) => ({ ...prev, targetFolderId: e.target.value }))}
          >
            <option value="root">Root (No folder)</option>
            {folders.map((folder) => (
              <option key={folder.id} value={String(folder.id)}>
                {folder.folder_name}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, file: null, loading: false })}
        title="Delete File"
        confirmText="Delete File"
        confirmVariant="danger"
        onConfirm={handleDeleteSubmit}
        loading={deleteModal.loading}
      >
        <p style={{ color: 'var(--text)', fontSize: '0.94rem' }}>
          Are you sure you want to delete <strong>{deleteModal.file?.file_name || deleteModal.file?.original_name || 'this file'}</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px' }}>
          This action cannot be undone. The file will be removed from your cloud storage.
        </p>
      </Modal>
    </div>
  );
}
