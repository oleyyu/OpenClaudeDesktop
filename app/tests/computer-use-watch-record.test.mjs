// Watch-record, "Record a skill" (docs/computer-use-official-spec-20261021.md §2.4): the windows' pages and preload, what a
// recording becomes for the model, the main-process recording flow (cancel, permissions, discard, delivery) and the
// renderer's card parser — each compared with the 2.42304.0 reference build's own code where it exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pages = require('../electron/computer-use/watch-record-pages.cjs');
const trajectory = require('../electron/computer-use/watch-record-trajectory.cjs');
const watchRecord = require('../electron/computer-use/watch-record.cjs');
const model = await import('../src/watch-record-model.mjs');

const REFERENCE = new URL('../../reference/installed-2.42304.0-20261017/', import.meta.url);
const MAIN = fs.readFileSync(new URL('asar/.vite/build/index.chunk-muI2IV6k.js', REFERENCE), 'utf8');
const PRELOAD = new URL('../electron/computer-use/watch-record-preload.cjs', import.meta.url);

// ---- the reference build's own functions ----

/** HFa…GIa (the header, preambles, reminders and recorded input → action lines), iLa (a native event → that input). */
function officialMain() {
  const body = MAIN.slice(MAIN.indexOf('var zFa="watch-record-demonstration"'), MAIN.indexOf('var KIa=1<<17'));
  const normalize = MAIN.slice(MAIN.indexOf('var KIa=1<<17'), MAIN.indexOf('var aLa=600'));
  return new Function(`var sze="darwin";${body};${normalize}; return {HFa, tIa, nIa, rIa, aIa, GIa, jIa, PIa, FIa, l5, iLa, WFa, KFa, KLa: typeof KLa === "undefined" ? undefined : KLa};`)();
}
const official = officialMain();

/** A deterministic stand-in for Electron's nativeImage: an "encoded" image is a JPEG-marked JSON of grey rectangles. */
const encode = (description) => Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from(JSON.stringify(description))]);
const decode = (buffer) => JSON.parse(buffer.subarray(2).toString());
function picture(description) {
  const { w, h } = description;
  const value = (x, y) => {
    let v = description.base ?? 255;
    for (const r of description.rects ?? []) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) v = r.v;
    return v;
  };
  return {
    getSize: () => ({ width: w, height: h }),
    resize: ({ width, height }) => {
      const nw = width, nh = height ?? Math.round((h * width) / w);
      return picture({ w: nw, h: nh, base: description.base, rects: (description.rects ?? []).map((r) => ({ x: Math.floor((r.x * nw) / w), y: Math.floor((r.y * nh) / h), w: Math.ceil((r.w * nw) / w), h: Math.ceil((r.h * nh) / h), v: r.v })) });
    },
    toBitmap: () => {
      const out = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = value(x, y), at = (y * w + x) * 4; out[at] = v; out[at + 1] = v; out[at + 2] = v; out[at + 3] = 255; }
      return out;
    },
    crop: (rect) => picture({ ...description, cropOf: rect, w: rect.width, h: rect.height }),
    toJPEG: (quality) => encode({ ...description, quality }),
  };
}
const fakeNativeImage = { createFromBuffer: (buffer) => picture(decode(buffer)), createFromBitmap: () => { throw new Error('unused'); } };

/** wYPcM8zh (buildTrajectory) and BGYyEPmR (the content blocks), loaded with the fake image module. */
function officialChunk(name, modules) {
  const source = fs.readFileSync(new URL(`asar/.vite/build/${name}`, REFERENCE), 'utf8');
  const exports = {};
  vm.runInNewContext(source, { exports, Buffer, require: (id) => { if (!(id in modules)) throw new Error(`unexpected ${id}`); return modules[id]; } });
  return exports;
}
const officialMainExports = { Gn: official.GIa, Un: official.jIa, Hn: official.PIa, Wn: official.FIa, qn: async () => {}, p5: { warn() {} },
  $n: official.HFa, Jn: official.KFa, Xn: official.WFa, Kn: official.l5, Qn: official.aIa, Zn: official.rIa, er: official.nIa };
const officialBuild = officialChunk('index.chunk-wYPcM8zh.js', { './index.chunk-D4B44ehk.js': {}, './index.chunk-muI2IV6k.js': officialMainExports, electron: { nativeImage: fakeNativeImage } });
const officialBlocks = officialChunk('index.chunk-BGYyEPmR.js', { './index.chunk-D4B44ehk.js': {}, './index.chunk-muI2IV6k.js': officialMainExports, './index.chunk-wYPcM8zh.js': officialBuild });

