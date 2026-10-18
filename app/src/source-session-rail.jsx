// R4f-rail SR-7: the Code session rail mounted in the chat tile, and the host stand-in for its data assembly.
//
// 2.42304.0 sources (ion-dist v1; spec analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.1, §3, §4):
// - cc43287c9 jre (the Code session view) keeps the rail's state machine inline: `Jt = ie && !I`, `Zt = jp(Yt, Jt, Xt)`
//   (shared-18 Py, the row fits beside / alone), `{shown: Qt, setShown: $t} = FH()`, `en … tn … nn … an … on … sn … cn`,
//   `[ln, un]` (the raised overlay), `fn` (on screen), `vn` (onToggle), `yn` (raises), `bn` (the toggle model); it writes
//   `{railMode: on, railActive: cn}` to the scope store and mounts DH (the region opener) and jH (the overlay) in the
//   chat panel body, wH (composer menus raise the rail) after it and bH (the docked column) after the body. The pinned
//   text lives in the session-rail-kit manifest (callSites) and is asserted by tests/session-rail-mount.test.mjs.
// - jre's geometry: the root gets shared-18 Cy (Jt) / Sy (nn) / Ty (cn), the body row `yy` + `by` (rn) + `@container`
//   (nn) + `data-session-rail-overflow` (cn), its inner box `yy` + Ey (cn); Mte drops the composer's PR band while
//   `railMode` (`tn||on||ua||mr?null:…Tee…`, `mr=tp(Zn,e=>e.railMode)`).
// - cf74bc599 fO (EpitaxySessionRailHost, the rail's data assembly) is not generated (it reads claude.ai session meta,
//   remote environments, Remote Control and artifacts). SessionRailHostView below is its host stand-in: it builds iD's
//   props with fO's own expressions over host data, calling the generated derivations (RE / ME / jE / VE / HE / XE / ZE /
//   QE / GE / UE / AE / zE / tD) and hooks (lO with BE / hg, cO, nO) as fO calls them. The pinned fO text is the
//   session-rail manifest's callSite.
//
// Host data (the chat tile's, passed by main.jsx as `host`): the session's local record (main.cjs session-rail-meta,
// SR-5, fO's `O`, whose record fallback `k` is the meta here: the host has no session meta query), the session folder's
// git status (discovery `E` and the Changes row), the transcript items (Outputs), the Preview pane's servers, the
// Background tasks pane's tasks with the app's Monitor and schedule feeds, and the panes / terminal / Finder actions.
// Nothing is invented: Remote Control, artifacts, goal, cloud / SSH environments, connectors (see SR-7 report) and the
// Context card (deferred, SR-3) are not passed, exactly as fO passes nothing when their sources are absent.
import React, { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SessionRailDockedColumn, SessionRailOverlay, SessionRailOpener, RailShownStoreProvider, useRailShown } from "./generated/session-rail-kit/rail-shell.mjs";
import { useRailFits, RAIL_CHAT_GEOMETRY_CLASS, RAIL_GUTTER_CLASS, RAIL_TITLEBAR_INSET_CLASS, RAIL_CONTAINER_CLASS,
  RAIL_BAND_PADDING_CLASS, RAIL_OVERFLOW_ATTRIBUTE, releaseFlatComposerMenu } from "./generated/session-rail-kit/rail-layout.mjs";
import { useRailFlat } from "./generated/session-rail-kit/rail-card.mjs";
import { createStore, useStore } from "./generated/session-rail-kit/react-store.mjs";
import { RailFolderRow } from "./generated/session-rail-kit/rail-rows.mjs";
import { SessionRailHostContext, useIntl } from "./source-session-rail-kit-adapters.jsx";
import { SessionRail } from "./generated/session-rail/rail-view.mjs";
import { RepoNameChip } from "./generated/session-rail/repo-name-chip.mjs";
import { railFolder, railExtraFolders, otherRepos, knownBranch, railBranch, railWorktree, lazyWorktreePending, lazyWorktreeState, railEnvironment,
  environmentKind, environmentConnection, isSideSessionNotesFolder, remoteControlState, RAIL_PENDING_GIVE_UP_MS } from "./generated/session-rail/rail-derive.mjs";
import { useRailPendingHold, useCheckoutInfo, useComposerMenuOpensRailSection } from "./generated/session-rail/rail-hooks.mjs";
import { NAME_PENDING_GIVE_UP_MS } from "./generated/session-rail/rail-timing.mjs";
import { SessionRailOutputsContext } from "./source-session-rail-adapters.jsx";
import { SessionRailSectionsHostContext, railServerRows, railTaskRows, railLoopRows } from "./source-session-rail-sections-adapters.jsx";
import { SessionRailServers } from "./generated/session-rail-sections/servers-card.mjs";
import { SessionRailBackgroundTasks } from "./generated/session-rail-sections/background-tasks-card.mjs";
import { SessionRailChanges } from "./source-session-rail-changes-adapters.jsx";
import { QueryClientProvider } from "./generated/files-changes/file-browser-query.mjs";
import { fileBrowserQueryClient } from "./source-breadcrumb-adapters.jsx";
import { SessionFileOpenerProvider } from "./generated/r3b-transcript/session-file-access.mjs";
import { isMacUserAgent } from "./generated/code-current/surface-chord-platform.mjs";
import { normalizeOutputPath } from "./generated/code-current/file-output-normalize.mjs";
import { isSideSessionNotesPath } from "./generated/code-current/file-output-paths.mjs";
import { itemDeliverables } from "./deliverable-records.mjs";
import { loadLocalSessionRecord, railMetaFromRecord, railLazyPendingArgs, railRecordFacts } from "./session-rail-meta-model.mjs";
import { monitorTasks } from "./background-tasks-model.mjs";
import { taskRowsStore, dismissedTasksStore } from "./source-background-tasks.jsx";
import { connectorRows, connectorLabel } from "./generated/session-rail/rail-derive.mjs";
import { useSaveEnvironmentSetup, RailSaveEnvironmentLink, RailSaveEnvironmentRow } from "./generated/session-rail/save-environment.mjs";
import { setRailSavedEnvironments, setRailLocalSession, useSessionEnvironmentId } from "./source-session-rail-adapters.jsx";
import { sessionMcpCounts, heldMcpCounts, railConnectors, NO_SESSION_MCP_COUNTS } from "./session-rail-connectors-model.mjs";
import { SourceSavedEnvironmentDialog } from "./source-saved-environment-dialog.jsx";
import { SessionRailContext } from "./generated/session-rail-context/context-card.mjs";
import { SessionRailContextHostContext } from "./source-session-rail-context-adapters.jsx";

// ---- jre's geometry classes -----------------------------------------------------------------------------------------

