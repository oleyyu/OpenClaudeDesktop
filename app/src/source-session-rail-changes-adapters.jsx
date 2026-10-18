// Local services for the original 2.42304.0 session rail Changes card that scripts/extract-session-rail-changes.mjs
// emits (src/generated/session-rail-changes: R4f-rail SR-4's row, R4i-rail RL2's PR rows), and the host stand-in for the
// PR bar that feeds it.
//
// The first block answers imports of the generated modules: each export replaces one import of the original, and the
// extractor checks the declaration it stands for (file:local, with feature strings) before it accepts the import.
//
// SessionRailChanges replaces the official chain under the rail's Changes card (c73f45bc3 O_ -> cf74bc599 fC / pC ->
// c96d752d0 $Re -> eze -> nze -> oRe -> wB -> iB -> OLe). eze / nze read claude.ai's PR stores, GitHub lookups and the
// tile store; this host's data is what main.jsx already reads for the band: the local git status
// (electron/git-status.cjs workspaceGitStatus), the branch's pull request from the GitHub CLI lookup (main.cjs
// workspace-pull-request, else the core's codeDesktop.pr binding; git-rail-model.mjs branchPullRequest) and the band's
// Create PR action (git-rail-model.mjs pullRequestAction). Nothing new is fetched. The component follows the pinned
// original text (manifest callSites nze / eze / wB / oRe) to build nze's rail entries and hands them to the generated
// oRe (pr-rows.mjs RailPrRows), whose rows are the generated iB (PrBarRow) around OLe (changes-row.mjs ChangesRow).
import React from "react";
import { useIntl } from "./source-session-rail-kit-adapters.jsx";
import { GhHint } from "./source-git-status.jsx";
import { PrBarRow, RailPrRows, PrBarLayoutContext, railRowsShape, useRailRowsControls, useReportRailPrCount, prBarMode,
  repoRowId, repoRowIdKey } from "./generated/session-rail-changes/pr-rows.mjs";
import { RAIL_PR_BAR_NAV_CLASS, prBarRowShown } from "./generated/session-rail-changes/pr-bar-rail.mjs";
import { useAnnouncement } from "./generated/session-rail-sections/announcement.mjs";

// vendor-intl q / Gt (useIntl / FormattedMessage), shared-frame qa / Ya (the CDS layer element and its window) and
// shared-52 Sj (the ErrorsProvider): the session rail kit's adapters (source-session-rail-kit-adapters.jsx), so the
// rail reads one intl, one layer answer and one toast sink.
export { useIntl, FormattedMessage, useLayerElement, useLayerOwnerWindow, useErrors } from "./source-session-rail-kit-adapters.jsx";

// shared-25 ml (exported Rm): whether this runs in the Claude desktop app (a user agent test, cached per version and
// platform). OLe passes it to the keybinding table (shared-19 $7 -> e9 -> q7), whose toggleDiff rows are
// `cmd+shift+d` / `ctrl+shift+d` for `when: "isClaudeApp"`. This host is the desktop app (as
// source-sidebar-sections-adapters.jsx useIsDesktopApp answers), so the chord is the one pane-shortcuts.mjs binds.
export function isClaudeDesktopApp() {
  return true;
}

// shared-frame iC (exported Ya): renders a menu items array (label / onSelect / checked / separatorBefore / nested
// items) as CDS dropdown items. view-tabs slices it without publishing a semantic name; its one published copy is the
// session rail area's menu-items.mjs (the same original, over view-tabs' CdsDropdown), re-exported here. OLe's menu body
// (kLe) calls it for `extraMenuItems`, which iB fills with nze's create-mode radio items (`dn`: Create PR / Create
// draft PR / Manually create PR) while a GitHub PR can be created. R4i-rail RL2: this used to answer null.
export { renderMenuItems } from "./generated/session-rail/menu-items.mjs";

// ---- R4i-rail RL2: what the generated PR rows (pr-rows.mjs: iB / oRe / sRe) read from outside their slice ----------

// c96d752d0 Yz (iB's band layout repo chip) and qz (dLe's PR count report, which rail-view's Changes card provides as
// `Wo.Provider value: ge` for its "{count} pull requests" summary): their one copies live in the session rail area.
export { RepoNameChip } from "./generated/session-rail/repo-name-chip.mjs";
export { RailPrCountContext } from "./generated/session-rail/pr-count-context.mjs";
// shared-20 pE (oRe's Dae, the sr-only status line for rail announcements): the session-rail-sections copy.
export { Announcement } from "./generated/session-rail-sections/announcement.mjs";

