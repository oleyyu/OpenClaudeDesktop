// R4i-cowork CW3 (research-ext/X2-cowork-session-actions.md CW-4 + CW-6): the Cowork session's "Restart conversation
// from here" and the error card's "Go back", ported from 2.42304.0 CoworkSessionView (ion-dist v1 c21f11e6d-Bd0v2A97.js
// `mk`) with the host's calls injected. The decisions, toasts and refusal texts are the CW1 generated originals
// (src/generated/cowork-session-actions via source-cowork-session-actions-adapters.jsx); the bridge is CW2's
// coworkRewindBridge (IPC cowork-rewind → the Cowork runtime's rewindSessionV2 port).
//
// Official (local session, k = isRemoteSession false on this host, D17):
//   po (rewind + resend): `if(!Lt)return{kind:"error",…"rewind unavailable"}` … `let{prefill:e,refusal:n}=await Tf(et,G,t.uuid);
//      if(!e)return{kind:"empty",refusal:n}` → `pO(Zt,t.uuid),q?.(t.uuid),Tc.getState().resend(G)` (drop the rewound
//      rows from view) → `Qe(…, d = editedText===void 0 ? Pr(r) : …, model, …, {isResend:!0})` → `{kind:"sent"}`;
//      `catch(e){return e instanceof _o?{kind:"timeout"}:e instanceof is?{kind:"rejected",error:e}:{kind:"error",error:e}}`.
//   mo (restart / refusal retry): `if(!Lt||co.current)return;` `if(uo.current&&(!k||!n)){Ri(cO("turn running",f),…);return}`
//      `await Ii(e=>{co.current=e},async()=>{let n=await po(e,{modelOverride:t}); … let i=dO(n,{isRemoteSession:k,
//      surface:t?"refusal_retry":"restart"},f);i&&Ri(i.message,i.options),n.kind==="empty"&&!k&&!t&&Me()})`.
//   so (the session error banner's onSessionRewind, "Go back"): `let e=xf(Ae)?.uuid;if(!e||!Vf(et))return null;
//      try{let{prefill:t}=await Tf(et,G,e);return t?(pO(Zt,e),q?.(e),Tc.getState().resend(G),…,wt?Gc(t):Mr(t)):(Me(),null)}
//      catch{return null}` — wt is GrowthBook claudeai_linden_transom (host off, D29/D31), so the prefill is Mr = shared-52
//      vz; the banner (cb55fb7c6 N `Se`) then puts it in the composer and focuses it.
//   Pr / Mr = shared-52-DGviI8xb.js `pz` / `vz` (exports Wt / Ut), ported verbatim below (the CW1 generator does not emit
//   them; tests/cowork-session-actions.test.mjs runs the originals from the chunk against these ports).
//
// Host adapters (hostDifferences in the CW3 report):
//   Me (sessionCtx.retry)   → `retry()`: main.jsx's existing Try again path, retryFailedTurn(lastTurnId, {thread:true})
//                             (retry-failed-turn-model.mjs retryFailedTurnFlow), the only session retry the host has.
//   pO/q/resend             → `afterRewind(uuid)`: re-read the Cowork thread (thread/read) and hydrate it, since the
//                             runtime already cut the rewound turns (CW2).
//   Qe(…, {isResend:!0})    → `send(text, {model})`: coworkSessionHost below, main.jsx sendMessage(text, [], [], {resend:
//                             true}) — text only, the composer untouched (Cowork takes no images; the original's image
//                             parts and staged attachments have no host source). The model override is not carried.
//   uo.current (turn live)  → `isRunning()`; co.current (one at a time) → a per-session latch kept here.
//   _o timeout / is reject  → never thrown on the host (remote / bridge confirm only), so every failure is `error`.
//   telemetry (we(...))     → none.
import {
  coworkCanRewind, coworkRewind, coworkRewindToast, coworkActionsIntl, coworkFailureMessage,
} from './source-cowork-session-actions-adapters.jsx';
import { remoteRewindRejectionMessage } from './generated/cowork-session-actions/rewind-messages.mjs';

