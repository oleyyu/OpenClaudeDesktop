// R4f-rail SR-4: the session rail's Changes row (c96d752d0 Ike's `data-rail-changes-row` branch with its menu, counts and
// verb), generated from the Claude Desktop 3.6556.2 originals (w3-rail-changes) into src/generated/session-rail-changes
// (scripts/extract-session-rail-changes.mjs), and the host stand-in for the PR bar that feeds it from the local git
// status (src/source-session-rail-changes-adapters.jsx). Source/AST pins, Vite SSR renders and handlers reached through
// a test hook dispatcher (no browser, no Electron, no network, no external process, no real storage).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionRailChanges } from '../scripts/extract-session-rail-changes.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-rail-changes');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const TRANSCRIPT = 'c96d752d0-CWv_7-n9.js';
// A class string as React writes it into an attribute, as a RegExp source.
const attr = text => text.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let previousWindow, previousDocument;
let server, Row, Verb, Counts, Rail, Adapters, KitChip, KitRows, PrRows;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); nothing else reads the document in SSR.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  // A Linux user agent: the keybinding table (shared-46 aR) and the Mac test (view-tabs isMacUserAgent) read it.
  globalThis.window = { localStorage: undefined, matchMedia: undefined, navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = name => server.ssrLoadModule(`/src/generated/session-rail-changes/${name}`);
  [Row, Verb, Counts, Rail] = await Promise.all(['changes-row.mjs', 'changes-verb.mjs', 'diff-counts.mjs', 'pr-bar-rail.mjs'].map(load));
  Adapters = await server.ssrLoadModule('/src/source-session-rail-changes-adapters.jsx');
  PrRows = await load('pr-rows.mjs');
  KitChip = await server.ssrLoadModule('/src/generated/session-rail-kit/branch-chip.mjs');
  KitRows = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-rows.mjs');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

const render = node => renderToStaticMarkup(node);
// The flat rail (D10): the rail hands the Changes card the "row" layout (c96d752d0 hL = kit ChangesRowLayoutContext).
const inRow = node => h(KitChip.ChangesRowLayoutContext.Provider, { value: 'row' }, node);
const status = (patch = {}) => ({ isRepo: true, cwd: '/work/claude-ui-lab', repoName: 'claude-ui-lab', branch: 'feature/rail', hasChanges: true,
  workingTreeDirty: true, added: 12, removed: 3, comparison: { base: 'main', behind: 0 }, ...patch });

test('generator: the originals still match 3.6556.2 and src/generated/session-rail-changes is current', async () => {
  const checked = await extractSessionRailChanges({ check: true });
  assert.equal(checked.referenceVersion, '3.6556.2');
  assert.equal(checked.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807', 'E6');
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-session-rail-changes.mjs')), true, 'prepare-ui verifies it (D0)');
});

test('feature strings: research §1.2 counts in c96d752d0 and the strings in the generated row', () => {
  const transcript = raw(TRANSCRIPT);
  assert.equal(occurrences(transcript, 'data-rail-changes-row'), 1);
  assert.equal(occurrences(transcript, '"Open changes, {added, number} added'), 2, 'row and stacked branches of Ike');
  assert.equal(occurrences(transcript, 'data-session-rail-flat'), 2);
  // C2-2: the ⋮ label names the repo and branch when the row shows a repo name (8RgmijlEMA), else the title.
  assert.equal(occurrences(transcript, 'defaultMessage:"More options for {repo} on {branch}",id:"8RgmijlEMA"'), 1);
  const row = generated('changes-row.mjs');
  for (const needle of ['"data-rail-changes-row": ""', '"Open changes, {added, number} added, {removed, number} removed"', 'name: "ChangesPlusMinus"',
    '"More options for {title}"', '"More options for {repo} on {branch}"', 'if (r === null && N === "row") {', 'wi("toggleDiff", A)',
    'defaultMessage: "View changes"', '"Open review comments"', '"min-w-0 text-muted-as-secondary"'])
    assert.ok(row.includes(needle), needle);
  assert.equal(occurrences(row, '"Open changes, {added, number} added, {removed, number} removed"'), 2);
  assert.equal(occurrences(row, '"min-w-0 truncate text-muted-as-secondary"'), 0, 'C2-2: the repo name no longer truncates');
  assert.ok(generated('changes-verb.mjs').includes('wrapperClassName: "min-w-0 shrink-0",'));
  assert.ok(generated('pr-mode-messages.mjs').includes('commit: { defaultMessage: "Commit changes", id: "PQy14pRnLi" },'));
  assert.match(generated('pr-bar-labels.mjs'), /export \{\s*PR_MODE_MESSAGES,\s*PR_MODE_BUSY_MESSAGES,?\s*\} from "\.\/pr-mode-messages\.mjs";/, 'R4');
  assert.ok(generated('diff-counts.mjs').includes('d = l === void 0 ? "text-git-added" : l,'));
  // C2-6: the band's Dismiss ink.
  assert.ok(generated('dismiss-button.mjs').includes('s = o === void 0 ? "text-muted-as-secondary hover:text-primary" : o,'));
  // panes:C3-8: the keybinding table the toggleDiff chord is read from carries the PR comment keys.
  assert.ok(generated('command-shortcut.mjs').includes('command: "nextPrComment", key: "alt+f9", code: "F9", when: "!isLinux"'));
});

test('one copy: kit contexts and row parts, view-tabs public names (D1, E3), files-changes slices, no context sliced', () => {
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const kit = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/session-rail-kit/manifest.json'), 'utf8'));
  const published = new Set(Object.keys(viewTabs.publicNames));
  for (const m of manifest.modules) {
    // R4i-rail RL2: c96d752d0 lL (the PR bar layout, "band" by default) lives only in pr-rows.mjs; Sje's rail stand-in
    // provides "rail". uL is the repo chip's own context (vke provides it; no host reader).
    assert.deepEqual(m.contexts, m.target === 'pr-rows.mjs' ? ['lL', 'uL'] : undefined, `${m.target} instantiates no other context`);
    for (const i of m.imports) {
      assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
      if (i.kind === 'view-tabs') assert.ok(published.has(i.name), `${m.target} imports view-tabs ${i.name}`);
      if (i.kind === 'session-rail-kit') assert.ok(kit.publicNames[i.name], `${m.target} imports kit ${i.name}`);
    }
  }
  const row = manifest.modules.find(m => m.target === 'changes-row.mjs');
  assert.deepEqual(row.bindings.map(b => b.name).sort(), ['Bke', 'DL', 'Ike', 'Lke', 'OL', 'Rke', 'zke'].sort());
  const imported = local => row.imports.find(i => i.local === local);
  // c96d752d0 mL / hL: the face and row layout contexts the rail's Changes card provides, one instance (the kit's).
  assert.deepEqual([imported('mL').kind, imported('mL').name], ['session-rail-kit', 'BranchChipFaceContext']);
  assert.deepEqual([imported('hL').kind, imported('hL').name], ['session-rail-kit', 'ChangesRowLayoutContext']);
  assert.deepEqual([imported('nv').name, imported('hg').name, imported('Lc').name], ['RAIL_ROW_CLASS', 'RailRowIcon', 'RAIL_POPUP_COLLISION_PADDING']);
  assert.deepEqual([imported('oe').name, imported('se').name, imported('J').name, imported('qe').name], ['CdsDropdown', 'CdsTooltip', 'CdsButton', 'CdsTooltipProvider']);
  // E3: the compiler cache helpers come from view-tabs by their semantic names; React Compiler's c from vendor-frame Oo.
  assert.deepEqual([imported('J9').kind, imported('J9').name], ['view-tabs', 'reactMemoCache']);
  for (const m of manifest.modules) for (const i of m.imports) if (/^[JKIZ][0-9]$/.test(i.local)) assert.equal(i.kind, 'view-tabs', `${m.target} ${i.local}`);
  // shared-18 ok / sk (the ContextMenu key and the Enter-repeat guard) and c0cdf4a08 m (the pending menu check, module
  // state): files-changes' 3.6556.2 copies, imported.
  const menu = manifest.modules.find(m => m.target === 'row-context-menu.mjs');
  assert.deepEqual(menu.imports.find(i => i.local === 'm'), { local: 'm', from: '../files-changes/menu-open-gate.mjs', name: 'openAfterCheck',
    via: 'c0cdf4a08-C69Ng1c8.js:m', kind: 'files-changes', original: 'c0cdf4a08-C69Ng1c8.js:m' });
  assert.equal(imported('Nc').name, 'preventMenuItemEnterRepeat');
  const key = manifest.modules.find(m => m.target === 'context-menu-key.mjs');
  assert.deepEqual([key.bindings.length, key.imports[0].from, key.imports[0].name], [0, '../files-changes/tree-context-menu-keys.mjs', 'openContextMenuFromKey']);
  // view-tabs publishes the Mac test and the aria-keyshortcuts form in 3.6556.2: re-exported (R4), not sliced again.
  const aria = manifest.modules.find(m => m.target === 'aria-shortcut.mjs');
  assert.deepEqual([aria.bindings.length, aria.imports.map(i => i.name).sort()], [0, ['ariaKeyShortcuts', 'useIsMacPlatform']]);
  // Adapters: the kit's intl / toasts, the desktop-app test and the menu items renderer (view-tabs has no name for them;
  // the tooltip fu is view-tabs' CdsDeferredTooltip since w10-trans-rail-deferred-tooltip); the PR rows' YL (tile store), the one copies of cL / bE in the sibling rail areas, and the PR panel /
  // in-app link / link policy / hover card sources the host does not have.
  const adapters = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.original));
  assert.deepEqual([...new Set(adapters)].sort(), ['shared-25-DOWZRSlq.js:cc', 'shared-52-uHFNjl7C.js:cB', 'shared-frame-6jtSkIit.js:yT',
    'vendor-intl-DYfox5Co.js:Gt', 'vendor-intl-DYfox5Co.js:q', 'c96d752d0-CWv_7-n9.js:YL', 'c96d752d0-CWv_7-n9.js:cL', 'shared-20-mUr7IqZY.js:bE',
    'c227f4d5e-B-FYKrwT.js:UT', 'cc6e65d4b-D0J5j7gV.js:f', 'c2fd10b8d-DB1Sgoyz.js:Al', 'c2fd10b8d-DB1Sgoyz.js:Ml', 'c60636ac6-xYOM0GQX.js:mt',
    'c60636ac6-xYOM0GQX.js:ht'].sort());
  // The callers are pinned, not sliced.
  for (const binding of ['EL', 'Pke', 'YL', 'Sje', 'Hje', 'Zje', 'xje', 'TMe', 'Py'])
    assert.ok(manifest.callSites.some(site => site.binding === binding), binding);
  assert.ok(manifest.callSites.some(site => site.raw && site.loose && site.features.some(f => f.includes('s(Ds.Provider,{value:V?"row":"stacked",children:n})'))));
});

