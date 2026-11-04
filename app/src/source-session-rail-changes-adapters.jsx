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
  repoRowId, repoRowIdKey, PrBarStaleRow, PR_BAR_ROWS_CLASS, PR_BAR_HOLD_CLASS } from "./generated/session-rail-changes/pr-rows.mjs";
import { prBarRowSnapshot } from "./generated/session-rail-changes/pr-bar-snapshot.mjs";
import { BRANCH_ROW_GHOST_ATTR } from "./generated/session-rail-changes/branch-row-ghost.mjs";
import { renderMenuItems } from "./generated/session-rail/menu-items.mjs";
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

// W14-code r8 R8DC-04: the test-only railChangesRowProps (Ike's no-PR props) is gone; the rail's rows are railPrEntries /
// railPrRow (Zje's rail EL props) and the band's bandPrRowProps.

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
      separatorBefore: true, disabled: !create.repo, onSelect: () => create.onSelectMode?.("compose") }, // c96d752d0 Zje `bt = !i.repo`
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

// ---- the composer band (W14-code r7 css7-git-band-prbarrow) ----------------------------------------------------------

// Sje's band branch (c96d752d0, `w = r === void 0 ? "band" : r`): `lL.Provider value "band"` around
// `nav[aria-label="Repository and pull request controls"].flex.flex-col.has-[>*:empty]:hidden.gap-xs > div.{nR}.gap-xs`
// holding, per repo, Zje's `!O && (T ? W && T.has(n) : dt) && f(EL, { order: T?.get(n), ...or })` — the same EL as the rail
// row, without layout "rail", so EL draws its band layout (repo chip dL with the repo menu, branch chip gL, behind, counts,
// CI, the GitHub CLI hint, the mode verb or split button). The host's one repository is the session folder; `or` comes
// from railPrEntries (the rail's EL props over the same local data) plus Zje's band-only props: repoTooltip
// `Zn = i.repo || i.cwd`, repoMenu `st` (mke over the repo menu items, host: source-session-rail.jsx railRepoMenuItems,
// the Vz port), branchMenuItems `ut = [Open in terminal]`, branchUrl `$n` and behind `pn` (git-rail-model
// behindIndicator: {count, tooltip}). Sje hides a single repo's name only in the rail (`w === "rail" && de.length <= 1`).
// onMeasured reports the live band's height, which the stale hold below reserves.
export function bandPrRowProps({ intl, status, pr = null, prAction = null, verb = null, onOpenChanges, onToggleChanges, warning, hint,
  onOpenPr, repoMenuItems, branchMenuItems, branchUrl, behind } = {}) {
  const [entry] = railPrEntries({ intl, status, pr, prAction, verb, diffOpenable: !!(onOpenChanges || onToggleChanges), hideRepo: false,
    onOpenChanges, onToggleChanges, warning, hint, onOpenPr });
  if (!entry) return null;
  // repoMenuItems: the items, or (intl) => items (railRepoMenuItems reads the intl).
  const repoItems = typeof repoMenuItems === "function" ? repoMenuItems(intl) : repoMenuItems;
  return {
    ...entry.row,
    repoTooltip: status.repo || status.cwd || undefined,
    repoMenu: repoItems?.length ? renderMenuItems(repoItems) : undefined,
    branchMenuItems: branchMenuItems?.length ? branchMenuItems : undefined,
    branchUrl: branchUrl || undefined,
    behind: behind && Number.isFinite(behind.count) && behind.count > 0 && behind.tooltip ? { count: behind.count, tooltip: behind.tooltip } : undefined,
  };
}
export function SessionBandChanges({ status, pr = null, prAction = null, verb = null, onOpenChanges, onToggleChanges, warning, hint = null, onOpenPr,
  repoMenuItems, branchMenuItems, branchUrl, behind, dismissReserved, onMeasured }) {
  const intl = useIntl();
  const nav = React.useRef(null);
  const hintNode = React.useMemo(() => hint?.cause
    ? <GhHint cause={hint.cause} onRunInTerminal={hint.onRunInTerminal ?? null} onInstall={hint.onInstall ?? null} />
    : undefined, [hint?.cause, hint?.onRunInTerminal, hint?.onInstall]);
  const row = bandPrRowProps({ intl, status, pr, prAction, verb, onOpenChanges, onToggleChanges, warning, hint: hintNode, onOpenPr,
    repoMenuItems, branchMenuItems, branchUrl, behind });
  const shown = !!row;
  React.useEffect(() => {
    const node = nav.current;
    if (!shown || !node || !onMeasured || typeof ResizeObserver !== "function") return undefined;
    const report = () => onMeasured(Math.round(node.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, onMeasured]);
  if (!status?.isRepo) return null;
  return <PrBarLayoutContext.Provider value="band">
    <nav ref={nav} aria-label={intl.formatMessage({ defaultMessage: "Repository and pull request controls", id: "NHI5eIky7V" })}
      className="flex flex-col has-[>*:empty]:hidden gap-xs">
      {/* Zje `dismissReserved: ue` (EL's aspect-square w-control spacer when another row of the bar can be dismissed). */}
      <div className={`${PR_BAR_ROWS_CLASS} gap-xs`}>{row && <PrBarRow {...row} dismissReserved={dismissReserved} />}</div>
    </nav>
  </PrBarLayoutContext.Provider>;
}

// The stale hold (Sje with gje's hold `ct`): while a revisited session's status loads, its last band row is shown from its
// snapshot — Zje's `wm({id, prState, prNumber, prUrl, repoName, hideRepo, branchName, diff, comments, ci, prMode, chooser,
// dismissable})` (c03935b01 An, pr-bar-snapshot.mjs) — as sAe's aAe (PrBarStaleRow: data-prbar-stale, aria-hidden, inert,
// pointer-events-none opacity-60), in `div[data-epitaxy-branch-row-ghost].{vje}.gap-xs` of the remembered height, inside
// the nav (aria-hidden while no live row is held: `bt = ct && ct.liveOrder.size === 0`; no has-[>*:empty]:hidden).
// The host remembers the status the band last drew (main.jsx gitBandMemo) and its height; nothing about the PR is held.
export function bandHoldSnapshot(status, { verbShown = true } = {}) {
  if (!status?.isRepo) return null;
  const repoName = status.repoName || (status.cwd ? status.cwd.split(/[\\/]/).filter(Boolean).pop() : "") || "";
  const branchName = status.currentBranch || status.branch || "";
  const added = Number.isFinite(status.added) ? status.added : undefined, removed = Number.isFinite(status.removed) ? status.removed : undefined;
  return prBarRowSnapshot({ id: repoRowId({ cwd: status.cwd, repo: repoName, branch: branchName }, null), prState: undefined, prNumber: undefined,
    prUrl: undefined, repoName, hideRepo: false, branchName, diff: added !== undefined && removed !== undefined && (added > 0 || removed > 0) ? { added, removed } : undefined,
    comments: undefined, ci: false, prMode: verbShown ? "commit" : "none", chooser: false, dismissable: false });
}
export function SessionBandHold({ status, heightPx, verbShown = true }) {
  const intl = useIntl();
  const row = bandHoldSnapshot(status, { verbShown });
  if (!row) return null;
  return <PrBarLayoutContext.Provider value="band">
    <nav aria-label={intl.formatMessage({ defaultMessage: "Repository and pull request controls", id: "NHI5eIky7V" })} aria-hidden={true}
      className="flex flex-col  gap-xs">
      <div {...{ [BRANCH_ROW_GHOST_ATTR]: "" }} className={`${PR_BAR_HOLD_CLASS} gap-xs`}
        style={{ height: Number.isFinite(heightPx) && heightPx > 0 ? heightPx : undefined }}>
        <PrBarStaleRow row={row} order={1} />
      </div>
    </nav>
  </PrBarLayoutContext.Provider>;
}
