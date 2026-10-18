import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { sidebarEnvironment, sidebarRemoteEnvironment, sidebarEnvironmentPlace } from '../src/generated/code-current/sidebar-details-model.mjs';
import { sidebarAscendingComparators, sidebarDescendingComparators } from '../src/generated/code-current/sidebar-sort-order.mjs';
import { currentSidebarComparator, sidebarSortRecord } from '../src/sidebar-filter-current-model.mjs';
import { currentSidebarDetails } from '../src/sidebar-details-current-model.mjs';
import zhSidebar from '../electron/i18n/zh-CN/sidebar.mjs';

// R2-sidebar step 2 (map-cc-sidebar, SC-4): the seven sidebar helpers that changed between 2.37337.1 and 2.42304.0
// (PR card, row details model/view, status glyph, sort order, search field, group view) now come from 2.42304.0.
// Only source text, generated output, SSR and controlled calls are inspected; no window, browser or service.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const viewTabs = JSON.parse(readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
const utilities = readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = target => readFileSync(path.join(generated, target), 'utf8');
const entry = target => manifest.modules.find(module => module.target === target);
const h = React.createElement;
const freshServer = () => createServer({ configFile:false, root:app, plugins:[react()], server:{middlewareMode:true,hmr:false,watch:null}, appType:'custom', logLevel:'error' });
let server, Card, Details, Status, Search, View, Groups, Start, Fizzy, Sidebar;
before(async () => {
  server = await freshServer();
  Card = await server.ssrLoadModule('/src/generated/code-current/sidebar-pr-card.mjs');
  Details = await server.ssrLoadModule('/src/generated/code-current/sidebar-details-view.mjs');
  Status = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
  Search = await server.ssrLoadModule('/src/generated/code-current/sidebar-search.mjs');
  View = await server.ssrLoadModule('/src/generated/code-current/sidebar-group-view.mjs');
  Groups = await server.ssrLoadModule('/src/generated/code-current/sidebar-menu-groups.mjs');
  Start = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  Fizzy = await server.ssrLoadModule('/src/generated/view-tabs/shared-4-CJsHhp5n.js');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
});
after(() => server?.close());

const targets = {
  'sidebar-pr-card.mjs': { file:'shared-20-B7UqYfsi.js', bindings:['_E','vE','yE','bE','xE','SE','CE','wE','TE','OE','AE','jE','ME','NE','VE','HE','UE','WE','GE','KE','qE','JE','YE','XE','ZE','eD'],
    exports:['SidebarDetailTooltip','SidebarPrCard','SidebarPrCardContext','SidebarPrEntry','SidebarPrGlyph','sidebarPrCoveredControl','sidebarPrEntryLabel','sidebarPrMessages','sidebarPrTitle'] },
  'sidebar-details-model.mjs': { file:'shared-20-B7UqYfsi.js', bindings:['PE','FE','IE','uD','dD','tT','fD','pD'],
    exports:['sidebarBranch','sidebarDescription','sidebarEnvironment','sidebarEnvironmentPlace','sidebarFolder','sidebarRemoteEnvironment'] },
  'sidebar-details-view.mjs': { file:'shared-20-B7UqYfsi.js', bindings:['DE','kE','zE','BE','QE','$E','nD'],
    exports:['SidebarDescription','SidebarEnvironmentGlyph','sidebarEnvironmentLabel','sidebarRightDecoration'] },
  'sidebar-status-glyph.mjs': { file:'shared-18-D4XxL6Tg.js', bindings:['CT','TT','jT','MT','PT','fE','pE','uE','TD','ED','DD','PD','FD','ZD'],
    exports:['SidebarStatusGlyph','SidebarStatusLabel','SidebarStatusLayout','SidebarStatusTooltips','sidebarErrorColors','sidebarErrorKind','sidebarErrorShapes','sidebarStatusMessages','useSidebarStatusTooltips'] },
  'sidebar-sort-order.mjs': { file:'shared-21-IP-SVetq.js', bindings:['VR','HR'], exports:['sidebarAscendingComparators','sidebarDescendingComparators'] },
  'sidebar-search.mjs': { file:'shared-21-IP-SVetq.js', bindings:['RF','zF'], exports:['SidebarSearchField','sidebarSearchPlacement'] },
  'sidebar-group-view.mjs': { file:'shared-19-CkPOiIKm.js', bindings:['nZ','oZ','sZ','cZ','lZ','uZ'],
    exports:['SidebarGroupViewItems','SidebarListContext','sidebarGroupToggles','sidebarHasCollapsedGroups','sidebarPrecedingToggles','sidebarToggleVisible'] },
};
const exportsOf = text => [...text.matchAll(/export \{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map(item => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)).sort();
const importsOf = text => [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)].flatMap(([, list, from]) => list.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ name:s.split(/\s+as\s+/)[0], local:s.split(/\s+as\s+/).pop(), from })));

