import React, { useEffect, useState } from 'react';
import { setTokens } from '../../api/client';
import { desktopRequest } from './desktopApi';
import './sync.css';

export default function DesktopAccess() {
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (window.ilbiDesktop) void desktopRequest('status').then(result => setReady(result.enrolled)).catch(() => {});
  }, []);
  if (!ready) return null;
  async function unlock(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await desktopRequest('unlock', { username, pin });
      setTokens(result.access, result.refresh, true);
      window.location.assign('/dashboard');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="desktop-access" onSubmit={unlock}>
    <h3>Offline kassaga kirish</h3><p>Internet bo‘lmasa ham oldindan ulangan hisobingizdan foydalaning.</p>
    <label>Login<input value={username} required autoComplete="username" onChange={event => setUsername(event.target.value)} /></label>
    <label>Offline parol<input type="password" value={pin} required autoComplete="current-password" onChange={event => setPin(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Tekshirilmoqda…' : 'Kassaga kirish'}</button>
  </form>;
}
