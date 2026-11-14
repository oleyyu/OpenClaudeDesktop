import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// terminal-service.cjs with real PTYs: /bin/sh in temp folders (never the user's shell or dotfiles), node-pty and the
// /usr/bin/script fallback, the IPC validation, output replay, busy detection, sweeps and quit cleanup.
const require = createRequire(import.meta.url);
const { createTerminalService, terminalEnv, resolveShell } = require('../electron/terminal-service.cjs');
const TMP = '/private/tmp/claude-501';
fs.mkdirSync(TMP, { recursive: true });
const folders = [];
const tempFolder = () => { const dir = fs.mkdtempSync(path.join(TMP, 'terminal-service-')); folders.push(dir); return fs.realpathSync(dir); };
test.after(() => { for (const dir of folders) fs.rmSync(dir, { recursive: true, force: true }); });

function fakeSender() {
  const events = [];
  let destroyed = false, onDestroyed = null;
  return { events, send: (channel, event) => { assert.equal(channel, 'terminal:event'); events.push(event); }, isDestroyed: () => destroyed,
    once: (name, listener) => { if (name === 'destroyed') onDestroyed = listener; }, destroy() { destroyed = true; onDestroyed?.(); } };
}
function service(folder, extra = {}) {
  const owners = { s1: folder, s2: folder };
  return createTerminalService({
    resolveOwner: ({ sessionId, homeWorkspace }) => {
      if (sessionId === null) { if (homeWorkspace === folder || homeWorkspace === undefined) return folder; throw new Error('Unknown home workspace. Choose a folder first.'); }
      if (!owners[sessionId]) throw new Error('Unknown session.');
      return owners[sessionId];
    },
    shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin:/bin', HOME: folder, PS1: '$ ', ELECTRON_RUN_AS_NODE: '1', CODE_DESKTOP_DATA: '/x' },
    ...extra,
  });
}
const output = (sender, id) => sender.events.filter((event) => event.kind === 'data' && event.id === id).map((event) => event.data).join('');
async function until(predicate, ms = 8000) {
  const started = Date.now();
  while (Date.now() - started < ms) { if (await predicate()) return true; await new Promise((resolve) => setTimeout(resolve, 25)); }
  return false;
}

