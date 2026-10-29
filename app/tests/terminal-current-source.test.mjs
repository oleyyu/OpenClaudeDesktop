import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// R3-terminal FT-03/FT-04: the terminal pane's original bindings (extract-code-ui-current.mjs, pinned by
// code-current-terminal-pins.mjs) and the host wiring that replaced the 2.31226.0 adapters of generated/code-editor.
// cc-rest-terminal-a: a pin with `version: '3.6556.2'` slices the 3.6556.2 renderer; cc-rest-terminal-b moved the last
// four (terminal-errors / -idle-cursor / -clear-item / -tab-overflow), so every terminal pin is 3.6556.2 now.
const app = path.resolve(import.meta.dirname, '..');
const { ionSource: v3Reference } = await import('../scripts/official-3.6556.2.mjs');
const references = {
  '2.42304.0': path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1'),
  '3.6556.2': v3Reference,
};
const generated = path.join(app, 'src/generated/code-current');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (file) => readFileSync(path.join(app, file), 'utf8');
const { terminalPins, pinTerminalHelper } = await import('../scripts/code-current-terminal-pins.mjs');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const TARGETS = ['terminal-selection.mjs', 'terminal-description.mjs', 'terminal-commands.mjs', 'terminal-geometry.mjs', 'terminal-output.mjs', 'terminal-mouse.mjs', 'terminal-colors.mjs', 'terminal-link-selection.mjs',
  'terminal-errors.mjs', 'terminal-title-wellformed.mjs', 'terminal-title-invisibles.mjs', 'terminal-title-runs.mjs', 'terminal-title-text.mjs',
  'terminal-titles.mjs', 'terminal-idle-cursor.mjs', 'terminal-registry.mjs', 'terminal-clear-item.mjs',
  // R3-terminal FT-15: the shared strip's overflow row (cfe7c4b3b ce). The CDS size attribute it spreads (shared-frame ga)
  // is view-tabs' cdsSizeAttributes, imported directly since w10-cleanup-cc-public retired terminal-tab-size-attrs.mjs.
  'terminal-tab-overflow.mjs',
  // w11-e31-terminal-cont: the selection action bar (ceb49ada3 u) that c6bf19e8f Si renders.
  'terminal-action-bar.mjs'];

// cc-rest-terminal-a: these 15 read 3.6556.2; cc-rest-terminal-b: so do the last four (TERMINAL_B).
const TERMINAL_B = ['terminal-errors.mjs', 'terminal-idle-cursor.mjs', 'terminal-clear-item.mjs', 'terminal-tab-overflow.mjs'];
const V3_TARGETS = ['terminal-selection.mjs', 'terminal-description.mjs', 'terminal-commands.mjs', 'terminal-geometry.mjs', 'terminal-output.mjs',
  'terminal-mouse.mjs', 'terminal-colors.mjs', 'terminal-link-selection.mjs', 'terminal-title-wellformed.mjs', 'terminal-title-invisibles.mjs',
  'terminal-title-runs.mjs', 'terminal-title-text.mjs', 'terminal-titles.mjs', 'terminal-registry.mjs', ...TERMINAL_B, 'terminal-action-bar.mjs'];
// The SSR-only outputs (imported by .jsx hosts alone) that may import view-tabs or a .jsx adapter; every other output is
// reached by a plain-node model (terminal-pane-model, terminal-titles, terminal-event-routing, ...), E42.
const SSR_ONLY = ['terminal-idle-cursor.mjs', 'terminal-clear-item.mjs', 'terminal-tab-overflow.mjs', 'terminal-action-bar.mjs'];

test('every terminal helper is generated from its pinned chunk with the pinned binding closure', async () => {
  assert.deepEqual(Object.keys(terminalPins).sort(), [...TARGETS].sort());
  assert.deepEqual([...V3_TARGETS].sort(), [...TARGETS].sort());
  for (const target of V3_TARGETS) assert.equal(terminalPins[target].version, '3.6556.2', target);
  for (const target of TARGETS) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    const pin = terminalPins[target];
    const version = pin.version ?? '2.42304.0', reference = references[version];
    assert.equal(entry.referenceVersion, version, target);
    assert.equal(path.basename(entry.source), pin.source, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, pin.source))), `${target} source bytes`);
    assert.equal(entry.sha256, sha(readFileSync(path.join(generated, target))), `${target} output bytes`);
    // Closure, feature strings, official export aliases, replaced imports and call sites, against the shipped chunk.
    assert.deepEqual(await pinTerminalHelper(target, reference), entry.bindings, target);
  }
});

