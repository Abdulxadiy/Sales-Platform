import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser/chrome.mjs';
import { installAuthFixture } from './browser/authFixture.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server;
const browsers = [];
try {
  server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [react()], logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  async function wait(browser, expression) {
    for (let i = 0; i < 200; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timeout: ' + expression);
  }
  async function open(path, options = {}) {
    const browser = await launchBrowser({ width: 1280, height: 900, reducedMotion: true });
    browsers.push(browser);
    await browser.call('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
    await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `(${installAuthFixture.toString()})(${JSON.stringify(options)})` });
    await browser.call('Page.navigate', { url: base + path });
    await wait(browser, 'document.querySelector("#root")?.children.length > 0');
    return browser;
  }
  const clickText = (browser, text) => browser.evaluate(`(() => {
    const button = [...document.querySelectorAll('button,a')].find(node => node.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw Error('Missing button: ' + ${JSON.stringify(text)});
    button.click();
  })()`);
  async function openWidget(browser) {
    await browser.evaluate('window.dispatchEvent(new Event("open-support-widget"))');
    await wait(browser, 'Boolean(document.querySelector(".support-widget-window"))');
  }

  const logout = await open('/profile');
  await wait(logout, 'Boolean(document.querySelector(".sidebar"))');
  await openWidget(logout);
  await wait(logout, 'document.body.innerText.includes("PRIVATE_HISTORY_SENTINEL")');
  await clickText(logout, 'Tizimdan chiqish');
  await wait(logout, 'Boolean(document.querySelector("dialog[open]"))');
  await clickText(logout, 'Chiqish');
  await wait(logout, 'location.pathname === "/login"');
  await delay(250);
  assert.equal(await logout.evaluate('document.body.innerText.includes("PRIVATE_HISTORY_SENTINEL")'), false, 'Logout must remove private chat history immediately');
  assert.equal(await logout.evaluate('Boolean(localStorage.getItem("ilbi_access_token") || localStorage.getItem("inventra_access_token"))'), false);
  console.log('PASS logout clears private chat and both token namespaces');

  const offline = await open('/support', { profileFailure: true });
  await delay(1000);
  assert.equal(await offline.evaluate('Boolean(document.querySelector(".sidebar"))'), false, 'A cached profile without server validation must not open the private layout');
  assert.equal(await offline.evaluate('authQA.requests.some(r => r.path.includes("/support/inbox/"))'), false, 'Unverified sessions must not request private chats');
  console.log('PASS unverified/offline sessions do not expose private screens');

  const guest = await open('/login', { saved: false });
  await wait(guest, 'Boolean(document.querySelector("#username"))');
  await openWidget(guest);
  await guest.evaluate('document.querySelector("button[title=\"To‘liq sahifada ochish\"]").click()');
  await wait(guest, 'location.pathname === "/support"');
  assert.equal(await guest.evaluate('Boolean(document.querySelector(".sidebar"))'), false);
  console.log('PASS expanding a guest chat never opens the private layout');
} finally {
  for (const browser of browsers) await browser.close();
  if (server) await server.close();
}
