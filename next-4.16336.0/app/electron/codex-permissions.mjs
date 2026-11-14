// Codex's own permission settings (codex 0.155.1): named permission profiles ([permissions.<id>] in config.toml,
// default_permissions, listed by permissionProfile/list; TurnStartParams/ThreadStartParams `permissions`, which
// cannot be combined with a sandbox) and [sandbox_workspace_write] writable_roots / network_access.
//
// The app's Mode still decides approvals and the read-only and Bypass sandboxes. What changes is the workspace-write
// sandbox of Auto, Manual and Accept edits: a chosen (or configured) custom profile replaces it, as Codex's own
// /permissions does; without one, the user's configured writable roots and network access are kept instead of being
// replaced by the session folder alone. Pure: main.cjs reads the config and the profiles.
export const BUILTIN_PROFILES = Object.freeze([':read-only', ':workspace', ':danger-full-access']);
export const PROFILE_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const builtin = (id) => BUILTIN_PROFILES.includes(id);

/** The user's own profiles from permissionProfile/list ({data:[{id, description, allowed}]}): built-ins left out. */
export function customProfiles(response) {
  const data = Array.isArray(response?.data) ? response.data : [];
  return data.filter((entry) => entry && typeof entry.id === 'string' && PROFILE_ID.test(entry.id) && !builtin(entry.id))
    .map((entry) => ({ id: entry.id, description: typeof entry.description === 'string' && entry.description.trim() ? entry.description.trim() : null, allowed: entry.allowed !== false }));
}
/**
 * The profile workspace-write turns use. choice (Settings › Code, config.codexPermissionProfile): undefined follows
 * config.toml's default_permissions when it names a custom profile; '' means the app's own sandbox; an id picks it.
 */
export function effectiveProfile(choice, configured) {
  if (choice === '') return null;
  if (typeof choice === 'string' && PROFILE_ID.test(choice) && !builtin(choice)) return choice;
  return typeof configured === 'string' && PROFILE_ID.test(configured) && !builtin(configured) ? configured : null;
}
/** Settings value check: '' or a profile id (null clears the choice back to following config.toml). */
export function validateProfileChoice(value) {
  if (value === null || value === '') return value;
  if (typeof value !== 'string' || !PROFILE_ID.test(value) || builtin(value)) throw new Error('Invalid permission profile.');
  return value;
}
const absolute = (value) => typeof value === 'string' && value.startsWith('/') && !value.includes('\0');
/**
 * Applies them to a thread/start, thread/resume or turn/start request in place. Only a workspace-write request is
 * touched: sandbox 'workspace-write' (thread) or sandboxPolicy {type:'workspaceWrite'} (turn).
 * @param {object} params
 * @param {{profile?: string|null, workspaceWrite?: {writable_roots?: string[], network_access?: boolean}|null}} codex
 */
export function applyCodexPermissions(method, params, { profile = null, workspaceWrite = null } = {}) {
  if (!params || typeof params !== 'object') return params;
  const threadWrite = (method === 'thread/start' || method === 'thread/resume') && params.sandbox === 'workspace-write';
  const turnWrite = method === 'turn/start' && params.sandboxPolicy?.type === 'workspaceWrite';
  if (!threadWrite && !turnWrite) return params;
  if (profile) {
    delete params.sandbox; delete params.sandboxPolicy;
    params.permissions = profile;
    return params;
  }
  if (turnWrite && workspaceWrite && typeof workspaceWrite === 'object') {
    const roots = Array.isArray(workspaceWrite.writable_roots) ? workspaceWrite.writable_roots.filter(absolute) : [];
    const policy = params.sandboxPolicy;
    if (roots.length) policy.writableRoots = [...new Set([...(Array.isArray(policy.writableRoots) ? policy.writableRoots : []), ...roots])];
    if (workspaceWrite.network_access === true) policy.networkAccess = true;
  }
  return params;
}

/**
 * The `-c` launch overrides that give OpenClaude Desktop's workflow runner's Codex agents the session's own Codex sandbox
 * (the runner starts each agent with only sandbox "workspace-write"; it is the user's and stays as it is): the turn's
 * permission profile (or the chosen one), else its workspace-write network access and writable roots, which
 * applyCodexPermissions already merged with config.toml's [sandbox_workspace_write]. Only for workspace-write agents:
 * read-only and Bypass agents need nothing. turn: the session's last turn/start params as sent (or null: no turn yet,
 * then Settings › Code › Sandbox network access and the chosen profile).
 */
export function codexWorkflowArgs({ access, turn = null, networkAccess = false, profile = null } = {}) {
  if (access !== 'workspace-write') return [];
  const toml = (value) => JSON.stringify(value);
  const custom = (id) => typeof id === 'string' && PROFILE_ID.test(id) && !builtin(id) ? id : null;
  const policy = turn?.sandboxPolicy?.type === 'workspaceWrite' ? turn.sandboxPolicy : null;
  const permissions = custom(turn?.permissions) ?? (policy ? null : custom(profile));
  const out = [];
  if (permissions) out.push('-c', `default_permissions=${toml(permissions)}`);
  if (policy ? policy.networkAccess === true : networkAccess === true) out.push('-c', 'sandbox_workspace_write.network_access=true');
  const roots = policy && Array.isArray(policy.writableRoots) ? [...new Set(policy.writableRoots.filter(absolute))] : [];
  if (roots.length) out.push('-c', `sandbox_workspace_write.writable_roots=${toml(roots)}`);
  return out;
}
