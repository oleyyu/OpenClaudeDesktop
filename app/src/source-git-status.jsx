import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceMenu } from "./source-menu.jsx";
import { SourceTooltip, textOverflows } from "./source-tooltip.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { GitCounts } from "./source-git-counts.jsx";
import { SourcePopover, SourcePopoverTitle } from "./source-popover.jsx";
import { gitRepoMenuItems, prStateLabel, ciStatusLabel, PR_STATE_GLYPHS, PR_ROW_ACCENT, prModeLabel, prStatusHintText, GH_INSTALL_URL, GH_AUTH_LOGIN } from "./git-rail-model.mjs";
import "./source-git-status.css";
import { t } from "../electron/i18n/index.mjs";

const basename = (path = "") => path.split("/").filter(Boolean).pop() || path;
// cfb0234e3 m/g: the #number link's tooltip "Open on {host}", github.com named "GitHub".
const prHost = (url) => { try { const host = new URL(url).hostname; return host === "github.com" ? "GitHub" : host; } catch { return "GitHub"; } };

/** Current c819d4a78-DmjxkWNN Ii, neutral band (non-rail) repository row.
 * Only verified local state is rendered. The action is the real Commit turn
 * supplied by the integration layer, or the Create PR split button; an existing
 * PR (prView: the local `gh` lookup, cd5a31703 FB/bze) shows its state glyph,
 * #number link and CI glyph. Review-comment, merge and auto-fix slots stay absent.
 *
 * prMode: every local session without a forge repo is `commit` (git-status-card
 * 4711/4912), so the repo chip has no 160px bound and no base is shown.
 * behind/showBehind: the official behind indicator (cd5a31703 FB :33894-33908, ArrowDown + count in a
 * multiline tooltip). 2.31226 ships its copy (ORe :36446, 3nAhFAuOAD "{count} commits behind {base}") behind
 * Mee (the desktop git engine), so the band passes showBehind with git-rail-model behindIndicator (B34).
 * dismissReserved: the aspect-square w-control spacer when dismiss is absent.
 * busy: official prBusy (PR creation only; a commit turn never sets it). The
 * disabled reason is shown only while disabled (Ii 1092 `reason: he ? L : void 0`).
 *
 * Hints are CDS tooltips, never native titles: repo chip = git-chips D 46-96
 * (tooltip `repo || cwd` from git-status-card 5231, only when it differs from
 * the chip label, forced closed while the chip menu is open); branch chip = M
 * 97-221 (full name only when the head/tail label is truncated, closed while
 * its menu is open); behind = multiline K (1270-1292); counts = K 'View
 * changes' (1296-1318); disabled Commit = Fe/shared-frame Pu (1085-1119,
 * 4869-4895: multiline, closeOnClick false, hidden described reason).
 * The repo menu follows cc70f2bdf Ko/qo (gitRepoMenuItems); copies report
 * through onCopyPath/onCopyBranch, whose caller raises the success toast.
 *
 * F12: the counts and Commit are CDS secondary Buttons (git-status-card
 * 1081-1122 / 1287-1305 render H without a variant = shared-frame :2815 "secondary");
 * the counts are OV GitCounts (sr-only "N additions, M deletions", the tooltip
 * stays "View changes"); the chip menus are Popups side bottom / align start
 * (git-chips 48/83 menuAlign "start"). `stale` renders the inert last snapshot
 * of a revisited session (git-status-card 2816-2962 Na, git-pr-slot 5834-5990);
 * onMeasured reports the live band height for that hold.
 */
