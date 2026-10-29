// w13-close-main-process (plan-w13-closeout.md G6, reports/W13/closeout-items.md G6): the main-process closeout items —
// Cowork / scheduled-task tool rows, SendUserFile off Cowork, Chat read-only, a Chat version's surface, the trusted
// folder dwell and the scheduled task's folder consent, a Cowork run's folders / Cowork off / the cowork-vm move, the
// Cowork storage cleanup and prompt, the Go-area menu rebuild, incognito chats at a quit, "always" in a scheduled run
// (E70), the delete-guard gap (E71) and a VM run's suggested rules. Official chunks are only read, never run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appToolLabel } from '../src/agent-tool-titles.mjs';
import * as files from '../electron/agent-tools/files.mjs';
import * as cowork from '../electron/agent-tools/cowork.mjs';
import { enforceChatReadOnly } from '../electron/surface-policy.mjs';
import { rememberFork, sessionSurfaceResolver } from '../electron/chat-context.mjs';
import * as folderPolicy from '../electron/cowork-runtime/folder-policy.mjs';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { createRoutineRunner, VM_CORE_ID } from '../electron/routine-runner.mjs';
import { createCoworkStorage, coworkStoragePaths, decorateCoworkStart, decorateCoworkTurn, keepCoworkPrompt, removeCoworkStorage } from '../electron/cowork-runtime/core-cowork.mjs';
import { createChatHistory } from '../electron/chat-history.mjs';
import * as policy from '../electron/cowork-runtime/approval-policy.mjs';
import { storedRule, suggestionRules, suggestionsCovered, SUGGESTION_RULE } from '../electron/routine-approvals.mjs';
import zhIndex from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const v1 = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const build = (file) => fs.readFileSync(path.join(snapshot, 'asar/.vite/build', file), 'utf8');
const MAIN = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
const MAIN_JSX = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
const zh = zhIndex; // (its own "default" key is a translation)
const tmp = (prefix) => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

test('tool rows: Cowork and scheduled-task tools say the 3.6556.2 verbs (c52b02f3f msg / G / Qn), in zh too', () => {
  const chunk = v1('c52b02f3f-BejopSz8.js');
  const rows = {
    request_cowork_directory: ['Asking to access a folder', 'Asked to access a folder', 'Failed to request folder access'],
    allow_cowork_file_delete: ['Asking to delete a file', 'Asked to delete a file', 'Failed to request file deletion'],
    present_files: ['Sharing files', 'Shared files', 'Failed to share files'],
    launch_code_session: ['Opening Claude Code', 'Opened Claude Code', 'Failed to open Claude Code'],
    save_skill: ['Saving skill', 'Saved skill', 'Failed to save skill'],
    propose_skills: ['Suggesting skills', 'Suggested skills', 'Failed to suggest skills'],
    list_scheduled_tasks: ['Listing scheduled tasks', 'Listed scheduled tasks', 'Failed to list scheduled tasks'],
    create_scheduled_task: ['Creating scheduled task', 'Created scheduled task', 'Failed to create scheduled task'],
    update_scheduled_task: ['Updating scheduled task', 'Updated scheduled task', 'Failed to update scheduled task'],
    delete_scheduled_task: ['Deleting scheduled task', 'Deleted scheduled task', 'Failed to delete scheduled task'],
    run_scheduled_task: ['Starting scheduled task', 'Started scheduled task', 'Failed to start scheduled task'],
    list_task_runs: ['Listing scheduled task runs', 'Listed scheduled task runs', 'Failed to list scheduled task runs'],
  };
  for (const [tool, [busy, done, failed]] of Object.entries(rows)) {
    const item = { type: 'mcpToolCall', server: 'code_desktop', tool, arguments: {} };
    assert.deepEqual(appToolLabel(item, 'busy'), { label: busy, meta: null }, tool);
    assert.deepEqual(appToolLabel(item, 'done'), { label: done, meta: null }, tool);
    assert.deepEqual(appToolLabel(item, 'failed'), { label: failed, meta: null }, tool);
    for (const text of [busy, done, failed]) {
      assert.ok(chunk.includes(`defaultMessage:"${text}"`), `c52b02f3f: ${text}`);
      assert.equal(typeof zh[text], 'string', `zh: ${text}`);
    }
  }
  assert.ok(chunk.includes('"mcp__scheduled-tasks__list_task_runs":h({running:{defaultMessage:"Listing scheduled task runs"'));
});

