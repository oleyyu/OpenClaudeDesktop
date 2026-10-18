// R3b-preview: the 2.42304.0 dev-server port policy and identity check (electron/generated/r3b-preview-ports.mjs, run
// through its host side electron/r3b-preview-host.mjs) and the preview user agent (generated/r3b-preview-user-agent.mjs),
// over a stand-in socket world (tests/fixtures/preview-r3b-world.mjs): no real port, process, lsof or ps.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { processWorld } from './fixtures/preview-r3b-world.mjs';
import { applyPreviewUserAgent, createPreviewPortHost, hostProcessInfo, parseLsofListeners, portEntry, processLineage } from '../electron/r3b-preview-host.mjs';
import { isClaudeHost, previewRequestUserAgent, previewUserAgents } from '../electron/generated/r3b-preview-user-agent.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../electron/generated/r3b-preview-manifest.json', import.meta.url), 'utf8'));

function policy({ servers = [], native = null, gate = true } = {}) {
  const world = processWorld();
  const warnings = [];
  const ports = createPreviewPortHost({ registry: () => servers, logger: { warn: (...args) => warnings.push(args) }, netApi: world.net, wait: async () => {}, processes: native?.(world) ?? null, autoPortGate: () => gate });
  return { world, ports, warnings, servers };
}
function folder(scripts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3b-ports-'));
  if (scripts) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts }));
  return dir;
}
const npmDev = (cwd, extra = {}) => ({ name: 'web', command: 'npm', args: ['run', 'dev'], cwd, port: 3000, autoPort: undefined, ...extra });

