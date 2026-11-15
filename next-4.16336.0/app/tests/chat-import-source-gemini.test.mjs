// Gemini CLI source (electron/chat-import/sources/gemini.mjs) against session files in the shapes Gemini CLI's
// ChatRecordingService writes (upstream packages/core/src/services/chatRecordingService.ts; installed 0.64.0 bundle
// alike): synthesised here in a temp home, no real logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as gemini from '../electron/chat-import/sources/gemini.mjs';

const iso = minutes => new Date(Date.UTC(2026, 9, 20, 9, minutes)).toISOString();
const jsonl = records => records.map(record => JSON.stringify(record)).join('\n') + '\n';
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text ?? '').join(''));

const MAIN = '1a2b3c4d-0000-4000-8000-000000000001';
const LEGACY = '5e6f7a8b-0000-4000-8000-000000000002';
const SUB = '9c0d1e2f-0000-4000-8000-000000000003';
const CACHED = 'abcdef01-0000-4000-8000-000000000004';
const CLEARED = 'fedcba98-0000-4000-8000-000000000005';

function buildHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-gemini-'));
  const runtime = path.join(home, '.gemini');
  // A slug folder owned through its .project_root marker (ProjectRegistry ensureOwnershipMarkers).
  write(path.join(runtime, 'tmp', 'proj', '.project_root'), '/work/proj');
  // One named only in projects.json (its marker is missing: Gemini heals it on the next run).
  write(path.join(runtime, 'projects.json'), JSON.stringify({ projects: { '/work/proj': 'proj', '/work/legacy': 'legacy' } }, null, 2));
  const chats = path.join(runtime, 'tmp', 'proj', 'chats');
  // The modern session: metadata line, context turn, prompts, a model turn synced to its full parts, the tool
  // response as a synthetic user turn, $patch edits, a $set title, a notice and a cut last line.
  write(path.join(chats, `session-2026-10-20T09-00-${MAIN.slice(0, 8)}.jsonl`), jsonl([
    { sessionId: MAIN, projectHash: 'f'.repeat(64), startTime: iso(0), lastUpdated: iso(0), kind: 'main' },
    { id: 'ctx', timestamp: iso(0), type: 'user', content: [{ text: '<session_context>\nfolder tree\n</session_context>' }] },
    { $set: { lastUpdated: iso(1) } },
    { id: 'u1', timestamp: iso(1), type: 'user', content: [{ text: 'Explain @a.ts\n--- a.ts ---\ncode' }], displayContent: [{ text: 'Explain @a.ts' }] },
    { id: 'g1', timestamp: iso(2), type: 'gemini', content: 'Reading it.', thoughts: [{ subject: 'Plan', description: 'read the file', timestamp: iso(2) }], tokens: null, model: 'gemini-3-pro' },
    { id: 'g1', timestamp: iso(2), type: 'gemini', content: 'Reading it.', thoughts: [{ subject: 'Plan', description: 'read the file', timestamp: iso(2) }], tokens: null, model: 'gemini-3-pro',
      toolCalls: [{ id: 'call-1', name: 'run_shell_command', args: { command: 'ls' }, status: 'success', timestamp: iso(2),
        result: [{ functionResponse: { id: 'call-1', name: 'run_shell_command', response: { output: 'a.ts' } } }], resultDisplay: 'a.ts' }] },
    { id: 'r1', timestamp: iso(2), type: 'user', content: [{ functionResponse: { id: 'call-1', name: 'run_shell_command', response: { output: 'a.ts' } } }] },
    // updateMessagesFromHistory: the model turn's full parts (thought, text, a call only in the content).
    { $patch: { updates: [{ id: 'g1', content: [{ text: 'Thinking hard', thought: true, thoughtSignature: 'sig' }, { text: 'Reading it.' },
      { functionCall: { id: 'call-1', name: 'run_shell_command', args: { command: 'ls' } } },
      { functionCall: { id: 'call-2', name: 'mcp_docs_search', args: { q: 'x' } } }] }] } },
    { id: 'r2', timestamp: iso(3), type: 'user', content: [{ functionResponse: { id: 'call-2', name: 'mcp_docs_search', response: { error: 'offline' } } }] },
    { id: 'u2', timestamp: iso(3), type: 'user', content: [{ text: 'Dropped prompt' }] },
    { $patch: { removeIds: ['u2'] } },
    { id: 'g2', timestamp: iso(4), type: 'gemini', content: 'Final answer', thoughts: [], model: 'gemini-3-pro' },
    { id: 'u3', timestamp: iso(5), type: 'user', content: [{ text: 'Rewound prompt' }] },
    { $rewindTo: 'u3' },
    { id: 'n1', timestamp: iso(5), type: 'info', content: 'Binary content received' },
    { $set: { summary: 'Explaining a.ts', lastUpdated: iso(6) } },
  ]) + '{"id":"cut","type":"us');
  // The metadata-only copy a 0.64 session/load leaves (later lastUpdated): not resumable, so the session above wins.
  write(path.join(chats, `session-2026-10-21T08-00-${MAIN.slice(0, 8)}.jsonl`), jsonl([
    { sessionId: MAIN, projectHash: 'f'.repeat(64), startTime: iso(50), lastUpdated: iso(50), kind: 'main' },
    { $set: { sessionId: MAIN } },
  ]));
  // An older copy of the same session (duplicate ids: the later lastUpdated wins, cli sessionUtils getSessionFiles).
  write(path.join(chats, `session-2026-10-20T08-59-1-${MAIN.slice(0, 8)}.jsonl`), jsonl([
    { sessionId: MAIN, projectHash: 'f'.repeat(64), startTime: iso(0), lastUpdated: iso(0) },
    { id: 'old', timestamp: iso(0), type: 'user', content: 'Older copy' },
  ]));
  // orderIds moves the listed ids after the rest; an unknown $rewindTo id clears every message.
  write(path.join(chats, `session-2026-10-20T10-00-${CLEARED.slice(0, 8)}.jsonl`), jsonl([
    { sessionId: CLEARED, projectHash: 'h', startTime: iso(10), lastUpdated: iso(10) },
    { id: 'a', timestamp: iso(10), type: 'user', content: 'gone' },
    { $rewindTo: 'missing' },
    { id: 'b', timestamp: iso(11), type: 'gemini', content: 'second' },
    { id: 'c', timestamp: iso(11), type: 'user', content: 'first' },
    { $patch: { orderIds: ['b'] } },
  ]));
  // A legacy pretty-printed .json session (the whole file one ConversationRecord).
  write(path.join(runtime, 'tmp', 'legacy', 'chats', `session-2026-09-01T10-00-${LEGACY.slice(0, 8)}.json`), JSON.stringify({
    sessionId: LEGACY, projectHash: 'h', startTime: iso(0), lastUpdated: iso(1),
    messages: [{ id: 'l1', timestamp: iso(0), type: 'user', content: '/help' }, { id: 'l2', timestamp: iso(0), type: 'user', content: 'Legacy prompt' },
      { id: 'l3', timestamp: iso(1), type: 'gemini', content: 'Legacy answer', toolCalls: [{ id: 't', name: 'replace', args: {}, status: 'cancelled', result: null }] }],
  }, null, 2));
  // A sub-agent's chat, chats/<parentSessionId>/<sessionId>.jsonl, kind subagent.
  write(path.join(chats, MAIN, `${SUB}.jsonl`), jsonl([
    { sessionId: SUB, projectHash: 'h', startTime: iso(2), lastUpdated: iso(3), kind: 'subagent', directories: ['/work/proj'] },
    { id: 's1', timestamp: iso(2), type: 'user', content: [{ text: 'Sub task' }] },
    { id: 's2', timestamp: iso(3), type: 'gemini', content: 'Sub done' },
  ]));
  // Gemini's own Seatbelt sandbox keeps its runtime state in ~/.cache/.gemini (storage.ts getGlobalRuntimeDir).
  write(path.join(home, '.cache', '.gemini', 'tmp', 'boxed', '.project_root'), '/work/boxed');
  write(path.join(home, '.cache', '.gemini', 'tmp', 'boxed', 'chats', `session-2026-10-22T10-00-${CACHED.slice(0, 8)}.jsonl`), jsonl([
    { sessionId: CACHED, projectHash: 'h', startTime: iso(20), lastUpdated: iso(21), kind: 'main' },
    { id: 'x1', timestamp: iso(20), type: 'user', content: 'Boxed prompt' },
  ]));
  return { home, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

const fixture = buildHome();
test.after(() => fixture.cleanup());
const ctx = (extra = {}) => ({ home: fixture.home, env: { HOME: fixture.home }, cache: new Map(), ...extra });

test('gemini list: one entry per session id, metadata-only copies skipped, sub-agents hidden, both runtime dirs', async () => {
  const list = await gemini.list(ctx());
  const byId = new Map(list.map(summary => [summary.sourceId, summary]));
  assert.deepEqual([...byId.keys()].sort(), [MAIN, LEGACY, CACHED, CLEARED].sort());
  const main = byId.get(MAIN);
  assert.match(main.sourcePath, /session-2026-10-20T09-00-1a2b3c4d\.jsonl$/);
  assert.deepEqual([main.title, main.firstPrompt, main.cwd, main.model], ['Explaining a.ts', 'Explain @a.ts', '/work/proj', 'gemini-3-pro']);
  assert.equal(main.updatedAt, Date.parse(iso(6)));
  assert.equal(byId.get(LEGACY).cwd, '/work/legacy', 'projects.json names the folder when no marker does');
  assert.equal(byId.get(LEGACY).firstPrompt, 'Legacy prompt', '/commands are not the first prompt');
  assert.equal(byId.get(CACHED).cwd, '/work/boxed');
  const all = await gemini.list(ctx({ includeSubagents: true }));
  const sub = all.find(summary => summary.isSubagent);
  assert.deepEqual([sub.sourceId, sub.parentId, sub.cwd], [`${MAIN}/${SUB}`, MAIN, '/work/proj']);
});

test('gemini read: $patch content and removeIds, $rewindTo, synthetic tool responses, display content, MCP names', async () => {
  const session = await gemini.read(`gemini:${MAIN}`, ctx());
  assert.deepEqual(kinds(session), ['injected', 'user', 'injected', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'assistant']);
  assert.deepEqual(texts(session, 'user'), ['Explain @a.ts'], 'the typed prompt; the removed and rewound prompts are gone');
  assert.match(texts(session, 'injected')[1], /--- a\.ts ---/, 'the expanded prompt is kept as injected');
  assert.deepEqual(texts(session, 'assistant'), ['Reading it.', 'Final answer']);
  assert.equal(session.items[3].reasoning.text, 'Thinking hard', 'thought parts of the content win over the summaries');
  const [shell, mcp] = session.items.filter(item => item.kind === 'tool_call');
  assert.deepEqual([shell.tool.callId, shell.tool.category, shell.tool.args.command], ['call-1', 'shell', 'ls']);
  assert.deepEqual([mcp.tool.callId, mcp.tool.category, mcp.tool.mcp], ['call-2', 'mcp', { server: 'docs', tool: 'search' }]);
  const results = session.items.filter(item => item.kind === 'tool_result');
  assert.equal(results.length, 2, 'call-1 is answered once (toolCalls result), the synthetic response is not repeated');
  assert.deepEqual([results[1].result.callId, results[1].result.text, results[1].result.isError], ['call-2', 'offline', true]);
  assert.equal(session.messageCount, 3);
  assert.ok(session.items.every((item, index) => item.seq === index));
});

test('gemini read: orderIds and an unknown $rewindTo replay like loadConversationRecord; legacy .json; sub-agent', async () => {
  const cleared = await gemini.read(`gemini:${CLEARED}`, ctx());
  assert.deepEqual(cleared.items.map(item => [item.kind, item.parts[0].text]), [['user', 'first'], ['assistant', 'second']]);
  const legacy = await gemini.read(`gemini:${LEGACY}`, ctx());
  assert.deepEqual(kinds(legacy), ['injected', 'user', 'assistant', 'tool_call', 'tool_result']);
  assert.equal(legacy.items[4].result.isError, true, 'a cancelled call');
  const sub = await gemini.read(`gemini:${MAIN}/${SUB}`, ctx());
  assert.deepEqual(texts(sub, 'assistant'), ['Sub done']);
});

test('gemini: GEMINI_CLI_HOME moves the runtime folder; replayChat accepts raw lines', async () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-gemini-home-'));
  try {
    write(path.join(other, '.gemini', 'tmp', 'p', 'chats', 'session-2026-10-20T09-00-11112222.jsonl'), jsonl([
      { sessionId: '11112222-0000-4000-8000-000000000000', projectHash: 'h' }, { id: 'u', type: 'user', content: 'Moved home' }]));
    const list = await gemini.list({ home: fixture.home, env: { HOME: fixture.home, GEMINI_CLI_HOME: other }, cache: new Map() });
    assert.deepEqual(list.map(summary => summary.firstPrompt), ['Moved home']);
  } finally { fs.rmSync(other, { recursive: true, force: true }); }
  const replay = gemini.replayChat(['{"sessionId":"s","projectHash":"h"}', '{"id":"m","type":"user","content":"a"}', '{"id":"m","type":"user","content":"b"}', 'garbage']);
  assert.deepEqual(replay.messages.map(message => message.content), ['b'], 'a rewritten message replaces the earlier one in place');
  assert.deepEqual(gemini.replayChat([{ id: 'm', type: 'user', content: 'x' }]), { meta: {}, messages: [] }, 'no metadata: no conversation');
});

