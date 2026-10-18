// R4f-rail SR-5: the Session rail's local session record and the rO meta fields built from it (renderer half of
// main.cjs `session-rail-meta`, electron/session-rail-meta.cjs).
//
// 2.42304.0 source (ion-dist v1):
// - cf74bc599-D9NZWRyl.js `rO = kn("originCwd", "workingDir", … "startedViaRemoteControl")`: the 24 meta fields the
//   rail host fO asks the session meta query for (`S = Td(e, rO)`, c5da7eb42 Q).
// - shared-8-B5lJ8U5C.js `zh` (exported Fd, cf74bc599 `Oa`): the local session record fO reads,
//   `{cwd, originCwd, worktreePath, startedWithWorktree, worktreeRemoved, lazyWorktreePath, isArchived, harnessCwd,
//   branch, additionalDirectories, isScratchWorkspace, remoteTarget, sshConfig}`.
// - fO `k`: without meta (C) the rO fields come from that record: `{...$d(O), additionalDirectories:
//   O.additionalDirectories, hasDesktopWorktree: !!O.worktreePath, startedWithWorktree: O.startedWithWorktree,
//   worktreeRemoved: O.worktreeRemoved, isScratchWorkspace: O.isScratchWorkspace, remote: Fn(O), environmentId: void 0,
//   …, repoSlugs: [], goal: void 0, …}`; `$d` = cef1e6037-8DivyY4m.js `Fn` (export r) and `Fn` = shared-104-Cqo2-vQh.js
//   `tz` (export w).
// - fO's other reads of the record: `R = O !== void 0 && ZE({isLocal: x, cwd: O.cwd, originCwd: O.originCwd,
//   worktreePath: O.worktreePath, harnessCwd: O.harnessCwd, branch: O.branch, startedWithWorktree, worktreeRemoved})`,
//   `z = Fn(O) !== void 0`, `B = O?.isArchived === !0`, `V = R && !B && !z ? O?.lazyWorktreePath : void 0` and
//   `VE({…, recorded: O?.branch, …})`. ZE / QE / VE themselves are rail view functions (SR-2's generated session-rail);
//   this module only assembles their inputs from the record, in the original's expressions.
//
// Host: the meta query has no source here (the cloud session meta, Slack, Remote Control, environments and goal are
// claude.ai's), so the rail uses fO's own record fallback for every local session; the fields the host records are
// described in electron/session-rail-meta.cjs. A Code session's rail reads it with loadLocalSessionRecord.

export const SESSION_RAIL_META_ACTION = "session-rail-meta";

/** cf74bc599 rO: the session meta fields the rail reads, in the original's order. */
export const RAIL_META_FIELDS = Object.freeze(["originCwd", "workingDir", "additionalDirectories", "hasDesktopWorktree", "startedWithWorktree",
  "worktreeRemoved", "folderTrees", "isScratchWorkspace", "pendingCwd", "remote", "environmentId", "environmentKind", "selfHostedPoolId",
  "selfHostedPoolName", "selfHostedRunnerClientLabel", "sessionStatus", "isSlackOrigin", "git", "repoSlugs", "goal", "bridgeSessionUrl",
  "remoteControlConnecting", "remoteControlAvailable", "startedViaRemoteControl"]);

/** shared-8 zh: the local session record's fields, in the original's order. */
export const LOCAL_SESSION_RECORD_FIELDS = Object.freeze(["cwd", "originCwd", "worktreePath", "startedWithWorktree", "worktreeRemoved",
  "lazyWorktreePath", "isArchived", "harnessCwd", "branch", "additionalDirectories", "isScratchWorkspace", "remoteTarget", "sshConfig"]);

const PATH_FIELDS = ["cwd", "originCwd", "worktreePath", "lazyWorktreePath", "harnessCwd"];
const FLAG_FIELDS = ["startedWithWorktree", "worktreeRemoved", "isArchived", "isScratchWorkspace"];
const MAX_PATH = 4096, MAX_ADDITIONAL = 256;

/** A path main reported: absolute (POSIX, or a Windows drive / UNC path), bounded, no NUL. */
function reportedPath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_PATH && !value.includes("\0")
    && (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\")) ? value : undefined;
}

