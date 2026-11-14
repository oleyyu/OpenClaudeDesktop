// R4i-cowork CW2 (research-ext/X2-cowork-session-actions.md CW-2): the host port of 2.42304.0 rewindSessionV2's
// fork-point decision (electron/cowork-runtime/rewind-chain.mjs), pinned to the original main-process functions and
// exercised on fixture transcripts only (no CLI, no VM).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  COWORK_REWIND_REFUSAL, REWIND_SEND_RACE, REWIND_START_RACE, REWIND_FORK_REFUSED, isForkRefusal, walkToForkPoint, branchState,
  forkFromBuffer, decideRewind, parseTranscript, readRewindTranscript, findTranscript, sessionConfigDir, assistantMidTurn,
  isCommandText, userRecordText,
} from '../electron/cowork-runtime/rewind-chain.mjs';

const root = path.resolve(import.meta.dirname, '..');
const main = name => fs.readFileSync(path.resolve(root, '../reference/installed-2.42304.0-20261017/asar/.vite/build', name), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;

test('the original main-process sources, each feature string counted in 2.42304.0', () => {
  const manager = main('index.chunk-CB6cNSrW.js');
  for (const [needle, count] of [['async rewindSessionV2(', 1], ['Another message reached the session during the rewind, so the conversation was not rewound. Try the rewind again.', 1],
    ['Session started while the rewind was being checked', 1], ['X.resume=K.cliSessionId,X.resumeSessionAt=lt,X.forkSession=!0', 1],
    ['r.pendingRewindTo=void 0,this.delegate.syncPermissionModeFromCliInit', 1], ['takeRewindRefusal', 4], ['pendingRewindTo', 12],
    ['function tg(e,t){', 1], ['function ag(e,r,i){', 1]])
    assert.equal(occurrences(manager, needle), count, needle);
  const chain = main('index.chunk-B5tintml.js');
  for (const needle of ['defineProperty(exports,"_i",{enumerable:!0,get:function(){return kw}})', 'defineProperty(exports,"ui",{enumerable:!0,get:function(){return Fw}})',
    'defineProperty(exports,"Tu",{enumerable:!0,get:function(){return sn}})', 'function kw(e,t){let n=Nw(e),r=n.get(t);if(!r)return{kind:"absent"};',
    'function Fw(e,t){let n=e.findIndex((e=>e.uuid===t));if(n<0)return"unknown";', 'function Lw(e,t){if(e.preservedMessages)return e.preservedMessages;'])
    assert.equal(occurrences(chain, needle), 1, needle);
  assert.equal(occurrences(main('index.chunk-g6cUNaEf.js'), 'async loadRawChain({cliSessionId:e,projectDirPath:n})'), 1);
  const shared = main('index.chunk-muI2IV6k.js');
  assert.equal(occurrences(shared, 'e.Dead="dead",e.NoText="no_text",e.Unsupported="unsupported",e.Unknown="unknown"'), 1);
  assert.equal(occurrences(shared, 'function Qzt(e){return e.includes("No message found with message.uuid")}'), 1);
  assert.equal(occurrences(main('index.chunk-DYcTWSEO.js'), 'function u(e){return/^[/!]/.test(l(e))}'), 1);
  assert.equal(REWIND_SEND_RACE, 'Another message reached the session during the rewind, so the conversation was not rewound. Try the rewind again.');
  assert.equal(REWIND_START_RACE, 'Session started while the rewind was being checked');
  assert.deepEqual({ ...COWORK_REWIND_REFUSAL }, { Dead: 'dead', NoText: 'no_text', Unsupported: 'unsupported', Unknown: 'unknown' });
  assert.equal(isForkRefusal(`Error: ${REWIND_FORK_REFUSED} abc`), true); assert.equal(isForkRefusal('other'), false);
});

const line = (type, uuid, parentUuid, extra = {}) => ({ type, uuid, parentUuid, timestamp: '2026-10-18T00:00:00.000Z', ...extra });
const conversation = () => [
  line('user', 'u1', null, { message: { content: 'First' } }), line('assistant', 'a1', 'u1'),
  line('user', 'u2', 'a1', { message: { content: [{ type: 'text', text: 'Second' }] } }), line('assistant', 'a2t', 'u2'),
  line('user', 'r2', 'a2t', { message: { content: [{ type: 'tool_result', tool_use_id: 't' }] } }), line('assistant', 'a2', 'r2'),
  line('user', 'u3', 'a2', { message: { content: 'Third' } }), line('assistant', 'a3', 'u3'),
];

test('kw: first message, the assistant before a later message, through tool results, absent and unresolved', () => {
  const chain = conversation();
  assert.deepEqual(walkToForkPoint(chain, 'u1'), { kind: 'first' });
  assert.deepEqual(walkToForkPoint(chain, 'u2'), { kind: 'assistant', uuid: 'a1' });
  assert.deepEqual(walkToForkPoint(chain, 'u3'), { kind: 'assistant', uuid: 'a2' });
  assert.deepEqual(walkToForkPoint(chain, 'missing'), { kind: 'absent' });
  assert.deepEqual(walkToForkPoint([line('user', 'x', 'gone')], 'x'), { kind: 'unresolved' });
  assert.deepEqual(walkToForkPoint([line('assistant', 'q', null, { typedQueued: true }), line('user', 'x', 'q')], 'x'), { kind: 'unresolved' });
});

test('Fw: the active chain is resumable, an abandoned side branch is dead, compact boundaries keep only what they preserved', () => {
  const chain = conversation();
  assert.equal(branchState(chain, 'a2'), 'resumable');
  const branched = [...chain, line('user', 'u2b', 'a1', { message: { content: 'Second, edited' } }), line('assistant', 'a2b', 'u2b')];
  assert.equal(branchState(branched, 'a2'), 'dead', 'the newest leaf is on the u2b branch');
  assert.equal(branchState(branched, 'a1'), 'resumable');
  assert.equal(branchState(chain, 'nope'), 'unknown');
  const compacted = [...chain, line('system', 'cb', null, { subtype: 'compact_boundary', compactMetadata: { preservedMessages: { uuids: ['u3', 'a3'], anchorUuid: 'cb' } } }),
    line('user', 'u4', 'cb'), line('assistant', 'a4', 'u4')];
  assert.equal(branchState(compacted, 'a1'), 'dead', 'compacted away');
  assert.equal(branchState(compacted, 'a4'), 'resumable');
});

test('decideRewind: rewindSessionV2 arms — first, assistant, dead, no_text, unknown, dropped', () => {
  const chain = conversation(), buffer = [];
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'u1', text: 'First', foundInBuffer: true }), { forkAt: '', walk: 'first' });
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'u3', text: 'Third', foundInBuffer: true }), { forkAt: 'a2', walk: 'assistant' });
  const branched = [...chain, line('user', 'u2b', 'a1'), line('assistant', 'a2b', 'u2b')];
  assert.deepEqual(decideRewind({ chain: branched, buffer, targetUuid: 'u3', text: 'Third', foundInBuffer: true }), { refusal: 'dead' });
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'u3', text: '  ', foundInBuffer: true }), { refusal: 'no_text' });
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'zz', text: null, foundInBuffer: false }), { refusal: 'unknown' });
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'u3', text: 'Third', foundInBuffer: false }), { forkAt: 'a2', walk: 'assistant' }, 'on disk only');
  assert.deepEqual(decideRewind({ chain: null, buffer, targetUuid: 'u1', text: 'First', foundInBuffer: true }), { forkAt: undefined, walk: 'absent' }, 'never reached the CLI');
  assert.deepEqual(decideRewind({ chain: [], buffer, targetUuid: 'u1', text: 'First', foundInBuffer: true }), { refusal: 'unknown' }, 'transcript missing');
});