test('SendUserFile serves Chat and Code only: a Cowork session presents files with present_files (E63 tools-06)', () => {
  assert.deepEqual(files.surfaces, ['chat', 'code']);
  assert.deepEqual(cowork.surfaces, ['cowork']);
  assert.ok(cowork.tools.some((tool) => tool.name === 'present_files'));
  assert.ok(build('index.chunk-jPKPzV-P.js').includes('b7t="present_files"'));
  assert.ok(!build('index.chunk-h5ilKUwe.js').includes('SendUserFile'), 'the official Cowork server (h5i) has no SendUserFile');
});

test('Chat runs read-only whatever was asked (closeout chatfn-projects-02); main enforces it after the decorators', () => {
  const start = { cwd: '/Users/me/project', sandbox: 'danger-full-access', approvalPolicy: 'never' };
  assert.equal(enforceChatReadOnly('thread/start', start, { surface: 'chat' }), true);
  assert.equal(start.sandbox, 'read-only');
  const profile = { threadId: 'c', permissions: { profile: 'x' } };
  assert.equal(enforceChatReadOnly('thread/resume', profile, { metadata: { c: { surface: 'chat' } } }), true);
  assert.deepEqual(profile, { threadId: 'c', sandbox: 'read-only' });
  // A resume or a turn naming another surface stays on the thread's recorded one.
  const turn = { threadId: 'c', sandboxPolicy: { type: 'workspaceWrite', writableRoots: ['/Users/me/project'], networkAccess: true } };
  assert.equal(enforceChatReadOnly('turn/start', turn, { surface: 'code', metadata: { c: { surface: 'chat' } } }), true);
  assert.deepEqual(turn.sandboxPolicy, { type: 'readOnly', networkAccess: false });
  const code = { threadId: 'k', sandbox: 'workspace-write' };
  assert.equal(enforceChatReadOnly('thread/resume', code, { metadata: { k: { surface: 'code' } } }), false);
  assert.equal(code.sandbox, 'workspace-write');
  assert.equal(enforceChatReadOnly('thread/start', { sandbox: 'workspace-write' }, { surface: 'cowork' }), false);
  const decorate = MAIN.indexOf('        instructionsService.decorate(p.method, params);');
  const enforce = MAIN.indexOf('(await import("./surface-policy.mjs")).enforceChatReadOnly(p.method, params, { surface: requestedSurface, metadata: config.sessionMetadata });');
  assert.ok(decorate > 0 && enforce > decorate && enforce - decorate < 800, 'right after instructionsService.decorate');
});

