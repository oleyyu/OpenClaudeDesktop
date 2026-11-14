// Host side of the 4.16336.0 Sessions page graph (src/generated/sessions-page-v4, scripts/extract-sessions-page-v4.mjs;
// cbd6c85c8-CxDdK_2w hm). Every export stands in for one official binding named in the generator's HOST_ADAPTERS
// table (file#local, pinned by features and declaration sha256) and in the manifest's imports.
//
// Most boundaries are the same official services the 3.6556.2 Sessions page adapts: those are re-exported from
// src/source-sessions-page-hf-adapters.jsx (its SessionsPageHfHost value, its Code-page defaults and its closed
// GrowthBook answers apply unchanged). The rest is declared here:
//   - where the 4.16336.0 contract grew (the list hook's new fields, the row actions' linkItemsFor): the 3.6556.2
//     answer plus the new fields at their official values for a Code-only page;
//   - 4.16336.0-only seams: the voluntary account-migration hint (official ineligible / disabled answers: the host has
//     no organization migration), the cowork-only / hub-mark / navigation-intent module state the sidebar nav graph
//     also reads (official values for a host without them), and the chat / cowork row menus the Code page never
//     renders (they fail loudly, as the 3.6556.2 SessionsCoworkRow / SessionsChatRowMenu).
// Nothing official is executed here; nothing is hand-rendered in place of an official component.
import { useMemo } from 'react';
import {
  useSessionsPageList as useSessionsPageListV3, useSessionsRowActions as useSessionsRowActionsV3, defineSessionsLazyChunk,
} from './source-sessions-page-hf-adapters.jsx';

function unreachable(name) {
  throw Error(`${name} is not reachable on the Code Sessions page (codeScoped: no chat, task or project rows)`);
}
const noop = () => {};
const EMPTY_SET = Object.freeze(new Set());

export {
  useSessionsSearchParams, useSessionsPathname, useSessionsRouter, useSessionsAccount, SessionsRouterLink,
  useSessionsDesktopSwitch, sessionsObservability, useSessionsErrors, trackConversationSearch, trackConversationSearchHandoff,
  useQueryKeyFetching, useLiveMode, useChatsPageSwitch, useSessionsPageVariant, invalidateRecents, patchRecents,
  ServedSearchChatDegraded, countDeletedChats, useCustomGroupAssign, useCustomGroupAssignment, markPageLoad, findCachedChat,
  useHubEligible, useChatsViewCount, useIdleReady, useDeleteChatsToast, useSessionsRowHref, SessionsChatRowMenu,
  SessionsMessage, useSessionsIntl, useSessionsQueryClient, useSessionsInfiniteQuery, useDelayedFlag, SessionsSelectionProviders,
  useWindowFocused, useTrimChatPages, useUpdateChat, useChatProjects, useChatArtifacts, useChatPendingDelete,
  loadArchivedSessions, useSessionsHistoryKey, useChatMutation, applyChatBulk, userFacingLoadError, isHiddenCoworkRow,
  useSessionsNavigate, usePendingChats, codeSearchRow, coworkSearchRow, useCustomGroupKeyOf, useBulkDeleteTracker,
  useSessionsDesktopBridge, isRowReadOnly, SessionsCoworkRow, closeRowPanes, isRowPinnable, moveRowsToGroup,
  moveRowsToNewGroup, markNavigation, registerSessionsReset,
} from "./source-sessions-page-hf-adapters.jsx";
export { useAnalytics } from "./source-routines-shared-adapters.jsx";

