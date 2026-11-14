// Long-lived Codex worker sessions: the protocol-level driver behind the
// workflow-facing `agent.start()` / `session.steer()` API (the orchestration,
// budget, concurrency, events and journaling live in runtime.js).
//
// A Codex *thread* is a persistent conversation; a *turn* is one request/response
// over it. The one-shot `agent()` is exactly one thread + one turn. A session keeps
// the thread open and runs MULTIPLE turns on it — so `session.steer()` is a real
// follow-up `turn/start` on the same `threadId` (continuing the worker's context),
// NOT a fresh agent with the transcript pasted in. This mirrors the Codex SDK's
// `thread.run()`-again model and the app-server `turn/start` semantics.
//
// Reuses the one-shot turn primitives from codexAgent.js (buildThreadParams /
// buildTurnParams / attachAgentMessageCollector / parseSchemaResult / model
// resolution), so one-shot and sessionful turns behave identically. Dependency is
// one-directional (session -> agent) to avoid an import cycle.

import { setTimeout as sleep } from "node:timers/promises";
import {
  getClient,
  getAvailableModels,
  modelResolution,
  buildThreadParams,
  buildTurnParams,
  attachAgentMessageCollector,
  checkSchemaResult,
  isRetryable,
} from "./codexAgent.js";
import { resolveModel } from "./modelMap.js";
import { loadAgentType } from "./agentTypes.js";
import { tokensForThread, markResumedThread } from "./meter.js";
import { narrowThreadParams, withNormalizedToolOptions, mergeDisallowed } from "./toolNarrowing.js";

// Local: an INACTIVITY timeout (same as one-shot): thread notifications re-arm it
// and it pauses while a tool item runs, so a progressing turn has no wall-clock cap.
const DEFAULT_TURN_TIMEOUT_MS = 600_000;

/**
 * Open a Codex thread for a long-lived worker. Resolves the agentType/system
 * prompt, the model, and (if requested) a git worktree ONCE — all of which are
 * thread-level and persist across follow-up turns — then starts the thread.
 *
 * Returns a CodexSessionDriver: a thin, protocol-only handle that can begin turns,
 * interrupt the active turn, and clean up. It does NOT touch the concurrency
 * semaphore, budget, events, or journal — runtime.js wraps it with all of that.
 *
 * Thread creation is retried on transient errors (it is cheap and no streaming has
 * begun). A turn, once started, is never retried (that would double-send) — turn
 * failures are surfaced as a `failed` outcome for the controller to handle.
 */
