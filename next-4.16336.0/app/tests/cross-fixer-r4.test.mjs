// Cross-cutting fixes, round 4 (budget drops, ZCode stop reasons, usage restore).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../third-party/codex-workflows-runner/src/runtime.js';
import { resetMeter } from '../third-party/codex-workflows-runner/src/meter.js';
import { reduce } from '../src/state.js';

test('slots the token budget drops are one summary line, not a failure each', async (t) => {
  resetMeter();
  t.after(resetMeter);
  const failures = [], logs = [];
  const runtime = createRuntime({ onSlotFailure: (line) => failures.push(line), onLog: (line) => logs.push(line) });
  const drop = () => { throw Object.assign(new Error('budget'), { code: 'BUDGET_EXCEEDED', name: 'WorkflowBudgetExceededError' }); };
  assert.deepEqual(await runtime.parallel([() => 'ok', drop, drop]), ['ok', null, null]);
  assert.deepEqual(failures, ['parallel: 2 slots dropped — token budget exceeded']);
  assert.equal(logs.filter((line) => /failed/.test(line)).length, 0);
  failures.length = 0;
  assert.deepEqual(await runtime.pipeline([1, 2], (n) => (n === 2 ? drop() : n)), [1, null]);
  assert.deepEqual(failures, ['pipeline: 1 slot dropped — token budget exceeded']);
  failures.length = 0;
  await runtime.parallel([() => { throw new Error('real'); }]);
  assert.deepEqual(failures, ['parallel[0] failed: real']);
});

test('a reloaded window restores context usage only where none arrived yet', () => {
  const state = { usage: { a: { last: { totalTokens: 9 } } } };
  const next = reduce(state, { type: 'usage-restore', usage: { a: { last: { totalTokens: 1 } }, b: { last: { totalTokens: 2 } } } });
  assert.deepEqual(next.usage, { a: { last: { totalTokens: 9 } }, b: { last: { totalTokens: 2 } } });
  assert.equal(reduce(next, { type: 'usage-restore', usage: { a: {} } }), next);
});

test("budget.spent() starts from what the launching turn already spent, with Claude's error", async (t) => {
  resetMeter();
  t.after(resetMeter);
  const runtime = createRuntime({ budgetTotal: 1000, budgetSpentBefore: 1200 });
  assert.equal(runtime.budget.spent(), 1200);
  assert.equal(runtime.budget.remaining(), 0);
  await assert.rejects(runtime.parallel([() => 1]), { name: 'WorkflowBudgetExceededError', message: /^Workflow token budget exceeded \(1,200 \/ 1,000 output tokens\)\. Stopping further agent\(\) calls\./ });
});

test('hooks-file opens (and creates) the user or project hooks.json on a native core only', async () => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const { createRequire } = await import('node:module');
  const { createCustomizeOperations } = createRequire(import.meta.url)('../electron/customize-operations.cjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-file-'));
  const opened = [];
  const make = (serverInfo) => createCustomizeOperations({ getClient: () => ({ start: async () => {}, serverInfo, request: async () => ({}) }),
    getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd, openPath: async (file) => { opened.push(file); return ''; }, home: () => root });
  const codex = make({ capabilities: {}, codexHome: path.join(root, 'codex-home') });
  const user = await codex.run({ operation: 'hooks-file', scope: 'user', action: 'open' });
  assert.equal(user.path, path.join(root, 'codex-home', 'hooks.json'));
  assert.deepEqual(JSON.parse(await fs.readFile(user.path, 'utf8')), { hooks: {} });
  await fs.writeFile(user.path, '{"hooks":{"x":1}}');
  await codex.run({ operation: 'hooks-file', scope: 'user', action: 'open' });
  assert.equal(await fs.readFile(user.path, 'utf8'), '{"hooks":{"x":1}}', 'an existing file is never replaced');
  const project = await codex.run({ operation: 'hooks-file', scope: 'project', action: 'open', cwd: path.join(root, 'proj') });
  assert.equal(project.path, path.join(root, 'proj', '.codex', 'hooks.json'));
  await assert.rejects(codex.run({ operation: 'hooks-file', scope: 'project', action: 'open' }), /Open a project first/);
  assert.equal(opened.length, 3);
  await assert.rejects(make({ engine: 'kimi', capabilities: {} }).run({ operation: 'hooks-file', scope: 'user', action: 'open' }), /not supported/);
  await fs.rm(root, { recursive: true, force: true });
});

