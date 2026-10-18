// The Code sidebar's sections layout (R3-sections, work item sidebar-sections-layout; research/sidebar-sections.md WI-3;
// decisions D10): Pinned → the manual sections → Sessions, in the order of the section list, the way 2.42304.0 lays the
// list out once the presets gate is on (shared-22 Cj → iO). Pure: the rows themselves come from the host's own list
// model (src/sidebar-model.js buildSidebarGroups: status filter, sort, Pinned order, date / state / folder buckets); this
// module only decides which section each row goes to and how each part is bucketed and cut, with the original
// 2.42304.0 functions for everything they answer:
//   - the section list: config.sidebarSections from main (electron/sidebar-sections-store.mjs, shared-52 kp/Bp/Em);
//   - which manual sections show: shared-22 KO (generated/sidebar-sections/section-visibility.mjs), unless Sessions'
//     Show › Empty groups is on (Cj `Mr = !z && (U === "custom" || bt || K)`);
//   - Sessions' grouping: shared-16 Qf / ep (`Gf(e, sn).groupBy` mapped back by shared-52 hp, unset → shared-52 vh/_h:
//     the desktop app's "project"), its sort, ascending, empty groups and metadata (shared-16 np / sp, shared-20);
//   - a manual section's sub-buckets: shared-22 oO / sO (`groupBy === "date" || groupBy === "status"`, keys prefixed
//     `${rO(id)}:`, drawsOpenRows, the first heading flush), its rows sorted by its own view (oO's dv / Pu providers);
//   - the cuts: Cj `truncateAt: 5` for a manual section, `Sr = W !== null && U !== "none" ? 5 : 20` for Sessions, qk's
//     20 for Pinned; sO passes no truncateAt (cap Infinity), so a sub-grouped section is never cut.
// Rows that are pinned show in Pinned only (Cj `if (Bt.has(Z(n.ref))) continue;`).
import { buildSidebarGroups, normalizeSidebarPreferences, sessionParentId, OTHER_PROJECT_KEY, isCustomOrderKey, withSectionOrder, sessionArchived } from './sidebar-model.js';
import { hasPendingApproval, latestTurnError } from './state.js';
import { sidebarSectionsFor } from '../electron/sidebar-sections-store.mjs';
import {
  customGroupKey, defaultSection, sessionsSectionId, pinnedSectionId, legacyGroupByFromSessions, effectiveGroupBy,
  sessionsGroupByFromLegacy, codeKeyPrefix, normalizeSections, customGroupKeyPrefix, moveSection,
} from './generated/sidebar-sections/sections-model.mjs';
import { visibleCustomGroups } from './generated/sidebar-sections/section-visibility.mjs';

/** shared-22 rO (generated section-view-menu.mjs sectionSortableId, which this pure module cannot load without the
 * renderer adapters; tests/sidebar-sections-layout.test.mjs holds the two equal): `section:${id}`. */
export const sectionSortableId = (id) => `section:${id}`;

/** Cj / qk truncation: manual sections 5, Sessions 5 while grouped and 20 flat, Pinned 20. */
export const SECTIONS_TRUNCATE_AT = Object.freeze({ manual: 5, grouped: 5, flat: 20, pinned: 20 });
/** The fold key the host's flat Sessions list has always used (sidebar-model groupBy none). */
export const SESSIONS_FLAT_KEY = 'sessions';
/** The list fields the Sessions section owns under the presets gate (shared-16 ip / op / sp, shared-20 ga). */
export const SESSIONS_VIEW_FIELDS = Object.freeze(['groupBy', 'sortBy', 'ascending', 'showEmptyGroups', 'showMetadata']);

/**
 * The section list the sidebar renders: main's snapshot (sidebarSections, kept in step with the renderer's groups by kp),
 * or -- with none yet (before init, or a host without the sidebar-state store) -- the one main would derive from the
 * legacy fields (sidebarSectionsFor: Em, and $b's Bp until the layout has seeded it).
 */
