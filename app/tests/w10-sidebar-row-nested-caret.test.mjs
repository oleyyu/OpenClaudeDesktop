import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

// w10-shell-sidebar-row (research/w10-shell.md notdone 79): a family head in a foldable Code bucket carries the
// 3.6556.2 nested caret as its nameSuffix and is labelled through nameId (shared-21 Xee Oe -> Zee -> f0 -> h1/g1/l1).
const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const generated = path.join(app, 'src/generated/code-current');
const h = React.createElement;
let server, SourceSidebar, Caret, Adapters, Cds;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
  Caret = await server.ssrLoadModule('/src/generated/code-current/sidebar-nested-caret.mjs');
  Adapters = await server.ssrLoadModule('/src/source-sidebar-nested-caret-adapters.mjs');
  Cds = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const family = [thread('parent'), thread('child-a', { forkedFromId: 'parent' }), thread('child-b', { forkedFromId: 'parent' })];
const sidebar = (props = {}) => renderToStaticMarkup(h(SourceSidebar, { sessions: family, knownFolders: ['/fixture/work'], ...props,
  sidebarPreferences: { groupBy: 'none', ...props.sidebarPreferences } }));
const rowHost = (html, id) => {
  const start = html.indexOf(`data-source-session-id="${id}"`);
  assert.ok(start >= 0, `row ${id} is rendered`);
  const next = html.indexOf('data-source-session-id="', start + 1);
  return html.slice(start, next < 0 ? undefined : next);
};

test('the slice is the 3.6556.2 shared-21 g1 / l1 pair with its original features', () => {
  const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
  const entry = manifest.modules.find(m => m.target === 'sidebar-nested-caret.mjs');
  assert.equal(entry?.referenceVersion, '3.6556.2');
  assert.equal(path.basename(entry.source), 'shared-21-R7LldJ05.js');
  assert.deepEqual(entry.bindings, ['i1', 'a1', 'c1', 'l1', 'u1', 'd1', 'f1', 'g1']);
  const raw = readFileSync(path.join(v3, 'shared-21-R7LldJ05.js'), 'utf8');
  const g1 = raw.slice(raw.indexOf('function g1('), raw.indexOf('}function', raw.indexOf('function g1(')));
  for (const feature of ['yv(t,"row_caret")', 'Sb("CaretRightFilled")', 'mode:"button"', 'labelledBy:g', 'r?0:90', '{size:"xs"}', 'lazy:!0'])
    assert.ok(g1.includes(feature), `official g1 has ${feature}`);
  // f0 builds the suffix only from nestedCaretId and passes it as nameId.
  assert.ok(raw.includes('a===void 0?void 0:u(h1,{headId:t.id,title:c.title})'));
  assert.ok(raw.includes('nameSuffix:U,nameId:a'));
  const text = readFileSync(path.join(generated, 'sidebar-nested-caret.mjs'), 'utf8');
  assert.match(text, /yv\(t, "row_caret"\)/);
  assert.match(text, /toggleNestedFamily as yv/);
  assert.match(text, /guardNestedCaretMultiClick as Qg/);
  assert.match(text, /nestedToggleLabel as _v/);
  assert.match(text, /export \{ g1 as SidebarNestedCaret, l1 as SidebarContainerToggle \}/);
});

