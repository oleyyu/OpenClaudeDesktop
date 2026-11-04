// Session row menus: the multi-selection items (Claude Desktop 2.31226.0 c39a247c4 ve, readable 66-300; ce4f4374c Me /
// Ne, readable 1098-1340) and the single row's Move to group submenu (shared-21 lz / cz, readable 11042-11128).
// R3-sidebar2 (sidebar-15): plus the 2.42304.0 bulk archive / delete flow pieces at the end of this file.
import { bulkNestedFamilies } from "./generated/code-current/sidebar-bulk-family.mjs";
import { bulkDeleteCopy } from "./generated/code-current/sidebar-bulk-delete-copy.mjs";
import { sideSessionDetachable } from "./generated/btw-pane/detach-eligibility.mjs";
import { sideSessionRecord } from "./nested-less-side-chats.mjs";

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
// /btw children. W14-code r2 fr2-01: the nested sessions question (shared-20 FA / IA / BA, ca674e66a
// NestedSessionsConfirmBody: source-nested-sessions-confirm.jsx) now asks inside main.jsx sessionAction, and main.jsx
// connects the provider below (nestedSessionsToAsk = nestedSessionFamily + nestedFamilyAsks, run = sessionAction).

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

// ---------------------------------------------------------------- W14-code r2 fr2-01 / r2-shared-01
// 3.6556.2 c48ea26ad F(e, {action}) over the local session records: the family hangs off the side-session lineage
// (`Te(e, …)`: spawnedFrom.sideSession → spawnedFrom.sessionId, none once lineageDetached), a delete counts archived
// members and an archive only live ones (`(n || !e.isArchived)`). P walks it depth first, a member's own nested sessions
// before it. `detachable` are the direct children shared-11 df can move to the top level (sideSessionDetachable: not
// archived, not sharing the parent's checkout), `boundCount` the members under none of them (a shared checkout goes
// with its parent), `canStay` the rest and `workingCount` the live, unbound members that are running. Y: an archive asks
// when some member could stay (`n.nested.length > n.boundCount`), a delete when one can be detached.
export function nestedSessionFamily(sessionId, action, { sessions = [], metadata = {}, isWorking = () => false } = {}) {
  const records = sessions.filter((session) => session?.id).map((session) => sideSessionRecord(session, metadata));
  const byId = new Map(records.map((record) => [record.sessionId, record]));
  const children = new Map();
  for (const record of records) {
    const from = record.spawnedFrom;
    const parent = record.lineageDetached || from?.sideSession !== true ? undefined : from.sessionId;
    if (typeof parent !== "string" || parent === record.sessionId || !byId.has(parent)) continue;
    if (action !== "delete" && record.isArchived) continue;
    children.set(parent, [...(children.get(parent) ?? []), record]);
  }
  const walk = (id, seen = new Set([id])) => {
    const out = [];
    for (const child of children.get(id) ?? []) if (!seen.has(child.sessionId)) { seen.add(child.sessionId); out.push(...walk(child.sessionId, seen), child); }
    return out;
  };
  const nested = walk(sessionId);
  const detachable = (children.get(sessionId) ?? []).filter((child) => sideSessionDetachable(records, child.sessionId));
  const free = new Set(detachable.flatMap((child) => [child.sessionId, ...walk(child.sessionId).map((member) => member.sessionId)]));
  const bound = new Set(nested.filter((member) => !free.has(member.sessionId)).map((member) => member.sessionId));
  return {
    nested: nested.map((member) => member.sessionId),
    detachable: detachable.map((child) => child.sessionId),
    boundCount: bound.size,
    canStay: nested.map((member) => member.sessionId).filter((id) => !bound.has(id)),
    workingCount: nested.filter((member) => !member.isArchived && !bound.has(member.sessionId) && isWorking(member.sessionId)).length,
  };
}
/** c48ea26ad Y's `asks`: whether `action` on the session must first ask about its nested sessions. */
export function nestedFamilyAsks(family, action) {
  return action === "archive" ? family.nested.length > family.boundCount : family.detachable.length > 0;
}
/**
 * W14-code r4 fr4-05: what a single Code delete does after X's nested question (c48ea26ad Ze c, `!c.asked && !s && !(await
 * m({…}))`): "cancel" when it was called off (null), "confirm" — the "Delete session?" confirm `m` — when nothing was asked
 * (undefined), and "delete" (straight to the delete with the answer; only a dirty or unreadable worktree asks again,
 * shared-46 jD `ask: "dirty"`) once the question was answered ("all" / "only").
 */
export function singleDeleteStep(nestedAnswer) {
  return nestedAnswer === null ? "cancel" : nestedAnswer === undefined ? "confirm" : "delete";
}

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

