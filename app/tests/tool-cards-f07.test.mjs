import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';
import { PREVIEW_TOO_LARGE } from '../src/approval-card-model.mjs';

// Fidelity F07 (tool cards, approvals and permission modes), Node-only SSR of the rendered
// markup the offscreen suites also check: the EM file request (approval-current.js:15528-15607),
// YO pure-side gutter (:7189-7210), qO search inputs (:7099-7150), KO MCP standalone gate
// (:6943-6944), Qoe Asked rows (:7349-7395), oO/Ie agent rows (:4271-4296, :16921-16934), the
// li checkbox marks of a multiSelect question (:7815-7849) and the nE/aE Mode list.
let server, SourceMessage, SourceApproval, SourceQuestionCard, Permission;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceMessage, SourceApproval } = await server.ssrLoadModule('/src/source-session.jsx'));
  ({ SourceQuestionCard } = await server.ssrLoadModule('/src/source-question-card.jsx'));
  Permission = await server.ssrLoadModule('/src/source-permission-menu.jsx');
});
after(async () => { await server?.close(); });

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const message = (item, extra = {}) => render(SourceMessage, { item, sessionKey: 'f07', cwd: '/w', transcriptView: 'verbose', ...extra });
const count = (html, needle) => html.split(needle).length - 1;
const created = { path: '/w/created.ts', kind: { type: 'add' }, diff: '--- /dev/null\n+++ b/created.ts\n@@ -0,0 +1,2 @@\n+export const a = 1;\n+export const b = 2;\n' };
const edited = { path: '/w/fixture.txt', kind: { type: 'update', move_path: null }, diff: '--- a/fixture.txt\n+++ b/fixture.txt\n@@ -1 +1 @@\n-OLD\n+NEW\n' };

