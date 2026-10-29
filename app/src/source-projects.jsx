import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
// w10-curchat-projects: the 3.6556.2 projects page parts (scripts/extract-chat-projects.mjs). The gallery layout,
// ProjectCard and the loading skeleton are re-exported there from code-routines / routines-shared (D1, one copy).
import { GalleryPageLayout, ProjectSpaceCard, ProjectsEmptyState as EmptyState, ProjectsLoadingSkeleton,
  useProjectsSearchKeys, useProjectsSearchAnnouncement, ProjectInstructionsSection, ProjectRailDivider, ProjectSessionsHeading, useProjectRecommendations,
  ProjectPageHeader, ProjectBreadcrumb, ProjectKnowledgeDropZone, ProjectMemorySection, ProjectSessionTable, RenameChatDialog } from './generated/chat-projects/index.mjs';
import { CdsButton, CdsDropdown, CdsIcon, CdsTextInput as TextInput } from './generated/view-tabs/index.js';
import { SourceSettingsButton as Button } from './source-settings-button.jsx';
// 3.6556.2 shared-frame nk: the one sliced copy is cowork-scheduled's (its routine form and the native field
// registry use it); view-tabs does not publish nk, and a second copy there would break D1.
import { CdsTextArea as TextArea } from './generated/cowork-scheduled/index.mjs';
import { LocalProjectContext, LocalProjectSpacesContext, ProjectRecommendationsContext } from './source-project-v3-adapters.jsx';
import { RoutinesSharedHost, useErrors } from './source-routines-shared-adapters.jsx';
import { SourceDialog } from './source-dialog.jsx';
// w13-chatfn-projects: the project's knowledge (c71dee58b / cf2f34ee4 / c52b32660) and Composer mode (c71dee58b td).
import { SourceProjectKnowledge, SourceProjectComposerMode, PROJECT_KNOWLEDGE_LABEL, knowledgeFailureMessage } from './source-project-knowledge.jsx';
import { MEMORY_COPY } from './source-settings-memory.jsx';
// w13-close-chat-project-rows: the conversation menu's Delete confirmation (shared-11 OE, as the Chats page has it).
import { ChatDeleteDialog } from './source-chats-page.jsx';
import { chatSessionStarred, splitStarredRows } from './chat-starred-model.mjs';
import { sessionSurface } from '../electron/surface-policy.mjs';
import { t, getLocale } from '../electron/i18n/index.mjs';

// c17beaa76 cr (3.6556.2 projects page, exported r): sort keys sr, the persisted sort, and its space items. The host
// lists its local projects as the cowork spaces cr lists (Fn reads id / name / description / dates / folders).
const SORTS = ['recent', 'created', 'alphabetical'];
const SORT_KEY = 'persisted.cowork-projects-sort';
const SPACE_ROUTE = '/space/';
const readSort = () => { try { const value = JSON.parse(localStorage.getItem(SORT_KEY)); return SORTS.includes(value) ? value : 'recent'; } catch { return 'recent'; } };
const writeSort = value => { try { localStorage.setItem(SORT_KEY, JSON.stringify(value)); } catch {} };
const ms = value => typeof value === 'number' ? value : Date.parse(value) || 0;
const projectSpace = project => ({ id: project.id, name: project.name, description: project.description ?? '', createdAt: ms(project.createdAt), updatedAt: ms(project.updatedAt),
  folders: project.cwd ? [{ path: project.cwd }] : [], ccdFolderPath: project.cwd ?? null });
const byName = (a, b) => a.name.localeCompare(b.name, getLocale()) || a.id.localeCompare(b.id);
const SEARCH_NOUNS = { singular: 'project', plural: 'projects' };

