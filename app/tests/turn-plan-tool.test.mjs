// turn-plan: agent-tools/turn-plan.mjs serves 2.42304.0's update_plan (ccd_turn Qt / Zt, generated into
// electron/generated/turn-plan/ccd-turn.mjs) through the agent-tools host, in the "turn" group. In-process only: the host is
// never started (no socket, no child process); tools/list and tools/call go through host.listTools() / host.call().
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const main = path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-B5tintml.js');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const turnPlan = await import('../electron/agent-tools/turn-plan.mjs');
const generated = await import('../electron/generated/turn-plan/ccd-turn.mjs');
const { coreCapabilities } = await import('../electron/core-registry.mjs');

const sessions = { 'thread-a': '/work/a', 'thread-b': '/work/b' };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-turn-plan-'));
function makeHost(options = {}) {
  return createAgentToolsHost({
    tmpRoot: tmp(), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta?.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    ...options,
  });
}
const text = (result) => result.content.map((part) => part.text).join('');
const steps = (n, status = 'pending') => Array.from({ length: n }, (_, i) => ({ content: `Step ${i + 1}`, status: i === 0 && status === 'first' ? 'in_progress' : status === 'first' ? 'pending' : status }));

// The official description and schema, read from the installed main-process chunk (not from the generated module).
const officialDescription = () => {
  const code = fs.readFileSync(main, 'utf8');
  const start = code.indexOf('var Tt=e=>`') + 'var Tt=e=>`'.length;
  const end = code.indexOf('`,Et={type:"object"', start);
  const template = code.slice(start, end);
  const sideSessions = '${e?\' A "new_task" turn opens with a start_session offer and reaches this call only if the user chose Do it here.\':""}';
  assert.equal(template.split(sideSessions).length - 1, 1);
  return template.split(sideSessions).join('').split('\\n').join('\n');
};

test('the module is the official ccd_turn server: update_plan and wrap_up, descriptions (Qt(false)), schemas, annotations, alwaysLoad', { skip: !fs.existsSync(main) }, () => {
  assert.equal(turnPlan.group, 'turn');
  assert.equal(turnPlan.native, undefined, 'served to every core, Codex included');
  assert.deepEqual(turnPlan.tools.map((tool) => tool.name), ['update_plan', 'wrap_up']);
  const [tool, wrap] = turnPlan.tools;
  assert.equal(tool.codexBuiltin, 'update_plan');
  const code = fs.readFileSync(main, 'utf8');
  const ft = code.slice(code.indexOf('Ft=`Fill the "next step" box') + 4, code.indexOf('`,It={type:"object"'));
  assert.equal(wrap.description, ft.split('${Dt}').join('300').split('${Ot}').join('100').split('\\u2014').join('\u2014').split('\\n').join('\n'));
  assert.deepEqual(wrap.inputSchema, generated.turnServerDefinition(false).tools[1].inputSchema);
  assert.deepEqual(wrap.inputSchema.required, ['recap']);
  assert.deepEqual(Object.keys(wrap.inputSchema.properties), ['recap', 'ask', 'blocked', 'actions']);
  assert.deepEqual(wrap.annotations, { readOnlyHint: true });
  assert.equal(wrap.alwaysLoad, true);
  assert.ok(tool.description.includes('after the last step, advance alongside wrap_up'), 'the wrap_up half-sentence is the original');
  assert.equal(tool.description, officialDescription());
  assert.ok(tool.description.startsWith('Keep the task list the app shows under your latest message while you work. Every request that edits files or runs more than one command gets one'));
  assert.ok(!tool.description.includes('start_session offer'), 'no start_session in the host (D29)');
  const official = generated.turnServerDefinition(false);
  assert.equal(official.serverName, 'ccd_turn');
  assert.deepEqual(official.tools.map((entry) => entry.name), ['update_plan', 'wrap_up']);
  assert.deepEqual(tool.inputSchema, official.tools[0].inputSchema);
  assert.deepEqual(Object.keys(tool.inputSchema.properties), ['scope', 'items', 'advance', 'done', 'start']);
  assert.deepEqual(tool.inputSchema.properties.scope.enum, ['first_task', 'continuation', 'new_task']);
  assert.deepEqual(tool.inputSchema.properties.items.items.properties.status.enum, ['pending', 'in_progress', 'completed']);
  assert.deepEqual(tool.inputSchema.properties.items.items.required, ['content', 'status']);
  assert.deepEqual(tool.annotations, { readOnlyHint: true });
  assert.equal(tool.alwaysLoad, true);
  assert.equal(generated.UPDATE_PLAN_TOOL_NAME, 'mcp__ccd_turn__update_plan');
  assert.equal(generated.SUBAGENT_TURN_TOOL_REFUSAL, "Not shown: you are a subagent, and the app shows only the main conversation's task list and wrap-up. Do not call update_plan or wrap_up again; carry on with your task and report your result as usual.");
  // With sideSessions the sentence is there (the official Qt(a!==!1)).
  assert.ok(generated.turnServerDefinition(true).tools[0].description.includes(' A "new_task" turn opens with a start_session offer and reaches this call only if the user chose Do it here.'));
});

