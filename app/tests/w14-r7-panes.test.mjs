import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';

// W14-code round 7, lane panes: the approval card's detail values and the workflow script fold (r7pa-01 / r7pa-02,
// cc32965c2 N_ / $_ / D_), the background tasks pane in cccc2cf0a's own classes (r7pa-07: pN / EN / QM / AM) and the
// one-shot prompt's relative time (r7pa-06: tN), the CDS Button on the deliverables / artifacts cards and the Codex
// feedback dialog (R7DC-02 = css7-deliverables-settings-button), and the chapter entry's CDS Tooltip and ContextMenu
// (css7-toc-entry-tooltip-menu: cf74bc599 FC). Official chunks are read as text only.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const h = React.createElement;
const N_ = 'bg-alpha-1 rounded-[5px] py-md px-lg text-code text-secondary whitespace-pre-wrap break-words select-text [unicode-bidi:plaintext]';

let server, S, B, Dl, C, Frame, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-session.jsx');
  B = await server.ssrLoadModule('/src/source-background-tasks.jsx');
  Dl = await server.ssrLoadModule('/src/source-deliverables.jsx');
  C = await server.ssrLoadModule('/src/source-chapters.jsx');
  Frame = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => server?.close());

let instance = 0;
function approval(params, item = { id: 'cmd', type: 'commandExecution', status: 'inProgress' }) {
  const request = { id: 70 + instance, method: 'item/commandExecution/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: `r7-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', itemId: item.id, ...params } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return renderToStaticMarkup(h(S.SourceApproval, { runtime, request, item, sessionKey: 'r7', cwd: '/w', respond: async () => ({}), getVisibleThreadId: () => 'T' }));
}

