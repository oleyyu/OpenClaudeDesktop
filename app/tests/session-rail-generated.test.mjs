// R4f-rail SR-2: the Code session rail's view (cf74bc599 Zj / Gj / sj and the cards) and its pure derivations,
// generated from the Claude Desktop 3.6556.2 originals into src/generated/session-rail (scripts/extract-session-rail.mjs;
// w5-session-rail-gen moved it from 2.42304.0: iD→Zj, rD→Gj, DE→sj, wE→ij, gD→uM, lD→rM, TD→xM, xE→$A …).
// Source/AST pins, Vite SSR renders over fixtures and the pure functions driven directly: no browser, no Electron, no
// network, no real storage (a Map-backed localStorage stub), no external process.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionRail, unlistedSlices } from '../scripts/extract-session-rail.mjs';

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-rail');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const render = node => renderToStaticMarkup(node);
const RAIL = 'cf74bc599-CRYqipWN.js';
const DND = 'c09f6b4e5-CLm8I7_i.js';

const storage = new Map();
const localStorageStub = {
  getItem: key => (storage.has(key) ? storage.get(key) : null), setItem: (key, value) => { storage.set(key, String(value)); },
  removeItem: key => { storage.delete(key); }, key: index => [...storage.keys()][index] ?? null, clear: () => storage.clear(),
  get length() { return storage.size; },
};
let previousWindow, previousDocument;
let server, View, Derive, Hooks, Dnd, MenuItems, Chip, Layout, Sections, Kit, Adapters, FileAccess, Query, GitKey, ViewTabs;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); dnd-kit reads window.document.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: localStorageStub, matchMedia: undefined, document: globalThis.document };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = name => server.ssrLoadModule(`/src/generated/session-rail/${name}`);
  [View, Derive, Hooks, Dnd, MenuItems, Chip] = await Promise.all(['rail-view.mjs', 'rail-derive.mjs', 'rail-hooks.mjs', 'dnd-kit.mjs', 'menu-items.mjs', 'repo-name-chip.mjs'].map(load));
  [Layout, Sections, Kit] = await Promise.all(['rail-layout.mjs', 'rail-sections-store.mjs', 'branch-chip.mjs'].map(name => server.ssrLoadModule(`/src/generated/session-rail-kit/${name}`)));
  Adapters = await server.ssrLoadModule('/src/source-session-rail-adapters.jsx');
  FileAccess = await server.ssrLoadModule('/src/generated/r3b-transcript/session-file-access.mjs');
  Query = await server.ssrLoadModule('/src/generated/files-changes/file-browser-query.mjs');
  GitKey = await server.ssrLoadModule('/src/generated/files-changes/git-info-key.mjs');
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

// ---- fixtures: the `session` prop fO builds (Pe), as SR-7's host assembler will build it from host data ----
const environment = { label: 'This Mac', kind: 'Local session' };
const localSession = { environment, folder: { name: 'repo', path: '/Users/me/repo' }, extraFolders: [], branch: { name: 'main' }, worktree: null,
  startedWithWorktree: false, worktreeRemoved: false, worktreePending: undefined, goal: null, isLocal: true };
const worktreePath = '/Users/me/repo/.claude/worktrees/feat';
const worktreeSession = { ...localSession, folder: { name: 'repo', path: worktreePath, basePath: '/Users/me/repo' }, branch: { name: 'claude/feat' },
  worktree: { name: 'feat', path: worktreePath }, startedWithWorktree: true };
const flat = node => h(Layout.RailFlatContext.Provider, { value: true }, node);
// zustand's useStore renders the store's initial state on the server (useSyncExternalStore's server snapshot is
// getInitialState()). To render a state reached through the store's own API, the server snapshot reads the live state for
// the duration of `run` (the initial state object takes the live values and gets its own back; the generated code is untouched).
function withLiveSnapshot(store, run) {
  const initial = store.getInitialState();
  const saved = { ...initial };
  const live = render => { Object.assign(initial, store.getState()); return render(); };
  try {
    return run(live);
  } finally {
    for (const key of Object.keys(initial)) delete initial[key];
    Object.assign(initial, saved);
    store.getState().resetSections?.();
  }
}
const rail = (props, { isFlat = true } = {}) => {
  const node = h(View.SessionRail, { plan: [], artifacts: [], ...props });
  return render(isFlat ? flat(node) : node);
};

