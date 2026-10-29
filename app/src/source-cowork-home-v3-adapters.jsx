// Local services for the 3.6556.2 Cowork / Chat home pieces scripts/extract-cowork-home.mjs emits into
// src/generated/cowork-home (w10-curchat-home-gen: shared-23 FS / xS / SS / My / rS / _b, ce266b9be Re, c2bf50d9e o).
// Each export replaces one original declaration, which the extractor feature-checks (see its `adapters` table). The host
// home (src/source-cowork-home.jsx, w10-curchat-home-host) provides CoworkHomeV3Context around the generated components;
// RouterLink navigation (task rows `/cowork/<id>`, scheduled rows `/scheduled-task/<id>`) goes through routines-shared's
// RoutinesSharedHost, whose adapter the generated row reuses.
//
// Host facts behind these answers (D17/D29/D31/E49): no claude.ai account (a local profile stands in where the official
// home only asks "is someone signed in"), no GrowthBook client (every gate and experiment answers its default), no
// plugin marketplace or setup cards, no browser extension or remote devices, no telemetry, local sessions and local
// scheduled tasks only.
import React, { Suspense, createContext, createElement, lazy, useContext, useEffect, useState } from 'react';
import { getLocale } from '../electron/i18n/index.mjs';

const noop = () => {};
const EMPTY_SET = new Set();
const EMPTY_MAP = new Map();
const EMPTY_LIST = Object.freeze([]);
// The host's home data. `rows` are local Cowork sessions in the official session shape (sessionId, title, isRunning,
// isStarred, lastActivityAt, createdAt, error, scheduledTaskId); `readState` the official { initializedAt, sessions,
// explicitUnread } map; `permissions` sessionId -> pending approvals; `scheduledTasks` the official scheduled task shape
// (id, displayName, enabled, cronExpression, nextRunAt); `ideas` the composer bridge the Ideas list writes into.
export const CoworkHomeV3Context = createContext({
  surface: 'cowork', rows: EMPTY_LIST, readState: null, ready: true, attentionIds: EMPTY_SET, permissions: EMPTY_MAP,
  scheduledTasks: EMPTY_LIST, sidebarCollapsed: false, ideas: null,
});
const useHome = () => useContext(CoworkHomeV3Context);
// The event the host's clear action listens for (same name as the 2.31226.0 home, src/source-home-adapters.jsx).
export const HOME_V3_CLEAR_EVENT = 'local-cowork:clear-active';

// shared-25 Z (the CurrentAccountProvider value). A local profile: the home only reads the uuids (xS keys its list by
// `${account.uuid}:${org.uuid}`, ce266b9be shows its Ideas when an organization is active, rS needs an org uuid for a
// due setup card, which never exists here). Never an Anthropic account or authorization response.
const LOCAL_ACCOUNT = Object.freeze({ account: Object.freeze({ uuid: 'local-profile' }), activeOrganization: Object.freeze({ uuid: 'local-profile' }), isLoading: false });
export function useHomeAccount() {
  return LOCAL_ACCOUNT;
}

// shared-3 iN / gR: the new-page target and its composer route. The host page is one surface at a time.
export function useHomeSurface() {
  const { surface } = useHome();
  return { target: { kind: surface ?? 'cowork' }, surfaces: { cowork: true, chat: true } };
}
export const useHomeComposerRoute = () => null;
// shared-3 k6 (sessions whose tool approvals wait for the user) and AK (an optimistic "creating" mark; local tasks
// publish real thread ids, so there is none).
export const useHomeAttentionIds = () => useHome().attentionIds ?? EMPTY_SET;
export const pendingHomeCreation = () => null;
// shared-2 hY / nK / XG: the session list, the read state, and Clear active (the host listens and marks them read).
export function useHomeSessions() {
  return useHome().rows ?? EMPTY_LIST;
}
export const useHomeReadState = () => useHome().readState;
export function clearHomeActive() {
  window.dispatchEvent(new Event(HOME_V3_CLEAR_EVENT));
}
// shared-2 Aw (incognito chat state), BG (the account read-state sync), ih (an idle-time preload signal).
const NO_INCOGNITO = Object.freeze({ incognitoModeEnabled: false, temporaryConversationUuid: undefined, setTemporaryConversationUuid: noop });
export const useHomeIncognito = () => NO_INCOGNITO;
export const useHomeReadStateSync = noop;
export const useHomeIdle = () => false;
// shared-23 _S: whether the list may render (the official waits for the session query and its read state).
export const useHomeTasksReady = () => useHome().ready !== false;
// shared-23 nS / shared-130 SO: the plugin setup card gate and its rows. No plugin marketplace here.
const NO_SETUP_CARD = Object.freeze({ enabled: false, pending: false });
export const useHomeSetupCardGate = () => NO_SETUP_CARD;
const NO_SETUP_CARDS = Object.freeze({ data: EMPTY_LIST, isLoading: false, serverStampSettled: false });
export const useHomeSetupCards = () => NO_SETUP_CARDS;
// shared-23 Xx: the lazily loaded plugin setup card body; only rendered for a due card, which never exists here.
export const PluginSetupCardEntry = Object.freeze({ Component: () => null, handle: Object.freeze({ preload: noop, enqueueIdle: noop }) });

