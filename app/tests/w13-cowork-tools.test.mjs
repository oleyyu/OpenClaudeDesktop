// w13-coworkfn-tools (research/w13-coworkfn.md O-26~O-28/O-30/O-42/O-43, cwf-23~27): Cowork's built-in tools on the
// connected core (electron/agent-tools/cowork.mjs) and its outputs (electron/cowork-runtime/outputs.mjs). The official
// copy is checked against the 3.6556.2 snapshot's raw chunks (read as text, never run).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as cowork from '../electron/agent-tools/cowork.mjs';
import { createCoworkStorage } from '../electron/cowork-runtime/core-cowork.mjs';
import { MESSAGES } from '../electron/cowork-runtime/folder-policy.mjs';
import { createTurnDeliverables, outputsDir, presentable, presentRefusal, snapshot, uploadsDir } from '../electron/cowork-runtime/outputs.mjs';
import { recordArtifactItem } from '../electron/artifact-index.mjs';
import { itemDeliverables } from '../src/deliverable-records.mjs';
import zh from '../electron/i18n/zh-CN/surfaces.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const APP = new URL('..', import.meta.url).pathname;
const SNAPSHOT = path.join(APP, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const H5I = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-h5ilKUwe.js'), 'utf8');
const DL8 = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-Dl8NPgw7.js'), 'utf8');
const JPK = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
const CARDS_CHUNK = fs.readFileSync(path.join(SNAPSHOT, 'ion-dist/assets/v1/ca44d5dae-lEflPFFi.js'), 'utf8');
const MAIN = fs.readFileSync(path.join(APP, 'electron/main.cjs'), 'utf8');
// The minified chunks keep non-ASCII characters as \uXXXX escapes.
const raw = (text) => text.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const tool = (name) => cowork.tools.find((entry) => entry.name === name);
const tmp = (prefix) => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

async function session({ folders = [] } = {}) {
  const userData = tmp('w13-cowork-tools-');
  const storage = await createCoworkStorage(userData);
  const config = { threadIds: ['thread-cw'], sessionMetadata: { 'thread-cw': { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders } } }, threadMetadata: { 'thread-cw': { cwd: storage.hostCwd } } };
  const calls = { approvals: [], pickers: [], presented: [], approved: [], rpc: [] };
  let answer = true, picked = null, trusted = false;
  const service = {
    userData, t: (text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match),
    meta: () => config.sessionMetadata['thread-cw'],
    update: (change) => { config.sessionMetadata['thread-cw'] = change(config.sessionMetadata['thread-cw']); },
    approveRoot: (dir) => calls.approved.push(dir), trusted: async () => trusted,
    pickFolder: async (options) => { calls.pickers.push(options); return picked; },
    presented: (paths) => calls.presented.push(...paths),
    rpc: async (method, params) => { calls.rpc.push({ method, params }); return method === 'thread/start' ? { thread: { id: 'thread-code' } } : { turn: { id: 'turn-1' } }; },
    codeDefaults: () => ({ model: 'm1', effort: 'high', permission: 'auto', hints: false, customization: false, networkAccess: false }),
  };
  const ctx = { sessionId: 'thread-cw', cwd: storage.hostCwd, cowork: service, requestApproval: async (request) => { calls.approvals.push(request); return answer; } };
  return { userData, storage, config, calls, ctx, set: ({ approve = answer, pick = picked, trust = trusted } = {}) => { answer = approve; picked = pick; trusted = trust; } };
}

