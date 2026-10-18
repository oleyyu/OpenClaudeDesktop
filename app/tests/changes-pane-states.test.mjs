import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// SSR of the Changes/Plan pane body states through the real SourceFilePanel:
// ke (2.2553.1 readable/panes-diff-states-current.js:54-92), rh
// (tmp-shared-20-BrTrXIRV.js:2703-2717), EmptyState (cc0a875c8-B6xI6vLN.js) and kp
// (panes-tile-current.js:1751-1766). Middleware mode only; no browser/Electron/Codex.
let server, S, P;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  P = await server.ssrLoadModule('/src/source-pane-states.jsx');
});
after(() => server?.close());
const panel = props => renderToStaticMarkup(React.createElement(S.SourceFilePanel, { sessionId: 's', cwd: '/tmp/work', tab: 'changes', ...props }));
const body = html => html.slice(html.indexOf('</header>') >= 0 ? html.indexOf('</header>') : 0);
const text = html => html.replace(/<[^>]+>/g, '');
const EMPTY_ROOT = '<div class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state">';

test('loading: centered rh wrapper, status named "Loading changes", no visible text, spinner deferred', () => {
  const html = panel({ loading: true, diffScope: 'uncommitted' });
  assert.match(html, /<div class="flex items-center justify-center h-full w-full source-pane-state"><span role="status" aria-label="Loading changes" class="leading-\[0\]"><\/span><\/div>/);
  assert.doesNotMatch(text(body(html)), /Loading/);
  assert.doesNotMatch(html, /class="spinner"/);
  assert.match(html, /aria-busy="true"/);
});

test('failed: role=alert EmptyState with the Warning icon, "Couldn’t load the changes" and a secondary "Try again" (cb61be3a2 ze/W)', () => {
  const html = panel({ diffError: 'Could not load repository diff: fatal: secret-detail', diffScope: 'uncommitted', onRefresh: () => {} });
  assert.match(html, /<div data-diff-pane-body="" tabindex="-1" class="h-full w-full outline-none source-pane-state"><div role="alert" class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state"><span aria-hidden="true" data-cds="Icon" class="!size-7 text-muted" style="font-size:24px;font-weight:[\d.]+">.<\/span><div class="flex flex-col items-center gap-1"><p class="max-w-\[36ch\] break-words text-body text-primary">Couldn’t load the changes<\/p><\/div><div class="flex flex-wrap items-center justify-center gap-1"><button type="button" data-cds="Button" data-variant="secondary"[^>]*>(?:<[^>]+>)*Try again/);
  assert.doesNotMatch(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /secret-detail|fatal:|Could not load repository diff|Close and reopen/);
  assert.equal(P.CHANGES_FAILED_TITLE, 'Couldn’t load the changes');
  // While the refetch it started runs, the button is busy and named "Loading changes".
  const busy = panel({ diffError: 'boom', onRefresh: () => {}, diffRetrying: true });
  assert.match(busy, /<button aria-label="Loading changes" type="button" data-cds="Button" data-variant="secondary" aria-busy="true"/);
  // Without a refetch handler there is no button (never a dead control).
  assert.doesNotMatch(panel({ diffError: 'boom' }), /Try again/);
});

test('Try again runs the pane Refresh', () => {
  let refreshed = 0, onClick = null;
  const element = React.createElement(P.SourceChangesState, { state: 'failed', onRetry: () => { refreshed += 1; } });
  // Walk the rendered element tree to the button's onClick (SSR has no events).
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node.props?.onClick && node.props.children === P.CHANGES_RETRY_LABEL) onClick = node.props.onClick;
    const rendered = typeof node.type === 'function' ? node.type(node.props) : null;
    visit(rendered ?? node.props?.children);
    if (node.props?.actions) visit(node.props.actions);
  };
  visit(element);
  assert.equal(typeof onClick, 'function');
  onClick();
  assert.equal(refreshed, 1);
});