// ---------------------------------------------------------------- shared-52 pz / vz (Pr / Mr in c21f11e6d)

/** shared-52 `pz` (Wt, `Pr` in c21f11e6d): drop host context tags from a message before it is sent again. */
export function stripHostContext(e) {
  if (typeof e != "string" || !e.includes("<")) return e;
  let t = e.replace(/<cu_window_hints>[\s\S]*?<\/cu_window_hints>\s*/g, "").replace(/<widget_context_hint>[\s\S]*?<\/widget_context_hint>\s*/g, "").replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, "");
  return t === e ? e : t.trimEnd();
}
const withoutSyncSources = (e) => e.replace(/<sync_sources>[\s\S]*?<\/sync_sources>\s*/g, "");
const withoutUploadedFiles = (e) => e.replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "");
const withoutLeadingContext = (e) => e.replace(/^(?:<(preview-annotation-context|launch-selected-element)>[\s\S]*?<\/\1>\s*)+/, "");
/** shared-52 `vz` (Ut, `Mr` in c21f11e6d): the text the composer gets back from a rewind's prefill. */
export function composerPrefillText(e) {
  return typeof e != "string" || !e.includes("<") ? e : withoutLeadingContext(stripHostContext(withoutUploadedFiles(withoutSyncSources(e))));
}

// ---------------------------------------------------------------- ccba96ec3 $t (_m in c21f11e6d)

// R4i-cowork CW4 (X2 CW-5): po's edited branch `d = editedText===void 0 ? Pr(r) : s===void 0 ? _m(r, editedText) : editedText`.
// `s = o ? lr(o) : void 0` is shared-26 `by` (a seeded summon's kind); the host has no seeded summons, so an edit always
// takes `_m` = ccba96ec3-BTgJdU9P.js `$t` (export i): the edited text keeps the prefill's leading element/annotation
// context, its <sync_sources> and its <uploaded_files>, in that order, ahead of it. `D` there is shared-52 Wt = pz.
const UPLOADED_FILES = /<uploaded_files>[\s\S]*?<\/uploaded_files>/, SYNC_SOURCES = /<sync_sources>[\s\S]*?<\/sync_sources>/,
  LEADING_CONTEXT = /^(?:<(preview-annotation-context|launch-selected-element)>[\s\S]*?<\/\1>\s*)+/;
/** ccba96ec3 `$t` (`_m` in c21f11e6d): the text an edit sends, from the rewind's prefill and the edited text. */
export function mergeEditedText(e, t) {
  let n = stripHostContext(e), r = n.match(UPLOADED_FILES)?.[0], i = n.match(SYNC_SOURCES)?.[0];
  return [n.match(LEADING_CONTEXT)?.[0].trimEnd(), i, r, t].filter(Boolean).join(`

`);
}

// ---------------------------------------------------------------- co.current / Ii

const latches = new Map();
/** mk's `co = _(!1)` for one session (the view is per session; the host keeps one latch per Cowork session id). */
export function coworkRewindLatch(sessionId) {
  let latch = latches.get(sessionId);
  if (!latch) latches.set(sessionId, latch = { current: false });
  return latch;
}

const editRefs = new Map();
/** mk's `lo = _(null)` (the edit in flight, {uuid, text}) and `li = _(null)` (the refusal edit context) for one session. */
export function coworkEditRefs(sessionId) {
  let refs = editRefs.get(sessionId);
  if (!refs) editRefs.set(sessionId, refs = { inFlight: { current: null }, refusalEdit: { current: null } });
  return refs;
}

/** c21f11e6d `Ii(set, run)`: hold the latch while run settles. */
async function holding(set, run) {
  set(true);
  try { return await run(); } finally { set(false); }
}