test('the four tools: names, descriptions and parameter text are the official h5i ones, the cards the official renderer copy', () => {
  assert.equal(cowork.group, 'cowork');
  assert.deepEqual(cowork.surfaces, ['cowork']);
  assert.deepEqual(cowork.tools.map((entry) => entry.name), ['request_cowork_directory', 'allow_cowork_file_delete', 'present_files', 'launch_code_session']);
  // jPKPzV-P: the official names.
  for (const name of ['request_cowork_directory', 'allow_cowork_file_delete', 'present_files', 'launch_code_session']) assert.ok(JPK.includes(`="${name}"`), name);
  for (const name of ['request_cowork_directory', 'allow_cowork_file_delete', 'launch_code_session']) {
    assert.equal(tool(name).description, cowork.DESCRIPTIONS[name]);
    assert.ok(H5I.includes(`"${raw(cowork.DESCRIPTIONS[name])}"`), `${name} description`);
  }
  // present_files: the base sentence plus its host-loop branch (`" + (n.isHostLoopMode ? "Only files …" : …)`).
  const [base, hostLoop] = cowork.DESCRIPTIONS.present_files.split(/(?=Only files under your outputs folder)/);
  assert.ok(H5I.includes(`"${raw(base)}" +`) || H5I.includes(`"${raw(base)}"+`), 'present_files description');
  assert.ok(H5I.includes(`"${raw(hostLoop)}"`), 'present_files host-loop sentence');
  assert.equal(tool('present_files').description, cowork.DESCRIPTIONS.present_files);
  // Parameter descriptions kept word for word (allow_cowork_file_delete's "VM path" is the one the host path replaces).
  for (const text of [tool('request_cowork_directory').inputSchema.properties.path.description, tool('present_files').inputSchema.properties.files.items.properties.file_path.description,
    tool('present_files').inputSchema.properties.files.description, tool('launch_code_session').inputSchema.properties.spec.description, tool('launch_code_session').inputSchema.properties.suggested_cwd.description])
    assert.ok(H5I.includes(`"${raw(text)}"`), text);
  assert.ok(H5I.includes('"The VM path of the file you\'re trying to delete"'));
  for (const text of Object.values(cowork.TEXT)) assert.ok(H5I.includes(`"${raw(text)}"`), text);
  // The cards (ion-dist ca44d5dae): the official id beside each default message; the launch title without its <bold>.
  for (const [key, id] of [['folderTitle', 'C7fneNDWNj'], ['deleteTitle', 'hkclihVpsD'], ['deleteReason', 'jVcy5dDESy'], ['deleteWarning', 'yxsRbEUkNf']])
    assert.ok(CARDS_CHUNK.includes(`defaultMessage:"${raw(cowork.CARDS[key])}",id:"${id}"`), key);
  assert.ok(CARDS_CHUNK.includes('defaultMessage:"Claude wants to send this to <bold>Claude Code</bold>",id:"e/Ma2VO6zk"'));
  assert.equal(cowork.CARDS.launchTitle, 'Claude wants to send this to Claude Code');
  assert.ok(CARDS_CHUNK.includes('defaultMessage:"Choose folder"'));
  // Dl8's rejection sentence and h5i's outputs / dismissed launch sentences.
  assert.ok(DL8.includes('. Please acknowledge this and suggest alternative approaches.`'));
  // The always-ask sentence these two tools follow (V7t): their cards are the `other` kind, which Bypass never skips.
  assert.ok(JPK.includes('"This tool requires explicit approval regardless of permission mode."'));
  assert.doesNotMatch(MAIN.match(/const BYPASS_KINDS = new Set\(\[([^\]]*)\]\)/)[1], /"other"/);
  // A core with its own file cards (nativeTools SendUserFile) keeps them.
  assert.equal(tool('present_files').native, 'SendUserFile');
});

test('surfaces: only a Cowork session is offered or can call the cowork tools; the host hands them ctx.cowork', async () => {
  const s = await session();
  const surfaceOf = { 'thread-cw': 'cowork', 'thread-code': 'code', 'thread-chat': 'chat' };
  const host = createAgentToolsHost({ modules: [cowork], tmpRoot: tmp('w13-cowork-host-'), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(surfaceOf, key ?? '') ? { id: key, cwd: s.storage.hostCwd } : null; },
    requestApproval: async () => true });
  host.provide('sessionSurface', ({ id }) => surfaceOf[id] ?? 'code');
  host.provide('cowork', () => s.ctx.cowork);
  await host.ready();
  const listed = (id) => host.sessionToolLists(id).tools.map((entry) => entry.name);
  assert.deepEqual(listed('thread-cw').filter((name) => name !== 'load_tools'), ['request_cowork_directory', 'allow_cowork_file_delete', 'present_files', 'launch_code_session']);
  assert.deepEqual(listed('thread-code').filter((name) => name !== 'load_tools'), []);
  assert.deepEqual(listed('thread-chat').filter((name) => name !== 'load_tools'), []);
  await assert.rejects(host.call('thread-code', { name: 'present_files', arguments: { files: [{ file_path: 'a.txt' }] } }), /isn’t available in this session/);
  fs.writeFileSync(path.join(s.storage.outputs, 'a.txt'), 'a');
  const result = await host.call('thread-cw', { name: 'present_files', arguments: { files: [{ file_path: 'a.txt' }] } });
  assert.equal(result.isError, undefined);
  assert.deepEqual(result.structuredContent.deliverables, [{ path: path.join(s.storage.outputs, 'a.txt'), title: 'a.txt' }]);
  assert.deepEqual(s.calls.presented, [path.join(s.storage.outputs, 'a.txt')]);
});

