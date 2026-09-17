import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { apiRequest, formatDateTime } from '../api/client';

export default function FoldersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode: default to 'list' as requested
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('camhost_folders_view_mode') || 'list';
    } catch (e) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('camhost_folders_view_mode', mode);
    } catch (e) {}
  };

  // Modals state
  const [createModal, setCreateModal] = useState({ isOpen: false, name: '', loading: false });
  const [renameModal, setRenameModal] = useState({ isOpen: false, folder: null, newName: '', loading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, folder: null, loading: false });

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    type: null, // 'folder' | 'area'
    folder: null,
  });
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/folders');
      if (res && res.folders) {
        setFolders(res.folders);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load folders', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Context menu dismiss listeners
  useEffect(() => {
    const handleDismiss = () => {
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleDismiss();
    };

    window.addEventListener('click', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleDismiss, true);

    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, []);

  // Create folder
  const handleCreateSubmit = async () => {
    const trimmed = createModal.name.trim();
    if (!trimmed) {
      showToast('Folder name is required', 'error');
      return;
    }
    setCreateModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest('/folders', {
        method: 'POST',
        body: { name: trimmed, folder_name: trimmed },
      });
      showToast('Folder created successfully', 'success');
      setCreateModal({ isOpen: false, name: '', loading: false });
      loadFolders();
    } catch (err) {
      showToast(err.message || 'Failed to create folder', 'error');
      setCreateModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Rename folder
  const openRename = (e, folder) => {
    if (e) e.stopPropagation();
    const currentName = folder.folder_name || folder.name || '';
    setRenameModal({ isOpen: true, folder, newName: currentName, loading: false });
  };

  const handleRenameSubmit = async () => {
    const trimmed = renameModal.newName.trim();
    if (!trimmed) {
      showToast('Folder name cannot be empty', 'error');
      return;
    }
    setRenameModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/folders/${renameModal.folder.id}`, {
        method: 'PUT',
        body: { name: trimmed, folder_name: trimmed },
      });
      showToast('Folder renamed successfully', 'success');
      setRenameModal({ isOpen: false, folder: null, newName: '', loading: false });
      loadFolders();
    } catch (err) {
      showToast(err.message || 'Failed to rename folder', 'error');
      setRenameModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Delete folder
  const openDelete = (e, folder) => {
    if (e) e.stopPropagation();
    setDeleteModal({ isOpen: true, folder, loading: false });
  };

  const handleDeleteSubmit = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/folders/${deleteModal.folder.id}`, {
        method: 'DELETE',
      });
      showToast('Folder deleted', 'success');
      setDeleteModal({ isOpen: false, folder: null, loading: false });
      loadFolders();
    } catch (err) {
      showToast(err.message || 'Failed to delete folder', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Right-click handlers
  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFolderId(folder.id);

    const menuWidth = 200;
    const menuHeight = 180;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX;
    let y = clientY;

    // Center horizontally if right-clicked too far right or left
    if (clientX > window.innerWidth - 260 || clientX < 200) {
      x = Math.max(16, Math.round((window.innerWidth - menuWidth) / 2));
    } else {
      x = Math.max(16, Math.min(clientX, window.innerWidth - menuWidth - 20));
    }

    if (y + menuHeight > window.innerHeight - 20) {
      y = Math.max(16, window.innerHeight - menuHeight - 20);
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      type: 'folder',
      folder,
    });
  };

  const handleAreaContextMenu = (e) => {
    if (e.target.closest('.action-btn') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    e.preventDefault();

    const menuWidth = 180;
    const menuHeight = 140;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX;
    let y = clientY;

    // Center horizontally if right-clicked too far right or left
    if (clientX > window.innerWidth - 240 || clientX < 180) {
      x = Math.max(16, Math.round((window.innerWidth - menuWidth) / 2));
    } else {
      x = Math.max(16, Math.min(clientX, window.innerWidth - menuWidth - 20));
    }

    if (y + menuHeight > window.innerHeight - 20) {
      y = Math.max(16, window.innerHeight - menuHeight - 20);
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      type: 'area',
      folder: null,
    });
  };


  // Filtered folders
  const filteredFolders = folders.filter((folder) => {
    const name = folder.folder_name || folder.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Storage', to: '/files' }, { label: 'My Folders', active: true }]}
          actions={
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCreateModal({ isOpen: true, name: '', loading: false })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Folder
            </button>
          }
        />

        <main className="dashboard-container" onContextMenu={handleAreaContextMenu}>
          <div className="page-header-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 className="page-title">Folders</h1>
              <p className="page-desc">Organize your files into custom folders and categories</p>
            </div>

            <div className="controls-row" style={{ marginTop: 0 }}>
              {/* Search Folders */}
              <div className="search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon" width="15" height="15">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* View Toggle (List / Grid) */}
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleSetViewMode('list')}
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
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => handleSetViewMode('grid')}
                  title="Grid View"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner-lg" />
              <p>Loading folders...</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No folders created yet</h3>
              <p>Create folders to group and categorize your uploaded cloud files.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '14px' }}
                onClick={() => setCreateModal({ isOpen: true, name: '', loading: false })}
              >
                Create Folder
              </button>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3>No folders found</h3>
              <p>No folders match your search "{searchQuery}".</p>
            </div>
          ) : viewMode === 'list' ? (
            /* List / Table View (Default) */
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Folder Name</th>
                    <th>Files Count</th>
                    <th>Total Size</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolders.map((folder) => {
                    const folderName = folder.folder_name || folder.name || 'Untitled Folder';
                    const fileCount = folder.file_count ?? 0;
                    const sizeHuman = folder.size_human || '0 B';

                    return (
                      <tr
                        key={folder.id}
                        className={selectedFolderId === folder.id ? 'selected-row' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/files?folder_id=${folder.id}`)}
                        onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                      >
                        <td>
                          <div className="folder-list-item-name">
                            <div className="folder-icon-inline">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.94rem' }} title={folderName}>
                              {folderName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="file-badge-sm" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>
                            {fileCount} {fileCount === 1 ? 'file' : 'files'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                          {sizeHuman}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                          {formatDateTime(folder.created_at)}
                        </td>
                        <td>
                          <div className="folder-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="action-btn"
                              onClick={() => navigate(`/files?folder_id=${folder.id}`)}
                              title="Open folder"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </button>
                            <button
                              className="action-btn"
                              onClick={(e) => openRename(e, folder)}
                              title="Rename folder"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              className="action-btn danger"
                              onClick={(e) => openDelete(e, folder)}
                              title="Delete folder"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
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
          ) : (
            /* Grid View */
            <div className="folders-grid">
              {filteredFolders.map((folder) => {
                const folderName = folder.folder_name || folder.name || 'Untitled Folder';
                const fileCount = folder.file_count ?? 0;
                const sizeHuman = folder.size_human || '0 B';

                return (
                  <div
                    key={folder.id}
                    className={`folder-card ${selectedFolderId === folder.id ? 'selected-card' : ''}`}
                    onClick={() => navigate(`/files?folder_id=${folder.id}`)}
                    onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                  >
                    <div className="folder-card-top">
                      <div className="folder-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn"
                          onClick={(e) => openRename(e, folder)}
                          title="Rename folder"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={(e) => openDelete(e, folder)}
                          title="Delete folder"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="folder-name" title={folderName}>
                      {folderName}
                    </div>

                    <div className="folder-meta">
                      <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
                      <span>{sizeHuman}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Right Click Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="custom-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && contextMenu.folder && (
            <>
              <div className="context-menu-header" title={contextMenu.folder.folder_name || contextMenu.folder.name}>
                {contextMenu.folder.folder_name || contextMenu.folder.name}
              </div>
              <button
                className="context-menu-item"
                onClick={() => {
                  navigate(`/files?folder_id=${contextMenu.folder.id}`);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open folder
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openRename(null, contextMenu.folder);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Rename
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={() => {
                  openDelete(null, contextMenu.folder);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete folder
              </button>
            </>
          )}

          {contextMenu.type === 'area' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setCreateModal({ isOpen: true, name: '', loading: false });
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                New folder
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  loadFolders();
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, folder: null });
                  showToast('Folders refreshed', 'info');
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false, name: '', loading: false })}
        title="Create New Folder"
        confirmText="Create Folder"
        onConfirm={handleCreateSubmit}
        loading={createModal.loading}
      >
        <div className="form-group">
          <label htmlFor="create-folder-name">Folder Name</label>
          <input
            id="create-folder-name"
            type="text"
            className="input-field"
            value={createModal.name}
            onChange={(e) => setCreateModal((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Work Documents, Photos, Software"
            autoFocus
          />
        </div>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, folder: null, newName: '', loading: false })}
        title="Rename Folder"
        confirmText="Save Name"
        onConfirm={handleRenameSubmit}
        loading={renameModal.loading}
      >
        <div className="form-group">
          <label htmlFor="rename-folder-name">Folder Name</label>
          <input
            id="rename-folder-name"
            type="text"
            className="input-field"
            value={renameModal.newName}
            onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
            placeholder="e.g. Projects"
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, folder: null, loading: false })}
        title="Delete Folder"
        confirmText="Delete Folder"
        confirmVariant="danger"
        onConfirm={handleDeleteSubmit}
        loading={deleteModal.loading}
      >
        <p style={{ color: 'var(--text)', fontSize: '0.94rem' }}>
          Are you sure you want to delete the folder <strong>{deleteModal.folder?.folder_name || deleteModal.folder?.name}</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px' }}>
          Files inside this folder will not be deleted; they will be moved to Root.
        </p>
      </Modal>
    </div>
  );
}