// Each row: the calls in order (one session), and what the last answer says.
const ROWS = [
  { name: 'items without scope', calls: [{ items: steps(2, 'first') }], text: 'items also needs "scope": "first_task", "continuation" or "new_task" \u2014 what this request is to the session. Send the same items again with it.', error: true },
  { name: 'items with an unknown scope', calls: [{ items: steps(2, 'first'), scope: 'later' }], error: true, starts: 'items also needs "scope"' },
  { name: 'items with scope', calls: [{ items: steps(3, 'first'), scope: 'first_task' }], text: 'Plan shown (3 steps).' },
  { name: 'continuation and new_task are scopes too', calls: [{ items: steps(1, 'first'), scope: 'continuation' }, { items: steps(2, 'first'), scope: 'new_task' }], text: 'Plan shown (2 steps).' },
  { name: 'two steps in progress', calls: [{ items: steps(2, 'in_progress'), scope: 'first_task' }], text: 'Plan shown (2 steps). Keep only one step in_progress.' },
  { name: 'items with advance sent along', calls: [{ items: steps(2, 'first'), scope: 'first_task', advance: true }],
    text: "Plan shown (2 steps). items sets every step's status, so the advance / done / start sent with it changed nothing; send that update again without items if it still applies." },
  { name: 'items with no usable step', calls: [{ items: [{ content: '   ', status: 'pending' }, 'x'], scope: 'first_task' }], text: 'items needs at least one step with content and status.', error: true },
  { name: 'more than 12 steps are cut at 12', calls: [{ items: steps(15, 'first'), scope: 'first_task' }], text: 'Plan shown (12 steps).' },
  { name: 'neither items nor an update', calls: [{}], text: 'Pass {"items": [...]} (whole plan), {"advance": true}, or {"done": [n], "start": m}.', error: true },
  { name: 'advance with no plan sent', calls: [{ advance: true }], text: 'Plan updated.' },
  { name: 'advance', calls: [{ items: steps(3, 'first'), scope: 'first_task' }, { advance: true }], text: 'Plan updated: step 2 of 3 is in progress.' },
  { name: 'advance as the string "true"', calls: [{ items: steps(3, 'first'), scope: 'first_task' }, { advance: 'true' }], text: 'Plan updated: step 2 of 3 is in progress.' },
  { name: 'advance past the last step', calls: [{ items: steps(2, 'first'), scope: 'first_task' }, { advance: true }, { advance: true }], text: 'Plan updated: every step is done.' },
  { name: 'done and start out of order', calls: [{ items: steps(4, 'first'), scope: 'first_task' }, { done: [1, 2], start: 4 }], text: 'Plan updated: step 4 of 4 is in progress.' },
  { name: 'done leaves none in progress', calls: [{ items: steps(3, 'first'), scope: 'first_task' }, { done: [1] }], text: 'Plan updated: no step is in progress (1 of 3 done); {"start": n} starts one.' },
  { name: 'start two while one runs', calls: [{ items: steps(3, 'first'), scope: 'first_task' }, { start: 3 }], text: 'Plan updated: steps 1, 3 of 3 are in progress; keep one and send {"done": [n]} for any you finished.' },
  { name: 'a step past the list', calls: [{ items: steps(2, 'first'), scope: 'first_task' }, { done: [3] }],
    text: 'Nothing changed: done and start take whole step numbers counted from 1, and the list has 2 steps. Send the update again with numbers that name a step, or the whole list ({"items": [...], "scope": "..."}) if the plan changed.', error: true },
  { name: 'one step: singular', calls: [{ items: steps(1, 'first'), scope: 'first_task' }, { start: 2 }], error: true, starts: 'Nothing changed: done and start take whole step numbers counted from 1, and the list has 1 step.' },
  { name: 'step 0 and fractions', calls: [{ items: steps(2, 'first'), scope: 'first_task' }, { done: [0, 1.5] }], error: true, starts: 'Nothing changed:' },
  { name: 'no plan yet: at most 12', calls: [{ start: 13 }], error: true, starts: 'Nothing changed: done and start take whole step numbers counted from 1, and a list has at most 12 steps.' },
  { name: 'a new items list resets the steps', calls: [{ items: steps(4, 'first'), scope: 'first_task' }, { items: steps(2, 'first'), scope: 'continuation' }, { done: [3] }],
    error: true, starts: 'Nothing changed: done and start take whole step numbers counted from 1, and the list has 2 steps.' },
];
for (const row of ROWS) {
  test(`update_plan: ${row.name}`, async () => {
    turnPlan.resetTurnPlans();
    const host = makeHost({ modules: [turnPlan] });
    let result;
    for (const args of row.calls) result = await host.call('thread-a', { name: 'update_plan', arguments: args });
    if (row.text !== undefined) assert.equal(text(result), row.text);
    if (row.starts !== undefined) assert.ok(text(result).startsWith(row.starts), text(result));
    assert.equal(result.isError === true, row.error === true);
  });
}

