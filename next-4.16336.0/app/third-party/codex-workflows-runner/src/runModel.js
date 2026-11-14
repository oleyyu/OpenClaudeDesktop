// Shared run-model assembly: read a run's journal (+ optional script) and produce
// the structured model both viewers render — the HTML viewer (bin/view-run.js)
// and the ASCII map (bin/map-run.js). Pure beyond reading the given files, so a
// --watch loop can call buildRunModel() repeatedly as the journal grows.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";

// List a run directory's journals, newest first by mtime, excluding the
// *.events.jsonl and *.answers.jsonl sidecars (both are .jsonl but not runs).
// locateRun uses this to default to the most recent run; the CLIs' --list
// surfaces the choices when a dir has several.
export function listJournals(runDir) {
  const jdir = join(runDir, ".workflow-journal");
  if (!existsSync(jdir)) return [];
  let names;
  try { names = readdirSync(jdir).filter((f) => f.endsWith(".jsonl") && !f.endsWith(".events.jsonl") && !f.endsWith(".answers.jsonl")); } catch { return []; }
  const out = names.map((name) => {
    const path = join(jdir, name);
    let mtimeMs = 0, size = 0;
    try { const st = statSync(path); mtimeMs = st.mtimeMs; size = st.size; } catch {}
    return { path, name, mtimeMs, size };
  });
  out.sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
  return out;
}

// Resolve a --list target (a run dir, a journal path, or undefined → cwd) to its
// run directory and list that directory's journals (newest first). Shared by the
// CLIs so `--list` behaves the same everywhere.
export function listJournalsForTarget(target) {
  if (!target) return listJournals(process.cwd());
  const t = resolve(target);
  if (t.endsWith(".jsonl")) return listJournals(dirname(dirname(t))); // <dir>/.workflow-journal/<j>.jsonl
  return listJournals(t);
}

// Locate the journal + script from a target (dir or journal path) and/or explicit
// --journal/--script overrides. Returns { journalPath, scriptPath, runDir, error }.
export function locateRun({ target, journal, script } = {}) {
  const t = target ? resolve(target) : null;
  let journalPath = journal ? resolve(journal) : null;
  let runDir = null;

  if (!journalPath && t) {
    if (t.endsWith(".jsonl") && existsSync(t)) {
      journalPath = t;
    } else if (existsSync(t)) {
      runDir = t;
      // Multiple journals in one run dir → default to the most recently modified
      // (the latest run). Pass --journal PATH to pick a specific one (--list shows them).
      const journals = listJournals(t);
      if (journals.length) journalPath = journals[0].path;
    }
  }
  // Allow attaching before the first agent completes: the journal file doesn't
  // exist yet, but the events sidecar (running agents) does. Live viewers can
  // render from events alone until the journal appears.
  const eventsExist = journalPath && existsSync(eventsPathFor(journalPath));
  if (!journalPath || (!existsSync(journalPath) && !eventsExist)) {
    return { journalPath: null, scriptPath: null, runDir, error: `No journal found. Looked at: ${journalPath ?? target}` };
  }
  runDir = runDir ?? dirname(dirname(journalPath)); // .workflow-journal/<f> → run dir

  let scriptPath = script ? resolve(script) : null;
  if (!scriptPath) {
    const base = basename(journalPath).replace(/\.jsonl$/, ""); // e.g. design-review.workflow
    for (const cand of [join(runDir, base + ".js"), join(runDir, base)]) {
      if (existsSync(cand)) { scriptPath = cand; break; }
    }
  }
  return { journalPath, scriptPath, runDir, error: null };
}

// Extract the `meta` literal from a workflow script (anchored to line-start so a
// comment mentioning `export const meta` can't shadow the real declaration).
export function extractMeta(src) {
  const m = src.match(/^[ \t]*export[ \t]+const[ \t]+meta[ \t]*=[ \t]*/m);
  if (!m) return null;
  const open = src.indexOf("{", m.index + m[0].length);
  if (open === -1) return null;
  let depth = 0, end = -1;
  for (let j = open; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end === -1) return null;
  try { return new Function("return (" + src.slice(open, end + 1) + ")")(); } catch { return null; }
}

// Pull literal label-prefix / phase / model / effort from each flat agent() opts
// object — the fallback for journals that predate the per-agent metric fields.
function parseAgentSpecs(src) {
  const found = [];
  // Match a flat agent-opts object that contains `label:`. Tolerates one level of
  // nested braces so template-literal labels like `audit:${l.key}` don't break it.
  const re = /\{((?:[^{}]|\{[^{}]*\})*\blabel\s*:(?:[^{}]|\{[^{}]*\})*)\}/g;
  let m;
  const grab = (body, key) => {
    const mm = body.match(new RegExp(key + "\\s*:\\s*[`'\"]([^`'\"$]*)"));
    return mm ? mm[1] : undefined;
  };
  while ((m = re.exec(src))) {
    const labelStart = grab(m[1], "label");
    if (labelStart === undefined) continue;
    found.push({ labelStart, phase: grab(m[1], "phase"), model: grab(m[1], "model"), effort: grab(m[1], "effort") });
  }
  return found;
}

