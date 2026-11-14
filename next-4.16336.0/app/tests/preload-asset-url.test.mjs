// integration-1 preload-helper: the official Vite preload helper's assetsURL (`a=function(e){return"/"+e}`, 3.6556.2
// preload-helper-D0dM6GpB.js) is answered by the host's viteAssetUrl (src/view-tabs-asset-url.mjs), because this
// host loads dist/index.html over file:// (vite base './'), where "/assets/v1/<sheet>" is file:///assets/v1/<sheet>.
// Checked here: the superseded-sheet table agrees with public/ui-provenance.json legacyDebt and index.html; every
// __vite__mapDeps dependency of the code-transcript, transcript-rows and mcp-app-card graphs resolves to a sheet the
// document links (index.html / CODE_TRANSCRIPT_SHEETS) or to a real public/assets/v1 file; and the generated helper, run
// against a fake document, requests no superseded sheet and finds the linked ones instead of appending them again.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFile(path.join(app, rel), 'utf8');
// Packaged: app://localhost/index.html[?query] (U-2, electron/app-protocol.cjs); file:// dist/index.html only for a launch
// whose localStorage migration failed (main.cjs loadAppPage); dev: the vite server root.
const BASES = ['app://localhost/index.html?window=session', 'file:///Applications/OpenClaude%20Desktop.app/Contents/Resources/app/dist/index.html?window=session', 'http://127.0.0.1:5173/'];
const REGIONS = ['code-transcript', 'transcript-rows', 'mcp-app-card'];

let server, adapters, helper;
const realDocument = globalThis.document, realWindow = globalThis.window;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  adapters = await server.ssrLoadModule('/src/view-tabs-asset-url.mjs');
  helper = await server.ssrLoadModule('/src/generated/view-tabs/preload-helper-D0dM6GpB.js');
});
after(async () => {
  globalThis.document = realDocument; globalThis.window = realWindow;
  if (realDocument === undefined) delete globalThis.document;
  if (realWindow === undefined) delete globalThis.window;
  await closeWhenSettled(server);
});

