// R4i-rail RL2: the session rail's PR rows. The generated 2.42304.0 c96d752d0 iB (PrBarRow) / oRe (RailPrRows) / sRe
// (RailPrHistory) with tRe / aRe / dLe (src/generated/session-rail-changes/pr-rows.mjs, scripts/extract-session-rail-changes.mjs),
// and the host stand-in for nze / eze's rail branch (src/source-session-rail-changes-adapters.jsx railPrEntries /
// SessionRailChanges) over the band's own data: the branch's pull request from the GitHub CLI lookup and the band's
// Create PR action, as fixtures here (no gh, no network, no external process). The band follows cc43287c9 Mte's
// `mr = tp(Zn, e => e.railMode)` (tests/session-rail-mount.test.mjs). Source pins, Vite SSR renders, a fake DOM mount
// and handlers reached through a hook dispatcher.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const TRANSCRIPT = 'c96d752d0-BOCqU7c2.js';

let server, Adapters, PrRows, KitChip, Changes, previousWindow, previousDocument;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); the keybinding table reads the agent.
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: undefined, matchMedia: undefined, navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-changes-adapters.jsx');
  PrRows = await server.ssrLoadModule('/src/generated/session-rail-changes/pr-rows.mjs');
  KitChip = await server.ssrLoadModule('/src/generated/session-rail-kit/branch-chip.mjs');
  Changes = await server.ssrLoadModule('/src/generated/session-rail/pr-count-context.mjs');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? '')) };
const status = (patch = {}) => ({ isRepo: true, cwd: '/work/claude-ui-lab', repoName: 'claude-ui-lab', branch: 'feature/rail', hasChanges: true,
  workingTreeDirty: false, added: 12, removed: 3, comparison: { base: 'main', ahead: 2, unpushed: 0 }, ...patch });
// The GitHub CLI lookup's record (electron/git-pull-request.cjs parsePullRequest), as main.jsx bandPrView holds it.
const pr = (patch = {}) => ({ number: 42, url: 'https://github.com/acme/claude-ui-lab/pull/42', state: 'open', title: 'Rail PR rows',
  baseRefName: 'develop', headRefName: 'feature/rail', ci: 'passed', checks: { passed: 3, failed: 0, pending: 0, skipped: 0, total: 3 }, ...patch });
const inRow = (node) => h(KitChip.ChangesRowLayoutContext.Provider, { value: 'row' }, node);
const render = (props) => renderToStaticMarkup(inRow(h(Adapters.SessionRailChanges, { diffOpenable: true, onOpenChanges() {}, onToggleChanges() {}, ...props })));

// A hook dispatcher (as tests/session-rail-changes.test.mjs): one component level, so handlers can be reached.
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

