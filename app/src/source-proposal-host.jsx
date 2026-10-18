// R4f-proposal P5 (tasks-proposal-group-card WI-5): the transcript's inline proposal group card, wired to this host.
//
// 2.42304.0 draws the tasks a session proposed (spawn_task) as a group card inside the transcript: the feed builder
// (c96d752d0 QL) pushes a `turnSuggestions` row right after the tail of the turn that proposed them, rendered
// `D9(Ye, b("div", {"data-find-omitted": "", className: …"flex flex-col gap-[var(--chat-item-gap)]"…, children: b(R$, …)}))`,
// and an `unplacedSuggestions` row (`className: "contents"`, z$) at the feed's end for queued tasks no loaded tool call
// carries; with `hostDrawsTurnSuggestions` every placed proposing call (gL) leaves the regular tool rows (_K). The session
// pane (cf74bc599 Lb / Ib) provides the spawner (mc = c96d752d0 qQ) and announces "Sent to this session" (nc = q1e). All
// of it hangs on `lr = Zs(cr, t)` (Xx; Zs = c96d752d0 g1e over cr = shared-11 Qo, claudeai_cc_epitaxy_session_presets_main):
// on, the floating Suggested task card (lb) is not mounted at all (`Or&&t&&dr&&!lr&&u(lb …)`). D10 takes the presets-on
// branch, so this host draws the inline card and the 2.2553.1-era floating card (source-suggested-tasks.jsx) is gone.
//
// This module is the host's Lb: it derives the card's data from the open session (proposal-group-model.mjs, P2), keeps
// one spawner per parent session (proposal-spawner.mjs, P3) on the generated official helpers (generated/proposal-group,
// P1) and the host bridge (proposal-launch.mjs, P3: a background start that never navigates), and reads the main-process
// records of electron/task-proposals.cjs (P4). main.jsx passes the open session's state and its own primitives (rpc,
// call, setSessions, turnOptions, …) in `useProposalCards`, and mounts ProposalTurnCard after a turn's last shown row and
// ProposalFeedEnd after the rows.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { coreEffort } from "./model-menu-model.mjs";
import { threadPermissionParams, turnPermissionParams } from "../electron/permission-policy.mjs";
import { ProposalHostProvider } from "./source-proposal-group-adapters.jsx";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import {
  TurnProposalGroup, UnplacedProposalGroup, ProposalSpawnerContext, SentHereNotice, inlineSpawnerGate,
  proposalKey, isOfferProposal, crossRepoCwdOf, keepSessionMode, proposalHereText, resolveStartPermissionMode, startModeNeedsConsent,
  visibleProposalQueue, spawningTaskIds, markProposalSpawning, clearProposalSpawning,
  proposalOutcomeStore, recordProposalOutcome, clearProposalOutcome,
} from "./generated/proposal-group/index.mjs";
import { createProposalSpawner } from "./proposal-spawner.mjs";
import { createProposalBridge, withPersistedOutcomes, TASK_PROPOSALS_CHANNEL } from "./proposal-launch.mjs";
import {
  proposalCardToolIds, turnProposals, proposalAnchors, backgroundTaskSuggestions, unplacedSuggestions, proposalOutcomes,
  sentHereTaskIds, startedTaskIds, proposalSessions, toOfficialPermissionMode, toHostPermissionMode, legacyWithdrawnTaskIds,
  LEGACY_DISMISSED_TASKS_PREFIX,
} from "./proposal-group-model.mjs";

// D10: the presets switch (shared-11 Qo, claudeai_cc_epitaxy_session_presets_main) is on locally.
export const PRESETS_ON = true;
// main.jsx sendMessage / clearSession's developerInstructions for a Code session on a core without customization.
export const CODE_DEVELOPER_INSTRUCTIONS = "You are the assistant in OpenClaude Desktop, a local desktop client. Follow the user language. When asked for a plan, use the plan tool. Do not claim to be Claude.";

