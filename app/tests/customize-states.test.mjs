import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// SSR of the Customize catalog load states (2.2553.1 shared-22 FC/MC/jC skeleton,
// customize-connectors so(), customize-skills Ti → c27f32a39 Ie) and the CDS Button
// actions. Middleware mode only; no browser/Electron/Codex.
let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());
const count = (html, needle) => html.split(needle).length - 1;
const noBackend = () => { throw Error('SSR may not call the backend'); };
const storeWith = (status, error = '') => {
  const snapshot = { skills: { skills: [], errors: [], status, error, cwd: '/fixture' }, plugins: { rows: [], status, error, cwd: '/fixture' }, mcp: { rows: [], status, error, cwd: '/fixture', threadId: null } };
  return { getSnapshot: () => snapshot, subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} };
};
const page = (section, store) => renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: `customize-${section}`, store, cwd: '/fixture', call: noBackend }));

test('loading renders the source skeleton, an sr-only Loading status and no invented Loading text', () => {
  const store = storeWith('loading');
  for (const section of ['skills', 'connectors', 'plugins']) {
    const html = page(section, store);
    assert.doesNotMatch(html, /Loading skills…|Loading connectors…|Loading plugins…|<table|<th|cz-notice|cz-broken|cz-segments/);
    assert.match(html, /<\/header><div class="cz-page-body scroll-fade-y scroll-fade-size-6"><span role="status" class="sr-only">Loading<\/span>/, 'G "loading": header + skeleton only');
    assert.match(html, /<span role="status" class="sr-only">Loading<\/span><div aria-hidden="true" class="flex flex-col" data-cz-skeleton="/);
    // jC: 1 header row + TC.length rows, 3 AC columns each.
    assert.equal(count(html, 'class="flex h-control items-center px-md'), 3);
    assert.equal(count(html, 'box-content flex h-7 items-center gap-sm border-b border-alpha-1 px-md py-sm'), 18);
    assert.equal(count(html, 'py-sm border-t"'), 3, 'border-t only on the first row');
    const firstColumn = [...html.matchAll(/min-w-0 flex-1 text-body"><div data-cds="Skeleton" role="status" class="relative h-\[1em\] [^"]* (w-\d+)"/g)].map(m => m[1]);
    assert.deepEqual(firstColumn.filter((_, index) => index % 3 === 0), M.SKELETON_WIDTHS);
    assert.deepEqual(M.SKELETON_WIDTHS, ['w-32', 'w-40', 'w-28', 'w-36', 'w-24', 'w-32']);
    assert.match(html, /after:animate-\[cds-shimmer_2s_linear_infinite\]/);
  }
  const connectors = page('connectors', store);
  assert.match(connectors, /<div class="flex flex-col gap-sm pt-sm" data-testid="connectors-rows-skeleton"><div class="shrink-0 self-start"><div class="shrink-0 w-63"><div data-cds="Skeleton" role="status" class="relative max-w-full [^"]* h-control w-full">/);
  assert.equal(count(connectors, 'class="relative max-w-full overflow-hidden rounded bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden size-6 shrink-0"'), 6);
  for (const section of ['skills', 'plugins']) {
    const html = page(section, store);
    assert.match(html, /<div class="-mx-pad-lg shrink-0 overflow-hidden px-lg \[scrollbar-gutter:stable\] mt-sm">/);
    assert.doesNotMatch(html, /connectors-rows-skeleton| size-6 shrink-0/);
  }
});

test('load errors render only the source copy and retry button, never the table or raw backend text', () => {
  const store = storeWith('error', 'RAW backend <failure>');
  const skills = page('skills', store), connectors = page('connectors', store), plugins = page('plugins', store);
  for (const html of [skills, connectors, plugins]) {
    assert.doesNotMatch(html, /<table|<th|cz-notice|role="alert"|RAW backend|&lt;failure/);
    assert.match(html, /<header class="cz-header">/);
  }
  assert.match(skills, /<div role="status" data-testid="skills-tabbed-list-error" class="flex flex-1 flex-col items-center justify-center gap-lg px-md py-xl text-center cz-load-error"><p class="max-w-xs text-pretty text-body text-secondary">Couldn’t load your skills\.<\/p><button type="button" data-cds="Button" data-variant="secondary"/);
  assert.match(skills, />Retry<\/span><\/button><\/div>/);
  // c27f32a39 Ie Retry is size:a = shared-20 Za → sm outside pageLayout; so()'s Try again has no size.
  assert.match(skills, /skills-tabbed-list-error[^]*<button type="button" data-cds="Button" data-variant="secondary"[^>]*data-size="sm"[^>]*>/);
  for (const html of [connectors, plugins]) assert.match(html, /<button type="button" data-cds="Button" data-variant="secondary"(?![^>]*data-size)[^>]*>.*>Try again</);
  assert.match(connectors, /<div class="flex h-full flex-col items-center justify-center gap-md p-lg text-center cz-load-error"><p class="text-body text-muted">Couldn’t load connectors<\/p><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*>Try again<\/span><\/button><\/div>/);
  assert.match(plugins, /<p class="text-body text-muted">Couldn’t load plugins\.<\/p><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*>Try again<\/span><\/button>/);
  // Connectors keep the header action as a primary CDS Button.
  assert.match(connectors, /data-cds="Button" data-variant="primary"[^>]*>.*Add custom connector<\/span><\/button>/);
});

test('a ready catalog keeps the list and every Customize action is a CDS Button', () => {
  const skills = [{ id: 'a', name: 'Alpha', skillName: 'alpha', path: '/alpha/SKILL.md', scope: 'user', enabled: false }];
  const rows = [{ id: 'm', name: 'fx-failed', title: 'fx-failed', kind: 'unreachable', tools: [], authStatus: 'unsupported' }, { id: 'n', name: 'fx-auth', title: 'fx-auth', kind: 'signIn', tools: [], authStatus: 'notLoggedIn' }];
  const snapshot = { skills: { skills, errors: [], status: 'ready', error: 'stale reload failure', cwd: '/fixture' }, plugins: { rows: [], status: 'ready', cwd: '/fixture' }, mcp: { rows, status: 'ready', cwd: '/fixture', threadId: null } };
  const store = { getSnapshot: () => snapshot, subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} };
  const list = page('skills', store);
  assert.match(list, /data-row-id="a"/); assert.doesNotMatch(list, /cz-load-error|stale reload failure/);
  const connectors = page('connectors', store);
  assert.equal(count(connectors, 'data-cds="Button" data-variant="secondary" data-size="sm"'), 4, 'row and card Reconnect/Sign in use sm');
  assert.match(connectors, /<button aria-label="Reconnect all 1 connector whose sign-in expired" type="button" data-cds="Button" data-variant="secondary"/);
  const detail = renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-skills', store, cwd: '/fixture', call: noBackend, focus: { skillPath: '/alpha/SKILL.md' }, onUseSkill() {} }));
  assert.match(detail, /<div class="cz-drill-header"><button type="button" data-cds="Button" data-variant="ghost" data-flush="start" style="--cds-outset-x:var\(--cds-pad-md\)"/);
  // Page-shell back size:c, cfaabd194 header actions size:te: both shared-20 Za → sm in the classic dialog.
  assert.match(detail, /<div class="cz-drill-header"><button [^>]*data-variant="ghost"[^>]*data-size="sm"/);
  assert.match(detail, /<button disabled="" [^>]*data-variant="primary"[^>]*data-size="sm"/);
  assert.match(detail, /ssb-auto-compact[^>]*>.*ssb-auto-comfortable[^>]*>.*Skills<\/span><\/button><\/div>/);
  assert.match(detail, /<span class="source-tooltip-disabled-trigger" tabindex="0"[^>]*><button disabled="" type="button" data-cds="Button" data-variant="primary"/);
  assert.match(detail, /data-cds-disabled-reason="">Enable skill to try in chat<\/span>/);
  // F13: the secondary "Show in Finder" is gone; "Show in Folder" lives in the ct ⋮ menu (ghost icon-only sm).
  assert.doesNotMatch(detail, /Show in Finder|Use in message|title="\/alpha\/SKILL.md"/);
  for (const html of [list, connectors, detail, page('plugins', store), page('skills', storeWith('error')), page('connectors', storeWith('loading'))])
    assert.doesNotMatch(html, /cz-button|cz-back|cz-loading/);
  const plugin = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true }, detail: null, skills: [], view: null, onView() {}, onBack() {}, onSkill() {} }));
  assert.match(plugin, /<div class="cz-drill-header"><button type="button" data-cds="Button" data-variant="ghost" data-flush="start"[^>]*data-size="sm"/);
  // F13: c36b3644c be renders the c9d36aa51 plugin-page skeleton until plugin/read answers.
  assert.match(plugin, /<div class="cz-drill-scroll scroll-fade-y scroll-fade-size-6"><div data-testid="plugin-page-skeleton" class="flex h-full flex-col">/);
  assert.doesNotMatch(plugin, /Loading plugin details|<section/);
});

