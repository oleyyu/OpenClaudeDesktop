// app/electron fixes, round 4: Codex sub-agents' OpenClaude Desktop tool calls (the calling thread, main-only tools, which
// turn's end cancels them, cards that outlive a turn), DeepSeek's background agents and deferred tool groups, Gemini's
// workflow tiers, window and pane-window restore, ultracode reminders after a relaunch, the provenance relay of a
// steered or queued message, the Export file name and the zh-CN wording for "key" and "agent".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { trackWindowState } = require('../electron/window-state.cjs');
const popoutRestore = require('../electron/popout-restore.cjs');
const { exportFileName } = require('../electron/export-file-name.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-fixer-r4-'));
const tmp = (prefix) => fs.mkdtempSync(path.join(ROOT, prefix));
test.after(() => fs.rmSync(ROOT, { recursive: true, force: true }));
const until = async (check) => { for (let i = 0; i < 300 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 10)); };

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let seq = 0;
  readline.createInterface({ input: child.stdout }).on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  return { child, request };
}

test('a Codex sub-agent\'s call names its own thread: main-only tools refuse it, and only its own turn\'s end cancels it', async (t) => {
  const started = [];
  const waiting = { name: 'wait', description: 'Waits', inputSchema: { type: 'object', properties: {} },
    handler: (_args, ctx) => new Promise((resolve) => { started.push(ctx); ctx.signal.addEventListener('abort', () => resolve(`aborted: ${ctx.signal.reason?.message}`), { once: true }); }) };
  const titled = { name: 'rename', description: 'Main only', mainOnly: true, inputSchema: { type: 'object', properties: {} }, handler: () => 'renamed' };
  const host = createAgentToolsHost({ modules: [{ group: 'demo', tools: [waiting, titled] }], tmpRoot: tmp('host-'), logger: { warn() {}, log() {} },
    resolveSession: (id) => (id === 'parent' ? { id, cwd: '/work' } : null) });
  await host.start();
  t.after(() => host.stop());
  // Codex gives the sub-agent the parent's server config: the same session and its scoped credential.
  const server = mcp({ CODE_DESKTOP_AGENT_TOOLS_SOCKET: host.launchEnv().CODE_DESKTOP_AGENT_TOOLS_SOCKET, CODE_DESKTOP_AGENT_TOOLS_TOKEN: host.sessionToken('parent'), CODE_DESKTOP_AGENT_SESSION: 'parent' });
  t.after(() => server.child.kill());
  await server.request('initialize', {});
  const refused = await server.request('tools/call', { name: 'rename', arguments: {}, _meta: { threadId: 'child-1' } });
  assert.equal(refused.result.isError, true);
  assert.match(refused.result.content[0].text, /^rename is for the main conversation only: a sub-agent can’t use it\./);
  const allowed = await server.request('tools/call', { name: 'rename', arguments: {}, _meta: { threadId: 'parent' } });
  assert.equal(allowed.result.content[0].text, 'renamed');
  // A sub-agent's call acts on the parent session but is the sub-agent's.
  const childCall = server.request('tools/call', { name: 'wait', arguments: {}, _meta: { threadId: 'child-1', callId: 'c1' } });
  const parentCall = server.request('tools/call', { name: 'wait', arguments: {}, _meta: { threadId: 'parent', callId: 'p1' } });
  await until(() => started.length === 2);
  const child = started.find((ctx) => ctx.call.callId === 'c1'), parent = started.find((ctx) => ctx.call.callId === 'p1');
  assert.equal(child.sessionId, 'parent');
  assert.deepEqual([child.call.thread, child.call.subAgent], ['child-1', true]);
  assert.deepEqual([parent.call.thread, parent.call.subAgent], ['parent', false]);
  // The parent's turn ends: its own call is cancelled, the sub-agent's goes on.
  assert.equal(host.cancelThread('parent', 'The turn ended.'), 1);
  assert.equal((await parentCall).result.content[0].text, 'aborted: The turn ended.');
  assert.equal(child.signal.aborted, false);
  // The sub-agent's own turn ends (or is stopped): now its call is.
  assert.equal(host.cancelThread('child-1', 'The turn was stopped.'), 1);
  assert.equal((await childCall).result.content[0].text, 'aborted: The turn was stopped.');
  // Archiving the session cancels every call for it, its sub-agents' too.
  const again = server.request('tools/call', { name: 'wait', arguments: {}, _meta: { threadId: 'child-2' } });
  await until(() => started.length === 3);
  assert.equal(host.cancelSession('parent', 'The session was archived.'), 1);
  await again;
});

