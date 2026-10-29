import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// R6: view-tabs through its facade, by semantic name (main.jsx is the only importer; this page is not in the chat /
// composer / menu graph, E41).
import { CdsBadge, CdsButton, CdsConfirmationDialog, CdsDialog, CdsIcon, CdsRelativeTime, CdsSelectableTable, SessionsActionsRail, SessionsMoreButton,
  SessionsRowRail, useRowSelection } from './generated/view-tabs/index.js';
// cd75b47e6 l (official export t): the list page frame c623cddd3 H renders into (`I`), one copy via chat-projects (D1).
import { GalleryPageLayout } from './generated/chat-projects/index.mjs';
// shared-78 Sv: the sidebar copy table; with the hub look off (app-switch useHubLook) it is gv, the chat copy.
import { sidebarMessages } from './generated/sessions-page/pure-shared-78.mjs';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { menuTriggerProps } from './source-menu.jsx';
import { useSourceToasts } from './source-toast.jsx';
import { CHATS_PAGE_DEFAULT_FILTER, chatsPageRows, chatsPageRowKey, filterChatsPageRows, createChatsSearch, chatsSelectionTargets,
  chatDeleteDialogCopy, deleteChats, chatDeleteOutcomeToasts, selectionAfterRemoval, chatsPageHref, chatIdFromPageHref,
  TASKS_PAGE_MESSAGES, TASKS_SEARCH_ANNOUNCE_DELAY_MS, runTasksBulk, tasksBulkToasts, tasksMoveToast, tasksSearchAnnouncement } from './chats-page-model.mjs';
import './source-sessions-page.css';

// w13-chatui-chats-page (chatui-S3 / S6): the Chat mode Chats page. The frame, filter, search, selection bar, table
// and row layout are 3.6556.2 c623cddd3 H (exported ChatsPageClient), which on the desktop lists Cowork tasks; the
// chat copy comes from the official chat sources instead of H's task strings:
// - title: shared-78 gv conversationsTab with kind "chats" ("Chats");
// - search: cbd6c85c8 Hf's chats placeholder (eIP+ccvUsq, kind "chats") and its label "Search your activity";
// - Select (Hf kQAf2d9u+x) for H's "Select tasks", New chat (gv newConversation) for "New task";
// - empty states: Hf's non-Code branch ("Nothing matches “{query}”", "Nothing archived yet.", "No activity yet.");
// - delete: shared-11 OE, the chat delete confirmation (gv deleteTitle / deleteTitleCount …) and EE's toasts.
// Rows are chats (H's `Y` predicate: not Cowork tasks), so Archive and Move to project stay disabled with
// "({count} not movable)", as on the official page.
// w13-close-chat-surface (E74): with Cowork available (the E60 default) the page is H as the 3.6556.2 desktop renders it
// at /chats (`merged`): Chat and Cowork sessions in one list with H's task copy (Tasks, Search tasks..., Select tasks,
// New task, its empty states), Archive / Delete through H's own confirmation (`It`: "Archive selected tasks?" /
// "Delete selected tasks?") and toasts, Move to project through ye (TasksMoveToProjectDialog), and the debounced search
// announcement (c365fd3fe F) as the page status. The chat copy above stays for a host with Cowork turned off.
const keyboardEntry = event => event?.detail === 0 ? 'first' : undefined;
const NO_PROJECT_MOVE = Object.freeze({ archivable: [], movable: [] });
const LinkContext = React.createContext(null);

// c623cddd3 `de` (cc18d27d7 F): the row's router link, primary and the row's context-menu trigger. A local chat link
// opens the chat.
function ChatsPageLink({ href, onClick, ...props }) {
  const host = React.useContext(LinkContext);
  const id = chatIdFromPageHref(href);
  return <a {...props} href={href} data-primary onClick={event => {
    onClick?.(event); if (event.defaultPrevented) return;
    if (id !== null) { event.preventDefault(); host?.open(id); }
  }} onContextMenu={host?.menu && id !== null ? event => { event.preventDefault(); host.menu(id, event.currentTarget); } : undefined} />;
}

