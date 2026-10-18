import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Server render of the terminal pane (middleware-mode Vite SSR, as the other pane render tests): the source-file-panel
// shell with the "Terminal tabs" strip in its 32px header, "New terminal", the drag handle and pane controls, the
// xterm host, the exited / limited / error states; and the titlebar's Terminal toggle with its running dot.
const app = path.resolve(import.meta.dirname, '..');
let server, P, S, T, C;
const emitted = [];
let emit = null;
before(async () => {
  globalThis.desktop = { terminal: {
    call: async (op) => (op === 'hello' ? { backend: 'pty' } : []),
    write() {},
    onEvent(handler) { emit = handler; return () => {}; },
  } };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  S = await server.ssrLoadModule('/src/terminal-store.mjs');
  P = await server.ssrLoadModule('/src/source-terminal-pane.jsx');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  C = await server.ssrLoadModule('/src/source-pane-controls.jsx');
});
after(async () => { await server?.close(); delete globalThis.desktop; });
const h = React.createElement;
const state = (info) => { emitted.push(info); emit({ kind: 'state', info: { owner: 's1', sessionId: 's1', status: 'running', generation: 1, busy: false, title: null, cwd: '/tmp/work', ...info } }); };
const pane = (props = {}) => renderToStaticMarkup(h(P.SourceTerminalPane, { sessionId: 's1', cwd: '/tmp/work', headerCenter: h('span', { className: 'handle' }),
  controls: h(C.SourcePaneControls, { tileId: 'terminal', paneName: 'Terminal', layout: null, onToggleExpand() {}, onClose() {} }), ...props }));

test('an empty pane: header strip, New terminal, handle and controls, the idle cursor', () => {
  const html = pane({ sessionId: 'empty' });
  assert.match(html, /<aside class="source-file-panel detail-panel stp-pane" aria-label="Terminal" data-terminal-owner="empty">/);
  assert.match(html, /<header class="source-pane-header" data-pane-header="terminal">/);
  assert.match(html, /role="tablist" aria-label="Terminal tabs"/);
  assert.match(html, /aria-label="New terminal"/);
  assert.ok(html.indexOf('aria-label="New terminal"') < html.indexOf('class="handle"'), 'the + sits before the drag handle');
  assert.match(html, /data-pane-header="terminal">[\s\S]*class="handle"[\s\S]*<\/header>/);
  assert.match(html, /<div class="stp-body group\/terminal"[^>]*><div class="stp-host"><\/div>/);
  // R3-terminal (terminal-09): cf718f694 B as c6bf19e8f pi places it — the original classes, hidden once an xterm host
  // ([data-ccd-terminal]) is in the group/terminal body, blinking with the Blink cursor preference (on by default).
  assert.match(html, /<span aria-hidden="true" data-testid="terminal-idle-cursor" data-blink="true" class="pointer-events-none block h-\[1lh\] w-\[1ch\] opacity-50 absolute group-has-\[\[data-ccd-terminal\]\]\/terminal:hidden" style="top:var\(--cds-pad-md\);left:var\(--cds-pad-md\);font-family:.+?;font-size:12px;line-height:normal"><span class="block h-full w-full motion-safe:animate-blink" style="background-color:#0073e6"><\/span><\/span>/);
  assert.doesNotMatch(html, /terminal-pane-placeholder|stp-placeholder/);
  // cfe7c4b3b Y: no tab can close or move, so neither hint is rendered.
  assert.doesNotMatch(html, /Press Delete or Backspace to close the terminal|Press Control\+Shift/);
  assert.doesNotMatch(html, /cursor:\s*pointer/);
});

