// Host side of the generated Sessions page shell (src/generated/sessions-page, extract-sessions-page.mjs; 3.6556.2
// cbd6c85c8 Hf). Every export stands in for one original binding (named in the generator's `adapters` table and in
// the manifest's imports). The data hooks read SessionsPageHfHost; its defaults are what Hf computes on the Code page
// (codeScoped: surfaces code / archived, no chat / recents / cowork queries, je = false). GrowthBook-style switches are
// closed (R15/E49). Pieces Hf only reaches for chat, task or project rows throw if a future change reaches them, so a
// divergence shows up instead of rendering a substitute.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { registerSessionsPageReset } from './sessions-page-search-state.mjs';

function unreachable(name) {
  throw Error(`${name} is not reachable on the Code Sessions page (codeScoped: no chat, task or project rows)`);
}
const noop = () => {};
const resolved = () => Promise.resolve();
const EMPTY = Object.freeze([]);
const EMPTY_SET = Object.freeze(new Set());

// The host value. `list` overrides fields of the shared-11 GC result (sessions, isCodeLoading, …); `router` is
// { push(href, options), replace(href, options) }; `search` / `pathname` the current route; `historyKey` the history
// entry key (TanStack __TSR_key) the remembered search is stored under; `getRowHref(ref)` the row link;
// `rowActions` the shared row actions (cc18d27d7 M: archive / unarchive / delete / rename …); `errors` the toasts.
export const SessionsPageHfHost = createContext({
  list: {}, router: null, search: '', pathname: '', historyKey: null, orgUuid: 'local',
  getRowHref: null, rowActions: null, errors: null, loadArchivedSessions: null, linkComponent: null,
});
// shared-8 __ is a plain module function (Hf calls it from an effect), so the adapter needs the host of the mounted
// page. The host is registered from a layout effect of the page (useSessionsPageList, called once by Hf), never
// written during render: a discarded render cannot leave a stale host, and with more than one page mounted the most
// recently committed one answers. Layout effects run before Hf's passive effect that calls loadArchivedSessions.
const mountedHosts = [];
function useHost() {
  return useContext(SessionsPageHfHost);
}

// ---------------------------------------------------------------- intl (vendor-intl l / p, as code-current)
export const SessionsMessage = StartMessage;
export const useSessionsIntl = useStartIntl;

// ---------------------------------------------------------------- shared-11 GC: the merged sessions list
// GC(query, coworkEnabled) merges the chat, cowork and code lists. On the Code page only the code list exists: the
// host's rows (already in the Hf row shape {ref, source, title, updatedAtMs, …}), its loading state and paging.
const LIST_DEFAULTS = Object.freeze({
  sessions: EMPTY, isInitialLoading: false,
  isChatLoading: false, isChatFirstPagePending: false, isChatLoadError: false, hasChatLoadFailed: false, retryChatList: noop,
  isCoworkLoadError: false,
  isCodeLoading: false, isCodeLoadError: false, isCodePlaceholderData: false,
  chatHasMore: false, isChatFetchingMore: false, isChatFetchMoreError: false,
  isConversationSearchAvailable: false, isCoworkSearchPending: false, isChatSearchPlaceholderData: false, searchServed: false,
  fetchMoreChats: noop, chatOldestLoadedMs: undefined,
  codeHasMore: false, isCodeFetchingMore: false, isCodeFetchMoreError: false, fetchMoreCode: noop, codeOldestLoadedMs: undefined,
  trimCodePages: noop, getCodePageCount: () => 1,
});
export function useSessionsPageList() {
  const host = useHost();
  useLayoutEffect(() => {
    const entry = { host };
    mountedHosts.push(entry);
    return () => { const at = mountedHosts.indexOf(entry); if (at >= 0) mountedHosts.splice(at, 1); };
  }, [host]);
  const { list } = host;
  return useMemo(() => ({ ...LIST_DEFAULTS, ...list }), [list]);
}
// shared-8 __: ask the local engine for its archived sessions (Hf calls it when the Archived tab opens).
export function loadArchivedSessions() {
  mountedHosts.at(-1)?.host.loadArchivedSessions?.();
}

