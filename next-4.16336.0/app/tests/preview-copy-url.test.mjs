// w10-editor-preview-shell-a: the URL copy hook is cut from Claude Desktop 3.6556.2 cf580efe9-BFcQCjF9 (`Ra za Ba`,
// React Compiler output; preload-helper `e` = view-tabs tagErrorText). Both the official slice and the generated adapter
// run in vm contexts with the same hand-built hooks, so the behaviour is compared one to one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { compilerHelpers } from '../scripts/official-3.6556.2.mjs';
import { createMemoCache } from './support/react-memo-cache.mjs';
import { tagErrorText } from '../src/generated/view-tabs/preload-helper-D0dM6GpB.js';

const app = path.resolve(import.meta.dirname, '..');
const officialFile = 'cf580efe9-BFcQCjF9.js';
const original = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', officialFile), 'utf8');
const adapter = fs.readFileSync(path.join(app, 'src/generated/code-editor/preview-copy-url.mjs'), 'utf8');
const nodes = parsers.babel.parse(original, {}).program.body;
const names = ['Ra', 'za', 'Ba'];
const originalBody = names.map(name => {
  const node = nodes.find(node => node.id?.name === name || node.declarations?.some(d => d.id.name === name));
  const binding = node.declarations?.find(d => d.id.name === name);
  return binding ? `const ${original.slice(binding.start, binding.end)};` : original.slice(node.start, node.end);
}).join('\n');
const adaptedBody = adapter.replace(/^import[\s\S]*?from\s*["'][^"']+["'];\n/gm, '').replace('export function', 'function');
const helperSource = Object.values(compilerHelpers).filter(({ local }) => local !== 'J9').map(({ local, feature }) => local === 'J8' ? `const ${feature};` : feature).join('\n');
const helperNames = Object.values(compilerHelpers).filter(({ local }) => local !== 'J9').map(({ local }) => local);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
function host(source = false, { enabled = true, capability = true } = {}) {
  const events = [], writes = [], ref = { current: 0 }, owner = {}, intl = { formatMessage: ({ defaultMessage }) => defaultMessage };
  let identity, cleanup, cache;
  // One component instance: the compiler cache persists across renders like React's useMemoCache.
  const hooks = {
    n: () => ref,
    d: (effect, deps) => { if (identity !== deps[0]) { cleanup?.(); identity = deps[0]; cleanup = effect(); } },
    J9: size => (cache ??= createMemoCache(size)),
    e: tagErrorText,
  };
  const api = { useIntl: () => intl, useToasts: () => Object.fromEntries(['Info', 'Success', 'Error'].map(kind => [`add${kind}`, (message, detail) => events.push({ kind, message, error: detail?.error?.message, log: detail?.messageForLogging })])),
    useOwnerWindow: () => owner, useFeature: () => enabled, useStable: callback => callback,
    writeClipboard: (window, value) => { assert.equal(window, owner); const pending = deferred(); writes.push({ value, ...pending }); return pending.promise; },
    previewApi: capability ? { getPreviewUrl: true, onPreviewUrlChanged: true } : {},
  };
  const context = vm.createContext({ ...hooks, URL, Symbol, Error, Object });
  vm.runInContext(`${helperSource}\nObject.assign(globalThis,{${helperNames.join(',')}});`, context);
  const hook = source
    ? vm.runInContext(`(()=>{${originalBody};return Ba;})()`, Object.assign(context, { Oe: api.useIntl, W: api.useToasts, v: api.useOwnerWindow, $t: api.useFeature, R: api.useStable, x: api.writeClipboard, B: api.previewApi }))
    : vm.runInContext(`${adaptedBody}\ncreatePreviewCopyUrl`, context)(api);
  return { render: (id, url) => hook(id, url), unmount: () => cleanup?.(), events, writes };
}

test('generated copy hook is the 3.6556.2 cf580efe9 Ba slice with the gate and error tag of the original', () => {
  assert.match(adapter.split('\n')[0], /Claude Desktop 3\.6556\.2/);
  for (const feature of ['const Ra = "__gb__110515556";', 'let $ = J9(9)', 's = $t(Ra)', 'messageForLogging: "preview_copy_url_failed"',
    'import { tagErrorText as e } from "../view-tabs/preload-helper-D0dM6GpB.js";', 'return Ba;'])
    assert.ok(adapter.includes(feature), feature);
  assert.ok(!adapter.includes('function Ni('), 'the error tag is the view-tabs preload-helper export, not a second copy');
  assert.ok(original.includes('var Ra="__gb__110515556"') || original.includes('Ra="__gb__110515556"'));
});

for (const source of [true, false]) {
  const kind = source ? 'original' : 'adapter';
  test(`${kind}: copies the full URL and emits source success/error feedback`, async () => {
    const h = host(source), url = 'https://example.test/path?q=a%20b#section';
    const copy = h.render('session-a', url); copy(); assert.equal(h.writes[0].value, url);
    h.writes[0].resolve('written'); await settle(); assert.deepEqual(h.events, [{ kind: 'Success', message: 'URL copied to clipboard.', error: undefined, log: undefined }]);
    copy(); h.writes[1].reject(new Error('clipboard unavailable')); await settle();
    assert.deepEqual(h.events[1], { kind: 'Error', message: 'Couldn’t copy the URL. Try again.', error: 'clipboard unavailable', log: 'preview_copy_url_failed' });
    copy(); h.writes[2].resolve('denied'); await settle(); assert.equal(h.events[2].kind, 'Error');
  });
  test(`${kind}: invalid/missing addresses and unavailable capability do not write`, async () => {
    const h = host(source);
    for (const value of ['file:///tmp/page.html', 'javascript:alert(1)', 'not a url']) h.render('a', value)();
    assert.equal(h.writes.length, 0); assert.equal(h.events.length, 3); assert.ok(h.events.every(e => e.message === 'This only works for websites.'));
    h.render('a', null)(); await settle(); assert.equal(h.events.at(-1).kind, 'Error');
    const count = h.events.length; h.render(null, 'https://example.test')(); await settle(); assert.equal(h.events.length, count);
    assert.equal(host(source, { enabled: false }).render('a', 'https://example.test'), undefined);
    assert.equal(host(source, { capability: false }).render('a', 'https://example.test'), undefined);
  });
  test(`${kind}: stale completion cannot notify after another copy, session change or unmount`, async () => {
    const h = host(source);
    h.render('a', 'https://example.test/one')(); h.render('a', 'https://example.test/two')();
    h.writes[0].resolve('written'); await settle(); assert.equal(h.events.length, 0);
    h.writes[1].resolve('written'); await settle(); assert.equal(h.events.length, 1);
    h.render('a', 'https://example.test/three')(); h.render('b', 'https://example.test/four');
    h.writes[2].reject(new Error('late error')); await settle(); assert.equal(h.events.length, 1);
    h.render('b', 'https://example.test/four')(); h.unmount(); h.writes[3].resolve('written'); await settle(); assert.equal(h.events.length, 1);
  });
}