test('tabs: one tab reads "Terminal", several read "Terminal {n}" or their name; running, exited and limited states', () => {
  state({ id: 'term-aaaaaa', number: 1 });
  let html = pane();
  assert.match(html, /data-terminal-id="term-aaaaaa" data-selected="true"/);
  assert.match(html, /role="tab" aria-selected="true" aria-posinset="1" aria-setsize="1" tabindex="0"/);
  assert.match(html, /<span>Terminal<\/span>/);
  // terminal-11/12 (cfe7c4b3b ge U = e.closable ?? !w, Y ot/gt; Y1-R3-terminal-1): a lone terminal tab has neither a
  // close button nor a neighbour to move past — neither close hint nor move hint is rendered, and no X button appears.
  assert.doesNotMatch(html, /Press Delete or Backspace to close the terminal/);
  assert.doesNotMatch(html, /Press Control\+Shift\+Left Arrow or Right Arrow to move the terminal/);
  assert.doesNotMatch(html, /role="tab"[^>]*aria-describedby=/);
  assert.doesNotMatch(html, /aria-label="Close terminal"/);
  assert.match(html, /data-testid="terminal-idle-cursor"/);
  state({ id: 'term-bbbbbb', number: 2, busy: true, title: 'dev server' });
  state({ id: 'term-cccccc', number: 3 });
  html = pane();
  assert.match(html, /aria-setsize="3"/);
  assert.match(html, /<span>Terminal 1<\/span>/);
  assert.match(html, /data-terminal-id="term-bbbbbb" data-busy="true"/);
  assert.match(html, /dev server<span class="source-sr-only">, Terminal \(command running\)<\/span>/);
  assert.match(html, /<span>Terminal 3<\/span>/);
  assert.equal((html.match(/tabindex="0"/g) || []).length >= 1, true);
  // With multiple tabs every tab is closable (U) and movable (gt): each renders its X button and describes itself by both hints.
  const closeHint = html.match(/<span id="([^"]+)" class="source-sr-only">Press Delete or Backspace to close the terminal<\/span>/)?.[1];
  const moveHint = html.match(/<span id="([^"]+)" class="source-sr-only">Press Control\+Shift\+Left Arrow or Right Arrow to move the terminal<\/span>/)?.[1];
  assert.ok(closeHint && moveHint);
  assert.equal((html.match(new RegExp(`aria-describedby="${closeHint} ${moveHint}"`, 'g')) || []).length, 3);
  assert.equal((html.match(/aria-label="Close terminal"/g) || []).length, 3);
  // The active tab exited (c6bf19e8f pi N): "Shell exited" (2.42304.0, no full stop, 0OhRI4K1+t) covers the surface;
  // Restart shell is described by it; the tab's own status reads the same.
  state({ id: 'term-aaaaaa', number: 1, status: 'exited', exitCode: 1 });
  html = pane();
  assert.match(html, /<div class="stp-host" hidden="">/, 'the xterm surface is hidden under the overlay');
  assert.match(html, /class="stp-overlay" data-terminal-exited="">[\s\S]*<span id="([^"]+)-exited">Shell exited<\/span>/);
  assert.match(html, /aria-describedby="[^"]+-exited" data-initial-focus=""[^>]*>[\s\S]*Restart shell</);
  assert.match(html, /Terminal 1<span class="source-sr-only">, Shell exited<\/span>/);
  assert.doesNotMatch(html, /Shell exited\./);
  assert.doesNotMatch(html, /terminal-idle-cursor/, 'no idle cursor under the exited shell (pi: !et)');
  // A limited (script backend) terminal says so.
  state({ id: 'term-aaaaaa', number: 1, status: 'running', limited: true, backend: 'script' });
  html = pane();
  assert.match(html, /class="stp-note" role="note">Limited terminal/);
});

test('a tab without its own name shows the running command or the title’s last segment, muted after the name', async () => {
  const titles = (await server.ssrLoadModule('/src/terminal-titles.mjs')).terminalTitles();
  let onTitle = null;
  titles.install({ onTitleChange(handler) { onTitle = handler; }, parser: { registerOscHandler() {} } }, 'term-cccccc');
  onTitle('me@host: ~/work/project');
  let html = pane();
  assert.match(html, /<span>Terminal 3<span class="stp-tab-description"><span class="source-sr-only">, <\/span>project<\/span><\/span>/);
  // A named tab keeps only its name (Zg: n.name === void 0).
  titles.install({ onTitleChange(handler) { onTitle = handler; }, parser: { registerOscHandler() {} } }, 'term-bbbbbb');
  onTitle('vim notes.md');
  html = pane();
  assert.doesNotMatch(html, /dev server<span class="stp-tab-description">/);
  titles.forget('term-cccccc'); titles.forget('term-bbbbbb');
});

