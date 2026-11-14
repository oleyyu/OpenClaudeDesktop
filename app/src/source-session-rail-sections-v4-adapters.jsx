// Host services of the 4.16336.0 session rail Servers and Background tasks sections (src/generated/session-rail-sections-v4,
// scripts/extract-session-rail-sections-v4.mjs). In production since the session-rail-sections cutover (real-b background-tasks,
// 2026-11-10): src/source-session-rail.jsx renders its SessionRailServers / SessionRailBackgroundTasks.
// Every name here is an existing host adapter re-exported unchanged: the 3.6556.2 graph (src/generated/session-rail-sections)
// already adapts the same official services, which 4.16336.0 moved to new chunks/locals. The semantics are the ones
// documented at the original export (src/source-session-rail-sections-adapters.jsx: the rail's mount provides them through
// SessionRailSectionsHostContext). The generator pins, for each, the 4.16336.0 declaration it replaces (features + raw
// declaration sha256) and records it in provenance.json `adapters`.
export {
  useSessionRailMeta, useRemoteSessionBridgeUp, useRemoteSessionServers, usePreferredPreviewServers, useOpenTasksPane,
  useRailStoppingIds, useDismissedTaskIds, useServerStop, useLoopStop, useTaskStop, useGrowthBookFeature,
  usePreviewOpensInBrowser, useActiveServers, claudeWebLaunch, useRailScopeStoreApi, useRailScopeState, useRailPreviewViews,
  railSidePaneOpen, useSessionPreviewId, logSidePaneOpened, logRailStopPressed, useSessionTasks,
} from "./source-session-rail-sections-adapters.jsx";
export { useIntl, FormattedMessage } from "./source-session-rail-kit-adapters.jsx";
