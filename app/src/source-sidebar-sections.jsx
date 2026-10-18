// The Code sidebar's sections layout (R3-sections, work item sidebar-sections-layout; research/sidebar-sections.md WI-3;
// decisions D10). src/sidebar-sections-layout.mjs decides what each section holds; this module renders it the way
// 2.42304.0 does (shared-22 iO / oO / bC, shared-22 qk for Pinned, WC / bw / eT buckets for Sessions) with the original
// pieces generated into src/generated/sidebar-sections:
//   - every heading is shared-18 uD (exported `gs`; dD inline rename for a manual section);
//   - every manual section is wrapped the way iO wraps it: shared-19 x$ (SectionSortable: the Move up / Move down /
//     Alt+Shift+Arrow reorder context) around shared-20 yx (the section's context menu, with the section element as its
//     trigger) around shared-19 f$ (the reorder gate) around the heading, whose trailing control is shared-22 eO (the
//     section's own Group and sort menu, tO);
//   - every section element carries shared-21 Uk (hover-within / focus-within, which drives uD's caret) and bC's
//     classes and data attributes (data-group-list / data-group-label for a manual section, data-flush-heading,
//     data-cycle-expands-group on a folded sub-bucket, data-empty-group-hint);
//   - the store the original pieces call (useSidebarSectionsStore) is hydrated from main's snapshot, its section actions
//     are bridged to main (connectSidebarSectionActions), the section layout seeds main's record once (shared-22 ex()),
//     and the row registry, selection and bulk archive the header menu's items read are the sidebar's own.
// The rows, Show more, folders' "+" and the Older bucket menu stay the host sidebar's (SourceSidebar passes them in);
// see the R3-sections report for what is still the host's.
// R3-sections step 2 (sidebar-group-menus-current, WI-4): a Sessions folder bucket is sT → bC too -- its section
// element is shared-20 yx's trigger as a "worked-out" group (FolderBucket), inside shared-19 x$ when it can move -- and
// the whole list is the trigger of shared-21 _B, the blank-area menu (SidebarBlankArea), which also gives everything
// in the list its list context (getList: the header menus' Select all and Collapse all / Expand all).
// R4g-sidebar SB1 (research-ext/X7-partial-gaps.md X7-04 / X7-05): a folded bucket's heading carries the original
// status badge (shared-21 HG through bC's `badge`), and a section fold sent to main shows at once (a pending overlay over
// main's snapshot, usePendingSectionFolds), so Select all on a folded section (shared-19 aZ: flushSync(onExpand), then
// the visible rows) selects its rows without waiting for main's answer.
// R4g-sidebar SB2 (X7-03): sections and folder buckets reorder by drag, as officially: iO's and nT's shared-19 S$
// (SectionReorder, src/generated/sidebar-reorder) around them gives every x$ the drag bridge and mounts the lazily
// loaded c1afd40ea ProjectReorderBindings (dnd-kit); a drop commits through the existing paths -- a manual section via
// the store's moveSection (iO `b`, bridged to main's sidebar-state `move`), a folder bucket via its header menu's order
// move (nT `de`: the order keys with one moved, saved as projectOrder through onGroupAction "project-order").
// R4g-sidebar review fix: a section move sent to main (a drop, Move up / down) shows at once, like a fold -- a pending
// move over main's snapshot (beginPendingSectionMove, the same moveSection main runs) -- so the dropped section does not
// spring back to its old place for the IPC round trip after dnd-kit clears its transform.
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { SidebarGroupLabel } from './generated/sidebar-sections/group-label.mjs';
import { SidebarGroupMenu } from './generated/sidebar-sections/group-menu.mjs';
import { SectionViewButton } from './generated/sidebar-sections/section-view-menu.mjs';
import { SectionSortable } from './generated/sidebar-sections/section-sortable.mjs';
import { SectionReorderGate } from './generated/sidebar-sections/group-reorder.mjs';
import { SectionReorder } from './generated/sidebar-reorder/section-reorder.mjs';
import { groupDisabledReasons } from './generated/sidebar-sections/group-reasons.mjs';
import { sectionHoverHandlers } from './generated/sidebar-sections/section-hover.mjs';
import { selectCodeSidebar } from './generated/sidebar-sections/sections-model.mjs';
import { useCreateGroupDialog } from './generated/sidebar-sections/group-dialog.mjs';
import { SidebarBlankAreaHost } from './generated/sidebar-sections/blank-area-menu.mjs';
import { SidebarViewAllContext } from './generated/sidebar-sections/section-filter-controls.mjs';
import { sidebarViewAllValue } from './sidebar-filter-current-model.mjs';
import {
  useSidebarSectionsStore, hydrateSidebarSectionsStore, connectSidebarSectionActions, setSidebarRowRegistry,
  connectSidebarSelection, connectSidebarBulkArchive, connectSidebarBlankArea,
} from './source-sidebar-sections-adapters.jsx';
import { CdsDensityContext } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { SectionStatusBadge } from './generated/sidebar-sections/section-badge.mjs';
import { SidebarStatusLayout } from './generated/code-current/sidebar-status-glyph.mjs';
import { SectionRespondingIds } from './source-sidebar-section-badge-adapters.jsx';
import { foldedBadgeRows, withPendingSectionFolds, withPendingSectionMoves } from './sidebar-sections-layout.mjs';
import { t } from '../electron/i18n/index.mjs';

