// R4e-terminal: terminal-14 (the agent terminal tools' wording for a tab that has no shell, and the tab_id check) and
// terminal-17 (shell mode clears a command left running before the next one), against 2.42304.0. Each part first counts
// the official signatures in the installed main-process chunks, then drives the local code: the real terminal service
// over an injected fake node-pty, so no shell or other process is started, nothing listens and no real PTY opens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tools, tabIdArgument, NO_TABS_TO_READ, READ_TAB_ID_NOT_STRING, STOP_TAB_ID_REQUIRED, unknownTabToRead, unknownTabToStop } from '../electron/agent-tools/terminal.mjs';
import { INTERRUPTED_PREVIOUS_NOTE, bashTurnRunGoing, withInterruptedPreviousNote } from '../src/shell-run-r4e-terminal.mjs';
import { shellOutputMessage } from '../src/shell-mode-model.mjs';
import { createTerminalStore } from '../src/terminal-store.mjs';

const require = createRequire(import.meta.url);
const { createTerminalService, parseForegroundProcessGroup } = require('../electron/terminal-service.cjs');
const app = path.resolve(import.meta.dirname, '..');
const build = path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build');
const older = path.resolve(app, '../reference/installed-2.37337.1-20261015/asar/.vite/build');
const read = (file) => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };

const folders = [];
const tempFolder = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'r4e-terminal-'))); folders.push(dir); return dir; };
test.after(() => { for (const dir of folders) fs.rmSync(dir, { recursive: true, force: true }); });

/**
 * node-pty stand-in: spawn() hands back a terminal that records what it was sent. Ctrl-C ends it (exit 130) unless
 * `ignoreInterrupt`, SIGKILL ends it unless `ignoreKill`, any other signal ends it. pid stays undefined, so the
 * service's grace-period kill never reaches a real process.
 */
function fakePty() {
  const spawned = [];
  const module = {
    spawn(shell, args, options) {
      const data = [], exits = [];
      const term = {
        pid: undefined, process: path.basename(shell), shell, args, cwd: options.cwd, writes: [], kills: [], exited: false,
        ignoreInterrupt: false, ignoreKill: false,
        write(chunk) { term.writes.push(chunk); if (chunk === '\x03' && !term.ignoreInterrupt) term.end(130, 0); },
        resize() {},
        kill(signal = 'SIGHUP') { term.kills.push(signal); if (signal !== 'SIGKILL' || !term.ignoreKill) term.end(null, signal === 'SIGKILL' ? 9 : 1); },
        onData(listener) { data.push(listener); },
        onExit(listener) { exits.push(listener); },
        print(text) { for (const listener of data) listener(text); },
        end(exitCode, signal = 0) { if (term.exited) return; term.exited = true; queueMicrotask(() => { for (const listener of exits) listener({ exitCode, signal }); }); },
      };
      spawned.push(term);
      return term;
    },
  };
  return { load: () => ({ module }), spawned };
}
function fakeSender() {
  const events = [];
  let destroyed = false, onDestroyed = null;
  return { events, send: (_channel, event) => events.push(event), isDestroyed: () => destroyed,
    once: (name, listener) => { if (name === 'destroyed') onDestroyed = listener; }, destroy() { destroyed = true; onDestroyed?.(); } };
}
function setup() {
  const folder = tempFolder();
  const pty = fakePty();
  const terminals = createTerminalService({
    resolveOwner: ({ sessionId }) => { if (sessionId === 's1' || sessionId === 's2') return folder; throw new Error('Unknown session.'); },
    shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin:/bin', HOME: folder }, loadPty: pty.load,
  });
  return { folder, pty, terminals, sender: fakeSender() };
}
async function until(predicate, ms = 4000) {
  const started = Date.now();
  while (Date.now() - started < ms) { if (await predicate()) return true; await new Promise((resolve) => setTimeout(resolve, 10)); }
  return false;
}
const tool = (name) => tools.find((entry) => entry.name === name);
const textOf = (result) => result.content.map((part) => part.text).join('\n');

// ---- terminal-14 -----------------------------------------------------------------------------------------------------

