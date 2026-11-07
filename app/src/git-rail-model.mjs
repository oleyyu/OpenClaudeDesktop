import { t, tn } from "../electron/i18n/index.mjs";
import { pathBasename } from "./host-path-model.mjs";

// Pure model for the rail layout of the repository row (git-status-card.js Ii
// rail branch 1128-1200, Zi 1633-1760, $i/ea 1762-1865, na 1867-2075, rs
// 4051-4058, prMode 4711/4912). No DOM, no git: it only decides which facts a
// local session may honestly show.

export const COMMIT_TURN_TEXT = "Commit the working tree changes with a sensible message.";
export const COMMIT_CLEAN_REASON = t("No changes to commit");
// "DeepSeek" is the assistant-as-actor word t() rewrites to the running core's assistant ("Codex", "GLM", …).
export const COMMIT_RESPONDING_REASON = t("DeepSeek is working \u2014 wait for the turn to finish");

/** cc/lc (5590-5600) + reasons 4930-4960 for a local commit-mode session: the
 * action is disabled while the session responds or when the working tree is
 * clean (Sn = lc(xn, X, Qe), Qe = shared-16 wu isWorkingTreeDirty — not the
 * branch stats, which keep the row visible after a commit); the reason exists
 * only while disabled and prBusy never comes from a commit turn. */
export function commitAction(status, { responding = false } = {}) {
  const dirty = status?.workingTreeDirty === true;
  const disabled = !dirty || responding;
  const disabledReason = !dirty ? COMMIT_CLEAN_REASON : responding ? COMMIT_RESPONDING_REASON : undefined;
  // c219730b0 gn.commit (SLe default branch → ix[prMode]): the band's commit-mode verb is "Commit changes".
  return { label: t("Commit changes"), text: COMMIT_TURN_TEXT, disabled, disabledReason };
}

/** cc70f2bdf-CILU7c4u.js Ko 2270-2385 + qo 2387-2394: the repo chip menu is
 * [open-in/reveal items] | [Copy path (+ Change directory…)] | [Open in terminal],
 * each non-empty group after the first starting with separatorBefore. The band
 * passes only cwd (git-status-card 4793 mr{cwd, …}, no branch), so the copy
 * group is the single "Copy path" row. Local capabilities: Finder reveal and
 * clipboard, and the terminal opener where the caller offers it (openTerminal);
 * there is no change-directory session ref, so that row stays absent. The reveal row is the shared reveal label
 * (c856385e2 wn → c18ab0d94 b(): "Show in Finder" on macOS, en-US LVY6c4L1SF). */
export function gitRepoMenuItems({ openFolder = true, copyPath = true, openTerminal = false } = {}) {
  // openTerminal: the last group's 'Open in terminal' (main.cjs open-terminal, the same opener as the sidebar's Open in).
  const groups = [openFolder ? [{ label: "Show in Finder" }] : [], copyPath ? [{ label: "Copy path" }] : [], openTerminal ? [{ label: "Open in terminal" }] : []];
  const items = [];
  for (const group of groups)
    group.forEach((item, index) => items.push(index === 0 && items.length > 0 ? { ...item, separatorBefore: true } : item));
  return items;
}

const basename = (value = "") => pathBasename(value) || value;
const isCount = (value) => Number.isFinite(value) && value >= 0;

/** `Oe = prMode === "commit" || prMode === "none"`: local-only presentation. */
export function isLocalOnly(prMode) {
  return prMode === "commit" || prMode === "none";
}

/** Collapsed badge ($i/ea + Xa): counted changes, uncounted "Changes", or "No changes". */
export function railSignal(status) {
  if (!status?.isRepo) return null;
  const counted = isCount(status.added) && isCount(status.removed) && (status.added > 0 || status.removed > 0);
  if (counted) return { kind: "changes", added: status.added, removed: status.removed };
  return status.hasChanges ? { kind: "uncounted", text: t("Changes") } : { kind: "clean", text: t("No changes") };
}

/** cd5a31703 ORe (:36446): behind is only meaningful for a live checkout on a branch other than
 * its base, with a positive behind count (c5da7eb42 `behind_by > 0 ? {behind:{count, base}}`). The tooltip
 * is 3nAhFAuOAD "{count, plural, one {# commit} other {# commits}} behind {base}". */
export function behindIndicator(comparison, branch) {
  if (!comparison || comparison.same || !comparison.base) return null;
  if (!branch || branch === comparison.base) return null;
  if (!isCount(comparison.behind) || comparison.behind <= 0) return null;
  const count = comparison.behind;
  return { count, base: comparison.base, tooltip: tn(count, "{count} commit behind {base}", "{count} commits behind {base}", { base: comparison.base }) };
}

