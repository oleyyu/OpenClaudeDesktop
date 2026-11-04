// The Code transcript drawn by the 3.6556.2 CodeTranscriptRenderer (W14-code renderer-core, plan-w14-code.md E86;
// GrowthBook 3413676205 code_unified_renderer, `always: true` in the desktop's Uon table). The renderer is the original
// (generated/code-transcript: c96d752d0 R3 with the spec E3 — parts code-core, code-dots-mark, code-step-pictures — the
// fragment / row models of c4a9ee384 and c80ec48f8, the alluvium reply prose of c19e90103); this module only feeds it the
// host's session as the desktop's feed (c96d752d0 bat, mounted by cf74bc599 uw / dw) does:
//
//   entries        code-transcript-entries.mjs: the host's engine items as the desktop's entries, the live text held
//                  (cf74bc599 dw `Ml(Ge, Pe)` = c96d752d0 LSe, provided by S2e: 2714218019 code_stream_live_text).
//   R3 props       bat's `Zit` call: `{spec: g, fragments: _e (E4e), host: Ye, write: Xe, proseSize: g.proseSize,
//                  streaming: x}`, with `Ye` the host object bat builds (sessionId, sessionRef, intl, seedKeys lit,
//                  codesOwn, inFlightFromIdx, showThinking, hiddenChapterIds, isOwnedSession, lastReplyClosingLine /
//                  tailActionsOutlet value stores U0, …) and `Xe = {baseEntries: X3(rat(entries)), hasEarlier, isResponding}`.
//   rows           R3's c3 context draws a turn (`renderRow(turnKey)`, l3); the desktop's feed (bat's list Iat / Fat:
//                  virtualized, scroll-anchored, keyboard rows) is the host's transcript frame (source-transcript.jsx),
//                  so the rows are one l3 per entry, keyed by the original turn key (c96d752d0 kN).
//   services       the session's file contexts and the transcript tool scope (as source-transcript-tool-rows.jsx), the
//                  app's one QueryClient (react-query, for the hooks that would read the claude.ai API: disabled here).
//   actions        bat's `onForkAtMessage: j, onForkAfterAssistantTurn: ze.forkAfterAssistantTurn, onRewindToMessage: P,
//                  onRateMessage: z, onOpenRewindPicker: H, onPinChapter: Re.pinUserChapter, onUnpinChapter:
//                  Re.unpinUserChapter` over the host's own requests (host.actions, see actionHost): the message's entry
//                  is read back as its turn. The toolbar's pressed states read the renderer's stores (GT chapters, l0
//                  ratings), so the host's chapter store and reply ratings are mirrored into them.
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyStreamSnapshot, CodeTranscriptRenderer, CODE_TRANSCRIPT_SPEC, createRendererFragments, createEntrySharer, createValueStore, entriesThroughProvisional,
  entryIndexById, epitaxyChapterStore, ForkedFromRow, ForkMarkerRow, LiveTextProvider, TranscriptInsetRow, messageRatingStore, RendererItemRow, RendererRowActions, RendererTurnRow,
  rendererItemOfKey, rendererPinItemKey, rendererTurnKey, seedKeysOwn, TranscriptMessageMenuHost,
  RewindDisabledReasonProvider, useLiveTexts, UserEntryRow, UserRowChromeContext, WorkflowTaskCard, WorkflowToolRow } from "./generated/code-transcript/code-transcript.mjs";
// W14-code r7 复核 R7T-06 = gates-r7-02: the live message stream (c06cf64bb W fed by the host, cd4f82e77 zt reading it).
import { transcriptStreamStore } from "./generated/code-transcript/c06cf64bb-CdJdJuVd.mjs";
import { useStreamSnapshot } from "./generated/code-transcript/cd4f82e77-CAMIsQ30.mjs";
import { chaptersWithStreamAlias, engineItemIdOf, streamFeedStep, withoutSnapshotSuffix, withStreamTail } from "./code-stream-feed.mjs";
// W14-code r4 R4T-08b: cea7057eb X, the session's background tasks F$ (`Wx(t.id)`) and N$ read; the host's workflow runs.
import { BackgroundTasksContext } from "./generated/code-transcript/cea7057eb-De2BQu3K.mjs";
import { TranscriptFeedHostContext, workflowTasks } from "./source-code-feed-adapters.jsx";
// W14-code r4 ct-feed R4T-09: the desktop's Code feed list (c4a9ee384 ba through c96d752d0 Aat) over this transcript's rows.
import { CodeTranscriptFeed } from "./source-code-feed.jsx";
// W14-code r2 R2T-01: the session's contained image loader (c856385e2 `wt = Ct.Provider`) fF reads for pathImage items.
// W14-code r2 R2T-TS8: c5259f582's `sessionFileReadable` (c856385e2 `rt = nt.Provider`), read by cb6930dae Xu's sent files.
// W14-code r6 R6T-02: c856385e2 `xt = bt.Provider`, the session's image loader (c5259f582 `e(h, {value: n.imageLoader})`).
import { ContainedImageLoaderProvider, ImageLoaderProvider, SessionFileReadableProvider } from "./generated/code-transcript/c856385e2-aEyDzrcK.mjs";
// W14-code r2 R2T-12: the turn error recovery scope (c227f4d5e PZ, which cf74bc599 mounts around the transcript as Xp).
import { TurnErrorRecoveryProvider } from "./generated/code-transcript/c227f4d5e-B-FYKrwT.mjs";
// W14-code transcript-rest TM-1 / TM-12: the list rows of c96d752d0 i9 the host's list draws (fork rows, the truncated note)
// and the desktop's sessions store they read (shared-8 og), filled from the host's sessions.
import { og as desktopSessionsStore } from "./generated/transcript-rows/rows-shared-8-Db1QN4mf.mjs";
// W14-code r2 R2T-TM3: cea7057eb L, the background task statuses by tool id c96d752d0 BOe reads (through Qhe).
import { BackgroundTaskStatusContext } from "./generated/transcript-rows/rows-cea7057eb-De2BQu3K.mjs";
import { CodeTranscriptSessionLinks, McpAppToolMatcherContext, SessionRenameContext, TaskPaneOpenerContext } from "./source-code-transcript-adapters.jsx";
// W14-code r3 R3T-REG-01 / REG-02: the host's tool cards, images and attached files, the ones its legacy tool rows hand
// the same original rows (source-session.jsx useToolRunHost; the row itself is group-status ToolRow).
import { useToolRunHost } from "./source-session.jsx";
import { ToolRow } from "./generated/transcript-rows/group-status.mjs";
import { SourceArtifacts, SourceDeliverables, itemDeliverables } from "./source-deliverables.jsx";
import { observedGenericTool } from "./generic-tool-model.mjs";
import { hookRunOutcome } from "./state.js";
import { forkMarkerPlacements, officialSessionRecords } from "./code-transcript-sessions.mjs";
import { t } from "../electron/i18n/index.mjs";
import { TurnStatus } from "./generated/working-line/turn-status.mjs";
import { CdsIcon } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { QueryClientProvider } from "./generated/files-changes/file-browser-query.mjs";
import { fileBrowserQueryClient } from "./source-breadcrumb-adapters.jsx";
import { SessionScopeContext } from "./generated/transcript-rows/rows-cd96b5fdc-ByQr-Uye.mjs";
import { PathResolverProvider, usePathResolver } from "./generated/transcript-rows/rows-c856385e2-DVsjb2QL.mjs";
import { DiffOpenerProvider, SessionFileOpenerProvider } from "./generated/r3b-transcript/session-file-access.mjs";
import { CurrentSessionIdContext } from "./generated/files-changes/session-context.mjs";
import { TranscriptToolScope } from "./transcript-tool-scope.mjs";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import { showsThinking } from "./transcript-view-model.mjs";
import { codeTranscriptEntries, localUserEntries, scheduledPromptEvent } from "./code-transcript-entries.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { TranscriptLiveScopeContext } from "./generated/transcript-rows/turn-mark.mjs";
import { chapterStore, chaptersByAnchor, seedChapterTitle, sessionChapterState } from "./session-chapters-model.mjs";
import { useChapterStoreState } from "./source-chapters.jsx";

const NO_CHAPTERS = Object.freeze([]);
const NO_TASKS = Object.freeze([]);

/**
 * W14-code r2 R2T-01: the contained image loader of a session (c5259f582's `containedImageLoader`, read by c96d752d0 fF
 * as `r = Fh()`): `(path) => Promise<src | null>`. The host shows a user's local image by its file URL (as the host's
 * own image tile did); a relative path is the session folder's; an http(s) / data URL is itself.
 */
export function containedImageSource(path, cwd = null) {
  const value = typeof path === "string" ? path : "";
  if (!value) return null;
  if (/^(?:https?:|data:image\/)/i.test(value)) return value;
  const absolute = value.startsWith("/") ? value : cwd ? `${cwd.replace(/\/$/, "")}/${value}` : null;
  return absolute ? fileUrlOf(absolute) : null;
}

