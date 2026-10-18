// R4e-envbranch (home-15): a named environment's start branch that doesn't exist is cleared with a warning, as in
// 2.42304.0 Te / qZ. Main's branch-on-origin (the original GitStatusService.isBranchOnOrigin over a stub git runner —
// no git process runs), the generator's source pins, the warning's ICU text in both locales (Vite SSR, no browser), and
// the host wiring in main.jsx / main.cjs (source text).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractR4eEnvbranch } from '../scripts/extract-r4e-envbranch.mjs';

const require = createRequire(import.meta.url);
const { createHostBranchOnOrigin } = require('../electron/r4e-envbranch-origin.cjs');
const generated = require('../electron/generated/r4e-envbranch-origin.cjs');

// A stub of promisify(execFile): `answers` maps the git subcommand line to { stdout } or an execFile-shaped error.
function stubRun(answers) {
  const calls = [];
  const run = async (file, args, options) => {
    calls.push({ file, args, options });
    assert.equal(file, 'git');
    assert.equal(args[0], '-C');
    const key = args.slice(2).join(' ');
    const answer = answers[key];
    if (answer === undefined) throw new Error(`unexpected git ${key}`);
    if (answer instanceof Error) throw answer;
    return { stdout: answer, stderr: '' };
  };
  return { run, calls };
}
const exit = (code, extra = {}) => Object.assign(new Error(`Command failed (exit ${code})`), { code, ...extra });
const revParse = branch => `rev-parse --verify --quiet refs/remotes/origin/${branch}^{commit}`;
const FETCH = '--no-pager config --no-includes --get-all remote.origin.fetch';

test('branch-on-origin: refs/remotes/origin/<branch> resolving is true, read-only and with the official 5 s timeout', async () => {
  const { run, calls } = stubRun({ [revParse('feature/x')]: 'abc123\n' });
  assert.equal(await createHostBranchOnOrigin({ run })('/repo', 'feature/x'), true);
  assert.deepEqual(calls.map(call => call.args), [['-C', '/repo', 'rev-parse', '--verify', '--quiet', 'refs/remotes/origin/feature/x^{commit}']]);
  assert.equal(calls[0].options.timeout, 5000);
});

test('branch-on-origin: missing from origin is false only when origin\'s fetch refspecs would have fetched it', async () => {
  const all = stubRun({ [revParse('gone')]: exit(1), [FETCH]: '+refs/heads/*:refs/remotes/origin/*\n' });
  assert.equal(await createHostBranchOnOrigin(all)('/repo', 'gone'), false, 'a full mirror refspec');
  const patterns = { [revParse('main')]: exit(1), [revParse('gone')]: exit(1), [FETCH]: '+refs/heads/main:refs/remotes/origin/main\n' };
  assert.equal(await createHostBranchOnOrigin(stubRun(patterns))('/repo', 'main'), false, 'a single-branch refspec that names it');
  assert.equal(await createHostBranchOnOrigin(stubRun(patterns))('/repo', 'gone'), null, 'a single-branch clone cannot tell');
  const none = stubRun({ [revParse('gone')]: exit(1), [FETCH]: exit(1) });
  assert.equal(await createHostBranchOnOrigin(none)('/repo', 'gone'), null, 'no origin remote');
  const refused = stubRun({ [revParse('gone')]: exit(1), [FETCH]: '+refs/heads/*:refs/remotes/origin/*\n^refs/heads/secret\n' });
  assert.equal(await createHostBranchOnOrigin(refused)('/repo', 'gone'), null, 'a negative refspec is refused');
});

