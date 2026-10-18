// R3b-tasks step 2, tasks-05 (2.42304.0): /subtask <task> — a fork that gets the task in the background, the success
// toast, and the hand-backs when the fork or the send fails (r3b-tasks-subtask.mjs over the host fork), the command row
// and its parse (session-command-model.mjs), the generated originals (scripts/extract-r3b-tasks.mjs) and the main.jsx
// wiring. Injected stubs only: nothing forks, sends or names a real session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { parseSessionCommand, matchCommands, sessionCommands, commandUnavailable, commandArgumentHint } from '../src/session-command-model.mjs';
import { runSubtask, subtaskRefusal, SUBTASK_MESSAGES } from '../src/r3b-tasks-subtask.mjs';
import { subtaskTitle } from '../src/generated/r3b-tasks/subtask-title.mjs';
import { startsWithCommand, stripLeadingInvisible } from '../src/generated/r3b-tasks/command-prefix.mjs';
import { extractR3bTasks } from '../scripts/extract-r3b-tasks.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const official = name => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const u = text => text.replaceAll('’', '\\u2019'); // the minified chunks spell ’ as ’

test('tasks-05 official: the /subtask row, its gate, the send handler refusals and the background fork', () => {
  const commands = official('cc183b3ab-BlACljsv.js');
  for (const text of ['{name:"subtask",description:E.subtask,argumentHint:"<task>",neverReachesCli:!0,enableGate:"subtaskCommand",gate:e=>O(e)&&e.canForkSession&&e.subtaskCommand}',
    'subtask:{defaultMessage:"Fork this session to work on a task while you stay here",id:"5B10ybRftQ"}',
    'function O(e){return e.hostInterceptSurface&&e.isLocalSession}'])
    assert.equal(count(commands, text), 1, text);
  const session = official('cc43287c9-DAfOi8yP.js');
  for (const text of ['t.match(/^\\/subtask(?:\\s+(.*))?$/is)', 'defaultMessage:"Add a task after /subtask, then send it again.",id:"MbpoOYe8Db"',
    u('defaultMessage:"Subtasks aren’t available for this session.",id:"Enaro/mK/n"'),
    'defaultMessage:"A fork of this session is still starting. Send this again in a moment.",id:"2veOTDyV4r"',
    u('defaultMessage:"A subtask can’t start with a command, so nothing was sent. Describe the task in words.",id:"vYLcZuUvrF"'),
    u('defaultMessage:"A subtask takes text only, so nothing was sent. Remove what’s attached and any session mentions, or use /fork.",id:"fIPp4d6ViY"'),
    u('defaultMessage:"The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box.",id:"YlU3KKWvMl"'),
    'if(s&&c&&$j(c))', 'import{t as $j}from"./c8f38bf1f-D_EZalnr.js"', 'Ui=v_()'])
    assert.equal(count(session, text), 1, text);
  const fork = official('caec4a2d4-Cky7Rmpu.js');
  for (const text of ['defaultMessage:"Started the subtask in a new session.",id:"CAp88u+zH7"', 'if(!a.sendInBackground&&(t.current||r))',
    'import{g as Ot,l as kt}from"./cef1e6037-8DivyY4m.js"', 'taskSent:kt(n,l).then(', 'Mt(r,"subtask_send_error")'])
    assert.equal(count(fork, text), 1, text);
  // subtaskCommand = shared-11 Mu: appFeatures.sideSessions supported, which the main process answers from GrowthBook
  // 2371478310 (statically "unavailable" in its other branch); the slash menu badges the row "Ant only" for an
  // Anthropic account (shared-52 Lm).
  assert.equal(count(official('shared-11-BuQ3CK5I.js'), 'Ou=e=>e.appFeatures?.sideSessions?.status==="supported"'), 1);
  assert.equal(count(official('c5cd1b4dc-jDcYG_fG.js'), 'badge:Ut&&(e.name==="send-to-project"||e.name==="subtask")?W.formatMessage({defaultMessage:"Ant only",id:"7QT7WO8Wtz"}):void 0'), 1);
  const main = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  for (const text of ['bW((()=>_W("sideSessions",(()=>hy("2371478310")))))', 'sideSessions:{status:"unavailable"}', 'sideSessions:a,'])
    assert.equal(count(main, text), 1, text);
});