test('empty: data-diff-pane-body with "No uncommitted changes" (uncommitted scope) or "No changes to show"', () => {
  const uncommitted = panel({ diff: '', diffScope: 'uncommitted' });
  assert.match(uncommitted, new RegExp('<div data-diff-pane-body="" tabindex="-1" class="h-full w-full outline-none source-pane-state">' + EMPTY_ROOT.replace(/[[\]().]/g, '\\$&') +
    '<div class="flex flex-col items-center gap-1"><p class="max-w-\\[36ch\\] break-words text-body text-primary">No uncommitted changes</p></div></div></div>'));
  assert.doesNotMatch(uncommitted, /role="alert"|data-cds="Icon" class="!size-7/);
  assert.match(panel({ diff: '' }), /<p class="max-w-\[36ch\] break-words text-body text-primary">No changes to show<\/p>/);
});

test('plan empty: Checklist icon in the 28px box, "No plan yet" and the adapted body; tasks still render', () => {
  const html = panel({ tab: 'plan', plan: [] });
  assert.match(html, new RegExp(EMPTY_ROOT.replace(/[[\]().]/g, '\\$&') + '<span aria-hidden="true" data-cds="Icon" class="!size-7 text-muted" style="font-size:24px;font-weight:[\\d.]+">.</span>' +
    '<div class="flex flex-col items-center gap-1"><p class="max-w-\\[36ch\\] break-words text-body text-primary">No plan yet</p><p class="max-w-\\[36ch\\] break-words text-footnote text-muted">DeepSeek writes the plan here as it works\\. Keep chatting\\.</p></div></div>'));
  assert.doesNotMatch(html, /The plan will appear here/);
  assert.equal(panel({ tab: 'plan' }).includes('No plan yet'), true);
  const tasks = panel({ tab: 'plan', plan: [{ step: 'Read the code', status: 'completed' }] });
  assert.match(tasks, /<section class="mt-pad-lg source-plan-tasks"><h2 class="[^"]*">Tasks<\/h2>/);
  assert.doesNotMatch(tasks, /No plan yet/);
});

test('plan tasks: kp/Op wrapper and the ZO/VT list (Check, spinner, Placeholder, sr-only words, strike-through)', () => {
  const html = panel({ tab: 'plan', plan: [
    { step: 'Read `src/a.js`', status: 'completed' },
    { step: 'Fix it', status: 'inProgress' },
    { step: 'Test', status: 'pending' },
  ] });
  const plan = body(html);
  // kp todos-only branch: scroller, 68ch column, Op section with the Nd caption heading.
  assert.match(plan, /<div class="h-full select-text overflow-y-auto \[contain:strict\] \[scrollbar-gutter:stable_both-edges\] p-lg source-plan"><div class="mx-auto max-w-\[68ch\]"><section class="mt-pad-lg source-plan-tasks">/);
  assert.match(plan, /<h2 class="text-caption-medium uppercase tracking-wide text-muted mb-1\.25">Tasks<\/h2>/);
  // ZO: ul gap-xs, li gap-1; only the completed row is struck through.
  assert.match(plan, /<ul class="flex flex-col gap-xs text-body select-text py-xs source-plan-list">/);
  const rows = [...plan.matchAll(/<li data-state="([^"]+)" class="([^"]+)">(.*?)<\/li>/g)].map(([, state, cls, inner]) => ({ state, cls, inner }));
  assert.deepEqual(rows.map(row => [row.state, row.cls]), [
    ['completed', 'flex items-start gap-1 line-through decoration-1 text-secondary'],
    ['in_progress', 'flex items-start gap-1 text-primary'],
    ['pending', 'flex items-start gap-1 text-primary'],
  ]);
  // VT: 16px box; Check / Spinner sm / muted Placeholder; exact sr-only words.
  const box = 'shrink-0 size-\\[calc\\(1rem\\*var\\(--cds-rem-scale,1\\)\\)\\] mt-\\[1px\\] flex items-center justify-center';
  assert.match(rows[0].inner, new RegExp(`^<span class="${box} text-primary"><span aria-hidden="true" data-cds="Icon" class="" style="font-size:16px;font-weight:[\\d.]+">.</span><span class="sr-only select-none">done</span></span>`));
  assert.match(rows[1].inner, new RegExp(`^<span class="${box} text-primary"><span data-cds="Spinner"[^>]*style="width:calc\\(0\\.75rem`));
  assert.match(rows[2].inner, new RegExp(`^<span class="${box}"><span aria-hidden="true" data-cds="Icon" class="text-muted"`));
  assert.deepEqual([...plan.matchAll(/<span class="sr-only select-none">([^<]*)<\/span>/g)].map(match => match[1]), ['done', 'in progress', 'not done']);
  assert.doesNotMatch(plan, /inProgress|CheckCircle|source-plan-pending/);
  assert.equal((plan.match(/data-cds="Spinner"/g) || []).length, 1);
  // Step text goes through the inline renderer: a backtick span is a code chip.
  assert.match(rows[0].inner, /<div class="suc-text source-plan-step min-w-0 flex-1">Read <code class="suc-inline-code">src\/a\.js<\/code><\/div>$/);
  assert.match(rows[1].inner, /<div class="suc-text source-plan-step min-w-0 flex-1">Fix it<\/div>$/);
});

test('Spinner xo lg geometry once shown: 20px box, 2px track, muted conic head, reduced-motion safe', () => {
  const html = renderToStaticMarkup(React.createElement(P.SourceSpinner, { size: 'lg' }));
  assert.match(html, /^<span data-cds="Spinner" class="relative inline-block shrink-0 align-middle" style="width:calc\(1\.25rem \* var\(--cds-rem-scale, 1\)\);height:calc\(1\.25rem \* var\(--cds-rem-scale, 1\)\)" aria-hidden="true">/);
  assert.match(html, /<span class="absolute inset-0 rounded-full" style="border:calc\(0\.125rem \* var\(--cds-rem-scale, 1\)\) solid var\(--cds-border\)"><\/span>/);
  assert.match(html, /class="absolute inset-0 rounded-full animate-\[spin_1s_linear_infinite\] motion-reduce:animate-none" style="background:conic-gradient\(transparent 40%, var\(--cds-text-muted\)\)/);
  assert.equal(renderToStaticMarkup(React.createElement(P.SourceSpinner, { size: 'lg', delay: 1000 })), '');
});

// R10 Changes header + file list (panes-tile-current.js:3640-3690 dh; panes-diff-view-current.js
// :5221-5232 Qe, :5258-5276 folded seed, :5530-5597 column / edge / banner).
const filePatch = (path, added, removed = 0) => {
  const old = Array.from({ length: removed }, (_, i) => `-old ${i}`), next = Array.from({ length: added }, (_, i) => `+new ${i}`);
  return [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`, `@@ -1,${removed} +1,${added} @@`, ...old, ...next].join('\n') + '\n';
};
const twoFiles = filePatch('src/app.js', 1, 1) + filePatch('README.md', 2, 0);
const header = html => html.slice(html.indexOf('<header'), html.indexOf('</header>'));
const toggles = html => [...html.matchAll(/<button[^>]*class="sdiff-file-toggle[^"]*"[^>]*>/g)].map(match => match[0]);
const BANNER = 'Files are collapsed for large diffs. Select a file to expand it.';

test('header: ghost ListBullet "Show files" (aria-pressed, ⇧⌘Y) before the scope trigger; "Hide files" while shown', () => {
  const scope = React.createElement('button', { type: 'button', 'data-scope': '' }, 'Diff scope');
  const html = panel({ diff: twoFiles, diffScopeControl: scope, treeToggleRef: { current: null } });
  const head = header(html);
  const button = head.match(/<button[^>]*aria-label="Show files"[^>]*>/)?.[0];
  assert.ok(button, head);
  assert.match(button, /class="source-icon-button -ml-\[4px\]"/);
  assert.match(button, /data-diff-file-list-toggle=""/);
  assert.match(button, /aria-pressed="false"/);
  assert.match(button, /aria-keyshortcuts="Meta\+Shift\+Y"/);
  assert.doesNotMatch(button, /title=/);
  assert.ok(head.indexOf('aria-label="Show files"') < head.indexOf('data-scope'), 'ListBullet precedes diffScopeControl');
  assert.match(head, /aria-label="Show files"[^>]*><span aria-hidden="true" data-cds="Icon"/);
  // Shown (store diffShowTree true): "Hide files", pressed; no handle → no keycap.
  const shown = header(panel({ diff: twoFiles, diffTree: { diffShowTree: true, diffTreeWidth: 300, diffFileTree: true, diffGroupByKind: false }, onDiffTreeChange: () => {} }));
  const pressed = shown.match(/<button[^>]*aria-label="Hide files"[^>]*>/)?.[0];
  assert.match(pressed, /aria-pressed="true"/);
  assert.doesNotMatch(pressed, /aria-keyshortcuts/);
  // uh: no toggle on an empty or failed body, nor on other tabs; the loading body keeps it.
  assert.doesNotMatch(panel({ diff: '' }), /aria-label="(?:Show|Hide) files"/);
  assert.doesNotMatch(panel({ diff: twoFiles, diffError: 'boom' }), /aria-label="(?:Show|Hide) files"/);
  assert.doesNotMatch(panel({ tab: 'plan', diff: twoFiles }), /aria-label="(?:Show|Hide) files"/);
  assert.match(header(panel({ loading: true })), /aria-label="Show files"/);
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-session.jsx'), 'utf8');
  assert.match(src, /<SourceTooltip content=\{diffShowTree \? t\("Hide files"\) : t\("Show files"\)\} shortcut=\{treeToggleRef \? TREE_TOGGLE_SHORTCUT : undefined\}\s*side="top" align="start" hoverable=\{false\}>/);
});

test('file list column: hidden by default with the "Show files" edge; shown with the Changed files tree and its resize handle', () => {
  const hidden = body(panel({ diff: twoFiles }));
  // cccc2cf0a: the Changes view sits in the focusable div[data-diff-pane-body] (R3-files FT-07, for cae42d46f Ue).
  assert.match(hidden, /<div class="sdiff-changes-layout outline-none" data-diff-pane-body="" tabindex="-1">/);
  assert.doesNotMatch(hidden, /role="tree"/);
  assert.match(hidden, /<div class="source-tree-edge sdiff-file-list-edge" role="separator" tabindex="0" aria-label="Show files" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="640" aria-valuenow="0">/);
  // The scroller keeps its class and holds the diff view.
  assert.match(hidden, /<div class="sdiff-changes-main"><div class="source-changes"><div data-layout="unified"/);
  const html = body(panel({ diff: twoFiles, diffTree: { diffShowTree: true, diffTreeWidth: 300, diffFileTree: true, diffGroupByKind: false }, onDiffTreeChange: () => {} }));
  // R3-files FT-07: c44d00c7f's column edge is the logical border-e (the pane line marker too), the tree is wc's
  // `${A} h-full overflow-y-auto ${N} outline-none hide-focus-ring` (ca7840910 A = group/file-tree).
  assert.match(html, /<div class="sdiff-file-list relative shrink-0 flex flex-col min-h-0 border-e" data-pane-line="" style="width:300px;min-width:min\(160px, 100% - 160px\);max-width:min\(640px, 100% - 160px\)">/);
  assert.match(html, /<div role="tree" aria-label="Changed files" tabindex="0" class="group\/file-tree \[&amp;:where\(:root\[dir=rtl\]_:dir\(rtl\)\)\]:\[--file-tree-guides-to:to_left\] h-full overflow-y-auto px-xs py-1\.25 outline-none hide-focus-ring">/);
  assert.match(html, /role="separator" tabindex="0" aria-label="Resize file list" aria-orientation="vertical" aria-valuemin="160"/);
  assert.doesNotMatch(html, /aria-label="Show files" aria-orientation/);
  // Folder rows first (tree order), then root files; file rows carry the kind icon, name and footnote counts.
  const rows = [...html.matchAll(/<button[^>]*data-diff-tree-row=""[^>]*>(.*?)<\/button>/g)].map(match => match[0]);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /role="treeitem" tabindex="-1" aria-level="1" aria-expanded="true"/);
  // ca7840910 V(depth): 8px + 10px a level, and below the root the guide layer (diffgit-03).
  assert.match(rows[0], /style="padding-inline-start:8px"/);
  assert.match(rows[0], /<span class="flex min-w-0"><span dir="ltr" class="relative flex min-w-0 overflow-hidden whitespace-nowrap"><span class="min-w-0 truncate">src<\/span><\/span><\/span>/);
  assert.match(rows[1], /style="padding-inline-start:18px;--file-tree-guides:repeating-linear-gradient\(var\(--file-tree-guides-to, to right\), var\(--cds-border\) 0 1px, transparent 1px 10px\);--file-tree-guides-x:14px;background-position:14px 0;background-repeat:no-repeat;background-size:10px 100%"[^>]*aria-level="2"/);
  assert.match(rows[1], /<span class="truncate min-w-0 flex-1">app\.js<\/span><span class="flex shrink-0 items-center gap-0\.5 text-footnote tabular-nums"><span class="text-git-added">\+1<\/span><span class="text-git-removed">−1<\/span><\/span>/);
  assert.match(rows[1], /class="flex items-center gap-1 h-control app-list-row pe-md rounded text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus bg-\(image:--file-tree-kept-guides\) group-hover\/file-tree:bg-\(image:--file-tree-guides\) group-focus-within\/file-tree:bg-\(image:--file-tree-guides\) \[&amp;:where\(:root\[dir=rtl\]_:dir\(rtl\)\)\]:bg-\[position:right_var\(--file-tree-guides-x\)_top_0\]! bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-\[pressed\]:bg-fill-ghost-hover"/);
  assert.match(rows[2], /README\.md/);
  // The body follows the list order (Mn tree order: src/app.js before README.md).
  assert.ok(html.indexOf('data-file-path="src/app.js"') < html.indexOf('data-file-path="README.md"'));
  // Separate test, build, and generated files: a separated "Test files" section, closed by default.
  const kind = body(panel({ diff: twoFiles + filePatch('src/app.test.js', 3), diffTree: { diffShowTree: true, diffTreeWidth: 240, diffFileTree: true, diffGroupByKind: true }, onDiffTreeChange: () => {} }));
  assert.match(kind, /<div role="none" class="mt-1 border-t pt-1" data-pane-line=""><button[^>]*data-diff-tree-section="test" role="treeitem" tabindex="-1" aria-level="1" aria-expanded="false"/);
  assert.match(kind, /<span class="truncate min-w-0 flex-1 text-secondary">Test files<\/span><span class="shrink-0 text-footnote tabular-nums text-muted-as-secondary">1<\/span>/);
  assert.doesNotMatch(kind.slice(kind.indexOf('role="tree"'), kind.indexOf('sdiff-changes-main')), /app\.test\.js/);
  // Group files by folder off: flat rows show the folder prefix.
  const flat = body(panel({ diff: twoFiles, diffTree: { diffShowTree: true, diffTreeWidth: 240, diffFileTree: false, diffGroupByKind: false }, onDiffTreeChange: () => {} }));
  assert.doesNotMatch(flat, /aria-expanded="true"[^>]*data-diff-tree/);
  // c784da984 p (c44d00c7f Ct): the name first, then its folder in footnote.
  assert.match(flat, /<span class="flex min-w-0 flex-1"><span dir="ltr" class="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap"><span class="max-w-full shrink-0 truncate">app\.js<\/span><span class="flex min-w-0 text-footnote text-muted-as-secondary data-\[clipped\]:opacity-0"><span dir="ltr" class="relative flex min-w-0 overflow-hidden whitespace-nowrap"><span class="min-w-0 truncate">src<\/span><\/span><\/span><\/span><\/span>/);
});

test('large diff: 5001 changed lines start every file collapsed under the banner; 4999 stay expanded', () => {
  const html = panel({ diff: filePatch('a.txt', 2501) + filePatch('b.txt', 2500) });
  const expanded = toggles(html).map(tag => tag.match(/aria-expanded="(\w+)"/)?.[1]);
  assert.deepEqual(expanded, ['false', 'false']);
  assert.doesNotMatch(html, /class="sdiff-file-body"/);
  assert.match(body(html), new RegExp(`<div class="sdiff-changes-main"><div class="sdiff-large-banner shrink-0 px-md py-1\\.25 text-body text-muted-as-secondary">${BANNER.replace(/\./g, '\\.')}</div><div class="source-changes">`));
  assert.match(html, /data-large-diff="true"/);
  const small = panel({ diff: filePatch('a.txt', 2500) + filePatch('b.txt', 2499) });
  assert.deepEqual(toggles(small).map(tag => tag.match(/aria-expanded="(\w+)"/)?.[1]), ['true', 'true']);
  assert.doesNotMatch(small, /Files are collapsed for large diffs/);
  assert.equal((small.match(/class="sdiff-file-body"/g) || []).length, 2);
});

// B15 (2.31226.0 c44d00c7f Wr/Kr/qr/Zr :808-1057, mount ~7210; Xc/al stale carry-over).
const shownTree = { diffShowTree: true, diffTreeWidth: 240, diffFileTree: true, diffGroupByKind: false };
const sha = (n) => n.toString(16).padStart(40, 'c');
const commitRow = (n, extra = {}) => ({ sha: sha(n), shortSha: sha(n).slice(0, 7), subject: `Commit ${n}`, authorName: 'Ada', date: 0, ...extra });

test('Commits section: under the tree (border-t, max-height 40%), header "Commits {n}", All changes / Uncommitted / commit rows', () => {
  const selected = [];
  const commits = { list: [commitRow(1), commitRow(2, { subject: '' })], total: 2, selectedSha: sha(2), uncommittedSelected: false,
    onSelect: (value) => selected.push(value), onSelectUncommitted: () => {} };
  const html = body(panel({ diff: twoFiles, diffTree: { ...shownTree, diffCommitsCollapsed: false }, onDiffTreeChange: () => {}, diffCommits: commits }));
  const column = html.slice(html.indexOf('sdiff-file-list '), html.indexOf('sdiff-changes-main'));
  assert.ok(column.indexOf('role="tree"') < column.indexOf('sdiff-commits-section'), 'the section follows the tree');
  assert.match(column, /<div class="sdiff-commits-section flex shrink-0 flex-col border-t" data-pane-line="" style="max-height:40%">/);
  assert.match(column, /<div class="shrink-0 px-xs py-1\.25"><div class="rounded hover:bg-fill-ghost-hover"><button type="button" aria-expanded="true" aria-controls="[^"]+" style="padding-left:8px" class="sdiff-commits-trigger flex items-center gap-1 h-control pr-md rounded text-body text-left w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus text-secondary">/);
  assert.match(column, /<span class="min-w-0 flex-1 truncate">Commits<\/span><span class="shrink-0 text-footnote tabular-nums text-muted">2<\/span>/);
  assert.match(column, /class="[^"]*rotate-90"/, 'expanded caret');
  assert.match(column, /<div role="toolbar" aria-orientation="vertical" aria-label="Commits" tabindex="0" class="sdiff-commits-list flex flex-col gap-0\.5 pb-md outline-none hide-focus-ring pt-0\.5">/);
  const rows = [...column.matchAll(/<button[^>]*data-commit-row="([^"]*)"[^>]*>/g)].map((match) => [match[1], /aria-pressed="true"/.test(match[0])]);
  assert.deepEqual(rows, [['', false], ['', false], ['commit', false], ['commit', true]], 'All changes, Uncommitted changes, then commits; the picked commit is pressed');
  assert.match(column, />All changes<\/button>/);
  assert.match(column, />Uncommitted changes<\/button>/);
  assert.match(column, /class="sdiff-commit-row group flex w-full flex-col items-start gap-\[2px\] rounded px-xs py-\[6px\] text-left text-body[^"]*bg-fill-control hover:bg-fill-control text-primary"/);
  assert.match(column, /<span class="w-full truncate" data-cds="OverflowTooltip">\(no message\)<\/span>/);
  assert.match(column, /<span class="flex w-full items-center gap-1 text-footnote text-muted"><span class="text-code">ccccccc<\/span><span aria-hidden="true">·<\/span><span class="truncate">Ada<\/span><\/span>/);
  // Collapsed: header only, caret not rotated.
  const collapsed = body(panel({ diff: twoFiles, diffTree: { ...shownTree, diffCommitsCollapsed: true }, onDiffTreeChange: () => {}, diffCommits: commits }));
  assert.match(collapsed, /aria-expanded="false"/);
  assert.doesNotMatch(collapsed, /role="toolbar"/);
  // No commits, or a hidden column: no section.
  assert.doesNotMatch(body(panel({ diff: twoFiles, diffTree: shownTree, onDiffTreeChange: () => {}, diffCommits: { ...commits, list: [] } })), /sdiff-commits-section/);
  assert.doesNotMatch(body(panel({ diff: twoFiles, diffCommits: commits })), /sdiff-commits-section/);
  // Without uncommitted changes there is no Uncommitted row; a dated commit shows a relative time.
  const plain = body(panel({ diff: twoFiles, diffTree: shownTree, onDiffTreeChange: () => {},
    diffCommits: { ...commits, onSelectUncommitted: undefined, selectedSha: null, list: [commitRow(3, { date: Math.floor(Date.now() / 1000) - 7200 })] } }));
  assert.doesNotMatch(plain, />Uncommitted changes</);
  assert.match(plain, /<button[^>]*data-commit-row=""[^>]*aria-pressed="true"[^>]*>All changes</);
  assert.match(plain, /<time data-cds="RelativeTime" dateTime="[^"]+" class="shrink-0">[^<]+<\/time>/);
});

test('Commits section: 100 rows, a picked older commit appended, "{n} older commits not shown" from the total', () => {
  const list = Array.from({ length: 101 }, (_, index) => commitRow(index + 1));
  const html = body(panel({ diff: twoFiles, diffTree: shownTree, onDiffTreeChange: () => {},
    diffCommits: { list, total: 140, selectedSha: sha(101), onSelect: () => {} } }));
  assert.equal((html.match(/data-commit-row="commit"/g) || []).length, 101, '100 newest plus the selected 101st');
  assert.match(html, /<span class="px-xs py-\[6px\] text-footnote text-muted select-none">39 older commits not shown<\/span>/);
  assert.match(html, /<span class="shrink-0 text-footnote tabular-nums text-muted">140<\/span>/);
});

test('stale comparison: the previous scope stays with aria-busy, data-stale and the delayed 60% dim; no spinner', () => {
  const html = body(panel({ diff: twoFiles, diffScope: 'uncommitted', diffStale: { scope: 'branch' }, diffTree: shownTree, onDiffTreeChange: () => {} }));
  assert.match(html, /<div aria-busy="true" class="min-h-0 flex-1 overflow-y-auto opacity-60 transition-opacity delay-200 duration-100"><div role="tree"/);
  assert.match(html, /<div class="sdiff-changes-main opacity-60 transition-opacity delay-200 duration-100" data-stale="true" aria-busy="true">/);
  assert.doesNotMatch(html, /Loading changes/);
  assert.match(html, /data-file-path="src\/app\.js"/);
  const fresh = body(panel({ diff: twoFiles, diffTree: shownTree, onDiffTreeChange: () => {} }));
  assert.doesNotMatch(fresh, /data-stale|aria-busy|opacity-60/);
});

test('empty comparison with commits: the column keeps the Commits section beside the empty state (c44d00c7f cl Ne, cccc2cf0a Ie)', () => {
  const commits = { list: [commitRow(1)], total: 1, selectedSha: null, uncommittedSelected: true, onSelect: () => {}, onSelectUncommitted: () => {} };
  const html = body(panel({ diff: '', diffScope: 'uncommitted', diffTree: shownTree, onDiffTreeChange: () => {}, diffCommits: commits }));
  const column = html.slice(html.indexOf('sdiff-file-list '), html.indexOf('sdiff-changes-main'));
  assert.match(column, /sdiff-commits-section/);
  assert.doesNotMatch(column, /role="tree"/, 'no file tree without files (Ht)');
  const main = html.slice(html.indexOf('sdiff-changes-main'));
  assert.match(main, /No uncommitted changes/);
  assert.doesNotMatch(main, /data-source-component="FileDiff"/);
  // The uncommitted case stays toggleable (Ie): the header keeps "Hide files".
  assert.match(panel({ diff: '', diffScope: 'uncommitted', diffTree: shownTree, onDiffTreeChange: () => {}, diffCommits: commits }), /Hide files/);
  // Without commits the plain empty state is unchanged.
  assert.doesNotMatch(body(panel({ diff: '', diffScope: 'uncommitted', diffTree: shownTree, onDiffTreeChange: () => {} })), /sdiff-changes-layout/);
});
