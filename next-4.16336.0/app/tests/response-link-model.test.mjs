import test from 'node:test';
import assert from 'node:assert/strict';
import { responseFileReference, responseLinkTarget, responseUrlLabel, responseForgeRef, forgeRefLabel, forgeRefLabelMatches, forgeRefSameRepo, forgeRepoSlug } from '../src/response-link-model.mjs';

test('response file hrefs include extensionless/relative names, decoded spaces, and ordered line ranges', () => {
  assert.deepEqual(responseFileReference('README'), { path: 'README' });
  assert.deepEqual(responseFileReference('./src/app.ts:19-12'), { path: './src/app.ts', line: 12, endLine: 19 });
  assert.deepEqual(responseFileReference('src/app.ts:8:4'), { path: 'src/app.ts', line: 8 });
  assert.deepEqual(responseFileReference('src/app.ts#L9-L3'), { path: 'src/app.ts', line: 3, endLine: 9 });
  assert.deepEqual(responseFileReference('file:///tmp/My%20File.ts#L4-4'), { path: '/tmp/My File.ts', line: 4 });
  assert.deepEqual(responseFileReference('file:///tmp/hash%23name.ts:2'), { path: '/tmp/hash#name.ts', line: 2 });
  assert.deepEqual(responseFileReference('file:///tmp/literal%ZZ.ts'), { path: '/tmp/literal%ZZ.ts' });
  assert.deepEqual(responseFileReference('src/app.ts:2#L8'), { path: 'src/app.ts', line: 2 });
});
test('response href parser rejects network/device URLs, schemes and hash-only references', () => {
  for (const value of ['', '#L2', 'https://example.test', 'file://server/share/file.ts', '//server/file.ts', '\\\\server\\file.ts', 'file:///%2fserver/share.ts', 'mailto:a@b.test', 'javascript:alert(1)', 'data:text/plain,hi']) assert.equal(responseFileReference(value), null, value);
  // Qe's scheme pattern requires at least two letters/characters before ':',
  // so a one-letter drive is a file path, including normalized file:///C:/.
  assert.deepEqual(responseFileReference('C:/src/app.ts'), { path: 'C:/src/app.ts' });
  assert.deepEqual(responseFileReference('file:///C:/src/app.ts'), { path: 'C:/src/app.ts' });
});
test('actual workspace restrictions still apply, missing files remain openable, and only HTTP(S) is external', () => {
  assert.deepEqual(responseLinkTarget('file:///net/share/a.ts', '/project'), { kind: 'file', file: { path: '/net/share/a.ts' }, openable: false });
  assert.deepEqual(responseLinkTarget('missing.ts#L2', '/project'), { kind: 'file', file: { path: 'missing.ts', line: 2 }, openable: true });
  assert.deepEqual(responseLinkTarget('HTTPS://example.test/a', '/project'), { kind: 'external', href: 'https://example.test/a' });
  assert.deepEqual(responseLinkTarget('mailto:a@b.test', '/project'), { kind: 'plain' });
});
test('plain URL labels shorten their own target only, retain meaningful filename and full tooltip', () => {
  const url = 'https://example.test/' + 'parent/'.repeat(32) + 'important-file.ts?token=' + 'x'.repeat(200);
  const result = responseUrlLabel(url, url);
  assert.ok(result.label.startsWith('example.test/'));
  assert.ok(result.label.endsWith('/important-file.ts?…'));
  assert.ok(Array.from(result.label).length <= 120);
  assert.equal(result.title, url);
  assert.equal(responseUrlLabel('Read documentation', url), null);
  assert.equal(responseUrlLabel(url, 'https://other.test'), null);
  assert.equal(responseUrlLabel('https://example.test/a', 'https://example.test/a'), null);
  const auth = 'https://user:secret@example.test/' + 'x'.repeat(300);
  assert.equal(responseUrlLabel(auth, auth), null);
});
test('long URL truncation keeps HTTP scheme, Unicode code points and complete percent triplets', () => {
  for (const leaf of ['%E4%BD%A0'.repeat(50), '😀'.repeat(210)]) {
    const url = 'http://example.test/' + leaf;
    const result = responseUrlLabel(url, url);
    assert.ok(result.label.startsWith('http://example.test/'));
    assert.ok(Array.from(result.label).length <= 120);
    assert.doesNotMatch(result.label, /%(?:[a-f\d])?…|…[a-f\d]{1,2}%/i);
    assert.equal(result.label.isWellFormed(), true);
  }
  const huge = 'https://example.test/' + '😀'.repeat(700);
  assert.equal(Array.from(responseUrlLabel(huge, huge).title).length, 601);
});