test('a call that names no thread (DeepSeek, the bridges) is its session\'s: cancelThread on the session cancels it', async (t) => {
  const started = [];
  const host = createAgentToolsHost({ modules: [{ group: 'demo', tools: [{ name: 'wait', description: 'w', inputSchema: { type: 'object', properties: {} },
    handler: (_args, ctx) => new Promise((resolve) => { started.push(ctx); ctx.signal.addEventListener('abort', () => resolve('aborted'), { once: true }); }) }] }],
    tmpRoot: tmp('host-'), logger: { warn() {}, log() {} }, resolveSession: (id) => (id === 'root' ? { id, cwd: '/work' } : null) });
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'root' });
  t.after(() => server.child.kill());
  await server.request('initialize', {});
  const call = server.request('tools/call', { name: 'wait', arguments: {} });
  await until(() => started.length === 1);
  assert.deepEqual([started[0].call.thread, started[0].call.subAgent], [null, false]);
  assert.equal(host.cancelThread('other'), 0);
  assert.equal(host.cancelThread('root'), 1);
  await call;
});

test('an app card that outlives the turn (a sub-agent\'s, a background agent\'s) is not expired by turn/completed', async () => {
  const { CodexClient } = require('../electron/codex.cjs');
  const client = new CodexClient({ binary: '/nonexistent' });
  client.on('event', () => {});
  client.connection = { approvalConnectionId: 'conn-1', approvalConnectionEpoch: 1, closed: false };
  client.approvalLedger.activate(client.connection);
  const params = (itemId) => ({ threadId: 't1', turnId: 'turn-1', itemId, codeDesktop: { agentTool: { kind: 'terminal-command' } } });
  const own = client.localApproval('item/commandExecution/requestApproval', params('own'));
  const controller = new AbortController();
  const background = client.localApproval('item/commandExecution/requestApproval', params('background'), { signal: controller.signal, outlivesTurn: true });
  client.receive({ method: 'turn/completed', params: { threadId: 't1', turn: { id: 'turn-1', status: 'completed' } } }, client.connection);
  assert.equal(await own, null, 'the turn\'s own card expires with it');
  assert.equal(client.approvalLedger.snapshot().pending.length, 1, 'the background card stays');
  controller.abort();
  assert.equal(await background, null, 'its own signal closes it');
});

test('which cores defer the long app tool groups, keep background agents, and map Gemini\'s workflow tiers', async () => {
  const { coreCapabilities } = await import('../electron/core-registry.mjs');
  for (const id of ['deepseek-harness', 'opencode', 'mimo']) assert.equal(coreCapabilities({ engine: id }).deferAppTools, true, id);
  for (const id of ['codex', 'zcode', 'kimi', 'qwen', 'gemini', 'minimax']) assert.notEqual(coreCapabilities({ engine: id }).deferAppTools, true, id);
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /deferAppTools === true/);
  assert.doesNotMatch(main, /id === "opencode" \|\| id === "mimo"/);
  // A normal turn end cancels nothing on a core that keeps background agents (every core but a native one).
  assert.match(main, /return typeof reported === "boolean" \? reported : kind !== "native";/);
  assert.match(main, /else if \(!coreKeepsBackgroundAgents\(\)\) agentTools\.cancelThread\(e\.params\.threadId, "The turn ended\."\)/);
  const { resolveModel } = await import('../third-party/codex-workflows-runner/src/modelMap.js');
  const { default: gemini } = await import('../electron/cores/gemini.mjs');
  const ids = ['auto', 'gemini-3.1-pro-preview-customtools', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const context = { tiers: gemini.workflowModelTiers, sessionModel: 'gemini-2.5-pro' };
  assert.equal(resolveModel('opus', ids, () => {}, context), 'gemini-3.1-pro-preview-customtools');
  assert.equal(resolveModel('haiku', ids, () => {}, context), 'gemini-3.5-flash-lite');
  assert.equal(resolveModel('claude-haiku-4-5', ['auto', 'gemini-2.5-pro', 'gemini-2.5-flash'], () => {}, context), 'gemini-2.5-flash');
  for (const tier of ['opus', 'sonnet', 'haiku']) assert.notEqual(resolveModel(tier, ids, () => {}, context), 'auto', tier);
  const { validatePack } = require('../electron/extension-packs.cjs');
  assert.equal(typeof validatePack, 'function');
});