let instance = 0;
function approval(changes, extra = {}) {
  const request = { id: 8, method: 'item/fileChange/requestApproval', bridgeApproval: { connectionId: 'c', instanceId: `f07-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', itemId: 'fc', ...extra } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return render(SourceApproval, { runtime, request, item: { id: 'fc', type: 'fileChange', status: 'inProgress', changes },
    sessionKey: 'f07', cwd: '/w', respond: async () => ({}), getVisibleThreadId: () => 'T' });
}

test('file request: full-path box, then the in-card diff body per change; no local FileChanges header', () => {
  const html = approval([created]);
  assert.match(html, /class="sac-details"><div class="sac-code sac-path">\/w\/created\.ts<\/div><div class="sft-outer" data-in-card=""><header class="sft-header"/);
  assert.equal(count(html, 'class="sft-outer" data-in-card=""'), 1);
  assert.doesNotMatch(html, /source-file-change|data-placement="changes"/);
  // YO pure side: '+ 1' in the gutter, no separate sign column.
  assert.match(html, /<span class="sft-number" aria-hidden="true"><span class="sft-number-sign">\+<\/span> 1<\/span>/);
  assert.equal(count(html, 'class="sft-sign"'), 0);
  // NM: the sr-only live region is mounted (filled 50 ms after mount, so empty in SSR).
  assert.equal(count(html, 'role="status" data-approval-announcement=""'), 1);
  // Two changes list both paths and render two bodies; the paired edit keeps its sign column.
  const many = approval([created, edited]);
  assert.match(many, /<div class="sac-code sac-path">\/w\/created\.ts\n\/w\/fixture\.txt<\/div>/);
  assert.equal(count(many, 'class="sft-outer" data-in-card=""'), 2);
  assert.equal(count(many, 'class="sft-sign"'), 2);
});

test('file request over 200,000 characters shows the fM sentence and no preview', () => {
  const html = approval([{ path: '/w/big.txt', kind: { type: 'add' }, diff: `+${'x'.repeat(200001)}\n` }]);
  assert.ok(html.includes(`<p class="sac-context" data-context="too-large">${PREVIEW_TOO_LARGE}</p>`));
  assert.match(html, /<div class="sac-code sac-path">\/w\/big\.txt<\/div><\/div>/);
  assert.equal(count(html, 'sft-outer'), 0);
});

test('search rows list the call inputs (pattern:, glob:, path:), never a synthesized command: fact', () => {
  const search = action => ({ id: 's', type: 'commandExecution', status: 'completed', command: 'Grep TODO', cwd: '/w', commandActions: [action], aggregatedOutput: 'a.ts:1:TODO\n' });
  const forwarded = message(search({ type: 'search', command: 'Grep TODO', query: 'TODO', path: null, arguments: { pattern: 'TODO', glob: '*.ts', output_mode: 'content' } }));
  assert.deepEqual([...forwarded.matchAll(/<span class="sft-key">([^<]+)<\/span>/g)].map(match => match[1]), ['pattern:', 'glob:', 'output_mode:']);
  assert.match(forwarded, /<span class="sft-key">pattern:<\/span> <span class="sft-command">TODO<\/span>/);
  assert.match(forwarded, /<span class="sft-key">output_mode:<\/span> <span>content<\/span>/);
  assert.doesNotMatch(forwarded, /command:/);
  const codex = message(search({ type: 'search', command: 'rg TODO src', query: 'TODO', path: '/w/src' }));
  assert.deepEqual([...codex.matchAll(/<span class="sft-key">([^<]+)<\/span>/g)].map(match => match[1]), ['pattern:', 'path:']);
  const list = message(search({ type: 'listFiles', command: 'ls src', path: '/w/src' }));
  assert.deepEqual([...list.matchAll(/<span class="sft-key">([^<]+)<\/span>/g)].map(match => match[1]), ['path:']);
});

test('an MCP body is the standalone card only outside a tool-group row', () => {
  const mcp = { id: 'm', type: 'mcpToolCall', server: 'fx', tool: 'one', status: 'completed', arguments: { query: 'q' },
    result: { content: [{ type: 'text', text: 'MCP_RESULT' }], structuredContent: null }, error: null, durationMs: 5 };
  assert.match(message(mcp), /<div class="sgt-body" data-standalone="true">/);
  const grouped = message(mcp, { inToolGroup: true });
  assert.match(grouped, /<div class="sgt-body"><div class="sgt-body-inner">/);
  assert.doesNotMatch(grouped, /data-standalone/);
});

// R06 wue/vZ (approval-current.js:45232-45240, :35628-35651): an answered question is the receipt card;
// an Asked row (Qoe :7349-7395) remains only when nothing was answered.
const questions = [{ id: 'lang', header: 'Language', question: 'Which language?', options: [{ label: 'Go' }] }, { id: 'name', question: 'Package name?' }];
const asked = (status, answers) => ({ id: 'ask', type: 'dynamicToolCall', namespace: null, tool: 'ask_user_question', status, success: status === 'completed' ? true : null, arguments: { questions },
  contentItems: answers === undefined ? null : [{ type: 'inputText', text: JSON.stringify({ answers }) }] });
test('an answered question renders the vZ receipt: question / answer pairs, no row trigger', () => {
  const html = message(asked('completed', [{ id: 'lang', selected: ['Go'], custom: 'mostly' }, { id: 'name', selected: [] }]));
  assert.equal(html, '<div class="source-message sqr" data-transcript-item-id="ask" data-cds="QuestionReceipt"><div class="sqr-pair"><div class="sqr-question">Which language?</div><div class="sqr-answer">Go, mostly</div></div>'
    + '<div class="sqr-pair"><div class="sqr-question">Package name?</div><div class="sqr-answer">Skipped</div></div></div>');
  assert.doesNotMatch(html, /source-step-trigger|sgt-input-key|questions:/);
  // A history receipt never plays the live enter fade.
  assert.doesNotMatch(html, /data-enter/);
});
test('an all-skipped question keeps the Asked row with the Skipped outcome; busy and stopped rows have no receipt', () => {
  const skipped = message(asked('completed', [{ id: 'lang', selected: [] }, { id: 'name', selected: [] }]));
  assert.doesNotMatch(skipped, /class="source-message sqr"/);
  assert.match(skipped, /<span class="source-step-label ">Asked<\/span><span class="source-step-meta" title="Language">Language<\/span><span class="source-step-outcome">Skipped<\/span>/);
  assert.match(skipped, /<div class="sgt-body sgt-qa"><div class="sgt-qa-entry"><div class="sgt-qa-question">Which language\?<\/div><div class="sgt-qa-answer">Skipped<\/div><\/div>/);
  const busy = message(asked('inProgress'));
  assert.doesNotMatch(busy, /class="source-message sqr"/);
  assert.match(busy, /source-step-label source-shimmer">Asking</);
  // The live answer of a question seen pending fades in once.
  assert.match(message(asked('completed', [{ id: 'lang', selected: ['Go'] }])), /data-cds="QuestionReceipt" data-enter="true"/);
  assert.doesNotMatch(message(asked('completed', [{ id: 'lang', selected: ['Go'] }])), /data-enter/, 'only the first mount');
  const stopped = message(asked('interrupted', []));
  assert.doesNotMatch(stopped, /class="source-message sqr"/);
  assert.match(stopped, /<div class="sgt-qa-answer">Not answered<\/div>/);
  assert.equal(message({ ...asked('completed', [{ id: 'lang', selected: ['Go'] }]), status: 'failed' }).includes('class="source-message sqr"'), false);
});

test('an agent row without a live child reads the tensed description; awaiting approval keeps the verb + description', () => {
  const spawn = { id: 'sp', type: 'collabAgentToolCall', tool: 'spawnAgent', senderThreadId: 'P', receiverThreadIds: [], prompt: 'Read src/parse.js', description: 'Audit the parser', status: 'inProgress', agentsStates: {} };
  const running = message(spawn);
  assert.ok(running.includes('>Auditing the parser<'));
  assert.doesNotMatch(running, /Running agent|Ran agent/);
  const done = message({ ...spawn, status: 'completed' });
  assert.ok(done.includes('>Audited the parser<'));
  const awaiting = message(spawn, { pendingApprovalItemIds: new Set(['sp']) });
  assert.ok(awaiting.includes('>Ran agent<') && awaiting.includes('>Audit the parser<'));
  assert.doesNotMatch(awaiting, /Auditing the parser/);
});

test('a multiSelect question draws checkbox marks with nothing preselected; a toggle checks one', () => {
  const request = { id: 3, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'q', instanceId: 'f07-multi' },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'kinds', header: 'Kinds', question: 'Choose test kinds', isOther: true, isSecret: false, multiSelect: true,
      options: [{ label: 'Unit' }, { label: 'UI' }, { label: 'Live' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  const card = () => render(SourceQuestionCard, { runtime, request, respond: async () => ({}), getVisibleThreadId: () => 'T' });
  // W12, c9ed5627b ut / dt Zn: a multiSelect row (and Other) trails a CdsCheckboxIndicator in `span[data-size=sm].flex.shrink-0`
  // and carries aria-pressed; a single-select row trails the digit keycap and has no aria-pressed.
  const CHECKBOX = '<span data-size="sm" class="flex shrink-0">';
  const initial = card();
  assert.equal(count(initial, CHECKBOX), 4, 'three options + Other');
  assert.equal(count(initial, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 0);
  assert.equal(count(initial, 'aria-pressed="false"'), 4);
  assert.equal(count(initial, 'aria-pressed="true"'), 0);
  const ticket = runtime.ticketFor(request);
  runtime.selectOption(ticket, 'kinds', 'UI');
  runtime.selectOption(ticket, 'kinds', 'Live');
  const toggled = card();
  assert.deepEqual([...toggled.matchAll(/<button type="button" aria-pressed="(true|false)" class="flex items-center gap-sm rounded-\[5px\]/g)].map(match => match[1]), ['false', 'true', 'true']);
  // A single-select question keeps the options[0] preselection and draws keycaps, not checkboxes.
  const single = structuredClone(request);
  single.bridgeApproval.instanceId = 'f07-single';
  delete single.params.questions[0].multiSelect;
  const other = createApprovalDraftRuntime();
  other.reconcile([single]);
  const radios = render(SourceQuestionCard, { runtime: other, request: single, respond: async () => ({}), getVisibleThreadId: () => 'T' });
  assert.equal(count(radios, CHECKBOX), 0);
  assert.equal(count(radios, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 4);
  assert.match(radios, /var\(--cds-fill-secondary-ring\)\]"><div class="flex flex-col gap-0\.5 min-w-0 flex-1 select-text"><div [^>]*>Unit</);
});

test('the Mode list follows nE/aE: Auto, Manual, Accept edits, Plan, Bypass permissions; the trigger shows the full label', () => {
  assert.deepEqual(Permission.PERMISSION_OPTIONS.map(option => [option.value, option.label, option.description]), [
    ['auto', 'Auto', 'DeepSeek handles permission decisions'],
    ['ask', 'Manual', 'Always ask before making changes'],
    ['acceptEdits', 'Accept edits', 'Automatically accept all file edits'],
    ['plan', 'Plan', 'Create a plan before making changes'],
    ['bypass', 'Bypass permissions', 'Accepts all permissions'],
  ]);
  assert.ok(Permission.PERMISSION_OPTIONS.every(option => !('warning' in option) && !('icon' in option)));
  assert.deepEqual(['auto', 'ask', 'acceptEdits', 'plan', 'bypass'].map(Permission.permissionLabel), ['Auto', 'Manual', 'Accept edits', 'Plan', 'Bypass permissions']);
});

// R07 plan approval card (Rse, approval-current.js:9459-9887; PM :16105-16127).
function planReview(extra = {}) {
  const request = { id: 31, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `r07-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', itemId: 'call-plan', questions: [{ id: 'plan-review', header: 'Plan review',
      question: 'Approve this plan and leave plan mode?', isOther: true, isSecret: false,
      options: [{ label: 'Approve', description: 'Leave plan mode.' }, { label: 'Keep planning', description: 'Stay in plan mode.' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return render(SourceApproval, { runtime, request, respond: async () => ({}), getVisibleThreadId: () => 'T', ...extra });
}
const labels = html => [...html.matchAll(/<span class="sac-button-label"[^>]*>([^<]*)<\/span>/g)].map(match => match[1]);
const caps = html => [...html.matchAll(/data-approval-action="([^"]+)"[^>]*>(?:(?!<\/button>).)*?data-cds="Shortcut"/g)].map(match => match[1]);

test('R07 plan review renders the plan card: heading, Open plan, Reject / Revise… left, Accept / trust-forward primary right', () => {
  const html = planReview({ planTarget: 'acceptEdits', onOpenPlan: () => {} });
  assert.match(html, /class="source-message sac-card spc-card"[^>]*data-approval-kind="plan"/);
  assert.match(html, /<span id="[^"]+" class="spc-title">DeepSeek proposed a plan<\/span>/);
  assert.match(html, /<span class="spc-trailing"><button type="button" class="spc-open-plan" data-cds="TextLink">Open plan<\/button><\/span>/);
  assert.doesNotMatch(html, /sq-card|sq-option|Approve this plan/);
  assert.deepEqual(labels(html), ['Reject', 'Revise…', 'Accept', 'Accept and allow edits']);
  assert.match(html, /<div class="spc-left">.*data-approval-action="reject".*data-approval-action="revise-open".*<\/div><div class="spc-right">.*data-approval-action="accept".*data-approval-action="primary"/);
  assert.deepEqual(caps(html), ['revise-open', 'accept', 'primary']);
  assert.match(html, /data-approval-action="primary" aria-keyshortcuts="Meta\+Enter Control\+Enter"/);
  assert.match(html, /data-variant="primary" data-approval-primary="" data-approval-action="primary"/);
  assert.equal(count(html, 'data-approval-primary=""'), 1);
  // xee: the primary is a split button whose caret opens 'More accept options' (the other trust-forward modes).
  assert.match(html, /<span class="spc-split" data-split="">.*data-approval-action="primary".*aria-label="More accept options"[^>]*aria-haspopup="menu"/);
  assert.doesNotMatch(html, /Plan feedback|textarea/);
  // Mk labels follow the target; Manual leaves one primary 'Accept'; Bypass shows only while it is available.
  assert.deepEqual(labels(planReview({ planTarget: 'auto' })), ['Reject', 'Revise…', 'Accept', 'Accept and auto mode']);
  assert.deepEqual(labels(planReview({ planTarget: 'bypass' })), ['Reject', 'Revise…', 'Accept', 'Accept and auto mode']);
  assert.deepEqual(labels(planReview({ planTarget: 'bypass', bypassAvailable: true })), ['Reject', 'Revise…', 'Accept', 'Accept and bypass permissions']);
  assert.deepEqual(labels(planReview({ planTarget: 'ask' })), ['Reject', 'Revise…', 'Accept']);
  assert.match(planReview({ planTarget: 'ask' }), /data-variant="primary" data-approval-primary="" data-approval-action="primary"[^>]*>.*Accept/);
  assert.deepEqual(labels(planReview({ planTarget: 'bypass' })), ['Reject', 'Revise…', 'Accept', 'Accept and auto mode']);
  assert.doesNotMatch(planReview({}), /Open plan/, 'no plan item, no link');
  // Inactive: no keycaps; a malformed review keeps the question card's error notice.
  assert.deepEqual(caps(planReview({ planTarget: 'auto', isActive: false })), []);
  const request = { id: 32, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `r07-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'plan-review', question: '', options: [] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  assert.match(render(SourceApproval, { runtime, request }), /class="source-message source-question-card epitaxy-approval-card [^"]*"[^>]*data-approval-invalid=""/);
});

test('R07 question card: choosing Other with an empty field enables Submit (uk)', () => {
  const request = { id: 33, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `r07-${++instance}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'q', question: 'Pick', isOther: true, options: [{ label: 'A' }, { label: 'B' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  runtime.selectOther(runtime.ticketFor(request), 'q');
  const html = render(SourceQuestionCard, { runtime, request, respond: async () => ({}), getVisibleThreadId: () => 'T' });
  // dt qn: Other chosen wears st; the Other button has no aria-pressed on a single-select question (`J ? Y : void 0`).
  assert.match(html, /<div class="flex flex-col gap-\[12px\] rounded-\[5px\] px-md py-md bg-\[light-dark[^"]*"><button type="button" class="flex items-center gap-sm text-body/);
  const footer = html.slice(html.lastIndexOf('<div class="flex items-center justify-end gap-[8px]">'));
  const primary = footer.split('<button').at(-1);
  assert.doesNotMatch(primary.slice(0, primary.indexOf('>')), /\sdisabled=""/);
});
