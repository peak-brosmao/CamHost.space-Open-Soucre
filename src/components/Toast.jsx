import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-wrap" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'toastIn 0.25s ease',
              minWidth: '240px',
            }}
          >
            {t.type === 'success' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#00e08b" strokeWidth="2.5" width="16" height="16">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {t.type === 'error' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2.5" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            {t.type === 'info' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2.5" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
