// Local services for the original 3.6556.2 session rail view that scripts/extract-session-rail.mjs emits
// (src/generated/session-rail, R4f-rail SR-2; w5-session-rail-gen moved it from 2.42304.0). Each export replaces one import or same-chunk binding of the original, and
// the extractor checks the declaration it stands for (file:local, with feature strings) before it accepts it.
//
// Host differences in one place (r4-session-rail.md §3):
// - no CDS layer element, no navigation region registry, no claude.ai account (Remote Control, artifacts), no CLI goal,
//   no desktop git-state bridge, no scratch workspace, no session-file existence service;
// - the rail's output files come from the host transcript (SessionRailOutputsContext, filled by the mount, SR-7);
// - branches the host can never reach (Remote Control row, Goal / Progress card bodies, artifact rows, the bridge's
//   "Learn more" link) refuse to render instead of approximating the original.
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
// R6: view-tabs through the facade, by semantic name.
import { cdsClassNames } from "./generated/view-tabs/index.js";
import { useSessionFileOpener } from "./generated/r3b-transcript/session-file-access.mjs";
import { recentOutputPaths } from "./generated/code-current/file-output-order.mjs";
import { useStableArray } from "./generated/session-rail/stable-array.mjs";
import { InlineBand } from "./generated/session-rail/inline-band.mjs";
import { createStore, useStore } from "./generated/session-rail-kit/react-store.mjs";
import { t } from "../electron/i18n/index.mjs";
import { useSourceToasts } from "./source-toast.jsx";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import { usePersistedValue, writePersistedValue } from "./source-files-changes-adapters.jsx";
import { HOST_GROWTHBOOK, growthBookFlagKey, hostGrowthBookFlag } from "./host-growthbook.mjs";
import { keptAwakeStore, sleepInterruptionStore, subscribeSendBegun } from "./kept-awake-model.mjs";

// vendor-intl q / Gt, shared-4 Sk: the same host services as the rail kit (SR-1).
export { useIntl, FormattedMessage, RegionEntry } from "./source-session-rail-kit-adapters.jsx";

// 3.6556.2: the rail's skeletons (CdsSkeleton / CdsLoadingSkeleton), the layer-aware z-index (useCdsLayerAwareZIndex), the
// text link (CdsTextLink) and the connector icon (shared-7 Hk, mcp-app-card's one copy) are generated originals; the
// 2.42304.0 SkeletonGroup / Skeleton / useLayerAwareZIndex / ConnectorIcon stand-ins are gone with the adapters they were.

function refuse(what, why) {
  throw Error(`Session rail host adapter: ${what} is not available in this host (${why})`);
}

// ---- c856385e2 rr: a file reference that opens in the session's Files pane ----
// rr (exported m; 2.42304.0 In) is the transcript's file reference. For a local path with the session's file opener (W(), here the
// r3b-transcript SessionFileOpenerProvider the mount provides) and no stop (Ln: a read refusal or the links block — remote
// sessions only), it is An: a span role="button" (tabIndex 0, Enter / Space / click open the path) with "inline-block
// aria-busy:cursor-progress aria-busy:opacity-60" and the caller's class. Without an opener it is the fallback. Host
// differences: no transcript file menu around it (Copy path / Reveal / Open with default app, c0cdf4a08 `_` with
// c856385e2 Q), no ⌘-click "open with default app", no gone-check before opening (c856385e2 V) and no pending read.
export function SessionFileRef({ fileRef, className, children, fallback }) {
  const open = useSessionFileOpener();
  if (!fileRef || !open) return fallback;
  const go = () => open(fileRef.path, fileRef.line, fileRef.endLine);
  return <span role="button" tabIndex={0} onClick={go}
    onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); go(); } }}
    className={cdsClassNames("inline-block aria-busy:cursor-progress aria-busy:opacity-60", className)}>{children}</span>;
}

// c280f9bbb L (exported n): GrowthBook __gb__2954460583 (the file icon set) unless fizzy "icons" (`e && !f("icons")`). No
// GrowthBook here: off, as every GrowthBook gate of this host (D29 / D31). The flat rail (D10) shows the CdsIcon by kind before it reads this.
export function useFileIconSetEnabled() {
  return false;
}

