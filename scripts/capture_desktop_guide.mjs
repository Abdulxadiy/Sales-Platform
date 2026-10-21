// Actual setup/React controls; all identities and transactions are synthetic.
// Arrows are SVG overlays captured with the page, never edits of OS photographs.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from '../frontend/ilbi/node_modules/vite/dist/node/index.js';
import { launchBrowser } from '../frontend/ilbi/tests/browser/chrome.mjs';

const root = new URL('../', import.meta.url);
const destination = new URL('frontend/ilbi/src/content/desktop-guide/', root);
await mkdir(destination, { recursive: true });
const server = await createServer({ root: fileURLToPath(new URL('frontend/ilbi/', root)), logLevel: 'error',
  cacheDir: 'node_modules/.vite-desktop-guide-capture', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await launchBrowser({ width: 920, height: 720, reducedMotion: true });
const manifest = { syntheticData: true, method: 'Chrome screenshots of production controls with numbered SVG arrow overlays', frames: [] };
const wait = async expression => {
  for (let index = 0; index < 300; index++) {
    if (await browser.evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw Error('Capture timeout: ' + expression);
};
async function capture(name, selector, marks, context, padding = 65) {
  await browser.evaluate('document.querySelector("#guide-arrows")?.remove()');
  const bounds = await browser.evaluate(`(() => {
    const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return {x:Math.max(0,box.x-${padding}),y:Math.max(0,box.y-${padding}),width:Math.min(innerWidth,box.width+${padding * 2}),height:box.height+${padding * 2}};
  })()`);
  await browser.evaluate(`(() => {
    const overlay = document.createElementNS('http://www.w3.org/2000/svg','svg');
    overlay.id='guide-arrows';overlay.setAttribute('width',innerWidth);overlay.setAttribute('height',innerHeight);
    overlay.style='position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:visible';
    let markup='<defs><marker id="guide-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#df3e46" stroke-width="1.6"/></marker></defs>';
    for(const mark of ${JSON.stringify(marks)}) {
      const rect=document.querySelector(mark.selector).getBoundingClientRect();
      const x=rect.x+rect.width*(mark.x??.5),y=rect.y+rect.height*(mark.y??.5);
      const fromX=x+mark.dx,fromY=y+mark.dy;
      const length=Math.hypot(mark.dx,mark.dy);const startX=fromX-mark.dx*17/length,startY=fromY-mark.dy*17/length;
      markup+='<path d="M'+startX+' '+startY+' L'+x+' '+y+'" fill="none" stroke="white" stroke-width="5"/>';
      markup+='<path d="M'+startX+' '+startY+' L'+x+' '+y+'" fill="none" stroke="#df3e46" stroke-width="2.5" marker-end="url(#guide-arrow)"/>';
      markup+='<circle cx="'+fromX+'" cy="'+fromY+'" r="15" fill="white" stroke="#df3e46" stroke-width="2.5"/>';
      markup+='<text x="'+fromX+'" y="'+(fromY+5)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="#be2634">'+mark.number+'</text>';
    }
    overlay.innerHTML=markup;document.documentElement.append(overlay);
  })()`);
  // Native modal dialogs are in the top layer: put annotations in that layer too.
  await browser.evaluate(`(() => {const dialog=document.querySelector('dialog[open]');if(dialog){const overlay=document.querySelector('#guide-arrows');overlay.style.position='fixed';dialog.append(overlay);}})()`);
  const image = await browser.call('Page.captureScreenshot', { format: 'png', clip: { ...bounds, scale: 1.5 }, captureBeyondViewport: true });
  const png = Buffer.from(image.data, 'base64');
  await writeFile(new URL(name, destination), png);
  manifest.frames.push({ file: name, source: context, crop: bounds, arrows: marks, sha256: createHash('sha256').update(png).digest('hex') });
}
try {
  // Serve the actual first-run HTML and stylesheet with a non-mutating Electron bridge.
  const html = await readFile(new URL('desktop/ilbi/setup.html', root), 'utf8');
  const css = await readFile(new URL('desktop/ilbi/setup.css', root), 'utf8');
  await browser.call('Page.navigate', { url: origin });
  await wait('document.readyState === "complete"');
  await browser.evaluate(`document.open();document.write(${JSON.stringify(html.replace('<link rel="stylesheet" href="/setup.css">', `<style>${css}</style>`).replace('<script src="/setup.js"></script>', ''))});document.close()`);
  await capture('01-primary-setup.png', '#host', [
    { selector: '#host input', number: 1, x: .82, y: 0, dx: 0, dy: -40 },
    { selector: '#host button', number: 2, x: 1, y: .5, dx: 60, dy: 0 },
  ], 'desktop/ilbi/setup.html + setup.css: primary computer form', 16);
  await capture('07-extra-register.png', 'section', [
    { selector: 'section h2', number: 1, x: .55, y: 0, dx: 20, dy: -18 },
    { selector: '#join', number: 2, x: 1, y: .5, dx: 65, dy: 0 },
  ], 'desktop/ilbi/setup.html + setup.css: extra register', 16);
  for (const mode of ['prepare', 'login', 'queue', 'priority', 'retry']) {
    await browser.call('Page.navigate', { url: origin + '/tests/browser/desktopGuide.html?mode=' + mode });
    if (mode === 'login') {
      await wait('Boolean(document.querySelector(".desktop-access"))');
      await browser.evaluate(`(() => {const input=document.querySelector('.desktop-access input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'kassir.namuna');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await capture('03-offline-login.png', '.desktop-access', [
        { selector: '.desktop-access input[autocomplete="username"]', number: 1, x: .8, y: 0, dx: 0, dy: -35 },
        { selector: '.desktop-access input[type="password"]', number: 2, x: .8, y: 0, dx: 0, dy: -35 },
        { selector: '.desktop-access button', number: 3, x: 1, y: .5, dx: 34, dy: 0 },
      ], 'DesktopAccess.jsx: synthetic enrolled account');
      continue;
    }
    await wait('Boolean(document.querySelector(".sync-status")) && !document.querySelector(".sync-status").textContent.includes("holati")');
    await browser.evaluate('document.querySelector(".sync-status").click()');
    await wait('Boolean(document.querySelector("dialog[open]"))');
    if (mode === 'prepare') {
      await capture('02-prepare.png', '.sync-dialog', [
        { selector: '.sync-heading h2', number: 1, x: 1, y: .4, dx: 44, dy: -25 },
        { selector: '.sync-setup input', number: 2, x: .8, y: 0, dx: 0, dy: -38 },
        { selector: '.sync-setup button', number: 3, x: 1, y: .5, dx: 35, dy: 0 },
      ], 'SyncCenter.jsx: owner preparing the synthetic store');
    } else if (mode === 'queue' || mode === 'priority') {
      await capture(mode === 'queue' ? '04-queue.png' : '05-priority.png', '.sync-dialog', [
        { selector: '[data-operation-id="active"] .sync-percent', number: 1, x: 1, y: .5, dx: 58, dy: -15 },
        { selector: mode === 'queue' ? '[data-operation-id="payment"] button' : '[data-operation-id="payment"] .sync-row-body', number: 2, x: mode === 'queue' ? 1 : 0, y: .5, dx: mode === 'queue' ? 42 : -70, dy: 0 },
      ], 'SyncCenter.jsx: synthetic outgoing operations (' + mode + ')');
    } else {
      await capture('06-retry.png', '.sync-dialog', [
        { selector: '[data-operation-id="failed"] small', number: 1, x: .38, y: 0, dx: 0, dy: -50 },
        { selector: '[data-operation-id="failed"] button', number: 2, x: 1, y: .5, dx: 40, dy: 0 },
      ], 'SyncCenter.jsx: synthetic network failure; no real customer data');
    }
  }
  assert.equal(manifest.frames.length, 7);
  await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ captured: manifest.frames.length, directory: fileURLToPath(destination), syntheticData: true }));
} finally { await browser.close(); await server.close(); }
