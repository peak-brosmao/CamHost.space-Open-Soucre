import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    apiRequest('/public-settings')
      .then((res) => {
        const s = res?.settings;
        if (!s) return;

        // Apply appearance accent color if custom
        if (s.accent_color && s.accent_color.startsWith('#')) {
          document.documentElement.style.setProperty('--color-primary', s.accent_color);
        }

        // Apply site name
        if (s.site_name && !document.title.includes(s.site_name)) {
          document.title = `${s.site_name} — Private Cloud Storage`;
        }

        // Check if announcement banner is enabled
        if (s.banner_enabled === '1' && s.announcement_banner?.trim()) {
          const bannerKey = `ch_banner_${s.announcement_banner.substring(0, 32)}`;
          if (sessionStorage.getItem(bannerKey) !== 'dismissed') {
            setBanner({
              text: s.announcement_banner,
              type: s.banner_type || 'info',
              key: bannerKey,
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!banner || dismissed) return null;

  const typeStyles = {
    info: { bg: 'rgba(0, 212, 255, 0.12)', border: 'rgba(0, 212, 255, 0.3)', color: '#00d4ff' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
    danger: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
    success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
  };

  const style = typeStyles[banner.type] || typeStyles.info;

  const handleDismiss = () => {
    setDismissed(true);
    if (banner.key) {
      sessionStorage.setItem(banner.key, 'dismissed');
    }
  };

  return (
    <div
      style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        color: style.color,
        padding: '8px 16px',
        fontSize: '0.84rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1000,
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 32 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{banner.text}</span>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: style.color,
          cursor: 'pointer',
          padding: 4,
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Dismiss banner"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
