import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// R3-terminal FT-03/FT-04: the terminal pane's original 2.42304.0 bindings (extract-code-ui-current.mjs, pinned by
// code-current-terminal-pins.mjs) and the host wiring that replaced the 2.31226.0 adapters of generated/code-editor.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const generated = path.join(app, 'src/generated/code-current');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (file) => readFileSync(path.join(app, file), 'utf8');
const { terminalPins, pinTerminalHelper } = await import('../scripts/code-current-terminal-pins.mjs');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const TARGETS = ['terminal-geometry.mjs', 'terminal-output.mjs', 'terminal-mouse.mjs', 'terminal-colors.mjs', 'terminal-link-selection.mjs',
  'terminal-errors.mjs', 'terminal-title-wellformed.mjs', 'terminal-title-invisibles.mjs', 'terminal-title-runs.mjs', 'terminal-title-text.mjs',
  'terminal-titles.mjs', 'terminal-idle-cursor.mjs', 'terminal-registry.mjs', 'terminal-clear-item.mjs',
  // R3-terminal FT-15: the shared strip's overflow row (cfe7c4b3b ce) and the CDS size attribute it spreads (shared-frame aa).
  'terminal-tab-overflow.mjs', 'terminal-tab-size-attrs.mjs'];

test('every terminal helper is generated from its 2.42304.0 chunk with the pinned binding closure', async () => {
  assert.deepEqual(Object.keys(terminalPins).sort(), [...TARGETS].sort());
  for (const target of TARGETS) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    const pin = terminalPins[target];
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry.source), pin.source, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, pin.source))), `${target} source bytes`);
    assert.equal(entry.sha256, sha(readFileSync(path.join(generated, target))), `${target} output bytes`);
    // Closure, feature strings, official export aliases, replaced imports and call sites, against the shipped chunk.
    assert.deepEqual(await pinTerminalHelper(target, reference), entry.bindings, target);
  }
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
  assert.deepEqual(Object.fromEntries(Object.entries(E.terminalErrorMessages).map(([kind, message]) => [kind, message.defaultMessage])), {
    needsNewerApp: 'Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.',
    startFailed: 'Failed to start shell',
    loadFailed: 'Failed to load terminal',
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
    kind: 'raw', text: 'Spawn failed', action: 'Try again', retry: undefined, exited: true,
  });
  await M.restartTerminalTab({
    active, sessionId: 's1', homeWorkspace: null,
    terminals: { restart: async () => { throw new Error(''); } },
    startFailedTerminals: startFailed, setRestartError: (next) => { restartError = next; },
  });
  assert.deepEqual(M.terminalCoverState({ active, restartError }), {
    kind: 'startFailed', text: 'Failed to start shell', action: 'Try again', retry: undefined, exited: true,
  });
  assert.equal(M.terminalCoverState({ active, restartError: { id: 'term-err', error: E.needsNewerAppError } }).action, null);
  let clearedHost = 0, viewCalls = 0;
  const hostNode = { replaceChildren() { clearedHost += 1; } };
  assert.equal(M.acquireTerminalView({
    activeId: 'term-err', sessionId: 's1', homeWorkspace: null,
    terminals: { view() { viewCalls += 1; throw new Error(''); } },
    createView: () => ({}), hostNode, viewError, setViewError: (next) => { viewError = next; },
  }), null);
  assert.equal(clearedHost, 1);
  assert.deepEqual(viewError, { id: 'term-err', error: E.loadFailedError });
  let retried = 0;
  const cover = M.terminalCoverState({
    active: { id: 'term-err', status: 'running' }, viewError,
    onRetryView: () => { viewError = null; retried += 1; },
  });
  assert.equal(cover.text, 'Failed to load terminal');
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