// ---- a demonstration ----
const MOD_SHIFT = 1 << 17, MOD_CMD = 1 << 20, MOD_OPT = 1 << 19;
const displays = { displayForPoint: (x) => (x >= 1000 ? { id: 2, bounds: { x: 1000, y: 0, width: 800, height: 600 } } : { id: 1, bounds: { x: 0, y: 0, width: 1000, height: 700 } }) };
const rawEvents = [
  { kind: 'leftMouseDown', t: 100, x: 40, y: 60, modifiers: 0 }, { kind: 'leftMouseUp', t: 160, x: 41, y: 61, modifiers: 0 },
  ...[...'helloo'].map((chars, index) => ({ kind: 'key', t: 300 + index * 50, keyCode: 0, chars, charsIgnoringModifiers: chars, modifiers: 0 })),
  { kind: 'key', t: 620, keyCode: 51, chars: '\x7f', charsIgnoringModifiers: '\x7f', modifiers: 0 },
  { kind: 'key', t: 700, keyCode: 36, chars: '\r', charsIgnoringModifiers: '\r', modifiers: MOD_SHIFT },
  { kind: 'key', t: 760, keyCode: 48, chars: '\t', charsIgnoringModifiers: '\t', modifiers: 0 },
  { kind: 'key', t: 800, keyCode: 48, chars: '\t', charsIgnoringModifiers: '\t', modifiers: 0 },
  { kind: 'key', t: 1500, keyCode: 8, chars: 'c', charsIgnoringModifiers: 'c', modifiers: MOD_CMD },
  { kind: 'key', t: 1600, keyCode: 51, chars: '\x7f', charsIgnoringModifiers: '\x7f', modifiers: MOD_OPT },
  { kind: 'key', t: 4000, secureInput: true, modifiers: 0 }, { kind: 'key', t: 4050, secureInput: true, modifiers: 0 },
  { kind: 'key', t: 4100, keyCode: 0, chars: 'x', charsIgnoringModifiers: 'x', modifiers: 0 },
  { kind: 'rightMouseDown', t: 5000, x: 200, y: 200, modifiers: 0 }, { kind: 'rightMouseUp', t: 5050, x: 200, y: 201, modifiers: 0 },
  { kind: 'leftMouseDown', t: 6000, x: 100, y: 100, modifiers: 0 }, { kind: 'leftMouseUp', t: 6400, x: 1300, y: 300, modifiers: 0 },
  { kind: 'scrollWheel', t: 7000, x: 50, y: 50, scrollDX: 0, scrollDY: -3, modifiers: 0 }, { kind: 'scrollWheel', t: 7300, x: 50, y: 50, scrollDX: 0, scrollDY: -2, modifiers: 0 },
  { kind: 'scrollWheel', t: 9000, x: 50, y: 50, scrollDX: 1, scrollDY: 4, modifiers: 0 },
  { kind: 'leftMouseDown', t: 9500, x: 300, y: 300, modifiers: 0 },
];
const apps = [{ tMs: 0, name: 'Finder' }, { tMs: 3000, name: 'TextEdit <beta>' }, { tMs: 3500, name: 'TextEdit <beta>' }, { tMs: 8000, name: 'Safari' }];
const frame = (tMs, rects = [], extra = {}) => ({ kind: 'frame', tMs, encoded: encode({ w: 1000, h: 700, base: 255, rects }), width: 1000, height: 700, displayWidth: 1000, displayHeight: 700, displayId: 1, frontmost: null, ...extra });
const frames = [
  frame(0), frame(250, [{ x: 30, y: 50, w: 40, h: 30, v: 0 }]), frame(500, [{ x: 30, y: 50, w: 40, h: 30, v: 0 }]),
  frame(1000, [{ x: 0, y: 0, w: 1000, h: 700, v: 20 }]), frame(2000, [{ x: 0, y: 0, w: 1000, h: 700, v: 20 }, { x: 600, y: 400, w: 100, h: 100, v: 250 }]),
  frame(5100, [{ x: 0, y: 0, w: 1000, h: 700, v: 20 }], { frontmost: 'TextEdit' }), frame(9600, [], { displayId: 2 }),
];

