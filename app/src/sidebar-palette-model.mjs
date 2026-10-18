// Command palette model (pure): the ⌘K / ⇧⌘K overlay the sidebar Search button opens, after 2.2553.1
// c2771e1f6-v15xXKAc.js vm (CommandPaletteBody) inside shared-22 XP. Modes are its entrypoints: "default"
// (Quick actions + Recents; typing adds the 'New session “…”' send row), "search" (sessions and projects with
// the Pu type tabs and the date filter) and "actions" (Tab: Settings → / Customize → rows and app commands).
import { folderName, sessionArchived, sessionName, sessionUpdatedAt } from "./sidebar-model.js";
import { t } from "../electron/i18n/index.mjs";
import { shortcutLabels } from "./shortcut-model.mjs";
import { hideAllNestedSessionsCopy, showAllNestedSessionsCopy, nestedSessionsSearchHints } from "./generated/code-current/nested-session-palette-copy.mjs";

export const PALETTE_MODES = Object.freeze(["default", "search", "actions"]);
// wu: type options (the code list's Sessions and Projects; this app has no searchable chats, tasks or
// artifacts) and the active-date options.
export const PALETTE_TYPES = Object.freeze([["session", "Sessions"], ["project", "Projects"]]);
export const PALETTE_DATES = Object.freeze([["today", "Today"], ["week", "Past week"], ["month", "Past month"]]);
export const EMPTY_PALETTE_FILTERS = Object.freeze({ type: null, date: null });
// Recents in the default view (Cd keeps a handful of rows under the Quick actions group).
export const PALETTE_RECENTS = 8;
const DAY = 24 * 60 * 60 * 1000;

export function paletteMode(value) {
  return value === "search" || value === "actions" ? value : "default";
}

/** vm Bn/En: the input's placeholder and accessible name for a mode (code list: k true). */
export function palettePlaceholder(mode) {
  if (mode === "search") return t("Search sessions and projects");
  if (mode === "actions") return t("Search actions");
  return t("Search or start a session");
}

/** Xu: the relative time a result row shows (null past a year). */
export function paletteRelativeTime(ms, now = Date.now()) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = (now - ms) / 60000, start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (minutes < 5) return t("Just now");
  if (minutes < 60) return t("Past hour");
  if (ms >= start.getTime()) return t("Today");
  if (ms >= start.getTime() - DAY) return t("Yesterday");
  const days = (now - ms) / DAY;
  if (days < 7) return t("Past week");
  if (days < 30) return t("Past month");
  if (days < 365) return t("Past year");
  return null;
}

/** The active filter (today / past week / past month) as a lower time bound. */
export function paletteDateFloor(date, now = Date.now()) {
  if (date === "today") { const start = new Date(now); start.setHours(0, 0, 0, 0); return start.getTime(); }
  if (date === "week") return now - 7 * DAY;
  if (date === "month") return now - 30 * DAY;
  return null;
}

export function hasPaletteFilters(filters = EMPTY_PALETTE_FILTERS) {
  return filters.type !== null || filters.date !== null;
}

/** Ranges of `query` (case-insensitive, every occurrence) inside `text`, for the bold match highlight (ra). */
export function matchRanges(text, query) {
  const needle = String(query || "").trim().toLowerCase(), hay = String(text || "").toLowerCase();
  if (!needle) return [];
  const ranges = [];
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) ranges.push([at, at + needle.length]);
  return ranges;
}

const matches = (text, query) => String(text || "").toLowerCase().includes(query);

/**
 * Session results: newest first; a title match or a core's full-text match (contentMatches, a Set of ids).
 * The default view leaves archived sessions out; search lists them with the Archived badge (sd).
 */
export function paletteSessions({ sessions = [], query = "", contentMatches = null, filters = EMPTY_PALETTE_FILTERS, includeArchived = false, now = Date.now(), limit = Infinity } = {}) {
  const needle = query.trim().toLowerCase(), floor = paletteDateFloor(filters.date, now);
  return sessions
    .filter((session) => includeArchived || !sessionArchived(session))
    .filter((session) => !needle || matches(sessionName(session), needle) || contentMatches?.has?.(session.id))
    .filter((session) => floor === null || sessionUpdatedAt(session) >= floor)
    .sort((a, b) => sessionUpdatedAt(b) - sessionUpdatedAt(a))
    .slice(0, limit);
}