test('ag: a target missing on disk forks from the buffer — the previous settled assistant, dropped, or unknown mid-turn', () => {
  const chain = conversation().slice(0, 6); // u3 never written
  const buffer = [{ type: 'user', uuid: 'u1' }, { type: 'assistant', uuid: 'a1', midTurn: false }, { type: 'user', uuid: 'u2' },
    { type: 'assistant', uuid: 'a2t', midTurn: true }, { type: 'user', uuid: 'r2', toolResult: true }, { type: 'assistant', uuid: 'a2', midTurn: false },
    { type: 'user', uuid: 'host-3' }];
  assert.deepEqual(forkFromBuffer(buffer, chain, 'host-3'), { kind: 'fork', uuid: 'a2' });
  assert.deepEqual(decideRewind({ chain, buffer, targetUuid: 'host-3', text: 'Third', foundInBuffer: true }), { forkAt: 'a2', walk: 'assistant' });
  const midTurn = [...buffer.slice(0, 4), { type: 'user', uuid: 'host-3' }];
  assert.deepEqual(forkFromBuffer(midTurn, chain, 'host-3'), { kind: 'unknown' });
  // The first prompt was rewritten by the CLI: walk up from the next assistant on disk to its prompt.
  const first = [{ type: 'user', uuid: 'host-1' }, { type: 'assistant', uuid: 'a1', midTurn: false }];
  assert.deepEqual(forkFromBuffer(first, chain, 'host-1'), { kind: 'unknown' }, 'the disk prompt is not the buffer prompt');
  assert.deepEqual(forkFromBuffer([{ type: 'user', uuid: 'u1' }, { type: 'assistant', uuid: 'a1' }], chain, 'u1'), { kind: 'fork', uuid: '' });
  assert.deepEqual(forkFromBuffer([{ type: 'user', uuid: 'late' }], chain, 'late'), { kind: 'dropped' });
  const late = [{ type: 'user', uuid: 'late' }];
  assert.deepEqual(decideRewind({ chain, buffer: late, targetUuid: 'late', text: 'Late', foundInBuffer: true }), { forkAt: undefined, walk: 'absent' },
    'a dropped target is let go without forking');
  assert.deepEqual(decideRewind({ chain, buffer: late, targetUuid: 'late', text: '/compact', foundInBuffer: true }), { refusal: 'unknown' }, 'unless it was a command');
});

