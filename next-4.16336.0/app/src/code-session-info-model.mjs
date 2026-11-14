// W14-code r4 R4T-08c (E95): the data of the Code transcript's official /status card. c96d752d0 R3 draws a status entry
// as "code.status" → V4e → WG, whose model hook MHe (generated/code-transcript/code-transcript.mjs) reads the desktop's
// session stores. Two of them are the session's own facts and the host serves them here:
//
//   1. the session meta query, react-query key ["epitaxy", "meta", id] (shared-104 fb.meta → eb), read through c5da7eb42
//      QI / Q with MHe's select THe = pa("originCwd", "workingDir", "hasDesktopWorktree", "additionalDirectories",
//      "folderTrees", "homePath", "remote", "model", "effort", "fastModeState", "hostSandbox", "hostSandboxReason",
//      "outputStyle", "permissionMode", "scheduledTaskId", "forkedFromSessionId", "startedViaRemoteControl",
//      "isTriggerSpawned", "createdAt", "tags", "environmentKind"). The desktop fetches it over its epitaxy transport
//      (`o({id, type}).fetchMeta(s)`); here there is none (TB answers SB), so the host puts the meta in the cache: the
//      Session / Environment rows (Model · effort · Fast, Permissions, Started, Folder, Worktree, Additional folders);
//   2. the live session store, rows-c06cf64bb `q` (Map id → store, `X(id, selector)` = Vb, `nT` the watchers YT
//      re-subscribes when a store appears): MHe's HHe / VHe / BHe / zHe read `liveMeta.{cliVersion, model, effort,
//      permissionMode}`, EHe `messages.getSnapshot()` (the CLI session id: none here, so the Session ID is the host's).
//      The other readers of a store (c227f4d5e pW `heldInput.length`, bW `compactionStatus`, the pending-turn checks
//      nUe / `pendingTurn`, uJ `messages.generation`) get the idle values they read for a missing store.
//
// W14-code r5 R5T-01: the Desktop app row (shared-26 LD reads shared-25 Ki = globalThis["claude.settings"].DesktopInfo's
// getSystemInfo; the generator answers Ki with the host's desktopInfo, fed desktopSystemInfo below) and the MCP servers
// row (the sessions store record's sdkMcpServers, code-transcript-sessions.mjs, written by source-code-transcript.jsx).
// Not served (the original's own "nothing" branch): Sandbox / Managed settings (no LocalSessions.setLocalSandboxEnabled),
// and the Account group (the 3P login stores; E59 no claude.ai account).
// "Claude Code" (D23 keeps the label) shows the running core and its version (E83). Pure: the stores are passed in.
import { toOfficialPermissionMode } from "./proposal-group-model.mjs";
import { effortName } from "./model-menu-model.mjs";
import { lineageKind, sessionParentId, timestampMs } from "./sidebar-model.js";

const str = (value) => (typeof value === "string" && value.trim() ? value : "");
// c74045701 o (_T): the efforts MHe names itself ("Low" … "Max"); any other level is the host's own name (effortName).
const OFFICIAL_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export const codeSessionMetaKey = (sessionId) => ["epitaxy", "meta", sessionId];

