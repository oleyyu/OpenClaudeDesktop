import {installTerminalCommands} from "./generated/code-current/terminal-commands.mjs";
import {terminalAttachmentText} from "./generated/code-current/terminal-selection.mjs";
import {attachVisibleTerminalOutput} from "./generated/code-current/terminal-output.mjs";
import {terminalOwnsContextMenu} from "./generated/code-current/terminal-mouse.mjs";
import {installTerminalColorPolicy} from "./generated/code-current/terminal-colors.mjs";
import {selectionBlocksTerminalLink} from "./generated/code-current/terminal-link-selection.mjs";
import {TerminalIdleCursor} from "./generated/code-current/terminal-idle-cursor.mjs";
import {terminalErrorMessages, terminalStartError, loadFailedError} from "./generated/code-current/terminal-errors.mjs";
import {TerminalClearItem, mountedTerminalViews} from "./generated/code-current/terminal-clear-item.mjs";
import {ownerWindow} from "./generated/code-current/owner-window.mjs";
import {suppressKeyRepeat} from "./generated/code-editor-current/keyboard-repeat.mjs";
import {routeTerminalKey,installTerminalCopyEvent} from "./terminal-event-routing.mjs";
import {handleTerminalNavigation} from "./terminal-navigation.mjs";
import {terminalViewSettings, terminalViewMenu, terminalViewOptions} from './terminal-view-settings.mjs';
import {TerminalSelectionAction} from './source-terminal-selection.jsx';
import {observeTerminalSelection} from './terminal-selection-controller.mjs';
import {installTerminalCopyOnSelect,terminalSelectionText} from './terminal-copy-selection.mjs';
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { SourceMenu } from "./source-menu";
import { SourceTooltip, SourceTooltipGroup } from "./source-tooltip";
import { SourceConfirmationDialog } from "./source-dialog";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { useCodeThemes } from "./code-theme-store.mjs";
import { useReducedMotion } from "./use-reduced-motion.js";
import {SourceTerminalFind} from "./source-terminal-find.jsx";
import { SourceEmptyState } from "./source-transcript-states.jsx";
import { SourcePreviewTabOverflow } from "./source-preview-tab-overflow.jsx";
import { menuTriggerProps } from "./source-menu.jsx";
import { useSourceToasts } from "./source-toast.jsx";
// R3-files FT-18 owns the drag (src/file-context-drag.mjs); it re-exports draggedFilePaths from the one module instance
// every drop target shares, so the pane reads it there instead of from generated/code-editor directly.
import { acceptsFileContextDrag, draggedFilePaths } from "./file-context-drag.mjs";
import { terminalTitles } from "./terminal-titles.mjs";
import {
  DROP_ERRORS, FOLDER_GONE, KEY_SEQUENCES, MINIMUM_CONTRAST_RATIO, acquireTerminalView, anyTerminalTabClosable, closeTerminalTab, findLinks,
  handleTerminalTabKeyDown, hiddenTerminalTabs, installTerminalLinks, isTerminalTabClosable, liveTerminalConfirm, movableTerminalTabs,
  relativeToFolder, renameDraft, restartTerminalTab, safeWebUrl, shouldAutoClose, tabLabel, terminalCoverState, terminalDropText,
  terminalError, terminalFont, terminalFontSize, terminalKeyAction, terminalTabDeleteKey, terminalTheme,
} from "./terminal-pane-model.mjs";
import { ownerKeyOf, terminalStore } from "./terminal-store.mjs";
import { startFailedTerminals, terminalPanes } from "./terminal-registry-host.mjs";
import { useTabDragReorder } from "./use-tab-drag-reorder.mjs";
import { MAX_TERMINALS_PER_OWNER } from "../electron/terminal-model.mjs";
import { t, tn } from "../electron/i18n/index.mjs";
import "./source-terminal-pane.css";

