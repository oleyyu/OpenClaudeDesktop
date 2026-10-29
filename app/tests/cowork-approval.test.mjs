import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-approval (research/w13-coworkui.md cwui-27 / cwui-28): a Cowork session's tool request on the 3.6556.2 tool
// approval card (c96142a4d Je with c14f706e5 wt), generated into src/generated/cowork-approval and fed from the local
// approval runtime by src/source-cowork-approval.jsx. Source only: generator output text, official chunk text and SSR; no
// browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, hasFocus: () => true, visibilityState: 'visible',
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

// The official app is client-rendered: shared-182 Ej (the active pane store wt reads) calls useSyncExternalStore without
// getServerSnapshot. SSR here takes the client snapshot as the server one (as tests/cowork-live-generated.test.mjs does).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(h(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, generated, host, adapters, draft, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  generated = await server.ssrLoadModule('/src/generated/cowork-approval/index.mjs');
  host = await server.ssrLoadModule('/src/source-cowork-approval.jsx');
  adapters = await server.ssrLoadModule('/src/source-cowork-approval-adapters.jsx');
  draft = await server.ssrLoadModule('/src/approval-draft-model.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

let instance = 0;
const request = (method, params, id = ++instance) => ({ id, method, bridgeApproval: { connectionId: 'c', instanceId: `i-${id}` },
  params: { threadId: 'T', turnId: 'turn-1', itemId: `item-${id}`, ...params } });
const command = (extra = {}) => request('item/commandExecution/requestApproval', { command: 'rm -rf build', cwd: '/Users/x/Docs', ...extra });
const render = (req, props = {}) => {
  const runtime = draft.createApprovalDraftRuntime();
  runtime.reconcile([req]);
  return renderToStaticMarkup(h(host.SourceCoworkToolApproval, { runtime, request: req, item: null, getVisibleThreadId: () => 'T', respond: async () => ({ ok: true }), ...props }));
};

test('the generated graph pins the official 3.6556.2 roots, call sites and service boundary', () => {
  const manifest = JSON.parse(local('src/generated/cowork-approval/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.publicNames, {
    ToolApprovalCard: { file: 'c96142a4d-BISHCy1R.js', local: 'Je', export: 'i' },
    ToolApprovalActions: { file: 'c14f706e5-BnmRTX8N.js', local: 'wt', export: 't' },
  });
  assert.deepEqual(manifest.adapters.map(a => `${a.original}=>${a.name}`).sort(), [
    'c14f706e5-BnmRTX8N.js#mt=>ToolApprovalNotifyOptIn', 'c14f706e5-BnmRTX8N.js#tt=>recordToolApprovalEvent', 'cc2d75ce6-Cp39p2Ni.js#l=>useToolApprovalComposer',
    'shared-1-BJhqMmkf.js#fR=>useToolAppResource', 'shared-10-D6FXWZph.js#rS=>approvalPlaceCheckChunk', 'shared-156-BLTosN8U.js#X=>useConnectorStore',
    'shared-156-BLTosN8U.js#iw=>useConnectorLookup', 'shared-6-sd9jbJqs.js#lb=>useOpenToolApprovalFile']);
  for (const name of manifest.adapters.map(a => a.name)) assert.equal(typeof adapters[name] === 'function' || typeof adapters[name] === 'object', true, name);
  // D1: the window attention tracker is approval-landing's, the question key helpers question-card's, the connector icon
  // tiles mcp-app-card's; nothing of c14f706e5 / c96142a4d is sliced by another graph.
  const linked = manifest.linkedImports.map(l => `${l.original}=>${l.from}`);
  for (const key of ['shared-10-D6FXWZph.js#Nx=>../approval-landing/', 'shared-7-DBAgAi5H.js#Fk=>../', 'shared-156-BLTosN8U.js#Xq=>../question-card/'])
    assert.ok(linked.some(l => l.startsWith(key)), key);
  for (const dir of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (dir === 'cowork-approval') continue;
    const other = (() => { try { return JSON.parse(local(`src/generated/${dir}/manifest.json`)); } catch { return null; } })();
    for (const mod of other?.modules ?? []) assert.ok(!['c14f706e5-BnmRTX8N.js', 'c96142a4d-BISHCy1R.js'].includes(mod.source), `${dir} slices ${mod.source}`);
  }
  // Cowork's ex (ca44d5dae) builds the approvalData wt reads; the notify host is only an external ask's or a remote session's.
  const ex = official('ca44d5dae-lEflPFFi.js');
  for (const s of ['onAllowForAllScheduledRuns:ni?pi:void 0', 'onAllowForThisTask:$t||tn?mi:void 0', 'J?Le?void 0:{surface:"external",toolUseId:t}:Wr?{surface:"cowork_remote",toolUseId:t}:void 0',
    'isExternalSurface:l=!1'])
    assert.equal(ex.split(s).length - 1, 1, s);
  const card = official('c14f706e5-BnmRTX8N.js');
  for (const s of ['{defaultMessage:"Allow for this task",id:"X2n9R87ZBD"}', '{defaultMessage:"Allow for all tasks",id:"0xIGAXr2i7"}',
    '{defaultMessage:"Allow once",id:"O2tb5KUxpc"}', '{defaultMessage:"Deny",id:"htvX+Z11l+"}', 'offer:{defaultMessage:"Get notified when you\\u2019re needed",id:"+0swYPkBoH"}'])
    assert.equal(card.split(s).length - 1, 1, s);
  // The menu label is formatted on each of the three rungs that carry the dropdown (task, scheduled, perChat).
  assert.equal(card.split('menuLabel:_t.formatMessage({defaultMessage:"More allow options",id:"neJ+WAvag5"})').length - 1, 3);
  const out = local('src/generated/cowork-approval/c14f706e5-BnmRTX8N.mjs').replace(/\s+/g, ' ');
  for (const s of ['defaultMessage: "Allow for this task", id: "X2n9R87ZBD"', 'key: "scheduled",', 'key: "task",', '"flex flex-col gap-3 compact:gap-2"'])
    assert.ok(out.includes(s), s);
});

test('a Cowork command request: Claude wants to use Bash, Allow for this task first, then Allow once and Deny', () => {
  const html = render(command());
  const words = text(html);
  assert.match(words, /Claude wants to use Bash/);
  assert.ok(words.indexOf('Allow for this task') >= 0, words);
  assert.ok(words.indexOf('Allow once') > words.indexOf('Allow for this task'), words);
  assert.match(words, /Deny/);
  assert.doesNotMatch(words, /Always allow|More allow options|Allow for all scheduled runs|Get notified/);
  // Je's stacked card (`mx-2.5 mt-1 mb-2 ${He}`) and wt's root (`data-approval-card-root`).
  assert.ok(html.includes('mx-2.5 mt-1 mb-2 flex max-w-[360px] flex-col items-center gap-6 overflow-hidden rounded-card border-[0.5px] border bg-surface-panel p-6 shadow-sm'), html);
  assert.ok(html.includes('data-approval-card-root=""'), html);
});

const decisions = (list) => ({ availableDecisions: list });
const agentTool = (tool, extra = {}) => command({ command: undefined, codeDesktop: { agentTool: tool }, ...extra });

test('a scheduled task run: ex hands wt both rungs (E70, tn has no !H); wt shows the task rung, which comes first', () => {
  // ex gives onAllowForThisTask (`$t || tn`) and onAllowForAllScheduledRuns (`ni`) together; wt's persistent rung is
  // `Wt ? {key:"task"…} : J || j ? {key:"scheduled"…} : …`, so the task rung is the one on the card.
  const words = text(render(command(), { scheduledRun: true }));
  assert.match(words, /Allow for this task/);
  assert.doesNotMatch(words, /Allow for all scheduled runs/);
  assert.match(words, /Allow once/);
  const wt = local(`src/generated/cowork-approval/${fs.readdirSync(path.join(app, 'src/generated/cowork-approval')).find(name => name.startsWith('c14f706e5'))}`);
  assert.ok(wt.indexOf('key: "task",') < wt.indexOf('key: "scheduled",') && wt.includes(': J || j'), 'wt: the task rung before the scheduled one');
  assert.ok(official('c14f706e5-BnmRTX8N.js').includes('Wt?{key:"task"'));
  const ex = official('ca44d5dae-lEflPFFi.js');
  assert.ok(ex.includes('tn=te===!0&&!J&&!Et&&!kt&&P!==!0'));
  assert.ok(ex.includes('$t=(Be.coworkWriteToolWarning===!0||Be.persistentGrantsSuppressed===!0&&Rt?.server.origin==="direct")&&Be.sessionGrantHonored!==!1&&!H&&!Mt'));
  // No session decision: neither rung.
  assert.doesNotMatch(text(render(command(decisions(['accept', 'decline'])), { scheduledRun: true })), /Allow for this task|Allow for all scheduled runs/);
  // c115330e7 c: "Allow for {days, plural, …}" only with an expiry, which local task rules never have.
  const label = official('c115330e7-BfaVm5bx.js');
  assert.ok(label.includes('defaultMessage:"Allow for all scheduled runs"'));
});

test('offers: a persistent rule goes under More allow options; no session offer leaves Allow once and Deny', () => {
  const persistent = render(command(decisions(['accept', 'acceptForSession', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['git', 'status'] } }, 'decline'])));
  assert.ok(persistent.includes('data-cds="SplitDropdownButton" role="group" aria-label="More allow options"'), persistent);
  assert.match(text(persistent), /Allow for this task/);
  const plain = text(render(command(decisions(['accept', 'decline']))));
  assert.doesNotMatch(plain, /Allow for this task|More allow options|Always allow/);
  assert.match(plain, /Deny/);
  assert.match(plain, /Allow once/);
  // With no session rung the persistent offer is the primary "Always allow" (wt `g && !C` → key "always").
  const always = text(render(command(decisions(['accept', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['ls'] } }, 'decline']))));
  assert.match(always, /Always allow/);
});