test('generator: the originals still match 3.6556.2 and src/generated/session-rail is current', async () => {
  const checked = await extractSessionRail({ check: true });
  assert.equal(checked.referenceVersion, '3.6556.2');
  assert.equal(checked.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807', 'E6');
  // R1: the release constants come from official-3.6556.2.mjs; no 2.42304.0 chunk is read any more.
  const generator = fs.readFileSync(path.join(app, 'scripts/extract-session-rail.mjs'), 'utf8');
  assert.match(generator, /import \* as official from '\.\/official-3\.6556\.2\.mjs';/);
  assert.equal(occurrences(generator, 'D9NZWRyl'), 0);
  for (const m of checked.modules) assert.equal(m.referenceVersion, '3.6556.2', m.target);
  // E34 / wave 7: the frozen 2.42304.0 view transcript-rows linked through is gone (transcript-rows is on 3.6556.2).
  assert.equal(manifest.legacy, undefined);
  assert.equal(fs.existsSync(path.join(app, 'scripts/session-rail-legacy-2.42304.0.json')), false);
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-session-rail.mjs')), true, 'prepare-ui verifies it (D0)');
});

// One copy: a binding another importable area slices is imported from there (its root re-exported under this area's
// public name); a second slice is allowed only where `duplicates` says why it is harmless.
test('one copy rule: a binding another area also slices is refused unless duplicates names it', () => {
  const at = (area, target) => ({ area, target });
  assert.deepEqual(unlistedSlices('shared-25-DOWZRSlq.js:IH', [at('session-rail-sections', 'stable-value.mjs')]), ['session-rail-sections/stable-value.mjs']);
  for (const key of ['c96d752d0-CWv_7-n9.js:vke', 'c96d752d0-CWv_7-n9.js:uL', 'c73f45bc3-B7hbL7H9.js:sx', 'c73f45bc3-B7hbL7H9.js:dx', 'shared-78-D5Fw2h0a.js:w4'])
    assert.deepEqual(unlistedSlices(key, [at('anywhere', 'x.mjs')]), [], key);
  const source = fs.readFileSync(path.join(app, 'scripts/extract-session-rail.mjs'), 'utf8');
  assert.equal(occurrences(source, 'const copiedLater'), 0);
  // Not one binding of this area is also sliced by sidebar-reorder or routines-shared (3.6556.2).
  const generatedRoot = path.join(app, 'src/generated');
  const mine = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name ?? b}`)));
  for (const area of ['routines-shared', 'sidebar-reorder', 'session-rail-sections', 'session-rail-context']) {
    const other = JSON.parse(fs.readFileSync(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    for (const m of other.modules) for (const b of m.bindings ?? [])
      assert.equal(mine.has(`${path.basename(m.source)}#${b.name ?? b}`), false, `${area}/${m.target} ${b.name ?? b}`);
  }
  // Roots another area slices and exports are imports of that copy, re-exported under the same public names.
  const reexports = manifest.modules.filter(m => m.target !== 'dnd-kit.mjs') // dnd-kit's 13 roots: checked with the card stack below
    .flatMap(m => m.imports.filter(i => i.reexport).map(i => `${m.target}:${i.local}<-${i.kind}:${i.name}`));
  assert.deepEqual(reexports.sort(), [
    // connector-name's eB / BP (shared-78 connector naming, with UP under eB) and saved-output's zA (shared-130) are
    // cowork-progress's one copy since W13 (D1, w13-close-rail-regen); that slice imports only mcp-app-card's shared-78
    // (qz, published there by w13-close-gen-dedup), so no Cowork host adapter enters the rail graph (E41). qz itself is
    // mcp-app-card's one copy.
    // coachmark.mjs's Sj (the CDS coachmark, cwui-46) is cowork-scheduled's one copy.
    'coachmark.mjs:Sj<-cowork-scheduled:Sj',
    'connector-name.mjs:BP<-cowork-progress:BP', 'connector-name.mjs:eB<-cowork-progress:eB', 'connector-name.mjs:qz<-mcp-app-card:claudeInChromeServerName',
    'drag-click-guard.mjs:tM<-sidebar-reorder:suppressClickAfterDrag','environment-target.mjs:S<-code-current:splitEnvironmentSettings', 'plugin-connector.mjs:Ro<-mcp-app-card:ix',
    // plugin-connector's hJ (and the mJ under it) is cowork-home's one shared-52 copy (D1, w11-sweep-ccres).
    'plugin-connector.mjs:hJ<-cowork-home:hJ',
    // saved-output's WV (shared-130, exported pathFileName) is code-current file-output-paths' outputBasename (cc-rest-files),
    // and since w12-viewtabs its UV (forwardSlashes) is that module's forwardSlashes too (D1: one copy of shared-130 UV).
    'saved-output.mjs:UV<-code-current:forwardSlashes', 'saved-output.mjs:WV<-code-current:outputBasename', 'saved-output.mjs:zA<-cowork-progress:zA']);
  assert.match(generated('connector-name.mjs'), /import \{ eB, BP \} from "\.\.\/cowork-progress\/shared-78-D5Fw2h0a\.mjs";/);
  assert.match(generated('connector-name.mjs'), /import \{ claudeInChromeServerName as qz \} from "\.\.\/mcp-app-card\/shared-78\.mjs";/);
  assert.equal(occurrences(generated('connector-name.mjs'), 'function UP('), 0);
  assert.deepEqual(fs.readFileSync(path.join(generatedRoot, 'cowork-progress/shared-78-D5Fw2h0a.mjs'), 'utf8').match(/^import .*$/gm),
    ['import { claudeInChromeServerName as qz } from "../mcp-app-card/shared-78.mjs";']);
  assert.match(generated('drag-click-guard.mjs'), /import \{ suppressClickAfterDrag as tM \} from "\.\.\/sidebar-reorder\/reorder-support\.mjs";/);
  assert.equal(occurrences(generated('drag-click-guard.mjs'), 'function tM('), 0);
  // shared-25 UH / DG / kG are sliced here (turn-box, which held their 2.42304.0 copies, is still 2.42304.0); the stable
  // value hook IH under UH is session-rail-sections' one copy.
  const stable = manifest.modules.find(m => m.target === 'stable-array.mjs');
  assert.deepEqual(stable.bindings.map(b => b.name ?? b).sort(), ['BH', 'DG', 'HH', 'TG', 'UH', 'kG', 'wG']);
  assert.match(generated('stable-array.mjs'), /import \{ useStableValue as IH \} from "\.\.\/session-rail-sections\/stable-value\.mjs";/);
  assert.match(generated('stable-array.mjs'), /export \{ UH as useStableArray, DG as stripInvisible, kG as displayPath \};/);
});

test('feature strings: each pinned string is in the original chunk (counted) and in the generated module', () => {
  const pins = [
    [RAIL, 'Session details', 1, 'rail-view.mjs'], [RAIL, 'Draggable section', 1, 'rail-view.mjs'],
    [RAIL, 'To pick up a section, press Space or Enter', 1, 'rail-view.mjs'], [RAIL, 'Picked up {name}', 1, 'rail-view.mjs'],
    [RAIL, 'Moving {name} was cancelled.', 1, 'rail-view.mjs'],
    [RAIL, 'Claude is reading from {folder} on {branch}', 1, 'rail-view.mjs'], [RAIL, 'Claude hasn\\u2019t moved to this session', 1, 'rail-view.mjs'],
    [RAIL, 'Working folder', 1, 'rail-view.mjs'], [RAIL, 'Additional folder', 2, 'rail-view.mjs'], [RAIL, 'Choose folder\\u2026', 1, 'rail-view.mjs'],
    [RAIL, 'Manage connectors', 1, 'rail-view.mjs'], [RAIL, '{count} to reconnect', 1, 'rail-view.mjs'], [RAIL, 'NM9g1WPqsR', 1, 'rail-view.mjs'],
    [RAIL, 'ZHe7cLKE7v', 1, 'rail-view.mjs'], [RAIL, 'ohKjpG6KDI', 1, 'rail-view.mjs'],
    [RAIL, 'data-rail-card', 1, 'rail-view.mjs'], [RAIL, 'data-rail-slot-off', 1, 'rail-view.mjs'], [RAIL, '{server} image', 1, 'rail-view.mjs'],
    // C1-5: the engine plugin rail pane (Close, rbrahOGMC3) and C1-6: the Save link in the mark slot (ps-xs).
    [RAIL, 'rbrahOGMC3', 1, 'rail-view.mjs'], [RAIL, 'flex max-w-40', 1, 'rail-view.mjs'], [RAIL, 'flex shrink-0 ps-xs', 2, 'rail-view.mjs'],
    [RAIL, 'has-[[data-epitaxy-branch-row-ghost]]:flex', 1, 'rail-derive.mjs'], [RAIL, '"sshConnectionRemoved"', 1, 'rail-derive.mjs'],
    [RAIL, 'EpitaxySessionRailHost', 1, null],
    // dnd-kit's text lives in its one copy, sidebar-reorder/dnd-kit.mjs.
    [DND, 'DndDescribedBy', 1, '../sidebar-reorder/dnd-kit.mjs'], [DND, 'translate3d(', 1, '../sidebar-reorder/dnd-kit.mjs'],
  ];
  for (const [file, needle, count, target] of pins) {
    assert.equal(occurrences(raw(file), needle), count, `${file}: ${needle}`);
    if (target === null) continue;
    const text = generated(target);
    const unescaped = needle.replace('\\u2019', '’').replace('\\u2026', '…');
    assert.ok(text.includes(needle) || text.includes(unescaped), `${target}: ${needle}`);
  }
  // The generated modules carry the original text: Gj's aside and sj's announcements, verbatim.
  assert.match(generated('rail-view.mjs'), /onMouseDownCapture: op,\n\s+onClickCapture: op,\n\s+onDoubleClickCapture: op,/);
  assert.match(generated('rail-view.mjs'), /"\{name\} dropped at section \{position\} of \{count\}\."/);
  // E37: the rail itself renders no CDS Toolbar (cf74bc599 has none); the pane titles that use it are another area's.
  assert.equal(occurrences(raw(RAIL), '"data-cds":"Toolbar"'), 0);
  for (const m of manifest.modules) assert.ok(!m.imports.some(i => i.name === 'CdsToolbar'), m.target);
});

