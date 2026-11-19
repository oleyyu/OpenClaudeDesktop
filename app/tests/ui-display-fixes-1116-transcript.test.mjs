// ui-display-bugs-20261116 (analysis/ui-display-bugs-20261116/REPORT.md), transcript lane:
//   U-10  a mark_chapter call is the renderer's {kind: "chapter"} item (cb0636f7b V), not a tool row; its id is the one
//         the Session chapters rail jumps to (epitaxy-ch-<id>).
import test from 'node:test';
import assert from 'node:assert/strict';
import { codeTranscriptEntries } from '../src/code-transcript-entries.mjs';
import { chapterOf } from '../src/agent-tool-titles.mjs';
import { sessionChapters } from '../src/session-chapters-model.mjs';

const user = (id, turnId) => ({ type: 'userMessage', id, turnId, content: [{ type: 'text', text: id }] });
const agent = (id, turnId, text = id) => ({ type: 'agentMessage', id, turnId, text });
const chapter = (id, turnId, args, extra = {}) => ({ id, turnId, type: 'mcpToolCall', server: 'code_desktop', tool: 'mark_chapter', status: 'completed',
  arguments: args, result: { content: [{ type: 'text', text: 'ok' }] }, error: null, ...extra });

test('U-10: a mark_chapter call is a chapter item with the rail\'s id, title and summary; no tool item is left', () => {
  const items = [user('u1', 't1'), chapter('ch1', 't1', { title: 'Codebase exploration', summary: 'Read the files' }), agent('m1', 't1'),
    chapter('ch2', 't1', { title: 'Fix' })];
  const entries = codeTranscriptEntries(items);
  const reply = entries.filter((entry) => entry.author === 'assistant');
  assert.equal(reply.length, 1);
  assert.deepEqual(reply[0].items.map((item) => item.kind), ['chapter', 'text', 'chapter']);
  assert.deepEqual(reply[0].items[0], { kind: 'chapter', id: 'ch1', title: 'Codebase exploration', summary: 'Read the files' });
  assert.deepEqual(reply[0].items[2], { kind: 'chapter', id: 'ch2', title: 'Fix' });
  // The rail's chapters carry the same ids (main.jsx: sessionChapters(shownRows, …, { chapterOf })).
  const rail = sessionChapters(items, null, { chapterOf });
  assert.deepEqual(rail.map((one) => one.id), ['ch1', 'ch2']);
});

test('U-10: a failed or untitled mark_chapter stays a tool call (the host has no heading for it)', () => {
  const entries = codeTranscriptEntries([user('u1', 't1'), chapter('ch1', 't1', { title: 'X' }, { status: 'failed', result: null, error: { message: 'no' } }),
    chapter('ch2', 't1', { title: '  ' })]);
  const kinds = entries.filter((entry) => entry.author === 'assistant').flatMap((entry) => entry.items.map((item) => item.kind));
  assert.ok(!kinds.includes('chapter'));
  assert.ok(kinds.length > 0);
});
