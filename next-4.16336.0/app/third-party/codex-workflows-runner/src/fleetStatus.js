// Fleet supervision: roll the state of MANY concurrent workflow runs into one
// digest cheap enough for a supervising agent (or a human in a hurry) to poll —
// who's running, who's stalled, who's waiting on an answer, who finished and
// what they returned. This is the read side of the supervisor loop; the write
// side is `fleet answer` (the human()/checkpoint channel) plus kill/--resume.
//
// Pure beyond reading the run's files: the clock and pid-liveness check are
// injectable so tests can stage every state deterministically. The CLI lives in
// bin/fleet.js.

import { existsSync, statSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { listJournals, buildLiveRunModel, readRunMeta, resultPathFor, progressPathFor } from "./runModel.js";

export function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM"; // alive, owned by someone else
  }
}

// Resolve status targets (run dirs and/or journal paths; default cwd) to a
// deduped list of journal paths. A directory contributes ALL of its journals —
// a fleet is "every run in this directory", which is why fleet variants share
// one dir: one `fleet status <dir>` supervises the whole fleet.
export function resolveTargets(targets) {
  const list = targets && targets.length ? targets : [process.cwd()];
  const out = [];
  const seen = new Set();
  for (const t of list) {
    const abs = resolve(t);
    const paths = abs.endsWith(".jsonl") ? [abs] : listJournals(abs).map((j) => j.path);
    for (const p of paths) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  return out;
}

// One run's supervision view. State is derived, not guessed:
//   completed — a result sidecar written by THIS run (mtime >= meta.startedAt)
//   running   — the recorded pid is alive
//   stopped   — it started (meta exists) but the pid is gone and there's no
//               fresh result: killed, crashed, or budget-tripped → resumable
//   idle      — journal only (predates the pid/startedAt meta, or sidecars gone)
export function inspectRun(journalPath, { now = Date.now(), stallAfterMs = 120_000, isAlive = pidAlive } = {}) {
  const meta = readRunMeta(journalPath);
  const scriptPath = meta?.script && existsSync(meta.script) ? meta.script : null;
  const run = buildLiveRunModel({ journalPath, scriptPath });

  let resultAt = null;
  try {
    const rp = resultPathFor(journalPath);
    if (existsSync(rp)) resultAt = statSync(rp).mtimeMs;
  } catch {}
  const startedAt = meta?.startedAt ?? null;

  let state;
  if (resultAt != null && (startedAt == null || resultAt >= startedAt)) state = "completed";
  else if (meta && isAlive(meta.pid)) state = "running";
  else if (meta) state = "stopped";
  else state = "idle";

  const running = run.agents.filter((a) => a.status === "running");
  const done = run.agents.length - running.length;
  const currentPhase = running[0]?.phase ?? run.agents[run.agents.length - 1]?.phase ?? null;
  const phaseIndex = currentPhase ? run.phases.findIndex((p) => p.title === currentPhase) : -1;

  // Unanswered human() questions — the supervisor's to answer. (A timed-out
  // question is marked answered by the runner: the default was used; too late.)
  const pendingQuestions = (run.questions || [])
    .filter((q) => !q.answered)
    .map((q) => ({
      id: q.id,
      qid: q.qid ?? null,
      question: q.question ?? "",
      choices: Array.isArray(q.choices) ? q.choices : null,
      default: q.default ?? null,
      askedAgoMs: typeof q.askedAt === "number" ? Math.max(0, now - q.askedAt) : null,
    }));

  // Stall = a live pid with no observable activity for stallAfterMs. Activity is
  // more than lifecycle events (those only fire at agent start/end — a long
  // single layer is silent there for minutes): a STREAMING agent rewrites the
  // progress sidecar continuously, and a completing agent appends the journal.
  // Take the freshest of all three (floored at startedAt). A run blocked on a
  // pending question is WAITING, not stalled — flag it as such.
  let progressAt = 0, journalAt = 0;
  try { const pp = progressPathFor(journalPath); if (existsSync(pp)) progressAt = statSync(pp).mtimeMs; } catch {}
  try { journalAt = statSync(journalPath).mtimeMs; } catch {}
  const lastActivityAt =
    Math.max(run.live?.lastEventAt ?? 0, progressAt, journalAt, startedAt ?? 0) || null;
  const lastActivityAgoMs = lastActivityAt != null ? Math.max(0, now - lastActivityAt) : null;
  const stalled =
    state === "running" && !pendingQuestions.length && lastActivityAgoMs != null && lastActivityAgoMs > stallAfterMs;

  const tokens = run.totals?.tokens ?? 0;
  const budget = meta?.budget ?? null;

  return {
    journal: journalPath,
    name: run.name,
    runId: meta?.runId ?? null,
    script: scriptPath ?? meta?.script ?? null,
    pid: meta?.pid ?? null,
    state,
    startedAt,
    ageMs: startedAt != null ? Math.max(0, (state === "completed" && resultAt != null ? resultAt : now) - startedAt) : null,
    endedAgoMs: state === "completed" && resultAt != null ? Math.max(0, now - resultAt) : null,
    phase: currentPhase,
    phaseProgress: phaseIndex >= 0 ? { index: phaseIndex + 1, total: run.phases.length } : null,
    agents: { done, running: running.length, total: run.agents.length },
    sessions: run.sessions?.length ?? 0,
    tokens,
    budget,
    overBudget: budget != null && tokens >= budget,
    pendingQuestions,
    stalled,
    lastActivityAgoMs,
    needsAttention: pendingQuestions.length > 0 || stalled || state === "stopped" || (budget != null && tokens >= budget),
    result: state === "completed" ? run.result : undefined,
  };
}

export function inspectFleet(targets, opts = {}) {
  return resolveTargets(targets).map((j) => inspectRun(j, opts));
}

// ── rendering ────────────────────────────────────────────────────────────────

export function fmtTokens(n) {
  if (n == null) return "?";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 10e6 ? 0 : 1) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return String(n);
}