test('each session keeps its own plan; a sub-agent call (Codex names another thread) gets the official refusal', async () => {
  turnPlan.resetTurnPlans();
  const host = makeHost({ modules: [turnPlan] });
  await host.call('thread-a', { name: 'update_plan', arguments: { items: steps(3, 'first'), scope: 'first_task' } });
  assert.equal(text(await host.call('thread-b', { name: 'update_plan', arguments: { done: [3] } })), 'Plan updated.');
  assert.equal(text(await host.call('thread-a', { name: 'update_plan', arguments: { done: [3] } })), 'Plan updated: step 1 of 3 is in progress.');
  const sub = await host.call(null, { name: 'update_plan', arguments: { advance: true }, meta: { threadId: 'thread-b', session: null } });
  assert.equal(text(sub), 'Plan updated.');
  const refused = await host.call('thread-a', { name: 'update_plan', arguments: { advance: true }, meta: { threadId: 'sub-thread' } });
  assert.equal(refused.isError, true);
  assert.equal(text(refused), generated.SUBAGENT_TURN_TOOL_REFUSAL);
  // The refusal changed nothing.
  assert.equal(text(await host.call('thread-a', { name: 'update_plan', arguments: { start: 2 } })), 'Plan updated: steps 1, 2 of 3 are in progress; keep one and send {"done": [n]} for any you finished.');
});

test('tools/list: both tools are listed (never deferred) for every core; Codex gets them too and its own update_plan is turned off', async () => {
  const host = makeHost({ modules: [turnPlan], deferredGroups: () => ['workflow', 'monitor', 'schedule', 'findings', 'notebook', 'window'] });
  await host.start();
  try {
    const listed = host.listTools();
    assert.deepEqual(listed.map((tool) => tool.name), ['update_plan', 'wrap_up']);
    assert.deepEqual(listed.map((tool) => tool.title), ['Update task list', 'Wrap up turn']);
    for (const engine of ['codex', 'deepseek', 'kimi', 'qwen', 'gemini', 'opencode', 'zcode', 'mimo', 'minimax'])
      assert.ok(!(coreCapabilities({ engine }).nativeTools ?? []).includes('update_plan'), engine);
    const args = host.codexArgs();
    assert.equal(args.filter((value) => value === 'tools.update_plan.enabled=false').length, 1, 'Codex\'s built-in update_plan is off');
  } finally { host.stop(); }
});

test('wrap_up: the original checks and answers (recap required, buttons, app actions the row offers, endTurn meta)', async () => {
  turnPlan.resetTurnPlans();
  const host = makeHost({ modules: [turnPlan] });
  const wrap = (args) => host.call('thread-a', { name: 'wrap_up', arguments: args });
  const missing = await wrap({});
  assert.equal(missing.isError, true);
  assert.equal(text(missing), 'recap is required: what is now true or changed and where it stands, said to the user in two or three sentences.');
  const recapOnly = await wrap({ recap: 'Fixed the bug. Tests pass.' });
  assert.equal(text(recapOnly), 'Nothing is pending, so the app draws no box; the recap is the session\'s status. Your closing message is your answer to the user: write it now, as the last thing you say this turn.');
  assert.equal(recapOnly._meta, undefined);
  const asked = await wrap({ recap: 'Fixed the bug. Nothing committed.', ask: 'Commit it?', actions: [{ label: 'Yes, commit', message: 'Commit the fix' }] });
  assert.ok(text(asked).startsWith('Shown in the next-step box.'));
  assert.ok(text(asked).endsWith('The box ends your turn: write no text after this call, since the recap and question already say what the user needs.'));
  assert.deepEqual(asked._meta, { 'claude/endTurn': true }, 'the result meta passes the host through');
  // An app action the next-actions row does not offer is refused (getAvailableNextActions: what the renderer published).
  turnPlan.setAvailableNextActions('thread-a', ['archive']);
  const refused = await wrap({ recap: 'Done.', ask: 'Open a PR?', actions: [{ action: 'create_pr' }] });
  assert.equal(refused.isError, true);
  assert.ok(text(refused).startsWith('Not shown: create_pr does not hold right now (app actions available: archive)'), text(refused));
  const archive = await wrap({ recap: 'Done.', ask: 'Archive this session?', actions: [{ action: 'archive' }] });
  assert.ok(text(archive).startsWith('Shown in the next-step box.'));
  // update_plan lists the actions available now.
  const plan = await host.call('thread-a', { name: 'update_plan', arguments: { items: [{ content: 'a', status: 'in_progress' }], scope: 'first_task' } });
  assert.equal(text(plan), 'Plan shown (1 steps). App actions available now: archive.');
  assert.equal(turnPlan.setAvailableNextActions('thread-a', undefined), true);
  assert.equal(text(await host.call('thread-a', { name: 'update_plan', arguments: { advance: true } })), 'Plan updated: every step is done.');
  // Too many buttons, a clipped label, an "@": the original advice.
  const advice = await wrap({ recap: 'Done.', ask: 'Next?', actions: [{ label: 'Run the whole thing again please', message: '@x' }, { label: 'B' }, { label: 'C' }] });
  assert.match(text(advice), /actions is 1\u20132 buttons; this call had 3/);
  assert.match(text(advice), /The app drops a reply whose label or message contains "@"/);
  // A sub-agent's wrap_up (Codex names its thread): the official refusal.
  const sub = await host.call('thread-a', { name: 'wrap_up', arguments: { recap: 'x' }, meta: { threadId: 'sub-thread' } });
  assert.equal(text(sub), generated.SUBAGENT_TURN_TOOL_REFUSAL);
});

