// R4f-rail SR-1: the Code session rail's primitives and shell, generated from the 3.6556.2 originals (w2-rail-kit) into
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
let server, Rows, Sections, Layout, Shown, Chip, Card, Shell, Column, Adapters, Tokens, Icons;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); the rail parts read nothing else of the
  // document during SSR.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: localStorageStub, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = name => server.ssrLoadModule(`/src/generated/session-rail-kit/${name}`);
  [Rows, Sections, Layout, Shown, Chip, Card, Shell, Column, Tokens, Icons] = await Promise.all(['rail-rows.mjs', 'rail-sections-store.mjs', 'rail-layout.mjs',
    'rail-shown-store.mjs', 'branch-chip.mjs', 'rail-card.mjs', 'rail-shell.mjs', 'rail-column.mjs', 'cds-tokens.mjs', 'rail-repo-icon.mjs'].map(load));
  Adapters = await server.ssrLoadModule('/src/source-session-rail-kit-adapters.jsx');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

test('generator: the originals still match 3.6556.2 and src/generated/session-rail-kit is current', async () => {
  const checked = await extractSessionRailKit({ check: true });
  assert.equal(checked.referenceVersion, '3.6556.2');
  assert.equal(checked.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-session-rail-kit.mjs')), true, 'prepare-ui verifies it (D0)');
  // R1: the constants come from official-3.6556.2.mjs; no 2.42304.0 chunk is read.
  const source = fs.readFileSync(path.join(app, 'scripts/extract-session-rail-kit.mjs'), 'utf8');
  assert.match(source, /import \* as official from '\.\/official-3\.6556\.2\.mjs';/);
  assert.doesNotMatch(source, /installed-2\.42304\.0|vendor-frame-DfPJ1QmD|shared-frame-BfjMqbuN/);
  for (const m of manifest.modules) assert.equal(m.referenceVersion, '3.6556.2', m.target);
});

test('feature strings: each pinned string is in the 3.6556.2 chunk and in the generated module', () => {
  const pins = [
    ['c227f4d5e-B-FYKrwT.js', 'Not in worktree', 1, 'rail-rows.mjs'], ['c227f4d5e-B-FYKrwT.js', 'Preparing worktree\\u2026', 1, 'rail-rows.mjs'],
    ['c227f4d5e-B-FYKrwT.js', 'Worktree on edit', 1, 'rail-rows.mjs'], ['c227f4d5e-B-FYKrwT.js', 'data-rail-worktree', 1, 'rail-rows.mjs'],
    ['c227f4d5e-B-FYKrwT.js', 'epitaxy.sessionRailSections', 1, 'rail-sections-store.mjs'],
    ['cc43287c9-Me-M2ucD.js', 'Hide session rail', 1, 'rail-shell.mjs'], ['cc43287c9-Me-M2ucD.js', 'Show session rail', 1, 'rail-shell.mjs'],
    ['cc43287c9-Me-M2ucD.js', 'FUvHAfJy+j', 1, 'rail-shell.mjs'], ['cc43287c9-Me-M2ucD.js', 'Session details', 1, 'rail-shell.mjs'],
    ['shared-6-sd9jbJqs.js', 'data-epitaxy-rail-column', 1, 'rail-column.mjs'], ['shared-18-D3y8YMFN.js', 'data-session-rail-flat', 6, 'rail-layout.mjs'],
    ['shared-18-D3y8YMFN.js', '--session-rail-w,17.5rem', 1, 'rail-layout.mjs'],
    ['shared-20-mUr7IqZY.js', 'persisted.epitaxy.sessionRailShown', 1, 'rail-shown-store.mjs'],
    ['c96d752d0-CWv_7-n9.js', 'Copy branch name', 1, 'branch-chip.mjs'], ['c96d752d0-CWv_7-n9.js', 'Branch name copied to clipboard.', 1, 'branch-chip.mjs'],
    ['c73f45bc3-B7hbL7H9.js', 'group/railcard', 2, 'rail-card.mjs'], ['c73f45bc3-B7hbL7H9.js', 'Reset to defaults', 1, 'rail-card.mjs'],
    ['c73f45bc3-B7hbL7H9.js', 'data-rail-grab', 2, 'rail-card.mjs'], ['cccebaa3a-DQt76PcF.js', 'BookClosed', 1, 'rail-repo-icon.mjs'],
  ];
  for (const [file, needle, count, target] of pins) {
    assert.equal(occurrences(raw(file), needle), count, `${file}: ${needle}`);
    const text = generated(target);
    assert.ok(text.includes(needle) || text.includes(needle.replace('\\u2026', '…')), `${target}: ${needle}`);
  }
  // The 2.42304.0 card header (h3 trigger, rotate-90 caret class, the grab cursor on the grip) is gone (C1-1…C1-3).
  const card = generated('rail-card.mjs');
  assert.doesNotMatch(card, /"h3"|group-data-\[panel-open\]\/railhead:rotate-90|group\/railhead/);
  assert.match(card, /"group\/railgrip pointer-events-none absolute inset-y-0 end-0 flex w-20/);
  assert.match(card, /"absolute inset-y-0 end-0 w-20 cursor-grab touch-none active:cursor-grabbing"/);
});

test('one copy: view-tabs only by public names (D1), compiler helpers by E3 names, contexts owned once and published', () => {
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.equal(viewTabs.referenceVersion, '3.6556.2');
  const published = new Set(Object.keys(viewTabs.publicNames));
  const helpers = new Set(['reactMemoCache', 'memoSentinel', 'memoIsEmpty', ...[1, 2, 3, 4, 5].flatMap(n => [`memoChanged${n}`, `memoStore${n}`,
    `memoStoreValueFirst${n}`, `memoStoreDeps${n}`]), 'memoStore0']);
  for (const m of manifest.modules) for (const i of m.imports) {
    if (i.kind === 'view-tabs') {
      assert.ok(published.has(i.name), `${m.target} imports view-tabs ${i.name}`);
      assert.match(i.from, /^\.\.\/view-tabs\/[\w-]+\.js$/, `${m.target}: ${i.from} (R6: a concrete view-tabs file)`);
      if (/^[JKIZ]\d$/.test(i.local)) assert.ok(helpers.has(i.name), `${m.target}: ${i.local} is ${i.name}`);
    }
    assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
    if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react-dom', 'react/compiler-runtime'].includes(i.from), `${m.target}: ${i.from}`);
  }
  // React Compiler output: the cache comes from view-tabs (E3), never from a second slice of shared-frame.
  for (const m of manifest.modules) if (m.source === 'shared-frame-6jtSkIit.js')
    assert.ok(!m.bindings.some(b => /^[JKIZ]\d$/.test(b.name)), m.target);
  const card = manifest.modules.find(m => m.target === 'rail-card.mjs');
  assert.equal(card.imports.find(i => i.local === 'J9').name, 'reactMemoCache');
  assert.equal(card.imports.find(i => i.local === 'ne').name, 'CdsCollapsible');
  assert.equal(card.imports.find(i => i.local === 'V').name, 'CdsIcon');
  const rows = manifest.modules.find(m => m.target === 'rail-rows.mjs');
  assert.equal(rows.imports.find(i => i.local === 'Ee').name, 'CdsDisabledReason');
  // R4: roots view-tabs publishes in 3.6556.2 keep their kit names as re-exports of the one copy.
  assert.match(generated('logger.mjs'), /import \{ getWindowStorage as Xr \} from "\.\.\/view-tabs\/shared-0-DDOOdL6P\.js";/);
  assert.match(generated('owner-resize-observer.mjs'), /getResizeObserverClass as gf/);
  // The branch chip's head / tail split (c96d752d0 pL) is code-current environment-name-parts (3.6556.2, one copy, D1).
  const chip = manifest.modules.find(m => m.target === 'branch-chip.mjs');
  assert.ok(!chip.bindings.some(b => b.name === 'pL'));
  assert.deepEqual(chip.imports.filter(i => i.local === 'pL').map(i => [i.from, i.name, i.via]),
    [['../code-current/environment-name-parts.mjs', 'environmentNameParts', 'c96d752d0-CWv_7-n9.js:pL']]);
  // Contexts and stores downstream generators must share are published by (file, local).
  for (const [name, file, local] of [['RailFlatContext', 'shared-18-D3y8YMFN.js', 'Dx'], ['BranchChipFaceContext', 'c96d752d0-CWv_7-n9.js', 'mL'],
    ['ChangesRowLayoutContext', 'c96d752d0-CWv_7-n9.js', 'hL'], ['RailSessionKeyContext', 'c227f4d5e-B-FYKrwT.js', 'c6'],
    ['railSectionsStore', 'c227f4d5e-B-FYKrwT.js', 'x6'], ['sessionRailShownStore', 'shared-20-mUr7IqZY.js', 'Ah'], ['RailCard', 'c73f45bc3-B7hbL7H9.js', 'xx'],
    ['RailPluginSectionsContext', 'c73f45bc3-B7hbL7H9.js', 'ox'], ['SessionRailToggle', 'cc43287c9-Me-M2ucD.js', 'TH'],
    ['useRailShown', 'cc43287c9-Me-M2ucD.js', 'HH'], ['RailWorktreeMark', 'c227f4d5e-B-FYKrwT.js', 'JB'], ['RAIL_SECTION_IDS', 'c68c4283d-CWbOoVxS.js', 'g']])
    assert.deepEqual([manifest.publicNames[name]?.file, manifest.publicNames[name]?.local], [file, local], name);
  assert.deepEqual(manifest.modules.find(m => m.target === 'rail-layout.mjs').contexts, ['Dx', 'gb', '_b']);
  assert.deepEqual(manifest.modules.find(m => m.target === 'rail-shell.mjs').contexts, ['NH']);
  assert.equal(manifest.callSites.length, 8);
  for (const role of ['Code session view rail state machine (host: SR-7)', 'Session pane titlebar: rail toggle placement and fold into the ⋮ menu (host: SR-6)'])
    assert.ok(manifest.callSites.some(site => site.role === role && site.loose), role);
  // E13 / D17: no GrowthBook key and no telemetry event in the kit output (the gate and the loggers are host adapters).
  for (const m of manifest.modules) assert.doesNotMatch(generated(m.target), /cai_epitaxy_worktree|claudeai_cc_epitaxy|claudeai\.epitaxy|claudeai\.code\./, m.target);
});

const render = node => renderToStaticMarkup(node);

test('JB (RailWorktreeMark): the three pending states and the plain "Worktree" mark, with the hint wrapper', () => {
  const { RailWorktreeMark } = Rows;
  const preparing = render(h(RailWorktreeMark, { wordId: 'w1', pending: 'preparing' }));
  assert.match(preparing, /<span data-rail-worktree="preparing" class="text-muted-as-secondary">Preparing worktree…<\/span>/);
  // 3.6556.2: the mark lost its pe-xs (the rail row supplies the end padding).
  assert.match(preparing, /^<span class="flex shrink-0 items-center gap-sm ps-sm text-footnote text-secondary">/);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', pending: 'ready' })), /data-rail-worktree="ready"[^>]*>Worktree on edit</);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', pending: 'notEntered' })), /data-rail-worktree="notEntered"[^>]*>Not in worktree</);
  const plain = render(h(RailWorktreeMark, { wordId: 'w1' }));
  assert.match(plain, /<span id="w1">Worktree<\/span>/);
  assert.doesNotMatch(plain, /data-rail-worktree/);
  assert.match(render(h(RailWorktreeMark, { wordId: 'w1', changed: true })), /<span id="w1" class="text-accent">Worktree<\/span>/);
  const hinted = render(h(RailWorktreeMark, { wordId: 'w1', hint: '/repo/.claude/worktrees/a' }));
  assert.match(hinted, /data-cds-disabled-reason-wrapper=""/);
  assert.match(hinted, /shrink-0 rounded focus-visible:outline-hidden focus-visible:shadow-focus/);
  assert.match(hinted, /\/repo\/\.claude\/worktrees\/a/);
  const trailing = render(h(RailWorktreeMark, { wordId: 'w1' }, h('b', null, 'x')));
  assert.match(trailing, /Worktree<\/span><b>x<\/b><\/span>$/);
});

