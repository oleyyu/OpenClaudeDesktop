// R3-topbar TT-03 (2.42304.0): the titlebar folds its pane toggles one by one into ⋮ View options.
//   cd54a5401 un (generated titlebar-fold-measure.mjs useTitlebarFold) measures the row and returns hiddenCount;
//   c73f45bc3 jh (titlebar-toggle-fold.mjs foldTitlebarToggles) folds inactive toggles first, both lists in order;
//   c73f45bc3 Rh is the toggle order (titlebar-controls-model.mjs titlebarToggleSpecs) and Vh lists `.folded`;
//   cc43287c9 uW hands keyboard focus on when a focused toggle folds (titlebar-fold-focus.mjs).
// Also pins the R3-topbar generated targets (manifest, official source bytes and feature strings).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { titlebarToggleSpecs, titlebarFoldedToggles, foldedTogglesActive } from '../src/titlebar-controls-model.mjs';
import { titlebarViewOptionsItems } from '../src/session-chord-model.mjs';
import { foldTitlebarToggles } from '../src/generated/code-current/titlebar-toggle-fold.mjs';
import { createFoldFocusHandoff } from '../src/titlebar-fold-focus.mjs';
import { focusOrphaned } from '../src/generated/code-current/titlebar-focus-orphaned.mjs';
import { focusLost } from '../src/generated/code-current/titlebar-focus-lost.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (name) => fs.readFileSync(path.join(reference, name), 'utf8');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

let server, Fold;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Fold = await server.ssrLoadModule('/src/generated/code-current/titlebar-fold-measure.mjs');
});
after(() => server?.close());

const panes = (...open) => new Set(open);
const order = (specs) => specs.map((spec) => spec.pane);

test('Rh order: a session lists Terminal, Changes, Preview, Files; the landing Terminal, Preview, Files', () => {
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
  const rh = official('c73f45bc3-CFrHin0p.js');
  assert.ok(rh.includes('return i?[...o,...r,...s]:[...o,{pane:"diff"'), 'landing vs session order');
});

// R4g-small SM1 topbar-04 (D36): with `frontend_preview_external_domains` off (no GrowthBook on the host) Rh's
// preview row is Io.preview "Play", "Preview" and W7's ungated togglePreview ⇧⌘P; a folded row keeps the same icon.
test('topbar-04: the Code preview toggle is the gate-off Rh row (Play, Preview, ⇧⌘P)', () => {
  const count = (text, needle) => text.split(needle).length - 1;
  const rh = official('c73f45bc3-CFrHin0p.js');
  assert.equal(count(rh, 'icon:e==="preview"&&C?"Globe":Io[e]'), 1);
  assert.equal(count(rh, 'C?n.formatMessage({defaultMessage:"Browser",id:"E3oB+tM0Ou"}):n.formatMessage({defaultMessage:"Preview",id:"TJo5E6JuIN"})'), 1);
  assert.equal(count(rh, 'G("togglePreview",S,{externalPreviewAvailable:C})'), 1);
  assert.equal(count(rh, 'C=He(r?.type)'), 1);
  assert.equal(count(rh, 'ss as He,'), 1);
  const gate = official('shared-78-D6VXYXaQ.js');
  assert.equal(count(gate, 'var mU="frontend_preview_external_domains"'), 1);
  assert.equal(count(gate, 'function SU(e){let t=hU(),n=yU(),r=xU()===null;return e==="remote"?n&&r:t}'), 1);
  assert.equal(count(official('c26fb8b6b-DfPeiuGP.js'), 'var Cn={preview:"Play",'), 1);
  assert.equal(count(official('shared-19-CkPOiIKm.js'), '{command:"togglePreview",key:"cmd+shift+b",code:"KeyB",when:"isClaudeApp",gate:"externalPreviewAvailable"},{command:"togglePreview",key:"cmd+shift+p",code:"KeyP",when:"isClaudeApp"}'), 1);
  const input = { surface: 'code', session: true, terminalAvailable: true, previewAvailable: true };
  const row = (specs) => specs.find((spec) => spec.pane === 'preview');
  for (const session of [true, false]) {
    const { icon, label, shortcut } = row(titlebarToggleSpecs({ ...input, session }));
    assert.deepEqual([icon, label, shortcut], ['Play', 'Preview', 'cmd+shift+p']);
  }
  assert.deepEqual(row(titlebarFoldedToggles(input, 4)), row(titlebarToggleSpecs(input)));
  // Other surfaces are not Rh: the Cowork session view's yE is Globe + "Browser".
  const ye = official('c21f11e6d-Bd0v2A97.js');
  assert.equal(count(ye, 'v(As,{content:r.formatMessage({defaultMessage:"Browser",id:"E3oB+tM0Ou"}),shortcut:"cmd+shift+b"'), 1);
  assert.deepEqual([row(titlebarToggleSpecs({ ...input, surface: 'cowork' })).icon, row(titlebarToggleSpecs({ ...input, surface: 'chat' })).label], ['Globe', 'Browser']);
});