test('2.42304.0 pins: iB / oRe / sRe, nze\'s rail entries and eze\'s rail shape, the band yielding to railMode', () => {
  const transcript = official(TRANSCRIPT);
  for (const needle of ['iB=M(', 'oRe=M(', 'function sRe(', 'function OLe(', '{defaultMessage:"#{number}",id:"rj4hoKw+Qf"}',
    'defaultMessage:"{count} merged",id:"WQh7w3BsRk"', '{# earlier pull request}', 'facts:{prState:ye,ciStatus:An}', 'railVerb:Ln', 'ciSlot:jn',
    'reviewComments:Cn', 'dLe(Ee?je.prCount:null)', 'return tRe(e)', '`ready-${V.number}`', '`merge-${V.number}`',
    'Ee&&b(oRe,{shape:je,controls:Me,announcement:Ne})', 'n===null&&j==="row"'])
    assert.equal(count(transcript, needle), 1, needle);
  assert.equal(count(transcript, 'defaultMessage:"View pull request",id:"LOl+FrY/8x"'), 2, 'iB and the PR link menu');
  assert.equal(count(transcript, 'prLinkOpensInApp:!He'), 2, 'nze dr and fr');
  const session = official('cc43287c9-DAfOi8yP.js');
  assert.equal(count(session, 'mr=tp(Zn,e=>e.railMode)'), 1);
  assert.equal(count(session, 'tn||on||ua||mr?null:'), 1);
  assert.equal(count(official('cf74bc599-D9NZWRyl.js'), '{count, plural, one {# pull request} other {# pull requests}}'), 1);
  // The generated module keeps the originals' text.
  const generated = read('src/generated/session-rail-changes/pr-rows.mjs');
  for (const needle of ['Y = (e ?? oe) === "rail",', 'numberText: g,', 'icon: b(tB, { status: F }),', 'children: c.map((e) => b(wB, { entry: e }, e.rowKey)),',
    'historyMerged: a.filter((e) => e.facts.prState === "merged").length,', 'if (t) return (t(e), () => t(null));', 'var Jz = E("band");'])
    assert.ok(generated.includes(needle), needle);
  const manifest = JSON.parse(read('src/generated/session-rail-changes/manifest.json'));
  const module = manifest.modules.find((m) => m.target === 'pr-rows.mjs');
  assert.deepEqual(Object.keys(module.exports).sort(), ['CB', 'JB', 'Jz', 'SB', 'SLe', 'WB', 'aRe', 'dLe', 'iB', 'nB', 'oRe', 'qB', 'sRe', 'tB', 'tRe', 'xLe', 'yze'].sort());
  // wB is the host list item (the tile store is not sliced); qz is the session rail area's one instance.
  assert.equal(module.imports.find((i) => i.local === 'wB').name, 'RailPrListItem');
  assert.equal(module.imports.find((i) => i.local === 'qz').name, 'RailPrCountContext');
  assert.equal(module.imports.find((i) => i.local === 'ple').kind, 'session-rail-kit');
});

test('railPrEntries (nze rail entries over the host): view / merged modes, facts, link props, no rail-only sources', () => {
  const opened = [];
  const [entry] = Adapters.railPrEntries({ intl, status: status(), pr: pr(), diffOpenable: true, onOpenPr: (url) => opened.push(url) });
  assert.equal(entry.primary, true);
  assert.equal(entry.history, false);
  assert.deepEqual(entry.facts, { prState: 'open', ciStatus: 'passed' });
  assert.equal(entry.row.prMode, 'view', 'yze: an open PR is view');
  assert.equal(entry.row.prNumber, 42);
  assert.equal(entry.row.prTitle, 'Rail PR rows');
  assert.equal(entry.row.baseBranch, 'develop', 'nze rr: the PR base before the repo base');
  assert.deepEqual(entry.row.diff, { added: 12, removed: 3 });
  assert.equal(entry.row.prLinkOpensInApp, false);
  for (const key of ['railVerb', 'ciSlot', 'reviewComments', 'onOpenPrPanel', 'prMenuItems', 'onDismiss']) assert.equal(entry.row[key], undefined, key);
  entry.row.onPrIconClick();
  assert.deepEqual(opened, ['https://github.com/acme/claude-ui-lab/pull/42']);
  assert.equal(Adapters.railPrEntries({ intl, status: status(), pr: pr({ state: 'merged' }) })[0].row.prMode, 'merged');
  assert.equal(Adapters.railPrEntries({ intl, status: status(), pr: pr({ state: 'queued' }) })[0].row.prMode, 'queued');
  assert.equal(Adapters.railPrEntries({ intl, status: status(), pr: pr({ ci: undefined }) })[0].row.ciStatus, undefined, 'no checks: no CI glyph');
  assert.equal(Adapters.railPrEntries({ intl, status: status(), pr: pr({ state: 'weird' }) })[0].row.prState, undefined);
  // fze: a PR keeps the row on a clean branch; no PR and no changes: no row; no repository: no entries.
  assert.equal(Adapters.railPrEntries({ intl, status: status({ hasChanges: false, added: 0, removed: 0 }), pr: pr() }).length, 1);
  assert.deepEqual(Adapters.railPrEntries({ intl, status: status({ hasChanges: false }) }), []);
  assert.deepEqual(Adapters.railPrEntries({ intl, status: { isRepo: false }, pr: pr() }), []);
  // The core's codeDesktop.pr binding (branchPullRequest fromSession: state open, no CI) is a PR row as well.
  const bound = Adapters.railPrEntries({ intl, status: status(), pr: { number: 9, url: 'https://github.com/a/b/pull/9', state: 'open', title: null, ci: undefined, checks: null, fromSession: true } });
  assert.equal(bound[0].row.prTitle, undefined);
  assert.equal(bound[0].row.prMode, 'view');
});