test('L64: Ike / EL wrap their controls in view-tabs CdsDeferredTooltip (shared-frame fu), not an eager CdsTooltip', () => {
  // The original: fu reads su(!0) (impl / wasCold / interceptors / trackTrigger) and, until an implementation is adopted,
  // returns the bare trigger cloned with the interceptors and Xl = {"data-cds-tooltip-pending": ""}.
  const frame = fs.readFileSync(path.join(reference, 'shared-frame-6jtSkIit.js'), 'utf8');
  assert.equal(occurrences(frame, 'function fu(e){let $=J9(11),{impl:t,wasCold:n,interceptors:r,trackTrigger:i}=su(!0),a=e.autoFocus===!1;'), 1);
  assert.equal(occurrences(frame, 'var Xl={"data-cds-tooltip-pending":""}'), 1);
  assert.equal(occurrences(frame, 'Me(s,{...r(s.props),...Xl})'), 1);
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.deepEqual(viewTabs.publicNames.CdsDeferredTooltip, { file: 'shared-frame-6jtSkIit.js', local: 'fu', export: 'Au' });
  for (const target of ['changes-row.mjs', 'pr-rows.mjs']) {
    const m = manifest.modules.find(x => x.target === target);
    const tip = m.imports.find(i => i.original === 'shared-frame-6jtSkIit.js:fu');
    assert.deepEqual([tip.kind, tip.from, tip.name], ['view-tabs', '../view-tabs/shared-frame-6jtSkIit.js', 'CdsDeferredTooltip'], target);
    assert.match(generated(target), new RegExp(`CdsDeferredTooltip as ${tip.local.replace(/\$/g, '\\$')},`));
    assert.doesNotMatch(generated(target), /RailTooltip/);
  }
  const adapterText = fs.readFileSync(path.join(app, 'src/source-session-rail-changes-adapters.jsx'), 'utf8');
  assert.doesNotMatch(adapterText, /export function RailTooltip/);
  // SSR: no tooltip code has loaded and no deferral scope or ambient implementation is provided, so the counts button is
  // the bare trigger marked pending (the lazy layer), not a tooltip root.
  const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)(?:, number)?\}/g, (_, name) => String(values?.[name] ?? '')) };
  const flat = render(inRow(h(Row.ChangesRow, { intl, link: null, branchTitle: 'feature/rail', diff: { added: 12, removed: 3 }, onDiffOpen() {}, onDiffClick() {} })));
  assert.match(flat, /<button[^>]*data-cds-tooltip-pending=""[^>]*aria-label="Open changes, 12 added, 3 removed"|<button[^>]*aria-label="Open changes, 12 added, 3 removed"[^>]*data-cds-tooltip-pending=""/);
});