/** cb1e253a0 `yf` (xf in c21f11e6d) over the host transcript: the last human message, {uuid, text}. */
export function lastHumanMessage(items = []) {
  const item = Array.isArray(items) ? items.findLast((row) => row?.type === 'userMessage' && typeof row.id === 'string') : undefined;
  if (!item) return undefined;
  const text = Array.isArray(item.content) ? item.content.filter((part) => part?.type === 'text').map((part) => part.text ?? '').join('') : String(item.text ?? '');
  return { uuid: item.id, text };
}

/**
 * The Cowork session actions of one session view.
 * @param {object} host
 * @param {string} host.sessionId the Cowork session (cw-…)
 * @param {object|null} host.bridge coworkRewindBridge(call, {coworkEnabled}) (rewindV2 → IPC cowork-rewind)
 * @param {{canRewindToMessage: boolean, canEditOrRestart: boolean, canSessionRewind: boolean}} host.capabilities
 *   coworkRewindCapabilities (mk Lt / Bt / Vt)
 * @param {() => boolean} host.isRunning uo.current: the session has a live turn
 * @param {(uuid: string) => Promise<void>|void} host.afterRewind pO / q / resend: show the rewound transcript
 * @param {(text: string, options: {model?: string}) => Promise<void>|void} host.send Qe(…, {isResend:!0})
 * @param {() => any} host.retry Me (sessionCtx.retry)
 * @param {(message: string, options: object) => void} host.toast Ri (addError)
 * @param {() => Array} host.readItems Ae: the session's transcript rows
 * @param {{current: boolean}} [host.latch] co
 */