/** bC Fe: a bucket's section element classes (2.42304.0 shared-22). `source-session-group` keeps the host's hooks. */
export const SECTION_CLASS = 'source-session-group group/section relative isolate flex flex-col gap-px rounded-lg';
/** bC's empty manual section hint (`data-empty-group-hint`). */
export const EMPTY_SECTION_HINT_CLASS = 'df-label-inset flex min-h-[var(--df-row-h)] select-none items-center py-1 pe-[var(--df-row-px)] text-caption text-muted-as-secondary';

/**
 * The store, bridge and registry side of the sections layout, for SourceSidebar. `active`: the Code list renders the
 * sections layout. `snapshot`: {customGroups, sessionMetadata, sidebarPreferences, projectOrder, sidebarSections} as
 * the sidebar shows them; `onSectionAction(action, payload)`: main.jsx sectionAction (sidebar-state); `onError(reason)`.
 * `registry`: sectionsRowRegistry(...); `onSelect(keys)` / `onBulkArchive(request)`: the host selection and archive flow.
 */
export function useSidebarSectionsHost({ active, snapshot, metadata, onSectionAction, onError, registry, onSelect, onBulkArchive }) {
  const last = useRef(snapshot);
  last.current = snapshot;
  // Main's snapshot is the truth: whatever a bridged action did to the store locally is replaced when it changes.
  useLayoutEffect(() => {
    if (active) hydrateSidebarSectionsStore(snapshot, { metadata });
  }, [active, snapshot, metadata]);
  const send = useRef(null);
  send.current = (action, payload) => {
    // X7-05: a fold (setSectionView collapsed, expandGroup) shows before main answers; a refusal drops it again.
    // Review fix: so does a move (iO `x` / `b`, bridged as main's section-move).
    const fold = action === 'view' && typeof payload?.view?.collapsed === 'boolean' ? beginPendingSectionFold(payload.id, payload.view.collapsed)
      : action === 'move' && typeof payload?.id === 'string' && Number.isFinite(payload?.index) ? beginPendingSectionMove(payload.id, payload.index) : null;
    return Promise.resolve(onSectionAction?.(action, payload)).then(() => fold?.settle(), (reason) => {
      fold?.cancel();
      hydrateSidebarSectionsStore(last.current, { metadata });
      onError?.(reason);
    });
  };
  useEffect(() => {
    if (!active || !onSectionAction) return undefined;
    return connectSidebarSectionActions((action, payload) => send.current(action, payload));
  }, [active, !onSectionAction]);
  // shared-22 ex() / onIdentityResolve $b: the sections layout seeds main's record from the legacy preferences of this
  // moment (once; a seeded record stays as it is). Every window sends it once when its Code list first shows.
  const seeded = useRef(false);
  useEffect(() => {
    if (!active || !onSectionAction || seeded.current) return;
    seeded.current = true;
    send.current('seed', {});
  }, [active, !onSectionAction]);
  useLayoutEffect(() => { if (active && registry) setSidebarRowRegistry(registry); }, [active, registry]);
  const selectRef = useRef(onSelect), archiveRef = useRef(onBulkArchive);
  selectRef.current = onSelect; archiveRef.current = onBulkArchive;
  useEffect(() => active ? connectSidebarSelection((keys) => selectRef.current?.(keys)) : undefined, [active]);
  useEffect(() => active ? connectSidebarBulkArchive((request) => archiveRef.current?.(request)) : undefined, [active]);
}

