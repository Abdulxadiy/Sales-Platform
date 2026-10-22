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
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), cacheDir: 'node_modules/.vite-sync-qa', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await launchBrowser({ width: 1280, height: 900, disableBackForwardCache: true });
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
  await browser.resize(1440, 1000);
  await browser.call('Page.navigate', { url: origin + '/tests/browser/sync.html?workspace' });
  await wait('Boolean(document.querySelector(".sidebar"))&&Boolean(document.querySelector(".sync-status"))');
  await wait('Boolean(document.querySelector("input[aria-label=\\\"Sinov qoralamasi\\\"]"))');
  await browser.evaluate('window.keptDraft=document.querySelector("input[aria-label=\\\"Sinov qoralamasi\\\"]");keptDraft.value="Saqlangan qoralama"');
  await browser.evaluate('document.querySelector("button[aria-label=\\\"Ish stolini almashtirish\\\"]").click()');
  await wait('Boolean(document.querySelector(".workspace-navbar .sync-status"))');
  assert.equal(await browser.evaluate('Boolean(document.querySelector(".workspace-nav-row a[href=\\\"/download\\\"]"))'), true);
  assert.equal(await browser.evaluate('keptDraft===document.querySelector("input[aria-label=\\\"Sinov qoralamasi\\\"]")&&keptDraft.value==="Saqlangan qoralama"'), true);
  await browser.evaluate('document.querySelector(".sync-status").click()');
  await wait('Boolean(document.querySelector("dialog[open] .sync-row"))');
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] [data-operation-id=active]").textContent.includes("27%")'), true);
  await writeFile(join(artifacts, 'fast-workspace-sync.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await browser.evaluate('document.querySelector("dialog[open] button[aria-label=Yopish]").click()');
  await browser.evaluate('window.syncBeforeReload=true');
  await browser.call('Page.reload');
  await wait('!window.syncBeforeReload&&Boolean(document.querySelector(".workspace-navbar .sync-status"))');
  await browser.evaluate('document.querySelector("button[aria-label=\\\"Ish stolini almashtirish\\\"]").click()');
  await wait('Boolean(document.querySelector(".sidebar"))&&Boolean(document.querySelector(".app-header .sync-status"))');
  await browser.evaluate('document.querySelector(".sync-status").click()');
  await wait('Boolean(document.querySelector("dialog[open] .sync-row"))');
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] [data-operation-id=active]").textContent.includes("27%")'), true);
  await writeFile(join(artifacts, 'classic-workspace-sync.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.equal(await browser.evaluate('Boolean(document.querySelector(".sidebar a[href=\\\"/download\\\"]"))'), true);
  for (const scenario of ['single', 'multi', 'admin', 'actor']) {
    await browser.call('Page.navigate', { url: origin + '/tests/browser/sync.html?setup=' + scenario });
    await wait('document.querySelector(".sync-status")?.textContent.includes("Online rejim")');
    assert.equal(await browser.evaluate('document.querySelector(".sync-status").textContent.includes("Internetsiz ishlamaydi")'), scenario !== 'actor');
    await browser.evaluate('document.querySelector(".sync-status").click()');
    await wait('Boolean(document.querySelector("dialog[open] form"))');
    assert.equal(await browser.evaluate('document.querySelector(".sync-heading").textContent.includes("Offline rejim ixtiyoriy")'), true);
    assert.equal(await browser.evaluate('document.querySelector(".sync-setup").textContent.includes("Internet uzilsa, ilovada ishlay olmaysiz")'), scenario !== 'actor');
    assert.equal(await browser.evaluate('Boolean(document.querySelector("input[name=offline-password]"))'), false, 'No separate offline password');
    if (scenario === 'multi') {
      assert.equal(await browser.evaluate('document.querySelector(".sync-setup button[type=submit]").disabled'), true);
      await browser.evaluate('document.querySelector("[aria-label=\\\"Offline ishlaydigan do‘kon\\\"]").click()');
      await wait('Boolean(document.querySelector("[role=listbox]"))');
      await browser.evaluate('[...document.querySelectorAll("[role=option]")].find(node=>node.textContent.includes("Ikkinchi QA")).click()');
    }
    if (scenario === 'admin') {
      assert.equal(await browser.evaluate('document.querySelector(".sync-setup button[type=submit]").disabled'), true);
      assert.equal(await browser.evaluate('document.querySelector("#offline-setup-reason").textContent.includes("do‘kon egasi")'), true);
      assert.equal(await browser.evaluate('Boolean(document.querySelector("[name=offline-tenant]"))'), false);
    } else {
      await wait('!document.querySelector(".sync-setup button[type=submit]").disabled');
      await browser.evaluate('document.querySelector(".sync-setup").requestSubmit()');
      await wait('document.querySelector(".sync-error")?.textContent.includes("Sinov javobi")');
      const sent = await browser.evaluate('syncQA.requests.find(row=>row.path==="/desktop/enroll/"||row.path==="/desktop/actor/")');
      assert.equal(sent.path, scenario === 'actor' ? '/desktop/actor/' : '/desktop/enroll/');
      assert.equal('pin' in sent.body, false);
      assert.equal(sent.body.tenant_id, scenario === 'actor' ? undefined : scenario === 'multi' ? 8 : 7);
      assert.equal(await browser.evaluate('document.querySelector(".sync-setup button[type=submit]").disabled'), false, 'Failed preparation stays retryable');
    }
    await browser.evaluate('[...document.querySelectorAll(".sync-setup button")].find(node=>node.textContent.includes("Hozircha internet")).click()');
    await wait('!document.querySelector("dialog[open]")');
  }
  await browser.resize(420, 900);
  await browser.call('Page.navigate', {url:origin+'/tests/browser/sync.html?workspace&setup=single'});
  await wait('document.querySelector(".sync-status")?.textContent.includes("Internetsiz ishlamaydi")');
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Optional offline warning fits a mobile workspace');
  await writeFile(join(artifacts,'online-warning-mobile.png'),Buffer.from((await browser.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await browser.resize(1280,1000);
  await browser.call('Page.navigate',{url:origin+'/tests/browser/sync.html?security'});
  await wait('typeof window.openSecurityQA==="function"');await browser.evaluate('openSecurityQA()');
  await wait('Boolean(document.querySelector(".desktop-security details"))');
  assert.equal(await browser.evaluate('document.querySelector(".desktop-security").textContent.includes("10 soat")'),true);
  await browser.evaluate('document.querySelectorAll(".desktop-security details")[1].open=true;[...document.querySelectorAll(".desktop-security button")].find(node=>node.textContent==="Ulanish kodini yaratish").click()');
  await wait('document.querySelector(".desktop-pair-code")?.textContent.includes("1234 5678")');
  await browser.evaluate('Object.assign(syncQA.pair,{state:"claimed",fingerprint:"A1B2 C3D4",clientName:"Yangi QA kassa"})');
  await wait('Boolean(document.querySelector(".desktop-check"))');
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".desktop-security button")].find(node=>node.textContent==="Yangi kassani tasdiqlash").disabled'),true);
  await browser.evaluate('document.querySelector(".desktop-check input").click();[...document.querySelectorAll(".desktop-security button")].find(node=>node.textContent==="Yangi kassani tasdiqlash").click()');
  await wait('syncQA.pair.state==="approved"');
  await browser.evaluate('syncQA.pair.state="completed";syncQA.registers=[{id:"new-register",name:"Yangi QA kassa"}]');
  await wait('document.querySelector(".desktop-registers")?.textContent.includes("Yangi QA kassa")');
  await browser.evaluate('document.querySelector(".desktop-registers button").click()');await wait('syncQA.registers.length===0');
  await browser.evaluate('document.querySelectorAll(".desktop-security details")[2].open=true;[...document.querySelectorAll(".desktop-security button")].find(node=>node.textContent==="Hozir zaxiralash").click()');
  await wait('Boolean(document.querySelector(".desktop-security select option[value=synthetic-backup]"))');
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".desktop-security button")].find(node=>node.textContent==="Zaxiradan tiklash").disabled'),true);
  await writeFile(join(artifacts,'security-panel.png'),Buffer.from((await browser.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await browser.resize(420,900);assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Security controls fit a narrow window');
  assert.deepEqual(browser.errors, []);
  console.log(JSON.stringify({ passed: true, scenarios: ['priority animation', 'active operation preserved', 'next arrows', 'real progress', 'server confirmation', 'mobile', 'reduced motion', 'keyboard focus', 'classic and fast workspace sync', 'draft preserved on workspace switch', 'workspace preference survives reload'], artifacts }));
} catch (error) {
  console.error('Browser errors:', browser?.errors);
  if (browser) console.error(await browser.evaluate('({body:document.body.innerText.slice(0,1500),url:location.href})'));
  throw error;
} finally {
  await browser?.close();
  await server?.close();
}