/** shared-18 yy (cc43287c9 Bp): the chat body row and its inner box. */
export const RAIL_BODY_ROW_CLASS = "relative flex min-h-0 flex-1 flex-col";
/** shared-18 by (cc43287c9 Cp): the body row's bottom inset (rn). */
export const RAIL_BODY_ROW_INSET_CLASS = "pb-0.75";
/** cc43287c9 jre's chat panel body (tz `className`, Kt false). */
export const CHAT_PANEL_BODY_CLASS = "epitaxy-chat-panel-body flex-1 min-h-0 relative";
// Host: the local transcript frame sizes by `flex: 1` (source-transcript.css), so its panel body is a flex column; the
// official body's children size by h-full instead.
const HOST_PANEL_BODY_FLEX = "flex flex-col";
/** cc43287c9 jre's transcript region (`ref: ft`) inside the panel body, plus the host's flex column. */
export const TRANSCRIPT_REGION_CLASS = `h-full isolate focus:outline-none ${HOST_PANEL_BODY_FLEX}`;

// ---- the session scope store (the slice of c227f4d5e's scope store the rail reads and writes) ---------------------

/**
 * c227f4d5e's session scope store, as far as the rail goes: `openComposerMenu` (nO / wH), `pickerRowMounted` (wH's
 * shortcut gate, Iy), `draftRail` / `footer` (fO's draft rail hold), `railTailEl` (rD's tail slot, c227f4d5e pW),
 * `railMode` / `railActive` (jre writes them), and the three openers fO reads (`openSessionMcpDialog`,
 * `openEditEnvironment`, `addSessionFolder`), all null here: no session MCP dialog, no cloud environment editor and no
 * session folder picker in this host.
 */
export function createRailScopeStore() {
  return createStore()(() => ({ openComposerMenu: null, pickerRowMounted: false, draftRail: null, footer: null, railTailEl: null,
    railMode: false, railActive: false, openSessionMcpDialog: null, openEditEnvironment: null, addSessionFolder: null,
    // R4i-rail RL1: the save environment state Ay / Py / My / Ny and c73f45bc3 qc read and write (c227f4d5e's initial
    // values): the start's setup, the move line's outcome, the open save request, and the session the scope shows.
    startedSetup: null, moveLineOutcome: null, saveEnvironmentRequest: null, sessionRef: null }));
}

// ---- the jre state machine -------------------------------------------------------------------------------------------

/**
 * cc43287c9 jre's rail state for one chat tile.
 *
 * enabled          Jt (`ie && !I`): presets on (D10) and not composer-only — a Code session view (not a pane window).
 * sessionId        ce: the session the tile shows (null on the landing page or another section).
 * sessionNotFound  Ee: the session cannot be shown (here: the core has no history for it).
 * besidePane       Xt (`AD($E)`, c03935b01 uo): the tile layout has more than one tile.
 *
 * Kt (the landing face) is `!sessionId`: the host's landing page is the start card. `ae` (Y_, the environment bar) is on
 * (D10), so `en` is always false; jre's spawning draft rail (`nn && le === "spawning"`) has no host source (no draft
 * rail snapshot), so `cn` needs a session.
 */
export function useSessionRail({ enabled = false, sessionId = null, sessionNotFound = false, besidePane = false } = {}) {
  // Yt: the body row. A state-backed ref, so useRailFits re-measures when the row element mounts after this hook ran.
  const [rowElement, setRowElement] = useState(null);
  const Yt = useMemo(() => ({ current: rowElement }), [rowElement]);
  const [U] = useState(createRailScopeStore);
  const ce = useMemo(() => (sessionId ? { id: sessionId, type: "local" } : null), [sessionId]);
  const Jt = enabled === true;
  const Kt = ce === null;
  const Zt = useRailFits(Yt, Jt, besidePane === true);
  const { shown: Qt, setShown: $t } = useRailShown();
  const en = false;
  const tn = Jt && (!Kt || en),
    nn = tn && sessionNotFound !== true,
    an = nn ? ce : null,
    on = an !== null,
    sn = on && Qt && Zt,
    cn = (on || en) && Qt && Zt;
  const [ln, un] = useState(null);
  const dn = an !== null && !sn && ln?.id === an.id;
  if (ln !== null && !dn) un(null);
  const fn = sn || dn;
  useLayoutEffect(() => {
    const e = U.getState();
    (e.railMode !== on || e.railActive !== cn) && U.setState({ railMode: on, railActive: cn });
  }, [U, on, cn]);
  const mn = useRef(null),
    hn = useId();
  const gn = useCallback(() => { un(an ? { id: an.id, focus: false } : null); }, [an]),
    _n = useCallback(() => { un(null); }, []),
    vn = useCallback((e) => {
      if (fn) { un(null); sn && $t(false); return; }
      $t(true);
      Zt || un(an ? { id: an.id, focus: e?.detail === 0 } : null);
    }, [fn, sn, Zt, an, $t]),
    yn = dn || (!fn && !Zt),
    bn = useMemo(() => ({ onScreen: fn, raises: yn, panelId: hn, onToggle: vn }), [fn, yn, hn, vn]);
  return useMemo(() => ({
    enabled: Jt, on, active: cn, docked: sn, raised: dn, onScreen: fn, fits: Zt, shown: Qt, railMode: tn,
    sessionRef: an, scopeStore: U, model: bn, railToggle: on ? bn : undefined, railToggleRef: mn, panelId: hn,
    focusOnMount: ln?.focus === true, raise: gn, dismiss: _n, rowRef: setRowElement,
    // Host: the geometry follows the session view only (`on`): the landing page keeps its own local layout.
    rowClassName: on ? `${RAIL_BODY_ROW_CLASS} ${RAIL_BODY_ROW_INSET_CLASS} ${RAIL_CONTAINER_CLASS} ${RAIL_TITLEBAR_INSET_CLASS} ${RAIL_GUTTER_CLASS}${cn ? ` ${RAIL_CHAT_GEOMETRY_CLASS}` : ""}` : "contents",
    rowProps: cn ? { [RAIL_OVERFLOW_ATTRIBUTE]: "" } : undefined,
    bandClassName: cn ? RAIL_BAND_PADDING_CLASS : "",
    panelBodyClassName: on ? `${CHAT_PANEL_BODY_CLASS} ${HOST_PANEL_BODY_FLEX}` : "contents",
  }), [Jt, on, cn, sn, dn, fn, Zt, Qt, tn, an, U, bn, hn, ln, gn, _n]);
}

/**
 * R4i-rail RL2, cc43287c9 Mte (the session composer): `mr = tp(Zn, e => e.railMode)` and `tn || on || ua || mr ? null :
 * … v(Tee, …)` — the composer's PR band is gone while the session scope store is in rail mode (jre writes `railMode: on`
 * there). The rail's Changes card carries the PR rows now (source-session-rail-changes-adapters.jsx), so the host no
 * longer keeps the band for a pull request (the SR-7 fallback is retired).
 */
export function useSessionRailHidesBand(rail) {
  return useStore(rail?.scopeStore ?? NO_RAIL_SCOPE, (e) => e.railMode) === true;
}
const NO_RAIL_SCOPE = createRailScopeStore();