test('terminal-14 official: 2.42304.0 read_terminal / stop_terminal_tab say why there is no shell and which tabs can be read', () => {
  const server = read(path.join(build, 'index.chunk-mUVxzIdB.js'));
  once(server, [
    'o="No shell is running in the primary terminal (the Terminal panel may be closed, or its shell may have exited), so there is nothing to read. If the user ran the command somewhere else, ask them to paste the output or to run it in the app\'s Terminal panel."',
    'function s(e){return`No shell is running in a terminal tab with id "${e}" (there may be no such tab, or its shell may have exited). Omit tab_id to read the primary terminal, or ask the user which tab to read.`}',
    'function c(e){return JSON.stringify(e.slice(0,40))}',
    'No shell is running in the primary terminal, but these terminal tabs of this session can be read: ${t}. Pass one as tab_id.',
    'missing:`No shell is running in a terminal tab with id ${s} (there may be no such tab, or its shell may have exited), so there is nothing to stop. list_terminal_tabs shows the tabs that have a shell or wait for their host.`',
    'stop_terminal_tab requires `tab_id` (a string): the tab_id run_in_terminal or open_terminal_tab returned, or one list_terminal_tabs shows with opened_by "claude".',
    // read_terminal itself ignores a tab_id that isn't a string, and "nothing to read" is a result (t.n), not an error.
    'g=typeof a.tab_id=="string"?a.tab_id:void 0',
    'if("noShell"in e)return t.n(v())',
    'if(w==="closed")return t.n(v())',
  ]);
  const shared = read(path.join(build, 'index.chunk-muI2IV6k.js'));
  once(shared, [
    'function tUr(e){if(e!=null)return typeof e=="string"?e.trim()===""?void 0:e.trim():null}',
    'case"missing":return t===null?"tab_id must be a string: the id that run_in_terminal or open_terminal_tab returned for a tab, or one that list_terminal_tabs shows. Omit tab_id to open a new tab."',
  ]);
  // Not new in 2.42304.0: 2.37337.1 has the same wording.
  const before = read(path.join(older, 'index.chunk-BhVZ0gj8.js'));
  assert.ok(before.includes('(there may be no such tab, or its shell may have exited). Omit tab_id to read the primary terminal, or ask the user which tab to read.'));
});

test('terminal-14 local: tab_id is the official argument (absent, a trimmed string, or not a string)', () => {
  assert.equal(tabIdArgument(undefined), undefined);
  assert.equal(tabIdArgument(null), undefined);
  assert.equal(tabIdArgument('  '), undefined);
  assert.equal(tabIdArgument(' term-abc123 '), 'term-abc123');
  for (const value of [7, true, {}, ['term-abc123']]) assert.equal(tabIdArgument(value), null, JSON.stringify(value));
  assert.equal(unknownTabToRead('x'.repeat(60), []), `No shell is running in a terminal tab with id "${'x'.repeat(40)}" (there may be no such tab, or it was closed, which ended its shell). No terminal tabs are open in this session, so there is nothing to read.`);
  assert.equal(unknownTabToRead('term-gone00', ['term-aaaaaa']), 'No shell is running in a terminal tab with id "term-gone00" (there may be no such tab, or it was closed, which ended its shell). Terminal tab "term-aaaaaa" of this session can be read: pass tab_id "term-aaaaaa", or omit tab_id to read it.');
  assert.equal(unknownTabToRead('term-gone00', ['term-aaaaaa', 'term-bbbbbb']), 'No shell is running in a terminal tab with id "term-gone00" (there may be no such tab, or it was closed, which ended its shell). These terminal tabs of this session can be read: "term-aaaaaa", "term-bbbbbb". Pass one as tab_id, or omit tab_id to read the most recently opened one.');
  assert.equal(unknownTabToStop('term-gone00'), 'No shell is running in a terminal tab with id "term-gone00" (there may be no such tab, or it was closed, which ended its shell), so there is nothing to stop. list_terminal_tabs shows the tabs of this session.');
});

