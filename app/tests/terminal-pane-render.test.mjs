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
// shell with the "Terminal tabs" strip in its 32px header (w10-ccres-e31-terminal: the official ViewTabBar, cfe7c4b3b t,
// as 3.6556.2 cccc2cf0a Zx renders it, with its own "New terminal" +), the drag handle and pane controls, the xterm
// host, the exited / limited / error states; and the titlebar's Terminal toggle with its running dot.
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
  // cccc2cf0a Zx: the strip wrapper, then ViewTabBar (data-view-tab-bar, className "min-w-0 flex-1") with its tablist.
  assert.match(html, /data-pane-header="terminal"><div role="presentation" class="relative flex items-center flex-1 min-w-0 gap-1"><div [^>]*data-view-tab-bar="" class="[^"]*source-view-tabs min-w-0 flex-1">/);
  assert.match(html, /role="tablist" aria-label="Terminal tabs"/);
  assert.match(html, /data-cds="Button"[^>]*aria-label="New terminal"/);
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

test('tabs (cccc2cf0a Zx I on ViewTabBar): "Terminal" alone, "Terminal {n}" or the name; no busy or status mark; exited and limited states', () => {
  state({ id: 'term-aaaaaa', number: 1 });
  let html = pane();
  assert.match(html, /data-vtb-id="term-aaaaaa" data-selected="true"/);
  assert.match(html, /role="tab" tabindex="0" aria-selected="true"[^>]*aria-posinset="1" aria-setsize="1"/);
  assert.match(html, /<span class="whitespace-nowrap text-start">Terminal<\/span>/);
  // terminal-11/12 (cfe7c4b3b `U = e.closable ?? !w`; Zx passes no `closable`): a lone tab has no X and no hints.
  assert.doesNotMatch(html, /Press Delete or Backspace to close the terminal/);
  assert.doesNotMatch(html, /Press Control\+Shift\+Left Arrow or Right Arrow to move the terminal/);
  assert.doesNotMatch(html, /role="tab"[^>]*aria-describedby=/);
  assert.doesNotMatch(html, /aria-label="Close terminal"/);
  assert.match(html, /data-testid="terminal-idle-cursor"/);
  state({ id: 'term-bbbbbb', number: 2, busy: true, title: 'dev server' });
  state({ id: 'term-cccccc', number: 3 });
  html = pane();
  assert.match(html, /aria-setsize="3"/);
  assert.match(html, /<span class="whitespace-nowrap text-start">Terminal 1<\/span>/);
  assert.match(html, /<span class="whitespace-nowrap text-start">dev server<\/span>/);
  assert.match(html, /<span class="whitespace-nowrap text-start">Terminal 3<\/span>/);
  // Zx's tabs carry no status: a running command marks nothing in the strip (the host's dot and sr-only status are gone).
  assert.doesNotMatch(html, /data-busy|Terminal \(command running\)|stp-tab/);
  // Every tab of several can close and move: each has its X and is described by both of ViewTabBar's hints.
  const closeHint = html.match(/<span id="([^"]+)" class="sr-only">Press Delete or Backspace to close the terminal<\/span>/)?.[1];
  const moveHint = html.match(/<span id="([^"]+)" class="sr-only">Press Control\+Shift\+Left Arrow or Right Arrow to move the terminal<\/span>/)?.[1];
  assert.ok(closeHint && moveHint);
  assert.equal((html.match(new RegExp(`aria-describedby="${closeHint} ${moveHint}"`, 'g')) || []).length, 3);
  assert.equal((html.match(/aria-label="Close terminal"/g) || []).length, 3);
  // The active tab exited (c6bf19e8f pi N): "Shell exited" (2.42304.0, no full stop, 0OhRI4K1+t) covers the surface;
  // Restart shell is described by it. The tab itself says nothing (Zx: no status).
  state({ id: 'term-aaaaaa', number: 1, status: 'exited', exitCode: 1 });
  html = pane();
  assert.match(html, /<div class="stp-host" hidden="">/, 'the xterm surface is hidden under the overlay');
  assert.match(html, /class="stp-overlay" data-terminal-exited="">[\s\S]*<span id="([^"]+)-exited">Shell exited<\/span>/);
  assert.match(html, /aria-describedby="[^"]+-exited" data-initial-focus=""[^>]*>[\s\S]*Restart shell</);
  assert.doesNotMatch(html, /, Shell exited/);
  assert.doesNotMatch(html, /Shell exited\./);
  assert.doesNotMatch(html, /terminal-idle-cursor/, 'no idle cursor under the exited shell (pi: !et)');
  // A limited (script backend) terminal says so.
  state({ id: 'term-aaaaaa', number: 1, status: 'running', limited: true, backend: 'script' });
  html = pane();
  assert.match(html, /class="stp-note" role="note">Limited terminal/);
});