test('Ike (ChangesRow): no PR link and the "row" layout render the flat rail row; the default layout is stacked', () => {
  const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)(?:, number)?\}/g, (_, name) => String(values?.[name] ?? '')) };
  const props = { intl, link: null, branchTitle: 'feature/rail', diff: { added: 12, removed: 3 }, onDiffOpen() {}, onDiffClick() {} };
  const flat = render(inRow(h(Row.ChangesRow, props)));
  assert.match(flat, /^<div role="none" class="flex min-w-0 flex-col gap-sm">/);
  assert.match(flat, new RegExp(`<div data-rail-changes-row="" class="${attr(KitRows.RAIL_ROW_CLASS)}">`));
  assert.match(flat, /aria-label="Open changes, 12 added, 3 removed"/);
  assert.match(flat, /<span class="tabular-nums inline-flex shrink-0 gap-1 text-body"><span class="sr-only">12 additions, 3 deletions<\/span>/);
  assert.match(flat, /<span class="text-git-added">\+12<\/span><span class="text-git-removed">−3<\/span>/);
  assert.match(flat, /class="sr-only flex shrink-0 focus-within:not-sr-only has-\[\[data-popup-open\]\]:not-sr-only"/);
  assert.match(flat, /aria-label="More options for feature\/rail"/);
  assert.doesNotMatch(flat, /min-w-0 truncate text-muted-as-secondary/, 'no repo name');
  const stacked = render(h(Row.ChangesRow, props));
  assert.doesNotMatch(stacked, /data-rail-changes-row/);
  assert.match(stacked, /^<div class="flex min-w-0 gap-sm px-xs py-1">/);
  // The branch face (c96d752d0 mL = kit BranchChipFaceContext; "sans" in the flat rail) only reaches the
  // stacked layout's branch title: mono by default, sans from the context.
  assert.match(stacked, /<span class="min-w-0 truncate font-mono-ui text-code text-primary">feature\/rail<\/span>/);
  const sans = render(h(KitChip.BranchChipFaceContext.Provider, { value: 'sans' }, h(Row.ChangesRow, props)));
  assert.match(sans, /<span class="min-w-0 truncate text-primary">feature\/rail<\/span>/);
  assert.equal(render(h(KitChip.BranchChipFaceContext.Provider, { value: 'sans' }, inRow(h(Row.ChangesRow, props)))), flat, 'the row ignores the face');
  // Without the counts' opener the counts are plain text, and without any menu entry there is no ⋮.
  const quiet = render(inRow(h(Row.ChangesRow, { intl, link: null, branchTitle: 'main', diff: { added: 1, removed: 0 } })));
  assert.doesNotMatch(quiet, /aria-label="Open changes/);
  assert.doesNotMatch(quiet, /More options for/);
  assert.match(quiet, /data-rail-changes-row/);
});

