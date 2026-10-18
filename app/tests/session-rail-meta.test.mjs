// R4f-rail SR-5: the Session rail's local session record (main.cjs `session-rail-meta`, electron/session-rail-meta.cjs)
// and the rO meta built from it (src/session-rail-meta-model.mjs), pinned to 2.42304.0 shared-8 zh, cf74bc599 rO / fO
// and asar index.chunk-CFJssAFf.js formatSessionForEvent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  RAIL_META_FIELDS, LOCAL_SESSION_RECORD_FIELDS, SESSION_RAIL_META_ACTION, localSessionRecord, railFolders, railRemote,
  railMetaFromRecord, railLazyPendingArgs, railRecordFacts, loadLocalSessionRecord,
} from '../src/session-rail-meta-model.mjs';

const require = createRequire(import.meta.url);
const main = require('../electron/session-rail-meta.cjs');
const root = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(root, '../reference/installed-2.42304.0-20261017');
const v1 = (name) => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const rail = v1('cf74bc599-D9NZWRyl.js');

const tempDir = (t) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'session-rail-meta-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
/** The original's function text, evaluated as is (helpers it calls passed in). */
const original = (source, name, helpers = {}) => {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('}function ', start);
  return new Function(...Object.keys(helpers), `${source.slice(start, end + 1)}; return ${name};`)(...Object.values(helpers));
};
const $E = original(rail, '$E');
const ZE = original(rail, 'ZE');
const XE = original(rail, 'XE', { YE: /[\\/]\.claude[\\/]worktrees[\\/]/, $E });

test('2.42304.0: rO, the shared-8 zh record, fO\'s record fallback and its other reads of the record', () => {
  const rO = /var rO=kn\(([^)]*)\)/.exec(rail);
  assert.ok(rO);
  assert.equal(occurrences(rail, rO[0]), 1);
  assert.deepEqual(JSON.parse(`[${rO[1]}]`), RAIL_META_FIELDS);
  assert.equal(occurrences(rail, 'S=Td(e,rO)'), 1);
  assert.equal(occurrences(rail, 'import{r as $d}from"./cef1e6037-8DivyY4m.js"'), 1);
  assert.equal(occurrences(rail, 'Fd as Oa'), 1);
  assert.equal(occurrences(rail, 'w as Fn'), 1);
  assert.equal(occurrences(rail, 'O=Oa(e.type==="local"?e.id:null),k=f(()=>{if(C)return C;if(O)return{'), 1);
  for (const needle of ['R=O!==void 0&&ZE({isLocal:x,cwd:O.cwd,originCwd:O.originCwd,worktreePath:O.worktreePath,harnessCwd:O.harnessCwd,branch:O.branch,startedWithWorktree:O.startedWithWorktree,worktreeRemoved:O.worktreeRemoved}),z=Fn(O)!==void 0,B=O?.isArchived===!0,V=R&&!B&&!z?O?.lazyWorktreePath:void 0',
    'recorded:O?.branch', 'te=e.isLocal&&(G!==void 0||e.startedWithWorktree===!0&&e.worktreeRemoved!==!0)'])
    assert.equal(occurrences(rail, needle), 1, needle);

  const shared8 = v1('shared-8-B5lJ8U5C.js');
  const zh = /function zh\(e\)\{return Q\(No\(t=>\{let n=e\?t\.sessions\.find\(t=>t\.sessionId===e\):void 0;return n\?\{([^}]*)\}:void 0\}\)\)\}/.exec(shared8);
  assert.ok(zh, 'shared-8 zh');
  assert.match(shared8.slice(shared8.lastIndexOf('export{')), /\bzh as Fd\b/);
  assert.deepEqual(zh[1].split(',').map((entry) => entry.split(':')[0]), LOCAL_SESSION_RECORD_FIELDS);
  assert.deepEqual(main.LOCAL_SESSION_RECORD_FIELDS, LOCAL_SESSION_RECORD_FIELDS, 'main and renderer keep the same record');

  const cef = v1('cef1e6037-8DivyY4m.js');
  assert.equal(occurrences(cef, 'function Fn(e){let t=e.originCwd||e.cwd;return{originCwd:t,workingDir:e.harnessCwd??e.worktreePath??t}}'), 1);
  assert.match(cef.slice(cef.lastIndexOf('export{')), /\bFn as r\b/);
  const shared104 = v1('shared-104-Cqo2-vQh.js');
  assert.equal(occurrences(shared104, 'function tz(e){let t=e?.remoteTarget;if(t)switch(t.kind){case"ssh":return{kind:"ssh",sshHost:t.sshHost,sshPort:t.sshPort,sshIdentityFile:t.sshIdentityFile,remoteCwd:t.remoteCwd};case"wsl":return{kind:"wsl",distro:t.distro};default:return}if(e?.sshConfig)return{kind:"ssh",sshHost:e.sshConfig.sshHost,sshPort:e.sshConfig.sshPort,sshIdentityFile:e.sshConfig.sshIdentityFile,remoteCwd:e.sshConfig.remoteCwd}}'), 1);
  assert.match(shared104.slice(shared104.lastIndexOf('export{')), /\btz as w\b/);

  const asar = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-CFJssAFf.js'), 'utf8');
  for (const needle of ['formatSessionForEvent(e,r){', 'cwd:e.cwd,originCwd:e.originCwd,',
    'startedWithWorktree:e.worktreePath!==void 0||e.worktreeLazy!==void 0||$C(e)||e.pendingFirstStart?.options?.useWorktree===!0,worktreeRemoved:e.worktreePath===void 0&&e.cwd===e.originCwd&&$C(e)',
    'lazyWorktreePath:pw(e)?.path,harnessCwd:e.harnessCwd,sourceBranch:e.sourceBranch,branch:e.branch,', 'isArchived:e.isArchived,',
    'additionalDirectories:QL(e),isScratchWorkspace:t.jD(e.originCwd)?!0:void 0,', 'function $C(e){return!e.worktreeLazy&&!!e.branch&&!!e.originCwd}',
    'e.cwd=e.originCwd,e.worktreePath=void 0,e.worktreeName=void 0,e.sourceBranch=void 0'])
    assert.equal(occurrences(asar, needle), 1, needle);
});

