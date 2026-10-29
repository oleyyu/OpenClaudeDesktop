// R4i-rail RL1: the Session rail's Connectors card over the host's connector list (customize-store `mcp`).
//
// 3.6556.2 (V3-w6-rail-host, panes:C1-9; ion-dist v1):
// - cf74bc599-CRYqipWN.js TN: `g = Xr(n, IN)` (openSessionMcpDialog), `b = t.type === "local" && g !== null ? t.id : null`,
//   `C = gp(b, S)` and `Qe = … g ? {counts: C, onOpen: g} : void 0` → `{count, needReconnect, unavailable, servers:
//   yj({names: listedNames, states: listedStates, iconTypes: listedIconTypes, iconSrcs: listedIconSrcs, targets:
//   e.counts.listedTargets, labelOf: HA}), onOpen: t => Xe(t, e.onOpen)}`; rM's row calls `onClick: () => o(e.target)`.
// - cf74bc599 NA (TN's `Xe`): `(n, r) => { if (n?.kind === "account" && t) { e(gt({connector: n.id})); return; }
//   r(n?.kind === "session" ? n.id : void 0) }` with `t = So()` (shared-7 vg, a claude.ai account's connector
//   directory). Host: no account, so a row opens the fallback opener with the session target's id (or undefined).
// - c227f4d5e yJ (exported Mi, TN's `gp`; the 2.42304.0 c73f45bc3 Cd moved here) answers `_J` (no list yet) or
//   `{count, needReconnect, unavailable, reconnectOwnNames, reconnectOwnToolPrefixes, reconnectOwnShownNames,
//   listedNames, listedStates, listedIconTypes, listedIconSrcs, listedTargets, listedToolPrefixes}`: the 2.42304.0
//   needReconnectOwn / reconnectNames / reconnectStates are gone; `listedTargets` is `sJ(rJ(e, p))` (an account
//   connector's uuid, else c9081d688 E: the session server's grouped id), `listedToolPrefixes` is `vJ(a.map(xJ),
//   i.map(bJ))` (each listed server's `mcp__<name>__` prefix when no other server's prefix overlaps it).
// - V3-w10-ccres-rail-connectors: yJ lists the CLI servers through c9081d688 (`rb` = C over v: servers without a
//   `scope` are left out, the rest sorted by display name — a plugin's by its connector name —, claude.ai proxies kept
//   apart and listed only when they are a known account connector; `ob` = x: a non-empty list without any scope is not
//   known yet), names them with `ib` = A (ce38f2fa6 P over the server name) and targets each with `sJ(rJ(e, p))` (an
//   account connector's uuid, else `$y` = E: the grouped id `session-mcp:<name>`). c9081d688 is not sliced for this
//   model (transcript-rows' slice exports only p/w and pulls the CDS graph, E42), so v, x, C, E, O, k, A, ce38f2fa6 l/P
//   and c227f4d5e rJ/sJ are ported line by line below with the original text. The host rows' scope is the customize
//   operation's `mcpScope` (electron/customize-operations.cjs) when a row carries it, else the same fallback here
//   (hostMcpScope); a host plugin server named by its plugin id groups as c9081d688's `plugin:<plugin>:<connector>`.
//
// 2.42304.0 (the previous slice):
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

/** c227f4d5e _J (3.6556.2; 2.42304.0 c73f45bc3 Sd): no list yet. */
export const NO_SESSION_MCP_COUNTS = Object.freeze({ count: null, needReconnect: 0, unavailable: 0, reconnectOwnNames: "", reconnectOwnToolPrefixes: "",
  reconnectOwnShownNames: "", listedNames: "", listedStates: "", listedIconTypes: "", listedIconSrcs: "", listedTargets: "", listedToolPrefixes: "" });

// shared-156 lb (c227f4d5e Ol) and c227f4d5e iJ: a server's tool name prefix.
const toolPrefix = (name) => `mcp__${String(name).replace(/[^a-zA-Z0-9_-]/g, "_")}__`;
/** c227f4d5e vJ: each listed server's tool prefix, "" where another server's prefix overlaps it. */
export function listedToolPrefixes(listed, all) {
  const n = all.map(toolPrefix);
  return listed.map(toolPrefix).map((e) => (n.filter((t) => t.startsWith(e) || e.startsWith(t)).length === 1 ? e : "")).join("\n");
}

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