// ---------------------------------------------------------------- X7-05: section folds pending at main
// Officially the frame store is local: a fold renders in the same flush (aZ's flushSync(onExpand) then reads the visible
// rows). Here main's snapshot is what the sidebar renders, so each fold sent to main is kept as pending -- sectionId ->
// collapsed -- and laid over the snapshot (withPendingSectionFolds) until main's snapshot shows it, until main has
// answered and a later snapshot arrives (main decided otherwise), or until main refuses it.
// Review fix (X7-03): section moves are pending the same way, in the order sent (pendingMoves), laid over the snapshot
// with main's own moveSection (withPendingSectionMoves) before the folds.
let pendingFolds = new Map();
let pendingMoves = [];
let pendingFoldView = { folds: new Map(), moves: [] };
let pendingFoldBase = null;
const pendingFoldListeners = new Set();
function emitPendingFolds() {
  pendingFoldView = {
    folds: new Map([...pendingFolds].map(([id, entry]) => [id, entry.collapsed])),
    moves: pendingMoves.map(({ id, index }) => ({ id, index })),
  };
  for (const listener of pendingFoldListeners) listener();
}
const subscribePendingFolds = (listener) => { pendingFoldListeners.add(listener); return () => pendingFoldListeners.delete(listener); };
const pendingFoldsNow = () => pendingFoldView;
/** A fold sent to main: {settle()} once main answered, {cancel()} when it refused. */
export function beginPendingSectionFold(id, collapsed) {
  const entry = { collapsed, settledAt: undefined };
  pendingFolds.set(id, entry);
  emitPendingFolds();
  const drop = () => { if (pendingFolds.get(id) === entry) { pendingFolds.delete(id); emitPendingFolds(); } };
  return {
    // Main has answered: its snapshot may still be on its way to this render, so the entry stays until a later one.
    settle: () => { if (pendingFolds.get(id) === entry) entry.settledAt = pendingFoldBase; },
    cancel: drop,
  };
}
/** A move sent to main (section id to position `index`, shared-16 zp): {settle()} once main answered, {cancel()} when it refused. */
export function beginPendingSectionMove(id, index) {
  const entry = { id, index, settledAt: undefined };
  pendingMoves = [...pendingMoves, entry];
  emitPendingFolds();
  return {
    settle: () => { if (pendingMoves.includes(entry)) entry.settledAt = pendingFoldBase; },
    cancel: () => { if (pendingMoves.includes(entry)) { pendingMoves = pendingMoves.filter((item) => item !== entry); emitPendingFolds(); } },
  };
}
/** Drops what the section list (main's snapshot) now answers. */
export function prunePendingSectionFolds(sections) {
  pendingFoldBase = sections;
  let changed = false;
  for (const [id, entry] of pendingFolds) {
    const section = Array.isArray(sections) ? sections.find((item) => item.id === id) : undefined;
    if (!section || section.collapsed === entry.collapsed || (entry.settledAt !== undefined && entry.settledAt !== sections)) {
      pendingFolds.delete(id);
      changed = true;
    }
  }
  // A move goes once the list (with the moves sent before it) already shows it, its section is gone, or main has answered
  // and a later snapshot came (main decided otherwise).
  let list = Array.isArray(sections) ? sections : [];
  const moves = pendingMoves.filter((entry) => {
    const moved = list.some((item) => item.id === entry.id) ? withPendingSectionMoves(list, [entry]) : list;
    if (moved === list || (entry.settledAt !== undefined && entry.settledAt !== sections)) return false;
    list = moved;
    return true;
  });
  if (moves.length !== pendingMoves.length) { pendingMoves = moves; changed = true; }
  if (changed) emitPendingFolds();
}
/** Forgets every pending fold and move (tests). */
export function clearPendingSectionFolds() {
  if (pendingFolds.size === 0 && pendingMoves.length === 0) return;
  pendingFolds = new Map();
  pendingMoves = [];
  emitPendingFolds();
}
/** The section list SourceSidebar lays out: main's snapshot with the moves and folds still pending at main. */
export function usePendingSectionFolds(sections) {
  const pending = useSyncExternalStore(subscribePendingFolds, pendingFoldsNow, pendingFoldsNow);
  useLayoutEffect(() => { prunePendingSectionFolds(sections); }, [sections]);
  return useMemo(() => withPendingSectionFolds(withPendingSectionMoves(sections, pending.moves), pending.folds), [sections, pending]);
}

