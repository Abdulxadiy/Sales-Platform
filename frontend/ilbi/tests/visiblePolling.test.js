import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisiblePoller } from '../src/utils/visiblePolling.js';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('polling pauses hidden tabs, cancels requests and coalesces events without overlap', async () => {
  const doc = new EventTarget(); doc.visibilityState = 'hidden';
  const target = new EventTarget();
  let calls = 0, active = 0, peak = 0, aborted = 0;
  const poller = createVisiblePoller(async signal => {
    calls++; active++; peak = Math.max(peak, active);
    try { await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 25);
      signal.addEventListener('abort', () => { clearTimeout(timer); aborted++; reject(new Error('abort')); }, {once:true});
    }); } finally { active--; }
  }, {doc, target, intervalMs:1000, events:['refresh']});
  try {
    await pause(10); assert.equal(calls,0);
    doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));
    target.dispatchEvent(new Event('refresh'));target.dispatchEvent(new Event('refresh'));
    await pause(70);assert.equal(calls,2);assert.equal(peak,1);
    poller.refresh();
    doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));
    await pause(35);assert.equal(aborted,1);
    const hiddenCalls=calls;await poller.refresh();assert.equal(calls,hiddenCalls);
    doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));
    await pause(35);assert.equal(calls,hiddenCalls+1);
    assert.equal(peak,1);
  } finally { poller.stop(); }
});