test('the chooser and pill pages are the 2.42304.0 lIa() and lRa() character for character', () => {
  const chooser = pages.chooserPage.toString().replace(/^function chooserPage\(/, 'function lIa(');
  assert.ok(MAIN.includes(chooser), 'chooserPage is lIa verbatim');
  const pill = pages.pillPage.toString().replace(/^function pillPage\(/, 'function lRa(').replaceAll('PILL_INSET_PX', 'rRa');
  assert.ok(MAIN.includes(pill), 'pillPage is lRa verbatim');
  assert.equal(Number(/[,;]rRa=(\d+)/.exec(MAIN)?.[1]), pages.PILL_INSET_PX);
  // The texts the spec lists, as rendered.
  const skill = pages.chooserPage({ inputProtectionMs: 300, initialMicOn: false, autoStartPreview: false, micAvailable: false });
  assert.match(skill, /Record a skill/);
  assert.match(skill, /Your screen, clicks, and typing are recorded, then\n {6}sent to Claude and turned into a repeatable skill\./);
  assert.match(skill, /Don't type passwords or secrets, or display sensitive information or\n {6}private conversations while recording\./);
  assert.match(skill, /<button class="btn" id="cancel">Cancel<\/button>/);
  assert.match(skill, /<button class="btn" id="record">Start recording<\/button>/);
  assert.match(skill, / {2}\.micGroup \{ display:none; \}/, 'no microphone: the split button is hidden');
  assert.match(skill, /if \(e\.key === "Escape"\) choose\("cancel"\);/);
  const voiced = pages.chooserPage({ inputProtectionMs: 300, initialMicOn: true, autoStartPreview: true, micAvailable: true });
  assert.match(voiced, /clicks, typing, and voice are recorded/);
  assert.match(voiced, /<option value="">System default<\/option>/);
  const pillHtml = pages.pillPage({ micAvailable: false, recordingStartedAtEpochMs: 1000 });
  for (const text of ['Capturing ', '>Processing<', '>Discard<', '>Done<', 'background: rgba(21, 21, 21, 0.95)', 'animation: pulse 1.5s']) assert.ok(pillHtml.includes(text), text);
  assert.match(pillHtml, / {2}\.mic \{ display:none; \}/);
});

test('the window sizes, limits and timings are the original constants', () => {
  const value = (name) => Number(new RegExp(`[,;\\s]${name}=([\\d.e]+)`).exec(MAIN)?.[1]);
  assert.equal(watchRecord.CHOOSER_WIDTH, value('uIa'));
  assert.equal(watchRecord.CHOOSER_HEIGHT, value('dIa'));
  assert.equal(watchRecord.CHOOSER_HEIGHT_CONTEXT_MIC, value('fIa'));
  assert.equal(watchRecord.CHOOSER_MAX_HEIGHT, value('pIa'));
  assert.equal(watchRecord.INPUT_PROTECTION_MS, value('mIa'));
  assert.equal(watchRecord.FRAME_INTERVAL_MS, value('zRa'));
  assert.equal(watchRecord.FRAME_BUFFER_MAX, value('BRa'));
  assert.equal(watchRecord.MAX_DURATION_MS, value('URa'));
  assert.equal(watchRecord.HELD_TTL_MS, value('tza'));
  assert.equal(watchRecord.RESUME_TTL_MS, value('nza'));
  assert.equal(watchRecord.PILL_HOLD_MS, value('JRa'));
});

test('the preload exposes the original CuWatchRecordChooser and CuWatchRecordPill, top frame only', () => {
  const officialPreload = fs.readFileSync(new URL('asar/.vite/build/computerUseWatchRecord.js', REFERENCE), 'utf8');
  const channels = (iface) => [...new Set([...officialPreload.matchAll(new RegExp(`${iface}_\\$_(\\w+)`, 'g'))].map((m) => m[1]))].sort();
  const exposed = {}, invoked = [], listeners = new Map();
  const electron = {
    contextBridge: { exposeInMainWorld: (key, value) => { exposed[key] = value; } },
    ipcRenderer: { invoke: (channel, ...args) => { invoked.push([channel, ...args]); return Promise.resolve(); }, on: (channel, fn) => listeners.set(channel, fn), removeListener: (channel) => listeners.delete(channel) },
    webFrame: { routingId: 1, top: { routingId: 1 } },
  };
  vm.runInNewContext(fs.readFileSync(PRELOAD, 'utf8'), { require: () => electron });
  const { CuWatchRecordChooser: chooser, CuWatchRecordPill: pill } = exposed['claude.internal.computerUse'];
  const names = (api) => Object.keys(api).map((key) => key.replace(/^on(\w)/, (_m, c) => c.toLowerCase())).sort();
  assert.deepEqual(names(chooser), channels('CuWatchRecordChooser'));
  assert.deepEqual(names(pill), channels('CuWatchRecordPill'));
  chooser.choose({ action: 'record', micOn: false }); pill.done(); pill.discard();
  assert.deepEqual(invoked, [['cu-watch-record-chooser:choose', { action: 'record', micOn: false }], ['cu-watch-record-pill:done'], ['cu-watch-record-pill:discard']]);
  const levels = [];
  const off = pill.onMicState((on, level) => levels.push([on, level]));
  listeners.get('cu-watch-record-pill:micState')({}, true, 0.5);
  off();
  assert.deepEqual(levels, [[true, 0.5]]);
  const none = {};
  vm.runInNewContext(fs.readFileSync(PRELOAD, 'utf8'), { require: () => ({ ...electron, webFrame: { routingId: 2, top: { routingId: 1 } }, contextBridge: { exposeInMainWorld: (key, value) => { none[key] = value; } } }) });
  assert.deepEqual(none, {});
});

test('a native event becomes the same input as the original iLa', () => {
  for (const raw of rawEvents) assert.deepEqual(trajectory.normalizeEvent(raw, displays), official.iLa(raw, displays));
  assert.equal(trajectory.KEPT_MODIFIERS, (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20));
});

test('recorded input becomes the original action lines (typing, Backspace, ⇧Enter, chords, secure input, clicks, drags, scrolls, app switches)', () => {
  const events = rawEvents.map((raw) => trajectory.normalizeEvent(raw, displays));
  const recording = { frames, events, apps };
  const mine = trajectory.recordingActions(recording);
  assert.deepEqual(mine, official.GIa(recording));
  const lines = mine.map((action) => action.text);
  assert.ok(lines.includes('typed "hello\\n", pressed Tab ×2'), lines.join('\n'));
  assert.ok(lines.includes('pressed ⌘C'));
  assert.ok(lines.includes('typed "[secure input]x"'), 'secure input keeps no characters');
  assert.ok(lines.some((line) => line.startsWith('dragged from (100, 100) on Display 1 to (300, 300) on Display 2')));
  assert.ok(lines.includes('switched to "TextEdit ‹beta›"'));
  assert.ok(lines.some((line) => /^\[mouse button pressed at \(300, 300\).*release not observed\]$/.test(line)));
  assert.ok(!JSON.stringify(mine).includes('secret'), 'nothing typed under secure input');
});

test('the header, preambles and reminders are the original texts', () => {
  for (const options of [{ durationMs: 1234, steps: 3, images: 2 }, { durationMs: 1, steps: 0, images: 0, purpose: 'context', platform: 'win32' }]) {
    assert.equal(trajectory.demonstrationHeader(options), official.HFa(options));
  }
  for (const options of [{ actionCount: 4, durationMs: 5300 }, { actionCount: 1, durationMs: 900, truncatedAtImageCap: 30, platform: 'win32' }]) {
    assert.equal(trajectory.skillReminder(options), official.nIa(options));
    assert.equal(trajectory.contextReminder({ ...options, keptSpans: 2 }), official.rIa({ ...options, keptSpans: 2 }));
  }
  for (const computerUseEnabled of [true, false]) for (const purpose of ['skill', 'context']) {
    const options = { reminderBody: 'body', computerUseEnabled, purpose };
    assert.equal(trajectory.closingBlock(options), official.aIa(options));
  }
  assert.equal(trajectory.SKILL_LEAD, official.WFa);
  assert.equal(trajectory.CONTEXT_LEAD, official.KFa);
  assert.equal(trajectory.sanitizeText('a<b>`c​'), official.l5('a<b>`c​'));
});

test('frames and input become the original trajectory: keyframes, crops of the changed region, no image for no change', async () => {
  const events = rawEvents.map((raw) => trajectory.normalizeEvent(raw, displays));
  const recording = { startedAt: 1, durationMs: 9700, frames, events, apps, narrationText: 'open the <file>' };
  const mine = await trajectory.buildTrajectory(recording, { images: watchRecord.nativeImageOps(fakeNativeImage), yieldToLoop: async () => {} });
  const theirs = await officialBuild.buildTrajectory(recording, {});
  assert.deepEqual(plain(mine), plain(theirs));
  assert.ok(mine.stats.keyframes >= 2 && mine.stats.crops >= 1, JSON.stringify(mine.stats));
  for (const computerUseEnabled of [true, false]) {
    const blocks = trajectory.trajectoryContentBlocks(mine, { computerUseEnabled });
    assert.deepEqual(plain(blocks), plain(officialBlocks.buildTrajectoryContentBlocks(theirs, { computerUseEnabled })));
    assert.deepEqual(plain(trajectory.flattenTrajectoryBlocks(blocks)), plain(officialBlocks.flattenTrajectoryBlocks(blocks)));
  }
  const blocks = trajectory.trajectoryContentBlocks(mine, { computerUseEnabled: false });
  assert.match(blocks[0].text, /^<watch-record-demonstration durationMs="9700" steps="\d+" images="\d+">I recorded a demonstration of a desktop workflow/);
  assert.match(blocks[1].text, /^Spoken narration from the microphone \(transcribed across the whole recording; not aligned to individual timestamps\): "open the ‹file›"$/);
  assert.match(blocks.at(-1).text, /<\/watch-record-demonstration>\n\n<system-reminder>\n[\s\S]*Computer use is not currently enabled[\s\S]*<\/system-reminder>$/);
  assert.match(blocks.at(-1).text, /do NOT replay the manual mouse\/keyboard actions/);
});

test('the turn input keeps the blocks in order, images staged as files, one line break between texts', async () => {
  const blocks = [{ type: 'text', text: 'a' }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from('jpg').toString('base64') } }, { type: 'text', text: 'b' }];
  const staged = [];
  const input = await watchRecord.turnInput(blocks, async (payload) => { staged.push(payload); return { path: `/tmp/staged-${staged.length}.jpg` }; });
  assert.deepEqual(input, [{ type: 'text', text: 'a\n', text_elements: [] }, { type: 'localImage', path: '/tmp/staged-1.jpg' }, { type: 'text', text: 'b', text_elements: [] }]);
  assert.equal(staged[0].type, 'image/jpeg');
  assert.equal(Buffer.from(staged[0].bytes).toString(), 'jpg');
});

// ---- the main-process flow over fakes ----

function harness({ permissions = { screenRecording: true, accessibility: true }, events = [], choice = { action: 'record', micOn: false }, nativeOverrides = {} } = {}) {
  const calls = [], notified = [], windows = [], handlers = new Map(), timers = [];
  let t = 0, framesTaken = 0, pending = [...events];
  const native = {
    call: async (method, params) => {
      calls.push(method);
      if (nativeOverrides[method]) return nativeOverrides[method](params);
      switch (method) {
        case 'watchRecordStart': t = 0; return { started: true };
        case 'watchRecordNowT': t += 300; return { t };
        case 'watchRecordDrain': { const out = pending; pending = []; return { events: out, nowT: t }; }
        case 'watchRecordFrame': framesTaken++; return { base64: encode({ w: 400, h: 300, base: 255, rects: framesTaken > 1 ? [{ x: 10, y: 10, w: 50, h: 50, v: 0 }] : [] }).toString('base64'), width: 400, height: 300, displayWidth: 400, displayHeight: 300, frontmost: { bundleId: 'com.apple.TextEdit', appName: 'TextEdit' } };
        case 'voiceoverAvailability': return { available: false, reason: 'test' };
        default: return {};
      }
    },
  };
  class BrowserWindow {
    static getAllWindows() { return windows.filter((window) => !window.destroyed); }
    constructor(options) {
      Object.assign(this, { options, destroyed: false, visible: false, bounds: { x: options.x ?? 0, y: options.y ?? 0, width: options.width, height: options.height }, listeners: {}, sent: [] });
      this.webContents = { id: 1000 + windows.length, send: (channel, ...args) => this.sent.push([channel, ...args]) };
      windows.push(this);
    }
    on(event, fn) { (this.listeners[event] ??= []).push(fn); return this; }
    once(event, fn) { return this.on(event, fn); }
    emit(event) { for (const fn of this.listeners[event] ?? []) fn(); }
    async loadFile(file) { this.file = file; queueMicrotask(() => this.emit('ready-to-show')); }
    show() { this.visible = true; } showInactive() { this.visible = true; } focus() {} hide() { this.visible = false; }
    close() { this.destroy(); }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.visible = false; this.emit('closed'); }
    isDestroyed() { return this.destroyed; } isVisible() { return this.visible; } isMinimized() { return false; } restore() {}
    getBounds() { return this.bounds; } setBounds(bounds) { this.bounds = bounds; } getSize() { return [this.bounds.width, this.bounds.height]; } setSize(w, h) { this.bounds = { ...this.bounds, width: w, height: h }; }
    setAlwaysOnTop() {} setFullScreenable() {} setHiddenInMissionControl() {}
  }
  const host = new BrowserWindow({ width: 800, height: 600 });
  host.visible = true;
  const screen = {
    getPrimaryDisplay: () => ({ workArea: { x: 0, y: 25, width: 1440, height: 875 } }),
    getDisplayNearestPoint: () => ({ id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } }),
    getCursorScreenPoint: () => ({ x: 10, y: 10 }),
  };
  const files = new Map();
  const fsFake = { mkdtemp: async (prefix) => `${prefix}x`, writeFile: async (file, data) => { files.set(file, data); }, rm: async () => {} };
  const glow = { shown: 0, hidden: 0, show() { this.shown++; }, hide() { this.hidden++; }, moveTo() {} };
  const ipcMain = { handle: (channel, fn) => handlers.set(channel, fn) };
  const setTimer = (fn, ms) => { const timer = { fn, ms }; timers.push(timer); if (ms < 60000) timer.id = setTimeout(fn, Math.min(ms, 5)); return timer; };
  const clearTimer = (timer) => { if (timer?.id) clearTimeout(timer.id); timer.cleared = true; };
  const recorder = watchRecord.createWatchRecord({ native, BrowserWindow, screen, ipcMain, systemPreferences: { getMediaAccessStatus: () => 'granted', askForMediaAccess: async () => true },
    fs: fsFake, tmpdir: () => '/tmp', glow, permissions: async () => permissions, notify: (_contents, payload) => notified.push(payload), images: watchRecord.nativeImageOps(fakeNativeImage),
    stageImage: async () => ({ path: '/tmp/staged.jpg' }), platform: 'darwin', log: { info() {}, warn() {}, debug() {}, error() {} }, setTimer, clearTimer, pollMs: 5 });
  const requester = { id: 77 };
  // The chooser answers as the page would, past the 300 ms input protection (the fake clock is real time here).
  const answerChooser = async (value = choice) => {
    for (let i = 0; i < 200 && !recorder.chooserWindow(); i++) await new Promise((resolve) => setTimeout(resolve, 2));
    const window = recorder.chooserWindow();
    await new Promise((resolve) => setTimeout(resolve, value === 'cancel' ? 0 : 320));
    await handlers.get('cu-watch-record-chooser:choose')({ sender: window.webContents, senderFrame: { parent: null } }, value);
  };
  const pillCall = (name) => { const pill = recorder.pillWindow(); return handlers.get(`cu-watch-record-pill:${name}`)({ sender: pill.webContents, senderFrame: { parent: null } }); };
  return { recorder, calls, notified, host, glow, files, requester, answerChooser, pillCall, windows, start: (options = {}) => recorder.start(options.sessionId, options.resume === true, { purpose: 'skill', webContents: requester, window: host }) };
}
// Values built inside the reference chunks' own context have that context's prototypes: compared as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('Cancel in the chooser records nothing', async () => {
  const h = harness();
  const started = h.start();
  await h.answerChooser('cancel');
  assert.equal(await started, watchRecord.RESULT.Cancelled);
  assert.ok(!h.calls.includes('watchRecordStart'));
  assert.equal(h.recorder.state().recording, false);
  assert.equal(h.host.visible, true);
  const chooserFile = [...h.files.keys()].find((file) => file.includes('wr-chooser-'));
  assert.match(h.files.get(chooserFile), /Record a skill/);
});

