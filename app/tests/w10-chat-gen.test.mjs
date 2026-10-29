import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource, referenceSnapshot } from '../scripts/official-3.6556.2.mjs';
// E42: shared-104's liveStatus slice is a pure file, so plain node imports it.
import { sessionLiveStatus } from '../src/generated/chat/shared-104-CTONUSaz.js';

// w10-chat-gen: src/generated/chat is the 3.6556.2 slice (research/w10-chat.md §3.2): createIntl / FormattedRelativeTime
// (vendor-intl Ht / en), the Ideas preview class (shared-9 wD literal), the HandBlocks pictogram data (cbcaf521a e) and
// sessionLiveStatus (shared-104 _x), plus E34 re-export shims for the 2.2553.1 names current-chat still imports.
// Official chunks are read as text, never executed; SSR in middleware mode only.
const root = path.resolve(import.meta.dirname, '..');
const chatDir = path.join(root, 'src/generated/chat');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const official = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const manifest = JSON.parse(read('src/generated/chat/manifest.json'));
const h = React.createElement;
let server, intl, composerSlice;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  intl = await server.ssrLoadModule('/src/generated/chat/vendor-intl-DYfox5Co.js');
  composerSlice = await server.ssrLoadModule('/src/generated/chat/shared-9-CM21XrJw.js');
});
after(() => server?.close());

// Named imports of src/generated/chat/<file> from the other generated folders (an independent scan of the same
// statements the generator derives the shims from).
function chatImportsOfGeneratedFolders() {
  const found = {};
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (full !== chatDir) walk(full); continue; }
      if (!/\.m?js$/.test(entry.name)) continue;
      for (const m of fs.readFileSync(full, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
        const target = path.resolve(path.dirname(full), m[2]);
        if (path.dirname(target) !== chatDir) continue;
        const file = path.basename(target);
        for (const spec of m[1].split(',').map(s => s.trim()).filter(Boolean)) (found[file] ??= new Set()).add(spec.split(/\s+as\s+/)[0]);
      }
    }
  };
  walk(path.join(root, 'src/generated'));
  return Object.fromEntries(Object.entries(found).map(([file, names]) => [file, [...names].sort()]));
}

test('manifest: 3.6556.2, and the folder holds exactly the modules, the legacy shims and the manifest', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, referenceSnapshot);
  assert.equal(manifest.generator, 'scripts/extract-chat-ui.mjs');
  const listed = [...manifest.modules.map(m => m.target), ...Object.keys(manifest.legacy), 'manifest.json'].sort();
  assert.deepEqual(fs.readdirSync(chatDir).sort(), listed);
  assert.deepEqual(manifest.modules.map(m => m.target).sort(),
    ['cbcaf521a-CrWJ5SHy.js', 'shared-104-CTONUSaz.js', 'shared-9-CM21XrJw.js', 'vendor-intl-DYfox5Co.js']);
  for (const m of manifest.modules) assert.equal(m.referenceVersion, '3.6556.2', m.target);
  // The 2.2553.1 slice (63 modules and provenance.json) is gone.
  assert.equal(fs.existsSync(path.join(chatDir, 'provenance.json')), false);
  for (const file of fs.readdirSync(chatDir).filter(f => f.endsWith('.js')))
    assert.doesNotMatch(fs.readFileSync(path.join(chatDir, file), 'utf8'), /2\.2553\.1 [\w-]+\.js\. Only asset URLs/, file);
});

test('createIntl is react-intl createIntl (vendor-intl Ht) and formats ICU plurals', () => {
  assert.equal(typeof intl.createIntl, 'function');
  const i = intl.createIntl({ locale: 'en-US', messages: {} });
  assert.equal(i.formatMessage({ id: 'x', defaultMessage: '{n, plural, one {# file} other {# files}}' }, { n: 2 }), '2 files');
  assert.equal(i.formatMessage({ id: 'x', defaultMessage: '{n, plural, one {# file} other {# files}}' }, { n: 1 }), '1 file');
  assert.equal(i.formatMessage({ id: 'y', defaultMessage: 'Hello {name}' }, { name: 'a.txt' }), 'Hello a.txt');
  // A catalog entry wins over the default message.
  const zh = intl.createIntl({ locale: 'zh-CN', messages: { y: '你好 {name}' } });
  assert.equal(zh.formatMessage({ id: 'y', defaultMessage: 'Hello {name}' }, { name: 'a' }), '你好 a');
  assert.equal(manifest.publicNames.createIntl.local, 'Ht');
  assert.equal(manifest.publicNames.createIntl.export, 'u');
});

