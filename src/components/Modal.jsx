import React from 'react';

export default function Modal({ isOpen, onClose, title, children, confirmText, onConfirm, confirmVariant = 'primary', loading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {(onConfirm || onClose) && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            {onConfirm && (
              <button className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={loading}>
                {loading ? 'Processing...' : confirmText || 'Confirm'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
