// The seam. Each agent() unit of work runs as one Codex thread + turn over the
// local `codex app-server`, returning the agent's final message (or, with a
// schema, the parsed structured object).
//
// Tier-1 hardening for cross-project use:
//   • reconnecting singleton client (a dead app-server no longer kills the run)
//   • model resolution (Claude ids / aliases -> available Codex models, via model/list)
//   • agentType -> developerInstructions (the .claude/agents registry)
//   • retry-with-backoff on transient Codex / transport errors

import { setTimeout as sleep } from "node:timers/promises";
import { AppServerClient } from "./appServerClient.js";
import { recordTokenUsage, tokensForThread } from "./meter.js";
import { resolveModel, modelId } from "./modelMap.js";
import { loadAgentType, unknownAgentTypeError, AgentConfigError, isAgentConfigError } from "./agentTypes.js";
import { workflowAgentInstructions } from "./subagentPrompt.js";
import { validateSchema, schemaProblem } from "./schemaValidate.js";
import { runStructuredAgent, StructuredAgentError } from './structuredAgent.js';
import { runJsonAgent } from './jsonAgent.js';
import { frameWorkflowPrompt, prefixStagger, prefixStaggerMs, relayUserRequest, USER_REQUEST_MAX } from './provenance.js';
import { narrowThreadParams, withNormalizedToolOptions, mergeDisallowed, ToolNarrowingError, coreToolControls } from './toolNarrowing.js';
export { AgentConfigError, isAgentConfigError };

// Normalize an authored JSON Schema for OpenAI strict structured outputs, which
// require EVERY property to be listed in `required` and `additionalProperties:false`
// on every object (optional fields are expressed as nullable types instead).
// Authors routinely omit a key, which 400s the turn — so make a valid-looking
// schema acceptable, recursively. Local: a property the author did NOT require is
// sent as `anyOf:[schema,{type:"null"}]`; checkSchemaResult() strips those nulls
// and validates against the author's own schema, so `required` keeps its meaning.
export function strictifySchema(s) {
  if (!s || typeof s !== "object") return s;
  if (Array.isArray(s)) return s.map(strictifySchema);
  const out = { ...s };
  if (out.properties && typeof out.properties === "object" && !Array.isArray(out.properties)) {
    const props = {};
    const required = new Set(Array.isArray(out.required) ? out.required : Object.keys(out.properties));
    for (const k of Object.keys(out.properties)) {
      const p = strictifySchema(out.properties[k]);
      props[k] = required.has(k) ? p : { anyOf: [p, { type: "null" }] };
    }
    out.properties = props;
    out.required = Object.keys(props); // strict mode: every property is required
    if (out.additionalProperties === undefined) out.additionalProperties = false;
  }
  if (out.items) out.items = strictifySchema(out.items);
  for (const kw of ["anyOf", "oneOf", "allOf"]) if (Array.isArray(out[kw])) out[kw] = out[kw].map(strictifySchema);
  for (const kw of ["$defs", "definitions"]) {
    if (out[kw] && typeof out[kw] === "object") {
      const d = {};
      for (const k of Object.keys(out[kw])) d[k] = strictifySchema(out[kw][k]);
      out[kw] = d;
    }
  }
  return out;
}

// Strict structured outputs need an object root. Local: other roots (arrays,
// scalars, combinators) are sent wrapped as {value: <schema>} and unwrapped by
// checkSchemaResult(), so authors may use a top-level array schema.
const isObjectRoot = s => s && typeof s === "object" && (s.type === "object" || (s.type === undefined && s.properties)) && !s.anyOf && !s.oneOf && !s.allOf && !s.$ref;
export function wireSchema(schema) {
  if (isObjectRoot(schema)) return strictifySchema(schema);
  const { $defs, definitions, ...rest } = schema ?? {};
  return strictifySchema({ type: "object", properties: { value: rest }, required: ["value"], additionalProperties: false, ...($defs ? { $defs } : {}), ...(definitions ? { definitions } : {}) });
}

let clientPromise; // lazily-connected, self-healing singleton
let currentClient; // the client behind clientPromise, for an immediate shutdown
let connecting; // Local: the single in-flight getClient() — concurrent callers share one replacement
let availableModels = []; // ids exposed by model/list, refreshed on each connect
// Local: whether the core's endpoint serves Codex's model catalog. Native Codex with a custom model_provider (a relay,
// a local server) still answers model/list with the OpenAI catalog, so Claude aliases must not map into it (modelMap.js).
let modelContext = { customProvider: false, configModel: null };

