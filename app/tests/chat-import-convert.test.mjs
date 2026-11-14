// Import Chat History model helpers and converters (electron/chat-import/model.mjs, convert.mjs): Codex turns the host
// renders, the text hand-off with compaction-aware tail-first truncation, and the DeepSeek seed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHome, IDS } from './fixtures/chat-import/build-home.mjs';
import { readSession, clearCache } from '../electron/chat-import/catalog.mjs';
import { toCodexTurns, toDshSeed, toTranscriptText, pairTools, patchChanges } from '../electron/chat-import/convert.mjs';
import {
  ItemList, NO_RESULT_TEXT, isClaudeInjected, isCodexInjected, makeSession, makeSummary, parseKey, sessionKey, sourceLabel, toMs, toolCategory,
} from '../electron/chat-import/model.mjs';

const fixture = buildHome();
test.after(() => fixture.cleanup());
const read = key => { clearCache(); return readSession(key, { home: fixture.home, env: fixture.env }); };

function synthetic(build, fields = {}) {
  const list = new ItemList();
  build(list);
  return makeSession(makeSummary('codex', 'synthetic', { title: 'Synthetic', cwd: '/work/s', ...fields }), list.items);
}

test('model: keys, labels, timestamps, tool categories, injection detectors', () => {
  assert.equal(sessionKey('claude-code', 'a/b:c'), 'claude-code:a/b:c');
  assert.deepEqual(parseKey('claude-code:a/b:c'), { source: 'claude-code', sourceId: 'a/b:c' });
  assert.equal(parseKey('nope:x'), null);
  assert.equal(parseKey('codex:'), null);
  assert.equal(sourceLabel('dsh'), 'DeepSeek Harness');
  assert.equal(toMs(1790848800), 1790848800000);
  assert.equal(toMs(1790848800000), 1790848800000);
  assert.equal(toMs('2026-10-01T10:00:00.000Z'), 1790848800000);
  assert.equal(toMs('garbage'), null);
  const categories = ['Bash', 'exec_command', 'run_shell_command', 'apply_patch', 'MultiEdit', 'write_file', 'mcp__github__get_issue', 'WebFetch', 'google_web_search', 'TodoWrite']
    .map(name => toolCategory(name));
  assert.deepEqual(categories, ['shell', 'shell', 'shell', 'edit', 'edit', 'edit', 'mcp', 'web', 'web', 'other']);
  assert.equal(toolCategory('search', { namespace: 'mcp__docs__' }), 'mcp');
  assert.ok(isCodexInjected('<environment_context>\n</environment_context>'));
  assert.ok(isCodexInjected('# AGENTS.md instructions for /x\n<INSTRUCTIONS>'));
  assert.ok(!isCodexInjected('please read <environment_context>'));
  assert.ok(isClaudeInjected('<system-reminder>x'));
  assert.ok(isClaudeInjected('<local-command-stdout>'));
  assert.ok(!isClaudeInjected('hello'));
});

test('pairTools: results join their call by callId (repeated ids in order), orphans stay apart', () => {
  const session = synthetic(list => {
    list.toolCall({ callId: 'a', name: 'Bash', raw: { command: 'one' } });
    list.toolCall({ callId: 'a', name: 'Bash', raw: { command: 'two' } });
    list.toolResult({ callId: 'a', text: 'first' });
    list.toolResult({ callId: 'zzz', text: 'stray' });
  });
  const pairs = pairTools(session.items);
  assert.equal(pairs[0].result.text, 'first');
  assert.equal(pairs[1].result, null);
  assert.equal(pairs.filter(pair => pair.orphan).length, 1);
});

