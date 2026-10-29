import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { CoworkSessions } from '../electron/cowork-runtime/session-service.mjs';

// w13-close-cowork-ui (reports/W13/closeout-items.md G3): main-process pieces of the Cowork closeout, as plain-node unit
// tests (no Electron, no GUI, no network).

async function vm(t) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-close-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const host = new EventEmitter(), events = [];
  host.request = async () => ({});
  host.stop = async () => {};
  const service = new CoworkSessions({ dataDir, host, provider: async model => ({ model: model || 'test', env: {} }),
    approveFolder: async cwd => cwd, approval: async () => ({ decision: 'decline' }), emit: event => events.push(event) });
  const { thread } = await service.request('thread/start', { cwd: dataDir, model: 'test' });
  const turn = () => service.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Do work' }] });
  const statuses = () => events.filter(event => event.method === 'thread/status/changed').map(event => event.params.status.type);
  const read = async () => (await service.request('thread/read', { threadId: thread.id })).thread;
  return { service, host, events, id: thread.id, turn, statuses, read };
}

// coworkui-session-states-01: the Cowork VM reports ThreadStatus systemError after a runtime failure, so the official
// ended notice ("This task has ended", c21f11e6d EM reason "failed") can show; source-cowork-session-states.jsx reads it.
test('Cowork VM: a turn the VM / SDK failed leaves the thread in systemError until the next turn', async t => {
  const f = await vm(t);
  await f.turn(); await setImmediate();
  assert.equal((await f.read()).status.type, 'active');
  f.host.emit('event', { event: 'exit', sessionId: f.id, error: 'VM went away' });
  assert.deepEqual(f.statuses(), ['active', 'systemError']);
  // thread/status/changed comes before turn/completed (turn/completed stays the last event of a turn).
  assert.equal(f.events.at(-1).method, 'turn/completed');
  assert.equal(f.events.at(-1).params.turn.status, 'failed');
  assert.equal((await f.read()).status.type, 'systemError');
  // The status is kept with the session (thread/list after a restart reads it from disk).
  const stored = JSON.parse(await fs.readFile(f.service.file(f.id), 'utf8'));
  assert.equal(stored.systemError.message, 'VM went away');
  // A new turn clears it.
  await f.turn(); await setImmediate();
  assert.equal((await f.read()).status.type, 'active');
  await f.service.stop();
});

test('Cowork VM: the disconnected runtime fails every live turn as a system error', async t => {
  const f = await vm(t);
  await f.turn(); await setImmediate();
  f.host.emit('event', { event: 'disconnected', error: 'socket closed' });
  assert.equal((await f.read()).status.type, 'systemError');
});

test('Cowork VM: a task the model finished with an error, and a stop, stay idle (not ended)', async t => {
  const f = await vm(t);
  await f.turn(); await setImmediate();
  f.host.emit('event', { event: 'message', sessionId: f.id, record: { type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['tool failed'] } });
  assert.equal((await f.read()).status.type, 'idle');
  assert.equal(f.statuses().at(-1), 'idle');
  await f.turn(); await setImmediate();
  const { turns } = await f.read();
  await f.service.request('turn/interrupt', { threadId: f.id, turnId: turns.at(-1).id });
  assert.equal((await f.read()).status.type, 'idle');
});

// coworkui-scheduled-01: every local Cowork task keeps an instructions folder (official Lea `<userData>/scheduled-tasks`,
// `<taskId>/SKILL.md` written by Gea); the delete dialog's "Also delete the folder that holds this task’s instructions"
// sends removeFiles, which removes that folder (official Ita), and nothing else.
import { createLocalRoutines, taskFilesDir, taskFileText, removeTaskFiles, TASK_FILE } from '../electron/local-routines.mjs';

async function scheduler(t) {
  const dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-close-routines-')));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const work = path.join(dataDir, 'work');
  await fs.mkdir(work);
  let rows = [];
  const service = createLocalRoutines({ getState: () => rows, commit: value => { rows = structuredClone(value); }, dataDir,
    approveFolder: value => value, captureOptions: async () => ({ coreId: 'fixture', model: 'm', permission: 'ask' }),
    launch: async () => ({}), setTimer: () => 1, clearTimer: () => {} });
  t.after(() => service.dispose());
  return { service, dataDir, work, rows: () => rows };
}
const exists = file => fs.stat(file).then(() => true, () => false);