/**
 * The IPC answer as a shared-8 zh record, or null. Only the record's own fields of the expected types pass; main never
 * reports remoteTarget / sshConfig (no SSH or WSL sessions here, D31), so they are dropped.
 */
export function localSessionRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = {};
  for (const key of PATH_FIELDS) { const dir = reportedPath(value[key]); if (dir !== undefined) record[key] = dir; }
  if (record.cwd === undefined) return null;
  for (const key of FLAG_FIELDS) if (typeof value[key] === "boolean") record[key] = value[key];
  if (typeof value.branch === "string" && value.branch.length > 0 && value.branch.length <= 255 && !/[\u0000-\u001f\u007f]/.test(value.branch))
    record.branch = value.branch;
  if (Array.isArray(value.additionalDirectories)) {
    const dirs = [...new Set(value.additionalDirectories.map(reportedPath).filter((dir) => dir !== undefined))].slice(0, MAX_ADDITIONAL);
    if (dirs.length) record.additionalDirectories = dirs;
  }
  return Object.fromEntries(LOCAL_SESSION_RECORD_FIELDS.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]));
}

/** cef1e6037 Fn ($d): the folder a session started from and the one it works in. */
export function railFolders(record) {
  const originCwd = record.originCwd || record.cwd;
  return { originCwd, workingDir: record.harnessCwd ?? record.worktreePath ?? originCwd };
}

/** shared-104 tz (cf74bc599 Fn): the record's SSH / WSL target, else undefined. */
export function railRemote(record) {
  const target = record?.remoteTarget;
  if (target) switch (target.kind) {
    case "ssh": return { kind: "ssh", sshHost: target.sshHost, sshPort: target.sshPort, sshIdentityFile: target.sshIdentityFile, remoteCwd: target.remoteCwd };
    case "wsl": return { kind: "wsl", distro: target.distro };
    default: return;
  }
  if (record?.sshConfig) return { kind: "ssh", sshHost: record.sshConfig.sshHost, sshPort: record.sshConfig.sshPort, sshIdentityFile: record.sshConfig.sshIdentityFile, remoteCwd: record.sshConfig.remoteCwd };
}

/** fO k without meta: the rO fields from the local record (undefined without one). */
export function railMetaFromRecord(record) {
  if (!record) return undefined;
  return {
    ...railFolders(record), additionalDirectories: record.additionalDirectories, hasDesktopWorktree: !!record.worktreePath,
    startedWithWorktree: record.startedWithWorktree, worktreeRemoved: record.worktreeRemoved, isScratchWorkspace: record.isScratchWorkspace,
    remote: railRemote(record), environmentId: undefined, environmentKind: undefined, selfHostedPoolId: undefined, selfHostedPoolName: undefined,
    selfHostedRunnerClientLabel: undefined, sessionStatus: undefined, isSlackOrigin: undefined, git: undefined, repoSlugs: [], goal: undefined,
    bridgeSessionUrl: undefined, remoteControlConnecting: undefined, remoteControlAvailable: undefined, startedViaRemoteControl: undefined,
  };
}

/** fO's ZE argument for this record (x: the session is local or CLI). */
export function railLazyPendingArgs(record, isLocal) {
  return { isLocal, cwd: record.cwd, originCwd: record.originCwd, worktreePath: record.worktreePath, harnessCwd: record.harnessCwd,
    branch: record.branch, startedWithWorktree: record.startedWithWorktree, worktreeRemoved: record.worktreeRemoved };
}

/**
 * fO's record facts around ZE: `remote` (z), `archived` (B), `leasedPath` (V, from ZE's answer `pending`) and the
 * recorded branch VE reads.
 */
export function railRecordFacts(record, pending) {
  const remote = railRemote(record) !== undefined, archived = record?.isArchived === true;
  return { remote, archived, leasedPath: pending && !archived && !remote ? record?.lazyWorktreePath : undefined, recordedBranch: record?.branch };
}

/** main.cjs `session-rail-meta` for one session: its record, or null (unknown session, no folder, or the call failed). */
export async function loadLocalSessionRecord(call, sessionId, cwd) {
  if (typeof sessionId !== "string" || !sessionId) return null;
  try {
    return localSessionRecord(await call(SESSION_RAIL_META_ACTION, { sessionId, ...(reportedPath(cwd) ? { cwd } : {}) }));
  } catch { return null; }
}
