// Local services for the original 3.6556.2 proposal group card that scripts/extract-proposal-group.mjs emits
// (src/generated/proposal-group, R4f-proposal P1, tasks-proposal-group-card WI-1). Each export replaces one import (or
// one same-chunk declaration) of the original; the extractor checks the declaration it stands for against `features`.
// Nothing here imports src/generated/proposal-group: the generated modules import this file, never the reverse.
//
// The card reads the host through two contexts, both provided around the transcript by the wiring step (P5):
//   - ProposalSpawnerContext (generated c96d752d0 IZ; 2.42304.0 qQ): the spawner shaped like cf74bc599 ZS (2.42304.0
//     c96d752d0 F1e), src/proposal-spawner.mjs getSnapshot();
//   - ProposalHost (below, provided through ProposalHostProvider):
//       sessions            the session store's `sessions[]` the card selects from (src/proposal-group-model.mjs
//                           proposalSessions: sessionId, title, isArchived, spawnedFrom, model, effort, permissionMode,
//                           backgroundTaskSuggestions, …). A started child's row (dZ → shared-46 YI / JI) also reads
//                           isRunning, starting, error, neverStarted, awaitingBrief and taskSummary when the host has them.
//       needsInput          ids of the sessions waiting on the user (shared-11 V_), an array or a Set.
//       catalog             {models: [{id, name, efforts: [{id, recommended?}]}]}: the kernel's model/list, efforts are the
//                           kernel's own reasoning levels (no mapping to the official five; R4f-proposal P1 host difference).
//       permissionModes     {auto}: whether the kernel offers auto mode (shared-8 vK's "available").
//       capabilities        {picks, worktreePick}: shared-78 Pw / Fw (sideSessionProposalPicks / WorktreePick), default
//                           on; offerCloudStart (Iw) is off (no cloud here).
//       openSession(id, {title, event})   dZ's opener (c26fb8b6b xn): navigate to the started session.
//       renderToolFallback(tool)          iL: the host tool row for a proposing call that cannot be a card row (the
//                           official-shaped record of proposal-group-model.mjs proposalToolRecord, `tool.id` = item id).
//       renderMarkdown(text)              the prompt preview popover body (c19e90103 Ux, the epitaxy Markdown).
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo } from "react";
import { CdsDropdown } from "./generated/view-tabs/index.js";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { useSourceToasts } from "./source-toast.jsx";

const EMPTY = Object.freeze([]);
const noop = () => {};

export const ProposalHost = createContext(null);

// shared-8 og (exported Df): the session store (`sessions: []`, name "ccd-sessions-filter"). As a hook,
// `useSessionsStore(selector)` selects from the provided host's sessions (the card wraps its selectors in shared-52 Wf,
// useShallow, as the original does); `getState()` (c96d752d0 VX, read by GX when a start finishes) answers the sessions
// of the last committed ProposalHostProvider.
let committedSessions = EMPTY;
const storeStates = new WeakMap();
const storeState = (sessions) => {
  let state = storeStates.get(sessions);
  if (!state) storeStates.set(sessions, (state = Object.freeze({ sessions })));
  return state;
};
export function ProposalHostProvider({ value, children }) {
  const sessions = Array.isArray(value?.sessions) ? value.sessions : EMPTY;
  useLayoutEffect(() => {
    committedSessions = sessions;
    return () => { if (committedSessions === sessions) committedSessions = EMPTY; };
  }, [sessions]);
  return <ProposalHost.Provider value={value}>{children}</ProposalHost.Provider>;
}
const hostSessions = (host) => (Array.isArray(host?.sessions) ? host.sessions : EMPTY);
export function useSessionsStore(selector) {
  return selector(storeState(hostSessions(useContext(ProposalHost))));
}
useSessionsStore.getState = () => storeState(committedSessions);

