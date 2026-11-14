// R4i-small SM1 (cov0-05): "Claude kept your computer awake" — official 2.42304.0 source pins, the main-process
// tracker (keep-awake-notice.cjs), the session rule in desktop-settings.cjs, the renderer model and the wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const reference = fileURLToPath(new URL('../../reference/installed-2.42304.0-20261017/', import.meta.url));
const read = (file) => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const once = (text, needles, label) => { for (const needle of needles) assert.equal(count(text, needle), 1, `${label}: ${needle}`); };

const { createKeepAwakeNotice, KEPT_AWAKE_MIN_HELD_MS, KEPT_AWAKE_MIN_AWAY_MS, SAMPLE_INTERVAL_MS, KEEP_AWAKE_NOTICE_GATE } = require('../electron/keep-awake-notice.cjs');
const { createDesktopSettings } = require('../electron/desktop-settings.cjs');
// W14-code r6 sleep lane: the renderer band is the sliced 3.6556.2 cf74bc599 dO (generated/session-rail/sleep-band.mjs:
// lO copy, uO duration, pO card props, the visibility rule K) over the c73f45bc3 k_ card; the host's model keeps only the
// window store (tests/w14-r6-sleep.test.mjs drives the sliced band).
const { createKeptAwakeStore, keptAwakeStore, subscribeSendBegun } = await import('../src/kept-awake-model.mjs');
const KEPT_AWAKE_COPY = ['Claude kept your computer awake for {duration}.', 'This lets long tasks finish. Your computer can sleep as usual now.', 'Only when plugged in', 'Don’t keep awake'];

const MIN = 6e4;

test('cov0-05 official: main muI2IV6k thresholds, gate, notice log and session-side noteKeptAwake; renderer cf74bc599 band', async () => {
  const main = read(`${reference}asar/.vite/build/index.chunk-muI2IV6k.js`);
  once(main, ['Bvr=6e4,Vvr=6e5,Hvr=6e5,Uvr="1781903805";function GU(){return NU()&&gy(Uvr,!0)}',
    'n>=Vvr&&s.maxAwayMs>=Hvr&&(d={sessionId:e,heldMs:n,awayMs:Math.round(s.maxAwayMs)})',
    'let i=(t==="idle"||t==="armed_grace")&&!p&&!wvr()?d:void 0',
    '[keep-awake] stayed-awake notice requested (turn held %dms, longest stretch with no keyboard or mouse input %dms)',
    'e.noteKeptAwake(i.sessionId,i.heldMs)',
    'function ad(){return oKe.read(a.powerMonitor.getSystemIdleTime(),performance.now())}',
    'r.maxAwayMs=Math.max(r.maxAwayMs,Math.min(e,n-h(r,o)))'], 'muI2IV6k');
  assert.deepEqual([KEPT_AWAKE_MIN_HELD_MS, KEPT_AWAKE_MIN_AWAY_MS, SAMPLE_INTERVAL_MS, KEEP_AWAKE_NOTICE_GATE], [6e5, 6e5, 6e4, '1781903805']);
  const sessions = read(`${reference}asar/.vite/build/index.chunk-CFJssAFf.js`);
  once(sessions, ['noteKeptAwake(e,t){let n=this.sessions.get(e);!n||n.isArchived||n.sleepInterruption||n.error!==void 0||n.errorCategory!==void 0||n.isRunning||(n.keptAwake={heldMs:t,endedAt:Date.now()},this.emitSessionUpdated(n))}'], 'CFJssAFf');
  const band = read(`${reference}ion-dist/assets/v1/cf74bc599-D9NZWRyl.js`);
  once(band, ['ZC="epitaxy-keep-awake-band-used"', 'keptAwake:{defaultMessage:"Claude kept your computer awake for {duration}.",id:"o4fhLORTcB"}',
    'canSleepNow:{defaultMessage:"This lets long tasks finish. Your computer can sleep as usual now.",id:"leA6hDdNhw"}',
    'onlyPluggedIn:{defaultMessage:"Only when plugged in",id:"RcWyvP8gI5"}', 'dontKeepAwake:{defaultMessage:"Don\\u2019t keep awake",id:"6/uGp8JWcE"}',
    'function ew(e,t){let n=Math.max(1,Math.round(t/6e4));return ht(e,{hours:Math.floor(n/60),minutes:n%60},{unitDisplay:"short",listType:"unit",listStyle:"narrow"})}',
    'qC=!1', 'icon:"CoffeeCup",message:u(X,{...$C.keptAwake'], 'cf74bc599');
  const sliced = read(`${root}src/generated/session-rail/sleep-band.mjs`);
  // W14-code r6 gen-final-6: the band-used key is the slice's own (sO, cf74bc599 ZC); the host's unused copy is gone.
  assert.ok(sliced.includes('var sO = "epitaxy-keep-awake-band-used";'));
  assert.equal((await import('../src/kept-awake-model.mjs')).KEEP_AWAKE_BAND_USED_KEY, undefined);
  for (const copy of KEPT_AWAKE_COPY) assert.ok(sliced.includes(JSON.stringify(copy).replace('’', '\\u2019')) || sliced.includes(JSON.stringify(copy)), copy);
});