test('Open links in preview is the profile preference; a device-only "off" moves into it once', async () => {
  const { createPreviewLinksStore, PREVIEW_LINKS_KEY } = await import('../src/preview-links-model.mjs');
  const items = new Map([[PREVIEW_LINKS_KEY, 'off']]);
  const storage = { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, v), removeItem: (k) => items.delete(k) };
  const saves = [];
  const store = createPreviewLinksStore(() => storage);
  assert.equal(store.getSnapshot(), false);
  store.connect(undefined, async (value) => { saves.push(value); });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(saves, [false]);
  assert.equal(items.has(PREVIEW_LINKS_KEY), false);
  let notified = 0;
  store.subscribe(() => notified++);
  store.connect(true, async (value) => { saves.push(value); });
  assert.equal(store.getSnapshot(), true);
  assert.equal(notified, 1);
  store.set(false);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(saves, [false, false]);
  assert.equal(items.has(PREVIEW_LINKS_KEY), false, 'a connected store never writes the device storage');
});

// W14-code r4 ct-feed R4T-08b (E95): the deliverables model (workflow-artifacts-model.mjs) went with the host workflow card;
// the Tasks pane's run is the desktop's N$ card (tests/code-transcript-r4-feed.test.mjs).

test('ZCode stop reasons and agent errors read in the UI language', async () => {
  const { setLocale } = await import('../electron/i18n/index.mjs');
  const { workflowSummary } = await import('../src/workflow-progress-model.mjs');
  const { localizeBridgeText } = await import('../src/bridge-text-model.mjs');
  setLocale('zh-CN');
  try {
    assert.equal(workflowSummary('Replaced by a revised run', 'x'), '已被修订后的运行取代');
    assert.equal(workflowSummary('Interrupted (ZCode stopped before the workflow finished)', 'x'), '已中断（ZCode 在工作流完成前停止了）');
    assert.equal(localizeBridgeText('Agent failed'), '智能体失败');
    assert.equal(localizeBridgeText('Workflow ended (weird)'), '工作流已结束（weird）');
    assert.equal(localizeBridgeText('Edit refused by hook'), 'Edit refused by hook', 'the model’s own error stays');
  } finally { setLocale('en-US'); }
});

test('escalation and stall notices parse into their own kinds', async () => {
  const { workflowNotificationSummary } = await import('../electron/prefs/workflow-keyword.mjs');
  const text = '<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]\nx\n\n<task-notification>\n<kind>escalation</kind>\n<status>question</status>\n<task-id>r1</task-id>\n<workflow>review</workflow>\n<agent>checker</agent>\n<question>94 or 96?</question>\n</task-notification>\n</system-reminder>';
  assert.deepEqual(workflowNotificationSummary(text), { status: 'question', summary: null, taskId: 'r1', kind: 'escalation', workflow: 'review', agent: 'checker', question: '94 or 96?' });
});

test("a core library's saved workflow is /<name> that runs it by name, with its declared args as the hint", async () => {
  const { workflowCommandRows } = await import('../src/saved-workflow-commands.mjs');
  const [row] = workflowCommandRows([{ name: 'pr-review', description: 'Review a PR', engine: 'core', source: 'project', args: { pr: { type: 'string', required: true, description: 'PR number' }, draft: { type: 'boolean' } } }]);
  assert.equal(row.argumentHint, 'pr=<string> [draft=<boolean>]');
  assert.match(row.body, /^Run the saved workflow "pr-review"\.\nReview a PR\nArguments it declares: pr \(string, required: PR number\); draft \(boolean\)\.\nInvoke: CreateWorkflow\(\{ saved: \{ name: "pr-review", args \} \}\)/);
  const [claude] = workflowCommandRows([{ name: 'release-check', description: 'x', source: 'project' }]);
  assert.equal(claude.argumentHint, '[args]');
  assert.match(claude.body, /Workflow\(\{ name: "release-check", args \}\)/);
});

test('a bridge core with workflowMcpSwitches takes mcp__ exclusions through config, one without still refuses them', async () => {
  const { narrowThreadParams } = await import('../third-party/codex-workflows-runner/src/toolNarrowing.js');
  const request = async () => ({ config: { mcp_servers: { github: { command: 'gh' } } } });
  const opencode = { serverInfo: { userAgent: 'code-desktop-opencode-core/1.0', capabilities: { workflowMcpSwitches: true } }, request };
  const params = await narrowThreadParams(opencode, { cwd: '/w', sandbox: 'workspace-write' }, { toolControls: 'sandbox', disallowedTools: ['mcp__github__create_issue'] });
  assert.deepEqual(params.config, { 'mcp_servers.github.disabled_tools': ['create_issue'] });
  const kimi = { serverInfo: { userAgent: 'code-desktop-acp-bridge/1.0 (kimi 1; darwin)', capabilities: {} }, request };
  await assert.rejects(narrowThreadParams(kimi, { cwd: '/w' }, { toolControls: 'sandbox', disallowedTools: ['mcp__github'] }), /can't remove mcp__github/);
});