test('railPrEntries without a PR: the band\'s Create PR action (nze dn radio items) or the commit verb', () => {
  const calls = [];
  const prAction = { mode: 'draft', label: 'Create draft PR', manualUrl: 'https://github.com/a/b/compare/main...feature/rail?expand=1', hint: null,
    busy: false, onPrimary: (mode) => calls.push(['primary', mode]), onSelectMode: (mode) => calls.push(['select', mode]) };
  const [entry] = Adapters.railPrEntries({ intl, status: status(), prAction, verb: { onClick: () => calls.push(['commit']) } });
  assert.equal(entry.row.prMode, 'draft');
  assert.equal(entry.facts.prState, undefined);
  const items = entry.row.prMenuItems;
  assert.deepEqual(items.map((i) => [i.label, i.checked, i.checkedRole, i.separatorBefore === true]),
    [['Create PR', false, 'radio', false], ['Create draft PR', true, 'radio', false], ['Manually create PR', false, 'radio', true]]);
  items[0].onSelect(); items[2].onSelect(); entry.row.onPrClick();
  assert.deepEqual(calls, [['select', 'create'], ['primary', 'create'], ['select', 'compose'], ['primary', 'draft']]);
  // The lookup still runs: Create PR waits with its reason (pullRequestAction disabledReason).
  const waiting = Adapters.railPrEntries({ intl, status: status(), prAction: { ...prAction, mode: 'create', disabledReason: 'Checking for an existing pull request' } })[0].row;
  assert.deepEqual([waiting.prDisabled, waiting.prDisabledReason], [true, 'Checking for an existing pull request']);
  // No Create PR on offer (a dirty tree, no GitHub origin): the commit verb, no radio items.
  const commit = Adapters.railPrEntries({ intl, status: status({ workingTreeDirty: true }), verb: { onClick: () => calls.push(['commit']), disabled: false } })[0].row;
  assert.equal(commit.prMode, 'commit');
  assert.equal(commit.prMenuItems, undefined);
  commit.onPrClick();
  assert.deepEqual(calls.at(-1), ['commit']);
  // An existing PR wins over a stale create action.
  assert.equal(Adapters.railPrEntries({ intl, status: status(), pr: pr(), prAction })[0].row.prMode, 'view');
});

