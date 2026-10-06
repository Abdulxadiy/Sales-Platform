import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  options = {},
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const {
    title,
    message,
    description,
    confirmText,
    cancelText = 'Bekor qilish',
    type = 'warning', // 'danger' | 'warning' | 'info' | 'success'
    isAlert = false,
    buttonText = 'Tushunarli',
    icon: customIcon,
    dismissOnBackdrop = true,
  } = options;

  // Body scroll lock & focus management
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus default button
    const timer = setTimeout(() => {
      if (isAlert) {
        confirmBtnRef.current?.focus();
      } else if (type === 'danger') {
        cancelBtnRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, isAlert, type, onCancel]);

  if (!isOpen) return null;

  // Icon, color and default text configuration based on type
  let IconComponent = HelpCircle;
  let accentColor = 'var(--primary)';
  let bgBadge = 'rgba(245, 158, 11, 0.12)';
  let borderBadge = 'rgba(245, 158, 11, 0.28)';
  let defaultTitle = isAlert ? 'Ma’lumot' : 'Tasdiqlash';
  let defaultConfirmText = 'Tasdiqlash';
  let confirmBtnBg = 'var(--primary)';
  let confirmBtnColor = 'var(--text-on-primary)';
  let confirmBtnHover = 'var(--primary-hover)';

  if (type === 'danger') {
    IconComponent = customIcon || Trash2;
    accentColor = 'var(--accent-rose)';
    bgBadge = 'rgba(244, 63, 94, 0.12)';
    borderBadge = 'rgba(244, 63, 94, 0.28)';
    defaultTitle = isAlert ? 'Diqqat: Xatolik' : 'O‘chirishni tasdiqlash';
    defaultConfirmText = 'Ha, o‘chirish';
    confirmBtnBg = 'var(--accent-rose)';
    confirmBtnColor = '#ffffff';
    confirmBtnHover = '#e11d48';
  } else if (type === 'warning') {
    IconComponent = customIcon || AlertTriangle;
    accentColor = 'var(--accent-amber)';
    bgBadge = 'rgba(245, 158, 11, 0.12)';
    borderBadge = 'rgba(245, 158, 11, 0.28)';
    defaultTitle = isAlert ? 'Ogohlantirish' : 'Diqqat qiling';
    defaultConfirmText = 'Davom etish';
    confirmBtnBg = 'var(--accent-amber)';
    confirmBtnColor = 'var(--text-inverse)';
    confirmBtnHover = '#d97706';
  } else if (type === 'success') {
    IconComponent = customIcon || CheckCircle2;
    accentColor = 'var(--accent-emerald)';
    bgBadge = 'rgba(16, 185, 129, 0.12)';
    borderBadge = 'rgba(16, 185, 129, 0.28)';
    defaultTitle = 'Muvaffaqiyatli';
    defaultConfirmText = 'Qabul qilish';
    confirmBtnBg = 'var(--accent-emerald)';
    confirmBtnColor = '#ffffff';
    confirmBtnHover = '#059669';
  } else if (type === 'info') {
    IconComponent = customIcon || Info;
    accentColor = 'var(--accent-cyan)';
    bgBadge = 'rgba(6, 182, 212, 0.12)';
    borderBadge = 'rgba(6, 182, 212, 0.28)';
    defaultTitle = isAlert ? 'Eslatma' : 'Tasdiqlash';
    defaultConfirmText = 'Tasdiqlash';
    confirmBtnBg = 'var(--primary)';
    confirmBtnColor = 'var(--text-on-primary)';
    confirmBtnHover = 'var(--primary-hover)';
  }

  const finalTitle = title || defaultTitle;
  const finalConfirmText = isAlert ? buttonText : (confirmText || defaultConfirmText);

  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissOnBackdrop) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'var(--dialog-backdrop, rgba(6, 10, 8, 0.72))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'confirmBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="confirm-dialog-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-modal, var(--bg-surface))',
          border: '1px solid var(--border-modal, var(--border-card))',
          borderRadius: 20,
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-subtle)',
          padding: '24px 24px 20px',
          color: 'var(--text-primary)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'confirmCardPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Yopish"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 10,
            border: 'none',
            background: 'var(--bg-chip)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-chip-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-chip)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <X size={16} />
        </button>

        {/* Status Badge Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: bgBadge,
            border: `1.5px solid ${borderBadge}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            marginBottom: 16,
            boxShadow: `0 0 24px ${bgBadge}`,
          }}
        >
          <IconComponent size={28} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3
          id="confirm-dialog-title"
          style={{
            margin: '0 0 8px 0',
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            padding: '0 16px',
            lineHeight: 1.3,
          }}
        >
          {finalTitle}
        </h3>

        {/* Message / Description */}
        <p
          id="confirm-dialog-desc"
          style={{
            margin: '0 0 22px 0',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            wordBreak: 'break-word',
            padding: '0 8px',
          }}
        >
          {message}
        </p>

        {description && (
          <div
            style={{
              width: '100%',
              margin: '-12px 0 20px 0',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            {description}
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isAlert ? 'center' : 'flex-end',
            gap: 12,
          }}
        >
          {!isAlert && (
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-chip)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-chip-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-chip)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 12,
              border: 'none',
              background: confirmBtnBg,
              color: confirmBtnColor,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: type === 'danger'
                ? '0 4px 14px rgba(244, 63, 94, 0.35)'
                : '0 4px 14px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = confirmBtnHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = confirmBtnBg;
              e.currentTarget.style.transform = 'none';
            }}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