test('cc-rest-terminal-a: the 3.6556.2 outputs, their stand-ins and the size attribute from view-tabs', () => {
  for (const target of V3_TARGETS) assert.match(read(`src/generated/code-current/${target}`), /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/, target);
  // shared-frame ga is view-tabs' cdsSizeAttributes, read by the overflow row inside view-tabs (w12-viewtabs: the row is
  // re-exported, not sliced); no code-current re-export of it (w10-cleanup-cc-public retired terminal-tab-size-attrs.mjs).
  assert.doesNotMatch(read('src/generated/code-current/terminal-tab-overflow.mjs'), /cdsSizeAttributes/);
  assert.ok(!readdirSync(generated).includes('terminal-tab-size-attrs.mjs'), 'the retired re-export file is gone');
  assert.ok(!manifest.modules.some((module) => module.target === 'terminal-tab-size-attrs.mjs'));
  assert.ok(terminalPins['terminal-tab-overflow.mjs'].dependencies[`${'shared-frame-6jtSkIit.js'}:wd`].includes('function ga(e){return e&&e!=="base"?{"data-size":e}:{}}'));
  const viewTabs = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual([viewTabs.publicNames.cdsSizeAttributes.file, viewTabs.publicNames.cdsSizeAttributes.local], ['shared-frame-6jtSkIit.js', 'ga']);
  // The GrowthBook reads stay on locally under their 3.6556.2 import names (c6bf19e8f T, cf718f694 a/s).
  assert.match(read('src/generated/code-current/terminal-commands.mjs'), /^const T = \(\) => true;$/m);
  assert.match(read('src/generated/code-current/terminal-commands.mjs'), /var Vt = "__gb__1475692361";/);
  const titles = read('src/generated/code-current/terminal-titles.mjs');
  assert.match(titles, /const a = \(\) => true,\s+s = \(\) => "on";/);
  assert.match(titles, /import \{\s*visibleTitleText as u,\s*sanitizeTitleText as c,\s*limitCodePoints as l,?\s*\} from "\.\/terminal-title-text\.mjs";/);
  assert.match(titles, /import \{ createTerminalTitleStore as m \} from "\.\.\/\.\.\/terminal-title-store\.mjs";/);
  assert.match(read('src/generated/code-current/terminal-mouse.mjs'), /import \{ isMacUserAgent as ce \} from "\.\/surface-chord-platform\.mjs";/);
  // E42: the plain-node models (terminal-pane-model, terminal-titles, terminal-event-routing, ...) reach these outputs, so
  // only the SSR-only ones may import view-tabs (and the .jsx adapters).
  for (const target of V3_TARGETS.filter((target) => !SSR_ONLY.includes(target)))
    assert.doesNotMatch(read(`src/generated/code-current/${target}`), /view-tabs|\.jsx/, target);
  for (const target of SSR_ONLY) {
    const imports = new RegExp(`from ["']\\./generated/code-current/${target.replace('.', '\\.')}["']`);
    const importers = readdirSync(path.join(app, 'src')).filter((name) => /\.(m?js|jsx)$/.test(name) && imports.test(read(`src/${name}`)));
    assert.ok(importers.length, target);
    for (const name of importers) assert.match(name, /\.jsx$/, `${target} is imported by ${name}`);
  }
});