/** cc5638815a lt: a session popout window reads a session-only rail shown store (cc43287c9 PH: hidden, not persisted);
 * every other window reads the persisted `persisted.epitaxy.sessionRailShown` (shared-20 zm, shown). */
export function SessionRailShownScope({ popout = false, children }) {
  return popout ? <RailShownStoreProvider>{children}</RailShownStoreProvider> : children;
}

// ---- the mount (the chat tile's body row, panel body and docked column) -------------------------------------------

const SessionRailMountContext = createContext(null);
const useMount = () => useContext(SessionRailMountContext);

// The app's own feeds of a session (electron/monitor-service.cjs, schedule-service.cjs), as the Background tasks pane
// reads them (source-background-tasks.jsx useAppFeed): the list, or null until main answers.
function useSessionFeed(sessionId, desktop, action, kind, key) {
  const [list, setList] = useState(null);
  useEffect(() => {
    setList(null);
    if (!sessionId || !desktop?.call) return undefined;
    let live = true;
    desktop.call(action, { sessionId }).then((value) => { if (live) setList(Array.isArray(value) ? value : []); }, () => { if (live) setList((old) => old ?? []); });
    const off = desktop.onEvent?.((event) => { if (live && event?.kind === kind && event.sessionId === sessionId && Array.isArray(event[key])) setList(event[key]); });
    return () => { live = false; off?.(); };
  }, [sessionId, desktop, action, kind, key]);
  return list;
}

// fO's `O` (shared-8 zh over LocalSessions): the session's local record from main.cjs session-rail-meta (SR-5). Main has
// no push for it, so it is read again when the session, its folder or `refreshKey` (the archived flag) change. `pending`
// is fO's meta `w` (the record stands in for the meta query here).
function useRailRecord(call, sessionId, cwd, refreshKey) {
  const [state, setState] = useState({ sessionId: null, record: undefined, pending: false });
  useEffect(() => {
    if (!sessionId || typeof call !== "function") { setState({ sessionId: null, record: undefined, pending: false }); return undefined; }
    let live = true;
    setState((old) => ({ sessionId, record: old.sessionId === sessionId ? old.record : undefined, pending: true }));
    loadLocalSessionRecord(call, sessionId, cwd).then((record) => { if (live) setState({ sessionId, record: record ?? undefined, pending: false }); });
    return () => { live = false; };
  }, [call, sessionId, cwd, refreshKey]);
  return state.sessionId === sessionId ? state : { sessionId, record: undefined, pending: !!sessionId };
}

/**
 * jre's body row (`div ref=Yt`): it carries the row geometry and the rail's providers. `rail` is useSessionRail's
 * answer; `host` the chat tile's data (see the file header). The row is always the same element (display: contents
 * off the session view), so the conversation inside never remounts when the rail mode changes.
 */
export function SessionRailRow({ rail, host, children }) {
  const sessionId = rail?.sessionRef?.id ?? null;
  const record = useRailRecord(host?.call, sessionId, host?.cwd, host?.recordKey);
  const desktop = host?.desktop;
  const monitors = useSessionFeed(sessionId, desktop, "monitor-state", "monitors", "monitors");
  const jobs = useSessionFeed(sessionId, desktop, "schedule-state", "schedules", "jobs");
  const transcriptRef = host?.transcriptRef;
  // jre's `ut` (the transcript scroller): the wheel over the rail scrolls it (cc43287c9 yH).
  const scrollRef = useMemo(() => ({ get current() { return transcriptRef?.current?.getViewport?.() ?? null; } }), [transcriptRef]);
  const value = { rail, host: host ?? {}, record, monitors, jobs, scrollRef };
  useRailScopeOpeners(rail?.scopeStore, rail?.sessionRef ?? null, host?.openSessionMcpDialog);
  return <SessionRailHostContext.Provider value={SessionRailHost}>
    <SessionRailMountContext.Provider value={value}>
      <div ref={rail?.rowRef} className={rail?.rowClassName ?? "contents"} {...rail?.rowProps}>{children}</div>
    </SessionRailMountContext.Provider>
  </SessionRailHostContext.Provider>;
}

/**
 * R4i-rail RL1, cc43287c9 (the session view): `P(() => { if (Em) return e.setState({openSessionMcpDialog: jm}), () =>
 * e.setState({openSessionMcpDialog: null}) }, [e, Em, jm])` — the MCP opener sits on the scope store while it is
 * available, and the scope store knows the session it shows (`sessionRef`, Py / Ny's fallback). Host: `Em` (DP, the
 * session MCP dialog) has no source and Qte's other answer is Settings › Connectors, so the opener is the host's
 * (main.jsx: Customize › Connectors), available while the core is connected; jm's `warmSession` has no host analogue.
 */
function useRailScopeOpeners(scopeStore, sessionRef, openSessionMcpDialog) {
  const latest = useRef(openSessionMcpDialog);
  latest.current = openSessionMcpDialog;
  const available = typeof openSessionMcpDialog === "function";
  useEffect(() => {
    if (!scopeStore || !available) return undefined;
    const jm = () => latest.current?.();
    scopeStore.setState({ openSessionMcpDialog: jm });
    return () => { scopeStore.getState().openSessionMcpDialog === jm && scopeStore.setState({ openSessionMcpDialog: null }); };
  }, [scopeStore, available]);
  useLayoutEffect(() => {
    if (scopeStore && scopeStore.getState().sessionRef !== sessionRef) scopeStore.setState({ sessionRef });
  }, [scopeStore, sessionRef]);
}

/**
 * R4i-rail RL1, c73f45bc3 qc: the environment dialog for the scope store's `saveEnvironmentRequest` (Py puts it there
 * from the rail's Save link): `initialTarget: r?.setup.target ?? null, initialKind: "local", focusName: !0,
 * initialSettings: r?.checkout`, closing clears the request, and a created environment goes to `onSaved` (Kc: added,
 * selected and marked started from, then handed back). Host: the dialog is the host's saved environment dialog
 * (source-saved-environment-dialog.jsx, ca690a791 fn's local kind) over main's saved-environments; `host.saveEnvironment`
 * saves and selects it as the existing Save environment flow does. Differences: the host dialog focuses its first field
 * rather than the name (focusName), and keeps no per-folder checkouts (folderCheckouts off).
 */
export function SessionRailSaveEnvironment({ scopeStore, host }) {
  const r = useStore(scopeStore, (e) => e.saveEnvironmentRequest);
  if (!r || typeof host?.saveEnvironment !== "function") return null;
  const close = () => { scopeStore.getState().saveEnvironmentRequest === r && scopeStore.setState({ saveEnvironmentRequest: null }); };
  return <SourceSavedEnvironmentDialog initialTarget={r.setup.target ?? null} initialSettings={r.checkout ?? {}}
    environments={host.savedEnvironments ?? []} recentFolders={host.recentFolders ?? []} call={host.call}
    onVariables={host.openLocalEnvironment} onClose={close}
    onSave={async (value) => {
      const created = await host.saveEnvironment(value);
      scopeStore.getState().saveEnvironmentRequest?.onSaved({ id: created.id, name: created.name, target: created.target });
    }} />;
}

