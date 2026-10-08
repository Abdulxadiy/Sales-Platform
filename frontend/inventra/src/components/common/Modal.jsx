import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 560 }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e) => {
      e.preventDefault();
      onClose();
    };

    // Fallback for browsers that do not yet support closedby="any"
    const handleBackdropClick = (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="custom-dialog"
      closedby="any"
      aria-labelledby="dialog-modal-title"
      style={{
        width: `min(calc(100vw - 32px), ${maxWidth}px)`,
        maxWidth: `min(90vw, ${maxWidth}px)`,
      }}
    >
      <div
        className="dialog-content"
        style={{
          width: '100%',
          maxWidth: `${maxWidth}px`,
          boxSizing: 'border-box',
          padding: '24px 28px',
          background: 'var(--bg-modal, var(--bg-surface))',
          border: '1px solid var(--border-modal, var(--border-card))',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 id="dialog-modal-title" style={{ fontSize: 18, margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-chip)',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-chip-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-chip)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </dialog>
  );
}