test('cc-rest-terminal-b: the 3.6556.2 errors, idle cursor, Clear terminal item and overflow row', () => {
  const official = readFileSync(path.join(v3Reference, 'c6bf19e8f-CgQ1_Jhf.js'), 'utf8');
  // c6bf19e8f ci: the copy the error cover shows, the needsNewerApp body, Try again; ui maps the spawn failure.
  for (const text of ['needsNewerApp:{defaultMessage:"Additional terminal tabs require a newer Claude desktop app",id:"UmCCqFiseY"}',
    'needsNewerAppBody:{defaultMessage:"Restart Claude to update.",id:"e/Nyj1sdtt"}', 'startFailed:{defaultMessage:"Couldn\\u2019t start the shell",id:"4oGvcz1sbM"}',
    'loadFailed:{defaultMessage:"Couldn\\u2019t load the terminal",id:"OqP0kTN27G"}', '"Failed to spawn shell"'])
    assert.ok(official.includes(text), text);
  const errors = read('src/generated/code-current/terminal-errors.mjs');
  assert.match(errors, /^const j = \(messages\) => messages;$/m);
  assert.match(errors, /var ui = "Failed to spawn shell";/);
  // The compiled closures import their cache helpers by the E3 names from the concrete shared-frame file (R3/R6).
  for (const target of ['terminal-idle-cursor.mjs', 'terminal-clear-item.mjs']) {
    const text = read(`src/generated/code-current/${target}`);
    assert.match(text, /reactMemoCache as J9,[\s\S]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/, target);
    assert.doesNotMatch(text, /view-tabs\/index\.js/, `${target}: never the facade`);
  }
  const cursor = read('src/generated/code-current/terminal-idle-cursor.mjs');
  assert.match(cursor, /^const v = \(\) => true;$/m, '__gb__2265785636 stays on locally');
  assert.match(cursor, /import \{ useTerminalPreference as _ \} from "\.\.\/\.\.\/terminal-view-settings\.mjs";/);
  const clear = read('src/generated/code-current/terminal-clear-item.mjs');
  assert.match(clear, /TerminalMenu as me,\s*TerminalMessage as Z,\s*useTerminalIntl as Lr,?\s*\} from "\.\.\/\.\.\/source-terminal-adapters\.jsx";/);
  // w10-ccres-e31-terminal: `me` is shared-frame qi (the pin's viewTabs map says CdsContextMenu), and the adapter now
  // re-exports exactly that: the item sits in ViewTabBar's tab menu, a CdsContextMenu popup.
  assert.equal(terminalPins['terminal-clear-item.mjs'].viewTabs.me, 'CdsContextMenu');
  assert.match(read('src/source-terminal-adapters.jsx'), /^export \{ CdsContextMenu as TerminalMenu \} from "\.\/generated\/view-tabs\/index\.js";$/m);
  assert.doesNotMatch(read('src/source-terminal-adapters.jsx'), /SourceMenu/);
  // w10-trans-tab-overflow: the overflow row se renders the CDS dropdown item (shared-frame Jo); its size table is
  // view-tabs' viewTabSizes (cfe7c4b3b le). w12-viewtabs (D1): the output slices nothing; se, L, ie and le are re-exported
  // from the concrete view-tabs file (never the facade), so the row and its P lead-glyph context exist once.
  const row = read('src/generated/code-current/terminal-tab-overflow.mjs');
  assert.equal(row, '// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n\nexport {\n'
    + '  ViewTabOverflowItem as TabOverflowItem,\n  viewTabSizes as tabOverflowSizes,\n'
    + '  viewTabOverflowTypeaheadResetKeys as tabOverflowTypeaheadResetKeys,\n  viewTabRtlArrowKey as tabOverflowRtlKey,\n'
    + '} from "../view-tabs/cfe7c4b3b-BF79K6ux.js";\n');
  assert.deepEqual(terminalPins['terminal-tab-overflow.mjs'].bindings, []);
  assert.deepEqual(terminalPins['terminal-tab-overflow.mjs'].reexport,
    { se: 'ViewTabOverflowItem', L: 'viewTabRtlArrowKey', ie: 'viewTabOverflowTypeaheadResetKeys', le: 'viewTabSizes' });
  const viewTabs = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(viewTabs.publicNames.viewTabSizes, { file: 'cfe7c4b3b-BF79K6ux.js', local: 'le' });
  assert.deepEqual(viewTabs.publicNames.ViewTabOverflowItem, { file: 'cfe7c4b3b-BF79K6ux.js', local: 'se' });
  assert.deepEqual(viewTabs.publicNames.viewTabRtlArrowKey, { file: 'cfe7c4b3b-BF79K6ux.js', local: 'L' });
  assert.deepEqual(viewTabs.publicNames.viewTabOverflowTypeaheadResetKeys, { file: 'cfe7c4b3b-BF79K6ux.js', local: 'ie' });
  // The view-tabs copy is the official se: it renders the CDS dropdown item and takes arrowCloses.
  const vt = read('src/generated/view-tabs/cfe7c4b3b-BF79K6ux.js');
  assert.match(vt, /arrowCloses:o,/);
  assert.match(vt, /se as ViewTabOverflowItem/);
  assert.equal(vt.split('var P=f("xs");').length - 1, 1, 'the one P = createContext("xs") lead-glyph context');
  assert.doesNotMatch(row, /createContext/);
  // ViewTabBar's overflowArrowCloses is off only on the side chat strip (cccc2cf0a), so the host strips keep the default.
  const pane = readFileSync(path.join(v3Reference, 'cccc2cf0a-DhZC33Gc.js'), 'utf8');
  assert.equal(pane.split('overflowArrowCloses:!1').length - 1, 1);
  assert.match(pane, /defaultMessage:"More side chats"[\s\S]{0,4000}overflowArrowCloses:!1|overflowArrowCloses:!1[\s\S]{0,4000}defaultMessage:"More side chats"/);
});

