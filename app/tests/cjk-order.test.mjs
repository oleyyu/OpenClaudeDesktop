import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cjkOrderOf, cjkOrder, preferredLanguages, applyCjkOrder } from '../src/cjk-order.mjs';
import languages from '../electron/system-languages.cjs';

const app = path.resolve(import.meta.dirname, '..');

// ion-dist/index.html (2.31226.0) inline script e(): tag → order.
test('cjkOrderOf follows the index.html script: script subtag, then region, then yue', () => {
  assert.equal(cjkOrderOf('ja-JP'), 'ja');
  assert.equal(cjkOrderOf('ko'), 'ko');
  assert.equal(cjkOrderOf('zh-Hans-CN'), 'zh-hans');
  assert.equal(cjkOrderOf('zh-Hant-HK'), 'zh-hant');
  assert.equal(cjkOrderOf('zh-TW'), 'zh-hant');
  assert.equal(cjkOrderOf('zh_HK'), 'zh-hant');
  assert.equal(cjkOrderOf('zh-MO'), 'zh-hant');
  assert.equal(cjkOrderOf('zh-CN'), 'zh-hans');
  assert.equal(cjkOrderOf('zh'), 'zh-hans');
  assert.equal(cjkOrderOf('yue'), 'zh-hant');
  assert.equal(cjkOrderOf('zh-Hans-TW'), 'zh-hans', 'the script subtag wins over the region');
  for (const tag of ['en-US', 'fr', '', null, 42]) assert.equal(cjkOrderOf(tag), null, String(tag));
});

test('the first CJK language decides; the desktop list wins over navigator.languages when non-empty', () => {
  assert.equal(cjkOrder(['en-US', 'ja-JP', 'zh-CN']), 'ja');
  assert.equal(cjkOrder(['en-US', 'fr']), null);
  assert.deepEqual(preferredLanguages(['en-US', 7, 'ko-KR'], ['zh-TW']), ['en-US', 'ko-KR']);
  assert.deepEqual(preferredLanguages([], ['zh-TW']), ['zh-TW']);
  assert.deepEqual(preferredLanguages([3], ['zh-TW']), ['zh-TW'], 'a list with no strings falls back');
  assert.deepEqual(preferredLanguages(undefined, undefined), []);
  // Local addition: the zh-CN interface decides only when no system language is CJK.
  assert.equal(cjkOrder(['en-US'], 'zh-CN'), 'zh-hans');
  assert.equal(cjkOrder(['ja'], 'zh-CN'), 'ja');
  assert.equal(cjkOrder([], 'en-US'), null);
});

test('applyCjkOrder writes or clears html[data-cjk-order]', () => {
  const attributes = new Map();
  const root = { setAttribute: (name, value) => attributes.set(name, value), removeAttribute: (name) => attributes.delete(name) };
  assert.equal(applyCjkOrder(root, { desktopLanguages: ['en-GB', 'zh-Hant-TW'], navigatorLanguages: ['ja'] }), 'zh-hant');
  assert.equal(attributes.get('data-cjk-order'), 'zh-hant');
  assert.equal(applyCjkOrder(root, { desktopLanguages: [], navigatorLanguages: ['en-US'], uiLocale: 'en-US' }), null);
  assert.equal(attributes.has('data-cjk-order'), false);
  assert.equal(applyCjkOrder(root, { navigatorLanguages: ['en-US'], uiLocale: 'zh-CN' }), 'zh-hans');
  assert.equal(applyCjkOrder(null, { navigatorLanguages: ['ko'] }), 'ko');
});

// index.chunk-CiiI592G.js JDr over app.getPreferredSystemLanguages().
test('preferredSystemLanguages normalises like JDr', () => {
  assert.deepEqual(languages.preferredSystemLanguages(['zh_Hans_CN.UTF-8', 'en_US@euro', 'C', 'POSIX', '', 'zh-Hans-CN', 'ja-JP']), ['zh-Hans-CN', 'en-US', 'ja-JP']);
  assert.deepEqual(languages.preferredSystemLanguages(null), []);
  assert.deepEqual(languages.preferredSystemLanguages(['en-US', 5]), ['en-US']);
});

// The loaded design-system CSS reorders the CJK chains and widens --cds-font-system for any data-cjk-order value.
test('the loaded CSS has the data-cjk-order rules the attribute drives', () => {
  const css = readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  assert.ok(css.includes('html[data-cjk-order=zh-hant],:root:lang(zh-Hant){--font-cjk-sans-fallback:var(--font-cjk-sans-tc)'));
  assert.ok(css.includes('html[data-cjk-order=ja],:root:lang(ja){'));
  assert.ok(css.includes('html[data-cjk-order=ko],:root:lang(ko){'));
  assert.match(css, /html\[data-cjk-order\],:root:lang\(ja\),:root:lang\(ko\),:root:lang\(zh-Hans\),:root:lang\(zh-Hant\)\{--cds-font-system:[^}]*var\(--font-cjk-sans-fallback\)/);
  const main = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /applyCjkOrder\(document\.documentElement, \{ desktopLanguages: api\?\.appearance\?\.preferredLanguages, navigatorLanguages: navigator\.languages, uiLocale: getLocale\(\) \}\)/);
});