// c73f45bc3 Vb (exported x; 2.42304.0 Sv): the scratch workspace's copy-of mapping (`scratchCarried` in the session meta). This host has no
// scratch workspace (r4-session-rail.md §3 #11), so there is no mapping: null, as for a session without one.
export function useScratchCopyOf() {
  return null;
}

// shared-11 _m (exported ki; 2.42304.0 Fd): the live branch of a checkout from the branch rows store, which the desktop's git-state bridge fills
// (`Pe.getGitStateSnapshot` / `onGitStateChanged`). There is no such bridge here, so the store stays empty: undefined,
// and cO keeps the branch its git-info query selected.
export function useLiveCheckoutBranch() {
  return undefined;
}

// ---- cf74bc599: the Outputs card's data ----

// cf74bc599 ZA (2.42304.0 yE): the session's output files, `J_(cu(id, Rh(id), null, du(id), Sm(sessionRef), bu(id)), checkouts,
// copyOf, folders)` kept stable by shared-25 UH. Yd reads the desktop's transcript store; here the mount provides the session's messages in
// the shape c73f45bc3 Rv (code-current recentOutputPaths) reads — `{ author: "assistant", outputFiles: [{ path, written
// }] }` from completed file changes and deliverables, as mention-output-model.mjs builds them — and the rest is the
// original: Rv over them with the rail's checkouts, copy-of mapping and folders, then zU.
export const SessionRailOutputsContext = createContext(null);
const NO_MESSAGES = [];
export function useSessionOutputPaths({ sessionRef, checkouts, copyOf, folders }) {
  const sessionId = sessionRef?.id;
  const outputs = useContext(SessionRailOutputsContext);
  const messages = outputs?.sessionId === sessionId ? outputs.messages ?? NO_MESSAGES : NO_MESSAGES;
  const paths = useMemo(() => recentOutputPaths(messages, checkouts, copyOf, folders), [messages, checkouts, copyOf, folders]);
  return useStableArray(paths);
}

// cf74bc599 zA (2.42304.0 sE): the output paths that no longer exist. It only checks when the desktop's LocalSessions bridge
// has resolveSessionFile (`o = Ge?.resolveSessionFile !== void 0`), and otherwise returns FA, which its memo turns into IA
// — the one empty Set. This host's LocalSessions (source-files-changes-adapters.jsx) has no resolveSessionFile.
const NO_GONE_PATHS = new Set();
export function useGoneOutputPaths() {
  return NO_GONE_PATHS;
}

// ---- cf74bc599: rail parts with no source in this host ----

// SM (2.42304.0 ED): the Remote Control row (claude.ai Remote Control; the host never passes `remoteControl`, D17).
export function RemoteControlRow() {
  return refuse("the Remote Control row", "claude.ai Remote Control (D17)");
}
// W14-code r4 shell fr4-12a (E95): vM, the Goal card's body, is generated now (rail-view.mjs); the host maps the core's goal
// onto the card's fields with railGoal below and SourceGoalStrip is gone.

/**
 * cf74bc599 Gj's `session.goal` (TN: `goal: L.goal ?? null`, the CLI goal of the session meta: `{condition, iterations,
 * lastReason?, setAt, editText?}`) over a core goal (Codex thread/goal/*: `{objective, status, codeDesktop?}`). What the
 * core does not report takes the card's empty value: iterations the core's rounds or 0 (_M "Not checked yet"), lastReason
 * a blocked goal's reason or absent, setAt the goal's own time or its objective (vM keys and measures by it). editText (vM's
 * Edit goal, `onEdit(editText, keyboard)` → TN's AA `/goal ${editText}`) is `edit <objective>`, the core's in-place edit,
 * only while the goal can be edited (`editable`) and is not complete.
 */
export function railGoal(goal, { editable = false } = {}) {
  if (!goal || typeof goal.objective !== "string" || !goal.objective.trim()) return null;
  const rounds = goal.codeDesktop?.rounds;
  const reason = goal.status === "blocked" && typeof goal.codeDesktop?.blockedReason === "string" ? goal.codeDesktop.blockedReason.trim() : "";
  const setAt = goal.setAt ?? goal.createdAt ?? goal.objective;
  return {
    condition: goal.objective,
    iterations: typeof rounds === "number" && Number.isFinite(rounds) && rounds > 0 ? Math.floor(rounds) : 0,
    ...(reason ? { lastReason: reason } : {}),
    setAt: typeof setAt === "number" ? setAt : String(setAt),
    ...(editable && goal.status !== "complete" ? { editText: `edit ${goal.objective}` } : {}),
  };
}
// sM (2.42304.0 pD): the Progress card's body. The progress section is always excluded (the kit's RAIL_SECTIONS_OFF).
export function ProgressCardBody() {
  return refuse("the Progress card", "the progress section is always excluded");
}
// KA (2.42304.0 mE): an artifact output row (claude.ai artifacts; the host passes `artifacts: []`).
export function ArtifactOutputRow() {
  return refuse("an artifact output row", "claude.ai artifacts");
}

