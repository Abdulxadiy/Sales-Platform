import React, { useEffect, useRef, useState } from 'react';
import { setTokens } from '../../api/client';
import { desktopRequest } from './desktopApi';
import { localStore } from '../../utils/brandStorage';
import { remembersLogin, readRememberedLogin, rememberLogin, forgetRememberedLogin } from '../../utils/rememberedLogin';
import './sync.css';

export default function DesktopAccess() {
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState(() => localStore.getItem('ilbi_remember_offline_login') || '');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(() => remembersLogin('offline'));
  const edits = useRef(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (window.ilbiDesktop) void desktopRequest('status').then(result => setReady(result.enrolled)).catch(() => {});
  }, []);
  useEffect(() => {
    let alive = true; const version = edits.current;
    readRememberedLogin('offline').then(value => { if (alive && edits.current === version && value) { setUsername(value.username); setPin(value.password); } }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!ready) return null;
  async function unlock(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await desktopRequest('unlock', { username, pin });
      try { if (rememberMe) await rememberLogin('offline', username, pin); else await forgetRememberedLogin('offline'); }
      catch (failure) { setError(failure.message); }
      setTokens(result.access, result.refresh, rememberMe);
      window.location.assign('/dashboard');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="desktop-access" onSubmit={unlock}>
    <h3>Offline kassaga kirish</h3><p>Internet bo‘lmasa ham oldindan ulangan hisobingizdan foydalaning.</p>
    <label>Login<input name="offline-username" value={username} required disabled={busy} autoComplete="section-offline username" onChange={event => { edits.current += 1; setUsername(event.target.value); }} /></label>
    <label>Offline parol<input name="offline-password" type="password" value={pin} required disabled={busy} autoComplete="section-offline current-password" onChange={event => { edits.current += 1; setPin(event.target.value); }} /></label>
    <label className="desktop-remember"><input type="checkbox" checked={rememberMe} disabled={busy} onChange={event => {
      edits.current += 1; setRememberMe(event.target.checked);
      if (!event.target.checked) void forgetRememberedLogin('offline').catch(failure => setError(failure.message));
    }} />Meni eslab qol</label>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Tekshirilmoqda…' : 'Kassaga kirish'}</button>
  </form>;
}
