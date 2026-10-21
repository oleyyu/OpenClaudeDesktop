// The Chrome bridge's P0 channel without Chrome: protocol framing, the fixed extension ID, the host manifest, and
// native-host.cjs routing between a fake extension (its stdin/stdout, as Chrome drives it) and bridge-client.cjs.
// The real end-to-end run (headless Chrome for Testing + claude-ext/) is `npm run check:chrome-bridge`.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { encode, FrameReader, EXTENSION_ID, HOST_NAME } = require('../electron/browser/protocol.cjs');
const { ChromeBridgeClient, listSockets } = require('../electron/browser/bridge-client.cjs');
const { installNativeHost } = require('../electron/browser/install.cjs');
const HOST = new URL('../electron/browser/native-host.cjs', import.meta.url).pathname;
const EXT_MANIFEST = new URL('../../claude-ext/manifest.json', import.meta.url).pathname;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test, timeoutMs = 5000) {
  const end = Date.now() + timeoutMs;
  for (;;) { const value = await test(); if (value) return value; if (Date.now() > end) throw new Error('timed out'); await wait(20); }
}

test('frames survive split and coalesced chunks', () => {
  const got = [];
  const reader = new FrameReader((message) => got.push(message));
  const bytes = Buffer.concat([encode({ method: 'notification', params: { type: 'hello', text: 'héllo' } }), encode({ method: 'get_status', tool_use_id: 'a' })]);
  for (let i = 0; i < bytes.length; i += 3) reader.push(bytes.subarray(i, i + 3));
  assert.deepEqual(got, [{ method: 'notification', params: { type: 'hello', text: 'héllo' } }, { method: 'get_status', tool_use_id: 'a' }]);
  assert.equal(bytes.readUInt32LE(0), Buffer.byteLength(JSON.stringify(got[0])));
});

test('the manifest key gives the fixed extension ID', () => {
  const manifest = JSON.parse(fs.readFileSync(EXT_MANIFEST, 'utf8'));
  const hex = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32);
  assert.equal([...hex].map((digit) => String.fromCharCode(97 + parseInt(digit, 16))).join(''), EXTENSION_ID);
  assert.ok(manifest.permissions.includes('nativeMessaging'));
});