// c17beaa76 cr: GalleryPageLayout (cd75b47e6 l) with contentGap "lg", search, the sort icon action, the primary
// action and the result announcement; the starred-first sort, the space card grid, the empty / error / no-match states.
// initialProjects: an already-listed set to paint first (the list call still refreshes it; SSR tests render with it).
export function SourceProjects({ call, onOpen, composer, sessions, sessionMetadata, onSession, onSessionAction, onOpenSettings, onBack, onUpdated, initialProjects = null, composerMode, onComposerMode, coworkBlocked = false, projectTools }) {
  const [selected, setSelected] = useState(null);
  const [projects, setProjects] = useState(initialProjects), [loadFailed, setLoadFailed] = useState(false), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [sort, setSortState] = useState(readSort);
  const [creating, setCreating] = useState(false), [opening, setOpening] = useState(false);
  const inputRef = useRef(null), results = useRef(null), resultsId = useId();
  const setSort = value => { setSortState(value); writeSort(value); };
  useEffect(() => { let active = true; call('local-projects', { action: 'list' }).then(value => { if (active) setProjects(value); }, () => { if (active) setLoadFailed(true); }); return () => { active = false; }; }, [call]);
  const starredIds = useMemo(() => (projects ?? []).filter(project => project.isStarred).map(project => project.id), [projects]);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(), starred = new Set(starredIds);
    return (projects ?? []).map(project => ({ project, space: projectSpace(project) }))
      .filter(({ project }) => !needle || [project.name, project.description ?? '', project.cwd ?? ''].some(field => field.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => (+starred.has(b.project.id) - +starred.has(a.project.id))
        || (sort === 'created' ? b.space.createdAt - a.space.createdAt : sort === 'alphabetical' ? byName(a.space, b.space) : b.space.updatedAt - a.space.updatedAt));
  }, [projects, query, sort, starredIds]);
  const { onInputKeyDown, onResultsKeyDown } = useProjectsSearchKeys(inputRef, results);
  const { announcement } = useProjectsSearchAnnouncement(rows.length, query, { singular: t(SEARCH_NOUNS.singular), plural: t(SEARCH_NOUNS.plural) });
  const open = async project => {
    if (opening) return;
    setOpening(true); setError('');
    try { setSelected(await onOpen(project)); } catch (error) { setError(error.message); } finally { setOpening(false); }
  };
  const openRef = useRef(open); openRef.current = open;
  // shared-8 xq toggleStarred (c17beaa76 ir's Pin / Unpin): the local project's isStarred (local-projects update).
  const replace = project => { setProjects(rows => (rows ?? []).map(row => row.id === project.id ? project : row)); onUpdated?.(project); };
  const toggleStarred = async id => {
    const project = (projects ?? []).find(entry => entry.id === id);
    if (!project) return;
    try { replace(await call('local-projects', { action: 'update', id, isStarred: !project.isStarred })); setError(''); }
    catch (error) { setError(error.message); }
  };
  const toggleRef = useRef(toggleStarred); toggleRef.current = toggleStarred;
  const spaces = useMemo(() => ({ starredIds, toggleStarred: id => toggleRef.current(id) }), [starredIds]);
  const [editing, setEditing] = useState(null);
  // Fn links to `/space/<id>` (shared-52 Zl); RouterLink (routines-shared) hands the push to this router.
  const router = useMemo(() => ({ navigate: href => { const project = (projects ?? []).find(entry => `${SPACE_ROUTE}${entry.id}` === href); if (project) openRef.current(project); }, pathname: '/projects', search: '', bridge: undefined, models: [] }), [projects]);
  if (selected) return <ProjectDetail key={selected.id} project={selected} call={call} composer={composer} sessions={sessions} sessionMetadata={sessionMetadata} onSession={onSession}
    onSessionAction={onSessionAction} onOpenSettings={onOpenSettings} projectTools={projectTools} composerMode={composerMode} coworkBlocked={coworkBlocked} onComposerMode={onComposerMode ? mode => onComposerMode(selected, mode) : undefined}
    onBack={() => { setSelected(null); onBack(); }} onUpdated={project => { setSelected(project); setProjects(rows => rows.map(row => row.id === project.id ? project : row)); onUpdated(project); }} />;
  const initialized = projects !== null || loadFailed;
  const search = { inputRef, value: query, onChange: setQuery, placeholder: t('Search projects...'), label: t('Search projects'),
    hint: t('Results update as you type. Press Down Arrow to go to results, Escape to return here.'), resultsId: rows.length > 0 ? resultsId : undefined, onInputKeyDown };
  const iconActions = [{ key: 'sort', icon: 'Sort', label: t('Sort projects'),
    items: SORTS.map(value => ({ label: t({ recent: 'Last updated', created: 'Date created', alphabetical: 'Alphabetical' }[value]), checked: sort === value, checkedRole: 'radio', onSelect: () => setSort(value) })) }];
  const primaryAction = <CdsButton variant="primary" disabled={!initialized} onClick={() => setCreating(true)}>{t('New project')}</CdsButton>;
  const failed = loadFailed && !(projects ?? []).length;
  const body = !initialized ? <ProjectsLoadingSkeleton count={8} columns="two" />
    : failed ? <EmptyState headline={t('Couldn’t load your projects')} description={t('Refresh the page to try again.')} variant="error" />
    : !(projects ?? []).length && !query ? <EmptyState headline={t('Looking to start a project?')} description={t('Give Claude a folder you already work from')} variant="projects" ctaLabel={t('New project')} onCtaClick={() => setCreating(true)} />
    : !rows.length ? <div className="mt-10 text-center text-body text-muted-as-secondary">{t('No projects matching “{search}”', { search: query })}</div>
    : <ul ref={results} id={resultsId} role="list" aria-label={t('Projects')} onKeyDown={onResultsKeyDown} className="grid grid-cols-1 gap-x-3 md:grid-cols-2 md:gap-x-6">
      {/* cr's second row child n(on,{space,compact:!0}) is c052e7232 M (import-twin merge hint): it renders only for
          `t.origin==="import"` spaces with a twin; local projects carry no origin, so it is null (w11-sweep-curchat). */}
      {rows.map(({ project, space }) => <li key={project.id} className="row-span-2 mb-3 grid grid-rows-subgrid md:mb-6">
        <ProjectSpaceCard space={space} sortBy={sort === 'created' ? 'created_at' : 'updated_at'} updatedAtMs={space.updatedAt}
          overlay={<ProjectCardMenu space={space} isStarred={starredIds.includes(project.id)} onToggleStarred={() => spaces.toggleStarred(project.id)} onEdit={() => setEditing(project)} />} />
      </li>)}
    </ul>;
  return <div className="surface-projects cds-root" data-density="comfortable">
    <RoutinesSharedHost.Provider value={router}>
      <LocalProjectSpacesContext.Provider value={spaces}>
        <GalleryPageLayout contentGap="lg" title={t('Projects')} search={search} iconActions={iconActions} primaryAction={primaryAction} status={query && initialized && !failed ? announcement : null}>
          <div className="flex flex-col">
            {error && <div role="alert" className="text-danger text-body mb-4">{error}</div>}
            {body}
            <div className="pb-6" />
          </div>
        </GalleryPageLayout>
      </LocalProjectSpacesContext.Provider>
    </RoutinesSharedHost.Provider>
    {creating && <CreateProject call={call} onClose={() => setCreating(false)} onCreated={project => { setProjects(value => [...(value ?? []), project]); setQuery(''); setCreating(false); }} />}
    {editing && <EditProject key={editing.id} project={editing} kind="details" onClose={() => setEditing(null)}
      update={async patch => { const next = await call('local-projects', { action: 'update', id: editing.id, ...patch }); replace(next); return next; }} />}
  </div>;
}

