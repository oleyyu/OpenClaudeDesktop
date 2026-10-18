import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
// Claude Code's own tools that OpenClaude Desktop's agent-tools server serves to a core without them (agent-tools/ask.mjs,
// notify.mjs, files.mjs, findings.mjs, session.mjs, terminal.mjs open_terminal_tab), the per-core rule that leaves out
// a tool the core has natively (nativeTools, agent-tools-host.cjs isToolListed), and Codex's Default-mode questions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import * as ask from '../electron/agent-tools/ask.mjs';
import * as notify from '../electron/agent-tools/notify.mjs';
import * as files from '../electron/agent-tools/files.mjs';
import * as findings from '../electron/agent-tools/findings.mjs';
import * as session from '../electron/agent-tools/session.mjs';
import * as terminal from '../electron/agent-tools/terminal.mjs';
import { suggestedTasks } from '../src/agent-tool-titles.mjs';
import { coreCapabilities, allCores } from '../electron/core-registry.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { defaultModeQuestions } = require('../electron/codex-default-questions.cjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;
const TOOLS_DIR = new URL('../electron/agent-tools', import.meta.url).pathname;
const tool = (module, name) => module.tools.find((entry) => entry.name === name);
const textOf = (result) => (typeof result === 'string' ? result : result.content.map((part) => part.text).join('\n'));
const made = [];
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-claude-tools-'))); made.push(dir); return dir; };
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });

const QUESTIONS = { questions: [
  { question: 'Which database should I target?', header: 'Database', options: [{ label: 'Postgres (Recommended)', description: 'The production one' }, { label: 'SQLite', description: 'Local only' }] },
  { question: 'Which checks?', header: 'Checks', multiSelect: true, options: [{ label: 'Lint', description: '' }, { label: 'Tests', description: '' }, { label: 'Types', description: '' }] },
] };

test('AskUserQuestion validates Claude’s schema and maps it to the question card’s requestUserInput questions', () => {
  const questions = ask.requestQuestions(QUESTIONS);
  assert.deepEqual(questions.map((q) => [q.id, q.header, q.isOther, q.isSecret, q.options.length, q.multiSelect === true]), [['q1', 'Database', true, false, 2, false], ['q2', 'Checks', true, false, 3, true]]);
  assert.throws(() => ask.requestQuestions({ questions: [] }), /1 to 4/);
  assert.throws(() => ask.requestQuestions({ questions: Array.from({ length: 5 }, (_, i) => ({ question: `Q${i}?`, header: 'h', options: [{ label: 'a' }, { label: 'b' }] })) }), /at most 4/);
  assert.throws(() => ask.requestQuestions({ questions: [{ question: 'One?', header: 'h', options: [{ label: 'only' }] }] }), /2 to 4 options/);
  assert.throws(() => ask.requestQuestions({ questions: [{ question: 'Dup?', header: 'h', options: [{ label: 'a' }, { label: 'a' }] }] }), /two options/);
  assert.equal(ask.requestQuestions({ questions: [{ question: 'Long header?', header: 'A very long header text', options: [{ label: 'a' }, { label: 'b' }] }] })[0].header.length, 12);
});