// shared-8 mg (exported Zd): merge fields into a session of the store. GX uses it to move a started task to the end of
// the parent's backgroundTaskSuggestions while others are still spawning. The host queue is derived from the
// transcript (proposal-group-model.mjs backgroundTaskSuggestions), so there is no stored order to move: a no-op.
export function updateSession() {}

// shared-11 V_ (exported ar): the set of sessions waiting on the user (pending permission requests). The host's
// pending approvals, by session id.
export function useSessionsNeedingInput() {
  const needsInput = useContext(ProposalHost)?.needsInput;
  return useMemo(() => (needsInput instanceof Set ? needsInput : new Set(Array.isArray(needsInput) ? needsInput : EMPTY)), [needsInput]);
}

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-52 cB (exported ha): the ErrorsProvider. gQ calls addInfo(message, {uniqueKey: "start-all-left-out"}); here the
// host toast, the uniqueKey as its key (a live toast with that key is replaced in place, as the original's is).
export function useErrors() {
  const toasts = useSourceToasts();
  return useMemo(() => ({
    addInfo: (message, options) => { toasts?.add?.(message, { variant: "neutral", ...(options?.uniqueKey ? { key: options.uniqueKey } : {}) }); },
    addError: (message, options) => { toasts?.add?.(message, { variant: "danger", ...(options?.uniqueKey ? { key: options.uniqueKey } : {}) }); },
  }), [toasts]);
}

// shared-52 Qh (exported Ph): the guarded localStorage the sent_here outcomes persist in
// ("epitaxy-suggested-task-sent-here-v1"). The host keeps those outcomes in its own config (electron/task-proposals.cjs,
// R4f-proposal P4) and seeds the outcome store from it, so the store gets a storage that lives for this window only instead of
// a second, per-origin persistence.
const sentHere = new Map();
export const sentHereStorage = Object.freeze({
  getItem: (key) => (sentHere.has(key) ? sentHere.get(key) : null),
  setItem: (key, value) => { sentHere.set(key, String(value)); },
  removeItem: (key) => { sentHere.delete(key); },
});

// shared-78 Pw / Fw / Iw (exported Ly / Ry / Iy): the desktop's appFeatures for side-session proposal picks. The host
// applies model, effort, permission mode and worktree to a start (proposal-launch.mjs), so picks and the worktree pick
// are supported; there is no cloud, so the offer's cloud start is not.
export function useProposalPicks() {
  return useContext(ProposalHost)?.capabilities?.picks !== false;
}
export function useProposalWorktreePick() {
  return useContext(ProposalHost)?.capabilities?.worktreePick !== false;
}
export function useOfferCloudStart() {
  return false;
}

// c68c4283d Tf / wf / Ef and shared-1 DE: the claudeai.code.side_session.proposal_card_* events and the "once while
// shown" exposure hook that sends the impression. This host sends no telemetry (D17).
export function logProposalStart() {}
export function logProposalImpression() {}
export function logProposalDismiss() {}
export function useExposureOnce() {}

// c26fb8b6b xn (exported o): open a session from the started task's row (cmd-click popout / alt-click pane / push).
// Here the host's navigation to that session.
export function useOpenSession() {
  const openSession = useContext(ProposalHost)?.openSession;
  return useCallback((event, session) => { if (session?.id) openSession?.(session.id, { title: session.title, event }); }, [openSession]);
}

// c856385e2 $t (exported at): `use(Zt)`, the side-session opener a split view provides (null without one). No such
// provider here.
export function useSideSessionOpener() {
  return null;
}

// cb8c5a88f or (exported I; 2.42304.0 cbb72cde9 Rn): the session's status chip (working / needs input / unread signals of
// the session list). The host has no chip model for a child session; dZ then shows the row state alone.
export function useSessionChip() {
  return undefined;
}