/**
 * What runBulk hands each session's action: a bulk delete tells the worktree check it is one (c6b8adeaf de `bulk`).
 * W14-code r5 gen-final-5: a bulk unarchive is silent (c39a247c4 gn `Ye({silent: !0})` → `unarchive: v`); the bulk bar
 * says it once (zt.unarchive.success ha.bulkRestored), so no per-session "Session unarchived." toast.
 */
export const bulkActionPayload = (action, payload) => (action === "delete" ? { ...payload, bulk: true }
  : action === "unarchive" ? { ...payload, silent: true } : payload);

/**
 * main.jsx sessionWorktree's decision over main's worktree-status answer (shared-19 _Y / vY for the local check):
 * "none" — no own worktree, or another session shares it (null); "ask" — a dirty worktree, or a single delete that could
 * not read it ("Couldn’t check…", hK deadline → unknown); "keep" — an unreadable worktree the action goes on without
 * (archive's mK asks only dirty; a bulk delete's _Y `bulk` has no checking line and answers fY); "dispose" — a clean
 * worktree that goes with the session.
 */
export function worktreeDisposalPlan(action, status, payload = {}) {
  if (!status?.worktree || status.shared) return "none";
  // W14-code r5 R5DC-06: a "Delete all" family member (payload.mergeUnknown) is not asked about an unreadable worktree on
  // its own — c48ea26ad Be gathers those (K → `read: "unknown"`) into one yY confirm (familyUnknownRead / confirmCouldntCheck).
  if (status.changes > 0 || (status.unknown && action === "delete" && payload.bulk !== true && payload.mergeUnknown !== true)) return "ask";
  return status.unknown ? "keep" : "dispose";
}
/**
 * W14-code r5 R5DC-06: c48ea26ad Be `a.filter((e) => o.get(e.id)?.read === "unknown")` — a family member whose own worktree
 * could not be read (no uncommitted-changes count), which the "Delete all" flow lists in one "Couldn’t check…" confirm
 * (`ne(t.map((e) => G(i, W(e.id))), a.length, r)`, G: the title, else "A session" CFi8auJXZp).
 */
export function familyUnknownRead(status) {
  return !!status?.worktree && !status.shared && !!status.unknown && !(status.changes > 0);
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
  // payload.probed: the status the nested-sessions confirm's checkAll already read (familyWorktreeProbe), as c48ea26ad Be
  // hands its probes (`m = l ?? g(p)`) to each member's K.
  const status = await Promise.resolve().then(() => payload.probed ?? call("worktree-status", { threadId: target.id })).catch(() => null);
  const plan = worktreeDisposalPlan(action, status, payload);
  if (plan === "ask") return (await enqueue({ id: `${target.id}:${action}:${now()}`, action, status })) ? status : false;
  return plan === "dispose" ? status : null;
}
/**
 * The worktree-gated part of main.jsx's delete: gate, then `perform()` (thread/delete), then dispose an own worktree
 * (not awaited). Answers false when the confirm was cancelled (shared-19 uY's place), true when the action ran.
 * `prepare(worktree)` runs once the confirm went through and before `perform`; its false calls the action off (W14-code r2
 * 复核: c48ea26ad X "only" moves the nested sessions out after K's confirm, and a failed move stops the delete).
 */
export async function worktreeGatedAction(action, target, payload, { call, enqueue, perform, now, prepare }) {
  const worktree = await sessionWorktreeGate(action, target, payload, { call, enqueue, now });
  if (worktree === false) return false;
  if (prepare && await prepare(worktree) === false) return false;
  await perform(worktree);
  if (worktree?.worktree && !worktree.shared) void Promise.resolve().then(() => call("worktree-remove", { worktree: worktree.worktree })).catch(() => {});
  return true;
}
/**
 * W14-code r3 fr3-03: c48ea26ad X's delete checkAll, `() => (d = g(q(e, i))).done`: one worktree-status read for every
 * member of the family (q: the nested sessions, then the session), at most `limit` at a time (Ve's 8). `done` settles
 * once every read has; `statusFor(id)` is that member's read (null when it failed), for the member's own confirm.
 */
