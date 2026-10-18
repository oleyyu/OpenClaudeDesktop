// Claude Desktop 2.42304.0's ccd_turn server (main index.chunk-B5tintml.js Qt / Zt / ft): update_plan (the task list the
// app shows under the latest message while the agent works) and wrap_up (the next-step box at the end of a turn), served
// to every core through OpenClaude Desktop's own MCP server (mcp__code_desktop__update_plan / wrap_up; officially
// mcp__ccd_turn__update_plan / wrap_up).
//
// The definitions (Tt / Ft descriptions, Et / Lt inputSchemas, readOnlyHint, alwaysLoad) and the handler (Zt: every
// check, answer and the `claude/endTurn` result meta) are the originals in electron/generated/turn-plan/ccd-turn.mjs
// (scripts/extract-turn-plan.mjs); GrowthBook 2371478310 (ht) is on (electron/turn-plan-adapters.mjs). The renderer
// draws the card and the box from the calls' inputs (src/turn-plan-model.mjs over the original c1ebb1aa4 Rt).
//
// What the official main process does around the server, here:
//   - turnPlan (dt): one plan per session; getAvailableNextActions: what the renderer's next-actions row publishes
//     (cccc2cf0a rT / iT → LocalSessions.setAvailableNextActions; main.cjs desktop:call turn-plan:available-next-actions);
//     drivenOverRemoteControl: false (the host has no Remote Control).
//   - The PostToolUse / SessionStart(compact) hooks (ft): observe() runs the original PostToolUse hook on each finished
//     update_plan / wrap_up call of a session's own thread (prompt_id: the call's turn), and the original SessionStart
//     hook when a compaction of that thread completes. No core runs Claude Code hooks, and none injects context in the
//     middle of a turn, so the hook's additionalContext goes in front of the session's next turn/start as a hidden
//     <system-reminder> input item (turnStart(); the app's other reminders travel the same way).
//   - A sub-agent's call (official PreToolUse deny with ot): refused with ot when the core names a calling thread other
//     than the session (Codex); the DeepSeek core refuses it itself (harness codex-app-server tools/pre-execute).
//   - Codex: its built-in update_plan is turned off for the app's sessions (codexBuiltin, agent-tools-host.cjs codexArgs).
//   - Qt(false): the description leaves out the start_session sentence; start_session / sideSessions are not migrated.
import { SUBAGENT_TURN_TOOL_REFUSAL, UPDATE_PLAN, UPDATE_PLAN_TOOL_NAME, WRAP_UP, WRAP_UP_TOOL_NAME, emptyTurnPlan, turnPlanHooks, turnServerDefinition }
  from "../generated/turn-plan/ccd-turn.mjs";

export const group = "turn";

const server = turnServerDefinition(false);
const handle = server.createToolHandler();
const SERVER = "code_desktop";
const OFFICIAL_PREFIX = "mcp__ccd_turn__";
const HOST_PREFIX = `mcp__${SERVER}__`;

const MAX_SESSIONS = 500;
const remember = (map, key, value) => { map.delete(key); map.set(key, value); while (map.size > MAX_SESSIONS) map.delete(map.keys().next().value); return value; };
// The turn plan per session (the official WeakMap lt keyed by the held session's conversation).
const plans = new Map();
/** The session's turn plan ({steps, promptId, wrappedUpIn}), created on first use. */
export function turnPlanFor(sessionId) {
  const key = typeof sessionId === "string" ? sessionId : "";
  return plans.get(key) ?? remember(plans, key, emptyTurnPlan());
}
// What the session's next-actions row offers (the official session.availableNextActions).
const available = new Map();
const APP_ACTIONS = new Set(["commit", "create_pr", "merge", "fix_ci", "address_comments", "resolve_conflicts", "verify", "archive"]);
/** LocalSessions.setAvailableNextActions(sessionId, actions | undefined), from the renderer. */
export function setAvailableNextActions(sessionId, actions) {
  if (typeof sessionId !== "string" || !sessionId) return false;
  if (actions === undefined || actions === null) { available.delete(sessionId); return true; }
  if (!Array.isArray(actions)) return false;
  remember(available, sessionId, actions.filter((action) => typeof action === "string" && APP_ACTIONS.has(action)));
  return true;
}
/** Forget every session's plan, actions and pending reminder (tests). */
export function resetTurnPlans() { plans.clear(); available.clear(); turns.clear(); reminders.clear(); }

