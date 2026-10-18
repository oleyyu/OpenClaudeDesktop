import { workflowPreview, workflowLabel, WorkflowPhases } from './workflow-output.js';
// Provider-neutral re-implementation of the dynamic-workflow globals
// (agent / parallel / pipeline / phase / log / budget / args / workflow).
//
// Nothing here mentions Claude or Codex: this is the scheduling glue that the
// Workflow tool description specifies. Only agent() reaches a model, via the
// codexAgent seam. Concurrency is capped exactly like the native runtime:
// min(16, cores-2), with a hard 1000-agent backstop.

import os from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { types as utilTypes } from 'node:util';
import { WorkflowSchemaMemo } from './workflow-boundary.js';
import { codexAgent } from "./codexAgent.js";
import { StructuredAgentError } from './structuredAgent.js';
import { startCodexSession } from "./codexSession.js";
import { tokensSpent, outputSpent } from "./meter.js";
import { identityHash, rootScope, scopeTag, childScope } from "./journal.js";
import { schemaProblem } from "./schemaValidate.js";
import { workflowErrorText } from './workflow-result.js';
import { promptProvenance } from './provenance.js';
import { withNormalizedToolOptions, ToolNarrowingError } from './toolNarrowing.js';
import { isAgentConfigError } from './agentTypes.js';
// Local: errors agent() rethrows instead of resolving to null, as Claude Code 2.1.280 does: a refused spawn
// (ToolNarrowingError) and a configuration mistake (an unknown agentType, a worktree that can't be set up).
const refusesSpawn = error => error instanceof ToolNarrowingError || isAgentConfigError(error);
// Claude Code 2.1.280 restarts a stalled agent up to 5 times, then fails the call.
const STALL_RETRIES = 5;

// Local: os.availableParallelism() (respects CPU affinity/quotas) for Claude Code 2.1.280's min(16, max(2, n-2));
// CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS (an integer 1–256) replaces it, as in Claude (Code Desktop passes its
// Settings value through the same variable, prefs/workflow-settings.mjs workflowRunnerEnv).
export function concurrencyCap(env = process.env, parallelism = os.availableParallelism?.() ?? os.cpus()?.length ?? 4) {
  const text = String(env.CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS ?? '').trim(), chosen = Number(text);
  if (text && Number.isInteger(chosen) && chosen >= 1 && chosen <= 256) return chosen;
  return Math.min(16, Math.max(2, parallelism - 2));
}
const CAP = concurrencyCap();
// Claude Code 2.1.280: an agent with no progress for 180s is restarted (up to 5 times).
const STALL_MS = 180_000;
const CANCEL_GRACE_MS = 6_000; // the app waits up to 8s (workflow-service.cjs STOP_GRACE_MS) once the runner says it is stopping

// Local: scopes namespace human()/session extensions in nested workflows.
// agent() cache keys use the shared Journal's global invocation chain.
const scopeCtx = new AsyncLocalStorage();

// phase/log do not invoke a guest object's conversion hooks.
function displayValue(value) {
  return value === null || typeof value !== 'object' && typeof value !== 'function'
    ? String(value) : `[${typeof value}]`;
}

function snapshotItems(items) {
  const values = [];
  let length;
  try { length = items.length; }
  catch { throw new Error('unable to read array length across the workflow VM boundary'); }
  if (!Number.isSafeInteger(length)) throw new Error('array length is not a safe integer across the workflow VM boundary');
  if (length > 4096) throw new Error(`array length ${length} exceeds the maximum of 4096 supported across the workflow VM boundary`);
  for (let index = 0; index < length; index++) {
    try { values[index] = items[index]; }
    catch { values[index] = undefined; }
  }
  return values;
}

// Named-workflow registry: resolve `workflow("name")` to a script file, project
// scope (.claude/workflows/) shadowing home (~/.claude/workflows/), matching the
// native save locations. `<name>.js` and `<name>.workflow.js` both accepted.
function resolveNamedWorkflow(name) {
  const dirs = [
    join(process.cwd(), ".claude", "workflows"),
    join(os.homedir(), ".claude", "workflows"),
  ];
  const files = [`${name}.js`, `${name}.workflow.js`, `${name}.mjs`];
  for (const d of dirs) {
    for (const f of files) {
      const p = join(d, f);
      if (existsSync(p)) return p;
    }
  }
  throw new Error(
    `workflow("${name}"): no saved workflow found. Searched ${dirs.join(" and ")} ` +
      `for ${name}.js / ${name}.workflow.js`,
  );
}

// Build a minimal value that satisfies a JSON Schema, so a --plan dry run can let
// the orchestration logic run (property access, .map over arrays) without calling
// a model. Arrays come back EMPTY — fan-outs sized from agent output are therefore
// uncounted (a lower bound); the CLI flags this.
export function schemaSkeleton(schema) {
  if (!schema || typeof schema !== "object") return "";
  return skel(schema);
}
function skel(s) {
  if (!s || typeof s !== "object") return null;
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
  if (s.oneOf || s.anyOf) return skel((s.oneOf || s.anyOf)[0]);
  const t = Array.isArray(s.type) ? s.type[0] : s.type;
  if (t === "object" || (!t && s.properties)) {
    const o = {};
    for (const k of Object.keys(s.properties || {})) o[k] = skel(s.properties[k]);
    return o;
  }
  if (t === "array") return [];
  if (t === "number" || t === "integer") return 0;
  if (t === "boolean") return false;
  if (t === "string") return "";
  return null;
}

// Layer-width context. parallel()/pipeline() publish how many agents run
// side-by-side in the current layer; agent() reads it (default 1 for a lone,
// un-fanned-out call) to scale thinking effort. AsyncLocalStorage propagates
// across awaits and through the vm-hosted thunks, so a queued or deeply-awaited
// agent still sees the width of the layer that spawned it.
const layerCtx = new AsyncLocalStorage();
function currentLayerWidth() {
  return layerCtx.getStore()?.width ?? 1;
}

// Thinking effort scales INVERSELY with layer width: a lone agent is a critical
// gate (consolidation / judge / report) and earns the highest auto-policy tier.
// Every fan-out floors at `high` — we never drop to `medium`, even on wide layers.
// One knob, one place.
//   width 1   -> xhigh   (sole agent in its layer: critical gate)
//   width >= 2 -> high    (any fan-out: floor)
export function effortForLayerWidth(width) {
  if (width <= 1) return "xhigh";
  return "high";
}

// A single global semaphore — only agent() calls consume a slot, matching
// "Concurrent agent() calls are capped at min(16, cpu cores - 2)".
// Local: a queued acquire can be withdrawn by an abort signal (user skip, run
// cancel, budget ceiling reached) without ever taking a slot.
let active = 0;
const waiters = [];
function acquire(signal) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (active < CAP && !pauseGate) {
    active++;
    return Promise.resolve();
  }
  return new Promise((res, rej) => {
    const entry = { grant: () => { signal?.removeEventListener("abort", withdraw); res(); } };
    const withdraw = () => { const i = waiters.indexOf(entry); if (i >= 0) waiters.splice(i, 1); rej(signal.reason); };
    signal?.addEventListener("abort", withdraw, { once: true });
    waiters.push(entry);
  });
}
function release() {
  active--;
  admitWaiters();
}
// Local: a freed slot goes to the next queued agent only while the run isn't paused; unpausing admits them.
function admitWaiters() {
  while (!pauseGate && active < CAP && waiters.length) {
    active++;
    waiters.shift().grant();
  }
}
// Local (Code Desktop /workflows "p"): while paused, queued agents are not admitted, including those already waiting
// for a slot when the pause came; running ones go on.
let pauseGate = null;
export function setWorkflowPaused(paused) {
  if (paused && !pauseGate) { let open; const promise = new Promise((resolve) => { open = resolve; }); pauseGate = { promise, open }; }
  else if (!paused && pauseGate) { const gate = pauseGate; pauseGate = null; gate.open(); admitWaiters(); }
  return !!pauseGate;
}
export const workflowPaused = () => !!pauseGate;
async function unpaused(signal) {
  while (pauseGate) {
    signal?.throwIfAborted();
    const gate = pauseGate;
    await new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal?.addEventListener("abort", abort, { once: true });
      gate.promise.then(() => { signal?.removeEventListener("abort", abort); resolve(); });
    });
  }
}
async function pooled(thunk, signal) {
  await unpaused(signal);
  await acquire(signal);
  try {
    return await thunk();
  } finally {
    release();
  }
}

