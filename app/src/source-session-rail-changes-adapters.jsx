// Local services for the original 3.6556.2 session rail Changes card that scripts/extract-session-rail-changes.mjs
// emits (src/generated/session-rail-changes: R4f-rail SR-4's row, R4i-rail RL2's PR rows; w3-rail-changes moved both to
// 3.6556.2), and the host stand-in for the PR bar that feeds it.
//
// The first block answers imports of the generated modules: each export replaces one import of the original, and the
// extractor checks the declaration it stands for (file:local, with feature strings) before it accepts the import.
//
// SessionRailChanges replaces the official chain under the rail's Changes card (c73f45bc3 Py -> c96d752d0 TMe -> xje ->
// Sje -> Hje / bAe -> YL -> TR -> Zje -> EL -> Ike). Sje / Zje read claude.ai's PR stores, GitHub lookups and the
// tile store; this host's data is what main.jsx already reads for the band: the local git status
// (electron/git-status.cjs workspaceGitStatus), the branch's pull request from the GitHub CLI lookup (main.cjs
// workspace-pull-request, else the core's codeDesktop.pr binding; git-rail-model.mjs branchPullRequest) and the band's
// Create PR action (git-rail-model.mjs pullRequestAction). Nothing new is fetched. The component follows the pinned
// original text (manifest callSites Sje / Hje / Zje / YL) to build the rail entries and hands them to the generated
// bAe (pr-rows.mjs RailPrRows), whose rows are the generated EL (PrBarRow) around Ike (changes-row.mjs ChangesRow).
import React, { createContext, useContext } from "react";
import { useIntl } from "./source-session-rail-kit-adapters.jsx";
import { GhHint } from "./source-git-status.jsx";
import { PrBarRow, RailPrRows, PrBarLayoutContext, railRowsShape, useRailRowsControls, useReportRailPrCount, prBarMode,
  repoRowId, repoRowIdKey } from "./generated/session-rail-changes/pr-rows.mjs";
import { RAIL_PR_BAR_NAV_CLASS, prBarRowShown } from "./generated/session-rail-changes/pr-bar-rail.mjs";
import { useAnnouncement } from "./generated/session-rail-sections/announcement.mjs";

// vendor-intl q / Gt (useIntl / FormattedMessage) and shared-52 cB (the ErrorsProvider): the session rail kit's
// adapters (source-session-rail-kit-adapters.jsx), so the rail reads one intl and one toast sink.
export { useIntl, FormattedMessage, useErrors } from "./source-session-rail-kit-adapters.jsx";

// shared-25 cc (exported vh): whether this runs in the Claude desktop app (a user agent test, cached per version and
// platform). Ike passes it to the keybinding table (shared-46 iR -> aR), whose toggleDiff rows are `cmd+shift+d` /
// `ctrl+shift+d` for `when: "isClaudeApp"`. This host is the desktop app (as source-sidebar-sections-adapters.jsx
// useIsDesktopApp answers), so the chord is the one pane-shortcuts.mjs binds.
export function isClaudeDesktopApp() {
  return true;
}

// shared-frame yT (exported Xo): renders a menu items array (label / onSelect / checked / separatorBefore / nested
// items) as CDS dropdown items. view-tabs slices it without publishing a semantic name; its one published copy is the
// session rail area's menu-items.mjs (the same original, over view-tabs' CdsDropdown), re-exported here. Ike's menu body
// (Bke) calls it for `extraMenuItems`, which EL fills with the create-mode radio items while a GitHub PR can be created.
export { renderMenuItems } from "./generated/session-rail/menu-items.mjs";

// shared-frame fu (exported Au), the tooltip Ike / EL wrap their controls in, is not an adapter: the generated rows import
// view-tabs' CdsDeferredTooltip (the same original) by its semantic name (w10-trans-rail-deferred-tooltip, L64).

// ---- what the generated PR rows (pr-rows.mjs: EL / bAe / xAe) read from outside their slice ----------------------

// c96d752d0 cL (gke's PR count report, which rail-view's Changes card provides for its "{count} pull requests"
// summary): its one instance lives in the session rail area.
export { RailPrCountContext } from "./generated/session-rail/pr-count-context.mjs";
// shared-20 bE (bAe's tie, the sr-only status line for rail announcements): the session-rail-sections copy.
export { Announcement } from "./generated/session-rail-sections/announcement.mjs";

// c227f4d5e UT (EL's default prPanelPreloadHandle, the lazy EpitaxyPrPanel's handle). The host has no in-app PR panel:
// Zje never passes onOpenPrPanel, so EL's `qa(s ? oe : null)` never reads it.
export const prPanelPreloadHandle = null;

// cc6e65d4b f (EL's G_e): with prLinkOpensInApp, a PR link click opens the link in the app's preview pane. The host
// opens pull requests in the browser, so EL asks with no URL and gets no handler.
export function usePrLinkInAppClick() {
  return undefined;
}