// c227f4d5e Nw (iB's default prPanelPreloadHandle, the lazy EpitaxyPrPanel's handle). The host has no in-app PR panel:
// nze never passes onOpenPrPanel, so iB's `yo(o ? u : null)` never reads it.
export const prPanelPreloadHandle = null;

// cc6e65d4b f (iB's Xbe): with prLinkOpensInApp, a PR link click opens the link in the app's preview pane. The host
// opens pull requests in the browser (nze's `prsOpenInBrowser` on), so iB asks with no URL and gets no handler.
export function usePrLinkInAppClick() {
  return undefined;
}

// c60636ac6 ct / lt (iB's hxe, bLe's pS): the GitHub ref hover card on the band layout's #number, which needs the
// desktop's getGhRefSummary bridge. The host has none: ct answers false (bLe uses the plain tooltip) and lt, never
// reached, passes its child through as lt itself does without a card.
export function hasPrHoverCard() {
  return false;
}
export function PrHoverCard({ children }) {
  return children;
}

/**
 * c96d752d0 wB: one rail list item, `li.flex.flex-col` around iB with layout "rail". The original reads the tile store
 * (`Yh`) for diffOpenHasChord: only the primary row, and only while toggleDiff would open its diff (no diff tile is the
 * visible one). The host stand-in puts that answer on the entry (main.jsx: the Changes pane is not open).
 */
export function RailPrListItem({ entry: e }) {
  return <li className="flex flex-col">
    <PrBarRow {...e.row} layout="rail" diffOpenHasChord={e.primary === true && e.diffOpenHasChord === true} />
  </li>;
}

// ---- host stand-in for the rail PR bar --------------------------------------------------------------------------------

// The props c96d752d0 iB's rail branch gives OLe for one repo without a pull request, from the local git status
// ({ isRepo, cwd, repoName, branch, hasChanges, added, removed, comparison }, git-status.cjs workspaceGitStatus).
// - shown: fze(pr, stats, branchPushed, localTree) with no PR and a local working tree, i.e. the stats' hasChanges
//   (nze `gt`; no dismiss in this host, so hze is false).
// - diff: nze `_n`, only when the diff can open (`ze`) and the counts are known and non-zero.
// - branchTitle: nze `Gn = n.currentBranch || n.branch` (the ⋮ menu's "More options for {title}").
// - repoName: eze hides it for a single repo (`hideRepo: … || (n === "rail" && de.length <= 1)`); else nze wze, the
//   repo name or the folder's basename.
// - baseBranch: iB `fe || (t === void 0 && v === x) ? void 0 : v` (only the stacked layout shows it).
export function railChangesRowProps({ status, diffOpenable = false, hideRepo = true, prMode = "commit" } = {}) {
  if (!status?.isRepo) return null;
  if (!prBarRowShown(undefined, { hasChanges: status.hasChanges === true }, undefined, true)) return null;
  const added = Number.isFinite(status.added) ? status.added : undefined;
  const removed = Number.isFinite(status.removed) ? status.removed : undefined;
  const diff = diffOpenable && added !== undefined && removed !== undefined && (added > 0 || removed > 0) ? { added, removed } : undefined;
  const branchTitle = status.currentBranch || status.branch || undefined;
  const localOnly = prMode === "commit" || prMode === "none";
  const base = status.comparison?.base || undefined;
  return {
    branchTitle,
    repoName: hideRepo ? undefined : status.repoName || undefined,
    baseBranch: localOnly || base === branchTitle ? undefined : base,
    diff,
  };
}

// The PR states iB knows (xLe's keys; nze's `ye`, Lc's answer without "none"). git-pull-request.cjs prState answers
// the same names from gh.
const PR_STATES = new Set(["open", "draft", "approved", "changesRequested", "conflicting", "merged", "closed", "queued"]);
// The CI states iB's tB / nB know (nze `An`: the PR's ciState). git-pull-request.cjs ciStatus answers failed / pending /
// skipped / passed, or nothing without checks.
const CI_STATES = new Set(["failed", "passed", "pending", "loading", "skipped", "unavailable"]);
const CREATE_MODES = new Set(["create", "draft", "compose"]);