export async function startCodexSession(opts = {}) {
  const log = typeof opts.log === "function" ? opts.log : () => {};
  opts = withNormalizedToolOptions(opts); // Local: Claude's disallowedTools / bashCommandClamp checks, as agent()

  // agentType -> developer instructions (+ optional fallback model), same as agent().
  let systemPrompt = opts.systemPrompt;
  let agentTypeModel, sandbox = opts.sandbox;
  if (opts.agentType) {
    const def = await loadAgentType(opts.agentType, opts.cwd ?? process.cwd());
    if (def) {
      if (!systemPrompt) systemPrompt = def.systemPrompt;
      agentTypeModel = def.model;
      if (def.sandbox === "read-only") sandbox = "read-only";
      if (def.disallowedTools) opts = { ...opts, disallowedTools: mergeDisallowed(def.disallowedTools, opts.disallowedTools) };
      if (def.tools) opts = { ...opts, allowedTools: def.tools }; // Local: the definition's `tools:` allowlist, as agent()
    } else {
      log(`agentType '${opts.agentType}' not found — using default instructions`);
    }
  }
  // pinnedModel is authoritative (forces every agent onto one model), same as agent().
  const requestedModel = opts.pinnedModel ?? opts.model ?? agentTypeModel ?? opts.defaultModel;

  // Worktree isolation: created once, kept across every follow-up turn, removed
  // only by cleanup() (session.close / runtime finalization) — never per-turn.
  let cwd = opts.cwd ?? process.cwd();
  let worktree;
  if (opts.isolation === "worktree") {
    const { isGitRepo, createWorktree } = await import("./worktree.js");
    if (await isGitRepo(cwd)) {
      worktree = await createWorktree(cwd);
      cwd = worktree.dir;
    } else {
      log(`isolation:'worktree' ignored — ${cwd} is not a git repo`);
    }
  }

  const client = await getClient(opts.clientOptions); // shared, self-healing singleton
  const model = resolveModel(requestedModel, getAvailableModels(), log, modelResolution(opts.pinnedModel ?? opts.defaultModel));
  let threadParams;
  try {
    // Local: the same tool narrowing as agent() — narrowed for this core, or refused (toolNarrowing.js).
    threadParams = await narrowThreadParams(client, buildThreadParams({ sandbox, cwd, model, systemPrompt, personality: opts.personality }), opts);
  } catch (e) {
    if (worktree) { try { await worktree.cleanup(); } catch {} }
    throw e;
  }

  // Warm-context resume: when a prior run journaled this worker's thread id, try
  // re-attaching to the PERSISTED thread (thread/resume loads its rollout from
  // disk) instead of starting cold. Falls back to a fresh thread on any failure
  // (rollout gone, old codex, ephemeral thread) — resume is an optimization, never
  // a correctness requirement. The caller can tell which happened via `resumed`.
  if (opts.resumeThreadId) {
    try {
      const res = await client.resumeThread({ ...threadParams, threadId: opts.resumeThreadId });
      const threadId = res?.thread?.id;
      if (!threadId) throw new Error("thread/resume did not return thread.id");
      markResumedThread(threadId); // don't bill prior-run history to this run's meter
      log(`  ↻ session re-attached to thread ${threadId} (warm context)`);
      return new CodexSessionDriver({ client, threadId, model, worktree, log, resumed: true });
    } catch (e) {
      log(`  ↻ thread/resume failed (${String(e?.message ?? e).slice(0, 120)}) — starting a fresh thread`);
    }
  }

  const retries = opts.retries ?? 3;
  let threadId;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.startThread(threadParams);
      threadId = res?.thread?.id;
      if (!threadId) throw new Error("thread/start did not return thread.id");
      break;
    } catch (e) {
      if (attempt >= retries || !isRetryable(e)) {
        if (worktree) { try { await worktree.cleanup(); } catch {} } // don't leak a worktree on a failed start
        throw e;
      }
      await sleep(Math.min(8000, 500 * 2 ** attempt));
    }
  }

  return new CodexSessionDriver({ client, threadId, model, worktree, log });
}

// Protocol-only session handle. One active turn at a time (enforced by the runtime
// wrapper; defended here too). Every turn's completion promise ALWAYS resolves —
// never rejects — to a TurnOutcome, so the wrapper can race many of them cleanly.
//
//   TurnOutcome = {
//     status: "completed" | "interrupted" | "failed",
//     result, text, error, model, tokens, ms, turnId
//   }
export class CodexSessionDriver {
  constructor({ client, threadId, model, worktree, log, resumed = false }) {
    this.client = client;
    this.threadId = threadId;
    this.model = model ?? null;
    this.currentTurnId = null;
    this.resumed = resumed; // true when re-attached via thread/resume (warm context)
    this._worktree = worktree;
    this._log = typeof log === "function" ? log : () => {};
    this._active = false;
  }