test('the generated policy is the 2.42304.0 chunk, its host values and call sites anchored', () => {
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.equal(manifest.source, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js');
  const ports = manifest.targets['r3b-preview-ports.mjs'];
  assert.deepEqual(Object.keys(ports.host), ['n', 'p', 'g', 'N', 'ih', 'xi', 'zy', 'Y0', 'J0', 'a2', 'mM', '$0']);
  assert.deepEqual(ports.host.a2.members, ['servers'], 'only the registry rows are read from a2');
  assert.deepEqual(ports.host.g.members, ['Socket', 'createServer']);
  for (const [local, exported] of Object.entries({ I2i: 'resolvePort', P2i: undefined, O0i: 'verifyServerIdentity', a0i: 'portMayReassign', o0i: 'portRetargetability', t0i: 'pinnedPortsOf', k1i: 'rewritePortArgs', q4i: 'conflictingServers' }))
    assert.equal(ports.bindings[local].exportedAs, exported, local);
  assert.ok(ports.callSites.a2.needles.some((needle) => needle.includes('O0i(n,t.port,c.pid,e,i)')));
  assert.ok(ports.callSites.D3i.needles.some((needle) => needle.includes('configuredPort:_.movedFrom')));
  assert.ok(manifest.targets['r3b-preview-user-agent.mjs'].callSites.Pfi.needles.some((needle) => needle.includes('hy("3868149774")')));
  assert.deepEqual(manifest.targets['r3b-preview-launch-fields.mjs'].exports, ['launchPortFields', 'launchUrlPortMismatch']);
});

test('a busy configured port moves to the next free one; a free one stays (I2i → P2i)', async () => {
  const { world, ports } = policy();
  assert.deepEqual(await ports.resolvePort(3000, undefined, '/p', true, undefined, true), { port: 3000 });
  world.occupy(3000);
  assert.deepEqual(await ports.resolvePort(3000, undefined, '/p', true, undefined, true), { port: 3001, movedFrom: 3000 });
  ports.releasePort(3001);
  // autoPort true scans the same way; the ports other entries pin are skipped (3001 here), and so is a ::1 listener.
  world.occupy(3002, { host: '::1' });
  assert.deepEqual(await ports.resolvePort(3000, true, '/p', true, new Set([3001]), true), { port: 3003, movedFrom: 3000 });
  assert.equal(ports.scanSpan, 20);
});

test('the scan skips live servers and held reservations, then falls back to an OS port', async () => {
  const servers = [{ serverId: 'api', name: 'api', port: 3000, status: 'running', cwd: '/p', sessionId: '/p' }, { serverId: 'old', name: 'old', port: 3001, status: 'stopped', cwd: '/p', sessionId: '/p' }];
  const { world, ports } = policy({ servers });
  assert.deepEqual(await ports.resolvePort(3000, undefined, '/p', true, undefined, true), { port: 3001, movedFrom: 3000 }, 'a stopped server holds nothing');
  assert.equal(ports.pendingAllocations.has(3001), true, 'the pending reservation stays until the host registers the server');
  assert.deepEqual(await ports.resolvePort(3000, undefined, '/p', true, undefined, true), { port: 3002, movedFrom: 3000 });
  for (let port = 3000; port <= 3020; port++) world.occupy(port);
  const fallback = await ports.resolvePort(3000, undefined, '/p', true, undefined, true);
  assert.equal(fallback.movedFrom, 3000);
  assert.ok(fallback.port >= 52000, `an OS-assigned port (${fallback.port})`);
});

test('a port that may not move fails with the original guidance', async () => {
  const { world, ports } = policy();
  world.occupy(3000);
  await assert.rejects(ports.resolvePort(3000, false, '/p', true, undefined, true), (error) => error instanceof ports.PortInUseError && error.source === 'external' && error.port === 3000
    && error.message === 'Port 3000 is required by this server but is in use by another process. Nothing was started. If that process is already this project\'s dev server (e.g. the user started it in a terminal), preview it instead of starting another copy: call navigate with url "http://localhost:3000" and confirm the page is this app. If it is not this app: Run `lsof -i :3000` to find what\'s using it, then free port 3000 and try again.');
  // Not movable because the start script may pin the port (retargetable false): D2i's guidance.
  await assert.rejects(ports.resolvePort(3000, undefined, '/p', true, undefined, false), { message: /^Port 3000 is in use by another process \(not a preview server\)\. .*The app did not move the server you are starting to another port because its start script may pin port 3000/s });
  // The gate off: only "autoPort": true moves, to an OS-assigned port (no movedFrom), as before 2.37337.1.
  const legacy = await ports.resolvePort(3000, true, '/p', false, undefined, true);
  assert.equal(legacy.movedFrom, undefined);
  assert.ok(legacy.port >= 52000);
  await assert.rejects(ports.resolvePort(3000, undefined, '/p', false, undefined, true), { message: /^Port 3000 is in use by another process \(not a preview server\)\. .*Ask the user: does this server need port 3000 specifically/s });
});

test('another folder\'s server ("another chat") and this folder\'s are named differently', async () => {
  const servers = [{ serverId: 'web', name: 'web', port: 3000, status: 'running', cwd: '/other', sessionId: '/other' }, { serverId: 'api', name: 'api', port: 4000, status: 'starting', cwd: '/p', sessionId: '/p' }];
  const { ports } = policy({ servers });
  await assert.rejects(ports.resolvePort(3000, false, '/p', true, undefined, true), { message: 'Port 3000 is in use by another chat\'s dev server "web". preview_stop won\'t stop another chat\'s server. Ask the user to stop it from that chat, or to change "autoPort" in .claude/launch.json so this session can use a different port.' });
  await assert.rejects(ports.resolvePort(4000, false, '/p', true, undefined, true), { message: 'Port 4000 is required by this server (autoPort is false) but is in use by preview server "api" (api). Ask the user if they want to stop "api" to free port 4000. If yes, call preview_stop with serverId "api" and retry.' });
  await assert.rejects(ports.resolvePort(4000, undefined, '/p', true, undefined, false), { message: /^Port 4000 is in use by preview server "api" \(api\)\. The app did not move the server/ });
});

test('a start caught mid-allocation reserves its port (preview-14: o2 / s2 → t2 / n2)', async () => {
  const { world, ports } = policy();
  const hold = world.holdNextListen();
  const first = ports.resolvePort(3000, undefined, '/p', true, undefined, true);
  assert.equal(await hold.reached, 3000);
  await assert.rejects(ports.resolvePort(3000, false, '/q', true, undefined, true), { message: 'Port 3000 is reserved by a preview server that is currently starting. Retry shortly, or set "port" in .claude/launch.json to a different port.' });
  await assert.rejects(ports.resolvePort(3000, undefined, '/q', true, undefined, false), { message: /^Port 3000 is reserved by a preview server that is currently starting\. The app did not move/ });
  // A movable start skips the held port instead.
  const second = await ports.resolvePort(3000, undefined, '/q', true, undefined, true);
  hold.release();
  assert.deepEqual(await first, { port: 3000 });
  assert.deepEqual(second, { port: 3001, movedFrom: 3000 });
  ports.releasePort(3000);
  assert.equal(ports.pendingAllocations.has(3000), false);
  assert.equal(ports.exactPortBinds.has(3000), false);
});

test('start scripts that pin the port keep it from moving (i0i / o0i / a0i / t0i)', async (t) => {
  const { ports } = policy();
  const pinned = folder({ dev: 'vite --port 3000' }), other = folder({ dev: 'vite --port 5173' }), free = folder({ dev: 'next dev' }), chained = folder({ dev: 'npm run serve', serve: 'PORT=3000 node server.js' });
  t.after(() => { for (const dir of [pinned, other, free, chained]) fs.rmSync(dir, { recursive: true, force: true }); });
  const plan = async (cwd, extra) => {
    const entry = npmDev(cwd, extra);
    const { portRetargetable, scriptPinnedPorts } = await ports.portRetargetability(entry, cwd, true);
    return { portRetargetable, pinned: [...(scriptPinnedPorts ?? [])], portMayReassign: await ports.portMayReassign(entry, true, portRetargetable) };
  };
  assert.deepEqual(await plan(pinned), { portRetargetable: false, pinned: [], portMayReassign: false });
  assert.deepEqual(await plan(chained), { portRetargetable: false, pinned: [], portMayReassign: false }, 'a script it runs pins it too');
  assert.deepEqual(await plan(other), { portRetargetable: true, pinned: [5173], portMayReassign: true }, 'another port the script names is kept free for it');
  assert.deepEqual(await plan(free), { portRetargetable: true, pinned: [], portMayReassign: true });
  assert.deepEqual(await plan(pinned, { autoPort: true }), { portRetargetable: true, pinned: [], portMayReassign: true }, '"autoPort": true moves it anyway');
  assert.deepEqual(await plan(free, { autoPort: false }), { portRetargetable: true, pinned: [], portMayReassign: false });
  assert.deepEqual(await plan(free, { args: ['run', 'dev', '--workspace', 'web'] }), { portRetargetable: false, pinned: [], portMayReassign: false }, 'a workspace script can\'t be read');
  assert.equal(await ports.portMayReassign(npmDev(free, { command: undefined }), true, true), false, 'an attach entry runs nothing');
  assert.equal(await ports.portMayReassign(npmDev(free), false, true), false, 'the gate off');
  // The ports this folder's other entries hold on to: an attach entry's, a fixed one's, one its own script pins, the
  // other ports scripts name; and an entry whose folder is outside the project (unreadable) keeps its own.
  const project = folder({ dev: 'next dev' });
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  for (const [name, dev] of [['admin', 'vite --port 3000'], ['ui', 'vite --port 5173']]) { fs.mkdirSync(path.join(project, name)); fs.writeFileSync(path.join(project, name, 'package.json'), JSON.stringify({ scripts: { dev } })); }
  const siblings = [portEntry({ name: 'docs', command: null, args: [], cwd: project, port: 4000, url: 'http://localhost:4000' }), npmDev(project, { name: 'api', port: 5000, autoPort: false }),
    npmDev(path.join(project, 'admin'), { name: 'admin', port: 3000 }), npmDev(path.join(project, 'ui'), { name: 'ui', port: 6000 }), npmDev(free, { name: 'away', port: 7000 })];
  assert.deepEqual([...await ports.pinnedPortsOf(siblings, project)].sort(), [3000, 4000, 5000, 5173, 7000]);
});

test('a moved server\'s own port argument follows it (k1i)', () => {
  const { ports } = policy();
  assert.deepEqual(ports.rewritePortArgs(['run', 'dev', '--', '--port', '3000'], 3001, { joinedShortForm: true, command: 'npm' }), ['run', 'dev', '--', '--port', '3001']);
  assert.deepEqual(ports.rewritePortArgs(['serve', '--port=3000', '-p3000'], 3004, { joinedShortForm: true, command: 'node' }), ['serve', '--port=3004', '-p3004']);
  assert.deepEqual(ports.rewritePortArgs(['serve', '-p3000'], 3004, { joinedShortForm: false, command: 'node' }), ['serve', '-p3000'], 'the joined form only with the gate on');
  assert.deepEqual(ports.rewritePortArgs(['exec', 'vite', '--port', '3000'], 3001, { command: 'npx' }), ['exec', 'vite', '--port', '3000'].map((arg, index) => (index === 3 ? '3001' : arg)));
});

test('who answers a server\'s port after it is ready (O0i)', async () => {
  // No native process calls: the original treats the server as its own.
  assert.deepEqual(await policy().ports.verifyServerIdentity(true, 3001, 100, 'none', []), { outcome: 'running' });
  const { world, ports } = policy({ native: (w) => w.native({ lineage: { 101: { pid: 101, pgid: 100, ancestors: [100, 1] } } }) });
  const own = { pid: 100 }, child = { pid: 101 };
  world.occupy(3001, { pid: own.pid });
  assert.deepEqual(await ports.verifyServerIdentity(true, 3001, 100, 'none', []), { outcome: 'running' }, 'ours');
  const restore = [];
  // Ours on 127.0.0.1 and another process on ::1: "mixed" is a mismatch.
  restore.push(world.occupy(3001, { host: '::1', pid: 300 }));
  const mixed = await ports.verifyServerIdentity(true, 3001, 100, 'none', []);
  assert.equal(mixed.outcome, 'mismatch');
  assert.match(mixed.guidance, /^This server is up on its assigned port 3001, but a different process is also answering on the same port on another local address, .*Check what is answering on port 3001 \(for example: lsof -i :3001\)\./s);
  restore.forEach((undo) => undo());
  // Another process answers the port while this server's child listens elsewhere.
  const { world: other, ports: check } = policy({ native: (w) => w.native({ lineage: { 101: { pid: 101, pgid: 100, ancestors: [100, 1] } } }) });
  other.occupy(3001, { pid: 200 });
  other.occupy(5173, child);
  const foreign = await check.verifyServerIdentity(true, 3001, 100, 'none', []);
  assert.equal(foreign.outcome, 'running', 'a process that is no preview server: advisory only');
  assert.match(foreign.advisory, /^This server is listening on port 5173, not on its assigned port 3001\. Port 3001 is answered by a different process, .*If the server never comes up on 3001, its start command may hardcode a port/s);
  const sibling = await check.verifyServerIdentity(true, 3001, 100, 'none', [{ rootPid: 200, session: 'same-session' }]);
  assert.equal(sibling.outcome, 'mismatch');
  assert.match(sibling.guidance, /Port 3001 is in use by another preview server from this chat\. Call preview_stop for that server/);
  const elsewhere = await check.verifyServerIdentity(true, 3001, 100, 'cross-session', []);
  assert.match(elsewhere.guidance, /Port 3001 is in use by another chat's preview server, and preview_stop won't stop another chat's server\./);
  // Not answering in time: the advisory names where it listens instead.
  const quiet = await check.verifyServerIdentity(false, 3002, 100, 'none', []);
  assert.deepEqual(quiet.outcome, 'running');
  assert.match(quiet.advisory, /^This server is listening on port 5173 but not \(yet\) answering on its assigned port 3002\./);
  assert.equal(check.portOccupancy([{ serverId: 'a', port: 3001, status: 'running', sessionId: '/x' }], 'me', 3001, '/p'), 'cross-session');
  assert.equal(check.portOccupancy([{ serverId: 'a', port: 3001, status: 'starting', sessionId: '/p' }], 'me', 3001, '/p'), 'same-session');
  assert.equal(check.portOccupancy([{ serverId: 'a', port: 3001, status: 'stopped', sessionId: '/p' }], 'me', 3001, '/p'), 'none');
});

test('the user\'s Run stops only this folder\'s other server on the port (q4i)', () => {
  const { ports } = policy();
  const rows = [
    { serverId: 'one', name: 'one', port: 3000, status: 'running', cwd: '/p', sessionId: '/p' },
    { serverId: 'two', name: 'two', port: 3000, status: 'running', cwd: '/p', sessionId: '/p' },
    { serverId: 'web', name: 'web', port: 3000, status: 'running', cwd: '/q', sessionId: '/q' },
    { serverId: 'api', name: 'api', port: 4000, status: 'running', cwd: '/p', sessionId: '/p' },
  ];
  assert.deepEqual(ports.conflictingServers(rows, { name: 'TWO', port: 3000 }, '/p', '/p').map((row) => row.name), ['one']);
});

test('lsof and ps answer the native listener and lineage calls', async () => {
  const lsof = ['p501', 'cnode', 'f23', 'tIPv4', 'n127.0.0.1:3000', 'f24', 'tIPv6', 'n[::1]:3000', 'p777', 'cpython3', 'f5', 'tIPv6', 'n*:8000', 'f6', 'tIPv4', 'n*:8001', ''].join('\n');
  assert.deepEqual(parseLsofListeners(lsof), [
    { localPort: 3000, localAddr: '127.0.0.1', pid: 501, processName: 'node' }, { localPort: 3000, localAddr: '::1', pid: 501, processName: 'node' },
    { localPort: 8000, localAddr: '::', pid: 777, processName: 'python3' }, { localPort: 8001, localAddr: '0.0.0.0', pid: 777, processName: 'python3' },
  ]);
  const ps = '    1     0     1\n  400     1   400\n  501   400   400\n  777     1   777\n';
  assert.deepEqual(processLineage(ps, [501, 777, 999]), [{ pid: 501, pgid: 400, ancestors: [400, 1] }, { pid: 777, pgid: 777, ancestors: [1] }]);
  const calls = [];
  const info = hostProcessInfo({ platform: 'darwin', run: async (file, args) => { calls.push([file, ...args].join(' ')); return file.endsWith('lsof') ? lsof : ps; } });
  assert.equal((await info.listTcpListeners()).length, 4);
  await info.listTcpListeners();
  assert.deepEqual(await info.getProcessLineage([501]), [{ pid: 501, pgid: 400, ancestors: [400, 1] }]);
  assert.deepEqual(calls, ['/usr/sbin/lsof -nP -iTCP -sTCP:LISTEN -F pctn', '/bin/ps -A -o pid=,ppid=,pgid='], 'one listener read per second');
  assert.equal(hostProcessInfo({ platform: 'win32' }), null);
});

test('preview-12: sites see standard browser tokens, Claude hosts the app\'s agent without Electron (ydi / bdi / uai)', () => {
  const app = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) OpenClaude/1.0.4 Chrome/142.0.7444.52 Electron/39.2.0 Safari/537.36';
  const agents = previewUserAgents(app);
  assert.equal(agents.sites, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.52 Safari/537.36');
  assert.equal(agents.claudeHosts, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) OpenClaude/1.0.4 Chrome/142.0.7444.52 Safari/537.36');
  assert.equal(previewUserAgents(`${app} MSIX`).sites, agents.sites, 'the Store build marker goes too');
  for (const host of ['claude.ai', 'www.claude.com', 'x.claudeusercontent.com', 'docs.anthropic.com', 'claude.ai.', 'code.claude.com', 'portal.anthropic.com', 'preview.claude.ai']) assert.equal(isClaudeHost(host), true, host);
  for (const host of ['example.com', 'claude.ai.example.com', 'notclaude.ai', 'localhost']) assert.equal(isClaudeHost(host), false, host);
  assert.equal(previewRequestUserAgent(agents, agents.sites, true), agents.claudeHosts);
  assert.equal(previewRequestUserAgent(agents, agents.claudeHosts, false), agents.sites);
  assert.equal(previewRequestUserAgent(agents, app, false), agents.sites);
  assert.equal(previewRequestUserAgent(agents, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) …', false), undefined, 'an emulated device agent is kept');
  // The partition: default "sites", and each request rewritten by host.
  let handler = null;
  const ses = { agent: app, getUserAgent() { return this.agent; }, setUserAgent(value) { this.agent = value; }, webRequest: { onBeforeSendHeaders(fn) { handler = fn; } } };
  assert.deepEqual(applyPreviewUserAgent(ses), agents);
  assert.equal(ses.agent, agents.sites);
  const send = (url, headers) => new Promise((resolve) => handler({ url, requestHeaders: headers }, resolve));
  return Promise.all([
    send('https://claude.ai/new', { 'user-agent': agents.sites }).then((result) => assert.deepEqual(result, { requestHeaders: { 'user-agent': agents.claudeHosts } })),
    send('https://example.com/', { 'User-Agent': agents.sites }).then((result) => assert.deepEqual(result, {})),
    send('not a url', {}).then((result) => assert.deepEqual(result, { requestHeaders: { 'User-Agent': agents.sites } })),
  ]).then(() => {
    const plain = { getUserAgent: () => 'Mozilla/5.0 Chrome/142 Safari/537.36', setUserAgent() { throw Error('not called'); } };
    assert.equal(applyPreviewUserAgent(plain), null, 'an agent without Electron is left alone');
  });
});
