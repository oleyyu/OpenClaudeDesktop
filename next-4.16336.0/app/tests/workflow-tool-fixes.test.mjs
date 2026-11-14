// The model's Workflow tool: Claude Code 2.1.280's permission order, a user stop that tells the model nothing, resume
// that continues the same run (any model / effort / Mode), the determinism check on every inline script, a stopped
// turn that closes the approval sheet and starts nothing, and the ultracode reminders naming the engine's own tool.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createWorkflowService } = require('../electron/workflow-service.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
const { resolveWorkflowSettings, workflowPermission, workflowRunnerEnv } = await import('../electron/prefs/workflow-settings.mjs');
const reminders = await import('../electron/workflow-reminders.mjs');
const FIXTURE = path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function harness({ approval = async () => ({ approved: true, always: false }), config: extra = {}, workflowTool } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-fix-')), cwd = path.join(root, 'project'), home = path.join(root, 'home');
  await fs.mkdir(cwd, { recursive: true }); await fs.mkdir(home, { recursive: true });
  let config = { threadIds: ['thread-1'], cwd, model: 'fixture', ...extra };
  const turns = [], approvals = [], notifications = [];
  let toolService;
  const workflowService = createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => config, emit() {}, version: 'test', home,
    core: () => ({ command: process.execPath, args: [FIXTURE] }), enabled: () => true, runnerEnv: () => ({ CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: '0' }),
    onSettled: (run) => { void toolService.settled(run); } });
  toolService = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home,
    updateConfig: (patch) => { config = { ...config, ...patch }; },
    requestApproval: async (session, request, options = {}) => { approvals.push({ request, options }); return approval(request, options); },
    notify: (run) => notifications.push(run.status), workflowTool,
    startTurn: async (threadId, params) => { turns.push({ threadId, params }); } });
  const turn = async ({ permission = 'auto', sandbox = 'workspaceWrite', effort = 'medium', model = 'fixture', ultracode = false, keyword = false } = {}) => {
    const params = { threadId: 'thread-1', input: [{ type: 'text', text: 'hi' }], model, effort, cwd, sandboxPolicy: { type: sandbox } };
    await toolService.turnStart(params, { permission, mode: 'code', ultracode, keyword });
    toolService.observe({ method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'x' } } });
    return params;
  };
  const idle = () => toolService.observe({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'x' } } });
  const settledRun = async (id) => { for (let i = 0; i < 400; i++) { const run = workflowService.get(id); if (run && run.status !== 'running') return run; await sleep(25); } return workflowService.get(id); };
  const cleanup = async () => { await workflowService.dispose(); await fs.rm(root, { recursive: true, force: true }); };
  return { root, cwd, home, workflowService, toolService, turns, approvals, notifications, turn, idle, settledRun, cleanup, get config() { return config; } };
}
const SCRIPT = (body = 'return await agent("FAST")', name = 'demo') => `export const meta={name:"${name}",description:"Demo ${name}"};\n${body}`;
const runIdOf = (text) => text.match(/\nRun ID: (wf_[0-9a-z-]+)\n/)[1];

test('permission order (Claude): any deny blocks, any ask asks even in Bypass, then Bypass, then a bare allow covers inline scripts', () => {
  assert.deepEqual(workflowPermission({ deny: ['Workflow'] }, null, { bypass: true }), { behavior: 'deny', toolWide: true });
  assert.deepEqual(workflowPermission({ deny: ['Workflow(deploy)'], allow: ['Workflow'] }, 'deploy'), { behavior: 'deny', toolWide: false });
  assert.deepEqual(workflowPermission({ deny: ['Workflow(deploy)'] }, null), { behavior: 'ask', toolWide: false }, 'a named rule never matches an inline script');
  assert.deepEqual(workflowPermission({ ask: ['Workflow(deploy)'] }, 'deploy', { bypass: true }), { behavior: 'ask', toolWide: false });
  assert.deepEqual(workflowPermission({ ask: ['Workflow'], allow: ['Workflow(deploy)'] }, 'deploy'), { behavior: 'ask', toolWide: true });
  assert.deepEqual(workflowPermission({}, null, { bypass: true }), { behavior: 'allow', toolWide: false });
  assert.deepEqual(workflowPermission({ allow: ['Workflow'] }, null), { behavior: 'allow', toolWide: true });
  assert.deepEqual(workflowPermission({ allow: ['Workflow(deploy)'] }, 'deploy'), { behavior: 'allow', toolWide: false });
  assert.deepEqual(workflowPermission({}, 'deploy'), { behavior: 'ask', toolWide: false });
});

