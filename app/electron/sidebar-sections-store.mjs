// The Code sidebar's sections, persisted in config.json (work item sidebar-sections-store; research/sidebar-sections.md
// WI-2; decisions D10). Officially the sections live in the desktop frame store (shared-52 G `codeSidebarByScope`,
// localStorage "dframe-store" plus the account sync of shared-22 bx/Oc under the wire key `sidebarSections`); here they
// are `config.sidebarSections` (the official wire key) in the host's config.json, owned by the main process and sent to
// every window with the sidebar-state snapshot.
//
// Everything that shapes the list is the original 2.42304.0 code in electron/generated/sidebar-sections-model.mjs
// (shared-52, verbatim): kp (reconcile the sections with the custom groups), Bp (seed the legacy preferences), zp (move a
// section), Lp (set a section's view), Rp (a new section copies the Sessions view), Sp (normalize), um, _m. This module
// only reads the host's legacy store in their input shape -- the part shared-22 Qb / $b / Em read from the account's
// localStorage and the frame store officially -- and writes the result back:
//   config.customGroups [{id, name, codexSectionId?}]        -> customGroupsByScope.local.groups
//   config.sessionMetadata[id].customGroupId                 -> customGroupsByScope.local.assignments["code:<id>"]
//   config.projectOrder "ccg::<id>" keys                     -> Qb manualOrder (code-projects-order, Zb = "ccg::")
//   config.sidebarPreferences.groupBy / sortBy               -> Em codeGroupBy / codeSortBy (groupByByMode / sortByByMode)
//   config.sidebarPreferences.ascending / showEmptyGroups    -> Qb ascending / emptyGroups
//   config.sidebarPreferences.collapsedGroups                -> Qb pinnedCollapsed / sessionsCollapsed / isManualCollapsed
// The legacy fields stay the source of truth for the groups and their members (Codex threadSection mirrors exactly
// those, codex-sections.cjs) and are never removed; the sections' order and views exist only here (host difference:
// Codex has no section order or view to sync them to).
//
// When the sections are seeded. Officially onIdentityResolve stores Em's record and seeds it once ($b, `!i.prefsSeeded
// && Ic()`) as the app starts with the sections layout, so the record is taken from the legacy preferences as they are
// at the switch. Here the classic list stays on screen until the sections layout renders (R3) and keeps writing those
// preferences (project-order "ccg::", collapsedGroups, ascending / showEmptyGroups / groupBy / sortBy). So nothing is
// stored before the switch: sidebarSectionsFor derives the sections from the legacy fields as they are now, and the
// record is written -- seeded, Bp over the legacy preferences of that moment -- by the first section operation of the
// sections layout (section-move / section-view / create-group with `sections`) or by `sections-seed` (shared-22 ex(),
// for the layout to call when it first renders). Before that, syncSidebarSections only keeps an existing record in step
// with the groups (kp), never seeds it.
//
// Isomorphic on purpose: the renderer imports the request mapping and the store slice, so no Node built-ins here.
import {
  isPlainRecord, stringArray, normalizeSections, normalizeCustomGroups, reconcileSections, seedSectionPrefs, moveSection,
  setSectionView, inheritSessionsView, patchSectionView, customGroupKey, findCustomGroupByName, isSectionGroupBy,
  isSectionSortBy, codeKeyPrefix, sessionsSectionId,
} from "./generated/sidebar-sections-model.mjs";

/** The fixed group scope (officially `${accountUuid}/${orgUuid}`, shared-52 vm/ym; this host has no account). */
export const SIDEBAR_SECTIONS_SCOPE = "local";
/** shared-22 Zb: a custom group's key in the persisted section order (code-projects-order). */
export const LEGACY_CUSTOM_ORDER_PREFIX = "ccg::";
/** The host's legacy fold key of a custom group (src/sidebar-model.js `custom:<id>`); officially um(id) `custom-<id>`. */
export const LEGACY_CUSTOM_FOLD_PREFIX = "custom:";
// shared-22 Qb sessionsCollapsed: `collapsedGroups.includes("recents")`. The host's flat list folds as "sessions"
// (src/sidebar-model.js groupBy none), the same list.
const SESSIONS_FOLD_KEYS = Object.freeze(["recents", "sessions"]);
// src/sidebar-model.js CLASSIC_GROUP_OPTIONS: the legacy groupBy values the host ever stored. Anything else read as the
// default there, so it is not handed to mp (which would map an unknown value to "date").
const LEGACY_GROUP_BYS = Object.freeze(["date", "project", "state", "custom", "none"]);

