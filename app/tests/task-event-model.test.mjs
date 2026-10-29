// Claude's task-event rows (approval-current.js:44082-44440 M2/aue/F2) for workflow notifications and the Background
// tasks pane's finished commands and agents.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { taskEventNoun, taskEventRow, mergedTaskEvents, workflowTaskEvent, backgroundTaskEventsByTurn } from '../src/task-event-model.mjs';
import { setLocale } from '../electron/i18n/index.mjs';

test('a settled event reads Background {noun} {status} · description · took {elapsed}; only failed is danger', () => {
  setLocale('en-US');
  assert.equal(taskEventNoun('local_bash'), 'shell');
  assert.equal(taskEventNoun('subagent'), 'agent');
  assert.equal(taskEventNoun('monitor'), 'monitor');
  assert.equal(taskEventNoun('whatever'), 'task');
  const row = taskEventRow({ taskType: 'local_bash', status: 'completed', description: 'npm test', durationMs: 65000 });
  assert.equal(row.label, 'Background command completed');
  assert.equal(row.description, 'npm test');
  assert.match(row.elapsed, /^took /);
  assert.equal(row.danger, false);
  assert.equal(taskEventRow({ taskType: 'local_agent', status: 'failed' }).danger, true);
  assert.equal(taskEventRow({ taskType: 'local_workflow', status: 'killed' }).label, 'Background workflow stopped');
});

test('several events merge into one line with only the failed part in danger', () => {
  setLocale('en-US');
  const merged = mergedTaskEvents([{ taskType: 'local_bash', status: 'completed' }, { taskType: 'local_bash', status: 'completed' }, { taskType: 'local_bash', status: 'failed' }]);
  assert.deepEqual(merged.parts.map((part) => [part.text, part.danger]), [['2 background commands completed', false], ['1 failed', true]]);
  assert.equal(mergedTaskEvents([{ taskType: 'local_bash', status: 'completed' }, { taskType: 'local_agent', status: 'completed' }]).parts[0].text, '2 background tasks completed');
});

test('a workflow notification names its run and duration', () => {
  const event = workflowTaskEvent({ status: 'completed', summary: 'Dynamic workflow "audit-login" completed', taskId: 'w1', durationMs: 4000 });
  assert.deepEqual(event, { taskId: 'w1', taskType: 'local_workflow', status: 'completed', description: 'audit-login', durationMs: 4000 });
});

test('finished background commands and agents land at the end of the turn they finished in', () => {
  const items = [
    { id: 'u1', turnId: 't1', type: 'userMessage' }, { id: 'c1', turnId: 't1', type: 'commandExecution', processId: 'p1' },
    { id: 'c2', turnId: 't1', type: 'commandExecution', processId: 'p2' }, { id: 's1', turnId: 't1', type: 'collabAgentToolCall' },
    { id: 'u2', turnId: 't2', type: 'userMessage' },
  ];
  const turnTimes = { t1: { startedAt: 100 }, t2: { startedAt: 200 } };
  const tasks = [
    { id: 'bash:c1', kind: 'bash', itemId: 'c1', description: 'npm run dev', status: 'stopped', startedAt: 101000, completedAt: 250000 },
    { id: 'bash:c2', kind: 'bash', itemId: 'c2', description: 'ls', status: 'failed', startedAt: 101000, completedAt: 102000 },
    { id: 'agent:a', kind: 'agent', sourceItem: items[3], description: 'Explorer', status: 'failed', completedAt: 150000, durationMs: 9000 },
    { id: 'bash:c3', kind: 'bash', itemId: 'c1', status: 'running' },
  ];
  const byTurn = backgroundTaskEventsByTurn(tasks, { items, turnTimes, backgroundItemIds: new Set(['c1']) });
  assert.deepEqual([...byTurn.keys()].sort(), ['t1', 't2']);
  assert.deepEqual(byTurn.get('t1'), [{ taskKey: 'agent:a', taskType: 'local_agent', status: 'failed', description: 'Explorer', durationMs: 9000 }]);
  assert.deepEqual(byTurn.get('t2'), [{ taskKey: 'bash:c1', taskType: 'local_bash', status: 'stopped', description: 'npm run dev', durationMs: 149000 }]);
  // A command the core never reported as a background terminal stays a plain command row.
  assert.equal([...byTurn.values()].flat().some((event) => event.taskKey === 'bash:c2'), false);
  // An event inside its own still-running turn waits for the turn to settle.
  assert.equal(backgroundTaskEventsByTurn(tasks, { items, turnTimes: { t1: { startedAt: 100 } }, activeTurnId: 't1', backgroundItemIds: new Set(['c1']) }).size, 0);
});