export function coworkSessionActions({ sessionId, bridge = null, capabilities, isRunning = () => false, afterRewind = () => {}, send, retry = () => {},
  toast = () => {}, readItems = () => [], latch = coworkRewindLatch(sessionId), editRefs: refs = coworkEditRefs(sessionId),
  openEditor = () => {} } = {}) {
  const Lt = !!capabilities?.canRewindToMessage;

  // po (local branch).
  async function rewindAndResend(target, { editedText, modelOverride } = {}) {
    if (!Lt) return { kind: 'error', error: new Error('rewind unavailable') };
    try {
      const { prefill, refusal } = await coworkRewind(bridge, sessionId, target.uuid);
      if (!prefill) return { kind: 'empty', refusal };
      await afterRewind(target.uuid);
      // `d = n.editedText===void 0 ? Pr(r) : s===void 0 ? _m(r, n.editedText) : n.editedText` (s: never on the host).
      const text = editedText === undefined ? stripHostContext(prefill) : mergeEditedText(prefill, editedText);
      await send(text, modelOverride === undefined ? {} : { model: modelOverride });
      return { kind: 'sent' };
    } catch (error) {
      return { kind: 'error', error };
    }
  }

  // mo: Restart conversation from here (and, with a modelOverride, the refusal retry of CW-7).
  async function restartFromHere(target, modelOverride) {
    if (!Lt || latch.current || !target?.uuid) return;
    if (isRunning()) {
      toast(remoteRewindRejectionMessage('turn running', coworkActionsIntl), { messageForLogging: 'CoworkSessionView remote rewind while running' });
      return;
    }
    await holding((value) => { latch.current = value; }, async () => {
      const outcome = await rewindAndResend(target, { modelOverride });
      const shown = coworkRewindToast(outcome, modelOverride ? 'refusal_retry' : 'restart');
      if (shown) toast(shown.message, shown.options);
      if (outcome.kind === 'empty' && !modelOverride) retry();
    });
  }

  // ho: the edited last human message (R4i-cowork CW4, X2 CW-5). `let n=lo.current;if(n?.uuid===e.uuid&&n.text===t)return;
  // let r=li.current?.messageUuid===e.uuid?li.current:null;if(li.current=null,!Lt||co.current){Ri(uO("edit",f),
  // {messageForLogging:"CoworkSessionView edit rewind unavailable or in flight"});return}await Ii(n=>{co.current=n,
  // lo.current=n?{uuid:e.uuid,text:t}:null},async()=>{let n=await po(e,{editedText:t,modelOverride:r?.originalModel});
  // if(n.kind==="sent"){…telemetry…;return}let i=dO(n,{isRemoteSession:k,surface:"edit"},f);i&&Ri(i.message,i.options)})`.
  async function editMessage(target, text) {
    const inFlight = refs.inFlight.current;
    if (inFlight?.uuid === target?.uuid && inFlight.text === text) return;
    const refusal = refs.refusalEdit.current?.messageUuid === target?.uuid ? refs.refusalEdit.current : null;
    refs.refusalEdit.current = null;
    if (!Lt || latch.current || !target?.uuid) {
      toast(coworkFailureMessage('edit'), { messageForLogging: 'CoworkSessionView edit rewind unavailable or in flight' });
      return;
    }
    await holding((value) => { latch.current = value; refs.inFlight.current = value ? { uuid: target.uuid, text } : null; }, async () => {
      const outcome = await rewindAndResend(target, { editedText: text, modelOverride: refusal?.originalModel });
      if (outcome.kind === 'sent') return;
      const shown = coworkRewindToast(outcome, 'edit');
      if (shown) toast(shown.message, shown.options);
    });
  }

  // ui (CW-7's Edit and retry): `li.current={messageUuid:t.uuid,originalModel:n,source:r},Ve(n),fl.getState().requestEdit(e,
  // t.uuid,{entryPoint:r==="hard_block"?"safety_warning":"model_fallback_banner"})` — Ve (the composer's model) has no
  // host twin; the editor opens with the model as its override instead (VY's requestedModelOverride).
  function beginRefusalEdit(target, model, source = 'hard_block') {
    if (!target?.uuid) return;
    refs.refusalEdit.current = { messageUuid: target.uuid, originalModel: model, source };
    openEditor(target.uuid, { entryPoint: source === 'hard_block' ? 'safety_warning' : 'model_fallback_banner', modelOverride: model });
  }

  // mk's retryRequest effect (`dk({request:go,canRewindToMessage:Bt,findLastHumanBubble:si})` → `go.kind==="edit"?
  // ui(e,go.modelOverride,"hard_block"):mo(e,go.modelOverride)`), for zk's retry / editRetry.
  function refusalRetry(request) {
    if (!capabilities?.canEditOrRestart) return;
    const target = lastHumanMessage(readItems());
    if (!target) return;
    if (request?.kind === 'edit') beginRefusalEdit(target, request.modelOverride, 'hard_block');
    else void restartFromHere(target, request?.modelOverride);
  }

  // so: the error card's Go back. Resolves to the composer text, or null.
  async function goBack() {
    const uuid = lastHumanMessage(readItems())?.uuid;
    if (!uuid || !coworkCanRewind(bridge)) return null;
    try {
      const { prefill } = await coworkRewind(bridge, sessionId, uuid);
      if (!prefill) { retry(); return null; }
      await afterRewind(uuid);
      return composerPrefillText(prefill);
    } catch {
      return null;
    }
  }

  return {
    /** onRewindToMessage: `Bt&&!a&&($n||!k)?mo:void 0` */
    onRestartFromHere: capabilities?.canEditOrRestart ? restartFromHere : null,
    /** onSessionRewind: `Vt&&!a?so:void 0` */
    onSessionRewind: capabilities?.canSessionRewind ? goBack : null,
    /** editMessage: `Bt&&!a&&($n||!k)?ho:void 0` */
    onEditMessage: capabilities?.canEditOrRestart ? editMessage : null,
    /** zk's retry / editRetry through mk's retryRequest effect (CW-7; no card renders them yet). */
    onRefusalRetry: capabilities?.canEditOrRestart ? refusalRetry : null,
    rewindAndResend,
  };
}