// ── lifecycle events (live observability) ───────────────────────────────────
// The runner optionally writes a sidecar event stream next to the journal:
// {t, type:'start'|'end'|'cached', label, phase, model, effort, tokens, ms}. It's
// separate from the resume journal (purely observational) and lets a live viewer
// show running agents, counts, and true wall-clock.

export function eventsPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".events.jsonl";
}

// The workflow's actual return value, persisted by the runner next to the journal
// so the viewer can show the honest output instead of guessing a "final" agent.
export function resultPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".result.json";
}

export function readResult(journalPath) {
  const p = resultPathFor(journalPath);
  if (!existsSync(p)) return undefined;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return undefined; }
}

// Optional run-level metadata, written once by the runner next to the journal:
// {startedAt, budget, budgetMeter, model, autoEffort, pinEffort, sandbox}. Purely
// informational — lets a post-hoc summary report budget usage and effort policy
// that the journal alone can't carry. Absent for journal-only / older runs.
export function runMetaPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".meta.json";
}

export function readRunMeta(journalPath) {
  const p = runMetaPathFor(journalPath);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// Live partial output for in-flight agents: { label: latest streamed text }. The
// runner rewrites this while agents stream; the viewer shows it for running agents.
export function progressPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".progress.json";
}

// Interactive involvement (`human()`): pending/answered questions, maintained by
// the runner; the live viewer renders unanswered ones as an answer card.
export function questionsPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".questions.json";
}
export function readQuestions(journalPath) {
  const p = questionsPathFor(journalPath);
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")) || []; } catch { return []; }
}
// Answers appended by the viewer's serve endpoint (or by hand / a CLI one-liner):
// one {id, answer} JSON object per line. The runner polls it to resolve human().
export function answersPathFor(journalPath) {
  return journalPath.replace(/\.jsonl$/i, "") + ".answers.jsonl";
}

export function readProgress(journalPath) {
  const p = progressPathFor(journalPath);
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf8")) || {}; } catch { return {}; }
}

export function readEvents(journalPath) {
  const p = eventsPathFor(journalPath);
  if (!existsSync(p)) return null;
  const evs = [];
  try {
    for (const line of readFileSync(p, "utf8").trim().split("\n")) {
      if (!line.trim()) continue;
      try { evs.push(JSON.parse(line)); } catch {}
    }
  } catch {
    return null;
  }
  return evs;
}

// Derive live state from the event stream: which agents are still running (a
// 'start' not yet matched by an 'end'/'cached'), counts, and run wall-clock.
export function liveState(events) {
  if (!events || !events.length) return null;
  // Key by the stable agent id (the journal key, carried on each event); fall back
  // to label for older events that predate ids. Two agents that share a label are
  // then tracked separately, so running/done counts stay correct.
  const byId = new Map(); // id -> { label, starts, ends, lastStartT, phase, model, effort }
  let firstT = Infinity, lastT = 0, ended = 0;
  for (const e of events) {
    if (typeof e.t === "number") { if (e.t < firstT) firstT = e.t; if (e.t > lastT) lastT = e.t; }
    const id = e.id ?? e.label;
    const c = byId.get(id) || { label: e.label, starts: 0, ends: 0, lastStartT: 0 };
    if (e.label) c.label = e.label;
    if (e.type === "start") {
      c.starts++; c.lastStartT = e.t ?? c.lastStartT; c.phase = e.phase; c.model = e.model; c.effort = e.effort;
      // session turns carry worker identity (kind/sessionId/turn) so live viewers
      // can attach a running steer to its worker instead of a fresh agent node.
      if (e.kind === "session") { c.kind = "session"; c.sessionId = e.sessionId ?? null; c.turn = e.turn ?? null; }
    }
    else if (e.type === "end" || e.type === "cached") { c.ends++; ended++; }
    byId.set(id, c);
  }
  const running = [];
  for (const [id, c] of byId) {
    if (c.starts > c.ends) {
      const r = { id, label: c.label, phase: c.phase ?? null, model: c.model ?? null, effort: c.effort ?? null, startedAt: c.lastStartT, status: "running" };
      if (c.kind === "session") { r.kind = "session"; r.sessionId = c.sessionId; r.turn = c.turn; }
      running.push(r);
    }
  }
  return {
    running,
    doneCount: ended,
    runStartedAt: firstT === Infinity ? null : firstT,
    lastEventAt: lastT || null,
  };
}

