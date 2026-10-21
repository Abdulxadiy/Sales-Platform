import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import './RecoveryNotice.css';

export function RetryButton({ children = 'Qayta urinish', loading = false, disabled = false, variant = 'secondary', className = '', ...props }) {
  return <button {...props} type="button" className={`btn btn-${variant} retry-button ${className}`} disabled={disabled || loading} aria-busy={loading}>
    <RefreshCw size={16} aria-hidden="true" className={loading ? 'retry-button-spinner' : undefined} />
    <span>{loading ? 'Tekshirilmoqda…' : children}</span>
  </button>;
}

export default function RecoveryNotice({ title, children, actions, className = '' }) {
  return <div className={`recovery-notice ${className}`} role="alert">
    <AlertCircle className="recovery-notice-icon" size={22} aria-hidden="true" />
    <div className="recovery-notice-body"><strong>{title}</strong><p>{children}</p></div>
    {actions && <div className="recovery-notice-actions">{actions}</div>}
  </div>;
}
