import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The Tasks pane workflow card. W14-code r4 ct-feed R4T-08b (E95): a workflow run is the desktop's detailed workflow
// card; prestage-btgap moves it to 4.16336.0 c96d752d0 jU (scripts/extract-workflow-card-v4.mjs), as c9bd7af9c RI draws
// a local_workflow task: `u(ds, {task, variant: "detailed", sessionRef, onStop, stopping, inRunning, depth, tasksFollow})`.
// Outside a panels context jU detailed is kQe's full card; inside the pane frame's panels context (shared-120 Je, which
// c4db265df Tn provides) it is CQe: title / time, the phase list and the last piece "Up next: {phases}" (ct = Poe). The
// host card's member Retry / Skip, Pause / Resume, deliverables, Configure, questions, compatibility notes, agent view and
// large-workflow warning are gone with it. The transcript row's large-workflow warning (WorkflowRow) stays.
const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
let server, W, P;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale?.('en-US');
  W = await server.ssrLoadModule('/src/source-workflow.jsx');
  P = await server.ssrLoadModule('/src/generated/cds-core/shared-120.mjs');
});
after(() => server?.close());

const now = Date.now();
const run = (extra = {}) => ({ id: 'attempt-1', runId: 'r1', status: 'running', name: 'audit', description: 'Audit', startedAt: now - 65000, sequence: 3,
  workflowProgress: [{ type: 'workflow_phase', index: 0, title: 'Scan' }, { type: 'workflow_phase', index: 1, title: 'Fix' },
    { type: 'workflow_agent', index: 1, id: '1', label: 'scan a', state: 'progress', phaseIndex: 0, phaseTitle: 'Scan', startedAt: now - 5000, lastProgressAt: now },
    { type: 'workflow_agent', index: 2, id: '2', label: 'scan b', state: 'error', error: 'bad', phaseIndex: 0, phaseTitle: 'Scan' }], ...extra });
const card = (r, props = {}) => renderToStaticMarkup(React.createElement(W.SourceWorkflowTask, { task: { id: 'workflow:r1', kind: 'workflow', run: r }, sessionId: 's1', onStop: async () => {}, ...props }));

test('the Tasks pane run is c96d752d0 jU detailed: title, Workflow · time · agents, phases with their agents', () => {
  assert.ok(official('c9bd7af9c-').includes('u(ds,{task:r,variant:"detailed",sessionRef:i,onStop:a,stopping:o?.has(r.taskId),inRunning:t.inRunning,depth:t.depth,tasksFollow:t.tasksFollow})'));
  const html = card(run());
  assert.match(html, /^<div data-task-id="workflow:r1" data-workflow-status="running">/);
  assert.match(text(html), /\|audit\|.*Workflow\|1m \d+s\|2\| agents\|Audit\|Phases\|Scan\|0\/2\|/);
  assert.match(text(html), /\|scan a\|.*\|scan b\|Error\|Fix\|/);
  assert.match(html, /<button[^>]*aria-label="[^"]*[Ss]top[^"]*"/, 'Stop while running');
  assert.doesNotMatch(html, /swf-card|swf-phase|Retry agent|Skip agent|Pause this workflow|Configure…|Deliverables|Compatibility differences/);
});

