// Longitudinal run analytics: where summarize-run reads ONE journal and fleet
// status reads ONE moment, compare-runs reads MANY journals over time — what
// each run cost, how reliably it completed, and how the same workflow trends
// run-over-run. Pure beyond reading the run files (clock injectable); the CLI
// lives in bin/compare-runs.js.

import { statSync } from "node:fs";
import { basename } from "node:path";
import { resolveTargets, fmtTokens, fmtAgo } from "./fleetStatus.js";
import { summarizeRun } from "./runSummary.js";
import { locateRun } from "./runModel.js";

// Group key: the workflow's name. Prefer the script's meta.name (shared across
// --run-id variants); fall back to the journal basename with the extension and
// any `--<run-id>` suffix stripped, so hunt--a / hunt--b roll up as `hunt`.
function groupName(summaryName, journalPath) {
  if (summaryName) return String(summaryName).replace(/--[\w.-]+$/, "");
  const base = basename(journalPath).replace(/\.workflow\.jsonl$|\.jsonl$/i, "");
  return base.replace(/--[\w.-]+$/, "");
}

export function collectComparison(targets, { now = Date.now() } = {}) {
  const rows = [];
  for (const journal of resolveTargets(targets)) {
    let s;
    try {
      s = summarizeRun({ journalPath: journal, scriptPath: locateRun({ journal }).scriptPath });
    } catch {
      continue; // unreadable journal — not comparable
    }
    const journaled = s.counts?.journaledAgents ?? 0;
    if (!journaled) continue; // empty journal (a run that never completed an agent)
    let when = 0;
    try { when = statSync(journal).mtimeMs; } catch {}
    // "ok" = agents that produced a result, judged by the reliability-filtered
    // null count (a race loser cancelled BY DESIGN is not a failure); fall back
    // to the raw completed count for journals where that's unavailable.
    const nullResults = s.counts?.nullResults;
    const completed = nullResults != null ? journaled - nullResults : s.counts?.completedAgents ?? null;
    rows.push({
      name: groupName(s.name, journal),
      journal,
      when,
      agoMs: when ? Math.max(0, now - when) : null,
      agents: journaled,
      completionRate: completed != null ? completed / journaled : null,
      nullResults: s.counts?.nullResults ?? null,
      cached: s.counts?.cachedAgents ?? null,
      sessions: s.counts?.sessionWorkers ?? (s.sessions || []).length,
      // tokens this run actually executed (resume replays excluded) when the
      // event sidecar can tell; the journal's all-in total otherwise
      tokensRun: s.metrics?.executedTokens ?? s.metrics?.totalTokens ?? 0,
      tokensAllIn: s.metrics?.totalTokens ?? 0,
      wallMs: s.metrics?.runWallMs ?? null,
      agentMs: s.metrics?.totalAgentMs ?? null,
      budget: s.budget ? { total: s.budget.total, fraction: s.budget.fraction } : null,
      warnings: (s.warnings || []).length,
    });
  }
  rows.sort((a, b) => b.when - a.when);

  const groups = new Map();
  for (const r of rows) {
    const g = groups.get(r.name) || { name: r.name, runs: [] };
    g.runs.push(r); // rows are newest-first, so runs[0] is the latest
    groups.set(r.name, g);
  }
  const rollups = [...groups.values()].map((g) => {
    const runs = g.runs;
    const avgTokens = runs.reduce((s, r) => s + r.tokensRun, 0) / runs.length;
    const rated = runs.filter((r) => r.completionRate != null);
    const completion = rated.length ? rated.reduce((s, r) => s + r.completionRate, 0) / rated.length : null;
    const trendPct =
      runs.length >= 2 && runs[1].tokensRun > 0 ? (runs[0].tokensRun - runs[1].tokensRun) / runs[1].tokensRun : null;
    return { name: g.name, runs: runs.length, avgTokens, completion, trendPct, lastAgoMs: runs[0].agoMs };
  });
  rollups.sort((a, b) => b.runs - a.runs || (a.lastAgoMs ?? 0) - (b.lastAgoMs ?? 0));
  return { rows, rollups };
}

const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
const padE = (s, n) => String(s).slice(0, n).padEnd(n);
const padS = (s, n) => String(s).slice(0, n).padStart(n);

export function renderComparisonText({ rows, rollups }) {
  if (!rows.length) return "compare-runs: no journaled runs found under the given targets";
  const L = [];
  L.push(`compare-runs: ${rows.length} run${rows.length === 1 ? "" : "s"} · ${rollups.length} workflow${rollups.length === 1 ? "" : "s"}`);
  L.push("");
  L.push(padE("workflow", 26) + padS("when", 9) + padS("agents", 8) + padS("ok", 6) + padS("cached", 8) + padS("tokens", 9) + padS("wall", 9) + "  flags");
  for (const r of rows) {
    const flags = [];
    if (r.budget && r.budget.fraction >= 1) flags.push("over-budget");
    else if (r.budget && r.budget.fraction >= 0.8) flags.push("budget≥80%");
    if (r.nullResults) flags.push(`${r.nullResults} null`);
    if (r.warnings) flags.push(`${r.warnings} warn`);
    L.push(
      padE(r.name, 26) +
        padS(r.agoMs != null ? fmtAgo(r.agoMs) : "—", 9) +
        padS(r.agents + (r.sessions ? `(${r.sessions}w)` : ""), 8) +
        padS(pct(r.completionRate), 6) +
        padS(r.cached ?? "—", 8) +
        padS(fmtTokens(r.tokensRun), 9) +
        padS(r.wallMs != null ? fmtAgo(r.wallMs) : r.agentMs != null ? "Σ" + fmtAgo(r.agentMs) : "—", 9) +
        (flags.length ? "  ⚠ " + flags.join(" · ") : ""),
    );
  }
  const repeated = rollups.filter((g) => g.runs >= 2);
  if (repeated.length) {
    L.push("");
    L.push("run-over-run (same workflow):");
    for (const g of repeated) {
      const trend =
        g.trendPct == null
          ? ""
          : ` · latest vs prev: ${g.trendPct >= 0 ? "+" : ""}${Math.round(g.trendPct * 100)}% tokens`;
      L.push(`  ${g.name} — ${g.runs} runs · avg ${fmtTokens(Math.round(g.avgTokens))} tok/run · ${pct(g.completion)} ok${trend}`);
    }
  }
  L.push("");
  L.push("tokens = the run's own executed spend where the event sidecar can tell (resume replays excluded), else the journal's all-in total. Details per run: summarize-run --journal <path>.");
  return L.join("\n");
}
