// Local services for the original 2.42304.0 routines pieces scripts/extract-routines-shared.mjs emits
// (src/generated/routines-shared: cdbc75b4b cards / filters / loading frames, c43d31dd8 Runs on helpers, shared-52 kx,
// shared-14 Ft; R4g-routines RT0, tasks-code-routines WI-0, D32). Each export replaces one original declaration, which the
// extractor feature-checks (see the `adapters` table there). The Code Routines page (WI-5) and the Cowork Scheduled
// upgrade (CW-1) provide RoutinesSharedHost around the generated components.
//
// Host facts behind these answers: no claude.ai account or organization, no GrowthBook client, no cloud routines (remote
// triggers), no SSH / WSL places (D31/D37), no TanStack router (the page is a section of main.jsx), no telemetry (D17).
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { StartMessage, useStartIntl } from './source-code-start-adapters.jsx';
import { useSourceToasts } from './source-toast.jsx';

// The page's host: { navigate(href, { replace }), pathname, search, bridge, models }.
//   navigate  where a routines link / router push lands (the page maps /code/routines/<id> to its own selection state).
//   pathname / search  the page's notional location (the templates scope tab of gi reads them; it is cloud only).
//   bridge    the scheduled task bridge Az's menu calls (updateScheduledTaskStatus(id, status, removeFiles, source)),
//             answered by the host's local-routines service; undefined until the page provides it (no menu actions).
//   models    the host's model list for the stale-model check (Gz; its gate is off here, so it only needs the shape).
export const RoutinesSharedHost = createContext({ navigate() {}, pathname: '', search: '', bridge: undefined, models: [] });
const useHost = () => useContext(RoutinesSharedHost);

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage) over the local catalog (source-code-start-adapters.jsx). The
// catalog holds no "secret:" (gated) messages — the desktop receives those in the account bootstrap (shared-23
// gated_messages) — so shared-104 Ql answers them with the official fallback " " (host difference, see the RT0 report).
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// vendor-router Y (TanStack useRouter). This host has no TanStack router: null, so c9e1458cd Le (`j({ warn: !1 }) ?
// i(ze, …) : null`) never mounts the navigation blocker.
export function useTanStackRouter() {
  return null;
}
// c9e1458cd ze: the blocker Le mounts under a router (PUSH / BACK away from a dirty form). Not reachable here (above); the
// form's own Back still asks through ot's discard dialog (W), which is generated.
export function RoutineLeaveGuard() {
  return null;
}

// shared-25 Jf (useRouter): push / replace / back / refresh / prefetch. Here a push or replace goes to the page's navigate.
export function useRouter() {
  const { navigate } = useHost();
  return useMemo(() => ({
    push: (href) => navigate(href, { replace: false }),
    replace: (href) => navigate(href, { replace: true }),
    back: () => navigate(-1, { replace: false }),
    refresh() {},
    prefetch() {},
  }), [navigate]);
}
// shared-25 Xf / ep (usePathname / useSearchParams) over the page's notional location.
export function usePathname() {
  return useHost().pathname ?? '';
}
export function useSearchParams() {
  const { search } = useHost();
  return useMemo(() => new URLSearchParams(search ?? ''), [search]);
}
// shared-25 mS (the router Link): an anchor whose plain click navigates in-app. The host has no other windows or tabs to
// open a route in, so a modified click (pS) or a target also stays in the page (host difference); a click the caller
// prevented is left alone, as in the original.
export function RouterLink({ href, replace, scroll, prefetch, onClick, target, ref, ...rest }) {
  const { navigate } = useHost();
  const click = useCallback((event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    navigate(href, { replace: !!replace });
  }, [href, navigate, onClick, replace]);
  return <a ref={ref} href={href} onClick={click} {...(prefetch === false && { 'data-no-intent-warm': '' })} {...rest} />;
}

// vendor-query J (useQueryClient). No react-query client here; only isRemoteTriggerMutating reads it.
export function useQueryClient() {
  return null;
}
// shared-1 aE / nE / rE: the remote trigger run / update / delete mutations (claude.ai /v1/code/triggers). No cloud
// routines here (D17, D32): there is never a remote row to act on, and a call is refused.
const cloudUnavailable = () => Promise.reject(new Error('Cloud routines are not available in this app.'));
const REMOTE_MUTATION = Object.freeze({ mutate() {}, mutateAsync: cloudUnavailable, isPending: false, isError: false, error: null, reset() {} });
export function useRunRemoteTrigger() {
  return REMOTE_MUTATION;
}
export function useUpdateRemoteTrigger() {
  return REMOTE_MUTATION;
}
export function useDeleteRemoteTrigger() {
  return REMOTE_MUTATION;
}
// shared-1 aT (the trigger ids with a pending mutation) and iT (is one mutating): none.
const NO_IDS = Object.freeze(new Set());
export function usePendingRemoteTriggerIds() {
  return NO_IDS;
}
export function isRemoteTriggerMutating() {
  return false;
}
// shared-1 bT: the message of a claude.ai API error body (ys / H instances). The host's errors are never those: null, and
// the callers fall back to their own message.
export function apiErrorBodyMessage() {
  return null;
}
// shared-1 FP (the surface's model catalog). The stale-model check that reads it (shared-18 Gz) is behind the
// cowork_scheduled_task_stale_model_main gate, off here; it still gets the official shape over the host's model list.
const NO_DISABLED_MODEL = () => undefined;
export function useSurfaceModels() {
  const { models } = useHost();
  return useMemo(() => {
    const list = Array.isArray(models) ? models : [];
    const has = (id) => list.some((model) => (model?.id ?? model?.model ?? model) === id);
    // R4g-routines RT5: the Code form (c0fd2fda3 sn: `{ models, storedModel, disabledMessageFor } = m("code")`) reads
    // the stored model and each model's disabled reason too. No stored choice here (the form's Default is the host's
    // current model) and no host model is disabled.
    return { models: list, hasModel: has, servesModel: has, cdsCatalog: undefined, storedModel: undefined, disabledMessageFor: NO_DISABLED_MODEL };
  }, [models]);
}

