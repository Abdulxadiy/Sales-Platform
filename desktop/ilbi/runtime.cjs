const { randomBytes, timingSafeEqual, createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { readFile, writeFile, mkdir, access } = require('node:fs/promises');
const { join, resolve, sep } = require('node:path');
const net = require('node:net');

// Change together with the backend server policy when publishing a domain migration.
const OFFICIAL_SERVER = 'https://new-dev.site';
function validateServer(value) {
  if (value !== OFFICIAL_SERVER && value !== OFFICIAL_SERVER + '/') {
    throw Error('Server manzili rasmiy ILBI manziliga mos emas. Ilovani rasmiy saytdan yangilang yoki yordam xizmatiga murojaat qiling. Ma’lumotlar papkasini o‘chirmang.');
  }
  return OFFICIAL_SERVER;
}
function privateHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || /^10\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
}
function validatePairing(value) {
  if (value.protocol !== 1 || !privateHost(value.host) || !Number.isInteger(value.port) || value.port < 1024 || value.port > 65535 ||
      !/^[a-f0-9]{64}$/.test(value.key) || !value.certificate?.startsWith('-----BEGIN CERTIFICATE-----')) throw Error('Kassaga ulanish ma’lumoti noto‘g‘ri. Yangi kod bilan qayta ulang.');
  if(value.registerId!==undefined&&!/^[a-f0-9-]{36}$/i.test(value.registerId))throw Error('Kassa identifikatori noto‘g‘ri.');
  return { protocol: 1, host: value.host, port: value.port, key: value.key, certificate: value.certificate,
    ...(value.registerId?{registerId:value.registerId}:{}) };
}
function safePath(root, pathname) {
  const candidate = resolve(root, '.' + decodeURIComponent(pathname));
  if (candidate !== resolve(root) && !candidate.startsWith(resolve(root) + sep)) throw Error('Invalid file path');
  return candidate;
}
function equalKey(actual, expected) {
  const left = Buffer.from(actual || ''); const right = Buffer.from(expected || '');
  return left.length === right.length && timingSafeEqual(left, right);
}
async function freePort() {
  const listener = net.createServer();
  await new Promise((ok, fail) => { listener.once('error', fail); listener.listen(0, '127.0.0.1', ok); });
  const port = listener.address().port;
  await new Promise(ok => listener.close(ok));
  return port;
}
async function command(executable, args, options = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(executable, args, { windowsHide: true, ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-6000); });
    child.once('error', fail);
    child.once('exit', code => code === 0 ? ok() : fail(Error(`${executable} exited (${code}): ${stderr}`)));
  });
}
async function exists(path) { try { await access(path); return true; } catch { return false; } }
async function startHost({ resources, dataDir, secrets, bridgeKey, server, executable, runtimeArguments = [], updateKey = randomBytes(32).toString('hex') }) {
  server = validateServer(server);
  await mkdir(dataDir, { recursive: true });
  const pgRoot = join(resources, 'postgres');
  const binary = name => join(pgRoot, 'bin', name + (process.platform === 'win32' ? '.exe' : ''));
  const cluster = join(dataDir, 'postgres');
  const passwordFile = join(dataDir, 'postgres-password.tmp');
  const port = await freePort();
  if (!await exists(join(cluster, 'PG_VERSION'))) {
    await writeFile(passwordFile, secrets.databasePassword, { mode: 0o600 });
    try { await command(binary('initdb'), ['-D', cluster, '-U', 'ilbi_desktop', '--auth=scram-sha-256', '--encoding=UTF8', '--no-locale', '--pwfile', passwordFile]); }
    finally { await require('node:fs/promises').rm(passwordFile, { force: true }); }
  }
  // Recover an orphaned database process after a power loss or forced app exit.
  let wasRunning = false;
  try { await command(binary('pg_ctl'), ['-D', cluster, 'status']); wasRunning = true; } catch {}
  if (wasRunning) await command(binary('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop']);
  await command(binary('pg_ctl'), ['-D', cluster, '-l', join(dataDir, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start']);
  let processHandle;
  try {
    await command(binary('createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'ilbi_desktop', 'ilbi_desktop'],
      { env: { ...process.env, PGPASSWORD: secrets.databasePassword } }).catch(async error => {
        // Verify existence rather than treating all createdb failures as harmless.
        await command(binary('psql'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'ilbi_desktop', '-d', 'ilbi_desktop', '-c', 'SELECT 1'],
          { env: { ...process.env, PGPASSWORD: secrets.databasePassword } });
      });
    const apiPort = await freePort();
    const environment = { ...process.env, ILBI_DESKTOP_DATA: dataDir, ILBI_DESKTOP_SECRET: secrets.djangoSecret,
      ILBI_DESKTOP_VAULT_KEY: secrets.vaultKey, ILBI_DESKTOP_BRIDGE_KEY: bridgeKey, ILBI_DESKTOP_SERVER: server,
      ILBI_DESKTOP_DB_PASSWORD: secrets.databasePassword, ILBI_DESKTOP_DB_PORT: String(port), ILBI_DESKTOP_API_PORT: String(apiPort), ILBI_DESKTOP_UPDATE_KEY: updateKey };
    await command(executable, [...runtimeArguments, '--prepare'], { env: environment });
    processHandle = spawn(executable, runtimeArguments, { env: environment, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const log = require('node:fs').createWriteStream(join(dataDir, 'desktop.log'), { flags: 'a', mode: 0o600 });
    processHandle.stderr.pipe(log);
    for (let i = 0; i < 120; i++) {
      if (processHandle.exitCode !== null) throw Error('Mahalliy backend ishga tushmadi. desktop.log ni tekshiring.');
      try { const response = await fetch(`http://127.0.0.1:${apiPort}/desktop/status/`, { headers: { 'X-ILBI-Desktop-Key': bridgeKey } }); if (response.ok) break; } catch {}
      if (i === 119) throw Error('Mahalliy backend javob bermadi.');
      await new Promise(ok => setTimeout(ok, 250));
    }
    return { port: apiPort, stop: async () => {
      if (processHandle && processHandle.exitCode === null) {
        processHandle.kill();
        await Promise.race([new Promise(ok => processHandle.once('exit', ok)), new Promise(ok => setTimeout(ok, 5000))]);
      }
      await command(binary('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop']);
      log.end();
    } };
  } catch (error) {
    processHandle?.kill();
    await command(binary('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop']).catch(() => {});
    throw error;
  }
}
module.exports = { OFFICIAL_SERVER, validateServer, validatePairing, privateHost, safePath, equalKey, freePort, command, startHost };
