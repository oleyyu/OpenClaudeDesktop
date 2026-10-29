// w13-coworkui-outputs: the data the 3.6556.2 Outputs / Working folder section (c21f11e6d xT, generated as
// CoworkOutputsSection in src/generated/cowork-progress) reads, derived from this host's Cowork session the way the
// official session activity panel AT derives it (readable c21f11e6d :11655-12292). Pure: plain node imports it.
//
// Official → host:
//   userSelectedFolders (oe)      the session's folder (cwd); Cowork sessions here have one, so the title is
//                                  "Working folder" (hasMultipleFolders false).
//   resourceActivity (W)          file events: a completed fileChange item's changes (add → create, update → edit;
//                                  delete removes the path) and the files a SendUserFile / present call delivered
//                                  (create), each { id, operation, timestamp, filePath, fileName, openWith: {via:"path"} }
//                                  (the shape KP gives detected files, :24262).
//   outputResourcesActivity (Jn)  the events dT keeps: inside a selected folder, or opened by uuid / url.
//   outputsByFolder (Xn)          Jn grouped under each selected folder (prefix match), the rest ungrouped.
//   downloadableOutputs (Yn)      only the outputs a files API uuid or a served url opens; local files have neither,
//                                  so it is empty and Download all (Lb, more than one) does not show.
//   outputsFolderPath (sa)        the folder of the first output (with a trailing slash), null without outputs.
//   fileExplorerAvailable (Wn)    GrowthBook claudeai_cowork_file_explorer_main (default off here, D29/D31) && a session
//                                  && local && FileSystem.listFilesInFolder.
//   enableAdditionalDirectoriesClaudeMd (X)  shared-18 Jp's dynamic config value: the host answer COWORK_CLAUDE_MD_CONFIG
//                                  (on), the same one Settings › Cowork reads; the CLAUDE.md row also needs _t?.writeLocalFile (E67: given).
//   isFolderExpanded / toggleFolder (En / Dn)  `state[folder] ?? index === 0`.
//   scratchpad / Office / working documents / non-file outputs: none here (cwui-17), so those subsections stay empty.
const LT_OPERATIONS = new Set(["mcp_tool", "cli_tool", "web_search", "web_fetch", "skill_invoked", "command_invoked", "memory"]);
const UT_OPERATIONS = new Set(["device_commit", "project_file"]);
const CHANGE_OPERATION = { add: "create", update: "edit" };
export const FILE_EXPLORER_GATE = "claudeai_cowork_file_explorer_main";
export const CLAUDE_MD_CONFIG_KEY = "enableAdditionalDirectoriesClaudeMd";
// w13-coworkui-settings: the host's one answer for yukon_silver_config.enableAdditionalDirectoriesClaudeMd (shared-18 Ov =
// Jp: `ov().enableAdditionalDirectoriesClaudeMd??!1`). Its built-in default is off; the served config turns it on for
// Cowork accounts, and this host shows Cowork the way such an account sees it (E67: on). Settings › Cowork (c71860c77 De
// `o = ne()`) and the Outputs CLAUDE.md row both read this constant; the row's `_t?.writeLocalFile` is the bridge's
// (source-cowork-progress-v3-adapters.jsx FileSystem → main "cowork-claude-md", electron/cowork-runtime/claude-md.mjs).
export const COWORK_CLAUDE_MD_CONFIG = true;
export const EMPTY_OUTPUT_GROUPS = Object.freeze({ groups: Object.freeze([]), ungrouped: Object.freeze([]) });

