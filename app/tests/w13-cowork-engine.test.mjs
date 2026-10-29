// w13-coworkfn-engine (research/w13-coworkfn.md O-1~O-6/O-14/O-15, cwf-01/02/04/05/06/07/08/45): Cowork is available by
// the official yukonSilver rules and a new Cowork session runs on the connected core (the official 3P host loop) in its
// own storage, with the session's folders as its writable roots and a system prompt that names them. Pure models only
// (electron/cowork-runtime/engine-policy.mjs, core-cowork.mjs, surface-policy.mjs coworkInstructions) plus text locks on
// main.cjs; official chunks are read as text, never run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { asarSource } from '../scripts/official-3.6556.2.mjs';
import {
  LOCAL_CORE_ENGINE, VM_ENGINE, UNSUPPORTED_PLATFORM, UNSUPPORTED_ARCHITECTURE, UNSUPPORTED_MACOS, UNSUPPORTED_WINDOWS, TURNED_OFF,
  coworkAvailability, coworkEngine, selectCoworkEngine, systemVersionParts,
} from '../electron/cowork-runtime/engine-policy.mjs';
import {
  COWORK_STORAGE_DIR, VM_SESSION_REFUSAL, HOST_SESSION_REFUSAL, VM_UNAVAILABLE, STORAGE_NOT_OWNED,
  coworkStoragePaths, createCoworkStorage, decorateCoworkStart, decorateCoworkTurn, coworkWritableRoots, coreCoworkMetadata,
  insideCoworkStorage, resumeRefusal, vmRequestRefusal,
} from '../electron/cowork-runtime/core-cowork.mjs';
import { COWORK_ENGINE } from '../electron/cowork-runtime/session-service.mjs';
import { coworkInstructions, surfaceInstructions } from '../electron/surface-policy.mjs';
import { threadPermissionParams, turnPermissionParams } from '../electron/permission-policy.mjs';
import { createRoutineRunner } from '../electron/routine-runner.mjs';
import zhCN from '../electron/i18n/zh-CN/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const raw = name => fs.readFileSync(path.join(asarSource, name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');

test('availability copy is the official UPr/mFr copy word for word, with its unsupportedCode', () => {
  const jPK = raw('index.chunk-jPKPzV-P.js');
  for (const [text, id] of [[UNSUPPORTED_PLATFORM, 'gX/JCYf2fo'], [UNSUPPORTED_ARCHITECTURE, 'aM9WCiUXzZ'], [UNSUPPORTED_MACOS, 'jOY1Gy+4Ti'], [UNSUPPORTED_WINDOWS, '7BkU20KRFT']])
    assert.equal(occurrences(jPK, `defaultMessage:"${text}",id:"${id}"`), 1, text);
  // The macOS rule and the version parse (Lk) the policy mirrors.
  assert.equal(occurrences(jPK, 'if(e==="darwin"&&Lk().major<14)return{status:"unsupported"'), 1);
  assert.equal(occurrences(jPK, 'if(t.length<2)return N.debug("System version is not in the expected format %o",e),{major:0,minor:0};'), 1);
  assert.equal(occurrences(jPK, 'if(e!=="darwin"&&e!=="win32")return{status:"unsupported"'), 1);
  assert.equal(occurrences(jPK, 'if(t!=="x64"&&t!=="arm64"||'), 1);
  for (const code of ['unsupported_platform', 'unsupported_architecture', 'unsupported_os_version', 'disabled_by_user'])
    assert.ok(jPK.includes(`unsupportedCode:"${code}"`), code);
  // 3P deployments keep the session's CLI on the host (the engine this app uses by default).
  assert.ok(jPK.includes('keepsSessionCliOnHost(){return!0}') || /keepsSessionCliOnHost\(\)\{return ?!0\}/.test(jPK));
});

