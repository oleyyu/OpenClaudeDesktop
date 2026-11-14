import React from 'react';
// w13-chatfn-tools (the review's 补做: the Chat + menu's Add to project). 3.6556.2 c752b32f8 ks is the project slot
// ({type:"submenu", icon:"Projects", label:"Add to project", renderPopup:As}); As → Ms renders the menu host's popup
// (c752b32f8 Gi: the CDS SearchablePopup with maxVisibleItems shared-182 es = 8.5) over Es's
// { search, items }: the chat project rows ({type:"checkbox", label: name, icon:"Projects", checked: the conversation's
// project, closeOnClick}) filtered by the typed query, else one disabled row — "No matches" while searching, "No projects
// yet" — and a picked row goes to Ns (the current project → remove the conversation from it, or clear the draft's; another
// → move the conversation there, or set the draft's). Literals: src/generated/chat-composer-menus/add-menu.mjs.
// Local (E59): the projects are this machine's (config.localProjects, electron/local-projects.mjs); they have no creator
// (Es's subtitle `creator.full_name`); Es's "Search or create a project" branch (claude.ai's create-project modal) is the
// host's New project dialog when the caller passes onCreate (see ChatProjectPopup). The popup is the host's SearchablePopup
// (source-environment-folder-adapters.jsx, shared-frame yC over SourceMenu.Popup).
import { chatAddMenu, chatAddMenuMessages } from './generated/chat-composer-menus/add-menu.mjs';
import { EnvironmentSearchablePopup } from './source-environment-folder-adapters.jsx';
import { SourceMenu } from './source-menu.jsx';
import { ProjectCreateRow } from './source-project-knowledge.jsx';
import { t } from '../electron/i18n/index.mjs';

const stamp = value => (typeof value === 'number' ? value : Date.parse(value) || 0);

/** Es's chat rows for the local projects: the query (trimmed, lower-cased) matches the name; most recently updated first. */
export function chatProjectRows({ projects = [], currentProjectId = null, query = '' } = {}) {
  const typed = String(query ?? '').trim().toLowerCase();
  return (Array.isArray(projects) ? projects : [])
    .filter(project => typeof project?.id === 'string' && typeof project.name === 'string' && (!typed || project.name.toLowerCase().includes(typed)))
    .sort((a, b) => stamp(b.updatedAt) - stamp(a.updatedAt) || a.name.localeCompare(b.name))
    .map(project => ({ id: project.id, label: project.name, checked: project.id === currentProjectId }));
}

/** Ns: the picked project against the current one → { action: 'remove' | 'move', projectId }. */
export function chatProjectPick(projectId, currentProjectId) {
  return projectId === currentProjectId ? { action: 'remove', projectId } : { action: 'move', projectId };
}

// w13-close-chat-projects-memory: onCreate(name) is Es's create branch (`t = T && i`: a project can be created here, as
// a local one always can): the search reads "Search or create a project" and Enter submits the typed name; Yr (shared-16
// rf) adds the "New project" leading row (with its separator) while not searching and the "Create {name}" row while
// typing, and a search with create offered shows no "No matches" row (`m && t ? [] : [g]`). The host opens its New
// project dialog with the name (main.jsx newProjectFor; c752b32f8 `l({ isOpen: !0, initialName: e })`).
export function ChatProjectPopup({ projects = [], currentProjectId = null, onPick, onCreate = null }) {
  const m = chatAddMenuMessages, { project: slot, projectRow, projectNotice } = chatAddMenu.items;
  const create = typeof onCreate === 'function';
  return <EnvironmentSearchablePopup searchLabel={t((create ? m.searchOrCreateProject : m.searchProjects).defaultMessage)} maxVisibleItems={slot.maxVisibleItems}
    onSubmitQuery={create ? typed => { const name = String(typed ?? '').trim(); if (name) onCreate(name); } : undefined}>
    {(query, typed) => {
      const rows = chatProjectRows({ projects, currentProjectId, query });
      const leading = create && !query ? <><ProjectCreateRow onClick={() => onCreate('')} /><SourceMenu.Separator /></> : null;
      const trailing = create && typed ? <ProjectCreateRow key="create" name={typed} onClick={() => onCreate(typed)} /> : null;
      const list = rows.length ? rows.map(row => <SourceMenu.Item key={row.id} icon={projectRow.icon} checked={row.checked} data-project-id={row.id}
        keepOpen={!projectRow.closeOnClick} onClick={() => onPick?.(chatProjectPick(row.id, currentProjectId))}>{row.label}</SourceMenu.Item>)
        : query && create ? null : <SourceMenu.Item disabled={projectNotice.disabled}>{t((query ? m.noMatches : m.noProjectsYet).defaultMessage)}</SourceMenu.Item>;
      return <>{leading}{list}{trailing}</>;
    }}
  </EnvironmentSearchablePopup>;
}
