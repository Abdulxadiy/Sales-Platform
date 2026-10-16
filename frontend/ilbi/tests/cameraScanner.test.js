import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startCameraSession, cameraErrorMessage } from '../src/utils/cameraScanner.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(overrides = {}) {
  const track = new EventTarget();
  track.readyState = 'live';
  track.stop = () => { track.readyState = 'ended'; };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = { srcObject: null, play: async () => {}, pause: () => {} };
  const events = [], requests = [];
  const controls = { stop: () => events.push('decoder-stopped') };
  let decode;
  const loadReader = async () => ({ decodeFromVideoElement: async (_, callback) => { decode = callback; return controls; } });
  const session = startCameraSession({
    video,
    mediaDevices: { getUserMedia: async constraints => { requests.push(constraints); return stream; } },
    loadReader,
    onReady: () => events.push('ready'),
    onDetected: code => { assert.equal(track.readyState, 'ended'); events.push(code); },
    onError: error => events.push(error.name),
    ...overrides,
  });
  return { session, video, stream, track, controls, requests, events, detect: code => decode({ getText: () => code }, null, controls) };
}

test('successful scan releases the camera before delivering one result; late frames are ignored', async () => {
  const f = fixture(); await f.session.ready;
  f.detect('  4780012345678 '); f.detect('4780012345678');
  assert.equal(f.events.filter(value => value === '4780012345678').length, 1);
  assert.equal(f.video.srcObject, null);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.requests[0].video.facingMode, { ideal: 'environment' });
  assert.equal(f.requests[0].video.width.min, undefined);
});

test('closing during the permission prompt releases a late stream without starting decoding', async () => {
  const permission = deferred();
  const f = fixture({ mediaDevices: { getUserMedia: () => permission.promise } });
  await tick(); f.session.stop(); permission.resolve(f.stream); await f.session.ready;
  assert.equal(f.track.readyState, 'ended');
  assert.equal(f.video.srcObject, null);
  assert.deepEqual(f.events, []);
});

test('close/reopen waits for the previous permission request and then selects the requested camera', async () => {
  const permission = deferred();
  const first = fixture({ mediaDevices: { getUserMedia: () => permission.promise } });
  await tick(); first.session.stop();
  const second = fixture({ waitFor: first.session.ready, deviceId: 'front-camera' });
  await tick(); assert.equal(second.requests.length, 0);
  permission.resolve(first.stream); await second.session.ready;
  assert.equal(first.track.readyState, 'ended');
  assert.deepEqual(second.requests[0].video.deviceId, { exact: 'front-camera' });
  assert.equal(second.requests[0].video.facingMode, undefined);
  second.session.stop();
});

test('cancelled startup does not ask for camera access (StrictMode)', async () => {
  const f = fixture(); f.session.stop(); await f.session.ready;
  assert.equal(f.requests.length, 0);
});

test('camera disconnection stops decoding and exposes a retryable error', async () => {
  const f = fixture(); await f.session.ready;
  f.track.dispatchEvent(new Event('ended'));
  assert.equal(f.track.readyState, 'ended');
  assert.equal(f.events.at(-1), 'NotReadableError');
  f.detect('stale'); assert.ok(!f.events.includes('stale'));
});

test('autoplay rejection releases the stream; permission rejection remains understandable', async () => {
  const error = new DOMException('Permission denied', 'NotAllowedError');
  const f = fixture({ video: { srcObject: null, play: async () => { throw error; }, pause() {} } });
  await f.session.ready;
  assert.equal(f.track.readyState, 'ended');
  assert.equal(f.events.at(-1), 'NotAllowedError');
  assert.match(cameraErrorMessage(error), /ruxsat/);
});

test('decoder that finishes starting after close is stopped and cannot deliver a result', async () => {
  const started = deferred();
  let decode;
  const f = fixture({ loadReader: async () => ({ decodeFromVideoElement: (_, callback) => { decode = callback; return started.promise; } }) });
  await tick(); f.session.stop(); started.resolve(f.controls); await f.session.ready;
  decode({ getText: () => 'late' }, null, f.controls);
  assert.ok(!f.events.includes('late'));
  assert.equal(f.track.readyState, 'ended');
  assert.ok(f.events.includes('decoder-stopped'));
});