test('rules reach the tool: a bare deny blocks inline scripts in Bypass, a named ask asks in Bypass, a bare allow skips the ask', async () => {
  const denied = await harness({ config: { workflowRules: { deny: ['Workflow'] } } });
  try {
    await denied.turn({ permission: 'bypass', sandbox: 'dangerFullAccess' });
    await assert.rejects(denied.toolService.launch({ script: SCRIPT() }, { sessionId: 'thread-1' }), /^Error: Permission to use Workflow has been denied\.$/);
    assert.equal((await denied.workflowService.list('thread-1')).length, 0);
  } finally { await denied.cleanup(); }
  const asked = await harness({ config: { workflowRules: { ask: ['Workflow(saved-one)'] } } });
  try {
    await fs.mkdir(path.join(asked.cwd, '.claude/workflows'), { recursive: true });
    await fs.writeFile(path.join(asked.cwd, '.claude/workflows/saved-one.js'), SCRIPT('return await agent("FAST")', 'saved-one'));
    await asked.turn({ permission: 'bypass', sandbox: 'dangerFullAccess' });
    await asked.toolService.launch({ name: 'saved-one' }, { sessionId: 'thread-1' });
    assert.equal(asked.approvals.length, 1, 'a Workflow(name) ask rule asks even in Bypass');
  } finally { await asked.cleanup(); }
  const allowed = await harness({ config: { workflowRules: { allow: ['Workflow'] } } });
  try {
    await allowed.turn();
    await allowed.toolService.launch({ script: SCRIPT() }, { sessionId: 'thread-1' });
    assert.equal(allowed.approvals.length, 0, 'a bare Workflow allow covers inline scripts');
  } finally { await allowed.cleanup(); }
});

test('inline scripts are always checked; name and scriptPath run their own script, never an inline one beside them', async () => {
  const h = await harness({ config: { workflowRules: { allow: ['Workflow(saved-one)'] } } });
  try {
    await fs.mkdir(path.join(h.cwd, '.claude/workflows'), { recursive: true });
    await fs.writeFile(path.join(h.cwd, '.claude/workflows/saved-one.js'), SCRIPT('return await agent("FAST")', 'saved-one'));
    await h.turn();
    await assert.rejects(h.toolService.launch({ name: 'saved-one', script: SCRIPT('return Date.now()') }, { sessionId: 'thread-1' }), /must be deterministic/);
    const file = path.join(h.cwd, 'edited.js');
    await fs.writeFile(file, SCRIPT('return await agent("FAST")', 'file'));
    await assert.rejects(h.toolService.launch({ scriptPath: file, script: SCRIPT('return Math.random()') }, { sessionId: 'thread-1' }), /must be deterministic/);
    // An allow rule for a saved workflow runs that workflow's script, not one sent beside its name.
    const text = await h.toolService.launch({ name: 'saved-one', script: SCRIPT('return await agent("OTHER")', 'impostor') }, { sessionId: 'thread-1' });
    assert.equal(h.approvals.length, 0);
    assert.match(text, /\nSummary: Demo saved-one\n/);
  } finally { await h.cleanup(); }
});

test('a workflow the user stops starts no turn for the model; the OS notice stays', async () => {
  const h = await harness();
  try {
    await h.turn();
    const text = await h.toolService.launch({ script: SCRIPT('return await agent("WAIT")', 'waits') }, { sessionId: 'thread-1' });
    h.idle();
    await sleep(300);
    await h.workflowService.stop(runIdOf(text));
    await h.settledRun(runIdOf(text));
    await sleep(300);
    assert.deepEqual(h.notifications, ['stopped'], 'the OS notice is kept');
    assert.equal(h.turns.length, 0, 'no new turn tells the model it was stopped');
    assert.deepEqual(h.toolService.pendingFor('thread-1'), []);
  } finally { await h.cleanup(); }
});

