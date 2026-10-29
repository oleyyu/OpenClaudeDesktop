// R3-topbar TT-03, migrated to 3.6556.2 (W2 w2-titlebar-current): the titlebar folds its pane toggles one by one into
// ⋮ View options.
//   cd54a5401 nn (generated titlebar-fold-measure.mjs useTitlebarFold) measures the row and returns hiddenCount;
//   c73f45bc3 p_ (titlebar-toggle-fold.mjs foldTitlebarToggles) folds inactive toggles first, both lists in order;
//   c73f45bc3 x_ is the toggle order (titlebar-controls-model.mjs titlebarToggleSpecs) and View options lists `.folded`;
//   cc43287c9 hands keyboard focus on when a focused toggle folds (titlebar-fold-focus.mjs).
// Also pins the generated targets (manifest, official source bytes and feature strings).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { titlebarToggleSpecs, titlebarFoldedToggles, foldedTogglesActive } from '../src/titlebar-controls-model.mjs';
import { foldTitlebarToggles } from '../src/generated/code-current/titlebar-toggle-fold.mjs';
import { createFoldFocusHandoff } from '../src/titlebar-fold-focus.mjs';
import { focusOrphaned } from '../src/generated/code-current/titlebar-focus-orphaned.mjs';
import { focusLost } from '../src/generated/code-current/titlebar-focus-lost.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (name) => fs.readFileSync(path.join(reference, name), 'utf8');
const current = (name) => fs.readFileSync(path.join(v3, name), 'utf8');
const flat = (text) => text.replace(/\s+/g, '');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

// session-chord-model reaches view-tabs (through the 3.6556.2 session-cycle-chords), so it loads through Vite.
let server, Fold, titlebarViewOptionsItems;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Fold = await server.ssrLoadModule('/src/generated/code-current/titlebar-fold-measure.mjs');
  ({ titlebarViewOptionsItems } = await server.ssrLoadModule('/src/session-chord-model.mjs'));
});
after(() => server?.close());

const panes = (...open) => new Set(open);
const order = (specs) => specs.map((spec) => spec.pane);

test('x_ order: a session lists Terminal, Changes, Preview, Files; the landing Terminal, Preview, Files', () => {
  const all = { surface: 'code', terminalAvailable: true, previewAvailable: true, filesAvailable: true };
  assert.deepEqual(order(titlebarToggleSpecs({ ...all, session: true })), ['terminal', 'changes', 'preview', 'files']);
  assert.deepEqual(order(titlebarToggleSpecs({ ...all, session: false })), ['terminal', 'preview', 'files']);
  // A session always lists Files; the landing only where main.jsx can open it; Terminal and Preview when available.
  assert.deepEqual(order(titlebarToggleSpecs({ surface: 'code', session: true })), ['changes', 'files']);
  assert.deepEqual(order(titlebarToggleSpecs({ surface: 'code', session: false, previewAvailable: true })), ['preview']);
  // Other surfaces: only the Browser toggle (the Cowork session view's yE counterpart: Globe, "Browser"; the local ⇧⌘P).
  assert.deepEqual(titlebarToggleSpecs({ ...all, surface: 'cowork', session: true }),
    [{ pane: 'preview', icon: 'Globe', label: 'Browser', shortcut: 'cmd+shift+p', active: false }]);
  const specs = titlebarToggleSpecs({ ...all, session: true, panes: panes('changes', 'files') });
  assert.deepEqual(specs.map(({ pane, icon, label, shortcut, active }) => [pane, icon, label, shortcut, active]), [
    ['terminal', 'CommandLinePrompt', 'Terminal', 'cmd+j', false],
    ['changes', 'ChangesPlusMinus', 'Changes', 'cmd+shift+d', true],
    ['preview', 'Play', 'Preview', 'cmd+shift+p', false],
    ['files', 'Folder', 'Files', 'cmd+shift+f', true],
  ]);
  // 3.6556.2 c73f45bc3 x_: the landing returns [...terminal, ...preview, ...files]; a session [...terminal, diff,
  // ...preview, ...ios, ...android, ...files] (the simulator rows stay off on the host, D31).
  const x = current('c73f45bc3-B7hbL7H9.js');
  assert.ok(x.includes('le=J3($,83,o,n,a)?K3($,83,o,n,a,[...a,...n,...o]):$[86]'), 'landing order');
  assert.ok(x.includes('[...a,d,...n,...h,..._,...o]'), 'session order');
  assert.ok(x.includes('pane:"diff",icon:Is.diff,label:c,shortcut:l,active:p,toggle:u'));
});