test('coworkAvailability: supported on this kind of Mac by default; the official refusals otherwise', () => {
  assert.deepEqual(coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion: '27.2.0', env: {} }), { status: 'supported', engine: LOCAL_CORE_ENGINE });
  assert.deepEqual(coworkAvailability({ platform: 'darwin', arch: 'x64', systemVersion: '14.0.0', env: {} }).status, 'supported');
  assert.equal(coworkAvailability({ platform: 'win32', arch: 'x64', systemVersion: '10.0.19045', env: {} }).status, 'supported');
  const linux = coworkAvailability({ platform: 'linux', arch: 'x64', systemVersion: '6.1.0', env: {} });
  assert.deepEqual(linux, { status: 'unsupported', unsupportedCode: 'unsupported_platform', engine: LOCAL_CORE_ENGINE,
    reason: 'Cowork is not currently supported on Linux', reasonMessage: { text: UNSUPPORTED_PLATFORM, values: { platform: 'Linux' } } });
  const arch = coworkAvailability({ platform: 'darwin', arch: 'ia32', systemVersion: '14.1.0', env: {} });
  assert.equal(arch.unsupportedCode, 'unsupported_architecture');
  assert.equal(arch.reason, 'Cowork is not currently supported on macOS with an ia32 CPU');
  for (const systemVersion of ['13.6.1', undefined, 'garbage']) {
    const old = coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion, env: {} });
    assert.deepEqual([old.status, old.unsupportedCode, old.reason], ['unsupported', 'unsupported_os_version', UNSUPPORTED_MACOS], String(systemVersion));
  }
  assert.equal(coworkAvailability({ platform: 'win32', arch: 'x64', systemVersion: '10.0.18363', env: {} }).reason, UNSUPPORTED_WINDOWS);
  assert.deepEqual(systemVersionParts('14.5.0'), { major: 14, minor: 5, patch: 0 });
  // CODE_DESKTOP_COWORK=0 is the off switch (E60); =1 (the old opt-in) changes nothing.
  const off = coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion: '27.2.0', env: { CODE_DESKTOP_COWORK: '0' } });
  assert.deepEqual([off.status, off.unsupportedCode, off.reason], ['unsupported', 'disabled_by_user', TURNED_OFF]);
  assert.equal(coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion: '27.2.0', env: { CODE_DESKTOP_COWORK: '1' } }).status, 'supported');
});

test('engine: the connected core by default; the Cowork VM only when asked for and its assets are present', async () => {
  assert.equal(VM_ENGINE, COWORK_ENGINE);
  assert.equal(coworkEngine({}), LOCAL_CORE_ENGINE);
  assert.equal(coworkEngine({ CODE_DESKTOP_COWORK_ENGINE: 'vm' }), VM_ENGINE);
  assert.equal(coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion: '27.2.0', env: { CODE_DESKTOP_COWORK_ENGINE: 'vm' } }).engine, VM_ENGINE);
  let asked = 0;
  const inspect = value => async () => { asked += 1; if (value instanceof Error) throw value; return { assetsAvailable: value }; };
  assert.equal(await selectCoworkEngine({ env: {}, inspect: inspect(true) }), LOCAL_CORE_ENGINE);
  assert.equal(asked, 0, 'no VM inspection without the VM engine asked for');
  assert.equal(await selectCoworkEngine({ env: { CODE_DESKTOP_COWORK_ENGINE: 'vm' }, inspect: inspect(true) }), VM_ENGINE);
  assert.equal(await selectCoworkEngine({ env: { CODE_DESKTOP_COWORK_ENGINE: 'vm' }, inspect: inspect(false) }), LOCAL_CORE_ENGINE);
  assert.equal(await selectCoworkEngine({ env: { CODE_DESKTOP_COWORK_ENGINE: 'vm' }, inspect: inspect(new Error('no ref')) }), LOCAL_CORE_ENGINE);
});

test('session storage: <userData>/cowork-sessions/<id>/{outputs,host-cwd,.claude}, app-owned 0700, no links', async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'w13-cowork-engine-'));
  try {
    const storage = await createCoworkStorage(userData);
    assert.deepEqual(storage, coworkStoragePaths(userData, storage.id));
    assert.equal(storage.root, path.join(userData, COWORK_STORAGE_DIR, storage.id));
    for (const dir of [path.join(userData, COWORK_STORAGE_DIR), storage.root, storage.outputs, storage.hostCwd, storage.claude]) {
      const stat = fs.lstatSync(dir);
      assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), dir);
      assert.equal(stat.mode & 0o777, 0o700, dir);
    }
    assert.equal(insideCoworkStorage(storage.outputs, userData), true);
    assert.equal(insideCoworkStorage(path.join(userData, COWORK_STORAGE_DIR), userData), true);
    assert.equal(insideCoworkStorage(path.join(userData, 'cowork-sessions-other'), userData), false);
    // The same id twice, a malformed id: refused.
    await assert.rejects(createCoworkStorage(userData, { id: storage.id }), { code: 'EEXIST' });
    assert.throws(() => coworkStoragePaths(userData, '../escape'), /Unknown Cowork session storage/);
    // A linked storage root (or a link inside it) is refused.
    const linked = fs.mkdtempSync(path.join(os.tmpdir(), 'w13-cowork-linked-')), elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'w13-cowork-elsewhere-'));
    try {
      fs.symlinkSync(elsewhere, path.join(linked, COWORK_STORAGE_DIR));
      await assert.rejects(createCoworkStorage(linked), new RegExp(STORAGE_NOT_OWNED));
      assert.deepEqual(fs.readdirSync(elsewhere), []);
      // A session folder that is already there (here a link planted at its name) is never reused.
      const id = '01234567-89ab-cdef-0123-456789abcdef', paths = coworkStoragePaths(userData, id);
      fs.symlinkSync(elsewhere, paths.root);
      await assert.rejects(createCoworkStorage(userData, { id }), { code: 'EEXIST' });
      assert.deepEqual(fs.readdirSync(elsewhere), []);
    } finally { fs.rmSync(linked, { recursive: true, force: true }); fs.rmSync(elsewhere, { recursive: true, force: true }); }
  } finally { fs.rmSync(userData, { recursive: true, force: true }); }
});

