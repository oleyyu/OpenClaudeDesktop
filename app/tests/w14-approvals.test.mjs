// V3-W14-approvals (plan-w14-code.md, lane approvals): the Code approval cards against 3.6556.2.
//  1. the official source the cards follow (read only, never executed): the c2d1aeb56 shell / body strings and its
//     c9bddf7be injection, cb6930dae's c031798b2 card rules, cc32965c2 Sv's tool card className, bs / Ss / Fs / Is / ls copy;
//  2. the model: titles through one rich message, the Code card's Always allow, the elicitation copy, the workflow card,
//     the accessible name and the send failure;
//  3. SSR: the elicitation url / form cards, the plan card with inline comments, the workflow token warning, the
//     computer-use access title.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApprovalDraftRuntime } from '../src/approval-draft-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = file => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };

// ---- 1. the official source ----------------------------------------------------------------------------------------

test('c2d1aeb56: the card shell V, the body Y over J, the card-presentation outline, the backdrop only off the card', () => {
  const frame = read(path.join(v3, 'c2d1aeb56-BwMYdDs2.js'));
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  const V = 'epitaxy-approval-card relative isolate flex flex-col rounded-card p-[12px] gap-[12px] max-h-[60vh] origin-top @container animate-code-approval-promote group-data-[skip-approval-enter]/approval-dock:animate-none motion-reduce:animate-none';
  const Y = 'epitaxy-approval-body flex min-h-0 flex-col gap-[12px] overflow-y-auto -mx-[12px] px-[12px] -mt-[4px] pt-[4px] -mb-[8px] pb-[8px] [&>*]:shrink-0';
  const J = 'epitaxy-scroll-clamp scroll-fade-y focus-visible:outline-hidden focus-visible:shadow-focus';
  once(frame, [`V="${V}"`, `"${Y}"`, `o("${J}",r)`, 'w=d==="card"&&!f&&"epitaxy-card-outline"', 'S=J1($,14,p)?K1($,14,p,p?void 0:t(B,{})):$[15]']);
  once(card, [`export const APPROVAL_CARD_SHELL = "${V}";`, `export const APPROVAL_CARD_BODY = "${J} ${Y}";`, 'export const APPROVAL_CARD_OUTLINE = "epitaxy-card-outline";']);
  // cc32965c2 Sv: the tool card's className and body gap (the elicitation and plan cards take V's).
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  once(feed, ['oa=J1($,268,aa)?K1($,268,aa,y("gap-[24px]",co,aa)):$[269]', 'a(lo,{className:"gap-[24px]",children:[la,ua]})']);
});

test('the card sheet carries the two original injections verbatim', () => {
  const css = read(path.join(app, 'src/source-approval-card.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const frame = read(path.join(v3, 'c2d1aeb56-BwMYdDs2.js'));
  const actions = /\("c9bddf7be","([^"]+)"\)/.exec(frame)[1];
  assert.ok(css.includes(actions), 'c9bddf7be');
  const plan = read(path.join(v3, 'cb6930dae-Dw_4c1QI.js'));
  const cards = /\("c031798b2","([^"]+)"\)/.exec(plan)[1];
  // The approval card rules of c031798b2 (up to its question receipt rules, which are the receipt's).
  const own = cards.slice(0, cards.indexOf('.epitaxy-root .epitaxy-answer-option'));
  assert.match(own, /\.epitaxy-root \.epitaxy-approval-card\[data-approval-presentation\]\{animation:\.16s ease-out epitaxy-approval-inline-enter\}/);
  assert.ok(css.includes(own), 'c031798b2 card rules');
  // No hand-written card shell, body or button chrome is left.
  for (const gone of ['.sac-card', '.sac-body', '.sac-button', '.sac-actions', '.sac-heading', 'sac-inline-enter', '.sac-field', '.sac-form'])
    assert.equal(css.includes(gone), false, gone);
});