// shared-18 nj (exported ns): the session's pull request state. The host has no PR tracking for sessions: "none".
const NO_PR = Object.freeze({ prState: "none", prUrl: undefined, prNumbers: EMPTY, allBranches: EMPTY,
  aggregated: Object.freeze({ hasPr: false, displayPrs: EMPTY, prs: EMPTY }) });
export function useSessionPrState() {
  return NO_PR;
}

// shared-20 eD / bD (exported Pt / Ht): the PR chip and the cloud environment chip of the row. Neither is reachable
// here (no PR state, no cloud sessions).
export function SessionPrChip() {
  return null;
}
export function SessionEnvChip() {
  return null;
}

// shared-14 Ft (exported H): the error copy of a session error category (title, body, which recoveries help). The
// host's sessions carry no error categories; an unknown category is what the original answers for one it does not know.
const UNKNOWN_ERROR = Object.freeze({ title: undefined, isKnownCategory: false });
export function errorCopy() {
  return UNKNOWN_ERROR;
}

// shared-78 cD (exported X_) and shared-25 up (exported Kf): the session's route href and the hover / press route
// preload handlers built from it. Host sessions have no routes; with no href the original returns its inert handler
// set (`lp`), which is what this answers.
const NO_HREF = () => null;
export function useSessionHref() {
  return NO_HREF;
}
const NO_PRELOAD = Object.freeze({ onPointerEnter: noop, onPointerLeave: noop, onPointerDown: noop, onFocus: noop, onBlur: noop });
export function routePreloadProps() {
  return NO_PRELOAD;
}

// shared-25 Wi (exported qg): the desktop's AppPreferences (kQe's "Don't ask again" writes ccNewTaskPrompt). Only an
// offer (start_session, D29: off here) shows that menu.
export const appPreferences = undefined;

// ccbc7e432 j / c2f6611a3 $t (2.42304.0 ccae33cda Dt): the offer card's keyboard chords (⌘↩ / Esc) and their
// own-composer test. Enabled only for an offer (`enabled`: zZ), which spawn_task never is.
export function useOfferChords() {}
export function isOwnComposer() {
  return false;
}

// shared-25 Jd (exported yp), shared-156 Qm (exported Ng), shared-frame co (exported zd): the router, the settings page
// store and "the layer is in another window" that the offer's "Settings" item reads. Not reachable (offers are off,
// D29); the router and the store do nothing.
const NO_ROUTER = Object.freeze({ push: noop, replace: noop, back: noop, forward: noop });
export const useAppRouter = () => NO_ROUTER;
const NO_SETTINGS = Object.freeze({ mounted: false, open: noop });
export const settingsPageStore = Object.freeze({ getState: () => NO_SETTINGS, setState: noop });
export function useLayerInOtherWindow() {
  return false;
}

// shared-0 pC (exported dh): `globalThis["claude.web"]?.LocalSessions`, which VZe asks for popBackgroundTaskSuggestionById
// (the inline card needs a bridge that can pop a task by id). The host's queue is popped by its own spawner
// (proposal-launch.mjs createProposalBridge popById); this object only answers that the capability exists. The
// extracted card never calls it (cf74bc599 ZS, its only caller, is the host's proposal-spawner.mjs).
export const desktopBridge = Object.freeze({
  popBackgroundTaskSuggestionById() {
    return Promise.reject(Error("The host spawner pops proposals through proposal-launch.mjs createProposalBridge."));
  },
});

// shared-25 fs (exported Yh): GrowthBook features (c227f4d5e reads ccr_plan_mode_enabled, ccd_auto_default_mode, …;
// 3.6556.2 removed c5ef5b59f and its __gb__3627956258 gate). This host has no GrowthBook: every flag is off (D29 / D31).
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function useGrowthBookFlag(flag) {
  if (hostGrowthBookFlag(flag)) return true;
  return false;
}
// shared-25 cc (exported vh): whether this is the Claude desktop client (c227f4d5e e$ picks the "ccd" model surface). It is.
export function isDesktopClient() {
  return true;
}
// shared-25 VB (exported Br): the claude.ai account context. No account here.
export function useAccount() {
  return null;
}
// shared-46 aS (exported So; 2.42304.0 shared-19 cV): star or unstar a cloud environment (c227f4d5e's cloud submenu).
// No cloud environments.
export function toggleStarredEnvironment() {}