const stopPropagation = event => event.stopPropagation();
// c17beaa76 ir (w13-chatui-project-detail, P1b): the card's overlay menu. The DotsVertical ghost trigger ("More options for
// {label}", clicks kept off the card link), then Pin / Unpin (star-space-trigger; shared-78 gK is true, so the pin
// wording and Pin / PinSlash icons) and Edit details (rename-space-trigger). Its Archive item (archive-space-trigger, the
// claude.ai space delete with its "Archive project" confirmation) is not offered: a local project has no archive.
export function ProjectCardMenu({ space, isStarred, onToggleStarred, onEdit }) {
  const label = space.name?.trim() ? t('More options for {label}', { label: space.name }) : t('More options');
  return <CdsDropdown.Root>
    <CdsDropdown.Trigger render={<CdsButton iconOnly icon="DotsVertical" variant="ghost" tooltip={false} className="pointer-events-auto"
      onClick={stopPropagation} onMouseDown={stopPropagation} aria-label={label} />} />
    <CdsDropdown.Popup align="end">
      <CdsDropdown.Item data-testid="star-space-trigger" onClick={onToggleStarred} icon={isStarred ? 'PinSlash' : 'Pin'}>{t(isStarred ? 'Unpin' : 'Pin')}</CdsDropdown.Item>
      <CdsDropdown.Item data-testid="rename-space-trigger" onClick={() => setTimeout(onEdit, 100)} icon="Edit">{t('Edit details')}</CdsDropdown.Item>
    </CdsDropdown.Popup>
  </CdsDropdown.Root>;
}