// ---------------------------------------------------------------- the session view's host side (main.jsx)
// R4i-cowork review fix: mk's Qe(…, {isResend:!0}) sends Pr(prefill) itself and nothing of the composer. The host's
// sendMessage builds a normal send from the composer state (Quote pills, selected elements, @ mentions) and empties it,
// so a resend goes through its `resend` path instead: text-only input, the composer's draft, attachments and mentions
// untouched. sendMessage resolves to {started, pending} at its end (undefined on an early return: a turn running,
// loading, sending, a misaligned chat). Not started means the rewind already cut the turns but nothing went out: the
// outcome is `error` (so dO's restart / edit toast shows), and with no "Not delivered" bubble kept (`pending`) the
// message comes back to the composer (vz text, after what is typed there, as the failed bubble's Discard does) when the
// session is still the open one.
/**
 * The host calls coworkSessionActions takes, from main.jsx's session view.
 * @param {object} host
 * @param {string} host.sessionId
 * @param {(text: string, attachments: [], mentions: [], options: {resend: true}) => Promise<{started: boolean, pending: boolean}|undefined>} host.sendMessage
 * @param {(sessionId: string) => Promise<void>|void} host.refresh re-read and hydrate the rewound thread
 * @param {() => Array} host.readItems
 * @param {() => boolean} host.isRunning
 * @param {(turnId: string) => any} host.retryTurn the host Try again of a turn (Me)
 * @param {(message: string) => void} host.toast
 * @param {(value: string|((text: string) => string)) => void} host.setDraft
 * @param {() => boolean} host.isCurrent the session is still the open one
 * @param {() => void} host.focusComposer
 */
export function coworkSessionHost({ sessionId, sendMessage, refresh = () => {}, readItems = () => [], isRunning = () => false,
  retryTurn = () => {}, toast = () => {}, setDraft = () => {}, isCurrent = () => true, focusComposer = () => {} } = {}) {
  const restore = (text) => {
    if (!text || !isCurrent()) return;
    setDraft((value) => (value.trim() ? `${value}\n\n${text}` : text));
    focusComposer();
  };
  return {
    sessionId, readItems, isRunning,
    afterRewind: () => refresh(sessionId),
    async send(text) {
      const result = await sendMessage(text, [], [], { resend: true });
      if (result?.started) return;
      if (!result?.pending) restore(composerPrefillText(text));
      throw new Error('The Cowork message was not sent again.');
    },
    retry: () => {
      const lastTurnId = readItems().findLast((row) => row?.type === 'userMessage' && row.turnId)?.turnId;
      if (lastTurnId) void retryTurn(lastTurnId);
    },
    toast: (message) => toast(message),
    /** the error card's onPrefill (cb55fb7c6 N Se: U(e) then focus): the Go back text replaces the draft. */
    prefill: (text) => { if (!isCurrent()) return; setDraft(text); focusComposer(); },
  };
}

// ---------------------------------------------------------------- CW-7: the refusal fallback (shared-7 zk / a_, shared-52 _B)
// R4i-cowork CW4 (X2 CW-7). The data the official Cowork "Paused" card (shared-7 aS, mounted by the shared-9 composer as
// its stand-in with `onRetryWithFallback:_i.retry`, `onEditAndRetry:_i.editRetry`) is built from. The card itself is not
// migrated (its body copy, e.g. id "1p5h2he" and the tS bodies, resolves from a runtime message catalog that is not in
// the 2.42304.0 bundle), so nothing renders these yet; the session runtime keeps stop_reason / stop_details for them.

/** shared-0 `yv` (`_t` in shared-7): a model id without its `[…]` suffix and date stamp. */
export function baseModelId(e) { return e.replace(/\[[^\]]+\]$/, "").replace(/-20\d{6}$/, ""); }
/** shared-182 `SR` (`Np` in shared-7): drop the `[1m]` context suffix. */
export function withoutContextSuffix(e) { return e.endsWith("[1m]") ? e.slice(0, -4) : e; }

/** shared-7 `i_`: the static cyber fallback when GrowthBook holdup.cyberModelFallbacks has no entry. */
export const DEFAULT_CYBER_FALLBACK = Object.freeze({ fallbackModelName: "claude-sonnet-4-6", displayName: "Sonnet 4.6" });

/**
 * shared-7 `a_`. GrowthBook `holdup` modelFallbacks / cyberModelFallbacks are `r_ = {}` on the host (D29/D31), so only
 * an API retry_suggestion or, for a cyber refusal, the static `i_` can answer.
 */