test('a Chat version (thread/fork) lists the Chat tools from the start (closeout chatfn-context-01)', () => {
  const params = { threadId: 'parent', config: { 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': 'start-fork-1' } };
  rememberFork({ sessionMetadata: { parent: { surface: 'chat' } } }, params);
  const resolve = sessionSurfaceResolver(() => ({ sessionMetadata: {} }));
  assert.equal(resolve({ id: null, identity: 'start-fork-1' }), 'chat');
  const code = { threadId: 'other', config: { 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': 'start-fork-2' } };
  rememberFork({ sessionMetadata: {} }, code);
  assert.equal(resolve({ id: null, identity: 'start-fork-2' }), 'code');
  assert.match(MAIN, /if \(method === "thread\/fork"\) \{ try \{ require\("\.\/chat-context\.mjs"\)\.rememberFork\(config, params\); \}/);
  assert.ok(MAIN.indexOf('require("./chat-context.mjs").rememberFork(config, params)') > MAIN.indexOf('params.config = { ...(params.config && typeof params.config === "object" ? params.config : {}), [AGENT_SESSION_KEY]: identity };'));
});

test('consents: Trust folder sooner than 700 ms is Cancel; a task’s new folders ask with the official copy (DWMzDpbf)', async (t) => {
  const dwmz = build('index.chunk-DWMzDpbf.js');
  assert.ok(dwmz.includes('CONSENT_ALLOW_MIN_DWELL_MS:()=>700'));
  assert.equal(folderPolicy.CONSENT_ALLOW_MIN_DWELL_MS, 700);
  for (const text of ['title:"Folder access for a scheduled task"', 'this scheduled task', 'the scheduled task "${e}"',
    'to access this folder on every run?', 'to access these ${t} folders on every run?',
    "scope:\"Every run of this task \\u2014 including runs while you're away \\u2014 will be able to read and modify files here, and run commands that access these folders, until you remove them from the task or delete it. Because the task runs in the cloud, files it uses leave your device and are processed on Anthropic's servers.\""])
    assert.ok(dwmz.includes(text), text);
  assert.ok(build('index.chunk-BtY4LlaK.js').includes('detail:`${n.join(`\\n`)}\\n\\n${p.scope}`'), 'grantRoutineFolders lists the folders, then the scope');
  // trustedAdd: an answer read in time adds the folder; an early press is Cancel.
  const userData = tmp('w13-close-mp-'), folder = tmp('w13-close-mp-folder-');
  t.after(() => { fs.rmSync(userData, { recursive: true, force: true }); fs.rmSync(folder, { recursive: true, force: true }); });
  let clock = 0, wait = 0;
  const dialog = { showMessageBox: async () => { clock += wait; return { response: 0 }; } };
  const service = folderPolicy.createCoworkFolderService({ userData, dialog, window: () => ({ isDestroyed: () => false }), now: () => clock });
  wait = 100;
  assert.equal((await service.run({ op: 'trusted-add', path: folder })).status, 'cancelled');
  wait = 800;
  assert.equal((await service.run({ op: 'trusted-add', path: folder })).status, 'added');
  // The task's consent: the named task, the folders, Allow first and Cancel the default.
  const dialogOptions = folderPolicy.routineConsentDialog('Morning “brief”\u0007', ['/a']);
  assert.deepEqual({ ...dialogOptions, detail: dialogOptions.detail.split('\n')[0] }, { type: 'question', buttons: ['Allow', 'Cancel'], defaultId: 1, cancelId: 1,
    title: 'Folder access for a scheduled task', message: 'Allow the scheduled task "Morning brief" to access this folder on every run?', detail: '/a' });
  assert.equal(folderPolicy.routineConsentDialog(undefined, ['/a', '/b']).message, 'Allow this scheduled task to access these 2 folders on every run?');
  for (const key of Object.values({ a: folderPolicy.MESSAGES.routineTitle, b: folderPolicy.MESSAGES.routineThisTask, c: folderPolicy.MESSAGES.routineNamedTask,
    d: folderPolicy.MESSAGES.routineOneFolder, e: folderPolicy.MESSAGES.routineFolders, f: folderPolicy.MESSAGES.routineScope }))
    assert.equal(typeof zh[key], 'string', key);
  const answers = [];
  const consent = folderPolicy.createRoutineFolderConsent({ dialog: { showMessageBox: async (_owner, options) => { answers.push(options); clock += wait; return { response: 0 }; } },
    window: () => ({ isDestroyed: () => false }), t: (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => values?.[k] ?? m), now: () => clock });
  wait = 800;
  assert.equal(await consent({ name: 'Brief', folders: ['/a'] }), true);
  wait = 10;
  assert.equal(await consent({ name: 'Brief', folders: ['/a'] }), false);
  assert.equal(await folderPolicy.createRoutineFolderConsent({ dialog: { showMessageBox: async () => ({ response: 0 }) }, window: () => null })({ folders: ['/a'] }), false, 'no window: Cancel');
});

test('a task’s folders granted from the renderer: only new ones ask; declined, additions drop and removals stay (E63 schedtools-06)', async (t) => {
  const dataDir = tmp('w13-close-mp-routines-'), a = tmp('w13-close-mp-a-'), b = tmp('w13-close-mp-b-');
  t.after(() => { for (const dir of [dataDir, a, b]) fs.rmSync(dir, { recursive: true, force: true }); });
  let state = [], allow = true;
  const asked = [];
  const routines = createLocalRoutines({ getState: () => state, commit: (value) => { state = structuredClone(value); }, dataDir, approveFolder: (value) => value,
    confirmFolders: async (request) => { asked.push(request); return allow; },
    captureOptions: async () => ({ coreId: 'fixture', model: 'm', effort: null, permission: 'ask', networkAccess: false }),
    launch: async () => ({}), now: () => 1, setTimer: () => 1, clearTimer: () => {} });
  t.after(() => routines.dispose());
  const task = await routines.request({ action: 'create', kind: 'cowork', name: 'Weekly brief', prompt: 'p', cron: '0 9 * * 1' });
  assert.deepEqual((await routines.request({ action: 'grant-folders', id: task.id, folders: [a] })).granted, [a]);
  assert.deepEqual(asked, [{ name: 'Weekly brief', folders: [a] }]);
  allow = false;
  const declined = await routines.request({ action: 'grant-folders', id: task.id, folders: [b] });
  assert.equal(declined.declined, true);
  assert.deepEqual(asked.at(-1).folders, [b], 'only the new folder is asked about');
  assert.deepEqual(routines.folderGrant(task.id), [], 'the removal of a still applies');
  // The model's own grants (create_scheduled_task's card, a run's "always") never ask again.
  await routines.grantFolders(task.id, [a], { addOnly: true });
  assert.deepEqual(routines.folderGrant(task.id), [a]);
  assert.equal(asked.length, 2);
});

test('a Cowork run: its task’s folders, Cowork off, and a cowork-vm task moved once (schedtools-01, E63 engine-04)', async (t) => {
  const dataDir = tmp('w13-close-mp-run-'), folder = tmp('w13-close-mp-folder-');
  t.after(() => { fs.rmSync(dataDir, { recursive: true, force: true }); fs.rmSync(folder, { recursive: true, force: true }); });
  const log = [], moved = [];
  let reason = null;
  const host = { owner: 'core', coreId: 'codex', models: [{ model: 'gpt', isDefault: true, defaultReasoningEffort: 'medium' }], hints: false, autoReview: false };
  const launch = createRoutineRunner({ context: async () => host, dataDir, coworkUnavailable: () => reason, migrateTask: async (task, options) => { moved.push([task.id, options]); },
    rpc: async ({ method, params }) => { log.push([method, params]); return method === 'thread/start' ? { thread: { id: 'run-1' } } : method === 'turn/start' ? { turn: { id: 'turn-1' } } : {}; } });
  const base = { id: 'brief', kind: 'cowork', name: 'Brief', prompt: 'p', cwd: folder, folders: ['/Users/me/Reports'], options: { coreId: 'codex', model: 'gpt', permission: 'ask', networkAccess: false } };
  await launch(base, { attach: () => {} });
  assert.deepEqual(log[0][1].codeDesktop.coworkFolders, [folder, '/Users/me/Reports']);
  // The task's scratch folder is not a folder to connect; no folders: [] (never the home page's drafts).
  log.length = 0;
  await launch({ ...base, cwd: path.join(dataDir, 'scheduled-tasks', 'brief'), folders: [] }, { attach: () => {} });
  assert.deepEqual(log[0][1].codeDesktop.coworkFolders, []);
  // A Code task is unchanged.
  log.length = 0;
  reason = 'Cowork is off.';
  await assert.rejects(launch(base, { attach: () => {} }), /^Error: Cowork is off\.$/);
  assert.equal(log.length, 0);
  reason = null;
  // A task saved for the Cowork VM engine moves to the core Cowork runs on now (its model too, when that one isn't offered).
  await launch({ ...base, options: { ...base.options, coreId: VM_CORE_ID, model: 'claude-sonnet' } }, { attach: () => {} });
  assert.deepEqual(moved, [['brief', { coreId: 'codex', model: 'gpt', permission: 'ask', networkAccess: false, effort: 'medium' }]]);
  assert.equal(log.at(-1)[0], 'turn/start');
  assert.match(MAIN, /dataDir: app\.getPath\('userData'\), coworkUnavailable: \(\) => \(COWORK_ENABLED \? null : i18n\.t\(COWORK\.reasonMessage\.text, COWORK\.reasonMessage\.values\)\),\n\s+migrateTask: \(task, options\) => localRoutines\.migrateOptions\(task\.id, options\),/);
});

test('Cowork storage: removed when thread/start fails or the session is deleted; the Cowork prompt survives custom instructions (engine-01/02)', async (t) => {
  const userData = tmp('w13-close-mp-storage-');
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const storage = await createCoworkStorage(userData);
  fs.writeFileSync(path.join(storage.outputs, 'report.md'), '#');
  assert.equal(await removeCoworkStorage(userData, storage.id), true);
  assert.equal(fs.existsSync(storage.root), false);
  assert.equal(await removeCoworkStorage(userData, storage.id), false, 'missing is fine');
  assert.equal(await removeCoworkStorage(userData, '../../etc'), false);
  // A link in the storage's place is never followed.
  const outside = tmp('w13-close-mp-outside-');
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const fake = coworkStoragePaths(userData, '00000000-0000-4000-8000-000000000000');
  fs.symlinkSync(outside, fake.root);
  await assert.rejects(removeCoworkStorage(userData, '00000000-0000-4000-8000-000000000000'), /app-owned/);
  assert.equal(fs.existsSync(outside), true);
  // The prompt: decorateCoworkStart wrote it; a custom global prompt replaced the developer instructions; it comes back.
  const kept = await createCoworkStorage(userData);
  const params = { cwd: '/x', developerInstructions: 'You are a task assistant in OpenClaude Desktop Cowork. Help the user complete work with documents, research, data and files. For multi-step work, maintain a concise plan using the plan tool. Work in the selected working directory. Preserve source files unless asked to change them. Create useful deliverables and link to their actual file paths in the final answer. Follow the user language; do not claim work finished without checking the result.' };
  decorateCoworkStart(params, { storage: kept, folders: ['/Users/me/Docs'] });
  const prompt = params.developerInstructions;
  params.developerInstructions = 'My own rules.';
  keepCoworkPrompt(params, { storage: kept, folders: ['/Users/me/Docs'] });
  assert.equal(params.developerInstructions, `My own rules.\n\n${prompt}`);
  keepCoworkPrompt(params, { storage: kept, folders: ['/Users/me/Docs'] });
  assert.equal(params.developerInstructions, `My own rules.\n\n${prompt}`, 'once');
  // main.cjs: right after instructionsService.decorate; the failed start and the delete both clean up.
  assert.match(MAIN, /instructionsService\.decorate\(p\.method, params\);\n[^\n]*\n\s+if \(coworkStart\) require\("\.\/cowork-runtime\/core-cowork\.mjs"\)\.keepCoworkPrompt\(params, \{ storage: coworkStart, folders: coworkStart\.folders \}\);/);
  assert.match(MAIN, /if \(coworkStart\) void require\("\.\/cowork-runtime\/core-cowork\.mjs"\)\.removeCoworkStorage\(app\.getPath\("userData"\), coworkStart\.id\)/);
  assert.match(MAIN, /coreCoworkMetadata\(config\.sessionMetadata\?\.\[id\]\)\?\.storage; if \(storageId\) void require\("\.\/cowork-runtime\/core-cowork\.mjs"\)\.removeCoworkStorage\(app\.getPath\("userData"\), storageId\)/);
});

test('menus: a Go-area checkbox rebuilds the menu right after it dispatches (closeout surfaces-menus-01, jPK xSi)', () => {
  assert.ok(build('index.chunk-jPKPzV-P.js').includes('click:(t,n,r)=>{$1(r,(t=>t.dispatchSelectArea(e.id)),null),setImmediate(CM)}'));
  const body = MAIN.slice(MAIN.indexOf('function menuEmit(e, target) {'), MAIN.indexOf('// Pane windows keep their own traffic-light origin'));
  const rebuild = body.indexOf('if (e?.kind === "select-area") setImmediate(() => { try { installAppMenu(); }');
  assert.ok(rebuild > 0 && rebuild < body.indexOf('windowRegistry.send(window, e)'), 'and the event still reaches the renderer');
});

test('incognito: a quit deletes this run’s incognito chats at once, within its budget; main waits for it before the cores stop', async () => {
  const deleted = [];
  const config = { sessionMetadata: { a: { surface: 'chat', incognito: true }, b: { surface: 'chat', incognito: true }, c: { surface: 'chat' } } };
  const history = createChatHistory({ getConfig: () => config, deleteThread: async (id) => { if (id === 'b') await new Promise(() => {}); deleted.push(id); } });
  history.noteLive('a'); history.noteLive('b'); history.noteLive('c');
  const result = await history.quit({ budgetMs: 20 });
  assert.deepEqual(deleted, ['a']);
  assert.deepEqual(result, { deleted: ['a'], failed: ['b'] }, 'b is left to the next launch’s sweep');
  const stop = MAIN.slice(MAIN.indexOf('  stop: async () => {'));
  assert.ok(stop.indexOf('await quitChatHistory?.quit().catch(() => {});') > 0 && stop.indexOf('await quitChatHistory?.quit()') < stop.indexOf('stopAllCodexClients()'));
  assert.match(MAIN, /quitChatHistory = chatHistory;/);
});

test('E70: in a scheduled run "always" (Allow for this task) and "scheduled" both keep the rule on the task, as Dl8 does', () => {
  const dl8 = build('index.chunk-Dl8NPgw7.js');
  assert.ok(dl8.includes('case"always":case"scheduled":{'));
  assert.ok(dl8.includes('n==="always"&&i.scriptCard?.allowForTask?.(),this.persistAlwaysAllowDecision(i,o)'), 'the only difference is a script card');
  assert.deepEqual(policy.decisionToCore('always'), policy.decisionToCore('scheduled'));
  assert.deepEqual(policy.decisionToCore('always'), { decision: 'acceptForSession' });
});

test('E71: a delete inside a Cowork turn’s writable roots never reaches the guard — the known gap, locked as it is', async (t) => {
  const userData = tmp('w13-close-mp-gap-'), folder = tmp('w13-close-mp-gap-folder-');
  t.after(() => { fs.rmSync(userData, { recursive: true, force: true }); fs.rmSync(folder, { recursive: true, force: true }); });
  const storage = await createCoworkStorage(userData);
  const turn = decorateCoworkTurn({ sandboxPolicy: { type: 'workspaceWrite', writableRoots: [] } }, { storage, folders: [folder] });
  // The connected folder is a writable root: Codex runs `rm` there without asking, so no approval event exists.
  assert.ok(turn.sandboxPolicy.writableRoots.includes(folder));
  const answers = [];
  const guard = policy.createCoworkDeleteGuard({ meta: () => ({ surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders: [folder] } }),
    grants: () => [folder], allowed: () => false });
  // The guard acts on approval requests only: the command's own item events pass.
  for (const event of [{ kind: 'notification', method: 'item/started', params: { threadId: 'cw', item: { type: 'commandExecution', id: 'x', command: `rm -rf ${folder}/old` } } },
    { kind: 'notification', method: 'item/completed', params: { threadId: 'cw', item: { type: 'commandExecution', id: 'x', command: `rm -rf ${folder}/old`, status: 'completed' } } }])
    assert.equal(guard.receive(event, {}, (owner, p) => { answers.push(p); return { ok: true }; }), false);
  assert.deepEqual(answers, []);
  // cowork.mjs says so where deleteAllowed is defined, and points at the reports.
  const source = fs.readFileSync(path.join(app, 'electron/agent-tools/cowork.mjs'), 'utf8');
  assert.match(source, /A known gap \(E71, reports\/W13\/w13-coworkfn-approvals\.md/);
  assert.doesNotMatch(source, /Not enforced yet: this has no caller/);
});

test('a VM scheduled run keeps the CLI’s suggested rules on its task; a later ask they cover runs without a card', () => {
  const suggestions = [{ type: 'addRules', behavior: 'allow', destination: 'session', rules: [{ toolName: 'Bash', ruleContent: 'npm test:*' }, { toolName: 'WebFetch' }] },
    { type: 'addRules', behavior: 'deny', rules: [{ toolName: 'Bash', ruleContent: 'rm:*' }] }, { type: 'setMode', mode: 'acceptEdits' }];
  const rules = suggestionRules(suggestions);
  assert.deepEqual(rules, [{ toolName: 'Bash', ruleContent: 'npm test:*', source: SUGGESTION_RULE }, { toolName: 'WebFetch', source: SUGGESTION_RULE }]);
  assert.deepEqual(rules.map(storedRule), rules, 'kept as they are');
  assert.equal(storedRule({ toolName: 'Bash', ruleContent: 'npm test:*' }), null, 'a host command rule still needs its folder');
  const task = { approvedPermissions: rules };
  assert.equal(suggestionsCovered(task, suggestions), true);
  assert.equal(suggestionsCovered(task, [{ type: 'addRules', behavior: 'allow', rules: [{ toolName: 'Bash', ruleContent: 'npm run build' }] }]), false);
  assert.equal(suggestionsCovered(task, []), false);
  assert.deepEqual(policy.suggestionToolNames(suggestions), ['WebFetch'], 'jPK SEr: only whole-tool allow rules');
  assert.ok(build('index.chunk-jPKPzV-P.js').includes('function SEr(e){let t=[];for(let n of e)if(!(n.type!=="addRules"||n.behavior!=="allow"||!n.rules))for(let e of n.rules)e.ruleContent??t.push(e.toolName);return t}'));
  assert.match(MAIN, /routines: \{ taskOfSession: \(id\) => localRoutines\?\.taskOfSession\(id\) \?\? null, rememberApproval: \(taskId, rule\) => localRoutines\?\.rememberApproval\(taskId, rule\) \},/);
});

test('deleting a chat drops its tool switches too (chatfn-tools review low 10)', async () => {
  const config = { chatTools: { defaults: { enabled_web_search: true }, threads: { gone: { compass_mode: 'advanced' }, kept: { enabled_web_search: false } } } };
  let saved = 0;
  const history = createChatHistory({ getConfig: () => config, save: () => { saved += 1; } });
  await history.cascade('gone');
  assert.deepEqual(config.chatTools, { defaults: { enabled_web_search: true }, threads: { kept: { enabled_web_search: false } } });
  assert.equal(saved, 1);
});

test('main.jsx / main.cjs small blocks: the tool name on an "other" card, tools-list read as a Chat opens', () => {
  assert.match(MAIN, /if \(kind === "other"\) Object\.assign\(tool, \{ title: cardText\(request\.title, 300\), detail: cardText\(request\.detail\), \.\.\.\(typeof request\.tool === "string"/);
  assert.ok(v1('cc1aae219-CeSwM-tp.js').includes('toolName:v||n.name,rawToolName:n.name'));
  assert.match(MAIN_JSX, /if \(\(menu\?\.kind !== "add" && section !== "projects" && mode !== "chat"\) \|\| !toolSelection\) return;/);
  assert.match(MAIN_JSX, /\}, \[menu\?\.kind, section === "projects", toolSelection, mode === "chat" \? current \?\? "new" : null\]\);/);
});
