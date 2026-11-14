// Run summary: read a workflow run's journal (+ optional event / result / meta
// sidecars) and distill a cost / performance / reliability report. Pure beyond
// the file reads it inherits from runModel.js, and it NEVER writes the journal.
//
// Data sources (all optional except the journal):
//   <name>.jsonl          the resume journal — completed agents (deduped by key),
//                         each with phase/model/effort/tokens/ms when available.
//   <name>.events.jsonl   lifecycle stream of the MOST RECENT run — gives true
//                         wall-clock per phase, cache replays, and interrupted
//                         (started-but-never-finished) agents.
//   <name>.result.json    the workflow's actual return value (for --include-result).
//   <name>.meta.json      run-level facts the journal can't carry: budget + meter,
//                         pinned model, effort policy, sandbox.
//
// Old journals that predate the per-agent metric fields still summarize: phases,
// model and effort are recovered from the script (via buildRunModel), and any
// genuinely-missing metric becomes a "lower bound" note rather than a crash.

import { buildRunModel, readEvents, liveState, readRunMeta } from "./runModel.js";

// ── formatting (matches asciiMap.js / the viewer vocabulary) ─────────────────
export function fmtTokens(n) {
  if (n == null) return null;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return String(n);
}
export function fmtMs(ms) {
  if (ms == null) return null;
  const sec = ms / 1000;
  if (sec < 60) return (sec < 10 ? sec.toFixed(1) : String(Math.round(sec))) + "s";
  const total = Math.round(sec); // round to whole seconds first, then split (no 1m60s)
  return Math.floor(total / 60) + "m" + String(total % 60).padStart(2, "0") + "s";
}
const pct = (n) => (n == null ? null : Math.round(n * 100) + "%");

// Unambiguous one-line agent breakdown. When every recorded agent returned a
// result and nothing was interrupted, "N completed" says it all; otherwise it
// splits "recorded → ok / null" so the null count never reads as additive.
function agentBreakdown(c) {
  const parts = [];
  // Reconcile to journaledAgents: only say "N completed" when EVERY recorded agent
  // actually completed. Any non-completed recorded entry (genuine null, a cancelled
  // or interrupted session turn) forces the explicit "recorded / ok / …" split, so
  // the word "completed" is never attached to a count that includes a failed turn.
  if (c.completedAgents < c.journaledAgents || c.interruptedAgents) {
    parts.push(`${c.journaledAgents} recorded`, `${c.completedAgents} ok`);
    if (c.nullResults) parts.push(`${c.nullResults} null`);
  } else {
    parts.push(`${c.journaledAgents} completed`);
  }
  if (c.cancelledTurns) parts.push(`${c.cancelledTurns} cancelled`); // race losers — by design
  if (c.interruptedTurns) parts.push(`${c.interruptedTurns} interrupted`); // session turns interrupted (not by us)
  if (c.interruptedAgents) parts.push(`${c.interruptedAgents} unfinished`); // started, never settled (killed run)
  if (c.cachedAgents) parts.push(`${c.cachedAgents} cached`);
  return parts.join(" · ");
}

// A label looks auto-generated (a prompt slice, not an explicit "kind:id") when it
// has no ":" grouping AND reads like prose (whitespace) or is long.
function looksUnlabeled(label) {
  if (typeof label !== "string" || !label) return false;
  if (label.includes(":")) return false;
  return /\s/.test(label) || label.length > 40;
}
// The catch-all phase buildRunModel assigns when an agent has no phase signal.
const isUnphased = (phase) => !phase || phase === "Agents";
// An effort-less agent inherits the user's Codex config or the selected model's
// default. buildRunModel normalizes a missing effort to null.
const isDefaultEffort = (effort) => effort == null || effort === "default";