// R4g-small SM1 topbar-04 (D36), 3.6556.2: with `frontend_preview_external_domains` off (no GrowthBook on the host)
// x_'s preview row is Is.preview "Play", "Preview" (TF-C4: the message id is now GD2Vvn5YZe, same English) and the
// ungated togglePreview ⇧⌘P; a folded row keeps the same icon.
test('topbar-04: the Code preview toggle is the gate-off x_ row (Play, Preview, ⇧⌘P)', () => {
  const count = (text, needle) => text.split(needle).length - 1;
  const x = current('c73f45bc3-B7hbL7H9.js');
  assert.equal(count(x, 'icon:e==="preview"&&T?"Globe":Is[e]'), 1);
  assert.equal(count(x, 'T?r.formatMessage({defaultMessage:"Browser",id:"E3oB+tM0Ou"}):r.formatMessage({defaultMessage:"Preview",id:"GD2Vvn5YZe"})'), 1);
  assert.equal(count(x, '"TJo5E6JuIN"'), 0, 'the 2.42304.0 Preview id is gone');
  assert.equal(count(x, 'Ye("togglePreview",w,{externalPreviewAvailable:T})'), 1);
  assert.equal(count(x, 'T=ct(o?.type)'), 1);
  assert.equal(count(x, 'My as ct,'), 1);
  assert.match(x, /import\{[^}]*(?<![\w$])a as Is[,}][^;]*?from"\.\/c26fb8b6b-B7Friu61\.js"/);
  const gate = current('shared-78-D5Fw2h0a.js');
  assert.equal(count(gate, 'var qT="frontend_preview_external_domains";function JT(){let e=O(qT)'), 1);
  assert.equal(count(gate, 'function tE(e){let t=JT(),n=QT(),r=eE()===null;return e==="remote"?n&&r:t}'), 1);
  assert.equal(count(gate, 'tE as My'), 1);
  assert.equal(count(current('c26fb8b6b-B7Friu61.js'), 'var wn={preview:"Play",'), 1);
  assert.equal(count(current('shared-46-BIbZBGFq.js'), '{command:"togglePreview",key:"cmd+shift+b",code:"KeyB",when:"isClaudeApp",gate:"externalPreviewAvailable"},{command:"togglePreview",key:"cmd+shift+p",code:"KeyP",when:"isClaudeApp"}'), 1);
  const input = { surface: 'code', session: true, terminalAvailable: true, previewAvailable: true };
  const row = (specs) => specs.find((spec) => spec.pane === 'preview');
  for (const session of [true, false]) {
    const { icon, label, shortcut } = row(titlebarToggleSpecs({ ...input, session }));
    assert.deepEqual([icon, label, shortcut], ['Play', 'Preview', 'cmd+shift+p']);
  }
  assert.deepEqual(row(titlebarFoldedToggles(input, 4)), row(titlebarToggleSpecs(input)));
  // Other surfaces are not x_: the 2.42304.0 Cowork session view's yE is Globe + "Browser" (not migrated in W2).
  const ye = official('c21f11e6d-Bd0v2A97.js');
  assert.equal(count(ye, 'v(As,{content:r.formatMessage({defaultMessage:"Browser",id:"E3oB+tM0Ou"}),shortcut:"cmd+shift+b"'), 1);
  assert.deepEqual([row(titlebarToggleSpecs({ ...input, surface: 'cowork' })).icon, row(titlebarToggleSpecs({ ...input, surface: 'chat' })).label], ['Globe', 'Browser']);
});

