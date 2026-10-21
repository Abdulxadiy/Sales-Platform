const { app, BrowserWindow, ipcMain, safeStorage, dialog, Menu, shell, session, net, Notification } = require('electron');
const { createServer: httpServer, request: httpRequest } = require('node:http');
const { createServer: httpsServer, request: httpsRequest } = require('node:https');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join, extname, dirname } = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { DesktopUpdater } = require('./updater.cjs');
const { networkInterfaces } = require('node:os');
const { randomBytes, createHash } = require('node:crypto');
const { OFFICIAL_SERVER, validateServer, validatePairing, privateHost, safePath, equalKey, startHost } = require('./runtime.cjs');
const { configureSecretStore, serveReleases } = require('./services.cjs');
const { saveDocumentPDF, receiptShareLinks } = require('./document-sharing.cjs');
configureSecretStore(app);
app.setName('ILBI');
if (process.platform === 'linux') app.setDesktopName('uz.ilbi.desktop.desktop');

let window, guideWindow, updateWindow, localHost, lanServer, webServer, origin, configuration, secrets, updater;
let quitting = false;
let closing = false, maintenance = false, activeRequests = 0;
let setupBusy = false;
let documentExportBusy = false;
const bridgeKey = randomBytes(32).toString('hex');
const updateKey = randomBytes(32).toString('hex');
const dataDir = app.getPath('userData');
const resources = app.isPackaged ? process.resourcesPath : join(__dirname, process.platform === 'linux' ? 'resources-linux' : 'resources');
const uiRoot = app.isPackaged ? join(resources, 'ui') : join(__dirname, '../../frontend/ilbi/dist');
const vaultPath = join(dataDir, 'device.vault');
const applicationIcon = app.isPackaged ? join(resources, process.platform === 'linux' ? 'ilbi-desktop.png' : 'ilbi-desktop-rounded.ico')
  : process.platform === 'linux' ? join(__dirname, '../../frontend/ilbi/public/brand/ilbi-desktop-512.png') : join(__dirname, 'icon.ico');

