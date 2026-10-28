// Cross-area fixes, round 3: Codex goals and Stop, workflow engine details (pause gate, journal lines, token target,
// provenance of automated turns, MiniMax model tiers, bridge tool switches), approvals (Chat mode, a dev server's env),
// the Bypass guide link and the Qwen saved-workflow folders.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = '../third-party/codex-workflows-runner/src/';
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

test('MiniMax ids are full models (mini only as its own word); a core tier map picks opus/sonnet/haiku', async () => {
  const { resolveModel, isLiteVariant, pickFrontier } = await import(R + 'modelMap.js');
  const ids = ['m:minimax:MiniMax-M3:v:', 'm:minimax:MiniMax-M3.1-Flash-Preview:v:', 'm:minimax:MiniMax-M2.7:u', 'm:custom_provider%3Alocal:plain-model:v:'];
  for (const id of ids) assert.equal(isLiteVariant(id), false, id);
  for (const id of ['gpt-5.4-mini', 'gpt-5.3-codex-spark', 'o4-mini']) assert.equal(isLiteVariant(id), true, id);
  // Without a tier map no tier lands on the custom provider any more.
  for (const tier of ['opus', 'sonnet', 'haiku']) assert.equal(resolveModel(tier, ids), 'm:minimax:MiniMax-M3:v:', tier);
  const { default: minimax } = await import('../electron/cores/minimax.mjs');
  const tiers = minimax.workflowModelTiers;
  assert.equal(resolveModel('opus', ids, () => {}, { tiers }), 'm:minimax:MiniMax-M3:v:');
  assert.equal(resolveModel('claude-sonnet-4-6', ids, () => {}, { tiers }), 'm:minimax:MiniMax-M3:v:');
  assert.equal(resolveModel('haiku', ids, () => {}, { tiers }), 'm:minimax:MiniMax-M3.1-Flash-Preview:v:');
  assert.equal(pickFrontier(['gpt-5.4-mini', 'gpt-5.4']), 'gpt-5.4');
  // A pack keeps the map (only valid patterns, known tiers).
  const { validatePack } = require('../electron/extension-packs.cjs');
  assert.equal(typeof validatePack, 'function');
});

