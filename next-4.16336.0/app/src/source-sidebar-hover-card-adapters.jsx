// Local services for the original 3.6556.2 sidebar hover card that scripts/extract-sidebar-hover-card.mjs emits
// (generated/sidebar-hover-card: shared-20 QO / jO / wO / BD, ca0409d7c AwaitingHoverCardBody, c009a87a0
// SessionSummaryTooltipBody). Each export replaces one original binding, feature-checked by the extractor.
//
//   useIntl / FormattedMessage   react-intl over the host catalog (t(), keyed by the English message).
//   useGrowthBookFlag            shared-25 fs: the host's GrowthBook answers (host-growthbook.mjs; Uon defaults, E81).
//   useSessionPermissionRequests shared-11 M_: the desktop request store's requests of a session — the host's pending
//                                approvals of that session (SidebarHoverCardHost), as sidebar-hover-card-model.mjs maps them.
//   useLivePendingApproval       c5da7eb42 KS: the session's live approval (tool, description, decide) — the oldest host
//                                request of the session, answered through the window's approval runtime.
//   ToolApprovalHoverCard        ca0409d7c fe (shared-4 ks → cf74bc599 AD, the transcript's tool card renderer, not
//                                sliced): the host's approval card (SourceApprovalCardView) with G's Deny / Allow once
//                                (approval-card-model hoverApprovalModel); `div.pb-1` as AD's frame.
//   AwaitingHoverCardBodySlice / SessionSummaryTooltipBodySlice
//                                shared-20 FO / MO and ca0409d7c de: the lazily loaded bodies, here the generated slices.
//   *Residency / *Handle         shared-104 Nm / mm residency and preload handles: nothing loads lazily — resident.
//   useHoverReplySender          c6b8adeaf Xa("hover_reply"): send a message to the session — the host's send.
//   useHoverErrors               shared-52 cB (ErrorsProvider addError): the host's danger toast.
//   useSidebarOverlayState       shared-52 q (the sidebar store's overflowMenuOpen): the host sidebar's own state.
//   the rest                     services of the desktop the host does not have (E59: no claude.ai sessions, no router,
//                                no account; D17: no telemetry): the original's "nothing" branch.
// This module must not be imported by the generated files' importers before the host provider mounts; it imports the
// generated bodies only inside components (render time), so the module cycle with the generated files is safe.
import React, { createContext, useContext, useMemo } from "react";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { useSourceToasts } from "./source-toast.jsx";
import { SourceApprovalCardView } from "./source-approval-card.jsx";
import { useApprovalDraft } from "./use-approval-draft.js";
import { hoverApprovalModel } from "./action-center-preview-model.mjs";
import { hoverCardRequests, hoverCardTool } from "./sidebar-hover-card-model.mjs";
import { AwaitingHoverCardBody } from "./generated/sidebar-hover-card/awaiting-body.mjs";
import { SessionSummaryTooltipBody } from "./generated/sidebar-hover-card/summary-tooltip-body.mjs";
import { t } from "../electron/i18n/index.mjs";
export { useSidebarOverlayState } from "./source-sidebar-current-adapters.jsx";

export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;
export function useGrowthBookFlag(flag) { return hostGrowthBookFlag(flag); }

// ---------------------------------------------------------------- the host's pending approvals
/**
 * The sidebar's hover card host (mounted once around the Code sidebar list by source-sidebar.jsx):
 *   requestsFor(sessionId) → the session's pending approval requests (state.approvals of its threads, oldest first);
 *   runtime                → the window's approval draft runtime (main.jsx approvalRuntime.current);
 *   respond(request, payload) → main.jsx respondApproval;
 *   sendReply(sessionId, text) → a promise: send the text to the session (the quick reply).
 */
export const SidebarHoverCardHostContext = createContext(null);
const NO_REQUESTS = Object.freeze([]);
const mapped = new WeakMap();
const mapRequests = (list) => {
  if (!Array.isArray(list) || list.length === 0) return NO_REQUESTS;
  let value = mapped.get(list);
  if (!value) { value = hoverCardRequests(list); mapped.set(list, value); }
  return value;
};
function useHostRequests(sessionId) {
  const host = useContext(SidebarHoverCardHostContext);
  const list = sessionId ? host?.requestsFor?.(sessionId) : undefined;
  return { host, list: Array.isArray(list) ? list : NO_REQUESTS };
}

export function useSessionPermissionRequests(sessionId) {
  return mapRequests(useHostRequests(sessionId).list);
}

const liveApprovals = new WeakMap();
/** c5da7eb42 KS over the oldest host request of the session; null when it waits on nothing. */
export function useLivePendingApproval(sessionRef) {
  const { host, list } = useHostRequests(sessionRef?.id);
  const request = list[0];
  return useMemo(() => {
    if (!request || !host) return null;
    const cached = liveApprovals.get(request);
    if (cached && cached.host === host) return cached.value;
    const tool = hoverCardTool(request);
    const id = String(request.id ?? "");
    const value = {
      tool: { id, name: tool?.toolName ?? "", input: tool?.input ?? {}, status: "awaiting_approval" },
      description: tool?.description ?? "", hasAlwaysAllow: false, queueDepth: Math.max(0, list.length - 1),
      inputUnasserted: tool?.input === undefined || undefined, hostRequest: request,
      // KS's decide(decision, input): "deny" or "once" through the request's ticket.
      decide: (decision) => decideHostRequest(host, request, decision),
    };
    liveApprovals.set(request, { host, value });
    return value;
  }, [host, request, list.length]);
}

