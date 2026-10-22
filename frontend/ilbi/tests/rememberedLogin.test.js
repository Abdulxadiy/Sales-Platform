import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readRememberedLogin, rememberLogin, forgetRememberedLogin } from '../src/utils/rememberedLogin.js';

class Storage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => {
  globalThis.localStorage = new Storage(); globalThis.sessionStorage = new Storage(); globalThis.window = {};
  Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{}});
});
const password = 'synthetic-private-password';
const noPlaintext = () => assert.equal(JSON.stringify([...localStorage.data, ...sessionStorage.data]).includes(password), false);

test('native login uses the OS bridge, separates online/offline and honors opt-out', async () => {
  const vault = new Map();
  window.ilbiDesktop = { saveLogin: async (kind,value)=>vault.set(kind,value), getSavedLogin: async kind=>vault.get(kind)||null, forgetLogin: async kind=>vault.delete(kind) };
  await rememberLogin('online', ' owner ', password);
  await rememberLogin('offline', 'cashier', password);
  assert.deepEqual(await readRememberedLogin(), {username:'owner',password});
  await forgetRememberedLogin();
  assert.equal(await readRememberedLogin(), null);
  assert.equal(vault.has('online'), false);
  assert.equal((await readRememberedLogin('offline')).username, 'cashier');
  noPlaintext();
});

test('web login uses the browser password manager and prevents automatic sign-in', async () => {
  let saved, prevented = false;
  window.PasswordCredential = class { constructor(value) { Object.assign(this,value,{type:'password'}); } };
  navigator.credentials = {
    store: async value=>{saved=value;},
    get: async options=>{ assert.equal(options.mediation,'silent'); assert.equal(options.password,true); return saved; },
    preventSilentAccess: async ()=>{prevented=true;},
  };
  await rememberLogin('online','owner',password);
  assert.deepEqual(await readRememberedLogin(),{username:'owner',password});
  await forgetRememberedLogin();
  assert.equal(prevented,true);
  assert.equal(await readRememberedLogin(),null);
  noPlaintext();
});

test('older desktop and unavailable browser APIs never fall back to plaintext', async () => {
  assert.equal(await readRememberedLogin(), null);
  await rememberLogin('online','owner',password);
  window.ilbiDesktop = {version:'old'};
  await assert.rejects(rememberLogin('online','owner',password), /yangilang/);
  assert.equal(await readRememberedLogin(), null);
  noPlaintext();
});