test('a window that never moved still saves its frame on close when it has no frame file yet', () => {
  const dir = tmp('ws-'), file = path.join(dir, 'window-state-w-abc.json');
  const listeners = new Map();
  const win = { isDestroyed: () => false, isMinimized: () => false, isMaximized: () => false, isFullScreen: () => false, getBounds: () => ({ x: 146, y: 38, width: 1200, height: 800 }),
    on: (name, fn) => listeners.set(name, fn), removeListener() {} };
  const screen = { getDisplayMatching: () => ({ bounds: { x: 0, y: 0, width: 1728, height: 1117 } }), getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1728, height: 1117 } }) };
  trackWindowState(win, { file, screen, state: { x: 146, y: 38, width: 1200, height: 800, isMaximized: false, isFullScreen: false }, timers: { setTimeout: () => 0, clearTimeout() {} } });
  listeners.get('close')();
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).x, 146);
  // Once the file exists, an unchanged frame isn't written again.
  fs.writeFileSync(file, '{"marker":true}');
  trackWindowState(win, { file, screen, state: { x: 146, y: 38, width: 1200, height: 800, isMaximized: false, isFullScreen: false }, timers: { setTimeout: () => 0, clearTimeout() {} } });
  listeners.get('close')();
  assert.equal(fs.readFileSync(file, 'utf8'), '{"marker":true}');
});

test('pane windows open at a quit are saved and taken once at the next launch, for sessions that still exist', () => {
  const dir = tmp('popouts-'), file = path.join(dir, popoutRestore.POPOUTS_FILE);
  const kinds = new Set(['files', 'changes', 'plan']);
  assert.equal(popoutRestore.savePopouts(file, [
    { sessionId: 's1', pane: 'files', alwaysOnTop: true, bounds: { x: 477.4, y: 104, width: 640, height: 640 }, displayBounds: { x: 0, y: 0, width: 1728, height: 1117 }, ownerKey: 'main' },
    { sessionId: 's1', pane: 'files', bounds: { x: 1, y: 1, width: 10, height: 10 } },
    { sessionId: 'gone', pane: 'changes', bounds: { x: 0, y: 0, width: 640, height: 640 } },
    { sessionId: 's2', pane: 'terminal', bounds: { x: 0, y: 0, width: 640, height: 640 } },
    { sessionId: 's2', pane: 'plan', bounds: null },
  ], { kinds }), true);
  const list = popoutRestore.takeRestorablePopouts(file, { kinds, exists: (id) => id !== 'gone' });
  assert.deepEqual(list, [{ sessionId: 's1', pane: 'files', alwaysOnTop: true, bounds: { x: 477, y: 104, width: 640, height: 640 }, displayBounds: { x: 0, y: 0, width: 1728, height: 1117 }, ownerKey: 'main' }]);
  assert.equal(fs.existsSync(file), false, 'taken once');
  assert.deepEqual(popoutRestore.takeRestorablePopouts(file, { kinds }), []);
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /onStart: \(\) => \{ quitting = true; try \{ savePopoutsForRelaunch\(\); \}/);
  assert.match(main, /void restorePopouts\(\)/);
});

test('ultracode turned off after a relaunch still tells the model, from the stored reminder state', async () => {
  const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
  const { ULTRACODE_FULL, ULTRACODE_EXIT } = await import('../electron/workflow-reminders.mjs');
  const root = tmp('wf-rem-'), stored = new Map();
  const config = { threadIds: ['t1'], cwd: root, model: 'm' };
  const make = () => createWorkflowToolService({ workflowService: {}, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home: root,
    updateConfig() {}, requestApproval: async () => true, startTurn: async () => {}, reminderStore: { get: (id) => stored.get(id), set: (id, state) => stored.set(id, state) } });
  const turn = (text) => ({ threadId: 't1', input: [{ type: 'text', text }], model: 'm', cwd: root });
  const reminders = (params) => params.input.slice(1).map((part) => part.text).join('\n');
  const first = await make().turnStart(turn('audit everything'), { ultracode: true });
  assert.ok(reminders(first).includes(ULTRACODE_FULL));
  assert.equal(stored.get('t1').entered, true);
  // A relaunch: a new service, the same store.
  const off = await make().turnStart(turn('rename this variable'), { ultracode: false });
  assert.ok(reminders(off).includes(ULTRACODE_EXIT), reminders(off));
  assert.equal(stored.get('t1').entered, false);
});

