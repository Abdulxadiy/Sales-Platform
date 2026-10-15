import React from 'react';
import IlbiLogo from './IlbiLogo';
import './AppLoadingScreen.css';

export default function AppLoadingScreen({ message = 'Xavfsiz sessiya tekshirilmoqda...' }) {
  return (
    <div className="ilbi-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="ilbi-loading__card">
        <div className="ilbi-loading__mark">
          <span className="ilbi-loading__ring" aria-hidden="true" />
          <IlbiLogo size={42} iconOnly />
        </div>
        <IlbiLogo size={52} variant="wordmark" />
        <p className="ilbi-loading__message">{message}</p>
        <div className="ilbi-loading__progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
