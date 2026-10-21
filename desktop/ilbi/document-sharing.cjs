const { writeFile } = require('node:fs/promises');
const { randomBytes } = require('node:crypto');
const { OFFICIAL_SERVER } = require('./runtime.cjs');

function validateDocument(document) {
  if (!document || typeof document.html !== 'string' || !/<head(?:\s[^>]*)?>/i.test(document.html) || Buffer.byteLength(document.html) > 5 * 1024 * 1024 ||
    !['invoice', 'receipt'].includes(document.format) || typeof document.title !== 'string' || document.title.length > 180 ||
    !Number.isFinite(document.heightMm) || document.heightMm < 30 || document.heightMm > 10000 ||
    ![58, 80, 210].includes(document.widthMm) || (document.format === 'invoice' ? document.widthMm !== 210 : document.widthMm === 210)) {
    throw Error('PDF uchun hujjat ma’lumotlari noto‘g‘ri. Hujjatni qayta ochib ko‘ring.');
  }
  return document;
}

async function receiptShareLinks(tokens, fetcher = fetch) {
  if (!Array.isArray(tokens) || tokens.length > 10 || tokens.some(token => typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(token))) throw Error('Chek havolasi noto‘g‘ri.');
  const results = await Promise.all([...new Set(tokens)].map(async token => {
    const response = await fetcher(`${OFFICIAL_SERVER}/api/v1/sales/public/receipt/${encodeURIComponent(token)}/`, {
      method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    await response.body?.cancel();
    if (response.status === 404) return null;
    if (!response.ok) throw Error('Chek havolasini tekshirib bo‘lmadi.');
    return `${OFFICIAL_SERVER}/r/${encodeURIComponent(token)}`;
  }));
  return { links: results.filter(Boolean), pending: results.some(value => !value) };
}

async function saveDocumentPDF({ document, parent, BrowserWindow, dialog, write = writeFile }) {
  validateDocument(document);
  const basename = String(document.filename || 'ILBI-hujjat.pdf').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 160);
  const filename = basename.toLowerCase().endsWith('.pdf') ? basename : basename + '.pdf';
  const selected = await dialog.showSaveDialog(parent, { title: 'Ulashish uchun PDF saqlash', defaultPath: filename, filters: [{ name: 'PDF hujjat', extensions: ['pdf'] }] });
  if (selected.canceled || !selected.filePath) return { canceled: true };
  let viewer;
  try {
    viewer = new BrowserWindow({ show: false, width: Math.ceil(document.widthMm * 96 / 25.4), height: 1000,
      webPreferences: { partition: `ilbi-document-${randomBytes(12).toString('hex')}`, javascript: false, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: false } });
    viewer.setMenu(null);
    viewer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    viewer.webContents.on('will-navigate', event => event.preventDefault());
    viewer.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    viewer.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('data:') }));
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">`;
    const markup = document.html.replace(/<head(?:\s[^>]*)?>/i, match => match + policy);
    await viewer.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(markup));
    const data = await viewer.webContents.printToPDF({ printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true,
      pageSize: document.format === 'invoice' ? 'A4' : { width: document.widthMm / 25.4, height: document.heightMm / 25.4 },
      margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    await write(selected.filePath, data, { mode: 0o600 });
    return { canceled: false };
  } finally {
    if (viewer && !viewer.isDestroyed()) viewer.destroy();
  }
}

module.exports = { validateDocument, receiptShareLinks, saveDocumentPDF };
