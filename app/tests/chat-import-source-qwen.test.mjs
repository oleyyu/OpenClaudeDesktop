// Qwen Code source parser (electron/chat-import/sources/qwen.mjs) against sessions synthesised here in the shapes Qwen
// Code's writer produces (QwenLM/qwen-code core: chatRecordingService.ts ChatRecord / createBaseRecord / recordUserMessage
// / recordAssistantTurn / createToolResultRecord / createNotificationRecord / recordChatCompression / persistCustomTitle,
// agents/agent-transcript.ts sub-agent transcripts, core/logger.ts checkpoints). No real logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as qwen from '../electron/chat-import/sources/qwen.mjs';
import { qwenImportSession } from '../../harness/packages/acp-bridge/src/agents/qwen.js';

const SID = '6f1c2d3e-4a5b-4c6d-8e7f-901234567890';
const ARCHIVED = '7a1c2d3e-4a5b-4c6d-8e7f-901234567891';
const MANAGED = '8b1c2d3e-4a5b-4c6d-8e7f-901234567892';
const CWD = '/Users/dev/work/my-app';
const project = cwd => cwd.replace(/[^a-zA-Z0-9]/g, '-');
const iso = n => new Date(Date.UTC(2026, 9, 1, 12, 0, n)).toISOString();
const jsonl = records => records.map(record => `${JSON.stringify(record)}\n`).join('');
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text).join(''));

/** createBaseRecord's fields. */
function chain(sessionId, cwd = CWD) {
  let last = null, n = 0;
  return (type, fields = {}, { parent } = {}) => {
    const uuid = fields.uuid ?? `${sessionId.slice(0, 4)}-${++n}`;
    const record = { uuid, parentUuid: parent !== undefined ? parent : last, sessionId, timestamp: iso(n), type,
      provenance: type === 'user' ? 'real_user' : type === 'assistant' ? 'assistant_output' : type === 'tool_result' ? 'tool_result' : 'system',
      cwd, version: '0.24.7', gitBranch: 'main', ...fields };
    last = uuid;
    return record;
  };
}

function buildHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-src-'));
  const chats = path.join(home, '.qwen', 'projects', project(CWD), 'chats');
  const r = chain(SID);
  const records = [
    r('user', { executionContext: { modelId: 'qwen3-coder-plus', authType: 'openai', approvalMode: 'default' }, message: { role: 'user', parts: [{ text: 'Fix @src/a.ts please\n--- src/a.ts ---\nexpanded file' }, { text: '<qwen:user-prompt-submit-context>\nhook says hi\n</qwen:user-prompt-submit-context>' }] }, systemPayload: { displayText: 'Fix @src/a.ts please', hookContext: 'hook says hi' }, promptId: 'p1' }),
    r('assistant', { model: 'qwen3-coder-plus', message: { role: 'model', parts: [{ text: 'thinking about it', thought: true }, { text: 'Reading the file.' }, { functionCall: { id: 'call_1', name: 'read_file', args: { absolute_path: '/x/a.ts' } } }] } }),
    r('tool_result', { message: { role: 'user', parts: [{ functionResponse: { id: 'call_1', name: 'read_file', response: { error: 'ENOENT' } } }] }, toolCallResult: { callId: 'call_1', status: 'error', error: { message: 'ENOENT' } } }),
    r('tool_result', { subtype: 'code_mode_tool_result', message: { role: 'user', parts: [{ functionResponse: { id: 'internal', name: 'x', response: { output: 'internal' } } }] } }),
    r('system', { subtype: 'custom_title', systemPayload: { customTitle: 'First title', titleSource: 'auto' } }),
    r('user', { subtype: 'notification', provenance: 'system', message: { role: 'user', parts: [{ text: '<task-notification>done</task-notification>' }] }, systemPayload: { displayText: 'Background agent finished' } }),
    r('user', { subtype: 'mid_turn_user_message', message: { role: 'user', parts: [{ text: 'also check b.ts' }] }, systemPayload: { displayText: 'also check b.ts' } }),
    r('system', { subtype: 'chat_compression', systemPayload: { info: {}, compressedHistory: [{ role: 'user', parts: [{ text: '<state_snapshot>summary of work</state_snapshot>' }] }, { role: 'model', parts: [{ text: 'Got it. Thanks for the additional context!' }] }], summaryPrefixLength: 2 } }),
  ];
  const fork = records.at(-1).uuid;
  records.push(r('user', { message: { role: 'user', parts: [{ text: 'Abandoned branch' }] } }));
  records.push(r('assistant', { model: 'qwen3-coder-plus', message: { role: 'model', parts: [{ text: 'abandoned reply' }] } }));
  // A rewind: the new prompt hangs off the compression record.
  records.push(r('user', { message: { role: 'user', parts: [{ text: 'Second prompt' }] } }, { parent: fork }));
  // One reply in two fragments sharing a uuid (aggregateTranscriptRecordFragments).
  const reply = r('assistant', { model: 'qwen-max', message: { role: 'model', parts: [{ text: 'Part one. ' }] } });
  records.push(reply, { ...reply, timestamp: iso(40), message: { role: 'model', parts: [{ text: 'Part two.' }] } });
  records.push(r('system', { subtype: 'custom_title', systemPayload: { customTitle: 'Renamed session', titleSource: 'manual' } }));
  // Non-conversation records after the leaf (transcript-records.ts NON_CONVERSATION_RECORD_SUBTYPES).
  records.push(r('system', { subtype: 'session_sources_snapshot', systemPayload: {} }, { parent: null }));
  write(path.join(chats, `${SID}.jsonl`), jsonl(records) + '{"uuid":"partial');

  const a = chain(ARCHIVED);
  write(path.join(chats, 'archive', `${ARCHIVED}.jsonl`), jsonl([a('user', { message: { role: 'user', parts: [{ text: 'Archived prompt' }] } }), a('assistant', { message: { role: 'model', parts: [{ text: 'ok' }] } })]));

  const m = chain(MANAGED);
  write(path.join(chats, `${MANAGED}.jsonl`), jsonl([m('system', { subtype: 'session_execution_engine', systemPayload: { engine: 'managed' } }), m('user', { message: { role: 'user', parts: [{ text: 'Managed prompt' }] } })]));

  // A background sub-agent of SID (agent-transcript.ts baseFields: sessionId = the parent's, isSidechain).
  const agentDir = path.join(home, '.qwen', 'projects', project(CWD), 'subagents', SID);
  const s = chain(SID);
  write(path.join(agentDir, 'agent-explore-7f3c.jsonl'), jsonl([
    s('user', { agentId: 'explore-7f3c', agentName: 'Explore', isSidechain: true, message: { role: 'user', parts: [{ text: 'Find the config' }] } }),
    s('assistant', { agentId: 'explore-7f3c', isSidechain: true, model: 'qwen-flash', message: { role: 'model', parts: [{ text: 'Found it.' }] } }),
  ]));
  write(path.join(agentDir, 'agent-explore-7f3c.meta.json'), JSON.stringify({ agentId: 'explore-7f3c', agentType: 'Explore', description: 'Look for config', parentSessionId: SID, parentAgentId: null, createdAt: iso(5) }));

  // A legacy /chat save checkpoint (logger.ts saveCheckpoint: Content[] at tmp/<sha256(cwd)>/checkpoint-<encoded tag>.json).
  const hash = createHash('sha256').update(CWD).digest('hex');
  write(path.join(home, '.qwen', 'tmp', hash, 'checkpoint-my%20tag.json'), JSON.stringify([
    { role: 'user', parts: [{ text: 'Old prompt' }] },
    { role: 'model', parts: [{ text: 'Old answer' }, { functionCall: { id: 'c', name: 'glob', args: { pattern: '*' } } }] },
    { role: 'user', parts: [{ functionResponse: { id: 'c', name: 'glob', response: { output: 'a.ts' } } }] },
  ], null, 2));
  write(path.join(home, '.qwen', 'tmp', hash, 'logs.json'), '[]');
  return { home, env: {}, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

const fixture = buildHome();
test.after(() => fixture.cleanup());
const ctx = (extra = {}) => ({ home: fixture.home, env: fixture.env, cache: new Map(), ...extra });

test('qwen list: chats and chats/archive, last custom_title, managed sessions skipped, checkpoints with their cwd', async () => {
  const sessions = await qwen.list(ctx());
  const byId = new Map(sessions.map(session => [session.sourceId, session]));
  assert.deepEqual([...byId.keys()].sort(), [SID, ARCHIVED, `tmp/${createHash('sha256').update(CWD).digest('hex')}/my%20tag`].sort());
  const main = byId.get(SID);
  assert.deepEqual([main.title, main.firstPrompt, main.cwd, main.gitBranch, main.model, main.archived, main.isSubagent], ['Renamed session', 'Fix @src/a.ts please', CWD, 'main', 'qwen-max', false, false]);
  assert.equal(main.createdAt, Date.parse(iso(1)));
  assert.equal(main.messageCount, 5, 'three prompts (the steer counts) and two replies on the current branch');
  assert.equal(byId.get(ARCHIVED).archived, true);
  const checkpoint = [...byId.values()].find(session => session.sourceId.startsWith('tmp/'));
  assert.deepEqual([checkpoint.title, checkpoint.cwd, checkpoint.fidelity, checkpoint.firstPrompt], ['my tag', CWD, 'partial', 'Old prompt']);
  assert.equal(sessions.some(session => session.isSubagent), false, 'sub-agents only with includeSubagents');
});

test('qwen read: the current branch, display text over the expanded prompt, fragments joined, compaction summary', async () => {
  const session = await qwen.read(`qwen:${SID}`, ctx());
  assert.deepEqual(kinds(session), ['injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'injected', 'user', 'compaction', 'user', 'assistant']);
  assert.deepEqual(texts(session, 'user'), ['Fix @src/a.ts please', 'also check b.ts', 'Second prompt'], 'the abandoned branch is gone');
  assert.deepEqual(texts(session, 'assistant'), ['Reading the file.', 'Part one. Part two.']);
  const [expanded, notification] = session.items.filter(item => item.kind === 'injected');
  assert.match(expanded.parts.map(part => part.text).join('\n'), /expanded file[\s\S]*qwen:user-prompt-submit-context/);
  assert.equal(notification.parts[0].text, 'Background agent finished');
  const call = session.items.find(item => item.kind === 'tool_call');
  assert.deepEqual([call.tool.callId, call.tool.name, call.tool.args.absolute_path], ['call_1', 'read_file', '/x/a.ts']);
  const result = session.items.find(item => item.kind === 'tool_result');
  assert.deepEqual([result.result.callId, result.result.text, result.result.isError], ['call_1', 'ENOENT', true]);
  assert.equal(session.items.find(item => item.kind === 'compaction').compaction.summary, '<state_snapshot>summary of work</state_snapshot>');
  assert.ok(session.items.every((item, index) => item.seq === index));
});

test('qwen sub-agents: listed with includeSubagents, keyed <parent>/agent-<id>, read with their sidechain records', async () => {
  const sessions = await qwen.list(ctx({ includeSubagents: true }));
  const agent = sessions.find(session => session.isSubagent);
  assert.deepEqual([agent.sourceId, agent.parentId, agent.title, agent.firstPrompt, agent.model], [`${SID}/agent-explore-7f3c`, SID, 'Look for config', 'Find the config', 'qwen-flash']);
  assert.equal(sessions.filter(session => session.sourceId === SID).length, 1, 'the parent keeps its own key');
  const read = await qwen.read(agent.key, ctx());
  assert.deepEqual(texts(read, 'assistant'), ['Found it.']);
});

test('qwen checkpoint read: the Content[] as items', async () => {
  const [checkpoint] = (await qwen.list(ctx())).filter(session => session.sourceId.startsWith('tmp/'));
  const session = await qwen.read(checkpoint.key, ctx());
  assert.deepEqual(kinds(session), ['user', 'assistant', 'tool_call', 'tool_result']);
});

test('qwen roots: QWEN_RUNTIME_DIR and QWEN_HOME; settings advanced.runtimeOutputDir is scanned too', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-rt-'));
  try {
    const runtime = path.join(home, 'runtime');
    const r = chain(SID, '/w');
    write(path.join(runtime, 'projects', '-w', 'chats', `${SID}.jsonl`), jsonl([r('user', { message: { role: 'user', parts: [{ text: 'From runtime dir' }] } })]));
    assert.deepEqual(qwen.roots({ home, env: { QWEN_RUNTIME_DIR: runtime } }), [path.join(runtime, 'projects'), path.join(home, '.qwen', 'projects')]);
    assert.equal((await qwen.list({ home, env: { QWEN_RUNTIME_DIR: runtime } }))[0].firstPrompt, 'From runtime dir');
    assert.deepEqual(await qwen.list({ home, env: {} }), []);
    write(path.join(home, '.qwen', 'settings.json'), JSON.stringify({ advanced: { runtimeOutputDir: '~/runtime' } }));
    assert.equal((await qwen.list({ home, env: {} })).length, 1);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('qwen round trip: a session written by the bridge hook (agents/qwen.js qwenImportSession) reads back', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-rt-'));
  try {
    const cwd = path.join(home, 'proj');
    qwenImportSession({ cwd, title: 'Imported from Codex', home, env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') },
      messages: [{ role: 'user', text: 'Hello' }, { role: 'assistant', text: 'Hi' }, { role: 'user', text: 'Continue' }] });
    const [summary] = await qwen.list({ home, env: {} });
    assert.deepEqual([summary.title, summary.firstPrompt, summary.cwd, summary.messageCount], ['Imported from Codex', 'Hello', cwd, 3]);
    assert.deepEqual(kinds(await qwen.read(summary, { home, env: {} })), ['user', 'assistant', 'user']);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