test('cc32965c2 copy: bs / Ss / Fs / Is / ls / Sv strings the cards render', () => {
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  for (const text of ['defaultMessage:"{serverName} requests your input",id:"8+GEYEqcFF"', 'defaultMessage:"Don\\u2019t enter passwords or verification codes here.",id:"scvDRkJ0L0"',
    'defaultMessage:"{serverName} wants to open a URL",id:"nfymUJgaww"', 'defaultMessage:"This opens a site outside Claude.",id:"MyWiawCysE"',
    'defaultMessage:"I\\u2019m done, continue",id:"d91uaN3SMw"', 'defaultMessage:"Claude proposed a plan",id:"uwYMasx1yw"',
    'defaultMessage:"{count, plural, one {# inline comment} other {# inline comments}} will be sent",id:"tKbvlNaCKf"',
    'className:"flex max-h-[176px] scroll-p-[8px] flex-col gap-1 overflow-y-auto -m-[8px] p-[8px]"',
    'defaultMessage:"Allow Claude to <b>use</b> <meta>{app}</meta>?",id:"dXCzkuzvh2"', 'defaultMessage:"Permission request: {action}",id:"Uyfuf4HKh8"',
    'defaultMessage:"Saves to user settings (all projects)",id:"yew/eTvhGh"', 'defaultMessage:"run a workflow",id:"+dTxnpark1"'])
    assert.ok(feed.includes(text), text);
});

// ---- 2. the model ----------------------------------------------------------------------------------------------------

const { approvalCardModel, approvalAriaAction, approvalAnnouncement } = await import('../src/approval-card-model.mjs');
const COMMAND = 'item/commandExecution/requestApproval', ELICIT = 'mcpServer/elicitation/request';
const command = params => ({ id: 1, method: COMMAND, params: { threadId: 't', ...params } });
const agentTool = (tool, extra = {}) => command({ cwd: '/w', ...extra, codeDesktop: { agentTool: tool } });

test('model: every card title is one of L\'s messages; the accessible name takes the action (hg, pg)', () => {
  assert.deepEqual(approvalCardModel(command({ command: 'ls' })).heading, { action: 'run', meta: null });
  assert.deepEqual(approvalCardModel(command({ kind: 'writeStdin' })).heading, { action: 'send input to this terminal', meta: null });
  assert.deepEqual(approvalCardModel({ id: 2, method: 'item/fileChange/requestApproval', params: { threadId: 't' } }).heading, { action: 'edit files', meta: null });
  assert.deepEqual(approvalCardModel({ id: 3, method: 'item/permissions/requestApproval', params: { threadId: 't', permissions: { x: 1 } } }).heading, { action: 'use these permissions', meta: null });
  assert.equal(approvalAriaAction(approvalCardModel(command({ command: 'ls' }), { type: 'commandExecution', command: 'ls', description: 'List' })), 'run');
  const long = { kind: 'command', title: 'x', heading: { action: 'a'.repeat(200), meta: null }, context: [] };
  assert.equal(approvalAriaAction(long), `${'a'.repeat(150)}, truncated`);
  assert.match(approvalAnnouncement(approvalCardModel(command({ command: 'x'.repeat(200) }))), /, truncated$/);
});

test('model: the Code card\'s persistent offers are Sv pr / ki; the Cowork wording stays on offeredDecisions', async () => {
  const { offeredDecisions } = await import('../src/approval-card-model.mjs');
  const offered = ['accept', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['npm', 'test'] } },
    { applyNetworkPolicyAmendment: { network_policy_amendment: { host: 'registry.npmjs.org', action: 'allow' } } }];
  const model = approvalCardModel(command({ command: 'npm test', availableDecisions: offered }));
  assert.deepEqual(model.allows.map(allow => [allow.label, allow.title]), [['Always allow', 'Saves to user settings (all projects)'],
    ['Always allow for this website', 'registry.npmjs.org'], ['Allow once', undefined]]);
  assert.equal(model.allows[0].description, 'Commands that start with “npm test”');
  const project = approvalCardModel(command({ command: 'npm test', availableDecisions: ['accept', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['npm', 'test'] }, codeDesktop: { scope: 'project' } }] }));
  assert.equal(project.allows[0].title, 'Saves to project settings');
  assert.match(offeredDecisions(offered).persistent[0].label, /start with “npm test”/);
});

