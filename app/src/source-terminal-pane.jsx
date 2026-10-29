import {installTerminalCommands} from "./generated/code-current/terminal-commands.mjs";
import {terminalAttachmentText} from "./generated/code-current/terminal-selection.mjs";
import {attachVisibleTerminalOutput} from "./generated/code-current/terminal-output.mjs";
import {terminalOwnsContextMenu} from "./generated/code-current/terminal-mouse.mjs";
import {installTerminalColorPolicy} from "./generated/code-current/terminal-colors.mjs";
import {selectionBlocksTerminalLink} from "./generated/code-current/terminal-link-selection.mjs";
import {TerminalIdleCursor} from "./generated/code-current/terminal-idle-cursor.mjs";
import {TerminalClearItem, mountedTerminalViews} from "./generated/code-current/terminal-clear-item.mjs";
import {routeTerminalKey,installTerminalCopyEvent} from "./terminal-event-routing.mjs";
import {handleTerminalNavigation} from "./terminal-navigation.mjs";
import {terminalViewSettings, terminalViewMenu, terminalViewOptions} from './terminal-view-settings.mjs';
import {TerminalSelectionAction} from './source-terminal-selection.jsx';
import {observeTerminalSelection} from './terminal-selection-controller.mjs';
import {installTerminalCopyOnSelect,terminalSelectionText} from './terminal-copy-selection.mjs';
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
// w11-e31-terminal-cont: the close confirmation (cccc2cf0a Zx Ie) and the body menu (cS items) are view-tabs CDS parts
// (R6 facade).
import { CdsConfirmationDialog, CdsContextMenu, CdsRoot } from "./generated/view-tabs/index.js";
// cccc2cf0a iS → c0cdf4a08 g (kf, the context menu around the terminal): session-rail-changes already slices it from
// 3.6556.2 (RowContextMenu, with cd59309dc's open marker), so the pane imports that slice (D1) instead of a second one.
import { RowContextMenu } from "./generated/session-rail-changes/row-context-menu.mjs";
// cccc2cf0a cS: the Attach item's chord is `X("attachTerminalOutput", c)` (X = shared-46 iR, the keybinding table that
// session-rail-changes slices as commandShortcut; c = shared-25 vh isDesktopClient, true in the host).
import { commandShortcut } from "./generated/session-rail-changes/command-shortcut.mjs";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { useCodeThemes } from "./code-theme-store.mjs";
import { useReducedMotion } from "./use-reduced-motion.js";
import {SourceTerminalFind} from "./source-terminal-find.jsx";
// 3.6556.2 c6bf19e8f / cccc2cf0a import cc0a875c8 t (EmptyState): the generated slice, not a host copy.
import { EmptyState } from "./generated/r3b-transcript/empty-state.mjs";
// w10-ccres-e31-terminal: the strip is the official ViewTabBar (cfe7c4b3b t) through the host wrapper that supplies
// direction and density, as the side chat strip (source-btw-pane.jsx) uses it.
import { SourceViewTabBar } from "./source-view-tabs.jsx";
import { useSourceToasts } from "./source-toast.jsx";
// R3-files FT-18 owns the drag (src/file-context-drag.mjs); it re-exports draggedFilePaths from the one module instance
// every drop target shares, so the pane reads it there instead of from generated/code-editor directly.
import { acceptsFileContextDrag, draggedFilePaths } from "./file-context-drag.mjs";
import { terminalTitles } from "./terminal-titles.mjs";
import {
  DROP_ERRORS, FOLDER_GONE, KEY_SEQUENCES, MINIMUM_CONTRAST_RATIO, acquireTerminalView, closeTerminalTab, installTerminalLinks,
  liveTerminalConfirm, renameDraft, restartTerminalTab, safeWebUrl, shouldAutoClose, tabLabel, terminalCoverState, terminalDropText,
  terminalError, terminalFont, terminalFontSize, terminalKeyAction, terminalStripTabs, terminalTheme,
} from "./terminal-pane-model.mjs";
import { ownerKeyOf, terminalStore } from "./terminal-store.mjs";
// w10-trans-terminal-inline-error (3.6556.2 c6bf19e8f Ei → ca41b3815 setInlineError): a failed shell start also reaches
// the code block run typed into this tab.
import { terminalInlineErrors } from "./terminal-inline-error-store.mjs";
import { startFailedTerminals, terminalPanes } from "./terminal-registry-host.mjs";
import { MAX_TERMINALS_PER_OWNER } from "../electron/terminal-model.mjs";
import { t, tn, getLocale } from "../electron/i18n/index.mjs";
import "./source-terminal-pane.css";

// Terminal pane. Host component standing in for the 3.6556.2 terminal pane (cccc2cf0a Zx strip + iS body, c6bf19e8f
// ShellTerminal; w10-ccres-e31-terminal maps each piece in reports/W10/w10-ccres-e31-terminal.md). The strip is the
// official ViewTabBar (cfe7c4b3b t = cccc2cf0a `ey`) with Zx's tabs, labels and handlers, and its tab menu carries the
// generated Clear terminal (cccc2cf0a sS, renderTabMenuItems). The other original pieces come from generated/code-current
// (3.6556.2): output/geometry/mouse/colors/link-selection/errors (c6bf19e8f), titles/idle cursor/registry (cf718f694).
// A tile like Changes/Files/Plan: the strip sits in the 32px pane header (ViewTabBar with its own + and overflow menu,
// then the drag handle and the pane controls), the body is one xterm per tab. The shells run in the main process
// (electron/terminal-service.cjs) and keep running while another session shows; this pane only attaches to them.
//
// Props: sessionId (null on the New session page, which then passes homeWorkspace), cwd (the folder the shells start
// in, for path links), headerCenter (the tile drag handle), controls (SourcePaneControls), onClosePane (closing the last
// tab closes the pane), onOpenFile({path,line}) (Files pane), onOpenExternal(url, event) (a plain click on a local page opens Preview), focusRequest (a changing value that
// moves focus into the active terminal).

