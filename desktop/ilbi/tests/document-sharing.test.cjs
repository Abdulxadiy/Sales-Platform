const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDocument, receiptShareLinks, saveDocumentPDF } = require('../document-sharing.cjs');
const { OFFICIAL_SERVER } = require('../runtime.cjs');
const sample = () => ({ html: '<!doctype html><html><head></head><body>Chek 1043</body></html>', title: 'Chek 1043', filename: 'Chek 1043.pdf', format: 'receipt', widthMm: 58, heightMm: 150 });

test('public links are exposed only after the receipt exists in the cloud', async () => {
  const tokens = ['A'.repeat(43), 'B'.repeat(43)];
  const calls = [];
  const result = await receiptShareLinks(tokens, async (url, options) => {
    calls.push({ url, options });
    return new Response('{}', { status: url.includes(tokens[0]) ? 200 : 404 });
  });
  assert.deepEqual(result, { links: [`${OFFICIAL_SERVER}/r/${tokens[0]}`], pending: true });
  for (const { url, options } of calls) {
    assert(url.startsWith(OFFICIAL_SERVER + '/api/v1/sales/public/receipt/'));
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    assert(options.signal instanceof AbortSignal);
  }
  await assert.rejects(receiptShareLinks(['../wrong'], () => assert.fail('invalid token must not reach network')));
  await assert.rejects(receiptShareLinks(tokens, async () => { throw Error('offline'); }));
});
test('invalid export requests and canceled save dialogs do not create windows or write files', async () => {
  for (const change of [{ html: '<script>bad</script>' }, { format: 'other' }, { widthMm: 1 }, { heightMm: Infinity }, { html: '<head>' + 'x'.repeat(5 * 1024 * 1024) }]) {
    assert.throws(() => validateDocument({ ...sample(), ...change }));
  }
  const result = await saveDocumentPDF({ document: sample(), parent: {}, dialog: { async showSaveDialog() { return { canceled: true }; } }, BrowserWindow: class { constructor() { assert.fail('no export after cancellation'); } }, write: () => assert.fail('no write after cancellation') });
  assert.deepEqual(result, { canceled: true });
});
test('PDF rendering is isolated, uses receipt dimensions and cleans up after write failure', async () => {
  let options, requestFilter, loaded, printed, destroyed = false;
  class Viewer {
    constructor(value) {
      options = value;
      this.webContents = { setWindowOpenHandler(handler) { assert.equal(handler().action, 'deny'); }, on() {},
        session: { setPermissionRequestHandler(handler) { handler(null, 'camera', allowed => assert.equal(allowed, false)); }, webRequest: { onBeforeRequest(handler) { requestFilter = handler; } } },
        async printToPDF(value) { printed = value; return Buffer.from('%PDF-demo'); } };
    }
    setMenu() {} async loadURL(value) { loaded = value; } isDestroyed() { return false; } destroy() { destroyed = true; }
  }
  await assert.rejects(saveDocumentPDF({ document: sample(), parent: {}, BrowserWindow: Viewer,
    dialog: { async showSaveDialog() { return { canceled: false, filePath: '/chosen/receipt.pdf' }; } },
    async write(path) { assert.equal(path, '/chosen/receipt.pdf'); throw Error('disk full'); } }), /disk full/);
  assert.equal(destroyed, true); assert.equal(options.webPreferences.javascript, false); assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.nodeIntegration, false); assert.equal(options.webPreferences.contextIsolation, true);
  requestFilter({ url: 'file:///private' }, result => assert.equal(result.cancel, true));
  requestFilter({ url: 'https://example.org/tracker' }, result => assert.equal(result.cancel, true));
  requestFilter({ url: 'data:image/png;base64,AA==' }, result => assert.equal(result.cancel, false));
  assert(decodeURIComponent(loaded).includes('Content-Security-Policy'));
  assert.equal(printed.preferCSSPageSize, true); assert.equal(printed.printBackground, true);
  assert.equal(printed.pageSize.width, 58 / 25.4); assert.equal(printed.pageSize.height, 150 / 25.4);
});