test('ideaPreviewClass is the shared-9 wD literal and renders as the preview class', () => {
  assert.equal(composerSlice.ideaPreviewClass, 'animate-preview-prompt-in line-clamp-2 text-muted-as-secondary');
  assert.equal(renderToStaticMarkup(h('p', { className: composerSlice.ideaPreviewClass }, 'Idea')),
    '<p class="animate-preview-prompt-in line-clamp-2 text-muted-as-secondary">Idea</p>');
  const entry = manifest.publicNames.ideaPreviewClass;
  assert.equal(entry.owner, 'wD');
  const text = official('shared-9-CM21XrJw.js');
  assert.equal(text.slice(entry.start, entry.end), '"animate-preview-prompt-in line-clamp-2 text-muted-as-secondary"');
  const owner = text.slice(text.indexOf('function wD('), text.indexOf('function wD(') + 40000);
  assert.ok(owner.includes('className:"animate-preview-prompt-in line-clamp-2 text-muted-as-secondary"'));
});

test('sessionLiveStatus is shared-104 _x (plain node import)', () => {
  assert.equal(sessionLiveStatus({ pendingToolPermissions: [1] }), 'awaiting');
  assert.equal(sessionLiveStatus({ liveStatus: 'awaiting' }), 'awaiting');
  assert.equal(sessionLiveStatus({ liveStatus: 'running' }), 'running');
  assert.equal(sessionLiveStatus({ isRunning: true }), 'running');
  assert.equal(sessionLiveStatus({ isRunning: true, pendingToolPermissions: [] }), 'running');
  assert.equal(sessionLiveStatus({}), 'idle');
  assert.equal(sessionLiveStatus({ pendingToolPermissions: [1] }, false, true), 'idle');
  assert.equal(sessionLiveStatus({}, true), 'awaiting');
  assert.doesNotMatch(read('src/generated/chat/shared-104-CTONUSaz.js'), /^import /m);
});

test('HandBlocksDef is the byte-identical cbcaf521a data, exported as e and HandBlocksDef', async () => {
  const slice = await server.ssrLoadModule('/src/generated/chat/cbcaf521a-CrWJ5SHy.js');
  assert.equal(slice.e, slice.HandBlocksDef);
  assert.equal(slice.e.name, 'HandBlocks');
  const text = official('cbcaf521a-CrWJ5SHy.js');
  assert.ok(text.endsWith('export{e as HandBlocksDef};'));
  // Every path of the official data is in the slice.
  for (const d of [...slice.e.highlight, ...slice.e.line]) assert.ok(text.includes(JSON.stringify(d)), d.slice(0, 40));
  // E36: the official file name is unchanged, so no shim is written for it.
  assert.equal(Object.hasOwn(manifest.legacy, 'cbcaf521a-CrWJ5SHy.js'), false);
});

test('legacy shims: exactly the names current-chat imports, each re-exporting the one 3.6556.2 copy', async () => {
  const derived = chatImportsOfGeneratedFolders();
  const newFiles = new Set(manifest.modules.map(m => m.target));
  const legacyDerived = Object.fromEntries(Object.entries(derived).filter(([file]) => !newFiles.has(file)));
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.legacy).map(([file, e]) => [file, Object.keys(e.exports).sort()])), legacyDerived);
  const targets = {
    'vendor-intl-Cf4IuK3L.js#$t': ['./vendor-intl-DYfox5Co.js', 'FormattedRelativeTime'],
    'shared-frame-C_2npUJq.js#X': ['../view-tabs/shared-frame-6jtSkIit.js', 'cdsClassNames'],
    'shared-8-B5xbG2px.js#vl': ['../code-composer/chat-composer-dock.mjs', 'ComposerDockContext'],
  };
  for (const [file, entry] of Object.entries(manifest.legacy)) {
    const text = read(`src/generated/chat/${file}`);
    for (const [name, e] of Object.entries(entry.exports)) {
      assert.deepEqual([e.from, e.name], targets[`${file}#${name}`], `${file}#${name}`);
      assert.ok(text.includes(`import { ${e.name} as ${name} } from ${JSON.stringify(e.from)};`), `${file}#${name}`);
      const shim = await server.ssrLoadModule(`/src/generated/chat/${file}`);
      const resolved = path.posix.normalize(path.posix.join('/src/generated/chat', e.from));
      const target = await server.ssrLoadModule(resolved);
      assert.equal(shim[name], target[e.name], `${file}#${name} is ${resolved}#${e.name}`);
    }
  }
  // The re-export targets are the published 3.6556.2 copies.
  const viewTabs = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(viewTabs.publicNames.cdsClassNames, { file: 'shared-frame-6jtSkIit.js', local: 'Q', export: 'Hf' });
  const composer = JSON.parse(read('src/generated/code-composer/manifest.json'));
  const dock = composer.modules.find(m => m.target === 'chat-composer-dock.mjs');
  assert.equal(dock.source, 'shared-1-BJhqMmkf.js');
  assert.equal(dock.exports.hd, 'ComposerDockContext');
});

