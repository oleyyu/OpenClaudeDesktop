// Session row menus: the multi-selection items (Claude Desktop 2.31226.0 c39a247c4 ve, readable 66-300; ce4f4374c Me /
// Ne, readable 1098-1340) and the single row's Move to group submenu (shared-21 lz / cz, readable 11042-11128).
// R3-sidebar2 (sidebar-15): plus the 2.42304.0 bulk archive / delete flow pieces at the end of this file.
import { bulkNestedFamilies } from "./generated/code-current/sidebar-bulk-family.mjs";
import { bulkDeleteCopy } from "./generated/code-current/sidebar-bulk-delete-copy.mjs";

/** k / d(): the 1-9 digit of a numbered submenu row (none from the tenth on). */
export const digitFor = (index) => (index < 9 ? String(index + 1) : undefined);

/** X(e, starred, pin): the selected sessions a Pin {count} (pin true) or Unpin {count} (pin false) would change. */
export function pinTargets(sessions = [], metadata = {}, pin = true) {
  return sessions.filter((session) => session?.id && session.canPin !== false && (metadata[session.id]?.pinned === true) !== pin);
}

/** _e: the open session goes last, so a bulk change reaches the session on screen after the others. */
export function openSessionLast(sessions = [], currentId = null) {
  if (!currentId) return [...sessions];
  return [...sessions.filter((session) => session.id !== currentId), ...sessions.filter((session) => session.id === currentId)];
}

/** ve(): the multi payload Me renders. pin / unpin exist only when some selected session would change. */
export function multiMenuState(sessions = [], metadata = {}) {
  const count = sessions.length;
  const pin = pinTargets(sessions, metadata, true).length, unpin = pinTargets(sessions, metadata, false).length;
  return { count, pin: pin > 0 ? { count: pin } : undefined, unpin: unpin > 0 ? { count: unpin } : undefined };
}

/** Me hotkeys: p pins (else unpins), u marks unread, a archives (or unarchives), d deletes. */
export function multiHotkeys(state, { allArchived = false } = {}) {
  const keys = [];
  if (state.pin) keys.push(["p", "pin"]);
  else if (state.unpin) keys.push(["p", "unpin"]);
  keys.push(["u", "mark-unread"], ["a", allArchived ? "unarchive" : "archive"], ["d", "delete"]);
  return keys;
}

/**
 * lz: the Move to group submenu of one session. Every custom group is a radio row (checked when the session is in
 * it); 'Ungrouped' (cz: always "Ungrouped" for code custom groups, never checked) follows a separator while the session
 * is assigned (u = currentGroupId !== undefined); 'New group…' closes it. With hotkeys every row is numbered 1-9 in
 * that order. Returns the rows ({ kind: "group" | "ungrouped" | "create" | "separator" }).
 */
export function moveToGroupRows({ customGroups = [], currentGroupId, canCreate = true, numbered = true } = {}) {
  const showUngrouped = currentGroupId !== undefined && currentGroupId !== null;
  const rows = [], digit = (index) => (numbered ? digitFor(index) : undefined);
  customGroups.forEach((group, index) => rows.push({ kind: "group", id: group.id, name: group.name, checked: currentGroupId === group.id, digit: digit(index) }));
  if (customGroups.length > 0 && showUngrouped) rows.push({ kind: "separator" });
  if (showUngrouped) rows.push({ kind: "ungrouped", id: null, checked: false, digit: digit(customGroups.length) });
  if (canCreate) {
    if (customGroups.length > 0 && !showUngrouped) rows.push({ kind: "separator" });
    rows.push({ kind: "create", digit: digit(customGroups.length + (showUngrouped ? 1 : 0)) });
  }
  return rows;
}

// ---------------------------------------------------------------- R3-sidebar2 (sidebar-15): the 2.42304.0 bulk flow
// shared-19 YX runs a group's or a selection's Archive / Delete: the bulk delete confirmation (VY with `bulk`), then IX
// splits the targets into the plain bulk part and the families whose nested sessions must be asked about first, the
// plain part runs 8 at a time and the asked families one by one (LX). IX and LY are generated
// (generated/code-current/sidebar-bulk-*.mjs); what IX asks, c39a247c4 nestedSessionsToAsk, comes from the nested
// sessions flow (c48ea26ad q), which answers null for every session while the desktop has no detachFromParent: then
// nothing is asked and every target stays in the bulk part. R4i-sidebar SI2 correction: the host now has the detach
// bridge (R3-nested NBS-4, btw-detach-host.mjs detachFromParentAvailable), so officially q would ask for a session with
// /btw children; what is still missing is the nested sessions question itself (c48ea26ad J / R / de / pe, shared-20
// mA / hA / yA and ca674e66a NestedSessionsConfirmBody), which is also what `run` must be. Until that flow lands no
// provider is connected and the bulk part is the whole list — a known gap, not the official no-bridge case.

