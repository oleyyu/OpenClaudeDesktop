// The host's pending approvals in the shapes the 3.6556.2 sidebar hover card reads (W14-code r4 sidebar-new, fr4-07;
// generated/sidebar-hover-card, scripts/extract-sidebar-hover-card.mjs).
//
// The desktop reads a session from three places, and the host answers all three from its own pending approvals
// (state.approvals, the app-server requests of the session's threads):
//   - the row data `ce` shared-22 pC hands QO (`data`): `{id, type, isArchived, sessionStatus, pendingPermissions,
//     _originalSession: {id, session_status, external_metadata: {pending_action}}}` — sidebarHoverCardData();
//   - the session's permission requests (shared-11 M_, read by jO through xd = j_): `{requestId, toolUseId, toolName,
//     input, status}` per request — hoverCardRequests();
//   - the session's live approval (c5da7eb42 KS, read by ca0409d7c H): `{tool: {id, name, input, status}, description,
//     hasAlwaysAllow, queueDepth, inputUnasserted, decide}` — built by the adapter over hoverCardTool().
//
// The desktop's tool names are Claude Code's. A command approval (item/commandExecution/requestApproval) is the Bash
// tool with its command (shared-20 uO `Bash: {keys: command / description, required: [command]}`); any other request
// keeps the kind tool_permission under its own method name, which uO does not list, so the card shows the original's
// "Awaiting input · Open the session to respond" (ca0409d7c U) for it instead of inline decisions.
// Plain node: no JSX, no generated import (E42).
import { approvalCardModel } from "./approval-card-model.mjs";

const COMMAND = "item/commandExecution/requestApproval";
const QUESTION = "item/tool/requestUserInput";

const requestIdOf = (request) => String(request?.id ?? "");

/** {toolName, input, description} for a host request: Bash {command} for a plain command approval, else its method. */
export function hoverCardTool(request) {
  if (!request || typeof request !== "object") return null;
  let model = null;
  try { model = approvalCardModel(request, null); } catch { model = null; }
  const description = typeof model?.title === "string" ? model.title : "";
  const params = request.params ?? {};
  const plainCommand = request.method === COMMAND && params.kind !== "writeStdin" && !params.codeDesktop?.sampling && !params.codeDesktop?.agentTool;
  const command = model?.detail?.kind === "command" && typeof model.detail.text === "string" ? model.detail.text : null;
  if (plainCommand && command) return { toolName: "Bash", input: { command }, description };
  // A question the agent asked (AskUserQuestion's host form) is not a permission: no tool, so it is not offered inline.
  if (request.method === QUESTION) return { toolName: "AskUserQuestion", input: undefined, description };
  return { toolName: String(request.method ?? ""), input: undefined, description };
}

/** shared-11 M_'s list for a session: one desktop request per host request, oldest first. */
export function hoverCardRequests(requests = []) {
  return (Array.isArray(requests) ? requests : []).filter(Boolean).map((request) => {
    const tool = hoverCardTool(request);
    const id = requestIdOf(request);
    return { requestId: id, toolUseId: id, toolName: tool?.toolName, input: tool?.input ?? {}, inputUnasserted: tool?.input === undefined || undefined,
      status: "pending", outOfTurn: false, hostRequest: request };
  });
}

/** The session's pending_action (shared-20 BD reads it): the oldest request, as the desktop's metadata names it. */
export function hoverCardPendingAction(requests = []) {
  const first = (Array.isArray(requests) ? requests : []).find(Boolean);
  if (!first) return undefined;
  const tool = hoverCardTool(first);
  const id = requestIdOf(first);
  return { tool_name: tool?.toolName ?? "", tool_use_id: id, request_id: id, action_description: tool?.description ?? "",
    ...(tool?.input === undefined ? {} : { input: tool.input }) };
}

/**
 * QO's `data` for a host session (shared-22 pC `ce`): awaiting is `!isArchived && pendingPermissions > 0` (pC `Q`).
 * session: {id, archived?}; requests: the session's pending approvals (oldest first); summaryText is pC's `de`.
 */
export function sidebarHoverCardData(session, { requests = [], archived = false } = {}) {
  if (!session?.id) return undefined;
  const list = (Array.isArray(requests) ? requests : []).filter(Boolean);
  const pendingAction = hoverCardPendingAction(list);
  const sessionStatus = list.length > 0 ? "requires_action" : undefined;
  return {
    id: session.id, type: "local", isArchived: archived === true, sessionStatus, pendingPermissions: list.length,
    _originalSession: { id: session.id, session_status: sessionStatus, external_metadata: pendingAction ? { pending_action: pendingAction } : {} },
  };
}

/** shared-22 pC: `Q = !ce.isArchived && t.pendingPermissions > 0`, `he = L || !Q` (L: the row is being dragged / selected). */
export function sidebarHoverCardState(data, { suspended = false } = {}) {
  const awaiting = !!data && !data.isArchived && data.pendingPermissions > 0;
  return { awaiting, disabled: suspended === true || !awaiting };
}