// ---------------------------------------------------------------- X7-04: the folded section status badge
// bC `badge` (and qk's for Pinned): a folded heading summarizes its rows with shared-21 HG (`$v`). The rows' records and
// the responding ids come with the layout model (sidebar-sections-layout.mjs sectionStatusRows). HG's dot (shared-18
// FD) reads the sidebar's list-view context (uE, code-current SidebarStatusLayout) the way the host rows' marks do.
const SectionStatusRows = createContext(null);
const LIST_VIEW = Object.freeze({});
function useFoldedBadge(sessions, folded) {
  const rows = foldedBadgeRows(sessions, folded, useContext(SectionStatusRows));
  return rows ? <SidebarStatusLayout.Provider value={LIST_VIEW}><SectionStatusBadge sessions={rows} /></SidebarStatusLayout.Provider> : undefined;
}

/** shared-19 (the bulk archive flow, kind "bulk-archive"): the confirmation YX shows before Archive all, verbatim copy. */
export const BULK_ARCHIVE_COPY = Object.freeze({
  titleIn: { defaultMessage: 'Archive all sessions in \u201C{groupName}\u201D?', id: 'cTz9s1QgTQ' },
  title: { defaultMessage: 'Archive all sessions?', id: '+/2B+4uTbv' },
  description: { defaultMessage: '{count, plural, one {# session} other {# sessions}} will be archived.{unloadedRemain, select, true { Sessions that haven\u2019t loaded yet won\u2019t be archived.} other {}}', id: 'NPJPo26DXn' },
  confirm: { defaultMessage: 'Archive all', id: 'VCQX6dLcRo' },
});
/** That confirmation for the host's SourceConfirmDialog (confirmVariant primary). */
export function bulkArchiveConfirmCopy(intl, { groupName, count, unloadedRemain = false }) {
  return {
    title: groupName ? intl.formatMessage(BULK_ARCHIVE_COPY.titleIn, { groupName }) : intl.formatMessage(BULK_ARCHIVE_COPY.title),
    body: intl.formatMessage(BULK_ARCHIVE_COPY.description, { count, unloadedRemain: String(unloadedRemain === true) }),
    confirmLabel: intl.formatMessage(BULK_ARCHIVE_COPY.confirm), danger: false,
  };
}

/** The store's own section list (after hydrate: main's), for the original pieces' needs outside a render. */
export function storeSections() {
  return selectCodeSidebar(useSidebarSectionsStore.getState()).sections;
}

// R4i-sidebar SI1 (research-ext/Y/Y1-R3-sidebar2.md Y1-R3-sidebar2-2): shared-21 YG (`var YG=C(!1)`, read by XG and
// exported to shared-22 as `rv`): bC provides `z || te` around its rows, so a bucket drawn inside a folded one knows
// its rows are hidden (`te`) and leaves no cycle marker of its own. Host form of that one context (not generated).
const RowsHiddenContext = createContext(false);

/**
 * bC's rows part: `c("div", {className: z ? "hidden" : "contents", ...B !== null && z && !te && T &&
 * {"data-cycle-expands-group": e}, children: [p(rv.Provider, {value: z || te, children: …sC…}), …]})` -- folded, the
 * rows stay in the DOM inside a `hidden` container (so the session cycle's tm still lists their buttons, and rm unfolds
 * a drawsOpenRows bucket the step lands in); open, the host's rows container. Pinned folds as qk does (`!F && …`: no
 * rows). The container is the same element either way, so unfolding does not remount the rows.
 */
function BucketRows({ bucket, folded, pinned = false, rows, hint }) {
  const hiddenAbove = useContext(RowsHiddenContext);
  if (folded && pinned) return null;
  const marker = folded && !hiddenAbove && bucket.drawsOpenRows ? bucket.key : undefined;
  return <div className={folded ? 'hidden' : 'source-group-rows flex flex-col gap-px'} data-group-rows={folded ? undefined : ''}
    data-pinned-rows={pinned ? '' : undefined} data-cycle-expands-group={marker}>
    <RowsHiddenContext.Provider value={folded || hiddenAbove}>
      {rows}
      {hint}
    </RowsHiddenContext.Provider>
  </div>;
}