const EMPTY = Object.freeze([]);
const EMPTY_MAP = new Map();
const EMPTY_OBJECT = Object.freeze({});
const plain = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const noSubscription = () => () => {};
// The previous value while its key is the same (a derived array or map rebuilt with the same content).
function useStable(value, keyOf) {
  const kept = useRef(null);
  const key = keyOf(value);
  if (!kept.current || kept.current.key !== key) kept.current = { key, value };
  return kept.current.value;
}
const noSpawner = () => null;

/**
 * Whether the open session draws the inline card: lr = g1e(presets, sessionRef) — presets on (D10) and a local session
 * (every host session is local; the generated g1e also checks the desktop bridge's popBackgroundTaskSuggestionById, which
 * the adapter declares). The card belongs to Code sessions (the ccd_session tools); Cowork keeps its tool rows.
 */
export function proposalCardsActive(mode, sessionId) {
  return mode === "code" && typeof sessionId === "string" && sessionId !== "" && inlineSpawnerGate(PRESETS_ON, { id: sessionId, type: "local" });
}

// _K + JGe: while the card is drawn, every placed spawn_task call leaves the rows before they are grouped. The same
// filtered list feeds the turn footers (their anchor is the turn's last remaining item) and the display rows.
const filtered = new WeakMap();
export function withoutProposalCardTools(items, active) {
  if (!active || !Array.isArray(items) || items.length === 0) return items;
  if (filtered.has(items)) return filtered.get(items);
  const hidden = proposalCardToolIds(items);
  const rows = hidden.size ? items.filter((item) => !hidden.has(item?.id)) : items;
  filtered.set(items, rows);
  return rows;
}

// The 2.2553.1-era floating card's per-viewer list (code-desktop:dismissed-tasks:<sid>): dismissed or started ids that
// can't be told apart, so they are withdrawn from the queue (no outcome is made up for them; P2 legacyWithdrawnTaskIds).
function legacyWithdrawn(sessionId) {
  if (!sessionId) return EMPTY;
  try { return legacyWithdrawnTaskIds(globalThis.localStorage?.getItem(LEGACY_DISMISSED_TASKS_PREFIX + sessionId) ?? null); } catch { return EMPTY; }
}

/** The kernel's model/list as the card's catalog: {models: [{id, name, efforts: [{id, recommended?}]}]} (kernel levels). */
export function proposalCatalog(models) {
  const list = (Array.isArray(models) ? models : []).filter((entry) => entry && entry.hidden !== true && (entry.model || entry.id));
  return {
    models: list.map((entry) => {
      const id = entry.model || entry.id;
      const efforts = (Array.isArray(entry.supportedReasoningEfforts) ? entry.supportedReasoningEfforts : [])
        .map((level) => (typeof level === "string" ? level : level?.reasoningEffort ?? level?.id)).filter((level) => typeof level === "string" && level);
      return { id, name: entry.displayName || entry.name || id,
        efforts: efforts.map((level) => (level === entry.defaultReasoningEffort ? { id: level, recommended: true } : { id: level })) };
    }),
  };
}

// The main-process records (electron/task-proposals.cjs): {[parent]: {[taskId]: outcome}} from a "read" at mount and
// every sidebar-state event that carries them (other operations' events leave the field out: no change). Revision
// guarded like applySidebarState.
function useMainOutcomes({ call, onEvent, initial }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    const apply = (next) => {
      if (!live || !plain(next?.taskProposals)) return;
      setState((previous) => previous && Number.isFinite(previous.revision) && Number.isFinite(next.revision) && next.revision < previous.revision
        ? previous : { revision: next.revision, taskProposals: next.taskProposals });
    };
    const unsubscribe = typeof onEvent === "function" ? onEvent((event) => { if (event?.kind === "sidebar-state") apply(event.state); }) : null;
    if (typeof call === "function") Promise.resolve().then(() => call(TASK_PROPOSALS_CHANNEL, { operation: "read" })).then(apply, () => {});
    return () => { live = false; if (typeof unsubscribe === "function") unsubscribe(); };
  }, [call, onEvent]);
  return state?.taskProposals ?? (plain(initial) ? initial : EMPTY_OBJECT);
}

