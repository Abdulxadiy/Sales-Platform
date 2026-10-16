import { localStore } from '../utils/brandStorage.js';
import { request } from './client';

export function guestSupportKey() {
  let key = localStore.getItem('ilbi_support_guest');
  if (!/^[a-f0-9]{64}$/.test(key || '')) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStore.setItem('ilbi_support_guest', key);
  }
  return key;
}

export async function publicSupportRequest(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    body: options.body && !isForm ? JSON.stringify(options.body) : options.body,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.detail || data.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.retryAfterMs = Number(response.headers.get('Retry-After') || 0) * 1000;
    throw error;
  }
  return options.responseType === 'blob' ? response.blob() : response.json();
}

export function supportApi(authenticated, operator = false) {
  const root = `/support/${operator ? 'inbox' : authenticated ? 'conversations' : 'guest'}/`;
  const call = (path = '', options = {}) => authenticated
    ? request(root + path, { ...options, skipTenant: true })
    : publicSupportRequest(root + path, { ...options, headers: { 'X-Support-Token': guestSupportKey() } });
  return {
    list: (query = '') => call(query),
    create: (body, tenantId) => call('', { method: 'POST', body, headers: tenantId ? { 'X-Tenant-ID': String(tenantId) } : {} }),
    detail: (id) => call(`${id}/`),
    action: (id, action, extra = {}) => call(`${id}/`, { method: 'POST', body: { action, ...extra } }),
    messages: (id, query = '') => call(`${id}/messages/${query}`),
    send: (id, body) => call(`${id}/messages/`, { method: 'POST', body }),
    image: (id, messageId) => call(`${id}/messages/${messageId}/image/`, { responseType: 'blob' }),
    voice: (id, messageId) => call(`${id}/messages/${messageId}/voice/`, { responseType: 'blob' }),
    customerProfile: (id) => call(`${id}/customer/`),
    updateCustomerProfile: (id, body) => call(`${id}/customer/`, { method: 'PATCH', body }),
  };
}