for (const backend of ['pty', 'script']) {
  test(`${backend}: a login shell in the session folder, keystrokes in, output out, size, rename, restart, close`, { timeout: 30000 }, async () => {
    const folder = tempFolder();
    const terminals = service(folder, { forceScript: backend === 'script' });
    const sender = fakeSender();
    try {
      const info = await terminals.call('create', { sessionId: 's1', cols: 100, rows: 30 }, sender);
      assert.equal(info.backend, backend);
      assert.equal(info.limited, backend === 'script');
      assert.equal(info.status, 'running');
      assert.equal(info.number, 1);
      assert.equal(info.owner, 's1');
      assert.equal(info.cwd, folder);
      assert.match(info.id, /^term-[a-z0-9]{6,32}$/);
      assert.equal(terminals.input(sender, info.id, 'pwd; echo "T=$TERM C=$COLORTERM P=$TERM_PROGRAM E=${ELECTRON_RUN_AS_NODE:-none} D=${CODE_DESKTOP_DATA:-none}"; stty size\r'), true);
      assert.ok(await until(() => /T=xterm-256color/.test(output(sender, info.id))), output(sender, info.id));
      const text = output(sender, info.id);
      assert.match(text, new RegExp(folder.replace(/[/.]/g, '\\$&')));
      assert.match(text, /C=truecolor P=CodeDesktop E=none D=none/);
      assert.ok(await until(() => /30 100/.test(output(sender, info.id))), 'the PTY has the requested size');
      // A second tab is Terminal 2; list returns both in creation order.
      const second = await terminals.call('create', { sessionId: 's1' }, sender);
      assert.equal(second.number, 2);
      assert.deepEqual((await terminals.call('list', { sessionId: 's1' }, sender)).map((tab) => tab.id), [info.id, second.id]);
      // Attach replays the kept output with its running end.
      const attached = await terminals.call('attach', { sessionId: 's1', id: info.id }, sender);
      assert.match(attached.output, /T=xterm-256color/);
      assert.equal(attached.end, attached.output.length);
      if (backend === 'pty') {
        assert.deepEqual(await terminals.call('resize', { sessionId: 's1', id: info.id, cols: 60.4, rows: 9999 }, sender), { cols: 60, rows: 500 });
        terminals.input(sender, info.id, 'stty size\r');
        assert.ok(await until(() => /500 60/.test(output(sender, info.id))), 'resize reaches the PTY');
      }
      const renamed = await terminals.call('rename', { sessionId: 's1', id: info.id, title: '  dev\nserver  ' }, sender);
      assert.equal(renamed.title, 'dev server');
      assert.equal((await terminals.call('rename', { sessionId: 's1', id: info.id, title: '' }, sender)).title, null);
      // exit → exited state; restart → a new generation with fresh output.
      terminals.input(sender, info.id, 'exit 3\r');
      assert.ok(await until(() => sender.events.some((event) => event.kind === 'state' && event.info.id === info.id && event.info.status === 'exited')));
      const exited = sender.events.filter((event) => event.kind === 'state' && event.info.id === info.id).at(-1).info;
      assert.equal(exited.exitCode, 3);
      assert.equal(terminals.input(sender, info.id, 'echo nope\r'), false, 'no input into an exited shell');
      const restarted = await terminals.call('restart', { sessionId: 's1', id: info.id }, sender);
      assert.equal(restarted.status, 'running');
      assert.equal(restarted.generation, 2);
      assert.equal((await terminals.call('attach', { sessionId: 's1', id: info.id }, sender)).output.includes('T=xterm-256color'), false);
      assert.equal(await terminals.call('close', { sessionId: 's1', id: second.id }, sender), true);
      assert.ok(sender.events.some((event) => event.kind === 'removed' && event.id === second.id));
      assert.deepEqual((await terminals.call('list', { sessionId: 's1' }, sender)).map((tab) => tab.id), [info.id]);
    } finally { await terminals.dispose(); }
  });
}

