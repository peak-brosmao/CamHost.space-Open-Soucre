import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { apiRequest } from '../../api/client';

const SECTIONS = [
  { id: 'general', label: 'General Settings', group: 'Platform Core' },
  { id: 'advanced', label: 'Advanced Settings', group: 'Platform Core' },
  { id: 'appearance', label: 'Appearance', group: 'Platform Core' },
  { id: 'maintenance', label: 'Maintenance Mode', group: 'Platform Core' },
  { id: 'license', label: 'License', group: 'Platform Core' },
  { id: 'user-guest', label: 'User & Guest Settings', group: 'Users & Security' },
  { id: 'admins', label: 'Admins & Passkey', group: 'Users & Security' },
  { id: 'captcha', label: 'Captcha Settings', group: 'Users & Security' },
  { id: 'smtp', label: 'SMTP Settings', group: 'Content & Comms' },
  { id: 'email-templates', label: 'Email Templates', group: 'Content & Comms' },
  { id: 'blog', label: 'Blog Settings', group: 'Content & Comms' },
  { id: 'seo', label: 'SEO & Verification', group: 'Content & Comms' },
  { id: 'languages', label: 'Languages', group: 'Content & Comms' },
  { id: 'ads', label: 'Ads & Social Button', group: 'System & Operations' },
  { id: 'api', label: 'API & Telegram', group: 'System & Operations' },
  { id: 'cron', label: 'Cron Job', group: 'System & Operations' },
  { id: 'cache', label: 'Cache Control', group: 'System & Operations' },
  { id: 'system-info', label: 'System Info', group: 'System & Operations' },
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

function CheckField({ label, checked, onChange }) {
  return (
    <label className="admin-check-label">
      <input type="checkbox" checked={checked} onChange={onChange} className="admin-checkbox" />
      <span>{label}</span>
    </label>
  );
}

function ScaffoldCard({ title, children }) {
  return (
    <div className="admin-card">
      <h3 className="admin-card-title" style={{ marginBottom: 16 }}>{title}</h3>
      <div className="admin-scaffold-empty" style={{ padding: '20px 0' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.25 }}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <p style={{ fontSize: '0.875rem' }}>{children}</p>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { section = 'general' } = useParams();
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const currentSection = SECTIONS.find(s => s.id === section) || SECTIONS[0];

  const LIVE_SECTIONS = ['general', 'advanced', 'maintenance'];

  useEffect(() => {
    if (LIVE_SECTIONS.includes(section)) {
      setLoading(true);
      apiRequest('/admin/settings')
        .then(res => setSettings(res.settings || {}))
        .catch(err => showToast(err.message || 'Failed to load settings', 'error'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [section]);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest('/admin/settings', { method: 'POST', body: settings });
      showToast(res.message || 'Settings saved', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!window.confirm('Clear all rate-limit counters and security cache?')) return;
    try {
      const res = await apiRequest('/admin/cache-clear', { method: 'POST' });
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to purge cache', 'error');
    }
  };

  if (loading) return <div className="admin-loading"><span className="spinner-lg" /></div>;

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{currentSection.label}</h1>
          <p className="admin-page-desc" style={{ color: 'var(--adm-muted)', fontSize: '0.85rem' }}>
            {currentSection.group}
          </p>
        </div>
      </div>

      {/* General Settings */}
      {section === 'general' && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
          <div className="admin-card">
            <h3 className="admin-card-title">Platform Identity</h3>
            <Field label="Platform Name">
              <input type="text" className="input-field" value={settings.site_name || ''} onChange={e => set('site_name', e.target.value)} />
            </Field>
            <Field label="Platform Description">
              <textarea className="input-field" rows={2} value={settings.site_description || ''} onChange={e => set('site_description', e.target.value)} />
            </Field>
          </div>
          <div className="admin-card">
            <h3 className="admin-card-title">Storage Defaults</h3>
            <Field label="Default User Quota (MB)" hint="Applies to newly registered users.">
              <input type="number" className="input-field" value={settings.default_storage_quota_mb || ''} onChange={e => set('default_storage_quota_mb', e.target.value)} />
            </Field>
          </div>
          <div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 28px' }}>
              {saving ? 'Saving…' : 'Save General Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Advanced Settings */}
      {section === 'advanced' && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
          <div className="admin-card">
            <h3 className="admin-card-title">Upload Governance</h3>
            <Field label="Maximum Upload Size (MB)">
              <input type="number" className="input-field" value={settings.max_upload_size_mb || ''} onChange={e => set('max_upload_size_mb', e.target.value)} />
            </Field>
            <Field label="Allowed File Extensions (comma-separated)" hint="Dangerous executables (.php, .exe, .sh) are permanently blocked regardless of this setting.">
              <input type="text" className="input-field" value={settings.allowed_extensions || ''} onChange={e => set('allowed_extensions', e.target.value)} />
            </Field>
            <CheckField label="Allow Unauthenticated Guest Downloads"
              checked={settings.allow_guest_download === '1'}
              onChange={e => set('allow_guest_download', e.target.checked ? '1' : '0')} />
          </div>
          <div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 28px' }}>
              {saving ? 'Saving…' : 'Save Advanced Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Maintenance Mode */}
      {section === 'maintenance' && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
          <div className="admin-card" style={{ border: settings.maintenance_mode === '1' ? '1px solid var(--adm-amber)' : undefined }}>
            <h3 className="admin-card-title">Maintenance Mode</h3>
            {settings.maintenance_mode === '1' && (
              <div className="admin-alert-banner warning" style={{ marginBottom: 16 }}>
                ⚠️ Maintenance mode is currently <strong>ACTIVE</strong>. Only admins can access the platform.
              </div>
            )}
            <CheckField
              label="Enable Maintenance Mode (Regular users see a 503 page)"
              checked={settings.maintenance_mode === '1'}
              onChange={e => set('maintenance_mode', e.target.checked ? '1' : '0')}
            />
            <Field label="Maintenance Notice Message" hint="Shown to users on the maintenance page.">
              <input type="text" className="input-field" value={settings.maintenance_message || ''} onChange={e => set('maintenance_message', e.target.value)} />
            </Field>
          </div>
          <div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 28px' }}>
              {saving ? 'Saving…' : 'Save Maintenance Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Cache Control — wired */}
      {section === 'cache' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
          <div className="admin-card">
            <h3 className="admin-card-title">Cache Control</h3>
            <p style={{ color: 'var(--adm-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
              Flush the rate-limit counter cache and security transient data. This does <em>not</em> delete any user files or settings.
            </p>
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handlePurgeCache}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
              Flush Rate Limits & Security Cache
            </button>
          </div>
        </div>
      )}

      {/* Scaffolded sections */}
      {!['general', 'advanced', 'maintenance', 'cache'].includes(section) && (
        <ScaffoldCard title={currentSection.label}>
          This settings section will be connected to the backend API when the corresponding endpoint is added to <code>admin.php</code>.
        </ScaffoldCard>
      )}
    </div>
  );
}