/**
 * jre's chat panel body around the transcript: tz (`epitaxy-chat-panel-body flex-1 min-h-0 relative`) holding the
 * transcript region (`div ref=ft … className="h-full isolate focus:outline-none"`: its own stacking context, so nothing
 * inside it paints over the overlay) with DH (`on && !ne`, the region opener; no region registry here, so it renders
 * nothing), then jH (`dn && an`, the raised overlay) and wH (`an && !fn`). Off the session view both boxes are
 * `display: contents`. Host: the region is also a flex column, for the local transcript frame (`flex: 1`); it carries
 * no `data-epitaxy-transcript-region` / tabIndex (the local transcript keeps its own focus region).
 */
export function SessionRailChatBody({ children }) {
  const mount = useMount();
  const ft = useRef(null);
  const rail = mount?.rail;
  const host = mount?.host ?? {};
  const an = rail?.sessionRef ?? null;
  return <div className={rail?.panelBodyClassName ?? "contents"}>
    <div ref={ft} className={rail?.on ? TRANSCRIPT_REGION_CLASS : "contents"}>
      {children}
      {rail?.on && <SessionRailOpener model={rail.model} scopeRef={ft} />}
    </div>
    {rail?.raised && an && <SessionRailOverlay sessionRef={an} scopeStore={rail.scopeStore} mountKey={host.mountKey} isPanelActive={host.isPanelActive}
      onRequestComposerFocus={host.onRequestComposerFocus} readOnly={host.readOnly === true} scrollRef={mount.scrollRef} panelId={rail.panelId}
      toggleRef={rail.railToggleRef} focusOnMount={rail.focusOnMount} onDismiss={rail.dismiss} />}
    {an && !rail.onScreen && <SessionRailRaise sessionRef={an} scopeStore={rail.scopeStore} onRaise={rail.raise} />}
    {rail?.on && <SessionRailSaveEnvironment scopeStore={rail.scopeStore} host={host} />}
  </div>;
}

/** jre's `cn ? an ? bH : <div [data-epitaxy-rail-column] className=Gp ref=Wt/> : null`: the docked column (the draft
 * rail placeholder has no host source). */
export function SessionRailColumn() {
  const mount = useMount();
  const rail = mount?.rail;
  const host = mount?.host ?? {};
  if (!rail?.active || !rail.sessionRef) return null;
  return <SessionRailDockedColumn sessionRef={rail.sessionRef} scopeStore={rail.scopeStore} mountKey={host.mountKey} isPanelActive={host.isPanelActive}
    onRequestComposerFocus={host.onRequestComposerFocus} readOnly={host.readOnly === true} scrollRef={mount.scrollRef} />;
}

// cc43287c9 SH: the composer menus that raise an off-screen rail outside the flat rail.
const RAISING_MENUS = new Set(["model", "mode", "permissions", "effort", "context"]);

/**
 * cc43287c9 wH while the rail is off screen: a new `openComposerMenu` request raises it — in the flat rail only
 * "context" (its Context card), after shared-18 Iy releases a picker menu the flat rail has no row for. Host: wH's
 * picker shortcuts (c73f45bc3 Oy, `TN(t, …)`) belong to the composer, which opens its own pickers here, and its Remote
 * Control toasts (`eS`) have no source; nothing in the host writes `openComposerMenu` yet (the composer is another
 * line's, and the Context card is deferred), so this raise path is wired but idle.
 */
export function SessionRailRaise({ scopeStore: t, onRaise: a, pickersElsewhere: i = false }) {
  const o = useStore(t, (e) => e.openComposerMenu),
    s = useRef(o),
    c = useRailFlat();
  useEffect(() => {
    if (o !== s.current) {
      if (((s.current = o), c)) {
        releaseFlatComposerMenu(t, o);
        o?.menu === "context" && a();
        return;
      }
      o && RAISING_MENUS.has(o.menu) && !(i && FLAT_RELEASED.has(o.menu)) && a();
    }
  }, [o, a, i, t, c]);
  return null;
}
// cc43287c9 Tp (shared-18 Fy): the pickers a flat rail releases.
const FLAT_RELEASED = new Set(["model", "mode", "permissions", "effort"]);

// ---- fO's host stand-in ------------------------------------------------------------------------------------------------

/** shared-20 Hk (cf74bc599 sa): a named environment's icon by its target kind. */
export function environmentIcon(kind) {
  switch (kind) {
    case "local": return "Laptop";
    case "cloud": return "Cloud";
    case "ssh": return "CommandLine";
    case "bridge": return "Cursor";
  }
}

// shared-78 qa's test (Ka): a Windows user agent.
const WINDOWS_AGENT = /(win32|win64|windows|wince)/i;
/** c18ab0d94 C (c856385e2 Be): the reveal item's label by platform. */
export function revealLabel(intl) {
  if (isMacUserAgent()) return intl.formatMessage({ defaultMessage: "Show in Finder", id: "LVY6c4L1SF" });
  const agent = typeof window === "undefined" ? "" : window.navigator?.userAgent?.toLowerCase?.() ?? "";
  return WINDOWS_AGENT.test(agent) ? intl.formatMessage({ defaultMessage: "Show in Explorer", id: "ySAk9qhogV" })
    : intl.formatMessage({ defaultMessage: "Show in file manager", id: "3NCn5oLFoE" });
}

// c3e58cab4 p (Qf): a copied path without control and bidi characters.
const COPY_STRIPPED = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;
// c227f4d5e mL: the groups as one list, a separator before each later group.
function groupedItems(groups) {
  const out = [];
  for (const group of groups) group.forEach((item, index) => { out.push(index === 0 && out.length > 0 ? { ...item, separatorBefore: true } : item); });
  return out;
}

/**
 * c227f4d5e pL (cf74bc599 hl): a folder chip's menu. `actions` are the host's: `revealFolder(dir)`, `copyText(text,
 * message)` (the clipboard with a success toast, as eo + addSuccess) and `openTerminal(dir)`.
 * - r: dn's extra items for `localCwd` (c856385e2 W): the reveal item (no "Default app": pL passes no sessionId); no
 *   repository link (the host has no forge links for a folder, so `repoLinks` is never set).
 * - o: Copy ▸ Path / Branch name, or Copy path, or Copy branch name; pL's "Change folder…" / "Choose folder…" (uL, the
 *   desktop's changeCwd) has no host source, and fO's "Add folder…" (`He`, the scope store's addSessionFolder) is null.
 * - s: Open in terminal.
 */