test('gemini resultDisplay: the untrusted_context wrapper and the shell report shown as the output (and exit code); the model\'s text stays', async () => {
  const wrap = text => `<untrusted_context>\n${text}\n</untrusted_context>`;
  assert.equal(gemini.resultDisplay('plain result'), undefined, 'not wrapped: nothing to show otherwise');
  assert.deepEqual(gemini.resultDisplay(wrap('file contents &lt;/untrusted_context&gt; here')), { text: 'file contents </untrusted_context> here' });
  assert.deepEqual(gemini.resultDisplay(wrap('Output: a.txt\nb.txt\nProcess Group PGID: 4242')), { text: 'a.txt\nb.txt' });
  assert.deepEqual(gemini.resultDisplay(wrap('Output: (empty)\nError: boom\nExit Code: 2\nProcess Group PGID: 1')), { text: 'Error: boom', exitCode: 2 });
  assert.deepEqual(gemini.resultDisplay(wrap('Output: x\nExit Code: 0')), { text: 'x', exitCode: 0 });

  const recorded = wrap('Output: hi\nExit Code: 3\nProcess Group PGID: 77');
  const items = gemini.itemsOf([
    { id: 'm1', type: 'user', timestamp: iso(1), content: [{ text: 'run it' }] },
    { id: 'm2', type: 'gemini', timestamp: iso(2), content: [{ text: 'Running.' }], toolCalls: [
      { id: 'c1', name: 'run_shell_command', args: { command: 'echo hi; exit 3' }, status: 'success', timestamp: iso(2),
        result: [{ functionResponse: { id: 'c1', name: 'run_shell_command', response: { output: recorded } } }] },
    ] },
  ]);
  const result = items.find(item => item.kind === 'tool_result').result;
  assert.equal(result.text, recorded, 'the model reads what Gemini recorded');
  assert.deepEqual(result.display, { text: 'hi', exitCode: 3 });
});