test('xn (terminal-01): a link click is blocked only when it would end a real selection', async () => {
  const { selectionBlocksTerminalLink: xn } = await import('../src/generated/code-current/terminal-link-selection.mjs');
  const term = (selection, mode = 'none') => ({ modes: { mouseTrackingMode: mode }, getSelection: () => selection });
  assert.equal(xn(term('ab'), {}), true);
  assert.equal(xn(term('a'), {}), false, 'a one-character selection is a click, not a drag');
  for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) assert.equal(xn(term('ab'), { [key]: true }), false, key);
  assert.equal(xn(term('ab', 'vt200'), {}), false, 'a program tracking the mouse gets its clicks');
  // Behavioral check (Y1-R3-terminal-2): both WebLinksAddon and the file-path link provider gate activation through Sn + xn.
  const { installTerminalLinks, terminalLinkBlocked } = await import('../src/terminal-pane-model.mjs');
  assert.equal(terminalLinkBlocked(term(''), null), true);
  assert.equal(terminalLinkBlocked(term(''), { button: 1 }), true);
  assert.equal(terminalLinkBlocked(term('ab'), { button: 0 }), true);
  assert.equal(terminalLinkBlocked(term('ab'), { button: 0, metaKey: true }), false);
  let webCallback = null, linkProvider = null, currentSelection = '', currentMode = 'none';
  const lineText = 'see src/app.js:42';
  const fakeTerm = {
    cols: lineText.length,
    modes: { get mouseTrackingMode() { return currentMode; } },
    getSelection: () => currentSelection,
    buffer: {
      active: {
        getLine: () => ({
          getCell: (x) => (x < lineText.length ? { getChars: () => lineText[x], getWidth: () => 1 } : null),
        }),
      },
    },
    loadAddon(addon) { webCallback = addon.handler; },
    registerLinkProvider(provider) { linkProvider = provider; },
  };
  const openedWeb = [], openedFiles = [];
  installTerminalLinks(fakeTerm, {
    WebLinksAddon: class { constructor(handler) { this.handler = handler; } },
    id: 'term-links',
    getHandlers: () => ({
      web: (uri, ev) => openedWeb.push([uri, ev]),
      paths: async (list) => list,
      file: (rel, line) => openedFiles.push([rel, line]),
    }),
  });
  const click = (extra = {}) => {
    const ev = { button: 0, prevented: false, ...extra, preventDefault() { this.prevented = true; } };
    return ev;
  };
  const middle = click({ button: 1 });
  webCallback(middle, 'https://example.com');
  assert.equal(openedWeb.length, 0);
  assert.equal(middle.prevented, false);
  currentSelection = 'ab';
  const dragEnd = click();
  webCallback(dragEnd, 'https://example.com');
  assert.equal(openedWeb.length, 0);
  const cmdClick = click({ metaKey: true });
  webCallback(cmdClick, 'https://example.com');
  assert.equal(openedWeb.length, 1);
  assert.equal(cmdClick.prevented, true);
  currentMode = 'vt200';
  webCallback(click(), 'https://example.com/2');
  assert.equal(openedWeb.length, 2);
  currentMode = 'none';
  const links = await new Promise((resolve) => linkProvider.provideLinks(1, resolve));
  assert.equal(links.length, 1);
  links[0].activate(click({ button: 1 }));
  links[0].activate(click()); // blocked by 2-char currentSelection = "ab"
  assert.equal(openedFiles.length, 0);
  currentSelection = 'a';
  const fileClick = click();
  links[0].activate(fileClick);
  assert.equal(fileClick.prevented, true);
  assert.deepEqual(openedFiles, [['src/app.js', 42]]);
});