const record = (value) => isPlainRecord(value);
const preferencesOf = (config) => record(config?.sidebarPreferences) ? config.sidebarPreferences : {};
const clone = (value) => structuredClone(value);
// JSON with sorted keys: the stored value equals the computed one regardless of the key order kp / Ip / Sp build.
const canonical = (value) => JSON.stringify(value, (key, entry) => record(entry) ? Object.fromEntries(Object.keys(entry).sort().map((name) => [name, entry[name]])) : entry);

/** shared-52 gm(state) for the host: customGroupsByScope.local in the official {groups, assignments, order} shape. */
export function legacyCustomGroups(config, metadata = config?.sessionMetadata) {
  // pm keeps the records with a string id and name; the official group record is {id, name}.
  const groups = (normalizeCustomGroups({ groups: config?.customGroups })?.groups ?? []).map(({ id, name }) => ({ id, name }));
  const ids = new Set(groups.map((group) => group.id));
  const assignments = {};
  if (record(metadata)) for (const [id, meta] of Object.entries(metadata)) {
    // shared-78 Ib session key `${kind}:${id}` (jh = "code:"); a group id that no longer exists files nothing.
    if (record(meta) && typeof meta.customGroupId === "string" && ids.has(meta.customGroupId)) assignments[codeKeyPrefix + id] = meta.customGroupId;
  }
  // The host keeps no manual member order inside a group (official `order[groupId]`).
  return { groups, assignments, order: {} };
}

/** The frame store's collapsedGroups in the official key format: a legacy `custom:<id>` reads as um(id). */
export function officialCollapsedGroups(preferences) {
  const keys = record(preferences) ? stringArray(preferences.collapsedGroups) : [];
  return [...new Set(keys.filter(Boolean).map((key) => key.startsWith(LEGACY_CUSTOM_FOLD_PREFIX)
    ? customGroupKey(key.slice(LEGACY_CUSTOM_FOLD_PREFIX.length)) : key))];
}

/** shared-22 Qb(account) over the host's legacy store: the input Bp seeds the sections with. */
export function legacySectionPrefs(config) {
  const preferences = preferencesOf(config);
  const folded = officialCollapsedGroups(preferences);
  const order = Array.isArray(config?.projectOrder) ? config.projectOrder : [];
  return {
    // jc(`code-sessions-sort-ascending.<account>`, false) === true
    ascending: preferences.ascending === true,
    // jc(`code-sessions-show-empty-projects.<account>`, false) === true
    emptyGroups: preferences.showEmptyGroups === true,
    // !expandedIds.includes(<routines>): the host has no Routines section to have opened, so it stays folded (lp).
    routinesCollapsed: true,
    sessionsCollapsed: SESSIONS_FOLD_KEYS.some((key) => folded.includes(key)),
    pinnedCollapsed: folded.includes("pinned"),
    isManualCollapsed: (id) => folded.includes(customGroupKey(id)),
    // jc(`code-projects-order.<account>`, []) filtered to Zb keys, `.slice(5)`
    manualOrder: order.filter((key) => typeof key === "string" && key.startsWith(LEGACY_CUSTOM_ORDER_PREFIX)).map((key) => key.slice(5)),
  };
}

/** Em's codeGroupBy: the stored legacy groupBy, or undefined (unset, or a value the host never offered). */
export function legacyCodeGroupBy(config) {
  const value = preferencesOf(config).groupBy;
  return LEGACY_GROUP_BYS.includes(value) ? value : undefined;
}

// The stored record as the persist merge reads it (shared-52 Cp → Sp): no record when config.sidebarSections does not
// normalize, so a damaged value is migrated again from the legacy fields (which are never removed).
function storedSections(config) {
  const sections = normalizeSections(config?.sidebarSections);
  return sections ? { sections, prefsSeeded: config.sidebarSectionsSeeded === true } : null;
}