async function decideHostRequest(host, request, decision) {
  const runtime = host?.runtime, ticket = runtime?.ticketFor?.(request);
  if (!ticket || typeof host.respond !== "function") throw Error("No pending approval to answer");
  let model = null;
  try { model = hoverApprovalModel(request); } catch { model = null; }
  const action = decision === "deny" ? model?.deny?.key ?? "decline" : "accept";
  const result = await runtime.submit(ticket, action, (payload) => host.respond(request, payload), { getVisibleThreadId: () => ticket.threadId });
  if (result?.status === "error") throw Error("Response couldn't be sent. You can try again.");
  return result;
}

/** ca0409d7c U, for a request the host card cannot show (the same markup, verbatim classes and copy). */
function AwaitingInput() {
  return <div className="flex flex-col gap-0.5 px-lg py-2.5">
    <span className="text-body-medium text-secondary"><StartMessage defaultMessage="Awaiting input" id="tM90hqjWj0" /></span>
    <span className="text-body text-muted-as-secondary"><StartMessage defaultMessage="Open the session to respond" id="cbTtulMUaI" /></span>
  </div>;
}

/**
 * ca0409d7c fe = cf74bc599 AD (ToolApprovalHoverCard): the session's own tool card (`pg` with `sidebarHover: !0`,
 * `isPanelActive: !1`, `isFocusedPane: !1`: clicks only, no chords) in `div.pb-1`, through G's Deny / Allow once
 * (`hasAlwaysAllow: !1`, `hasThreadAllow: !1`: hoverApprovalModel). A send that fails is ca0409d7c's error toast
 * ("Response couldn't be sent. You can try again.", source sidebar_hover_pending_gate).
 */
export function ToolApprovalHoverCard({ approval }) {
  const host = useContext(SidebarHoverCardHostContext);
  const request = approval?.hostRequest;
  const runtime = host?.runtime ?? NO_RUNTIME;
  const { ticket, view } = useApprovalDraft(runtime, request);
  const toasts = useSourceToasts();
  const model = request ? hoverApprovalModel(request) : null;
  if (!model || !ticket || !view || view.phase !== "pending" || typeof host?.respond !== "function") return <AwaitingInput />;
  const submit = async (action, extra) => {
    const result = await runtime.submit(ticket, action, (payload) => host.respond(request, payload),
      { getVisibleThreadId: () => ticket.threadId, ...(extra && { response: extra }) });
    if (result?.status === "error") toasts?.add?.(t("Response couldn't be sent. You can try again."), { variant: "danger" });
  };
  return <div className="pb-1">
    <SourceApprovalCardView key={ticket.key} armKey={ticket.key} request={request} model={model} busy={view.busy} busyAction={view.busyAction}
      hotkeys={false} onAction={submit} />
  </div>;
}
const NO_RUNTIME = Object.freeze({ subscribe: () => () => {}, revision: 0, ticketFor: () => null, snapshot: () => null });

// ---------------------------------------------------------------- the lazily loaded bodies, here static slices
export function AwaitingHoverCardBodySlice(props) { return <AwaitingHoverCardBody {...props} />; }
export function SessionSummaryTooltipBodySlice(props) { return <SessionSummaryTooltipBody {...props} />; }
const resident = Object.freeze({ resident: true, onSettled: () => () => {}, preload() {} });
export const awaitingHoverCardBodyHandle = resident;
export const toolApprovalCardResidency = resident;
export const fileChangeBodyResidency = resident;
export const toolApprovalHoverCardHandle = resident;
/** c272023bf i: the live approval store's provider; the live approval is the host's (useLivePendingApproval). */
export function LiveApprovalStoreProvider({ children }) { return children; }

// ---------------------------------------------------------------- the request store's answered marks: none
export function requestAnswered() { return false; }
export function subscribeAnsweredRequests() { return () => {}; }
export function markRequestAnswering() {}
export function unmarkRequestAnswering() {}

// ---------------------------------------------------------------- the quick reply and its errors
export function useHoverReplySender() {
  const host = useContext(SidebarHoverCardHostContext);
  return useMemo(() => ({
    sendWithOutcome: ({ ref, text }) => typeof host?.sendReply === "function"
      ? Promise.resolve(host.sendReply(ref?.id, text)) : Promise.reject(Error("No session to send to")),
  }), [host]);
}
export function useHoverErrors() {
  const toasts = useSourceToasts();
  return useMemo(() => ({ addError: (message) => toasts?.add?.(t(message), { variant: "danger" }) }), [toasts]);
}

// ---------------------------------------------------------------- services the host does not have (E59 / D17)
export function decisionHoldHandlers() { return { handlers: null, isActive: false }; }
export async function handleDecisionAuthError() { return false; }
export function useRemoteDecisionMutation() {
  return REMOTE_DECISION;
}
const REMOTE_DECISION = Object.freeze({ mutateAsync: () => Promise.reject(Error("No claude.ai session")) });
const QUERY_CLIENT = Object.freeze({ invalidateQueries: () => Promise.resolve() });
export function useQueryClient() { return QUERY_CLIENT; }
export const remoteSessionQueryKeys = Object.freeze({ transcript: () => ["no-remote-session"] });
const ENGINE = Object.freeze({ wakeSession() {}, beginPendingTurn() {} });
export const sessionEngineStore = Object.freeze({ getState: () => ENGINE });
export function useOnAccountSweep() {}
export function prefetchRoute() {}
export function useDesktopAppAtVersion() { return true; }
export function trackHoverCardOpened() {}
export function trackHoverQuickReply() {}