test('p_ folds inactive toggles first, one per hidden count, and both lists keep the toggle order', () => {
  const input = { surface: 'code', session: true, terminalAvailable: true, previewAvailable: true, panes: panes('terminal') };
  const specs = titlebarToggleSpecs(input);
  const step = (hidden) => { const { inline, folded } = foldTitlebarToggles(specs, hidden); return [order(inline), order(folded)]; };
  assert.deepEqual(step(0), [['terminal', 'changes', 'preview', 'files'], []]);
  assert.deepEqual(step(1), [['terminal', 'preview', 'files'], ['changes']]);
  assert.deepEqual(step(2), [['terminal', 'files'], ['changes', 'preview']]);
  assert.deepEqual(step(3), [['terminal'], ['changes', 'preview', 'files']]);
  // The open Terminal folds last.
  assert.deepEqual(step(4), [[], ['terminal', 'changes', 'preview', 'files']]);
  assert.deepEqual(step(6), step(4));
  // main.jsx's View options rows are exactly the folded specs.
  assert.deepEqual(order(titlebarFoldedToggles(input, 2)), ['changes', 'preview']);
  assert.deepEqual(titlebarFoldedToggles(input, 0), []);
  // The local activity dot moves to ⋮ only for a folded, closed Preview or Terminal with something running.
  assert.equal(foldedTogglesActive(titlebarFoldedToggles(input, 2), { previewRunning: true }), true);
  assert.equal(foldedTogglesActive(titlebarFoldedToggles(input, 1), { previewRunning: true }), false);
  assert.equal(foldedTogglesActive(titlebarFoldedToggles(input, 4), { terminalBusy: true }), false, 'an open terminal shows its own output');
  assert.equal(foldedTogglesActive(titlebarFoldedToggles({ ...input, panes: panes() }, 1), { terminalBusy: true }), true);
  assert.ok(current('c73f45bc3-B7hbL7H9.js').includes('return{folded:e.filter(e=>i.has(e)),inline:e.filter(e=>!i.has(e))}'));
});

// A controlled layout for the official measure: .st-inner (row, 12px end padding) holding the lead (origin 32 + title
// + caret slot + folder chip, 70px or 24px compact) and the trailing (ps 24, toggles 24px with gap-1, ⋮ 24px).
function titlebarLayout({ width, titleNatural }) {
  const state = { width, titleNatural, inline: 4, compact: false };
  const box = () => {
    const trailing = 24 + state.inline * 24 + Math.max(0, state.inline - 1) * 4 + (state.inline ? 4 : 0) + 24;
    const available = state.width - 12 - trailing;
    const natural = 32 + state.titleNatural + 4 + 24 + 4 + (state.compact ? 24 : 70);
    const titleClient = Math.max(32, state.titleNatural - Math.max(0, natural - available));
    return { trailing, lead: natural - (state.titleNatural - titleClient), titleClient };
  };
  const observers = [];
  class ResizeObserver { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} unobserve() {} disconnect() {} }
  const frames = [];
  const view = { getComputedStyle: (node) => node.style, ResizeObserver,
    requestAnimationFrame: (callback) => frames.push(callback), cancelAnimationFrame() {} };
  const doc = { nodeType: 9, defaultView: view };
  // Keep the getters live (a spread would read them once).
  const node = (props) => Object.defineProperties({ nodeType: 1, ownerDocument: doc, style: { position: 'static', display: 'flex' }, contains: () => false, hasAttribute: () => false },
    Object.getOwnPropertyDescriptors(props));
  const title = node({ get clientWidth() { return box().titleClient; }, get scrollWidth() { return state.titleNatural; },
    getBoundingClientRect: () => ({ left: 32, right: 32 + box().titleClient, width: box().titleClient }) });
  const lead = node({ contains: (other) => other === title, getBoundingClientRect: () => ({ left: 0, right: box().lead, width: box().lead }) });
  const trailing = node({ getBoundingClientRect: () => ({ left: state.width - 12 - box().trailing, right: state.width - 12, width: box().trailing }) });
  const group = node({ style: { columnGap: '4px' }, get firstElementChild() { return state.inline ? button : null; } });
  const button = node({ offsetWidth: 24, parentElement: group });
  const root = node({ get clientWidth() { return state.width; }, clientLeft: 0, children: [lead, trailing], querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, right: state.width, width: state.width }),
    style: { position: 'static', display: 'flex', direction: 'ltr', paddingInlineEnd: '12px' } });
  return { state, title, root, group, observers, frames };
}