test('structured start/load errors (term-v01): kinds, copy and the needsNewerApp exception', async () => {
  const E = await import('../src/generated/code-current/terminal-errors.mjs');
  assert.deepEqual(E.terminalStartError('The session folder no longer exists.', 'a', 'a'), { kind: 'raw', text: 'The session folder no longer exists.' });
  assert.equal(E.terminalStartError(undefined, 'a', 'a'), E.startFailedError);
  assert.equal(E.terminalStartError('Session not found', 'tab', 'session'), E.needsNewerAppError);
  // cc-rest-terminal-b: 3.6556.2 di also maps the spawn failure to startFailed.
  assert.equal(E.terminalStartError('Failed to spawn shell', 'a', 'a'), E.startFailedError);
  assert.deepEqual(Object.fromEntries(Object.entries(E.terminalErrorMessages).map(([kind, message]) => [kind, message.defaultMessage])), {
    needsNewerApp: 'Additional terminal tabs require a newer Claude desktop app',
    needsNewerAppBody: 'Restart Claude to update.',
    startFailed: 'Couldn’t start the shell',
    loadFailed: 'Couldn’t load the terminal',
  });
  // Behavioral check (Y1-R3-terminal-2): restartTerminalTab, acquireTerminalView and terminalCoverState.
  const M = await import('../src/terminal-pane-model.mjs');
  const startFailed = new Set();
  let restartError = null, viewError = null;
  const active = { id: 'term-err', status: 'exited' };
  assert.equal(await M.restartTerminalTab({
    active, sessionId: 's1', homeWorkspace: null,
    terminals: { restart: async () => { throw new Error('Spawn failed'); } },
    startFailedTerminals: startFailed, setRestartError: (next) => { restartError = next; },
  }), false);
  assert.equal(startFailed.has('term-err'), true);
  assert.deepEqual(restartError, { id: 'term-err', error: { kind: 'raw', text: 'Spawn failed' } });
  assert.deepEqual(M.terminalCoverState({ active, restartError }), {
    kind: 'raw', text: 'Spawn failed', body: null, role: 'alert', action: 'Try again', retry: undefined, exited: true,
  });
  await M.restartTerminalTab({
    active, sessionId: 's1', homeWorkspace: null,
    terminals: { restart: async () => { throw new Error(''); } },
    startFailedTerminals: startFailed, setRestartError: (next) => { restartError = next; },
  });
  assert.deepEqual(M.terminalCoverState({ active, restartError }), {
    kind: 'startFailed', text: 'Couldn’t start the shell', body: null, role: 'alert', action: 'Try again', retry: undefined, exited: true,
  });
  const newer = M.terminalCoverState({ active, restartError: { id: 'term-err', error: E.needsNewerAppError } });
  assert.deepEqual([newer.text, newer.body, newer.role, newer.action],
    ['Additional terminal tabs require a newer Claude desktop app', 'Restart Claude to update.', 'alert', null]);
  // The exited cover (no error) has no alert role (3.6556.2 Ei: only the error EmptyState is role="alert").
  assert.equal(M.terminalCoverState({ active }).role, undefined);
  const pane = read('src/source-terminal-pane.jsx');
  // w12b TPT-8: the generated cc0a875c8 EmptyState (c6bf19e8f `import { t as xe } from "./cc0a875c8-Ba9KI-Fw.js"`).
  assert.match(pane, /<EmptyState role=\{cover\.role\} title=\{<span id=\{`\$\{hintId\}-exited`\}>\{cover\.text\}<\/span>\} body=\{cover\.body\}/);
  assert.match(pane, /import \{ EmptyState \} from "\.\/generated\/r3b-transcript\/empty-state\.mjs";/);
  let clearedHost = 0, viewCalls = 0;
  const hostNode = { replaceChildren() { clearedHost += 1; } };
  assert.equal(M.acquireTerminalView({
    activeId: 'term-err', sessionId: 's1', homeWorkspace: null,
    terminals: { view() { viewCalls += 1; throw 'not an Error'; } },
    createView: () => ({}), hostNode, viewError, setViewError: (next) => { viewError = next; },
  }), null);
  assert.equal(clearedHost, 1);
  assert.deepEqual(viewError, { id: 'term-err', error: E.loadFailedError });
  // w10-ccres-e31-terminal (3.6556.2 Ei): an Error, even with an empty message, is raw (`{kind:"raw",text:e.message}`).
  let emptyError = null;
  M.acquireTerminalView({ activeId: 'term-err', terminals: { view() { throw new Error(''); } }, hostNode, setViewError: (next) => { emptyError = next; } });
  assert.deepEqual(emptyError, { id: 'term-err', error: { kind: 'raw', text: '' } });
  assert.ok(readFileSync(path.join(v3Reference, 'c6bf19e8f-CgQ1_Jhf.js'), 'utf8').includes('e instanceof Error&&!(e instanceof si)?{kind:"raw",text:e.message}:oi'));
  let retried = 0;
  const cover = M.terminalCoverState({
    active: { id: 'term-err', status: 'running' }, viewError,
    onRetryView: () => { viewError = null; retried += 1; },
  });
  assert.equal(cover.text, 'Couldn’t load the terminal');
  assert.equal(cover.action, 'Try again');
  cover.retry();
  assert.equal(retried, 1);
  const createdView = { id: 'term-err' };
  assert.equal(M.acquireTerminalView({
    activeId: 'term-err', sessionId: 's1', homeWorkspace: null,
    terminals: { view() { viewCalls += 1; return createdView; } },
    createView: () => createdView, hostNode, viewError: { id: 'term-err', error: E.loadFailedError },
    setViewError: (next) => { viewError = next; },
  }), createdView);
  assert.equal(viewCalls, 2);
  assert.equal(viewError, null);
});

