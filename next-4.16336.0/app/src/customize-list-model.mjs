// Customize › Skills / Plugins "Your …" lists of 2.31226.0 (tabbed list): filter, sort, grouped sections and
// the row facts, over the local catalog rows (customize-model skillRows / pluginRows). Pure functions only.
//
// Reference (analysis/code-ui-sync-20261013/readable):
// - c5e558aae-KZUb_jQe :852 sr = "updated" (default sort), :1000-1105 Skills list (U = filtered rows, bt = grouped
//   by section, Nt sort options, At = sort held → flat list, zt reset filter and sort, Lt reset filter only),
//   :1406-1484 hr/Q/vr/yr/br/xr (created-by, section, sort keys and comparators), :957-1000 ot (plugin options)
//   and gt (filter normalised to the options that exist).
// - c3c3eda79-CaFBiSqB :178-189 J (created-by values), at (empty filter), Y (filter count), ot (filter match),
//   st (plugin Show values: all / enabled / disabled).
// - c6a2a31c4-yKXtfR2u :3888-3918 Nc / Pc (section order), Fc (group in that order), Ic (sections, or one flat
//   run while a sort is held); :2463-2503 ys (Remove marketplace? copy); :5904-5934 Qt (plugin sort options).
// - c27f32a39-sYqe7mzd :335-346 ze (New badge within 14 days of createdAt ?? updatedAt), :859-884 ot (section
//   titles); c08f249ae-5n4BCBfI :488-511 ee (a plugin's section).
// - c3bb81cd1-D_S-5LT_ :740-770 onRefreshSuccess (Already up to date / Marketplace updated).
//
// Local mapping (no cloud identity): a skill's scope is its only owner signal. user / repo → you (repo rows go
// under "In this project"), admin → your organization, system → the running core (credited by name, where the
// source says Anthropic), a plugin's skills follow the plugin. A skill the core failed to load (skills/list
// errors) is the "Needs attention" section.
import { getLocale, t, tn } from "../electron/i18n/index.mjs";
import { pluginDisplayNames } from "./customize-model.mjs";

export const LIST_SECTIONS = Object.freeze(["attention", "project", "createdByYou", "organization", "shared", "anthropic", "marketplaces"]);
export const DEFAULT_SORT = "updated";
export const DEFAULT_SKILL_FILTER = Object.freeze({ plugin: null, createdBy: null });
export const CREATED_BY = Object.freeze(["you", "org", "anthropic", "partners"]);
export const PLUGIN_SHOW = Object.freeze(["all", "enabled", "disabled"]);
/** c27f32a39 Re: 14 days. */
export const RECENT_MS = 12096e5;
export const RECENT_DAYS = 14;

const text = (value) => (typeof value === "string" ? value : "");

/** c27f32a39 ot: a section's title; the "anthropic" section names the running core (copy.name). */
export function sectionLabel(section, copy = {}) {
  switch (section) {
    case "attention": return t("Needs attention");
    case "project": return t("In this project");
    case "createdByYou": return t("Created by you");
    case "organization": return t("From your organization");
    case "shared": return t("Shared with you");
    case "anthropic": return copy.name ? t("From {name}", { name: copy.name }) : t("From Anthropic & Partners");
    case "marketplaces": return t("From marketplaces you added");
    default: return "";
  }
}

/** c3c3eda79 ct p: a created-by option's label. */
export function createdByLabel(value, copy = {}) {
  switch (value) {
    case "you": return t("You");
    case "org": return t("Your organization");
    case "anthropic": return copy.name || t("Anthropic");
    case "partners": return t("Partners");
    default: return "";
  }
}

// ------------------------------------------------------------------ owners and sections

/** Who made a plugin: one the core ships (Official / the profile's own layers), else a local folder of yours. */
export function pluginCreatedBy(plugin) {
  if (!plugin) return null;
  if (plugin.official || plugin.core) return "anthropic";
  return plugin.sourcePath ? "you" : null;
}

/** c08f249ae ee over the local rows: shipped with the core, a local folder, else a marketplace you added. */
export function pluginSection(plugin) {
  if (plugin?.official || plugin?.core) return "anthropic";
  return plugin?.sourcePath ? "createdByYou" : "marketplaces";
}