test('row primitives: folder row (Folder / BookClosed), read-only row with flush start (--cds-outset-x), separator, icon box', () => {
  const { RailFolderRow, RailRow, RailRowSeparator, RAIL_ICON_BOX_CLASS, RAIL_ROW_CLASS, RAIL_ROW_BUTTON_CLASS } = Rows;
  assert.equal(Tokens.cdsTokens.pad.md.cssVar, 'var(--cds-pad-md)');
  const folder = render(h(RailFolderRow, { interactive: false }, 'claude-ui-lab'));
  assert.match(folder, new RegExp(`^<div class="${attr(RAIL_ROW_CLASS)}"><span class="${attr(RAIL_ICON_BOX_CLASS)}">`));
  assert.match(folder, /--cds-outset-x:var\(--cds-pad-md\)/);
  assert.match(folder, /class="flex min-w-0 flex-1 items-center text-primary ms-outset"/);
  assert.match(folder, /claude-ui-lab/);
  // C1-7: the folder icon is BookClosed (cccebaa3a) when the session has a repository. The CDS icon glyph is not an
  // SSR attribute, so the pick is checked on the module: the name the row hands to its icon.
  assert.equal(Icons.RAIL_REPO_ICON, 'BookClosed');
  const pick = generated('rail-rows.mjs').match(/repository: n,[\s\S]*?n !== void 0 && n \? (\w+) : "Folder";/)?.[1];
  assert.match(generated('rail-rows.mjs'), new RegExp(`RAIL_REPO_ICON as ${pick}\\b`));
  const interactive = render(h(RailFolderRow, { interactive: true }, h('button', null, 'pick')));
  assert.match(interactive, /\[&amp;&gt;button\]:ps-8/);
  assert.match(interactive, /aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-xs"/);
  assert.equal(render(h(RailRowSeparator)), '<span aria-hidden="true" class="shrink-0 text-muted-as-secondary">·</span>');
  assert.match(render(h(RailRow, { icon: 'Folder' }, 'x')), /class="flex min-w-0 flex-1 items-center text-primary"/);
  assert.ok(RAIL_ROW_BUTTON_CLASS.startsWith(RAIL_ROW_CLASS));
});

test('Kx / qx: the fit thresholds 611 (alone) and 771 (beside a pane)', () => {
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
  // Zx (flat): a model / mode / permissions / effort request with no picker row is released; context stays.
  const store = { state: { pickerRowMounted: false, openComposerMenu: null }, getState() { return this.state; }, setState(patch) { this.state = { ...this.state, ...patch }; } };
  const effort = { menu: 'effort' }; store.state.openComposerMenu = effort;
  Layout.releaseFlatComposerMenu(store, effort);
  assert.equal(store.state.openComposerMenu, null);
  const context = { menu: 'context' }; store.state.openComposerMenu = context;
  Layout.releaseFlatComposerMenu(store, context);
  assert.equal(store.state.openComposerMenu, context);
});

test('section rules: environment never hides, progress is always off, settings / usage are off when flat (D10), plugin ids', () => {
  const { RAIL_SECTION_IDS, railHideableSections, railSectionExcluded, railSectionHidden, railSectionOrder, railSectionsCustomized,
    RAIL_SECTIONS_FOLDED_BY_DEFAULT, isRailPluginSection } = Sections;
  assert.deepEqual(RAIL_SECTION_IDS, ['environment', 'goal', 'settings', 'context', 'usage', 'connectors', 'progress', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.deepEqual(railHideableSections(true), ['goal', 'context', 'connectors', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.deepEqual(railHideableSections(false), ['goal', 'settings', 'context', 'usage', 'connectors', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.equal(railSectionExcluded('progress', false), true);
  assert.equal(railSectionExcluded('usage', true), true);
  assert.equal(railSectionExcluded('usage', false), false);
  assert.equal(railSectionHidden({ hidden: ['environment'] }, 'environment'), false);
  assert.equal(railSectionHidden({ hidden: ['outputs'] }, 'outputs'), true);
  // 3.6556.2 o6: Background tasks starts open (2.42304.0 kZ folded it too).
  assert.deepEqual(RAIL_SECTIONS_FOLDED_BY_DEFAULT, ['connectors', 'context', 'usage']);
  assert.equal(isRailPluginSection('plugin:x'), true);
  assert.equal(isRailPluginSection('outputs'), false);
  // k6: a saved order that knows backgroundTasks but not servers gets servers right before it (the 2.42304.0 one-argument
  // call the rail view still makes works the same).
  const order = railSectionOrder(['backgroundTasks', 'environment']);
  assert.ok(order.indexOf('servers') === order.indexOf('backgroundTasks') - 1);
  // A6 (3.6556.2): (state, session key, flat, plugin ids); startsOpen and the session's folds count as customized.
  const state = { hidden: [], order: [], startsOpen: {}, foldsBySession: {} };
  assert.equal(railSectionsCustomized(state, 'session-a', true), false);
  assert.equal(railSectionsCustomized({ ...state, hidden: ['outputs'] }, 'session-a', true), true);
  assert.equal(railSectionsCustomized({ ...state, startsOpen: { context: true } }, 'session-a', true), true);
});

test('stores: epitaxy.sessionRailSections and persisted.epitaxy.sessionRailShown persist through the guarded localStorage', () => {
  const { railSectionsStore, railSectionOpen } = Sections;
  assert.equal(railSectionsStore.persist.getOptions().name, 'epitaxy.sessionRailSections');
  const s = railSectionsStore.getState();
  assert.equal(railSectionOpen(s, 'session-a', 'outputs'), true, 'open unless folded');
  assert.equal(railSectionOpen(s, 'session-a', 'backgroundTasks'), true, '3.6556.2: open by default');
  assert.equal(railSectionOpen(s, 'session-a', 'context'), false, 'folded by default');
  s.setOpen('session-a', 'outputs', false);
  s.setOpen('session-a', 'context', true);
  assert.deepEqual(railSectionsStore.getState().foldsBySession['session-a'], { collapsed: ['outputs'], expanded: ['context'] });
  // C1-4 setOpenByHand: a trigger press also records how the section starts in other sessions.
  railSectionsStore.getState().setOpenByHand('session-b', 'servers', false);
  assert.equal(railSectionOpen(railSectionsStore.getState(), 'session-c', 'servers'), false, 'starts closed elsewhere');
  railSectionsStore.getState().setHidden('servers', true);
  railSectionsStore.getState().setOrder(['servers', 'nope', 'environment', 'servers']);
  assert.deepEqual(railSectionsStore.getState().order, ['servers', 'environment']);
  const saved = JSON.parse(storage.get('epitaxy.sessionRailSections'));
  assert.deepEqual(saved.state, { foldsBySession: { 'session-a': { collapsed: ['outputs'], expanded: ['context'] }, 'session-b': { collapsed: ['servers'], expanded: [] } },
    startsOpen: { servers: false }, hidden: ['servers'], order: ['servers', 'environment'] });
  railSectionsStore.getState().resetSections('session-a');
  const reset = railSectionsStore.getState();
  assert.deepEqual([reset.hidden, reset.order, reset.startsOpen, reset.foldsBySession['session-a']], [[], [], {}, undefined]);

  const { sessionRailShownStore, selectRailShown } = Shown;
  assert.deepEqual([sessionRailShownStore.persist.getOptions().name, sessionRailShownStore.persist.getOptions().version], ['persisted.epitaxy.sessionRailShown', 1]);
  assert.equal(selectRailShown(sessionRailShownStore.getState()), true, 'shown by default');
  sessionRailShownStore.getState().setShown(false);
  assert.deepEqual(JSON.parse(storage.get('persisted.epitaxy.sessionRailShown')), { state: { shown: false }, version: 1 });
  sessionRailShownStore.getState().setShown(true);
});

test('TH (SessionRailToggle): aria-label "Session rail", Show / Hide tooltip, pressed, flat accent, aria-expanded only with overlay semantics', () => {
  const { SessionRailToggle } = Shell;
  const off = render(h(SessionRailToggle, { model: { onScreen: false, raises: false, panelId: 'p1', onToggle() {} } }));
  // C1-14: the label is fixed; Show / Hide session rail is the tooltip content.
  assert.match(off, /aria-label="Session rail"/);
  assert.doesNotMatch(off, /aria-label="(Show|Hide) session rail"/);
  assert.doesNotMatch(off, / aria-expanded="/);
  assert.doesNotMatch(off, / aria-controls="/);
  assert.match(off, /--cds-bg-accent:var\(--cds-fill-ghost-selected\)/, 'flat (D10): SH');
  assert.match(off, /data-cds="Button"/);
  const on = render(h(SessionRailToggle, { model: { onScreen: true, raises: false, panelId: 'p1', onToggle() {} } }));
  assert.match(on, /aria-pressed="true"/);
  assert.doesNotMatch(on, / aria-expanded="/);
  const raised = render(h(SessionRailToggle, { model: { onScreen: true, raises: true, panelId: 'p1', onToggle() {} } }));
  assert.match(raised, /aria-expanded="true"/);
  assert.match(raised, /aria-controls="p1"/);
  const closed = render(h(SessionRailToggle, { model: { onScreen: false, raises: true, panelId: 'p1', onToggle() {} } }));
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, / aria-controls="/);
  // `unseen` (new): the button is inert and transparent.
  const unseen = render(h(SessionRailToggle, { model: { onScreen: false, raises: false, panelId: 'p1', onToggle() {} }, unseen: true }));
  assert.match(unseen, /opacity:0/);
  assert.match(unseen, / inert=""/);
  // EH: no region registry here, so the opener renders nothing on or off screen.
  assert.equal(render(h(Shell.SessionRailOpener, { model: { onScreen: false, onToggle() {} }, scopeRef: { current: null } })), '');
});

test('hH / AH: the docked column (data-epitaxy-rail-column) and the overlay (Session details) mount the host rail content', () => {
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
  assert.equal(render(h(Adapters.LazySessionRailHost, props)), '');
});

test('the overlay helpers: DH layers, the wheel hand-off and the shown store context (split-window map unused by the host)', () => {
  const node = (parent, extra = {}) => ({ parentNode: parent, contains(other) { for (let at = other; at; at = at.parentNode) if (at === this) return true; return false; }, ...extra });
  const body = node(null); const doc = { body }; body.ownerDocument = doc;
  const layerA = node(body), layerB = node(body), inA = node(layerA), inB = node(layerB);
  for (const n of [layerA, layerB, inA, inB]) n.ownerDocument = doc;
  assert.equal(Shell.outsideLayer(inB, inA), true);
  assert.equal(Shell.outsideLayer(node(inA, { ownerDocument: doc }), inA), false);
  assert.equal(Shell.outsideLayer(body, inA), false);
  // Rows.forwardWheel (c227f4d5e kH): the wheel goes to the target scroller, line / page modes scaled.
  const calls = [];
  const target = { ownerDocument: { defaultView: { WheelEvent: class { constructor(type, init) { Object.assign(this, { type, ...init }); } } } },
    dispatchEvent: e => calls.push(['dispatch', e.type, e.deltaY]), scrollBy: o => calls.push(['scrollBy', o.top, o.left]) };
  Rows.forwardWheel(target, { deltaX: 0, deltaY: 3, deltaMode: 1 });
  assert.deepEqual(calls, [['dispatch', 'wheel', 3], ['scrollBy', 48, 0]]);
  Rows.forwardWheel(target, { ctrlKey: true, deltaY: 3 });
  assert.equal(calls.length, 2, 'pinch zoom is not forwarded');
  // HH reads the provided store: FH's non-persisted store starts hidden; the default context reads the persisted one.
  let read;
  const Probe = () => { read = Shell.useRailShown(); return null; };
  render(h(Shell.RailShownStoreProvider, null, h(Probe)));
  assert.equal(read.shown, false);
  render(h(Probe));
  assert.equal(read.shown, true, 'default: the persisted store (shown)');
  // The split-window map needs the pane layout store, which this host does not have (adapter: no panes, no change).
  assert.deepEqual(Adapters.panesOfMode(Adapters.paneLayoutStore.getState(), 'code'), []);
  assert.equal(typeof Adapters.paneLayoutStore.subscribe(() => {}), 'function');
});

test('c96d752d0 gL (BranchChip): mono face by default, sans from the context, head / tail split for long names', () => {
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
  assert.match(long, / aria-haspopup="menu"[^>]* aria-expanded="false"/, 'the chip is the menu trigger');
  const accent = render(h(BranchChip, { branchName: 'main', accent: 'purple' }));
  assert.match(accent, /text-git-merged/);
  assert.equal(React.version.split('.')[0], '19');
  let layout;
  const Probe = () => { layout = React.useContext(ChangesRowLayoutContext); return null; };
  render(h(Probe));
  assert.equal(layout, 'stacked');
});

test('c73f45bc3 xx (RailCard): the section, its header div, the rotate caret and the excluded sections', () => {
  const { RailCard, RAIL_SECTION_TITLES, railSectionTitle } = Card;
  const html = render(h(RailCard, { id: 'outputs', title: 'Outputs', summary: '3' }, h('p', null, 'body')));
  assert.match(html, /^<section data-rail-section="" aria-labelledby="(_R_\w+_)" data-open="" data-cds="Collapsible" class="group\/railcard flex shrink-0 flex-col py-md rounded-card shadow-card-ring \[\[data-session-rail-flat\]_&amp;\]:rounded-none/);
  assert.match(html, /<div class="group\/railtop relative flex min-h-6\.5 min-w-0 items-center gap-xs px-md"/);
  assert.match(html, /<button type="button" data-panel-open="" [^>]*aria-expanded="true"/, 'open unless folded');
  assert.match(html, /data-rail-panel="" class="[^"]*epitaxy-rail-panel"><div class="flex flex-col px-md"><p>body<\/p><\/div>/);
  // C1-1: the header is a div (no h3), its trigger lost group/railhead.
  assert.match(html, /<div id="[^"]+" class="flex min-w-0 flex-1 rounded group-data-\[rail-menu-open\]\/railtop:bg-alpha-1">/);
  assert.doesNotMatch(html, /<h3|group\/railhead|rotate-90/);
  assert.match(html, / flex min-h-6\.5 w-full min-w-0 items-center gap-1 px-xs text-footnote-medium text-primary"/);
  assert.match(html, /<span class="shrink-0">Outputs<\/span>/);
  // C1-2: the open caret is Icon rotate 90 (data-cds-rotate, --cds-icon-rotate).
  assert.match(html, /data-cds-rotate=""/);
  assert.match(html, /--cds-icon-rotate:90deg/);
  assert.match(html, /<span aria-hidden="true" class="ms-auto min-w-0 truncate ps-sm text-footnote font-normal text-muted-as-secondary invisible">3<\/span>/, 'the summary hides while open');
  // C1-3: with a grip handle the trigger holds the grab layer and the grip itself takes no pointer.
  const handle = { attributes: { 'aria-roledescription': 'sortable' }, listeners: {}, attachActivator() {} };
  const gripped = render(h(Card.RailCardGripContext.Provider, { value: handle }, h(RailCard, { id: 'outputs', title: 'Outputs' }, 'x')));
  assert.match(gripped, /<span aria-hidden="true" data-rail-grab="" class="absolute inset-y-0 end-0 w-20 cursor-grab touch-none active:cursor-grabbing"><\/span>/);
  assert.match(gripped, /data-rail-grip="" aria-label="Reorder Outputs" class="group\/railgrip pointer-events-none /);
  assert.equal(render(h(RailCard, { id: 'progress', title: 'Progress' })), '');
  assert.equal(render(h(Layout.RailFlatContext.Provider, { value: true }, h(RailCard, { id: 'usage', title: 'Usage' }))), '');
  assert.notEqual(render(h(RailCard, { id: 'usage', title: 'Usage' })), '');
  assert.equal(RAIL_SECTION_TITLES.pullRequests.defaultMessage, 'Changes');
  assert.equal(railSectionTitle({ formatMessage: m => m.defaultMessage }, 'backgroundTasks'), 'Background tasks');
  assert.equal(Card.useRailFlat.length, 0);
});
