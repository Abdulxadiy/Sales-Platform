import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await launchBrowser({ width: 1100, height: 1000 });
  const base = `http://127.0.0.1:${server.httpServer.address().port}/tests/browser/catalogFiscal.html`;
  async function wait(expression) {
    for (let i = 0; i < 200; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timeout: ' + expression + '\n' + browser.errors.join('\n'));
  }
  async function fill(id, value) {
    await browser.evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  async function addImage() {
    await browser.evaluate(`(()=>{const input=document.querySelector('dialog[open] input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File(['synthetic image'], 'test-only.png', {type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  }
  for (const multipart of [false, true]) {
    await browser.call('Page.navigate', { url: base + (multipart ? '?multipart' : '') });
    await wait('Boolean(document.querySelector("dialog[open] #create-product-mxik"))');
    assert.equal(await browser.evaluate('document.querySelector("#create-product-mxik").value'), '');
    await fill('create-product-mxik', '123');
    assert.equal(await browser.evaluate('document.querySelector("#create-product-mxik").checkValidity()'), false);
    await fill('create-product-mxik', '03816001001000000');
    await fill('create-product-package-code', '0001234');
    if (multipart) await addImage();
    await browser.evaluate('document.querySelector("dialog[open] form").requestSubmit()');
    await wait('fiscalQA.requests.length===1&&!document.querySelector("dialog[open]")');
    const created = await browser.evaluate('fiscalQA.requests[0]');
    assert.equal(created.multipart, multipart);
    assert.equal(created.payload.mxik, '03816001001000000');
    assert.equal(created.payload.package_code, '0001234');
    assert.equal(created.payload.name, 'Sinov mahsuloti');

    await wait('Boolean(document.querySelector("button[title*=to‘liq]"))');
    await browser.evaluate('document.querySelector("button[title*=to‘liq]").click()');
    await wait('Boolean(document.querySelector("dialog[open] #edit-product-mxik"))');
    assert.equal(await browser.evaluate('document.querySelector("#edit-product-mxik").value'), '03816001001000000');
    assert.equal(await browser.evaluate('document.querySelector("#edit-product-package-code").value'), '0001234');
    await fill('edit-product-mxik', '');
    await fill('edit-product-package-code', '');
    if (multipart) await addImage();
    await browser.resize(390, 900);
    assert.equal(await browser.evaluate(`(()=>{const fieldset=document.querySelector('dialog[open] fieldset');return fieldset.scrollWidth<=fieldset.clientWidth+1;})()`), true);
    await browser.evaluate('document.querySelector("dialog[open] form").requestSubmit()');
    await wait('fiscalQA.requests.length===2&&!document.querySelector("dialog[open]")');
    const updated = await browser.evaluate('fiscalQA.requests[1]');
    assert.equal(updated.multipart, multipart);
    assert.equal(updated.payload.mxik, multipart ? '' : null);
    assert.equal(updated.payload.package_code, multipart ? '' : null);
    await browser.resize(1100, 1000);
  }
  console.log('PASS real catalog create/edit forms: JSON/multipart, leading zeroes, explicit clearing, old drafts, validation and mobile fields.');

  for (const legacy of [false, true]) {
    await browser.call('Page.navigate', { url: base + '?receipts' + (legacy ? '&legacy' : '') });
    await wait('Boolean(document.querySelector("#public-receipt")?.innerText.includes("Sement"))');
    for (const selector of ['#receipt-58mm', '#receipt-80mm', '#public-receipt']) {
      const text = await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).innerText`);
      assert.match(text, /Sement/);
      if (legacy) {
        assert.doesNotMatch(text, /MXIK:|Qadoq:/);
      } else {
        assert.match(text, /MXIK: 03816001001000000/);
        assert.match(text, /Qadoq: 0001234/);
      }
      assert.match(text, /fiskal chek emas/);
    }
  }
  assert.deepEqual(browser.errors, []);
  console.log('PASS thermal 58/80mm and public receipts: saved codes displayed; legacy rows omit unknown codes; non-fiscal labels remain.');
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
