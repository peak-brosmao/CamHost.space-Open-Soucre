import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const SECTIONS = [
  // Platform Core
  { id: 'general', label: 'General Settings', group: 'Platform Core', desc: 'Configure platform identity, metadata, and core storage defaults.' },
  { id: 'advanced', label: 'Advanced Settings', group: 'Platform Core', desc: 'Manage global upload constraints, extension filters, and chunk settings.' },
  { id: 'appearance', label: 'Appearance', group: 'Platform Core', desc: 'Brand assets, default theme mode, accent highlights, and custom CSS.' },
  { id: 'maintenance', label: 'Maintenance Mode', group: 'Platform Core', desc: 'Lock the platform for public visitors during system upgrades or migration.' },
  { id: 'license', label: 'License', group: 'Platform Core', desc: 'Software registration, product edition, license key, and version check.' },

  // Users & Security
  { id: 'user-guest', label: 'User & Guest Settings', group: 'Users & Security', desc: 'Control public registrations, email verification requirements, and guest limits.' },
  { id: 'admins', label: 'Admins & Passkey', group: 'Users & Security', desc: 'Administrative access controls, passkey policies, and session timeout.' },
  { id: 'captcha', label: 'Captcha Settings', group: 'Users & Security', desc: 'Bot protection via Cloudflare Turnstile or Google reCAPTCHA.' },

  // Content & Comms
  { id: 'smtp', label: 'SMTP Settings', group: 'Content & Comms', desc: 'Outgoing email server configuration and connection diagnostic test.' },
  { id: 'email-templates', label: 'Email Templates', group: 'Content & Comms', desc: 'Customize welcome, verification, and password recovery emails.' },
  { id: 'blog', label: 'Blog Settings', group: 'Content & Comms', desc: 'Platform-wide notification banners and system announcement broadcasts.' },
  { id: 'seo', label: 'SEO & Verification', group: 'Content & Comms', desc: 'Search engine metadata, indexing policies, and webmaster verification.' },
  { id: 'languages', label: 'Languages', group: 'Content & Comms', desc: 'Default localization, supported languages, and multi-lingual options.' },

  // System & Operations
  { id: 'ads', label: 'Ads & Social Button', group: 'System & Operations', desc: 'Monetization ad units and official community social links.' },
  { id: 'api', label: 'API & Telegram', group: 'System & Operations', desc: 'Telegram bot cloud bridge credentials, rate-limiting, and REST API access.' },
  { id: 'cron', label: 'Cron Job', group: 'System & Operations', desc: 'Background maintenance schedules and automatic expired file purge.' },
  { id: 'cache', label: 'Cache Control', group: 'System & Operations', desc: 'Flush security rate limits, optimize SQLite storage, and clear transients.' },
  { id: 'system-info', label: 'System Info', group: 'System & Operations', desc: 'Live server environment, PHP specifications, and resource capacities.' },
];

function Field({ label, hint, children }) {
  return (
    <div className="admin-field">
      <label className="form-label">{label}</label>
      {children}
      {hint && <span className="admin-field-hint">{hint}</span>}
    </div>
  );
}

function CheckField({ label, checked, onChange, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="admin-check-label" style={{ marginBottom: 3 }}>
        <input type="checkbox" checked={Boolean(checked)} onChange={onChange} className="admin-checkbox" />
        <span style={{ fontWeight: 500 }}>{label}</span>
      </label>
      {hint && <span className="admin-field-hint" style={{ display: 'block', paddingLeft: 26 }}>{hint}</span>}
    </div>
  );
}