// ---- R4i-rail RL1: the stores and creators of the rail's Save environment (save-environment.mjs: cf74bc599 Vx / Xx) ----
// Vx (2.42304.0 Ay) reads the environment store (cd0cf5b5e z: `environments`, the saved environments, and `startedPlaces`, the folders the
// start line remembers) and the session's local record (shared-8 og `sessions`, through mcp-app-card's shared-52 Kg); Xx
// records the created environment as the session's (shared-46 IL → ML `record`) and creates a non-local one itself
// (c73f45bc3 du). Host: the environments are main's saved environments (saved-environments, pushed in by the rail host
// with setRailSavedEnvironments); there are no started places (the host's start line keeps no per-folder start counts,
// so Ay's `d` is always undefined: startCount 1, settings from the last session); the local sessions hold the records
// the rail has read (session-rail-meta, setRailLocalSession); the session → environment record lives in this window only
// (C7 persists it; the host's sessionMetadata.environmentId is written at session start only, main.cjs). Every
// environment here is local, so Kc refuses.
// W14-code r4 shell fr4-08: the start line (save-environment.mjs Mx) also calls cd0cf5b5e z's quietStartedPlace(target) on
// "Not now" (Mx `c`, Zx); the host keeps that mark for this window (a quiet place reads startCount 0 in Vx: no "Not now"
// again). Start counting matches official for this host's targets, all local: cc43287c9's rememberStart (It) returns null
// for a local draft (`if(kt==="local"){…return null}`), so a local start neither calls rememberStartedPlace nor writes
// startedSetup on that branch (Aue: `t!==null&&(local||ssh)`; a start from a picked saved environment with changes does:
// recordStartedFromEnvironment below); only cf74bc599 Kx's move line remembers a local place. Vx then reads
// `b?.starts ?? 1`: startCount 1 ("Started on {place}"), as here. (cd0cf5b5e Ze drops `starts` on rehydrate, so a
// window-only store loses nothing official keeps.)
const railEnvironmentStore = createStore()((set, get) => ({ environments: [], startedPlaces: [],
  quietStartedPlace(target) {
    if (!target) return;
    const places = get().startedPlaces;
    const index = places.findIndex((place) => sameStartedTarget(place.target, target));
    set({ startedPlaces: index >= 0 ? places.map((place, i) => (i === index ? { ...place, quiet: true } : place)) : [...places, { target, quiet: true }] });
  } }));
// cd0cf5b5e fv over the local targets this host has: same kind and folder (and WSL distro).
const sameStartedTarget = (a, b) => !!a && !!b && a.kind === b.kind && a.cwd === b.cwd && (a.wslDistro ?? null) === (b.wslDistro ?? null);
/** cd0cf5b5e z as Vx reads it: a selector hook over the saved environments. */
export function useEnvironmentStore(selector) {
  return useStore(railEnvironmentStore, selector);
}
useEnvironmentStore.getState = railEnvironmentStore.getState;
/** The rail host's saved environments (main's saved-environments list, as useSavedEnvironments reads it). */
export function setRailSavedEnvironments(list) {
  const environments = Array.isArray(list) ? list.filter((env) => env && typeof env.id === "string" && env.target) : [];
  const now = railEnvironmentStore.getState().environments;
  if (now.length !== environments.length || now.some((env, index) => env !== environments[index])) railEnvironmentStore.setState({ environments });
}