test('local-routines: a Cowork task keeps its instructions in <dataDir>/scheduled-tasks/<id>/SKILL.md (official Gea text)', async t => {
  const f = await scheduler(t);
  const task = await f.service.request({ action: 'create', kind: 'cowork', name: 'Digest', description: 'Morning\nsummary', prompt: 'Summarize the inbox.', folder: f.work, cron: '0 9 * * *' });
  const dir = taskFilesDir(f.dataDir, task.id);
  assert.equal(dir, path.join(f.dataDir, 'scheduled-tasks', task.id));
  assert.equal(await fs.readFile(path.join(dir, TASK_FILE), 'utf8'), `---\nname: ${task.id}\ndescription: Morning summary\n---\n\nSummarize the inbox.`);
  await f.service.request({ action: 'update', id: task.id, name: 'Digest', prompt: 'Summarize the inbox twice.', cron: '0 9 * * *' });
  assert.match(await fs.readFile(path.join(dir, TASK_FILE), 'utf8'), /Summarize the inbox twice\.$/);
  // A Code task keeps none.
  const code = await f.service.request({ action: 'create', kind: 'code', name: 'Lint', prompt: 'Run the linter.', folder: f.work, cron: '0 9 * * *' });
  assert.equal(await exists(taskFilesDir(f.dataDir, code.id)), false);
  // Official asar text of the task file writer.
  const asar = await fs.readFile(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.ok(asar.includes('function Gea(e,t,n,r){return`---\\nname: ${e}\\ndescription: ${t}\\n${r?`model: ${r}\\n`:""}---\\n\\n${n}`}'));
  assert.ok(asar.includes('function Lea(){return(0,n.join)(CN(),"scheduled-tasks")}'));
  assert.ok(asar.includes('let u=Gea(t,Kea(i),r);'));
  assert.equal(taskFileText({ id: 'x', description: '', prompt: 'P' }), '---\nname: x\ndescription: \n---\n\nP');
});

test('local-routines: delete with removeFiles removes the instructions folder only; without it the folder stays', async t => {
  const f = await scheduler(t);
  const keep = await f.service.request({ action: 'create', kind: 'cowork', name: 'Keep', prompt: 'A', folder: f.work, cron: '0 9 * * *' });
  const drop = await f.service.request({ action: 'create', kind: 'cowork', name: 'Drop', prompt: 'B', cron: '0 9 * * *' });
  // A task saved without a working folder runs in its own folder (the scratch), which the delete takes too.
  assert.equal(drop.cwd, taskFilesDir(f.dataDir, drop.id));
  await fs.writeFile(path.join(f.work, 'notes.md'), 'mine');
  assert.deepEqual(await f.service.request({ action: 'delete', id: keep.id }), { deleted: true });
  assert.equal(await exists(path.join(taskFilesDir(f.dataDir, keep.id), TASK_FILE)), true);
  assert.deepEqual(await f.service.request({ action: 'delete', id: drop.id, removeFiles: true }), { deleted: true, filesRemoved: true });
  assert.equal(await exists(taskFilesDir(f.dataDir, drop.id)), false);
  // The folder the task worked in is untouched.
  assert.equal(await fs.readFile(path.join(f.work, 'notes.md'), 'utf8'), 'mine');
  assert.deepEqual(f.rows().map(task => task.id), []);
});

test('local-routines: removeTaskFiles refuses names outside the base, symlinks and missing folders', async t => {
  const f = await scheduler(t);
  assert.equal(taskFilesDir(f.dataDir, '../work'), null);
  assert.equal(taskFilesDir(f.dataDir, 'Upper'), null);
  assert.equal(await removeTaskFiles(f.dataDir, '../work'), false);
  assert.equal(await removeTaskFiles(f.dataDir, 'missing'), false);
  await fs.mkdir(path.join(f.dataDir, 'scheduled-tasks'), { recursive: true });
  await fs.symlink(f.work, path.join(f.dataDir, 'scheduled-tasks', 'linked'));
  assert.equal(await removeTaskFiles(f.dataDir, 'linked'), false);
  assert.equal(await exists(f.work), true);
});

// E67: the Outputs "Instructions · CLAUDE.md" editor reads and writes through main "cowork-claude-md"
// (electron/cowork-runtime/claude-md.mjs): a CLAUDE.md in the session's own folders only.
import { coworkClaudeMd, claudeMdTarget, CLAUDE_MD_LIMIT } from '../electron/cowork-runtime/claude-md.mjs';

async function claudeMdFixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-claude-md-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const userData = path.join(root, 'userData'), granted = path.join(root, 'project'), other = path.join(root, 'other');
  for (const dir of [userData, granted, path.join(granted, 'sub'), other]) await fs.mkdir(dir, { recursive: true });
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: '0f8fad5b-d9cb-469f-a165-70867728950e', folders: [granted] } };
  const options = { userData, metadata: id => (id === 'T' ? meta : undefined), vmFolder: () => null };
  return { root, userData, granted, other, meta, options };
}