test('terminal-14 local: read_terminal and stop_terminal_tab over the terminal service', { timeout: 20000 }, async () => {
  const { folder, pty, terminals, sender } = setup();
  const ctx = (sessionId = 's1') => ({ sessionId, cwd: folder, terminals });
  try {
    // No tab: nothing to read is a result, not an error; a tab_id that isn't a string is refused before anything else.
    const none = await tool('read_terminal').handler({}, ctx());
    assert.equal(none.isError, undefined);
    assert.equal(textOf(none), NO_TABS_TO_READ);
    await assert.rejects(tool('read_terminal').handler({ tab_id: 42 }, ctx()), (error) => error.message === READ_TAB_ID_NOT_STRING);
    const first = await terminals.call('create', { sessionId: 's1' }, sender);
    const second = await terminals.call('create', { sessionId: 's1' }, sender);
    pty.spawned[0].print('first-tab-output\r\n');
    pty.spawned[1].print('second-tab-output\r\n');
    // Never a silent fallback to the default tab for a tab_id that isn't a string.
    for (const tabId of [42, { id: first.id }, [first.id], false]) await assert.rejects(tool('read_terminal').handler({ tab_id: tabId }, ctx()), (error) => error.message === READ_TAB_ID_NOT_STRING);
    // Without tab_id (or a blank one): the most recently opened tab; a padded id is trimmed (official tUr).
    for (const args of [{}, { tab_id: '' }, { tab_id: null }]) assert.match(textOf(await tool('read_terminal').handler(args, ctx())), /second-tab-output/);
    assert.match(textOf(await tool('read_terminal').handler({ tab_id: ` ${first.id} ` }, ctx())), /first-tab-output/);
    // An unknown tab_id: says the tab may not exist or was closed, and names the tabs that can be read.
    const unknown = await tool('read_terminal').handler({ tab_id: 'term-nothere1' }, ctx());
    assert.equal(unknown.isError, undefined);
    assert.equal(textOf(unknown), unknownTabToRead('term-nothere1', [first.id, second.id]));
    // A tab whose shell exited stays readable (the host's contract), so it is still listed as one.
    pty.spawned[1].end(0);
    assert.ok(await until(() => terminals.agent.list('s1')[1].status === 'exited'));
    assert.match(textOf(await tool('read_terminal').handler({ tab_id: second.id }, ctx())), /"status":"exited"[\s\S]*second-tab-output/);
    // Another session's tab is unknown here and its output stays out of the answer.
    const elsewhere = textOf(await tool('read_terminal').handler({ tab_id: first.id }, ctx('s2')));
    assert.equal(elsewhere, unknownTabToRead(first.id, []));
    // A tab closed while read_terminal waits for its output: the same answer as an unknown one.
    const waiting = tool('read_terminal').handler({ tab_id: first.id, wait_for_output_ms: 3000 }, ctx());
    setTimeout(() => { void terminals.call('close', { sessionId: 's1', id: first.id }, sender); }, 50);
    assert.equal(textOf(await waiting), unknownTabToRead(first.id, [second.id]));
    // stop_terminal_tab: tab_id is required as a string; an unknown one is an error naming it.
    for (const tabId of [undefined, null, '', 7]) await assert.rejects(tool('stop_terminal_tab').handler({ tab_id: tabId }, ctx()), (error) => error.message === STOP_TAB_ID_REQUIRED);
    await assert.rejects(tool('stop_terminal_tab').handler({ tab_id: first.id }, ctx()), (error) => error.message === unknownTabToStop(first.id));
    await assert.rejects(tool('stop_terminal_tab').handler({ tab_id: '../x' }, ctx()), (error) => error.message === unknownTabToStop('../x'));
    // A tab the user opened is still refused as before.
    await assert.rejects(tool('stop_terminal_tab').handler({ tab_id: second.id }, ctx()), /only stop tabs you opened/);
  } finally { await terminals.dispose(); }
});

// ---- terminal-17 -----------------------------------------------------------------------------------------------------

const runCommandOf = (text) => { const start = text.indexOf('async runCommand(e,n)'); return text.slice(start, text.indexOf('cleanPtyOutput(e,t,n=!1){', start)); };
const tokens = (text) => text.match(/[A-Za-z_$][A-Za-z0-9_$]*|\d[\w.]*|\S/g);