test('r7pa-01: a non-file detail falls back to N_ + Y (div[data-approval-value]), not the host pre.sac-code', () => {
  const cc = official('cc32965c2-BQu1bA_w');
  assert.ok(cc.includes('N_="bg-alpha-1 rounded-[5px] py-md px-lg text-code text-secondary whitespace-pre-wrap break-words select-text [unicode-bidi:plaintext]"'));
  const card = local('src/source-approval-card.jsx'), session = local('src/source-session.jsx');
  assert.match(card, /const hostDetails = model\.detail && !gatedRows && renderDetails \? renderDetails\(model\.detail, model\) : undefined;/);
  assert.match(session, /\/\/ W14-code r7 r7pa-01: any other detail \(a command, arguments, a URL…\) is the card's own N_ \+ Y block\.\n {10}: undefined\} \/>;/);
  assert.doesNotMatch(session, /sac-code|sac-path|sac-script|sac-context/);
  assert.doesNotMatch(local('src/source-approval-card.css').replace(/\/\*[^]*?\*\//g, ''), /\.sac-(code|path|script|context)\b/);
  // A site request's URL detail (an arguments detail, not read-gated) renders as the value block, Y showing a bidi
  // control as \u202e (shared-9 LO).
  const html = approval({ codeDesktop: { agentTool: { kind: 'web-fetch', url: 'https://example.com/a', prompt: 'Read \u202eit' } } });
  assert.match(html, /<div class="flow-root"><div data-approval-value="" class="bg-alpha-1 rounded-\[5px\] py-md px-lg text-code text-secondary whitespace-pre-wrap break-words select-text \[unicode-bidi:plaintext\]"[^>]*>Read \\u202eit<\/div><\/div>/);
  assert.doesNotMatch(html, /sac-code|<pre/);
});

test('r7pa-02: the workflow script is a_\'s fold ($_: CDS Collapsible, "script · N lines", D_ numbered lines)', () => {
  const cc = official('cc32965c2-BQu1bA_w');
  for (const piece of ['foldLines:{defaultMessage:"{label} \\u00B7 {lines, plural, one {# line} other {# lines}}",id:"ei+6nE6ZLb"}',
    'script:{defaultMessage:"script",id:"HHGY4M5mrS"}', '"data-testid":"approval-folds",className:"flex flex-col gap-1"',
    'className:"text-footnote text-muted-control"', 'className:"mt-1 overflow-hidden rounded-[5px] bg-alpha-1"'])
    assert.ok(cc.includes(piece), piece);
  const html = approval({ codeDesktop: { agentTool: { kind: 'workflow', name: 'review', description: 'Review it', phases: [{ title: 'Scan' }],
    script: 'export const meta = {};\nawait agent("go")\n' } } });
  assert.match(html, new RegExp(`<div data-approval-value="" class="${N_.replace(/[[\]()]/g, '\\$&')}">1\\. Scan</div><div data-testid="approval-folds" class="flex flex-col gap-1">`));
  assert.match(html, /data-testid="approval-folds"[^]*?<span class="text-footnote text-muted-control">script · 2 lines<\/span>/);
  assert.doesNotMatch(html, /View raw script|Hide raw script|sac-feedback-toggle|sac-script/);
  // Without phases the fold is open (defaultOpen): D_'s numbered lines are in the panel.
  const bare = approval({ codeDesktop: { agentTool: { kind: 'workflow', name: 'one-off', description: 'Do it', script: 'a()\nb()', scriptTruncated: true } } });
  assert.match(bare, /<div class="mt-1 overflow-hidden rounded-\[5px\] bg-alpha-1"><pre dir="ltr" class="py-md pe-lg text-code text-secondary whitespace-break-spaces break-words select-text \[unicode-bidi:bidi-override\]"><span data-line="1" class="relative block ps-\[6ch\][^"]*">a\(\)\n<\/span><span data-line="2"[^>]*>b\(\)<\/span><\/pre><\/div>/);
  assert.match(bare, /<p class="text-footnote text-muted-as-secondary select-text break-words \[unicode-bidi:plaintext\]">The script is too long to be shown in full\.<\/p>/);
  i18n.setLocale('zh-CN');
  try { assert.match(approval({ codeDesktop: { agentTool: { kind: 'workflow', name: 'x', script: 'a\nb\nc' } } }), /脚本 · 3 行/); }
  finally { i18n.setLocale('en-US'); }
});

test('r7pa-07: the tasks pane wears pN / EN / QM / AM\'s class strings; the .sbt-* sheet is empty', () => {
  const ccc = official('cccc2cf0a-DhZC33Gc');
  for (const piece of ['Se="h-full overflow-y-auto scroll-py-2.5 [scrollbar-gutter:stable_both-edges] outline-none"', 'Ce="flex flex-col gap-[16px] px-2.5 py-2.5 min-w-[220px]"',
    'className:"flex-1 min-w-0 flex text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus after:content-[\'\'] after:absolute after:inset-0"',
    'DM="rounded-lg text-code max-h-[200px] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus"', 'OM=`${DM} bg-alpha-2 px-md py-1.25 text-primary`',
    'className:"flex items-center gap-1 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-[3px] hover:text-secondary"',
    'h("section",{className:"flex flex-col gap-sm",children:[Y,te]})', 'u("h3",{className:"text-footnote text-muted-as-secondary",children:q})'])
    assert.ok(ccc.includes(piece), piece);
  const source = local('src/source-background-tasks.jsx');
  assert.ok(source.includes('className="h-full overflow-y-auto scroll-py-2.5 [scrollbar-gutter:stable_both-edges] outline-none"'));
  assert.ok(source.includes('<div className="flex flex-col gap-[16px] px-2.5 py-2.5 min-w-[220px]">'));
  assert.doesNotMatch(source.replace(/\/\/.*$/gm, ''), /sbt-/);
  assert.equal(local('src/source-background-tasks.css').replace(/\/\*[^]*?\*\//g, '').trim(), '', 'no host rule left');
  const html = renderToStaticMarkup(h(B.TaskCard, { task: { id: 'bash:1', kind: 'bash', status: 'running', description: 'npm test', startedAt: Date.now(), command: 'npm test', output: 'ok' },
    sessionId: 's', expanded: true, stopping: false, onStop() {}, onOpen() {}, onToggle() {} }));
  assert.match(html, /^<div class="contents" data-task-id="bash:1" data-status="running"><div class="group flex flex-col rounded-lg bg-alpha-1 \[&amp;:hover:not\(:has\(\.epitaxy-task-row-secondary:hover\)\)\]:bg-alpha-2 focus-within:bg-alpha-2"><div class="relative flex flex-col gap-1\.25 p-md"><div class="flex items-start gap-sm"><button type="button" data-task-opener="" aria-expanded="true" aria-label="Background task: npm test" class="flex-1 min-w-0 flex text-start [^"]*after:inset-0"><span class="flex-1 min-w-0 flex items-start gap-0\.75 text-body text-primary"><span data-cds="ShimmerText" data-shimmering="true" class="[^"]* min-w-0 break-words">npm test<\/span><span class="flex h-\[1lh\] shrink-0 items-center"><span data-cds="Icon"[^>]*--cds-icon-rotate:90deg" class="text-muted-as-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-transform duration-fast motion-reduce:transition-none"/);
  assert.match(html, /<span class="flex flex-col gap-1\.25 pb-0\.75 text-footnote text-muted-as-secondary \[overflow-wrap:anywhere\]"><span class="flex flex-wrap items-baseline gap-x-sm gap-y-0\.75"><span class="text-secondary">Bash<\/span><span class="tabular-nums">/);
  assert.match(html, /<div class="flex flex-col gap-1\.25 select-text px-md pb-\[16px\]"><div role="region" tabindex="0" aria-label="Command for npm test" class="rounded-lg text-code max-h-\[200px\] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus p-px">/);
  assert.match(html, /<pre role="region" tabindex="0" aria-label="Output for npm test" class="rounded-lg text-code max-h-\[200px\] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus bg-alpha-2 px-md py-1\.25 text-primary whitespace-pre-wrap break-all">ok<\/pre>/);
  // A finished agent row: no expand button, MM's bare values, the View transcript link in mp's class (c86240138 n).
  const agent = renderToStaticMarkup(h(B.TaskCard, { task: { id: 'agent:a', kind: 'agent', threadId: 'a', status: 'failed', description: 'Probe', model: 'm1', durationMs: 2000 },
    sessionId: 's', expanded: false, stopping: false, onStop() {}, onOpen() {}, onToggle() {} }));
  assert.match(agent, /<div class="group flex flex-col rounded-lg bg-alpha-1 "><div class="relative flex flex-col gap-1\.25 p-md"><div class="flex items-start gap-sm"><div class="flex-1 min-w-0 flex"><span class="flex-1 min-w-0 flex items-start gap-0\.75 text-body text-muted-as-secondary">/);
  assert.match(agent, /<span>Agent<\/span><span class="text-danger">Failed<\/span>/);
  assert.match(agent, /<span>m1<\/span><button type="button" data-task-opener="" aria-label="View transcript for Probe" class="text-accent hover:underline underline-offset-\[1px\] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-\[3px\]">View transcript<\/button>/);
  // AM's empty branches: the summary in text-secondary, else the no-output footnote.
  assert.match(renderToStaticMarkup(h(B.SourceTaskOutput, { task: { id: 'b', description: 'x', summary: 'All good', status: 'completed' }, sessionId: 's' })),
    /<div class="text-footnote text-secondary whitespace-pre-wrap break-words">All good<\/div>/);
  assert.match(renderToStaticMarkup(h(B.SourceTaskOutput, { task: { id: 'b', description: 'x', status: 'completed' }, sessionId: 's' })),
    /<div class="text-footnote text-muted-as-secondary">No output captured\.<\/div>/);
});

test('r7pa-06: tN — a one-shot prompt with no phrase shows wr(nextRunAt, "future"); a bare cron is dir=ltr under RTL', () => {
  const ccc = official('cccc2cf0a-DhZC33Gc');
  assert.ok(ccc.includes('l=s&&(t.humanSchedule===void 0||t.humanSchedule===t.cron)?t.nextRunAt:void 0'));
  assert.ok(ccc.includes('l===void 0?t.humanSchedule??t.cron:wr(new Date(l),p,i,"future")'));
  assert.ok(ccc.includes('dir:a&&l===void 0&&t.humanSchedule===void 0?"ltr":void 0'));
  const at = new Date(); at.setHours(at.getHours() < 22 ? at.getHours() + 1 : at.getHours(), 5, 0, 0);
  const once = { id: 'o', prompt: 'Ping', recurring: false, cron: '5 15 3 11 *', humanSchedule: '5 15 3 11 *', nextFireAt: at.getTime() };
  assert.equal(B.loopScheduleAt(once), at.getTime());
  assert.equal(B.loopScheduleAt({ ...once, humanSchedule: 'at 3:05 PM' }), undefined, 'a phrased schedule stays as it is');
  assert.equal(B.loopScheduleAt({ ...once, recurring: true }), undefined, 'a loop shows its cadence');
  const html = renderToStaticMarkup(h(B.LoopCard, { loop: once, stopping: false, onStop() {} }));
  assert.match(html, /<span class="text-secondary">Once<\/span><span role="status" class="sr-only"><\/span><span>today at \d{1,2}:05\s?[AP]M<\/span>/);
  assert.doesNotMatch(html, /5 15 3 11 \*/);
  const previous = globalThis.document;
  globalThis.document = { documentElement: { dir: 'rtl' } };
  try {
    const loop = { id: 'l', prompt: 'Check', recurring: true, cron: '*/7 * * * *', humanSchedule: null, nextFireAt: Date.now() + 60000, expiresAt: Date.now() + 864e5 };
    assert.match(renderToStaticMarkup(h(B.LoopCard, { loop, stopping: false, onStop() {} })), /<span dir="ltr">\*\/7 \* \* \* \*<\/span>/);
    assert.match(renderToStaticMarkup(h(B.LoopCard, { loop: { ...loop, humanSchedule: 'every 7 minutes' }, stopping: false, onStop() {} })), /<span>every 7 minutes<\/span>/);
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});

test('R7DC-02 / css7-deliverables-settings-button: the deliverables, artifacts and Codex feedback buttons are the CDS Button', () => {
  const frame = official('shared-frame-6jtSkIit');
  assert.ok(frame.includes('Xs as Uu') && frame.includes('Uu as Eu'), 'shared-frame Uu (official Eu) is the CDS Button');
  for (const file of ['src/source-deliverables.jsx', 'src/source-codex-feedback.jsx']) {
    const source = local(file);
    assert.match(source, /import \{ CdsButton \} from "\.\/generated\/view-tabs\/shared-frame-6jtSkIit\.js";/, file);
    assert.doesNotMatch(source, /SourceSettingsButton|source-settings-button|iconSize/, file);
  }
  assert.equal(local('src/source-codex-feedback.jsx').split('<CdsButton').length - 1, 6);
  // The feedback dialog's Done / Cancel keep data-autofocus and Send feedback its busy state through the CDS Button.
  const sent = renderToStaticMarkup(h(Frame.CdsButton, { 'data-autofocus': true, variant: 'primary', busy: true }, 'Send feedback'));
  assert.match(sent, /^<button type="button" data-cds="Button"[^>]*data-autofocus="true"/);
  assert.match(sent, /aria-busy="true"/);
  const item = { id: 'd1', type: 'deliverables', deliverables: [{ path: '/w/report.md', description: 'The report' }] };
  const html = renderToStaticMarkup(h(Dl.SourceDeliverables, { item: { ...item, presented: item.deliverables }, sessionKey: 's' }));
  const artifacts = renderToStaticMarkup(h(Dl.SourceArtifacts, { artifacts: [{ path: '/w/a.ts' }, { url: 'https://example.com/pr/1', title: 'PR' }], sessionKey: 's' }));
  for (const markup of [html, artifacts]) assert.doesNotMatch(markup, /source-settings-button/);
  assert.equal(artifacts.split('data-cds="Button"').length - 1, 3, 'Open, Show in Finder, Open link');
  assert.match(artifacts, /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost="" data-size="sm"[^>]*aria-label="Show a\.ts in Finder"/);
});

test('css7-toc-entry-tooltip-menu: FC wraps the row in the CDS Tooltip and a Claude chapter\'s menu is the CDS ContextMenu', () => {
  const cf = official('cf74bc599-CRYqipWN');
  for (const piece of ['t.summary&&s("span",{id:b,hidden:!0,children:t.summary})', '"aria-describedby":A', 'content:a&&t.summary?t.title:void 0,detail:t.summary',
    's(te.Item,{variant:"danger",onClick:G,children:ee})', 's(te.Trigger,{render:L})'])
    assert.ok(cf.includes(piece), piece);
  const source = local('src/source-chapters.jsx');
  assert.doesNotMatch(source, /SourceMenu|title=\{chapter\.summary\}/);
  assert.match(source, /<CdsTooltip lazy hoverable=\{false\} side="inline-end"\n\s+content=\{isListExpanded && chapter\.summary \? chapter\.title : undefined\} detail=\{chapter\.summary\}>/);
  assert.match(source, /<CdsContextMenu\.Root onOpenChange=[^]*?<CdsContextMenu\.Trigger render=\{row\} \/>[^]*?<CdsContextMenu\.Item onClick=\{\(\) => onStartRename\(chapter\.id\)\}>\{t\("Rename"\)\}<\/CdsContextMenu\.Item>\s*<CdsContextMenu\.Separator \/>\s*<CdsContextMenu\.Item variant="danger"/);
  const start = { id: 'session-start', title: 'Session start', source: 'session', entryId: 'u', entryIndex: 0 };
  const html = renderToStaticMarkup(h(C.SourceChapterToc, { sessionId: 's1', chapters: [start, { id: 'ch1', title: 'Build', summary: 'Write it', source: 'claude', entryId: 'ch1', entryIndex: 2 }],
    viewportRef: { current: null }, scrollKey: 'k' }));
  assert.match(html, /<button type="button" aria-describedby="([^"]+)"[^>]*>[^]*?<span id="\1" hidden="">Write it<\/span><\/button>/);
  assert.match(html, /-webkit-touch-callout:none/, 'the Claude chapter row is the context menu trigger');
});
