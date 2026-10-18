import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createBtwSessions, isBtwChild, supportsBtwChildren } = createRequire(import.meta.url)('../electron/btw-sessions.cjs');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('official child boundary accompanies the first accepted turn and leaves the parent untouched', async () => {
  const s = setup(); const {sessionId} = await s.service.start(s.payload), parent = structuredClone(s.config.sessionMetadata.parent);
  const params={threadId:sessionId,input:[{type:'text',text:'Question',text_elements:[]}],developerInstructions:'keep inherited'};
  const confirm=s.service.prepareTurn(params);
  assert.equal(params.input.length,2);assert.match(params.input[0].text,/<system-reminder>/);assert.match(params.input[0].text,/Nothing you say here is reported automatically to the original session/);
  assert.equal(params.input[1].text,'Question');assert.equal(params.developerInstructions,'keep inherited');assert.equal(s.config.sessionMetadata[sessionId].btw.boundaryPending,true);
  s.service.observe({method:'turn/started',params:{threadId:sessionId,turn:{id:'own'}}});confirm({turn:{id:'own'}});
  assert.deepEqual(s.config.sessionMetadata[sessionId].btw.ownTurnIds,['own']);assert.equal(s.config.sessionMetadata[sessionId].btw.boundaryPending,false);
  const followup={threadId:sessionId,input:[{type:'text',text:'Follow up'}]};s.service.prepareTurn(followup);assert.equal(followup.input.length,1);
  assert.deepEqual(s.config.sessionMetadata.parent,parent);
});
test('accepted child Plan implementation persists its own mode and turn ID, never the parent mode',async()=>{
  const s=setup();const {sessionId}=await s.service.start({...s.payload,permission:'plan'});
  const parent=structuredClone(s.config.sessionMetadata.parent);
  s.service.prepareTurn({threadId:sessionId,input:[{type:'text',text:'Plan'}]},{permission:'plan'})({turn:{id:'plan-turn'}});
  const next={threadId:sessionId,input:[{type:'text',text:'Implement the plan.'}]};
  const confirm=s.service.prepareTurn(next,{permission:'acceptEdits'});
  assert.equal(next.input.length,1);assert.equal(s.config.sessionMetadata[sessionId].btw.permission,'plan');
  confirm({});assert.equal(s.config.sessionMetadata[sessionId].btw.permission,'plan');
  confirm({turn:{id:'implementation'}});assert.equal(s.config.sessionMetadata[sessionId].btw.permission,'acceptEdits');
  assert.deepEqual(s.config.sessionMetadata[sessionId].btw.ownTurnIds,['plan-turn','implementation']);
  assert.deepEqual(s.config.sessionMetadata.parent,parent);
  s.service.prepareTurn({threadId:sessionId,input:[{type:'text',text:'Continue'}]},{permission:'invalid-mode'})({turn:{id:'followup'}});
  assert.equal(s.config.sessionMetadata[sessionId].btw.permission,'acceptEdits');
});
test('unconfirmed sends retain boundary; custom global prompt suppresses injected instructions', async () => {
  const s=setup(),{sessionId}=await s.service.start(s.payload);
  const first={threadId:sessionId,input:[{type:'text',text:'Retry'}]};s.service.prepareTurn(first)({});assert.equal(s.config.sessionMetadata[sessionId].btw.boundaryPending,true);
  const custom={threadId:sessionId,input:[{type:'text',text:'Custom'}]};const confirm=s.service.prepareTurn(custom,{customPrompt:true});assert.equal(custom.input.length,1);
  confirm({turn:{id:'custom'}});assert.equal(s.config.sessionMetadata[sessionId].btw.boundaryPending,false);
  const ordinary={threadId:'parent',input:[{type:'text',text:'Parent'}]};s.service.prepareTurn(ordinary)({turn:{id:'parent-turn'}});assert.equal(ordinary.input.length,1);assert.equal(s.config.sessionMetadata.parent.btw,undefined);
});
test('fork response preserves effective model and effort when parent has no local picker override', async () => {
  const s=setup(method=>method==='thread/fork'?{thread:{id:'inherited',cwd:'/repo'},model:'core-parent-model',reasoningEffort:'high',serviceTier:'fast'}:undefined);
  delete s.config.sessionMetadata.parent.model;
  const result=await s.service.start(s.payload);assert.equal(result.sessionMetadata.model,'core-parent-model');assert.equal(result.sessionMetadata.effort,'high');assert.equal(result.sessionMetadata.serviceTier,'fast');
});
function setup(handler = () => undefined, overrides = {}) {
  let config = { threadIds: ['parent'], archivedThreadIds: [], threadMetadata: {},
    sessionMetadata: { parent: { surface: 'code', additionalFolders: ['/extra'], model: 'parent-model', environmentId: 'env', unread: true, workflowReminders: { enabled: true } } },
    threadTools: { parent: { enabled: ['read'] } } };
  const requests = [], events = [], bound = [], locks = new Set(), active = new Set(), approvals = [];
  const expected = { connectionId: 'connection', connectionEpoch: 1 };
  let serial = 0, saves = 0;
  const client = { serverInfo: { engine: 'codex' }, connection: { approvalConnectionId: 'connection', approvalConnectionEpoch: 1, closed: false },
    approvalSnapshot: () => ({ closed: false, pending: approvals }),
    async request(method, params) {
      requests.push({ method, params });
      const result = await handler(method, params);
      return result ?? (method === 'thread/read' ? { thread: { id: params.threadId, cwd: '/repo', historyMode: 'paginated', status: { type: 'idle' } } }
        : method === 'thread/fork' ? { thread: { id: `child-${++serial}`, cwd: '/repo', historyMode: 'paginated', turns: [] } } : {});
    } };
  let owner = client;
  const service = createBtwSessions({ getClient: () => owner, getConfig: () => config, save: () => saves++,
    onChanged: (...args) => events.push(args), onThreadCreated: (...args) => bound.push(args), busy: id => active.has(id),
    reserve: id => { if (locks.has(id)) return null; locks.add(id); return () => locks.delete(id); }, now: () => 12345, ...overrides });
  const payload = { parentId: 'parent', requestId: 'opening-12345', expected, permission: 'ask', openedBy: 'question' };
  return { service, client, get config() { return config; }, requests, events, bound, locks, active, approvals, payload, expected,
    swap: () => { owner = { ...client, connection: { ...client.connection, approvalConnectionEpoch: 2 } }; },
    replaceConfig: () => { config = { ...config, threadIds: [...config.threadIds], sessionMetadata: { ...config.sessionMetadata } }; },
    saves: () => saves };
}
test('a running parent forks in parallel without interrupt/resume; child is persistent and owns its app tools', async () => {
  const s = setup((method, params) => method === 'thread/read' ? { thread: { id: params.threadId, status: { type: 'active' }, historyMode: 'paginated', cwd: '/repo' } } : undefined,
    { decorateThread: (method, params) => ({ ...params, config: { identity: 'new-child-credential' } }) });
  s.active.add('parent');
  const result = await s.service.start(s.payload);
  assert.equal(result.status, 'started'); assert.equal(result.sessionId, 'child-1');
  assert.deepEqual(s.requests.map(r => r.method), ['thread/read', 'thread/fork', 'thread/name/set']);
  const params = s.requests.find(r => r.method === 'thread/fork').params;
  assert.equal(params.threadId, 'parent'); assert.equal(params.lastTurnId, undefined); assert.equal(params.ephemeral, undefined);
  assert.equal(params.excludeTurns, true); assert.equal(params.approvalPolicy, 'untrusted'); assert.equal(params.sandbox, 'workspace-write');
  assert.deepEqual(s.bound[0][0].config, { identity: 'new-child-credential' });
  assert.deepEqual(s.config.threadIds, ['child-1', 'parent']); assert.equal(s.config.threadMetadata['child-1'].turns, undefined);
  const meta = result.sessionMetadata;
  assert.equal(isBtwChild(meta), true); assert.equal(meta.btw.createdAt, 12345); assert.deepEqual(meta.btw.ownTurnIds, []);
  assert.equal(meta.btw.boundaryPending, true); assert.equal(meta.unread, undefined); assert.equal(meta.model, 'parent-model');
  assert.equal(meta.environmentId, 'env'); assert.deepEqual(meta.additionalFolders, ['/extra']);
  assert.notEqual(meta.additionalFolders, s.config.sessionMetadata.parent.additionalFolders);
  assert.notEqual(s.config.threadTools['child-1'], s.config.threadTools.parent); assert.equal(s.events[0][0], 'added');
});
test('duplicate opening joins the same in-flight fork; independent opening creates another child', async () => {
  const gate = deferred(); let count = 0;
  const s = setup(method => method === 'thread/fork' && ++count === 1 ? gate.promise : undefined);
  const a = s.service.start(s.payload), b = s.service.start(s.payload);
  await new Promise(r => setImmediate(r));
  assert.equal(s.requests.filter(r => r.method === 'thread/fork').length, 1);
  gate.resolve({ thread: { id: 'first', cwd: '/repo' } });
  assert.equal((await a).sessionId, 'first'); assert.equal((await b).sessionId, 'first');
  const c = await s.service.start({ ...s.payload, requestId: 'opening-67890' }); assert.notEqual(c.sessionId, 'first');
  await assert.rejects(s.service.start({ ...s.payload, permission: 'plan' }), /already in use/);
});
test('timeout retries retain the same uncertain ticket and never duplicate the fork', async () => {
  const s = setup(method => { if (method === 'thread/fork') throw Error('Request timed out'); });
  await assert.rejects(s.service.start(s.payload), /timed out/);
  await assert.rejects(s.service.start(s.payload), /timed out/);
  assert.equal(s.requests.filter(r => r.method === 'thread/fork').length, 1);
  assert.deepEqual(s.config.threadIds, ['parent']);
});
test('new epoch gets a fresh ticket; stale ownership cannot dispatch', async () => {
  const s = setup(); await s.service.start(s.payload); s.swap();
  await assert.rejects(s.service.start(s.payload), /connection changed/);
  await s.service.start({ ...s.payload, expected: { ...s.expected, connectionEpoch: 2 } });
  assert.equal(s.requests.filter(r => r.method === 'thread/fork').length, 2);
});
test('late confirmed fork survives a connection change without being published to replacement core', async () => {
  let s; s = setup(method => { if (method === 'thread/fork') { s.swap(); return { thread: { id: 'late', cwd: '/repo' } }; } });
  const result = await s.service.start(s.payload);
  assert.equal(result.connectionChanged, true); assert.ok(s.config.threadIds.includes('late')); assert.equal(s.events.length, 0);
});
test('settings replacement during read is respected; archived parent never dispatches fork', async () => {
  let s; s = setup(method => { if (method === 'thread/read') { s.replaceConfig(); s.config.archivedThreadIds.push('parent'); } });
  await assert.rejects(s.service.start(s.payload), /active session/); assert.equal(s.requests.length, 1);
});
test('invalid permissions, unknown parents, stale epoch and unsupported core cannot mutate', async () => {
  for (const kind of ['permission', 'missing-permission', 'parent', 'epoch', 'core']) {
    const s = setup(), payload = { ...s.payload };
    if (kind === 'permission') payload.permission = 'custom';
    if (kind === 'missing-permission') delete payload.permission;
    if (kind === 'parent') payload.parentId = 'unknown';
    if (kind === 'epoch') payload.expected = { ...s.expected, connectionEpoch: 9 };
    if (kind === 'core') s.client.serverInfo = { engine: 'deepseek' };
    if (kind === 'core') assert.equal((await s.service.start(payload)).status, 'disabled');
    else await assert.rejects(s.service.start(payload));
    assert.equal(s.requests.length, 0, kind);
  }
  assert.equal(supportsBtwChildren(null), false);
});
test('native plan stays read-only; bypass requires both opt-in and managed-policy acceptance', async () => {
  const plan = setup(); await plan.service.start({ ...plan.payload, permission: 'plan' });
  const planFork = plan.requests.find(r => r.method === 'thread/fork').params;
  assert.equal(planFork.sandbox, 'read-only'); assert.equal(planFork.approvalPolicy, 'never');
  const denied = setup(); await assert.rejects(denied.service.start({ ...denied.payload, permission: 'bypass' }), /Settings/);
  assert.equal(denied.requests.some(r => r.method === 'thread/fork'), false);
  for (const allowed of [false, true]) {
    const s = setup(method => method === 'configRequirements/read' ? { requirements: allowed ? null : { allowedSandboxModes: ['workspace-write'] } } : undefined);
    s.config.allowBypassPermissions = true;
    if (allowed) { await s.service.start({ ...s.payload, permission: 'bypass' }); assert.equal(s.requests.find(r => r.method === 'thread/fork').params.sandbox, 'danger-full-access'); }
    else await assert.rejects(s.service.start({ ...s.payload, permission: 'bypass' }), /organization/);
  }
});
test('nested side sessions and remote or unattended parents fall back instead of making another fork', async () => {
  for (const type of ['nested', 'remote', 'unattended', 'chat', 'missing-folder']) {
    const s = setup((method, params) => method === 'thread/read' ? { thread: { id: params.threadId, cwd: '/repo', ...(type === 'remote' ? { remoteTarget: {} } : {}), ...(type === 'missing-folder' ? { errorCategory: 'cwd_not_found' } : {}) } } : undefined);
    const meta = s.config.sessionMetadata.parent;
    if (type === 'nested') meta.spawnedFrom = { sideSession: true, sessionId: 'ancestor' };
    if (type === 'unattended') meta.scheduledTaskId = 'routine';
    if (type === 'chat') meta.surface = 'chat';
    assert.equal((await s.service.start(s.payload)).status, 'disabled', type);
    assert.equal(s.requests.some(r => r.method === 'thread/fork'), false, type);
  }
});
test('invalid fork response never overwrites a parent or a pre-existing child', async () => {
  for (const id of [null, 'parent', 'existing']) {
    const s = setup(method => method === 'thread/fork' ? { thread: { id } } : undefined);
    s.config.threadIds.push('existing'); s.config.sessionMetadata.existing = { title: 'untouched' };
    await assert.rejects(s.service.start(s.payload)); assert.deepEqual(s.config.sessionMetadata.existing, { title: 'untouched' });
    assert.equal(s.events.length, 0);
  }
});
test('app-tool binding failure leaves the created child recoverable', async () => {
  const s = setup(undefined, { onThreadCreated: () => { throw Error('binding failed'); } });
  const result = await s.service.start(s.payload);
  assert.match(result.warning, /saved/); assert.ok(s.config.threadIds.includes(result.sessionId));
});
test('close archives only a settled attached /btw child and never interrupts a running one', async () => {
  const s = setup(); const child = (await s.service.start(s.payload)).sessionId;
  s.active.add(child);
  assert.equal((await s.service.close({ sessionId: child, expected: s.expected })).status, 'running');
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false);
  s.active.delete(child);
  assert.equal((await s.service.close({ sessionId: child, expected: s.expected })).status, 'archived');
  assert.ok(s.config.archivedThreadIds.includes(child)); assert.equal(s.config.threadIds.includes(child), false);
  assert.ok(s.config.threadIds.includes('parent')); assert.equal(s.locks.size, 0);
  assert.equal(s.requests.filter(r => /interrupt|turn\/start/.test(r.method)).length, 0);
  await s.service.close({ sessionId: child, expected: s.expected }); assert.equal(s.requests.filter(r => r.method === 'thread/archive').length, 1);
});
test('pending approval, queued send and live status each keep the child alive', async () => {
  for (const kind of ['approval', 'send', 'active-status']) {
    const s = setup((method, params) => method === 'thread/read' && params.threadId !== 'parent' && kind === 'active-status' ? { thread: { id: params.threadId, status: { type: 'active' } } } : undefined);
    const id = (await s.service.start(s.payload)).sessionId;
    if (kind === 'approval') s.approvals.push({ params: { threadId: id } });
    if (kind === 'send') s.locks.add(id);
    assert.equal((await s.service.close({ sessionId: id, expected: s.expected })).status, 'running');
    assert.equal(s.requests.some(r => r.method === 'thread/archive'), false, kind);
  }
});
test('approval arriving during idle read wins over automatic archive', async () => {
  let s; s = setup((method, params) => { if (method === 'thread/read' && params.threadId !== 'parent') s.approvals.push({ params: { threadId: params.threadId } }); });
  const id = (await s.service.start(s.payload)).sessionId;
  assert.equal((await s.service.close({ sessionId: id, expected: s.expected })).status, 'running'); assert.equal(s.locks.size, 0);
});
test('duplicate closes share one archive; failure releases lock without claiming success', async () => {
  const gate = deferred(); const s = setup(method => method === 'thread/archive' ? gate.promise : undefined);
  const id = (await s.service.start(s.payload)).sessionId;
  const a = s.service.close({ sessionId: id, expected: s.expected }), b = s.service.close({ sessionId: id, expected: s.expected });
  await new Promise(r => setImmediate(r)); assert.equal(s.requests.filter(r => r.method === 'thread/archive').length, 1);
  gate.reject(Error('archive failed')); await assert.rejects(a, /archive failed/); await assert.rejects(b, /archive failed/);
  assert.equal(s.locks.size, 0); assert.ok(s.config.threadIds.includes(id)); assert.equal(s.config.archivedThreadIds.includes(id), false);
});
test('ordinary forks, detached children and unknown ids cannot be auto-archived', async () => {
  const s = setup(); const id = (await s.service.start(s.payload)).sessionId;
  s.config.sessionMetadata[id].lineageDetached = true;
  for (const sessionId of ['parent', id, 'unknown']) assert.equal((await s.service.close({ sessionId, expected: s.expected })).status, 'ignored');
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false);
});
test('child turn markers are independent, durable, idempotent and ignore inherited parent turns', async () => {
  const s = setup(); const id = (await s.service.start(s.payload)).sessionId;
  const event = threadId => ({ method: 'turn/started', params: { threadId, turn: { id: 'own-turn' } } });
  s.service.observe(event('parent')); s.service.observe(event(id)); s.service.observe(event(id));
  assert.deepEqual(s.config.sessionMetadata[id].btw.ownTurnIds, ['own-turn']);
  assert.equal(s.config.sessionMetadata.parent.btw, undefined); assert.equal(s.events.filter(e => e[0] === 'metadata').length, 1);
});
test('official title normalizes whitespace; rename failure preserves the local title and the child', async () => {
  const s = setup(method => { if (method === 'thread/name/set') throw Error('title unavailable'); });
  const result = await s.service.start({ ...s.payload, titleWords: '  why\n this\t failure?  ' });
  assert.equal(result.thread.name, 'btw: why this failure?'); assert.match(result.warning, /title/);
  assert.equal(s.config.threadMetadata[result.sessionId].name, result.thread.name);
  assert.ok(s.config.threadIds.includes(result.sessionId));
});
test('a live parent loop refuses child creation without disturbing that loop', async () => {
  const s = setup(undefined, { hasParentLoop: id => id === 'parent' });
  assert.deepEqual(await s.service.start(s.payload), { status: 'disabled', reason: 'live_loop' });
  assert.deepEqual(s.requests.map(r => r.method), ['thread/read']);
});
test('background work or an unknown background snapshot cannot be silently archived', async () => {
  const s = setup(undefined, { hasBackgroundWork: async () => true });
  const id = (await s.service.start(s.payload)).sessionId;
  assert.equal((await s.service.close({ sessionId: id, expected: s.expected })).status, 'running');
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false); assert.equal(s.locks.size, 0);
});
test('disconnect during the background read releases the child lock and prevents archive', async () => {
  let s; s = setup(undefined, { hasBackgroundWork: async () => { s.swap(); return false; } });
  const id = (await s.service.start(s.payload)).sessionId;
  await assert.rejects(s.service.close({ sessionId: id, expected: s.expected }), /connection changed/);
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false); assert.equal(s.locks.size, 0);
});
test('a detached child discovered after the background read no longer auto-archives', async () => {
  let s; s = setup(undefined, { hasBackgroundWork: async (_owner, id) => { s.config.sessionMetadata[id].lineageDetached = true; return false; } });
  const id = (await s.service.start(s.payload)).sessionId;
  assert.equal((await s.service.close({ sessionId: id, expected: s.expected })).status, 'ignored');
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false); assert.equal(s.locks.size, 0);
});
test('native legacy fork omits excludeTurns and still records only the child metadata', async () => {
  const s = setup((method, params) => method === 'thread/read' ? { thread: { id: params.threadId, cwd: '/repo', historyMode: 'legacy' } } : undefined);
  await s.service.start(s.payload);
  assert.equal(s.requests.find(r => r.method === 'thread/fork').params.excludeTurns, undefined);
  assert.equal(s.config.threadMetadata['child-1'].turns, undefined);
});
test('closing after a core switch cannot send a Codex child id to the other engine', async () => {
  const s = setup(); const id = (await s.service.start(s.payload)).sessionId;
  const before = s.requests.length; s.client.serverInfo = { engine: 'deepseek' };
  assert.deepEqual(await s.service.close({ sessionId: id, expected: s.expected }), { status: 'disabled', reason: 'unsupported_core' });
  assert.equal(s.requests.length, before); assert.ok(s.config.threadIds.includes(id));
});
test('serialized config restores lineage and own-turn boundaries in a fresh service', async () => {
  const s = setup(); const id = (await s.service.start(s.payload)).sessionId;
  const event = { method: 'turn/started', params: { threadId: id, turn: { id: 'first-own-turn' } } };
  s.service.observe(event);
  const restoredConfig = JSON.parse(JSON.stringify(s.config)); let saves = 0;
  const restored = createBtwSessions({ getClient: () => s.client, getConfig: () => restoredConfig, save: () => saves++ });
  restored.observe(event); assert.equal(saves, 0);
  assert.deepEqual(restoredConfig.sessionMetadata[id].btw.ownTurnIds, ['first-own-turn']);
  assert.equal((await restored.close({ sessionId: id, expected: s.expected })).status, 'archived');
  assert.ok(restoredConfig.archivedThreadIds.includes(id)); assert.ok(restoredConfig.threadIds.includes('parent'));
});