// c623cddd3 Ee: the row content (title, then the rail: the "{count} permissions" warning badge while the session waits on
// permission requests, the Archived badge in the All filter and the relative date).
function ChatsPageRowContent({ row, showArchivedBadge, intl, pendingPermissions = 0 }) {
  const title = row.title || intl.formatMessage({ defaultMessage: 'Untitled', id: '3kbIhS7KZS' });
  return <div className="flex min-h-8 items-center justify-between gap-md">
    <span className="min-w-0 truncate text-body text-primary">{title}</span>
    <SessionsRowRail>
      {pendingPermissions > 0 && <CdsBadge variant="warning">{intl.formatMessage(TASKS_PAGE_MESSAGES.permissions, { count: pendingPermissions })}</CdsBadge>}
      {showArchivedBadge && row.isArchived && <CdsBadge variant="neutral">{intl.formatMessage({ defaultMessage: 'Archived', id: '0HT+IbyW6O' })}</CdsBadge>}
      <CdsRelativeTime date={new Date(row.updatedAtMs || 0).toISOString()} locale={intl.locale} />
    </SessionsRowRail>
  </div>;
}

// shared-11 OE: the chat delete confirmation. `conversation` is one chat (Delete chat? / Are you sure you want to delete
// this chat?), `conversationIds` a bulk delete (Delete {count} chats? …). On confirm it closes, deletes and reports:
// one chat → "Chat deleted"; a bulk delete → "Deleting {count} chats…" until the run settles, then EE's toasts.
export function ChatDeleteDialog({ open, onClose, onConfirmed, conversation, conversationIds, rowsById, onDelete }) {
  const intl = useStartIntl(), messages = sidebarMessages(), toasts = useSourceToasts();
  const bulk = !!(conversationIds && conversationIds.length > 0);
  const ids = conversationIds || (conversation?.id ? [conversation.id] : []);
  const copy = chatDeleteDialogCopy(intl, messages, { count: ids.length, bulk });
  const byId = useMemo(() => rowsById ?? new Map(conversation ? [[conversation.id, { hostSession: conversation }]] : []), [rowsById, conversation]);
  const confirm = () => {
    if (!onDelete || ids.length === 0) { onClose?.(); return; }
    if (!bulk) {
      onClose?.();
      void deleteChats(ids, onDelete, byId).then(outcome => {
        if (outcome.deleted.length) toasts?.add(intl.formatMessage(messages.deleted), { variant: 'neutral', key: `deleted-chat:${ids[0]}` });
        else if (outcome.notDeleted.length > outcome.explained.length) toasts?.add(intl.formatMessage(messages.deleteFailedCount, { count: 1 }), { variant: 'danger' });
        onConfirmed?.(outcome.deleted);
      });
      return;
    }
    onClose?.();
    const pending = toasts?.add(intl.formatMessage(messages.deletingCount, { count: ids.length }), { variant: 'neutral', timeout: Infinity, key: `deleting-chats:${ids[0]}` });
    onConfirmed?.(ids);
    void deleteChats(ids, onDelete, byId).then(outcome => {
      if (pending != null) toasts?.close(pending);
      for (const toast of chatDeleteOutcomeToasts(outcome, { intl, messages })) toasts?.add(toast.message, { variant: toast.variant });
    });
  };
  return <CdsConfirmationDialog open={open} onOpenChange={next => { if (!next) onClose?.(); }} onConfirm={confirm}
    title={copy.title} description={copy.description} confirmLabel={copy.confirmLabel} confirmVariant={copy.confirmVariant} />;
}