export default function AdminSettings() {
  const { section = 'general' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [settings, setSettings] = useState({});
  const [healthInfo, setHealthInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [runningCron, setRunningCron] = useState(false);

  const currentSection = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  useEffect(() => {
    setLoading(true);
    // Load all settings from backend
    Promise.all([
      apiRequest('/admin/settings'),
      section === 'system-info' ? apiRequest('/admin/health').catch(() => null) : Promise.resolve(null),
    ])
      .then(([resSettings, resHealth]) => {
        setSettings(resSettings?.settings || {});
        if (resHealth) setHealthInfo(resHealth.health || null);
      })
      .catch(err => {
        showToast(err.message || 'Failed to load settings', 'error');
      })
      .finally(() => setLoading(false));
  }, [section]);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest('/admin/settings', { method: 'POST', body: settings });
      showToast(res.message || 'Settings saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!window.confirm('Clear all rate-limit counters and optimize SQLite database?')) return;
    setCacheClearing(true);
    try {
      const res = await apiRequest('/admin/cache-clear', { method: 'POST' });
      showToast(res.message || 'Cache cleared and database optimized', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to purge cache', 'error');
    } finally {
      setCacheClearing(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    try {
      const res = await apiRequest('/admin/smtp-test', {
        method: 'POST',
        body: {
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_encryption: settings.smtp_encryption,
          smtp_user: settings.smtp_user,
          smtp_pass: settings.smtp_pass,
          smtp_from: settings.smtp_from,
          smtp_reply_to: settings.smtp_reply_to,
        }
      });
      showToast(res.message || 'SMTP Connection successful! Test email dispatched.', 'success');
    } catch (err) {
      showToast(err.message || 'SMTP Test failed: Could not connect to mail server', 'error');
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleRunCron = async () => {
    setRunningCron(true);
    try {
      const res = await apiRequest('/admin/cron-run', { method: 'POST' });
      showToast(res.message || 'Automated maintenance cron completed successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to run cron maintenance', 'error');
    } finally {
      setRunningCron(false);
    }
  };

  if (loading) {
    return <div className="admin-loading"><span className="spinner-lg" /><p>Loading platform configuration…</p></div>;
  }

  return (
    <div className="admin-page-content">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--adm-indigo)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {currentSection.group}
            </span>
            <span style={{ color: 'var(--adm-border)' }}>•</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--adm-muted)', fontWeight: 600 }}>CamHost Settings</span>
          </div>
          <h1 className="admin-page-title" style={{ marginTop: 2 }}>{currentSection.label}</h1>
          <p className="admin-page-desc">{currentSection.desc}</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 840 }}>
        {/* =========================================
            PLATFORM CORE
            ========================================= */}

        {/* 1. General Settings */}
        {section === 'general' && (
          <>
            <div className="admin-card">
              <h3 className="admin-card-title">Platform Identity</h3>
              <Field label="Platform Name" hint="Public brand name shown in header and titles.">
                <input type="text" className="input-field" value={settings.site_name || 'CamHost.space'} onChange={e => set('site_name', e.target.value)} required />
              </Field>
              <Field label="Platform Tagline / Description">
                <textarea className="input-field" rows={2} value={settings.site_description || ''} onChange={e => set('site_description', e.target.value)} />
              </Field>
              <Field label="Contact Support Email">
                <input type="email" className="input-field" value={settings.support_email || 'support@camhost.space'} onChange={e => set('support_email', e.target.value)} />
              </Field>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title">Default Quota & Limits</h3>
              <Field label="Default Storage Quota per User (MB)" hint="10240 MB = 10 GB. Applied automatically to newly registered accounts.">
                <input type="number" className="input-field" value={settings.default_storage_quota_mb || '10240'} onChange={e => set('default_storage_quota_mb', e.target.value)} min="100" />
              </Field>
            </div>
          </>
        )}

        {/* 2. Advanced Settings */}
        {section === 'advanced' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Upload Governance & Rules</h3>
            <Field label="Maximum Single File Size (MB)" hint="Maximum allowed upload payload per file. Telegram Bot supports up to 2000 MB.">
              <input type="number" className="input-field" value={settings.max_upload_size_mb || '2000'} onChange={e => set('max_upload_size_mb', e.target.value)} min="1" max="2048" />
            </Field>
            <Field label="Allowed File Extensions (Comma separated)" hint="Dangerous scripts (.php, .exe, .sh, .bat) are strictly blocked regardless.">
              <input type="text" className="input-field" value={settings.allowed_extensions || 'zip,rar,tar,gz,7z,pdf,doc,docx,xls,xlsx,ppt,pptx,png,jpg,jpeg,gif,webp,mp4,mkv,mp3,wav,txt,json,csv'} onChange={e => set('allowed_extensions', e.target.value)} />
            </Field>
            <CheckField
              label="Allow Unauthenticated Guest Downloads"
              checked={settings.allow_guest_download === '1' || settings.allow_guest_download === undefined}
              onChange={e => set('allow_guest_download', e.target.checked ? '1' : '0')}
              hint="When enabled, anyone with the public share link can stream or download files without logging in."
            />
            <CheckField
              label="Direct Inline File Streaming (Preview for Audio, Video, Images)"
              checked={settings.allow_inline_streaming !== '0'}
              onChange={e => set('allow_inline_streaming', e.target.checked ? '1' : '0')}
              hint="Allows browsers to play video and audio directly inside the viewer."
            />
          </div>
        )}

        {/* 3. Appearance */}
        {section === 'appearance' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Visual Branding & Theme</h3>
            <Field label="Default Color Theme">
              <select className="input-field" value={settings.default_theme || 'dark'} onChange={e => set('default_theme', e.target.value)}>
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="system">Follow User OS Preference</option>
              </select>
            </Field>
            <Field label="Platform Logo URL (Optional)" hint="Direct image link for custom brand logo (e.g. /logo.png).">
              <input type="text" className="input-field" value={settings.custom_logo_url || ''} onChange={e => set('custom_logo_url', e.target.value)} placeholder="/logo.png" />
            </Field>
            <Field label="Favicon URL">
              <input type="text" className="input-field" value={settings.custom_favicon_url || ''} onChange={e => set('custom_favicon_url', e.target.value)} placeholder="/logo.png" />
            </Field>
            <Field label="Primary Brand Accent Color">
              <input type="text" className="input-field" value={settings.accent_color || '#6366f1'} onChange={e => set('accent_color', e.target.value)} placeholder="#6366f1" />
            </Field>
            <Field label="Custom Header / Head Code (Analytics, tracking, or custom meta tags)">
              <textarea className="input-field" rows={3} value={settings.custom_head_code || ''} onChange={e => set('custom_head_code', e.target.value)} placeholder="<!-- Custom head code -->" />
            </Field>
          </div>
        )}

        {/* 4. Maintenance Mode */}
        {section === 'maintenance' && (
          <div className="admin-card" style={{ border: settings.maintenance_mode === '1' ? '1px solid var(--adm-amber)' : undefined }}>
            <h3 className="admin-card-title">Platform Maintenance Controller</h3>
            {settings.maintenance_mode === '1' && (
              <div className="admin-alert-banner warning" style={{ marginBottom: 16 }}>
                ⚠️ Maintenance mode is currently <strong>ACTIVE</strong>. Regular users will receive a 503 maintenance page.
              </div>
            )}
            <CheckField
              label="Activate Maintenance Mode"
              checked={settings.maintenance_mode === '1'}
              onChange={e => set('maintenance_mode', e.target.checked ? '1' : '0')}
              hint="When activated, only logged-in system administrators can browse and use the platform."
            />
            <Field label="Public Maintenance Message" hint="Displayed to visitors on the maintenance splash page.">
              <input type="text" className="input-field" value={settings.maintenance_message || 'CamHost.space is currently undergoing scheduled infrastructure upgrades. We will return online shortly.'} onChange={e => set('maintenance_message', e.target.value)} />
            </Field>
            <Field label="Whitelisted IP Addresses (Comma separated)" hint="IP addresses that bypass maintenance mode even without login.">
              <input type="text" className="input-field" value={settings.maintenance_whitelist_ips || ''} onChange={e => set('maintenance_whitelist_ips', e.target.value)} placeholder="127.0.0.1, 192.168.1.1" />
            </Field>
          </div>
        )}

        {/* 5. License */}
        {section === 'license' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Software License & Version</h3>
            <div className="admin-detail-grid" style={{ marginBottom: 20 }}>
              <div><span className="admin-env-label">Software Edition</span><strong>CamHost Community Open-Source Edition</strong></div>
              <div><span className="admin-env-label">Installed Version</span><strong>v2.4.0-stable</strong></div>
              <div><span className="admin-env-label">Core Engine</span><strong>React 18 + Vite + PHP SQLite3 Engine</strong></div>
              <div><span className="admin-env-label">Developer</span><strong>PEAK BROSMAO (peakbrosmao.me)</strong></div>
            </div>
            <Field label="Enterprise License Key (Optional)" hint="Enter your enterprise commercial license key if applicable.">
              <input type="text" className="input-field" value={settings.license_key || 'CH-COMMUNITY-OPEN-SOURCE-LICENSE'} onChange={e => set('license_key', e.target.value)} />
            </Field>
            <Field label="License Registered Organization / Domain">
              <input type="text" className="input-field" value={settings.license_domain || 'camhost.space'} onChange={e => set('license_domain', e.target.value)} />
            </Field>
          </div>
        )}

        {/* =========================================
            USERS & SECURITY
            ========================================= */}

        {/* 6. User & Guest Settings */}
        {section === 'user-guest' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Registration & Guest Policies</h3>
            <CheckField
              label="Allow Public User Signups"
              checked={settings.allow_registration !== '0'}
              onChange={e => set('allow_registration', e.target.checked ? '1' : '0')}
              hint="Allow new visitors to register accounts from the /register page."
            />
            <CheckField
              label="Mandatory Email Verification"
              checked={settings.require_email_verification === '1'}
              onChange={e => set('require_email_verification', e.target.checked ? '1' : '0')}
              hint="Users must verify their email before accessing file uploads and downloads."
            />
            <CheckField
              label="Allow Guest Uploads"
              checked={settings.allow_guest_uploads === '1'}
              onChange={e => set('allow_guest_uploads', e.target.checked ? '1' : '0')}
              hint="Allow non-logged-in visitors to upload files with expiration."
            />
            <Field label="Max Guest Upload Size (MB)">
              <input type="number" className="input-field" value={settings.guest_max_upload_mb || '100'} onChange={e => set('guest_max_upload_mb', e.target.value)} />
            </Field>
            <Field label="Guest File Auto-Expiration Days">
              <input type="number" className="input-field" value={settings.guest_file_retention_days || '7'} onChange={e => set('guest_file_retention_days', e.target.value)} />
            </Field>
          </div>
        )}

        {/* 7. Admins & Passkey */}
        {section === 'admins' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Administrative Security Policies</h3>
            <CheckField
              label="Enforce 2FA / WebAuthn Passkeys for Administrators"
              checked={settings.enforce_admin_passkey === '1'}
              onChange={e => set('enforce_admin_passkey', e.target.checked ? '1' : '0')}
              hint="Requires all users with the 'admin' role to register a biometric or hardware passkey."
            />
            <Field label="Admin Inactivity Session Timeout (Minutes)" hint="Admin session expires automatically after period of inactivity.">
              <input type="number" className="input-field" value={settings.admin_session_timeout_min || '60'} onChange={e => set('admin_session_timeout_min', e.target.value)} min="15" max="1440" />
            </Field>
            <CheckField
              label="Notify Super Admin on New Admin Login"
              checked={settings.admin_login_notifications !== '0'}
              onChange={e => set('admin_login_notifications', e.target.checked ? '1' : '0')}
              hint="Sends an audit email or telegram alert whenever an admin signs in."
            />
          </div>
        )}

        {/* 8. Captcha Settings */}
        {section === 'captcha' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Bot & Abuse Captcha Shield</h3>
            <Field label="Captcha Provider">
              <select className="input-field" value={settings.captcha_provider || 'disabled'} onChange={e => set('captcha_provider', e.target.value)}>
                <option value="disabled">Disabled (No Captcha)</option>
                <option value="turnstile">Cloudflare Turnstile (Recommended - Invisible)</option>
                <option value="recaptcha_v3">Google reCAPTCHA v3</option>
                <option value="recaptcha_v2">Google reCAPTCHA v2 Checkbox</option>
              </select>
            </Field>
            <Field label="Captcha Site Key">
              <input type="text" className="input-field" value={settings.captcha_site_key || ''} onChange={e => set('captcha_site_key', e.target.value)} placeholder="0x4AAAAAA..." />
            </Field>
            <Field label="Captcha Secret Key">
              <input type="password" className="input-field" value={settings.captcha_secret_key || ''} onChange={e => set('captcha_secret_key', e.target.value)} placeholder="Secret key..." />
            </Field>
            <CheckField
              label="Enable Captcha on User Registration"
              checked={settings.captcha_on_register === '1'}
              onChange={e => set('captcha_on_register', e.target.checked ? '1' : '0')}
            />
            <CheckField
              label="Enable Captcha on User Login"
              checked={settings.captcha_on_login === '1'}
              onChange={e => set('captcha_on_login', e.target.checked ? '1' : '0')}
            />
          </div>
        )}

        {/* =========================================
            CONTENT & COMMS
            ========================================= */}

        {/* 9. SMTP Settings */}
        {section === 'smtp' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Outgoing SMTP Mail Server</h3>
            <Field label="SMTP Server Host">
              <input type="text" className="input-field" value={settings.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.hostinger.com or smtp.gmail.com" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="SMTP Port">
                <input type="number" className="input-field" value={settings.smtp_port || '587'} onChange={e => set('smtp_port', e.target.value)} placeholder="587 or 465" />
              </Field>
              <Field label="Encryption Type">
                <select className="input-field" value={settings.smtp_encryption || 'tls'} onChange={e => set('smtp_encryption', e.target.value)}>
                  <option value="tls">TLS (Recommended - Port 587)</option>
                  <option value="ssl">SSL (Port 465)</option>
                  <option value="none">None / Plaintext</option>
                </select>
              </Field>
            </div>
            <Field label="SMTP Username">
              <input type="text" className="input-field" value={settings.smtp_user || ''} onChange={e => set('smtp_user', e.target.value)} placeholder="noreply@camhost.space" />
            </Field>
            <Field label="SMTP Password">
              <input type="password" className="input-field" value={settings.smtp_pass || ''} onChange={e => set('smtp_pass', e.target.value)} placeholder="Mail password or App Password" />
            </Field>
            <Field label="Sender Email Address (From)" hint="Must be a valid mailbox on your domain (e.g. noreply@camhost.space)">
              <input type="email" className="input-field" value={settings.smtp_from || 'noreply@camhost.space'} onChange={e => set('smtp_from', e.target.value)} />
            </Field>
            <Field label="Reply-To Email Address" hint="Where user replies will be directed (e.g. support@camhost.space)">
              <input type="email" className="input-field" value={settings.smtp_reply_to || 'support@camhost.space'} onChange={e => set('smtp_reply_to', e.target.value)} />
            </Field>
            <Field label="Sender Display Name">
              <input type="text" className="input-field" value={settings.smtp_from_name || 'CamHost.space'} onChange={e => set('smtp_from_name', e.target.value)} />
            </Field>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={smtpTesting}
                onClick={handleTestSmtp}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {smtpTesting ? <span className="spinner-sm" /> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                )}
                {smtpTesting ? 'Testing Connection…' : 'Test SMTP Connection'}
              </button>
            </div>
          </div>
        )}

        {/* 10. Email Templates */}
        {section === 'email-templates' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Automated Email Notifications</h3>
            <Field label="Welcome Email Subject">
              <input type="text" className="input-field" value={settings.tpl_welcome_subj || 'Welcome to CamHost.space Cloud!'} onChange={e => set('tpl_welcome_subj', e.target.value)} />
            </Field>
            <Field label="Welcome Email Body">
              <textarea className="input-field" rows={3} value={settings.tpl_welcome_body || 'Hello,\n\nThank you for creating an account on CamHost.space. Your unlimited Telegram-powered cloud storage is now ready.'} onChange={e => set('tpl_welcome_body', e.target.value)} />
            </Field>

            <Field label="Password Reset Subject">
              <input type="text" className="input-field" value={settings.tpl_reset_subj || 'Reset your CamHost.space password'} onChange={e => set('tpl_reset_subj', e.target.value)} />
            </Field>
            <Field label="Password Reset Body">
              <textarea className="input-field" rows={3} value={settings.tpl_reset_body || 'We received a request to reset your password. Click the link below to set a new password.'} onChange={e => set('tpl_reset_body', e.target.value)} />
            </Field>
          </div>
        )}

        {/* 11. Blog & Announcements */}
        {section === 'blog' && (
          <div className="admin-card">
            <h3 className="admin-card-title">System Announcements Banner</h3>
            <CheckField
              label="Enable Announcement Banner on Dashboard"
              checked={settings.banner_enabled === '1'}
              onChange={e => set('banner_enabled', e.target.checked ? '1' : '0')}
              hint="Shows an alert banner at the top of all user pages."
            />
            <Field label="Announcement Message">
              <textarea className="input-field" rows={3} value={settings.announcement_banner || ''} onChange={e => set('announcement_banner', e.target.value)} placeholder="Welcome to CamHost.space! High-speed uploads are currently operational." />
            </Field>
            <Field label="Banner Color Type">
              <select className="input-field" value={settings.banner_type || 'info'} onChange={e => set('banner_type', e.target.value)}>
                <option value="info">Info (Indigo / Blue)</option>
                <option value="warning">Notice / Warning (Amber)</option>
                <option value="danger">Critical Alert (Red)</option>
                <option value="success">Success / Promo (Green)</option>
              </select>
            </Field>
          </div>
        )}

        {/* 12. SEO & Verification */}
        {section === 'seo' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Search Engine Optimization & Verification</h3>
            <Field label="Default SEO Meta Title">
              <input type="text" className="input-field" value={settings.seo_meta_title || 'CamHost.space — Unlimited Private Cloud Storage · Powered by Telegram'} onChange={e => set('seo_meta_title', e.target.value)} />
            </Field>
            <Field label="Meta Keywords (Comma separated)">
              <input type="text" className="input-field" value={settings.seo_keywords || 'cloud storage, telegram storage, private drive, unlimited cloud, camhost'} onChange={e => set('seo_keywords', e.target.value)} />
            </Field>
            <Field label="Google Search Console Verification Tag" hint="e.g. google-site-verification=abc123xyz">
              <input type="text" className="input-field" value={settings.google_verification || ''} onChange={e => set('google_verification', e.target.value)} placeholder="google-site-verification code" />
            </Field>
            <Field label="Robots.txt Indexing Policy">
              <select className="input-field" value={settings.robots_policy || 'index'} onChange={e => set('robots_policy', e.target.value)}>
                <option value="index">Allow all search engines (Index & Follow)</option>
                <option value="noindex">Disallow search indexing (noindex, nofollow)</option>
              </select>
            </Field>
          </div>
        )}

        {/* 13. Languages */}
        {section === 'languages' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Localization & Language Options</h3>
            <Field label="Default System Language">
              <select className="input-field" value={settings.default_language || 'en'} onChange={e => set('default_language', e.target.value)}>
                <option value="en">English (Default)</option>
                <option value="km">ភាសាខ្មែរ (Khmer)</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="fr">Français (French)</option>
              </select>
            </Field>
            <CheckField
              label="Allow User Language Selection"
              checked={settings.multilingual_enabled !== '0'}
              onChange={e => set('multilingual_enabled', e.target.checked ? '1' : '0')}
              hint="Shows the language switcher in the website header."
            />
            <CheckField
              label="Auto-detect visitor preferred language from browser headers"
              checked={settings.autodetect_language === '1'}
              onChange={e => set('autodetect_language', e.target.checked ? '1' : '0')}
            />
          </div>
        )}

        {/* =========================================
            SYSTEM & OPERATIONS
            ========================================= */}

        {/* 14. Ads & Social Button */}
        {section === 'ads' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Monetization & Social Media Links</h3>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: '0.84rem',
              lineHeight: 1.55,
              color: 'var(--adm-text)',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--adm-indigo)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Google AdSense Site Verification &amp; Integration
              </div>
              <div style={{ color: 'var(--adm-muted)' }}>
                The AdSense loader script is embedded in the website <code style={{ color: 'var(--adm-indigo)' }}>&lt;head&gt;</code> (Publisher ID: <strong style={{ color: 'var(--adm-text)' }}>ca-pub-7280243300261707</strong>) and <code style={{ color: 'var(--adm-indigo)' }}>ads.txt</code> is configured at <strong style={{ color: 'var(--adm-text)' }}>/ads.txt</strong>. You can paste specific banner display units (<code style={{ color: 'var(--adm-indigo)' }}>&lt;ins class=&quot;adsbygoogle&quot; ...&gt;</code>) into the fields below.
              </div>
            </div>

            <Field label="Top Header Banner Ad HTML / Script Code" hint="Paste your banner unit code or AdSense <ins> snippet. Displayed at the top of site pages.">
              <textarea className="input-field" rows={3} value={settings.ad_header_code || ''} onChange={e => set('ad_header_code', e.target.value)} placeholder="<!-- AdSense banner unit: <ins class='adsbygoogle' ...></ins> -->" />
            </Field>
            <Field label="File Download Page Ad HTML / Script Code" hint="Displayed on public file download pages (/share/:token) below the download card.">
              <textarea className="input-field" rows={3} value={settings.ad_download_code || ''} onChange={e => set('ad_download_code', e.target.value)} placeholder="<!-- Download page banner script / ad unit -->" />
            </Field>
            <Field label="Telegram Channel / Group Link">
              <input type="text" className="input-field" value={settings.social_telegram || 'https://t.me/camhost_space'} onChange={e => set('social_telegram', e.target.value)} />
            </Field>
            <Field label="Facebook Page Link">
              <input type="text" className="input-field" value={settings.social_facebook || ''} onChange={e => set('social_facebook', e.target.value)} placeholder="https://facebook.com/camhost" />
            </Field>
            <Field label="GitHub Project Link">
              <input type="text" className="input-field" value={settings.social_github || 'https://github.com/peak-brosmao/CamHost.space-Open-Soucre'} onChange={e => set('social_github', e.target.value)} />
            </Field>
          </div>
        )}

        {/* 15. API & Telegram */}
        {section === 'api' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Telegram Cloud Engine & API</h3>
            <CheckField
              label="Telegram Cloud Storage Engine Active"
              checked={settings.telegram_storage_enabled !== '0'}
              onChange={e => set('telegram_storage_enabled', e.target.checked ? '1' : '0')}
              hint="Stores uploaded file blobs on encrypted Telegram servers via Bot API."
            />
            <Field label="Telegram Bot Username (Handle)">
              <input type="text" className="input-field" value={settings.telegram_bot_username || '@CamHost_spacebot'} onChange={e => set('telegram_bot_username', e.target.value)} />
            </Field>
            <Field label="API Rate Limit per Minute (Per IP)">
              <input type="number" className="input-field" value={settings.api_rate_limit_per_min || '120'} onChange={e => set('api_rate_limit_per_min', e.target.value)} min="20" max="1000" />
            </Field>
            <CheckField
              label="Enable Public REST API Access for Developers"
              checked={settings.public_api_enabled === '1'}
              onChange={e => set('public_api_enabled', e.target.checked ? '1' : '0')}
              hint="Allows third-party apps to authenticate via Bearer token."
            />
          </div>
        )}

        {/* 16. Cron Job */}
        {section === 'cron' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Automated Scheduled Background Tasks</h3>
            <CheckField
              label="Enable Automatic Expired File Purge"
              checked={settings.cron_auto_clean_expired !== '0'}
              onChange={e => set('cron_auto_clean_expired', e.target.checked ? '1' : '0')}
              hint="Automatically clean up guest uploads whose expiration timestamp has passed."
            />
            <Field label="Cron Execution Interval (Frequency)">
              <select className="input-field" value={settings.cron_frequency || 'daily'} onChange={e => set('cron_frequency', e.target.value)}>
                <option value="hourly">Every Hour</option>
                <option value="daily">Once Daily at Midnight (Recommended)</option>
                <option value="weekly">Once Weekly</option>
              </select>
            </Field>
            <div style={{ marginTop: 16 }}>
              <span className="admin-env-label" style={{ marginBottom: 6 }}>Suggested Crontab Command</span>
              <code style={{ display: 'block', padding: '10px 14px', background: 'var(--adm-elevated)', borderRadius: 7, border: '1px solid var(--adm-border)', fontSize: '0.8rem', color: 'var(--adm-indigo)' }}>
                0 0 * * * php /home/u123456789/domains/camhost.space/public_html/api/cron.php &gt;/dev/null 2&gt;&amp;1
              </code>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={runningCron}
                onClick={handleRunCron}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {runningCron ? <span className="spinner-sm" /> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                )}
                {runningCron ? 'Running Cron…' : '⚡ Run Cron Now (Test Cleanup)'}
              </button>
            </div>
          </div>
        )}

        {/* 17. Cache Control */}
        {section === 'cache' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Cache & Storage Optimization</h3>
            <p style={{ color: 'var(--adm-muted)', fontSize: '0.85rem', marginBottom: 18 }}>
              Flush rate-limiting counters, security transient states, and execute SQLite WAL checkpoint and VACUUM to reclaim disk space.
            </p>
            <button
              type="button"
              className="btn-danger"
              disabled={cacheClearing}
              onClick={handlePurgeCache}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
            >
              {cacheClearing ? <span className="spinner-sm" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              )}
              {cacheClearing ? 'Flushing & Optimizing…' : 'Flush Rate Limits & Vacuum SQLite'}
            </button>
          </div>
        )}

        {/* 18. System Info */}
        {section === 'system-info' && (
          <div className="admin-card">
            <h3 className="admin-card-title">Live Server Runtime Environment</h3>
            <div className="admin-env-grid" style={{ marginTop: 14 }}>
              <div className="admin-env-item"><span className="admin-env-label">PHP Version</span><strong className="admin-env-val">{healthInfo?.system?.php_version || '8.3+'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Operating System</span><strong className="admin-env-val">{healthInfo?.system?.os || 'Linux'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Memory Used</span><strong className="admin-env-val">{healthInfo?.system?.memory_usage_mb || '12'} MB</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">PHP Max Upload</span><strong className="admin-env-val">{healthInfo?.system?.upload_max_filesize || '2048M'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">POST Max Size</span><strong className="admin-env-val">{healthInfo?.system?.post_max_size || '2048M'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Database Engine</span><strong className="admin-env-val">{healthInfo?.database?.driver || 'SQLite3 PDO'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Telegram API</span><strong className="admin-env-val" style={{ color: 'var(--adm-green)' }}>{healthInfo?.telegram_api?.status || 'Connected'}</strong></div>
              <div className="admin-env-item"><span className="admin-env-label">Architecture</span><strong className="admin-env-val">64-bit</strong></div>
            </div>
          </div>
        )}

        {/* Save button footer (for form sections) */}
        {section !== 'system-info' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 26px' }}
            >
              {saving ? <span className="spinner-sm" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              )}
              {saving ? 'Saving Changes…' : `Save ${currentSection.label}`}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