// shared-52 Em's kp: the stored sections (or, with no record, the first migration that maps the legacy groupBy / sortBy
// into Sessions) reconciled with the custom groups.
function reconciledSections(config, stored, metadata) {
  return reconcileSections(stored?.sections, {
    groups: legacyCustomGroups(config, metadata ?? config?.sessionMetadata),
    codeGroupBy: legacyCodeGroupBy(config),
    codeSortBy: preferencesOf(config).sortBy,
  });
}

/**
 * The sections the sidebar shows, from config.json: shared-52 Em (kp over the stored sections and the custom groups;
 * the first migration maps the legacy groupBy / sortBy into Sessions) and, until seeded, shared-22 $b (Bp with Qb).
 * Before the sections layout seeds the record nothing is stored, so this is the official seeding run over the legacy
 * fields as they are now. Pure: config is not changed. `metadata` replaces config.sessionMetadata for the members (the
 * renderer's view of the sessions, Codex sections included).
 */
export function sidebarSectionsFor(config, { metadata } = {}) {
  const stored = storedSections(config);
  const sections = reconciledSections(config, stored, metadata);
  return stored?.prefsSeeded ? sections : seedLegacyMetadata(seedSectionPrefs(sections, legacySectionPrefs(config)), config);
}

/**
 * Host step after Bp (R3-sections, sidebar-sections-layout): the host's "Show › Metadata" (sidebarPreferences.showMetadata,
 * the Code list's only Metadata switch so far) becomes the Sessions section's show.metadata when the sections are
 * seeded, so the switch to the sections layout keeps what the user chose. 2.37337.1's Bp (shared-52 Th) seeded it the
 * same way (`show: {metadata: t.metadata, …}` on Sessions); 2.42304.0's Bp no longer does (its v2 records drop the v1
 * metadata), which here would silently turn the descriptions off for everyone who had them on.
 */
export function seedLegacyMetadata(sections, config) {
  return preferencesOf(config).showMetadata === true ? patchSectionView(sections, sessionsSectionId, { show: { metadata: true } }) : sections;
}

/** True once the sections layout has seeded config.sidebarSections (official prefsSeeded). */
export function sidebarSectionsSeeded(config) {
  return storedSections(config)?.prefsSeeded === true;
}

/**
 * Keeps config.sidebarSections in step with the groups; true when config changed.
 * - Default (main.cjs at startup and after every sidebar-state operation): an existing record is reconciled (kp) with
 *   the groups and members, its seeded flag left as it is; with no record nothing is written (the sections stay derived
 *   from the legacy fields until the switch, see the top of this file).
 * - `seed: true` (shared-22 $b / ex(), the switch to the sections layout): the sections as sidebarSectionsFor derives
 *   them now (Bp over the legacy preferences of this moment, when not seeded yet) are stored, seeded.
 */
export function syncSidebarSections(config, { seed = false } = {}) {
  if (seed) {
    const next = sidebarSectionsFor(config);
    if (config.sidebarSectionsSeeded === true && canonical(config.sidebarSections) === canonical(next)) return false;
    config.sidebarSections = clone(next);
    config.sidebarSectionsSeeded = true;
    return true;
  }
  const stored = storedSections(config);
  // A record the sections layout seeded but that no longer normalizes (the persist merge's Cp → Sp null) is migrated
  // and seeded again at once, as onIdentityResolve does with the layout on; before the switch there is nothing to keep.
  if (!stored) return config.sidebarSectionsSeeded === true ? syncSidebarSections(config, { seed: true }) : false;
  const next = reconciledSections(config, stored);
  if (canonical(config.sidebarSections) === canonical(next)) return false;
  config.sidebarSections = clone(next);
  return true;
}

// A section operation of the sections layout: the record is seeded here at the latest (the sections passed in were
// derived by sidebarSectionsFor, so an unseeded store takes the legacy preferences of this moment), then every write is
// normalized (Sp) and reconciled with the groups again before it is stored.
function writeSections(config, sections) {
  config.sidebarSections = clone(normalizeSections(sections) ?? []);
  config.sidebarSectionsSeeded = true;
  syncSidebarSections(config);
}

