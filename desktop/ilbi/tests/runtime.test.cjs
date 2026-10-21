const test = require('node:test');
const assert = require('node:assert/strict');
const { validateServer, validatePairing, safePath, equalKey } = require('../runtime.cjs');

test('cloud URL validation excludes insecure or credential-bearing remote URLs', () => {
  assert.equal(validateServer('https://ilbi.uz/'), 'https://ilbi.uz');
  assert.equal(validateServer('http://127.0.0.1:8000'), 'http://127.0.0.1:8000');
  for (const value of ['http://ilbi.uz', 'https://user:secret@ilbi.uz', 'https://ilbi.uz/path', 'file:///etc/passwd']) assert.throws(() => validateServer(value));
});
test('LAN pairing requires a private address, pinned certificate and strong key', () => {
  const value = { protocol: 1, host: '192.168.1.8', port: 49243, key: 'a'.repeat(64), certificate: '-----BEGIN CERTIFICATE-----\nexample' };
  assert.equal(validatePairing(value).host, value.host);
  assert.throws(() => validatePairing({ ...value, host: 'example.com' }));
  assert.throws(() => validatePairing({ ...value, key: 'guessable' }));
});
test('local asset serving rejects encoded traversal', () => {
  assert.equal(safePath('/tmp/ui', '/assets/test.js'), '/tmp/ui/assets/test.js');
  assert.throws(() => safePath('/tmp/ui', '/%2e%2e/secret'));
  assert.equal(equalKey('abc', 'abc'), true);
  assert.equal(equalKey('', 'abc'), false);
});