/** Project results: the folders the sidebar knows, by name or path, with their latest activity. */
export function paletteProjects({ folders = [], sessions = [], query = "", filters = EMPTY_PALETTE_FILTERS, now = Date.now() } = {}) {
  const needle = query.trim().toLowerCase(), floor = paletteDateFloor(filters.date, now), latest = new Map();
  for (const session of sessions) if (session.cwd) latest.set(session.cwd, Math.max(latest.get(session.cwd) || 0, sessionUpdatedAt(session)));
  return [...new Set(folders.filter((cwd) => typeof cwd === "string" && cwd))]
    .filter((cwd) => !needle || matches(folderName(cwd), needle) || matches(cwd, needle))
    .filter((cwd) => floor === null || (latest.get(cwd) || 0) >= floor)
    .map((cwd) => ({ cwd, name: folderName(cwd), updatedAt: latest.get(cwd) || 0 }))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

// c2771e1f6 :9634-10079 'Settings → {section}' / 'Customize → {section}' rows for the local Settings sections
// (source-settings.jsx tabs: General first, This computer › System; B23 shared-19 ZC; the Advanced group last,
// settings-advanced-model.mjs).
export const PALETTE_SETTINGS_SECTIONS = Object.freeze([
  ["preferences", "General", "Settings"], ["usage", "Usage", "UsageGaugeMiddle"], ["theme", "Theme", "Palette"], ["code", "Code", "Code"],
  ["instructions", "Instructions", "BookText"], ["commands", "Commands", "SlashShortcutCommand"],
  ["models", "Models", "Lightning"], ["general", "System", "Computer"], ["developer", "Developer", "Wrench"], ["cores", "Cores", "Box"],
  ["advanced", "Core options", "Wrench"], ["harness", "Harness", "CommandLine"], ["customize-hooks", "Hooks", "CommandLine"], ["profiles", "Profiles", "Tool"],
]);
// The Settings nav's own copy for a page name ('System' is the page there, not the theme choice: settings-model
// settingsHeading's 'settings heading: …' entries).
const settingsSectionLabel = (label) => { const key = `settings heading: ${label}`, shown = t(key); return shown === key ? t(label) : shown; };
export const PALETTE_CUSTOMIZE_SECTIONS = Object.freeze([
  ["customize-skills", "Skills", "Scroll"], ["customize-connectors", "Connectors", "Connectors"], ["customize-plugins", "Plugins", "Plugin"],
]);

// gn's jump_to_* palette commands (focus-region-model.mjs JUMP_COMMANDS; shared-1-BPVqFfwb.js :10700-10760 aj/oj/cj/
// fj/pj/mj descriptions).
const JUMP_LABELS = {
  jump_to_navigation: () => t("Jump to navigation"),
  jump_to_main_content: () => t("Jump to main content"),
  jump_to_input: () => t("Jump to input"),
  jump_to_preview: () => t("Jump to preview"),
  jump_to_terminal: () => t("Jump to terminal"),
  jump_to_pane: () => t("Jump to pane"),
};

// 2.31226 shared-1 _R (:14360-15260): the command registry's groups, in the order Actions mode lists them
// (c2771e1f6 :3557-3566 'other', Navigation, Chat, create, Project, Task, Session, Settings, General).
export const PALETTE_ACTION_GROUPS = Object.freeze([
  ["other", null], ["navigation", "Navigation"], ["chat", "Chat"], ["session", "Session"], ["settings", "Settings"], ["general", "General"],
]);
const capsOf = (spec) => spec ? shortcutLabels(spec, true).join("") : undefined;

/** cf74bc599 wO prUrl (q(): the bound PR, else the repo's lookup) for a session row: its core's PR link, else the
 * git band's branch PR (git-rail-model.mjs branchPullRequest); only https links open. */
export function sessionPullRequestUrl(session, branchPr = null) {
  const https = (value) => typeof value === "string" && /^https:\/\//i.test(value);
  return [session?.prInfo?.url, session?.prLink, session?.codeDesktop?.pr?.url, branchPr?.url].find(https) ?? null;
}

/** cfb613cf0 t (cf74bc599 wO l = wd(title)): the open session's palette rows name it — 'Archive “{name}”' and so on,
 * the title cut to 39 characters and an ellipsis past 40; an untitled session keeps the registry descriptions. */
export function sessionCommandLabels(title) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed) return {};
  const chars = [...trimmed], name = chars.length > 40 ? `${chars.slice(0, 39).join("")}\u2026` : trimmed;
  return {
    archive: t("Archive “{name}”", { name }), delete: t("Delete “{name}”", { name }), unarchive: t("Unarchive “{name}”", { name }),
    rename: t("Rename “{name}”", { name }), pin: t("Pin “{name}”", { name }), unpin: t("Unpin “{name}”", { name }),
    fork: t("Fork “{name}”", { name }),
  };
}

