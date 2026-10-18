// Local services for the original 2.42304.0 proposal group card that scripts/extract-proposal-group.mjs emits
// (src/generated/proposal-group, R4f-proposal P1, tasks-proposal-group-card WI-1). Each export replaces one import (or
// one same-chunk declaration) of the original; the extractor checks the declaration it stands for against `features`.
// Nothing here imports src/generated/proposal-group: the generated modules import this file, never the reverse.
//
// The card reads the host through two contexts, both provided around the transcript by the wiring step (P5):
//   - ProposalSpawnerContext (generated c96d752d0 qQ): the F1e-shaped spawner, src/proposal-spawner.mjs getSnapshot();
//   - ProposalHost (below, provided through ProposalHostProvider):
//       sessions            the session store's `sessions[]` the card selects from (src/proposal-group-model.mjs
//                           proposalSessions: sessionId, title, isArchived, spawnedFrom, model, effort, permissionMode,
//                           backgroundTaskSuggestions, …). A started child's row (BQ → shared-19 L5 / F5) also reads
//                           isRunning, starting, error, neverStarted, awaitingBrief and taskSummary when the host has them.
//       needsInput          ids of the sessions waiting on the user (shared-11 Vm), an array or a Set.
//       catalog             {models: [{id, name, efforts: [{id, recommended?}]}]}: the kernel's model/list, efforts are the
//                           kernel's own reasoning levels (no mapping to the official five; R4f-proposal P1 host difference).
//       permissionModes     {auto}: whether the kernel offers auto mode (shared-6 $j's "available").
//       capabilities        {picks, worktreePick}: shared-78 uH / dH (sideSessionProposalPicks / WorktreePick), default
//                           on; offerCloudStart (fH) is off (no cloud here).
//       openSession(id, {title, event})   BQ's opener (c26fb8b6b xn): navigate to the started session.
//       renderToolFallback(tool)          Uz: the host tool row for a proposing call that cannot be a card row (the
//                           official-shaped record of proposal-group-model.mjs proposalToolRecord, `tool.id` = item id).
//       renderMarkdown(text)              the prompt preview popover body (c19e90103 Ix, the epitaxy Markdown).
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo } from "react";
import { CdsDropdown } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { useSourceToasts } from "./source-toast.jsx";

const EMPTY = Object.freeze([]);
const noop = () => {};

export const ProposalHost = createContext(null);

// shared-8 Q (exported Wd): the session store `hl` / `Lu` (`sessions: []`, name "ccd-sessions-filter"). As a hook,
// `useSessionsStore(selector)` selects from the provided host's sessions (the card wraps its selectors in shared-52 Qf,
// useShallow, as the original does); `getState()` (c227f4d5e qW, read by nG when a start finishes) answers the sessions
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

// shared-8 xm (exported hd): merge fields into a session of the store. nG uses it to move a started task to the end of
// the parent's backgroundTaskSuggestions while others are still spawning. The host queue is derived from the
// transcript (proposal-group-model.mjs backgroundTaskSuggestions), so there is no stored order to move: a no-op.
export function updateSession() {}

// shared-11 Vm (exported Un): the set of sessions waiting on the user (pending permission requests). The host's
// pending approvals, by session id.
export function useSessionsNeedingInput() {
  const needsInput = useContext(ProposalHost)?.needsInput;
  return useMemo(() => (needsInput instanceof Set ? needsInput : new Set(Array.isArray(needsInput) ? needsInput : EMPTY)), [needsInput]);
}

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-52 Sj (exported Ya): the ErrorsProvider. B$ calls addInfo(message, {uniqueKey: "start-all-left-out"}); here the
// host toast, the uniqueKey as its key (a live toast with that key is replaced in place, as the original's is).
export function useErrors() {
  const toasts = useSourceToasts();
  return useMemo(() => ({
    addInfo: (message, options) => { toasts?.add?.(message, { variant: "neutral", ...(options?.uniqueKey ? { key: options.uniqueKey } : {}) }); },
    addError: (message, options) => { toasts?.add?.(message, { variant: "danger", ...(options?.uniqueKey ? { key: options.uniqueKey } : {}) }); },
  }), [toasts]);
}

