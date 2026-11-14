// Codex's /auto-review ('approve one retry of a recent auto-review denial', tui slash_command.rs; permission_popups.rs):
// a denial Codex's reviewer made in 'Approve for me' can be approved once with thread/approveGuardianDeniedAction
// {threadId, event}, where event is the core's GuardianAssessmentEvent (codex-rs/protocol approvals.rs; snake_case
// fields, a snake_case `type`-tagged action). OpenClaude Desktop keeps the app-server's camelCase review
// (item/autoApprovalReview/completed, state.js autoReviews) and rebuilds the event from it, as the TUI does
// (chatwidget/protocol_requests.rs on_guardian_review_notification). Pure.
import { t } from "../electron/i18n/index.mjs";

const SOURCE = { shell: "shell", unifiedExec: "unified_exec" };
const PROTOCOL = { http: "http", https: "https", socks5Tcp: "socks5_tcp", socks5Udp: "socks5_udp" };
const text = (value) => (typeof value === "string" ? value : null);

/** The core's GuardianAssessmentAction for an app-server GuardianApprovalReviewAction, or null when it can't be rebuilt. */
export function guardianAction(action) {
  if (!action || typeof action !== "object") return null;
  switch (action.type) {
    case "command":
      return text(action.command) !== null && SOURCE[action.source] ? { type: "command", source: SOURCE[action.source], command: action.command, cwd: text(action.cwd) ?? "" } : null;
    case "execve":
      return text(action.program) !== null && SOURCE[action.source] && Array.isArray(action.argv)
        ? { type: "execve", source: SOURCE[action.source], program: action.program, argv: action.argv.filter((arg) => typeof arg === "string"), cwd: text(action.cwd) ?? "" } : null;
    case "writeStdin":
      return text(action.processId) !== null ? { type: "write_stdin", approval_id: text(action.approvalId) ?? "", process_id: action.processId, stdin: text(action.stdin) ?? "", cwd: text(action.cwd) ?? "" } : null;
    case "applyPatch":
      return Array.isArray(action.files) ? { type: "apply_patch", cwd: text(action.cwd) ?? "", files: action.files.filter((file) => typeof file === "string") } : null;
    case "networkAccess":
      return text(action.host) !== null && PROTOCOL[action.protocol] && Number.isInteger(action.port)
        ? { type: "network_access", target: text(action.target) ?? action.host, host: action.host, protocol: PROTOCOL[action.protocol], port: action.port } : null;
    case "mcpToolCall":
      return text(action.server) !== null && text(action.toolName) !== null
        ? { type: "mcp_tool_call", server: action.server, tool_name: action.toolName, connector_id: text(action.connectorId), connector_name: text(action.connectorName), tool_title: text(action.toolTitle) } : null;
    // A permissions request carries a profile whose shape differs between the two protocols: not rebuilt.
    default: return null;
  }
}

/** The GuardianAssessmentEvent for a stored denied review, or null when it isn't one that can be approved once. */
export function guardianDenialEvent(review) {
  if (!review || review.status !== "denied" || typeof review.reviewId !== "string" || !review.reviewId) return null;
  const action = guardianAction(review.action);
  if (!action) return null;
  return {
    id: review.reviewId,
    ...(typeof review.targetItemId === "string" && review.targetItemId ? { target_item_id: review.targetItemId } : {}),
    turn_id: typeof review.turnId === "string" ? review.turnId : "",
    started_at_ms: Number.isFinite(review.startedAtMs) ? review.startedAtMs : 0,
    ...(Number.isFinite(review.completedAtMs) ? { completed_at_ms: review.completedAtMs } : {}),
    status: "denied",
    ...(typeof review.riskLevel === "string" ? { risk_level: review.riskLevel.toLowerCase() } : {}),
    ...(typeof review.userAuthorization === "string" ? { user_authorization: review.userAuthorization.toLowerCase() } : {}),
    ...(typeof review.rationale === "string" ? { rationale: review.rationale } : {}),
    ...(review.decisionSource === "agent" ? { decision_source: "agent" } : {}),
    action,
  };
}

/** What the reviewer refused, in a line (tui auto_review_denials.rs action_summary). */
export function deniedActionSummary(action) {
  if (!action || typeof action !== "object") return "";
  switch (action.type) {
    case "command": return text(action.command) ?? "";
    case "execve": return (Array.isArray(action.argv) && action.argv.length ? action.argv : [action.program]).filter(Boolean).join(" ");
    case "writeStdin": return t("Send input to terminal {id}", { id: action.processId ?? "" });
    case "applyPatch": return (Array.isArray(action.files) ? action.files : []).join(", ");
    case "networkAccess": return action.port ? `${action.host}:${action.port}` : action.host ?? action.target ?? "";
    case "mcpToolCall": return `${action.connectorName || action.server}: ${action.toolTitle || action.toolName}`;
    default: return "";
  }
}