const VIEW_FLAGS = Object.freeze(["ascending", "collapsed", "shown"]);
const SHOW_FLAGS = Object.freeze(["metadata", "emptyGroups"]);
/** A setSectionView patch from the renderer (eO / tO): only the official view fields, with official values; else null.
 * groupBy null clears it (eO Reset: `{groupBy: null, sortBy: "recency", ascending: false}`). */
export function sectionViewPatch(view) {
  if (!record(view)) return null;
  const patch = {};
  for (const [key, value] of Object.entries(view)) {
    if (value === undefined) continue;
    if (key === "groupBy") { if (value !== null && !isSectionGroupBy(value)) return null; }
    else if (key === "sortBy") { if (!isSectionSortBy(value)) return null; }
    else if (key === "show") {
      if (!record(value) || Object.entries(value).some(([flag, on]) => !SHOW_FLAGS.includes(flag) || (on !== undefined && typeof on !== "boolean"))) return null;
      patch.show = Object.fromEntries(Object.entries(value).filter(([, on]) => on !== undefined));
      continue;
    } else if (!VIEW_FLAGS.includes(key) || typeof value !== "boolean") return null;
    patch[key] = value;
  }
  return Object.keys(patch).length ? patch : null;
}

/** The sidebar-state operations this module answers. */
export const SIDEBAR_SECTION_OPERATIONS = Object.freeze(["create-group", "rename-group", "delete-group", "section-move", "section-view", "section-assign", "sections-seed"]);
// `cg-${crypto.randomUUID()}` (shared-52 addCustomGroup).
const PROPOSED_GROUP_ID = /^cg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const groupList = (config) => Array.isArray(config.customGroups) ? config.customGroups : (config.customGroups = []);
const metadataOf = (config) => record(config.sessionMetadata) ? config.sessionMetadata : (config.sessionMetadata = {});
const groupName = (name) => {
  if (typeof name !== "string" || !name.trim()) throw new Error("Enter a group name.");
  return name.trim();
};
function sectionNamed(config, id) {
  const section = typeof id === "string" ? sidebarSectionsFor(config).find((entry) => entry.id === id) : undefined;
  if (!section) throw new Error("Unknown section.");
  return section;
}

/**
 * main.cjs sidebar-state for the group and section operations; false for any other operation (main.cjs answers it).
 * deps.knownSessionIds(): Set of thread ids (active and archived); deps.mirror(task): main.cjs mirrorSections;
 * deps.codexSections: codex-sections.cjs; deps.randomUUID(); deps.getConfig(): the config a mirror task reads when it
 * runs (main.cjs may have replaced the object by then). The Codex mirror runs for the groups and their members only,
 * exactly as before; the sections' order and view stay local.
 */
