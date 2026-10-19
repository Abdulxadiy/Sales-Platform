import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';
import { installAuthFixture } from './browser/authFixture.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
const browsers = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(browser, expression) {
  for (let i = 0; i < 250; i++) {
    if (await browser.evaluate(expression)) return;
    await delay(30);
  }
  throw Error('Timed out: ' + expression + '\n' + browser.errors.join('\n'));
}
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const theme of ['light', 'dark']) {
    const browser = await launchBrowser({ width: 1280, height: 900 });
    browsers.push(browser);
    await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `(${installAuthFixture.toString()})(); authQA.holdProfile = true; localStorage.setItem('ilbi_theme', ${JSON.stringify(theme)});` });
    const blocked = ['*fonts.googleapis.com*', '*fonts.gstatic.com*'];
    // Verify the actual HTML fallback before React or authentication can run.
    await browser.call('Network.setBlockedURLs', { urls: [...blocked, '*src/main.jsx*'] });
    await browser.call('Page.navigate', { url: base + '/profile' });
    await wait(browser, 'Boolean(document.querySelector("#ilbi-boot-loader .ilbi-loader__arc"))');
    assert.equal(await browser.evaluate('document.documentElement.dataset.theme'), theme);
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#ilbi-boot-loader .ilbi-loader__orbit")).animationDuration'), '2.08s');
    assert.equal(await browser.evaluate('getComputedStyle(document.querySelector("#ilbi-boot-loader")).backgroundColor'), theme === 'dark' ? 'rgb(9, 13, 22)' : 'rgb(255, 255, 255)');
    await browser.call('Network.setBlockedURLs', { urls: blocked });
    await browser.call('Page.reload', { ignoreCache: true });
    await wait(browser, 'Boolean(window.authQA?.pendingProfiles.length) && !document.querySelector("#ilbi-boot-loader")');
    assert.equal(await browser.evaluate('document.querySelectorAll(".ilbi-loading").length'), 1);
    assert.equal(await browser.evaluate('document.querySelectorAll(".ilbi-loading .ilbi-loader__arc").length'), 3);
    assert.equal(await browser.evaluate('Math.round(document.querySelector(".ilbi-loading .ilbi-loader").getBoundingClientRect().width)'), 128);
    await writeFile(`/tmp/ilbi-loader-integrated-${theme}.png`, Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png', fromSurface: true })).data, 'base64'));
    await browser.evaluate('authQA.holdProfile = false; authQA.pendingProfiles.splice(0).forEach(resolve => resolve())');
    await wait(browser, 'Boolean(document.querySelector(".sidebar")) && !document.querySelector(".ilbi-loading")');
    assert.equal(await browser.evaluate('location.pathname'), '/profile');
    assert.deepEqual(browser.errors.filter(error => !error.includes('ERR_BLOCKED_BY_CLIENT')), []);
    await browser.close();
    browsers.pop();
  }

  const browser = await launchBrowser({ width: 1280, height: 900 });
  browsers.push(browser);
  await browser.call('Page.navigate', { url: base + '/tests/browser/loading.html' });
  await wait(browser, 'Boolean(window.loadingQA && document.querySelector("#ready-content"))');
  await browser.evaluate('loadingQA.setRequests([true, false])');
  await wait(browser, 'document.querySelectorAll(".ilbi-loading").length === 1');
  await browser.evaluate('window.originalOrbit = document.querySelector(".ilbi-loading .ilbi-loader__orbit"); loadingQA.setRequests([true, true])');
  await wait(browser, 'document.querySelector(".ilbi-loading").getAttribute("aria-label") === "Sahifa yuklanmoqda..."');
  await browser.evaluate('loadingQA.setRequests([false, true])');
  await delay(120);
  assert.equal(await browser.evaluate('document.querySelector(".ilbi-loading .ilbi-loader__orbit") === originalOrbit'), true, 'Concurrent loaders should share one continuous animation.');
  await browser.evaluate('loadingQA.setRequests([false, false])');
  await wait(browser, 'Boolean(document.querySelector(".ilbi-loading--leaving"))');
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".ilbi-loading")).transitionDuration'), '0.38s');
  // New work during the fade cancels removal, preserving the running animation.
  await browser.evaluate('loadingQA.setRequests([true, false])');
  await wait(browser, 'Boolean(document.querySelector(".ilbi-loading:not(.ilbi-loading--leaving)"))');
  await delay(420);
  assert.equal(await browser.evaluate('document.querySelector(".ilbi-loading .ilbi-loader__orbit") === originalOrbit'), true);
  await browser.evaluate('loadingQA.setRequests([false, false])');
  await wait(browser, '!document.querySelector(".ilbi-loading")');
  assert.equal(await browser.evaluate('(() => { const ids = [...document.querySelectorAll("[id]")].map(n => n.id); return new Set(ids).size === ids.length; })()'), true, 'Multiple logo gradients must have distinct IDs.');
  await browser.resize(390, 844);
  await browser.evaluate('document.documentElement.dataset.theme="dark"; loadingQA.setRequests([true, false])');
  await wait(browser, 'Boolean(document.querySelector(".ilbi-loading"))');
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  const geometry = await browser.evaluate(`(() => {
    const arc = document.querySelector('.ilbi-loading .ilbi-loader__arc');
    const animation = arc.getAnimations()[0]; animation.pause();
    const duration = animation.effect.getTiming().duration;
    let gap = Infinity;
    for (let t = 0; t <= duration; t += 20) {
      animation.currentTime = t;
      const length = parseFloat(getComputedStyle(arc).strokeDasharray);
      gap = Math.min(gap, 2 * 238 * Math.sin((120 - length) * Math.PI / 360) - 34);
    }
    return gap;
  })()`);
  assert.ok(geometry > 40, 'Rounded ends stay separated at every point in the cycle.');
  await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".ilbi-loader__orbit")).animationName'), 'none');
  assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".ilbi-loader__arc")).animationName'), 'none');
  await browser.evaluate('loadingQA.setRequests([false, false])');
  await wait(browser, '!document.querySelector(".ilbi-loading")');
  assert.deepEqual(browser.errors, []);
  console.log('PASS initial HTML and slow auth refresh in both themes; 1.25× motion; shared overlapping loads; fade cancellation and removal; mobile, unique IDs, arc gaps and reduced motion.');
} finally {
  for (const browser of browsers) await browser.close();
  await server.close();
}
