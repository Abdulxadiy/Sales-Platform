// Render the production components with synthetic, local-only documentation data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthContext from '../../src/context/authContext';
import { TenantProvider } from '../../src/context/TenantContext';
import SyncCenter from '../../src/components/sync/SyncCenter';
import Login from '../../src/pages/Login';
import {BrowserRouter} from 'react-router-dom';
import {ToastProvider} from '../../src/context/ToastContext';
import {ThemeProvider} from '../../src/context/ThemeContext';
import IlbiLogo from '../../src/components/common/IlbiLogo';
import '../../src/index.css';

const mode = new URLSearchParams(location.search).get('mode') || 'queue';
window.ilbiDesktop = { version: 'documentation', openGuide: async () => true };
const local = !['prepare', 'account'].includes(mode);
const payload = { user_id: 1, exp: Date.now() / 1000 + 3600, ...(local ? { desktop_device: 'documentation-only' } : {}) };
localStorage.setItem('ilbi_access_token', `sample.${btoa(JSON.stringify(payload))}.sample`);
localStorage.setItem('ilbi_theme', 'light');
document.documentElement.setAttribute('data-theme', 'light');
const active = { id: 'active', title: 'Savdo №125', status: 'active', priority: 0, sequence: 1, dependencies: [] };
const payment = { id: 'payment', title: 'Qarz to‘lovi — namuna', status: 'waiting', priority: mode === 'priority' ? 1 : 0, sequence: 3, dependencies: [] };
const stock = { id: 'stock', title: 'Ombor kirimi', status: 'waiting', priority: 0, sequence: 2, dependencies: [] };
const state = { desktop: true, enrolled: mode !== 'prepare', online: true, active: mode === 'retry' ? null : 'active', progress: 27,
  stage: 'uploading', last_sync: null, operations: mode === 'retry'
    ? [{ id: 'failed', title: 'Qarz to‘lovi — namuna', status: 'error', error: 'Serverga ulanish uzildi. Internetni tekshiring.', priority: 0, sequence: 1, dependencies: [] }]
    : mode === 'priority' ? [active, payment, stock] : [active, stock, payment] };
window.fetch = async input => {
  if (String(input).startsWith('/api/')) return new Response(JSON.stringify({results:[],methods:[],enabled:false}),{headers:{'Content-Type':'application/json'}});
  if (!String(input).startsWith('/desktop/')) throw Error('Documentation fixture must not call a real API');
  return new Response(JSON.stringify(state), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const user = { id: 1, role: 'owner', tenants: [{ id: 7, name: 'Namuna do‘koni', is_owner: true, permissions: ['*'] }] };
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user, isAuthenticated: true, isOwner: true, isAdmin: false, logout() {} }}>
  <BrowserRouter><ThemeProvider><ToastProvider><TenantProvider><main style={{ maxWidth: 760, margin: '20px auto', padding: 24 }}>
    {mode === 'login' ? <div id="documentation-login"><Login /></div>
      : <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}><IlbiLogo size={32} /><SyncCenter /></header>}
  </main></TenantProvider></ToastProvider></ThemeProvider></BrowserRouter>
</AuthContext.Provider>);