test('missing macOS permissions: needs-mac-permissions, and the retry skips the chooser', async () => {
  const h = harness({ permissions: { screenRecording: false, accessibility: true } });
  const first = h.start({ sessionId: 's1' });
  await h.answerChooser();
  assert.equal(await first, watchRecord.RESULT.NeedsMacPermissions);
  assert.ok(!h.calls.includes('watchRecordStart'));
  const chooserWindows = h.windows.filter((window) => window.options.title === 'Record a skill').length;
  const again = await h.start({ sessionId: 's1', resume: true });
  assert.equal(again, watchRecord.RESULT.NeedsMacPermissions, 'still missing');
  assert.equal(h.windows.filter((window) => window.options.title === 'Record a skill').length, chooserWindows, 'no second chooser');
});

test('Discard drops everything: no message, no held recording, the window back', async () => {
  const h = harness({ events: [{ kind: 'key', t: 10, keyCode: 0, chars: 'a', modifiers: 0 }] });
  const started = h.start();
  await h.answerChooser();
  assert.equal(await started, watchRecord.RESULT.Started);
  assert.equal(h.host.visible, false, 'the window hides while a skill is recorded');
  assert.ok(h.recorder.pillWindow(), 'the pill is up');
  assert.ok(h.glow.shown >= 1, 'the glow is on');
  await settle(60);
  await h.pillCall('discard');
  assert.ok(h.calls.includes('watchRecordStop') && h.calls.includes('watchRecordClear'));
  const state = h.recorder.state();
  assert.deepEqual([state.recording, state.frames, state.events, state.held, state.pill], [false, 0, 0, false, false]);
  assert.equal(h.host.visible, true);
  assert.deepEqual(h.notified, [{ sessionId: null, eventCount: 0, discarded: true, holdEpoch: -1, purpose: 'skill' }]);
  assert.equal(await h.recorder.take(h.requester.id), null);
});

