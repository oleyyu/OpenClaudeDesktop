// R3b-preview step 1: the preview service (electron/preview-service.cjs) over the 2.42304.0 port policy — the next
// free port by default (preview-01), the identity check after readiness (preview-03), reservations while starts are in
// flight (preview-14), the approval card's port (preview-02 / TT-09) and the preview user agent (preview-12) — in a
// stand-in world (tests/fixtures/preview-r3b-world.mjs): no real port, process, lsof or ps.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fakeElectron, processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';

const require = createRequire(import.meta.url);
const { createPreviewService } = require('../electron/preview-service.cjs');

function project(configurations, scripts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3b-service-'));
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.writeFileSync(path.join(dir, '.claude/launch.json'), JSON.stringify({ version: '0.0.1', configurations }));
  if (scripts) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts }));
  return dir;
}
function make(t, sessions, { native = null, options = {} } = {}) {
  const world = processWorld(), fake = fakeElectron();
  const instance = createPreviewService({ ...worldOptions(world, native ? { processInfo: native(world) } : {}), ...options, electron: fake.electron, getSession: (id) => (sessions[id] ? { id, cwd: sessions[id] } : null), spawnEnv: async () => ({ PATH: '/usr/bin:/bin' }), logger: { warn() {}, info() {} } });
  t.after(async () => { await instance.dispose({ graceMs: 50 }); for (const dir of new Set(Object.values(sessions))) fs.rmSync(dir, { recursive: true, force: true }); });
  return { world, fake, instance, sender: fake.sender() };
}
const npm = (name, port, extra = {}) => ({ name, runtimeExecutable: 'npm', runtimeArgs: ['run', name], port, ...extra });
const server = (instance, sessionId, name) => instance.snapshot(sessionId).servers.find((entry) => entry.name === name);

test('a busy port moves to the next free one, for the user\'s Run and the agent\'s start; the card says so (preview-01)', async (t) => {
  const cwd = project([npm('dev', 3000)], { dev: 'next dev' });
  const { world, instance, sender } = make(t, { s1: cwd, s2: cwd });
  world.occupy(3000);
  const run = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'dev' });
  assert.equal(run.ok, true, run.message);
  assert.deepEqual({ port: run.server.port, url: run.server.url }, { port: 3001, url: 'http://localhost:3001' });
  const child = world.children.at(-1);
  assert.deepEqual({ PORT: child.options.env.PORT, args: child.args }, { PORT: '3001', args: ['run', 'dev'] });
  assert.equal(world.owner(3001), child, 'the server listens on the port it was given');
  await instance.call(sender, 'preview-server-stop', { sessionId: 's1', name: 'dev' });
  const asked = [];
  const agent = instance.forSession({ id: 's2', cwd }, { requestApproval: async (request) => { asked.push(request); return true; } });
  const started = await agent.start({ name: 'dev' });
  assert.deepEqual(asked.map(({ kind, port, portMayReassign }) => ({ kind, port, portMayReassign })), [{ kind: 'preview-server', port: 3000, portMayReassign: true }],
    'the card: "Runs in … on port 3000 (or the next free port)" (a0i)');
  assert.deepEqual({ port: started.server.port, assignedPort: started.assignedPort, configuredPort: started.configuredPort, movedFrom: started.movedFrom }, { port: 3001, assignedPort: 3001, configuredPort: 3000, movedFrom: 3000 });
  await agent.stop('dev');
});

test('"autoPort": false and a start script that pins the port keep it; the card makes no claim (preview-01)', async (t) => {
  const cwd = project([npm('fixed', 3000, { autoPort: false }), npm('pinned', 4000)], { fixed: 'next dev', pinned: 'vite --port 4000' });
  const { world, instance, sender } = make(t, { s1: cwd });
  world.occupy(3000);
  world.occupy(4000);
  const fixed = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'fixed' });
  assert.deepEqual({ ok: fixed.ok, code: fixed.code }, { ok: false, code: 'port-in-use' });
  assert.match(fixed.message, /^Port 3000 is required by this server but is in use by another process\. Nothing was started\./);
  assert.deepEqual({ status: server(instance, 's1', 'fixed').status, code: server(instance, 's1', 'fixed').error.code }, { status: 'failed', code: 'port-in-use' });
  const asked = [];
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request); return true; } });
  await assert.rejects(agent.start({ name: 'pinned' }), (error) => error.code === 'port-in-use'
    && /^Port 4000 is in use by another process \(not a preview server\)\. .*The app did not move the server you are starting to another port because its start script may pin port 4000/s.test(error.message));
  assert.deepEqual(asked.map(({ port, portMayReassign }) => ({ port, portMayReassign })), [{ port: 4000, portMayReassign: false }]);
  assert.equal(world.children.length, 0, 'nothing was run');
});

