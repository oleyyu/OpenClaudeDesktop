import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createBtwPaneController, createBtwDraftStore, btwChildren, ownBtwItems } from './btw-pane-controller.mjs';
import { readParams as historyReadParams, loadThreadHistory, historyRoute, resumeParams } from './thread-history-model.mjs';
import { threadPermissionParams, turnPermissionParams, planImplementationTurn } from '../electron/permission-policy.mjs';
import { planHandoff } from './approval-card-model.mjs';
import { ownerThreadId } from './state.js';
import { sideChatStore } from './side-chat-store.mjs';
import { tileIds } from './tile-layout-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import { rpcResult } from './rpc-error.mjs';
import { createBtwQueueStore } from './btw-queue-store.mjs';
import { captureBtwFocus, rememberBtwFocus } from './generated/code-current/btw-focus-intent.mjs';

let storage; try { if (typeof window !== 'undefined') storage = window.localStorage; } catch {}
export const btwDrafts = createBtwDraftStore(storage);

// Each split side owns its controller; async work reads the current host at
// boundaries so a navigation cannot send into the newly selected main session.
export function useBtwPane(host) {
  const latest = useRef(host); latest.current = host;
  const [pending, setPending] = useState({}), [stopping, setStopping] = useState({});
  const sends = useRef(new Map()), stops = useRef(new Set()), resumed = useRef(new Map()), created = useRef(new Map());
  const reviewing = useRef(new Map());
  const permissions = useRef(new Map()), answered = useRef({});
  const [planAnswered, setPlanAnswered] = useState({}), [planBusy, setPlanBusy] = useState({});
  const epoch = () => {
    const h = latest.current;
    return `${h.stateRef.current.approvalConnectionId}:${h.stateRef.current.approvalConnectionEpoch}:${h.boot?.core?.id ?? ''}`;
  };
  const expected = () => ({ connectionId: latest.current.stateRef.current.approvalConnectionId, connectionEpoch: latest.current.stateRef.current.approvalConnectionEpoch });
  const assertEpoch = (value) => { if (epoch() !== value || !latest.current.boot?.connected) throw new Error(t('The core connection changed. Reopen the session before retrying.')); };
  const childPermission = (id, metadata, before) => {
    const key = `${before}:${id}`, confirmed = permissions.current.get(key);
    if (confirmed && confirmed.metadata !== metadata) permissions.current.delete(key);
    return confirmed && confirmed.metadata === metadata ? confirmed.permission : metadata?.btw?.permission;
  };
  const queues = useMemo(() => createBtwQueueStore({
    context: id => {
      const h = latest.current, state = h.stateRef.current, fresh = created.current.get(id);
      const metadata = h.metadata[id] ?? fresh?.sessionMetadata;
      const thread = h.sessionsRef.current.find(thread => thread.id === id) ?? state.threads[id] ?? fresh?.thread;
      return { epoch: epoch(), expected: expected(), call: h.call, connected: !!h.boot?.connected,
        supported: !!metadata?.btw && h.boot?.core?.capabilities?.reorderQueued === true,
        archived: !!thread?.archived, turnId: state.active[id], items: state.items[id] ?? [] };
    },
    restore: (id, text, prepend = false) => {
      if (!text.trim()) return;
      const draft = btwDrafts.get(id);
      btwDrafts.set(id, draft.trim() ? prepend ? `${text}\n${draft}` : `${draft}\n\n${text}` : text);
    },
    onError: message => latest.current.onError(message),
  }), []);
  const queueState = useSyncExternalStore(queues.subscribe, queues.getSnapshot, queues.getSnapshot);
  async function load(id) {
    const h = latest.current, before = epoch(), state = h.stateRef.current;
    const binding = expected(), childRpc = (method, params) => h.call('rpc', { method, params, expected: binding }).then(rpcResult);
    const known = state.threads[id] ?? h.sessionsRef.current.find(thread => thread.id === id);
    const response = await childRpc('thread/read', historyReadParams(id, known));
    const history = await loadThreadHistory(childRpc, { threadId: id, thread: response.thread, route: historyRoute(known) });
    assertEpoch(before);
    h.dispatch({ type: 'hydrate', id, thread: { ...response.thread, turns: history.turns }, baselineItems: state.items[id], baselineActiveVersion: state.activeVersions?.[id] });
    if (h.boot?.core?.capabilities?.reorderQueued === true)
      void queues.refresh(id).catch(error => { if (epoch() === before) latest.current.onError(error.message); });
  }
  async function send(id, text, options) {
    const h = latest.current, before = epoch(), fresh = created.current.get(id), metadata = h.metadata[id] ?? fresh?.sessionMetadata,
      thread = h.sessionsRef.current.find(thread => thread.id === id) ?? h.stateRef.current.threads[id] ?? fresh?.thread;
    const binding = expected(), childRpc = (method, params) => h.call('rpc', { method, params, expected: binding }).then(rpcResult);
    if (!text.trim()) return;
    if (sends.current.get(id) === before) throw new Error(t('Wait for the current task to finish or stop it'));
    if (!metadata?.btw || thread?.archived) throw new Error(t('Open an active session first.'));
    assertEpoch(before); sends.current.set(id, before); setPending(value => ({ ...value, [id]: true }));
    try {
      if (h.stateRef.current.active[id]) return await queues.send(id, text, options);
      const permission = options?.permission ?? childPermission(id, metadata, before), cwd = thread?.cwd;
      const access = { permission, mode: 'code', autoReview: h.boot?.core?.capabilities?.autoReview === true,
        networkAccess: h.boot?.config?.sandboxNetworkAccess === true };
      const resumeKey = `${before}:${id}`;
      if (!resumed.current.has(resumeKey)) {
        const result = await childRpc('thread/resume', resumeParams({ threadId: id, ...threadPermissionParams(access) }, thread));
        assertEpoch(before); resumed.current.set(resumeKey, result);
      }
      // No main-session model/permission/composer state is read here.
      const result = await childRpc('turn/start', { threadId: id,
        input: [{ type: 'text', text, text_elements: [] }], clientUserMessageId: crypto.randomUUID(),
        model: metadata.model || resumed.current.get(resumeKey)?.model || null,
        effort: metadata.effort ?? resumed.current.get(resumeKey)?.reasoningEffort ?? null,
        ...(metadata.serviceTier !== undefined ? { serviceTier: metadata.serviceTier } : {}), cwd,
        ...turnPermissionParams({ ...access, cwd, additionalFolders: metadata.additionalFolders ?? [] }),
        codeDesktop: { workflowTurn: { permission, mode: 'code', ultracode: false } } });
      // A confirmed accepted turn must stay accepted even if the UI has since
      // navigated/reconnected; do not restore it as an unsent draft.
      if (result?.turn?.id && options?.permission) permissions.current.set(`${before}:${id}`, { permission, metadata });
      return result;
    } finally { if (sends.current.get(id) === before) { sends.current.delete(id); setPending(value => ({ ...value, [id]: false })); } }
  }
  async function stop(id) {
    const h = latest.current, turnId = h.stateRef.current.active[id];
    if (!turnId || stops.current.has(id)) return;
    stops.current.add(id);
    setStopping(value => ({ ...value, [id]: true }));
    try { await h.call('interrupt', { threadId: id, turnId, expected: expected() }); }
    finally { stops.current.delete(id); setStopping(value => ({ ...value, [id]: false })); }
  }
  function rememberPlanAnswer(id, turnId, before) {
    if (before !== epoch()) return;
    answered.current = { ...answered.current, [id]: { epoch: before, turnId } };
    setPlanAnswered(answered.current);
  }
  function requirePlan(id, turnId) {
    const h = latest.current, before = epoch(), state = h.stateRef.current;
    const meta = h.metadata[id] ?? created.current.get(id)?.sessionMetadata;
    assertEpoch(before);
    const queue = queues.getSnapshot()[id];
    const proposal = planHandoff({ items: ownBtwItems(state.items[id], meta),
      permission: childPermission(id, meta, before),
      hints: h.boot?.core?.capabilities?.permissionHints === true, running: !!state.active[id],
      waiting: sends.current.get(id) === before || reviewing.current.get(id) === before || state.approvals.some(request => ownerThreadId(state, request.params?.threadId) === id)
        || (queue?.epoch === before && (queue.busy || queue.queue.entries.length > 0)),
      turnErrors: state.turnErrors?.[id], answered: new Set([meta?.btw?.planAnsweredTurnId,
        answered.current[id]?.epoch === before ? answered.current[id].turnId : null]) });
    if (!proposal || proposal.turnId !== turnId) throw new Error(t('Open an active session first.'));
    return before;
  }
  function finishReview(id, before) {
    if (reviewing.current.get(id) !== before) return;
    reviewing.current.delete(id); setPlanBusy(value => ({ ...value, [id]: false }));
  }
  async function stayPlan(id, turnId) {
    const before = requirePlan(id, turnId), binding = expected();
    reviewing.current.set(id, before); setPlanBusy(value => ({ ...value, [id]: true }));
    try {
      const result = await latest.current.call('btw-session', { op: 'plan-stay', sessionId: id, turnId, expected: binding });
      if (result?.status !== 'answered' || result.sessionId !== id || result.turnId !== turnId) throw new Error(t('Open an active session first.'));
      rememberPlanAnswer(id, turnId, before);
      return result;
    } finally { finishReview(id, before); }
  }
  async function implementPlan(id, turnId, target = 'acceptEdits') {
    if (!['ask', 'acceptEdits'].includes(target)) throw new Error(t('Unsupported plan review decision.'));
    const before = requirePlan(id, turnId);
    const next = planImplementationTurn(target);
    reviewing.current.set(id, before); setPlanBusy(value => ({ ...value, [id]: true }));
    try {
      const result = await send(id, next.text, { permission: next.permission });
      if (!result?.turn?.id) throw new Error(t('The message could not be sent to the running turn.'));
      rememberPlanAnswer(id, turnId, before);
      return result;
    } finally { finishReview(id, before); }
  }
  // R3-nested NBS-4, shared-11 pf (cccc2cf0a `i = wa()`): `i(n).then(() => { Za(a, { lineageDetached: !0 }); … },
  // (n) => { …; r?.(); e("Couldn’t detach the session. Try again.") })`. Host: main.cjs btw-session op 'detach'
  // (btw-sessions.cjs detach) saves lineageDetached and announces the sidebar metadata snapshot, which every window,
  // this one included, applies; a refusal or failure calls `failed` and shows the original copy (frOpVXffev).
  async function detach(id, failed) {
    const h = latest.current;
    try {
      const result = await h.call('btw-session', { op: 'detach', sessionId: id, expected: expected() });
      if (result?.status === 'disabled') throw new Error(result.reason);
      return result;
    } catch {
      failed?.();
      latest.current.onError(t('Couldn’t detach the session. Try again.'));
      return null;
    }
  }
  function select(parentId, id, { focus = true } = {}) {
    if (focus) rememberBtwFocus(id, captureBtwFocus(globalThis.document));
    latest.current.tileStore.setSession(parentId, { btwSessionId: id });
  }
  const controller = useMemo(() => createBtwPaneController({
    epoch,
    captureFocus: () => captureBtwFocus(globalThis.document),
    start: async ({ question, ...payload }) => {
      const h = latest.current;
      return h.call('btw-session', { op: 'start', ...payload, titleWords: question, expected: expected() });
    },
    close: id => latest.current.call('btw-session', { op: 'close', sessionId: id, expected: expected() }),
    send: (id, text) => send(id, text),
    currentView: parentId => {
      const entry = latest.current.tileStore.getSession(parentId);
      return entry?.tileLayout && tileIds(entry.tileLayout).has('session') ? entry.btwSessionId : null;
    },
    listChildren: parentId => btwChildren(latest.current.sessionsRef.current, latest.current.metadata, parentId),
    isParentVisible: id => latest.current.currentRef.current === id,
    isOpenElsewhere: id => latest.current.openElsewhere?.(id) === true,
    show: (parentId, id, { askedAt }) => {
      rememberBtwFocus(id, askedAt);
      const h = latest.current; h.tileStore.setSession(parentId, { btwSessionId: id }); h.openPane('session', parentId);
    },
    hide: parentId => latest.current.hidePane('session', parentId),
    registered: result => { created.current.set(result.sessionId, result); latest.current.registered(result); },
    restoreDraft: (id, value, error) => { btwDrafts.restore(id, value); if (error) latest.current.onError(error.message); },
    fallback: ({ parentId, question, context }) => {
      const h = latest.current;
      if (context !== null) sideChatStore.stageContext(parentId, context);
      if (h.currentRef.current === parentId) h.fallback({ open: true, pending: question || null, legacy: true });
    },
  }), []);
  const queueEpoch = epoch();
  const busy = { ...pending };
  for (const [id, value] of Object.entries(queueState)) if (value.epoch === queueEpoch && value.busy) busy[id] = true;
  // Native Plan turns finish before the decision card is answered. Keep that
  // card's tab protected like the official suspended review, without calling
  // the composer "sending" (which would hide the review itself).
  const tabPending = { ...busy };
  for (const [id, meta] of Object.entries(host.metadata)) {
    const state = host.stateRef.current;
    const handoff = planHandoff({ items: ownBtwItems(state.items[id], meta), permission: meta?.btw?.permission,
      hints: host.boot?.core?.capabilities?.permissionHints === true, running: !!state.active[id],
      turnErrors: state.turnErrors?.[id], answered: new Set([meta?.btw?.planAnsweredTurnId,
        planAnswered[id]?.epoch === queueEpoch ? planAnswered[id].turnId : null]) });
    if (handoff || reviewing.current.get(id) === queueEpoch) tabPending[id] = true;
  }
  return { controller, load, send, stop, select, detach, implementPlan, stayPlan, planAnswered, planBusy,
    pending: busy, tabPending, stopping, queues, queueState, queueEpoch,
    queueEnabled: host.boot?.core?.capabilities?.reorderQueued === true };
}
