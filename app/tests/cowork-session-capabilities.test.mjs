// R4g-small SM3 (research-ext/X2-cowork-session-actions.md CW-0): a Cowork session's rewind / fork gates are decided per
// session (src/cowork-session-capabilities.mjs), pinned to 2.42304.0 c21f11e6d mk Lt/Bt/Vt and cb1e253a0 vm; main's
// slash-rewind refuses a Cowork session before it reaches the core.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  COWORK_SESSION_ID, isCoworkSession, coworkRewindBridgeServed, coworkRewindCapabilities, codeRewindServed, codeForkServed,
} from '../src/cowork-session-capabilities.mjs';

const root = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(root, '../reference/installed-2.42304.0-20261017');
const v1 = (name) => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const COWORK = 'cw-0123abcd-4567-89ef-0123-456789abcdef';

test('the original gates: mk Lt/Bt/Vt and vm, each once in 2.42304.0', () => {
  const view = v1('c21f11e6d-Bd0v2A97.js');
  for (const needle of ['Lt=o?!1:k?Ot&&We!==void 0:Vf(et),Rt=!!t.scheduledTaskId;', 'let zt=Rt||Et,Bt=Lt&&!zt,Vt=Bt&&!k,',
    'Ot=re("cowork_rewind_dramatic_shrimp",k&&We!==void 0&&!t.scheduledTaskId&&!Et)'])
    assert.equal(occurrences(view, needle), 1, needle);
  assert.equal(occurrences(v1('cb1e253a0-DQ4zAGBV.js'), 'function vm(e){return!!(e?.rewindV2??e?.rewind)}'), 1);
});

test('vm: a bridge with rewindV2 or rewind', () => {
  for (const [bridge, served] of [[null, false], [undefined, false], [{}, false], [{ rewind() {} }, true], [{ rewindV2() {} }, true]])
    assert.equal(coworkRewindBridgeServed(bridge), served);
});

test('mk Lt/Bt/Vt: read-only, remote gate, local bridge, scheduled and dispatch sessions', () => {
  const none = { canRewindToMessage: false, canEditOrRestart: false, canSessionRewind: false };
  assert.deepEqual(coworkRewindCapabilities(), none, 'the host has no rewind bridge yet (CW-2/CW-3)');
  const bridge = { rewindV2: async () => ({}) };
  assert.deepEqual(coworkRewindCapabilities({ bridge }), { canRewindToMessage: true, canEditOrRestart: true, canSessionRewind: true });
  assert.deepEqual(coworkRewindCapabilities({ bridge, readOnly: true }), none);
  assert.deepEqual(coworkRewindCapabilities({ bridge, scheduledTaskId: 'task' }), { canRewindToMessage: true, canEditOrRestart: false, canSessionRewind: false });
  assert.deepEqual(coworkRewindCapabilities({ bridge, dispatch: true }), { canRewindToMessage: true, canEditOrRestart: false, canSessionRewind: false });
  assert.deepEqual(coworkRewindCapabilities({ remote: true, bridge }), none, 'remote ignores the local bridge');
  assert.deepEqual(coworkRewindCapabilities({ remote: true, remoteRewindGate: true }), none, 'remote needs rewindSession');
  assert.deepEqual(coworkRewindCapabilities({ remote: true, remoteRewindGate: true, rewindSession: () => {} }),
    { canRewindToMessage: true, canEditOrRestart: true, canSessionRewind: false }, 'Vt is local only');
});

test('Code transcript gates: a Cowork session offers no rewind or fork; Code sessions keep the core capability gates', () => {
  assert.equal(COWORK_SESSION_ID.source, '^cw-[a-f0-9-]{36}$');
  const service = fs.readFileSync(path.join(root, 'electron/cowork-runtime/session-service.mjs'), 'utf8');
  assert.equal(occurrences(service, "owns(id) { return typeof id === 'string' && /^cw-[a-f0-9-]{36}$/.test(id); }"), 1, 'the same test as main coworkSessions.owns');
  for (const id of [COWORK, `cw-${'f'.repeat(36)}`]) assert.equal(isCoworkSession(id), true, id);
  for (const id of ['019a-thread', 'cw-short', `cw-${'g'.repeat(36)}`, null, undefined, 7]) assert.equal(isCoworkSession(id), false, String(id));
  const all = {};
  for (const capabilities of [undefined, null, all, { unsupportedMethods: [] }, { forkAtTurn: true }]) {
    assert.equal(codeRewindServed(COWORK, capabilities), false);
    assert.equal(codeForkServed(COWORK, capabilities), false);
    assert.equal(codeRewindServed('thread-1', capabilities), true);
    assert.equal(codeForkServed('thread-1', capabilities), true);
  }
  assert.equal(codeRewindServed('thread-1', { unsupportedMethods: ['thread/revert'] }), false);
  assert.equal(codeForkServed('thread-1', { unsupportedMethods: ['thread/revert'] }), true);
  assert.equal(codeForkServed('thread-1', { unsupportedMethods: ['thread/fork'] }), false);
  assert.equal(codeForkServed('thread-1', { forkAtTurn: false }), false, 'MiniMax forks only whole sessions');
  assert.equal(codeRewindServed('thread-1', { forkAtTurn: false }), true);
});

