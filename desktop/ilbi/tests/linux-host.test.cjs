const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { OFFICIAL_SERVER, startHost } = require('../runtime.cjs');

test('bundled Linux runtime migrates, isolates its database and preserves data on restart', {
  skip: process.platform !== 'linux' || !process.env.ILBI_DESKTOP_TEST_RESOURCES, timeout: 180000,
}, async () => {
  const resources = process.env.ILBI_DESKTOP_TEST_RESOURCES;
  const dataDir = await mkdtemp(join(tmpdir(), 'ilbi-linux-host-'));
  const bridgeKey = randomBytes(32).toString('hex');
  const secrets = { djangoSecret: randomBytes(48).toString('hex'), databasePassword: randomBytes(32).toString('hex'), vaultKey: randomBytes(32).toString('base64url') + '=' };
  const options = { resources, dataDir, secrets, bridgeKey, server: OFFICIAL_SERVER,
    executable: join(resources, 'backend/python/bin/python3'), runtimeArguments: [join(resources, 'backend/runtime.py')] };
  let host;
  try {
    host = await startHost(options);
    let url = `http://127.0.0.1:${host.port}/desktop/status/`;
    assert.equal((await fetch(url)).status, 403);
    const status = await (await fetch(url, { headers: { 'X-ILBI-Desktop-Key': bridgeKey } })).json();
    assert.equal(status.server, OFFICIAL_SERVER); assert.equal(status.desktop, true); assert.equal(status.enrolled, false);
    // Query this app's own disposable cluster, never the host's PostgreSQL service.
    const { readFile } = require('node:fs/promises');
    const pgPort = (await readFile(join(dataDir, 'postgres/postmaster.pid'), 'utf8')).split('\n')[3];
    const query = sql => execFileSync(join(resources, 'postgres/bin/psql'), ['-h','127.0.0.1','-p',pgPort,'-U','ilbi_desktop','-d','ilbi_desktop','-tAc',sql], { env: { ...process.env, PGPASSWORD: secrets.databasePassword }, encoding: 'utf8' }).trim();
    assert.match(query('SELECT version()'), /PostgreSQL 16\.15/);
    query('CREATE TABLE linux_restart_qa (value text); INSERT INTO linux_restart_qa VALUES (\'saved offline\')');
    await host.stop(); host = null;
    host = await startHost(options);
    const nextPort = (await readFile(join(dataDir, 'postgres/postmaster.pid'), 'utf8')).split('\n')[3];
    const saved = execFileSync(join(resources, 'postgres/bin/psql'), ['-h','127.0.0.1','-p',nextPort,'-U','ilbi_desktop','-d','ilbi_desktop','-tAc','SELECT value FROM linux_restart_qa'], { env: { ...process.env, PGPASSWORD: secrets.databasePassword }, encoding: 'utf8' }).trim();
    assert.equal(saved, 'saved offline');
  } finally { await host?.stop(); await rm(dataDir, { recursive: true, force: true }); }
});
