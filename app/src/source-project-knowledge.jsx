// w13-chatfn-projects: a local project's knowledge, its Composer mode and a Chat row's project items, as the 3.6556.2
// claude.ai project page has them (research/w13-chatfn.md P1, P4, H4):
//   - SourceProjectKnowledge: cf2f34ee4 ni (the knowledge rail's Files section: Xt header "Files" with the sliced _r "Add
//     files" control — Sr's dropdown "Upload from device" / "Add text content", kr's dialog) over c52b32660 xe (the
//     sliced ge capacity bar, the list of sliced fe cards, its empty card "Add PDFs, documents, or other text to reference
//     in this project."); the "Project knowledge" region is the page rail around it (c71dee58b Wp / ns). The files live
//     in main (electron/project-knowledge.mjs, local-projects knowledge-* actions): a picked or dropped file reaches main
//     as { name, bytes } (knowledge-add-content), a text as { title, content } (knowledge-add-text).
//   - SourceProjectComposerMode: c71dee58b td's CDS SegmentedControl (Chat "ChatSimple" / Cowork "Chat",
//     aria-label "Composer mode", self-start): the surface the project's next session starts on.
//   - SourceChatProjectMenuItems: shared-16 yf for a chat row: the "Add to project" / "Change project" submenu
//     (move-to-project-trigger, icon Projects; Cf's radio rows, "No projects yet") and "Remove from project"
//     (remove-from-project-trigger, icon ProjectsX).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// E41: the sidebar's chat row menu (a menu-graph module) imports this file, so view-tabs comes by semantic name from the
// concrete shared-frame file, not the facade (which evaluates every view-tabs module).
import { CdsBadge, CdsSegmentedControl } from './generated/view-tabs/shared-frame-6jtSkIit.js';
// G5 (chatfn-projects-05 / 06): a knowledge file's card is c52b32660 fe over the sliced shared-7 mD / OD / GE and shared-3
// FD; the Add files control is the sliced cf2f34ee4 _r; the capacity bar the sliced c52b32660 ge.
import { KnowledgeFileThumbnail, KnowledgeFileTag, knowledgeFileTagName, formatKnowledgeFileSize, KnowledgeAddMenu, KnowledgeCapacityBar } from './generated/chat-knowledge/index.mjs';
import { ChatKnowledgeHostContext } from './source-chat-knowledge-adapters.jsx';
import { useIntl } from './source-routines-shared-adapters.jsx';
import { SourceMenu } from './source-menu';
// Sf's SearchablePopup is the host's (shared-frame yC over SourceMenu.Popup), as the + menu's Es popup uses it; it reads the
// view-tabs facade — tests/source-chat-composer-dictation.test.mjs and tests/import-graph.test.mjs show no new cycle (E41).
import { EnvironmentSearchablePopup } from './source-environment-folder-adapters.jsx';
import { t } from '../electron/i18n/index.mjs';

/** c71dee58b ns (non-landmark): the knowledge region's name. */
export const PROJECT_KNOWLEDGE_LABEL = 'Project knowledge';
/** shared-3 / cf2f34ee4 / c52b32660 copy the section shows. */
export const KNOWLEDGE_COPY = Object.freeze({
  files: 'Files',
  addFiles: 'Add files',
  uploadFromDevice: 'Upload from device',
  atCapacity: 'Project knowledge at capacity. Remove an existing file in order to add to knowledge',
  empty: 'Add PDFs, documents, or other text to reference in this project.',
  capacity: 'Project knowledge capacity',
  used: '{pctUsed}% of project capacity used',
  searchMode: 'Search mode',
  removeToAdd: 'Remove an existing file in order to add to knowledge',
  exceeds: 'Project knowledge exceeds maximum. Remove files to continue.',
  uploadExceeds: 'Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue.',
  uploadFailed: 'Failed to upload file',
  unsupported: 'File type not supported here',
  deleteFailed: 'Something went wrong while deleting. Refresh the page and try again',
});

/** The message for one file knowledge-add could not take (local-projects knowledge-add `failed`). */
export function knowledgeFailureMessage({ name, reason }) {
  if (reason === 'capacity') return t(KNOWLEDGE_COPY.uploadExceeds, { filename: name });
  if (reason === 'unsupported') return t(KNOWLEDGE_COPY.unsupported);
  return t(KNOWLEDGE_COPY.uploadFailed);
}