// Journal/event key for one sessionful-worker turn: `sess:<sessionId>#<turn>`.
const SESS_KEY_RE = /^sess:([^#]+)#(\d+)$/;

// Group the session-turn agents into per-worker rollups: run.sessions =
// [{ id, label, phase, model, effort, order, turns, tokens, ms, status }].
// `turns` lists each turn's agent id + status + metrics in turn order; `status`
// is "running" while any turn is in flight, else the LAST turn's terminal status
// (completed / cancelled / failed / interrupted). Turn agents stay in run.agents
// (they are real units of model work — totals and budget math are unchanged);
// this is the worker-level view both viewers and the summary render.
function attachSessions(run) {
  const byId = new Map();
  for (const a of run.agents) {
    if (a.kind !== "session" || !a.sessionId) continue;
    const s = byId.get(a.sessionId) || {
      id: a.sessionId, label: a.label, phase: a.phase, model: null, effort: null,
      order: a.order, turns: [], tokens: 0, ms: 0, running: false, threadId: null,
    };
    if (a.label) s.label = a.label;
    if (a.model) s.model = a.model;
    if (a.effort != null) s.effort = a.effort;
    if (a.threadId) s.threadId = a.threadId;
    s.order = Math.min(s.order, a.order);
    const running = a.status === "running";
    s.turns.push({
      id: a.id, turn: a.turn ?? s.turns.length,
      status: running ? "running" : a.turnStatus || "completed",
      tokens: a.tokens, ms: a.ms,
    });
    s.tokens += a.tokens || 0;
    s.ms += a.ms || 0;
    if (running) s.running = true;
    byId.set(a.sessionId, s);
  }
  const sessions = [...byId.values()];
  for (const s of sessions) {
    s.turns.sort((x, y) => (x.turn ?? 0) - (y.turn ?? 0));
    s.status = s.running ? "running" : s.turns[s.turns.length - 1]?.status ?? "completed";
    delete s.running;
  }
  sessions.sort((a, b) => a.order - b.order);
  run.sessions = sessions;
  run.counts.sessions = sessions.length;
  return run;
}

export function buildRunModel({ journalPath, scriptPath = null, runDir = null, title = null, generatedAt = null }) {
  // journal is append-only; keep the latest entry per key (resume can re-record).
  // The journal file may not exist yet — a live viewer can attach before the
  // first agent completes (the runner creates it lazily on the first result),
  // in which case the model is built from the event stream alone.
  const byKey = new Map();
  let journalText = "";
  try { journalText = readFileSync(journalPath, "utf8"); } catch {}
  for (const line of journalText.trim().split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e && e.label) byKey.set(e.key ?? e.label, e);
    } catch {}
  }
  // human() checkpoints are journaled (so --resume replays answers) but are NOT
  // model work — keep them out of the agent list; surface them as run.checkpoints.
  const entriesAll = [...byKey.values()];
  const agentsRaw = entriesAll.filter((e) => !e.human);
  const checkpoints = entriesAll
    .filter((e) => e.human)
    .map((e) => ({ id: e.key, qid: e.label, question: e.question ?? "", answer: e.result ?? null, source: e.source ?? null }));

  let meta = null;
  let specs = [];
  if (scriptPath && existsSync(scriptPath)) {
    const scriptText = readFileSync(scriptPath, "utf8");
    meta = extractMeta(scriptText);
    specs = parseAgentSpecs(scriptText);
  }
  const metaPhases = (meta && Array.isArray(meta.phases) ? meta.phases : []).map((p) =>
    typeof p === "string" ? { title: p } : { title: p.title, detail: p.detail },
  );

  const specFor = (label) => {
    let best = null;
    for (const s of specs) {
      if (s.labelStart && label.startsWith(s.labelStart)) {
        if (!best || s.labelStart.length > best.labelStart.length) best = s;
      }
    }
    return best;
  };
  const phaseForLabel = (label, spec) => {
    if (spec && spec.phase) return spec.phase;
    if (label.includes(":")) {
      const prefix = label.split(":")[0];
      const mt = metaPhases.find((p) => p.title && p.title.toLowerCase().startsWith(prefix.toLowerCase()));
      return mt ? mt.title : prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    // No phase signal — group flat runs together rather than one phase per agent.
    return "Agents";
  };

  // Prefer the per-agent fields the runtime persists (phase/model/effort/tokens/
  // ms); fall back to script regex + label heuristics for older journals.
  const agents = agentsRaw.map((e, i) => {
    const spec = specFor(e.label);
    const a = {
      id: e.key ?? e.label, // stable identity (the journal key); label is display-only and may repeat
      label: e.label,
      order: i,
      phase: e.phase ?? phaseForLabel(e.label, spec),
      model: e.model ?? spec?.model ?? null,
      effort: e.effort ?? spec?.effort ?? null,
      tokens: typeof e.tokens === "number" ? e.tokens : null,
      ms: typeof e.ms === "number" ? e.ms : null,
      result: e.result,
    };
    // Sessionful worker turns: the runtime journals each turn under a
    // `sess:<sessionId>#<turn>` key with session/sessionId/turn/status meta.
    // Parse the key as a fallback for journals that predate the explicit fields.
    const sessKey = typeof a.id === "string" ? a.id.match(SESS_KEY_RE) : null;
    if (e.session || sessKey) {
      a.kind = "session";
      a.sessionId = e.sessionId ?? (sessKey ? sessKey[1] : null);
      a.turn = typeof e.turn === "number" ? e.turn : sessKey ? Number(sessKey[2]) : null;
      a.turnStatus = e.status ?? "completed";
      if (e.threadId) a.threadId = e.threadId;
    }
    return a;
  });

  // phases in meta order, then any extra phases that appeared in the journal
  const phaseOrder = [];
  for (const p of metaPhases) if (!phaseOrder.includes(p.title)) phaseOrder.push(p.title);
  for (const a of agents) if (!phaseOrder.includes(a.phase)) phaseOrder.push(a.phase);

  const models = {};
  for (const a of agents) if (a.model) models[a.model] = (models[a.model] || 0) + 1;

  const totalTokens = agents.reduce((s, a) => s + (a.tokens || 0), 0);
  const totalMs = agents.reduce((s, a) => s + (a.ms || 0), 0);
  const hasMetrics = agents.some((a) => a.tokens != null || a.ms != null);

  return attachSessions({
    name: title || (meta && meta.name) || basename(journalPath).replace(/\.workflow\.jsonl$|\.jsonl$/, ""),
    description: (meta && meta.description) || "",
    phases: phaseOrder.map((t) => {
      const mp = metaPhases.find((p) => p.title === t);
      return { title: t, detail: mp?.detail || "" };
    }),
    agents,
    models,
    totals: { tokens: totalTokens, ms: totalMs, hasMetrics },
    counts: { phases: phaseOrder.length, agents: agents.length },
    checkpoints,
    result: readResult(journalPath), // the workflow's actual return value, if the runner persisted it
    sources: { journal: journalPath, script: scriptPath && existsSync(scriptPath) ? scriptPath : null, runDir },
    generatedAt: generatedAt || new Date().toISOString(),
  });
}

// buildRunModel + the live event stream: merge agents that have started but not
// finished (status:'running') into the model, and attach run.live (running list,
// counts, wall-clock). Shared by both viewers so they show the same live state.
export function buildLiveRunModel(opts) {
  const run = buildRunModel(opts);
  const ls = liveState(readEvents(opts.journalPath));
  run.live = ls || { running: [], doneCount: run.agents.length, runStartedAt: null, lastEventAt: null };
  if (ls && ls.running.length) {
    const done = new Set(run.agents.map((a) => a.id));
    let order = run.agents.length;
    for (const r of ls.running) {
      const id = r.id ?? r.label;
      if (done.has(id)) continue; // already completed in the journal
      const phase = r.phase ?? "Agents";
      const a = { id, label: r.label, order: order++, phase, model: r.model ?? null, effort: r.effort ?? null, tokens: null, ms: null, result: undefined, status: "running", startedAt: r.startedAt };
      if (r.kind === "session") { a.kind = "session"; a.sessionId = r.sessionId; a.turn = r.turn; }
      run.agents.push(a);
      if (!run.phases.some((p) => p.title === phase)) run.phases.push({ title: phase, detail: "" });
    }
    // refresh phaseOrder-derived counts + the worker rollups (a running steer turn
    // must fold into its worker, not appear as a fresh agent)
    run.counts = { phases: run.phases.length, agents: run.agents.length };
    attachSessions(run);
  }
  // attach live partial output to still-running agents (shown in the drawer).
  // Progress is keyed by id (= journal key); fall back to label for older sidecars.
  const prog = readProgress(opts.journalPath);
  for (const a of run.agents) {
    if (a.status === "running") { const p = prog[a.id] ?? prog[a.label]; if (p) a.progress = p; }
  }
  // pending/answered human() questions — the live viewer renders unanswered ones
  run.questions = readQuestions(opts.journalPath);
  return run;
}
