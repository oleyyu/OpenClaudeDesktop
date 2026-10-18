// Local services for the original 2.42304.0 transcript rows that scripts/extract-transcript-rows.mjs emits
// (generated/transcript-rows: c96d752d0 XAe / ZAe / ZM, n0 / e0 / Uz / HZ, cb6930dae La / Ba / Ra / Wa / Ya / _o, and
// the rows-*.mjs originals they reach). Each export replaces one import of the originals, feature-checked by the
// extractor. This module must not import generated/transcript-rows.
//
//   useIntl / FormattedMessage   react-intl over the host catalog (t(), keyed by the English message).
//   useSessionAwaitsRequest      shared-11 Im: the desktop request store. Host: the transcript scope's awaiting flag
//                                (pending approvals of the transcript's session).
//   sessionActivityStore/Events  c06cf64bb G / tc: the desktop's per-session thinking / waiting state. The host's turn
//                                state is engine items, not this store: the empty session (YM then reads "tool-use"
//                                while no row holds the tail, as the desktop does for a session it has no state for).
//   useGrowthBookFlag            shared-25 Zs: the host's GrowthBook answers (host-growthbook.mjs).
//   useCodeThemeLight / Dark     shared-14 Ue / We: the editor prefs store's code theme pair (the tool bodies' Shiki /
//                                pierre theme) — the host's pair (code-theme-store.mjs, the same official ids).
//   reportError / trackAction    shared-0 LA / V: datadog error reports and RUM actions — nothing is sent (D17).
//   useRequestStore              shared-11 X: the desktop's permission request store, read through a selector — the
//                                host's pending approvals of the transcript's session as requestsBySession.
//   useOpenSettingsHref          shared-5 V_: the desktop's settings navigation ("Manage connectors") — the host's
//                                Settings › Connectors (split-view primary side).
//
// The tool rows' services (transcript-tool-scope.mjs TranscriptToolScope, provided by source-transcript-tool-rows.jsx):
//   useEngineSurface             c96d752d0 fM: the engine surface (the host's tool row mount, see that module).
//   (the tool result body, cb6930dae Tu, and the file link, c856385e2 In, are the originals since 2026-10-18; the host
//   provides the file contexts they read — see source-transcript-tool-rows.jsx)
//   TranscriptMarkdown           c19e90103 Ix: the desktop's markdown renderer, for text a tool body shows as a message
//                                — the transcript's own markdown (scope.renderMarkdown).
//   FileMenuTrigger / FilePathMenuItems
//                                c0cdf4a08 _ / c856385e2 Q: the file link's context menu and its items — the host's
//                                delegated [data-file-ref] menu (source-transcript.jsx): the trigger carries the path.
//   SessionRenameBody / InboxMessageBody
//                                cb6930dae Vs / bs: bodies of desktop-only results (a rename's _meta record, a Slack
//                                inbox message) no host core produces — nothing.
//   ToolOutputImages             cb6930dae Hu: the tool's output images — the host's image tiles.
//   ToolAttachedFiles            cb6930dae iu: the files a tool attached — the host's deliverables of the item
//                                (codeDesktop.artifacts, scope.renderAttachedFiles).
//   useOpenProjectSettings       cd8aaaf0e N: "Manage settings" on a project-settings tool — none.
//   useVerboseTranscript / useCompactTranscript / useShowThinking
//                                cd4f82e77 _n / vn / yn: the transcript view store — the host's transcript view.
//   useQueuedBehindApproval      c5da7eb42 My: the request store's approval queue — the host shows one approval per
//                                row, never a queued one behind another: false.
//   useLiveOutputTask / LiveOutputButton
//                                c96d752d0 _M / xM: "View live output" over the desktop's tasks pane store — the host's
//                                background task of the command and its tasks pane.
//   logToolRowExpanded / preloadToolIntent / useModelFallbackTelemetry
//                                c68c4283d Uu / c96d752d0 l2e / OM: telemetry and preloading — nothing is sent (D17).
//   the tool cards (VX, X$, j1, x$e, …) and the rows of features the host has no data for (mz, _z, R$, RZ, sF, NW, …):
//                                the host's card when it has one (renderCard), else the card's own fallback.
import React, { useContext } from "react";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { TranscriptHostScope } from "./transcript-host-scope.mjs";
import { TranscriptToolScope } from "./transcript-tool-scope.mjs";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { t } from "../electron/i18n/index.mjs";
import { useSourceToasts } from "./source-toast.jsx";
import { useCodeThemes } from "./code-theme-store.mjs";
import { splitStore } from "./source-split-view.jsx";
export { sessionActivityEvents, sessionActivityStore, useTurnStartTime } from "./source-working-line-adapters.jsx";