test('terminal-17 official: 2.42304.0 runCommand refuses a run in flight and clears a leftover command (^C, SIGKILL, 1500/100 ms)', () => {
  const shell = read(path.join(build, 'index.chunk-D7Sj9EoB.js'));
  once(shell, [
    'async runCommand(e,n){if(this.runCommandInFlight.has(e))return{error:"A command is already running in this session"};this.runCommandInFlight.add(e);',
    'a=r&&i?await i.interruptLast(this.hiddenShellIo(e,r,"notify")):void 0;if(r&&this.bashMarksSayRunning(e)){r.write("\\x03");let n=Date.now()+Lt',
    'a=i()?"interrupted":"stuck",a==="interrupted"&&t.iz("desktop_ccd_bash_stale_interrupted",{cleared_by:"sigint"})',
    // The live path for a local shell: the probe sees a busy foreground group → Ctrl-C, then SIGKILL, each polled.
    'for(let r of["\\x03","SIGKILL"]){let i=await this.probeForegroundProcessGroup(u.pid);if(!i?.busy){n=!0;break}',
    'let a=Date.now()+Lt;for(;Date.now()<a;){if(await $(Rt),',
    'if(!n)return this.stopBashPty(e),t.iz("desktop_ccd_bash_shell_reset",{}),{error:"The previous command could not be interrupted, so the bash-mode shell was reset (its cd/exports were lost). Re-run your command; if the previous one needs interactive input, run it in the terminal pane."}',
    '...h?{interruptedPrevious:!0}:{}',
    'finally{this.runCommandInFlight.delete(e)}',
    'Lt=1500', 'Rt=100',
  ]);
  // bashMarksSayRunning is never overridden: the ^C-and-wait-for-the-prompt block never runs in this build.
  assert.equal(count(shell, 'bashMarksSayRunning'), 3);
  once(shell, ['bashMarksSayRunning(e){return!1}']);
  // interruptLast belongs to the Windows host's hidden PowerShell (prompt marks with a nonce): not a macOS path.
  const windowsHost = read(path.join(build, 'index.chunk-BZf_CQTv.js'));
  once(windowsHost, ['async interruptLast(e){', '[windowsHostShell] no prompt mark after Ctrl-C']);
  // Against 2.37337.1 the function is the same token for token, up to the minifier's names.
  const [a, b] = [tokens(runCommandOf(read(path.join(older, 'index.chunk-CmuEL3Lq.js')))), tokens(runCommandOf(shell))];
  assert.equal(a.length, b.length);
  const renamed = new Map();
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) renamed.set(a[index], b[index]);
  assert.deepEqual([...renamed.keys()].sort(), ['Et', 'SL', 'Tt', '_t', 'ht', 'vt', 'yt']);
  // The official renderer's refusal toast is the text the host uses.
  once(read(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c4491d238-2pS14-RT.js')), ['alreadyRunning:{defaultMessage:"A shell command is already running",id:"Ra+ugnmKye"}']);
});

test('terminal-17 local: a run still waited on is refused; one whose wait gave up is interrupted with Ctrl-C and the next starts', { timeout: 20000 }, async () => {
  const { pty, terminals, sender } = setup();
  try {
    const first = await terminals.call('run', { sessionId: 's1', command: 'sleep 1000' }, sender);
    // Its wait is on its way (the renderer sends it right after the reply): refused.
    await assert.rejects(terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender), /^Error: A shell command is already running$/);
    // While its wait runs: refused (official runCommandInFlight).
    const waiting = terminals.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 200 }, sender);
    await assert.rejects(terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender), /A shell command is already running/);
    const result = await waiting;
    assert.equal(result.running, true, 'the wait gave up at its deadline');
    const oldTerm = pty.spawned[0];
    assert.deepEqual(oldTerm.writes, [], 'nothing was typed into it');
    // Now a leftover: the next run sends it Ctrl-C, sees it end, and starts.
    const started = Date.now();
    const second = await terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender);
    assert.ok(Date.now() - started < 1500, 'it ended at the first poll');
    assert.deepEqual(oldTerm.writes, ['\x03']);
    assert.deepEqual(oldTerm.kills, [], 'no SIGKILL was needed');
    assert.equal(second.interruptedPrevious, true);
    assert.notEqual(second.id, first.id);
    assert.deepEqual(pty.spawned[1].args.slice(-2), ['-lc', 'echo next']);
    // The interrupted run's tab stays with its scrollback, as exited.
    const tabs = await terminals.call('list', { sessionId: 's1' }, sender);
    assert.deepEqual(tabs.map((tab) => [tab.id, tab.status]), [[first.id, 'exited'], [second.id, 'running']]);
    assert.equal(tabs[0].exitCode, 130);
    assert.equal(tabs[0].userTyped, false, 'the service typed the Ctrl-C, not the user');
    // The new run's wait hands back that it interrupted the previous one (the official bash turn tells the model).
    pty.spawned[1].print('next\r\n');
    pty.spawned[1].end(0);
    const done = await terminals.call('wait', { sessionId: 's1', id: second.id, timeoutMs: 5000 }, sender);
    assert.equal(done.running, false);
    assert.equal(done.exitCode, 0);
    assert.equal(done.interruptedPrevious, true);
    // A run with no leftover says nothing about one.
    const third = await terminals.call('run', { sessionId: 's1', command: 'true' }, sender);
    assert.equal(third.interruptedPrevious, undefined);
    pty.spawned[2].end(0);
    assert.equal((await terminals.call('wait', { sessionId: 's1', id: third.id, timeoutMs: 5000 }, sender)).interruptedPrevious, undefined);
  } finally { await terminals.dispose(); }
});