// shared-52 qO / JO (exported zu / Iu): the desktop config (`permission_modes.available` for remote backends,
// `errors.reason_vocab`). The host has no remote backend config: modes are not narrowed, the default vocabulary.
const HOST_DESKTOP_CONFIG = Object.freeze({ permission_modes: Object.freeze({ available: undefined }), errors: Object.freeze({ reason_vocab: undefined }) });
export function useDesktopConfig() {
  return HOST_DESKTOP_CONFIG;
}
export function getDesktopConfig() {
  return HOST_DESKTOP_CONFIG;
}

// shared-8 vK (exported St; 2.42304.0 shared-6 $j): whether auto mode is available for a model ("available", else e.g.
// "hidden"). The kernel's own auto mode (ProposalHost.permissionModes.auto).
const AUTO_AVAILABLE = Object.freeze({ kind: "available" }), AUTO_HIDDEN = Object.freeze({ kind: "hidden" });
export function useAutoModeAvailability() {
  return useContext(ProposalHost)?.permissionModes?.auto === true ? AUTO_AVAILABLE : AUTO_HIDDEN;
}

// shared-1 ER (exported Ur): the model catalog the resolver (l1) and the surface pick (e$) read. Here the host's
// model/list: nameFor / hasModel / effortOptionsFor ({id, recommended}) / requiresAutoMode (no host model requires auto
// mode) / entryFor; cdsCatalog is present while the host lists models.
const hostModels = (host) => (Array.isArray(host?.catalog?.models) ? host.catalog.models : EMPTY);
export function useModelCatalog() {
  const models = hostModels(useContext(ProposalHost));
  return useMemo(() => {
    const byId = new Map(models.map((model) => [model.id, model]));
    return {
      cdsCatalog: models.length > 0 ? { models } : undefined,
      models,
      nameFor: (id) => byId.get(id)?.name ?? id,
      hasModel: (id) => byId.has(id),
      effortOptionsFor: (id) => (Array.isArray(byId.get(id)?.efforts) ? byId.get(id).efforts : EMPTY),
      requiresAutoMode: () => false,
      entryFor: (id) => byId.get(id) ?? { id, unsupported: true },
    };
  }, [models]);
}
// shared-8 Ov (exported Sd; 2.42304.0 shared-6 mj): narrow effort options to the official effort ids (low … max, xhigh
// behind a gate). The host keeps its kernel's levels (e.g. Codex minimal … xhigh) as they are.
export function supportedEffortOptions(options) {
  return options;
}
// c74045701 o (exported n): the effort labels. The official five as shipped; any other kernel level reads as the host's
// composer names it (model-menu-model.mjs effortName: off / on are the thinking switch, otherwise capitalised).
const EFFORT_MESSAGES = Object.freeze({
  low: { defaultMessage: "Low", id: "477I0ggSYe" },
  medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },
  high: { defaultMessage: "High", id: "AxMhQrcUDC" },
  xhigh: { defaultMessage: "Extra high", id: "kDEj60CmLq" },
  max: { defaultMessage: "Max", id: "kkjl2vQekD" },
});
const hostEffortName = (id) => (id === "off" ? "Thinking off" : id === "on" ? "Thinking on" : id.charAt(0).toUpperCase() + id.slice(1));
export const effortMessages = new Proxy(EFFORT_MESSAGES, {
  get: (messages, id) => (typeof id !== "string" || Object.hasOwn(messages, id) ? messages[id] : { id: `host-effort.${id}`, defaultMessage: hostEffortName(id) }),
});