test('F13 plugin and SKILL.md skeletons follow c9d36aa51 and customize-skill-detail :77-87', () => {
  const plugin = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true }, detail: null, error: '', skills: [], view: null, onView() {}, onBack() {}, onSkill() {} }));
  const skeleton = plugin.match(/<div data-testid="plugin-page-skeleton"[^]*$/)[0];
  const bars = [...skeleton.matchAll(/<div data-cds="Skeleton" role="status" class="([^"]*)"(?: style="([^"]*)")?>/g)].map(match => [match[2] ?? '', /rounded-full/.test(match[1]), /(^|\s)rounded(\s|$)/.test(match[1])]);
  assert.deepEqual(bars.map(bar => bar[0]), ['width:200px;height:24px', 'width:40px;height:20px', 'width:32px;height:32px', 'width:60px;height:14px', 'width:100px;height:14px',
    'width:60px;height:14px', 'width:100px;height:14px', 'width:100px;height:14px', 'height:40px', 'width:120px;height:18px', ...Array(4).fill('width:100px;height:32px')]);
  assert.deepEqual(bars.filter(bar => bar[1]).length, 5, 'the 40×20 pill and four 100×32 pills are rounded-full');
  assert.equal(bars.filter(bar => bar[1] && bar[2]).length, 0, 'rounded-full replaces the default rounded');
  assert.equal(skeleton.split('aria-hidden="true"').length - 1, 4, 'only the title bar is announced');
  assert.match(skeleton, /<div aria-hidden="true" class="grid grid-cols-2 gap-4 px-6 py-3">/);
  assert.match(skeleton, /<div class="flex flex-wrap gap-2\.5">/);
  assert.match(skeleton, /after:animate-\[cds-shimmer_2s_linear_infinite\]/);
  // An error keeps the page with the alert instead of the skeleton.
  const failed = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true }, detail: null, error: 'Read failed', skills: [], view: null, onView() {}, onBack() {}, onSkill() {} }));
  assert.match(failed, /role="alert">Read failed/); assert.doesNotMatch(failed, /plugin-page-skeleton/);
  // A plugin with no skills or agents: 2.42304.0 c24c8737b pc Kt still lists the unconditional Overview (settings-14);
  // no 2.42304.0 chunk has the old c36b3644c "doesn’t have any skills or agents" empty state.
  const none = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true }, detail: {}, skills: [], view: null, onView() {}, onBack() {}, onSkill() {} }));
  assert.deepEqual([...none.matchAll(/role="tab"[^>]*>([^<]*)</g)].map(m => m[1]), ['Overview']);
  assert.match(none, /role="tabpanel"[^>]*><div class="-mx-6" data-plugin-overview="">/);
  assert.doesNotMatch(none, /No skills, hooks, or MCP servers were reported|cz-empty|data-plugin-empty|doesn’t have any skills or agents/);
  // SKILL.md loading: p-3 around one full-width 200px rounded-md shimmer bar, one sr-only Loading.
  const skills = [{ id: 'a', name: 'fx-alpha', skillName: 'fx-alpha', path: '/a/SKILL.md', scope: 'user', enabled: true }];
  const snapshot = { skills: { skills, errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: [], status: 'ready', cwd: '/fixture' }, mcp: { rows: [], status: 'ready', cwd: '/fixture', threadId: null } };
  const store = { getSnapshot: () => snapshot, subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} };
  const detail = renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-skills', store, cwd: '/fixture', call: noBackend, focus: { skillPath: '/a/SKILL.md' } }));
  const loading = detail.match(/<div class="p-3" data-cz-file-loading="">(.*?)<\/div><\/div>/)[1];
  assert.match(loading, /^<div data-cds="Skeleton" role="status" class="relative h-\[1em\] max-w-full overflow-hidden bg-\[var\(--cds-skeleton-base\)\] [^"]* w-full rounded-md" style="height:200px"><span class="sr-only">Loading<\/span>$/);
  assert.equal(count(detail, '>Loading<'), 1);
  assert.doesNotMatch(detail, /cz-file-skeleton|aria-label="Loading files"/);
});