const storage = coworkStoragePaths('/data', '01234567-89ab-cdef-0123-456789abcdef');

test('coworkInstructions: the Cowork line with its outputs folder, connected folders and tool use', () => {
  const text = coworkInstructions({ outputsDir: storage.outputs, folders: ['/work', '/work', '/docs'] });
  assert.ok(text.startsWith(surfaceInstructions('cowork').replace('Work in the selected working directory.', 'Work on the user’s files in the connected folders listed below.')));
  assert.ok(text.includes(`Your outputs folder is ${storage.outputs}.`));
  assert.ok(text.includes('Connected folders:\n- /work\n- /docs'));
  assert.match(text, /present_files/);
  assert.match(text, /request_cowork_directory/);
  assert.ok(coworkInstructions({ outputsDir: storage.outputs }).includes('No folder is connected to this task yet.'));
  assert.ok(!coworkInstructions({ outputsDir: storage.outputs }).includes('Connected folders:'));
  // Chat and the base Cowork line are unchanged for the callers that still use them.
  assert.match(surfaceInstructions('cowork'), /actual file paths/);
});

test('decorateCoworkStart: host-cwd, the Cowork prompt (project text kept), a workspace-write sandbox', () => {
  const base = surfaceInstructions('cowork');
  const params = { cwd: '/work', model: 'm', ...threadPermissionParams({ mode: 'cowork', permission: 'auto' }), developerInstructions: `${base}\n\nProject instructions:\nBe brief.` };
  assert.deepEqual(decorateCoworkStart(params, { storage, folders: [params.cwd, 'relative', null] }), { folders: ['/work'] });
  assert.equal(params.cwd, storage.hostCwd);
  assert.equal(params.sandbox, 'workspace-write');
  assert.equal(params.developerInstructions, `${coworkInstructions({ outputsDir: storage.outputs, folders: ['/work'] })}\n\nProject instructions:\nBe brief.`);
  // No base line (a core with customization started without one): the Cowork prompt is added in front.
  const bare = { cwd: '/work' };
  decorateCoworkStart(bare, { storage, folders: [] });
  assert.equal(bare.developerInstructions, coworkInstructions({ outputsDir: storage.outputs, folders: [] }));
  // A Codex permission profile that replaced workspace-write gives way to Cowork's sandbox.
  const profiled = { cwd: '/work', permissions: { name: 'custom' } };
  decorateCoworkStart(profiled, { storage, folders: ['/work'] });
  assert.equal(profiled.permissions, undefined);
  assert.equal(profiled.sandbox, 'workspace-write');
  // Read-only and Bypass stay as asked.
  for (const permission of ['plan', 'bypass']) {
    const asked = { cwd: '/work', ...threadPermissionParams({ mode: 'cowork', permission }) }, sandbox = asked.sandbox;
    decorateCoworkStart(asked, { storage, folders: ['/work'] });
    assert.equal(asked.sandbox, sandbox, permission);
  }
});

