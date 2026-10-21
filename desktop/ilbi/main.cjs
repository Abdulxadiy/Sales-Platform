const { app, BrowserWindow, ipcMain, safeStorage, dialog, Menu, shell, session } = require('electron');
const { createServer: httpServer, request: httpRequest } = require('node:http');
const { createServer: httpsServer, request: httpsRequest } = require('node:https');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join, extname } = require('node:path');
const { networkInterfaces } = require('node:os');
const { randomBytes, createHash } = require('node:crypto');
const { validateServer, validatePairing, privateHost, safePath, equalKey, startHost } = require('./runtime.cjs');
app.setName('ILBI');

let window, localHost, lanServer, webServer, origin, configuration, secrets;
let quitting = false;
const bridgeKey = randomBytes(32).toString('hex');
const dataDir = app.getPath('userData');
const resources = app.isPackaged ? process.resourcesPath : join(__dirname, 'resources');
const uiRoot = app.isPackaged ? join(resources, 'ui') : join(__dirname, '../../frontend/ilbi/dist');
const vaultPath = join(dataDir, 'device.vault');

async function saveVault() {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw Error('Tizimning maxfiy ma’lumotlar ombori ishlamayapti.');
  const value = safeStorage.encryptString(JSON.stringify({ configuration, secrets }));
  await mkdir(dataDir, { recursive: true });
  await writeFile(vaultPath + '.new', value, { mode: 0o600 });
  await require('node:fs/promises').rename(vaultPath + '.new', vaultPath);
}
function validSender(event, setupOnly = false) {
  const url = new URL(event.senderFrame.url);
  if (url.origin !== origin || (setupOnly && url.pathname !== '/setup')) throw Error('So‘rov manbasi tasdiqlanmadi.');
}
function proxy(request, response, target, secure = false) {
  const headers = { ...request.headers, host: secure ? target.host : '127.0.0.1', 'x-ilbi-desktop-key': secure ? configuration.pairing.key : bridgeKey };
  delete headers.connection;
  const upstream = (secure ? httpsRequest : httpRequest)({ ...target, path: request.url, method: request.method, headers,
    timeout: 65000, ...(secure ? { ca: configuration.pairing.certificate, checkServerIdentity: () => undefined, rejectUnauthorized: true } : {}) }, remote => {
    response.writeHead(remote.statusCode, remote.headers); remote.pipe(response);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ detail: 'Asosiy kassa kompyuteriga ulanish yo‘q. Mahalliy tarmoq va asosiy kompyuterni tekshiring.' })); });
  request.pipe(upstream);
}
async function launchRuntime() {
  if (configuration.mode === 'host') {
    localHost = await startHost({ resources, dataDir, secrets, bridgeKey, server: configuration.server,
      executable: process.platform === 'win32' ? join(resources, 'backend/python/python.exe') : join(resources, 'backend/ilbi-runtime/ilbi-runtime'),
      runtimeArguments: process.platform === 'win32' ? [join(resources, 'backend/runtime.py')] : [] });
    lanServer = httpsServer({ cert: await readFile(join(dataDir, 'lan.crt')), key: await readFile(join(dataDir, 'lan.key')) }, (req, res) => {
      if (!equalKey(req.headers['x-ilbi-desktop-key'], secrets.pairingKey) || !/^\/(api\/v1\/|desktop\/|media\/)/.test(req.url)) { res.writeHead(403); res.end(); return; }
      proxy(req, res, { host: '127.0.0.1', port: localHost.port });
    });
    await new Promise((ok, fail) => { lanServer.once('error', fail); lanServer.listen(configuration.lanPort || 49243, '0.0.0.0', ok); });
  }
}
async function exportPairing(event) {
  validSender(event);
  if (configuration?.mode !== 'host') throw Error('Ulanish fayli asosiy kompyuterda yaratiladi.');
  const addresses = Object.entries(networkInterfaces()).flatMap(([name, items]) =>
    /^(docker|veth|br-|virbr|vmnet|vboxnet|tailscale|tun|tap)/i.test(name) ? [] :
      items.filter(item => item.family === 'IPv4' && !item.internal && privateHost(item.address))
        .map(item => ({ name, address: item.address })));
  if (!addresses.length) throw Error('Mahalliy tarmoq topilmadi. Wi-Fi yoki kabel ulanishini tekshiring.');
  let selected = 0;
  if (addresses.length > 1) {
    const choice = await dialog.showMessageBox(window, { type: 'question', title: 'Kassalar tarmog‘i',
      message: 'Boshqa kassalar ulangan mahalliy tarmoqni tanlang.',
      buttons: [...addresses.map(item => `${item.name}: ${item.address}`), 'Bekor qilish'],
      defaultId: 0, cancelId: addresses.length });
    if (choice.response === addresses.length) return false;
    selected = choice.response;
  }
  const host = addresses[selected].address;
  const result = await dialog.showSaveDialog(window, { title: 'Boshqa kassaga ulanish fayli', defaultPath: 'ILBI-kassa-ulanish.ilbi', filters: [{ name: 'ILBI pairing', extensions: ['ilbi'] }] });
  if (result.canceled) return false;
  const pairing = { protocol: 1, host, port: configuration.lanPort || 49243, key: secrets.pairingKey,
    certificate: await readFile(join(dataDir, 'lan.crt'), 'utf8') };
  await writeFile(result.filePath, JSON.stringify(pairing, null, 2), { mode: 0o600 });
  return true;
}
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault(); quitting = true;
  Promise.resolve().then(async () => { lanServer?.close(); webServer?.close(); await localHost?.stop(); })
    .catch(error => dialog.showErrorBox('ILBI yopilishi', error.message)).finally(() => app.quit());
});
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.restore(); window?.focus(); });
  app.whenReady().then(async () => {
    try {
      try { ({ configuration, secrets } = JSON.parse(safeStorage.decryptString(await readFile(vaultPath)))); }
      catch (error) { if (error.code !== 'ENOENT') throw Error('Qurilma sozlamalarini ochib bo‘lmadi. device.vault faylini o‘chirmang; Windows hisobingizni tekshiring.'); }
      if (configuration) await launchRuntime();
      webServer = httpServer(async (req, res) => {
        try {
          if (req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end(); return; }
          const url = new URL(req.url, 'http://localhost');
          if (/^\/(api\/|desktop\/|media\/)/.test(url.pathname)) {
            if (!configuration) { res.writeHead(503); res.end(); return; }
            return configuration.mode === 'host' ? proxy(req, res, { host: '127.0.0.1', port: localHost.port })
              : proxy(req, res, { host: configuration.pairing.host, port: configuration.pairing.port }, true);
          }
          const setup = url.pathname === '/setup' || url.pathname.startsWith('/setup.');
          let path = setup ? join(__dirname, url.pathname === '/setup' ? 'setup.html' : url.pathname.slice(1)) : safePath(uiRoot, url.pathname);
          let body;
          try { body = await readFile(path); } catch { if (setup || extname(path)) { res.writeHead(404); res.end(); return; } path = join(uiRoot, 'index.html'); body = await readFile(path); }
          let scriptHashes = '';
          if (extname(path) === '.html') {
            const markup = body.toString('utf8').replace(/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g, '');
            scriptHashes = [...markup.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => ` 'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`).join('');
            body = Buffer.from(markup);
          }
          const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }[extname(path)] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': `default-src 'self'; script-src 'self'${scriptHashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` });
          res.end(body);
        } catch { res.writeHead(500); res.end('ILBI local service error'); }
      });
      // A stable origin preserves account drafts and session storage across restarts.
      await new Promise((ok, fail) => { webServer.once('error', fail); webServer.listen(49244, '127.0.0.1', ok); });
      origin = `http://127.0.0.1:${webServer.address().port}`;
      ipcMain.handle('ilbi:setup', async (event, value) => {
        validSender(event, true);
        if (configuration) throw Error('Qurilma allaqachon sozlangan.');
        configuration = { mode: 'host', server: validateServer(value.server), lanPort: 49243 };
        secrets = { djangoSecret: randomBytes(48).toString('hex'), databasePassword: randomBytes(32).toString('hex'),
          vaultKey: randomBytes(32).toString('base64url') + '=', pairingKey: randomBytes(32).toString('hex') };
        await saveVault();
        await launchRuntime();
        await window.loadURL(origin + '/login');
      });
      ipcMain.handle('ilbi:join', async event => {
        validSender(event, true);
        if (configuration) throw Error('Qurilma allaqachon sozlangan.');
        const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'ILBI pairing', extensions: ['ilbi'] }] });
        if (result.canceled) return false;
        configuration = { mode: 'client', pairing: validatePairing(JSON.parse(await readFile(result.filePaths[0], 'utf8'))) };
        await saveVault();
        await window.loadURL(origin + '/login');
        return true;
      });
      ipcMain.handle('ilbi:pairing', exportPairing);
      session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission === 'media' && contents.getURL().startsWith(origin + '/')));
      app.setAppUserModelId('uz.ilbi.desktop');
      window = new BrowserWindow({ title: 'ILBI', icon: join(__dirname, 'icon.ico'), width: 1440, height: 960, minWidth: 900, minHeight: 650,
        webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
      window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(origin + '/')) event.preventDefault(); });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (url === 'about:blank' || url === '') return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } } };
        if (url.startsWith('https://')) void shell.openExternal(url);
        return { action: 'deny' };
      });
      Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'ILBI', submenu: [
        { label: 'Boshqa kassani ulash', click: () => exportPairing({ senderFrame: { url: origin + '/' } }).catch(error => dialog.showErrorBox('ILBI', error.message)) },
        { label: 'Ulanish faylini yangilash', enabled: configuration?.mode === 'client', click: async () => {
          try {
            const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'ILBI pairing', extensions: ['ilbi'] }] });
            if (result.canceled) return;
            configuration = { mode: 'client', pairing: validatePairing(JSON.parse(await readFile(result.filePaths[0], 'utf8'))) };
            await saveVault(); await window.loadURL(origin + '/login');
          } catch (error) { dialog.showErrorBox('ILBI', error.message); }
        } },
        { label: 'Dastur haqida', click: () => dialog.showMessageBox(window, { message: `ILBI ${app.getVersion()}`, detail: 'Yangilash uchun yangi ILBI installerini ishga tushiring. Mahalliy baza va yuborilmagan ishlar saqlanadi.' }) },
        { type: 'separator' }, { role: 'quit', label: 'Chiqish' },
      ] }, { label: 'Ko‘rinish', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' }] }]));
      await window.loadURL(origin + (configuration ? '/login' : '/setup'));
    } catch (error) { dialog.showErrorBox('ILBI ishga tushmadi', error.message); app.quit(); }
  });
}
