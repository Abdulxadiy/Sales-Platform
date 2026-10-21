import { getAccessToken } from '../../api/client';

export async function desktopRequest(path, body) {
  const response = await fetch(`/desktop/${path}/`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() || ''}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Sinxronlash xizmati javob bermadi.');
  return data;
}
