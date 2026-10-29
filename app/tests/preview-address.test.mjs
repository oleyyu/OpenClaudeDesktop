import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parsePreviewAddress as parse } from '../electron/generated/preview-address-parser.mjs';
import { previewAddressTarget as target } from '../electron/preview-address.mjs';

test('original address parser resolves website paths and carries the current scheme', () => {
  assert.deepEqual(parse('/about?q=1', 'https://example.test/a'), { kind: 'navigate', url: 'https://example.test/about?q=1' });
  assert.deepEqual(parse('/about', ''), { kind: 'file', path: '/about' });
  assert.deepEqual(parse('other.test/path', 'http://localhost:3000/'), { kind: 'navigate', url: 'http://other.test/path' });
  assert.deepEqual(parse('intranet:8080', ''), { kind: 'navigate', url: 'https://intranet:8080' });
  assert.deepEqual(parse('example.test', ''), { kind: 'navigate', url: 'https://example.test' });
  assert.deepEqual(parse('localhost:3000', ''), { kind: 'navigate', url: 'http://localhost:3000' });
  assert.deepEqual(parse('127.2.3.4:3000', ''), { kind: 'navigate', url: 'http://127.2.3.4:3000' });
  assert.deepEqual(parse('sub.localhost:3000', 'https://localhost:3000/'), { kind: 'navigate', url: 'https://sub.localhost:3000' });
  assert.deepEqual(parse('sub.localhost:3001', 'https://localhost:3000/'), { kind: 'navigate', url: 'http://sub.localhost:3001' });
  assert.deepEqual(parse('example.test/path', 'https://example.test/path'), { kind: 'navigate', url: 'https://example.test/path' });
});

test('original parser protects credential-like searches and handles malformed Unicode', () => {
  for (const input of ['user:secret@example.test', 'ghp_fake@example.test', 'github_pat_fake@example.test', 'glpat-fake@example.test']) assert.equal(parse(input, ''), null, input);
  assert.deepEqual(parse('find café', ''), { kind: 'search', url: 'https://www.google.com/search?q=find%20caf%C3%A9' });
  assert.deepEqual(parse('hello\ud800 world', ''), { kind: 'search', url: 'https://www.google.com/search?q=hello%EF%BF%BD%20world' });
  assert.equal(parse('\ud800/secret', ''), null, 'removing an unpaired surrogate would expose a path');
  assert.equal(parse('local\ud800host:3000', ''), null, 'removing an unpaired surrogate would produce a URL');
  assert.equal(parse('file://remote/private', ''), null);
  assert.equal(parse('\\\\server\\private', ''), null);
  assert.equal(parse('  ', ''), null);
});

test('host resolves source file intents relative to the session; displayed file path reloads', () => {
  const cwd=path.resolve('/tmp/project'),home=path.resolve('/tmp/home'),file=path.join(cwd,'a b.html'),url=pathToFileURL(file).href;
  assert.deepEqual(target('./a b.html', 'http://localhost:3000/', {cwd,home}), {kind:'file',url});
  assert.deepEqual(target(url, '', {cwd,home}), {kind:'file',url});
  assert.deepEqual(target(file, url, {cwd,home}), {kind:'reload',url});
  assert.deepEqual(target('~/file.html', '', {cwd,home}), {kind:'file',url:pathToFileURL(path.join(home,'file.html')).href});
  assert.deepEqual(target('/about', 'http://localhost:3000/', {cwd,home}), {kind:'navigate',url:'http://localhost:3000/about'});
  for (const value of ['some file words', '$HOME/private', '%USERPROFILE%/private']) assert.equal(target(value,url,{cwd,home}),null,value);
  assert.equal(target(null,url,{cwd,home}),null);
  assert.deepEqual(target('https://example.test',url,{cwd,home}),{kind:'navigate',url:'https://example.test'});
});

