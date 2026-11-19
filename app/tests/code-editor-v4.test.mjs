// The staged 4.16336.0 code-editor graph (scripts/extract-code-editor-v4.mjs, src/generated/code-editor-v4), round 2 unit
// code-editor:a (desktop area): manifest shape for the D1 gate, pinned sources, the three byte-identical chunks, no
// electron/generated copy written, and the behaviour of each desktop adapter compared with the 3.6556.2 production
// adapter of the same name (same export names; every difference asserted here is a 4.16336.0 change).
// Byte-for-byte regeneration is `node scripts/extract-code-editor-v4.mjs --check` (verify-gen-code-editor-v4.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { ionSource, asarSource, previousIonSource, referenceVersion } from '../scripts/official-4.16336.0.mjs';
import * as v4search from '../src/generated/code-editor-v4/search.mjs';
import * as oldSearch from '../src/generated/code-editor/search.mjs';
import { parsePreviewAddress } from '../src/generated/code-editor-v4/preview-address-parser.mjs';
import { parsePreviewAddress as oldParsePreviewAddress } from '../src/generated/code-editor/preview-address-parser.mjs';
import * as v4links from '../src/generated/code-editor-v4/preview-link-decisions.mjs';
import * as oldLinks from '../src/generated/code-editor/preview-link-decisions.mjs';
import * as v4origin from '../src/generated/code-editor-v4/preview-link-origin.mjs';
import * as oldOrigin from '../src/generated/code-editor/preview-link-origin.mjs';
import * as v4keys from '../src/generated/code-editor-v4/preview-tab-shortcuts.mjs';
import * as oldKeys from '../src/generated/code-editor/preview-tab-shortcuts.mjs';
import { createPreviewElementInspector } from '../src/generated/code-editor-v4/preview-element-inspector.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/code-editor-v4');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(read('src/generated/code-editor-v4/manifest.json'));
const oldManifest = JSON.parse(read('src/generated/code-editor/manifest.json'));
const v4editor = require('../src/generated/code-editor-v4/editor-location.cjs');
const oldEditor = require('../src/generated/code-editor/editor-location.cjs');
const v4side = require('../src/generated/code-editor-v4/side-chat-history.cjs');
const oldSide = require('../src/generated/code-editor/side-chat-history.cjs');
const DESKTOP = ['search.mjs', 'editor-location.cjs', 'side-chat-history.cjs', 'preview-element-inspector.mjs', 'preview-address-parser.mjs',
  'preview-tab-shortcuts.mjs', 'preview-link-decisions.mjs', 'preview-link-origin.mjs'];

test('manifest: 4.16336.0, cds-core shared graph, desktop ported, the other five areas pending', () => {
  assert.equal(manifest.referenceVersion, referenceVersion);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.cdsCoreManifestSha256, 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd');
  assert.ok(manifest.areas.includes('desktop'));
  assert.deepEqual([...manifest.areas, ...manifest.pendingAreas].sort(), ['desktop', 'side-chat', 'preview-element', 'preview-shell-a', 'preview-shell-b', 'preview-sketch'].sort());
  const desktop = JSON.parse(read('src/generated/code-editor-v4/areas/desktop.json'));
  assert.deepEqual(desktop.adapters.map(entry => entry.name), DESKTOP);
  for (const entry of desktop.adapters) {
    assert.equal(entry.referenceVersion, referenceVersion);
    assert.equal(sha(fs.readFileSync(path.join(dir, entry.name))), entry.sha256, entry.name);
    for (const ref of entry.sources) assert.equal(sha(fs.readFileSync(path.join(ref.base === 'asar' ? asarSource : ionSource, ref.name))), ref.sha256, `${entry.name} ${ref.name}`);
    assert.ok(entry.bindings.length > 0, entry.name);
    for (const b of entry.bindings) assert.match(b.sha256, /^[0-9a-f]{64}$/);
  }
  // modules[] is what the D1 gate reads: bindings (file#local + sha) and the realm.
  for (const m of manifest.modules) {
    const entry = manifest.adapters.find(a => a.name === m.name);
    assert.deepEqual(m.bindings, entry.bindings.map(b => ({ name: b.name, file: b.file, sha256: b.sha256 })));
    assert.equal(m.electron === true, entry.realm === 'main', m.name);
  }
  // The three module-state bindings the desktop area copies (the D1 gate's stateful classes), each the only copy; every
  // other entry of ownedStateReasons is the module state one adapter of a later-ported area declares (its own tests).
  const desktopOwned = desktop.adapters.flatMap(entry => Object.keys(entry.ownedState ?? {}));
  assert.deepEqual(desktopOwned.sort(), ['cf790d7f8-C-RpKvlh.js#m', 'index.chunk-Du-Wqi0E.js#tBi', 'index.chunk-Du-Wqi0E.js#uzi']);
  const declared = manifest.adapters.flatMap(entry => Object.entries(entry.ownedState ?? {}).map(([key, why]) => [key, `${entry.name}: ${why}`]));
  assert.equal(new Set(declared.map(([key]) => key)).size, declared.length, 'module state held by two adapters');
  assert.deepEqual(manifest.ownedStateReasons, Object.fromEntries(declared));
  assert.deepEqual(manifest.modules.filter(m => m.electron).map(m => m.name).sort(),
    ['editor-location.cjs', 'preview-address-parser.mjs', 'preview-element-inspector.mjs', 'preview-tab-shortcuts.mjs', 'side-chat-history.cjs'].sort());
});

