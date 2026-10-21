import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import IlbiLogo from '../common/IlbiLogo';
import { RetryButton } from '../common/RecoveryNotice';
import './SessionRecovery.css';

export default function SessionRecovery() {
  const { sessionError, retrySession, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="session-recovery">
      <div className="session-recovery__card" role="alert">
        <IlbiLogo size={52} variant="wordmark" />
        <p className="session-recovery__message">{sessionError}</p>
        <RetryButton variant="primary" onClick={retrySession}>Qayta tekshirish</RetryButton>
        <button className="btn btn-secondary" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Kirish oynasiga qaytish</button>
      </div>
    </div>
  );
}