test('present_files: outputs (relative), uploads and connected folders only; every refusal listed, nothing presented', async () => {
  const folder = tmp('w13-cowork-folder-');
  const s = await session({ folders: [folder] });
  const meta = s.config.sessionMetadata['thread-cw'];
  assert.equal(outputsDir(meta, s.userData), s.storage.outputs);
  assert.equal(uploadsDir(meta, s.userData), path.join(s.storage.root, 'uploads'));
  assert.equal(outputsDir({ surface: 'code' }, s.userData), null);
  fs.writeFileSync(path.join(s.storage.outputs, 'report.md'), '#');
  fs.mkdirSync(path.join(s.storage.outputs, 'dir'));
  fs.writeFileSync(path.join(folder, 'data.csv'), 'a,b');
  const outsider = tmp('w13-cowork-outside-');
  fs.writeFileSync(path.join(outsider, 'secret.txt'), 'x');
  assert.deepEqual(await presentable('report.md', meta, { userData: s.userData }), { ok: true, path: path.join(s.storage.outputs, 'report.md') });
  assert.equal((await presentable(path.join(folder, 'data.csv'), meta, { userData: s.userData })).ok, true);
  assert.equal((await presentable('nothing.md', meta, { userData: s.userData })).kind, 'missing');
  assert.equal((await presentable('dir', meta, { userData: s.userData })).kind, 'not_file');
  assert.equal((await presentable(path.join(outsider, 'secret.txt'), meta, { userData: s.userData })).kind, 'outside');
  assert.equal((await presentable('/etc/hosts', meta, { userData: s.userData })).kind, 'outside');
  // A link out of the outputs folder is never presented; as in h5i (S() refuses it, m(e,r) finds the path as given within
  // the folders) it is listed as "Not found" (w13-close-main-process, closeout coworkfn-tools-04).
  fs.symlinkSync(path.join(outsider, 'secret.txt'), path.join(s.storage.outputs, 'link.txt'));
  assert.equal((await presentable('link.txt', meta, { userData: s.userData })).kind, 'missing');
  assert.ok(H5I.includes('let n=_(e);n===null?m(e,r)?y.push(t):x.push(t):y.push(`${t} \\u2014 ${n}`)'), 'h5i: a refused path within the folders is Not found');

  const present = tool('present_files').handler;
  const refused = await present({ files: [{ file_path: 'report.md' }, { file_path: 'nothing.md' }, { file_path: 'dir' }, { file_path: path.join(outsider, 'secret.txt') }] }, s.ctx);
  assert.equal(refused.isError, true);
  assert.equal(refused.content[0].text, [
    'Cannot present 3 file(s), so nothing was presented.',
    "Not found on the user's computer:", '  - nothing.md',
    'Not a regular file (a directory or special file) — present individual files instead:', '  - dir',
    "Not accessible on the user's computer:", `  - ${path.join(outsider, 'secret.txt')}`, `Files must be under ${s.storage.outputs}, the session uploads folder, or a connected folder.`,
    'These were fine — include them again when you re-present:', '  - report.md',
  ].join('\n'));
  // h5i's host-loop refusal lines, word for word.
  for (const line of ['Cannot present ${T} file(s), so nothing was presented.', "Not found on the user's computer:", 'Not a regular file (a directory or special file) \\u2014 present individual files instead:',
    "Not accessible on the user's computer:", 'the session uploads folder, or a connected folder.', 'These were fine \\u2014 include them again when you re-present:'])
    assert.ok(H5I.includes(line), line);
  assert.deepEqual(s.calls.presented, []);
  const shown = await present({ files: [{ file_path: 'report.md' }, { file_path: path.join(folder, 'data.csv') }] }, s.ctx);
  assert.equal(shown.isError, undefined);
  assert.deepEqual(shown.content.map((part) => part.text), [path.join(s.storage.outputs, 'report.md'), path.join(folder, 'data.csv')]);
  assert.deepEqual(s.calls.presented, [path.join(s.storage.outputs, 'report.md'), path.join(folder, 'data.csv')]);
  assert.equal(presentRefusal({ outside: ['x'] }, '/o').split('\n').at(-1), 'Files must be under /o, the session uploads folder, or a connected folder.');
  // Not a Cowork session on the connected core.
  s.config.sessionMetadata['thread-cw'] = { surface: 'cowork' };
  await assert.rejects(present({ files: [{ file_path: 'report.md' }] }, s.ctx), /only in a Cowork session/);
});

