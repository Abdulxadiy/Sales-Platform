import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

const artifacts = await mkdtemp(join(tmpdir(), 'ilbi-downloads-ui-'));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), cacheDir: 'node_modules/.vite-downloads-qa', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await launchBrowser({ width: 1280, height: 1000 });
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.downloadsQA={mode:sessionStorage.getItem('download-mode')||'published'};
    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input,options)=>{
      const path=new URL(input,location.origin).pathname;
      if(path==='/downloads/releases.json'){
        if(downloadsQA.mode==='offline')throw new TypeError('Offline');
        if(downloadsQA.mode==='missing')return new Response('',{status:404});
        return new Response(JSON.stringify({schema:1,windows:{version:'1.2.0',url:'/downloads/ILBI-Setup-1.2.0-x64.exe',bytes:196124625,channel:'preview',sha256:'a'.repeat(64)},mobile:null}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      if(path.startsWith('/api/'))return new Response('{}',{status:401,headers:{'Content-Type':'application/json'}});
      return originalFetch(input,options);
    };
  ` });
  const wait = async expression => {
    for (let index = 0; index < 200; index++) {
      if (await browser.evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw Error('Timed out: ' + expression);
  };
  await browser.call('Page.navigate', { url: origin + '/' });
  await wait('Boolean(document.querySelector(".lp-nav a[href=\\\"/download\\\"]"))');
  await browser.evaluate('document.querySelector(".lp-nav a[href=\\\"/download\\\"]").click()');
  await wait('Boolean(document.querySelector(".downloads-button[href]"))');
  await wait('!document.querySelector(".ilbi-loading")');
  assert.equal(await browser.evaluate('location.pathname'), '/download');
  assert.equal(await browser.evaluate('document.querySelector(".downloads-button[href]").href'), origin + '/downloads/ILBI-Setup-1.2.0-x64.exe');
  assert.equal(await browser.evaluate('document.querySelector(".downloads-preview").textContent'), 'Sinov nusxasi');
  assert.equal(await browser.evaluate('document.querySelectorAll(".downloads-card button:disabled").length'), 1);
  await writeFile(join(artifacts, 'downloads-desktop.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await browser.resize(390, 844);
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await writeFile(join(artifacts, 'downloads-mobile.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  for (const mode of ['missing', 'offline']) {
    await browser.evaluate(`sessionStorage.setItem('download-mode',${JSON.stringify(mode)});window.downloadBeforeReload=true`);
    await browser.call('Page.reload');
    await wait('!window.downloadBeforeReload&&Boolean(document.querySelector(".downloads-grid"))');
    await wait(mode === 'missing' ? 'document.querySelector(".downloads-card button")?.textContent.includes("hali ochilmagan")' : 'Boolean(document.querySelector(".downloads-notice button"))');
    assert.equal(await browser.evaluate('document.querySelectorAll(".downloads-button[href]").length'), 0);
  }
  await browser.evaluate('downloadsQA.mode="published";document.querySelector(".downloads-notice button").click()');
  await wait('Boolean(document.querySelector(".downloads-button[href]"))');
  assert.deepEqual(browser.errors, []);
  console.log(JSON.stringify({ passed: true, scenarios: ['landing download link', 'anonymous download page', 'versioned Windows link', 'preview label', 'future mobile slot', 'mobile layout', 'missing release', 'offline and retry'], artifacts }));
} catch (error) {
  console.error('Browser errors:', browser?.errors);
  if (browser) console.error(await browser.evaluate('({body:document.body.innerText.slice(0,1500),url:location.href})'));
  throw error;
} finally { await browser?.close(); await server?.close(); }