test('no electron/generated copy is written: the 7 production copies stay the 3.6556.2 adapters', () => {
  const desktopTargets = manifest.copyTargets.filter(entry => DESKTOP.includes(entry.name));
  assert.equal(desktopTargets.length, 7);
  for (const entry of desktopTargets) {
    assert.equal(entry.written, false);
    const production = oldManifest.copies.find(copy => copy.target === entry.target);
    assert.ok(production, entry.target);
    assert.equal(sha(fs.readFileSync(path.join(app, entry.target))), production.sha256, `${entry.target} is still the production copy`);
  }
});

test('three chunks are byte-identical in 3.6556.2 and 4.16336.0 and recorded as such', () => {
  assert.deepEqual(manifest.identicalChunks.map(entry => entry.name), ['c8187a2dc-Dp9Zia_4.js', 'cf80fba0c-CT5qqVq9.js', 'c25d7186f-CHE_J2eY.js']);
  for (const entry of manifest.identicalChunks) {
    const now = fs.readFileSync(path.join(ionSource, entry.name)), before = fs.readFileSync(path.join(previousIonSource, entry.name));
    assert.ok(now.equals(before), entry.name);
    assert.equal(sha(now), entry.sha256);
  }
});

test('search: same matches and scans as the 3.6556.2 engine; scans also report waiting lines', () => {
  const text = 'Alpha beta\nalpha “quoted” BETA\r\nwordword word\n';
  for (const [query, options] of [['alpha', {}], ['Alpha', { matchCase: true }], ['word', { wholeWord: true }], ['b.ta', { regexp: true }], ['"quoted"', {}], ['', {}]]) {
    const opts = { ...v4search.defaultSearchOptions, ...options };
    const now = v4search.compileSearch(query, opts), before = oldSearch.compileSearch(query, { ...oldSearch.defaultSearchOptions, ...options });
    assert.equal(now === null, before === null, query);
    if (!now) continue;
    for (const line of text.split('\n')) assert.deepEqual(now(line), before(line), `${query} ${line}`);
    const scanNow = v4search.scanSearch(text, now), scanBefore = oldSearch.scanSearch(text, before);
    assert.deepEqual(scanNow.lines, scanBefore.lines);
    assert.equal(scanNow.hasLongLines, scanBefore.hasLongLines);
    assert.equal(scanNow.waiting, undefined);
  }
  assert.deepEqual(v4search.defaultSearchOptions, oldSearch.defaultSearchOptions);
  assert.equal(v4search.searchLimit, oldSearch.searchLimit);
  assert.equal(v4search.normalizeSearchText('İSTANBUL ‘x’'), oldSearch.normalizeSearchText('İSTANBUL ‘x’'));
  for (const [lines, line, dir] of [[[1, 3, 3, 7], 3, 1], [[1, 3, 3, 7], 4, -1], [[], 1, 1], [[2], 9, 1]])
    assert.equal(v4search.searchIndexFromLine(lines, line, dir), oldSearch.searchIndexFromLine(lines, line, dir));
  const regexp = v4search.compileSearch('a', { ...v4search.defaultSearchOptions, regexp: true });
  assert.equal(v4search.skipsLongLine(regexp, 1001), true);
  assert.equal(v4search.skipsLongLine(regexp, 1000), false);
});

