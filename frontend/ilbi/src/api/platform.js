import { request } from './client';

const call = async (path, options = {}) => {
  try { return await request(path, { ...options, skipTenant: true }); }
  catch (error) {
    if (error.data && typeof error.data === 'object' && !error.data.detail) {
      const messages = Object.values(error.data).flat().filter(value => typeof value === 'string');
      if (messages.length) error.message = messages.join(' ');
    }
    throw error;
  }
};
export const platformApi = {
  overview: () => call('/platform/overview/'),
  supportUnread: signal => call('/platform/support-unread/', { signal }),
  accounts: (params = {}) => call('/platform/accounts/?' + new URLSearchParams(params)),
  identity: id => call(`/platform/accounts/${id}/identity/`),
  recoverIdentity: (id, data) => call(`/platform/accounts/${id}/identity/`, { method: 'POST', body: data }),
  setAccountStatus: (id, data) => call(`/platform/accounts/${id}/status/`, { method: 'POST', body: data }),
  supportSettings: () => call('/support/settings/telegram/'),
  saveSupportSettings: data => call('/support/settings/telegram/', { method: 'PUT', body: data }),
  testSupportTelegram: () => call('/support/settings/telegram/test/', { method: 'POST' }),
};