export const SANDBOX_MAP = {
  "read-only": "read-only",
  readOnly: "read-only",
  "workspace-write": "workspace-write",
  workspaceWrite: "workspace-write",
  "danger-full-access": "danger-full-access",
  dangerFullAccess: "danger-full-access",
};

// Returns a connected client, reconnecting if the previous process died. Callers
// that notice a dead client at the same time share one in-flight replacement.
export function getClient(options) {
  if (!connecting) {
    const p = connectClient(options);
    connecting = p;
    p.then(() => { if (connecting === p) connecting = undefined; }, () => { if (connecting === p) connecting = undefined; });
  }
  return connecting;
}

async function connectClient(options) {
  if (clientPromise) {
    const existing = await clientPromise.catch(() => null);
    if (existing && existing.readyState === "ready") return existing;
    clientPromise = undefined; // dead/failed — recreate below
  }
  const client = new AppServerClient(options ?? {});
  currentClient = client;
  client.on("notification", (n) => {
    if (n.method === "thread/tokenUsage/updated") recordTokenUsage(n.params);
  });
  const p = client.connect().then(async () => {
    try {
      availableModels = (await client.listModels()).map(modelId).filter(Boolean);
    } catch {
      availableModels = [];
    }
    modelContext = await readModelContext(client, options);
    return client;
  });
  clientPromise = p;
  p.catch(() => {
    if (clientPromise === p) clientPromise = undefined;
  });
  return p;
}

// Local: native Codex only (a bridge serves its own models in model/list): config/read's model_provider and model.
async function readModelContext(client, options) {
  if (coreToolControls(client, options) !== "codex") return { customProvider: false, configModel: null };
  try {
    const config = (await client.request("config/read", { cwd: options?.cwd ?? null }))?.config ?? {};
    const provider = typeof config.model_provider === "string" ? config.model_provider.trim() : "";
    return { customProvider: !!provider && provider !== "openai", configModel: typeof config.model === "string" && config.model ? config.model : null };
  } catch {
    return { customProvider: false, configModel: null };
  }
}

export async function shutdownClient() {
  // Local: shut the current process down immediately (even mid-connect); its
  // waiting turns reject with "client shut down" instead of hanging.
  const client = currentClient;
  currentClient = clientPromise = connecting = undefined;
  availableModels = [];
  modelContext = { customProvider: false, configModel: null };
  if (client) await client.shutdown();
}

// The model ids exposed by the most recent connect's model/list. Read by the
// session module (codexSession.js) so the one-shot and sessionful paths resolve
// models identically without each owning a client singleton.
export function getAvailableModels() {
  return availableModels;
}
// Local: resolveModel()'s context for an agent whose session (default) model is `sessionModel`.
export function modelResolution(sessionModel) {
  return { ...modelContext, sessionModel: sessionModel ?? modelContext.configModel ?? undefined, ...(modelTiers() ? { tiers: modelTiers() } : {}) };
}
// Local: the core's Claude tier map (Code Desktop's core descriptor workflowModelTiers), {opus|sonnet|haiku: [pattern…]}.
let tiersCache;
function modelTiers() {
  if (tiersCache !== undefined) return tiersCache;
  tiersCache = null;
  try {
    const value = JSON.parse(process.env.CODE_DESKTOP_WORKFLOW_MODEL_TIERS || "null");
    if (value && typeof value === "object" && !Array.isArray(value)) tiersCache = value;
  } catch {}
  return tiersCache;
}

// ── shared turn primitives ───────────────────────────────────────────────────
// Used by the one-shot path below AND by codexSession.js (sessionful workers), so
// both build threads/turns, collect streamed output, and parse schemas identically.

// Thread-level settings (sandbox, cwd, developer instructions, personality) are
// fixed for the life of the thread — a follow-up turn cannot change them.
export function buildThreadParams({ sandbox, cwd, model, systemPrompt, personality }) {
  const params = {
    approvalPolicy: "never",
    sandbox: SANDBOX_MAP[sandbox] ?? "workspace-write",
    cwd,
  };
  if (model) params.model = model;
  if (systemPrompt) params.developerInstructions = systemPrompt;
  if (personality) params.personality = personality;
  return params;
}