// F1e's consent (jue) for a mode the parent didn't have: this host's Auto is its ordinary default mode, picked in the
// composer without a dialog, so it is agreed; Bypass is only offered when the parent already runs it (c227f4d5e sq
// `isBypassAvailable: … p === "bypassPermissions"`) and p$ drops it across repositories, so it never asks — refused.
export const confirmProposalMode = ({ mode } = {}) => (mode === "auto" ? "agreed" : "declined");

// The host's start steps for proposal-launch.mjs, from main.jsx's primitives (read at call time). A child is a Code
// session in the folder the spawner works out, with the parent's speed, tools and agent choice (as /clear's restart and
// Home's start carry them), the model / effort / mode the card resolved, and the task's prompt as its first message.
// `parentId` binds a start to the session that asked for it, so a switch to another session meanwhile doesn't lend the
// child that session's tools or agent.
function hostActions(live, parentId) {
  const options = () => live.current;
  const host = () => live.current.host ?? EMPTY_OBJECT;
  const parentOf = () => parentId ?? options().sessionId;
  const hints = () => (typeof host().permissionHints === "function" ? host().permissionHints() : {});
  const withAgent = (params) => (typeof host().withAgentChoice === "function" ? host().withAgentChoice(params, parentOf()) : params);
  const toolsOf = () => (typeof host().toolsFor === "function" ? host().toolsFor(parentOf()) ?? null : null);
  return {
    call: (...args) => options().call(...args),
    rpc: (...args) => options().rpc(...args),
    toHostPermission: toHostPermissionMode,
    threadStartParams: ({ cwd, model, permission }) => {
      const h = host(), tools = toolsOf();
      return withAgent({ cwd, model: model || null, serviceTier: h.serviceTier, ...threadPermissionParams({ permission, mode: "code", ...hints() }),
        codeDesktop: { surface: "code", ...(tools ? { tools } : {}) },
        ...(h.customization ? {} : { developerInstructions: CODE_DEVELOPER_INSTRUCTIONS }) });
    },
    // turnOptions for a session that isn't the open one: its own folder (no additional folders), model and effort; a
    // listed model with no levels runs at its own default (no effort), as the composer's turnOptions does.
    turnStartParams: ({ cwd, prompt, model, effort, permission }) => {
      const h = host();
      const listed = (Array.isArray(options().models) ? options().models : []).find((entry) => entry?.model === model || entry?.id === model);
      const effortless = !!listed && !(Array.isArray(listed.supportedReasoningEfforts) && listed.supportedReasoningEfforts.length);
      return withAgent({ input: [{ type: "text", text: prompt, text_elements: [] }], model: model || null, serviceTier: h.serviceTier,
        effort: effortless ? null : coreEffort(effort) || null, cwd,
        ...turnPermissionParams({ permission, mode: "code", cwd, additionalFolders: [], ...hints() }),
        codeDesktop: { workflowTurn: { permission, mode: "code", ultracode: false } } });
    },
    // $r(…, {detached: !0}): the row goes into the list, never selected; the lineage is written here at once (main
    // records it once the first turn runs) so the card reads the task as started without waiting for main's event.
    insertSession: (thread, { name, spawnedFrom } = {}) => {
      const h = host(), id = thread.id, parent = parentOf(), tools = toolsOf();
      const lineage = spawnedFrom?.sessionId && spawnedFrom.taskId ? { sessionId: spawnedFrom.sessionId, taskId: spawnedFrom.taskId, ...(spawnedFrom.title ? { title: spawnedFrom.title } : {}) } : null;
      h.setSessionMetadata?.((value) => ({ ...value, [id]: { ...value[id], surface: "code", ...(lineage ? { spawnedFrom: lineage } : {}) } }));
      h.setSessions?.((rows) => [{ ...thread, ...(name ? { name } : {}) }, ...rows.filter((row) => row.id !== id)]);
      h.resumed?.current?.add?.(id);
      if (tools) h.setBoot?.((value) => (value?.config ? { ...value, config: { ...value.config, threadTools: { ...value.config.threadTools, [id]: tools } } } : value));
      h.setAgentChoices?.((choices) => (parent && choices?.[parent] ? { ...choices, [id]: choices[parent] } : choices));
    },
    discardThread: (id) => host().discardFailedStart?.(id, { stay: true, text: "", entries: [], mentions: [] }),
    // A core that names its own sessions keeps its title (main.jsx sendMessage's generatesTitles branch).
    nameThread: (threadId, name) => (host().generatesTitles ? Promise.resolve() : options().rpc("thread/name/set", { threadId, name })),
    // "Do it here" (official $e.sendMessage): the text goes into the open session — queued behind a running turn, else as
    // the next turn. Throws when it can't, so the spawner reports it.
    sendMessage: async (parentId, text) => {
      const o = options(), h = host();
      if (!parentId || parentId !== o.sessionId || !o.connected || o.archived) throw new Error("The session can’t take a message right now.");
      const input = [{ type: "text", text, text_elements: [] }];
      if (o.running) {
        await o.rpc("thread/queue/add", { threadId: parentId, input, clientUserMessageId: globalThis.crypto.randomUUID() });
        h.loadQueue?.(parentId);
        return;
      }
      if (typeof h.isBusy === "function" && h.isBusy()) throw new Error("The session is busy with another action.");
      await h.ensureResumed?.(parentId);
      h.setTurnRequested?.(parentId);
      try { await o.rpc("turn/start", { threadId: parentId, input, ...h.turnOptions(o.parent?.cwd) }); }
      catch (error) { h.setTurnRequested?.((value) => (value === parentId ? null : value)); throw error; }
    },
  };
}

