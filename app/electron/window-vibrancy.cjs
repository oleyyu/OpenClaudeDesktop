"use strict";
// claude.windowVibrancy (host-native, surfaces-prod-2): the main window's macOS material under the sidebar, as the
// official 4.16336.0 main process gives it to its page. Sources (reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build):
//   index.chunk-Du-Wqi0E.js  rnr="sidebarMaterialAsked", anr={vibrancy:"sidebar"}, lnr / unr / dnr / fnr: the main window
//                            is created with vibrancy "sidebar" (then setVibrancy(null)) only when the page asked for the
//                            sidebar's material during the previous run; jwo builds it through unr.
//                            Mto = po(Ato,"WindowVibrancy",jto,{methods:[showUnderSidebar(request: Eto), clear(),
//                            tintUnderSidebar(tint: kto), clearTintUnderSidebar()]}), Nto → createWindowVibrancyImpl.
//   index.chunk-puk2Wpzf.js  createWindowVibrancyImpl (q) and its state machine G / K / H / N / U / D / M / j / k / A / B / z.
//   mainView.js              the preload: globalThis["claude.windowVibrancy"].WindowVibrancy = {showUnderSidebar, clear,
//                            tintUnderSidebar, clearTintUnderSidebar}, each an ipcRenderer.invoke (preload.cjs here).
// The page side (shared-22 Yz / Kz / vz, mounted by the frame dock _B) asks {material, windowColor, sidebarWidth,
// underBootPlaceholder?}: first "appkit-glass" over "solid:#fafafa" (az, behind "flat"), and when told no, "sidebar" over
// "clear"; on true it sets html[data-sidebar-vibrancy] / [data-sidebar-vibrancy-behind] and the official CSS (shared-styles,
// c6a992d55) makes the sidebar a tint over the material.
//
// The native add-on (official Nk("afterLaunch").sidebarGlass, ClaudeSwift/SidebarGlass.swift in swift_addon.node) is
// this app's own native/sidebar-glass/build/sidebar_glass.node, written to the same interface from the reverse-engineered
// official one (glass-native/sidebar-glass-re.json): its `sidebarGlass` namespace has show / hide / setTint / clearTint.
// It loads on the first glass request (P); when it is missing or does not load, `v` is null and the page is told no
// ("this app build has no glass, or its native add-on did not load"), the official branch for an add-on that failed.
//
// Host differences:
//   - The official main window is a shell page with the claude.ai page in a WebContentsView over it; here the main
//     window's page is the app itself, so the window's own webContents and the asking webContents are the same (k()'s two
//     zoom factors are equal) and the cut-out style (j) goes to that page.
//   - Several main windows: the official state `c` belongs to its one main window (Hmt / Vmt); here each full main window
//     has its own state, keyed by the window, and only a full main window's top frame may ask (jto: top frame of the
//     claude.ai origin). The add-on holds one glass for the app (its statics), so glass belongs to one window at a
//     time (`glassOwner`): glass shown in another window first switches the previous one off, and only the owner's
//     switch-off, close or tint reaches the add-on.
//   - The record that the page asked (bo "sidebarMaterialAsked") is a small JSON file in userData.
const nodeFs = require("node:fs");
const path = require("node:path");