export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

export function useSessionAwaitsRequest(sessionId) {
  const scope = useContext(TranscriptHostScope);
  return sessionId !== undefined && sessionId !== null && scope.sessionId === sessionId ? scope.awaiting === true : false;
}

export function useGrowthBookFlag(flag) {
  return hostGrowthBookFlag(flag);
}
export function useGrowthBookFlagWhen(flag, enabled) {
  return enabled ? hostGrowthBookFlag(flag) : false;
}
export function useChatTextSize() {
  return "m";
}
export function useCodeThemeLight() {
  return useCodeThemes().light;
}
export function useCodeThemeDark() {
  return useCodeThemes().dark;
}
export function reportError() {}
export function trackAction() {}
// shared-11 X read as a hook with a selector (zustand): the transcript session's pending approvals, keyed by tool use id
// (an ipc request still open: status "pending").
export function useRequestStore(selector) {
  const host = useContext(TranscriptHostScope), tools = useContext(TranscriptToolScope);
  const state = React.useMemo(() => {
    const pending = {};
    for (const id of tools.pendingApprovalItemIds ?? []) pending[id] = { requestId: id, status: "pending", transport: "ipc" };
    return { requestsBySession: host.sessionId ? { [host.sessionId]: pending } : {}, approvedPlans: {} };
  }, [host.sessionId, tools.pendingApprovalItemIds]);
  return typeof selector === "function" ? selector(state) : state;
}
// shared-5 V_: (href, section, options) → navigate. Every caller here opens the connectors settings.
export function useOpenSettingsHref() {
  return React.useCallback(() => { splitStore.toPrimary("settings", "customize-connectors"); }, []);
}
export function TranscriptMarkdown({ children }) {
  const scope = useToolScope();
  if (typeof children !== "string") return children ?? null;
  return scope.renderMarkdown?.(children) ?? <span className="whitespace-pre-wrap">{children}</span>;
}
// c0cdf4a08 _ ({trigger, beforeOpen, children: c856385e2 Q {path, line, endLine}}): the trigger with the path the
// transcript's delegated file menu reads.
export function FileMenuTrigger({ trigger, children }) {
  const menu = React.isValidElement(children) ? children.props : null;
  if (!React.isValidElement(trigger) || typeof menu?.path !== "string") return trigger ?? null;
  return React.cloneElement(trigger, { "data-file-ref": menu.path,
    ...(Number.isFinite(menu.line) ? { "data-file-line": menu.line } : {}), ...(Number.isFinite(menu.endLine) ? { "data-file-end-line": menu.endLine } : {}) });
}
export function FilePathMenuItems() {
  return null;
}
export function SessionRenameBody() {
  return null;
}
export function InboxMessageBody() {
  return null;
}

const useToolScope = () => useContext(TranscriptToolScope);

export function useEngineSurface() {
  return useToolScope().surface ?? null;
}
export function ToolOutputImages({ images, path }) {
  const scope = useToolScope();
  return images?.length && scope.renderImages ? scope.renderImages(images, path) ?? null : null;
}
export function ToolAttachedFiles({ tool, placement = "under-row" }) {
  const scope = useToolScope();
  return scope.renderAttachedFiles?.(tool, placement) ?? null;
}