// Hook dispatcher (as tests/sessions-page-current.test.mjs, D21): render, attach the title ref, run the effects, and
// re-render while state changes, as React's commit loop would.
function hookHost(component, props) {
  let cursor = 0, dirty = false, out;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [cells[i].value, (value) => { const next = typeof value === 'function' ? value(cells[i].value) : value; if (!Object.is(next, cells[i].value)) { cells[i].value = next; dirty = true; } }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !deps || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const render = () => { cursor = 0; const old = internal.H; internal.H = withMemoCache(hooks); try { out = component(props); } finally { internal.H = old; } props.commit?.(out); };
  const settle = () => {
    for (let round = 0; round < 100; round++) {
      while (effects.length) effects.shift()();
      if (!dirty) return;
      dirty = false; render();
    }
    throw Error('did not settle');
  };
  render();
  return { get out() { return out; }, settle, render };
}

test('nn over the local row folds one toggle at a time as the window narrows, compacting the folder chip first', () => {
  const specs = titlebarToggleSpecs({ surface: 'code', session: true, terminalAvailable: true, previewAvailable: true });
  const layout = titlebarLayout({ width: 1000, titleNatural: 300 });
  const rootRef = { current: layout.root }, togglesRef = { current: layout.group };
  let attached = false;
  const Harness = () => {
    const fold = Fold.useTitlebarFold({ rootRef, togglesRef, title: 'Long title', interactive: true, clusterMounted: true,
      tileLayout: '', sessionId: 'a', maxHidden: Fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: 0 }).maxHidden });
    return { ...fold, ...foldTitlebarToggles(specs, Fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: fold.hiddenCount }).hiddenMainPanes) };
  };
  const host = hookHost(Harness, { commit(out) {
    layout.state.inline = out.inline.length; layout.state.compact = out.pillsCompact;
    if (!attached) { attached = true; out.titleRef(layout.title); }
  } });
  host.settle();
  const resize = (width) => { layout.state.width = width; for (const observer of layout.observers) observer.callback(); host.settle(); };
  const now = () => ({ hidden: host.out.hiddenCount, compact: host.out.pillsCompact, inline: order(host.out.inline), folded: order(host.out.folded) });
  assert.deepEqual(now(), { hidden: 0, compact: false, inline: ['terminal', 'changes', 'preview', 'files'], folded: [] });
  // Narrower: the title truncates with no free room, so the pills compact before any toggle folds.
  resize(500);
  assert.deepEqual(now(), { hidden: 0, compact: true, inline: ['terminal', 'changes', 'preview', 'files'], folded: [] });
  // Narrower still: the title would drop under 100px, so toggles fold, by whole toggle steps (24px + gap 4px).
  resize(330);
  assert.deepEqual(now(), { hidden: 2, compact: true, inline: ['preview', 'files'], folded: ['terminal', 'changes'] });
  resize(300);
  assert.deepEqual(now(), { hidden: 3, compact: true, inline: ['files'], folded: ['terminal', 'changes', 'preview'] });
  // Wider again: they come back once there is a toggle's step plus 24px to spare.
  resize(1000);
  assert.equal(now().hidden, 0);
  assert.deepEqual(now().folded, []);
});