// Per-turn settings (effort, outputSchema) may differ between turns on one thread.
export function buildTurnParams({ threadId, prompt, model, effort, schema }) {
  const params = { threadId, input: [{ type: "text", text: String(prompt) }] };
  if (model) params.model = model;
  if (effort) params.effort = effort;
  if (schema) params.outputSchema = wireSchema(schema);
  return params;
}

// Accumulate a turn's agent-message text for one thread (streaming deltas + the
// authoritative item/completed text), surfacing partials via onProgress. Returns
// { text(), detach() }; the caller MUST detach() once the turn settles.
export function attachAgentMessageCollector(client, threadId, onProgress) {
  let finalText = "";
  const deltas = new Map();
  const onNote = (n) => {
    const p = n.params ?? {};
    if (p.threadId !== threadId) return;
    if (n.method === "item/agentMessage/delta" && typeof p.delta === "string") {
      deltas.set(p.itemId, (deltas.get(p.itemId) ?? "") + p.delta);
      // best-effort partial output for live viewers — must never break the turn.
      if (onProgress) { try { onProgress([...deltas.values()].join("")); } catch {} }
    } else if (n.method === "item/completed" && p.item?.type === "agentMessage" && p.item.phase !== "commentary") {
      // Local: a commentary message (a bridge's turn-end note such as "hit the step limit") is not the agent's reply.
      finalText = p.item.text ?? finalText;
    }
  };
  client.on("notification", onNote);
  return {
    text: () => finalText || (deltas.size ? [...deltas.values()].join("") : ""),
    detach: () => client.off("notification", onNote),
  };
}

// Parse a turn's final text under an optional schema: strict JSON.parse, then a
// tolerant fenced-JSON fallback. Without a schema the raw text passes through.
// Local: the value must validate against the author's schema, else null.
export function parseSchemaResult(text, schema) {
  if (!schema) return text;
  const checked = checkSchemaResult(text, schema);
  return checked.ok ? checked.value : null;
}

// Local: parse + unwrap + validate. Returns {ok, value, errors}.
export function checkSchemaResult(text, schema) {
  let value;
  try { value = JSON.parse(text); } catch { value = extractJson(text); }
  if (value === undefined) return { ok: false, value: null, errors: ["$: the reply is not valid JSON"] };
  if (!isObjectRoot(schema) && value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 && Object.hasOwn(value, "value")) value = value.value;
  value = stripOptionalNulls(value, schema, schema);
  const errors = validateSchema(value, schema);
  return errors.length ? { ok: false, value: null, errors } : { ok: true, value, errors };
}

// Remove nulls that strict mode put in properties the author left optional (and
// whose own schema does not accept null), recursively along the author's schema.
function stripOptionalNulls(value, schema, root, depth = 0) {
  if (!schema || typeof schema !== "object" || value === null || typeof value !== "object" || depth > 64) return value;
  if (typeof schema.$ref === "string") {
    const target = schema.$ref.slice(1).split("/").filter(Boolean).reduce((n, k) => n?.[k], root);
    if (target) return stripOptionalNulls(value, target, root, depth + 1);
  }
  if (Array.isArray(value)) return schema.items && !Array.isArray(schema.items) ? value.map(v => stripOptionalNulls(v, schema.items, root, depth + 1)) : value;
  if (!schema.properties) return value;
  const required = new Set(Array.isArray(schema.required) ? schema.required : []), out = {};
  for (const [k, v] of Object.entries(value)) {
    const prop = schema.properties[k];
    if (v === null && prop !== undefined && !required.has(k) && validateSchema(null, prop, root).length) continue;
    out[k] = prop === undefined ? v : stripOptionalNulls(v, prop, root, depth + 1);
  }
  return out;
}

/**
 * Run `prompt` as one Codex agent turn (with retry). See README for opts.
 * Returns string | parsed object (schema) | null (interrupted).
 */