test('IPC validation: unknown ops, sessions, ids, other owners, bad input, untrusted and unsubscribed senders', { timeout: 20000 }, async () => {
  const folder = tempFolder();
  const terminals = service(folder);
  const sender = fakeSender(), stranger = fakeSender();
  try {
    await assert.rejects(terminals.call('spawn', { sessionId: 's1' }, sender), /Unknown terminal operation/);
    await assert.rejects(terminals.call('list', null, sender), /Invalid terminal request/);
    await assert.rejects(terminals.call('list', [], sender), /Invalid terminal request/);
    await assert.rejects(terminals.call('list', { sessionId: 'nope' }, sender), /Unknown session/);
    await assert.rejects(terminals.call('list', { sessionId: 42 }, sender), /Unknown session/);
    await assert.rejects(terminals.call('list', { sessionId: 'bad\u0000id' }, sender), /Unknown session/);
    await assert.rejects(terminals.call('list', { sessionId: null, homeWorkspace: '/etc' }, sender), /Unknown home workspace/);
    // A cwd ("Open in terminal" on a folder) must be a folder inside the session's: anything else is refused.
    await assert.rejects(terminals.call('create', { sessionId: 's1', cwd: '/etc' }, sender), /isn’t in this session’s folder/);
    await assert.rejects(terminals.call('create', { sessionId: 's1', cwd: 'relative' }, sender), /isn’t in this session’s folder/);
    await assert.rejects(terminals.call('create', { sessionId: 's1', cwd: path.join(folder, 'missing') }, sender), /isn’t in this session’s folder/);
    fs.mkdirSync(path.join(folder, 'sub'));
    const inner = await terminals.call('create', { sessionId: 's1', cwd: path.join(folder, 'sub') }, sender);
    assert.equal(inner.cwd, fs.realpathSync(path.join(folder, 'sub')));
    await terminals.call('close', { sessionId: 's1', id: inner.id }, sender);
    const info = await terminals.call('create', { sessionId: 's1' }, sender);
    assert.equal(info.cwd, folder);
    await assert.rejects(terminals.call('attach', { sessionId: 's1', id: '../../etc' }, sender), /Unknown terminal/);
    await assert.rejects(terminals.call('attach', { sessionId: 's1', id: 'term-zzzzzzzz' }, sender), /Unknown terminal/);
    // Another session cannot reach this one's terminal, even with the right id.
    await assert.rejects(terminals.call('attach', { sessionId: 's2', id: info.id }, sender), /Unknown terminal/);
    await assert.rejects(terminals.call('close', { sessionId: 's2', id: info.id }, sender), /Unknown terminal/);
    await assert.rejects(terminals.call('input', { sessionId: 's1', id: info.id, data: '' }, sender), /Invalid terminal input/);
    await assert.rejects(terminals.call('input', { sessionId: 's1', id: info.id, data: 'x'.repeat(70000) }, sender), /Invalid terminal input/);
    await assert.rejects(terminals.call('rename', { sessionId: 's1', id: info.id, title: { toString: () => 'x' } }, sender), /Invalid terminal name/);
    // Fire-and-forget keystrokes only from a window subscribed to the owner.
    assert.equal(terminals.input(stranger, info.id, 'echo hi\r'), false);
    assert.equal(terminals.input(sender, 'term-nothere1', 'x'), false);
    assert.equal(terminals.input(sender, info.id, 42), false);
    assert.equal(terminals.input(sender, info.id, 'true\r'), true);
    // A destroyed window is forgotten.
    sender.destroy();
    assert.equal(terminals.input(sender, info.id, 'true\r'), false);
    // install(): untrusted senders are refused before anything runs.
    const handlers = {}, listeners = {};
    terminals.install({ handle: (channel, fn) => { handlers[channel] = fn; }, on: (channel, fn) => { listeners[channel] = fn; } },
      { trustedSender: (event) => event.trusted === true });
    await assert.rejects(Promise.resolve().then(() => handlers['terminal:call']({ trusted: false, sender: stranger }, 'list', { sessionId: 's1' })), /Untrusted renderer/);
    assert.deepEqual((await handlers['terminal:call']({ trusted: true, sender: stranger }, 'list', { sessionId: 's1' })).map((tab) => tab.id), [info.id]);
    listeners['terminal:write']({ trusted: false, sender: stranger }, info.id, 'echo untrusted-write\r');
    listeners['terminal:write']({ trusted: true, sender: stranger }, info.id, 'echo trusted-write\r');
    assert.ok(await until(() => /trusted-write/.test(output(stranger, info.id))));
    assert.equal(/echo untrusted-write/.test(output(stranger, info.id)), false);
    assert.throws(() => terminals.install({ handle() {}, on() {} }, {}), /trustedSender/);
    // Path links: only files inside the folder, as relative paths.
    fs.mkdirSync(path.join(folder, 'src'));
    fs.writeFileSync(path.join(folder, 'src/app.js'), 'x');
    assert.deepEqual(await terminals.call('paths', { sessionId: 's1', paths: ['src/app.js', path.join(folder, 'src/app.js'), 'src', '/etc/hosts', '../x', 'missing.js', 7] }, stranger),
      ['src/app.js', 'src/app.js', null, null, null, null, null]);
  } finally { await terminals.dispose(); }
});