test('connectors Status cells, Type column and the stopped-working card follow customize-connectors ca/Pa/ba/Ca', () => {
  const mcp = (kind, index) => ({ id: `r${index}`, name: `fx-${kind}-${index}`, title: `fx-${kind}-${index}`, kind, tools: [], authStatus: kind === 'signIn' ? 'notLoggedIn' : 'unsupported' });
  const storeFor = rows => ({ getSnapshot: () => ({ skills: { skills: [], errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: [], status: 'ready', cwd: '/fixture' }, mcp: { rows, status: 'ready', cwd: '/fixture', threadId: null } }),
    subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} });
  const two = page('connectors', storeFor([mcp('unreachable', 0), mcp('signIn', 1), mcp('connected', 2)]));
  // Pa :2885-2888 Type = sn "w-40" (160px); Status sn "w-40" (:3610-3640).
  assert.match(two, /<thead><tr><th scope="col">Connector<\/th><th scope="col" class="cz-col-40">Type<\/th><th scope="col" class="cz-col-40">Status<\/th><\/tr><\/thead>/);
  // ca :2027-2048: Warning sm aria-hidden, tooltip-wrapped button, explanation only in sr-only.
  const warning = String.fromCodePoint(57609), connectorsGlyph = String.fromCodePoint(57429);
  for (const [status, label, action] of [['unreachable', 'Server not responding', 'Reconnect'], ['sign-in', 'Sign-in required', 'Sign in']]) {
    const cell = two.match(new RegExp(`<span class="cz-status" data-status="${status}">(.*?)</td>`))[1];
    assert.match(cell, new RegExp(`^<span aria-hidden="true" data-cds="Icon" class="cz-status-icon" style="font-size:16px;[^"]*">${warning}</span><span class="cz-status-action"><button type="button" data-cds="Button" data-variant="secondary" data-size="sm"[^>]*>.*<span class="ssb-content">${action}</span></button></span><span class="cz-sr-only">${label}</span></span>$`));
    assert.equal(count(cell, label), 1, `${label} only inside .cz-sr-only`);
  }
  assert.match(two, /<span class="cz-status" data-status="connected"><span aria-hidden="true" data-cds="Icon"[^>]*>[^<]*<\/span><span class="cz-sr-only">Connected<\/span><\/span>/, 'connected unchanged');
  // Ca :2644-2750: 24px connector tile (not a Warning), name + secondary reason, Retry for unreachable.
  const card = two.match(/<section class="cz-broken"[^]*?<\/section>/)[0];
  assert.match(card, new RegExp(`<li data-broken-name="fx-unreachable-0"><span aria-hidden="true" class="cz-connector-tile"><span aria-hidden="true" data-cds="Icon" class="" style="font-size:16px;[^"]*">${connectorsGlyph}</span></span><div class="cz-broken-text"><span class="cz-broken-name">fx-unreachable-0</span><span class="cz-broken-reason">Server not responding</span></div><div class="cz-broken-action"><button type="button" data-cds="Button" data-variant="secondary" data-size="sm"[^>]*>.*?<span class="ssb-content">Retry</span></button></div></li>`));
  // signIn keeps the honest "Sign-in required" (q87c5Fstfm) / "Sign in" (Codex notLoggedIn is not "Sign-in expired").
  assert.match(card, /<span class="cz-broken-reason">Sign-in required<\/span><\/div><div class="cz-broken-action"><button[^>]*>.*?<span class="ssb-content">Sign in<\/span><\/button><\/div><\/li>/);
  assert.equal(count(card.split('<ul')[1], warning), 0, 'no Warning icon in the row leading slot');
  assert.doesNotMatch(card, />Reconnect</); assert.doesNotMatch(card, /Show all|aria-expanded/);
  assert.match(card, /<button aria-label="Reconnect all 1 connector whose sign-in expired" type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?>Reconnect all<\/span><\/button>/);
  // ba :2302/:2446-2530: va = 5 rows until the ghost Show all (CaretDown, aria-expanded=false, aria-controls = ul id).
  const six = page('connectors', storeFor([0, 1, 2, 3, 4, 5].map(index => mcp(index % 2 ? 'signIn' : 'unreachable', index))));
  const sixCard = six.match(/<section class="cz-broken"[^]*?<\/section>/)[0];
  assert.equal(M.BROKEN_CARD_LIMIT, 5);
  assert.match(sixCard, /<h3>.*6 connectors stopped working<\/h3>/);
  assert.equal(count(sixCard, '<li data-broken-name='), 5);
  assert.doesNotMatch(sixCard, /fx-signIn-5/);
  const listId = sixCard.match(/<ul id="([^"]+)" class="cz-broken-list" role="list">/)[1];
  const more = sixCard.match(/<\/ul>(<button [^>]*>)(.*)<\/section>$/);
  assert.ok(more, 'Show all follows the list');
  for (const attr of ['aria-expanded="false"', `aria-controls="${listId}"`, 'data-variant="ghost"', 'data-flush="start"', 'data-size="sm"', 'class="source-settings-button cz-broken-more"']) assert.ok(more[1].includes(attr), attr);
  assert.match(more[2], new RegExp(`${String.fromCodePoint(57383)}.*<\\/span>Show all<\\/span><\\/button>$`), 'CaretDown + Show all');
  const five = page('connectors', storeFor([0, 1, 2, 3, 4].map(index => mcp('unreachable', index))));
  assert.equal(count(five, '<li data-broken-name='), 5); assert.doesNotMatch(five, /Show all|Show less/);
  // F13 rows (io :3737-3820): the 24/16 tile before the name, Type = "Desktop" without a tools badge, and la's
  // unavailable "—" + sr-only "Not available" / default secondary sm "Connect".
  const all = page('connectors', storeFor(['connected', 'disabled', 'notStarted', 'unreachable'].map((kind, index) => ({ ...mcp(kind, index), tools: ['a', 'b'] }))));
  const rows = [...all.matchAll(/<tr data-hoverable=""[^>]*data-mcp-name="([^"]+)"[^>]*>(.*?)<\/tr>/g)].map(match => ({ name: match[1], cells: [...match[2].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(cell => cell[1]) }));
  assert.equal(rows.length, 4);
  for (const row of rows) {
    assert.match(row.cells[0], new RegExp(`^<div class="cz-name"><span aria-hidden="true" class="cz-connector-tile"><span aria-hidden="true" data-cds="Icon" class="" style="font-size:16px;[^"]*">${connectorsGlyph}</span></span><span class="cz-truncate">${row.name}</span></div>$`));
    assert.equal(row.cells[1], '<div class="cz-type flex min-w-0 items-center gap-xs overflow-hidden"><span>Desktop</span></div>');
  }
  assert.doesNotMatch(all, /MCP server|\d tools|cz-row-icon/);
  const status = Object.fromEntries(rows.map(row => [row.name, row.cells[2]]));
  assert.equal(status['fx-disabled-1'], '<span class="cz-status" data-status="disabled"><span aria-hidden="true">—</span><span class="cz-sr-only">Not available</span></span>');
  assert.match(status['fx-notStarted-2'], /^<span class="cz-status" data-status="not-started"><button type="button" data-cds="Button" data-variant="secondary" data-size="sm"[^>]*>.*<span class="ssb-content">Connect<\/span><\/button><\/span>$/);
  assert.doesNotMatch(all, />Disabled<|>Not started</);
  // G :555: rows are named "View {name}".
  assert.match(all, /aria-label="View fx-connected-0"/);
  // customize-connectors :3580-3600: the uncontained sm "Filter by status" control sits with the table in "flex shrink-0 flex-col gap-sm".
  assert.match(all, /<div class="flex shrink-0 flex-col gap-sm"><div class="ss-segments shrink-0 self-start" data-cds="SegmentedControl" role="radiogroup" aria-label="Filter by status" data-variant="uncontained" data-size="sm">/);
  const radios = [...all.matchAll(/<button type="button" role="radio" aria-label="([^"]+)" aria-checked="(true|false)"/g)].map(match => [match[1], match[2]]);
  assert.deepEqual(radios, [['All', 'true'], ['Connected', 'false'], ['Not connected', 'false']]);
  assert.match(all, /<\/div><div class="cz-scroller"><table class="cz-table cz-table-flush" data-cds="Table" aria-label="Connectors">/, 'the connectors table has no mt-sm');
  assert.doesNotMatch(page('connectors', storeFor([])), /Filter by status|role="radiogroup"/, 'no filter without connectors');
  // The bands block wraps the stopped-working card; the body below it is gap-lg pt-lg.
  assert.match(all, /<div class="flex shrink-0 flex-col gap-lg pt-sm"><section class="cz-broken"/);
  assert.match(all, /<div class="cz-connectors-body flex flex-1 flex-col gap-lg pt-lg">/);
  assert.match(page('connectors', storeFor([mcp('connected', 0)])), /<div class="cz-connectors-body flex flex-1 flex-col gap-lg pt-sm">/);
});

