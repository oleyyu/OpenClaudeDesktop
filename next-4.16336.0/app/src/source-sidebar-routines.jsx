// The Code sidebar's Routines section (W14-code r4 sidebar-new, fr4-06): the 3.6556.2 originals, sliced by
// scripts/extract-sidebar-routines.mjs into generated/sidebar-routines (shared-21 p4 → m4 / g4 / Q4 / s3 / y3, JK, hJ),
// over the host services of source-sidebar-routines-adapters.jsx. This module is the mount interface:
//
//   <SidebarRoutinesHost call onEvent sessions metadata state updateSessionMetadata pathname onOpenTask onOpenSession
//                        onTaskDeleted>  once per window, around the sidebar (main.jsx). It
//     - keeps the scheduler's Code tasks at app level (connectSidebarRoutines: local-routines list, reloaded on every
//       `local-routines` desktop event; closeout-2 step 1), so the section and Show › Routines see them without the
//       Routines page mounted;
//     - provides the routine runs (shared-21 NG) as list items (sidebar-routines-model routineRunEntries over
//       code-routine-model codeRoutineSessions: state.active / approvals / errors, sessionMetadata unread);
//     - binds the unread store (sessionMetadata, updateSessionMetadata) and renders the delete confirmation (shared-46
//       fO's routine / task copy: "Delete routine?" / "Delete scheduled task?", the section's deleteBody, Delete).
//     onOpenTask(taskId, event)       y3 `b(t, e)`: open the task on the Routines page (main: setRoutineSelection + section);
//     onOpenSession(sessionId, event) y3 `x(f, e)`: open the task's newest run;
//     onTaskDeleted(taskId)           X4: leave the deleted task's page;
//     pathname                        routinesPathname(...): the row selection.
//   <SidebarRoutinesSection renderGroup />   where shared-22 $N mounts p4 for Code (`o(wy, {kind: "code", presentation:
//     bo, onOpenTask: gi, onOpenSession: bi, onOpenRemoteRoutine: xi, renderGroup: Oi})`), i.e. the sections layout's
//     routines section (sections-model routinesSectionId, between Pinned and Sessions). Rendered inside the list-view
//     context (code-current SidebarStatusLayout, shared-18 KO), so m4 takes g4: the section is drawn only while the
//     routines section is shown (Show › Routines) and folds with it. renderGroup(group) draws a scheduled-task group (a
//     disabled task with a live run; JK / MK shape) the way the sidebar draws its session groups (shared-22 Oi).
//   useLocalRoutineRunning()   shared-21 hJ: a local routine run is live (Show › Routines is offered then, HJ / VJ).
//
// Gate: host-growthbook.mjs `local_sidebar_routines` (host rollback switch; false: no section, no Show › Routines).
import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { CodeSidebarRoutines, useLocalRoutineRunning as originalLocalRoutineRunning } from './generated/sidebar-routines/routines-section.mjs';
import { SidebarStatusLayout } from './generated/code-current/sidebar-status-glyph.mjs';
import { routineGroupIcon } from './generated/sidebar-routines/shared-20.mjs';
import { CurrentSidebarRow } from './generated/code-current/sidebar-row-view.mjs';
import { sessionRefKey } from './generated/sidebar-sections/session-ref-key.mjs';
import { RoutineSessionsContext, SidebarRoutinesHostContext, setRoutineConfirmHost, setRoutineUnreadHost, sidebarRoutinesStore } from './source-sidebar-routines-adapters.jsx';
import { createCodeRoutinesBridge } from './code-routine-model.mjs';
import { routineRunEntries, routineRunFacts, routinesPathname } from './sidebar-routines-model.mjs';
import { SourceConfirmationDialog } from './source-dialog.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { t } from '../electron/i18n/index.mjs';
export { routinesPathname, routineRunEntries } from './sidebar-routines-model.mjs';

/** The rollback switch (host-growthbook.mjs local_sidebar_routines). */
export const SIDEBAR_ROUTINES_ENABLED = hostGrowthBookFlag('local_sidebar_routines');

