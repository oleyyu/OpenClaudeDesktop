// W14-code round 5, lane "shared" (data/w14code/round5/lanes/shared.json): the restart a plugin change or a profile connector
// needs happens before the next new session (r5-shared-01/02, electron/core-restart.cjs), Computer use's copy names the
// assistant through the persona (r5-shared-03, tests/settings-computer-use.test.mjs), and Code's Stop / queued message /
// Unarchive / trust failures are the official toasts (r5-shared-04..07). Source-only: official chunks are read, never run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const EN = JSON.parse(fs.readFileSync(path.join(V1, '../../i18n/en-US.json'), 'utf8'));
const chunk = (name) => fs.readFileSync(path.join(V1, name), 'utf8').replace(/\\u2019/g, '’').replace(/\\u2014/g, '—');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const zh = async (file) => (await import(`../electron/i18n/zh-CN/${file}`)).default;
const { changeNeedsRestart, createCoreRestart } = createRequire(import.meta.url)('../electron/core-restart.cjs');
const main = source('src/main.jsx'), electronMain = source('electron/main.cjs');
// A function's text in main.jsx, from its declaration to the next declaration given.
const slice = (from, to) => { const start = main.indexOf(from); assert.ok(start > 0, from); return main.slice(start, main.indexOf(to, start + from.length)); };

// ---- r5-shared-01 (regression) -------------------------------------------------------------------------------------
test('r5-shared-01: a restart-required plugin change marks the client; the next new session restarts it only when idle', async () => {
  assert.equal(EN.NHsmCWvJf8, '{pluginName} is installed. Start a new session to use it.');
  assert.equal(changeNeedsRestart('plugin-install', { changed: true, application: 'restart-required' }), true);
  assert.equal(changeNeedsRestart('plugin-set-enabled', { application: 'restart-required' }), true);
  assert.equal(changeNeedsRestart('plugin-remove', { changed: false, application: 'restart-required' }), false, 'nothing changed');
  assert.equal(changeNeedsRestart('plugin-install', { changed: true, application: 'applied' }), false);
  assert.equal(changeNeedsRestart('plugin-install', { application: 'restart-required', error: { code: 'x' } }), false);
  assert.equal(changeNeedsRestart('plugins', { application: 'restart-required' }), false, 'a read is no change');

  let client = { id: 1 }, idle = true;
  const restarts = [];
  const restart = createCoreRestart({ getClient: () => client, idle: async () => idle, restart: async (owner) => { restarts.push(owner.id); client = { id: owner.id + 1 }; } });
  assert.equal(await restart.beforeNewSession(), false, 'nothing waits');
  const result = { changed: true, application: 'restart-required' };
  assert.equal(restart.noteCustomize('plugin-install', result), result, 'the result passes through');
  assert.equal(restart.pending(), true);
  idle = false;
  assert.equal(await restart.beforeNewSession(), false, 'a running session keeps the core');
  assert.deepEqual(restarts, []);
  assert.equal(restart.pending(), true, 'still waiting for the next new session');
  idle = true;
  const [first, second] = await Promise.all([restart.beforeNewSession(), restart.beforeNewSession()]);
  assert.deepEqual([first, second, restarts], [true, true, [1]], 'two starts at once share one restart');
  assert.equal(restart.pending(), false, 'the new client loaded the change');
  assert.equal(await restart.beforeNewSession(), false);
  // A client that replaced the marked one (a Reconnect, a core switch) started with the change already.
  restart.mark({ id: 99 });
  assert.equal(restart.pending(), false);
  assert.equal(await restart.beforeNewSession(), false);
  assert.deepEqual(restarts, [1]);
  // The page keeps no restart state any more; the toast stays WV readyInNewSession.
  const store = source('src/customize-store.mjs');
  assert.ok(store.includes('pluginOps: { install: null },') && !store.includes('restartRequired'));
  assert.ok(source('src/source-customize.jsx').includes('t("{pluginName} is installed. Start a new session to use it.", { pluginName })'));
});