test('hooks (ft): a compaction in the turn that last updated the plan owes the official reminder, put in front of the next turn/start', async () => {
  turnPlan.resetTurnPlans();
  const host = makeHost({ modules: [turnPlan] });
  const isSession = (id) => id === 'thread-a';
  const items = [{ content: 'Read', status: 'completed' }, { content: 'Fix', status: 'in_progress' }, { content: 'Test', status: 'pending' }];
  await host.call('thread-a', { name: 'update_plan', arguments: { items, scope: 'first_task' } });
  const event = (method, params) => turnPlan.observe({ method, params: { threadId: 'thread-a', ...params } }, { isSession });
  const call = (tool, extra = {}) => ({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', ...extra });
  await event('turn/started', { turn: { id: 't1' } });
  await event('item/completed', { turnId: 't1', item: call('update_plan') });
  await event('item/completed', { turnId: 't1', item: { id: 'c', type: 'contextCompaction' } });
  const params = { threadId: 'thread-a', input: [{ type: 'text', text: 'next', text_elements: [] }] };
  await turnPlan.turnStart(params);
  assert.equal(params.input.length, 2);
  const reminder = params.input[0].text;
  assert.ok(reminder.startsWith('<system-reminder>\nAlso still to do in this turn, on top of what the summary above lists: keep the task list on the user\'s screen current, and when the work is done call mcp__code_desktop__wrap_up before any closing message.'), reminder);
  assert.ok(reminder.includes('\n1. completed\n2. in_progress\n3. pending\n'));
  assert.ok(reminder.includes('send mcp__code_desktop__update_plan {"advance": true}'));
  assert.ok(reminder.endsWith('Do not mention this note to the user.\n</system-reminder>'));
  assert.equal(params.input[1].text, 'next');
  // Owed once.
  const again = { threadId: 'thread-a', input: [] };
  await turnPlan.turnStart(again);
  assert.equal(again.input.length, 0);
  // Wrapped up in that turn, or a sub-agent thread's compaction: nothing owed.
  await event('item/completed', { turnId: 't1', item: { id: 'c2', type: 'contextCompaction' } });
  await event('item/completed', { turnId: 't1', item: call('wrap_up') });
  const wrapped = { threadId: 'thread-a', input: [] };
  await turnPlan.turnStart(wrapped);
  assert.equal(wrapped.input.length, 0);
  await turnPlan.observe({ method: 'item/completed', params: { threadId: 'sub', turnId: 't1', item: { id: 'c3', type: 'contextCompaction' } } }, { isSession });
  const sub = { threadId: 'sub', input: [] };
  await turnPlan.turnStart(sub);
  assert.equal(sub.input.length, 0);
  // A compaction in a later turn than the plan update: none (n.promptId !== t.prompt_id).
  await event('turn/started', { turn: { id: 't2' } });
  await event('item/completed', { turnId: 't2', item: { id: 'c4', type: 'contextCompaction' } });
  const later = { threadId: 'thread-a', input: [] };
  await turnPlan.turnStart(later);
  assert.equal(later.input.length, 0);
});

test('the server instructions carry no host wording about the task list (the official Code side has none)', () => {
  const { INSTRUCTIONS } = require('../electron/agent-tools-instructions.cjs');
  assert.ok(!INSTRUCTIONS.includes('update_plan'));
  assert.match(INSTRUCTIONS, /Verifying changes in the preview/);
});