export function applySidebarSectionOperation(config, p, { knownSessionIds, mirror, codexSections, randomUUID = () => globalThis.crypto.randomUUID(), getConfig = () => config }) {
  switch (p?.operation) {
    case "create-group": {
      const name = groupName(p.name);
      const known = knownSessionIds();
      const assign = [...new Set([p.sessionId, ...(Array.isArray(p.sessionIds) ? p.sessionIds : [])])].filter((sessionId) => typeof sessionId === "string" && known.has(sessionId));
      // p.sections: the sidebar renders the sections layout (D10). There a create is shared-52 addSection →
      // addCustomGroup: a same-named group is reused and expanded (`_m(t(), n)` … `expandGroup(um(r.id))`).
      const sectionsLayout = p.sections === true;
      const existing = sectionsLayout
        ? findCustomGroupByName({ activeGroupScope: SIDEBAR_SECTIONS_SCOPE, customGroupsByScope: { [SIDEBAR_SECTIONS_SCOPE]: legacyCustomGroups(config) } }, name)
        : undefined;
      // addCustomGroup `cg-${crypto.randomUUID()}`. The sections layout runs the original store action in the renderer
      // first (its group id is what groupsKeptWhileEmpty keeps showing while the new section is empty) and proposes that
      // id; it is taken when it has the official shape and no group has it yet.
      const proposed = sectionsLayout && typeof p.id === "string" && PROPOSED_GROUP_ID.test(p.id) && !groupList(config).some((group) => group?.id === p.id) ? p.id : null;
      const id = existing?.id ?? proposed ?? `cg-${randomUUID()}`;
      if (!existing) groupList(config).push({ id, name });
      const metadata = metadataOf(config);
      for (const sessionId of assign) metadata[sessionId] = { ...metadata[sessionId], customGroupId: id };
      if (existing) {
        // expandGroup(um(id)): the fold key leaves collapsedGroups (legacy and official form) and the section opens.
        const preferences = preferencesOf(config);
        if (Array.isArray(preferences.collapsedGroups)) {
          const keys = new Set([customGroupKey(id), LEGACY_CUSTOM_FOLD_PREFIX + id]);
          config.sidebarPreferences = { ...preferences, collapsedGroups: preferences.collapsedGroups.filter((key) => !keys.has(key)) };
        }
        writeSections(config, patchSectionView(sidebarSectionsFor(config), id, { collapsed: false }));
      } else if (sectionsLayout || sidebarSectionsSeeded(config)) {
        // kp files the new group's section before Sessions; then `km(…, (e) => Rp(e, i.id))`.
        syncSidebarSections(config);
        writeSections(config, inheritSessionsView(sidebarSectionsFor(config), id));
      }
      // From the classic list before the sections layout has seeded the record, the group is a legacy group like the
      // others: nothing is stored, and at the switch kp gives it the default view (cp) and Bp its fold and position.
      // The classic list (until the sections layout renders) shows custom groups under groupBy "custom" only.
      if (!sectionsLayout) config.sidebarPreferences = { ...config.sidebarPreferences, groupBy: "custom" };
      mirror(async (owner) => { for (const sessionId of assign) await codexSections.placeSession(owner, getConfig(), sessionId); if (!assign.length) await codexSections.groupSection(owner, getConfig(), id); });
      return true;
    }
    case "rename-group": {
      // renameCustomGroup; kp renames the section with it.
      const name = groupName(p.name);
      config.customGroups = groupList(config).map((group) => group.id === p.id ? { ...group, name } : group);
      mirror((owner) => codexSections.renameGroup(owner, getConfig(), p.id));
      break;
    }
    case "delete-group": {
      // deleteCustomGroup: the group, its assignments, its order key and fold key go; kp drops its section.
      const sectionId = groupList(config).find((group) => group.id === p.id)?.codexSectionId;
      mirror((owner) => codexSections.deleteGroupSection(owner, sectionId));
      config.customGroups = groupList(config).filter((group) => group.id !== p.id);
      for (const meta of Object.values(metadataOf(config))) if (record(meta) && meta.customGroupId === p.id) meta.customGroupId = null;
      if (Array.isArray(config.projectOrder)) config.projectOrder = config.projectOrder.filter(key => key !== "ccg::" + p.id);
      // shared-52 deleteCustomGroup `collapsedGroups.filter((e) => e !== um(t))`, and the host's legacy `custom:<id>`.
      if (Array.isArray(config.sidebarPreferences?.collapsedGroups)) {
        const keys = new Set([customGroupKey(p.id), LEGACY_CUSTOM_FOLD_PREFIX + p.id]);
        config.sidebarPreferences = { ...config.sidebarPreferences, collapsedGroups: config.sidebarPreferences.collapsedGroups.filter((key) => !keys.has(key)) };
      }
      break;
    }
    case "sections-seed": {
      // shared-22 ex() / onIdentityResolve $b: the sections layout seeds the record from the legacy preferences of this
      // moment (once: a seeded record is only kept in step with the groups).
      syncSidebarSections(config, { seed: true });
      return true;
    }
    case "section-move": {
      // moveSection → zp: Sessions stays last; the position is clamped to length - 2.
      sectionNamed(config, p.id);
      if (typeof p.index !== "number" || !Number.isFinite(p.index)) throw new Error("Invalid section position.");
      writeSections(config, moveSection(sidebarSectionsFor(config), p.id, p.index));
      return true;
    }
    case "section-view": {
      // setSectionView → Lp (an alpha / non-alpha sort switch resets ascending).
      sectionNamed(config, p.id);
      const view = sectionViewPatch(p.view);
      if (!view) throw new Error("Invalid section view.");
      writeSections(config, setSectionView(sidebarSectionsFor(config), p.id, view));
      return true;
    }
    case "section-assign": {
      // assignToSection(keys, id | null): only a manual section takes sessions; null files them back into Sessions.
      const known = knownSessionIds();
      const keys = Array.isArray(p.keys) && p.keys.length <= 1000 ? p.keys : null;
      const ids = keys?.map((key) => typeof key === "string" && key.startsWith(codeKeyPrefix) ? key.slice(codeKeyPrefix.length) : null);
      if (!ids || !ids.length || ids.some((id) => !id || !known.has(id))) throw new Error("Unknown session.");
      if (p.sectionId !== null && sectionNamed(config, p.sectionId).kind !== "manual") throw new Error("Sessions can only be filed under a section.");
      const metadata = metadataOf(config);
      for (const id of new Set(ids)) metadata[id] = { ...metadata[id], customGroupId: p.sectionId };
      mirror(async (owner) => { for (const id of new Set(ids)) await codexSections.placeSession(owner, getConfig(), id); });
      break;
    }
    default: return false;
  }
  syncSidebarSections(config);
  return true;
}