test('request_cowork_directory: attached folders without a card, others on the card, the picker without a path; refusals said to the model', async () => {
  const folder = tmp('w13-cowork-attached-');
  fs.mkdirSync(path.join(folder, 'sub'));
  const s = await session({ folders: [folder] });
  const request = tool('request_cowork_directory').handler;
  // O-22: attached (or inside an attached folder): no card.
  const attached = await request({ path: path.join(folder, 'sub') }, s.ctx);
  assert.match(attached.content[0].text, /^Folder connected: .*\/sub\n\nUse this exact path with Read\/Write\/Edit\/Grep\/Glob\./);
  assert.equal(s.calls.approvals.length, 0);
  assert.ok(H5I.includes('`Folder connected: ${s}\\n\\nUse this exact path with ${r}.\\n\\n`'));
  // A new folder: the card (the `other` kind, the official title, the path), then the session's folders.
  const other = tmp('w13-cowork-new-');
  const added = await request({ path: other }, s.ctx);
  assert.equal(added.isError, undefined);
  assert.deepEqual(s.calls.approvals.at(-1), { kind: 'other', tool: 'request_cowork_directory', title: cowork.CARDS.folderTitle, detail: other, cwd: other });
  assert.deepEqual(s.config.sessionMetadata['thread-cw'].cowork.folders, [folder, other]);
  assert.deepEqual(s.calls.approved, [other]);
  // Declined: the official rejection, nothing added.
  s.set({ approve: false });
  const third = tmp('w13-cowork-third-');
  const declined = await request({ path: third }, s.ctx);
  assert.equal(declined.isError, true);
  assert.equal(declined.content[0].text, `User rejected using mcp__code_desktop__request_cowork_directory path: ${third}. Please acknowledge this and suggest alternative approaches.`); // Dl8 / kOi / AOi (approval-policy.mjs rejectionMessage)
  assert.equal(s.config.sessionMetadata['thread-cw'].cowork.folders.length, 2);
  // A trusted folder (O-16) needs no card.
  s.set({ trust: true });
  const before = s.calls.approvals.length;
  assert.equal((await request({ path: third }, s.ctx)).isError, undefined);
  assert.equal(s.calls.approvals.length, before);
  s.set({ trust: false, approve: true });
  // Protected locations and Cowork's own storage: folder-policy's tool sentences, no card.
  const etc = await request({ path: '/etc' }, s.ctx);
  assert.equal(etc.isError, true);
  assert.equal(etc.content[0].text, MESSAGES.protectedTool.replace('{path}', '/etc').replace('{root}', '/etc'));
  const storage = await request({ path: s.storage.outputs }, s.ctx);
  assert.equal(storage.content[0].text, MESSAGES.sessionStorageTool);
  // No path: the native picker ("Select Directory to Share"); cancelled is not an error.
  const cancelled = await request({}, s.ctx);
  assert.deepEqual(cancelled, { content: [{ type: 'text', text: 'Directory selection was cancelled by the user.' }] });
  assert.deepEqual(s.calls.pickers.at(-1), { title: 'Select Directory to Share', message: 'Select a directory to share with the agent' });
  const picked = tmp('w13-cowork-picked-');
  s.set({ pick: picked });
  const approvals = s.calls.approvals.length;
  assert.equal((await request({}, s.ctx)).isError, undefined);
  assert.equal(s.calls.approvals.length, approvals, 'chosen in the picker: no card');
  assert.ok(s.config.sessionMetadata['thread-cw'].cowork.folders.includes(picked));
});