test('the title sanitizer is the shared-78 original, including the long blank-run cap', async () => {
  const text = await import('../src/generated/code-current/terminal-title-text.mjs');
  assert.equal(text.sanitizeTitleText('a\u0007b\u202e  c'), 'ab c');
  assert.equal(text.sanitizeTitleText(' \u0301\u0301abc'), 'abc', 'marks after a space are dropped');
  // 100 combining marks after a letter: Uw caps the run (shared-52 Uj, 2×32 characters); the 2.31226.0 copy had no cap.
  assert.equal([...text.sanitizeTitleText('x' + '\u0301'.repeat(100))].length, 65);
  assert.equal(text.sanitizeTitleText('y'.repeat(5000)).length, 4000);
  assert.equal(text.visibleTitleText('\u200d\u200c'), '');
  assert.equal(text.limitCodePoints('😀😀😀', 2), '😀😀');
  const { createTerminalTitleTracker } = await import('../src/terminal-titles.mjs');
  const titles = createTerminalTitleTracker();
  let onTitle;
  titles.install({ onTitleChange(handler) { onTitle = handler; }, parser: { registerOscHandler() { return { dispose() {} }; } } }, 'term-cap');
  onTitle('x' + '\u0301'.repeat(100));
  assert.equal([...titles.value(null, { id: 'term-cap', title: null })].length, 65);
  titles.forget('term-cap');
  assert.equal(titles.value(null, { id: 'term-cap', title: null }), undefined);
});

test('tab strip rules (terminal-11/12/13): ViewTabBar\'s own keys and closability; the host\'s live confirmations (Zx q/ae)', async () => {
  // w10-ccres-e31-terminal: the strip is view-tabs' ViewTabBar (cfe7c4b3b, the same file as the 3.6556.2 chunk, E36), so
  // Delete/Backspace (no Control/Meta/Alt, a held key only prevented), `closable ?? !solo` and the move/close hints run
  // from the original; the host restatements (terminalTabDeleteKey, movableTerminalTabs, isTerminalTabClosable,
  // anyTerminalTabClosable, handleTerminalTabKeyDown, hiddenTerminalTabs) are gone.
  const bar = read('src/generated/view-tabs/cfe7c4b3b-BF79K6ux.js');
  const officialBar = readFileSync(path.join(v3Reference, 'cfe7c4b3b-BF79K6ux.js'), 'utf8');
  for (const text of ['if(!W||e.key!=="Delete"&&e.key!=="Backspace"||e.ctrlKey||e.metaKey||e.altKey||(e.preventDefault(),e.repeat))return;',
    'W=o.closable??!T', 'e=>e.closable??!Y']) {
    assert.ok(officialBar.includes(text), text);
    assert.ok(bar.includes(text), `view-tabs: ${text}`);
  }
  const M = await import('../src/terminal-pane-model.mjs');
  for (const gone of ['terminalTabDeleteKey', 'movableTerminalTabs', 'isTerminalTabClosable', 'anyTerminalTabClosable', 'handleTerminalTabKeyDown', 'hiddenTerminalTabs'])
    assert.equal(M[gone], undefined, gone);
  const live = [{ id: 'a', number: 1, busy: true, status: 'running' }, { id: 'b', number: 2, busy: false, status: 'running', title: 'server' }];
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, live), { kind: 'close', id: 'a', name: 'Terminal 1' });
  assert.equal(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, live.slice(1)), null, 'the tab closed');
  assert.equal(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [{ ...live[0], busy: false }, live[1]]), null, 'its command finished');
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [{ ...live[0], title: 'build' }, live[1]]).name, 'build', 'renamed meanwhile');
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [live[0]]).name, 'Terminal', 'renumbered when alone');
  assert.equal(M.liveTerminalConfirm({ kind: 'close-others', id: 'b', count: 1 }, live).kind, 'close-others');
  assert.equal(M.liveTerminalConfirm({ kind: 'close-others', id: 'b', count: 1 }, [{ ...live[0], status: 'exited' }, live[1]]), null);
  // Zx q: a busy tab asks first (Close terminal?), an idle one closes at once.
  const closedIds = [];
  let confirmState = null;
  const close = (id, list) => M.closeTerminalTab(id, { tabs: list, owner: 's1', sessionId: 's1', homeWorkspace: null,
    terminals: { close: (_o, _s, _h, tab) => closedIds.push(tab) }, setConfirm: (next) => { confirmState = next; } });
  const twoTabs = [{ id: 'a', number: 1, status: 'running', busy: false }, { id: 'b', number: 2, status: 'running', busy: true }];
  assert.equal(close('a', twoTabs), 'closed');
  assert.equal(close('b', twoTabs), 'confirm');
  assert.deepEqual([closedIds, confirmState], [['a'], { kind: 'close', id: 'b' }]);
  // The official confirmation copy the pane shows (cccc2cf0a Zx Ie).
  const pane = readFileSync(path.join(v3Reference, 'cccc2cf0a-DhZC33Gc.js'), 'utf8');
  for (const text of ['defaultMessage:"Close terminal?",id:"n6kL6t0goq"', 'defaultMessage:"A command is still running in {name}. Closing the terminal stops it.",id:"WDzRozXJ72"',
    'defaultMessage:"Close other terminals?",id:"VFu34h7wUm"'])
    assert.ok(pane.includes(text), text);
});