  // Start a turn on the thread. Returns { turnId, completion } once the turn has
  // STARTED (so the caller can return a handle without waiting). `completion`
  // settles when the turn ends. Throws only if the turn could not be started.
  async beginTurn(prompt, turnOpts = {}) {
    if (this._active) throw new Error("internal: beginTurn called while a turn is active");
    const { client, threadId } = this;
    const model = turnOpts.model ?? this.model;
    const turnParams = buildTurnParams({ threadId, prompt, model, effort: turnOpts.effort, schema: turnOpts.schema });

    const collector = attachAgentMessageCollector(client, threadId, turnOpts.onProgress);
    const startedAt = Date.now();
    // tokenUsage is reported cumulatively per thread, so this turn's tokens are the
    // delta over the thread's running total at the moment the turn began.
    const tokensBefore = tokensForThread(threadId)?.total ?? 0;

    let turnId = null;
    try {
      const res = await client.startTurn(turnParams);
      turnId = res?.turn?.id ?? null;
    } catch (e) {
      collector.detach();
      throw e; // could not even start the turn — let start()/steer() surface it
    }
    this._active = true;
    this.currentTurnId = turnId;

    const finish = (turn, errObj) => {
      const text = collector.text();
      const after = tokensForThread(threadId);
      const tokens = after ? Math.max(0, (after.total ?? 0) - tokensBefore) : null;
      const ms = Date.now() - startedAt;
      const raw = turn?.status;
      const status = raw === "completed" ? "completed" : raw === "interrupted" ? "interrupted" : "failed";
      let result = null;
      let error = null;
      let finalStatus = status;
      if (status === "completed" && !turnOpts.schema) result = text;
      else if (status === "completed") {
        // Local: validated against the author's schema; a session turn is never re-sent, so a mismatch fails it.
        const checked = checkSchemaResult(text, turnOpts.schema);
        if (checked.ok) result = checked.value;
        else { finalStatus = "failed"; error = `Structured output failed schema validation: ${checked.errors.slice(0, 8).join("; ")}`; }
      }
      else if (status === "failed") error = turn?.error?.message ?? String(errObj?.message ?? errObj ?? "turn failed");
      return { status: finalStatus, result, text, error, model: model ?? null, tokens, ms, turnId };
    };

    const idleMs = turnOpts.timeoutMs ?? DEFAULT_TURN_TIMEOUT_MS, stop = new AbortController(), tools = new Set();
    let timer;
    const arm = () => { clearTimeout(timer); if (!tools.size && idleMs > 0) timer = setTimeout(() => stop.abort(new Error(`Session turn timed out after ${idleMs}ms without progress`)), idleMs); };
    const activity = (n) => {
      const p = n.params ?? {}; if (p.threadId !== threadId) return;
      if (n.method === "item/started" && p.item?.type !== "agentMessage" && p.item?.type !== "reasoning") tools.add(p.item.id);
      if (n.method === "item/completed") tools.delete(p.item?.id);
      arm();
    };
    client.on("notification", activity);
    arm();
    const completion = (async () => {
      try {
        const completed = await client.waitForNotification(
          (n) =>
            n.method === "turn/completed" &&
            n.params?.threadId === threadId &&
            (!turnId || n.params?.turn?.id === turnId),
          0,
          stop.signal,
        );
        return finish(completed.params?.turn ?? {}, null);
      } catch (e) {
        // No turn/completed within the turn's own cap, or the transport died.
        // Interrupt best-effort and report a failed outcome.
        try { if (turnId) await client.interruptTurn(threadId, turnId); } catch {}
        return finish({ status: "failed", error: { message: String(e?.message ?? e) } }, e);
      } finally {
        clearTimeout(timer);
        client.off("notification", activity);
        collector.detach();
        this._active = false;
      }
    })();

    return { turnId, completion };
  }

  // Interrupt the active turn (turn/interrupt). The turn's completion promise then
  // resolves with status "interrupted". No-op if nothing is running.
  async interruptCurrent() {
    if (this._active && this.currentTurnId) {
      try {
        await this.client.interruptTurn(this.threadId, this.currentTurnId);
      } catch (e) {
        const msg = String(e?.message ?? e);
        // Benign race: the turn finished on its own in the instant before the
        // interrupt landed. cancel() then resolves to the completed outcome.
        if (/no active turn/i.test(msg)) this._log(`interrupt no-op — turn already finished (${this.threadId})`);
        else this._log(`interrupt failed (${this.threadId}): ${msg}`);
      }
    }
  }

  // Remove the worktree (if any) — kept across all turns, removed only here.
  async cleanup() {
    if (this._worktree) {
      try {
        const r = await this._worktree.cleanup();
        if (!r.removed) this._log(`worktree kept (modified): ${r.dir}`);
      } catch (e) {
        this._log(`worktree cleanup failed: ${e?.message ?? e}`);
      }
      this._worktree = undefined;
    }
  }
}
