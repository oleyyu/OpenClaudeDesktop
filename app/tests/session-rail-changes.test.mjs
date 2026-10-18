// R4f-rail SR-4: the session rail's Changes row (c96d752d0 OLe's `data-rail-changes-row` branch with its menu, counts and
// verb), generated from the installed 2.42304.0 originals into src/generated/session-rail-changes
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

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-rail-changes');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const TRANSCRIPT = 'c96d752d0-BOCqU7c2.js';
// A class string as React writes it into an attribute, as a RegExp source.
const attr = text => text.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let previousWindow, previousDocument;
let server, Row, Verb, Counts, Rail, Adapters, KitChip, KitRows, PrRows;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); nothing else reads the document in SSR.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  // A Linux user agent: the keybinding table (shared-19 e9) and the Mac test (code-current isMacUserAgent) read it.
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
// The flat rail (D10): rD hands the Changes card the "row" layout (c0a531389 O = kit ChangesRowLayoutContext).
const inRow = node => h(KitChip.ChangesRowLayoutContext.Provider, { value: 'row' }, node);
const status = (patch = {}) => ({ isRepo: true, cwd: '/work/claude-ui-lab', repoName: 'claude-ui-lab', branch: 'feature/rail', hasChanges: true,
  workingTreeDirty: true, added: 12, removed: 3, comparison: { base: 'main', behind: 0 }, ...patch });

test('generator: the originals still match 2.42304.0 and src/generated/session-rail-changes is current', async () => {
  const checked = await extractSessionRailChanges({ check: true });
  assert.equal(checked.referenceVersion, '2.42304.0');
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  assert.equal(fs.existsSync(path.join(app, 'scripts/verify-gen-session-rail-changes.mjs')), true, 'prepare-ui verifies it (D0)');
});

test('feature strings: research §1.5 counts in c96d752d0 and the strings in the generated row', () => {
  const transcript = raw(TRANSCRIPT);
  assert.equal(occurrences(transcript, 'data-rail-changes-row'), 1);
  assert.equal(occurrences(transcript, '"Open changes, {added, number} added'), 2, 'row and stacked branches of OLe');
  assert.equal(occurrences(transcript, 'data-session-rail-flat'), 2);
  const row = generated('changes-row.mjs');
  for (const needle of ['"data-rail-changes-row": ""', '"Open changes, {added, number} added, {removed, number} removed"', 'name: "ChangesPlusMinus"',
    '"More options for {title}"', 'if (n === null && j === "row") {', 'Nr("toggleDiff", O)', 'defaultMessage: "View changes"', '"Open review comments"'])
    assert.ok(row.includes(needle), needle);
  assert.equal(occurrences(row, '"Open changes, {added, number} added, {removed, number} removed"'), 2);
  assert.ok(generated('changes-verb.mjs').includes('wrapperClassName: "min-w-0 shrink-0",'));
  assert.ok(generated('pr-bar-labels.mjs').includes('commit: { defaultMessage: "Commit changes", id: "PQy14pRnLi" },'));
  assert.ok(generated('diff-counts.mjs').includes('addedClassName: a = "text-git-added",'));
});

