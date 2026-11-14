// Synthetic agent histories for the chat-import tests: a fake home directory with one small session per source, written
// in each source's on-disk format (analysis/import-chat-history/formats.md). Every value is invented — no real logs.
// zstd files are compressed here (zlib.zstdCompressSync) and SQLite databases created here (node:sqlite).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const jsonl = records => records.map(record => JSON.stringify(record)).join('\n') + '\n';
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}
const iso = minute => new Date(Date.UTC(2026, 9, 1, 10, minute)).toISOString();
const ms = minute => Date.UTC(2026, 9, 1, 10, minute);

export const IDS = {
  codexUi: '01a10000-0000-7000-8000-000000000001',
  codexLegacy: '01a10000-0000-7000-8000-000000000002',
  codexFork: '01a10000-0000-7000-8000-000000000003',
  codexReview: '01a10000-0000-7000-8000-000000000004',
  codexMissing: '01a10000-0000-7000-8000-000000000005',
  codexScanned: '01a10000-0000-7000-8000-000000000006',
  claude: '11111111-1111-4111-8111-111111111111',
  claudeAlt: '22222222-2222-4222-8222-222222222222',
  dsh: 'sess-dsh-1',
  dshChild: 'sess-dsh-child',
  grok: '33333333-3333-4333-8333-333333333333',
  gemini: 'gem-session-1',
  kimi: 'kimi-session-1',
  qwen: 'qwen-session-1',
  copilot: 'copilot-session-1',
};