async function openGuide(event) {
  if (event) validSender(event);
  if (guideWindow && !guideWindow.isDestroyed()) {
    if (!guideWindow.webContents.getURL().startsWith(origin + '/desktop-guide')) await guideWindow.loadURL(origin + '/desktop-guide?desktop-window=1');
    guideWindow.restore(); guideWindow.focus(); return true;
  }
  guideWindow = new BrowserWindow({ parent: window, title: 'ILBI — Ilovani sozlash', icon: applicationIcon,
    width: 1140, height: 880, minWidth: 760, minHeight: 600,
    webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  guideWindow.setMenu(null);
  guideWindow.webContents.on('will-navigate', (navigation, url) => { if (!url.startsWith(origin + '/')) navigation.preventDefault(); });
  guideWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  guideWindow.on('closed', () => { guideWindow = null; });
  await guideWindow.loadURL(origin + '/desktop-guide?desktop-window=1');
  return true;
}

async function saveVault(nextConfiguration = configuration, nextSecrets = secrets) {
  if (!safeStorage.isEncryptionAvailable() || (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')) throw Error(process.platform === 'linux'
    ? 'Parollar omboriga ulanib bo‘lmadi. GNOME Keyring yoki KWallet qulfini oching va ILBI’ni qayta ishga tushiring. Batafsil qadamlar rasmli qo‘llanmada.'
    : 'Tizimning maxfiy ma’lumotlar ombori ishlamayapti.');
  const value = safeStorage.encryptString(JSON.stringify({ configuration: nextConfiguration, secrets: nextSecrets }));
  await mkdir(dataDir, { recursive: true });
  await writeFile(vaultPath + '.new', value, { mode: 0o600 });
  await require('node:fs/promises').rename(vaultPath + '.new', vaultPath);
}
async function stopRuntime() {
  lanServer?.close(); lanServer = null;
  const host = localHost; localHost = null;
  await host?.stop();
}
async function workerUpdate(action) {
  if (!localHost) return;
  const response = await fetch(`http://127.0.0.1:${localHost.port}/desktop/update/${action}/`, { method: 'POST',
    headers: { 'X-ILBI-Desktop-Key': bridgeKey, 'X-ILBI-Update-Key': updateKey }, signal: AbortSignal.timeout(75000) });
  if (!response.ok) throw Error('Davom etayotgan sinxronlash hali tugamadi. Birozdan keyin qayta urinib ko‘ring.');
}
async function resumeUpdate() { maintenance = false; await workerUpdate('resume').catch(() => {}); }
async function prepareUpdate() {
  if (setupBusy || documentExportBusy) throw Error('Avval davom etayotgan sozlash yoki hujjat tayyorlash tugashini kuting.');
  maintenance = true;
  try {
    const deadline = Date.now() + 70000;
    while (activeRequests && Date.now() < deadline) await new Promise(ok => setTimeout(ok, 100));
    if (activeRequests) throw Error('Davom etayotgan ish hali tugamadi. Birozdan keyin qayta yangilang.');
    await workerUpdate('prepare');
  } catch (error) { await resumeUpdate(); throw error; }
}
async function showUpdates(event) {
  if (event) validSender(event);
  if (updateWindow && !updateWindow.isDestroyed()) { updateWindow.restore(); updateWindow.focus(); return; }
  updateWindow = new BrowserWindow({ parent: window, title: 'ILBI yangilanishi', icon: applicationIcon, width: 560, height: 440, resizable: false,
    webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  updateWindow.setMenu(null);
  updateWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  updateWindow.webContents.on('will-navigate', navigation => navigation.preventDefault());
  updateWindow.on('closed', () => { updateWindow = null; });
  await updateWindow.loadURL(origin + '/native-update');
}
async function notifyUpdate() {
  if (window?.isFocused()) return;
  // libnotify can block while activating a missing/broken notification daemon.
  // Keep the in-app notice available on minimal Linux desktops without one.
  if (process.platform === 'linux') {
    try {
      const result = await promisify(execFile)('dbus-send', ['--session', '--print-reply=literal', '--reply-timeout=1000',
        '--dest=org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus.NameHasOwner', 'string:org.freedesktop.Notifications'], { timeout: 2000 });
      if (!/boolean\s+true/.test(result.stdout)) return;
    } catch { return; }
  }
  if (!Notification.isSupported()) return;
  const notice = new Notification({ title: 'ILBI yangilanishi', body: 'Ochiq shakllarni saqlang. Yuklab olish va yangilash uchun bosing.', icon: applicationIcon });
  notice.on('click', () => {
    window?.restore(); window?.focus();
    void showUpdates().then(() => updater.update()).catch(error => updater.set({ phase: 'error', message: error.message }));
  }); notice.show();
}
async function applyUpdate(archive, release) {
  if (!app.isPackaged) throw Error('Yangilash rasmiy o‘rnatilgan ILBI ilovasida ishlaydi.');
  await prepareUpdate();
  try {
    if (process.platform === 'win32') {
      if ((await readFile(join(dirname(process.execPath), 'ilbi-installation.id'), 'utf8')).trim() !== 'uz.ilbi.desktop') throw Error('Avval rasmiy ILBI o‘rnatuvchisidan foydalaning.');
      const child = spawn(archive, ['/ILBIUPDATE'], { detached: true, stdio: 'ignore',
        env: { ...process.env, ILBI_UPDATE_INSTALL_DIRECTORY: dirname(process.execPath) } });
      await new Promise((ok, fail) => { child.once('spawn', ok); child.once('error', fail); });
      child.once('exit', () => { if (!quitting && !closing) void resumeUpdate().then(() => updater.set({ phase: 'error', message: 'O‘rnatish tugallanmadi. Yana urinib ko‘rishingiz mumkin.' })); });
      child.unref();
    } else if (process.platform === 'linux') {
      const dataHome = process.env.XDG_DATA_HOME || join(app.getPath('home'), '.local/share');
      const binDirectory = process.env.ILBI_INSTALL_BIN_DIR || join(app.getPath('home'), '.local/bin');
      const jobPath = join(dataDir, 'updates', 'install-job.json');
      const job = { archive, sourceCommit: release.sourceCommit, sha256: release.sha256, bytes: release.bytes,
        parentPid: process.pid, dataHome, binDirectory, launcher: join(binDirectory, 'ilbi'), python: join(resources, 'backend/python/bin/python3') };
      await writeFile(jobPath, JSON.stringify(job), { mode: 0o600 });
      await require('node:fs/promises').rm(jobPath + '.ready', { force: true });
      const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE;
      const child = spawn(process.execPath, [`--ilbi-update-helper=${jobPath}`], { detached: true, stdio: 'ignore', env: environment });
      await new Promise((ok, fail) => { child.once('spawn', ok); child.once('error', fail); }); child.unref();
      let ready = false;
      for (let i = 0; i < 150; i++) {
        try { await readFile(jobPath + '.ready'); ready = true; break; } catch {}
        await new Promise(ok => setTimeout(ok, 100));
      }
      if (!ready) throw Error('Yangilash oynasini ochib bo‘lmadi. Qayta urinib ko‘ring.');
      setTimeout(() => app.quit(), 250);
    } else throw Error('Bu tizim uchun yangilanish hali mavjud emas.');
  } catch (error) { await resumeUpdate(); throw error; }
}
function validSender(event, setupOnly = false) {
  const url = new URL(event.senderFrame.url);
  if (url.origin !== origin || (setupOnly && url.pathname !== '/setup')) throw Error('So‘rov manbasi tasdiqlanmadi.');
}
function proxy(request, response, target, secure = false) {
  if (maintenance) { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ detail: 'ILBI yangilanmoqda. Biroz kuting.' })); return; }
  activeRequests++;
  let finished = false;
  const finish = () => { if (!finished) { finished = true; activeRequests--; } };
  const headers = { ...request.headers, host: secure ? target.host : '127.0.0.1', 'x-ilbi-desktop-key': secure ? configuration.pairing.key : bridgeKey };
  delete headers['x-ilbi-update-key'];
  delete headers.connection;
  const upstream = (secure ? httpsRequest : httpRequest)({ ...target, path: request.url, method: request.method, headers,
    timeout: 65000, ...(secure ? { ca: configuration.pairing.certificate, checkServerIdentity: () => undefined, rejectUnauthorized: true } : {}) }, remote => {
    response.writeHead(remote.statusCode, remote.headers); remote.pipe(response); remote.once('end', finish); remote.once('error', finish); remote.once('close', finish);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => { finish(); if (!response.headersSent) response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ detail: 'Asosiy kassa kompyuteriga ulanish yo‘q. Mahalliy tarmoq va asosiy kompyuterni tekshiring.' })); });
  request.pipe(upstream);
}
async function launchRuntime() {
  // Recheck persisted settings before starting any service or forwarding credentials.
  if (configuration.mode === 'client') configuration.pairing = validatePairing(configuration.pairing);
  else if (configuration.mode !== 'host') throw Error('Qurilma sozlamalari noto‘g‘ri. Yordam xizmatiga murojaat qiling.');
  if (configuration.mode === 'host') {
    configuration.server = validateServer(configuration.server);
    localHost = await startHost({ resources, dataDir, secrets, bridgeKey, updateKey, server: configuration.server,
      executable: join(resources, process.platform === 'win32' ? 'backend/python/python.exe' : 'backend/python/bin/python3'),
      runtimeArguments: [join(resources, 'backend/runtime.py')] });
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
  event.preventDefault(); if (closing) return; closing = true;
  Promise.resolve().then(async () => { if (!maintenance) await prepareUpdate(); updater?.stop(); webServer?.close(); await stopRuntime(); quitting = true; app.quit(); })
    .catch(async error => { closing = false; await resumeUpdate(); dialog.showErrorBox('ILBI yopilishi', error.message); });
});
if (!app.requestSingleInstanceLock() || process.argv.includes('--ilbi-quit-for-update')) app.quit();
else {
  app.on('second-instance', (_event, arguments_) => { if (arguments_.includes('--ilbi-quit-for-update')) app.quit(); else { window?.restore(); window?.focus(); } });
  app.whenReady().then(async () => {
    try {
      try { ({ configuration, secrets } = JSON.parse(safeStorage.decryptString(await readFile(vaultPath)))); }
      catch (error) { if (error.code !== 'ENOENT') throw Error('Qurilma sozlamalarini ochib bo‘lmadi. device.vault faylini o‘chirmang; tizim hisobingiz va maxfiy ma’lumotlar omborini tekshiring.'); }
      if (configuration) await launchRuntime();
      let current;
      try { current = require('./build-info.json'); } catch { current = { version: app.getVersion(), sourceCommit: null, buildTimestamp: 0 }; }
      updater = new DesktopUpdater({ current, cache: join(dataDir, 'updates'), fetcher: (...args) => net.fetch(...args), install: applyUpdate });
      module.exports.updater = updater;
      updater.on('status', status => { for (const target of [window, guideWindow, updateWindow]) if (target && !target.isDestroyed()) target.webContents.send('ilbi:update-status', status); });
      updater.on('available', () => { void notifyUpdate().catch(() => {}); });
      webServer = httpServer(async (req, res) => {
        try {
          if (req.headers.origin && req.headers.origin !== origin) { res.writeHead(403); res.end(); return; }
          const url = new URL(req.url, 'http://localhost');
          if (url.pathname === '/desktop/app-update/' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(updater.status())); return; }
          if (url.pathname === '/desktop/releases/') { await serveReleases(req, res, (...args) => net.fetch(...args)); return; }
          if (/^\/(api\/|desktop\/|media\/)/.test(url.pathname)) {
            if (!configuration || (configuration.mode === 'host' && !localHost)) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Avval ILBI sozlash oynasidagi Ishni boshlash tugmasini bosing.', code: 'setup_required' })); return;
            }
            return configuration.mode === 'host' ? proxy(req, res, { host: '127.0.0.1', port: localHost.port })
              : proxy(req, res, { host: configuration.pairing.host, port: configuration.pairing.port }, true);
          }
          const native = { '/setup': 'setup.html', '/setup.css': 'setup.css', '/setup.js': 'setup.js', '/native-update': 'update.html', '/update.css': 'update.css', '/update-window.js': 'update-window.js' };
          const setup = Boolean(native[url.pathname]);
          let path = setup ? join(__dirname, native[url.pathname]) : safePath(uiRoot, url.pathname);
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
      ipcMain.handle('ilbi:setup', async event => {
        validSender(event, true);
        if (setupBusy) throw Error('Kassa tayyorlanmoqda. Biroz kuting.');
        if (configuration && (configuration.mode !== 'host' || localHost)) throw Error('Qurilma allaqachon sozlangan.');
        setupBusy = true;
        try {
          if (!configuration) {
            const nextConfiguration = { mode: 'host', server: OFFICIAL_SERVER, lanPort: 49243 };
            const nextSecrets = { djangoSecret: randomBytes(48).toString('hex'), databasePassword: randomBytes(32).toString('hex'),
              vaultKey: randomBytes(32).toString('base64url') + '=', pairingKey: randomBytes(32).toString('hex') };
            // Commit in-memory state only after encrypted persistence succeeds.
            await saveVault(nextConfiguration, nextSecrets);
            configuration = nextConfiguration; secrets = nextSecrets;
          }
          try { await launchRuntime(); }
          catch (error) { await stopRuntime().catch(() => {}); throw error; }
          await window.loadURL(origin + '/login');
        } finally { setupBusy = false; }
      });
      ipcMain.handle('ilbi:join', async event => {
        validSender(event, true);
        if (setupBusy) throw Error('Kassa tayyorlanmoqda. Biroz kuting.');
        if (configuration) throw Error('Qurilma allaqachon sozlangan.');
        setupBusy = true;
        try {
          const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'ILBI pairing', extensions: ['ilbi'] }] });
          if (result.canceled) return false;
          const nextConfiguration = { mode: 'client', pairing: validatePairing(JSON.parse(await readFile(result.filePaths[0], 'utf8'))) };
          await saveVault(nextConfiguration);
          configuration = nextConfiguration;
          await window.loadURL(origin + '/login');
          return true;
        } finally { setupBusy = false; }
      });
      ipcMain.handle('ilbi:pairing', exportPairing);
      ipcMain.handle('ilbi:guide', openGuide);
      ipcMain.handle('ilbi:downloads', event => { validSender(event); return shell.openExternal(OFFICIAL_SERVER + '/download'); });
      ipcMain.handle('ilbi:update-status', event => { validSender(event); return updater.status(); });
      ipcMain.handle('ilbi:update-check', event => { validSender(event); return updater.check(); });
      ipcMain.handle('ilbi:update-window', showUpdates);
      ipcMain.handle('ilbi:update-run', async event => { validSender(event); await showUpdates(); return updater.update(); });
      const validDocumentSender = event => {
        validSender(event);
        if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw Error('So‘rov manbasi tasdiqlanmadi.');
      };
      ipcMain.handle('ilbi:receipt-share-links', (event, tokens) => {
        validDocumentSender(event);
        return receiptShareLinks(tokens, (...args) => net.fetch(...args));
      });
      ipcMain.handle('ilbi:document-pdf', async (event, document) => {
        validDocumentSender(event);
        if (documentExportBusy) throw Error('Boshqa PDF tayyorlanmoqda. Biroz kuting.');
        documentExportBusy = true;
        try { return await saveDocumentPDF({ document, parent: window, BrowserWindow, dialog }); }
        finally { documentExportBusy = false; }
      });
      session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission === 'media' && contents.getURL().startsWith(origin + '/')));
      app.setAppUserModelId('uz.ilbi.desktop');
      window = new BrowserWindow({ title: 'ILBI', icon: applicationIcon, width: 1440, height: 960, minWidth: 900, minHeight: 650,
        webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
      window.on('close', event => { if (!quitting) { event.preventDefault(); app.quit(); } else { guideWindow?.close(); updateWindow?.close(); } });
      window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(origin + '/')) event.preventDefault(); });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (url === 'about:blank' || url === '') return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } } };
        if (url.startsWith('https://')) void shell.openExternal(url);
        return { action: 'deny' };
      });
      Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'ILBI', submenu: [
        { label: 'Ilovani sozlash (rasmli qo‘llanma)', click: () => openGuide().catch(error => dialog.showErrorBox('ILBI', error.message)) },
        { label: 'Boshqa kassani ulash', click: () => exportPairing({ senderFrame: { url: origin + '/' } }).catch(error => dialog.showErrorBox('ILBI', error.message)) },
        { label: 'Ulanish faylini yangilash', enabled: configuration?.mode === 'client', click: async () => {
          try {
            const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'ILBI pairing', extensions: ['ilbi'] }] });
            if (result.canceled) return;
            configuration = { mode: 'client', pairing: validatePairing(JSON.parse(await readFile(result.filePaths[0], 'utf8'))) };
            await saveVault(); await window.loadURL(origin + '/login');
          } catch (error) { dialog.showErrorBox('ILBI', error.message); }
        } },
        { label: 'Yangilanishni tekshirish', click: () => { void showUpdates(); void updater.check(); } },
        { label: 'Dastur haqida', click: () => dialog.showMessageBox(window, { message: `ILBI ${app.getVersion()}`, detail: 'Yangilanish xabaridan yoki ILBI menyusidan ilovani yangilang. Mahalliy baza va yuborilmagan ishlar saqlanadi.' }) },
        { type: 'separator' }, { role: 'quit', label: 'Chiqish' },
      ] }, { label: 'Ko‘rinish', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' }] }]));
      await window.loadURL(origin + (configuration ? '/login' : '/setup'));
      if (process.argv.includes('--ilbi-updated')) updater.set({ phase: 'updated', message: 'ILBI muvaffaqiyatli yangilandi.' });
      if (process.argv.includes('--ilbi-update-failed')) updater.set({ phase: 'error', message: 'Yangilanish o‘rnatilmadi. Avvalgi ILBI qayta ochildi.' });
      updater.start();
    } catch (error) { if (!closing && !quitting) dialog.showErrorBox('ILBI ishga tushmadi', error.message); app.quit(); }
  });
}