test('without the preload bridge the pane explains it cannot load (no crash)', async () => {
  const store = S.createTerminalStore({ bridge: null });
  assert.equal(store.available, false);
  // The shared store exists already (bridge present); the copy for a bridge-less window is checked through the model.
  const { terminalError } = await server.ssrLoadModule('/src/terminal-pane-model.mjs');
  assert.equal(terminalError(new Error("Error invoking remote method 'terminal:call': Error: Unknown session."), 'x'), 'Unknown session.');
});

test('titlebar: the Terminal toggle with ⌘J, pressed while open, a running dot while hidden', () => {
  const render = (props) => renderToStaticMarkup(h(T.SourceTitlebar, { section: 'new', session: { id: 'a', name: 'A', cwd: '/tmp/work' }, onRename() {}, ...props }));
  assert.doesNotMatch(render({}), /data-pane-toggle="terminal"/, 'hidden unless main.jsx can open it');
  let html = render({ terminalAvailable: true, panes: new Set(['chat']) });
  const button = html.match(/<button[^>]*data-pane-toggle="terminal"[^>]*>/)?.[0];
  assert.ok(button);
  assert.match(button, /aria-label="Terminal"/);
  assert.match(button, /aria-pressed="false"/);
  assert.match(button, /aria-keyshortcuts="Meta\+J Control\+`"/);
  assert.ok(html.indexOf('data-pane-toggle="terminal"') < html.indexOf('aria-label="Changes"'), 'before Changes');
  html = render({ terminalAvailable: true, terminalBusy: true, panes: new Set(['chat']) });
  assert.match(html, /aria-label="Terminal \(command running\)"[^>]*data-pane-toggle="terminal"/);
  assert.match(html, /data-pane-toggle="terminal"[^>]*>(?:(?!<\/button>).)*st-indicator-dot/);
  html = render({ terminalAvailable: true, terminalBusy: true, panes: new Set(['chat', 'terminal']) });
  assert.match(html.match(/<button[^>]*data-pane-toggle="terminal"[^>]*>/)[0], /aria-pressed="true"/);
  assert.doesNotMatch(html, /Terminal \(command running\)/);
});

