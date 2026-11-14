// Import Chat History, Kimi source (electron/chat-import/sources/kimi.mjs). Fixtures are synthesised here in the shapes
// Kimi Code writes (github.com/MoonshotAI/kimi-code, read only): state.json per sessionMetadata.ts / imported-session.ts,
// agents/<agent>/wire.jsonl records per wire/record.ts, contextEvents.ts and loopEventFold.ts, buckets per
// workdir-slug.ts encodeWorkDirKey; the legacy kimi-cli layout as migration-legacy reads it (sessions/source.ts,
// translator.ts, kimi-cli-schema.ts, subagents.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as kimi from '../electron/chat-import/sources/kimi.mjs';

const T0 = Date.UTC(2026, 9, 30, 8, 0, 0);
const jsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + '\n';
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const wd = cwd => {
  const normalized = cwd.replace(/\/+$/, '');
  const slug = (normalized.split('/').pop() || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace';
  return `wd_${slug}_${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
};
const md5 = text => crypto.createHash('md5').update(text).digest('hex');
const kinds = session => session.items.map(item => item.kind);

const meta = { type: 'metadata', protocol_version: '1.5', created_at: T0 };
const at = minute => T0 + minute * 60000;
const msg = (minute, message) => ({ type: 'context.append_message', agentId: 'main', message: { toolCalls: [], ...message }, time: at(minute) });
const loop = (minute, event) => ({ type: 'context.append_loop_event', agentId: 'main', event, time: at(minute) });

function codeSession(home, { cwd, id, state = {}, main, agents = {} }) {
  const dir = path.join(home, '.kimi-code', 'sessions', wd(cwd), id);
  write(path.join(dir, 'state.json'), JSON.stringify({ id, version: 2, cwd, title: 'A title', titleKind: 'generated', isCustomTitle: false, lastPrompt: 'last', createdAt: at(0), updatedAt: at(9), archived: false,
    agents: { main: { homedir: path.join(dir, 'agents', 'main'), type: 'main', parentAgentId: null }, ...Object.fromEntries(Object.keys(agents).map(agent => [agent, { homedir: path.join(dir, 'agents', agent), type: 'sub', parentAgentId: 'main', labels: { parentAgentId: 'main' } }])) }, ...state }, null, 2));
  write(path.join(dir, 'agents', 'main', 'wire.jsonl'), jsonl(main));
  for (const [agent, rows] of Object.entries(agents)) write(path.join(dir, 'agents', agent, 'wire.jsonl'), jsonl(rows));
  return dir;
}

function buildHome() {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ich-kimi-')));
  // A native session: injected context, a streamed step with thinking + a tool call whose result arrives after a
  // reminder (deferred), an interrupted vacuous step, a compaction, an undone prompt, the model from usage.record.
  codeSession(home, {
    cwd: '/work/kimi-code', id: 'session_11111111-1111-4111-8111-111111111111', state: { title: 'Fix the parser' },
    main: [
      meta,
      { type: 'profile.bind', agentId: 'main', modelAlias: 'kimi-code/kimi-for-coding', thinkingEffort: 'high', systemPrompt: 'sys', disallowedTools: [], time: at(0) },
      msg(0, { role: 'user', content: [{ type: 'text', text: '<system-reminder>project context</system-reminder>' }], origin: { kind: 'injection', variant: 'project_context' } }),
      { type: 'turn.prompt', agentId: 'main', input: [{ type: 'text', text: 'Please list files' }], origin: { kind: 'user' }, time: at(1) },
      msg(1, { role: 'user', content: [{ type: 'text', text: 'Please list files' }, { type: 'image_url', imageUrl: { url: 'blobref:abc' } }], origin: { kind: 'user' } }),
      loop(1, { type: 'step.begin', uuid: 's1', turnId: '0', step: 1 }),
      loop(1, { type: 'content.part', stepUuid: 's1', part: { type: 'think', think: 'Let me look', encrypted: 'SIG' } }),
      loop(1, { type: 'content.part', stepUuid: 's1', part: { type: 'text', text: 'Listing.' } }),
      loop(1, { type: 'content.part', stepUuid: 'other', part: { type: 'text', text: 'not this step' } }),
      loop(1, { type: 'tool.call', stepUuid: 's1', toolCallId: 'tc1', name: 'Bash', args: { command: 'ls' } }),
      msg(1, { role: 'user', content: [{ type: 'text', text: 'deferred reminder' }], origin: { kind: 'injection', variant: 'x' } }),
      loop(2, { type: 'tool.result', toolCallId: 'tc1', result: { output: 'a\nb', isError: false } }),
      loop(2, { type: 'tool.result', toolCallId: 'unknown', result: { output: 'ignored' } }),
      loop(2, { type: 'step.end', uuid: 's1', finishReason: 'tool_calls' }),
      loop(2, { type: 'step.begin', uuid: 's2' }),
      loop(2, { type: 'content.part', stepUuid: 's2', part: { type: 'text', text: '   ' } }),
      loop(2, { type: 'step.end', uuid: 's2', finishReason: 'interrupted' }),
      loop(3, { type: 'step.begin', uuid: 's3' }),
      loop(3, { type: 'content.part', stepUuid: 's3', part: { type: 'text', text: 'Done: a, b.' } }),
      loop(3, { type: 'step.end', uuid: 's3', finishReason: 'stop' }),
      { type: 'usage.record', agentId: 'main', model: 'kimi-for-coding', usage: {}, time: at(3) },
      { type: 'turn.ended', agentId: 'main', turnId: 0, reason: 'completed', time: at(3) },
      { type: 'context.apply_compaction', agentId: 'main', summary: 'We listed files.', compactedCount: 6, time: at(4) },
      msg(5, { role: 'user', content: [{ type: 'text', text: 'Undone prompt' }], origin: { kind: 'user' } }),
      loop(5, { type: 'step.begin', uuid: 's4' }),
      loop(5, { type: 'content.part', stepUuid: 's4', part: { type: 'text', text: 'Undone answer' } }),
      loop(5, { type: 'step.end', uuid: 's4' }),
      { type: 'context.undo', agentId: 'main', count: 1, time: at(6) },
      msg(7, { role: 'user', content: [{ type: 'text', text: 'Next question' }] }),
      // A 1.0-shaped assistant message (as migrated / imported journals carry before the engine rewrites them).
      msg(7, { role: 'assistant', content: [{ type: 'text', text: 'Answer two' }], toolCalls: [{ type: 'function', id: 'm1', function: { name: 'mcp__srv__look', arguments: '{"q":1}' } }] }),
      msg(7, { role: 'tool', content: [{ type: 'text', text: 'looked' }], toolCallId: 'm1' }),
      { type: 'usage.record', agentId: 'main', model: 'kimi-k2', usage: {}, time: at(7) },
      '{"type":"context.append_message","message":{"role":"user","content":[{"type":"text","text":"partial',
    ],
    agents: { 'agent-0': [meta, { type: 'turn.prompt', agentId: 'agent-0', input: [{ type: 'text', text: 'Sub task' }], origin: { kind: 'task' }, time: at(2) },
      msg(2, { role: 'user', content: [{ type: 'text', text: 'Sub task' }], origin: { kind: 'user' } }), loop(2, { type: 'step.begin', uuid: 'x' }), loop(2, { type: 'content.part', stepUuid: 'x', part: { type: 'text', text: 'Sub done' } }), loop(2, { type: 'step.end', uuid: 'x' })] },
  });
  // A cleared session whose state says archived; a child session; a migrated kimi-cli session.
  codeSession(home, {
    cwd: '/work/kimi-code', id: 'session_22222222-2222-4222-8222-222222222222', state: { archived: true, title: '', lastPrompt: 'After clear' },
    main: [meta, msg(0, { role: 'user', content: [{ type: 'text', text: 'Before clear' }] }), { type: 'context.clear', agentId: 'main', time: at(1) },
      msg(2, { role: 'user', content: [{ type: 'text', text: 'After clear' }], origin: { kind: 'user' } }),
      msg(2, { role: 'user', content: [{ type: 'text', text: 'Summary text' }], origin: { kind: 'compaction_summary' } })],
  });
  codeSession(home, { cwd: '/work/other', id: 'session_child', state: { custom: { parent_session_id: 'session_11111111-1111-4111-8111-111111111111', child_session_kind: 'child' } }, main: [meta, msg(0, { role: 'user', content: [{ type: 'text', text: 'Child prompt' }] })] });
  codeSession(home, { cwd: '/work/legacy', id: 'ses_legacy-migrated', state: { custom: { imported_from_kimi_cli: true, kimi_cli_session_id: 'legacy-migrated' } }, main: [meta, msg(0, { role: 'user', content: [{ type: 'text', text: 'Migrated prompt' }] })] });
  // Not sessions: index folders, a folder whose state.json names another id, a session without a journal.
  write(path.join(home, '.kimi-code', 'sessions', '.index-cache', 'scan.json'), '{}');
  codeSession(home, { cwd: '/work/x', id: 'session_mismatch', state: { id: 'session_else' }, main: [meta, msg(0, { role: 'user', content: [{ type: 'text', text: 'x' }] })] });
  write(path.join(home, '.kimi-code', 'sessions', wd('/work/x'), 'session_nojournal', 'state.json'), '{"id":"session_nojournal"}');

  // Legacy kimi-cli: a session folder (with a sub-agent and a metadata.json title), a flat <uuid>.jsonl, a migrated one.
  write(path.join(home, '.kimi', 'kimi.json'), JSON.stringify({ work_dirs: [{ path: '/work/legacy', kaos: 'local', last_session_id: null }] }));
  const bucket = path.join(home, '.kimi', 'sessions', md5('/work/legacy'));
  write(path.join(bucket, 'legacy-dir', 'context.jsonl'), jsonl([
    { role: '_system_prompt', content: 'sys' }, { role: '_checkpoint', id: 0 },
    { role: 'user', content: 'Legacy prompt' },
    { role: 'assistant', content: [{ type: 'think', think: '', encrypted: 'ENC' }, { type: 'text', text: 'Legacy answer' }, { type: 'image', url: 'https://example.invalid/a.png' }], tool_calls: [{ type: 'function', id: 'l1', function: { name: 'Shell', arguments: '{"command":"pwd"}' } }] },
    { role: 'tool', tool_call_id: 'l1', content: '/work/legacy' }, { role: '_usage', token_count: 5 },
  ]));
  write(path.join(bucket, 'legacy-dir', 'metadata.json'), JSON.stringify({ session_id: 'legacy-dir', title: 'Legacy title', wire_mtime: at(30) / 1000 }));
  write(path.join(bucket, 'legacy-dir', 'subagents', 'a1', 'meta.json'), JSON.stringify({ agent_id: 'a1', subagent_type: 'coder', description: 'Legacy sub', created_at: at(1) / 1000 }));
  write(path.join(bucket, 'legacy-dir', 'subagents', 'a1', 'context.jsonl'), jsonl([{ role: 'user', content: 'Legacy sub prompt' }, { role: 'assistant', content: 'ok' }]));
  write(path.join(bucket, 'legacy-flat.jsonl'), jsonl([{ role: 'user', content: 'Flat prompt' }]));
  write(path.join(bucket, 'legacy-migrated', 'context.jsonl'), jsonl([{ role: 'user', content: 'Migrated prompt' }]));
  return { home, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

let fixture;
test.before(() => { fixture = buildHome(); });
test.after(() => fixture.cleanup());
const ctx = (extra = {}) => ({ home: fixture.home, env: {}, cache: new Map(), ...extra });

test('kimi list: Kimi Code state.json + main journal, legacy kimi-cli, migrated sessions once, sub-agents only on request', async () => {
  assert.equal(kimi.experimental, false);
  assert.deepEqual(kimi.roots(ctx()), [path.join(fixture.home, '.kimi-code', 'sessions'), path.join(fixture.home, '.kimi', 'sessions')]);
  const listed = await kimi.list(ctx());
  const ids = listed.map(summary => summary.sourceId).sort();
  assert.deepEqual(ids, ['legacy-dir', 'legacy-flat', 'ses_legacy-migrated', 'session_11111111-1111-4111-8111-111111111111', 'session_22222222-2222-4222-8222-222222222222'].sort(),
    'no child session, sub-agent, mismatched state, journal-less folder or already-migrated legacy session');
  const main = listed.find(summary => summary.sourceId.startsWith('session_1'));
  assert.deepEqual([main.title, main.firstPrompt, main.cwd, main.model, main.createdAt, main.updatedAt, main.archived, main.experimental, main.isSubagent],
    ['Fix the parser', 'Please list files', '/work/kimi-code', 'kimi-k2', at(0), at(9), false, false, false]);
  const cleared = listed.find(summary => summary.sourceId.startsWith('session_2'));
  assert.deepEqual([cleared.title, cleared.firstPrompt, cleared.archived], ['', 'Before clear', true]);
  const legacy = listed.find(summary => summary.sourceId === 'legacy-dir');
  assert.deepEqual([legacy.title, legacy.firstPrompt, legacy.cwd, legacy.experimental, legacy.updatedAt, legacy.messageCount], ['Legacy title', 'Legacy prompt', '/work/legacy', true, at(30), 2]);

  const all = await kimi.list(ctx({ includeSubagents: true }));
  const sub = all.find(summary => summary.sourceId === 'session_11111111-1111-4111-8111-111111111111/agent-0');
  assert.deepEqual([sub.isSubagent, sub.parentId, sub.firstPrompt, sub.cwd], [true, 'session_11111111-1111-4111-8111-111111111111', 'Sub task', '/work/kimi-code']);
  assert.equal(all.find(summary => summary.sourceId === 'session_child').parentId, 'session_11111111-1111-4111-8111-111111111111');
  assert.equal(all.find(summary => summary.sourceId === 'legacy-dir/a1').title, 'Legacy sub');

  const excluded = await kimi.list(ctx({ exclude: [path.join(fixture.home, '.kimi-code')] }));
  assert.ok(excluded.every(summary => summary.experimental), 'an excluded home is never read (only legacy left)');
});

test('kimi read: the contextMemory fold (streamed steps, deferred messages, vacuous steps, compaction, undo, clear)', async () => {
  const session = await kimi.read('kimi:session_11111111-1111-4111-8111-111111111111', ctx());
  assert.deepEqual(kinds(session), ['injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'injected', 'assistant', 'compaction', 'user', 'assistant', 'tool_call', 'tool_result']);
  const [, user, reasoning, assistant, call, result, deferred, done, compaction] = session.items;
  assert.deepEqual(user.parts, [{ text: 'Please list files' }, { text: '[image]' }], 'a blob reference is a placeholder');
  assert.deepEqual(reasoning.reasoning, { text: 'Let me look', opaque: { vendor: 'kimi-code', model: null, payload: 'SIG' } });
  assert.deepEqual(assistant.parts, [{ text: 'Listing.' }], 'parts of another step are not this message\'s');
  assert.deepEqual([call.tool.name, call.tool.args, call.tool.category], ['Bash', { command: 'ls' }, 'shell']);
  assert.deepEqual([result.result.callId, result.result.text, result.result.isError], ['tc1', 'a\nb', false]);
  assert.equal(deferred.parts[0].text, 'deferred reminder', 'a message appended while the call was pending lands after its result');
  assert.equal(done.parts[0].text, 'Done: a, b.', 'the interrupted vacuous step left nothing');
  assert.equal(compaction.compaction.summary, 'We listed files.');
  assert.ok(!session.items.some(item => item.parts.some(part => /Undone/.test(part.text ?? ''))), 'the undone prompt and its answer are gone');
  const mcp = session.items[11];
  assert.deepEqual([mcp.tool.name, mcp.tool.category, mcp.tool.mcp, mcp.tool.args], ['mcp__srv__look', 'mcp', { server: 'srv', tool: 'look' }, { q: 1 }], 'a 1.0 tool call');
  assert.equal(session.items.at(-1).result.text, 'looked');
  assert.equal(session.messageCount, 5);
  assert.equal(user.ts, at(1));

  const cleared = await kimi.read('kimi:session_22222222-2222-4222-8222-222222222222', ctx());
  assert.deepEqual(kinds(cleared), ['user', 'compaction'], 'context.clear drops what came before');
  assert.equal(cleared.items[0].parts[0].text, 'After clear');

  const sub = await kimi.read('kimi:session_11111111-1111-4111-8111-111111111111/agent-0', ctx());
  assert.deepEqual(kinds(sub), ['user', 'assistant']);
  await assert.rejects(kimi.read('kimi:session_missing', ctx()), /not found/);
});

test('kimi read: legacy kimi-cli rows (bookkeeping roles dropped, opaque think, images, sub-agents)', async () => {
  const session = await kimi.read('kimi:legacy-dir', ctx());
  assert.deepEqual(kinds(session), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result']);
  assert.deepEqual(session.items[1].reasoning, { opaque: { vendor: 'kimi', model: null, payload: 'ENC' } });
  assert.deepEqual(session.items[2].parts, [{ text: 'Legacy answer' }, { image: { mime: 'image/*', url: 'https://example.invalid/a.png' } }]);
  assert.equal(session.items[3].tool.category, 'shell');
  assert.deepEqual(kinds(await kimi.read('kimi:legacy-flat', ctx())), ['user']);
  assert.deepEqual(kinds(await kimi.read('kimi:legacy-dir/a1', ctx())), ['user', 'assistant']);
});

test('kimi: KIMI_CODE_HOME and KIMI_SHARE_DIR relocate the stores; damage never throws', async () => {
  const moved = { home: path.join(fixture.home, 'nowhere'), env: { KIMI_CODE_HOME: path.join(fixture.home, '.kimi-code'), KIMI_SHARE_DIR: path.join(fixture.home, '.kimi') }, cache: new Map() };
  assert.equal((await kimi.list(moved)).length, 5);
  assert.deepEqual(await kimi.list({ home: path.join(fixture.home, 'missing'), env: {}, cache: new Map() }), []);
  const broken = buildHome();
  try {
    const dir = path.join(broken.home, '.kimi-code', 'sessions', wd('/work/kimi-code'), 'session_11111111-1111-4111-8111-111111111111');
    fs.writeFileSync(path.join(dir, 'state.json'), '{broken');
    fs.writeFileSync(path.join(broken.home, '.kimi', 'kimi.json'), '[[');
    const listed = await kimi.list({ home: broken.home, env: {}, cache: new Map() });
    assert.ok(!listed.some(summary => summary.sourceId.startsWith('session_1')), 'an unreadable state.json is no session');
    assert.equal(listed.find(summary => summary.sourceId === 'legacy-dir').cwd, null, 'an unreadable kimi.json only loses the cwd');
  } finally { broken.cleanup(); }
});

test('kimi foldWire is pure and tolerates junk records', () => {
  const { messages, model } = kimi.foldWire([null, 'x', { type: 1 }, { type: 'context.append_message', message: { role: 'user', content: 'not an array' } }, { type: 'context.undo', count: 'x' }, { type: 'usage.record', model: 'm' }]);
  assert.equal(model, 'm');
  assert.equal(messages.length, 1);
  assert.deepEqual(kimi.wireItems(messages), [], 'a message without parts adds no item');
});
