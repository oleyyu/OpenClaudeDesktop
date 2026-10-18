// Local services for the original 2.42304.0 session rail view that scripts/extract-session-rail.mjs emits
// (src/generated/session-rail, R4f-rail SR-2). Each export replaces one import or same-chunk binding of the original, and
// the extractor checks the declaration it stands for (file:local, with feature strings) before it accepts it.
//
// Host differences in one place (r4-session-rail.md §3):
// - no CDS layer element, no navigation region registry, no claude.ai account (Remote Control, artifacts), no CLI goal,
//   no desktop git-state bridge, no scratch workspace, no session-file existence service;
// - the rail's output files come from the host transcript (SessionRailOutputsContext, filled by the mount, SR-7);
// - branches the host can never reach (Remote Control row, Goal / Progress card bodies, artifact rows, the bridge's
//   "Learn more" link) refuse to render instead of approximating the original.
import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import { cdsClassNames } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { clsx } from "./generated/view-tabs/vendor-frame-DfPJ1QmD.js";
import { useSessionFileOpener } from "./generated/r3b-transcript/session-file-access.mjs";
import { recentOutputPaths } from "./generated/code-current/file-output-order.mjs";
import { useStableArray } from "./generated/session-rail/stable-array.mjs";
import { parsePluginConnector } from "./generated/session-rail/plugin-connector.mjs";
import { ConnectorIconTile, ConnectorLetterIcon } from "./generated/session-rail/connector-icon-parts.mjs";
import { createStore, useStore } from "./generated/session-rail-kit/react-store.mjs";

// vendor-intl q / Gt, shared-4 NE, shared-frame qa / Ya: the same host services as the rail kit (SR-1).
export { useIntl, FormattedMessage, RegionEntry, useLayerElement, useLayerOwnerWindow } from "./source-session-rail-kit-adapters.jsx";

function refuse(what, why) {
  throw Error(`Session rail host adapter: ${what} is not available in this host (${why})`);
}

// ---- shared-frame: CDS parts view-tabs slices without publishing a semantic name (D1/D24) ----

