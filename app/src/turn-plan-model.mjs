// turn-plan: the Code session's turn tail (task list card, next-step box, settled wrap-ups) from the ccd_turn calls in the
// transcript — the app tools of electron/agent-tools/turn-plan.mjs, Claude Desktop 2.42304.0's mcp__ccd_turn__update_plan
// and mcp__ccd_turn__wrap_up.
//
// The derivation is the original: c1ebb1aa4 Rt (generated/turn-plan/turn-tail.mjs deriveTurnTail) reads the session's
// SDK messages for the latest prompt — the newest update_plan items call is the plan, later advance / done / start calls
// apply over it, an errored call is skipped, a wrap_up after the plan checks every step off and keeps the list it had
// (planBeforeWrapUp), a turn that ended cleanly with only its last step in progress completes it (Mt), and the newest
// settling wrap_up is the box's wrapUp / receipt — and c1ebb1aa4 Ft / It give the settled wrap-ups of earlier turns.
// What differs is only the input: the host's transcript is Codex-protocol items, so turnMessages() writes them as the SDK
// messages Rt reads (the official desktop reads the CLI's own):
//   userMessage       {type:"user", uuid:item.id, message:{content:[text…]}}     (latestPromptId is its id)
//   agentMessage      an assistant message with its text (stamped: message id and model)
//   a tool call       an assistant tool_use (update_plan / wrap_up under their official mcp__ccd_turn__ names, with the
//                     call's arguments as input) and, once it finished, the user tool_result (is_error when it failed)
//   contextCompaction a system compact_boundary
//   a turn's end      a result message (success, or error_during_execution when the turn failed) after its items; the
//                     running turn has none
// Running agents (Rt's r): the spawnAgent calls whose agents still run.
import { EMPTY_TURN_TAIL, deriveTurnTail, wrapUpReceipt, wrapUpsByPrompt } from "./generated/turn-plan/turn-tail.mjs";
import { UPDATE_PLAN_TOOL, WRAP_UP_TOOL, legacyWrapUpText } from "./generated/turn-plan/plan-update.mjs";
import { sdkToolName } from "./transcript-sdk-tools.mjs";

const SERVER = "code_desktop";
const OFFICIAL = { update_plan: UPDATE_PLAN_TOOL, wrap_up: WRAP_UP_TOOL };
const str = (value) => (typeof value === "string" ? value : "");
const record = (value) => value && typeof value === "object" && !Array.isArray(value);

/** The ccd_turn tool an item calls ("update_plan" | "wrap_up"), or null. */
export function turnToolOf(item) {
  if (!item || (item.type !== "mcpToolCall" && item.type !== "dynamicToolCall")) return null;
  const server = str(item.server) || str(item.namespace);
  let tool = str(item.tool) || str(item.name);
  if (server !== SERVER && server !== `mcp__${SERVER}`) {
    if (server) return null;
    if (tool.startsWith(`mcp__${SERVER}__`)) tool = tool.slice(`mcp__${SERVER}__`.length);
    else if (tool.startsWith(`${SERVER}_`)) tool = tool.slice(SERVER.length + 1);
    else return null;
  }
  return Object.hasOwn(OFFICIAL, tool) ? tool : null;
}
/** The call's input (an object; a JSON string is read). */
export function toolArgs(item) {
  let args = item?.arguments ?? item?.input;
  if (typeof args === "string") { try { args = JSON.parse(args); } catch { args = null; } }
  return record(args) ? args : {};
}
const failedCall = (item) => item?.status === "failed" || item?.status === "declined" || item?.result?.isError === true || !!item?.error || item?.success === false;
const finished = (item) => failedCall(item) || item?.status === "completed" || item?.result !== undefined && item?.result !== null;
const resultText = (item) => {
  const parts = Array.isArray(item?.result?.content) ? item.result.content : Array.isArray(item?.contentItems) ? item.contentItems : [];
  const text = parts.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
  return text || str(item?.error?.message) || str(item?.aggregatedOutput);
};
const userText = (item) => (Array.isArray(item?.content) ? item.content : []).filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => ({ type: "text", text: part.text }));
// The name an SDK tool_use carries for a host tool item: the one mapping every transcript reader shares
// (transcript-sdk-tools.mjs: Bash, Read, Edit, TodoWrite, mcp__<server>__<tool>, …); Rt reads update_plan / wrap_up
// under their official mcp__ccd_turn__ names and the todo tools (TodoWrite / TaskCreate / TaskUpdate) by theirs.
const toolName = (item) => {
  const turn = turnToolOf(item);
  if (turn) return OFFICIAL[turn];
  return sdkToolName(item) ?? item.type;
};
const TOOL_ITEMS = new Set(["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "webSearch", "collabAgentToolCall", "imageView", "imageGeneration", "computerUse", "sleep"]);

/**
 * The host transcript as the SDK messages c1ebb1aa4 Rt / Ft read: {messages, runningAgents}.
 *   activeTurnId   the running turn (state.active[id]): it has no result message yet
 *   turnErrors     state.turnErrors[id] (turnId → TurnError): a failed turn's result is error_during_execution
 *   agentLifecycle state.agentLifecycle (agent thread → {status})
 */
export function turnMessages(items, { activeTurnId = null, turnErrors = null, agentLifecycle = null } = {}) {
  const list = Array.isArray(items) ? items : [];
  const messages = [], runningAgents = new Set();
  let turn, open = false;
  const close = () => {
    if (!open) return;
    open = false;
    if (!turn || turn === activeTurnId) return;
    const error = !!turnErrors?.[turn];
    messages.push({ type: "result", uuid: `result:${turn}`, subtype: error ? "error_during_execution" : "success", is_error: error, num_turns: 1 });
  };
  for (const item of list) {
    if (!item || typeof item !== "object" || item.localCommand || item.workflowRun) continue;
    const turnId = item.turnId ?? null;
    if (!open || turnId !== turn) { close(); turn = turnId; open = true; }
    const id = str(item.id);
    if (item.type === "userMessage") {
      messages.push({ type: "user", uuid: id, message: { role: "user", content: userText(item) } });
      continue;
    }
    if (item.type === "agentMessage") {
      if (str(item.text)) messages.push({ type: "assistant", uuid: id, message: { id, model: "host", role: "assistant", content: [{ type: "text", text: item.text }], stop_reason: null } });
      continue;
    }
    if (item.type === "contextCompaction") {
      if (item.status !== "inProgress") messages.push({ type: "system", subtype: "compact_boundary", uuid: id, compact_metadata: Number.isFinite(item.preTokens) ? { pre_tokens: item.preTokens } : {} });
      continue;
    }
    if (!TOOL_ITEMS.has(item.type)) continue;
    messages.push({ type: "assistant", uuid: `${id}:use`, message: { id: `${id}:use`, model: "host", role: "assistant", stop_reason: "tool_use",
      content: [{ type: "tool_use", id, name: toolName(item), input: toolArgs(item) }] } });
    if (finished(item)) messages.push({ type: "user", uuid: `${id}:result`, message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, is_error: failedCall(item), content: resultText(item) }] } });
    if (item.type === "collabAgentToolCall" && item.tool === "spawnAgent") {
      const agents = [...(item.receiverThreadIds || []), ...Object.keys(item.agentsStates || {})];
      if (agents.some((agent) => agentLifecycle?.[agent]?.status === "running")) runningAgents.add(id);
    }
  }
  close();
  return { messages, runningAgents };
}