test('one copy: view-tabs and the kit by public names, dnd-kit and the rail contexts sliced only here', () => {
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const kit = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/session-rail-kit/manifest.json'), 'utf8'));
  const published = new Set(Object.keys(viewTabs.publicNames)), kitNames = new Set(Object.keys(kit.publicNames));
  for (const m of manifest.modules) for (const i of m.imports) {
    assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
    if (i.kind === 'view-tabs') assert.ok(published.has(i.name), `${m.target} imports view-tabs ${i.name}`);
    if (i.kind === 'session-rail-kit') assert.ok(kitNames.has(i.name), `${m.target} imports kit ${i.name}`);
    assert.ok(!/code-composer|landing-texture/.test(i.from), `${m.target}: ${i.from} (composer-owned)`);
  }
  // The rail view reads the kit's contexts, store and components (SR-1), never a second slice of them.
  const view = manifest.modules.find(m => m.target === 'rail-view.mjs');
  const kitImport = local => view.imports.find(i => i.local === local);
  for (const [local, name] of [['wi', 'RailFlatContext'], ['Uf', 'RailSessionKeyContext'], ['Yf', 'railSectionsStore'], ['N_', 'RailCard'], ['W_', 'RailCardGripContext'],
    ['Kl', 'BranchChipFaceContext'], ['Ds', 'ChangesRowLayoutContext'], ['dc', 'BranchChip'], ['kp', 'RailWorktreeMark'], ['E_', 'RailPluginSectionsContext']])
    assert.deepEqual([kitImport(local)?.kind, kitImport(local)?.name], ['session-rail-kit', name], local);
  // React Compiler helpers by their E3 semantic names from view-tabs' shared-frame (R3), never a second copy.
  for (const m of manifest.modules) for (const i of m.imports.filter(i => /^(J[0-9]|K[0-5]|I[1-5]|Z[1-5])$/.test(i.local)))
    assert.deepEqual([i.kind, i.from], ['view-tabs', '../view-tabs/shared-frame-6jtSkIit.js'], `${m.target}: ${i.local}`);
  assert.ok(view.imports.some(i => i.local === 'J9' && i.name === 'reactMemoCache'));
  // dnd-kit (c09f6b4e5) has one copy, sidebar-reorder's byte-for-byte chunk copy (enum and activator
  // initialisers included); no other area holds it, and this area's dnd-kit.mjs only re-exports its 13 roots from there.
  for (const area of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (area === 'session-rail' || area === 'sidebar-reorder') continue;
    const file = path.join(app, 'src/generated', area, 'manifest.json');
    if (fs.existsSync(file)) assert.ok(!fs.readFileSync(file, 'utf8').includes('c09f6b4e5'), `${area} slices dnd-kit`);
  }
  const reorder = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/sidebar-reorder/manifest.json'), 'utf8'));
  assert.deepEqual(reorder.modules.filter(m => m.source === DND).map(m => [m.target, m.kind]), [['dnd-kit.mjs', 'copy']]);
  const dnd = manifest.modules.find(m => m.target === 'dnd-kit.mjs');
  assert.deepEqual(dnd.bindings, [], 'no second slice of dnd-kit');
  assert.equal(dnd.imports.length, 13);
  for (const i of dnd.imports) assert.deepEqual([i.from, i.kind, i.reexport], ['../sidebar-reorder/dnd-kit.mjs', 'sidebar-reorder', true], i.local);
  const copy = fs.readFileSync(path.join(app, 'src/generated/sidebar-reorder/dnd-kit.mjs'), 'utf8');
  assert.equal(occurrences(copy, 'e.Space="Space"'), 1);
  assert.equal(occurrences(copy, 'rt.activators=['), 1);
  assert.equal(occurrences(generated('dnd-kit.mjs'), 'function '), 0);
  // Contexts this area owns, each instantiated once (no other area slices them).
  const contexts = Object.fromEntries(manifest.modules.filter(m => m.contexts).map(m => [m.target, m.contexts]));
  assert.deepEqual(contexts['region-reading-order.mjs'], ['Ze']);
  assert.deepEqual(contexts['pr-count-context.mjs'], ['cL']);
  assert.deepEqual(contexts['preview-placement.mjs'], ['T']);
  assert.deepEqual(contexts['repo-name-chip.mjs'], ['uL'], 'the chip slot flag, provided by vke and read by lM (duplicates)');
  assert.ok(view.imports.some(i => i.local === 'pc' && i.from === './repo-name-chip.mjs' && i.name === 'RepoNameChipSlotContext'));
  // The CdsDropdown parts the repo menu renders are members of the view-tabs CdsDropdown, not slices.
  assert.deepEqual(manifest.modules.find(m => m.target === 'menu-items.mjs').members,
    { mT: 'GT.Separator', pT: 'GT.Submenu', fT: 'GT.SubmenuTrigger', cT: 'GT.Popup', dT: 'GT.Item' });
  // Adapters stand for these originals (each feature-checked by the generator).
  const adapted = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.original)));
  assert.deepEqual([...adapted].sort(), [`${RAIL}:KA`, `${RAIL}:SM`, `${RAIL}:ZA`, `${RAIL}:sM`, `${RAIL}:vM`, `${RAIL}:zA`,
    'c280f9bbb-CutcMso2.js:L', 'c68c4283d-CWbOoVxS.js:_f', 'c73f45bc3-B7hbL7H9.js:Vb', 'c73f45bc3-B7hbL7H9.js:du', 'c856385e2-aEyDzrcK.js:rr',
    // w10-ccres-rail-env-edit: the lazy environment dialog handles Zx preloads (null here).
    'c73f45bc3-B7hbL7H9.js:ou', 'cc5b397c6-BgWEcD7A.js:l',
    'cd0cf5b5e-BCzJmEwZ.js:z', 'cecbf1aa5-BT0v8IlE.js:l', 'shared-11-_AVGLHEz.js:_m', 'shared-4-DUB1Oi0O.js:Sk', 'shared-46-BIbZBGFq.js:IL',
    'shared-8-Db1QN4mf.js:og', 'vendor-intl-DYfox5Co.js:Gt', 'vendor-intl-DYfox5Co.js:q'].sort());
  // 3.6556.2: the skeletons, the layer-aware z-index and the text link are view-tabs' generated CDS (no stand-ins), and the
  // connector icon is mcp-app-card's one copy of shared-7 Hk.
  for (const [local, name] of [['U', 'CdsLoadingSkeleton'], ['ne', 'CdsSkeleton'], ['W', 'useCdsLayerAwareZIndex'], ['G', 'CdsTextLink']])
    assert.ok(view.imports.some(i => i.local === local && i.kind === 'view-tabs' && i.name === name), name);
  assert.ok(view.imports.some(i => i.local === 'Co' && i.from === '../mcp-app-card/shared-7.mjs'), 'shared-7 Hk (exported di)');
  // The pinned TN assembly the host replaces (SR-7) and the export of the rail host.
  const tn = manifest.callSites.find(site => site.binding === 'TN');
  for (const feature of ['K = xN(te, L?.remote),', 'pluginSections: wn,', 'Pe = L?.sshConnectionRemoved === !0,', 'openSkills: Je ? Ye : null,'])
    assert.ok(tn.features.includes(feature), feature);
  assert.ok(manifest.callSites.some(site => site.raw && site.loose && site.features.includes('LN as EpitaxySessionRailHost')));
  // Every root is pinned to its original text.
  const generator = fs.readFileSync(path.join(app, 'scripts/extract-session-rail.mjs'), 'utf8');
  for (const m of manifest.modules) for (const root of Object.keys(m.exports))
    assert.ok(generator.includes(`${root}: [`) || generator.includes(`'${root}': [`), `${m.target}: ${root} has features`);
});

