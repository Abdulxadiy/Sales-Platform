const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomBytes } = require('node:crypto');
const { startHost } = require('../runtime.cjs');

test('bundled Windows Python and PostgreSQL start the isolated offline service', { skip: process.platform !== 'win32', timeout: 180000 }, async () => {
  const resources = join(__dirname, '../resources');
  const dataDir = await mkdtemp(join(tmpdir(), 'ilbi-windows-host-'));
  const bridgeKey = randomBytes(32).toString('hex');
  const secrets = { djangoSecret: randomBytes(48).toString('hex'), databasePassword: randomBytes(32).toString('hex'), vaultKey: randomBytes(32).toString('base64url') + '=' };
  let host;
  try {
    host = await startHost({ resources, dataDir, secrets, bridgeKey, server: 'https://example.invalid',
      executable: join(resources, 'backend/python/python.exe'), runtimeArguments: [join(resources, 'backend/runtime.py')] });
    const url = `http://127.0.0.1:${host.port}/desktop/status/`;
    assert.equal((await fetch(url)).status, 403);
    const result = await (await fetch(url, { headers: { 'X-ILBI-Desktop-Key': bridgeKey } })).json();
    assert.equal(result.desktop, true);
    assert.equal(result.enrolled, false);
  } finally {
    await host?.stop();
    await rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});