let nestedFamilies = null;
/**
 * The nested sessions flow, when the host has one: `nestedSessionsToAsk(sessionId, action)` → {nested: id[], canStay:
 * id[]} | null (c39a247c4: c48ea26ad q over the session's family) and `run(action, session)` → Promise (the single
 * session's archive / delete with its nested question; rejects when it was called off or failed). Returns the disconnect.
 */
export function connectNestedFamilies(provider) {
  nestedFamilies = provider;
  return () => { if (nestedFamilies === provider) nestedFamilies = null; };
}
export const nestedFamilyProvider = () => nestedFamilies;

/** The record IX reads for a sidebar session (YX passes its rows: {ref, codeRef}). Local sessions only. */
const familyRecord = (session) => (session?.id ? { ref: { kind: "code", id: session.id }, codeRef: { type: "local", id: session.id } } : undefined);

/** IX: {bulk: sessions, asking: [{t: session, ref, codeRef, nested, canStay}]} for `action` over `sessions`. */
export function bulkFamilyPlan(action, sessions = [], provider = nestedFamilies) {
  if (typeof provider?.nestedSessionsToAsk !== "function") return { bulk: [...sessions], asking: [] };
  const actions = { nestedSessionsToAsk: (codeRef, kind) => provider.nestedSessionsToAsk(codeRef.id, kind) ?? null };
  return bulkNestedFamilies(actions, action, sessions, familyRecord);
}

/**
 * LX (shared-19): the asked families one at a time, in IX order (a family nested in more of the asked ones first). A
 * family is skipped when its session is gone (or, archiving, already archived); it is held back, and so is every family
 * nesting it, when it is the open session or nests one held back or failed. `run(session)` archives / deletes one
 * (rejects, or answers false, when called off or failed). Returns how many went through.
 */
export async function runAskingFamilies(asking = [], action, { run, currentId = null, present = () => true, archived = () => false } = {}) {
  let done = 0;
  const held = new Set();
  for (const { t: session, codeRef, nested = [] } of asking) {
    if (!present(codeRef.id) || (action === "archive" && archived(codeRef.id))) continue;
    if (currentId === codeRef.id || nested.some((id) => held.has(id))) { held.add(codeRef.id); continue; }
    // c39a247c4 g.archive / g.delete reject "called off or failed" when the action answers false; the local
    // sessionAction answers false instead (R4i-sidebar SI2), which holds the family back the same way.
    try { if (await run(session) === false) held.add(codeRef.id); else done += 1; } catch { held.add(codeRef.id); }
  }
  return done;
}

// shared-19 KY (VY's dialog): the session-delete fallbacks when LY leaves the title or the description to it.
export const BULK_DELETE_FALLBACK = Object.freeze({
  title: { defaultMessage: "Delete {count, plural, one {session} other {# sessions}}?", id: "kT5Jg7Fz/u" },
  description: { defaultMessage: "{count, plural, one {This session} other {These # sessions}} will be permanently deleted. This can’t be undone.", id: "4RK/3dvxuB" },
});

/**
 * VY with `bulk` (shared-19 KY over LY): the bulk delete confirmation. `archivedCount` of the `count` sessions are
 * archived; `groupName` names the group a Delete all came from; `unloadedRemain` / `someRanElsewhere` (sessions not yet
 * loaded, SSH / WSL ones) never hold locally. Cancel takes the initial focus (`initialFocus: V ? "cancel" : "confirm"`).
 */
export function bulkDeleteConfirmCopy(intl, { count, archivedCount = 0, groupName, unloadedRemain = false, someRanElsewhere = false }) {
  const copy = bulkDeleteCopy(intl, count, { groupName, archivedCount, unloadedRemain, someRanElsewhere });
  return {
    title: copy.title ?? intl.formatMessage(BULK_DELETE_FALLBACK.title, { count }),
    body: copy.description ?? intl.formatMessage(BULK_DELETE_FALLBACK.description, { count }),
    confirmLabel: copy.confirmLabel, danger: true, initialFocus: "cancel",
  };
}

