const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { freePort } = require('../runtime.cjs');
const pause = ms => new Promise(ok => setTimeout(ok, ms));
(async () => {
  const port = await freePort();
  const child = spawn(process.env.ILBI_DESKTOP_INSTALLED_EXE, [`--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'], { stdio: ['ignore','ignore','pipe'] });
  let log = ''; child.stderr.on('data', data => { log = (log + data).slice(-6000); });
  let socket;
  try {
    let target;
    for (let i = 0; i < 400; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page' && new URL(item.url).pathname === '/login'); if (target) break; } catch {}
      if (child.exitCode !== null) throw Error('Installed Linux app exited: ' + log);
      await pause(150);
    }
    assert(target, 'Updated Linux app decrypts its vault and opens /login: ' + log);
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
    let sequence = 0;
    const evaluate = expression => new Promise((ok, fail) => {
      const id = ++sequence;
      const timer = setTimeout(() => { socket.removeEventListener('message', receive); fail(Error('Linux relaunch evaluation timed out')); }, 10000);
      function receive(event) {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timer); socket.removeEventListener('message', receive);
        message.error || message.result?.exceptionDetails ? fail(Error(JSON.stringify(message))) : ok(message.result.result.value);
      }
      socket.addEventListener('message', receive);
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
    });
    let ready = false;
    for (let i = 0; i < 400; i++) {
      try { ready = await evaluate('document.readyState === "complete" && Boolean(document.querySelector("form")) && !document.querySelector(".ilbi-loading")'); } catch {}
      if (ready) break;
      await pause(150);
    }
    assert(ready, 'Updated Linux login page finishes loading: ' + log);
    assert.equal(await evaluate('fetch("/desktop/status/").then(response=>response.json()).then(status=>status.desktop && !status.enrolled)'), true);
    // Close gracefully through the renderer, then require the local host to exit.
    await evaluate('setTimeout(()=>window.close(),100);true');
    for (let i = 0; i < 300 && child.exitCode === null; i++) await pause(100);
    assert.equal(child.exitCode, 0, 'Linux app shuts down its local database cleanly: ' + log);
    console.log('Installed Linux update preserves configuration and reopens the local database.');
  } finally { socket?.close(); if (child.exitCode === null) child.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