test('cowork-claude-md: reads "" before the file exists, writes and reads back a CLAUDE.md in a granted folder', async t => {
  const f = await claudeMdFixture(t);
  const file = path.join(f.granted, 'CLAUDE.md');
  assert.deepEqual(await coworkClaudeMd({ threadId: 'T', path: file }, f.options), { content: '' });
  assert.equal(await coworkClaudeMd({ threadId: 'T', path: file, content: '# Notes\nUse metric units.' }, f.options), true);
  assert.equal(await fs.readFile(file, 'utf8'), '# Notes\nUse metric units.');
  assert.deepEqual(await coworkClaudeMd({ threadId: 'T', path: file }, f.options), { content: '# Notes\nUse metric units.' });
  // Shorter content replaces the whole file.
  await coworkClaudeMd({ threadId: 'T', path: file, content: 'x' }, f.options);
  assert.equal(await fs.readFile(file, 'utf8'), 'x');
  // A subfolder of a granted folder is the session's too.
  assert.equal(await coworkClaudeMd({ threadId: 'T', path: path.join(f.granted, 'sub', 'CLAUDE.md'), content: 'sub' }, f.options), true);
});

test('cowork-claude-md: refuses other names, other folders, relative / non-normal paths, symlinks, non-Cowork sessions, oversize', async t => {
  const f = await claudeMdFixture(t);
  const refused = (p) => assert.rejects(Promise.resolve().then(() => coworkClaudeMd(p, f.options)), /can’t be opened here/);
  await refused({ threadId: 'T', path: path.join(f.granted, 'notes.md'), content: 'x' });
  await refused({ threadId: 'T', path: path.join(f.other, 'CLAUDE.md'), content: 'x' });
  await refused({ threadId: 'T', path: 'project/CLAUDE.md' });
  await refused({ threadId: 'T', path: `${f.granted}/sub/../../other/CLAUDE.md`, content: 'x' });
  await refused({ threadId: 'T', path: path.join(f.userData, 'CLAUDE.md'), content: 'x' });
  await refused({ threadId: 'nope', path: path.join(f.granted, 'CLAUDE.md') });
  await refused({ threadId: 'T', path: path.join(f.granted, 'CLAUDE.md'), content: 'x'.repeat(CLAUDE_MD_LIMIT + 1) });
  // A CLAUDE.md that is a link to a file elsewhere is neither read nor written through.
  await fs.writeFile(path.join(f.other, 'secret.md'), 'secret');
  await fs.symlink(path.join(f.other, 'secret.md'), path.join(f.granted, 'CLAUDE.md'));
  await refused({ threadId: 'T', path: path.join(f.granted, 'CLAUDE.md') });
  await refused({ threadId: 'T', path: path.join(f.granted, 'CLAUDE.md'), content: 'overwrite' });
  assert.equal(await fs.readFile(path.join(f.other, 'secret.md'), 'utf8'), 'secret');
  // A folder link out of the granted folder is judged by its real path.
  await fs.symlink(f.other, path.join(f.granted, 'escape'));
  await refused({ threadId: 'T', path: path.join(f.granted, 'escape', 'CLAUDE.md'), content: 'x' });
});