test('inside the pane frame\'s panels context the run is c96d752d0 CQe: pieces, phase rows, "Up next: {phases}", xs StopFilled Stop', () => {
  const c96 = official('c96d752d0-'), c4d = official('c4db265df-');
  for (const piece of ['E=T(pf),D=!!m&&m.phases.length>0;if(E&&u)', 'T=Poe(r)', 'defaultMessage:"Up next: {phases}",id:"AbOFlWPZyk"',
    'f("span",{className:st("flex min-w-0 items-center text-footnote",A?"h-9":"h-11",zH,IH),style:TH(c+1)', 'l=T(pf),u=J1($,0,t)',
    'd=s||l?"xs":"sm",p=s&&!l?"ghost":"secondary"', 'icon:"StopFilled",className:"shrink-0"', 'defaultMessage:"Stop this workflow",id:"fGwwCHW2k+"'])
    assert.ok(c96.includes(piece), piece);
  assert.ok(c4d.includes('t(we,{value:!0,children:t(Yt,{value:null,children:et})})'), 'the pane frame provides the panels context');
  const html = renderToStaticMarkup(React.createElement(P.Je.Provider, { value: true },
    React.createElement(W.SourceWorkflowTask, { task: { id: 'workflow:r1', kind: 'workflow', run: run({ usage: { totalTokens: 12345 } }) }, sessionId: 's1', onStop: async () => {} })));
  assert.match(html, /^<div data-task-id="workflow:r1" data-workflow-status="running"><div role="group" aria-labelledby="[^"]+" aria-describedby="[^"]+" class="@container flex min-w-0 flex-col gap-0\.5"><div class="relative flex min-w-0 flex-col bg-alpha-1 stacks:bg-fill-card rounded-t-\[10px\] " data-task-piece="">/);
  assert.equal(html.match(/data-task-piece=""/g).length, 3, 'title piece, the Scan phase piece, the Up next piece');
  assert.match(text(html), /^\|audit\|1m \d+s\|[\uE000-\uF8FF]\|2\| agents\|12\.3k\| tokens\|1 agent running\|·\|1 failed\|[\uE000-\uF8FF]\|Scan\|1 failed\|·\|0\/2\|1 running\|scan b\|: \|bad\|Up next: Fix\|$/);
  assert.match(html, /<span class="absolute inset-y-0 end-0 flex w-10 items-center justify-end pe-3 bottom-auto h-11"><button type="button" data-cds="Button" data-cds-icon-only="" data-size="xs" class="[^"]* shrink-0" aria-label="Stop this workflow"/);
  assert.match(html, /<li class="relative flex min-w-0 flex-col bg-alpha-1 stacks:bg-fill-card  " data-task-piece=""><div data-closed="" data-cds="Collapsible" class="flex flex-col"><div class="group\/row relative flex h-9 min-w-0 items-center px-1\.5" style="--task-step:0"><button type="button" class="flex h-9 [^"]*" tabindex="0" aria-disabled="false" aria-expanded="false"><span class="flex min-w-0 flex-1 items-center gap-1 text-start"><span class="flex h-\[1lh\] w-4 shrink-0 items-center justify-center text-muted"><span data-cds="Icon" data-cds-mirror=""/, 'the phase row and its collapse arrow');
  assert.match(html, /<div class="relative flex min-w-0 flex-col bg-alpha-1 stacks:bg-fill-card  rounded-b-\[10px\]" data-task-piece=""><span class="flex min-w-0 items-center text-footnote h-11 text-muted ps-\[calc\(var\(--task-step,0\)\*1\.25rem\+0\.75rem\)\] pe-md" style="--task-step:1"><span data-cds="OverflowTooltip" [^>]*>Up next: Fix<\/span><\/span><\/div><\/div><\/div>$/);
});