const railLocalSessionsStore = createStore()(() => ({ sessions: [] }));
/** shared-8 og as Vx / Yx read it: a selector hook (and getState) over the local session records. */
export function useLocalSessionsStore(selector) {
  return useStore(railLocalSessionsStore, selector);
}
useLocalSessionsStore.getState = railLocalSessionsStore.getState;
/** Puts (or with no record, drops) one session's local record, keyed by `sessionId` as shared-8's rows are. */
export function setRailLocalSession(sessionId, record) {
  if (typeof sessionId !== "string" || !sessionId) return;
  const { sessions } = railLocalSessionsStore.getState();
  const index = sessions.findIndex((row) => row.sessionId === sessionId);
  if (!record) { if (index >= 0) railLocalSessionsStore.setState({ sessions: sessions.filter((_, i) => i !== index) }); return; }
  if (index >= 0 && sessions[index].record === record) return;
  const row = { ...record, sessionId, record };
  railLocalSessionsStore.setState({ sessions: index >= 0 ? sessions.map((old, i) => (i === index ? row : old)) : [...sessions, row] });
}

const railSessionEnvironmentStore = createStore()(() => ({ bySessionId: {} }));
/** shared-46 IL: records the environment a session now belongs to (C7 `record(sessionId, environmentId)`). */
export function recordSessionEnvironment(sessionId, environmentId) {
  if (typeof sessionId !== "string" || typeof environmentId !== "string") return;
  railSessionEnvironmentStore.setState((state) => ({ bySessionId: { ...state.bySessionId, [sessionId]: environmentId } }));
}
/** shared-19 O7: the session's recorded environment, else the one it started from. */
export function useSessionEnvironmentId(sessionId, startedFromEnvironmentId) {
  const own = useStore(railSessionEnvironmentStore, (state) => (Object.hasOwn(state.bySessionId, sessionId) ? state.bySessionId[sessionId] : undefined));
  return typeof own === "string" || startedFromEnvironmentId === undefined ? own : startedFromEnvironmentId;
}

// W14-code r5-composer-03 / fr5-06: cc43287c9 Aue's start from a picked saved environment with place changes —
// `r.setState({startedSetup: {target: m.target, settings: a.draftSettings(), ...u, occasion: "start", fromEnvironment:
// {id, name, changes, update}}})` on the starting tile's scope store, which cf74bc599 dw reads as `dt` for Mx's
// "Started from {name} with {changes}" branch. Host: the scope store belongs to the tile (one per side), not to the
// session, so main records the start per session here (recordStartedFromEnvironment) and the start line loads it into the
// scope store, tagged with its session (`sessionId`), when that session is shown; Jx's later outcome (updated /
// declined / savedAs) is kept when the tile moves to another session.
const railStartedSetupStore = createStore()(() => ({ bySessionId: {} }));
/** main's start path: the session started from saved environment `{id, name}` with `changes` (labels), `update()` saving them. */
export function recordStartedFromEnvironment(sessionId, { target, settings = {}, fromEnvironment } = {}) {
  if (typeof sessionId !== "string" || !sessionId || !target || !fromEnvironment || !Array.isArray(fromEnvironment.changes) || !fromEnvironment.changes.length) return;
  keepStartedSetup(sessionId, { target, settings, occasion: "start", fromEnvironment, sessionId });
}
/** Keeps (or with no setup, drops) one session's started setup. */
export function keepStartedSetup(sessionId, setup) {
  if (typeof sessionId !== "string" || !sessionId) return;
  railStartedSetupStore.setState((state) => {
    if (state.bySessionId[sessionId] === setup) return state;
    const { [sessionId]: _dropped, ...rest } = state.bySessionId;
    return { bySessionId: setup ? { ...rest, [sessionId]: setup } : rest };
  });
}
/** The session's recorded started setup, if main recorded one. */
export function useStartedSetupRecord(sessionId) {
  return useStore(railStartedSetupStore, (state) => (typeof sessionId === "string" ? state.bySessionId[sessionId] : undefined));
}

/** c73f45bc3 du: creates a non-local environment straight from the setup. Vx only builds local setups here. */
export function addRemoteEnvironment() {
  return refuse("saving a non-local environment", "the host saves local folders only (D31)");
}

/** cecbf1aa5 l (2.42304.0 c4e18af0a c): a model id with Claude's alias table applied. The host's model ids are its core's
 * own (no alias table); the session records the rail reads carry no model, so cead7e0c5 d never gets one. */
export function canonicalModelId(id) {
  return id;
}

