import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createChatHistory } from '../electron/chat-history.mjs';
import { createChatArtifactStore } from '../electron/chat-artifact-store.mjs';
import { createChatFeedbackStore } from '../electron/chat-feedback.mjs';
import { createChatHistorySearch } from '../electron/chat-history-search.mjs';
import { createChatBranches } from '../electron/chat-branches.mjs';

// w13-chatfn-history (research/w13-chatfn.md H6, chatfn-16 cleanup; closeout chatfn-branches-06): a deleted chat's local
// data goes with the thread; incognito chats left by a quit are deleted once the core is connected. Real stores in a
// temporary folder, a fake core; no Electron.
const app = path.resolve(import.meta.dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('cascade: artifacts, the history-index entry, the per-chat Memory switch and the ratings of the deleted chat go; others stay', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-cascade-'));
  try {
    const artifacts = createChatArtifactStore({ dataDir: dir });
    await artifacts.apply('gone', { command: 'create', id: 'a1', title: 'A', type: 'text/plain', content: 'x' });
    await artifacts.apply('kept', { command: 'create', id: 'a2', title: 'B', type: 'text/plain', content: 'y' });
    const feedback = createChatFeedbackStore({ dataDir: dir });
    await feedback.run({ operation: 'put', threadId: 'gone', itemId: 'i1', type: 'upvote' });
    await feedback.run({ operation: 'put', threadId: 'kept', itemId: 'i2', type: 'flag' });
    const turns = [{ id: 't', items: [{ type: 'userMessage', content: [{ type: 'text', text: 'hello world' }] }] }];
    const index = createChatHistorySearch({ dir: path.join(dir, 'chat-index'), threads: () => [{ id: 'gone', updatedAt: 1, surface: 'chat' }, { id: 'kept', updatedAt: 1, surface: 'chat' }],
      request: async () => ({ thread: { turns } }) });
    assert.equal((await index.search('hello')).length, 2);
    const indexFiles = () => fs.readdirSync(path.join(dir, 'chat-index')).length;
    assert.equal(indexFiles(), 2);
    const config = { threadIds: ['kept'], chatMemory: { enabled: true, threads: { gone: false, kept: false } } };
    let saved = 0;
    const pruned = [];
    const history = createChatHistory({ getConfig: () => config, save: () => { saved++; }, artifacts: () => artifacts, memory: () => ({ removeThread: id => index.remove(id) }),
      feedback: async () => feedback, branches: async () => ({ run: async p => { pruned.push(p.operation); } }) });
    await history.cascade('gone');
    await tick();
    assert.equal(fs.existsSync(path.join(dir, 'chat-artifacts', 'gone')), false);
    assert.equal(fs.existsSync(path.join(dir, 'chat-artifacts', 'kept')), true);
    assert.equal(indexFiles(), 1);
    assert.deepEqual(config.chatMemory, { enabled: true, threads: { kept: false } });
    assert.equal(saved, 1);
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'chat-feedback.json'), 'utf8'));
    assert.deepEqual(Object.keys(stored.threads), ['kept']);
    assert.deepEqual(pruned, ['prune']);
    assert.equal(await feedback.forget('gone'), false, 'nothing left to forget');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('cascade never fails the delete: a step that throws is logged and the next steps still run', async () => {
  const logged = [], done = [];
  const history = createChatHistory({ getConfig: () => ({}), artifacts: () => ({ deleteThread: async () => { throw new Error('disk'); } }),
    memory: () => ({ removeThread: () => { done.push('index'); } }), feedback: async () => { throw new Error('no store'); },
    branches: async () => ({ run: async () => { done.push('prune'); } }), log: message => logged.push(message) });
  await history.cascade('t1');
  await tick();
  assert.deepEqual(done, ['index', 'prune']);
  assert.deepEqual(logged, ['chat-history: artifacts failed', 'chat-history: feedback failed']);
  await history.cascade('');
  assert.deepEqual(done, ['index', 'prune'], 'no id, nothing to do');
});