test('tasks-05 generated: Sn (the fork\'s provisional title) and c8f38bf1f i (starts with a command) are the 2.42304.0 originals', async () => {
  await extractR3bTasks({ check: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.deepEqual(manifest.modules.map(entry => [entry.target, entry.source]), [
    ['lazy-value.mjs', 'shared-0-ByI5P0CP.js'], ['invisible-character.mjs', 'shared-182-eT1kXtya.js'],
    ['command-prefix.mjs', 'c8f38bf1f-D_EZalnr.js'], ['subtask-title.mjs', 'cef1e6037-8DivyY4m.js']]);
  assert.equal(subtaskTitle('  Fix the flaky login test in the auth service  '), 'Fix the flaky login test in');
  assert.equal(subtaskTitle('Investigate\nwhy   it\tfails'), 'Investigate why it fails');
  const long = 'Supercalifragilisticexpialidocious-and-then-some-more-words-in-one-token here';
  assert.equal(subtaskTitle(long), `${Array.from(long.split(' ')[0] + ' here').slice(0, 59).join('')}…`);
  assert.equal(subtaskTitle('   '), undefined);
  for (const text of ['/review the diff', '!ls', '​/compact', '﻿ !rm']) assert.equal(startsWithCommand(text), true, JSON.stringify(text));
  for (const text of ['Fix /etc/hosts', 'a/b', '', 'Review it']) assert.equal(startsWithCommand(text), false, JSON.stringify(text));
  assert.equal(stripLeadingInvisible('​⁠  task'), 'task');
});

const ready = { current: 't', connected: true, hasHistory: true };
test('tasks-05 command row: /subtask <task> parses (multi-line too), lists after /fork and keeps the fork gates', () => {
  const ids = sessionCommands.map(command => command.id);
  assert.equal(ids.indexOf('subtask'), ids.indexOf('fork') + 1);
  const row = sessionCommands.find(command => command.id === 'subtask');
  assert.deepEqual({ argumentHint: row.argumentHint, description: row.description, session: row.session, idle: row.idle },
    { argumentHint: '<task>', description: 'Fork this session to work on a task while you stay here', session: true, idle: true });
  assert.deepEqual(parseSessionCommand('/subtask Fix the parser'), { id: 'subtask', args: 'Fix the parser', requested: 'subtask', command: row, suggestion: null, error: null });
  // cc43287c9 /is: the task may span lines; other commands still refuse extra lines.
  assert.equal(parseSessionCommand('/subtask Fix the parser\nthen add a test').args, 'Fix the parser\nthen add a test');
  assert.equal(parseSessionCommand('/subtask Fix the parser\nthen add a test').error, null);
  assert.match(parseSessionCommand('/fork a\nb').error, /only works on a single line/);
  assert.equal(parseSessionCommand('/subtask').args, '');
  assert.equal(commandArgumentHint('/subtask '), '<task>');
  const listed = matchCommands('sub', ready);
  assert.equal(listed[0].id, 'subtask');
  assert.equal(listed[0].argumentHint, '<task>');
  assert.equal(commandUnavailable(row, ready), '');
  assert.equal(commandUnavailable(row, { ...ready, hasHistory: false }), 'Send a message first');
  assert.equal(commandUnavailable(row, { ...ready, running: true }), 'Wait for the current task to finish or stop it');
  assert.equal(commandUnavailable(row, { ...ready, unsupportedMethods: ['thread/fork'] }), 'Not available with this core yet');
  assert.equal(commandUnavailable(row, { ...ready, subtaskCommand: false }), 'Subtasks aren’t available for this session.');
  assert.deepEqual(matchCommands('sub', { ...ready, subtaskCommand: false }).filter(command => command.id === 'subtask'), []);
  assert.equal(commandUnavailable(row, {}), 'Open a session first');
});

// Records the order in which runSubtask calls the host.
function host({ forkResult = { thread: { id: 'fork-1', cwd: '/work' } }, forkError = null, sendError = null } = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      clear: () => calls.push(['clear']),
      restore: () => calls.push(['restore']),
      fork: async (options) => { calls.push(['fork', options]); if (forkError) throw forkError; return forkResult; },
      send: async (thread, text) => { calls.push(['send', thread.id, text]); if (sendError) throw sendError; },
      requestTitle: (thread, name, text) => calls.push(['title', thread.id, name, text]),
      prefill: (thread, text) => calls.push(['prefill', thread.id, text]),
      notify: (message, options) => calls.push(['notify', message, options.variant]),
    },
  };
}

