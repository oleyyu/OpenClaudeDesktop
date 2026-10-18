// The main-process side of the model's Workflow tool (agent-tools/workflow.mjs), for cores that run OpenClaude Desktop's
// workflow engine, modeled on Claude Code 2.1.280:
//   • launch(): validates the call (workflow-tool-model.mjs), resolves the script (inline → persisted under the
//     session's data as <slug>-<runId>.js, 0600; name → saved workflow; scriptPath), asks Claude's "Run a dynamic
//     workflow?" unless a Workflow(<name>) rule or Bypass decides, and starts the run (workflow-service.cjs) with
//     the session's Mode, model and effort. It answers at once with Claude's launch text: runs are background tasks.
//   • settled(run): a run the model started finished → its <task-notification> goes back to the model in that session,
//     as a new turn once the session is idle (a running turn is never interrupted), plus an OS notification. A run
//     the user stopped gets the OS notification only.
//   • turnStart(params): every turn/start of the app's sessions passes here (main.cjs) — it records the session's
//     Mode/model/effort for its workflows and adds the turn's hidden reminders (the "ultracode" keyword, ultracode
//     mode on/still on/off, a size guideline change), consuming params.codeDesktop.workflowTurn.
//   • observe(event): turn/started / turn/completed, to know when a session is idle.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const load = (file) => import(pathToFileURL(path.join(__dirname, file)).href);
const ACCESS = ["read-only", "workspace-write", "danger-full-access"];

/**
 * @param {object} o
 * @param {object} o.workflowService    workflow-service.cjs
 * @param {() => object} o.getConfig     the app config (threadIds, model, workflowRules…)
 * @param {(patch: object) => void} o.updateConfig  persists config keys (Always allow a named workflow)
 * @param {() => object} o.settings      resolveWorkflowSettings() for now
 * @param {string} o.dataRoot            per-session data root: <dataRoot>/<threadId>/workflows/scripts/
 * @param {string} o.home                for saved workflows (~/.claude/workflows)
 * @param {(session, request) => Promise<{approved, always}|boolean>} o.requestApproval
 * @param {(threadId: string, params: object) => Promise<void>} o.startTurn  sends turn/start for a notification
 * @param {(run: object, text: string) => void} [o.notify]  OS notification + whatever else main shows
 * @param {() => {structuredOutput?: false|'outputSchema'}} [o.core]  how the runner gets structured results from the running core
 * @param {(access: string) => Promise<void>} [o.validateAccess]  refuses a Bypass the core/org doesn't allow
 * @param {() => boolean} [o.bypassAllowed]  whether Bypass is still the Mode with its opt-in on: a session's recorded
 *        Bypass gives danger-full-access only then (a Mode change or an opt-out applies before the session's next turn)
 * @param {() => ({engine: "codeDesktop"}|{engine: "native", name?: string, skill?: string}|null)} [o.workflowTool]
 *        the engine that runs the session's workflows now, and the core's own workflow tool on its own engine (the
 *        ultracode reminders name that tool: OpenClaude Desktop's Workflow tool isn't there then)
 * @param {{get: (threadId: string) => object|undefined, set: (threadId: string, state: object) => void}} [o.reminderStore]
 *        where a session's ultracode/size reminder state outlives the app (main.cjs: config.sessionMetadata): the core's
 *        history still holds "Ultracode is on" after a relaunch, so turning it off then must still say so
 */
