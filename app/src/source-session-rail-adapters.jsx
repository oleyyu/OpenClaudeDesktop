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
import React, { createContext, useContext, useMemo } from "react";
// R6: view-tabs through the facade, by semantic name.
import { cdsClassNames } from "./generated/view-tabs/index.js";
import { useSessionFileOpener } from "./generated/r3b-transcript/session-file-access.mjs";
import { recentOutputPaths } from "./generated/code-current/file-output-order.mjs";
import { useStableArray } from "./generated/session-rail/stable-array.mjs";
import { createStore, useStore } from "./generated/session-rail-kit/react-store.mjs";

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
// vM (2.42304.0 CD): the Goal card's body (a CLI goal: condition, iterations, last check). Local Codex goals have other fields
// (r4-session-rail.md §3 #15); the host passes `goal: null` and keeps SourceGoalStrip.
export function GoalCardBody() {
  return refuse("the Goal card", "CLI goals only; the host passes goal: null");
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
const railEnvironmentStore = createStore()(() => ({ environments: [], startedPlaces: [] }));
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
