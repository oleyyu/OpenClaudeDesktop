// The preview tools (electron/agent-tools/preview.mjs) as every core sees them: listed by the real stdio MCP server
// from the real agent-tools directory, turned off by Settings, and calling THIS session's preview (a fake here; the
// real service is covered by preview-service-electron.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { tools as previewTools, group } from '../electron/agent-tools/preview.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;
const TOOLS_DIR = new URL('../electron/agent-tools', import.meta.url).pathname;
const PREVIEW_TOOLS = ['preview_start', 'preview_stop', 'preview_list', 'preview_logs', 'navigate', 'screenshot', 'read_page', 'get_page_text', 'click', 'type', 'press', 'preview_inspect', 'preview_fill', 'preview_eval', 'read_console_messages', 'read_network_requests', 'resize_window', 'scroll', 'hover', 'find', 'preview_batch'];

function fakePreview(sessionId, calls) {
  return {
    sessionId,
    launchInfo: () => ({ file: '/work/.claude/launch.json' }),
    list: () => ({ launchFile: '/work/.claude/launch.json', exists: true, error: null, problems: [], servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'running', attach: false }],
      page: { url: 'http://localhost:5173/', title: 'App', loading: false }, viewport: { preset: 'responsive' } }),
    start: async (args) => { calls.push(['start', sessionId, args]); return { server: { name: 'web', port: 5173, url: 'http://localhost:5173' }, reused: false, page: { ok: true, url: 'http://localhost:5173/', title: 'App' } }; },
    stop: async (name) => { calls.push(['stop', sessionId, name]); },
    logs: () => ({ name: 'web', status: 'running', lines: ['ready', 'npm ERR! boom', 'warning: x'], error: null }),
    navigate: async (url) => ({ ok: true, url, title: 'T' }),
    screenshot: async () => ({ data: 'AAAA', mimeType: 'image/jpeg' }),
    readPage: async () => ({ url: 'http://localhost:5173/', title: 'App', text: '- button "Go" [ref_1]', truncated: false }),
    pageText: async () => ({ url: 'http://localhost:5173/', title: 'App', text: 'Hello', truncated: false }),
    click: async (args) => { calls.push(['click', sessionId, args]); return { clicked: args.ref, url: 'http://localhost:5173/' }; },
    type: async (args) => { calls.push(['type', sessionId, args]); },
    press: async ({ keys }) => ({ pressed: keys.split(' ') }),
    consoleMessages: () => [{ level: 'error', text: 'Uncaught TypeError', url: 'http://localhost:5173/app.js', line: 3 }],
    networkRequests: () => [{ method: 'GET', url: 'http://localhost:5173/api', status: 500, failed: null, type: 'Fetch' }],
    resize: async (args) => ({ preset: args.preset === 'desktop' ? 'responsive' : args.preset, width: 375, height: 812, colorScheme: args.colorScheme ?? 'system' }),
  };
}

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let seq = 0;
  readline.createInterface({ input: child.stdout }).on('line', (line) => { const message = JSON.parse(line); if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  return { child, request, close: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }) };
}

test('the module exports the preview group with valid tool definitions', () => {
  assert.equal(group, 'preview');
  assert.deepEqual(previewTools.map((tool) => tool.name), PREVIEW_TOOLS);
  for (const tool of previewTools) {
    assert.match(tool.name, /^[A-Za-z0-9_-]{1,64}$/);
    assert.equal(tool.inputSchema.type, 'object');
    assert.ok(tool.description.length > 20, tool.name);
    assert.equal(typeof tool.handler, 'function');
  }
});