test('a branched conversation deleted from its row: the other versions are deleted through thread/delete, without a deadlock', async () => {
  const config = {
    threadIds: ['v1', 'root'], archivedThreadIds: [], threadMetadata: {},
    sessionMetadata: { root: { surface: 'chat', chatBranchShown: 'v1' }, v1: { surface: 'chat', chatBranchOf: 'root' } },
    chatBranches: { root: { root: 'root', members: [{ id: 'root', parent: null, anchor: 0 }, { id: 'v1', parent: 'root', anchor: 1 }], shown: 'v1' } },
  };
  const deleted = [];
  let history = null;
  // The app's thread/delete: drops the id, then runs the cascade (as main.cjs requestRpc does).
  const deleteThread = async (id) => {
    deleted.push(id);
    config.threadIds = config.threadIds.filter(known => known !== id);
    delete config.sessionMetadata[id];
    void history.cascade(id);
  };
  const branches = createChatBranches({ getConfig: () => config, save: () => {}, fork: async () => { throw new Error('no fork'); }, request: async () => ({}), deleteThread });
  history = createChatHistory({ getConfig: () => config, branches: async () => branches });
  await deleteThread('v1'); // the user deletes the row (the shown version)
  for (let i = 0; i < 10 && !deleted.includes('root'); i++) await tick();
  assert.deepEqual(deleted, ['v1', 'root']);
  assert.deepEqual(config.chatBranches, {});
  assert.deepEqual(config.threadIds, []);
});

test('incognito sweep: leftovers from an earlier run are deleted once the core is connected; this run\'s stay', async () => {
  const config = { threadIds: ['old', 'mine', 'plain'], archivedThreadIds: ['older'],
    sessionMetadata: { old: { surface: 'chat', incognito: true }, mine: { surface: 'chat', incognito: true }, older: { surface: 'chat', incognito: true }, plain: { surface: 'chat' } } };
  const deleted = [];
  let connected = false, failOnce = true;
  const history = createChatHistory({ getConfig: () => config, connected: () => connected,
    deleteThread: async id => { if (id === 'older' && failOnce) { failOnce = false; throw new Error('busy'); } deleted.push(id); config.threadIds = config.threadIds.filter(known => known !== id); config.archivedThreadIds = config.archivedThreadIds.filter(known => known !== id); } });
  history.noteLive('mine');
  const timers = [];
  let armed = null;
  const stop = history.startSweep({ delayMs: 5, intervalMs: 7, attempts: 5, setTimer: (fn, ms) => { timers.push(ms); armed = { fn }; return armed; }, clearTimer: () => {} });
  const fire = async () => { const handle = armed; armed = null; await handle.fn(); await tick(); };
  assert.deepEqual(timers, [5]);
  await fire(); // not connected yet: try again later
  assert.deepEqual([deleted, timers], [[], [5, 7]]);
  connected = true;
  await fire(); // 'older' fails once: one more try
  assert.deepEqual(deleted, ['old']);
  assert.deepEqual(timers, [5, 7, 7]);
  await fire();
  assert.deepEqual(deleted, ['old', 'older']);
  assert.equal(armed, null, 'nothing left: no more tries');
  assert.ok(config.threadIds.includes('mine'));
  stop();
  // A cascade (the chat was deleted) forgets it as live.
  await history.cascade('mine');
  assert.deepEqual((await history.sweepIncognito()).deleted, ['mine']);
});