test('rD: a local session — Environment card with the environment, folder chip, path tail and the sans branch chip', () => {
  const html = rail({ session: localSession, sessionKey: 'local_1' });
  assert.match(html, /^<aside aria-label="Session details" tabindex="-1" class="flex w-\[var\(--session-rail-w,17\.5rem\)\] min-h-0 flex-col font-sans outline-none">/);
  assert.match(html, /<div class="scroll-fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain \[scrollbar-width:none\] \[&amp;::-webkit-scrollbar\]:hidden flex flex-col gap-2\.5 p-px/);
  assert.match(html, /<div data-rail-card="environment" class="relative flex-col rounded-card contents has-\[\[data-rail-section\]\]:flex /);
  assert.match(html, /<span class="shrink-0">Environment<\/span>/);
  assert.match(html, /invisible group-hover\/railtop:opacity-0[^"]*">repo<\/span>/, 'vD: the summary is the folder name');
  assert.match(html, /This Mac<\/span>/);
  assert.match(html, /data-cds-disabled-reason="">Local session<\/span>/, 'the kind is the row hint');
  assert.match(html, /<span class="truncate">repo<\/span>/, 'Yz: the folder chip');
  assert.match(html, /<span class="min-w-0 truncate">~<\/span>/, 'hD: the folder parent, ~ for the home folder');
  assert.match(html, /<span dir="ltr" class="truncate">main<\/span>/, 'flat: the branch chip face is sans (no font-mono-ui)');
  assert.doesNotMatch(html, /data-rail-worktree|>Worktree</);
  assert.match(html, /aria-label="Reorder Environment"/, 'DE / wE: the card has its reorder grip');
  assert.match(html, /aria-roledescription="Draggable section"/);
  assert.match(html, /<div data-rail-card="outputs" [^>]*><\/div><div class="contents"><\/div><\/div><\/aside>$/, 'no outputs: an empty slot, then the tail slot');
  // Not flat: the chip is mono (BranchChipFaceContext default via rD's z).
  assert.match(rail({ session: localSession }, { isFlat: false }), /<span dir="ltr" class="truncate font-mono-ui">main<\/span>/);
  // JE: nothing to show and no controls renders nothing.
  assert.equal(rail({ session: { environment: null, folder: null, extraFolders: [], branch: null, worktree: null, goal: null, isLocal: true } }), '');
});

test('rD: a worktree session — the Worktree mark with its path, the base folder\'s parent, startedWithWorktree / worktreeRemoved', () => {
  const html = rail({ session: worktreeSession });
  assert.match(html, /<span>Worktree<\/span>/, 'dR without a word id or a change accent');
  assert.match(html, /data-cds-disabled-reason="">\/Users\/me\/repo\/\.claude\/worktrees\/feat<\/span>/, 'oe: the hint is the worktree path');
  assert.doesNotMatch(html, /data-rail-worktree=/, 'no pending state: the host has no lazy worktree (SR-9)');
  assert.match(html, /<span dir="ltr" class="truncate">claude\/feat<\/span>|claude\/feat/);
  assert.match(html, /<span class="min-w-0 truncate">~<\/span>/, 'gD: the path tail is the basePath\'s parent');
  // Started with a worktree that is not recorded as removed: the mark without a path.
  const started = rail({ session: { ...localSession, startedWithWorktree: true } });
  assert.match(started, />Worktree<\/span>/);
  assert.doesNotMatch(started, /data-cds-disabled-reason="">\/Users/);
  assert.doesNotMatch(rail({ session: { ...localSession, startedWithWorktree: true, worktreeRemoved: true } }), />Worktree<\/span>/);
  // The two pending hints rD formats (QE's states; unreachable here but original).
  const pending = rail({ session: { ...localSession, startedWithWorktree: true, worktreePending: { kind: 'preparing' } } });
  assert.match(pending, /data-rail-worktree="preparing"[^>]*>Preparing worktree…</);
  assert.match(pending, /Claude hasn’t moved to this session’s worktree yet\. Until it does, the folder and branch shown are your own\./);
  assert.match(pending, /min-w-0 text-muted-as-secondary/, 'the branch dims while the worktree is pending');
  const ready = rail({ session: { ...localSession, startedWithWorktree: true, worktreePending: { kind: 'ready', branch: 'claude/lazy' } } });
  assert.match(ready, /Claude is reading from \/Users\/me\/repo on main; it moves into this worktree before changing files\./);
  assert.match(ready, />claude\/lazy</, 'ae: the leased branch replaces the branch name');
});

test('rD: extra folders — Additional folder chips, a worktree extra folder with its branch row, and the folder actions', () => {
  const extra = { name: 'other', path: '/Users/me/other', cwd: '/Users/me/other' };
  const tree = { name: 'lib', path: '/Users/me/lib', cwd: '/Users/me/lib/.claude/worktrees/x', branch: 'claude/x', worktree: { name: 'x', path: '/Users/me/lib/.claude/worktrees/x' } };
  const html = rail({ session: { ...localSession, extraFolders: [extra, tree] } });
  assert.match(html, /<span class="truncate">other<\/span>/);
  assert.match(html, /<span class="truncate">lib<\/span>/);
  assert.match(html, />claude\/x</, '_D: the extra worktree\'s branch row');
  assert.match(html, /data-cds-disabled-reason="">\/Users\/me\/lib\/\.claude\/worktrees\/x<\/span>/, '_D: its Worktree mark hints the tree');
  assert.ok(occurrences(html, '>Worktree</span>') === 1, 'only the extra worktree carries a mark');
  // A worktree extra folder moves the branch row up after the primary folder (ue) — still one primary branch chip.
  assert.ok(occurrences(html, '>main</span>') === 1);
  // addFolder (Add repository…) is a ghost Add button on the folder row; repo menu items make the folder chip a menu trigger.
  const add = rail({ session: localSession, addFolder: { label: 'Add repository…', onOpen() {}, picker: null }, repoMenuItems: [{ label: 'Copy path', onSelect() {} }] });
  assert.match(add, /aria-label="Add repository…"/);
  assert.match(add, /aria-haspopup="menu"[^>]*><span aria-hidden="true" class="absolute -z-\[1\][\s\S]*?<span class="truncate">repo<\/span>/);
  // A hidden-path folder offers Choose folder… when the host can pick one.
  const choose = rail({ session: { ...localSession, folder: { name: 'Scratch', path: '/tmp/s', hidePath: true } }, chooseFolder() {} });
  assert.match(choose, /Choose folder…/);
});

test('rD: flat (D10) — settings, usage and progress never render; the Changes card provides row / sans; not flat shows settings', () => {
  const plan = [{ key: '0:a', label: 'Step', state: 'current', status: 'in_progress' }];
  const props = { session: localSession, plan, controls: h('i', { id: 'controls-probe' }), usageSection: h('i', { id: 'usage-probe' }), contextSection: h('i', { id: 'context-probe' }) };
  const html = rail(props);
  assert.doesNotMatch(html, /Progress|controls-probe|usage-probe|>Settings</);
  assert.match(html, /<div data-rail-card="context" [^>]*><i id="context-probe"><\/i><\/div>/, 'Context stays');
  // Not flat: the settings card carries the controls; usage renders; progress is still excluded (c227f4d5e wZ).
  const stacked = rail(props, { isFlat: false });
  assert.match(stacked, /<span class="shrink-0">Settings<\/span>/);
  assert.match(stacked, /controls-probe/);
  assert.match(stacked, /usage-probe/);
  assert.doesNotMatch(stacked, /Progress/);
  // The Changes card: keepMounted section "Changes"; its children see the row layout and the sans face, and the PR count setter.
  let seen;
  const Probe = () => { seen = [React.useContext(Kit.ChangesRowLayoutContext), React.useContext(Kit.BranchChipFaceContext)]; return h('nav', null, 'pr'); };
  const changes = rail({ session: localSession, pullRequests: h(Probe) });
  assert.match(changes, /<span class="shrink-0">Changes<\/span>/);
  assert.deepEqual(seen, ['row', 'sans']);
  rail({ session: localSession, pullRequests: h(Probe) }, { isFlat: false });
  assert.deepEqual(seen, ['stacked', 'mono']);
  assert.match(changes, /<div data-rail-card="pullRequests" class="relative flex-col rounded-card hidden has-\[nav:not\(:empty\)\]:flex has-\[\[data-epitaxy-branch-row-ghost\]\]:flex /, 'aD: the slot shows once the bar renders');
});

test('DE: the card order and hidden sections come from epitaxy.sessionRailSections; the tail slot follows the stack', () => {
  const connectors = { count: 3, needReconnect: 0, unavailable: 0, servers: [], onOpen() {} };
  const store = Sections.railSectionsStore;
  const order = html => [...html.matchAll(/data-rail-card="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(order(rail({ session: localSession, connectors })), ['environment', 'connectors', 'outputs'], 'c227f4d5e xZ order');
  withLiveSnapshot(store, live => {
    store.getState().setOrder(['outputs', 'connectors', 'environment']);
    assert.deepEqual(order(live(() => rail({ session: localSession, connectors }))), ['outputs', 'connectors', 'environment']);
    store.getState().setHidden('connectors', true);
    assert.deepEqual(order(live(() => rail({ session: localSession, connectors }))), ['outputs', 'environment']);
    store.getState().setHidden('environment', true);
    assert.ok(order(live(() => rail({ session: localSession, connectors }))).includes('environment'), 'environment cannot be hidden');
  });
  assert.deepEqual(order(rail({ session: localSession, connectors })), ['environment', 'connectors', 'outputs']);
  const tail = { current: null };
  assert.match(rail({ session: localSession, tailRef: tail }), /<div class="contents"><\/div><\/div><\/aside>$/);
});

test('lD: Connectors — folded by default, the counts summary, the single row, the listed servers (failed first) with letter icons', () => {
  const store = Sections.railSectionsStore;
  const folded = rail({ session: localSession, sessionKey: 'local_1', connectors: { count: 3, needReconnect: 1, unavailable: 0, servers: [], onOpen() {} } });
  assert.match(folded, /<span class="shrink-0">Connectors<\/span>/);
  assert.match(folded, /text-muted-as-secondary[^"]*">1 to reconnect<\/span>/);
  assert.doesNotMatch(folded, /2 connected/, 'connectors is folded by default (c227f4d5e kZ)');
  // Open for this session (the card's fold is per sessionKey, iD's RailSessionKeyContext).
  const open = (connectors, sessionKey = 'local_1') => withLiveSnapshot(store, live => {
    store.getState().setOpen(sessionKey, 'connectors', true);
    return live(() => rail({ session: localSession, sessionKey, connectors }));
  });
  const one = open({ count: 3, needReconnect: 1, unavailable: 0, servers: [], onOpen() {} });
  assert.match(one, /<span class="min-w-0 flex-1 truncate text-start text-primary">2 connected<\/span>/, 's = count - needReconnect - unavailable');
  const pending = open({ count: null, needReconnect: 0, servers: [], onOpen() {} });
  assert.match(pending, /aria-label="Manage connectors"/);
  assert.match(pending, /data-cds="SkeletonGroup"[^>]*aria-hidden="true"/, 'TD: a decorative skeleton while the count loads');
  // yj: names / states / targets as TN builds them (failed and needs-auth first), labelled by HA; C1-9: each row carries the
  // target its click opens ("account:<id>" / "session:<id>", c227f4d5e cJ).
  const servers = Derive.connectorRows({ names: 'github\nlinear_app\nplugin:acme:docs', states: '\nfailed\nunavailable', iconTypes: '', iconSrcs: '',
    targets: '\naccount:abc\n', labelOf: Derive.connectorLabel });
  assert.deepEqual(servers.map(s => [s.name, s.label, s.state]), [['linear_app', 'Linear app', 'failed'], ['github', 'Github', undefined], ['plugin:acme:docs', 'Docs', 'unavailable']]);
  assert.equal(servers[2].plugin, 'Acme');
  assert.deepEqual(servers[0].target, { kind: 'account', id: 'abc' });
  assert.equal(servers[1].target, undefined);
  const list = open({ count: 3, needReconnect: 1, unavailable: 1, servers, onOpen() {} });
  assert.match(list, /<p class="font-sans shrink-0 leading-tight">L<\/p>/, 'shared-7 Hk\'s letter avatar (Ik) for a server without an icon source');
  assert.match(list, /style="width:16px;height:16px;border-radius:4\.32px" class="shrink-0 bg-surface-3 border shadow-sm flex items-center justify-center !border-0 !shadow-none !bg-transparent"/, 'Fk, the tile');
  assert.match(list, /text-warning">Reconnect<\/span>/);
  assert.match(list, /text-muted-as-secondary">Unavailable<\/span>/);
  assert.ok(list.indexOf('Linear app') < list.indexOf('Github'));
  assert.equal(View.connectorStateAction({ formatMessage: m => m.defaultMessage }, 'needs-auth'), 'Authenticate');
});

test('xE / bE / _E / gE: Outputs from the host transcript — Rv\'s filter, the count summary, file rows that open in Files', () => {
  const sessionRef = { id: 'local_1', type: 'local' };
  const messages = [
    { author: 'assistant', outputFiles: [{ path: '/Users/me/repo/src/app.js', written: true }, { path: '/Users/me/repo/notes.md', written: true }] },
    { author: 'assistant', outputFiles: [{ path: '/Users/me/Desktop/report.pdf', written: true }] },
  ];
  const opened = [];
  const outputs = (value, opener = path => opened.push(path)) => rail({ session: localSession, outputsSession: sessionRef },
    { isFlat: true }) && render(flat(h(FileAccess.SessionFileOpenerProvider, { value: opener },
    h(Adapters.SessionRailOutputsContext.Provider, { value }, h(View.SessionRail, { session: localSession, plan: [], artifacts: [], outputsSession: sessionRef })))));
  const html = outputs({ sessionId: 'local_1', messages });
  assert.match(html, /<span class="shrink-0">Outputs<\/span>/);
  assert.match(html, /<span class="tabular-nums">2<\/span>/, 'app.js is a written code file inside the checkout: not an output (c73f45bc3 Rv)');
  assert.ok(html.indexOf('report.pdf') < html.indexOf('notes.md'), 'most recent first');
  assert.doesNotMatch(html, /app\.js/);
  // In → An with the session file opener: An's "inline-block" gives way to the row's flex (cdsClassNames merges them).
  assert.match(html, /<span role="button" tabindex="0" class="aria-busy:cursor-progress aria-busy:opacity-60 flex min-h-6\.5 w-full min-w-0 items-center gap-sm px-xs text-body rounded /);
  // Another session's messages are not this rail's; no opener renders the rows static (In's fallback).
  assert.doesNotMatch(outputs({ sessionId: 'other', messages }), /Outputs/);
  const plain = outputs({ sessionId: 'local_1', messages }, null);
  assert.doesNotMatch(plain, /role="button" tabindex="0" class="aria-busy/);
  assert.match(plain, /report\.pdf/);
  // gE's MCP-saved file label ({server} file · {when}) comes from shared-130 rR over the path.
  const saved = outputs({ sessionId: 'local_1', messages: [{ author: 'assistant', outputFiles: [{ path: '/Users/me/.claude/projects/p/s/tool-results/mcp-google_drive-blob-1760000000000-ab12.pdf', written: false }] }] });
  assert.match(saved, /Google drive file/);
});

test('pure derivations: RE / XE / ZE / QE / HE / VE / ME / GE / UE / AE / zE / nD and the checkout select', () => {
  const { railFolder, railWorktree, lazyWorktreePending, lazyWorktreeState, railBranch, knownBranch, railExtraFolders, railEnvironment, environmentKind,
    environmentConnection, remoteControlState, railPlanSteps, checkoutInfo, NO_CHECKOUT_INFO, pathLeaf, isSideSessionNotesFolder, environmentSummary } = Derive;
  // RE: the folder row. A worktree session shows the worktree path with its origin as basePath; scratch hides the path.
  assert.deepEqual(railFolder({ isLocal: true, originCwd: '/r/repo', workingDir: '/r/repo' }), { name: 'repo', path: '/r/repo' });
  assert.deepEqual(railFolder({ isLocal: true, originCwd: '/r/repo', workingDir: '/r/repo/.claude/worktrees/a' }), { name: 'repo', path: '/r/repo/.claude/worktrees/a', basePath: '/r/repo' });
  assert.deepEqual(railFolder({ isLocal: true, workingDir: '/r/repo', discoveredSlug: 'acme/widgets' }), { name: 'widgets', path: '/r/repo' });
  assert.deepEqual(railFolder({ isLocal: true, workingDir: '/r/repo', cachedRepoName: 'cached' }), { name: 'cached', path: '/r/repo' });
  assert.equal(railFolder({ isLocal: true }), null);
  assert.deepEqual(railFolder({ isLocal: true, workingDir: '/tmp/s', isScratchWorkspace: true, scratchLabel: 'Scratch' }), { name: 'Scratch', path: '/tmp/s', hidePath: true });
  assert.equal(railFolder({ isLocal: true, workingDir: '/tmp/s', isScratchWorkspace: true }), null);
  // XE: the worktree row — a desktop worktree, or any .claude/worktrees path.
  const table = [
    [{ isLocal: true, originCwd: '/r', workingDir: '/r' }, null],
    [{ isLocal: true, originCwd: '/r', workingDir: '/r/.claude/worktrees/a' }, { name: 'a', path: '/r/.claude/worktrees/a' }],
    [{ isLocal: true, originCwd: '/r', workingDir: '/elsewhere/w', hasDesktopWorktree: true }, { name: 'w', path: '/elsewhere/w' }],
    [{ isLocal: true, originCwd: '/r', workingDir: '/elsewhere/w' }, null],
    [{ isLocal: false, originCwd: '/r', workingDir: '/r/.claude/worktrees/a' }, null],
    [{ isLocal: true, originCwd: 'C:\\r', workingDir: 'C:\\r\\.claude\\worktrees\\b' }, { name: 'b', path: 'C:\\r\\.claude\\worktrees\\b' }],
  ];
  for (const [input, expected] of table) assert.deepEqual(railWorktree(input), expected, JSON.stringify(input));
  // ZE / QE: the lazy worktree pending states (the host's eager worktrees never qualify: it records the worktree path).
  const pendingInput = { isLocal: true, cwd: '/r', originCwd: '/r', startedWithWorktree: true };
  assert.equal(lazyWorktreePending(pendingInput), true);
  for (const extra of [{ worktreePath: '/r/.claude/worktrees/a' }, { harnessCwd: '/h' }, { branch: 'b' }, { worktreeRemoved: true }, { cwd: '/elsewhere' }, { startedWithWorktree: false }, { isLocal: false }])
    assert.equal(lazyWorktreePending({ ...pendingInput, ...extra }), false, JSON.stringify(extra));
  assert.equal(lazyWorktreeState({ pending: false }), undefined);
  assert.deepEqual(lazyWorktreeState({ pending: true, remote: true }), { kind: 'notEntered' });
  assert.deepEqual(lazyWorktreeState({ pending: true, archived: true }), { kind: 'notEntered' });
  assert.deepEqual(lazyWorktreeState({ pending: true, leasedPath: '/l', leasedBranch: 'claude/l' }), { kind: 'ready', branch: 'claude/l' });
  assert.deepEqual(lazyWorktreeState({ pending: true }), { kind: 'preparing' });
  // HE: the branch row — a name, a pending name (null) in a checkout or worktree session, or no row.
  assert.deepEqual(railBranch({ discovered: 'main' }), { name: 'main' });
  assert.deepEqual(railBranch({ discovered: null, known: 'feat' }), { name: 'feat' });
  assert.deepEqual(railBranch({ discovered: undefined, inCheckout: true }), { name: null });
  assert.deepEqual(railBranch({ discovered: undefined, startedWithWorktree: true }), { name: null });
  assert.equal(railBranch({ discovered: null, inCheckout: true }), null);
  assert.equal(railBranch({ discovered: undefined }), null);
  // VE: the recorded branch wins unless the worktree is live; then the checkout's, then the meta's.
  assert.equal(knownBranch({ liveWorktree: false, recorded: 'rec', checkedOut: 'co', metaBranch: 'meta' }), 'rec');
  assert.equal(knownBranch({ liveWorktree: true, recorded: 'rec', checkedOut: 'co' }), 'co');
  assert.equal(knownBranch({ liveWorktree: true, recorded: 'rec' }), 'rec');
  assert.equal(knownBranch({ liveWorktree: true, metaBranch: 'meta' }), 'meta');
  assert.equal(knownBranch({}), undefined);
  // ME: extra folders — directories (worktree trees, removed trees), discovered repos, repo slugs; deduped by name.
  const primary = { name: 'repo', path: '/r/repo' };
  const folders = railExtraFolders({
    directories: ['/r/repo', '/r/lib', '/r/tool/.claude/worktrees/t'],
    trees: [{ folder: '/r/tool', worktreePath: '/r/tool/.claude/worktrees/t', worktreeName: 't', branch: 'claude/t' }],
    repos: [{ repo: 'acme/lib', cwd: '/r/lib', branch: 'dev', repoLinks: ['x'] }, { repo: 'acme/other', branch: 'main' }],
    repoSlugs: ['acme/repo', 'acme/docs'], primary,
  });
  assert.deepEqual(folders, [
    { name: 'lib', path: '/r/lib', cwd: '/r/lib', branch: 'dev', repoLinks: ['x'] },
    { name: 'tool', path: '/r/tool', cwd: '/r/tool/.claude/worktrees/t', branch: 'claude/t', worktree: { name: 't', path: '/r/tool/.claude/worktrees/t' } },
    { name: 'other', path: 'acme/other', cwd: undefined, repoSlug: 'acme/other', branch: 'main', repoLinks: undefined },
    { name: 'docs', path: 'acme/docs', repoSlug: 'acme/docs' },
  ]);
  // GE / KE: the environment row. Local: the machine label and "Local session"; a named environment shows its name.
  const labels = { local: 'This Mac', cloud: 'Cloud', bridge: 'Remote Control' };
  const kinds = { local: 'Local session', ssh: 'SSH session', wsl: 'WSL session', cloud: 'Cloud session', selfHosted: 'Self-hosted session', bridge: 'Remote Control session' };
  assert.deepEqual(railEnvironment({ kind: 'local', labels, kinds }), { label: 'This Mac', kind: 'Local session' });
  assert.deepEqual(railEnvironment({ kind: 'local', labels, kinds, named: { name: 'Staging', icon: 'Box' } }), { kind: 'Local session', label: 'Staging', icon: 'Box' });
  assert.deepEqual(railEnvironment({ kind: 'remoteHost', remoteHost: 'devbox', remoteKind: 'ssh', labels, kinds }), { label: 'devbox', kind: 'SSH session' });
  assert.deepEqual(railEnvironment({ kind: 'cloud', namePending: true, labels, kinds }), { label: null, kind: 'Cloud session', place: 'cloud' });
  // UE: which environment a session runs in (the host is always local).
  assert.equal(environmentKind({ isLocal: true }), 'local');
  assert.equal(environmentKind({ remoteHost: 'h', isLocal: true }), 'remoteHost');
  assert.equal(environmentKind({ isLocal: false, environmentId: 'env_1' }), 'cloud');
  // AE / zE / nD.
  assert.deepEqual(['connecting', 'idle', 'connected', undefined].map(environmentConnection), ['connecting', 'notConnected', undefined, undefined]);
  assert.equal(remoteControlState({ metaFetched: true, props: 'p' }), 'p');
  // C1-8: wj's inputs are metaFetched / metaPending / props / available / prefsPending (no discovery or repo inputs).
  assert.equal(remoteControlState({ metaFetched: false, metaPending: true, available: true }), 'pending');
  assert.equal(remoteControlState({ prefsPending: true }), 'pending');
  assert.equal(remoteControlState({ metaFetched: true, available: true }), undefined);
  assert.deepEqual(railPlanSteps([{ id: 'a', content: 'A', status: 'completed' }, { id: 'b', content: 'B', status: 'pending', activeForm: 'Doing B' }, { id: 'c', content: 'C', status: 'pending' }]),
    [{ key: '0:a', label: 'A', state: 'done', status: 'completed' }, { key: '1:b', label: 'B', state: 'current', status: 'pending', activeLabel: 'Doing B' },
      { key: '2:c', label: 'C', state: 'pending', status: 'pending' }]);
  // sO: cO's git-info select (a detached HEAD is no branch; the repo slug's name is the repo name).
  // bN / yN carry headUnread (C1-8).
  assert.deepEqual(checkoutInfo({ branch: 'HEAD', repo: 'acme/widgets' }), { branch: undefined, repoName: 'widgets', headUnread: false });
  assert.deepEqual(checkoutInfo({ branch: 'detached:abc', repo: 'widgets' }), { branch: undefined, repoName: undefined, headUnread: false });
  assert.deepEqual(checkoutInfo({ branch: 'main' }), { branch: 'main', repoName: undefined, headUnread: false });
  assert.deepEqual(NO_CHECKOUT_INFO, { branch: undefined, repoName: undefined, headUnread: false });
  // gN: the meta select (shared-78 L4) keeps sshConnectionRemoved and the Remote Control fields of c227f4d5e nY.
  const meta = Derive.RAIL_SESSION_META({ sshConnectionRemoved: true, bridgeSessionUrl: 'u', isCloudRun: false, other: 1 });
  assert.equal(meta.sshConnectionRemoved, true);
  assert.equal(meta.bridgeSessionUrl, 'u');
  assert.ok(Object.hasOwn(meta, 'isCloudRun') && Object.hasOwn(meta, 'remoteControlAvailable') && !Object.hasOwn(meta, 'other'));
  assert.deepEqual(['/a/b/', 'C:\\x\\y', 'solo'].map(pathLeaf), ['b', 'y', 'solo']);
  assert.equal(isSideSessionNotesFolder('/Users/me/.claude/side-session-notes/local_abc-1/'), true);
  assert.equal(environmentSummary({ folder: { name: '' }, branch: { name: 'main' } }), 'main');
  assert.equal(Derive.RAIL_PENDING_GIVE_UP_MS, 6000);
  assert.deepEqual(Derive.COMPOSER_MENU_SECTIONS, { model: 'settings', mode: 'settings', permissions: 'settings', effort: 'settings', context: 'context' });
});

test('hooks: lO holds while pending, cO reads the git-info query (cached data through sO) and its live branch', async () => {
  const timing = await server.ssrLoadModule('/src/generated/session-rail/rail-timing.mjs');
  assert.equal(timing.NAME_PENDING_GIVE_UP_MS, 2000);
  let held;
  const Hold = ({ pending }) => { held = Hooks.useRailPendingHold(pending, Derive.RAIL_PENDING_GIVE_UP_MS); return null; };
  render(h(Hold, { pending: true }));
  assert.equal(held, true, 'pending and the 6 s have not elapsed');
  render(h(Hold, { pending: false }));
  assert.equal(held, false);
  // cO: the query is disabled here (no desktop bridge → LocalSessions.getGitInfo undefined); a cached answer is selected by sO.
  const client = new Query.QueryClient();
  let info;
  const Checkout = ({ cwd }) => { info = Hooks.useCheckoutInfo(cwd); return null; };
  const within = node => render(h(Query.QueryClientProvider, { client }, node));
  within(h(Checkout, { cwd: '/r/repo' }));
  assert.equal(info, Derive.NO_CHECKOUT_INFO);
  client.setQueryData([GitKey.gitInfoQueryKey, '/r/repo', 'local'], { isRepo: true, root: '/r/repo', repo: 'acme/widgets', branch: 'feat/x' });
  within(h(Checkout, { cwd: '/r/repo' }));
  assert.deepEqual(info, { branch: 'feat/x', repoName: 'widgets', headUnread: false });
  client.clear();
  assert.equal(typeof Hooks.useComposerMenuOpensRailSection, 'function');
});

test('adapters: the skeleton is the CDS one, the file reference, and the refusals', () => {
  // xM: the decorative CdsLoadingSkeleton group around one CdsSkeleton bar (view-tabs; no stand-in any more).
  const skeleton = render(h(View.RailSkeleton, { width: 110 }));
  assert.equal(skeleton, '<span data-cds="SkeletonGroup" data-motion="wave" data-hold="delayed" aria-hidden="true" class="flex min-w-0 items-center">'
    + '<span aria-hidden="true" class="contents"><span data-cds="Skeleton" class="block h-[1em] max-w-full rounded bg-[var(--cds-skeleton-base)]" style="width:110px;height:12px"></span></span></span>');
  for (const gone of ['SkeletonGroup', 'Skeleton', 'useLayerAwareZIndex', 'ConnectorIcon']) assert.equal(Adapters[gone], undefined, gone);
  const opened = [];
  const ref = render(h(FileAccess.SessionFileOpenerProvider, { value: (...args) => opened.push(args) },
    h(Adapters.SessionFileRef, { fileRef: { path: '/r/a.md' }, className: 'x', fallback: h('b', null, 'fallback') }, 'a.md')));
  assert.equal(ref, '<span role="button" tabindex="0" class="inline-block aria-busy:cursor-progress aria-busy:opacity-60 x">a.md</span>');
  assert.equal(render(h(Adapters.SessionFileRef, { fileRef: { path: '/r/a.md' }, fallback: h('b', null, 'fallback') }, 'a.md')), '<b>fallback</b>');
  for (const Part of [Adapters.RemoteControlRow, Adapters.GoalCardBody, Adapters.ProgressCardBody, Adapters.ArtifactOutputRow, Adapters.addRemoteEnvironment])
    assert.throws(() => render(h(Part, {})), /not available in this host/);
  // Gj only reaches SM for a Remote Control session object, which the host never passes; "pending" is a skeleton row.
  assert.throws(() => rail({ session: localSession, remoteControl: { active: true } }), /Remote Control row/);
  assert.match(rail({ session: localSession, remoteControl: 'pending' }), /Remote Control[\s\S]*data-cds="SkeletonGroup"/);
  assert.equal(Adapters.useFileIconSetEnabled(), false);
  assert.equal(Adapters.useScratchCopyOf(), null);
  assert.equal(Adapters.useLiveCheckoutBranch('/r'), undefined);
  assert.equal(Adapters.useGoneOutputPaths(), Adapters.useGoneOutputPaths(), 'one empty Set (zA\'s IA)');
});

test('yT / dL: the repo menu body is CdsDropdown parts; the folder chip is static without items, a menu trigger with them', () => {
  const items = MenuItems.renderMenuItems([{ label: 'Show in Finder', onSelect() {} }, 'separator', { label: '' }, { label: 'Open in', items: [{ label: 'Terminal' }] }]);
  assert.equal(items.length, 4);
  assert.equal(items[0].type, React.Fragment);
  assert.equal(items[0].props.children[1].type, ViewTabs.CdsDropdown.Item);
  assert.equal(items[1].type, ViewTabs.CdsDropdown.Separator);
  assert.equal(items[2], null, 'an empty label renders nothing');
  assert.equal(items[3].props.children[1].type, ViewTabs.CdsDropdown.Submenu);
  assert.equal(MenuItems.renderMenuItems(h('i')).type, 'i', 'a node passes through');
  const plain = render(h(Chip.RepoNameChip, { repoName: 'repo' }));
  assert.equal(plain, '<span class="inline-flex h-control min-w-0 max-w-[160px] shrink items-center whitespace-nowrap px-md text-body font-normal text-muted-as-secondary"><span class="truncate">repo</span></span>');
  const menu = render(h(Chip.RepoNameChip, { repoName: 'repo', menuItems: [{ label: 'Copy path', onSelect() {} }] }));
  assert.match(menu, /aria-haspopup="menu" id="[^"]+" aria-expanded="false"/);
  assert.match(menu, /shrink min-w-0 max-w-\[160px\] !justify-start \*:min-w-0 text-muted hover:text-primary/);
});

test('dnd-kit: the sortable pieces DE composes are the original library (arrayMove, CSS.Translate, the list strategy)', () => {
  assert.deepEqual(Dnd.arrayMove(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.equal(Dnd.CSS.Translate.toString({ x: 1.4, y: -2.6 }), 'translate3d(1px, -3px, 0)');
  assert.equal(Dnd.CSS.Translate.toString(null), undefined);
  assert.equal(Dnd.isKeyboardEvent(null), false);
  assert.deepEqual(Dnd.verticalListSortingStrategy({ activeIndex: 0, index: 1, overIndex: 1, rects: [{ top: 0, height: 10 }, { top: 12, height: 10 }] }),
    { x: 0, y: -12, scaleX: 1, scaleY: 1 });
  assert.equal(typeof Dnd.KeyboardSensor.activators[0].handler, 'function', 'the static activators are initialised');
  assert.deepEqual(Dnd.PointerSensor.activators.map(a => a.eventName), ['onPointerDown']);
});