test('terminal-17 local: a leftover that ignores Ctrl-C gets SIGKILL after 1500 ms', { timeout: 20000 }, async () => {
  const { pty, terminals, sender } = setup();
  try {
    const first = await terminals.call('run', { sessionId: 's1', command: 'trap "" INT; sleep 1000' }, sender);
    pty.spawned[0].ignoreInterrupt = true;
    assert.equal((await terminals.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 10 }, sender)).running, true);
    const started = Date.now();
    const second = await terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender);
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 1450 && elapsed < 3000, `Ctrl-C was given its 1500 ms (${elapsed} ms)`);
    assert.deepEqual(pty.spawned[0].writes, ['\x03']);
    assert.deepEqual(pty.spawned[0].kills, ['SIGKILL']);
    assert.equal(second.interruptedPrevious, true);
    assert.equal((await terminals.call('list', { sessionId: 's1' }, sender))[0].status, 'exited');
  } finally { await terminals.dispose(); }
});

test('terminal-17 local: a leftover that survives Ctrl-C and SIGKILL is closed and the run refused with the advice to re-run it', { timeout: 20000 }, async () => {
  const { pty, terminals, sender } = setup();
  try {
    const first = await terminals.call('run', { sessionId: 's1', command: 'stuck' }, sender);
    Object.assign(pty.spawned[0], { ignoreInterrupt: true, ignoreKill: true });
    assert.equal((await terminals.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 10 }, sender)).running, true);
    const started = Date.now();
    await assert.rejects(terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender),
      /^Error: The previous command could not be interrupted, so its terminal tab was closed\. Re-run your command; if the previous one needs interactive input, run it in the terminal pane\.$/);
    assert.ok(Date.now() - started >= 2900, 'both steps were given their 1500 ms');
    assert.deepEqual(pty.spawned[0].writes, ['\x03']);
    assert.equal(pty.spawned[0].kills[0], 'SIGKILL');
    assert.equal(pty.spawned.length, 1, 'the new command was not started');
    assert.ok(sender.events.some((event) => event.kind === 'removed' && event.id === first.id), 'its tab was closed');
    assert.deepEqual(await terminals.call('list', { sessionId: 's1' }, sender), []);
    // Re-running it works.
    const again = await terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender);
    assert.equal(again.interruptedPrevious, undefined);
  } finally { await terminals.dispose(); }
});

test('terminal-17 local: a run tab the user typed into is theirs (left running, not blocking); a wait whose window closed lets go', { timeout: 20000 }, async () => {
  const { pty, terminals, sender } = setup();
  try {
    const first = await terminals.call('run', { sessionId: 's1', command: 'python3' }, sender);
    assert.equal((await terminals.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 10 }, sender)).running, true);
    assert.equal(terminals.input(sender, first.id, 'print(1)\r'), true);
    const second = await terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender);
    assert.equal(second.interruptedPrevious, undefined);
    assert.deepEqual(pty.spawned[0].writes, ['print(1)\r'], 'no Ctrl-C into the user’s tab');
    assert.equal((await terminals.call('list', { sessionId: 's1' }, sender))[0].status, 'running');
    // A wait from a window that then closes stops waiting, so the run it held becomes a leftover.
    const window = fakeSender();
    const held = terminals.call('wait', { sessionId: 's1', id: second.id, timeoutMs: 60000 }, window);
    await assert.rejects(terminals.call('run', { sessionId: 's1', command: 'echo third' }, sender), /A shell command is already running/);
    window.destroy();
    assert.equal((await held).running, true);
    const third = await terminals.call('run', { sessionId: 's1', command: 'echo third' }, sender);
    assert.equal(third.interruptedPrevious, true);
    assert.deepEqual(pty.spawned[1].writes, ['\x03']);
  } finally { await terminals.dispose(); }
});

