// Host services of the 3.6556.2 Cowork activity panel's Context section (src/generated/cowork-context,
// scripts/extract-cowork-context.mjs; w13-coworkui-context). Each export replaces one original c21f11e6d declaration
// the generator pins by its features. OpenClaude has no claude.ai account, MCP directory, remote Cowork sessions or
// mounted projects (E59), so every branch below is the one the original takes for a local session without them; the
// section's own rows (the official activity list mS, its category headers and the "{count} connectors" pile) come from
// cowork-progress and read the data src/cowork-context-model.mjs derives from the session's items.

// c21f11e6d Fy: the header's "add folder" action. TT renders it only for a remote session (`s && !P`); local sessions
// are never remote here, so it never mounts.
export const CoworkAddFolderAction = () => null;

// c21f11e6d ww: the mounted-projects block ("Open project"). TT renders it only when the session has mounted projects
// (`l && l.length > 0`), and the original itself returns null for none; Cowork sessions here mount no claude.ai project.
export const CoworkMountedProjects = () => null;

// c21f11e6d mw (= E(pw)) and _w: the kind-grouped Context ("Used in this session" rows per kind). TT renders them only
// with groupContextByKind, which the 3.6556.2 panel AT defaults to false and its one caller (the Cowork session view)
// never sets, so they never mount in this build either.
export const CoworkContextKindGroups = () => null;
export const CoworkContextKindGroupsWithBrowser = () => null;

// c21f11e6d Ab (the Cowork built-in browser row TT renders only when the built-in browser is enabled and the panel is
// header-hosted, `v && c && !t`) is no longer an adapter: the generated graph imports cowork-live's slice of it
// (CoworkInAppBrowserSection, w13-close-gen-dedup). The built-in browser (za(...).enabled) stays off for this host.

// c21f11e6d _S: a remote session's context sources (folders and project files). Rendered only when `isRemote`.
export const CoworkRemoteContextSources = () => null;

// c21f11e6d Kw: the "Suggested connectors" card of the empty Context body. The original suggests Notion / Linear /
// Canva from the claude.ai connector directory (sd().servers) and Claude in Chrome, and returns null while that directory
// list is empty (`$e = D.length > 0`; `if (!C || !$e || …) return null`). Without a claude.ai account the directory is
// always empty, so this is the original's null branch (cwui-20; the card itself is generated as
// CoworkSuggestedConnectorsCard and locked by SSR).
export const CoworkSuggestedConnectors = () => null;

/**
 * TT's handleContextActivityClick for this host. The original (AT Sa(e, "context")) opens the MCP server / web search /
 * skill detail drawer, which needs the claude.ai detail panes (not sliced, see source-cowork-progress-v3-adapters.jsx
 * unavailableActivityDetail); here a row reveals the step that produced it in the transcript (its latest operation),
 * or opens a file row's file.
 */
export function coworkContextActivityClick(activity, { onRevealStep, canRevealStep, onOpenFile } = {}) {
  const stepId = activity?.latestId ?? activity?.operationHistory?.at?.(-1)?.id;
  if (stepId && typeof onRevealStep === "function" && (typeof canRevealStep !== "function" || canRevealStep(stepId))) {
    onRevealStep(stepId);
    return true;
  }
  if (activity?.openWith?.via === "path" && activity.filePath && typeof onOpenFile === "function") {
    onOpenFile(activity.filePath);
    return true;
  }
  return false;
}