test('railMetaFromRecord is fO\'s fallback: the same keys in the same order, built as the original builds them', () => {
  const fallback = /if\(O\)return\{(\.\.\.\$d\(O\),[^}]*)\}\},\[C,O\]\)/.exec(rail);
  assert.ok(fallback);
  const keys = fallback[1].split(',').flatMap((entry) => entry === '...$d(O)' ? ['originCwd', 'workingDir'] : [entry.split(':')[0]]);
  const meta = railMetaFromRecord({ cwd: '/r/wt', originCwd: '/r', worktreePath: '/r/wt', startedWithWorktree: true, worktreeRemoved: false });
  assert.deepEqual(Object.keys(meta), keys);
  assert.deepEqual(RAIL_META_FIELDS.filter((key) => !keys.includes(key)), ['folderTrees', 'pendingCwd'], 'the fallback leaves these two unset');
  assert.deepEqual(meta.repoSlugs, []);
  assert.equal(meta.originCwd, '/r');
  assert.equal(meta.workingDir, '/r/wt');
  assert.equal(meta.hasDesktopWorktree, true);
  assert.equal(meta.remote, undefined);
  assert.equal(railMetaFromRecord(null), undefined);
  assert.equal(railMetaFromRecord(undefined), undefined);
});

test('railFolders ($d) and railRemote (tz)', () => {
  assert.deepEqual(railFolders({ cwd: '/a' }), { originCwd: '/a', workingDir: '/a' }, 'originCwd falls back to cwd');
  assert.deepEqual(railFolders({ cwd: '/a/wt', originCwd: '/a', worktreePath: '/a/wt' }), { originCwd: '/a', workingDir: '/a/wt' });
  assert.deepEqual(railFolders({ cwd: '/a', originCwd: '/a', worktreePath: '/a/wt', harnessCwd: '/h' }), { originCwd: '/a', workingDir: '/h' });
  assert.deepEqual(railFolders({ cwd: '/gone', originCwd: '/a', worktreeRemoved: true }), { originCwd: '/a', workingDir: '/a' }, 'a gone worktree shows its origin');
  assert.equal(railRemote({ cwd: '/a' }), undefined);
  assert.equal(railRemote(undefined), undefined);
  assert.deepEqual(railRemote({ remoteTarget: { kind: 'wsl', distro: 'Ubuntu', extra: 1 } }), { kind: 'wsl', distro: 'Ubuntu' });
  assert.deepEqual(railRemote({ remoteTarget: { kind: 'ssh', sshHost: 'h', sshPort: 22 } }), { kind: 'ssh', sshHost: 'h', sshPort: 22, sshIdentityFile: undefined, remoteCwd: undefined });
  assert.equal(railRemote({ remoteTarget: { kind: 'other' }, sshConfig: { sshHost: 'h' } }), undefined, 'an unknown target kind is not read as ssh');
  assert.deepEqual(railRemote({ sshConfig: { sshHost: 'h', remoteCwd: '/w' } }), { kind: 'ssh', sshHost: 'h', sshPort: undefined, sshIdentityFile: undefined, remoteCwd: '/w' });
});