/**
 * nze's rail entries (`pr`, pinned in the manifest's nze call site) for the session's one repository, over the host:
 * `[{rowKey, primary, history, facts: {prState, ciStatus}, row}]`, the row being nze's `dr` (iB's props), or [] when
 * fze hides the row. The branch's other pull requests (`xt`, nze's history rows) and stacked parent branches (eze's
 * onStackParent) have no host source: the lookup answers the branch's own pull request only.
 *
 * status      the session folder's git status (as above).
 * pr          the branch's pull request ({number, url, state, title, baseRefName, ci, …}), or null.
 * prAction    the band's Create PR action (pullRequestAction plus busy / onPrimary(mode) / onSelectMode(mode)), or null:
 *             a GitHub repository with a committed, clean feature branch and no pull request yet.
 * verb        the commit verb ({onClick, disabled, disabledReason, busy}) for every other repository without a PR.
 * onOpenPr    opens a pull request URL (the host's external opener).
 */
export function railPrEntries({ intl, status, pr = null, prAction = null, verb = null, diffOpenable = false, hideRepo = true,
  onOpenChanges, onToggleChanges, diffOpenHasChord = false, warning, hint, onOpenPr } = {}) {
  if (!status?.isRepo) return [];
  const V = pr && Number.isInteger(pr.number) && typeof pr.url === "string" ? pr : null;
  // nze `gt = !hze(…) && fze(V, De, le, …)`: a PR keeps the row; else the branch stats' hasChanges.
  if (!prBarRowShown(V ?? undefined, { hasChanges: status.hasChanges === true }, undefined, true)) return [];
  const ye = V && PR_STATES.has(V.state) ? V.state : undefined;
  // nze `Wt = !V && be ? "commit" : yze(V, Ht, Ut)`: a PR is view / merged / queued; without one the host keeps the band's
  // order (git-rail-model pullRequestAction: Create PR once the tree is committed, else Commit).
  const create = !V && prAction && CREATE_MODES.has(prAction.mode) ? prAction : null;
  const Wt = V ? prBarMode(V, "create", false) : create ? create.mode : "commit";
  const commit = Wt === "commit";
  const added = Number.isFinite(status.added) ? status.added : undefined;
  const removed = Number.isFinite(status.removed) ? status.removed : undefined;
  // nze `_n`: counts only when the diff can open (`ze`) and something changed.
  const _n = diffOpenable && added !== undefined && removed !== undefined && (added > 0 || removed > 0) ? { added, removed } : undefined;
  const Gn = status.currentBranch || status.branch || undefined;
  const busy = commit ? verb?.busy === true : create ? create.busy === true : false;
  const disabled = commit ? verb?.disabled === true : create ? !!create.disabledReason : false;
  const reason = commit ? verb?.disabledReason : create?.disabledReason;
  // nze `dn` (vze: no PR, not commit mode): the create-mode radio items; Create / Create draft select and fire, Manually
  // only selects (the primary then opens GitHub's compare page).
  const dn = create ? [
    { label: intl.formatMessage({ defaultMessage: "Create PR", id: "EBcT1W1KuZ" }), checked: create.mode === "create", checkedRole: "radio",
      onSelect: () => { create.onSelectMode?.("create"); create.onPrimary?.("create"); } },
    { label: intl.formatMessage({ defaultMessage: "Create draft PR", id: "LugtSxHcwh" }), checked: create.mode === "draft", checkedRole: "radio",
      onSelect: () => { create.onSelectMode?.("draft"); create.onPrimary?.("draft"); } },
    { label: intl.formatMessage({ defaultMessage: "Manually create PR", id: "rQcYK3TGb8" }), checked: create.mode === "compose", checkedRole: "radio",
      separatorBefore: true, disabled: false, onSelect: () => create.onSelectMode?.("compose") },
  ] : undefined;
  const ln = commit ? (verb?.onClick ?? undefined) : create ? () => create.onPrimary?.(create.mode) : undefined;
  const repoName = status.repoName || (status.cwd ? status.cwd.split(/[\\/]/).filter(Boolean).pop() : "") || "";
  const dr = {
    prState: ye,
    prNumber: V?.number,
    prNumberLabel: undefined,
    prTitle: V?.title ?? undefined,
    prUrl: V?.url,
    // nze `Qn = V ? ln : void 0` (the link's click report). Host: the window refuses new windows (main.cjs
    // setWindowOpenHandler deny), so this is where the PR opens in the browser; kLe calls it before "Open on {host}".
    onPrIconClick: V && onOpenPr ? () => onOpenPr(V.url) : undefined,
    onOpenPrPanel: undefined,
    prLinkOpensInApp: false,
    repoName,
    hideRepo,
    baseBranch: V?.baseRefName ?? status.comparison?.base ?? undefined,
    branchName: Gn,
    diff: _n,
    onDiffClick: diffOpenable ? onToggleChanges : undefined,
    onDiffOpen: diffOpenable ? onOpenChanges : undefined,
    reviewComments: undefined,
    onReviewCommentsClick: undefined,
    ciSlot: undefined,
    ciStatus: V && CI_STATES.has(V.ci) ? V.ci : undefined,
    prStatusWarning: warning || undefined,
    prStatusHint: hint ?? undefined,
    railVerb: undefined,
    railMenuControls: undefined,
    prMode: Wt,
    prBusy: busy,
    prDisabled: disabled,
    prDisabledReason: disabled ? reason : undefined,
    onPrClick: ln,
    prMenuItems: dn,
    onDismiss: undefined,
  };
  const rowKey = repoRowIdKey(repoRowId({ cwd: status.cwd, repo: repoName, branch: Gn ?? "" }, null));
  return [{ rowKey, primary: true, history: false, facts: { prState: ye, ciStatus: dr.ciStatus }, row: dr, diffOpenHasChord }];
}

