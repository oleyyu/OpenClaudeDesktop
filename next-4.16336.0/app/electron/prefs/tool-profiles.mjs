// Per-session tool selection and tool profiles (the DeepSeek bridge's
// capabilities.toolSelection, harness tool-gate.js).
//
// A selection is what one session turns off: { disabled: tool names,
// disabledServers: MCP server names }; null means every tool is on. It goes to
// the core as params.codeDesktop.tools on thread/start, thread/resume and
// turn/start, and main keeps each session's in config.threadTools.
//
// A profile is a named selection plus optional model, effort and permission
// mode, applied to a new session (config.toolProfiles; config.defaultToolProfile
// is the id a new session starts with).

const MAX_NAMES = 512;
const MAX_PROFILES = 50;
const PERMISSIONS = ["auto", "ask", "acceptEdits", "plan", "bypass"];

const nameList = (value) => Array.isArray(value)
  ? [...new Set(value.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim()))].slice(0, MAX_NAMES)
  : [];

/** A clean selection, or null when nothing is turned off. */
export function normalizeSelection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const disabled = nameList(value.disabled).filter((name) => name !== "run_code");
  const disabledServers = nameList(value.disabledServers);
  return disabled.length || disabledServers.length ? { disabled, disabledServers } : null;
}

const text = (value, max) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

/** One clean profile, or null. */
export function normalizeProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = text(value.id, 64), name = text(value.name, 60);
  if (!id || !name) return null;
  const profile = { id, name, tools: normalizeSelection(value.tools) };
  const model = text(value.model, 200), effort = text(value.effort, 40);
  if (model) profile.model = model;
  if (effort) profile.effort = effort;
  if (PERMISSIONS.includes(value.permission)) profile.permission = value.permission;
  return profile;
}

/** Clean profiles with unique ids, in order. */
export function normalizeProfiles(value) {
  const seen = new Set(), profiles = [];
  for (const entry of Array.isArray(value) ? value : []) {
    const profile = normalizeProfile(entry);
    if (!profile || seen.has(profile.id)) continue;
    seen.add(profile.id);
    profiles.push(profile);
    if (profiles.length === MAX_PROFILES) break;
  }
  return profiles;
}

/** The settings patch for the profiles keys present in p (main.cjs "settings"). */
export function toolProfilesPatch(p, config = {}) {
  const patch = {};
  if (Object.hasOwn(p ?? {}, "toolProfiles")) patch.toolProfiles = normalizeProfiles(p.toolProfiles);
  const profiles = patch.toolProfiles ?? normalizeProfiles(config.toolProfiles);
  if (Object.hasOwn(p ?? {}, "defaultToolProfile")) patch.defaultToolProfile = typeof p.defaultToolProfile === "string" ? p.defaultToolProfile : null;
  const chosen = Object.hasOwn(patch, "defaultToolProfile") ? patch.defaultToolProfile : config.defaultToolProfile;
  // A default whose profile is gone falls back to none.
  if ((Object.hasOwn(patch, "toolProfiles") || Object.hasOwn(patch, "defaultToolProfile")) && chosen && !profiles.some((profile) => profile.id === chosen))
    patch.defaultToolProfile = null;
  return patch;
}

/** The profile a new session starts with, or null. */
export function defaultProfile(config = {}) {
  const id = config.defaultToolProfile;
  return id ? normalizeProfiles(config.toolProfiles).find((profile) => profile.id === id) ?? null : null;
}

/** Whether a tool name is off under a selection (an MCP tool also through its server). */
export function isToolOff(name, selection) {
  if (!selection || typeof name !== "string") return false;
  if (selection.disabled.includes(name)) return true;
  return selection.disabledServers.some((server) => name.startsWith(`mcp__${server}__`));
}

/**
 * A tool the agent turns off together with another one (codeDesktop/tools/list `requires`: MiMo checks write,
 * multiedit, apply_patch and notebook_edit as edits): the first required tool the selection has off, else null.
 */
export function requiredToolOff(tool, selection) {
  const requires = Array.isArray(tool?.requires) ? tool.requires : [];
  return requires.find((name) => typeof name === "string" && name && name !== tool.name && isToolOff(name, selection)) ?? null;
}

/** The selection with one tool (or, with server: true, one MCP server) switched. */
export function toggleInSelection(selection, name, { server = false } = {}) {
  const current = normalizeSelection(selection) ?? { disabled: [], disabledServers: [] };
  const key = server ? "disabledServers" : "disabled";
  const list = current[key].includes(name) ? current[key].filter((entry) => entry !== name) : [...current[key], name];
  return normalizeSelection({ ...current, [key]: list });
}

/** Whether two selections turn off the same things. */
export function sameSelection(a, b) {
  const key = (selection) => {
    const clean = normalizeSelection(selection);
    return clean ? `${[...clean.disabled].sort().join("\n")}\u0000${[...clean.disabledServers].sort().join("\n")}` : "";
  };
  return key(a) === key(b);
}

/** How many tools and servers a selection turns off. */
export function offCount(selection) {
  const clean = normalizeSelection(selection);
  return clean ? clean.disabled.length + clean.disabledServers.length : 0;
}

/** A new profile id that is not taken. */
export function newProfileId(profiles = [], now = Date.now()) {
  const taken = new Set(profiles.map((profile) => profile.id));
  let id = `profile-${now.toString(36)}`, n = 1;
  while (taken.has(id)) id = `profile-${now.toString(36)}-${n++}`;
  return id;
}