// ── core: build the structured summary ──────────────────────────────────────
export function summarizeRun({ journalPath, scriptPath = null, runDir = null, title = null, includeResult = false } = {}) {
  const run = buildRunModel({ journalPath, scriptPath, runDir, title });
  const agents = run.agents || [];
  const events = readEvents(journalPath); // null when no sidecar
  const meta = readRunMeta(journalPath); // null when no sidecar

  // ── sessionful workers (per-worker rollups from the run model) ──
  const sessions = run.sessions || [];
  const sessionTurns = sessions.reduce((s, w) => s + w.turns.length, 0);
  const steerTurns = sessions.reduce((s, w) => s + Math.max(0, w.turns.length - 1), 0);
  const cancelledTurns = sessions.reduce((s, w) => s + w.turns.filter((t) => t.status === "cancelled").length, 0);
  const failedTurns = sessions.reduce((s, w) => s + w.turns.filter((t) => t.status === "failed").length, 0);
  // A session turn journaled "interrupted" (settled, not cancelled-by-us) — distinct
  // from event-derived interruptedAgents (started, never settled). Both are by-design
  // nulls; counted so the agent breakdown reconciles to journaledAgents.
  const interruptedTurns = sessions.reduce((s, w) => s + w.turns.filter((t) => t.status === "interrupted").length, 0);
  // A cancelled/interrupted session turn returns null BY DESIGN (races cut their
  // losers) — keep those out of the null-result reliability signal.
  const isExpectedNull = (a) => a.kind === "session" && (a.turnStatus === "cancelled" || a.turnStatus === "interrupted");

  // ── per-agent classification ──
  const journaled = agents.length;
  const nullResults = agents.filter((a) => a.result == null && !isExpectedNull(a)).length;
  const completed = journaled - agents.filter((a) => a.result == null).length;
  const withTokens = agents.filter((a) => typeof a.tokens === "number").length;
  const withMs = agents.filter((a) => typeof a.ms === "number").length;
  const totalTokens = agents.reduce((s, a) => s + (a.tokens || 0), 0);
  const totalAgentMs = agents.reduce((s, a) => s + (a.ms || 0), 0);

  // ── event-derived signals (most recent run only; null without the sidecar) ──
  let cachedAgents = null, interruptedAgents = null, runWallMs = null, executedThisRun = null, executedTokens = null;
  const phaseWall = new Map(); // phase -> { minStart, maxEnd }
  if (events) {
    const ls = liveState(events);
    cachedAgents = events.filter((e) => e.type === "cached" && e.kind !== "human").length; // human() replays aren't agents
    executedThisRun = events.filter((e) => e.type === "start").length;
    interruptedAgents = ls ? ls.running.length : 0; // started, never ended → the run is over, so: interrupted
    runWallMs = ls && ls.runStartedAt != null && ls.lastEventAt != null ? ls.lastEventAt - ls.runStartedAt : null;
    // Tokens actually spent in the MOST RECENT run: agents that finished this run
    // (a non-cached 'end'), matched to journal entries by stable id (label fallback
    // for pre-id events). This separates a resume's all-in journal total from what
    // the latest run alone cost — cached replays spend 0.
    const endedIds = new Set(events.filter((e) => e.type === "end").map((e) => e.id ?? e.label));
    executedTokens = endedIds.size
      ? agents.filter((a) => endedIds.has(a.id) || endedIds.has(a.label)).reduce((s, a) => s + (a.tokens || 0), 0)
      : 0;
    for (const e of events) {
      if (typeof e.t !== "number" || !e.phase) continue;
      const w = phaseWall.get(e.phase) || { minStart: Infinity, maxEnd: 0 };
      if (e.type === "start") w.minStart = Math.min(w.minStart, e.t);
      if (e.type === "end" || e.type === "cached") w.maxEnd = Math.max(w.maxEnd, e.t);
      phaseWall.set(e.phase, w);
    }
  }
  const interrupted = interruptedAgents || 0;
  const totalAgents = journaled + interrupted;

  // ── aggregates by phase / model / effort ──
  const phaseTitles = (run.phases || []).map((p) => p.title);
  for (const a of agents) if (!phaseTitles.includes(a.phase)) phaseTitles.push(a.phase);
  const byPhase = phaseTitles.map((phase) => {
    const inPhase = agents.filter((a) => a.phase === phase);
    const w = phaseWall.get(phase);
    const wallMs = w && w.minStart !== Infinity && w.maxEnd ? w.maxEnd - w.minStart : null;
    return {
      phase,
      agents: inPhase.length,
      tokens: inPhase.reduce((s, a) => s + (a.tokens || 0), 0),
      agentMs: inPhase.reduce((s, a) => s + (a.ms || 0), 0),
      wallMs,
    };
  }).filter((p) => p.agents > 0);

  const modelMap = new Map();
  for (const a of agents) {
    const k = a.model || "(unspecified)";
    const m = modelMap.get(k) || { model: k, agents: 0, tokens: 0 };
    m.agents++; m.tokens += a.tokens || 0; modelMap.set(k, m);
  }
  const byModel = [...modelMap.values()].sort((a, b) => b.agents - a.agents || b.tokens - a.tokens);

  const effortMap = new Map();
  for (const a of agents) {
    const k = isDefaultEffort(a.effort) ? "default" : a.effort;
    const e = effortMap.get(k) || { effort: k, agents: 0, tokens: 0 };
    e.agents++; e.tokens += a.tokens || 0; effortMap.set(k, e);
  }
  const byEffort = [...effortMap.values()].sort((a, b) => b.agents - a.agents);

  // ── top N (only agents that carry the metric) ──
  // Session turns share their worker's label — disambiguate with the turn index.
  const displayLabel = (a) => (a.kind === "session" && a.turn != null ? `${a.label} · t${a.turn}` : a.label);
  const topByTokens = agents.filter((a) => typeof a.tokens === "number")
    .sort((a, b) => b.tokens - a.tokens).slice(0, 10)
    .map((a) => ({ label: displayLabel(a), phase: a.phase, model: a.model || null, tokens: a.tokens }));
  const topByMs = agents.filter((a) => typeof a.ms === "number")
    .sort((a, b) => b.ms - a.ms).slice(0, 10)
    .map((a) => ({ label: displayLabel(a), phase: a.phase, model: a.model || null, ms: a.ms }));

  // ── budget usage (only when the meta sidecar carries a ceiling) ──
  // The ceiling applies to a SINGLE run's spend (the meter resets each invocation).
  // With the event sidecar we bill the latest run's executed tokens (basis
  // "latest-run"); without it we fall back to the journal's all-in total and label
  // it "all-in-journal", since on a resumed run that over-counts this run's spend.
  let budget = null;
  if (meta && typeof meta.budget === "number" && meta.budget > 0) {
    const haveExecuted = events && executedTokens != null;
    const spent = haveExecuted ? executedTokens : totalTokens;
    budget = {
      total: meta.budget,
      meter: meta.budgetMeter || "total",
      spent,
      basis: haveExecuted ? "latest-run" : "all-in-journal",
      allInTokens: totalTokens, // Σ over the whole journal (across resumes)
      remaining: Math.max(0, meta.budget - spent),
      fraction: spent / meta.budget,
    };
  }

  // ── cache hit rate (a resume: the event sidecar holds cached replays) ──
  let cache = null;
  if (events && cachedAgents != null && (cachedAgents > 0)) {
    const touched = cachedAgents + (executedThisRun || 0);
    cache = { cached: cachedAgents, executed: executedThisRun || 0, touched, fraction: touched ? cachedAgents / touched : 0 };
  }

  // ── warnings (ordered warn-before-info in the renderers) ──
  const warnings = [];
  const warn = (code, message) => warnings.push({ code, level: "warn", message });
  const info = (code, message) => warnings.push({ code, level: "info", message });

  if (journaled === 0) {
    warn("empty-run", "No completed agents found in the journal — nothing to summarize yet.");
  }
  // missing metrics
  if (journaled > 0 && withTokens < journaled) {
    const missing = journaled - withTokens;
    const msg = `${missing} of ${journaled} agents have no token metrics — totals, costliest-agent, and budget figures are a lower bound (older journal or a metric-less run).`;
    withTokens === 0 ? warn("missing-metrics", msg) : info("missing-metrics", msg);
  }
  // null / interrupted
  const nullFrac = journaled ? nullResults / journaled : 0;
  if (nullResults >= 3 || (nullResults >= 2 && nullFrac >= 0.2)) {
    warn("many-null-results", `${nullResults} of ${journaled} agents returned a null result — agents may be failing or returning nothing usable.`);
  } else if (nullResults > 0) {
    info("null-results", `${nullResults} agent(s) returned a null result.`);
  }
  if (interrupted > 0) {
    warn("interrupted-agents", `${interrupted} agent(s) started but never finished in the most recent run (interrupted, failed, or killed). Resume to complete them — finished agents replay free.`);
  }
  // sessionful workers: failed turns are a real reliability signal (cancelled is not)
  if (failedTurns > 0) {
    warn("session-turn-failures", `${failedTurns} session turn(s) FAILED — check the worker snapshots' error fields. Sessions are live-only: a --resume re-runs them (one-shot agents still replay free).`);
  }
  // unphased
  const unphased = agents.filter((a) => isUnphased(a.phase)).length;
  if (unphased > 0) {
    const msg = `${unphased} of ${journaled} agents aren't attributed to a phase (no phase()/opts.phase and no "kind:" label prefix) — they're grouped under "Agents".`;
    (unphased === journaled && journaled > 1) ? warn("unphased-agents", msg) : info("unphased-agents", msg);
  }
  // unlabeled
  const unlabeled = agents.filter((a) => looksUnlabeled(a.label)).length;
  if (unlabeled > 0) {
    info("unlabeled-agents", `${unlabeled} of ${journaled} agents have no explicit label (showing a prompt slice) — pass label:"kind:id" for readable maps and reports.`);
  }
  // single phase with huge fan-out
  const HUGE = 12;
  if (byPhase.length > 0) {
    const biggest = byPhase.reduce((m, p) => (p.agents > m.agents ? p : m), byPhase[0]);
    const dominates = byPhase.length === 1 || biggest.agents / journaled > 0.8;
    if (dominates && biggest.agents >= HUGE) {
      warn("single-phase-fanout", `Phase "${biggest.phase}" fans out ${biggest.agents} agents with no further structure — consider staging it (e.g. find → verify) or capping the fan-out.`);
    }
  }
  // implicit effort makes cost and behavior depend on local config/model defaults
  const defaultEffort = agents.filter((a) => isDefaultEffort(a.effort)).length;
  if (defaultEffort > 0) {
    const msg = `${defaultEffort} of ${journaled} agents ran with no explicit effort → they inherit the user's Codex config or the model default. Use --auto-effort or --effort for predictable cost and behavior.`;
    (defaultEffort >= 4 || defaultEffort / journaled >= 0.5) ? warn("default-effort-cost", msg) : info("default-effort-cost", msg);
  }
  // budget pressure
  if (budget && budget.fraction >= 0.8) {
    warn("budget-pressure", `Budget ${pct(budget.fraction)} used (${fmtTokens(budget.spent)} of ${fmtTokens(budget.total)} ${budget.meter} tokens)${budget.fraction >= 1 ? " — at or over the ceiling." : "."}`);
  }
  // explain absent sections
  if (!events) {
    info("no-events", "No event sidecar for this run — wall-clock per phase, cache hit rate, and interrupted-agent detection are unavailable.");
  }

  const summary = {
    name: run.name,
    description: run.description || "",
    sources: {
      journal: journalPath,
      script: run.sources?.script || null,
      runDir: run.sources?.runDir || runDir || null,
      events: !!events,
      result: run.result !== undefined,
      meta: !!meta,
    },
    counts: {
      totalAgents,
      journaledAgents: journaled,
      completedAgents: completed,
      nullResults,
      cachedAgents,
      interruptedAgents,
      phases: byPhase.length,
      sessionWorkers: sessions.length,
      sessionTurns,
      steerTurns,
      cancelledTurns,
      failedTurns,
      interruptedTurns,
    },
    sessions: sessions.map((w) => ({
      id: w.id, label: w.label, phase: w.phase, model: w.model || null,
      turns: w.turns.length, tokens: w.tokens || null, ms: w.ms || null, status: w.status,
    })),
    metrics: {
      hasMetrics: !!(run.totals && run.totals.hasMetrics),
      agentsWithTokens: withTokens,
      agentsWithMs: withMs,
      totalTokens, // Σ over the whole journal — all-in across resumes
      executedTokens, // tokens spent in the most recent run only (null without events)
      totalAgentMs,
      runWallMs,
    },
    budget,
    policy: meta
      ? { model: meta.model ?? null, autoEffort: !!meta.autoEffort, pinEffort: meta.pinEffort ?? null, sandbox: meta.sandbox ?? null }
      : null,
    byPhase,
    byModel,
    byEffort,
    topByTokens,
    topByMs,
    cache,
    warnings,
    generatedAt: run.generatedAt,
  };
  if (includeResult && run.result !== undefined) summary.result = run.result;
  return summary;
}