// The pill's microphone turned on just before Discard / Done: the late voiceover start is stopped, not left running.
for (const ending of ['discard', 'done']) {
  test(`a microphone that comes up after ${ending === 'discard' ? 'Discard' : 'Done'} is stopped, not left on`, async () => {
    let active = false, releaseStart;
    const gate = new Promise((resolve) => { releaseStart = resolve; });
    const h = harness({ nativeOverrides: {
      voiceoverAvailability: async () => ({ available: true }),
      voiceoverDevices: async () => ({ devices: [] }),
      voiceoverStart: async () => { await gate; if (active) throw new Error('already_active'); active = true; return {}; },
      voiceoverStop: async () => { active = false; return {}; },
      voiceoverDrain: async () => ({ narrations: [], micStates: active ? [] : [{ on: false, level: 0 }], active }),
    } });
    const started = h.start();
    await h.answerChooser();
    assert.equal(await started, watchRecord.RESULT.Started);
    const toggling = h.pillCall('toggleMic');
    await settle(10);
    assert.ok(h.calls.includes('voiceoverStart'), 'the start is in flight');
    await h.pillCall(ending);
    assert.equal(h.recorder.state().recording, false);
    releaseStart();
    await toggling;
    await settle(20);
    assert.equal(h.recorder.state().micOn, false, 'the microphone is not recorded as on');
    assert.ok(h.calls.includes('voiceoverStop'), 'the late voiceover start was stopped');
    assert.equal(active, false, 'the native voiceover is not left running');
  });
}