// Test/observability hook: in-flight model slots (one-shot agents + live session
// turns) against the single process-wide semaphore. A detached running session
// turn occupies a slot until it settles — this lets tests prove that.
export function __activeSlots() {
  return active;
}

export function createRuntime({
  args,
  budgetTotal = null,
  budgetMeter = "output", // "total" (input+output, default) | "output" (native pool)
  budgetSpentBefore = 0, // Local: what the turn that launched the run already spent (Claude's budget is the turn's)
  sharedBudget, // Host-owned turn pool, shared across independent runner processes.
  defaults = {},
  defaultModel,
  pinnedModel,
  ignoreRequestedModel = false,
  autoEffort = false,
  pinnedEffort = null,
  plan = false, // --plan dry run: count agents, never call a model
  onPhase,
  onLog,
  onAgentPlan, // dry-run sink: receives { label, phase, effort, width, schema } per agent
  onEvent, // lifecycle sink: { type:'start'|'end'|'cached', label, phase, ... } for live viewers
  onProgress, // live partial-output sink: (label, partialText) while an agent streams
  journal = null,
  runAgent = codexAgent, // seam: injected in tests to capture resolved opts
  startSession = startCodexSession, // seam: injected in tests for sessionful workers
  humanChannel = null, // interactive involvement: { notify(q), wait(id, {timeoutMs}) -> {answer}|undefined }
  nested = false,
  parentRuntime,
  nestedName,
  nestedPhase,
  timerOwner,
  sharedGlobals,
  workflowOutput,
  workflowPhases = new WorkflowPhases(),
  executionState = { agentCount: 0 },
  journalScope, // Local: a child workflow's own resume scope (set by the parent's workflow())
  resolveWorkflow, // Local: optional (name) => scriptPath for workflow('name') (the host's saved-workflow registry); else resolveNamedWorkflow
  allowScriptPath = true, // Local: false refuses workflow({scriptPath}) (the host's CLAUDE_WORKFLOW_NAME_ONLY), with scriptPathRefusal
  scriptPathRefusal,
  onSlotFailure, // Local: (message) for a parallel/pipeline slot or nested workflow that failed (Claude getFailures())
} = {}) {
  let vmHelpers = {
    clone: value => value,
    readSchema: options => { try { const schema=options?.schema;return schema&&typeof schema==='object'?schema:undefined; } catch { return undefined; } },
    call: (fn, ...args) => fn(...args),
    settle: async value => ({ value: await value }),
    snapshot: snapshotItems,
  };
  const schemas=new WorkflowSchemaMemo(),childSchemas=new WorkflowSchemaMemo();

  executionState.controllers ??= new Map();
  // Local: run-wide state shared with nested children — cancellation, in-flight
  // agents, finalizers, the budget gate and the meter baseline for budget.spent().
  executionState.runAbort ??= new AbortController();
  executionState.inflight ??= new Set();
  executionState.finalizers ??= new Set();
  executionState.budgetGate ??= new AbortController();
  executionState.meterBase ??= { output: outputSpent(), total: tokensSpent() };
  const rootJournalScope = journalScope ?? rootScope();
  const currentScope = () => scopeCtx.getStore() ?? rootJournalScope;
  // human()/session journal keys of a child workflow live under its scope path.
  const keyPrefix = nested && journalScope ? `${journalScope.path}:` : "";
  let currentPhase = null; // last phase() title; the fallback when opts.phase is unset
  const announcePhase=title=>workflowPhases.announce(title,({index,kind})=>onPhase?.(title,{index,...kind?{kind}:{}}));
  const childCounts=new Map();
  const AGENT_CAP = 1000;
  // Local: the whole run's spend (parent + nested children share executionState),
  // excluding anything metered in this process before the run began.
  const spentBefore = Number.isFinite(budgetSpentBefore) && budgetSpentBefore > 0 ? budgetSpentBefore : 0;
  const meterSpent = () => sharedBudget ? sharedBudget.spent() : spentBefore + (budgetMeter === "output"
    ? Math.max(0, outputSpent() - executionState.meterBase.output)
    : Math.max(0, tokensSpent() - executionState.meterBase.total));

  let sessionSeq = 0; // deterministic session ids (s1, s2, …) within this runtime
  const openSessions = new Set(); // live sessions awaiting close() — drained by finalize()

  // Runaway backstop shared by agent() and every session turn.
  function checkAgentCap() {
    if (executionState.agentCount >= AGENT_CAP) {
      // Local: Claude Code 2.1.280's explanation of the usual cause, not only the number.
      throw new Error(`Workflow agent() call cap reached (${AGENT_CAP}). This usually means a loop that waits for budget.remaining() to run out never ends because no token budget was set: remaining() is Infinity when budget.total is null. Check budget.total before looping on remaining(), or bound the loop.`);
    }
  }
  function bumpAgentCount() {
    checkAgentCap();
    executionState.agentCount++;
  }
  // Budget gate shared by agent() and session start/steer. Throws BUDGET_EXCEEDED.
  // The budget is a HARD ceiling (Claude Code): checked before each start; once it
  // is reached, queued agents are withdrawn too (noteSpend). In-flight agents finish.
  // Local: Claude Code 2.1.280's WorkflowBudgetExceededError, its name and sentence.
  function budgetError() {
    const count = (n) => Number(n).toLocaleString("en-US");
    const err = new Error(`Workflow token budget exceeded (${count(meterSpent())} / ${count(budgetTotal)} ${budgetMeter} tokens). Stopping further agent() calls. In-flight agents will complete; their results are preserved.`);
    err.name = "WorkflowBudgetExceededError";
    err.code = "BUDGET_EXCEEDED";
    return err;
  }
  // Local: a parallel()/pipeline() slot the budget dropped is no failure of its own (Claude: one line for all of them).
  const budgetDrop = (error) => error?.code === "BUDGET_EXCEEDED" || error?.name === "WorkflowBudgetExceededError";
  function reportDropped(kind, dropped) {
    if (!dropped || executionState.cancelled) return;
    const line = `${kind}: ${dropped} ${dropped === 1 ? "slot" : "slots"} dropped — token budget exceeded`;
    onLog?.(line);
    onSlotFailure?.(line);
  }
  function checkBudget() {
    if (budgetTotal > 0 && meterSpent() >= budgetTotal) throw budgetError();
  }
  function noteSpend() {
    if (budgetTotal > 0 && meterSpent() >= budgetTotal && !executionState.budgetGate.signal.aborted) executionState.budgetGate.abort(budgetError());
  }
  function checkCancelled() {
    if (executionState.cancelled) throw new Error("Workflow cancelled");
  }
  // Thinking-effort policy in ONE place (used by agent() and sessions). Precedence
  // (highest first): --pin-effort > per-call effort > --auto-effort (layer width) >
  // --effort flag > Codex config default (effort omitted). Returns { effort, src }.
  function resolveEffort(callOpts, width) {
    if (pinnedEffort != null) return { effort: pinnedEffort, src: "pin" };
    if (callOpts.effort != null) return { effort: callOpts.effort, src: "call" };
    if (autoEffort) return { effort: effortForLayerWidth(width), src: "auto" };
    if (defaults.effort != null) return { effort: defaults.effort, src: "flag" };
    return { effort: undefined, src: "default" };
  }

  async function agent(prompt, opts = {}) {
    if(nested)opts={...childSchemas.child(opts,vmHelpers),phase:nestedPhase};
    opts=schemas.root(opts,vmHelpers.clone,utilTypes.isProxy)??{};
    if (executionState.cancelled) return new Promise(() => {}); // Claude: calls after an abort never settle
    // Compile and lint before startup; open objects may require undeclared keys.
    const problem = opts.schema ? schemaProblem(opts.schema) : null;
    if (problem) throw new Error(`agent(): invalid schema — ${problem}`);
    // Claude Code 2.1.280: a malformed disallowedTools / bashCommandClamp refuses the spawn; both are normalized
    // (sorted, de-duplicated, [] = unset) before they join the journal identity (toolNarrowing.js).
    opts = withNormalizedToolOptions(opts);
    if (ignoreRequestedModel) opts = { ...opts, model: undefined };
    bumpAgentCount();
    const invocation = executionState.agentCount;
    const queuedAt=Date.now();
    const merged = { ...defaults, ...opts };
    const label = workflowLabel(prompt, opts.label);
    // Phase attribution: an explicit per-call `phase` wins (the reliable signal
    // inside concurrent pipeline/parallel stages, where the global phase() races),
    // else the last phase() title. Persisted to the journal for the viewer.
    const effectivePhase = opts.phase == null ? currentPhase ?? null : String(opts.phase);
    const phaseIndex=effectivePhase==null?undefined:announcePhase(effectivePhase);

    // Resolve thinking effort. Precedence (highest first):
    //   pinnedEffort (--pin-effort)        authoritative, like --pin-model
    //   per-call opts.effort               the author's deliberate choice
    //   layer-width policy (--auto-effort)  1->xhigh, >=2->high (floor)
    //   defaults.effort (--effort)         flat fallback
    //   undefined                          Codex config default (effort omitted)
    // The effective effort reaches the agent; Claude's journal identity uses
    // authored options only, before host defaults and policies are applied.
    const width = currentLayerWidth();
    const { effort: resolvedEffort } = resolveEffort(opts, width);
    if (resolvedEffort === undefined) delete merged.effort;
    else merged.effort = resolvedEffort;

    // --plan dry run: record the would-be agent and return a schema skeleton so
    // the orchestration keeps running. No model call, no budget, no journal.
    if (plan) {
      onAgentPlan?.({ label, phase: effectivePhase, effort: merged.effort ?? null, width, schema: !!opts.schema });
      return schemaSkeleton(opts.schema);
    }

    checkBudget();

    // Resume journal: allocate a stable key (called on every run, even a cache
    // miss, to keep the invocation chain aligned) and short-circuit on a hit.
    // Claude matches normalized authored options, not host defaults. Forced
    // model selection discards the requested override before matching too.
    if (journal) scopeTag(currentScope(), 'a'); // retain human/session extension positions
    const key = journal
      ? journal.nextKey(prompt, pinnedModel != null ? { ...opts, model: undefined } : opts)
      : `member-${invocation}`;
    if (journal && key && journal.hit(key) && journal.get(key) !== null) {
      const now=Date.now();
      workflowOutput?.agent(invocation,{label,...journal.entry(key)?.agentId?{agentId:journal.entry(key).agentId}:{},state:'done',cached:true,startedAt:now,lastProgressAt:now,
        ...effectivePhase==null?{}:{phaseIndex,phaseTitle:effectivePhase},
        ...pinnedModel??opts.model??defaultModel?{model:pinnedModel??opts.model??defaultModel}:{},
        promptPreview:workflowPreview(prompt),resultPreview:workflowPreview(journal.get(key)),
      });
      onEvent?.({ type: "cached", id: key, label, phase: effectivePhase, phaseIndex, seq: invocation });
      return api.copyResult(journal.get(key));
    }

    // Local: a core that can't narrow the agent's tools as asked refuses the spawn before it is admitted
    // (codexAgent.preflight); any other preflight problem is left to the agent's own start and retries.
    // Local: an unknown agentType is refused here too (AgentConfigError), as Claude refuses it before the spawn.
    if (typeof runAgent.preflight === 'function' && (merged.disallowedTools || merged.bashCommandClamp || merged.agentType != null)) {
      try { await runAgent.preflight({ ...merged, defaultModel, pinnedModel, label }); }
      catch (error) { if (refusesSpawn(error)) throw error; }
    }

    const reqModel = pinnedModel ?? opts.model ?? defaultModel ?? null;
    const admission={id:key,seq:invocation,label,phase:effectivePhase,phaseIndex,model:reqModel,queuedAt,lastProgressAt:queuedAt,promptPreview:workflowPreview(prompt)};
    workflowOutput?.agent(invocation,{label,state:'start',queuedAt,lastProgressAt:queuedAt,promptPreview:admission.promptPreview,
      ...effectivePhase==null?{}:{phaseIndex,phaseTitle:effectivePhase},...reqModel==null?{}:{model:reqModel},
    });
    onEvent?.({type:'admission',...admission,state:'queued'});
    const failAdmission=error=>{
      const message=String(error?.message??error),lastProgressAt=Date.now();
      workflowOutput?.agent(invocation,{state:'error',error:message,lastProgressAt});
      onEvent?.({type:'admission',...admission,state:'failed',error:message,lastProgressAt});
    };
    // Emit a lifecycle 'start' so live viewers can show this agent as running.
    // `id` is the stable journal key (null only without a journal) — viewers and
    // the run summary key by it so agents that share a display label never collide.

    // Capture per-agent metrics off a side channel (the model-facing return value
    // is unchanged); fold them into the journal entry alongside phase/effort/model.
    let metrics = null;
    let failure,failureKind,reportedTokens=false,published=false,fatal;
    // Local: the member is controllable from enqueue time — skip withdraws a queued
    // agent; retry of a queued agent is a no-op (it has not started yet).
    const member = { controller: null, action: null, queued: true, queue: new AbortController() };
    executionState.controllers.set(key, member);
    const queueSignal = AbortSignal.any([member.queue.signal, executionState.runAbort.signal, executionState.budgetGate.signal]);
    const execution = pooled(async () => {
      member.queued = false;
      checkCancelled();
      checkBudget();
      // A queued call has no started attempt. Interrupted started calls can keep
      // the cached suffix on resume, whereas calls that never started cannot.
      if (journal) await journal.started(key, label);
      checkCancelled();
      published=true;
      onEvent?.({ type: "start", id: key, label, phase: effectivePhase, phaseIndex, seq: invocation, effort: merged.effort ?? null, model: reqModel });
      let attempts = 0, stalls = 0, totalTokens = 0, outputTokens = 0, totalToolCalls = 0;
      const restarts = []; // Local: why each earlier attempt was restarted ('stalled' | 'user-retry'), for Claude's errors
      const framed = promptProvenance();
      const startedAt = Date.now();
      workflowOutput?.agent(invocation,{label,state:'start',queuedAt,startedAt,lastProgressAt:startedAt,
        ...effectivePhase==null?{}:{phaseIndex,phaseTitle:effectivePhase},
        ...reqModel==null?{}:{model:reqModel}, promptPreview:workflowPreview(prompt),promptFramed:framed,
      });
      {
        for (;;) {
          const controller = new AbortController();
          member.controller = controller; member.action = null;
          const signal = AbortSignal.any([executionState.runAbort.signal, ...defaults.signal ? [defaults.signal] : [], controller.signal]);
          let timer, activeTools = 0, attemptToolCalls = 0;
          const stallMs = opts.stallMs ?? STALL_MS, attemptStartedAt = Date.now();
          const arm = () => { clearTimeout(timer); if (!activeTools && stallMs > 0) timer = setTimeout(() => { member.action='stall'; controller.abort('stalled'); }, stallMs); };
          attempts++;
          onEvent?.({type:'progress',id:key,label,attempt:attempts});
          workflowOutput?.agent(invocation,{attempt:attempts});
          arm();
          let value = null;
          failure=undefined;failureKind=undefined;
          try {
            signal.throwIfAborted();
            // Local: the provider seam (codexAgent.js) frames the prompt (provenance.js) and staggers same-prefix siblings.
            value = await runAgent(prompt, {
              ...merged, defaultModel, pinnedModel, log: onLog, signal, framePrompt: framed, ...defaults.runId ? { worktreeName: `${defaults.runId}-${invocation}` } : {},
              onMetrics: m => { reportedTokens ||= m.tokens?.total!=null; attemptToolCalls=m.toolCalls??attemptToolCalls; workflowOutput?.agent(invocation,{...m.agentId?{agentId:m.agentId}:{},...m.tokens?.total==null?{}:{tokens:totalTokens+m.tokens.total},...m.toolCalls==null?{}:{toolCalls:totalToolCalls+m.toolCalls}}); metrics=m; totalTokens += m.tokens?.total ?? 0; outputTokens += m.tokens?.output ?? 0; },
              // Local: activity.tokens is this attempt's spend so far; earlier attempts' totals come first.
              onActivity: activity => { const tokens=Number.isFinite(activity.tokens)?{tokens:totalTokens+activity.tokens}:{}; attemptToolCalls=activity.toolCalls??attemptToolCalls; workflowOutput?.agent(invocation,{lastProgressAt:Date.now(),...activity.toolCalls===undefined?{}:{toolCalls:totalToolCalls+activity.toolCalls},...activity.lastToolName===undefined?{}:{lastToolName:activity.lastToolName},...tokens}); activeTools = activity.activeTools ?? activeTools; arm(); noteSpend(); onEvent?.({type:'progress',id:key,label,...activity,...tokens,attempt:attempts}); },
              onProgress: text => { workflowOutput?.agent(invocation,{lastProgressAt:Date.now()}); arm(); onProgress?.(label,text,key); },
            });
          } catch (error) {
            failure = String(error?.message ?? error);
            failureKind=error instanceof StructuredAgentError?error.kind:undefined;
            if (error instanceof ToolNarrowingError) throw error; // a refused spawn is never retried or returned as null
            // Local: a configuration mistake fails the call (after its end event), never a retry or a null result.
            if (isAgentConfigError(error) && !member.action) { fatal = error; return null; }
            if (!member.action) { if (defaults.signal?.aborted || executionState.cancelled) throw error; if(failureKind!=='missing')onLog?.(`[${label}] failed: ${failure}`); } // Claude Code 2.1.280: a terminal error leaves a null result
          } finally { clearTimeout(timer); totalToolCalls+=attemptToolCalls; noteSpend(); }
          metrics = { ...metrics, ms:Date.now()-startedAt, tokens:{...metrics?.tokens,total:totalTokens,output:outputTokens,reasoning:0} };
          if (member.action==='skip') { failure='skipped by user'; return null; }
          if (member.action==='retry') { restarts.push('user-retry'); continue; }
          if (member.action==='stall') {
            restarts.push('stalled');
            // Local: Claude Code 2.1.280's stall log, then its error once every attempt stalled.
            if (stalls++ < STALL_RETRIES) { onLog?.(`[stall] agent "${label}" stalled (no progress) after ${Math.round((Date.now() - attemptStartedAt) / 1000)}s \u2014 retrying (${stalls}/${STALL_RETRIES})`); continue; }
            const n = restarts.length;
            fatal = new Error(restarts.every(reason => reason === 'stalled') ? `agent stalled on all ${n} attempts (no progress for ${stallMs}ms each)` : `agent abandoned after ${n} attempts (${restarts.join(' \u2192 ')})`);
            failure = fatal.message;
            return null;
          }
          return value;
        }
      }
    }, queueSignal);
    executionState.inflight.add(execution);
    const result = await execution.catch(async error=>{
      if(!published&&member.action==='skip'){failure='skipped by user';return null;}
      if(journal&&!executionState.cancelled&&!defaults.signal?.aborted)await journal.record(key,label,null);
      if(!published||refusesSpawn(error))failAdmission(error);throw error;
    }).finally(()=>{executionState.controllers.delete(key);executionState.inflight.delete(execution);});
    // Local: a user skip is not a failure — status/state 'skipped' (error kept for older viewers).
    const skipped = result === null && failure === 'skipped by user';
    const completed=result!==null||failureKind==='missing';
    workflowOutput?.agent(invocation,{state:skipped?'skipped':completed?'done':'error',resultPreview:workflowPreview(result),lastProgressAt:Date.now(),
      ...reportedTokens?{tokens:metrics.tokens.total}:{},
      ...metrics?.model==null?{}:{model:metrics.model},...metrics?.ms==null?{}:{durationMs:metrics.ms},
      ...failure===undefined||completed?{}:{error:failure},
    });
    onEvent?.({
      type: "end", id: key, label, phase: effectivePhase, phaseIndex, seq: invocation, effort: merged.effort ?? null,
      ...(!completed ? { status: skipped ? "skipped" : "failed", error: failure ?? "Agent returned no result" } : {}),
      // Local: the result preview rides on the event too, so a run that fails later still knows which agents returned something.
      ...(completed && !skipped ? { resultPreview: workflowPreview(result) ?? "" } : {}),
      model: metrics?.model ?? reqModel,
      tokens: metrics?.tokens?.total ?? null,
      ms: metrics?.ms ?? null,
    });
    if (journal && key) {
      await journal.record(key, label, result, {
        phase: effectivePhase,
        agentId: metrics?.agentId,
        effort: merged.effort ?? null,
        model: metrics?.model ?? reqModel,
        tokens: metrics?.tokens?.total ?? null,
        tokensOut: metrics?.tokens ? metrics.tokens.output + metrics.tokens.reasoning : null,
        ms: metrics?.ms ?? null,
      });
    }
    if (fatal) throw fatal;
    if (opts.schema && result === null && failure && failureKind!=='provider' && !skipped) throw new Error(failure);
    return api.copyResult(result);
  }

  // BARRIER fan-out. A thunk that throws (or whose agent errors) resolves to null.
  // Each thunk runs under a layer-width store of thunks.length, so agent() calls
  // inside it can scale effort to the fan-out (see effortForLayerWidth).
  // Claude 2.1.286 checks the cap and budget after the empty-array fast path,
  // before validating or invoking callbacks (runtime.js:1341–1359, ot()/kt()).
  // Extension namespaces follow tasks; agent cache identity remains run-wide.
  async function parallel(thunks) {
    if (executionState.cancelled) return new Promise(() => {});
    const parent = currentScope(), tag = scopeTag(parent, 'p'); // positional, before any await
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!Array.isArray(thunks)) throw new TypeError('parallel() expects an array of functions');
    const tasks = vmHelpers.snapshot(thunks, 4096), width = tasks.length;
    if (!width) return vmHelpers.clone([]);
    checkAgentCap();
    checkBudget();
    for (const task of tasks) {
      if (typeof task !== 'function') throw new TypeError('parallel() expects an array of functions, not promises. Wrap each call: () => agent(...)');
    }
    const scopes = tasks.map((_, index) => childScope(parent, `${tag}.${index}`));
    let dropped = 0;
    const results = await Promise.all(tasks.map((task, index) => scopeCtx.run(scopes[index], () => layerCtx.run({ width }, async () => {
      try { return await vmHelpers.settle(vmHelpers.call(task)); }
      catch (error) { if (budgetDrop(error)) { dropped++; return { value: null }; } onLog?.(`  ! parallel task failed: ${error?.message ?? error}`); if (!executionState.cancelled) onSlotFailure?.(`parallel[${index}] failed: ${error?.message ?? error}`); return { value: null }; }
    }))));
    reportDropped("parallel", dropped);
    return vmHelpers.clone(results.map(result => result.value));
  }

  async function pipeline(items, ...stages) {
    if (executionState.cancelled) return new Promise(() => {});
    const parent = currentScope(), tag = scopeTag(parent, 'l'); // positional, before any await
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!Array.isArray(items)) throw new TypeError('pipeline() expects an array as the first argument');
    const inputs = vmHelpers.snapshot(items, 4096), width = inputs.length;
    if (!width) return vmHelpers.clone([]);
    checkAgentCap();
    checkBudget();
    for (const stage of stages) {
      if (typeof stage !== 'function') throw new TypeError('pipeline() stages must be functions: pipeline(items, item => ..., result => ...)');
    }
    // Each item retains a namespace for human/session extensions. Agent calls
    // advance the shared journal in their actual invocation order.
    const scopes = inputs.map((_, index) => childScope(parent, `${tag}.${index}`));
    let dropped = 0;
    const results = await Promise.all(inputs.map((item, index) => scopeCtx.run(scopes[index], () => layerCtx.run({ width }, async () => {
      try {
        let settled = await vmHelpers.settle(item);
        for (const stage of stages) {
          if (settled.value === null) break;
          settled = await vmHelpers.settle(vmHelpers.call(stage, settled.value, item, index));
        }
        return settled;
      } catch (error) { if (budgetDrop(error)) { dropped++; return { value: null }; } onLog?.(`pipeline item failed: ${error?.message ?? error}`); if (!executionState.cancelled) onSlotFailure?.(`pipeline[${index}] failed: ${error?.message ?? error}`); return { value: null }; }
    }))));
    reportDropped("pipeline", dropped);
    return vmHelpers.clone(results.map(result => result.value));
  }

  function phase(title) {
    if(nested)return;
    currentPhase = displayValue(title);
    announcePhase(currentPhase);
  }
  function log(message) {
    onLog?.((nestedName===undefined?'':`[${nestedName}] `)+displayValue(message));
  }

  // spent() covers the whole run, nested children included (the pool is shared).
  const budget = {
    total: budgetTotal,
    spent: () => meterSpent(),
    remaining: () => (budgetTotal != null ? Math.max(0, budgetTotal - meterSpent()) : Infinity),
  };

  // Strings select a registered name; explicit files use {scriptPath}.
  async function workflow(ref, subArgs) {
    if (nested) throw new Error('workflow() cannot be called from within a child workflow — nesting is limited to one level. Inline the inner script or call its agents directly.');
    const parentScope = currentScope(), childJournalScope = childScope(parentScope, scopeTag(parentScope, 'w')); // positional, before any await
    ref=vmHelpers.clone(ref);
    let scriptPath;
    if (typeof ref === "string") {
      scriptPath=typeof resolveWorkflow==='function'?await resolveWorkflow(ref):resolveNamedWorkflow(ref);
    } else if (ref && typeof ref === "object" && typeof ref.scriptPath === "string") {
      if (allowScriptPath === false) throw new Error(scriptPathRefusal || 'workflow({scriptPath}) is not allowed in this session — nest with workflow(\'<name>\') instead.');
      scriptPath = ref.scriptPath;
    } else {
      throw new TypeError('workflow() expects a workflow name (string) or {scriptPath: string}');
    }
    const { runWorkflowSource,parseClaudeWorkflowScript } = await import("./runWorkflow.js");
    const {readFile}=await import('node:fs/promises');
    const source=await readFile(scriptPath,'utf8');
    const {meta}=parseClaudeWorkflowScript(source);
    const count=(childCounts.get(meta.name)??0)+1;childCounts.set(meta.name,count);
    const childPhase=`▸ ${meta.name}${count>1?` #${count}`:''}`;
    workflowPhases.reserve(childPhase,'child');
    onLog?.(`▸ running dynamic workflow ${meta.name}`);
    let failure;
    try {
    const value=await scopeCtx.run(childJournalScope, () => runWorkflowSource(source, {
      args: subArgs,
      budgetTotal,
      budgetMeter,
      budgetSpentBefore,
      sharedBudget,
      defaults,
      defaultModel,
      pinnedModel,
      ignoreRequestedModel,
      autoEffort,
      pinnedEffort,
      plan,
      onPhase,
      onLog,
      onAgentPlan,
      onEvent,
      journal,
      startSession,
      runAgent,
      onProgress,
      humanChannel,
      nested: true,
      parentRuntime:api,
      nestedName:meta.name,
      nestedPhase:childPhase,
      timerOwner,
      sharedGlobals,
      workflowOutput,
      workflowPhases,
      onFailure:diagnostic=>{failure=diagnostic;},
      executionState,
      journalScope: childJournalScope,
    }));
    onLog?.(`▸ ${meta.name} done`);
    return value;
    }catch(error){onLog?.(`▸ ${meta.name} failed: ${failure??workflowErrorText(vmHelpers.errorInfo(error))}`);if(!executionState.cancelled)onSlotFailure?.(`workflow ${meta.name} failed: ${failure??workflowErrorText(vmHelpers.errorInfo(error))}`);throw error;}
  }

  // ── Sessionful workers (agent.start / agent.waitAny / session.*) ──────────────
  // Long-lived Codex workers the workflow can spawn, wait on, and steer with
  // follow-up turns on the SAME thread (see references/authoring.md → "Sessionful
  // workers" and examples/sessionful-workers.workflow.js). Turns journal under a
  // `sess:<id>#<turn>` keyspace that agent() never generates. Resume is WARM: on a
  // --resume the worker re-attaches to its persisted Codex thread (thread/resume)
  // and replays the prompt-matched completed-turn prefix free; if re-attach fails,
  // every turn re-runs live (no fake thread resurrection). See startLiveSession.

  const TIMEOUT = Symbol("waitAny-timeout");
  const isRunningStatus = (s) => s === "starting" || s === "running";

  // The workflow-facing handle around a live CodexSessionDriver. Owns per-turn
  // concurrency-slot accounting, budget/cap gating, lifecycle events, journaling,
  // and the latest snapshot. Exposes ONLY safe methods to the script (no client).
  class LiveAgentSession {
    constructor({ id, driver, label, phase, reqModel, effort, replay = null }) {
      this.id = id;
      this.label = label;
      this.phase = phase;
      this._driver = driver;
      this._reqModel = reqModel;
      this._replay = replay; // journaled completed turns (by index) — warm-context resume only
      this._effort = effort ?? null; // default effort for follow-up turns
      this._status = "starting";
      this._turnCount = 0;
      this._completion = null; // current turn's settle promise (-> snapshot)
      this._settled = true; // no active turn yet
      this._cancelRequested = false;
      this._snapshot = {
        id, label, phase, threadId: driver.threadId, turnId: null,
        status: "starting", result: null, text: null, error: null,
        model: reqModel, effort: this._effort, tokens: null, ms: null,
      };
    }

    get status() { return this._status; }
    get threadId() { return this._driver.threadId ?? null; }
    get currentTurnId() { return this._snapshot.turnId ?? null; }

    poll() { return { ...this._snapshot }; }

    _isRunning() { return isRunningStatus(this._status); }
    _isActionable() { return this._settled || this._status === "closed"; }
    // Resolves when the current turn settles (or immediately if none is active).
    _settledPromise() { return this._completion ?? Promise.resolve(this._snapshot); }

    // Begin one turn (the initial turn or a steer). The caller MUST have acquired a
    // concurrency slot; the turn's completion releases it exactly once. On a start
    // failure (turn could not be started) this throws and the caller releases.
    async _beginTurn(prompt, turnOpts, kind) {
      this._cancelRequested = false;
      const turnIndex = this._turnCount++;
      const sessKey = `sess:${this.id}#${turnIndex}`; // journal/event id (never a resume key)
      const effort = turnOpts.effort ?? this._effort ?? undefined;

      // Warm-context resume: this turn already completed in a prior run AND the
      // worker is re-attached to its persisted thread (which holds the turn's
      // context) — replay the journaled result free instead of re-running it.
      // Positional like the one-shot occurrence counters, BUT also prompt-checked:
      // the cached entry stores the prompt's identityHash, and we only replay when
      // the current prompt matches (a changed/conditional steer — e.g. one built
      // from an edited human() answer — must NOT serve the stale result). The first
      // mismatch invalidates the rest of the prefix too: once a turn runs live, the
      // thread context diverges from what the later cached turns assumed, so they
      // must re-run as well (mirrors the contiguous-completed-prefix rule at start).
      const cached = this._replay ? this._replay[turnIndex] : undefined;
      const promptMatches = cached && cached.promptHash != null && cached.promptHash === identityHash(prompt);
      if (cached && !promptMatches) {
        this._replay = null; // diverged here → stop replaying; this turn + all later run live
        onLog?.(`  ⊝ ${kind === "steer" ? "steer" : "agent.start"} (prompt changed — re-running live): ${this.label}`);
      }
      if (cached && promptMatches) {
        this._status = "completed";
        this._settled = true;
        this._snapshot = {
          id: this.id, label: this.label, phase: this.phase,
          threadId: this._driver.threadId, turnId: null,
          status: "completed", result: cached.result ?? null,
          text: typeof cached.result === "string" ? cached.result : null, error: null,
          model: cached.model ?? this._reqModel, effort: cached.effort ?? effort ?? null,
          tokens: cached.tokens ?? null, ms: cached.ms ?? null,
        };
        onLog?.(`  ◦ ${kind === "steer" ? "steer" : "agent.start"} (cached): ${this.label}`);
        onEvent?.({ type: "cached", id: sessKey, label: this.label, phase: this.phase, kind: "session", sessionId: this.id, turn: turnIndex });
        this._completion = Promise.resolve({ ...this._snapshot });
        release(); // the caller's slot — a replayed turn does no model work
        return;
      }

      let begun;
      try {
        begun = await this._driver.beginTurn(prompt, {
          schema: turnOpts.schema,
          effort,
          timeoutMs: turnOpts.timeoutMs,
          onProgress: onProgress ? (text) => onProgress(this.label, text, sessKey) : undefined,
        });
      } catch (e) {
        this._turnCount--; // roll back so the session can be retried/steered
        throw e; // the caller (start/steer) releases the slot
      }

      this._status = "running";
      this._settled = false;
      this._snapshot = {
        id: this.id, label: this.label, phase: this.phase,
        threadId: this._driver.threadId, turnId: begun.turnId,
        status: "running", result: null, text: null, error: null,
        model: this._reqModel, effort: effort ?? null, tokens: null, ms: null,
      };
      onLog?.(`  ⟳ ${kind === "steer" ? "steer" : "agent.start"}: ${this.label}` +
        `${turnOpts.schema ? "  [schema]" : ""}${effort ? `  ⟪${effort}⟫` : ""}`);
      // Lifecycle 'start' (balanced by a terminal 'end' below, so liveState's
      // running/done counts stay correct even on cancel/fail). Extra session fields
      // are additive — existing viewers/summary ignore them.
      onEvent?.({
        type: "start", id: sessKey, label: this.label, phase: this.phase,
        effort: effort ?? null, model: this._reqModel,
        kind: "session", sessionId: this.id, turn: turnIndex,
      });

      // Settle in the background. IMPORTANT: do NOT return this promise — _beginTurn
      // must resolve once the turn has STARTED (so agent.start/steer return promptly);
      // the completion is stored on this._completion for wait()/waitAny()/cancel().
      this._completion = (async () => {
        let outcome;
        try {
          outcome = await begun.completion;
        } catch (e) {
          outcome = { status: "failed", error: String(e?.message ?? e), turnId: begun.turnId };
        }
        try {
          return await this._settleTurn(outcome, { sessKey, turnIndex, effort, promptHash: identityHash(prompt) });
        } finally {
          release(); // free the slot held for THIS turn (exactly once)
        }
      })();
    }

    // Fold a turn outcome into the snapshot, emit the terminal event, and journal it
    // (observability only). Never throws, so the completion promise never rejects.
    async _settleTurn(outcome, { sessKey, turnIndex, effort, promptHash }) {
      this._settled = true;
      const snapStatus =
        outcome.status === "completed" ? "completed" :
        outcome.status === "interrupted" ? (this._cancelRequested ? "cancelled" : "interrupted") :
        "failed";
      this._status = snapStatus;
      this._snapshot = {
        id: this.id, label: this.label, phase: this.phase,
        threadId: this._driver.threadId, turnId: outcome.turnId ?? this._snapshot.turnId,
        status: snapStatus, result: outcome.result ?? null, text: outcome.text ?? null,
        error: outcome.error ?? null, model: outcome.model ?? this._reqModel,
        effort: effort ?? null, tokens: outcome.tokens ?? null, ms: outcome.ms ?? null,
      };
      try {
        onEvent?.({
          type: "end", id: sessKey, label: this.label, phase: this.phase,
          effort: effort ?? null, model: this._snapshot.model,
          tokens: this._snapshot.tokens, ms: this._snapshot.ms,
          status: snapStatus, error: this._snapshot.error, kind: "session", sessionId: this.id, turn: turnIndex,
        });
      } catch {}
      if (journal) {
        try {
          await journal.record(sessKey, this.label, this._snapshot.result ?? this._snapshot.text ?? null, {
            phase: this.phase, effort: effort ?? null, model: this._snapshot.model,
            tokens: this._snapshot.tokens, ms: this._snapshot.ms,
            session: true, sessionId: this.id, turn: turnIndex, status: snapStatus,
            threadId: this._driver.threadId ?? null, promptHash: promptHash ?? null,
          });
        } catch {}
      }
      return { ...this._snapshot };
    }

    async wait({ timeoutMs } = {}) {
      if (this._settled || !this._completion) return { ...this._snapshot };
      if (timeoutMs == null) {
        await this._completion.catch(() => {});
        return { ...this._snapshot };
      }
      let timer;
      const timeoutP = new Promise((res) => { timer = setTimeout(() => res(TIMEOUT), timeoutMs); });
      const r = await Promise.race([this._completion.then(() => null, () => null), timeoutP]);
      clearTimeout(timer);
      if (r === TIMEOUT) return { ...this._snapshot, status: "timed_out" }; // turn keeps running
      return { ...this._snapshot };
    }

    async steer(message, opts = {}) {
      if (this._status === "closed") throw new Error(`Cannot steer closed session ${this.label}.`);
      if (!this._settled && this._completion) {
        throw new Error(`Cannot steer session ${this.label} while a turn is already running. Call wait(), waitAny(), or cancel() first.`);
      }
      bumpAgentCount();
      checkBudget();
      await acquire();
      try {
        await this._beginTurn(message, { schema: opts.schema, effort: opts.effort, timeoutMs: opts.timeoutMs }, "steer");
      } catch (e) {
        release();
        throw e;
      }
      if (opts.wait === false) return { ...this._snapshot }; // running snapshot
      await this._completion.catch(() => {});
      return { ...this._snapshot };
    }

    async cancel() {
      if (this._status === "closed") return { ...this._snapshot };
      if (this._settled || !this._completion) return { ...this._snapshot };
      this._cancelRequested = true;
      await this._driver.interruptCurrent();
      await this._completion.catch(() => {}); // resolves interrupted -> mapped to cancelled
      return { ...this._snapshot };
    }

    async close() {
      if (this._status === "closed") { openSessions.delete(this); return; }
      if (!this._settled && this._completion) { try { await this.cancel(); } catch {} }
      try { await this._driver.cleanup(); } catch {}
      this._status = "closed";
      this._snapshot = { ...this._snapshot, status: "closed" };
      openSessions.delete(this);
    }
  }

  async function startLiveSession(prompt, opts = {}) {
    opts = withNormalizedToolOptions(opts); // as agent(): Claude's disallowedTools / bashCommandClamp checks
    const merged = { ...defaults, ...opts };
    const label = opts.label || (typeof prompt === "string" ? prompt.slice(0, 64) : "session");
    const phase = opts.phase ?? currentPhase ?? null;
    const width = currentLayerWidth();
    const { effort } = resolveEffort(opts, width);
    const reqModel = pinnedModel ?? opts.model ?? defaultModel ?? null;
    const id = `${keyPrefix}s${++sessionSeq}`;
    checkCancelled();

    // Warm-context resume (--resume): a prior run journaled this worker's turns
    // under sess:<id>#<n> with its Codex thread id. Collect the completed-turn
    // prefix (replay candidates) and the thread to re-attach. Replay is only valid
    // if re-attach SUCCEEDS — a fresh thread never saw those prompts, so on a
    // failed re-attach every turn re-runs live (no fake thread resurrection).
    let replayPrefix = null;
    let resumeThreadId = null;
    if (journal && journal.reuse) {
      const prefix = [];
      for (let t = 0; ; t++) {
        const e = journal.entry(`sess:${id}#${t}`);
        if (!e) break;
        if (e.threadId) resumeThreadId = e.threadId;
        if (e.status === "completed" && prefix.length === t) prefix.push(e);
      }
      if (prefix.length) replayPrefix = prefix;
    }

    // Each turn is one unit of model work: count it and gate on budget, then hold a
    // concurrency slot for the WHOLE turn (a detached running turn occupies the cap).
    bumpAgentCount();
    checkBudget();
    await acquire();

    let driver;
    try {
      driver = await startSession({ ...merged, defaultModel, pinnedModel, log: onLog, resumeThreadId: resumeThreadId ?? undefined });
    } catch (e) {
      release();
      throw e;
    }

    const replay = driver.resumed && replayPrefix ? replayPrefix : null;
    const session = new LiveAgentSession({ id, driver, label, phase, reqModel, effort, replay });
    openSessions.add(session);
    try {
      await session._beginTurn(prompt, { schema: opts.schema, effort, timeoutMs: opts.timeoutMs }, "start");
    } catch (e) {
      release(); // first turn never started — free the slot
      try { await driver.cleanup(); } catch {}
      openSessions.delete(session);
      throw e;
    }
    return session; // returns with the first turn RUNNING (not awaited)
  }

  async function waitAnyLive(sessionList, { timeoutMs } = {}) {
    const list = (Array.isArray(sessionList) ? sessionList : []).filter(Boolean);
    if (!list.length) return { session: null, index: null, snapshot: null, pendingSessions: [], timedOut: false };

    const pendingOf = (winner) => list.filter((s) => s !== winner && s._isRunning());

    // Already actionable? Return the lowest-index one immediately (deterministic).
    for (let i = 0; i < list.length; i++) {
      if (list[i]._isActionable()) {
        return { session: list[i], index: i, snapshot: list[i].poll(), pendingSessions: pendingOf(list[i]), timedOut: false };
      }
    }
    // Otherwise race the running sessions' settle promises (+ optional timeout).
    const racers = list.map((s, i) => s._settledPromise().then(() => ({ i })));
    let timer;
    const timeoutP = timeoutMs != null ? new Promise((res) => { timer = setTimeout(() => res(TIMEOUT), timeoutMs); }) : null;
    const r = await Promise.race(timeoutP ? [...racers, timeoutP] : racers);
    if (timer) clearTimeout(timer);
    if (r === TIMEOUT) {
      return { session: null, index: null, snapshot: null, pendingSessions: list.filter((s) => s._isRunning()), timedOut: true };
    }
    const winner = list[r.i];
    return { session: winner, index: r.i, snapshot: winner.poll(), pendingSessions: pendingOf(winner), timedOut: false };
  }

  // ── Plan mode (--plan): no Codex. Sessions become deterministic skeletons so the
  // orchestration runs; every start/steer is COUNTED via onAgentPlan so the budget
  // estimate isn't misleading.
  class PlannedAgentSession {
    constructor({ id, label, phase, reqModel, effort, schema }) {
      this.id = id;
      this.label = label;
      this.phase = phase;
      this._reqModel = reqModel;
      this._effort = effort ?? null;
      this._schema = schema;
      this._status = "completed";
      this._turnCount = 1;
      this._snapshot = this._snap(schema, "completed", `plan-${id}-t0`);
    }
    _snap(schema, status, turnId) {
      return {
        id: this.id, label: this.label, phase: this.phase,
        threadId: `plan-${this.id}`, turnId,
        status, result: schema ? schemaSkeleton(schema) : "", text: "", error: null,
        model: this._reqModel, effort: this._effort, tokens: null, ms: null,
      };
    }
    get status() { return this._status; }
    get threadId() { return `plan-${this.id}`; }
    get currentTurnId() { return this._snapshot.turnId; }
    poll() { return { ...this._snapshot }; }
    async wait() { return { ...this._snapshot }; }
    async steer(message, opts = {}) {
      bumpAgentCount();
      const turnIndex = this._turnCount++;
      onAgentPlan?.({ label: this.label, phase: this.phase, effort: (opts.effort ?? this._effort) ?? null, width: 1, schema: !!opts.schema, kind: "steer" });
      this._snapshot = this._snap(opts.schema ?? this._schema, "completed", `plan-${this.id}-t${turnIndex}`);
      return { ...this._snapshot };
    }
    async cancel() { this._status = "cancelled"; this._snapshot = { ...this._snapshot, status: "cancelled" }; return { ...this._snapshot }; }
    async close() { this._status = "closed"; this._snapshot = { ...this._snapshot, status: "closed" }; }
  }

  async function startPlannedSession(prompt, opts = {}) {
    const label = opts.label || (typeof prompt === "string" ? prompt.slice(0, 64) : "session");
    const phase = opts.phase ?? currentPhase ?? null;
    const width = currentLayerWidth();
    const { effort } = resolveEffort(opts, width);
    const reqModel = pinnedModel ?? opts.model ?? defaultModel ?? null;
    const id = `s${++sessionSeq}`;
    bumpAgentCount();
    onAgentPlan?.({ label, phase, effort: effort ?? null, width, schema: !!opts.schema, kind: "session-start" });
    return new PlannedAgentSession({ id, label, phase, reqModel, effort, schema: opts.schema });
  }

  async function waitAnyPlanned(sessionList) {
    const list = (Array.isArray(sessionList) ? sessionList : []).filter(Boolean);
    const open = list.filter((s) => s.status !== "closed");
    if (!open.length) return { session: null, index: null, snapshot: null, pendingSessions: [], timedOut: false };
    const winner = open[0];
    return { session: winner, index: list.indexOf(winner), snapshot: winner.poll(), pendingSessions: open.slice(1), timedOut: false };
  }

  // ── human(question, opts?) — the `interactive` involvement mode ─────────────
  // A declared fork: the workflow pauses HERE (and only here) for a human answer.
  // Resolution order (first hit wins):
  //   1. --plan                      → the default, immediately (plan never blocks)
  //   2. args.checkpointAnswers[id]  → the documented resume convention
  //   3. journal replay (--resume)   → a previously-given answer replays free
  //   4. the live channel            → viewer/CLI answer (humanChannel), up to timeoutMs
  //   5. the default                 → hands_off degradation; never blocks without a channel
  // Answers are journaled under a `human:<id>#<occ>` key (a namespace agent() never
  // generates), so a --resume run replays them — and the run stays reproducible.
  let humanSeq = 0; // counts ONLY id-less calls, so an explicit-id call before an
                    // anonymous one doesn't shift the anon q-number across runs
  const humanOcc = new Map(); // qid -> next occurrence index
  async function human(question, opts = {}) {
    const choices = Array.isArray(opts.choices) && opts.choices.length ? opts.choices.map(String) : null;
    const def = opts.default !== undefined ? opts.default : choices ? choices[0] : null;
    const qid = opts.id != null ? String(opts.id) : `q${++humanSeq}`;
    if (plan) return def;
    const pre = args && args.checkpointAnswers && Object.prototype.hasOwnProperty.call(args.checkpointAnswers, qid)
      ? args.checkpointAnswers[qid] : undefined;
    const occ = humanOcc.get(qid) ?? 0;
    humanOcc.set(qid, occ + 1);
    const key = `human:${keyPrefix}${qid}#${occ}`;
    if (pre !== undefined) {
      onLog?.(`  ⊟ human (${qid}): answered from args.checkpointAnswers`);
      if (journal) { try { await journal.record(key, qid, pre, { human: true, question: String(question), source: "args" }); } catch {} }
      return pre;
    }
    if (journal && journal.reuse && journal.hit(key)) {
      onLog?.(`  ⊟ human (${qid}): answer replayed from the journal`);
      onEvent?.({ type: "cached", id: key, label: qid, kind: "human" });
      return journal.get(key);
    }
    if (humanChannel) {
      const payload = { id: key, qid, question: String(question), choices, default: def ?? null };
      onLog?.(`  ⊟ human (${qid}): waiting for an answer — ${String(question).slice(0, 80)}`);
      onEvent?.({ type: "question", id: key, label: qid, kind: "human", question: payload.question, choices, default: payload.default });
      try { humanChannel.notify(payload); } catch {}
      let got;
      try { got = await humanChannel.wait(key, { timeoutMs: opts.timeoutMs ?? 600_000 }); } catch {}
      if (got && got.answer !== undefined) {
        onLog?.(`  ⊟ human (${qid}): answered`);
        onEvent?.({ type: "answered", id: key, label: qid, kind: "human" });
        if (journal) { try { await journal.record(key, qid, got.answer, { human: true, question: String(question), source: "live" }); } catch {} }
        return got.answer;
      }
      onEvent?.({ type: "answered", id: key, label: qid, kind: "human", timedOut: true });
    }
    if (!humanChannel) throw new Error("Interactive workflow questions require args.checkpointAnswers in this app.");
    onLog?.(`  ⊟ human (${qid}): no answer — using the default${def == null ? " (null)" : ""}`);
    if (journal) { try { await journal.record(key, qid, def, { human: true, question: String(question), source: "default" }); } catch {} }
    return def;
  }

  // Close any sessions the workflow left open (cancels their active turn + cleans
  // worktrees). Called by runWorkflowSource in a finally — NEVER exposed to the script.
  async function finalize() {
    for (const s of [...openSessions]) {
      try { await s.close(); } catch {}
    }
  }
  executionState.finalizers.add(finalize);

  // Local: stop the whole run (parent and nested children). Withdraws queued
  // agents, aborts in-flight ones (each interrupts its turn and removes its clean
  // worktree on the way out), closes open sessions, then resolves — bounded so the
  // caller can still shut the app-server down and exit before a hard kill.
  async function cancel() {
    if (!executionState.cancelled) {
      executionState.cancelled = true;
      executionState.runAbort.abort(new Error("Workflow cancelled"));
    }
    let timer;
    const work = Promise.allSettled([...executionState.inflight, ...[...executionState.finalizers].map(f => f())]);
    await Promise.race([work, new Promise(resolve => { timer = setTimeout(resolve, CANCEL_GRACE_MS); })]);
    clearTimeout(timer);
  }

  // Sessionful control hangs off agent (NOT new top-level globals), per the spec.
  agent.start = (prompt, opts) => (plan ? startPlannedSession(prompt, opts) : startLiveSession(prompt, opts));
  agent.waitAny = (sessions, opts) => (plan ? waitAnyPlanned(sessions, opts) : waitAnyLive(sessions, opts));

  const controlMember = (id, action) => { const member = executionState.controllers.get(id); if (!member || !['skip','retry'].includes(action)) return false; if (member.queued) { if (action==='skip') { member.action='skip'; member.queue.abort(new Error('skipped by user')); } return true; } member.action=action; member.controller?.abort(`user-${action}`); return true; };
  const api={ agentCount:()=>executionState.agentCount, agent, parallel:parentRuntime?.parallel??parallel, pipeline:parentRuntime?.pipeline??pipeline, phase, log, budget, args, workflow, human, CAP, finalize, cancel, controlMember, pause:setWorkflowPaused, copyResult:parentRuntime?.copyResult??(value=>vmHelpers.clone(value)), bindVM: helpers => { vmHelpers = helpers; } };
  return api;
}