test('names: Edit / Write for file changes, Bash for commands, the app tool’s own title as the headline', () => {
  const edit = request('item/fileChange/requestApproval', { changes: [{ path: '/Users/x/Docs/a.md', kind: { type: 'update' } }] });
  assert.match(text(render(edit)), /Claude wants to use Edit/);
  const write = request('item/fileChange/requestApproval', { changes: [{ path: '/Users/x/Docs/b.md', kind: { type: 'add' } }] });
  assert.match(text(render(write)), /Claude wants to use Write/);
  assert.deepEqual(host.coworkApprovalTool(write, null), { toolName: 'Write', input: { file_path: '/Users/x/Docs/b.md' } });
  assert.deepEqual(host.coworkApprovalTool(command(), null), { toolName: 'Bash', input: { command: 'rm -rf build', cwd: '/Users/x/Docs' } });
  const folder = agentTool({ kind: 'other', title: 'Allow access to “Reports”?', detail: '/Users/x/Reports' }, { sessionGrantable: true });
  const words = text(render(folder));
  assert.match(words, /Allow access to “Reports”/);
  assert.doesNotMatch(words, /Claude wants to use/);
  assert.match(words, /Allow for this task/);
  assert.match(text(render(folder, { scheduledRun: true })), /Allow for this task/);
  // Without sessionGrantable the app tool's card is one plain allow.
  assert.doesNotMatch(text(render(agentTool({ kind: 'other', title: 'Delete files?' }))), /Allow for this task/);
});

