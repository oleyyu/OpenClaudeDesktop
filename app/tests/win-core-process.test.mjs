// Windows behaviour of the main process's process handling, checked on any host through the injectable platform:
// stopping a core (stdin end, then the tree), a workflow runner (IPC disconnect, then the tree), monitors (the
// terminal's Windows shell, taskkill), the agent tools channel (named pipe, assigned only once listening, retryable),
// the tray's left click, "Open in Terminal" and the Chrome bridge's Windows registration.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { EventEmitter, once } from 'node:events';
import { spawn, fork } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- codex.cjs: a core stop on Windows closes stdin first, then ends the tree.
const CORE_FIXTURE = `
const readline = require('node:readline');
const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
if (process.env.FIXTURE_MODE === 'ignore-stdin') setInterval(() => {}, 1000);
const lines = readline.createInterface({ input: process.stdin });
lines.on('line', (line) => { const message = JSON.parse(line); if (message.method === 'initialize') send({ id: message.id, result: { pid: process.pid } }); });
lines.on('close', () => { if (process.env.FIXTURE_MODE !== 'ignore-stdin') process.exit(0); });
`;

test('Windows: a core stops gracefully when its stdin closes, never by signal or taskkill', { timeout: 10000 }, async (t) => {
  const { CodexClient } = require('../electron/codex.cjs');
  const dir = tmp('win-core-stop-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const binary = path.join(dir, 'core.cjs');
  fs.writeFileSync(binary, `#!${process.execPath}\n${CORE_FIXTURE}`, { mode: 0o755 });
  const killed = [];
  const client = new CodexClient({ binary, platform: 'win32', killTree: (pid) => { killed.push(pid); return true; }, shutdownTimeout: 2000, shutdownHardTimeout: 4000, initializeTimeout: 3000 });
  await client.start();
  const result = await client.stopAndWait();
  assert.equal(result.exited, true);
  assert.equal(result.children[0].forced, false);
  assert.equal(result.children[0].signal, null, 'no signal was sent');
  assert.deepEqual(killed, []);
});

test('Windows: a core that ignores the closed stdin is ended as a tree after the grace', { timeout: 10000 }, async (t) => {
  const { CodexClient } = require('../electron/codex.cjs');
  const dir = tmp('win-core-stop-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const binary = path.join(dir, 'core.cjs');
  fs.writeFileSync(binary, `#!${process.execPath}\n${CORE_FIXTURE}`, { mode: 0o755 });
  const killed = [];
  // The fake taskkill ends the fixture for real (SIGKILL here), as /T /F would.
  const client = new CodexClient({ binary, platform: 'win32', env: { FIXTURE_MODE: 'ignore-stdin' }, shutdownTimeout: 100, shutdownHardTimeout: 3000, initializeTimeout: 3000,
    killTree: (pid, signal, options) => { killed.push([pid, signal, options.platform]); process.kill(pid, 'SIGKILL'); return true; } });
  await client.start();
  const pid = client.child.pid;
  const result = await client.stopAndWait();
  assert.equal(result.children[0].forced, true);
  assert.deepEqual(killed[0], [pid, 'SIGKILL', 'win32']);
});

// --- workflow-service.cjs: a stop on Windows disconnects the runner's IPC (its SIGTERM), not a process group.
test('Windows: a workflow runner runs hidden and attached, and a stop closes its IPC channel', { timeout: 15000 }, async (t) => {
  const service = require('../electron/workflow-service.cjs');
  const root = tmp('win-wf-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const child = path.join(root, 'child.cjs');
  const marker = path.join(root, 'disconnected');
  fs.writeFileSync(child, `const fs=require('node:fs');process.on('message',()=>{});process.once('disconnect',()=>{fs.writeFileSync(${JSON.stringify(marker)},'');process.exit(0);});setInterval(()=>{},1000);`);
  const file = path.join(root, 'demo.workflow.js');
  fs.writeFileSync(file, 'export const meta={name:"demo",description:"Demo"}; return 1');
  const spawned = [], killed = [];
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {}, command: '/nonexistent', version: 'test',
    platform: 'win32', killProcessTree: (pid) => { killed.push(pid); return true; },
    spawn: (_file, args, options) => { spawned.push(options); return fork(child, args, options); } });
  t.after(() => runner.dispose());
  const run = await runner.start({ threadId: 't', file });
  assert.equal(spawned[0].detached, false);
  assert.equal(spawned[0].windowsHide, true);
  await wait(300);
  await runner.stop(run.id);
  const settled = (await runner.list('t')).find((entry) => entry.id === run.id);
  assert.equal(settled.status, 'stopped');
  assert.ok(fs.existsSync(marker), 'the runner saw its channel close and cleaned up itself');
  assert.deepEqual(killed, [], 'no forced kill was needed');
});

// --- monitor-service.cjs: the terminal's Windows shell, no console window, taskkill to stop.
test('Windows: a monitor runs in the terminal\'s Windows shell and stops as a tree', () => {
  const { createMonitorService } = require('../electron/monitor-service.cjs');
  const calls = [], killed = [];
  const fakeSpawn = (program, args, options) => {
    const child = new EventEmitter();
    child.pid = 4242; child.exitCode = null;
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.stdout.setEncoding = () => {}; child.stderr.setEncoding = () => {};
    child.kill = () => calls.push('kill');
    calls.push({ program, args, options });
    return child;
  };
  const make = (extra) => createMonitorService({ deliver: () => {}, env: () => ({ ComSpec: 'C:\\nowhere\\cmd.exe', Path: '' }), platform: 'win32', spawnProcess: fakeSpawn,
    killProcessTree: (pid, signal, options) => { killed.push([pid, options.platform]); return true; }, ...extra });
  const pwsh = make({ shell: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' });
  const { taskId } = pwsh.start({ sessionId: 's', cwd: path.resolve('/'), command: 'Get-Content log.txt -Wait', description: 'log' });
  assert.equal(calls[0].program, 'C:\\Program Files\\PowerShell\\7\\pwsh.exe');
  assert.deepEqual(calls[0].args, ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); Get-Content log.txt -Wait']);
  assert.equal(calls[0].options.detached, false);
  assert.equal(calls[0].options.windowsHide, true);
  pwsh.stop('s', taskId);
  assert.deepEqual(killed, [[4242, 'win32']]);
  assert.ok(!calls.includes('kill'), 'taskkill, not child.kill');
  // No shell given: terminal-service's resolveWindowsShell (here nothing exists, so cmd.exe) with cmd's arguments.
  const cmd = make({});
  cmd.start({ sessionId: 's', cwd: path.resolve('/'), command: 'ping -t localhost', description: 'ping' });
  assert.match(calls.at(-1).program, /cmd\.exe$/i);
  assert.deepEqual(calls.at(-1).args, ['/d', '/s', '/c', 'chcp 65001>nul & ping -t localhost']);
  cmd.dispose(); pwsh.dispose();
});

// --- agent-tools-host.cjs: the channel is handed out only once it listens; a failed start can be retried.
function mcp(env, cwd) {
  const server = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;
  const child = spawn(process.execPath, [server], { cwd, env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'ignore'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); pending.get(message.id)?.(message); pending.delete(message.id); });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  return { child, request };
}
const toolModules = [{ group: 'demo', tools: [{ name: 'whoami', description: 'Who', inputSchema: { type: 'object', properties: {} }, handler: async (args, ctx) => `session ${ctx.sessionId}` }] }];

test('agent tools: a failed start hands cores no channel and the next start() succeeds', async (t) => {
  const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
  const parent = tmp('win-tools-');
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const missing = path.join(parent, 'not-yet');
  const host = createAgentToolsHost({ modules: toolModules, tmpRoot: missing, resolveSession: () => ({ id: 'a', cwd: '/' }), logger: { warn() {}, log() {} } });
  t.after(() => host.stop());
  await assert.rejects(host.start());
  assert.equal(host.socketPath, null);
  assert.deepEqual(host.launchEnv(), {});
  assert.deepEqual(host.codexArgs(), []);
  fs.mkdirSync(missing);
  const { socketPath } = await host.start();
  assert.equal(host.socketPath, socketPath);
  assert.ok(host.launchEnv().CODE_DESKTOP_AGENT_TOOLS_SOCKET);
  assert.equal((await host.start()).socketPath, socketPath, 'a started host answers with its channel');
});

test('Windows: the channel is a \\\\.\\pipe\\ name that reaches the stdio server through its environment', async (t) => {
  const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
  // Off Windows the pipe-shaped name listens as a unix socket relative to the cwd, which is enough to carry the same
  // string end to end; both processes run in a scratch folder so nothing is created in the repository.
  const cwd = tmp('win-pipe-');
  const previous = process.cwd();
  process.chdir(cwd);
  t.after(() => { process.chdir(previous); fs.rmSync(cwd, { recursive: true, force: true }); });
  const host = createAgentToolsHost({ modules: toolModules, platform: 'win32', resolveSession: (id) => (id === 'a' ? { id: 'a', cwd: '/' } : null), logger: { warn() {}, log() {} } });
  t.after(() => host.stop());
  const { socketPath } = await host.start();
  assert.match(socketPath, /^\\\\\.\\pipe\\openclaude-tools-[0-9a-f]{24}$/);
  assert.equal(host.launchEnv().CODE_DESKTOP_AGENT_TOOLS_SOCKET, socketPath);
  assert.ok(!host.codexArgs().some((arg) => arg.includes(socketPath)), 'the pipe travels in env_vars, never on the command line');
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'a' }, cwd);
  t.after(() => server.child.kill());
  await server.request('initialize', { protocolVersion: '2025-06-18' });
  const who = await server.request('tools/call', { name: 'whoami', arguments: {} });
  assert.equal(who.result.content[0].text, 'session a');
  server.child.stdin.end();
  await once(server.child, 'exit');
});