test('AskUserQuestion waits for the card and tells the model the answers; a stopped or impossible card is an error', async () => {
  const handler = tool(ask, 'AskUserQuestion').handler;
  const asked = [];
  const ctx = (answer) => ({ sessionId: 's', questions: { ask: async (questions) => { asked.push(questions); return answer; } } });
  const answered = textOf(await handler(QUESTIONS, ctx({ answers: { q1: { answers: ['SQLite'] }, q2: { answers: ['Lint', 'Types'] } } })));
  assert.equal(answered, 'User has answered your questions: "Which database should I target?"="SQLite", "Which checks?"="Lint, Types". You can now continue with the user’s answers in mind.');
  assert.equal(asked[0].length, 2);
  assert.match(textOf(await handler(QUESTIONS, ctx({ answers: { q1: { answers: ['Something else entirely'] } } }))), /"Which database should I target\?"="Something else entirely"\. One question was skipped\./);
  assert.match(textOf(await handler(QUESTIONS, ctx({ answers: {} }))), /^The user skipped the questions/);
  assert.match(textOf(await handler(QUESTIONS, ctx({ answers: { q1: { answers: [ask.DISMISSED] }, q2: { answers: [ask.DISMISSED] } } }))), /sent a message instead/);
  await assert.rejects(handler(QUESTIONS, ctx(null)), /dismissed the questions/);
  await assert.rejects(handler(QUESTIONS, ctx(undefined)), /plain text/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(handler(QUESTIONS, { ...ctx({ answers: {} }), signal: controller.signal }), /stopped/);
  await assert.rejects(handler(QUESTIONS, { sessionId: 's' }), /can’t be shown/);
});

test('PushNotification follows the settings outcome and sends at most one every 10 seconds per session', async () => {
  notify.resetNotifyLimits();
  const handler = tool(notify, 'PushNotification').handler;
  const sent = [];
  const ctx = (sessionId, outcome = 'sent') => ({ sessionId, notifications: { send: (note) => { sent.push({ sessionId, ...note }); return outcome; } } });
  assert.equal(await handler({ message: 'Build finished', title: 'Done' }, ctx('a')), 'Notification sent.');
  assert.deepEqual(sent[0], { sessionId: 'a', title: 'Done', message: 'Build finished' });
  await assert.rejects(handler({ message: 'Again' }, ctx('a')), /wait \d+ s/);
  assert.equal(await handler({ message: 'Other session' }, ctx('b')), 'Notification sent.');
  assert.match(await handler({ message: 'x' }, ctx('c', 'focused')), /^Notification not sent: the user is looking/);
  assert.match(await handler({ message: 'x' }, ctx('c', 'off')), /turned these notifications off/);
  assert.equal(await handler({ message: 'Now allowed' }, ctx('c')), 'Notification sent.', 'a notification not sent does not count against the limit');
  await assert.rejects(handler({ message: 'x'.repeat(201) }, ctx('d')), /longer than 200/);
  await assert.rejects(handler({ message: '  ' }, ctx('d')), /required/);
  await assert.rejects(handler({ message: 'x' }, { sessionId: 'e' }), /aren’t available/);
});

test('SendUserFile sends files inside the session folder only, as deliverables', async () => {
  const root = tmp(), outside = tmp();
  fs.mkdirSync(path.join(root, 'out'));
  fs.writeFileSync(path.join(root, 'out/report.md'), '# Report');
  fs.writeFileSync(path.join(root, 'shot.png'), 'png');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'no');
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'link.txt'));
  const handler = tool(files, 'SendUserFile').handler;
  const result = await handler({ files: ['out/report.md', path.join(root, 'shot.png'), './out/report.md'], caption: 'The review' }, { cwd: root });
  assert.equal(result.content[0].text, 'Sent 2 files to the user: report.md, shot.png.');
  assert.deepEqual(result.structuredContent, { deliverables: [{ path: path.join(root, 'out/report.md'), description: 'The review' }, { path: path.join(root, 'shot.png'), description: 'The review' }] });
  await assert.rejects(handler({ files: [path.join(outside, 'secret.txt')] }, { cwd: root }), /outside the session’s working folder/);
  await assert.rejects(handler({ files: ['link.txt'] }, { cwd: root }), /outside/, 'a link leading out of the folder is refused');
  await assert.rejects(handler({ files: ['out'] }, { cwd: root }), /not a file/);
  await assert.rejects(handler({ files: ['missing.txt'] }, { cwd: root }), /doesn’t exist/);
  await assert.rejects(handler({ files: [] }, { cwd: root }), /at least one/);
  await assert.rejects(handler({ files: Array(21).fill('shot.png') }, { cwd: root }), /at most 20/);
});

