// R4f-rail SR-1: the Code session rail's primitives and shell, generated from the installed 2.42304.0 originals into
// src/generated/session-rail-kit (scripts/extract-session-rail-kit.mjs). Source/AST pins, Vite SSR renders and the
// stores driven through their own APIs: no browser, no Electron, no network, no real storage (a Map-backed stub).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionRailKit } from '../scripts/extract-session-rail-kit.mjs';

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-rail-kit');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
// A class string as React writes it into an attribute, as a RegExp source.
const attr = text => text.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A Map-backed localStorage (the rail stores persist through shared-52's guarded localStorage, which reads
// window.localStorage); set before the stores' modules evaluate.
const storage = new Map();
const localStorageStub = {
  getItem: key => (storage.has(key) ? storage.get(key) : null), setItem: (key, value) => { storage.set(key, String(value)); },
  removeItem: key => { storage.delete(key); }, key: index => [...storage.keys()][index] ?? null, clear: () => storage.clear(),
  get length() { return storage.size; },
};
let previousWindow, previousDocument;
let server, Rows, Sections, Layout, Shown, Chip, Card, Shell, Column, Adapters, Tokens;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); the rail parts read nothing else of the
  // document during SSR.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: localStorageStub, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = name => server.ssrLoadModule(`/src/generated/session-rail-kit/${name}`);
  [Rows, Sections, Layout, Shown, Chip, Card, Shell, Column, Tokens] = await Promise.all(['rail-rows.mjs', 'rail-sections-store.mjs', 'rail-layout.mjs',
    'rail-shown-store.mjs', 'branch-chip.mjs', 'rail-card.mjs', 'rail-shell.mjs', 'rail-column.mjs', 'cds-tokens.mjs'].map(load));
  Adapters = await server.ssrLoadModule('/src/source-session-rail-kit-adapters.jsx');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

test('generator: the originals still match 2.42304.0 and src/generated/session-rail-kit is current', async () => {
  const checked = await extractSessionRailKit({ check: true });
  assert.equal(checked.referenceVersion, '2.42304.0');
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-session-rail-kit.mjs')), true, 'prepare-ui verifies it (D0)');
});

test('feature strings: each pinned string is in the original chunk and in the generated module', () => {
  const pins = [
    ['c227f4d5e-Ba-r--Rl.js', 'Not in worktree', 1, 'rail-rows.mjs'], ['c227f4d5e-Ba-r--Rl.js', 'Preparing worktree\\u2026', 1, 'rail-rows.mjs'],
    ['c227f4d5e-Ba-r--Rl.js', 'Worktree on edit', 1, 'rail-rows.mjs'], ['c227f4d5e-Ba-r--Rl.js', 'data-rail-worktree', 1, 'rail-rows.mjs'],
    ['c227f4d5e-Ba-r--Rl.js', 'epitaxy.sessionRailSections', 1, 'rail-sections-store.mjs'],
    ['cc43287c9-DAfOi8yP.js', 'Hide session rail', 1, 'rail-shell.mjs'], ['cc43287c9-DAfOi8yP.js', 'Show session rail', 1, 'rail-shell.mjs'],
    ['cc43287c9-DAfOi8yP.js', 'Session details', 1, 'rail-shell.mjs'],
    ['shared-6-Cby4X-ms.js', 'data-epitaxy-rail-column', 1, 'rail-column.mjs'], ['shared-18-D4XxL6Tg.js', 'data-session-rail-flat', 6, 'rail-layout.mjs'],
    ['shared-18-D4XxL6Tg.js', '--session-rail-w,17.5rem', 1, 'rail-layout.mjs'],
    ['shared-20-B7UqYfsi.js', 'persisted.epitaxy.sessionRailShown', 1, 'rail-shown-store.mjs'],
    ['c0a531389-TdrucM3-.js', 'Copy branch name', 1, 'branch-chip.mjs'], ['c0a531389-TdrucM3-.js', 'Branch name copied to clipboard.', 1, 'branch-chip.mjs'],
    ['c73f45bc3-CFrHin0p.js', 'group/railcard', 1, 'rail-card.mjs'], ['c73f45bc3-CFrHin0p.js', 'Reset to defaults', 1, 'rail-card.mjs'],
  ];
  for (const [file, needle, count, target] of pins) {
    assert.equal(occurrences(raw(file), needle), count, `${file}: ${needle}`);
    const text = generated(target);
    assert.ok(text.includes(needle) || text.includes(needle.replace('\\u2026', '…')), `${target}: ${needle}`);
  }
});