test('SessionRailChanges with a PR: OLe\'s link row (state glyph, title link, #number, CI glyph), no verb, the ⋮ menu', () => {
  const html = render({ status: status(), pr: pr(), verb: { onClick() {} }, onOpenPr() {} });
  assert.match(html, /^<nav aria-label="Repository and pull request controls" class="flex flex-col gap-1 empty:hidden"><ul role="list" class="flex flex-col gap-1"><li class="flex flex-col">/);
  assert.doesNotMatch(html, /data-rail-changes-row/, 'a PR link is OLe\'s link layout, not the flat changes row');
  assert.match(html, /<span role="img" aria-label="Open" class="inline-flex shrink-0 text-git-opened">/, 'xLe open glyph, Bc label');
  assert.match(html, /<a href="https:\/\/github\.com\/acme\/claude-ui-lab\/pull\/42" target="_blank" rel="noopener" class="min-w-0 truncate text-primary hover:underline focus-visible:underline focus-visible:outline-none">Rail PR rows<\/a>/);
  assert.match(html, /<span class="shrink-0">#42<\/span>/);
  assert.match(html, /aria-label="CI: all checks passed"/);
  assert.match(html, /bg-\[var\(--cds-text-git-opened\)\]/, 'tB passed dot');
  assert.match(html, /aria-label="More options for Rail PR rows"/);
  assert.match(html, /aria-label="Open changes, 12 added, 3 removed"/);
  assert.doesNotMatch(html, /Commit changes|Create PR/, 'view mode: no verb (no host Merge / Ready verb)');
  // Merged: the accent mode drops the counts and the CI glyph (iB `ce`), the glyph is the merged one.
  const merged = render({ status: status(), pr: pr({ state: 'merged' }) });
  assert.match(merged, /aria-label="Merged" class="inline-flex shrink-0 text-git-merged"/);
  assert.doesNotMatch(merged, /CI: all checks passed|Open changes,/);
  // Failing and pending CI.
  assert.match(render({ status: status(), pr: pr({ ci: 'failed' }) }), /aria-label="CI: checks failing"/);
  assert.match(render({ status: status(), pr: pr({ ci: 'pending' }) }), /aria-label="CI: checks in progress"/);
  // A draft with a warning from the lookup.
  const draft = render({ status: status(), pr: pr({ state: 'draft' }), warning: 'GitHub is unreachable. Pull request status may be out of date.' });
  assert.match(draft, /aria-label="Draft" class="inline-flex shrink-0 text-git-draft"/);
  assert.match(draft, /aria-label="GitHub is unreachable\. Pull request status may be out of date\."/);
  // No PR, Create PR on offer: the verb is the create mode's label.
  const create = render({ status: status(), prAction: { mode: 'create', onPrimary() {}, onSelectMode() {} } });
  assert.match(create, /data-rail-changes-row=""/);
  assert.match(create, /<span class="truncate">Create PR<\/span>/);
});

test('the ⋮ menu of a PR row: Open on GitHub (the host opener first), Copy link, View changes; the create menu renders its radio items', async () => {
  const opened = [];
  const [entry] = Adapters.railPrEntries({ intl, status: status(), pr: pr(), diffOpenable: true, onToggleChanges() {}, onOpenPr: (url) => opened.push(url) });
  const row = shallow(PrRows.PrBarRow.type, { ...entry.row, layout: 'rail' }, new Map([[PrRows.PrBarLayoutContext, 'rail']]));
  const Row = await server.ssrLoadModule('/src/generated/session-rail-changes/changes-row.mjs');
  assert.equal(row.type, Row.ChangesRow);
  assert.equal(row.props.link.numberText, '#42');
  assert.equal(row.props.link.openOnHostLabel, 'Open on GitHub');
  assert.equal(row.props.link.anchorProps.href, 'https://github.com/acme/claude-ui-lab/pull/42');
  const menu = shallow(Row.ChangesRowMenuItems, { link: row.props.link, onDiffClick() {} });
  const labels = [];
  const walk = (node) => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node.props?.children === 'string') labels.push([node.props.children, node]); walk(node.props?.children); };
  walk(menu);
  const open = labels.find(([label]) => label === 'Open on GitHub')[1];
  open.props.onClick();
  assert.deepEqual(opened, ['https://github.com/acme/claude-ui-lab/pull/42'], 'kLe calls onExternalClick (the host opener) before openWindow');
  // The create-mode items go through the generated renderMenuItems (shared-frame iC), no longer an empty stand-in.
  const items = Adapters.railPrEntries({ intl, status: status(), prAction: { mode: 'create', onPrimary() {}, onSelectMode() {} } })[0].row.prMenuItems;
  const rendered = Adapters.renderMenuItems(items);
  assert.equal(rendered.filter(Boolean).length, 3);
});

