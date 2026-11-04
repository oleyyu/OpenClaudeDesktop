// W14-code cccc-20: the Runs pane of a local session a scheduled task started (3.6556.2 cccc2cf0a Xk → oA, with uA the
// header, dA the Details link, fA the Running / Completed sections, cA → mA the run rows, gA / _A the status icon and
// text, vA "No runs yet", bA "Not a … run", lA the scroller, jb the pane body group).
//
// E84 route 2: the closure cannot be sliced as is (oA reads the CCD sessions store and the scheduled task list through
// shared-8 / shared-4 stores, mA the router, split-view and popout hooks), so this host restates it with the original
// class strings, copy and structure; every value the original takes from a generated binding comes from that same
// slice here: c511d59b8 t (Wc, the schedule text), c10bdd6e8 t (By, the status icons), cc0a875c8 t (nd, EmptyState),
// shared-2 Ff / Cd / md (wr relative time, Sr / Mr task name), shared-156 Rr (Ai, the minute clock), shared-18 sr (Ci,
// the scheduled-task / routine wording), and the CDS Badge / Icon / Pulse / Shimmer of shared-frame (view-tabs).
// Host data: src/runs-pane-model.mjs over the local-routines list, the host's sessions, their metadata and state.
//
// Local facts (fizzy `panels` off, `Vn("panels") && D(Wi)` false): lA / fA / mA take their non-panels classes and mA
// never animates the status shimmer. A local session has no awaiting-tool line (mA `awaiting` is the remote rA's) and
// no trailing slot. A plain click opens the run's session with this pane (`(m ?? p).push(t)` of the ?pane=runs href);
// ⌘/Ctrl-click opens it in a new window and ⌥-click in split view (mA's `s = e.metaKey || e.ctrlKey, c = s && v,
// l = e.altKey && !s && _ && !g` → `y(e, …)`): RunRow hands the click event to onOpen (W14-code pa2-05, main.jsx).
import React, { useEffect, useState } from 'react';
import { CdsBadge, CdsIcon, CdsPulse, CdsShimmer } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { r as scheduleText } from './generated/code-routines/c511d59b8-DUTlpzSr.mjs';
import { e as RUN_STATUS } from './generated/code-routines/c10bdd6e8-Dsd2w7_R.mjs';
import { f as EmptyState } from './generated/code-routines/cc0a875c8-Ba9KI-Fw.mjs';
import { pA as relativeTime, WM as taskDisplayName, RM as taskIdName } from './generated/routines-shared/shared-2-TF8v67kg.mjs';
import { fK as useMinuteClock } from './generated/routines-shared/shared-156-BLTosN8U.mjs';
import { lH as useScheduledTaskWording } from './generated/routines-shared/shared-18-D3y8YMFN.mjs';
import { useIntl } from './source-routines-shared-adapters.jsx';
import { runStatus, runsPaneModel, runsSessionHref, runsTaskHref } from './runs-pane-model.mjs';
import './source-runs-pane.css';
import { t } from '../electron/i18n/index.mjs';

// shared-frame yF (exported `gi`): the CDS shimmer cycle, mA hA's `-(performance.now() % le)`.
const SHIMMER_CYCLE_MS = 3e3;
const shimmerDelay = () => -(performance.now() % SHIMMER_CYCLE_MS);

// lA (non-panels classes).
function RunsScroller({ children }) {
  return <div className="h-full overflow-y-auto [scrollbar-gutter:stable_both-edges]">
    <div className="flex flex-col gap-sm px-2.5 py-2.5">{children}</div>
  </div>;
}

// uA, kind "local".
function RunsHeader({ name, scheduleText: schedule, trailing }) {
  return <header className="flex items-start justify-between gap-1.25">
    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
      <div className="flex items-center gap-1 min-w-0">
        <h2 className="text-body text-primary truncate">{name}</h2>
        <CdsBadge variant="neutral" icon="Laptop" className="shrink-0">{t('Local')}</CdsBadge>
      </div>
      {schedule && <p className="text-footnote text-muted-as-secondary truncate">{schedule}</p>}
    </div>
    {trailing}
  </header>;
}

// dA: hidden in a split view's second pane (`(jr()?.paneIndex ?? 0) > 0`).
function RunsDetailsLink({ href, paneIndex, onOpen }) {
  if (paneIndex > 0) return null;
  return <a href={href} className="shrink-0 text-footnote text-muted-as-secondary hover:text-primary no-underline"
    onClick={(event) => { event.preventDefault(); onOpen?.(); }}>{t('Details')}</a>;
}

// fA (non-panels: `flex flex-col gap-1`); null without runs.
function RunsSection({ heading, runs, renderRow }) {
  if (runs.length === 0) return null;
  return <section className="flex flex-col gap-1">
    <h3 className="text-footnote text-muted-as-secondary">{heading}</h3>
    <ul className="flex flex-col gap-1">{runs.map(renderRow)}</ul>
  </section>;
}

// gA.
function RunStatusIcon({ status }) {
  if (status === 'running') return <CdsPulse />;
  const { icon, className } = RUN_STATUS[status];
  const glyph = <CdsIcon name={icon} size="xs" className={className} />;
  if (status === 'failed') return <span className="flex" role="img" aria-label={t('Failed')}>{glyph}</span>;
  return glyph;
}

// _A.
const runStatusText = (status) => status === 'running' ? t('Running') : status === 'failed' ? t('Failed')
  : status === 'cancelled' ? t('Cancelled') : t('Completed');