/**
 * The rail's Changes card content (cf74bc599 rD `pullRequests`), eze's rail branch: `Jz.Provider value "rail"` around
 * `nav[aria-label="Repository and pull request controls"].VRe` holding oRe over the entries' shape (tRe), with aRe's
 * Show more / history state, Tae's announcement, and dLe reporting the PR count to the card ("{count} pull requests").
 * It must render inside the card's providers: the row layout context (session-rail-kit ChangesRowLayoutContext) is
 * "row" in the flat rail (D10), which selects OLe's `data-rail-changes-row` branch for a row without a PR link; a PR
 * row is OLe's link layout.
 *
 * eze renders nothing without a repository; otherwise the nav is there and stays empty (so the card's
 * `has-[nav:not(:empty)]:flex` keeps it hidden) until a row shows. See railPrEntries for the other props.
 */
export function SessionRailChanges({ status, pr = null, prAction = null, diffOpenable = false, onOpenChanges, onToggleChanges,
  diffOpenHasChord = false, verb = null, warning, hint, hideRepo = true, onOpenPr }) {
  const intl = useIntl();
  // nze `Un = C(() => w && Hn ? b(kye, {cause: Hn, onRunInTerminal: ct}) : void 0)` (c96d752d0; kye = c219730b0 dn): the
  // GitHub CLI hint on the row (iB prStatusHint). Host: `hint` is the band's {cause, onInstall, onRunInTerminal}
  // (git-rail-model prStatusHint over the local gh lookup, only while Create PR is on offer), rendered by the band's own
  // GhHint; the session has one repository, so the hinted row (nze `showGithubStatusHint: d === Be`) is that one.
  const hintNode = React.useMemo(() => hint?.cause
    ? <GhHint cause={hint.cause} onRunInTerminal={hint.onRunInTerminal ?? null} onInstall={hint.onInstall ?? null} />
    : undefined, [hint?.cause, hint?.onRunInTerminal, hint?.onInstall]);
  const entries = railPrEntries({ intl, status, pr, prAction, verb, diffOpenable, hideRepo, onOpenChanges, onToggleChanges,
    diffOpenHasChord, warning, hint: hintNode, onOpenPr });
  // eze `je = tRe(e)` over the reported entries (rebuilt here every render, as the host has no row reports to hold).
  const je = railRowsShape(entries);
  const Me = useRailRowsControls(je);
  const { announcement: Ne } = useAnnouncement();
  useReportRailPrCount(status?.isRepo ? je.prCount : null);
  if (!status?.isRepo) return null;
  return <PrBarLayoutContext.Provider value="rail">
    <nav aria-label={intl.formatMessage({ defaultMessage: "Repository and pull request controls", id: "NHI5eIky7V" })}
      className={RAIL_PR_BAR_NAV_CLASS}>
      <RailPrRows shape={je} controls={Me} announcement={Ne} />
    </nav>
  </PrBarLayoutContext.Provider>;
}