test('ReportFindings checks the typed findings and records them without side effects', async () => {
  const handler = tool(findings, 'ReportFindings').handler;
  const list = [{ file: 'src/a.js', line: 12, summary: 'Off by one', failure_scenario: 'n = 0 reads past the end', category: 'correctness', verdict: 'CONFIRMED' }];
  assert.match(await handler({ findings: list, level: 'high' }), /^Reported 1 finding\./);
  assert.match(await handler({ findings: [{ ...list[0], outcome: 'fixed' }] }), /1 with an outcome/);
  assert.match(await handler({ findings: [] }), /^No findings reported/);
  await assert.rejects(handler({ findings: [{ file: 'a', summary: 's' }] }), /failure_scenario/);
  await assert.rejects(handler({ findings: [{ ...list[0], verdict: 'MAYBE' }] }), /verdict/);
  await assert.rejects(handler({ findings: [{ ...list[0], outcome: 'done' }] }), /outcome/);
  await assert.rejects(handler({ findings: list, level: 'huge' }), /level/);
  await assert.rejects(handler({}), /must be a list/);
  assert.deepEqual(findings.normalizeFindings({ findings: [{ ...list[0], line: 0 }] })[0].line, undefined);
});

test('mark_chapter, spawn_task and dismiss_task only describe the transcript; a suggestion gets a task id', async () => {
  session.resetSuggestions();
  const mark = tool(session, 'mark_chapter').handler, spawnTask = tool(session, 'spawn_task').handler, dismiss = tool(session, 'dismiss_task').handler;
  assert.equal(await mark({ title: 'Test verification' }), 'Chapter “Test verification” marked.');
  await assert.rejects(mark({ title: 'x'.repeat(41) }), /under 40/);
  await assert.rejects(mark({}), /required/);
  const ctx = { sessionId: 's1', cwd: '/tmp' };
  const text = await spawnTask({ title: 'Remove dead option', tldr: 'Noticed it while fixing the menu.', prompt: 'Remove the unused option in src/x.js.' }, ctx);
  const id = /^Noted \(position 1, task_id: (task_[0-9a-f]{8})\)\. /.exec(text)?.[1];
  assert.ok(id, text);
  // R4f-proposal: the 2.42304.0 result (asar index.chunk-B5tintml.js), the pending list quoting each title (Fx).
  assert.equal(text, `Noted (position 1, task_id: ${id}). A chip is showing for the user — they can start it in a fresh worktree with one click, or dismiss it. If this suggestion becomes stale or superseded, call dismiss_task with this task_id. Currently pending: ${id} "Remove dead option". Continue your current work.`);
  await assert.rejects(spawnTask({ title: 'T', tldr: 't', prompt: 'p', cwd: 'relative/dir' }, ctx), /absolute/);
  await assert.rejects(spawnTask({ title: 'T', tldr: 't', prompt: 'p', cwd: '/definitely/not/here' }, ctx), /doesn’t exist/);
  await assert.rejects(spawnTask({ title: 'x'.repeat(61), tldr: 't', prompt: 'p' }, ctx), /under 60/);
  const ids = [id];
  for (let i = 1; i < session.MAX_SUGGESTIONS; i++) ids.push(/task_id: (task_[0-9a-f]{8})/.exec(await spawnTask({ title: `T${i}`, tldr: 't', prompt: 'p' }, ctx))[1]);
  // Db: the 21st pending suggestion makes the oldest leave the queue (it used to be refused).
  const full = await spawnTask({ title: 'One more', tldr: 't', prompt: 'p' }, ctx);
  const newest = /task_id: (task_[0-9a-f]{8})/.exec(full)[1];
  assert.match(full, new RegExp(`^Noted \\(position 20, task_id: ${newest}\\)\\. `));
  assert.ok(full.includes(`The queue holds at most 20 pending suggestions, so the oldest one left the queue to make room and is no longer shown as a chip: ${id} "Remove dead option". Currently pending: ${ids[1]} "T1", `), full);
  assert.ok(full.endsWith(`, ${ids[19]} "T19", ${newest} "One more". Continue your current work.`), full);
  // A task the user acted on (electron/task-proposals.cjs) leaves the pending list: no eviction for the next one.
  assert.equal(session.settleSuggestion('s1', ids[1]), true);
  assert.equal(session.settleSuggestion('s1', ids[1]), false);
  const after = await spawnTask({ title: 'Room again', tldr: 't', prompt: 'p' }, ctx);
  assert.match(after, /^Noted \(position 20, task_id: task_[0-9a-f]{8}\)\. /);
  assert.doesNotMatch(after, /left the queue/);
  assert.ok(!after.includes(ids[1]));
  assert.equal(await dismiss({ task_id: ids[2] }, ctx), `Suggested task ${ids[2]} withdrawn.`);
  assert.match(await spawnTask({ title: 'Room once more', tldr: 't', prompt: 'p' }, ctx), /^Noted \(position 20, task_id: task_[0-9a-f]{8}\)\. (?!.*left the queue)/);
  await assert.rejects(dismiss({ task_id: 'nope' }, ctx), /task_id must be/);
});

