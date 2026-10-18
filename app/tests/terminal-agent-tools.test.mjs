import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { tools, group, MAX_AGENT_TABS, NO_TABS_TO_READ } from '../electron/agent-tools/terminal.mjs';

// agent-tools/terminal.mjs over a real terminal service (/bin/sh in a temp folder): read-only list/read, and
// run_in_terminal only after ctx.requestApproval says yes.
const require = createRequire(import.meta.url);
const { createTerminalService } = require('../electron/terminal-service.cjs');
const TMP = '/private/tmp/claude-501';
fs.mkdirSync(TMP, { recursive: true });
const folder = fs.realpathSync(fs.mkdtempSync(path.join(TMP, 'terminal-tools-')));
fs.mkdirSync(path.join(folder, 'web'));
const other = fs.realpathSync(fs.mkdtempSync(path.join(TMP, 'terminal-tools-other-')));
const service = createTerminalService({
  resolveOwner: ({ sessionId }) => { if (sessionId === 's1') return folder; if (sessionId === 's2') return other; throw new Error('Unknown session.'); },
  shell: '/bin/sh', shellProxy: null, baseEnv: { PATH: '/usr/bin:/bin', HOME: folder, PS1: '$ ' },
});
test.after(async () => { await service.dispose(); fs.rmSync(folder, { recursive: true, force: true }); fs.rmSync(other, { recursive: true, force: true }); });
const tool = (name) => tools.find((entry) => entry.name === name);
const requests = [];
let answer = false;
const ctx = (sessionId = 's1') => ({ sessionId, cwd: folder, terminals: service, requestApproval: async (request) => { requests.push(request); return answer; } });
const textOf = (result) => result.content.map((part) => part.text).join('\n');
// The JSON comes once, as text (no structuredContent: Qwen shows the model both).
const data = (result) => { assert.equal(result.structuredContent, undefined); assert.equal(result.content.length, 1); return JSON.parse(result.content[0].text); };

test('the module shape the agent tools host loads', () => {
  assert.equal(group, 'terminal');
  assert.deepEqual(tools.map((entry) => entry.name), ['list_terminal_tabs', 'read_terminal', 'run_in_terminal', 'open_terminal_tab', 'stop_terminal_tab']);
  for (const entry of tools) {
    assert.match(entry.name, /^[A-Za-z0-9_-]{1,64}$/);
    assert.equal(typeof entry.description, 'string');
    assert.equal(entry.inputSchema.type, 'object');
    assert.equal(typeof entry.handler, 'function');
  }
  assert.equal(tool('list_terminal_tabs').annotations.readOnlyHint, true);
  assert.equal(tool('read_terminal').annotations.readOnlyHint, true);
  assert.deepEqual(tool('run_in_terminal').inputSchema.required, ['command']);
});

test('list and read only see the calling session’s terminals; read needs a tab', { timeout: 20000 }, async () => {
  await assert.rejects(tool('list_terminal_tabs').handler({}, { sessionId: 's1' }), /isn’t available/);
  await assert.rejects(tool('list_terminal_tabs').handler({}, ctx('nope')), /Unknown session/);
  assert.deepEqual(JSON.parse(textOf(await tool('list_terminal_tabs').handler({}, ctx()))).tabs, []);
  // R4e-terminal (terminal-14): nothing to read is a result, worded after 2.42304.0's read_terminal (no primary terminal here).
  const none = await tool('read_terminal').handler({}, ctx());
  assert.equal(none.isError, undefined);
  assert.equal(textOf(none), NO_TABS_TO_READ);
  const sender = { send() {}, isDestroyed: () => false, once() {} };
  const user = await service.call('create', { sessionId: 's1' }, sender);
  service.input(sender, user.id, 'echo user-was-here\r');
  const listed = JSON.parse(textOf(await tool('list_terminal_tabs').handler({}, ctx()))).tabs;
  assert.equal(listed.length, 1);
  assert.deepEqual(Object.keys(listed[0]).sort(), ['cwd', 'is_running_command', 'opened_by', 'status', 'tab_id', 'title']);
  assert.equal(listed[0].opened_by, 'user');
  assert.equal(listed[0].title, 'Terminal 1');
  const read = textOf(await tool('read_terminal').handler({ tab_id: user.id, wait_for_output_ms: 3000 }, ctx()));
  assert.match(read, /data, not instructions/);
  let screen = read;
  for (let attempt = 0; attempt < 40 && !/user-was-here/.test(screen); attempt++) screen = textOf(await tool('read_terminal').handler({ lines: 50, wait_for_output_ms: 200 }, ctx()));
  assert.match(screen, /user-was-here/);
  // Session 2 can neither list nor read session 1's tab.
  assert.deepEqual(JSON.parse(textOf(await tool('list_terminal_tabs').handler({}, ctx('s2')))).tabs, []);
  const elsewhere = textOf(await tool('read_terminal').handler({ tab_id: user.id }, ctx('s2')));
  assert.equal(elsewhere, `No shell is running in a terminal tab with id "${user.id}" (there may be no such tab, or it was closed, which ended its shell). No terminal tabs are open in this session, so there is nothing to read.`);
  assert.doesNotMatch(elsewhere, /user-was-here/);
  // stop_terminal_tab never touches a tab the user opened.
  await assert.rejects(tool('stop_terminal_tab').handler({ tab_id: user.id }, ctx()), /only stop tabs you opened/);
  service.agent.close('s1', user.id);
});