test('toCodexTurns: Codex Thread items the host renders, one turn per user message, injected and opaque dropped', async () => {
  const turns = toCodexTurns(await read(`codex:${IDS.codexUi}`));
  assert.equal(turns.length, 2);
  assert.ok(turns.every(turn => turn.status === 'completed' && turn.id));
  assert.deepEqual(turns[0].items.map(item => item.type), ['userMessage', 'reasoning', 'commandExecution', 'fileChange', 'mcpToolCall', 'webSearch', 'agentMessage', 'contextCompaction']);
  const [user, reasoning, command, change, mcp, web, agent, compaction] = turns[0].items;
  assert.deepEqual(user.content, [{ type: 'text', text: 'List the files please', text_elements: [] }]);
  assert.deepEqual(reasoning.summary, ['Thinking about listing']);
  assert.deepEqual([command.command, command.aggregatedOutput, command.exitCode, command.status, command.cwd], ['ls -la', 'a.txt\nb.txt\n', 0, 'completed', '/work/alpha']);
  assert.deepEqual(command.commandActions, [{ type: 'unknown', command: 'ls -la' }]);
  assert.deepEqual(change.changes, [{ path: '/work/alpha/a.txt', kind: { type: 'update', move_path: null }, diff: '@@\n-old\n+new\n' }]);
  assert.deepEqual([mcp.server, mcp.tool, mcp.arguments, mcp.result.content[0].text, mcp.error], ['docs', 'search', { q: 'x' }, 'found', null]);
  assert.deepEqual([web.query, web.action.type], ['node zstd', 'search']);
  assert.equal(agent.text, 'There are two files.');
  assert.equal(compaction.codeDesktop.summary, 'Summary: the user listed files.');
  const ids = turns.flatMap(turn => turn.items.map(item => item.id));
  assert.equal(new Set(ids).size, ids.length, 'item ids are unique');

  const claude = toCodexTurns(await read(`claude-code:${IDS.claude}`));
  const items = claude.flatMap(turn => turn.items);
  assert.ok(!items.some(item => item.type === 'reasoning'), 'signature-only thinking is opaque: dropped');
  assert.ok(!items.some(item => item.type === 'userMessage' && item.content.some(part => /system-reminder|command-name/.test(part.text ?? ''))));
  const edit = items.find(item => item.type === 'fileChange');
  assert.deepEqual(edit.changes[0].path, '/work/claude/p.js');
  assert.equal(items.find(item => item.type === 'dynamicToolCall').tool, 'Read');
  assert.ok(items.find(item => item.type === 'userMessage' && item.content.some(part => part.type === 'image')));
});

test('toCodexTurns: an unanswered call gets the no-result placeholder; apply_patch text becomes file changes', async () => {
  const turns = toCodexTurns(await read(`codex:${IDS.codexLegacy}`));
  const items = turns.flatMap(turn => turn.items);
  const commands = items.filter(item => item.type === 'commandExecution');
  assert.equal(commands[0].exitCode, 1);
  assert.equal(commands[0].status, 'failed');
  assert.equal(commands.at(-1).aggregatedOutput, NO_RESULT_TEXT);
  assert.equal(commands.at(-1).exitCode, null);
  const change = items.find(item => item.type === 'fileChange');
  assert.deepEqual(change.changes.map(entry => [entry.path, entry.kind.type]), [['src/x.js', 'update']]);
  assert.ok(!items.some(item => item.type === 'userMessage' && item.content.some(part => /user_instructions/.test(part.text ?? ''))));
  assert.deepEqual(patchChanges('*** Begin Patch\n*** Add File: a\n+x\n*** Delete File: b\n*** End Patch').map(entry => entry.kind.type), ['add', 'delete']);
});

