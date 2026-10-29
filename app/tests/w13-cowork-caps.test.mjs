// w13-coworkfn-caps (research/w13-coworkfn.md cwf-15/16/17, cwf-45 third lock): a Cowork session on the connected core
// (w13-coworkfn-engine: sessionMetadata surface 'cowork', engine 'local-core', id not cw-) gets the official Cowork view's
// abilities in main.cjs:
// - steer (cwf-15): 3.6556.2 Dl8 sendMessage enqueues during a turn (`u.inputStream.enqueue(ae)`), so only the Cowork VM
//   runtime (cw-) keeps its "Stop the current Cowork task…" refusal; a core session steers like Code.
// - session-action (cwf-16): the 3.6556.2 Cowork view (c21f11e6d) has no Fork from here (c96d752d0 qjMB66sXZ2), so a core
//   Cowork session refuses fork only; compact and review stay the core's.
// - cowork-rewind (cwf-17): Dl8 rewindSessionV2 ({prefill} or {refusal: shared-0 By}) over the core: thread/revert before
//   the turn holding the target user message, the message's text as prefill.
// The cowork-rewind branch is run here with fake core / config objects (main.cjs's own text, not a copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isCoworkSession, coworkRewindBridge, coworkRewindBridgeServed, codeForkServed, codeRewindServed } from '../src/cowork-session-capabilities.mjs';

const root = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(root, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const build = (name) => fs.readFileSync(path.join(snapshot, 'asar/.vite/build', name), 'utf8');
const v1 = (prefix) => {
  const dir = path.join(snapshot, 'ion-dist/assets/v1');
  const name = fs.readdirSync(dir).find((file) => file.startsWith(prefix) && file.endsWith('.js'));
  assert.ok(name, prefix);
  return fs.readFileSync(path.join(dir, name), 'utf8');
};
const occurrences = (text, needle) => text.split(needle).length - 1;
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
const caseBody = (name, next) => {
  const start = main.indexOf(`case "${name}": {`);
  assert.ok(start > 0, name);
  return main.slice(start, main.indexOf(`case "${next}": {`, start));
};

test('3.6556.2 originals: sendMessage enqueues during a turn, rewindSessionV2 answers {prefill}|{refusal}, the Cowork view has no Fork from here', () => {
  const sessions = build('index.chunk-Dl8NPgw7.js');
  for (const needle of ['try{u.inputStream.enqueue(ae)}', 'm.pendingStartMessages.push(', 'async rewindSessionV2(e,r){let i=this.sessions.get(e);',
    '{refusal:t.k2.Unsupported}'])
    assert.ok(occurrences(sessions, needle) >= 1, needle);
  assert.equal(occurrences(v1('shared-0-'), 'e.Dead="dead",e.NoText="no_text",e.Unsupported="unsupported",e.Unknown="unknown"'), 1);
  const cowork = v1('c21f11e6d-'), code = v1('c96d752d0-');
  assert.equal(occurrences(cowork, 'qjMB66sXZ2'), 0, 'no Fork from here in the Cowork view');
  assert.equal(occurrences(cowork, './c96d752d0-'), 0, 'the Cowork view does not load the Code view’s fork menu');
  assert.ok(occurrences(code, 'defaultMessage:"Fork from here",id:"qjMB66sXZ2"') >= 1);
  assert.ok(occurrences(build('mainView.js'), 'LocalAgentModeSessions_$_rewindV2') === 1);
});

test('renderer gates: a core Cowork session has the rewind bridge and neither Code transcript rewind nor Fork from here', async () => {
  const metadata = { 'thread-cw': { surface: 'cowork', engine: 'local-core', cowork: { storage: '00000000-0000-4000-8000-000000000000', folders: [] } }, 'thread-code': { surface: 'code' } };
  assert.equal(isCoworkSession('thread-cw', metadata), true);
  assert.equal(isCoworkSession('thread-code', metadata), false);
  assert.equal(codeForkServed('thread-cw', {}, metadata), false);
  assert.equal(codeRewindServed('thread-cw', {}, metadata), false);
  const calls = [];
  const bridge = coworkRewindBridge(async (channel, payload) => { calls.push([channel, payload]); return { prefill: 'x' }; }, { cowork: isCoworkSession('thread-cw', metadata) });
  assert.equal(coworkRewindBridgeServed(bridge), true);
  await bridge.rewindV2('thread-cw', 'item-1');
  assert.deepEqual(calls, [['cowork-rewind', { threadId: 'thread-cw', targetMessageUuid: 'item-1' }]]);
  assert.equal(coworkRewindBridge(async () => ({}), { cowork: isCoworkSession('thread-code', metadata) }), null);
});

test('main.jsx: the bridge follows the session (cwf-45 third lock) and the placeholder only shows for an unsupported Cowork', () => {
  const source = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(source, 'const coworkBridge = isCoworkSession(current, sessionMetadata) ? coworkRewindBridge(call, { cowork: true }) : null;'), 1);
  assert.equal(occurrences(source, 'coworkRewindBridge(call, { coworkEnabled'), 0);
  assert.equal(occurrences(source, "boot?.coworkEnabled !== true ? <SourceCoworkComingSoon"), 0);
  // w13-coworkui-placeholder removes the placeholder branch altogether; until then its condition is the unsupported status.
  if (source.includes('<SourceCoworkComingSoon onMode={switchMode} />'))
    assert.equal(occurrences(source, "{section === \"new\" && mode === 'cowork' && boot?.cowork?.status === 'unsupported' ? <SourceCoworkComingSoon onMode={switchMode} /> : section === \"new\" ? ("), 1);
});