// ── one-line result preview, for the text/markdown reports ───────────────────
function resultPreview(r) {
  if (r == null) return "null";
  if (typeof r !== "object") return String(r).slice(0, 200);
  const s = r.one_line_verdict || r.tagline || r.recommended_direction || r.headline ||
    (r.hero && r.hero.headline) || r.summary ||
    (typeof r.reportMarkdown === "string" ? r.reportMarkdown.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) : null);
  if (s) return String(s).slice(0, 200);
  try { return JSON.stringify(r).slice(0, 200); } catch { return "[unserializable result]"; }
}

// ── text renderer ────────────────────────────────────────────────────────────
const W = 74;
const rule = (ch = "─") => ch.repeat(W);
function section(title) {
  const head = `── ${title} `;
  return head + "─".repeat(Math.max(0, W - head.length));
}
const padE = (s, n) => { s = String(s); return s.length >= n ? s : s + " ".repeat(n - s.length); };
const padS = (s, n) => { s = String(s); return s.length >= n ? s : " ".repeat(n - s.length) + s; };
const truncE = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : padE(s, n); };

export function renderSummaryText(s, { includeResult = false } = {}) {
  const L = [];
  L.push(rule("━"));
  L.push("  Run summary · " + s.name);
  if (s.description) L.push("  " + truncE(s.description, W - 2).trimEnd());
  L.push(rule("━"));
  L.push("");

  // headline counts
  const c = s.counts, m = s.metrics;
  L.push("  " + padE("Agents", 12) + agentBreakdown(c));
  if (c.sessionWorkers) {
    L.push("  " + padE("Workers", 12) +
      `${c.sessionWorkers} sessionful (${c.sessionTurns} turn${c.sessionTurns === 1 ? "" : "s"}` +
      (c.steerTurns ? `, ${c.steerTurns} steer${c.steerTurns === 1 ? "" : "s"}` : "") + ")");
  }
  L.push("  " + padE("Phases", 12) + String(c.phases));
  const resumed = m.executedTokens != null && m.executedTokens !== m.totalTokens;
  if (m.totalTokens) L.push("  " + padE("Tokens", 12) + `${fmtTokens(m.totalTokens)}   (${m.totalTokens.toLocaleString()})${resumed ? "  all-in across resumes" : ""}`);
  if (resumed) L.push("  " + padE("Executed", 12) + `${fmtTokens(m.executedTokens)}   (most recent run; the rest replayed from cache)`);
  if (m.totalAgentMs) L.push("  " + padE("Agent-time", 12) + `${fmtMs(m.totalAgentMs)}   (Σ per-agent durations, not wall-clock)`);
  if (m.runWallMs) L.push("  " + padE("Wall-clock", 12) + `${fmtMs(m.runWallMs)}   (most recent run, from the event stream)`);
  if (s.budget) {
    const b = s.budget;
    const basis = b.basis === "latest-run" ? "this run" : "journaled all-in total";
    L.push("  " + padE("Budget", 12) + `${fmtTokens(b.spent)} / ${fmtTokens(b.total)} ${b.meter} (${pct(b.fraction)} used · ${fmtTokens(b.remaining)} left) · ${basis}`);
  }
  if (s.cache) L.push("  " + padE("Cache", 12) + `${pct(s.cache.fraction)} hit (${s.cache.cached} replayed / ${s.cache.touched} touched) — resumed run`);

  // by phase
  if (s.byPhase.length) {
    L.push(""); L.push(section("By phase"));
    const hasWall = s.byPhase.some((p) => p.wallMs != null);
    L.push("  " + padE("PHASE", 16) + padS("AGENTS", 7) + padS("TOKENS", 10) + padS("AGENT-TIME", 12) + (hasWall ? padS("WALL", 9) : ""));
    for (const p of s.byPhase) {
      L.push("  " + truncE(p.phase, 16) + padS(String(p.agents), 7) +
        padS(fmtTokens(p.tokens) ?? "·", 10) + padS(fmtMs(p.agentMs) ?? "·", 12) +
        (hasWall ? padS(p.wallMs != null ? fmtMs(p.wallMs) : "·", 9) : ""));
    }
  }

  // sessionful workers: one row per worker (turns folded; cost is the warm-thread total)
  if (s.sessions && s.sessions.length) {
    L.push(""); L.push(section("Sessionful workers"));
    L.push("  " + padE("WORKER", 18) + padE("PHASE", 14) + padS("TURNS", 6) + padS("TOKENS", 9) + padS("TIME", 9) + "  STATUS");
    for (const w of s.sessions) {
      L.push("  " + truncE(w.label, 18) + truncE(w.phase ?? "", 14) + padS(String(w.turns), 6) +
        padS(fmtTokens(w.tokens) ?? "·", 9) + padS(fmtMs(w.ms) ?? "·", 9) + "  " + w.status);
    }
  }

  // costliest by tokens
  if (s.topByTokens.length) {
    L.push(""); L.push(section("Costliest agents (by tokens)"));
    s.topByTokens.forEach((a, i) => {
      L.push("  " + padS(i + 1 + ".", 4) + " " + padS(fmtTokens(a.tokens), 7) + "  " + truncE(a.label, 28) + " " + truncE(a.phase, 14) + " " + (a.model || ""));
    });
  }
  // slowest by ms
  if (s.topByMs.length) {
    L.push(""); L.push(section("Slowest agents (by time)"));
    s.topByMs.forEach((a, i) => {
      L.push("  " + padS(i + 1 + ".", 4) + " " + padS(fmtMs(a.ms), 7) + "  " + truncE(a.label, 28) + " " + truncE(a.phase, 14) + " " + (a.model || ""));
    });
  }

  // models + effort
  if (s.byModel.length) {
    L.push(""); L.push(section("Models"));
    for (const x of s.byModel) L.push("  " + truncE(x.model, 18) + padS(`${x.agents} agent${x.agents === 1 ? "" : "s"}`, 12) + (x.tokens ? "   " + fmtTokens(x.tokens) + " tok" : ""));
  }
  if (s.byEffort.length) {
    L.push(""); L.push(section("Effort"));
    for (const x of s.byEffort) L.push("  " + truncE(x.effort, 18) + padS(`${x.agents} agent${x.agents === 1 ? "" : "s"}`, 12) + (x.tokens ? "   " + fmtTokens(x.tokens) + " tok" : ""));
  }

  // policy
  if (s.policy) {
    const p = s.policy, bits = [];
    if (p.model) bits.push("model " + p.model);
    if (p.autoEffort) bits.push("auto-effort");
    if (p.pinEffort) bits.push("pin-effort " + p.pinEffort);
    if (p.sandbox) bits.push("sandbox " + p.sandbox);
    if (bits.length) { L.push(""); L.push(section("Run policy")); L.push("  " + bits.join(" · ")); }
  }

  // result preview
  if (includeResult && s.result !== undefined) {
    L.push(""); L.push(section("Result"));
    L.push("  " + truncE(resultPreview(s.result), W - 2).trimEnd());
  }

  // warnings + notes
  const warns = s.warnings.filter((w) => w.level === "warn");
  const notes = s.warnings.filter((w) => w.level === "info");
  if (warns.length) {
    L.push(""); L.push(section("Warnings"));
    for (const w of warns) L.push(wrapBullet("⚠ ", w.message));
  }
  if (notes.length) {
    L.push(""); L.push(section("Notes"));
    for (const w of notes) L.push(wrapBullet("· ", w.message));
  }
  L.push("");
  return L.join("\n");
}