test('rail shape: tRe rows vs history, five rows before Show more, sRe "{count} earlier pull requests" with "{count} merged"', () => {
  const row = (number, state, history) => ({ rowKey: `k#${number}`, primary: number === 1, history, facts: { prState: state, ciStatus: undefined },
    row: { prState: state, prNumber: number, prUrl: `https://github.com/a/b/pull/${number}`, prTitle: `PR ${number}`, branchName: `b${number}`, prMode: 'view' } });
  const shape = PrRows.railRowsShape([row(1, 'open', false), row(2, 'merged', true), row(3, 'closed', true)]);
  assert.deepEqual([shape.rows.length, shape.history.length, shape.historyMerged, shape.prCount], [1, 2, 1, 3]);
  const controls = { state: { showAll: false, historyOpen: false }, onToggleShowAll() {}, onHistoryOpenChange() {} };
  const html = renderToStaticMarkup(inRow(h(PrRows.PrBarLayoutContext.Provider, { value: 'rail' },
    h(PrRows.RailPrRows, { shape, controls, announcement: { text: '', nonce: 0 } }))));
  assert.match(html, /2 earlier pull requests/);
  assert.match(html, /1 merged/);
  const many = PrRows.railRowsShape([1, 2, 3, 4, 5, 6].map((n) => row(n, 'open', false)));
  assert.equal(PrRows.railRowsOverflow(many), true);
  assert.equal(PrRows.railShownRows(many, false).length, 5);
  const more = renderToStaticMarkup(inRow(h(PrRows.PrBarLayoutContext.Provider, { value: 'rail' },
    h(PrRows.RailPrRows, { shape: many, controls, announcement: { text: '', nonce: 0 } }))));
  assert.match(more, />Show more</);
  assert.equal(count(more, '<li class="flex flex-col">'), 5);
  // The host has one row per session (the lookup answers the branch's own PR): no Show more, no history.
  const one = render({ status: status(), pr: pr() });
  assert.doesNotMatch(one, /Show more|earlier pull request/);
});

test('mounted: dLe reports the PR count to the Changes card (qz), the title link opens through the host', async () => {
  const counts = [];
  const opened = [];
  await withPreviewDom(async (dom) => {
    // The fake DOM's window has no timers or user agent of its own (as tests/session-rail-mount.test.mjs prepare()).
    Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' } });
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    const tree = (props) => h(Changes.RailPrCountContext.Provider, { value: (n) => counts.push(n) },
      inRow(h(Adapters.SessionRailChanges, { status: status(), diffOpenable: true, onOpenPr: (url) => opened.push(url), ...props })));
    await act(async () => { root.render(tree({ pr: pr() })); });
    assert.equal(counts.at(-1), 1, '"1 pull request" in the card summary');
    const link = container.querySelector('a[href="https://github.com/acme/claude-ui-lab/pull/42"]');
    assert.ok(link);
    let prevented = false;
    reactProps(link).onClick({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, preventDefault() { prevented = true; } });
    assert.deepEqual(opened, ['https://github.com/acme/claude-ui-lab/pull/42']);
    assert.equal(prevented, false, 'iB prevents the default only for the in-app PR panel');
    await act(async () => { root.render(tree({ pr: null })); });
    assert.equal(counts.at(-1), 0, 'no PR: count 0 (no summary)');
    await act(async () => { root.unmount(); });
    assert.equal(counts.at(-1), null, 'dLe clears its report on unmount');
  });
});

test('main.jsx: the rail rows reuse the band\'s data; the band hides by railMode; zh-CN covers the new copy', async () => {
  const main = read('src/main.jsx');
  assert.equal(count(main, 'pr: bandPrView, prAction: bandPr, onOpenPr: (url) => call("external", { url }).catch(actionFailed("open-link")),'), 1);
  // R4i-rail fix: the band's GitHub CLI hint rides along (nze Un = kye on the row), since the band is hidden in rail mode.
  assert.equal(count(main, 'hint: bandPr?.hint ? { cause: bandPr.hint,'), 1);
  assert.equal(count(main, 'verb: { onClick: sendCommitTurn, disabled: commitDisabled, disabledReason: commitDisabledReason },'), 1);
  assert.equal(count(main, '!railHidesBand && (bandStatus ?'), 1);
  assert.equal(count(main, 'call("workspace-pull-request"'), 1, 'no new lookup: the band\'s one gh query');
  const rail = read('src/source-session-rail.jsx');
  assert.ok(rail.includes('hint={changes?.hint ?? null} pr={changes?.pr ?? null} prAction={changes?.prAction ?? null} onOpenPr={changes?.onOpenPr}'));
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  for (const key of ['View pull request', 'Your turn', 'Their turn', '{count} merged', '{count, plural, one {# earlier pull request} other {# earlier pull requests}}',
    'Open on {host}', 'Copy link', 'CI: all checks passed', 'Create PR', 'Create draft PR', 'Manually create PR', 'Show more'])
    assert.ok(Object.hasOwn(zh, key), key);
});