test('one copy: kit contexts and row parts, view-tabs public names (D1), files-changes openAfterCheck, no context sliced', () => {
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const kit = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/session-rail-kit/manifest.json'), 'utf8'));
  const published = new Set(Object.keys(viewTabs.publicNames));
  for (const m of manifest.modules) {
    // R4i-rail RL2: c96d752d0 Jz (the PR bar layout, "band" by default) lives only in pr-rows.mjs; eze's rail stand-in
    // provides "rail".
    assert.deepEqual(m.contexts, m.target === 'pr-rows.mjs' ? ['Jz'] : undefined, `${m.target} instantiates no other context`);
    for (const i of m.imports) {
      assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
      if (i.kind === 'view-tabs') assert.ok(published.has(i.name), `${m.target} imports view-tabs ${i.name}`);
      if (i.kind === 'session-rail-kit') assert.ok(kit.publicNames[i.name], `${m.target} imports kit ${i.name}`);
    }
  }
  const row = manifest.modules.find(m => m.target === 'changes-row.mjs');
  assert.deepEqual(row.bindings.map(b => b.name).sort(), ['OLe', 'aB', 'kLe'].sort());
  const imported = local => row.imports.find(i => i.local === local);
  // c0a531389 t / r (cf74bc599 i_ / r_): the face and row layout contexts rD provides, one instance (the kit's).
  assert.deepEqual([imported('ZCe').kind, imported('ZCe').name], ['session-rail-kit', 'BranchChipFaceContext']);
  assert.deepEqual([imported('XCe').kind, imported('XCe').name], ['session-rail-kit', 'ChangesRowLayoutContext']);
  assert.deepEqual([imported('aue').name, imported('vf').name, imported('Kc').name], ['RAIL_ROW_CLASS', 'RailRowIcon', 'RAIL_POPUP_COLLISION_PADDING']);
  assert.deepEqual([imported('Ps').name, imported('os').name, imported('Ss').name, imported('Ts').name], ['CdsDropdown', 'CdsTooltip', 'CdsButton', 'CdsTooltipProvider']);
  // c0cdf4a08 h holds the pending menu check (module state): files-changes' copy, imported.
  const menu = manifest.modules.find(m => m.target === 'row-context-menu.mjs');
  assert.deepEqual(menu.imports.find(i => i.local === 'h'), { local: 'h', from: '../files-changes/menu-open-gate.mjs', name: 'openAfterCheck',
    via: 'c0cdf4a08-h228IL-P.js:h', kind: 'files-changes', original: 'c0cdf4a08-h228IL-P.js:h' });
  // Adapters: the kit's intl / layer / toasts, the desktop-app test and the menu items renderer (view-tabs has no name);
  // R4i-rail RL2: the PR rows' wB (tile store), the one copies of Yz / qz / pE in the sibling rail areas, and the
  // PR panel / in-app link / hover card sources the host does not have.
  const adapters = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.original));
  assert.deepEqual([...new Set(adapters)].sort(), ['shared-25-DP8p7i1Z.js:ml', 'shared-52-DGviI8xb.js:Sj', 'shared-frame-BfjMqbuN.js:Ya', 'shared-frame-BfjMqbuN.js:iC',
    'shared-frame-BfjMqbuN.js:qa', 'vendor-intl-Db7hDWRO.js:Gt', 'vendor-intl-Db7hDWRO.js:q',
    'c96d752d0-BOCqU7c2.js:wB', 'c96d752d0-BOCqU7c2.js:Yz', 'c96d752d0-BOCqU7c2.js:qz', 'shared-20-B7UqYfsi.js:pE', 'c227f4d5e-Ba-r--Rl.js:Nw',
    'cc6e65d4b-CKlso-Pn.js:f', 'c60636ac6-DF2ym4tP.js:ct', 'c60636ac6-DF2ym4tP.js:lt'].sort());
  // The callers are pinned, not sliced.
  for (const binding of ['iB', 'ELe', 'wB', 'oRe', 'eze', 'nze', '$Re', 'fC', 'pC', 'O_'])
    assert.ok(manifest.callSites.some(site => site.binding === binding), binding);
  assert.ok(manifest.callSites.some(site => site.raw && site.features.some(f => f.includes('u(r_.Provider,{value:R?"row":"stacked",children:t})'))));
});

test('OLe (ChangesRow): no PR link and the "row" layout render the flat rail row; the default layout is stacked', () => {
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
  // The branch face (c0a531389 t = kit BranchChipFaceContext; rD gives "sans" in the flat rail) only reaches the
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

test('SessionRailChanges: eze / oRe / wB around the row, from the local git status', () => {
  const { SessionRailChanges } = Adapters;
  assert.equal(render(inRow(h(SessionRailChanges, { status: { isRepo: false } }))), '', 'no repository: eze renders nothing');
  assert.equal(render(inRow(h(SessionRailChanges, { status: null }))), '');
  const nav = `<nav aria-label="Repository and pull request controls" class="${attr(Rail.RAIL_PR_BAR_NAV_CLASS)}">`;
  assert.equal(Rail.RAIL_PR_BAR_NAV_CLASS, 'flex flex-col gap-1 empty:hidden');
  // A clean branch: the nav stays empty, so rD's `has-[nav:not(:empty)]:flex` keeps the card hidden.
  assert.match(render(inRow(h(SessionRailChanges, { status: status({ hasChanges: false, added: 0, removed: 0 }) }))), new RegExp(`^${nav}</nav>$`));
  const live = render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, onOpenChanges() {}, onToggleChanges() {},
    verb: { mode: 'commit', onClick() {}, disabled: false } })));
  assert.match(live, new RegExp(`^${nav}<ul role="list" class="flex flex-col gap-1"><li class="flex flex-col"><div role="none" class="flex min-w-0 flex-col gap-sm">`));
  assert.match(live, /data-rail-changes-row=""/);
  assert.match(live, /aria-label="Open changes, 12 added, 3 removed"/);
  assert.match(live, />Commit changes<\/span>/);
  assert.match(live, /aria-label="More options for feature\/rail"/);
  assert.doesNotMatch(live, /claude-ui-lab<\/span>/, 'a single repo hides its name (eze hideRepo)');
  // The Changes pane cannot open: counts as text, no ⋮ (nze `ze` false).
  const closed = render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: false, verb: { mode: 'commit' } })));
  assert.doesNotMatch(closed, /Open changes/);
  assert.doesNotMatch(closed, /More options for/);
  assert.doesNotMatch(closed, /\+12/, 'nze _n: no counts unless the diff can open');
  // A disabled commit carries its reason in the CDS disabled-reason wrapper; view / none have no verb.
  const disabled = render(inRow(h(SessionRailChanges, { status: status({ workingTreeDirty: false }), diffOpenable: true,
    verb: { mode: 'commit', disabled: true, disabledReason: 'No changes to commit' } })));
  assert.match(disabled, /data-cds-disabled-reason-wrapper=""/);
  assert.match(disabled, /No changes to commit/);
  assert.match(disabled, /disabled=""/);
  // R4i-rail RL2: nze `Wt = yze(V, …)`: with a pull request the row is in view mode, so iB shows no verb (the rail-only
  // Merge / Ready verb has no host source).
  assert.doesNotMatch(render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, verb: { onClick() {} },
    pr: { number: 7, url: 'https://github.com/o/r/pull/7', state: 'open', title: 'Rail' } }))), /Commit changes/);
  // Several repos show the name (hideRepo false): wze, the repo name.
  assert.match(render(inRow(h(SessionRailChanges, { status: status(), diffOpenable: true, hideRepo: false }))),
    /<span class="min-w-0 truncate text-muted-as-secondary">claude-ui-lab<\/span>/);
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
  internal.H = hooks;
  try { return component(props); } finally { internal.H = old; }
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate), ...nodes(tree.props?.trigger, predicate), ...nodes(tree.props?.verb, predicate)];
}