test('toTranscriptText: header, tools, no reasoning or injected text, no opaque payloads', async () => {
  const { text, truncated } = toTranscriptText(await read(`codex:${IDS.codexLegacy}`));
  assert.equal(truncated, false);
  assert.match(text, /^Conversation imported from Codex\nTitle: Bug fix\nWorking directory: \/work\/beta\n/);
  assert.match(text, /User:\nFix the bug\n\[image\]/);
  assert.match(text, /\[Tool: shell\]\nbash -lc npm test\n\[Result \(error\)\]\n1 failing/);
  assert.match(text, new RegExp(`\\[Tool: shell\\]\\nbash -lc git push\\n\\[Result\\]\\n\\${NO_RESULT_TEXT.slice(0, -1)}\\)`));
  assert.doesNotMatch(text, /ENC|Plan the fix|user_instructions/);
  const without = toTranscriptText(await read(`codex:${IDS.codexLegacy}`), { includeTools: false }).text;
  assert.doesNotMatch(without, /\[Tool:/);
});

test('toTranscriptText: tail-first truncation keeps the newest messages under a note line', () => {
  const session = synthetic(list => {
    for (let n = 0; n < 200; n++) {
      list.push('user', { parts: [{ text: `question ${n} ${'x'.repeat(200)}` }] });
      list.push('assistant', { parts: [{ text: `answer ${n}` }] });
    }
  });
  const { text, truncated } = toTranscriptText(session, { maxChars: 5000 });
  assert.equal(truncated, true);
  assert.ok(text.length <= 5000);
  const lines = text.split('\n');
  assert.equal(lines[0], 'Conversation imported from Codex');
  assert.match(lines[3], /^\[Truncated: \d+ of 400 earlier entries are not included\.\]$/);
  assert.match(text, /answer 199$/);
  assert.doesNotMatch(text, /question 0 /);
});

test('toTranscriptText: compaction-aware — from the last summary on when that fits, else the summary plus the newest', () => {
  const session = synthetic(list => {
    for (let n = 0; n < 50; n++) list.push('user', { parts: [{ text: `old ${n} ${'y'.repeat(300)}` }] });
    list.push('compaction', { compaction: { summary: 'SUMMARY OF OLD' } });
    for (let n = 0; n < 5; n++) { list.push('user', { parts: [{ text: `new ${n}` }] }); list.push('assistant', { parts: [{ text: `reply ${n} ${'z'.repeat(100)}` }] }); }
  });
  const fit = toTranscriptText(session, { maxChars: 3000 });
  assert.equal(fit.truncated, true);
  assert.match(fit.text, /the summary below covers them/);
  assert.match(fit.text, /Summary of the earlier conversation:\nSUMMARY OF OLD[\s\S]*new 0[\s\S]*reply 4 z+$/);
  assert.doesNotMatch(fit.text, /old 49/);
  const tight = toTranscriptText(session, { maxChars: 600 });
  assert.ok(tight.text.length <= 600);
  assert.match(tight.text, /SUMMARY OF OLD/);
  assert.match(tight.text, /reply 4 z+$/);
  assert.doesNotMatch(tight.text, /new 0/);
});

test('toDshSeed: user/assistant messages, tools as assistant text, same roles merged, nothing injected or opaque', async () => {
  const { messages } = toDshSeed(await read(`claude-code:${IDS.claude}`));
  assert.ok(messages.length >= 2);
  assert.ok(messages.every((message, index) => index === 0 || message.role !== messages[index - 1].role), 'roles alternate');
  assert.ok(messages.every(message => message.role === 'user' || message.role === 'assistant'));
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].text, 'Please refactor the parser');
  const assistant = messages[1].text;
  assert.match(assistant, /\[Tool: Bash\]\nnpm test\n\[Result\]\nok/);
  assert.match(assistant, /\[Tool: Edit\]\nupdate \/work\/claude\/p\.js/);
  assert.match(assistant, /Refactored\.$/);
  // The same text block by block, tool calls marked (the DeepSeek Harness seeds one content block per part).
  assert.equal(messages[1].parts.map(part => part.text).join('\n\n'), assistant);
  assert.ok(messages[1].parts.some(part => part.tool === true && /^\[Tool: Bash\]\nnpm test\n\[Result\]\nok/.test(part.text)));
  assert.ok(messages[1].parts.some(part => !part.tool && /Refactored\.$/.test(part.text)));
  assert.equal(messages[0].parts, undefined);
  // Each message carries the source's time of its first entry (an OpenCode / MiMo rewind cuts by message time).
  assert.ok(messages.every(message => Number.isSafeInteger(message.ts) && message.ts > 0), 'every message keeps its source time');
  assert.ok(messages.every((message, index) => index === 0 || message.ts >= messages[index - 1].ts), 'in source order');
  const all = messages.map(message => message.text).join('\n');
  assert.doesNotMatch(all, /SIG|system-reminder|command-name|Abandoned/);
  assert.match(all, /Summary of the earlier conversation:\nThis session is being continued/);
  const grok = toDshSeed(await read(`grok:${IDS.grok}`)).messages.map(message => message.text).join('\n');
  assert.doesNotMatch(grok, /XENC|grok thinking|project rules|system prompt/);
});