test('the key-repeat guard after a close is shared-19 dZ: the held key stops at the next tab', async () => {
  const { suppressKeyRepeat } = await import('../src/generated/code-editor-current/keyboard-repeat.mjs');
  // A window stand-in: Node's EventTarget ignores a boolean `capture` in removeEventListener (browsers honour it), so
  // listeners are kept by (type, capture) here as a browser would.
  const listeners = new Set(), capture = (options) => (typeof options === 'boolean' ? options : !!options?.capture);
  const view = {
    addEventListener: (type, fn, options) => { listeners.add({ type, fn, capture: capture(options) }); },
    removeEventListener: (type, fn, options) => { for (const entry of listeners) if (entry.fn === fn && entry.type === type && entry.capture === capture(options)) listeners.delete(entry); },
    dispatchEvent: (event) => { for (const entry of [...listeners]) if (entry.type === event.type) entry.fn(event); },
  };
  suppressKeyRepeat('Delete', view);
  const key = (type, props) => Object.assign(new Event(type, { cancelable: true }), props);
  const held = key('keydown', { key: 'Delete', repeat: true });
  view.dispatchEvent(held);
  assert.equal(held.defaultPrevented, true);
  view.dispatchEvent(key('keyup', { key: 'Delete' }));
  const next = key('keydown', { key: 'Delete', repeat: true });
  view.dispatchEvent(next);
  assert.equal(next.defaultPrevented, false, 'released: the guard is gone');
});