// shared-23 jS: the chorus_cowork_suggestions entry (`Z({ entry, pick: e => e.ChorusCoworkSuggestions, options: { ssr: !1,
// loading: "placeholder-would-mislead" } })`). The same lazy split over the generated ce266b9be module: nothing renders
// while it loads (the official placeholder), and once loaded it renders synchronously.
let ideasModule = null;
let ideasPromise = null;
export function preloadHomeIdeas() {
  ideasPromise ??= import('./generated/cowork-home/ce266b9be-B5g-KDni.mjs').then((module) => (ideasModule = module));
  return ideasPromise;
}
const LazyIdeas = lazy(() => preloadHomeIdeas().then((module) => ({ default: module.Re })));
function ChorusCoworkSuggestions(props) {
  if (ideasModule) return createElement(ideasModule.Re, props);
  return createElement(Suspense, { fallback: null }, createElement(LazyIdeas, props));
}
export const ChorusCoworkSuggestionsEntry = Object.freeze({
  Component: ChorusCoworkSuggestions,
  handle: Object.freeze({ preload: () => void preloadHomeIdeas(), enqueueIdle: () => void preloadHomeIdeas() }),
});
// ce266b9be Pe: the Ideas catalog chunk (c2bf50d9e), generated next to it.
export async function loadHomeIdeasCatalog() {
  const module = await import('./generated/cowork-home/c2bf50d9e-TDPQZp_M.mjs');
  return { COWORK_HOME_IDEAS_CATALOG: module.o };
}

// shared-78 gK (pins on the home list): local sessions can be pinned. shared-52 u_ (the sidebar is collapsed, so the home
// also lists pinned tasks): the host tells.
export const useHomePinsEnabled = () => true;
export const useHomeSidebarCollapsed = () => !!useHome().sidebarCollapsed;
// shared-52 eM: the session event subscription that feeds the official store; the host feeds `rows` instead.
export const subscribeHomeSessionEvents = noop;
// shared-78 yE / shared-4 r_: scheduled tasks (local ones, src/use-local-routines.jsx).
const SCHEDULES_ON = Object.freeze({ loading: false, enabled: true, statusUnknown: false });
export const useHomeScheduleAccess = () => SCHEDULES_ON;
export function useHomeSchedules() {
  return { scheduledTasks: useHome().scheduledTasks ?? EMPTY_LIST };
}
// GrowthBook / bridge gates the home reads, each as the official desktop answers it without those services (D29/D31/E49;
// w13-coworkui-home-gates checked each against the 3.6556.2 source, tests/w13-cowork-home-gates.test.mjs):
// - shared-78 hT (desktop home "supported"): false. The main process answers `desktopHome: RMe(K()) === void 0 ?
//   { status: "unavailable" } : RU` (asar index.chunk-jPKPzV-P.js); RMe is the surface grant of an admin's desktopHome
//   policy (sTe gives none for an unset value), so a desktop without that 3p/self-hosted policy sees "unavailable".
// - shared-78 QJ (server gates): true. `e && e.length > 0 ? !0 : t` with t the GrowthBook store's isLoaded: once the
//   gates are in it is true; here every gate answers its default from the first render, i.e. they are loaded.
// - shared-78 GT (Cowork browser paired): false. It is `WT() && PC()`, WT needing appFeatures.coworkBrowser
//   "supported", which the main process gives only for GrowthBook gate 3990395613 (`dP(){return cP()?Pb("3990395613"):!1}`).
// - shared-78 FC (the coworkBrowserToolsEnabled preference initialized): true. MC initializes it on first read without a
//   bridge preference store (`e._setInitialized()`) and after the bridge answers with one.
// - shared-130 JO (plugins in chat), shared-5 kw (a remote Cowork session), shared-21 yT (proj-chalk-sidebar),
//   shared-156 pU (chalk_teacher), ce266b9be Oe (browser ideas: chrome_ext_mcp_integration plus the account's
//   claude_browser_extension feature), ke (the account's remote devices): off at their defaults. Ae (the
//   claudified_cowork_home_chips experiment) answers its default arm "control", under which the Ideas list ignores
//   browserAvailable (`h = p ? a : s !== "control"`), so GT / FC / Oe / ke change nothing visible.
export const useDesktopHomeSupported = () => false;
export const useHomeServerGates = () => true;
export const useHomeBrowserPaired = () => false;
export const useHomeBrowserInitialized = () => true;
export const useHomePluginsInChat = () => false;
export const useHomeRemoteCoworkSession = () => false;
export const useHomeChalkSidebar = () => false;
export const useHomeChalkTeacher = () => false;
export const useHomeBrowserIdeas = () => false;
export const useHomeBrowserDevices = () => false;
export const useHomeChipsVariant = () => 'control';
// shared-5 sw (plugin skill filter for the chat setup card), BT (the bridge's supported slash commands), jT (installed
// skill names; "Customize Cowork for me" then prompts the official fallback command), ce266b9be Fe (plugin skill ideas).
const NO_PLUGIN_SKILLS = Object.freeze({ pluginsEnabled: false, isScanBlocked: () => false });
export const useHomePluginSkillFilter = () => NO_PLUGIN_SKILLS;
const NO_COMMANDS = Object.freeze({ data: EMPTY_LIST });
export const useHomeSupportedCommands = () => NO_COMMANDS;
const NO_SKILL_NAMES = Object.freeze({ names: EMPTY_SET, isLoading: false });
export const useHomeSkillNames = () => NO_SKILL_NAMES;
const NO_SKILL_IDEAS = Object.freeze({ suggestions: EMPTY_LIST, isLoading: false });
export const useHomeSkillIdeas = () => NO_SKILL_IDEAS;
// shared-5 uA / shared-182 dx / Db: where a picked idea goes (the host composer). shared-5 _C / cca63be39 n: telemetry.
const NO_IDEAS = Object.freeze({ setPrompt: noop, focusInput: noop, pick: noop, promptInputRef: { current: null },
  setTipTapEditorJSON: noop, setPreviewPrompt: noop, setPreviewSurface: noop });