/**
 * Action rows ({id, label, icon, group, hints, shortcut?, run}) from what the host can do, in shared-1 _R order.
 * - new session, the sidebar sections, the sidebar toggle and Settings (local rows), the Settings / Customize
 *   sections (c2771e1f6 :9634-10079) and the page-area jumps (`jumps`: the JUMP_COMMANDS whose regions have a stop
 *   now, `onJump(regions)` lands there — gn's f(): unavailable ones are disabled, so they are not listed);
 * - `session`: the open session's commands (cf74bc599 wO :15226-15409 B(id, G && … ? fn : undefined)): archive,
 *   delete, unarchive, rename, pin / unpin, fork and New session with current settings, each only when it applies
 *   ({ title, archived, pinned, unarchiving, canArchive, canDelete, canFork, canRename, onAction(command) }; a titled
 *   session names itself in the labels, sessionCommandLabels);
 * - `panes`: c11959232 Ud (:2340-2390) toggle_terminal_pane / toggle_diff_pane / toggle_preview_pane /
 *   toggle_files_pane / toggle_side_chat ({enabled, shown} each, 'Show …' / 'Hide …') and close_side_pane;
 * - `prompts`: cf74bc599 :3600-3626 jump_prev_prompt / jump_next_prompt (left out while there are none);
 * - onShortcuts (shortcuts_modal) and onFileUpload (file_upload), shared-21 wj :5641-5643;
 * - `nested`: the Code list's hide_all_nested_sessions / show_all_nested_sessions (R3-sections step 3, WI-5; 2.42304.0
 *   moved them out of the Group and sort menu): shared-20 _S registers each only while it applies ({anyShown, anyHidden,
 *   onHideAll, onShowAll}, src/sidebar-filter-current-model.mjs sidebarNestedCommands); the copy is shared-1 IM / LM /
 *   RM (generated nested-session-palette-copy.mjs), the icons the registry's DL / OL (Collapse / Expand), group session,
 *   between fork_code_session and new_code_session_from_current as the shared-1 registry orders them.
 * hiddenFromCommandPalette commands (search_palette, settings, btw_side_chat, toggle_read_code_session,
 * open_code_session_pr, archive_code_session_chord …) are left out; copy_code_session_link needs a claude.ai URL.
 */