test('a steered or queued message is the request a workflow relays (and its budget); a delivered prompt is not', async () => {
  const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
  const root = tmp('wf-prov-'), started = [];
  const config = { threadIds: ['t1'], cwd: root, model: 'm' };
  const workflowService = { start: async (params) => { started.push(params); return { id: params.runId, transcriptDir: path.join(root, 'runs', params.runId) }; } };
  const service = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home: root,
    updateConfig() {}, requestApproval: async () => ({ approved: true }), startTurn: async () => {} });
  const script = 'export const meta={name:"Audit",description:"one agent"};\nreturn await agent("x")';
  const launch = async () => { await service.launch({ script }, { sessionId: 't1', cwd: root }); return started.at(-1); };
  await service.turnStart({ threadId: 't1', input: [{ type: 'text', text: 'audit the whole repo +2m' }], model: 'm', cwd: root, sandboxPolicy: { type: 'workspaceWrite' } }, { permission: 'auto', mode: 'code' });
  assert.equal((await launch()).budgetTotal, 2000000);
  // Steered mid-turn: the steer is the latest request, with no budget of its own.
  await service.userInput('t1', [{ type: 'text', text: 'actually only the auth module' }, { type: 'text', text: '<system-reminder>\nultracode\n</system-reminder>' }]);
  let run = await launch();
  assert.equal(run.userRequest, 'actually only the auth module');
  assert.equal(run.budgetTotal, undefined);
  // A queued message the core starts as a turn by itself: taken from that turn's user message item.
  service.observe({ method: 'turn/started', params: { threadId: 't1', turn: { id: 'q' } } });
  service.observe({ method: 'item/started', params: { threadId: 't1', item: { type: 'userMessage', id: 'u', content: [{ type: 'text', text: 'now the billing code +300k' }] } } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  run = await launch();
  assert.equal(run.userRequest, 'now the billing code +300k');
  assert.equal(run.budgetTotal, 300000);
  service.observe({ method: 'turn/completed', params: { threadId: 't1', turn: { id: 'q' } } });
  // A scheduled prompt this service delivers shows as a user message too, but it isn't the user's.
  await service.notice('t1', { prompt: 'Run the dependency audit' });
  service.observe({ method: 'item/started', params: { threadId: 't1', item: { type: 'userMessage', id: 'v', content: [{ type: 'text', text: 'Run the dependency audit' }] } } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  run = await launch();
  assert.equal(run.userRequest, undefined, 'automated');
  fs.rmSync(root, { recursive: true, force: true });
});

test('Export suggests the session title and the date, safe for a file name', () => {
  const day = new Date(2026, 9, 9);
  assert.equal(exportFileName({ name: 'Build script question' }, 'Conversation', day), 'Build script question 2026-10-09.md');
  assert.equal(exportFileName({ preview: 'fix a/b: "c"?\nnext line' }, 'Conversation', day), 'fix a b c next line 2026-10-09.md');
  assert.equal(exportFileName({ name: '  ...  ' }, '对话', day), '对话 2026-10-09.md');
  assert.equal([...exportFileName({ name: 'x'.repeat(300) }, 'C', day)].length, 80 + ' 2026-10-09.md'.length);
});

test('zh-CN calls a key 密钥 and an agent 智能体 (no bare English "key" / "agent" in values)', async () => {
  const { dictionary } = await import('../electron/i18n/index.mjs');
  const zh = typeof dictionary === 'function' ? dictionary('zh-CN') : (await import('../electron/i18n/zh-CN/index.mjs')).default;
  const bad = Object.entries(zh).filter(([, value]) => typeof value === 'string'
    && /(^|[^A-Za-z_.-])(key|keys|Key|Keys|agent|agents|Agent|Agents)(?![A-Za-z_])/.test(value.replace(/\{[^}]*\}/g, '').replace(/`[^`]*`/g, '')));
  assert.deepEqual(bad, []);
  assert.equal(zh['Save key'], '保存密钥');
  assert.equal(zh['Choose your agent'], '选择你的智能体');
  assert.equal(zh['Conversation'], '对话');
});