test('model: elicitation copy (bs / Ss; the catalog\'s nameless sentences), the workflow and site cards', () => {
  const url = approvalCardModel({ id: 4, method: ELICIT, params: { threadId: 't', serverName: 'my_server', mode: 'url', url: 'https://a.example/x' } });
  assert.deepEqual([url.title, url.elicitation.host, url.deny.label, url.allows.map(a => a.label)], ['my server wants to open a URL', 'a.example', 'Decline', ['I’m done, continue']]);
  const nameless = approvalCardModel({ id: 5, method: ELICIT, params: { threadId: 't', mode: 'url', url: 'https://a.example/x' } });
  assert.equal(nameless.title, 'A connector wants to open a URL');
  const schema = { type: 'object', properties: { a: { type: 'string' } } };
  const form = approvalCardModel({ id: 6, method: ELICIT, params: { threadId: 't', serverName: 's', mode: 'form', requestedSchema: schema } });
  assert.deepEqual([form.title, form.elicitation.schema, form.allows.map(a => a.label)], ['s requests your input', schema, ['Submit']]);
  const workflow = approvalCardModel(agentTool({ kind: 'workflow', name: 'review', description: 'Review it', always: true }));
  assert.deepEqual([workflow.heading.action, workflow.heading.meta, workflow.heading.overrideDescription, workflow.tokenWarning, workflow.reason, workflow.deny.label],
    ['run a workflow', 'review', 'Review it', true, null, 'Deny']);
  // W14-code r4 r4pa-c11: Wh meta is m("origin") ?? m("domain"), the description G2uuEyevXT (jPKPzV-P y2n `{ origin: t, domain: a }`).
  assert.deepEqual(approvalCardModel(agentTool({ kind: 'preview-site', host: 'a.example', url: 'https://a.example' })).heading, { action: 'act on', meta: 'https://a.example',
    overrideDescription: 'Allow once applies to this page only. Always allow saves on this device (revoke in Settings). DeepSeek won’t purchase, create accounts, or bypass captchas without asking.' });
  assert.deepEqual(approvalCardModel(agentTool({ kind: 'chrome-site', host: 'a.example', url: 'https://a.example' })).heading, { action: 'access', meta: 'a.example' });
});

test('the send failure reads c5da7eb42 KS\'s sentence', async () => {
  const request = command({ command: 'ls', itemId: 'i', turnId: 'u' });
  request.bridgeApproval = { connectionId: 'c', instanceId: 'x' };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  const result = await runtime.submit(runtime.ticketFor(request), 'accept', async () => ({ ok: false, error: { code: 'failed' } }), { getVisibleThreadId: () => 't' });
  assert.equal(result.message, 'Failed to send response. You can try again.');
});

// ---- 3. SSR ----------------------------------------------------------------------------------------------------------