/** The band a section paints while a dragged row is held over it (bC, `l !== void 0`). */
function DropBand({ hot, extendTopPx = 0, extendBottomPx = 0 }) {
  return <div aria-hidden="true" className={'source-group-drop-band pointer-events-none absolute inset-x-0 rounded-lg transition-[background-color,box-shadow] ' + (hot ? 'bg-accent-muted ring-2 ring-inset ring-fill-accent' : '')}
    style={{ top: `calc(max(0px, var(--df-group-band-mt, var(--df-group-pt)) - 6px) - ${hot ? extendTopPx : 0}px)`, bottom: hot ? -extendBottomPx : 0 }} />;
}

/** Tn: a heading that moves with the rows while a drag opens a gap (`label:<key>`). The heading and its controls see
 * the sidebar's compact density, as under the official sidebar's CDS root (the host sets it per control, like the
 * row More and Group and sort buttons do). */
function Shift({ dragKey, host, children, ...props }) {
  return <div className="df-drag-shiftable" data-drag-key={dragKey} style={host.shiftStyle(dragKey)} {...props}>
    <CdsDensityContext.Provider value="compact">{children}</CdsDensityContext.Provider>
  </div>;
}

/** A bucket's empty hint (the host's "No active sessions" in Sessions), or null. */
function emptyHint(bucket, host, empty) {
  return bucket.sessions.length === 0 && empty !== undefined
    ? <p className="source-empty-group df-drag-shiftable" data-drag-key={`label:hint:${bucket.key}`} style={host.shiftStyle(`label:hint:${bucket.key}`)}>{empty}</p> : null;
}

/** A Sessions (or Pinned) bucket: bC without a manual section (W: fadeLabel; kind "group" for a sub-bucket). */
function HostBucket({ bucket, host, folded, trailing, label, pinned = false, foldable = true, empty }) {
  const rows = host.renderRows(bucket);
  const hint = emptyHint(bucket, host, empty);
  const badge = useFoldedBadge(bucket.sessions, foldable && folded);
  return <div className={SECTION_CLASS} data-group-key={bucket.key} data-pinned-list={pinned ? '' : undefined}
    data-flush-heading={bucket.flushHeading ? '' : undefined} {...sectionHoverHandlers}>
    <Shift dragKey={`label:${bucket.key}`} host={host}>
      <SidebarGroupLabel collapsed={foldable ? folded : undefined} onToggle={foldable ? () => host.toggle(bucket.key) : undefined}
        trailing={trailing} kind={bucket.heading} badge={badge} fadeLabel rowless={folded || (bucket.sessions.length === 0 && hint === null)}>{label ?? bucket.label}</SidebarGroupLabel>
    </Shift>
    <BucketRows bucket={bucket} folded={folded} pinned={pinned} rows={rows} hint={hint} />
    {pinned && folded && host.pinnedFoldedDrop}
  </div>;
}

/**
 * sT → bC for a Sessions folder bucket (environment grouping in the session list, presets gate on, D10). bC's
 * `V = B !== null && N !== void 0` with N = Kt({customGroupId, environment}) = "worked-out": the section element is
 * shared-20 yx's context-menu trigger with groupEditsHidden (`t && !j`: no Rename / Delete), no onCreateGroup (`O ? void 0`),
 * onNewSession `() => y("header_menu")` (the folder's new session; none for Other, whose New session shows greyed with
 * tZ's place-unknown reason), bulkBucketKey (truncateAt is set) and onExpand while folded; the heading sits in f$ with
 * `menu: !V`. sT wraps it in shared-19 x$ (pn) when the bucket has an order slot (not Other): Move up / Move down and,
 * with a stored order, onResetOrder ("Sort A to Z": resetsToRecent is for presets). `menu`: host.folderMenu(bucket) =
 * {onNewSession?, order: {index, count, move(from, to), reset?} | null}.
 */
