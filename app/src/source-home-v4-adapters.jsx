// Host services of the 4.16336.0 Chat greeting / Cowork home graph (scripts/extract-home-v4.mjs ->
// src/generated/home-chat-cowork). Every export answers one original declaration the generator pins by feature strings
// (its `adapters` / `localAdapters` tables), so a reshaped original stops generation. The answers are the host adapter
// contract recorded in analysis/claude-4.16336.0-migrate-20261104/surfaces-prod/home-chat-cowork/report.json (evolved
// from the surface pilot's staging adapter and the 3.6556.2 cowork-home / chat-home adapters).
//
// Host facts (unchanged from 3.6556.2, D17/D29/D31/E49/E53/E59): no claude.ai account (a local profile stands in where the
// home only asks "is someone signed in"), no GrowthBook client (the one host table answers, src/host-growthbook.mjs), no
// plugin marketplace / setup cards, no browser extension or remote devices, no telemetry; local Cowork sessions and local
// scheduled tasks only. The data comes from the host through HomeHost (src/source-cowork-home.jsx / source-chat-home.jsx);
// nothing here fabricates an official cloud task or event schema.
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { getLocale } from '../electron/i18n/index.mjs';
import { useHostIntl, HostFormattedMessage } from './cds-core-adapter.mjs';

// The preload helper's assetsURL (preload-helper a) and the GrowthBook value reader (shared-0 Uu): the host answers every
// generated area shares (integration-1 preload-helper; D29 / D31).
export { viteAssetUrl } from './view-tabs-asset-url.mjs';
export { hostGrowthBookFeature } from './cds-core-adapter.mjs';

const noop = () => {};
const EMPTY_LIST = Object.freeze([]);
const EMPTY_SET = new Set();
const EMPTY_MAP = new Map();

// The one host value both surfaces read.
//   rows            local Cowork sessions in the official row shape (sessionId, title, isRunning, isStarred, lastActivityAt,
//                   createdAt, error, liveStatus), cowork-home-model.mjs coworkHomeState
//   readState       the official { initializedAt, sessions, explicitUnread } map over the host's unread metadata
//   permissions     sessionId -> pending approvals as the host holds them ({ id, method, params })
//   scheduledTasks  local routines in the official scheduled-task shape (id, displayName, enabled, cronExpression, nextRunAt;
//                   source-routine-adapters.jsx sourceRoutine)
//   ideas           the composer bridge a picked Idea writes into
//   greetings       the local personalized_greeting table (E53; empty: the official fallback text)
export const HomeHost = createContext({
  surface: 'cowork', rows: EMPTY_LIST, readState: null, ready: true, permissions: EMPTY_MAP,
  scheduledTasks: EMPTY_LIST, sidebarCollapsed: false, ideas: null, greetings: EMPTY_LIST, navigate: noop,
});
const useHome = () => useContext(HomeHost);

// Read-state requests of the generated rows (shared-2 KH Clear active, RH open / Mark as read, WH Mark as unread) are plain
// functions, not hooks: they reach the host's read-state owner (main.jsx updateSessionMetadata { unread }, the same action
// the sidebar's "mark-read" / "mark-unread" run) as window events src/source-cowork-home.jsx forwards.
export const HOME_CLEAR_EVENT = 'local-cowork:clear-active';
export const HOME_MARK_READ_EVENT = 'local-cowork:mark-read';
export const HOME_MARK_UNREAD_EVENT = 'local-cowork:mark-unread';
const dispatch = (type, sessionId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(sessionId === undefined ? new Event(type) : new CustomEvent(type, { detail: { sessionId } }));
};