const useIdeas = () => useHome().ideas ?? NO_IDEAS;
export function useHomeIdeaTarget() {
  const { pick, focusInput } = useIdeas();
  return { pick, focusInput };
}
export function useHomeIdeasPrompt() {
  return { setPrompt: useIdeas().setPrompt };
}
export function useHomeIdeasEditor(select) {
  return select(useIdeas());
}
export const useHomeIdeasTracker = () => noop;
const NO_AGENT_ANALYTICS = Object.freeze({ trackAgentModeEvent: noop });
export const useHomeAgentModeAnalytics = () => NO_AGENT_ANALYTICS;

// shared-18 _j: a session's pending tool approvals. They are answered in the session itself (the row opens it), so the
// inline review popover (shared-46 qb, InlineToolApproval) is never offered.
export function useHomePermissions(sessionId) {
  const pending = useHome().permissions?.get(sessionId) ?? EMPTY_LIST;
  return { pending, needsUserAction: pending.length > 0,
    hasOnlyInputRequests: pending.length > 0 && pending.every((item) => /requestUserInput/.test(item.method ?? '')),
    canShowReviewPopover: false };
}
export const UnavailableInlineReview = () => null;

// vendor-intl en (react-intl FormattedRelativeTime). With updateIntervalInSeconds it picks the unit from the value
// (react-intl selectUnit) and re-renders on that interval.
const UNITS = [['second', 60], ['minute', 3600], ['hour', 86400], ['day', Infinity]];
export function HomeRelativeTime({ value = 0, unit = 'second', numeric = 'auto', updateIntervalInSeconds, ...options }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!updateIntervalInSeconds) return undefined;
    const timer = setInterval(() => tick((n) => n + 1), updateIntervalInSeconds * 1000);
    return () => clearInterval(timer);
  }, [updateIntervalInSeconds]);
  let shown = value, shownUnit = unit;
  if (updateIntervalInSeconds && unit === 'second') {
    const abs = Math.abs(value);
    const index = UNITS.findIndex(([, limit]) => abs < limit);
    const divisor = [1, 60, 3600, 86400][index];
    shown = Math.round(value / divisor);
    shownUnit = UNITS[index][0];
  }
  return new Intl.RelativeTimeFormat(getLocale(), { numeric, ...options }).format(shown, shownUnit);
}

