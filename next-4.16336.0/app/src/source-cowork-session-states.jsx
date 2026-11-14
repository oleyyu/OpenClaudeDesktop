// w13-coworkui-session-states (research/w13-coworkui.md cwui-26): a Cowork session that can no longer take messages
// shows the 3.6556.2 ended notice (c21f11e6d EM, src/generated/cowork-session-states) in place of the composer, as
// CoworkSessionView does: it passes `endedNotice` and ca2ef848d renders, instead of the composer,
// `f("div",{ref:Wn,className:"px-2 md:px-0 in-data-cds-dock-masked:bg-page",children:hn})` (and drops the other
// composer-side pieces it guards with `hn===void 0`). main.jsx wraps its composer slot (the auto-resume status, the
// turn box region, the composer, the Cowork home) in SourceCoworkSessionStates: while the session can take messages, or
// outside Cowork (no session passed), the slot renders unchanged.
//
// Reasons (CoworkSessionView's `ii = g_(X, t.sessionEnded)`, c8529cf9f f: `e==="failed"?"failed":t||e==="archived"?
// "archived":void 0`): an archived local session is "archived" and gets onRestore (the official passes it when the
// session can be unarchived), so it reads "This task is archived" with "Unarchive task" and a secondary "New task"; a
// session the core reports as failed (thread status systemError) is "failed": "This task has ended" with "New task". The
// Cowork VM runtime reports systemError after a turn its VM / SDK process failed (session-service.mjs status()); a core
// (local-core engine) reports its own.
// The read-only reasons ("read_only", the organization / role "cowork_off*" / "hub_off_role") come from a claude.ai plan
// or admin policy; this host has no account or organization (E59), so they never occur here.
import React, { useCallback } from 'react';
import { CoworkSessionEndedNotice } from './generated/cowork-session-states/index.mjs';
import { COWORK_NEW_TASK_HREF } from './source-cowork-session-states-adapters.jsx';

// The official ended reason of a host session row, or undefined while it can take messages. `liveStatus` is the thread's
// latest thread/status/changed (state.js threadStatus; w13-close-cowork-ui session-states-01): the session list row keeps
// the status it was listed with, the notification is newer.
export function coworkSessionEndedReason(session, liveStatus) {
  if (!session) return undefined;
  const current = liveStatus ?? session.status;
  const status = typeof current === 'string' ? current : current?.type;
  if (status === 'systemError') return 'failed';
  return session.archived === true ? 'archived' : undefined;
}

// session: the Cowork host row (undefined outside Cowork); onUnarchive(session) → Promise (rejects on failure: EM toasts
// shared-18 Cq.unarchive itself); onNewTask() opens a new Cowork task (the notice's "New task" link, shared-52 ml
// "/new?surface=cowork"); children: the composer slot shown while the session can take messages.
export function SourceCoworkSessionStates({ session, status, onUnarchive, onNewTask, children = null }) {
  const reason = coworkSessionEndedReason(session, status);
  const onRestore = reason === 'archived' && onUnarchive ? () => onUnarchive(session) : undefined;
  // CdsButton renders an anchor for `href`; this host has no router context, so the plain click goes to onNewTask
  // (modified clicks too: there is no other window or tab to open the route in).
  const onClickCapture = useCallback((event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link || link.getAttribute('href') !== COWORK_NEW_TASK_HREF) return;
    event.preventDefault();
    onNewTask?.();
  }, [onNewTask]);
  if (!reason) return children;
  return (
    <div className="px-2 md:px-0 in-data-cds-dock-masked:bg-page" onClickCapture={onClickCapture}>
      <CoworkSessionEndedNotice key={session.id} reason={reason} onRestore={onRestore} />
    </div>
  );
}