// ---- intl (vendor-intl p / l / a) ------------------------------------------------------------------------------------
// react-intl useIntl / FormattedMessage over the host catalog: the official createIntl with each English defaultMessage
// looked up by electron/i18n t() (cds-core-adapter.mjs, the contract every 4.16336.0 area shares).
export const useIntl = useHostIntl;
export const FormattedMessage = HostFormattedMessage;
// vendor-intl a (FormattedRelativeTime): with updateIntervalInSeconds it picks the unit from the value (react-intl
// selectUnit) and re-renders on that interval, in the host locale.
const UNITS = [['second', 60, 1], ['minute', 3600, 60], ['hour', 86400, 3600], ['day', Infinity, 86400]];
export function HomeRelativeTime({ value = 0, unit = 'second', numeric = 'auto', updateIntervalInSeconds, ...options }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!updateIntervalInSeconds) return undefined;
    const timer = setInterval(() => tick(n => n + 1), updateIntervalInSeconds * 1000);
    return () => clearInterval(timer);
  }, [updateIntervalInSeconds]);
  let shown = value, shownUnit = unit;
  if (updateIntervalInSeconds && unit === 'second') {
    const [name, , divisor] = UNITS.find(([, limit]) => Math.abs(value) < limit);
    shown = Math.round(value / divisor); shownUnit = name;
  }
  const { style, localeMatcher } = options;
  return new Intl.RelativeTimeFormat(getLocale(), { numeric, ...(style ? { style } : {}), ...(localeMatcher ? { localeMatcher } : {}) }).format(shown, shownUnit);
}

// ---- Chat greeting (shared-23 ix) ------------------------------------------------------------------------------------
// shared-25 kB: the claude.ai bootstrap query. Only the local greeting table (personalized_greeting shape); no `account`,
// so ix's account / display-name pre-paint resets never fire.
export function useChatGreetingBootstrap() {
  return { data: { personalized_greeting: useHome().greetings ?? EMPTY_LIST } };
}
// shared-25 BO: greeting entries a signed-in claude.ai account caches in localStorage; no account here -> null (BO's own
// `s === null` branch).
export const readCachedChatGreetings = () => null;
// shared-183 UH: page search params; the host route has no `?incognito` parameter (the host passes incognito itself).
const NO_PARAMS = new URLSearchParams();
export const useChatGreetingSearchParams = () => NO_PARAMS;
// shared-23 rx: the web build's pre-painted #static-composer-greeting-text; the desktop host has no static boot markup.
export const readStaticComposerGreeting = () => null;
// shared-92 zu: Datadog global context property; no telemetry.
export const setGreetingTelemetry = noop;
// shared-1 nx: the boot locale of a pre-painted greeting; only compared while one exists (never here).
export const chatBootLocale = getLocale();

