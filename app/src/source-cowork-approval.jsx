// w13-coworkui-approval (research/w13-coworkui.md cwui-27): a Cowork session's tool request as the 3.6556.2 tool
// approval card. The card and its decision row are the generated originals (src/generated/cowork-approval: c96142a4d Je
// "Claude wants to use {toolName}" with c14f706e5 wt); this module only turns a local approval request into the props the
// transcript's tool block gives Je (cc1aae219 bE `{toolName, rawToolName, input, approvalData, onCollapse, glyph}`, the
// approvalData Cowork's ex builds in ca44d5dae) and sends the decision through the shared approval runtime.
//
// Decisions (ca44d5dae ex → Dl8 respondToToolPermission; the local engine semantics are electron/cowork-runtime/
// approval-policy.mjs, w13-coworkfn-approvals):
//   Allow once                    submitToolApproval("once")  → accept
//   Allow for this task           onAllowForThisTask          → acceptForSession (a session is one Cowork task)
//   Allow for all scheduled runs  onAllowForAllScheduledRuns  → decision "scheduled" (approval-policy.mjs's official word,
//                                                                answered acceptForSession), which main keeps on the task
//                                                                (routine-approvals.mjs / the folder grant)
//   Always allow (More allow options)  submitToolApproval("always") → the request's own persistent offer (decision:<n>:
//                                 Codex's prefix or host rule), only when the request offers one
//   Deny                          submitToolApproval("deny")  → decline (cancel when that is all the core takes)
// E70 (w13-close-cowork-ui): a scheduled task's run gets both rungs, as ex gives them: `onAllowForThisTask: $t || tn ? mi` with
// `tn = te === !0 && !J && !Et && !kt && P !== !0` (te mainOffersAllowForTask; no `!H`, only `$t` has it) and
// `onAllowForAllScheduledRuns: ni ? pi` (`ni = ei && !ti`, ei needing H). Main offers the task rung for every request with a
// session decision, so a run's card gets both; wt's persistent rung is `Wt ? {key:"task"} : J || j ? {key:"scheduled"}`, so
// the card shows "Allow for this task". In a run the official task rung sends "always" (`tn` → `di("always", {…,
// clicked_rung: "task"})`) and Dl8 persistAlwaysAllowDecision keeps "always" and "scheduled" alike on the run's task
// (`_s.addApprovedPermissions(r.scheduledTaskId, …)`): here acceptForSession, which routine-approvals.mjs keeps on the task.
import { ToolApprovalCard } from "./generated/cowork-approval/index.mjs";
import { useApprovalDraft } from "./use-approval-draft.js";
import { approvalCardModel, offeredDecisions } from "./approval-card-model.mjs";
import { coworkScheduledTaskFor } from "./cowork-runs-model.mjs";
import { useLocalRoutines } from "./use-local-routines.jsx";

const plain = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null);
const text = (value) => (typeof value === "string" && value.trim() ? value : null);
// The agent tools whose card is one plain allow (+ a session allow): the official card words them. Preview sites, dev
// servers and workflows answer with their own words ("Allow for this session" as the only allow, "Yes, run it") and keep
// the local card.
const COWORK_AGENT_TOOLS = new Set(["other", "web-fetch", "schedule", "terminal-command", "monitor", "open-path", "notebook-edit"]);

/** The decisions a request offers, as the card's rungs: { once, session, persistent: {key, label} | null, deny } (action keys
 * of the approval runtime, approval-draft-model responsePayload), or null when the official card can't word it. */