/** c5e558aae hr: {createdBy, pluginId} of a skill row. */
export function skillOwner(row, plugins = []) {
  if (row?.kind === "error") return { createdBy: null, pluginId: null };
  if (row?.pluginId) return { createdBy: pluginCreatedBy(plugins.find((plugin) => plugin.id === row.pluginId)), pluginId: row.pluginId };
  // An MCP prompt a bridge lists as a command: the connector you configured.
  if (row?.server) return { createdBy: "you", pluginId: null };
  switch (row?.scope) {
    case "user": case "repo": return { createdBy: "you", pluginId: null };
    case "admin": return { createdBy: "org", pluginId: null };
    case "system": return { createdBy: "anthropic", pluginId: null };
    default: return { createdBy: null, pluginId: null };
  }
}

/** c5e558aae Q: the section a skill row is listed under. */
export function skillSection(row, plugins = []) {
  if (row?.kind === "error") return "attention";
  if (row?.pluginId) {
    const plugin = plugins.find((entry) => entry.id === row.pluginId);
    return plugin ? pluginSection(plugin) : "marketplaces";
  }
  if (row?.server) return "createdByYou";
  switch (row?.scope) {
    case "repo": return "project";
    case "user": return "createdByYou";
    case "admin": return "organization";
    default: return "anthropic";
  }
}

// ------------------------------------------------------------------ filter

/** c3c3eda79 Y: how many filters are on. */
export const filterCount = (filter) => (filter?.plugin == null ? 0 : 1) + (filter?.createdBy == null ? 0 : 1);

/** c3c3eda79 ot. */
export const filterMatches = (filter, owner) => (filter?.plugin == null || owner.pluginId === filter.plugin)
  && (filter?.createdBy == null || owner.createdBy === filter.createdBy);

/** c5e558aae ot: the plugins whose skills are listed, by display name (with the collision suffix), sorted. */
export function skillPluginOptions(skills, plugins = []) {
  const ids = [...new Set(skills.filter((row) => row.pluginId).map((row) => row.pluginId))];
  const known = plugins.filter((plugin) => ids.includes(plugin.id));
  const names = pluginDisplayNames(known);
  return ids.map((id) => {
    const plugin = known.find((entry) => entry.id === id);
    const name = names.get(id);
    const label = (name?.suffix ? `${name.name} ${name.suffix}` : name?.name ?? plugin?.name ?? id).trim();
    return { id, label };
  }).filter((option) => option.label !== "").sort((a, b) => a.label.localeCompare(b.label));
}

/** c5e558aae gt: a filter value that no longer has rows falls back to "all". */
export function normalizeSkillFilter(filter, pluginOptions, showPartners = false) {
  const plugin = filter?.plugin != null && !pluginOptions.some((option) => option.id === filter.plugin) ? null : filter?.plugin ?? null;
  const createdBy = filter?.createdBy === "partners" && !showPartners ? null : filter?.createdBy ?? null;
  return plugin === (filter?.plugin ?? null) && createdBy === (filter?.createdBy ?? null) && filter ? filter : { plugin, createdBy };
}

/** c3c3eda79 ct g: the Created by options (Partners only when a row is a partner's). */
export const createdByOptions = (showPartners = false) => (showPartners ? CREATED_BY : CREATED_BY.filter((value) => value !== "partners"));

// ------------------------------------------------------------------ sort

/** c5e558aae Nt: Last edited and Name, Plugin name while plugin skills are listed. */
export function skillSortOptions({ plugin = false } = {}) {
  return [{ value: "updated", label: t("Last edited") }, { value: "name", label: t("Name") },
    ...(plugin ? [{ value: "plugin", label: t("Plugin name") }] : [])];
}
/** c6a2a31c4 Qt (no "Most used by me": the local cores keep no usage counts). */
export const pluginSortOptions = () => [{ value: "updated", label: t("Last edited") }, { value: "name", label: t("Name") }];

/** c5e558aae Dt: a sort whose rows are gone falls back to the default. */
export const effectiveSort = (sort, options) => (options.some((option) => option.value === sort) ? sort : DEFAULT_SORT);

const seconds = (value) => (Number.isFinite(value) ? value : null);

/** c5e558aae gr/_r/vr: a row's sort facts. updatedAt is seconds (SKILL.md mtime) or null. */
export function sortFacts(row, pluginName = null) {
  return { name: text(row?.name), updatedAt: seconds(row?.updatedAt), pluginName: row?.pluginId ? pluginName : null,
    pluginId: row?.pluginId ?? null, kindRank: row?.kind === "error" ? 3 : row?.pluginId ? 2 : 0 };
}

