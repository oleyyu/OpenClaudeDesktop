import { t, getLocale, getAssistantName } from "../electron/i18n/index.mjs";
// Composer usage trigger copy and context ring (2.2553.1).
// shared-14-BOJVa-jT.js:9700-9793: iT/oT/sT compact token format, dT thresholds
// (lT 75 / uT 90), pT fill vars, xT ring (yT 12, bT 2), ST summary.
// c360a9e1c-GPs-MV9u.js:4065-4295 hd/_d: ge tooltip, le ringPct, Se aria-label.
// The plan-limit meter (md planWindow/planPct/planResets) comes from the core's
// account/rateLimits/read (Codex); a core without plan limits leaves fe/T null and
// the tooltip detail (be joined by " · ") empty; nothing is invented for it.

// shared-14 oT(e, sT): >=1e9 B; >=1e6 M (rolls to B at 1000M); >=1e3 k (rolls
// to M); else String(e). sT drops a trailing ".0".
const trimZero = (value) => (value.endsWith(".0") ? value.slice(0, -2) : value);
export function compactTokens(value) {
  if (value >= 1e9) return `${trimZero((value / 1e9).toFixed(1))}B`;
  if (value >= 1e6) {
    const millions = Number((value / 1e6).toFixed(1));
    return millions >= 1e3 ? `${trimZero((value / 1e9).toFixed(1))}B` : `${trimZero(millions.toFixed(1))}M`;
  }
  if (value >= 1e3) {
    const thousands = Number((value / 1e3).toFixed(1));
    return thousands >= 1e3 ? `${trimZero((value / 1e6).toFixed(1))}M` : `${trimZero(thousands.toFixed(1))}k`;
  }
  return String(value);
}

// shared-14 dT (critical >=90, warning >=75, else normal) mapped through hT to
// the CDS fill names; pT = va.fill.{accent,warning,danger}.cssVar.
export const CONTEXT_WARNING_PCT = 75, CONTEXT_CRITICAL_PCT = 90;
export function contextThreshold(pct) {
  return pct >= CONTEXT_CRITICAL_PCT ? "danger" : pct >= CONTEXT_WARNING_PCT ? "warning" : "accent";
}
export const contextRingStroke = (pct) => `var(--cds-fill-${contextThreshold(pct)})`;
// _d icon Xr trackStroke: an.alpha[2].cssVar.
export const CONTEXT_RING_TRACK = "var(--cds-alpha-2)";
// 2.42304.0 (composer-row-chin): the row chin passes the usage popover a ring size (c227f4d5e bQ `ringSize: Le ? 14 :
// void 0`), as the environment bar's ring does (c73f45bc3 Y_ `ringSize: 14`); a sized ring sits on the alpha-4 track
// (yZ `trackStroke: c === void 0 ? "var(--cds-alpha-2)" : "var(--cds-alpha-4)"`) in Fa's `flex shrink-0 ms-px` slot.
// The svg itself is the generated shared-8 KV (generated/code-composer/usage-ring.mjs).
export const CONTEXT_RING_ROW_SIZE = 14;
export const CONTEXT_RING_ROW_TRACK = "var(--cds-alpha-4)";
export const contextRingTrack = (ringSize) => (ringSize === undefined ? CONTEXT_RING_TRACK : CONTEXT_RING_ROW_TRACK);

// shared-14 xT: size yT 12, stroke bT 2, r=(size-stroke)/2, C=2πr,
// dashoffset C·(1−clamp(pct,0,100)/100).
export const CONTEXT_RING_SIZE = 12, CONTEXT_RING_STROKE = 2;
export function contextRingGeometry(pct, size = CONTEXT_RING_SIZE) {
  const radius = (size - CONTEXT_RING_STROKE) / 2, circumference = 2 * Math.PI * radius;
  return { size, stroke: CONTEXT_RING_STROKE, center: size / 2, radius, circumference,
    offset: circumference * (1 - Math.max(0, Math.min(100, pct)) / 100) };
}