function CreateProject({ call, onClose, onCreated }) {
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [folder, setFolder] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try { onCreated(await call('local-projects', { action: 'create', name, description, folder })); }
    catch (error) { setError(error.message); setBusy(false); }
  }
  async function chooseFolder() {
    try { const value = await call('folder', { additional: true }); if (value) setFolder(value); }
    catch (error) { setError(error.message); }
  }
  return <SourceDialog title={t('New project')} density="comfortable" onClose={busy ? undefined : onClose}
    footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" busy={busy} disabled={busy || !name.trim()} onClick={create}>{t('Create project')}</Button></>}>
    <form className="surface-project-form flex flex-col gap-lg pt-3" onSubmit={event => { event.preventDefault(); create(); }}>
      <label className="flex flex-col gap-sm text-body">{t('Name')}<TextInput size="lg" autoFocus required maxLength={200} value={name} onChange={event => setName(event.target.value)} placeholder={t('Billing migration')} disabled={busy} /></label>
      <label className="flex flex-col gap-sm text-body">{t('Description')}<TextArea resize="y" rows={3} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label>
      <div className="flex flex-col gap-sm text-body"><span>{t('Working folder')}</span><Button variant="secondary" icon="Folder" disabled={busy} onClick={chooseFolder}>{folder || t('Choose folder…')}</Button></div>
      {error && <p role="alert" className="text-danger text-body">{error}</p>}
    </form>
  </SourceDialog>;
}


// c71dee58b Zl's bucketing for this project's sessions: starred rows first (a session's pinned metadata,
// chat-starred-model chatSessionStarred / splitStarredRows), the rest under Recents, newest first; ZL_PAGE (Xl) rows at a
// time behind "Show more".
const ZL_PAGE = 20;
// Zl's collapse state: `pr(xe.COWORK_SPACE_STARRED_COLLAPSED, !1)`, shared-0 cu.COWORK_SPACE_STARRED_COLLAPSED =
// "user-cowork-space-starred-collapsed", read and written by shared-18 uB as the "true" / "false" cookie of that name
// (shared-0 aK); the host keeps the same key and values in localStorage.
const STARRED_COLLAPSED_KEY = 'user-cowork-space-starred-collapsed';
const readCollapsed = () => { try { return JSON.parse(localStorage.getItem(STARRED_COLLAPSED_KEY)) === true; } catch { return false; } };
const writeCollapsed = value => { try { localStorage.setItem(STARRED_COLLAPSED_KEY, JSON.stringify(value)); } catch {} };
export function projectSessionSections(sessions, sessionMetadata, projectId) {
  const rows = sessions.filter(session => sessionMetadata[session.id]?.projectId === projectId && !session.archived)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const { starredRows, recentRows } = splitStarredRows(rows, session => chatSessionStarred(sessionMetadata[session.id]));
  return { pinned: starredRows, recents: recentRows };
}
const sessionMs = value => typeof value === 'number' ? value * 1000 : Date.parse(value) || 0;
// Zl's item for one local session (`e.kind==="chat"?{kind:"chat",conversation,hasBeenShared}:{kind:"cowork",session,
// isUnread}`): a Cowork session (its surface) as the hub session Ml reads, any other as the claude.ai conversation Nl
// reads (name, is_starred, updated_at); a local chat is never shared.
export function projectSessionItem(session, sessionMetadata, projectId) {
  const meta = sessionMetadata[session.id] ?? {}, at = sessionMs(session.updatedAt);
  if (sessionSurface(session.id, sessionMetadata) === 'cowork')
    return { kind: 'cowork', session: { sessionId: session.id, title: session.name || undefined, lastActivityAt: at || undefined, isStarred: chatSessionStarred(meta), isRunning: false },
      isUnread: meta.unread === true };
  return { kind: 'chat', hasBeenShared: false, conversation: { uuid: session.id, name: session.name || session.preview || '', is_starred: chatSessionStarred(meta),
    updated_at: new Date(at).toISOString(), project_uuid: projectId } };
}
// The local project as the claude.ai project record the rail and the instructions dialog read.
const projectRecord = project => ({ ...project, uuid: project.id, name: project.name, description: project.description ?? '', prompt_template: project.instructions ?? '', settings: project.settings ?? {},
  is_starred: !!project.isStarred, is_private: true, is_starter_project: false, archived_at: null });

