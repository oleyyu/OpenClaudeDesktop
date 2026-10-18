import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Guard: every var(--cds-*) in local CSS must name a token that exists. An
// undefined custom property makes the declaration invalid at computed-value
// time (an outline becomes none, a colour inherits). Local fallbacks alone do
// not excuse phantom names. The official sheet may itself use an optional
// token without defining it (2.42304.0 --cds-font-grad); preserve that contract.
const app = path.resolve(import.meta.dirname, '..');
const src = path.join(app, 'src'), official = path.join(app, 'public/assets/v1');
const files = (dir, pattern) => readdirSync(dir).filter((name) => pattern.test(name)).map((name) => path.join(dir, name));
const localCss = files(src, /\.css$/);
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

function definedTokens() {
  const defined = new Set();
  // Declarations in the loaded 2.2553.1 stylesheets and in local CSS.
  for (const file of [...files(official, /\.css$/), ...localCss])
    for (const match of strip(readFileSync(file, 'utf8')).matchAll(/(--cds-[\w-]+)\s*:/g)) defined.add(match[1]);
  // Runtime definitions: quoted names in renderer code, e.g. the
  // style.setProperty loop over "--cds-font-code"/"--cds-font-mono" in main.jsx.
  for (const file of files(src, /\.(js|jsx|mjs)$/))
    for (const match of readFileSync(file, 'utf8').matchAll(/["'`](--cds-[\w-]+)["'`]/g)) defined.add(match[1]);
  return defined;
}

function officialOptionalTokens() {
  const names=new Set();
  for(const file of files(official,/\.css$/))
    for(const match of strip(readFileSync(file,'utf8')).matchAll(/var\(\s*(--cds-[\w-]+)\s*,/g))names.add(match[1]);
  return names;
}

test('every var(--cds-*) in app/src/*.css is defined by the loaded CSS, local CSS or a runtime setProperty', () => {
  const defined = definedTokens();
  const optional=officialOptionalTokens();
  // Sanity: the scan sees the real token sources.
  for (const name of ['--cds-focus-shadow', '--cds-on-primary', '--cds-fill-primary-hover', '--cds-dur-fast', '--cds-text-accent', '--cds-font-code'])
    assert.ok(defined.has(name), name + ' is defined');
  const phantoms = [];
  for (const file of localCss) {
    strip(readFileSync(file, 'utf8')).split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/var\(\s*(--cds-[\w-]+)(\s*,)?/g))
        if (!defined.has(match[1]) && !(match[2] && optional.has(match[1]))) phantoms.push(`${path.basename(file)}:${index + 1} ${match[1]}`);
    });
  }
  assert.deepEqual(phantoms, []);
});

test('the scan reports phantom names with or without a fallback', () => {
  const sample = '.a{outline:2px solid var(--cds-focus-color)}.b{color:var(--cds-text-info, #4b6eab)}.c{color:var(--cds-text-primary)}';
  const defined = definedTokens();
  const found = [...sample.matchAll(/var\(\s*(--cds-[\w-]+)/g)].map((match) => match[1]).filter((name) => !defined.has(name));
  assert.deepEqual(found, ['--cds-focus-color', '--cds-text-info']);
});

test('local CSS never redeclares the --font-anthropic-* chains (design-system.css:181-211 owns them)', () => {
  const redeclared = [];
  for (const file of localCss)
    for (const match of strip(readFileSync(file, 'utf8')).matchAll(/(--font-anthropic-(?:sans|serif|mono))\s*:/g))
      redeclared.push(`${path.basename(file)} ${match[1]}`);
  assert.deepEqual(redeclared, []);
  // The loaded stylesheet does define the full chains (CJK and ui-monospace fallbacks).
  const loaded = readFileSync(path.join(official, 'c6a992d55-sXiDGMFQ.css'), 'utf8');
  // 2.31226.0 routes the sans chain through --font-sans-fallbacks (CJK, then the script fallbacks).
  assert.match(loaded, /--font-anthropic-sans:"anthropic-sans", var\(--font-sans-fallbacks\)/);
  assert.match(loaded, /--font-sans-fallbacks:[^;}]*var\(--font-cjk-sans-fallback\), var\(--font-script-fallbacks\)/);
  assert.match(loaded, /--font-cjk-sans-fallback:[^;}]*var\(--font-cjk-sans-sc\)/);
  assert.match(loaded, /--font-cjk-sans-sc:"PingFang SC"/);
  assert.match(loaded, /--font-anthropic-mono:[^;}]*ui-monospace/);
});