// shared-14 ST(used, max, allowOver=false). hd passes allowOver only when the
// fetched report is fresh and live contextTokens is null (l===null&&v?.stale===!1);
// the app has no such report, so callers keep the default.
export function contextSummary(used, max, allowOver = false) {
  if (max === null || max === undefined || (used > max && !allowOver)) return { summary: compactTokens(used), contextPct: null };
  const pct = Math.round(Math.max(0, Math.min(1, used / max)) * 100);
  return { summary: `${compactTokens(used)} / ${compactTokens(max)} (${pct}%)`, contextPct: pct };
}

// hd: P = usage !== null; Y = !P && (sessionRef === null || spawnedFresh);
// ie = P || Y; K = live/usage tokens ?? 0; G = window ?? null;
// ge = ie ? 'Context {summary}' : 'Usage'; le = ie ? (contextPct ?? 0) : planPct ?? 0;
// Se = ie ? 'Usage: ' + formatList([ge, ...details], unit) : formatList([ge]).
// usage is the thread tokenUsage (thread/tokenUsage/updated): used =
// last.totalTokens, max = modelContextWindow. fresh = the composer has no
// session yet (sessionRef null); locally the draft/New composer.
// plan: the core's plan-limit window (usage-model planUsageSummary top, from account/rateLimits/read and its
// account/rateLimits/updated merges): { summary: hd fe ('{pct}% of 5-hour limit' / '{limit}: {pct}%'), resets: hd T,
// percent }. With it the tooltip detail is [fe, T] and, without context, the ring shows the plan percent (hd le).
export function usageTriggerCopy(usage, { fresh = false, plan = null } = {}) {
  const used = usage?.last?.totalTokens;
  const hasUsage = Number.isFinite(used);
  const details = [plan?.summary ?? null, plan?.resets ?? null].filter(Boolean);
  const list = (parts) => new Intl.ListFormat(getLocale(), { type: "unit" }).format(parts);
  if (!hasUsage && !fresh) {
    const label = t("Usage");
    return { tooltip: label, ariaLabel: list([label, ...details]), ringPct: Number.isFinite(plan?.percent) ? plan.percent : 0, contextPct: null, detail: details.length ? details.join(" · ") : null };
  }
  const max = hasUsage && usage.modelContextWindow > 0 ? usage.modelContextWindow : null;
  const { summary, contextPct } = contextSummary(hasUsage ? used : 0, max);
  const tooltip = t("Context {summary}", { summary });
  return { tooltip, ariaLabel: t("Usage: {parts}", { parts: list([tooltip, ...details]) }), ringPct: contextPct ?? 0, contextPct, detail: details.length ? details.join(" · ") : null };
}

// Usage popover panel (c2d611398-m3q28S31.js I/V over c360a9e1c hd :4065-4232): contextMode = ie || re || c
// with ie = P || Y. Locally P is a thread tokenUsage report and Y the no-session draft; there is no remote
// "no data" branch (re) and no contextOnly surface (c), so V's noData copy never applies and the summary/pct
// are hd's Jr(K, G) over last.totalTokens (0 for the draft) / modelContextWindow.
export function usagePanelCopy(usage, { fresh = false } = {}) {
  const used = usage?.last?.totalTokens;
  const hasUsage = Number.isFinite(used);
  if (!hasUsage && !fresh) return { contextMode: false, summary: null, contextPct: null };
  const max = hasUsage && usage.modelContextWindow > 0 ? usage.modelContextWindow : null;
  return { contextMode: true, ...contextSummary(hasUsage ? used : 0, max) };
}