test('the pane and its helpers no longer read the 2.31226.0 terminal adapters', () => {
  const sources = readdirSync(path.join(app, 'src')).filter((name) => /^(source-terminal-|terminal-).*\.(m?js|jsx)$/.test(name));
  for (const name of sources) assert.doesNotMatch(read(`src/${name}`), /generated\/code-editor\/terminal-/, name);
  const pane = read('src/source-terminal-pane.jsx');
  for (const module of ['terminal-output', 'terminal-mouse', 'terminal-colors', 'terminal-link-selection', 'terminal-idle-cursor', 'terminal-clear-item'])
    assert.match(pane, new RegExp(`from "\\./generated/code-current/${module}\\.mjs"`), module);
  // The error kinds are read where they are mapped (terminal-pane-model: acquireTerminalView, restartTerminalTab,
  // terminalCoverState); the pane no longer imports them unused.
  assert.match(read('src/terminal-pane-model.mjs'), /from "\.\/generated\/code-current\/terminal-errors\.mjs";/);
  assert.doesNotMatch(pane, /terminal-errors\.mjs/);
  assert.match(read('src/terminal-titles.mjs'), /from "\.\/generated\/code-current\/terminal-titles\.mjs"/);
  assert.match(read('src/terminal-selection-controller.mjs'), /from '\.\/generated\/code-current\/terminal-geometry\.mjs'/);
  assert.match(read('src/source-terminal-selection.jsx'), /from '\.\/generated\/code-current\/terminal-geometry\.mjs'/);
  // The xterm host carries the official data-ccd-terminal marker the idle cursor hides on; Ur reads the platform itself.
  assert.match(pane, /element\.setAttribute\("data-ccd-terminal", ""\);/);
  assert.match(pane, /terminalOwnsContextMenu\(term, event\.nativeEvent\)/);
  assert.match(pane, /<TerminalClearItem ptyKey=\{id\} \/>/);
  // The file drag is read through R3-files' src/file-context-drag.mjs (the shared module instance), not code-editor.
  assert.match(pane, /import \{ acceptsFileContextDrag, draggedFilePaths \} from "\.\/file-context-drag\.mjs";/);
  assert.doesNotMatch(pane, /generated\/code-editor\//);
  assert.match(read('src/file-context-drag.mjs'), /export \{draggedFilePaths\};/);
});

test('zh-CN carries the terminal copy (2.42304.0 keys kept until W7; the 3.6556.2 cover copy)', async () => {
  const zh = (await import('../electron/i18n/zh-CN/terminal.mjs')).default;
  for (const key of ['Shell exited', 'Failed to start shell', 'Failed to load terminal', 'Couldn’t load the terminal', 'Reload the page to try again.',
    'No terminal to clear', 'Switch to this terminal first.', 'Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.'])
    assert.equal(typeof zh[key], 'string', key);
  assert.match(zh['Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.'], /Claude/, 'D23: Claude stays');
  // cc-rest-terminal-b: the 3.6556.2 copy (panes.mjs V3-cc-rest-terminal-b, plus loadFailed in terminal.mjs).
  const all = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  for (const key of ['Additional terminal tabs require a newer Claude desktop app', 'Restart Claude to update.', 'Couldn’t start the shell', 'Couldn’t load the terminal', 'Try again'])
    assert.equal(typeof all[key], 'string', key);
  assert.match(all['Additional terminal tabs require a newer Claude desktop app'], /Claude/, 'D23: Claude stays');
  assert.match(all['Restart Claude to update.'], /Claude/, 'D23: Claude stays');
});

test('FT-15 (terminal-10, global-v01): the overflow row is the 3.6556.2 se (2.42304.0 ce); the patched 2.31226.0 adapter is gone', async () => {
  const menu = read('src/source-preview-tab-overflow.jsx');
  assert.match(menu, /from '\.\/generated\/code-current\/terminal-tab-overflow\.mjs'/);
  assert.match(menu, /<TabOverflowItem tab=\{tab\} sizes=\{tabOverflowSizes\}/);
  assert.match(menu, /<CdsTooltipProvider delay=\{700\}>/, 'se: the rows sit in the CDS tooltip provider at 700ms (T = kc)');
  assert.match(menu, /useContext\(DirectionContext\)\?\.direction === 'rtl'/, 'se h: vendor-frame Td over DirectionContext');
  assert.doesNotMatch(menu, /generated\/code-editor\/|createPreviewOverflowRow|OverflowText/);
  // The old generator no longer emits (nor patches) the row; its output and manifest entry are gone.
  const old = read('scripts/extract-code-editor.mjs');
  assert.doesNotMatch(old, /replaceAll\('min-w-0 pl-\[2px\]'/);
  assert.doesNotMatch(old, /await adapter\('preview-tab-overflow\.mjs'/);
  const oldManifest = JSON.parse(read('src/generated/code-editor/manifest.json'));
  assert.ok(!oldManifest.adapters.some((entry) => entry.name === 'preview-tab-overflow.mjs'));
  assert.ok(!readdirSync(path.join(app, 'src/generated/code-editor')).includes('preview-tab-overflow.mjs'));
  // The size table (view-tabs viewTabSizes = 3.6556.2 cfe7c4b3b le) carries the logical class, no physical pl-[2px].
  const row = read('src/generated/code-current/terminal-tab-overflow.mjs');
  assert.doesNotMatch(row, /pl-\[2px\]|pl-\[6px\]/);
  const sizes = read('src/generated/view-tabs/cfe7c4b3b-BF79K6ux.js');
  assert.match(sizes, /tabIconShed:"min-w-0 ps-\[2px\]"/);
  assert.match(sizes, /basis:"basis-\[192px\]",basisChromePx:52/);
  for (const name of readdirSync(path.join(app, 'src')).filter((n) => /\.(m?js|jsx)$/.test(n)))
    assert.doesNotMatch(read(`src/${name}`), /preview-tab-overflow\.mjs/, name);
});

test('W13 G11 (D1): terminal-title-invisibles.mjs re-exports routines-shared shared-0 jL / ML, no second copy', () => {
  const text = read('src/generated/code-current/terminal-title-invisibles.mjs');
  assert.equal(text, '// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n'
    + 'import { jL, ML } from "../routines-shared/shared-0-DDOOdL6P.mjs";\n\n'
    + 'export { ML as invisibleBlankClass, jL as invisibleBlankCodePoints };\n');
  assert.deepEqual(terminalPins['terminal-title-invisibles.mjs'].bindings, []);
  assert.equal(terminalPins['terminal-title-invisibles.mjs'].routinesShared, 'shared-0-DDOOdL6P.mjs');
  // The one copy: official shared-0 `jL=Object.freeze([10240,…])` lives only in routines-shared.
  const shared = read('src/generated/routines-shared/shared-0-DDOOdL6P.mjs');
  assert.equal(shared.split('var jL = Object.freeze([10240, 65532, 119129, 78913, 78914, 92432, 94180]);').length - 1, 1);
  assert.doesNotMatch(text, /Object\.freeze/);
});