export function paletteActions({ onNew, setSection, onToggleSidebar, onOpenSettings, jumps = [], onJump,
  session = null, panes = null, onTogglePane, onClosePane, prompts = null, onShortcuts, onFileUpload, nested = null } = {}) {
  const rows = [];
  const push = (row) => rows.push({ hints: [], ...row });
  if (onNew) push({ id: "new-session", group: "navigation", label: t("New session"), icon: "Add", shortcut: "⌘N", run: onNew });
  if (setSection) {
    push({ id: "artifacts", group: "navigation", label: t("Artifacts"), icon: "Artifacts", run: () => setSection("artifacts") });
    push({ id: "routines", group: "navigation", label: t("Routines"), icon: "Clock", run: () => setSection("routines") });
  }
  // file_upload (group chat, icon hR Attachment, searchHints upload).
  if (onFileUpload) push({ id: "file_upload", group: "chat", label: t("Add files or photos"), icon: "Attachment", shortcut: capsOf("cmd+u"), hints: [t("upload")], run: onFileUpload });
  if (session?.onAction) {
    const act = (command) => () => session.onAction(command);
    const hide = t("hide"), remove = t("remove"), trash = t("trash"), named = sessionCommandLabels(session.title);
    if (session.canArchive && !session.archived) push({ id: "archive_code_session", group: "session", label: named.archive ?? t("Archive session"), icon: "Archive", hints: [hide], run: act("archive") });
    if (session.canDelete) push({ id: "delete_code_session", group: "session", label: named.delete ?? t("Delete session"), icon: "Trash", hints: [remove, trash], run: act("delete") });
    if (session.canArchive && session.archived && !session.unarchiving) push({ id: "unarchive_code_session", group: "session", label: named.unarchive ?? t("Unarchive session"), icon: "Archive", hints: [t("restore")], run: act("unarchive") });
    if (session.canRename !== false) push({ id: "rename_code_session", group: "session", label: named.rename ?? t("Rename session"), icon: "Edit", shortcut: capsOf("cmd+alt+r"), run: act("rename") });
    push(session.pinned
      ? { id: "unpin_code_session", group: "session", label: named.unpin ?? t("Unpin session"), icon: "PinSlash", shortcut: capsOf("cmd+alt+p"), hints: [t("star"), t("favorite")], run: act("pin") }
      : { id: "pin_code_session", group: "session", label: named.pin ?? t("Pin session"), icon: "Pin", shortcut: capsOf("cmd+alt+p"), hints: [t("star"), t("favorite")], run: act("pin") });
    if (session.canFork) push({ id: "fork_code_session", group: "session", label: named.fork ?? t("Fork session"), icon: "ArrowSplitRight", shortcut: capsOf("cmd+alt+o"), hints: [t("duplicate"), t("clone")], run: act("fork") });
  }
  if (nested?.anyShown && nested.onHideAll) push({ id: "hide_all_nested_sessions", group: "session", label: t(hideAllNestedSessionsCopy.description.defaultMessage),
    icon: "Collapse", hints: [t(nestedSessionsSearchHints.collapse.defaultMessage), t(nestedSessionsSearchHints.fold.defaultMessage)], run: nested.onHideAll });
  if (nested?.anyHidden && nested.onShowAll) push({ id: "show_all_nested_sessions", group: "session", label: t(showAllNestedSessionsCopy.description.defaultMessage),
    icon: "Expand", hints: [t(nestedSessionsSearchHints.expand.defaultMessage), t(nestedSessionsSearchHints.unfold.defaultMessage)], run: nested.onShowAll });
  if (session?.onAction) {
    push({ id: "new_code_session_from_current", group: "session", label: t("New session with current settings"), icon: "ChatAdd", shortcut: capsOf("cmd+shift+n"),
      hints: [t("same settings"), t("carry over"), t("duplicate")], run: () => session.onAction("new-from-current") });
  }
  if (panes && onTogglePane) {
    const pane = (kind, id, show, hideLabel, icon, spec, hints) => {
      const entry = panes[kind];
      if (entry?.enabled) push({ id, group: "session", label: entry.shown ? hideLabel : show, icon, shortcut: capsOf(spec), hints, run: () => onTogglePane(kind) });
    };
    pane("terminal", "toggle_terminal_pane", t("Show terminal"), t("Hide terminal"), "CommandLinePrompt", "cmd+j", [t("shell"), t("console")]);
    pane("changes", "toggle_diff_pane", t("Show changes"), t("Hide changes"), "ChangesPlusMinus", "cmd+shift+d", [t("diff")]);
    pane("preview", "toggle_preview_pane", t("Show preview"), t("Hide preview"), "Play", "cmd+shift+p", [t("preview"), t("web")]);
    pane("files", "toggle_files_pane", t("Show files"), t("Hide files"), "Folder", "cmd+shift+f", [t("tree"), t("explorer")]);
    pane("sideChat", "toggle_side_chat", t("Show side chat"), t("Hide side chat"), "Chats", "cmd+;", [t("btw"), t("question")]);
  }
  if (onClosePane) push({ id: "close_side_pane", group: "session", label: t("Close pane"), icon: "X", shortcut: capsOf("cmd+\\"), hints: [t("panel")], run: onClosePane });
  if (prompts?.onJump && prompts.available) {
    const scroll = [t("scroll back message history")];
    push({ id: "jump_prev_prompt", group: "session", label: t("Jump to previous prompt"), icon: "CaretUpDown", shortcut: capsOf("cmd+alt+up"), hints: scroll, run: () => prompts.onJump(-1) });
    push({ id: "jump_next_prompt", group: "session", label: t("Jump to next prompt"), icon: "CaretUpDown", shortcut: capsOf("cmd+alt+down"), hints: scroll, run: () => prompts.onJump(1) });
  }
  if (onToggleSidebar) push({ id: "toggle-sidebar", group: "general", label: t("Toggle sidebar"), icon: "Sidebar", shortcut: "⌘B", run: onToggleSidebar });
  if (onShortcuts) push({ id: "shortcuts_modal", group: "general", label: t("Keyboard shortcuts"), icon: "Keyboard", shortcut: capsOf("cmd+/"), run: onShortcuts });
  if (onOpenSettings) {
    push({ id: "settings", group: "settings", label: t("Settings"), icon: "Settings", shortcut: "⌘,", run: () => onOpenSettings(true) });
    for (const [id, label, icon] of PALETTE_SETTINGS_SECTIONS) push({ id: `settings:${id}`, group: "settings", label: t("Settings → {section}", { section: settingsSectionLabel(label) }), icon, run: () => onOpenSettings(id) });
    for (const [id, label, icon] of PALETTE_CUSTOMIZE_SECTIONS) push({ id: `settings:${id}`, group: "settings", label: t("Customize → {section}", { section: t(label) }), icon, run: () => onOpenSettings(id) });
  }
  if (onJump) for (const command of jumps) if (JUMP_LABELS[command.id])
    push({ id: command.id, group: "general", label: JUMP_LABELS[command.id](), icon: command.icon, run: () => onJump(command.regions) });
  return rows;
}