export function sidebarSectionsList({ sidebarSections, customGroups = [], sessionMetadata = {}, sidebarPreferences, projectOrder = [] } = {}) {
  const config = { customGroups, sessionMetadata, sidebarPreferences, projectOrder };
  const stored = Array.isArray(sidebarSections) && sidebarSections.length > 0 ? normalizeSections(sidebarSections) : null;
  return stored ? sidebarSectionsFor({ ...config, sidebarSections: stored, sidebarSectionsSeeded: true }) : sidebarSectionsFor(config);
}

/** shared-16 Gf(e, sn): the Sessions section, or its default record. */
export function sessionsSectionOf(sections = []) {
  return sections.find(section => section.id === sessionsSectionId) ?? defaultSection(sessionsSectionId);
}

/** shared-16 ep("code") under the presets gate: Qf (hp of the Sessions groupBy) or, unset, vh → _h("code", desktop). */
export function sessionsGroupBy(sections = []) {
  const { groupBy } = sessionsSectionOf(sections);
  return effectiveGroupBy(groupBy === undefined ? undefined : legacyGroupByFromSessions(groupBy), 'code', true);
}

/**
 * The list preferences of the sections layout: the host's sidebar preferences (status, PR status, nested folds, bucket
 * folds) with the five list fields read from the Sessions section, as the filter menu shows them under the presets gate.
 * Code lists only active sessions (the Sessions page lists the archived ones).
 */
export function sectionsPreferences(preferences, sections = []) {
  const sessions = sessionsSectionOf(sections);
  return {
    ...normalizeSidebarPreferences(preferences), status: 'active',
    groupBy: sessionsGroupBy(sections), sortBy: sessions.sortBy, ascending: sessions.ascending,
    showEmptyGroups: sessions.show.emptyGroups, showMetadata: sessions.show.metadata,
  };
}

/**
 * The filter menu's change of the Sessions-owned fields as the Sessions setSectionView patch (shared-16 ip
 * `{groupBy: Wt(t) ?? "none"}`, op `{sortBy}`, sp `{show: {emptyGroups}}`, shared-20 `{ascending}` / `{show: {metadata}}`);
 * null when none of them changed.
 */
export function sessionsViewPatch(before, after) {
  const patch = {}, show = {};
  if (after.groupBy !== before.groupBy) patch.groupBy = sessionsGroupByFromLegacy(after.groupBy) ?? 'none';
  if (after.sortBy !== before.sortBy) patch.sortBy = after.sortBy;
  if (after.ascending !== before.ascending) patch.ascending = after.ascending;
  if (after.showMetadata !== before.showMetadata) show.metadata = after.showMetadata;
  if (after.showEmptyGroups !== before.showEmptyGroups) show.emptyGroups = after.showEmptyGroups;
  if (Object.keys(show).length) patch.show = show;
  return Object.keys(patch).length ? patch : null;
}

/** shared-16 ip / op: under the presets gate the legacy groupByByMode / sortByByMode are not written (`qf() || …`).
 * The host's sidebar preferences keep their own values of the Sessions-owned fields (D10: legacy fields are kept). */
export function withLegacyListFields(next, legacy) {
  const kept = normalizeSidebarPreferences(legacy);
  return { ...normalizeSidebarPreferences(next), ...Object.fromEntries(SESSIONS_VIEW_FIELDS.map(field => [field, kept[field]])) };
}

const subGroupBy = (section) => section.groupBy === 'date' ? 'date' : section.groupBy === 'status' ? 'state' : null;

/**
 * Lays the Code list out by sections. Returns
 *   preferences: the sections layout's list preferences (sectionsPreferences);
 *   layout: [{kind: 'pinned' | 'manual' | 'sessions', section, key, label, buckets, ...}] in section order (manual
 *     sections KO does not show are left out);
 *   buckets: every row-holding bucket in list order (each row in exactly one), for truncation, selection order, the
 *     row registry and the drag targets. A bucket: the host bucket ({key, label, sessions, kind, ...}) plus
 *     truncateAt, sectionId (the section whose collapsed flag folds it), ownSection / showMetadata (oO's list context
 *     for its rows), heading ('group' for a sub-bucket: uD data-kind), drawsOpenRows and flushHeading (sO);
 *   assignments: {"code:<id>": groupId} (KO / the header menu's counts), shownIds (KO's set, undefined = all).
 */