test('assistant midTurn (sn), tool_result users, command text and tg', () => {
  assert.equal(assistantMidTurn({ type: 'assistant', message: { stop_reason: 'tool_use', content: [] } }), true);
  assert.equal(assistantMidTurn({ type: 'assistant', message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }), false);
  assert.equal(assistantMidTurn({ type: 'assistant', message: { content: [{ type: 'thinking' }] } }), true);
  assert.equal(assistantMidTurn({ type: 'assistant', message: { model: '<synthetic>', content: [{ type: 'text', text: 'No response requested.' }] } }), undefined);
  assert.equal(isCommandText('  /compact'), true); assert.equal(isCommandText('!ls'), true); assert.equal(isCommandText('hello'), false);
  assert.equal(userRecordText(conversation(), 'u2'), 'Second'); assert.equal(userRecordText(conversation(), 'a1'), null);
});

test('the transcript is found under projects/* by CLI session id and read as raw chain entries', async t => {
  const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cowork-chain-'));
  t.after(() => fsp.rm(dataDir, { recursive: true, force: true }));
  const configDir = sessionConfigDir(dataDir, 'cw-0123abcd-4567-89ef-0123-456789abcdef');
  assert.equal(configDir, path.join(dataDir, 'cowork-runtime', 'sessions', 'cw-0123abcd-4567-89ef-0123-456789abcdef', '.claude'));
  assert.deepEqual(await readRewindTranscript({ configDir, cliSessionId: undefined, targetUuid: 'u1' }), { chain: null, targetText: null });
  assert.deepEqual(await readRewindTranscript({ configDir, cliSessionId: 'sdk-1', targetUuid: 'u1' }), { chain: [], targetText: null });
  const dir = path.join(configDir, 'projects', '-sessions-cw-x-mnt-work');
  await fsp.mkdir(dir, { recursive: true });
  const text = conversation().map(record => JSON.stringify(record)).join('\n') + '\nnot json\n'
    + JSON.stringify({ type: 'system', subtype: 'compact_boundary', uuid: 'cb', parentUuid: null, compactMetadata: { preservedSegment: { headUuid: 'u3', tailUuid: 'a3', anchorUuid: 'cb' }, other: 1 } }) + '\n';
  await fsp.writeFile(path.join(dir, 'sdk-1.jsonl'), text);
  assert.equal(await findTranscript(configDir, 'sdk-1'), path.join(dir, 'sdk-1.jsonl'));
  assert.equal(await findTranscript(configDir, '../sdk-1'), null);
  const read = await readRewindTranscript({ configDir, cliSessionId: 'sdk-1', targetUuid: 'u2' });
  assert.equal(read.targetText, 'Second');
  assert.equal(read.chain.length, 9);
  assert.deepEqual(read.chain[8], { type: 'system', subtype: 'compact_boundary', uuid: 'cb', parentUuid: null, parent_tool_use_id: undefined, isSidechain: undefined,
    timestamp: undefined, compactMetadata: { preservedMessages: undefined, preservedSegment: { anchorUuid: 'cb', headUuid: 'u3', tailUuid: 'a3' } } });
  assert.equal('message' in read.chain[0], false, 'raw chain entries carry no content');
  const tail = await readRewindTranscript({ configDir, cliSessionId: 'sdk-1', targetUuid: 'u3', tailBytes: Buffer.byteLength(text) - 10 });
  assert.equal(tail.chain[0].uuid, 'a1', 'the leading partial line is dropped');
  await fsp.mkdir(path.join(configDir, 'projects', 'linked'), { recursive: true });
  await fsp.symlink(path.join(dir, 'sdk-1.jsonl'), path.join(configDir, 'projects', 'linked', 'sdk-2.jsonl'));
  assert.equal(await findTranscript(configDir, 'sdk-2'), null, 'a symlinked transcript is not followed');
  assert.deepEqual(parseTranscript('', 'x'), { chain: [], targetText: null });
});