// w13-close-chat-surface (E74): ye, H's Move to project dialog over the local projects (`M = j ? d : []`: the local
// sessions' list; no remote spaces here, so `e = []`). Each row is the official button (Projects icon, the name, the
// Computer icon); a pick moves every given task (`_e`: setProject per local id) and reports through tasksMoveToast; the
// dialog cannot be dismissed while it moves (`disablePointerDismissal: C`, `showClose: !C`).
export function TasksMoveToProjectDialog({ open, sessionIds = [], projects = [], onClose, onMove, onMoved }) {
  const intl = useStartIntl(), toasts = useSourceToasts();
  const [moving, setMoving] = useState(false);
  const pick = async project => {
    setMoving(true);
    try {
      const settled = await Promise.allSettled(sessionIds.map(id => Promise.resolve().then(() => onMove?.(id, project.id))));
      const moved = sessionIds.filter((_id, at) => settled[at].status === 'fulfilled' && settled[at].value !== false);
      const toast = tasksMoveToast({ moved: moved.length, skipped: sessionIds.length - moved.length, targetName: project.name }, intl);
      if (toast) toasts?.add(toast.message, { variant: toast.variant });
      if (moved.length > 0) onMoved?.(moved);
    } finally { setMoving(false); onClose?.(); }
  };
  const description = intl.formatMessage(sessionIds.length > 1 ? TASKS_PAGE_MESSAGES.moveMany : TASKS_PAGE_MESSAGES.moveOne);
  return <CdsDialog.Root open={open} onOpenChange={next => { if (!next && !moving) onClose?.(); }} disablePointerDismissal={moving}>
    <CdsDialog.Popup>
      <CdsDialog.Header showClose={!moving} description={description}>{intl.formatMessage(TASKS_PAGE_MESSAGES.moveTitle)}</CdsDialog.Header>
      {projects.length > 0 ? <div className="flex flex-col gap-1 max-h-80 overflow-y-auto -mx-1">
        {projects.map(project => <button key={project.id} type="button" disabled={moving} onClick={() => { void pick(project); }}
          className="flex items-center gap-2 w-full text-start px-3 h-10 rounded-lg hover:bg-surface-0 focus-visible:bg-surface-0 focus-visible:outline-none text-primary disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed">
          <CdsIcon name="Projects" size="md" className="text-secondary" />
          <span className="truncate flex-1">{project.name}</span>
          <CdsIcon name="Computer" size="sm" className="text-muted-as-secondary shrink-0" />
        </button>)}
      </div> : <div className="py-6 text-center text-sm text-muted-as-secondary">{intl.formatMessage(TASKS_PAGE_MESSAGES.noProjects)}</div>}
    </CdsDialog.Popup>
  </CdsDialog.Root>;
}

/**
 * sessions: the local sessions (main.jsx passes the non-Code list), metadata: the session metadata (surface), loading:
 * the first list load is still pending. merged (E74): Cowork is available, so the page is H as the desktop has it (the
 * Tasks list of every Chat and Cowork session); otherwise the Chat sessions with the chat copy. onOpen(id), onNew(),
 * onDelete(session) / onArchive(session) → Promise<boolean> (sessionAction), onMoveToProject(id, projectId), projects
 * (the local projects), pendingPermissionsOf(id) (Ee's permissions badge), onSessionMenu(session, anchor, entry) /
 * menuSessionId: the host row menu.
 */