// c2fd10b8d Al (EL's rw): the PR link's policy. With no link confirm context (cb8c5a88f An, null) c9c0413df r answers
// "live" for every URL, and without the override (shared-1 EP, false) Dl keeps it: the link is live. Ml (EL's Gve),
// the "asks" link, is therefore never rendered; it stays a plain new-window anchor with the same class and title.
export function usePrLinkPolicy() {
  return "live";
}
export function ConfirmedPrLink({ href, className, title, onPress, children }) {
  return <a href={href} target="_blank" rel="noopener" className={className} title={title} draggable={false}
    onClick={(e) => { e.stopPropagation(); onPress?.(e); }}>{children}</a>;
}

// c60636ac6 mt / ht (EL's hve, Oke's hover card): the GitHub ref hover card on the band layout's #number, which needs
// the desktop's getGhRefSummary bridge. The host has none: mt answers false for a PR URL (Oke uses the plain tooltip)
// and ht, never reached, passes its child through as ht itself does without a card.
export function hasPrHoverCard() {
  return false;
}
export function PrHoverCard({ children }) {
  return children;
}

// Whether toggleDiff would open the primary row's diff (YL's tile layout test; main.jsx: the Changes pane is not open).
export const RailDiffOpenHasChordContext = createContext(false);

/**
 * c96d752d0 YL (memo): one rail list item, `li.flex.flex-col` (hidden while folded below Show more) around its render
 * prop, which it calls with diffOpenHasChord. The original reads the tile store for that answer: only the primary row,
 * and only while toggleDiff would open its diff (no diff tile is the visible one). The host stand-in provides it.
 */
export function RailPrListItem({ primary, hidden, children }) {
  const chord = useContext(RailDiffOpenHasChordContext);
  return <li className="flex flex-col" hidden={hidden}>{children(primary === true && chord === true)}</li>;
}

// ---- host stand-in for the rail PR bar --------------------------------------------------------------------------------

// The props c96d752d0 EL's rail branch gives Ike for one repo without a pull request, from the local git status
// ({ isRepo, cwd, repoName, branch, hasChanges, added, removed, comparison }, git-status.cjs workspaceGitStatus).
// - shown: cMe(pr, stats, branchPushed, localTree) with no PR and a local working tree, i.e. the stats' hasChanges
//   (Zje's row gate; no dismiss in this host).
// - diff: Zje `Zt`, only when the diff can open and the counts are known and non-zero (`? { added: Yt, removed: Xt }`).
// - branchTitle: Zje `Rn = i.currentBranch || i.branch` (the ⋮ menu's "More options for {title}").
// - repoName: Sje hides it for a single repo (`hideRepo: n || (w === "rail" && de.length <= 1)`); else the repo name or
//   the folder's basename (Ike then labels its ⋮ "More options for {repo} on {branch}", C2-2).
// - baseBranch: EL `he || (n === void 0 && x === C) ? void 0 : x` (only the stacked layout shows it).
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

// The PR states EL knows (kke's keys; Hje's prState, jc's answer without "none"). git-pull-request.cjs prState answers
// the same names from gh.
const PR_STATES = new Set(["open", "draft", "approved", "changesRequested", "conflicting", "merged", "closed", "queued"]);
// The CI states EL's CL / wL know (Zje `vn`: the PR's ciState). git-pull-request.cjs ciStatus answers failed / pending /
// skipped / passed, or nothing without checks.
const CI_STATES = new Set(["failed", "passed", "pending", "loading", "skipped", "unavailable"]);
const CREATE_MODES = new Set(["create", "draft", "compose"]);

