// The Cowork Scheduled page's host for the original 2.42304.0 components (R4g-routines RTC, CW-1): the scheduled task
// card (routines-shared cdbc75b4b Ji), the detail (cowork-scheduled ccd3f68fe qo) and UpsertScheduledTaskModal
// (c97b955f1 Ca) read the page's router, scheduler bridge and models from routines-shared's RoutinesSharedHost
// (useRouter / RouterLink, useScheduledTasksBridge, useSurfaceModels). src/source-routines.jsx renders these wrappers
// inside its RoutineContext; each wrapper provides RoutinesSharedHost over that context.
//
// The bridge is the official CoworkScheduledTasks contract (the part this page's components call) over the host's
// local-routines service, through the page's `mutate` (which reloads the list and tracks the busy row):
//   createScheduledTask(data)                         -> create (kind cowork)
//   updateScheduledTask({ scheduledTaskId, ... })     -> update of the task being edited
//   updateScheduledTaskStatus(id, status, removeFiles) -> toggle (enabled / disabled) or delete (deleted); true
// Official fields the host has no counterpart for (spaceId, projectUuid, notifications, disableJitter, cronIsUtc,
// chromePermissionMode, revoked tools, device binding) are not stored (host differences, see the RTC report).
import React, { useContext, useMemo } from 'react';
import { RoutineContext, sourceRoutine } from './source-routine-adapters.jsx';
import { RoutinesSharedHost } from './source-routines-shared-adapters.jsx';
import { setActiveCoworkBridge } from './source-routine-cowork-adapters.jsx';
import { ScheduledTaskCard } from './generated/routines-shared/index.mjs';
import { ScheduledTaskDetail, UpsertScheduledTaskModal } from './generated/cowork-scheduled/index.mjs';

// Official permission mode names to the host's (ask / bypass), and back (source-routine-form-adapters.jsx does the same
// for the old form).
const HOST_PERMISSION = { default: 'ask', bypassPermissions: 'bypass' };
export const toHostPermission = value => HOST_PERMISSION[value] ?? value;
const has = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

// The local-routines request for an official create / update payload. `previous` is the host row being edited.
export function scheduledTaskRequest(data, previous, executionProfile = {}) {
  const name = (data.displayName ?? (previous ? previous.name : data.name) ?? '').trim();
  const cron = has(data, 'cronExpression') ? data.cronExpression || '' : previous?.cron ?? '';
  const fireAt = has(data, 'fireAt') ? data.fireAt ?? null : cron ? null : previous?.fireAt ?? null;
  const model = has(data, 'model') ? data.model || executionProfile.model : previous?.options?.model ?? executionProfile.model;
  // Ca always sends permissionMode on create and when its picker is shown on update; undefined there is the picker's
  // Default (Le answers only auto / bypassPermissions). Without the key the task keeps its mode.
  const permission = has(data, 'permissionMode') ? toHostPermission(data.permissionMode ?? 'default')
    : previous?.options?.permission ?? executionProfile.permission;
  return {
    action: previous ? 'update' : 'create',
    ...(previous ? { id: previous.id } : { kind: 'cowork' }),
    name,
    ...(has(data, 'description') && { description: data.description ?? '' }),
    prompt: data.prompt ?? previous?.prompt,
    ...(data.userSelectedFolders?.[0] && { folder: data.userSelectedFolders[0] }),
    cron,
    fireAt,
    execution: { model, permission },
  };
}

export function coworkScheduledTasksBridge(host) {
  const editing = host.editingTask?.id ? host.editingTask : undefined;
  return {
    createScheduledTask: data => host.mutate(scheduledTaskRequest(data, undefined, host.executionProfile)).then(sourceRoutine),
    updateScheduledTask: data => {
      if (!editing || data.scheduledTaskId !== editing.id) return Promise.reject(new Error('Scheduled task not found.'));
      return host.mutate(scheduledTaskRequest(data, editing, host.executionProfile)).then(sourceRoutine);
    },
    updateScheduledTaskStatus: async (id, status) => {
      if (status === 'deleted') await host.mutate({ action: 'delete', id });
      else await host.mutate({ action: 'toggle', id, enabled: status === 'enabled' });
      return true;
    },
  };
}

// RoutinesSharedHost over the page's RoutineContext. A card's link (/scheduled-task/<id>) selects the task through the
// page's own list item click, so the router's navigate has nothing more to do.
function useCoworkSharedHost(host) {
  const bridge = useMemo(() => coworkScheduledTasksBridge(host), [host.mutate, host.editingTask, host.executionProfile]);
  setActiveCoworkBridge(bridge);
  return useMemo(() => ({ navigate() {}, pathname: '/scheduled-task', search: '', bridge, models: host.models ?? [] }), [bridge, host.models]);
}
// The official external links (TextLink `external`: target _blank, e.g. the form's "See safe use tips") leave the app in
// the desktop shell's browser. This host's windows deny window.open (main.cjs setWindowOpenHandler), so a click on an
// absolute http(s) link inside these components is handed to the host's external opener instead (React events bubble
// through the dialog's portal to this element). In-app hrefs (/scheduled-task/…) are left to the components.
export function openExternalLinkClick(event, host) {
  if (event.defaultPrevented) return false;
  const anchor = event.target?.closest?.('a[href]');
  const href = anchor?.getAttribute?.('href');
  if (!href || !/^https?:\/\//i.test(href)) return false;
  event.preventDefault();
  Promise.resolve(host.call?.('external', { url: href })).catch(error => host.error?.(error.message));
  return true;
}
function withCoworkHost(Component, mapProps = props => props) {
  const Wrapped = props => {
    const host = useContext(RoutineContext) ?? {};
    return <RoutinesSharedHost.Provider value={useCoworkSharedHost(host)}>
      <div style={{ display: 'contents' }} onClickCapture={event => openExternalLinkClick(event, host)}><Component {...mapProps(props)} /></div>
    </RoutinesSharedHost.Provider>;
  };
  Wrapped.displayName = `Cowork(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
}
export const CoworkScheduledTaskCard = withCoworkHost(ScheduledTaskCard);
// The history rows (ccd3f68fe Yo) mark a run "Only this computer" when the session carries ranOn this_computer. The
// official list sets ranOn only for a task moved to the cloud (its local runs next to the cloud ones); a local task's own
// runs carry none, so the page's ranOn is dropped unless the task was migrated.
export const coworkDetailProps = props => (props.scheduledTask?.migratedFromLocalTask || !Array.isArray(props.sessions) ? props
  : { ...props, sessions: props.sessions.map(({ ranOn, ...session }) => session) });
export const CoworkScheduledTaskDetail = withCoworkHost(ScheduledTaskDetail, coworkDetailProps);
export const CoworkUpsertScheduledTaskModal = withCoworkHost(UpsertScheduledTaskModal);