test('main.cjs steer: only a Cowork VM session refuses a message during a turn', () => {
  const body = caseBody('steer', 'session-action');
  const lines = body.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//'));
  assert.equal(lines[1].trim(), "if (coworkSessions.owns(p.threadId)) return { ok: false, message: 'Stop the current Cowork task before sending another message.', code: null, data: null };");
  assert.match(lines[2], /return steerTurn\(client, p, \{/);
  assert.equal(occurrences(body, 'surface'), 0, 'no surface refusal: a core Cowork session steers like Code');
});

test('main.cjs session-action: a core Cowork session refuses fork only, after the VM refusal', () => {
  const body = caseBody('session-action', 'btw-session');
  const vm = body.indexOf("if (coworkSessions.owns(p.threadId)) throw new Error('Fork, compact and code review are not available for this Cowork runtime yet.');");
  const fork = body.indexOf('if (p.operation === "fork" && config.sessionMetadata?.[p.threadId]?.surface === "cowork") throw new Error(i18n.t(\'Fork is not available for Cowork tasks.\'));');
  const run = body.indexOf('const result = await sessionOperations.run(p);');
  assert.ok(vm > 0 && fork > vm && run > fork, 'VM refusal, then the Cowork fork refusal, then the core');
  assert.equal(occurrences(body, 'compact'), 2, 'compact is named only in the comment and the VM refusal');
});

// The core branch of cowork-rewind, run over fakes.
const BRANCH_START = 'if (!coworkSessions?.owns(p?.threadId) && config.sessionMetadata?.[p?.threadId]?.surface === "cowork") {';
const VM_REFUSAL = "{ const refusal = (await import('./cowork-runtime/core-cowork.mjs')).vmRequestRefusal('cowork/rewind', COWORK);";
function coreRewind() {
  const body = caseBody('cowork-rewind', 'slash-rewind');
  const start = body.indexOf(BRANCH_START), end = body.indexOf(VM_REFUSAL);
  assert.ok(start > 0 && end > start, 'the core branch runs before the VM engine refusal (which answers O-5 off the VM engine)');
  const branch = body.slice(start, end).replace('"../src/thread-history-model.mjs"', JSON.stringify(pathToFileURL(path.join(root, 'src/thread-history-model.mjs')).href));
  assert.ok(!branch.includes('../src/'), 'one dynamic import, rewritten for the test');
  const AsyncFunction = (async () => {}).constructor;
  const run = new AsyncFunction('p', 'config', 'client', 'coworkSessions', 'sessionOperations', `${branch}\nreturn "fell-through";`);
  return run;
}
const userItem = (id, text) => ({ id, type: 'userMessage', content: [{ type: 'text', text }, { type: 'image', url: 'x' }] });
function harness({ turns, historyMode = 'paginated', unsupportedMethods, surface = 'cowork', threadIds = ['thread-cw'], busy = false, live = null, reconnectOn = null } = {}) {
  const requests = [], reserved = [];
  let running = live;
  const client = {
    serverInfo: { capabilities: unsupportedMethods ? { unsupportedMethods } : {} },
    connection: { closed: false },
    async request(method, params) {
      requests.push([method, params]);
      // w13-close-main-process: the core ends an interrupted turn; a reconnect while the history is read.
      if (method === 'turn/interrupt') { running = null; return {}; }
      if (method === reconnectOn) client.connection = { closed: false };
      if (method === 'thread/read') return { thread: { id: params.threadId, historyMode } };
      if (method === 'thread/turns/list') return { data: [...turns].reverse(), nextCursor: null };
      if (method === 'thread/revert') return { thread: { id: params.threadId } };
      throw new Error(`unexpected ${method}`);
    },
  };
  const config = { threadIds, threadMetadata: {}, sessionMetadata: { 'thread-cw': { surface, engine: 'local-core' } } };
  const sessionOperations = { reserveMessage(id) { if (busy || running) throw new Error('Wait for the current task to finish or stop it first.'); reserved.push(['reserve', id]); return () => reserved.push(['release', id]); },
    ...(live ? { isActive: (id) => id === 'thread-cw' && !!running, activeTurn: (id) => (id === 'thread-cw' ? running : null) } : {}) };
  const coworkSessions = { owns: (id) => /^cw-/.test(id) };
  return { requests, reserved, args: (p) => [p, config, client, coworkSessions, sessionOperations] };
}
const TURNS = [
  { id: 'turn-1', itemsView: 'full', items: [userItem('u1', 'First'), { id: 'a1', type: 'agentMessage', text: 'ok' }] },
  { id: 'turn-2', itemsView: 'full', items: [userItem('u2', 'Second ask'), { id: 'a2', type: 'agentMessage', text: 'ok' }] },
  { id: 'turn-3', itemsView: 'full', items: [userItem('u3', '   ')] },
];

test('main.cjs cowork-rewind (core): thread/revert before the target message’s turn, {prefill: its text}, serialized with sends', async () => {
  const run = coreRewind(), h = harness({ turns: TURNS });
  assert.deepEqual(await run(...h.args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), { prefill: 'Second ask' });
  assert.deepEqual(h.requests.map(([method]) => method), ['thread/read', 'thread/turns/list', 'thread/revert']);
  assert.deepEqual(h.requests.at(-1), ['thread/revert', { threadId: 'thread-cw', beforeTurnId: 'turn-2' }]);
  assert.deepEqual(h.reserved, [['reserve', 'thread-cw'], ['release', 'thread-cw']]);
});

test('main.cjs cowork-rewind (core): the refusal arm (unsupported / unknown / no_text) never reverts', async () => {
  const run = coreRewind();
  for (const [setup, target, refusal] of [
    [{ unsupportedMethods: ['thread/revert'] }, 'u2', 'unsupported'],
    [{ historyMode: 'legacy' }, 'u2', 'unsupported'],
    [{}, 'missing', 'unknown'],
    [{}, 'a1', 'unknown'],
    [{}, 'u3', 'no_text'],
  ]) {
    const h = harness({ turns: TURNS, ...setup });
    assert.deepEqual(await run(...h.args({ threadId: 'thread-cw', targetMessageUuid: target })), { refusal }, `${target} ${JSON.stringify(setup)}`);
    assert.equal(h.requests.some(([method]) => method === 'thread/revert'), false);
    if (h.reserved.length) assert.deepEqual(h.reserved.at(-1), ['release', 'thread-cw'], 'the send lock is released');
  }
});

test('main.cjs cowork-rewind (core): unknown sessions, a live turn, and sessions that are not core Cowork', async () => {
  const run = coreRewind();
  await assert.rejects(run(...harness({ turns: TURNS, threadIds: [] }).args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), /Unknown Cowork message\./);
  await assert.rejects(run(...harness({ turns: TURNS }).args({ threadId: 'thread-cw', targetMessageUuid: '' })), /Unknown Cowork message\./);
  const busy = harness({ turns: TURNS, busy: true });
  await assert.rejects(run(...busy.args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), /Wait for the current task to finish/);
  assert.deepEqual(busy.requests, [], 'a live turn: the core is not asked');
  // A Code session, or a Cowork VM session (cw-), falls through to the VM runtime path below.
  assert.equal(await run(...harness({ turns: TURNS, surface: 'code' }).args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), 'fell-through');
  assert.equal(await run(...harness({ turns: TURNS }).args({ threadId: 'cw-0123abcd-4567-89ef-0123-456789abcdef', targetMessageUuid: 'u2' })), 'fell-through');
});

// w13-close-main-process (E63 coworkfn-caps-02, closeout coworkfn-caps-01).
test('main.cjs cowork-rewind (core): a live turn is interrupted first, then the rewind runs (rewindSessionV2 stops the session)', async () => {
  const run = coreRewind(), h = harness({ turns: TURNS, live: 'turn-live' });
  assert.deepEqual(await run(...h.args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), { prefill: 'Second ask' });
  assert.deepEqual(h.requests.map(([method]) => method), ['turn/interrupt', 'thread/read', 'thread/turns/list', 'thread/revert']);
  assert.deepEqual(h.requests[0], ['turn/interrupt', { threadId: 'thread-cw', turnId: 'turn-live' }]);
});

test('main.cjs cowork-rewind (core): no core connection, or one that changed while the history was read, never reverts', async () => {
  const run = coreRewind();
  const none = harness({ turns: TURNS }), [p, config, , coworkSessions, sessionOperations] = none.args({ threadId: 'thread-cw', targetMessageUuid: 'u2' });
  await assert.rejects(run(p, config, null, coworkSessions, sessionOperations), /This session changed\. Reopen it before rewinding\./);
  const moved = harness({ turns: TURNS, reconnectOn: 'thread/turns/list' });
  await assert.rejects(run(...moved.args({ threadId: 'thread-cw', targetMessageUuid: 'u2' })), /This session changed\. Reopen it before rewinding\./);
  assert.equal(moved.requests.some(([method]) => method === 'thread/revert'), false);
  assert.deepEqual(moved.reserved.at(-1), ['release', 'thread-cw'], 'the send lock is released');
});