test('r5-shared-01: main.cjs notes Customize plugin results and restarts the idle core before a window\'s thread/start', () => {
  assert.ok(electronMain.includes('const coreRestart = require("./core-restart.cjs").createCoreRestart({ getClient: () => client,'));
  assert.ok(electronMain.includes('case "customize": { const owner = client; return coreRestart.noteCustomize(p.operation, await customizeOperations.run(p), owner); }'));
  assert.ok(electronMain.includes('if (p.method === "thread/start" && !expectedOwner && !p.expected) await coreRestart.beforeNewSession();'));
  // Idle: no running turn, workflow, goal, starting operation or background command (quit-guard's own reads).
  const block = electronMain.slice(electronMain.indexOf('const coreRestart = require'), electronMain.indexOf('async function requestRpc('));
  for (const part of ['liveWork.sessions().size', 'computerUseActiveTurns.size', 'activeGoals.size', 'sessionOperations.snapshot().length', 'backgroundSessions({ client: owner, ids: liveWork.touchedSessions() })'])
    assert.ok(block.includes(part), part);
  // The restart is the Reconnect path: the old client goes, a new one connects, every window hears the connection events.
  for (const part of ['receive({ kind: "connection", connected: false });', 'client.invalidateApprovals("manual_reconnect");', 'client = new CodexClient();', 'receive(connectionEvent(next, s));', 'await connect();'])
    assert.ok(block.includes(part), part);
  // The VM Cowork route returns before the check: its sessions don't run on this core.
  const rpc = electronMain.slice(electronMain.indexOf('async function requestRpc('));
  assert.ok(rpc.indexOf('return requestCowork(p);') < rpc.indexOf('await coreRestart.beforeNewSession();'));
  // A renderer reconnect clears the resumed sessions on the disconnect, so the next send resumes them on the new core.
  assert.ok(main.includes('if (!e.connected) { resumed.current.clear(); childThreads.current.clear(); }'));
});

// ---- r5-shared-02 --------------------------------------------------------------------------------------------------
test('r5-shared-02: adding a profile connector is cf400e6a4 addSuccess "Custom connector added."; the restart banner is gone', async () => {
  assert.ok(chunk('cf400e6a4-BID2ahY5.js').includes('o(i.formatMessage({defaultMessage:"Custom connector added.",id:"qHSHbuVFdy"})'));
  assert.ok(!Object.values(EN).some((text) => /starts after .* restarts/.test(text)));
  const customize = source('src/source-customize.jsx');
  assert.ok(customize.includes('await onHarnessCall({ op: "mcp-add", ...params }); toasts?.add?.(t("Custom connector added."), { variant: "neutral" });'));
  for (const gone of ['data-connector-restart', 'harnessRestart', 'The connector starts after DeepSeek restarts', 't("Restart DeepSeek")', 'onRestartCore'])
    assert.ok(!customize.includes(gone), gone);
  assert.ok(!source('src/source-customize.css').includes('.cz-plugin-restart'));
  assert.ok(!source('src/source-settings.jsx').includes('onRestartCore={customize.onRestartCore}'), 'Customize takes no restart callback');
  assert.ok(electronMain.includes('if (p.op === "mcp-add" && coreSupports(owner?.serverInfo, "harnessProfile")) coreRestart.mark(owner);'));
  assert.equal((await zh('customize.mjs'))['Custom connector added.'], '已添加自定义连接器。');
});

// ---- r5-shared-04 --------------------------------------------------------------------------------------------------
test('r5-shared-04: a failed Stop is c6b8adeaf So addError in Code, the reason only in the log', async () => {
  const official = chunk('c6b8adeaf-bLEQVSWL.js');
  assert.ok(official.includes('s(l.formatMessage({defaultMessage:"Couldn’t stop the response — check your connection and try again.",id:"0iGReZMXeq"}),{error:e}),R(e,"stop_session_failed"'));
  const stop = slice('  async function stop() {', '  function applyConfirmedPreferences(');
  assert.ok(stop.includes('if (mode === "code" && toasts) { console.warn("stop_session_failed", e); codeDanger(t("Couldn’t stop the response — check your connection and try again.")); }'));
  assert.ok(stop.includes('else setError(e.message);'), 'Chat / Cowork unchanged');
  assert.equal((await zh('app.mjs'))['Couldn’t stop the response — check your connection and try again.'], '无法停止回复，请检查网络连接后重试。');
});

