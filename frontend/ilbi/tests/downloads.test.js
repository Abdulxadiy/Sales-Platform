import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseURL, releaseSize } from '../src/utils/downloads.js';

test('release links accept HTTPS and versioned public files while rejecting executable URL schemes', () => {
  assert.equal(releaseURL('/downloads/ILBI-Setup-1.2.0-x64.exe', 'https://ilbi.uz'), 'https://ilbi.uz/downloads/ILBI-Setup-1.2.0-x64.exe');
  assert.equal(releaseURL('https://cdn.example/app.apk', 'https://ilbi.uz'), 'https://cdn.example/app.apk');
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', 'https://user:secret@example.com/app.exe', '/downloads/../.env', '/downloads/%2e%2e/secret', '//evil.example/app.exe', 'http://evil.example/app.exe']) {
    assert.equal(releaseURL(value, 'https://ilbi.uz'), null);
  }
  assert.equal(releaseSize(1048576), '1.0 MB');
});
