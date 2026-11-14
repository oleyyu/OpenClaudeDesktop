// R4f-proposal P3 (tasks-proposal-group-card WI-3, tasks-11): the host proposal spawner (src/proposal-spawner.mjs), the
// object the inline proposal group card reads through qQ/h1e, against the 2.42304.0 spawner F1e
// (c96d752d0-BOCqU7c2.js). Injected stubs only: nothing starts, sends or names a real session, no IPC, no core.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { createProposalSpawner, PROPOSAL_SPAWNER_MESSAGES } from '../src/proposal-spawner.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const official = name => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const u = text => text.replaceAll('’', '\\u2019').replaceAll('“', '\\u201C').replaceAll('”', '\\u201D');
setLocale(DEFAULT_LOCALE);

// The official pure helpers the caller passes in (R4f-proposal P1 exports them from the generated proposal-group
// module). Here they are the 2.42304.0 one-liners, each pinned below against its chunk.
const T_DOLLAR = 'function t$(e){return e.id??e.prompt}function n$(e){return e.offer===!0&&e.autoStart!=="cloud"}';
const F_DOLLAR = 'function f$(e,t,n){if(!e||!t)return;let r=e=>Tie(e.replace(/[/\\\\]+$/,"")),i=r(e);return i!==""&&i!==r(t)&&i!==r(n??"")?e.replace(/[/\\\\]+$/,""):void 0}';
const P_DOLLAR = 'var j1e=new Set(["default","acceptEdits","plan","auto","dontAsk"]);function p$(e,t){if(!(t&&!j1e.has(e??"")))return e}';
const AI = 'function AI(e,t){return e==="bypassPermissions"||e==="auto"&&!0}';
const YW = 'function YW(e,t){let n=e??[];return t.size===0?n:n.filter(e=>e.id===void 0||!t.has(e.id))}';
const ZG_LOCAL = 'if(i===void 0||!t)return i??r;';
const Tie = e => e; // shared-28 xr (NO): unchanged for a POSIX path
const j1e = new Set(['default', 'acceptEdits', 'plan', 'auto', 'dontAsk']);
const helpers = {
  proposalKey: e => e.id ?? e.prompt,
  isOffer: e => e.offer === true && e.autoStart !== 'cloud',
  crossRepoCwdOf(e, t, n) {
    if (!e || !t) return;
    const r = e => Tie(e.replace(/[/\\]+$/, '')), i = r(e);
    return i !== '' && i !== r(t) && i !== r(n ?? '') ? e.replace(/[/\\]+$/, '') : undefined;
  },
  keepSessionMode(e, t) { if (!(t && !j1e.has(e ?? ''))) return e; },
  needsModeConsent: e => e === 'bypassPermissions' || e === 'auto',
  // zG without a cloud card and without modeFollowsSession (the only branch these cases reach).
  resolvePermissionMode({ overrides, modeFollowsSession }, r) {
    assert.ok(!modeFollowsSession, 'the stub covers zG\'s `!t` branch only');
    return overrides?.permissionMode ?? r;
  },
  // w1e (stub: the official one also cleans and clamps the title).
  hereText: record => `Do this task here: “${record.title || record.tldr}”`,
};

// c227f4d5e GW (spawning per parent: tG mark, nG clear, JW + YW the visible queue) and c96d752d0 EQ (MQ / NQ), as plain maps.
function stores() {
  const spawningBy = new Map(), resultsBy = new Map();
  const spawning = {
    visible(queue, parentId) {
      const set = new Set(spawningBy.get(parentId) ?? []);
      return set.size === 0 ? queue ?? [] : (queue ?? []).filter(e => e.id === undefined || !set.has(e.id));
    },
    mark(parentId, id) { const list = spawningBy.get(parentId) ?? []; if (!list.includes(id)) spawningBy.set(parentId, [...list, id]); },
    clear(parentId, id) { spawningBy.set(parentId, (spawningBy.get(parentId) ?? []).filter(entry => entry !== id)); },
  };
  const results = {
    record(parentId, taskId, outcome) { resultsBy.set(`${parentId}/${taskId}`, outcome); },
    clear(parentId, taskId) { resultsBy.delete(`${parentId}/${taskId}`); },
  };
  return { spawning, results, spawningOf: parentId => spawningBy.get(parentId) ?? [], resultOf: (parentId, taskId) => resultsBy.get(`${parentId}/${taskId}`) };
}

