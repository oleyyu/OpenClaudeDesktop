// Import Chat History model helpers and converters (electron/chat-import/model.mjs, convert.mjs): Codex turns the host
// renders, the text hand-off with compaction-aware tail-first truncation, and the DeepSeek seed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHome, IDS } from './fixtures/chat-import/build-home.mjs';
import { readSession, clearCache } from '../electron/chat-import/catalog.mjs';
import { displayDiff, toCodexTurns, toDshSeed, toolCallDisplay, toTranscriptText, pairTools, patchChanges } from '../electron/chat-import/convert.mjs';
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
  // The apply_patch hunk gets a numbered header, so the transcript counts and draws it (transcript-sdk-tools structuredPatch).
  assert.deepEqual(change.changes, [{ path: '/work/alpha/a.txt', kind: { type: 'update', move_path: null }, diff: '@@ -1,1 +1,1 @@\n-old\n+new\n' }]);
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
  assert.equal(edit.changes[0].diff, '@@ -1,1 +1,1 @@\n-a\n+b\n', 'the edit\'s old and new text as a hunk');
  // Read shows as the read action the bridges give their agents' reads (was a dynamicToolCall 'Read').
  const readRow = items.find(item => item.type === 'commandExecution' && item.commandActions[0].type === 'read');
  assert.deepEqual(readRow.commandActions, [{ type: 'read', command: 'Read /work/claude/p.js', name: 'p.js', path: '/work/claude/p.js' }]);
  assert.ok(!items.some(item => item.type === 'dynamicToolCall'));
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

test('toDshSeed: each tool block carries its row (toolCallDisplay) beside the same text', async () => {
  const { messages } = toDshSeed(await read(`claude-code:${IDS.claude}`));
  const tools = messages.flatMap(message => message.parts ?? []).filter(part => part.tool);
  const bash = tools.find(part => /^\[Tool: Bash\]/.test(part.text));
  assert.deepEqual([bash.call.type, bash.call.command], ['commandExecution', 'npm test']);
  const edit = tools.find(part => /^\[Tool: Edit\]/.test(part.text));
  assert.deepEqual(edit.call, { type: 'fileChange', changes: [{ path: '/work/claude/p.js', kind: { type: 'update', move_path: null }, diff: '@@ -1,1 +1,1 @@\n-a\n+b\n' }] });
  assert.ok(messages.flatMap(message => message.parts ?? []).every(part => part.tool === true || part.call === undefined), 'only tool blocks carry one');
});