// R4e integration (review low): Restart shell on a run tab runs its command again for the user, so it is theirs.
test('terminal-17 local: a run tab the user restarted is theirs too (not interrupted by the next run, not blocking it)', { timeout: 20000 }, async () => {
  const { pty, terminals, sender } = setup();
  try {
    const first = await terminals.call('run', { sessionId: 's1', command: 'npm run dev' }, sender);
    pty.spawned[0].end(1);
    const waited = await terminals.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 5000 }, sender);
    assert.equal(waited.running, false);
    const restarted = await terminals.call('restart', { sessionId: 's1', id: first.id }, sender);
    assert.equal(restarted.status, 'running');
    assert.equal(restarted.userTyped, false, 'a restart is not typing (the pane keeps its typed-exit rule)');
    assert.deepEqual(pty.spawned[1].args.slice(-2), ['-lc', 'npm run dev']);
    const second = await terminals.call('run', { sessionId: 's1', command: 'echo next' }, sender);
    assert.equal(second.interruptedPrevious, undefined);
    assert.deepEqual(pty.spawned[1].writes, [], 'no Ctrl-C into the restarted tab');
    assert.equal((await terminals.call('list', { sessionId: 's1' }, sender))[0].status, 'running');
  } finally { await terminals.dispose(); }
});