test('railLazyPendingArgs / railRecordFacts: the ZE argument and z / B / V as fO builds them', () => {
  const call = /R=O!==void 0&&ZE\(\{([^}]*)\}\)/.exec(rail);
  const record = { cwd: '/r', originCwd: '/r', startedWithWorktree: true, worktreeRemoved: false, lazyWorktreePath: '/r/lease', isArchived: false };
  assert.deepEqual(Object.keys(railLazyPendingArgs(record, true)), call[1].split(',').map((entry) => entry.split(':')[0]));
  // The original's ZE: a lazy start (no worktree yet, still in the origin) is pending; the host never records one.
  assert.equal(ZE(railLazyPendingArgs(record, true)), true);
  assert.equal(ZE(railLazyPendingArgs({ ...record, worktreePath: '/r/wt', cwd: '/r/wt' }, true)), false);
  assert.equal(ZE(railLazyPendingArgs({ ...record, worktreeRemoved: true }, true)), false);
  assert.deepEqual(railRecordFacts(record, true), { remote: false, archived: false, leasedPath: '/r/lease', recordedBranch: undefined });
  assert.equal(railRecordFacts({ ...record, isArchived: true }, true).leasedPath, undefined);
  assert.equal(railRecordFacts({ ...record, remoteTarget: { kind: 'wsl', distro: 'd' } }, true).leasedPath, undefined);
  assert.equal(railRecordFacts(record, false).leasedPath, undefined);
  assert.equal(railRecordFacts({ ...record, branch: 'b' }, false).recordedBranch, 'b');
  assert.deepEqual(railRecordFacts(undefined, false), { remote: false, archived: false, leasedPath: undefined, recordedBranch: undefined });
});

test('localSessionRecord: only the zh fields of the expected types, in order; null without a folder', () => {
  assert.deepEqual(localSessionRecord({
    sshConfig: { sshHost: 'h' }, remoteTarget: { kind: 'ssh' }, isScratchWorkspace: 'yes', branch: 'deepseek/x', isArchived: true,
    additionalDirectories: ['/x', '/x', 'relative', 5, 'C:\\work', '/bad\0'], worktreeRemoved: false, startedWithWorktree: true,
    worktreePath: '/r/wt', originCwd: '/r', cwd: '/r/wt', harnessCwd: 'relative', title: 'not a record field',
  }), {
    cwd: '/r/wt', originCwd: '/r', worktreePath: '/r/wt', startedWithWorktree: true, worktreeRemoved: false, isArchived: true,
    branch: 'deepseek/x', additionalDirectories: ['/x', 'C:\\work'],
  });
  assert.deepEqual(Object.keys(localSessionRecord({ isArchived: false, cwd: '/a' })), ['cwd', 'isArchived']);
  assert.equal(localSessionRecord({ originCwd: '/a' }), null);
  assert.equal(localSessionRecord({ cwd: 'a' }), null);
  assert.equal(localSessionRecord(null), null);
  assert.equal(localSessionRecord([]), null);
  assert.equal(localSessionRecord('x'), null);
  assert.equal(localSessionRecord({ cwd: '/a', branch: 'a\nb' }).branch, undefined);
  assert.equal(localSessionRecord({ cwd: '/a', additionalDirectories: [] }).additionalDirectories, undefined);
});