// c227f4d5e R$ + shared-7 Nw (exported qa): the epitaxy CDS model selector the Options form's Model / Effort rows (h1)
// render through `children(parts)`: `id.Trigger` + `id.Popup` in the Model row, `id.Effort` in the Effort row (shown
// while the model has levels). The original is the official model menu (sections, search, badges, the effort slider)
// over the account catalog; the host's rows are CdsDropdowns (the same original menu the form's Environment and
// Permissions rows use) listing the host's models and the model's levels as radio items. Picks go to h1's
// onModelPick / onEffortPicked exactly as the original's do.
export function ProposalModelSelector({ open, onOpenChange, effortOpen, onEffortOpenChange, disabled, contextModel, effortOverride,
  onModelPick, onEffortPicked, modelRestrictionFor, children }) {
  const intl = useStartIntl();
  const catalog = useModelCatalog();
  const parts = useMemo(() => {
    const modelItems = catalog.models.map((model) => {
      const restriction = model.id === contextModel ? undefined : modelRestrictionFor?.(model.id);
      return { label: model.name ?? model.id, checked: model.id === contextModel, checkedRole: "radio",
        ...(restriction === undefined ? {} : { disabled: true, disabledReason: restriction }), onSelect: () => onModelPick?.(model.id) };
    });
    const effortItems = (contextModel ? catalog.effortOptionsFor(contextModel) : EMPTY).map((option) => ({
      label: intl.formatMessage(effortMessages[option.id]), checked: option.id === effortOverride, checkedRole: "radio",
      onSelect: () => onEffortPicked?.(option.id, { defaultWritten: false }),
    }));
    return {
      trigger: { items: modelItems, open, onOpenChange, disabled: disabled === true || modelItems.length === 0 },
      popup: {},
      effort: { items: effortItems, open: effortOpen, onOpenChange: onEffortOpenChange },
      effortOptionCount: effortItems.length,
    };
  }, [catalog, contextModel, effortOverride, open, onOpenChange, effortOpen, onEffortOpenChange, disabled, modelRestrictionFor, onModelPick, onEffortPicked, intl]);
  return typeof children === "function" ? children(parts) : null;
}
export const ModelSelectorParts = Object.freeze({
  Trigger({ items, open, onOpenChange, disabled, renderTrigger }) {
    return <CdsDropdown items={items} open={open} onOpenChange={onOpenChange} disabled={disabled} side="bottom" align="start"
      renderTrigger={renderTrigger({ disabled: disabled === true })} />;
  },
  // The model menu's popup is the Trigger's CdsDropdown popup.
  Popup() {
    return null;
  },
  Effort({ items, open, onOpenChange, renderTrigger }) {
    return <CdsDropdown items={items} open={open} onOpenChange={onOpenChange} side="bottom" align="start"
      renderTrigger={renderTrigger({ warningLabel: undefined })} />;
  },
});

// c19e90103 Ux (exported t): the epitaxy Markdown the prompt preview popover renders the task's prompt with (LZ, inside
// a footnote-sized `--chat-body` / `--chat-leading`). Here the host's transcript Markdown (ProposalHost.renderMarkdown);
// without one, the prompt text as written.
export function TaskPromptMarkdown({ children }) {
  const renderMarkdown = useContext(ProposalHost)?.renderMarkdown;
  if (typeof renderMarkdown === "function") return renderMarkdown(children ?? "");
  return <p className="whitespace-pre-wrap break-words">{children}</p>;
}

// c96d752d0 iL: the transcript's generic tool row, the fallback for a proposing call that cannot be a card row
// (unavailable, still proposing, resolved). Here the host's own tool row for that call.
export function ProposalToolFallback({ tool }) {
  const renderToolFallback = useContext(ProposalHost)?.renderToolFallback;
  return typeof renderToolFallback === "function" && tool ? (renderToolFallback(tool) ?? null) : null;
}