test('a bridge core with per-tool switches removes WebFetch / Agent through codeDesktop.tools; others still refuse', async () => {
  const { narrowThreadParams, coreToolSwitches } = await import(R + 'toolNarrowing.js');
  const switches = { WebFetch: ['web_fetch'], WebSearch: ['web_search'], Agent: ['task'], Task: ['task'] };
  const bridge = { serverInfo: { userAgent: 'code-desktop-acp-bridge/1', capabilities: { workflowToolSwitches: switches } } };
  assert.deepEqual(coreToolSwitches(bridge), switches);
  const next = await narrowThreadParams(bridge, { cwd: '/w', sandbox: 'workspace-write' }, { disallowedTools: ['WebFetch', 'Agent'] });
  assert.deepEqual(next.codeDesktop.tools.disabled.sort(), ['task', 'web_fetch']);
  // An agent definition whose tools leave the web out turns the web tools off there too.
  const allow = await narrowThreadParams(bridge, { cwd: '/w', sandbox: 'workspace-write' }, { allowedTools: ['Read', 'Bash'] });
  assert.deepEqual(allow.codeDesktop.tools.disabled.sort(), ['web_fetch', 'web_search']);
  const plain = { serverInfo: { userAgent: 'code-desktop-acp-bridge/1', capabilities: {} } };
  await assert.rejects(narrowThreadParams(plain, { cwd: '/w' }, { disallowedTools: ['WebFetch'] }), /can't remove WebFetch/);
  // The MiniMax adapter declares them, and its workflow agents go without mcode's own sub-agents.
  const { default: adapter } = await import('../../harness/packages/acp-bridge/src/agents/minimax.js');
  assert.deepEqual(adapter.workflowAgentDisabledTools, ['task']);
  assert.deepEqual(adapter.workflowToolSwitches, switches);
});

test('journal lines carry Claude’s type (started | result | failed) beside outcome, and still load', async () => {
  const { Journal } = await import(R + 'journal.js');
  const dir = tmp('cd-journal-'), file = path.join(dir, 'journal.jsonl');
  try {
    const journal = new Journal(file);
    await journal.started('v4:a', 'A');
    await journal.record('v4:a', 'A', 'done');
    await journal.record('v4:b', 'B', null);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(lines.map((line) => [line.type, line.outcome]), [['started', 'started'], ['result', 'completed'], ['failed', 'failed']]);
    assert.equal(Object.keys(lines[1])[0], 'type');
    const again = new Journal(file, { reuse: true });
    await again.load();
    assert.equal(again.hit(again.nextKey('x', {})), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the user’s "+500k" directive is the token target; the cap error explains the unbounded loop', async () => {
  const { turnTokenTarget, workflowToolDescription } = await import('../electron/workflow-tool-model.mjs');
  assert.equal(turnTokenTarget('audit the repo +500k'), 500000);
  assert.equal(turnTokenTarget('+1.5m please'), 1500000);
  assert.equal(turnTokenTarget('use +200k, no wait (+300k)'), 300000);
  for (const text of ['a+500k', 'version 1+2k3', 'plain text', '', null]) assert.equal(turnTokenTarget(text), null, String(text));
  assert.match(workflowToolDescription(), /total is the token target of the user's "\+500k"-style directive/);
  assert.match(workflowToolDescription(), /throws for an unknown agentType/);
  const runtime = fs.readFileSync(new URL(R + 'runtime.js', import.meta.url), 'utf8');
  assert.match(runtime, /Workflow agent\(\) call cap reached \(\$\{AGENT_CAP\}\)\. This usually means a loop/);
});

test('a workflow started by a scheduled prompt relays no earlier typed message; the typed turn’s token target is its budget', async () => {
  const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
  const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
  const root = tmp('cd-wf-prov-'), started = [];
  const config = { threadIds: ['t1'], cwd: root, model: 'm' };
  const workflowService = { start: async (params) => { started.push(params); return { id: params.runId, transcriptDir: path.join(root, 'runs', params.runId) }; } };
  const service = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home: root,
    updateConfig() {}, requestApproval: async () => ({ approved: true }), startTurn: async () => {} });
  const script = 'export const meta={name:"Audit",description:"one agent"};\nreturn await agent("x")';
  try {
    await service.turnStart({ threadId: 't1', input: [{ type: 'text', text: 'never touch package.json +300k' }], model: 'm', cwd: root, sandboxPolicy: { type: 'workspaceWrite' } }, { permission: 'auto', mode: 'code' });
    await service.launch({ script }, { sessionId: 't1', cwd: root });
    assert.equal(started[0].userRequest, 'never touch package.json +300k');
    assert.equal(started[0].budgetTotal, 300000);
    service.observe({ method: 'turn/started', params: { threadId: 't1', turn: { id: 'a' } } });
    service.observe({ method: 'turn/completed', params: { threadId: 't1', turn: { id: 'a' } } });
    await service.notice('t1', { prompt: 'Run the dependency audit' });
    await service.launch({ script }, { sessionId: 't1', cwd: root });
    assert.equal(started[1].userRequest, undefined, 'automated: no stale human request');
    assert.equal(started[1].budgetTotal, undefined);
    await service.turnStart({ threadId: 't1', input: [{ type: 'text', text: 'and again' }], model: 'm', cwd: root, sandboxPolicy: { type: 'workspaceWrite' } }, { permission: 'auto', mode: 'code' });
    await service.launch({ script }, { sessionId: 't1', cwd: root });
    assert.equal(started[2].userRequest, 'and again');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a shared budget that failed to set up is set up again by the next launch', async () => {
  const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
  const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
  const root = tmp('cd-wf-pool-'), started = [];
  const config = { threadIds: ['t1'], cwd: root, model: 'm' };
  const workflowService = { start: async (params) => { started.push(params); return { id: params.runId, transcriptDir: path.join(root, 'runs', params.runId) }; } };
  const service = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home: root,
    updateConfig() {}, requestApproval: async () => ({ approved: true }), startTurn: async () => {} });
  const script = 'export const meta={name:"Audit",description:"one agent"};\nreturn await agent("x")';
  const budgets = path.join(root, 'sessions', 't1', 'workflows', 'budgets');
  try {
    await service.turnStart({ threadId: 't1', input: [{ type: 'text', text: 'audit it +300k' }], model: 'm', cwd: root, sandboxPolicy: { type: 'workspaceWrite' } }, { permission: 'auto', mode: 'code' });
    // The budgets folder can't be made (a file in its place, like a full disk): this launch fails…
    fs.mkdirSync(path.dirname(budgets), { recursive: true });
    fs.writeFileSync(budgets, '');
    await assert.rejects(service.launch({ script }, { sessionId: 't1', cwd: root }));
    // …and once it can, the next one runs with the budget.
    fs.rmSync(budgets);
    await service.launch({ script }, { sessionId: 't1', cwd: root });
    assert.equal(started.at(-1).budgetTotal, 300000);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('pausing a run holds an agent already queued for a slot until Resume', { timeout: 60000 }, async () => {
  const dir = tmp('cd-wf-pause-'), cwd = path.join(dir, 'ws'), home = path.join(dir, 'home');
  fs.mkdirSync(cwd, { recursive: true }); fs.mkdirSync(home, { recursive: true }); fs.mkdirSync(path.join(dir, 'run'));
  const env = { PATH: process.env.PATH, HOME: home, CODEX_HOME: path.join(home, '.codex'), CODE_DESKTOP_WORKFLOW_RUNNER: '1', CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: '0', CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS: '1' };
  const source = 'export const meta={name:"p",description:"pause"};\nreturn await parallel([()=>agent("GUI",{label:"a1"}),()=>agent("GUI",{label:"a2"})]);';
  const child = fork(path.resolve(import.meta.dirname, '../electron/workflow-child.mjs'), [], { cwd, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env });
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data; });
  const events = [], t0 = Date.now();
  let resumedAt = null;
  const finished = new Promise((resolve) => child.on('exit', resolve));
  child.on('message', (message) => { const event = message?.event ?? message; if (event?.type) events.push({ type: event.type, label: event.label, at: Date.now() - t0 }); });
  try {
    child.send({ directory: path.join(dir, 'run'), source, cwd, plan: false, access: 'read-only', resume: false, model: 'fixture', command: path.resolve(import.meta.dirname, 'fixtures/workflow-server.cjs'), version: 't', runId: 'wf_pausetest1', workflowScripts: false });
    for (let i = 0; i < 200 && !events.some((event) => event.type === 'start'); i++) await new Promise((resolve) => setTimeout(resolve, 25));
    child.send({ control: 'pause', paused: true });
    for (let i = 0; i < 400 && !events.some((event) => event.type === 'end'); i++) await new Promise((resolve) => setTimeout(resolve, 25));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(events.filter((event) => event.type === 'start').length, 1, 'a2 waits while paused');
    resumedAt = Date.now() - t0;
    child.send({ control: 'pause', paused: false });
    await finished;
    const second = events.filter((event) => event.type === 'start')[1];
    assert.ok(second && second.at >= resumedAt, 'a2 starts only after Resume');
    assert.ok(events.some((event) => event.type === 'result'));
  } catch (error) { error.message += `\n${stderr.slice(-2000)}\n${JSON.stringify(events)}`; throw error; }
  finally { child.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('Qwen’s .qwen/workflows join the saved workflows (its folder first) and Save writes there', async () => {
  const tool = await import('../electron/workflow-tool-model.mjs');
  const root = tmp('cd-qwen-wf-'), home = path.join(root, 'home'), repo = path.join(root, 'repo');
  try {
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repo, '.qwen', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(repo, '.claude', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(home, '.qwen', 'workflows'), { recursive: true });
    const script = (name, description) => `export const meta = { name: '${name}', description: '${description}' };\nreturn 1;\n`;
    fs.writeFileSync(path.join(repo, '.qwen', 'workflows', 'release-check.js'), script('release-check', 'qwen copy'));
    fs.writeFileSync(path.join(repo, '.claude', 'workflows', 'release-check.js'), script('release-check', 'claude copy'));
    fs.writeFileSync(path.join(home, '.qwen', 'workflows', 'mine.js'), script('mine', 'user qwen'));
    const { qwen } = { qwen: (await import('../electron/cores/qwen.mjs')).default };
    const folders = qwen.workflowFolders;
    const found = tool.savedWorkflows({ cwd: repo, home, folders }).workflows;
    assert.deepEqual(found.map((entry) => [entry.name, entry.description]), [['mine', 'user qwen'], ['release-check', 'qwen copy']]);
    assert.equal(tool.findSavedWorkflow({ cwd: repo, home, name: 'release-check' }).workflow.description, 'claude copy', 'other cores keep .claude/workflows only');
    assert.equal(tool.saveWorkflowTarget({ scope: 'project', cwd: repo, home, name: 'New One', folders }).file, path.join(repo, '.qwen', 'workflows', 'new-one.js'));
    assert.equal(tool.saveWorkflowTarget({ scope: 'user', cwd: repo, home, name: 'x', folders }).file, path.join(home, '.qwen', 'workflows', 'x.js'));
    assert.deepEqual(tool.workflowFolders(['../evil', '.qwen/workflows']), ['.qwen/workflows', '.claude/workflows']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('a dev server’s launch.json env is shown on the approval, with a warning for variables that change what runs', async () => {
  const { launchEnvSummary, approvalCopy } = require('../electron/agent-tool-approval.cjs');
  const env = { PATH: '/p/.bin:/usr/bin', NODE_OPTIONS: '--require ./x.js', PORT: '5173', DYLD_INSERT_LIBRARIES: '/x.dylib' };
  const summary = launchEnvSummary(env);
  assert.deepEqual(summary.lines, ['PATH=/p/.bin:/usr/bin', 'NODE_OPTIONS=--require ./x.js', 'PORT=5173', 'DYLD_INSERT_LIBRARIES=/x.dylib']);
  assert.deepEqual(summary.risky, ['PATH', 'NODE_OPTIONS', 'DYLD_INSERT_LIBRARIES']);
  assert.deepEqual(launchEnvSummary({ PORT: '1' }).risky, []);
  const i18n = await import('../electron/i18n/index.mjs');
  const copy = approvalCopy({ kind: 'preview-server', name: 'dev', command: 'npm', args: ['run', 'dev'], cwd: '/proj', env }, { t: i18n.t, assistant: 'Codex' });
  assert.match(copy.detail, /With these environment variables:\nPATH=\/p\/\.bin:\/usr\/bin/);
  assert.match(copy.detail, /Warning: PATH, NODE_OPTIONS, DYLD_INSERT_LIBRARIES can make it run a different program/);
  const { approvalCardModel } = await import('../src/approval-card-model.mjs');
  const model = approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', turnId: '', itemId: 'i', command: 'npm run dev', cwd: '/proj',
    codeDesktop: { agentTool: { kind: 'preview-server', name: 'dev', env: summary.lines, envMore: 0, envRisky: summary.risky } } } });
  assert.ok(model.context.some((part) => part.key === 'env' && part.text.includes('NODE_OPTIONS=--require ./x.js')));
  assert.ok(model.context.some((part) => part.key === 'env-warning' && /PATH, NODE_OPTIONS/.test(part.text)));
});

test('the Bypass dialog links the running core’s own guidance, never Claude Code’s page', async () => {
  const source = fs.readFileSync(new URL('../src/source-bypass-permission.jsx', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('export function bypassGuide'), source.indexOf('// The opt-in is a local preference'));
  const bypassGuide = new Function(`${body.replace('export function', 'return function')}`)();
  const { default: gemini } = await import('../electron/cores/gemini.mjs');
  const { default: kimi } = await import('../electron/cores/kimi.mjs');
  assert.deepEqual(bypassGuide(gemini), { url: gemini.securityUrl, name: gemini.name, label: 'security guide' });
  assert.deepEqual(bypassGuide(kimi), { url: kimi.homepage, name: kimi.name, label: 'documentation' });
  assert.equal(bypassGuide({ name: 'x' }), null);
  assert.doesNotMatch(source, /url: SECURITY_GUIDE_URL/);
});

test('Stop sends the goal pause to the core; quitting pauses working goals on a native core; pause/clear never resume first', () => {
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(main, /nativeGoals && state\.goals\?\.\[request\.threadId\]\?\.status === "active" \? \{ pauseGoal: true \}/);
  assert.match(main, /if \(patch\?\.status === "active"\) await ensureResumed\(threadId\);/);
  const electron = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(electron, /await pauseActiveGoals\(\)\.catch\(\(\) => \{\}\);\n    await Promise\.all\(\[stopAllCodexClients\(\)/);
  // A core whose agents keep background sub-agents (every core but a native one, round 4: DeepSeek too) leaves their
  // tool calls alone at a normal turn end; a stopped turn cancels the calls of the thread whose turn it was.
  assert.match(electron, /if \(interrupted\) agentTools\.cancelThread\(e\.params\.threadId, "The turn was stopped\."\);\n    else if \(!coreKeepsBackgroundAgents\(\)\) agentTools\.cancelThread/);
});

test('an invalid tool call reads as a failed use of the attempted tool; the transcript link item is “Open in Preview”', async () => {
  const { genericToolLabel } = await import('../src/generic-tool-model.mjs');
  const item = { type: 'dynamicToolCall', id: 'x', namespace: null, tool: 'frobnicate', status: 'failed', success: false, codeDesktop: { invalidTool: true } };
  assert.deepEqual(genericToolLabel(item, 'failed'), { label: 'Couldn’t use frobnicate', meta: null });
  const i18n = await import('../electron/i18n/index.mjs');
  try { i18n.setLocale('zh-CN'); assert.equal(genericToolLabel(item, 'failed').label, '无法使用 frobnicate'); } finally { i18n.setLocale('en-US'); }
  const menu = fs.readFileSync(new URL('../src/transcript-context-menu-model.mjs', import.meta.url), 'utf8');
  assert.match(menu, /t\("Open in Preview"\)/);
});
