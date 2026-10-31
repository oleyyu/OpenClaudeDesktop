// The app's own windows letting the screen-wide pointer through, and input bursts (click-through.cjs: official
// executor NG / yPr / _Pr / vPr / TPr / gPr, muI2IV6k@4016600–4019000; spec §1.1 computer_batch). Fake windows and a
// fake clock: nothing real is toggled.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClickThrough, withInputBurst, BURST_ACTIONS, SETTLE_MS, IDLE_MS, RUNNING_MS } = require('../electron/computer-use/click-through.cjs');

function clock() {
  let t = 1000;
  const timers = new Map();
  let next = 1;
  const fire = () => {
    for (;;) {
      const due = [...timers].filter(([, x]) => x.at <= t).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) return;
      timers.delete(due[0]);
      due[1].fn();
    }
  };
  return {
    now: () => t,
    sleeps: [],
    async sleep(ms) { this.sleeps.push(ms); t += ms; fire(); },
    setTimer(fn, ms) { const id = next++; timers.set(id, { fn, at: t + ms }); return id; },
    clearTimer(id) { timers.delete(id); },
    advance(ms) { t += ms; fire(); },
    pending: () => timers.size,
  };
}

function win(id, bounds, { visible = true, minimized = false } = {}) {
  return {
    id, through: false, log: [], destroyed: false,
    isDestroyed() { return this.destroyed; }, isVisible: () => visible, isMinimized: () => minimized,
    getBounds: () => ({ ...bounds }),
    setIgnoreMouseEvents(on) { this.through = on; this.log.push(on); },
  };
}

function setup({ windows, cursor = { x: 5000, y: 5000 }, alwaysThrough = () => false, restorer = () => undefined } = {}) {
  const c = clock();
  const ct = createClickThrough({ windows: () => windows, getCursor: () => cursor, alwaysThrough, restorer,
    now: c.now, sleep: (ms) => c.sleep(ms), setTimer: (fn, ms) => c.setTimer(fn, ms), clearTimer: (id) => c.clearTimer(id), log: { warn() {} } });
  return { ct, c };
}

test('a window near the action point: all of the app\'s windows let it through, the first time with a 50 ms settle; handed back after', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const other = win(2, { x: 2000, y: 0, width: 400, height: 300 });
  const { ct, c } = setup({ windows: [main, other] });
  let during;
  await ct.around([{ x: 810, y: 100 }], async () => { during = [main.through, other.through]; });
  assert.deepEqual(during, [true, true], 'within 16 px of the main window: every window is through while it runs');
  assert.deepEqual(c.sleeps, [SETTLE_MS]);
  assert.deepEqual([main.through, other.through], [false, false], 'handed back');
});

test('nothing of ours near the point (or the cursor): nothing visible is toggled and there is no wait; a hidden window is kept through for the action', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const hidden = win(2, { x: 0, y: 0, width: 800, height: 600 }, { visible: false });
  const { ct, c } = setup({ windows: [main, hidden] });
  let during;
  await ct.around([{ x: 1200, y: 900 }], async () => { during = [main.through, hidden.through]; });
  assert.deepEqual(during, [false, true]);
  assert.deepEqual(c.sleeps, []);
  assert.equal(hidden.through, false);
  // The cursor counts as one of the points (official: mouseCoordinatesMatchWindowBoundsCoordinates on macOS).
  const near = setup({ windows: [main], cursor: { x: 10, y: 10 } });
  await near.ct.around([{ x: 1200, y: 900 }], async () => { assert.equal(main.through, true); });
});

test('always-through windows (the glow, the web pointer) are never handed back; a window with a restorer (the teach overlay) runs it', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const glow = win(2, { x: 0, y: 0, width: 1470, height: 956 });
  glow.through = true;
  const teach = win(3, { x: 0, y: 0, width: 1470, height: 956 });
  let restored = 0;
  const { ct } = setup({ windows: [main, glow, teach], alwaysThrough: (w) => w === glow, restorer: (w) => (w === teach ? () => { restored += 1; } : undefined) });
  await ct.around([{ x: 10, y: 10 }], async () => {});
  assert.equal(glow.through, true, 'the glow stays click-through');
  assert.equal(glow.log.includes(false), false);
  assert.equal(restored, 1, 'the teach overlay hands itself back its own way');
  assert.equal(teach.log.includes(false), false);
  assert.equal(main.through, false);
});