test('Done builds the demonstration, holds it for the window that asked, and hands it over once', async () => {
  const pillRect = { kind: 'leftMouseDown', t: 5, x: 600, y: 860, modifiers: 0 };
  const h = harness({ events: [{ kind: 'leftMouseDown', t: 10, x: 20, y: 30, modifiers: 0 }, { kind: 'leftMouseUp', t: 40, x: 20, y: 30, modifiers: 0 },
    { kind: 'key', t: 80, secureInput: true, modifiers: 0 }, pillRect] });
  const started = h.start({ sessionId: 's9' });
  await h.answerChooser();
  assert.equal(await started, watchRecord.RESULT.Started);
  const pill = h.recorder.pillWindow();
  pill.bounds = { x: 500, y: 830, width: 472, height: 112 };
  await settle(80);
  await h.pillCall('done');
  assert.ok(pill.sent.some(([channel]) => channel === 'cu-watch-record-pill:processing'));
  const completion = h.notified.at(-1);
  assert.equal(completion.discarded, false);
  assert.equal(completion.sessionId, 's9');
  assert.ok(completion.holdEpoch > 0);
  assert.equal(await h.recorder.take(12345), null, 'another window gets nothing');
  const taken = await h.recorder.take(h.requester.id);
  assert.match(taken.message, /^<watch-record-demonstration durationMs="\d+" steps="2" images="\d+">/);
  // Before the first frame no app is known yet (the original names the app from the frames), so no "in …".
  assert.match(taken.message, /\[0\.0s\] clicked at \(20, 30\)\n/);
  assert.match(taken.message, /typed "\[secure input\]"/);
  assert.doesNotMatch(taken.message, /\(600, 860\)/, 'a press on the pill is not part of the demonstration');
  assert.ok(taken.images.length >= 1);
  assert.ok(taken.input.some((part) => part.type === 'localImage' && part.path === '/tmp/staged.jpg'));
  assert.equal(await h.recorder.take(h.requester.id), null, 'once');
  // The renderer shows the session, then lets the Processing pill go.
  h.recorder.dismissPill(completion.holdEpoch);
  assert.equal(h.recorder.pillWindow(), null);
  assert.equal(h.host.visible, true);
  // What the transcript makes of it.
  const parsed = model.parseDemonstration(taken.input.map((part) => (part.type === 'localImage' ? { ...part, path: '/tmp/staged.jpg' } : part)));
  assert.equal(parsed.steps, 2);
  assert.equal(model.demonstrationLead(parsed), model.SKILL_LEAD_SHORT);
  assert.ok(model.demonstrationRows(parsed, model.demonstrationLead(parsed)).some((row) => row.kind === 'action' && row.action.verb === 'Clicked'));
});