/**
 * c52b32660 fe for a local knowledge file: the mD thumbnail (title, the FD size of its text as the subtitle — fe's
 * `Z(s, r)` over content_length —, the OD tag GE names, the accessible name "title, tag, size") in the rail list's
 * `{ size: "stretch", isEditable, isInSelectionMode: false }` (xe's H). No preview: fe's click opens c52b32660 de over the
 * claude.ai document, which a local file has no viewer for, so the card is not a button.
 */
export function KnowledgeFileCard({ file, editable = true, onRemove }) {
  const intl = useIntl();
  const title = file.name;
  const tagName = knowledgeFileTagName(title);
  const subtitle = Number.isFinite(file.chars) ? formatKnowledgeFileSize(intl, file.chars) : undefined;
  return <KnowledgeFileThumbnail size="stretch" isEditable={editable} isInSelectionMode={false} title={title} subtitle={subtitle}
    tag={<KnowledgeFileTag tagName={tagName} />} accessibleName={[title, tagName, subtitle].filter(Boolean).join(', ')}
    handleRemove={onRemove ? () => onRemove(file) : undefined} />;
}

/** A file larger than this is not read in the renderer (project-knowledge.mjs MAX_FILE_BYTES refuses it in main too). */
export const KNOWLEDGE_FILE_MAX_BYTES = 32 * 1024 * 1024;
const noop = () => {};

/**
 * cf2f34ee4 ni over a local project: the Xt header ("Files", the sliced _r "Add files" control), then c52b32660 xe: the
 * loading block, the empty card, or the sliced ge capacity bar (in xe's `mb-3 grid grid-rows-[1fr] animate-knowledge-expand`
 * wrapper) over the fe cards; the host's refusal lines below. `initial` ({files, stats}) paints first (SSR tests); the
 * list call still refreshes it. _r's services (ChatKnowledgeHostContext): the token count and capacity, "Add text
 * content" (knowledge-add-text) and the files picked in its hidden input (knowledge-add-content).
 */
export function SourceProjectKnowledge({ project, call, initial = null }) {
  const [files, setFiles] = useState(initial?.files ?? null), [stats, setStats] = useState(initial?.stats ?? null);
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState([]);
  const apply = useCallback(result => { if (Array.isArray(result?.files)) setFiles(result.files); if (result?.stats) setStats(result.stats); }, []);
  useEffect(() => {
    let active = true;
    call('local-projects', { action: 'knowledge-list', id: project.id }).then(result => { if (active) apply(result); }, error => { if (active) setErrors([error.message]); });
    return () => { active = false; };
  }, [call, project.id, apply]);
  async function remove(file) {
    setErrors([]);
    try { apply(await call('local-projects', { action: 'knowledge-remove', id: project.id, fileId: file.id })); }
    catch { setErrors([t(KNOWLEDGE_COPY.deleteFailed)]); }
  }
  const host = useMemo(() => ({
    tokens: stats?.tokens ?? 0,
    capacity: stats?.capacity ?? 200000,
    // _r's onSave: a refusal throws, so _r shows its own "Error saving text content".
    addText: async ({ name, text }) => {
      setErrors([]);
      const result = await call('local-projects', { action: 'knowledge-add-text', id: project.id, title: name, content: text });
      apply(result);
      if (!result?.added?.length) {
        const failure = result?.failed?.[0];
        if (failure?.reason === 'capacity') setErrors([knowledgeFailureMessage(failure)]);
        throw new Error('Error saving text content');
      }
      return result;
    },
    uploadFiles: async picked => {
      setErrors([]);
      const messages = [], payload = [];
      for (const file of Array.from(picked ?? [])) {
        if (file.size > KNOWLEDGE_FILE_MAX_BYTES) messages.push(knowledgeFailureMessage({ name: file.name, reason: 'too_large' }));
        else payload.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
      }
      try {
        if (payload.length) {
          const result = await call('local-projects', { action: 'knowledge-add-content', id: project.id, files: payload });
          apply(result);
          messages.push(...(result?.failed ?? []).map(knowledgeFailureMessage));
        }
      } catch (error) { messages.push(error.message); }
      setErrors(messages);
    },
  }), [call, project.id, apply, stats?.tokens, stats?.capacity]);
  const list = files ?? [];
  // cf2f34ee4 ni: a plain Jt container (`w-full px-[1.375rem] py-4` + "flex flex-col gap-2 mb-1"); the "Project knowledge"
  // region is the page rail around it (c71dee58b Wp / ns, source-projects.jsx), so this section names no landmark.
  return <ChatKnowledgeHostContext.Provider value={host}>
    <div className="w-full px-[1.375rem] py-4 flex flex-col gap-2 mb-1" data-project-knowledge="">
      <div className="h-6 w-full flex flex-row items-center justify-between gap-4">
        <h3 className="text-secondary font-base-bold">{t(KNOWLEDGE_COPY.files)}</h3>
        <div className="flex flex-row items-center gap-2">
          <KnowledgeAddMenu projectUuid={project.id} isStarterProject={false} isUploading={busy} setIsUploadingDoc={setBusy}
            setIsUploadingGithubSync={noop} setIsUploadingMcpSync={noop} />
        </div>
      </div>
      {files === null ? <div className="h-[10rem] w-full bg-surface-0 rounded-2xl" />
        : !list.length ? <div className="text-center h-[10rem] bg-surface-0 rounded-2xl flex flex-col gap-3 items-center justify-center text-muted-as-secondary font-small">
          <div className="max-w-[14.5rem]">{t(KNOWLEDGE_COPY.empty)}</div>
        </div>
        : <div className="flex flex-col mb-1">
          <div className="mb-3 grid grid-rows-[1fr] animate-knowledge-expand">
            <div className="min-h-0 min-w-0 self-start"><KnowledgeCapacityBar projectUuid={project.id} /></div>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3">
            {list.map(file => <KnowledgeFileCard key={file.id} file={file} onRemove={remove} />)}
          </ul>
        </div>}
      {stats?.over && <p role="alert" className="text-danger text-body mt-2">{t(KNOWLEDGE_COPY.exceeds)}</p>}
      {errors.map((message, index) => <p key={index} role="alert" className="text-danger text-body mt-2">{message}</p>)}
    </div>
  </ChatKnowledgeHostContext.Provider>;
}