const PARENT = 'thr_parent';
const proposal = (n, extra = {}) => ({ id: `task_0000000${n}`, title: `Task ${n}`, tldr: `Why ${n}`, prompt: `Do task ${n}`, createdAt: 1000 + n, toolUseId: `call_${n}`, ...extra });
const hostOf = (queue, session = {}, extra = {}) => ({ sessionId: PARENT, available: true, queue,
  session: { originCwd: '/work/repo', cwd: '/work/repo', model: 'gpt-5.5', effort: 'medium', permissionMode: 'default', ...session }, ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup({ queue = [proposal(1)], session, host: hostExtra, bridge: bridgeOverrides = {}, ...rest } = {}) {
  const log = [], toasts = [];
  const { spawning, results, spawningOf, resultOf } = stores();
  const bridge = {
    async popById(parentId, taskId, launched) { log.push(['pop', parentId, taskId, launched]); return true; },
    async sendMessage(parentId, text) { log.push(['send', parentId, text]); },
    async start(request) { log.push(['start', request]); return { sessionId: `thr_child_${request.spawnedFrom?.taskId ?? 'x'}` }; },
    ...bridgeOverrides,
  };
  const spawner = createProposalSpawner({ official: helpers, spawning, results, bridge,
    notify: (message, options) => toasts.push([message, options?.variant]), ...rest });
  const host = hostOf(queue, session, hostExtra);
  spawner.setHost(host);
  return { spawner, log, toasts, spawningOf, resultOf, host };
}
const keyOf = record => ({ key: record.id, cwd: record.cwd });

test('F1e official: the spawner object, its busy/whenIdle queue, the start order and the helpers this module takes', () => {
  const chunk = official('c96d752d0-BOCqU7c2.js');
  for (const text of [
    'function F1e({sessionRef:e,hasSuggestions:t,captureGuardedSnapToBottom:n,inlineCards:i=!1}){',
    'Xe=P(()=>{We.current=!1,Ke(e=>e+1);let e=Ye.current;Ye.current=[];for(let t of e)t()},[])',
    'Ze=P(()=>We.current?new Promise(e=>{Ye.current.push(e)}):O1e,[])',
    'tt=P(()=>cde(Qe(),l?lle(l):new Set),[l,Qe])',
    'it=P(e=>{if(We.current||!l)return Promise.resolve();let t=tt().find(t=>t$(t)===e.key);return t?n$(t)&&t.accepted===!0?(t.id&&vle(l,t.id),Promise.resolve()):(We.current=!0,N1e(l,t,rt,Xe)):Promise.resolve()},[l,tt,rt,Xe])',
    'async function N1e(e,t,n,r){try{she(),t.id&&MQ(e,t.id,n$(t)?"kept_here":"dismissed"),!await n(!1,t)&&t.id&&NQ(e,t.id)}finally{r()}}',
    'ct=P(async(t,r,d)=>{if(We.current||!l||!e)return;',
    'k=_?{permissionMode:_.permissionMode,model:O?.model??_.model,effort:O?.effort??_.effort,sourceBranch:void 0}:{permissionMode:g?.permissionMode,model:O?.model??g?.model,effort:O?.effort??g?.effort,sourceBranch:g?.sourceBranch},A=T?void 0:p$(k.permissionMode,w),N=ff({...d,overrides:O},y!==void 0&&A!==void 0&&Jf(A,{autoIsDefault:Ne})?void 0:A)',
    'try{K=t==="here"?!!(_?_.acceptsSends:$e?.sendMessage):await ie()}catch(e){throw Xe(),e}if(Xe(),!K)return;',
    'let ae=t==="here"?n():null,q=z&&W&&!_?v.id:void 0,J=q!==void 0,oe=_?v.id:void 0,Y=q===void 0&&!_?v.id:void 0;Y!==void 0&&mf(l,Y);let se=t==="here"&&!_&&!!(v.id&&$e?.popBackgroundTaskSuggestionById);',
    'if(!J&&!_&&!se&&!await rt(!0,v).catch(()=>!1)){Y!==void 0&&st(Y);return}',
    'let t=w1e(a,v);ae?.(),_?await R({ref:e,text:t,uuid:crypto.randomUUID()}):$e?.sendMessage&&(xve(l),await wpe(l,t)),v.id&&MQ(l,v.id,"sent_here"),Je({title:v.title}),_e=se&&!await rt(!0,v)&&Qe().some(e=>e.id===v.id)',
    'useWorktree:ee&&!m,sourceBranch:ee&&!m&&!w?k.sourceBranch:void 0,model:k.model,minCliVersion:u(k.model),effort:k.effort,permissionMode:N',
    'if(r.includes("[spawn-cancelled]")){he=!0,ge="cancelled"',
    'Y!==void 0&&(ge==="failed"&&!se&&MQ(l,Y,"start_failed"),ge!=="started"&&t!=="here"&&(ce!==null&&!le?$e?.notifySpawnedTaskStarted?.(l,Y,"cloud",ce,x?.title):$e?.notifySpawnedTaskUnstarted?.(l,Y)),_e&&(NQ(l,Y),Je({title:v.title,back:!0})),st(Y))',
    'return e!=="here"&&(o||d)&&c!==void 0&&Jf(c,{autoIsDefault:u})?{kind:"ask",mode:c,workspace:a??r?.originCwd??""}:{kind:"run"}',
    'dt=P(async(e,t,n,r)=>{for(;;){for(;We.current;)await Ze();let i=lt(e,t,n);if(i.kind==="skip")return r;if(i.kind==="run"||r?.mode===i.mode&&r.workspace===i.workspace)return await ct(e,t,n),r;if(await ut(i,t.key)==="declined")return"declined";r={mode:i.mode,workspace:i.workspace}}},[Ze,lt,ut,ct])',
    'ft=P(async(e,t,n)=>!We.current&&(await dt(e,t,n),!0),[dt])',
    'pt=P(async e=>{let t;for(let{target:n,clicked:r,options:i}of e){let e=await dt(n,r,i,t);if(e==="declined")return;t=e}},[dt])',
    'wt=Ct?bt||Ce&&!St?"cloud":"here":p&&(bt||Se!==void 0&&!St)?"cloud":"worktree"',
    'Tt=C(()=>{let e=P1e(a,ht,gt);return{...e,primary:wt==="worktree"?e.startWithWorktree:wt==="cloud"?e.sendToCloud:e.fixHere}},[a,ht,gt,wt])',
    'return[...s?[l]:[],{label:Tt.startLocally,disabled:yt||Ct,hint:c,description:Ct?a.formatMessage(z.reason):void 0,onSelect:()=>e("local")},{label:Tt.fixHere,disabled:_t||p&&M?.acceptsSends===!1,onSelect:()=>e("here")}]',
    'At=!!l&&!!(p?$e?.start&&!f:$e?.popBackgroundTaskSuggestion)',
    T_DOLLAR, F_DOLLAR, P_DOLLAR,
    'import{t as DS}from"./c5b9e310e-Dljk8moA.js"',
  ]) assert.equal(count(chunk, text), 1, text);
  // ff/Jf/cde/lle/mf/rue are c227f4d5e zG/AI/YW/JW/tG/nG; Tie is shared-28 xr.
  for (const text of ['In as ff', 'ro as Jf', 'tr as cde', 'Gn as lle', 'Jn as mf', 'Zn as rue', 'xr as Tie}from"./shared-28-DcgD7xXH.js"'])
    assert.equal(count(chunk, text), 1, text);
  const options = official('c227f4d5e-Ba-r--Rl.js');
  for (const text of [AI, YW, ZG_LOCAL, 'function tG(e,t){KW(e,e=>e.includes(t)?e:[...e,t])}', 'function JW(e){let t=GW.getState().byParent[e];return t&&t.length>0?new Set(t):WW}'])
    assert.equal(count(options, text), 1, text);
  const exported = options.slice(options.lastIndexOf('export{'));
  for (const text of ['zG as In', 'AI as ro', 'YW as tr', 'JW as Gn', 'tG as Jn', 'nG as Zn']) assert.equal(count(exported, text), 1, text);
  // The defaultMessages this module keeps as its i18n keys.
  for (const text of [u('failed:{defaultMessage:"Couldn’t start the suggested task.",id:"1AkXZSA+5K"}'),
    'localLabel:ht??a.formatMessage({defaultMessage:"Local",id:"MpsZ34EpZH"})',
    'cloudDisabledReason:Ce?St?a.formatMessage({defaultMessage:"This session wasn\\u2019t created from a github.com repository",id:"yHdkrLPyfU"}):void 0:we?a.formatMessage(ni.disabledByOrg):a.formatMessage({defaultMessage:"No cloud environment configured",id:"8/nYCRMZAy"})',
    'defaultMessage:"That card was already answered, or its turn ended. Send the task again to start it.",id:"43I3kLHBjT"',
    'cloudOnly:{defaultMessage:"This suggested task can only start in the cloud, on {repo}.",id:"57wGsCl3MG"}',
    'e.formatMessage({defaultMessage:"Start locally",id:"HlsEbl3CKu"})', 'e.formatMessage({defaultMessage:"Start with worktree",id:"i/rNItpPCW"})',
    'sendToCloud:e.formatMessage({defaultMessage:"Send to cloud",id:"VfdzzfbVPP"})', 'fixHere:e.formatMessage({defaultMessage:"Do it here",id:"qNy7sbs812"})',
    u('C1e=lc({turn:{defaultMessage:"Do this task here: “{title}”",id:"s8H8HzSUca"}})')])
    assert.equal(count(chunk, text), 1, text);
  assert.equal(PROPOSAL_SPAWNER_MESSAGES.failed, 'Couldn’t start the suggested task.');
});

test('the snapshot has F1e\'s fields in its order, with a local parent\'s values', () => {
  const chunk = official('c96d752d0-BOCqU7c2.js');
  const shape = /return C\(\(\)=>\(\{(sessionId:l,isCloudParent:p,[^}]*consent:jt)\}\)/.exec(chunk);
  assert.ok(shape, 'F1e return');
  const keys = shape[1].split(',').map(entry => entry.split(':')[0]);
  const { spawner, host } = setup();
  const snapshot = spawner.getSnapshot();
  assert.deepEqual(Object.keys(snapshot), keys);
  assert.equal(snapshot.sessionId, PARENT);
  assert.equal(snapshot.canRender, true);
  assert.equal(snapshot.isCloudParent, false);
  assert.equal(snapshot.cloudSpawnDisabled, true);
  assert.equal(snapshot.hasCloudEnv, false);
  assert.equal(snapshot.parentOriginCwd, '/work/repo');
  assert.equal(snapshot.parentPermissionMode, 'default');
  assert.equal(snapshot.primaryTarget, 'worktree');
  assert.equal(snapshot.primaryDisabled, false);
  assert.deepEqual(snapshot.labels, { startLocally: 'Start locally', startWithWorktree: 'Start with worktree', sendToCloud: 'Send to cloud', fixHere: 'Do it here', primary: 'Start with worktree' });
  assert.deepEqual(snapshot.places, { localLabel: 'Local', localIsRemoteHost: false, placeVariant: undefined, localInVariant: false, localDisabledReason: undefined,
    localPending: false, cloudTargets: [], cloudDisabledReason: 'No cloud environment configured', cloudPending: false, hereDisabled: false });
  assert.equal(snapshot.consent.confirming, null);
  assert.equal(snapshot.lastSentHere, undefined);
  const picked = [];
  const items = snapshot.menuItemsFor(target => picked.push(target));
  assert.deepEqual(items.map(item => [item.label, item.disabled]), [['Start locally', false], ['Do it here', false]]);
  items.forEach(item => item.onSelect());
  assert.deepEqual(picked, ['local', 'here']);
  // Same host and state → the same object (useSyncExternalStore); a new host object → a new snapshot.
  assert.equal(spawner.getSnapshot(), snapshot);
  spawner.setHost({ ...host, available: false });
  assert.equal(spawner.getSnapshot().canRender, false);
  assert.notEqual(spawner.getSnapshot(), snapshot);
  // The queue reads are the host's derived queue minus the tasks being started.
  spawner.setHost(host);
  assert.deepEqual(spawner.getSnapshot().readQueue().map(entry => entry.id), ['task_00000001']);
  assert.equal(spawner.getSnapshot().crossRepoCwdOf('/work/other/'), '/work/other');
  assert.equal(spawner.getSnapshot().crossRepoCwdOf('/work/repo'), undefined);
});

test('Start: marks it starting, pops it as launched, starts it from the parent\'s folder with the session\'s settings, never navigates', async () => {
  const started = [];
  const { spawner, log, toasts, spawningOf, resultOf } = setup({ onStarted: (child, info) => started.push([child, info]) });
  const record = proposal(1);
  const start = deferred();
  const order = [];
  const { spawner: s2, log: log2, spawningOf: spawning2 } = setup({ bridge: { async start(request) { order.push(['start', request.cwd]); return start.promise; } } });
  // The full order on the first spawner.
  assert.equal(await spawner.getSnapshot().requestSpawn('worktree', keyOf(record), undefined), true);
  assert.deepEqual(log.map(entry => entry[0]), ['pop', 'start']);
  assert.deepEqual(log[0], ['pop', PARENT, 'task_00000001', true]);
  assert.deepEqual(log[1][1], { parentId: PARENT, cwd: '/work/repo', title: 'Task 1', prompt: 'Do task 1',
    spawnedFrom: { sessionId: PARENT, taskId: 'task_00000001', title: 'Task 1' }, useWorktree: true, sourceBranch: undefined,
    model: 'gpt-5.5', effort: 'medium', permissionMode: 'default' });
  assert.deepEqual(started, [['thr_child_task_00000001', { parentId: PARENT, taskId: 'task_00000001' }]]);
  assert.equal(resultOf(PARENT, 'task_00000001'), undefined, 'a started task records no outcome (spawnedFrom marks it)');
  assert.deepEqual(spawningOf(PARENT), []);
  assert.deepEqual(toasts, []);
  // While it starts the row is spawning: hidden from the visible queue, still in the queue.
  const pending = s2.getSnapshot().requestSpawn('local', keyOf(record), undefined);
  await flush();
  assert.deepEqual(spawning2(PARENT), ['task_00000001']);
  assert.deepEqual(s2.getSnapshot().readVisibleQueue(), []);
  assert.equal(s2.getSnapshot().readQueue().length, 1);
  assert.equal(s2.getSnapshot().isBusy(), false, 'busy covers the preconditions only (Xe runs before the start)');
  start.resolve({ sessionId: 'thr_child' });
  assert.equal(await pending, true);
  assert.deepEqual(spawning2(PARENT), []);
  assert.deepEqual(order, [['start', '/work/repo']]);
  assert.deepEqual(log2.map(entry => entry[0]), ['pop']);
});

test('Start: Options overrides, another repository\'s folder, and a mode kept only when it is safe there', async () => {
  const { spawner, log } = setup({ queue: [proposal(1, { cwd: '/work/other/' }), proposal(2)], session: { permissionMode: 'bypassPermissions', sourceBranch: 'feature/x' } });
  // another repo: p$ drops bypassPermissions (not in j1e), so the start uses the zG fallback (the session mode is gone → undefined)
  await spawner.getSnapshot().requestSpawn('worktree', { key: 'task_00000001', cwd: '/work/other/' }, undefined);
  const crossRepo = log.find(entry => entry[0] === 'start')[1];
  assert.equal(crossRepo.cwd, '/work/other');
  assert.equal(crossRepo.permissionMode, undefined);
  assert.equal(crossRepo.sourceBranch, undefined, 'another repository: no source branch (sourceBranch: ee&&!m&&!w)');
  log.length = 0;
  await spawner.getSnapshot().requestSpawn('worktree', { key: 'task_00000002', cwd: undefined }, { overrides: { model: 'gpt-5.4-mini', effort: 'high' } });
  const same = log.find(entry => entry[0] === 'start')[1];
  assert.deepEqual([same.cwd, same.model, same.effort, same.permissionMode, same.sourceBranch, same.useWorktree], ['/work/repo', 'gpt-5.4-mini', 'high', 'bypassPermissions', 'feature/x', true]);
});

test('Start failure: the official toast, start_failed recorded, the starting mark cleared; a refused pop starts nothing', async () => {
  const { spawner, toasts, resultOf, spawningOf } = setup({ bridge: { async start() { throw new Error('turn/start refused'); } } });
  await spawner.getSnapshot().requestSpawn('worktree', keyOf(proposal(1)), undefined);
  assert.deepEqual(toasts, [['Couldn’t start the suggested task.', 'danger']]);
  assert.equal(resultOf(PARENT, 'task_00000001'), 'start_failed');
  assert.deepEqual(spawningOf(PARENT), []);
  // A start that answers without a session is a failure too (A1e).
  const empty = setup({ bridge: { async start() { return {}; } } });
  await empty.spawner.getSnapshot().requestSpawn('local', keyOf(proposal(1)), undefined);
  assert.equal(empty.resultOf(PARENT, 'task_00000001'), 'start_failed');
  // A cancelled start ("[spawn-cancelled]") neither toasts nor records start_failed.
  const cancelled = setup({ bridge: { async start() { throw new Error('[spawn-cancelled] stopped'); } } });
  await cancelled.spawner.getSnapshot().requestSpawn('local', keyOf(proposal(1)), undefined);
  assert.deepEqual(cancelled.toasts, []);
  assert.equal(cancelled.resultOf(PARENT, 'task_00000001'), undefined);
  // rt failing: nothing starts, the mark is cleared, nothing recorded.
  const refused = setup({ bridge: { async popById() { return false; }, async start() { throw new Error('must not start'); } } });
  await refused.spawner.getSnapshot().requestSpawn('worktree', keyOf(proposal(1)), undefined);
  assert.deepEqual(refused.toasts, []);
  assert.deepEqual(refused.spawningOf(PARENT), []);
  assert.equal(refused.resultOf(PARENT, 'task_00000001'), undefined);
});

test('Start all: one start after the other, in the list\'s order', async () => {
  const gates = [deferred(), deferred(), deferred()];
  const events = [];
  const queue = [proposal(1), proposal(2), proposal(3)];
  const { spawner } = setup({ queue, bridge: { async start(request) {
    const n = Number(request.spawnedFrom.taskId.slice(-1));
    events.push(`start ${n}`);
    await gates[n - 1].promise;
    events.push(`done ${n}`);
    return { sessionId: `thr_child_${n}` };
  } } });
  const all = spawner.getSnapshot().requestSpawnAll(queue.map(record => ({ target: 'worktree', clicked: keyOf(record), options: { asProposed: true } })));
  await flush();
  assert.deepEqual(events, ['start 1']);
  gates[1].resolve(); gates[2].resolve();
  await flush();
  assert.deepEqual(events, ['start 1'], 'the second waits for the first');
  gates[0].resolve();
  await all;
  assert.deepEqual(events, ['start 1', 'done 1', 'start 2', 'done 2', 'start 3', 'done 3']);
});

test('busy: a dismissal holds the spawner; requestSpawn is refused, Start all waits (whenIdle), busyEpoch moves on release', async () => {
  const popGate = deferred();
  const { spawner, log, resultOf } = setup({ queue: [proposal(1), proposal(2)], bridge: { async popById(parentId, taskId, launched) {
    log.push(['pop', taskId, launched]);
    if (!launched) await popGate.promise;
    return true;
  } } });
  const epochs = [];
  spawner.subscribe(() => { epochs.push(spawner.getSnapshot().busyEpoch); });
  const before = spawner.getSnapshot();
  const dismissing = before.dismiss({ key: 'task_00000001' });
  assert.equal(before.isBusy(), true);
  assert.equal(resultOf(PARENT, 'task_00000001'), 'dismissed');
  assert.equal(await before.requestSpawn('worktree', keyOf(proposal(2)), undefined), false);
  await before.dismiss({ key: 'task_00000002' });
  assert.equal(resultOf(PARENT, 'task_00000002'), undefined, 'a dismissal while busy is ignored');
  const all = before.requestSpawnAll([{ target: 'local', clicked: keyOf(proposal(2)), options: undefined }]);
  let idle = false;
  before.whenIdle().then(() => { idle = true; });
  await flush();
  assert.equal(idle, false);
  assert.equal(log.filter(entry => entry[0] === 'start').length, 0);
  popGate.resolve();
  await dismissing;
  await all;
  assert.equal(idle, true);
  // Each release (Xe) moves busyEpoch on and tells the subscribers: the dismissal's, then the start's precondition.
  assert.deepEqual(epochs, [before.busyEpoch + 1, before.busyEpoch + 2]);
  assert.equal(log.filter(entry => entry[0] === 'start').length, 1, 'Start all ran once the spawner was idle');
});

test('dismiss: dismissed then a not-launched pop (N1e); a refused pop takes the outcome back', async () => {
  const { spawner, log, resultOf } = setup();
  await spawner.getSnapshot().dismiss({ key: 'task_00000001' });
  assert.deepEqual(log, [['pop', PARENT, 'task_00000001', false]]);
  assert.equal(resultOf(PARENT, 'task_00000001'), 'dismissed');
  assert.equal(spawner.getSnapshot().isBusy(), false);
  const refused = setup({ bridge: { async popById() { throw new Error('ipc down'); } } });
  await refused.spawner.getSnapshot().dismiss({ key: 'task_00000001' });
  assert.equal(refused.resultOf(PARENT, 'task_00000001'), undefined);
  // An unknown key is a no-op.
  await spawner.getSnapshot().dismiss({ key: 'task_ffffffff' });
  assert.equal(log.length, 1);
});

test('Do it here: w1e\'s text into this session after the snap-to-bottom guard, sent_here, then the pop; lastSentHere', async () => {
  const order = [];
  const { spawner, log, resultOf, spawningOf } = setup({ captureGuardedSnapToBottom: () => { order.push('capture'); return () => order.push('snap'); },
    bridge: { async sendMessage(parentId, text) { order.push(['send', parentId, text]); } } });
  log.length = 0;
  await spawner.getSnapshot().requestSpawn('here', keyOf(proposal(1)), undefined);
  assert.deepEqual(order, ['capture', 'snap', ['send', PARENT, 'Do this task here: “Task 1”']]);
  assert.deepEqual(log, [['pop', PARENT, 'task_00000001', true]], 'the pop follows the send (se)');
  assert.equal(resultOf(PARENT, 'task_00000001'), 'sent_here');
  assert.deepEqual(spawner.getSnapshot().lastSentHere, { title: 'Task 1' });
  assert.deepEqual(spawningOf(PARENT), []);
  // A failed send: the official toast, no start_failed (se), nothing sent.
  const failed = setup({ bridge: { async sendMessage() { throw new Error('offline'); } } });
  await failed.spawner.getSnapshot().requestSpawn('here', keyOf(proposal(1)), undefined);
  assert.deepEqual(failed.toasts, [['Couldn’t start the suggested task.', 'danger']]);
  assert.equal(failed.resultOf(PARENT, 'task_00000001'), undefined);
});

test('consent: a bypass/auto start in another repository or picked in Options asks the host first; declined starts nothing', async () => {
  const asked = [];
  const queue = [proposal(1, { cwd: '/work/other' }), proposal(2, { cwd: '/work/other' }), proposal(3)];
  let answer = 'declined';
  const { spawner, log } = setup({ queue, session: { permissionMode: 'auto' }, confirmMode: async (request) => { asked.push(request); return answer; } });
  await spawner.getSnapshot().requestSpawn('worktree', keyOf(queue[0]), undefined);
  assert.deepEqual(asked, [{ mode: 'auto', workspace: '/work/other', key: 'task_00000001' }]);
  assert.equal(log.filter(entry => entry[0] === 'start').length, 0);
  // Agreed once for a mode and folder, Start all doesn't ask again for the next one there.
  answer = 'agreed'; asked.length = 0;
  await spawner.getSnapshot().requestSpawnAll([queue[0], queue[1]].map(record => ({ target: 'worktree', clicked: keyOf(record), options: undefined })));
  assert.equal(asked.length, 1);
  assert.equal(log.filter(entry => entry[0] === 'start').length, 2);
  // The session's own mode in its own folder runs without asking; a mode picked in Options asks.
  asked.length = 0;
  await spawner.getSnapshot().requestSpawn('local', keyOf(queue[2]), { overrides: { permissionMode: 'auto' } });
  assert.equal(asked.length, 0, 'auto is already the session mode');
  await spawner.getSnapshot().requestSpawn('local', keyOf(queue[2]), { overrides: { permissionMode: 'bypassPermissions' } });
  assert.deepEqual(asked, [{ mode: 'bypassPermissions', workspace: '/work/repo', key: 'task_00000003' }]);
  // "here" never asks; without a host confirmation a start that needs consent is declined.
  const unconfirmed = setup({ queue: [proposal(1, { cwd: '/work/other' })], session: { permissionMode: 'auto' } });
  await unconfirmed.spawner.getSnapshot().requestSpawn('worktree', { key: 'task_00000001', cwd: '/work/other' }, undefined);
  assert.equal(unconfirmed.log.length, 0);
});

test('nothing starts on the host without a session, for a stale card, for a cloud start; offers answer as without the bridge', async () => {
  const offline = setup({ host: { available: false } });
  assert.equal(offline.spawner.getSnapshot().canRender, false);
  await offline.spawner.getSnapshot().requestSpawn('worktree', keyOf(proposal(1)), undefined);
  assert.equal(offline.log.length, 0);
  const stale = setup();
  await stale.spawner.getSnapshot().requestSpawn('worktree', { key: 'task_00000001', cwd: '/elsewhere' }, undefined);
  await stale.spawner.getSnapshot().requestSpawn('cloud', keyOf(proposal(1)), { environmentId: 'env_1' });
  assert.equal(stale.log.length, 0);
  const named = setup({ queue: [proposal(1, { cloudRepository: 'acme/app' })] });
  await named.spawner.getSnapshot().requestSpawn('worktree', keyOf(proposal(1)), undefined);
  assert.deepEqual(named.toasts, [['This suggested task can only start in the cloud, on acme/app.', 'danger']]);
  // Side-session offers (start_session, D29) don't reach the host; if one did, accepting it answers like F1e without
  // acceptSideSessionOffer, and "here" on it dismisses it.
  const offer = setup({ queue: [proposal(1, { offer: true })] });
  await offer.spawner.getSnapshot().acceptOffer({ key: 'task_00000001' }, { target: 'local' });
  assert.deepEqual(offer.toasts, [['That card was already answered, or its turn ended. Send the task again to start it.', 'danger']]);
  await offer.spawner.getSnapshot().requestSpawn('here', keyOf(proposal(1)), undefined);
  assert.equal(offer.resultOf(PARENT, 'task_00000001'), 'kept_here');
  assert.deepEqual(offer.log, [['pop', PARENT, 'task_00000001', false]]);
});
