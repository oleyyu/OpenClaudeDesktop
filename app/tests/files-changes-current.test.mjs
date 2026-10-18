// R2-files (FT-08 / FT-10 / FT-11): the 2.42304.0 originals in src/generated/files-changes (scripts/extract-files-changes.mjs)
// and their host wiring: generator check, controlled events for the right-click guards and Escape-repeat suppression, the
// remembered "Uncommitted changes" set, and the CDS ShimmerText "Checking for uncommitted changes…" line.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractFilesChanges } from '../scripts/extract-files-changes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const values = new Map();
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let server;
before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) } });
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => {
  await server?.close();
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else delete globalThis.localStorage;
});

test('generator: the committed modules match the 2.42304.0 sources (check mode) and name their originals', async () => {
  await extractFilesChanges({ check: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/files-changes/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  const byTarget = Object.fromEntries(manifest.modules.map((entry) => [entry.target, entry]));
  // R3-files adds the Files pane / Changes tree originals (tests/files-current-source.test.mjs covers them).
  assert.deepEqual(Object.keys(byTarget).filter((target) => ['diff-context-guard.mjs', 'diff-scope-memory.mjs', 'editable-target.mjs', 'menu-context-guard.mjs',
    'owner-window.mjs', 'shimmer-text.mjs', 'worktree-checking.mjs'].includes(target)).sort(), ['diff-context-guard.mjs', 'diff-scope-memory.mjs', 'editable-target.mjs', 'menu-context-guard.mjs',
    'owner-window.mjs', 'shimmer-text.mjs', 'worktree-checking.mjs']);
  // R3-files FT-16 adds the breadcrumb folder popover, its compact tree and their runtime (breadcrumb-current.test.mjs);
  // FT-14 / FT-18 the tree rows, the worktree start folder, the multi-selection Escape and the frontmatter view
  // (file-tree-current.test.mjs); FT-07 the Changes tree tooltip and path forms (changes-tree-current.test.mjs).
  assert.equal(Object.keys(byTarget).length, 63);
  assert.equal(byTarget['diff-scope-memory.mjs'].source, 'c03935b01-CyJKQj4N.js');
  assert.equal(byTarget['worktree-checking.mjs'].source, 'shared-19-CkPOiIKm.js');
  assert.deepEqual(byTarget['shimmer-text.mjs'].imports.find((entry) => entry.local === 'X'),
    { local: 'X', from: '../../source-files-changes-adapters.jsx', name: 'cdsClassNames', via: 'shared-frame-BfjMqbuN.js:X', kind: 'adapter' });
  const official = (name) => fs.readFileSync(path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');
  assert.match(official('ca5db7aaf-DNznjmvJ.js'), /function F\(e\)\{u\(e\.target\)\|\|e\.preventDefault\(\)\}/);
  assert.match(official('c82eca2bd-1Y6mm3wZ.js'), /function Be\(e\)\{e\.preventDefault\(\)\}/);
  assert.match(official('c03935b01-CyJKQj4N.js'), /\$e\(e=>Rn\(e,`branch`\)\)|\$e\(e=>Rn\(e,"branch"\)\)/);
});

// An element stand-in for the guards: nodeType/tagName/closest/isContentEditable as the official checks read them.
const element = (tagName, { editable } = {}) => ({ nodeType: 1, tagName, ...(editable === undefined ? {} : { isContentEditable: editable }), closest: () => null, shadowRoot: null });
const contextEvent = (target) => ({ target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

test('FT-10 diffgit-17: the menu Popup guard prevents the native menu except in a text field; the Changes guard always does', async () => {
  const { suppressNativeContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/menu-context-guard.mjs');
  const { preventContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/diff-context-guard.mjs');
  const row = contextEvent(element('DIV', { editable: false }));
  suppressNativeContextMenu(row);
  assert.equal(row.defaultPrevented, true, 'a menu row');
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    const field = contextEvent(element(tag));
    suppressNativeContextMenu(field);
    assert.equal(field.defaultPrevented, false, `${tag}: the native edit menu stays`);
  }
  const editable = contextEvent(element('DIV', { editable: true }));
  suppressNativeContextMenu(editable);
  assert.equal(editable.defaultPrevented, false, 'contenteditable');
  const changes = contextEvent(element('INPUT'));
  preventContextMenu(changes);
  assert.equal(changes.defaultPrevented, true);
});

// A hook dispatcher for one component call: the tree it returns, without React DOM.
function renderOnce(component, props) {
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':menu:', useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = hooks;
  try { return component(props); } finally { internal.H = old; }
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) { for (const node of tree) { const hit = find(node, predicate); if (hit) return hit; } return null; }
  if (tree.props && predicate(tree)) return tree;
  return find(tree.props?.children ?? tree.children, predicate);
}

// R3-menu (D25) made the guard opt-in, as the 2.42304.0 call sites pass it: no handler by default, contextMenuGuard picks
// ca5db7aaf F (true / "editable") or c82eca2bd Be ("always"), an explicit onContextMenu wins.
test('FT-10 diffgit-17: SourceMenu.Popup opts in to ca5db7aaf F (contextMenuGuard) or takes the caller\'s handler (the Changes menu: Be)', async () => {
  const { SourceMenu } = await server.ssrLoadModule('/src/source-menu.jsx');
  const { suppressNativeContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/menu-context-guard.mjs');
  const { preventContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/diff-context-guard.mjs');
  const hadDocument = 'document' in globalThis;
  if (!hadDocument) globalThis.document = { body: { nodeType: 1 }, documentElement: null };
  try {
    const popup = (props) => {
      const element = renderOnce(SourceMenu.Popup, { label: 'Menu', onClose() {}, children: null, ...props });
      return find(renderOnce(element.type, element.props), (node) => node.props.role === 'menu');
    };
    assert.equal(popup({}).props.onContextMenu, undefined);
    assert.equal(popup({ contextMenuGuard: true }).props.onContextMenu, suppressNativeContextMenu);
    assert.equal(popup({ contextMenuGuard: 'always' }).props.onContextMenu, preventContextMenu);
    assert.equal(popup({ onContextMenu: preventContextMenu }).props.onContextMenu, preventContextMenu);
  } finally { if (!hadDocument) delete globalThis.document; }
  const source = fs.readFileSync(path.join(ROOT, 'src/source-diff-comments.jsx'), 'utf8');
  assert.match(source, /dataCds="ContextMenu"\n\s+\/\/ c44d00c7f En \(c82eca2bd Be\)[^\n]*\n\s+onContextMenu=\{preventContextMenu\}/);
});

// The window stand-in: an EventTarget that receives the capture listeners keyboard-repeat (shared-19 dZ/pZ) installs.
// Node's EventTarget reads a boolean third argument as capture in addEventListener but not in removeEventListener;
// a browser window honours it in both, so the stand-in passes it on as {capture}.
class OwnerWindow extends EventTarget {
  addEventListener(type, listener, options) { super.addEventListener(type, listener, typeof options === 'boolean' ? { capture: options } : options); }
  removeEventListener(type, listener, options) { super.removeEventListener(type, listener, typeof options === 'boolean' ? { capture: options } : options); }
}
function keyEvent(type, key, repeat = false) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { key, repeat });
  return event;
}

test('FT-10 diffgit-16: Escape in a comment field cancels and swallows its auto-repeat until the key is released', async () => {
  const { commentFieldKeyDown } = await server.ssrLoadModule('/src/source-file-comments.jsx');
  const view = new OwnerWindow();
  const field = { nodeType: 1, ownerDocument: { nodeType: 9, defaultView: view } };
  const calls = [];
  const press = (key, extra = {}) => {
    const event = { key, currentTarget: field, nativeEvent: {}, keyCode: 0, repeat: false, shiftKey: false, altKey: false, metaKey: false, ctrlKey: false,
      prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
    commentFieldKeyDown(event, { save: (...args) => calls.push(['save', ...args]), cancel: () => calls.push(['cancel']) });
    return event;
  };
  const escape = press('Escape');
  assert.deepEqual(calls, [['cancel']]);
  assert.equal(escape.prevented, true);
  const held = keyEvent('keydown', 'Escape', true);
  view.dispatchEvent(held);
  assert.equal(held.defaultPrevented, true, 'the held key repeats are swallowed');
  view.dispatchEvent(keyEvent('keyup', 'Escape'));
  const after = keyEvent('keydown', 'Escape', true);
  view.dispatchEvent(after);
  assert.equal(after.defaultPrevented, false, 'released: nothing is swallowed any more');
  // Enter saves once (⌘ submits); composing and held Enter do nothing.
  press('Enter', { metaKey: true });
  press('Enter', { repeat: true });
  press('Enter', { nativeEvent: { isComposing: true } });
  assert.deepEqual(calls, [['cancel'], ['save', true, true]]);
  // Another key pressed while Escape is held stops the suppression too (dZ: any other keydown detaches).
  press('Escape');
  view.dispatchEvent(keyEvent('keydown', 'a'));
  const later = keyEvent('keydown', 'Escape', true);
  view.dispatchEvent(later);
  assert.equal(later.defaultPrevented, false);
});

test('FT-10 diffgit-16: the selection chip hides on Escape and swallows the repeat; a text field or an open menu keeps Escape', async () => {
  const { selectionChipEscape } = await server.ssrLoadModule('/src/source-diff-comments.jsx');
  const view = new OwnerWindow();
  let menuOpen = false, active = null, hidden = 0;
  const doc = { defaultView: view, get activeElement() { return active; }, querySelector: () => (menuOpen ? {} : null) };
  const listener = selectionChipEscape(doc, () => { hidden += 1; });
  const press = (key, extra = {}) => {
    const event = { key, isComposing: false, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
    listener(event);
    return event;
  };
  const first = press('Escape');
  assert.deepEqual([hidden, first.prevented, first.stopped], [1, true, true]);
  const held = keyEvent('keydown', 'Escape', true);
  view.dispatchEvent(held);
  assert.equal(held.defaultPrevented, true);
  view.dispatchEvent(keyEvent('keyup', 'Escape'));
  press('Escape', { isComposing: true });
  menuOpen = true; press('Escape'); menuOpen = false;
  active = { closest: () => ({}) }; press('Escape'); active = null;
  press('Enter');
  assert.equal(hidden, 1);
});

test('FT-08: c03935b01 Rn keeps at most 50 sessions (least recent out), "branch" forgets, an unknown "branch" writes nothing', async () => {
  const memory = await server.ssrLoadModule('/src/generated/files-changes/diff-scope-memory.mjs');
  const { persistedValues } = await server.ssrLoadModule('/src/source-files-changes-adapters.jsx');
  const KEY = `persisted.${memory.uncommittedSessionsKey}`;
  assert.equal(KEY, 'persisted.epitaxy-diff-uncommitted-sessions');
  values.delete(KEY);
  for (let index = 0; index < 51; index++) memory.rememberDiffScope(`s${index}`, 'uncommitted');
  let ids = Object.keys(JSON.parse(values.get(KEY)));
  assert.equal(ids.length, 50);
  assert.equal(ids.includes('s0'), false, 'the 51st pick drops the least recent session');
  assert.equal(ids.at(-1), 's50');
  memory.rememberDiffScope('s1', 'uncommitted');
  ids = Object.keys(JSON.parse(values.get(KEY)));
  assert.equal(ids.at(-1), 's1', 'picking again makes it the most recent');
  memory.rememberDiffScope('s2', 'branch');
  assert.equal(Object.keys(JSON.parse(values.get(KEY))).includes('s2'), false);
  const before = values.get(KEY);
  let writes = 0;
  const stop = persistedValues.subscribe(memory.uncommittedSessionsKey, () => { writes += 1; });
  memory.rememberDiffScope('never-picked', 'branch');
  stop();
  assert.equal(writes, 0);
  assert.equal(values.get(KEY), before);
  assert.deepEqual(memory.uncommittedSessionIds(null), []);
  assert.equal(memory.sameDiffScope({ kind: 'commit', sha: 'a' }, { kind: 'commit', sha: 'a' }), true);
});

test('FT-11 diffgit-10: "Checking for uncommitted changes…" is shared-19 jY over the CDS ShimmerText', async () => {
  const dialog = await server.ssrLoadModule('/src/source-worktree-dispose-dialog.jsx');
  const generated = await server.ssrLoadModule('/src/generated/files-changes/worktree-checking.mjs');
  assert.equal(dialog.WorktreeChecking, generated.WorktreeChecking);
  const reserve = renderToStaticMarkup(React.createElement(dialog.WorktreeChecking, { hold: 'reserve' }));
  assert.equal(reserve, '<p class="text-footnote text-muted-as-secondary mt-md invisible"><span data-cds="ShimmerText" data-shimmering="false">Checking for uncommitted changes…</span></p>');
  const reveal = renderToStaticMarkup(React.createElement(dialog.WorktreeChecking, { hold: 'reveal' }));
  assert.match(reveal, /^<p class="text-footnote text-muted-as-secondary mt-md animate-placeholder-reveal" aria-busy="true"><span data-cds="ShimmerText" data-shimmering="true" class="[^"]*bg-clip-text[^"]*">Checking for uncommitted changes…<\/span><\/p>$/);
  assert.match(reveal, /\[background-image:linear-gradient\(120deg,var\(--cds-text-muted\)_37\.5%/, 'variant muted');
  assert.match(reveal, /animate-\[cds-shimmer-text-shine_3s_linear_infinite\]/);
  const after = renderToStaticMarkup(React.createElement(dialog.WorktreeChecking, { hold: 'reveal', afterHeader: true }));
  assert.doesNotMatch(after, /mt-md/, 'afterHeader (the nested-sessions confirm) drops the top margin');
  // The classes come from the official stylesheet (utilities layer) and no local rule overrides them.
  const css = fs.readFileSync(path.join(ROOT, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  for (const name of ['.text-muted-as-secondary{', '.bg-clip-text{', '@keyframes cds-shimmer-text-shine', '[data-cds-shimmer-clone]'])
    assert.ok(css.includes(name), name);
  const local = fs.readdirSync(path.join(ROOT, 'src')).filter((name) => name.endsWith('.css')).map((name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8')).join('\n');
  assert.doesNotMatch(local, /\.text-muted-as-secondary\b|\.text-footnote\s*[,{]|\[data-cds=["']?ShimmerText/);
});
