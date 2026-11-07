// Windows: the workflow runner's core launch (docs/windows-bugs.md R8, R9).
// R8: a core on this app's own executable (setup-requirements.cjs bundledNode) keeps ELECTRON_RUN_AS_NODE.
// R9: a .cmd core (npm's codex.cmd) is resolved by workflow-service through process-tree.cjs windowsSpawn, and its
// spawn options reach the runner; a stop ends the core's tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const service = require('../electron/workflow-service.cjs');

const EXE = 'C:\\Users\\张三\\OpenClaude Desktop\\OpenClaude Desktop.exe';

// A runner stand-in: records the fork options and the start message, then exits.
function fakeFork(seen) {
  return (file, args, options) => {
    const child = new EventEmitter();
    child.pid = 4242; child.connected = true;
    child.send = (message) => { seen.message = message; setTimeout(() => child.emit('exit', 1, null), 5); setTimeout(() => child.emit('close', 1, null), 6); return true; };
    child.disconnect = () => { child.connected = false; };
    seen.options = options;
    return child;
  };
}

async function launch({ platform, core, execPath = EXE, spawnCommand }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-win-'));
  const file = path.join(root, 'demo.workflow.js');
  await fs.writeFile(file, 'export const meta={name:"demo",description:"Demo"}; return 1');
  const seen = {};
  const runner = service.createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => ({ threadIds: ['t'], cwd: root, dynamicWorkflows: true }), emit() {},
    core: () => core, version: 'test', platform, execPath, spawn: fakeFork(seen), killProcessTree: () => true, ...(spawnCommand ? { spawnCommand } : {}) });
  try {
    const run = await runner.start({ threadId: 't', file });
    for (let i = 0; i < 200 && !seen.message; i++) await new Promise(r => setTimeout(r, 5));
    for (let i = 0; i < 200 && (await runner.list('t')).find(r => r.id === run.id).status === 'running'; i++) await new Promise(r => setTimeout(r, 5));
    return { ...seen, cwd: await fs.realpath(root) };
  } finally { await runner.dispose(); await fs.rm(root, { recursive: true, force: true }); }
}

test('R8: a core on the app executable runs as Node (Windows compares the path case-insensitively)', async () => {
  const passthrough = (command, args, options) => ({ command, args, options: { windowsHide: true, ...options } });
  const upper = await launch({ platform: 'win32', core: { command: EXE.toUpperCase().replace(/\\/g, '/'), args: ['bridge.mjs', 'app-server', '--stdio'] }, spawnCommand: passthrough });
  assert.equal(upper.options.env.CODE_DESKTOP_CORE_RUN_AS_NODE, '1');
  assert.equal(upper.options.env.ELECTRON_RUN_AS_NODE, '1');
  const other = await launch({ platform: 'win32', core: { command: 'C:\\Program Files\\nodejs\\node.exe', args: ['bridge.mjs', 'app-server', '--stdio'] }, spawnCommand: passthrough });
  assert.equal(other.options.env.CODE_DESKTOP_CORE_RUN_AS_NODE, undefined, 'an installed Node needs no ELECTRON_RUN_AS_NODE');
  // macOS: exact comparison, as before.
  const mac = '/Applications/OpenClaude Desktop.app/Contents/MacOS/OpenClaude Desktop';
  assert.equal((await launch({ platform: 'darwin', execPath: mac, core: { command: mac, args: ['b.mjs'] } })).options.env.CODE_DESKTOP_CORE_RUN_AS_NODE, '1');
  assert.equal((await launch({ platform: 'darwin', execPath: mac, core: { command: mac.toLowerCase(), args: ['b.mjs'] } })).options.env.CODE_DESKTOP_CORE_RUN_AS_NODE, undefined);
  assert.equal((await launch({ platform: 'darwin', execPath: mac, core: { command: '/opt/homebrew/bin/node', args: ['b.mjs'] } })).options.env.CODE_DESKTOP_CORE_RUN_AS_NODE, undefined);
});