test('F13 connector drill-in replaces the list with the page-shell drill and c08e79e85 En by state', () => {
  const rows = [
    { id: 'gh', name: 'gh', title: 'GitHub', kind: 'connected', tools: ['search', 'create_issue'], authStatus: 'unsupported', description: 'Repos and issues' },
    { id: 'bare', name: 'bare', title: 'bare', kind: 'connected', tools: [], authStatus: 'unsupported' },
    { id: 'down', name: 'down', title: 'down', kind: 'unreachable', tools: [], authStatus: 'unsupported' },
    { id: 'auth', name: 'auth', title: 'auth', kind: 'signIn', tools: [], authStatus: 'notLoggedIn' },
    { id: 'new', name: 'new', title: 'new', kind: 'notStarted', tools: [], authStatus: 'unsupported' },
    { id: 'off', name: 'off', title: 'off', kind: 'disabled', tools: [], authStatus: 'unsupported' },
    { id: 'wait', name: 'wait', title: 'wait', kind: 'connecting', tools: [], authStatus: 'unsupported' },
    { id: 'reauth', name: 'reauth', title: 'reauth', kind: 'signIn', runtimeStatus: 'authenticationRequired', tools: [], authStatus: 'oAuth' },
  ];
  const drill = (name, extra = {}) => corePage('connectors', readyStore({ mcp: rows }), { focus: { connectorName: name }, ...extra });
  const gh = drill('gh');
  assert.match(gh, /^<div class="cz-page" data-cz-page="connectors" data-detail=""><div class="cz-drill" data-cz-detail="connector"><div class="cz-drill-header"><button [^>]*data-variant="ghost"[^>]*data-size="sm"[^>]*>.*?Connectors<\/span><\/button><\/div>/);
  assert.doesNotMatch(gh, /<table|<aside|cz-header|cz-detail"|Filter by status|cz-broken/);
  // Connected: px-6 pb-6, N header (min-h-14 py-3 -me-6 pe-md), 24/16 tile, h2 name, secondary Reconnect, Sn ⋮.
  assert.match(gh, /<div class="px-6 pb-6" data-connector-view="connected"><div class="flex items-center justify-between min-h-14 py-3 -me-6 pe-md"><div class="flex items-center gap-3 min-w-0"><span aria-hidden="true" class="cz-connector-tile">/);
  assert.match(gh, /<h2 class="font-large-bold text-primary \[overflow-wrap:anywhere\]">GitHub<\/h2>/);
  assert.match(gh, /<button type="button" data-cds="Button" data-variant="secondary" class="source-settings-button "[^>]*>.*?Reconnect<\/span><\/button><button aria-label="More options for GitHub" aria-haspopup="menu" aria-expanded="false" type="button" data-cds="Button" data-variant="ghost" data-cds-icon-only=""/);
  assert.match(gh, /<p class="font-base text-secondary">Repos and issues<\/p>/);
  assert.deepEqual([...gh.matchAll(/<li class="flex gap-2\.5 items-center py-2 border-b last:border-b-0"><span class="text-sm font-normal text-primary">([^<]+)<\/span><\/li>/g)].map(match => match[1]), ['search', 'create_issue']);
  assert.match(drill('bare'), /<p class="font-base text-muted">This connector has no tools available\.<\/p>/);
  // Not connected: centred column, 56/40 tile, the failure title only for a broken server, the font-large muted message, one primary action.
  const view = name => drill(name).match(/data-connector-view="disconnected">(.*)$/)[1];
  const down = view('down');
  assert.match(down, /<span aria-hidden="true" class="cz-connector-tile cz-connector-tile-lg"><span aria-hidden="true" data-cds="Icon" class="" style="font-size:40px;/);
  assert.match(down, /<div class="flex items-center justify-center gap-1\.5 text-warning" data-connection-issue=""><span aria-hidden="true" data-cds="Icon"[^>]*>[^<]*<\/span><span class="font-large-bold">Connection issue<\/span><\/div>/);
  assert.match(down, /<p class="font-large text-muted \[overflow-wrap:anywhere\]">Your connection to down stopped working\. Reconnect to continue\.<\/p>/);
  const primary = html => [...html.matchAll(/<button (disabled="" )?type="button" data-cds="Button" data-variant="primary"[^>]*>.*?<span class="ssb-content">([^<]+)<\/span><\/button>/g)].map(match => [match[2], !!match[1]]);
  assert.deepEqual(primary(down), [['Reconnect', false]]);
  for (const [name, label, disabled] of [['auth', 'Sign in', false], ['new', 'Connect', false], ['off', 'Connect', true]]) {
    const html = view(name);
    assert.doesNotMatch(html, /Connection issue/);
    assert.match(html, new RegExp(`You’re not connected to ${name} yet\\.`));
    assert.deepEqual(primary(html), [[label, disabled]], name);
  }
  // A runtime re-authentication failure is a failure (En I): issue title, stopped-working copy, vn label "Reconnect".
  const reauth = view('reauth');
  assert.match(reauth, /Connection issue/); assert.match(reauth, /Your connection to reauth stopped working\. Reconnect to continue\./);
  assert.deepEqual(primary(reauth), [['Reconnect', false]]);
  // Connecting: the 56px tile over a role=status spinner and "Checking connection…".
  assert.match(drill('wait'), /data-connector-view="checking"><span aria-hidden="true" class="cz-connector-tile cz-connector-tile-lg">.*<div role="status" class="cz-checking text-center flex flex-col items-center gap-3"><span class="sc-spinner" aria-hidden="true"><\/span><p class="font-base text-muted">Checking connection…<\/p><\/div>/);
  // The Codex core's ⋮ holds Remove connector; a DeepSeek core's holds Edit config (both open as menus, so SSR shows the trigger only).
  assert.match(drill('down'), /<div class="absolute top-3 right-6"><button aria-label="More options for down"/);
  assert.match(drill('gh', { core: deepseekCore, onEditConfig() {} }), /aria-label="More options for GitHub"/);
  const plugin = corePage('connectors', readyStore({ mcp: [{ ...rows[2], pluginId: 'p' }] }), { focus: { connectorName: 'down' } });
  assert.doesNotMatch(plugin, /More options for/, 'a plugin-owned server has no Remove, so Sn renders nothing');
});

// boot.core of the DeepSeek bridge (main.cjs coreInfo): no per-skill switch, no MCP config writes.
const deepseekCore = { engine: 'deepseek-harness', engineVersion: '0.2.0-rc.2', capabilities: { unsupportedMethods: ['thread/fork'], skillToggle: false, mcpConfigWrite: false }, configPath: '/h/profile/cordis.patch.yml' };
const readyStore = ({ skills = [], plugins = [], mcp = [] } = {}) => ({ getSnapshot: () => ({ skills: { skills, errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: plugins, status: 'ready', cwd: '/fixture' }, mcp: { rows: mcp, status: 'ready', cwd: '/fixture', threadId: null } }),
  subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} });
const corePage = (section, store, extra = {}) => renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: `customize-${section}`, store, cwd: '/fixture', call: noBackend, ...extra }));
const switches = html => [...html.matchAll(/<button[^>]*role="switch"[^>]*>/g)].map(match => match[0]);