export function railRepoMenuItems(intl, { cwd, localCwd, branch, terminalCwd } = {}, actions = {}) {
  const r = localCwd && actions.revealFolder ? [{ label: revealLabel(intl), onSelect: () => actions.revealFolder(localCwd) }] : [];
  const copy = (text, message) => actions.copyText?.(text, message);
  const copyPath = () => { cwd && copy(cwd.replace(COPY_STRIPPED, ""), intl.formatMessage({ defaultMessage: "Path copied to clipboard.", id: "hxPm8s77hY" })); };
  const copyBranch = () => { branch && copy(branch, intl.formatMessage({ defaultMessage: "Branch name copied to clipboard.", id: "fgBg6M20SL" })); };
  const o = [];
  if (actions.copyText) {
    if (cwd && branch) o.push({ label: intl.formatMessage({ defaultMessage: "Copy", id: "4l6vz1/eZ5" }), items: [
      { label: intl.formatMessage({ defaultMessage: "Path", id: "Qp1beM93yV" }), onSelect: copyPath },
      { label: intl.formatMessage({ defaultMessage: "Branch name", id: "aXh5Ujo5jI" }), onSelect: copyBranch },
    ] });
    else if (cwd) o.push({ label: intl.formatMessage({ defaultMessage: "Copy path", id: "Qask1i8TzH" }), onSelect: copyPath });
    else if (branch) o.push({ label: intl.formatMessage({ defaultMessage: "Copy branch name", id: "31wtg7KV1e" }), onSelect: copyBranch });
  }
  const s = terminalCwd && actions.openTerminal ? [{ label: intl.formatMessage({ defaultMessage: "Open in terminal", id: "M1fJAb8qse" }), onSelect: () => actions.openTerminal(terminalCwd) }] : [];
  return groupedItems([r, o, s]);
}

// mention-output-model.mjs's memory folders (XJ/YJ): outputs never listed. Kept textually equal to that module's
// regex (tests/session-rail-mount.test.mjs compares them).
const MEMORY_PATH = /(?:\/mnt\/\.auto-memory|^\/mnt\/memory|^\/tmp\/claude\/memory|\/\.claude\/(?:agent-memory(?:-local)?|projects\/[^/]+\/(?:memory|tiny_memory))|\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(?:memory|spaces\/[^/]+\/memory|agent\/memory))(?:\/|$)/;
const ABSOLUTE = (value) => /^(?:\/|[A-Za-z]:[\\/])/.test(value);

/**
 * The messages cf74bc599 yE reads (`Yd(e, …)` over the transcript), in the shape c73f45bc3 Rv takes: one
 * `{author: "assistant", outputFiles: [{path, written}]}` per completed host item with a file it wrote (a fileChange
 * add / update) or delivered (a deliverable record), paths absolute against the session folder — the same records
 * mention-output-model.mjs sessionOutputFiles builds before its own Rv pass.
 */
export function railOutputMessages(items, workingDir) {
  if (typeof workingDir !== "string" || !ABSOLUTE(workingDir)) return [];
  const resolve = (value) => normalizeOutputPath(ABSOLUTE(value) ? value : `${workingDir}/${value}`);
  const messages = [];
  for (const item of items ?? []) {
    if (item?.status !== "completed" || item.error || item.result?.isError) continue;
    const records = [];
    if (item.type === "fileChange") {
      for (const change of item.changes ?? []) {
        const kind = typeof change.kind === "string" ? change.kind : change.kind?.type;
        if (kind === "add" || kind === "update") records.push({ path: change.kind?.move_path || change.path, written: true });
      }
    }
    for (const file of itemDeliverables(item) ?? []) records.push({ path: file.path, written: false });
    const outputFiles = records.flatMap((record) => {
      if (typeof record.path !== "string" || !record.path || /[\\/]$/.test(record.path)) return [];
      const path = resolve(record.path);
      return MEMORY_PATH.test(path) || isSideSessionNotesPath(path) ? [] : [{ path, written: record.written }];
    });
    if (outputFiles.length) messages.push({ author: "assistant", outputFiles });
  }
  return messages;
}

/**
 * fO's `E` (c5da7eb42 St, the session's repository discovery) from the host's git status of the session folder
 * (electron/git-status.cjs workspaceGitStatus): undefined while it loads, [] without a repository, else the one primary
 * repository (`isPrimary`, shared-18 Fc) with its checked-out branch. The host has no forge slug for it (`repo`), so
 * the folder name comes from cO's git-info repo name or the folder, as fO falls back.
 */
export function railDiscovery(status) {
  if (status === undefined || status === null) return undefined;
  if (!status.isRepo) return [];
  const branch = !status.detached && typeof status.branch === "string" && status.branch ? status.branch : undefined;
  return [{ isPrimary: true, cwd: typeof status.cwd === "string" && status.cwd ? status.cwd : undefined, repo: undefined, currentBranch: branch, branch }];
}

const NO_STEPS = Object.freeze([]);
const NO_ARTIFACTS = Object.freeze([]);
const isLocalRef = (ref) => ref.type === "local" || ref.type === "cli";

/** kit LazySessionRailHost's component: the QueryClient cO's git-info queries need, around the host view. */
function SessionRailHost(props) {
  return <QueryClientProvider client={fileBrowserQueryClient}><SessionRailHostView {...props} /></QueryClientProvider>;
}

