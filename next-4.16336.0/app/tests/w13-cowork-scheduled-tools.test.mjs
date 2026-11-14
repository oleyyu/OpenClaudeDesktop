// w13-coworkfn-schedtools (research/w13-coworkfn.md O-31/O-32/O-38, cwf-28/29/39): the scheduled-tasks tools on the durable
// scheduler (electron/agent-tools/scheduled-tasks.mjs over electron/local-routines.mjs), a Cowork task's folder grant, and
// save_skill / propose_skills (electron/agent-tools/skills-cowork.mjs). The official copy is checked against the 3.6556.2
// snapshot's raw chunks (read as text, never run).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as scheduled from '../electron/agent-tools/scheduled-tasks.mjs';
import * as skills from '../electron/agent-tools/skills-cowork.mjs';
import { createLocalRoutines, routineFolders } from '../electron/local-routines.mjs';
import { captureRoutineOptions } from '../electron/routine-runner.mjs';
import { createCoworkStorage } from '../electron/cowork-runtime/core-cowork.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const APP = new URL('..', import.meta.url).pathname;
const SNAPSHOT = path.join(APP, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const TASKS = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-4pfKIHOP.js'), 'utf8');
const H5I = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-h5ilKUwe.js'), 'utf8');
const JPK = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
const CARDS_CHUNK = fs.readFileSync(path.join(SNAPSHOT, 'ion-dist/assets/v1/cc32965c2-BQu1bA_w.js'), 'utf8');
const SKILL_CARD = fs.readFileSync(path.join(SNAPSHOT, 'ion-dist/assets/v1/shared-12-Dro5Rhl0.js'), 'utf8');
const MAIN = fs.readFileSync(path.join(APP, 'electron/main.cjs'), 'utf8');
// The minified chunks keep non-ASCII characters as \uXXXX escapes; a template literal escapes its backticks, a "…" string its quotes.
const raw = (text) => text.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const inChunk = (chunk, text) => [raw(text), raw(text).replace(/`/g, '\\`'), raw(text).replace(/"/g, '\\"'), raw(text).replace(/\n/g, '\\n')].some((form) => chunk.includes(form));
const sentences = (text) => text.split(/\n+/).flatMap((line) => line.split(/(?<=[.!?:;])\s+(?=[A-Z*"`(-])/)).map((part) => part.trim()).filter(Boolean);
// The non-SSH branch of a ${…} inside an official sentence: the sentence is checked piece by piece around it.
const BRANCHES = ["in the task's working folder"];
const officialSentence = (chunk, sentence) => inChunk(chunk, sentence) || BRANCHES.some((branch) => sentence.includes(branch) && chunk.includes(`"${branch}"`)
  && sentence.split(branch).map((piece) => piece.trim()).filter(Boolean).every((piece) => inChunk(chunk, piece)));
const unchange = (text) => scheduled.DESCRIPTION_CHANGES.reduce((value, [official, local]) => value.split(local).join(official), text);
const tool = (module, name) => module.tools.find((entry) => entry.name === name);
const tmp = (prefix) => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
const fill = (text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

async function fixture(t, { permission = 'ask', folders = [] } = {}) {
  const dataDir = tmp('w13-sched-data-');
  let state = [], clock = Date.now();
  const launched = [];
  const routines = createLocalRoutines({ getState: () => state, commit: (value) => { state = structuredClone(value); }, dataDir,
    approveFolder: (value) => value,
    captureOptions: async (execution, previous) => captureRoutineOptions({ config: { model: 'm1', permission }, coreId: 'fixture', models: [{ model: 'm1' }], execution, previous }),
    launch: async (task, { attach }) => { launched.push(task); attach(`run-${launched.length}`); return { turnId: 'turn-1' }; },
    now: () => clock, setTimer: () => 1, clearTimer: () => {} });
  routines.start();
  t.after(() => routines.dispose());
  const userData = tmp('w13-sched-user-');
  const storage = await createCoworkStorage(userData);
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders } };
  const approvals = [];
  let answer = true;
  const service = {
    request: (p) => routines.request(p), grantFolders: (id, dirs, options) => routines.grantFolders(id, dirs, options),
    taskOfSession: (id) => routines.taskOfSession(id), permission: () => permission, t: (text) => text,
    session: (id) => ({ title: `Session ${id}`, archived: false }),
  };
  const ctx = (sessionId = 'thread-cw') => ({ sessionId, routines: service, cowork: { meta: () => meta, userData },
    requestApproval: async (request) => { approvals.push(request); return answer; } });
  return { routines, service, ctx, approvals, launched, state: () => state, answer: (value) => { answer = value; }, advance: (ms) => { clock += ms; }, dataDir };
}
const call = (name, args, ctx) => tool(scheduled, name).handler(args, ctx);
const textOf = (result) => result.content.map((part) => part.text).join('');

test('scheduled-tasks: names, descriptions and parameter text are the official 4pfKIHOP ones, the local changes listed', () => {
  assert.equal(scheduled.group, 'scheduled-tasks');
  assert.deepEqual(scheduled.surfaces, ['cowork']);
  assert.ok(JPK.includes('"scheduled-tasks"'));
  const names = ['list_scheduled_tasks', 'create_scheduled_task', 'update_scheduled_task', 'delete_scheduled_task', 'run_scheduled_task', 'list_task_runs'];
  assert.deepEqual(scheduled.tools.map((entry) => entry.name), names);
  for (const name of names) assert.ok(TASKS.includes(`n("${name}",`), name);
  // Every official sentence a local one replaces is in the chunk, the local one is used, the official one is not.
  const text = [...Object.values(scheduled.DESCRIPTIONS), ...Object.values(scheduled.PARAMETERS)].join('\n');
  for (const [official, local] of scheduled.DESCRIPTION_CHANGES) {
    assert.ok(inChunk(TASKS, official), official);
    assert.ok(text.includes(local), local);
    assert.ok(!text.includes(official), official);
  }
  // With the changes undone, each sentence of each description and parameter is official text.
  for (const [name, description] of Object.entries(scheduled.DESCRIPTIONS)) {
    assert.equal(tool(scheduled, name).description, description);
    for (const sentence of sentences(unchange(description))) assert.ok(officialSentence(TASKS, sentence), `${name}: ${sentence}`);
  }
  for (const [key, description] of Object.entries(scheduled.PARAMETERS)) {
    if (key === 'limit') { assert.equal(description, 'How many runs to return, newest first. Default 10, max 50.'); assert.ok(TASKS.includes('`How many runs to return, newest first. Default ${S}, max ${C}.`') && TASKS.includes('S=10,C=50')); continue; }
    for (const sentence of sentences(unchange(description))) assert.ok(officialSentence(TASKS, sentence), `${key}: ${sentence}`);
  }
  assert.ok(inChunk(TASKS, scheduled.APPROVALS_NOTE) && inChunk(TASKS, scheduled.AUTO_NOTE));
  // Required parameters as the official zod schema (title, cronExpression, fireAt, enabled optional; no notifyOnCompletion here).
  assert.deepEqual(tool(scheduled, 'create_scheduled_task').inputSchema.required, ['taskId', 'prompt', 'description']);
  assert.deepEqual(Object.keys(tool(scheduled, 'update_scheduled_task').inputSchema.properties), ['taskId', 'title', 'prompt', 'description', 'cronExpression', 'fireAt', 'enabled']);
  // The cards: ion-dist cc32965c2's scheduled-task wording beside its id, each with its zh-CN entry.
  for (const [key, id] of [['create', 'FVvIrkHUz9'], ['update', 'QZAg46QwWQ'], ['delete', 'UNcKVi1IoG'], ['run', 'fqWlxHD8pe'], ['runNote', 'p6iQZgn4ra'], ['manual', 'OvEYf4MH3Y'],
    ['nameLabel', 'IXuOczM/hP'], ['newPrompt', '68tCwrUJbn'], ['description', 'Q8Qw5BZ1VA'], ['schedule', '3dgy02jMxX'], ['paused', 'Wgins8THpZ']])
    assert.ok(CARDS_CHUNK.includes(`${key === 'delete' ? 'removeTitle' : key === 'nameLabel' || key === 'runNote' || key === 'manual' || key === 'paused' ? key : key === 'newPrompt' ? 'newPromptLabel' : key === 'description' ? 'descriptionLabel' : key === 'schedule' ? 'scheduleLabel' : `${key}Title`}:{defaultMessage:"${raw(scheduled.CARDS[key])}",id:"${id}"}`), key);
  for (const value of Object.values(scheduled.CARDS)) assert.equal(typeof zh[value], 'string', value);
});

test('surfaces: only a Cowork session is offered the scheduled-task and skill tools', async () => {
  const surfaceOf = { 'thread-cw': 'cowork', 'thread-code': 'code', 'thread-chat': 'chat' };
  const host = createAgentToolsHost({ modules: [scheduled, skills], tmpRoot: tmp('w13-sched-host-'), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(surfaceOf, key ?? '') ? { id: key, cwd: '/' } : null; },
    requestApproval: async () => true });
  host.provide('sessionSurface', ({ id }) => surfaceOf[id] ?? 'code');
  host.provide('routines', () => ({ request: async () => [] }));
  await host.ready();
  const listed = (id) => host.sessionToolLists(id).tools.map((entry) => entry.name).filter((name) => name !== 'load_tools');
  assert.deepEqual(listed('thread-cw'), [...scheduled.tools, ...skills.tools].map((entry) => entry.name));
  assert.deepEqual(listed('thread-code'), []);
  assert.deepEqual(listed('thread-chat'), []);
  await assert.rejects(host.call('thread-code', { name: 'list_scheduled_tasks', arguments: {} }), /isn’t available in this session/);
  const result = await host.call('thread-cw', { name: 'list_scheduled_tasks', arguments: {} });
  assert.equal(textOf(result), 'No scheduled tasks found. Use create_scheduled_task to create one.');
});

test('create_scheduled_task: checks before the card, the official card, a Cowork task under its taskId, the official result', async (t) => {
  const folderA = tmp('w13-sched-a-'), folderB = tmp('w13-sched-b-');
  const f = await fixture(t, { folders: [folderA, folderB] });
  assert.match(textOf(await call('create_scheduled_task', { taskId: 'x', prompt: 'p', description: 'd', cronExpression: '0 9 * * *', fireAt: '2099-01-01T00:00:00Z' }, f.ctx())), /^Provide either cronExpression \(recurring\) or fireAt \(one-time\), not both\.$/);
  assert.match(textOf(await call('create_scheduled_task', { taskId: 'x', prompt: 'p', description: 'd', cronExpression: '61 * * * *' }, f.ctx())), /^Invalid cron expression: "61 \* \* \* \*"\. Please provide a valid 5-field cron expression/);
  assert.match(textOf(await call('create_scheduled_task', { taskId: 'x', prompt: 'p', description: 'd', fireAt: 'soon' }, f.ctx())), /^Invalid fireAt timestamp: "soon"\./);
  assert.match(textOf(await call('create_scheduled_task', { taskId: 'x', prompt: 'p', description: 'd', fireAt: '2000-01-01T00:00:00Z' }, f.ctx())), /^fireAt must be in the future\./);
  assert.equal(f.approvals.length, 0);
  f.answer(false);
  const declined = await call('create_scheduled_task', { taskId: 'Daily Brief!', prompt: 'Summarize my notes.', description: 'Morning summary', cronExpression: '0 9 * * *' }, f.ctx());
  assert.equal(declined.isError, true);
  assert.equal(textOf(declined), 'User rejected create_scheduled_task. Please acknowledge this and suggest alternative approaches.');
  assert.equal(f.state().length, 0);
  // w13-close-main-process (E63 coworkfn-schedtools-06): the folders the task will keep are on the card, one per line.
  assert.deepEqual(f.approvals[0], { kind: 'other', tool: 'create_scheduled_task', title: 'Allow Claude to create the scheduled task Daily brief?', detail: `Morning summary\n\nSchedule: ${require('../electron/schedule-service.cjs').humanSchedule('0 9 * * *')}\n\nSummarize my notes.\n\n${fs.realpathSync(folderA)}\n${fs.realpathSync(folderB)}` });
  f.answer(true);
  const created = await call('create_scheduled_task', { taskId: 'Daily Brief!', title: 'Morning brief', prompt: 'Summarize my notes.', description: 'Morning summary', cronExpression: '0 9 * * *' }, f.ctx());
  assert.equal(created.isError, undefined);
  const [task] = f.state();
  assert.equal(task.id, 'daily-brief');
  assert.equal(task.kind, 'cowork');
  assert.equal(task.name, 'Morning brief');
  assert.equal(task.cron, '0 9 * * *');
  assert.equal(task.cwd, folderA);
  assert.deepEqual(task.folders, [folderA, folderB]);
  assert.deepEqual(routineFolders(task, f.dataDir), [folderA, folderB]);
  assert.match(textOf(created), new RegExp(`^Scheduled task "daily-brief" created\\.\\n\\n\\*\\*Runs in:\\*\\* ${folderA}\\n\\*\\*Schedule:\\*\\* .+\\n\\*\\*Next run:\\*\\* .+\\n\\nThe task will run automatically according to the schedule\\. You can manage it from the "Scheduled" section in the sidebar\\.\\n\\n`));
  assert.ok(textOf(created).endsWith(scheduled.APPROVALS_NOTE));
  // The official checks on a taken id and a taken title, before any card.
  const before = f.approvals.length;
  assert.equal(textOf(await call('create_scheduled_task', { taskId: 'daily-brief', prompt: 'p', description: 'd' }, f.ctx())), 'A scheduled task with ID "daily-brief" already exists. Use update_scheduled_task to modify it, or choose a different taskId.');
  assert.equal(textOf(await call('create_scheduled_task', { taskId: 'other', title: 'morning BRIEF', prompt: 'p', description: 'd' }, f.ctx())), 'A scheduled task is already listed as "Morning brief" (id "daily-brief"). Choose a different title.');
  assert.equal(f.approvals.length, before);
});

test('create_scheduled_task: a one-time and a manual task; a Bypass default is saved as Auto with the official Auto note', async (t) => {
  const f = await fixture(t, { permission: 'bypass' });
  const once = await call('create_scheduled_task', { taskId: 'remind', prompt: 'Remind me.', description: 'Reminder', fireAt: new Date(Date.now() + 3 * 36e5).toISOString() }, f.ctx());
  assert.match(textOf(once), /^Scheduled task "remind" created\.\n\n\*\*Runs in:\*\* .+\n\*\*Will run once at:\*\* .+ \(in [23] hours\)\n\nThe task will auto-disable after running\./);
  assert.ok(textOf(once).endsWith(scheduled.AUTO_NOTE));
  assert.equal(f.state()[0].options.permission, 'auto');
  // No folder: the task's scratch folder, which a run session isn't given as a folder.
  assert.ok(f.state()[0].cwd.startsWith(path.join(f.dataDir, 'scheduled-tasks')));
  assert.deepEqual(routineFolders(f.state()[0], f.dataDir), []);
  const manual = await call('create_scheduled_task', { taskId: 'adhoc', prompt: 'Do it.', description: 'Ad hoc' }, f.ctx());
  assert.match(textOf(manual), /\*\*Schedule:\*\* Manual only \(no automatic schedule\)\n\nThis task will not run automatically\./);
  assert.equal(f.approvals.at(-1).detail, 'Ad hoc\n\nRuns only when you start it.\n\nDo it.');
});

test('list_scheduled_tasks and update_scheduled_task follow local-routines; update is partial and carded', async (t) => {
  const f = await fixture(t);
  await f.routines.request({ action: 'create', kind: 'code', name: 'Code task', prompt: 'x', folder: f.dataDir });
  await call('create_scheduled_task', { taskId: 'brief', prompt: 'Old prompt.', description: 'Brief', cronExpression: '0 9 * * *' }, f.ctx());
  const listed = JSON.parse(textOf(await call('list_scheduled_tasks', {}, f.ctx())));
  assert.equal(listed.length, 1, 'Cowork tasks only');
  assert.deepEqual(Object.keys(listed[0]), ['taskId', 'title', 'description', 'prompt', 'schedule', 'cronExpression', 'enabled', 'nextRunAt', 'jitterSeconds']);
  assert.equal(listed[0].taskId, 'brief');
  assert.equal(listed[0].title, 'Brief');
  assert.equal(listed[0].prompt, 'Old prompt.');
  assert.equal(listed[0].nextRunAt, new Date(f.state().find((task) => task.id === 'brief').nextRunAt + listed[0].jitterSeconds * 1000).toISOString());
  assert.equal(textOf(await call('update_scheduled_task', { taskId: 'nope', prompt: 'x' }, f.ctx())), 'Scheduled task "nope" not found. Use list_scheduled_tasks to see available tasks.');
  assert.equal(textOf(await call('update_scheduled_task', { taskId: 'brief' }, f.ctx())), 'No updates provided for task "brief". Supply at least one of: title, prompt, description, cronExpression, fireAt, enabled.');
  const updated = await call('update_scheduled_task', { taskId: 'brief', prompt: 'New prompt.' }, f.ctx());
  assert.equal(textOf(updated), `Scheduled task "brief" updated: prompt.\nListed as: Brief\n\n${scheduled.APPROVALS_NOTE}`);
  assert.deepEqual(f.approvals.at(-1), { kind: 'other', tool: 'update_scheduled_task', title: 'Allow Claude to update the scheduled task Brief?', detail: 'New prompt:\nNew prompt.' });
  let task = f.state().find((value) => value.id === 'brief');
  assert.equal(task.prompt, 'New prompt.');
  assert.equal(task.cron, '0 9 * * *', 'a partial update keeps the schedule');
  // A fireAt clears the cron (and the reverse); enabled false pauses.
  // 36 hours ahead: official $na floors, so exactly 24h would read "in 23 hours" a millisecond later.
  const at = new Date(Date.now() + 36 * 36e5).toISOString();
  assert.match(textOf(await call('update_scheduled_task', { taskId: 'brief', fireAt: at }, f.ctx())), /^Scheduled task "brief" updated: one-time run at .+ \(tomorrow\)\.\nListed as: Brief$/);
  task = f.state().find((value) => value.id === 'brief');
  assert.equal(task.cron, null);
  assert.equal(task.fireAt, new Date(at).getTime());
  await call('update_scheduled_task', { taskId: 'brief', title: 'Renamed', enabled: false }, f.ctx());
  task = f.state().find((value) => value.id === 'brief');
  assert.equal(task.name, 'Renamed');
  assert.equal(task.enabled, false);
  assert.equal(f.approvals.at(-1).detail, 'New name: Renamed\n\nPaused');
  f.answer(false);
  assert.equal(textOf(await call('update_scheduled_task', { taskId: 'brief', title: 'Again' }, f.ctx())), 'User rejected update_scheduled_task. Please acknowledge this and suggest alternative approaches.');
  assert.equal(f.state().find((value) => value.id === 'brief').name, 'Renamed');
});

test('run_scheduled_task, list_task_runs and delete_scheduled_task: carded, the official refusals, run sessions can’t act on their task', async (t) => {
  const f = await fixture(t);
  await call('create_scheduled_task', { taskId: 'brief', prompt: 'Go.', description: 'Brief' }, f.ctx());
  f.answer(false);
  assert.equal(textOf(await call('run_scheduled_task', { taskId: 'brief' }, f.ctx())), 'The user didn\'t approve running scheduled task "brief".');
  assert.equal(f.launched.length, 0);
  f.answer(true);
  const run = await call('run_scheduled_task', { taskId: 'brief' }, f.ctx());
  assert.equal(textOf(run), 'Scheduled task "brief" dispatched as session run-1. The app starts it the way a scheduled run starts (the task\'s stored permission mode and tool approvals), so it appears within a few seconds. Follow the run with get_session {"session_id":"run-1"} or list_events, or call list_task_runs.');
  assert.deepEqual(f.approvals.at(-1), { kind: 'other', tool: 'run_scheduled_task', title: 'Allow Claude to run the scheduled task Brief?', detail: scheduled.CARDS.runNote });
  assert.equal(textOf(await call('run_scheduled_task', { taskId: 'brief' }, f.ctx())), 'Scheduled task "brief" is already running in session run-1. Follow it with get_session / list_events instead of starting another run.');
  // w13-close-main-process (closeout coworkfn-schedtools-03): list_task_runs asks first (4pfKIHOP confirmListRuns; the
  // card cc32965c2 zXJJSvRNeF); declined, the official refusal.
  f.answer(false);
  assert.equal(textOf(await call('list_task_runs', { taskId: 'brief' }, f.ctx())), "Listing routine runs isn't available in this session.");
  assert.deepEqual(f.approvals.at(-1), { kind: 'other', tool: 'list_task_runs', title: 'Allow Claude to read the run history of the scheduled task Brief?', detail: '' });
  f.answer(true);
  const runs = JSON.parse(textOf(await call('list_task_runs', { taskId: 'brief' }, f.ctx())));
  assert.deepEqual({ ...runs, runs: runs.runs.map(({ started_at, last_activity_at, ...rest }) => rest) },
    { taskId: 'brief', taskDeleted: false, totalRuns: 1, runs: [{ session_id: 'run-1', title: 'Session run-1', status: 'running', archived: false }] });
  f.routines.observe({ method: 'turn/completed', params: { threadId: 'run-1', turn: { id: 'turn-1', status: 'completed' } } });
  assert.equal(JSON.parse(textOf(await call('list_task_runs', { taskId: 'brief' }, f.ctx()))).runs[0].status, 'succeeded');
  // The run's own session can neither run nor delete its task.
  assert.equal(textOf(await call('run_scheduled_task', { taskId: 'brief' }, f.ctx('run-1'))), 'Refusing to run a scheduled task from a scheduled-task run session. Run it from a regular session instead.');
  assert.equal(textOf(await call('delete_scheduled_task', { taskId: 'brief' }, f.ctx('run-1'))), 'Refusing to delete the scheduled task that launched this session. Delete it from a regular session instead.');
  await call('update_scheduled_task', { taskId: 'brief', enabled: false }, f.ctx());
  assert.equal(textOf(await call('run_scheduled_task', { taskId: 'brief' }, f.ctx())), 'Scheduled task "brief" is disabled, so it can\'t run. Ask the user to run it from the routine\'s page; don\'t re-enable it to run it once.');
  const deleted = await call('delete_scheduled_task', { taskId: 'brief' }, f.ctx());
  assert.equal(textOf(deleted), 'Scheduled task "brief" deleted.\nListed as: Brief');
  assert.equal(f.approvals.at(-1).title, 'Allow Claude to delete the scheduled task Brief?');
  assert.equal(f.state().length, 0);
  assert.equal(textOf(await call('list_task_runs', { taskId: 'brief' }, f.ctx())), 'Scheduled task "brief" not found. Use list_scheduled_tasks to see available tasks.');
});

test('save_skill / propose_skills: official text, the core’s user skills folder, the official SKILL.md and results', async (t) => {
  assert.equal(skills.group, 'cowork-skills');
  assert.deepEqual(skills.surfaces, ['cowork']);
  for (const name of ['save_skill', 'propose_skills']) assert.ok(JPK.includes(`="${name}"`), name);
  assert.ok(inChunk(H5I, skills.SAVE_SKILL_CHANGE[0]));
  assert.ok(skills.SAVE_SKILL_CHANGE[0].startsWith(skills.SAVE_SKILL_CHANGE[1].replace("user's skills folder", "user's account")));
  assert.ok(inChunk(H5I, skills.DESCRIPTIONS.propose_skills));
  for (const text of Object.values(skills.PARAMETERS)) assert.ok(inChunk(H5I, text), text);
  assert.ok(SKILL_CARD.includes(`defaultMessage:"${skills.CARDS.save}",id:"QvmjxZ7K5S"`));
  assert.equal(typeof zh[skills.CARDS.save], 'string');
  assert.equal(typeof zh[skills.CARDS.update], 'string');
  // h5i j: the frontmatter, quoted and escaped.
  assert.ok(H5I.includes('return`---\\nname: "${r(e)}"\\ndescription: "${r(t)}"\\n---\\n\\n${n}\\n`'));
  assert.equal(skills.skillFile('a', 'say "hi"\nnow', 'Body'), '---\nname: "a"\ndescription: "say \\"hi\\" now"\n---\n\nBody\n');
  // The connected core's first "~/…" skill folder; Codex has none.
  assert.equal(skills.userSkillRoot({ engine: 'deepseek' }, '/h'), '/h/.dsh/skills');
  assert.equal(skills.userSkillRoot({ engine: 'codex' }, '/h'), '/h/.codex/skills');
  assert.equal(skills.userSkillRoot({ engine: 'mystery-core' }, '/h'), null);
  const home = tmp('w13-skill-home-');
  const approvals = [];
  let answer = true;
  const ctx = { skills: { serverInfo: () => ({ engine: 'deepseek' }), t: (text) => text }, requestApproval: async (request) => { approvals.push(request); return answer; } };
  const original = os.homedir;
  os.homedir = () => home;
  t.after(() => { os.homedir = original; });
  const save = (args) => tool(skills, 'save_skill').handler(args, ctx);
  // userSkillRoot reads the real home by default: point the core at a root inside the temporary home instead.
  const realRoot = skills.userSkillRoot({ engine: 'deepseek' });
  assert.equal(realRoot, path.join(home, '.dsh/skills'));
  assert.equal(textOf(await save({ name: 'Bad Name', description: 'd', content: 'c' })), 'Failed to save skill: Use lowercase letters, digits and dashes for the skill name.');
  answer = false;
  assert.equal(textOf(await save({ name: 'notes', description: 'When taking notes', content: '# Notes' })), 'User rejected save_skill. Please acknowledge this and suggest alternative approaches.');
  assert.equal(fs.existsSync(path.join(realRoot, 'notes')), false);
  answer = true;
  const saved = await save({ name: 'notes', description: 'When taking notes', content: '# Notes' });
  assert.equal(textOf(saved), "Saved skill 'notes'. It will be available in new conversations, not in this one.");
  assert.equal(fs.readFileSync(path.join(realRoot, 'notes/SKILL.md'), 'utf8'), '---\nname: "notes"\ndescription: "When taking notes"\n---\n\n# Notes\n');
  assert.deepEqual(approvals.at(-1), { kind: 'other', tool: 'save_skill', title: 'Save skill', detail: 'notes\nWhen taking notes\n\n# Notes' });
  const count = approvals.length;
  assert.equal(textOf(await save({ name: 'notes', description: 'x', content: 'y' })), "Skill 'notes' already exists. Call save_skill again with overwrite: true to update it.");
  assert.equal(approvals.length, count, 'no card for a refused save');
  fs.writeFileSync(path.join(realRoot, 'notes/extra.md'), 'kept');
  assert.equal(textOf(await save({ name: 'notes', description: 'x', content: 'y', overwrite: true })), "Updated skill 'notes'. The updated skill will be available in new conversations.");
  assert.equal(approvals.at(-1).title, 'Update “notes”?');
  assert.equal(fs.readFileSync(path.join(realRoot, 'notes/extra.md'), 'utf8'), 'kept');
  assert.match(fs.readFileSync(path.join(realRoot, 'notes/SKILL.md'), 'utf8'), /description: "x"/);
  // A link in place of the skill folder is refused.
  fs.symlinkSync(home, path.join(realRoot, 'linked'));
  assert.match(textOf(await save({ name: 'linked', description: 'x', content: 'y', overwrite: true })), /^Failed to save skill: .+ isn’t a skill folder\.$/);
  // A core without a user skills folder.
  assert.equal(textOf(await tool(skills, 'save_skill').handler({ name: 'notes', description: 'x', content: 'y' }, { ...ctx, skills: { serverInfo: () => ({ engine: 'mystery-core' }) } })),
    'Failed to save skill: mystery-core has no skills folder to save to.');
  // propose_skills: render-only, the official answer, the proposals for the card.
  const propose = (proposals) => tool(skills, 'propose_skills').handler({ proposals }, {});
  const proposal = { name: 'weekly-report', kind: 'new', description: 'Weekly report', skillMd: '---\nname: weekly-report\n---' };
  const shown = await propose([proposal]);
  assert.ok(inChunk(H5I, 'skill proposal(s) to the user for review. The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above. Continue with the next phase; do not wait for them to respond.'));
  assert.equal(textOf(shown), 'Shown 1 skill proposal(s) to the user for review. The card renders at this point in your reply and anything you write next appears below it, so refer to it as the card above. Continue with the next phase; do not wait for them to respond.');
  assert.deepEqual(shown.structuredContent, { proposals: [proposal] });
  await assert.rejects(propose([{ ...proposal, kind: 'improvement' }]), /target is required when kind is 'improvement'/);
  await assert.rejects(propose([proposal, proposal, proposal, proposal]), /between 1 and 3/);
});

test('main.cjs provides the routines and skills services next to the cowork tools', () => {
  const cowork = MAIN.indexOf('agentTools.provide("cowork", (session) => ({');
  const routines = MAIN.indexOf('agentTools.provide("routines", () => ({');
  const skillsAt = MAIN.indexOf('agentTools.provide("skills", () => ({');
  assert.ok(cowork > 0 && routines > cowork && skillsAt > routines);
  assert.ok(MAIN.slice(routines, skillsAt).includes('request: (p) => localRoutines.request(p), grantFolders: (id, dirs, options) => localRoutines.grantFolders(id, dirs, options)'));
  assert.ok(MAIN.slice(routines, skillsAt).includes('taskOfSession: (id) => localRoutines.taskOfSession(id)'));
});