test('decorateCoworkTurn: host-cwd and exactly host-cwd, outputs and the folders as writable roots, every turn', () => {
  const turn = { threadId: 't', cwd: '/work', ...turnPermissionParams({ mode: 'cowork', permission: 'auto', cwd: '/work', networkAccess: true }) };
  decorateCoworkTurn(turn, { storage, folders: ['/work', '/added'] });
  assert.equal(turn.cwd, storage.hostCwd);
  assert.deepEqual(turn.sandboxPolicy, { type: 'workspaceWrite', writableRoots: [storage.hostCwd, storage.outputs, '/work', '/added'], networkAccess: true, excludeTmpdirEnvVar: false, excludeSlashTmp: false });
  assert.deepEqual(coworkWritableRoots({ storage, folders: [] }), [storage.hostCwd, storage.outputs]);
  // A config.toml writable root the Codex layer merged in does not survive: the folder grant is the boundary.
  const merged = { cwd: '/work', sandboxPolicy: { type: 'workspaceWrite', writableRoots: ['/work', '/Users/me'], networkAccess: false } };
  decorateCoworkTurn(merged, { storage, folders: ['/work'] });
  assert.deepEqual(merged.sandboxPolicy.writableRoots, [storage.hostCwd, storage.outputs, '/work']);
  const profiled = { cwd: '/work', permissions: { name: 'custom' } };
  decorateCoworkTurn(profiled, { storage, folders: [], networkAccess: false });
  assert.equal(profiled.permissions, undefined);
  assert.deepEqual(profiled.sandboxPolicy.writableRoots, [storage.hostCwd, storage.outputs]);
  for (const permission of ['plan', 'bypass']) {
    const asked = { cwd: '/work', ...turnPermissionParams({ mode: 'cowork', permission, cwd: '/work' }) }, policy = asked.sandboxPolicy;
    decorateCoworkTurn(asked, { storage, folders: ['/work'] });
    assert.deepEqual(asked.sandboxPolicy, policy, permission);
  }
});

test('coreCoworkMetadata: only a Cowork session on the connected core with its storage id', () => {
  const cowork = { storage: storage.id, folders: ['/work'] };
  assert.deepEqual(coreCoworkMetadata({ surface: 'cowork', engine: LOCAL_CORE_ENGINE, cowork }), cowork);
  for (const meta of [null, { surface: 'cowork' }, { surface: 'cowork', engine: VM_ENGINE, cowork }, { surface: 'chat', engine: LOCAL_CORE_ENGINE, cowork },
    { surface: 'cowork', engine: LOCAL_CORE_ENGINE, cowork: { storage: '../x' } }]) assert.equal(coreCoworkMetadata(meta), null);
});

test('resume across engines: the official O-5 sentences; VM sessions stay readable', () => {
  const Dl8 = raw('index.chunk-Dl8NPgw7.js');
  assert.equal(occurrences(Dl8, `throw Error("${VM_SESSION_REFUSAL}")`), 1);
  assert.ok(Dl8.includes(HOST_SESSION_REFUSAL));
  assert.equal(resumeRefusal({ engine: VM_ENGINE }, LOCAL_CORE_ENGINE), VM_SESSION_REFUSAL);
  assert.equal(resumeRefusal({ engine: VM_ENGINE }, VM_ENGINE), null);
  assert.equal(resumeRefusal({ engine: LOCAL_CORE_ENGINE }, VM_ENGINE), null);
  assert.equal(resumeRefusal({ engine: LOCAL_CORE_ENGINE }, VM_ENGINE, { vmRequired: true }), HOST_SESSION_REFUSAL);
  const supported = engine => ({ status: 'supported', engine });
  for (const method of ['thread/read', 'thread/resume', 'thread/name/set', 'thread/archive', 'thread/delete', 'turn/interrupt'])
    assert.equal(vmRequestRefusal(method, supported(LOCAL_CORE_ENGINE)), null, method);
  assert.deepEqual(vmRequestRefusal('turn/start', supported(LOCAL_CORE_ENGINE)), { text: VM_SESSION_REFUSAL });
  assert.deepEqual(vmRequestRefusal('cowork/rewind', supported(LOCAL_CORE_ENGINE)), { text: VM_SESSION_REFUSAL });
  assert.deepEqual(vmRequestRefusal('thread/start', supported(LOCAL_CORE_ENGINE)), { text: VM_UNAVAILABLE });
  for (const method of ['thread/start', 'turn/start', 'cowork/rewind']) assert.equal(vmRequestRefusal(method, supported(VM_ENGINE)), null);
  const off = coworkAvailability({ platform: 'darwin', arch: 'arm64', systemVersion: '27.2.0', env: { CODE_DESKTOP_COWORK: '0', CODE_DESKTOP_COWORK_ENGINE: 'vm' } });
  assert.deepEqual(vmRequestRefusal('turn/start', off), { text: TURNED_OFF });
});