test('resume continues the same run after a model, effort or Mode change; a run with no journal says so', async () => {
  const h = await harness();
  try {
    await h.turn({ effort: 'medium' });
    const first = await h.toolService.launch({ script: SCRIPT() }, { sessionId: 'thread-1' });
    const runId = runIdOf(first);
    assert.equal((await h.settledRun(runId)).status, 'completed');
    h.idle();
    await h.turn({ effort: 'high', model: 'other', permission: 'acceptEdits' });
    const scriptPath = first.match(/\nScript file: (.+)\n/)[1];
    const resumed = await h.toolService.launch({ scriptPath, resumeFromRunId: runId }, { sessionId: 'thread-1' });
    assert.equal(runIdOf(resumed), runId, 'the same run id');
    const run = await h.settledRun(runId);
    assert.equal(run.status, 'completed');
    assert.equal(run.effort, 'high');
    assert.equal(run.transcriptDir, path.join(h.root, 'runs', runId), 'the same transcript folder');
    assert.equal((await h.workflowService.list('thread-1')).length, 1, 'one run, not a second row');
    await fs.rm(path.join(run.transcriptDir, 'journal.jsonl'));
    await assert.rejects(h.toolService.launch({ scriptPath, resumeFromRunId: runId }, { sessionId: 'thread-1' }),
      /^Error: No journal found for workflow run wf_[0-9a-z-]+, so there is nothing to resume\. To run the workflow from the start, call Workflow again without resumeFromRunId\.$/);
  } finally { await h.cleanup(); }
});

test('a stopped turn closes the Workflow approval and starts nothing', async () => {
  const controller = new AbortController();
  const h = await harness({ approval: async (_request, options) => { assert.equal(options.signal, controller.signal, 'the call\'s signal reaches the sheet'); controller.abort(); return { approved: true }; } });
  try {
    await h.turn();
    await assert.rejects(h.toolService.launch({ script: SCRIPT() }, { sessionId: 'thread-1', signal: controller.signal }), /The turn was stopped\. Nothing was run\./);
    assert.equal((await h.workflowService.list('thread-1')).length, 0);
    await assert.rejects(h.toolService.launch({ script: SCRIPT() }, { sessionId: 'thread-1', signal: controller.signal }), /The turn was stopped/);
    assert.equal(h.approvals.length, 1, 'an already stopped call asks nothing');
  } finally { await h.cleanup(); }
});

test('ultracode reminders name the engine\'s own workflow tool; OpenClaude Desktop\'s point at the Workflow tool description', async () => {
  const own = reminders.reminderTexts(null);
  assert.match(own.full, /Ultracode\*\* section and quality patterns in the Workflow tool description/);
  assert.doesNotMatch(Object.values(own).join('\n'), /authoring reference/);
  const zcode = reminders.reminderTexts({ engine: 'native', name: 'CreateWorkflow', skill: 'dynamic-workflows' });
  assert.match(zcode.keyword, /load the dynamic-workflows skill and use the CreateWorkflow tool/);
  for (const text of Object.values(zcode)) { assert.doesNotMatch(text, /\bthe Workflow tool|authoring reference/); }
  assert.match(reminders.reminderTexts({ engine: 'native' }).full, /your own dynamic-workflow tool/);
  const h = await harness({ workflowTool: () => ({ engine: 'native', name: 'workflow' }) });
  try {
    const params = await h.turn({ keyword: true, ultracode: true });
    const text = params.input.at(-1).text;
    assert.match(text, /use the workflow tool to run a dynamic workflow that fulfills the request/);
    assert.match(text, /Ultracode is on/);
    assert.doesNotMatch(text, /the Workflow tool/);
  } finally { await h.cleanup(); }
});

test('CLAUDE_CODE_SUBAGENT_MODEL_FORCE alone is reported and reaches the runner', () => {
  const resolved = resolveWorkflowSettings({ env: { CLAUDE_CODE_SUBAGENT_MODEL_FORCE: '1' } });
  assert.deepEqual({ value: resolved.subagentModel.value, force: resolved.subagentModel.force }, { value: null, force: true });
  assert.equal(workflowRunnerEnv(resolved).CLAUDE_CODE_SUBAGENT_MODEL_FORCE, '1');
  assert.equal(workflowRunnerEnv(resolved).CLAUDE_CODE_SUBAGENT_MODEL, undefined);
});