function spawnerDeps(live, intl) {
  const actions = hostActions(live);
  const bridge = (parentId) => createProposalBridge(hostActions(live, parentId));
  return {
    official: { proposalKey, isOffer: isOfferProposal, crossRepoCwdOf, keepSessionMode, resolvePermissionMode: resolveStartPermissionMode,
      needsModeConsent: startModeNeedsConsent, hereText: (record) => proposalHereText(intl.current, record) },
    spawning: { visible: (queue, parentId) => visibleProposalQueue(queue, spawningTaskIds(parentId)), mark: markProposalSpawning, clear: clearProposalSpawning },
    results: withPersistedOutcomes({ record: recordProposalOutcome, clear: clearProposalOutcome }, actions.call),
    bridge: { popById: (parentId, ...args) => bridge(parentId).popById(parentId, ...args), sendMessage: actions.sendMessage,
      start: (request) => bridge(request?.parentId).start(request) },
    notify: (message, { variant, error } = {}) => live.current.host?.notify?.(message, { variant, error }),
    confirmMode: confirmProposalMode,
    captureGuardedSnapToBottom: () => live.current.host?.captureGuardedSnapToBottom?.() ?? null,
  };
}

/**
 * The open session's proposal cards. options:
 *   active                proposalCardsActive(mode, sessionId)
 *   sessionId, items      the open session and its transcript items (unfiltered)
 *   sessions, sessionMetadata, fields   the session list, config.sessionMetadata, the Recent fields (isScratchWorkspace)
 *   parent                {model, effort, permission (host value), cwd, originCwd?} of the open session
 *   connected, archived, running, hereDisabled
 *   runningTurns          state.active ({threadId: turnId}): a started child's row reads isRunning from it
 *   needsInput            the session ids with a pending request
 *   models                the kernel's model/list
 *   call, rpc, onEvent, initialOutcomes   IPC, the core, desktop events, init's config.taskProposals
 *   fallbackKey           anything the host tool row depends on besides the item (the transcript view, the folder)
 *   host                  main.jsx primitives: serviceTier, permissionHints, withAgentChoice, customization, toolsFor(id),
 *                         generatesTitles, setSessions, setSessionMetadata, setBoot, setAgentChoices, resumed,
 *                         discardFailedStart, ensureResumed, setTurnRequested, turnOptions, loadQueue, isBusy, notify,
 *                         captureGuardedSnapToBottom, openSession, renderToolFallback(item), renderMarkdown(text)
 * Returns {active, sessionRef, spawner, host, anchors(rows) → Map<row index, turnSuggestions row>, unplaced}.
 */
