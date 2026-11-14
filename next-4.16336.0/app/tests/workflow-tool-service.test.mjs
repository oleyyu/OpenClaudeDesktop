// The model's Workflow tool end to end on OpenClaude Desktop's engine: workflow-tool-service.cjs over the real
// workflow-service.cjs and workflow-child.mjs, with the isolated app-server fixture as the core. Covers launch
// (inline script persisted 0600 under the session's data, Claude's launch text), approvals (ask / always allow /
// Bypass / declined), the session's Mode for agents, the <task-notification> delivered back to the model once the
// session is idle, and the JSON fallback on a core without structured output.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createWorkflowService } = require('../electron/workflow-service.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
const FIXTURE = path.resolve(import.meta.dirname, 'fixtures/workflow-runner-server.cjs');

async function harness({ structuredOutput, approval = async () => ({ approved: true, always: false }), config: extra = {} } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-tool-')), cwd = path.join(root, 'project'), home = path.join(root, 'home');
  await fs.mkdir(cwd, { recursive: true }); await fs.mkdir(home, { recursive: true });
  let config = { threadIds: ['thread-1'], cwd, model: 'fixture', ...extra };
  const turns = [], approvals = [], notifications = [];
  let toolService;
  const workflowService = createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => config, emit() {}, version: 'test', home,
    core: () => ({ command: process.execPath, args: [FIXTURE] }), enabled: () => true, runnerEnv: () => ({ CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: '0' }),
    onSettled: (run) => { void toolService.settled(run); } });
  toolService = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home,
    updateConfig: (patch) => { config = { ...config, ...patch }; },
    requestApproval: async (session, request) => { approvals.push(request); return approval(request); },
    core: () => ({ structuredOutput }),
    notify: (run) => notifications.push(run.status),
    startTurn: async (threadId, params) => { turns.push({ threadId, params }); } });
  const turn = async (permission = 'auto', sandbox = 'workspaceWrite') => {
    const params = { threadId: 'thread-1', input: [{ type: 'text', text: 'hi' }], model: 'fixture', cwd, sandboxPolicy: { type: sandbox } };
    await toolService.turnStart(params, { permission, mode: 'code' });
    toolService.observe({ method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'x' } } });
    return params;
  };
  const idle = () => toolService.observe({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'x' } } });
  const done = async () => { for (let i = 0; i < 400 && !turns.length; i++) await new Promise((resolve) => setTimeout(resolve, 25)); return turns[0]; };
  const cleanup = async () => { await workflowService.dispose(); await fs.rm(root, { recursive: true, force: true }); };
  return { root, cwd, home, workflowService, toolService, turns, approvals, notifications, turn, idle, done, cleanup, get config() { return config; } };
}

test('launch: inline script → approval → background run; Claude\'s launch text; the notification reaches the model once idle', async () => {
  const h = await harness();
  try {
    await h.turn('auto');
    const text = await h.toolService.launch({ script: 'export const meta={name:"Demo Run",description:"Run one agent",phases:[{title:"Go"}]};\nphase("Go"); return await agent("FAST")', args: { n: 1 } }, { sessionId: 'thread-1', cwd: h.cwd });
    const [, taskId] = text.match(/^Workflow launched in background\. Task ID: (w[0-9a-z]{8})\n/);
    assert.ok(taskId);
    const scriptPath = text.match(/\nScript file: (.+)\n/)[1], runId = text.match(/\nRun ID: (wf_[0-9a-f-]{12})\n/)[1];
    assert.equal(scriptPath, path.join(h.root, 'sessions', 'thread-1', 'workflows', 'scripts', `demo-run-${runId}.js`));
    assert.equal((await fs.stat(scriptPath)).mode & 0o777, 0o600);
    assert.match(text, /\nSummary: Run one agent\nTranscript dir: /);
    assert.deepEqual(h.approvals.map((request) => [request.kind, request.description, request.phases[0].title, request.always]), [['workflow', 'Run one agent', 'Go', false]]);
    // The session is mid-turn: nothing is delivered until it is idle.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.equal(h.turns.length, 0);
    const run = (await h.workflowService.list('thread-1'))[0];
    assert.equal(run.origin, 'tool'); assert.equal(run.access, 'workspace-write'); assert.equal(run.id, runId); assert.equal(run.taskId, taskId);
    h.idle();
    const delivered = await h.done();
    assert.ok(delivered, 'delivered');
    const message = delivered.params.input[0].text;
    assert.match(message, /^<system-reminder>\n\[SYSTEM NOTIFICATION - NOT USER INPUT\]/);
    assert.match(message, new RegExp(`<task-id>${taskId}</task-id>`));
    assert.match(message, /<status>completed<\/status>\n<summary>Dynamic workflow "Run one agent" completed<\/summary>\n<result>"fixture result"<\/result>/);
    assert.match(message, /<usage><agent_count>1<\/agent_count><agents_done>1<\/agents_done>/);
    assert.equal(delivered.params.model, 'fixture'); assert.equal(delivered.params.sandboxPolicy.type, 'workspaceWrite', 'the session\'s last turn options');
    assert.ok(!('codeDesktop' in delivered.params) || !('workflowTurn' in delivered.params.codeDesktop));
    assert.deepEqual(h.notifications, ['completed']);
  } finally { await h.cleanup(); }
});

