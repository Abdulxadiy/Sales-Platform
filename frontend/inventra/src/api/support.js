import { request } from './client';

export function guestSupportKey() {
  let key = localStorage.getItem('inventra_support_guest');
  if (!/^[a-f0-9]{64}$/.test(key || '')) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('inventra_support_guest', key);
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
    throw error;
  }
  return options.responseType === 'blob' ? response.blob() : response.json();
}

export function supportApi(authenticated, operator = false) {
  const root = `/support/${operator ? 'inbox' : authenticated ? 'conversations' : 'guest'}/`;
  const call = (path = '', options = {}) => authenticated
    ? request(root + path, options)
    : publicSupportRequest(root + path, { ...options, headers: { 'X-Support-Token': guestSupportKey() } });
  return {
    list: (query = '') => call(query),
    create: (body) => call('', { method: 'POST', body }),
    detail: (id) => call(`${id}/`),
    action: (id, action, extra = {}) => call(`${id}/`, { method: 'POST', body: { action, ...extra } }),
    messages: (id, query = '') => call(`${id}/messages/${query}`),
    send: (id, body) => call(`${id}/messages/`, { method: 'POST', body }),
    image: (id, messageId) => call(`${id}/messages/${messageId}/image/`, { responseType: 'blob' }),
  };
}
