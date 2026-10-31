// The focus-steal guard (electron/computer-use/focus-guard.cjs, official armFocusStealGuard): before an app_* action the
// app in front is read; if the target comes to the front with the action, the app the user was in is activated again
// at the 500 ms / 3 s checks, and the result says so. In-process only: a fake native module and a hand-run clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createFocusGuard, frontNote, CHECKS_MS } = require('../electron/computer-use/focus-guard.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { fit } = require('../electron/computer-use/budget.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const FINDER = 'com.apple.finder', NOTES = 'com.apple.Notes', OWN = 4242;
const USER = { pid: 300, bundleId: NOTES };
const TARGET = { pid: 500, bundleId: FINDER };

/** frontmostApp answers `front()` (a function, so a test can switch it); activatePid is recorded and puts that app in front. */
function fakeFront({ front = () => USER, mouseDown = () => 9999 } = {}) {
  const calls = [];
  let current = front;
  return {
    calls,
    setFront(next) { current = typeof next === 'function' ? next : () => next; },
    async call(method, params = {}) {
      calls.push([method, params]);
      if (method === 'frontmostApp') { const f = current(); return f ? { ...f, secondsSinceUserMouseDown: mouseDown() } : { pid: null, bundleId: null }; }
      if (method === 'activatePid') { current = () => (params.pid === USER.pid ? USER : { pid: params.pid, bundleId: null }); return { activated: true, frontmostPid: params.pid }; }
      throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
    },
  };
}
/** A clock the test moves, and the guard's scheduled checks, run by hand. */
function clock() {
  let t = 1_000_000;
  const queue = [];
  return {
    now: () => t,
    schedule: (ms, run) => { queue.push({ at: t + ms, run }); },
    async advance(ms) {
      t += ms;
      for (const item of queue.filter((entry) => entry.at <= t && !entry.done).sort((a, b) => a.at - b.at)) { item.done = true; item.run(); }
      for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve));
    },
    pending: () => queue.filter((entry) => !entry.done).map((entry) => entry.at - t),
  };
}
const quiet = () => ({ info() {}, warn() {} });
const activations = (native) => native.calls.filter(([method]) => method === 'activatePid').map(([, params]) => params);

test('official timing: the checks run at 500 ms and 3 s after the action', () => {
  assert.deepEqual([...CHECKS_MS], [500, 3000]);
  assert.match(frontNote('Finder'), /^Finder came to the FRONT with this action/);
  assert.match(frontNote('Finder'), /normally put back within 3 seconds; some of their typing may have gone to this one meanwhile\. Tell the user, and do not take it for their consent to work in front of them\.$/);
});

test('the target came to the front: it is said at once, and the app the user was in is activated again at 500 ms (pid only, no all-windows)', async () => {
  const native = fakeFront();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const token = await guard.before(FINDER);
  assert.deepEqual(token.prior, USER);
  native.setFront(TARGET);                       // the action brought Finder forward
  const after = await guard.after(token);
  assert.deepEqual(after, { cameToFront: true, guarded: true });
  assert.deepEqual(time.pending(), [500, 3000]);
  assert.deepEqual(activations(native), [], 'nothing before the first check');
  await time.advance(500);
  assert.deepEqual(activations(native), [{ pid: USER.pid }]);
  await time.advance(2500);
  assert.deepEqual(activations(native), [{ pid: USER.pid }], 'the user\'s app is in front again: the 3 s check does nothing');
  assert.deepEqual(guard.pending(), {}, 'forgotten after the last check');
});

test('the target came forward late: the 3 s check still puts the user\'s app back', async () => {
  const native = fakeFront();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const after = await guard.after(await guard.before(FINDER));
  assert.equal(after.cameToFront, false);
  await time.advance(500);
  assert.deepEqual(activations(native), []);
  native.setFront(TARGET);
  await time.advance(2500);
  assert.deepEqual(activations(native), [{ pid: USER.pid }]);
});

test('nothing to guard: the user is in the target app, this app is in front, or nobody is', async () => {
  for (const front of [TARGET, { pid: OWN, bundleId: 'dev.openclaude.app' }, null]) {
    const native = fakeFront({ front: () => front });
    const time = clock();
    const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
    const token = await guard.before(FINDER);
    assert.equal(token.prior, null, JSON.stringify(front));
    native.setFront(TARGET);
    assert.deepEqual(await guard.after(token), { cameToFront: false, guarded: false });
    assert.deepEqual(time.pending(), []);
    await time.advance(5000);
    assert.deepEqual(activations(native), [], JSON.stringify(front));
  }
});