test('main.jsx: the four message-action gates read the per-session functions', () => {
  const source = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
  // R4i-cowork CW3 added the Cowork bridge / capabilities to the same import (tests/cowork-session-actions.test.mjs).
  assert.equal(occurrences(source, "import { codeRewindServed, codeForkServed, coworkRewindBridge, coworkRewindCapabilities, isCoworkSession } from './cowork-session-capabilities.mjs';"), 1);
  assert.equal(occurrences(source, 'onRewindTo: current && !running && !session?.archived && boot?.connected && codeRewindServed(current, boot?.core?.capabilities)'), 1);
  assert.equal(occurrences(source, 'onForkFrom: current && !running && !session?.archived && boot?.connected && codeForkServed(current, boot?.core?.capabilities)'), 1);
  assert.equal(occurrences(source, 'onRewind={current && !running && !session?.archived && boot?.connected && codeRewindServed(current, boot?.core?.capabilities)'), 1);
  assert.equal(occurrences(source, 'rewindServed: !!(current && !session?.archived && boot?.connected && codeRewindServed(current, boot?.core?.capabilities)),'), 1);
  assert.equal(occurrences(source, '!unsupportedMethods?.includes("thread/fork")'), 0);
});

test('main.cjs slash-rewind: a Cowork session is refused with the original Unsupported copy before the core is asked', () => {
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  const start = main.indexOf('case "slash-rewind": {');
  assert.ok(start > 0);
  const body = main.slice(start, main.indexOf('owner.request("thread/read"', start));
  const guard = body.indexOf('if (coworkSessions.owns(p.threadId)) throw new Error(');
  assert.ok(guard > 0 && guard < body.indexOf('const owner=client'), 'the guard runs first');
  // R4i-small SM3: the refusal goes through i18n.t (zh-CN app.mjs // R4i-small); the source string stays the lO original.
  const copy = /coworkSessions\.owns\(p\.threadId\)\) throw new Error\(i18n\.t\("([^"]+)"\)\)/.exec(body)[1];
  const view = v1('c21f11e6d-Bd0v2A97.js');
  const original = /case ke\.Unsupported:return t\.formatMessage\(\{defaultMessage:"([^"]+)",id:"SC1NI\+O8Y4"\}\)/.exec(view)[1]
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  assert.equal(copy, original);
  assert.equal(copy, 'Messages in this task can’t be edited or restarted from. Send what you need as a new message instead.');
});

// R4i-cowork CW2/CW3 (X2 CW-3): the host rewind bridge and main's cowork-rewind IPC.
import { coworkRewindBridge } from '../src/cowork-session-capabilities.mjs';

test('coworkRewindBridge: rewindV2 reaches cowork-rewind only with Cowork on, and serves vm', async () => {
  const calls = [];
  const call = async (channel, payload) => { calls.push([channel, payload]); return { prefill: 'Two' }; };
  assert.equal(coworkRewindBridge(call), null); assert.equal(coworkRewindBridge(call, { coworkEnabled: 'yes' }), null);
  assert.equal(coworkRewindBridge(null, { coworkEnabled: true }), null);
  const bridge = coworkRewindBridge(call, { coworkEnabled: true });
  assert.equal(coworkRewindBridgeServed(bridge), true);
  assert.deepEqual(coworkRewindCapabilities({ bridge }), { canRewindToMessage: true, canEditOrRestart: true, canSessionRewind: true });
  assert.deepEqual(await bridge.rewindV2(COWORK, 'message-uuid'), { prefill: 'Two' });
  assert.deepEqual(calls, [['cowork-rewind', { threadId: COWORK, targetMessageUuid: 'message-uuid' }]]);
  const preload = fs.readFileSync(path.join(reference, 'asar/.vite/build/mainView.js'), 'utf8');
  assert.equal(occurrences(preload, 'LocalAgentModeSessions_$_rewindV2'), 1);
});

test('main.cjs cowork-rewind: Cowork on, a listed Cowork session and a message id, serialized with sends, {prefill?, refusal?} only', () => {
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
  assert.equal(occurrences(main, 'case "cowork-rewind": {'), 1);
  const start = main.indexOf('case "cowork-rewind": {'), body = main.slice(start, main.indexOf('case "slash-rewind": {', start));
  const order = ["if (!COWORK_ENABLED) throw new Error(i18n.t('Cowork is still in development.'));",
    "if (!coworkSessions?.owns(p?.threadId) || !config.threadIds.includes(p.threadId)) throw new Error('Unknown Cowork session.');",
    "if (typeof p.targetMessageUuid !== 'string' || !p.targetMessageUuid) throw new Error('Unknown Cowork message.');",
    'const release=sessionOperations.reserveMessage(p.threadId);',
    "await coworkSessions.request('cowork/rewind',{threadId:p.threadId,targetMessageUuid:p.targetMessageUuid});",
    '} finally { release(); }'].map(needle => { assert.equal(occurrences(body, needle), 1, needle); return body.indexOf(needle); });
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'checks run before the runtime is asked');
  assert.equal(occurrences(body, '...(result.prefill !== undefined ? { prefill: result.prefill } : {}), ...(result.refusal !== undefined ? { refusal: result.refusal } : {})'), 1);
  const muI = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  assert.equal(occurrences(muI, '["rewindV2",[["sessionId",F],["targetMessageUuid",F]],Kxt]'), 1);
});