test('the pane stylesheet follows the app rules: tokens, no pointer cursor, reduced motion for every animation', () => {
  const css = fs.readFileSync(path.join(app, 'src/source-terminal-pane.css'), 'utf8');
  assert.doesNotMatch(css, /cursor\s*:\s*pointer/);
  for (const selector of ['.stp-tab[data-bell] > .source-file-tab-bg']) {
    assert.ok(css.includes(`html[data-reduce-motion="true"] ${selector} { animation: none; }`), selector);
  }
  // The idle cursor is styled by the loaded official utilities alone (motion-safe:animate-blink keys on
  // [data-reduce-motion=true] itself); the hand-made placeholder cursor and its keyframes are gone.
  assert.doesNotMatch(css, /stp-placeholder|stp-blink/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Blink cursor off: the idle cursor stays lit (cf718f694 z reads epitaxy-terminal-cursor-blink)', async () => {
  const settings = (await server.ssrLoadModule('/src/terminal-view-settings.mjs')).terminalViewSettings();
  settings.set('cursorBlink', false);
  try {
    const html = pane({ sessionId: 'blink-off' });
    assert.match(html, /data-testid="terminal-idle-cursor" data-blink="false"/);
    assert.match(html, /<span class="block h-full w-full" style="background-color:[^"]+"><\/span>/);
  } finally { settings.set('cursorBlink', true); }
  assert.match(pane({ sessionId: 'blink-on' }), /data-blink="true"[\s\S]*motion-safe:animate-blink/);
});

test('Clear terminal (cccc2cf0a Zy, terminal-07): a live terminal, a view without one, a tab never shown here', async () => {
  const { TerminalClearItem, mountedTerminalViews, terminalClearState } = await server.ssrLoadModule('/src/generated/code-current/terminal-clear-item.mjs');
  const { clearTerminalViaRegistry } = await server.ssrLoadModule('/src/generated/code-current/terminal-registry.mjs');
  const host = await server.ssrLoadModule('/src/terminal-registry-host.mjs');
  const item = () => renderToStaticMarkup(h(TerminalClearItem, { ptyKey: 'term-clear' }));
  assert.equal(terminalClearState('term-clear'), 'noView');
  assert.match(item(), /Clear terminal[\s\S]*data-cds-disabled-reason="">Switch to this terminal first\.<\/span>/);
  mountedTerminalViews.set('term-clear', 1); // the pane showed it (Jy mounted) but it has no live xterm
  try {
    assert.equal(terminalClearState('term-clear'), 'viewOnly');
    assert.match(item(), /data-cds-disabled-reason="">No terminal to clear<\/span>/);
    S.terminalStore().view('term-clear', 's1', null, () => ({ write() {}, reset() {}, clear() {}, dispose() {}, element: null }));
    assert.equal(terminalClearState('term-clear'), 'terminal');
    assert.doesNotMatch(item(), /data-cds-disabled-reason/);
    host.startFailedTerminals.add('term-clear'); // a Restart shell that failed (c6bf19e8f Rr: startFailed)
    assert.equal(terminalClearState('term-clear'), 'viewOnly');
    host.startFailedTerminals.delete('term-clear');
    // jd → the pane that shows the terminal clears it.
    const cleared = [], entry = { owns: (id) => id === 'term-clear', clear: (id) => cleared.push(id) };
    host.terminalPanes.add(entry);
    clearTerminalViaRegistry('term-clear');
    clearTerminalViaRegistry('term-elsewhere');
    host.terminalPanes.delete(entry);
    assert.deepEqual(cleared, ['term-clear']);
  } finally { mountedTerminalViews.delete('term-clear'); }
});

test('without the terminal bridge: cccc2cf0a Ay — "Couldn’t load the terminal", its body and Reload (term-v02)', async () => {
  const saved = globalThis.desktop;
  delete globalThis.desktop;
  const bare = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const Pane = await bare.ssrLoadModule('/src/source-terminal-pane.jsx');
    const html = renderToStaticMarkup(h(Pane.SourceTerminalPane, { sessionId: 's9', cwd: '/tmp/work' }));
    assert.match(html, /<div class="stp-overlay"><div role="alert"[^>]*>[\s\S]*<p class="[^"]*text-primary">Couldn’t load the terminal<\/p><p class="[^"]*text-footnote text-muted">Reload the page to try again\.<\/p>[\s\S]*>Reload</);
    assert.doesNotMatch(html, /terminal-idle-cursor/);
    assert.match(html, /<div class="stp-host" hidden="">/);
  } finally { await bare.close(); globalThis.desktop = saved; }
});