test('DeepSeek Connectors: no notice paragraphs, Edit config in the header, the profile hint in the NodeShapes empty state', () => {
  const rows = [{ id: 'gh', name: 'gh', title: 'gh', kind: 'connected', tools: ['search'], authStatus: 'unsupported', runtimeStatus: 'connected' }];
  const empty = corePage('connectors', readyStore(), { core: deepseekCore, onEditConfig() {} });
  const listed = corePage('connectors', readyStore({ mcp: rows }), { core: deepseekCore, onEditConfig() {} });
  const detail = corePage('connectors', readyStore({ mcp: rows }), { core: deepseekCore, onEditConfig() {}, focus: { connectorName: 'gh' } });
  for (const html of [empty, listed, detail]) {
    assert.doesNotMatch(html, /Add custom connector|Remove connector|~\/\.codex|config\.toml|cz-form|cz-notice|class="cz-config-hint"|Connectors are the MCP servers/);
  }
  // customize-page-notices: Edit config takes the header actions slot (secondary, base size like the source's add action).
  for (const html of [empty, listed]) assert.match(html, /<header class="cz-header">.*<div class="cz-actions"><button type="button" data-cds="Button" data-variant="secondary" class="source-settings-button "[^>]*>.*?Edit config<\/span><\/button><\/div><\/div><\/header>/);
  // Ee (page shell :566-612) as the flex-1 body child: NodeShapes pictogram, the source copy with the profile entry, Edit config as the action.
  assert.match(empty, /<div class="cz-connectors-body flex flex-1 flex-col gap-lg pt-sm"><div class="cz-empty flex flex-1 flex-col items-center justify-center gap-lg py-lg text-center" data-cz-empty=""><svg data-cds="Pictogram" data-pictogram="NodeShapes" width="96" height="96" viewBox="0 0 500 500" fill="none" xmlns="http:\/\/www\.w3\.org\/2000\/svg" style="flex-shrink:0" aria-hidden="true">/);
  assert.match(empty, /<p class="max-w-xs text-pretty text-body text-secondary">Unlock more with DeepSeek when you connect your team’s tools\.<span class="block" data-cz-config-hint="">Add a <code>@deepseek-ai\/dsh-mcp-client<\/code> entry to <code>\/h\/profile\/cordis\.patch\.yml<\/code>, then Reconnect\.<\/span><\/p><div class="flex flex-col items-center gap-3"><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?Edit config<\/span><\/button><\/div><\/div>/);
  assert.equal(count(empty, 'role="status"'), 0, 'Ee has no live region');
  assert.doesNotMatch(listed, /data-cz-empty|data-pictogram/);
  // In the drill the header is gone; Reconnect stays and the ⋮ menu (Edit config) replaces it.
  assert.match(detail, /data-cz-detail="connector"/); assert.doesNotMatch(detail, /cz-header|Edit config/);
  assert.match(detail, />Reconnect<\/span><\/button><button aria-label="More options for gh"/);
  // Without an Edit config handler (disconnected) the button is disabled, never dropped.
  assert.match(corePage('connectors', readyStore(), { core: deepseekCore }), /<div class="cz-actions"><button disabled="" type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?Edit config/);
  // A Codex server (no core / no capabilities) keeps Add custom connector in the header and as the Ee action, and no hint.
  const codexEmpty = corePage('connectors', readyStore());
  assert.match(codexEmpty, /<div class="cz-actions"><button type="button" data-cds="Button" data-variant="primary"[^>]*>.*?Add custom connector/);
  assert.match(codexEmpty, /<p class="max-w-xs text-pretty text-body text-secondary">Unlock more with Codex when you connect your team’s tools\.<\/p><div class="flex flex-col items-center gap-3"><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?Add custom connector<\/span><\/button><\/div>/);
  assert.doesNotMatch(codexEmpty, /cz-notice|data-cz-config-hint|Open a session/);
  assert.match(corePage('connectors', readyStore({ mcp: rows }), { focus: { connectorName: 'gh' } }), /aria-label="More options for gh"/, 'Codex ⋮ holds Remove connector');
  // A search with no match is Ee's plain p (no pictogram, no live region).
  const search = corePage('connectors', readyStore({ mcp: rows }), { focus: { searchSeed: 'zzz' } });
  assert.match(search, /<p class="cz-empty-search py-lg text-center text-body text-secondary">No connectors match your search<\/p>/);
  assert.doesNotMatch(search, /data-pictogram|data-cz-empty|<table/);
});