export function buildSidebarSections({
  sections = [], sessions = [], preferences, metadata = {}, customGroups = [], knownFolders = [], state = {}, fallbackCwd = '',
  now = Date.now(), locale, pinnedOrder = [], repoIdentities = {}, projectOrder = [], keptWhileEmpty = [], held = false, statusGrouping = true,
} = {}) {
  const prefs = sectionsPreferences(preferences, sections);
  const groups = customGroups.filter(group => typeof group?.id === 'string' && group.id && typeof group.name === 'string' && group.name);
  const groupIds = new Set(groups.map(group => group.id));
  const common = { metadata, customGroups, knownFolders, state, fallbackCwd, now, locale, pinnedOrder, repoIdentities, projectOrder, search: '', currentLayout: true };
  // The rows of the list (status filter, sort and Pinned order as the host list has them), as one flat pass.
  const listed = buildSidebarGroups({ ...common, sessions, preferences: { ...prefs, groupBy: 'none' } });
  const pinnedBucket = listed.find(group => group.kind === 'pinned') ?? null;
  const rest = listed.find(group => group.kind === 'none')?.sessions ?? [];
  const groupOf = (session) => {
    const id = metadata[session.id]?.customGroupId;
    return typeof id === 'string' && groupIds.has(id) ? id : undefined;
  };
  const assignments = {};
  for (const [id, meta] of Object.entries(metadata ?? {})) if (typeof meta?.customGroupId === 'string' && groupIds.has(meta.customGroupId)) assignments[codeKeyPrefix + id] = meta.customGroupId;
  const pinnedKeys = new Set((pinnedBucket?.sessions ?? []).map(session => codeKeyPrefix + session.id));
  // KO over every listed row (pinned ones too: a section whose only member is pinned still shows, empty). The host
  // files a nested child by its own assignment (official families nest by the side parent's key when Mu is on).
  const rows = [...(pinnedBucket?.sessions ?? []), ...rest].map(session => ({ ref: { kind: 'code', id: session.id },
    source: { kind: 'code', data: { sideParentId: sessionParentId(session, metadata) ?? undefined } } }));
  const shownIds = prefs.showEmptyGroups ? undefined : visibleCustomGroups({
    kind: 'code', groups, assignments, keptWhileEmpty, sessions: rows, held, heldPinnedKeys: new Set(),
    rememberedRows: () => 0, withUngrouped: false, pinnedKeys, familiesNest: false, routinesListed: false,
  });
  const layout = [], buckets = [];
  const manualSections = sections.filter(section => section.kind === 'manual' && (shownIds === undefined || shownIds.has(section.id)));
  for (const section of sections) {
    if (section.kind === 'pinned') {
      const bucket = pinnedBucket && { ...pinnedBucket, truncateAt: SECTIONS_TRUNCATE_AT.pinned, sectionId: section.id };
      if (bucket) buckets.push(bucket);
      layout.push({ kind: 'pinned', section, key: 'pinned', bucket });
    } else if (section.kind === 'manual') {
      const index = manualSections.indexOf(section);
      if (index < 0) continue;
      const group = groups.find(entry => entry.id === section.id);
      const label = group?.name ?? section.name;
      const key = customGroupKey(section.id);
      const own = rest.filter(session => groupOf(session) === section.id);
      // oO / sO: date (or, with Status offered, status) sub-buckets; otherwise the section's own rows. Either way its
      // rows follow the section's own sort and direction.
      const by = subGroupBy(section);
      const view = { ...prefs, groupBy: by === 'state' && !statusGrouping ? 'none' : by ?? 'none', sortBy: section.sortBy, ascending: section.ascending };
      const grouped = buildSidebarGroups({ ...common, sessions: own, preferences: view });
      const list = { ownSection: true, showMetadata: section.show.metadata, sortBy: section.sortBy };
      const subgrouped = view.groupBy !== 'none';
      const sectionBuckets = subgrouped
        ? grouped.map((entry, at) => ({ ...entry, key: `${sectionSortableId(section.id)}:${entry.key}`, parentKey: key, parentSectionId: section.id,
          heading: 'group', drawsOpenRows: true, flushHeading: at === 0, truncateAt: undefined, ...list }))
        : [{ key, label, sessions: grouped.find(entry => entry.kind === 'none')?.sessions ?? [], kind: 'manual', customGroupId: section.id,
          sectionId: section.id, truncateAt: SECTIONS_TRUNCATE_AT.manual, ...list }];
      buckets.push(...sectionBuckets);
      layout.push({ kind: 'manual', section, key, label, rows: own, buckets: sectionBuckets, subgrouped, index, count: manualSections.length,
        sortableId: sectionSortableId(section.id) });
    } else if (section.kind === 'sessions') {
      const unsectioned = rest.filter(session => groupOf(session) === undefined);
      const flat = prefs.groupBy === 'none';
      const grouped = buildSidebarGroups({ ...common, sessions: unsectioned, preferences: prefs });
      const sessionsBuckets = grouped.map(entry => flat
        ? { ...entry, key: SESSIONS_FLAT_KEY, truncateAt: SECTIONS_TRUNCATE_AT.flat, sectionId: section.id, showMetadata: prefs.showMetadata }
        : { ...entry, truncateAt: SECTIONS_TRUNCATE_AT.grouped, heading: 'group', showMetadata: prefs.showMetadata });
      buckets.push(...sessionsBuckets);
      layout.push({ kind: 'sessions', section, key: SESSIONS_FLAT_KEY, flat, buckets: sessionsBuckets });
    }
  }
  const { statusRows, respondingIds } = sectionStatusRows(listed.flatMap(group => group.sessions), { state, metadata });
  return { preferences: prefs, layout, buckets, assignments, shownIds, pinnedKeys, statusRows, respondingIds };
}