test('handlers: counts open Changes, the menu toggles it, the verb sends the commit, the chord labels the button', () => {
  const calls = [];
  const outer = shallow(Adapters.SessionRailChanges, { status: status(), diffOpenable: true, diffOpenHasChord: true,
    onOpenChanges: () => calls.push('open'), onToggleChanges: () => calls.push('toggle'), verb: { onClick: () => calls.push('commit') } });
  // R4i-rail RL2: eze (Jz "rail" > nav > oRe over tRe's shape) > wB (li) > iB (memo) > OLe.
  assert.equal(outer.props.value, 'rail');
  const [rows] = nodes(outer, n => n.type === PrRows.RailPrRows);
  assert.equal(rows.props.shape.rows.length, 1);
  const [entry] = rows.props.shape.rows;
  const item = shallow(Adapters.RailPrListItem, { entry });
  const [barRow] = nodes(item, n => n.type === PrRows.PrBarRow);
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
  assert.equal(tooltip.props.shortcut, 'cmd+shift+d', 'shared-19 W7 toggleDiff for isClaudeApp');
  // The ⋮ / context menu body (kLe): View changes toggles (onDiffClick).
  const [menu] = nodes(row, n => n.type === Row.ChangesRowMenuItems);
  const items = shallow(Row.ChangesRowMenuItems, menu.props);
  const view = nodes(items, n => n.props?.children?.props?.defaultMessage === 'View changes');
  assert.equal(view.length, 1);
  view[0].props.onClick();
  assert.deepEqual(calls, ['commit', 'open', 'toggle']);
  // The row's context menu is enabled once a menu entry exists (U); its keyboard ContextMenu key is ca7840910 U.
  const [contextMenu] = nodes(row, n => n.props?.trigger !== undefined);
  assert.equal(contextMenu.props.disabled, false);
});

test('DiffCounts (c60636ac6 Xe) and the verb (DLe) as generated', () => {
  const counts = render(h(Counts.DiffCounts, { added: 1200, removed: 1, className: 'x' }));
  assert.match(counts, /^<span class="tabular-nums x"><span class="sr-only">/);
  assert.match(counts, /1,200 additions/);
  assert.match(counts, /1 deletion/);
  assert.match(counts, /<span class="text-git-added">\+1,200<\/span><span class="text-git-removed">−1<\/span>/);
  const verb = render(h(Verb.ChangesRowVerb, { label: 'Commit changes', onClick() {}, leftWithFocusRef: { current: null } }));
  assert.match(verb, /^<span role="none" class="contents">/);
  assert.match(verb, /<span class="truncate">Commit changes<\/span>/);
  assert.match(verb, /data-cds="Button"/);
});

test('R4i-rail fix: the GitHub CLI hint (nze Un = kye) on the rail PR row, from the band hint and its handlers', () => {
  const { SessionRailChanges } = Adapters;
  // 2.42304.0: nze builds `Un = w && Hn ? b(kye, {cause: Hn, onRunInTerminal: ct})` and hands it to iB as prStatusHint;
  // kye is c219730b0's export x (dn), the hint card the band also renders.
  const transcript = raw(TRANSCRIPT);
  assert.equal(occurrences(transcript, 'let Un=C(()=>w&&Hn?b(kye,{cause:Hn,onRunInTerminal:ct}):void 0,[w,Hn,ct])'), 1);
  assert.equal(occurrences(transcript, 'showGithubStatusHint:w'), 1);
  assert.equal(occurrences(transcript, 'x as kye'), 1);
  assert.equal(occurrences(raw('c219730b0-B08P7Rqk.js'), 'dn as x'), 1);
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