function FolderBucket({ bucket, host, folded, trailing, label, empty, menu }) {
  const { key } = bucket;
  const toggle = useCallback(() => host.toggle(key), [host, key]);
  const hasNewSession = menu.onNewSession !== undefined;
  const greyed = useMemo(() => groupDisabledReasons('worked-out', hasNewSession), [hasNewSession]);
  const onExpand = folded ? toggle : undefined;
  const rows = host.renderRows(bucket);
  const hint = emptyHint(bucket, host, empty);
  const badge = useFoldedBadge(bucket.sessions, folded);
  const element = <div className={SECTION_CLASS} data-group-key={key} data-flush-heading={bucket.flushHeading ? '' : undefined} {...sectionHoverHandlers} />;
  const body = () => <>
    <Shift dragKey={`label:${key}`} host={host}>
      <SectionReorderGate onNewSession={menu.onNewSession} bulkBucketKey={key} onExpand={onExpand} groupName={label} menu={false}>
        <SidebarGroupLabel collapsed={folded} onToggle={toggle} trailing={trailing} kind={bucket.heading} badge={badge} fadeLabel
          rowless={folded || (bucket.sessions.length === 0 && hint === null)}>{label}</SidebarGroupLabel>
      </SectionReorderGate>
    </Shift>
    <BucketRows bucket={bucket} folded={folded} rows={rows} hint={hint} />
  </>;
  const groupMenu = <SidebarGroupMenu groupName={label} groupEditsHidden onNewSession={menu.onNewSession} bulkBucketKey={key}
    onExpand={onExpand} section={element} greyed={greyed}>{body}</SidebarGroupMenu>;
  if (!menu.order) return groupMenu;
  return <SectionSortable bucketKey={key} sectionIndex={menu.order.index} sectionCount={menu.order.count} onMoveSection={menu.order.move}
    onResetOrder={menu.order.reset} resetsToRecent={false}>{groupMenu}</SectionSortable>;
}

/**
 * shared-22 vj → shared-21 _B (imported as `v_`): `enabled: t === "code"`, `onNewSession`, `showCreateGroup` (Nm: the list
 * can make sections). The list element (`children`, the host's `.df-session-list`, official AS `df-session-list`) is the
 * blank-area ContextMenu's trigger; _B's list context covers everything inside it. Host answers: `onNewSession` is the
 * sidebar's New session, `onNewEnvironment` its saved-environment editor (bB's New environment, after going to a new
 * session as shared-20 ST does).
 */
export function SidebarBlankArea({ enabled, showCreateGroup, onNewSession, onNewEnvironment, children }) {
  const latest = useRef(null);
  latest.current = { onNewSession, onNewEnvironment };
  useEffect(() => enabled ? connectSidebarBlankArea({
    newSession: () => latest.current.onNewSession?.(),
    newEnvironment: () => latest.current.onNewEnvironment?.(),
  }) : undefined, [enabled]);
  const newSession = useCallback(() => latest.current.onNewSession?.(), []);
  return <SidebarBlankAreaHost enabled={enabled} showCreateGroup={showCreateGroup} onNewSession={onNewSession ? newSession : undefined}>
    {children}
  </SidebarBlankAreaHost>;
}

/** oO → bC for a manual section: the section element is yx's context-menu trigger (with dD's rename on its heading). */
function ManualSection({ entry, host, folded, onMoveSection, openCreate }) {
  const { section, key, label } = entry;
  const onNewSession = host.newSessionInSection ? () => host.newSessionInSection(entry) : undefined;
  const greyed = useMemo(() => groupDisabledReasons('hand-made', onNewSession !== undefined), [onNewSession !== undefined]);
  const toggle = useCallback(() => host.toggle(key), [host, key]);
  const hot = !!host.drag?.groupIntent && host.drag.groupIntent.groupId === section.id;
  const badge = useFoldedBadge(entry.rows, folded);
  const element = <div className={SECTION_CLASS} data-group-key={key} {...sectionHoverHandlers}
    {...(host.dropTargets ? { 'data-group-list': section.id, 'data-group-label': label } : {})} />;
  const trailing = <div className="flex items-center"><SectionViewButton section={section} />{host.sectionPlus?.(entry)}</div>;
  // bC: an empty manual section invites a drop (`_Y` shiftKey label:hint:{key}).
  const hint = <Shift dragKey={`label:hint:${key}`} host={host}><p data-empty-group-hint="" className={EMPTY_SECTION_HINT_CLASS}>{t('Drag or move sessions here')}</p></Shift>;
  const body = (renameProps) => <>
    <Shift dragKey={`label:${key}`} host={host}>
      <SectionReorderGate onNewSession={onNewSession} bulkBucketKey={key} onExpand={folded ? toggle : undefined} groupName={label} menu={false}>
        <SidebarGroupLabel collapsed={folded} onToggle={toggle} trailing={trailing} badge={badge} fadeLabel rowless={folded || entry.rows.length === 0} {...renameProps}>{label}</SidebarGroupLabel>
      </SectionReorderGate>
    </Shift>
    {entry.subgrouped
      // oO's rowsBody (sO) inside bC's container: folded, the sub-buckets stay in `hidden` under rv (no marker of their own).
      ? <div className={folded ? 'hidden' : 'contents'}><RowsHiddenContext.Provider value={folded}>
        {entry.buckets.map((bucket) => <HostBucket key={bucket.key} bucket={bucket} host={host} folded={host.folded.has(bucket.key)} />)}
        {entry.rows.length === 0 && hint}
      </RowsHiddenContext.Provider></div>
      : <BucketRows bucket={entry.buckets[0]} folded={folded} rows={host.renderRows(entry.buckets[0])} hint={entry.rows.length === 0 ? hint : null} />}
    {host.dropTargets && <DropBand hot={hot} extendTopPx={host.drag?.groupIntent?.extendTopPx} extendBottomPx={host.drag?.groupIntent?.extendBottomPx} />}
  </>;
  return <SectionSortable bucketKey={entry.sortableId} sectionIndex={entry.index} sectionCount={entry.count} onMoveSection={onMoveSection} keyboardReorder childOwnsMenu>
    <SidebarGroupMenu groupId={section.id} groupName={label} onCreateGroup={openCreate} onNewSession={onNewSession} bulkBucketKey={key}
      onExpand={folded ? toggle : undefined} section={element} greyed={greyed}>
      {body}
    </SidebarGroupMenu>
  </SectionSortable>;
}