/** c5e558aae br: newest first, undated last, then kind and name. */
function byUpdated(a, b) {
  if (a.updatedAt === b.updatedAt) return a.kindRank - b.kindRank || a.name.localeCompare(b.name);
  if (a.updatedAt === null) return 1;
  if (b.updatedAt === null) return -1;
  return b.updatedAt - a.updatedAt;
}

/** c5e558aae yr. */
export function compareFacts(sort, a, b) {
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "plugin") {
    if (a.pluginId === b.pluginId) return a.name.localeCompare(b.name);
    if (a.pluginName === null || a.pluginId === null) return 1;
    if (b.pluginName === null || b.pluginId === null) return -1;
    return a.pluginName.localeCompare(b.pluginName) || a.pluginId.localeCompare(b.pluginId);
  }
  return byUpdated(a, b);
}

// ------------------------------------------------------------------ sections

/** c6a2a31c4 Fc: rows grouped by section, in the source's section order. */
export function groupBySection(rows, sectionOf) {
  const groups = new Map();
  for (const row of rows) {
    const section = sectionOf(row);
    const list = groups.get(section);
    if (list) list.push(row); else groups.set(section, [row]);
  }
  const ordered = new Map();
  for (const section of LIST_SECTIONS) if (groups.has(section)) ordered.set(section, groups.get(section));
  return ordered;
}

/** c6a2a31c4 Ic: one run per section, or a single untitled run while a sort is held. */
export function sectionRuns(groups, compare, { flat }) {
  if (flat) {
    const rows = [...groups.values()].flat().sort(compare);
    return rows.length > 0 ? [{ section: null, rows }] : [];
  }
  return [...groups].map(([section, rows]) => ({ section, rows: [...rows].sort(compare) }));
}

function matchesQuery(fields, query) {
  const term = text(query).trim().toLowerCase();
  return !term || fields.filter(Boolean).join(" ").toLowerCase().includes(term);
}

/**
 * Customize › Skills list: the skill and error rows that match the search and the filter, grouped and sorted.
 * `total` counts every row (0 → the page's empty state), `matched` the rows after search and filter.
 */
export function skillListView({ skills = [], errors = [], plugins = [], query = "", filter = DEFAULT_SKILL_FILTER, sort = DEFAULT_SORT } = {}) {
  const searched = [
    ...skills.filter((row) => matchesQuery([row.name, row.skillName, row.description], query)),
    ...errors.filter((row) => matchesQuery([row.name, row.path, row.message], query)),
  ];
  const pluginOptions = skillPluginOptions(skills, plugins);
  const showPartners = false;
  const current = normalizeSkillFilter(filter, pluginOptions, showPartners);
  const rows = searched.filter((row) => filterMatches(current, skillOwner(row, plugins)));
  const sortOptions = skillSortOptions({ plugin: rows.some((row) => row.pluginId) });
  const active = effectiveSort(sort, sortOptions);
  const held = active !== DEFAULT_SORT;
  const names = pluginDisplayNames(plugins);
  const facts = new Map(rows.map((row) => [row, sortFacts(row, names.get(row.pluginId)?.name ?? null)]));
  const sections = sectionRuns(groupBySection(rows, (row) => skillSection(row, plugins)), (a, b) => compareFacts(active, facts.get(a), facts.get(b)), { flat: held });
  const count = filterCount(current);
  return { total: skills.length + errors.length, searched: searched.length, matched: rows.length, pluginOptions, showPartners,
    filter: current, filterCount: count, sortOptions, sort: active, held, resettable: count > 0 || held, sections };
}

/** c3c3eda79 lt values over a plugin's on/off state. */
export const pluginShown = (row, show) => show === "enabled" ? !!row.enabled : show === "disabled" ? !row.enabled : true;

/** Customize › Plugins "Your plugins": the installed rows after the search and the Show filter, grouped and sorted. */
export function pluginListView({ rows = [], query = "", show = "all", sort = DEFAULT_SORT } = {}) {
  const names = pluginDisplayNames(rows);
  const searched = rows.filter((row) => matchesQuery([row.name, row.pluginName, row.description, names.get(row.id)?.suffix], query));
  const value = PLUGIN_SHOW.includes(show) ? show : "all";
  const shown = searched.filter((row) => pluginShown(row, value));
  const sortOptions = pluginSortOptions();
  const active = effectiveSort(sort, sortOptions);
  const held = active !== DEFAULT_SORT;
  const compare = (a, b) => compareFacts(active, sortFacts(a), sortFacts(b));
  const sections = sectionRuns(groupBySection(shown, pluginSection), compare, { flat: held });
  return { total: rows.length, searched: searched.length, matched: shown.length, show: value, sortOptions, sort: active, held,
    resettable: value !== "all" || held, sections, names };
}