const completedPlan = (id = 'own-plan') => ({ id, status: 'completed', itemsView: 'full', items: [{ id: 'plan-item', type: 'plan', text: 'Child plan' }] });
async function planChild(handler = () => {}, overrides) {
  const s = setup(async (method, params) => (await handler(method, params)) ??
    (method === 'thread/turns/list' ? { data: [completedPlan()], nextCursor: null } : undefined), overrides);
  const id = (await s.service.start({ ...s.payload, permission: 'plan' })).sessionId;
  s.service.observe({ method: 'turn/started', params: { threadId: id, turn: { id: 'own-plan' } } });
  return { ...s, id, answer: { sessionId: id, turnId: 'own-plan', expected: s.expected } };
}
test('close retains a pending child plan, Stay persists across restart, and the settled child can then archive', async () => {
  const s = await planChild(), parent = structuredClone(s.config.sessionMetadata.parent);
  assert.deepEqual(await s.service.close(s.answer), { status: 'retained', reason: 'plan_review' });
  assert.ok(s.config.threadIds.includes(s.id)); assert.equal(s.requests.some(r => r.method === 'thread/archive'), false);
  assert.deepEqual(await s.service.stayPlan(s.answer), { status: 'answered', sessionId: s.id, turnId: 'own-plan' });
  const saved = JSON.parse(JSON.stringify(s.config)), saves = s.saves();
  await s.service.stayPlan(s.answer); assert.equal(s.saves(), saves, 'duplicate answer is idempotent');
  assert.equal(saved.sessionMetadata[s.id].btw.planAnsweredTurnId, 'own-plan');
  assert.equal(saved.sessionMetadata[s.id].btw.permission, 'plan');
  assert.deepEqual(saved.sessionMetadata.parent, parent);
  assert.equal(s.requests.some(r => r.method === 'turn/start' || r.method === 'thread/resume'), false);
  const restored = createBtwSessions({ getClient: () => s.client, getConfig: () => saved, save: () => {} });
  assert.equal((await restored.close(s.answer)).status, 'archived');
  assert.ok(saved.archivedThreadIds.includes(s.id)); assert.ok(saved.threadIds.includes('parent'));
});
test('unanswered plans remain protected in a new service; failed history reads never archive or answer', async () => {
  const s = await planChild(), saved = JSON.parse(JSON.stringify(s.config));
  const restored = createBtwSessions({ getClient: () => s.client, getConfig: () => saved, save: () => {} });
  assert.equal((await restored.close(s.answer)).reason, 'plan_review');
  const broken = await planChild(method => { if (method === 'thread/turns/list') throw Error('history unavailable'); });
  await assert.rejects(broken.service.close(broken.answer), /unavailable/);
  await assert.rejects(broken.service.stayPlan(broken.answer), /unavailable/);
  assert.equal(broken.config.sessionMetadata[broken.id].btw.planAnsweredTurnId, undefined);
  assert.equal(broken.requests.some(r => r.method === 'thread/archive'), false); assert.equal(broken.locks.size, 0);
});
test('a failed Stay save does not dismiss the plan in memory; retry can persist and broadcast it', async () => {
  let fail = false, writes = 0;
  const s = await planChild(undefined, { save: () => { if (fail) throw Error('disk full'); writes++; } });
  fail = true; const before = s.events.length;
  await assert.rejects(s.service.stayPlan(s.answer), /disk full/);
  assert.equal(s.config.sessionMetadata[s.id].btw.planAnsweredTurnId, undefined); assert.equal(s.events.length, before);
  assert.equal((await s.service.close(s.answer)).reason, 'plan_review');
  fail = false; const saved = writes; await s.service.stayPlan(s.answer);
  assert.equal(writes, saved + 1); assert.equal(s.config.sessionMetadata[s.id].btw.planAnsweredTurnId, 'own-plan');
  await s.service.stayPlan(s.answer); assert.equal(writes, saved + 1);
  assert.equal(s.events.length, before + 2, 'idempotent retries can repair a missed metadata broadcast');
});
test('Stay rejects parent, stale turn, detached/archived child, approvals and queued input', async () => {
  for (const kind of ['parent', 'stale', 'detached', 'archived', 'approval', 'queued', 'running']) {
    const s = await planChild((method, params) => kind === 'running' && method === 'thread/read' && params.threadId !== 'parent'
      ? { thread: { id: params.threadId, status: { type: 'active' } } } : undefined, { hasQueuedInput: async () => kind === 'queued' });
    const answer = { ...s.answer };
    if (kind === 'parent') answer.sessionId = 'parent';
    if (kind === 'stale') answer.turnId = 'parent-plan';
    if (kind === 'detached') s.config.sessionMetadata[s.id].lineageDetached = true;
    if (kind === 'archived') s.config.archivedThreadIds.push(s.id);
    if (kind === 'approval') s.approvals.push({ params: { threadId: s.id } });
    await assert.rejects(s.service.stayPlan(answer), undefined, kind);
    assert.equal(s.config.sessionMetadata[s.id].btw.planAnsweredTurnId, undefined, kind); assert.equal(s.locks.size, 0);
  }
});
test('a later child turn or connection replacement during review prevents a stale Stay decision', async () => {
  for (const kind of ['turn', 'connection', 'archive']) {
    const gate = deferred(), s = await planChild(method => method === 'thread/turns/list' ? gate.promise : undefined);
    const result = s.service.stayPlan(s.answer); await new Promise(r => setImmediate(r));
    if (kind === 'turn') s.service.observe({ method: 'turn/started', params: { threadId: s.id, turn: { id: 'new' } } });
    if (kind === 'connection') s.swap();
    if (kind === 'archive') s.config.archivedThreadIds.push(s.id);
    gate.resolve({ data: [completedPlan()], nextCursor: null });
    await assert.rejects(result); assert.equal(s.config.sessionMetadata[s.id].btw.planAnsweredTurnId, undefined); assert.equal(s.locks.size, 0);
  }
});
test('Stay and close use the same child lock; a new completed plan requires a fresh answer', async () => {
  const gate = deferred(); let block = true, turn = completedPlan();
  const s = await planChild(method => method === 'thread/turns/list' ? block ? gate.promise : { data: [turn], nextCursor: null } : undefined);
  const first = s.service.stayPlan(s.answer); await new Promise(r => setImmediate(r));
  assert.equal((await s.service.close(s.answer)).status, 'running');
  await assert.rejects(s.service.stayPlan(s.answer), /current task/);
  block = false; gate.resolve({ data: [turn], nextCursor: null }); await first;
  turn = completedPlan('new-plan'); s.service.observe({ method: 'turn/started', params: { threadId: s.id, turn: { id: turn.id } } });
  assert.equal((await s.service.close(s.answer)).reason, 'plan_review');
  await assert.rejects(s.service.stayPlan(s.answer), /active session/);
});
test('accepted implementation persists the child mode and no longer waits on its old Plan', async () => {
  const s = await planChild();
  s.service.prepareTurn({ threadId: s.id, input: [{ type: 'text', text: 'Implement the plan.' }] }, { permission: 'acceptEdits' })({ turn: { id: 'implementation' } });
  assert.equal(s.config.sessionMetadata[s.id].btw.permission, 'acceptEdits');
  assert.equal((await s.service.close(s.answer)).status, 'archived');
  assert.equal(s.requests.some(r => r.method === 'thread/turns/list'), false);
});
test('fixed sessions and queued input survive automatic close, including a pin arriving during checks', async () => {
  for (const kind of ['pin', 'late-pin', 'core-pin', 'queue']) {
    let s; s = setup((method, params) => kind === 'core-pin' && method === 'thread/read' && params.threadId !== 'parent'
      ? { thread: { id: params.threadId, sectionId: 'pinned' } } : undefined,
      { hasBackgroundWork: async (_owner, id) => { if (kind === 'late-pin') s.config.sessionMetadata[id].pinned = true; return false; }, hasQueuedInput: async () => kind === 'queue' });
    const id = (await s.service.start(s.payload)).sessionId;
    if (kind === 'pin') s.config.sessionMetadata[id].pinned = true;
    if (kind === 'core-pin') s.config.codexPinnedSectionId = 'pinned';
    const result = await s.service.close({ sessionId: id, expected: s.expected });
    assert.notEqual(result.status, 'archived', kind); assert.equal(s.requests.some(r => r.method === 'thread/archive'), false);
  }
});
test('a new turn event after a settled plan check prevents automatic archive', async () => {
  let s; s = await planChild(undefined, { hasBackgroundWork: async () => {
    s.service.observe({ method: 'turn/started', params: { threadId: s.id, turn: { id: 'next' } } }); return false;
  } });
  await s.service.stayPlan(s.answer);
  assert.equal((await s.service.close(s.answer)).reason, 'state_changed');
  assert.equal(s.requests.some(r => r.method === 'thread/archive'), false);
});