/** Ii rail branch: `baseBranch: Oe || (c === undefined && A === j) ? undefined : A`. */
export function visibleBaseBranch({ prMode, prState, baseBranch, branch }) {
  if (isLocalOnly(prMode)) return undefined;
  if (prState === undefined && baseBranch === branch) return undefined;
  return baseBranch || undefined;
}

/** Facts group (na): Repository only with a PR link, Status only for PR states,
 * Base branch only when visible, Changes when counted. Gates/automation stay
 * empty without GitHub data. */
export function buildGitRailModel({ status, comparison = null, prMode = "commit", prState, hideRepo = false, prLink = null, responding = false }) {
  if (!status?.isRepo) return { visible: false, facts: [], gates: [], automation: [], signal: null, action: null };
  const repoName = status.repoName || basename(status.cwd);
  const branch = status.branch || status.head || "HEAD";
  const signal = railSignal(status);
  const behind = behindIndicator(comparison, status.detached ? null : status.branch);
  const baseBranch = visibleBaseBranch({ prMode, prState, baseBranch: comparison?.base, branch: status.branch });
  const facts = [];
  if (prLink && !hideRepo) facts.push({ key: "repository", label: t("Repository"), value: repoName });
  if (baseBranch) {
    facts.push({ key: "base", label: t("Base branch"), hint: t("A pull request from this branch merges into {branch}.", { branch: baseBranch }),
      hintDetail: behind?.tooltip, value: behind ? t("{branch} · {count} behind", { branch: baseBranch, count: behind.count }) : baseBranch });
  }
  if (signal?.kind === "changes") {
    facts.push({ key: "changes", label: t("Changes"), added: signal.added, removed: signal.removed, action: t("View changes"),
      hint: t("View changes"), hintDetail: baseBranch ? t("Lines added and removed compared with {branch}.", { branch: baseBranch }) : t("Lines added and removed on this branch.") });
  }
  const action = prMode === "commit" ? commitAction(status, { responding }) : null;
  return {
    visible: status.hasChanges === true,
    title: hideRepo ? branch : `${repoName} · ${branch}`,
    glyphLabel: t("Branch"),
    signal, behind, baseBranch, facts, gates: [], automation: [], action,
  };
}

/** Placeholder reservation (c936fcd42 Wi/Gi/Ki/qi): remembered px capped at
 * 360 with max(1, round(px / 28)) rows; otherwise 4 rows (5 with a PR) at
 * 28px each plus 4px gaps when this checkout showed a row before. */
export function railReservation({ remembered, checkoutHadRow = false, hasPr = false }) {
  if (Number.isFinite(remembered) && remembered > 0) {
    const heightPx = Math.min(Math.round(remembered), 360);
    return { heightPx, rows: Math.max(1, Math.round(heightPx / 28)), source: "memory" };
  }
  if (!checkoutHadRow) return { heightPx: 0, rows: 0, source: "none" };
  const rows = hasPr ? 5 : 4;
  return { heightPx: Math.min(rows * 28 + (rows - 1) * 4, 360), rows, source: "checkout" };
}

// Pull requests (git-status-card.js:4711 prMode 'create' for a repository with a GitHub origin; :4985-5020 the split
// button 'Create PR' / 'Create draft PR' / 'Manually create PR', approval-shared :10963-10980 compose mode). Create
// sends the agent a fixed turn, as Commit does; Manually create PR opens GitHub's compare page.
export const CREATE_PR_TURN_TEXT = "Push this branch to GitHub and open a pull request for it with `gh pr create`, with a clear title and a description of the changes.";
export const CREATE_DRAFT_PR_TURN_TEXT = "Push this branch to GitHub and open a draft pull request for it with `gh pr create --draft`, with a clear title and a description of the changes.";
const GITHUB_HOST = /^(?:www\.)?github\.com$/i;

/** ca80fca8d xB/SB (:21028-21032): the split button's remembered mode, one app-wide key, default "create". */
export const PR_CREATE_MODE_KEY = "epitaxy-pr-create-mode";
export const PR_CREATE_MODES = Object.freeze(["create", "draft", "compose"]);
export function readPrCreateMode(storage) {
  try {
    const value = storage?.getItem?.(PR_CREATE_MODE_KEY);
    return PR_CREATE_MODES.includes(value) ? value : "create";
  } catch { return "create"; }
}
export function writePrCreateMode(storage, mode) {
  if (!PR_CREATE_MODES.includes(mode)) return;
  try { storage?.setItem?.(PR_CREATE_MODE_KEY, mode); } catch { /* private window, blocked storage */ }
}
/** ca80fca8d CB (:21033-21035): compose needs a GitHub repository; without one the mode reads as create. */
export function effectivePrCreateMode(mode, hasRepo) {
  const known = PR_CREATE_MODES.includes(mode) ? mode : "create";
  return known === "compose" && !hasRepo ? "create" : known;
}