// ---- w10-ccres-rail-env-edit: c73f45bc3 ou / cc5b397c6 l, the lazy environment dialog handles Zx preloads ----
// Zx spreads shared-78 t3(handle) (`{ onPointerEnter, onFocus, onPointerDown }` calling `e?.preload("intent")`) onto its
// button. The host's saved environment dialog (source-saved-environment-dialog.jsx) is bundled with the rail and there is
// no cloud environment editor, so neither handle has anything to load: null, which t3's optional call skips.
/** c73f45bc3 ou (`iu.handle`, the epitaxy_new_preset_dialog chunk ca690a791): bundled here, nothing to preload. */
export const localEnvironmentDialogHandle = null;
/** cc5b397c6 l (`a.handle`, the epitaxy_environment_dialogs chunk c28ccf1ab): no cloud environments here (D31). */
export const cloudEnvironmentDialogHandle = null;

// ---- W14-code r6 sleep lane: cf74bc599 wO (the sleep band) and dO (the kept-awake band) ----
// The two bands are sliced into generated/session-rail/sleep-band.mjs and render the c73f45bc3 k_ band card
// (code-band.mjs) in the Code column's notice slots (generated/composer-notices code-notice-slots.mjs). What they read
// of the desktop is answered here from the host's session state, which the bands' host (src/source-sleep-notice.jsx
// SourceSessionBands) provides: the session, whether it runs, whether input waits, the desktop settings and their
// writer, the fixed-turn send. Cloud continuation, the environment teleport and cloud environments are claude.ai
// services (E59): they refuse — the bands' cloud CTAs never show (aO's canContinueInCloud is false).
export const SessionBandsHostContext = createContext(null);
const useBandsHost = () => useContext(SessionBandsHostContext);
const sameSession = (host, ref) => !!host && !!ref && ref.type === "local" && ref.id === host.sessionId;

/** shared-52 cB (exported ha): the ErrorsProvider's addError — the host's danger toast in the UI language. */
export function useBandErrors() {
  const toasts = useSourceToasts();
  return useMemo(() => ({
    addError: (message) => { toasts?.add?.(typeof message === "string" ? message : t(message?.defaultMessage ?? ""), { variant: "danger" }); },
  }), [toasts]);
}

/** c227f4d5e Q0 (exported Dt): a dev-preview state hook (hO / oO: Storybook's mock values). Never a preview here. */
export function previewStateHook() {
  return noPreview;
}
function noPreview() {
  return false;
}

/**
 * c5da7eb42 QI (exported et): the session view's fields through `select` (shared-78 gn picks them). The host's session
 * view for the bands is the desktop's two records: sleepInterruption (desktop-sleep-interruption) and keptAwake
 * (desktop-kept-awake), undefined when unset as in the desktop's view. Any other session (or none): no data.
 */
export function useSessionBandFields(sessionRef, select) {
  const id = sessionRef?.type === "local" ? sessionRef.id : null;
  const subscribe = useCallback((listener) => {
    const a = sleepInterruptionStore.subscribe(listener), b = keptAwakeStore.subscribe(listener);
    return () => { a(); b(); };
  }, []);
  const sleepInterruption = useSyncExternalStore(subscribe, () => sleepInterruptionStore.get(id), () => null);
  const keptAwake = useSyncExternalStore(subscribe, () => keptAwakeStore.get(id), () => null);
  const data = useMemo(() => (id === null ? undefined
    : select({ sleepInterruption: sleepInterruption ?? undefined, keptAwake: keptAwake ?? undefined }) ?? undefined), [id, select, sleepInterruption, keptAwake]);
  return { data };
}

/** c5da7eb42 aL (exported pt): whether the session runs (iL over the session view). The host's turn state. */
export function useSessionBandRunning(sessionRef) {
  const host = useBandsHost();
  return sameSession(host, sessionRef) ? host.running === true : false;
}

/** c06cf64bb aO (exported Gt): whether the session has input waiting (a pending queued send or held input). The host's
 * local queue of the session. */
export function useSessionBandInputWaiting(sessionId) {
  const host = useBandsHost();
  return !!host && sessionId === host.sessionId && host.inputWaiting === true;
}

/** c06cf64bb IE (exported Y): a listener of the sends that begin in a session (`e(i, a)`: uuid, synthetic). The host
 * hears a turn start in the session (kept-awake-model.mjs subscribeSendBegun). */
export function subscribeSessionSendBegun(sessionId, listener) {
  return subscribeSendBegun(sessionId, listener);
}

/** c6b8adeaf So (exported b): the stop-session mutation SO awaits before its "continue" send (a session still marked
 * running after the wake is stopped first). The host's Stop (main.jsx stop: the turn interrupt, its own "Couldn’t stop
 * the response" toast on failure); a session that does not run has nothing to stop. */