/**
 * R4g-sidebar SB1 (X7-04): the row records the folded section badge (shared-21 HG over zG / LG) reads, from the host's
 * engine state, the way the host rows read it (sidebar-session-current-model.mjs currentSidebarSession):
 *   {ref, source: {kind: 'code', data: {isArchived}}, hasError, liveStatus: 'awaiting' | 'running' | 'idle',
 *    pendingPermissions, isUnread}
 * and the responding ids (shared-11 n_: state.active, or a session whose status is active), which zG counts as running
 * and which keep a stale error from showing. Host differences: a pending approval is "awaiting" (the host has no server
 * liveStatus for it); unread is the sidebar's mark or the session's own (a row open in a pane is not told apart: the
 * host draws no open rows in a folded bucket, see source-sidebar-sections.jsx).
 */
export function sectionStatusRows(sessions = [], { state = {}, metadata = {} } = {}) {
  const statusRows = new Map(), respondingIds = new Set();
  for (const session of sessions) {
    if (!session?.id || statusRows.has(session.id)) continue;
    const meta = metadata[session.id] ?? {};
    if (state.active?.[session.id] || session.status?.type === 'active') respondingIds.add(session.id);
    const awaiting = hasPendingApproval(state, session.id) || session.liveStatus === 'awaiting';
    statusRows.set(session.id, {
      ref: { kind: 'code', id: session.id },
      source: { kind: 'code', data: { isArchived: sessionArchived(session) } },
      hasError: !!(latestTurnError(state, session.id) || state.errors?.[session.id] || session.hasError),
      liveStatus: awaiting ? 'awaiting' : session.liveStatus === 'running' ? 'running' : 'idle',
      pendingPermissions: Number.isFinite(session.pendingPermissions) ? session.pendingPermissions : 0,
      isUnread: !!meta.unread || !!session.isUnread,
    });
  }
  return { statusRows, respondingIds };
}

