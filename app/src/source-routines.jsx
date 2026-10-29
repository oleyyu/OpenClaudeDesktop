import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
// tasks-09: 2.42304.0 ccd3f68fe (Scheduled page) renders Oi = cd75b47e6 t, the same page shell the Sessions page
// uses (SessionsPageShell: band from shared-18 ey, the data-scrolls-under-page-header div) around the 2.42304.0
// CdsPage (view-tabs c193cfc9b k). Its panels variant (hairline line, stuck-mark/level-mark, tabs-row pinning,
// +16 scroll offset) is behind shared-frame vr("panels"), closed here (no CDS Root, no fizzy-lake parts); the
// default fade hides as "invisible opacity-0" with transition-[opacity,visibility].
import { SessionsPageShell as Page } from './source-sessions-primitives.jsx';
// R4g-routines RTC (CW-1), 3.6556.2 since w3-cowork-scheduled: the Scheduled page pieces. Cards, status line and divider
// are routines-shared's (cdbc75b4b); detail, templates, form, pictogram and field parts are cowork-scheduled's (ccd3f68fe
// ps / su / eu / $l, c97b955f1 La, shared-156 KG, shared-frame Field family Jj / Yj / Xj / Zj / nk); card, detail and form
// get the page's host from source-routine-cowork-page-adapters.jsx (the detail's back link is its backHref, answered with
// onBack; a run row opens its session through onSessionOpen). The starter template grid (RC-05): ccd3f68fe-C8Xiv_qI wraps
// the template cards in `w-full ${Wr(columns)}` with columns 2 (cdbc75b4b Wr, the hit-grid gaps the hit-row cards pair with).
import { ScheduledTaskStatusLine as RoutineStatus, ScheduledTaskDivider as RoutineDivider } from './generated/routines-shared/index.mjs';
import { ScheduledTaskMenu as CurrentScheduledTaskMenu, ScheduledTaskTemplateCard as RoutineTemplate, SCHEDULED_TASK_TEMPLATES as routineTemplates,
  scheduledTaskTemplateMessages as templateCopy, routineGridClass, routineTemplateTwoColumnGridClass, SCHEDULED_TASK_COPY as scheduledCopy,
  Pictogram as RoutinePictogram, STOPWATCH_PICTOGRAM as stopwatch, CdsField as Field, CdsFieldLabel as Label, CdsFieldDescription as Description,
  CdsFieldError as ErrorText, CdsTextArea as TextArea, KeepAwakeSwitch } from './generated/cowork-scheduled/index.mjs';
import { useKeepAwakeAvailable } from './source-routine-cowork-adapters.jsx';
// R6: view-tabs through its facade. CdsBanner = shared-frame ya (ccd3f68fe `L`), CdsDropdown = Jo (`S`), CdsConfirmationDialog
// = Xc (`k`), the same bindings ccd3f68fe-C8Xiv_qI imports.
import { CdsTextInput as TextInput, CdsBanner, CdsDropdown, CdsConfirmationDialog, CdsCheckbox } from './generated/view-tabs/index.js';
// V3-w13-coworkui-scheduled-page: the official list route's own helpers, published by chat-projects under their projects
// names (same bindings): shared-18 Ou (aC, the loading grid `ar`), c444bcdd7 t (`Pi`, search ↔ results keys) and
// c365fd3fe n (`Fi`, the search results announcement).
import { ProjectsLoadingSkeleton as LoadingGrid, useProjectsSearchKeys as useSearchKeys, useProjectsSearchAnnouncement as useSearchAnnouncement } from './generated/chat-projects/index.mjs';
import { CoworkScheduledTaskCard as RoutineCard, CoworkScheduledTaskDetail as RoutineDetail, CoworkUpsertScheduledTaskModal as OriginalRoutineForm } from './source-routine-cowork-page-adapters.jsx';
import { registerNativeFieldComponents } from './source-field-adapters.jsx';
import { toFormPermission } from './source-routine-form-adapters.jsx';
import { coworkHomeState } from './cowork-home-model.mjs';
import { RoutineContext, sourceRoutine } from './source-routine-adapters.jsx';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { createIntl } from './generated/chat/vendor-intl-DYfox5Co.js';
import { useLocalRoutines } from './use-local-routines.jsx';

registerNativeFieldComponents({ Field, Label, Description, ErrorText, TextInput, TextArea });