test('Y1-R3-terminal-1/2: single-tab unclosable interactions, multi-tab Delete/middle-click/X, restart failure and view failure retry', async () => {
  const M = await server.ssrLoadModule('/src/terminal-pane-model.mjs');
  const { terminalClearState, mountedTerminalViews } = await server.ssrLoadModule('/src/generated/code-current/terminal-clear-item.mjs');
  const host = await server.ssrLoadModule('/src/terminal-registry-host.mjs');
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function runTab(props, menuOpenState = false) {
    const old = internal.H;
    let menuOpen = menuOpenState;
    internal.H = {
      useRef: (v) => ({ current: v }),
      useState: (init) => [typeof init === 'function' ? init() : (init === false ? menuOpen : init), (next) => { if (typeof next === 'boolean') menuOpen = next; }],
      useLayoutEffect() {},
      useContext: (ctx) => ctx._currentValue,
    };
    try { return { tree: P.TerminalTab(props), getMenuOpen: () => menuOpen }; }
    finally { internal.H = old; }
  }
  const closed = [], selected = [], moved = [], suppressed = [];
  let confirm = null;
  const fakeTerminals = {
    close: (_o, _s, _h, id) => closed.push(id),
    move: (_o, id, delta) => moved.push([id, delta]),
  };
  const makeProps = (tabs, index, extra = {}) => {
    const tab = tabs[index];
    const solo = tabs.length === 1;
    const closable = M.isTerminalTabClosable(tab, solo);
    return {
      tab, label: M.tabLabel(tab, tabs.length), running: undefined, selected: index === 0, posinset: index + 1, setsize: tabs.length,
      closable, hintId: 'hint-close', moveHintId: M.movableTerminalTabs(tabs).has(tab.id) ? 'hint-move' : undefined,
      bell: false, renaming: false, onRenameDone() {}, onSelect: () => selected.push(tab.id),
      onClose: () => M.closeTerminalTab(tab.id, { tabs, owner: 's1', sessionId: 's1', homeWorkspace: null, terminals: fakeTerminals, setConfirm: (c) => { confirm = c; } }),
      onKeyDown: (ev) => M.handleTerminalTabKeyDown(ev, tab.id, {
        tabs, owner: 's1', terminals: fakeTerminals,
        close: (id) => M.closeTerminalTab(id, { tabs, owner: 's1', sessionId: 's1', homeWorkspace: null, terminals: fakeTerminals, setConfirm: (c) => { confirm = c; } }),
        select: (id) => selected.push(id),
        getWindow: (el) => el?.ownerDocument?.defaultView ?? null,
        onSuppressKeyRepeat: (k, w) => suppressed.push([k, w]),
      }),
      onRename() {}, onCloseOthers: tabs.length > 1 ? () => {} : null, onPointerDown() {},
      ...extra,
    };
  };
  // 1) Solo tab: no X button, no close hint in aria-describedby, middle click and Delete/Backspace do nothing, context menu omits Close.
  const soloTabs = [{ id: 'term-solo', number: 1, status: 'running', busy: false }];
  const soloTree = runTab(makeProps(soloTabs, 0)).tree;
  const soloChildren = React.Children.toArray(soloTree.props.children);
  assert.equal(soloChildren.some((child) => child?.type === 'button' && child.props?.['aria-label'] === 'Close terminal'), false, 'no X button on solo tab');
  const soloTabRole = soloChildren.find((child) => child?.props?.children?.props?.role === 'tab').props.children;
  assert.equal(soloTabRole.props['aria-describedby'], undefined);
  const midDown = { button: 1, prevented: false, preventDefault() { this.prevented = true; } };
  soloTree.props.onMouseDown(midDown);
  soloTree.props.onAuxClick(midDown);
  assert.deepEqual([midDown.prevented, closed.length], [false, 0], 'middle click ignored on solo tab');
  const delSolo = { key: 'Delete', prevented: false, preventDefault() { this.prevented = true; }, currentTarget: { ownerDocument: { defaultView: 'w' } } };
  soloTabRole.props.onKeyDown(delSolo);
  assert.deepEqual([delSolo.prevented, closed.length, suppressed.length], [false, 0, 0], 'Delete ignored on solo tab');
  const soloMenuTree = runTab(makeProps(soloTabs, 0), true).tree;
  const soloPopup = React.Children.toArray(soloMenuTree.props.children).find((child) => child?.props?.dataCds === 'ContextMenu');
  const soloMenuLabels = React.Children.toArray(soloPopup.props.children).map((item) => item?.props?.children).filter(Boolean);
  assert.equal(soloMenuLabels.includes('Close terminal'), false, 'no Close terminal in solo tab menu');
  assert.equal(soloMenuLabels.includes('Close other terminals'), false);

  // 2) Multi-tab: X button, middle click, and Delete/Backspace close (or open confirmation when busy).
  const multiTabs = [
    { id: 'term-1', number: 1, status: 'running', busy: false },
    { id: 'term-2', number: 2, status: 'running', busy: true },
  ];
  const tab1Tree = runTab(makeProps(multiTabs, 0)).tree;
  const tab1Children = React.Children.toArray(tab1Tree.props.children);
  const closeBtn = tab1Children.find((child) => child?.type === 'button' && child.props?.['aria-label'] === 'Close terminal');
  assert.ok(closeBtn, 'X button rendered on multi-tab');
  closeBtn.props.onClick({ stopPropagation() {} });
  assert.deepEqual(closed, ['term-1']);
  const midMulti = { button: 1, prevented: false, preventDefault() { this.prevented = true; } };
  tab1Tree.props.onMouseDown(midMulti);
  assert.equal(midMulti.prevented, true);
  tab1Tree.props.onAuxClick({ button: 1, preventDefault() {} });
  assert.deepEqual(closed, ['term-1', 'term-1']);
  const tab1Role = tab1Children.find((child) => child?.props?.children?.props?.role === 'tab').props.children;
  assert.equal(tab1Role.props['aria-describedby'], 'hint-close hint-move');
  const delTab1 = { key: 'Backspace', prevented: false, preventDefault() { this.prevented = true; }, currentTarget: { ownerDocument: { defaultView: 'w1' } } };
  tab1Role.props.onKeyDown(delTab1);
  assert.equal(delTab1.prevented, true);
  assert.deepEqual(closed, ['term-1', 'term-1', 'term-1']);
  assert.deepEqual(suppressed, [['Backspace', 'w1']]);
  const tab2Role = React.Children.toArray(runTab(makeProps(multiTabs, 1)).tree.props.children).find((child) => child?.props?.children?.props?.role === 'tab').props.children;
  tab2Role.props.onKeyDown({ key: 'Delete', preventDefault() {}, currentTarget: { ownerDocument: { defaultView: 'w2' } } });
  assert.deepEqual(confirm, { kind: 'close', id: 'term-2' }, 'busy tab asks for confirmation instead of closing immediately');

  // 3) Restart failure → startFailedTerminals → Clear terminal is viewOnly ("No terminal to clear") → cover state → recovery.
  mountedTerminalViews.set('term-restart', 1);
  S.terminalStore().view('term-restart', 's1', null, () => ({ write() {}, reset() {}, clear() {}, dispose() {}, element: null }));
  try {
    assert.equal(terminalClearState('term-restart'), 'terminal');
    let restartError = null;
    const exitedTab = { id: 'term-restart', status: 'exited' };
    await M.restartTerminalTab({
      active: exitedTab, sessionId: 's1', homeWorkspace: null,
      terminals: { restart: async () => { throw new Error(''); } },
      startFailedTerminals: host.startFailedTerminals,
      setRestartError: (next) => { restartError = next; },
    });
    assert.equal(host.startFailedTerminals.has('term-restart'), true);
    assert.equal(terminalClearState('term-restart'), 'viewOnly', 'Rr startFailed makes Clear terminal disabled with No terminal to clear');
    const cover = M.terminalCoverState({ active: exitedTab, restartError });
    assert.equal(cover.text, 'Failed to start shell');
    assert.equal(cover.action, 'Try again');
    await M.restartTerminalTab({
      active: exitedTab, sessionId: 's1', homeWorkspace: null,
      terminals: { restart: async () => ({ id: 'term-restart', status: 'running' }) },
      startFailedTerminals: host.startFailedTerminals,
      setRestartError: (next) => { restartError = next; },
    });
    assert.equal(host.startFailedTerminals.has('term-restart'), false);
    assert.equal(restartError, null);
    assert.equal(terminalClearState('term-restart'), 'terminal');
  } finally {
    host.startFailedTerminals.delete('term-restart');
    mountedTerminalViews.delete('term-restart');
  }
});
