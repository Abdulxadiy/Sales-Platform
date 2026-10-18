import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser/chrome.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), cacheDir: 'node_modules/.vite-currency-qa', optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom', 'lucide-react'] }, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await launchBrowser({ width: 1100, height: 1000 });
  await browser.call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/tests/browser/currencySettings.html` });
  const wait = async expression => {
    for (let i = 0; i < 150; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timeout: ' + expression);
  };
  const toggle = 'input[aria-label="CBU kursidan avtomatik foydalanish"]';
  const manual = 'input[aria-label="Qo‘lda kiritilgan dollar kursi"]';
  const save = () => browser.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Kurs sozlamalarini saqlash')).click()`);
  const numericInput = () => browser.evaluate(String.raw`document.querySelector(${JSON.stringify(manual)}).value.replace(/\s/g,'')`);
  const calculatorUzs = () => browser.evaluate(`document.querySelector('input[aria-label="Kalkulyator UZS"]').value.replaceAll(/[^0-9]/g,'')`);
  await wait(`Boolean(document.querySelector(${JSON.stringify(toggle)}))`);
  assert.equal(await numericInput(), '12800.00');
  assert.equal(await calculatorUzs(), '1280000');
  assert.equal(await browser.evaluate(`document.querySelector(${JSON.stringify(manual)}).disabled`), false);
  assert.match(await browser.evaluate('document.body.innerText'), /1 EUR/);
  assert.match(await browser.evaluate('document.body.innerText'), /1 RUB/);
  await browser.evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  await wait(`!document.querySelector(${JSON.stringify(manual)})`);
  assert.equal(await browser.evaluate(`document.body.innerText.includes('Qo‘lda kiritilgan dollar kursi')`), false);
  assert.equal(await browser.evaluate(`[...document.querySelectorAll('button')].some(button=>['12750','12800','12850','12900','12950'].includes(button.textContent.replaceAll(/[^0-9]/g,'')))`), false, 'Automatic mode must hide manual rate presets');
  assert.equal(await calculatorUzs(), '1250025');
  await save();
  await wait('currencyQA.stores[7].auto_usd_rate===true');
  const enabled = await browser.evaluate('currencyQA.requests.find(r=>r.method==="PATCH").body');
  assert.equal(enabled.auto_usd_rate, true);
  assert.equal('usd_rate' in enabled, false);
  assert.equal(await browser.evaluate(`Boolean(document.querySelector(${JSON.stringify(manual)}))`), false);
  assert.equal(await browser.evaluate('currencyQA.stores[7].manual_usd_rate'), '12800.00');
  // A new CBU publication refreshes an open calculator without a page reload.
  await browser.evaluate(`currencyQA.rates.USD.rate='12600.75';window.dispatchEvent(new Event('focus'))`);
  await wait(String.raw`document.body.innerText.replace(/\s/g,'').includes('12,600.75')||document.body.innerText.replace(/\s/g,'').includes('12600,75')||document.body.innerText.replace(/\s/g,'').includes('12600.75')`);
  assert.equal(await calculatorUzs(), '1260075');
  await browser.evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  await wait(`Boolean(document.querySelector(${JSON.stringify(manual)}))&&!document.querySelector(${JSON.stringify(manual)}).disabled`);
  assert.equal(await numericInput(), '12800.00');
  await save();
  await wait('currencyQA.requests.filter(r=>r.method==="PATCH").length===2');
  const disabled = await browser.evaluate('currencyQA.requests.filter(r=>r.method==="PATCH")[1].body');
  assert.equal(disabled.auto_usd_rate, false);
  assert.equal(disabled.usd_rate, '12800.00');
  assert.equal(await calculatorUzs(), '1280000');
  await browser.evaluate(`(()=>{const input=document.querySelector('input[aria-label="Kalkulyator UZS"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1000');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await wait(`document.querySelector('input[aria-label="Kalkulyator USD"]').value==='0.08'`);
  assert.equal(await calculatorUzs(), '1000', 'Editing UZS must preserve the entered amount despite rounding the USD preview');
  // An in-flight old-shop reply must not overwrite the next shop's settings.
  await browser.evaluate(`currencyQA.holdNext=true;window.dispatchEvent(new Event('focus'))`);
  await wait('currencyQA.pending.length===1');
  await browser.evaluate('currencyQA.select(8)');
  await wait(String.raw`Boolean(document.querySelector(${JSON.stringify(manual)}))&&document.querySelector(${JSON.stringify(manual)}).value.replace(/\s/g,'')==='14000.00'`);
  await browser.evaluate('currencyQA.pending.shift()()');
  await delay(100);
  assert.equal(await numericInput(), '14000.00');
  // No official rate yet: manual mode remains usable and automatic mode is disabled.
  await browser.evaluate(`currencyQA.empty=true;currencyQA.select(7)`);
  await wait(`Boolean(document.querySelector(${JSON.stringify(toggle)}))&&document.querySelector(${JSON.stringify(toggle)}).disabled`);
  assert.equal(await browser.evaluate(`document.querySelector(${JSON.stringify(manual)}).disabled`), false);
  await browser.resize(390, 900);
  await delay(100);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, 'Currency settings fit mobile viewport');
  // A store whose automatic mode was already saved also starts with no manual input.
  await browser.call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/tests/browser/currencySettings.html?auto=1` });
  await wait(`Boolean(document.querySelector(${JSON.stringify(toggle)}))&&document.querySelector(${JSON.stringify(toggle)}).checked`);
  assert.equal(await browser.evaluate(`Boolean(document.querySelector(${JSON.stringify(manual)}))`), false);
  assert.equal(await calculatorUzs(), '1250025');
  await browser.evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  await wait(`Boolean(document.querySelector(${JSON.stringify(manual)}))`);
  assert.equal(await numericInput(), '12800.00');
  assert.equal(await browser.evaluate(`document.querySelector(${JSON.stringify(manual)}).disabled`), false);
  assert.deepEqual(browser.errors, []);
  console.log('PASS currency settings: manual input/presets hidden in automatic mode, restored manual backup, persisted automatic mode, live CBU refresh, tenant switch isolation and mobile layout.');
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