test('one copy: view-tabs only by public names (D1), E from code-current, contexts owned once and published', () => {
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const published = new Set(Object.keys(viewTabs.publicNames));
  for (const m of manifest.modules) for (const i of m.imports) {
    if (i.kind === 'view-tabs') assert.ok(published.has(i.name), `${m.target} imports view-tabs ${i.name}`);
    assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
  }
  // c0a531389 E (head / tail split) is code-current's environment-name-parts.mjs; the kit never slices it again.
  const chip = manifest.modules.find(m => m.target === 'branch-chip.mjs');
  assert.deepEqual(chip.bindings.map(b => b.name).sort(), ['A', 'D', 'O', 'T', 'k', 'w'].sort());
  assert.deepEqual(chip.imports.find(i => i.local === 'E'), { local: 'E', from: '../code-current/environment-name-parts.mjs', name: 'environmentNameParts',
    via: 'c0a531389-TdrucM3-.js:E', kind: 'code-current', original: 'c0a531389-TdrucM3-.js:E' });
  for (const m of manifest.modules) if (m.source === 'c0a531389-TdrucM3-.js') assert.ok(!m.bindings.some(b => b.name === 'E'), m.target);
  // The CDS parts the rows and the card render are view-tabs' (CdsCollapsible, CdsDisabledReason, CdsContextMenu …).
  const card = manifest.modules.find(m => m.target === 'rail-card.mjs');
  assert.equal(card.imports.find(i => i.local === 'ln').name, 'CdsCollapsible');
  const rows = manifest.modules.find(m => m.target === 'rail-rows.mjs');
  assert.equal(rows.imports.find(i => i.local === 'to').name, 'CdsDisabledReason');
  // Contexts and stores downstream generators must share are published by (file, local).
  for (const [name, file, local] of [['RailFlatContext', 'shared-18-D4XxL6Tg.js', 'py'], ['BranchChipFaceContext', 'c0a531389-TdrucM3-.js', 'D'],
    ['ChangesRowLayoutContext', 'c0a531389-TdrucM3-.js', 'O'], ['RailSessionKeyContext', 'c227f4d5e-Ba-r--Rl.js', 'jZ'],
    ['railSectionsStore', 'c227f4d5e-Ba-r--Rl.js', 'VZ'], ['sessionRailShownStore', 'shared-20-B7UqYfsi.js', 'zm'], ['RailCard', 'c73f45bc3-CFrHin0p.js', 'Xv'],
    ['SessionRailToggle', 'cc43287c9-DAfOi8yP.js', 'EH'], ['RailWorktreeMark', 'c227f4d5e-Ba-r--Rl.js', 'dR']])
    assert.deepEqual([manifest.publicNames[name]?.file, manifest.publicNames[name]?.local], [file, local], name);
  assert.deepEqual(manifest.modules.find(m => m.target === 'rail-layout.mjs').contexts, ['py', 'gb', '_b']);
  assert.ok(manifest.callSites.length >= 9);
  for (const role of ['Code session view rail state machine (host: SR-7)', 'Session pane titlebar: rail toggle placement and fold into the ⋮ menu (host: SR-6)'])
    assert.ok(manifest.callSites.some(site => site.role === role), role);
});

const render = node => renderToStaticMarkup(node);

test('dR (RailWorktreeMark): the three pending states and the plain "Worktree" mark, with the hint wrapper', () => {
  const { RailWorktreeMark } = Rows;
  const preparing = render(h(RailWorktreeMark, { wordId: 'w1', pending: 'preparing' }));
  assert.match(preparing, /<span data-rail-worktree="preparing" class="text-muted-as-secondary">Preparing worktree…<\/span>/);
  assert.match(preparing, /^<span class="flex shrink-0 items-center gap-sm ps-sm pe-xs text-footnote text-secondary">/);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', pending: 'ready' })), /data-rail-worktree="ready"[^>]*>Worktree on edit</);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', pending: 'notEntered' })), /data-rail-worktree="notEntered"[^>]*>Not in worktree</);
  const plain = render(h(RailWorktreeMark, { wordId: 'w1' }));
  assert.match(plain, /<span id="w1">Worktree<\/span>/);
  assert.doesNotMatch(plain, /data-rail-worktree/);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', changed: true })), /<span id="w1" class="text-accent">Worktree<\/span>/);
  // A hint wraps the word in the CDS disabled-reason wrapper (a focusable span described by the reason).
  const hinted = render(h(RailWorktreeMark, { wordId: 'w1', hint: '/repo/.claude/worktrees/a' }));
  assert.match(hinted, /data-cds-disabled-reason-wrapper=""/);
  assert.match(hinted, /shrink-0 rounded focus-visible:outline-hidden focus-visible:shadow-focus/);
  assert.match(hinted, /\/repo\/\.claude\/worktrees\/a/);
  const trailing = render(h(RailWorktreeMark, { wordId: 'w1' }, h('b', null, 'x')));
  assert.match(trailing, /Worktree<\/span><b>x<\/b><\/span>$/);
});