test('R9: a Windows .cmd core reaches the runner as cmd.exe with its spawn options; macOS is unchanged', async () => {
  const calls = [];
  const cmd = (command, args, options, extra) => { calls.push({ command, args, options, extra });
    return { command: 'C:\\Windows\\System32\\cmd.exe', args: ['/d', '/s', '/c', `"C:\\npm\\codex.cmd ${args.join(' ')}"`], options: { windowsHide: true, ...options, windowsVerbatimArguments: true } }; };
  const win = await launch({ platform: 'win32', core: { command: 'C:\\npm\\codex.cmd' }, spawnCommand: cmd });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['app-server', '--listen', 'stdio://'], 'the runner default arguments are spelled out');
  assert.equal(calls[0].options.cwd, win.cwd);
  assert.equal(calls[0].options.env, win.options.env, 'resolved with the environment the core inherits');
  assert.deepEqual(calls[0].extra, { platform: 'win32' });
  assert.equal(win.message.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(win.message.commandArgs.slice(0, 3), ['/d', '/s', '/c']);
  assert.deepEqual(win.message.commandOptions, { windowsHide: true, windowsVerbatimArguments: true });
  // A core with its own arguments keeps them.
  calls.length = 0;
  await launch({ platform: 'win32', core: { command: 'codex', args: ['app-server', '--stdio', '-c', 'x=1'] }, spawnCommand: cmd });
  assert.deepEqual(calls[0].args, ['app-server', '--stdio', '-c', 'x=1']);
  // An .exe resolves to itself: no verbatim arguments.
  const exe = await launch({ platform: 'win32', core: { command: 'codex' }, spawnCommand: (command, args, options) => ({ command: 'C:\\bin\\codex.exe', args, options: { windowsHide: true, ...options } }) });
  assert.equal(exe.message.command, 'C:\\bin\\codex.exe');
  assert.deepEqual(exe.message.commandOptions, { windowsHide: true });
  // macOS: never resolved, nothing new in the message.
  calls.length = 0;
  const mac = await launch({ platform: 'darwin', core: { command: '/usr/local/bin/codex' }, spawnCommand: cmd });
  assert.equal(calls.length, 0);
  assert.equal(mac.message.command, '/usr/local/bin/codex');
  assert.equal(mac.message.commandArgs, undefined);
  assert.equal('commandOptions' in mac.message, false);
});

test('R9: the real windowsSpawn turns a .cmd into cmd.exe /d /s /c with verbatim arguments', () => {
  const { windowsSpawn } = require('../electron/process-tree.cjs');
  // Off Windows the shim cannot be found on disk; the shape is what process-tree-*.test covers. Here: unchanged off win32.
  assert.deepEqual(windowsSpawn('codex', ['a'], { cwd: '/w' }, { platform: 'darwin' }), { command: 'codex', args: ['a'], options: { cwd: '/w' } });
});

test('R9: the runner client spawns with the host spawn options and stops through its terminate hook', async () => {
  const { AppServerClient } = await import('../third-party/codex-workflows-runner/src/appServerClient.js');
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-wf-win-client-'));
  const saved = process.env.CODE_DESKTOP_DATA; process.env.CODE_DESKTOP_DATA = data;
  const ended = [];
  const client = new AppServerClient({ command: path.join(import.meta.dirname, 'fixtures/codex-server.cjs'), args: [], cwd: data, clientInfo: { name: 'test', version: '0' },
    spawnOptions: { windowsHide: true, detached: true }, terminate: (child, signal) => { ended.push({ pid: child.pid, signal }); child.kill(signal); } });
  try {
    await client.connect();
    const pid = client.pid;
    assert.ok(pid > 0);
    await client.shutdown();
    assert.deepEqual(ended, [{ pid, signal: 'SIGTERM' }], 'the hook replaces child.kill');
  } finally {
    if (saved === undefined) delete process.env.CODE_DESKTOP_DATA; else process.env.CODE_DESKTOP_DATA = saved;
    await fs.rm(data, { recursive: true, force: true });
  }
});

test('R9: the runner child hands Windows the tree kill and only the two spawn options', async () => {
  const child = await fs.readFile(new URL('../electron/workflow-child.mjs', import.meta.url), 'utf8');
  assert.match(child, /terminate:child=>processTree\.killTree\(child\.pid,'SIGKILL',\{platform:'win32'\}\)/);
  const source = await fs.readFile(new URL('../third-party/codex-workflows-runner/src/appServerClient.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.\.\.this\.options\.spawnOptions/, 'never spread: a script cannot add shell/detached');
});