// ---------------------------------------------------------------- the app-level task list
let connection = null;
/** Load the scheduler's Code tasks and keep them current; returns the disconnect. One connection per window. */
export function connectSidebarRoutines({ call, subscribe }) {
  if (typeof call !== 'function') return () => {};
  connection?.close();
  let closed = false, revision = 0, lastRows = [];
  // onRows: the raw rows (runs with their sessions) of every list the bridge reads, for the routine runs.
  const bridge = createCodeRoutinesBridge({ call, subscribe: typeof subscribe === 'function' ? subscribe : () => () => {}, onRows: (rows) => { lastRows = rows; } });
  const load = async () => {
    const mine = ++revision;
    try {
      const scheduledTasks = await bridge.getAllScheduledTasks();
      const rows = lastRows;
      if (!closed && mine === revision) sidebarRoutinesStore.setState({ rows, scheduledTasks, hasLastKnownList: true, didResolveCompletely: true, isLoading: false, bridge });
    } catch {
      if (!closed && mine === revision) sidebarRoutinesStore.setState({ isLoading: false, bridge });
    }
  };
  sidebarRoutinesStore.setState({ bridge });
  const unsubscribe = bridge.onOnScheduledTaskEvent(() => { void load(); });
  void load();
  const self = { close() { if (closed) return; closed = true; unsubscribe?.(); if (connection === self) { connection = null; sidebarRoutinesStore.reset(); } } };
  connection = self;
  return () => self.close();
}

// ---------------------------------------------------------------- the host
export function SidebarRoutinesHost({ call, onEvent, sessions, metadata, state, updateSessionMetadata, pathname, onOpenTask, onOpenSession, onTaskDeleted, children }) {
  useEffect(() => (SIDEBAR_ROUTINES_ENABLED ? connectSidebarRoutines({ call, subscribe: onEvent }) : undefined), [call, onEvent]);
  const [rows, setRows] = useState(() => sidebarRoutinesStore.getState().rows);
  useEffect(() => sidebarRoutinesStore.subscribe(() => setRows(sidebarRoutinesStore.getState().rows)), []);
  const entries = useMemo(() => routineRunEntries(rows, { sessions, metadata, state }), [rows, sessions, metadata, state]);
  const facts = useMemo(() => routineRunFacts(entries), [entries]);
  // The unread store notifies its readers: after the commit, not while this host renders.
  useLayoutEffect(() => { setRoutineUnreadHost(metadata, updateSessionMetadata); }, [metadata, updateSessionMetadata]);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    setRoutineConfirmHost((request) => new Promise((resolve) => setConfirm({ ...request, resolve })));
    return () => setRoutineConfirmHost(null);
  }, []);
  const host = useMemo(() => ({ pathname, facts, onOpenTask, onOpenSession, onTaskDeleted }), [pathname, facts, onOpenTask, onOpenSession, onTaskDeleted]);
  const settle = (answer) => { confirm?.resolve(answer); setConfirm(null); };
  return <SidebarRoutinesHostContext.Provider value={host}>
    <RoutineSessionsContext.Provider value={entries}>
      {children}
      {confirm && <SourceConfirmationDialog
        // shared-46 fO: QD[kind] ("Delete routine?" / "Delete scheduled task?"), the caller's description, Delete (danger).
        title={confirm.title ?? (confirm.kind === 'task' ? t('Delete scheduled task?') : t('Delete routine?'))}
        body={confirm.description} confirmLabel={t('Delete')} confirmVariant="danger"
        onConfirm={() => settle(true)} onCancel={() => settle(false)} />}
    </RoutineSessionsContext.Provider>
  </SidebarRoutinesHostContext.Provider>;
}

