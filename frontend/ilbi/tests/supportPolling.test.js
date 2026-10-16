import test from 'node:test';
import assert from 'node:assert/strict';
import { startSupportPolling, supportPollDelay } from '../src/components/support/polling.js';

function scheduler() {
  const timers = new Map();
  let nextId = 0;
  return {
    timers,
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
    clearTimer(id) { timers.delete(id); },
    async next() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      await timer.callback();
    },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('failed reads back off, then return to the normal interval after recovery', async () => {
  const clock = scheduler();
  let requests = 0;
  const errors = [];
  const poller = startSupportPolling(async () => {
    requests += 1;
    if (requests <= 2) throw new Error('Server unavailable');
  }, { ...clock, intervalMs: 5000, shouldRun: () => true, onError: (e) => errors.push(e.message) });
  await flush();
  assert.equal([...clock.timers.values()][0].delay, 15000);
  await clock.next();
  assert.equal([...clock.timers.values()][0].delay, 30000);
  await clock.next();
  assert.equal([...clock.timers.values()][0].delay, 5000);
  assert.equal(errors.length, 2);
  poller.stop();
  assert.equal(clock.timers.size, 0);
});

test('slow requests never overlap, including a manual retry', async () => {
  const clock = scheduler();
  let complete;
  let requests = 0;
  const poller = startSupportPolling(() => {
    requests += 1;
    return new Promise((resolve) => { complete = resolve; });
  }, { ...clock, intervalMs: 5000, shouldRun: () => true });
  poller.retry(); poller.retry();
  assert.equal(requests, 1);
  assert.equal(clock.timers.size, 0);
  complete(); await flush();
  assert.equal([...clock.timers.values()][0].delay, 0);
  const pending = clock.next();
  assert.equal(requests, 2);
  poller.stop();
  complete();
  await pending;
  assert.equal(clock.timers.size, 0);
});

test('stopping during a request cancels subsequent polling and error reports', async () => {
  const clock = scheduler();
  let reject;
  let errors = 0;
  const poller = startSupportPolling(() => new Promise((_resolve, fail) => { reject = fail; }), {
    ...clock, intervalMs: 5000, shouldRun: () => true, onError: () => { errors += 1; },
  });
  poller.stop();
  reject(new Error('Offline')); await flush();
  assert.equal(clock.timers.size, 0);
  assert.equal(errors, 0);
});

test('hidden pages do not poll, and Retry-After is respected', async () => {
  const clock = scheduler();
  let visible = false;
  let requests = 0;
  const poller = startSupportPolling(async () => {
    requests += 1;
    throw Object.assign(new Error('Please wait'), { retryAfterMs: 45000 });
  }, { ...clock, intervalMs: 5000, shouldRun: () => visible });
  assert.equal(requests, 0);
  visible = true;
  await clock.next();
  assert.equal(requests, 1);
  assert.equal([...clock.timers.values()][0].delay, 45000);
  assert.equal(supportPollDelay(5000, 100), 120000);
  poller.stop();
});
