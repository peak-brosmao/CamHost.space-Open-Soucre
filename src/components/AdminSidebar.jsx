import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconFiles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconStorage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconHealth = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: 'auto' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const NAV_STRUCTURE = [
  { to: '/admin/dashboard', label: 'Dashboard Overview', icon: <IconDashboard /> },
  {
    id: 'platform_core',
    label: 'Platform Core',
    icon: <IconSettings />,
    items: [
      { to: '/admin/settings/general', label: 'General Settings' },
      { to: '/admin/settings/advanced', label: 'Advanced Settings' },
      { to: '/admin/settings/appearance', label: 'Appearance' },
      { to: '/admin/settings/maintenance', label: 'Maintenance Mode' },
      { to: '/admin/settings/license', label: 'License' },
    ],
  },
  {
    id: 'users_security',
    label: 'Users & Security',
    icon: <IconShield />,
    items: [
      { to: '/admin/settings/user-guest', label: 'User & Guest Settings' },
      { to: '/admin/settings/admins', label: 'Admins & Passkey' },
      { to: '/admin/settings/captcha', label: 'Captcha Settings' },
    ],
  },
  {
    id: 'content_comms',
    label: 'Content & Comms',
    icon: <IconFiles />,
    items: [
      { to: '/admin/settings/smtp', label: 'SMTP Settings' },
      { to: '/admin/settings/email-templates', label: 'Email Templates' },
      { to: '/admin/settings/blog', label: 'Blog Settings' },
      { to: '/admin/settings/seo', label: 'SEO & Verification' },
      { to: '/admin/settings/languages', label: 'Languages' },
    ],
  },
  {
    id: 'system_ops',
    label: 'System & Operations',
    icon: <IconHealth />,
    items: [
      { to: '/admin/settings/ads', label: 'Ads & Social Button' },
      { to: '/admin/settings/api', label: 'API & Telegram' },
      { to: '/admin/settings/cron', label: 'Cron Job' },
      { to: '/admin/settings/cache', label: 'Cache Control' },
      { to: '/admin/settings/system-info', label: 'System Info' },
    ],
  },
  { divider: true },
  {
    id: 'user_mgmt',
    label: 'User Management',
    icon: <IconUsers />,
    items: [
      { to: '/admin/users', label: 'All Users' },
      { to: '/admin/users/activity', label: 'User Activity' },
    ],
  },
  {
    id: 'file_mgmt',
    label: 'File Management',
    icon: <IconFiles />,
    items: [
      { to: '/admin/files', label: 'All Files' },
      { to: '/admin/files/reported', label: 'Reported Files' },
      { to: '/admin/files/expired', label: 'Expired Files' },
      { to: '/admin/files/blocked', label: 'Blocked Files' },
    ],
  },
  { to: '/admin/storage', label: 'Storage Management', icon: <IconStorage /> },
  { to: '/admin/uploads', label: 'Upload Management', icon: <IconUpload /> },
  { to: '/admin/downloads', label: 'Download Management', icon: <IconDownload /> },
  { divider: true },
  { to: '/admin/security', label: 'Security & Abuse Logs', icon: <IconShield /> },
  { to: '/admin/health', label: 'System Health', icon: <IconHealth /> },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: <IconStar />, badge: 'Optional' },
];

function NavEntry({ item, onClose, location }) {
  if (item.divider) {
    return <div className="admin-nav-divider" />;
  }

  // Direct single-link items
  if (item.to && !item.items) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/admin/dashboard'}
        className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
        onClick={onClose}
        style={{ textTransform: 'none' }}
      >
        {item.icon && <span className="admin-nav-icon">{item.icon}</span>}
        <span className="admin-nav-text-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>{item.label}</span>
        {item.badge && <span className="admin-nav-badge">{item.badge}</span>}
      </NavLink>
    );
  }

  // Accordion section
  const isChildActive = item.items?.some(
    sub => location.pathname === sub.to || (sub.to !== '/admin' && location.pathname.startsWith(sub.to + '/'))
  );
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  return (
    <div className="admin-nav-group">
      <button
        type="button"
        className={`admin-nav-group-header ${isChildActive ? 'child-active' : ''}`}
        onClick={() => setOpen(!open)}
        style={{ textTransform: 'none', letterSpacing: 'normal' }}
      >
        <span className="admin-nav-icon">{item.icon}</span>
        <span className="admin-nav-group-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>{item.label}</span>
        {item.badge && <span className="admin-nav-badge">{item.badge}</span>}
        <IconChevron open={open} />
      </button>
      {open && (
        <div className="admin-nav-group-items">
          {item.items.map((sub) => (
            <NavLink
              key={sub.to}
              to={sub.to}
              end={sub.to.split('/').length <= 3}
              className={({ isActive }) => `admin-nav-item sub ${isActive ? 'active' : ''}`}
              onClick={onClose}
              style={{ textTransform: 'none' }}
            >
              <span className="admin-nav-text-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>{sub.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.display_name || user?.email || 'Admin';

  return (
    <>
      <div className={`admin-sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} id="admin-sidebar">
        {/* Header */}
        <div className="admin-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <Link to="/admin/dashboard" className="admin-sidebar-logo" onClick={onClose} style={{ marginBottom: 0 }}>
              <div className="admin-sidebar-logo-icon">
                <svg viewBox="0 0 40 40" fill="none" width="18" height="18">
                  <path d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z" fill="url(#asl)"/>
                  <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95"/>
                  <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8"/>
                  <defs>
                    <linearGradient id="asl" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#00d4ff"/><stop offset="1" stopColor="#7b4fff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <div className="admin-sidebar-brand">CamHost<span className="admin-sidebar-dot">.space</span></div>
                <div className="admin-sidebar-tag">Admin Control Center</div>
              </div>
            </Link>
            <button className="sidebar-close-btn admin-sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Back to user dashboard */}
          <Link to="/files" className="admin-back-link" title="Back to User Dashboard">
            <IconHome />
            <span>User Dashboard</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar-nav">
          {NAV_STRUCTURE.map((item, i) => (
            <NavEntry
              key={item.id || item.to || `nav-sep-${i}`}
              item={item}
              onClose={onClose}
              location={location}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="admin-user-name" title={displayName}>{displayName}</div>
              <div className="admin-user-role">
                <span className="admin-role-badge">System Admin</span>
              </div>
            </div>
          </div>
          <div className="admin-sidebar-footer-actions">
            <button
              type="button"
              className="admin-sidebar-mode-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              type="button"
              className="admin-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <IconLogout />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