test('loadLocalSessionRecord: one main call per session, its answer checked; null when the call fails', async () => {
  const calls = [];
  const call = async (action, payload) => { calls.push([action, payload]); return { cwd: '/r', originCwd: '/r', startedWithWorktree: false, extra: 1 }; };
  assert.deepEqual(await loadLocalSessionRecord(call, 's1'), { cwd: '/r', originCwd: '/r', startedWithWorktree: false });
  assert.deepEqual(await loadLocalSessionRecord(call, 's1', '/seen'), { cwd: '/r', originCwd: '/r', startedWithWorktree: false });
  await loadLocalSessionRecord(call, 's1', 'relative');
  assert.deepEqual(calls, [[SESSION_RAIL_META_ACTION, { sessionId: 's1' }], ['session-rail-meta', { sessionId: 's1', cwd: '/seen' }], ['session-rail-meta', { sessionId: 's1' }]]);
  assert.equal(await loadLocalSessionRecord(async () => { throw new Error('Unknown session.'); }, 's1'), null);
  assert.equal(await loadLocalSessionRecord(async () => null, 's1'), null);
  assert.equal(await loadLocalSessionRecord(call, ''), null);
  assert.equal(await loadLocalSessionRecord(call, 7), null);
  assert.equal(calls.length, 3, 'no call for a missing session id');
});