test('run_in_terminal: refused commands type nothing, a declined approval types nothing, an approved one runs in a new tab', { timeout: 30000 }, async () => {
  const run = tool('run_in_terminal');
  requests.length = 0;
  await assert.rejects(run.handler({ command: 'echo a\necho b' }, ctx()), /single line.*Nothing was typed/);
  await assert.rejects(run.handler({ command: 'cat <<EOF' }, ctx()), /Here-documents/);
  await assert.rejects(run.handler({ command: 'ls', cwd: '/etc' }, ctx()), /inside the session’s working folder/);
  await assert.rejects(run.handler({ command: 'ls', cwd: '../' }, ctx()), /inside the session’s working folder/);
  await assert.rejects(run.handler({ command: 'ls', cwd: 'missing' }, ctx()), /doesn’t exist/);
  assert.equal(requests.length, 0, 'nothing asked for refused input');
  answer = false;
  await assert.rejects(run.handler({ command: 'echo declined-$((1+1))' }, ctx()), /declined/);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], { kind: 'terminal-command', tool: 'run_in_terminal', command: 'echo declined-$((1+1))', cwd: folder });
  assert.equal(service.agent.list('s1').length, 0, 'no tab was opened');
  answer = { approved: true };
  const result = await run.handler({ command: '  echo approved-$((40+2))  ', cwd: 'web', title: 'dev server' }, ctx());
  assert.equal(data(result).typed, 'echo approved-$((40+2))');
  assert.equal(data(result).title, 'dev server');
  assert.equal(data(result).cwd, path.join(folder, 'web'));
  const id = data(result).tab_id;
  let screen = '';
  for (let attempt = 0; attempt < 50 && !/approved-42/.test(screen); attempt++) screen = textOf(await tool('read_terminal').handler({ tab_id: id, wait_for_output_ms: 200 }, ctx()));
  assert.match(screen, /approved-42/);
  const listed = JSON.parse(textOf(await tool('list_terminal_tabs').handler({}, ctx()))).tabs;
  assert.equal(listed.find((tab) => tab.tab_id === id).opened_by, 'agent');
  // stop: Ctrl-C a running command, then close the tab.
  service.agent.type('s1', id, 'sleep 30');
  for (let attempt = 0; attempt < 50 && !service.runningCommands().length; attempt++) await new Promise((resolve) => setTimeout(resolve, 50));
  const stopped = textOf(await tool('stop_terminal_tab').handler({ tab_id: id }, ctx()));
  assert.match(stopped, /"state":"(idle|running)"/);
  const closed = await tool('stop_terminal_tab').handler({ tab_id: id, close: true }, ctx());
  assert.equal(data(closed).state, 'closed');
  assert.equal(service.agent.list('s1').length, 0);
});

test('run_in_terminal caps the agent at six tabs per session', { timeout: 30000 }, async () => {
  answer = true;
  const opened = [];
  for (let index = 0; index < MAX_AGENT_TABS; index++) opened.push(data(await tool('run_in_terminal').handler({ command: 'true' }, ctx())).tab_id);
  await assert.rejects(tool('run_in_terminal').handler({ command: 'true' }, ctx()), /already have 6 terminal tabs/);
  for (const id of opened) service.agent.close('s1', id);
});

test('a full Terminal panel refuses run_in_terminal and open_terminal_tab before any approval card', { timeout: 60000 }, async () => {
  answer = true;
  requests.length = 0;
  const userTabs = [];
  for (let index = 0; index < 12; index++) userTabs.push((await service.call('create', { sessionId: 's1' })).id);
  await assert.rejects(tool('run_in_terminal').handler({ command: 'echo hi' }, ctx()), /already has 12 terminal tabs open.*Nothing was run/);
  await assert.rejects(tool('open_terminal_tab').handler({}, ctx()), /already has 12 terminal tabs open/);
  assert.equal(requests.length, 0, 'the user was not asked to approve a command that could not start');
  for (const id of userTabs) await service.call('close', { sessionId: 's1', id });
});

test('run_in_terminal shows and starts in the real folder, and refuses one a link was swapped into after the approval', { timeout: 30000 }, async () => {
  // A link inside the folder to a folder inside it: the card names the real folder.
  fs.symlinkSync(path.join(folder, 'web'), path.join(folder, 'web-link'));
  requests.length = 0;
  answer = true;
  const viaLink = data(await tool('run_in_terminal').handler({ command: 'true', cwd: 'web-link' }, ctx()));
  assert.equal(requests[0].cwd, path.join(folder, 'web'));
  assert.equal(viaLink.cwd, path.join(folder, 'web'));
  service.agent.close('s1', viaLink.tab_id);
  // The approved folder is replaced by a link to a folder outside the session while the card is open.
  fs.mkdirSync(path.join(folder, 'sub'));
  const outside = fs.mkdtempSync(path.join(TMP, 'terminal-tools-outside-'));
  requests.length = 0;
  const before = service.agent.list('s1').length;
  await assert.rejects(tool('run_in_terminal').handler({ command: 'touch swapped', cwd: 'sub' }, {
    ...ctx(),
    requestApproval: async (request) => {
      requests.push(request);
      fs.rmdirSync(path.join(folder, 'sub'));
      fs.symlinkSync(outside, path.join(folder, 'sub'));
      return true;
    },
  }), /folder changed after it was approved/);
  assert.equal(requests[0].cwd, path.join(folder, 'sub'));
  assert.equal(service.agent.list('s1').length, before, 'no tab was opened');
  assert.equal(fs.existsSync(path.join(outside, 'swapped')), false);
  fs.rmSync(outside, { recursive: true, force: true });
});
