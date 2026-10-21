import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthContext from '../../src/context/authContext';
import { TenantProvider } from '../../src/context/TenantContext';
import SyncCenter from '../../src/components/sync/SyncCenter';
import '../../src/index.css';

window.ilbiDesktop = { version: 'qa' };
const jwt = `qa.${btoa(JSON.stringify({ user_id: 1, desktop_device: 'fixture-device', exp: Date.now() / 1000 + 3600 }))}.qa`;
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
window.fetch = async (input, options = {}) => {
  if (!String(input).startsWith('/desktop/')) return nativeFetch(input, options);
  syncQA.requests.push({ path: input, method: options.method });
  if (input === '/desktop/priority/') {
    const { id } = JSON.parse(options.body);
    const row = syncQA.state.operations.find(item => item.id === id);
    row.priority = 1;
    syncQA.state.operations = [syncQA.state.operations[0], row, ...syncQA.state.operations.filter(item => item.id !== id && item.status !== 'active')];
  }
  return new Response(JSON.stringify(input === '/desktop/status/' ? { desktop: true, enrolled: true } : syncQA.state),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const user = { id: 1, role: 'owner', tenants: [{ id: 7, name: 'QA do‘koni', is_owner: true, permissions: ['*'] }] };
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{ user, isAuthenticated: true }}>
  <TenantProvider><main style={{ padding: 28 }}><h1>ILBI</h1><SyncCenter /></main></TenantProvider>
</AuthContext.Provider>);
