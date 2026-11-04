// The host's sessions as the 3.6556.2 desktop's session list (W14-code transcript-rest TM-1). The Code transcript's fork
// rows (c96d752d0 i9 `case "forkedFrom"` → Cet / xet / Sj, `case "forkMarker"` → Tet / Eet / Det / Oet) read the desktop's
// sessions store (shared-8 og, `{sessions: [{sessionId, title, createdAt, isArchived, spawnedFrom, forkedFromSessionId}]}`:
// shared-46 WI finds one by id, c5da7eb42 __ / h_ reads the parent of a session Claude started). This module builds
// those records from the host's session rows and metadata, and where the list places a fork marker. Pure: no React.
import { lineageKind, sessionParentId, timestampMs } from "./sidebar-model.js";
import { hostMcpScope, sdkStatus } from "./session-rail-connectors-model.mjs";

const str = (value) => (typeof value === "string" ? value : "");

/**
 * One desktop session record per host session row.
 *   sessionId / title / createdAt (ms) / isArchived   as og's rows.
 *   forkedFromSessionId   a fork's parent (lineageKind "fork": the core's forkedFromId, or the fork operation's metadata).
 *   spawnedFrom           a side session the agent started (lineageKind "side_session": the core's parentThreadId): h_'s
 *                         `{sideSession: true, userFork: false}`, so xet labels it "Started by Claude from".
 */
export function officialSessionRecords(sessions = [], metadata = {}, mcp = null) {
  const out = [];
  // W14-code r5 R5T-01: the open session's MCP servers (c96d752d0 MHe's Session info "MCP servers" row reads
  // `sessions.find((e) => e.sessionId === i)?.sdkMcpServers` for a local session).
  const servers = sessionSdkMcpServers(mcp);
  for (const row of Array.isArray(sessions) ? sessions : []) {
    if (!row || typeof row !== "object" || !str(row.id)) continue;
    const kind = lineageKind(row, metadata), parent = kind ? sessionParentId(row, metadata) : null;
    const created = timestampMs(row.createdAt ?? row.createdAtMs);
    out.push({
      sessionId: row.id,
      title: str(row.name) || str(row.preview),
      ...(created ? { createdAt: created } : {}),
      isArchived: row.archived === true,
      ...(parent && kind === "fork" ? { forkedFromSessionId: parent } : {}),
      ...(parent && kind === "side_session" ? { spawnedFrom: { sessionId: parent, sideSession: true, userFork: false } } : {}),
      ...(servers && row.id === mcp.threadId ? { sdkMcpServers: servers } : {}),
    });
  }
  return out;
}

/**
 * W14-code r5 R5T-01: the Customize store's `mcp` slice (`{threadId, status, rows}`) as the session's sdkMcpServers (the
 * CLI's MCP status list `{name, status, scope, pluginId?}`, as session-rail-connectors-model sessionMcpCounts maps the
 * host rows for yJ), or null while it is not a ready list of a session.
 */
export function sessionSdkMcpServers(mcp) {
  if (!mcp || typeof mcp !== "object" || !str(mcp.threadId) || mcp.status !== "ready") return null;
  return (Array.isArray(mcp.rows) ? mcp.rows : []).filter((row) => row && str(row.name))
    .map((row) => ({ name: row.name, status: sdkStatus(row), scope: hostMcpScope(row), ...(str(row.pluginId) ? { pluginId: row.pluginId } : {}) }));
}

/**
 * Where the list draws each fork marker (i9 "forkMarker", after the turn the forks were made at): the index in `entries`
 * (the renderer's and the host's rows in order) of the last one of that turn → the fork ids. `forkMarks`: fork-marker-model
 * forkMarkersFor's {turnId → [{id}]}; `turnOf(entry)` reads an entry's turn.
 */
export function forkMarkerPlacements(entries = [], forkMarks = new Map(), turnOf = (entry) => entry?.turnId ?? null) {
  const out = new Map();
  if (!(forkMarks instanceof Map) || forkMarks.size === 0) return out;
  const last = new Map();
  entries.forEach((entry, index) => { const turnId = turnOf(entry); if (turnId && forkMarks.has(turnId)) last.set(turnId, index); });
  for (const [turnId, index] of last) {
    const ids = (forkMarks.get(turnId) ?? []).map((fork) => fork?.id).filter((id) => typeof id === "string" && id);
    if (ids.length) out.set(index, ids);
  }
  return out;
}