test('uW hand-off: a keyboard-focused toggle that folds passes focus to the toggle in its place', () => {
  const doc = { nodeType: 9, body: { isConnected: true }, activeElement: null };
  doc.activeElement = doc.body;
  const button = (name) => ({ name, ownerDocument: doc, isConnected: true, visible: true,
    matches(selector) { return selector === ':focus-visible' && this.visible; }, focus(options) { this.options = options; doc.activeElement = this; } });
  const tasks = [];
  const handoff = createFoldFocusHandoff({ schedule: (task) => tasks.push(task) });
  const nodes = { terminal: button('terminal'), changes: button('changes'), preview: button('preview') };
  for (const [pane, node] of Object.entries(nodes)) handoff.ref(pane)(node);
  assert.equal(handoff.ref('terminal'), handoff.ref('terminal'), 'one stable ref callback per pane');
  handoff.commit(['terminal', 'changes', 'preview']);
  // Terminal (keyboard-focused) folds: React detaches its ref, focus falls to the body, the layout effect commits.
  nodes.terminal.focus();
  handoff.ref('terminal')(null);
  doc.activeElement = doc.body;
  handoff.commit(['changes', 'preview']);
  assert.equal(tasks.length, 1);
  tasks.shift()();
  assert.equal(doc.activeElement, nodes.changes, 'the toggle now at its index');
  assert.deepEqual(nodes.changes.options, { preventScroll: true });
  // The last toggle folds: the new last one takes focus.
  nodes.preview.focus(); handoff.ref('preview')(null); doc.activeElement = doc.body;
  handoff.commit(['changes']);
  tasks.shift()();
  assert.equal(doc.activeElement, nodes.changes);
  // Focus that went somewhere else on purpose stays there.
  const elsewhere = { isConnected: true };
  nodes.changes.focus(); handoff.ref('changes')(null); doc.activeElement = elsewhere;
  handoff.commit([]);
  tasks.shift()();
  assert.equal(doc.activeElement, elsewhere);
  // A pointer-focused toggle (not :focus-visible) records nothing; a pane that comes back drops the hand-off.
  handoff.ref('files')(Object.assign(button('files'), { visible: false }));
  doc.activeElement = null; handoff.ref('files')(null); handoff.commit([]);
  assert.equal(tasks.length, 0);
  const again = button('terminal'); handoff.ref('terminal')(again); again.focus(); handoff.ref('terminal')(null);
  handoff.ref('terminal')(again); handoff.commit(['terminal']);
  assert.equal(tasks.length, 0);
  // vI: focus on the body, on nothing, or on a node that left the document.
  assert.equal(focusLost({ nodeType: 9, body: 1, activeElement: 1 }), true);
  assert.equal(focusLost({ nodeType: 9, body: 1, activeElement: null }), true);
  assert.equal(focusOrphaned({ nodeType: 9, body: 1, activeElement: { isConnected: false } }), true);
  assert.equal(focusOrphaned({ nodeType: 9, body: 1, activeElement: { isConnected: true } }), false);
  const uw = current('cc43287c9-Me-M2ucD.js');
  assert.ok(uw.includes('t.ownerDocument.activeElement===t&&t.matches(":focus-visible")&&(C.current={pane:e,doc:t.ownerDocument'));
  assert.ok(current('c4db265df-fNhlkQCj.js').includes('function tt(e){return Je(e)||e.activeElement?.isConnected===!1}'));
});

test('View options lists the folded toggles from the titlebar\x27s count, before Background tasks and Plan', () => {
  const toggled = [];
  const items = titlebarViewOptionsItems({
    surface: 'code',
    session: true,
    terminalAvailable: true,
    previewAvailable: true,
    filesAvailable: true,
    panes: new Set(['changes', 'plan']),
    hiddenCount: 2,
    hasTasks: true,
    hasPlan: false,
    onToggleTerminal: () => toggled.push('terminal-fn'),
    onTogglePane: (kind) => toggled.push(`pane:${kind}`),
  });
  // With Changes open and hiddenCount=2, jh folds the first two inactive toggles (Terminal, Preview) in Rh order,
  // then Vh appends Background tasks (hasTasks) and Plan (open in panes).
  assert.deepEqual(
    items.map((item) => ({ kind: item.kind, label: item.label, checked: item.checked, shortcut: item.shortcut })),
    [
      { kind: 'terminal', label: 'Terminal', checked: false, shortcut: 'cmd+j' },
      { kind: 'preview', label: 'Preview', checked: false, shortcut: 'cmd+shift+p' },
      { kind: 'tasks', label: 'Background tasks', checked: false, shortcut: undefined },
      { kind: 'plan', label: 'Plan', checked: true, shortcut: undefined },
    ],
  );
  items[0].onSelect();
  items[1].onSelect();
  items[2].onSelect();
  assert.deepEqual(toggled, ['terminal-fn', 'pane:preview', 'pane:tasks']);

  // When hiddenCount is 0 (non-Code surfaces report 0 folded toggles), only tasks/plan are listed when present.
  const unfoldedItems = titlebarViewOptionsItems({
    surface: 'code',
    session: true,
    terminalAvailable: true,
    previewAvailable: true,
    filesAvailable: true,
    panes: new Set(),
    hiddenCount: 0,
    hasTasks: false,
    hasPlan: true,
  });
  assert.deepEqual(unfoldedItems.map((item) => item.kind), ['plan']);
});