// w13-chatui-project-detail (research/w13-chatui.md P2 / P3 / P4): c71dee58b Up, the classic project page the route
// shows with yukon_silver_dramatic_shrimp_atrium off: the scroll column (gr's stable gutter) over Pr's centred
// max-w-7xl grid "grid grid-cols-7 xl:grid-cols-12"; the left column Gp (the header, the composer block, the
// conversations Su / Zl in pb-20); the knowledge rail Wp ({role:"region","aria-label":"Project knowledge"}) holding
// Gr's bordered rail: Instructions (cf2f34ee4 ri, opening c9b54eb90 ze), the divider Yt, then Files
// (SourceProjectKnowledge, w13-chatfn-projects).
// Review fix: the breadcrumb is Up's nc (shared-78 gK true: the "All projects" link card in the title row sn, rendered
// in place since shared-16 ia lifts it only into a frame-registered title row, which this page has none of, so the
// scroll column takes Up's `!ee && "pt-frame-row"` and c8ad300b7 Dt's data-scrolls-under-page-header); the header is
// Up's own Eu; Gr's drop zone qr wraps the bordered rail (Kr's handling: toasts for refused items, the accepted files to
// local-projects knowledge-add-content); the memory section Jr leads the rail while this machine's memory is on (Ir
// kind "saffron", Zr's divider after it). w13-close-chat-project-rows: both sections list their rows through Zl's Ol
// (sliced: view-tabs' CdsDataTable over Nl / Ml cells, the row link Sl), its menu acting on the local session. Zl's
// Recents heading always shows: its hideRecentsHeader is Up's `ae()` (shared-25 YB = qB("raven"), an org capability),
// false here, as is the Chats / Activity tab bar the same flag shows. Host differences: the tags section (zn, gated
// on raven) and c8ad300b7 Lt (the space file viewer, no DOM without an open file) are not rendered.
export function ProjectDetail({ project, call, composer, sessions, sessionMetadata, onSession, onSessionAction, onOpenSettings, onBack, onUpdated, composerMode, onComposerMode, coworkBlocked = false, initialKnowledge = null, initialMemory = null, projectTools }) {
  const [editing, setEditing] = useState(null), [error, setError] = useState('');
  // w13-close-chat-project-rows: the row menu's Rename (shared-16 hu) and Delete (shared-11 OE) dialogs.
  const [renaming, setRenaming] = useState(null), [deleting, setDeleting] = useState(null);
  const [collapsed, setCollapsedState] = useState(readCollapsed), [shown, setShown] = useState(ZL_PAGE);
  const setCollapsed = value => { setCollapsedState(value); writeCollapsed(value); };
  const { pinned, recents } = projectSessionSections(sessions, sessionMetadata, project.id);
  async function save(patch) {
    const next = await call('local-projects', { action: 'update', id: project.id, ...patch });
    onUpdated(next); return next;
  }
  async function update(patch) {
    try { const next = await save(patch); setError(''); return next; }
    catch (error) { setError(error.message); throw error; }
  }
  // shared-4 Xb (Eu's Pin button): the flipped isStarred painted first, put back when the update fails.
  const toggleStarred = () => {
    const next = !project.isStarred;
    onUpdated({ ...project, isStarred: next });
    update({ isStarred: next }).catch(() => onUpdated({ ...project, isStarred: !next }));
  };
  // cf2f34ee4 Ir / Jr: the memory section shows while this machine's memory is on (chat-memory state: Settings > Memory
  // generating, not paused), Jr's "saffron" kind; its text is the project memory (<userData>/memory/projects/<id>.md).
  const [memoryState, setMemoryState] = useState(initialMemory), [memoryFailures, setMemoryFailures] = useState(0);
  const [memoryFetching, setMemoryFetching] = useState(false), [memoryBusy, setMemoryBusy] = useState(false), [memoryError, setMemoryError] = useState('');
  const loadMemory = useCallback(async () => {
    setMemoryFetching(true);
    try { const value = await call('chat-memory', { op: 'state', projectId: project.id }); if (value?.settings) setMemoryState(value); }
    catch { setMemoryFailures(count => count + 1); }
    finally { setMemoryFetching(false); }
  }, [call, project.id]);
  useEffect(() => { if (!initialMemory) void loadMemory(); }, [loadMemory]);
  const memoryOn = memoryState?.settings?.enabled === true && memoryState.settings.paused !== true;
  const memory = { available: memoryOn, busy: memoryBusy || memoryState?.synthesizing === true, error: memoryError,
    query: { data: memoryState?.memory, refetch: loadMemory, isFetching: memoryFetching, errorUpdateCount: memoryFailures },
    controls: async next => {
      setMemoryBusy(true); setMemoryError('');
      try { const value = await call('chat-memory', { op: 'controls', projectId: project.id, controls: next }); if (value?.settings) setMemoryState(value); }
      catch { setMemoryError(t(MEMORY_COPY.regenerateError)); }
      finally { setMemoryBusy(false); }
    } };
  // cf2f34ee4 Kr (the drop zone's onFiles): each refused item's message once as an error toast, the accepted files to
  // main (local-projects knowledge-add-content) while the zone is disabled; the Files section then repaints its list.
  const { addError } = useErrors();
  const [uploading, setUploading] = useState(false), [knowledge, setKnowledge] = useState({ key: 0, initial: initialKnowledge });
  const dropControl = useRef(null);
  const handleFiles = async result => {
    const seen = new Set();
    for (const { message, code } of [...result.notices, ...result.rejections]) if (!seen.has(message)) { seen.add(message); addError(message, { messageForLogging: `project knowledge drop: ${code}` }); }
    if (!result.accepted.length) return;
    setUploading(true);
    try {
      const files = [];
      for (const file of result.accepted) {
        if (file.size > KNOWLEDGE_MAX_FILE_BYTES) addError(knowledgeFailureMessage({ name: file.name, reason: 'too_large' }));
        else files.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      }
      if (!files.length) return;
      const added = await call('local-projects', { action: 'knowledge-add-content', id: project.id, files });
      for (const failure of added?.failed ?? []) addError(knowledgeFailureMessage(failure));
      if (Array.isArray(added?.files)) setKnowledge(value => ({ key: value.key + 1, initial: { files: added.files, stats: added.stats } }));
    } catch (error) { addError(error.message); }
    finally { setUploading(false); }
  };
  // nc's "All projects" link (RouterLink over RoutinesSharedHost) returns to the projects page; Ol's row links (vl:
  // `/chat/<uuid>`, `/cowork/<sessionId>`) open the session.
  const backRef = useRef(onBack); backRef.current = onBack;
  const sessionRef = useRef(onSession); sessionRef.current = onSession;
  const router = useMemo(() => ({ navigate: href => {
    if (href === '/projects') return backRef.current();
    const row = /^\/(?:chat|cowork)\/([^/?#]+)$/.exec(String(href));
    if (row) sessionRef.current(decodeURIComponent(row[1]));
  }, pathname: `/project/${project.id}`, search: '', bridge: undefined, models: [] }), [project.id]);
  const sessionById = id => sessions.find(session => session.id === id);
  // The row menu's actions on a local session (main.jsx sessionAction); a failure shows on the page's error line.
  const sessionAction = async (action, id, payload) => {
    const target = sessionById(id);
    if (!target || !onSessionAction) return false;
    try { const result = await onSessionAction(action, target, payload); setError(''); return result; }
    catch (reason) { setError(reason?.message ?? String(reason)); throw reason; }
  };
  // w13-chatfn-tools (chatfn-23): `tools` feeds the recommended tools strip's adapters (source-project-v3-adapters.jsx).
  const host = { update, save, optimistic: patch => onUpdated({ ...project, ...patch }), edit: setEditing, tools: projectTools, toggleStarred, memory,
    sessionAction: (action, id, payload) => sessionAction(action, id, payload).catch(() => false), renameChat: setRenaming,
    deleteChat: id => { const target = sessionById(id); if (target) setDeleting(target); }, openSettings: onOpenSettings,
    reveal: () => call('reveal-folder', { cwd: project.cwd }).catch(error => setError(error.message)) };
  const record = projectRecord(project);
  const items = rows => rows.map(session => projectSessionItem(session, sessionMetadata, project.id));
  const empty = !pinned.length && !recents.length;
  return <LocalProjectContext.Provider value={host}><RoutinesSharedHost.Provider value={router}>
    <div className="surface-project-detail cds-root relative flex h-full max-lg:flex-col max-lg:overflow-y-auto" data-density="comfortable" data-project-id={project.id}>
      <ProjectBreadcrumb includeLinkToProjects plainCrumb={false} />
      <div data-scrolls-under-page-header="" className="flex-1 min-w-0 overflow-y-auto h-full max-lg:flex-none max-lg:h-auto max-lg:overflow-y-visible [scrollbar-gutter:stable] pt-frame-row">
        <div className="mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6 max-w-7xl grid grid-cols-7 xl:grid-cols-12">
          <div className="col-span-7 flex flex-col gap-4">
            <ProjectPageHeader project={record} />
            {error && <p role="alert" className="text-body text-danger">{error}</p>}
            {/* w13-chatfn-projects: td's Composer mode above the composer. w13-close-cowork-misc (E77): td's `_ = !h` (h =
                shared-78 FJ, Cowork blocked) is the host's Cowork-off switch (CODE_DESKTOP_COWORK=0): no Cowork segment,
                so only Chat is left and td draws no control (`x.length > 1`). */}
            <div>
              {onComposerMode && <SourceProjectComposerMode value={composerMode} onChange={onComposerMode} gates={{ coworkBlocked }} />}
              {composer}
            </div>
            <div className="col-span-7 flex flex-col mt-2 gap-4">
              <div className="pb-20">
                {empty ? <div className="flex flex-col items-center justify-center gap-sm py-16 text-center">
                  <CdsIcon name="Chat" size="xxl" className="text-muted-as-secondary" />
                  <p className="text-sm text-muted-as-secondary">{t('Claude references the same knowledge every time you talk to it in this project.')}</p>
                </div> : <>
                  {pinned.length > 0 && <section className="flex flex-col gap-2">
                    <ProjectSessionsHeading isCollapsible isCollapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)}>{t('Pinned')}</ProjectSessionsHeading>
                    {!collapsed && <ProjectSessionTable items={items(pinned)} />}
                  </section>}
                  {recents.length > 0 && <section className="flex flex-col gap-2">
                    <ProjectSessionsHeading>{t('Recents')}</ProjectSessionsHeading>
                    <ProjectSessionTable items={items(recents.slice(0, shown))} />
                    {recents.length > shown && <button type="button" onClick={() => setShown(value => value + ZL_PAGE)}
                      className="self-center text-sm text-muted-as-secondary hover:text-secondary transition-colors py-2 disabled:opacity-50">{t('Show more')}</button>}
                  </section>}
                </>}
              </div>
            </div>
          </div>
          <div role="region" aria-label={t(PROJECT_KNOWLEDGE_LABEL)} className="col-span-7 xl:col-span-5 mt-4 xl:mt-0 xl:ps-12 xl:pe-4" data-project-rail="">
            {/* Gr: qr {onFiles: Kr's handleFiles, className "relative", disabled while uploading, control: the add ref}. */}
            <ProjectKnowledgeDropZone onFiles={handleFiles} className="relative" disabled={uploading} control={dropControl}>
              <div className="border-0.5 border-border-300 rounded-2xl flex flex-col">
                {/* Zr (memoryAfterInstructions off): Jr, then the divider before the instructions. */}
                {memoryOn && <><ProjectMemorySection projectUuid={project.id} canEditMemory /><ProjectRailDivider /></>}
                {/* w13-chatfn-tools (chatfn-23): ri without hideRecommendedTools (as Up calls Ha) slots De (the project's
                    recommended tools) under the instructions; De renders nothing while shared-182 kG (haystack) is off
                    (E69, source-project-v3-adapters.jsx HAYSTACK_AVAILABLE). */}
                <ProjectRecommendations project={record}>
                  <ProjectInstructionsSection project={record} canEditKnowledgeBase isProjectShared={false} onConnectorClick={noop} />
                </ProjectRecommendations>
                <ProjectRailDivider />
                <SourceProjectKnowledge key={knowledge.key} project={project} call={call} initial={knowledge.initial} />
              </div>
            </ProjectKnowledgeDropZone>
          </div>
        </div>
      </div>
    </div>
    {editing === 'details' && <EditProject key={editing} project={project} kind={editing} update={update} onClose={() => setEditing(null)} />}
    {renaming && <RenameChatDialog isOpen initialName={renaming.name} conversationUuid={renaming.uuid} projectUuid={project.id} onClose={() => setRenaming(null)} />}
    {deleting && <ChatDeleteDialog open conversation={deleting} onClose={() => setDeleting(null)} onDelete={target => sessionAction('delete', target.id)} />}
  </RoutinesSharedHost.Provider></LocalProjectContext.Provider>;
}
function noop() {}
// electron/project-knowledge.mjs MAX_FILE_BYTES: a larger dropped file is refused before it is read.
const KNOWLEDGE_MAX_FILE_BYTES = 32 * 1024 * 1024;

