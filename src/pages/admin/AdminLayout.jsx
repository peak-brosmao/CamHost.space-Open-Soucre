import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const BREADCRUMB_MAP = {
  '/admin/dashboard': ['Dashboard Overview'],
  '/admin/users': ['User Management', 'All Users'],
  '/admin/users/activity': ['User Management', 'User Activity'],
  '/admin/files': ['File Management', 'All Files'],
  '/admin/files/reported': ['File Management', 'Reported Files'],
  '/admin/files/expired': ['File Management', 'Expired Files'],
  '/admin/files/blocked': ['File Management', 'Blocked Files'],
  '/admin/storage': ['Storage Management', 'Storage Overview'],
  '/admin/uploads': ['Upload Management', 'Upload Overview'],
  '/admin/downloads': ['Download Management', 'Download Overview'],
  '/admin/security': ['Security & Abuse', 'Audit & Abuse Logs'],
  '/admin/health': ['System Health', 'Health Monitor'],
  '/admin/subscriptions': ['Subscriptions', 'Plans & Payments'],
  '/admin/settings/general': ['Platform Core', 'General Settings'],
  '/admin/settings/advanced': ['Platform Core', 'Advanced Settings'],
  '/admin/settings/appearance': ['Platform Core', 'Appearance'],
  '/admin/settings/maintenance': ['Platform Core', 'Maintenance Mode'],
  '/admin/settings/license': ['Platform Core', 'License'],
  '/admin/settings/user-guest': ['Users & Security', 'User & Guest Settings'],
  '/admin/settings/admins': ['Users & Security', 'Admins & Passkey'],
  '/admin/settings/captcha': ['Users & Security', 'Captcha Settings'],
  '/admin/settings/smtp': ['Content & Comms', 'SMTP Settings'],
  '/admin/settings/email-templates': ['Content & Comms', 'Email Templates'],
  '/admin/settings/blog': ['Content & Comms', 'Blog Settings'],
  '/admin/settings/seo': ['Content & Comms', 'SEO & Verification'],
  '/admin/settings/languages': ['Content & Comms', 'Languages'],
  '/admin/settings/ads': ['System & Operations', 'Ads & Social Button'],
  '/admin/settings/api': ['System & Operations', 'API & Telegram'],
  '/admin/settings/cron': ['System & Operations', 'Cron Job'],
  '/admin/settings/cache': ['System & Operations', 'Cache Control'],
  '/admin/settings/system-info': ['System & Operations', 'System Info'],
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Admin'];

  const handlePurgeCache = async () => {
    if (!window.confirm('Clear all rate-limit counters and security cache?')) return;
    try {
      const res = await apiRequest('/admin/cache-clear', { method: 'POST' });
      showToast(res.message || 'Cache cleared', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to purge cache', 'error');
    }
  };

  // Redirect /admin → /admin/dashboard
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="admin-main">
        {/* Admin Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
            >
              <IconMenu />
            </button>
            <nav className="admin-breadcrumbs" aria-label="breadcrumb">
              <span className="admin-breadcrumb-root">Admin</span>
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  <span className="admin-breadcrumb-sep">›</span>
                  <span className={`admin-breadcrumb-item ${i === crumbs.length - 1 ? 'current' : ''}`}>{c}</span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="admin-topbar-right">
            <button
              className="admin-topbar-btn"
              onClick={handlePurgeCache}
              title="Flush Rate Limits & Cache"
            >
              <IconTrash />
              <span>Flush Cache</span>
            </button>
            <div className="admin-topbar-user">
              <div className="admin-topbar-avatar">
                {(user?.display_name || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="admin-topbar-userinfo">
                <span className="admin-topbar-name">{user?.display_name || user?.email}</span>
                <span className="admin-topbar-badge">System Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