/** c71dee58b td: the segments (Chat first) and the value it falls back to (cowork). */
export const COMPOSER_MODES = Object.freeze([
  Object.freeze({ value: 'chat', icon: 'ChatSimple', label: 'Chat' }),
  Object.freeze({ value: 'cowork', icon: 'Chat', label: 'Cowork' }),
]);
export const composerModeOf = surface => COMPOSER_MODES.some(entry => entry.value === surface) ? surface : 'cowork';
/**
 * c71dee58b td's gates (G5, chatfn-projects-03): `g = Nt && !!n && m` offers Chat — Nt the desktop boot feature
 * chatIn3p (shared-52 tk; on here, surface-nav-model.mjs), n the route's space (a local project page always has one), m
 * shared-78 mT (desktopBootFeatures chatTab "supported"; the host has its Chat tab) — and `_ = !h` offers Cowork, h =
 * shared-78 FJ (Cowork "blocked_by_org_admin"; here: Cowork switched off, CODE_DESKTOP_COWORK=0, E60). The control is
 * drawn only with two segments (`x.length > 1`); the mode falls back to the first offered one, else "cowork".
 */
export function composerModeSegments({ chatIn3p = true, spaceId = true, chatTab = true, coworkBlocked = false } = {}) {
  return COMPOSER_MODES.filter(entry => entry.value === 'chat' ? !!(chatIn3p && spaceId && chatTab) : !coworkBlocked);
}
export function composerModeIn(value, segments) {
  return segments.some(entry => entry.value === value) ? value : segments[0]?.value ?? 'cowork';
}
export function SourceProjectComposerMode({ value, onChange, disabled = false, gates = {} }) {
  const segments = composerModeSegments(gates);
  if (segments.length < 2) return null;
  const current = composerModeIn(composerModeOf(value), segments);
  return <CdsSegmentedControl segments={segments.map(entry => ({ value: entry.value, icon: entry.icon, label: t(entry.label) }))}
    value={current} onChange={next => { if (next !== current) onChange?.(next); }} disabled={disabled}
    aria-label={t('Composer mode')} className="self-start" />;
}

/** shared-182 es (zr in shared-16 Sf): the project picker shows 8.5 rows before it scrolls. */
export const PROJECT_PICKER_MAX_VISIBLE = 8.5;
/** shared-16 yf (a chat row) and fm's move-to-space block (a Cowork row): the trigger and the remove item's test ids. */
const PROJECT_MENU_TEST_IDS = Object.freeze({
  chat: Object.freeze({ trigger: 'move-to-project-trigger', remove: 'remove-from-project-trigger' }),
  cowork: Object.freeze({ trigger: 'move-to-space-trigger', remove: 'remove-from-space-trigger' }),
});
const stamp = value => (typeof value === 'number' ? value : Date.parse(value) || 0);