// shared-52 $p (exported up): the guarded localStorage kQ persists the sent_here outcomes in
// ("epitaxy-suggested-task-sent-here-v1"). The host keeps those outcomes in its own config (electron/task-proposals.cjs,
// R4f-proposal P4) and seeds the outcome store from it, so kQ gets a storage that lives for this window only instead of
// a second, per-origin persistence.
const sentHere = new Map();
export const sentHereStorage = Object.freeze({
  getItem: (key) => (sentHere.has(key) ? sentHere.get(key) : null),
  setItem: (key, value) => { sentHere.set(key, String(value)); },
  removeItem: (key) => { sentHere.delete(key); },
});

// shared-78 uH / dH / fH (exported fs / ps / ds): the desktop's appFeatures for side-session proposal picks. The host
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

// c68c4283d kd / Od / Ad and shared-1 Tw: the claudeai.code.side_session.proposal_card_* events and the "once while
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

// c856385e2 Qt (exported rt): `use(Xt)`, the side-session opener a split view provides (null without one). No such
// provider here.
export function useSideSessionOpener() {
  return null;
}

// cbb72cde9 Rn (exported A): the session's status chip (working / needs input / unread signals of the session list).
// The host has no chip model for a child session; BQ then shows the row state alone.
export function useSessionChip() {
  return undefined;
}

// shared-18 eO (exported rs): the session's pull request state. The host has no PR tracking for sessions: "none".
const NO_PR = Object.freeze({ prState: "none", prUrl: undefined, prNumbers: EMPTY, allBranches: EMPTY,
  aggregated: Object.freeze({ hasPr: false, displayPrs: EMPTY }) });
export function useSessionPrState() {
  return NO_PR;
}

// shared-20 LE / tD (exported Pt / Ht): the PR chip and the cloud environment chip of the row. Neither is reachable
// here (no PR state, no cloud sessions).
export function SessionPrChip() {
  return null;
}
export function SessionEnvChip() {
  return null;
}

// shared-14 Ft (exported M): the error copy of a session error category (title, body, which recoveries help). The
// host's sessions carry no error categories; an unknown category is what the original answers for one it does not know.
const UNKNOWN_ERROR = Object.freeze({ title: undefined, isKnownCategory: false });
export function errorCopy() {
  return UNKNOWN_ERROR;
}

// shared-78 CJ (exported dr) and shared-25 sm (exported _f): the session's route href and the hover / press route
// preload handlers built from it. Host sessions have no routes; with no href the original returns its inert handler
// set (`om`), which is what this answers.
const NO_HREF = () => null;
export function useSessionHref() {
  return NO_HREF;
}
const NO_PRELOAD = Object.freeze({ onPointerEnter: noop, onPointerLeave: noop, onPointerDown: noop, onFocus: noop, onBlur: noop });
export function routePreloadProps() {
  return NO_PRELOAD;
}

// shared-25 na (exported mg): the desktop's AppPreferences (s0e's "Don't ask again" writes ccNewTaskPrompt). Only an
// offer (start_session, D29: off here) shows that menu.
export const appPreferences = undefined;

// ccbc7e432 O / ccae33cda Dt: the offer card's keyboard chords (⌘↩ / Esc) and their own-composer test. Enabled only for
// an offer (`enabled: n$(t)`), which spawn_task never is.
export function useOfferChords() {}
export function isOwnComposer() {
  return false;
}

// shared-25 Jf (exported Wf), shared-156 Qf (exported Ch), shared-frame Xa (exported bu): the router, the settings page
// store and "the layer is in another window" that the offer's "Settings" item reads. Not reachable (offers are off,
// D29); the router and the store do nothing.
const NO_ROUTER = Object.freeze({ push: noop, replace: noop, back: noop, forward: noop });
export const useAppRouter = () => NO_ROUTER;
const NO_SETTINGS = Object.freeze({ mounted: false, open: noop });
export const settingsPageStore = Object.freeze({ getState: () => NO_SETTINGS, setState: noop });
export function useLayerInOtherWindow() {
  return false;
}

// shared-frame Ya (exported mu): the CDS layer's owner window. This host renders each window's own React root and
// mounts no layer element in another window: the current window (Ji's fallback).
export function useLayerOwnerWindow() {
  return globalThis.window;
}