// W14-code r7 R7T-05: a local path's file URL, each segment percent-encoded (encodeURIComponent), so a file name holding
// `#`, `?` or `%` names that file (encodeURI left them as the URL's fragment / query and the preview failed). No range
// check is added: cc43287c9 LV's `Dg` (shared-28 XM) only expands `~` and joins a relative path to the root, refusing
// malformed / UNC / device paths, which loadSessionImage refuses below.
export function fileUrlOf(absolute) {
  return `file://${String(absolute).split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

/**
 * W14-code r6 R6T-02: the session's image loader (c5259f582's `imageLoader`, cc43287c9 LV's loadImage `async (t, n, r) =>
 * …`: null for a path it refuses — `u(i)`, shared-28 XM's malformed / traversing path — else the session's image read,
 * null when it can't be read), read by c19e90103 ub (`Ge = qi()`) to open a reply's link to an image file in the image
 * preview (`Ge(J.path, !0)`; null: the file opens as before). The host reads a local image by its file URL (as the
 * contained loader does), probed so a missing or unreadable file answers null.
 */
export function loadSessionImage(path, cwd = null, ImageClass = globalThis.Image) {
  const value = typeof path === "string" ? path : "";
  if (!value || /^(?:[a-z][a-z0-9+.-]*:)/i.test(value) || value.includes("\0") || value.split(/[\\/]+/).includes("..")) return Promise.resolve(null);
  const src = containedImageSource(value, cwd);
  if (!src) return Promise.resolve(null);
  if (typeof ImageClass !== "function") return Promise.resolve(src);
  return new Promise((resolve) => {
    const probe = new ImageClass();
    probe.onload = () => resolve(src);
    probe.onerror = () => resolve(null);
    probe.src = src;
  });
}

// The stylesheets of the chunks the renderer is sliced from (c4a9ee384: hanging quotes, the TurnStatus / step pictures
// rules; c19e90103: the alluvium prose, fences, tables), which the desktop loads with those chunks (vite's CSS of a
// dynamically imported chunk). scripts/prepare-ui.mjs ships them in public/assets/v1 as lazy sheets; this links them
// once per document when a Code transcript first mounts (the host's chunks are bundled, so nothing loads them otherwise).
export const CODE_TRANSCRIPT_SHEETS = Object.freeze(["c4a9ee384-Br-fzuOs.css", "c19e90103-CuNz46ca.css"]);
function useChunkStylesheets() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    for (const name of CODE_TRANSCRIPT_SHEETS) {
      if (document.head.querySelector(`link[data-chunk-sheet="${name}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL(`assets/v1/${name}`, document.baseURI).href;
      link.setAttribute("data-chunk-sheet", name);
      document.head.appendChild(link);
    }
  }, []);
}

/**
 * The renderer over a host session. `entries`: code-transcript-entries.mjs's (or pass `items` and the options it takes:
 * `hostRow(row)` names the rows the host draws itself, `renderHostRow(row)` draws one in place, `renderAfter(row)` what the
 * host draws after a row the renderer drew — the turn's edits card, its auto-review notes).
 * `host`: {cwd, transcriptView, pendingApprovalItemIds, openFilePath(path, {line, endLine}), openDiff(path),
 * renderImages, renderAttachedFiles, liveOutputTask, openLiveOutput, openTask({taskId, agent, finished}), renameSession(id, title), actions,
 * leadRows (after the truncated / forked-from rows), transcriptNotices (the transcript's tail bands), openWorkflow(row) (a running
 * Workflow call's card: the run in the Tasks pane)}; `officialWorkflow` (code-transcript-entries.mjs's option: a workflow run
 * the host does not keep as its row is the Workflow call, R4T-08b); `actions` (each optional, absent = not
 * offered): {rewindServed, onRewindTo(turnId) (null while the session can't rewind now), onForkFrom(turnId),
 * onOpenRewindPicker(), ratings ({replyItemId: {rating}}), onRate(replyItemId, "positive" | "negative"), pins (true:
 * Pin as chapter over the window's chapter store)}.
 * `ownedSession` (default true): the renderer host's isOwnedSession; false for a session the window does not own (W14-code
 * r2 gates-r2-06: a sub-agent's thread in the agent detail view, cccc2cf0a PP `isOwnedSession: !1`).
 */
/**
 * W14-code r7 复核 R7T-06: the host's side of c06cf64bb W's `feed` — the streaming agentMessage's text as the session's
 * message stream (code-stream-feed.mjs streamFeedStep: message_start / content_block_* / message_stop; W.clear when it
 * ends, so the snapshot is null and the entry's own text shows). `sessionId` null: nothing is fed.
 */
function useCodeStreamFeed(sessionId, streamId, text) {
  const fed = useRef(null);
  useLayoutEffect(() => {
    const before = fed.current;
    if (before && before.sessionId !== sessionId) { transcriptStreamStore.clear(before.sessionId); fed.current = null; }
    if (!sessionId) return;
    const { fed: after, ops } = streamFeedStep(fed.current, streamId ? { id: streamId, text: typeof text === "string" ? text : "" } : null);
    for (const op of ops) op.clear ? transcriptStreamStore.clear(sessionId) : transcriptStreamStore.feed(sessionId, op.event, null);
    fed.current = after ? { ...after, sessionId } : null;
  }, [sessionId, streamId, text]);
  useEffect(() => () => { if (fed.current) transcriptStreamStore.clear(fed.current.sessionId); fed.current = null; }, []);
}

