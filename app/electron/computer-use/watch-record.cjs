// Watch-record — "Record a skill" (docs/computer-use-official-spec-20261021.md §2.4): the user demonstrates a workflow
// once; the recording (screen frames, clicks, typing, optional voice narration) becomes one user message that Claude
// turns into a skill. The 2.42304.0 original is asar index.chunk-muI2IV6k.js @6425700–6500000 (log tag
// [watch-record]); this is its main-process side, function by function:
//
//   chooser window   yIa (lIa page, s5 / uIa dIa fIa pIa mIa, gIa growth, _Ia choice, vIa mic state), bza (mic preview)
//   pill window      dRa (lRa page, eRa…oRa, uRa position), fRa dismiss, mRa hRa vRa yRa dispatches, _Ra width
//   recording        xza / Cza start, wza done, Pza discard, jRa mic toggle, hza / gza frames, _za / yza input filter
//   held recording   Tza take (60 s, tza), X5 / JRa pill hold, Q5 resume after the permission dialog (nza 2 min)
//
// Differences, each forced by this build (docs/computer-use-progress-20261021.md 「第二轮 · watch-record」):
//   - Output mode is the original's default "trajectory" (uur()); the flag-only "events" mode is not built.
//   - Purpose "context" (Share screen, reached only from the official microphone menu, which this app has no place for)
//     is refused as the original refuses it with its gate off ("context recording gate disabled").
//   - The input recorder and frames are this build's native module (WatchRecorder.swift: listen-only CGEventTap,
//     drained every 100 ms); narration is on-device SFSpeechRecognizer (WatchRecordVoiceover.swift) instead of the
//     original's transcription service, and absent (the original's no-microphone chooser and pill) when unavailable.
//   - The held recording also carries `input`: the content blocks as Codex turn input, images staged as files
//     (turn/start takes {type: "localImage", path}).
//   - Renderer IPC is "desktop:call watch-record:*" and the "watch-record-complete" event (the original EIPC
//     LocalAgentModeSessions startWatchRecording / takeHeldWatchRecording / dismissWatchRecordPill /
//     onWatchRecordingComplete).
const nodePath = require("node:path");
const { chooserPage, pillPage, PILL_INSET_PX } = require("./watch-record-pages.cjs");
const trajectory = require("./watch-record-trajectory.cjs");

// A_
const RESULT = Object.freeze({ Started: "started", Cancelled: "cancelled", NeedsMacPermissions: "needs-mac-permissions",
  RemoteSessionUnsupported: "remote-session-unsupported" });
// uIa dIa fIa pIa mIa: the chooser's width, heights (without / with the context mode's microphone row), its tallest, and
// the input protection before Start counts.
const CHOOSER_WIDTH = 500, CHOOSER_HEIGHT = 280, CHOOSER_HEIGHT_CONTEXT_MIC = 304, CHOOSER_MAX_HEIGHT = 400, INPUT_PROTECTION_MS = 300;
// eRa tRa nRa (rRa) iRa aRa oRa: the pill's widest / narrowest content, its height, the transparent inset, the window,
// and the gap above the work area's bottom.
const PILL_MAX_CONTENT = 408, PILL_MIN_CONTENT = 160, PILL_HEIGHT = 48, PILL_WINDOW_WIDTH = 472, PILL_WINDOW_HEIGHT = 112, PILL_BOTTOM_GAP = 24;
// zRa BRa VRa HRa URa WRa (54e4) tza JRa nza
const FRAME_INTERVAL_MS = 250, FRAME_BUFFER_MAX = 720, SETTLE_MS = 500, NARRATION_WAIT_MS = 5e3, MAX_DURATION_MS = 6e5,
  WARNING_LEAD_MS = 6e4, WARNING_AT_MS = 54e4, HELD_TTL_MS = 6e4, PILL_HOLD_MS = 6e4, RESUME_TTL_MS = 12e4;
const POLL_MS = 100;
const CHOOSER = "cu-watch-record-chooser:";
const PILL = "cu-watch-record-pill:";
const PRELOAD = nodePath.join(__dirname, "watch-record-preload.cjs");
const MIC_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";

/**
 * @param {{native: {call: Function}, BrowserWindow: Function, screen: object, ipcMain?: object, app?: object,
 *   systemPreferences: object, openExternal?: Function, fs: object, tmpdir: () => string, nativeImage?: object,
 *   glow?: {show: Function, hide: Function, moveTo: Function}, lockHolder?: () => any, computerUseEnabled?: () => boolean,
 *   permissions: () => Promise<{screenRecording: boolean, accessibility: boolean}>, ignoredWindow?: (w) => boolean,
 *   stageImage?: (payload) => Promise<{path: string}>, notify?: (webContents, payload) => void, images?: object,
 *   preload?: string, platform?: string, log?: object, now?: () => number, setTimer?: Function, clearTimer?: Function,
 *   pollMs?: number}} options
 */