test('approvals: declined cancels; Workflow(name) always-allow skips the next ask; deny rules block; Bypass never asks', async () => {
  const declined = await harness({ approval: async () => ({ approved: false }) });
  try {
    await declined.turn();
    await assert.rejects(declined.toolService.launch({ script: 'export const meta={name:"a",description:"b"};\nreturn 1' }, { sessionId: 'thread-1' }), /declined.*Dynamic workflow cancelled/);
    assert.deepEqual(await declined.workflowService.list('thread-1'), []);
  } finally { await declined.cleanup(); }
  const named = await harness({ approval: async () => ({ approved: true, always: true }) });
  try {
    await named.turn();
    await fs.mkdir(path.join(named.cwd, '.claude/workflows'), { recursive: true });
    await fs.writeFile(path.join(named.cwd, '.claude/workflows/s.js'), 'export const meta={name:"saved-one",description:"Saved"};\nreturn args');
    await named.toolService.launch({ name: 'saved-one', args: [1] }, { sessionId: 'thread-1' });
    assert.deepEqual(named.config.workflowRules, { allow: ['saved-one'], ask: [], deny: [] });
    await named.toolService.launch({ name: 'saved-one' }, { sessionId: 'thread-1' });
    assert.equal(named.approvals.length, 1, 'always allowed');
    assert.equal(named.approvals[0].name, 'saved-one'); assert.equal(named.approvals[0].always, true);
    await assert.rejects(named.toolService.launch({ name: 'missing' }, { sessionId: 'thread-1' }), /Workflow "missing" not found\. Available: saved-one/);
  } finally { await named.cleanup(); }
  const denied = await harness({ config: { workflowRules: { deny: ['Workflow(blocked)'] } } });
  try {
    await denied.turn();
    await fs.mkdir(path.join(denied.cwd, '.claude/workflows'), { recursive: true });
    await fs.writeFile(path.join(denied.cwd, '.claude/workflows/b.js'), 'export const meta={name:"blocked",description:"B"};\nreturn 1');
    await assert.rejects(denied.toolService.launch({ name: 'blocked' }, { sessionId: 'thread-1' }), /Workflow blocked blocked by permission rules/);
  } finally { await denied.cleanup(); }
  const bypass = await harness({ approval: async () => { throw new Error('must not ask'); } });
  try {
    await bypass.turn('bypass', 'dangerFullAccess');
    await bypass.toolService.launch({ script: 'export const meta={name:"a",description:"b"};\nreturn 1' }, { sessionId: 'thread-1' });
    assert.equal((await bypass.workflowService.list('thread-1'))[0].access, 'danger-full-access');
  } finally { await bypass.cleanup(); }
});

