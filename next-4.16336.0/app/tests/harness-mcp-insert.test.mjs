import test from 'node:test';
import assert from 'node:assert/strict';
import { mcpInsert, parseHeaderLines, EMPTY_OVERLAY } from '../electron/prefs/harness-profile.mjs';

test('Add server: an HTTP server keeps its auth headers, stdio its working folder, both an optional tool timeout', () => {
  assert.deepEqual(parseHeaderLines('Authorization: Bearer abc\n\nX-Team:  core '), { Authorization: 'Bearer abc', 'X-Team': 'core' });
  assert.throws(() => parseHeaderLines('no colon here'), /Name: value/);
  const http = mcpInsert({ serverName: 'github', transport: 'streamable-http', url: 'https://api.example.com/mcp', headers: { Authorization: 'Bearer abc' }, toolCallTimeoutMs: 30000 }, EMPTY_OVERLAY);
  assert.deepEqual(http.inserts[0].config, { transport: 'streamable-http', serverName: 'github', url: 'https://api.example.com/mcp', headers: { Authorization: 'Bearer abc' }, toolCallTimeoutMs: 30000 });
  const stdio = mcpInsert({ serverName: 'fs', transport: 'stdio', command: 'npx', args: ['-y', 'x'], env: {}, cwd: '/tmp/work' }, EMPTY_OVERLAY);
  assert.equal(stdio.inserts[0].config.cwd, '/tmp/work');
  assert.throws(() => mcpInsert({ serverName: 'fs', transport: 'stdio', command: 'npx', cwd: 'relative' }, EMPTY_OVERLAY), /full path/);
  assert.throws(() => mcpInsert({ serverName: 'h', transport: 'streamable-http', url: 'https://x', headers: { 'Bad Name': 'v' } }, EMPTY_OVERLAY), /Name: value/);
  assert.throws(() => mcpInsert({ serverName: 'h', transport: 'streamable-http', url: 'https://x', headers: { A: 'line\nbreak' } }, EMPTY_OVERLAY), /Name: value/);
  assert.throws(() => mcpInsert({ serverName: 'h', transport: 'streamable-http', url: 'https://x', toolCallTimeoutMs: 10 }, EMPTY_OVERLAY), /timeout/);
});