test('SessionRailChanges: Sje / bAe / YL around the row, from the local git status', () => {
  const { SessionRailChanges } = Adapters;
  assert.equal(render(inRow(h(SessionRailChanges, { status: { isRepo: false } }))), '', 'no repository: Sje renders nothing');
  assert.equal(render(inRow(h(SessionRailChanges, { status: null }))), '');
  const nav = `<nav aria-label="Repository and pull request controls" class="${attr(Rail.RAIL_PR_BAR_NAV_CLASS)}">`;
  assert.equal(Rail.RAIL_PR_BAR_NAV_CLASS, 'flex flex-col gap-1 empty:hidden');
  // A clean branch: the nav stays empty, so the card's `has-[nav:not(:empty)]:flex` keeps it hidden.
  assert.match(render(inRow(h(SessionRailChanges, { status: status({ hasChanges: false, added: 0, removed: 0 }) }))), new RegExp(`^${nav}</nav>$`));
  const live = render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, onOpenChanges() {}, onToggleChanges() {},
    verb: { mode: 'commit', onClick() {}, disabled: false } })));
  assert.match(live, new RegExp(`^${nav}<ul role="list" class="flex flex-col gap-1"><li class="flex flex-col"><div role="none" class="flex min-w-0 flex-col gap-sm">`));
  assert.match(live, /data-rail-changes-row=""/);
  assert.match(live, /aria-label="Open changes, 12 added, 3 removed"/);
  assert.match(live, />Commit changes<\/span>/);
  assert.match(live, /aria-label="More options for feature\/rail"/);
  assert.doesNotMatch(live, /claude-ui-lab<\/span>/, 'a single repo hides its name (Sje hideRepo)');
  // The Changes pane cannot open: counts as text, no ⋮ (Zje: no diff opener).
  const closed = render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: false, verb: { mode: 'commit' } })));
  assert.doesNotMatch(closed, /Open changes/);
  assert.doesNotMatch(closed, /More options for/);
  assert.doesNotMatch(closed, /\+12/, 'Zje: no counts unless the diff can open');
  // A disabled commit carries its reason in the CDS disabled-reason wrapper; view / none have no verb.
  const disabled = render(inRow(h(SessionRailChanges, { status: status({ workingTreeDirty: false }), diffOpenable: true,
    verb: { mode: 'commit', disabled: true, disabledReason: 'No changes to commit' } })));
  assert.match(disabled, /data-cds-disabled-reason-wrapper=""/);
  assert.match(disabled, /No changes to commit/);
  assert.match(disabled, /disabled=""/);
  // R4i-rail RL2: Zje `vt = hMe(N, …)`: with a pull request the row is in view mode, so EL shows no verb (the rail-only
  // Merge / Ready verb has no host source).
  assert.doesNotMatch(render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, verb: { onClick() {} },
    pr: { number: 7, url: 'https://github.com/o/r/pull/7', state: 'open', title: 'Rail' } }))), /Commit changes/);
  // Several repos show the name (hideRepo false), C2-2: an overflow tooltip in `min-w-0 text-muted-as-secondary` labels
  // the row (role group, aria-labelledby), and the ⋮ says "More options for {repo} on {branch}".
  const named = render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, hideRepo: false, onOpenChanges() {}, onToggleChanges() {} })));
  assert.match(named, /<div data-rail-changes-row="" role="group" aria-labelledby="([^"]+)" class="[^"]*"><span class="flex size-5 shrink-0 items-center justify-center text-secondary">/);
  const [, labelId] = /<div data-rail-changes-row="" role="group" aria-labelledby="([^"]+)"/.exec(named);
  assert.match(named, new RegExp(`<span class="min-w-0 text-muted-as-secondary"><span id="${labelId}" data-cds="OverflowTooltip"[^>]*>claude-ui-lab</span></span>`));
  assert.match(named, /aria-label="More options for claude-ui-lab on feature\/rail"/);
  assert.doesNotMatch(named, /min-w-0 truncate text-muted-as-secondary/);
});