export function useProposalCards(options) {
  const live = useRef(options);
  live.current = options;
  const intl = useRef(null);
  intl.current = useStartIntl();
  const { active, sessionId, items, sessionMetadata, parent = EMPTY_OBJECT } = options;
  const main = useMainOutcomes({ call: options.call, onEvent: options.onEvent, initial: options.initialOutcomes });
  const mainOutcomes = useMemo(() => proposalOutcomes(sessionId ? main[sessionId] : undefined), [main, sessionId]);
  const stored = useSyncExternalStore(proposalOutcomeStore.subscribe,
    () => (sessionId ? proposalOutcomeStore.getState().byParent[sessionId] : undefined),
    () => (sessionId ? proposalOutcomeStore.getState().byParent[sessionId] : undefined));
  // The queue leaves a task once any result is known: main's (persisted dismissed / sent_here, this run's start_failed)
  // or this window's results store (EQ), which the spawner writes before main answers.
  const outcomes = useMemo(() => ({ ...mainOutcomes, ...proposalOutcomes(stored) }), [mainOutcomes, stored]);
  // kQ keeps sent_here across reloads (epitaxy-suggested-task-sent-here-v1); here main's copy seeds it (MQ also fills
  // EQ). Dismissed and start_failed are only this window's EQ in the original, so they are not seeded.
  useLayoutEffect(() => {
    if (!sessionId) return;
    const known = proposalOutcomeStore.getState().byParent[sessionId] ?? EMPTY_OBJECT;
    for (const [taskId, outcome] of Object.entries(mainOutcomes)) if (outcome === "sent_here" && known[taskId] !== "sent_here") recordProposalOutcome(sessionId, taskId, "sent_here");
  }, [sessionId, mainOutcomes]);
  const withdrawn = useMemo(() => legacyWithdrawn(sessionId), [sessionId]);
  const started = useMemo(() => startedTaskIds(sessionMetadata, sessionId), [sessionMetadata, sessionId]);
  // A streaming transcript hands a new items array per delta; the card's inputs keep their identity until what they hold
  // changes (the queue by content, the turn rows by their placed calls), so the memoised card isn't drawn again per delta.
  const queue = useStable(useMemo(() => (active ? backgroundTaskSuggestions(items, { outcomes, startedTaskIds: started, withdrawn }) : EMPTY),
    [active, items, outcomes, started, withdrawn]), JSON.stringify);
  const sentHere = useMemo(() => sentHereTaskIds(outcomes), [outcomes]);
  const cardTools = useMemo(() => (active ? [...proposalCardToolIds(items)].join("\n") : ""), [active, items]);
  const proposals = useStable(useMemo(() => (active ? turnProposals(items, { sentHereSuggestionIds: sentHere }) : EMPTY_MAP), [active, items, sentHere]),
    (rows) => [...rows.values()].map((row) => row.id + ":" + row.tools.map((tool) => tool.id).join(",")).join("|"));
  const unplaced = useStable(useMemo(() => (active ? unplacedSuggestions(queue, items, { sentHereSuggestionIds: sentHere }) : null),
    [active, queue, items, sentHere]), JSON.stringify);

  const parentModel = parent.model || undefined, parentEffort = parent.effort ? coreEffort(parent.effort) : undefined;
  const parentCwd = parent.cwd || undefined, parentOrigin = parent.originCwd || parentCwd, parentPermission = parent.permission;
  const runningTurns = options.runningTurns;
  const sessions = useMemo(() => {
    if (!active) return EMPTY;
    const records = proposalSessions({ sessions: options.sessions, metadata: sessionMetadata, parentId: sessionId,
      parent: { model: parentModel, effort: parentEffort, permission: parentPermission, cwd: parentCwd }, queue, fields: options.fields });
    return records.map((record) => (record.sessionId !== sessionId && runningTurns?.[record.sessionId] ? { ...record, isRunning: true } : record));
  }, [active, options.sessions, sessionMetadata, sessionId, parentModel, parentEffort, parentPermission, parentCwd, queue, options.fields, runningTurns]);
  const needsKey = (Array.isArray(options.needsInput) ? options.needsInput : []).filter((id) => typeof id === "string").join("\n");
  const needsInput = useMemo(() => (needsKey ? needsKey.split("\n") : EMPTY), [needsKey]);
  const catalog = useMemo(() => proposalCatalog(options.models), [options.models]);
  const host = useMemo(() => ({
    sessions, needsInput, catalog, permissionModes: { auto: true }, capabilities: { picks: true, worktreePick: true },
    openSession: (id, opener) => live.current.host?.openSession?.(id, opener),
    renderToolFallback: (tool) => {
      const item = (Array.isArray(live.current.items) ? live.current.items : EMPTY).find((entry) => entry?.id === tool?.id);
      return item ? live.current.host?.renderToolFallback?.(item) ?? null : null;
    },
    renderMarkdown: (text) => live.current.host?.renderMarkdown?.(text) ?? text,
    // cardTools / fallbackKey: the host tool row and the prompt preview are read through `live`; a new value (another
    // placed call, another transcript view or folder) lets the card's consumers render them again.
  }), [sessions, needsInput, catalog, cardTools, options.fallbackKey]);

  // One spawner per parent session, kept for the window's life (a Start all that is still running keeps its order and
  // busy state when the user switches away and back).
  const controllers = useRef(null);
  controllers.current ??= new Map();
  const controller = useMemo(() => {
    if (!sessionId) return null;
    let found = controllers.current.get(sessionId);
    if (!found) { found = createProposalSpawner(spawnerDeps(live, intl)); controllers.current.set(sessionId, found); }
    return found;
  }, [sessionId]);
  const spawnerHost = useMemo(() => ({
    sessionId, available: !!active && !!options.connected && !options.archived, hereDisabled: !!options.hereDisabled, queue,
    session: { originCwd: parentOrigin, cwd: parentCwd, model: parentModel, effort: parentEffort, permissionMode: toOfficialPermissionMode(parentPermission) },
  }), [sessionId, active, options.connected, options.archived, options.hereDisabled, queue, parentOrigin, parentCwd, parentModel, parentEffort, parentPermission]);
  // F1e reads its stores when it is called; the controller takes the latest host before its snapshot is read.
  controller?.setHost(spawnerHost);
  const spawner = useSyncExternalStore(controller ? controller.subscribe : noSubscription, controller ? controller.getSnapshot : noSpawner,
    controller ? controller.getSnapshot : noSpawner);

  const sessionRef = useMemo(() => (sessionId ? { id: sessionId, type: "local" } : null), [sessionId]);
  return useMemo(() => ({
    active: !!active && !!sessionRef, sessionRef, spawner: active ? spawner : null, host, unplaced,
    anchors: (rows) => (active ? proposalAnchors(rows, proposals) : EMPTY_MAP),
  }), [active, sessionRef, spawner, host, unplaced, proposals]);
}

