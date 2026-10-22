const { mkdir, readFile, writeFile, rename, rm } = require('node:fs/promises');
const { join } = require('node:path');

class LoginCredentials {
  constructor({ directory, safeStorage, platform = process.platform }) {
    this.directory = directory; this.path = join(directory, 'login-credentials.vault');
    this.safeStorage = safeStorage; this.platform = platform; this.pending = Promise.resolve();
  }
  kind(value) { if (!['online', 'offline'].includes(value)) throw Error('Kirish turi noto‘g‘ri.'); return value; }
  secure() {
    if (!this.safeStorage.isEncryptionAvailable() || this.platform === 'linux' && this.safeStorage.getSelectedStorageBackend() === 'basic_text') {
      throw Error('Parolni eslab qolish uchun tizim parollar omborining qulfini oching.');
    }
  }
  async read() {
    let encrypted;
    try { encrypted = await readFile(this.path); } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
    this.secure();
    return JSON.parse(this.safeStorage.decryptString(encrypted));
  }
  async get(kind) { this.kind(kind); await this.pending; return (await this.read())[kind] || null; }
  change(action) {
    const next = this.pending.catch(() => {}).then(action);
    this.pending = next.catch(() => {}); return next;
  }
  async write(values) {
    if (!Object.keys(values).length) { await rm(this.path, { force: true }); return; }
    this.secure();
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const encrypted = this.safeStorage.encryptString(JSON.stringify(values));
    await writeFile(this.path + '.new', encrypted, { mode: 0o600 });
    await rename(this.path + '.new', this.path);
  }
  save(kind, value) {
    this.kind(kind);
    if (typeof value?.username !== 'string' || !value.username.trim() || value.username.length > 254 || typeof value.password !== 'string' || !value.password || value.password.length > 4096) throw Error('Login va parolni to‘liq kiriting.');
    return this.change(async () => { const values = await this.read(); values[kind] = { username: value.username.trim(), password: value.password }; await this.write(values); return true; });
  }
  forget(kind) {
    this.kind(kind);
    return this.change(async () => {
      let values;
      try { values = await this.read(); }
      catch { await rm(this.path, { force: true }); return true; }
      delete values[kind]; await this.write(values); return true;
    });
  }
}
module.exports = { LoginCredentials };