/**
 * shared-22 bC `Ee` and the badge condition, for one bucket: the rows a folded bucket's heading summarizes
 * (`B === null || !z ? yC : Ce ? r.filter(e => !xe(e)) : r`: none while open; folded, every row not drawn as an open
 * row -- the host draws none, so all of them) and whether the heading gets the badge (`W ? Ee.length > 0 : Ee.some(LG)`:
 * W is fadeLabel, which every heading of the host's sections layout sets, as qk's Pinned `de && F && O.length > 0`).
 * Returns the rows, or null for no badge.
 */
export function foldedBadgeRows(sessions = [], folded, statusRows) {
  if (!folded || !statusRows) return null;
  const rows = sessions.map(session => statusRows.get(session.id)).filter(Boolean);
  return rows.length > 0 ? rows : null;
}

/**
 * R4g-sidebar SB1 (X7-05): the section list with the section folds the sidebar has sent to main but whose answer has
 * not come back yet (`pending`: Map<sectionId, collapsed>). Officially the sidebar store is local, so shared-19 aZ's
 * `flushSync(onExpand)` opens a folded section before Select all reads the visible rows; here main's snapshot is the
 * truth, and this overlay is what makes the same flushSync show the rows at once. Sections without a pending fold, and
 * the list itself when nothing differs, keep their identity.
 */
export function withPendingSectionFolds(sections, pending) {
  if (!Array.isArray(sections) || !pending || pending.size === 0) return sections;
  let changed = false;
  const next = sections.map(section => {
    if (!pending.has(section.id) || pending.get(section.id) === section.collapsed) return section;
    changed = true;
    return { ...section, collapsed: pending.get(section.id) };
  });
  return changed ? next : sections;
}

/**
 * R4g-sidebar fix (review of SB2, X7-03): the section list with the section moves (iO `x` Move up / down and `b`, a
 * dropped drag) the sidebar has sent to main but whose snapshot has not come back yet (`moves`: [{id, index}] in the
 * order they were sent). Officially the store is local, so the dropped section is at its new place in the same frame
 * the drag ends (dnd-kit clears its transform then); main applies the very same moveSection (shared-16 zp:
 * Sessions stays last, the position is clamped to length - 2), so each pending move is that function over main's list.
 * The list keeps its identity when no move changes it.
 */
export function withPendingSectionMoves(sections, moves) {
  if (!Array.isArray(sections) || !Array.isArray(moves) || moves.length === 0) return sections;
  return moves.reduce((list, move) => moveSection(list, move.id, move.index), sections);
}

/** The section whose collapsed flag hides the bucket `key` (its own, or a sub-bucket's manual section), or null. */
export function foldingSection(layout, key) {
  const own = sectionFoldTarget(layout, key);
  if (own) return own;
  for (const entry of layout) if (entry.kind === 'manual' && entry.subgrouped && entry.buckets.some(bucket => bucket.key === key)) return entry.section;
  return null;
}

/** The section a fold key belongs to (its collapsed flag folds it), or null for a bucket folded in collapsedGroups. */
export function sectionFoldTarget(layout, key) {
  for (const entry of layout) {
    if (entry.kind === 'pinned' && key === 'pinned') return entry.section;
    if (entry.kind === 'manual' && key === entry.key) return entry.section;
    if (entry.kind === 'sessions' && entry.flat && key === SESSIONS_FLAT_KEY) return entry.section;
  }
  return null;
}

/**
 * The keys folded in the sections layout: each section's collapsed flag for its own key (Pinned, a manual section and
 * every sub-bucket under it, the flat Sessions list), and collapsedGroups for every other bucket (Sessions' date / state /
 * folder buckets, a manual section's sub-buckets: bC `po(e)` / toggleGroupCollapsed). Keys that a section owns are read
 * from the section only (the legacy "pinned" / "sessions" / custom fold keys were seeded into the sections by Bp).
 */