test('2.42304.0 c06cf64bb: a task started by a tool call already shown is dropped, and its completed notification skipped', () => {
  // Official chunk only parsed, never run.
  const parse = fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c06cf64bb-BE5q2vSr.js', import.meta.url), 'utf8');
  assert.ok(parse.includes('let v=e=>e!==void 0&&(f.has(e)||s.has(e))'), 'v: a tool id the transcript has shown');
  assert.ok(parse.includes('n=v(e.tool_use_id)?"dropped":je(t,e.tool_use_id);if(n==="dropped"){u.add(e.task_id);'));
  assert.ok(parse.includes('let n=u.has(e.task_id);if(n&&t==="completed")continue;'));
  // Failed / stopped still become an event (absorbed into the tools run or pushed to the turn).
  assert.ok(parse.includes('f=je(s,n?void 0:e.tool_use_id)'));
});

test('a task the transcript\'s own tool call started adds no event when it completes (c06cf64bb dropped → continue)', () => {
  // The user's screenshot: `node app/scripts/landing-performance-preview.mjs` run in the background by this turn's
  // command row, completed after the reply. Officially no 'Background command completed · …' row follows.
  const items = [
    { id: 'u1', turnId: 't1', type: 'userMessage' }, { id: 'c1', turnId: 't1', type: 'commandExecution', processId: 'p1' },
    { id: 's1', turnId: 't1', type: 'collabAgentToolCall' }, { id: 'c2', turnId: 't1', type: 'commandExecution', processId: 'p2' },
  ];
  const turnTimes = { t1: { startedAt: 100 } };
  const tasks = [
    { id: 'bash:c1', kind: 'bash', itemId: 'c1', description: 'node app/scripts/landing-performance-preview.mjs', status: 'completed', startedAt: 101000, completedAt: 105000 },
    { id: 'agent:a', kind: 'agent', sourceItem: items[2], description: 'Explorer', status: 'completed', completedAt: 150000, durationMs: 9000 },
    { id: 'bash:c2', kind: 'bash', itemId: 'c2', description: 'npm test', status: 'failed', startedAt: 101000, completedAt: 160000 },
    // Known only from the core's background snapshot (its command row is not in this transcript): still an event.
    { id: 'bash:c9', kind: 'bash', itemId: 'c9', description: 'tail -f log', status: 'completed', startedAt: 101000, completedAt: 170000 },
  ];
  const byTurn = backgroundTaskEventsByTurn(tasks, { items, turnTimes, backgroundItemIds: new Set(['c1', 'c2', 'c9']) });
  assert.deepEqual(byTurn.get('t1')?.map((event) => [event.taskKey, event.status]), [['bash:c2', 'failed'], ['bash:c9', 'completed']]);
  const statuses = { completed: 'stopped' };
  const stopped = backgroundTaskEventsByTurn(tasks.slice(0, 2).map((task) => ({ ...task, status: statuses[task.status] })), { items, turnTimes, backgroundItemIds: new Set(['c1']) });
  assert.deepEqual(stopped.get('t1')?.map((event) => [event.taskKey, event.status]), [['bash:c1', 'stopped'], ['agent:a', 'stopped']]);
});

test('main renders the events after the turn and the row focuses its task; the bypass footnote links the security guide', () => {
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(main, /<SourceTaskEvent events=\{taskEventsByTurn\.get\(item\.turnId\)\}/);
  assert.match(main, /event\?\.taskKey\?tasks\.find\(entry=>entry\.id===event\.taskKey\)/);
  const bypass = fs.readFileSync(new URL('../src/source-bypass-permission.jsx', import.meta.url), 'utf8');
  // The link follows the running core (bypassGuide): its own security guide, else its documentation.
  assert.match(bypass, /t\("Read \{core\}’s \{link\} for details\.", \{ core: guide\.name, link: "\{link\}" \}\)/);
  assert.match(bypass, /data-cds="TextLink" className="source-bypass-link"/);
  assert.match(bypass, /SECURITY_GUIDE_URL = 'https:\/\/code\.claude\.com\/docs\/en\/security'/);
});