// wrap a bullet's text to the report width, hanging-indented under the glyph.
function wrapBullet(glyph, text) {
  const indent = "  " + glyph;
  const cont = "    ";
  const max = W - cont.length;
  const words = String(text).split(/\s+/);
  const out = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > max) { out.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) out.push(line);
  return out.map((l, i) => (i === 0 ? indent : cont) + l).join("\n");
}

// ── markdown renderer ─────────────────────────────────────────────────────────
export function renderSummaryMarkdown(s, { includeResult = false } = {}) {
  const L = [];
  const c = s.counts, m = s.metrics;
  L.push(`# Run summary — ${s.name}`);
  if (s.description) L.push("", `_${s.description}_`);
  L.push("");
  L.push("| Metric | Value |");
  L.push("| :--- | :--- |");
  L.push(`| Agents | ${agentBreakdown(c)} |`);
  if (c.sessionWorkers) L.push(`| Workers | ${c.sessionWorkers} sessionful (${c.sessionTurns} turns${c.steerTurns ? `, ${c.steerTurns} steers` : ""}) |`);
  L.push(`| Phases | ${c.phases} |`);
  const resumed = m.executedTokens != null && m.executedTokens !== m.totalTokens;
  if (m.totalTokens) L.push(`| Tokens | ${fmtTokens(m.totalTokens)} (${m.totalTokens.toLocaleString()})${resumed ? ", all-in across resumes" : ""} |`);
  if (resumed) L.push(`| Executed (latest run) | ${fmtTokens(m.executedTokens)} |`);
  if (m.totalAgentMs) L.push(`| Agent-time | ${fmtMs(m.totalAgentMs)} (Σ per-agent durations) |`);
  if (m.runWallMs) L.push(`| Wall-clock | ${fmtMs(m.runWallMs)} (most recent run) |`);
  if (s.budget) L.push(`| Budget | ${fmtTokens(s.budget.spent)} / ${fmtTokens(s.budget.total)} ${s.budget.meter} (${pct(s.budget.fraction)} used · ${s.budget.basis === "latest-run" ? "this run" : "all-in"}) |`);
  if (s.cache) L.push(`| Cache | ${pct(s.cache.fraction)} hit (${s.cache.cached}/${s.cache.touched}) |`);

  if (s.byPhase.length) {
    const hasWall = s.byPhase.some((p) => p.wallMs != null);
    L.push("", "## By phase", "");
    L.push(`| Phase | Agents | Tokens | Agent-time${hasWall ? " | Wall" : ""} |`);
    L.push(`| :--- | ---: | ---: | ---:${hasWall ? " | ---:" : ""} |`);
    for (const p of s.byPhase) {
      L.push(`| ${p.phase} | ${p.agents} | ${fmtTokens(p.tokens) ?? "·"} | ${fmtMs(p.agentMs) ?? "·"}${hasWall ? ` | ${p.wallMs != null ? fmtMs(p.wallMs) : "·"}` : ""} |`);
    }
  }
  if (s.sessions && s.sessions.length) {
    L.push("", "## Sessionful workers", "");
    L.push("| Worker | Phase | Turns | Tokens | Time | Status |");
    L.push("| :--- | :--- | ---: | ---: | ---: | :--- |");
    for (const w of s.sessions) {
      L.push(`| \`${w.label}\` | ${w.phase ?? ""} | ${w.turns} | ${fmtTokens(w.tokens) ?? "·"} | ${fmtMs(w.ms) ?? "·"} | ${w.status} |`);
    }
  }
  if (s.topByTokens.length) {
    L.push("", "## Costliest agents (by tokens)", "");
    L.push("| # | Tokens | Agent | Phase | Model |");
    L.push("| ---: | ---: | :--- | :--- | :--- |");
    s.topByTokens.forEach((a, i) => L.push(`| ${i + 1} | ${fmtTokens(a.tokens)} | \`${a.label}\` | ${a.phase} | ${a.model || ""} |`));
  }
  if (s.topByMs.length) {
    L.push("", "## Slowest agents (by time)", "");
    L.push("| # | Time | Agent | Phase | Model |");
    L.push("| ---: | ---: | :--- | :--- | :--- |");
    s.topByMs.forEach((a, i) => L.push(`| ${i + 1} | ${fmtMs(a.ms)} | \`${a.label}\` | ${a.phase} | ${a.model || ""} |`));
  }
  if (s.byModel.length || s.byEffort.length) {
    L.push("", "## Models & effort", "");
    if (s.byModel.length) L.push("Models: " + s.byModel.map((x) => `${x.model} ×${x.agents}${x.tokens ? ` (${fmtTokens(x.tokens)})` : ""}`).join(" · "));
    if (s.byEffort.length) L.push("", "Effort: " + s.byEffort.map((x) => `${x.effort} ×${x.agents}${x.tokens ? ` (${fmtTokens(x.tokens)})` : ""}`).join(" · "));
  }
  if (s.policy) {
    const p = s.policy, bits = [];
    if (p.model) bits.push("model `" + p.model + "`");
    if (p.autoEffort) bits.push("auto-effort");
    if (p.pinEffort) bits.push("pin-effort `" + p.pinEffort + "`");
    if (p.sandbox) bits.push("sandbox `" + p.sandbox + "`");
    if (bits.length) L.push("", "## Run policy", "", bits.join(" · "));
  }
  if (includeResult && s.result !== undefined) {
    L.push("", "## Result", "", resultPreview(s.result));
  }
  const warns = s.warnings.filter((w) => w.level === "warn");
  const notes = s.warnings.filter((w) => w.level === "info");
  if (warns.length) { L.push("", "## Warnings", ""); for (const w of warns) L.push(`- ⚠️ ${w.message}`); }
  if (notes.length) { L.push("", "## Notes", ""); for (const w of notes) L.push(`- ${w.message}`); }
  L.push("");
  return L.join("\n");
}