test('R4f-proposal: spawn_task\'s description, parameters and result are 2.42304.0\'s, and a title cannot fake a task_id', async () => {
  const chunk = fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-B5tintml.js', import.meta.url), 'utf8');
  const count = (needle) => chunk.split(needle).length - 1;
  // The chunk escapes the dash and the line breaks.
  const escaped = (value) => value.replaceAll('\n', '\\n').replaceAll('—', '\\' + 'u2014');
  const spawn = tool(session, 'spawn_task');
  assert.equal(count('Ex=`' + escaped(spawn.description) + '`,Dx=`'), 1, 'Ex');
  // Nx, property by property (the title's description is single-quoted there: it quotes examples).
  const { title, prompt, tldr, cwd } = spawn.inputSchema.properties;
  assert.equal(count(`Nx={type:"object",properties:{title:{type:"string",description:'${escaped(title.description)}'},prompt:{type:"string",description:"${escaped(prompt.description)}"},tldr:{type:"string",description:"${escaped(tldr.description)}"},cwd:{type:"string",description:"${escaped(cwd.description)}"}},required:["title","prompt","tldr"]};`), 1, 'Nx');
  for (const source of [
    'return w.n(`Noted (position ${g.position}, task_id: ${h}). A chip is showing for the user ' + '\\' + 'u2014 they can start it in a fresh worktree with one click, or dismiss it. If this suggestion becomes stale or superseded, call dismiss_task with this task_id. `+_+`Currently pending: ${Fx(g.pending)}. Continue your current work.`)',
    'let _=g.evicted.length>0?`The queue holds at most 20 pending suggestions, so the oldest ${g.evicted.length===1?"one":g.evicted.length} left the queue to make room and ${g.evicted.length===1?"is":"are"} no longer shown as ${g.evicted.length===1?"a chip":"chips"}: ${Fx(g.evicted)}. `:""',
    'function Fx(e){return e.map((e=>`${e.id}${e.title?` "${yb(e.title)}"`:""}`)).join(", ")}',
    'function Db(e,t,n){let r=[...e??[],t],i=[],a=r.length-20;for(let e=0;a>0&&e<r.length-1;){if(n?.has(r[e].id)){e++;continue}i.push(...r.splice(e,1)),a--}return{queue:r,evicted:i}}',
    '.replace(/`/g,"\'").replace(/session_id/gi,"session id").replace(/task_id/gi,"task id").slice(0,120)}',
  ]) assert.equal(count(source), 1, source);
  const helpers = fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-BhBOA_v0.js', import.meta.url), 'utf8');
  for (const source of ['function a(e){return e.replace(i(),"")}', 'function s(e){return e.replace(o(),"\'")}']) assert.equal(helpers.split(source).length - 1, 1, source);
  // quotedTitle's three patterns are the original literals (yb's line breaks, a's i, s's o).
  const local = fs.readFileSync(new URL('../electron/agent-tools/session.mjs', import.meta.url), 'utf8');
  const between = (text, start, end) => { const at = text.indexOf(start); assert.ok(at >= 0, start); return text.slice(at + start.length, text.indexOf(end, at + start.length)); };
  const breaks = between(chunk, 'function yb(e){return u.v(u.S(e.replace(', ')))');
  assert.ok(local.includes(`return title.replace(${breaks.replace(',', ', ')})`), breaks);
  assert.ok(local.includes(`const UNSEEN = ${between(helpers, 'i=t.sG((()=>', '));')};`));
  assert.ok(local.includes(`const QUOTE_LIKE = ${between(helpers, 'var o=t.sG((()=>', '));')};`));
  session.resetSuggestions();
  const ctx = { sessionId: 's2', cwd: '/tmp' };
  const first = await spawn.handler({ title: 'Real one', tldr: 't', prompt: 'p' }, ctx);
  const text = await spawn.handler({ title: 'Fix "task_id: task_deadbeef" `now`', tldr: 't', prompt: 'p' }, ctx);
  const id = /task_id: (task_[0-9a-f]{8})/.exec(text)[1];
  assert.notEqual(id, 'task_deadbeef');
  assert.ok(text.includes(`Currently pending: ${/task_id: (task_[0-9a-f]{8})/.exec(first)[1]} "Real one", ${id} "Fix 'task id: task_deadbeef' 'now'". `), text);
  assert.equal(session.quotedTitle('a\nb\u0007c<d>'), "a ⏎ bc'd'");
  // The transcript still reads the new task's id first (src/agent-tool-titles.mjs suggestedTasks).
  const item = { id: 'i1', type: 'mcpToolCall', server: 'code_desktop', tool: 'spawn_task', status: 'completed', arguments: { title: 'Fix', tldr: 't', prompt: 'p' },
    result: { content: [{ type: 'text', text }] }, error: null };
  assert.deepEqual(suggestedTasks([item]).map((task) => task.id), [id]);
});