test('another folder\'s server: a movable port moves past it, a fixed one fails as port-held (ca80fca8d xq)', async (t) => {
  const first = project([npm('dev', 3000)], { dev: 'next dev' }), second = project([npm('dev', 3000)], { dev: 'next dev' }), third = project([npm('dev', 3000, { autoPort: false })], { dev: 'next dev' });
  const { instance, sender } = make(t, { s1: first, s2: second, s3: third });
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'dev' })).server.port, 3000);
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's2', name: 'dev' })).server.port, 3001);
  const held = await instance.call(sender, 'preview-server-start', { sessionId: 's3', name: 'dev' });
  assert.deepEqual({ ok: held.ok, code: held.code, heldPort: held.heldPort }, { ok: false, code: 'port-held', heldPort: 3000 });
  assert.equal(held.message, 'Port 3000 is in use by another chat\'s dev server "dev". preview_stop won\'t stop another chat\'s server. Ask the user to stop it from that chat, or to change "autoPort" in .claude/launch.json so this session can use a different port.');
});

test('the ports this folder\'s other entries pin are skipped, and a moved server\'s --port follows it (t0i, k1i)', async (t) => {
  const cwd = project([
    { name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'web', '--', '--port', '3000'], port: 3000 },
    npm('api', 3001, { autoPort: false }),
    { name: 'docs', url: 'http://localhost:3002' },
  ], { web: 'vite', api: 'node api.js' });
  const { world, instance, sender } = make(t, { s1: cwd });
  world.occupy(3000);
  const run = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
  assert.equal(run.server.port, 3003, '3001 ("autoPort": false) and 3002 (an attach url) belong to other entries');
  assert.deepEqual(world.children.at(-1).args, ['run', 'web', '--', '--port', '3003']);
  assert.match(instance.snapshot('s1').servers.find((entry) => entry.name === 'web').url, /:3003$/);
});

test('the user\'s Run of a port that can\'t move stops this folder\'s other server on it first; the agent\'s start doesn\'t (q4i)', async (t) => {
  const cwd = project([npm('one', 3000), npm('two', 3000, { autoPort: false })], { one: 'next dev', two: 'next dev' });
  const { instance, sender } = make(t, { s1: cwd });
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'one' })).server.port, 3000);
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async () => true });
  await assert.rejects(agent.start({ name: 'two' }), { code: 'port-in-use', message: 'Port 3000 is required by this server (autoPort is false) but is in use by preview server "one" (one). Ask the user if they want to stop "one" to free port 3000. If yes, call preview_stop with serverId "one" and retry.' });
  assert.equal(server(instance, 's1', 'one').status, 'running');
  const run = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'two' });
  assert.equal(run.ok, true, run.message);
  assert.equal(run.server.port, 3000);
  assert.equal(server(instance, 's1', 'one').status, 'stopped');
});

test('a start in flight holds its port: a fixed start is told it is reserved, a movable one skips it (preview-14)', async (t) => {
  const cwd = project([npm('a', 3000), npm('b', 3000, { autoPort: false }), npm('c', 3000)], { a: 'next dev', b: 'next dev', c: 'next dev' });
  const { world, instance, sender } = make(t, { s1: cwd });
  const hold = world.holdNextListen();
  const a = instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'a' });
  assert.equal(await hold.reached, 3000);
  const b = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'b' });
  assert.deepEqual({ ok: b.ok, code: b.code, message: b.message }, { ok: false, code: 'port-in-use', message: 'Port 3000 is reserved by a preview server that is currently starting. Retry shortly, or set "port" in .claude/launch.json to a different port.' });
  const c = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'c' });
  hold.release();
  assert.equal((await a).server.port, 3000);
  assert.equal(c.server.port, 3001);
});