test('row primitives: folder row, read-only row with flush start (--cds-outset-x), separator, icon box', () => {
  const { RailFolderRow, RailRow, RailRowSeparator, RAIL_ICON_BOX_CLASS, RAIL_ROW_CLASS, RAIL_ROW_BUTTON_CLASS } = Rows;
  assert.equal(Tokens.cdsTokens.pad.md.cssVar, 'var(--cds-pad-md)');
  const folder = render(h(RailFolderRow, { interactive: false }, 'claude-ui-lab'));
  assert.match(folder, new RegExp(`^<div class="${attr(RAIL_ROW_CLASS)}"><span class="${attr(RAIL_ICON_BOX_CLASS)}">`));
  assert.match(folder, /--cds-outset-x:var\(--cds-pad-md\)/);
  assert.match(folder, /class="flex min-w-0 flex-1 items-center text-primary ms-outset"/);
  assert.match(folder, /claude-ui-lab/);
  const interactive = render(h(RailFolderRow, { interactive: true }, h('button', null, 'pick')));
  assert.match(interactive, /\[&amp;&gt;button\]:ps-8/);
  assert.match(interactive, /aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-xs"/);
  assert.equal(render(h(RailRowSeparator)), '<span aria-hidden="true" class="shrink-0 text-muted-as-secondary">·</span>');
  assert.match(render(h(RailRow, { icon: 'Folder' }, 'x')), /class="flex min-w-0 flex-1 items-center text-primary"/);
  assert.ok(RAIL_ROW_BUTTON_CLASS.startsWith(RAIL_ROW_CLASS));
});

test('My / Ny: the fit thresholds 611 (alone) and 771 (beside a pane)', () => {
  const { railFit, railFits, RAIL_FIT_ALONE, RAIL_FIT_BESIDE_PANE, RAIL_WIDTH_CLASS, RAIL_DOCKED_COLUMN_CLASS, railRaisesPickers } = Layout;
  assert.equal(RAIL_FIT_ALONE, 611);
  assert.equal(RAIL_FIT_BESIDE_PANE, 771);
  assert.deepEqual([610, 611, 770, 771, 1200].map(width => railFit({ width })), ['none', 'alone', 'alone', 'beside-pane', 'beside-pane']);
  assert.deepEqual(['none', 'alone', 'beside-pane'].map(fit => [railFits(fit, false), railFits(fit, true)]), [[false, false], [true, false], [true, true]]);
  assert.equal(RAIL_WIDTH_CLASS, 'w-[var(--session-rail-w,17.5rem)]');
  assert.ok(RAIL_DOCKED_COLUMN_CLASS.startsWith(`absolute inset-y-0 flex ${RAIL_WIDTH_CLASS} flex-col pt-3 pb-0.75 end-[var(--session-rail-end)] epitaxy-overlay-rail-shift`));
  assert.equal(railRaisesPickers({ railMode: true, railOnScreen: false, readOnly: false, fits: true }), true);
  assert.equal(railRaisesPickers({ railMode: true, railOnScreen: false, readOnly: false, fits: true, pickersUnderPrompt: true }), false);
  assert.equal(Column.RAIL_COLUMN_ATTRIBUTE, 'data-epitaxy-rail-column');
  // Iy (flat): a model / mode / permissions / effort request with no picker row is released; context stays.
  const store = { state: { pickerRowMounted: false, openComposerMenu: null }, getState() { return this.state; }, setState(patch) { this.state = { ...this.state, ...patch }; } };
  const effort = { menu: 'effort' }; store.state.openComposerMenu = effort;
  Layout.releaseFlatComposerMenu(store, effort);
  assert.equal(store.state.openComposerMenu, null);
  const context = { menu: 'context' }; store.state.openComposerMenu = context;
  Layout.releaseFlatComposerMenu(store, context);
  assert.equal(store.state.openComposerMenu, context);
});

test('section rules: environment never hides, progress is always off, settings / usage are off when flat (D10)', () => {
  const { RAIL_SECTION_IDS, railHideableSections, railSectionExcluded, railSectionHidden, railSectionOrder, railSectionsCustomized, RAIL_SECTIONS_FOLDED_BY_DEFAULT } = Sections;
  assert.deepEqual(RAIL_SECTION_IDS, ['environment', 'goal', 'settings', 'context', 'usage', 'connectors', 'progress', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.deepEqual(railHideableSections(true), ['goal', 'context', 'connectors', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.deepEqual(railHideableSections(false), ['goal', 'settings', 'context', 'usage', 'connectors', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.equal(railSectionExcluded('progress', false), true);
  assert.equal(railSectionExcluded('usage', true), true);
  assert.equal(railSectionExcluded('usage', false), false);
  assert.equal(railSectionHidden({ hidden: ['environment'] }, 'environment'), false);
  assert.equal(railSectionHidden({ hidden: ['outputs'] }, 'outputs'), true);
  assert.deepEqual(RAIL_SECTIONS_FOLDED_BY_DEFAULT, ['connectors', 'context', 'usage', 'backgroundTasks']);
  // JZ: a saved order that knows backgroundTasks but not servers gets servers right before it.
  const order = railSectionOrder(['backgroundTasks', 'environment']);
  assert.ok(order.indexOf('servers') === order.indexOf('backgroundTasks') - 1);
  assert.equal(railSectionsCustomized({ hidden: [], order: [] }, true), false);
  assert.equal(railSectionsCustomized({ hidden: ['outputs'], order: [] }, true), true);
});

test('stores: epitaxy.sessionRailSections and persisted.epitaxy.sessionRailShown persist through the guarded localStorage', () => {
  const { railSectionsStore, railSectionOpen } = Sections;
  assert.equal(railSectionsStore.persist.getOptions().name, 'epitaxy.sessionRailSections');
  const s = railSectionsStore.getState();
  assert.equal(railSectionOpen(s, 'session-a', 'outputs'), true, 'open unless folded');
  assert.equal(railSectionOpen(s, 'session-a', 'backgroundTasks'), false, 'folded by default');
  s.setOpen('session-a', 'outputs', false);
  s.setOpen('session-a', 'backgroundTasks', true);
  const after = railSectionsStore.getState();
  assert.deepEqual(after.foldsBySession['session-a'], { collapsed: ['outputs'], expanded: ['backgroundTasks'] });
  s.setHidden('servers', true);
  s.setOrder(['servers', 'nope', 'environment', 'servers']);
  assert.deepEqual(railSectionsStore.getState().order, ['servers', 'environment']);
  const saved = JSON.parse(storage.get('epitaxy.sessionRailSections'));
  assert.deepEqual(saved.state, { foldsBySession: { 'session-a': { collapsed: ['outputs'], expanded: ['backgroundTasks'] } }, hidden: ['servers'], order: ['servers', 'environment'] });
  railSectionsStore.getState().resetSections();
  assert.deepEqual([railSectionsStore.getState().hidden, railSectionsStore.getState().order], [[], []]);

  const { sessionRailShownStore, selectRailShown } = Shown;
  assert.deepEqual([sessionRailShownStore.persist.getOptions().name, sessionRailShownStore.persist.getOptions().version], ['persisted.epitaxy.sessionRailShown', 1]);
  assert.equal(selectRailShown(sessionRailShownStore.getState()), true, 'shown by default');
  sessionRailShownStore.getState().setShown(false);
  assert.deepEqual(JSON.parse(storage.get('persisted.epitaxy.sessionRailShown')), { state: { shown: false }, version: 1 });
  sessionRailShownStore.getState().setShown(true);
});

test('EH (SessionRailToggle): Show / Hide, pressed, the flat accent style, aria-expanded only with overlay semantics', () => {
  const { SessionRailToggle } = Shell;
  const off = render(h(SessionRailToggle, { model: { onScreen: false, raises: false, panelId: 'p1', onToggle() {} } }));
  assert.match(off, /aria-label="Show session rail"/);
  assert.doesNotMatch(off, / aria-expanded="/);
  assert.doesNotMatch(off, / aria-controls="/);
  assert.match(off, /--cds-bg-accent:var\(--cds-fill-ghost-selected\)/, 'flat (D10): TH');
  assert.match(off, /data-cds="Button"/);
  const on = render(h(SessionRailToggle, { model: { onScreen: true, raises: false, panelId: 'p1', onToggle() {} } }));
  assert.match(on, /aria-label="Hide session rail"/);
  assert.match(on, /aria-pressed="true"/);
  assert.doesNotMatch(on, / aria-expanded="/);
  const raised = render(h(SessionRailToggle, { model: { onScreen: true, raises: true, panelId: 'p1', onToggle() {} } }));
  assert.match(raised, /aria-expanded="true"/);
  assert.match(raised, /aria-controls="p1"/);
  const closed = render(h(SessionRailToggle, { model: { onScreen: false, raises: true, panelId: 'p1', onToggle() {} } }));
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, / aria-controls="/);
  // DH: no region registry here, so the opener renders nothing on or off screen.
  assert.equal(render(h(Shell.SessionRailOpener, { model: { onScreen: false, onToggle() {} }, scopeRef: { current: null } })), '');
});

test('bH / jH: the docked column (data-epitaxy-rail-column) and the overlay (Session details) mount the host rail content', () => {
  const seen = [];
  const Host = props => { seen.push(props); return h('aside', { 'aria-label': 'Session details' }, props.sessionRef.id); };
  const props = { sessionRef: { id: 'local_1', type: 'local' }, scopeStore: null, mountKey: 'm', isPanelActive: true, onRequestComposerFocus() {}, readOnly: false, scrollRef: { current: null } };
  const docked = render(h(Adapters.SessionRailHostContext.Provider, { value: Host }, h(Shell.SessionRailDockedColumn, props)));
  assert.match(docked, new RegExp(`^<div data-epitaxy-rail-column="" class="${attr(Layout.RAIL_DOCKED_COLUMN_CLASS)}">`));
  assert.match(docked, /<aside aria-label="Session details">local_1<\/aside>/);
  assert.equal(seen.at(-1).className, undefined);
  const overlay = render(h(Adapters.SessionRailHostContext.Provider, { value: Host },
    h(Shell.SessionRailOverlay, { ...props, panelId: 'rail-panel', toggleRef: { current: null }, focusOnMount: false, onDismiss() {} })));
  assert.match(overlay, /^<div id="rail-panel" tabindex="-1" role="group" aria-label="Session details" class="absolute inset-y-0 end-\[var\(--titlebar-end-inset,0\.5rem\)\] flex w-\[var\(--session-rail-w,17\.5rem\)\] flex-col pt-3 pb-2 outline-none">/);
  assert.match(overlay, /<div data-session-rail-flat="" class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border bg-surface-1 shadow-panel-md/);
  assert.equal(seen.at(-1).className, 'h-full w-full');
  // Without a host component the lazy slot renders nothing.
  assert.equal(render(h(Adapters.LazySessionRailHost, props)), '');
});

test('the overlay helpers: OH layers, the wheel hand-off test and the shown store context', () => {
  // OH: a target in another top-level layer of the body is outside the overlay's layer.
  const node = (parent, extra = {}) => ({ parentNode: parent, contains(other) { for (let at = other; at; at = at.parentNode) if (at === this) return true; return false; }, ...extra });
  const body = node(null); const doc = { body }; body.ownerDocument = doc;
  const layerA = node(body), layerB = node(body), inA = node(layerA), inB = node(layerB);
  for (const n of [layerA, layerB, inA, inB]) n.ownerDocument = doc;
  assert.equal(Shell.outsideLayer(inB, inA), true);
  assert.equal(Shell.outsideLayer(node(inA, { ownerDocument: doc }), inA), false);
  assert.equal(Shell.outsideLayer(body, inA), false);
  // FH reads the provided store: PH's non-persisted store starts hidden.
  let read;
  const Probe = () => { read = Shell.useRailShown(); return null; };
  render(h(Shell.RailShownStoreProvider, null, h(Probe)));
  assert.equal(read.shown, false);
  render(h(Probe));
  assert.equal(read.shown, true, 'default: the persisted store (shown)');
});

test('c0a531389 A (BranchChip): mono face by default, sans from the context, head / tail split for long names', () => {
  const { BranchChip, BranchChipFaceContext, ChangesRowLayoutContext } = Chip;
  const short = render(h(BranchChip, { branchName: 'main' }));
  assert.match(short, /data-cds="Button"/);
  assert.match(short, /<span dir="ltr" class="truncate font-mono-ui">main<\/span>/);
  assert.match(short, /text-muted hover:text-primary/);
  const sans = render(h(BranchChipFaceContext.Provider, { value: 'sans' }, h(BranchChip, { branchName: 'main' })));
  assert.match(sans, /<span dir="ltr" class="truncate">main<\/span>/);
  const long = render(h(BranchChip, { branchName: 'claude/worktree-feature-long-name' }));
  assert.match(long, /aria-label="claude\/worktree-feature-long-name"/);
  assert.match(long, /<span class="min-w-\[2em\] truncate">claude\/worktree-feature<\/span><span class="max-w-\[calc\(100%-2em\)\] shrink-0 truncate">-long-name<\/span>/);
  assert.match(long, /<span dir="ltr" class="relative flex min-w-0 overflow-hidden font-mono-ui">/);
  assert.match(long, / aria-haspopup="menu" aria-expanded="false"/, 'the chip is the menu trigger');
  const accent = render(h(BranchChip, { branchName: 'main', accent: 'purple' }));
  assert.match(accent, /text-git-merged/);
  assert.equal(React.version.split('.')[0], '19');
  // The Changes row layout context defaults to "stacked" (rD provides "row" when flat).
  let layout;
  const Probe = () => { layout = React.useContext(ChangesRowLayoutContext); return null; };
  render(h(Probe));
  assert.equal(layout, 'stacked');
});

test('c73f45bc3 Xv (RailCard): the section, its collapsible header and the excluded sections', () => {
  const { RailCard, RAIL_SECTION_TITLES, railSectionTitle } = Card;
  const html = render(h(RailCard, { id: 'outputs', title: 'Outputs', summary: '3' }, h('p', null, 'body')));
  assert.match(html, /^<section data-rail-section="" aria-labelledby="(_R_\w+_)" data-open="" data-cds="Collapsible" class="group\/railcard flex shrink-0 flex-col py-md rounded-card shadow-card-ring \[\[data-session-rail-flat\]_&amp;\]:rounded-none/);
  assert.match(html, /<div class="group\/railtop relative flex min-h-6\.5 min-w-0 items-center gap-xs px-md"/);
  assert.match(html, /<button type="button" data-panel-open="" [^>]*aria-expanded="true"/, 'open unless folded');
  assert.match(html, /data-rail-panel="" class="[^"]*epitaxy-rail-panel"><div class="flex flex-col px-md"><p>body<\/p><\/div>/);
  assert.match(html, /<h3 id="[^"]+" class="flex min-w-0 flex-1 rounded group-data-\[rail-menu-open\]\/railtop:bg-alpha-1">/);
  assert.match(html, /group\/railhead flex min-h-6\.5 w-full min-w-0 items-center gap-1 px-xs text-footnote-medium text-primary/);
  assert.match(html, /<span class="shrink-0">Outputs<\/span>/);
  assert.match(html, /group-data-\[panel-open\]\/railhead:rotate-90/);
  assert.match(html, /<span aria-hidden="true" class="ms-auto min-w-0 truncate ps-sm text-footnote font-normal text-muted-as-secondary invisible">3<\/span>/, 'the summary hides while open');
  // progress is always excluded; usage / settings only when flat.
  assert.equal(render(h(RailCard, { id: 'progress', title: 'Progress' })), '');
  assert.equal(render(h(Layout.RailFlatContext.Provider, { value: true }, h(RailCard, { id: 'usage', title: 'Usage' }))), '');
  assert.notEqual(render(h(RailCard, { id: 'usage', title: 'Usage' })), '');
  assert.equal(RAIL_SECTION_TITLES.pullRequests.defaultMessage, 'Changes');
  assert.equal(railSectionTitle({ formatMessage: m => m.defaultMessage }, 'backgroundTasks'), 'Background tasks');
  assert.equal(Card.useRailFlat.length, 0);
});
