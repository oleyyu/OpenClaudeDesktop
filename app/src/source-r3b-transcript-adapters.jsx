// Host adapters for src/generated/r3b-transcript (scripts/extract-r3b-transcript.mjs). Each export answers one import of the
// original chunks (all 3.6556.2 since w6-transcript-rows; the comments keep the 2.42304.0 originals an adapter served) that reads a runtime service of the official desktop app; the generator pins every one to
// strings of the original it replaces (`adapters` in the extractor). The generated modules import this file, so it
// imports only generated modules that do not (file-icon-name.mjs, file-basename.mjs); src/source-r3b-transcript.jsx and
// src/source-turn-edits.jsx mount the rest.
//
// Nothing here re-creates a view-tabs context or component: CdsIcon is a view-tabs public name (D1), and the CDS
// Banner re-exported below is the view-tabs original (R4f-graph G2) through the version-free facade (R6/E2). Since
// 3.6556.2 every generated module imports CdsBanner, the DisabledReason and base-ui useDirection straight from view-tabs
// (the 2.42304.0 step-2 re-exports of DisabledReason / Collapsible / useDirection are gone with the embedded card form).
import { HOST_GROWTHBOOK, hostGrowthBookFlag } from "./host-growthbook.mjs";
import React, { cloneElement, createContext, useCallback, useContext, useRef, useState, useSyncExternalStore } from 'react';
import { useStartIntl, StartMessage } from './source-code-start-adapters.jsx';
import { CdsIcon } from './generated/view-tabs/index.js';
import { fileIconName } from './generated/r3b-transcript/file-icon-name.mjs';
import { fileBasename } from './generated/r3b-transcript/file-basename.mjs';
import { groupExpansionKey, toolGroupExpansion } from './tool-group-expansion.mjs';

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog: the English message is looked up in
// zh-CN by t() (source-code-start-adapters.jsx).
export { useStartIntl as useIntl, StartMessage as FormattedMessage };

// vendor-intl r (sn = J("formatList")): react-intl's FormattedList, the counts' sr-only text in the Turn edits card
// (c60636ac6 Qe). The one generated copy is session-rail-changes' (it slices it for its own counts).
export { FormattedList } from './generated/session-rail-changes/formatted-list.mjs';

// shared-0 LA (exported Ju; 3.6556.2 bN, exported Id): the official render-error report goes to the desktop's error telemetry. This host sends no
// telemetry (D17), so a caught render error is recorded nowhere; React's own console report is unchanged.
export function reportRenderError() {}

// c3320899b i (exported n; 3.6556.2 o): `(flag, viewKey, enabled)`, a GrowthBook value pinned for one view. There is no GrowthBook
// here; the host's answers live in one table for every generated area (host-growthbook.mjs), and an unknown flag is off.
// __gb__3525173228 (c4a9ee384 sp, the per-row crash boundary): on. Without it a row that throws while rendering takes
// down the whole window (this host has no session-level render boundary either), so the original row fallback is
// strictly the better behaviour; recorded as a host difference.
export const HOST_FLAGS = HOST_GROWTHBOOK;
export function useViewPinnedFlag(flag, viewKey, enabled) {
  return enabled ? hostGrowthBookFlag(flag) : false;
}

// shared-78 uV (exported Gs; 3.6556.2 rC, exported Tb): GrowthBook __gb__2142364912 + an organization other than the flags' one. No organization
// and no retention policy exist here: the history never "may have expired"; a missing transcript is "not found on disk".
export function useRetentionMayHaveExpired() {
  return false;
}
// shared-20 Ib (exported Di; 3.6556.2 Ub, exported Ci, a plain check): `!!V?.importAllCliSessions` on the desktop bridge. This host has no Claude Code CLI session
// import, so Wv shows no Import CLI sessions button and its Archive keeps the secondary variant.
export function useCliSessionImport() {
  return false;
}
// shared-20 Ub (exported Oi; 3.6556.2 Xb, exported wi): opens that import for a window. Unreachable while useCliSessionImport answers false.
export function openCliSessionImport() {}
// shared-20 Xb (exported Ti; 3.6556.2 rx, exported xi): the lazy epitaxy_cli_import_dialog; Wv / Hb read its `.handle`
// for the preload props.
export const cliImportDialog = Object.freeze({ handle: undefined });
// shared-104 Dz (exported a; 3.6556.2 shared-78 t3, exported n): preload a lazy dialog chunk on intent. This host loads
// no dialog chunks lazily.
const NO_PRELOAD = Object.freeze({});
export function useDialogPreloadProps() {
  return NO_PRELOAD;
}
// 3.6556.2 shared-11 Ps (exported Ss): the organization's local-sessions policy (disableDesktopLocalSessions) that Hb
// reads for its Import CLI sessions button. This host has no organization or policy config: local sessions are allowed
// and there is nothing to reread. Hb only reads it when the CLI import exists (useCliSessionImport), which it does not here.
const NO_POLICY = Object.freeze({ disabledByPolicy: false, knownAllowed: true, rereadPolicy() {}, reason: null });
export function useLocalSessionsPolicy() {
  return NO_POLICY;
}