/** N_ (c1ebb1aa4 Wt → Ut → Rt, the update_plan branch: no TaskCreate todos) over the host transcript. */
export function codeTurnTail({ items, latestPromptId, activeTurnId = null, turnErrors = null, agentLifecycle = null } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return EMPTY_TURN_TAIL;
  const { messages, runningAgents } = turnMessages(list, { activeTurnId, turnErrors, agentLifecycle });
  if (messages.length === 0) return EMPTY_TURN_TAIL;
  return deriveTurnTail(messages, latestPromptId, undefined, runningAgents);
}

/**
 * c1ebb1aa4 Lt: prompt id → the receipt (It) of the wrap_up that settled the turn before that prompt, for every prompt
 * row (the host's userMessage items), unless its call was dismissed (G: dismissed wrap-up call ids).
 */
export function settledWrapUps(items, { activeTurnId = null, turnErrors = null, dismissed = null } = {}) {
  const list = Array.isArray(items) ? items : [];
  const prompts = new Set(list.filter((item) => item?.type === "userMessage" && item.id).map((item) => item.id));
  const out = new Map();
  if (prompts.size === 0) return out;
  const { messages } = turnMessages(list, { activeTurnId, turnErrors });
  for (const [prompt, found] of wrapUpsByPrompt(messages, (uuid) => prompts.has(uuid), false)) {
    const receipt = wrapUpReceipt(found);
    if (prompt !== null && receipt !== null && !(found.callId !== null && dismissed?.has?.(found.callId))) out.set(prompt, receipt);
  }
  return out;
}

/** A prompt item as the transcript row c96d752d0 AL reads ({id, author:"user", items:[{kind:"text", id, text}]}). */
export function promptRowOf(item) {
  return { id: str(item?.id), author: "user", items: userText(item).map((part, index) => ({ kind: "text", id: `${str(item?.id)}-t${index}`, text: part.text })) };
}

/**
 * The Code transcript's rows with the ccd_turn calls taken out (c06cf64bb: update_plan draws no row, wrap_up none either
 * unless an old-style call's text — Vr = cb27dab29 Me — shows as text), and each settled wrap-up's receipt row in front
 * of the prompt row that answered it (c96d752d0 `settledTurnBox`, rendered by generated SettledTurnBox).
 *   settled   settledWrapUps(...)  (prompt id → receipt); the row carries the prompt row the receipt quotes (AL).
 */
export function withTurnBoxRows(items, settled = null) {
  const list = Array.isArray(items) ? items : [];
  if (!list.some((item) => turnToolOf(item)) && !(settled?.size > 0)) return list;
  const out = [];
  for (const item of list) {
    const tool = turnToolOf(item);
    if (tool === "update_plan") continue;
    if (tool === "wrap_up") {
      const text = legacyWrapUpText(toolArgs(item));
      if (text !== undefined) out.push({ id: `${item.id}-wrap`, type: "agentMessage", text, turnId: item.turnId });
      continue;
    }
    const receipt = item?.type === "userMessage" ? settled?.get(item.id) : undefined;
    if (receipt !== undefined) out.push({ id: `turn-box-${item.id}`, turnId: item.turnId, settledTurnBox: { wrapUp: receipt, promptRow: promptRowOf(item) } });
    out.push(item);
  }
  return out;
}
