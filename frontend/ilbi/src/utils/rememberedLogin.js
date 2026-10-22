import { localStore } from './brandStorage.js';

const preference = kind => kind === 'offline' ? 'ilbi_remember_offline_me' : 'ilbi_remember_me';
const loginKey = kind => kind === 'offline' ? 'ilbi_remember_offline_login' : 'ilbi_remember_login';

export function remembersLogin(kind = 'online') { return localStore.getItem(preference(kind)) !== 'false'; }

export async function readRememberedLogin(kind = 'online', signal) {
  if (!remembersLogin(kind)) return null;
  if (window.ilbiDesktop) return window.ilbiDesktop.getSavedLogin ? window.ilbiDesktop.getSavedLogin(kind) : null;
  if (kind !== 'online' || !window.PasswordCredential || !navigator.credentials?.get) return null;
  // Never display an account chooser or sign in automatically on page load.
  const value = await navigator.credentials.get({ password: true, mediation: 'silent', ...(signal ? { signal } : {}) });
  return value?.type === 'password' ? { username: value.id, password: value.password } : null;
}

export async function rememberLogin(kind, username, password) {
  localStore.setItem(preference(kind), 'true');
  localStore.setItem(loginKey(kind), username.trim());
  if (window.ilbiDesktop) {
    if (!window.ilbiDesktop.saveLogin) throw Error('Login va parolni eslab qolish uchun ILBI ilovasini yangilang.');
    await window.ilbiDesktop.saveLogin(kind, { username: username.trim(), password });
  } else if (kind === 'online' && window.PasswordCredential && navigator.credentials?.store) {
    await navigator.credentials.store(new window.PasswordCredential({ id: username.trim(), password }));
  }
}

export async function forgetRememberedLogin(kind = 'online') {
  localStore.setItem(preference(kind), 'false');
  localStore.removeItem(loginKey(kind));
  localStore.removeItem('ilbi_remember_password');
  if (window.ilbiDesktop?.forgetLogin) await window.ilbiDesktop.forgetLogin(kind);
  else if (!window.ilbiDesktop && kind === 'online') await navigator.credentials?.preventSilentAccess?.();
}