// shared-4 Ap (cloud routines: claude_code_routines + the org's routines.enabled + chilling_sloth_clocks) and the gates
// built on it (Bp alumina_drift, Fp ccr_routine_push_notify_reminder, jp marble_sparrow / ccr_triggers_plugin_config):
// no account, organization or GrowthBook here, so all off (D29/D31/D32).
export const useCloudRoutinesEnabled = () => false;
export const useRoutineAluminaDrift = () => false;
export const useRoutinePushNotifyReminder = () => false;
export const useRoutinePluginConfig = () => false;
// shared-4 dh: the scheduled task bridge (window.claude CoworkScheduledTasks / CCDScheduledTasks with the cloud-migration
// state). Here the page's bridge over the local-routines service.
export function useScheduledTasksBridge() {
  return useHost().bridge;
}

// shared-52 Sj (the ErrorsProvider value): addError / addApiError / addSuccess / addInfo / addWarning / addDanger /
// clearToast, over the host's toasts (danger / warning / neutral; the host has no success variant). The logging options
// (error, errorContext, messageForLogging) go to the console only (no telemetry, D17).
export function useErrors() {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  return useMemo(() => {
    const text = (message) => (typeof message === 'string' ? message : message && intl.formatMessage(message));
    const show = (variant) => (message, options) => {
      if (options?.messageForLogging) console.warn(options.messageForLogging);
      return toasts?.add?.(text(message), { variant });
    };
    return {
      addError: show('danger'), addApiError: show('danger'), addDanger: show('danger'), addWarning: show('warning'),
      addSuccess: show('neutral'), addInfo: show('neutral'), clearToast: (id) => toasts?.close?.(id),
    };
  }, [toasts, intl]);
}
// shared-52 EO (the analytics client: track / page / identify / alias). Nothing is sent (D17).
const NO_ANALYTICS = Object.freeze({ track() {}, page() {}, identify() {}, alias() {} });
export function useAnalytics() {
  return NO_ANALYTICS;
}

// shared-25 Zs (useFeatureIsOn) and ks (the GrowthBook client context): no GrowthBook here, so every feature reads off
// (and ec's `!n?.growthbook` answers false).
export const useFeatureIsOn = () => false;
export const useGrowthBookClient = () => undefined;
// shared-25 Z (the CurrentAccountProvider value, which throws outside one). No signed-in account here: the value of a
// provider with no account, so `Lm(account)` (Ant only) and the plan checks read false.
const NO_ACCOUNT = Object.freeze({ account: undefined, activeOrganization: undefined, isLoading: false });
export function useCurrentAccount() {
  return NO_ACCOUNT;
}

// shared-7 WM (voice dictation available) and shared-2 qK (a voice recording is live): no voice mode here. shared-78 uV
// (GrowthBook __gb__2142364912, which the cloud form skeleton zn reads for its behavior tab): off, no GrowthBook.
export const useVoiceModeAvailable = () => false;
export const useGate2142364912 = () => false;
export const useVoiceRecordingActive = () => false;
// shared-78 Wg (the hub engine: hubCapable / hubAllowed / GrowthBook): off.
export const useHubAvailable = () => false;
// shared-2 Bw (__gb__672513276, move a local routine to the cloud): off, no cloud routines.
export const useRoutineMoveToCloudGate = () => false;

// shared-20 pT (the SSH configs query). No SSH environments here (D31/D37): the official answer when the SSH APIs are
// unavailable (`!t`): no configs, loaded, fresh, read, and a refresh that resolves to none.
const NO_SSH_CONFIGS = Object.freeze([]);
const SSH_UNAVAILABLE = Object.freeze({
  sshConfigs: NO_SSH_CONFIGS, sshConfigsLoaded: true, sshConfigsFresh: true, sshConfigsRead: true, sshApisAvailable: false,
  refresh: async () => NO_SSH_CONFIGS,
});
export function useSshConfigs() {
  return SSH_UNAVAILABLE;
}

// shared-6 mH (connector icons). cdbc75b4b Ui draws one only for a remote trigger created from Slack; there are no remote
// triggers here.
export function ConnectorIcon() {
  return null;
}
// shared-16 Dd (the lazily loaded emoji shortcode field enhancer, a dynamic chunk). Not loaded here: the rename field is
// a plain input.
export function EmojiShortcodeField() {
  return null;
}