// The renderer's section actions, named after the official store actions they stand in for (shared-52 G), as the
// sidebar-state request main.cjs answers above.
const SECTION_ACTIONS = Object.freeze({
  add: ({ name, sessionIds, id }) => ({ operation: "create-group", name, sections: true, ...(Array.isArray(sessionIds) ? { sessionIds } : {}), ...(typeof id === "string" ? { id } : {}) }),
  rename: ({ id, name }) => ({ operation: "rename-group", id, name }),
  delete: ({ id }) => ({ operation: "delete-group", id }),
  move: ({ id, index }) => ({ operation: "section-move", id, index }),
  view: ({ id, view }) => ({ operation: "section-view", id, view }),
  assign: ({ keys, sectionId }) => ({ operation: "section-assign", keys, sectionId: sectionId ?? null }),
  // shared-22 ex(): for the sections layout to send when it first renders.
  seed: () => ({ operation: "sections-seed" }),
});
/** addSection / renameSection / deleteSection / moveSection / setSectionView / assignToSection / ex → a sidebar-state request. */
export function sidebarSectionRequest(action, payload = {}) {
  if (!Object.hasOwn(SECTION_ACTIONS, action)) throw new Error("Unsupported sidebar operation.");
  return SECTION_ACTIONS[action](record(payload) ? payload : {});
}

/**
 * The frame store slice the original sections code reads (shared-52 G, scope "local"), from a sidebar-state snapshot:
 * customGroupsByScope / codeSidebarByScope / collapsedGroups. `metadata`: the renderer's session metadata (with Codex
 * sections, src/sidebar-model.js withCoreSections) for the members; the snapshot's own when omitted.
 */
export function sidebarSectionsStoreSlice(snapshot = {}, { metadata } = {}) {
  const config = {
    customGroups: snapshot.customGroups, sessionMetadata: snapshot.sessionMetadata, sidebarPreferences: snapshot.sidebarPreferences,
    projectOrder: snapshot.projectOrder, sidebarSections: snapshot.sidebarSections,
    sidebarSectionsSeeded: Array.isArray(snapshot.sidebarSections),
  };
  const groups = legacyCustomGroups(config, metadata ?? config.sessionMetadata);
  return {
    activeGroupScope: SIDEBAR_SECTIONS_SCOPE,
    customGroupsByScope: { [SIDEBAR_SECTIONS_SCOPE]: groups },
    codeSidebarByScope: { [SIDEBAR_SECTIONS_SCOPE]: { sections: sidebarSectionsFor(config, { metadata }), prefsSeeded: true } },
    collapsedGroups: officialCollapsedGroups(config.sidebarPreferences),
  };
}