let server, A, Plan, Comments;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
  Plan = await server.ssrLoadModule('/src/source-plan-card.jsx');
  Comments = await server.ssrLoadModule('/src/inline-comments.mjs');
});
after(() => server?.close());
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('SSR: the url card is Ss — the title row, the link card, the caution, Decline, I’m done, the primary Open link', () => {
  const request = { id: 7, method: ELICIT, bridgeApproval: { connectionId: 'c', instanceId: 'u1' }, params: { threadId: 't', serverName: 'probe', mode: 'url', url: 'https://a.example/auth', message: 'Sign in' } };
  const html = render(A.SourceApprovalCardView, { request, onAction() {} });
  assert.match(html, /class="source-message epitaxy-approval-card [^"]*gap-\[12px\][^"]* epitaxy-card-outline"/);
  assert.doesNotMatch(html, /gap-\[24px\]|max-w-\[480px\]/);
  assert.match(html, /<span data-question-stop-name="" class="text-body-semibold min-w-0 break-words">probe wants to open a URL<\/span>/);
  assert.match(html, /data-cds="Card" data-size="sm" data-testid="epitaxy-elicitation-link"[\s\S]*?font-medium text-primary">a\.example<\/span><span class="[^"]*text-secondary">https:\/\/a\.example\/auth<\/span>/);
  assert.match(html, /<p class="text-body min-w-0 \[overflow-wrap:anywhere\] \[unicode-bidi:plaintext\] text-secondary whitespace-pre-wrap">Sign in<\/p><\/div><p class="text-body text-muted-as-secondary" data-testid="epitaxy-elicitation-caution">This opens a site outside Claude\.<\/p>/);
  const labels = [...html.matchAll(/data-approval-action="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(labels, ['decline', 'accept', 'open-link']);
  assert.match(html, /<span class="contents" data-approval-allow="">.*I’m done, continue.*Open link/);
});

test('SSR: the form card is bs — the message under the title, the generated form and fields, the caution, Submit for the form', () => {
  const request = { id: 8, method: ELICIT, bridgeApproval: { connectionId: 'c', instanceId: 'f1' }, params: { threadId: 't', serverName: 'probe', mode: 'form', message: 'Who?',
    requestedSchema: { type: 'object', required: ['name', 'agree'], properties: { name: { type: 'string', title: 'Name' }, age: { type: 'integer', title: 'Age' }, agree: { type: 'boolean', title: 'Agree' } } } } };
  const html = render(A.SourceApprovalCardView, { request, onAction() {} });
  assert.match(html, /probe requests your input<\/span><\/span><div class="text-body text-muted-as-secondary"><span class="whitespace-pre-wrap \[overflow-wrap:anywhere\] \[unicode-bidi:plaintext\]">Who\?<\/span><\/div>/);
  const id = /<form [^>]*data-cds="Form"[^>]*id="([^"]+)"[^>]*data-testid="epitaxy-elicitation-form"/.exec(html)?.[1];
  assert.ok(id, 'the generated form');
  assert.equal(count(html, 'data-cds="Field"'), 3);
  assert.match(html, /name="age"/);
  assert.match(html, /data-testid="epitaxy-elicitation-caution">Don’t enter passwords or verification codes here\.<\/p>/);
  assert.match(html, new RegExp(`<button type="submit"[^>]* form="${id}"[^>]*data-approval-action="accept"`));
  assert.doesNotMatch(html, /sac-field|sac-form|Requested information/);
});

let planInstance = 0;
function planCard(extra = {}) {
  const request = { id: 31, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `w14-${++planInstance}` },
    params: { threadId: 'T14', turnId: 'turn', itemId: 'call-plan', questions: [{ id: 'plan-review', header: 'Plan review', question: 'Approve?', isOther: true, isSecret: false,
      options: [{ label: 'Approve', description: '' }, { label: 'Keep planning', description: '' }] }] } };
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return render(Plan.SourcePlanApprovalCard, { runtime, request, respond: async () => ({}), getVisibleThreadId: () => 'T14', ...extra });
}