// ---- Cowork home (shared-23 dw / QC) ---------------------------------------------------------------------------------
// shared-25 Z (CurrentAccountProvider value): a local profile, never an Anthropic account (ZC keys its list by the uuids).
const LOCAL_ACCOUNT = Object.freeze({ account: Object.freeze({ uuid: 'local-profile' }), activeOrganization: Object.freeze({ uuid: 'local-profile' }), isLoading: false });
export const useHomeAccount = () => LOCAL_ACCOUNT;
// shared-5 tA: the new-page target; the host page is one surface at a time.
export function useHomeSurface() {
  const { surface } = useHome();
  return { target: { kind: surface ?? 'cowork' }, surfaces: { cowork: true, chat: true } };
}
// shared-4 ij / _j / vj: no landing intent (opensOnChatSurface) in the host.
export const useHomeLandingIntent = () => null;
export const useHomeLandingActive = () => false;
export const useHomeLandingSkipsPlugins = () => false;
// shared-1 MP: the home reads incognitoModeEnabled only (Cowork has no incognito).
const NO_INCOGNITO = Object.freeze({ incognitoModeEnabled: false, temporaryConversationUuid: undefined, setTemporaryConversationUuid: noop });
export const useHomeIncognito = () => NO_INCOGNITO;
export const useHomePluginsInChat = () => false; // shared-153 nD: claude_ai_plugins_in_chat, default off
export const useIsClaudeDesktopApp = () => true; // shared-0 FH: the host is the desktop app
export const useHomeMarlinDesign = () => false; // shared-123 s_: voyage composer "marlin", default classic
export const useHomeRemoteCoworkSession = () => false; // shared-33 Fj
export const subscribeHomeSessionEvents = noop; // shared-123 _x: the bridge session feed; the host feeds `rows` instead
export const useHomeReadStateSync = noop; // shared-2 IH: account-scoped read-state persistence; the host owns read state
export const useHomeSessions = () => useHome().rows ?? EMPTY_LIST; // shared-2 hK
export const useHomeReadState = () => useHome().readState; // shared-2 QH
export const useHomeTasksReady = () => useHome().ready !== false; // shared-23 qC (waits for the list and its read state)
export const useHomePinsEnabled = () => true; // shared-123 _L: local sessions can be pinned
export const useHomeSidebarCollapsed = () => !!useHome().sidebarCollapsed; // shared-92 FS
export const pendingHomeCreation = () => null; // shared-4 fC: no optimistic "creating" marks (local ids are real)
export const clearHomeActive = () => dispatch(HOME_CLEAR_EVENT); // shared-2 KH
export const markHomeSessionRead = sessionId => dispatch(HOME_MARK_READ_EVENT, sessionId); // shared-2 RH
export const markHomeSessionUnread = sessionId => dispatch(HOME_MARK_UNREAD_EVENT, sessionId); // shared-2 WH
const SCHEDULES_ON = Object.freeze({ loading: false, enabled: true, statusUnknown: false });
export const useHomeScheduleAccess = () => SCHEDULES_ON; // shared-123 By: local routines are always available
export function useHomeSchedules() { return { scheduledTasks: useHome().scheduledTasks ?? EMPTY_LIST }; } // shared-31 Up
export const useHomeUnifiedRoutines = () => false; // shared-140 Aa: claude_ai_unified_routines, default off -> "Scheduled"
// shared-25 Ky (RouterLink): an anchor whose plain click goes through the host navigator (`/cowork/<id>`,
// `/scheduled-task/<id>`); modified clicks and target _blank keep the browser default (the host's link policy).
export function HomeRouterLink({ href, replace, scroll, prefetch, onClick, target, ref, ...rest }) {
  const { navigate } = useHome();
  return createElement('a', { ...rest, ref, href, target, onClick: event => {
    onClick?.(event);
    if (event.defaultPrevented || target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    navigate?.(href, { replace });
  } });
}

// ---- approvals (shared-18 lI, shared-5 IW / jW / NW / lW) -------------------------------------------------------------
// The official predicates over the official request shape { toolUseId, toolName } and the pane verdicts: kW drops a
// request whose verdict is "consulting", AW (awaiting) is "some request remains", NW (only questions) is "every remaining
// one is PW: toolName === 'AskUserQuestion'". The host's pending approvals are app-server requests; the Codex user-input
// request (method item/tool/requestUserInput) is the AskUserQuestion equivalent, exactly the host's 3.6556.2 rule
// (source-cowork-home-v3-adapters.jsx /requestUserInput/). The host has no pane verdicts, so nothing is "consulting".
const ASK_USER_QUESTION = 'AskUserQuestion';
export function officialPendingRequest(item) {
  const method = typeof item?.method === 'string' ? item.method : '';
  return { toolUseId: item?.id ?? item?.params?.itemId ?? null, toolName: /requestUserInput/.test(method) ? ASK_USER_QUESTION : method };
}
const NO_VERDICTS = Object.freeze({});
const notConsulting = (request, verdicts = NO_VERDICTS) => verdicts[request.toolUseId]?.kind !== 'consulting'; // kW
const remaining = pending => pending.map(officialPendingRequest).filter(request => notConsulting(request));
export const sessionAwaiting = pending => remaining(pending ?? EMPTY_LIST).length > 0; // AW
export function sessionOnlyQuestions(pending) { // NW
  const left = remaining(pending ?? EMPTY_LIST);
  return left.length > 0 && left.every(request => request.toolName === ASK_USER_QUESTION);
}
const pendingFor = (home, sessionId) => home.permissions?.get(sessionId) ?? EMPTY_LIST;
export function useHomeAttentionIds() { // shared-5 IW: the sessions with a request that is not consulting
  const { permissions } = useHome();
  return useMemo(() => {
    const ids = permissions ? [...permissions.keys()].filter(id => sessionAwaiting(permissions.get(id))) : [];
    return ids.length ? new Set(ids) : EMPTY_SET;
  }, [permissions]);
}
export const useHomeSessionAwaiting = sessionId => sessionAwaiting(pendingFor(useHome(), sessionId)); // shared-5 jW
export const useHomeSessionOnlyQuestions = sessionId => sessionOnlyQuestions(pendingFor(useHome(), sessionId)); // shared-5 NW
export const useHomeSessionAutoAnswering = () => false; // shared-5 lW: no auto-answer runner
// shared-18 lI: { pending, needsUserAction, hasOnlyInputRequests, canShowReviewPopover }. The requests are answered in
// the session itself (the row opens it): the inline review popover (QS -> c75724292 InlineToolApproval) is not offered.
export function useHomePermissions(sessionId) {
  const pending = pendingFor(useHome(), sessionId);
  return { pending, needsUserAction: sessionAwaiting(pending), hasOnlyInputRequests: sessionOnlyQuestions(pending), canShowReviewPopover: false };
}
export const useHomeSessionPreviewActive = () => false; // shared-18 IM: bridge preview-tab activity, absent
export function useHomeEffectiveErrorCategory(category) { return { effectiveCategory: category, billingNotSelfManageable: false }; } // shared-7 zg
export const useGrowthBookFlagWhen = () => false; // shared-25 Mo: no GrowthBook client gates the home
const NO_TRACKER = Object.freeze({ track: noop });
export const useHomeTracker = () => NO_TRACKER; // shared-62 OT: analytics, none
export const UnavailableInlineReview = () => null; // shared-55 QS (only rendered when canShowReviewPopover)

// ---- setup / plugin card (shared-23 MC / EC, shared-153 AE, shared-33 RA, shared-212 bU, shared-26 wI, shared-140 Ta) --
// No plugin marketplace: the gate is off and no card can become due (dw then renders qx with shown false: nothing).
const NO_GATE = Object.freeze({ enabled: false, pending: false });
export const useHomeSetupCardGate = () => NO_GATE;
const NO_SETUP_CARDS = Object.freeze({ data: EMPTY_LIST, isLoading: false, serverStampSettled: false });
export const useHomeSetupCards = () => NO_SETUP_CARDS;
const NO_PLUGIN_SKILLS = Object.freeze({ pluginsEnabled: false, isScanBlocked: () => false, isAgentMode: false, isLocalAgentMode: false, chatExecutionAvailable: false });
export const useHomePluginSkillFilter = () => NO_PLUGIN_SKILLS;
const NO_DISMISSALS = Object.freeze({ isDismissed: () => false, dismiss: noop });
export const useHomeSetupCardDismissals = () => NO_DISMISSALS;
const NO_FOLDERS = Object.freeze({ selectedFolders: EMPTY_LIST, selectedFoldersTouched: false, pendingAutoSend: null });
export const useHomeFolderSelection = select => (select ? select(NO_FOLDERS) : NO_FOLDERS);
export const useHomeIdle = () => false;
export const PluginSetupCardEntry = Object.freeze({ Component: () => null, handle: Object.freeze({ id: 'plugin_setup_card', preload: noop, enqueueIdle: noop }), annotateOpen: noop });

// ---- lazy entries (shared-123 W$) ------------------------------------------------------------------------------------
// { Component, handle: { preload, enqueueIdle }, annotateOpen } over entry.load (the official `import("./<chunk>.js")`
// through the sliced preload helper) and pick. The home's entry (shared-23 sw) passes `loading:
// noFallback("placeholder-would-mislead")` and `onChunkError: "fail-open"`: W$ then renders nothing while the chunk loads
// (inline mode "none") and nothing when it fails ("fail-open": the page stays usable). `ssr: false`: nothing on the server.
export function defineLazyEntry({ entry, pick, options = {} }) {
  const choose = module => (pick === undefined ? (module?.default ?? module) : pick(module));
  const failOpen = options.onChunkError === 'fail-open';
  let module = null, failed = null, promise = null;
  const listeners = new Set();
  const load = () => (promise ??= Promise.resolve().then(() => entry.load()).then(
    loaded => { module = choose(loaded); },
    error => { failed = error ?? new Error(`${entry.id}: chunk failed`); if (!failOpen) promise = null; },
  ).finally(() => { for (const listener of listeners) listener(); }));
  function Component(props) {
    const [, rerender] = useState(0);
    useEffect(() => {
      if (module || (failed && failOpen)) return undefined;
      const listener = () => rerender(n => n + 1);
      listeners.add(listener);
      void load();
      return () => { listeners.delete(listener); };
    }, []);
    if (module) return createElement(module, props);
    if (failed && !failOpen) { const error = failed; failed = null; throw error; }
    return null;
  }
  const handle = Object.freeze({ id: entry.id, preload: () => void load(), enqueueIdle: () => void load() });
  return { Component, handle, annotateOpen: noop };
}

// ---- Ideas (ce266b9be Le) --------------------------------------------------------------------------------------------
export const useHomeChipsVariant = () => 'control'; // ce266 Ae: claudified_cowork_home_chips, default arm
export const useHomeBrowserIdeas = () => false; // ce266 Oe
export const useHomeBrowserDevices = () => false; // ce266 ke
export const useHomeRemoteDevicesAvailable = () => false; // shared-8 HN
export const useHomeBrowserPaired = () => false; // shared-123 ay
export const useHomeBrowserInitialized = () => true; // shared-123 w_
export const useHomeServerGates = () => true; // shared-123 PB: every gate answers its default from the first render
export const useDesktopHomeSupported = () => false; // shared-123 kv: no desktopHome policy grant (-> "Customize Cowork for me")
export const useHomeChalkSidebar = () => false; // shared-21 O_
export const useHomeChalkTeacher = () => false; // shared-183 WH
const NO_SKILL_NAMES = Object.freeze({ names: EMPTY_SET, isLoading: false });
export const useHomeSkillNames = () => NO_SKILL_NAMES; // shared-33 NM
const NO_SKILL_IDEAS = Object.freeze({ suggestions: EMPTY_LIST, isLoading: false });
export const useHomeSkillIdeas = () => NO_SKILL_IDEAS; // ce266 Pe
const NO_COMMANDS = Object.freeze({ data: EMPTY_LIST });
export const useHomeSupportedCommands = () => NO_COMMANDS; // shared-33 HM
const NO_AGENT_ANALYTICS = Object.freeze({ trackAgentModeEvent: noop });
export const useHomeAgentModeAnalytics = () => NO_AGENT_ANALYTICS; // cca63be39 n
export const useHomeIdeasTracker = () => noop; // shared-33 Jk
const NO_IDEAS = Object.freeze({ setPrompt: noop, focusInput: noop, pick: noop, promptInputRef: { current: null },
  setTipTapEditorJSON: noop, setPreviewPrompt: noop, setPreviewSurface: noop });
const useIdeas = () => useHome().ideas ?? NO_IDEAS;
export function useHomeIdeaTarget() { const { pick, focusInput } = useIdeas(); return { pick, focusInput }; } // shared-33 dF
export function useHomeIdeasPrompt() { return { setPrompt: useIdeas().setPrompt }; } // shared-212 kw
export function useHomeIdeasEditor(select) { return select(useIdeas()); } // shared-212 UC
