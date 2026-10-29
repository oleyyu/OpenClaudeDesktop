// Local services for the original 3.6556.2 Cowork Scheduled pieces scripts/extract-cowork-scheduled.mjs emits
// (src/generated/cowork-scheduled: ccd3f68fe ps detail / su templates, c97b955f1 La UpsertScheduledTaskModal; R4g-routines
// RTC, CW-1; moved to 3.6556.2 by w3-cowork-scheduled). The comments name each service's 3.6556.2 local (old 2.42304.0
// local in parentheses where it changed). Each export replaces one original declaration, which the extractor feature-checks (its `adapters` table
// names the chunk and local). This module imports no generated code: the generated modules import it, and a module-level
// read of an adapter (cae55dd08 `var _ = h.handle`) must not meet a cycle. The page-facing wrappers that provide the
// page's host to the generated components live in source-routine-cowork-page-adapters.jsx.
//
// Host facts behind these answers: no claude.ai account, organization, API or GrowthBook (D17/D29), no cloud routines,
// devices, projects, connectors catalog or session hosts (D17/D31/D32), no telemetry (D17). The scheduler is the host's
// local-routines service (electron/local-routines.mjs), reached through the page's RoutineContext.
import React, { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { keepAwakeStore } from './keep-awake-model.mjs';
import { RoutineContext } from './source-routine-adapters.jsx';
import { useRouter } from './source-routines-shared-adapters.jsx';
// R6/E41: the generated cowork-scheduled modules import this module while they evaluate, and the view-tabs facade would
// evaluate every view-tabs module (some import host adapters); so CdsButton comes from its view-tabs file by semantic name.
import { CdsButton } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { t } from '../electron/i18n/index.mjs';

const useRoutineHost = () => useContext(RoutineContext) ?? {};

// shared-0 bC (old Ux; `globalThis["claude.web"]?.CoworkScheduledTasks`, the desktop bridge). The form reads it for "can this
// app create local scheduled tasks" (`!!le?.createScheduledTask`) and shared-4 Wm for whether local tasks are withheld;
// saving goes through the page bridge (shared-4 dh, routines-shared useScheduledTasksBridge). Here the bridge object
// forwards to the bridge of the mounted page (source-routine-cowork-page-adapters.jsx registers it); with no page
// mounted a call is refused. routines-shared keeps its own copy of Ux (undefined) for the cloud-migration checks it reads.
let activeBridge = null;
export function setActiveCoworkBridge(bridge) {
  activeBridge = bridge ?? null;
}
const bridgeCall = name => (...args) => {
  if (!activeBridge?.[name]) return Promise.reject(new Error(t('Scheduled tasks aren’t available right now.')));
  return activeBridge[name](...args);
};
export const CoworkScheduledTasks = Object.freeze({
  createScheduledTask: bridgeCall('createScheduledTask'),
  updateScheduledTask: bridgeCall('updateScheduledTask'),
  updateScheduledTaskStatus: bridgeCall('updateScheduledTaskStatus'),
});

// shared-0 bN (old LA; the Datadog RUM error reporter). No telemetry here (D17): the error goes to the console only.
export function reportError(error) {
  if (error !== undefined) console.warn('[cowork-scheduled]', error);
}

// w3-cowork-scheduled (3.6556.2): three services the 3.6556.2 form adds; each is the official answer with no organization
// (D17/D31).
// shared-0 B (`I(Nv, F.O11Y_INTERNALS)`, the Datadog RUM action tracker). No telemetry here: nothing is sent.
export function trackEvent() {}
// shared-78 kS (the organization's compute settings: claude_code_disable_anthropic_compute / hide_managed_environments and
// the default worker pool or environment). No organization: kS's own answer when the settings query has no data.
const NO_ORG_COMPUTE_SETTINGS = Object.freeze({ hideManaged: false, disableAnthropicCompute: false, hideManagedPreference: false,
  disableAnthropicComputeSupported: false, defaultWorker: null, isSettled: true, isColdError: false });
export function useOrgComputeSettings() {
  return NO_ORG_COMPUTE_SETTINGS;
}
// c97b955f1 Ri (the form's "no cloud environment to run a Code routine in" check, `e && Li(environments, pools)`). No
// cloud environments or pools here: Li([], 0) is false, so the answer is false whether or not it is asked.
export function useFormCloudEnvironmentsMissing() {
  return false;
}

// shared-52 SO (old bP; the session host's served deployment config, an org API query). No session host or organization here:
// undefined, so shared-52 fN builds the "none" backend config.
export function useServedDeploymentConfig() {
  return undefined;
}

// shared-5 Dz (old EM; the skill chip catalog: account skills, Cowork commands, plugins, MCP skills). The host keeps no claude.ai
// skill catalog: an empty map, so c32f7beb9 o renders a task prompt's /names as plain text.
const NO_SKILLS = new Map();
export function useSkillChipCatalog() {
  return NO_SKILLS;
}
// shared-13 P (old N; a skill chip with its details modal). Not reached here (the catalog above is empty); the name as text.
export function SkillChip({ id, info }) {
  return info?.displayName ?? `/${id}`;
}

// shared-78 Zb (old pz; the org's cowork devices query, now called with an options object). No device registry here: no
// data, never an error.
const NO_DEVICES = Object.freeze({ data: undefined, isError: false });
export function useDeviceRegistryQuery() {
  return NO_DEVICES;
}
// shared-78 V (`th[feature].useAvailable()`, the claude.ai feature registry). B's useAvailable answers Om when the
// client-side gate is off, else the account feature, which with no account data is blocked_by_platform for the one
// feature this graph asks (dramatic_shrimp, shared-0 vZ's default); the same value (pinned by the extractor against Om).
const BLOCKED_BY_PLATFORM = Object.freeze({ status: 'blocked_by_platform', isAvailable: false, isPolicyBlocked: true, isUpsellEligible: false });
export function useClaudeAiFeature() {
  return BLOCKED_BY_PLATFORM;
}

// c3a5facd2 P / F (old F / I; the session host connection-hold action and note). Only an organization session host puts a task on a
// connection hold; there is none here, so the detail never shows the hold (Nr.connectionHold is false for local tasks).
export function SessionHostHoldAction() {
  return null;
}
export function SessionHostHoldNote() {
  return null;
}

// shared-8 bM (old _D; claude.ai projects routing ready). No projects here (D17).
export function useProjectsReady() {
  return false;
}

// shared-8 _J (old rB; the Cowork folder / project picker with pinned, recent and trusted targets). The host has no project list
// or folder trust store; its folder choice is the main process's directory dialog (`folder` with `additional`, which
// approves the folder for the session as the old form did). The trigger shows the chosen folder's name, or the form's
// placeholder; the form's own addSelectedFolder replaces the selection unless it allows several folders.
export function FolderPicker({ controlledSelection, labelledBy, disabled, placeholder }) {
  const host = useRoutineHost();
  const selected = controlledSelection?.selectedFolders ?? [];
  const choose = useCallback(async () => {
    try {
      const folder = await host.call?.('folder', { additional: true });
      if (folder) controlledSelection?.addSelectedFolder?.(folder);
    } catch (error) {
      host.error?.(error.message);
    }
  }, [host, controlledSelection]);
  const name = selected[0]?.split(/[\\/]/).filter(Boolean).at(-1);
  return <CdsButton variant="ghost" size="sm" icon="Folder" disabled={disabled} aria-labelledby={labelledBy}
    tooltip={selected[0] || undefined} onClick={choose}>{name || placeholder}</CdsButton>;
}

// shared-4 __ (old xh; a remote task's tool grants from the claude.ai API). Local tasks only here: the official answer when
// there is no remote task to read (C === null): no grants, unavailable, nothing to remove. 3.6556.2 adds the remote
// task's storedPermissionMode (`z = w?.storedPermissionMode`), undefined with no task.
const NO_REMOTE_GRANTS = Object.freeze({
  approvedPermissions: undefined, connections: undefined, loadFailed: false, isLoading: false, routine: undefined,
  storedPermissionMode: undefined, routineRead: 'unavailable', removeGrant: async () => {}, stillAllowed: async () => [],
});
export function useRemoteToolGrants() {
  return NO_REMOTE_GRANTS;
}

// c0efc2620 p (old _e; the org API routine draft generator `/dust/generate_routine_draft`). 3.6556.2's draft assistant
// c0efc2620 _ is copied and asks GrowthBook __gb__2682097403 (off here), so it never calls this; refused if it did.
const NO_DRAFTS = Object.freeze({ generateRoutineDraft: () => Promise.reject(new Error('Routine drafts are not available in this app.')) });
export function useRoutineDraftGenerator() {
  return NO_DRAFTS;
}

// shared-18 YW (old eB; the task file's frontmatter model, read from <config>/scheduled-tasks/<name>, for the stale-model badge).
// Host tasks keep their model in the row (no task file), and the stale-model check is behind a gate that is off: false.
export function useTaskFileModelUnavailable() {
  return false;
}
// shared-18 RW (old Uz; the Code routines' names, for the cross-store name collision check). The host page does not ask for the
// collision (collideWithCodeRoutines is unset), and the official answer then is the empty set Hz.
const NO_NAMES = new Set();
export function useCodeRoutineNames() {
  return NO_NAMES;
}
// shared-18 AT (old sC; the one-form unified Cowork + Code routine form, GrowthBook): off (D32, the R4 routines spec's sC / wr).
export function useUnifiedRoutineForm() {
  return false;
}
// shared-18 LT (old dC; offer creating a Code routine from the Cowork form, chilling_sloth gates): off; the Code page has its
// own form (D32).
export function useCodeRoutineCreateOffered() {
  return false;
}
// shared-18 zT (old pC; cloud environments / pools missing, for the Code cloud routine branch): not asked here (undefined, the
// official answer when the hook is disabled).
export function useCloudEnvironmentsMissing() {
  return undefined;
}
// shared-18 av / rv (old o_ / i_; the zod schemas GrowthBook dynamic configs are validated with). useDynamicConfig below never reads a
// GrowthBook value, so nothing is validated.
export const unusedConfigSchema = null;

// shared-156 iw (old Pb; the connector lookup over the MCP store). The host renderer keeps no claude.ai MCP store: the
// lookup of an empty store (the keys tw selects, each an empty record; 3.6556.2 adds remoteLiveRunToolTest, absent from
// the store's initial state, and mcpUrlKeyNamesOn, initially !1), so tool names fall back to their raw names.
const EMPTY = Object.freeze({});
const EMPTY_CONNECTOR_LOOKUP = Object.freeze({
  remoteServers: EMPTY, remoteTools: EMPTY, remoteDirectories: EMPTY, remoteIconUrls: EMPTY, firstPartyServerAliases: EMPTY,
  remoteLiveRunToolTest: undefined, injectedServerTitles: EMPTY,
  connectorIconFlags: Object.freeze({ hostedOnly: false, customNoGoogleFavicons: false }), mcpUrlKeyNamesOn: false,
  localTools: EMPTY, pluginBridgeTools: EMPTY, localClients: EMPTY, localAppOnlyTools: EMPTY, localPrompts: EMPTY,
  localResources: EMPTY, dxts: EMPTY, dxtContestNames: EMPTY, dxtNotFileInstalledNames: EMPTY, dxtContestHydrated: false,
  nonInternalClaimedNames: EMPTY, internalToolsOnlyNames: EMPTY,
});
export function useConnectorLookup() {
  return EMPTY_CONNECTOR_LOOKUP;
}
// shared-26 Ux (old ob; a tool's connector entry for its label). No connector catalog: undefined, and the row shows the tool name.
export function toolLabelInfo() {
  return undefined;
}

// shared-26 vD (old AT; the unsupervised permission modes the scheduled task form offers besides "default"). Official: GrowthBook
// cowork_auto_permission_mode / cowork_bypass_permissions_mode plus the org's skip_approvals / auto_mode settings. The
// host runs every task with its own permission profile: auto is always available, and "Skip all approvals" when the
// host's bypass setting is on or the task being edited already uses it (the old form's rule). Host difference: the
// gates are answered by host capability (the gates-on branch), see the RTC report.
export function useUnsupervisedPermissionModes() {
  const host = useRoutineHost();
  const bypass = host.bypassEnabled === true || host.editingTask?.options?.permission === 'bypass';
  return useMemo(() => new Set(bypass ? ['auto', 'bypassPermissions'] : ['auto']), [bypass]);
}

// shared-25 Rs (old bc; a GrowthBook dynamic config `Rs(name, defaultValue, schema)`). No GrowthBook here: the default.
export function useDynamicConfig(name, defaultValue) {
  return defaultValue;
}

// cae55dd08 h / v / l / f (lazily loaded Code routine chunks: the code state engine, the local create engine and the two
// embedded Code routine forms). The Cowork form's Code branches are off here (useUnifiedRoutineForm /
// useCodeRoutineCreateOffered); the chunks are not part of this graph, so their entries render nothing and preload nothing.
export const unavailableCodeRoutineChunk = Object.freeze({ Component: () => null, handle: Object.freeze({ preload() {} }) });

// shared-182 jL (old $P; dismissed claude.ai banners, stored in the account settings). No account: nothing dismissed or stored.
const NO_BANNERS = Object.freeze({ dismiss() {}, dismissMany() {}, isDismissed: () => false, isPending: false });
export function useDismissedBanners() {
  return NO_BANNERS;
}
// shared-182 Jb (old Pk; a selector over the chat composer's draft store). A scheduled task form has no composer draft.
export function useComposerDraftState(selector) {
  return selector(EMPTY);
}

// shared-7 Hk (old RT; an MCP server / connector icon). No connector catalog here (rows that would show one never render).
export function ConnectorServerIcon() {
  return null;
}
// shared-7 lw (old sx; the lazily loaded model effort control, a lazy component). The form's model menu passes no effort control, so the Effort
// part never renders.
export function EffortControl() {
  return null;
}
// shared-7 hv (old lg; open an in-app href with the router, closing the settings modal). Here the page's router
// (RoutinesSharedHost navigate, via routines-shared useRouter).
export function useAppNavigate() {
  const router = useRouter();
  return useCallback(href => router.push(href), [router]);
}
// shared-7 hk (old uT; this computer's registered device name). No device registry here.
export function useThisDeviceName() {
  return undefined;
}
// shared-7 YF (old zk; the open session's refusal fallback). A scheduled task form is not a session.
export function useRefusalFallback() {
  return undefined;
}
// shared-7 Mv (old Tg; the organization's subscription is past due). No organization or billing here.
export function useSubscriptionPastDue() {
  return false;
}

// c97b955f1 Ti / bi / hi (old _i / hi / fi; the saved project card linking to claude.ai, a remote task's tool approvals and their empty
// state). No projects or remote tasks here; these render only for them.
export function SavedProjectCard() {
  return null;
}
export function RemoteApprovalsList() {
  return null;
}
export function RemoteApprovalsEmpty() {
  return null;
}

// shared-1 ER (old FP; called with a surface string or { surface, coworkRoute }; the surface's model catalog: the official WR catalog object plus the stored model). Over the host's model
// list (the page's models; ids are the host model ids, names its labels). Host models carry no sections, badges, effort
// options or context windows, so those answers are empty. The stored model is the first one, as with no stored choice.
const hostModelEntries = models => (Array.isArray(models) ? models : []).map(model => ({
  id: model?.model ?? model?.id ?? String(model ?? ''),
  name: model?.displayName ?? model?.name ?? model?.model ?? model?.id ?? String(model ?? ''),
  description: model?.description || undefined,
  section: 'main',
  thinking: { type: 'none' },
}));
export function useCoworkModelCatalog() {
  const { models } = useRoutineHost();
  return useMemo(() => {
    const list = hostModelEntries(models);
    const byId = new Map(list.map(entry => [entry.id, entry]));
    const find = id => (id ? byId.get(id) : undefined);
    const unsupported = id => ({ id: id ?? '', name: id || t('Unsupported model'), unsupported: true });
    const fallbackModelId = list[0]?.id;
    return {
      entryFor: id => find(id) ?? unsupported(id),
      nameFor: id => (find(id) ?? unsupported(id)).name,
      disabledMessageFor: () => undefined,
      descriptionFor: id => find(id)?.description,
      noticeFor: () => undefined,
      effortOptionsFor: () => [],
      modeOptionsFor: () => [],
      thinkingAlwaysOnFor: () => false,
      thinkingDescriptionFor: () => undefined,
      badgeFor: () => undefined,
      tooltipFor: () => undefined,
      disabledReasonFor: () => undefined,
      sectionFor: id => find(id)?.section,
      isDeprecated: () => false,
      isRestricted: () => false,
      isNonSelectable: () => false,
      requiresAutoMode: () => false,
      fastModeFor: () => undefined,
      hasCapability: id => find(id) !== undefined,
      hasModel: id => list.length > 0 && find(id) !== undefined,
      servesModel: id => list.length > 0 && find(id) !== undefined,
      isSelectable: id => find(id) !== undefined,
      models: list,
      selectableModels: list,
      fallbackModelId,
      cdsCatalog: undefined,
      autoCompactWindow: undefined,
      contextWindowByModel: {},
      storedModel: fallbackModelId,
      resolvedModel: fallbackModelId,
      setModel() {},
      setStoredModel() {},
      isSelected: id => id !== undefined && fallbackModelId !== undefined && id === fallbackModelId,
    };
  }, [models]);
}

// shared-25 $o (old Rs; a GrowthBook feature's evaluation, `Qo(Vo(), key)`; the routines-shared copy of Ho throws without
// a GrowthBookProvider). c2d1766e9's device poll interval reads it (ds: a number value or undefined). No GrowthBook here:
// the evaluation GrowthBook gives a feature it does not know, so the poll interval keeps its default.
const UNKNOWN_FEATURE = Object.freeze({ value: null, on: false, off: true, source: 'unknownFeature', ruleId: '' });
export function useGrowthBookFeature() {
  return UNKNOWN_FEATURE;
}

// shared-0 AQ (old zJ; useConfiguration, the web app's boot configuration; shared-78 ZJ reads its serverGateNames). The host renderer has
// no claude.ai boot configuration: no server-assigned gate names, so JK falls back to the (unloaded) gate store.
const NO_CONFIGURATION = Object.freeze({});
export function useAppConfiguration() {
  return NO_CONFIGURATION;
}

// w13-close-cowork-ui (coworkui-scheduled-02): the store and status hooks c6ad19bb9 m (KeepAwakeSwitch) reads, over the
// desktop preference keepAwakeEnabled (src/keep-awake-model.mjs; main "keep-awake-read" / "settings").
//   c1e3f823e o (export n): `i.useHasKey() && Sw()` — the key is known (main always hands it over) and Sw, the desktop's
//     keepAwake status, is supported (`e === void 0 || e === "supported"`: this desktop build holds the computer awake).
//   c1e3f823e a (export r): `i.useEnabled`, the preference.
//   c1e3f823e l (export a): the writer `(e, n) => { i.write(e); track(…keep_awake_toggled…) }` (no telemetry here).
const keepAwakeState = () => keepAwakeStore.getState();
const useKeepAwakeState = () => useSyncExternalStore(keepAwakeStore.subscribe, keepAwakeState, keepAwakeState);
export function useKeepAwakeAvailable() {
  return useKeepAwakeState().hasKey;
}
export function useKeepAwakeEnabled() {
  return useKeepAwakeState().enabled;
}
const writeKeepAwake = value => keepAwakeStore.set(value);
export function useKeepAwakeWriter() {
  return writeKeepAwake;
}
// c0fe64a00 n (the wake scheduler, `globalThis["claude.web"]` WakeScheduler bridge `getStatus`): the desktop here has no
// wake scheduler, so the official no-bridge answer — settled (`c !== null || !i?.getStatus`), no status, not supported,
// no setup (`e ? … : s.requiresSetup` with s.requiresSetup false). m only destructures it.
const NO_WAKE_SCHEDULER = Object.freeze({ status: null, supported: false, requiresSetup: false, statusSettled: true, approvedThisCycle: false,
  isDialogOpen: false, enableInFlight: false, appDisplayName: 'Claude', handleEnable() {}, handleDisable() {}, handleCloseDialog() {},
  handleOpenLoginItems() {} });
export function useWakeScheduler() {
  return NO_WAKE_SCHEDULER;
}
// c1e3f823e c (export t): the switch's tooltip message (vendor-intl nn = defineMessage, the identity).
export const keepAwakeTooltipMessage = Object.freeze({ defaultMessage: 'When enabled, Claude will prevent your computer from going to sleep.', id: 'pkPdf3LvZO' });