function createWatchRecord({ native, BrowserWindow, screen, ipcMain = null, app = null, systemPreferences, openExternal = () => {},
  fs, tmpdir, nativeImage = null, glow = null, lockHolder = () => undefined, computerUseEnabled = () => true, permissions,
  ignoredWindow = () => false, stageImage = null, notify = () => {}, images = null, preload = PRELOAD, platform = process.platform,
  log = console, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, pollMs = POLL_MS }) {
  const imageOps = images ?? nativeImageOps(nativeImage);
  const sleep = (ms) => new Promise((resolve) => setTimer(resolve, ms));
  const rm = (dir) => { if (dir) fs.rm(dir, { recursive: true, force: true }).catch(() => undefined); };
  const micStatus = () => { try { return systemPreferences.getMediaAccessStatus("microphone"); } catch { return "not-determined"; } };

  // ---- native recorder (the original's YLa over @ant/claude-swift watchRecorder) ----
  let voiceoverAvailable = null;
  const recorder = {
    start: () => native.call("watchRecordStart"),
    stop: () => native.call("watchRecordStop"),
    clear: () => native.call("watchRecordClear").catch(() => undefined),
    drain: () => native.call("watchRecordDrain"),
    frame: (displayId) => native.call("watchRecordFrame", displayId === undefined ? {} : { displayId }),
    voiceover: {
      available: async () => {
        if (voiceoverAvailable !== null) return voiceoverAvailable;
        try { const answer = await native.call("voiceoverAvailability"); voiceoverAvailable = answer?.available === true; if (!voiceoverAvailable) log.info?.(`[watch-record] narration unavailable (${answer?.reason ?? "unknown"}) — recording without voiceover`); }
        catch { voiceoverAvailable = false; }
        return voiceoverAvailable;
      },
      listInputDevices: async () => { try { return (await native.call("voiceoverDevices"))?.devices ?? []; } catch { return []; } },
      start: (uid) => native.call("voiceoverStart", { ...(uid ? { uid } : {}), perTurn: false }),
      stop: () => native.call("voiceoverStop"),
      drain: () => native.call("voiceoverDrain"),
      startPreview: (uid) => native.call("voiceoverPreviewStart", uid ? { uid } : {}),
      stopPreview: () => native.call("voiceoverPreviewStop").catch(() => undefined),
    },
  };

  // ---- state (the original's module variables, named) ----
  let recording = false;          // w5
  let stopping = false;           // H5
  let epoch = 0;                  // E5
  let sessionId = null;           // T5
  let purpose = "skill";          // O5
  let requester = null;           // ARa (web contents id)
  let requesterContents = null;
  let hostWindow = null;          // x5 (the window that asked; hidden while recording a skill)
  let hostHidden = false;         // TRa
  let cuEnabledAtStart = false;   // DRa
  let rawEvents = [];             // I5
  let frames = [];                // z5
  let apps = [];                  // B5
  let lastApp = null;             // V5
  let displays = null;            // LRa
  let frameLoop = null;           // RRa
  let frameInterval = FRAME_INTERVAL_MS; // U5
  let maxTimer = null, warnTimer = null; // GRa KRa
  let autoDone = false, autoDoneAt = 0;  // q5 J5
  let micOn = false;              // A5
  let micToggling = false;        // j5
  let narrationSegments = [];     // M5
  let narrationCurrent;           // N5
  let narrationWaiter = null;     // F5
  let voiceoverStopping = null;   // IRa
  let held = null, heldSession = null, heldRequester = null, heldTimer = null; // Z5 $Ra iza eza
  let delivering = false;         // rza
  let pillHeld = false, pillEpoch = 0, pillHoldTimer = null; // YRa Y5 XRa
  let resume = null;              // Q5
  let pollTimer = null, polling = null, chooserMic = null; // polling: the drain in flight
  let nowT = 0;                   // the recorder's clock, as of the last drain

  // ---- polling: input events, narration and mic state come from the native buffers ----
  // The microphone's buffer is read while recording, while the chooser previews it, and while Done waits for the last
  // narration or the microphone going off.
  const voiceLive = () => recording || !!chooserMic || narrationWaiter !== null || voiceoverStopping !== null;
  // One drain at a time; a call made meanwhile (Done's last drain) waits for it, then drains what came after it.
  const pollOnce = async () => {
    while (polling) await polling;
    polling = drainOnce().finally(() => { polling = null; });
    return polling;
  };
  const drainOnce = async () => {
    try {
      if (recording) {
        const drained = await recorder.drain();
        if (typeof drained?.nowT === "number") nowT = drained.nowT;
        for (const event of drained?.events ?? []) onInput(event);
      }
      if (voiceLive()) {
        const voice = await recorder.voiceover.drain().catch(() => null);
        for (const narration of voice?.narrations ?? []) onNarration(narration);
        for (const state of voice?.micStates ?? []) onMicState(state);
      }
    } catch (error) { log.warn?.("[watch-record] drain failed", error); }
  };
  const ensurePolling = () => {
    if (pollTimer) return;
    const tick = async () => {
      pollTimer = null;
      await pollOnce();
      if (voiceLive()) pollTimer = setTimer(tick, pollMs);
    };
    pollTimer = setTimer(tick, pollMs);
  };
  const stopPolling = () => { if (pollTimer) { clearTimer(pollTimer); pollTimer = null; } };

  /** yza: a press, release or scroll on one of this app's own visible windows (the pill) is not the demonstration. */
  function onOwnWindow(x, y) {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed() || !window.isVisible() || ignoredWindow(window)) continue;
      const bounds = window.getBounds();
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) return true;
    }
    return false;
  }
  /** _za (trajectory mode): every event but those on this app's own windows. */
  function onInput(event) {
    if (!recording) return;
    const press = event.kind === "leftMouseDown" || event.kind === "rightMouseDown";
    const release = event.kind === "leftMouseUp" || event.kind === "rightMouseUp";
    if ((press || release || event.kind === "scrollWheel") && event.x !== undefined && event.y !== undefined && onOwnWindow(event.x, event.y)) return;
    rawEvents.push(event);
  }
  /** lza's narration handler (skill mode: the whole transcript so far; the first one after Done releases MRa). */
  function onNarration(event) {
    if (!micOn) return;
    narrationCurrent = event.text;
    log.debug?.(`[watch-record] narration received (${String(event.text ?? "").length} chars)`);
    if (narrationWaiter) { narrationWaiter(); narrationWaiter = null; }
  }
  /** lza's mic-state handler: the chooser's meter, the pill's meter, or the pill's error state. */
  function onMicState(state) {
    chooserMicState(state.on, state.level);
    if (!state.on && voiceoverStopping) { const resolve = voiceoverStopping.resolve; voiceoverStopping = null; resolve(); }
    if (!recording) return;
    if (state.error && micOn) { micOn = false; endNarrationSegment(); pillMicError(); return; }
    pillMicState(state.on, state.level);
  }
  /** voiceover.stop(): resolves once the native side reports the microphone off. */
  function stopVoiceover() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    voiceoverStopping = { resolve, promise };
    recorder.voiceover.stop().catch(() => { voiceoverStopping = null; resolve(); });
    ensurePolling();
    return promise;
  }
  // NRa / PRa / FRa
  const endNarrationSegment = () => { if (narrationCurrent) narrationSegments.push(narrationCurrent); narrationCurrent = undefined; };
  const resetNarration = () => { narrationSegments = []; narrationCurrent = undefined; };
  const narrationText = () => { const all = narrationCurrent ? [...narrationSegments, narrationCurrent] : narrationSegments; return all.length > 0 ? all.join(" ") : undefined; };
  /** MRa: wait for the next narration, the microphone going off, or 5 s. */
  async function awaitNarration() {
    const next = new Promise((resolve) => { narrationWaiter = resolve; });
    ensurePolling();
    await Promise.race([next, ...(voiceoverStopping ? [voiceoverStopping.promise] : []), sleep(NARRATION_WAIT_MS)]);
    narrationWaiter = null;
  }

  // ---- the chooser window (yIa) ----
  let chooser = null;
  const chooserHandlers = {};
  function chooserMicState(on, level) {
    if (chooser && !chooser.isDestroyed()) { try { chooser.webContents.send(CHOOSER + "micState", on, level); } catch {} }
  }
  /** bza: the chooser's microphone options (only when narration can run). */
  async function chooserMicOptions() {
    if (!(await recorder.voiceover.available())) return undefined;
    const devices = await recorder.voiceover.listInputDevices();
    const status = micStatus();
    const usable = devices.length > 0 && status !== "denied" && status !== "restricted";
    return {
      listInputDevices: () => devices,
      onSetMicPreview: async (uid, closed) => {
        switch (micStatus()) {
          case "denied":
          case "restricted":
            log.info?.("[watch-record] chooser mic preview: OS mic access denied — opening System Settings");
            try { openExternal(MIC_SETTINGS_URL); } catch {}
            return false;
          case "not-determined":
            if (!(await systemPreferences.askForMediaAccess("microphone"))) return false;
            if (closed()) return false;
        }
        await recorder.voiceover.startPreview(uid);
        chooserMic = true;
        ensurePolling();
        return true;
      },
      onStopMicPreview: () => { chooserMic = null; void recorder.voiceover.stopPreview(); },
      initialMicOn: usable,
      autoStartPreview: usable && status === "granted",
    };
  }
  async function showChooser(parent, mic, kind) {
    if (chooser && !chooser.isDestroyed()) { log.warn?.("[watch-record] chooser already open, refusing"); return { choice: "cancel" }; }
    let dir, file;
    try {
      dir = await fs.mkdtemp(nodePath.join(tmpdir(), "wr-chooser-"));
      file = nodePath.join(dir, "index.html");
      await fs.writeFile(file, chooserPage({ inputProtectionMs: INPUT_PROTECTION_MS, initialMicOn: mic?.initialMicOn ?? false,
        autoStartPreview: mic?.autoStartPreview ?? false, micAvailable: mic !== undefined, purpose: kind }), { mode: 0o600 });
    } catch (error) {
      log.warn?.("[watch-record] chooser tmpfile failed", error);
      rm(dir);
      return { choice: "cancel" };
    }
    return new Promise((resolve) => {
      let settled = false, choice = null, shownAt = Infinity, previewGen = 0;
      const window = new BrowserWindow({ width: CHOOSER_WIDTH, height: kind === "context" && mic !== undefined ? CHOOSER_HEIGHT_CONTEXT_MIC : CHOOSER_HEIGHT,
        parent: parent && !parent.isDestroyed() ? parent : undefined, title: kind === "context" ? "Share screen" : "Record a skill",
        modal: true, show: false, frame: false, resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
        webPreferences: { preload, sandbox: true, nodeIntegration: false, contextIsolation: true } });
      chooser = window;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        choice = value;
        mic?.onStopMicPreview();
        if (!window.isDestroyed()) window.close(); else resolve(value);
      };
      chooserHandlers.target = window;
      chooserHandlers.setMicPreview = async (uid) => {
        if (settled || !mic) return false;
        const gen = previewGen;
        try {
          const ok = await mic.onSetMicPreview(uid, () => settled);
          if (ok && (settled || previewGen !== gen)) { mic.onStopMicPreview(); return false; }
          return ok;
        } catch (error) { log.warn?.("[watch-record] chooser setMicPreview failed", error); return false; }
      };
      chooserHandlers.stopMicPreview = () => { previewGen++; if (!settled) mic?.onStopMicPreview(); };
      chooserHandlers.reportContentShortfall = (shortfall) => {
        if (settled || window.isDestroyed()) return;
        log.info?.("[watch-record] chooser page reported its shortfall", { shortfallPx: shortfall, windowHeight: window.getSize()[1], alreadyShown: shownAt !== Infinity });
        growChooser(window, shortfall);
        if (shownAt !== Infinity) shownAt = now();
      };
      chooserHandlers.choose = (value) => {
        if (settled || window.isDestroyed()) return;
        const parsed = parseChoice(value);
        if (parsed === null) return;
        const since = now() - shownAt;
        if (parsed.choice !== "cancel" && since < INPUT_PROTECTION_MS) {
          log.warn?.("[watch-record] chooser choice arrived before input-protection window elapsed; ignoring", { action: value, sinceShowMs: since });
          return;
        }
        finish(parsed);
      };
      window.on("closed", () => {
        if (chooser === window) chooser = null;
        chooserHandlers.target = null;
        rm(dir);
        if (!settled) { settled = true; mic?.onStopMicPreview(); }
        resolve(choice ?? { choice: "cancel" });
      });
      window.once("ready-to-show", () => {
        if (window.isDestroyed()) return;
        window.show();
        window.focus();
        shownAt = now();
        if (mic) { try { window.webContents.send(CHOOSER + "inputDevices", mic.listInputDevices()); } catch {} }
      });
      Promise.resolve(window.loadFile(file)).catch((error) => {
        log.warn?.("[watch-record] chooser loadFile failed", error);
        finish({ choice: "cancel" });
        if (!window.isDestroyed()) window.close();
      });
    });
  }

  // ---- the pill window (dRa…) ----
  let pill = null, pillGen = 0, glowShown = false;
  const pillHandlers = {};
  /** uRa: bottom centre of the primary display's work area. */
  function pillPosition(width = PILL_WINDOW_WIDTH) {
    const { workArea } = screen.getPrimaryDisplay();
    return { x: Math.round(workArea.x + (workArea.width - width) / 2), y: workArea.y + workArea.height - PILL_HEIGHT - PILL_INSET_PX - PILL_BOTTOM_GAP };
  }
  function showPill(options) {
    const gen = ++pillGen;
    // The glow on the cursor's display, without its badge, unless a session holds the screen (it has its own).
    glowShown = lockHolder() === undefined;
    if (glowShown && glow) {
      try { glow.moveTo(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id); } catch {}
      Promise.resolve(glow.show({ showBadge: false })).catch((error) => { log.warn?.("[watch-record] glow show failed", error); });
    }
    return (async () => {
      if (pill && !pill.isDestroyed()) pill.destroy();
      const dir = await fs.mkdtemp(nodePath.join(tmpdir(), "cu-watch-record-pill-"));
      const file = nodePath.join(dir, "index.html");
      try { await fs.writeFile(file, pillPage(options), { mode: 0o600 }); } catch (error) { rm(dir); throw error; }
      if (gen !== pillGen) { rm(dir); return; }
      const { x, y } = pillPosition();
      const window = new BrowserWindow({ width: PILL_WINDOW_WIDTH, height: PILL_WINDOW_HEIGHT, x, y, transparent: true, frame: false, hasShadow: false,
        alwaysOnTop: true, skipTaskbar: true, focusable: false, movable: true, resizable: false, minimizable: false, maximizable: false,
        fullscreenable: false, type: platform === "darwin" ? "panel" : undefined, show: false, backgroundColor: "#00000000",
        webPreferences: { preload, sandbox: true, nodeIntegration: false, contextIsolation: true } });
      pill = window;
      pillHandlers.target = window;
      window.setAlwaysOnTop(true, "screen-saver");
      window.setFullScreenable(false);
      if (platform === "darwin") {
        window.setHiddenInMissionControl?.(true);
        // IO: a panel window can take the Dock icon away; bring it back.
        if (app?.dock && !app.dock.isVisible()) app.dock.show();
      }
      window.on("closed", () => { if (pill === window) { pill = null; pillHandlers.target = null; } rm(dir); });
      await window.loadFile(file);
      if (gen !== pillGen) { window.destroy(); return; }
      window.showInactive();
      log.info?.("[watch-record] pill shown");
    })().catch((error) => { log.warn?.("[watch-record] showWatchRecordPill failed", error); throw error; });
  }
  /** gRa: capture is over — the glow goes, the pill's meter darkens. */
  function releaseCaptureIndicators() {
    if (glowShown) { glowShown = false; if (lockHolder() === undefined) glow?.hide(); }
    pillMicState(false, 0);
  }
  /** fRa: the pill goes (and the glow, if this recording raised it). */
  function dismissPillWindow() {
    ++pillGen;
    if (glowShown) { glowShown = false; if (lockHolder() === undefined) glow?.hide(); }
    if (pill && !pill.isDestroyed()) { pill.destroy(); }
    pill = null;
    pillHandlers.target = null;
  }
  const pillSend = (name, ...args) => { if (pill && !pill.isDestroyed() && pill.isVisible()) { try { pill.webContents.send(PILL + name, ...args); } catch {} } };
  const pillMicState = (on, level) => pillSend("micState", on, level);
  const pillMicError = () => pillSend("micError");
  /** _Ra: the Processing pill shrinks to its content, centred. */
  function fitPill(width) {
    if (!pill || pill.isDestroyed()) return;
    const contentWidth = Math.min(PILL_MAX_CONTENT, Math.max(PILL_MIN_CONTENT, Math.ceil(width))) + 2 * PILL_INSET_PX;
    const bounds = pill.getBounds();
    pill.setBounds({ ...bounds, width: contentWidth, x: Math.round(bounds.x + (bounds.width - contentWidth) / 2) }, true);
  }
  /** X5: the renderer has shown the session (or the hold ran out): the Processing pill goes. */
  function releasePill(holdEpoch) {
    if (!pillHeld || holdEpoch !== pillEpoch) return;
    pillHeld = false;
    if (pillHoldTimer) { clearTimer(pillHoldTimer); pillHoldTimer = null; }
    dismissPillWindow();
  }

  // ---- IPC: each page's methods, answered for that page's own window only (the original EIPC checks the frame) ----
  const fromTarget = (handlers, event) => {
    const target = handlers.target;
    return !!target && !target.isDestroyed() && event?.sender === target.webContents && !(event.senderFrame && event.senderFrame.parent !== null);
  };
  for (const name of ["choose", "setMicPreview", "stopMicPreview", "reportContentShortfall"]) {
    ipcMain?.handle?.(CHOOSER + name, (event, ...args) => (fromTarget(chooserHandlers, event) ? chooserHandlers[name]?.(...args) : undefined));
  }
  const pillMethods = { done: () => done(), discard: () => discard(), toggleMic: () => toggleMic(), reportProcessingWidth: (width) => { if (Number.isFinite(width)) fitPill(width); } };
  for (const name of Object.keys(pillMethods)) {
    ipcMain?.handle?.(PILL + name, (event, ...args) => (fromTarget(pillHandlers, event) ? pillMethods[name](...args) : undefined));
  }

  // ---- frames (hza / gza) ----
  async function captureFrame(forEpoch) {
    try {
      if (forEpoch !== epoch) return;
      const t = await currentT();
      const cursor = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursor);
      const shot = await recorder.frame(display.id);
      if (forEpoch !== epoch) return;
      const front = shot?.frontmost;
      const name = front?.appName ? trajectory.sanitizeName(front.appName) : null;
      if (front) {
        const key = front.bundleId ?? front.appName;
        if (key !== lastApp) { lastApp = key; apps.push({ tMs: t, name: name ?? "", bundleId: front.bundleId ?? undefined }); }
      }
      frames.push({ kind: "frame", tMs: t, encoded: Buffer.from(shot.base64, "base64"), width: shot.width, height: shot.height,
        displayWidth: shot.displayWidth, displayHeight: shot.displayHeight, displayId: display.id, frontmost: name });
    } catch (error) { log.warn?.("[watch-record] trajectory captureFrame failed", error); }
  }
  function startFrames(forEpoch) {
    frameLoop = (async () => {
      while (!stopping && forEpoch === epoch) {
        const started = now();
        await captureFrame(forEpoch);
        if (frames.length >= FRAME_BUFFER_MAX) {
          frames = frames.filter((_frame, index) => index % 2 === 0);
          frameInterval *= 2;
          log.info?.(`[watch-record] frame buffer halved → ${frames.length} frames, interval now ${frameInterval}ms`);
        }
        const wait = frameInterval - (now() - started);
        if (wait > 0) await sleep(wait);
      }
    })();
  }
  async function currentT() {
    try { const answer = await native.call("watchRecordNowT"); if (typeof answer?.t === "number") nowT = answer.t; } catch {}
    return nowT;
  }

  const clearTimers = () => {
    if (maxTimer) { clearTimer(maxTimer); maxTimer = null; }
    if (warnTimer) { clearTimer(warnTimer); warnTimer = null; }
  };
  /** fza: the window hidden for the recording comes back. */
  function restoreHost() {
    const window = hostWindow, hidden = hostHidden;
    hostHidden = false;
    if (!window || window.isDestroyed() || !hidden) return;
    if (window.isMinimized()) window.restore(); else if (!window.isVisible()) window.show();
  }
  /** QRa: stop the microphone and the recorder. */
  async function stopAllCapture() {
    try { if (micOn) voiceoverStopping ?? stopVoiceover(); } catch (error) { log.warn?.("[watch-record] voiceover.stop failed", error); }
    try { await recorder.stop(); } catch (error) { log.warn?.("[watch-record] stop failed", error); }
  }
  const resetBuffers = () => { rawEvents = []; frames = []; apps = []; lastApp = null; };
  const complete = (payload) => { try { notify(requesterContents, payload); } catch (error) { log.warn?.("[watch-record] notify failed", error); } };

  /**
   * xza / Cza: the chooser, the permission check, then recording. `resumeRecord`: the renderer's retry after the
   * permission dialog skips the chooser (within 2 minutes, same session, purpose and window).
   */
  async function start(requestedSession, resumeRecord = false, { purpose: requestedPurpose = "skill", webContents = null, window = null } = {}) {
    const kind = requestedPurpose === "context" ? "context" : "skill";
    if (platform !== "darwin") { log.info?.("[watch-record] start blocked — unsupported platform"); return RESULT.Cancelled; }
    if (kind === "context") { log.info?.("[watch-record] start blocked — context recording gate disabled"); return RESULT.Cancelled; }
    if (requestedSession !== undefined && requestedSession !== null && (typeof requestedSession !== "string" || !requestedSession)) {
      log.warn?.("[watch-record] start blocked — malformed sessionId");
      return RESULT.Cancelled;
    }
    if (recording) { log.info?.("[watch-record] start ignored — already recording"); return RESULT.Cancelled; }
    if (delivering || held || pillHeld) { log.info?.("[watch-record] start ignored — prior recording still being delivered"); return RESULT.Cancelled; }
    ++epoch;
    const myEpoch = epoch;
    purpose = kind;
    requester = webContents?.id ?? null;
    requesterContents = webContents;
    hostWindow = window;
    recording = true;
    stopping = false;
    sessionId = requestedSession ?? null;
    resetBuffers();
    frameInterval = FRAME_INTERVAL_MS;
    displays = { displayForPoint: (x, y) => { const display = screen.getDisplayNearestPoint({ x, y }); return { id: display.id, bounds: display.bounds }; } };
    const cancel = (value) => { recording = false; sessionId = null; return value; };
    try {
      const resumed = resumeRecord && resume !== null && resume.expiresAt > now() && resume.sessionId === sessionId && resume.purpose === kind && resume.requester === requester ? resume : null;
      resume = null;
      const voiceover = (await recorder.voiceover.available()) ? recorder.voiceover : undefined;
      const choice = resumed ? { choice: "record", micOn: resumed.micOn } : await showChooser(window, voiceover ? await chooserMicOptions() : undefined, kind);
      if (choice.choice === "cancel") { log.info?.("[watch-record] start declined by user"); return cancel(RESULT.Cancelled); }
      const wantsMic = voiceover !== undefined && choice.micOn;
      const granted = await permissions();
      if (!granted.screenRecording || !granted.accessibility) {
        const missing = !granted.screenRecording && !granted.accessibility ? "both" : granted.screenRecording ? "accessibility" : "screen_recording";
        log.warn?.("[watch-record] start blocked — missing macOS TCC permission", { missing });
        resume = { sessionId, expiresAt: resumed?.expiresAt ?? now() + RESUME_TTL_MS, micOn: wantsMic, purpose: kind, requester };
        return cancel(RESULT.NeedsMacPermissions);
      }
      let withMic = wantsMic;
      if (wantsMic && micStatus() !== "granted") {
        withMic = await systemPreferences.askForMediaAccess("microphone");
        if (!withMic) log.warn?.("[watch-record] microphone TCC not granted — recording without voiceover");
      }
      cuEnabledAtStart = computerUseEnabled();
      micOn = withMic;
      micToggling = false;
      resetNarration();
      if (kind !== "context" && window && !window.isDestroyed() && window.isVisible()) { window.hide(); hostHidden = true; }
      await recorder.start();
      nowT = 0;
      if (withMic) {
        try { await recorder.voiceover.start(); }
        catch (error) { log.warn?.("[watch-record] voiceover start failed — recording without voiceover", error); micOn = false; }
      }
      ensurePolling();
      await showPill({ micAvailable: voiceover !== undefined, recordingStartedAtEpochMs: now() - (await currentT()) });
      pillMicState(micOn, 0);
      maxTimer = setTimer(() => {
        log.info?.("[watch-record] max duration reached, auto-delivering");
        autoDone = true;
        autoDoneAt = nowT;
        void done("auto_done");
      }, MAX_DURATION_MS);
      warnTimer = setTimer(() => pillSend("timeWarning", WARNING_LEAD_MS), WARNING_AT_MS);
      startFrames(myEpoch);
      log.info?.(`[watch-record] recording started (session=${sessionId ?? "new"}, mode=trajectory, purpose=${kind})`);
      return RESULT.Started;
    } catch (error) {
      log.warn?.("[watch-record] start failed, rolling back", error);
      clearTimers();
      await stopAllCapture();
      void recorder.clear();
      dismissPillWindow();
      restoreHost();
      micOn = false;
      resetBuffers();
      return cancel(RESULT.Cancelled);
    }
  }

  /** jRa: the pill's microphone button. */
  async function toggleMic() {
    if (!recording || stopping || micToggling || !(await recorder.voiceover.available())) return;
    if (micOn) {
      micToggling = true;
      pillMicState(false, 0);
      const myEpoch = epoch;
      const stopped = stopVoiceover();
      await Promise.race([stopped, sleep(NARRATION_WAIT_MS)]);
      if (epoch === myEpoch && recording && !stopping) { micOn = false; endNarrationSegment(); micToggling = false; }
      return;
    }
    const myEpoch = epoch;
    const status = micStatus();
    if (status === "denied" || status === "restricted") {
      log.info?.("[watch-record] pill mic toggle: OS mic access denied mid-recording");
      pillMicError();
      return;
    }
    // Turning on can take a while (the mic prompt, the first speech-recognition prompt, the audio engine). Discard or
    // Done may land meanwhile: they see the microphone off and skip stopping it, so the late start is undone here.
    micToggling = true;
    const current = () => epoch === myEpoch && recording && !stopping;
    try {
      if (!(status === "granted" || (await systemPreferences.askForMediaAccess("microphone"))) || !current()) return;
      try { await recorder.voiceover.start(); }
      catch (error) { log.warn?.("[watch-record] voiceover start failed", error); if (current()) pillMicError(); return; }
      if (!current()) {
        log.info?.("[watch-record] voiceover came up after the recording ended — stopping it");
        void (voiceoverStopping?.promise ?? stopVoiceover());
        return;
      }
      micOn = true;
    } finally {
      if (epoch === myEpoch) micToggling = false;
    }
  }

  /** wza: Done (or ten minutes). The pill turns to Processing until the renderer has the session showing. */
  async function done(trigger = "done") {
    if (!recording || stopping) return;
    stopping = true;
    clearTimers();
    pillSend("processing");
    const myEpoch = epoch, mySession = sessionId, myPurpose = purpose, cuEnabled = cuEnabledAtStart;
    if (frameLoop) await Promise.race([frameLoop, sleep(SETTLE_MS)]);
    let durationMs = 0;
    try {
      durationMs = autoDone ? autoDoneAt : await currentT();
      await captureFrame(myEpoch);
      await stopAllCapture();
      await pollOnce();
    } catch (error) { log.warn?.("[watch-record] teardown: failed to stop recorder", error); }
    releaseCaptureIndicators();
    restoreHost();
    if (hostWindow && !hostWindow.isDestroyed()) hostWindow.focus();
    const events = rawEvents, recorded = frames, appList = apps, displayContext = displays;
    recording = false; autoDone = false; autoDoneAt = 0; sessionId = null; delivering = true;
    let holdEpoch = -1, handled = false;
    try {
      if (micOn) await awaitNarration();
      const narration = narrationText();
      resetNarration();
      micOn = false; micToggling = false;
      if (epoch === myEpoch) {
        ++epoch;
        resetBuffers();
        void recorder.clear();
        pillEpoch = epoch;
        pillHeld = true;
        holdEpoch = pillEpoch;
        pillHoldTimer = setTimer(() => { log.info?.("[watch-record] pill hold timeout"); releasePill(holdEpoch); }, PILL_HOLD_MS);
      }
      if (recorded.length < 2) {
        log.warn?.(`[watch-record] trajectory dropped — only ${recorded.length} frame(s)`);
        handled = true;
        releasePill(holdEpoch);
        complete({ sessionId: mySession, eventCount: 0, discarded: true, holdEpoch, purpose: myPurpose, dropReason: "too_short" });
        return;
      }
      let built;
      try {
        const roundedDuration = Math.round(durationMs);
        const result = await trajectory.buildTrajectory({ startedAt: now() - roundedDuration, durationMs: roundedDuration, frameIntervalMs: frameInterval,
          frames: recorded, events: events.map((event) => trajectory.normalizeEvent(event, displayContext)), apps: appList, narrationText: narration },
        { images: imageOps, log });
        const blocks = trajectory.trajectoryContentBlocks(result, { computerUseEnabled: cuEnabled });
        built = { ...trajectory.flattenTrajectoryBlocks(blocks), contentBlocks: blocks, itemCount: result.items.length };
        log.info?.(`[watch-record] trajectory built: ${recorded.length} frames → ${result.stats.imagesEmitted} images, ${result.items.length} items, ${blocks.length} blocks`);
      } catch (error) {
        log.error?.("[watch-record] trajectory build failed, dropped", error);
        handled = true;
        releasePill(holdEpoch);
        complete({ sessionId: mySession, eventCount: 0, discarded: true, holdEpoch: -1, purpose: myPurpose });
        return;
      }
      held = { message: built.message, images: built.images, contentBlocks: built.contentBlocks };
      heldSession = mySession;
      heldRequester = requester;
      heldTimer = setTimer(() => { log.warn?.("[watch-record] held recording expired, dropped"); dropHeld(); }, HELD_TTL_MS);
      log.info?.(`[watch-record] held for renderer (mode=trajectory, ${built.images.length} images, session=${mySession ?? "new"})`);
      handled = true;
      complete({ sessionId: mySession, eventCount: built.itemCount, discarded: false, holdEpoch, purpose: myPurpose, trigger });
    } finally {
      delivering = false;
      if (!handled) {
        if (holdEpoch === -1) dismissPillWindow(); else releasePill(holdEpoch);
        complete({ sessionId: mySession, eventCount: 0, discarded: true, holdEpoch: -1, purpose: myPurpose });
      }
    }
  }
  /** aza */
  function dropHeld() {
    held = null; heldSession = null; heldRequester = null;
    if (heldTimer) { clearTimer(heldTimer); heldTimer = null; }
  }

  /** Pza: Discard. Everything captured is dropped: frames, input, narration — nothing reaches the conversation. */
  async function discard() {
    if (!recording || stopping) return;
    stopping = true;
    clearTimers();
    ++epoch;
    await stopAllCapture();
    void recorder.clear();
    recording = false; autoDone = false; autoDoneAt = 0; sessionId = null;
    resetBuffers();
    micOn = false; micToggling = false;
    resetNarration();
    narrationWaiter = null;
    dismissPillWindow();
    restoreHost();
    log.info?.("[watch-record] recording discarded");
    complete({ sessionId: null, eventCount: 0, discarded: true, holdEpoch: -1, purpose });
  }

  /**
   * Tza: the held recording, once, for the window that asked for it — {message, images, contentBlocks} as the
   * original, plus `input` (the blocks as Codex turn input, images staged as files).
   */
  async function take(webContentsId) {
    if (!held) return null;
    if (heldRequester !== webContentsId) { log.warn?.(`[watch-record] held recording access refused for webContents ${webContentsId}`); return null; }
    const taken = held;
    dropHeld();
    log.info?.(`[watch-record] held recording consumed (${taken.images.length} images)`);
    return { ...taken, input: stageImage ? await turnInput(taken.contentBlocks, stageImage) : null };
  }

  /** The renderer showed the session (or gave up): Nza. */
  function dismissPill(holdEpoch) {
    log.info?.(`[watch-record] renderer dismissed pill (epoch=${holdEpoch})`);
    releasePill(holdEpoch);
  }

  function dispose() {
    stopPolling();
    clearTimers();
    if (recording) { recorder.stop().catch(() => undefined); void recorder.clear(); recording = false; }
    dropHeld();
    dismissPillWindow();
    restoreHost();
    if (chooser && !chooser.isDestroyed()) chooser.close();
  }

  return {
    start, done, discard, toggleMic, take, dismissPill, dispose,
    // Tests and the UI script: what is going on, read only.
    state: () => ({ recording, stopping, epoch, purpose, sessionId, micOn, held: !!held, pillHeld, frames: frames.length, events: rawEvents.length,
      chooser: !!(chooser && !chooser.isDestroyed()), pill: !!(pill && !pill.isDestroyed()), hostHidden, glowShown }),
    chooserWindow: () => (chooser && !chooser.isDestroyed() ? chooser : null),
    pillWindow: () => (pill && !pill.isDestroyed() ? pill : null),
    owns: (window) => !!window && (window === chooser || window === pill),
  };
}