test('busy detection, running commands for the quit guard, agent read with wait, sweeps and dispose', { timeout: 30000 }, async () => {
  const folder = tempFolder();
  let alive = true;
  const changes = [];
  const terminals = service(folder, { ownerAlive: () => alive, onChange: () => changes.push(Date.now()) });
  const sender = fakeSender();
  try {
    const info = await terminals.call('create', { sessionId: 's1' }, sender);
    assert.ok(await until(() => output(sender, info.id).length > 0), 'the prompt arrived');
    assert.deepEqual(terminals.runningCommands(), []);
    terminals.input(sender, info.id, 'sleep 30\r');
    assert.ok(await until(() => terminals.runningCommands().length === 1), 'sleep is the foreground program');
    await terminals.pollBusy();
    assert.equal(terminals.agent.list('s1')[0].busy, true);
    assert.ok(sender.events.some((event) => event.kind === 'state' && event.info.busy === true));
    terminals.agent.interrupt('s1', info.id);
    assert.ok(await until(() => terminals.runningCommands().length === 0), 'Ctrl-C ends it');
    // read_terminal: waits for new output, returns plain lines.
    const reading = terminals.agent.read('s1', info.id, { lines: 5, waitMs: 5000 });
    setTimeout(() => terminals.input(sender, info.id, 'printf "\\033[31mred\\033[0m line\\n"\r'), 100);
    const { text } = await reading;
    assert.ok(text.split('\n').length <= 5);
    assert.ok(await until(async () => /^red line$/m.test((await terminals.agent.read('s1', info.id)).text)));
    assert.ok(changes.length > 0);
    // The session is gone → the terminal ends with reason session-gone.
    alive = false;
    terminals.sweep();
    assert.ok(sender.events.some((event) => event.kind === 'removed' && event.id === info.id && event.reason === 'session-gone'));
    assert.equal(terminals.size, 0);
    alive = true;
    // dispose hangs up every shell and refuses new ones.
    const one = await terminals.call('create', { sessionId: 's1' }, sender);
    const pid = (await terminals.call('list', { sessionId: 's1' }, sender)).find((tab) => tab.id === one.id);
    assert.ok(pid);
    await terminals.dispose();
    assert.equal(terminals.size, 0);
    await assert.rejects(terminals.call('create', { sessionId: 's1' }, sender), /quitting/);
  } finally { await terminals.dispose(); }
});

test('a folder deleted under a terminal keeps the tab and its scrollback, says so, and ends only an idle shell', { timeout: 20000 }, async () => {
  const root = tempFolder();
  const folder = path.join(root, 'project');
  fs.mkdirSync(folder);
  const terminals = service(folder);
  const sender = fakeSender();
  try {
    const idle = await terminals.call('create', { sessionId: 's1' }, sender);
    terminals.input(sender, idle.id, 'echo kept-scrollback\r');
    assert.ok(await until(() => /kept-scrollback/.test(output(sender, idle.id))));
    await terminals.pollBusy();
    fs.rmSync(folder, { recursive: true, force: true });
    terminals.sweep();
    assert.equal(terminals.size, 1, 'the tab stays');
    assert.ok(await until(() => terminals.agent.list('s1')[0]?.status === 'exited'), 'the idle shell ended');
    assert.equal(terminals.agent.list('s1')[0].error, 'The session folder no longer exists.');
    assert.equal(sender.events.some((event) => event.kind === 'removed'), false);
    assert.match((await terminals.agent.read('s1', idle.id)).text, /kept-scrollback/);
  } finally { await terminals.dispose(); }
});

