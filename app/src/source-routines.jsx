import React, { useMemo, useRef, useState } from 'react';
// tasks-09: 2.42304.0 ccd3f68fe (Scheduled page) renders Oi = cd75b47e6 t, the same page shell the Sessions page
// uses (SessionsPageShell: band from shared-18 ey, the data-scrolls-under-page-header div) around the 2.42304.0
// CdsPage (view-tabs c193cfc9b k). Its panels variant (hairline line, stuck-mark/level-mark, tabs-row pinning,
// +16 scroll offset) is behind shared-frame vr("panels"), closed here (no CDS Root, no fizzy-lake parts); the
// default fade hides as "invisible opacity-0" with transition-[opacity,visibility].
import { SessionsPageShell as Page } from './source-sessions-primitives.jsx';
// R4g-routines RTC (CW-1): the 2.42304.0 Scheduled page pieces. Cards, status line and divider are routines-shared's
// (cdbc75b4b Ji / ji / Yi); detail, templates, form, pictogram and field parts are cowork-scheduled's (ccd3f68fe qo / el /
// Xc / Yc, c97b955f1 Ca, shared-156 sB, shared-frame Field family); card, detail and form get the page's host from
// source-routine-cowork-page-adapters.jsx.
import { ScheduledTaskStatusLine as RoutineStatus, ScheduledTaskDivider as RoutineDivider } from './generated/routines-shared/index.mjs';
import { ScheduledTaskMenu as CurrentScheduledTaskMenu, ScheduledTaskTemplateCard as RoutineTemplate, SCHEDULED_TASK_TEMPLATES as routineTemplates,
  scheduledTaskTemplateMessages as templateCopy, routineGridClass, routineTemplateGridClass, routineTemplateColumnsClass, SCHEDULED_TASK_COPY as scheduledCopy,
  Pictogram as RoutinePictogram, STOPWATCH_PICTOGRAM as stopwatch, CdsField as Field, CdsFieldLabel as Label, CdsFieldDescription as Description,
  CdsFieldError as ErrorText, CdsTextArea as TextArea } from './generated/cowork-scheduled/index.mjs';
import { CdsTextInput as TextInput } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { CoworkScheduledTaskCard as RoutineCard, CoworkScheduledTaskDetail as RoutineDetail, CoworkUpsertScheduledTaskModal as OriginalRoutineForm } from './source-routine-cowork-page-adapters.jsx';
import { registerNativeFieldComponents } from './source-field-adapters.jsx';
import { toFormPermission } from './source-routine-form-adapters.jsx';
import { coworkHomeState } from './cowork-home-model.mjs';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
import { SourceDialog } from './source-dialog.jsx';
import { RoutineContext, sourceRoutine } from './source-routine-adapters.jsx';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { useLocalRoutines } from './use-local-routines.jsx';

registerNativeFieldComponents({ Field, Label, Description, ErrorText, TextInput, TextArea });

const active = task => task.runs?.some(run => ['starting', 'running'].includes(run.status));
const date = value => value ? new Date(value).toLocaleString(getLocale()) : t('—');