// ---------------------------------------------------------------- contracts that grew in 4.16336.0
// shared-39 gE (3.6556.2 shared-11 GC): hm also reads hasCoworkLoadFailed, isCoworkSearchParked, isChatSearchError and
// retryChatSearch. The Code page has no cowork list and no chat search: the official idle values.
const LIST_V4_DEFAULTS = Object.freeze({ hasCoworkLoadFailed: false, isCoworkSearchParked: false, isChatSearchError: false, retryChatSearch: noop });
export function useSessionsPageList(query, coworkEnabled) {
  const list = useSessionsPageListV3(query, coworkEnabled);
  return useMemo(() => ({ ...LIST_V4_DEFAULTS, ...list }), [list]);
}
// cc18d27d7 N (3.6556.2 M): the row actions now also carry linkItemsFor (hm passes the "Open in browser" item builder
// for remote chats), returned as given.
export function useSessionsRowActions(options = {}) {
  const { linkItemsFor } = options;
  const actions = useSessionsRowActionsV3(options);
  return useMemo(() => ({ ...actions, linkItemsFor }), [actions, linkItemsFor]);
}

// ---------------------------------------------------------------- 4.16336.0-only module state (official values)
export const useCoworkOnlyMode = () => false; // shared-123 d_: `return (Zg(), !1)`
export const markConversationNavigationIntent = noop; // shared-2 Ly: conversation-load timing mark (no conversation routes)
export const useHubMarkedUuids = () => EMPTY_SET; // shared-2 aw: the hub's local marks (no hub)

// ---------------------------------------------------------------- served recents search (lazy chunk not shipped)
// cbd6c85c8 _f: the registry entry for cf9da38bc (served_recents_search); the chunk is not part of OpenClaude, so the
// entry is the 3.6556.2 adapter's failed entry (preload / warm / lastOutcome / recoveryHost).
export const servedRecentsSearchChunk = defineSessionsLazyChunk({ id: 'served_recents_search' });

// ---------------------------------------------------------------- voluntary account migration (gate closed)
// cbf576839 I with invite_triggered_account_migration_enabled off: not eligible, settled, no context.
const NOT_ELIGIBLE = Object.freeze({ isEligible: false, isLoading: false, isSettled: true, isError: false, context: undefined, primarySourceUuid: undefined });
export const useAccountMigrationEligibility = () => NOT_ELIGIBLE;
// c24d8b988 M: the preview query, disabled (`enabled: !!e && …` with no source organization).
const DISABLED_QUERY = Object.freeze({ data: undefined, error: null, status: 'pending', fetchStatus: 'idle', isPending: true, isLoading: false, isFetching: false, isError: false, isSuccess: false });
export const useMigrationPreview = () => DISABLED_QUERY;
// cbf576839 B / z: no plan nudge (no raven organization), nothing dismissed.
const NO_PLAN_NUDGE = Object.freeze({ nudgesAllowedForPlan: false, withinBannerWindow: false, isTeamCreator: false });
export const useMigrationNudgePlan = () => NO_PLAN_NUDGE;
const NOT_DISMISSED = Object.freeze({ dismissed: false, dismiss: noop });
export const useMigrationNudgeDismissal = () => NOT_DISMISSED;
// shared-1 S2: read only by the hint's "Move some of your data" link (cbd6c85c8 mf), which the hint above never shows.
export const sessionsNudgeStore = Object.freeze({ getState: () => unreachable('shared-1 S2 (migration nudge store)') });

// ---------------------------------------------------------------- chat / cowork row menus (not on the Code page)
export function SessionsRowMenu() {
  return unreachable('cc18d27d7 F (cowork row menu)');
}
export const useSessionsChatRowMenuItems = () => unreachable('shared-140 vd (chat row menu items)');
export const useSessionsRowContextMenu = () => unreachable('shared-140 Za (row context menu)');
export const desktopRerouteTarget = () => unreachable('c4acc1503 m (open remote chat in browser)');
export const useSessionsGroupOverlayEnabled = () => unreachable('shared-140 Qf (custom group move)');
export function SessionsCustomGroupMenu() {
  return unreachable('shared-20 uD (custom group menu)');
}
export function SessionsNewGroupDialog() {
  return unreachable('shared-20 sD (new group dialog)');
}