// ---------------------------------------------------------------- router (shared-25 nf / Zd / Jd, shared-11 id)
const NO_ROUTER = Object.freeze({ push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop });
export function useSessionsSearchParams() {
  const { search } = useHost();
  return useMemo(() => new URLSearchParams(search ?? ''), [search]);
}
export function useSessionsPathname() {
  return useHost().pathname ?? '';
}
export function useSessionsRouter() {
  return useHost().router ?? NO_ROUTER;
}
export function useSessionsNavigate() {
  const router = useSessionsRouter();
  return useMemo(() => ({ push: href => router.push(href), replace: href => router.replace(href) }), [router]);
}
// shared-8 XC: the history entry key the remembered query is stored under.
export function useSessionsHistoryKey() {
  return useHost().historyKey ?? null;
}
// shared-25 Cx: the router link. The host link (codeRowLinkComponent) takes Code rows; this is the fallback.
export function SessionsRouterLink({ href, replace, scroll, prefetch, ref, ...rest }) {
  const Link = useHost().linkComponent;
  if (Link) return <Link ref={ref} href={href} {...rest} />;
  return <a ref={ref} href={href} {...rest} />;
}
// shared-16 al: the row href builder (code rows -> the host's session href).
export function useSessionsRowHref() {
  const { getRowHref } = useHost();
  return useMemo(() => (ref) => (getRowHref ? getRowHref(ref) : `#${ref.id}`), [getRowHref]);
}
// shared-156 _m: navigation performance marks (no telemetry, D17).
export const markNavigation = noop;

// ---------------------------------------------------------------- account, errors, query client
export function useSessionsAccount() {
  const { orgUuid } = useHost();
  return useMemo(() => ({ account: { uuid: orgUuid ?? 'local' }, activeOrganization: { uuid: orgUuid ?? 'local' } }), [orgUuid]);
}
const NO_ERRORS = Object.freeze({ addError: noop, addApiError: noop, addSuccess: noop, addInfo: noop, addWarning: noop, addDanger: noop, clearToast: noop });
export function useSessionsErrors() {
  return useHost().errors ?? NO_ERRORS;
}
const NO_QUERY_CACHE = Object.freeze({ findAll: () => EMPTY, subscribe: () => noop, find: () => undefined });
const QUERY_CLIENT = Object.freeze({
  getQueryCache: () => NO_QUERY_CACHE, getQueriesData: () => EMPTY, getQueryData: () => undefined, setQueryData: noop,
  setQueriesData: noop, invalidateQueries: resolved, cancelQueries: resolved, refetchQueries: resolved, removeQueries: noop,
  isFetching: () => 0, isMutating: () => 0,
});
export function useSessionsQueryClient() {
  return QUERY_CLIENT;
}
// vendor-query st (useInfiniteQuery): the served recents search, never enabled on the Code page.
const IDLE_QUERY = Object.freeze({
  data: undefined, error: null, status: 'pending', fetchStatus: 'idle', isPending: true, isLoading: false, isFetching: false,
  isError: false, isSuccess: false, isPlaceholderData: false, hasNextPage: false, isFetchingNextPage: false,
  isFetchNextPageError: false, fetchNextPage: resolved, refetch: resolved,
});
export function useSessionsInfiniteQuery() {
  return IDLE_QUERY;
}
// shared-78 w0: whether a query key is fetching (the chat list): nothing fetches here.
export const useQueryKeyFetching = () => false;
// shared-26 OA / DA: invalidate / patch the recents queries (none).
export const invalidateRecents = noop;
export const patchRecents = resolved;
// shared-130 Oh: the chat list query key (only read for chats).
export const chatListQueryKey = (orgUuid, { limit, starred, archived, searchQuery }) => ['chat_conversations', { orgUuid }, 'infinite', { limit, starred, archived, searchQuery }];

// ---------------------------------------------------------------- switches (R15: closed) and modes
export const useChatsPageSwitch = () => false; // shared-26 Vk (dramatic_shrimp)
export const useHubEligible = () => false; // shared-2 pG
export const useSessionsDesktopSwitch = value => !!value; // shared-0 fZ: the desktop store switch is off
export const useSessionsDesktopBridge = () => false; // shared-11 KE
export const useSessionsPageVariant = () => 'code'; // shared-26 qk: neither "chats" nor "tasks"
export const useLiveMode = () => 'code'; // shared-78 qY
export const useIdleReady = () => false; // shared-2 ih
export const useChatsViewCount = noop; // shared-2 aJ
export const useWindowFocused = () => true; // shared-182 NB
// shared-3 Ky: true once `value` has stayed true for `delay` ms.
export function useDelayedFlag(value, delay) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!value) { setLate(false); return undefined; }
    const id = setTimeout(() => setLate(true), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return late;
}