test('the user clicked into the target themselves after the action began: left to the user', async () => {
  let mouseDown = 9999;
  const native = fakeFront({ mouseDown: () => mouseDown });
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const token = await guard.before(FINDER);
  await guard.after(token);
  await time.advance(300);
  mouseDown = 0.1;                                // a real left press 100 ms ago, after the action began
  native.setFront(TARGET);
  await time.advance(200);
  assert.deepEqual(activations(native), []);
  await time.advance(2500);
  assert.deepEqual(activations(native), [], 'not at 3 s either');
  assert.deepEqual(guard.pending(), {});
});

test('back-to-back actions: the app remembered first is the one put back, the newer arming supersedes the older, a running action defers', async () => {
  const native = fakeFront();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const first = await guard.before(FINDER);
  native.setFront(TARGET);
  await guard.after(first);
  // A second action while Finder is (wrongly) in front: it still remembers Notes, not Finder.
  const second = await guard.before(FINDER);
  assert.deepEqual(second.prior, USER);
  await time.advance(500);
  assert.deepEqual(activations(native), [], 'an action on the app is running: the check waits for its own arming');
  await guard.after(second);
  await time.advance(400);
  assert.deepEqual(activations(native), [], 'the first arming is superseded');
  await time.advance(100);
  assert.deepEqual(activations(native), [{ pid: USER.pid }], 'the second arming\'s 500 ms check');
});