export function sectionsFoldedKeys(layout, collapsedGroups = []) {
  const owned = new Set(['pinned', SESSIONS_FLAT_KEY, 'recents']);
  const folded = new Set();
  for (const entry of layout) {
    if (entry.kind === 'manual') owned.add(entry.key);
    if (!entry.section?.collapsed) continue;
    if (entry.kind === 'pinned') folded.add('pinned');
    else if (entry.kind === 'manual') { folded.add(entry.key); for (const bucket of entry.buckets) folded.add(bucket.key); }
    else if (entry.kind === 'sessions' && entry.flat) folded.add(SESSIONS_FLAT_KEY);
  }
  for (const key of collapsedGroups) {
    if (owned.has(key) || key.startsWith('custom:') || key.startsWith(customGroupKeyPrefix)) continue;
    folded.add(key);
  }
  return folded;
}

/** The row registry the original header-menu items read (shared-6 cO/qD/oO: bucket keys, row records, visible keys). */
export function sectionsRowRegistry({ layout, buckets, visibleOrder = [], metadata = {}, state = {}, isWorking = () => false, openIds = [] }) {
  const key = (id) => codeKeyPrefix + id;
  const byBucket = new Map(), records = new Map();
  for (const bucket of buckets) {
    byBucket.set(bucket.key, bucket.sessions.map(session => key(session.id)));
    for (const session of bucket.sessions) records.set(key(session.id), {
      ref: { kind: 'code', id: session.id }, codeRef: { id: session.id, type: session.type ?? 'local' },
      isAgentOwned: false, startedByAccountId: undefined, isArchived: session.archived === true || session.isArchived === true,
      isPinned: metadata[session.id]?.pinned === true, canPin: true, isWorking: !!state.active?.[session.id] || isWorking(session),
    });
  }
  // bC `w !== void 0 && os(e, X…)`: a manual section with sub-buckets still registers all its rows under its own key.
  for (const entry of layout) if (entry.kind === 'manual' && entry.subgrouped) byBucket.set(entry.key, entry.rows.map(session => key(session.id)));
  return { buckets: byBucket, rows: records, visible: visibleOrder.map(key), open: new Set(openIds.filter(Boolean).map(key)) };
}

/**
 * R3-sections (WI-4): a Sessions folder bucket's header menu (shared-22 nT → sT → bC, the original shared-20 yx as a
 * "worked-out" group). null for any other bucket (Pinned, date / status buckets: bC without a groupMenuKind). Returns
 * {onNewSession, order}: `order` is sT's `pn` (shared-19 x$) slot -- nT's `X.indexByBucketKey` over the folder buckets
 * other than Other (`project-${cT}`), so Other has none and yx shows Move up / Move down greyed with QX.fixedAtEnd --
 * with `move(from, to)` (nT `fe`: the order keys with one moved, saved through `save`) and, only while an order is stored
 * (nT `pe`: `U.length !== 0`), `reset` (H([]): back to the name order; "Sort A to Z" since `resetsToRecent` is for presets).
 * Host: the stored order is config.projectOrder, which also holds the legacy `ccg::` custom-group order (D10 keeps it), so
 * only the folder keys count as "an order is stored" and the reset keeps the `ccg::` keys (officially H([]) clears the
 * whole account preference).
 *   order: the folder buckets' order keys in list order (sectionOrderKeys); projectOrder: the stored order;
 *   newSession: the folder's new session (none for Other); save(ids): store a new projectOrder.
 */
export function folderBucketMenu(group, { order = [], projectOrder = [], newSession, save } = {}) {
  if (group?.kind !== 'project' || typeof save !== 'function') return null;
  const at = group.projectKey && group.projectKey !== OTHER_PROJECT_KEY ? order.indexOf(group.projectKey) : -1;
  const stored = Array.isArray(projectOrder) ? projectOrder.filter(key => typeof key === 'string') : [];
  const move = (from, to) => {
    if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, order[from]);
    save(withSectionOrder(stored, next));
  };
  const reset = stored.some(key => !isCustomOrderKey(key)) ? () => save(stored.filter(isCustomOrderKey)) : undefined;
  return { onNewSession: newSession, order: at === -1 ? null : { index: at, count: order.length, move, reset } };
}

/** The pinned section's id (shared-52 ap). */
export { pinnedSectionId, sessionsSectionId };
