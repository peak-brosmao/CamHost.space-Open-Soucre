import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function ObjectStoragePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // S3 / Object Storage configuration
  const s3Endpoint = 'https://s3.camhost.space';
  const region = 'ap-southeast-1';
  const accessKeyId = `CAM_${user?.id || 1}_${(user?.email || 'KEY').substring(0, 4).toUpperCase()}_S3PRO`;
  const secretAccessKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
  const defaultBucket = `camhost-user-${user?.id || 1}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const breadcrumbs = [
    { label: 'Storage', to: '/files' },
    { label: 'Object storage', active: true },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} breadcrumbs={breadcrumbs} />

        <main className="dashboard-container">
          <div className="page-header" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" width="26" height="26">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                Object Storage (S3 Compatible)
              </h1>
              <p className="page-subtitle">
                High-performance S3-compatible cloud storage. Connect programmatically via AWS CLI, Boto3, or Next.js SDK.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => showToast('New S3 API credentials generated successfully', 'success')}
            >
              Generate New Keys
            </button>
          </div>

          {/* S3 Credentials Card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                S3 API Connection Credentials
              </h2>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0, 224, 139, 0.15)',
                  color: '#00e08b',
                }}
              >
                Endpoint Active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Endpoint */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>S3 Endpoint URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={s3Endpoint}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(s3Endpoint, 'Endpoint URL')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Region */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Region</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={region}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(region, 'Region')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Access Key ID */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Access Key ID</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={accessKeyId}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(accessKeyId, 'Access Key ID')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Secret Key */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Secret Access Key</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    readOnly
                    value={secretAccessKey}
                    className="input-field"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(secretAccessKey, 'Secret Key')}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Buckets Overview */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                Your Cloud Buckets
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Quota: {user?.storage_quota_human || '10,240 MB'}
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(0, 212, 255, 0.12)',
                      color: 'var(--cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)' }}>
                      {defaultBucket}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Region: {region} · Access: Private · ACL: Enabled
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(`s3://${defaultBucket}`, 'Bucket URI')}
                  >
                    Copy S3 URI
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => showToast('Bucket settings opened', 'info')}
                  >
                    Configure Policy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Integration Guides */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>
              AWS CLI & Code Snippet
            </h2>

            <div
              style={{
                background: '#0d1117',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '0.84rem',
                color: '#e6edf3',
                lineHeight: '1.6',
                overflowX: 'auto',
              }}
            >
              <div style={{ color: '#7ee787', marginBottom: '8px' }}># Configure AWS CLI:</div>
              <div>aws configure set aws_access_key_id {accessKeyId}</div>
              <div>aws configure set aws_secret_access_key {secretAccessKey}</div>
              <div style={{ margin: '10px 0', color: '#7ee787' }}># Upload a file via S3 endpoint:</div>
              <div>aws s3 cp my-backup.zip s3://{defaultBucket}/ --endpoint-url {s3Endpoint}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