export async function codexAgent(prompt, opts = {}) {
  const log = typeof opts.log === "function" ? opts.log : () => {};
  opts = withNormalizedToolOptions(opts); // Local: Claude's disallowedTools / bashCommandClamp checks (toolNarrowing.js)

  const problem = opts.schema ? schemaProblem(opts.schema) : null;
  if (problem) throw new AgentConfigError(`invalid outputSchema: ${problem}`);
  // agentType -> system prompt (+ optional model and tool limits) from the .claude/agents registry.
  let systemPrompt = opts.systemPrompt;
  let agentTypeModel, sandbox = opts.sandbox;
  if (opts.agentType) {
    const def = await loadAgentType(opts.agentType, opts.cwd ?? process.cwd());
    if (def) {
      if (!systemPrompt) systemPrompt = def.systemPrompt;
      agentTypeModel = def.model;
      if (def.sandbox === "read-only") sandbox = "read-only"; // built-in read-only types never widen access
      if (def.disallowedTools) opts = { ...opts, disallowedTools: mergeDisallowed(def.disallowedTools, opts.disallowedTools) };
      // Local: the definition's `tools:` allowlist (Claude limits the agent's tool pool to it; toolNarrowing.js).
      if (def.tools) opts = { ...opts, allowedTools: def.tools };
    } else {
      throw await unknownAgentTypeError(opts.agentType, opts.cwd ?? process.cwd());
    }
  }
  // Local: Claude Code 2.1.280's workflow-subagent instructions (subagentPrompt.js): a plain agent() runs on them, an
  // agentType's (or a systemPrompt's) own text gets the matching note appended. opts.workflowInstructions false opts out.
  if (opts.workflowInstructions !== false) {
    const mode = !opts.schema ? "text" : opts.structuredOutput === false || opts.structuredOutput === "outputSchema" ? "json" : "tool";
    systemPrompt = workflowAgentInstructions(systemPrompt, mode);
    opts = { ...opts, instructed: true };
  }
  // `pinnedModel` is authoritative: it overrides a per-call `model`, an
  // agentType model, and the CLI default — forcing every agent onto one model.
  if (opts.pinnedModel && opts.model && opts.model !== opts.pinnedModel) {
    log(`pinned model '${opts.pinnedModel}' overrides per-call model '${opts.model}'`);
  }
  const requestedModel = opts.pinnedModel ?? opts.model ?? agentTypeModel ?? opts.defaultModel;

  // Worktree isolation is set up once and reused across retry attempts.
  let cwd = opts.cwd ?? process.cwd();
  let worktree;
  if (opts.isolation === "worktree") {
    const { isGitRepo, createWorktree } = await import("./worktree.js");
    if (await isGitRepo(cwd)) {
      try { worktree = await createWorktree(cwd, opts.worktreeName); } // Local: Claude names it <runId>-<idx>
      catch (error) { throw new AgentConfigError(`isolation:'worktree' could not create a worktree in ${cwd}: ${String(error?.message ?? error).slice(0, 300)}`); }
      cwd = worktree.dir;
    } else {
      throw new AgentConfigError(`isolation:'worktree' requires a Git repo: ${cwd}`);
    }
  }

  // Local: Claude Code 2.1.280's agent prompt — the provenance frame (opts.framePrompt, provenance.js), then the
  // isolated-worktree note — and its same-prefix stagger, which holds siblings for the first one's first response.
  let text = opts.framePrompt ? frameWorkflowPrompt(prompt) : String(prompt);
  // Local: the triggering user request (opts.userRelay, from the host) goes before the framed task, as Claude relays it.
  if (opts.framePrompt && typeof opts.userRelay === "string" && opts.userRelay.trim() && opts.userRelay.length <= USER_REQUEST_MAX) text = relayUserRequest(opts.userRelay) + "\n\n" + text;
  if (worktree) text += `\nYou are running in an isolated git worktree at \`${worktree.dir}\` (a separate working copy of the repo). Changes you make here do NOT affect the main working directory (\`${opts.cwd ?? process.cwd()}\`) or other agents. Work normally \u2014 the worktree will be cleaned up automatically if you made no changes, or preserved for review if you did.`;
  const gate = await prefixStagger.enter([requestedModel ?? "", String(opts.effort ?? ""), opts.agentType ?? "", opts.schema ? JSON.stringify(opts.schema) : "", cwd].join("\n"), { capMs: prefixStaggerMs(), signal: opts.signal });
  if (gate.waitedMs > 0) log(`workflow agent [${opts.label ?? "agent"}] held ${gate.waitedMs}ms for a same-prefix sibling's first response (prompt-cache warm-up)`);
  const heard = { onActivity: activity => { if (activity?.retryAt === undefined) gate.responded(); opts.onActivity?.(activity); }, onProgress: value => { gate.responded(); opts.onProgress?.(value); } };
  try {
    return await withRetry(() => runOneTurn(text, { ...opts, ...heard, sandbox, systemPrompt, requestedModel, cwd, log }), {
      retries: opts.retries ?? 3,
      log,
      label: opts.label,
      signal: opts.signal,
      // The Tasks card shows "Waiting for rate limit" until retryAt (workflow-progress-model.mjs).
      onThrottle: retryAt => opts.onActivity?.({ retryAt }),
      ...(Number.isFinite(opts.throttleMs) ? { throttleMs: opts.throttleMs } : {}),
    });
  } finally {
    gate.done();
    if (worktree) {
      const r = await worktree.cleanup();
      if (!r.removed) log(`worktree kept (modified): ${r.dir}`);
    }
  }
}