function createWorkflowToolService({ workflowService, getConfig, updateConfig, settings, dataRoot, home, requestApproval, startTurn, notify = () => {}, core = () => ({}), validateAccess = async () => {}, workflowTool = () => null, bypassAllowed = () => true, reminderStore = null, customPrompt = () => false }) {
  const turns = new Map(); // threadId → {params, permission, mode, active}
  const reminders = new Map(); // threadId → ultracode/size state (also kept in reminderStore, read once per launch)
  const reminderState = (threadId) => {
    if (reminders.has(threadId)) return reminders.get(threadId);
    let stored;
    try { stored = reminderStore?.get?.(threadId); } catch { stored = undefined; }
    if (!stored || typeof stored !== "object") return undefined;
    return { entered: stored.entered === true, turnsSinceEnter: Number.isInteger(stored.turnsSinceEnter) && stored.turnsSinceEnter >= 0 ? stored.turnsSinceEnter : 0,
      ...(typeof stored.size === "string" ? { size: stored.size } : {}) };
  };
  const keepReminderState = (threadId, state) => {
    const before = reminderState(threadId);
    reminders.set(threadId, state);
    const clean = { entered: state.entered === true, turnsSinceEnter: state.turnsSinceEnter, ...(typeof state.size === "string" ? { size: state.size } : {}) };
    if (JSON.stringify(before ?? null) === JSON.stringify(clean)) return;
    try { reminderStore?.set?.(threadId, clean); } catch { /* kept in memory */ }
  };
  const pending = new Map(); // threadId → [message text]
  const requests = new Map(); // threadId → the user's last typed message (Claude's provenance relay for workflow agents)
  const budgets = new Map(); // threadId → the token target of that message ("+500k"), a model-started run's budget.total
  // threadId → {base, last}: the session's cumulative output tokens when the budgeted message arrived and now
  // (thread/tokenUsage/updated), so a run's budget.spent() starts from what the turn already spent (Claude's turn budget).
  const turnOutput = new Map();
  const budgetLedgers = new Map(); // session -> cumulative spend, shared even across overlapping user turns
  function budgetLedger(threadId) {
    if (!budgetLedgers.has(threadId)) budgetLedgers.set(threadId, { main: 0 });
    return budgetLedgers.get(threadId);
  }
  const outputTotal = (usage) => Number.isFinite(usage?.total?.outputTokens) ? usage.total.outputTokens : null;
  // Sessions whose latest turn was started by a scheduled prompt or a Monitor event, not by the user: a workflow it starts
  // is automated, so no earlier typed message is relayed as the request that triggered it (Claude: kind 'automated').
  const automated = new Set();
  const delivering = new Set();
  // The plain prompts this service delivered as turns (a fired scheduled prompt), per session: the userMessage item such
  // a turn shows is not the user's own message (observe).
  const deliveredTexts = new Map(); // threadId → Set<text>

  /** The user's own words in a UserInput[] (hidden reminders and workflow notifications aren't), and its text parts. */
  function typedOf(input) {
    const parts = Array.isArray(input) ? input.filter((part) => part?.type === "text" && typeof part.text === "string" && !part.text.startsWith("<system-reminder>")) : [];
    return { parts, typed: parts.map((part) => part.text.replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g, "")).join("\n").trim() };
  }
  /**
   * A message the user typed reached the session (a turn/start, a steer, a queued message the core started): what a
   * workflow the model starts from now on relays to its agents (Claude: the latest genuine user message, at most 4000
   * characters), and its token target ("+500k") as the run's budget.total (Claude resets the turn budget each turn).
   */
  async function recordUserRequest(threadId, typed) {
    if (typed && typed.length <= 4000) requests.set(threadId, typed); else requests.delete(threadId);
    automated.delete(threadId);
    const target = typed ? (await load("workflow-tool-model.mjs")).turnTokenTarget(typed) : null;
    if (target) budgets.set(threadId, target); else budgets.delete(threadId);
    const last = turnOutput.get(threadId)?.last ?? null;
    const ledger = budgetLedger(threadId);
    turnOutput.set(threadId, { base: last, last, baseline: ledger.pool?.spent() ?? ledger.main });
  }
  /** The output tokens the session spent since its budgeted message (0 when unknown). */
  function turnSpent(threadId) {
    const entry = turnOutput.get(threadId);
    return entry && Number.isFinite(entry.base) && Number.isFinite(entry.last) ? Math.max(0, entry.last - entry.base) : 0;
  }
  async function sharedTurnBudget(threadId) {
    const state = turnOutput.get(threadId);
    if (!state) throw new Error('Missing workflow turn budget state');
    const ledger = budgetLedger(threadId);
    ledger.poolPromise ??= load('../third-party/codex-workflows-runner/src/shared-budget.js').then(({ createSharedBudget }) => {
      ledger.pool = createSharedBudget(path.join(dataRoot, threadId, 'workflows', 'budgets'), ledger.main);
      return ledger.pool;
    });
    const pool = await ledger.poolPromise;
    return { ...pool.descriptor, baseline: state.baseline ?? 0 };
  }
  /** A steered message (turn/steer): the user's latest request from now on. */
  async function userInput(threadId, input) {
    if (typeof threadId !== "string" || !threadId || !Array.isArray(input)) return;
    const { typed } = typedOf(input);
    if (typed) await recordUserRequest(threadId, typed);
  }

  /**
   * turn/start params as main is about to send them (every decoration applied), and the renderer's workflow facts for
   * the turn ({permission, mode, keyword, ultracode}, taken out of params.codeDesktop.workflowTurn by main): records
   * the session's turn options and appends the turn's reminders to its input.
   */
  async function turnStart(params, turn = {}) {
    if (!params || typeof params !== "object" || typeof params.threadId !== "string") return params;
    const { input, ...options } = params;
    const previous = turns.get(params.threadId);
    // The user's own words (hidden reminders and workflow notifications aren't): what a workflow the model starts in
    // this turn relays to its agents. Claude relays only a request of at most 4000 characters.
    await recordUserRequest(params.threadId, typedOf(input).typed);
    // active from now: a notification never starts beside a turn that is about to start (turnFailed undoes it).
    turns.set(params.threadId, { params: structuredClone(options), permission: typeof turn.permission === "string" ? turn.permission : previous?.permission, mode: typeof turn.mode === "string" ? turn.mode : previous?.mode, active: true });
    await orphanNotices(params);
    const resolved = settings();
    if (!resolved.enabled) return params;
    const { turnReminders, reminderItem } = await load("workflow-reminders.mjs");
    let tool = null;
    try { tool = workflowTool(); } catch { tool = null; }
    // With the user's own system prompt (Settings › Instructions) no default text of ours goes along: the size
    // guideline reminder is left out; what the user turned on (the keyword, ultracode) still gets its reminder.
    const result = turnReminders({ enabled: true, keyword: turn.keyword === true, keywordTrigger: resolved.keywordTrigger, ultracode: turn.ultracode === true,
      state: reminderState(params.threadId), size: customPrompt() ? undefined : resolved.sizeGuideline, sizeIsDefault: resolved.sizeSource ? resolved.sizeSource === "default" : getConfig()?.workflowSizeGuideline === undefined, tool });
    keepReminderState(params.threadId, result.state);
    if (result.reminders.length && Array.isArray(params.input)) params.input = [...params.input, reminderItem(result.reminders)];
    return params;
  }

  /**
   * Model-started runs that the last quit (or a crash) ended: their orphaned-workflow notifications go with the
   * session's next turn (Claude Code queues them for the next query on resume), marked delivered once the turn starts.
   */
  async function orphanNotices(params) {
    if (!Array.isArray(params.input) || typeof workflowService.orphans !== "function") return;
    let runs = [];
    try { runs = await workflowService.orphans(params.threadId); } catch { runs = []; }
    if (!runs.length) return;
    const model = await load("workflow-tool-model.mjs");
    params.input = [...params.input, ...runs.map((run) => ({ type: "text", text: model.notificationMessage(model.workflowOrphanNotification({
      taskId: run.taskId, toolUseId: run.toolUseId, name: run.name || run.description, runId: run.id, scriptPath: run.scriptPath, args: run.args })), text_elements: [] }))];
    const entry = turns.get(params.threadId);
    if (entry) turns.set(params.threadId, { ...entry, orphans: runs.map((run) => run.id) });
  }

  /**
   * A steered or queued message's input with the "ultracode" keyword reminder (the core starts a queued turn itself,
   * so it never passes turnStart). Unchanged when workflows or the keyword trigger are off.
   */
  async function keywordInput(input) {
    const resolved = settings();
    if (!resolved.enabled || resolved.keywordTrigger === false || !Array.isArray(input)) return input;
    const { reminderTexts, reminderItem } = await load("workflow-reminders.mjs");
    let tool = null;
    try { tool = workflowTool(); } catch { tool = null; }
    return [...input, reminderItem([reminderTexts(tool).keyword])];
  }

  function observe(event) {
    const p = event?.params;
    if (!p || typeof p.threadId !== "string") return;
    // The user message a turn shows: a queued message the core started as a turn by itself, or a steer, never passes
    // turnStart; it is the session's latest request from now on. A turn this service delivered (a notification, a
    // scheduled prompt) shows its own text, which is not the user's.
    if ((event.method === "item/started" || event.method === "item/completed") && p.item?.type === "userMessage" && Array.isArray(p.item.content)) {
      const { parts, typed } = typedOf(p.item.content);
      const delivered = deliveredTexts.get(p.threadId);
      if (typed && !(delivered && parts.every((part) => delivered.has(part.text))) && (typed !== requests.get(p.threadId) || automated.has(p.threadId)))
        void recordUserRequest(p.threadId, typed).catch(() => {});
      return;
    }
    if (event.method === "thread/tokenUsage/updated") {
      const total = outputTotal(p.tokenUsage);
      if (total === null) return;
      const entry = turnOutput.get(p.threadId);
      // No total known when the message arrived: this report's own request is the turn's first spend.
      const lastRequest = Number.isFinite(p.tokenUsage?.last?.outputTokens) ? p.tokenUsage.last.outputTokens : 0;
      const current = entry ?? { base: null, last: total };
      const ledger = budgetLedger(p.threadId);
      // Ignore history preceding the first observed user request. Thereafter
      // count fresh deltas, including usage from a reset core counter.
      ledger.main += Number.isFinite(entry?.last) && total >= entry.last ? total - entry.last : entry ? lastRequest : 0;
      ledger.pool?.recordMain(ledger.main);
      if (current.base === null && entry) current.base = Math.max(0, total - lastRequest);
      current.last = total;
      turnOutput.set(p.threadId, current);
      return;
    }
    if (event.method === "turn/started") {
      const { orphans = [], ...entry } = turns.get(p.threadId) ?? { params: null };
      for (const id of orphans) workflowService.orphanDelivered?.(id);
      turns.set(p.threadId, { ...entry, active: true });
    }
    else if (event.method === "turn/completed") { const entry = turns.get(p.threadId); if (entry) turns.set(p.threadId, { ...entry, active: false }); void flush(p.threadId); }
  }

  /** The access the session's Mode gives its workflow agents (never more than the session has). */
  async function sessionAccess(threadId) {
    const { workflowAccess } = await load("permission-policy.mjs");
    const entry = turns.get(threadId);
    const sandbox = entry?.params?.sandboxPolicy?.type ?? entry?.params?.sandbox;
    let access = workflowAccess({ permission: entry?.permission ?? "plan", mode: entry?.mode ?? "code" });
    // A claimed Mode that the turn itself didn't run with never widens access, nor a Bypass the user has since left.
    if (access === "danger-full-access" && !["dangerFullAccess", "danger-full-access"].includes(sandbox)) access = "workspace-write";
    if (access === "danger-full-access") { let still = false; try { still = bypassAllowed() === true; } catch { still = false; } if (!still) access = "workspace-write"; }
    if (access === "workspace-write" && ["readOnly", "read-only"].includes(sandbox)) access = "read-only";
    return ACCESS.includes(access) ? access : "read-only";
  }

  /**
   * The tool call. ctx: {sessionId, cwd, signal} (signal: the call's; a stopped turn aborts it, which closes the approval
   * sheet and starts nothing). Returns the tool's text, or throws an Error the model sees.
   */
  async function launch(raw, { sessionId, cwd: sessionCwd, toolUseId, after, signal } = {}) {
    const stopped = () => new Error("The turn was stopped. Nothing was run.");
    if (signal?.aborted) throw stopped();
    const model = await load("workflow-tool-model.mjs");
    const { workflowPermission, allowWorkflowRule } = await load("prefs/workflow-settings.mjs");
    const resolved = settings(), config = getConfig();
    const checked = model.checkWorkflowInput(raw, resolved);
    if (checked.error) throw new Error(checked.error);
    const input = checked.input;
    if (!config.threadIds?.includes(sessionId)) throw new Error("This tool works only in an OpenClaude Desktop session.");
    const entry = turns.get(sessionId);
    const cwd = typeof entry?.params?.cwd === "string" && entry.params.cwd ? entry.params.cwd : sessionCwd || config.cwd;
    // An inline script is always validated (Claude validateInput), even when scriptPath or name decides what runs.
    if (input.script) {
      const inline = model.parseWorkflowScript(input.script);
      if (inline.error) throw new Error(inline.error);
      if (model.readsClock(inline.body)) throw new Error(model.NONDETERMINISTIC);
    }
    // The script: scriptPath (an edited copy this tool wrote, or a readable file), else a saved workflow, else inline.
    // Like Claude's permission step, scriptPath and name run their own script, never an inline one sent beside them
    // (else an allow rule for a saved workflow would run any script under its name).
    let source, savedName = null, scriptFile = null;
    if (input.scriptPath) {
      const file = path.resolve(cwd, input.scriptPath.startsWith("~/") ? path.join(home, input.scriptPath.slice(2)) : input.scriptPath);
      let stat;
      try { stat = fs.statSync(file); } catch { throw new Error(`Workflow script file not found: ${input.scriptPath}`); }
      if (!stat.isFile()) throw new Error(`Workflow script file ${input.scriptPath} is not a regular file`);
      if (stat.size > model.MAX_SCRIPT_BYTES) throw new Error(`Workflow script file ${input.scriptPath} exceeds ${model.MAX_SCRIPT_BYTES} bytes`);
      source = fs.readFileSync(file, "utf8");
      scriptFile = file;
    } else if (input.name) {
      const found = model.findSavedWorkflow({ cwd, home, name: input.name, nameOnly: resolved.nameOnly === true, folders: core()?.workflowFolders ?? [] });
      if (found.error) throw new Error(found.error);
      source = found.workflow.script;
      savedName = found.workflow.name;
    } else source = input.script;
    const parsed = model.parseWorkflowScript(source);
    if (parsed.error) throw new Error(parsed.error);
    if (input.resumeFromRunId) {
      const previous = workflowService.get(input.resumeFromRunId);
      if (!previous || previous.threadId !== sessionId) throw new Error(`Unknown workflow run ${input.resumeFromRunId} in this session.`);
      if (previous.status === "running") throw new Error(`Workflow ${input.resumeFromRunId} is still running. Stop it first with WorkflowStop({task_id: "${previous.taskId ?? input.resumeFromRunId}"}) before resuming.`);
      if (typeof previous.transcriptDir === "string" && !fs.existsSync(path.join(previous.transcriptDir, "journal.jsonl")))
        throw new Error(`No journal found for workflow run ${input.resumeFromRunId}, so there is nothing to resume. To run the workflow from the start, call Workflow again without resumeFromRunId.`);
    }
    // Permission (Claude: the tool-wide rules, then Workflow(<name>) rules for a name-only call): any deny blocks, any
    // ask asks — even in Bypass —, then Bypass runs it, then an allow (a bare "Workflow" allow covers inline scripts).
    const ruleName = !input.scriptPath && savedName ? savedName : null;
    const access = await sessionAccess(sessionId);
    const decision = workflowPermission(resolved.rules, ruleName, { bypass: access === "danger-full-access" });
    if (decision.behavior === "deny") throw new Error(decision.toolWide ? "Permission to use Workflow has been denied." : `Workflow ${ruleName} blocked by permission rules`);
    if (access === "danger-full-access") await validateAccess(access);
    if (decision.behavior !== "allow") {
      // The script itself goes to the card too (Claude's dialog shows it when meta has no phases, else behind "View raw
      // script"), so the user can see what the agents will be told before saying yes.
      const answer = await requestApproval({ id: sessionId, cwd }, { kind: "workflow", name: ruleName ?? undefined, displayName: parsed.meta.name, always: !!ruleName, description: parsed.meta.description, phases: parsed.meta.phases, args: input.args, script: source },
        { ...(signal ? { signal } : {}), ...(typeof after === "string" && after ? { call: { itemId: after } } : {}) });
      if (signal?.aborted) throw stopped();
      const approved = answer === true || answer?.approved === true;
      if (!approved) throw new Error("The user declined to run this dynamic workflow. Dynamic workflow cancelled.");
      if (answer?.always === true && ruleName) updateConfig({ workflowRules: allowWorkflowRule(getConfig().workflowRules, ruleName) });
    }
    if (signal?.aborted) throw stopped();
    // Ids and the persisted script (Claude: <session>/workflows/scripts/<slug(meta.name)>-<runId>.js, mode 0600).
    // A resume continues the same run: its id, transcript folder and journal.
    const runId = input.resumeFromRunId ?? model.newRunId();
    const taskId = model.newTaskId();
    if (!scriptFile) {
      const dir = path.join(dataRoot, sessionId, "workflows", "scripts");
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      scriptFile = path.join(dir, `${model.workflowSlug(parsed.meta.name)}-${runId}.js`);
      fs.writeFileSync(scriptFile, source, { encoding: "utf8", mode: 0o600 });
    }
    const turnModel = typeof entry?.params?.model === "string" && entry.params.model ? entry.params.model : config.model;
    // Codex's 'ultra' (the ultracode tier on its models) adds Codex's own automatic task delegation: workflow agents
    // run at xhigh instead, so a run never stacks a second orchestration under every one of its agents.
    const sessionEffort = typeof entry?.params?.effort === "string" && entry.params.effort ? entry.params.effort : undefined;
    const turnEffort = sessionEffort === "ultra" ? "xhigh" : sessionEffort;
    const budgetPool = turnOutput.has(sessionId) && !automated.has(sessionId) ? await sharedTurnBudget(sessionId) : null;
    const run = await workflowService.start({ threadId: sessionId, file: scriptFile, source, args: input.args, access, cwd, model: turnModel, effort: turnEffort,
      resumeId: input.resumeFromRunId, runId, origin: "tool", taskId, toolUseId, scriptPath: scriptFile, engine: "codeDesktop", structuredOutput: core()?.structuredOutput,
      // Claude's provenance relay: the user's request goes with every agent's framed task (only while provenance is on).
      ...(resolved.promptProvenance?.value !== false && requests.has(sessionId) && !automated.has(sessionId) ? { userRequest: requests.get(sessionId) } : {}),
      ...(budgetPool ? { budgetTotal: budgets.get(sessionId), budgetSpent: turnSpent(sessionId), budgetPool } : {}),
      // The transcript item of the tool call (Codex's mcpToolCall id): the run's card sits right after it.
      ...(typeof after === "string" && after ? { after } : {}) });
    return model.workflowLaunchText({ taskId, summary: parsed.meta.description, transcriptDir: run.transcriptDir, scriptPath: scriptFile, runId: run.id });
  }

  /**
   * WorkflowStop: the session's model stops a run it started (by task ID or run ID). Stopped like a user stop (no
   * notification follows); answers once the run has ended, or after a few seconds while it is still winding down.
   */
  async function stop(raw, { sessionId } = {}) {
    const key = typeof raw?.task_id === "string" ? raw.task_id.trim() : "";
    if (!key) throw new Error("task_id is required: the Task ID from the Workflow tool's result.");
    const runs = typeof workflowService.list === "function" ? await workflowService.list(sessionId) : [];
    const run = runs.find((candidate) => candidate.origin === "tool" && (candidate.taskId === key || candidate.id === key));
    if (!run) throw new Error(`No workflow task ${key} in this session.`);
    if (run.status !== "running") return `Workflow ${run.taskId ?? run.id} is not running (${run.status}). Nothing to stop.`;
    const ended = Promise.resolve(workflowService.stop(run.id)).then(() => true, (error) => { if (/no longer running/i.test(error?.message ?? "")) return true; throw error; });
    const done = await Promise.race([ended, new Promise((resolve) => { const timer = setTimeout(() => resolve(false), 5000); timer.unref?.(); })]);
    const resume = run.scriptPath ? ` To continue it later: Workflow({scriptPath: "${run.scriptPath}", resumeFromRunId: "${run.id}"}).` : "";
    return `${done ? "Stopped" : "Stopping"} workflow ${run.taskId ?? run.id} (run ${run.id}). Finished agents keep their results.${resume}`;
  }

  /** A finished run: a model-started one sends its <task-notification> to the model. */
  async function settled(run) {
    if (!run || run.origin !== "tool" || run.status === "running" || typeof run.threadId !== "string") return;
    const model = await load("workflow-tool-model.mjs");
    // result.json: the runner's output (summary, result, workflowProgress with result previews, totalToolCalls), or a
    // core-hosted engine's bare value.
    let output = null, result, hasResult = false;
    if (run.status === "completed") {
      try {
        const text = fs.readFileSync(path.join(run.transcriptDir, "result.json"), "utf8");
        if (text) { const value = JSON.parse(text); if (value && typeof value === "object" && Array.isArray(value.workflowProgress) && Object.hasOwn(value, "summary")) { output = value; result = value.result; } else result = value; hasResult = result !== undefined; }
      } catch { if (run.result !== undefined) { result = run.result; hasResult = true; } }
    }
    const progress = Array.isArray(output?.workflowProgress) ? output.workflowProgress : run.workflowProgress || [];
    const agents = progress.filter((row) => row.type === "workflow_agent");
    // Claude getFailures(): failed agents, then failed parallel/pipeline slots, budget-dropped slots and nested workflows.
    const failures = [...agents.filter((agent) => agent.state === "error" && agent.error).map((agent) => `${agent.label}: ${agent.error}`),
      ...(Array.isArray(run.slotFailures) ? run.slotFailures.filter((line) => typeof line === "string" && line) : [])];
    const text = model.notificationMessage(model.workflowTaskNotification({
      taskId: run.taskId, toolUseId: run.toolUseId, outputFile: path.join(run.transcriptDir, "result.json"), status: run.status === "completed" ? "completed" : run.status === "stopped" ? "stopped" : "failed",
      name: run.description, error: run.summary, result, hasResult, failures, transcriptDir: run.transcriptDir, scriptPath: run.scriptPath, runId: run.id, args: run.args,
      agents, agentCount: output?.agentCount ?? agents.length, totalTokens: output?.totalTokens ?? run.usage?.totalTokens ?? 0,
      toolUses: output?.totalToolCalls ?? agents.reduce((sum, agent) => sum + (agent.toolCalls || 0), 0), durationMs: run.durationMs ?? 0,
    }));
    try { notify(run, text); } catch { /* best effort */ }
    // A run the user stopped (the Tasks pane, /workflows) tells the model nothing (Claude Code: a killed task is marked
    // notified without a message): no new turn that might resume or relaunch what the user just stopped.
    if (run.status === "stopped") return;
    const list = pending.get(run.threadId) ?? [];
    list.push(text);
    pending.set(run.threadId, list);
    await flush(run.threadId);
  }

  /** Delivers a session's waiting notifications as one turn once it is idle. */
  async function flush(threadId) {
    const list = pending.get(threadId);
    if (!list?.length || delivering.has(threadId) || turns.get(threadId)?.active) return;
    const entry = turns.get(threadId);
    if (!entry?.params) return; // never a turn here: delivered after the session's next turn
    delivering.add(threadId);
    const texts = list.splice(0);
    const delivered = deliveredTexts.get(threadId) ?? new Set();
    for (const text of texts) { delivered.delete(text); delivered.add(text); }
    while (delivered.size > 20) delivered.delete(delivered.values().next().value);
    deliveredTexts.set(threadId, delivered);
    try {
      // The session's last turn options (already decorated for its core), with the notification as the input.
      await startTurn(threadId, { ...structuredClone(entry.params), threadId, input: texts.map((text) => ({ type: "text", text, text_elements: [] })) });
    } catch (error) {
      pending.set(threadId, [...texts, ...(pending.get(threadId) ?? [])]);
      console.warn("Workflow notification not delivered yet:", error?.message ?? error);
    } finally { delivering.delete(threadId); }
  }

  /**
   * Another background source's message for the session (a Monitor event, a fired scheduled prompt: monitor-service.cjs,
   * schedule-service.cjs), delivered like a workflow's notification: as one turn once the session is idle, with its
   * last turn options. `notification` is a <task-notification> (wrapped as the system notice), `prompt` plain input.
   */
  async function notice(threadId, { notification, prompt } = {}) {
    if (typeof threadId !== "string" || !threadId) return false;
    let text = typeof prompt === "string" && prompt ? prompt : null;
    if (!text && typeof notification === "string" && notification) text = (await load("workflow-tool-model.mjs")).notificationMessage(notification);
    if (!text) return false;
    const list = pending.get(threadId) ?? [];
    list.push(text);
    pending.set(threadId, list);
    automated.add(threadId);
    await flush(threadId);
    return true;
  }
  /** Whether the session has no turn running or being delivered (and has had a turn in this run, so one can start). */
  const idle = (threadId) => { const entry = turns.get(threadId); return !!entry?.params && !entry.active && !delivering.has(threadId); };

  /** The core refused a turn/start: the session is idle again. */
  function turnFailed(threadId) { const entry = turns.get(threadId); if (entry) { const { orphans: _kept, ...rest } = entry; turns.set(threadId, { ...rest, active: false }); } }

  /** The session's last turn/start options as sent (its sandbox, permissions, model…), or null before its first turn. */
  const turnOptions = (threadId) => { const params = turns.get(threadId)?.params; return params ? structuredClone(params) : null; };
  return { turnStart, keywordInput, userInput, turnFailed, observe, launch, stop, settled, flush, notice, idle, sessionAccess, permissionOf: (threadId) => turns.get(threadId)?.permission ?? null, turnOptions, pendingFor: (threadId) => [...(pending.get(threadId) ?? [])] };
}

module.exports = { createWorkflowToolService };