const active = task => task.runs?.some(run => ['starting', 'running'].includes(run.status));
const date = value => value ? new Date(value).toLocaleString(getLocale()) : t('—');
const copy = key => t(scheduledCopy[key].defaultMessage);

// ccd3f68fe-C8Xiv_qI zu.create: the "Create with Claude" prompt (Vu `an({ prompt: "" })` → shared-18 hK; a translated
// prompt is delivered as a composer draft, the English one is sent).
export const CREATE_WITH_CLAUDE_PROMPT = 'I want to set up a scheduled task. Briefly explain how scheduled tasks work in Cowork, then ask me a few questions to figure out what I’d like Claude to do and when it should run.';
// w13-close-cowork-ui (coworkui-scheduled-03, E63 A): a starter template starts its Cowork task at once, as ccd3f68fe nu
// does: `he(e,t)` → `me(e)`: `let t=tu(m,e,"scheduled"); if(t.delivery==="draft"){zn(t.text),C.push(H);return}` then
// `y({prompt:t.text,title:…$l[e.title]…,skipRedirect:!0,…})` with the template card busy (`busy:L===e.id`, the others
// disabled) and the grid `aria-busy`. tu is shared-18 hK over the template's prompt message with {kind:"scheduled"}: the
// text in the app's language, "send" when it reads the same as the English, otherwise "draft" (a translated prompt goes
// to the composer for the user to send).
const englishIntl = createIntl({ locale: 'en', defaultLocale: 'en', messages: {} });
export function templatePrompt(template, locale = getLocale()) {
  const message = templateCopy[template.prompt];
  const english = englishIntl.formatMessage(message, { kind: 'scheduled' });
  const text = createIntl({ locale, defaultLocale: locale, messages: {} }).formatMessage({ ...message, defaultMessage: t(message.defaultMessage) }, { kind: 'scheduled' });
  return { text, delivery: text === english ? 'send' : 'draft', title: t(templateCopy[template.title].defaultMessage) };
}
// ccd3f68fe Wu: the starter templates stay under the list while the page holds at most this many tasks.
const MORE_IDEAS_LIMIT = 5;

// ccd3f68fe Zu `po` → shared-16 Zp(…, t, "local", name): the delete confirmation of a local task (title t.deleteEntity,
// body t.deleteBody, confirm "Delete" K3r6DQW7h+, danger).
// The dialog's children (`ho`, w13-close-cowork-ui coworkui-scheduled-01): for every local task (`J!==null&&du(J)`,
// du(e) = e.source!=="remote") the CdsCheckbox (shared-frame xi) "Also delete the folder that holds this task’s
// instructions" (xJ/i0CSic6) with "Other files saved in that folder are deleted too. Folders the task works in aren’t
// affected." (IlvCvjZQ6s) in a "mt-3" div; checked, the delete removes the task's instructions folder
// (electron/local-routines.mjs removeFiles). The detail's own dialog is ps `Le` (canRemoveFiles).
export function deleteDialogCopy(task) {
  return { title: copy('deleteEntity'), description: t(scheduledCopy.deleteBody.defaultMessage, { taskName: task?.name ?? '', name: task?.name ?? '' }),
    confirmLabel: t('Delete') };
}