export function SourceGitStatus({
  status, onOpenFolder, onCopyPath, onCopyBranch, onOpenChanges, onDismiss, dismissReserved = false,
  onAction, actionLabel, actionDisabled = false, actionDisabledReason, busy = false,
  prMode = "commit", behind = null, showBehind = false, stale = false, heightPx, onMeasured, pr = null,
  prView = null, prHint = null, prWarning, branchUrl = null, onOpenBranch, onOpenTerminal,
}) {
  const [menu, setMenu] = useState(null);
  const branchHead = useRef(null), branchTail = useRef(null), nav = useRef(null);
  // cd5a31703 pze (:38019): an existing PR keeps the row even without branch changes.
  const visible = !!status?.isRepo && (!!status.hasChanges || !!prView);
  useEffect(() => {
    if (!visible || stale || !onMeasured || !nav.current || typeof ResizeObserver !== "function") return undefined;
    const node = nav.current;
    const report = () => onMeasured(Math.round(node.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, stale, onMeasured]);
  if (!visible) return null;
  const localOnly = prMode === "commit" || prMode === "none";
  const repoName = status.repoName || basename(status.cwd);
  const branch = status.branch || status.head || "HEAD";
  const added = status.added, removed = status.removed;
  const counted = Number.isFinite(added) && Number.isFinite(removed) && (added > 0 || removed > 0);
  if (stale) return <SourceGitStatusStale repoName={repoName} branch={branch} localOnly={localOnly}
    counts={counted ? { added, removed } : null} actionLabel={onAction ? actionLabel : undefined} heightPx={heightPx} />;
  const behindShown = showBehind && behind && Number.isFinite(behind.count) && behind.count > 0
    && typeof behind.tooltip === "string" && behind.tooltip;
  const split = Array.from(branch).length >= 16
    ? { head: Array.from(branch).slice(0, -10).join(""), tail: Array.from(branch).slice(-10).join("") }
    : null;
  const open = (kind) => (event) => {
    event.preventDefault();
    setMenu({ kind, anchor: event.currentTarget });
  };
  const run = (callback, value) => {
    setMenu(null);
    callback?.(value);
  };
  // cd5a31703 Hle/vt (:37155-37190): the repo menu's last group is Open in terminal (bt, separatorBefore).
  const repoMenu = gitRepoMenuItems({ openFolder: !!onOpenFolder, copyPath: !!onCopyPath, openTerminal: !!onOpenTerminal });
  const repoActions = { "Show in Finder": () => run(onOpenFolder, status.cwd), "Copy path": () => run(onCopyPath, status.cwd),
    "Open in terminal": () => run(onOpenTerminal, status.cwd) };
  // c0a531389 T K (:65-96): Copy branch name, Open branch on GitHub (a branch URL), then the band's extra branch
  // items xt = [Open in terminal] (cd5a31703 :37182-37190, separatorBefore).
  const branchMenu = [
    ...(onCopyBranch ? [{ key: "copy", label: t("Copy branch name"), run: () => run(onCopyBranch, branch) }] : []),
    ...(branchUrl && onOpenBranch ? [{ key: "github", label: t("Open branch on GitHub"), run: () => run(onOpenBranch, branchUrl) }] : []),
    ...(onOpenTerminal ? [{ key: "terminal", label: t("Open in terminal"), separatorBefore: true, run: () => run(onOpenTerminal, status.cwd) }] : []),
  ];
  // cd5a31703 FB (:33616-33702, 33827-33851): an existing PR leads the row with its state glyph and #number link;
  // xLe merged/queued tint the row (accent) and replace the trailing controls with the mode label.
  const glyph = prView ? PR_STATE_GLYPHS[prView.state] ?? PR_STATE_GLYPHS.open : null;
  const accent = prView ? PR_ROW_ACCENT[prView.state] : undefined;
  const stateLabel = prView ? prStateLabel(prView.state) : "";
  const ciLabel = prView && !accent ? ciStatusLabel(prView.ci) : undefined;
  // D: `S = t && t !== e ? t : void 0` with t = repo || cwd (no forge repo locally); FB ye (:33630) appends
  // `:{base}` outside commit mode, the base being the PR's baseRefName, else the session's (cd5a31703 yr :37689).
  const repoTip = status.cwd && status.cwd !== repoName ? status.cwd : undefined;
  const tooltipBase = localOnly ? undefined : prView?.baseRefName || status.comparison?.base || undefined;
  const repoTooltip = repoTip && tooltipBase ? `${repoTip}:${tooltipBase}` : repoTip;
  // M: V = A(N) || A(P) ? branchName : undefined, measured when the tooltip opens. c0a531389 T J/E (:150-156): with a
  // PR the branch chip's tooltip is the PR title (cd5a31703 pr = B?.title) and the branch name its detail line.
  const prTitleTip = prView?.title && prView.title !== branch ? prView.title : undefined;
  const branchTooltip = prTitleTip ?? (() => (textOverflows(branchHead.current) || textOverflows(branchTail.current) ? branch : undefined));
  // Ii 1296-1318: OV with `contents text-body-medium` inside the counts Button, `contents` in the static span.
  const counts = (className) => <GitCounts added={added} removed={removed} className={className} />;
  return <nav ref={nav} className="sg-status" aria-label={t("Repository and pull request controls")}>
    <div className="sg-row" data-source-component="GitStatusCard" data-pr-accent={accent}>
      <div className="sg-leading">
        {prView && <SourceTooltip content={stateLabel}>
          <span role="img" aria-label={stateLabel} className="sg-pr-state" data-tint={glyph.tint}><Icon name={glyph.icon} size={16} weight="strong" /></span>
        </SourceTooltip>}
        {prView && <SourceTooltip content={t("Open on {host}", { host: prHost(prView.url) })}>
          <a href={prView.url} target="_blank" rel="noopener" className="sg-pr-number" data-tint={glyph.tint} data-accent={accent ? "" : undefined}
            onClick={(event) => { event.preventDefault(); prView.onOpen?.(prView.url); }}><bdi>{t("#{number}", { number: prView.number })}</bdi></a>
        </SourceTooltip>}
        <div className="sg-checkout">
          {prView && <span aria-hidden="true" className="sg-pr-gap" />}
          <SourceTooltip content={repoTooltip} open={menu?.kind === "folder" ? false : undefined}>
            <button type="button" className="sg-button sg-repo" data-repo-chip={localOnly ? "unbounded" : "bounded"}
              aria-label={repoName} disabled={!repoMenu.length} aria-haspopup="menu"
              aria-expanded={menu?.kind === "folder"} onClick={open("folder")} onContextMenu={open("folder")}>
              <span>{repoName}</span>
            </button>
          </SourceTooltip>
          <SourceTooltip content={branchTooltip} detail={prTitleTip ? branch : undefined} open={menu?.kind === "branch" ? false : undefined}>
            <button type="button" className="sg-button sg-branch"
              aria-label={branch} disabled={!branchMenu.length} aria-haspopup="menu"
              aria-expanded={menu?.kind === "branch"} onClick={open("branch")} onContextMenu={open("branch")}>
              {split ? <span className="sg-branch-split" dir="ltr">
                <span ref={branchHead}>{split.head}</span><span ref={branchTail}>{split.tail}</span>
              </span> : <span ref={branchHead} dir="ltr">{branch}</span>}
            </button>
          </SourceTooltip>
        </div>
        <span className="sg-checkout-spacer" aria-hidden="true" />
      </div>
      {/* cd5a31703 FB :33857-33870: the GitHub CLI lookup warning (H), shown in every mode. */}
      {prWarning && <SourceTooltip multiline content={prWarning}>
        <span role="img" aria-label={prWarning} className="sg-pr-warning"><Icon name="Warning" size={16} /></span>
      </SourceTooltip>}
      {behindShown && !accent && <SourceTooltip multiline content={behind.tooltip}>
        <span role="img" aria-label={behind.tooltip} className="sg-behind">
          <Icon name="ArrowDown" size={16} /><span className="sg-behind-count">{behind.count.toLocaleString()}</span>
        </span>
      </SourceTooltip>}
      {counted && !accent && (onOpenChanges
        ? <SourceTooltip content={t("View changes")}>
          <SourceSettingsButton variant="secondary" className="sg-diff"
            onMouseDown={(event) => event.preventDefault()} onClick={() => onOpenChanges(status)}>{counts("contents text-body-medium")}</SourceSettingsButton>
        </SourceTooltip>
        : <span className="sg-diff sg-diff-static">{counts("contents")}</span>)}
      {/* cd5a31703 FB :33938-33968: the CI glyph without a checks pane is a static role=img span (MB + "CI"). */}
      {ciLabel && <span role="img" aria-label={ciLabel} className="sg-ci" data-ci={prView.ci}>
        <CiGlyph status={prView.ci} /><span>{t("CI")}</span>
      </span>}
      {prHint && !accent && <GhHint cause={prHint.cause} onRunInTerminal={prHint.onRunInTerminal} onInstall={prHint.onInstall} />}
      {accent && <span className="sg-pr-mode-label" data-accent={accent}>{prModeLabel(prMode)}</span>}
      {/* cd5a31703 Te/_Le (:33704-33745): the create split button (jO: primary + caret, both disabled together), its
          menu radio items open above the band (side top, align end); Creating PR… while the turn starts (PB). */}
      {pr && !prView && <span className="sg-pr" data-pr-action="" data-cds="SplitDropdownButton" aria-label={pr.label}>
        <SourceTooltip disabledReason={pr.disabledReason}>
          <SourceSettingsButton variant="secondary" className="sg-action sg-pr-main" disabled={!!pr.disabledReason} busy={pr.busy}
            onMouseDown={(event) => event.preventDefault()} onClick={() => pr.onPrimary?.(pr.mode)}>{pr.label}</SourceSettingsButton>
        </SourceTooltip>
        <SourceSettingsButton variant="secondary" className="sg-pr-more" icon="CaretDown" iconSize={12} iconOnly aria-label={t("More PR options")}
          disabled={!!pr.disabledReason || pr.busy} aria-haspopup="menu" aria-expanded={menu?.kind === "pr"} onMouseDown={(event) => event.preventDefault()} onClick={open("pr")} />
        <span role="status" className="sr-only">{pr.busy && pr.busyLabel ? pr.busyLabel : null}</span>
      </span>}
      {!pr && !accent && onAction && actionLabel && <SourceTooltip disabledReason={actionDisabled ? actionDisabledReason : undefined}>
        {/* git-status-card.js:1116 `onMouseDown: Mn` (e => e.preventDefault()): a pointer click keeps the composer's focus. */}
        <SourceSettingsButton variant="secondary" className="sg-action" disabled={actionDisabled || busy} busy={busy}
          onMouseDown={(event) => event.preventDefault()} onClick={() => onAction(status)}>{actionLabel}</SourceSettingsButton>
      </SourceTooltip>}
      {onDismiss && <button type="button" className="sg-button sg-dismiss" aria-label={t("Dismiss")}
        onMouseDown={(event) => event.preventDefault()} onClick={() => onDismiss(status)}><Icon name="X" size={16} /></button>}
      {!onDismiss && dismissReserved && <span aria-hidden="true" className="sg-dismiss-reserved" />}
    </div>
    {/* git-chips D/M: Menu.Popup side bottom, align start (menuAlign default "start", 48/83, 109/200). */}
    {menu && menu.kind !== "pr" && <SourceMenu.Popup anchor={menu.anchor} side="bottom" align="start" layer="menu" dataCds="Menu"
      label={menu.kind === "folder" ? t("Repository options") : t("Branch options")} onClose={() => setMenu(null)}>
      {menu.kind === "folder" && repoMenu.map((item) => <React.Fragment key={item.label}>
        {item.separatorBefore && <SourceMenu.Separator />}
        <SourceMenu.Item onClick={repoActions[item.label]}>{t(item.label)}</SourceMenu.Item>
      </React.Fragment>)}
      {menu.kind === "branch" && branchMenu.map((item) => <React.Fragment key={item.key}>
        {item.separatorBefore && <SourceMenu.Separator />}
        <SourceMenu.Item onClick={item.run}>{item.label}</SourceMenu.Item>
      </React.Fragment>)}
    </SourceMenu.Popup>}
    {/* cd5a31703 En (:37437-37472): Create PR / Create draft PR / (separator) Manually create PR as menuitemradio; a
        choice only remembers the mode (ca80fca8d SB), the primary button then fires it. */}
    {menu?.kind === "pr" && pr && <SourceMenu.Popup anchor={menu.anchor} side="top" align="end" layer="menu" dataCds="Menu"
      label={t("More PR options")} onClose={() => setMenu(null)}>
      {["create", "draft", "compose"].map((mode) => <React.Fragment key={mode}>
        {mode === "compose" && <SourceMenu.Separator />}
        <SourceMenu.Item checked={pr.mode === mode} checkedRole="radio" onClick={() => run(pr.onSelectMode, mode)}>{prModeLabel(mode)}</SourceMenu.Item>
      </React.Fragment>)}
    </SourceMenu.Popup>}
  </nav>;
}

/** cd5a31703 MB (:33429-33446) with c219730b0 Xt: the CI dot — failed/passed 6px fills, pending the running status
 * dot, skipped/unavailable an empty 6px ring. */
function CiGlyph({ status }) {
  if (status === "pending" || status === "loading") return <span className="sg-ci-glyph"><span className="status-dot" data-kind="running" /></span>;
  return <span className="sg-ci-glyph"><span className="sg-ci-dot" data-ci={status} /></span>;
}

/** c219730b0 un/fn/pn (:808-950): the local GitHub CLI hint — a secondary trigger ("GitHub CLI unavailable" /
 * "GitHub CLI signed out" + caret) opening a popover above, end-aligned, w-72, with the explanation and either the
 * Install GitHub CLI link or the `gh auth login` command row (Run in terminal, Copy command). Exported for the session
 * rail PR row (R4i-rail fix: c96d752d0 nze `Un = w && Hn ? b(kye, {cause: Hn, onRunInTerminal: ct})`, kye = c219730b0 dn). */
export function GhHint({ cause, onRunInTerminal, onInstall }) {
  const [anchor, setAnchor] = useState(null);
  const [copied, setCopied] = useState(false);
  const text = prStatusHintText(cause);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!text) return null;
  const close = () => setAnchor(null);
  return <>
    <SourceSettingsButton variant="secondary" className="sg-gh-hint" aria-haspopup="dialog" aria-expanded={!!anchor}
      onMouseDown={(event) => event.preventDefault()} onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}>
      {text.trigger}<Icon name="CaretDown" size={12} className="sg-gh-hint-caret" />
    </SourceSettingsButton>
    {anchor && <SourcePopover anchor={anchor} side="top" align="end" sideOffset={8} padding="md" className="epitaxy-root sg-gh-hint-popover"
      label={text.trigger} onClose={close}>
      <div className="sg-gh-hint-body">
        <SourcePopoverTitle className="sg-gh-hint-title">{text.body}</SourcePopoverTitle>
        {cause === "gh_signed_out" && <div className="sg-gh-command">
          <code>{GH_AUTH_LOGIN}</code>
          {onRunInTerminal && <SourceTooltip content={t("Run in terminal")}>
            <SourceSettingsButton variant="ghost" size="sm" icon="Play" iconOnly aria-label={t("Run in terminal")}
              onClick={() => { close(); onRunInTerminal(GH_AUTH_LOGIN); }} />
          </SourceTooltip>}
          <SourceTooltip content={copied ? t("Copied") : t("Copy command")}>
            <SourceSettingsButton variant="ghost" size="sm" icon={copied ? "Check" : "Copy"} iconOnly aria-label={t("Copy command")}
              onClick={() => { navigator.clipboard?.writeText(GH_AUTH_LOGIN).then(() => setCopied(true), () => {}); }} />
          </SourceTooltip>
        </div>}
        {cause === "gh_unavailable" && onInstall && <div className="sg-gh-actions">
          <SourceSettingsButton variant="secondary" onClick={() => { close(); onInstall(GH_INSTALL_URL); }}>{t("Install GitHub CLI")}</SourceSettingsButton>
        </div>}
      </div>
    </SourcePopover>}
  </>;
}

