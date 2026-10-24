export class ApiError extends Error {
  constructor(message: string, public status = 0, public data: any = null, public retryAfterMs = 0, public code = 'API_ERROR') { super(message); this.name = 'ApiError'; }
}
export function errorMessage(data: any, fallback = 'So‘rov bajarilmadi'): string {
  if (typeof data === 'string') return data.slice(0, 400) || fallback;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (data && typeof data === 'object') {
    const values = Object.values(data).flat().filter(value => typeof value === 'string');
    if (values.length) return values.join(' ');
  }
  return fallback;
}