test('cowork-claude-md: a Cowork VM session writes in its own folder only', async t => {
  const f = await claudeMdFixture(t);
  const options = { userData: f.userData, metadata: () => undefined, vmFolder: id => (id === 'cw-1' ? f.granted : null) };
  assert.equal(await coworkClaudeMd({ threadId: 'cw-1', path: path.join(f.granted, 'CLAUDE.md'), content: 'vm' }, options), true);
  await assert.rejects(Promise.resolve().then(() => coworkClaudeMd({ threadId: 'cw-1', path: path.join(f.other, 'CLAUDE.md'), content: 'x' }, options)));
  assert.equal(await claudeMdTarget(path.join(f.granted, 'CLAUDE.md'), { vmFolder: f.granted, userData: f.userData }), path.join(f.granted, 'CLAUDE.md'));
});

// Source wiring (read as text, never executed): main.cjs's IPC cases, the renderer bridge, and the hT audit.
const appDir = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFile(path.join(appDir, rel), 'utf8');

test('E67 wiring: the Outputs bridge reads / writes CLAUDE.md through main "cowork-claude-md"', async () => {
  const main = await read('electron/main.cjs');
  assert.equal(main.split('case "cowork-claude-md": return (await import("./cowork-runtime/claude-md.mjs")).coworkClaudeMd(p, { userData: app.getPath("userData"), metadata: (id) => config.sessionMetadata?.[id], vmFolder: (id) => coworkSessions?.owns(id) ? coworkSessions.load(id).thread.cwd : null });').length, 2);
  const bridge = await read('src/source-cowork-progress-v3-adapters.jsx');
  assert.match(bridge, /readLocalFile: \(sessionId, encodedPath\) => desktopCall\("cowork-claude-md", \{ threadId: sessionId, path: decodeURIComponent\(encodedPath\) \}\)/);
  assert.match(bridge, /writeLocalFile: async \(sessionId, encodedPath, content\) =>\n\s+\(await desktopCall\("cowork-claude-md", \{ threadId: sessionId, path: decodeURIComponent\(encodedPath\), content \}\)\) === true/);
  // The official calls the bridge answers (c21f11e6d PS / FS, LS's path).
  const c21 = await fs.readFile(path.resolve(appDir, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c21f11e6d-Cyd8_HO8.js'), 'utf8');
  for (const needle of ['await _t?.readLocalFile?.(e,encodeURIComponent(t))', 'await _t?.writeLocalFile?.(e,encodeURIComponent(t),n)', 'y=`${n}/CLAUDE.md`'])
    assert.ok(c21.includes(needle), needle);
});

test('scheduled-02 wiring: main reads keepAwakeEnabled (default off) and desktop-settings holds the computer awake while it is on', async () => {
  const main = await read('electron/main.cjs');
  assert.ok(main.includes('case "keep-awake-read": return { keepAwakeEnabled: config?.keepAwakeEnabled === true };'));
  const { desktopPatch, createDesktopSettings } = await import('../electron/desktop-settings.cjs');
  assert.deepEqual(desktopPatch({ keepAwakeEnabled: true }), { keepAwakeEnabled: true });
  assert.throws(() => desktopPatch({ keepAwakeEnabled: 'yes' }), /Invalid desktop setting/);
  let config = { keepAwakeEnabled: true, keepAwake: false };
  const started = [], stopped = [];
  const listeners = {};
  const settings = createDesktopSettings({ app: { dock: null, getLoginItemSettings: () => ({}) }, powerSaveBlocker: { start: kind => { started.push(kind); return 7; }, stop: id => stopped.push(id) },
    powerMonitor: { on(name, fn) { listeners[name] = fn; }, removeListener() {}, isOnBatteryPower: () => true, getSystemIdleTime: () => 0 },
    Notification: { isSupported: () => false }, getConfig: () => config, getClient: () => null, sessionOperations: {}, save() {}, emit() {}, getWindow: () => null });
  settings.start();
  assert.deepEqual(started, ['prevent-app-suspension'], 'held from launch, on battery too');
  config = { keepAwakeEnabled: false, keepAwake: false };
  settings.power();
  assert.deepEqual(stopped, [7]);
  settings.dispose();
  const asar = await fs.readFile(path.resolve(appDir, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.ok(asar.includes('function Yjr(){Hy("keepAwakeEnabled")===!0?mU(Jjr):hU(Jjr)}'));
  assert.ok(asar.includes('pU=a.powerSaveBlocker.start("prevent-app-suspension")'));
});

// coworkui-home-gates-01: shared-78 hT (`K()?.desktopHome?.status==="supported"`, export hy) means an admin's desktopHome
// policy is in force; with none the main process answers "unavailable". No generated module copies it, and the one graph
// that reaches it (cowork-home ce266b9be `hy as re`) takes the host answer false.
test('home-gates-01: hT is "no policy = unavailable" everywhere the host reaches it', async () => {
  const generated = path.join(appDir, 'src/generated');
  const hits = [];
  for (const dir of await fs.readdir(generated)) {
    let files = [];
    try { files = await fs.readdir(path.join(generated, dir)); } catch { continue; }
    for (const file of files.filter(name => /\.(m?js|jsx)$/.test(name))) {
      const text = await fs.readFile(path.join(generated, dir, file), 'utf8');
      if (/desktopHome\?\.status/.test(text)) hits.push(`${dir}/${file}`);
    }
  }
  assert.deepEqual(hits, [], 'no copy of hT');
  const home = JSON.parse(await read('src/generated/cowork-home/manifest.json'));
  assert.ok(JSON.stringify(home).includes('useDesktopHomeSupported'));
  assert.match(await read('src/source-cowork-home-v3-adapters.jsx'), /export const useDesktopHomeSupported = \(\) => false;/);
  const shared78 = await fs.readFile(path.resolve(appDir, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-78-D5Fw2h0a.js'), 'utf8');
  assert.ok(shared78.includes('function hT(){return K()?.desktopHome?.status==="supported"}') && shared78.includes('hT as hy'));
  // The host's own readers never assume it: the Home segment name is D11's "Claude", not an hT branch.
  assert.doesNotMatch(await read('src/app-switch-model.mjs'), /desktopHome/);
});

// Review fix scheduled-03 (title): ccd3f68fe nu creates a template's task with the template's title
// (`y({prompt:t.text,title:m.formatMessage($l[e.title]),…})`). source-routines hands it over ({title}); main keeps it with
// the pending send and names the new session with it (thread/name/set, as a Rename, even on a core that titles its own
// sessions), with no generated title replacing it.
test('scheduled-03 title: a template task is named with the template title', async () => {
  const official = await fs.readFile(path.resolve(appDir, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/ccd3f68fe-C8Xiv_qI.js'), 'utf8');
  assert.ok(official.includes('y({prompt:t.text,title:m.formatMessage($l[e.title]),draftSelections:'));
  assert.match(await read('src/source-routines.jsx'), /onStartTemplate\(prompt\.text, \{ title: prompt\.title \}\)/);
  const main = await read('src/main.jsx');
  // w13-close-cowork-misc (E77, coworkui-placeholder-02): the handler now starts with the Cowork surface guard.
  assert.ok(main.includes("onStartTemplate={async (prompt, { title } = {}) => { if (!coworkSurfaceListed()) return; await switchMode('cowork'); startSessionFromSearch(prompt, 'cowork', { title }); }}"));
  assert.ok(main.includes('pendingSearchTitle.current = typeof title === "string" && title.trim() ? title.trim() : null;'));
  assert.match(main, /const title = pendingSearchTitle\.current;\n    pendingSearchSend\.current = null;\n    pendingSearchTitle\.current = null;\n    void send\(title \? \{ title \} : undefined\);/);
  assert.ok(main.includes('async function send({ priority, title } = {}) {'));
  assert.ok(main.includes('await sendMessage(draft, attachments, mentions, { priority, title });'));
  assert.ok(main.includes('demonstration = null, title: startTitle = null } = {}) {'));
  assert.ok(main.includes('const name = demonstration ? demonstration.title : startTitle || firstMessageName('));
  assert.ok(main.includes('if (name.trim() && (startTitle || !coreSupports(boot?.core, "generatesTitles"))) await rpc("thread/name/set", { threadId: id, name });'));
  assert.ok(main.includes('if (name.trim() && text.trim() && !startTitle && coreSupports(boot?.core, "titleRequest")) void requestThreadTitle('));
  // The ⌘K palette's Start a session passes the text alone: no title, the first-message name as before.
  assert.match(await read('src/source-sidebar-palette.jsx'), /onStartSession\(term\)/);
});