test('toolCallDisplay: each source\'s calls as the row a native call of that kind shows', () => {
  const call = (name, args, result = null, category) => toolCallDisplay({ name, args, category: category ?? toolCategory(name) }, result);
  // Shell: Claude Code Bash, Gemini / Qwen run_shell_command, Codex shell (an argv), OpenCode bash.
  assert.deepEqual(call('Bash', { command: 'npm test' }, { text: 'ok' }), { type: 'commandExecution', command: 'npm test', cwd: '' });
  assert.deepEqual(call('run_shell_command', { command: 'ls', dir_path: '/w' }, { text: 'Output: a', display: { text: 'a', exitCode: 2 } }),
    { type: 'commandExecution', command: 'ls', cwd: '', exitCode: 2, output: 'a' }, 'the display text and its exit code (Gemini\'s wrapper)');
  assert.deepEqual(call('shell', { command: ['bash', '-lc', 'git status'], workdir: '/w' }, { text: '', exitCode: 1 }), { type: 'commandExecution', command: 'bash -lc git status', cwd: '/w', exitCode: 1 });
  // Edits: old / new text as a numbered hunk, an added file with its content, apply_patch sections numbered.
  assert.deepEqual(call('replace', { file_path: '/w/a.js', old_string: 'x\n\ny', new_string: 'z' }).changes,
    [{ path: '/w/a.js', kind: { type: 'update', move_path: null }, diff: '@@ -1,3 +1,1 @@\n-x\n-\n-y\n+z\n' }], 'blank lines stay');
  assert.deepEqual(call('write_file', { file_path: '/w/n.txt', content: 'hi\n' }, null, 'edit').changes, [{ path: '/w/n.txt', kind: { type: 'add' }, diff: 'hi\n' }]);
  const patch = '*** Begin Patch\n*** Update File: src/x.js\n@@ fn\n-a\n+b\n@@ other\n c\n-d\n*** Add File: src/n.js\n+new\n*** End Patch';
  assert.deepEqual(call('apply_patch', { input: patch }).changes, [
    { path: 'src/x.js', kind: { type: 'update', move_path: null }, diff: '@@ -1,1 +1,1 @@\n-a\n+b\n@@ -2,2 +2,1 @@\n c\n-d\n' },
    { path: 'src/n.js', kind: { type: 'add' }, diff: 'new\n' },
  ]);
  assert.deepEqual(call('Edit', { file_path: '/w/a.js' }), { type: 'dynamicToolCall', tool: 'Edit', arguments: { file_path: '/w/a.js' } }, 'no diff: the file it edited');
  // Reads, searches and listings as the bridges' file rows.
  assert.deepEqual(call('read_file', { absolute_path: '/w/a.js' }).commandActions, [{ type: 'read', command: 'Read /w/a.js', name: 'a.js', path: '/w/a.js' }]);
  assert.deepEqual(call('grep_search', { pattern: 'TODO', dir_path: '/w', include: '*.js' }).commandActions,
    [{ type: 'search', command: 'grep_search TODO', query: 'TODO', path: '/w', tool: 'grep', arguments: { pattern: 'TODO', path: '/w', glob: '*.js' } }]);
  assert.deepEqual(call('Glob', { pattern: '**/*.md' }).commandActions, [{ type: 'search', command: 'Glob **/*.md', query: '**/*.md', path: null, tool: 'glob', arguments: { pattern: '**/*.md' } }]);
  assert.deepEqual(call('list_directory', { dir_path: '/w' }).commandActions, [{ type: 'listFiles', command: 'ls /w', path: '/w' }]);
  // Web: a search with its query, a fetch with its URL.
  assert.deepEqual(call('google_web_search', { query: 'node zstd' }, null, 'web'), { type: 'webSearch', query: 'node zstd', action: { type: 'search', query: 'node zstd', queries: null } });
  assert.deepEqual(call('WebFetch', { url: 'https://e.com/x', prompt: 'p' }, null, 'web'), { type: 'webSearch', query: 'https://e.com/x', action: { type: 'openPage', url: 'https://e.com/x' } });
  // MCP and anything else: its arguments as JSON.
  assert.deepEqual(toolCallDisplay({ name: 'mcp__docs__search', args: { q: 'x' }, category: 'mcp', mcp: { server: 'docs', tool: 'search' } }), { type: 'mcpToolCall', server: 'docs', tool: 'search', arguments: { q: 'x' } });
  assert.deepEqual(call('write_todos', { todos: [{ description: 'a' }] }, null, 'other'), { type: 'dynamicToolCall', tool: 'write_todos', arguments: { todos: [{ description: 'a' }] } });
  // Bounded: a long argument is clipped, a call past 32 000 characters loses its diffs, then its arguments.
  assert.ok(call('Bash', { command: 'x'.repeat(9000) }).command.length < 4100);
  const huge = call('apply_patch', { changes: ['/w/a.js', '/w/b.js'].map(path => ({ path, kind: 'update', diff: `@@ -1,1 +1,1 @@\n-${'a'.repeat(18000)}\n+b\n` })) });
  assert.deepEqual(huge, { type: 'dynamicToolCall', tool: 'Edit', arguments: { file_path: '/w/a.js' } });
  assert.deepEqual(call('Other', Object.fromEntries(Array.from({ length: 40 }, (_, n) => [`k${n}`, 'v'.repeat(3000)])), null, 'other'), { type: 'dynamicToolCall', tool: 'Other' });
});

test('displayDiff: numbered hunks pass through; apply_patch hunks get numbers; an added file\'s + lines become its content', () => {
  assert.equal(displayDiff('update', '@@ -3,1 +3,1 @@\n-a\n+b\n'), '@@ -3,1 +3,1 @@\n-a\n+b\n');
  assert.equal(displayDiff('update', '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n'), '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n');
  assert.equal(displayDiff('update', '@@\n-a\n+b\n'), '@@ -1,1 +1,1 @@\n-a\n+b\n');
  assert.equal(displayDiff('add', '+one\n+two\n'), 'one\ntwo\n');
  assert.equal(displayDiff('add', 'plain content'), 'plain content');
  assert.equal(displayDiff('delete', '-gone\n'), '-gone\n');
  assert.equal(displayDiff('update', ''), '');
});