test('a Cowork scheduled task on the connected core starts as a Cowork session (main decorates it)', async () => {
  const calls = [];
  const owner = {};
  const context = async () => ({ owner, coreId: 'deepseek', models: [{ model: 'm' }], hints: true, autoReview: false });
  const run = createRoutineRunner({ context, rpc: async (request, by) => { assert.equal(by, owner); calls.push(request); return request.method === 'thread/start' ? { thread: { id: 't1' } } : { turn: { id: 'u1' } }; } });
  const task = { id: 'r1', kind: 'cowork', name: 'Daily', prompt: 'Do it', cwd: '/work', options: { coreId: 'deepseek', model: 'm', permission: 'auto', networkAccess: false } };
  assert.deepEqual(await run(task, { attach() {} }), { threadId: 't1', turnId: 'u1' });
  const start = calls.find(call => call.method === 'thread/start').params;
  assert.equal(start.codeDesktop.surface, 'cowork');
  assert.equal(start.cwd, '/work');
  assert.equal(start.developerInstructions, surfaceInstructions('cowork'));
});

test('main.cjs: Cowork on by default, local-core routing, storage metadata, boot fields, no "in development" refusal', () => {
  assert.equal(occurrences(main, "Cowork is still in development."), 0);
  assert.equal(occurrences(main, 'const COWORK_ENABLED = process.env.CODE_DESKTOP_COWORK === "1";'), 0);
  assert.equal(occurrences(main, 'let COWORK = coworkAvailability({ platform: process.platform, arch: process.arch, systemVersion: process.getSystemVersion?.(), env: process.env });'), 1);
  assert.equal(occurrences(main, 'const COWORK_ENABLED = COWORK.status === "supported";'), 1);
  assert.equal(occurrences(main, "const coworkRoute = (coworkStartRequest && (expectedOwner ? expectedOwner === coworkSessions : COWORK.engine === COWORK_ENGINE)) || coworkSessions.owns(p.params?.threadId);"), 1);
  assert.equal(occurrences(main, 'if (coworkStartRequest && !COWORK_ENABLED) throw new Error(i18n.t(COWORK.reasonMessage.text, COWORK.reasonMessage.values));'), 1);
  assert.equal(occurrences(main, 'coworkStart = await cowork.createCoworkStorage(app.getPath("userData"));'), 1);
  // w13-coworkfn-folders: the start's folders are judged first (folder-policy.mjs takeStartFolders), the turn's are the session's grants
  // with their protected insides carved out (sessionWritableFolders).
  assert.equal(occurrences(main, 'coworkStart.folders = cowork.decorateCoworkStart(params, { storage: coworkStart, folders: startFolders }).folders;'), 1);
  assert.equal(occurrences(main, '} else if (coworkCore) cowork.decorateCoworkTurn(params, { storage: cowork.coworkStoragePaths(app.getPath("userData"), coworkCore.storage), folders: await folderPolicy.sessionWritableFolders(config.sessionMetadata[params.threadId], { userData: app.getPath("userData") }), networkAccess: config.sandboxNetworkAccess === true });'), 1);
  assert.equal(occurrences(main, '...(coworkStart ? { engine: "local-core", cowork: { storage: coworkStart.id, folders: coworkStart.folders } } : {}) };'), 1);
  assert.equal(occurrences(main, 'cowork: COWORK, coworkEnabled: COWORK_ENABLED,'), 2);
  assert.equal(occurrences(main, "vmRequestRefusal(p.method, COWORK); if (vmRefusal) throw new Error(i18n.t(vmRefusal.text, vmRefusal.values));"), 1);
  // The decoration runs after the Codex permission layer and before the instructions and the request.
  const decorate = main.indexOf('coworkStart = await cowork.createCoworkStorage(');
  assert.ok(main.lastIndexOf('applyCodexPermissions(p.method, params,', decorate) > 0);
  assert.ok(decorate < main.indexOf('instructionsService.decorate(p.method, params);', decorate));
});

test('zh-CN: every new English line is translated', () => {
  for (const text of [UNSUPPORTED_PLATFORM, UNSUPPORTED_ARCHITECTURE, UNSUPPORTED_MACOS, UNSUPPORTED_WINDOWS, TURNED_OFF, VM_SESSION_REFUSAL, HOST_SESSION_REFUSAL, VM_UNAVAILABLE]) {
    assert.equal(typeof zhCN[text], 'string', text);
    for (const placeholder of text.match(/\{\w+\}/g) ?? []) assert.ok(zhCN[text].includes(placeholder), `${text} keeps ${placeholder}`);
  }
});