function tracker({ idle = () => 0 } = {}) {
  let clock = 0; const notices = [], logs = [];
  const service = createKeepAwakeNotice({ now: () => clock, systemIdleMs: () => idle(clock), onNotice: (id, heldMs) => notices.push([id, heldMs]), log: (...args) => logs.push(args), setInterval: () => 1, clearInterval: () => {} });
  return { service, notices, logs, advance: (ms) => { clock += ms; }, at: () => clock };
}

test('cov0-05 tracker: a turn held ≥10 min with the user away ≥10 min notes the session on an idle release', () => {
  // The user stops touching the machine at t=1 min; the idle reading grows from then on.
  const f = tracker({ idle: (now) => Math.max(0, now - MIN) });
  f.service.held(); f.service.turnStarted('s');
  f.advance(12 * MIN); f.service.sample();
  f.service.turnEnded('s', 'completed');
  assert.deepEqual(f.service.pending(), { sessionId: 's', heldMs: 12 * MIN, awayMs: 11 * MIN });
  f.service.released('idle');
  assert.deepEqual(f.notices, [['s', 12 * MIN]]);
  assert.ok(f.logs.some((args) => String(args[0]).includes('stayed-awake notice requested')));
});

test('cov0-05 tracker: short holds, an attended machine, battery or setting releases, sleep and other holds give no notice', () => {
  const cases = [
    ['held 9 min', (f) => { f.advance(9 * MIN); }, 'idle', {}],
    ['user present', (f) => { f.advance(20 * MIN); }, 'idle', {}, () => 5 * MIN],
    ['battery', (f) => { f.advance(20 * MIN); }, 'battery', {}],
    ['setting off', (f) => { f.advance(20 * MIN); }, 'setting_off', {}],
    ['slept', (f) => { f.advance(20 * MIN); f.service.suspended(); }, 'idle', {}],
    ['other hold', (f) => { f.advance(20 * MIN); }, 'idle', { otherHold: true }],
  ];
  for (const [label, run, reason, options, idle] of cases) {
    const f = tracker({ idle: idle ?? ((now) => now) });
    f.service.held(); f.service.turnStarted('s'); run(f); f.service.turnEnded('s', 'completed'); f.service.released(reason, options);
    assert.deepEqual(f.notices, [], label);
  }
  // The away time counts only from when the hold was taken (min(idle, now - max(countingSince, holdTakenAt))).
  const late = tracker({ idle: () => 60 * MIN });
  late.service.turnStarted('s'); late.advance(30 * MIN); late.service.held(); late.advance(5 * MIN); late.service.turnEnded('s', 'completed'); late.service.released('idle');
  assert.deepEqual(late.notices, []);
});

test('cov0-05 tracker: a new turn of the noted session or its going away drops the pending notice', () => {
  const f = tracker({ idle: (now) => now });
  f.service.held(); f.service.turnStarted('s'); f.service.turnStarted('o'); f.advance(15 * MIN);
  f.service.turnEnded('s', 'completed'); assert.equal(f.service.pending().sessionId, 's');
  f.service.turnStarted('s'); assert.equal(f.service.pending(), undefined);
  f.advance(15 * MIN); f.service.turnEnded('s', 'completed'); f.service.turnEnded('o', 'gone');
  assert.equal(f.service.pending().sessionId, 's');
  f.service.turnEnded('s', 'gone'); assert.equal(f.service.pending(), undefined);
});