/** iu over the description and searchHints (lowercased substring, as `hs` indexes descriptionLower / hintsLower). */
export function filterPaletteActions(actions, query = "") {
  const needle = query.trim().toLowerCase();
  if (!needle) return actions;
  return actions.filter((action) => action.label.toLowerCase().includes(needle) || (action.hints ?? []).some((hint) => String(hint).toLowerCase().includes(needle)));
}

/** c2771e1f6 :3592-3598: Actions mode groups the rows by registry group, in PALETTE_ACTION_GROUPS order, titled. */
export function paletteActionGroups(actions) {
  const groups = [];
  for (const [group, title] of PALETTE_ACTION_GROUPS) {
    const items = actions.filter((action) => (action.group ?? "other") === group);
    if (items.length) groups.push({ id: `actions:${group}`, title: title ? t(title) : null, items });
  }
  return groups;
}

/** Selection movement over a flat list (wraps; -1 enters at the first or last row). */
export function movePaletteSelection(index, count, key) {
  if (count <= 0) return -1;
  if (key === "ArrowDown") return index < 0 ? 0 : (index + 1) % count;
  if (key === "ArrowUp") return index < 0 ? count - 1 : (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return index;
}

/** Pu ←/→: the next type tab (All, then each type), wrapping. */
export function stepPaletteType(type, direction) {
  const values = [null, ...PALETTE_TYPES.map(([value]) => value)];
  const at = Math.max(0, values.indexOf(type));
  return values[(at + direction + values.length) % values.length];
}