// ---- Codex --------------------------------------------------------------------------------------------------------
function codexUiRollout(id, { cwd = '/work/alpha' } = {}) {
  let ordinal = 0;
  const line = (minute, type, payload) => ({ timestamp: iso(minute), ordinal: ordinal++, type, payload });
  const done = (minute, item) => line(minute, 'event_msg', { type: 'item_completed', thread_id: id, turn_id: 't1', item });
  return [
    line(0, 'session_meta', { id, cwd, originator: 'codex-tui', cli_version: '0.166.0', source: 'cli', base_instructions: { text: 'base' } }),
    line(0, 'turn_context', { turn_id: 't1', cwd, model: 'gpt-test-1' }),
    line(0, 'response_item', { type: 'message', role: 'developer', content: [{ type: 'input_text', text: '<permissions instructions>' }] }),
    line(0, 'response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context><cwd>/work/alpha</cwd></environment_context>' }] }),
    line(0, 'response_item', { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'List the files please' }] }),
    done(0, { type: 'UserMessage', id: 'u1', content: [{ type: 'text', text: 'List the files please', text_elements: [] }] }),
    line(1, 'response_item', { type: 'reasoning', id: 'rs1', summary: [], encrypted_content: 'ENCRYPTED' }),
    done(1, { type: 'Reasoning', id: 'r1', summary_text: ['Thinking about listing'], raw_content: [] }),
    done(1, { type: 'CommandExecution', id: 'call-1', command: ['/bin/zsh', '-lc', 'ls -la'], cwd, status: 'completed', aggregated_output: 'a.txt\nb.txt\n', exit_code: 0 }),
    done(2, { type: 'FileChange', id: 'call-2', changes: { '/work/alpha/a.txt': { type: 'update', unified_diff: '@@\n-old\n+new\n', move_path: null } }, status: 'completed', stdout: 'Success', stderr: '' }),
    done(2, { type: 'McpToolCall', id: 'call-3', server: 'docs', tool: 'search', arguments: { q: 'x' }, status: 'completed', result: { content: [{ type: 'text', text: 'found' }], isError: false } }),
    done(3, { type: 'Extension', kind: 'web.search', id: 'call-4', query: 'node zstd', action: { type: 'search', query: 'node zstd' }, results: [{ title: 'Docs', url: 'https://example.invalid/zstd' }] }),
    done(3, { type: 'AgentMessage', id: 'a1', content: [{ type: 'Text', text: 'There are two files.' }], phase: 'final_answer' }),
    line(4, 'compacted', { message: 'Summary: the user listed files.', replacement_history: [] }),
    done(4, { type: 'ContextCompaction', id: 'cc1' }),
    done(5, { type: 'UserMessage', id: 'u2', content: [{ type: 'text', text: 'Thanks, and now?', text_elements: [] }] }),
    done(5, { type: 'AgentMessage', id: 'a2', content: [{ type: 'Text', text: 'Done.' }], phase: 'final_answer' }),
    line(5, 'token_count', { info: null }),
  ];
}
function codexLegacyRollout(id) {
  return [
    { timestamp: iso(10), type: 'session_meta', payload: { id, cwd: '/work/beta', cli_version: '0.40.0', source: 'cli' } },
    { timestamp: iso(10), type: 'turn_context', payload: { model: 'gpt-old' } },
    { timestamp: iso(10), type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<user_instructions>be nice</user_instructions>' }] } },
    { timestamp: iso(10), type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Fix the bug' }, { type: 'input_image', image_url: 'data:image/png;base64,AAAA' }] } },
    { timestamp: iso(11), type: 'response_item', payload: { type: 'reasoning', summary: [{ type: 'summary_text', text: 'Plan the fix' }], encrypted_content: 'ENC' } },
    { timestamp: iso(11), type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: '{"command":["bash","-lc","npm test"]}', call_id: 'fc1' } },
    { timestamp: iso(11), type: 'response_item', payload: { type: 'function_call_output', call_id: 'fc1', output: '{"output":"1 failing","metadata":{"exit_code":1}}' } },
    { timestamp: iso(12), type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', input: '*** Begin Patch\n*** Update File: src/x.js\n-a\n+b\n*** End Patch', call_id: 'ct1' } },
    { timestamp: iso(12), type: 'response_item', payload: { type: 'custom_tool_call_output', call_id: 'ct1', output: 'Done' } },
    { timestamp: iso(12), type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: '{"command":["bash","-lc","git push"]}', call_id: 'fc-orphan' } },
    { timestamp: iso(13), type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Fixed it.' }] } },
  ];
}

function buildCodex(home) {
  const codex = path.join(home, '.codex'), day = path.join(codex, 'sessions', '2026', '10', '01');
  const uiFile = write(path.join(day, `rollout-2026-10-01T10-00-00-${IDS.codexUi}.jsonl`), jsonl(codexUiRollout(IDS.codexUi)));
  // Recorded as .jsonl, on disk only as .jsonl.zst (Codex compresses old rollouts in place).
  const legacyPlain = path.join(day, `rollout-2026-10-01T10-10-00-${IDS.codexLegacy}.jsonl`);
  write(`${legacyPlain}.zst`, zlib.zstdCompressSync(Buffer.from(jsonl(codexLegacyRollout(IDS.codexLegacy)))));
  // A fork of the UI rollout cut before its compaction (ordinal 13).
  const forkFile = write(path.join(day, `rollout-2026-10-01T10-20-00-${IDS.codexFork}.jsonl`), jsonl([
    { timestamp: iso(20), ordinal: 0, type: 'session_meta', payload: { id: IDS.codexFork, cwd: '/work/alpha', forked_from_id: IDS.codexUi, history_base: { thread_id: IDS.codexUi, end_ordinal_exclusive: 13 } } },
    { timestamp: iso(20), ordinal: 1, type: 'event_msg', payload: { type: 'item_completed', item: { type: 'UserMessage', id: 'fu1', content: [{ type: 'text', text: 'Forked question' }] } } },
    { timestamp: iso(21), ordinal: 2, type: 'event_msg', payload: { type: 'item_completed', item: { type: 'AgentMessage', id: 'fa1', content: [{ type: 'Text', text: 'Forked answer' }] } } },
  ]));
  const reviewFile = write(path.join(day, `rollout-2026-10-01T10-30-00-${IDS.codexReview}.jsonl`), jsonl([
    { timestamp: iso(30), type: 'session_meta', payload: { id: IDS.codexReview, cwd: '/work/alpha', source: { subagent: 'review' } } },
    { timestamp: iso(30), type: 'event_msg', payload: { type: 'item_completed', item: { type: 'UserMessage', id: 'x', content: [{ type: 'text', text: 'Review this' }] } } },
  ]));
  // Unknown to the database: found by the directory scan (archived).
  write(path.join(codex, 'archived_sessions', `rollout-2026-10-01T09-00-00-${IDS.codexScanned}.jsonl`), jsonl([
    { timestamp: iso(1), type: 'session_meta', payload: { id: IDS.codexScanned, cwd: '/work/gamma', source: 'vscode' } },
    { timestamp: iso(1), type: 'event_msg', payload: { type: 'item_completed', item: { type: 'UserMessage', id: 'x', content: [{ type: 'text', text: 'Scanned prompt' }] } } },
  ]));
  write(path.join(codex, 'session_index.jsonl'), jsonl([{ id: IDS.codexUi, thread_name: 'Old name', updated_at: iso(0) }, { id: IDS.codexUi, thread_name: 'Listing files', updated_at: iso(5) }]));
  const db = new DatabaseSync(path.join(codex, 'state_5.sqlite'));
  db.exec(`CREATE TABLE threads (id TEXT PRIMARY KEY, rollout_path TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, source TEXT NOT NULL,
    model_provider TEXT NOT NULL, cwd TEXT NOT NULL, title TEXT NOT NULL, has_user_event INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
    git_branch TEXT, first_user_message TEXT NOT NULL DEFAULT '', model TEXT, created_at_ms INTEGER, updated_at_ms INTEGER, thread_source TEXT, preview TEXT, name TEXT)`);
  const insert = db.prepare('INSERT INTO threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, has_user_event, archived, git_branch, first_user_message, model, created_at_ms, updated_at_ms, thread_source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const sec = minute => Math.floor(ms(minute) / 1000);
  insert.run(IDS.codexUi, uiFile, sec(0), sec(5), 'cli', 'openai', '/work/alpha', '', 1, 0, 'main', 'List the files please', 'gpt-test-1', ms(0), ms(5), 'user');
  insert.run(IDS.codexLegacy, legacyPlain, sec(10), sec(13), 'cli', 'openai', '/work/beta', 'Bug fix', 1, 0, null, 'Fix the bug', 'gpt-old', ms(10), ms(13), 'user');
  insert.run(IDS.codexFork, forkFile, sec(20), sec(21), 'vscode', 'openai', '/work/alpha', '', 1, 0, null, 'Forked question', null, ms(20), ms(21), 'user');
  insert.run(IDS.codexReview, reviewFile, sec(30), sec(30), '{"subagent":"review"}', 'openai', '/work/alpha', '', 1, 0, null, 'Review this', null, ms(30), ms(30), 'subagent');
  insert.run(IDS.codexMissing, path.join(day, 'rollout-gone.jsonl'), sec(40), sec(40), 'cli', 'openai', '/work/alpha', '', 1, 0, null, 'Gone', null, ms(40), ms(40), 'user');
  db.close();
}

// ---- Claude Code --------------------------------------------------------------------------------------------------
function claudeRecords(sessionId) {
  const base = { sessionId, cwd: '/work/claude', gitBranch: 'feature', version: '2.1.300', isSidechain: false, userType: 'external' };
  const user = (uuid, parentUuid, minute, content, extra = {}) => ({ ...base, type: 'user', uuid, parentUuid, timestamp: iso(minute), message: { role: 'user', content }, ...extra });
  const assistant = (uuid, parentUuid, minute, id, block) => ({ ...base, type: 'assistant', uuid, parentUuid, timestamp: iso(minute), message: { id, role: 'assistant', model: 'claude-test', content: [block] } });
  return [
    { type: 'queue-operation', operation: 'enqueue', sessionId },
    user('u0', null, 0, '<system-reminder>context</system-reminder>', { isMeta: true }),
    user('u1', 'u0', 0, 'Please refactor the parser'),
    { ...base, type: 'attachment', uuid: 'att1', parentUuid: 'u1', timestamp: iso(0), attachment: { type: 'file' } },
    assistant('a1', 'att1', 1, 'msg1', { type: 'thinking', thinking: '', signature: 'SIG' }),
    assistant('a2', 'a1', 1, 'msg1', { type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'npm test' } }),
    assistant('a3', 'a2', 1, 'msg1', { type: 'tool_use', id: 'tu2', name: 'Read', input: { file_path: '/work/claude/p.js' } }),
    // Parallel results: tr1 hangs off a2 (a sibling of a3), tr2 off a3.
    user('tr1', 'a2', 2, [{ type: 'tool_result', tool_use_id: 'tu1', content: 'ok', is_error: false }], { toolUseResult: { stdout: 'ok', exitCode: 0 } }),
    user('tr2', 'a3', 2, [{ type: 'tool_result', tool_use_id: 'tu2', content: [{ type: 'text', text: 'file body' }] }]),
    assistant('a4', 'tr2', 3, 'msg2', { type: 'tool_use', id: 'tu3', name: 'Edit', input: { file_path: '/work/claude/p.js', old_string: 'a', new_string: 'b' } }),
    user('tr3', 'a4', 3, [{ type: 'tool_result', tool_use_id: 'tu3', content: 'edited' }], { toolUseResult: { structuredPatch: [{ oldStart: 1, lines: ['-a', '+b'] }] } }),
    assistant('a5', 'tr3', 4, 'msg3', { type: 'text', text: 'Refactored.' }),
    // An abandoned branch (the user rewound and asked again from a5).
    user('old1', 'a5', 5, 'Abandoned question'),
    assistant('old2', 'old1', 5, 'msg4', { type: 'text', text: 'Abandoned answer' }),
    { type: 'custom-title', customTitle: 'Parser refactor', sessionId },
    { ...base, type: 'system', subtype: 'compact_boundary', uuid: 'cb', parentUuid: null, logicalParentUuid: 'a5', timestamp: iso(6) },
    user('cs', 'cb', 6, 'This session is being continued. Summary: parser refactored.', { isCompactSummary: true, isVisibleInTranscriptOnly: true }),
    user('u2', 'cs', 7, [{ type: 'text', text: '<command-name>/clear</command-name>' }, { type: 'text', text: 'Now add tests' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }]),
    assistant('a6', 'u2', 8, 'msg5', { type: 'text', text: 'Tests added.' }),
    { type: 'last-prompt', lastPrompt: 'Now add tests', leafUuid: 'u2', sessionId },
    { ...base, type: 'system', subtype: 'stop_hook_summary', uuid: 'sh', parentUuid: 'a6', timestamp: iso(8) },
    '{"type":"user","uuid":"partial-li', // a line still being written
  ];
}
function buildClaude(home, configDir) {
  const project = path.join(configDir, 'projects', '-work-claude');
  write(path.join(project, `${IDS.claude}.jsonl`), claudeRecords(IDS.claude).map(record => typeof record === 'string' ? record : JSON.stringify(record)).join('\n'));
  write(path.join(project, IDS.claude, 'subagents', 'agent-a1.jsonl'), jsonl([
    { type: 'user', uuid: 's1', parentUuid: null, isSidechain: true, sessionId: IDS.claude, cwd: '/work/claude', timestamp: iso(2), message: { role: 'user', content: 'Explore the repo' } },
    { type: 'assistant', uuid: 's2', parentUuid: 's1', isSidechain: true, sessionId: IDS.claude, cwd: '/work/claude', timestamp: iso(3), message: { id: 'sm1', role: 'assistant', content: [{ type: 'text', text: 'Explored.' }] } },
  ]));
  write(path.join(project, IDS.claude, 'subagents', 'agent-a1.meta.json'), JSON.stringify({ agentType: 'Explore', description: 'Explore the repo' }));
  // The second profile in ~/.claude (CLAUDE_CONFIG_DIR is the first).
  write(path.join(home, '.claude', 'projects', '-work-other', `${IDS.claudeAlt}.jsonl`), jsonl([
    { type: 'user', uuid: 'x1', parentUuid: null, sessionId: IDS.claudeAlt, cwd: '/work/other', timestamp: iso(30), message: { role: 'user', content: 'Other profile prompt' } },
    { type: 'assistant', uuid: 'x2', parentUuid: 'x1', sessionId: IDS.claudeAlt, cwd: '/work/other', timestamp: iso(31), message: { id: 'm', role: 'assistant', model: 'claude-test', content: [{ type: 'text', text: 'Hi' }] } },
  ]));
  write(path.join(home, 'Library', 'Application Support', 'Claude', 'claude-code-sessions', 'acct', 'org', 'local_abc.json'),
    JSON.stringify({ sessionId: 'local_abc', cliSessionId: IDS.claude, cwd: '/work/claude', title: 'Desktop title', isArchived: true, createdAt: ms(0), lastActivityAt: ms(9), model: 'claude-test' }));
}

// ---- dsh ----------------------------------------------------------------------------------------------------------
export function dshEvents(id, { child = false } = {}) {
  let seq = 0;
  const event = (minute, type, data) => ({ type, seq: seq++, time: ms(minute), data });
  const header = { type: 'session', version: 4, id, createdAt: ms(0), cwd: '/work/dsh', isSeeded: child, delegationDepth: child ? 1 : 0, ...(child ? { parentSession: IDS.dsh, origin: 'subagent' } : {}) };
  return [header,
    event(0, 'turn/start', { turn: 1 }),
    event(0, 'user/message', { id: 'm0', content: [{ type: 'text', text: '<project instructions>' }], source: { kind: 'instructions' } }),
    event(0, 'user/message', { id: 'm1', content: [{ type: 'text', text: 'Hello dsh' }], source: { kind: 'user' } }),
    event(1, 'assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'reasoning', text: 'plain thought' }, { type: 'text', text: 'Running it.' }, { type: 'tool-call', id: 'c1', name: 'bash', arguments: '{"command":"echo hi"}' }], source: { model: 'deepseek-test' } } }),
    event(1, 'tool/call', { turn: 1, callId: 'c1', name: 'bash', arguments: '{"command":"echo hi"}' }),
    event(2, 'tool/result', { message: { toolCallId: 'c1', content: [{ type: 'text', text: 'hi' }], isError: false } }),
    event(2, 'session/title', { title: 'First title' }),
    event(3, 'compaction/summary', { compactionId: 1, summary: [{ type: 'text', text: 'dsh summary' }] }),
    event(3, 'user/message', { id: 'm2', content: [{ type: 'text', text: 'Second question' }], source: { kind: 'user' } }),
    event(4, 'assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'Second answer' }] } }),
    event(5, 'session/title', { title: 'Final title' }),
    event(5, 'turn/end', { turn: 2 }),
  ];
}
function buildDsh(home) {
  const dir = path.join(home, '.dsh', 'sessions', '--work-dsh--');
  const events = dshEvents(IDS.dsh);
  // One zstd frame per batch, appended; plus a partial frame being written at the end.
  const frames = [events.slice(0, 3), events.slice(3, 7), events.slice(7)].map(batch => zlib.zstdCompressSync(Buffer.from(jsonl(batch))));
  const partial = zlib.zstdCompressSync(Buffer.from(jsonl([{ type: 'user/message', seq: 99, time: ms(9), data: { id: 'late', content: [{ type: 'text', text: 'late' }], source: { kind: 'user' } } }])));
  write(path.join(dir, IDS.dsh, 'session.v4.jsonl.zstd'), Buffer.concat([...frames, partial.subarray(0, partial.length - 5)]));
  write(path.join(dir, IDS.dsh, 'session.jsonl'), jsonl([{ type: 'session', version: 0, id: IDS.dsh, createdAt: ms(0), isSeeded: false, delegationDepth: 0 }])); // older generation: ignored
  write(path.join(dir, IDS.dshChild, 'session.v4.jsonl'), jsonl(dshEvents(IDS.dshChild, { child: true })));
}

// ---- Grok / Gemini / Kimi / Qwen / Copilot ------------------------------------------------------------------------
function buildGrok(home) {
  const dir = path.join(home, '.grok', 'sessions', encodeURIComponent('/work/grok'), IDS.grok);
  write(path.join(dir, 'summary.json'), JSON.stringify({ info: { id: IDS.grok, cwd: '/work/grok' }, generated_title: 'Grok title', created_at: iso(0), last_active_at: iso(7), num_chat_messages: 4, current_model_id: 'grok-test', chat_format_version: 1 }));
  write(path.join(dir, 'chat_history.jsonl'), jsonl([
    { type: 'system', content: 'system prompt' },
    { type: 'user', content: [{ type: 'text', text: 'project rules' }], synthetic_reason: 'project_instructions' },
    { type: 'user', content: [{ type: 'text', text: 'Grok prompt' }], prompt_index: 0 },
    { type: 'reasoning', id: 'r', summary: [{ type: 'summary_text', text: 'grok thinking' }], encrypted_content: 'XENC' },
    { type: 'assistant', content: 'Calling a tool', tool_calls: [{ id: 'g1', name: 'run_terminal_command', arguments: '{"command":"pwd"}' }], model_id: 'grok-test' },
    { type: 'tool_result', tool_call_id: 'g1', content: '/work/grok' },
    { type: 'backend_tool_call', kind: { tool_type: 'web_search', action: { type: 'search', query: 'q' }, id: 'b1', status: 'completed' } },
    { type: 'assistant', content: 'Grok answer', tool_calls: [] },
  ]));
  const sub = path.join(home, '.grok', 'sessions', encodeURIComponent('/work/grok'), '44444444-4444-4444-8444-444444444444');
  write(path.join(sub, 'summary.json'), JSON.stringify({ info: { id: '44444444-4444-4444-8444-444444444444', cwd: '/work/grok' }, session_kind: 'subagent', created_at: iso(1) }));
  write(path.join(sub, 'chat_history.jsonl'), jsonl([{ type: 'user', content: [{ type: 'text', text: 'Sub task' }] }]));
}
function buildGemini(home) {
  const slug = path.join(home, '.gemini', 'tmp', 'work-gem');
  write(path.join(slug, '.project_root'), '/work/gem\n');
  write(path.join(slug, 'chats', 'session-2026-10-01T10-00-gem00001.jsonl'), jsonl([
    { sessionId: IDS.gemini, projectHash: 'h', startTime: iso(0), lastUpdated: iso(2), kind: 'main' },
    { id: 'g1', timestamp: iso(0), type: 'user', content: [{ text: 'Gemini prompt' }] },
    { id: 'g2', timestamp: iso(1), type: 'gemini', model: 'gemini-test', content: 'draft', thoughts: [{ subject: 'Plan', description: 'think' }] },
    { id: 'g2', timestamp: iso(1), type: 'gemini', model: 'gemini-test', content: 'Gemini answer', thoughts: [{ subject: 'Plan', description: 'think' }],
      toolCalls: [{ id: 'tc1', name: 'run_shell_command', args: { command: 'ls' }, status: 'success', result: [{ functionResponse: { id: 'tc1', name: 'run_shell_command', response: { output: 'x' } } }] }] },
    { id: 'g3', timestamp: iso(2), type: 'user', content: [{ text: 'Rewound away' }] },
    { $rewindTo: 'g3' },
    { $set: { summary: 'Gemini summary title' } },
    { id: 'g4', timestamp: iso(2), type: 'info', content: 'notice' },
  ]));
}
function buildKimi(home) {
  const workDir = '/work/kimi';
  write(path.join(home, '.kimi', 'kimi.json'), JSON.stringify({ work_dirs: [{ path: workDir, last_session_id: IDS.kimi }] }));
  const md5 = crypto.createHash('md5').update(workDir).digest('hex');
  write(path.join(home, '.kimi', 'sessions', md5, IDS.kimi, 'context.jsonl'), jsonl([
    { role: '_checkpoint', id: 0 },
    { role: 'system', content: 'kimi system' },
    { role: 'user', content: 'Kimi prompt' },
    { role: 'assistant', content: [{ type: 'think', think: 'kimi thought' }, { type: 'text', text: 'Kimi answer' }], tool_calls: [{ id: 'k1', type: 'function', function: { name: 'Shell', arguments: '{"command":"ls"}' } }] },
    { role: 'tool', tool_call_id: 'k1', content: 'out' },
    { role: '_usage', token_count: 10 },
  ]));
}
function buildQwen(home) {
  write(path.join(home, '.qwen', 'projects', '-work-qwen', 'chats', `${IDS.qwen}.jsonl`), jsonl([
    { uuid: 'q1', parentUuid: null, sessionId: IDS.qwen, timestamp: iso(0), type: 'user', cwd: '/work/qwen', message: { role: 'user', parts: [{ text: 'Qwen prompt' }] } },
    { uuid: 'q2', parentUuid: 'q1', sessionId: IDS.qwen, timestamp: iso(1), type: 'assistant', model: 'qwen-test', message: { role: 'model', parts: [{ text: 'hmm', thought: true }, { text: 'Qwen answer' }, { functionCall: { id: 'f1', name: 'read_file', args: { path: 'a' } } }] } },
    { uuid: 'q3', parentUuid: 'q2', sessionId: IDS.qwen, timestamp: iso(1), type: 'tool_result', message: { role: 'user', parts: [{ functionResponse: { id: 'f1', name: 'read_file', response: { output: 'content' } } }] } },
    { uuid: 'qx', parentUuid: 'q3', sessionId: IDS.qwen, timestamp: iso(2), type: 'user', message: { role: 'user', parts: [{ text: 'Abandoned' }] } },
    { uuid: 'q4', parentUuid: 'q3', sessionId: IDS.qwen, timestamp: iso(3), type: 'user', message: { role: 'user', parts: [{ text: 'Follow-up' }] } },
  ]));
}
function buildCopilot(home) {
  write(path.join(home, '.copilot', 'session-state', IDS.copilot, 'events.jsonl'), jsonl([
    { type: 'session.start', timestamp: iso(0), data: { sessionId: IDS.copilot, startTime: iso(0), context: { cwd: '/work/copilot', branch: 'dev' }, selectedModel: 'gpt-x' } },
    { type: 'user.message', timestamp: iso(0), data: { content: 'Copilot prompt' } },
    { type: 'assistant.message', timestamp: iso(1), data: { content: 'Copilot answer', toolRequests: [{ toolCallId: 'cp1', name: 'bash', arguments: { command: 'ls' } }] } },
    { type: 'tool.execution_start', timestamp: iso(1), data: { toolCallId: 'cp1', toolName: 'bash', arguments: { command: 'ls' } } },
    { type: 'tool.execution_complete', timestamp: iso(2), data: { toolCallId: 'cp1', success: true, result: { content: 'a b' } } },
  ]));
}

// ---- SQLite sources -----------------------------------------------------------------------------------------------
export function buildOpencode(home, { schema = 1 } = {}) {
  const file = path.join(home, '.local', 'share', 'opencode', 'opencode.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, parent_id text, slug text NOT NULL DEFAULT '', directory text NOT NULL, title text NOT NULL,
    version text NOT NULL, model text, time_created integer NOT NULL, time_updated integer NOT NULL, time_archived integer)`);
  db.exec('CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL)');
  db.exec('CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL)');
  db.exec('CREATE TABLE session_message (id text PRIMARY KEY, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL)');
  const session = db.prepare('INSERT INTO session (id, project_id, parent_id, directory, title, version, time_created, time_updated, time_archived) VALUES (?,?,?,?,?,?,?,?,?)');
  session.run('ses_v1', 'p', null, '/work/oc', 'OpenCode v1 title', '1.18.0', ms(0), ms(4), null);
  session.run('ses_child', 'p', 'ses_v1', '/work/oc', 'Child', '1.18.0', ms(1), ms(2), null);
  session.run('ses_empty', 'p', null, '/work/oc', 'Empty', '1.18.0', ms(0), ms(9), ms(9));
  const message = db.prepare('INSERT INTO message VALUES (?,?,?,?,?)'), part = db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)');
  message.run('msg_1', 'ses_v1', ms(0), ms(0), JSON.stringify({ role: 'user', time: { created: ms(0) } }));
  part.run('prt_1', 'msg_1', 'ses_v1', ms(0), ms(0), JSON.stringify({ type: 'text', text: 'OpenCode prompt' }));
  part.run('prt_2', 'msg_1', 'ses_v1', ms(0), ms(0), JSON.stringify({ type: 'text', text: 'synthetic note', synthetic: true }));
  message.run('msg_2', 'ses_v1', ms(1), ms(1), JSON.stringify({ role: 'assistant', modelID: 'oc-model', providerID: 'prov', time: { created: ms(1) } }));
  part.run('prt_3', 'msg_2', 'ses_v1', ms(1), ms(1), JSON.stringify({ type: 'reasoning', text: 'oc thinking' }));
  part.run('prt_4', 'msg_2', 'ses_v1', ms(1), ms(1), JSON.stringify({ type: 'tool', callID: 'oc1', tool: 'bash', state: { status: 'completed', input: { command: 'ls' }, output: 'files', metadata: { exit: 0 } } }));
  part.run('prt_5', 'msg_2', 'ses_v1', ms(1), ms(1), JSON.stringify({ type: 'text', text: 'OpenCode answer' }));
  message.run('msg_c', 'ses_child', ms(1), ms(1), JSON.stringify({ role: 'user' }));
  part.run('prt_c', 'msg_c', 'ses_child', ms(1), ms(1), JSON.stringify({ type: 'text', text: 'child prompt' }));
  if (schema === 2) {
    session.run('ses_v2', 'p', null, '/work/oc2', 'OpenCode v2 title', '2.2.5', ms(5), ms(8), null);
    const row = db.prepare('INSERT INTO session_message VALUES (?,?,?,?,?,?,?)');
    row.run('m1', 'ses_v2', 'user', 1, ms(5), ms(5), JSON.stringify({ text: 'V2 prompt' }));
    row.run('m2', 'ses_v2', 'synthetic', 2, ms(5), ms(5), JSON.stringify({ text: 'reminder' }));
    row.run('m3', 'ses_v2', 'assistant', 3, ms(6), ms(6), JSON.stringify({ model: { id: 'm2', providerID: 'p2' }, content: [{ type: 'reasoning', text: 'v2 think' }, { type: 'tool', id: 't1', name: 'edit', state: { status: 'completed', input: { filePath: '/work/oc2/a', oldString: 'x', newString: 'y' }, content: [{ type: 'text', text: 'ok' }] } }, { type: 'text', text: 'V2 answer' }] }));
    row.run('m4', 'ses_v2', 'compaction', 4, ms(7), ms(7), JSON.stringify({ summary: 'v2 summary', status: 'completed' }));
    row.run('m5', 'ses_v2', 'shell', 5, ms(8), ms(8), JSON.stringify({ command: 'pwd', status: 'completed', exit: 0, output: { output: '/work/oc2' } }));
    row.run('m6', 'ses_v2', 'idle', 6, ms(8), ms(8), JSON.stringify({ outcome: 'completed' }));
  }
  db.close();
  return file;
}
export function buildCursor(home) {
  const workDir = '/work/cursor';
  const md5 = crypto.createHash('md5').update(workDir).digest('hex');
  const file = path.join(home, '.cursor', 'chats', md5, 'chat-1', 'store.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)');
  db.exec('CREATE TABLE blobs (id TEXT PRIMARY KEY, data BLOB)');
  db.prepare('INSERT INTO meta VALUES (?, ?)').run('0', Buffer.from(JSON.stringify({ agentId: 'chat-1', name: 'Cursor chat', createdAt: ms(0), lastUsedModel: 'cursor-model' })).toString('hex'));
  const blob = db.prepare('INSERT INTO blobs VALUES (?, ?)');
  blob.run('b0', Buffer.from([0x0a, 0x01, 0xff]));
  blob.run('b1', Buffer.from(JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Cursor prompt' }] })));
  blob.run('b2', Buffer.from(JSON.stringify({ role: 'assistant', content: [{ type: 'reasoning', text: 'c think' }, { type: 'text', text: 'Cursor answer' }, { type: 'tool-call', toolCallId: 'cc1', toolName: 'Shell', args: { command: 'ls' } }] })));
  blob.run('b3', Buffer.from(JSON.stringify({ role: 'tool', content: [{ type: 'tool-result', toolCallId: 'cc1', result: 'listing' }] })));
  db.close();
  return file;
}

// ---- MiMo Code, MiniMax Code, ZCode (one conversation each; the per-source tests cover their shapes) -----------------
export function buildMimo(home) {
  const file = path.join(home, '.local', 'share', 'mimocode', 'mimocode.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, context_from text, slug text NOT NULL,
      directory text NOT NULL, title text NOT NULL, title_source text NOT NULL DEFAULT 'user', version text NOT NULL,
      time_created integer NOT NULL, time_updated integer NOT NULL, time_archived integer);
    CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, agent_id text NOT NULL DEFAULT 'main', time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
    CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);`);
  db.prepare('INSERT INTO session (id, project_id, slug, directory, title, version, time_created, time_updated) VALUES (?,?,?,?,?,?,?,?)').run('ses_mimo', 'p', 's', '/work/mimo', 'MiMo title', '0.1.15', ms(14), ms(15));
  const message = db.prepare('INSERT INTO message (id, session_id, agent_id, time_created, time_updated, data) VALUES (?,?,?,?,?,?)');
  const part = db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)');
  message.run('msg_m1', 'ses_mimo', 'main', ms(14), ms(14), JSON.stringify({ role: 'user', time: { created: ms(14) }, agent: 'build' }));
  part.run('prt_m1', 'msg_m1', 'ses_mimo', ms(14), ms(14), JSON.stringify({ type: 'text', text: 'MiMo prompt' }));
  message.run('msg_m2', 'ses_mimo', 'main', ms(15), ms(15), JSON.stringify({ role: 'assistant', modelID: 'mimo-v2', providerID: 'xiaomi', time: { created: ms(15), completed: ms(15) } }));
  part.run('prt_m2', 'msg_m2', 'ses_mimo', ms(15), ms(15), JSON.stringify({ type: 'text', text: 'MiMo answer' }));
  db.close();
  return file;
}

export function buildMinimax(home) {
  const file = path.join(home, '.minimax', 'v2', 'sqlite', 'runtime-state.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE local_runtime_sessions (session_id TEXT PRIMARY KEY, record_json TEXT NOT NULL, updated_at_ms INTEGER NOT NULL,
      columnar_version INTEGER NOT NULL DEFAULT 0, agent_name TEXT, runtime TEXT, session_type TEXT, status TEXT, archived INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'visible', session_kind TEXT NOT NULL DEFAULT 'unknown', parent_session_id TEXT, workspace_dir TEXT, title TEXT,
      created_at_ms INTEGER, extra_data_json TEXT NOT NULL DEFAULT '{}', history_relative_dir TEXT);
    CREATE TABLE local_runtime_messages (session_id TEXT PRIMARY KEY, display_messages_json TEXT NOT NULL, pi_history_json TEXT NOT NULL);
    CREATE TABLE local_runtime_message_rows (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, msg_id TEXT NOT NULL, role TEXT, turn_id TEXT,
      source TEXT, source_context_json TEXT, created_at_ms INTEGER NOT NULL, data_json TEXT NOT NULL);`);
  const record = { sessionId: 'sess-minimax', agentName: 'main', workspaceDir: '/work/mm', sessionType: 'root', sessionKind: 'conversation', title: 'MiniMax title', createdAtMs: ms(16), updatedAtMs: ms(17) };
  db.prepare(`INSERT INTO local_runtime_sessions (session_id, record_json, updated_at_ms, columnar_version, agent_name, runtime, session_type, status, archived,
    visibility, session_kind, workspace_dir, title, created_at_ms) VALUES (?, ?, ?, 3, 'main', 'pi-agent', 'root', 'idle', 0, 'visible', 'conversation', ?, ?, ?)`)
    .run('sess-minimax', JSON.stringify(record), ms(17), '/work/mm', 'MiniMax title', ms(16));
  const row = db.prepare('INSERT INTO local_runtime_message_rows (session_id, msg_id, role, turn_id, created_at_ms, data_json) VALUES (?, ?, ?, ?, ?, ?)');
  row.run('sess-minimax', 'mm-u1', 'user', 'turn-1', ms(16), JSON.stringify({ msg_id: 'mm-u1', role: 'user', msg_content: 'MiniMax prompt', msg_type: 1, timestamp: ms(16) }));
  row.run('sess-minimax', 'mm-a1', 'assistant', 'turn-1', ms(17), JSON.stringify({ msg_id: 'mm-a1', role: 'assistant', msg_content: 'MiniMax answer', msg_type: 1, timestamp: ms(17) }));
  db.close();
  return file;
}

export function buildZcode(home) {
  const file = path.join(home, '.zcode', 'cli', 'db', 'db.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE session (id text primary key, project_id text not null, parent_id text, slug text not null, directory text not null, path text,
      title text not null, version text not null, revert text, time_created integer not null, time_updated integer not null, time_archived integer,
      task_type text not null default 'interactive', title_source text not null default 'first_input', time_deleted integer);
    CREATE TABLE message (id text primary key, session_id text not null, time_created integer not null, time_updated integer not null, data text not null, sequence integer);
    CREATE TABLE part (id text primary key, message_id text not null, session_id text not null, time_created integer not null, time_updated integer not null, data text not null, sequence integer);`);
  db.prepare(`INSERT INTO session (id, project_id, slug, directory, path, title, title_source, version, time_created, time_updated) VALUES (?, 'p', ?, ?, ?, ?, 'generated', '1.2.0', ?, ?)`)
    .run('sess_zcode', 'sess_zcode', '/work/zc', '/work/zc', 'ZCode title', ms(18), ms(19));
  const message = db.prepare('INSERT INTO message (id, session_id, time_created, time_updated, data, sequence) VALUES (?, ?, ?, ?, ?, ?)');
  const part = db.prepare('INSERT INTO part (id, message_id, session_id, time_created, time_updated, data, sequence) VALUES (?, ?, ?, ?, ?, ?, 0)');
  message.run('msg_z1', 'sess_zcode', ms(18), ms(18), JSON.stringify({ role: 'user', time: { created: ms(18) }, agent: 'zcode-agent', model: {} }), 0);
  part.run('prt_z1', 'msg_z1', 'sess_zcode', ms(18), ms(18), JSON.stringify({ type: 'text', text: 'ZCode prompt' }));
  message.run('msg_z2', 'sess_zcode', ms(19), ms(19), JSON.stringify({ role: 'assistant', time: { created: ms(19), completed: ms(19) }, agent: 'zcode-agent', modelId: 'glm-5', providerId: 'zai', finish: 'stop' }), 1);
  part.run('prt_z2', 'msg_z2', 'sess_zcode', ms(19), ms(19), JSON.stringify({ type: 'text', text: 'ZCode answer' }));
  db.close();
  return file;
}

/**
 * A temp home with every source. Returns {home, env, configDir, cleanup}. env sets CLAUDE_CONFIG_DIR to a profile outside
 * ~/.claude (the default ~/.claude is scanned too).
 */
export function buildHome({ opencodeSchema = 2 } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-import-'));
  const configDir = path.join(home, 'profiles', 'work', 'config');
  buildCodex(home);
  buildClaude(home, configDir);
  buildDsh(home);
  buildGrok(home);
  buildGemini(home);
  buildKimi(home);
  buildQwen(home);
  buildCopilot(home);
  buildOpencode(home, { schema: opencodeSchema });
  buildCursor(home);
  buildMimo(home);
  buildMinimax(home);
  buildZcode(home);
  const env = { HOME: home, CLAUDE_CONFIG_DIR: configDir };
  return { home, env, configDir, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}