function settings({ config: extra = {}, idle = (now) => now } = {}) {
  let clock = 0, battery = false;
  const config = { threadIds: ['t', 'u'], archivedThreadIds: [], keepAwake: true, completeNotifications: 'off', notificationSound: 'none', ...extra };
  const events = [], power = [], pm = new EventEmitter(), window = new EventEmitter();
  pm.isOnBatteryPower = () => battery; window.isFocused = () => true;
  class Notice extends EventEmitter { static isSupported() { return false; } }
  const service = createDesktopSettings({ app: { dock: { setBadge() {}, bounce() {} }, getLoginItemSettings: () => ({ openAtLogin: false }) }, powerMonitor: pm,
    powerSaveBlocker: { start: () => (power.push('start'), 7), stop: () => power.push('stop') }, Notification: Notice, getConfig: () => config, getClient: () => null,
    sessionOperations: { assertAvailable() {}, reserveMessage: () => () => {} }, save() {}, emit: (event) => events.push(event), getWindow: () => window, gitStatus: async () => ({}),
    systemIdleMs: () => idle(clock), keepAwakeClock: () => clock, keepAwakeTimers: { setInterval: () => 1, clearInterval() {} }, keepAwakeLog() {} });
  service.start();
  const turn = (method, id, threadId = 't', status = 'completed') => service.observe({ method, params: { threadId, turn: { id, status } } });
  return { service, config, events, power, pm, turn, advance: (ms) => { clock += ms; }, battery: (value) => { battery = value; pm.emit('on-battery'); },
    kept: () => events.filter((event) => event.kind === 'desktop-kept-awake') };
}

test('cov0-05 desktop-settings: a finished long unattended turn sends keptAwake {heldMs, endedAt}; the next turn clears it', () => {
  const f = settings();
  f.turn('turn/started', 'a'); f.advance(11 * MIN); f.turn('turn/completed', 'a');
  assert.deepEqual(f.power, ['start', 'stop']);
  const [event] = f.kept();
  assert.equal(event.threadId, 't'); assert.equal(event.keptAwake.heldMs, 11 * MIN); assert.ok(Number.isFinite(event.keptAwake.endedAt));
  assert.deepEqual(f.service.keptAwake('t'), event.keptAwake);
  f.turn('turn/started', 'b');
  assert.deepEqual(f.kept().at(-1), { kind: 'desktop-kept-awake', threadId: 't', keptAwake: null });
  assert.equal(f.service.keptAwake('t'), null);
  f.service.dispose();
});

test('cov0-05 desktop-settings: archived, failed or still-running sessions, battery releases and a session hold give no notice', () => {
  const failed = settings(); failed.turn('turn/started', 'a'); failed.advance(11 * MIN); failed.turn('turn/completed', 'a', 't', 'failed');
  assert.deepEqual(failed.kept(), [], 'failed');
  const archived = settings(); archived.turn('turn/started', 'a'); archived.advance(11 * MIN); archived.config.threadIds = ['u']; archived.turn('turn/completed', 'a');
  assert.deepEqual(archived.kept(), [], 'archived');
  const attended = settings({ idle: () => 0 }); attended.turn('turn/started', 'a'); attended.advance(30 * MIN); attended.turn('turn/completed', 'a');
  assert.deepEqual(attended.kept(), [], 'attended');
  const battery = settings({ config: { keepAwakeOnBattery: false } }); battery.turn('turn/started', 'a'); battery.advance(11 * MIN); battery.battery(true); battery.turn('turn/completed', 'a');
  assert.deepEqual(battery.kept(), [], 'battery');
  // Another session still running keeps the hold: the notice waits for the release, then goes to the finished session.
  const two = settings(); two.turn('turn/started', 'a'); two.turn('turn/started', 'b', 'u'); two.advance(11 * MIN); two.turn('turn/completed', 'a');
  assert.deepEqual(two.kept(), []); two.advance(MIN); two.turn('turn/completed', 'b', 'u');
  assert.deepEqual(two.kept().map((event) => event.threadId), ['u']);
  // A session's own 'Keep computer awake' (sessionMetadata keepAwake) is the other hold: no notice while it runs.
  const manual = settings({ config: { sessionMetadata: { u: { keepAwake: true } } } });
  manual.turn('turn/started', 'a'); manual.turn('turn/started', 'b', 'u'); manual.advance(11 * MIN); manual.config.keepAwake = false; manual.service.power(); manual.turn('turn/completed', 'a');
  assert.deepEqual(manual.kept(), [], 'setting off while a session hold runs');
  // A suspend while held counts as slept.
  const slept = settings(); slept.turn('turn/started', 'a'); slept.advance(11 * MIN); slept.pm.emit('suspend'); slept.turn('turn/completed', 'a');
  assert.deepEqual(slept.kept(), [], 'slept');
});