/**
 * yY: the queued confirm a family delete asks when it could not check some members' worktrees (c48ea26ad de, after the
 * nested sessions question): "Delete {count} sessions?" over the titles it could not check. It always records when it
 * opened, so a press counts only 500 ms later (EY S: max(d.current, openedAt)).
 */
export function couldntCheckConfirm(titles = [], count = titles.length, now = Date.now()) {
  return { state: "unknown", action: "delete", sessions: { titles: [...titles], count }, openedAt: now };
}

// ---------------------------------------------------------------- R4i-sidebar SI2 (Y1-R3-sidebar2-3/-4/-7)
// shared-19 uY / dY: a worktree confirm the user cancelled. Officially the disposal rejects with it
// (`uY=class extends Error{constructor(){super("Worktree disposal cancelled by user"),this.name="WorktreeDisposalCancelled"}}`,
// `function dY(e){return e instanceof uY}`), and YX counts such a session neither done nor failed. Host stand-in: the
// local sessionAction answers `false` for a called-off archive / delete instead of rejecting (so the single-row paths
// need no extra filter, as c6b8adeaf's onError `!De(e)` filters it there); the class covers a provider's `run` that
// rejects with it.
export class WorktreeDisposalCancelled extends Error {
  constructor() { super("Worktree disposal cancelled by user"); this.name = "WorktreeDisposalCancelled"; }
}
export const isWorktreeDisposalCancelled = (reason) => reason instanceof WorktreeDisposalCancelled;

/** zX: a bulk result that counts as a failure (rejected, and not because the worktree confirm was cancelled). */
export const bulkResultFailed = (result) => result?.status === "rejected" && !isWorktreeDisposalCancelled(result.reason);

/**
 * YX's toast counts for a bulk archive / delete: `S = b.filter(e => e.status === "fulfilled" && e.value).length + x`
 * (x: the asked families LX ran) and `C = b.filter(zX).length`. Locally a lifecycle sessionAction answers `true` once
 * it went through and `false` when it was called off (the worktree confirm cancelled); an `undefined` answer (a caller
 * that does not report) still counts as done. Other bulk actions keep fulfilled = done, rejected = failed.
 */
export function bulkOutcome(action, results = [], asked = 0) {
  const lifecycle = action === "archive" || action === "delete";
  const done = results.filter((result) => result.status === "fulfilled" && (!lifecycle || result.value !== false)).length + asked;
  const failed = results.filter((result) => lifecycle ? bulkResultFailed(result) : result.status === "rejected").length;
  return { done, failed };
}

/** What runBulk hands each session's action: a bulk delete tells the worktree check it is one (c6b8adeaf de `bulk`). */
export const bulkActionPayload = (action, payload) => (action === "delete" ? { ...payload, bulk: true } : payload);

/**
 * main.jsx sessionWorktree's decision over main's worktree-status answer (shared-19 _Y / vY for the local check):
 * "none" — no own worktree, or another session shares it (null); "ask" — a dirty worktree, or a single delete that could
 * not read it ("Couldn’t check…", hK deadline → unknown); "keep" — an unreadable worktree the action goes on without
 * (archive's mK asks only dirty; a bulk delete's _Y `bulk` has no checking line and answers fY); "dispose" — a clean
 * worktree that goes with the session.
 */
export function worktreeDisposalPlan(action, status, payload = {}) {
  if (!status?.worktree || status.shared) return "none";
  if (status.changes > 0 || (status.unknown && action === "delete" && payload.bulk !== true)) return "ask";
  return status.unknown ? "keep" : "dispose";
}

// R4i-sidebar fix (复核 -7): main.jsx sessionWorktree / the delete case, with call / enqueue / perform injected, so the
// cancel path (queue answer false → the action answers false → YX counts it neither way) is tested end to end.
/**
 * main.jsx sessionWorktree: the session's own worktree before archive / delete — null (none, shared or kept), the
 * status to dispose, or false when the queued confirm was cancelled. `call(channel, args)` is main's IPC;
 * `enqueue(entry)` pushes onto the worktree confirm queue and resolves with the answer (yK).
 */