/**
 * iO over the layout: Pinned, the manual sections (sortable), Sessions. `host`: {renderRows(bucket), shiftStyle(key),
 * toggle(key), folded: Set, drag, dropTargets, trailing(bucket, {first}), headerControls, folderMenu(bucket)?,
 * newSessionInSection(entry)?, sectionPlus(entry)?, pinnedFoldedDrop, emptyHint(bucket), viewAll}. R3-sections step 3:
 * `viewAll` is shared-21 HQ's facts ({onViewAll, listSettled, archivedInHand}); HQ provides View all's context (KH)
 * around the whole list, so the Sessions Group and sort and every section's own view menu (sU → cU) read the same value. iO's own new-section dialog
 * (shared-20 dx, `{ openCreate: s, createModal: u } = jd()`) is mounted here (the manual sections' header menus);
 * `createRef.current` hands its openCreate to the host's Group and sort menu. The "New section…" opener a section view
 * menu calls (shared-21 vB) is the blank-area host's (SidebarBlankArea, R3-sections step 2), as officially.
 */
export function SidebarSectionsList({ model, host, createRef }) {
  const moveSection = useSidebarSectionsStore((state) => state.moveSection);
  const { openCreate, createModal } = useCreateGroupDialog();
  if (createRef) createRef.current = openCreate;
  const manual = useMemo(() => model.layout.filter((entry) => entry.kind === 'manual'), [model.layout]);
  // iO `x(e, t, n)`: the section at e moves to the order of the one at t.
  const onMoveSection = useCallback((from, to) => {
    const moved = manual[from], target = manual[to];
    if (moved && target && moved !== target) moveSection(moved.section.id, target.section.order);
  }, [manual, moveSection]);
  // SB2, iO `v` / `y`: the sortable keys (rO, `section:<id>`) and drag-ghost labels of the manual sections; `b`: a drop
  // moves the dragged section to the order of the one it is over (the same store action as Move up / down).
  const reorderKeys = manual.map((entry) => entry.sortableId).join('\n');
  const reorder = useMemo(() => {
    const labelByKey = new Map(manual.map((entry) => [entry.sortableId, entry.label]));
    return { sortableKeys: [...labelByKey.keys()], labelByKey };
  }, [reorderKeys, manual.map((entry) => entry.label).join('\n')]);
  const onCommitDrag = useCallback((activeKey, overKey) => {
    const moved = manual.find((entry) => entry.sortableId === activeKey), target = manual.find((entry) => entry.sortableId === overKey);
    if (moved && target && moved !== target) moveSection(moved.section.id, target.section.order);
  }, [manual, moveSection]);
  return <SidebarViewAllContext value={sidebarViewAllValue(host.viewAll)}>
  <SectionRespondingIds.Provider value={model.respondingIds ?? EMPTY_IDS}><SectionStatusRows.Provider value={model.statusRows ?? null}>
  <SectionReorder sortableBucketKeys={reorder.sortableKeys} labelByBucketKey={reorder.labelByKey} onCommitDrag={onCommitDrag}><>{model.layout.map((entry) => {
    if (entry.kind === 'pinned') return entry.bucket && <HostBucket key="pinned" bucket={entry.bucket} host={host} folded={host.folded.has('pinned')} pinned label={t('Pinned')} />;
    if (entry.kind === 'manual') return <ManualSection key={entry.key} entry={entry} host={host} folded={host.folded.has(entry.key)} onMoveSection={onMoveSection} openCreate={openCreate} />;
    if (entry.kind !== 'sessions') return null;
    // No rows left for Sessions: its heading alone, with the list's controls (Cj's Yi; foldable only while flat).
    if (entry.buckets.length === 0) return <div key="sessions" className={SECTION_CLASS} data-group-key="sessions" {...sectionHoverHandlers}>
      <Shift dragKey="label:sessions" host={host}>
        <SidebarGroupLabel collapsed={entry.flat ? host.folded.has('sessions') : undefined} onToggle={entry.flat ? () => host.toggle('sessions') : undefined}
          trailing={<div className="flex items-center">{host.headerControls}</div>} fadeLabel rowless>{t('Sessions')}</SidebarGroupLabel>
      </Shift>
    </div>;
    return <SessionsBuckets key="sessions" entry={entry} host={host} />;
  })}{createModal}</></SectionReorder>
  </SectionStatusRows.Provider></SectionRespondingIds.Provider>
  </SidebarViewAllContext>;
}
const EMPTY_IDS = new Set();