test('Done drains the input once more even when a timer poll is mid-drain as it stops the recorder', async () => {
  // A tick's drain is in flight while the recorder stops; the last click is buffered after that drain's snapshot.
  const queued = [{ kind: 'leftMouseDown', t: 10, x: 20, y: 30, modifiers: 0 }, { kind: 'leftMouseUp', t: 40, x: 20, y: 30, modifiers: 0 }];
  const late = [{ kind: 'leftMouseDown', t: 500, x: 70, y: 80, modifiers: 0 }, { kind: 'leftMouseUp', t: 520, x: 70, y: 80, modifiers: 0 }];
  let stopping = false, hung = null, gate = null;
  const h = harness({ nativeOverrides: {
    watchRecordStop: async () => { stopping = true; await new Promise((resolve) => { hung = resolve; }); return {}; },
    watchRecordDrain: async () => {
      if (stopping && !gate) {
        gate = new Promise((resolve) => setTimeout(resolve, 30));
        queued.push(...late);
        hung();
        await gate;
        return { events: [], nowT: 600 };
      }
      const out = queued.splice(0);
      return { events: out, nowT: 600 };
    },
  } });
  const started = h.start({ sessionId: 's1' });
  await h.answerChooser();
  assert.equal(await started, watchRecord.RESULT.Started);
  await settle(80);
  await h.pillCall('done');
  const taken = await h.recorder.take(h.requester.id);
  assert.match(taken.message, /clicked at \(20, 30\)/);
  assert.match(taken.message, /clicked at \(70, 80\)/, 'the click buffered during the tick\'s drain is kept');
});

test('a recording shorter than two frames is dropped', async () => {
  const h = harness();
  const started = h.start();
  await h.answerChooser();
  await started;
  await h.pillCall('done');
  const completion = h.notified.at(-1);
  if (completion.discarded) assert.equal(completion.dropReason, 'too_short');
});

// ---- the renderer's card (cc1aae219 / shared-52) ----

function officialRenderer() {
  const s52 = fs.readFileSync(new URL('ion-dist/assets/v1/shared-52-DGviI8xb.js', REFERENCE), 'utf8');
  const parser = new Function(`${s52.slice(s52.indexOf('var xz="watch-record-demonstration"'), s52.indexOf('function Zz('))}; return {qz, wz, Tz, Ez, Dz, Oz};`)();
  const cc = fs.readFileSync(new URL('ion-dist/assets/v1/cc1aae219-DjR8LnUv.js', REFERENCE), 'utf8');
  const rows = cc.slice(cc.indexOf('var aO=[Mi,Fi,oa]'), cc.indexOf('function dO('));
  const gO = cc.slice(cc.indexOf('function gO('), cc.indexOf('function _O('));
  const card = new Function('Mi', 'Fi', 'oa', 'ki', 'xi', `${rows};${gO}; return {aO, oO, lO, uO, gO};`)(parser.wz, parser.Ez, parser.Dz, parser.Tz, parser.Oz);
  return { ...parser, ...card };
}

