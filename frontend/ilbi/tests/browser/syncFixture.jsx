import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthContext from '../../src/context/authContext';
import { TenantProvider } from '../../src/context/TenantContext';
import SyncCenter from '../../src/components/sync/SyncCenter';
import Layout from '../../src/components/layout/Layout';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { ConfirmProvider } from '../../src/context/ConfirmContext';
import { BrowserRouter } from 'react-router-dom';
import '../../src/index.css';

window.ilbiDesktop = { version: 'qa' };
const security=new URLSearchParams(location.search).has('security');
if(security)Object.assign(window.ilbiDesktop,{
  onOpenSecurity:callback=>{window.openSecurityQA=callback;return()=>{};},
  getSetupState:async()=>({mode:'host'}),getRegisters:async()=>syncQA.registers||[],
  createPairing:async()=>{syncQA.pair={id:'synthetic-pairing',state:'waiting',code:'12345678',remaining:180};return {...syncQA.pair};},
  getPairingState:async()=>({...syncQA.pair}),approvePairing:async(_token,_id,expected)=>{if(expected!==syncQA.pair.fingerprint)throw Error('Wrong comparison');syncQA.pair.state='approved';return {...syncQA.pair};},
  cancelPairing:async()=>{syncQA.pair.state='expired';return {...syncQA.pair};},
  revokeRegister:async(_token,id)=>{syncQA.registers=syncQA.registers.filter(row=>row.id!==id);},
  setIdleMinutes:async(_token,minutes)=>{syncQA.minutes=minutes;},
  lockSession:async()=>{syncQA.locked=true;},
  getBackupStatus:async()=>({backups:syncQA.backups||[],busy:false}),
  createBackup:async()=>{syncQA.backups=[{id:'synthetic-backup',created:Date.now(),bytes:1000000}];return {backups:syncQA.backups,busy:false};},
  restoreBackup:async(_token,id,password)=>{syncQA.restore={id,password};return {cancelled:true};},
});
const setup = new URLSearchParams(location.search).get('setup');
if (setup) for (const prefix of ['ilbi_', 'inventra_']) { localStorage.removeItem(prefix+'active_tenant:1'); sessionStorage.removeItem(prefix+'active_tenant:1'); }
const jwt = `qa.${btoa(JSON.stringify({ user_id: 1, ...(!setup ? { desktop_device: 'fixture-device' } : {}), exp: Date.now() / 1000 + 3600 }))}.qa`;
localStorage.setItem('ilbi_access_token', jwt);
window.syncQA = {
  requests: [], state: {
    enrolled: true, online: true, active: 'active', progress: 27, stage: 'uploading', last_sync: '2026-10-21T08:00:00Z',
    operations: [
      { id: 'active', title: 'Savdo №125', status: 'active', priority: 0, sequence: 1, dependencies: [] },
      { id: 'normal', title: 'Ombor kirimi', status: 'waiting', priority: 0, sequence: 2, dependencies: [] },
      { id: 'urgent', title: 'Aliyev — qarz to‘lovi', status: 'waiting', priority: 0, sequence: 3, dependencies: [] },
    ],
  },
};
const nativeFetch = window.fetch.bind(window);
const workspace = new URLSearchParams(location.search).has('workspace');
window.fetch = async (input, options = {}) => {
  if (workspace && String(input).startsWith('/api/v1/')) {
    const value = String(input).includes('/shift/current/') ? { is_open: false }
      : { results: [], count: 0, unread_count: 0, overdue_count: 0, next: null };
    return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (!String(input).startsWith('/desktop/')) return nativeFetch(input, options);
  syncQA.requests.push({ path: input, method: options.method, body: options.body ? JSON.parse(options.body) : null });
  if(security&&input==='/desktop/session-state/')return Response.json({owner:true,locked:false,idle_minutes:syncQA.minutes||10,lease_until:Date.now()/1000+36000});
  if (input === '/desktop/enroll/' || input === '/desktop/actor/') return new Response(JSON.stringify({ detail: 'Sinov javobi: qayta urinib ko‘rish mumkin.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (input === '/desktop/priority/') {
    const { id } = JSON.parse(options.body);
    const row = syncQA.state.operations.find(item => item.id === id);
    row.priority = 1;
    syncQA.state.operations = [syncQA.state.operations[0], row, ...syncQA.state.operations.filter(item => item.id !== id && item.status !== 'active')];
  }
  return new Response(JSON.stringify(input === '/desktop/status/' ? { desktop: true, enrolled: !setup || setup === 'actor' } : syncQA.state),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const user = { id: 1, role: 'owner', tenants: [{ id: 7, name: 'QA do‘koni', is_owner: true, permissions: ['*'] }] };
if (setup === 'multi') user.tenants.push({ id: 8, name: 'Ikkinchi QA do‘koni', is_owner: true, permissions: ['*'] });
if (setup === 'admin' || setup === 'actor') user.tenants = [];
const content = workspace ? <ThemeProvider><ToastProvider><ConfirmProvider><BrowserRouter>
  <Layout><main><h1>Offline ish stoli</h1><input aria-label="Sinov qoralamasi" defaultValue="" /></main></Layout>
</BrowserRouter></ConfirmProvider></ToastProvider></ThemeProvider>
  : <main style={{ padding: 28 }}><h1>ILBI</h1><SyncCenter /></main>;
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user, isAuthenticated: true, isOwner: true, isAdmin: setup === 'admin', logout() {} }}>
  <TenantProvider>{content}</TenantProvider>
</AuthContext.Provider>);