test('the seven changed sidebar helpers are sliced from the installed 2.42304.0 chunks, export names kept', () => {
  for (const [target, expected] of Object.entries(targets)) {
    const module = entry(target), text = read(target);
    assert.equal(module.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(module.source), expected.file, target);
    assert.match(module.source, /installed-2\.42304\.0-20261017\/ion-dist\/assets\/v1\//, target);
    assert.equal(sha(readFileSync(path.join(latest, expected.file))), module.sourceSha256, target);
    assert.equal(sha(text), module.sha256, target);
    assert.deepEqual(module.bindings, expected.bindings, target);
    assert.ok(text.startsWith('// Original Claude Desktop 2.42304.0 bindings'), target);
    assert.deepEqual(exportsOf(text), expected.exports, target);
    // No 2.37337.1 CDS shim, token table or host stand-in for an original function is left in these modules.
    assert.doesNotMatch(text, /cds-badge\.mjs|cds-merge-props\.mjs|cssVar|const (?:wd|Ws|Oe)\b|owner-document\.mjs/, target);
    for (const spec of importsOf(text).filter(spec => spec.from.includes('/view-tabs/')))
      assert.ok(viewTabs.publicNames[spec.name], `${target} imports view-tabs ${spec.name} by a public name`);
  }
  const imports = Object.fromEntries(Object.keys(targets).map(target => [target, importsOf(read(target))]));
  const has = (target, name, local, from) => assert.ok(imports[target].some(s => s.name === name && s.local === local && s.from === from), `${target}: ${name} as ${local} from ${from}`);
  // The new pr-card references: W = shared-4 co (isFizzyLakePartEnabled), Ec = shared-28 Pm, k = vendor-frame ge.
  has('sidebar-pr-card.mjs', 'isFizzyLakePartEnabled', 'W', '../view-tabs/shared-4-CJsHhp5n.js');
  has('sidebar-pr-card.mjs', 'physicalSide', 'Ec', '../sidebar-resize/logical-side.mjs');
  has('sidebar-pr-card.mjs', 'clsx', 'k', '../view-tabs/vendor-frame-DfPJ1QmD.js');
  has('sidebar-pr-card.mjs', 'cdsClassNames', 'ic', '../view-tabs/shared-frame-BfjMqbuN.js');
  assert.ok(!imports['sidebar-pr-card.mjs'].some(s => s.name === 'Fragment'), 'bE no longer needs Fragment');
  has('sidebar-details-view.mjs', 'clsx', 'k', '../view-tabs/vendor-frame-DfPJ1QmD.js');
  has('sidebar-status-glyph.mjs', 'CdsPulse', 'xf', '../view-tabs/shared-frame-BfjMqbuN.js');
  has('sidebar-status-glyph.mjs', 'SidebarCodeErrorGlyph', 'UD', '../../source-sidebar-error-adapters.jsx');
  has('sidebar-group-view.mjs', 'ownerWindow', 'le', './owner-window.mjs');
  assert.equal(Fizzy.isFizzyLakePartEnabled('panels'), false, 'the shipped fizzy-lake part list is empty');
});

test('SC-4: the title PR glyph pads with the 2.42304.0 ps/pe variables, sizes its icon explicitly and keeps the card', () => {
  const one = renderToStaticMarkup(h(Card.SidebarPrGlyph, { pr:{ state:'open', count:1, entries:[] }, place:'title' }));
  const glyph = one.match(/<span aria-hidden="true" data-pr-glyph="open" class="([^"]*)"/)[1];
  assert.equal(glyph, 'flex h-[var(--df-row-ctl)] min-w-[var(--df-row-ctl)] shrink-0 items-center justify-end gap-0.5 ps-[calc((var(--df-row-ctl)-var(--df-pr-glyph,12px))/2)] pe-[calc((var(--df-row-ctl)-var(--df-pr-glyph,12px))/2+max(0px,var(--df-heading-pitch,0px)-var(--df-row-ctl)))] text-footnote text-muted-as-secondary');
  assert.doesNotMatch(one, /px-\[calc\(\(var\(--df-row-ctl\)-12px\)\/2\)\]/);
  // Il (SidebarPrIcon) gets size 12 and bold false: the 0.75rem regular glyph.
  assert.match(one, /font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)/);
  assert.match(one, /font-weight:[0-9.]+/);
  const bold = renderToStaticMarkup(h(Card.SidebarPrGlyph, { pr:{ state:'open', count:1, entries:[] }, place:'line' }));
  assert.match(bold, /class="flex h-4 shrink-0 items-center gap-0\.5"/);
  // The loaded 2.42304.0 utilities carry both new paddings (inside @layer utilities, like every other utility).
  assert.ok(utilities.includes('.ps-\\[calc\\(\\(var\\(--df-row-ctl\\)-var\\(--df-pr-glyph\\,12px\\)\\)\\/2\\)\\]{padding-inline-start:'));
  assert.ok(utilities.includes('.pe-\\[calc\\(\\(var\\(--df-row-ctl\\)-var\\(--df-pr-glyph\\,12px\\)\\)\\/2\\+max\\(0px\\,var\\(--df-heading-pitch\\,0px\\)-var\\(--df-row-ctl\\)\\)\\)\\]{padding-inline-end:'));
  assert.match(utilities, /\.text-muted-as-secondary\{color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\}/);
  // Two entries still open the original preview card (count shown, no eager popup).
  const many = renderToStaticMarkup(h(Card.SidebarPrGlyph, { pr:{ state:'open', count:2, entries:[{ repo:'a/b', number:1, state:'open' }, { repo:'a/c', number:2, state:'open' }] }, place:'title' }));
  assert.match(many, /tabular-nums">2<\/span>/); assert.doesNotMatch(many, /data-cds="PreviewCard"/);
});