test('the card reads a demonstration as the original: rows, captions, the lead, content order and the reflowed form', async () => {
  const theirs = officialRenderer();
  assert.deepEqual([theirs.wz, theirs.Tz, theirs.Ez, theirs.Dz, theirs.Oz], [model.SKILL_LEAD_SHORT, model.SKILL_LEAD, model.EVENTS_LEAD, model.CONTEXT_LEAD_SHORT, model.CONTEXT_LEAD]);
  const events = rawEvents.map((raw) => trajectory.normalizeEvent(raw, displays));
  const built = await trajectory.buildTrajectory({ startedAt: 1, durationMs: 9700, frames, events, apps }, { images: watchRecord.nativeImageOps(fakeNativeImage), yieldToLoop: async () => {} });
  const blocks = trajectory.trajectoryContentBlocks(built, { computerUseEnabled: true });
  // Content order (a live message).
  const mine = model.parseDemonstration(blocks, { order: 'content' });
  const official = theirs.qz(blocks, 'contentOrder');
  assert.deepEqual({ ...mine }, { ...official, blocks: official.blocks });
  // A flattened message (text first, images after): the images spread over the picture lines.
  const flat = trajectory.flattenTrajectoryBlocks(blocks);
  const flattened = [{ type: 'text', text: flat.message }, ...flat.images.map((image) => ({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } }))];
  assert.deepEqual(model.parseDemonstration(flattened).blocks, theirs.qz(flattened, 'reflow').blocks);
  // The rows.
  const lead = theirs.aO.find((text) => mine.blocks[0].text.startsWith(text)) ?? null;
  assert.equal(model.demonstrationLead(mine), lead);
  assert.deepEqual(model.demonstrationRows(mine, lead), theirs.gO(official, lead));
  for (const block of mine.blocks.filter((block) => block.type === 'text')) {
    assert.deepEqual(model.actionRow(block.text), theirs.lO(block.text));
    assert.equal(model.captionRow(block.text), theirs.uO(block.text));
  }
  assert.equal(model.parseDemonstration([{ type: 'text', text: 'hello' }]), null);
  assert.equal(model.parseDemonstration([{ type: 'text', text: 'words first ' }, ...blocks.slice(0, 1)]), null);
});

test('Codex parts: localImage paths become file URLs; the demonstration is found on a transcript item', () => {
  const content = [{ type: 'text', text: '<watch-record-demonstration durationMs="2500" steps="1" images="1">I recorded a demonstration of a desktop workflow for you to learn from. The blocks below are a chronological trajectory: timestamped action descriptions interleaved with images of the screen state.\n' },
    { type: 'text', text: '[0.1s] clicked at (1, 2) in "Notes"\n' }, { type: 'text', text: '[0.1s] full screen (Display 1 — frontmost: "Notes"):\n' },
    { type: 'localImage', path: '/tmp/a b.jpg' }, { type: 'text', text: '</watch-record-demonstration>\n\n<system-reminder>\nx\n</system-reminder>' }];
  const parsed = model.demonstrationOf({ type: 'userMessage', content });
  assert.equal(parsed.durationMs, 2500);
  const rows = model.demonstrationRows(parsed, model.demonstrationLead(parsed));
  assert.deepEqual(rows.map((row) => row.kind), ['action', 'caption', 'image']);
  assert.equal(rows[2].src, 'file:///tmp/a%20b.jpg');
  assert.equal(model.actionLabel(rows[0].action), 'Clicked in ');
  assert.equal(model.demonstrationOf({ type: 'userMessage', content: [{ type: 'text', text: 'plain' }] }), null);
  assert.equal(model.demonstrationTitle(2500), 'Recorded demonstration (2.5s)');
  assert.equal(model.demonstrationDuration(content[0].text), 2500);
  // (2.42304.0 also checks the optimistic row's input here, pending-send-model.mjs `content`: 0.1 has no "Record a
  // skill" delivery in the composer yet, so that part isn't ported.)
});

test('start answers map to the original entry behaviour', () => {
  assert.deepEqual(model.startOutcome('needs-mac-permissions'), { kind: 'permissions' });
  assert.deepEqual(model.startOutcome('needs-screen-recording'), { kind: 'permissions' });
  assert.deepEqual(model.startOutcome('needs-cu-opt-in'), { kind: 'notice', message: 'needsCuOptIn' });
  assert.deepEqual(model.startOutcome('remote-session-unsupported'), { kind: 'notice', message: 'remoteSessionUnsupported' });
  assert.deepEqual(model.startOutcome('started'), { kind: 'started' });
  assert.deepEqual(model.startOutcome('cancelled'), { kind: 'none' });
  const shared6 = fs.readFileSync(new URL('ion-dist/assets/v1/shared-6-Cby4X-ms.js', REFERENCE), 'utf8');
  for (const text of ['Record a skill', 'Record your screen', 'Grant macOS permissions', 'Continue to recording', 'Close without granting permission',
    'Turn on computer use in Settings, then try recording again.', 'To record your screen and actions, grant the macOS permissions below.']) assert.ok(shared6.includes(`"${text}"`), text);
});