test('FormattedRelativeTime (vendor-intl en) renders through the host HomeRelativeTime', () => {
  if (!intl.FormattedRelativeTime) return; // emitted only while current-chat imports the legacy $t
  assert.equal(intl.FormattedRelativeTime.displayName, 'FormattedRelativeTime');
  assert.equal(renderToStaticMarkup(h(intl.FormattedRelativeTime, { value: -120, unit: 'second' })), '120 seconds ago');
  assert.equal(renderToStaticMarkup(h(intl.FormattedRelativeTime, { value: 1, unit: 'day' })), 'tomorrow');
  assert.match(read('src/generated/chat/vendor-intl-DYfox5Co.js'), /^import \{ HomeRelativeTime as \$t \} from "\.\.\/\.\.\/source-home-adapters\.jsx";$/m);
});

test('every public name is pinned on the official 3.6556.2 text', () => {
  const VI = 'vendor-intl-DYfox5Co.js';
  const vi = official(VI);
  assert.equal(count(vi, 'Ht=({defaultRichTextElements:e,...t},n)=>'), 1);
  assert.match(vi, /export\{[^}]*\bHt as u\b[^}]*\}/);
  assert.match(vi, /export\{[^}]*\ben as a\b[^}]*\}/);
  assert.equal(count(vi, 'en.displayName="FormattedRelativeTime"'), 1);
  assert.ok(vi.includes('Missing locale data for locale'));
  const s104 = official('shared-104-CTONUSaz.js');
  assert.equal(count(s104, 'function _x(e,t=!1,n=!1){return t||e.liveStatus==="awaiting"?"awaiting":e.liveStatus?e.liveStatus:!n&&e.pendingToolPermissions?.length?"awaiting":e.isRunning?"running":"idle"}'), 1);
  assert.match(s104, /export\{[^}]*\b_x as ml\b[^}]*\}/);
  assert.equal(count(official('shared-9-CM21XrJw.js'), '"animate-preview-prompt-in line-clamp-2 text-muted-as-secondary"'), 1);
  assert.ok(official('cbcaf521a-CrWJ5SHy.js').startsWith('var e={name:"HandBlocks"'));
  // The manifest's expect strings are the ones checked here.
  for (const [name, entry] of Object.entries(manifest.publicNames)) {
    const text = official(entry.file);
    for (const f of entry.expect) {
      if (typeof f === 'string') assert.ok(text.includes(f), `${name}: ${f}`);
      else if (f.raw) assert.equal(count(text, f.raw), 1, `${name}: ${f.raw}`);
      else assert.ok(text.includes(f.has), `${name}: ${f.in} ${f.has}`);
    }
  }
});

test('host files import the 3.6556.2 chat outputs by semantic name, and no 2.2553.1 chat file', () => {
  for (const file of ['src/source-code-start-adapters.jsx', 'src/source-routine-adapters.jsx', 'src/source-r4e-envbranch-notice.jsx'])
    assert.match(read(file), /^import \{ createIntl \} from (["'])\.\/generated\/chat\/vendor-intl-DYfox5Co\.js\1;$/m, file);
  // w10-ccres-turnbox dropped the turn box's own catalog branch (3.6556.2 cd4f82e77 formats the defaultMessage), so its
  // useIntl is the start card's: useStartIntl → createStartIntl → the vendor-intl createIntl imported above.
  const turnBox = read('src/source-turn-box-adapters.jsx');
  assert.match(turnBox, /^import \{ StartMessage, useStartIntl \} from "\.\/source-code-start-adapters\.jsx";$/m);
  assert.match(turnBox, /export function useIntl\(\) \{\n\s+return useStartIntl\(\);\n\}/);
  assert.doesNotMatch(turnBox, /createIntl|generated\/chat\//);
  assert.match(read('src/source-code-start-adapters.jsx'), /export function createStartIntl\(locale = getLocale\(\)\) \{\n\s+const intl = createIntl\(/);
  assert.match(read('src/source-chat-composer.jsx'), /^import \{ ideaPreviewClass \} from '\.\/generated\/chat\/shared-9-CM21XrJw\.js';$/m);
  const legacyFiles = Object.keys(manifest.legacy);
  for (const file of fs.readdirSync(path.join(root, 'src')).filter(f => /\.(?:jsx?|mjs)$/.test(f))) {
    const text = read(`src/${file}`);
    for (const legacy of legacyFiles) assert.equal(text.includes(`generated/chat/${legacy}`), false, `${file} imports legacy ${legacy}`);
    for (const m of text.matchAll(/generated\/chat\/([\w.-]+\.js)/g))
      assert.ok(manifest.modules.some(x => x.target === m[1]), `${file} imports ${m[1]}, which the chat slice does not emit`);
  }
  // The retired 2.2553.1 adapters.
  assert.doesNotMatch(read('src/source-routine-adapters.jsx'), /ScheduledTaskMenu|export function RoutineMenu\b/);
  assert.doesNotMatch(read('src/source-routine-form-adapters.jsx'), /\.\.\.dm\b|shared-19-CjdiaR4X/);
  // w10-cleanup-final deleted the routine detail adapters (no importer left).
  assert.equal(fs.existsSync(path.join(root, 'src/source-routine-detail-adapters.jsx')), false);
  assert.doesNotMatch(read('src/main.jsx'), /(?<!Current)ChatCdsLabelsContext/);
});