// Terminal pane (independent implementation of the 2.2553.1 terminal pane: cccc2cf0a pane + Xd tab strip, c6bf19e8f
// ShellTerminal). The original 2.42304.0 pieces it renders or calls come from generated/code-current (R3-terminal):
// output/geometry/mouse/colors/link-selection/errors (c6bf19e8f), titles/idle cursor/registry (cf718f694) and the tab
// menu's Clear terminal (cccc2cf0a Zy). A tile like Changes/Files/Plan: the tab strip sits in the 32px pane header ([tabs][+][More] then the
// drag handle and the pane controls), the body is one xterm per tab. The shells run in the main process
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
// The last focus request taken (main.jsx counts up when the pane opens): shared by every pane instance, so a pane that
// mounts again on a session switch never pulls focus for an old request.
let handledFocusRequest = null;

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
  const tabs = state?.tabs ?? [];
  const active = tabs.find((tab) => tab.id === state?.active) ?? tabs[0] ?? null;
  const [error, setError] = useState(null);
  // cccc2cf0a Rg/Bg: the terminal module (or the preload bridge) is missing; only a reload can bring it back.
  const [loadFailed, setLoadFailed] = useState(!terminals.available);
  // { kind: "close"|"close-others", id, count }: the tab's name is read live (cccc2cf0a Vy ne), see liveTerminalConfirm.
  const [confirm, setConfirm] = useState(null);
  // c6bf19e8f pi A for a view that failed to come up ({id, error: {kind:"raw",text}|loadFailed}); Try again retries it.
  const [viewError, setViewError] = useState(null);
  const [viewAttempt, setViewAttempt] = useState(0);
  const [renaming, setRenaming] = useState(null); // id
  const [findOpen, setFindOpen] = useState(false);
  const [bell, setBell] = useState(null);
  const [backend, setBackend] = useState(null);
  const [selectionAnchor,setSelectionAnchor]=useState(null);
  const searchSelecting=useRef(false);
  const [bodyMenu, setBodyMenu] = useState(null); // {x, y, selection}: the terminal body's context menu
  const [attached, setAttached] = useState(0); // announces "Terminal output attached to chat"
  const hadTabs = useRef(null); // the owner whose tabs were seen (a session switch can reuse this pane)
  const creating = useRef(false);
  const host = useRef(null), pane = useRef(null), tabList = useRef(null);
  const viewRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const hintId = useId(), moveHintId = useId();
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
    bell: (id) => setBell({ id, at: Date.now() }),
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
    term.onBell(() => bound.handlers.current.bell?.(id));
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
    // else loadFailed "Failed to load terminal") and Try again.
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
  useEffect(() => {
    if (!bell) return undefined;
    const timer = setTimeout(() => setBell(null), 1200);
    return () => clearTimeout(timer);
  }, [bell]);

  // Tab strip overflow → "More terminals".
  useLayoutEffect(() => {
    const list = tabList.current;
    if (!list || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setOverflowing(list.scrollWidth > list.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [tabs.length]);
  useEffect(() => {
    tabList.current?.querySelector('[role="tab"][aria-selected="true"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  const select = (id, { focus = false } = {}) => {
    terminals.select(owner, id);
    if (focus) requestAnimationFrame(focusTerminal);
  };
  const close = (id) => {
    closeTerminalTab(id, { tabs, owner, sessionId, homeWorkspace, terminals, setConfirm });
  };
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
    onRestarted: () => requestAnimationFrame(focusTerminal),
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

  // Drag a tab to a new slot (panes-tabs-current.js Oe onReorder); Ctrl+Shift+←/→ below stays the keyboard path.
  const tabDrag = useTabDragReorder({ stripRef: tabList, itemSelector: "[data-terminal-id]", idOf: (node) => node.dataset.terminalId,
    onReorder: (id, toIndex, fromIndex) => terminals.move(owner, id, toIndex - fromIndex) });
  const shownTabs = tabDrag.order(tabs, (tab) => tab.id);
  const focusTab = (id) => requestAnimationFrame(() => tabList.current?.querySelector(`[data-terminal-id="${id}"] [role="tab"]`)?.focus());
  const onTabKey = (event, id) => {
    handleTerminalTabKeyDown(event, id, { tabs, owner, terminals, close, select, focusTab });
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
  // cfe7c4b3b Y nt/ot/gt (terminal-11/12): a lone tab cannot close unless closable: true; the close hint exists while
  // some tab can close (`ot`), the move hint while some tab can move (`gt`).
  const solo = tabs.length === 1;
  const anyClosable = anyTerminalTabClosable(tabs);
  const movable = movableTerminalTabs(tabs);
  // cccc2cf0a Vy W/ne (terminal-13): the confirmation names the tab as it is now, and goes once nothing it would stop runs.
  const pendingConfirm = liveTerminalConfirm(confirm, tabs);
  return (
    <aside ref={pane} className="source-file-panel detail-panel stp-pane" aria-label={t("Terminal")} data-terminal-owner={owner || undefined}>
      <header className="source-pane-header" data-pane-header="terminal">
        <div className="source-file-tabbar stp-tabbar" data-view-tab-bar="" onDoubleClick={(event) => { if (event.target === event.currentTarget || event.target === tabList.current) void newTab(); }}>
          <div ref={tabList} className="source-file-tabs stp-tabs" role="tablist" aria-label={t("Terminal tabs")}>
            <SourceTooltipGroup delay={700}>
              {shownTabs.map((tab, index) => (
                <TerminalTab key={tab.id} tab={tab} onPointerDown={(event) => tabDrag.onPointerDown(tab.id, event)} label={tabLabel(tab, tabs.length)} running={titles.value(titleState, tab)} selected={tab.id === activeId} posinset={index + 1}
                  setsize={tabs.length} closable={isTerminalTabClosable(tab, solo)} hintId={hintId} moveHintId={movable.has(tab.id) ? moveHintId : undefined} bell={bell?.id === tab.id && !reducedMotion}
                  renaming={renaming === tab.id} onRenameDone={async (title) => {
                    setRenaming(null);
                    // Zg/r_ rename: trimmed; an empty name clears the tab's own name (it is numbered again).
                    if (title !== undefined && title.trim() !== renameDraft(tab)) {
                      title = title.trim(); try { await terminals.rename(sessionId, homeWorkspace, tab.id, title); } catch (failure) { setError(terminalError(failure, t("Couldn’t rename the terminal"))); } }
                    requestAnimationFrame(() => tabList.current?.querySelector(`[data-terminal-id="${tab.id}"] [role="tab"]`)?.focus());
                  }}
                  onSelect={() => select(tab.id, { focus: true })} onClose={() => close(tab.id)} onKeyDown={(event) => onTabKey(event, tab.id)}
                  onRename={() => setRenaming(tab.id)} onCloseOthers={tabs.length > 1 ? () => closeOthers(tab.id) : null} />
              ))}
            </SourceTooltipGroup>
          </div>
          {/* cfe7c4b3b Y: the close hint exists while some tab can close (`ot`), the move hint while some tab can move (`gt`). */}
          {anyClosable && <span id={hintId} className="source-sr-only">{t("Press Delete or Backspace to close the terminal")}</span>}
          {movable.size > 0 && <span id={moveHintId} className="source-sr-only">{t("Press Control+Shift+Left Arrow or Right Arrow to move the terminal")}</span>}
          {/* At the per-session cap the button says why instead of failing (aria-disabled keeps its tooltip). */}
          <SourceTooltip content={tabs.length >= MAX_TERMINALS_PER_OWNER ? t("Up to {count} terminals per session", { count: MAX_TERMINALS_PER_OWNER }) : t("New terminal")} side="bottom" hoverable={false}>
            <button type="button" className="source-icon-button stp-new" aria-label={t("New terminal")} disabled={!owner || !terminals.available}
              aria-disabled={tabs.length >= MAX_TERMINALS_PER_OWNER || undefined}
              onMouseDown={(event) => event.preventDefault()} onClick={() => { if (tabs.length < MAX_TERMINALS_PER_OWNER) void newTab(); }}>
              <Icon name="Add" size={16} />
            </button>
          </SourceTooltip>
          {overflowing && <MoreTerminals tabs={tabs} activeId={activeId} list={tabList} titleState={titleState} titles={titles}
            onSelect={(id) => select(id, { focus: true })} onClose={close} />}
        </div>
        {headerCenter}
        {React.isValidElement(controls) ? React.cloneElement(controls, {menuSections:terminalViewMenu(viewSettings,viewSettingsStore.set)}) : controls}
      </header>
      <div className="stp-body group/terminal" style={{ backgroundColor: theme.background }} data-exited={exited || undefined} {...dropHandlers}
        onKeyDown={(event) => { if (event.key === "Escape" && !event.nativeEvent.isComposing && findOpen) { event.preventDefault(); setFindOpen(false); focusTerminal(); } }}>
        {limited && !exited && <p className="stp-note" role="note">{t("Limited terminal: the terminal module couldn’t load, so the window size can’t change while a program runs.")}</p>}
        {/* The session folder was deleted or renamed: the running command goes on; the tab says why a new shell can't start. */}
        {active?.error === FOLDER_GONE && !exited && <p className="stp-note" role="note">{t(FOLDER_GONE)}</p>}
        <div ref={host} className="stp-host" hidden={exited || loadFailed || !!coverError || undefined}
          onContextMenu={(event) => {
            const term = viewRef.current?.term;
            if (!term) return;
            event.preventDefault();
            if (terminalOwnsContextMenu(term, event.nativeEvent)) return;
            setBodyMenu({ x: event.clientX, y: event.clientY, selection: term.getSelection() || "" });
          }} />
        {bodyMenu && (
          <SourceMenu.Popup anchor={host.current} trigger={null} point={bodyMenu} dataCds="ContextMenu" layer="contextmenu" label={t("Terminal")} contextMenuGuard="always"
            onClose={() => { setBodyMenu(null); focusTerminal(); }}>
            {/* 2.31226.0 cccc2cf0a s_: selection actions, clipboard, Select all, Clear terminal. */}
            {onAttachSelection && bodyMenu.selection.trim() && <>
              <SourceMenu.Item shortcut="cmd+shift+l" onClick={() => handlers.current.attach(bodyMenu.selection)}>{t("Attach selection as context")}</SourceMenu.Item>
              <SourceMenu.Separator />
            </>}
            <SourceMenu.Item shortcut="cmd+c" disabled={!bodyMenu.selection} onClick={() => { const text = terminalSelectionText(bodyMenu.selection); void navigator.clipboard?.writeText?.(text).catch(() => {}); }}>{t("Copy")}</SourceMenu.Item>
            <SourceMenu.Item shortcut="cmd+v" disabled={!active || active.status !== "running"} onClick={() => {
              const term = viewRef.current?.term;
              if (!term) return;
              term.focus();
              Promise.resolve(navigator.clipboard?.readText?.()).then((text) => { if (typeof text === "string" && text) term.paste(text); }, () => { try { document.execCommand("paste"); } catch {} });
            }}>{t("Paste")}</SourceMenu.Item>
            <SourceMenu.Separator />
            <SourceMenu.Item shortcut="cmd+a" onClick={() => viewRef.current?.term.selectAll()}>{t("Select all")}</SourceMenu.Item>
            <SourceMenu.Separator />
            <SourceMenu.Item onClick={() => { const view=viewRef.current;if(!view)return;view.term.clearSelection();view.term.clear();void handlers.current.clear(view.id); }}>{t('Clear terminal')}</SourceMenu.Item>
          </SourceMenu.Popup>
        )}
        {selectionAnchor&&!selectionAnchor.offscreen&&onAttachSelection&&!bodyMenu&&<TerminalSelectionAction anchor={selectionAnchor} onAttach={()=>handlers.current.attach(viewRef.current?.term.getSelection())}/>}
        <span className="source-sr-only" role="status" aria-live="polite">{attached ? t("Terminal output attached to chat") : ""}</span>
        {findOpen && <SourceTerminalFind ref={findRef} selectionSuppressed={searchSelecting} view={viewRef} onClose={() => { setFindOpen(false); focusTerminal(); }} />}
        {dropOver && !dropDisabled && <TerminalDropRing />}
        {/* c6bf19e8f pi (absolute inset-0 bg-surface-1 + EmptyState): the error or "Shell exited" covers the surface; Try
            again / Restart shell is described by the title and takes focus. A tab whose folder is gone says so without
            the button (local). */}
        {cover && (
          <div className="stp-overlay" data-terminal-exited={cover.exited ? "" : undefined}
            onMouseDown={(event) => { if (!event.defaultPrevented && !event.target.closest?.("button")) { event.preventDefault(); restartButton.current?.focus(); } }}>
            <SourceEmptyState title={<span id={`${hintId}-exited`}>{cover.text}</span>}
              actions={cover.action && <SourceSettingsButton ref={restartButton} size="sm" variant="secondary" aria-describedby={`${hintId}-exited`}
                data-initial-focus="" onClick={cover.retry}>{cover.action}</SourceSettingsButton>} />
          </div>
        )}
        {/* cccc2cf0a Ay (ShellTerminalChunk's fallback): the terminal module (or the bridge) failed to load; Reload. */}
        {loadFailed && (
          <div className="stp-overlay">
            <SourceEmptyState role="alert" icon="Warning" title={t("Couldn’t load the terminal")} body={t("Reload the page to try again.")}
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
      {pendingConfirm && (
        <SourceConfirmationDialog
          title={pendingConfirm.kind === "close" ? t("Close terminal?") : t("Close other terminals?")}
          body={pendingConfirm.kind === "close" ? t("A command is still running in {name}. Closing the terminal stops it.", { name: pendingConfirm.name })
            : tn(pendingConfirm.count, "A command is still running in one of the other terminals. Closing them stops it.",
              "Commands are still running in {count} of the other terminals. Closing them stops those commands.")}
          confirmLabel={pendingConfirm.kind === "close" ? t("Close terminal") : t("Close other terminals")}
          confirmVariant="danger" onConfirm={confirmed} onCancel={() => setConfirm(null)} />
      )}
    </aside>
  );
}

export function TerminalTab({ tab, label, running: title, selected, posinset, setsize, closable = true, hintId, moveHintId, bell, renaming, onRenameDone, onSelect, onClose, onKeyDown, onRename, onCloseOthers, onPointerDown }) {
  const root = useRef(null), field = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  // Zg editValue: the tab's own name, empty for a numbered tab (Enter on an empty field clears the name).
  useLayoutEffect(() => { if (renaming) { setDraft(renameDraft(tab)); requestAnimationFrame(() => { field.current?.focus(); field.current?.select(); }); } }, [renaming]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = tab.busy === true && tab.status === "running";
  const status = tab.status === "exited" ? t("Shell exited") : running ? t("Terminal (command running)") : null;
  // cfe7c4b3b ge: U = e.closable ?? !w, Re = U && !J ($e = !l && U).
  const canClose = closable && !renaming;
  return (
    <div ref={root} role="presentation" className="source-file-tab stp-tab" data-terminal-id={tab.id} data-selected={selected || undefined}
      data-popup-open={menuOpen || undefined} data-busy={running || undefined} data-exited={tab.status === "exited" || undefined} data-bell={bell || undefined}
      onMouseDown={(event) => { if ((event.button === 1 && canClose) || event.button === 2) event.preventDefault(); }}
      onMouseUp={(event) => { if (event.button === 1 && canClose) event.preventDefault(); }}
      onPointerDown={renaming ? undefined : onPointerDown}
      onAuxClick={(event) => { if (event.button === 1 && canClose) { event.preventDefault(); onClose(); } }}
      onDoubleClick={(event) => { event.stopPropagation(); onRename(); }}
      onContextMenu={(event) => { event.preventDefault(); setMenuOpen(true); }}>
      <span aria-hidden="true" className="source-file-tab-bg" />
      {renaming ? (
        <input ref={field} className="stp-rename" value={draft} maxLength={64} aria-label={t("Rename terminal")} spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.nativeEvent?.isComposing) return;
            if (event.key === "Enter") { event.preventDefault(); onRenameDone(draft); }
            else if (event.key === "Escape") { event.preventDefault(); onRenameDone(undefined); }
          }}
          onBlur={() => onRenameDone(draft)} />
      ) : (
        <SourceTooltip content={label} detail={title ?? tab.cwd} side="bottom" align="start" delay={700} hoverable={false}>
          <div role="tab" aria-selected={selected} aria-posinset={posinset} aria-setsize={setsize} tabIndex={selected ? 0 : -1}
            aria-describedby={[closable && hintId, moveHintId].filter(Boolean).join(" ") || undefined} onClick={onSelect}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); return; }
              if (event.key === "F2") { event.preventDefault(); onRename(); return; }
              onKeyDown(event);
            }}>
            {running && <span className="stp-tab-dot" aria-hidden="true" />}
            {/* Zg description: the running command or the title's last path segment, muted after the name. */}
            <span className="source-file-tab-label" data-vtb-label=""><span>{label}{title && <span className="stp-tab-description"><span className="source-sr-only">, </span>{terminalTitles().description(title)}</span>}{status && <span className="source-sr-only">, {status}</span>}</span></span>
          </div>
        </SourceTooltip>
      )}
      {canClose && <button type="button" tabIndex={-1} aria-hidden="true" aria-label={t("Close terminal")} className="source-file-tab-close"
        onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); onClose(); }}>
        <Icon name="X" size={12} />
      </button>}
      {menuOpen && (
        <SourceMenu.Popup anchor={root.current} trigger={null} side="bottom" align="start" dataCds="ContextMenu" layer="contextmenu" contextMenuGuard="always"
          onClose={() => setMenuOpen(false)}>
          <SourceMenu.Item onClick={onRename}>{t("Rename terminal")}</SourceMenu.Item>
          {/* cccc2cf0a Vy renderTabMenuItems → Zy (terminal-07): disabled with why when there is nothing to clear here. */}
          <TerminalClearItem ptyKey={tab.id} />
          {(closable || onCloseOthers) && <SourceMenu.Separator />}
          {closable && <SourceMenu.Item onClick={onClose}>{t("Close terminal")}</SourceMenu.Item>}
          {onCloseOthers && <SourceMenu.Item onClick={onCloseOthers}>{t("Close other terminals")}</SourceMenu.Item>}
        </SourceMenu.Popup>
      )}
    </div>
  );
}