test('terminal-17 renderer: a bash turn whose wait came back no longer blocks the next; that one interrupts the leftover and tells the model', { timeout: 20000 }, async () => {
  const cc = read(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/cc43287c9-DAfOi8yP.js'));
  once(cc, ['r?.interruptedPrevious&&o.push("[A previous command was still running in this shell and was interrupted before running this one.]")']);
  assert.equal(withInterruptedPreviousNote('output', { interruptedPrevious: true }), `${INTERRUPTED_PREVIOUS_NOTE}\noutput`);
  assert.equal(withInterruptedPreviousNote('output', { interruptedPrevious: false }), 'output');
  assert.equal(withInterruptedPreviousNote('output', null), 'output');
  // main.jsx: both refusals use the helper, and the model message carries the note.
  const main = read(path.join(app, 'src/main.jsx'));
  assert.equal(count(main, 'if (bashTurnRunGoing(going, store.runRecord)) { toasts?.add(t("A shell command is already running"), { variant: "danger" }); return; }'), 2);
  assert.equal(count(main, 'going.mode === "dedicated"'), 0);
  assert.equal(count(main, 'input = composerInput(withInterruptedPreviousNote(shellOutputMessage(command, result), result), turnCwd);'), 1);
  // The renderer's terminal store over the real service (fake node-pty), driven as main.jsx's runCodeBlockTurn does.
  const { pty, terminals } = setup();
  const listeners = new Set();
  const window = { send: (_channel, event) => { for (const listener of [...listeners]) listener(event); }, isDestroyed: () => false, once() {} };
  const bridge = { call: (op, params) => terminals.call(op, params, window), write: (id, data) => terminals.input(window, id, data), onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  const store = createTerminalStore({ bridge });
  try {
    assert.equal(bashTurnRunGoing(store.inlineRun(), store.runRecord), false);
    const first = await store.runDedicated({ id: 'run-1', sessionId: 's1', command: 'npm run dev' });
    assert.equal(bashTurnRunGoing(store.inlineRun(), store.runRecord), true, 'its output still has to reach the model');
    const timedOut = await store.wait('s1', first.id, 10);
    assert.equal(timedOut.running, true);
    store.recordRun('run-1');
    assert.equal(store.inlineRun().settled, false, 'the command still runs (the old guard refused from here on)');
    assert.equal(bashTurnRunGoing(store.inlineRun(), store.runRecord), false, 'its wait came back: no longer in flight');
    const second = await store.runDedicated({ id: 'run-2', sessionId: 's1', command: 'echo next' });
    assert.equal(second.interruptedPrevious, true);
    assert.deepEqual(pty.spawned[0].writes, ['\x03']);
    pty.spawned[1].print('next\r\n');
    pty.spawned[1].end(0);
    const result = await store.wait('s1', second.id, 5000);
    assert.equal(result.interruptedPrevious, true);
    const message = withInterruptedPreviousNote(shellOutputMessage('echo next', result), result);
    assert.ok(message.startsWith(`${INTERRUPTED_PREVIOUS_NOTE}\nI ran this shell command in the terminal:\n`), message);
    assert.match(message, /\$ echo next\nnext/);
  } finally { store.dispose(); await terminals.dispose(); }
});

test('Y1-R4e-terminal-1: SIGKILL targets the foreground process group (-tpgid) via ps, clears on !busy, and falls back to -pid', async () => {
  // 1) Official Bt (parseForegroundProcessGroup): pgid > 0 && tpgid > 1, busy = pgid !== tpgid.
  assert.deepEqual(parseForegroundProcessGroup('  4100   4200 \n'), { pgid: 4100, tpgid: 4200, busy: true });
  assert.deepEqual(parseForegroundProcessGroup('4100 4100'), { pgid: 4100, tpgid: 4100, busy: false });
  assert.equal(parseForegroundProcessGroup('0 4200'), null);
  assert.equal(parseForegroundProcessGroup('4100 1'), null);
  assert.equal(parseForegroundProcessGroup(''), null);

  // 2) Foreground process group (tpgid=4200) ignores SIGINT: SIGKILL hits -4200 (not the shell pid 4100), and once
  //    tpgid is no longer busy in the injected process table, interruptRun succeeds even if the shell process stayed up.
  const pty1 = fakePty();
  let nextPid = 4100;
  const loadPty1 = () => ({
    module: {
      spawn(file, args, opts) {
        const term = pty1.load().module.spawn(file, args, opts);
        term.pid = nextPid++;
        term.ignoreInterrupt = true;
        return term;
      },
    },
  });
  const table1 = new Map([
    [4100, { pgid: 4100, tpgid: 4200 }],
    [4200, { pgid: 4200, tpgid: 4200 }],
  ]);
  table1.kills = [];
  const cwd = tempFolder();
  const sender = { isDestroyed: () => false, send() {} };
  const terminals1 = createTerminalService({
    resolveOwner: () => cwd, shell: '/bin/sh', shellProxy: null, loadPty: loadPty1, processTable: table1,
  });
  try {
    const first = await terminals1.call('run', { sessionId: 's1', command: 'trap "" INT HUP; sleep 99' }, sender);
    await terminals1.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 20 }, sender);
    const second = await terminals1.call('run', { sessionId: 's1', command: 'echo after-tpgid' }, sender);
    assert.equal(second.interruptedPrevious, true);
    assert.deepEqual(
      table1.kills,
      [
        { target: -4200, pgid: 4200, signal: 'SIGKILL' },
        { target: -4100, pgid: 4100, signal: 'SIGKILL' },
      ],
      'SIGKILL sent to -tpgid (-4200) first, then cleans up -shell.pid (-4100) once -tpgid cleared',
    );
    assert.deepEqual(pty1.spawned[0].kills, ['SIGKILL'], 'leftover -lc shell is reaped so the tab does not stay running');
    assert.equal((await terminals1.call('list', { sessionId: 's1' }, sender))[0].status, 'exited');
  } finally { await terminals1.dispose(); }

  // 2b) Non-interactive -lc run tab where pgid === tpgid (busy: false from the start, no job control):
  //     interruptRun does NOT short-circuit to idle before sending Ctrl-C / SIGKILL.
  const ptySameGroup = fakePty();
  let pidSameGroup = 4500;
  const tableSameGroup = new Map([
    [4500, { pgid: 4500, tpgid: 4500 }],
    [4501, { pgid: 4501, tpgid: 4501 }],
  ]);
  tableSameGroup.kills = [];
  const terminalsSameGroup = createTerminalService({
    resolveOwner: () => cwd, shell: '/bin/sh', shellProxy: null,
    loadPty: () => ({ module: { spawn(f, a, o) { const t = ptySameGroup.load().module.spawn(f, a, o); t.pid = pidSameGroup++; return t; } } }),
    processTable: tableSameGroup,
  });
  try {
    // First -lc tab (pid 4500, pgid===tpgid===4500) responds to Ctrl-C: not skipped despite !probe.busy.
    const run1 = await terminalsSameGroup.call('run', { sessionId: 's1', command: 'sleep 50' }, sender);
    await terminalsSameGroup.call('wait', { sessionId: 's1', id: run1.id, timeoutMs: 20 }, sender);
    const run2 = await terminalsSameGroup.call('run', { sessionId: 's1', command: 'trap "" INT; sleep 50' }, sender);
    assert.equal(run2.interruptedPrevious, true, 'pgid === tpgid run tab still interrupted by Ctrl-C');
    assert.deepEqual(ptySameGroup.spawned[0].writes, ['\x03']);
    assert.equal((await terminalsSameGroup.call('list', { sessionId: 's1' }, sender))[0].status, 'exited');

    // Second -lc tab (pid 4501, pgid===tpgid===4501) ignores Ctrl-C: escalates to SIGKILL on -4501 and exits.
    ptySameGroup.spawned[1].ignoreInterrupt = true;
    await terminalsSameGroup.call('wait', { sessionId: 's1', id: run2.id, timeoutMs: 20 }, sender);
    const run3 = await terminalsSameGroup.call('run', { sessionId: 's1', command: 'echo after-same-pgid' }, sender);
    assert.equal(run3.interruptedPrevious, true, 'pgid === tpgid run tab escalated to SIGKILL');
    assert.deepEqual(ptySameGroup.spawned[1].writes, ['\x03']);
    assert.deepEqual(tableSameGroup.kills, [{ target: -4501, pgid: 4501, signal: 'SIGKILL' }]);
    assert.deepEqual(ptySameGroup.spawned[1].kills, ['SIGKILL']);
    assert.equal((await terminalsSameGroup.call('list', { sessionId: 's1' }, sender))[1].status, 'exited');
  } finally { await terminalsSameGroup.dispose(); }

  // 3) Foreground process group survives SIGKILL (ignoreKill: true): stays busy, so the tab is closed and RUN_STUCK is thrown.
  const pty2 = fakePty();
  let pid2 = 5100;
  const table2 = new Map([
    [5100, { pgid: 5100, tpgid: 5200, ignoreKill: true }],
    [5200, { pgid: 5200, tpgid: 5200, ignoreKill: true }],
  ]);
  table2.kills = [];
  const terminals2 = createTerminalService({
    resolveOwner: () => cwd, shell: '/bin/sh', shellProxy: null,
    loadPty: () => ({ module: { spawn(f, a, o) { const t = pty2.load().module.spawn(f, a, o); t.pid = pid2++; t.ignoreInterrupt = true; return t; } } }),
    processTable: table2,
  });
  try {
    const first = await terminals2.call('run', { sessionId: 's1', command: 'stuck-fg' }, sender);
    await terminals2.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 20 }, sender);
    await assert.rejects(
      terminals2.call('run', { sessionId: 's1', command: 'echo blocked' }, sender),
      /The previous command could not be interrupted, so its terminal tab was closed/,
    );
    assert.deepEqual(table2.kills, [{ target: -5200, pgid: 5200, signal: 'SIGKILL' }]);
    assert.deepEqual(await terminals2.call('list', { sessionId: 's1' }, sender), []);
  } finally { await terminals2.dispose(); }

  // 4) Fallback when ps cannot find tpgid: SIGKILL targets the shell's own process group (-pid).
  const pty3 = fakePty();
  let pid3 = 6100;
  const emptyTable = new Map();
  emptyTable.kills = [];
  const terminals3 = createTerminalService({
    resolveOwner: () => cwd, shell: '/bin/sh', shellProxy: null,
    loadPty: () => ({ module: { spawn(f, a, o) { const t = pty3.load().module.spawn(f, a, o); t.pid = pid3++; t.ignoreInterrupt = true; return t; } } }),
    processTable: emptyTable,
  });
  try {
    const first = await terminals3.call('run', { sessionId: 's1', command: 'no-tpgid' }, sender);
    await terminals3.call('wait', { sessionId: 's1', id: first.id, timeoutMs: 20 }, sender);
    const second = await terminals3.call('run', { sessionId: 's1', command: 'echo fallback' }, sender);
    assert.equal(second.interruptedPrevious, true);
    assert.deepEqual(emptyTable.kills, [{ target: -6100, pgid: 6100, signal: 'SIGKILL' }], 'falls back to -shell.pid (-6100)');
  } finally { await terminals3.dispose(); }
});