// Lb: the session store host (Sc) and the spawner (mc) around what the card renders.
function ProposalProviders({ cards, children }) {
  return <ProposalHostProvider value={cards.host}>
    <ProposalSpawnerContext.Provider value={cards.spawner}>{children}</ProposalSpawnerContext.Provider>
  </ProposalHostProvider>;
}

/** The feed's turnSuggestions row (Ye === false: `flex flex-col gap-[var(--chat-item-gap)]`) after a turn's last row. */
export function ProposalTurnCard({ cards, row }) {
  if (!cards?.active || !row?.tools?.length) return null;
  return <div className="source-message flex flex-col gap-[var(--chat-item-gap)]" data-find-omitted="" data-proposal-group={row.id}>
    <ProposalProviders cards={cards}><TurnProposalGroup tools={row.tools} sessionRef={cards.sessionRef} /></ProposalProviders>
  </div>;
}

/** The feed's end: the unplacedSuggestions row (`contents`, z$) and Lb's "Sent to this session" announcement (nc). */
export function ProposalFeedEnd({ cards }) {
  if (!cards?.active) return null;
  return <ProposalProviders cards={cards}>
    {cards.unplaced ? <div className="contents" data-find-omitted="" data-proposal-group={cards.unplaced.id}>
      <UnplacedProposalGroup tasks={cards.unplaced.tasks} sessionRef={cards.sessionRef} />
    </div> : null}
    <SentHereNotice task={cards.spawner?.lastSentHere} />
  </ProposalProviders>;
}