export function useStopSessionMutation() {
  const host = useBandsHost();
  return useMemo(() => ({
    mutateAsync: async (ref) => { if (sameSession(host, ref) && host.running === true && typeof host.stopSession === "function") await host.stopSession(); },
  }), [host]);
}

/** c6b8adeaf Xa (exported g): `sendWithOutcome({ref, text, uuid})` — the host's fixed-turn send (queued while running). */
export function useBandSend() {
  const host = useBandsHost();
  return useMemo(() => ({
    sendWithOutcome: async ({ ref, text }) => {
      if (!sameSession(host, ref) || typeof host.sendContinue !== "function") throw Error("No session to continue");
      return host.sendContinue(text);
    },
  }), [host]);
}

/** cf74bc599 aO: `{canContinueInCloud, settled}` — cloud sessions are claude.ai's (E59): never, and settled. */
export function useCanContinueInCloud() {
  return NO_CLOUD;
}
const NO_CLOUD = Object.freeze({ canContinueInCloud: false, settled: true });
/** caec4a2d4 Ir (exported o): the account's active cloud environments. None here (E59). */
export function useCloudEnvironments() {
  return NO_ENVIRONMENTS;
}
const NO_ENVIRONMENTS = Object.freeze([]);
/** shared-104 du (exported ep): the cloud environment list query. No claude.ai account here (E59): no data. */
export function useCloudEnvironmentList() {
  return NO_QUERY_DATA;
}
const NO_QUERY_DATA = Object.freeze({ data: undefined });
/** cc53cbea3 b (exported i): whether the cloud resume flow is on. Off here (E59). */
export function useCloudResumeOn() {
  return false;
}
/** cc53cbea3 C (exported r): clears a cloud teleport marker. No teleport here (E59). */
export function clearTeleportMarker() {
  return refuse("the cloud teleport", "no claude.ai cloud sessions (E59)");
}
/** cc53cbea3 M (exported t): the paused-for-cloud banner. Only mounted with canContinueInCloud, which is false here. */
export function CloudResumeBanner() {
  return refuse("the cloud resume banner", "no claude.ai cloud sessions (E59)");
}
/** caec4a2d4 fo (exported t): the teleport-to-cloud dialog. Only opened from a cloud CTA, which never shows here. */
export function TeleportToCloudDialog() {
  return refuse("the teleport-to-cloud dialog", "no claude.ai cloud sessions (E59)");
}

/** shared-25 ps (exported ng): a GrowthBook feature's state, "on" / "off" / "unknown" (Ko), from the host table:
 * listed and on is "on", listed and off is "off", unlisted is "unknown" (vO ccd_sleep_band_keep_awake_main is not in
 * Uon, so the band reads "unknown" — not "off" — and takes the rework copy). */
export function useBandFeatureState(key) {
  if (hostGrowthBookFlag(key)) return "on";
  return Object.hasOwn(HOST_GROWTHBOOK, growthBookFlagKey(key)) ? "off" : "unknown";
}

// c1e585df0: the keep-awake preferences (`t("ccKeepAwakeWhileWorking", !0)`, `t("ccKeepAwakeOnBattery", !0)`) — here the
// desktop settings' keepAwake / keepAwakeOnBattery (unset reads as on), written with the host's settings writer.
/** c1e585df0 o (n.useHasKey): the preference is loaded — the host's settings have arrived. */
export function useKeepAwakeSettingLoaded() {
  const host = useBandsHost();
  return !!host?.config;
}
/** c1e585df0 i (n.useEnabled): keep the computer awake while working. */
export function useKeepAwakeWhileWorking() {
  const host = useBandsHost();
  return host?.config?.keepAwake !== false;
}
/** c1e585df0 a (r.useEnabled): keep it awake on battery power too. */
export function useKeepAwakeOnBattery() {
  const host = useBandsHost();
  return host?.config?.keepAwakeOnBattery !== false;
}
/** c1e585df0 c: `(kind, value, opts) => store.write(value)` for "while_working" / "on_battery" (no telemetry, D17). */
export function useWriteKeepAwakeSetting() {
  const host = useBandsHost();
  return useCallback((kind, value) => {
    const key = kind === "on_battery" ? "keepAwakeOnBattery" : kind === "while_working" ? "keepAwake" : null;
    if (key && typeof host?.saveSettings === "function") host.saveSettings({ [key]: value });
  }, [host]);
}
/** shared-78 K (exported zv): the desktop's app features. Keep awake (`codeSessionKeepAwake`) is the host's own
 * power-save blocker (desktop-settings.cjs): supported. */