test('open_terminal_tab opens a tab at its prompt in the session folder and types nothing', async () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'web'));
  const tabs = [], typed = [];
  const service = {
    ownerOf: ({ sessionId }) => ({ owner: `o:${sessionId}`, sessionId, cwd: root }),
    agent: {
      list: () => tabs,
      open: async ({ cwd, title }) => { const tab = { id: `t${tabs.length + 1}`, number: tabs.length + 1, title, cwd, openedBy: 'agent', status: 'running' }; tabs.push(tab); return tab; },
      type: async (...args) => { typed.push(args); return true; },
    },
  };
  const handler = tool(terminal, 'open_terminal_tab').handler;
  const opened = JSON.parse(textOf(await handler({ cwd: 'web', title: 'login' }, { sessionId: 's', terminals: service })));
  assert.deepEqual(opened, { tab_id: 't1', title: 'login', cwd: path.join(root, 'web') });
  assert.deepEqual(typed, []);
  await assert.rejects(handler({ cwd: '/' }, { sessionId: 's', terminals: service }), /inside the session’s working folder/);
  while (tabs.length < terminal.MAX_AGENT_TABS) await handler({}, { sessionId: 's', terminals: service });
  await assert.rejects(handler({}, { sessionId: 's', terminals: service }), /already have 6/);
});