export function coworkApprovalDecisions(request, item) {
  const method = request?.method;
  if (method !== "item/commandExecution/requestApproval" && method !== "item/fileChange/requestApproval") return null;
  const params = plain(request.params) ?? {};
  if (plain(params.codeDesktop?.sampling)) return null;
  const model = approvalCardModel(request, item);
  if (!model.supported || (model.kind !== "command" && model.kind !== "file")) return null;
  const agentTool = plain(params.codeDesktop?.agentTool);
  if (agentTool) {
    if (!COWORK_AGENT_TOOLS.has(agentTool.kind)) return null;
    return { once: "accept", session: agentTool.kind === "web-fetch" || params.sessionGrantable === true ? "acceptForSession" : null, persistent: null, deny: "decline" };
  }
  const offered = offeredDecisions(params.availableDecisions);
  if (!offered) return { once: "accept", session: params.sessionGrantable === false ? null : "acceptForSession", persistent: null, deny: "decline" };
  if (!offered.strings.has("accept")) return null;
  return {
    once: "accept",
    session: offered.strings.has("acceptForSession") ? "acceptForSession" : null,
    persistent: offered.persistent[0] ? { key: offered.persistent[0].key, label: offered.persistent[0].label } : null,
    deny: !offered.strings.has("decline") && offered.strings.has("cancel") ? "cancel" : "decline",
  };
}

/** Whether a Cowork session shows this request on the official tool card (else the local card stays). */
export function coworkApprovalApplies(request, item) {
  return coworkApprovalDecisions(request, item) !== null;
}

// The app's own tools by the name the model calls them (electron/agent-tools: web.mjs WebFetch, notebook.mjs NotebookEdit,
// schedule.mjs CronCreate, monitor.mjs Monitor, terminal.mjs run_in_terminal, host.mjs reveal_path / open_in_editor by
// the request's action). A tool main asks for as "other" (folder access, deletes, skills, launches) has no one name.
const AGENT_TOOL_NAMES = { "web-fetch": "WebFetch", "notebook-edit": "NotebookEdit", schedule: "CronCreate", monitor: "Monitor", "terminal-command": "run_in_terminal" };
const agentToolName = (tool) => text(tool.tool) ?? (tool.kind === "open-path" ? (tool.action === "editor" ? "open_in_editor" : "reveal_path") : AGENT_TOOL_NAMES[tool.kind] ?? null);

// What the card names and expands: Claude's tool names for the core's own requests (Bash for a command, Edit / Write for
// file changes, `mcp__<server>__<tool>` for a connector tool call) and for the app's own tools (cc1aae219 hands Je
// `toolName: v || n.name, rawToolName: n.name` and no headline: "Claude wants to use WebFetch"), with their arguments as
// the input (Je shows them as JSON behind the title). Only an "other" request, which names no tool, keeps its title as
// the card heading (Je `headline`).
export function coworkApprovalTool(request, item) {
  const params = plain(request?.params) ?? {};
  const agentTool = plain(params.codeDesktop?.agentTool);
  const model = approvalCardModel(request, item);
  if (agentTool) {
    const { kind, ...fields } = agentTool;
    void kind;
    const input = Object.fromEntries(Object.entries({ ...(text(params.command) && { command: params.command }), ...fields })
      .filter(([, value]) => value !== undefined && value !== null && value !== ""));
    const glyph = agentTool.kind === "web-fetch" ? "Globe" : undefined;
    const name = agentToolName(agentTool);
    if (name) return { toolName: name, rawToolName: name, input, glyph };
    return { toolName: model.title, headline: model.title, input, glyph };
  }
  if (request?.method === "item/fileChange/requestApproval") {
    const changes = Array.isArray(params.changes ?? item?.changes) ? (params.changes ?? item.changes) : [];
    const paths = changes.map((change) => text(change?.path)).filter(Boolean);
    const writes = changes.length > 0 && changes.every((change) => (change?.kind?.type ?? change?.kind) === "add");
    return { toolName: writes ? "Write" : "Edit", input: paths.length === 1 ? { file_path: paths[0] } : paths.length ? { file_paths: paths } : {} };
  }
  if (item?.type === "mcpToolCall" && text(item.server) && text(item.tool)) {
    return { toolName: item.tool, rawToolName: `mcp__${item.server}__${item.tool}`, integrationName: item.server,
      input: plain(item.arguments) ?? {} };
  }
  const command = text(params.command) ?? text(item?.command) ?? model.detail?.text ?? "";
  const cwd = text(params.cwd) ?? text(item?.cwd);
  return { toolName: "Bash", input: { command, ...(cwd && { cwd }) } };
}