test('SSR: with comments on the plan the card is Fs with V open — Is, the field "Anything else to add?", only Revise', () => {
  Comments.planCommentsStore.clear('T14');
  const id = Comments.planCommentsStore.add('T14', { quote: 'Step two', text: 'Use a set here' });
  try {
    const html = planCard({ onOpenPlan() {} });
    assert.match(html, /<ul class="flex max-h-\[176px\] scroll-p-\[8px\] flex-col gap-1 overflow-y-auto -m-\[8px\] p-\[8px\]" data-plan-comments="">/);
    assert.match(html, /<li class="flex items-center gap-0\.5 rounded-\[5px\] bg-alpha-1 pe-1\.25 hover:bg-alpha-2"><button type="button" class="flex min-w-0 flex-1 flex-col gap-0\.5 rounded-\[5px\] p-1\.25 text-start/);
    assert.match(html, /<span class="truncate">Step two<\/span><\/span><span class="text-body text-primary">Use a set here<\/span>/);
    assert.match(html, /aria-label="Delete comment"/);
    assert.match(html, /<li class="sr-only">1 inline comment will be sent<\/li>/);
    assert.match(html, /placeholder="Anything else to add\?"/);
    assert.match(html, /<span class="\[@container_\(max-width:420px\)\]:hidden"><\/span>/);
    assert.deepEqual([...html.matchAll(/data-approval-action="([^"]+)"/g)].map(match => match[1]), ['revise']);
    assert.match(html, /<span id="[^"]+">DeepSeek proposed a plan<\/span>/);
  } finally { Comments.planCommentsStore.remove('T14', id); }
  const plain = planCard({});
  assert.doesNotMatch(plain, /data-plan-comments|textarea/);
});

test('SSR: a workflow card carries the token warning box, its tasks pane link a text link only with a pane to open', () => {
  const request = agentTool({ kind: 'workflow', name: 'review', description: 'Review the diff', phases: [{ title: 'Scan' }] });
  const box = '<div class="rounded-lg bg-alpha-1 px-lg py-2.5 text-body text-secondary select-text break-words">Dynamic workflows run many subagents in parallel and can use a lot of your usage limit. Stop them any time from the ';
  const linked = render(A.SourceApprovalCardView, { request, onAction() {}, onOpenTasks() {} });
  assert.ok(linked.includes(box));
  assert.match(linked, /from the <span data-cds="TextLink"[^>]*>tasks pane<\/span>\.<\/div>/);
  assert.match(linked, /Allow DeepSeek to <span class="text-primary \[unicode-bidi:plaintext\]">run a workflow<\/span> <span class="text-primary \[unicode-bidi:plaintext\]">review<\/span>\?/);
  const plain = render(A.SourceApprovalCardView, { request, onAction() {} });
  assert.ok(plain.includes(`${box}tasks pane.</div>`));
});

test('SSR: the computer-use access title is ls\'s rich message (span.text-primary for <b> / <meta>)', () => {
  const access = { reason: 'Write', flags: {}, apps: [{ bundleId: 'com.apple.TextEdit', displayName: 'TextEdit', tier: 'full', installed: true }] };
  const request = { id: 9, method: ELICIT, bridgeApproval: { connectionId: 'c', instanceId: 'cu1' }, params: { threadId: 't', serverName: 'computer-use', mode: 'form',
    requestedSchema: { type: 'object', properties: {} }, _meta: { codex_approval_kind: 'mcp_tool_call', persist: ['session'], computer_use_access: access } } };
  const html = render(A.SourceApprovalCardView, { request, onAction() {} });
  assert.match(html, /Allow DeepSeek to <span class="text-primary">use<\/span> <span class="text-primary"><span class="\[unicode-bidi:isolate\]">TextEdit<\/span><\/span>\?/);
  assert.doesNotMatch(html, /sac-em/);
});

// ---- 4. 复核修复: appr-03 rest, appr-05, pane-09 toast, 1002481325 hover approval ------------------------------------

test('cc32965c2 Wh: NotebookEdit / WebFetch / MCP headings are the original\'s, not host fragments', () => {
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  for (const text of ['case"NotebookEdit":return{action:e.formatMessage({defaultMessage:"edit",id:"+vj0U3cN/c"}),...x_(m("notebook_path"))}',
    'action:e.formatMessage({defaultMessage:"fetch",id:"afBTrbaItm"}),meta:o===void 0?o:J(o,{singleLine:!0}),detail:i?.trim()?J(i):void 0',
    'function x_(e){return e?{meta:be(e),detail:J(e,{singleLine:!0}),clampTitle:!0}:{}}',
    '`${r.toolName.replace(/_+/g," ")}${h?` (${h})`:""}`', 'defaultMessage:"use {label}",id:"VJ6z/l9Cq2"'])
    assert.ok(feed.includes(text), text);
  const notebook = approvalCardModel(agentTool({ kind: 'notebook-edit', path: '/w/a/analysis.ipynb', mode: 'insert', cellId: 'c1', source: 'x = 1' }));
  assert.deepEqual([notebook.heading.action, notebook.heading.meta, notebook.detail.text, notebook.clampTitle, notebook.context, notebook.reason],
    ['edit', 'analysis.ipynb', '/w/a/analysis.ipynb', true, [], null]);
  const fetch = approvalCardModel(agentTool({ kind: 'web-fetch', host: 'a.example', url: 'https://a.example/docs' }));
  assert.deepEqual([fetch.heading.action, fetch.heading.meta, fetch.detail], ['fetch', 'https://a.example/docs', null]);
  assert.equal(approvalCardModel(agentTool({ kind: 'web-fetch', host: 'a.example', url: 'https://a.example', prompt: 'Summarize' })).detail.text, 'Summarize');
  const mcp = approvalCardModel(command({ command: 'x' }), { type: 'mcpToolCall', server: 'my_server', tool: 'create_issue', arguments: {} });
  assert.deepEqual(mcp.heading, { action: 'use create issue (my server)', meta: null });
  const src = read(path.join(app, 'src/approval-card-model.mjs'));
  for (const gone of ['"fetch {host}"', '"edit {file}"', '"add a cell to {file}"', '"delete a cell in {file}"', '"use {tool} ({server})"', '"use {tool}"'])
    assert.ok(!src.includes(gone), gone);
});

test('appr-05: cc32965c2 Sv ii — "Allow and switch to Auto" in Allow once\'s "More allow options" only with the session\'s offer', async () => {
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  for (const text of ['defaultMessage:"Allow and switch to Auto",id:"OE8niFqRMN"', 'defaultMessage:"Auto reviews the rest of this session.",id:"/AOfoeDoA3"',
    'defaultMessage:"More allow options",id:"neJ+WAvag5"'])
    assert.ok(feed.includes(text), text);
  const { autoSwitchApplies } = await import('../src/approval-card-model.mjs');
  const request = command({ command: 'ls', itemId: 'i' });
  request.bridgeApproval = { connectionId: 'c', instanceId: 'as1' };
  assert.equal(autoSwitchApplies(approvalCardModel(request)), true);
  // a card whose primary is not Allow once (onceLabel), a url elicitation: none; a Codex session allow keeps it.
  assert.equal(autoSwitchApplies(approvalCardModel(agentTool({ kind: 'web-fetch', host: 'a', url: 'https://a' }))), true);
  // W14-code r4 r4pa-c11: the outside-site card is Wh browser:open_site on Sv's own Allow once (no onceLabel), so it offers it too.
  assert.equal(autoSwitchApplies(approvalCardModel(agentTool({ kind: 'preview-site', host: 'a', url: 'https://a' }))), true);
  assert.equal(autoSwitchApplies(approvalCardModel({ id: 4, method: ELICIT, params: { threadId: 't', serverName: 's', mode: 'url', url: 'https://a.example/x' } })), false);
  const offered = render(A.SourceApprovalCardView, { request, onAction() {}, autoSwitch: { fromMode: 'ask', allowAndSwitchToAuto() {} } });
  assert.match(offered, /More allow options/);
  const plain = render(A.SourceApprovalCardView, { request, onAction() {} });
  assert.doesNotMatch(plain, /More allow options/);
  const main = read(path.join(app, 'src/main.jsx'));
  assert.match(main, /bypassMode\.adopt\("auto"\); done\(true\)/);
  assert.match(main, /autoSwitch=\{current === approvalOwner\(a\) \? autoSwitch : null\}/);
});

test('pane-09: c5da7eb42 KS Ce sends the failure to addError; the tool and plan cards toast it instead of a line in the card', () => {
  const ks = read(path.join(v3, 'c5da7eb42-XijZdwf1.js'));
  assert.ok(ks.includes('{addError:c}=Ut()'));
  assert.ok(ks.includes('Sc(l,e)??l.formatMessage({defaultMessage:"Failed to send response. You can try again.",id:"aMbb8XQr/h"})'));
  const card = read(path.join(app, 'src/source-approval-card.jsx')), plan = read(path.join(app, 'src/source-plan-card.jsx'));
  for (const text of [card, plan]) assert.match(text, /result\.status === "error"\) \{ toasts\?\.add\?\.\(result\.message, \{ variant: "danger" \}\)/);
  // W14-code r4 pane-09-toast: KS draws no error line in the card, so the tool card passes none (not even without a toast region).
  assert.ok(!card.includes('error={toasts ? "" : view.error}'));
  // W14-code r5pa-12 / R5DC-07: KS draws no error line either; SourceToastProvider wraps the root (main.jsx), so the
  // plan card's `!toasts` fallback line could never show and is gone.
  assert.ok(!plan.includes('sac-error'));
  assert.ok(!plan.includes('view.error'));
});

test('1002481325: the hover card answers the tool request inline — G\'s Deny / Allow once, clicks only, ca0409d7c\'s toast', async () => {
  const hover = read(path.join(v3, 'ca0409d7c-D6PQXChO.js')), ad = read(path.join(v3, 'cf74bc599-CRYqipWN.js'));
  assert.ok(hover.includes('hasAlwaysAllow:!1,alwaysAllowDisabledReason:void 0,hasThreadAllow:!1'));
  assert.ok(hover.includes('c("Response couldn\'t be sent. You can try again."'));
  assert.ok(ad.includes('isPanelActive:!1,isFocusedPane:!1') && ad.includes('sidebarHover:!0'));
  const { hoverApprovalModel } = await import('../src/action-center-preview-model.mjs');
  const offered = ['accept', 'acceptForSession', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['npm', 'test'] } }];
  const request = command({ command: 'npm test', itemId: 'i', availableDecisions: offered });
  request.bridgeApproval = { connectionId: 'c', instanceId: 'h1' };
  const model = hoverApprovalModel(request);
  assert.deepEqual(model.allows.map(allow => allow.key), ['accept']);
  assert.equal(hoverApprovalModel({ id: 3, method: 'item/tool/requestUserInput', params: { threadId: 't' } }), null);
  // W14-code r4 sidebar-new (R4DC-N1 / fr4-07): the unmounted host Action Center is gone; the card is ca0409d7c fe's host
  // stand-in (source-sidebar-hover-card-adapters.jsx ToolApprovalHoverCard) under the sidebar's hover card host.
  const Hover = await server.ssrLoadModule('/src/source-sidebar-hover-card-adapters.jsx');
  const runtime = createApprovalDraftRuntime();
  runtime.reconcile([request]);
  const hosted = (req, respond) => React.createElement(Hover.SidebarHoverCardHostContext.Provider, { value: { runtime, respond, requestsFor: () => [req] } },
    React.createElement(Hover.ToolApprovalHoverCard, { approval: { hostRequest: req } }));
  const html = renderToStaticMarkup(hosted(request, async () => ({ ok: true })));
  assert.match(html, /^<div class="pb-1"><section /);
  assert.match(html, /data-testid="approval-action-accept"/);
  assert.match(html, /data-testid="approval-action-decline"/);
  assert.doesNotMatch(html, /approval-action-acceptForSession|Always allow|<kbd/);
  assert.match(renderToStaticMarkup(hosted(command({ command: 'x' }), () => {})), /Awaiting input/);
});