export function familyWorktreeProbe(ids, call, { limit = 8 } = {}) {
  const reads = new Map(), waiting = [...new Set(ids)];
  let running = 0, finish;
  const done = new Promise((resolve) => { finish = resolve; });
  const pump = () => {
    while (running < limit && waiting.length) {
      const id = waiting.shift();
      running++;
      const read = Promise.resolve().then(() => call("worktree-status", { threadId: id })).catch(() => null);
      reads.set(id, read);
      read.then(() => { running--; pump(); });
    }
    if (!running && !waiting.length) finish();
  };
  const order = [...waiting];
  pump();
  return {
    done,
    statusFor: (id) => reads.get(id) ?? (order.includes(id) ? done.then(() => reads.get(id)) : undefined),
  };
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

// ---------------------------------------------------------------- W14-code r5 fr5-05
// shared-46 KE / GE (5 s) / nD / tD / oD / aD: the worktree probes an archive reads. A probe is a worktree-status read;
// once settled it stays fresh for 5 s. The sidebar row menu starts one when it opens (shared-21 `e && … ho(e.length > 1 ?
// e.map(rte) : [n])`, ho = aD: at most 8, the selected rows or the row), and the archive reads it (c6b8adeaf onMutate
// `n = Oe(e.id)`, `d = n.known?.status === "dirty"`): a dirty read already in asks first; otherwise the session is
// archived at once and a dirty read arriving later keeps the worktree and raises the "archived with uncommitted
// changes" warning toast (shared-22 QI) instead.
export const WORKTREE_PROBE_FRESH_MS = 5000;
export function createWorktreeProbes({ now = Date.now } = {}) {
  const probes = new Map();
  const stale = (entry, at) => !!entry.settled && at - entry.settled.at >= WORKTREE_PROBE_FRESH_MS;
  const fresh = (id) => { const entry = probes.get(id); return entry && !stale(entry, now()) ? entry : undefined; };
  const start = (id, call) => {
    const at = now();
    for (const [key, entry] of probes) if (stale(entry, at)) probes.delete(key);
    const entry = { result: Promise.resolve().then(() => call("worktree-status", { threadId: id })).catch(() => null) };
    entry.result.then((status) => { entry.settled ??= { status, at: now() }; });
    probes.set(id, entry);
    return entry;
  };
  return {
    /** aD: start a probe for each id that has no fresh one (at most `limit`). */
    prefetch(ids, call, { limit = 8 } = {}) {
      if (!call) return;
      let started = 0;
      for (const id of ids) {
        if (started >= limit) return;
        started++;
        if (!fresh(id)) start(id, call);
      }
    },
    /** oD: `{ result, known }` — the fresh probe (or a new one) and its status when it has already settled (else undefined). */
    read(id, call) {
      const entry = fresh(id) ?? start(id, call);
      return { result: entry.result, known: entry.settled ? entry.settled.status : undefined };
    },
    clear: () => probes.clear(),
  };
}
let worktreeProbeCall = null;
export const worktreeProbes = createWorktreeProbes();
/** main.jsx connects its IPC `call`, so the sidebar can start the menu-open probes (aD). Returns the disconnect. */
export function connectWorktreeProbes(call) {
  worktreeProbeCall = call;
  return () => { if (worktreeProbeCall === call) worktreeProbeCall = null; };
}
/** shared-21 row menu open: probe the rows the menu acts on. */
export function prefetchWorktreeProbes(ids) {
  worktreeProbes.prefetch(ids, worktreeProbeCall);
}
/**
 * c6b8adeaf's archive (onMutate + mutationFn) over a probe: `{ worktree, late }` — `worktree` the status to dispose after the
 * archive (or null to keep / none), `late` the probe still in flight (the caller archives now and settles it after:
 * lateArchiveWorktree), or false when the dirty confirm (Re → mK) was cancelled. A payload the nested flow already checked
 * (worktreeChecked) keeps its read.
 */
export async function archiveWorktreeGate(target, payload = {}, { probes = worktreeProbes, call, enqueue, now = Date.now }) {
  if (payload.worktreeChecked) return { worktree: payload.worktree ?? null, late: null };
  const { result, known } = probes.read(target.id, call);
  if (known === undefined) return { worktree: null, late: result };
  const plan = worktreeDisposalPlan("archive", known, payload);
  if (plan === "ask") return (await enqueue({ id: `${target.id}:archive:${now()}`, action: "archive", status: known })) ? { worktree: known, late: null } : false;
  return { worktree: plan === "dispose" ? known : null, late: null };
}
/**
 * `s?.then(({ status }) => status === "dirty" && (…, Ue(t, Ge(folders))))`: what a probe that settled after the archive
 * means — "dispose" (clean: the worktree goes, as the transport's own clean-up would), "kept-dirty" (the worktree stays;
 * the QI warning toast), or "keep" (no worktree, shared, or unreadable).
 */
export function lateArchiveWorktree(status) {
  const plan = worktreeDisposalPlan("archive", status);
  return plan === "dispose" ? "dispose" : plan === "ask" ? "kept-dirty" : "keep";
}

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
