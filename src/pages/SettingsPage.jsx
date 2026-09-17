import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { apiRequest } from '../api/client';

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Email cannot be empty', 'error');
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile(displayName, email);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      });
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={[{ label: 'Storage', to: '/files' }, { label: 'Settings', active: true }]}
        />

        <main className="dashboard-container">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Settings & Profile</h1>
              <p className="page-desc">Manage your account information, credentials, and preferences</p>
            </div>
          </div>

          <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Account Summary Badge */}
            <div
              className="glass-card"
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, var(--primary), #0077ff)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                  }}
                >
                  {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                    {displayName || user?.email}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Role: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{user?.role || 'user'}</span>
                    {' · '}
                    Account ID: #{user?.id || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Settings Card */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Profile Information</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '20px' }}>
                Update your public display name and contact email address
              </p>

              <form onSubmit={handleProfileSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="settings-name">Display Name</label>
                  <input
                    id="settings-name"
                    type="text"
                    className="input-field"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="settings-email">Email Address</label>
                  <input
                    id="settings-email"
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change Card */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Change Password</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '20px' }}>
                Ensure your account is using a strong, unique password
              </p>

              <form onSubmit={handlePasswordSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="current-pw">Current Password</label>
                  <input
                    id="current-pw"
                    type="password"
                    className="input-field"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-pw">New Password</label>
                  <input
                    id="new-pw"
                    type="password"
                    className="input-field"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-pw">Confirm New Password</label>
                  <input
                    id="confirm-pw"
                    type="password"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                    {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