// ---------------------------------------------------------------- telemetry (none, D17)
// shared-52 Xi (exported `Jx`): register a reset callback for sign-out / session expiry (cbd6c85c8
// `J(() => Tf.clear())` empties the remembered searches). The host runs them from clearSessionsPageSearches when the
// engine or the signed-in account changes.
export const registerSessionsReset = registerSessionsPageReset;
export const markPageLoad = noop; // shared-2 OX ("chats_load" / "recents_load" / …)
export const trackConversationSearch = noop; // shared-52 ZN
export const trackConversationSearchHandoff = noop; // shared-52 QN
export const sessionsObservability = new Proxy({}, { get: () => noop }); // shared-0 B (O11Y_INTERNALS)
export const useBulkDeleteTracker = () => noop; // shared-11 vE

// ---------------------------------------------------------------- row actions and selection
const NO_ROW_ACTIONS = Object.freeze({
  cloudReadOnly: false, readOnlyDeleteOffered: false, localReadOnly: false, canSetProject: false,
  archive: noop, unarchive: noop, delete: noop, rename: noop, setStarred: noop, setProject: noop,
});
// cc18d27d7 M: the shared row actions, from the host when it has them.
export function useSessionsRowActions({ byHref, enterSelectionMode } = {}) {
  const { rowActions } = useHost();
  return useMemo(() => ({ ...NO_ROW_ACTIONS, ...rowActions, byHref, enterSelectionMode }), [rowActions, byHref, enterSelectionMode]);
}
export const isRowReadOnly = () => false; // cc18d27d7 j
export const closeRowPanes = noop; // cc18d27d7 N
export const isRowPinnable = () => false; // shared-20 jA
export const isHiddenCoworkRow = () => false; // shared-11 hw: only cowork rows can be hidden
export const isLocalCoworkUnarchivable = () => false; // shared-2 _X
export const userFacingLoadError = ({ error }) => error; // shared-11 _E
// shared-18 qC: the "selection active" providers around the table; nothing below reads them on the Code page.
export function SessionsSelectionProviders({ children }) {
  return children;
}

// ---------------------------------------------------------------- chat / task / project pieces (not on the Code page)
export const useChatMutation = () => resolved; // shared-11 UE
export const useUpdateChat = () => ({ mutate: noop, mutateAsync: resolved }); // shared-130 Qv
export const useTrimChatPages = () => noop; // shared-130 Bh
export const useChatProjects = () => ({ data: undefined }); // shared-130 Dg
export const useChatArtifacts = () => ({ data: undefined }); // shared-130 $$
export const useChatPendingDelete = () => false; // shared-130 Qc
export const useStarredChats = () => EMPTY_SET; // shared-2 nk
export const usePendingChats = () => EMPTY; // shared-11 uC
export const useDeleteChatsToast = () => noop; // shared-16 Bp
export const findCachedChat = () => undefined; // shared-2 D2
export const countDeletedChats = () => ({ deleted: 0, unknown: 0 }); // shared-26 aE
export const applyChatBulk = async () => EMPTY; // shared-11 WE
export const useCustomGroupAssign = () => noop; // shared-52 $_
export const useCustomGroupAssignment = () => undefined; // shared-52 dv
export const useCustomGroupKeyOf = () => undefined; // shared-11 op
export class ServedSearchChatDegraded extends Error { // shared-26 CA
  constructor() { super('served recents search: chat source degraded'); this.name = 'ServedSearchChatDegraded'; }
}
// shared-104 co: the lazy chunk registry; the only chunk here (served recents search) is not part of OpenClaude and
// its load is generated as the official failure branch.
export function defineSessionsLazyChunk(init) {
  return { id: init.id, lastOutcome: 'failed', preload: noop, warm: resolved, recoveryHost: () => ({ lastFailure: () => undefined }) };
}
export const codeSearchRow = () => unreachable('shared-11 xC (served search code row)');
export const coworkSearchRow = () => unreachable('shared-11 fC (cowork search row)');
export const moveRowsToGroup = () => unreachable('cd540469d d (move to group)');
export const moveRowsToNewGroup = () => unreachable('cd540469d f (move to new group)');
export function SessionsCoworkRow() {
  return unreachable('cc18d27d7 L (cowork row)');
}
export function SessionsChatRowMenu() {
  return unreachable('shared-16 Lf (chat row menu)');
}