// After a delete: the sessions the task's finished runs started, still listed and not archived yet, are archived (each on
// its own; one that fails stays). Returns the thread ids it asked to archive.
// The stored rules as the official list (listedApprovedPermissions: {toolName, ruleContent?}), one per official key
// (`${toolName}\0${ruleContent ?? ""}`, ps Is's key); the host keeps a rule per folder / escalation, the page removes by key.
export function listedApprovals(rules) {
  const seen = new Set(), listed = [];
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (typeof rule?.toolName !== 'string' || !rule.toolName) continue;
    const ruleContent = typeof rule.ruleContent === 'string' ? rule.ruleContent : undefined;
    const key = `${rule.toolName}\0${ruleContent ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listed.push({ toolName: rule.toolName, ...(ruleContent !== undefined && { ruleContent }) });
  }
  return listed;
}

export function RemoveTaskFilesCheckbox({ checked, onCheckedChange }) {
  return <div className="mt-3"><CdsCheckbox checked={checked} onCheckedChange={onCheckedChange}
    label={t('Also delete the folder that holds this task’s instructions')}
    description={t('Other files saved in that folder are deleted too. Folders the task works in aren’t affected.')} /></div>;
}

export async function archiveTaskSessions(call, task, sessions = []) {
  const known = new Map(sessions.map(session => [session.id, session]));
  const threads = [...new Set((task?.runs ?? []).filter(run => run.threadId && !['starting', 'running'].includes(run.status)).map(run => run.threadId))]
    .filter(id => known.has(id) && !known.get(id).archived);
  await Promise.all(threads.map(threadId => Promise.resolve().then(() => call('rpc', { method: 'thread/archive', params: { threadId } })).catch(() => {})));
  return threads;
}

// The list route body (ccd3f68fe Zu, not unified: shared-18 gl = bT → OT() is the claude_ai_unified_routines server gate,
// off here, so no tabs (`ja`), no filter (`ka`), the subtitle shows and the sort is the "Sort by …" dropdown in `actions`
// (`hi`; shared-78 kw, the hub look, is false here, so no Sort icon action `mi`)). Rendered inside RoutineContext.
export function ScheduledTaskList({ tasks, loadError = '', error = '', query, onQueryChange, sort, onSortChange, busy = null, starting = false,
  startingTemplate = null, offered = true, onSelect, onRunNow, onEdit, onDelete, onSetUpManually, onCreateWithClaude, onTemplate }) {
  const inputRef = useRef(null), results = useRef(null), newTaskRef = useRef(null), resultsId = useId();
  const rows = useMemo(() => (tasks ?? []).filter(task => `${task.name} ${task.prompt}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (a.nextRunAt ?? Infinity) - (b.nextRunAt ?? Infinity) || a.name.localeCompare(b.name)), [tasks, query, sort]);
  const { onInputKeyDown, onResultsKeyDown } = useSearchKeys(inputRef, results);
  const searching = query.trim() !== '';
  const loading = tasks === null && !loadError;
  // Fi(count, query, { singular, plural }): read out after the search settles (`ma`, shown while searching: `yi`).
  const { announcement } = useSearchAnnouncement(rows.length, searching ? query.trim() : '', { singular: copy('singular'), plural: copy('plural') });
  // Vu `offered` (M = engine === "chat" || canCreate && coworkStartable; SourceRoutines passes it): Create with Claude
  // and the starter templates (`nr = d && tn`) show only when offered.
  const keepAwakeKnown = useKeepAwakeAvailable(); // Qe = Bi(), c1e3f823e n
  const startingLabel = starting ? t('Starting…') : undefined;
  const sortItems = [['nextRun', 'Next run'], ['name', 'Name']].map(([value, label]) =>
    ({ label: t(label), checked: sort === value, checkedRole: 'radio', onSelect: () => onSortChange(value) }));
  // nu: the template grid, `aria-busy` while a template starts its session (`ge`); the starting card is busy, the others
  // disabled (`(d||L!==null)&&L!==e.id`, d the page's own starting state).
  const templates = <div aria-busy={startingTemplate !== null} className="w-full"><div className={`w-full ${routineTemplateTwoColumnGridClass}`}>
    {routineTemplates.map((template, index) => <RoutineTemplate key={template.id} template={template} busy={startingTemplate === template.id}
      disabled={(starting || startingTemplate !== null) && startingTemplate !== template.id} onSelect={() => onTemplate(template, index)} />)}
  </div></div>;
  return <Page title={copy('title')} contentGap="lg"
    subtitle={t('Run tasks on a schedule or whenever you need them.')}
    search={{ inputRef, value: query, onChange: onQueryChange, placeholder: copy('searchPlaceholder'), label: copy('searchLabel'),
      resultsId: !loading && rows.length > 0 ? resultsId : undefined, onInputKeyDown, autoFocusHeldQuery: true, disabledReason: startingLabel }}
    actions={<CdsDropdown variant="secondary" align="end" disabled={starting} items={sortItems}
      label={<><span className="text-muted-as-secondary">{t('Sort by')}{' '}</span>{t(sort === 'nextRun' ? 'Next run' : 'Name')}</>} />}
    primaryAction={<CdsDropdown.Root>
      <CdsDropdown.TriggerButton ref={newTaskRef} variant="primary" busy={starting}>{t('New task')}</CdsDropdown.TriggerButton>
      {/* shared-18 et (NK): Create with Claude (icon Chat) when offered, then Set up manually (icon Settings). */}
      <CdsDropdown.Popup align="end">
        {offered && <CdsDropdown.Item icon="Chat" onClick={onCreateWithClaude}>{t('Create with Claude')}</CdsDropdown.Item>}
        <CdsDropdown.Item icon="Settings" onClick={onSetUpManually}>{t('Set up manually')}</CdsDropdown.Item>
      </CdsDropdown.Popup>
    </CdsDropdown.Root>}
    primaryActionCompactIcon="Add"
    status={starting ? t('Starting…') : !loading && searching ? announcement : undefined}>
    <div className="flex flex-col">
      {/* Na: the keep-awake hint on this device (`_t`). Tr (a remote task) is false for local tasks and the
          yukon_silver_dramatic_shrimp_clocks gate is off, so it is t.keepAwakeHint, not Uu.keepAwakeHintLocal. The
          banner's action (w13-close-cowork-ui scheduled-02) is `Qe ? i("div",{className:"flex items-center pe-md",
          children:i(go,{size:"md",context:"scheduled-task"})}) : void 0`, Qe = c1e3f823e n (the desktop preference
          keepAwakeEnabled is known), go = c6ad19bb9 m (KeepAwakeSwitch; src/keep-awake-model.mjs). */}
      <div className="w-full mb-6">
        <CdsBanner className="!w-full [--cds-ring-inner:1px] [--cds-ring-outer:0px]" action={keepAwakeKnown
          ? <div className="flex items-center pe-md"><KeepAwakeSwitch size="md" context="scheduled-task" /></div> : undefined}>{copy('keepAwakeHint')}</CdsBanner>
      </div>
      {loadError && <div className="w-full mb-6"><CdsBanner variant="danger">{copy('loadFailed')}</CdsBanner></div>}
      {/* Host difference: the official page reports a failed run/edit/delete in a toast; the host keeps it inline. */}
      {error && <p role="alert" className="text-body text-danger">{error}</p>}
      {loading && <LoadingGrid count={8} columns="two" variant="text" />}
      {!loading && !loadError && rows.length === 0 && (searching
        ? <div className="mt-4 text-body text-muted-as-secondary">{copy('noSearchResults')}</div>
        : <div className="flex flex-col items-center gap-lg py-8">
          <div className="flex flex-col items-center gap-md text-body text-muted-as-secondary">
            <RoutinePictogram asset={stopwatch} size="md" className="text-primary" />
            <p>{copy('emptyState')}</p>
          </div>
          {offered && <><RoutineDivider className="my-6" />{templates}</>}
        </div>)}
      {!loading && rows.length > 0 && <ul role="list" ref={results} id={resultsId} onKeyDown={onResultsKeyDown} aria-label={copy('plural')}
        inert={starting} aria-busy={starting} className={starting ? `${routineGridClass} opacity-50 transition-opacity` : routineGridClass}>
        {rows.map(task => <li key={task.id} className="h-full" onClick={event => { if (event.target.closest('[data-primary]')) onSelect(task.id); }}>
          <RoutineCard task={sourceRoutine(task)} title={task.name} statusChip={<RoutineStatus task={sourceRoutine(task)} />}
            statusDot={active(task) ? 'running' : task.runs[0]?.status === 'failed' ? 'failed' : undefined}
            isRunning={active(task) || busy === task.id} onRunNow={() => onRunNow(task)}
            onEdit={() => onEdit(task)} onDelete={() => onDelete(task)} />
        </li>)}
      </ul>}
      {!loading && rows.length > 0 && offered && !searching && (tasks?.length ?? 0) <= MORE_IDEAS_LIMIT && <div className="mt-8 flex flex-col gap-lg">
        <RoutineDivider />
        {templates}
      </div>}
      <div className="pb-6" />
    </div>
  </Page>;
}