const xtermModules = { promise: null };
function loadXterm() {
  if (!xtermModules.promise) {
    xtermModules.promise = Promise.all([
      import("@xterm/xterm"), import("@xterm/addon-fit"), import("@xterm/addon-search"), import("@xterm/addon-unicode11"),
      import("@xterm/addon-web-links"), import("@xterm/xterm/css/xterm.css"),
    ]).then(([xterm, fit, search, unicode, links]) => {
      // xterm's own screen-reader strings (its helper textarea's label, the too-much-output announcement) in the UI language.
      try {
        xterm.Terminal.strings.promptLabel = t("Terminal input");
        xterm.Terminal.strings.tooMuchOutput = t("Too much output to announce, navigate to rows manually to read");
      } catch { /* an xterm without localizable strings keeps its English */ }
      return {
        Terminal: xterm.Terminal, FitAddon: fit.FitAddon, SearchAddon: search.SearchAddon, Unicode11Addon: unicode.Unicode11Addon,
        WebLinksAddon: links.WebLinksAddon,
      };
    });
    xtermModules.promise.catch(() => { xtermModules.promise = null; });
  }
  return xtermModules.promise;
}
// The WebGL renderer is optional: a context loss (or no WebGL) leaves the DOM renderer in place.
let webglModule = null;
function loadWebgl() {
  if (!webglModule) webglModule = import("@xterm/addon-webgl").then((module) => module.WebglAddon).catch(() => null);
  return webglModule;
}
const themeColorCache = new Map();
function loadThemeColors(id) {
  if (!themeColorCache.has(id)) themeColorCache.set(id, import("./highlight-theme-loaders.mjs").then((module) => module.themeColors(id)).catch(() => null));
  return themeColorCache.get(id);
}

// Root appearance: light/dark mode, the code font chain and the root font size, re-read when main.jsx changes them.
function readAppearance() {
  if (typeof document === "undefined") return "light||16";
  const root = document.documentElement, style = getComputedStyle(root);
  return `${root.dataset.mode === "dark" ? "dark" : "light"}|${style.getPropertyValue("--cds-font-code").trim()}|${parseFloat(style.fontSize) || 16}`;
}
function subscribeAppearance(listener) {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "style", "class", "data-font"] });
  return () => observer.disconnect();
}
function useAppearance() {
  const key = useSyncExternalStore(subscribeAppearance, readAppearance, () => "light||16");
  return useMemo(() => {
    const [mode, codeFont, root] = key.split("|");
    return { mode, codeFont, rootPx: Number(root) || 16 };
  }, [key]);
}

const store = () => terminalStore();
const NO_TABS = [];
// The last focus request taken (main.jsx counts up when the pane opens): shared by every pane instance, so a pane that
// mounts again on a session switch never pulls focus for an old request.
let handledFocusRequest = null;
// cccc2cf0a $x / eS / tS / nS: the body menu's focus hand-back. Closing the menu (we: `e ? eS() : tS(ke(me.current))`)
// arms the trigger's document until its next pointerdown (captured); a mouseup on the trigger (Ee) while still armed,
// with nothing focused, gives the terminal its focus back (`nS(e) && (e.activeElement === null || e.activeElement ===
// e.body) && Ra(b)`, Ra = shared-7 RB, the terminal focus request). The pane disarms on unmount (`C(wS, [])`).
let menuFocusReturnArm = null;
function disarmMenuFocusReturn() {
  const arm = menuFocusReturnArm;
  menuFocusReturnArm = null;
  arm?.forget();
}
function armMenuFocusReturn(doc) {
  disarmMenuFocusReturn();
  doc.addEventListener("pointerdown", disarmMenuFocusReturn, true);
  menuFocusReturnArm = { doc, forget: () => doc.removeEventListener("pointerdown", disarmMenuFocusReturn, true) };
}
function takeMenuFocusReturn(doc) {
  const armed = menuFocusReturnArm?.doc === doc;
  disarmMenuFocusReturn();
  return armed;
}

