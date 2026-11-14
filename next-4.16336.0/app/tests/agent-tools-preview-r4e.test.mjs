// R4e-preview: the preview tools' side of preview-01 (preview_start's result in the 2.42304.0 wording) and preview-15
// (a point refused because the page's zoom or size changed reaches the agent as the service worded it, also inside
// preview_batch). The tool handlers are called directly over a stand-in ctx.preview: no MCP child, no socket.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tools } from '../electron/agent-tools/preview.mjs';

const app = path.resolve(import.meta.dirname, '..');
const chunk = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-D7qSpOOc.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const tool = (name) => tools.find((entry) => entry.name === name);
const page = { ok: true, url: 'http://localhost:3001/', title: 'App' };
const start = (result) => tool('preview_start').handler({ name: 'web' }, { preview: { start: async () => result } });

test('preview-01 source: preview_start\'s three started results (2.42304.0 index.chunk-D7qSpOOc.js)', () => {
  for (const text of [
    'l.configuredPort===void 0?l.port===c?`\\nServer started on port ${l.port}.`',
    ':`\\nServer started. Configured port ${c} was unavailable, so port ${l.port} was assigned instead (autoPort is enabled). The preview is available at http://localhost:${l.port}.`',
    ':`\\nServer started. Configured port ${l.configuredPort} was unavailable, so port ${l.port} was assigned instead. The preview is available at http://localhost:${l.port}. If this server needs port ${l.configuredPort} specifically (e.g. OAuth callbacks, webhooks, CORS): free it if another process holds it, or pick a different "port" in .claude/launch.json if the OS reserves it; setting "autoPort": false there makes the start fail instead of moving.`',
  ]) assert.equal(count(chunk, text), 1, text);
  assert.equal(count(chunk, 'the next free port was used automatically'), 0);
});

test('preview-01: the scan moved it (movedFrom, D3i configuredPort) / the port changed otherwise / it kept its port', async () => {
  const server = { name: 'web', port: 3001, url: 'http://localhost:3001' };
  const moved = await start({ server, reused: false, page, assignedPort: 3001, configuredPort: 3000, movedFrom: 3000 });
  assert.equal(moved.split(' The preview shows')[0], 'Server started. Configured port 3000 was unavailable, so port 3001 was assigned instead. The preview is available at http://localhost:3001. If this server needs port 3000 specifically (e.g. OAuth callbacks, webhooks, CORS): free it if another process holds it, or pick a different "port" in .claude/launch.json if the OS reserves it; setting "autoPort": false there makes the start fail instead of moving.');
  const auto = await start({ server: { ...server, port: 52001, url: 'http://localhost:52001' }, reused: false, page, assignedPort: 52001, configuredPort: 3000 });
  assert.equal(auto.split(' The preview shows')[0], 'Server started. Configured port 3000 was unavailable, so port 52001 was assigned instead (autoPort is enabled). The preview is available at http://localhost:52001.');
  const kept = await start({ server: { ...server, port: 3000, url: 'http://localhost:3000' }, reused: false, page, assignedPort: null, configuredPort: 3000 });
  assert.match(kept, /^Server started on port 3000\. The preview shows http:\/\/localhost:3001\/ \(“App”\)\. Use read_page/);
  for (const text of [moved, auto, kept]) assert.doesNotMatch(text, /started successfully|was in use, so port/);
  // Reuse and attach keep this app's wording (they name the server / its url).
  assert.match(await start({ server, reused: true, page, configuredPort: 3000, movedFrom: 3000 }), /^Server “web” was already running and has been reused\. No new process was started\./);
  assert.match(await start({ server: { ...server, attach: true }, reused: false, page, configuredPort: 3000 }), /^Attached the preview to the configured url \(http:\/\/localhost:3001\); no process was started\./);
});

const refused = 'click: the page\'s zoom or size has changed; take a new screenshot (screenshot) before using `x`/`y`.';
const stale = (action) => `${action}: this tab's page, zoom or size has changed; take a new screenshot (screenshot) before using \`x\`/\`y\`.`;
const needs = (message) => Object.assign(new Error(message), { code: 'needs_screenshot' });

test('preview-15: click, hover and scroll pass the service\'s needs_screenshot error on as it is', async () => {
  const calls = [];
  const ctx = { preview: {
    click: async (args) => { calls.push(['click', args]); throw needs(refused); },
    hover: async (args) => { calls.push(['hover', args]); throw needs(stale('hover')); },
    scroll: async (args) => { calls.push(['scroll', args]); throw needs(stale('scroll')); },
  } };
  await assert.rejects(tool('click').handler({ x: 10, y: 20 }, ctx), (error) => error.message === refused && error.code === 'needs_screenshot');
  await assert.rejects(tool('hover').handler({ x: 10, y: 20 }, ctx), (error) => error.message === stale('hover'));
  await assert.rejects(tool('scroll').handler({ x: 10, y: 20, direction: 'down' }, ctx), (error) => error.message === stale('scroll'));
  assert.deepEqual(calls.map(([name, args]) => [name, args.x, args.y]), [['click', 10, 20], ['hover', 10, 20], ['scroll', 10, 20]]);
});

test('preview-15: in preview_batch the refused step reports the same text and the rest is not run', async () => {
  const ran = [];
  const ctx = { preview: {
    screenshot: async () => { ran.push('screenshot'); return { data: 'AAAA', mimeType: 'image/jpeg' }; },
    click: async (args) => { ran.push('click'); if (args.x !== undefined) throw needs(refused); return { clicked: args.selector, url: 'http://localhost:3000/' }; },
    type: async () => { ran.push('type'); },
  } };
  const result = await tool('preview_batch').handler({ actions: [{ name: 'click', input: { selector: 'a' } }, { name: 'click', input: { x: 5, y: 6 } }, { name: 'type', input: { text: 'x' } }] }, ctx);
  assert.equal(result.isError, true);
  assert.deepEqual(ran, ['click', 'click']);
  const text = result.content.filter((part) => part.type === 'text').map((part) => part.text);
  assert.equal(text[1], `2. click failed: ${refused}`);
  assert.equal(text[2], 'Stopped: the remaining step was not run.');
});