test('a deleted folder refuses new terminals; a broken node-pty falls back to the script backend', { timeout: 20000 }, async () => {
  const folder = tempFolder();
  const gone = path.join(folder, 'gone');
  const terminals = createTerminalService({ resolveOwner: () => gone, shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin:/bin', HOME: folder } });
  await assert.rejects(terminals.call('create', { sessionId: 's1' }, fakeSender()), /The session folder no longer exists/);
  const broken = service(folder, { loadPty: () => ({ error: 'dlopen failed' }) });
  const sender = fakeSender();
  try {
    const info = await broken.call('create', { sessionId: 's1' }, sender);
    assert.equal(info.backend, 'script');
    assert.equal(info.limited, true);
    assert.equal(info.error, 'dlopen failed');
    broken.input(sender, info.id, 'echo fallback-ok\r');
    assert.ok(await until(() => /fallback-ok/.test(output(sender, info.id))));
    assert.deepEqual(await broken.call('hello', {}, sender), { backend: 'script' });
    // Busy for the script backend: the shell under script has a child.
    // The echo's process can still be exiting when its output arrives (a loaded machine): idle once it has.
    assert.ok(await until(async () => { await broken.pollBusy(); return (await broken.call('list', { sessionId: 's1' }, sender))[0].busy === false; }), 'idle after the echo');
    broken.input(sender, info.id, 'sleep 20\r');
    assert.ok(await until(async () => { await broken.pollBusy(); return broken.runningCommands().length === 1; }), 'sleep shows as running');
    broken.agent.interrupt('s1', info.id);
    assert.ok(await until(async () => { await broken.pollBusy(); return broken.runningCommands().length === 0; }), 'Ctrl-C reaches it through script');
    // A spawn that throws inside node-pty also falls back.
    const throwing = service(folder, { loadPty: () => ({ module: { spawn: () => { throw new Error('posix_spawnp failed.'); } } }) });
    const fallback = await throwing.call('create', { sessionId: 's1' }, sender);
    assert.equal(fallback.backend, 'script');
    assert.equal(fallback.error, 'posix_spawnp failed.');
    await throwing.dispose();
  } finally { await broken.dispose(); }
});

test('terminalEnv: the app environment minus Electron/app internals, with PATH, proxy and terminal identification', () => {
  const env = terminalEnv({ PATH: '/usr/bin:/bin', HOME: '/Users/u', ELECTRON_RUN_AS_NODE: '1', CODE_DESKTOP_DATA: '/d', TERM_SESSION_ID: 'x', KEEP: 'yes', BAD: 'a\u0000b' },
    { shellProxy: { HTTPS_PROXY: 'http://127.0.0.1:7890' }, version: '0.2.130' });
  assert.equal(env.KEEP, 'yes');
  for (const key of ['ELECTRON_RUN_AS_NODE', 'CODE_DESKTOP_DATA', 'TERM_SESSION_ID', 'BAD']) assert.equal(env[key], undefined, key);
  assert.equal(env.PATH, '/Users/u/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin');
  assert.equal(env.HTTPS_PROXY, 'http://127.0.0.1:7890');
  assert.equal(env.https_proxy, 'http://127.0.0.1:7890');
  assert.match(env.NO_PROXY, /localhost,127\.0\.0\.1,::1/);
  assert.deepEqual([env.TERM, env.COLORTERM, env.TERM_PROGRAM, env.TERM_PROGRAM_VERSION, env.LANG], ['xterm-256color', 'truecolor', 'CodeDesktop', '0.2.130', 'en_US.UTF-8']);
  assert.equal(terminalEnv({ PATH: '/bin', LC_ALL: 'C' }).LANG, undefined, 'an existing locale is kept');
  assert.equal(terminalEnv({ PATH: '/bin', HTTPS_PROXY: 'http://own' }, { shellProxy: { HTTPS_PROXY: 'http://shell' } }).HTTPS_PROXY, 'http://own');
});

test('terminalEnv: the app\'s saved core keys (stripEnv) never reach a shell; CODE_DESKTOP_* search keys neither', () => {
  const env = terminalEnv({ PATH: '/bin', DEEPSEEK_API_KEY: 'sk-saved-in-app', DEEPSEEK_BASE_URL: 'http://127.0.0.1:50123/v1', CODE_DESKTOP_DEEPSEEK_SEARCH_KEY: 'sk-official', OPENAI_API_KEY: 'mine' },
    { strip: ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL'] });
  for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY']) assert.equal(env[key], undefined, key);
  assert.equal(env.OPENAI_API_KEY, 'mine', 'a variable the app did not set for its cores stays');
});

test('resolveShell: an executable absolute override, $SHELL, else a system shell', () => {
  assert.equal(resolveShell({ override: '/bin/sh', env: {} }), '/bin/sh');
  assert.equal(resolveShell({ override: 'sh', env: { SHELL: '/bin/sh' } }), '/bin/sh');
  assert.equal(resolveShell({ override: '/etc/hosts', env: { SHELL: '/bin/sh' } }), '/bin/sh');
  assert.ok(path.isAbsolute(resolveShell({ env: { SHELL: '/nope/zsh' } })));
});

for (const backend of ['pty', 'script']) {
  test(`${backend}: shell mode runs one command in a tab and wait() hands back its output and exit code`, { timeout: 20000 }, async () => {
    const folder = tempFolder();
    const terminals = service(folder, { forceScript: backend === 'script' });
    const sender = fakeSender();
    try {
      await assert.rejects(terminals.call('run', { sessionId: null, command: 'echo x' }, sender), /Start a local session first/);
      await assert.rejects(terminals.call('run', { sessionId: 's1', command: '  ' }, sender), /Enter a shell command/);
      const info = await terminals.call('run', { sessionId: 's1', command: "printf 'shell-%s\\n' ok; exit 3" }, sender);
      assert.equal(info.title, "printf 'shell-%s\\n' ok; exit 3".slice(0, 40));
      assert.ok(sender.events.some((event) => event.kind === 'opened' && event.id === info.id), 'the pane shows the tab');
      const result = await terminals.call('wait', { sessionId: 's1', id: info.id, timeoutMs: 15000 }, sender);
      assert.equal(result.running, false);
      assert.equal(result.exitCode, 3);
      assert.match(result.output, /shell-ok/);
      await assert.rejects(terminals.call('wait', { sessionId: 's2', id: info.id, timeoutMs: 10 }, sender), /Unknown terminal/, 'another session can’t read it');
    } finally { terminals.dispose(); }
  });
}

test('adopt: the New session page’s terminals move to the session its first prompt started (same folder only)', { timeout: 20000 }, async () => {
  const folder = tempFolder();
  const terminals = service(folder);
  const sender = fakeSender();
  try {
    const home = await terminals.call('create', { sessionId: null, homeWorkspace: folder }, sender);
    const moved = await terminals.call('adopt', { sessionId: 's1', homeWorkspace: folder }, sender);
    assert.deepEqual(moved.map((entry) => entry.id), [home.id]);
    assert.equal(moved[0].sessionId, 's1');
    assert.deepEqual((await terminals.call('list', { sessionId: null, homeWorkspace: folder }, sender)), []);
    assert.deepEqual((await terminals.call('list', { sessionId: 's1' }, sender)).map((entry) => entry.id), [home.id]);
    assert.ok(sender.events.some((event) => event.kind === 'removed' && event.id === home.id && event.reason === 'moved'));
  } finally { terminals.dispose(); }
});

test('pty: a terminal shown in two windows runs at the smaller size, and the other window\'s size returns when one leaves', { timeout: 30000 }, async () => {
  const folder = tempFolder();
  const terminals = service(folder);
  const first = fakeSender(), second = fakeSender();
  try {
    const info = await terminals.call('create', { sessionId: 's1', cols: 100, rows: 30 }, first);
    assert.deepEqual(await terminals.call('resize', { sessionId: 's1', id: info.id, cols: 100, rows: 30 }, first), { cols: 100, rows: 30 });
    const attached = await terminals.call('attach', { sessionId: 's1', id: info.id }, second);
    assert.deepEqual(attached.size, { cols: 100, rows: 30 }, 'attach reports the PTY size the output was drawn at');
    assert.deepEqual(await terminals.call('resize', { sessionId: 's1', id: info.id, cols: 41, rows: 50 }, second), { cols: 41, rows: 30 }, 'the smallest of both');
    terminals.input(first, info.id, 'stty size\r');
    assert.ok(await until(() => /30 41/.test(output(first, info.id))), output(first, info.id));
    assert.deepEqual(await terminals.call('detach', { sessionId: 's1', id: info.id }, second), { cols: 100, rows: 30 }, 'the second window stopped showing it');
    assert.deepEqual(await terminals.call('resize', { sessionId: 's1', id: info.id, cols: 41, rows: 50 }, second), { cols: 41, rows: 30 });
    second.destroy();
    terminals.input(first, info.id, 'stty size\r');
    assert.ok(await until(() => /30 100/.test(output(first, info.id))), 'a closed window no longer limits the size');
  } finally { terminals.dispose(); }
});

for (const backend of ['pty', 'script']) {
  test(`${backend}: file links resolve from the shell's current folder; ⌘K's clear drops the kept output for re-attaching views and read_terminal`, { timeout: 30000 }, async () => {
    const folder = tempFolder();
    fs.mkdirSync(path.join(folder, 'sub'));
    fs.writeFileSync(path.join(folder, 'notes.md'), '# ROOT');
    fs.writeFileSync(path.join(folder, 'sub/notes.md'), '# SUB');
    fs.writeFileSync(path.join(folder, 'sub/only.md'), '# ONLY');
    const terminals = service(folder, { forceScript: backend === 'script' });
    const sender = fakeSender();
    try {
      const info = await terminals.call('create', { sessionId: 's1' }, sender);
      assert.ok(await until(() => output(sender, info.id).length > 0), 'the prompt arrived');
      assert.deepEqual(await terminals.call('paths', { sessionId: 's1', id: info.id, paths: ['notes.md', 'only.md'] }, sender), ['notes.md', null]);
      terminals.input(sender, info.id, 'cd sub && echo MOVED-IN\r');
      assert.ok(await until(() => /MOVED-IN/.test(output(sender, info.id))));
      assert.ok(await until(async () => (await terminals.call('paths', { sessionId: 's1', id: info.id, paths: ['notes.md'] }, sender))[0] === path.join('sub', 'notes.md')), 'the shell folder first');
      assert.deepEqual(await terminals.call('paths', { sessionId: 's1', id: info.id, paths: ['only.md', 'sub/only.md'] }, sender), [path.join('sub', 'only.md'), path.join('sub', 'only.md')]);
      // Without the terminal named: the session folder, as before.
      assert.deepEqual(await terminals.call('paths', { sessionId: 's1', paths: ['notes.md'] }, sender), ['notes.md']);
      terminals.input(sender, info.id, 'echo SECRET-TOKEN-XYZ\r');
      assert.ok(await until(() => /SECRET-TOKEN-XYZ/.test(output(sender, info.id))));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cleared = await terminals.call('clear', { sessionId: 's1', id: info.id }, sender);
      assert.equal(cleared.cleared, true);
      assert.ok(sender.events.some((event) => event.kind === 'cleared' && event.id === info.id));
      assert.equal((await terminals.call('attach', { sessionId: 's1', id: info.id }, sender)).output.includes('SECRET-TOKEN-XYZ'), false);
      assert.equal((await terminals.agent.read('s1', info.id, { lines: 40 })).text.includes('SECRET-TOKEN-XYZ'), false);
    } finally { await terminals.dispose(); }
  });
}

// B20: a code block's Run asks which shells are idle now ("probe"), waits for a new shell's prompt and learns where the
// output stood ("ready"), and a bash-turn run from a code block opens no pane in other windows ("run" quiet).
test('code-block run: probe reports live/busy shells, ready returns the output offset, quiet run announces no tab', { timeout: 30000 }, async () => {
  const folder = tempFolder();
  const terminals = service(folder);
  const sender = fakeSender();
  try {
    const info = await terminals.call('create', { sessionId: 's1' }, sender);
    const ready = await terminals.call('ready', { sessionId: 's1', id: info.id }, sender);
    assert.ok(ready.at > 0, 'the prompt came first');
    assert.equal(ready.at, output(sender, info.id).length, 'everything before the offset reached the window');
    assert.deepEqual(await terminals.call('probe', { sessionId: 's1' }, sender), { live: [info.id], busy: [], unknown: [] });
    terminals.input(sender, info.id, 'sleep 30\r');
    assert.ok(await until(async () => (await terminals.call('probe', { sessionId: 's1' }, sender)).busy.includes(info.id)), 'sleep makes it busy');
    terminals.input(sender, info.id, '\x03');
    const before = sender.events.length;
    const run = await terminals.call('run', { sessionId: 's1', command: 'echo quiet-run', quiet: true }, sender);
    assert.ok(!sender.events.slice(before).some((event) => event.kind === 'opened'), 'no opened event');
    const probe = await terminals.call('probe', { sessionId: 's1' }, sender);
    assert.ok(!probe.live.includes(run.id), 'a run tab is never typed into');
    const done = await terminals.call('wait', { sessionId: 's1', id: run.id, timeoutMs: 10000 }, sender);
    assert.match(done.output, /quiet-run/);
    await assert.rejects(terminals.call('ready', { sessionId: 's1', id: 'term-nope00' }, sender), /Unknown terminal/);
  } finally { await terminals.dispose(); }
});