test('agents inherit the session\'s Mode and never more: Plan/Manual read-only, a claimed Bypass without its sandbox is workspace-write', async () => {
  const h = await harness();
  try {
    await h.turn('plan', 'readOnly'); assert.equal(await h.toolService.sessionAccess('thread-1'), 'read-only');
    await h.turn('ask'); assert.equal(await h.toolService.sessionAccess('thread-1'), 'read-only');
    await h.turn('acceptEdits'); assert.equal(await h.toolService.sessionAccess('thread-1'), 'workspace-write');
    await h.turn('bypass', 'workspaceWrite'); assert.equal(await h.toolService.sessionAccess('thread-1'), 'workspace-write');
    assert.equal(await h.toolService.sessionAccess('unknown'), 'read-only');
  } finally { await h.cleanup(); }
});

test('validation: determinism check on inline scripts, script errors, an unknown resume run, reminders on turn/start', async () => {
  const h = await harness();
  try {
    const params = await h.turn();
    assert.equal(params.input.length, 1, 'no reminder without the keyword or ultracode');
    await assert.rejects(h.toolService.launch({ script: 'export const meta={name:"a",description:"b"};\nreturn Date.now()' }, { sessionId: 'thread-1' }), /must be deterministic/);
    await assert.rejects(h.toolService.launch({ script: 'return 1' }, { sessionId: 'thread-1' }), /Invalid workflow script: `export const meta/);
    await assert.rejects(h.toolService.launch({ script: 'export const meta={name:"a",description:"b"};\nreturn 1', resumeFromRunId: 'wf_aaaaaaaaaaaa' }, { sessionId: 'thread-1' }), /Unknown workflow run/);
    await assert.rejects(h.toolService.launch({ script: 'export const meta={name:"a",description:"b"};\nreturn 1' }, { sessionId: 'other' }), /only in an OpenClaude Desktop session/);
    assert.equal(h.approvals.length, 0, 'nothing invalid reaches the approval');
    const keyword = { threadId: 'thread-1', input: [{ type: 'text', text: 'ultracode fix it' }], cwd: h.cwd };
    await h.toolService.turnStart(keyword, { permission: 'auto', mode: 'code', keyword: true, ultracode: true });
    assert.equal(keyword.input.length, 2);
    assert.match(keyword.input[1].text, /^<system-reminder>\nThe user included the keyword "ultracode"[\s\S]*\n\nUltracode is on: optimize/);
  } finally { await h.cleanup(); }
});

test('JSON fallback: a core without structured output runs schema agents through the prompt (runner jsonAgent.js)', async () => {
  const h = await harness({ structuredOutput: false });
  try {
    await h.turn(); h.idle();
    const replies = JSON.stringify(['not json at all', '```json\n{"n":"x"}\n```', 'Here: {"n": 3}']);
    await h.toolService.launch({ script: `export const meta={name:"json",description:"JSON fallback"};\nreturn await agent(${JSON.stringify('REPLIES:' + replies)},{schema:{type:"object",properties:{n:{type:"number"}},required:["n"]}})` }, { sessionId: 'thread-1' });
    const delivered = await h.done();
    assert.match(delivered.params.input[0].text, /<status>completed<\/status>[\s\S]*<result>\{"n":3\}<\/result>/);
    const run = (await h.workflowService.list('thread-1'))[0];
    const wire = (await fs.readFile(path.join(h.cwd, 'workflow-wire.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const starts = wire.filter((frame) => frame.method === 'turn/start');
    assert.equal(starts.length, 3, 'one thread, three turns');
    assert.equal(new Set(starts.map((frame) => frame.params.threadId)).size, 1);
    assert.match(starts[0].params.input[0].text, /Return your final answer as one JSON value that matches this JSON Schema exactly[\s\S]*"required":\["n"\]/);
    assert.match(starts[1].params.input[0].text, /^Your reply did not match the required JSON Schema: \$: the reply is not valid JSON/);
    assert.match(starts[2].params.input[0].text, /^Your reply did not match the required JSON Schema:/);
    assert.ok(starts.every((frame) => !('outputSchema' in frame.params)));
    assert.ok(wire.filter((frame) => frame.method === 'thread/start').every((frame) => !frame.params.dynamicTools));
    assert.equal(run.status, 'completed');
    assert.match(await fs.readFile(path.join(run.transcriptDir, 'events.jsonl'), 'utf8'), /Workflow compatibility.*prompted JSON with validation and retries.*Claude's StructuredOutput tool/);
    assert.ok(run.compatibilityNotes.some(message => message.includes('prompted JSON with validation and retries')));
  } finally { await h.cleanup(); }
});

test('outputSchema-only cores (DeepSeek Harness, OpenCode/MiMo: no dynamic tools) get the wire schema on each JSON turn', async () => {
  const h = await harness({ structuredOutput: 'outputSchema' });
  try {
    await h.turn(); h.idle();
    await h.toolService.launch({ script: `export const meta={name:"schema",description:"Schema"};\nreturn await agent(${JSON.stringify('REPLIES:' + JSON.stringify(['{"n":4}']))},{schema:{type:"object",properties:{n:{type:"number"}},required:["n"]}})` }, { sessionId: 'thread-1' });
    const delivered = await h.done();
    assert.match(delivered.params.input[0].text, /<result>\{"n":4\}<\/result>/);
    const wire = (await fs.readFile(path.join(h.cwd, 'workflow-wire.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const run = (await h.workflowService.list('thread-1'))[0];
    assert.match(await fs.readFile(path.join(run.transcriptDir, 'events.jsonl'), 'utf8'), /Workflow compatibility.*outputSchema and validated response JSON.*Claude's StructuredOutput tool/);
    assert.ok(run.compatibilityNotes.some(message => message.includes('outputSchema and validated response JSON')));
    const start = wire.find((frame) => frame.method === 'turn/start');
    assert.deepEqual(start.params.outputSchema, { type: 'object', properties: { n: { type: 'number' } }, required: ['n'], additionalProperties: false });
    // Claude's provenance relay: the user's own request ("hi") goes, indented, before the framed computed task.
    assert.match(start.params.input[0].text, /^\[Workflow harness \u2014 user request\] [^\n]*\n  hi\n\n\[Workflow harness \u2014 computed task\] /);
    assert.ok(wire.filter((frame) => frame.method === 'thread/start').every((frame) => !frame.params.dynamicTools));
  } finally { await h.cleanup(); }
});

test('WorkflowStop: the model stops a run it started by its task ID; no notification follows; a resume error names it', async () => {
  const h = await harness();
  try {
    await h.turn('auto');
    const text = await h.toolService.launch({ script: 'export const meta={name:"Long",description:"Waits",phases:[{title:"Go"}]};\nphase("Go"); return await agent("WAIT")' }, { sessionId: 'thread-1', cwd: h.cwd });
    const taskId = text.match(/Task ID: (w[0-9a-z]{8})/)[1], runId = text.match(/\nRun ID: (wf_[0-9a-f-]{12})\n/)[1], scriptPath = text.match(/\nScript file: (.+)\n/)[1];
    for (let i = 0; i < 200 && !(await h.workflowService.list('thread-1'))[0]?.workflowProgress?.some((row) => row.type === 'workflow_agent'); i++) await new Promise((resolve) => setTimeout(resolve, 25));
    await assert.rejects(h.toolService.launch({ scriptPath, resumeFromRunId: runId }, { sessionId: 'thread-1', cwd: h.cwd }), new RegExp(`WorkflowStop\\(\\{task_id: "${taskId}"\\}\\)`));
    await assert.rejects(h.toolService.stop({ task_id: 'wnope0000' }, { sessionId: 'thread-1' }), /No workflow task/);
    await assert.rejects(h.toolService.stop({}, { sessionId: 'thread-1' }), /task_id is required/);
    await assert.rejects(h.toolService.stop({ task_id: taskId }, { sessionId: 'thread-2' }), /No workflow task/);
    const answer = await h.toolService.stop({ task_id: taskId }, { sessionId: 'thread-1' });
    assert.match(answer, new RegExp(`^Stopp(ed|ing) workflow ${taskId} \\(run ${runId}\\)`));
    assert.match(answer, /resumeFromRunId/);
    for (let i = 0; i < 200 && (await h.workflowService.list('thread-1'))[0].status === 'running'; i++) await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal((await h.workflowService.list('thread-1'))[0].status, 'stopped');
    assert.match(await h.toolService.stop({ task_id: runId }, { sessionId: 'thread-1' }), /is not running \(stopped\)/);
    h.idle();
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(h.turns.length, 0, 'a stopped run tells the model nothing more');
  } finally { await h.cleanup(); }
});