// The session lifecycle the unavailable-transcript state acts on (main.jsx sessionAction + its Delete confirm), provided
// by SourceTranscriptUnavailable (src/source-r3b-transcript.jsx).
export const TranscriptUnavailableHost = createContext(null);

// c73f45bc3 Ec (exported tr; 3.6556.2 jl, exported _r): after an archive or delete, onSessionRemoved wins; the official router fallback has no
// counterpart (main.jsx sessionAction already leaves a removed current session).
export function useSessionRemoved({ onSessionRemoved }) {
  return useCallback((kind) => { onSessionRemoved?.(kind); }, [onSessionRemoved]);
}

// c48ea26ad Ao (exported o; 3.6556.2 Xe): { archiveSession, deleteSession, isArchiving, isDeleting }. Archive runs the host archive
// and reports a failure through the host; Delete asks first, through the host's one "Delete session?" confirm (main.jsx
// SourceSessionDeleteDialog, the shared-19 BK replica), which also deletes. The host does not report that confirm's
// progress back, so isDeleting stays false (host difference).
export function useSessionArchiveDelete({ sessionRef, afterRemoval }) {
  const host = useContext(TranscriptUnavailableHost);
  const [isArchiving, setArchiving] = useState(false);
  const pending = useRef(false);
  const archiveSession = useCallback(async () => {
    if (!sessionRef || !host?.archive || pending.current) return;
    pending.current = true;
    setArchiving(true);
    try {
      if ((await host.archive()) !== false) afterRemoval?.('archive');
    } catch (error) {
      host.onError?.(error);
    } finally {
      pending.current = false;
      setArchiving(false);
    }
  }, [sessionRef, host, afterRemoval]);
  const deleteSession = useCallback(async () => {
    if (sessionRef && host?.requestDelete) host.requestDelete();
  }, [sessionRef, host]);
  return { archiveSession, deleteSession, isArchiving, isDeleting: false };
}

// The CDS Banner of the row-crash fallback: the view-tabs original (CdsBanner), with every branch: details over the CDS
// Collapsible, the ghost Dismiss button, the composer keyline and the centred pictogram layout. 3.6556.2 c4a9ee384 cp
// imports it from view-tabs itself (shared-frame ya); the re-export stays for the host and its tests.
export { CdsBanner } from './generated/view-tabs/index.js';

// ---- Step 2 (toolcards-06 / toolcards-07): the services of the 3.6556.2 Turn edits card (c96d752d0 U0e / B0e; 2.42304.0
// N2e / M2e), generated/r3b-transcript/turn-edits-card.mjs, mounted by src/source-turn-edits.jsx.

// The card's host: { sessionKey, canViewChanges, openChanges } (the session whose tool expansion store holds the card's
// See all / Show less state, whether the host's Changes pane can show this session's diff, and opening that pane).
export const TurnEditsHost = createContext(null);

// shared-11 gc (exported us; 2.42304.0 Qo): the claudeai_cc_epitaxy_session_presets_main gate. Decision D10: this host
// takes its "on" branch, so the card shows the 'See all' form (B0e `x = hd()`).
export const HOST_GATES = Object.freeze({ claudeai_cc_epitaxy_session_presets_main: true });
export function useSessionPresetsMain() {
  return HOST_GATES.claudeai_cc_epitaxy_session_presets_main === true;
}