test('allow_cowork_file_delete: outputs need nothing, a connected folder asks once for the rest of the task', async () => {
  const folder = tmp('w13-cowork-delete-');
  const s = await session({ folders: [folder] });
  const allow = tool('allow_cowork_file_delete').handler;
  const outputs = await allow({ file_path: path.join(s.storage.outputs, 'a.txt') }, s.ctx);
  assert.deepEqual(outputs, { content: [{ type: 'text', text: cowork.TEXT.deleteOutputs }], isError: true });
  assert.ok(H5I.includes(`"${cowork.TEXT.deleteOutputs}"`));
  const outside = await allow({ file_path: '/tmp/elsewhere.txt' }, s.ctx);
  assert.match(outside.content[0].text, /is not inside a connected folder\. To enable deletes in a connected folder, pass the path of a file inside one of: /);
  assert.match((await allow({ file_path: `${folder}/../x` }, s.ctx)).content[0].text, /is not a normalized path/);
  assert.match((await allow({ file_path: '' }, s.ctx)).content[0].text, /^No file_path given\./);
  assert.equal(s.calls.approvals.length, 0);
  const file = path.join(folder, 'old.txt');
  assert.equal(cowork.deleteAllowed(s.config.sessionMetadata['thread-cw'], file, { userData: s.userData }), false);
  const done = await allow({ file_path: file }, s.ctx);
  const name = path.basename(folder);
  assert.deepEqual(done, { content: [{ type: 'text', text: `File deletion is now enabled for the "${name}" folder.` }] });
  assert.ok(H5I.includes('`File deletion is now enabled for the "${a.name}" folder.`'));
  assert.deepEqual(s.calls.approvals[0], { kind: 'other', tool: 'allow_cowork_file_delete', title: `Allow Claude to permanently delete files in your ${name} folder during this task?`,
    detail: `Claude is asking because it wants to delete ${file}. Allowing covers the whole folder.\n\n${cowork.CARDS.deleteWarning}`, cwd: folder });
  assert.deepEqual(s.config.sessionMetadata['thread-cw'].cowork.deleteFolders, [folder]);
  assert.equal(cowork.deleteAllowed(s.config.sessionMetadata['thread-cw'], path.join(folder, 'deep/other.txt'), { userData: s.userData }), true);
  assert.equal(cowork.deleteAllowed(s.config.sessionMetadata['thread-cw'], '/tmp/x', { userData: s.userData }), false);
  // Already allowed: no second card.
  await allow({ file_path: path.join(folder, 'another.txt') }, s.ctx);
  assert.equal(s.calls.approvals.length, 1);
  // Declined: nothing recorded.
  const s2 = await session({ folders: [folder] });
  s2.set({ approve: false });
  assert.equal((await allow({ file_path: file }, s2.ctx)).isError, true);
  assert.equal(s2.config.sessionMetadata['thread-cw'].cowork.deleteFolders, undefined);
});