/**
 * Hje's rail entries (pinned in the manifest's Hje call site) for the session's one repository, over the host:
 * `[{rowKey, primary, history, facts: {prState, ciStatus}, row}]`, or [] when cMe hides the row. Officially an entry's
 * row is `{key, repo, repoState}` and renderRow (Sje's TR -> Zje) turns it into EL's props; here `row` already holds
 * those props (Zje's rail EL props) and SessionRailChanges' renderRow spreads them. The branch's other pull requests
 * (Hje's history rows) and stacked parent branches have no host source: the lookup answers the branch's own pull
 * request only.
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
  // cMe(V, stats, …): a PR keeps the row; else the branch stats' hasChanges.
  if (!prBarRowShown(V ?? undefined, { hasChanges: status.hasChanges === true }, undefined, true)) return [];
  const ye = V && PR_STATES.has(V.state) ? V.state : undefined;
  // Zje `vt = !N && V ? "commit" : hMe(N, gt, _t)`: a PR is view / merged / queued; without one the host keeps the band's
  // order (git-rail-model pullRequestAction: Create PR once the tree is committed, else Commit).
  const create = !V && prAction && CREATE_MODES.has(prAction.mode) ? prAction : null;
  const Wt = V ? prBarMode(V, "create", false) : create ? create.mode : "commit";
  const commit = Wt === "commit";
  const added = Number.isFinite(status.added) ? status.added : undefined;
  const removed = Number.isFinite(status.removed) ? status.removed : undefined;
  // Zje `Zt`: counts only when the diff can open and something changed.
  const _n = diffOpenable && added !== undefined && removed !== undefined && (added > 0 || removed > 0) ? { added, removed } : undefined;
  const Gn = status.currentBranch || status.branch || undefined;
  const busy = commit ? verb?.busy === true : create ? create.busy === true : false;
  const disabled = commit ? verb?.disabled === true : create ? !!create.disabledReason : false;
  const reason = commit ? verb?.disabledReason : create?.disabledReason;
  // Zje's prMenuItems (no PR, not commit mode): the create-mode radio items; Create / Create draft select and fire, Manually
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
    // Zje `qn = N ? Rt : void 0` (the link's click report). Host: the window refuses new windows (main.cjs
    // setWindowOpenHandler deny), so this is where the PR opens in the browser; Bke calls it before "Open on {host}".
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
 * The rail's Changes card content (cf74bc599's Changes card `pullRequests`), Sje's rail branch: `lL.Provider value
 * "rail"` around `nav[aria-label="Repository and pull request controls"].lje` holding bAe over the entries' shape (mAe),
 * with vAe's Show more / history state, the announcement, gke reporting the PR count to the card ("{count} pull
 * requests"), and renderRow: Sje's TR, i.e. Zje's `f(EL, { ...or, layout: "rail", diffOpenHasChord: A })`, which YL
 * (RailPrListItem) calls with the chord. It must render inside the card's providers: the row layout context
 * (session-rail-kit ChangesRowLayoutContext) is "row" in the flat rail (D10), which selects Ike's `data-rail-changes-row`
 * branch for a row without a PR link; a PR row is Ike's link layout.
 *
 * Sje renders nothing without a repository; otherwise the nav is there and stays empty (so the card's
 * `has-[nav:not(:empty)]:flex` keeps it hidden) until a row shows. See railPrEntries for the other props. Sje's band
 * fold props (fold / rowsBelow / onFoldableCountChange, panes:C2-4) do not reach the rail branch.
 */
export function SessionRailChanges({ status, pr = null, prAction = null, diffOpenable = false, onOpenChanges, onToggleChanges,
  diffOpenHasChord = false, verb = null, warning, hint, hideRepo = true, onOpenPr }) {
  const intl = useIntl();
  // Zje `In = x && Nn ? f(Oge, { cause: Nn, onRunInTerminal: qe }) : void 0` (c96d752d0; Oge = c219730b0 ni): the
  // GitHub CLI hint on the row (EL prStatusHint). Host: `hint` is the band's {cause, onInstall, onRunInTerminal}
  // (git-rail-model prStatusHint over the local gh lookup, only while Create PR is on offer), rendered by the band's own
  // GhHint; the session has one repository, so the hinted row (Zje `showGithubStatusHint: x`) is that one.
  const hintNode = React.useMemo(() => hint?.cause
    ? <GhHint cause={hint.cause} onRunInTerminal={hint.onRunInTerminal ?? null} onInstall={hint.onInstall ?? null} />
    : undefined, [hint?.cause, hint?.onRunInTerminal, hint?.onInstall]);
  const entries = railPrEntries({ intl, status, pr, prAction, verb, diffOpenable, hideRepo, onOpenChanges, onToggleChanges,
    diffOpenHasChord, warning, hint: hintNode, onOpenPr });
  // Sje `ze = mAe(t)` over the reported entries (rebuilt here every render, as the host has no row reports to hold).
  const ze = railRowsShape(entries);
  const Be = useRailRowsControls(ze);
  const { announcement: Ve } = useAnnouncement();
  useReportRailPrCount(status?.isRepo ? ze.prCount : null);
  if (!status?.isRepo) return null;
  return <PrBarLayoutContext.Provider value="rail">
    <RailDiffOpenHasChordContext.Provider value={diffOpenHasChord === true}>
      <nav aria-label={intl.formatMessage({ defaultMessage: "Repository and pull request controls", id: "NHI5eIky7V" })}
        className={RAIL_PR_BAR_NAV_CLASS}>
        <RailPrRows shape={ze} controls={Be} announcement={Ve} renderRow={railPrRow} />
      </nav>
    </RailDiffOpenHasChordContext.Provider>
  </PrBarLayoutContext.Provider>;
}

// Sje's renderRow (`St = (e, t) => f(TR, { …, railRowKey: n, railDiffOpenHasChord: t })` -> Zje's rail EL): the entry's
// EL props with layout "rail" and the chord YL hands over.
export function railPrRow(entry, diffOpenHasChord) {
  return <PrBarRow {...entry.row} layout="rail" diffOpenHasChord={diffOpenHasChord} />;
}