test('jh folds inactive toggles first, one per hidden count, and both lists keep the toggle order', () => {
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
  assert.ok(official('c73f45bc3-CFrHin0p.js').includes('folded:e.filter(e=>i.has(e))'));
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
  const node = (props) => Object.defineProperties({ nodeType: 1, ownerDocument: doc, style: { position: 'static', display: 'flex' }, contains: () => false },
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
  const render = () => { cursor = 0; const old = internal.H; internal.H = hooks; try { out = component(props); } finally { internal.H = old; } props.commit?.(out); };
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

test('un over the local row folds one toggle at a time as the window narrows, compacting the folder chip first', () => {
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
  const uw = official('cc43287c9-DAfOi8yP.js');
  assert.ok(uw.includes('t.matches(":focus-visible")'));
  assert.ok(official('c4db265df-CAC3hDZP.js').includes('e.activeElement?.isConnected===!1'));
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

// R3-topbar generated targets: every entry reads 2.42304.0, pins the official chunk's bytes, and carries its features.
const targets = {
  'button-press.mjs': ['shared-frame-BfjMqbuN.js', ['ps', 'ms', 'hs', 'Ll', 'Rl', 'zl', 'Bl'], ['ps=.8', 'function Bl(e){return Math.min(zl,Math.max(Rl,e*Ll))}']],
  'tooltip-structure.mjs': ['shared-frame-BfjMqbuN.js', ['Gc', 'Kc', 'qc'], ['var Gc=new WeakMap,Kc=0;function qc(e){', 'if(!ze(e))return typeof e']],
  'titlebar-lead-classes.mjs': ['shared-6-Cby4X-ms.js', ['Jh', 'Yh', 'Xh', 'Fh', 'qh', 'Zh', 'Qh', '$h'], ['qh="truncate text-body font-medium font-control text-primary select-none"', 'Zh="aspect-square w-control shrink-0"']],
  'titlebar-panels-scope.mjs': ['shared-15-Cc9xvKlF.js', ['bn', 'xn'], ['function xn(){return f(bn)===!0}']],
  'titlebar-lead-parts.mjs': ['shared-18-D4XxL6Tg.js', ['Uy', 'Yy', 'qb'], ['function qb(){return x()==="rtl"?"auto":void 0}']],
  'titlebar-title-skeleton.mjs': ['c73f45bc3-CFrHin0p.js', ['n_'], ['"data-slot":"title-preview"', '"data-slot":"title-caret-slot"', '"data-slot":"title-ghost"']],
  'titlebar-focus-lost.mjs': ['c70925de4-C8m73NRP.js', ['t'], ['r===null||r===n.body']],
  'titlebar-focus-orphaned.mjs': ['c4db265df-CAC3hDZP.js', ['Ze'], ['e.activeElement?.isConnected===!1']],
};
test('R3-topbar targets read 2.42304.0 originals (manifest, source bytes, bindings, feature strings)', () => {
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  for (const [target, [source, bindings, features]] of Object.entries(targets)) {
    const entry = manifest.modules.find((module) => module.target === target);
    assert.ok(entry, target);
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry.source), source, target);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, source))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = read(`src/generated/code-current/${target}`);
    assert.equal(sha(text), entry.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 2.42304.0 bindings; generated by extract-code-ui-current.mjs.\n'), target);
    for (const feature of features) assert.ok(official(source).includes(feature), `${target}: ${feature}`);
  }
  // The shared-frame chunk imports React's Fragment as `j` and isValidElement as `ze` (vendor-frame Ja = d, io = T).
  assert.match(official('shared-frame-BfjMqbuN.js'), /io as ze,/);
  assert.match(official('shared-frame-BfjMqbuN.js'), /Ja as j,/);
  const vendor = official('vendor-frame-DfPJ1QmD.js');
  assert.ok(vendor.includes('d=o.Fragment') && vendor.includes('T=o.isValidElement'));
  assert.match(read('src/generated/code-current/tooltip-structure.mjs'), /import \{ Fragment as j, isValidElement as ze \} from "react";/);
  // Td, which the skeleton's direction hint calls, is useContext(wd)?.direction ?? "ltr"; the host maps wd to the
  // view-tabs DirectionContext.
  assert.ok(vendor.includes('function Td(){return N(wd)?.direction??"ltr"}'));
  assert.match(read('src/generated/code-current/titlebar-lead-parts.mjs'), /import \{ DirectionContext \} from "\.\.\/view-tabs\/vendor-frame-DfPJ1QmD\.js";/);
});