test('launch_code_session: the card shows the spec, the picker places it, a Code session starts with the spec', async () => {
  const s = await session();
  const launch = tool('launch_code_session').handler;
  const repo = tmp('w13-cowork-repo-');
  s.set({ pick: repo });
  const result = await launch({ spec: 'Fix the parser.', suggested_cwd: repo }, s.ctx);
  assert.deepEqual(s.calls.approvals[0], { kind: 'other', tool: 'launch_code_session', title: cowork.CARDS.launchTitle, detail: 'Fix the parser.' });
  assert.deepEqual(s.calls.pickers[0], { title: 'Choose folder', defaultPath: repo });
  assert.deepEqual(JSON.parse(result.content[0].text), { spec: 'Fix the parser.', launched: { session_id: 'thread-code', target: 'ccd', display_path: repo } });
  // h5i: the answer once a session launched (`JSON.stringify({ spec: e, launched: t })`, launched {session_id, target ccd|ccr, display_path}).
  assert.ok(H5I.includes('JSON.stringify({spec:e,launched:t})') || H5I.includes('JSON.stringify({ spec: e, launched: t })'));
  assert.ok(H5I.includes('session_id:t.Wit(),target:t.jit(["ccd","ccr"]),display_path:t.Wit()'));
  const [start, turn] = s.calls.rpc;
  assert.equal(start.method, 'thread/start');
  assert.equal(start.params.cwd, repo);
  assert.equal(start.params.codeDesktop.surface, 'code');
  assert.equal(start.params.model, 'm1');
  assert.equal(turn.method, 'turn/start');
  assert.deepEqual(turn.params.input, [{ type: 'text', text: 'Fix the parser.' }]);
  assert.equal(turn.params.threadId, 'thread-code');
  assert.equal(turn.params.sandboxPolicy.type, 'workspaceWrite');
  assert.deepEqual(s.calls.approved, [repo]);
  // The picker dismissed: h5i's sentence, no session.
  s.set({ pick: null });
  const dismissed = await launch({ spec: 'Again.' }, s.ctx);
  assert.deepEqual(dismissed, { content: [{ type: 'text', text: cowork.TEXT.launchDismissed }], isError: true });
  assert.equal(s.calls.rpc.length, 2);
  // Declined on the card.
  s.set({ approve: false });
  assert.equal((await launch({ spec: 'No.' }, s.ctx)).content[0].text, 'User rejected using mcp__code_desktop__launch_code_session. Please acknowledge this and suggest alternative approaches.');
});

test('turn deliverables: the new outputs as one present card before turn/completed, the present_files call its own; the artifact index files both', async () => {
  const folder = tmp('w13-cowork-deliver-');
  const s = await session({ folders: [folder] });
  fs.writeFileSync(path.join(s.storage.outputs, 'old.txt'), 'old');
  const tracker = createTurnDeliverables({ outputsOf: (id) => outputsDir(s.config.sessionMetadata[id], s.userData), newId: () => 'item-present' });
  assert.deepEqual(tracker.observe({ method: 'turn/started', params: { threadId: 'thread-cw', turn: { id: 'turn-1' } } }), []);
  fs.writeFileSync(path.join(s.storage.outputs, 'new.txt'), 'new');
  fs.writeFileSync(path.join(folder, 'chart.png'), 'png');
  tracker.present('thread-cw', [path.join(folder, 'chart.png')]);
  tracker.present('thread-other', ['/x']);
  const events = tracker.observe({ method: 'turn/completed', params: { threadId: 'thread-cw', turn: { id: 'turn-1', status: 'completed' } } });
  assert.deepEqual(events.map((event) => event.method), ['item/started', 'item/completed']);
  const item = events[1].params.item;
  assert.equal(events[1].params.turnId, 'turn-1');
  // w13-close-main-process (closeout coworkfn-tools-02): a presented file has its own card (the present_files call, kept in
  // the core's history); the turn-end card adds the other new outputs only.
  assert.deepEqual(item.codeDesktop.deliverables, [{ path: path.join(s.storage.outputs, 'new.txt'), title: 'new.txt' }]);
  assert.deepEqual(itemDeliverables(item), item.codeDesktop.deliverables);
  assert.equal(recordArtifactItem(s.config, 'thread-cw', item, 1000), true);
  const call = { id: 'call-1', type: 'mcpToolCall', server: 'code_desktop', tool: 'present_files', status: 'completed', arguments: { files: [{ file_path: path.join(folder, 'chart.png') }] },
    result: { content: [{ type: 'text', text: path.join(folder, 'chart.png') }], structuredContent: { deliverables: [{ path: path.join(folder, 'chart.png'), title: 'chart.png' }] } } };
  assert.deepEqual(itemDeliverables(call), [{ path: path.join(folder, 'chart.png'), title: 'chart.png' }]);
  // A core that drops structured content: the paths the tool answered with.
  assert.deepEqual(itemDeliverables({ ...call, result: { content: call.result.content } }), [{ path: path.join(folder, 'chart.png'), title: 'chart.png' }]);
  assert.equal(itemDeliverables({ ...call, status: 'failed' }), null);
  assert.equal(itemDeliverables({ ...call, result: { ...call.result, isError: true } }), null);
  assert.equal(recordArtifactItem(s.config, 'thread-cw', call, 1000), true);
  assert.deepEqual(Object.values(s.config.localArtifacts).map((entry) => entry.path).sort(), [path.join(folder, 'chart.png'), path.join(s.storage.outputs, 'new.txt')].sort());
  // Ended: nothing more for that turn; an interrupted turn shows only what it presented; a Code session never.
  assert.deepEqual(tracker.observe({ method: 'turn/completed', params: { threadId: 'thread-cw', turn: { id: 'turn-1', status: 'completed' } } }), []);
  tracker.observe({ method: 'turn/started', params: { threadId: 'thread-cw', turn: { id: 'turn-2' } } });
  fs.writeFileSync(path.join(s.storage.outputs, 'partial.txt'), 'p');
  assert.deepEqual(tracker.observe({ method: 'turn/completed', params: { threadId: 'thread-cw', turn: { id: 'turn-2', status: 'interrupted' } } }), []);
  assert.deepEqual(tracker.observe({ method: 'turn/started', params: { threadId: 'thread-code', turn: { id: 't' } } }), []);
  assert.deepEqual(tracker.observe({ method: 'turn/completed', params: { threadId: 'thread-code', turn: { id: 't', status: 'completed' } } }), []);
  // The bounded scan: links are not followed.
  fs.symlinkSync('/etc', path.join(s.storage.outputs, 'etc-link'));
  assert.ok(![...snapshot(s.storage.outputs).keys()].some((file) => file.includes('etc-link')));
});