// Local: the runtime calls this before admitting an agent, so a spawn the core can't narrow is refused up front (as
// Claude refuses it) instead of failing once it has started. Resolves the opts' tool options; throws ToolNarrowingError.
codexAgent.preflight = async function preflight(opts = {}) {
  opts = withNormalizedToolOptions(opts);
  let disallowedTools = opts.disallowedTools, sandbox = opts.sandbox;
  if (opts.agentType) {
    // Local: an unknown agentType is refused before admission, as Claude refuses it (AgentConfigError).
    const def = await loadAgentType(opts.agentType, opts.cwd ?? process.cwd());
    if (!def) throw await unknownAgentTypeError(opts.agentType, opts.cwd ?? process.cwd());
    if (def.disallowedTools) disallowedTools = mergeDisallowed(def.disallowedTools, disallowedTools);
    if (def.sandbox === "read-only") sandbox = "read-only";
  }
  if (!disallowedTools && !opts.bashCommandClamp) return;
  const client = await getClient(opts.clientOptions);
  await narrowThreadParams(client, buildThreadParams({ sandbox, cwd: opts.cwd ?? process.cwd() }), { ...opts, disallowedTools, log: () => {} });
};

const INTERRUPT_GRACE_MS = 5_000;

async function runOneTurn(prompt, opts) {
  const { log } = opts;
  const startedAt = Date.now(); // host clock — the script's Date.now is blocked, this isn't
  const client = await getClient(opts.clientOptions); // live (reconnects if needed)
  const model = resolveModel(opts.requestedModel, availableModels, log, modelResolution(opts.pinnedModel ?? opts.defaultModel));

  // Local: disallowedTools narrow the thread to what the core can really remove, or refuse (toolNarrowing.js).
  const threadParams = await narrowThreadParams(client, buildThreadParams({
    sandbox: opts.sandbox,
    cwd: opts.cwd,
    model,
    systemPrompt: opts.systemPrompt,
    personality: opts.personality,
  }), opts);
  const reportMetrics=(threadId,toolCalls)=>opts.onMetrics?.({
    ms:Date.now()-startedAt,model:model??null,tokens:tokensForThread(threadId),toolCalls,agentId:threadId,
  });
  // Local: a core without the StructuredOutput dynamic tool gets the schema in the prompt (jsonAgent.js): opts.structuredOutput
  // false (no structured output at all: ZCode, the ACP agents), or 'outputSchema' (turn/start outputSchema only: the
  // DeepSeek Harness and the OpenCode/MiMo bridges, which also get the wire schema on each turn).
  if(opts.schema&&(opts.structuredOutput===false||opts.structuredOutput==='outputSchema')) {
    log(`Workflow compatibility${opts.label ? ` [${opts.label}]` : ''}: this core returns structured results through ${opts.structuredOutput==='outputSchema'?'outputSchema and validated response JSON':'prompted JSON with validation and retries'}, rather than Claude's StructuredOutput tool.`);
    return runJsonAgent({client,threadParams,prompt,opts:{...opts,requestedModel:model},runTurn,check:checkSchemaResult,metrics:reportMetrics,...opts.structuredOutput==='outputSchema'?{outputSchema:wireSchema(opts.schema)}:{}});
  }
  if(opts.schema)return runStructuredAgent({client,threadParams,prompt,opts:{...opts,requestedModel:model},runTurn,metrics:reportMetrics});
  const startThreadRes = await client.startThread(threadParams);
  const threadId = startThreadRes?.thread?.id;
  if (!threadId) throw new Error("thread/start did not return thread.id");

  const state = { activeTools: new Set(), toolCalls: 0 };
  let result;
  // Per-agent attribution for the journal/viewer: wall time for this turn, the
  // tokens this thread consumed (cumulative, by completion), and the model the
  // turn actually ran on. Off the hot path — a side-channel callback, so the
  // value returned to the script is unchanged. Local: also for a failed or
  // stalled attempt (as jsonAgent/structuredAgent do), whose tokens were spent.
  try {
    const turnParams = buildTurnParams({ threadId, prompt, model, effort: opts.effort });
    const { turn, text } = await runTurn(client, threadId, turnParams, opts, state);
    if (turn.status === "interrupted") throw new Error("Agent turn interrupted");
    if (turn.status && turn.status !== "completed") {
      const err = new Error(turn.error?.message ?? `turn ended with status=${turn.status}`);
      err.codexErrorInfo = turn.error?.codexErrorInfo;
      throw err;
    }
    result=text;
  } finally {
    reportMetrics(threadId,state.toolCalls);
  }
  return result;
}