const ASKED_KEY = "sidebarMaterialAsked"; // rnr
const ASK_RECORD_TRIES = 3; // inr
const CREATE_WITH = Object.freeze({ vibrancy: "sidebar" }); // anr
// n: the Electron materials the page may name; r / i: the native add-on's glass and AppKit's sidebar glass.
const MATERIALS = Object.freeze(["sidebar", "under-window", "window", "content", "header", "hud", "menu", "popover", "sheet", "fullscreen-ui", "under-page"]);
const GLASS = "glass", APPKIT_GLASS = "appkit-glass";
const isGlass = (material) => material === GLASS || material === APPKIT_GLASS; // a
const GLASS_WIDER = 64; // F: the plain glass reaches this far past the sidebar, under the page's own ground
// The add-on (P / Nk): unpacked beside app.asar in the packaged app (dlopen cannot read inside an archive).
const NATIVE_MODULE = path.join(__dirname, "..", "native", "sidebar-glass", "build", "sidebar_glass.node");
function loadNativeAddOn(file = NATIVE_MODULE.replace(/app\.asar(?=[\\/])/, "app.asar.unpacked")) {
  return process.platform === "darwin" ? require(file) : null;
}
const WINDOW_COLORS = Object.freeze(["clear", "keep"]); // o
const GLASS_BEHIND = /^(?:(?<word>clear|system)|solid:#(?<hex>[0-9a-f]{6}))$/; // s
// O: run in the window's page; null removes the style.
const GROUND_SCRIPT = String.raw`(function (css) {
  let style = document.getElementById("window-vibrancy-ground");
  if (css === null) { style?.remove(); return; }
  if (!style) { style = document.createElement("style"); style.id = "window-vibrancy-ground"; document.head.prepend(style); }
  style.textContent = css;
})`;

// Eto / Tto / wto and kto / Dto / Oto: the IPC argument validators.
const shortString = (value) => typeof value === "string" && value.length <= 32;
const validRequest = (value) => !!value && typeof value === "object" && shortString(value.material) && shortString(value.windowColor)
  && typeof value.sidebarWidth === "number" && value.sidebarWidth >= 0 && value.sidebarWidth <= 1e4
  && (value.underBootPlaceholder === undefined || typeof value.underBootPlaceholder === "boolean");
const channel = (value) => typeof value === "number" && value >= 0 && value <= 255;
const validTint = (value) => !!value && typeof value === "object" && channel(value.red) && channel(value.green) && channel(value.blue)
  && typeof value.alpha === "number" && value.alpha >= 0 && value.alpha <= 1;
// R: a tint the native add-on takes (rgba packed), or null.
function packTint({ red, green, blue, alpha }) {
  const byte = (n) => Number.isInteger(n) && n >= 0 && n <= 255;
  if (!byte(red) || !byte(green) || !byte(blue) || !Number.isFinite(alpha) || alpha <= 0 || alpha > 1) return null;
  return (red * 16777216 + green * 65536 + blue * 256 + Math.round(alpha * 255)) >>> 0;
}

function createWindowVibrancy({
  nativeTheme,
  windowColor, // (dark) => the window's own background (official S() = qY[$M]; host window-chrome.cjs windowBackground)
  recordFile, // () => path of the JSON record (bo "sidebarMaterialAsked")
  fs = nodeFs,
  log = console,
  systemVersion = () => (typeof process.getSystemVersion === "function" ? process.getSystemVersion() : ""),
  nativeGlass, // the add-on's sidebarGlass namespace; undefined = load it on the first glass request (P), null = none
  loadNative = loadNativeAddOn, // () => the add-on module, whose `sidebarGlass` is the namespace
} = {}) {
  const able = new WeakSet(); // onr
  let recorded = false, recordTries = 0; // snr, cnr
  const states = new Map(); // window → c
  const generation = new WeakMap(); // window → b
  const watched = new WeakSet(), watchedContents = new WeakSet();
  const told = { cannotShow: new WeakSet(), noGlass: new WeakSet(), appKitOld: new WeakSet(), unknownBehind: new WeakSet(), tintFailed: new WeakSet() };
  let themeWatched = false;
  let v = nativeGlass, loading = null; // v / y
  let glassOwner = null; // the window whose page has the add-on's one glass (host: several main windows)
  const waitedShow = new WeakMap(); // x
  const themeColor = () => windowColor(!!nativeTheme?.shouldUseDarkColors); // S
  const live = (window) => !!window && !window.isDestroyed() && !window.webContents.isDestroyed(); // C
  const bump = (window) => { const next = (generation.get(window) ?? 0) + 1; generation.set(window, next); return next; };
  // E: the request is still the window's latest and the window is alive.
  const current = (window, gen) => generation.get(window) === gen && live(window);
  // w: the window's AppKit window number ("window:<number>:0").
  const windowNumber = (window) => Number(window.getMediaSourceId().split(":")[1]);
  // T: the window has been shown once.
  function shown(window) {
    let pending = waitedShow.get(window);
    if (!pending) { pending = new Promise((resolve) => { window.once("show", () => resolve()); }); waitedShow.set(window, pending); }
    return pending;
  }
  // P: load the add-on once.
  function loadGlass() {
    return (loading ??= Promise.resolve().then(() => loadNative()).then((addOn) => { v = addOn?.sidebarGlass ?? null; }).catch((error) => {
      v = null;
      log.warn?.("[window-vibrancy] could not load the app's native add-on, so glass cannot be shown under the sidebar until the app is restarted", { errorType: error?.name ?? typeof error });
    }));
  }

  // bo get / delete / set over one JSON file.
  function readRecord() {
    try { return JSON.parse(fs.readFileSync(recordFile(), "utf8")) ?? {}; } catch (error) { if (error?.code === "ENOENT") return {}; throw error; }
  }
  function writeRecord(record) {
    const file = recordFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(record));
  }
  // lnr: read and clear the record that the page asked during the previous run.
  function takeAsked() {
    recorded = false; recordTries = 0;
    try {
      const record = readRecord();
      if (record[ASKED_KEY] !== true) return false;
      delete record[ASKED_KEY];
      writeRecord(record);
      return true;
    } catch (error) {
      log.warn?.("[window-vibrancy] could not read or clear the record that the page asked for the sidebar's material; the main window is created opaque", { errorType: error?.name ?? typeof error });
      return false;
    }
  }
  // unr: build the main window, able to show the material when the page asked for it last time.
  function createMainWindow(options, construct) {
    if (!takeAsked()) return construct(options);
    const window = construct({ ...options, ...CREATE_WITH });
    try { window.setVibrancy(null); able.add(window); } catch (error) {
      log.warn?.("[window-vibrancy] could not take the material off the new main window; the sidebar stays solid in it", { errorType: error?.name ?? typeof error });
    }
    return window;
  }
  const canShow = (window) => able.has(window); // dnr
  // fnr: remember (at most three tries per run) that the page asked, so the next main window is created able.
  function recordAsked() {
    if (recorded || recordTries >= ASK_RECORD_TRIES) return;
    recordTries += 1;
    try { writeRecord({ ...readRecord(), [ASKED_KEY]: true }); recorded = true; } catch (error) {
      log.warn?.("[window-vibrancy] could not record that the page asked for the sidebar's material; unless a later try succeeds, the next main window is created opaque", { errorType: error?.name ?? typeof error });
    }
  }

  // k / A: the sidebar strip in the window's page pixels, capped at half the window.
  function strip(state) {
    const zoom = state.win.webContents.getZoomFactor();
    const sidebar = Math.ceil(state.sidebarWidth * zoom / zoom);
    const cap = Math.floor(state.win.getContentSize()[0] / zoom / 2);
    return { sidebar, cap, width: Math.min(sidebar, cap) };
  }
  // j: the window's page is clear under the sidebar and its own colour everywhere else.
  const groundCss = (state) => `body{background-color:transparent !important}body::before{content:'';position:fixed;inset:0;z-index:-1;background-color:${themeColor()};clip-path:inset(0 0 0 ${strip(state).width}px)}body:has([data-load-error-overlay])::before{clip-path:none}#boot-placeholder-sidebar{display:none !important}`;
  // M
  function setGround(window, css, onFail) {
    window.webContents.executeJavaScript(`(${GROUND_SCRIPT})(${JSON.stringify(css)})`).catch((error) => {
      onFail?.();
      log.warn?.(css === null ? "[window-vibrancy] could not restore the background of the main window's own page; the strip under the sidebar shows the window's colour until that page reloads or the next request"
        : "[window-vibrancy] could not cut the background of the main window's own page under the sidebar; the sidebar will look solid, or keep its last width", { errorType: error?.name ?? typeof error });
    });
  }
  // N
  function refresh(window, force = false) {
    const state = states.get(window);
    if (!state || !live(state.win)) return;
    const css = state.underBootPlaceholder ? null : groundCss(state);
    if (force || css !== state.css) { state.css = css; setGround(state.win, css, () => { if (state.css === css) state.css = null; }); }
  }
  // D: hold Electron's window colour clear while the material shows; colours set meanwhile are kept for the release.
  function holdClear(window, first) {
    let restore = first && window.getBackgroundColor().toLowerCase() === "#000000" ? "#00000000" : themeColor();
    window.setBackgroundColor("#00000000");
    const own = Object.getOwnPropertyDescriptor(window, "setBackgroundColor");
    Object.defineProperty(window, "setBackgroundColor", { configurable: true, writable: true, value: (color) => { restore = color; } });
    return () => {
      if (own) Object.defineProperty(window, "setBackgroundColor", own); else delete window.setBackgroundColor;
      if (!window.isDestroyed()) window.setBackgroundColor(restore);
    };
  }
  // B / V: the native add-on's tint and glass (only the glass owner's reach the add-on).
  function clearTint(window) {
    const state = states.get(window);
    if (state) state.tint = undefined;
    if (glassOwner && glassOwner !== window) return;
    try { v?.clearTint?.(); } catch (error) { log.warn?.("[window-vibrancy] the native add-on failed while taking the tint off the glass under the sidebar", { errorType: error?.name ?? typeof error }); }
  }
  function hideGlass(window) {
    if (glassOwner !== window) return;
    glassOwner = null;
    try { v?.hide(); } catch (error) { log.warn?.("[window-vibrancy] the app's native add-on failed while removing the glass under the sidebar; the glass may stay in the window until the app is quit", { errorType: error?.name ?? typeof error }); }
  }
  // H: material off, page ground restored, window colour released.
  function switchOff(window) {
    bump(window);
    const state = states.get(window);
    states.delete(window);
    if (!state) return;
    try {
      if (state.material !== null) log.info?.("[window-vibrancy] material switched off");
      hideGlass(window);
      if (live(state.win)) {
        if (state.material !== null && state.material !== GLASS) state.win.setVibrancy(null);
        setGround(state.win, null);
      }
    } finally { state.releaseColor?.(); }
  }
  // U: follow the theme, the window's life and the page's navigations.
  function watch(window) {
    if (!themeWatched && nativeTheme?.on) { themeWatched = true; nativeTheme.on("updated", () => { for (const w of states.keys()) refresh(w); }); }
    if (!watched.has(window)) {
      watched.add(window);
      window.once("closed", () => { if (states.has(window)) { hideGlass(window); states.delete(window); } });
    }
    const contents = window.webContents;
    if (!watchedContents.has(contents)) {
      watchedContents.add(contents);
      contents.on("did-finish-load", () => refresh(window, true));
      contents.on("did-navigate", () => switchOff(window));
      contents.on("render-process-gone", () => switchOff(window));
      contents.on("did-fail-load", (_event, code, _description, _url, isMainFrame) => { if (isMainFrame && code !== -3) switchOff(window); });
    }
  }
  // W: AppKit's sidebar glass needs macOS 27. The major version as the official VA() reads it: a version without a
  // "major.minor" shape reads as major 0 (not before 27).
  const before27 = () => { const parts = String(systemVersion()).split("."); const major = parts.length < 2 ? 0 : Number.parseInt(parts[0], 10); return major > 0 && major < 27; };

  // G: show the asked material under the sidebar of `window`; true when shown (a promise of it while the add-on loads).
  function showUnderSidebar(window, request) {
    bump(window);
    if (request.material === APPKIT_GLASS && before27()) {
      switchOff(window);
      if (!told.appKitOld.has(window)) { told.appKitOld.add(window); log.info?.(`[window-vibrancy] AppKit's glass under the sidebar needs macOS 27 or later; this Mac runs macOS ${systemVersion()}. The claude.ai page is told no and can ask for another material`); }
      return false;
    }
    if (!isGlass(request.material) || v !== undefined) return place(window, request);
    const gen = generation.get(window);
    if (live(window)) watch(window);
    return loadGlass().then(() => current(window, gen) && place(window, request));
  }
  // I: the add-on shows the glass; without one the answer is no.
  function showGlass(state) {
    const { behind, appKitSidebar } = state;
    const width = strip(state).width * state.win.webContents.getZoomFactor() + (appKitSidebar ? 0 : GLASS_WIDER), number = windowNumber(state.win);
    try {
      return v?.show({ windowNumber: number, width, backing: typeof behind === "number" ? behind : undefined, ...(behind === "system" && { systemBacking: true }), ...(appKitSidebar && { appKitSidebar }) }) === true;
    } catch (error) {
      log.warn?.("[window-vibrancy] the app's native add-on failed while showing glass under the sidebar; the glass is taken out and the claude.ai page is told no", { errorType: error?.name ?? typeof error });
      return false;
    }
  }
  // L: tint the glass with the state's tint; false when it cannot.
  function applyTint(state) {
    const { sidebar, cap, width } = strip(state);
    if (state.tint === undefined || typeof v?.setTint !== "function" || sidebar > cap) return false;
    try { return v.setTint({ rgba: state.tint, width: width * state.win.webContents.getZoomFactor() }) === true; } catch (error) {
      if (!told.tintFailed.has(state.win)) { told.tintFailed.add(state.win); log.warn?.("[window-vibrancy] the native add-on failed while tinting the glass under the sidebar; the tint is taken off", { errorType: error?.name ?? typeof error }); }
      return false;
    }
  }
  // K: `waited` once the window has been shown for glass.
  function place(window, request, waited = false) {
    const glass = isGlass(request.material);
    const material = glass ? GLASS : MATERIALS.find((m) => m === request.material);
    const appKit = request.material === APPKIT_GLASS;
    const behind = glass ? GLASS_BEHIND.exec(request.windowColor)?.groups : undefined;
    const color = glass ? behind && "clear" : WINDOW_COLORS.find((c) => c === request.windowColor);
    if (!material || !color || !live(window)) {
      switchOff(window);
      if (glass && !behind && live(window) && !told.unknownBehind.has(window)) { told.unknownBehind.add(window); log.info?.('[window-vibrancy] glass not shown under the sidebar: the claude.ai page asked for something behind it that this app build does not know. It knows "clear", "system", and "solid:" followed by a colour as lower-case #rrggbb; a newer version of the app may know more. The claude.ai page is told no and can ask for another material'); }
      return false;
    }
    recordAsked();
    if (!canShow(window)) {
      switchOff(window);
      if (!told.cannotShow.has(window)) { told.cannotShow.add(window); log.info?.("[window-vibrancy] sidebar material not shown: this window cannot show it. Quit and reopen the app: the next window is created able to show it"); }
      return false;
    }
    watch(window);
    // The add-on finds the window by its number, which it has only once shown.
    if (material === GLASS && v && !waited && !(windowNumber(window) > 0)) {
      switchOff(window);
      const gen = generation.get(window);
      return shown(window).then(() => current(window, gen) && place(window, request, true));
    }
    let state = states.get(window) ?? null;
    const kindSwitched = state?.material != null && (state.material === GLASS) !== (material === GLASS);
    if (!state || kindSwitched) { switchOff(window); state = { win: window, material: null, sidebarWidth: 0, css: null }; states.set(window, state); }
    const changed = state.material !== material;
    const clear = color === "clear";
    const colorChanged = !!state.releaseColor !== clear;
    if (clear) state.releaseColor ??= holdClear(window, state.material === null);
    else { state.releaseColor?.(); state.releaseColor = undefined; }
    state.sidebarWidth = request.sidebarWidth;
    const wasUnderPlaceholder = state.underBootPlaceholder === true;
    state.underBootPlaceholder = request.underBootPlaceholder === true;
    const word = behind?.word === "system" ? "system" : "clear";
    const behindValue = behind?.hex ? Number.parseInt(behind.hex, 16) : behind && word;
    const behindChanged = state.behind !== behindValue || !!state.appKitSidebar !== appKit;
    state.behind = behindValue; state.appKitSidebar = appKit;
    if (material === GLASS) {
      // One glass for the app: another window's goes first (host, several main windows).
      if (glassOwner && glassOwner !== window) switchOff(glassOwner);
      glassOwner = window;
      if (!showGlass(state)) {
        switchOff(window);
        const toldNo = appKit ? told.appKitOld : told.noGlass;
        if (!toldNo.has(window)) { toldNo.add(window); log.info?.(v ? `[window-vibrancy] ${appKit ? "AppKit's sidebar glass" : "glass"} not shown under the sidebar: the app's native add-on did not show it, and on macOS older than ${appKit ? 27 : 26} it never does (this Mac runs macOS ${systemVersion()}). The claude.ai page is told no and can ask for another material` : "[window-vibrancy] glass not shown under the sidebar: this app build has no glass, or its native add-on did not load. The claude.ai page is told no and can ask for another material"); }
        return false;
      }
      if (state.tint !== undefined && !applyTint(state)) clearTint(window);
    } else if (changed) window.setVibrancy(material);
    state.material = material;
    if (changed || colorChanged || behindChanged) {
      const drawn = appKit ? ", drawn by AppKit's sidebar" : "";
      const put = behind?.hex ? `, with the solid colour #${behind.hex} put behind the glass` : behindValue === "system" ? ", with the system's window colour put behind the glass" : "";
      log.info?.(`[window-vibrancy] showing the macOS "${material}" material under the sidebar${drawn}${put}; Electron's window colour ${clear ? "held clear" : "left as it is"}${state.underBootPlaceholder ? "; the boot placeholder stays over the material until the claude.ai page asks again after it shows" : ""}`);
    }
    if (wasUnderPlaceholder && !state.underBootPlaceholder) log.info?.("[window-vibrancy] the claude.ai page is showing; the boot placeholder gives way to the material under the sidebar");
    refresh(window);
    return true;
  }
  // z: tint the glass (glass only).
  function tintUnderSidebar(window, tint) {
    const state = states.get(window);
    const packed = packTint(tint);
    if (!state || state.material !== GLASS || !live(state.win) || packed === null) { clearTint(window); return false; }
    state.tint = packed;
    if (applyTint(state)) return true;
    clearTint(window);
    return false;
  }
  // q: the four methods for one window's page.
  const implFor = (window) => ({
    showUnderSidebar: (request) => showUnderSidebar(window, request),
    clear: () => { switchOff(window); },
    tintUnderSidebar: (tint) => tintUnderSidebar(window, tint),
    clearTintUnderSidebar: () => { clearTint(window); },
  });
  return { createMainWindow, canShow, implFor, stateOf: (window) => states.get(window) ?? null, CREATE_WITH };
}