// ---------------------------------------------------------------------------------------------------------------
// V3-w10-ccres-rail-connectors: c9081d688-d6gSB2Ai.js (3.6556.2), ported line by line.

/** ce38f2fa6 l: `e.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufff9-\ufffb]+/g," ").replace(/(?:(?![…])\p{Default_Ignorable_Code_Point})+/gu," ").replace(/\s{2,}/g," ").trim()`. */
function cleanName(e) {
  return e
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufff9-\ufffb]+/g, " ")
    .replace(/(?:(?![\u200c\u200d\ufe00-\ufe0f\u180b-\u180d\u180f\u{e0100}-\u{e01ef}])\p{Default_Ignorable_Code_Point})+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
/** ce38f2fa6 N. */
const VISIBLE = /[^\s\u200c\u200d\ufe00-\ufe0f\u180b-\u180d\u180f\u{e0100}-\u{e01ef}\u2800]/u;
/** ce38f2fa6 P (c9081d688's `i`): `let t=l(e),n=[...t],r=n.length>64?n.slice(0,63).join(""):t;return N.test(r)?(n.length>64?`${r}\u2026`:t):"(unnamed)"`. */
export function mcpDisplayName(e) {
  const t = cleanName(String(e ?? "")), n = [...t], r = n.length > 64 ? n.slice(0, 63).join("") : t;
  return VISIBLE.test(r) ? (n.length > 64 ? `${r}\u2026` : t) : "(unnamed)";
}

/** c9081d688 s: `new Set(["http","sse","ws","claudeai-proxy"])` (a web server). */
const WEB_TRANSPORTS = new Set(["http", "sse", "ws", "claudeai-proxy"]);
/** c9081d688 l / u / d: `"session-mcp:"`, `"session-mcp-desktop:"`, `"session-mcp-held-back:"`. */
const SESSION_MCP = "session-mcp:";
const SESSION_MCP_DESKTOP = "session-mcp-desktop:";
const SESSION_MCP_HELD_BACK = "session-mcp-held-back:";
/** c9081d688 f / p: a claude.ai connector's uuid as a server name. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (e) => UUID.test(e);
/** c9081d688 m: `e.scope==="dynamic"&&e.origin==="desktop"` (the host has none). */
const isDesktopDynamic = (e) => e.scope === "dynamic" && e.origin === "desktop";
/** c9081d688 g: a desktop-dynamic stdio server that stopped (its host can still restart it). */
const isRestartable = (e) => isDesktopDynamic(e) && e.transport === "stdio" && e.status === "failed"
  && (e.hostNote === "timeout" || e.hostNote === "other" || e.hostNote === "stopped" || e.hostNote === "not_found");
/** c9081d688 _: `new Map([["project","project"],["user","user"],["local","local"],["flag","local"],["enterprise","managed"],["managed","managed"],["agent","agent"]])`. */
const SCOPE_SOURCES = new Map([["project", "project"], ["user", "user"], ["local", "local"], ["flag", "local"], ["enterprise", "managed"], ["managed", "managed"], ["agent", "agent"]]);
/** c9081d688 D: `new Set(["user","local","managed"])` (the user's own servers). */
const OWN_SOURCES = new Set(["user", "local", "managed"]);

/**
 * shared-52 Ro (`e.match(/^plugin:([^:]+):(.+)$/)` → `{pluginName, connectorName}`, else null). Host: a plugin's server
 * the core lists under its own name with a `pluginId` (`<plugin>@<marketplace>`) is that plugin's connector.
 */
function pluginParts(server) {
  const t = server.name.match(/^plugin:([^:]+):(.+)$/);
  if (t) return { pluginName: t[1], connectorName: t[2] };
  if (server.scope === "plugin" && typeof server.pluginId === "string" && server.pluginId) return { pluginName: server.pluginId.split("@")[0], connectorName: server.name };
  return null;
}

/**
 * c9081d688 v (`function v(t,n,r){let a=[],o=new Map;for(let c of t){let{name:t,transport:f,scope:h}=c;if(h===void 0)continue;…}
 * return a.sort((e,t)=>e.displayName.localeCompare(t.displayName)),{items:a,byConnectorUuid:o}}`): the session's servers
 * as rail items (`known` = the account's connector uuids, `accountPlugins` = c9081d688 y, empty).
 */
export function groupSessionMcpServers(servers, known = new Set(), accountPlugins = new Map()) {
  const a = [], o = new Map();
  for (const c of servers) {
    const { name: t, transport: f, scope: h } = c;
    if (h === undefined) continue;
    const g = f !== undefined && WEB_TRANSPORTS.has(f) ? "web" : "desktop";
    const v = SCOPE_SOURCES.get(h);
    if (v !== undefined) {
      a.push({ id: (c.hostNote === "held_back" ? SESSION_MCP_HELD_BACK : SESSION_MCP) + t, server: c, displayName: mcpDisplayName(t), where: g, source: v });
      continue;
    }
    if (isDesktopDynamic(c)) {
      a.push({ id: (c.status === "unavailable" ? SESSION_MCP_DESKTOP : SESSION_MCP) + t, server: c, displayName: mcpDisplayName(t), where: "desktop", source: "desktop" });
      continue;
    }
    if (f === "claudeai-proxy" || h === "claudeai" || isUuid(t)) {
      if (known.has(t)) o.set(t, c);
      continue;
    }
    const y = pluginParts(c);
    if (y === null) continue;
    const b = accountPlugins.get(t), x = b !== undefined && (b.url !== undefined || g !== "web");
    a.push({ id: SESSION_MCP + t, server: c, displayName: mcpDisplayName(y.connectorName), pluginName: x && b ? b.pluginName : mcpDisplayName(y.pluginName),
      ...(x && b ? { accountPlugin: { url: b.url } } : {}), where: g, source: "plugin" });
  }
  a.sort((e, t) => e.displayName.localeCompare(t.displayName));
  return { items: a, byConnectorUuid: o };
}
/** c9081d688 x (yJ's `ob`): `e!==void 0&&(e.length===0||e.some(e=>e.scope!==void 0))`. */
const listKnown = (e) => e !== undefined && (e.length === 0 || e.some((s) => s.scope !== undefined));
/** c9081d688 C (yJ's `rb`): `[...n.items.map(e=>e.server),...n.byConnectorUuid.values()]`. */
const listedServers = (e, t) => { const n = groupSessionMcpServers(e, t); return [...n.items.map((s) => s.server), ...n.byConnectorUuid.values()]; };
/** c9081d688 E (yJ's `$y`): `S([e],b).items[0]?.id`, a session server's grouped id. */
export const sessionMcpTargetId = (e) => groupSessionMcpServers([e]).items[0]?.id;
/** c9081d688 k (yJ's `eb`): an account connector's key, when the scope is none of `_` and `t` knows the name. */
const accountKey = (e, t) => (e.scope !== undefined && !SCOPE_SOURCES.has(e.scope) && !isDesktopDynamic(e) && t.has(e.name) ? e.name : undefined);
/** c9081d688 O (yJ's `nb`): one of the user's own servers. */
function isOwnServer(e, t) {
  if (e.scope === undefined) return false;
  const n = SCOPE_SOURCES.get(e.scope);
  return n === undefined ? accountKey(e, t) !== undefined : OWN_SOURCES.has(n);
}
/** c9081d688 A (yJ's `ib`): `(n===void 0?void 0:t.get(n))??i(e.name)`. */
function shownName(e, t) {
  const n = accountKey(e, t);
  return (n === undefined ? undefined : t.get(n)) ?? mcpDisplayName(e.name);
}
/** c227f4d5e rJ: `n!==void 0 ? (e.status==="failed"?void 0:{kind:"account",id:n}) : r=$y(e), r===void 0?void 0:{kind:"session",id:r}`. */
function connectorTarget(e, t) {
  const n = accountKey(e, t);
  if (n !== undefined) return e.status === "failed" ? undefined : { kind: "account", id: n };
  const r = sessionMcpTargetId(e);
  return r === undefined ? undefined : { kind: "session", id: r };
}
/** c227f4d5e sJ: `e===void 0?"":`${e.kind}:${encodeURIComponent(e.id)}``, "" when the id cannot be encoded. */
export function encodeConnectorTarget(e) {
  try { return e === undefined ? "" : `${e.kind}:${encodeURIComponent(e.id)}`; } catch { return ""; }
}

/**
 * A host row's CLI scope: the one the customize operation put on the server (customize-operations mcpScope), else the
 * same fallback — a plugin's server, an untrusted folder's project connector, or the core's own configuration ("user").
 */
export function hostMcpScope(row) {
  if (typeof row?.scope === "string" && row.scope) return row.scope;
  if ((typeof row?.pluginId === "string" && row.pluginId) || /^plugin:[^:]+:.+$/.test(String(row?.name ?? ""))) return "plugin";
  return row?.kind === "trust" || row?.trust ? "project" : "user";
}

/**
 * yJ's counts (2.42304.0 Cd) for `sessionId` from the Customize store's `mcp` slice, or null when the host has no list to
 * give (the core could not answer). While the slice is loading, or holds another session's list, the answer is _J.
 */
export function sessionMcpCounts(mcp, sessionId) {
  if (!mcp || typeof sessionId !== "string" || !sessionId) return NO_SESSION_MCP_COUNTS;
  if ((mcp.threadId ?? null) !== sessionId) return NO_SESSION_MCP_COUNTS;
  if (mcp.status === "error") return null;
  if (mcp.status !== "ready") return NO_SESSION_MCP_COUNTS;
  // yJ's `i` (the session's sdkMcpServers): the host rows as CLI servers.
  const i = (Array.isArray(mcp.rows) ? mcp.rows : []).filter((row) => row && typeof row.name === "string" && row.name)
    .map((row) => ({ name: row.name, status: sdkStatus(row), scope: hostMcpScope(row), ...(typeof row.pluginId === "string" && row.pluginId ? { pluginId: row.pluginId } : {}) }));
  // `if(!ob(i))return _J`.
  if (!listKnown(i)) return NO_SESSION_MCP_COUNTS;
  // yJ's account maps (f known uuids, p connector names, m shown names, h icons) come from a claude.ai account's
  // connector directory; the host has none. `n` (not to reconnect, TN's `S = rb(b)`) is a remote session's: empty.
  const f = new Set(), p = new Map(), m = new Map(), h = new Map(), n = new Set();
  const a = listedServers(i, f);
  // `o=wJ` (`tb(e)&&e.hostNote!=="not_found"`), `s`, `c=CJ` (needs-auth / failed), `l` (to reconnect but held off).
  const o = (e) => isRestartable(e) && e.hostNote !== "not_found";
  const s = (e) => o(e) && e.pendingAction !== undefined;
  const c = (e) => e.status === "needs-auth" || e.status === "failed";
  const l = (e) => c(e) && n.has(e.name);
  const u = a.filter((e) => c(e) && !l(e) && (!isDesktopDynamic(e) || (o(e) && !s(e))));
  const d = u.filter((e) => isOwnServer(e, f));
  const g = new Set(u);
  const _ = new Set(a.filter((e) => e.status === "unavailable" || (e.status === "failed" && isDesktopDynamic(e) && !l(e) && !g.has(e))));
  const v = (e) => { const t = accountKey(e, f); return t === undefined ? undefined : h.get(t); };
  return {
    count: a.length,
    needReconnect: u.length,
    unavailable: _.size + a.filter(l).length,
    reconnectOwnNames: d.map((e) => shownName(e, p).replace(/\s+/g, " ")).join("\n"),
    reconnectOwnToolPrefixes: d.map((e) => toolPrefix(e.name)).join("\n"),
    reconnectOwnShownNames: d.map((e) => shownName(e, m).replace(/\s+/g, " ")).join("\n"),
    listedNames: a.map((e) => shownName(e, m).replace(/\s+/g, " ")).join("\n"),
    listedStates: a.map((e) => (g.has(e) ? e.status : _.has(e) ? "unavailable" : "")).join("\n"),
    listedIconTypes: a.map((e) => (v(e)?.type ?? "").replace(/\s+/g, "")).join("\n"),
    listedIconSrcs: a.map((e) => (v(e)?.src ?? "").replace(/\s+/g, "")).join("\n"),
    listedTargets: a.map((e) => encodeConnectorTarget(connectorTarget(e, p))).join("\n"),
    // `vJ(a.map(xJ), i.map(bJ))`: the listed servers' prefixes against every server the session has.
    listedToolPrefixes: listedToolPrefixes(a.map((e) => e.name), i.map((e) => e.name)),
  };
}

/** yJ's hold (2.42304.0 Cd's): the counts shown for `sessionId`, keeping the previous known ones while the new list is pending. */
export function heldMcpCounts(previous, sessionId, counts) {
  if (counts === null) return { id: sessionId, counts: null, shown: null };
  const same = previous?.id === sessionId;
  const next = !same || (counts.count !== null && counts !== previous.counts) ? { id: sessionId, counts } : previous;
  return { ...next, shown: counts.count !== null || !same ? counts : next.counts };
}

/**
 * cf74bc599 NA (TN's `Xe`) without a claude.ai connector directory (`So()` false): a row's target opens `fallback` with
 * a session target's id, anything else with undefined.
 */
export function openConnectorTarget(target, fallback) {
  fallback(target?.kind === "session" ? target.id : undefined);
}

/**
 * The host's stand-in for the session MCP dialog the opener above reaches (cc43287c9 `iv = e => {… ev({rowId: e})}`, set
 * as the scope store's openSessionMcpDialog: the dialog opens with that server's row selected). The host has no session
 * MCP dialog; its Customize › Connectors page opens one connector by `customize-connectors#<encoded name>` (main's Add
 * menu rows use the same page). A grouped id `session-mcp:<name>` (c9081d688 E, `l="session-mcp:"`) opens that server's
 * page; no id (the Context card's MCP tools row), or an id the host never makes (desktop / held-back groups), the list.
 * w11-sweep-ccres.
 */
export function sessionMcpSettingsPage(id) {
  const name = typeof id === "string" && id.startsWith("session-mcp:") ? id.slice("session-mcp:".length) : "";
  return name ? `customize-connectors#${encodeURIComponent(name)}` : "customize-connectors";
}

/**
 * cf74bc599 PA (TN's `Ze = PA(Ue ? We : C)`), the Context card's `mcpToolOpener`: `(i ? dp({listedToolPrefixes,
 * listedTargets}) : []).map(…)` with `i = So()` (a claude.ai account's connector directory), then
 * `e => o.find(t => e.startsWith(t.prefix))?.open`. Without a directory (the host) the list is empty, so every MCP tool
 * row answers undefined (no "Manage connector" press); one stable function, as PA's memo over the empty list.
 */
const NO_MCP_TOOL_OPENERS = Object.freeze([]);
export const NO_MCP_TOOL_OPENER = (tool) => NO_MCP_TOOL_OPENERS.find((e) => tool.startsWith(e.prefix))?.open;

/** TN `Qe` over the shown counts: Zj's `connectors` prop, or undefined without an opener or a source. */
export function railConnectors(counts, onOpen, connectorRows, labelOf) {
  if (!onOpen || !counts) return undefined;
  return { count: counts.count, needReconnect: counts.needReconnect, unavailable: counts.unavailable,
    // V3-w5-session-rail-gen (R4/E7): 3.6556.2 yj also splits `targets` (TN passes `e.counts.listedTargets`);
    // V3-w10-ccres-rail-connectors: each listed server's `session:<grouped id>` (no account connectors on the host).
    servers: connectorRows({ names: counts.listedNames, states: counts.listedStates, iconTypes: counts.listedIconTypes, iconSrcs: counts.listedIconSrcs,
      targets: counts.listedTargets ?? "", labelOf }),
    // V3-w6-rail-host (panes:C1-9): TN `onOpen: t => Xe(t, e.onOpen)`; rM's row passes its target.
    onOpen: (target) => openConnectorTarget(target, onOpen) };
}