export function fmtAgo(ms) {
  if (ms == null) return "?";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${String(m % 60).padStart(2, "0")}m`;
}

const GLYPH = { running: "▶", completed: "✔", stopped: "■", idle: "·" };

// Compact, token-frugal text digest. One line per run + one line per condition
// that needs the supervisor's attention; nothing else.
export function renderFleetText(infos, { resultChars = 220 } = {}) {
  if (!infos.length) return "fleet: no runs found (no .workflow-journal/*.jsonl under the given targets)";
  const lines = [];
  const counts = { running: 0, completed: 0, stopped: 0, idle: 0 };
  let attention = 0;
  for (const r of infos) {
    counts[r.state] = (counts[r.state] || 0) + 1;
    if (r.needsAttention) attention++;
  }
  const head = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(" · ");
  lines.push(`fleet: ${infos.length} run${infos.length === 1 ? "" : "s"} — ${head}${attention ? `  ⚠ ${attention} need${attention === 1 ? "s" : ""} attention` : ""}`);
  lines.push("");

  for (const r of infos) {
    const name = r.runId && !String(r.name).includes(String(r.runId)) ? `${r.name} (${r.runId})` : r.name;
    const bits = [];
    if (r.state === "running") bits.push(`running ${fmtAgo(r.ageMs)}`);
    else if (r.state === "completed") bits.push(`completed${r.endedAgoMs != null ? ` ${fmtAgo(r.endedAgoMs)} ago` : ""}`);
    else if (r.state === "stopped") bits.push(`stopped WITHOUT a result (pid ${r.pid ?? "?"} gone — killed/crashed/budget; resumable)`);
    else bits.push("idle (journal only)");
    if (r.phase && r.phaseProgress) bits.push(`phase ${r.phase} (${r.phaseProgress.index}/${r.phaseProgress.total})`);
    bits.push(r.agents.running ? `${r.agents.done} done + ${r.agents.running} running` : `${r.agents.done} agents`);
    if (r.sessions) bits.push(`${r.sessions} worker${r.sessions === 1 ? "" : "s"}`);
    bits.push(`${fmtTokens(r.tokens)} tok${r.budget != null ? ` / ${fmtTokens(r.budget)} budget` : ""}`);
    lines.push(`${GLYPH[r.state] ?? "?"} ${name} — ${bits.join(" · ")}`);

    for (const q of r.pendingQuestions) {
      const choices = q.choices ? `  choices: ${q.choices.join("|")}` : "";
      const def = q.default != null ? `  default: ${q.default}` : "";
      lines.push(`  ⚠ waiting ${fmtAgo(q.askedAgoMs)} on [${q.id}] “${q.question}”${choices}${def}`);
      lines.push(`    → fleet.js answer --journal ${r.journal} --id '${q.id}' --answer '<text>'`);
    }
    if (r.stalled) lines.push(`  ⚠ stalled — no activity for ${fmtAgo(r.lastActivityAgoMs)} (kill the process, then --resume; or keep waiting)`);
    if (r.overBudget) lines.push(`  ⚠ at/over budget — ${fmtTokens(r.tokens)} of ${fmtTokens(r.budget)} journaled`);
    if (r.state === "completed" && r.result !== undefined) {
      let s;
      try { s = JSON.stringify(r.result); } catch { s = String(r.result); }
      if (s && s.length > resultChars) s = s.slice(0, resultChars) + "…";
      lines.push(`  result: ${s}`);
    }
    if (r.state === "stopped") lines.push(`    → resume: run-workflow.js ${r.script ?? "<script>"} --resume --journal ${r.journal} [same flags]`);
  }
  return lines.join("\n");
}

// ── HTML dashboard ───────────────────────────────────────────────────────────
// One self-contained card-per-run page for a HUMAN watching the fleet (the
// text/--json digests are the agent surface). Auto-refreshes while any run is
// live; links each run to its generated viewer page when one exists.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATE_COLOR = { running: "#e8b339", completed: "#4cc38a", stopped: "#e5484d", idle: "#8b8d98" };

export function renderFleetHtml(infos, { title = "fleet" } = {}) {
  const anyRunning = infos.some((r) => r.state === "running");
  const counts = {};
  for (const r of infos) counts[r.state] = (counts[r.state] || 0) + 1;
  const head = Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(" · ") || "no runs";
  const attention = infos.filter((r) => r.needsAttention).length;

  const cards = infos.map((r) => {
    const color = STATE_COLOR[r.state] ?? "#8b8d98";
    const name = r.runId && !String(r.name).includes(String(r.runId)) ? `${r.name} (${r.runId})` : r.name;
    // Link to the run's generated viewer page if one exists next to the run dir.
    const runDir = dirname(dirname(r.journal));
    const viewerName = basename(r.journal).replace(/\.jsonl$/i, "") + ".run.html";
    const viewerHref = existsSync(join(runDir, viewerName)) ? viewerName : null;

    const bits = [];
    if (r.state === "running") bits.push(`running ${fmtAgo(r.ageMs)}`);
    else if (r.state === "completed") bits.push(`completed${r.endedAgoMs != null ? ` ${fmtAgo(r.endedAgoMs)} ago` : ""}`);
    else if (r.state === "stopped") bits.push("stopped without a result — resumable");
    else bits.push("idle");
    if (r.phase && r.phaseProgress) bits.push(`phase ${esc(r.phase)} (${r.phaseProgress.index}/${r.phaseProgress.total})`);
    bits.push(r.agents.running ? `${r.agents.done} done + ${r.agents.running} running` : `${r.agents.done} agents`);
    if (r.sessions) bits.push(`${r.sessions} worker${r.sessions === 1 ? "" : "s"}`);
    bits.push(`${fmtTokens(r.tokens)} tok${r.budget != null ? ` / ${fmtTokens(r.budget)} budget` : ""}`);

    const warns = [];
    for (const q of r.pendingQuestions) {
      warns.push(
        `<div class="q"><div class="qhead">⚠ waiting ${fmtAgo(q.askedAgoMs)} on <b>[${esc(q.id)}]</b></div>` +
          `<div class="qtext">${esc(q.question)}</div>` +
          (q.choices ? `<div class="qmeta">choices: ${esc(q.choices.join(" | "))}${q.default != null ? ` · default: ${esc(q.default)}` : ""}</div>` : "") +
          `<code>fleet.js answer --journal ${esc(r.journal)} --id '${esc(q.id)}' --answer '&lt;text&gt;'</code></div>`,
      );
    }
    if (r.stalled) warns.push(`<div class="q">⚠ stalled — no activity for ${fmtAgo(r.lastActivityAgoMs)}</div>`);
    if (r.overBudget) warns.push(`<div class="q">⚠ at/over budget — ${fmtTokens(r.tokens)} of ${fmtTokens(r.budget)}</div>`);
    if (r.state === "stopped") warns.push(`<div class="q">→ resume: <code>run-workflow.js ${esc(r.script ?? "&lt;script&gt;")} --resume --journal ${esc(r.journal)}</code></div>`);

    let resultHtml = "";
    if (r.state === "completed" && r.result !== undefined) {
      let s;
      try { s = JSON.stringify(r.result, null, 1); } catch { s = String(r.result); }
      if (s && s.length > 1200) s = s.slice(0, 1200) + "…";
      resultHtml = `<pre class="result">${esc(s)}</pre>`;
    }

    return (
      `<div class="card" style="border-left-color:${color}">` +
      `<div class="chead"><span class="dot" style="background:${color}"></span><b>${esc(name)}</b>` +
      `<span class="state" style="color:${color}">${r.state}</span>` +
      (viewerHref ? ` <a href="${esc(viewerHref)}">open run viewer →</a>` : "") +
      `</div><div class="cmeta">${bits.join(" · ")}</div>${warns.join("")}${resultHtml}</div>`
    );
  });

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
${anyRunning ? '<meta http-equiv="refresh" content="3">' : ""}
<title>${esc(title)} — fleet</title>
<style>
  body{background:#0f1115;color:#e6e6ea;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:920px;margin:24px auto;padding:0 16px}
  h1{font-size:18px;font-weight:600} h1 small{color:#8b8d98;font-weight:400;margin-left:10px}
  .card{background:#16181d;border:1px solid #26282f;border-left:3px solid;border-radius:8px;padding:12px 14px;margin:10px 0}
  .chead{display:flex;align-items:center;gap:8px} .chead a{color:#6ea8fe;text-decoration:none;margin-left:auto;font-size:13px}
  .dot{width:9px;height:9px;border-radius:50%;display:inline-block}
  .state{font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .cmeta{color:#a5a8b3;font-size:13px;margin-top:3px}
  .q{background:#1d1a13;border:1px solid #3a3220;border-radius:6px;padding:8px 10px;margin-top:8px;font-size:13px}
  .qtext{margin:4px 0;white-space:pre-wrap} .qmeta{color:#a5a8b3;font-size:12px}
  code{display:block;background:#0f1115;border-radius:4px;padding:6px 8px;margin-top:6px;font:12px ui-monospace,Menlo,monospace;color:#9ecbff;overflow-x:auto;white-space:pre}
  .result{background:#10141a;border:1px solid #1f2a37;border-radius:6px;padding:8px 10px;margin:8px 0 0;font:12px ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#bfe3c0;max-height:260px;overflow:auto}
  footer{color:#5c5f6a;font-size:12px;margin-top:16px}
</style></head><body>
<h1>fleet: ${infos.length} run${infos.length === 1 ? "" : "s"} <small>${esc(head)}${attention ? ` · ⚠ ${attention} need${attention === 1 ? "s" : ""} attention` : ""}</small></h1>
${cards.join("\n")}
<footer>${anyRunning ? "live — refreshes every 3s" : "all runs terminal — static"} · generated by fleet.js status --html</footer>
</body></html>`;
}