// Local: one turn, waited on with an INACTIVITY timeout instead of a fixed 600s
// cap. Any notification for the thread (deltas, items, token usage) is progress
// and re-arms it; it is paused while a tool item runs. So a progressing agent has
// no wall-clock limit (as in Claude Code). Before any error leaves this function —
// inactivity, abort, transport failure — a started turn is interrupted (and its
// interrupted completion awaited briefly), so a retry never runs beside an orphan.
async function runTurn(client, threadId, turnParams, opts, state) {
  state.activeTools.clear();
  const collector = attachAgentMessageCollector(client, threadId, opts.onProgress);
  const idleMs = opts.timeoutMs ?? 600_000;
  const stop = new AbortController();
  let turnId, timer, graceTimer, settled = false;
  const arm = () => {
    clearTimeout(timer);
    if (!state.activeTools.size && idleMs > 0) timer = setTimeout(() => stop.abort(new Error(`Agent turn timed out after ${idleMs}ms without progress`)), idleMs);
  };
  const activity = n => {
    const p=n.params??{};if(p.threadId!==threadId)return;
    const tool=['commandExecution','fileChange','mcpToolCall','dynamicToolCall','webSearch','imageView','imageGeneration','collabAgentToolCall'].includes(p.item?.type);
    if(n.method==='item/started' && tool&&!state.activeTools.has(p.item.id)){state.activeTools.add(p.item.id);state.toolCalls++;}
    if(n.method==='item/completed')state.activeTools.delete(p.item?.id);
    arm();
    // Local: a usage update carries the thread's tokens so far (the meter took it first), so the card counts while it runs.
    const tokens=n.method==='thread/tokenUsage/updated'?tokensForThread(threadId)?.total:undefined;
    opts.onActivity?.({activeTools:state.activeTools.size,toolCalls:state.toolCalls,...tool?{lastToolName:p.item.tool??p.item.name??p.item.type}:{},...Number.isFinite(tokens)?{tokens}:{}});
  };
  client.on('notification',activity);
  // A user/run abort interrupts the turn; its interrupted completion settles the wait.
  // If the server never confirms, give up after a grace period.
  const abort=()=>{if(turnId)void client.interruptTurn(threadId,turnId).catch(()=>{});clearTimeout(graceTimer);graceTimer=setTimeout(()=>stop.abort(new Error("Agent turn interrupted")),INTERRUPT_GRACE_MS);};
  opts.signal?.addEventListener('abort',abort,{once:true});
  try {
    opts.signal?.throwIfAborted();
    const startTurnRes = await client.startTurn(turnParams);
    turnId = startTurnRes?.turn?.id;
    if(opts.signal?.aborted)abort();
    arm();
    const completed = await client.waitForNotification(
      (n) =>
        n.method === "turn/completed" &&
        n.params?.threadId === threadId &&
        (!turnId || n.params?.turn?.id === turnId),
      0,
      stop.signal,
    );
    settled = true;
    return { turn: completed.params?.turn ?? {}, text: collector.text() };
  } catch (e) {
    if (turnId && !settled) await interruptAndConfirm(client, threadId, turnId);
    throw e;
  } finally {
    clearTimeout(timer); clearTimeout(graceTimer);
    opts.signal?.removeEventListener('abort',abort);
    client.off('notification',activity);
    collector.detach();
  }
}