/** cf74bc599 fO's host stand-in (see the file header). Props are bH / jH's: sessionRef, scopeStore, readOnly, className. */
export function SessionRailHostView({ sessionRef: e, scopeStore: t, readOnly: o = false, className: s = "h-full" }) {
  const mount = useMount();
  const host = mount?.host ?? {};
  useComposerMenuOpensRailSection(t, e.id);
  const _ = useIntl();
  // fO `c = m(ki)` (the flat rail), `p = Q(t, e => e.openSessionMcpDialog)` and `g = _g(e.type === "local" && p !== null ?
  // e.id : null)` (R4i-rail RL1: the session's MCP counts over the host connector list, session-rail-connectors-model).
  const c = useRailFlat();
  const p = useStore(t, (state) => state.openSessionMcpDialog);
  const g = useSessionMcpCounts(e.type === "local" && p !== null ? e.id : null, host.connectors, host.cwd);
  const x = isLocalRef(e);
  // fO `S = Td(e, rO)`: no session meta query here; the record fallback `k` below is the meta (its pending state `w`).
  const C = undefined;
  const w = mount?.record?.pending === true;
  // fO `T = Od(e)` / `D = lO(!(E !== void 0 || T.isError || …), BE)`.
  const E = useMemo(() => railDiscovery(host.gitStatus), [host.gitStatus]);
  const D = useRailPendingHold(!(E !== undefined || !!host.gitError), RAIL_PENDING_GIVE_UP_MS);
  // fO `O = Oa(e.type === "local" ? e.id : null)` and `k`.
  const O = e.type === "local" && mount?.record?.sessionId === e.id ? mount.record.record : undefined;
  const k = useMemo(() => (C ? C : O ? railMetaFromRecord(O) : undefined), [C, O]);
  const A = useRailPendingHold(!k && w, RAIL_PENDING_GIVE_UP_MS);
  // fO's draft rail hold (`j` / `M` / `N`): the scope store's draftRail is never set here.
  const P = e.type === "local" ? E?.find((repo) => repo.isPrimary) : E?.[0],
    F = P ?? E?.find((repo) => !repo.cwd),
    I = x ? k?.workingDir : undefined,
    ee = useCheckoutInfo(I, k?.remote),
    L = useCheckoutInfo(x && k?.originCwd !== I ? k?.originCwd : undefined, k?.remote),
    R = O !== undefined && lazyWorktreePending(railLazyPendingArgs(O, x)),
    { remote: z, archived: B, leasedPath: V } = railRecordFacts(O, R);
  // fO `{ data: H = oO } = Ti({ ...$a(V, "local"), select: sO, staleTime: 0 })`: the leased checkout (never one here,
  // D38: no lazy worktree), read the same way as cO.
  const H = useCheckoutInfo(V, undefined);
  // fO's environment: U (environmentId) is undefined for a local session, so the environment queries stay off.
  const U = k?.environmentId,
    ie = false,
    ae = undefined, // fn(k?.remote): a remote host label, none for a local session
    ce = true, // to(): the presets gate, on (D10)
    K = useNamedEnvironment(host, e.id, ce),
    // fO `ke`: iD's connectors (the local branch; `Ce`, a remote session's counts, never holds here).
    ke = useMemo(() => railConnectors(p ? g : undefined, p, connectorRows, connectorLabel), [g, p]),
    le = _.formatMessage({ defaultMessage: "This computer", id: "Red8UM0oCv" }),
    ue = _.formatMessage({ defaultMessage: "Cloud", id: "fiPvwYljok" }),
    de = _.formatMessage({ defaultMessage: "Remote Control", id: "4mv6Z9Tv+V" }),
    q = useMemo(() => ({
      local: _.formatMessage({ defaultMessage: "Local session", id: "c/uojv10Mk" }),
      ssh: _.formatMessage({ defaultMessage: "SSH session", id: "LzN9b22qqE" }),
      wsl: _.formatMessage({ defaultMessage: "WSL session", id: "qg11htpIQ8" }),
      cloud: _.formatMessage({ defaultMessage: "Cloud session", id: "CGn+lGT0pS" }),
      selfHosted: _.formatMessage({ defaultMessage: "Self-hosted session", id: "nuuiY6kpg5" }),
      bridge: _.formatMessage({ defaultMessage: "Remote Control session", id: "eJU+Ev6oqj" }),
    }), [_]),
    pe = undefined,
    me = useRailPendingHold(!!U && !pe, NAME_PENDING_GIVE_UP_MS),
    // fO `ve = AE(Ih(e.id, ge, _e))`: c73f45bc3 C_ answers nothing for a local session.
    ve = environmentConnection(undefined),
    J = environmentKind({ remoteHost: ae, isBridge: ie, isLocal: x, environmentId: U, selfHostedPoolId: k?.selfHostedPoolId }),
    // fO's details `Me`: `Ae = J === "local" ? fg() : void 0` is the desktop's machine name (c73f45bc3 Ny), which this host
    // has no source for; no SSH host, runner, bridge computer or local environment details (`Zc` = c227f4d5e Dq: none).
    Me = NO_STEPS,
    Ne = _.formatMessage({ defaultMessage: "No folder", id: "OknGVA5bmf" });
  const Pe = useMemo(() => {
    if (!k) return { environment: A ? { label: null, kind: null } : null, folder: null, extraFolders: [], branch: null, worktree: null, goal: null, isLocal: x };
    const env = railEnvironment({ kind: J, remoteHost: ae, remoteKind: k.remote?.kind, environmentName: pe, selfHostedPoolName: k.selfHostedPoolName,
      namePending: me, labels: { local: le, cloud: ue, bridge: de }, kinds: q, named: K && { name: K.name, icon: environmentIcon(K.target?.kind) } });
    const details = [...(env.details ?? []), ...Me];
    const n = { ...env, place: env.place, connection: ve, details: details.length > 0 ? details : undefined, learnMoreUrl: undefined };
    const r = railFolder({ isLocal: x, originCwd: k.originCwd, workingDir: k.workingDir, isScratchWorkspace: k.isScratchWorkspace, scratchLabel: Ne,
      discoveredSlug: P?.repo, cachedRepoName: ee.repoName ?? L.repoName });
    const i = new Set([k.workingDir, k.originCwd]);
    const a = railExtraFolders({
      directories: [...new Set(k.additionalDirectories ?? [])].filter((dir) => !i.has(dir) && !isSideSessionNotesFolder(dir)),
      trees: k.folderTrees,
      // Xm(e): no forge links for a host repository.
      repos: D ? [] : otherRepos(E ?? [], P, r).map((repo) => ({ repo: repo.repo, cwd: repo.cwd, branch: repo.currentBranch || repo.branch, repoLinks: undefined })),
      repoSlugs: k.repoSlugs,
      primary: r,
    });
    const liveWorktree = x && k.workingDir !== k.originCwd;
    const known = knownBranch({ liveWorktree, recorded: O?.branch, checkedOut: ee.branch, metaBranch: k.git?.branch });
    return {
      environment: n, folder: r, extraFolders: a,
      branch: railBranch({ discovered: D ? undefined : F?.currentBranch || F?.branch || null, known, inCheckout: liveWorktree || k.git !== undefined || k.repoSlugs.length > 0,
        startedWithWorktree: x ? k.startedWithWorktree : undefined }),
      worktree: railWorktree({ isLocal: x, originCwd: k.originCwd, workingDir: k.workingDir, hasDesktopWorktree: k.hasDesktopWorktree }),
      startedWithWorktree: x ? k.startedWithWorktree : undefined,
      worktreeRemoved: x ? k.worktreeRemoved : undefined,
      worktreePending: lazyWorktreeState({ pending: R, remote: z, archived: B, leasedPath: V, leasedBranch: H.branch }),
      goal: k.goal ?? null,
      isLocal: x,
    };
  }, [k, A, O?.branch, R, z, B, V, H.branch, P, E, F, D, ve, Me, K, Ne, ee, L.repoName, x, J, ae, pe, me, le, q, ue, de]);
  // fO's folder menus: `Re = Iu(e)(Pe.folder?.path)` (c227f4d5e fL maps a scratch folder to its folder on disk; the
  // path itself here), `ze`, `Be = zd(e)` (the meta's `{remote}`: the record fallback here), `Ve = wg(e, "session_rail")`.
  const Re = Pe.folder?.path,
    ze = Pe.folder?.hidePath ? undefined : Re,
    Be = k ? { remote: k.remote } : null,
    actions = useMemo(() => ({ revealFolder: host.revealFolder, copyText: host.copyText, openTerminal: host.openTerminal }), [host.revealFolder, host.copyText, host.openTerminal]),
    Ve = actions.openTerminal;
  const We = useMemo(() => railRepoMenuItems(_, { cwd: ze, localCwd: e.type !== "remote" && Be ? ze : undefined, terminalCwd: Re }, actions),
    [_, ze, e.type, !!Be, Re, actions]);
  // fO `Qe` → cf74bc599 dO: an additional folder's chip with its own menu (no change-folder target).
  const onHost = e.type !== "remote" && !!Be;
  const Qe = useCallback((folder, trailing, after) => {
    const items = railRepoMenuItems(_, { cwd: folder.cwd, localCwd: onHost ? folder.cwd : undefined, branch: folder.branch, terminalCwd: folder.cwd }, actions);
    return <RailFolderRow interactive={(items?.length ?? 0) > 0} trailing={trailing} after={after}>
      <RepoNameChip repoName={folder.name} tooltip={_.formatMessage({ defaultMessage: "Additional folder", id: "B1pgBoXI+/" })} tooltipDetail={folder.path}
        menuItems={items} className="min-w-0 max-w-none text-primary" />
    </RailFolderRow>;
  }, [_, onHost, actions]);
  // fO `$e`: the branch chip's Open in terminal (the leased checkout once it has a branch; never here).
  const $e = useMemo(() => {
    if (!Re || !Ve) return undefined;
    const dir = V && H.branch !== undefined ? V : Re;
    return [{ label: _.formatMessage({ defaultMessage: "Open in terminal", id: "M1fJAb8qse" }), separatorBefore: true, onSelect: () => Ve(dir) }];
  }, [_, Re, Ve, V, H.branch]);
  // fO's Remote Control row (`nt = cu(…)`, claude.ai): no props, not available, so zE answers undefined.
  const rt = useRailPendingHold(!C && w, RAIL_PENDING_GIVE_UP_MS);
  const at = remoteControlState({ metaFetched: !!C, metaPending: rt, props: undefined, available: false, discoveryPending: D,
    hasRepo: (k?.repoSlugs?.length ?? 0) > 0 || (E?.some((repo) => repo.repo) ?? false), hasBranchRow: Pe.branch !== null });
  // R4i-rail RL1, fO `St = Ay({scopeStore: t, environmentsOn: ce, sessionId: e.id, isLocal: e.type === "local", meta: S.data,
  // besideNamed: c && !K})`: the folder's save setup. Host: the meta query has no source, so its record fallback `k` is the
  // meta (as everywhere in this stand-in); Ay reads the saved environments and this session's record from the adapter
  // stores, which follow the host here.
  useLayoutEffect(() => { setRailSavedEnvironments(host.savedEnvironments); }, [host.savedEnvironments]);
  useLayoutEffect(() => { if (e.type === "local") setRailLocalSession(e.id, O); }, [e.type, e.id, O]);
  const St = useSaveEnvironmentSetup({ scopeStore: t, environmentsOn: ce, sessionId: e.id, isLocal: e.type === "local", meta: k, besideNamed: c && !K });
  // c227f4d5e pW (fO `Ct = il(t)`): rD's tail slot is the scope store's railTailEl.
  const Ct = useMemo(() => (el) => { t.setState({ railTailEl: el }); return () => { t.getState().railTailEl === el && t.setState({ railTailEl: null }); }; }, [t]);
  const sections = useSectionsHost(mount, e, k, B);
  const outputs = useMemo(() => ({ sessionId: e.id, messages: railOutputMessages(host.items, host.cwd) }), [e.id, host.items, host.cwd]);
  const changes = host.changes;
  const wt = <SessionRail
    session={Pe}
    // R4i-rail RL2: the PR rows (nze / eze over the band's own data: the branch's pull request, its Create PR action).
    pullRequests={o ? undefined : <SessionRailChanges key={e.id} status={host.gitStatus ?? null} diffOpenable={changes?.diffOpenable === true}
      onOpenChanges={changes?.onOpen} onToggleChanges={changes?.onToggle} diffOpenHasChord={changes?.hasChord === true} verb={changes?.verb ?? null}
      warning={changes?.warning} hint={changes?.hint ?? null} pr={changes?.pr ?? null} prAction={changes?.prAction ?? null} onOpenPr={changes?.onOpenPr} />}
    plan={NO_STEPS}
    artifacts={NO_ARTIFACTS}
    repoMenuItems={Pe.folder?.path ? We : undefined}
    addFolder={undefined}
    // fO `chooseFolder: Ke` (c227f4d5e Ya over a scratch folder, the desktop's changeCwd): no host source.
    chooseFolder={undefined}
    renderExtraFolder={Qe}
    branchUrl={undefined}
    branchMenuItems={$e}
    outputsSession={e}
    sessionKey={e.id}
    connectors={ke}
    saveEnvironment={St && !o ? <RailSaveEnvironmentRow scopeStore={t} sessionId={e.id} setup={St} /> : undefined}
    environmentSave={St && !o && c && !K ? <RailSaveEnvironmentLink scopeStore={t} sessionId={e.id} setup={St} /> : undefined}
    remoteControl={at}
    controls={undefined}
    // R4i-rail RL3: fO `contextSection: o ? void 0 : u(cg, { scopeStore: t, sessionRef: e })` (c73f45bc3 iy over the
    // host's context source, SessionRailContextHostContext below).
    contextSection={o ? undefined : <SessionRailContext scopeStore={t} sessionRef={e} />}
    usageSection={undefined}
    serversSection={<SessionRailServers sessionRef={e} readOnly={o} />}
    backgroundSection={<SessionRailBackgroundTasks sessionRef={e} readOnly={o} />}
    tailRef={Ct}
    className={s} />;
  // fO `u(ug, { snapshot: j, held: N, … })`: c73f45bc3 Ty shows a draft rail snapshot while it is held; never here.
  return <SessionFileOpenerProvider value={host.openFile ?? null}>
    <SessionRailOutputsContext.Provider value={outputs}>
      <SessionRailSectionsHostContext.Provider value={sections}>
        <SessionRailContextHostContext.Provider value={host.context ?? null}>{wt}</SessionRailContextHostContext.Provider>
      </SessionRailSectionsHostContext.Provider>
    </SessionRailOutputsContext.Provider>
  </SessionFileOpenerProvider>;
}

