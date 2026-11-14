// Cross-area fixes (round 2): the Workflow agents' model kept per core, CLAUDE_WORKFLOW_NAME_ONLY limiting names and
// nested scriptPath runs, failed runs' <task-notification> (result previews, slot failures), steers delivered by
// cores that don't echo the client id, the split-view tip's switch pattern and backoff, a MiMo actor offered no Stop,
// and the Terminal pane's shims for the agents the app installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { resolveWorkflowSettings, workflowRunnerEnv, applyWorkflowPatch, savedSubagentModel } = await import('../electron/prefs/workflow-settings.mjs');
const tool = await import('../electron/workflow-tool-model.mjs');
const { workflowEvent } = await import('../src/workflow-progress-model.mjs');
const { steerInputText, steerTextCount } = await import('../src/queued-messages-model.mjs');
const split = await import('../src/split-view-model.mjs');
const { backgroundTasks } = await import('../src/background-tasks-model.mjs');
const { emptyState } = await import('../src/state.js');
const { createRuntime } = await import('../third-party/codex-workflows-runner/src/runtime.js');
const { createCoreManager } = require('../electron/core-manager.cjs');

const TMP = '/private/tmp/claude-501';
fs.mkdirSync(TMP, { recursive: true });
const made = [];
const tmp = (prefix) => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(TMP, prefix))); made.push(dir); return dir; };
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });

test('Workflow agents’ model: saved per core, ignored where the core’s catalog lacks it, the old app-wide value only where listed', () => {
  const config = applyWorkflowPatch({ workflowSubagentModel: 'old-model' }, { workflowSubagentModels: { codex: 'gpt-5.6-sol' } });
  assert.deepEqual(config, { workflowSubagentModels: { codex: 'gpt-5.6-sol' } }, 'the per-core value replaces the app-wide one');
  assert.equal(resolveWorkflowSettings({ config, coreId: 'codex', models: ['gpt-5.6-sol', 'gpt-5.6-terra'] }).subagentModel.value, 'gpt-5.6-sol');
  const deepseek = resolveWorkflowSettings({ config, coreId: 'deepseek', models: ['deepseek-flash'] });
  assert.equal(deepseek.subagentModel.value, null, 'another core’s model never reaches DeepSeek');
  assert.equal(workflowRunnerEnv(deepseek).CLAUDE_CODE_SUBAGENT_MODEL, undefined);
  const missing = resolveWorkflowSettings({ config: { workflowSubagentModels: { codex: 'gone' } }, coreId: 'codex', models: ['gpt-5.6-sol'] });
  assert.deepEqual([missing.subagentModel.value, missing.subagentModel.unavailable], [null, 'gone'], 'reported as unavailable, agents use the session model');
  assert.deepEqual(savedSubagentModel({ workflowSubagentModel: 'm' }, 'kimi', ['m']), { value: 'm', saved: 'm', unavailable: false });
  assert.deepEqual(savedSubagentModel({ workflowSubagentModel: 'm' }, 'kimi', ['other']), { value: null, saved: null, unavailable: false });
  assert.equal(savedSubagentModel({ workflowSubagentModel: 'm' }).value, 'm', 'no core: as before');
  assert.deepEqual(applyWorkflowPatch({ workflowSubagentModels: { codex: 'a', kimi: 'b' } }, { workflowSubagentModels: { codex: null } }), { workflowSubagentModels: { kimi: 'b' } });
  assert.throws(() => applyWorkflowPatch({}, { workflowSubagentModels: { 'Bad Core': 'x' } }), /Invalid workflowSubagentModels/);
});