// ── compact end-of-run block, printed by run-workflow.js ─────────────────────
// Deliberately quiet for tiny runs: one line for ≤2 agents, a short phase table
// otherwise. Returns "" when there is nothing worth printing.
export function renderEndOfRun(s, { reportCmd = null } = {}) {
  if (s.counts.journaledAgents === 0) return "";
  const m = s.metrics;
  const totals = [
    `${s.counts.journaledAgents} agent${s.counts.journaledAgents === 1 ? "" : "s"}`,
    s.counts.sessionWorkers ? `${s.counts.sessionWorkers} worker${s.counts.sessionWorkers === 1 ? "" : "s"}` : null,
    s.counts.phases > 1 ? `${s.counts.phases} phases` : null,
    m.totalTokens ? fmtTokens(m.totalTokens) + " tok" : null,
    m.runWallMs ? fmtMs(m.runWallMs) : (m.totalAgentMs ? fmtMs(m.totalAgentMs) + " agent-time" : null),
  ].filter(Boolean).join(" · ");
  const warns = s.warnings.filter((w) => w.level === "warn");
  const L = [];
  L.push(`Σ ${totals}`);
  // a short per-phase line for non-trivial runs (keeps tiny runs to one line)
  if (s.counts.journaledAgents > 2 && s.byPhase.length > 1) {
    for (const p of s.byPhase) {
      L.push("  " + truncE(p.phase, 16) + padS(String(p.agents), 4) + "  " +
        padS(fmtTokens(p.tokens) ?? "·", 7) + "  " + padS(fmtMs(p.wallMs ?? p.agentMs) ?? "·", 8));
    }
  }
  if (warns.length) L.push(`  ⚠ ${warns.length} warning${warns.length === 1 ? "" : "s"} — see the full report`);
  if (reportCmd) L.push(`  full report: ${reportCmd}`);
  return L.join("\n");
}