export function SourceChatsPage({ sessions = [], metadata = {}, loading = false, merged = false, onOpen, onNew, onDelete, onArchive, onMoveToProject,
  projects = null, pendingPermissionsOf, onSessionMenu, menuSessionId, initialFilter = CHATS_PAGE_DEFAULT_FILTER }) {
  const intl = useStartIntl(), messages = sidebarMessages(), toasts = useSourceToasts();
  const [filter, setFilter] = useState(initialFilter), [query, setQuery] = useState('');
  const allRows = useMemo(() => chatsPageRows(sessions, { metadata, merged }), [sessions, metadata, merged]);
  const listed = useMemo(() => filterChatsPageRows(allRows, filter), [allRows, filter]);
  const search = useMemo(() => createChatsSearch(listed), [listed]);
  const trimmed = query.trim();
  const rows = useMemo(() => trimmed ? search.search(trimmed) : listed, [search, listed, trimmed]);
  const searching = trimmed.length > 0;
  const isLoading = loading && rows.length === 0;
  const selectRef = useRef(null);
  const selection = useRowSelection(rows, chatsPageRowKey, filter, { restoreFocusRef: selectRef });
  const selectedKeys = selection.selectedKeys, count = selectedKeys.length;
  const byId = useMemo(() => new Map(rows.map(row => [row.ref.id, row])), [rows]);
  const allById = useMemo(() => new Map(allRows.map(row => [row.ref.id, row])), [allRows]);
  const { archivable, movable } = useMemo(() => count ? chatsSelectionTargets(selectedKeys, byId) : NO_PROJECT_MOVE, [count, selectedKeys, byId]);
  const [deleting, setDeleting] = useState(null);
  // H `Z` / `Ve`: the bulk confirmation ({action, archivable, deletable}) and whether it is open; `ze`: Move to project.
  const [confirming, setConfirming] = useState(null);
  const [moving, setMoving] = useState(false);
  // c365fd3fe F: the announcement follows the message once it held still for 500 ms (`p = d === f ? d : ""`).
  const announcementText = merged ? tasksSearchAnnouncement(rows.length, trimmed, intl) : '';
  const [settledAnnouncement, setSettledAnnouncement] = useState(announcementText);
  useEffect(() => {
    if (!merged) return undefined;
    const timer = setTimeout(() => setSettledAnnouncement(announcementText), TASKS_SEARCH_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [merged, announcementText]);
  const announcement = settledAnnouncement === announcementText ? announcementText : '';

  const openRowMenu = useCallback((id, anchor, entry) => { const row = allById.get(id); if (row) onSessionMenu?.(row.hostSession, anchor, entry); }, [allById, onSessionMenu]);
  const link = useMemo(() => ({ open: id => onOpen?.(id), menu: onSessionMenu ? (id, anchor) => openRowMenu(id, anchor) : null }), [onOpen, onSessionMenu, openRowMenu]);
  // c623cddd3 Ce → cc18d27d7 L: the actions rail with I's "More options for {chatName}" trigger (the host row menu).
  const renderActions = useCallback(row => {
    if (!onSessionMenu) return null;
    const title = row.title || intl.formatMessage({ defaultMessage: 'Untitled', id: '3kbIhS7KZS' });
    return <SessionsActionsRail><SessionsMoreButton aria-label={intl.formatMessage({ defaultMessage: 'More options for {chatName}', id: 'ukZKEVU02W' }, { chatName: title })}
      {...menuTriggerProps({ open: menuSessionId === row.ref.id, onOpen: (entry, event) => openRowMenu(row.ref.id, event.currentTarget, entry) })}
      onClick={event => openRowMenu(row.ref.id, event.currentTarget, keyboardEntry(event))} /></SessionsActionsRail>;
  }, [intl, menuSessionId, onSessionMenu, openRowMenu]);
  const showArchivedBadge = filter === 'all';
  const renderContent = useCallback(row => <ChatsPageRowContent row={row} showArchivedBadge={showArchivedBadge} intl={intl}
    pendingPermissions={pendingPermissionsOf?.(row.ref.id) ?? 0} />, [showArchivedBadge, intl, pendingPermissionsOf]);
  const getRowLabel = useCallback(row => row.title || intl.formatMessage({ defaultMessage: 'Untitled', id: '3kbIhS7KZS' }), [intl]);
  const getRowHref = useCallback(row => chatsPageHref(row.ref.id), []);
  const onToggleRow = useCallback(row => selection.toggle(row.ref.id), [selection]);

  // c623cddd3 H `ct`: the "Filter by" icon action, Active / Archived / All as radio items.
  const filterItem = (value, label, id) => ({ label: intl.formatMessage({ defaultMessage: label, id }), checked: filter === value, checkedRole: 'radio', onSelect: () => setFilter(value) });
  const filterAction = { key: 'filter', icon: 'Filter', label: intl.formatMessage({ defaultMessage: 'Filter by', id: '/lwQDxsM2S' }), pressed: filter !== CHATS_PAGE_DEFAULT_FILTER,
    items: [filterItem('active', 'Active', 'mkr6ditwFt'), filterItem('archived', 'Archived', '0HT+IbyW6O'), filterItem('all', 'All', 'zQvVDJ+j59')] };
  const searchField = selection.isActive ? undefined : {
    value: query, onChange: setQuery, onClear: () => setQuery(''),
    placeholder: merged ? intl.formatMessage(TASKS_PAGE_MESSAGES.searchPlaceholder)
      : intl.formatMessage({ defaultMessage: '{kind, select, tasks {Search tasks...} chats {Search chats...} other {Search chats and tasks...}}', id: 'eIP+ccvUsq' }, { kind: 'chats' }),
    label: merged ? intl.formatMessage(TASKS_PAGE_MESSAGES.searchLabel) : intl.formatMessage({ defaultMessage: 'Search your activity', id: 'CVFvNQtJ29' }),
  };
  const selectLabel = merged ? intl.formatMessage(TASKS_PAGE_MESSAGES.select) : intl.formatMessage({ defaultMessage: 'Select', id: 'kQAf2d9u+x' });
  // H `Ge`: Archive / Delete open the confirmation with the counts it names ({archivable: Y.length, deletable: q}).
  const askBulk = action => { setConfirming({ action, archivable: archivable.length, deletable: count }); };
  const canArchive = merged && !!onArchive;
  const actions = selection.isActive ? <>
    <span className="text-body text-muted-as-secondary me-2">
      {intl.formatMessage({ defaultMessage: '{count} selected', id: 'NKPfmmHQdx' }, { count })}
      {filter !== 'archived' && movable.length < count && <>{' '}{intl.formatMessage({ defaultMessage: '({count} not movable)', id: 'GbAex7XW7M' }, { count: count - movable.length })}</>}
    </span>
    <CdsButton variant="secondary" onClick={selection.selectAll}>{intl.formatMessage({ defaultMessage: 'Select all', id: '94Fg25VD0N' })}</CdsButton>
    {filter !== 'archived' && <CdsButton variant="secondary" disabled={movable.length === 0} onClick={merged && onMoveToProject ? () => setMoving(true) : undefined}>{intl.formatMessage({ defaultMessage: 'Move to project', id: '+9Y66VlT9i' })}</CdsButton>}
    {(merged ? canArchive : true) && filter !== 'archived' && <CdsButton variant="secondary" disabled={archivable.length === 0} onClick={canArchive ? () => askBulk('archive') : undefined}>{intl.formatMessage({ defaultMessage: 'Archive', id: 'NOMnBofwOT' })}</CdsButton>}
    {onDelete && <CdsButton variant="secondary" disabled={count === 0} onClick={() => (merged ? askBulk('delete') : setDeleting([...selectedKeys]))}>{intl.formatMessage({ defaultMessage: 'Delete', id: 'K3r6DQW7h+' })}</CdsButton>}
    <CdsButton variant="ghost" onClick={selection.exit}>{intl.formatMessage({ defaultMessage: 'Cancel', id: '47FYwba+bI' })}</CdsButton>
  </> : rows.length > 0
    ? <CdsButton ref={selectRef} variant="secondary" onClick={() => selection.enter()}>{selectLabel}</CdsButton>
    : isLoading ? <CdsButton variant="secondary" disabled aria-hidden className="invisible">{selectLabel}</CdsButton> : null;
  const primaryAction = selection.isActive ? undefined
    : <CdsButton variant="primary" className="df-link-card" onClick={() => onNew?.()}>{merged ? intl.formatMessage(TASKS_PAGE_MESSAGES.newTask) : intl.formatMessage(messages.newConversation)}</CdsButton>;
  const emptyState = <p className="text-body text-muted-as-secondary whitespace-normal wrap-anywhere">
    {merged ? (searching ? intl.formatMessage(TASKS_PAGE_MESSAGES.noMatch, { query })
      : filter === 'active' ? intl.formatMessage(TASKS_PAGE_MESSAGES.noActive)
        : filter === 'archived' ? intl.formatMessage(TASKS_PAGE_MESSAGES.noArchived) : intl.formatMessage(TASKS_PAGE_MESSAGES.none))
      : searching ? intl.formatMessage({ defaultMessage: 'Nothing matches “{query}”', id: 'wPm6BlASlF' }, { query })
        : filter === 'archived' ? intl.formatMessage({ defaultMessage: 'Nothing archived yet.', id: 'srh54ZPZzU' })
          : intl.formatMessage({ defaultMessage: 'No activity yet.', id: 'NSk1hl3pEB' })}
  </p>;
  const afterDelete = removed => {
    const next = selectionAfterRemoval(selectedKeys, removed);
    if (next === null) selection.exit(); else selection.setSelectedIds(new Set(next));
  };
  // H `Ke` (the dialog's onConfirm; CdsConfirmationDialog stays busy until it settles): Archive runs over Y, Delete over
  // every selected key; the toasts, `o === 0 && G.exit()`, then `He(!1)` closes the dialog.
  const runBulk = async action => {
    const ids = action === 'archive' ? archivable : [...selectedKeys];
    const run = action === 'delete' ? onDelete : onArchive;
    if (!run || ids.length === 0) { setConfirming(null); return; }
    const outcome = await runTasksBulk(ids, run, allById);
    for (const toast of tasksBulkToasts(outcome, action, intl)) toasts?.add(toast.message, { variant: toast.variant });
    if (outcome.exit) selection.exit();
    setConfirming(null);
  };
  const confirmCopy = confirming && {
    title: intl.formatMessage(confirming.action === 'archive' ? TASKS_PAGE_MESSAGES.archiveTitle : TASKS_PAGE_MESSAGES.deleteTitle),
    confirmLabel: intl.formatMessage(confirming.action === 'archive' ? TASKS_PAGE_MESSAGES.archiveLabel : TASKS_PAGE_MESSAGES.deleteLabel),
    body: confirming.action === 'archive' ? intl.formatMessage(TASKS_PAGE_MESSAGES.archiveBody, { count: confirming.archivable })
      : intl.formatMessage(TASKS_PAGE_MESSAGES.deleteBody, { count: confirming.deletable }),
  };
  const title = merged ? intl.formatMessage(TASKS_PAGE_MESSAGES.title) : intl.formatMessage(messages.conversationsTab, { kind: 'chats' });
  return <div className="source-sessions-page source-chats-page" data-surface={merged ? 'cowork' : 'chat'}>
    <LinkContext value={link}>
      <GalleryPageLayout contentGap="none" title={title}
        iconActions={selection.isActive ? undefined : [filterAction]} search={searchField} actions={actions} primaryAction={primaryAction}
        status={merged && searching && !isLoading ? announcement : null}>
        <CdsSelectableTable data={rows} getRowKey={chatsPageRowKey} getRowHref={getRowHref} getRowLabel={getRowLabel} selection={selection}
          onToggleRow={onToggleRow} renderContent={renderContent} renderActions={renderActions} linkComponent={ChatsPageLink}
          emptyState={emptyState} isLoading={isLoading} isFetchingMore={false} isDesktop />
        {merged ? <>
          {onMoveToProject && <TasksMoveToProjectDialog open={moving} sessionIds={movable} projects={Array.isArray(projects) ? projects : []}
            onClose={() => setMoving(false)} onMove={onMoveToProject} onMoved={afterDelete} />}
          <CdsConfirmationDialog open={!!confirming} onOpenChange={next => { if (!next) setConfirming(null); }} title={confirmCopy?.title ?? ''}
            confirmLabel={confirmCopy?.confirmLabel} confirmVariant={confirming?.action === 'delete' ? 'danger' : 'primary'}
            onConfirm={() => runBulk(confirming?.action)}>{confirmCopy?.body}</CdsConfirmationDialog>
        </> : <ChatDeleteDialog open={!!deleting} conversationIds={deleting ?? undefined} rowsById={allById} onDelete={onDelete}
          onClose={() => setDeleting(null)} onConfirmed={afterDelete} />}
      </GalleryPageLayout>
    </LinkContext>
  </div>;
}