/** c219730b0 gn (:983-991) through cd5a31703 SLe (:33477-33489): the primary label of each band mode. */
export function prModeLabel(mode) {
  switch (mode) {
    case "create": return t("Create PR");
    case "draft": return t("Create draft PR");
    case "compose": return t("Manually create PR");
    case "commit": return t("Commit changes");
    case "view": return t("View PR");
    case "merged": return t("Merged");
    case "queued": return t("Queued");
    default: return "";
  }
}
/** cd5a31703 PB (:33491-33501) with c219730b0 _n: the busy label while a PR is being created. */
export function prBusyLabel(mode) {
  return mode === "create" || mode === "draft" || mode === "compose" ? t("Creating PR…") : undefined;
}

/** cd5a31703 bze (:38049-38059): an existing PR puts the band in merged / queued / view mode, else the create mode. */
export function bandPrMode(pr, createMode) {
  if (pr) return pr.state === "merged" ? "merged" : pr.state === "queued" ? "queued" : "view";
  return createMode;
}

/** shared-18 jw/Mw: the PR state's name (state glyph tooltip, Action Center pills). */
export function prStateLabel(state) {
  switch (state) {
    case "open": return t("Open");
    case "draft": return t("Draft");
    case "approved": return t("Approved");
    case "changesRequested": return t("Changes requested");
    case "conflicting": return t("Merge conflicts");
    case "queued": return t("Queued");
    case "merged": return t("Merged");
    case "closed": return t("Closed");
    default: return t("No pull request");
  }
}
/** cd5a31703 AB/bLe (:33408-33426): the state glyph and its git tint; xLe: merged/queued tint the whole row. */
export const PR_STATE_GLYPHS = Object.freeze({
  open: { icon: "GitPullRequest", tint: "opened" },
  draft: { icon: "GitPullRequestDraft", tint: "draft" },
  merged: { icon: "GitMergedSimple", tint: "merged" },
  closed: { icon: "GitPullRequestClosed", tint: "closed" },
  approved: { icon: "CheckCircle", tint: "opened" },
  changesRequested: { icon: "XCircle", tint: "closed" },
  conflicting: { icon: "GitMergeConflict", tint: "conflicting" },
  queued: { icon: "GitMergeQueue", tint: "queued" },
});
export const PR_ROW_ACCENT = Object.freeze({ merged: "purple", queued: "yellow" });
/** cd5a31703 NB (:33447-33476): the CI glyph's accessible name. */
export function ciStatusLabel(status) {
  switch (status) {
    case "failed": return t("CI: checks failing");
    case "passed": return t("CI: all checks passed");
    case "loading": case "pending": return t("CI: checks in progress");
    case "skipped": return t("CI: all checks skipped");
    case "unavailable": return t("CI: status unavailable");
    default: return undefined;
  }
}

/**
 * The branch's PR for the band: the GitHub CLI lookup (main.cjs workspace-pull-request) when it answered, else the
 * PR the core bound to the session (codeDesktop.pr), which only says the PR exists and is open.
 * @param {{lookup?: {status: string, pr?: object, branch?: string}|null, branch?: string|null, sessionPr?: object|null}} input
 */