test('app tools: the card names the tool the model called (cc1aae219 toolName: v || n.name, rawToolName: n.name), no headline', () => {
  const bE = official('cc1aae219-CeSwM-tp.js');
  assert.ok(bE.includes('toolName:v||n.name,rawToolName:n.name,'), 'cc1aae219 bE call site');
  // The names the app's tools are called by (electron/agent-tools) — the card says what the model asked for.
  const toolsDir = path.join(app, 'electron/agent-tools');
  for (const [file, name] of [['web.mjs', 'WebFetch'], ['notebook.mjs', 'NotebookEdit'], ['schedule.mjs', 'CronCreate'], ['monitor.mjs', 'Monitor'],
    ['terminal.mjs', 'run_in_terminal'], ['host.mjs', 'reveal_path'], ['host.mjs', 'open_in_editor']])
    assert.ok(fs.readFileSync(path.join(toolsDir, file), 'utf8').includes(`name: "${name}"`), `${file} ${name}`);
  const cases = [
    [{ kind: 'web-fetch', host: 'example.com', url: 'https://example.com/a' }, 'WebFetch'],
    [{ kind: 'notebook-edit', path: '/Users/x/Docs/n.ipynb', mode: 'replace', cellId: 'c1', source: 'print(1)' }, 'NotebookEdit'],
    [{ kind: 'schedule', cron: '0 9 * * *', humanSchedule: 'Every day at 9:00', prompt: 'Sum up', recurring: true }, 'CronCreate'],
    [{ kind: 'monitor', description: 'Watch the build' }, 'Monitor'],
    [{ kind: 'terminal-command', title: 'Run in a terminal tab?', tabTitle: 'build' }, 'run_in_terminal'],
    [{ kind: 'open-path', action: 'reveal', path: '/Users/x/Docs/a.md' }, 'reveal_path'],
    [{ kind: 'open-path', action: 'editor', path: '/Users/x/Docs/a.md', editor: 'VS Code' }, 'open_in_editor'],
  ];
  for (const [tool, name] of cases) {
    const req = agentTool(tool, tool.kind === 'monitor' || tool.kind === 'terminal-command' ? { command: 'npm run build' } : {});
    const named = host.coworkApprovalTool(req, null);
    assert.equal(named.toolName, name, tool.kind);
    assert.equal(named.rawToolName, name, tool.kind);
    assert.equal(named.headline, undefined, tool.kind);
    const words = text(render(req));
    assert.match(words, new RegExp(`Claude wants to use ${name}`), tool.kind);
    assert.match(words, /Allow once/, tool.kind);
  }
  assert.equal(host.coworkApprovalTool(agentTool(cases[0][0]), null).glyph, 'Globe');
  // A request main asks as "other" names no tool: its title stays the heading.
  const other = host.coworkApprovalTool(agentTool({ kind: 'other', title: 'Delete files?' }), null);
  assert.match(other.headline, /Delete files\?$/);
  assert.equal(other.toolName, other.headline);
  assert.equal(other.rawToolName, undefined);
});

