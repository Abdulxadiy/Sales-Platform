// Exercise the actually installed Electron package, before any store is configured.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { freePort } = require('../runtime.cjs');
const pause = ms => new Promise(ok => setTimeout(ok, ms));

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { socket.addEventListener('open', ok, { once: true }); socket.addEventListener('error', fail, { once: true }); });
  let sequence = 0;
  const waiting = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const pending = waiting.get(message.id);
    if (!pending) return;
    waiting.delete(message.id); clearTimeout(pending.timer);
    message.error ? pending.fail(Error(JSON.stringify(message.error))) : pending.ok(message.result);
  });
  return {
    socket,
    evaluate(expression) {
      return new Promise((ok, fail) => {
        const id = ++sequence;
        const timer = setTimeout(() => { waiting.delete(id); fail(Error('Installed UI evaluation timed out')); }, 30000);
        waiting.set(id, { timer, fail, ok: result => result.exceptionDetails ? fail(Error(JSON.stringify(result.exceptionDetails))) : ok(result.result.value) });
        socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true, userGesture: true } }));
      });
    },
  };
}

test('installed app opens the complete offline guide and preserves the setup window', {
  skip: process.platform !== 'win32' || !process.env.ILBI_DESKTOP_INSTALLED_EXE, timeout: 120000,
}, async () => {
  const port = await freePort();
  const processHandle = spawn(process.env.ILBI_DESKTOP_INSTALLED_EXE, [`--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const exited = new Promise(ok => processHandle.once('exit', ok));
  let log = '';
  processHandle.stderr.on('data', data => { log = (log + data.toString()).slice(-5000); });
  const sockets = [];
  const targets = async () => (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  async function waitFor(action) {
    for (let i = 0; i < 200; i++) { try { const value = await action(); if (value) return value; } catch {} await pause(150); }
    throw Error('Installed app UI did not become ready: ' + log);
  }
  try {
    const setupTarget = await waitFor(async () => (await targets()).find(item => item.type === 'page' && item.url.endsWith('/setup')));
    const setup = await connect(setupTarget); sockets.push(setup.socket);
    assert.equal(await setup.evaluate('Boolean(document.querySelector("#guide")) && typeof window.ilbiDesktop.openGuide === "function"'), true);
    await setup.evaluate('window.ilbiDesktop.openGuide()');
    const guideTarget = await waitFor(async () => (await targets()).find(item => item.type === 'page' && item.url.includes('/desktop-guide')));
    const guide = await connect(guideTarget); sockets.push(guide.socket);
    await waitFor(() => guide.evaluate('document.querySelector("h1")?.textContent === "ILBI ilovasini sozlash"'));
    assert.equal(await guide.evaluate('document.querySelectorAll(".doc-focus-trigger img").length'), 7);
    await guide.evaluate('Promise.all([...document.querySelectorAll(".doc-focus-trigger img")].map(img=>{img.loading="eager";return img.decode()}))');
    assert.equal(await guide.evaluate('[...document.querySelectorAll(".doc-focus-trigger img")].every(img=>img.naturalWidth>0)'), true);
    await guide.evaluate('document.querySelector(".doc-focus-trigger").click()');
    assert.equal(await guide.evaluate('Boolean(document.querySelector("dialog[open]"))'), true);
    await guide.evaluate('document.querySelector("dialog[open] button[aria-label=Yopish]").click()');
    await guide.evaluate('setTimeout(()=>document.querySelector(".desktop-guide-header button").click(),100);true');
    await waitFor(async () => !(await targets()).some(item => item.type === 'page' && item.url.includes('/desktop-guide')));
    assert.equal(await setup.evaluate('Boolean(document.querySelector("#host"))'), true);
    // Reopening uses the same packaged assets, without a cloud/backend enrollment.
    await setup.evaluate('window.ilbiDesktop.openGuide()');
    await waitFor(async () => (await targets()).some(item => item.type === 'page' && item.url.includes('/desktop-guide')));
    await setup.evaluate('setTimeout(()=>window.close(),100);true');
    await Promise.race([exited, pause(5000)]);
  } finally {
    for (const socket of sockets) socket.close();
    if (processHandle.exitCode === null) processHandle.kill();
    await Promise.race([exited, pause(5000)]);
  }
});
