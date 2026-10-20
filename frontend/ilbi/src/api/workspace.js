import { request } from './client';

export const workspaceApi = {
  overview: (signal) => request('/workspace/overview/', { signal }),
  search: (query, signal) => request(`/workspace/search/?q=${encodeURIComponent(query)}`, { signal }),
  reminders: (completed = 'false', signal) => request(`/workspace/reminders/?completed=${completed}`, { signal }),
  members: (signal) => request('/workspace/members/', { signal }),
  createReminder: (data) => request('/workspace/reminders/', { method: 'POST', body: data }),
  updateReminder: (id, data) => request(`/workspace/reminders/${id}/`, { method: 'PATCH', body: data }),
  deleteReminder: (id) => request(`/workspace/reminders/${id}/`, { method: 'DELETE' }),
};