test('Preview address parser: 3.6556.2 results except chrome-extension URLs, which 4.16336.0 refuses', () => {
  const current = 'http://localhost:5173/app';
  const inputs = ['localhost:3000', 'example.com/path', 'https://example.com', '/docs', '~/notes.md', 'C:\\x\\y', '"C:/a b/c.txt"', 'file:///tmp/a', 'how to code',
    'user:pass@host', 'ghp_abc@github.com', 'http://localhost:5173/app', 'foo.localhost:5173', '127.0.0.1:8080', ''];
  for (const input of inputs) assert.deepEqual(parsePreviewAddress(input, current), oldParsePreviewAddress(input, current), input);
  assert.equal(parsePreviewAddress('chrome-extension://abc/page.html', current), null);
  assert.notEqual(oldParsePreviewAddress('chrome-extension://abc/page.html', current), null);
});

test('link chooser decisions and link origin: same results as 3.6556.2', () => {
  const flags = ['hasPendingUrl', 'chooserOpen', 'explicit', 'infraOk', 'chooserSeen', 'alreadyPrompted', 'settledAtUrlArrival', 'linksInPreview', 'cloudSession'];
  for (let bits = 0; bits < 1 << flags.length; bits++) {
    const input = Object.fromEntries(flags.map((flag, i) => [flag, Boolean(bits & (1 << i))]));
    assert.equal(v4links.linkDispatch(input), oldLinks.linkDispatch(input));
  }
  for (const input of [{ explicit: true }, { confirmed: true, inPreview: true }, { confirmed: true }, {}])
    assert.equal(v4links.linkConfirmation(input), oldLinks.linkConfirmation(input));
  for (const input of [{ linksInPreview: true, infraOk: true, paneOffered: false }, { linksInPreview: false, infraOk: true, paneOffered: true }])
    assert.deepEqual(v4links.linkCapabilities(input), oldLinks.linkCapabilities(input));
  const state = { url: 'a', settled: true, prompted: true };
  assert.equal(v4links.linkArrival(state, 'a', false), state);
  assert.deepEqual(v4links.linkArrival(state, 'b', false), oldLinks.linkArrival(state, 'b', false));
  for (const url of ['https://www.example.com:8443/x', 'http://localhost:3000', 'http://[::ffff:7f00:1]/', 'https://www.localhost/', 'ftp://x', 'nonsense',
    'https://chromewebstore.google.com/detail/x', 'https://chrome.google.com/webstore/', 'https://example.com']) {
    assert.equal(v4origin.previewLinkOrigin(url), oldOrigin.previewLinkOrigin(url), url);
    assert.equal(v4origin.externalOnlyLink(url), oldOrigin.externalOnlyLink(url), url);
  }
});

