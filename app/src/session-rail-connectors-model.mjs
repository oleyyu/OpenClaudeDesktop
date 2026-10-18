// R4i-rail RL1: the Session rail's Connectors card over the host's connector list (customize-store `mcp`).
//
// 2.42304.0 sources (ion-dist v1; spec analysis/code-ui-migrate-20261017/research/r4-session-rail.md §3 row 19):
// - cf74bc599 fO: `p = Q(t, e => e.openSessionMcpDialog)`, `g = _g(e.type === "local" && p !== null ? e.id : null)` and
//   `ke = … p ? {counts: g, onOpen: p} : void 0` → `{count, needReconnect, unavailable, servers: PE({names: listedNames,
//   states: listedStates, iconTypes: listedIconTypes, iconSrcs: listedIconSrcs, labelOf: uE}), onOpen}`; iD renders the
//   card (lD) when `O !== void 0 && O.count !== 0`.
// - c73f45bc3 Cd (exported zt, fO's `_g`): over the session's `sdkMcpServers` (the CLI's MCP status list) it answers Sd
//   (`count: null`, the skeleton) until the list is known, else `count` (every listed server), `needReconnect` (the
//   needs-auth / failed ones; a desktop-dynamic server only while its host can still act on it), `unavailable` (status
//   "unavailable", and a desktop-dynamic server that failed and is not to reconnect), and the newline-joined
//   `listedNames` / `listedStates` (`f.has(e) ? e.status : p.has(e) ? "unavailable" : ""`) / icon types and sources. It
//   keeps the last known counts for the same session while a new list is pending (`[c, l] = r({id: e, counts: s})`).
// - cc43287c9 (the session view) puts `openSessionMcpDialog` on the scope store while a local session has an MCP dialog
//   (`DP(id)`); the opener opens that dialog, else Settings › Connectors (`_m({section: "connectors"})`).
//
// Host: the session's MCP status list is the core's mcpServerStatus/list for the session's thread, which the Customize
// store loads (`customize` operation "mcp", threadId + cwd) and keeps fresh from mcpServer/startupStatus notifications.
// Its rows carry the host kind (customize-model mcpStatusKind); sdkStatus maps it to the CLI status Cd reads. The host
// has no desktop-dynamic servers (Vs never holds: no held-back / restart notes), no claude.ai connector registry (names
// are the server names, no icon types or sources, no "own" connectors), and no session MCP dialog, so the opener is
// Settings › Customize › Connectors. A list the core cannot give (the customize call failed) is no source: the card is
// not passed, as fO passes nothing without an opener.

/** c73f45bc3 Sd: no list yet. */
export const NO_SESSION_MCP_COUNTS = Object.freeze({ count: null, needReconnect: 0, unavailable: 0, needReconnectOwn: 0, reconnectOwnNames: "",
  reconnectOwnToolPrefixes: "", reconnectNames: "", reconnectStates: "", listedNames: "", listedStates: "", listedIconTypes: "", listedIconSrcs: "" });

/**
 * The CLI MCP status (connected / pending / needs-auth / failed / disabled / unavailable) for a host connector row.
 * - trust: an untrusted folder's project connector the core does not launch until the folder is trusted;
 * - blocked: a connector the core refuses to load (organization policy, allowed / excluded lists).
 * Neither can run in this session, so both are "unavailable" (Cd lists them apart from the ones to reconnect).
 */
export function sdkStatus(row) {
  switch (row?.blocked ? "blocked" : row?.kind) {
    case "connected": return "connected";
    case "connecting":
    case "notStarted": return "pending";
    case "signIn": return "needs-auth";
    case "unreachable": return "failed";
    case "disabled": return "disabled";
    case "trust":
    case "blocked": return "unavailable";
    default: return "pending";
  }
}

const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ");

/**
 * Cd's counts for `sessionId` from the Customize store's `mcp` slice, or null when the host has no list to give (the
 * core could not answer). While the slice is loading, or holds another session's list, the answer is Sd.
 */
export function sessionMcpCounts(mcp, sessionId) {
  if (!mcp || typeof sessionId !== "string" || !sessionId) return NO_SESSION_MCP_COUNTS;
  if ((mcp.threadId ?? null) !== sessionId) return NO_SESSION_MCP_COUNTS;
  if (mcp.status === "error") return null;
  if (mcp.status !== "ready") return NO_SESSION_MCP_COUNTS;
  const s = (Array.isArray(mcp.rows) ? mcp.rows : []).filter((row) => row && typeof row.name === "string" && row.name)
    .map((row) => ({ name: row.name, status: sdkStatus(row) }));
  // Cd: u (to reconnect) and p (unavailable); no desktop-dynamic server, so `!Vs(e)` always holds.
  const u = s.filter((e) => e.status === "needs-auth" || e.status === "failed");
  const f = new Set(u);
  const p = new Set(s.filter((e) => e.status === "unavailable"));
  return {
    count: s.length,
    needReconnect: u.length,
    unavailable: p.size,
    needReconnectOwn: 0,
    reconnectOwnNames: "",
    reconnectOwnToolPrefixes: "",
    reconnectNames: u.map((e) => oneLine(e.name)).join("\n"),
    reconnectStates: u.map((e) => e.status).join("\n"),
    listedNames: s.map((e) => oneLine(e.name)).join("\n"),
    listedStates: s.map((e) => (f.has(e) ? e.status : p.has(e) ? "unavailable" : "")).join("\n"),
    listedIconTypes: s.map(() => "").join("\n"),
    listedIconSrcs: s.map(() => "").join("\n"),
  };
}

/** Cd's hold: the counts shown for `sessionId`, keeping the previous known ones while the new list is pending. */
export function heldMcpCounts(previous, sessionId, counts) {
  if (counts === null) return { id: sessionId, counts: null, shown: null };
  const same = previous?.id === sessionId;
  const next = !same || (counts.count !== null && counts !== previous.counts) ? { id: sessionId, counts } : previous;
  return { ...next, shown: counts.count !== null || !same ? counts : next.counts };
}

/** fO `ke` over the shown counts: iD's `connectors` prop, or undefined without an opener or a source. */
export function railConnectors(counts, onOpen, connectorRows, labelOf) {
  if (!onOpen || !counts) return undefined;
  return { count: counts.count, needReconnect: counts.needReconnect, unavailable: counts.unavailable,
    servers: connectorRows({ names: counts.listedNames, states: counts.listedStates, iconTypes: counts.listedIconTypes, iconSrcs: counts.listedIconSrcs, labelOf }),
    onOpen };
}
