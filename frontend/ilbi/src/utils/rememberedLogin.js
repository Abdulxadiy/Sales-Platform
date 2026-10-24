import { localStore } from './brandStorage.js';

const preference = kind => kind === 'offline' ? 'ilbi_remember_offline_me' : 'ilbi_remember_me';
const loginKey = kind => kind === 'offline' ? 'ilbi_remember_offline_login' : 'ilbi_remember_login';
const passKey = kind => kind === 'offline' ? 'ilbi_remember_offline_pass_vault' : 'ilbi_remember_pass_vault';

function encodeSecret(str) {
  if (!str) return '';
  try {
    return 'v1:' + btoa(unescape(encodeURIComponent(str)));
  } catch {
    return 'v1:' + btoa(str);
  }
}

function decodeSecret(str) {
  if (!str) return '';
  try {
    const raw = str.startsWith('v1:') ? str.slice(3) : str;
    return decodeURIComponent(escape(atob(raw)));
  } catch {
    try {
      const raw = str.startsWith('v1:') ? str.slice(3) : str;
      return atob(raw);
    } catch {
      return '';
    }
  }
}

export function remembersLogin(kind = 'online') { return localStore.getItem(preference(kind)) !== 'false'; }

export async function readRememberedLogin(kind = 'online', signal) {
  if (!remembersLogin(kind)) return null;
  if (window.ilbiDesktop) return window.ilbiDesktop.getSavedLogin ? window.ilbiDesktop.getSavedLogin(kind) : null;

  if (kind === 'online' && window.PasswordCredential && navigator.credentials?.get) {
    try {
      const value = await navigator.credentials.get({ password: true, mediation: 'silent', ...(signal ? { signal } : {}) });
      if (value?.type === 'password') {
        return { username: value.id, password: value.password };
      }
    } catch { /* Fallback to stored vault */ }
  }

  const savedUser = localStore.getItem(loginKey(kind));
  const encodedPass = localStore.getItem(passKey(kind));
  const savedPass = decodeSecret(encodedPass);

  if (savedUser || savedPass) {
    return { username: savedUser || '', password: savedPass || '' };
  }
  return null;
}

export async function rememberLogin(kind, username, password) {
  localStore.setItem(preference(kind), 'true');
  if (username) localStore.setItem(loginKey(kind), username.trim());

  if (window.ilbiDesktop) {
    if (!window.ilbiDesktop.saveLogin) throw Error('Login va parolni eslab qolish uchun ILBI ilovasini yangilang.');
    await window.ilbiDesktop.saveLogin(kind, { username: username.trim(), password });
    localStore.removeItem(passKey(kind));
  } else if (kind === 'online' && window.PasswordCredential && navigator.credentials?.store) {
    try {
      await navigator.credentials.store(new window.PasswordCredential({ id: username.trim(), password }));
    } catch {
      if (password) localStore.setItem(passKey(kind), encodeSecret(password));
    }
  } else if (password) {
    localStore.setItem(passKey(kind), encodeSecret(password));
  }
}

export async function forgetRememberedLogin(kind = 'online') {
  localStore.setItem(preference(kind), 'false');
  localStore.removeItem(loginKey(kind));
  localStore.removeItem(passKey(kind));
  if (window.ilbiDesktop?.forgetLogin) await window.ilbiDesktop.forgetLogin(kind);
  else if (!window.ilbiDesktop && kind === 'online') await navigator.credentials?.preventSilentAccess?.();
}
