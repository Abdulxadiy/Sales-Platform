const test = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { OFFICIAL_SERVER, validateServer, migrateStoredServer, validatePairing, safePath, equalKey, startHost } = require('../runtime.cjs');

test('cloud destinations are restricted to the official release origin', () => {
  assert.equal(validateServer(OFFICIAL_SERVER), OFFICIAL_SERVER);
  assert.equal(validateServer(OFFICIAL_SERVER + '/'), OFFICIAL_SERVER);
  for (const value of [undefined, null, {}, 'https://retired.example', 'https://evil.example',
    'http://127.0.0.1:8000', 'http://ilbi.uz', 'https://ilbi.uz.evil.example',
    'https://user:secret@ilbi.uz', 'https://ilbi.uz@evil.example',
    'https://ilbi.uz:8443', 'https://ilbi.uz./', 'https://ilbi.uz/path',
    'https://ilbi.uz/?server=evil', 'https://ilbi.uz/#evil', 'file:///etc/passwd']) {
    assert.throws(() => validateServer(value));
  }
});
test('a changed persisted server is refused before creating a database or starting a process', async () => {
  await assert.rejects(startHost({ server: 'https://evil.example' }), /rasmiy ILBI/);
});
test('the previous encrypted setting migrates locally but cannot be a request destination', () => {
  for (const previous of ['https://new-dev.site', 'https://new-dev.site/']) {
    assert.equal(migrateStoredServer(previous), OFFICIAL_SERVER);
    assert.throws(() => validateServer(previous));
  }
  for (const altered of ['https://new-dev.site.evil.example', 'https://evil.example']) {
    assert.throws(() => migrateStoredServer(altered));
  }
});
test('the sandboxed setup bridge does not forward a renderer-supplied server', () => {
  const vm = require('node:vm');
  const { readFileSync } = require('node:fs');
  let bridge;
  const invocations = [];
  vm.runInNewContext(readFileSync(join(__dirname, '../preload.cjs'), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } },
      ipcRenderer: { invoke: (...args) => { invocations.push(args); } } }),
  });
  bridge.setup({ server: 'https://evil.example' });
  assert.deepEqual(invocations, [['ilbi:setup']]);
});
test('LAN pairing requires a private address, pinned certificate and strong key', () => {
  const value = { protocol: 1, host: '192.168.1.8', port: 49243, key: 'a'.repeat(64), certificate: '-----BEGIN CERTIFICATE-----\nexample' };
  assert.equal(validatePairing(value).host, value.host);
  assert.throws(() => validatePairing({ ...value, host: 'example.com' }));
  assert.throws(() => validatePairing({ ...value, key: 'guessable' }));
});
test('local asset serving rejects encoded traversal', () => {
  const root = join(tmpdir(), 'ilbi-ui');
  assert.equal(safePath(root, '/assets/test.js'), join(root, 'assets/test.js'));
  assert.throws(() => safePath(root, '/%2e%2e/secret'));
  assert.equal(equalKey('abc', 'abc'), true);
  assert.equal(equalKey('', 'abc'), false);
});
test('native errors are presented without Electron transport wrappers', async () => {
  const vm = require('node:vm');
  const { readFileSync } = require('node:fs');
  let bridge;
  vm.runInNewContext(readFileSync(join(__dirname, '../preload.cjs'), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_name, value) => { bridge = value; } },
      ipcRenderer: { invoke: async () => { throw Error("Error invoking remote method 'ilbi:setup': Error: Parollar omboriga ulanib bo‘lmadi."); } } }),
  });
  await assert.rejects(bridge.setup(), error => error.message === 'Parollar omboriga ulanib bo‘lmadi.');
});
