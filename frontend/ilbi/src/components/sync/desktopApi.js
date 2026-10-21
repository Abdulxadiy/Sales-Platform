import { getAccessToken } from '../../api/client';

export async function desktopRequest(path, body, { signal } = {}) {
  const response = await fetch(`/desktop/${path}/`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() || ''}` },
    signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data;
  try { data = await response.json(); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Ilovaning mahalliy xizmati javobini o‘qib bo‘lmadi. ILBI’ni qayta oching.');
  }
  if (!response.ok) throw Object.assign(new Error(data.detail || 'Sinxronlash xizmati javob bermadi.'), { code: data.code, status: response.status });
  return data;
}