// c03935b01 du (exported gt; 2.42304.0 gc): `(f(Z) ?? su).getState()`, the session pane store's state; the card calls its
// openDiffPane. Here: the host's Changes pane (main.jsx setPanel("changes")); nothing while it is unavailable.
const NO_PANE = () => {};
export function usePaneStoreState() {
  const host = useContext(TurnEditsHost);
  return { openDiffPane: host?.openChanges ?? NO_PANE };
}
// c03935b01 fu (exported vt; 2.42304.0 _c): the pane store context, null outside a pane host. Non-null exactly while the host's
// Changes pane can show this session.
export function usePaneStoreContext() {
  const host = useContext(TurnEditsHost);
  return host?.canViewChanges === true ? host : null;
}
// c03935b01 Q (exported _t; 2.42304.0 Q): a selector over the pane store; the card reads hasSidePanes.
export function usePaneStore(selector) {
  const host = useContext(TurnEditsHost);
  return selector({ hasSidePanes: host?.canViewChanges === true });
}

// cc6e9624e _ (exported l; 2.42304.0 v): `[groups[key] ?? initial, setGroupExpanded(key, ·)]` on the session's tool
// expansion store (the card's Show {count} more / Show less, keyed `turn-edits:<first call id>`).
// The host's group store is tool-group-expansion.mjs toolGroupExpansion keyed by session, which a row's Try again
// forgets (c96d752d0 d9).
export function useToolGroupExpanded(key, initial = false) {
  const host = useContext(TurnEditsHost);
  const id = groupExpansionKey(host?.sessionKey ?? null, key);
  const value = useSyncExternalStore(toolGroupExpansion.subscribe, () => toolGroupExpansion.get(id), () => toolGroupExpansion.get(id));
  const set = useCallback((open) => toolGroupExpansion.set(id, open), [id]);
  return [value ?? initial, set];
}

// c96d752d0 s1 (2.42304.0 s0): the card's summary of a turn's transcript entries (their tool runs, sG / Aye / w2e). This host's edits
// are Codex fileChange items, summarised by turn-edits-model.mjs turnEdits() (a later add of a path restarts its counts,
// as w2e does for a Write), and passed to the card as `items`. No file was edited on a remote computer (ranOnComputer),
// and the card is never folded into a lone bare edit row (soleVisibleEditToolRow; host difference: the local
// transcript has no rendersBareRow runs).
export function turnEditsSummary(items) {
  const files = items?.files;
  if (!Array.isArray(files) || files.length === 0) return null;
  return {
    files: files.map((file) => ({ path: file.path, additions: file.additions, deletions: file.deletions, calls: file.calls ?? [], ranOnComputer: false })),
    soleVisibleEditToolRow: false,
  };
}
// c96d752d0 G0e (2.42304.0 P2e): the claude.ai artifact row's label and opener (YY), and W0e its glyph (JY). This host
// has no artifacts and never passes artifactPage, so the row never shows.
const NO_ARTIFACT = Object.freeze({ label: undefined, open: undefined });
export function useArtifactPageLink() {
  return NO_ARTIFACT;
}
export function ArtifactPageIcon() {
  return null;
}

// c280f9bbb B (exported t; same name in both versions): the file type icon. Its icon-set branch needs GrowthBook __gb__2954460583 (unknown here, so
// off, as HOST_FLAGS answers any unknown flag) and a fetched icon JSON; the off branch is the CdsIcon named by shared-9
// nw over shared-52 nk (both generated), or `fallback` when given.
export function FileTypeIcon({ fileName, size, className, fallback }) {
  if (fallback !== undefined) return fallback;
  const name = fileIconName(fileBasename(fileName));
  return size === 'auto' ? <CdsIcon name={name} size="auto" className={className} /> : <CdsIcon name={name} size={size} className={className} />;
}

// c856385e2 Kn (exported a; 2.42304.0 On, exported i): the transcript file path context menu around `trigger`. This host's menu is
// source-transcript.jsx's delegated [data-file-ref] menu (n_ surface "transcript"), so the trigger carries the path.
export function FilePathMenu({ path, trigger }) {
  return path === undefined ? trigger : cloneElement(trigger, { 'data-file-ref': path });
}