// shared-frame tl (nd, the CDS SkeletonGroup) and $c (dd = Object.assign(rd, { Rows: od, … })), as the rail's TD reads
// them: a decorative span group (`decorative: !0, as: "span"`, hold "delayed", motion "wave") around one in-group bar
// (`width`, `height: 12`). The DOM is nd's top-level delayed-hold branch: data-cds / data-motion / data-hold, aria-hidden
// for a decorative group (role="status" and the sr-only label otherwise), `X("block", className)` for a span group, the
// children under an aria-hidden "contents" box; rd in a group is the plain bar ("h-[1em] max-w-full rounded
// bg-[var(--cds-skeleton-base)]", "block" for a span). nd's wave stagger (--cds-skel-i in DOM order over Gu / qu =
// 2000 / 90 slots, data-motion lockstep when empty) and its reveal / settle handlers (cds-placeholder-reveal, Ju = 1e5)
// are kept; its cross-document breathe phase sync (ed), the sweep motion and the shown / hidden callbacks have no
// caller here, and a nested group renders nd's nested branch (no status, no motion).
const SkeletonGroupDepth = createContext(false);
const SkeletonElement = createContext("div");
const SKELETON_ELEMENTS = { div: "div", span: "span" }; // Eu
const WAVE_SLOTS = Math.floor(2000 / 90);
const SETTLED_MS = 1e5;
export function SkeletonGroup({ children, hold = "delayed", label, className, decorative = false, as, motion = "wave" }) {
  const nested = useContext(SkeletonGroupDepth);
  const inherited = useContext(SkeletonElement);
  const element = SKELETON_ELEMENTS[as ?? inherited];
  const groupClass = element === "span" ? cdsClassNames("block", className) : className;
  const ref = useRef(null);
  if (motion === "sweep") refuse("the sweep skeleton motion", "no rail skeleton uses it");
  const delayed = hold === "delayed";
  const text = label ?? "Loading";
  useLayoutEffect(() => {
    const group = ref.current;
    if (nested || motion !== "wave" || group === null) return undefined;
    const stagger = () => {
      const bars = group.querySelectorAll('[data-cds="Skeleton"]');
      let index = 0;
      for (const bar of bars) if (bar.style.getPropertyValue("--cds-skel-i") !== "") index += 1;
      for (const bar of bars) if (bar.style.getPropertyValue("--cds-skel-i") === "") { bar.style.setProperty("--cds-skel-i", String(index % WAVE_SLOTS)); index += 1; }
      group.dataset.motion = bars.length === 0 ? "lockstep" : "wave";
    };
    stagger();
    if (typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(stagger);
    observer.observe(group, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [nested, motion]);
  const Element = element;
  if (nested) return <Element data-cds="SkeletonGroup" className={groupClass}>
    <SkeletonElement.Provider value={element}>{children}</SkeletonElement.Provider>
  </Element>;
  return <Element ref={ref} data-cds="SkeletonGroup" data-motion={motion} data-hold={delayed ? "delayed" : "none"} data-shown={delayed ? undefined : ""}
    role={decorative ? undefined : "status"} aria-hidden={decorative ? true : undefined} className={groupClass}
    onAnimationEnd={event => {
      if (event.animationName !== "cds-placeholder-reveal" || event.target !== event.currentTarget) return;
      event.currentTarget.style.setProperty("--cds-skel-settled", `${SETTLED_MS}ms`);
      event.currentTarget.setAttribute("data-settled", "");
    }}
    onAnimationStart={event => {
      if (event.animationName !== "cds-placeholder-reveal" || event.target !== event.currentTarget) return;
      event.currentTarget.setAttribute("data-shown", "");
      const node = event.currentTarget.querySelector("[data-skeleton-label]");
      if (node !== null && node.textContent === "") node.textContent = text;
    }}>
    {decorative ? null : <span className="sr-only" data-skeleton-label="">{delayed ? "" : text}</span>}
    <SkeletonGroupDepth.Provider value={true}>
      <SkeletonElement.Provider value={element}>
        <Element aria-hidden={true} className="contents">{children}</Element>
      </SkeletonElement.Provider>
    </SkeletonGroupDepth.Provider>
  </Element>;
}
export function Skeleton({ width, height, className, decorative = false, as }) {
  const grouped = useContext(SkeletonGroupDepth);
  const inherited = useContext(SkeletonElement);
  const Element = SKELETON_ELEMENTS[as ?? inherited];
  const block = Element === "span" ? "block" : undefined;
  if (grouped) return <Element data-cds="Skeleton" className={cdsClassNames(block, "h-[1em] max-w-full rounded bg-[var(--cds-skeleton-base)]", className)} style={{ width, height }} />;
  return <Element data-cds="Skeleton" role={decorative ? undefined : "status"} aria-hidden={decorative ? true : undefined}
    className={cdsClassNames(block, "relative h-[1em] max-w-full overflow-hidden rounded bg-[var(--cds-skeleton-base)] after:absolute after:inset-0 after:animate-[cds-shimmer_2s_linear_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] motion-reduce:after:hidden", className)}
    style={{ width, height }}>{decorative ? null : <span className="sr-only">Loading</span>}</Element>;
}

// shared-frame Uc (Jd): `W(Vd) + e`, the z-index of a layer-aware element over the CDS layer base (Vd = G(0); only
// CdsLayerProvider raises it). The rail is never mounted inside a CdsLayerProvider here (it is a column of the chat
// tile, not a dialog or popup), so the base is Vd's default, 0. The dragged card's z-index is `0 + 1`.
export function useLayerAwareZIndex(offset) {
  return 0 + offset;
}

// shared-frame Xc (Cd, the CDS TextLink) is no longer stood in for here: R4i-rail RL1 dropped its adapter, so the rail
// reads view-tabs' generated CdsTextLink (the flat rail's "Save" link Iy, and the bridge environment's "Learn more",
// which this host never reaches, D17).

// ---- c856385e2 In: a file reference that opens in the session's Files pane ----
// In (exported p) is the transcript's file reference. For a local path with the session's file opener (W(), here the
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

// c280f9bbb L (exported n): `a(F)`, GrowthBook __gb__2954460583 (the file icon set). No GrowthBook here: off, as every
// GrowthBook gate of this host (D29 / D31). The flat rail (D10) shows the CdsIcon by kind before it reads this.
export function useFileIconSetEnabled() {
  return false;
}

// c73f45bc3 y (Sv): the scratch workspace's copy-of mapping (`scratchCarried` in the session meta). This host has no
// scratch workspace (r4-session-rail.md §3 #11), so there is no mapping: null, as for a session without one.
export function useScratchCopyOf() {
  return null;
}

// shared-11 si (Fd): the live branch of a checkout from the branch rows store, which the desktop's git-state bridge fills
// (`Pe.getGitStateSnapshot` / `onGitStateChanged`). There is no such bridge here, so the store stays empty: undefined,
// and cO keeps the branch its git-info query selected.
export function useLiveCheckoutBranch() {
  return undefined;
}

// ---- cf74bc599: the Outputs card's data ----

// cf74bc599 yE: the session's output files, `qh(Yd(e, Sm(e), null, Sd(e), _d(e), Ed(e)), checkouts, copyOf, folders)`
// kept stable by shared-25 zU. Yd reads the desktop's transcript store; here the mount provides the session's messages in
// the shape c73f45bc3 Rv (code-current recentOutputPaths) reads — `{ author: "assistant", outputFiles: [{ path, written
// }] }` from completed file changes and deliverables, as mention-output-model.mjs builds them — and the rest is the
// original: Rv over them with the rail's checkouts, copy-of mapping and folders, then zU.
export const SessionRailOutputsContext = createContext(null);
const NO_MESSAGES = [];
export function useSessionOutputPaths({ sessionId, checkouts, copyOf, folders }) {
  const outputs = useContext(SessionRailOutputsContext);
  const messages = outputs?.sessionId === sessionId ? outputs.messages ?? NO_MESSAGES : NO_MESSAGES;
  const paths = useMemo(() => recentOutputPaths(messages, checkouts, copyOf, folders), [messages, checkouts, copyOf, folders]);
  return useStableArray(paths);
}

// cf74bc599 sE: the output paths that no longer exist. It only checks when the desktop's LocalSessions bridge has
// resolveSessionFile (`o = he?.resolveSessionFile !== void 0`), and otherwise returns rE, which its memo turns into iE —
// the one empty Set. This host's LocalSessions (source-files-changes-adapters.jsx) has no resolveSessionFile.
const NO_GONE_PATHS = new Set();
export function useGoneOutputPaths() {
  return NO_GONE_PATHS;
}

// ---- cf74bc599: rail parts with no source in this host ----

// ED: the Remote Control row (claude.ai Remote Control; the host never passes `remoteControl`, D17).
export function RemoteControlRow() {
  return refuse("the Remote Control row", "claude.ai Remote Control (D17)");
}
// CD: the Goal card's body (a CLI goal: condition, iterations, last check). Local Codex goals have other fields
// (r4-session-rail.md §3 #15); the host passes `goal: null` and keeps SourceGoalStrip.
export function GoalCardBody() {
  return refuse("the Goal card", "CLI goals only; the host passes goal: null");
}
// pD: the Progress card's body. 2.42304.0 always excludes the progress section (c227f4d5e wZ = ["progress"]).
export function ProgressCardBody() {
  return refuse("the Progress card", "2.42304.0 always excludes the progress section");
}
// mE: an artifact output row (claude.ai artifacts; the host passes `artifacts: []`).
export function ArtifactOutputRow() {
  return refuse("an artifact output row", "claude.ai artifacts");
}

// shared-7 cr (RT): the connector icon. The rail's uD asks for `type: icon?.type ?? "favicon"` with the server's icon
// source; the host lists no icon sources, so it is always the favicon branch without a URL, where shared-78 JO returns
// its fallback: RT's letter avatar MT (`letter: h || "?"`, h the plugin connector's name or the name, `hideBorder: !d`)
// in RT's frame (jT, `!border-0 !shadow-none !bg-transparent` without an imageSize; the flat div when `flat`). MT and jT
// are the generated originals. Any other icon (a source, an external or mask icon, the globe fallback) refuses: it would
// need the desktop's favicon and server URL lookups.
export function ConnectorIcon({ size, imageSize, name = "", className, fallbackToGlobe, flat = false, fallbackIcon, type, src }) {
  if (type !== "favicon" || src || fallbackToGlobe) refuse("a connector icon with a source", "no favicon or server URL lookups");
  const tile = !imageSize, iconSize = imageSize ?? size;
  const letter = parsePluginConnector(name)?.connectorName ?? name;
  const icon = fallbackIcon ?? <ConnectorLetterIcon letter={letter || "?"} size={iconSize} hideBorder={!tile} />;
  return flat
    ? <div style={{ width: size, height: size }} className={clsx("flex shrink-0 items-center justify-center overflow-hidden rounded-md", className)}>{icon}</div>
    : <ConnectorIconTile size={size} className={clsx(className, tile && "!border-0 !shadow-none !bg-transparent")}>{icon}</ConnectorIconTile>;
}

// ---- R4i-rail RL1: the stores and creators of the rail's Save environment (save-environment.mjs: cf74bc599 Ay / Py) ----
// Ay reads the environment store (cd0cf5b5e z: `environments`, the saved environments, and `startedPlaces`, the folders the
// start line remembers) and the session's local record (shared-8 Q `sessions`, through mcp-app-card's shared-52 Qf); Py
// records the created environment as the session's (shared-19 D7 → C7 `record`) and creates a non-local one itself
// (c73f45bc3 Kc). Host: the environments are main's saved environments (saved-environments, pushed in by the rail host
// with setRailSavedEnvironments); there are no started places (the host's start line keeps no per-folder start counts,
// so Ay's `d` is always undefined: startCount 1, settings from the last session); the local sessions hold the records
// the rail has read (session-rail-meta, setRailLocalSession); the session → environment record lives in this window only
// (C7 persists it; the host's sessionMetadata.environmentId is written at session start only, main.cjs). Every
// environment here is local, so Kc refuses.
const railEnvironmentStore = createStore()(() => ({ environments: [], startedPlaces: [] }));
/** cd0cf5b5e z (Dg) as Ay reads it: a selector hook over the saved environments. */
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
/** shared-8 Q (Aa) as Ay / Ny read it: a selector hook (and getState) over the local session records. */
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
/** shared-19 D7: records the environment a session now belongs to (C7 `record(sessionId, environmentId)`). */
export function recordSessionEnvironment(sessionId, environmentId) {
  if (typeof sessionId !== "string" || typeof environmentId !== "string") return;
  railSessionEnvironmentStore.setState((state) => ({ bySessionId: { ...state.bySessionId, [sessionId]: environmentId } }));
}
/** shared-19 O7: the session's recorded environment, else the one it started from. */
export function useSessionEnvironmentId(sessionId, startedFromEnvironmentId) {
  const own = useStore(railSessionEnvironmentStore, (state) => (Object.hasOwn(state.bySessionId, sessionId) ? state.bySessionId[sessionId] : undefined));
  return typeof own === "string" || startedFromEnvironmentId === undefined ? own : startedFromEnvironmentId;
}

/** c73f45bc3 Kc: creates a non-local environment straight from the setup. Ay only builds local setups here. */
export function addRemoteEnvironment() {
  return refuse("saving a non-local environment", "the host saves local folders only (D31)");
}

/** c4e18af0a c: a model id with Claude's alias table applied. The host's model ids are its core's own (no alias table);
 * the session records the rail reads carry no model, so cead7e0c5 p never gets one. */
export function canonicalModelId(id) {
  return id;
}