// cfe7c4b3b se: the tabs scrolled out of the strip, one original ce row each (label, the running command as a caption, a
// close X; ArrowRight/Delete/Backspace without Control/Meta/Alt, or a middle click, closes with the busy confirmation of
// close(); a held key closes one tab — R3-terminal FT-15, terminal-10).
function MoreTerminals({ tabs, activeId, list, titleState, titles, onSelect, onClose }) {
  const trigger = useRef(null);
  const [open, setOpen] = useState(null);
  const [hidden, setHidden] = useState([]);
  const show = (how) => {
    const node = list.current;
    const entries = node ? [...node.querySelectorAll("[data-terminal-id]")].map((element) => ({ id: element.dataset.terminalId, start: element.offsetLeft, end: element.offsetLeft + element.offsetWidth })) : [];
    setHidden(hiddenTerminalTabs(entries, { scrollLeft: node?.scrollLeft ?? 0, clientWidth: node?.clientWidth ?? 0, activeId }));
    setOpen(how);
  };
  const rows = tabs.filter((tab) => hidden.includes(tab.id)).map((tab) => {
    const value = titles.value(titleState, tab);
    return { id: tab.id, label: tabLabel(tab, tabs.length), detail: value };
  });
  return (
    <span className="source-file-tabs-overflow" data-vtb-overflow="">
      <SourceTooltip content={t("More terminals")} side="bottom" hoverable={false}>
        <button ref={trigger} type="button" className="source-icon-button" aria-label={t("More terminals")}
          {...menuTriggerProps({ open: !!open, onOpen: show })}
          onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) setOpen(null); else show("click"); }}>
          <Icon name="CaretDown" size={16} />
        </button>
      </SourceTooltip>
      {open && (
        <SourcePreviewTabOverflow anchor={trigger.current} tabs={rows} className="spv-overflow-menu stp-overflow-menu"
          initialHighlight={open === "first" || open === "last" ? open : undefined}
          labels={{ moreTabs: t("More terminals"), closeTab: t("Close terminal"), closeTabHint: t("press right arrow to close"), closeTabHintRtl: t("press left arrow to close"), closeTabDeleteHint: t("Press Delete or Backspace to close the terminal") }}
          onActivate={(id) => { setOpen(null); onSelect(id); }} onCloseTab={onClose} onClose={() => setOpen(null)} />
      )}
    </span>
  );
}

// cc63499d2 Qm "on-target": an inset accent ring with a soft inner glow while files are dragged over the terminal.
function TerminalDropRing() {
  return <div className="stp-drop-ring" aria-hidden="true"><div /></div>;
}