test('which requests the official card words: tool permissions only; questions, plans, elicitations and worded agent tools keep the local card', () => {
  assert.equal(host.coworkApprovalApplies(command(), null), true);
  assert.equal(host.coworkApprovalApplies(request('item/fileChange/requestApproval', { changes: [] }), null), true);
  assert.equal(host.coworkApprovalApplies(agentTool({ kind: 'web-fetch', host: 'example.com', url: 'https://example.com' }), null), true);
  assert.equal(host.coworkApprovalApplies(request('item/tool/requestUserInput', { questions: [] }), null), false);
  assert.equal(host.coworkApprovalApplies(request('mcpServer/elicitation/request', { message: 'x' }), null), false);
  assert.equal(host.coworkApprovalApplies(request('item/permissions/requestApproval', { permissions: {} }), null), false);
  for (const kind of ['preview-site', 'chrome-site', 'preview-server', 'workflow'])
    assert.equal(host.coworkApprovalApplies(agentTool({ kind, host: 'x', url: 'https://x', name: 'w' }), null), false, kind);
  assert.equal(host.coworkApprovalApplies(command({ codeDesktop: { sampling: { server: 's' } } }), null), false);
  assert.equal(host.coworkApprovalApplies(command(decisions(['decline'])), null), false);
});

test('each rung sends its decision through the approval runtime, and main maps it for the Cowork core', async () => {
  const sent = [];
  const data = (d, scheduledRun = false) => host.coworkApprovalData(d, { scheduledRun, submit: (key) => sent.push(key) });
  const offered = host.coworkApprovalDecisions(command(decisions(['accept', 'acceptForSession', { acceptWithExecpolicyAmendment: { execpolicy_amendment: ['git'] } }, 'decline'])), null);
  assert.deepEqual(offered, { once: 'accept', session: 'acceptForSession', persistent: { key: 'decision:2', label: 'Always allow commands that start with “git”' }, deny: 'decline' });
  const task = data(offered);
  task.submitToolApproval('once'); task.submitToolApproval('always'); task.submitToolApproval('deny'); task.onAllowForThisTask({ viaKeyboard: false });
  assert.equal(task.onAllowForAllScheduledRuns, undefined);
  assert.equal(task.showAlwaysAllowed, true);
  assert.equal(task.alwaysAllowHint, 'Always allow commands that start with “git”');
  const run = data(offered, true);
  run.onAllowForAllScheduledRuns({ viaKeyboard: true });
  run.onAllowForThisTask({ viaKeyboard: false });
  assert.deepEqual(sent, ['accept', 'decision:2', 'decline', 'acceptForSession', 'scheduled', 'acceptForSession']);
  assert.equal(host.SCHEDULED_DECISION, 'scheduled');
  // Deny is the core's cancel when that is all it takes.
  assert.equal(host.coworkApprovalDecisions(command(decisions(['accept', 'cancel'])), null).deny, 'cancel');
  // Through the shared runtime: the payload main's respond takes (approval-draft-model responsePayload).
  const runtime = draft.createApprovalDraftRuntime();
  const req = command();
  runtime.reconcile([req]);
  const payloads = [];
  const result = await runtime.submit(runtime.ticketFor(req), 'acceptForSession', async (payload) => { payloads.push(payload); return { ok: true, identity: req.bridgeApproval }; },
    { getVisibleThreadId: () => 'T' });
  assert.equal(result.status, 'answered');
  assert.deepEqual(payloads, [{ id: req.id, expected: req.bridgeApproval, decision: 'acceptForSession' }]);
  // E70: the scheduled rung goes through the runtime as the session decision and reaches main as "scheduled", which
  // approval-policy.mjs answers acceptForSession for the core.
  const scheduledReq = command();
  runtime.reconcile([scheduledReq]);
  const sentScheduled = [];
  const sender = host.coworkApprovalSender({ runtime, ticket: runtime.ticketFor(scheduledReq), decisions: host.coworkApprovalDecisions(scheduledReq, null),
    respond: async (payload) => { sentScheduled.push(payload); return { ok: true, identity: scheduledReq.bridgeApproval }; }, getVisibleThreadId: () => 'T' });
  assert.equal((await sender('scheduled')).status, 'answered');
  assert.deepEqual(sentScheduled, [{ id: scheduledReq.id, expected: scheduledReq.bridgeApproval, decision: 'scheduled' }]);
  // main.cjs respond → approval-policy coworkRespondPayload: the core's own words pass through unchanged for a Cowork thread.
  const policy = await import('../electron/cowork-runtime/approval-policy.mjs');
  const owner = { getApproval: () => ({ method: 'item/commandExecution/requestApproval', params: { threadId: 'T', turnId: 'turn-1' } }) };
  assert.deepEqual(policy.coworkRespondPayload(owner, payloads[0], { cowork: () => true }), payloads[0]);
});