async function interruptAndConfirm(client, threadId, turnId) {
  if (client.readyState !== "ready") return; // a dead server's turns died with it
  const done = client.waitForNotification(n => n.method === "turn/completed" && n.params?.threadId === threadId && n.params?.turn?.id === turnId, INTERRUPT_GRACE_MS).catch(() => {});
  try { await client.interruptTurn(threadId, turnId); } catch { return; }
  await done;
}

// ---- retry classification ----

const RETRYABLE_CODES = new Set([
  "usageLimitExceeded",
  "httpConnectionFailed",
  "responseStreamConnectionFailed",
  "responseStreamDisconnected",
  "responseTooManyFailedAttempts",
  "internalServerError",
]);
// Local: "app-server disconnected" (the server died mid-turn) is retried on a fresh
// client; "client shut down" (an intentional shutdown) is not.
const RETRYABLE_MSG =
  /(Transport is not connected|app-server exited|app-server disconnected|timed out|ECONNRESET|EPIPE|socket hang up|stream (disconnected|connection))/i;
const NONRETRYABLE_MSG = /(BadRequest|Unauthorized|ContextWindowExceeded|invalid request|outputSchema|did not return)/i;

function errorCode(e) {
  const ci = e?.codexErrorInfo;
  if (!ci) return null;
  const code = typeof ci === "string" ? ci : Object.keys(ci)[0] ?? null;
  // Local: 'other' names nothing (OpenCode's default for any failure): the message decides, as with no code.
  return code === "other" ? null : code;
}

export function isRetryable(e) {
  if(e instanceof StructuredAgentError&&e.retryable===false)return false;
  if(isAgentConfigError(e))return false;
  if(e instanceof ToolNarrowingError)return false;
  const code = errorCode(e);
  if (code) return RETRYABLE_CODES.has(code);
  const msg = String(e?.message ?? "");
  if (NONRETRYABLE_MSG.test(msg)) return false;
  return RETRYABLE_MSG.test(msg); // unknown errors are NOT retried (conservative)
}

// Local: Claude Code 2.1.280 waits 45s once for a throttled (rate-limited) agent, then retries it one time.
export const THROTTLE_BACKOFF_MS = 45_000;
const THROTTLE_CODES = new Set(["rateLimitExceeded", "rateLimited", "tooManyRequests", "serverOverloaded"]);
const THROTTLE_MSG = /\b(429|rate[ -]?limit(?:ed)?|too many requests|throttl\w*|overloaded)\b/i;
export function isThrottled(e) {
  const code = errorCode(e);
  if (code && THROTTLE_CODES.has(code)) return true;
  return !code && THROTTLE_MSG.test(String(e?.message ?? ""));
}

async function withRetry(fn, { retries, log, label, signal, onThrottle, throttleMs = THROTTLE_BACKOFF_MS }) {
  let attempt = 0, throttled = false;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (signal?.aborted) throw e;
      if (isThrottled(e)) {
        if (throttled) throw e;
        throttled = true;
        log(`  ⟳ throttled (${label ?? "agent"}): ${String(e?.message ?? e).slice(0, 140)} — waiting ${throttleMs}ms, then one retry`);
        try { onThrottle?.(Date.now() + throttleMs); } catch {}
        await sleep(throttleMs, undefined, {signal});
        continue;
      }
      if (attempt >= retries || !isRetryable(e)) throw e;
      attempt++;
      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      const wait = backoff + Math.floor(Math.random() * 250);
      log(`  ⟳ retry ${attempt}/${retries} (${label ?? "agent"}): ${String(e?.message ?? e).slice(0, 140)} — waiting ${wait}ms`);
      await sleep(wait, undefined, {signal});
    }
  }
}

// Tolerate a model that wraps JSON in prose or ```json fences despite outputSchema.
// Local: objects and arrays; undefined (not null) when nothing parses.
function extractJson(text) {
  if (!text) return undefined;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  if (fenced) { try { return JSON.parse(candidate); } catch {} }
  for (const [open, close] of [["{", "}"], ["[", "]"]]) {
    const start = candidate.indexOf(open);
    const end = candidate.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {}
    }
  }
  return undefined;
}