// The IPC surface (Mto's methods over one host channel). `windowOf(event)` answers the full main window whose top frame
// sent the call, or null (jto + q's `n()`); a call from anywhere else gets false / nothing, as the official n() does.
const IPC_CHANNEL = "claude.windowVibrancy:WindowVibrancy";
const METHODS = Object.freeze({
  showUnderSidebar: { validate: validRequest, answers: true },
  clear: { validate: null, answers: false },
  tintUnderSidebar: { validate: validTint, answers: true },
  clearTintUnderSidebar: { validate: null, answers: false },
});
function installWindowVibrancyIpc(ipcMain, vibrancy, windowOf) {
  ipcMain.handle(IPC_CHANNEL, (event, method, arg) => {
    const spec = Object.hasOwn(METHODS, method) ? METHODS[method] : null;
    if (!spec) throw new Error("Unknown WindowVibrancy method.");
    if (spec.validate && !spec.validate(arg)) throw new Error(`WindowVibrancy.${method}: invalid argument.`);
    const window = event.senderFrame && event.senderFrame.parent === null ? windowOf(event) : null;
    if (!window) return spec.answers ? false : undefined;
    const result = vibrancy.implFor(window)[method](arg);
    if (!spec.answers) return undefined;
    return typeof result?.then === "function" ? result.then((answer) => answer === true) : result === true;
  });
}

module.exports = { createWindowVibrancy, installWindowVibrancyIpc, IPC_CHANNEL, MATERIALS, validRequest, validTint, packTint, GROUND_SCRIPT, ASKED_KEY, NATIVE_MODULE, loadNativeAddOn };