test('CLAUDE_WORKFLOW_NAME_ONLY: saved workflows are not "named", nested workflow({scriptPath}) is refused, the runner hears it', async () => {
  const cwd = tmp('wf-nameonly-'), home = tmp('wf-home-');
  fs.mkdirSync(path.join(cwd, '.claude', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.claude', 'workflows', 'saved.js'), 'export const meta = { name: "saved", description: "x" };\nreturn 1');
  assert.ok(tool.findSavedWorkflow({ cwd, home, name: 'saved' }).workflow);
  assert.match(tool.findSavedWorkflow({ cwd, home, name: 'saved', nameOnly: true }).error, /Available: \(none\)\. OpenClaude Desktop bundles no named workflows/);
  assert.match(tool.workflowToolDescription({ nameOnly: true }), /bundles no named workflows/);
  assert.equal(workflowRunnerEnv(resolveWorkflowSettings({ env: { CLAUDE_WORKFLOW_NAME_ONLY: '1' } })).CLAUDE_WORKFLOW_NAME_ONLY, '1');
  assert.equal(workflowRunnerEnv(resolveWorkflowSettings({})).CLAUDE_WORKFLOW_NAME_ONLY, undefined);
  const runtime = createRuntime({ allowScriptPath: false, scriptPathRefusal: tool.NAME_ONLY_SCRIPT_PATH, runAgent: async () => 'x' });
  await assert.rejects(runtime.workflow({ scriptPath: '/anything.js' }), /CLAUDE_WORKFLOW_NAME_ONLY is set/);
});

test('a failed run’s notification: agents that returned something are not empty, slot failures are listed', () => {
  let run = { id: 'wf_1', startedAt: 0, workflowProgress: [] };
  for (const [id, preview] of [['a1', 'alpha'], ['a2', 'beta']]) {
    run = workflowEvent(run, { type: 'admission', id, label: id, seq: id === 'a1' ? 1 : 2 }, 1);
    run = workflowEvent(run, { type: 'start', id }, 2);
    run = workflowEvent(run, { type: 'end', id, resultPreview: preview }, 3);
  }
  run = workflowEvent(run, { type: 'slot-failure', message: 'parallel[2] failed: thunk bug' }, 4);
  assert.deepEqual(run.workflowProgress.filter((row) => row.type === 'workflow_agent').map((row) => row.resultPreview), ['alpha', 'beta']);
  assert.deepEqual(run.slotFailures, ['parallel[2] failed: thunk bug']);
  const text = tool.workflowTaskNotification({ taskId: 't', status: 'failed', name: 'x', error: 'boom', agents: run.workflowProgress.filter((row) => row.type === 'workflow_agent'), failures: run.slotFailures });
  assert.match(text, /<agents_done>2<\/agents_done>/);
  assert.match(text, /<agents_empty_result>0<\/agents_empty_result>/);
  assert.match(text, /<failures>parallel\[2\] failed: thunk bug<\/failures>/);
});

test('the runner reports a failed parallel slot through onSlotFailure', async () => {
  const failures = [];
  const runtime = createRuntime({ onSlotFailure: (message) => failures.push(message), onLog: () => {} });
  const values = await runtime.parallel([async () => 'ok', async () => { throw new Error('thunk bug'); }]);
  assert.deepEqual(values, ['ok', null]);
  assert.deepEqual(failures, ['parallel[1] failed: thunk bug']);
});

test('a steer from a core that doesn’t echo the id counts as delivered once one more message with its text arrives', () => {
  const input = [{ type: 'text', text: 'also  check\nthe README' }, { type: 'text', text: '<system-reminder>x</system-reminder>' }];
  assert.equal(steerInputText(input), 'also check the README');
  const before = [{ type: 'userMessage', clientId: null, content: [{ type: 'text', text: 'also check the README' }] }];
  assert.equal(steerTextCount(before, 'also check the README'), 1, 'the same words sent earlier');
  assert.equal(steerTextCount([...before, { type: 'userMessage', clientId: null, content: [{ type: 'text', text: 'also check the README' }] }], 'also check the README'), 2);
  assert.equal(steerTextCount([{ type: 'userMessage', clientId: 'c1', content: [{ type: 'text', text: 'also check the README' }] }], 'also check the README'), 0, 'an echoed id is matched by id instead');
});

test('split-view tip (c11959232 vd/bd): A, B, A, B within 30 s suggests the other session; at most 3 shows, dismissal backoff, never after accepting', () => {
  let history = [];
  for (const [id, at] of [['a', 0], ['b', 5000], ['b', 6000], ['a', 10000], ['b', 20000]]) history = split.recordSessionSwitch(history, id, at);
  assert.equal(split.alternatingPartner(history, 20000), 'a');
  assert.equal(split.alternatingPartner(history, 40000), null, 'too slow');
  assert.equal(split.alternatingPartner(split.recordSessionSwitch(history, 'c', 21000), 21000), null);
  const day = 24 * 60 * 60 * 1000;
  assert.equal(split.maySuggestSplit(split.emptySplitSuggestion, 0), true);
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, dismissCount: 1, lastDismissedAt: 0 }, day - 1), false);
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, dismissCount: 1, lastDismissedAt: 0 }, day), true);
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, dismissCount: 2, lastDismissedAt: 0 }, 6 * day), false);
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, shownCount: 3 }, 1e12), false);
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, accepted: true }, 1e12), false);
});