test('host wiring: the app\'s thread/delete (Code/Chat core and Cowork) runs the cascade; Chat search falls back to the local index', () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(main, /          closeSidePanePopoutsForSession\(id\);\n          void chatHistory\.cascade\(id\);/);
  assert.match(main, /      save\(\); emitSessionList\('deleted', id\);\n      void chatHistory\.cascade\(id\); \/\/ w13-chatfn-history/);
  assert.match(main, /const chatHistory = \(await import\('\.\/chat-history\.mjs'\)\)\.createChatHistory\(\{ getConfig: \(\) => config, save, artifacts: \(\) => chatArtifacts, memory: \(\) => chatMemory,/);
  assert.match(main, /branches: chatBranchesReady, deleteThread: \(threadId\) => requestRpc\(\{ method: "thread\/delete", params: \{ threadId \} \}, undefined, client\),/);
  // thread-search without capabilities.threadSearch: the Chat sessions in chat-history-search.mjs (via chat-memory.mjs).
  const search = main.slice(main.indexOf('      case "thread-search": {'), main.indexOf('      case "resume-add": {'));
  assert.match(search, /if \(!coreSupports\(client\.serverInfo, "threadSearch"\)\) return \{ data: chatMemory \? \(await chatMemory\.history\.search\(term, \{ n: 100 \}\)\)/);
  const renderer = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(renderer, /!\(coreSupports\(boot\?\.core, "threadSearch"\) \|\| mode === "chat"\)\) \{ setSearchMatches\(null\); return; \}/);
  assert.match(renderer, /deepSearch=\{!!boot\?\.connected && \(coreSupports\(boot\?\.core, "threadSearch"\) \|\| mode === "chat"\)\}/);
});

test('a Pin follows the version a branched conversation shows (closeout chatfn-branches-06): select, Retry, removed shown version', async () => {
  const config = {
    threadIds: ['root', 'v1', 'v2', 'other'], archivedThreadIds: [], threadMetadata: {}, pinnedOrder: ['other', 'root'],
    sessionMetadata: { root: { surface: 'chat', pinned: true, chatBranchShown: 'root' }, v1: { surface: 'chat', chatBranchOf: 'root' }, v2: { surface: 'chat' }, other: { surface: 'chat', pinned: true } },
    chatBranches: { root: { root: 'root', members: [{ id: 'root', parent: null, anchor: 0 }, { id: 'v1', parent: 'root', anchor: 1 }], shown: 'root' } },
  };
  const moved = [];
  const turns = { root: ['t0', 't1'], v1: ['t0', 't1'], v2: ['t0', 't1'] };
  const branches = createChatBranches({ getConfig: () => config, save: () => {}, revertServed: () => false, pinMoved: (from, to) => moved.push([from, to]),
    fork: async () => ({ thread: { id: 'v2' }, sessionMetadata: {} }), request: async (method, p) => ({ thread: { turns: (turns[p.threadId] ?? []).map(id => ({ id })) } }) });
  // Previous / Next: the shown version changes, the Pin goes with it and keeps its place in the Pinned order.
  const selected = await branches.run({ operation: 'select', threadId: 'v1' });
  assert.deepEqual(moved, [['root', 'v1']]);
  assert.deepEqual(config.pinnedOrder, ['other', 'v1']);
  assert.equal(config.sessionMetadata.v1.pinned, true);
  assert.equal(config.sessionMetadata.root.pinned, undefined);
  assert.equal(selected.metadata.v1.pinned, true, 'the renderer\'s metadata patch carries the move');
  assert.ok(Object.hasOwn(selected.metadata, 'root'));
  // Retry (a new version is shown): the Pin moves to it.
  await branches.run({ operation: 'create-variant', threadId: 'v1', turnId: 't1' });
  assert.deepEqual(moved.at(-1), ['v1', 'v2']);
  assert.deepEqual(config.pinnedOrder, ['other', 'v2']);
  // Removing the shown version falls back to its parent, and so does the Pin.
  await branches.run({ operation: 'remove', threadId: 'v2' });
  assert.deepEqual(moved.at(-1), ['v2', 'v1']);
  assert.deepEqual(config.pinnedOrder, ['other', 'v1']);
  // Not pinned: nothing moves.
  config.sessionMetadata.v1 = { ...config.sessionMetadata.v1, pinned: false };
  await branches.run({ operation: 'select', threadId: 'root' });
  assert.equal(moved.length, 3);
  assert.equal(config.sessionMetadata.root.pinned, undefined);
  // main.cjs mirrors the move and refreshes every window's sidebar.
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.match(main, /pinMoved: \(\.\.\.ids\) => \{ for \(const id of ids\) mirrorSections\(\(owner\) => codexSections\.placeSession\(owner, config, id\)\); sidebarSectionsStore\?\.syncSidebarSections\(config\); config\.sidebarRevision = \(config\.sidebarRevision \|\| 0\) \+ 1; save\(\); emit\(\{ kind: "sidebar-state", state: sidebarSnapshot\(\) \}\); \} \}\)\);/);
});

test('project detail: no conversation search, as 3.6556.2 by default (c71dee58b fc behind GrowthBook claude_ai_project_chat_search_main, off: D29/D31, E49)', () => {
  const ion = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const read = prefix => fs.readFileSync(path.join(ion, fs.readdirSync(ion).find(name => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
  const detail = read('c71dee58b-');
  assert.ok(detail.includes('i=G("claude_ai_project_chat_search_main")'), 'fc: i = the gate');
  assert.ok(/if\(!i\|\|!a\)\{N=null;break bb0\}/.test(detail), 'fc: no search slot unless the gate is on');
  assert.ok(detail.includes('{defaultMessage:"Search this project",id:"RHp3YbUtoP"}'));
  // G is shared-25 fs: a GrowthBook feature's `.on` (the host serves none of claude.ai's features).
  assert.ok(detail.includes('Yh as G'));
  assert.ok(/function fs\(e\)\{let \$=J9\(2\);return \$o\(J1\(\$,0,e\)\?K1\(\$,0,e,H\(e\)\):\$\[1\]\)\.on\}/.test(read('shared-25-')));
  for (const file of ['src/source-projects.jsx', 'src/source-project-v3-adapters.jsx', 'src/main.jsx'])
    assert.doesNotMatch(fs.readFileSync(path.join(app, file), 'utf8'), /Search this project/, file);
});