/**
 * The Sessions buckets. eT/sT: a folder bucket has the worked-out header menu; the date / status buckets (bw / MT) and
 * the flat list none. SB2: folder buckets are nT's, which wraps them in its own shared-19 S$ -- `Y`: the buckets with an
 * order slot (not Other) by bucket key, their order key (the host's projectKey) as the position, their label for the
 * drag ghost -- and `de` commits a drop as the order keys with the dragged one moved to the slot of the one it is over
 * (c$), which is the header menu's order move from the dragged bucket's index to the target's (folderBucketMenu).
 */
function SessionsBuckets({ entry, host }) {
  const items = entry.buckets.map((bucket, at) => ({ bucket, trailing: host.trailing(bucket, { first: at === 0 }), folderMenu: entry.flat ? null : host.folderMenu?.(bucket) ?? null }));
  const ordered = items.filter((item) => item.folderMenu?.order);
  const signature = ordered.map(({ bucket }) => `${bucket.key}\u0000${bucket.projectKey ?? bucket.key}\u0000${bucket.label}`).join('\n');
  const reorder = useMemo(() => ({
    sortableKeys: ordered.map(({ bucket }) => bucket.key),
    labelByKey: new Map(ordered.map(({ bucket }) => [bucket.key, bucket.label])),
    positionByKey: new Map(ordered.map(({ bucket }) => [bucket.key, bucket.projectKey ?? bucket.key])),
  }), [signature]);
  const orders = useRef(null);
  orders.current = new Map(ordered.map(({ bucket, folderMenu }) => [bucket.key, folderMenu.order]));
  const onCommitDrag = useCallback((activeKey, overKey) => {
    const from = orders.current.get(activeKey), to = orders.current.get(overKey);
    if (from && to && from.index !== to.index) from.move(from.index, to.index);
  }, []);
  const buckets = items.map(({ bucket, trailing, folderMenu }) => {
    const props = { bucket, host, folded: host.folded.has(bucket.key), empty: host.emptyHint?.(bucket),
      trailing: trailing ? <div className="source-group-actions flex items-center">{trailing}</div> : undefined };
    if (folderMenu) return <FolderBucket key={bucket.key} {...props} label={bucket.label} menu={folderMenu} />;
    return <HostBucket key={bucket.key} {...props} label={entry.flat ? t('Sessions') : bucket.label} />;
  });
  if (!items.some((item) => item.folderMenu)) return <>{buckets}</>;
  return <SectionReorder sortableBucketKeys={reorder.sortableKeys} labelByBucketKey={reorder.labelByKey} positionByBucketKey={reorder.positionByKey}
    onCommitDrag={onCommitDrag}><>{buckets}</></SectionReorder>;
}