// Generated titlebar targets: every W2 w2-titlebar-current entry reads 3.6556.2, pins the official chunk's bytes, and
// carries its features. button-press / tooltip-structure belong to w2-cds-followup: pinned here only while they still
// read 2.42304.0.
const cdsTargets = {
  'button-press.mjs': ['shared-frame-BfjMqbuN.js', ['ps', 'ms', 'hs', 'Ll', 'Rl', 'zl', 'Bl'], ['ps=.8', 'function Bl(e){return Math.min(zl,Math.max(Rl,e*Ll))}']],
  'tooltip-structure.mjs': ['shared-frame-BfjMqbuN.js', ['Gc', 'Kc', 'qc'], ['var Gc=new WeakMap,Kc=0;function qc(e){', 'if(!ze(e))return typeof e']],
};
const targets = {
  'titlebar-lead-classes.mjs': ['shared-6-sd9jbJqs.js', ['og', 'sg', 'cg', 'Kh', 'ig', 'lg', 'ug', 'dg'], ['ig="truncate text-body font-medium font-control text-primary select-none"', 'lg="aspect-square w-control shrink-0"', 'og as lp', 'Kh as Df']],
  'titlebar-panels-scope.mjs': ['shared-15-BvlV43cI.js', ['_n', 'vn'], ['function vn(){return u(_n)===!0}', '_n=m(void 0)']],
  'titlebar-lead-parts.mjs': ['shared-18-D3y8YMFN.js', ['iS', 'dS', 'px'], ['function px(){return h()==="rtl"?"auto":void 0}', 'Ia as h']],
  'titlebar-title-skeleton.mjs': ['c73f45bc3-B7hbL7H9.js', ['iy'], ['"data-slot":"title-preview"', '"data-slot":"title-caret-slot"', '"data-slot":"title-ghost"', 'function iy(e){let $=J9(5)']],
  'titlebar-focus-lost.mjs': ['c70925de4-SEtaxEBR.js', ['t'], ['r===null||r===n.body', 'ap as e']],
  'titlebar-focus-orphaned.mjs': ['c4db265df-fNhlkQCj.js', ['tt'], ['e.activeElement?.isConnected===!1']],
  'titlebar-fold-measure.mjs': ['cd54a5401-wFztHb-d.js', ['Lt', 'Rt', 'zt', 'Bt', 'Vt', 'Ht', 'Ut', 'Wt', 'Gt', 'qt', 'Jt', 'Yt', 'Xt', 'Zt', 'Qt', '$t', 'en', 'tn', 'nn', 'rn'],
    ['t.hasAttribute("data-lined-row-end-clearance")?(o+=t.getBoundingClientRect().width,[]):[t]', 'v=(parseFloat(l.paddingInlineEnd)||0)+o', 'function rn(e){return e.getBoundingClientRect()}', 'nn as c', 'qt as s']],
};
test('titlebar targets read 3.6556.2 originals (manifest, source bytes, bindings, feature strings)', () => {
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  for (const [target, [source, bindings, features]] of Object.entries(targets)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry.source), source, target);
    assert.match(entry.source, /snapshots\/claude-3\.6556\.2-20261025-192807\/ion-dist\/assets\/v1\//, target);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(v3, source))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = read(`src/generated/code-current/${target}`);
    assert.equal(sha(text), entry.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n'), target);
    for (const feature of features) assert.ok(current(source).includes(feature), `${target}: ${feature}`);
  }
  for (const [target, [source, bindings, features]] of Object.entries(cdsTargets)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    if (entry.referenceVersion !== '2.42304.0') continue;
    assert.equal(path.basename(entry.source), source, target);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, source))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    for (const feature of features) assert.ok(official(source).includes(feature), `${target}: ${feature}`);
  }
  // The compiled targets take the React Compiler slot helpers by view-tabs name (E3, R3), never by minified name, and
  // the direction hint calls view-tabs useDirection (vendor-frame un, exported Ia: N(ln)?.direction ?? "ltr").
  assert.match(read('src/generated/code-current/titlebar-fold-measure.mjs'), /reactMemoCache as J9,[\s\S]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(read('src/generated/code-current/titlebar-title-skeleton.mjs'), /memoChanged4 as J4,[\s\S]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(read('src/generated/code-current/titlebar-lead-parts.mjs'), /import \{ useDirection as h \} from "\.\.\/view-tabs\/vendor-frame-CnSY1sxv\.js";/);
  assert.ok(current('vendor-frame-CnSY1sxv.js').includes('function un(){return fn(ln)?.direction??"ltr"}') || /function un\(\)\{return [\w$]+\(ln\)\?\.direction\?\?"ltr"\}/.test(current('vendor-frame-CnSY1sxv.js')));
  const viewTabs = JSON.parse(read('src/generated/view-tabs/manifest.json')).publicNames;
  assert.deepEqual([viewTabs.useDirection.file, viewTabs.useDirection.local], ['vendor-frame-CnSY1sxv.js', 'un']);
  assert.deepEqual([viewTabs.reactMemoCache.file, viewTabs.reactMemoCache.local], ['shared-frame-6jtSkIit.js', 'J9']);
});