// fO `K = ey(e.id, ce)`: the saved environment the session started from (main.cjs records sessionMetadata.environmentId
// when a session starts from one), while the presets gate is on. R4i-rail RL1: shared-19 O7 first reads the environment
// the session was recorded into (Py's `$e` after the rail's Save; this window only, see the adapters).
function useNamedEnvironment(host, sessionId, environmentsOn) {
  const id = useSessionEnvironmentId(sessionId, host.environmentId), list = host.savedEnvironments;
  return useMemo(() => (environmentsOn && typeof id === "string" && Array.isArray(list) ? list.find((env) => env?.id === id) : undefined),
    [environmentsOn, id, list, sessionId]);
}

/**
 * R4i-rail RL1, c73f45bc3 Cd (fO's `_g`) over the host: the session's MCP counts from the Customize store's `mcp` slice
 * (`source.mcp`), loaded for the session's thread when the counts are first asked for (`source.load`: customize-store
 * loadMcp with the session and its folder; the store keeps the list fresh from the core's startup notifications and
 * answers again only when the session or folder changes), with Cd's hold of the last known counts. Null: no source.
 */
function useSessionMcpCounts(sessionId, source, cwd) {
  const on = sessionId !== null && !!source;
  const load = useRef(source?.load);
  load.current = source?.load;
  useEffect(() => { if (on) load.current?.(); }, [on, sessionId, cwd]);
  const mcp = source?.mcp;
  const s = useMemo(() => (on ? sessionMcpCounts(mcp, sessionId) : NO_SESSION_MCP_COUNTS), [on, mcp, sessionId]);
  const [held, setHeld] = useState(() => ({ id: sessionId, counts: s }));
  const next = heldMcpCounts(held, sessionId, s);
  if (next.counts !== null && (next.id !== held.id || next.counts !== held.counts)) setHeld({ id: next.id, counts: next.counts });
  return next.shown;
}