test('railChangesRowProps: fze, nze _n / Gn and iB baseBranch over the local status', () => {
  const { railChangesRowProps } = Adapters;
  assert.equal(railChangesRowProps({ status: { isRepo: false } }), null);
  assert.equal(railChangesRowProps({ status: status({ hasChanges: false }) }), null, 'fze: no PR, no changes');
  assert.equal(Rail.prBarRowShown({ number: 1 }, { hasChanges: false }, undefined, true), true, 'fze: a PR keeps the row');
  assert.equal(Rail.prBarRowShown(undefined, { hasChanges: true }, false, false), false, 'fze: an unpushed branch without a tree');
  assert.deepEqual(railChangesRowProps({ status: status(), diffOpenable: true }),
    { branchTitle: 'feature/rail', repoName: undefined, baseBranch: undefined, diff: { added: 12, removed: 3 } });
  assert.equal(railChangesRowProps({ status: status({ added: 0, removed: 0 }), diffOpenable: true }).diff, undefined, 'zero counts');
  assert.equal(railChangesRowProps({ status: status(), diffOpenable: false }).diff, undefined, 'ze false');
  assert.equal(railChangesRowProps({ status: status(), prMode: 'create' }).baseBranch, 'main', 'outside commit mode the base shows');
  assert.equal(railChangesRowProps({ status: status({ branch: 'main' }), prMode: 'create' }).baseBranch, undefined, 'the base is the branch');
  assert.equal(railChangesRowProps({ status: status(), hideRepo: false }).repoName, 'claude-ui-lab');
});