// R2-btw NBS-7: 2.42304.0 sideSessionSettled (!isStarred && !sideSessionBusy && !SD && archiveCascadeSettled) and the
// parent-archive cascade (archiveCascadeOf + cascadeArchiveSideSessions), on the original SD/wD/nwa bindings.
const nbs7 = createRequire(import.meta.url)('../electron/btw-sessions.cjs');
const archives = s => s.requests.filter(r => r.method === 'thread/archive').map(r => r.params.threadId);
const pr = (extra = {}) => ({ number: 7, url: 'https://github.com/owner/repo/pull/7', ...extra });
test('extracted SD/wD/nwa are the original 2.42304.0 bindings and verify against the snapshot', async () => {
  const generated = await import('../electron/generated/btw-archive.mjs');
  const manifest = JSON.parse((await import('node:fs')).readFileSync(new URL('../electron/generated/btw-archive-manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.deepEqual(manifest.sources.map(source => [source.file.split('/').at(-1), source.bindings]),
    [['index.chunk-muI2IV6k.js', ['twa', 'nwa']], ['index.chunk-DzrvTkKz.js', ['t']], ['index.chunk-CFJssAFf.js', ['SD', 'wD']]]);
  const { extractBtwArchive } = await import('../scripts/extract-btw-archive.mjs');
  await extractBtwArchive({ check: true });
  assert.equal(generated.hasOpenOwnPullRequest({ prs: [{ state: 'OPEN' }] }), true);
  assert.equal(generated.hasOpenOwnPullRequest({ prs: [{}] }), true, 'a binding without a state is open');
  for (const state of ['merged', 'landed', 'closed', 'abandoned']) assert.equal(generated.hasOpenOwnPullRequest({ prs: [{ state }] }), false, state);
  assert.equal(generated.hasOpenOwnPullRequest({ prs: [{ state: 'open', inherited: true }] }), false);
  assert.equal(generated.hasOpenOwnPullRequest({}), false);
  assert.equal(generated.sharesParentCheckout({ spawnedFrom: { sharedCheckout: true, sessionId: 'p' } }, 'p'), true);
  assert.equal(generated.sharesParentCheckout({ spawnedFrom: { sharedCheckout: true, sessionId: 'p' } }, 'q'), false);
  assert.equal(generated.sharesParentCheckout({ spawnedFrom: { sessionId: 'p' } }, 'p'), false);
});
test('a child keeps itself only for its own open PR; merged/closed PRs and the parent PR never hold it', async () => {
  for (const [kind, expected] of [['open', 'retained'], ['fresh-open', 'retained'], ['merged', 'archived'], ['closed', 'archived'], ['parent', 'archived'], ['inherited-copy', 'archived'], ['none', 'archived']]) {
    const s = setup((method, params) => kind === 'fresh-open' && method === 'thread/read' && params.threadId === 'child-1'
      ? { thread: { id: 'child-1', cwd: '/repo', historyMode: 'paginated', status: { type: 'idle' }, codeDesktop: { pr: pr() } } } : undefined);
    const { sessionId } = await s.service.start(s.payload);
    const stored = s.config.threadMetadata[sessionId];
    if (kind === 'open') stored.codeDesktop = { pr: pr() };
    if (kind === 'merged') stored.codeDesktop = { pr: pr({ state: 'MERGED' }) };
    if (kind === 'closed') stored.codeDesktop = { pr: pr({ state: 'closed' }) };
    if (kind === 'parent') s.config.threadMetadata.parent = { id: 'parent', codeDesktop: { pr: pr() } };
    if (kind === 'inherited-copy') { s.config.threadMetadata.parent = { id: 'parent', codeDesktop: { pr: pr() } }; stored.codeDesktop = { pr: pr() }; }
    const result = await s.service.close({ sessionId, expected: s.expected });
    assert.equal(result.status, expected, kind);
    if (expected === 'retained') { assert.equal(result.reason, 'open_pr', kind); assert.deepEqual(archives(s), [], kind); assert.ok(s.config.threadIds.includes(sessionId), kind); }
    else assert.deepEqual(archives(s), [sessionId], kind);
  }
  const config = { threadMetadata: { parent: { codeDesktop: { pr: pr() } }, child: { codeDesktop: { pr: pr({ url: 'https://github.com/owner/repo/pull/8', number: 8 }) } } },
    sessionMetadata: { child: { spawnedFrom: { sessionId: 'parent' } } } };
  assert.deepEqual(nbs7.sessionPrs(config, 'child'), [{ state: undefined, inherited: false }]);
  assert.deepEqual(nbs7.sessionPrs(config, 'parent'), [{ state: undefined, inherited: false }], 'the parent reads only its own binding');
  assert.deepEqual(nbs7.sessionPrs({ threadMetadata: { child: { codeDesktop: { pr: { number: 0 } } } } }, 'child'), []);
});
function family(handler, overrides) {
  const s = setup(handler, overrides);
  return { ...s, async child(extra = {}) { const { sessionId } = await s.service.start({ ...s.payload, requestId: `opening-${Math.random().toString(36).slice(2, 12)}` }); Object.assign(s.config.sessionMetadata[sessionId], extra); return sessionId; },
    descendant(id, from, extra = {}) {
      s.config.threadIds = [id, ...s.config.threadIds];
      s.config.sessionMetadata[id] = { spawnedFrom: { sessionId: from, sideSession: true, ...extra.spawnedFrom }, ...extra.meta };
    } };
}
test('a side session sharing the child checkout holds the close while pinned, busy or itself unsettled', async () => {
  for (const kind of ['busy', 'pinned', 'active', 'approval', 'queued', 'deep-busy']) {
    const queued = new Set();
    const f = family((method, params) => method === 'thread/read' && kind === 'active' && params.threadId === 'grand'
      ? { thread: { id: 'grand', status: { type: 'active' }, historyMode: 'paginated' } } : undefined, { hasQueuedInput: async (_owner, id) => queued.has(id) });
    const child = await f.child();
    f.descendant('grand', child, { spawnedFrom: { sharedCheckout: true }, meta: kind === 'pinned' ? { pinned: true } : {} });
    if (kind === 'busy') f.active.add('grand');
    if (kind === 'approval') f.approvals.push({ params: { threadId: 'grand' } });
    if (kind === 'queued') queued.add('grand');
    if (kind === 'deep-busy') { f.descendant('great', 'grand', { spawnedFrom: { sharedCheckout: true } }); f.active.add('great'); }
    assert.deepEqual(await f.service.close({ sessionId: child, expected: f.expected }), { status: 'retained', reason: 'side_sessions' }, kind);
    assert.deepEqual(archives(f), [], kind); assert.equal(f.locks.size, 0, kind);
  }
  for (const kind of ['own-place', 'detached', 'archived']) {
    const f = family();
    const child = await f.child();
    f.descendant('grand', child, { spawnedFrom: kind === 'own-place' ? {} : { sharedCheckout: true }, meta: kind === 'detached' ? { lineageDetached: true } : {} });
    if (kind === 'archived') { f.config.threadIds = f.config.threadIds.filter(id => id !== 'grand'); f.config.archivedThreadIds.push('grand'); }
    f.active.add('grand');
    assert.equal((await f.service.close({ sessionId: child, expected: f.expected })).status, 'archived', kind);
    assert.deepEqual(archives(f), [child], `${kind}: a non-btw side session is never archived by the cascade`);
  }
});
test('a pin arriving on a sharing side session during the checks still prevents the archive', async () => {
  let f; f = family(undefined, { hasQueuedInput: async (_owner, id) => { if (id === 'grand') f.config.sessionMetadata.grand.pinned = true; return false; } });
  const child = await f.child(); f.descendant('grand', child, { spawnedFrom: { sharedCheckout: true } });
  assert.deepEqual(await f.service.close({ sessionId: child, expected: f.expected }), { status: 'retained', reason: 'side_sessions' });
  assert.deepEqual(archives(f), []);
});
test('archiving the parent takes its settled /btw children and leaves busy, pinned, PR, plan and detached ones', async () => {
  const f = family();
  const settled = await f.child(), busy = await f.child(), pinned = await f.child({ pinned: true }), withPr = await f.child(), detached = await f.child({ lineageDetached: true });
  f.config.threadMetadata[withPr].codeDesktop = { pr: pr() };
  f.active.add(busy);
  f.config.threadIds = f.config.threadIds.filter(id => id !== 'parent'); f.config.archivedThreadIds.push('parent');
  const results = await f.service.cascadeParentArchive({ parentId: 'parent' });
  assert.deepEqual(Object.fromEntries(results.map(r => [r.sessionId, r.reason ?? r.status])),
    { [settled]: 'archived', [busy]: 'running', [pinned]: 'pinned', [withPr]: 'open_pr' });
  assert.deepEqual(archives(f), [settled]);
  assert.ok(f.config.archivedThreadIds.includes(settled));
  for (const id of [busy, pinned, withPr, detached]) assert.ok(f.config.threadIds.includes(id), id);
  assert.ok(f.events.some(([op, thread]) => op === 'archived' && thread.id === settled));
});
test('the parent cascade needs a confirmed parent archive and the same live connection', async () => {
  const f = family(); const child = await f.child();
  assert.deepEqual(await f.service.cascadeParentArchive({ parentId: 'parent' }), [], 'an active parent is not cascaded');
  f.config.threadIds = f.config.threadIds.filter(id => id !== 'parent'); f.config.archivedThreadIds.push('parent');
  const stale = f.client; f.swap();
  assert.deepEqual(await f.service.cascadeParentArchive({ parentId: 'parent', owner: stale }), [], 'a replaced connection is not used');
  assert.deepEqual(archives(f), []); assert.ok(f.config.threadIds.includes(child));
  let g; g = family((method, params) => { if (method === 'thread/read' && params.threadId !== 'parent' && g.cascading) g.swap(); });
  const first = await g.child(), second = await g.child();
  g.config.threadIds = g.config.threadIds.filter(id => id !== 'parent'); g.config.archivedThreadIds.push('parent'); g.cascading = true;
  const results = await g.service.cascadeParentArchive({ parentId: 'parent' });
  assert.equal(results.length, 1, 'an epoch change during the first child stops the walk');
  assert.equal(results[0].status, 'failed'); assert.match(results[0].error, /connection changed/);
  assert.deepEqual(archives(g), []); assert.ok(g.config.threadIds.includes(first) && g.config.threadIds.includes(second));
  assert.equal(g.locks.size, 0);
  const other = setup(); other.client.serverInfo = { engine: 'deepseek' };
  other.config.archivedThreadIds.push('parent');
  assert.deepEqual(await other.service.cascadeParentArchive({ parentId: 'parent' }), [], 'a core without /btw children has nothing to cascade');
});
test('closing a child cascades to its own settled /btw child sharing its checkout', async () => {
  const f = family(); const child = await f.child();
  f.descendant('grand', child, { spawnedFrom: { sharedCheckout: true, btw: true, userFork: true } });
  f.config.sessionMetadata.grand.btw = { createdAt: 1, permission: 'ask', ownTurnIds: [] };
  assert.equal((await f.service.close({ sessionId: child, expected: f.expected })).status, 'archived');
  assert.deepEqual(archives(f), [child, 'grand']);
});
test('archiveParentCascade: emits "archived" first, reads cascadeHoldsArchive before starting the cascade, and awaits only when held', async () => {
  const { archiveParentCascade } = (await import('../electron/r4h-main-glue.cjs')).default;

  // 1) Held (live side sessions or openings in flight): "archived" emits synchronously, cascadeHoldsArchive is read before
  // cascadeParentArchive starts, and the archive call settles only after the cascade finishes.
  {
    const trace = [];
    const gate = deferred();
    let settled = false;
    const run = archiveParentCascade({
      threadId: 'parent-1',
      owner: 'req-1',
      emitSessionList: (kind, id) => trace.push("emit:" + kind + ":" + id),
      btwSessions: {
        cascadeHoldsArchive: id => { trace.push("holds:" + id); return true; },
        cascadeParentArchive: ({ parentId, owner }) => { trace.push("cascade:" + parentId + ":" + owner); return gate.promise; },
      },
    }).then(result => { settled = true; trace.push('done'); return result; });
    assert.deepEqual(trace, ['emit:archived:parent-1', 'holds:parent-1', 'cascade:parent-1:req-1'],
      'synchronous order: emit archived -> cascadeHoldsArchive -> cascadeParentArchive');
    await new Promise(r => setImmediate(r));
    assert.equal(settled, false, 'still waiting on the cascade while holdsArchive is true');
    gate.resolve([]);
    assert.deepEqual(await run, { holdsArchive: true });
    assert.equal(settled, true);
    assert.equal(trace.at(-1), 'done');
  }

  // 2) Not held: "archived" still emits first and cascadeParentArchive starts, but the archive call resolves without
  // waiting on the background cascade (and a rejected cascade is caught into warn).
  {
    const trace = [], warnings = [];
    const gate = deferred();
    const result = await archiveParentCascade({
      threadId: 'parent-2',
      owner: 'req-2',
      emitSessionList: (kind, id) => trace.push("emit:" + kind + ":" + id),
      btwSessions: {
        cascadeHoldsArchive: id => { trace.push("holds:" + id); return false; },
        cascadeParentArchive: ({ parentId, owner }) => { trace.push("cascade:" + parentId + ":" + owner); return gate.promise; },
      },
      warn: error => warnings.push(error.message),
    });
    assert.deepEqual(result, { holdsArchive: false });
    assert.deepEqual(trace, ['emit:archived:parent-2', 'holds:parent-2', 'cascade:parent-2:req-2'],
      'resolved while the cascade promise is still pending');
    gate.reject(new Error('boom'));
    await new Promise(r => setImmediate(r));
    assert.deepEqual(warnings, ['boom']);
  }

  // 3) Against a real createBtwSessions service: holds while a live /btw child is archived, returns immediately without one.
  {
    const childGate = deferred();
    const f = family(method => method === 'thread/archive' ? childGate.promise : undefined);
    const child = await f.child();
    f.config.threadIds = f.config.threadIds.filter(id => id !== 'parent');
    f.config.archivedThreadIds.push('parent');
    const events = [];
    let finished = false;
    const p = archiveParentCascade({
      threadId: 'parent',
      owner: f.client,
      emitSessionList: (kind, id) => events.push([kind, id]),
      btwSessions: f.service,
    }).then(() => { finished = true; });
    assert.deepEqual(events, [['archived', 'parent']], 'parent archived event goes out before the child archive finishes');
    await new Promise(r => setImmediate(r));
    assert.equal(finished, false, 'held by the live child');
    childGate.resolve({});
    await p;
    assert.equal(finished, true);
    assert.deepEqual(archives(f), [child]);
  }
});

test('main archives wire the parent cascade after the confirmed archive (person and inactivity rule)', async () => {
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const block = main.slice(main.indexOf('if (p.method === "thread/archive") {\n          agentTools.cancelSession'), main.indexOf('if (p.method === "thread/unarchive") {', main.indexOf('if (p.method === "thread/archive") {\n          agentTools.cancelSession')));
  const at = needle => { const index = block.indexOf(needle); assert.ok(index >= 0, needle); return index; };
  const saved = at('config.archivedThreadIds = [...new Set([params.threadId');
  const cascaded = at('await archiveParentCascade({ threadId: params.threadId, owner: requester, emitSessionList, btwSessions });');
  assert.ok(saved < cascaded);
  assert.match(main, /else if \(p\.method === "thread\/unarchive"\) emitSessionList\("unarchived", params\.threadId\);/);
  assert.doesNotMatch(main, /p\.method === "thread\/archive" \|\| p\.method === "thread\/unarchive"\) emitSessionList/, '"archived" is announced once');
  assert.match(main, /if \(p\.op === "detach"\) return btwSessions\.detach\(p\);/);
  assert.match(main, /emit:\(event\)=>\{emit\(event\);if\(event\?\.kind==="desktop-archived"\)void btwSessions\.cascadeParentArchive\(\{parentId:event\.threadId\}\)/);
  // R4i-transcript TR2: the inactivity rule's archive closes no side-pane popout, as in 2.42304.0. The rule archives in the
  // main process (AutoArchiveEngine `archiveSession(r.sessionId,{…isAutomatic:!0,byAutoArchiveRule:!0`); the renderer
  // takes that "archived" event as a meta update only (cef1e6037), and the session eviction that closes popouts
  // (c6b8adeaf bi → c03935b01 evictEpitaxySession → closeSidePanePopoutsForSession) runs only after a person's archive
  // (ki onSuccess, refCount 0) and after a delete.
  const emitLine = main.slice(main.indexOf('emit:(event)=>{emit(event);if(event?.kind==="desktop-archived")'));
  assert.doesNotMatch(emitLine.slice(0, emitLine.indexOf('\n')), /closeSidePanePopoutsForSession/, 'desktop-archived closes no popout');
  const settings = fs.readFileSync(new URL('../electron/desktop-settings.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(settings, /closeSidePanePopoutsForSession|popout/i);
  const build = new URL('../../reference/installed-2.42304.0-20261017/asar/.vite/build/', import.meta.url);
  const v1 = new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/', import.meta.url);
  const count = (text, needle) => text.split(needle).length - 1;
  const engine = fs.readFileSync(new URL('index.chunk-8MUr88A-.js', build), 'utf8');
  assert.equal(count(engine, 'isAutomatic:!0,byAutoArchiveRule:!0'), 1);
  assert.equal(count(engine, 'closeSidePane'), 0);
  const events = fs.readFileSync(new URL('cef1e6037-8DivyY4m.js', v1), 'utf8');
  assert.equal(count(events, 'case"session_updated":case"start":case"archived":case"unarchived":case"permission_mode_changed":case"stopped":case"paused":return{sessionId:t.sessionId,kind:"meta_updated",session:t.session}'), 1);
  const archive = fs.readFileSync(new URL('c6b8adeaf-C5Aww7gq.js', v1), 'utf8');
  assert.equal(count(archive, 'async function bi(e){let t=await yi();t?t.evictEpitaxySession(e):Jt(e)}'), 1);
  assert.equal(count(archive, '(o[t.id]?.refCount??0)===0&&(d(t.id),bi(t.id))'), 1);
  assert.equal(count(archive, 'me(t.id),bi(t.id)})'), 1);
  assert.equal(archive.split(/[^\w$.]bi\(/).length - 1, 3, 'bi: its definition, the archive onSuccess and the delete');
  const asar = fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-CFJssAFf.js', import.meta.url), 'utf8');
  const cascade = asar.indexOf('this.liveSideSessionsOf(e).length>0||(this.sideSessionStartsFor(e)??0)>0?await this.cascadeArchiveSideSessions(m,i,o,a.keepUntracked):this.cascadeArchiveSideSessions(m,i,o,a.keepUntracked).catch(');
  const event = asar.lastIndexOf('this.emit("event",{type:"archived",sessionId:e,', cascade);
  assert.ok(event > 0 && cascade - event < 2000, 'teardownSession emits "archived" just before the conditional await');
});

// R2-btw NBS-1: the boundary note is 2.42304.0 Sy (asar index.chunk-B5tintml.js; 2.37337.1 Py) under the same export.
test('NBS-1: the /btw boundary note is the 2.42304.0 side-session prompt for a btw user fork', async () => {
  const { sideSessionPrompt } = await import('../electron/generated/side-session-prompt.mjs');
  const btw = sideSessionPrompt('local_abc-1', { userFork: true, btw: true, sharesCheckout: true });
  assert.match(btw, /## The user forked this session from another session/);
  assert.match(btw, /to ask something on the side/);
  assert.match(btw, /reported automatically to `local_abc-1`, the original session/);
  assert.match(btw, /or when the user asks you to pass something on\./);
  assert.match(btw, /You share your working folders with other sessions/);
  assert.match(btw, /Link a session whenever you mention one/);
  const own = sideSessionPrompt('not-a-local-id', { userFork: true, btw: true });
  assert.doesNotMatch(own, /SendMessage|You share your working folders/);
  assert.match(sideSessionPrompt('local_x', { userFork: true }), /your last message is reported to `local_x`/);
  assert.match(sideSessionPrompt('local_x'), /## You are a session started from another session[\s\S]*You cannot start sessions yourself\./);
  const s = setup(); const { sessionId } = await s.service.start(s.payload);
  const params = { threadId: sessionId, input: [{ type: 'text', text: 'Q', text_elements: [] }] };
  s.service.prepareTurn(params);
  const meta = s.config.sessionMetadata[sessionId];
  const note = sideSessionPrompt(meta.spawnedFrom.sessionId, { userFork: true, btw: true, sharesCheckout: meta.spawnedFrom.sharedCheckout === true }).trim();
  assert.equal(params.input[0].text, `<system-reminder>\n${note}\n</system-reminder>`);
});

// R3-nested NBS-4: 2.42304.0 index.chunk-CFJssAFf.js detachFromParent, behind the /btw tab menu's "Detach to top level".
test('detach sets lineageDetached, saves and announces it; the session then leaves every /btw lineage path', async () => {
  const s = setup(); const { sessionId } = await s.service.start(s.payload);
  const parent = structuredClone(s.config.sessionMetadata.parent), saves = s.saves(), before = s.events.length;
  const result = s.service.detach({ sessionId, expected: s.expected });
  assert.equal(result.status, 'detached'); assert.equal(result.sessionId, sessionId);
  const meta = s.config.sessionMetadata[sessionId];
  assert.equal(meta.lineageDetached, true); assert.deepEqual(result.sessionMetadata, meta);
  assert.deepEqual(meta.spawnedFrom, { sessionId: 'parent', sideSession: true, userFork: true, btw: true }, 'spawnedFrom is kept, as the original keeps it');
  assert.equal(s.saves(), saves + 1); assert.deepEqual(s.events.slice(before), [['metadata', { id: sessionId }, meta]]);
  assert.deepEqual(s.config.sessionMetadata.parent, parent, 'the parent is untouched');
  assert.equal(isBtwChild(meta), false);
  assert.deepEqual(s.service.detach({ sessionId, expected: s.expected }), { status: 'ignored' }, 'n.Co(i) has no lineage any more: a no-op');
  assert.deepEqual(await s.service.close({ sessionId, expected: s.expected }), { status: 'ignored' }, 'closing its tab never archives a detached session');
  s.config.archivedThreadIds.push('parent'); s.config.threadIds = s.config.threadIds.filter(id => id !== 'parent');
  assert.deepEqual(await s.service.cascadeParentArchive({ parentId: 'parent' }), [], 'nor does archiving the former parent');
  assert.equal(s.service.cascadeHoldsArchive('parent'), false);
  const { parentRefusal } = createRequire(import.meta.url)('../electron/btw-sessions.cjs');
  assert.equal(parentRefusal({ id: sessionId, cwd: '/repo' }, meta, s.config), null, 'a top-level session may open its own /btw');
});
test('detach refuses a shared checkout with the original message, an archived child, an unknown id and a stale connection', async () => {
  const shared = setup(); const a = (await shared.service.start(shared.payload)).sessionId;
  shared.config.sessionMetadata[a].spawnedFrom.sharedCheckout = true;
  assert.throws(() => shared.service.detach({ sessionId: a, expected: shared.expected }), /^Error: A session that shares its parent's checkout can't be moved to top level\.$/);
  assert.equal(shared.config.sessionMetadata[a].lineageDetached, undefined);
  const archived = setup(); const b = (await archived.service.start(archived.payload)).sessionId;
  archived.config.threadIds = archived.config.threadIds.filter(id => id !== b); archived.config.archivedThreadIds.push(b);
  assert.throws(() => archived.service.detach({ sessionId: b, expected: archived.expected }), /Open an active session first/);
  assert.throws(() => archived.service.detach({ sessionId: 'missing', expected: archived.expected }), /Session not found\./);
  assert.throws(() => archived.service.detach({ sessionId: '', expected: archived.expected }), /Invalid side session/);
  assert.deepEqual(archived.service.detach({ sessionId: 'parent', expected: archived.expected }), { status: 'ignored' }, 'a session with no /btw lineage');
  const stale = setup(); const c = (await stale.service.start(stale.payload)).sessionId; const events = stale.events.length; stale.swap();
  assert.throws(() => stale.service.detach({ sessionId: c, expected: stale.expected }), /connection changed/);
  assert.equal(stale.config.sessionMetadata[c].lineageDetached, undefined); assert.equal(stale.events.length, events);
  const other = setup(); other.client.serverInfo = { engine: 'deepseek' };
  assert.deepEqual(other.service.detach({ sessionId: 'parent', expected: other.expected }), { status: 'disabled', reason: 'unsupported_core' });
  let failing = false; const save = setup(undefined, { save: () => { if (failing) throw new Error('disk full'); } });
  const d = (await save.service.start(save.payload)).sessionId; failing = true;
  assert.throws(() => save.service.detach({ sessionId: d, expected: save.expected }), /disk full/);
  assert.equal(save.config.sessionMetadata[d].lineageDetached, undefined, 'a failed save keeps the lineage');
  const v1 = new URL('../../reference/installed-2.42304.0-20261017/', import.meta.url), fs = await import('node:fs');
  const main = fs.readFileSync(new URL('asar/.vite/build/index.chunk-CFJssAFf.js', v1), 'utf8');
  assert.ok(main.includes(`async detachFromParent(e,r="user"){let i=this.sessions.get(e);if(!i)throw Error("Session not found.");let a=n.Co(i);if(!a)return;if(i.spawnedFrom?.sideSession&&i.spawnedFrom.sharedCheckout)throw Error("A session that shares its parent's checkout can't be moved to top level.");`));
});
test('a detached child keeps recording its own turns for its pane, without the side-session note', async () => {
  const s = setup(); const { sessionId } = await s.service.start(s.payload);
  s.service.detach({ sessionId, expected: s.expected });
  const params = { threadId: sessionId, input: [{ type: 'text', text: 'After detach', text_elements: [] }] };
  const confirm = s.service.prepareTurn(params, { permission: 'acceptEdits' });
  assert.equal(params.input.length, 1, 'no <system-reminder> once detached');
  s.service.observe({ method: 'turn/started', params: { threadId: sessionId, turn: { id: 'after' } } }); confirm({ turn: { id: 'after' } });
  const meta = s.config.sessionMetadata[sessionId];
  assert.deepEqual(meta.btw.ownTurnIds, ['after']); assert.equal(meta.btw.boundaryPending, true, 'the boundary is never spent on a detached child');
  assert.equal(meta.btw.permission, 'acceptEdits');
  const ordinary = { threadId: 'parent', input: [{ type: 'text', text: 'Parent' }] }; s.service.prepareTurn(ordinary)({ turn: { id: 'p' } });
  s.service.observe({ method: 'turn/started', params: { threadId: 'parent', turn: { id: 'p' } } });
  assert.equal(s.config.sessionMetadata.parent.btw, undefined, 'a session that never was a /btw child records nothing');
});
test('the archive answer waits for the cascade only while the parent has live side sessions or openings in flight', async () => {
  const f = family();
  assert.equal(f.service.cascadeHoldsArchive('parent'), false, 'no children, no openings');
  let release; const gate = new Promise(resolve => { release = resolve; });
  const slow = family(async method => { if (method === 'thread/fork') await gate; });
  const opening = slow.service.start(slow.payload);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(slow.service.cascadeHoldsArchive('parent'), true, 'an opening in flight (sideSessionStartsFor)');
  release(); const { sessionId } = await opening;
  assert.equal(slow.service.cascadeHoldsArchive('parent'), true, 'the live child (liveSideSessionsOf)');
  slow.service.detach({ sessionId, expected: slow.expected });
  assert.equal(slow.service.cascadeHoldsArchive('parent'), false, 'a detached child is not a live side session');
  const failed = family(method => { if (method === 'thread/fork') throw new Error('fork failed'); });
  await assert.rejects(failed.service.start(failed.payload), /fork failed/);
  assert.equal(failed.service.cascadeHoldsArchive('parent'), false, 'a settled opening no longer counts');
  assert.equal(f.service.cascadeHoldsArchive(''), false);
});