// ---- r5-shared-05 --------------------------------------------------------------------------------------------------
test('r5-shared-05: a failed reorder and a failed Send now are c6b8adeaf lo / po addError in Code', async () => {
  const official = chunk('c6b8adeaf-bLEQVSWL.js');
  assert.ok(official.includes('r(i.formatMessage({defaultMessage:"Couldn’t reorder the queued messages. Try again.",id:"BVj7/FoCUK"}),{messageForLogging:"epitaxy: queued reorder failed"})'));
  assert.ok(official.includes('i(a.formatMessage({defaultMessage:"Couldn’t send the message now. It’s still in the queue.",id:"w0P9++Gewb"}),{messageForLogging:"epitaxy: queued promote failed"})'));
  const steer = slice('  async function queueSteer(id) {', '  async function queueReorder(');
  assert.ok(steer.includes('if (mode === "code" && toasts) { console.warn("epitaxy: queued promote failed", reason); codeDanger(t("Couldn’t send the message now. It’s still in the queue.")); }'));
  // The refused entry still goes back to its old slot before the toast.
  assert.ok(steer.indexOf('await rpc("thread/queue/add"') < steer.indexOf('codeDanger('));
  const reorder = slice('  async function queueReorder(', '  async function init() {');
  assert.ok(reorder.includes('if (mode === "code" && toasts) { console.warn("epitaxy: queued reorder failed", reason); codeDanger(t("Couldn’t reorder the queued messages. Try again.")); }'));
  assert.ok(reorder.indexOf('rollback(current)') < reorder.indexOf('codeDanger('), 'the order rolls back first');
  const strings = await zh('app.mjs');
  assert.equal(strings['Couldn’t reorder the queued messages. Try again.'], '无法调整排队消息的顺序，请重试。');
  assert.equal(strings['Couldn’t send the message now. It’s still in the queue.'], '暂时无法立即发送这条消息，它仍在队列中。');
});

// ---- r5-shared-06 --------------------------------------------------------------------------------------------------
test('r5-shared-06: an unarchive in Code is followed by c6b8adeaf fa addSuccess "Session unarchived." for 3 s, unless silent', async () => {
  const official = chunk('c6b8adeaf-bLEQVSWL.js');
  assert.ok(official.includes('{addError:d,addSuccess:f}=O()'));
  assert.ok(official.includes('i||f(p.formatMessage({defaultMessage:"Session unarchived.",id:"1IdB4APlaT"}),{timeout:3e3})'));
  const action = slice('  async function sessionAction(action, target, payload = {}) {', '      case "delete": {');
  assert.ok(action.includes('if (action === "unarchive" && mode === "code" && toasts && payload.silent !== true)'));
  assert.ok(action.includes('toasts.add(t("Session unarchived."), { variant: "neutral", timeout: 3000, key: "session-unarchived" });'));
  // After the core answered and the row moved, never on a failure.
  assert.ok(action.indexOf('await rpc("thread/" + action') < action.indexOf('t("Session unarchived.")'));
  assert.equal((await zh('app.mjs'))['Session unarchived.'], '已取消归档会话。');
});

// ---- r5-shared-07 --------------------------------------------------------------------------------------------------
test('r5-shared-07: a failed folder trust is c516e93ca addError "Trust settings couldn’t be saved. You can try again." in Code', async () => {
  assert.ok(chunk('c516e93ca-cR9_bRq_.js').includes('L(R.formatMessage({defaultMessage:"Trust settings couldn’t be saved. You can try again.",id:"skoSLd5vgp"})'));
  const call = 'if (mode === "code" && toasts) { console.warn("Epitaxy trust gate: saveTrust failed", error); codeDanger(t("Trust settings couldn’t be saved. You can try again.")); }';
  const bridge = slice('  async function trustBridgeFolder(folder) {', '  const canTrustProject');
  assert.ok(bridge.includes(call) && bridge.includes('else if (toasts) toasts.add(error.message, { variant: "warning" }); else setError(error.message);'));
  const project = slice('  async function trustProject() {', '  // The account\'s plan (account/read)');
  assert.ok(project.includes(call) && project.includes('else setError(error.message);'));
  assert.equal((await zh('workflows.mjs'))['Trust settings couldn’t be saved. You can try again.'], '无法保存信任设置。你可以重试。');
});