// A hook dispatcher (as tests/sessions-page-current.test.mjs): renders one component level and returns its element tree,
// so handlers can be reached and called.
function shallow(component, props, contexts = new Map()) {
  const hooks = {
    useContext: c => (contexts.has(c) ? contexts.get(c) : c._currentValue), useId: () => ':r:', useRef: initial => ({ current: initial }),
    useMemo: fn => fn(), useCallback: fn => fn, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useSyncExternalStore: (subscribe, snapshot, server) => (server ?? snapshot)(), useEffect() {}, useLayoutEffect() {}, useInsertionEffect() {},
    useEffectEvent: fn => fn, useReducer: (reducer, initial, init) => [init ? init(initial) : initial, () => {}],
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate), ...nodes(tree.props?.trigger, predicate), ...nodes(tree.props?.verb, predicate)];
}

test('handlers: counts open Changes, the menu opens it, the verb sends the commit, the chord labels the button', () => {
  const calls = [];
  const outer = shallow(Adapters.SessionRailChanges, { status: status(), diffOpenable: true, diffOpenHasChord: true,
    onOpenChanges: () => calls.push('open'), onToggleChanges: () => calls.push('toggle'), verb: { onClick: () => calls.push('commit') } });
  // R4i-rail RL2 / w3: Sje (lL "rail" > nav > bAe over mAe's shape, renderRow) > YL (li, the chord) > EL (memo) > Ike.
  assert.equal(outer.props.value, 'rail');
  const [rows] = nodes(outer, n => n.type === PrRows.RailPrRows);
  assert.equal(rows.props.shape.rows.length, 1);
  assert.equal(rows.props.renderRow, Adapters.railPrRow);
  const [entry] = rows.props.shape.rows;
  // YL hands its render prop the chord: the primary row only, while the host says toggleDiff opens the diff.
  const chords = [];
  shallow(Adapters.RailPrListItem, { rowKey: entry.rowKey, primary: entry.primary, children: (chord) => (chords.push(chord), null) }, new Map([[Adapters.RailDiffOpenHasChordContext, true]]));
  shallow(Adapters.RailPrListItem, { rowKey: 'x', primary: false, children: (chord) => (chords.push(chord), null) });
  assert.deepEqual(chords, [true, false]);
  const barRow = rows.props.renderRow(entry, true);
  assert.equal(barRow.type, PrRows.PrBarRow);
  assert.equal(barRow.props.layout, 'rail');
  const host = shallow(PrRows.PrBarRow.type, barRow.props, new Map([[PrRows.PrBarLayoutContext, 'rail']]));
  const [rowElement] = [host].filter(n => n.type === Row.ChangesRow);
  assert.equal(rowElement.props.link, null);
  assert.equal(rowElement.props.diffOpenHasChord, true);
  const [verbElement] = nodes(host, n => n.type === Verb.ChangesRowVerb);
  assert.equal(verbElement.props.label, 'Commit changes');
  assert.equal(verbElement.props.busyLabel, undefined, 'rB: no busy label for commit');
  verbElement.props.onClick();
  // One level into OLe: the counts button opens (onDiffOpen), its tooltip carries the toggleDiff chord.
  const row = shallow(Row.ChangesRow, rowElement.props, new Map([[KitChip.ChangesRowLayoutContext, 'row']]));
  const buttons = nodes(row, n => typeof n.props?.['aria-label'] === 'string' && n.props['aria-label'].startsWith('Open changes'));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props['aria-keyshortcuts'], 'Control+Shift+d', 'cmd+shift+d off a Mac (SSR snapshot)');
  buttons[0].props.onClick();
  const [tooltip] = nodes(row, n => n.props?.shortcut !== undefined);
  assert.equal(tooltip.props.shortcut, 'cmd+shift+d', 'shared-46 YL toggleDiff for isClaudeApp');
  // The ⋮ / context menu body (Bke, grouped): View changes toggles (onDiffClick).
  const [menu] = nodes(row, n => n.type === Row.ChangesRowMenuItems);
  const items = shallow(Row.ChangesRowMenuItems, menu.props);
  assert.deepEqual(Object.keys(items.props.groups), ['pullRequest', 'changes', 'create', 'dismiss']);
  const view = nodes(items.props.groups.changes, n => n.props?.children?.props?.defaultMessage === 'View changes');
  assert.equal(view.length, 1);
  view[0].props.onClick();
  // 3.6556.2 Ike: `ie = m ? (h ?? m) : void 0`: with an opener the menu's View changes opens (onDiffOpen), the toggle is
  // only the fallback.
  assert.deepEqual(calls, ['commit', 'open', 'open']);
  const toggleOnly = shallow(Row.ChangesRow, { ...rowElement.props, onDiffOpen: undefined }, new Map([[KitChip.ChangesRowLayoutContext, 'row']]));
  const [fallback] = nodes(toggleOnly, n => n.type === Row.ChangesRowMenuItems);
  assert.equal(fallback.props.onDiffClick, rowElement.props.onDiffClick);
  // The row's context menu is enabled once a menu entry exists (re); its keyboard ContextMenu key is shared-18 ok.
  const [contextMenu] = nodes(row, n => n.props?.trigger !== undefined);
  assert.equal(contextMenu.props.disabled, false);
});