test('the real tools directory is listed over stdio; the Settings switch hides the preview tools', async (t) => {
  let previewOn = true;
  const calls = [];
  const sessions = { 'thread-1': { id: 'thread-1', cwd: '/work' } };
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-preview-')), command: process.execPath, runAsNode: false,
    resolveSession: (id, meta) => sessions[id ?? meta.threadId] ?? null, isGroupEnabled: (name) => name !== 'preview' || previewOn, logger: { warn() {}, log() {} } });
  host.provide('preview', (session) => fakePreview(session.id, calls));
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-1' });
  t.after(() => server.child.kill());
  await server.request('initialize', { protocolVersion: '2025-06-18' });
  const listed = (await server.request('tools/list', {})).result.tools.map((tool) => tool.name);
  for (const name of PREVIEW_TOOLS) assert.ok(listed.includes(name), name);
  const text = async (name, args = {}) => { const result = (await server.request('tools/call', { name, arguments: args })).result; return { ...result, text: result.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n') }; };
  assert.match((await text('preview_start', { name: 'web' })).text, /Server started on port 5173\..*The preview shows http:\/\/localhost:5173\//s);
  assert.deepEqual(calls.at(-1), ['start', 'thread-1', { name: 'web', url: undefined }]);
  assert.match((await text('preview_list')).text, /- web: running · port 5173/);
  assert.equal((await text('preview_logs', { level: 'error' })).text, 'web (running):\nnpm ERR! boom');
  const shot = (await server.request('tools/call', { name: 'screenshot', arguments: {} })).result;
  assert.deepEqual(shot.content, [{ type: 'image', data: 'AAAA', mimeType: 'image/jpeg' }]);
  assert.match((await text('read_page')).text, /\[ref_1\]/);
  assert.match((await text('click', { ref: 'ref_1' })).text, /Clicked ref_1/);
  assert.match((await text('type', { text: 'hi', submit: true })).text, /Typed 2 characters and pressed Enter/);
  assert.match((await text('read_console_messages')).text, /\[error\] Uncaught TypeError \(http:\/\/localhost:5173\/app\.js:3\)/);
  assert.match((await text('read_network_requests')).text, /GET http:\/\/localhost:5173\/api → 500/);
  assert.match((await text('resize_window', { preset: 'mobile', colorScheme: 'dark' })).text, /mobile 375×812; color scheme: dark/);
  assert.equal((await text('resize_window', {})).isError, true);
  previewOn = false;
  host.notifyListChanged();
  const after = (await server.request('tools/list', {})).result.tools.map((tool) => tool.name);
  assert.ok(!after.includes('screenshot'), 'turned off: not listed');
  const refused = await text('screenshot');
  assert.equal(refused.isError, true);
  assert.match(refused.text, /turned off/);
  await server.close();
});

test('preview_start explains launch.json when the project has none', async () => {
  const start = previewTools.find((tool) => tool.name === 'preview_start');
  const ctx = { preview: { list: () => ({ exists: false, launchFile: '/work/.claude/launch.json', servers: [] }), launchInfo: () => ({ file: '/work/.claude/launch.json' }),
    start: async () => { throw Object.assign(new Error('No .claude/launch.json in /work.'), { code: 'no-config' }); } } };
  const bare = await start.handler({}, ctx);
  assert.equal(bare.isError, true);
  assert.match(bare.content[0].text, /"runtimeExecutable": "<command>"/);
  const named = await start.handler({ name: 'web' }, ctx);
  assert.match(named.content[0].text, /No \.claude\/launch\.json in \/work\. Create \/work\/\.claude\/launch\.json/);
  const failing = await start.handler({ name: 'web' }, { preview: { ...ctx.preview, start: async () => { throw Object.assign(new Error('The dev server exited during startup (code 1).'), { code: 'exited', logs: ['Error: Cannot find module x'] }); } } });
  assert.match(failing.content[0].text, /exited during startup \(code 1\)\.\nLast output:\nError: Cannot find module x\nFix the problem/);
});

test('a page reaped while hidden: console and network reads say its output is gone (2.2553.1 wording)', async () => {
  const { RECLAIMED_NOTE } = require('../electron/preview-service.cjs');
  const tool = (name) => previewTools.find((entry) => entry.name === name);
  const ctx = { preview: { consoleMessages: () => null, networkRequests: () => null,
    list: () => ({ exists: true, launchFile: '/work/.claude/launch.json', problems: [], servers: [], page: { url: 'http://localhost:5173/', title: 'App', loading: false, reclaimed: true }, viewport: { preset: 'responsive' } }) } };
  assert.equal(await tool('read_console_messages').handler({}, ctx), RECLAIMED_NOTE);
  assert.equal(await tool('read_network_requests').handler({}, ctx), RECLAIMED_NOTE);
  assert.match(await tool('preview_list').handler({}, ctx), /The preview shows http:\/\/localhost:5173\/ \(“App”\) \(closed after five minutes unseen; the next screenshot or other page tool reopens it there\)\./);
});

test('the terminal tools reach the terminal service through the same MCP server (ctx.terminals, ctx.requestApproval)', async (t) => {
  const { createTerminalService } = require('../electron/terminal-service.cjs');
  const TMP = '/private/tmp/claude-501';
  fs.mkdirSync(TMP, { recursive: true });
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(TMP, 'agent-tools-terminal-')));
  const terminals = createTerminalService({ resolveOwner: ({ sessionId }) => { if (sessionId === 'thread-1') return folder; throw new Error('Unknown session.'); },
    shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin:/bin', HOME: folder, PS1: '$ ' } });
  const approvals = [];
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-terminal-')), command: process.execPath, runAsNode: false,
    resolveSession: (id, meta) => ((id ?? meta.threadId) === 'thread-1' ? { id: 'thread-1', cwd: folder } : null),
    requestApproval: async (session, request) => { approvals.push({ session: session.id, kind: request.kind, command: request.command }); return true; }, logger: { warn() {}, log() {} } });
  host.provide('terminals', () => terminals);
  host.provide('preview', (session) => fakePreview(session.id, []));
  await host.start();
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-1' });
  t.after(async () => { server.child.kill(); host.stop(); await terminals.dispose(); fs.rmSync(folder, { recursive: true, force: true }); });
  await server.request('initialize', { protocolVersion: '2025-06-18' });
  const listed = (await server.request('tools/list', {})).result.tools.map((tool) => tool.name);
  for (const name of ['list_terminal_tabs', 'read_terminal', 'run_in_terminal', 'stop_terminal_tab', ...PREVIEW_TOOLS]) assert.ok(listed.includes(name), name);
  const call = async (name, args = {}) => (await server.request('tools/call', { name, arguments: args })).result;
  const empty = await call('list_terminal_tabs');
  assert.notEqual(empty.isError, true, JSON.stringify(empty));
  const run = await call('run_in_terminal', { command: 'echo agent-tools-ok' });
  assert.notEqual(run.isError, true, JSON.stringify(run));
  assert.deepEqual(approvals.map(({ session, kind }) => [session, kind]), [['thread-1', 'terminal-command']], 'the host’s approval reached the user');
  const tabs = await call('list_terminal_tabs');
  const tabId = /"tab_id":\s*"([^"]+)"/.exec(tabs.content[0].text)?.[1];
  assert.ok(tabId, tabs.content[0].text);
  let output = '';
  for (let i = 0; i < 20 && !output.includes('agent-tools-ok'); i++) {
    const read = await call('read_terminal', { tab_id: tabId, wait_for_output_ms: 250 });
    assert.notEqual(read.isError, true, JSON.stringify(read));
    output = read.content.map((part) => part.text).join('\n');
  }
  assert.match(output, /agent-tools-ok/);
  await server.close();
});

