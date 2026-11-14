// Customize › Hooks: the running core's lifecycle hooks (hooks/list, Codex HooksListResponse; a bridge answers the same
// shape for its agent's hooks), grouped by event the way Codex's /hooks browser does (tui bottom_pane/
// hooks_browser_view.rs). A Codex hook that is new or changed since it was trusted (trustStatus untrusted / modified)
// doesn't run until the user trusts it (startup_hooks_review.rs); trusting writes hooks.state.<key>.trusted_hash and the
// switch hooks.state.<key>.enabled (hooks_rpc.rs write_hook_trusts, background_requests.rs write_hook_enabled). Pure.
import { t, tn } from "../electron/i18n/index.mjs";

// HookEventName in Codex's order, with the TUI's description of when each runs.
const EVENTS = [
  ["preToolUse", "PreToolUse", () => t("Before a tool runs")],
  ["permissionRequest", "PermissionRequest", () => t("When permission is requested")],
  ["postToolUse", "PostToolUse", () => t("After a tool runs")],
  ["preCompact", "PreCompact", () => t("Before the conversation is compacted")],
  ["postCompact", "PostCompact", () => t("After the conversation is compacted")],
  ["sessionStart", "SessionStart", () => t("When a session starts")],
  ["sessionEnd", "SessionEnd", () => t("When a session ends")],
  ["userPromptSubmit", "UserPromptSubmit", () => t("When you send a message")],
  ["subagentStart", "SubagentStart", () => t("When a sub-agent starts")],
  ["subagentStop", "SubagentStop", () => t("When a sub-agent finishes")],
  ["stop", "Stop", () => t("When the agent finishes its turn")],
  ["interrupt", "Interrupt", () => t("When a turn is interrupted")],
];
const SOURCES = {
  user: () => t("Your config"), project: () => t("This project"), plugin: () => t("Plugin"), system: () => t("System"), mdm: () => t("Managed by your organization"),
  sessionFlags: () => t("This session"), cloudRequirements: () => t("Managed by your organization"), cloudManagedConfig: () => t("Managed by your organization"),
  legacyManagedConfigFile: () => t("Managed by your organization"), legacyManagedConfigMdm: () => t("Managed by your organization"),
};
const text = (value) => (typeof value === "string" ? value : "");
const home = (value) => text(value).replace(/^\/Users\/[^/]+(?=\/|$)/, "~");

/** Whether a hook waits for the user's trust before it runs (Codex hook_needs_review). */
export const hookNeedsReview = (hook) => !hook?.isManaged && (hook?.trustStatus === "untrusted" || hook?.trustStatus === "modified");
/** Whether a hook runs: on, and managed or trusted (hooks_browser_view.rs hook_is_active). A bridge's hooks carry no trust. */
export const hookActive = (hook) => hook?.enabled !== false && (!hook?.trustStatus || hook.trustStatus === "managed" || hook.trustStatus === "trusted");

/** One hook as the page shows it. */
export function hookRow(hook) {
  const handler = text(hook?.handlerType) || "command";
  const what = handler === "command" ? text(hook.command)
    : handler === "mcpTool" ? `${text(hook.server)} · ${text(hook.tool)}` : handler === "prompt" ? t("A prompt") : handler === "agent" ? t("An agent") : "";
  return {
    key: text(hook?.key), event: text(hook?.eventName), matcher: text(hook?.matcher) || null, handler, what,
    async: hook?.async === true, source: SOURCES[hook?.source]?.() ?? (hook?.pluginId ? t("Plugin") : t("Other")),
    sourcePath: home(hook?.sourcePath), pluginId: text(hook?.pluginId) || null, enabled: hook?.enabled !== false, managed: hook?.isManaged === true,
    trust: text(hook?.trustStatus) || null, needsReview: hookNeedsReview(hook), active: hookActive(hook), currentHash: text(hook?.currentHash),
    statusMessage: text(hook?.statusMessage) || null,
  };
}

/** A hooks/list answer for one folder: groups by event (only events with hooks), the review count, warnings and errors. */
export function hooksView(response, cwd = null) {
  const entries = Array.isArray(response?.data) ? response.data : [];
  const entry = entries.find((item) => item?.cwd === cwd) ?? entries[0] ?? null;
  const hooks = (Array.isArray(entry?.hooks) ? entry.hooks : []).filter((hook) => hook && typeof hook.key === "string");
  const groups = EVENTS.map(([event, name, describe]) => ({ event, name, description: describe(),
    hooks: hooks.filter((hook) => hook.eventName === event).sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)).map(hookRow) }))
    .filter((group) => group.hooks.length);
  const known = new Set(EVENTS.map(([event]) => event));
  const other = hooks.filter((hook) => !known.has(hook.eventName)).map(hookRow);
  if (other.length) groups.push({ event: "other", name: t("Other"), description: "", hooks: other });
  const needsReview = hooks.filter(hookNeedsReview).length;
  return {
    groups, total: hooks.length, needsReview,
    warnings: (Array.isArray(entry?.warnings) ? entry.warnings : []).filter((value) => typeof value === "string" && value.trim()),
    errors: (Array.isArray(entry?.errors) ? entry.errors : []).map((error) => text(error?.message) || text(error)).filter(Boolean),
  };
}

/** The once-per-folder notice when hooks wait for review (Codex startup_hooks_review.rs). */
export function hooksReviewSummary(count) {
  return count > 0 ? tn(count, "{count} hook needs review before it can run.", "{count} hooks need review before they can run.") : "";
}

/** The trust label of a hook needing review (hooks_browser_view.rs hook_trust_label). */
export function hookTrustLabel(row) {
  if (row.managed || row.trust === "managed") return t("Managed");
  if (row.trust === "modified") return t("Changed since you trusted it");
  if (row.trust === "untrusted") return t("New: review it before it runs");
  if (row.trust === "trusted") return t("Trusted");
  return "";
}