/** The session's meta (THe's fields the host knows) from main.jsx's state for the open Code session. */
export function codeSessionMeta({ session = null, metadata = null, model = "", effort = "", efforts = null, fast = false, permission = "",
  cwd = "", additionalFolders = [], homePath = "" } = {}) {
  const meta = {};
  const workingDir = str(cwd) || str(session?.cwd), originCwd = str(metadata?.originCwd) || workingDir;
  if (originCwd) meta.originCwd = originCwd;
  if (workingDir) meta.workingDir = workingDir;
  if (originCwd && workingDir && originCwd !== workingDir) meta.hasDesktopWorktree = true;
  const extra = (Array.isArray(additionalFolders) ? additionalFolders : []).filter((dir) => str(dir) && dir !== workingDir);
  if (extra.length) meta.additionalDirectories = extra;
  if (str(homePath)) meta.homePath = homePath;
  if (str(model)) meta.model = model;
  const level = str(effort);
  if (level) meta.effort = OFFICIAL_EFFORTS.has(level) ? level : effortName(level, efforts) || level;
  meta.fastModeState = fast ? "on" : "off";
  const permissionMode = toOfficialPermissionMode(permission);
  if (permissionMode) meta.permissionMode = permissionMode;
  const created = session ? timestampMs(session.createdAt ?? session.createdAtMs) : 0;
  if (created) meta.createdAt = created;
  const all = metadata && session?.id ? { [session.id]: metadata } : {};
  if (session && lineageKind(session, all) === "fork") {
    const parent = sessionParentId(session, all);
    if (parent) meta.forkedFromSessionId = parent;
  }
  const scheduled = metadata?.scheduledTaskId ?? session?.scheduledTaskId;
  if (scheduled !== undefined && scheduled !== null && scheduled !== "") meta.scheduledTaskId = String(scheduled);
  return meta;
}

/** liveMeta: MHe's HHe / VHe / BHe / zHe. cliVersion names the running core (E83) and its version. */
export function codeSessionLiveMeta(info = {}) {
  const meta = codeSessionMeta(info);
  const core = str(info.core?.name), version = str(info.core?.version);
  return {
    model: meta.model ?? null, effort: meta.effort ?? null, permissionMode: meta.permissionMode ?? null,
    cliVersion: core ? (version ? `${core} ${version}` : core) : version || null,
  };
}

const EMPTY = Object.freeze([]);
const NO_MESSAGES = Object.freeze({ generation: 0, getSnapshot: () => EMPTY, subscribe: () => () => {} });
/** One store as rows-c06cf64bb `q` holds them (`getState`, `subscribe`), with the idle values its other readers take. */
export function createLiveSessionStore(liveMeta) {
  let state = Object.freeze({ liveMeta, messages: NO_MESSAGES, pendingTurn: null, heldInput: EMPTY, compactionStatus: null, sshHostOffline: false });
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setLiveMeta(next) {
      if (sameRecord(state.liveMeta, next)) return false;
      state = Object.freeze({ ...state, liveMeta: next });
      for (const listener of [...listeners]) listener();
      return true;
    },
  };
}

function sameRecord(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Publishes the open session's facts: the meta into `client` (a react-query QueryClient), liveMeta into `stores` (`q`),
 * waking `watchers` (`nT`) when the session's store is new. Unchanged facts are not written again.
 */
export function publishCodeSessionInfo(sessionId, info, { stores, watchers, client }) {
  if (typeof sessionId !== "string" || !sessionId) return;
  const key = codeSessionMetaKey(sessionId), meta = codeSessionMeta(info);
  if (client && !sameRecord(client.getQueryData(key), meta)) client.setQueryData(key, meta);
  if (!stores) return;
  const liveMeta = codeSessionLiveMeta(info), existing = stores.get(sessionId);
  if (existing?.setLiveMeta) { existing.setLiveMeta(liveMeta); return; }
  stores.set(sessionId, createLiveSessionStore(liveMeta));
  for (const watcher of [...(watchers ?? [])]) watcher();
}

/**
 * W14-code r5 R5T-01: DesktopInfo.getSystemInfo's answer (jPKPzV-P: `{app_version: app.getVersion(), os_version:
 * process.getSystemVersion(), os_pretty_name, cpu_model, platform, arch, total_memory, …}`) from the app's version and
 * the boot's host facts (electron/main.cjs init `host: {platform, osVersion, arch}`), or null without them. MHe's row
 * reads app_version, platform, os_version, os_pretty_name and arch.
 */
export function desktopSystemInfo(host, appVersion) {
  if (!host || typeof host !== "object" || !str(appVersion) || !str(host.platform) || !str(host.osVersion) || !str(host.arch)) return null;
  return { app_version: appVersion, os_version: host.osVersion, os_pretty_name: null, platform: host.platform, arch: host.arch };
}
