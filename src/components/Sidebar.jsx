import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.display_name || user?.email || 'Account';

  const navItems = [
    {
      to: '/files',
      label: 'My Files',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      to: '/folders',
      label: 'My Folders',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      ),
    },
    {
      to: '/upload',
      label: 'Upload',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    // Admin only tab: Hidden from regular users
    ...(isAdmin
      ? [
          {
            to: '/signups',
            label: 'Signups',
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            ),
          },
        ]
      : []),
    {
      to: '/settings',
      label: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
              <path
                d="M20 5C12.268 5 6 11.268 6 19c0 4.418 2.015 8.374 5.195 11H8a1 1 0 000 2h24a1 1 0 000-2h-3.195C31.985 27.374 34 23.418 34 19c0-7.732-6.268-14-14-14z"
                fill="url(#sl)"
              />
              <path d="M26.5 16.5L18 20l-4-1.5 12.5-4.5v2.5z" fill="white" opacity=".95" />
              <path d="M18 20l2 5-2-2-1-3z" fill="white" opacity=".8" />
              <defs>
                <linearGradient id="sl" x1="6" y1="5" x2="34" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00d4ff" />
                  <stop offset="1" stopColor="#0077ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <span className="sidebar-brand">
              CamHost<span className="sidebar-dot">.space</span>
            </span>
            <span className="sidebar-tag">File Manager</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Storage</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-email" title={displayName}>
                {displayName}
              </div>
              <div className="user-role">{user?.role || 'user'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