export function useDesktopAppFeatures() {
  return BAND_APP_FEATURES;
}
const BAND_APP_FEATURES = Object.freeze({ codeSessionKeepAwake: Object.freeze({ status: "supported" }) });

/** shared-28 Kp (exported zc): an account-scoped persisted preference `[value, set]` — the host's persisted values. */
export function useBandPersistedPreference(key, fallback) {
  const value = usePersistedValue(key, fallback);
  const set = useCallback((next) => writePersistedValue(key, next, fallback), [key, fallback]);
  return [value, set];
}
/** shared-28 Mp (exported Rc): the account preferences have loaded. Local storage is synchronous: always. */
export function useAccountPreferencesReady() {
  return true;
}
// shared-1 wE (exported Cc) / TE (exported wc): the session scope's hidden state and its change listener. No host surface
// provides that scope (source-code-notice-adapters.jsx useSessionScopeHidden): never hidden, never changes.
export { useSessionScopeHidden } from "./source-code-notice-adapters.jsx";
export function useOnSessionScopeHiddenChange() {}

/** c227f4d5e oL (exported zs): the inline band k_ falls back to outside the Code notice region. W14-code r7 notices
 * (r7c-02 / sh7-04 / gates-r7-01, E81): __gb__100087145 is off on the 3P desktop, so the Code session has no region and
 * k_ draws the sliced oL (generated/session-rail/inline-band.mjs) where the column mounts the band. With the rollback
 * switch local_code_notice_region the host mounts the region again and k_ registers into its slot instead. W14-code r6
 * sleep review fix: Chat / Cowork are not the Code session (the official bands are cc43287c9 EpitaxySessionScopeBody's
 * cf74bc599 vA only) and keep the host's notice-stack banner they had before; there SourceSessionBands provides an
 * InlineBandSlotContext ({sink, name}) and the band's k_ props go to that sink, which the host stack draws in its own
 * order (source-sleep-notice.jsx useInlineBandNotices). */
export const InlineBandSlotContext = createContext(null);
export function InlineCodeBand(props) {
  const slot = useContext(InlineBandSlotContext);
  if (!slot) return <InlineBand {...props} />;
  return <InlineBandSinkEntry slot={slot} band={props} />;
}
// shared-4 bk (exported at; c227f4d5e Ea): whether the hub's tool approval body is showing (vk `{body}`, set by its tool
// approval surface yk). oL lets a band that stands in for the composer speak as a note while it shows. No hub tool
// approval surface here: never.
export function useHubToolApprovalBodyShown() {
  return false;
}
function InlineBandSinkEntry({ slot: { sink, name }, band }) {
  const [seq] = useState(() => sink.nextSeq());
  useLayoutEffect(() => { sink.set(name, seq, band); }, [sink, name, seq, band]);
  useLayoutEffect(() => () => sink.remove(name, seq), [sink, name, seq]);
  return null;
}

// vendor-intl q / Gt for the sleep and kept-awake bands only (sleep-band.mjs, E83): the bands' copy names Claude as the
// assistant ("Your computer went to sleep while Claude was working.", "Claude kept your computer awake for …"); the
// local catalog keys it with "DeepSeek", which t() turns into the running core's assistant, as the host's sleep band
// did (W14-code r5 fr5-07 kept-awake-model copy). Everything else is the rail kit's intl.
// (The rail's catalog check reads `defaultMessage:` literals; the keyed copy is assigned, as it is not a new message.)
function personaMessage(message) {
  const text = message?.defaultMessage;
  if (typeof text !== "string" || !/\bClaude\b/.test(text)) return message;
  const keyed = { ...message };
  keyed.defaultMessage = text.replace(/\bClaude\b/g, "DeepSeek");
  return keyed;
}
export function useBandIntl() {
  const intl = useStartIntl();
  return useMemo(() => ({ ...intl, formatMessage: (message, values) => intl.formatMessage(personaMessage(message), values) }), [intl]);
}
export function BandMessage({ values, ...message }) {
  return useBandIntl().formatMessage(message, values);
}
