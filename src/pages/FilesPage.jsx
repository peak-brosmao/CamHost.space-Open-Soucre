import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  apiRequest,
  formatBytes,
  relativeDate,
  formatDateTime,
  mimeInfo,
  API_BASE,
  downloadFile,
  uploadWithProgress,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function FilesPage({ filter: propFilter }) {
  const { refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // URL query params & router
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const folderParam = searchParams.get('folder_id') || 'all';
  const filterQuery = searchParams.get('filter') || propFilter || '';

  // Determine active view filter
  let activeFilter = 'all';
  if (location.pathname === '/shared' || location.pathname === '/shared-items' || filterQuery === 'shared') {
    activeFilter = 'shared';
  } else if (location.pathname === '/recents' || filterQuery === 'recent' || filterQuery === 'recents') {
    activeFilter = 'recent';
  } else if (location.pathname === '/favourites' || location.pathname === '/favorites' || filterQuery === 'favorites' || filterQuery === 'favourites') {
    activeFilter = 'favorites';
  } else if (location.pathname === '/rubbish-bin' || location.pathname === '/trash' || filterQuery === 'trash') {
    activeFilter = 'trash';
  }

  // Favorites & Trash state (stored in localStorage for persistence)
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('camhost_favorites') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [trashIds, setTrashIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('camhost_trash') || '[]');
    } catch (e) {
      return [];
    }
  });

  const toggleFavorite = (fileId) => {
    setFavoriteIds((prev) => {
      const isFav = prev.includes(fileId);
      const next = isFav ? prev.filter((id) => id !== fileId) : [...prev, fileId];
      try {
        localStorage.setItem('camhost_favorites', JSON.stringify(next));
      } catch (e) {}
      showToast(isFav ? 'Removed from Favourites' : 'Added to Favourites', 'info');
      return next;
    });
  };

  const moveToTrash = (fileId) => {
    setTrashIds((prev) => {
      const next = prev.includes(fileId) ? prev : [...prev, fileId];
      try {
        localStorage.setItem('camhost_trash', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast('File moved to Rubbish bin', 'info');
  };

  const restoreFromTrash = (fileId) => {
    setTrashIds((prev) => {
      const next = prev.filter((id) => id !== fileId);
      try {
        localStorage.setItem('camhost_trash', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast('File restored to storage', 'success');
  };

  const emptyTrash = () => {
    if (!window.confirm('Are you sure you want to permanently empty the Rubbish bin?')) return;
    setTrashIds([]);
    try {
      localStorage.removeItem('camhost_trash');
    } catch (e) {}
    showToast('Rubbish bin emptied', 'success');
  };

  // Filters & display
  const [selectedFolderId, setSelectedFolderId] = useState(folderParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('camhost_view_mode') || 'list';
    } catch (e) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('camhost_view_mode', mode);
    } catch (e) {}
  };

  // Sync selectedFolderId whenever searchParams change
  useEffect(() => {
    const fid = searchParams.get('folder_id') || 'all';
    setSelectedFolderId(fid);
  }, [searchParams]);

  // Navigate/switch folder
  const handleSelectFolder = (fid) => {
    setSelectedFolderId(fid);
    if (fid === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ folder_id: String(fid) });
    }
  };

  // Modals state
  const [renameModal, setRenameModal] = useState({ isOpen: false, file: null, newName: '', loading: false });
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    file: null,
    shareUrl: '',
    isPublic: false,
    downloadLimit: '',
    loading: false,
    saving: false,
  });
  const [moveModal, setMoveModal] = useState({ isOpen: false, file: null, targetFolderId: '', loading: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, file: null, loading: false });
  const [infoModal, setInfoModal] = useState({ isOpen: false, file: null });
  const [createFolderModal, setCreateFolderModal] = useState({ isOpen: false, name: '', loading: false });
  const [renameFolderModal, setRenameFolderModal] = useState({ isOpen: false, folder: null, newName: '', loading: false });
  const [deleteFolderModal, setDeleteFolderModal] = useState({ isOpen: false, folder: null, loading: false });

  // Drag & drop state
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const [dragTargetFolderId, setDragTargetFolderId] = useState(null);

  // Upload Progress and Task state
  const [uploadTask, setUploadTask] = useState({
    active: false,
    fileName: '',
    totalFiles: 0,
    currentFileIndex: 0,
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    speed: 0, // bytes per second
    eta: 0, // seconds remaining
    chunkCurrent: 0, // current Telegram chunk being uploaded
    chunkTotal: 0, // total Telegram chunks
    status: 'idle', // 'idle' | 'uploading' | 'saving' | 'done' | 'error'
    error: null,
    folderName: null,
  });

  // Ref to track speed calculation samples
  const speedTrackRef = useRef({ lastTime: 0, lastLoaded: 0, samples: [] });

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    type: null, // 'file' | 'area' | 'folder'
    file: null,
    folder: null,
  });
  const [selectedFileId, setSelectedFileId] = useState(null);

  const { showToast } = useToast();
  const pollTimerRef = useRef(null);
  const hiddenFileInputRef = useRef(null);
  const targetFolderForUploadRef = useRef(null);

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

  // Real-time polling every 10 seconds
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      loadFiles(true);
    }, 10000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadFiles]);

  // Close context menu on outside click or scroll
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

  // Filter & Sort
  const filteredFiles = files
    .filter((f) => {
      // Trash filtering
      const inTrash = trashIds.includes(f.id) || Boolean(f.is_trash);
      if (activeFilter === 'trash') {
        if (!inTrash) return false;
      } else {
        if (inTrash) return false;
      }

      // Specific view modes
      if (activeFilter === 'shared') {
        if (!f.is_public && !f.share_token) return false;
      } else if (activeFilter === 'favorites') {
        if (!favoriteIds.includes(f.id)) return false;
      }

      if (!searchQuery) return true;
      const name = f.file_name || f.original_name || f.name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (activeFilter === 'recent') {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      }

      const nameA = a.file_name || a.original_name || '';
      const nameB = b.file_name || b.original_name || '';
      const sizeA = a.file_size ?? a.size_bytes ?? 0;
      const sizeB = b.file_size ?? b.size_bytes ?? 0;
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      switch (sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'name_asc':
          return nameA.localeCompare(nameB);
        case 'name_desc':
          return nameB.localeCompare(nameA);
        case 'size_desc':
          return sizeB - sizeA;
        case 'size_asc':
          return sizeA - sizeB;
        default:
          return dateB - dateA;
      }
    });

  // Download File Action
  const handleDownload = (file) => {
    const fileName = file.file_name || file.original_name || 'download';
    showToast(`Starting download: ${fileName}...`, 'info');
    downloadFile(`/files/${file.id}/download`, fileName);
  };

  // Open Rename Modal
  const openRename = (file) => {
    setRenameModal({
      isOpen: true,
      file,
      newName: file.file_name || file.original_name || '',
      loading: false,
    });
  };

  const handleRenameSubmit = async () => {
    const trimmed = renameModal.newName.trim();
    if (!trimmed) {
      showToast('File name cannot be empty', 'error');
      return;
    }
    setRenameModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/files/${renameModal.file.id}/rename`, {
        method: 'PUT',
        body: { name: trimmed, file_name: trimmed },
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
  const openShare = (file) => {
    const isPublic = Boolean(file.is_public);
    const shareUrl = file.share_url || (isPublic && file.share_token ? `${window.location.origin}/share/${file.share_token}` : '');
    setShareModal({
      isOpen: true,
      file,
      shareUrl,
      isPublic,
      downloadLimit: file.download_limit ? String(file.download_limit) : '',
      loading: false,
      saving: false,
    });
  };

  const handleToggleShare = async (makePublic) => {
    if (!shareModal.file) return;
    setShareModal((prev) => ({ ...prev, saving: true }));
    try {
      const limitVal = shareModal.downloadLimit ? parseInt(shareModal.downloadLimit, 10) : null;
      const res = await apiRequest(`/files/${shareModal.file.id}/share`, {
        method: 'POST',
        body: {
          is_public: makePublic ? 1 : 0,
          download_limit: limitVal,
        },
      });
      const shareUrl = `${window.location.origin}/share/${res.share_token}`;
      setShareModal((prev) => ({
        ...prev,
        shareUrl: res.is_public ? shareUrl : '',
        isPublic: Boolean(res.is_public),
        downloadLimit: res.download_limit ? String(res.download_limit) : '',
        saving: false,
      }));
      setFiles((prev) =>
        prev.map((f) =>
          f.id === shareModal.file.id
            ? {
                ...f,
                is_public: res.is_public ? 1 : 0,
                share_token: res.share_token,
                download_limit: res.download_limit,
              }
            : f
        )
      );
      showToast(res.message || (makePublic ? 'Public share link activated' : 'File set to private (sharing disabled)'), 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update sharing', 'error');
      setShareModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleSaveDownloadLimit = async () => {
    if (!shareModal.file) return;
    setShareModal((prev) => ({ ...prev, saving: true }));
    try {
      const limitVal = shareModal.downloadLimit ? parseInt(shareModal.downloadLimit, 10) : null;
      const res = await apiRequest(`/files/${shareModal.file.id}/share`, {
        method: 'POST',
        body: {
          is_public: shareModal.isPublic ? 1 : 0,
          download_limit: limitVal,
        },
      });
      setShareModal((prev) => ({
        ...prev,
        downloadLimit: res.download_limit ? String(res.download_limit) : '',
        saving: false,
      }));
      setFiles((prev) =>
        prev.map((f) =>
          f.id === shareModal.file.id
            ? { ...f, download_limit: res.download_limit }
            : f
        )
      );
      showToast('Download limit updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update download limit', 'error');
      setShareModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const copyShareLink = () => {
    if (!shareModal.shareUrl) return;
    navigator.clipboard.writeText(shareModal.shareUrl);
    showToast('Share link copied to clipboard!', 'success');
  };

  // Direct copy link from right click
  const copyShareLinkDirect = (file) => {
    if (!file) return;
    if (file.is_public && file.share_token) {
      const shareUrl = `${window.location.origin}/share/${file.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      showToast('Share link copied to clipboard!', 'success');
    } else {
      openShare(file);
    }
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
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Create folder directly from context menu
  const handleCreateFolderSubmit = async () => {
    const trimmed = createFolderModal.name.trim();
    if (!trimmed) {
      showToast('Folder name is required', 'error');
      return;
    }
    setCreateFolderModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await apiRequest('/folders', {
        method: 'POST',
        body: { name: trimmed, folder_name: trimmed },
      });
      showToast('Folder created successfully', 'success');
      setCreateFolderModal({ isOpen: false, name: '', loading: false });
      await loadFolders();
      if (res?.folder?.id) {
        handleSelectFolder(String(res.folder.id));
      }
    } catch (err) {
      showToast(err.message || 'Failed to create folder', 'error');
      setCreateFolderModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Prevent closing or refreshing browser when upload is active
  useEffect(() => {
    if (!uploadTask.active || uploadTask.status === 'done' || uploadTask.status === 'error') return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Upload in progress! Closing or reloading will cancel your upload.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadTask.active, uploadTask.status]);

  // Upload files with real-time progress and instant share link generation
  const uploadFilesToFolder = async (filesList, targetFolderId = null, targetFolderName = null) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;

    const effectiveFolderId = targetFolderId !== undefined && targetFolderId !== null
      ? (targetFolderId === 'all' || targetFolderId === 'root' ? null : targetFolderId)
      : (selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root' ? selectedFolderId : null);

    const folderObj = folders.find((f) => String(f.id) === String(effectiveFolderId));
    const folderLabel = targetFolderName || (folderObj ? folderObj.folder_name : (effectiveFolderId ? `Folder #${effectiveFolderId}` : 'My Files'));

    setUploadTask({
      active: true,
      fileName: files[0].name,
      totalFiles: files.length,
      currentFileIndex: 1,
      percent: 0,
      loadedBytes: 0,
      totalBytes: files[0].size,
      status: 'uploading',
      error: null,
      folderName: folderLabel,
      shareUrl: '',
    });

    let successCount = 0;
    let lastShareUrl = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Reset speed tracker for each new file
      speedTrackRef.current = { lastTime: Date.now(), lastLoaded: 0, samples: [] };

      setUploadTask((prev) => ({
        ...prev,
        active: true,
        fileName: file.name,
        currentFileIndex: i + 1,
        totalFiles: files.length,
        percent: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        speed: 0,
        eta: 0,
        status: 'uploading',
        error: null,
        folderName: folderLabel,
      }));

      const formData = new FormData();
      formData.append('file', file);
      if (effectiveFolderId) {
        formData.append('folder_id', String(effectiveFolderId));
      }

      try {
        const res = await uploadWithProgress('/upload', formData, (percent, loaded, total) => {
          const now = Date.now();
          const tracker = speedTrackRef.current;
          const actualLoaded = loaded || Math.round((percent / 100) * file.size);
          const actualTotal = total || file.size;
          const timeDelta = (now - tracker.lastTime) / 1000; // seconds
          const bytesDelta = actualLoaded - tracker.lastLoaded;

          let speed = 0;
          let eta = 0;

          if (timeDelta > 0.15 && bytesDelta > 0) {
            const sample = bytesDelta / timeDelta;
            tracker.samples.push(sample);
            // Keep rolling window of last 5 samples for smooth averaging
            if (tracker.samples.length > 5) tracker.samples.shift();
            speed = tracker.samples.reduce((a, b) => a + b, 0) / tracker.samples.length;
            tracker.lastTime = now;
            tracker.lastLoaded = actualLoaded;
          } else if (tracker.samples.length > 0) {
            speed = tracker.samples.reduce((a, b) => a + b, 0) / tracker.samples.length;
          }

          if (speed > 0) {
            const remaining = actualTotal - actualLoaded;
            eta = Math.max(0, Math.round(remaining / speed));
          }

          setUploadTask((prev) => ({
            ...prev,
            percent,
            loadedBytes: actualLoaded,
            totalBytes: actualTotal,
            speed,
            eta,
            status: percent >= 100 ? 'saving' : 'uploading',
          }));
        }, (chunkCurrent, chunkTotal) => {
          // onChunkProgress — server is uploading chunks to Telegram
          setUploadTask((prev) => ({
            ...prev,
            status: 'saving',
            chunkCurrent,
            chunkTotal,
            speed: 0,
            eta: 0,
          }));
        });

        const shareUrl = res?.share_url || res?.file?.share_url || (res?.share_token ? `${window.location.origin}/share/${res.share_token}` : '');
        if (shareUrl) lastShareUrl = shareUrl;

        successCount++;
      } catch (err) {
        setUploadTask((prev) => ({
          ...prev,
          status: 'error',
          error: err.message || 'Upload failed',
        }));
        showToast(`Failed to upload ${file.name}: ${err.message || 'Error'}`, 'error');
      }
    }

    if (successCount > 0) {
      setUploadTask((prev) => ({
        ...prev,
        percent: 100,
        status: 'done',
        shareUrl: lastShareUrl,
      }));

      showToast(successCount === 1 ? `Uploaded "${files[0].name}" successfully!` : `${successCount} files uploaded successfully!`, 'success');
      loadFiles(true);
      loadFolders();
      refreshUser();
    }
  };

  // Direct file upload from input trigger
  const handleDirectFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const targetFid = targetFolderForUploadRef.current !== null ? targetFolderForUploadRef.current : selectedFolderId;
    targetFolderForUploadRef.current = null;
    await uploadFilesToFolder(files, targetFid);
    e.target.value = '';
  };

  // Page drag & drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      setIsDraggingPage(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingPage(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPage(false);
    setDragTargetFolderId(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFilesToFolder(e.dataTransfer.files, selectedFolderId);
    }
  };

  // Drop directly onto a specific folder card/chip
  const handleFolderDrop = async (e, folderId, folderName) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPage(false);
    setDragTargetFolderId(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFilesToFolder(e.dataTransfer.files, folderId, folderName);
    }
  };

  // Right-click on file
  const handleFileContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFileId(file.id);

    const menuWidth = 230;
    const menuHeight = 320;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX;
    let y = clientY;

    if (clientX > window.innerWidth - 280 || clientX < 220) {
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
      type: 'file',
      file,
      folder: null,
    });
  };

  // Right-click on folder card / chip
  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const menuHeight = 220;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX;
    let y = clientY;

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
      file: null,
    });
  };

  // Right-click on empty area
  const handleAreaContextMenu = (e) => {
    if (e.target.closest('.action-btn') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    e.preventDefault();

    const menuWidth = 220;
    const menuHeight = 220;
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX;
    let y = clientY;

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
      type: 'area',
      file: null,
      folder: null,
    });
  };

  // Folder rename and delete handlers
  const handleRenameFolderSubmit = async () => {
    if (!renameFolderModal.folder) return;
    const trimmed = renameFolderModal.newName.trim();
    if (!trimmed) {
      showToast('Folder name cannot be empty', 'error');
      return;
    }
    setRenameFolderModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/folders/${renameFolderModal.folder.id}`, {
        method: 'PUT',
        body: { name: trimmed, folder_name: trimmed },
      });
      showToast('Folder renamed successfully', 'success');
      setRenameFolderModal({ isOpen: false, folder: null, newName: '', loading: false });
      loadFolders();
      loadFiles(true);
    } catch (err) {
      showToast(err.message || 'Failed to rename folder', 'error');
      setRenameFolderModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteFolderSubmit = async () => {
    if (!deleteFolderModal.folder) return;
    setDeleteFolderModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiRequest(`/folders/${deleteFolderModal.folder.id}`, {
        method: 'DELETE',
      });
      showToast(`Folder "${deleteFolderModal.folder.folder_name}" deleted`, 'success');
      setDeleteFolderModal({ isOpen: false, folder: null, loading: false });
      if (String(selectedFolderId) === String(deleteFolderModal.folder.id)) {
        handleSelectFolder('all');
      }
      loadFolders();
      loadFiles(true);
    } catch (err) {
      showToast(err.message || 'Failed to delete folder', 'error');
      setDeleteFolderModal((prev) => ({ ...prev, loading: false }));
    }
  };


  // Active folder object
  const currentFolder = folders.find((f) => String(f.id) === String(selectedFolderId));

  // Dynamic breadcrumbs & Titles
  const getFilterLabel = () => {
    switch (activeFilter) {
      case 'shared': return 'Shared items';
      case 'recent': return 'Recents';
      case 'favorites': return 'Favourites';
      case 'trash': return 'Rubbish bin';
      default: return null;
    }
  };

  const filterLabel = getFilterLabel();

  const breadcrumbs = [
    { label: 'Storage', to: '/files' },
    ...(filterLabel
      ? [
          {
            label: filterLabel,
            active: true,
          },
        ]
      : [
          {
            label: 'My Files',
            to: selectedFolderId === 'all' ? null : '/files',
            onClick: selectedFolderId === 'all' ? null : () => handleSelectFolder('all'),
            active: selectedFolderId === 'all',
          },
          ...(selectedFolderId !== 'all'
            ? [
                {
                  label:
                    selectedFolderId === 'root'
                      ? 'Root'
                      : currentFolder
                      ? currentFolder.folder_name
                      : `Folder #${selectedFolderId}`,
                  active: true,
                },
              ]
            : []),
        ]),
  ];

  const getPageTitle = () => {
    if (activeFilter === 'shared') return 'Shared items';
    if (activeFilter === 'recent') return 'Recents';
    if (activeFilter === 'favorites') return 'Favourites';
    if (activeFilter === 'trash') return 'Rubbish bin';
    if (selectedFolderId === 'all') return 'Files';
    if (selectedFolderId === 'root') return 'Root Files';
    return currentFolder?.folder_name || 'Folder Files';
  };

  const getPageSubtitle = () => {
    if (activeFilter === 'shared') return 'Files shared publicly with active share tokens and direct download links';
    if (activeFilter === 'recent') return 'Recently uploaded and accessed files in your cloud storage';
    if (activeFilter === 'favorites') return 'Your starred and favourite files for quick one-click access';
    if (activeFilter === 'trash') return 'Deleted files in your rubbish bin. You can restore or permanently delete them.';
    return `${filteredFiles.length} ${filteredFiles.length === 1 ? 'file' : 'files'} in your cloud storage`;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hidden input for direct file upload (supports multiple files) */}
      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleDirectFileUpload}
        multiple
        style={{ display: 'none' }}
      />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={breadcrumbs}
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
              <Link
                to={`/upload${selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root' ? `?folder_id=${selectedFolderId}` : ''}`}
                className="btn btn-primary btn-sm"
              >
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

        <main
          className="dashboard-container"
          onContextMenu={handleAreaContextMenu}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ position: 'relative', minHeight: '80vh' }}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDraggingPage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(5, 8, 22, 0.92)',
                border: '2px dashed var(--cyan)',
                borderRadius: 'var(--radius)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                pointerEvents: 'none',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(0, 212, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cyan)',
                }}
              >
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                Drop files here to upload
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--cyan)', fontWeight: 500 }}>
                Destination: <strong>{currentFolder ? currentFolder.folder_name : 'My Files (Root)'}</strong>
              </div>
            </div>
          )}

          {/* Header & stats */}
          <div className="page-header-row">
            <div>
              <h1 className="page-title">{getPageTitle()}</h1>
              <p className="page-desc">
                {getPageSubtitle()}
                {refreshing && <span className="sync-badge">Syncing...</span>}
              </p>
            </div>
            <div className="controls-row">
              {activeFilter === 'trash' && filteredFiles.length > 0 && (
                <button
                  className="btn btn-secondary danger btn-sm"
                  onClick={emptyTrash}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Empty Rubbish Bin
                </button>
              )}

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
              </div>
            </div>
          </div>

          {/* Folder Chips Filter (only when viewing All Files) */}
          {activeFilter === 'all' && (
            <div className="folder-chips">
              <button
                className={`chip ${selectedFolderId === 'all' ? 'active' : ''}`}
                onClick={() => handleSelectFolder('all')}
              >
                All Files
              </button>
              <button
                className={`chip ${selectedFolderId === 'root' ? 'active' : ''}`}
                onClick={() => handleSelectFolder('root')}
              >
                Root
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={`chip ${String(selectedFolderId) === String(f.id) ? 'active' : ''}`}
                  onClick={() => handleSelectFolder(String(f.id))}
                  onContextMenu={(e) => handleFolderContextMenu(e, f)}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolderId(f.id); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolderId(null); }}
                  onDrop={(e) => handleFolderDrop(e, f.id, f.folder_name)}
                  style={dragTargetFolderId === f.id ? { borderColor: 'var(--cyan)', boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)' } : {}}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {f.folder_name}
                </button>
              ))}
            </div>
          )}

          {/* If viewing a specific folder, show Folder Banner */}
          {activeFilter === 'all' && selectedFolderId !== 'all' && selectedFolderId !== 'root' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 18px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="folder-icon-inline" style={{ width: '38px', height: '38px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                    {currentFolder?.folder_name || `Folder #${selectedFolderId}`}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} in this folder
                  </p>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectFolder('all')}
              >
                ← Back to All Files
              </button>
            </div>
          )}

          {/* If viewing All Files, show quick Folder Cards above files */}
          {activeFilter === 'all' && selectedFolderId === 'all' && folders.length > 0 && !searchQuery && (
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Folders ({folders.length})
                </span>
                <Link to="/folders" style={{ fontSize: '0.82rem', color: 'var(--cyan)', textDecoration: 'none' }}>
                  Manage Folders →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {folders.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectFolder(String(f.id))}
                    onContextMenu={(e) => handleFolderContextMenu(e, f)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolderId(f.id); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolderId(null); }}
                    onDrop={(e) => handleFolderDrop(e, f.id, f.folder_name)}
                    style={{
                      background: dragTargetFolderId === f.id ? 'rgba(0, 212, 255, 0.14)' : 'var(--surface)',
                      border: dragTargetFolderId === f.id ? '2px dashed var(--cyan)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: dragTargetFolderId === f.id ? '0 0 14px rgba(0, 212, 255, 0.35)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (dragTargetFolderId !== f.id) {
                        e.currentTarget.style.borderColor = 'var(--cyan)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dragTargetFolderId !== f.id) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ color: 'var(--cyan)' }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.folder_name}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {f.file_count || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  : selectedFolderId !== 'all' && selectedFolderId !== 'root'
                  ? `No files uploaded in folder "${currentFolder?.folder_name || selectedFolderId}" yet.`
                  : 'Start uploading your documents, photos, and media.'}
              </p>
              <Link
                to={`/upload${selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root' ? `?folder_id=${selectedFolderId}` : ''}`}
                className="btn btn-primary"
                style={{ marginTop: '14px' }}
              >
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
                  <div
                    key={f.id}
                    className={`file-card ${selectedFileId === f.id ? 'selected-card' : ''}`}
                    onContextMenu={(e) => handleFileContextMenu(e, f)}
                    onClick={() => setSelectedFileId(f.id)}
                  >
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
                        <span title={`${downloads} download${downloads !== 1 ? 's' : ''}`}>
                          {downloads} {downloads === 1 ? 'dl' : 'dls'}
                        </span>
                        <span title={f.created_at ? `${new Date(f.created_at).toLocaleString()} (${relativeDate(f.created_at)})` : ''}>
                          {formatDateTime(f.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="file-card-actions">
                      {activeFilter === 'trash' ? (
                        <>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreFromTrash(f.id);
                            }}
                            title="Restore file to storage"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(f);
                            }}
                            title="Permanently delete file"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(f.id);
                            }}
                            title={favoriteIds.includes(f.id) ? 'Remove from Favourites' : 'Add to Favourites'}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill={favoriteIds.includes(f.id) ? '#f59e0b' : 'none'}
                              stroke={favoriteIds.includes(f.id) ? '#f59e0b' : 'currentColor'}
                              strokeWidth="2"
                              width="13"
                              height="13"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              moveToTrash(f.id);
                            }}
                            title="Move to Rubbish bin"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </>
                      )}
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
                      <tr
                        key={f.id}
                        className={selectedFileId === f.id ? 'selected-row' : ''}
                        onContextMenu={(e) => handleFileContextMenu(e, f)}
                        onClick={() => setSelectedFileId(f.id)}
                      >
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
                        <td title={f.created_at ? `${new Date(f.created_at).toLocaleString()} (${relativeDate(f.created_at)})` : ''}>
                          {formatDateTime(f.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {activeFilter === 'trash' ? (
                              <>
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restoreFromTrash(f.id);
                                  }}
                                  title="Restore file to storage"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                  </svg>
                                </button>
                                <button
                                  className="action-btn danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDelete(f);
                                  }}
                                  title="Permanently delete file"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(f.id);
                                  }}
                                  title={favoriteIds.includes(f.id) ? 'Remove from Favourites' : 'Add to Favourites'}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill={favoriteIds.includes(f.id) ? '#f59e0b' : 'none'}
                                    stroke={favoriteIds.includes(f.id) ? '#f59e0b' : 'currentColor'}
                                    strokeWidth="2"
                                    width="13"
                                    height="13"
                                  >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </button>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveToTrash(f.id);
                                  }}
                                  title="Move to Rubbish bin"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </>
                            )}
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

      {/* Right Click Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="custom-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' && contextMenu.file && (
            <>
              <div className="context-menu-header" title={contextMenu.file.file_name || contextMenu.file.original_name}>
                {contextMenu.file.file_name || contextMenu.file.original_name}
              </div>
              <button
                className="context-menu-item"
                onClick={() => {
                  handleDownload(contextMenu.file);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  copyShareLinkDirect(contextMenu.file);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copy link
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openShare(contextMenu.file);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  setInfoModal({ isOpen: true, file: contextMenu.file });
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Info
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openRename(contextMenu.file);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Rename
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  openMove(contextMenu.file);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <polyline points="5 9 2 12 5 15" />
                  <polyline points="9 5 12 2 15 5" />
                  <polyline points="15 19 12 22 9 19" />
                  <polyline points="19 9 22 12 19 15" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
                Move
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  toggleFavorite(contextMenu.file.id);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill={favoriteIds.includes(contextMenu.file.id) ? '#f59e0b' : 'none'} stroke={favoriteIds.includes(contextMenu.file.id) ? '#f59e0b' : 'currentColor'} strokeWidth="2" width="15" height="15">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {favoriteIds.includes(contextMenu.file.id) ? 'Remove from Favourites' : 'Add to Favourites'}
              </button>
              <div className="context-menu-divider" />
              {activeFilter === 'trash' ? (
                <>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      restoreFromTrash(contextMenu.file.id);
                      setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Restore from Rubbish bin
                  </button>
                  <button
                    className="context-menu-item danger"
                    onClick={() => {
                      openDelete(contextMenu.file);
                      setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete permanently
                  </button>
                </>
              ) : (
                <button
                  className="context-menu-item danger"
                  onClick={() => {
                    moveToTrash(contextMenu.file.id);
                    setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Move to Rubbish bin
                </button>
              )}
            </>
          )}

          {contextMenu.type === 'area' && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  targetFolderForUploadRef.current = (selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root') ? selectedFolderId : null;
                  hiddenFileInputRef.current?.click();
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload files {currentFolder ? `to "${currentFolder.folder_name}"` : 'here'}
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  navigate(`/upload${selectedFolderId && selectedFolderId !== 'all' && selectedFolderId !== 'root' ? `?folder_id=${selectedFolderId}` : ''}`);
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <polyline points="12 11 12 17" />
                  <polyline points="9 14 12 11 15 14" />
                </svg>
                Upload page
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item"
                onClick={() => {
                  setCreateFolderModal({ isOpen: true, name: '', loading: false });
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
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
                  loadFiles(false);
                  loadFolders();
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                  showToast('Files refreshed', 'info');
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

          {contextMenu.type === 'folder' && contextMenu.folder && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  handleSelectFolder(String(contextMenu.folder.id));
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Open Folder
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  targetFolderForUploadRef.current = contextMenu.folder.id;
                  hiddenFileInputRef.current?.click();
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload files to "{contextMenu.folder.folder_name}"
              </button>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item"
                onClick={() => {
                  setRenameFolderModal({
                    isOpen: true,
                    folder: contextMenu.folder,
                    newName: contextMenu.folder.folder_name,
                    loading: false,
                  });
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Rename folder
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => {
                  setDeleteFolderModal({
                    isOpen: true,
                    folder: contextMenu.folder,
                    loading: false,
                  });
                  setContextMenu({ isOpen: false, x: 0, y: 0, type: null, file: null, folder: null });
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
        </div>
      )}

      {/* File Info / Details Modal */}
      <Modal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, file: null })}
        title="File Details"
        confirmText="Close"
        onConfirm={() => setInfoModal({ isOpen: false, file: null })}
      >
        {infoModal.file && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <span
                className="file-badge"
                style={{
                  background: mimeInfo(infoModal.file.mime_type || '').bg,
                  color: mimeInfo(infoModal.file.mime_type || '').color,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {mimeInfo(infoModal.file.mime_type || '').label}
              </span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word', fontSize: '0.98rem' }}>
                  {infoModal.file.file_name || infoModal.file.original_name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                  ID: #{infoModal.file.id}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Size:</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                {formatBytes(infoModal.file.file_size ?? infoModal.file.size_bytes ?? 0)} ({Number(infoModal.file.size_bytes ?? 0).toLocaleString()} bytes)
              </span>

              <span style={{ color: 'var(--text-muted)' }}>MIME Type:</span>
              <span style={{ color: 'var(--text)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                {infoModal.file.mime_type || 'Unknown'}
              </span>

              <span style={{ color: 'var(--text-muted)' }}>Folder:</span>
              <span style={{ color: 'var(--text)' }}>
                {infoModal.file.folder_id
                  ? folders.find((f) => f.id === infoModal.file.folder_id)?.folder_name || `Folder #${infoModal.file.folder_id}`
                  : 'Root (No folder)'}
              </span>

              <span style={{ color: 'var(--text-muted)' }}>Uploaded:</span>
              <span style={{ color: 'var(--text)' }}>
                {formatDateTime(infoModal.file.created_at)}
              </span>

              <span style={{ color: 'var(--text-muted)' }}>Downloads:</span>
              <span style={{ color: 'var(--text)' }}>
                {infoModal.file.downloads ?? 0} {infoModal.file.download_limit ? `/ ${infoModal.file.download_limit} max` : 'downloads'}
              </span>

              <span style={{ color: 'var(--text-muted)' }}>Sharing:</span>
              <span style={{ color: infoModal.file.is_public === 1 ? 'var(--cyan)' : 'var(--text-muted)' }}>
                {infoModal.file.is_public === 1 ? 'Public link active' : 'Private (Only you)'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={createFolderModal.isOpen}
        onClose={() => setCreateFolderModal({ isOpen: false, name: '', loading: false })}
        title="Create New Folder"
        confirmText="Create Folder"
        onConfirm={handleCreateFolderSubmit}
        loading={createFolderModal.loading}
      >
        <div className="form-group">
          <label htmlFor="files-create-folder-name">Folder Name</label>
          <input
            id="files-create-folder-name"
            type="text"
            className="input-field"
            value={createFolderModal.name}
            onChange={(e) => setCreateFolderModal((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Invoices, Photos, Software"
            autoFocus
          />
        </div>
      </Modal>

      {/* Rename File Modal */}
      <Modal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, file: null, newName: '', loading: false })}
        title="Rename File"
        confirmText="Save Name"
        onConfirm={handleRenameSubmit}
        loading={renameModal.loading}
      >
        <div className="form-group">
          <label htmlFor="rename-input">New File Name</label>
          <input
            id="rename-input"
            type="text"
            className="input-field"
            value={renameModal.newName}
            onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
            autoFocus
          />
        </div>
      </Modal>

      {/* Share File Modal */}
      <Modal
        isOpen={shareModal.isOpen}
        onClose={() =>
          setShareModal({
            isOpen: false,
            file: null,
            shareUrl: '',
            isPublic: false,
            downloadLimit: '',
            loading: false,
            saving: false,
          })
        }
        title="File Sharing & Privacy"
        confirmText="Close"
        onConfirm={() =>
          setShareModal({
            isOpen: false,
            file: null,
            shareUrl: '',
            isPublic: false,
            downloadLimit: '',
            loading: false,
            saving: false,
          })
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>
                Sharing Status
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {shareModal.isPublic ? (
                  <span style={{ color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Public Link Active
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Private (Only You)
                  </span>
                )}
              </div>
            </div>

            <div>
              {shareModal.isPublic ? (
                <button
                  className="btn btn-secondary danger"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                  onClick={() => handleToggleShare(false)}
                  disabled={shareModal.saving}
                  title="Make file private and revoke public share link"
                >
                  {shareModal.saving ? 'Saving...' : 'Set to Private'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  onClick={() => handleToggleShare(true)}
                  disabled={shareModal.saving}
                  title="Generate a public shareable link"
                >
                  {shareModal.saving ? 'Saving...' : 'Enable Public Link'}
                </button>
              )}
            </div>
          </div>

          {shareModal.isPublic ? (
            <>
              {/* Share link input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>
                  Public Share Link
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={shareModal.shareUrl}
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: '0.84rem' }}
                  />
                  <button className="btn btn-secondary" onClick={copyShareLink} style={{ whiteSpace: 'nowrap' }}>
                    Copy Link
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '6px' }}>
                  Anyone with this link can view and download <strong>{shareModal.file?.file_name || shareModal.file?.original_name || 'this file'}</strong> without an account.
                </p>
              </div>

              {/* Download limit setting */}
              <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '8px' }}>
                <label htmlFor="share-download-limit" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>
                  Download Limit (Optional)
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '8px' }}>
                  Set a maximum number of downloads. Once reached, downloads will be automatically blocked. Leave blank for unlimited.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="share-download-limit"
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="e.g. 5 (or blank for unlimited)"
                    value={shareModal.downloadLimit}
                    onChange={(e) => setShareModal((prev) => ({ ...prev, downloadLimit: e.target.value }))}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleSaveDownloadLimit}
                    disabled={shareModal.saving}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {shareModal.saving ? 'Saving...' : 'Save Limit'}
                  </button>
                </div>
                {shareModal.file?.download_limit && (
                  <p style={{ color: '#00d4ff', fontSize: '0.76rem', marginTop: '6px' }}>
                    Current Limit: {shareModal.file.download_limit} downloads ({shareModal.file.downloads || 0} used)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
              <p>This file is currently <strong>Private</strong>. Only you can access or download it.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                Click <strong>"Enable Public Link"</strong> above whenever you want to generate a shareable link.
              </p>
            </div>
          )}
        </div>
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

      {/* Rename Folder Modal */}
      <Modal
        isOpen={renameFolderModal.isOpen}
        onClose={() => setRenameFolderModal({ isOpen: false, folder: null, newName: '', loading: false })}
        title="Rename Folder"
        confirmText="Save Name"
        onConfirm={handleRenameFolderSubmit}
        loading={renameFolderModal.loading}
      >
        <div className="form-group">
          <label htmlFor="rename-folder-input">New Folder Name</label>
          <input
            id="rename-folder-input"
            type="text"
            className="input-field"
            value={renameFolderModal.newName}
            onChange={(e) => setRenameFolderModal((prev) => ({ ...prev, newName: e.target.value }))}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal
        isOpen={deleteFolderModal.isOpen}
        onClose={() => setDeleteFolderModal({ isOpen: false, folder: null, loading: false })}
        title="Delete Folder"
        confirmText="Delete Folder"
        confirmVariant="danger"
        onConfirm={handleDeleteFolderSubmit}
        loading={deleteFolderModal.loading}
      >
        <p style={{ color: 'var(--text)', fontSize: '0.94rem' }}>
          Are you sure you want to delete the folder <strong>"{deleteFolderModal.folder?.folder_name}"</strong>?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '6px' }}>
          Files inside this folder will not be deleted; their folder assignment will simply be removed.
        </p>
      </Modal>

      {/* Floating Upload Progress & Instant Link Card */}
      {uploadTask.active && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--surface, #161b26)',
            border: uploadTask.status === 'done' ? '1px solid rgba(0, 224, 139, 0.4)' : '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '12px',
            padding: '16px 18px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(0, 212, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {uploadTask.status === 'uploading' && (
                <span className="spinner-sm" style={{ borderColor: 'rgba(0, 212, 255, 0.3)', borderTopColor: '#00d4ff' }} />
              )}
              {uploadTask.status === 'saving' && (
                <span className="spinner-sm" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', borderTopColor: '#f59e0b' }} />
              )}
              {uploadTask.status === 'done' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="#00e08b" strokeWidth="2.5" width="18" height="18">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {uploadTask.status === 'error' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2.5" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                {uploadTask.status === 'uploading' && `Uploading (${uploadTask.currentFileIndex}/${uploadTask.totalFiles})`}
                {uploadTask.status === 'saving' && (uploadTask.chunkTotal > 0
                  ? `Saving to Telegram (${uploadTask.chunkCurrent}/${uploadTask.chunkTotal})`
                  : 'Processing file...')}
                {uploadTask.status === 'done' && 'Upload Complete! (100%)'}
                {uploadTask.status === 'error' && 'Upload Failed'}
              </span>
            </div>
            <button
              className="icon-btn"
              style={{ width: '26px', height: '26px', minWidth: '26px', padding: 0 }}
              onClick={() => {
                if (uploadTask.status === 'uploading' || uploadTask.status === 'saving') {
                  if (!window.confirm('Upload is still in progress. Dismiss this notification?')) return;
                }
                setUploadTask((prev) => ({ ...prev, active: false }));
              }}
              title="Close notification"
            >
              &times;
            </button>
          </div>

          {/* File Name & Destination Folder */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                fontSize: '0.84rem',
                fontWeight: 500,
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={uploadTask.fileName}
            >
              {uploadTask.fileName}
            </div>
            {uploadTask.folderName && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Target: <span style={{ color: 'var(--cyan)' }}>{uploadTask.folderName}</span>
              </div>
            )}
          </div>

          {/* Warning Banner during active upload */}
          {(uploadTask.status === 'uploading' || uploadTask.status === 'saving') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '6px',
                padding: '6px 10px',
                marginBottom: '10px',
                fontSize: '0.74rem',
                color: '#f59e0b',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Do not close or reload browser while uploading</span>
            </div>
          )}

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'var(--surface-hover, #212836)',
              overflow: 'hidden',
              marginBottom: '6px',
            }}
          >
            <div
              className={uploadTask.status === 'saving' && uploadTask.chunkTotal > 0 ? '' : ''}
              style={{
                width: uploadTask.status === 'saving' && uploadTask.chunkTotal > 0
                  ? `${Math.round((uploadTask.chunkCurrent / uploadTask.chunkTotal) * 100)}%`
                  : `${uploadTask.percent}%`,
                height: '100%',
                background:
                  uploadTask.status === 'error'
                    ? '#ff4757'
                    : uploadTask.status === 'done'
                    ? 'linear-gradient(90deg, #00e08b, #00d4ff)'
                    : uploadTask.status === 'saving'
                    ? 'linear-gradient(90deg, #f59e0b, #ff6b35)'
                    : 'linear-gradient(90deg, #00d4ff, #7928ca)',
                borderRadius: '4px',
                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {/* Progress Text, Speed & ETA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>
              {uploadTask.status === 'saving' && uploadTask.chunkTotal > 0
                ? `Chunk ${uploadTask.chunkCurrent}/${uploadTask.chunkTotal}`
                : `${uploadTask.percent}%`}
            </span>
            <span>
              {formatBytes(uploadTask.loadedBytes)} / {formatBytes(uploadTask.totalBytes)}
            </span>
          </div>
          {uploadTask.status === 'uploading' && uploadTask.speed > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.85 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                {formatBytes(uploadTask.speed)}/s
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {uploadTask.eta < 5 ? 'Almost done…' : uploadTask.eta < 60 ? `${uploadTask.eta}s left` : uploadTask.eta < 3600 ? `${Math.floor(uploadTask.eta / 60)}m ${uploadTask.eta % 60}s left` : `${Math.floor(uploadTask.eta / 3600)}h ${Math.floor((uploadTask.eta % 3600) / 60)}m left`}
              </span>
            </div>
          )}

          {/* Instant Share Link (shown immediately on 100% completion) */}
          {uploadTask.status === 'done' && uploadTask.shareUrl && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Direct Share Link (Instant)
                </span>
                <span style={{ fontSize: '0.7rem', color: '#00e08b' }}>Ready to share</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={uploadTask.shareUrl}
                  className="input-field"
                  style={{
                    flex: 1,
                    fontSize: '0.78rem',
                    padding: '6px 8px',
                    fontFamily: 'monospace',
                    height: '32px',
                  }}
                  onClick={(e) => e.target.select()}
                />
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0 12px', height: '32px', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    navigator.clipboard.writeText(uploadTask.shareUrl);
                    showToast('Direct share link copied to clipboard!', 'success');
                  }}
                >
                  Copy Link
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '4px 10px', height: '26px' }}
                  onClick={() => window.open(uploadTask.shareUrl, '_blank')}
                >
                  Open Link
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '4px 10px', height: '26px' }}
                  onClick={() => setUploadTask((prev) => ({ ...prev, active: false }))}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadTask.status === 'error' && (
            <div style={{ marginTop: '10px', color: '#ff4757', fontSize: '0.76rem' }}>
              Error: {uploadTask.error || 'Failed to upload'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