test('tab strip rules: Delete/Backspace (terminal-11), the move hint (terminal-12), live confirmations (terminal-13)', async () => {
  const M = await import('../src/terminal-pane-model.mjs');
  assert.equal(M.terminalTabDeleteKey({ key: 'Delete' }), 'close');
  assert.equal(M.terminalTabDeleteKey({ key: 'Backspace', shiftKey: true }), 'close');
  for (const key of ['metaKey', 'ctrlKey', 'altKey']) assert.equal(M.terminalTabDeleteKey({ key: 'Backspace', [key]: true }), null, key);
  assert.equal(M.terminalTabDeleteKey({ key: 'Delete', repeat: true }), 'repeat');
  assert.equal(M.terminalTabDeleteKey({ key: 'ArrowRight' }), null);
  const tabs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual([...M.movableTerminalTabs(tabs.slice(0, 1))], []);
  assert.deepEqual([...M.movableTerminalTabs(tabs)], ['a', 'b', 'c']);
  assert.deepEqual([...M.movableTerminalTabs(tabs, ['b', 'c'])], [], 'gt: a tab whose neighbours are all hidden cannot move');
  assert.deepEqual([...M.movableTerminalTabs(tabs, ['c'])], ['a', 'b']);
  const live = [{ id: 'a', number: 1, busy: true, status: 'running' }, { id: 'b', number: 2, busy: false, status: 'running', title: 'server' }];
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, live), { kind: 'close', id: 'a', name: 'Terminal 1' });
  assert.equal(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, live.slice(1)), null, 'the tab closed');
  assert.equal(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [{ ...live[0], busy: false }, live[1]]), null, 'its command finished');
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [{ ...live[0], title: 'build' }, live[1]]).name, 'build', 'renamed meanwhile');
  assert.deepEqual(M.liveTerminalConfirm({ kind: 'close', id: 'a' }, [live[0]]).name, 'Terminal', 'renumbered when alone');
  assert.equal(M.liveTerminalConfirm({ kind: 'close-others', id: 'b', count: 1 }, live).kind, 'close-others');
  assert.equal(M.liveTerminalConfirm({ kind: 'close-others', id: 'b', count: 1 }, [{ ...live[0], status: 'exited' }, live[1]]), null);
  // Y1-R3-terminal-1 & Y1-R3-terminal-2: a lone tab is unclosable (U = e.closable ?? !w, ot); Delete/Backspace only
  // closes when closable, installs suppressKeyRepeat, and routes through closeTerminalTab (confirming busy tabs).
  assert.equal(M.isTerminalTabClosable({ id: 'a' }, true), false);
  assert.equal(M.isTerminalTabClosable({ id: 'a', closable: true }, true), true);
  assert.equal(M.isTerminalTabClosable({ id: 'a' }, false), true);
  assert.equal(M.isTerminalTabClosable({ id: 'a', closable: false }, false), false);
  assert.equal(M.anyTerminalTabClosable([{ id: 'a' }]), false);
  assert.equal(M.anyTerminalTabClosable([{ id: 'a', closable: true }]), true);
  assert.equal(M.anyTerminalTabClosable([{ id: 'a' }, { id: 'b' }]), true);
  assert.equal(M.terminalTabDeleteKey({ key: 'Delete' }, false), null);
  const closedIds = [], suppressed = [];
  let confirmState = null;
  const fakeTerminals = { close: (_o, _s, _h, id) => closedIds.push(id), move() {} };
  const close = (id, list) => M.closeTerminalTab(id, {
    tabs: list, owner: 's1', sessionId: 's1', homeWorkspace: null, terminals: fakeTerminals,
    setConfirm: (next) => { confirmState = next; },
  });
  const keyEv = (key, extra = {}) => ({
    key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, prevented: false,
    currentTarget: { ownerDocument: { defaultView: { name: 'win' } } },
    preventDefault() { this.prevented = true; },
    ...extra,
  });
  const soloKey = keyEv('Delete');
  assert.equal(M.handleTerminalTabKeyDown(soloKey, 'a', {
    tabs: [{ id: 'a', status: 'running', busy: false }], owner: 's1', terminals: fakeTerminals,
    close: (id) => close(id, [{ id: 'a', status: 'running', busy: false }]), select() {},
    getWindow: (el) => el.ownerDocument.defaultView, onSuppressKeyRepeat: (k, w) => suppressed.push([k, w]),
  }), null);
  assert.equal(soloKey.prevented, false);
  assert.equal(closedIds.length, 0);
  assert.equal(suppressed.length, 0);
  const twoTabs = [{ id: 'a', number: 1, status: 'running', busy: false }, { id: 'b', number: 2, status: 'running', busy: true }];
  const delIdle = keyEv('Delete');
  assert.equal(M.handleTerminalTabKeyDown(delIdle, 'a', {
    tabs: twoTabs, owner: 's1', terminals: fakeTerminals,
    close: (id) => close(id, twoTabs), select() {},
    getWindow: (el) => el.ownerDocument.defaultView, onSuppressKeyRepeat: (k, w) => suppressed.push([k, w.name]),
  }), 'close');
  assert.equal(delIdle.prevented, true);
  assert.deepEqual(closedIds, ['a']);
  assert.deepEqual(suppressed, [['Delete', 'win']]);
  const delBusy = keyEv('Backspace');
  assert.equal(M.handleTerminalTabKeyDown(delBusy, 'b', {
    tabs: twoTabs, owner: 's1', terminals: fakeTerminals,
    close: (id) => close(id, twoTabs), select() {},
    getWindow: (el) => el.ownerDocument.defaultView, onSuppressKeyRepeat: (k, w) => suppressed.push([k, w.name]),
  }), 'close');
  assert.deepEqual(confirmState, { kind: 'close', id: 'b' });
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
  for (const module of ['terminal-output', 'terminal-mouse', 'terminal-colors', 'terminal-link-selection', 'terminal-idle-cursor', 'terminal-errors', 'terminal-clear-item'])
    assert.match(pane, new RegExp(`from "\\./generated/code-current/${module}\\.mjs"`), module);
  assert.match(read('src/terminal-titles.mjs'), /from "\.\/generated\/code-current\/terminal-titles\.mjs"/);
  assert.match(read('src/terminal-selection-controller.mjs'), /from '\.\/generated\/code-current\/terminal-geometry\.mjs'/);
  assert.match(read('src/source-terminal-selection.jsx'), /from '\.\/generated\/code-current\/terminal-geometry\.mjs'/);
  // The xterm host carries the official data-ccd-terminal marker the idle cursor hides on; Ur reads the platform itself.
  assert.match(pane, /element\.setAttribute\("data-ccd-terminal", ""\);/);
  assert.match(pane, /terminalOwnsContextMenu\(term, event\.nativeEvent\)/);
  assert.match(pane, /<TerminalClearItem ptyKey=\{tab\.id\} \/>/);
  // The file drag is read through R3-files' src/file-context-drag.mjs (the shared module instance), not code-editor.
  assert.match(pane, /import \{ acceptsFileContextDrag, draggedFilePaths \} from "\.\/file-context-drag\.mjs";/);
  assert.doesNotMatch(pane, /generated\/code-editor\//);
  assert.match(read('src/file-context-drag.mjs'), /export \{draggedFilePaths\};/);
});

test('zh-CN carries the 2.42304.0 terminal copy', async () => {
  const zh = (await import('../electron/i18n/zh-CN/terminal.mjs')).default;
  for (const key of ['Shell exited', 'Failed to start shell', 'Failed to load terminal', 'Couldn’t load the terminal', 'Reload the page to try again.',
    'No terminal to clear', 'Switch to this terminal first.', 'Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.'])
    assert.equal(typeof zh[key], 'string', key);
  assert.match(zh['Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.'], /Claude/, 'D23: Claude stays');
});

test('FT-15 (terminal-10, global-v01): the overflow row is the 2.42304.0 ce; the patched 2.31226.0 adapter is gone', async () => {
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
  // The generated row carries the logical class straight from the 2.42304.0 size table, no physical pl-[2px].
  const row = read('src/generated/code-current/terminal-tab-overflow.mjs');
  assert.match(row, /tabIconShed: "min-w-0 ps-\[2px\]"/);
  assert.doesNotMatch(row, /pl-\[2px\]|pl-\[6px\]/);
  for (const name of readdirSync(path.join(app, 'src')).filter((n) => /\.(m?js|jsx)$/.test(n)))
    assert.doesNotMatch(read(`src/${name}`), /preview-tab-overflow\.mjs/, name);
});