/** Cf / gm's rows for the local projects: the query (trimmed, lower-cased) matches the name; most recently updated first. */
export function projectPickerRows({ projects = [], currentProjectId = null, query = '' } = {}) {
  const typed = String(query ?? '').trim().toLowerCase();
  return (Array.isArray(projects) ? projects : [])
    .filter(project => typeof project?.id === 'string' && typeof project.name === 'string' && (!typed || project.name.toLowerCase().includes(typed)))
    .sort((a, b) => (a.id === currentProjectId ? -1 : b.id === currentProjectId ? 1 : 0) || stamp(b.updatedAt) - stamp(a.updatedAt) || a.name.localeCompare(b.name));
}

/**
 * shared-16 nf: a create row — "New project" (icon Add) with no name, else "Create" and the typed name in a neutral
 * badge (aria-label "Create project {projectName}"); test id picker-create-project.
 */
export function ProjectCreateRow({ name = '', onClick, testId = 'picker-create-project' }) {
  if (!name) return <SourceMenu.Item data-testid={testId} icon="Add" onClick={onClick}>{t('New project')}</SourceMenu.Item>;
  return <SourceMenu.Item data-testid={testId} icon="Add" onClick={onClick} aria-label={t('Create project {projectName}', { projectName: name })}>
    <span className="flex min-w-0 items-center gap-xs">{t('Create')}<CdsBadge variant="neutral" truncate>{name}</CdsBadge></span>
  </SourceMenu.Item>;
}

/**
 * shared-16 yf for a chat row, and fm's move-to-space block for a Cowork row (kind "cowork"): the submenu (icon
 * Projects, "Add to project" / "Change project") over Sf's SearchablePopup (min-w-60, 8.5 rows; "Search projects", or
 * "Search or create a project" when a project can be created here — Sf's createOffered, local projects always can — with
 * Enter creating the typed name) listing Cf / gm's radio rows ("No matches" while searching, else "No projects yet"), rf's
 * create rows (nf "New project" and a separator before the list when not searching, "Create {name}" after it while
 * typing), then "Remove from project" (icon ProjectsX) when the session is in one. projects: config.localProjects.
 * onCreateProject(name): the host's New project dialog with that name (xf), which then moves the session there.
 */
export function SourceChatProjectMenuItems({ projects = [], currentProjectId = null, onMove, onRemove, onCreateProject = null, kind = 'chat' }) {
  const ids = PROJECT_MENU_TEST_IDS[kind] ?? PROJECT_MENU_TEST_IDS.chat;
  const current = currentProjectId && projects.some(project => project.id === currentProjectId) ? currentProjectId : null;
  const label = current ? t('Change project') : t('Add to project');
  const create = typeof onCreateProject === 'function';
  const searchLabel = create ? t('Search or create a project') : t('Search projects');
  return <>
    <SourceMenu.Submenu>
      <SourceMenu.SubmenuTrigger data-testid={ids.trigger} icon="Projects">{label}</SourceMenu.SubmenuTrigger>
      <EnvironmentSearchablePopup className="min-w-60" label={label} searchLabel={searchLabel} maxVisibleItems={PROJECT_PICKER_MAX_VISIBLE}
        onSubmitQuery={create ? typed => { const name = String(typed ?? '').trim(); if (name) onCreateProject(name); } : undefined}>
        {(query, typed) => {
          const rows = projectPickerRows({ projects, currentProjectId: current, query });
          const searching = !!query;
          const newRow = create && !searching ? <><ProjectCreateRow onClick={() => onCreateProject('')} /><SourceMenu.Separator /></> : null;
          const typedRow = create && typed ? <ProjectCreateRow key="create" name={typed} onClick={() => onCreateProject(typed)} /> : null;
          const list = rows.length ? <SourceMenu.Group>
            {rows.map(project => <SourceMenu.Item key={project.id} checked={project.id === current} checkedRole="radio" labelDir="auto"
              onClick={() => { if (project.id !== current) onMove?.(project.id); }}>{project.name}</SourceMenu.Item>)}
          </SourceMenu.Group> : typedRow ? null : <div className="px-md py-sm text-footnote text-muted-as-secondary">{t(searching ? 'No matches' : 'No projects yet')}</div>;
          return <>{newRow}{list}{typedRow}</>;
        }}
      </EnvironmentSearchablePopup>
    </SourceMenu.Submenu>
    {current && <SourceMenu.Item data-testid={ids.remove} icon="ProjectsX" onClick={() => onRemove?.(current)}>{t('Remove from project')}</SourceMenu.Item>}
  </>;
}