test('a tab without its own name shows the running command or the title’s last segment as ViewTabBar’s description', async () => {
  const titles = (await server.ssrLoadModule('/src/terminal-titles.mjs')).terminalTitles();
  let onTitle = null;
  titles.install({ onTitleChange(handler) { onTitle = handler; }, parser: { registerOscHandler() {} } }, 'term-cccccc');
  onTitle('me@host: ~/work/project');
  let html = pane();
  // Zx I `description: n && md(n), detail: n`, rendered by ViewTabBar as its muted description after the label.
  assert.match(html, /<span class="whitespace-nowrap text-start">Terminal 3<span class="ms-xs text-muted-as-secondary"><span class="sr-only">, <\/span>project<\/span><\/span>/);
  // A named tab keeps only its name (Zx M: `t.name === void 0`).
  titles.install({ onTitleChange(handler) { onTitle = handler; }, parser: { registerOscHandler() {} } }, 'term-bbbbbb');
  onTitle('vim notes.md');
  html = pane();
  assert.match(html, /<span class="whitespace-nowrap text-start">dev server<\/span>/);
  const M = await server.ssrLoadModule('/src/terminal-pane-model.mjs');
  const tabs = [{ id: 'a', number: 1 }, { id: 'b', number: 2, title: 'build' }];
  assert.deepEqual(M.terminalStripTabs(tabs, (tab) => (tab.id === 'a' ? 'me@host: ~/x' : null), (title) => `d:${title}`), [
    { id: 'a', label: 'Terminal 1', description: 'd:me@host: ~/x', detail: 'me@host: ~/x', editValue: '' },
    { id: 'b', label: 'build', description: undefined, detail: undefined, editValue: 'build' },
  ]);
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
  // The drop ring's animations stop under reduced motion; the hand-made strip (tab, dot, bell, rename field, +, overflow
  // rows) is gone with the ViewTabBar strip (w10-ccres-e31-terminal), and so are its rules.
  assert.ok(css.includes('html[data-reduce-motion="true"] .stp-drop-ring,\nhtml[data-reduce-motion="true"] .stp-drop-ring > div { animation: none; }'));
  assert.doesNotMatch(css, /\.stp-(tab|tabbar|tabs|new|rename|overflow-menu)\b|stp-bell/);
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

test('Clear terminal (cccc2cf0a sS, 2.42304.0 Zy, terminal-07): a live terminal, a view without one, a tab never shown here', async () => {
  const { TerminalClearItem, mountedTerminalViews, terminalClearState } = await server.ssrLoadModule('/src/generated/code-current/terminal-clear-item.mjs');
  const { clearTerminalViaRegistry } = await server.ssrLoadModule('/src/generated/code-current/terminal-registry.mjs');
  const host = await server.ssrLoadModule('/src/terminal-registry-host.mjs');
  // sS renders `me.Item`, view-tabs' CdsContextMenu.Item (the ViewTabBar tab menu's), so it needs the menu root.
  const { CdsContextMenu } = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  const item = () => renderToStaticMarkup(h(CdsContextMenu.Root, { open: true }, h(TerminalClearItem, { ptyKey: 'term-clear' })));
  assert.equal(terminalClearState('term-clear'), 'noView');
  assert.match(item(), /role="menuitem" aria-disabled="true"[\s\S]*Clear terminal[\s\S]*data-cds-disabled-reason="">Switch to this terminal first\.<\/span>/);
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
    assert.match(html, /<div class="stp-overlay"><div role="alert"[^>]*>[\s\S]*<p class="[^"]*text-primary">Couldn’t load the terminal<\/p><p class="[^"]*text-footnote text-muted-as-secondary">Reload the page to try again\.<\/p>[\s\S]*>Reload</);
    assert.doesNotMatch(html, /terminal-idle-cursor/);
    assert.match(html, /<div class="stp-host" hidden="">/);
  } finally { await bare.close(); globalThis.desktop = saved; }
});

test('Y1-R3-terminal-1/2: the strip is ViewTabBar with Zx\'s handlers; busy close confirms; restart failure and recovery', async () => {
  const M = await server.ssrLoadModule('/src/terminal-pane-model.mjs');
  const { terminalClearState, mountedTerminalViews } = await server.ssrLoadModule('/src/generated/code-current/terminal-clear-item.mjs');
  const host = await server.ssrLoadModule('/src/terminal-registry-host.mjs');
  // 1-2) w10-ccres-e31-terminal: closability (a lone tab cannot close), Delete/Backspace, middle click, the X, the
  // hints, the overflow menu and Control+Shift+←/→ are ViewTabBar's own (cfe7c4b3b t). The host keeps Zx q: an idle tab
  // closes at once, a busy one asks first, a tab already gone does nothing.
  const closed = [];
  let confirm = null;
  const fakeTerminals = { close: (_o, _s, _h, id) => closed.push(id) };
  const tabs = [{ id: 'term-1', number: 1, status: 'running', busy: false }, { id: 'term-2', number: 2, status: 'running', busy: true }];
  const close = (id) => M.closeTerminalTab(id, { tabs, owner: 's1', sessionId: 's1', homeWorkspace: null, terminals: fakeTerminals, setConfirm: (c) => { confirm = c; } });
  assert.equal(close('term-1'), 'closed');
  assert.equal(close('term-2'), 'confirm');
  assert.equal(close('term-gone'), null);
  assert.deepEqual(closed, ['term-1']);
  assert.deepEqual(confirm, { kind: 'close', id: 'term-2' }, 'busy tab asks for confirmation instead of closing immediately');
  const source = fs.readFileSync(path.join(app, 'src/source-terminal-pane.jsx'), 'utf8');
  for (const prop of ['aria-label={t("Terminal tabs")}', 'tabs={stripTabs}', 'activeId={activeId}', 'onClose={close}', 'createOnDoubleClick',
    'onRename={rename}', 'onCloseOthers={closeOthers}', 'onReorder={reorder}', 'renderTabMenuItems={renderTerminalTabMenuItems}', 'labels={stripLabels}'])
    assert.ok(source.includes(prop), prop);
  assert.match(source, /<SourceViewTabBar className="min-w-0 flex-1" /);
  assert.match(source, /return <TerminalClearItem ptyKey=\{id\} \/>;/);
  // ViewTabBar's onReorder gives the new index; the store moves by a delta.
  assert.match(source, /if \(fromIndex >= 0 && toIndex !== fromIndex\) terminals\.move\(owner, id, toIndex - fromIndex\);/);
  assert.doesNotMatch(source, /function TerminalTab|function MoreTerminals|SourcePreviewTabOverflow|useTabDragReorder|handleTerminalTabKeyDown|onBell/);

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
    // cc-rest-terminal-b: 3.6556.2 c6bf19e8f ci.startFailed "Couldn’t start the shell" (4oGvcz1sbM), an alert cover.
    assert.equal(cover.text, 'Couldn’t start the shell');
    assert.equal(cover.role, 'alert');
    assert.equal(cover.body, null);
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

// w10-trans-terminal-inline-error (L126): 3.6556.2 c6bf19e8f si / li and Ei's
// `R.getState().setInlineError(k, li(r))` into the inline-run store ca41b3815 X, read back by the code block run cards.
test('L126: TerminalLoadFailed and the plain-text error kinds; a failed shell start reaches the run typed into the tab', async () => {
  const official = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const raw = (file) => fs.readFileSync(path.join(official, file), 'utf8');
  const pane = raw('c6bf19e8f-CgQ1_Jhf.js');
  for (const text of ['si=class extends Error{constructor(){super("Failed to load terminal"),this.name="TerminalLoadFailed"}}',
    'case"needsNewerApp":return"Additional terminal tabs require a newer Claude desktop app. Restart Claude to update."',
    'case"startFailed":return"Couldn\\u2019t start the shell"', 'case"loadFailed":return"Couldn\\u2019t load the terminal"', 'case"raw":return e.text}',
    'R.getState().setInlineError(k,li(r))', 'R.getState().setInlineError(k,li(ai))', 'e instanceof Error&&!(e instanceof si)?{kind:"raw",text:e.message}:oi'])
    assert.ok(pane.includes(text), text);
  const inline = raw('ca41b3815-CD1z-rIH.js');
  for (const text of ['setInlineError:(e,t)=>{Kt(e),Ct(e,t)}', 'n.ptyKey!==e||n.settled', 'r.inlineRun.dispatched&&r.inlineRun.hasVisibleOutput',
    '{inlineRun:{...r.inlineRun,shellExited:!0}}', 'error:t,settled:!0,prev:null,endedBy:r.inlineRun.dispatched?"shell-exit":"cancel"'])
    assert.ok(inline.includes(text), text);
  assert.ok(raw('c19e90103-BQFzF8EA.js').includes('t.inlineRun?.id===e?t.inlineRun.error:null'), 'the code block card reads inlineRun.error');

  const E = await server.ssrLoadModule('/src/generated/code-current/terminal-errors.mjs');
  const generated = fs.readFileSync(path.join(app, 'src/generated/code-current/terminal-errors.mjs'), 'utf8');
  assert.match(generated, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  assert.match(generated, /si as TerminalLoadFailed,/);
  assert.match(generated, /li as terminalErrorText,/);
  const failure = new E.TerminalLoadFailed();
  assert.deepEqual([failure instanceof Error, failure.name, failure.message], [true, 'TerminalLoadFailed', 'Failed to load terminal']);
  assert.equal(E.terminalErrorText(E.needsNewerAppError), 'Additional terminal tabs require a newer Claude desktop app. Restart Claude to update.');
  assert.equal(E.terminalErrorText(E.startFailedError), 'Couldn’t start the shell');
  assert.equal(E.terminalErrorText(E.loadFailedError), 'Couldn’t load the terminal');
  assert.equal(E.terminalErrorText({ kind: 'raw', text: 'spawn zsh ENOENT' }), 'spawn zsh ENOENT');
  assert.equal(E.terminalErrorText(E.terminalStartError('Failed to spawn shell', 't1', 't1')), 'Couldn’t start the shell');

  // The view failure (Ei catch): an Error shows its message, anything else is TerminalLoadFailed → oi. An Error with an
  // empty message is raw as well (w10-ccres-e31-terminal follows Ei; term-v01 in terminal-current-source.test.mjs).
  const M = await server.ssrLoadModule('/src/terminal-pane-model.mjs');
  const viewFailure = (thrown) => {
    let recorded = null;
    M.acquireTerminalView({ activeId: 'tv', terminals: { view() { throw thrown; } }, setViewError: (next) => { recorded = next; } });
    return recorded.error;
  };
  assert.deepEqual(viewFailure(new Error('WebGL context lost')), { kind: 'raw', text: 'WebGL context lost' });
  assert.deepEqual(viewFailure(new Error('')), { kind: 'raw', text: '' });
  assert.equal(viewFailure('not an Error'), E.loadFailedError);
  assert.equal(viewFailure(new E.TerminalLoadFailed()), E.loadFailedError);
  assert.equal(M.terminalCoverState({ active: { id: 'tv', status: 'running' }, viewError: { id: 'tv', error: viewFailure(42) } }).text, 'Couldn’t load the terminal');

  // ca41b3815 Ct, as terminal-store.mjs setInlineError (one store: the run the code block card reads): only the
  // unsettled run typed into that tab; a run with output keeps it (shellExited, then "shell-exit" after the settle
  // delay), any other settles now with the text, endedBy "shell-exit" once dispatched, else "cancel".
  let ready = null;
  const emitters = [];
  const bridge = {
    onEvent(handler) { emitters.push(handler); return () => {}; },
    write() {},
    async call(op) {
      if (op === 'hello') return { backend: 'pty' };
      if (op === 'list') return [];
      if (op === 'probe') return { live: [], busy: [], unknown: [] };
      if (op === 'create') return { id: 't1', owner: 's1', sessionId: 's1', number: 1, title: null, status: 'running', generation: 1, busy: false };
      if (op === 'ready') return ready ? await ready : { at: 0 };
      throw new Error(`unexpected ${op}`);
    },
  };
  const store = S.createTerminalStore({ bridge });
  const I = await server.ssrLoadModule('/src/terminal-inline-error-store.mjs');
  const errors = I.createTerminalInlineErrorStore(store);
  let heard = 0;
  errors.subscribe(() => { heard += 1; });
  assert.equal(errors.setInlineError('t1', 'Couldn’t start the shell'), null, 'no tracked run');
  // Typed into t1 but not dispatched yet (the new shell's prompt is not up): the run is cancelled with the error.
  let release;
  ready = new Promise((resolve) => { release = resolve; });
  const pending = store.runInline({ id: 'block:s1::ls', sessionId: 's1', command: 'ls' });
  for (let i = 0; i < 20 && store.inlineRun()?.ptyKey !== 't1'; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(store.inlineRun().dispatched, false);
  assert.equal(errors.setInlineError('t2', 'Couldn’t start the shell'), null, 'a run typed into another tab');
  heard = 0;
  let after = errors.setInlineError('t1', 'Couldn’t start the shell');
  assert.deepEqual([after.settled, after.error, after.endedBy, after.prev], [true, 'Couldn’t start the shell', 'cancel', null]);
  assert.equal(store.inlineRun(), after, 'the change is the tracked run itself');
  assert.equal(errors.inlineError('block:s1::ls'), 'Couldn’t start the shell');
  assert.equal(errors.inlineError('block:s1::other'), null);
  assert.ok(heard >= 1, 'readers hear the change');
  assert.equal(errors.setInlineError('t1', 'again'), null, 'a settled run');
  release({ at: 0 });
  assert.equal(await pending, null, 'the cancelled run is never typed');
  // Dispatched, nothing printed: settles with the error, endedBy "shell-exit".
  ready = null;
  await store.runInline({ id: 'block:s1::ls', sessionId: 's1', command: 'ls' });
  assert.equal(store.inlineRun().dispatched, true);
  after = errors.setInlineError('t1', 'spawn zsh ENOENT');
  assert.deepEqual([after.settled, after.error, after.endedBy], [true, 'spawn zsh ENOENT', 'shell-exit']);
  // Dispatched with output: the output stays, shellExited, and the settle timer ends it "shell-exit" with no error.
  await store.runInline({ id: 'block:s1::ls', sessionId: 's1', command: 'ls' });
  for (const emit of emitters) emit({ kind: 'data', id: 't1', data: 'ls\r\na.txt\r\n', end: 11 });
  assert.equal(store.inlineRun().hasVisibleOutput, true);
  after = errors.setInlineError('t1', 'Couldn’t start the shell');
  assert.deepEqual([after.settled, after.shellExited, after.error, after.output], [false, true, null, 'a.txt']);
  await new Promise((resolve) => setTimeout(resolve, 900));
  assert.deepEqual([store.inlineRun().settled, store.inlineRun().endedBy, store.inlineRun().error, store.inlineRun().output], [true, 'shell-exit', null, 'a.txt']);

  // The pane's restart path (Ei order: setInlineError first, then the cover) with the generated li text, and the code
  // block card showing it (c19e90103 Bh reads inlineRun.error; source-code-block.jsx useBlockRun → .scb-output-error).
  ready = new Promise(() => {});
  void store.runInline({ id: 'block:s1::ls', sessionId: 's1', command: 'ls' });
  for (let i = 0; i < 20 && store.inlineRun()?.ptyKey !== 't1'; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  const order = [];
  let restartError = null;
  const tracking = { setInlineError: (key, text) => { order.push('inline'); return errors.setInlineError(key, text); } };
  await M.restartTerminalTab({
    active: { id: 't1', status: 'exited' }, sessionId: 's1', homeWorkspace: null,
    terminals: { restart: async () => { throw new Error('Failed to spawn shell'); } },
    setRestartError: (next) => { order.push('cover'); restartError = next; }, inlineErrors: tracking,
  });
  assert.deepEqual(order, ['inline', 'cover']);
  assert.deepEqual([store.inlineRun().settled, store.inlineRun().error, store.inlineRun().endedBy], [true, 'Couldn’t start the shell', 'cancel']);
  assert.deepEqual(restartError, { id: 't1', error: E.startFailedError });
  // The reader: the window's code block actions hand the card this store's inlineRun (main.jsx), and the card shows the
  // tracked run's error in its output box (useBlockRun `mine.error` → RunOutput .scb-output-error). Server rendering
  // reads useSyncExternalStore's server snapshot (no run), so the wiring is checked in the source.
  const blockSource = fs.readFileSync(path.join(app, 'src/source-code-block.jsx'), 'utf8');
  assert.ok(blockSource.includes('const mine = run && id !== null && run.id === id ? run : null;'));
  assert.ok(blockSource.includes('error: mine?.error ? t(mine.error) : null,'));
  assert.ok(blockSource.includes('{error ? <span className="scb-output-error">{error}</span>'));
  assert.ok(fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8').includes('inlineRun: store.inlineRun, subscribeInline: store.subscribeInline, runRecord: store.runRecord,'));
  assert.equal(I.terminalInlineErrors().setInlineError('no-such-tab', 'x'), null, 'the window handle goes to the window terminal store');
  store.dispose();
  // The pane hands the window's store to the restart path.
  const source = fs.readFileSync(path.join(app, 'src/source-terminal-pane.jsx'), 'utf8');
  assert.match(source, /import \{ terminalInlineErrors \} from "\.\/terminal-inline-error-store\.mjs";/);
  assert.match(source, /inlineErrors: terminalInlineErrors\(\),/);
  assert.equal(typeof I.terminalInlineErrors().setInlineError, 'function');
});