export function SourceRoutines({ call, onSession, selectedId, onSelect: setSelectedId, onBack, executionProfile, models = [], bypassEnabled = false, sessions = [], sessionMetadata = {}, state = {} }) {
  const { tasks, error: loadError, reload } = useLocalRoutines(call, 'cowork');
  const [error, setError] = useState('');
  const [query, setQuery] = useState(''), [sort, setSort] = useState('nextRun');
  const [editing, setEditing] = useState(null), [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(null), inputRef = useRef(null), results = useRef(null);
  const mutate = async request => {
    setError(''); setBusy(request.id ?? 'new');
    try { const result = await call('local-routines', request); await reload(); return result; }
    finally { setBusy(null); }
  };
  const act = request => mutate(request).catch(error => setError(error.message));
  const rows = useMemo(() => (tasks ?? []).filter(task => `${task.name} ${task.prompt}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (a.nextRunAt ?? Infinity) - (b.nextRunAt ?? Infinity) || a.name.localeCompare(b.name)), [tasks, query, sort]);
  const selected = tasks?.find(task => task.id === selectedId);
  const taskSource = selected && sourceRoutine(selected);
  const home = useMemo(() => coworkHomeState(sessions, sessionMetadata, state), [sessions, sessionMetadata, state]);
  const runSessions = selected?.runs.filter(run => run.threadId).map(run => {
    const live = home.rows.find(row => row.sessionId === run.threadId);
    return { ...live, sessionId: run.threadId, createdAt: run.startedAt,
      origin: run.trigger === 'scheduled' ? 'scheduled_trigger' : 'force_run_trigger', ranOn: 'this_computer',
      lastActivityAt: run.finishedAt ?? run.startedAt,
      isRunning: ['starting', 'running'].includes(run.status),
      liveStatus: live?.liveStatus === 'awaiting' ? 'awaiting' : ['starting', 'running'].includes(run.status) ? 'running' : 'idle',
      error: run.status === 'failed' || run.status === 'interrupted' ? run.error ?? run.status : undefined,
      // R4i-routines RI2 (Y3-W5): ccd3f68fe qo shows a run's state through shared-18 $D (hasError: !!e.error, errorCategory:
      // e.errorCategory → UD → wD/Ft): an interrupted run is the official process_interrupted error, "Session was
      // interrupted", not the generic "Something went wrong" (2.42304.0 has no separate Interrupted label).
      ...(run.status === 'interrupted' && { errorCategory: 'process_interrupted' }) };
  }) ?? [];
  const editingSource = useMemo(() => editing?.id ? { ...sourceRoutine(editing), userSelectedFolders: [editing.cwd], permissionMode: toFormPermission(editing.options.permission) } : undefined, [editing]);
  const initialValues = useMemo(() => ({ permissionMode: toFormPermission(executionProfile.permission), model: executionProfile.model,
    ...(editing?.template ? { name: t(templateCopy[editing.template.title].defaultMessage),
      description: t(templateCopy[editing.template.description].defaultMessage), prompt: editing.template.promptBody,
      cronExpression: editing.template.cron, source: 'local', bindToComputer: true } : {}),
  }), [executionProfile.permission, executionProfile.model, editing?.template]);
  const existingNames = useMemo(() => new Set((tasks ?? []).map(task => task.name)), [tasks]);
  return <RoutineContext.Provider value={{ Menu: CurrentScheduledTaskMenu, copy: scheduledCopy, mutate, error: setError, formError: error, busy, task: selected, editingTask: editing, readState: home.readState, call, models, bypassEnabled, executionProfile }}>
    <div className="surface-routines cds-root" data-density="comfortable">
      {selectedId && tasks === null ? <p role="status" className="text-muted text-body p-md">{loadError || t('Loading…')}</p> : selected ? <>
        {error && <p role="alert" className="text-body text-danger px-md">{error}</p>}
        <RoutineDetail key={selected.id} scheduledTask={taskSource} sessions={runSessions}
          isRunning={active(selected) || busy === selected.id} isDeleting={busy === selected.id}
          onRunNow={() => act({ action: 'run', id: selected.id })}
          onEnable={() => act({ action: 'toggle', id: selected.id, enabled: true })}
          onDisable={() => act({ action: 'toggle', id: selected.id, enabled: false })}
          onEdit={() => setEditing(selected)} onDelete={async () => {
            try { await mutate({ action: 'delete', id: selected.id }); setSelectedId(null); } catch (error) { setError(error.message); }
          }} onBack={onBack} onSessionClick={onSession} sessionHrefPrefix="/cowork" />
        {selected.runs.filter(run => !run.threadId && run.error).map(run => <p key={run.id} role="alert" className="text-body text-danger px-md">{date(run.startedAt)} · {run.error}</p>)}
      </> : <Page title={t('Scheduled tasks')} contentGap="lg"
        subtitle={t('Run tasks on a schedule or whenever you need them.')}
        primaryAction={<Button variant="primary" onClick={() => setEditing({})}>{t('New task')}</Button>}
        primaryActionCompactIcon="Add"
        search={{ inputRef, value: query, onChange: setQuery, onClear: () => setQuery(''), placeholder: t('Search scheduled tasks...'), label: t('Search scheduled tasks'), resultsId: 'local-routine-results',
          onInputKeyDown: event => { if (event.key === 'ArrowDown') { event.preventDefault(); results.current?.querySelector('[data-primary]')?.focus(); } } }}
        iconActions={[{ key: 'sort', icon: 'Sort', label: t('Sort tasks'), items: [['nextRun', 'Next run'], ['name', 'Name']].map(([value, label]) => ({ label: t(label), checkedRole: 'radio', checked: sort === value, onSelect: () => setSort(value) })) }]}>
        <p className="text-body text-muted">{t('Scheduled tasks run while OpenClaude Desktop is open and this computer is awake. Missed runs are skipped when the app restarts.')}</p>
        {(error || loadError) && <p role="alert" className="text-body text-danger">{error || loadError}</p>}
        {tasks === null ? <p role="status" className="text-muted text-body">{t('Loading…')}</p>
          : !rows.length ? <div className="flex flex-col items-center gap-lg py-8">
            <div className="flex flex-col items-center gap-md text-body text-muted">
              {!query && <RoutinePictogram asset={stopwatch} size="md" className="text-primary" />}
              <p>{t(query ? 'No scheduled tasks match your search.' : 'No scheduled tasks yet.')}</p>
            </div>
            {!query && <><RoutineDivider className="my-6" /><div className={`${routineTemplateGridClass} ${routineTemplateColumnsClass}`}>
              {routineTemplates.map(template => <RoutineTemplate key={template.id} template={template} onSelect={() => setEditing({ template })} />)}
            </div></>}
          </div> : <ul id="local-routine-results" ref={results} className={routineGridClass} aria-label={t('Scheduled tasks')}
            onKeyDown={event => { if (event.key === 'Escape') inputRef.current?.focus(); }}>
            {rows.map(task => <li key={task.id} className="h-full" onClick={event => { if (event.target.closest('[data-primary]')) setSelectedId(task.id); }}>
              <RoutineCard task={sourceRoutine(task)} title={task.name} statusChip={<RoutineStatus task={sourceRoutine(task)} />}
                statusDot={active(task) ? 'running' : task.runs[0]?.status === 'failed' ? 'failed' : undefined}
                isRunning={active(task) || busy === task.id} onRunNow={() => act({ action: 'run', id: task.id })}
                onEdit={() => setEditing(task)} onDelete={() => setDeleting(task)} />
            </li>)}
          </ul>}
      </Page>}
      {editing && <OriginalRoutineForm isOpen onClose={() => { setEditing(null); setError(''); }} existingNames={existingNames}
        editingTask={editingSource} initialValues={initialValues} initialSurface="chat" />}
      {deleting && <SourceDialog title={t('Delete scheduled task?')} density="comfortable" onClose={busy ? undefined : () => setDeleting(null)}
        footer={<><Button variant="ghost" disabled={!!busy} onClick={() => setDeleting(null)}>{t('Cancel')}</Button><Button variant="primary" disabled={!!busy} busy={!!busy} onClick={async () => {
          try { await mutate({ action: 'delete', id: deleting.id }); if (selectedId === deleting.id) setSelectedId(null); setDeleting(null); } catch (error) { setError(error.message); }
        }}>{t('Delete')}</Button></>}><p className="text-body py-3">{t('This removes the schedule. Existing conversations and files are kept.')}</p></SourceDialog>}
    </div>
  </RoutineContext.Provider>;
}
