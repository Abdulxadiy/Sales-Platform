const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, stat } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const { LoginCredentials } = require('../login-credentials.cjs');

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ilbi-login-vault-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const key = randomBytes(32);
  const safeStorage = {
    isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'gnome_libsecret',
    encryptString(value) { const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce); return Buffer.concat([nonce, cipher.update(value), cipher.final(), cipher.getAuthTag()]); },
    decryptString(value) { const cipher = createDecipheriv('aes-256-gcm', key, value.subarray(0,12)); cipher.setAuthTag(value.subarray(-16)); return Buffer.concat([cipher.update(value.subarray(12,-16)), cipher.final()]).toString(); },
  };
  return { directory, safeStorage, store: new LoginCredentials({ directory, safeStorage, platform: 'linux' }) };
}
test('login and offline passwords stay encrypted and survive reopening independently', async t => {
  const { store, directory, safeStorage } = await fixture(t);
  const login = { username: 'synthetic-owner', password: 'synthetic-online-password' };
  await store.save('online', login);
  await store.save('offline', { username: login.username, password: 'synthetic-offline-password' });
  const bytes = await readFile(store.path);
  assert(!bytes.includes(Buffer.from(login.password))); assert(!bytes.includes(Buffer.from(login.username)));
  if (process.platform !== 'win32') assert.equal((await stat(store.path)).mode & 0o777, 0o600);
  const reopened = new LoginCredentials({ directory, safeStorage, platform: 'linux' });
  assert.deepEqual(await reopened.get('online'), login);
  await reopened.forget('online'); assert.equal(await reopened.get('online'), null);
  assert.equal((await reopened.get('offline')).password, 'synthetic-offline-password');
  await reopened.forget('offline'); await assert.rejects(stat(store.path));
});
test('no plaintext fallback is possible when the OS vault is unavailable or basic_text', async t => {
  for (const backend of ['locked', 'basic_text']) {
    const { store, safeStorage } = await fixture(t);
    safeStorage.isEncryptionAvailable = () => backend !== 'locked';
    safeStorage.getSelectedStorageBackend = () => backend;
    await assert.rejects(store.save('online', { username:'synthetic-user', password:'synthetic-password' }), /parollar ombor/);
    await assert.rejects(stat(store.path));
  }
});
test('forgetting during a pending save wins and later saves recover from an earlier failure', async t => {
  const { store, safeStorage } = await fixture(t);
  const login = { username: 'synthetic-user', password: 'synthetic-password' };
  safeStorage.isEncryptionAvailable = () => false;
  await assert.rejects(store.save('online', login));
  safeStorage.isEncryptionAvailable = () => true;
  await Promise.all([store.save('online', login), store.forget('online')]);
  assert.equal(await store.get('online'), null);
  assert.throws(() => store.save('unknown', login));
  assert.throws(() => store.save('online', { username:'', password:'invalid' }));
});