test('cov0-05 renderer store: the window\'s keptAwake copy; a turn start clears it and tells the send-begun listeners (c06cf64bb IE)', () => {
  const keptAwake = { heldMs: 72 * MIN, endedAt: 1000 };
  const store = createKeptAwakeStore(); let changes = 0; store.subscribe(() => changes++);
  store.observe({ kind: 'desktop-kept-awake', threadId: 't', keptAwake });
  assert.deepEqual(store.get('t'), keptAwake);
  store.observe({ method: 'turn/started', params: { threadId: 'x' } });
  store.observe({ method: 'turn/started', params: { threadId: 't' } });
  assert.equal(store.get('t'), null); assert.equal(changes, 2);
  store.observe({ kind: 'desktop-kept-awake', threadId: 't', keptAwake: null }); assert.equal(changes, 2);
  // The window's store: dO's kh(h, de) hears the session's sends (uuid, synthetic) — here its turn starts.
  const heard = [];
  const stop = subscribeSendBegun('w', (uuid, synthetic) => heard.push([uuid, synthetic]));
  keptAwakeStore.observe({ method: 'turn/started', params: { threadId: 'other' } });
  keptAwakeStore.observe({ method: 'turn/started', params: { threadId: 'w' } });
  stop(); keptAwakeStore.observe({ method: 'turn/started', params: { threadId: 'w' } });
  assert.deepEqual(heard, [[undefined, false]]);
});

test('cov0-05 wiring: main.jsx feeds the store and mounts the sliced bands with the notice stack; zh-CN carries the copy', async () => {
  const main = read(`${root}src/main.jsx`);
  once(main, ['import { keptAwakeStore, sleepInterruptionStore } from "./kept-awake-model.mjs";', '      keptAwakeStore.observe(e);',
    'import { SourceCodeNoticeRegion, SourceSessionBands, SourceTailSessionNotice, useInlineBandNotices, useInlineBandSink, useSessionBandsScopeStore, useTailSessionNotice } from "./source-sleep-notice.jsx";',
    // r6 sleep review fix: the region (cc43287c9 Ide) is Code's only; Chat / Cowork keep the host stack (w14-r6-sleep).
    // W14-code r7 notices (E81): and only under __gb__100087145 / the rollback switch (w14-r7-notices); otherwise the bands
    // draw inline (c227f4d5e oL) before the stack.
    '<SourceCodeNoticeRegion session={current || null}>{bands}{stack}{approveOnce}</SourceCodeNoticeRegion>'], 'main.jsx');
  assert.match(main, /<SourceSessionBands key=\{`\$\{current\}:bands`\} sessionId=\{current\} scopeStore=\{bandsScope\}/);
  assert.equal(fs.existsSync(`${root}src/source-kept-awake-notice.jsx`), false, 'the host hook is gone with the slice');
  // The band list itself names no host keptAwake entry: the band is a slot registration (c227f4d5e "keptAwake").
  assert.equal(count(read(`${root}src/source-session-notices.jsx`), 'keptAwake'), 0);
  const { default: zh } = await import('../electron/i18n/zh-CN/session.mjs');
  for (const message of KEPT_AWAKE_COPY) assert.equal(typeof zh[message], 'string', message);
  // E83: the band names the running assistant (useBandIntl keys "Claude" as "DeepSeek").
  assert.equal(typeof zh['DeepSeek kept your computer awake for {duration}.'], 'string');
});