test('zh-CN: the official copy reads in Chinese, Claude kept (D23)', () => {
  i18n.setLocale('zh-CN');
  try {
    const words = text(render(command()));
    assert.match(words, /Claude 想要使用 Bash/);
    assert.match(words, /允许此任务/);
    assert.match(words, /允许一次/);
    assert.match(words, /拒绝/);
  } finally { i18n.setLocale('en-US'); }
});

test('service adapters answer as the local host: no opt-in, no connectors, no app view, composer from CardComposerContext', () => {
  assert.equal(adapters.ToolApprovalNotifyOptIn({ coworkHost: { surface: 'external' } }), null);
  assert.equal(adapters.useConnectorStore((state) => Object.keys(state.remoteServers).length), 0);
  assert.equal(adapters.useConnectorLookup().connectorIconFlags.hostedOnly, false);
  assert.deepEqual(adapters.approvalPlaceCheckChunk.warm(), undefined);
  assert.equal(adapters.approvalPlaceCheckChunk.pending, false);
  const src = local('src/source-cowork-approval-adapters.jsx');
  assert.ok(src.includes('useContext(CardComposerContext)'));
  // main.jsx: Cowork sessions route the requests the official card words to it; everything else keeps the local card.
  const main = local('src/main.jsx');
  assert.ok(main.includes('{mode === "cowork" && coworkApprovalApplies(a, approvalItem(a, items)) ? <SourceCoworkToolApproval runtime={approvalRuntime.current} request={a}'));
  assert.ok(main.includes('import { SourceCoworkToolApproval, coworkApprovalApplies } from "./source-cowork-approval.jsx";'));
});

test('a clamped Cowork turn: main.jsx shows the official permission_mode_clamped toast, in zh-CN too', async () => {
  const clamp = official('ce401cf8e-Bd3DKyj0.js');
  for (const s of ['{defaultMessage:"Bypass permissions isn\\u2019t available for this session. Asking for permissions instead.",id:"L3SmTmhYss"}',
    '{defaultMessage:"Auto mode isn\\u2019t available for this session. Asking for permissions instead.",id:"WO7zv5DRWf"}', 'if(l.type==="permission_mode_clamped"){'])
    assert.equal(clamp.split(s).length - 1, 1, s);
  const main = local('src/main.jsx');
  assert.ok(main.includes('if (e.kind === "permission-mode-clamped" && side === 0) toasts?.add?.(e.permissionMode === "bypassPermissions" ? t("Bypass permissions isn’t available for this session. Asking for permissions instead.") : t("Auto mode isn’t available for this session. Asking for permissions instead."), { variant: "danger" });'));
  // main.cjs emits it with the asked mode (w13-coworkfn-approvals).
  assert.ok(local('electron/main.cjs').includes('emit({ kind: "permission-mode-clamped", threadId: params.threadId, permissionMode: clamped })'));
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh['Bypass permissions isn’t available for this session. Asking for permissions instead.'], '此会话无法使用绕过权限模式，改为询问权限。');
  assert.equal(zh['Auto mode isn’t available for this session. Asking for permissions instead.'], '此会话无法使用自动模式，改为询问权限。');
});
