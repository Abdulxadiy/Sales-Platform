import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser/chrome.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await launchBrowser({ width: 1100, height: 1100 });
  await browser.call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/tests/browser/receiptSettings.html` });
  const wait = async expression => {
    for (let i = 0; i < 150; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timeout: ' + expression);
  };
  await wait('Boolean(window.taxQA && document.querySelector("#receipt-settings-preview"))');
  const text = () => browser.evaluate('document.querySelector("#receipt-settings-preview").innerText.replace(/\u00a0|\u202f/g," ")');
  assert.match(await text(), /STIR.*123456789/);
  assert.match(await text(), /JAMI:\s*100[\s,]?000 UZS/);
  assert.match(await text(), /Test sarlavha/);
  assert.match(await text(), /Test yakun/);
  // Change the real price-mode selector and confirm the printable preview updates.
  await browser.evaluate(`(()=>{const select=[...document.querySelectorAll('select')].find(e=>e.value==='included');select.value='excluded';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait('taxQA.value.price_includes_vat===false');
  assert.match(await text(), /JAMI:\s*112[\s,]?000 UZS/);
  assert.match(await text(), /Qo‘shilgan QQS 12%:\s*12[\s,]?000 UZS/);
  await browser.evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Kassir nomini'));label.querySelector('input').click();})()`);
  await wait('taxQA.value.receipt_show_cashier===false');
  assert.doesNotMatch(await text(), /Kassir:/);
  await browser.evaluate(`(()=>{const select=[...document.querySelectorAll('select')].find(e=>e.value==='58mm');select.value='80mm';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait('document.querySelector("#receipt-settings-preview").dataset.paperWidth==="80mm"');
  await browser.evaluate(`(()=>{const select=document.querySelector('select');select.value='turnover';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait('taxQA.value.tax_regime==="turnover"&&!taxQA.value.is_vat_payer');
  assert.match(await text(), /QQSsiz/);
  assert.match(await text(), /JAMI:\s*100[\s,]?000 UZS/);
  await browser.evaluate(`taxQA.set(p=>({...p,tax_regime:'general',profit_tax_enabled:true,profit_tax_rate:'15'}))`);
  await wait('taxQA.value.profit_tax_enabled');
  assert.match(await text(), /JAMI:\s*100[\s,]?000 UZS/);
  await browser.evaluate(`document.querySelector('button').click()`);
  assert.equal(await browser.evaluate('taxQA.saved'), 1);
  assert.equal(await browser.evaluate('taxQA.lastSaved.profit_tax_rate'), '15');
  await browser.resize(390, 900);
  await delay(80);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile page must fit viewport');
  assert.deepEqual(browser.errors, []);
  console.log('PASS receipt settings: VAT modes, seller identity, cashier visibility, paper width, AOS/profit handling, save and mobile layout.');
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