test('an input burst keeps the windows through between its pointer actions (one 50 ms settle) and hands them back when it ends', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const { ct, c } = setup({ windows: [main] });
  const end = ct.beginInputBurst();
  assert.equal(ct.inBurst(), true);
  await ct.around([{ x: 10, y: 10 }], async () => {});
  assert.equal(main.through, true, 'kept through after the first action');
  await ct.around([{ x: 20, y: 20 }], async () => {});
  await ct.around([{ x: 30, y: 30 }], async () => {});
  assert.deepEqual(c.sleeps, [SETTLE_MS], 'only the first action waited');
  assert.equal(main.log.filter((on) => on === false).length, 0, 'no flicker between the actions');
  end();
  assert.equal(main.through, false);
  assert.equal(ct.inBurst(), false);
  end();   // a second end is harmless
  // A restorer window is still handed back after every action inside a burst.
  const teach = win(2, { x: 0, y: 0, width: 800, height: 600 });
  let restored = 0;
  const t = setup({ windows: [teach], restorer: () => () => { restored += 1; } });
  const stop = t.ct.beginInputBurst();
  await t.ct.around([{ x: 1, y: 1 }], async () => {});
  await t.ct.around([{ x: 1, y: 1 }], async () => {});
  assert.equal(restored, 2);
  stop();
});

test('a burst ends by itself 1 s after its last pointer action (5 s while one runs); a new burst ends the old one', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const { ct, c } = setup({ windows: [main] });
  ct.beginInputBurst();
  await ct.around([{ x: 10, y: 10 }], async () => {});
  c.advance(IDLE_MS - 1);
  assert.equal(main.through, true);
  c.advance(1);
  assert.equal(main.through, false, 'idle for 1 s: handed back');
  assert.equal(ct.inBurst(), false);
  // While an action runs the burst lives 5 s.
  ct.beginInputBurst();
  await ct.around([{ x: 10, y: 10 }], async () => { c.advance(IDLE_MS + 500); assert.equal(ct.inBurst(), true); });
  // A new burst first ends the open one.
  ct.beginInputBurst();
  assert.equal(main.through, false);
  ct.endAll();
});

test('an action presumed hung after 5 s hands its windows back; a running action\'s windows are not handed back by a burst ending', async () => {
  const main = win(1, { x: 0, y: 0, width: 800, height: 600 });
  const { ct, c } = setup({ windows: [main] });
  let release;
  const hang = ct.around([{ x: 10, y: 10 }], () => new Promise((resolve) => { release = resolve; }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(main.through, true);
  c.advance(RUNNING_MS);
  assert.equal(main.through, false, 'the safety net handed the window back');
  release();
  await hang;
  // A burst ending while another action still holds the window leaves it through until that action finishes.
  let finish;
  const third = setup({ windows: [main] });
  const stop = third.ct.beginInputBurst();
  const running = third.ct.around([{ x: 10, y: 10 }], () => new Promise((resolve) => { finish = resolve; }));
  await new Promise((resolve) => setImmediate(resolve));
  stop();
  assert.equal(main.through, true, 'held by the running action');
  finish();
  await running;
  assert.equal(main.through, false);
});

test('withInputBurst (official Gi()): a pointer action opens a burst, consecutive pointer actions share it, anything else closes it; always closed at the end', async () => {
  assert.deepEqual([...BURST_ACTIONS].sort(), ['double_click', 'left_click', 'left_click_drag', 'left_mouse_down', 'left_mouse_up', 'middle_click', 'mouse_move', 'right_click', 'scroll', 'triple_click']);
  const events = [];
  const begin = () => { events.push('begin'); return () => events.push('end'); };
  await withInputBurst(begin, async (burst) => {
    for (const action of ['mouse_move', 'left_click', 'scroll', 'key', 'screenshot', 'left_click_drag', 'wait', 'type', 'right_click']) {
      burst.beforeAction(action);
      events.push(action);
    }
  });
  assert.deepEqual(events, ['begin', 'mouse_move', 'left_click', 'scroll', 'end', 'key', 'screenshot', 'begin', 'left_click_drag', 'end', 'wait', 'type', 'begin', 'right_click', 'end']);
  // A body that throws still closes the burst.
  const thrown = [];
  await assert.rejects(withInputBurst(() => () => thrown.push('end'), async (burst) => { burst.beforeAction('left_click'); throw new Error('x'); }));
  assert.deepEqual(thrown, ['end']);
});