/**
 * The SessionRailSectionsHostContext value for the Servers and Background tasks sections (fO's `serversSection` /
 * `backgroundSection`): the Preview pane's servers, the Background tasks pane's tasks plus the app's Monitor and schedule
 * feeds, and the host's real stops.
 * - Tasks with an unknown status (a lost connection) are left out: the official groups count every non-live task as
 *   finished, and the Tasks pane lists these under "Status unavailable" instead.
 * - A task the host cannot stop (`stoppable: false`, or an agent run without a turn) refuses, so the row's stop shows the
 *   official failure; the Tasks pane hides Stop for them.
 */
function useSectionsHost(mount, sessionRef, meta, archived) {
  const host = mount?.host ?? {};
  const sessionId = sessionRef.id;
  const desktop = host.desktop;
  const coreTasks = host.tasks;
  const monitors = mount?.monitors, jobs = mount?.jobs;
  const hostTasks = useMemo(() => [...(Array.isArray(coreTasks) ? coreTasks : []), ...monitorTasks(monitors ?? [])], [coreTasks, monitors]);
  const tasks = useMemo(() => railSectionTasks(hostTasks), [hostTasks]);
  const snapshot = host.preview?.snapshot;
  const ownSnapshot = snapshot?.sessionId === sessionId ? snapshot : null;
  const servers = useMemo(() => (ownSnapshot ? railServerRows(ownSnapshot) : undefined), [ownSnapshot]);
  const sectionMeta = useMemo(() => (meta ? { workingDir: meta.workingDir, originCwd: meta.originCwd, loops: jobs ? railLoopRows(jobs) : undefined, isArchived: archived } : undefined),
    [meta, jobs, archived]);
  const tasksRef = useRef(hostTasks);
  tasksRef.current = hostTasks;
  const call = useMemo(() => (desktop?.call ? (action, params) => desktop.call(action, params) : null), [desktop]);
  const previewServerId = useMemo(() => shownServerId(ownSnapshot), [ownSnapshot]);
  const openPane = host.openPane, previewAvailable = host.preview?.available === true;
  const openSidePanes = useMemo(() => [...(host.openPanes ?? [])], [host.openPanes]);
  const sidePanes = useMemo(() => ({
    hasSidePanes: true, previewViews: previewAvailable, previewServerId, openSidePanes,
    // QD: a row asks the Preview pane for its server (`requestServerLogs(serverId, serverId)`), then opens the pane: here
    // the Preview pane navigates to the server's address.
    requestServerLogs: (_previewId, serverId) => {
      const server = ownSnapshot?.servers?.find((entry) => `preview:${entry?.name}` === serverId);
      if (server?.url && call) call("preview-navigate", { sessionId, url: server.url }).catch(() => {});
    },
    setSidePane: (pane) => { openPane?.(pane); },
    setPendingRemotePreviewOpen() {},
  }), [previewAvailable, previewServerId, openSidePanes, ownSnapshot, call, sessionId, openPane]);
  const stopTask = host.stopTask, openTasks = host.openTasks;
  const stops = useMemo(() => railSectionStops({ call, sessionId, tasks: () => tasksRef.current, stopTask }), [call, sessionId, stopTask]);
  return useMemo(() => ({
    meta: sectionMeta, servers, tasks, sidePanes, ...stops,
    openTasksPane: typeof openTasks === "function" ? openTasks : null,
    rowsStore: taskRowsStore, dismissedStore: dismissedTasksStore,
  }), [sectionMeta, servers, tasks, sidePanes, stops, openTasks]);
}

/** The Background tasks rows the rail lists: the host tasks without the unknown ones (see useSectionsHost). */
export function railSectionTasks(hostTasks) {
  return railTaskRows((hostTasks ?? []).filter((task) => task.status !== "unknown"));
}

/**
 * The sections' stops over the host: a server through Preview (preview-server-stop), a loop through the scheduler
 * (schedule-stop), a Monitor through monitor-stop, any other task through the Background tasks pane's own stop
 * (main.jsx stopBackgroundTask). `tasks()` reads the host tasks (with the Monitor ones) at stop time.
 */
export function railSectionStops({ call, sessionId, tasks, stopTask }) {
  return {
    stopServer: (server) => (call ? call("preview-server-stop", { sessionId, name: server.name }) : Promise.reject(Error("no desktop"))),
    stopLoop: (loop) => (call ? call("schedule-stop", { sessionId, id: loop.id }) : Promise.reject(Error("no desktop"))),
    stopTask: async (taskId) => {
      const task = tasks().find((entry) => entry.id === taskId);
      if (!task) throw Error("unknown task");
      if (task.monitorId) { if (!call) throw Error("no desktop"); return call("monitor-stop", { sessionId, id: task.monitorId }); }
      if (task.stoppable === false || (task.kind !== "bash" && task.kind !== "workflow" && !task.turnId)) throw Error("not stoppable");
      if (typeof stopTask !== "function") throw Error("no stop");
      return stopTask(task);
    },
  };
}

// ZD's shown server (`l === e.server.serverId`): the server whose address the Preview pane shows.
function shownServerId(snapshot) {
  if (!snapshot?.url || !Array.isArray(snapshot.servers)) return undefined;
  let shown;
  try { shown = new URL(snapshot.url).origin; } catch { return undefined; }
  const server = snapshot.servers.find((entry) => { try { return entry?.url && new URL(entry.url).origin === shown; } catch { return false; } });
  return server ? `preview:${server.name}` : undefined;
}
