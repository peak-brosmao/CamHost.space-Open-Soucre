import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FilesPage from './pages/FilesPage';
import FoldersPage from './pages/FoldersPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';
import SignupsPage from './pages/SignupsPage';
import SharePage from './pages/SharePage';
import VerifyAccountPage from './pages/VerifyAccountPage';
import BlogPage from './pages/BlogPage';
import FeaturesPage from './pages/FeaturesPage';
import ExplorerPage from './pages/ExplorerPage';
import HowItWorksPage from './pages/HowItWorksPage';
import OpenSourcePage from './pages/OpenSourcePage';

import DeviceCentrePage from './pages/DeviceCentrePage';
import ObjectStoragePage from './pages/ObjectStoragePage';

// Admin shell & pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFiles from './pages/admin/AdminFiles';
import AdminStorage from './pages/admin/AdminStorage';
import AdminUploads from './pages/admin/AdminUploads';
import AdminDownloads from './pages/admin/AdminDownloads';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminSettings from './pages/admin/AdminSettings';
import AdminHealth from './pages/admin/AdminHealth';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)', gap: '16px' }}>
        <span className="spinner-lg" />
        <p style={{ fontSize: '0.9rem' }}>Authenticating session...</p>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { token, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)', gap: '16px' }}>
        <span className="spinner-lg" />
        <p style={{ fontSize: '0.9rem' }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/files" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/preview" element={<ExplorerPage />} />
              <Route path="/explorer" element={<ExplorerPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/opensource" element={<OpenSourcePage />} />
              <Route path="/open-source" element={<OpenSourcePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-account" element={<VerifyAccountPage />} />
              <Route path="/share/:token" element={<SharePage />} />

              {/* Authenticated Dashboard Routes */}
              <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/folders" element={<ProtectedRoute><FoldersPage /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* Enhanced Storage Views */}
              <Route path="/shared" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/shared-items" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/device-centre" element={<ProtectedRoute><DeviceCentrePage /></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute><DeviceCentrePage /></ProtectedRoute>} />
              <Route path="/object-storage" element={<ProtectedRoute><ObjectStoragePage /></ProtectedRoute>} />
              <Route path="/recents" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/favourites" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/rubbish-bin" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/trash" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />

              {/* Admin: Signups standalone page */}
              <Route path="/signups" element={<AdminRoute><SignupsPage /></AdminRoute>} />

              {/* Admin Control Center — Nested Routes */}
              <Route
                path="/admin/*"
                element={<AdminRoute><AdminLayout /></AdminRoute>}
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />

                {/* User Management */}
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/activity" element={<AdminUsers />} />

                {/* File Management */}
                <Route path="files" element={<AdminFiles />} />
                <Route path="files/reported" element={<AdminFiles />} />
                <Route path="files/expired" element={<AdminFiles />} />
                <Route path="files/blocked" element={<AdminFiles />} />

                {/* Storage / Uploads / Downloads */}
                <Route path="storage" element={<AdminStorage />} />
                <Route path="uploads" element={<AdminUploads />} />
                <Route path="downloads" element={<AdminDownloads />} />

                {/* Security */}
                <Route path="security" element={<AdminSecurity />} />

                {/* System Health */}
                <Route path="health" element={<AdminHealth />} />

                {/* Subscriptions */}
                <Route path="subscriptions" element={<AdminSubscriptions />} />

                {/* Settings — parameterized by section */}
                <Route path="settings/:section" element={<AdminSettings />} />
                <Route path="settings" element={<Navigate to="/admin/settings/general" replace />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