test('preview_inspect, preview_fill and preview_eval go through the session’s preview and read as text', async () => {
  const byName = Object.fromEntries(previewTools.map((tool) => [tool.name, tool]));
  const calls = [];
  const ctx = { preview: {
    inspect: async (args) => { calls.push(['inspect', args]); return { tag: 'button', attributes: { class: 'cta' }, box: { x: 1, y: 2, width: 30, height: 10 }, styles: { color: 'rgb(0, 0, 0)' }, text: 'Go' }; },
    fill: async (args) => { calls.push(['fill', args]); return { filled: 'input', value: 'hi' }; },
    evaluate: async (args) => { calls.push(['evaluate', args]); return { text: '42', type: 'number' }; },
  } };
  assert.match(await byName.preview_inspect.handler({ selector: '.cta', properties: ['color'] }, ctx), /<button class="cta"> at \(1, 2\), 30×10[\s\S]*color: rgb\(0, 0, 0\)/);
  assert.equal(await byName.preview_fill.handler({ ref: 'ref_1', value: 'hi' }, ctx), 'Set the input to "hi".');
  assert.equal(await byName.preview_eval.handler({ expression: '6*7' }, ctx), '42');
  assert.deepEqual(calls.map(([name]) => name), ['inspect', 'fill', 'evaluate']);
});