test('branch-on-origin: any other failure, or an implausible name, is null (unknown) and never runs more git', async () => {
  for (const [error, label] of [[exit(128), 'not a repository'], [Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' }), 'no git'],
    [exit(1, { killed: true, signal: 'SIGTERM' }), 'timed out']]) {
    const stub = stubRun({ [revParse('gone')]: error });
    assert.equal(await createHostBranchOnOrigin(stub)('/repo', 'gone'), null, label);
    assert.equal(stub.calls.length, 1, label);
  }
  for (const name of ['', '-x', 'a..b', 'a//b', 'topic.lock', 'x@{1}', 'end/']) {
    const stub = stubRun({});
    assert.equal(await createHostBranchOnOrigin(stub)('/repo', name), null, JSON.stringify(name));
    assert.equal(stub.calls.length, 0, JSON.stringify(name));
  }
  assert.equal(await createHostBranchOnOrigin(stubRun({}))('/repo', undefined), null);
});

test('the original refspec helpers: zur all/patterns/refused and Bur matching', () => {
  const { parseFetchRefspecs, refspecsCoverBranch, isPlausibleBranchName, gitExitCode } = generated;
  assert.deepEqual(parseFetchRefspecs(['+refs/heads/*:refs/remotes/origin/*'], 'origin'), { kind: 'all', prune: true });
  const patterns = parseFetchRefspecs(['+refs/heads/main:refs/remotes/origin/main', '+refs/heads/release/*:refs/remotes/origin/release/*'], 'origin');
  assert.deepEqual(patterns, { kind: 'patterns', patterns: ['main', 'release/*'] });
  assert.equal(refspecsCoverBranch('release/1.2', patterns), true);
  assert.equal(refspecsCoverBranch('refs/heads/main', patterns), true);
  assert.equal(refspecsCoverBranch('feature', patterns), false);
  assert.deepEqual(parseFetchRefspecs(['^refs/heads/x'], 'origin'), { kind: 'refused' });
  assert.equal(isPlausibleBranchName('feature/x'), true);
  assert.equal(isPlausibleBranchName('-x'), false);
  assert.equal(gitExitCode({ result: { code: 1 } }), 1);
  assert.equal(gitExitCode({ result: { code: 1 }, remoteExitSynthesized: true }), undefined);
});

test('generator: the originals and their call sites still match 2.42304.0, and the outputs are current', async () => {
  await extractR4eEnvbranch({ check: true });
  const manifest = JSON.parse(await fs.readFile(new URL('../src/generated/r4e-envbranch/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  const [module] = manifest.modules;
  assert.deepEqual(module.bindings.map(binding => binding.exportedAs), ['startBranchMissing', 'branchMissingMessage']);
  assert.deepEqual(module.imports.map(entry => [entry.local, entry.name]), [['J', 'LocalSessions']]);
  assert.equal(module.callSites.me.in !== null, true, 'me is located inside its hook');
  const { branchMissingMessage } = await import('../src/generated/r4e-envbranch/start-branch-missing.mjs');
  assert.equal(branchMissingMessage.id, '94ae6MV2dl');
});

let server, notice, i18n, glue;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  notice = await server.ssrLoadModule('/src/source-r4e-envbranch-notice.jsx');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  glue = await server.ssrLoadModule('/src/r4h-glue-decisions.mjs');
});
after(async () => { i18n?.setLocale('en-US'); await server?.close(); });

test('the warning: FA.branchMissing with its known/saved selects, keyed branch-missing:<branch>, in en-US and zh-CN', () => {
  i18n.setLocale('en-US');
  assert.deepEqual(notice.branchMissingNotice({ branch: 'gone', fallback: 'main', savedBranch: 'gone' }), {
    message: 'Branch gone wasn’t found in this folder’s repository. This session will start from main. To pick another branch, edit the environment.',
    key: 'branch-missing:gone',
  });
  assert.equal(notice.branchMissingNotice({ branch: 'gone', fallback: '', savedBranch: 'other' }).message,
    'Branch gone wasn’t found in this folder’s repository, so it won’t be used.');
  i18n.setLocale('zh-CN');
  assert.equal(notice.branchMissingNotice({ branch: 'gone', fallback: 'main', savedBranch: 'gone' }).message,
    '在此文件夹的仓库中找不到分支 gone。此会话将从 main 开始。如需选择其他分支，请编辑该环境。');
  assert.equal(notice.branchMissingNotice({ branch: 'gone', fallback: undefined }).message, '在此文件夹的仓库中找不到分支 gone，因此不会使用它。');
  i18n.setLocale('en-US');
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

// A controlled host harness driving the exact pure functions main.jsx wires (runSelectBranch, finishBranchCheck,
// applySavedBranchCheck, isStartBranchCheckPending, currentHeldStartKey, settleHeldStart, holdStartWhileBranchCheck,
// holdStartOnWorkspaceRace, cancelBranchSwitch) over fake IPC and a controllable send().
function makeBranchHost({ workdir = '/repo', checkedOut = 'main', branch = checkedOut, worktree = false, savedBranch = undefined, handlers = {} } = {}) {
  const state = {
    current: null,
    workdir,
    worktree,
    savedBranch,
    workspaceInfo: { isRepo: true, branch, checkedOut },
    branchCheck: null,
    branchSwitch: null,
    heldRevision: 0,
    error: null,
  };
  const branchPick = { current: branch };
  const branchFolder = { current: workdir };
  const branchCheckRef = { current: null };
  const startCheckSeen = { current: null };
  const heldStart = { current: null };
  const recorded = [];
  const toasts = [];
  const sent = [];
  const ipcCalls = [];

  const bumpHeldStart = () => { state.heldRevision += 1; };
  const recordBranch = (nextBranch, head) => {
    recorded.push([nextBranch, head]);
    state.workspaceInfo = { ...state.workspaceInfo, branch: nextBranch, ...(head ? { checkedOut: head } : {}) };
  };
  const endBranchCheck = pending => glue.finishBranchCheck({
    pending,
    branchCheckRef,
    setBranchCheck: next => { state.branchCheck = next; },
    heldStart,
    bumpHeldStart,
  });
  const call = async (method, payload) => {
    ipcCalls.push([method, payload]);
    if (handlers[method]) return handlers[method](payload);
    throw new Error(`unexpected IPC ${method}`);
  };
  const selectBranch = (target, options = {}) => glue.runSelectBranch({
    target,
    environment: options.environment ?? false,
    workdir: state.workdir,
    workspaceInfo: state.workspaceInfo,
    worktree: state.worktree,
    savedBranch: state.savedBranch,
    branchPick,
    branchFolder,
    branchCheckRef,
    setBranchCheck: next => { state.branchCheck = next; },
    endBranchCheck,
    recordBranch,
    setBranchSwitch: next => { state.branchSwitch = next; },
    call,
    branchMissingNotice: notice.branchMissingNotice,
    toasts: { add: (msg, opts) => toasts.push({ message: msg, ...opts }) },
    setError: msg => { state.error = msg; },
    ...(options.checkStartBranch ? { checkStartBranch: options.checkStartBranch } : {}),
  });
  const pending = () => glue.isStartBranchCheckPending({ workspaceInfo: state.workspaceInfo, branchCheckRef, startCheckSeen });
  const keyNow = () => glue.currentHeldStartKey({
    current: state.current,
    workdir: state.workdir,
    worktree: state.worktree,
    branchCheckRef,
    workspaceInfo: state.workspaceInfo,
  });
  const settle = () => glue.settleHeldStart({
    heldStart,
    pending: pending(),
    key: keyNow(),
    branchSwitch: state.branchSwitch,
    send: opts => { sent.push(opts); },
  });
  const submit = (priority = 'now') => {
    if (glue.holdStartWhileBranchCheck({ current: state.current, pending: pending(), priority, key: keyNow(), heldStart, bumpHeldStart })) return 'held';
    sent.push({ priority });
    return 'sent';
  };
  const runSavedEffect = () => glue.applySavedBranchCheck({ workspaceInfo: state.workspaceInfo, startCheckSeen, selectBranch });
  const cancelDialog = () => glue.cancelBranchSwitch({
    dialog: state.branchSwitch,
    recordBranch,
    setBranchSwitch: next => { state.branchSwitch = next; },
  });

  return { state, branchPick, branchFolder, branchCheckRef, startCheckSeen, heldStart, recorded, toasts, sent, ipcCalls, selectBranch, endBranchCheck, pending, keyNow, settle, submit, runSavedEffect, cancelDialog };
}

test('selectBranch + held start behavior: clean check releases queued send once; missing branch reverts, warns and drops; conflict opens GR, drops and reverts on cancel', async () => {
  i18n.setLocale('en-US');

  // 0) Worktree on or picking the checked-out branch skips Te and ends any check immediately (G's _e(void 0)).
  {
    const h = makeBranchHost({ worktree: true });
    await h.selectBranch('feature/wt');
    assert.deepEqual(h.ipcCalls, []);
    assert.deepEqual(h.recorded, [['feature/wt', undefined]]);
    const same = makeBranchHost({ checkedOut: 'main', branch: 'main' });
    await same.selectBranch('main');
    assert.deepEqual(same.ipcCalls, []);
    assert.deepEqual(same.recorded, [['main', undefined]]);
  }

  // 1) Send while Te is in flight, result is clean -> held while pending, then released exactly once with its priority.
  {
    const gate = deferred();
    const h = makeBranchHost({
      handlers: {
        'branch-switch-check': () => gate.promise,
        'workspace-git-branches': () => ['main', 'feature/clean'],
      },
    });
    const checking = h.selectBranch('feature/clean');
    assert.equal(h.pending(), true);
    assert.equal(h.submit('now'), 'held');
    assert.equal(h.settle(), 'wait');
    assert.deepEqual(h.sent, []);

    gate.resolve({ dirty: false, branch: 'main' });
    await checking;
    assert.equal(h.pending(), false);
    assert.deepEqual(h.recorded, [['feature/clean', 'main']]);
    assert.equal(h.settle(), 'release');
    assert.deepEqual(h.sent, [{ priority: 'now' }]);
    assert.equal(h.heldStart.current, null);
    assert.equal(h.settle(), 'none', 'a second settle does not re-send');
  }

  // 2) Result is missing branch -> reverts to checked-out branch, warns once with branch-missing:<branch>, and drops the held send.
  {
    const gate = deferred();
    const h = makeBranchHost({
      savedBranch: 'gone',
      handlers: {
        'branch-switch-check': () => gate.promise,
        'workspace-git-branches': () => ['main'],
      },
    });
    const checking = h.selectBranch('gone', {
      environment: true,
      checkStartBranch: async ({ conflict, branches }) => {
        const check = await conflict();
        await branches();
        return { check, conflict: true, missing: true };
      },
    });
    assert.equal(h.submit('now'), 'held');
    gate.resolve({ dirty: true, branch: 'main' });
    await checking;

    assert.deepEqual(h.recorded, [['main', 'main']], 'reverted back to checked-out head');
    assert.equal(h.toasts.length, 1);
    assert.equal(h.toasts[0].key, 'branch-missing:gone');
    assert.equal(h.toasts[0].variant, 'warning');
    assert.equal(h.settle(), 'drop', 'key changed from gone to main, so the held send is dropped');
    assert.deepEqual(h.sent, []);
  }

  // 3) Result is dirty conflict -> opens GR (with revertOnCancel for environment), drops the held send, and cancel reverts only when revertOnCancel is set.
  {
    const checkStatus = { dirty: true, branch: 'main', modified: 2 };
    const h = makeBranchHost({
      handlers: {
        'branch-switch-check': () => checkStatus,
        'workspace-git-branches': () => ['main', 'feature/dirty'],
      },
    });
    const checking = h.selectBranch('feature/dirty', {
      environment: true,
      checkStartBranch: async ({ conflict }) => ({ check: await conflict(), conflict: true, missing: false }),
    });
    assert.equal(h.submit('now'), 'held');
    await checking;

    assert.deepEqual(h.state.branchSwitch, {
      cwd: '/repo',
      currentBranch: 'main',
      targetBranch: 'feature/dirty',
      status: checkStatus,
      revertOnCancel: true,
    });
    assert.equal(h.settle(), 'drop', 'opening the conflict dialog drops the queued start');
    assert.deepEqual(h.sent, []);

    h.cancelDialog();
    assert.equal(h.state.branchSwitch, null);
    assert.deepEqual(h.recorded, [['main', undefined]], 'revertOnCancel reverts the draft branch to currentBranch');

    // Manual pick (environment: false) has no revertOnCancel and leaves the recorded branch untouched on cancel.
    await h.selectBranch('feature/dirty', {
      environment: false,
      checkStartBranch: async ({ conflict }) => ({ check: await conflict(), conflict: true, missing: false }),
    });
    assert.equal(h.state.branchSwitch.revertOnCancel, undefined);
    h.recorded.length = 0;
    h.cancelDialog();
    assert.deepEqual(h.recorded, []);
  }
});

test('selectBranch concurrency, folder change, saved-environment effect and workspace-info race', async () => {
  // 4) Newer pick or folder change while a check is in flight: stale check is ignored and finishBranchCheck(stale) keeps the newer check pending.
  {
    const gate1 = deferred(), gate2 = deferred();
    const h = makeBranchHost({
      handlers: {
        'branch-switch-check': ({ target }) => (target === 'b1' ? gate1.promise : gate2.promise),
        'workspace-git-branches': () => ['main', 'b1', 'b2'],
      },
    });
    const p1 = h.selectBranch('b1');
    const p2 = h.selectBranch('b2');
    assert.equal(h.branchCheckRef.current?.target, 'b2');

    // b1 settles as missing after b2 was picked: b1 must neither warn nor clear b2's pending state.
    gate1.resolve({ dirty: true, branch: 'main' });
    await p1;
    assert.equal(h.pending(), true, 'b2 check remains pending after stale b1 finishes');
    assert.equal(h.toasts.length, 0);
    assert.deepEqual(h.recorded, []);

    gate2.resolve({ dirty: false, branch: 'main' });
    await p2;
    assert.equal(h.pending(), false);
    assert.deepEqual(h.recorded, [['b2', 'main']]);

    // Folder change during check drops both the check result and the held start.
    const gate3 = deferred();
    const folderHost = makeBranchHost({
      handlers: {
        'branch-switch-check': () => gate3.promise,
        'workspace-git-branches': () => ['main', 'b3'],
      },
    });
    const p3 = folderHost.selectBranch('b3');
    assert.equal(folderHost.submit('now'), 'held');
    folderHost.state.workdir = '/other-repo';
    folderHost.branchFolder.current = '/other-repo';
    gate3.resolve({ dirty: false, branch: 'main' });
    await p3;
    assert.deepEqual(folderHost.recorded, [], 'folder changed before check settled');
    assert.equal(folderHost.settle(), 'drop', 'held start key no longer matches the new folder');
    assert.deepEqual(folderHost.sent, []);
  }

  // 5) Saved environment marker: pending before the effect runs, then applySavedBranchCheck starts selectBranch synchronously so pending stays true.
  {
    const gate = deferred();
    const h = makeBranchHost({
      branch: 'env-branch',
      handlers: {
        'branch-switch-check': () => gate.promise,
        'workspace-git-branches': () => ['main', 'env-branch'],
      },
    });
    const marker = { branch: 'env-branch' };
    h.state.workspaceInfo = { ...h.state.workspaceInfo, branch: 'env-branch', startBranchCheck: marker };
    assert.equal(h.pending(), true, 'unseen startBranchCheck marker already counts as pending');
    assert.equal(h.submit('now'), 'held');

    assert.equal(h.runSavedEffect(), true);
    assert.equal(h.startCheckSeen.current, marker);
    assert.equal(h.branchCheckRef.current?.target, 'env-branch', 'selectBranch set branchCheckRef synchronously');
    assert.equal(h.pending(), true, 'still pending without a gap');
    assert.equal(h.settle(), 'wait');

    gate.resolve({ dirty: false, branch: 'main' });
    await new Promise(r => setImmediate(r));
    assert.equal(h.pending(), false);
    assert.equal(h.settle(), 'release');
    assert.deepEqual(h.sent, [{ priority: 'now' }]);
  }

  // 6) Workspace-info race inside send(): adopts startWorkspace, holds the start, calls restoreStay when stay is true, and releases once Te settles.
  {
    const gate = deferred();
    const h = makeBranchHost({
      handlers: {
        'branch-switch-check': () => gate.promise,
        'workspace-git-branches': () => ['main', 'race-branch'],
      },
    });
    h.state.workspaceInfo = null;
    const startWorkspace = { isRepo: true, branch: 'race-branch', checkedOut: 'main', startBranchCheck: { branch: 'race-branch' } };
    let stayRestored = 0;
    const held = glue.holdStartOnWorkspaceRace({
      id: null,
      beside: false,
      workspaceInfo: h.state.workspaceInfo,
      startWorkspace,
      worktree: false,
      currentCwd: '/repo',
      turnCwd: '/repo',
      priority: 'later',
      stay: true,
      setWorkspaceInfo: updater => { h.state.workspaceInfo = updater(h.state.workspaceInfo); },
      heldStart: h.heldStart,
      bumpHeldStart: () => { h.state.heldRevision += 1; },
      restoreStay: () => { stayRestored += 1; },
    });
    assert.equal(held, true);
    assert.equal(stayRestored, 1, 'stay send restores the draft while held');
    assert.equal(h.state.workspaceInfo, startWorkspace);
    assert.equal(h.pending(), true);

    h.runSavedEffect();
    gate.resolve({ dirty: false, branch: 'main' });
    await new Promise(r => setImmediate(r));
    assert.equal(h.settle(), 'release', 'held key from holdStartOnWorkspaceRace matches currentHeldStartKey after Te settles');
    assert.deepEqual(h.sent, [{ priority: 'later' }]);
  }
});

// R4e-envbranch review: the start is held while Te runs (branchCheckPending → the draft's gh holdSubmit), including the
// send that raced the draft's workspace-info.
const officialV1 = new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/', import.meta.url);
const occurrences = (text, needle) => text.split(needle).length - 1;
test('2.42304.0: branchCheckPending holds the draft submit, keyed by the start branch; the composer queues, drops and releases', async () => {
  const draft = await fs.readFile(new URL('cc43287c9-DAfOi8yP.js', officialV1), 'utf8');
  for (const needle of ['branchCheckPending:ve!==void 0', 'let be=ve??j', 'sourceBranch:H||l||ie?void 0:be', 'r?pe(t):M(t)',
    'startIntent.modelPending===!0||Y.branchCheckPending)', 'worktree:Y.worktree,pickedSourceBranch:Y.sourceBranch', 'xh=x(()=>QK(bh),[bh])',
    'holdSubmit:gh,holdTargetKey:xh', 'D(()=>{gh||Na.current?.releaseQueuedSubmit()},[gh,Eh])', 'onQueuedSubmitReady:Dh'])
    assert.equal(occurrences(draft, needle), 1, needle);
  const composer = await fs.readFile(new URL('c227f4d5e-Ba-r--Rl.js', officialV1), 'utf8');
  for (const needle of ['holdSubmit:x=!1', 'if(x||ft.current)return e?.machineSend||X.isEmpty&&!_t.current?!1:(pt.current={',
    'gt=H(()=>{pt.current!==null&&(pt.current=null,ht(!1))},[])', 'if(t.targetKey!==C){gt();return}',
    'Ni=H(()=>{let e=pt.current;e===null||e.targetKey!==C||ot.current||ft.current||(gt(),Mi(e.opts))}', 'releaseQueuedSubmit:Ni,dropQueuedSubmit:gt'])
    assert.equal(occurrences(composer, needle), 1, needle);
});

test('host wiring: main.jsx delegates branch check & hold decisions to r4h-glue-decisions.mjs; main.cjs answers branch-on-origin', async () => {
  const jsx = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(jsx, /import \{ runSelectBranch, finishBranchCheck, applySavedBranchCheck, isStartBranchCheckPending, currentHeldStartKey, settleHeldStart, holdStartWhileBranchCheck, holdStartOnWorkspaceRace, cancelBranchSwitch, openSessionPaneTile, executeCopyCommand \} from "\.\/r4h-glue-decisions\.mjs";/);
  for (const callSite of [
    'await runSelectBranch({',
    'finishBranchCheck({ pending, branchCheckRef, setBranchCheck, heldStart, bumpHeldStart });',
    'applySavedBranchCheck({ workspaceInfo, startCheckSeen, selectBranch });',
    'return isStartBranchCheckPending({ workspaceInfo, branchCheckRef, startCheckSeen });',
    'return currentHeldStartKey({ current, workdir, worktree, branchCheckRef, workspaceInfo });',
    'settleHeldStart({ heldStart, pending: startBranchCheckPending(), key: heldStartKeyNow(), branchSwitch, send });',
    'if (holdStartWhileBranchCheck({ current, pending: startBranchCheckPending(), priority, key: heldStartKeyNow(), heldStart, bumpHeldStart })) return;',
    'if (holdStartOnWorkspaceRace({ id, beside, workspaceInfo, startWorkspace, worktree, currentCwd: workdirRef.current, turnCwd, priority, stay, setWorkspaceInfo, heldStart, bumpHeldStart, restoreStay })) return;',
    'onCancel={() => cancelBranchSwitch({ dialog: shownBranchSwitch.value, recordBranch, setBranchSwitch })}',
  ]) assert.equal(occurrences(jsx, callSite), 1, callSite);
  const cjs = await fs.readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(cjs, /case "branch-on-origin":\s+return require\("\.\/r4e-envbranch-origin\.cjs"\)\.createHostBranchOnOrigin\(\{ run \}\)\(workspaceQueryRoot\(p\.cwd\), p\.branch\);/);
});