async function indexSheets() {
  // vite.config.js base './': the built index.html links "./assets/v1/<name>" for the source's "/assets/v1/<name>".
  assert.match(await read('vite.config.js'), /base:\s*['"]\.\/['"]/);
  const html = await read('index.html');
  return [...html.matchAll(/<link rel="stylesheet" href="\/assets\/v1\/([^"]+)"/g)].map(m => m[1]);
}
const transcriptSheets = async () => JSON.parse((await read('src/source-code-transcript.jsx')).match(/CODE_TRANSCRIPT_SHEETS = Object\.freeze\((\[[^\]]*\])\)/)[1]);
const href = (name, base) => new URL('assets/v1/' + name, base).href;

async function mapDeps() {
  const lists = [];
  for (const region of REGIONS) {
    const dir = path.join(app, 'src/generated', region);
    for (const file of (await fs.readdir(dir)).filter(f => /\.m?js$/.test(f))) {
      const text = await fs.readFile(path.join(dir, file), 'utf8');
      for (const m of text.matchAll(/__vite__mapDeps\s*=\s*\([\s\S]*?m\.f\s*=\s*\[([\s\S]*?)\]/g))
        lists.push({ region, file, deps: [...m[1].matchAll(/"([^"]+)"/g)].map(d => d[1]) });
    }
  }
  return lists;
}

test('SUPERSEDED_LEGACY_SHEETS is exactly the legacyDebt sheets whose replacedBy index.html links', async () => {
  const provenance = JSON.parse(await read('public/ui-provenance.json'));
  const linked = await indexSheets(), hostLinked = await transcriptSheets();
  const expected = {};
  for (const debt of provenance.legacyDebt) {
    const replacement = /^[\w-]+\.css\b/.exec(debt.replacedBy)?.[0];
    if (!linked.includes(replacement) || linked.includes(debt.stylesheet) || hostLinked.includes(debt.stylesheet)) continue;
    expected[debt.stylesheet] = replacement;
    assert.equal(debt.packagedLoad, `superseded: vitePreload resolves to the index.html link ${replacement}`, debt.stylesheet);
  }
  assert.deepEqual(adapters.SUPERSEDED_LEGACY_SHEETS, expected);
  assert.deepEqual(Object.entries(adapters.SUPERSEDED_LEGACY_SHEETS).sort(), [
    ['cd5136de8-DQmKjkcG.css', 'shared-styles-C9nbzN1z.css'],
    ['shared-frame-CegduNQ2.css', 'shared-frame-BRemtw6F.css'],
    ['shared-styles-D_GJawPO.css', 'shared-styles-C9nbzN1z.css'],
  ]);
  assert.ok(Object.isFrozen(adapters.SUPERSEDED_LEGACY_SHEETS));
  // The text form prepare-ui.mjs parses is the same table.
  assert.deepEqual(JSON.parse((await read('src/view-tabs-asset-url.mjs')).match(/SUPERSEDED_LEGACY_SHEETS = Object\.freeze\((\{[^}]*\})\)/)[1]), expected);
});

test('the generated helper keeps the official text except assetsURL, which is the host viteAssetUrl', async () => {
  const text = await read('src/generated/view-tabs/preload-helper-D0dM6GpB.js');
  assert.match(text, /^import \{viteAssetUrl as a\} from "\.\.\/\.\.\/view-tabs-asset-url\.mjs";$/m);
  assert.doesNotMatch(text, /return"\/"\+e/);
  const official = await fs.readFile(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/preload-helper-D0dM6GpB.js'), 'utf8');
  assert.ok(official.includes('a=function(e){return"/"+e}'), 'the official declaration the adapter answers');
  assert.equal(helper.a, adapters.viteAssetUrl);
});

test('every __vite__mapDeps dependency of code-transcript, transcript-rows and mcp-app-card resolves to a linked sheet or a real file', async () => {
  const lists = await mapDeps();
  for (const region of REGIONS) assert.ok(lists.some(l => l.region === region), `${region} has __vite__mapDeps`);
  const names = new Set(lists.flatMap(l => l.deps));
  for (const name of ['assets/v1/shared-frame-CegduNQ2.css', 'assets/v1/shared-styles-D_GJawPO.css', 'assets/v1/cd5136de8-DQmKjkcG.css',
    'assets/v1/c19e90103-CuNz46ca.css', 'assets/v1/c6a73f447-LaXKuzWp.css', 'assets/v1/c3fde7009-BszyXGym.css']) assert.ok(names.has(name), name);
  const linked = await indexSheets(), hostLinked = await transcriptSheets();
  for (const base of BASES) {
    globalThis.document = { baseURI: base };
    const linkHrefs = new Set([...linked, ...hostLinked].map(name => href(name, base)));
    for (const { region, file, deps } of lists) for (const dep of deps) {
      assert.match(dep, /^assets\/v1\/[\w-]+\.css$/, `${region}/${file}`);
      const resolved = adapters.viteAssetUrl(dep), label = `${region}/${file} ${dep} @ ${base}`;
      assert.ok(resolved.startsWith(new URL('.', base).href), label);
      assert.doesNotMatch(resolved, /^file:\/\/\/assets\//, label);
      const name = dep.slice('assets/v1/'.length);
      if (Object.hasOwn(adapters.SUPERSEDED_LEGACY_SHEETS, name)) {
        assert.equal(resolved, href(adapters.SUPERSEDED_LEGACY_SHEETS[name], base), label);
        assert.ok(linkHrefs.has(resolved), label);
        continue;
      }
      assert.equal(resolved, href(name, base), label);
      assert.ok(linkHrefs.has(resolved) || existsSync(path.join(app, 'public/assets/v1', name)), label);
    }
  }
});

// A document with index.html's and CODE_TRANSCRIPT_SHEETS' links; appended links load (or fail) on the next tick.
// The helper's per-document dedupe table (`o`, exported by the generated module) starts empty for each fake document.
function fakeDocument(base, linkedNames, missing = new Set()) {
  for (const key of Object.keys(helper.o)) delete helper.o[key];
  const links = linkedNames.map(name => ({ rel: 'stylesheet', href: href(name, base), hasAttribute: () => false }));
  const appended = [];
  globalThis.window = { event: undefined, dispatchEvent: () => true };
  globalThis.document = {
    baseURI: base,
    getElementsByTagName: tag => (tag === 'link' ? links : []),
    querySelector: () => null,
    createElement: () => {
      const listeners = {};
      return { rel: '', href: '', relList: { supports: () => true }, setAttribute() {}, hasAttribute: () => false, remove() {},
        addEventListener(type, fn) { listeners[type] = fn; }, fire(type) { listeners[type]?.(); } };
    },
    head: { appendChild(link) { appended.push(link); links.push(link); setImmediate(() => link.fire(missing.has(link.href) ? 'error' : 'load')); } },
  };
  return appended;
}

test('vitePreload over the transcript graph requests no superseded sheet and does not re-append linked ones', async () => {
  const lists = await mapDeps();
  const linked = [...await indexSheets(), ...await transcriptSheets()];
  for (const base of BASES) {
    for (const { region, file, deps } of lists) {
      // Anything outside dist/assets/v1 (the official "/"+dep under file://) would not load.
      const outside = deps.filter(dep => new URL('/' + dep, base).href !== href(dep.slice(10), base)).map(dep => new URL('/' + dep, base).href);
      const appended = fakeDocument(base, linked, new Set(outside));
      const label = `${region}/${file} @ ${base}`;
      assert.deepEqual(await helper.vitePreload(() => Promise.resolve('module'), deps), 'module', label);
      for (const link of appended) {
        assert.doesNotMatch(link.href, /CegduNQ2|D_GJawPO|cd5136de8/, label);
        assert.ok(!linked.some(name => href(name, base) === link.href), `${label}: ${link.href} appended twice`);
        assert.ok(existsSync(path.join(app, 'public/assets/v1', link.href.slice(href('', base).length))), `${label}: ${link.href}`);
      }
      const expected = deps.map(dep => dep.slice(10)).filter(name => !Object.hasOwn(adapters.SUPERSEDED_LEGACY_SHEETS, name) && !linked.includes(name));
      assert.deepEqual(appended.map(link => link.href).sort(), [...new Set(expected)].map(name => href(name, base)).sort(), label);
    }
  }
  // The full code-transcript list appends only the 4.16336.0 lazy sheet c6a73f447 once its linked siblings are found.
  const full = lists.find(l => l.region === 'code-transcript' && l.file === 'code-transcript.mjs');
  assert.ok(full, 'code-transcript.mjs __vite__mapDeps');
  const appended = fakeDocument(BASES[0], linked);
  await helper.vitePreload(() => Promise.resolve(null), full.deps);
  assert.deepEqual(appended.map(link => link.href), [href('c6a73f447-LaXKuzWp.css', BASES[0])]);
});