test('a sub-agent whose thread says it can’t be stopped alone (MiMo’s actors) gets no Stop', () => {
  const s = { ...emptyState, items: { parent: [] }, childThreads: { parent: ['ses_1~general-1'] },
    threads: { 'ses_1~general-1': { id: 'ses_1~general-1', source: { subAgent: { thread_spawn: { parent_thread_id: 'ses_1' } } }, codeDesktop: { stoppable: false } } } };
  const task = backgroundTasks(s, 'parent').find((entry) => entry.kind === 'agent');
  assert.equal(task.stoppable, false);
});

test('the Terminal pane’s shims: an agent the app installed answers by name, under the app’s Node', () => {
  const data = tmp('core-shims-');
  const entry = path.join(data, 'cores', 'qwen', '1.0.0', 'package', 'cli-entry.js');
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.writeFileSync(entry, '#!/usr/bin/env node\n');
  fs.writeFileSync(path.join(data, 'cores', 'qwen', 'manifest.json'), JSON.stringify({ version: '1.0.0', binary: 'package/cli-entry.js', runner: 'node' }));
  const manager = createCoreManager({ dataDir: () => data, getConfig: () => ({}), save: () => {}, home: path.join(data, 'home'), env: {}, nodeBinary: () => "/Apps/OpenClaude Desktop's.app/node", fetchImpl: () => { throw new Error('no network'); } });
  const dir = manager.terminalShims(path.join(data, 'terminal-bin'));
  const shim = fs.readFileSync(path.join(dir, 'qwen'), 'utf8');
  assert.match(shim, /^#!\/bin\/sh\n/);
  assert.ok(shim.includes(`ELECTRON_RUN_AS_NODE=1 exec '/Apps/OpenClaude Desktop'\\''s.app/node' '${entry}' "$@"`), shim);
  assert.equal(fs.statSync(path.join(dir, 'qwen')).mode & 0o111, 0o111);
  fs.writeFileSync(path.join(dir, 'stale'), 'x');
  manager.terminalShims(dir);
  assert.equal(fs.existsSync(path.join(dir, 'stale')), false, 'a shim for something no longer installed goes');
});

test('a core whose Workflow tool waits behind load_tools is told to load it in the ultracode reminders', async () => {
  const { reminderTexts, KEYWORD_REMINDER, DEFERRED_WORKFLOW_NOTE } = await import('../electron/workflow-reminders.mjs');
  assert.equal(reminderTexts({ engine: 'codeDesktop' }).keyword, KEYWORD_REMINDER);
  assert.equal(reminderTexts({ engine: 'codeDesktop', deferred: true }).keyword, `${KEYWORD_REMINDER} ${DEFERRED_WORKFLOW_NOTE}`);
  assert.ok(!reminderTexts({ engine: 'codeDesktop', deferred: true }).exit.includes('load_tools'));
});