test('preview-03: a port another server answers fails the start with the original guidance; another process is an advisory', async (t) => {
  const cwd = project([npm('api', 3000), npm('web', 3001, { autoPort: false }), npm('site', 4000)], { api: 'node api.js', web: 'vite', site: 'vite' });
  const { world, instance, sender } = make(t, { s1: cwd }, { native: (w) => w.native() });
  let apiChild = null;
  // The api server also answers 3001 (say, its websocket port); the web server binds 5173 whatever PORT says.
  world.behave = (child) => {
    if (child.args[1] === 'api') { apiChild = child; child.listen(); return true; }
    if (child.args[1] === 'web') { apiChild.listen(3001); child.listen(5173); return true; }
    if (child.args[1] === 'site') { world.occupy(4000, { pid: 4343 }); child.listen(5174); return true; }
    return false;
  };
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'api' })).ok, true);
  const web = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
  assert.deepEqual({ ok: web.ok, code: web.code }, { ok: false, code: 'identity' });
  assert.match(web.message, /^This server is listening on port 5173, not on its assigned port 3001\. Port 3001 is answered by a different process, so the preview pane would show that process's content instead of this server\. Port 3001 is in use by another preview server from this chat\. Call preview_stop for that server/);
  const logs = await instance.call(sender, 'preview-server-logs', { sessionId: 's1', name: 'web' });
  assert.ok(logs.lines.includes(web.message), 'the guidance is in the server output');
  assert.equal(world.children.find((child) => child.args[1] === 'web').killed, true, 'the process is stopped');
  // site: 4000 is free when it is chosen, then another process (not a preview server) takes it and the server listens
  // on 5174 instead — running, with the advisory in its output.
  const site = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'site' });
  assert.equal(site.ok, true, site.message);
  const siteLogs = await instance.call(sender, 'preview-server-logs', { sessionId: 's1', name: 'site' });
  assert.ok(siteLogs.lines.some((line) => line.startsWith('This server is listening on port 5174, not on its assigned port 4000. Port 4000 is answered by a different process')), siteLogs.lines.join('\n'));
});

test('preview-03: without the native process calls the original lets the server run, and so does the gate off', async (t) => {
  for (const setup of [{}, { native: (w) => w.native(), options: { autoPortGate: () => false } }]) {
    const cwd = project([npm('web', 3001)], { web: 'vite' });
    const { world, instance, sender } = make(t, { s1: cwd }, setup);
    world.behave = (child) => { world.occupy(3001, { pid: 4545 }); child.listen(5173); return true; };
    const run = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
    assert.equal(run.ok, true, run.message);
    assert.equal(run.server.status, 'running');
    assert.ok(!(await instance.call(sender, 'preview-server-logs', { sessionId: 's1', name: 'web' })).lines.some((line) => /assigned port/.test(line)), 'no identity output');
  }
});

test('GrowthBook 2711562102 off: only "autoPort": true moves, to an OS-assigned port, and the card claims nothing', async (t) => {
  const cwd = project([npm('dev', 3000), npm('auto', 3000, { autoPort: true })], { dev: 'next dev', auto: 'next dev' });
  const { world, instance } = make(t, { s1: cwd }, { options: { autoPortGate: () => false } });
  world.occupy(3000);
  const asked = [];
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request); return true; } });
  await assert.rejects(agent.start({ name: 'dev' }), { code: 'port-in-use', message: /^Port 3000 is in use by another process \(not a preview server\)\. .*Ask the user: does this server need port 3000 specifically/s });
  const auto = await agent.start({ name: 'auto' });
  assert.ok(auto.server.port >= 52000, `an OS-assigned port (${auto.server.port})`);
  assert.equal(auto.movedFrom, undefined);
  assert.deepEqual(asked.map(({ port, portMayReassign }) => ({ port, portMayReassign })), [{ port: 3000, portMayReassign: false }, { port: 3000, portMayReassign: false }]);
});

test('preview-12: the preview partition gives sites the standard agent and Claude hosts the app\'s, without Electron', async (t) => {
  const cwd = project([npm('dev', 3000)], { dev: 'next dev' });
  const { fake, instance, sender } = make(t, { s1: cwd });
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'https://example.com/' }).catch(() => {});
  const sites = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.52 Safari/537.36';
  const claude = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) OpenClaude/1.0.0 Chrome/142.0.7444.52 Safari/537.36';
  assert.deepEqual(fake.partition.setUserAgents, [sites], 'set once for the partition');
  const send = (url) => new Promise((resolve) => fake.partition.handlers.beforeSendHeaders({ url, requestHeaders: { 'User-Agent': sites } }, resolve));
  assert.deepEqual(await send('https://claude.ai/'), { requestHeaders: { 'User-Agent': claude } });
  assert.deepEqual(await send('http://localhost:3000/'), {});
});