const context = (sessionId) => ({
  sessionId,
  turnPlan: () => turnPlanFor(sessionId),
  getAvailableNextActions: () => available.get(sessionId),
  drivenOverRemoteControl: () => false,
});

const tool = (name, title) => {
  const definition = server.tools.find((entry) => entry.name === name);
  return {
    name: definition.name,
    title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    annotations: definition.annotations,
    alwaysLoad: definition.alwaysLoad,
    handler: async (args = {}, ctx = {}) => {
      if (ctx?.call?.subAgent === true) return { content: [{ type: "text", text: SUBAGENT_TURN_TOOL_REFUSAL }], isError: true };
      return handle(name, args && typeof args === "object" ? args : {}, context(ctx?.sessionId));
    },
  };
};
// Codex has an update_plan of its own (the plan / TODO checklist, turn/plan/updated): it is turned off for its sessions
// (codexBuiltin → -c tools.update_plan.enabled=false), so a Codex model, like every other core, keeps the task list with
// this one. The two never share a name otherwise: Codex calls this one mcp__code_desktop__update_plan.
export const tools = [{ ...tool(UPDATE_PLAN, "Update task list"), codexBuiltin: "update_plan" }, tool(WRAP_UP, "Wrap up turn")];

// ---- the hooks (ft), driven by the session's core notifications.
const turns = new Map(); // thread → its running turn id
const reminders = new Map(); // thread → the turn whose compaction owes a reminder
const hooksFor = (sessionId) => turnPlanHooks(() => turnPlanFor(sessionId), { timeoutSeconds: 30 });
const officialName = (item) => {
  if (!item || (item.type !== "mcpToolCall" && item.type !== "dynamicToolCall")) return null;
  const server = typeof item.server === "string" ? item.server : typeof item.namespace === "string" ? item.namespace : "";
  let name = typeof item.tool === "string" ? item.tool : typeof item.name === "string" ? item.name : "";
  if (server !== SERVER && server !== `mcp__${SERVER}`) {
    if (server) return null;
    if (name.startsWith(HOST_PREFIX)) name = name.slice(HOST_PREFIX.length);
    else if (name.startsWith(`${SERVER}_`)) name = name.slice(SERVER.length + 1);
    else return null;
  }
  return name === UPDATE_PLAN ? UPDATE_PLAN_TOOL_NAME : name === WRAP_UP ? WRAP_UP_TOOL_NAME : null;
};
const failed = (item) => item?.status === "failed" || item?.status === "declined" || item?.result?.isError === true || !!item?.error || item?.success === false;
// The reminder names the tools as this host serves them.
const hostNames = (text) => text.split(OFFICIAL_PREFIX).join(HOST_PREFIX);

/**
 * A core notification of the app's sessions. isSession(threadId): a thread is one of the app's own sessions (a
 * sub-agent's thread is not: the official hooks skip agent_id calls).
 */
export async function observe(event, { isSession = () => true } = {}) {
  const params = event?.params;
  const threadId = typeof params?.threadId === "string" ? params.threadId : null;
  if (!threadId || !isSession(threadId)) return;
  if (event.method === "turn/started" && typeof params.turn?.id === "string") { turns.set(threadId, params.turn.id); return; }
  if (event.method !== "item/completed" || !params.item) return;
  const turnId = (typeof params.turnId === "string" && params.turnId) || turns.get(threadId) || null;
  const name = officialName(params.item);
  if (name && !failed(params.item)) {
    const [entry] = hooksFor(threadId).PostToolUse;
    await entry.hooks[0]({ hook_event_name: "PostToolUse", tool_name: name, prompt_id: turnId });
    return;
  }
  if (params.item.type === "contextCompaction" && turnId) remember(reminders, threadId, turnId);
}
/** turn/start params of a session as main is about to send them: the compaction reminder it owes goes first. */
export async function turnStart(params) {
  const threadId = typeof params?.threadId === "string" ? params.threadId : null;
  if (!threadId || !reminders.has(threadId)) return params;
  const turnId = reminders.get(threadId);
  reminders.delete(threadId);
  const [entry] = hooksFor(threadId).SessionStart;
  const out = await entry.hooks[0]({ hook_event_name: "SessionStart", source: "compact", prompt_id: turnId });
  const text = out?.hookSpecificOutput?.additionalContext;
  if (typeof text === "string" && text && Array.isArray(params.input))
    params.input = [{ type: "text", text: `<system-reminder>\n${hostNames(text)}\n</system-reminder>`, text_elements: [] }, ...params.input];
  return params;
}