export function useOpenProjectSettings() {
  return null;
}
export function useVerboseTranscript() {
  return useToolScope().transcriptView === "verbose";
}
export function useCompactTranscript() {
  return useToolScope().transcriptView !== "verbose";
}
export function useShowThinking() {
  return useToolScope().showThinking !== false;
}
export function useQueuedBehindApproval() {
  return false;
}

export function useLiveOutputTask(toolUseId) {
  const scope = useToolScope();
  return toolUseId ? scope.liveOutputTask?.(toolUseId) ?? undefined : undefined;
}
// xM: a link-styled button that opens the tasks pane at the task, without toggling the row.
export function LiveOutputButton({ taskId }) {
  const scope = useToolScope();
  return <button type="button" data-row-live=""
    className="shrink-0 text-body text-primary hover:underline underline-offset-[3px] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-[3px]"
    onClick={(event) => { event.stopPropagation(); scope.openLiveOutput?.(taskId); }}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}>{t("View live output")}</button>;
}

// shared-52 Sj: the desktop's ErrorsProvider toasts (the thinking step's "Copied", a card's error) — the host's toasts.
export function useErrors() {
  const toasts = useSourceToasts();
  return React.useMemo(() => ({
    addSuccess: (message) => toasts?.add?.(message, { variant: "neutral" }),
    addError: (error) => toasts?.add?.(typeof error === "string" ? error : error?.message ?? String(error), { variant: "danger" }),
  }), [toasts]);
}
export function logToolRowExpanded() {}
export function preloadToolIntent() {}
export function useModelFallbackTelemetry() {}

const EMPTY_SET = new Set();
export function useStartedSessionTools() {
  return EMPTY_SET;
}
// u$e: the block find-in-page skips (the coordinator's add_repo error card); only ever drawn with that card.
export function FindOmittedBlock({ className = "contents", children }) {
  return <div className={className} data-find-omitted="">{children}</div>;
}
export function ErrorCard() {
  return null;
}
// Rows of data the host transcript never carries (held notices, event entries, side sessions, task chips, notes, the
// cloud environment's setup steps, a remote trigger's name).
export function HeldNoticeRow() { return null; }
export function EventEntryRow() { return null; }
export function InlineSideSessions() { return null; }
export function RemoteTriggerName() { return null; }
export function SessionNoteRow() { return null; }
export function TaskEventChips() { return null; }
export function EnvironmentSetupSteps() { return null; }

// A tool card m2e / e0 picks by name: the host's card when it has one for the tool's engine item, else the card's own
// fallback (the tool row), else the tool row itself (scope.renderCard gets kind "row").
function toolCard(kind) {
  const Card = (props) => {
    const scope = useToolScope();
    const own = scope.renderCard?.(kind, props);
    if (own !== undefined) return own;
    if (props.fallback !== undefined) return props.fallback;
    return scope.renderCard?.("row", props) ?? null;
  };
  Card.displayName = `HostToolCard(${kind})`;
  return React.memo(Card);
}
export const McpAppToolCard = toolCard("mcp-app");
export const FindingsToolCard = toolCard("findings");
export const WorkflowToolCard = toolCard("workflow");
export const QuestionReceiptCard = toolCard("question");
export const SessionToolCard = toolCard("session");
export const SideSessionResultCard = toolCard("side-session");
export const ArtifactToolCard = toolCard("artifact");
export const ArtifactLabelCard = toolCard("artifact-label");
export const CoordinatorToolCard = toolCard("coordinator");
export const CoordinatorMessageCard = toolCard("coordinator-message");
export const PeerSendCard = toolCard("peer-send");
export const PreviewToolCard = toolCard("preview");
export const SessionMgmtCard = toolCard("session-mgmt");
export const PluginSuggestionCard = toolCard("plugin-suggestion");
export const SkillSuggestionCard = toolCard("skill-suggestion");
export const SkillProposalCard = toolCard("skill-proposal");
export const RegistryToolCard = toolCard("registry");
export const ScopeStubCard = toolCard("scope-stub");
export const VerificationCodeCard = toolCard("verification-code");
