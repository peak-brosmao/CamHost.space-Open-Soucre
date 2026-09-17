import React, { useState, useEffect } from 'react';
import { apiRequest, formatBytes } from '../../api/client';
import { useToast } from '../../components/Toast';

const INITIAL_PLANS = [
  {
    id: 'free',
    name: 'Community Free',
    quota_mb: 10240,
    price: '$0',
    period: 'forever',
    color: '#00d4ff',
    features: ['10 GB Telegram Cloud Storage', 'Full speed upload & download', 'Public share links (/share/*)', 'Browser streaming player'],
    badge: 'Default',
  },
  {
    id: 'pro',
    name: 'Pro Cloud',
    quota_mb: 102400,
    price: '$4.99',
    period: 'per month',
    color: '#7b4fff',
    features: ['100 GB Telegram Cloud Storage', 'Priority direct link streaming', 'No file retention limits', 'Custom share tokens', 'WebDAV sync support'],
    badge: 'Popular',
  },
  {
    id: 'unlimited',
    name: 'Enterprise Unlimited',
    quota_mb: 1048576,
    price: '$19.99',
    period: 'per month',
    color: '#ffab2e',
    features: ['1 TB+ Infinite Cloud Allocation', 'Dedicated API access token', 'Multi-device desktop sync', 'Priority 24/7 Telegram support', 'Audit log export'],
    badge: 'Power User',
  },
];

export default function AdminSubscriptions() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newQuotaMb, setNewQuotaMb] = useState('51200');
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/users?per_page=50');
      if (res?.users) {
        setUsers(res.users);
        if (res.users.length > 0) setSelectedUserId(String(res.users[0].id));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpgrade = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setUpgrading(true);
    try {
      const quotaBytes = parseInt(newQuotaMb, 10) * 1024 * 1024;
      await apiRequest(`/admin/users/${selectedUserId}`, {
        method: 'PUT',
        body: {
          storage_quota: quotaBytes,
        },
      });
      showToast('Storage quota updated successfully for user', 'success');
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update storage quota', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Subscription & Storage Quota Plans
          </h1>
          <p className="admin-page-desc">
            Manage user subscription tiers, manually upgrade user storage allowances, and inspect active subscriber quotas.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadUsers} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh Users
        </button>
      </div>

      {/* Subscription Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 28 }}>
        {INITIAL_PLANS.map((plan) => (
          <div key={plan.id} className="admin-card" style={{ border: `1px solid ${plan.color}40`, position: 'relative' }}>
            {plan.badge && (
              <span className="admin-badge info" style={{ position: 'absolute', top: 16, right: 16, background: plan.color + '20', color: plan.color }}>
                {plan.badge}
              </span>
            )}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: plan.color, margin: 0 }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: 'var(--adm-muted)', fontSize: '0.8rem' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', marginTop: 4 }}>
                Quota: {formatBytes(plan.quota_mb * 1024 * 1024)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {plan.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <span style={{ color: plan.color, flexShrink: 0, fontWeight: 700 }}>✓</span>
                  <span style={{ color: 'var(--adm-text)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Storage Quota Upgrade Tool */}
      <div className="admin-card" style={{ marginBottom: 28 }}>
        <h3 className="admin-card-title" style={{ marginBottom: 6 }}>Manual User Storage Quota Upgrade Tool</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', marginBottom: 20 }}>
          Instantly adjust or upgrade any registered user's storage capacity without third-party billing webhooks.
        </p>

        <form onSubmit={handleApplyUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', display: 'block', marginBottom: 6 }}>
                Select User Account
              </label>
              <select
                className="input-field"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} — Current Quota: {formatBytes(u.storage_quota || 10737418240)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text)', display: 'block', marginBottom: 6 }}>
                Target Storage Quota
              </label>
              <select
                className="input-field"
                value={newQuotaMb}
                onChange={(e) => setNewQuotaMb(e.target.value)}
              >
                <option value="10240">10 GB (Community Default)</option>
                <option value="25600">25 GB (Starter Upgrade)</option>
                <option value="51200">50 GB (Pro Cloud)</option>
                <option value="102400">100 GB (Power User)</option>
                <option value="256000">250 GB (Creator Edition)</option>
                <option value="512000">500 GB (Team Storage)</option>
                <option value="1048576">1 TB (1,024 GB Enterprise)</option>
                <option value="5242880">5 TB (Ultimate Cloud)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="submit" className="btn-primary" disabled={upgrading || !selectedUserId}>
              {upgrading ? 'Upgrading Quota…' : '⚡ Apply Storage Quota Upgrade'}
            </button>
          </div>
        </form>
      </div>

      {/* Active User Storage Quota Audit Table */}
      <div className="admin-card">
        <h3 className="admin-card-title" style={{ marginBottom: 14 }}>User Quotas & Active Allowances ({users.length})</h3>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--adm-muted)', fontSize: '0.88rem' }}>
            No registered users found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Total Storage Quota</th>
                  <th>Storage Used</th>
                  <th style={{ textAlign: 'right' }}>Quick Upgrade</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const quota = u.storage_quota || 10737418240;
                  const used = u.storage_used || 0;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--adm-text)' }}>{u.email}</td>
                      <td>
                        <span className={`admin-badge ${u.role === 'admin' ? 'indigo' : 'neutral'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.is_banned === 1 ? (
                          <span className="admin-badge danger">Suspended</span>
                        ) : u.is_verified === 1 ? (
                          <span className="admin-badge success">Verified</span>
                        ) : (
                          <span className="admin-badge warning">Pending</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{formatBytes(quota)}</td>
                      <td>{formatBytes(used)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedUserId(String(u.id));
                            setNewQuotaMb('102400');
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                            showToast(`Selected ${u.email} for 100 GB upgrade`, 'info');
                          }}
                        >
                          Upgrade to 100 GB ⚡
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
