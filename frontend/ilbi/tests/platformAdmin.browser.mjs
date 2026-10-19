import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { launchBrowser } from './browser/chrome.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  browser = await launchBrowser({ width: 1440, height: 1000 });
  async function wait(expression) {
    for (let i = 0; i < 150; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timeout: ' + expression);
  }
  const click = text => browser.evaluate(`(()=>{const button=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Button missing');button.click();})()`);
  async function fill(selector, value) {
    await browser.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  async function screenshot(path) {
    await delay(350);
    const result = await browser.call('Page.captureScreenshot', { format: 'png' });
    await writeFile(path, Buffer.from(result.data, 'base64'));
  }
  await browser.call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/tests/browser/platformAdmin.html` });
  await wait('document.body.innerText.includes("Platforma boshqaruvi")&&document.body.innerText.includes("32")');
  assert.equal(await browser.evaluate(`Boolean(document.querySelector('.sidebar a[href="/accounts"]'))`), true);
  assert.equal(await browser.evaluate(`Boolean(document.querySelector('.sidebar a[href="/pos"]'))`), false);
  await screenshot('/tmp/ilbi-admin-dashboard-light.png');
  await browser.evaluate(`document.querySelector('.sidebar a[href="/accounts"]').click()`);
  await wait('document.body.innerText.includes("Ali Sinov")');
  await screenshot('/tmp/ilbi-admin-accounts-light.png');
  await browser.evaluate(`document.querySelector('button[aria-label="Ali Sinov: login va Telegram"]').click()`);
  await wait('Boolean(document.querySelector("dialog[open] input[type=password]"))');
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] form").checkValidity()'), false);
  await browser.resize(390, 850);
  await delay(120);
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] .dialog-content").scrollWidth<=document.querySelector("dialog[open] .dialog-content").clientWidth+1'), true);
  await screenshot('/tmp/ilbi-admin-recovery-mobile.png');
  await browser.resize(1440, 1000);
  await fill('dialog[open] textarea', 'Egalik tasdiqlandi, test murojaati');
  await fill('dialog[open] input[type=password]', 'synthetic-admin-password');
  await browser.evaluate('document.querySelector("dialog[open] input[type=checkbox][required]").click()');
  await browser.evaluate('document.querySelector("dialog[open] form").requestSubmit()');
  await wait('adminQA.requests.some(r=>r.path.endsWith("/identity/")&&r.method==="POST")&&!document.querySelector("dialog[open]")');
  const request = await browser.evaluate('adminQA.requests.find(r=>r.path.endsWith("/identity/")&&r.method==="POST").body');
  assert.equal(request.ownership_verified, true);
  assert.equal(request.expected_version, 1);
  assert.equal(request.expected_phone_number, '+998901112233');
  await browser.evaluate(`document.querySelector('.sidebar a[href="/services"]').click()`);
  await wait('Boolean(document.querySelector("[aria-label=\\"Bildirishnoma manzili\\"][aria-haspopup]"))');
  await browser.evaluate('document.querySelector("[aria-label=\\"Bildirishnoma manzili\\"][aria-haspopup]").click()');
  await wait('Boolean(document.querySelector(".custom-select-menu input"))');
  await fill('.custom-select-menu input','guruh');
  await wait('document.querySelectorAll(".custom-select-menu [role=option]").length===2');
  await browser.evaluate('[...document.querySelectorAll(".custom-select-menu [role=option]")].find(option=>option.textContent.trim()==="Shaxsiy chat va guruhga").click()');
  await wait(`Boolean(document.querySelector('input[placeholder="-1001234567890"]'))`);
  await fill('input[placeholder="-1001234567890"]', '-100777000');
  await browser.evaluate('document.querySelector(".admin-check input").click()');
  await click('Sozlamalarni saqlash');
  await wait('adminQA.settings.enabled&&adminQA.settings.target==="both"');
  assert.equal(await browser.evaluate('adminQA.settings.group_chat_id'), '-100777000');
  await wait('![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Sinov xabari")).disabled');
  await click('Sinov xabari');
  await wait('adminQA.requests.some(r=>r.path.endsWith("/telegram/test/"))');
  await screenshot('/tmp/ilbi-admin-settings-light.png');
  await browser.evaluate('document.documentElement.setAttribute("data-theme","dark")');
  await delay(400);
  await screenshot('/tmp/ilbi-admin-settings-dark.png');
  await browser.resize(390, 850);
  await delay(120);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, 'Mobile settings fit viewport');
  await screenshot('/tmp/ilbi-admin-settings-mobile.png');
  assert.deepEqual(browser.errors, []);
  console.log('PASS admin dashboard/sidebar, accounts, identity confirmation, notification save/test, light/dark/mobile layout.');
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