// ── Wired into every app_* action that reaches the app (service.cjs withFocusGuard) ──
function serviceNative() {
  const front = fakeFront();
  const elements = [{ index: 0, role: 'AXButton', title: 'Back', frame: { x: 10, y: 10, width: 20, height: 20 } },
    { index: 1, role: 'AXTextField', title: 'Search', frame: { x: 400, y: 10, width: 120, height: 22 } }];
  const window = { window_id: 7, title: 'Recents', is_main: true, is_minimized: true, is_hidden: false, is_off_space: false, bounds: { x: 0, y: 0, width: 800, height: 500 }, is_auxiliary: false };
  let shown = false;
  const native = {
    calls: front.calls,
    setFront: front.setFront,
    async call(method, params = {}) {
      if (method === 'frontmostApp' || method === 'activatePid') return front.call(method, params);
      front.calls.push([method, params]);
      // Every delivering call brings Finder to the front, as an app that activates itself would.
      const deliver = (answer) => { front.setFront(TARGET); return answer; };
      switch (method) {
        case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 10 };
        case 'captureWindow': {
          const [width, height] = fit(1600, 1000);
          return { dataUrl: 'data:image/jpeg;base64,QUJD', width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7,
            bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements };
        }
        case 'listWindows': return { windows: [{ ...window, is_minimized: !shown }] };
        case 'axClick': return deliver({ outcome: 'ok', reasonCode: null, axOp: 'AXPress', role: 'AXButton' });
        case 'axType': return deliver({ outcome: 'ok', reasonCode: null, axOp: 'AXValue' });
        case 'axKey': return deliver({ outcome: 'ok', reasonCode: null, axOp: 'AXConfirm', role: 'AXTextField', title: 'Search' });
        case 'axScroll': return deliver({ outcome: 'ok', reasonCode: null, axOp: 'set scrollbar AXValue=0.30', role: 'AXScrollArea', before: 0.2, after: 0.3 });
        case 'drag': return deliver({ outcome: 'ok', delivered: true, before: { AXValue: 'a' }, after: { AXValue: 'b' } });
        case 'showWindowBehindTheFrontWindow': shown = true; return deliver({ code: 'shown_and_now_in_front' });
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
  const axHelper = { calls: [], async call(method, params) {
    this.calls.push([method, params]);
    front.setFront(TARGET);
    if (method === 'focus') return { outcome: 'ok', focused: true, main: true, window_id: 7, activated: true };
    if (method === 'menu') return { outcome: 'ok', path: params.path };
    throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
  } };
  return { native, axHelper };
}

test('service: click, type, key, scroll, drag, a menu press, focus and bring-to-Space all run inside the guard; each answers cameToFront and the user\'s app is put back', async () => {
  const { native, axHelper } = serviceNative();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const service = createComputerUse({ native, axHelper, log: quiet(), wait: async () => {}, focusGuard: guard });
  service.grantsFor('s').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  await service.appScreenshot('s', { bundleId: FINDER });
  const actions = {
    click: () => service.appClick('s', { bundleId: FINDER, element_index: 0, axOnly: true }),
    type: () => service.appType('s', { bundleId: FINDER, text: 'hi', element_index: 1 }),
    key: () => service.appKey('s', { bundleId: FINDER, combo: 'return', element_index: 1 }),
    scroll: () => service.appScroll('s', { bundleId: FINDER, dy: 2, coordinate: [800, 500] }),
    drag: () => service.appDrag('s', { bundleId: FINDER, coordinate: [100, 100], to_coordinate: [300, 100] }),
    menu: () => service.appMenu('s', { bundleId: FINDER, path: ['File', 'New Finder Window'] }),
    focus: () => service.appFocus('s', { bundleId: FINDER }),
  };
  for (const [name, run] of Object.entries(actions)) {
    native.setFront(USER);
    const result = await run();
    assert.equal(result.outcome, 'ok', name);
    assert.deepEqual([result.cameToFront, result.tellUser], [true, true], name);
    assert.equal(result.focusNote, frontNote('Finder'), name);
    const before = activations(native).length;
    await time.advance(500);
    assert.deepEqual(activations(native).slice(before), [{ pid: USER.pid }], `${name}: the user's app is activated again`);
    await time.advance(2500);
  }
  // app_bring_to_current_space: shown_and_now_in_front (the official wording says it), and the guard puts the user's app back.
  native.setFront(USER);
  const brought = await service.appBringToCurrentSpace('s', { bundleId: FINDER, windowId: 7 });
  assert.deepEqual([brought.outcome, brought.how, brought.tellUser], ['ok', 'shown_and_now_in_front', true]);
  assert.match(brought.message, /normally put back within 3 seconds/);
  const before = activations(native).length;
  await time.advance(500);
  assert.deepEqual(activations(native).slice(before), [{ pid: USER.pid }]);
  // Each guarded action read the app in front before it touched the app.
  const order = native.calls.map(([method]) => method);
  for (const method of ['axClick', 'axType', 'axKey', 'axScroll', 'drag', 'showWindowBehindTheFrontWindow']) {
    const at = order.indexOf(method);
    assert.equal(order[at - 1], 'frontmostApp', `${method} comes right after the guard's read`);
  }
});

test('service: refused before reaching the app (a right click, the Dock) — no guard, nothing activated', async () => {
  const { native, axHelper } = serviceNative();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const service = createComputerUse({ native, axHelper, log: quiet(), wait: async () => {}, focusGuard: guard });
  service.grantsFor('s').grant([FINDER, 'com.apple.dock']);
  await service.appScreenshot('s', { bundleId: FINDER });
  const right = await service.appClick('s', { bundleId: FINDER, element_index: 0, button: 'right' });
  assert.equal(right.reasonCode, 'context_menu');
  await assert.rejects(() => service.appScreenshot('s', { bundleId: 'com.apple.dock' }), (error) => error.code === 'desktop_shell');
  await assert.rejects(() => service.appClick('s', { bundleId: 'com.apple.dock', coordinate: [1, 1] }), (error) => error.code === 'desktop_shell');
  assert.ok(!native.calls.some(([method]) => method === 'frontmostApp' || method === 'axClick'));
  await time.advance(5000);
  assert.deepEqual(activations(native), []);
});

test('agent tools: the note reaches the model on app_click, app_key and app_scroll results', async () => {
  const { native, axHelper } = serviceNative();
  const time = clock();
  const guard = createFocusGuard({ native, ownPid: OWN, log: quiet(), schedule: time.schedule, now: time.now });
  const service = createComputerUse({ native, axHelper, log: quiet(), wait: async () => {}, focusGuard: guard });
  service.grantsFor('thread').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  const ctx = { sessionId: 'thread', computerUse: { service } };
  const tool = (name) => cu.tools.find((entry) => entry.name === name);
  await tool('app_screenshot').handler({ app: FINDER }, ctx);
  for (const [name, args] of [['app_click', { element_index: 0 }], ['app_key', { combo: 'return', coordinate: [460, 20] }], ['app_scroll', { dy: 2, coordinate: [800, 500] }]]) {
    native.setFront(USER);
    const body = JSON.parse((await tool(name).handler({ app: FINDER, ...args }, ctx)).content[0].text);
    assert.deepEqual([body.ok, body.cameToFront, body.tellUser], [true, true, true], name);
    assert.match(body.focusNote, /^Finder came to the FRONT with this action/, name);
    await time.advance(3000);
  }
});
