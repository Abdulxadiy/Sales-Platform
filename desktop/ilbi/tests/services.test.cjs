const test = require('node:test');
const assert = require('node:assert/strict');
const { configureSecretStore, publicReleases, serveReleases } = require('../services.cjs');
const { OFFICIAL_SERVER } = require('../runtime.cjs');

function fakeApp(explicit = false) {
  const switches = [];
  return { switches, commandLine: { hasSwitch: () => explicit, appendSwitch: (...args) => switches.push(args) } };
}
test('Linux default launch uses Secret Service on Hyprland without changing KDE or explicit selections', () => {
  for (const desktop of ['Hyprland', 'sway', 'GNOME', 'XFCE', '']) {
    const app = fakeApp(); configureSecretStore(app, 'linux', { XDG_CURRENT_DESKTOP: desktop });
    assert.deepEqual(app.switches, [['password-store', 'gnome-libsecret']]);
  }
  for (const desktop of ['KDE', 'KDE6', 'plasma', 'plasmawayland']) {
    const app = fakeApp(); configureSecretStore(app, 'linux', { XDG_CURRENT_DESKTOP: desktop });
    assert.deepEqual(app.switches, []);
  }
  const explicit = fakeApp(true); configureSecretStore(explicit, 'linux', { XDG_CURRENT_DESKTOP: 'Hyprland' });
  assert.deepEqual(explicit.switches, []);
  const windows = fakeApp(); configureSecretStore(windows, 'win32', {});
  assert.deepEqual(windows.switches, []);
});
test('public releases use only the fixed official URL and omit credentials and redirects', async () => {
  let request;
  const result = await publicReleases(async (...args) => {
    request = args; return new Response(JSON.stringify({ schema: 1, windows: { version: '1.2.0' } }));
  });
  assert.equal(request[0], OFFICIAL_SERVER + '/downloads/releases.json');
  assert.equal(request[1].redirect, 'error'); assert.equal(request[1].credentials, 'omit');
  assert.deepEqual(request[1].headers, { Accept: 'application/json' });
  assert(request[1].signal instanceof AbortSignal);
  assert.equal(result.origin, OFFICIAL_SERVER); assert.equal(result.release.schema, 1);
});
test('release failures distinguish unavailable transport, server failure and malformed metadata', async () => {
  for (const [code, fetcher] of [
    ['release_unreachable', async () => { throw Error('connection'); }],
    ['release_service', async () => new Response('', { status: 503 })],
    ['release_format', async () => new Response('not JSON')],
    ['release_format', async () => new Response(JSON.stringify({ schema: 9 }))],
  ]) await assert.rejects(publicReleases(fetcher), error => error.code === code && !error.message.includes('connection'));
  assert.deepEqual(await publicReleases(async () => new Response('', { status: 404 })), { origin: OFFICIAL_SERVER, release: { schema: 1 } });
});
test('the unconfigured public HTTP endpoint cannot forward a request token or body', async () => {
  let upstream;
  const response = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = JSON.parse(body); } };
  await serveReleases({ method: 'GET', headers: { authorization: 'secret', cookie: 'secret' }, body: 'private' }, response, async (url, options) => {
    upstream = options; return new Response(JSON.stringify({ schema: 1 }));
  });
  assert.equal(response.status, 200); assert.equal(response.body.origin, OFFICIAL_SERVER);
  assert.equal(upstream.body, undefined); assert.equal(upstream.headers.authorization, undefined); assert.equal(upstream.headers.cookie, undefined);
  await serveReleases({ method: 'POST' }, response, () => assert.fail('POST must not reach the cloud'));
  assert.equal(response.status, 405); assert.equal(response.headers.Allow, 'GET');
});