test('DeepSeek Skills: ObjectBulb empty state with the Harness roots, and the c9a7e510b skill header, facts and Description', () => {
  const empty = corePage('skills', readyStore(), { core: deepseekCore });
  assert.match(empty, /<\/header><div class="cz-page-body scroll-fade-y scroll-fade-size-6"><div class="cz-empty flex flex-1 flex-col items-center justify-center gap-lg py-lg text-center" data-cz-empty=""><svg data-cds="Pictogram" data-pictogram="ObjectBulb" width="96" height="96"/);
  assert.match(empty, /<path d="[^"]+" class="fill-pictogram-highlight-default"><\/path>/); assert.match(empty, /<path d="[^"]+" fill="currentColor"><\/path>/);
  // The actions repeat the header's Add skill menu (customize-skills :1440-1462), then the core's skill folders as the
  // muted footnote, each with Open.
  assert.match(empty, /<p class="max-w-xs text-pretty text-body text-secondary">Add skills to extend DeepSeek’s capabilities\.<\/p><div class="flex flex-col items-center gap-3"><button aria-label="Add skill" aria-haspopup="menu"[^>]*data-variant="primary"[^>]*>.*?>Add<\/span><\/button><section class="cz-skill-roots" aria-label="Skill folders" data-cz-skill-roots=""><p class="cz-muted">To add your own skill, put a folder with a SKILL\.md file in one of these folders:<\/p><ul class="cz-roots"><li class="cz-root-row"><code>&lt;project&gt;\/\.dsh\/skills<\/code>/);
  assert.match(empty, /<div class="cz-actions"><button aria-label="Add skill" aria-haspopup="menu"/, 'the header holds the same Add skill menu');
  assert.deepEqual([...empty.matchAll(/<li class="cz-root-row"><code>([^<]+)<\/code>/g)].map(match => match[1]), ['&lt;project&gt;/.dsh/skills', '&lt;project&gt;/.agents/skills', '~/.dsh/skills', '~/.agents/skills']);
  assert.equal([...empty.matchAll(/>Open</g)].length, 4);
  assert.doesNotMatch(empty, /New skill…|cz-new-skill/, 'no full-width New skill… button under the folders');
  assert.doesNotMatch(empty, /~\/\.codex|connector|cz-notice|role="status"|cz-layout/i);
  const skills = [{ id: '/x/.agents/skills/figma/SKILL.md', name: 'figma', skillName: 'figma', path: '/x/.agents/skills/figma/SKILL.md', scope: 'user', enabled: true, group: 'personal', description: 'Design files\nand frames', updatedAt: 1760000000 }];
  const detail = corePage('skills', readyStore({ skills }), { core: deepseekCore, focus: { skillPath: skills[0].path }, onUseSkill() {}, onRevealPath() {} });
  // cfaabd194 `Ce && Switch`: without a per-skill switch the core draws none (R04; no read-only switch).
  assert.equal(switches(detail).length, 0);
  assert.doesNotMatch(detail, />Enabled<|disable-model-invocation|data-cds-disabled-reason/, 'no visible Enabled label or switch reason');
  assert.doesNotMatch(detail, /DeepSeek Harness has no per-skill switch|cz-muted|cz-skill-meta|cz-switch-row/);
  // Wrapper and header geometry classes (D isModal branch).
  assert.match(detail, /<div class="cz-skill-detail flex flex-col h-full px-6 pb-6 gap-3"><div class="cz-skill-head flex justify-between min-h-14 items-center py-3 -me-6 pe-md"><div class="flex flex-1 flex-col min-w-0"><div class="flex min-w-0 items-center gap-xs"><h2 class="min-w-0 font-large-bold text-primary truncate">figma<\/h2>/);
  // wt order: primary sm Try in chat, then the ghost ⋮ "More options for figma" (no switch on this core).
  const actions = detail.match(/<div class="cz-skill-actions flex items-center gap-2">(.*?)<\/div><\/div><div class="cz-skill-facts/)[1];
  const order = [...actions.matchAll(/<button[^>]*?(?:aria-label="([^"]+)"[^>]*)?data-cds="(Button|Switch)"(?: data-variant="(\w+)")?[^>]*>/g)].map(match => match[2] === 'Switch' ? 'switch' : `${match[3]}:${match[1] ?? ''}`);
  assert.deepEqual(order, ['primary:', 'ghost:More options for figma']);
  assert.match(actions, /^<button type="button" data-cds="Button" data-variant="primary" data-size="sm"[^>]*>.*?Try in chat<\/span><\/button>/);
  assert.match(actions, /<button aria-label="More options for figma" aria-haspopup="menu" aria-expanded="false" type="button" data-cds="Button" data-variant="ghost" data-size="sm" data-cds-icon-only=""/);
  assert.doesNotMatch(detail, /Show in Finder|Use in message/);
  // ccb4abbdf facts: Added by / Last updated (font-small muted labels, font-base primary values, a time element).
  assert.match(detail, /<div class="cz-skill-facts flex flex-wrap gap-x-8 gap-y-3"><div class="flex min-w-0 max-w-full flex-col gap-1"><span class="font-small text-muted whitespace-nowrap">Added by<\/span><span class="font-base text-primary \[overflow-wrap:anywhere\]">You<\/span><\/div><div class="flex flex-col gap-1"><span class="font-small text-muted whitespace-nowrap">Last updated<\/span><span class="font-base text-primary whitespace-nowrap"><time dateTime="2025-10-09T08:53:20.000Z">[^<]+<\/time><\/span><\/div><\/div>/);
  // c6f9b6c10: h3 Description + InfoTip, then the pre-wrap secondary text.
  assert.match(detail, /<div class="cz-skill-description flex flex-col gap-1"><div class="flex items-center justify-between"><div class="flex items-center gap-0\.5"><h3 class="font-small text-muted">Description<\/h3><button type="button" data-cds="InfoTip" aria-label="More info" class="cz-infotip" aria-haspopup="dialog" aria-expanded="false">/);
  assert.match(detail, /<p class="font-base text-secondary whitespace-pre-wrap \[overflow-wrap:anywhere\]">Design files\nand frames<\/p><\/div><div class="cz-skill-files flex-1 min-h-0 flex flex-col gap-3 mt-2">/);
  assert.doesNotMatch(detail, /connector|~\/\.codex/i);
  // Codex keeps a working switch; there is no notice paragraph on either core.
  const codex = corePage('skills', readyStore({ skills }), { focus: { skillPath: skills[0].path }, onUseSkill() {} });
  assert.doesNotMatch(switches(codex)[0], /disabled/);
  assert.doesNotMatch(codex, /cz-muted|saved to ~\/\.codex/);
  assert.match(codex, /<button aria-label="More options for figma" disabled=""/, 'ct disables its trigger without items');
  assert.match(corePage('skills', readyStore()), /<li class="cz-root-row"><code>~\/\.codex\/skills<\/code>/);
  // Skill rows are named "View {name}" (page shell G :555); a search with no match is the plain p.
  const list = corePage('skills', readyStore({ skills }), { core: deepseekCore });
  // B24: ccea1f474 Ws / c27f32a39 je row — the drill button is named "View {name}".
  assert.match(list, /<div data-testid="skills-tabbed-list-row" class="group\/yours-row [^"]*" data-row-id="\/x\/\.agents\/skills\/figma\/SKILL\.md"[^>]*><button type="button" aria-label="View figma"/);
  assert.doesNotMatch(list, /cz-notice|cz-layout|cz-main/);
  assert.match(list, /<\/header><div class="cz-page-body scroll-fade-y scroll-fade-size-6"><div class="flex w-full flex-col gap-lg" data-testid="skills-tabbed-list-mine">/, 'the "Your skills" list follows the header directly');
  const nomatch = corePage('skills', readyStore({ skills }), { core: deepseekCore, focus: { searchSeed: 'zzz' } });
  assert.match(nomatch, /<p class="cz-empty-search py-lg text-center text-body text-secondary">No skills match your search<\/p>/);
  assert.doesNotMatch(nomatch, /data-pictogram|role="status"/);
});

test('B24 Skills toolbar: "Your skills" tab, the K Filter and dn Sort controls, and the grouped sections with counts', () => {
  const skills = [{ id: 'a', name: 'a', skillName: 'a', path: '/a/SKILL.md', scope: 'user', enabled: true, group: 'personal' },
    { id: 'b', name: 'b', skillName: 'b', path: '/b/SKILL.md', scope: 'repo', enabled: true, group: 'repository' }];
  const html = corePage('skills', readyStore({ skills }));
  // ccefd43d9 b inDialog: the toolbar (c3c330885 D) sits beside the title.
  assert.match(html, /<header class="cz-header"><div class="cz-title-row flex min-w-0 flex-1 items-center gap-md"><h2 class="cz-title text-heading-medium">Skills<\/h2><div class="shrink-0"><div class="flex flex-wrap items-center justify-between gap-sm" data-cz-list-toolbar=""><div data-cds="Tabs" data-orientation="horizontal"><div role="tablist" aria-label="Skills"[^>]*><button type="button" role="tab" aria-selected="true" tabindex="0" data-testid="skills-tabbed-list-tab-mine">Your skills<\/button>/);
  assert.match(html, /<div class="ml-auto flex items-center gap-xs"><button data-cz-filter="" aria-label="Filter" aria-haspopup="menu"[^>]*data-variant="secondary" data-size="sm"/);
  assert.match(html, /<button data-cz-sort="" aria-label="Sort by Last edited" aria-haspopup="menu"[^>]*>.*?<span class="text-muted">Sort ·<\/span> Last edited<\/span><\/button><\/div>/);
  assert.doesNotMatch(html, /data-cz-reset|role="radiogroup"|<table/, 'nothing held: no reset button, no owner segments or table');
  // c6a2a31c4 Nc order: "In this project" before "Created by you", each with its "· {count}".
  assert.deepEqual([...html.matchAll(/<span class="text-body-medium text-primary">([^<]+)<\/span><span class="text-footnote text-muted">· (\d+)<\/span>/g)].map(match => `${match[1]}:${match[2]}`), ['In this project:1', 'Created by you:1']);
  assert.deepEqual([...html.matchAll(/data-row-id="([^"]+)"/g)].map(match => match[1]), ['b', 'a']);
  // ccea1f474 Ws credit and the c27f32a39 Xe menu.
  assert.match(html, /<span class="truncate text-secondary text-footnote"><span>by you<\/span><\/span>/);
  assert.match(html, /aria-label="More actions for a" aria-haspopup="menu"/);
});

test('DeepSeek Plugins: no notice, the "(marketplace)" suffix only on name collisions, and the ObjectPuzzle empty state', () => {
  const plugin = (id, name, marketplaceName) => ({ id, pluginName: id, name, description: '', author: '', enabled: true, source: 'local', marketplaceName, marketplacePath: '/h/profile', skillCount: 0, updatedAt: null });
  const plugins = [plugin('@deepseek-ai/dsh-base', '@deepseek-ai/dsh-base', 'DeepSeek Harness profile')];
  const ready = corePage('plugins', readyStore({ plugins }), { core: deepseekCore });
  const empty = corePage('plugins', readyStore(), { core: deepseekCore });
  for (const html of [ready, empty]) assert.doesNotMatch(html, /ChatGPT|dsh plugin add|cz-notice|Plugins are DeepSeek Harness bundles/);
  assert.match(ready, /data-plugin-id="@deepseek-ai\/dsh-base"/);
  assert.match(ready, /aria-label="View @deepseek-ai\/dsh-base"/);
  assert.doesNotMatch(ready, /DeepSeek Harness profile|data-plugin-suffix/, 'a unique name has no marketplace suffix');
  const twins = corePage('plugins', readyStore({ plugins: [plugin('foo-a', 'Foo', 'Alpha'), plugin('foo-b', 'Foo', 'Beta')] }));
  assert.deepEqual([...twins.matchAll(/<span class="truncate text-body-medium text-primary">(Foo)<\/span><span class="truncate text-footnote text-muted" data-plugin-suffix="">([^<]+)<\/span>/g)].map(match => match[2]), ['(Alpha)', '(Beta)']);
  assert.match(empty, /<div class="cz-empty flex flex-1 flex-col items-center justify-center gap-lg py-lg text-center" data-cz-empty=""><svg data-cds="Pictogram" data-pictogram="ObjectPuzzle"[^>]*>.*<\/svg><p class="max-w-xs text-pretty text-body text-secondary">Give DeepSeek role-level expertise with plugins<\/p><\/div>/);
  assert.doesNotMatch(corePage('plugins', readyStore({ plugins })), /needs the ChatGPT plugin service|cz-notice/, 'Codex has no notice either');
  const nomatch = corePage('plugins', readyStore({ plugins }), { focus: { searchSeed: 'zzz' } });
  assert.match(nomatch, /<p class="cz-empty-search py-lg text-center text-body text-secondary">No plugins match your search<\/p>/);
});

test('R04 DeepSeek invocation policy: no Disabled badge or switch, Try in chat for user-invocable skills, the ccb4abbdf Trigger fact; Codex unchanged', () => {
  const base = { scope: 'user', group: 'personal', description: 'Fixture', updatedAt: 1760000000 };
  const slash = { ...base, id: '/u/slash/SKILL.md', name: 'slash-only', skillName: 'slash-only', path: '/u/slash/SKILL.md', enabled: false, userInvocable: true, modelInvocable: false, version: '1.2.0' };
  const auto = { ...base, id: '/u/auto/SKILL.md', name: 'auto-only', skillName: 'auto-only', path: '/u/auto/SKILL.md', enabled: true, userInvocable: false, modelInvocable: true, version: null };
  const both = { ...base, id: '/u/both/SKILL.md', name: 'both', skillName: 'both', path: '/u/both/SKILL.md', enabled: true, userInvocable: true, modelInvocable: true, version: null };
  const store = readyStore({ skills: [auto, both, slash] });
  // customize-skills :3130-3131: the Disabled badge needs the toggle capability.
  assert.doesNotMatch(corePage('skills', store, { core: deepseekCore }), /cz-badge|data-cds="Badge" data-variant="neutral"|>Disabled</);
  const detail = path => corePage('skills', store, { core: deepseekCore, focus: { skillPath: path }, onUseSkill() {} });
  const tryButton = html => html.match(/<button [^>]*data-variant="primary"[^>]*>(?:(?!<\/button>).)*Try in chat<\/span><\/button>/)[0];
  const trigger = html => html.match(/<div class="flex flex-col gap-1" data-cz-skill-trigger=""><span class="font-small text-muted whitespace-nowrap">Trigger<\/span><span class="font-base text-primary whitespace-nowrap cursor-help underline decoration-dotted decoration-alpha-2 underline-offset-4" tabindex="0">([^<]+)<\/span><\/div>/)?.[1];
  const slashDetail = detail(slash.path);
  // cfaabd194 `Ce && Switch`: no switch; Try in chat enabled for a slash-only (model-hidden) skill.
  assert.equal(switches(slashDetail).length, 0);
  assert.doesNotMatch(tryButton(slashDetail), /disabled/); assert.doesNotMatch(slashDetail, /Enable skill to try in chat/);
  // ccb4abbdf r order: Added by, Version (metadata.version), Last updated, Trigger.
  assert.deepEqual([...slashDetail.matchAll(/<span class="font-small text-muted whitespace-nowrap">([^<]+)<\/span>/g)].map(match => match[1]), ['Added by', 'Version', 'Last updated', 'Trigger']);
  assert.match(slashDetail, /<span class="font-small text-muted whitespace-nowrap">Version<\/span><span class="font-base text-primary whitespace-nowrap">1\.2\.0<\/span>/);
  assert.equal(trigger(slashDetail), 'Slash command');
  assert.equal(trigger(detail(both.path)), 'Slash command + auto');
  const autoDetail = detail(auto.path);
  assert.equal(trigger(autoDetail), 'Auto');
  assert.match(tryButton(autoDetail), /disabled=""/, 'a model-only skill cannot be tried from the / menu');
  assert.doesNotMatch(autoDetail, /Version|Enable skill to try in chat/);
  // A Codex core: no invocation policy, so the switch, the badge and the Enable-skill gate are unchanged and no Trigger.
  const codexSkill = { ...base, id: '/c/off/SKILL.md', name: 'off', skillName: 'off', path: '/c/off/SKILL.md', enabled: false };
  const codexStore = readyStore({ skills: [codexSkill] });
  assert.match(corePage('skills', codexStore), /<span data-cds="Badge" data-variant="neutral" data-size="xs" class="[^"]*bg-neutral text-secondary"><span class="pb-\[0\.05em\]">Disabled<\/span><\/span>/);
  const codexDetail = corePage('skills', codexStore, { focus: { skillPath: codexSkill.path }, onUseSkill() {} });
  assert.equal(switches(codexDetail).length, 1); assert.doesNotMatch(switches(codexDetail)[0], /disabled/);
  assert.match(codexDetail, /data-cds-disabled-reason="">Enable skill to try in chat<\/span>/);
  assert.equal(trigger(codexDetail), undefined);
});

test('R04 connected connector drill draws the c2e7fd468 LocalConfig from mcpDefinitions: names only, nothing without a match', () => {
  const rows = [{ id: 'gh', name: 'gh', title: 'GitHub', kind: 'connected', tools: ['search'], authStatus: 'unsupported', description: 'Repos' },
    { id: 'down', name: 'down', title: 'down', kind: 'unreachable', tools: [], authStatus: 'unsupported' }];
  // An extra env table (never sent by settings-pages.cjs mcpDefinitions) proves values are never read.
  const definitions = [{ name: 'gh', command: 'npx', args: ['-y', 'srv'], environmentNames: ['TOKEN'], env: { TOKEN: 'secret-value' } }, { name: 'down', command: 'x', args: [], environmentNames: [] }];
  const drill = (name, mcpDefinitions) => corePage('connectors', readyStore({ mcp: rows }), { focus: { connectorName: name }, mcpDefinitions });
  const html = drill('gh', definitions);
  const block = html.match(/<div class="mt-4" data-cz-local-config=""><div class="space-y-4">(.*?)<\/div><\/div><div class="relative mt-6 isolate">/)?.[1];
  assert.ok(block, 'mt-4 > space-y-4 between the description and the tools');
  assert.ok(html.indexOf('Repos') < html.indexOf('data-cz-local-config'));
  assert.deepEqual([...block.matchAll(/<span class="font-small-bold text-secondary flex items-center gap-sm">([^<]+)<\/span>/g)].map(match => match[1]), ['Command', 'Arguments', 'Environment variables']);
  assert.equal(count(block, 'aria-expanded="true"'), 3, 'every section defaults open');
  const code = 'block overflow-hidden whitespace-pre-wrap [overflow-wrap:anywhere] rounded bg-surface-1 px-2 py-1 font-mono text-sm text-primary';
  assert.match(block, new RegExp(`<div class="pt-1"><code class="${code.replace(/[[\]]/g, '\\$&')}">npx</code></div>`));
  assert.match(block, />-y srv<\/code>/);
  assert.match(block, /<code class="[^"]* space-y-1"><span class="block"><span class="text-secondary">TOKEN<\/span>=••••••••<\/span><\/code>/);
  assert.doesNotMatch(html, /secret-value/);
  // A url server shows the URL row; a definition without args or env names draws only that section.
  const url = drill('gh', [{ name: 'gh', url: 'https://example.test/mcp', args: [], environmentNames: [] }]);
  assert.deepEqual([...url.matchAll(/gap-sm">([^<]+)<\/span><\/button>/g)].map(match => match[1]), ['URL']);
  assert.match(url, />https:\/\/example\.test\/mcp<\/code>/);
  // No matching definition or no definitions at all: nothing.
  for (const other of [drill('gh', [definitions[1]]), drill('gh', undefined)]) assert.doesNotMatch(other, /data-cz-local-config|>Command<|Environment variables/);
  // A failing connector also shows what was saved (below Reconnect), so a typo in its command is visible.
  const down = drill('down', definitions);
  assert.match(down, /data-connector-view="disconnected".*data-connector-failure="".*data-cz-local-config="".*>x<\/code>/);
});

test('R04 connector feedback: no page paragraphs or inline confirm, and every outcome is a source toast', async () => {
  const rows = [{ id: 'gh', name: 'gh', title: 'GitHub', kind: 'connected', tools: [], authStatus: 'unsupported' }, { id: 'down', name: 'down', title: 'down', kind: 'unreachable', tools: [], authStatus: 'unsupported' }];
  for (const html of [corePage('connectors', readyStore({ mcp: rows })), corePage('connectors', readyStore({ mcp: rows }), { focus: { connectorName: 'gh' } }), corePage('connectors', readyStore({ mcp: rows }), { focus: { connectorName: 'down' } })])
    assert.doesNotMatch(html, /cz-info|cz-error|cz-drill-notices|cz-confirm|Confirm removal|role="alert"/);
  const { createToastStore } = await server.ssrLoadModule('/src/toast-store.mjs');
  const { customizeCore } = await server.ssrLoadModule('/src/customize-model.mjs');
  const warnings = [], warn = console.warn;
  const harness = (call, toasts = createToastStore({ schedule: () => 0, cancel() {} })) => ({ toasts, actions: M.connectorActions({ call, toasts, store: { loadMcp: async () => {} }, onOpenExternal: async () => {}, copy: customizeCore() }) });
  const reject = async () => { throw new Error('RAW backend failure'); };
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    // A rejected reconnect: exactly one danger toast with the customize-connectors :2565-2590 copy; the raw reason goes to the console.
    const failed = harness(reject);
    assert.equal(await failed.actions.reconnect({ name: 'gh' }), false);
    assert.deepEqual(failed.toasts.getSnapshot().map(entry => [entry.variant, entry.message]), [['danger', 'Connection to server failed. You can try again.']]);
    assert.doesNotMatch(JSON.stringify(failed.toasts.getSnapshot()), /RAW/); assert.match(warnings.at(-1), /RAW backend failure/);
    const outcome = async (name, call) => { const run = harness(call); await run.actions[name]({ name: 'gh' }); return run.toasts.getSnapshot().map(entry => [entry.variant, entry.message]); };
    assert.deepEqual(await outcome('signIn', reject), [['danger', 'Connection to server failed. You can try again.']]);
    assert.deepEqual(await outcome('refresh', reject), [['danger', 'Couldn’t refresh tools list. You can try again.']]);
    assert.deepEqual(await outcome('refresh', async () => ({})), [['neutral', 'Tools list refreshed']]);
    assert.deepEqual(await outcome('reconnect', async () => ({})), [], 'a successful reconnect says nothing');
    assert.deepEqual(await outcome('signIn', async () => ({ authorizationUrl: 'https://example.invalid/oauth' })), [], 'no "finish signing in" notice');
    assert.deepEqual(await outcome('remove', reject), [['danger', 'Failed to remove server']]);
    assert.deepEqual(await outcome('remove', async () => ({})), [['neutral', 'Removed gh from ~/.codex/config.toml.']]);
  } finally { console.warn = warn; }
});

test('R04 plugin drill: DeepSeek tab copy, c26958849 connector rows, the empty pe line and Last updated —', () => {
  const detail = { mcpServers: ['fx-off', 'fx-on'] };
  const mcp = { rows: [{ name: 'fx-on', title: 'Fixture On', kind: 'connected' }, { name: 'fx-off', title: 'fx-off', kind: 'signIn' }], loading: false };
  // settings-14: Kt opens on Overview (`qt=Kt.some(e=>e.id===U)?U:"overview"`), so the drill selects Connectors.
  const render = (props = {}) => renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true, source: 'git' }, detail, error: '', skills: [], view: { tab: 'connectors', query: '' }, onView() {}, onBack() {}, onSkill() {}, onConnector() {}, mcp, ...props }));
  const html = render();
  assert.doesNotMatch(html, /Claude/);
  assert.match(html, /<p class="cz-plugin-tab-description">Tools and data sources this plugin connects to\. Connect each one so Codex can use it\.<\/p>/);
  const rows = [...html.matchAll(/<li><button type="button" class="([^"]+)" data-connector-name="([^"]+)">(.*?)<\/button><\/li>/g)];
  assert.deepEqual(rows.map(match => match[2]), ['fx-off', 'fx-on']);
  assert.equal(rows[1][1], 'flex items-center gap-3 px-3 py-1.5 text-left cursor-pointer rounded-lg text-sm w-full hover:bg-surface-0 text-primary');
  assert.match(rows[0][1], / text-muted$/, 'a not-connected row is muted');
  assert.match(rows[1][3], /^<span class="flex-shrink-0 flex items-center justify-center size-6 text-secondary"><span aria-hidden="true" class="cz-connector-tile">/);
  assert.match(rows[0][3], /^<span class="flex-shrink-0 flex items-center justify-center size-6 text-secondary opacity-50">/);
  assert.match(rows[1][3], /<span class="flex items-center gap-1\.5 min-w-0"><span class="truncate">Fixture On<\/span><\/span><span class="font-small text-muted truncate" title="Connected">Connected<\/span><\/div>$/);
  assert.match(rows[0][3], /<span class="truncate">fx-off<\/span><\/span><span class="font-small text-muted truncate" title="Sign-in required">Sign-in required<\/span>/);
  // Without onConnector the rows are plain (non-interactive) items; while the catalog loads, pe's two h-control bars.
  assert.doesNotMatch(render({ onConnector: undefined }), /<button type="button" class="flex items-center gap-3/);
  assert.equal(count(render({ mcp: { rows: [], loading: true } }), 'h-control w-full'), 2);
  // pe without connectors: "This plugin has no required connectors."
  const none = renderToStaticMarkup(React.createElement(M.PluginConnectors, { tab: { id: 'connectors', items: [] }, items: [], loading: false }));
  assert.equal(none, '<p class="py-md text-body text-muted">This plugin has no required connectors.</p>');
  // c26e90ba3 qt: `!local && Last updated` with the muted "—".
  assert.match(html, /<div><span>Last updated<\/span><div><span class="text-muted">—<\/span><\/div><\/div>/);
  assert.doesNotMatch(render({ plugin: { id: 'p', name: 'P', enabled: true, source: 'local' } }), /Last updated/);
  const skills = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: { id: 'p', name: 'P', enabled: true, source: 'local' }, detail: { skills: [{ name: 'a' }] }, error: '', skills: [], view: { tab: 'skills', query: '' }, onView() {}, onBack() {}, onSkill() {} }));
  assert.match(skills, /Invoke by typing \/ in chat, or let Codex use them automatically for relevant tasks\./);
});