export async function sessionWorktreeGate(action, target, payload = {}, { call, enqueue, now = Date.now }) {
  if (payload.worktreeChecked) return payload.worktree ?? null;
  const status = await Promise.resolve().then(() => call("worktree-status", { threadId: target.id })).catch(() => null);
  const plan = worktreeDisposalPlan(action, status, payload);
  if (plan === "ask") return (await enqueue({ id: `${target.id}:${action}:${now()}`, action, status })) ? status : false;
  return plan === "dispose" ? status : null;
}
/**
 * The worktree-gated part of main.jsx's delete: gate, then `perform()` (thread/delete), then dispose an own worktree
 * (not awaited). Answers false when the confirm was cancelled (shared-19 uY's place), true when the action ran.
 */
export async function worktreeGatedAction(action, target, payload, { call, enqueue, perform, now }) {
  const worktree = await sessionWorktreeGate(action, target, payload, { call, enqueue, now });
  if (worktree === false) return false;
  await perform(worktree);
  if (worktree?.worktree && !worktree.shared) void Promise.resolve().then(() => call("worktree-remove", { worktree: worktree.worktree })).catch(() => {});
  return true;
}
/** main.jsx settleWorktreeConfirm's queue step (cK shift): the queue without `entry`, and whether the next head is guarded. */
export function settleWorktreeQueue(queue, entry) {
  if (!queue.includes(entry)) return { queue, advanced: false };
  return { queue: queue.filter((item) => item !== entry), advanced: queue.length > 1 };
}

// yY pushes onto EY's queue (lY), which main.jsx renders. The host queue is main.jsx's worktreeQueue: it connects its
// push here, and EY's rendering sends an entry with `sessions` to SidebarBulkWorktreeConfirm (NY's titles) and the
// others to SourceWorktreeDirtyDialog (MY's changes): `n.sessions===void 0?x(MY,{changes:E}):x(NY,{titles:E})`.
let worktreeConfirmQueue = null;
/** Connect the worktree confirm queue (`push(entry)`, entry carrying `resolve`). Returns the disconnect. */
export function connectWorktreeConfirmQueue(push) {
  worktreeConfirmQueue = push;
  return () => { if (worktreeConfirmQueue === push) worktreeConfirmQueue = null; };
}
/**
 * yY(titles, count, window): queue the several-sessions "Couldn’t check" confirm; resolves true when accepted, false
 * when cancelled (or at once false when no queue is connected, as nothing could be confirmed).
 */
export function confirmCouldntCheck(titles = [], count = titles.length, now = Date.now()) {
  const push = worktreeConfirmQueue;
  if (!push) return Promise.resolve(false);
  return new Promise((resolve) => push({ ...couldntCheckConfirm(titles, count, now), resolve }));
}
/** EY's branch: "sessions" for a yY entry (NY lists titles), "changes" for the single-session confirms (MY). */
export const worktreeConfirmVariant = (entry) => (entry?.sessions === undefined ? "changes" : "sessions");

/** pv(items, 8, task): run `task` over `items`, `limit` at a time, settling each like Promise.allSettled. */
export async function mapConcurrent(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: "fulfilled", value: await task(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * SourceSidebar runBulk's flow (shared-19 YX for archive / delete, c39a247c4 ve for pin / unpin / set-model): the open
 * session is skipped by archive / delete (YX `vo()===Za(e.ref)?(y.skip(e.codeRef),!1)`, counted neither way) and goes
 * last otherwise (_e); IX splits off the families to ask about; the bulk part runs 8 at a time with `{bulk: true}` on a
 * delete; LX runs the asked families through the provider's `run` (else `run`); YX counts the outcome.
 * `run(action, session, payload)` is the host's onSessionAction. Returns {results, done, failed}.
 */
export async function runBulkSessions(action, targets = [], payload, { current = null, run, provider = nestedFamilies,
  present = () => true, archived = () => false } = {}) {
  const lifecycle = action === "archive" || action === "delete";
  const list = lifecycle ? targets.filter((session) => session.id !== current)
    : action === "pin" || action === "unpin" || action === "set-model" ? openSessionLast(targets, current) : targets;
  const { bulk, asking } = lifecycle ? bulkFamilyPlan(action, list, provider) : { bulk: list, asking: [] };
  const results = await mapConcurrent(bulk, 8, (session) => run(action, session, bulkActionPayload(action, payload)));
  const asked = asking.length === 0 ? 0 : await runAskingFamilies(asking, action, { currentId: current, present, archived,
    run: (session) => provider?.run?.(action, session) ?? run(action, session, payload) });
  return { results, ...bulkOutcome(action, results, asked) };
}