/** gIa: grow the chooser by what its page reports it lacks, at most to 400 px. */
function growChooser(window, shortfall) {
  if (!Number.isFinite(shortfall)) return;
  const [width, height] = window.getSize();
  const next = Math.min(CHOOSER_MAX_HEIGHT, height + Math.ceil(shortfall));
  if (next > height) window.setSize(width, next);
}
/** _Ia: the page's choice ("cancel" | {action: "record", micOn}) or null. */
function parseChoice(value) {
  return value === "cancel" ? { choice: "cancel" }
    : typeof value === "object" && value && value.action === "record" ? { choice: "record", micOn: value.micOn === true } : null;
}

/** The trajectory's image steps over Electron's nativeImage (what the original does inline). */
function nativeImageOps(nativeImage) {
  return {
    async decode(encoded, { width }) {
      const image = nativeImage.createFromBuffer(encoded).resize({ width, quality: "good" });
      const size = image.getSize();
      return { bitmap: image.toBitmap(), width: size.width, height: size.height };
    },
    async crop(encoded, region) {
      return nativeImage.createFromBuffer(encoded).crop({ x: region.x, y: region.y, width: region.width, height: region.height }).toJPEG(85);
    },
  };
}

/**
 * The content blocks as Codex turn input: text parts, and each image staged as a file ({type: "localImage", path}).
 * Every text part but the last ends with a newline, as the original's flattened message joins its blocks with one: a
 * core that keeps only the joined text when it reads the session back still has one action per line (the transcript's
 * card reads them line by line, watch-record-model.mjs).
 */