test('DiffCounts (c60636ac6 Xe), the Dismiss button and the verb (Fke) as generated', async () => {
  const counts = render(h(Counts.DiffCounts, { added: 1200, removed: 1, className: 'x' }));
  assert.match(counts, /^<span class="tabular-nums x"><span class="sr-only">/);
  assert.match(counts, /1,200 additions/);
  assert.match(counts, /1 deletion/);
  assert.match(counts, /<span class="text-git-added">\+1,200<\/span><span class="text-git-removed">−1<\/span>/);
  // C2-6: the band's Dismiss (c0b46114c b) inks text-muted-as-secondary by default.
  const Dismiss = await server.ssrLoadModule('/src/generated/session-rail-changes/dismiss-button.mjs');
  const dismiss = render(h(Dismiss.DismissButton, { onClick() {} }));
  assert.match(dismiss, /aria-label="Dismiss"/);
  assert.match(dismiss, /class="[^"]*shrink-0 text-muted-as-secondary hover:text-primary[^"]*"/);
  const verb = render(h(Verb.ChangesRowVerb, { label: 'Commit changes', onClick() {}, leftWithFocusRef: { current: null } }));
  assert.match(verb, /^<span role="none" class="contents">/);
  assert.match(verb, /<span class="truncate">Commit changes<\/span>/);
  assert.match(verb, /data-cds="Button"/);
});

