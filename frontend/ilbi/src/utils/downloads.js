export function releaseURL(value, origin) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (!value.startsWith('https://') && !/^\/downloads\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return url.href;
  } catch { return null; }
}

export function releaseSize(bytes) {
  return Number.isFinite(bytes) && bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '';
}