export function branchPullRequest({ lookup = null, branch = null, sessionPr = null } = {}) {
  const current = lookup && (!branch || !lookup.branch || lookup.branch === branch) ? lookup : null;
  if (current?.status === "found" && current.pr) return current.pr;
  if (current?.status === "none") return null;
  const url = typeof sessionPr?.url === "string" && /^https:\/\//i.test(sessionPr.url) ? sessionPr.url : null;
  const number = Number(sessionPr?.number ?? /\/pull\/(\d+)(?:[/?#]|$)/.exec(url ?? "")?.[1]);
  if (!url || !Number.isInteger(number) || number <= 0) return null;
  return { number, url, state: "open", title: typeof sessionPr.title === "string" ? sessionPr.title : null, ci: undefined, checks: null, fromSession: true };
}

/** c219730b0 an() local arm (:780-797): a missing or signed-out GitHub CLI, only while Create PR is on offer. */
export function prStatusHint({ lookup = null, createOffered = false } = {}) {
  if (!createOffered) return null;
  return lookup?.status === "missing" ? "gh_unavailable" : lookup?.status === "auth" ? "gh_signed_out" : null;
}
/** cd5a31703 U/ee = sze(R, U.kind) (:37063-37068, sze :37920-37955): a failed GitHub CLI lookup's warning glyph text.
 * c5da7eb42 gO (:12470-12490) keeps no warning for a missing CLI or a notFound answer. */
export function prStatusWarning(lookup) {
  if (lookup?.status !== "error" && lookup?.status !== "auth") return undefined;
  switch (lookup.kind ?? (lookup.status === "auth" ? "auth" : "unknown")) {
    case "rateLimit": return t("GitHub API rate limit reached. Pull request status may be out of date until the limit resets.");
    case "auth": return t("GitHub CLI authentication expired. Run gh auth login to refresh pull request status.");
    case "sso": return t("GitHub CLI isn’t authorized for this organization’s single sign-on. Run gh auth refresh and authorize the organization. If this warning stays, restart the app.");
    case "network": return t("GitHub is unreachable. Pull request status may be out of date.");
    case "notFound": return undefined;
    default: return t("Pull request status couldn’t be checked and may be out of date.");
  }
}

/** c219730b0 sn/cn/ln/be.ghAuthLogin (:798-840): the hint card's trigger, body, link and command. */
export const GH_INSTALL_URL = "https://cli.github.com";
export const GH_AUTH_LOGIN = "gh auth login";
export function prStatusHintText(cause) {
  return cause === "gh_unavailable"
    ? { trigger: t("GitHub CLI unavailable"), body: t("Set up the GitHub CLI to see existing pull requests, CI status, and auto-fix for this branch.") }
    : cause === "gh_signed_out"
      ? { trigger: t("GitHub CLI signed out"), body: t("Sign in to the GitHub CLI to see existing pull requests, CI status, and auto-fix for this branch.") }
      : null;
}

/** The repository's GitHub web URL from the folder identity, or null for another host or no origin. */
export function githubRepoUrl(identity) {
  if (!identity?.owner || !identity?.name || !GITHUB_HOST.test(String(identity.host ?? ""))) return null;
  return `https://github.com/${identity.owner.split("/").map(encodeURIComponent).join("/")}/${encodeURIComponent(identity.name)}`;
}
/** c0a531389 T + c4008a6e7 (branchOnGitHub): "Open branch on GitHub" for a branch that exists on origin. */
export function githubBranchUrl(identity, status) {
  const repo = githubRepoUrl(identity);
  if (!repo || !status?.branch || status.detached || !Number.isFinite(status.comparison?.unpushed)) return null;
  return `${repo}/tree/${status.branch.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The band's pull request action for a session's checkout, or null when it doesn't apply (no GitHub origin, a
 * detached HEAD, uncommitted changes, which Commit handles first, or a PR that already exists — cd5a31703 Te is null
 * in view/merged/queued mode).
 * @param {{status: object|null, identity: {host?: string, owner?: string, name?: string}|null, responding?: boolean,
 *   lookup?: {status: string}|null, pr?: object|null, mode?: string}} input
 * @returns {{mode: string, label: string, busyLabel?: string, disabledReason?: string, manualUrl: string|null,
 *   manualDisabledReason?: string, hint: string|null}|null}
 */
export function pullRequestAction({ status, identity, responding = false, lookup = null, pr = null, mode = "create" }) {
  if (!status?.isRepo || status.detached || !status.branch || status.workingTreeDirty) return null;
  if (!githubRepoUrl(identity)) return null;
  if (pr) return null;
  const compared = status.comparison ?? null;
  const base = compared?.base || null;
  const onBase = !!(compared?.same || (base && base === status.branch));
  const nothing = compared?.ahead === 0;
  const pushed = Number.isFinite(compared?.unpushed);
  const manualUrl = base ? `${githubRepoUrl(identity)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(status.branch)}?expand=1` : null;
  const manualDisabledReason = !pushed ? t("Branch hasn’t been pushed to GitHub") : !manualUrl ? t("Add a GitHub remote to create a pull request") : undefined;
  const selected = effectivePrCreateMode(mode, true);
  // cd5a31703 Sn (:37385-37430): base branch, nothing to PR, then 'Checking for an existing pull request' while the
  // lookup runs, then the responding turn. The split button (shared-frame jO) disables primary and caret together.
  // Manually create PR is not disabled for an unpushed branch: firing it reports that (ca80fca8d PB compose, bB).
  const disabledReason = onBase ? t("Already on the base branch — check out a feature branch first")
    : nothing ? t("No changes to create a PR from")
    : lookup?.status === "pending" ? t("Checking for an existing pull request")
    : responding ? COMMIT_RESPONDING_REASON : undefined;
  return { mode: selected, label: prModeLabel(selected), busyLabel: prBusyLabel(selected),
    ...(disabledReason ? { disabledReason } : {}), manualUrl, ...(manualDisabledReason ? { manualDisabledReason } : {}),
    hint: prStatusHint({ lookup, createOffered: !onBase && !nothing }) };
}
