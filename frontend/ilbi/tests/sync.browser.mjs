import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const artifacts = await mkdtemp(join(tmpdir(), 'ilbi-sync-ui-'));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await launchBrowser({ width: 1280, height: 900 });
  const wait = async expression => {
    for (let i = 0; i < 160; i++) { if (await browser.evaluate(expression)) return; await delay(40); }
    throw Error('Timed out: ' + expression);
  };
  await browser.call('Page.navigate', { url: origin + '/tests/browser/sync.html' });
  await wait('document.querySelector(".sync-status")?.textContent.includes("Sinxronlanmoqda")');
  await browser.evaluate('document.querySelector(".sync-status").click()');
  await wait('Boolean(document.querySelector("dialog[open]"))');
  assert.equal(await browser.evaluate('document.querySelector("[role=progressbar]").getAttribute("aria-valuenow")'), '27');
  await browser.evaluate('document.querySelector("[data-operation-id=urgent] button").click()');
  await wait('document.querySelectorAll(".sync-row")[1]?.dataset.operationId==="urgent"');
  assert.deepEqual(await browser.evaluate('[...document.querySelectorAll(".sync-row")].map(row=>row.dataset.operationId)'), ['active', 'urgent', 'normal']);
  assert.equal(await browser.evaluate('document.querySelector("[data-operation-id=active]").textContent.includes("27%")'), true);
  assert.equal(await browser.evaluate('Boolean(document.querySelector("[data-operation-id=urgent] .sync-arrows"))'), true);
  assert.equal(await browser.evaluate('document.querySelector("[data-operation-id=urgent]").getAnimations().length>0'), true, 'Priority promotion uses a row transition');
  await delay(450);
  await writeFile(join(artifacts, 'priority-desktop.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await browser.evaluate('syncQA.state.stage="confirming";syncQA.state.progress=100');
  await wait('document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")===null');
  assert.equal(await browser.evaluate('document.querySelector("[data-operation-id=active]").textContent.includes("Server tasdig‘i")'), true);
  await browser.resize(420, 900);
  await delay(120);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), true, 'No mobile overflow');
  await writeFile(join(artifacts, 'priority-mobile.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".sync-arrows")).animationName'), 'none');
  await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait('!document.querySelector("dialog[open]")');
  assert.equal(await browser.evaluate('document.activeElement===document.querySelector(".sync-status")'), true);
  assert.deepEqual(browser.errors, []);
  console.log(JSON.stringify({ passed: true, scenarios: ['priority animation', 'active operation preserved', 'next arrows', 'real progress', 'server confirmation', 'mobile', 'reduced motion', 'keyboard focus'], artifacts }));
} finally {
  await browser?.close();
  await server?.close();
}