test('R4i-rail fix: the GitHub CLI hint (Zje In = Oge) on the rail PR row, from the band hint and its handlers', () => {
  const { SessionRailChanges } = Adapters;
  // 3.6556.2: Zje builds `In = x && Nn ? f(Oge, {cause: Nn, onRunInTerminal: qe})` and hands it to EL as prStatusHint;
  // Oge is c219730b0's export v (ni), the hint card the band also renders.
  const transcript = raw(TRANSCRIPT);
  assert.equal(occurrences(transcript, 'x&&Nn?f(Oge,{cause:Nn,onRunInTerminal:qe}):void 0'), 1);
  assert.equal(occurrences(transcript, 'prStatusHint:In'), 1);
  assert.equal(occurrences(transcript, 'showGithubStatusHint:x'), 1);
  assert.equal(occurrences(transcript, 'v as Oge'), 1);
  assert.equal(occurrences(raw('c219730b0-DGG9iA8k.js'), ',ni as v,'), 1);
  const committed = status({ workingTreeDirty: false });
  const prAction = { mode: 'create', onPrimary() {}, onSelectMode() {} };
  const row = hint => render(inRow(h(SessionRailChanges, { status: committed, diffOpenable: true, prAction, hint })));
  const missing = row({ cause: 'gh_unavailable', onInstall() {}, onRunInTerminal: null });
  assert.match(missing, /GitHub CLI unavailable/);
  assert.match(missing, /class="[^"]*sg-gh-hint[^"]*"/);
  assert.match(missing, /aria-haspopup="dialog"/);
  assert.match(row({ cause: 'gh_signed_out', onRunInTerminal() {} }), /GitHub CLI signed out/);
  for (const none of [null, undefined, { cause: null }]) assert.doesNotMatch(row(none), /GitHub CLI/);
  // The wiring: main.jsx hands the band's hint and handlers to the rail host, source-session-rail.jsx to the card.
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(main, 'hint: bandPr?.hint ? { cause: bandPr.hint, onInstall: (url) => call("external", { url })'), 1);
  const railSource = fs.readFileSync(path.join(app, 'src/source-session-rail.jsx'), 'utf8');
  assert.equal(occurrences(railSource, 'hint={changes?.hint ?? null}'), 1);
});