test('tasks-05 refusals: empty, a fork still starting, a command, attachments or mentions — a danger toast, nothing sent', async () => {
  assert.equal(subtaskRefusal({ task: '  ' }), 'empty');
  assert.equal(subtaskRefusal({ task: 'Fix it', forkStarting: true }), 'forkStarting');
  assert.equal(subtaskRefusal({ task: ' /review now' }), 'command');
  assert.equal(subtaskRefusal({ task: 'Fix it', attachments: [{ kind: 'image' }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix it', mentions: [{ session: { id: 's2' } }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix it', mentions: [{ path: 'src/a.js' }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix @mcp:github', mentions: [{ literal: true }] }), null);
  // The official order: empty before a starting fork, a starting fork before the command check.
  assert.equal(subtaskRefusal({ task: '', forkStarting: true }), 'empty');
  assert.equal(subtaskRefusal({ task: '/x', forkStarting: true, attachments: [{}] }), 'forkStarting');
  for (const [task, extra, reason] of [['', {}, 'empty'], ['/review', {}, 'command'], ['Fix it', { attachments: [{}] }, 'attachments']]) {
    const { calls, deps } = host();
    const result = await runSubtask({ task, ...extra, ...deps });
    assert.deepEqual(result, { status: 'refused', reason });
    assert.deepEqual(calls, [['notify', SUBTASK_MESSAGES[reason], 'danger']], 'the draft stays: no clear, no fork');
  }
});

test('tasks-05 sent: clear, fork (Sn title, no navigation), title request, background send, then "Started the subtask in a new session."', async () => {
  const { calls, deps } = host();
  const result = await runSubtask({ task: '  Add a regression test for the parser crash on empty input  ', attachments: [], mentions: [], ...deps });
  assert.equal(result.status, 'sent');
  assert.equal(result.thread.id, 'fork-1');
  const text = 'Add a regression test for the parser crash on empty input';
  assert.deepEqual(calls, [
    ['clear'],
    ['fork', { name: 'Add a regression test for the' }],
    ['title', 'fork-1', 'Add a regression test for the', text],
    ['send', 'fork-1', text],
    ['notify', 'Started the subtask in a new session.', 'neutral'],
  ]);
  // A fork that kept its default title says so; the subtask still goes out.
  const warned = host({ forkResult: { thread: { id: 'fork-2' }, warning: 'The fork was created, but its title could not be updated.' } });
  await runSubtask({ task: 'Fix it', ...warned.deps, requestTitle: null });
  assert.deepEqual(warned.calls.map(call => call[0] === 'notify' ? [call[1], call[2]] : call[0]), ['clear', 'fork',
    ['The fork was created, but its title could not be updated.', 'warning'], 'send', ['Started the subtask in a new session.', 'neutral']]);
});

test('tasks-05 hand-backs: a failed send waits in the fork\'s message box; a failed fork puts the command back here', async () => {
  const sendFailed = host({ sendError: new Error('Reconnect to DeepSeek first') });
  const result = await runSubtask({ task: 'Fix it', ...sendFailed.deps });
  assert.equal(result.status, 'send-failed');
  assert.deepEqual(sendFailed.calls.slice(-2), [['prefill', 'fork-1', 'Fix it'],
    ['notify', 'The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box.', 'danger']]);
  assert.equal(sendFailed.calls.some(call => call[1] === SUBTASK_MESSAGES.started), false);
  const forkFailed = host({ forkError: new Error('This session is still running. Wait or stop it first.') });
  assert.equal((await runSubtask({ task: 'Fix it', ...forkFailed.deps })).status, 'fork-failed');
  assert.deepEqual(forkFailed.calls, [['clear'], ['fork', { name: 'Fix it' }], ['restore'],
    ['notify', 'This session is still running. Wait or stop it first.', 'danger']]);
  const noThread = host({ forkResult: {} });
  await runSubtask({ task: 'Fix it', ...noThread.deps });
  assert.deepEqual(noThread.calls.slice(-2), [['restore'], ['notify', 'Couldn’t fork this session.', 'danger']]);
});

test('tasks-05 zh-CN: the official strings are translated in the R3b-tasks block', async (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  const { calls, deps } = host();
  await runSubtask({ task: 'Fix it', ...deps });
  assert.deepEqual(calls.at(-1), ['notify', '已在新会话中开始子任务。', 'neutral']);
  const refused = host();
  await runSubtask({ task: '/x', ...refused.deps });
  assert.deepEqual(refused.calls, [['notify', '子任务不能以命令开头，因此未发送任何内容。请用文字描述任务。', 'danger']]);
  const table = fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/session.mjs'), 'utf8');
  const block = table.slice(table.indexOf('// R3b-tasks:'), table.indexOf('// R3b-tasks end.'));
  for (const key of [...Object.values(SUBTASK_MESSAGES).filter(key => key !== SUBTASK_MESSAGES.forkFailed), 'Subtask',
    'Fork this session to work on a task while you stay here', 'Subtasks aren’t available for this session.'])
    assert.ok(block.includes(JSON.stringify(key)), key);
  assert.match(fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/app.mjs'), 'utf8'), /'Couldn’t fork this session\.': '无法分叉此会话。'/);
});

test('tasks-05 wiring: executeCommand runs /subtask through runSubtask on a fork that stays here', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'import { runSubtask } from "./r3b-tasks-subtask.mjs";'), 1);
  assert.equal(count(main, 'async function performOperation(operation, extra = {}, { stay = false } = {}) {'), 1);
  assert.equal(count(main, 'if (!stay && sequence === loadSeq.current && expected.connectionId === stopLive.current.connectionId && stopLive.current.connected) {'), 1);
  const branch = main.slice(main.indexOf('else if (id === "subtask") {'), main.indexOf('else if (id === "fork") {'));
  assert.ok(branch.length > 0 && branch.length < 2400, 'the subtask branch sits before the fork branch');
  for (const text of ['await runSubtask({task:args,attachments,mentions,forkStarting:actionLock.current.has(origin),notify:notice,clear:clearCommand,',
    'fork:({name})=>performOperation("fork",{name},{stay:true})',
    'send:async(thread,text)=>{await ensureResumed(thread.id);await rpc("turn/start",{threadId:thread.id,input:[{type:"text",text,text_elements:[]}],...options,cwd:thread.cwd||originCwd});}',
    'requestTitle:coreSupports(boot?.core,"titleRequest")?(thread,name,text)=>{void requestThreadTitle(thread.id,name,text,thread.cwd||originCwd);}:null',
    'prefill:(thread,text)=>putDraft(thread.id,text)', 'restore:()=>{if(sourceDraft!==undefined)putDraft(origin,sourceDraft);}'])
    assert.ok(branch.includes(text), text);
  assert.doesNotMatch(branch, /navigate\(/, 'the subtask never opens the fork');
  // The host fork names the fork with payload.name (session-operations thread/name/set).
  const operations = fs.readFileSync(path.join(app, 'electron/session-operations.cjs'), 'utf8');
  assert.match(operations, /const name = typeof payload\.name === 'string' && payload\.name\.trim\(\) \? payload\.name\.trim\(\)\.slice\(0, 120\)/);
});

test('D29: main.jsx keeps /subtask behind the official gate (closed for a non-Anthropic account)', () => {
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.equal(main.split('    subtaskCommand: false };').length - 1, 1);
});