const slash = (value) => String(value).replace(/\\/g, "/");
const trimEnd = (value) => slash(value).replace(/\/+$/, "");
const baseName = (value) => trimEnd(value).split("/").pop() ?? "";
function absolute(filePath, cwd) {
  const value = slash(filePath).replace(/^\.\//, "");
  if (value.startsWith("/") || /^[a-zA-Z]:\//.test(value) || !cwd) return value;
  return `${trimEnd(cwd)}/${value}`;
}
const insideFolder = (filePath, folders) => folders.some((folder) => slash(filePath).startsWith(`${trimEnd(folder)}/`));
const timestampOf = (item) => {
  for (const key of ["completedAt", "updatedAt", "createdAt", "timestamp"]) {
    const value = item?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return Date.parse(value);
  }
  return undefined;
};

/** The session's selected folders: its cwd, when it has one. */
export function coworkSelectedFolders(cwd) {
  return typeof cwd === "string" && cwd.trim() ? [cwd] : [];
}

/**
 * File events of a Cowork session's items, oldest first. `deliverables(item)` lists a SendUserFile / present call's
 * files (deliverable-records.mjs itemDeliverables); it is a parameter so this model stays free of tool-title imports.
 */
export function coworkOutputEvents(items = [], { cwd, deliverables } = {}) {
  const events = new Map();
  const put = (item, file, operation) => {
    const filePath = absolute(file, cwd);
    if (!filePath) return;
    events.delete(filePath);
    events.set(filePath, { id: `${item.id ?? "item"}:${filePath}`, operation, timestamp: timestampOf(item), filePath, fileName: baseName(filePath), openWith: { via: "path" } });
  };
  for (const item of items ?? []) {
    for (const file of (typeof deliverables === "function" ? deliverables(item) : null) ?? []) if (file?.path) put(item, file.path, "create");
    if (item?.type !== "fileChange" || item.status !== "completed") continue;
    for (const change of item.changes ?? []) {
      if (!change?.path) continue;
      const kind = change.kind?.type;
      if (kind === "delete") events.delete(absolute(change.path, cwd));
      else put(item, change.path, CHANGE_OPERATION[kind] ?? "edit");
    }
  }
  return [...events.values()];
}

/** dT: an event the Outputs section lists. */
export function isOutputEvent(event, folders) {
  if (UT_OPERATIONS.has(event.operation) || LT_OPERATIONS.has(event.operation)) return false;
  return insideFolder(event.filePath, folders) || event.openWith?.via === "uuid" || event.openWith?.via === "url";
}

/** Xn: outputs grouped under each selected folder; outputs outside every folder are ungrouped. */
export function coworkOutputsByFolder(outputs, folders) {
  if (!folders?.length) return EMPTY_OUTPUT_GROUPS;
  const grouped = new Set();
  const groups = folders.map((folder) => ({
    folder,
    activities: outputs.filter((event) => {
      const inside = slash(event.filePath).startsWith(`${trimEnd(folder)}/`);
      if (inside) grouped.add(event);
      return inside;
    }),
  }));
  return { groups, ungrouped: outputs.filter((event) => !grouped.has(event)) };
}

/** Yn: the outputs a download can fetch (files API uuid or served url). */
export function coworkDownloadableOutputs(outputs) {
  const byPath = new Map();
  for (const { filePath, openWith } of outputs) {
    if (openWith?.via === "uuid") byPath.set(filePath, { filePath, fileUuid: openWith.uuid });
    else if (openWith?.via === "url") byPath.set(filePath, { filePath, servedUrl: openWith.url });
  }
  return [...byPath.values()];
}

/** sa: the folder of the first output, with its trailing slash; null without outputs or a folder. */
export function coworkOutputsFolderPath(outputs) {
  if (!outputs.length) return null;
  const path = slash(outputs[0].filePath);
  const at = path.lastIndexOf("/");
  return at === -1 ? null : path.slice(0, at + 1);
}

/** En: a folder group's expansion — the stored choice, else only the first group open. */
export function coworkFolderExpanded(state, folder, index) {
  return state?.[folder] ?? index === 0;
}
/** Dn: the next expansion state after toggling a folder group. */
export function toggleCoworkFolder(state, folder, index) {
  return { ...state, [folder]: !(state?.[folder] ?? index === 0) };
}

/**
 * The data props of CoworkOutputsSection for one session. `gates` answers GrowthBook / dynamic config keys (off by
 * default, except enableAdditionalDirectoriesClaudeMd: COWORK_CLAUDE_MD_CONFIG); `fileSystem` is the desktop bridge (listFilesInFolder enables Browse files when the gate is on).
 */
export function coworkOutputsData({ items = [], cwd, sessionId, deliverables, gates = {}, fileSystem } = {}) {
  const folders = coworkSelectedFolders(cwd);
  const events = coworkOutputEvents(items, { cwd, deliverables });
  const outputs = events.filter((event) => isOutputEvent(event, folders));
  return {
    userSelectedFolders: folders,
    hasSelectedFolders: folders.length > 0,
    hasMultipleFolders: folders.length > 1,
    resourceActivity: events,
    outputResourcesActivity: outputs,
    outputsByFolder: coworkOutputsByFolder(outputs, folders),
    downloadableOutputs: coworkDownloadableOutputs(outputs),
    outputsFolderPath: coworkOutputsFolderPath(outputs),
    fileExplorerAvailable: gates[FILE_EXPLORER_GATE] === true && !!sessionId && typeof fileSystem?.listFilesInFolder === "function",
    enableAdditionalDirectoriesClaudeMd: (gates[CLAUDE_MD_CONFIG_KEY] ?? COWORK_CLAUDE_MD_CONFIG) === true,
    isRemote: false,
    scratchpadResourceActivity: [],
    hasConnectedOfficeFiles: false,
    nonFileOutputs: [],
    hasWorkingDocuments: false,
    suppressWorkingDocuments: false,
  };
}