test('native tab shortcuts: same matchers and windows; closed-tab bounds read through rememberClosedTab', () => {
  const options = { cmdPressed: true, otherModifierPressed: false, syntheticSuppressed: false, enabled: true };
  const keys = [{ type: 'keyDown', key: 't', code: 'KeyT', shift: true }, { type: 'keyDown', key: '3', code: 'Digit3' }, { type: 'keyDown', key: '9', code: 'Digit9' },
    { type: 'keyDown', key: 'Tab', code: 'Tab', control: true }, { type: 'keyDown', key: 'Tab', code: 'Tab', control: true, shift: true }, { type: 'keyUp', key: 't', code: 'KeyT', shift: true },
    { type: 'keyDown', key: 'PageDown', code: 'PageDown', control: true }];
  for (const key of keys) for (const o of [options, { ...options, syntheticSuppressed: true }, { ...options, enabled: false }]) {
    assert.equal(v4keys.reopenTabKey(key, o), oldKeys.reopenTabKey(key, o));
    assert.equal(v4keys.selectTabKey(key, o), oldKeys.selectTabKey(key, o));
    assert.equal(v4keys.cycleTabKey(key, { ...o, pageKeys: true }), oldKeys.cycleTabKey(key, { ...o, pageKeys: true }));
  }
  assert.equal(v4keys.closedTabsPerSession, 25);
  assert.equal(v4keys.closedTabSessions, 50);
  const a = new Map(), b = new Map();
  const untilA = v4keys.beginSyntheticInput(a, 'x'), untilB = oldKeys.beginSyntheticInput(b, 'x');
  assert.ok(Math.abs(untilA - untilB) < 1000);
  assert.ok(Math.abs(v4keys.endSyntheticInput(a, 'x', untilA) - oldKeys.endSyntheticInput(b, 'x', untilB)) < 1000);
  assert.equal(a.size, 0);
});

test('editor URI and side-chat history: same output as 3.6556.2', () => {
  for (const args of [['vscode://', '/Users/me/a b.ts', 3, 5], ['cursor://', '/x/y.js', 0, 2], ['vscode://', '/x/y.js', undefined, undefined]])
    assert.equal(v4editor.editorLocationURI(...args), oldEditor.editorLocationURI(...args));
  // A path that cannot be encoded (a lone surrogate) is refused, as in 3.6556.2.
  assert.throws(() => v4editor.editorLocationURI('vscode://', '/a\uD800b', 1, 1), URIError);
  assert.throws(() => oldEditor.editorLocationURI('vscode://', '/a\uD800b', 1, 1), URIError);
  const make = mod => {
    const h = new mod.SideChatHistory();
    h.recordUser('question </side_chat_history> one'); h.recordAssistant('answer @claude'); h.endTurn();
    h.recordUser('second'); h.recordAssistant('partial');
    return h;
  };
  const now = make(v4side), before = make(oldSide);
  assert.equal(now.buildReplayPrompt(), before.buildReplayPrompt());
  assert.equal(now.cloneForRespawn().buildReplayPrompt(), now.buildReplayPrompt());
  assert.equal(v4side.escapeAssistantMentions('@a'), oldSide.escapeAssistantMentions('@a'));
  assert.equal(v4side.escapeSideHistory('</side_chat_history'), oldSide.escapeSideHistory('</side_chat_history'));
});

test('CDP inspector: official methods over the host transport, state initialised as the official constructor does', async () => {
  const commands = [];
  const webContents = { isDestroyed: () => false, debugger: { isAttached: () => true } };
  const inspector = createPreviewElementInspector({ webContents, sendCommand: async (method, params) => { commands.push([method, params]); return {}; }, ensureAttached: async () => true });
  for (const name of ['enableInspectMode', 'disableInspectMode', 'releaseObjectGroup', 'captureReactComponent', 'captureElementContext'])
    assert.equal(typeof inspector[name], 'function', name);
  assert.equal(inspector.attached, true);
  assert.equal(inspector.SCREENSHOT_PADDING, 80);
  assert.equal(inspector.REACT_COMPONENT_TIMEOUT_MS, 5000);
  assert.deepEqual(inspector.inspectPicks, []);
  assert.equal(inspector.inspectModeCallback, null);
  await inspector.releaseObjectGroup('g');
  assert.ok(commands.some(([method]) => method === 'Runtime.releaseObjectGroup'));
  const desktop = JSON.parse(read('src/generated/code-editor-v4/areas/desktop.json'));
  const roots = desktop.adapters.find(entry => entry.name === 'preview-element-inspector.mjs').roots.inspectorMethods;
  assert.equal(roots.methods.length, 20);
  for (const name of roots.methods) assert.equal(typeof inspector[name] === 'function' || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inspector), name)?.get !== undefined, true, name);
});