test('each core lists the Claude tools it has itself; the host serves a stand-in only to a core without one', async (t) => {
  const natives = Object.fromEntries(allCores().map((core) => [core.id, coreCapabilities({ engine: core.engine }).nativeTools]));
  for (const [id, list] of Object.entries(natives)) assert.ok(Array.isArray(list), `${id} declares nativeTools`);
  assert.ok(!natives.gemini.includes('AskUserQuestion'), 'Gemini has no question tool under ACP');
  assert.ok(natives.deepseek.includes('SendUserFile') && natives.qwen.includes('ReportFindings') && natives.codex.includes('AskUserQuestion'));

  const sessions = { 'thread-a': tmp() };
  const listedFor = (core) => (entry) => !entry.native || !natives[core].includes(entry.native);
  let core = 'gemini';
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: tmp(), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    isToolListed: (entry) => listedFor(core)(entry) });
  host.provide('notifications', () => ({ send: () => 'focused' }));
  await host.start();
  t.after(() => host.stop());
  const names = () => host.listTools().map((entry) => entry.name);
  for (const name of ['AskUserQuestion', 'PushNotification', 'SendUserFile', 'ReportFindings', 'mark_chapter', 'spawn_task', 'dismiss_task', 'open_terminal_tab']) assert.ok(names().includes(name), `${name} is served to Gemini`);
  core = 'deepseek';
  assert.ok(!names().includes('SendUserFile') && !names().includes('AskUserQuestion') && names().includes('PushNotification'), 'DeepSeek keeps its own present and question tools');
  await assert.rejects(host.call('thread-a', { name: 'SendUserFile', arguments: { files: ['x'] } }), /use its own SendUserFile tool/);
  core = 'qwen';
  assert.ok(!names().includes('ReportFindings'));

  // Over the stdio MCP server, as a core sees it.
  core = 'gemini';
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' }, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  const listed = (await request('tools/list', {})).result.tools;
  const ask = listed.find((entry) => entry.name === 'AskUserQuestion');
  assert.equal(ask.inputSchema.properties.questions.maxItems, 4);
  const chapter = await request('tools/call', { name: 'mark_chapter', arguments: { title: 'Implementation' } });
  assert.deepEqual(chapter.result, { content: [{ type: 'text', text: 'Chapter “Implementation” marked.' }] });
  const note = await request('tools/call', { name: 'PushNotification', arguments: { message: 'Done' } });
  assert.match(note.result.content[0].text, /^Notification not sent/);
  fs.writeFileSync(path.join(sessions['thread-a'], 'out.txt'), 'x');
  const sent = await request('tools/call', { name: 'SendUserFile', arguments: { files: ['out.txt'] } });
  assert.equal(sent.result.structuredContent.deliverables[0].path, path.join(sessions['thread-a'], 'out.txt'));
});

test('Codex gets its request_user_input in Default mode through the flag, quietly, unless the user set it', () => {
  const stages = new Map([['default_mode_request_user_input', { stage: 'underDevelopment', enabled: false }], ['goals', { stage: 'beta', enabled: true }]]);
  const started = defaultModeQuestions('thread/start', { cwd: '/w', config: { a: 1 } }, { native: true, stages });
  assert.deepEqual(started.config, { a: 1, 'features.default_mode_request_user_input': true, suppress_unstable_features_warning: true });
  assert.ok(defaultModeQuestions('thread/resume', { threadId: 't' }, { native: true, stages }).config['features.default_mode_request_user_input']);
  assert.equal(defaultModeQuestions('turn/start', { threadId: 't' }, { native: true, stages }).config, undefined);
  assert.equal(defaultModeQuestions('thread/start', {}, { native: false, stages }).config, undefined, 'only a native Codex');
  assert.equal(defaultModeQuestions('thread/start', {}, { native: true, stages: new Map() }).config, undefined, 'a Codex without the flag');
  assert.equal(defaultModeQuestions('thread/start', {}, { native: true, stages: new Map([['default_mode_request_user_input', { stage: 'underDevelopment', enabled: true }]]) }).config, undefined, 'already on');
  const loud = defaultModeQuestions('thread/start', {}, { native: true, stages: new Map([...stages, ['other_thing', { stage: 'underDevelopment', enabled: true }]]) });
  assert.deepEqual(loud.config, { 'features.default_mode_request_user_input': true }, 'the user’s own unstable flag keeps its warning');
  assert.deepEqual(defaultModeQuestions('thread/start', { config: { 'features.default_mode_request_user_input': false } }, { native: true, stages }).config, { 'features.default_mode_request_user_input': false });
});