// R08: markdown-current.js:3580-3687 Ps/zs/Rs/Ks/Gs.
test('GitHub PR/issue URLs parse to forge references; ports, credentials and dot segments do not', () => {
  assert.deepEqual(responseForgeRef('https://github.com/acme/widgets/pull/42'), { host: 'github.com', owner: 'acme', repo: 'widgets', kind: 'pull', number: 42 });
  assert.deepEqual(responseForgeRef('https://www.GitHub.com/acme/widgets/issues/7#issuecomment-1'), { host: 'github.com', owner: 'acme', repo: 'widgets', kind: 'issues', number: 7 });
  assert.deepEqual(responseForgeRef('http://github.com/a.b/c-d_e/pull/9/files'), { host: 'github.com', owner: 'a.b', repo: 'c-d_e', kind: 'pull', number: 9 });
  // new URL() resolves a literal '.' segment before Ps reads the path, as in the source.
  assert.equal(responseForgeRef('https://github.com/acme/widgets/pull/42/./files')?.number, 42);
  for (const value of [
    'https://github.com:8443/acme/widgets/pull/42', 'https://github.com:443/acme/widgets/pull/42', 'https://user:pw@github.com/acme/widgets/pull/42',
    'https://user@github.com/acme/widgets/pull/42', 'https://github.com/acme/widgets/pull/42/../43', 'https://github.com/acme/widgets/pull/42/a%2fb',
    'https://github.com/acme/widgets/pull/42/%2e%2e/x', 'https://github.com/acme/widgets/pull/42/x%2Ey', 'https://github.com/acme/widgets/pull/42/a%5Cb', 'https://gitlab.com/acme/widgets/pull/42',
    'https://example.test/acme/widgets/pull/42', 'https://github.com/acme/widgets/pulls/42', 'https://github.com/acme/widgets/pull/1234567890',
    'https://github.com/acme/widgets/pull/42x', 'https://github.com/acme/wid gets/pull/4', 'github.com/acme/widgets/pull/42', '', null,
  ]) assert.equal(responseForgeRef(value), null, String(value));
});
test('forge labels: #N in the session repo, owner/repo#N elsewhere, deep-link suffixes', () => {
  const href = 'https://github.com/Acme/Widgets/pull/42', ref = responseForgeRef(href);
  assert.equal(forgeRefLabel(href, ref, true), '#42');
  assert.equal(forgeRefLabel(href, ref, false), 'Acme/Widgets#42');
  for (const [suffix, label] of [['/files', '(files)'], ['/commits', '(commits)'], ['/checks', '(checks)'], ['/files/', '(files)'], ['#issuecomment-12', '(comment)'],
    ['#discussion_r9', '(comment)'], ['#pullrequestreview-3', '(review)']])
    assert.equal(forgeRefLabel(href + suffix, ref, false), `Acme/Widgets#42 ${label}`, suffix);
  for (const suffix of ['/files?w=1', '/changes', '#top', '?tab=files', '/commits/abc'])
    assert.equal(forgeRefLabel(href + suffix, ref, true), suffix === '/commits/abc' ? '#42 (commits)' : '#42', suffix);
  assert.equal(forgeRefSameRepo(ref, 'acme/widgets'), true);
  assert.equal(forgeRefSameRepo(ref, 'acme/other'), false);
  assert.equal(forgeRefSameRepo(ref, ''), false);
  assert.equal(forgeRepoSlug({ owner: 'Acme', name: 'Widgets' }), 'acme/widgets');
  assert.equal(forgeRepoSlug({ owner: null, name: 'local' }), '');
  assert.equal(forgeRepoSlug(undefined), '');
});
test('Gs: only an empty, short-ref or same-URL label becomes the chip', () => {
  const ref = responseForgeRef('https://github.com/acme/widgets/issues/7');
  for (const label of ['', ' \n', '#7', 'acme/widgets#7', 'ACME/Widgets#7', 'https://github.com/acme/widgets/issues/7',
    'https://www.github.com/ACME/widgets/issues/7#issuecomment-2', 'https://github.com/acme/widgets/pull/7'])
    assert.equal(forgeRefLabelMatches(label, ref), true, label);
  for (const label of ['Fix the widget', '#8', 'other/widgets#7', 'acme/widgets #7', 'issue 7', 'https://github.com/acme/widgets/issues/8',
    'https://gitlab.com/acme/widgets/issues/7', '\u00a0#7'])
    assert.equal(forgeRefLabelMatches(label, ref), false, label);
});