test('an expanded family head shows the caret button and is labelled by its nameId', () => {
  const html = sidebar();
  const head = rowHost(html, 'parent');
  const caret = head.match(/<span role="button" data-container-icon="" aria-expanded="true" id="([^"]+)" aria-label="Hide nested sessions" aria-labelledby="([^"]+)" data-row-action="" tabindex="-1" class="([^"]+)">/);
  assert.ok(caret, 'l1 mode "button"');
  const [, id, labelledBy, className] = caret;
  assert.equal(labelledBy, `${id} ${id}-title`);
  assert.match(className, /^hide-focus-ring focus-visible:outline-hidden /);
  assert.match(className, /-m-0\.5 flex shrink-0 cursor-interactive items-center justify-center rounded p-0\.5 hover:bg-fill-ghost-hover hover:text-primary text-muted-as-secondary$/);
  assert.ok(head.includes(`<span id="${id}-title" hidden="">Session parent</span>`), 'the hidden title the caret is labelled with');
  // g1 w: the ms-0.5 wrapper (fizzy off, E12) is the lazy CdsTooltip trigger.
  assert.match(head, /<span class="flex ms-0\.5" id="[^"]+" data-base-ui-tooltip-trigger=""><span id="[^"]+-title" hidden="">/, 'fizzy off: ms-0.5 wrapper (E12)');
  // The row button names itself through nameId (Ak je), which is the id of the name span.
  const nameId = head.match(/<span id="([^"]+)" class="min-w-0">/)?.[1];
  assert.ok(nameId, 'name span carries nameId');
  assert.ok(nameId.endsWith('parent'), 'nameId = caret prefix + head id');
  assert.match(head, new RegExp(`data-row-main-button=""[^>]*aria-labelledby="${nameId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  // f0 hands Ak a null tail and decoration with the caret (l), so the suffix sits beside the controls without df-name-suffix.
  assert.match(head, /<\/span><span class="flex shrink-0 items-center ps-1"><span class="flex ms-0\.5"/);
  // CaretRight, size xs, rotated 90 while the family is shown.
  const icon = renderToStaticMarkup(h(Cds.CdsIcon, { size: 'xs', name: 'CaretRight', rotate: 90, className: 'transition-transform duration-fast motion-reduce:transition-none', 'aria-hidden': true }));
  assert.ok(head.includes(icon), 'the caret glyph is the CDS CaretRight');
  for (const child of ['child-a', 'child-b']) assert.doesNotMatch(rowHost(html, child), /data-container-icon/, 'nested rows have no caret');
});

test('a folded family head offers Show nested sessions with the caret at rest', () => {
  const html = sidebar({ sidebarPreferences: { collapsedNested: ['parent'] } });
  const head = rowHost(html, 'parent');
  assert.match(head, /role="button" data-container-icon="" aria-expanded="false" id="[^"]+" aria-label="Show nested sessions"/);
  const icon = renderToStaticMarkup(h(Cds.CdsIcon, { size: 'xs', name: 'CaretRight', rotate: 0, className: 'transition-transform duration-fast motion-reduce:transition-none', 'aria-hidden': true }));
  assert.ok(head.includes(icon));
});

test('rows that are not bucket heads draw no caret or nameId', () => {
  const pinned = rowHost(sidebar({ sessionMetadata: { parent: { pinned: true } } }), 'parent');
  assert.doesNotMatch(pinned, /data-container-icon/, 'the Pinned list is outside wC (no caret prefix)');
  const single = renderToStaticMarkup(h(SourceSidebar, { sessions: [thread('alone')], knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.doesNotMatch(rowHost(single, 'alone'), /data-container-icon|<span id="[^"]+" class="min-w-0">/);
});

function fixture(component, props = {}) {
  const cells = [], effects = []; let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, next => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useContext(context) { return context._currentValue; },
    use(context) { return context._currentValue; },
    useId() { return hooks.useMemo(() => `fixture-${cursor}`, []); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const old = cells[i]; cells[i] = { deps }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  }; hooks.useLayoutEffect = hooks.useEffect;
  const render = () => { cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H; internal.H = withMemoCache(hooks); try { return tree = component(props); } finally { internal.H = old; } };
  render(); return { get tree() { return tree; }, render, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach(c => c?.cleanup?.()); } };
}
const find = (tree, predicate) => { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(t => find(t, predicate)); return [...(predicate(tree) ? [tree] : []), ...find(tree.props?.children, predicate)]; };

test('g1 click toggles that family through the host (nS "row_caret") and opens the 500ms multi-click guard (TS)', () => {
  const calls = [];
  const host = fixture(() => Adapters.useNestedCaretHost('parent', via => calls.push(['toggle', via]), ms => calls.push(['guard', ms])));
  host.flush();
  const caret = fixture(Caret.SidebarNestedCaret, { headId: 'parent', title: 'Session parent', hidden: false });
  const toggle = find(caret.tree, n => n.type === Caret.SidebarContainerToggle)[0];
  assert.ok(toggle, 'g1 renders l1');
  assert.equal(toggle.props.toggle.mode, 'button'); assert.equal(toggle.props.expanded, true); assert.equal(toggle.props.muted, true);
  assert.equal(toggle.props.toggle.label, 'Hide nested sessions');
  const event = (type, detail) => ({ type, nativeEvent: { detail }, stops: 0, prevents: 0, stopPropagation() { this.stops++; }, preventDefault() { this.prevents++; } });
  const click = event('click', 1); toggle.props.toggle.onToggle(click);
  assert.deepEqual(calls, [['toggle', 'row_caret'], ['guard', 500]]);
  assert.deepEqual([click.stops, click.prevents], [1, 1]);
  // Keyboard activation (detail 0) toggles without the multi-click guard.
  toggle.props.toggle.onToggle(event('click', 0));
  assert.deepEqual(calls.slice(2), [['toggle', 'row_caret']]);
  host.close(); caret.close();
  // Unregistered: nothing is toggled.
  toggle.props.toggle.onToggle(event('click', 1));
  assert.equal(calls.length, 3);
});

test('l1 keeps the caret out of row activation, drag and middle-click', () => {
  const toggled = [];
  const f = fixture(Caret.SidebarContainerToggle, { toggle: { mode: 'button', id: 'c', label: 'Hide nested sessions', labelledBy: 'c c-title', onToggle: e => toggled.push(e.key ?? 'click') }, expanded: true, muted: true, children: 'x' });
  const span = f.tree;
  assert.equal(span.props.role, 'button'); assert.equal(span.props.tabIndex, -1); assert.equal(span.props['data-row-action'], '');
  let stopped = 0; const stop = { stopPropagation() { stopped++; }, preventDefault() {} };
  span.props.onPointerDown(stop); span.props.onDoubleClick(stop); span.props.onAuxClick({ ...stop, button: 1 });
  assert.equal(stopped, 3);
  span.props.onKeyDown({ key: 'Enter' }); span.props.onKeyDown({ key: ' ' }); span.props.onKeyDown({ key: 'a' });
  assert.deepEqual(toggled, ['Enter', ' ']);
  f.close();
});

test('the sidebar row block passes a head only for presets-gated, unpinned bucket heads', () => {
  const source = readFileSync(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  assert.match(source, /nestedHead=\{environmentsOn && !nested && !pinned && childCount > 0 \? \{ id: session\.id, hidden: collapsedNested\.has\(session\.id\),\s+onToggle: \(\) => toggleNested\(session\.id\), guard: guardMultiClick \} : undefined\}/);
  const row = readFileSync(path.join(app, 'src/source-code-sidebar-row.jsx'), 'utf8');
  assert.match(row, /nameSuffix=\{nameSuffix\} nameId=\{nestedCaretId\}/);
});