// Usage popover compact action (ion-dist cf6ae6197-cAiw4Nch.js Tw minPct 50 → bw/xw, Ow; c360a9e1c-GPs-MV9u.js
// :4136-4139 hd ae/oe → gd onCompact, :4225-4231 gd → Ga): below minPct (or with no pct) the row is hidden; while
// compacting it is hidden; a detached session gives 'Available when reconnected', an armed/responding turn
// 'Available when Claude finishes this turn' (the agent here is DeepSeek); otherwise the action is enabled. The
// 'Compacts automatically at {pct}%' hint (Cw) needs the core's auto-compact threshold, which is unknown locally.
export const COMPACT_MIN_PCT = 50;
// The 'Compacts automatically at {pct}%' threshold: a core that reports its auto-compact token limit (thread/tokenUsage
// codeDesktop.autoCompactTokens) against the context window, else Codex's own rule (protocol openai_models.rs
// auto_compact_token_limit: 90% of the context window unless config.toml lowers it), else unknown (null).
export function autoCompactPercent(core, usage) {
  const window = usage?.modelContextWindow;
  const limit = usage?.codeDesktop?.autoCompactTokens;
  if (Number.isFinite(limit) && limit > 0 && Number.isFinite(window) && window > 0) return Math.max(1, Math.min(100, Math.round((limit / window) * 100)));
  const engine = typeof core === "string" ? core : core?.engine;
  return engine === "codex" || (!engine && core?.id === "codex") ? 90 : null;
}
// The usage popover's compact hint (ca80fca8d aH/oH :21799-21842, shown by dH in the compact row): the tokens left
// before the core compacts on its own. nH's limit is the core's reported auto-compact token limit
// (codeDesktop.autoCompactTokens), else Codex's rule (90% of the window), else none. Below rH (30,000 tokens) the
// hint is 'Auto-compacts soon'; otherwise iH keeps two significant digits (floor) and fd/compactTokens formats them.
export const AUTO_COMPACT_SOON_TOKENS = 3e4;
export function autoCompactLimit(core, usage) {
  const window = usage?.modelContextWindow;
  if (!(Number.isFinite(window) && window > 0)) return null;
  const limit = usage?.codeDesktop?.autoCompactTokens;
  if (Number.isFinite(limit) && limit > 0) return limit < window ? limit : null;
  const engine = typeof core === "string" ? core : core?.engine;
  return engine === "codex" || (!engine && core?.id === "codex") ? Math.floor(window * 0.9) : null;
}
export function roundAutoCompactTokens(value) {
  const whole = Math.floor(value), unit = 10 ** (String(whole).length - 2);
  return Math.floor(whole / unit) * unit;
}
export function autoCompactHint(core, usage) {
  const limit = autoCompactLimit(core, usage), used = usage?.last?.totalTokens;
  if (limit === null || !Number.isFinite(used)) return { kind: "none" };
  const left = limit - used;
  if (!Number.isFinite(left)) return { kind: "none" };
  return left < AUTO_COMPACT_SOON_TOKENS ? { kind: "soon" } : { kind: "left", tokens: roundAutoCompactTokens(left) };
}
export function autoCompactHintText(hint) {
  if (hint?.kind === "left") return t("{tokens} until auto-compact", { tokens: compactTokens(hint.tokens) });
  if (hint?.kind === "soon") return t("Auto-compacts soon");
  return undefined;
}
// Names the running core's assistant (OpenCode, Codex, Kimi…), read when the reason is shown.
export const compactReplyingReason = (assistant = getAssistantName()) => t("Available when {assistant} finishes this turn", { assistant });
export const COMPACT_RECONNECT_REASON = t("Available when reconnected");
export function compactAction({ contextPct = null, running = false, connected = true, compacting = false, minPct = COMPACT_MIN_PCT } = {}) {
  if (contextPct === null || contextPct === undefined || !Number.isFinite(contextPct) || contextPct < minPct || compacting) return { kind: "hidden" };
  if (!connected) return { kind: "disabled", reason: COMPACT_RECONNECT_REASON };
  if (running) return { kind: "disabled", reason: compactReplyingReason() };
  return { kind: "enabled" };
}