// U-BT-KEEP (user customisation 2026-11-11, not official): in the panel card the description line reads agents + tokens,
// the same chunk's official counts / tokens cell (the non-panels card's, running branch), applied by the generator
// (scripts/extract-workflow-card-v4.mjs REWRITES, recorded in manifest.json rewrites).
test('U-BT-KEEP: the panel card\'s description line is the official agents + tokens cell, not task.description', () => {
  const c96 = official('c96d752d0-');
  for (const piece of ['h("span",{className:"flex flex-wrap items-baseline gap-x-sm gap-y-0.75",children:[m&&m.counts.total>0?f(cU,{counts:m.counts,muted:!u}):null,t.usage?f("span",{children:f(Q,{defaultMessage:"<v>{n}</v> tokens",id:"q8yC2bH6mD",values:{n:hu(t.usage.totalTokens),v:u?EQe:OU}})}):null]})',
    'defaultMessage:"{n, plural, one {<v>#</v> agent} other {<v>#</v> agents}}",id:"59iDR2YzIC"',
    'ee=J2($,69,O,s)||J1($,71,t.description)?I1($,71,Z2($,69,O?f("div",{className:s?FH:void 0,children:f(SQe,{text:t.description})}):null,O,s),t.description):$[72]',
    'let e=st("flex min-h-5 min-w-0 items-center",RH)'])
    assert.equal(c96.split(piece).length - 1, 1, piece);
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/workflow-card-v4/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.rewrites.map((r) => [r.binding, /^User customisation U-BT-KEEP .*not official/.test(r.why)]), [['c96d752d0-D9VB6ArX.js#CQe', true]]);
  const panel = (r) => renderToStaticMarkup(React.createElement(P.Je.Provider, { value: true },
    React.createElement(W.SourceWorkflowTask, { task: { id: 'workflow:r1', kind: 'workflow', run: r }, sessionId: 's1', onStop: async () => {} })));
  const line = (inner) => new RegExp('<div class="pe-8"><div class="flex min-h-5 min-w-0 items-center text-footnote text-muted-as-secondary"><span class="flex flex-wrap items-baseline gap-x-sm gap-y-0\\.75">' + inner + '</span></div></div>');
  const both = panel(run({ usage: { totalTokens: 12345 } }));
  assert.match(both, line('<span class="whitespace-nowrap"><span class="text-secondary">2</span> agents</span><span><span class="text-secondary">12\\.3k</span> tokens</span>'));
  assert.doesNotMatch(text(both), /\|Audit\|/, 'task.description is not drawn');
  assert.match(panel(run()), line('<span class="whitespace-nowrap"><span class="text-secondary">2</span> agents</span>'), 'no usage: agents only');
  const tokensOnly = panel(run({ usage: { totalTokens: 900 }, workflowProgress: [{ type: 'workflow_phase', index: 0, title: 'Scan' }] }));
  assert.match(tokensOnly, line('<span><span class="text-secondary">900</span> tokens</span>'), 'no agents yet: tokens only');
});

test('a failed run says why it ended; no Stop once it settled', () => {
  const html = card(run({ status: 'failed', summary: 'Workflow "audit" failed: boom', completedAt: now }));
  assert.match(text(html), /\|audit\|Workflow\|Failed\|2 agents\|Audit\|Error\|Boom\|/);
  assert.doesNotMatch(html, /aria-label="[^"]*[Ss]top[^"]*"/);
});

test('the transcript row keeps its large-workflow warning (largeWorkflow)', () => {
  const local = run({ workflowProgress: [{ type: 'workflow_agent', id: 'a', state: 'progress' }, { type: 'workflow_agent', id: 'b', state: 'progress' }, { type: 'workflow_agent', id: 'c', state: 'progress' }] });
  assert.equal(W.largeWorkflow(local, { agents: 25, tokens: 1_500_000 }), false);
  const queued = { ...local, usage: { totalTokens: 600_000 }, workflowProgress: [{ type: 'workflow_agent', id: 'a', state: 'progress' }, { type: 'workflow_agent', id: 'b', state: 'start' }, { type: 'workflow_agent', id: 'c', state: 'start' }] };
  assert.equal(W.largeWorkflow(queued, { agents: 25, tokens: 1_500_000 }), true, 'projected: 600k per started agent × 3 scheduled');
  assert.equal(W.largeWorkflow({ ...local, usage: { totalTokens: 1_600_000 } }, { agents: 25, tokens: 1_500_000 }), true, 'actual tokens');
  assert.equal(W.largeWorkflow(local, { agents: 2, tokens: 1_500_000, suppressed: true }), false, 'never in ultracode');
  assert.equal(W.largeWorkflow({ ...local, status: 'completed' }, { agents: 2, tokens: 1 }), false);
  assert.match(renderToStaticMarkup(React.createElement(W.WorkflowRow, { run: local, warningLimits: { agents: 2, tokens: 1_500_000, suppressed: false }, onOpen() {} })), /data-large-workflow=""/);
  for (const gone of ['WorkflowCard', 'WorkflowSettingsDialog', 'WorkflowSaveDialog']) assert.equal(gone in W, false, gone);
});