/** git-status-card 2816-2962 Na (commit mode, no PR): the last rendered row of a
 * revisited session, held until the live query settles. data-prbar-stale,
 * aria-hidden, inert, pointer-events none, opacity-60; plain chips (ja), the
 * counts in an Aa fill-secondary/shadow-field span and the action label in an
 * Aa px-md span of the Commit button's width (Ma). No menus, tooltips or actions. */
export function SourceGitStatusStale({ repoName, branch, localOnly = true, counts = null, actionLabel, heightPx }) {
  return <nav className="sg-status" aria-label={t("Repository and pull request controls")}
    style={Number.isFinite(heightPx) && heightPx > 0 ? { minHeight: heightPx } : undefined}>
    <div className="sg-row sg-row-stale" data-source-component="GitStatusCard" data-prbar-stale="" aria-hidden="true" inert>
      <div className="sg-leading">
        <div className="sg-checkout">
          {repoName && <span className="sg-stale-chip sg-repo" data-repo-chip={localOnly ? "unbounded" : "bounded"}><span>{repoName}</span></span>}
          <span className="sg-stale-chip sg-branch"><span dir="ltr">{branch}</span></span>
        </div>
        <span className="sg-checkout-spacer" />
      </div>
      {counts && <span className="sg-stale-fill sg-diff">
        <span className="sg-added">{`+${counts.added.toLocaleString()}`}</span>
        <span className="sg-removed">{`−${counts.removed.toLocaleString()}`}</span>
      </span>}
      {actionLabel && <span className="sg-stale-fill sg-stale-action">{actionLabel}</span>}
    </div>
  </nav>;
}