// w10-editor-desktop: the eight desktop-area adapters (and their seven electron copies) are cut from 3.6556.2.
test('desktop code-editor adapters are generated from the 3.6556.2 snapshot', async () => {
  const fs = await import('node:fs');
  const app = path.resolve(import.meta.dirname, '..');
  const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
  const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
  const area = JSON.parse(read('src/generated/code-editor/areas/desktop.json'));
  const manifest = JSON.parse(read('src/generated/code-editor/manifest.json'));
  assert.equal(area.referenceVersion, '3.6556.2');
  const names = ['search.mjs', 'editor-location.cjs', 'side-chat-history.cjs', 'preview-element-inspector.mjs', 'preview-address-parser.mjs', 'preview-tab-shortcuts.mjs', 'preview-link-decisions.mjs', 'preview-link-origin.mjs'];
  assert.deepEqual(area.adapters.map(entry => entry.name), names);
  for (const entry of area.adapters) {
    assert.equal(entry.referenceVersion, '3.6556.2', entry.name);
    assert.equal(manifest.modules.find(module => module.target === entry.name)?.referenceVersion, '3.6556.2', entry.name);
    assert.match(read(`src/generated/code-editor/${entry.name}`).split('\n')[0], /^\/\/ Original 3\.6556\.2 /, entry.name);
    for (const ref of entry.sources) {
      assert.ok(ref.base === 'ion' || ref.base === 'asar', `${entry.name} ${ref.name}`);
      assert.ok(fs.existsSync(path.join(snapshot, ref.base === 'ion' ? 'ion-dist/assets/v1' : 'asar/.vite/build', ref.name)), ref.name);
    }
  }
  assert.equal(area.copies.length, 7);
  for (const copy of area.copies) assert.equal(read(copy.target), read(`src/generated/code-editor/${copy.name}`), copy.target);
  // Official text that changed in 3.6556.2 and is carried verbatim (minified spelling in the chunk, formatted here).
  const official = (dir, name) => fs.readFileSync(path.join(snapshot, dir, name), 'utf8');
  const ion = name => official('ion-dist/assets/v1', name), asar = name => official('asar/.vite/build', name);
  assert.ok(ion('cc3bc2027-CqmDBxcX.js').includes('p=`(?<!${f}\\\\p{M}*)`,m=`(?!${f}|\\\\p{M})`'));
  assert.ok(read('src/generated/code-editor/search.mjs').includes('p = `(?<!${f}\\\\p{M}*)`,'));
  assert.ok(ion('c224804cc-Ct9XIdre.js').includes('ce.has(s[1].toLowerCase())&&URL.canParse(n)'));
  assert.ok(read('src/generated/code-editor/preview-address-parser.mjs').includes('ce.has(s[1].toLowerCase()) && URL.canParse(n)'));
  assert.ok(ion('c11959232-TLc_9Vpx.js').includes('e.cloudSession&&!e.infraOk?"release":"none"'));
  assert.ok(read('src/generated/code-editor/preview-link-decisions.mjs').includes('e.cloudSession && !e.infraOk'));
  assert.ok(asar('index.chunk-jPKPzV-P.js').includes('function YM(e){return gWn(e)!==null}'));
  assert.ok(read('src/generated/code-editor/preview-link-origin.mjs').includes('return gWn(e) !== null;'));
  assert.ok(asar('index.chunk-DNPOm2Zc.js').includes('`Assistant: ${u0(Fe.t(e.text))}`'));
  assert.ok(read('src/generated/code-editor/side-chat-history.cjs').includes('`Assistant: ${u0(Fe.t(e.text))}`'));
});

test('3.6556.2 Preview address parser keeps the original classification rules', () => {
  assert.equal(parse('ftp://example.com', '').kind, 'search');
  assert.deepEqual(parse('https://example.com/a', ''), { kind: 'navigate', url: 'https://example.com/a' });
  assert.equal(parse('https://exa mple.com', '')?.kind, 'search');
});