test('the PR preview entry follows 2.42304.0: match-parent title, secondary footnote, LTR diff counts, no panels wrapper', () => {
  const record = { repo:'acme/widget', number:12, state:'open', url:'https://github.com/acme/widget/pull/12', title:'Fix', ciState:'failed', additions:9, deletions:2 };
  const html = renderToStaticMarkup(h(Card.SidebarPrEntry, { entry:record }));
  assert.match(html, /<bdi class="min-w-0 truncate text-body-medium \[text-align:-webkit-match-parent\] supports-\[text-align:match-parent\]:\[text-align:match-parent\]">Fix<\/bdi>/);
  assert.match(html, /<span class="flex min-w-0 items-center text-footnote text-muted-as-secondary">/);
  assert.match(html, /<span dir="ltr"><span class="text-git-added opacity-70">\+9<\/span><span class="ms-1 text-git-removed opacity-70">−2<\/span><\/span>/);
  assert.doesNotMatch(html, /text-left|text-muted"|text-muted /);
  // isFizzyLakePartEnabled("panels") is false, so bE does not wrap the (null) icon.
  assert.doesNotMatch(html, /size-\[calc\(1rem\*var\(--cds-rem-scale,1\)\)\]/);
  assert.match(read('sidebar-pr-card.mjs'), /className: `\$\{u\} w-full text-start`/);
  assert.deepEqual(Card.sidebarPrMessages.selfHosted, { defaultMessage:'Self-hosted', id:'08itlpYbB9' });
});

test('fD tells a self-hosted runner pool from cloud only from real placement fields; host rows never fabricate one', () => {
  const remote = fields => ({ type:'remote', repoInfo:{ name:'repo' }, ...fields });
  assert.deepEqual(sidebarEnvironment(remote()), { kind:'cloud', label:'repo' });
  assert.deepEqual(sidebarEnvironment(remote({ _originalSession:{ self_hosted_runner_pool_id:'pool-1' } })), { kind:'selfHosted', label:'repo' });
  assert.deepEqual(sidebarEnvironment(remote({ _originalSession:{ environment_id:'env-1', self_hosted_runner_pool_id:'pool-1' } })).kind, 'cloud');
  assert.deepEqual(sidebarEnvironment(remote({ pendingCloudPlace:{ worker:{ type:'pool', id:'p' } } })).kind, 'selfHosted');
  assert.deepEqual(sidebarEnvironment(remote({ pendingCloudPlace:{ worker:{ type:'environment', id:'e' } } })).kind, 'cloud');
  assert.deepEqual(sidebarEnvironmentPlace({ environmentId:'e', poolId:'p' }), { type:'environment', id:'e' });
  assert.deepEqual(sidebarEnvironmentPlace({ poolId:'p' }), { type:'pool', id:'p' });
  assert.equal(sidebarEnvironmentPlace({}), null);
  // Local, SSH and Remote Control rows are unchanged.
  assert.deepEqual(sidebarEnvironment({ type:'local', cwd:'/work/repo' }), { kind:'local', label:'repo' });
  assert.equal(sidebarRemoteEnvironment({ type:'local', cwd:'/work/repo' }), undefined);
  assert.deepEqual(sidebarEnvironment({ type:'bridge', bridgeMachineName:'mac', isBridgeOffline:true }), { kind:'bridge', label:'mac', offline:true });
  // The host projection: local threads carry no environment; a remote-typed thread without pool data stays cloud.
  const view = { mark:null, pr:undefined };
  assert.equal(currentSidebarDetails({ id:'a', name:'a', cwd:'/w/a' }, view).env, undefined);
  assert.equal(currentSidebarDetails({ id:'b', name:'b', cwd:'/w/b', type:'remote' }, view).env.kind, 'cloud');
});

test('row details render text-muted-as-secondary and a Cloud glyph for selfHosted with its own label', () => {
  const line = renderToStaticMarkup(h(Details.SidebarDescription, { line:{ kind:'place', branch:'feature', folder:'repo' } }));
  assert.match(line, /class="df-meta-line flex min-w-0 flex-1 items-center gap-2 text-muted-as-secondary" title="feature, repo"/);
  assert.match(line, /<span[^>]*class="shrink-0 text-muted-as-secondary"[^>]*data-branch-glyph=""/);
  assert.doesNotMatch(line, /text-muted"|text-muted /);
  const cloud = renderToStaticMarkup(h(Details.SidebarEnvironmentGlyph, { env:{ kind:'cloud' } }));
  const self = renderToStaticMarkup(h(Details.SidebarEnvironmentGlyph, { env:{ kind:'selfHosted' } }));
  assert.match(self, /data-env-glyph="selfHosted"/); assert.match(self, /class="shrink-0 text-muted-as-secondary"/);
  assert.equal(self.replace('data-env-glyph="selfHosted"', 'data-env-glyph="cloud"'), cloud, 'selfHosted uses the Cloud icon');
  const Label = ({ env }) => Details.sidebarEnvironmentLabel(Start.useStartIntl(), env);
  assert.equal(renderToStaticMarkup(h(Label, { env:{ kind:'selfHosted' } })), 'Self-hosted');
  assert.equal(renderToStaticMarkup(h(Label, { env:{ kind:'cloud' } })), 'Cloud');
  assert.equal(renderToStaticMarkup(h(Label, { env:{ kind:'bridge', label:'mac', offline:true } })), 'mac · Offline');
  assert.equal(zhSidebar['Self-hosted'], '自托管');
});

test('PD inlines the three status colors on the view-tabs CdsPulse; no host token table remains', () => {
  const text = read('sidebar-status-glyph.mjs');
  assert.match(text, /var PD = \{\s*running: "var\(--cds-text-muted\)",\s*awaiting: "var\(--cds-fill-warning\)",\s*ready: "var\(--cds-fill-accent\)",?\s*\}/);
  for (const [state, color] of [['running', 'text-muted'], ['awaiting', 'fill-warning'], ['ready', 'fill-accent']]) {
    const html = renderToStaticMarkup(h(Status.SidebarStatusLayout.Provider, { value:{} }, h(Status.SidebarStatusGlyph, { state, live:false })));
    assert.match(html, /data-cds="Pulse"/, state); assert.match(html, new RegExp(`background:var\\(--cds-${color}\\)`), state);
  }
});

test('HR flips Name order only between titled rows, so untitled sessions stay last in both directions', () => {
  const rows = [{ title:'b' }, { title:null }, { title:'a' }, { title:'' }];
  const titles = list => list.map(row => row.title);
  assert.deepEqual(titles([...rows].sort(sidebarDescendingComparators.alpha)), ['a', 'b', null, '']);
  assert.deepEqual(titles([...rows].sort(sidebarAscendingComparators.alpha)), ['b', 'a', null, '']);
  // Recency and created still simply reverse.
  const times = [{ updatedAtMs:1, createdAtMs:1 }, { updatedAtMs:3, createdAtMs:2 }];
  assert.equal(sidebarAscendingComparators.recency(times[0], times[1]), -sidebarDescendingComparators.recency(times[0], times[1]));
  // Through the host comparator the sidebar uses.
  const sessions = [{ id:'b', name:'b' }, { id:'u' }, { id:'a', name:'a' }];
  const ordered = ascending => [...sessions].sort(currentSidebarComparator('alpha', ascending, s => sidebarSortRecord(s, 1, 1))).map(s => s.id);
  assert.deepEqual(ordered(false), ['a', 'b', 'u']);
  assert.deepEqual(ordered(true), ['b', 'a', 'u']);
});

test('zF joins the hit-row family; the loaded utilities define it and no local rule fights its geometry', () => {
  const html = renderToStaticMarkup(h(Search.SidebarSearchField));
  assert.match(html, /<button[^>]*class="df-search-field hit-row hit-row-main \[--cds-hit-gap-y:10px\] mx-\[calc\(var\(--df-rail-shift,0px\)\/2\)\] mt-1 /);
  assert.match(utilities, /\.hit-row\{--cds-hit-row-reach:var\(--cds-hit-gap-y,0px\);isolation:isolate;position:relative\}/);
  assert.match(utilities, /\.hit-row-main:before\{content:"";z-index:-1;inset:0 0 calc\(var\(--cds-hit-row-reach\) \* -1\);position:absolute\}/);
  assert.ok(utilities.includes('.\\[--cds-hit-gap-y\\:10px\\]{--cds-hit-gap-y:10px}'));
  // The host's unlayered .df-search-field restores only paint (button reset), never position/isolation/inset.
  const local = readFileSync(path.join(app, 'src/source-sidebar.css'), 'utf8');
  for (const [, body] of local.matchAll(/\.df-search-field[^{]*\{([^}]*)\}/g)) assert.doesNotMatch(body, /position|isolation|inset|z-index|content/);
  // The real Code sidebar renders the 2.42304.0 field above New.
  const sidebar = renderToStaticMarkup(h(Sidebar.SourceSidebar, { sessions:[{ id:'a', name:'a', cwd:'/repo', createdAt:1, updatedAt:1 }], knownFolders:['/repo'] }));
  assert.ok(sidebar.indexOf('df-search-field hit-row hit-row-main') > -1 && sidebar.indexOf('df-search-field hit-row') < sidebar.indexOf('>New</span>'));
});

// Controlled hooks for the group view menu (no renderer).
function run(component, contexts) {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
  internals.H = { useContext:c => contexts.has(c) ? contexts.get(c) : c._currentValue, useState:init => [typeof init === 'function' ? init() : init, () => {}] };
  try { return component({}); } finally { internals.H = previous; }
}
const items = (tree, out = []) => { if (Array.isArray(tree)) tree.forEach(t => items(t, out)); else if (tree && typeof tree === 'object') { if (tree.type === Groups.SidebarMenuItem) out.push(tree); items(tree.props?.children, out); } return out; };
test('sZ (any collapsed, non-inert group) decides Expand all, the same rule the blank-area Select all reads', () => {
  const toggle = (expanded, inert = false) => ({ expanded, closest:() => inert ? {} : null, checkVisibility:() => true });
  const list = toggles => ({ ownerDocument:{ activeElement:null }, contains:() => false,
    querySelectorAll:selector => { const m = selector.match(/aria-expanded="(true|false)"/); return m ? toggles.filter(t => t.expanded === (m[1] === 'true')) : toggles; } });
  assert.equal(View.sidebarHasCollapsedGroups(list([toggle(true), toggle(false)])), true);
  assert.equal(View.sidebarHasCollapsedGroups(list([toggle(true), toggle(false, true)])), false, 'inert (outside a sheet) toggles do not count');
  assert.equal(View.sidebarHasCollapsedGroups(null), false);
  const labels = toggles => items(run(View.SidebarGroupViewItems, new Map([[View.SidebarListContext, { getList:() => list(toggles) }]]))).map(i => i.props.children.props.defaultMessage);
  assert.deepEqual(labels([toggle(true), toggle(false)]), ['Collapse all', 'Expand all']);
  assert.deepEqual(labels([toggle(true)]), ['Collapse all']);
  assert.deepEqual(labels([toggle(false)]), ['Expand all']);
});

test('the status glyph import graph never reaches the row-details view, and each entry module loads on its own', async () => {
  // kE (details view) reads the PR card's OE while initialising; reaching it from the status glyph would evaluate it
  // before the PR card when the card is the first module loaded.
  const src = path.join(app, 'src');
  const reachable = (start, seen = new Set()) => {
    if (seen.has(start)) return seen; seen.add(start);
    for (const [, from] of readFileSync(start, 'utf8').matchAll(/(?:import|export)\s*(?:[^'";]*?\sfrom\s*)?["'](\.[^"']+)["']/g)) {
      const next = path.resolve(path.dirname(start), from);
      if (next.startsWith(src) && /\.(m?js|jsx)$/.test(next)) reachable(next, seen);
    }
    return seen;
  };
  const fromGlyph = reachable(path.join(generated, 'sidebar-status-glyph.mjs'));
  assert.ok(fromGlyph.has(path.join(src, 'source-sidebar-error-adapters.jsx')));
  assert.ok(!fromGlyph.has(path.join(generated, 'sidebar-details-view.mjs')), 'status glyph -> details view');
  assert.ok(!fromGlyph.has(path.join(src, 'source-sidebar-status-adapters.jsx')), 'status glyph -> status adapters');
  for (const first of ['/src/generated/code-current/sidebar-pr-card.mjs', '/src/source-sidebar-error-adapters.jsx']) {
    const fresh = await freshServer();
    try {
      const module = await fresh.ssrLoadModule(first);
      assert.ok(Object.keys(module).length > 0, first);
      const view = await fresh.ssrLoadModule('/src/generated/code-current/sidebar-details-view.mjs');
      assert.equal(typeof view.sidebarEnvironmentLabel, 'function', first);
      const adapters = await fresh.ssrLoadModule('/src/source-sidebar-status-adapters.jsx');
      const errors = await fresh.ssrLoadModule('/src/source-sidebar-error-adapters.jsx');
      assert.equal(adapters.SidebarCodeErrorGlyph, errors.SidebarCodeErrorGlyph, 'one error glyph, re-exported');
    } finally { await fresh.close(); }
  }
});