// shared-0 Ix (exported Om): `globalThis["claude.web"]?.LocalSessions`, which g1e asks for popBackgroundTaskSuggestionById
// (the inline card needs a bridge that can pop a task by id). The host's queue is popped by its own spawner
// (proposal-launch.mjs createProposalBridge popById); this object only answers that the capability exists. The
// extracted card never calls it (F1e, its only caller, is the host's proposal-spawner.mjs).
export const desktopBridge = Object.freeze({
  popBackgroundTaskSuggestionById() {
    return Promise.reject(Error("The host spawner pops proposals through proposal-launch.mjs createProposalBridge."));
  },
});

// shared-25 Zs (exported Th) and c5ef5b59f's gate: GrowthBook features. This host has no GrowthBook: every flag is off
// (D29 / D31), e.g. ccr_plan_mode_enabled.
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function useGrowthBookFlag(flag) {
  if (hostGrowthBookFlag(flag)) return true;
  return false;
}
// shared-25 ml (exported Rm): whether this is the Claude desktop client (tK picks the "ccd" model surface). It is.
export function isDesktopClient() {
  return true;
}
// shared-25 cV (exported ur): the claude.ai account context. No account here.
export function useAccount() {
  return null;
}
// shared-19 cV (exported al): star or unstar a cloud environment (c227f4d5e's cloud submenu). No cloud environments.
export function toggleStarredEnvironment() {}

// shared-52 RP / zP (exported Fi / Mi): the desktop config (`permission_modes.available` for remote backends,
// `errors.reason_vocab`). The host has no remote backend config: modes are not narrowed, the default vocabulary.
const HOST_DESKTOP_CONFIG = Object.freeze({ permission_modes: Object.freeze({ available: undefined }), errors: Object.freeze({ reason_vocab: undefined }) });
export function useDesktopConfig() {
  return HOST_DESKTOP_CONFIG;
}
export function getDesktopConfig() {
  return HOST_DESKTOP_CONFIG;
}

// shared-6 $j (exported pa): whether auto mode is available for a model ("available", else e.g. "hidden"). The kernel's
// own auto mode (ProposalHost.permissionModes.auto).
const AUTO_AVAILABLE = Object.freeze({ kind: "available" }), AUTO_HIDDEN = Object.freeze({ kind: "hidden" });
export function useAutoModeAvailability() {
  return useContext(ProposalHost)?.permissionModes?.auto === true ? AUTO_AVAILABLE : AUTO_HIDDEN;
}

// shared-1 FP (exported Yr): the model catalog the resolver (sq) and the surface pick (tK) read. Here the host's
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
// shared-6 mj (exported xa): narrow effort options to the official effort ids (low … max, xhigh behind a gate). The
// host keeps its kernel's levels (e.g. Codex minimal … xhigh) as they are.
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

// c227f4d5e LK + shared-7 Tx (exported Bi): the epitaxy CDS model selector the Options form's Model / Effort rows (fq)
// render through `children(parts)`: `id.Trigger` + `id.Popup` in the Model row, `id.Effort` in the Effort row (shown
// while the model has levels). The original is the official model menu (sections, search, badges, the effort slider)
// over the account catalog; the host's rows are CdsDropdowns (the same original menu the form's Environment and
// Permissions rows use, dq) listing the host's models and the model's levels as radio items. Picks go to fq's
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

// c19e90103 Ix (exported t): the epitaxy Markdown the prompt preview popover renders the task's prompt with (JQ, inside
// a footnote-sized `--chat-body` / `--chat-leading`). Here the host's transcript Markdown (ProposalHost.renderMarkdown);
// without one, the prompt text as written.
export function TaskPromptMarkdown({ children }) {
  const renderMarkdown = useContext(ProposalHost)?.renderMarkdown;
  if (typeof renderMarkdown === "function") return renderMarkdown(children ?? "");
  return <p className="whitespace-pre-wrap break-words">{children}</p>;
}

// c96d752d0 Uz: the transcript's generic tool row, the fallback for a proposing call that cannot be a card row
// (unavailable, still proposing, resolved). Here the host's own tool row for that call.
export function ProposalToolFallback({ tool }) {
  const renderToolFallback = useContext(ProposalHost)?.renderToolFallback;
  return typeof renderToolFallback === "function" && tool ? (renderToolFallback(tool) ?? null) : null;
}
