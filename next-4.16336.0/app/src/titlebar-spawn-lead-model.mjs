// w12b-titlebar-spawn-lead: the seeds 3.6556.2 cc43287c9 oG hands its spawn lead (EP = c73f45bc3 ay, generated
// titlebar-spawn-lead.mjs) while a new session is starting (sessionRef t null, spawn o set):
//   ne = o ? ni(o) : void 0                         the live origin (ni = shared-52 nA, generated titlebar-spawn-origin.mjs)
//   pe = RP(re.origin ? (re.origin.remote?.kind === "ssh" ? "ssh" : re.origin.type) : …, n)
//   he = RP(o?.id, n), ge = ne ?? re.origin
//   _e = ge?.isScratchWorkspace ? Fv(I) : ge?.label, ve = RP(_e, `${n}:${he ?? ""}`)
//   J  = i ? (re.title ?? fe?.title) : r
//   lead = t || o ? p(EP, { origin: pe && { kind: pe, label: ve }, title: J, bare: M }) : …
// RP (c73f45bc3 xv, generated titlebar-seed-latch.mjs) is a hook, so the latch runs in the host component
// (source-titlebar-spawn-lead.jsx); this module holds the pure parts. Pure node model: no view-tabs (E42).
import { spawnOrigin } from "./generated/code-current/titlebar-spawn-origin.mjs";

// The host's spawn as oG's `o` (cc43287c9 qye spawnOrigin = `{...Wu(LT.intent), id: LT.sessionId}`): main.jsx's first
// send that prepares a worktree (spawnPhase { token }) runs a local session on the draft's folder. The host start has
// no repository name (workspace-info returns isRepo / branch only), no remote and no scratch workspace, so nA labels
// it with the folder's base name (nk). No spawn, no `o`.
export function titlebarSpawnSource({ spawnPhase, cwd } = {}) {
  if (!spawnPhase?.token) return null;
  return { id: spawnPhase.token, type: "local", ...(typeof cwd === "string" && cwd ? { cwd } : {}) };
}

// oG `ne = o ? ni(o) : void 0`.
export function titlebarLiveOrigin(spawn) {
  return spawn ? spawnOrigin(spawn) : undefined;
}

// oG pe's argument while t is null (the `t && de && t.type !== "local"` and `fe?.kind` arms need a session ref).
// The host keeps no pending-launch store (gW's re.origin), so its origin is the live one (gW latches `liveOrigin` while
// not ready: `l = i ?? s.origin`).
export function titlebarOriginKind(origin) {
  if (!origin) return undefined;
  return origin.remote?.kind === "ssh" ? "ssh" : origin.type;
}

// oG `_e`: a scratch workspace is labelled Fv(I) (shared-11 Wm, "No folder"); otherwise the origin's label.
export function titlebarOriginLabel(origin, scratchLabel) {
  return origin?.isScratchWorkspace ? scratchLabel : origin?.label;
}

// EP's props from the latched seeds (`origin: pe && { kind: pe, label: ve }`, `bare: M` = railMode).
export function titlebarSpawnLeadProps({ kind, label, title, railMode = false }) {
  return { origin: kind && { kind, label }, title, bare: railMode };
}