// ---------------------------------------------------------------- renderGroup (shared-22 Oi)
// W14-code r4 gen-final-4 (fr4-06): Q4 hands a routine group the enabled list does not hold (JK / MK: a disabled task
// whose run is live) to renderGroup. The Code list's Oi is `(e) => o(xC, { session: e, section: "recents", onOpen: n },
// wn(e.ref))`: xC → vC (no hosted renderer, Xg undefined) → _C (destination `${routinesBase}/${id}`; JK sets no
// opensNewestRun, so fC is the group's own ref) → pC's `case "scheduled-task"`. In the session list (o0 / a0:
// "scheduled-task" is "leading" unless text-first, which the Code list is not) that is
//   o(pl, { variant: "session", selected: I, href: O, ...A, icon: yg(t), onClick: W, children: S })
// inside pC's row div `{ "data-row-key": j, "data-jump-hint-row": "", className: "relative df-drag-shiftable" }`, with
// pl = shared-18 Ak (code-current CurrentSidebarRow), yg = shared-21 $1 → shared-20 YT over the newest run (sliced:
// generated/sidebar-routines routineGroupIcon), S = the group's title (`?? ha.untitled`), I = the pane selection of the
// group's key ("focused" while its routine page is open), O undefined in the desktop (the click navigates; A, the link
// props, are the host's empty useRouteLinkProps). pC's other machinery does not apply to this row: no drag (dp is false
// for a scheduled-task ref), no multi-select (Bg), no hover card (no code data), no jump-hint keycap (the host's hints
// are keyed by session ids). The click (W → the list's onOpen of the ref) opens the task on the Routines page.
export function SidebarRoutineGroupRow({ group }) {
  const host = useContext(SidebarRoutinesHostContext);
  const id = group.ref.id;
  const rowKey = sessionRefKey(group.ref);
  const selected = host?.pathname === routinesPathname({ section: 'routines', routineId: id }) ? 'focused' : null;
  return <div data-row-key={rowKey} data-jump-hint-row="" className="relative df-drag-shiftable">
    <CurrentSidebarRow variant="session" selected={selected} icon={routineGroupIcon(group.source.data)}
      onClick={(event) => host?.onOpenTask?.(id, event)}>{group.title ?? t('Untitled')}</CurrentSidebarRow>
  </div>;
}
/** shared-22 Oi: the Code list's group renderer (keyed by wn(e.ref), the ref key). */
export function renderRoutineGroup(group) {
  return <SidebarRoutineGroupRow key={sessionRefKey(group.ref)} group={group} />;
}

const LIST_VIEW = Object.freeze({});
/** shared-22 $N's p4 for Code, presentation "section"; renderGroup is shared-22 Oi (renderRoutineGroup). */
export function SidebarRoutinesSection({ renderGroup = renderRoutineGroup, presentation = 'section' }) {
  const host = useContext(SidebarRoutinesHostContext);
  const listView = useContext(SidebarStatusLayout);
  if (!SIDEBAR_ROUTINES_ENABLED || !host) return null;
  const section = <CodeSidebarRoutines kind="code" presentation={presentation} renderGroup={renderGroup}
    onOpenTask={(id, event) => host.onOpenTask?.(id, event)} onOpenSession={(id, event) => host.onOpenSession?.(id, event)} />;
  return listView === null ? <SidebarStatusLayout.Provider value={LIST_VIEW}>{section}</SidebarStatusLayout.Provider> : section;
}

/** shared-21 hJ: a local routine run is live (and local is a shown environment). False outside the host. */
export function useLocalRoutineRunning() {
  return originalLocalRoutineRunning();
}

// W14-code r4 gen-final-4 (fr4-06): the routine runs' tasks, sessionId → scheduledTaskId (RoutineSessionsContext: every run
// the scheduler recorded, plus sessions whose metadata names a task). The official CCD session carries scheduledTaskId
// itself, and the Code list keeps a row only when shared-11 pw (`!e.scheduledTaskId && …`) holds, so a run is never a
// Sessions row: JK groups it under its task (BK "group") or hides it. A run the scheduler recorded before its metadata
// named the task has the task only here; source-sidebar.jsx passes this to listedSidebarSessions. Empty outside the host
// (or with local_sidebar_routines off: no task list is loaded).
const NO_RUN_TASKS = new Map();
export function useRoutineRunTasks() {
  const entries = useContext(RoutineSessionsContext);
  return useMemo(() => (entries?.length ? new Map(entries.map((entry) => [entry.item.ref.id, entry.scheduledTaskId])) : NO_RUN_TASKS), [entries]);
}
