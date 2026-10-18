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
const { KEEP_AWAKE_BAND_USED_KEY, KEPT_AWAKE_MESSAGES, keptAwakeDuration, keptAwakeShownFor, keptAwakeNotice, createKeptAwakeStore } = await import('../src/kept-awake-model.mjs');

const MIN = 6e4;

test('cov0-05 official: main muI2IV6k thresholds, gate, notice log and session-side noteKeptAwake; renderer cf74bc599 band', () => {
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
  assert.equal(KEEP_AWAKE_BAND_USED_KEY, 'epitaxy-keep-awake-band-used');
  assert.equal(KEPT_AWAKE_MESSAGES.dontKeepAwake.defaultMessage, 'Don’t keep awake');
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

test('cov0-05 renderer model: ew duration, the W visibility rule, nw actions and the window store', () => {
  assert.equal(keptAwakeDuration(72 * MIN, 'en-US'), '1 hr 12 min');
  assert.equal(keptAwakeDuration(10 * MIN, 'en-US'), '10 min');
  assert.equal(keptAwakeDuration(1000, 'en-US'), '1 min');
  assert.equal(keptAwakeDuration(120 * MIN, 'en-US'), '2 hr');
  const keptAwake = { heldMs: 72 * MIN, endedAt: 1000 };
  assert.equal(keptAwakeShownFor({ keptAwake }), 1000);
  for (const blocked of [{ running: true }, { archived: true }, { whileWorking: false }, { bandUsed: true }, { dismissedEndedAt: 1000 }, { keptAwake: null }])
    assert.equal(keptAwakeShownFor({ keptAwake, ...blocked }), null, JSON.stringify(blocked));
  const runs = [];
  const notice = keptAwakeNotice({ keptAwake, shownFor: 1000, onBattery: true, locale: 'en-US', onBatteryOff: () => runs.push('battery'), onTurnOff: () => runs.push('off'), onDismiss: () => runs.push('dismiss') });
  assert.equal(notice.summary, 'Claude kept your computer awake for 1 hr 12 min.');
  assert.equal(notice.details, 'This lets long tasks finish. Your computer can sleep as usual now.');
  assert.equal(notice.icon, 'CoffeeCup'); assert.equal(notice.dismissKey, 'kept-awake:1000');
  assert.deepEqual(notice.actions.map((action) => action.label), ['Only when plugged in', 'Don’t keep awake']);
  notice.actions.forEach((action) => action.run()); notice.onDismiss();
  assert.deepEqual(runs, ['battery', 'off', 'dismiss']);
  assert.deepEqual(keptAwakeNotice({ keptAwake, shownFor: 1000, onBattery: false, onBatteryOff() {}, onTurnOff() {} }).actions.map((action) => action.label), ['Don’t keep awake']);
  assert.equal(keptAwakeNotice({ keptAwake, shownFor: null }), null);
  const store = createKeptAwakeStore(); let changes = 0; store.subscribe(() => changes++);
  store.observe({ kind: 'desktop-kept-awake', threadId: 't', keptAwake });
  assert.deepEqual(store.get('t'), keptAwake);
  store.observe({ method: 'turn/started', params: { threadId: 'x' } });
  store.observe({ method: 'turn/started', params: { threadId: 't' } });
  assert.equal(store.get('t'), null); assert.equal(changes, 2);
  store.observe({ kind: 'desktop-kept-awake', threadId: 't', keptAwake: null }); assert.equal(changes, 2);
});

test('cov0-05 wiring: main.jsx feeds the store and lists the band among SourceSessionNotices; zh-CN carries the copy', async () => {
  const main = read(`${root}src/main.jsx`);
  once(main, ['import { keptAwakeStore } from "./kept-awake-model.mjs";', 'import { useKeptAwakeNotice } from "./source-kept-awake-notice.jsx";',
    '      keptAwakeStore.observe(e);', 'const keptAwakeNotice = useKeptAwakeNotice({ sessionId: current, running, archived: session?.archived === true, config: boot?.config,',
    '...(keptAwakeNotice ? [keptAwakeNotice] : []),'], 'main.jsx');
  const hook = read(`${root}src/source-kept-awake-notice.jsx`);
  once(hook, ['usePersistedValue(KEEP_AWAKE_BAND_USED_KEY, false) === true', 'save({ keepAwakeOnBattery: false }); use(shownFor);', 'save({ keepAwake: false }); use(shownFor);'], 'source-kept-awake-notice.jsx');
  // cov2-03 still holds: the band list itself names no slot.
  assert.equal(count(read(`${root}src/source-session-notices.jsx`), 'keptAwake'), 0);
  const { default: zh } = await import('../electron/i18n/zh-CN/session.mjs');
  for (const message of Object.values(KEPT_AWAKE_MESSAGES)) assert.equal(typeof zh[message.defaultMessage], 'string', message.defaultMessage);
});

test('cov0-05 hook under Vite SSR: the band shows for the composer session, then not once the band was used', async () => {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const storage = new Map();
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) } });
  try {
    const model = await server.ssrLoadModule('/src/kept-awake-model.mjs');
    const { useKeptAwakeNotice } = await server.ssrLoadModule('/src/source-kept-awake-notice.jsx');
    const { SourceSessionNotices } = await server.ssrLoadModule('/src/source-session-notices.jsx');
    model.keptAwakeStore.observe({ kind: 'desktop-kept-awake', threadId: 's1', keptAwake: { heldMs: 25 * MIN, endedAt: 5 } });
    let captured = null;
    function Probe(props) { const notice = useKeptAwakeNotice(props); captured = notice; return React.createElement(SourceSessionNotices, { notices: notice ? [notice] : [] }); }
    const html = renderToStaticMarkup(React.createElement(Probe, { sessionId: 's1', config: {}, saveSettings() {} }));
    assert.match(html, /Claude kept your computer awake for 25 min\./);
    assert.match(html, /data-kind="keptAwake"/);
    assert.match(html, />Only when plugged in</); assert.match(html, />Don’t keep awake</);
    assert.equal(renderToStaticMarkup(React.createElement(Probe, { sessionId: 's1', running: true, config: {} })), '');
    assert.equal(renderToStaticMarkup(React.createElement(Probe, { sessionId: 's2', config: {} })), '');
    assert.equal(renderToStaticMarkup(React.createElement(Probe, { sessionId: 's1', config: { keepAwake: false } })), '');
    const patches = [];
    renderToStaticMarkup(React.createElement(Probe, { sessionId: 's1', config: { keepAwakeOnBattery: false }, saveSettings: (p) => patches.push(p) }));
    assert.deepEqual(captured.actions.map((a) => a.label), ['Don’t keep awake']);
    renderToStaticMarkup(React.createElement(Probe, { sessionId: 's1', config: {}, saveSettings: (p) => patches.push(p) }));
    captured.actions[0].run();
    assert.deepEqual(patches, [{ keepAwakeOnBattery: false }]);
    assert.equal(storage.get(`persisted.${model.KEEP_AWAKE_BAND_USED_KEY}`), 'true');
    // usePersistedValue's server snapshot is its fallback, so the used flag is read back through the same store.
    const { readPersistedValue } = await server.ssrLoadModule('/src/source-files-changes-adapters.jsx');
    const bandUsed = readPersistedValue(model.KEEP_AWAKE_BAND_USED_KEY, false) === true;
    assert.equal(bandUsed, true);
    assert.equal(model.keptAwakeShownFor({ keptAwake: model.keptAwakeStore.get('s1'), bandUsed }), null);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved); else delete globalThis.localStorage;
    await server.close();
  }
});