/** A repository with a .git directory, its worktree admin dirs and the worktree folders' .git files. */
function fixture(t) {
  const dir = tempDir(t);
  const repo = path.join(dir, 'repo');
  write(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  const worktree = path.join(repo, '.code', 'worktrees', 'repo-a');
  write(path.join(repo, '.git', 'worktrees', 'repo-a', 'HEAD'), 'ref: refs/heads/deepseek/m1abc\n');
  write(path.join(worktree, '.git'), `gitdir: ${path.join(repo, '.git', 'worktrees', 'repo-a')}\n`);
  const legacy = path.join(repo, '.code', 'worktrees', 'repo-b');
  write(path.join(repo, '.git', 'worktrees', 'repo-b', 'HEAD'), 'ref: refs/heads/kimi/m1def\n');
  write(path.join(legacy, '.git'), 'gitdir: ../../../.git/worktrees/repo-b\n');
  const custom = path.join(dir, 'trees', 'repo-x');
  write(path.join(repo, '.git', 'worktrees', 'repo-x', 'HEAD'), '0123456789abcdef0123456789abcdef01234567\n');
  write(path.join(custom, '.git'), `gitdir: ${path.join(repo, '.git', 'worktrees', 'repo-x')}\n`);
  const gone = path.join(repo, '.code', 'worktrees', 'repo-gone');
  const extra = path.join(dir, 'extra');
  fs.mkdirSync(extra);
  const scratchRoot = path.join(dir, 'ud', 'workspaces');
  const scratch = path.join(scratchRoot, 'note');
  fs.mkdirSync(scratch, { recursive: true });
  const config = {
    threadIds: ['wt', 'plain', 'legacy', 'custom', 'added', 'scratch', 'unrecorded', 'fork', 'slash'],
    archivedThreadIds: ['gone'],
    threadMetadata: {
      wt: { cwd: worktree }, plain: { cwd: repo }, legacy: { cwd: legacy }, custom: { cwd: custom }, added: { cwd: repo },
      scratch: { cwd: scratch }, gone: { cwd: gone }, fork: { cwd: worktree }, slash: { cwd: `${worktree}/` },
    },
    sessionMetadata: {
      wt: { originCwd: repo }, gone: { originCwd: repo },
      added: { additionalFolders: [extra, extra, 'relative', 3, `${extra}\0x`] },
    },
    worktreeDirectories: [worktree, legacy],
    worktreeOrigins: { [worktree]: repo },
    worktreeBases: { [custom]: 'main' },
  };
  return { dir, repo, worktree, legacy, custom, gone, extra, scratch, scratchRoot, config };
}

test('main record: worktree sessions (recorded, legacy and custom origins), plain, gone and archived sessions', async (t) => {
  const f = fixture(t);
  const runs = [];
  const run = async (cmd, args) => { runs.push([cmd, ...args]); return { stdout: `${path.join(f.repo, '.git')}\n` }; };
  const host = { config: f.config, scratchRoot: f.scratchRoot, run };
  const read = (sessionId, extra = {}) => main.sessionRailRecord({ sessionId, ...extra }, host);

  assert.deepEqual(await read('wt'), {
    cwd: f.worktree, originCwd: f.repo, worktreePath: f.worktree, startedWithWorktree: true, worktreeRemoved: false, isArchived: false,
    branch: 'deepseek/m1abc',
  });
  assert.deepEqual(await read('plain'), { cwd: f.repo, originCwd: f.repo, startedWithWorktree: false, worktreeRemoved: false, isArchived: false },
    'a session in its own folder has no worktree and no recorded branch');
  const legacy = await read('legacy');
  assert.equal(legacy.originCwd, f.repo, 'the <repo>/.code/worktrees layout is traced back');
  assert.equal(legacy.worktreePath, f.legacy);
  assert.equal(legacy.branch, 'kimi/m1def', 'a relative gitdir is resolved from the worktree');
  assert.equal(f.config.sessionMetadata.legacy, undefined, 'a read never writes the origin back');
  const custom = await read('custom');
  assert.equal(custom.originCwd, f.repo, 'a custom-location worktree asks git for its common dir');
  assert.deepEqual(runs.map((entry) => entry.slice(0, 4)), [['git', '-C', f.custom, 'rev-parse']]);
  assert.equal(custom.startedWithWorktree, true);
  assert.equal(custom.branch, undefined, 'a detached HEAD has no branch');
  assert.deepEqual(await read('gone'), { cwd: f.gone, originCwd: f.repo, startedWithWorktree: true, worktreeRemoved: true, isArchived: true },
    'the worktree folder is gone: no worktreePath, no branch; the recorded cwd stays');
  const fork = await read('fork');
  assert.equal(fork.originCwd, f.repo, 'a session without its own origin takes the one prepare-worktree recorded');
  assert.equal(fork.worktreePath, f.worktree);
  const slash = await read('slash');
  assert.deepEqual([slash.originCwd, slash.startedWithWorktree, slash.branch], [f.repo, true, 'deepseek/m1abc'], 'folders compare resolved');
  assert.deepEqual((await read('added')).additionalDirectories, [f.extra]);
  assert.equal((await read('scratch')).isScratchWorkspace, true);
  assert.equal((await read('wt')).isScratchWorkspace, undefined);
  for (const id of ['wt', 'plain', 'legacy', 'custom', 'gone', 'added', 'scratch', 'fork', 'slash']) {
    const record = await read(id);
    assert.deepEqual(Object.keys(record), main.LOCAL_SESSION_RECORD_FIELDS.filter((key) => key in record), `${id}: zh order`);
    for (const key of ['lazyWorktreePath', 'harnessCwd', 'remoteTarget', 'sshConfig']) assert.equal(key in record, false, `${id}: ${key} has no host source`);
    assert.deepEqual(localSessionRecord(record), record, `${id}: the renderer keeps main's record as is`);
  }
});

test('main record feeds the rail as the original\'s record would: the worktree mark, the origin after a gone worktree, no lazy state', async (t) => {
  const f = fixture(t);
  const host = { config: f.config, scratchRoot: f.scratchRoot };
  const meta = async (id) => {
    const record = localSessionRecord(await main.sessionRailRecord({ sessionId: id }, host));
    return { record, meta: railMetaFromRecord(record) };
  };
  const wt = await meta('wt');
  assert.deepEqual({ originCwd: wt.meta.originCwd, workingDir: wt.meta.workingDir, hasDesktopWorktree: wt.meta.hasDesktopWorktree },
    { originCwd: f.repo, workingDir: f.worktree, hasDesktopWorktree: true });
  assert.deepEqual(XE({ isLocal: true, ...wt.meta }), { name: 'repo-a', path: f.worktree }, 'cf74bc599 XE: the rail shows the worktree');
  const gone = await meta('gone');
  assert.equal(gone.meta.workingDir, f.repo);
  assert.equal(gone.meta.hasDesktopWorktree, false);
  assert.equal(XE({ isLocal: true, ...gone.meta }), null, 'no worktree mark for a gone worktree');
  const plain = await meta('plain');
  assert.equal(XE({ isLocal: true, ...plain.meta }), null);
  for (const entry of [wt, gone, plain]) assert.equal(ZE(railLazyPendingArgs(entry.record, true)), false, 'eager worktrees are never pending');
});

test('main record: IPC input checks, unknown sessions and the cwd a renderer may name', async (t) => {
  const f = fixture(t);
  const host = { config: f.config, scratchRoot: f.scratchRoot, observedCwds: new Set([f.extra]) };
  for (const request of [null, undefined, 'wt', [], {}, { sessionId: 3 }, { sessionId: '' }, { sessionId: 'a\u0000b' }, { sessionId: 'a\nb' }, { sessionId: 'x'.repeat(257) }])
    await assert.rejects(main.sessionRailRecord(request, host), /Unknown session\./, JSON.stringify(request));
  assert.equal(await main.sessionRailRecord({ sessionId: 'nobody' }, host), null, 'a session the app does not know');
  assert.equal(await main.sessionRailRecord({ sessionId: 'wt' }, { config: {} }), null, 'no session lists at all');
  assert.equal(await main.sessionRailRecord({ sessionId: 'unrecorded' }, host), null, 'no recorded folder');
  assert.equal(await main.sessionRailRecord({ sessionId: 'unrecorded', cwd: f.repo }, host), null, 'a folder the thread list never reported');
  assert.equal(await main.sessionRailRecord({ sessionId: 'unrecorded', cwd: 'extra' }, host), null);
  assert.equal((await main.sessionRailRecord({ sessionId: 'unrecorded', cwd: f.extra }, host)).cwd, f.extra, 'a thread-list folder');
  assert.equal((await main.sessionRailRecord({ sessionId: 'wt', cwd: f.extra }, host)).cwd, f.worktree, 'the recorded folder wins');
  f.config.threadMetadata.plain.cwd = 'relative/path';
  assert.equal(await main.sessionRailRecord({ sessionId: 'plain' }, host), null, 'a recorded folder that is not absolute');
});

test('worktreeHeadBranch reads the checked-out branch from git\'s files only', async (t) => {
  const f = fixture(t);
  assert.equal(await main.worktreeHeadBranch(f.repo), 'main', 'a main checkout\'s .git directory');
  assert.equal(await main.worktreeHeadBranch(f.worktree), 'deepseek/m1abc');
  assert.equal(await main.worktreeHeadBranch(f.custom), undefined, 'detached');
  assert.equal(await main.worktreeHeadBranch(f.extra), undefined, 'not a checkout');
  assert.equal(await main.worktreeHeadBranch(f.gone), undefined, 'gone');
  assert.equal(await main.worktreeHeadBranch('relative'), undefined);
  write(path.join(f.dir, 'odd', '.git'), 'not a pointer\n');
  assert.equal(await main.worktreeHeadBranch(path.join(f.dir, 'odd')), undefined);
  write(path.join(f.dir, 'spaced', '.git', 'HEAD'), 'ref: refs/heads/has space\n');
  assert.equal(await main.worktreeHeadBranch(path.join(f.dir, 'spaced')), undefined, 'not a git branch name');
  assert.equal(main.validSessionId('thr_1'), true);
  assert.equal(main.validSessionId('a\u007fb'), false);
});

test('main.cjs answers session-rail-meta from its own records', () => {
  const source = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  assert.equal(occurrences(source, 'case "session-rail-meta":'), 1);
  assert.match(source, /case "session-rail-meta":\s+return require\("\.\/session-rail-meta\.cjs"\)\.sessionRailRecord\(p, \{ config, observedCwds: observedThreadCwds, scratchRoot: path\.join\(app\.getPath\("userData"\), "workspaces"\), run \}\);/);
});