export function SourceRoutines({ call, onSession, onCreateWithClaude, onStartTemplate, coworkStartable = true, selectedId, onSelect: setSelectedId, onBack, executionProfile, models = [], bypassEnabled = false, sessions = [], sessionMetadata = {}, state = {} }) {
  const { tasks, error: loadError, reload } = useLocalRoutines(call, 'cowork');
  const [error, setError] = useState('');
  const [query, setQuery] = useState(''), [sort, setSort] = useState('nextRun');
  const [editing, setEditing] = useState(null), [deleting, setDeleting] = useState(null), [removeFiles, setRemoveFiles] = useState(false);
  const [busy, setBusy] = useState(null), [starting, setStarting] = useState(false), [startingTemplate, setStartingTemplate] = useState(null);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; }, []);
  const mutate = async request => {
    setError(''); setBusy(request.id ?? 'new');
    try { const result = await call('local-routines', request); await reload(); return result; }
    finally { setBusy(null); }
  };
  const act = request => mutate(request).catch(error => setError(error.message));
  // ccd3f68fe Zu Yr → updateScheduledTaskStatus(id, "deleted"): deleting a task archives the sessions its runs started
  // (deleteBody "Any sessions from this task will be archived."). Here the task goes first, then each finished run's
  // session is archived through the thread/archive request the sidebar's Archive uses (main.cjs announces the
  // session-list change to every window). A run still going keeps its session.
  const removeTask = async (task, files = false) => {
    await mutate({ action: 'delete', id: task.id, ...(files === true && { removeFiles: true }) });
    await archiveTaskSessions(call, task, sessions);
  };
  // Vu `offered` (`M = x === "chat" || t && j`): the engine here is Cowork and the desktop bridge creates tasks (t), so
  // it is whether a Cowork task can start (j; the host's coworkStartable: false when Cowork is off, CODE_DESKTOP_COWORK=0).
  // Zu then wires `onCreateWithClaude: tn ? mr : void 0` and shows the templates only when offered (coworkui-placeholder-02).
  const offered = coworkStartable !== false;
  // Vu `mr` (Create with Claude): the official prompt goes to a new Cowork task. The host's composer takes it when it
  // offers onCreateWithClaude (a returned promise holds "Starting…"); otherwise the new Cowork task opens without it.
  const createWithClaude = () => {
    if (!offered) return;
    const prompt = t(CREATE_WITH_CLAUDE_PROMPT);
    if (typeof onCreateWithClaude !== 'function') { onSession?.(null, { surface: 'cowork' }); return; }
    const pending = onCreateWithClaude(prompt);
    if (pending && typeof pending.then === 'function') {
      setStarting(true);
      Promise.resolve(pending).catch(error => setError(error?.message ?? String(error))).finally(() => { if (live.current) setStarting(false); });
    }
  };
  // nu he / me: a template's prompt starts a new Cowork task (onStartTemplate: the host sends it from the Cowork home);
  // a translated prompt, or a host without onStartTemplate, becomes the Cowork composer's draft (onCreateWithClaude).
  const startTemplate = template => {
    if (!offered || startingTemplate !== null || starting) return;
    const prompt = templatePrompt(template);
    if (prompt.delivery === 'draft' || typeof onStartTemplate !== 'function') {
      if (typeof onCreateWithClaude === 'function') void Promise.resolve(onCreateWithClaude(prompt.text)).catch(error => setError(error?.message ?? String(error)));
      else onSession?.(null, { surface: 'cowork' });
      return;
    }
    setStartingTemplate(template.id); setStarting(true);
    Promise.resolve().then(() => onStartTemplate(prompt.text, { title: prompt.title })).catch(error => setError(error?.message ?? String(error)))
      .finally(() => { if (live.current) { setStartingTemplate(null); setStarting(false); } });
  };
  // w13-close-cowork-ui (approvals crossLane): the detail's "Always allowed" list (ps `t.approvedPermissions?.length && qe`,
  // qe = onRemoveApprovedPermission) lists the rules a run's "Allow for this task" kept (routine-approvals.mjs) and removes
  // one as ccd3f68fe Fr does: `removeApprovedPermission(e, n, r)` (task id, toolName, ruleContent), a failure reading
  // "Tool approval couldn’t be removed. You can try again." (E7Iiw03bQs; inline here, the page has no toast).
  const removeApproval = (task, toolName, ruleContent) => mutate({ action: 'remove-approval', id: task.id, toolName,
    ...(typeof ruleContent === 'string' && { ruleContent }) }).catch(() => setError(t('Tool approval couldn’t be removed. You can try again.')));
  const selected = tasks?.find(task => task.id === selectedId);
  const taskSource = selected && { ...sourceRoutine(selected), approvedPermissions: listedApprovals(selected.approvedPermissions) };
  const home = useMemo(() => coworkHomeState(sessions, sessionMetadata, state), [sessions, sessionMetadata, state]);
  const runSessions = selected?.runs.filter(run => run.threadId).map(run => {
    const live = home.rows.find(row => row.sessionId === run.threadId);
    return { ...live, sessionId: run.threadId, createdAt: run.startedAt,
      origin: run.trigger === 'scheduled' ? 'scheduled_trigger' : 'force_run_trigger', ranOn: 'this_computer',
      lastActivityAt: run.finishedAt ?? run.startedAt,
      isRunning: ['starting', 'running'].includes(run.status),
      liveStatus: live?.liveStatus === 'awaiting' ? 'awaiting' : ['starting', 'running'].includes(run.status) ? 'running' : 'idle',
      error: run.status === 'failed' || run.status === 'interrupted' ? run.error ?? run.status : undefined,
      // R4i-routines RI2 (Y3-W5): ccd3f68fe ps shows a run's state through shared-18 $D (hasError: !!e.error, errorCategory:
      // e.errorCategory → UD → wD/Ft): an interrupted run is the official process_interrupted error, "Session was
      // interrupted", not the generic "Something went wrong" (2.42304.0 has no separate Interrupted label).
      ...(run.status === 'interrupted' && { errorCategory: 'process_interrupted' }) };
  }) ?? [];
  const editingSource = useMemo(() => editing?.id ? { ...sourceRoutine(editing), userSelectedFolders: [editing.cwd], permissionMode: toFormPermission(editing.options.permission) } : undefined, [editing]);
  const initialValues = useMemo(() => ({ permissionMode: toFormPermission(executionProfile.permission), model: executionProfile.model }),
    [executionProfile.permission, executionProfile.model]);
  const existingNames = useMemo(() => new Set((tasks ?? []).map(task => task.name)), [tasks]);
  const deleteCopy = deleting ? deleteDialogCopy(deleting) : null;
  return <RoutineContext.Provider value={{ Menu: CurrentScheduledTaskMenu, copy: scheduledCopy, mutate, error: setError, formError: error, busy, task: selected, editingTask: editing, readState: home.readState, call, models, bypassEnabled, executionProfile }}>
    <div className="surface-routines cds-root" data-density="comfortable">
      {selectedId && tasks === null ? <p role="status" className="text-muted text-body p-md">{loadError || t('Loading…')}</p> : selected ? <>
        {error && <p role="alert" className="text-body text-danger px-md">{error}</p>}
        <RoutineDetail key={selected.id} scheduledTask={taskSource} sessions={runSessions}
          isRunning={active(selected) || busy === selected.id} isDeleting={busy === selected.id}
          onRunNow={() => act({ action: 'run', id: selected.id })}
          onEnable={() => act({ action: 'toggle', id: selected.id, enabled: true })}
          onDisable={() => act({ action: 'toggle', id: selected.id, enabled: false })}
          onEdit={() => setEditing(selected)} onRemoveApprovedPermission={(toolName, ruleContent) => removeApproval(selected, toolName, ruleContent)}
          canRemoveFiles onDelete={async files => {
            try { await removeTask(selected, files); setSelectedId(null); } catch (error) { setError(error.message); }
          }} onBack={onBack} onSessionOpen={onSession} sessionHrefPrefix="/cowork" />
        {selected.runs.filter(run => !run.threadId && run.error).map(run => <p key={run.id} role="alert" className="text-body text-danger px-md">{date(run.startedAt)} · {run.error}</p>)}
      </> : <ScheduledTaskList tasks={tasks} loadError={loadError} error={error} query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort}
        busy={busy} starting={starting} startingTemplate={startingTemplate} onSelect={setSelectedId} onRunNow={task => act({ action: 'run', id: task.id })}
        onEdit={task => setEditing(task)} onDelete={task => { setRemoveFiles(false); setDeleting(task); }} onSetUpManually={() => setEditing({})}
        offered={offered} onCreateWithClaude={offered ? createWithClaude : undefined} onTemplate={startTemplate} />}
      {editing && <OriginalRoutineForm isOpen onClose={() => { setEditing(null); setError(''); }} existingNames={existingNames}
        editingTask={editingSource} initialValues={initialValues} initialSurface="chat" />}
      {/* ccd3f68fe Zu `_o`: k (CdsConfirmationDialog) open while a task is picked for deletion; it stays open (busy) until
          the delete settles (closeOnConfirm off), as the official Yr closes it with Vt(null) on success. */}
      {deleting && <CdsConfirmationDialog open onOpenChange={open => { if (!open && !busy) setDeleting(null); }} title={deleteCopy.title}
        description={deleteCopy.description} confirmLabel={deleteCopy.confirmLabel} confirmVariant="danger" onConfirm={async () => {
          try { await removeTask(deleting, removeFiles); if (selectedId === deleting.id) setSelectedId(null); setDeleting(null); } catch (error) { setError(error.message); }
        }}><RemoveTaskFilesCheckbox checked={removeFiles} onCheckedChange={setRemoveFiles} /></CdsConfirmationDialog>}
    </div>
  </RoutineContext.Provider>;
}