// c9b54eb90 _e (generated) once for the page, so the strip's ye adapter reads the same recommendations.
function ProjectRecommendations({ project, children }) {
  const value = useProjectRecommendations(project);
  return <ProjectRecommendationsContext.Provider value={value}>{children}</ProjectRecommendationsContext.Provider>;
}

// The host's Edit details dialog (name / description of the local project). The instructions are edited in the
// official c9b54eb90 ze dialog the rail's Instructions section opens (w13-chatui-project-detail).
function EditProject({ project, update, onClose }) {
  const [name, setName] = useState(project.name), [description, setDescription] = useState(project.description);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try { await update({ name, description }); onClose(); }
    catch (error) { setError(error.message); setBusy(false); }
  }
  return <SourceDialog title={t('Edit project')} density="comfortable" onClose={busy ? undefined : onClose}
    footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>{t('Cancel')}</Button><Button variant="primary" busy={busy} disabled={busy || !name.trim()} onClick={save}>{t('Save')}</Button></>}>
    <form className="surface-project-form flex flex-col gap-lg pt-3" onSubmit={event => { event.preventDefault(); save(); }}>
      <label className="flex flex-col gap-sm text-body">{t('Name')}<TextInput size="lg" autoFocus required maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
      <label className="flex flex-col gap-sm text-body">{t('Description')}<TextArea resize="y" rows={3} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label>
      {error && <p role="alert" className="text-danger text-body">{error}</p>}
    </form>
  </SourceDialog>;
}