export function SourceCodeTranscript({ sessionId, entries: given = null, items = null, responding = false, activeTurnId = null,
  liveRunningToolIds = null, turnErrors = null, promptBlocks = null, hasEarlier = false, host = {}, hostRow = null, renderHostRow = null, renderAfter = null,
  subagents: givenSubagents = null, localSends = null, steers = null, taskEvents: givenTaskEvents = null, ownedSession = true,
  turnTimes = null, hookRuns = null, officialWorkflow = false, streamingItemId = null, isPanelActive = undefined }) {
  // R2T-TM3: the caller derives the sub-agents every render; kept while their content is the same, so the entries stay.
  const subagentsRef = useRef({ key: "", value: null });
  const subagentsKey = givenSubagents?.size ? JSON.stringify([...givenSubagents]) : "";
  if (subagentsRef.current.key !== subagentsKey) subagentsRef.current = { key: subagentsKey, value: givenSubagents?.size ? givenSubagents : null };
  const subagents = subagentsRef.current.value;
  // R2T-12: the caller derives the failed turns the renderer draws every render (source-turn-error rendererTurnErrors); kept
  // while their content is the same.
  const turnErrorsRef = useRef({ key: "", value: null });
  const turnErrorsKey = turnErrors && Object.keys(turnErrors).length ? JSON.stringify(turnErrors) : "";
  if (turnErrorsRef.current.key !== turnErrorsKey) turnErrorsRef.current = { key: turnErrorsKey, value: turnErrorsKey ? turnErrors : null };
  turnErrors = turnErrorsRef.current.value;
  // R2T-11: the turns' settled background tasks (task-event-model backgroundTaskEventsByTurn, Map turnId → events), kept
  // while their content is the same.
  const taskEventsRef = useRef({ key: "", value: null });
  const taskEventsKey = givenTaskEvents?.size ? JSON.stringify([...givenTaskEvents]) : "";
  if (taskEventsRef.current.key !== taskEventsKey) taskEventsRef.current = { key: taskEventsKey, value: taskEventsKey ? givenTaskEvents : null };
  const taskEvents = taskEventsRef.current.value;
  // W14-code transcript-rest: the list rows (host.lineage: {sessions, metadata, forkedFrom (parent id), forkMarks
  // (fork-marker-model's Map), openSession(id), mcp (W14-code r5 R5T-01: the Customize store's mcp slice)}; host.truncated:
  // the history did not load in full).
  const lineage = host.lineage ?? null;
  useDesktopSessions(lineage?.sessions ?? null, lineage?.metadata ?? null, lineage?.mcp ?? null);
  const { cwd = null, transcriptView = "normal", pendingApprovalItemIds = null } = host;
  const showThinking = showsThinking(transcriptView);
  // The running tools: the transcript live scope (cb6930dae Ho, source-transcript-rows.jsx TranscriptRowsScope) unless given.
  const scopeLive = useContext(TranscriptLiveScopeContext);
  liveRunningToolIds ??= scopeLive?.liveRunningToolIds ?? null;
  // R3T-NEW-02: the session's hook runs that blocked or failed (state.hookRuns) as the transcript's hook_notice items.
  const hookNotices = useMemo(() => codeHookNotices(hookRuns), [hookRuns]);
  const all = useMemo(() => given ?? codeTranscriptEntries(items ?? [], { view: transcriptView, responding, activeTurnId,
    liveRunningToolIds: liveRunningToolIds ?? new Set(), awaitingIds: pendingApprovalItemIds ?? new Set(), turnErrors: turnErrors ?? {}, hostRow, promptBlocks, subagents, taskEvents,
    // R3T-REG-05: a session the window does not own keeps its tools' own states (cccc2cf0a PP).
    ownStatus: !ownedSession, turnTimes, hookNotices, officialWorkflow }),
  [given, items, transcriptView, responding, activeTurnId, liveRunningToolIds, pendingApprovalItemIds, turnErrors, hostRow, promptBlocks, subagents, taskEvents,
    ownedSession, turnTimes, hookNotices, officialWorkflow]);
  // R2T-TM3: `subagents` (code-transcript-entries codeSubagents) as cea7057eb L's Map(toolId → status).
  const taskStatuses = useMemo(() => new Map([...(subagents ?? new Map())].map(([id, entry]) => [id, entry.status])), [subagents]);
  // W14-code r2 R2T-07 / gates-r2-03 (code-transcript-entries localUserEntries): the host's sends not echoed yet and its
  // steers not picked up yet follow the session's entries (c06cf64bb's echo / queue); a refused send is drawn after them
  // (bat's failedSendEntries). The caller rebuilds both every render: kept while their content is the same, the handlers
  // read through a ref.
  const localKey = JSON.stringify([(localSends ?? []).map((row) => [row?.id, row?.localDelivery?.status, row?.localDelivery?.sentAt, row?.content]),
    (steers ?? []).map((steer) => [steer?.id, steer?.input])]);
  const localRef = useRef({ key: null, value: null, handlers: new Map() });
  if (localRef.current.key !== localKey) localRef.current = { key: localKey, value: localUserEntries(localSends ?? [], steers ?? []), handlers: localRef.current.handlers };
  const local = localRef.current.value;
  for (const row of localSends ?? []) if (row?.id) localRef.current.handlers.set(row.id, row.localDelivery ?? {});
  const listed = useMemo(() => (local.entries.length ? [...all, ...local.entries] : all), [all, local]);
  // The renderer's entries are the non-host ones; the host's own rows are drawn in place between them.
  const built = useMemo(() => listed.filter((entry) => entry.author !== "host"), [listed]);
  // W14-code r7 复核 R7T-06 = gates-r7-02 (E95, GUI acceptance; rollback local_code_stream_snapshot): dw's stream.
  // `streamingItemId`: the running turn's agentMessage still growing (main.jsx, state.js isItemStreaming); its text is fed
  // to W as the session's message stream (useCodeStreamFeed), and dw's `He = fd(t, r, i ?? !0, Ve, je)` (zt) reads the
  // snapshot back. While that snapshot is the streaming message's, the provisional entry is the desktop's (the text out,
  // provisionalAfterItemId; withStreamTail): the renderer folds those raw entries (`rendererBaseEntries: ft`) with the
  // snapshot as its live tick (`liveSnapshot: ct` → Zit `C2e() ?? streaming` → R3), and the feed's rows take
  // `Os(a, He, Ue)` (fO, Ue: a local session) through Ml.
  const liveTextOn = hostGrowthBookFlag("__gb__2714218019");
  const streamOn = liveTextOn && hostGrowthBookFlag("local_code_stream_snapshot") && !!sessionId;
  const streamRow = streamOn && responding && typeof streamingItemId === "string" ? (items ?? []).find((row) => row?.id === streamingItemId) : null;
  useCodeStreamFeed(streamOn ? sessionId : null, streamRow?.type === "agentMessage" ? streamRow.id : null, streamRow?.text);
  // W14-code r8 gates-r8-01: dw's `He = fd(t, r, i ?? !0, Ve, je)` with i = isPanelActive (main.jsx: the split side is the
  // active one) and `Ve = … () => b.current?.isPinned() ?? !0` (b = messagesRef: the feed list, CodeTranscriptFeed's
  // messagesRef below). W reveals at 33ms only while the panel is active and the list follows its tail (c06cf64bb Tx:
  // `e.cachedVisibility ? 33 : (e.reveal.panelInactiveAny = !0, lx)`, lx = 100).
  const messagesRef = useRef(null);
  const isPinnedNow = React.useCallback(() => messagesRef.current?.isPinned() ?? true, []);
  const snapshot = useStreamSnapshot(sessionId ?? null, streamOn, isPanelActive, isPinnedNow, showThinking);
  const liveSnapshot = streamOn && streamRow && snapshot?.messageId === streamRow.id ? snapshot : null;
  const rendererBase = useMemo(() => (liveSnapshot ? withStreamTail(built, liveSnapshot.messageId) : built), [built, liveSnapshot?.messageId]);
  const streamed = useMemo(() => (liveSnapshot && rendererBase !== built ? applyStreamSnapshot(rendererBase, liveSnapshot, true) : built),
    [rendererBase, built, liveSnapshot]);
  // dw: `{entries: Ke, liveTexts: qe, liveTextStore: Je} = Ml(Ge, Pe)` with Pe (holdLiveText) on.
  const { entries, liveTexts, liveTextStore } = useLiveTexts(streamed, liveTextOn);
  useChunkStylesheets();
  const intl = useStartIntl();
  // bat: `[_e] = I(E4e)`, `[be] = I(Sat)`, `[xe] = I(xat)` (U0 stores), `[Se] = I(X3)`; one set per session.
  const keyed = useRef(null);
  if (keyed.current?.sessionId !== sessionId) keyed.current = { sessionId, fragments: createRendererFragments(), share: createEntrySharer(),
    closingLine: createValueStore(undefined), tailActions: createValueStore(null) };
  const { fragments, share, closingLine, tailActions } = keyed.current;
  const [published] = useState(() => createValueStore(undefined));
  const sessionRef = useMemo(() => (sessionId ? { type: "local", id: sessionId } : undefined), [sessionId]);
  // bat: `Ce = Z ? Se(rat(s)) : O7`, `Xe = {baseEntries: Ce, hasEarlier: Ee, isResponding: O}`.
  // r7 复核 R7T-06: while the stream's snapshot is laid over the feed's entries, the renderer folds the raw ones (bat's
  // `s` = dw's `rendererBaseEntries: ft`, ft = a) and splices the snapshot in itself (C4), so it is not applied twice.
  const streamingBase = liveSnapshot && rendererBase !== built ? rendererBase : null;
  const baseEntries = useMemo(() => share(entriesThroughProvisional(streamingBase ?? entries)), [share, streamingBase, entries]);
  const actions = useCodeTranscriptActions(sessionId, all, baseEntries, activeTurnId, host.actions ?? null);
  // host.prefill(text) → false when refused; read through a ref so the renderer host stays stable across renders.
  const prefillRef = useRef(null);
  prefillRef.current = typeof host.prefill === "function" ? host.prefill : null;
  const prefillOffered = !!prefillRef.current;
  const prefill = React.useCallback((text) => prefillRef.current?.(text) ?? false, []);
  // R2T-10: bat's `onAttachAsContext: B` (EA / DA's "Attach message as context" / "Attach selection as context"): the
  // host composer's context snippet (host.actions.onAttachAsContext(text)); read through a ref like prefill.
  const attachRef = useRef(null);
  attachRef.current = typeof host.actions?.onAttachAsContext === "function" ? host.actions.onAttachAsContext : null;
  const attachOffered = !!attachRef.current;
  const attach = React.useCallback((text) => { attachRef.current?.(text); }, []);
  // R2T-08: bat's `hiddenChapterIds: Ue ?? Qit, userChaptersByAfterId: Re.userChaptersByAfterId` — f7's YT over GT's
  // `bySession[c].userChapters` (by afterId) and the session's hidden Claude chapters, from the window's chapter store.
  const chapterState = useChapterStoreState();
  const sessionChapters = sessionChapterState(chapterState, sessionId);
  const hiddenChapterIds = sessionChapters.hidden.length ? sessionChapters.hidden : NO_CHAPTERS;
  // W14-code r8 R8T-REG-01: a chapter pinned to the streaming reply (kept under the engine id) is read under the snapshot's
  // `${messageId}-t0` too while it streams (code-stream-feed chaptersWithStreamAlias).
  const streamAliasId = liveSnapshot && rendererBase !== built ? liveSnapshot.messageId : null;
  const userChaptersByAfterId = useMemo(() => chaptersWithStreamAlias(chaptersByAnchor(sessionChapters.userChapters), streamAliasId),
    [sessionChapters.userChapters, streamAliasId]);
  // R3T-NEW-03: bat's `knownSlashCommands: Le` (cd4f82e77 xn: the session's commands and their aliases, Set of names) —
  // host.knownSlashCommands, the host's '/' names (its commands, skills and custom commands); kept while the same.
  const slashKey = Array.isArray(host.knownSlashCommands) || host.knownSlashCommands instanceof Set ? [...host.knownSlashCommands].filter((name) => typeof name === "string" && name).join("\0") : "";
  const knownSlashCommands = useMemo(() => (slashKey ? new Set(slashKey.split("\0")) : undefined), [slashKey]);
  const rendererHost = useMemo(() => ({ sessionId, sessionRef, intl, seedKeys: seedKeysOwn, codesOwn: true, inFlightFromIdx: entries.length,
    showThinking, hiddenChapterIds, ...(userChaptersByAfterId ? { userChaptersByAfterId } : {}), isOwnedSession: ownedSession, streamTelemetry: false, ...actions, lastReplyClosingLine: closingLine,
    ...(knownSlashCommands ? { knownSlashCommands } : {}),
    // TA-2: sX's Edit prompt puts the blocked prompt back in the composer (bat's `onPrefillComposer`; false: refused).
    ...(prefillOffered ? { onPrefillComposer: prefill } : {}),
    ...(attachOffered ? { onAttachAsContext: attach } : {}),
    tailActionsOutlet: tailActions, publishedTranscript: published }),
  [sessionId, sessionRef, intl, entries.length, showThinking, hiddenChapterIds, userChaptersByAfterId, ownedSession, actions, closingLine, tailActions, published,
    prefillOffered, prefill, attachOffered, attach, knownSlashCommands]);
  const imageLoader = useMemo(() => (path) => Promise.resolve(containedImageSource(path, cwd)), [cwd]);
  const sessionImageLoader = useMemo(() => (path) => loadSessionImage(path, cwd), [cwd]);
  // R2T-12: cf74bc599's `s(Xp, {scopeStore: r, isResponding: mt, isReadOnly: sc, attachmentsLocked: Be, onRetry: Te, onCompact:
  // ke, …})` — host.recovery {readOnly, onRetry() (the latest failed turn), onCompact()}; pg offers Try again only while
  // retryable (`!isResponding && !isReadOnly && !attachmentsLocked`) and Compact while idle. No composer scope store here
  // (gZ: no fallback model, no auto mode switch); the handlers read through a ref.
  const recoveryRef = useRef(null);
  recoveryRef.current = host.recovery ?? null;
  const retryOffered = typeof host.recovery?.onRetry === "function", compactOffered = typeof host.recovery?.onCompact === "function";
  const onRetryTurn = React.useCallback(() => { recoveryRef.current?.onRetry?.(); }, []);
  const onCompactTurn = React.useCallback(() => { recoveryRef.current?.onCompact?.(); }, []);
  // R2T-11: dX's click / R3's onOpenTask (c227f4d5e mQ: `{taskId, agent, finished}`) → host.openTask(event), the host's
  // Background tasks pane focused on that task; read through a ref.
  const openTaskRef = useRef(null);
  openTaskRef.current = typeof host.openTask === "function" ? host.openTask : null;
  const taskOpenOffered = !!openTaskRef.current;
  const openTask = useMemo(() => (taskOpenOffered ? (request) => { openTaskRef.current?.(request ?? {}); } : null), [taskOpenOffered]);
  // R2T-TS7: cb6930dae bc's Undo rename (c4ae8f050 M's mutate) → host.renameSession(sessionId, title) → Promise.
  const renameRef = useRef(null);
  renameRef.current = typeof host.renameSession === "function" ? host.renameSession : null;
  const renameOffered = !!renameRef.current;
  const renameSession = useMemo(() => (renameOffered ? (id, title) => renameRef.current?.(id, title) : null), [renameOffered]);
  const write = useMemo(() => ({ baseEntries, hasEarlier, isResponding: responding }), [baseEntries, hasEarlier, responding]);
  // R3T-REG-01 / REG-02: the host's side of the original tool rows, as its legacy tool rows have it (useToolRunHost over
  // host.agentState, the window's state: the answered question's pairs, the findings' turn, an item's artifacts):
  //   renderCard(kind, props)   m2e / K1e's cards (QuestionReceiptCard EZe, FindingsToolCard EQ, McpAppToolCard lY) — the
  //                             host's card for the call's engine item; "row" (a card with neither the host's nor its own
  //                             fallback) is the original tool row (group-status ToolRow), as SourceToolRun's.
  //   renderImages(images, path)  cb6930dae Hu: a tool's output images (the host's image tiles).
  //   renderAttachedFiles(tool)   cb6930dae iu: the files a tool attached (the item's codeDesktop.artifacts).
  // The call's engine item is the entries' own (tool.hostItem), read by tool id so a call the renderer's entry sharing
  // kept from an earlier pass reads the current item. host.renderCard / renderImages / renderAttachedFiles override.
  const agentContext = useMemo(() => (host.agentState ? { state: host.agentState } : null), [host.agentState]);
  const toolHost = useToolRunHost({ agentContext, sessionKey: sessionId ?? null, cwd, onOpenFileRef: null, onOpenChanges: null, transcriptView,
    pendingApprovalItemIds, isStreaming: false, agentNested: !ownedSession });
  const hostItems = useMemo(() => {
    const out = new Map();
    for (const entry of all) for (const item of entry.items ?? []) if (item.kind === "tools") for (const tool of item.tools) if (tool.hostItem) out.set(tool.id, tool.hostItem);
    return out;
  }, [all]);
  const hostItemsRef = useRef(hostItems);
  hostItemsRef.current = hostItems;
  const renderCardWith = host.renderCard ?? toolHost.renderCard, attachedWith = host.renderAttachedFiles ?? toolHost.renderAttachedFiles;
  // W14-code r4 R4T-08b (E95): the session's workflow runs (the Workflow calls' engine rows, transcript-sdk-tools.mjs
  // workflowRunTool) as cea7057eb X's tasks (source-code-feed-adapters.jsx workflowTask), kept while their content is the same.
  const workflowRows = [...hostItems].filter(([, item]) => item?.workflowRun).map(([id, item]) => ({ id, workflowRun: item.workflowRun }));
  const workflowKey = workflowRows.length ? JSON.stringify(workflowRows) : "";
  const tasks = useMemo(() => (workflowKey ? workflowTasks(workflowRows) : NO_TASKS), [workflowKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const openWorkflowRef = useRef(null);
  openWorkflowRef.current = typeof host.openWorkflow === "function" ? host.openWorkflow : null;
  const renderCard = React.useCallback((kind, props) => {
    if (kind === "row") return props?.tool ? <ToolRow tool={props.tool} /> : null;
    // W14-code r4 R4T-08b (E95): the Workflow tool row is the original F$ (group-status K1e `if (P$(t.tools[0])) return
    // f(F$, {tool})`, handed to the scope as WorkflowToolCard). F$ opens the Background tasks pane at the task only inside
    // a pane host (`s = bm(j1e) && o !== null`, `onOpen: s ? u : void 0`); the host is that pane host, so while the run is
    // running its compact card is F$'s own branch — `f(N$, {task: v, variant: "compact", title: d, isPreLaunch: g, onOpen:
    // e})` with d = c7226f7ba t(input), the input's name — opening the host's Tasks pane (host.openWorkflow).
    if (kind === "workflow" && props?.tool) {
      const tool = props.tool, task = tasksRef.current.find((one) => one.toolUseId === tool.id);
      if (task?.status === "running" && !props.inGroup && openWorkflowRef.current) {
        const row = hostItemsRef.current.get(tool.id) ?? tool.hostItem;
        return <WorkflowTaskCard task={task} variant="compact" title={typeof tool.input?.name === "string" && tool.input.name ? tool.input.name : undefined}
          isPreLaunch={false} onOpen={() => openWorkflowRef.current?.(row)} />;
      }
      return <WorkflowToolRow tool={tool} inGroup={props.inGroup === true} />;
    }
    const tool = props?.tool;
    const hostItem = tool ? hostItemsRef.current.get(tool.id) ?? tool.hostItem : undefined;
    if (!hostItem) return renderCardWith?.(kind, props);
    const withItem = tool.hostItem === hostItem ? tool : Object.defineProperty({ ...tool }, "hostItem", { value: hostItem, enumerable: false });
    return renderCardWith?.(kind, { ...props, tool: withItem });
  }, [renderCardWith]);
  const renderAttachedFiles = React.useCallback((tool, placement) => {
    const hostItem = tool ? hostItemsRef.current.get(tool.id) ?? tool.hostItem : undefined;
    return hostItem ? attachedWith?.(hostItem, placement) ?? null : null;
  }, [attachedWith]);
  const scope = useMemo(() => ({ transcriptView, showThinking, surface: null, pendingApprovalItemIds,
    renderImages: host.renderImages ?? toolHost.renderImages ?? null, renderMarkdown: null, renderCard,
    renderAttachedFiles, liveOutputTask: host.liveOutputTask ?? null, openLiveOutput: host.openLiveOutput ?? null }),
  [transcriptView, showThinking, pendingApprovalItemIds, host.renderImages, toolHost.renderImages, renderCard, renderAttachedFiles, host.liveOutputTask, host.openLiveOutput]);
  const fileOpener = useMemo(() => (host.openFilePath ? (path, line, endLine) => { host.openFilePath(path, { line, endLine }); } : null), [host.openFilePath]);
  const diffOpener = useMemo(() => (host.openDiff ? (path, options) => (options?.probe === true ? true : host.openDiff(path) === true) : null), [host.openDiff]);
  const resolver = usePathResolver(cwd || null, null, null);
  const session = useMemo(() => (sessionId ? { sessionId } : null), [sessionId]);
  const index = useMemo(() => entryIndexById(entries), [entries]);
  let at = 0;
  const linked = typeof lineage?.openSession === "function";
  const forkMarkers = useMemo(() => forkMarkerPlacements(all, lineage?.forkMarks, (entry) => entry.turnId ?? entry.row?.turnId ?? null),
    [all, lineage?.forkMarks]);
  // i9 `case "forkMarker"`: Tet after the fork point's turn, `t9(Et, f(Tet, {childIds, linked}))`. W14-code r5 R5T-03:
  // inset as the renderer's (t9 → e9, the assistant text inset, `data-code-own-row`), as the sleep notice is.
  const marker = (index) => forkMarkers.has(index) ? <TranscriptInsetRow><ForkMarkerRow childIds={forkMarkers.get(index)} linked={linked} /></TranscriptInsetRow> : null;
  // W14-code r4 ct-feed R4T-09: each row is an object `{id, kind, article, itemIds, render()}` — drawn in place (the
  // host's frame, transcript_hold_place off) or through the desktop's feed list (src/source-code-feed.jsx). `article`:
  // an entry's row (Aat's `o9`), `itemIds`: the host's engine rows it draws (a chapter's reveal).
  // W14-code r6 R6T-REG-01: Aat's `vr` (rendererPinAnchorOf): `n = ot?.get(e), r = n?.itemKeys.indexOf(EM(e, t)) ?? -1;
  // return r < 0 ? void 0 : n?.pinAnchorIds?.[r]?.[0]`, over the renderer's fragments.
  const pinAnchorOf = React.useCallback((turnKey, key) => {
    const own = fragments.get(turnKey), at = own?.itemKeys.indexOf(rendererPinItemKey(turnKey, key)) ?? -1;
    // W14-code r8 R8T-REG-01: an anchor the stream's snapshot named is read back as its engine item (Lg).
    return at < 0 ? undefined : engineItemIdOf(own?.pinAnchorIds?.[at]?.[0], (id) => actionItemIds(all).has(id));
  }, [fragments, all]);
  const feedRows = listed.map((entry, entryIndex) => {
    if (entry.author === "host") {
      // TA-3: a scheduled prompt is the event row (c96d752d0 IF → PF), the turn's footer and after-rows the host's.
      const fired = scheduledPromptEvent(entry.row);
      if (fired) return { id: `host:${entry.id}`, kind: "other", article: false, itemIds: [entry.row.id], render: () => <>
        <div className="contents" data-transcript-item-id={entry.row.id}><ScheduledPromptRow item={fired} /></div>
        {renderAfter?.(entry.row) ?? null}{marker(entryIndex)}</> };
      return { id: `host:${entry.id}`, kind: "other", article: false, itemIds: entry.row?.id ? [entry.row.id] : [],
        render: () => <>{renderHostRow?.(entry.row) ?? null}{marker(entryIndex)}</> };
    }
    const position = at++, turnKey = rendererTurnKey(entries[position] ?? entry, position, index);
    // d7 / renderRow: an entry past the renderer's (bat's `rat`: after the streaming entry) has no rendererSlotKey, so the
    // feed's i9 draws it with gat → kI (DI): a message waiting for the running turn, or a send still going out.
    if (position >= baseEntries.length && entry.author === "user") return { id: `local:${entry.id}`, kind: "user", article: true, entryIndex: position, itemIds: [entry.id],
      render: () => <LocalUserRow entry={entries[position] ?? entry} sessionId={sessionId} sessionRef={sessionRef} onAttachAsContext={attachOffered ? attach : undefined} /> };
    // The turn's own chrome after it: the host's tool extras, what it draws after the turn's rows, a fork marker.
    const after = () => <>
      <CodeToolExtras entry={entry} sessionKey={sessionId ?? null} state={host.agentState ?? null} />
      {renderAfter ? (entry.rows ?? []).map((row) => <React.Fragment key={`after:${row.id}`}>{renderAfter(row)}</React.Fragment>) : null}
      {marker(entryIndex)}
    </>;
    const itemId = entry.rows?.[0]?.id ?? entry.id;
    // W14-code r7 R7T-02: i9's Fork after this turn (`Rt = j !== void 0 && Lt !== void 0 && !ot ? () => j(Lt) : void 0`,
    // ot the turn in flight), for M7 around a reply's rows.
    const forkAfterTurn = rendererHost.onForkAfterAssistantTurn && !(responding && entry.turnId && entry.turnId === activeTurnId)
      ? () => rendererHost.onForkAfterAssistantTurn(position) : undefined;
    const user = entry.author === "user";
    return { id: turnKey, kind: entry.author === "user" ? "user" : "assistant", article: true, entryIndex: position, itemIds: [entry.id, ...(entry.rows ?? []).map((row) => row.id)],
      // W14-code r6 review fix: the host rows a later part of a split reply draws (its own itemIds in the feed list; the turn's
      // first row stays with the first part).
      partItemIds: (part) => partRowIds(part, entry).filter((id) => id !== itemId && id !== entry.id),
      // W14-code r7 R7T-02: i9 `case "user"` / `case "assistant"` with a rendererSlotKey put M7 around the turn's l3 —
      // a prompt: `f(M7, {entry, turnKey: Xe, userChaptersByAfterId: k, onPinChapter: void 0, onUnpinChapter: void 0,
      // rendererPinAnchorOf: void 0, onForkAfterTurn: void 0, onForkAtMessage: A, onRewindToMessage: F, onAttachAsContext:
      // H, viewerAccountId: ie, children})`; a reply: `onPinChapter: G, onUnpinChapter: K, rendererPinAnchorOf: q,
      // onForkAfterTurn: Rt, onForkAtMessage: void 0, onRewindToMessage: void 0` — so a right-click on the turn opens
      // TA's menu (DA) with the message's actions (EA). The child stays the host's row element (its engine row id, which
      // the follow release, the reveal and the restore anchor read): i9's `div[data-take-back-entry]` with j7's row gap
      // ("none": `[&>[data-transcript-row]]:!mt-0`) relies on Aat's row wrapper giving the gap above (Vnt's
      // gapAboveClass), which the host's list does not draw, so the turn keeps its own margin.
      render: () => <>
        <RendererRowActions entry={entries[position] ?? entry} turnKey={turnKey} userChaptersByAfterId={userChaptersByAfterId}
          onPinChapter={user ? undefined : rendererHost.onPinChapter} onUnpinChapter={user ? undefined : rendererHost.onUnpinChapter}
          rendererPinAnchorOf={user ? undefined : pinAnchorOf} onForkAfterTurn={user ? undefined : forkAfterTurn}
          onForkAtMessage={user ? rendererHost.onForkAtMessage : undefined} onRewindToMessage={user ? rendererHost.onRewindToMessage : undefined}
          onAttachAsContext={attachOffered ? attach : undefined} viewerAccountId={undefined}>
          <div className="contents" data-transcript-item-id={itemId} data-code-message-menu=""><RendererTurnRow turnKey={turnKey} opensTranscript={false} /></div>
        </RendererRowActions>
        {after()}
      </>,
      // W14-code r5 R5T-04 / gates-r5-04: a part of the reply Aat's row model split (lP's rendererItem row), drawn as i9
      // `case "rendererItem"` draws it; the turn's chrome after the last.
      // W14-code r6 R6T-REG-01: i9's whole part — `f(M7, {entry, turnKey, userChaptersByAfterId: k, onPinChapter: G,
      // onUnpinChapter: K, rendererPinAnchorOf: q, onForkAfterTurn: Rt, onForkAtMessage: void 0, onRewindToMessage: void 0,
      // onAttachAsContext: H, viewerAccountId: ie, children: _("div", {...j7(kt, Bt), children: [Bt, f(e7e, {turnKey,
      // itemKey, opensTranscript: Tt})]})})` with kt = Aat's `rendererRowGap` for a part (`pN(t) && !t.isFirst ? "own" :
      // "none"`, O9e: `{"data-row-gap": e, className: D9e[e]}`) and no flash (Bt null). Every part names its host row
      // (the follow release, the host's message menu and the restore anchor find rows by it): the engine row of the item
      // the part draws (TM over the entry's items), else the turn's first.
      renderPart: (part) => {
        const gap = part.isFirst ? "none" : "own";
        return <>
          <RendererRowActions entry={entries[position] ?? entry} turnKey={part.turnKey} userChaptersByAfterId={userChaptersByAfterId}
            onPinChapter={rendererHost.onPinChapter} onUnpinChapter={rendererHost.onUnpinChapter} rendererPinAnchorOf={pinAnchorOf}
            onForkAfterTurn={forkAfterTurn}
            onForkAtMessage={undefined} onRewindToMessage={undefined} onAttachAsContext={attachOffered ? attach : undefined} viewerAccountId={undefined}>
            <div data-row-gap={gap} className={ROW_GAP_CLASS[gap]} data-transcript-item-id={partRowId(part, entry, itemId)} data-code-message-menu="">
              <RendererItemRow turnKey={part.turnKey} itemKey={part.itemKey} opensTranscript={false} />
            </div>
          </RendererRowActions>
          {part.isLast ? after() : null}
        </>;
      } };
  });
  // The list's lead rows: i9 `case "truncated"` (the history is partial), then `case "forkedFrom"` (Cet), then the
  // caller's (W14-code r4 ct-lead-slot: host.leadRows — the session's start row, cf74bc599 `So = Vx({…occasion: "start"})`
  // → Mx at the list's lead).
  const lead = <>
    {host.truncated ? <TranscriptTruncatedRow key="truncated" /> : null}
    {/* W14-code r5 R5T-03: i9 `case "forkedFrom"` is `t9(Et, …)` too (the truncated note is not). */}
    {lineage?.forkedFrom && sessionId ? <TranscriptInsetRow key="forked-from"><ForkedFromRow sessionId={sessionId} parentSessionId={lineage.forkedFrom} linked={linked} /></TranscriptInsetRow> : null}
    {host.leadRows ?? null}
  </>;
  // R2T-07: bat's failedSendEntries after every entry (d7 `[...e, ...t]`), i9 → gat → mat → kI with DI's `failedSend
  // {sentAt, onRetry, onDiscard}` ("Not delivered · {time}", Retry, Discard).
  const failedRows = local.failed.map(({ entry, sentAt }) => ({ id: `failed:${entry.id}`, kind: "user", article: true, itemIds: [entry.id],
    render: () => <LocalUserRow entry={entry} sessionId={sessionId} onAttachAsContext={attachOffered ? attach : undefined}
      failedSend={{ sentAt: sentAt === null ? undefined : intl.formatTime(sentAt),
        onRetry: () => localRef.current.handlers.get(entry.id)?.onRetry?.(), onDiscard: () => localRef.current.handlers.get(entry.id)?.onDiscard?.() }} /> }));
  // W14-code r4 ct-feed R4T-09: transcript_hold_place (4175257006, Uon always on) is the switch — on, the rows go through
  // the desktop's feed list inside the host's scroller (a session this window owns, in a SourceTranscript frame that
  // offers it); off, they are drawn in place and the host's scroller and feed navigation are the whole feed (rollback).
  const feedHost = useContext(TranscriptFeedHostContext);
  const feedOn = feedHost !== null && ownedSession && hostGrowthBookFlag("__gb__4175257006");
  const listRows = feedOn ? [
    ...(host.truncated || (lineage?.forkedFrom && sessionId) || host.leadRows ? [{ id: "lead", kind: "other", article: false, itemIds: [], render: () => lead }] : []),
    ...feedRows, ...failedRows,
    ...(host.transcriptNotices ? [{ id: "notices", kind: "other", article: false, itemIds: [], render: () => host.transcriptNotices }] : []),
  ] : null;
  return <QueryClientProvider client={fileBrowserQueryClient}>
    <SessionScopeContext.Provider value={session}>
      <CurrentSessionIdContext.Provider value={sessionId ?? null}>
        <SessionFileOpenerProvider value={fileOpener}>
          <DiffOpenerProvider value={diffOpener}>
            <PathResolverProvider value={cwd ? resolver : null}>
              <TranscriptToolScope.Provider value={scope}>
                <McpAppToolMatcherContext.Provider value={ownedSession && typeof host.isMcpAppTool === "function" ? host.isMcpAppTool : null}>
                <BackgroundTaskStatusContext.Provider value={taskStatuses}>
                <BackgroundTasksContext.Provider value={tasks}>
                <ContainedImageLoaderProvider value={imageLoader}>
                <ImageLoaderProvider value={sessionImageLoader}>
                <SessionFileReadableProvider value={!!fileOpener}>
                <TaskPaneOpenerContext.Provider value={openTask}>
                <SessionRenameContext.Provider value={renameSession}>
                <TurnErrorRecoveryProvider scopeStore={undefined} isResponding={responding} isReadOnly={!!host.recovery?.readOnly} attachmentsLocked={false}
                  onRetry={retryOffered ? onRetryTurn : undefined} onCompact={compactOffered ? onCompactTurn : undefined}>
                <LiveTextProvider liveTexts={liveTexts} liveTextStore={liveTextStore} liveSnapshot={liveTextOn && streamingBase ? liveSnapshot : undefined}>
                  {/* R2T-09: cf74bc599 nT → c96d752d0 tDe: `rewindDisabledReason` "responding" while the turn runs (IA disables
                      Rewind with FA's "Rewind is unavailable while Claude is working"); a local session forks any time. */}
                  <RewindDisabledReasonProvider rewindDisabledReason={responding ? "responding" : undefined} forkDisabledReason={undefined}>
                  <CodeTranscriptRenderer spec={CODE_TRANSCRIPT_SPEC} fragments={fragments} host={rendererHost} write={write}
                    proseSize={CODE_TRANSCRIPT_SPEC.proseSize} streaming={streamingBase ? liveSnapshot : null}>
                    <CodeTranscriptSessionLinks.Provider value={linked ? lineage.openSession : null}>
                      {/* W14-code r7 R7T-02: Aat's list sits in TA (`f(TA, {children: f(n8, …)})`, both returns): the message
                          menu M7 / EA open at a row (xA) and its one ContextMenu (_De → DA). */}
                      <TranscriptMessageMenuHost>
                      {listRows ? <CodeTranscriptFeed rows={listRows} entries={entries} rendererEntryCount={baseEntries.length} sessionId={sessionId} responding={responding} fragments={fragments} intl={intl} messagesRef={messagesRef} />
                        : <>{lead}{feedRows.map((row) => <React.Fragment key={row.id}>{row.render()}</React.Fragment>)}
                          {failedRows.map((row) => <React.Fragment key={row.id}>{row.render()}</React.Fragment>)}
                          {/* W14-code r4 ct-lead-slot: host.transcriptNotices, the session bands drawn in the transcript's tail
                              (cf74bc599 vA EpitaxySessionBands, `inTranscript: Xr(i, _)` with _ the tailRowsRenderable: the sleep
                              band `s(wO, {sessionRef, inTranscript, scopeStore, focusComposer}, `${t}:sleep`)`, …). */}
                          {host.transcriptNotices ?? null}</>}
                      </TranscriptMessageMenuHost>
                    </CodeTranscriptSessionLinks.Provider>
                  </CodeTranscriptRenderer>
                  </RewindDisabledReasonProvider>
                </LiveTextProvider>
                </TurnErrorRecoveryProvider>
                </SessionRenameContext.Provider>
                </TaskPaneOpenerContext.Provider>
                </SessionFileReadableProvider>
                </ImageLoaderProvider>
                </ContainedImageLoaderProvider>
                </BackgroundTasksContext.Provider>
                </BackgroundTaskStatusContext.Provider>
                </McpAppToolMatcherContext.Provider>
              </TranscriptToolScope.Provider>
            </PathResolverProvider>
          </DiffOpenerProvider>
        </SessionFileOpenerProvider>
      </CurrentSessionIdContext.Provider>
    </SessionScopeContext.Provider>
  </QueryClientProvider>;
}

// c96d752d0 D9e (O9e's class by row gap): `{own: "", none: "[&>[data-transcript-row]]:!mt-0", item: mse}`.
const ROW_GAP_CLASS = Object.freeze({ own: undefined, none: "[&>[data-transcript-row]]:!mt-0" });

/**
 * W14-code r6 R6T-REG-01: the host row a part of a split reply (lP's rendererItem row) draws — the item the part's key
 * names in the entry (c96d752d0 TM, as M7 reads it: `TM(n, p, t.items)`), a tool group by its first call; its engine
 * row id when the entry came from that row (a tool group's or a file run's member answers the displayed row), else
 * `fallback` (the turn's first row). The first part is always `fallback` (a chapter's reveal lands on the reply's start).
 */
export function partRowId(part, entry, fallback) {
  if (!part || part.isFirst) return fallback;
  return partRowIds(part, entry)[0] ?? fallback;
}

/**
 * W14-code r6 review fix (R6T-REG-01's remainder): every host row a part of a split reply draws — partRowId's mapping over all
 * of the item's calls (a tool group's, in order), so a chapter pinned to a later part's row reveals that part (the feed
 * list's reveal finds a row by its itemIds), not the reply's start. None for the first part or an unknown key.
 */
export function partRowIds(part, entry) {
  if (!part || part.isFirst) return [];
  const item = rendererItemOfKey(part.turnKey, part.itemKey, entry?.items ?? []);
  const owns = item?.kind === "tools" ? (item.tools ?? []).map((tool) => tool?.hostItem?.id ?? String(tool?.id ?? "").replace(/#\d+$/, "")) : [item?.id];
  const out = [];
  for (const own of owns) {
    if (typeof own !== "string" || !own) continue;
    // W14-code r8 R8T-REG-01: a streaming reply's text part is the snapshot's item (`${messageId}-t0`): its row is the
    // engine item's (Lg), so the part names the same host row before and after the stream ends.
    const id = hostRowOf(entry, own) ?? hostRowOf(entry, withoutSnapshotSuffix(own));
    if (id !== null && !out.includes(id)) out.push(id);
  }
  return out;
}

// The engine row of the entry that draws `own` (the row itself, or the row whose tool group / file run holds it).
function hostRowOf(entry, own) {
  for (const row of entry?.rows ?? []) {
    if (row?.id === own) return row.id;
    for (const member of Array.isArray(row?.toolGroup) ? row.toolGroup : []) {
      if (member?.id === own) return row.id;
      for (const one of Array.isArray(member?.fileRun) ? member.fileRun : []) if (one?.id === own) return row.id;
    }
    for (const one of Array.isArray(row?.fileRun) ? row.fileRun : []) if (one?.id === own) return row.id;
  }
  return null;
}

/**
 * W14-code r3 R3T-REG-02 (E89: a host capability with no desktop counterpart keeps the host's drawing, at the official
 * row's extension point): the files a tool call of the entry handed over that no original row draws — a `present` /
 * present_files call's deliverables (the desktop's only file hand-over is SendUserFile, whose sent files' block cb6930dae
 * Xu draws from `toolUseResult.attachments`: a SendUserFile with sized files is left to it) and the artifacts a core
 * attached to a call (codeDesktop.artifacts; cb6930dae iu, the host's renderAttachedFiles, is only reached for
 * SendUserFile rows) — the host's file cards (source-deliverables.jsx), after the entry's row.
 */
export function CodeToolExtras({ entry, sessionKey = null, state = null }) {
  const cards = [];
  for (const item of entry?.items ?? []) {
    if (item?.kind !== "tools") continue;
    for (const tool of item.tools ?? []) {
      const hostItem = tool.hostItem;
      if (!hostItem) continue;
      if (itemDeliverables(hostItem) && !(tool.name === "SendUserFile" && tool.toolUseResult?.attachments?.length))
        cards.push(<SourceDeliverables key={`deliverables:${tool.id}`} item={hostItem} sessionKey={sessionKey} failed={hostItem.status === "failed" || hostItem.success === false} />);
      // W14-code r3 gen-final-3: group-status K1 already draws a SendUserMessage / SendUserFile row's attached files
      // (`ed(t.name) && f(ay, {tool: t})`, ed = c12ef874d `e === "SendUserMessage" || e === "SendUserFile"`, ay → the
      // scope's renderAttachedFiles = the host SourceArtifacts), so those rows' artifacts are not drawn a second time here.
      const artifacts = tool.name === "SendUserMessage" || tool.name === "SendUserFile" ? null
        : observedGenericTool(hostItem, state, sessionKey)?.codeDesktop?.artifacts;
      if (Array.isArray(artifacts) && artifacts.length)
        cards.push(<div key={`artifacts:${tool.id}`} className="source-message" data-transcript-item-id={hostItem.id}><SourceArtifacts artifacts={artifacts} sessionKey={sessionKey} /></div>);
    }
  }
  return cards.length ? cards : null;
}

/**
 * R3T-NEW-02: a session's hook runs (state.hookRuns[sessionId], runId → HookRunSummary) that blocked or failed, as the
 * transcript's hook notices `{id, turnId, message, level}`: the hook's own output (state.js hookRunOutcome). A UserPromptSubmit
 * block is the turn's prompt_blocked item instead (TA-2).
 * W14-code r4 R4T-04 (E95), c06cf64bb's informational system message: `let a = n.trim().replace(/:$/, "").trimEnd(); if (!a)
 * continue; let o = r.level; if (o === "info") continue; … notices: [{id: g, message: a, level: o === "warning" ? "warning" :
 * "notice"}]` — a run with no output has no notice (the host's "A {event} hook blocked this action." / "… failed." sentence
 * is gone), and the level is the one the hook reported: the run's own `level`, else "warning" when the hook wrote a warning
 * entry (HookOutputEntry kind "warning"), else "notice".
 */
export function codeHookNotices(hookRuns) {
  const out = [];
  for (const run of Object.values(hookRuns && typeof hookRuns === "object" ? hookRuns : {})) {
    const outcome = hookRunOutcome(run);
    if (!outcome || outcome.promptBlocked) continue;
    const message = (outcome.details ?? "").trim().replace(/:$/, "").trimEnd();
    if (!message || run.level === "info") continue;
    const reported = run.level ?? ((Array.isArray(run.entries) ? run.entries : []).some((entry) => entry?.kind === "warning") ? "warning" : undefined);
    out.push({ id: `hook-notice:${run.id}`, turnId: typeof run.turnId === "string" && run.turnId ? run.turnId : null,
      message, level: reported === "warning" ? "warning" : "notice" });
  }
  return out;
}

// i9 `case "user"` with no rendererSlotKey: `f("div", {className: Nt ? g8 : void 0, children: f(uD.Provider, {value: Et !==
// !1 && Y !== !0, children: f(gat, …)})})` — Nt the row's isUserNew at mount (g8 its enter animation), Et the feed's
// rendererInset (the renderer is on) and Y the overview layout (off). gat → kI with the code feed's Ftt layout (no bare
// bubble, no member disc, bubbleSide "end"), `emitTurnHeading: !0`; a failed send is mat → kI, which passes no sessionRef.
// The host offers its attach-as-context only: these entries are not a turn of the session yet, so no Rewind / Fork.
const USER_ENTER = "epitaxy-user-enter animate-code-user-bubble-enter motion-reduce:animate-none";
const enteredLocalRows = new Set();
function LocalUserRow({ entry, sessionId, sessionRef, failedSend, onAttachAsContext }) {
  const [entering] = useState(() => !enteredLocalRows.has(entry.id));
  useEffect(() => { enteredLocalRows.add(entry.id); }, [entry.id]);
  const row = failedSend
    ? <UserEntryRow entry={entry} sessionId={sessionId ?? undefined} emitTurnHeading={true} failedSend={failedSend} onAttachAsContext={onAttachAsContext} />
    : <UserEntryRow entry={entry} sessionRef={sessionRef} isOwnedSession={true} sessionId={sessionId ?? undefined} bubbleSide="end" emitTurnHeading={true}
      onAttachAsContext={onAttachAsContext} />;
  return <div className="contents" data-transcript-item-id={entry.id} data-local-user-row={failedSend ? "failed" : entry.awaitingPickup ? "waiting" : "sending"}>
    <div className={entering ? USER_ENTER : undefined}><UserRowChromeContext.Provider value={true}>{row}</UserRowChromeContext.Provider></div>
  </div>;
}

/**
 * c96d752d0 IF → PF for one "trigger" event (a scheduled prompt): dD's TurnStatus branch (lD → WCe, `gf.Step` state "done")
 * whose label is PF's `[Clock icon, span.truncate [wF → xF Dk.trigger]]` in dD's "inline-flex max-w-full min-w-0
 * items-center gap-1 align-top" span, and whose body is LF's single-event content (cb6930dae Oc "text-code text-secondary
 * whitespace-pre-wrap break-all select-text"), closed until opened. Written here (E84.2): IF's closure reaches stores and
 * contexts other areas hold (D1), so it is not sliced.
 */
export function ScheduledPromptRow({ item }) {
  const intl = useStartIntl();
  const [open, setOpen] = useState(false);
  const label = <span className="inline-flex max-w-full min-w-0 items-center gap-1 align-top">
    <CdsIcon name="Clock" size="sm" className="shrink-0" />
    <span className="truncate">{intl.formatMessage({ defaultMessage: "{count, plural, one {Scheduled check-in} other {# scheduled check-ins}}", id: "/xGqMvi/gy" }, { count: 1 })}</span>
  </span>;
  return <div data-find-omitted="" className="flex w-full flex-col" data-scheduled-prompt="">
    <TurnStatus.Step state="done" label={label} open={open} onOpenChange={setOpen}>
      <div className="text-code text-secondary whitespace-pre-wrap break-all select-text">{item?.content ?? ""}</div>
    </TurnStatus.Step>
  </div>;
}

/**
 * c96d752d0 i9 `case "truncated"` (scope "main"): the list's note when the session's history did not load in full
 * (thread-history-model loadThreadHistory `truncated`). Inline JSX of the list renderer, so written here verbatim.
 */
export function TranscriptTruncatedRow() {
  return <div className="flex justify-center px-md text-center text-balance" data-transcript-truncated="">
    <span className="text-caption text-muted-as-secondary">{t("Earlier messages aren’t shown. This session is too large to load in full.")}</span>
  </div>;
}

// The desktop's sessions store (shared-8 og) the fork rows read (WI, __, Sj): the host's sessions as its records, kept in
// step before paint. Only the `sessions` field is written; the store's own persisted fields stay.
// W14-code r5 R5T-01: `mcp` (the Customize store's mcp slice) gives the open session's record its sdkMcpServers.
function useDesktopSessions(sessions, metadata, mcp = null) {
  const records = useMemo(() => (sessions ? officialSessionRecords(sessions, metadata ?? {}, mcp) : null), [sessions, metadata, mcp]);
  useLayoutEffect(() => {
    if (records) desktopSessionsStore.setState({ sessions: records });
  }, [records]);
}

/**
 * The renderer host's message actions over the host's requests (bat's host fields; see the header). Each is offered
 * where the host offers it, as its turn footer and user-message toolbar did:
 *   onRewindToMessage(entryId, text) / onForkAtMessage(entryId, text)   the user entry's turn: Rewind to here / Fork
 *       from here (message-actions-model.mjs). Rewind is offered where the core serves it and, as cf74bc599 nT's
 *       (`l === void 0 && o?.(e, t)`), does nothing while the session can't rewind (responding); never on the open turn.
 *   onForkAfterAssistantTurn(idx)   R3's Je: the turn of baseEntries[idx] (the reply's Fork).
 *   onRateMessage(entryId, sentiment)   u6e's Good / Bad response: the turn's last reply (the host's rating key).
 *   onPinChapter(itemId, seed) / onUnpinChapter(chapterId)   f7's pinUserChapter / unpinUserChapter over the window's
 *       chapter store (session-chapters-model.mjs; jwe's seed title).
 *   onOpenRewindPicker()   the error card's Rewind (the composer's Esc Esc picker).
 */
export function codeTranscriptActionHost(sessionId, all, baseEntries, activeTurnId, actions, read = () => ({ all, baseEntries, activeTurnId, actions })) {
  if (!actions) return {};
  // W14-code r8 R8T-REG-02: a user entry's id may be the UUID-shaped one derived from its engine id
  // (code-transcript-entries userEntryId); its sourceUuid stays the engine id, so either names the turn.
  const turnOf = (entryId, author) => {
    const entry = read().all.find((one) => one.author === author && one.id === entryId)
      ?? read().all.find((one) => one.author === author && one.sourceUuid === entryId);
    return typeof entry?.turnId === "string" && entry.turnId ? entry.turnId : null;
  };
  const finished = (turnId) => !!turnId && turnId !== read().activeTurnId;
  const replyOf = (turnId) => {
    let id = null;
    for (const entry of read().all) if (entry.author === "assistant" && entry.turnId === turnId)
      for (const item of entry.items ?? []) if (item.kind === "text") id = item.id;
    return id;
  };
  const host = {};
  if (actions.rewindServed || typeof actions.onRewindTo === "function") host.onRewindToMessage = (entryId) => {
    const turnId = turnOf(entryId, "user"), rewind = read().actions?.onRewindTo;
    if (finished(turnId) && typeof rewind === "function") rewind(turnId);
  };
  if (typeof actions.onForkFrom === "function") {
    host.onForkAtMessage = (entryId) => {
      const turnId = turnOf(entryId, "user");
      if (finished(turnId)) read().actions?.onForkFrom?.(turnId);
    };
    host.onForkAfterAssistantTurn = (idx) => {
      const turnId = read().baseEntries[idx]?.turnId;
      if (finished(turnId)) read().actions?.onForkFrom?.(turnId);
    };
  }
  if (typeof actions.onRate === "function") host.onRateMessage = (entryId, sentiment) => {
    const turnId = turnOf(entryId, "assistant"), reply = turnId ? replyOf(turnId) : null;
    if (reply && (sentiment === "positive" || sentiment === "negative")) read().actions?.onRate?.(reply, sentiment);
  };
  if (typeof actions.onOpenRewindPicker === "function") host.onOpenRewindPicker = () => read().actions?.onOpenRewindPicker?.();
  if (actions.pins && sessionId) {
    // W14-code r8 R8T-REG-01: M7 / u6e pin the item the renderer drew — while the reply streams, the snapshot's text item
    // (`${messageId}-t0`, c06cf64bb Fg). The desktop keeps that id after the stream (its persisted entries use it too);
    // the host's entry goes back to the engine id, so the chapter is kept under it (Lg) and outlives the stream.
    host.onPinChapter = (itemId, seed) => {
      const anchor = engineItemIdOf(itemId, (id) => actionItemIds(read().all).has(id));
      if (anchor) chapterStore().addUserChapter(sessionId, anchor, seedChapterTitle(seed));
    };
    host.onUnpinChapter = (chapterId) => { if (chapterId) chapterStore().removeUserChapter(sessionId, chapterId); };
  }
  return host;
}

// The item ids of the host's entries (code-transcript-entries), cached by entries array.
const ACTION_ITEM_IDS = new WeakMap();
function actionItemIds(all) {
  if (!Array.isArray(all)) return new Set();
  let ids = ACTION_ITEM_IDS.get(all);
  if (!ids) {
    ids = new Set();
    for (const entry of all) for (const item of entry?.items ?? []) if (typeof item?.id === "string") ids.add(item.id);
    ACTION_ITEM_IDS.set(all, ids);
  }
  return ids;
}

/** The renderer's l0 ratings for a session: each reply entry carries its turn's rating (the host keys it by reply item). */
export function entryRatings(all, ratings) {
  const replyByTurn = new Map();
  for (const entry of all) if (entry.author === "assistant" && entry.turnId)
    for (const item of entry.items ?? []) if (item.kind === "text") replyByTurn.set(entry.turnId, item.id);
  const out = new Map();
  for (const entry of all) {
    if (entry.author !== "assistant" || !entry.turnId) continue;
    const value = ratings?.[replyByTurn.get(entry.turnId)]?.rating;
    if (value === "positive" || value === "negative") out.set(entry.id, value);
  }
  return out;
}

/** R2T-08: the renames GT holds for a session that the host's chapter store does not have yet, written into it. */
export function mirrorChapterRenames(theirs, sessionId, store = chapterStore()) {
  if (!theirs || !sessionId) return;
  const mine = sessionChapterState(store.getSnapshot(), sessionId);
  for (const chapter of theirs.userChapters ?? []) {
    const own = mine.userChapters.find((one) => one.id === chapter.id);
    if (own && typeof chapter.title === "string" && own.title !== chapter.title) store.rename(sessionId, chapter.id, chapter.title);
  }
  for (const [id, title] of Object.entries(theirs.renames ?? {}))
    if (typeof title === "string" && mine.renames[id] !== title) store.rename(sessionId, id, title);
}

function useCodeTranscriptActions(sessionId, all, baseEntries, activeTurnId, actions) {
  const latest = useRef(null);
  latest.current = { all, baseEntries, activeTurnId, actions };
  const offered = actions ? [!!(actions.rewindServed || actions.onRewindTo), typeof actions.onForkFrom === "function",
    typeof actions.onRate === "function", typeof actions.onOpenRewindPicker === "function", !!actions.pins].join() : "";
  const host = useMemo(() => codeTranscriptActionHost(sessionId, null, null, null, actions, () => latest.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the callbacks read the latest values; only what is offered re-keys them
    [sessionId, offered]);
  // u6e's Pin as chapter pressed state reads GT (`bySession[c]?.userChapters.some(afterId)`): the window's chapter
  // store, the same persisted "epitaxy-chapters-v2" state, kept in step.
  const chapters = useChapterStoreState();
  useEffect(() => {
    if (epitaxyChapterStore.getState().bySession !== chapters.bySession) epitaxyChapterStore.setState({ bySession: chapters.bySession });
  }, [chapters]);
  // R2T-08: the renderer's chapter headings (GY) rename through GT (`rename(sessionId, id, title)` on double-click); the
  // host's store, which the rail and the persisted state read, takes the same rename.
  useEffect(() => epitaxyChapterStore.subscribe((next) => {
    if (sessionId) mirrorChapterRenames(next?.bySession?.[sessionId], sessionId);
  }), [sessionId]);
  // u6e's Good / Bad pressed state reads l0 (`ratings.get(sessionId)?.get(entryId)`): the host's reply ratings.
  const ratings = actions?.ratings ?? null;
  useEffect(() => {
    if (!sessionId) return;
    const next = entryRatings(all, ratings);
    messageRatingStore.setState((state) => {
      const known = state.ratings.get(sessionId);
      if (known && known.size === next.size && [...next].every(([id, value]) => known.get(id) === value)) return state;
      return { ratings: new Map(state.ratings).set(sessionId, next) };
    });
  }, [sessionId, all, ratings]);
  return host;
}

/**
 * c96d752d0 bat around the renderer: `Do({componentName: "TranscriptRenderer", fallback: null, onError: le})`, where le
 * sets `ie` (`ae(!0)`) and the feed falls back to its legacy rows ("fell_back_render_error"). The host's legacy rows are
 * its own (main.jsx): a failure marks the session (codeTranscriptRendererOn answers false for it from then on) and draws
 * `fallback()`, the host's rows.
 */
export class CodeTranscriptBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: null };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("[CodeTranscriptRenderer]", error);
    markCodeTranscriptFailed(this.props.sessionId);
    this.props.onFallback?.(this.props.sessionId, error);
  }
  componentDidUpdate(previous) {
    if (previous.sessionId !== this.props.sessionId && this.state.failed) this.setState({ failed: null });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    // getDerivedStateFromError renders this before componentDidCatch commits: the session is marked here, so the host
    // rows the fallback draws (codeTranscriptRendererOn false) are its own rows, not the renderer's (null) ones.
    markCodeTranscriptFailed(this.props.sessionId);
    return this.props.fallback?.() ?? null;
  }
}

// cf74bc599 uw: `transcriptRenderer: Rn ? Tn(E3) : void 0` — the renderer is offered while code_unified_renderer
// (3413676205, Uon `always !0`) is on and the session's renderer has not failed (the boundary above).
const failedSessions = new Set();
export function codeTranscriptRendererOn(sessionId) {
  return hostGrowthBookFlag("__gb__3413676205") && !failedSessions.has(sessionId);
}
export function markCodeTranscriptFailed(sessionId) {
  failedSessions.add(sessionId);
}