// TF-C9 (3.6556.2 nn): a row child marked [data-lined-row-end-clearance] (shared-18 Jb, the traffic-light spacer) is
// measured as room the title may not take, not as a pane; it is 0px wide on the host (LTR, no data-mac-lights).
test('nn counts an end-clearance child as reserved room, so the title folds toggles sooner', () => {
  const specs = titlebarToggleSpecs({ surface: 'code', session: true, terminalAvailable: true, previewAvailable: true });
  const run = (clearance) => {
    const layout = titlebarLayout({ width: 330, titleNatural: 300 });
    if (clearance) {
      const spacer = { nodeType: 1, ownerDocument: layout.root.ownerDocument, style: { position: 'static', display: 'block' }, contains: () => false,
        hasAttribute: (name) => name === 'data-lined-row-end-clearance', getBoundingClientRect: () => ({ left: 330, right: 330 + clearance, width: clearance }) };
      layout.root.children.push(spacer);
    }
    const rootRef = { current: layout.root }, togglesRef = { current: layout.group };
    let attached = false;
    const Harness = () => {
      const fold = Fold.useTitlebarFold({ rootRef, togglesRef, title: 'Long title', interactive: true, clusterMounted: true, tileLayout: '', sessionId: 'a', maxHidden: 6 });
      return { ...fold, ...foldTitlebarToggles(specs, fold.hiddenCount) };
    };
    const host = hookHost(Harness, { commit(out) {
      layout.state.inline = out.inline.length; layout.state.compact = out.pillsCompact;
      if (!attached) { attached = true; out.titleRef(layout.title); }
    } });
    host.settle();
    for (const observer of layout.observers) observer.callback();
    host.settle();
    return host.out.hiddenCount;
  };
  const without = run(0), withRoom = run(56);
  assert.equal(without, 2);
  assert.ok(withRoom > without, `a 56px end clearance folds more toggles (${withRoom} vs ${without})`);
});