export function SourceTerminalPane({
  sessionId = null, homeWorkspace = null, cwd = null, headerCenter = null, controls = null, onClosePane, onOpenFile, onOpenExternal,
  focusRequest = null, onAttachSelection = null, fileDragOwner = null,
}) {
  const terminals = store();
  const titles = terminalTitles();
  const titleState = useSyncExternalStore(titles.subscribe, titles.snapshot, titles.snapshot);
  const toasts = useSourceToasts();
  const viewSettingsStore = terminalViewSettings();
  const viewSettings = useSyncExternalStore(viewSettingsStore.subscribe, viewSettingsStore.getSnapshot, viewSettingsStore.getSnapshot);
  const owner = ownerKeyOf(sessionId, homeWorkspace);
  const version = useSyncExternalStore(terminals.subscribe, terminals.version, () => 0);
  const state = terminals.get(owner);
  const tabs = state?.tabs ?? NO_TABS;
  const active = tabs.find((tab) => tab.id === state?.active) ?? tabs[0] ?? null;
  const [error, setError] = useState(null);
  // cccc2cf0a Rg/Bg: the terminal module (or the preload bridge) is missing; only a reload can bring it back.
  const [loadFailed, setLoadFailed] = useState(!terminals.available);
  // { kind: "close"|"close-others", id, count }: the tab's name is read live (cccc2cf0a Vy ne), see liveTerminalConfirm.
  const [confirm, setConfirm] = useState(null);
  // c6bf19e8f pi A for a view that failed to come up ({id, error: {kind:"raw",text}|loadFailed}); Try again retries it.
  const [viewError, setViewError] = useState(null);
  const [viewAttempt, setViewAttempt] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [backend, setBackend] = useState(null);
  const [selectionAnchor,setSelectionAnchor]=useState(null);
  const searchSelecting=useRef(false);
  const [bodySelection, setBodySelection] = useState(""); // cccc2cf0a iS Me: the selection the body menu acts on
  const [attached, setAttached] = useState(0); // announces "Terminal output attached to chat"
  const hadTabs = useRef(null); // the owner whose tabs were seen (a session switch can reuse this pane)
  const creating = useRef(false);
  const host = useRef(null), pane = useRef(null);
  const viewRef = useRef(null);
  const hintId = useId();
  const reducedMotion = useReducedMotion();

  const create = useCallback(async () => {
    if (!owner || creating.current) return null;
    creating.current = true;
    try {
      const size = viewRef.current?.term ? { cols: viewRef.current.term.cols, rows: viewRef.current.term.rows } : {};
      const info = await terminals.create(owner, sessionId, homeWorkspace, size);
      setError(null);
      return info;
    } catch (failure) {
      setError(terminalError(failure, t("Failed to open terminal tab")));
      return null;
    } finally { creating.current = false; }
  }, [owner, sessionId, homeWorkspace, terminals]);

  // Open: list this owner's terminals once, and start one when there is none.
  useEffect(() => {
    if (!owner || !terminals.available) return undefined;
    let alive = true;
    terminals.backend().then((value) => { if (alive) setBackend(value?.backend ?? null); });
    terminals.load(owner, sessionId, homeWorkspace).then((loaded) => {
      if (!alive) return;
      if (loaded && loaded.tabs.length === 0) void create();
    }, (failure) => { if (alive) setError(terminalError(failure, t("Failed to list terminal tabs"))); });
    return () => { alive = false; };
  }, [owner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing the last tab closes the pane (official); auto-close a tab whose shell exited cleanly or after `exit`.
  useEffect(() => {
    if (tabs.length) { hadTabs.current = owner; return; }
    if (hadTabs.current === owner && state?.loaded) { hadTabs.current = null; onClosePane?.(); }
  }, [tabs.length, state?.loaded, owner]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const openIds = new Set(tabs.map((tab) => tab.id));
    for (const id of [...startFailedTerminals]) if (!openIds.has(id)) startFailedTerminals.delete(id);
    for (const tab of tabs) {
      // c6bf19e8f shell_pty_close → Ce(ptyKey): an exited shell drops its running command / title (a command cut off
      // by the exit never sends its D mark). The view's tracker stays installed for a restart.
      if (tab.status === "exited") titles.forget(tab.id);
      else if (tab.status === "running") startFailedTerminals.delete(tab.id);
      if (shouldAutoClose(tab, terminals.lastEnter(tab.id))) void terminals.close(owner, sessionId, homeWorkspace, tab.id);
    }
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  // Appearance → xterm options.
  const appearance = useAppearance();
  const codeThemes = useCodeThemes();
  const themeId = codeThemes?.[appearance.mode] ?? null;
  const [themeColors, setThemeColors] = useState(null);
  useEffect(() => {
    let alive = true;
    setThemeColors(null);
    if (themeId && !themeId.startsWith("claude-")) loadThemeColors(themeId).then((colors) => { if (alive) setThemeColors(colors); });
    return () => { alive = false; };
  }, [themeId]);
  const [surface, setSurface] = useState(null);
  useLayoutEffect(() => {
    if (pane.current && typeof getComputedStyle === "function") setSurface(getComputedStyle(pane.current).backgroundColor || null);
  }, [appearance.mode]);
  const theme = useMemo(() => terminalTheme({ themeId, mode: appearance.mode, colors: themeColors, surface }),
    [themeId, appearance.mode, themeColors, surface]);
  const options = useMemo(() => ({ theme, fontFamily: terminalFont(appearance.codeFont), fontSize: terminalFontSize(appearance.rootPx),
    ...terminalViewOptions(viewSettings,reducedMotion) }), [theme, appearance.codeFont, appearance.rootPx, reducedMotion, viewSettings]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Links: http(s) through the app's external opener; file paths the main process confirms open in the Files pane.
  const handlers = useRef({});
  handlers.current = {
    // The click rides along: a plain click on a local page opens it in Preview, ⌘-click in the browser (main.jsx).
    web: (url, event) => { const safe = safeWebUrl(url); if (safe) onOpenExternal?.(safe, event ?? null); },
    file: (relative, line) => onOpenFile?.({ path: relative, ...(line ? { line } : {}) }),
    paths: (list, id) => terminals.paths(sessionId, homeWorkspace, list, id),
    clear: (id) => terminals.clear(sessionId, homeWorkspace, id),
    folder: cwd,
    selectionSuppressed: () => searchSelecting.current,
    key: null,
    attachVisible: term => {
      if (!attachVisibleTerminalOutput(term,onAttachSelection?handlers.current.attach:null) && term.hasSelection()) setSelectionAnchor(null);
    },
    // Keyboard, selection action and body menu share the terminal's label and context identity.
    attach: (text) => {
      if (!onAttachSelection || typeof text !== "string" || !text.trim()) return false;
      onAttachSelection(terminalAttachmentText(terminalSelectionText(text)),{label:tabLabel(active,tabs.length),terminalTabId:sessionId?active?.id:undefined});
      viewRef.current?.term.clearSelection(); setSelectionAnchor(null);
      setAttached(Date.now());
      return true;
    },
  };

  const factory = useCallback((modules) => (info) => {
    const id = info?.id;
    // A kept view outlives the pane that created it: its callbacks go to whichever pane shows it now (bind below).
    const bound = { handlers };
    const element = document.createElement("div");
    element.className = "stp-xterm";
    // c6bf19e8f Gr: the xterm host carries data-ccd-terminal (shared-7 qM); the idle cursor hides once one is in place.
    element.setAttribute("data-ccd-terminal", "");
    const { Terminal, FitAddon, SearchAddon, Unicode11Addon, WebLinksAddon } = modules;
    const term = new Terminal({
      ...optionsRef.current, minimumContrastRatio: MINIMUM_CONTRAST_RATIO, allowProposedApi: true,
      macOptionIsMeta: false, rightClickSelectsWord: false, drawBoldTextInBrightColors: true,
    });
    const commands=installTerminalCommands(term);
    const colorPolicy=installTerminalColorPolicy(term);
    // cf718f694 ge: the running command (OSC 133 C cmdline_url) or the shell's title, shown on this tab.
    if (id) terminalTitles().install(term, id);
    const fit = new FitAddon(), search = new SearchAddon({ highlightLimit: 1000 });
    term.loadAddon(fit);
    term.loadAddon(search);
    try { term.loadAddon(new Unicode11Addon()); term.unicode.activeVersion = "11"; } catch {}
    // c6bf19e8f Sn activate: only a primary click opens a link, and not one that ends a selection (xn, terminal-01).
    installTerminalLinks(term, { WebLinksAddon, id, getHandlers: () => bound.handlers.current });
    term.onData((data) => terminals.input(id, data));
    term.attachCustomKeyEventHandler((event) => {
      const mac=/Mac/.test(navigator.platform);
      if(routeTerminalKey(event,term,text=>navigator.clipboard.writeText(text)))return false;
      if(handleTerminalNavigation(event,term,data=>terminals.input(id,data),{mac,linux:/Linux/.test(navigator.platform),shell:info.shell,commands}))return false;
      const action = terminalKeyAction(event,{bufferType:term.buffer.active.type,mac});
      if (!action) return true;
      if (action === "toggle") return false; // the window handler toggles the pane
      event.preventDefault();
      event.stopPropagation();
      if (action === "clear") { term.clearSelection(); term.clear(); bound.handlers.current.clear?.(id); }
      else if (action === "select-all") term.selectAll();
      else if (action === "attach-selection") { if (!event.repeat) bound.handlers.current.attachVisible?.(term); }
      else if (action === "find") bound.handlers.current.key?.("find");
      else if (action === "find-next" || action === "find-previous") bound.handlers.current.key?.(action);
      else if (KEY_SEQUENCES[action]) terminals.input(id, KEY_SEQUENCES[action]);
      return false;
    });
    // The buffer as plain text on the view's own element (the WebGL renderer leaves no DOM rows to read): the offscreen
    // UI suite reads it; nothing in the app depends on it.
    element.stpReadViewport = () => ({type:term.buffer.active.type,viewportY:term.buffer.active.viewportY,baseY:term.buffer.active.baseY,rows:term.rows,markers:term.markers.map(marker=>marker.line)});
    element.stpReadSelection = () => term.getSelection();
    element.stpReadSelectionPosition = () => term.getSelectionPosition();
    element.stpReadOptions = () => ({cursorStyle:term.options.cursorStyle,cursorBlink:term.options.cursorBlink,scrollback:term.options.scrollback});
    element.stpReadText = () => {
      const buffer = term.buffer.active, lines = [];
      // A soft-wrapped row continues the previous logical line (xterm marks it isWrapped).
      for (let index = 0; index < buffer.length; index++) {
        const line = buffer.getLine(index), text = line?.translateToString(true) ?? "";
        if (line?.isWrapped && lines.length) lines[lines.length - 1] += text; else lines.push(text);
      }
      return lines.join("\n").replace(/\s+$/, "");
    };
    host.current?.replaceChildren(element);
    term.open(element);
    const disposeCopyEvent=installTerminalCopyEvent(term,element);
    const disposeCopy=installTerminalCopyOnSelect(term,element,{enabled:()=>viewSettingsStore.getSnapshot().copyOnSelect,writeText:text=>navigator.clipboard.writeText(text),mac:/Mac/.test(navigator.platform)});
    const view = {
      id, element, term, fit, search, webgl: null, bind: (next) => { bound.handlers = next; },
      write: (data) => term.write(data), reset: () => term.reset(), clear: () => {term.clearSelection();term.clear();},
      dispose: () => { if (id) terminalTitles().forget(id); colorPolicy.dispose(); disposeCopyEvent(); disposeCopy(); try { view.webgl?.dispose(); } catch {} term.dispose(); element.remove(); },
    };
    loadWebgl().then((WebglAddon) => {
      if (!WebglAddon || !element.isConnected || view.webgl) return;
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => { try { webgl.dispose(); } catch {} view.webgl = null; });
        term.loadAddon(webgl);
        view.webgl = webgl;
      } catch { /* DOM renderer */ }
    });
    return view;
  }, [terminals]);

  // Show the active tab's view in the body (created on first use, kept across session switches by the store).
  const activeId = active?.id ?? null;
  // cccc2cf0a My y + Jy/Yy: the tabs this pane has shown (since its owner last changed) count as mounted terminal
  // views, which Clear terminal tells apart from tabs never shown here ("Switch to this terminal first.").
  const [shown, setShown] = useState(() => ({ owner, ids: new Set(activeId ? [activeId] : []) }));
  if (shown.owner !== owner) setShown({ owner, ids: new Set(activeId ? [activeId] : []) });
  else if (activeId && !shown.ids.has(activeId)) setShown({ owner, ids: new Set(shown.ids).add(activeId) });
  const mountedKey = shown.owner === owner ? tabs.filter((tab) => shown.ids.has(tab.id)).map((tab) => tab.id).join(" ") : "";
  useEffect(() => {
    const ids = mountedKey ? mountedKey.split(" ") : [];
    for (const id of ids) mountedTerminalViews.set(id, (mountedTerminalViews.get(id) ?? 0) + 1);
    return () => {
      for (const id of ids) {
        const count = (mountedTerminalViews.get(id) ?? 1) - 1;
        if (count > 0) mountedTerminalViews.set(id, count); else mountedTerminalViews.delete(id);
      }
    };
  }, [mountedKey]);
  const [modulesReady, setModulesReady] = useState(null);
  useEffect(() => {
    let alive = true;
    loadXterm().then((modules) => { if (alive) setModulesReady(() => modules); }, () => { if (alive) setLoadFailed(true); });
    return () => { alive = false; };
  }, []);
  const fitNow = useCallback(() => {
    const view = viewRef.current;
    if (!view || !view.element.isConnected || !host.current?.clientWidth) return;
    try {
      const before = `${view.term.cols}x${view.term.rows}`;
      view.fit.fit();
      if (`${view.term.cols}x${view.term.rows}` !== before || !view.sized) {
        view.sized = true;
        void terminals.resize(sessionId, homeWorkspace, view.id, view.term.cols, view.term.rows);
      }
    } catch {}
  }, [terminals, sessionId, homeWorkspace]);
  useLayoutEffect(() => {
    if (!modulesReady || !activeId || !host.current) return undefined;
    // c6bf19e8f pi: a view that can't be created covers the terminal with its error ({kind:"raw"} with the message,
    // else loadFailed, 3.6556.2 "Couldn’t load the terminal") and Try again.
    const view = acquireTerminalView({ activeId, sessionId, homeWorkspace, terminals, createView: factory(modulesReady),
      hostNode: host.current, viewError, setViewError });
    if (!view) return undefined;
    viewRef.current = view;
    const stopSelection=observeTerminalSelection(view.term,host.current.parentElement,{onChange:setSelectionAnchor,suppressed:()=>handlers.current.selectionSuppressed()});
    view.bind?.(handlers);
    if (view.element.parentNode !== host.current) host.current.replaceChildren(view.element);
    for (const [key, value] of Object.entries(optionsRef.current)) if (view.term.options[key] !== value) view.term.options[key] = value;
    view.sized = false;
    fitNow();
    if (pendingFocus.current) { pendingFocus.current = false; requestAnimationFrame(focusTerminal); }
    return () => {
      stopSelection();
      if (viewRef.current === view) viewRef.current = null;
      if (view.element.parentNode === host.current) view.element.remove();
      // No longer shown here: this window's size stops limiting the PTY (another window may show it wider).
      void terminals.detach?.(sessionId, homeWorkspace, view.id);
    };
  }, [modulesReady, activeId, owner, viewAttempt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    terminals.updateViewOptions(terminalViewOptions(viewSettings,reducedMotion));
    const view = viewRef.current;
    if (!view) return;
    for (const [key, value] of Object.entries(options)) if (view.term.options[key] !== value) view.term.options[key] = value;
    fitNow();
  }, [options, fitNow]);
  useEffect(() => {
    if (!host.current || typeof ResizeObserver === "undefined") return undefined;
    let frame = 0;
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fitNow); });
    observer.observe(host.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [fitNow]);
  // Focus requests (toggle shortcut, pane opened, tab switched by the user). c6bf19e8f: while the shell has exited
  // (or failed to restart) the hidden xterm can't take focus; the overlay's Restart shell / Try again button does.
  const focusTerminal = useCallback(() => {
    const button = restartButton.current;
    if (button?.isConnected) button.focus({ preventScroll: true }); else viewRef.current?.term.focus();
  }, []);
  // cccc2cf0a `C(wS, Te)` (wS returns eS): the body menu's focus hand-back ends with the pane.
  useEffect(() => disarmMenuFocusReturn, []);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (focusRequest === null || focusRequest === undefined || focusRequest === handledFocusRequest) return;
    handledFocusRequest = focusRequest;
    if (viewRef.current) requestAnimationFrame(focusTerminal);
    else pendingFocus.current = true;
  }, [focusRequest, focusTerminal]);
  // An error about one action fades once tabs work again.
  useEffect(() => {
    if (!error || !tabs.length) return undefined;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error, tabs.length]);

  const select = (id, { focus = false } = {}) => {
    terminals.select(owner, id);
    if (focus) requestAnimationFrame(focusTerminal);
  };
  const close = (id) => {
    closeTerminalTab(id, { tabs, owner, sessionId, homeWorkspace, terminals, setConfirm });
  };
  // cccc2cf0a Zx ie: confirm when another tab still runs a command, else close the others at once.
  const closeOthers = (id) => {
    const others = tabs.filter((tab) => tab.id !== id);
    const busy = others.filter((tab) => tab.busy === true && tab.status === "running").length;
    if (busy) setConfirm({ kind: "close-others", id, count: busy });
    else for (const tab of others) void terminals.close(owner, sessionId, homeWorkspace, tab.id);
  };
  // cccc2cf0a Vy: a pending confirmation whose tab closed, or whose command finished, goes away.
  const confirmStale = confirm !== null && liveTerminalConfirm(confirm, tabs) === null;
  useEffect(() => { if (confirmStale) setConfirm(null); }, [confirmStale]);
  const confirmed = () => {
    const pending = liveTerminalConfirm(confirm, tabs);
    setConfirm(null);
    if (!pending) return;
    if (pending.kind === "close") void terminals.close(owner, sessionId, homeWorkspace, pending.id);
    else for (const tab of tabs) if (tab.id !== pending.id) void terminals.close(owner, sessionId, homeWorkspace, tab.id);
  };
  const clear = (id) => {
    if (!terminals.hasView(id)) return;
    // The source registry permits clearing any cached view, including hidden tabs.
    // The service broadcasts the clear to that view and drops replayed output too.
    void handlers.current.clear(id);
    if (viewRef.current?.id === id) { viewRef.current.clear(); focusTerminal(); }
  };
  // The registry's clear (cf718f694 le, from the tab menu's Clear terminal) reaches the pane that shows the terminal.
  const registryPane = useRef(null);
  registryPane.current = { owns: (id) => tabs.some((tab) => tab.id === id), clear };
  useEffect(() => {
    const entry = { owns: (id) => registryPane.current.owns(id), clear: (id) => registryPane.current.clear(id) };
    terminalPanes.add(entry);
    return () => { terminalPanes.delete(entry); };
  }, []);
  const restart = () => restartTerminalTab({
    active, sessionId, homeWorkspace, terminals, startFailedTerminals, setError, setRestartError,
    onRestarted: () => requestAnimationFrame(focusTerminal), inlineErrors: terminalInlineErrors(),
  });
  const newTab = async () => { const info = await create(); if (info) requestAnimationFrame(focusTerminal); };

  // Drop files or folders on the terminal (cccc2cf0a lg on cc63499d2 Zm): files from Finder give their paths through
  // webUtils (sg), the Files pane's in-app drag its absolute paths (Tm). Each is quoted for the tab's shell (og/cg) and
  // pasted at the prompt with a trailing space, then the terminal takes focus; a refused drop says why. Qm rings the
  // terminal while an accepted drag is over it.
  const [dropOver, setDropOver] = useState(false);
  const dropTargets = useRef(new Set());
  const dropDoc = useRef(null);
  const dropDisabled = !active || active.status !== "running" || !modulesReady;
  const dropAccepts = (event) => {
    if (event.dataTransfer?.types?.includes?.("Files")) return typeof globalThis.desktop?.pathForFile === "function";
    return acceptsFileContextDrag(event, fileDragOwner);
  };
  const dropReset = useCallback(() => { dropTargets.current.clear(); setDropOver(false); }, []);
  useEffect(() => {
    const doc = dropDoc.current;
    if (!dropOver || !doc) return undefined;
    doc.addEventListener("dragend", dropReset, true);
    doc.addEventListener("drop", dropReset, true);
    return () => { doc.removeEventListener("dragend", dropReset, true); doc.removeEventListener("drop", dropReset, true); };
  }, [dropOver, dropReset]);
  const dropFailed = (message) => { if (toasts) toasts.add(message, { variant: "danger" }); else setError(message); };
  const dropPaths = (event) => {
    const files = event.dataTransfer?.types?.includes?.("Files");
    let paths;
    if (files) {
      paths = [];
      for (const file of Array.from(event.dataTransfer.files ?? [])) {
        const value = globalThis.desktop?.pathForFile?.(file) ?? "";
        if (!value) { paths = null; break; }
        paths.push(value);
      }
    } else paths = draggedFilePaths(fileDragOwner) ?? [];
    if (paths === null) { dropFailed(t(DROP_ERRORS.noPath)); return; }
    if (!paths.length) return;
    // The shell is always reported here (terminal-service info.shell), so in-app drags get the shell check too.
    const text = terminalDropText(paths, active?.shell ?? null, { skipShellCheck: !files && !active?.shell, windows: /Win/.test(navigator.platform) });
    if (text === null) { dropFailed(t(DROP_ERRORS.refused)); return; }
    const term = viewRef.current?.term;
    if (!term) return;
    term.paste(text);
    focusTerminal();
  };
  const dropHandlers = {
    onDragEnter: (event) => {
      if (!dropAccepts(event)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.target) dropTargets.current.add(event.target);
      dropDoc.current = event.currentTarget.ownerDocument;
      setDropOver(true);
    },
    onDragLeave: (event) => {
      if (!dropAccepts(event)) return;
      event.preventDefault(); event.stopPropagation();
      const targets = dropTargets.current;
      if (event.target) targets.delete(event.target);
      for (const node of targets) if (!event.currentTarget.contains(node)) targets.delete(node);
      if (targets.size === 0) setDropOver(false);
    },
    onDragOver: (event) => {
      if (!dropAccepts(event)) return;
      event.preventDefault(); event.stopPropagation();
      event.dataTransfer.dropEffect = dropDisabled ? "none" : "copy";
    },
    onDrop: (event) => {
      if (!dropAccepts(event)) return;
      const handled = event.isDefaultPrevented();
      event.preventDefault(); event.stopPropagation();
      dropReset();
      if (!dropDisabled && !handled) dropPaths(event);
    },
  };

  // c6bf19e8f pi: an error (A) or the exited shell (N) covers the terminal; its Try again / Restart shell takes focus
  // when nothing else has it.
  const restartButton = useRef(null);
  const exitedNow = active?.status === "exited";
  const [restartError, setRestartError] = useState(null); // {id, error}: the last Restart shell of that tab failed
  const coverError = (viewError && viewError.id === active?.id ? viewError.error : null)
    ?? (exitedNow && restartError?.id === active?.id ? restartError.error : null);
  useEffect(() => {
    const button = restartButton.current;
    if ((!exitedNow && !coverError) || !button) return;
    const doc = button.ownerDocument, focused = doc.activeElement;
    if (!focused || focused === doc.body || pane.current?.querySelector(".stp-body")?.contains(focused)) button.focus({ preventScroll: true });
  }, [exitedNow, coverError, activeId]);

  const findRef = useRef(null);
  handlers.current.key = (action) => {
    if (action === "find") { setFindOpen(true); findRef.current?.focus(); }
    else findRef.current?.step(action === "find-next");
  };

  useEffect(()=>{setFindOpen(false);},[activeId,owner]);
  useEffect(()=>{if(active?.status==='exited'||error)setFindOpen(false);},[active?.status,error]);
  useEffect(()=>{
    const node=pane.current;
    const command=event=>{if(!viewRef.current||viewRef.current.closed||active?.status==='exited'||error)return;event.preventDefault();handlers.current.key(event.detail.kind==='find-open'?'find':event.detail.forward?'find-next':'find-previous');};
    node?.addEventListener('terminal-find-command',command);return()=>node?.removeEventListener('terminal-find-command',command);
  },[active?.status,error]);

  // cccc2cf0a Zx: ViewTabBar's onReorder (drag, and Control+Shift+←/→) gives the tab's new index (reorderTab); the
  // store moves by a delta. Zx passes it unless __gb__2169866315 (cf550b864 w: `!p("__gb__2169866315")`) is on, a new
  // gate that stays off here (R15), so reordering is on.
  const reorder = (id, toIndex) => {
    const fromIndex = tabs.findIndex((tab) => tab.id === id);
    if (fromIndex >= 0 && toIndex !== fromIndex) terminals.move(owner, id, toIndex - fromIndex);
  };
  // cccc2cf0a Zx _e (renameTab): the trimmed value; an empty one clears the tab's own name (it is numbered again).
  const rename = async (id, value) => {
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab || typeof value !== "string" || value.trim() === renameDraft(tab)) return;
    try { await terminals.rename(sessionId, homeWorkspace, id, value.trim()); } catch (failure) { setError(terminalError(failure, t("Couldn’t rename the terminal"))); }
  };
  // Memoized like Zx's compiled I (per tabs and titles), so ViewTabBar sees a new list only when one of them changes.
  const stripTabs = useMemo(() => terminalStripTabs(tabs, (tab) => titles.value(titleState, tab), (title) => titles.description(title)),
    [tabs, titleState, titles]);
  const locale = getLocale();
  // cccc2cf0a Zx je: the strip's labels (newTabAtCap is the host's per-session cap, see createDisabled below).
  const stripLabels = useMemo(() => ({
    newTab: t("New terminal"), moreTabs: t("More terminals"), closeTab: t("Close terminal"), renameTab: t("Rename terminal"),
    closeOtherTabs: t("Close other terminals"), closeTabHint: t("press right arrow to close"), closeTabHintRtl: t("press left arrow to close"),
    closeTabDeleteHint: t("Press Delete or Backspace to close the terminal"),
    moveTabHint: t("Press Control+Shift+Left Arrow or Right Arrow to move the terminal"),
    newTabAtCap: t("Up to {count} terminals per session", { count: MAX_TERMINALS_PER_OWNER }),
  }), [locale]); // eslint-disable-line react-hooks/exhaustive-deps
  // cccc2cf0a Zx z (Kx: the strip itself, not a tab, a button, or a tab being renamed): a primary press on the empty strip
  // keeps focus off it and goes to the active terminal; Jx/qx keep a middle press there from pasting (X11 primary).
  const stripTarget = (event) => {
    const target = event.target;
    return !event.defaultPrevented && target?.closest && event.currentTarget.contains(target)
      && !target.closest("[data-vtb-id], button") && !event.currentTarget.querySelector("input");
  };

  const exited = active?.status === "exited";
  const limited = active?.limited === true || (!active && backend === "script");
  // c6bf19e8f pi: the error (A) takes the place of the exited shell (N). A raw message shows as is; every kind but
  // needsNewerApp offers Try again. A tab whose folder is gone says so without a button (local).
  const cover = terminalCoverState({
    active, loadFailed, viewError, restartError,
    onRetryView: () => { setViewError(null); setViewAttempt((count) => count + 1); },
    onRestart: () => void restart(),
  });
  // cccc2cf0a Vy W/ne (terminal-13): the confirmation names the tab as it is now, and goes once nothing it would stop runs.
  const pendingConfirm = liveTerminalConfirm(confirm, tabs);
  return (
    <aside ref={pane} className="source-file-panel detail-panel stp-pane" aria-label={t("Terminal")} data-terminal-owner={owner || undefined}>
      <header className="source-pane-header" data-pane-header="terminal">
        {/* cccc2cf0a Zx: the strip wrapper (z, Jx, qx) around ViewTabBar with Zx's props. createMenu (Choose shell) needs
            more than one shell from the main process (lx), which the host does not list, so there is none; the host's
            per-session cap disables + (createDisabled, read out as newTabAtCap). */}
        <div role="presentation" className="relative flex items-center flex-1 min-w-0 gap-1"
          onMouseDown={(event) => {
            if (!stripTarget(event)) return;
            event.preventDefault();
            if (event.button === 0 && !(event.ctrlKey && /Mac/.test(navigator.platform)) && activeId) select(activeId, { focus: true });
          }}
          onPointerDown={(event) => { if (event.button === 1 && stripTarget(event)) { try { event.currentTarget.setPointerCapture(event.pointerId); } catch {} } }}
          onMouseUp={(event) => { if (event.button === 1 && stripTarget(event)) event.preventDefault(); }}>
          <SourceViewTabBar className="min-w-0 flex-1" aria-label={t("Terminal tabs")} tabs={stripTabs} activeId={activeId}
            onActivate={(id) => select(id, { focus: true })} onReselect={(id) => select(id, { focus: true })} onClose={close}
            onCreate={() => void newTab()} createDisabled={!owner || !terminals.available || tabs.length >= MAX_TERMINALS_PER_OWNER}
            createOnDoubleClick onRename={rename} onCloseOthers={closeOthers} onReorder={reorder}
            renderTabMenuItems={renderTerminalTabMenuItems} labels={stripLabels} />
        </div>
        {headerCenter}
        {React.isValidElement(controls) ? React.cloneElement(controls, {menuSections:terminalViewMenu(viewSettings,viewSettingsStore.set)}) : controls}
      </header>
      <div className="stp-body group/terminal" style={{ backgroundColor: theme.background }} data-exited={exited || undefined} {...dropHandlers}
        onKeyDown={(event) => { if (event.key === "Escape" && !event.nativeEvent.isComposing && findOpen) { event.preventDefault(); setFindOpen(false); focusTerminal(); } }}>
        {limited && !exited && <p className="stp-note" role="note">{t("Limited terminal: the terminal module couldn’t load, so the window size can’t change while a program runs.")}</p>}
        {/* The session folder was deleted or renamed: the running command goes on; the tab says why a new shell can't start. */}
        {active?.error === FOLDER_GONE && !exited && <p className="stp-note" role="note">{t(FOLDER_GONE)}</p>}
        {/* cccc2cf0a iS: kf (c0cdf4a08 g = RowContextMenu) around the terminal opens cS at the pointer. Its trigger's own
            handler leaves the right click to a program with mouse tracking (c6bf19e8f ri: `ti(l, e) && e.preventDefault()`);
            Le opens no menu without a live terminal (`if (!od(b)) { e.preventDefault(); return; }`) and reads the
            selection (Ne(wd(b))). The marker kf renders hides the selection action bar while the menu is open. */}
        <RowContextMenu
          onContextMenu={(event) => {
            const term = viewRef.current?.term;
            if (!term) { event.preventDefault(); return; }
            setBodySelection(term.getSelection() || "");
          }}
          onOpenChange={(open) => { if (open) disarmMenuFocusReturn(); else if (host.current) armMenuFocusReturn(host.current.ownerDocument); }}
          trigger={<div ref={host} className="stp-host" hidden={exited || loadFailed || !!coverError || undefined}
            onMouseUp={(event) => {
              const doc = event.currentTarget.ownerDocument;
              if (takeMenuFocusReturn(doc) && (doc.activeElement === null || doc.activeElement === doc.body)) focusTerminal();
            }}
            onContextMenu={(event) => {
              const term = viewRef.current?.term;
              if (term && terminalOwnsContextMenu(term, event.nativeEvent)) event.preventDefault();
            }} />}>
          {/* 3.6556.2 cccc2cf0a cS (me = shared-frame qi, view-tabs CdsContextMenu): Attach selection as context (when
              attachable), Copy (disabled without a selection), Paste, Select all, Clear terminal; Copy/Paste read
              cmd+c/cmd+v on macOS and Windows, ctrl+shift+c/v on Linux (shared-78 SE/wE), Select all shows cmd+a on macOS
              only. */}
          {onAttachSelection && bodySelection.trim() && <>
            <CdsContextMenu.Item shortcut={commandShortcut("attachTerminalOutput", true)} onClick={() => handlers.current.attach(bodySelection)}>{t("Attach selection as context")}</CdsContextMenu.Item>
            <CdsContextMenu.Separator />
          </>}
          <CdsContextMenu.Item shortcut={clipboardChord("c")} disabled={!bodySelection} onClick={() => { const text = terminalSelectionText(bodySelection); void navigator.clipboard?.writeText?.(text).catch(() => {}); }}>{t("Copy")}</CdsContextMenu.Item>
          <CdsContextMenu.Item shortcut={clipboardChord("v")} onClick={() => {
            const term = viewRef.current?.term;
            if (!term) return;
            term.focus();
            Promise.resolve(navigator.clipboard?.readText?.()).then((text) => { if (typeof text === "string" && text) term.paste(text); }, () => { try { document.execCommand("paste"); } catch {} });
          }}>{t("Paste")}</CdsContextMenu.Item>
          <CdsContextMenu.Separator />
          <CdsContextMenu.Item shortcut={macPlatform() ? "cmd+a" : undefined} onClick={() => viewRef.current?.term.selectAll()}>{t("Select all")}</CdsContextMenu.Item>
          <CdsContextMenu.Separator />
          <CdsContextMenu.Item onClick={() => { const view=viewRef.current;if(!view)return;view.term.clearSelection();view.term.clear();void handlers.current.clear(view.id); }}>{t('Clear terminal')}</CdsContextMenu.Item>
        </RowContextMenu>
        {/* c6bf19e8f Ei: `B && !B.offscreen && g && !Z && n(Si, …)` (Z = the start error or the exited shell). */}
        {selectionAnchor&&!selectionAnchor.offscreen&&onAttachSelection&&!exited&&!coverError&&<TerminalSelectionAction anchor={selectionAnchor} onAttach={()=>handlers.current.attach(viewRef.current?.term.getSelection())}/>}
        <span className="source-sr-only" role="status" aria-live="polite">{attached ? t("Terminal output attached to chat") : ""}</span>
        {findOpen && <SourceTerminalFind ref={findRef} selectionSuppressed={searchSelecting} view={viewRef} onClose={() => { setFindOpen(false); focusTerminal(); }} />}
        {dropOver && !dropDisabled && <TerminalDropRing />}
        {/* c6bf19e8f pi (absolute inset-0 bg-surface-1 + EmptyState): the error or "Shell exited" covers the surface; Try
            again / Restart shell is described by the title and takes focus. A tab whose folder is gone says so without
            the button (local). */}
        {cover && (
          <div className="stp-overlay" data-terminal-exited={cover.exited ? "" : undefined}
            onMouseDown={(event) => { if (!event.defaultPrevented && !event.target.closest?.("button")) { event.preventDefault(); restartButton.current?.focus(); } }}>
            {/* cc-rest-terminal-b (3.6556.2 Ei): an error cover is role="alert"; needsNewerApp adds its body. */}
            <EmptyState role={cover.role} title={<span id={`${hintId}-exited`}>{cover.text}</span>} body={cover.body}
              actions={cover.action && <SourceSettingsButton ref={restartButton} size="sm" variant="secondary" aria-describedby={`${hintId}-exited`}
                data-initial-focus="" onClick={cover.retry}>{cover.action}</SourceSettingsButton>} />
          </div>
        )}
        {/* cccc2cf0a Ay (ShellTerminalChunk's fallback): the terminal module (or the bridge) failed to load; Reload. */}
        {loadFailed && (
          <div className="stp-overlay">
            <EmptyState role="alert" icon="Warning" title={t("Couldn’t load the terminal")} body={t("Reload the page to try again.")}
              actions={<SourceSettingsButton size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("Reload")}</SourceSettingsButton>} />
          </div>
        )}
        {error && !exited && !loadFailed && (
          <div className="stp-error" role="alert">
            <span>{error}</span>
            {terminals.available && owner && !tabs.length && <SourceSettingsButton size="sm" variant="secondary" onClick={() => void newTab()}>{t("New terminal")}</SourceSettingsButton>}
          </div>
        )}
        {/* c6bf19e8f pi → cf718f694 B (terminal-09): the dimmed idle cursor until a terminal's xterm is in place (hidden by
            group-has-[[data-ccd-terminal]]), blinking with Blink cursor. */}
        {!cover && !loadFailed && !(error && !tabs.length) && (
          <TerminalIdleCursor color={theme.cursor ?? theme.foreground} fontFamily={options.fontFamily} fontSize={options.fontSize}
            className="absolute group-has-[[data-ccd-terminal]]/terminal:hidden" style={{ top: "var(--cds-pad-md)", left: "var(--cds-pad-md)" }}
            data-testid="terminal-idle-cursor" />
        )}
      </div>
      {/* cccc2cf0a Zx Ie: be (shared-frame yd = CdsRoot) density comfortable around ne (Xc = CdsConfirmationDialog), open
          while the confirmation is live; ge closes it on onOpenChange(false), he confirms (closeOnConfirm stays off: the
          confirmation goes once its tabs close). */}
      {pendingConfirm && (
        <CdsRoot density="comfortable" className="contents">
          <CdsConfirmationDialog className="epitaxy-root break-words" open
            onOpenChange={(open) => { if (!open) setConfirm(null); }} onConfirm={confirmed} confirmVariant="danger"
            title={pendingConfirm.kind === "close" ? t("Close terminal?") : t("Close other terminals?")}
            description={pendingConfirm.kind === "close" ? t("A command is still running in {name}. Closing the terminal stops it.", { name: pendingConfirm.name })
              : tn(pendingConfirm.count, "A command is still running in one of the other terminals. Closing them stops it.",
                "Commands are still running in {count} of the other terminals. Closing them stops those commands.")}
            confirmLabel={pendingConfirm.kind === "close" ? t("Close terminal") : t("Close other terminals")} />
        </CdsRoot>
      )}
    </aside>
  );
}

// cccc2cf0a cS p/y: `l || d ? "cmd+c" : "ctrl+shift+c"` (l = macOS, d = Windows; the CDS shortcut shows cmd as Ctrl on
// Windows).
function clipboardChord(key) {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform ?? "";
  return /Mac|Win/.test(platform) ? `cmd+${key}` : `ctrl+shift+${key}`;
}
// cccc2cf0a cS C: `l ? "cmd+a" : void 0` (l = macOS).
function macPlatform() {
  return typeof navigator !== "undefined" && /Mac/.test(navigator.platform ?? "");
}

// cccc2cf0a Zx ye: ViewTabBar's tab menu (CdsContextMenu) carries Clear terminal (sS) after Rename terminal.
function renderTerminalTabMenuItems(id) {
  return <TerminalClearItem ptyKey={id} />;
}

// cc63499d2 Qm "on-target": an inset accent ring with a soft inner glow while files are dragged over the terminal.
function TerminalDropRing() {
  return <div className="stp-drop-ring" aria-hidden="true"><div /></div>;
}
