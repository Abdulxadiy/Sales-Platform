export async function desktopLogin(path, body, access) {
  const response = await fetch(`/desktop/${path}/`, {
    method: 'POST', headers: {'Content-Type':'application/json', ...(access ? {Authorization:`Bearer ${access}`} : {})},
    body: JSON.stringify(body), signal: AbortSignal.timeout(35000),
  });
  const value = await response.json();
  if (!response.ok) throw Object.assign(Error(value.detail || 'Hisob tasdiqlanmadi.'), {status:response.status,code:value.code});
  return value;
}

export async function localAccountLogin(username, password) {
  if (!window.ilbiDesktop) return null;
  try {
    const value = await desktopLogin('unlock', {username,password});
    return value.access && value.refresh ? value : null;
  } catch (error) {
    if (error.status === 429) throw error;
    return null;
  }
}

export async function prepareDesktopAccount(username, password, tokens) {
  if (!window.ilbiDesktop || !password) return tokens;
  try {
    const result = await desktopLogin('session', {username,password,refresh:tokens.refresh}, tokens.access);
    return result.prepared && result.access && result.refresh ? {...tokens,...result} : {...tokens,desktopNotice:result.notice};
  } catch {
    return {...tokens,desktopNotice:'Hisobingiz online ochildi. Offline ishlashni tayyorlash uchun hisobni qayta tasdiqlang.'};
  }
}
