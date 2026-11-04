// B39 Allowed sites: the main process's saved allow list (electron/preview-allowed-origins.mjs, a port of 2.31226.0
// index.chunk mP / wNn / SNn / TNn) and the dialog's pure logic (src/preview-allowed-sites-model.mjs, c25b1be4a p and
// c36734a81 g / D / the remove focus order).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_ORIGIN_RESULTS as R, addAllowedOrigin, allowedOriginEntries, allowedOriginList, hostMatchesOrigin, normalizeAllowedOrigin, originAllowed, removeAllowedOrigin } from '../electron/preview-allowed-origins.mjs';
import { allowedSiteError } from '../src/preview-allowed-sites-model.mjs';

test('mP: an address normalises to its origin', () => {
  assert.equal(normalizeAllowedOrigin('https://Example.com/path?q=1#x'), 'https://example.com');
  assert.equal(normalizeAllowedOrigin('https://www.example.com/'), 'https://example.com', 'www. is dropped for three or more labels');
  assert.equal(normalizeAllowedOrigin('https://www.com/'), 'https://www.com', 'not for two');
  assert.equal(normalizeAllowedOrigin('http://www.printer.local/'), 'http://www.printer.local', 'not for .local');
  assert.equal(normalizeAllowedOrigin('https://example.com.:8443/'), 'https://example.com:8443', 'trailing dot dropped, port kept');
  assert.equal(normalizeAllowedOrigin('https://example.com:443/'), 'https://example.com', 'the default port is no port');
  assert.equal(normalizeAllowedOrigin('http://[::ffff:7f00:1]/'), 'http://127.0.0.1');
  assert.equal(normalizeAllowedOrigin('wss://api.example.com/socket'), 'https://api.example.com', 'a socket reads as its page origin');
  for (const bad of ['ftp://example.com', 'file:///etc/hosts', 'javascript:alert(1)', 'not a url', '', null]) assert.equal(normalizeAllowedOrigin(bad), null, String(bad));
});

test('SNn: adding a site — ok, invalid, loopback, exists', () => {
  let saved = [];
  const add = (value, schemeless) => { const outcome = addAllowedOrigin(saved, value, { schemeless }); if (outcome.result === R.Ok) saved = outcome.list; return outcome.result; };
  assert.equal(add('https://example.com', true), R.Ok);
  assert.deepEqual(saved, ['https://example.com']);
  assert.equal(add('https://www.example.com/docs', false), R.Exists, 'the same origin');
  assert.equal(add('http://example.com', false), R.Ok, 'another scheme is another origin');
  assert.equal(add('https://localhost:3000', true), R.Loopback);
  assert.equal(add('http://127.0.0.1', false), R.Loopback);
  assert.equal(add('https://app.localhost', true), R.Loopback);
  for (const bad of ['https://*.example.com', 'https://example', 'ftp://example.com', '   ', 'https://']) assert.equal(add(bad, false), R.Invalid, bad);
  // _N: cloud metadata endpoints are never allowable (review).
  for (const metadata of ['http://169.254.169.254', 'metadata.google.internal', 'http://[::ffff:a9fe:a9fe]', 'http://[fd00:ec2::254]']) assert.equal(add(metadata, !metadata.includes('://')), R.Invalid, metadata);
  assert.deepEqual(allowedOriginList(['http://169.254.169.254', 'https://example.com']), ['https://example.com'], 'and never read back from the saved list');
  assert.equal(add('docs.example.org', true), R.Ok, 'schemeless reads as https');
  assert.deepEqual(saved, ['https://example.com', 'http://example.com', 'https://docs.example.org']);
});

test('the saved list is cleaned on read; entries and lookups use it', () => {
  const saved = ['https://example.com', 'https://example.com', 'https://EXAMPLE.org/', 'http://localhost:3000', 'https://%2a.example.net', 42, 'https://docs.example.org'];
  assert.deepEqual(allowedOriginList(saved), ['https://example.com', 'https://docs.example.org']);
  assert.deepEqual(allowedOriginEntries(saved), [{ origin: 'https://example.com', builtin: false }, { origin: 'https://docs.example.org', builtin: false }]);
  assert.equal(originAllowed(saved, 'https://www.example.com/a/b'), true);
  assert.equal(originAllowed(saved, 'http://example.com/'), false, 'origin-exact: the scheme counts');
  assert.equal(originAllowed(saved, 'https://evil.example.com/'), false, 'a subdomain is another site');
  assert.equal(originAllowed(saved, 'https://example.com:8443/'), false, 'and so is another port');
  assert.equal(originAllowed(undefined, 'https://example.com/'), false);
});

test('TNn: removing a site; session approvals for it are recognised', () => {
  const saved = ['https://example.com', 'https://docs.example.org'];
  assert.deepEqual(removeAllowedOrigin(saved, 'https://www.example.com/x'), { removed: true, list: ['https://docs.example.org'], origin: 'https://example.com' });
  assert.equal(removeAllowedOrigin(saved, 'https://other.example').removed, false);
  assert.equal(hostMatchesOrigin('example.com', 'https://example.com'), true);
  assert.equal(hostMatchesOrigin('www.example.com', 'https://example.com'), true);
  assert.equal(hostMatchesOrigin('example.com:8443', 'https://example.com'), false);
});

test('c25b1be4a p / c36734a81 g, D and the remove focus order', () => {
  assert.equal(allowedSiteError('invalid'), 'Enter a valid web address.');
  assert.equal(allowedSiteError('loopback'), 'Localhost is always allowed.');
  assert.equal(allowedSiteError('exists'), 'That site is already allowed.');
  assert.equal(allowedSiteError('unavailable'), 'Couldn’t verify this site. Try again.');
  assert.equal(allowedSiteError('ok'), null);
  assert.equal(allowedSiteError('declined'), null);
  assert.equal(allowedSiteError('invalid', (text) => `zh:${text}`), 'zh:Enter a valid web address.');
  // W14-code r4 gen-final-4: allowedSiteLabel / orderedAllowedSites / removeFocusTarget (test-only) are deleted.
});