// cA → mA (sessionType "local", non-panels). W14-code pa2-05: the click event goes to onOpen, which takes mA's
// `s = e.metaKey || e.ctrlKey, c = s && v, l = e.altKey && !s && _ && !g` branches (new window / split view).
export function RunRow({ run, isCurrent, onOpen }) {
  const intl = useIntl();
  const now = useMinuteClock();
  const [mountedAt] = useState(now);
  const [delay] = useState(shimmerDelay);
  const at = run.createdAt ?? run.lastActivityAt ?? mountedAt;
  const label = relativeTime(new Date(at), now, intl, 'past');
  const status = runStatus(run);
  const href = runsSessionHref(run.sessionId);
  const caret = ` shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-as-secondary group-hover:text-primary '}`;
  return <li className={`group rounded-lg ${isCurrent ? 'bg-fill-ghost-selected' : 'bg-alpha-1 hover:bg-alpha-2 focus-within:bg-alpha-2'}`}>
    <a href={href} aria-current={isCurrent ? 'page' : undefined}
      className="flex items-center gap-sm no-underline focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus px-2.5 py-md"
      onClick={(event) => { event.preventDefault(); onOpen?.(run.sessionId, event); }}>
      <span className="shrink-0 flex items-center justify-center size-[12px]"><RunStatusIcon status={status} /></span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5 text-footnote">
        <span className="text-body text-primary truncate first-letter:uppercase">{label}</span>
        <CdsShimmer active={false} delay={delay} variant="secondary" className="max-w-full self-start truncate text-muted-as-secondary">{runStatusText(status)}</CdsShimmer>
      </span>
      <CdsIcon name="CaretRight" size="sm" className={caret} />
    </a>
  </li>;
}

// bA.
function NotScheduledRun() {
  const scheduledWording = useScheduledTaskWording();
  return <EmptyState icon="Clock"
    title={scheduledWording ? t('Not a scheduled task run') : t('Not a routine run')}
    body={scheduledWording
      ? t('This session wasn’t started from a scheduled task. Open a session that a scheduled task started to see its run history here.')
      : t('This session wasn’t started from a routine. Open a session that a routine started to see its run history here.')} />;
}

// oA.
function RunsBody({ sessionId, rows, sessions, metadata, state, paneIndex, onOpenRun, onOpenTask }) {
  const intl = useIntl();
  const { scheduledTaskId, task, runs, running, completed } = runsPaneModel(sessionId, { rows, sessions, metadata, state });
  const now = useMinuteClock(!!task?.fireAt);
  if (!scheduledTaskId) return <NotScheduledRun />;
  const schedule = task ? scheduleText(task.cronExpression, intl, { jitterMinutes: Math.round((task.jitterSeconds ?? 0) / 60), fireAt: task.fireAt, nowMs: now }) : null;
  const name = task ? taskDisplayName(task) : taskIdName(scheduledTaskId);
  const row = (run) => <RunRow key={run.sessionId} run={run} isCurrent={run.sessionId === sessionId} onOpen={onOpenRun} />;
  return <RunsScroller>
    <RunsHeader name={name} scheduleText={schedule}
      trailing={<RunsDetailsLink href={runsTaskHref(scheduledTaskId)} paneIndex={paneIndex} onOpen={() => onOpenTask?.(scheduledTaskId)} />} />
    {runs.length === 0 ? <p className="py-1.25 text-footnote text-muted-as-secondary text-center">{t('No runs yet')}</p> : <>
      <RunsSection heading={t('Running')} runs={running} renderRow={row} />
      <RunsSection heading={t('Completed')} runs={completed} renderRow={row} />
    </>}
  </RunsScroller>;
}

// The scheduler's code tasks (local-routines list), reread on its change event (main.cjs { kind: 'local-routines' });
// null until the first list arrives (oA's `l` is null meanwhile: the name from the id, no schedule line).
function useCodeRoutineRows(call, subscribe) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (typeof call !== 'function') return undefined;
    let live = true;
    const load = () => Promise.resolve(call('local-routines', { action: 'list', kind: 'code' }))
      .then((list) => { if (live) setRows(Array.isArray(list) ? list : []); }, () => { if (live) setRows((value) => value ?? []); });
    load();
    const off = subscribe?.((event) => { if (event?.kind === 'local-routines') load(); });
    return () => { live = false; if (typeof off === 'function') off(); };
  }, [call, subscribe]);
  return rows;
}
const desktopEvents = (handler) => globalThis.window?.desktop?.onEvent?.(handler);

// The pane: the host pane chrome (FilePanel's .source-pane-header with the title and the tile controls), then Xk's jb
// body `{ "data-pane-retry-body": "", role: "group", "aria-label": Dt(intl, "runs"), className: "h-full outline-none" }`.
export function SourceRunsPane({ sessionId, call, subscribe = desktopEvents, sessions = [], metadata = {}, state = {}, paneIndex = 0,
  onOpenRun, onOpenTask, onClose, headerCenter = null, controls = null }) {
  const rows = useCodeRoutineRows(call, subscribe);
  const title = t('Runs');
  return <aside className="source-file-panel detail-panel" data-pane-kind="runs" aria-label={t('{title} panel', { title })}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && !event.defaultPrevented && event.currentTarget.contains(event.target) && !event.target.closest?.('[role="menu"]')) {
        event.stopPropagation();
        onClose?.();
      }
    }}>
    <header className="source-pane-header" data-pane-header="runs">
      <span className="source-pane-title">{title}</span>
      {headerCenter}
      {controls}
    </header>
    <div data-pane-retry-body="" role="group" aria-label={title} className="h-full outline-none">
      {sessionId ? <RunsBody sessionId={sessionId} rows={rows} sessions={sessions} metadata={metadata} state={state} paneIndex={paneIndex}
        onOpenRun={onOpenRun} onOpenTask={onOpenTask} /> : null}
    </div>
  </aside>;
}