test('the host manifest names an absolute launcher and only the bridge extension', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-install-'));
  try {
    const { manifest, launcherPath } = installNativeHost({ manifestDir: path.join(dir, 'hosts'), launcherPath: path.join(dir, 'host.sh'), runtime: process.execPath, socketDir: path.join(dir, 's') });
    assert.equal(manifest.name, HOST_NAME);
    assert.ok(path.isAbsolute(manifest.path));
    assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${EXTENSION_ID}/`]);
    assert.equal(fs.statSync(launcherPath).mode & 0o111, 0o111);
    assert.match(fs.readFileSync(launcherPath, 'utf8'), /exec '.+' '.+native-host\.cjs' "\$@"/);
    assert.throws(() => installNativeHost({ manifestDir: 'relative', launcherPath: path.join(dir, 'x.sh') }), /absolute/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the host routes execute_tool to the extension and the answer back to the asking client', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-'));
  const host = spawn(process.execPath, [HOST, `chrome-extension://${EXTENSION_ID}/`], { env: { PATH: process.env.PATH, OPENCLAUDE_CHROME_BRIDGE_DIR: dir }, stdio: ['pipe', 'pipe', 'ignore'] });
  const toExtension = [];
  const reader = new FrameReader((message) => toExtension.push(message));
  host.stdout.on('data', (chunk) => reader.push(chunk));
  const clients = [];
  try {
    const socket = await until(() => listSockets(dir)[0]);
    assert.equal(socket.pid, host.pid);
    assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
    host.stdin.write(encode({ method: 'notification', params: { type: 'hello', extensionId: EXTENSION_ID, version: '0.1.0' }, tool_use_id: null }));
    const [a, b] = [await ChromeBridgeClient.connect({ dir }), await ChromeBridgeClient.connect({ dir })];
    clients.push(a, b);
    const status = await until(async () => { const value = await a.getStatus(); return value.connected ? value : null; });
    assert.equal(status.extension.extensionId, EXTENSION_ID);
    assert.equal(status.host.origin, `chrome-extension://${EXTENSION_ID}/`);

    const heardByB = [];
    b.on('notification', (params) => heardByB.push(params));
    const answer = a.executeTool('ping', { n: 1 }, { toolUseId: 'toolu_1' });
    const request = await until(() => toExtension.find((message) => message.tool_use_id === 'toolu_1'));
    assert.deepEqual(request, { method: 'execute_tool', params: { name: 'ping', args: { n: 1 } }, tool_use_id: 'toolu_1' });
    host.stdin.write(encode({ method: 'tool_response', params: { result: { pong: true } }, tool_use_id: 'toolu_1' }));
    assert.deepEqual(await answer, { pong: true });

    const failing = b.executeTool('read_page', {}, { toolUseId: 'toolu_2' });
    await until(() => toExtension.find((message) => message.tool_use_id === 'toolu_2'));
    host.stdin.write(encode({ method: 'tool_response', params: { error: { code: 'stale_ref', message: 'ref_3 is gone' } }, tool_use_id: 'toolu_2' }));
    await assert.rejects(failing, (error) => error.code === 'stale_ref' && /ref_3/.test(error.message));

    host.stdin.write(encode({ method: 'notification', params: { type: 'tab_changed', tabId: 7 }, tool_use_id: null }));
    await until(() => heardByB.some((params) => params.type === 'tab_changed'));

    await assert.rejects(a.executeTool('slow', {}, { timeoutMs: 100 }), (error) => error.code === 'timeout');

    const exited = new Promise((resolve) => host.once('exit', resolve));
    host.stdin.end();
    assert.equal(await exited, 0);
    assert.equal(fs.existsSync(socket.file), false, 'the socket is removed when Chrome closes the port');
    const log = fs.readFileSync(path.join(dir, 'host.log'), 'utf8');
    for (const line of ['electron→host execute_tool ping [toolu_1]', 'host→ext execute_tool ping [toolu_1]', 'ext→host tool_response ok [toolu_1]', 'host→electron tool_response ok [toolu_1]']) assert.ok(log.includes(line), line);
  } finally {
    for (const client of clients) client.close();
    if (host.exitCode === null) host.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('no host running is a clear not_connected error', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-'));
  try { await assert.rejects(ChromeBridgeClient.connect({ dir }), (error) => error.code === 'not_connected'); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// claude-ext's ref bookkeeping and URL rules, with a stub of the chrome APIs they touch.
async function extensionModules() {
  const listeners = { updated: [], removed: [] };
  globalThis.chrome ??= {
    storage: { session: { get: async () => ({}), set: async () => {} } },
    tabs: { onUpdated: { addListener: (fn) => listeners.updated.push(fn) }, onRemoved: { addListener: (fn) => listeners.removed.push(fn) } },
  };
  const refs = await import('../../claude-ext/refs.js');
  const tabs = await import('../../claude-ext/tabs.js');
  return { refs, tabs, listeners };
}
const codeOf = (fn) => { try { fn(); } catch (error) { return error.code; } return null; };

test('refs: read_page voids older refs, other tabs are refused, navigation makes them stale', async () => {
  const { refs, listeners } = await extensionModules();
  const read = (tabId, names, next) => refs.withRefs(() => refs.record(tabId, Object.fromEntries(names.map((name) => [name, { role: 'button', name }])), next, { replace: true }));
  await read(1, ['ref_1', 'ref_2'], 3);
  assert.equal(refs.checkRef(1, 'ref_2').tabId, 1);
  await refs.withRefs(() => refs.record(1, { ref_3: { role: 'link', name: 'x' } }, 4, { replace: false })); // find joins
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_1')), null);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_3')), null);
  await read(1, ['ref_4'], 5);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_1')), 'stale_ref');
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_3')), 'stale_ref');
  await read(2, ['ref_5'], 6);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_5')), 'ref_wrong_tab');
  assert.equal(codeOf(() => refs.checkRef(2, 'ref_4')), 'ref_wrong_tab');
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_99')), 'unknown_ref');
  assert.equal(codeOf(() => refs.checkRef(1, 'button')), 'bad_request');
  for (const fn of listeners.updated) fn(1, { status: 'loading' });
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_4')), 'stale_ref');
  assert.equal(codeOf(() => refs.checkRef(2, 'ref_5')), null);
});

test('navigate takes http(s) URLs and bare hosts only', async () => {
  const { tabs } = await extensionModules();
  assert.equal(tabs.normalizeUrl('example.com'), 'https://example.com/');
  assert.equal(tabs.normalizeUrl('localhost:3000/a'), 'https://localhost:3000/a');
  assert.equal(tabs.normalizeUrl('http://127.0.0.1:8080/x?y=1'), 'http://127.0.0.1:8080/x?y=1');
  for (const bad of ['chrome://version', 'javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi']) assert.equal(codeOf(() => tabs.normalizeUrl(bad)), 'bad_url', bad);
  assert.equal(codeOf(() => tabs.normalizeUrl('  ')), 'bad_request');
});