// --- menu-bar.cjs: on Windows a left click (and Show App) goes through showMain, which recreates a missing window.
test('Windows: the tray\'s left click shows the app through showMain', () => {
  const { createMenuBar } = require('../electron/menu-bar.cjs');
  const trays = [];
  class FakeTray extends EventEmitter { constructor(image) { super(); this.image = image; trays.push(this); } setToolTip() {} isDestroyed() { return false; } destroy() {} }
  let shown = 0;
  const bar = createMenuBar({ Tray: FakeTray, Menu: {}, nativeImage: { createFromPath: (p) => ({ p }) }, app: { name: 'x' }, iconPath: 'C:\\app\\TrayIconWin.ico', menuModel: {},
    getWindow: () => null, getEnabled: () => true, getAccount: () => null, getClient: () => null, platform: 'win32', showMain: () => { shown += 1; } });
  bar.update();
  assert.equal(trays[0].image.p, 'C:\\app\\TrayIconWin.ico');
  trays[0].emit('click');
  bar.showApp();
  assert.equal(shown, 2);
  assert.ok(fs.statSync(new URL('../electron/assets/TrayIconWin.ico', import.meta.url)).size > 0, 'the colored tray icon ships');
});

// --- open-terminal.cjs
test('Open in Terminal: Windows Terminal when installed, else a new cmd.exe console; the folder is only the cwd', () => {
  const { terminalLaunches } = require('../electron/open-terminal.cjs');
  const env = { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local', ComSpec: 'C:\\Windows\\System32\\cmd.exe' };
  const cwd = 'C:\\work\\a;b & c';
  const withWt = terminalLaunches(cwd, { platform: 'win32', env, exists: () => true });
  assert.deepEqual(withWt.map((launch) => [launch.file, launch.args]), [
    ['C:\\Users\\me\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe', ['-d', '.']],
    ['C:\\Windows\\System32\\cmd.exe', ['/d', '/c', 'start', '""', 'cmd.exe', '/K']],
  ]);
  for (const launch of withWt) {
    assert.equal(launch.options.cwd, cwd);
    assert.equal(launch.options.detached, true);
    assert.ok(!launch.options.windowsHide, 'the terminal window must show');
    assert.ok(!launch.args.some((arg) => arg.includes('work')), 'no path on a command line');
  }
  assert.equal(terminalLaunches(cwd, { platform: 'win32', env, exists: () => false }).length, 1);
  assert.deepEqual(terminalLaunches('/Users/me/x', { platform: 'darwin' }), [{ file: 'open', args: ['-a', 'Terminal', '--', '/Users/me/x'], options: { timeout: 10000 } }]);
});

test('Open in Terminal on Windows falls back to cmd.exe when wt.exe can\'t start', async () => {
  const { openTerminal } = require('../electron/open-terminal.cjs');
  const started = [];
  const start = (file, args, options) => {
    const child = new EventEmitter();
    child.unref = () => {};
    started.push(file);
    setImmediate(() => child.emit(/wt\.exe$/.test(file) ? 'error' : 'spawn', Object.assign(new Error('ENOENT'), { code: 'ENOENT' })));
    return child;
  };
  const result = await openTerminal('C:\\work', { platform: 'win32', env: { LOCALAPPDATA: 'C:\\L', ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, exists: () => true, start });
  assert.equal(result.file, 'C:\\Windows\\System32\\cmd.exe');
  assert.equal(started.length, 2);
});

// --- browser/: the Chrome bridge registered the Windows way.
test('Windows: the Chrome native host is a .cmd launcher, its manifest registered under HKCU', () => {
  const { installNativeHost, uninstallNativeHost, HOST_SCRIPT } = require('../electron/browser/install.cjs');
  const { HOST_NAME, EXTENSION_ID, hostEndpoint, endpointOf } = require('../electron/browser/protocol.cjs');
  const dir = tmp('win-chrome-');
  try {
    const calls = [];
    // Absolute Windows paths are required (path.win32.isAbsolute); the files themselves go to this host's scratch folder.
    const { manifest, launcherPath, registryKey } = installNativeHost({ platform: 'win32', manifestDir: dir, launcherPath: path.join(dir, 'native-host.cmd'),
      runtime: 'C:\\Program Files\\OpenClaude Desktop\\node.exe', socketDir: 'C:\\Temp\\100% sure', registry: (args) => calls.push(args) });
    assert.equal(manifest.name, HOST_NAME);
    assert.equal(manifest.path, launcherPath);
    assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${EXTENSION_ID}/`]);
    const launcher = fs.readFileSync(launcherPath, 'utf8');
    assert.match(launcher, /^@echo off\r\nsetlocal\r\n/);
    assert.ok(launcher.includes('set "OPENCLAUDE_CHROME_BRIDGE_DIR=C:\\Temp\\100%% sure"'), launcher);
    assert.ok(launcher.includes(`"C:\\Program Files\\OpenClaude Desktop\\node.exe" "${HOST_SCRIPT}" %*`), launcher);
    assert.equal(registryKey, `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`);
    assert.deepEqual(calls.at(-1), ['add', registryKey, '/ve', '/t', 'REG_SZ', '/d', path.join(dir, `${HOST_NAME}.json`), '/f']);
    uninstallNativeHost({ platform: 'win32', manifestDir: dir, launcherPath, registry: (args) => calls.push(args) });
    assert.deepEqual(calls.at(-1), ['delete', registryKey, '/f']);
    assert.equal(fs.existsSync(launcherPath), false);
    // A host listens on a named pipe and <pid>.sock names it; a client reads the pipe back (and refuses anything else).
    const endpoint = hostEndpoint('C:\\Temp\\b', 77, { platform: 'win32', random: () => 'abc' });
    assert.deepEqual(endpoint, { listen: '\\\\.\\pipe\\openclaude-chrome-bridge-77-abc', record: '\\\\.\\pipe\\openclaude-chrome-bridge-77-abc' });
    assert.equal(endpointOf('x', { platform: 'win32', read: () => `${endpoint.record}\r\n` }), endpoint.listen);
    assert.equal(endpointOf('x', { platform: 'win32', read: () => 'C:\\evil.sock' }), null);
    assert.deepEqual(hostEndpoint('/tmp/b', 77, { platform: 'darwin' }), { listen: '/tmp/b/77.sock', record: null });
    assert.equal(endpointOf('/tmp/b/77.sock', { platform: 'darwin' }), '/tmp/b/77.sock');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