// ------------------------------------------------------------------ row facts

/** c27f32a39 ze: "New" while the row was added or updated within the last 14 days (seconds, ms clock). */
export function recentReason(row, nowMs = Date.now()) {
  const created = seconds(row?.createdAt), updated = seconds(row?.updatedAt);
  const at = created ?? updated;
  if (at === null) return null;
  const age = nowMs - at * 1000;
  return age < 0 || age > RECENT_MS ? null : created !== null ? "added" : "updated";
}

/** c27f32a39 Be: the New badge's tooltip. */
export function recentTooltip(reason) {
  if (reason === "added") return tn(RECENT_DAYS, "Added in the last {days} day", "Added in the last {days} days", { days: RECENT_DAYS });
  if (reason === "updated") return tn(RECENT_DAYS, "Added or updated in the last {days} day", "Added or updated in the last {days} days", { days: RECENT_DAYS });
  return "";
}

/** ccea1f474 Ks / Gs: the skill row's credit ("by you", "by {owner}"); none for a row without a known owner. */
export function skillCredit(row, plugins = [], copy = {}) {
  if (row?.kind === "error") return null;
  if (row?.pluginId) {
    const author = text(plugins.find((plugin) => plugin.id === row.pluginId)?.author).trim();
    return author ? t("by {owner}", { owner: author }) : null;
  }
  if (row?.server) return t("by {owner}", { owner: row.server });
  switch (row?.scope) {
    case "user": case "repo": return t("by you");
    case "system": return copy.name ? t("by {owner}", { owner: copy.name }) : null;
    default: return null;
  }
}

/** ccea1f474 Ul credit + Gl: "by {author}", then the description or the skill count. */
export function pluginRowFacts(row) {
  const author = text(row?.author).trim();
  return { credit: author ? t("by {owner}", { owner: author }) : null,
    detail: text(row?.description).trim() || tn(row?.skillCount ?? 0, "{count} skill", "{count} skills", { count: row?.skillCount ?? 0 }) };
}

// ------------------------------------------------------------------ marketplaces

/** c6a2a31c4 As: the marketplace's display name (the one its installed plugins report), else its config name. */
export function marketplaceLabel(marketplace, plugins = []) {
  return text(plugins.find((plugin) => plugin.marketplaceId === marketplace?.name && plugin.marketplaceName)?.marketplaceName).trim() || text(marketplace?.name);
}

/** c6a2a31c4 Us: "Last updated: {when}" (formatDate medium / short) from the config's last_updated, else null. */
export function marketplaceLastUpdated(marketplace, locale = getLocale()) {
  const at = Date.parse(text(marketplace?.lastUpdated));
  if (!Number.isFinite(at)) return null;
  return t("Last updated: {when}", { when: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(at) });
}

/** c6a2a31c4 Ss: the installed plugins that come from this marketplace (removing it uninstalls them). */
export function marketplaceInstalledPlugins(plugins, name) {
  return plugins.filter((plugin) => plugin.marketplaceId === name).map((plugin) => ({ id: plugin.id, label: plugin.name }));
}

/** c6a2a31c4 ys: the Remove marketplace? description. */
export function marketplaceRemovalDescription(count) {
  return count > 0
    ? tn(count, "This will also uninstall {count} plugin from this marketplace:", "This will also uninstall {count} plugins from this marketplace:", { count })
    : t("This will remove the marketplace from your list.");
}

/** marketplace/upgrade {upgradedRoots, errors} as the c3bb81cd1 refresh toast. */
export function marketplaceUpgradeToast(outcome) {
  if (!outcome?.ok) return { variant: "danger", text: t("Couldn’t check for updates. Try again.") };
  const errors = Array.isArray(outcome.result?.errors) ? outcome.result.errors : [];
  if (errors.length) return { variant: "danger", text: t("Couldn’t check for updates. Try again.") };
  return { variant: "neutral", text: outcome.result?.upgradedRoots?.length ? t("Marketplace updated.") : t("Already up to date.") };
}