export function refusalFallbackModel({ stopReason, stopDetails, model, allowConfigFallbacks = false, nameFor = (id) => id,
  modelFallbacks = {}, cyberModelFallbacks = {} } = {}) {
  if (!model || !stopReason) return;
  const suggestion = stopDetails?.retry_suggestion;
  if (suggestion?.model && baseModelId(suggestion.model) !== baseModelId(model))
    return { fallbackModelName: suggestion.model, displayName: nameFor(suggestion.model).replace(/^Claude /, "") };
  if (!allowConfigFallbacks) return;
  if (stopDetails?.category === "cyber") return cyberModelFallbacks[model] ?? DEFAULT_CYBER_FALLBACK;
  const fallback = modelFallbacks[model];
  if (fallback && stopReason === "refusal") return fallback;
}

/**
 * shared-52 `_B` (`Ti` in shared-7) over the host transcript rows: walking back from the end, a user record ends the
 * search (a userMessage, or a finished tool call — its tool_result was a later user record); otherwise the last row comes
 * from the last assistant record, a refusal when the runtime stamped `codeDesktop.stopReason` (session-service.mjs).
 */
export function lastRefusal(items = []) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const row = items[index];
    if (!row || typeof row !== "object") continue;
    if (row.type === "userMessage") return null;
    if (row.type === "dynamicToolCall" && row.status !== "inProgress") return null;
    if (row.type !== "agentMessage" && row.type !== "reasoning" && row.type !== "dynamicToolCall") continue;
    if (row.codeDesktop?.stopReason !== "refusal") return null;
    const details = row.codeDesktop.stopDetails;
    return { stopDetails: details?.type === "refusal" ? { category: details.category ?? null, explanation: details.explanation ?? null } : null,
      messageUuid: undefined, apiMessageId: typeof row.id === "string" ? row.id.split(":")[0] : undefined };
  }
  return null;
}

/**
 * shared-7 `zk` for a local Cowork session. Host values: no remote session (`a` false, D17); GrowthBook models table
 * `__gb__3790179635` empty (`v = Ik = []`, so `y` false and config fallbacks are allowed); no double-block record (`Bo`)
 * and no new-session-with-prompt route (`Rk` → null); `o`'s `Wt.rewind && Wt.setModel` is the host's rewind bridge
 * plus per-turn model choice (`canRewind`). `requestRetry(modelOverride, kind)` stands in for Nk.requestRetry.
 */
export function coworkRefusalState({ sessionId, items, model, scheduledTaskId = null, canRewind = false, hasModel = () => false,
  isNonSelectable = () => false, nameFor = (id) => id, requestRetry = () => {} } = {}) {
  const o = !!sessionId && !scheduledTaskId && !!canRewind, l = o;
  const d = model || undefined, f = d && withoutContextSuffix(d), m = d;
  const h = lastRefusal(items);
  const _ = h?.stopDetails ? { type: "refusal", category: h.stopDetails.category, explanation: h.stopDetails.explanation } : null;
  const y = false;
  const b = refusalFallbackModel({ stopReason: h ? "refusal" : undefined, stopDetails: _, model: f, allowConfigFallbacks: !y, nameFor });
  const E = !!b && hasModel(b.fallbackModelName) && !isNonSelectable(b.fallbackModelName);
  if (!sessionId || !h || !f || (!E && !y)) return null;
  const D = E ? b : undefined, O = D?.fallbackModelName;
  return { model: f, fallback: D, stopDetails: _,
    retry: O && l ? () => requestRetry(O, "rewind") : undefined,
    refusedMessage: h.messageUuid ? { uuid: h.messageUuid, apiMessageId: h.apiMessageId } : undefined,
    editRetry: l && m ? () => requestRetry(m, "edit") : undefined,
    editRetryModel: l ? m : undefined, doubleBlock: undefined, originalModelId: d ?? f, startNewSession: undefined };
}
