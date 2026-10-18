// Token accounting, fed by `thread/tokenUsage/updated` notifications.
//
// The notification carries `tokenUsage.total`, a per-thread *cumulative*
// TokenUsageBreakdown. We keep the latest breakdown per thread, which backs two
// things: the workflow `budget.spent()` global (summed across threads), and
// per-agent attribution for the run journal / viewer (`tokensForThread`).

const perThread = new Map(); // threadId -> { input, output, reasoning, total }
const listeners = new Set();
export function subscribeMeter(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Threads re-attached via thread/resume may report a cumulative total that
// includes PRIOR-run history. On such a thread's first notification this process,
// capture `total - last` as a baseline and subtract it from every later reading —
// so the meter (budget + per-turn attribution) only counts THIS process's spend.
// If the server in fact resets totals on resume, the baseline is simply 0.
const resumedBaseline = new Map(); // threadId -> baseline breakdown to subtract
const pendingResumed = new Set();

export function markResumedThread(threadId) {
  if (threadId && !perThread.has(threadId)) pendingResumed.add(threadId);
}

// Normalize a TokenUsageBreakdown into a flat {input, output, reasoning, total}.
function normalize(b) {
  if (!b || typeof b !== "object") return null;
  const input = b.inputTokens || 0;
  const output = b.outputTokens || 0;
  const reasoning = b.reasoningOutputTokens || 0;
  const total = typeof b.totalTokens === "number" ? b.totalTokens : input + output + reasoning;
  return { input, output, reasoning, total };
}

export function recordTokenUsage(params) {
  const threadId = params?.threadId;
  const n = normalize(params?.tokenUsage?.total);
  if (!threadId || !n) return;
  if (pendingResumed.has(threadId)) {
    pendingResumed.delete(threadId);
    const last = normalize(params?.tokenUsage?.last) ?? { input: 0, output: 0, reasoning: 0, total: 0 };
    resumedBaseline.set(threadId, {
      input: Math.max(0, n.input - last.input),
      output: Math.max(0, n.output - last.output),
      reasoning: Math.max(0, n.reasoning - last.reasoning),
      total: Math.max(0, n.total - last.total),
    });
  }
  const base = resumedBaseline.get(threadId);
  perThread.set(threadId, base ? {
    input: Math.max(0, n.input - base.input),
    output: Math.max(0, n.output - base.output),
    reasoning: Math.max(0, n.reasoning - base.reasoning),
    total: Math.max(0, n.total - base.total),
  } : n);
  for (const listener of listeners) listener();
}

// Total tokens across all threads (input + output + reasoning) — the default
// budget meter and the conservative cost bound.
export function tokensSpent() {
  let sum = 0;
  for (const v of perThread.values()) sum += v.total;
  return sum;
}

// Output-only tokens (generated, reasoning included) across all threads — matches the
// native runtime's output-token budget pool (`--budget-meter output`).
// Local: a TokenUsageBreakdown's outputTokens already includes its reasoning
// (Codex accounting; reasoningOutputTokens is the part of it that was thinking),
// so reasoning is not added again.
export function outputSpent() {
  let sum = 0;
  for (const v of perThread.values()) sum += v.output;
  return sum;
}

// Per-agent attribution: the cumulative breakdown for one thread (one agent()
// call), or null if no usage was reported for it.
export function tokensForThread(threadId) {
  return perThread.get(threadId) ?? null;
}

export function resetMeter() {
  perThread.clear();
  resumedBaseline.clear();
  pendingResumed.clear();
}
