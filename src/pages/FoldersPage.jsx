import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';

export default function FoldersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModal, setCreateModal] = useState({ isOpen: false, name: '', loading: false });
  const [renameModal, setRenameModal] = useState({ isOpen: false, folder: null, newName: '', loading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, folder: null, loading: false });

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
    e.stopPropagation();
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
    e.stopPropagation();
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

        <main className="dashboard-container">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Folders</h1>
              <p className="page-desc">Organize your files into custom folders and categories</p>
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
          ) : (
            <div className="folders-grid">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="folder-card"
                  onClick={() => navigate(`/files?folder_id=${folder.id}`)}
                >
                  <div className="folder-card-top">
                    <div className="folder-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="folder-actions">
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

                  <div className="folder-name" title={folder.folder_name || folder.name || 'Untitled Folder'}>
                    {folder.folder_name || folder.name || 'Untitled Folder'}
                  </div>
                  <div className="folder-meta">
                    Click to view files inside
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

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
            placeholder="e.g. Work Documents, Photos, Invoices"
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
          Are you sure you want to delete the folder <strong>{deleteModal.folder?.folder_name}</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px' }}>
          Files inside this folder will not be deleted; they will be moved to Root.
        </p>
      </Modal>
    </div>
  );
}