test('main.cjs wiring: the cowork service, the turn deliverables ahead of each event, Open outputs', () => {
  assert.match(MAIN, /agentTools\.provide\("cowork", \(session\) => \(\{/);
  assert.match(MAIN, /presented: \(paths\) => coworkTurnOutputs\.present\(session\.id, paths\)/);
  assert.match(MAIN, /rpc: \(method, params\) => requestRpc\(\{ method, params \}, undefined, client\)/);
  assert.match(MAIN, /function receive\(e\) \{\n  e = withAppToolImages\(e\);\n  for \(const delivered of coworkTurnOutputs\.observe\(e\)\) receive\(delivered\);/);
  // Right before cowork-folders (which stays right before cowork-rewind, tests/w13-cowork-folders.test.mjs).
  const open = MAIN.slice(MAIN.indexOf('case "cowork-open-outputs"'), MAIN.indexOf('case "cowork-folders"'));
  assert.ok(open.length > 0 && open.length < 1500);
  assert.match(open, /outputsDir\(config\.sessionMetadata\?\.\[id\], app\.getPath\("userData"\)\)/);
  assert.match(open, /await shell\.openPath\(outputs\)/);
  assert.doesNotMatch(open, /throw new Error\(failed\)|doesn’t exist yet/);
  assert.match(open, /console\.error\(`Failed to open outputs directory: \$\{outputs\}, error: \$\{failed\}`\)/);
  // The provide block sits where requestRpc is in scope (app.whenReady), after the other session services.
  assert.ok(MAIN.indexOf('agentTools.provide("cowork"') > MAIN.indexOf("agentTools.provide('sessionSurface'"));
});

test('zh-CN: the cards, the picker and Open outputs are translated', () => {
  // w13-close-main-process (closeout coworkfn-tools-03): Open outputs says nothing of its own (openOutputsDir only logs).
  assert.equal(zh['The outputs folder doesn’t exist yet.'], undefined);
  for (const key of [...Object.values(cowork.CARDS), cowork.TEXT.pickerTitle, cowork.TEXT.pickerMessage]) {
    assert.equal(typeof zh[key], 'string', key);
    for (const placeholder of key.match(/\{\w+\}/g) ?? []) assert.ok(zh[key].includes(placeholder), `${key} keeps ${placeholder}`);
  }
});