async function turnInput(blocks, stage) {
  const input = [];
  const lastText = blocks.reduce((last, block, index) => (block.type === "text" ? index : last), -1);
  for (const [index, block] of blocks.entries()) {
    if (block.type === "text") input.push({ type: "text", text: index === lastText ? block.text : `${block.text}\n`, text_elements: [] });
    else if (block.type === "image" && block.source?.type === "base64") {
      const staged = await stage({ type: block.source.media_type, bytes: new Uint8Array(Buffer.from(block.source.data, "base64")), name: "watch-record" });
      input.push({ type: "localImage", path: staged.path });
    }
  }
  return input;
}

module.exports = { createWatchRecord, parseChoice, growChooser, turnInput, nativeImageOps, RESULT, PRELOAD,
  CHOOSER_WIDTH, CHOOSER_HEIGHT, CHOOSER_HEIGHT_CONTEXT_MIC, CHOOSER_MAX_HEIGHT, INPUT_PROTECTION_MS, PILL_WINDOW_WIDTH, PILL_WINDOW_HEIGHT,
  PILL_HEIGHT, PILL_BOTTOM_GAP, FRAME_INTERVAL_MS, FRAME_BUFFER_MAX, MAX_DURATION_MS, WARNING_AT_MS, HELD_TTL_MS, PILL_HOLD_MS, RESUME_TTL_MS };
