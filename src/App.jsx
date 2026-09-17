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

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text-muted)',
          gap: '16px',
        }}
      >
        <span className="spinner-lg" />
        <p style={{ fontSize: '0.9rem' }}>Authenticating session...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/share/:token" element={<SharePage />} />

              {/* Authenticated Dashboard Routes */}
              <Route
                path="/files"
                element={
                  <ProtectedRoute>
                    <FilesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/folders"
                element={
                  <ProtectedRoute>
                    <FoldersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/signups"
                element={
                  <ProtectedRoute>
                    <SignupsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