// "Allow for all scheduled runs": the official decision word main's approval-policy.mjs maps for the core (the session
// grant) and that marks the rule as one for the task's later runs.
export const SCHEDULED_DECISION = "scheduled";

/** The approvalData (ca44d5dae ex `zi`) of a local request: which rungs wt shows and what each sends. */
export function coworkApprovalData(decisions, { scheduledRun = false, submit, disableKeyboardShortcuts = false, busyAction = null } = {}) {
  const session = decisions.session ? (telemetry) => submit(decisions.session, telemetry) : undefined;
  return {
    showAlwaysAllowed: !!decisions.persistent,
    ...(decisions.persistent && { alwaysAllowHint: decisions.persistent.label }),
    approvalRequired: true,
    disabled: false,
    wasDenied: false,
    submitToolApproval: (decision) => {
      if (decision === "once") return submit(decisions.once);
      if (decision === "deny") return submit(decisions.deny);
      if (decision === "always" && decisions.persistent) return submit(decisions.persistent.key);
      return undefined;
    },
    onAllowForThisTask: session,
    ...(scheduledRun && decisions.session && { onAllowForAllScheduledRuns: (telemetry) => submit(SCHEDULED_DECISION, telemetry) }),
    disableKeyboardShortcuts,
    ...(busyAction && busyAction === decisions.once && { allowOnceBusy: true }),
  };
}

/** A rung's action through the shared approval runtime. The scheduled rung is the session decision for the runtime (its
 * busy state and checks), answered to main as decision "scheduled" (SCHEDULED_DECISION). */
export function coworkApprovalSender({ runtime, ticket, decisions, respond, getVisibleThreadId }) {
  return (action) => {
    const scheduled = action === SCHEDULED_DECISION && decisions.session;
    return runtime.submit(ticket, scheduled ? decisions.session : action,
      scheduled ? (payload, answered) => respond({ ...payload, decision: SCHEDULED_DECISION }, answered) : respond, { getVisibleThreadId });
  };
}

const noop = () => {};
const noTasks = async () => [];
// `scheduledRun`: whether the session is a run of a local Cowork scheduled task (ca44d5dae ex `H`, isScheduledTask);
// unless the caller says, the task list main's local-routines service keeps (cowork-runs-model coworkScheduledTaskFor:
// a task one of whose runs is this thread).
export function SourceCoworkToolApproval({ runtime, request, item, getVisibleThreadId, respond, isActive = true, scheduledRun,
  call = noTasks, onResolved = noop, onError = noop }) {
  const { ticket, view } = useApprovalDraft(runtime, request);
  const { tasks } = useLocalRoutines(call, "cowork");
  const inScheduledRun = typeof scheduledRun === "boolean" ? scheduledRun : !!coworkScheduledTaskFor(tasks ?? [], request?.params?.threadId);
  const decisions = coworkApprovalDecisions(request, item);
  if (!decisions || !ticket || !view || view.phase !== "pending") return null;
  const send = coworkApprovalSender({ runtime, ticket, decisions, respond, getVisibleThreadId });
  const submit = async (action) => {
    const result = await send(action);
    if (result.status === "answered") onResolved({ request, ticket: result.ticket });
    else if (result.status === "error") onError({ request, ticket: result.ticket, message: result.message });
  };
  const tool = coworkApprovalTool(request, item);
  const approvalData = coworkApprovalData(decisions, { scheduledRun: inScheduledRun, submit, disableKeyboardShortcuts: !isActive,
    busyAction: view.busy ? view.busyAction : null });
  // wt's root carries the card markers itself (`data-approval-card-root`, shared-156 bq): no host wrapper.
  return <ToolApprovalCard key={ticket.key} toolName={tool.toolName} rawToolName={tool.rawToolName} integrationName={tool.integrationName}
    headline={tool.headline} input={tool.input} glyph={tool.glyph} approvalData={approvalData} onCollapse={noop} />;
}
