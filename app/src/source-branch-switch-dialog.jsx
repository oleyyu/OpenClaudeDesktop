import React, { useEffect, useRef, useState } from "react";
import { CdsAlertDialog, CdsButton, CdsRoot, CdsSplitDropdownButton } from "./generated/view-tabs/index.js";
import { codePaneExperimental } from "./generated/code-composer/code-pane-experimental.mjs";
import { menuCollisionPadding } from "./generated/code-composer/menu-collision-padding.mjs";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";

// cc43287c9 G6: a branch name inside the copy (the `<b>` rich-text tag) is <code class="text-code-regular text-primary">.
const branchCode = (chunks) => <code className="text-code-regular text-primary">{chunks}</code>;

// cc43287c9 Yie: '+a −d' in font-mono-ui text-caption, labelled '{additions} additions, {deletions} deletions'.
function ChangeCounts({ additions, deletions }) {
  const intl = useStartIntl();
  return <span className="font-mono-ui text-caption"
    aria-label={intl.formatMessage({ defaultMessage: "{additions} additions, {deletions} deletions", id: "RFSVo0ph8h" }, { additions, deletions })}>
    <span className="text-success">{`+${additions}`}</span>{" "}<span className="text-danger">{`−${deletions}`}</span>
  </span>;
}

// cc43287c9 ap = shared-18 fx: the Code pane's CdsRoot (density compact, experimental lx, className contents).
function CodePaneRoot({ children }) {
  return <CdsRoot density="compact" experimental={codePaneExperimental} className="contents">{children}</CdsRoot>;
}

const MODES = ["stash", "commit", "discard"];

/*
 * cc43287c9 Jie 'Handle uncommitted changes': picking a branch while the working tree is dirty (worktree off) asks how
 * to clear it first. ap > he.Root (shared-frame ib, CdsAlertDialog) > he.Popup "epitaxy-root break-words max-w-[30rem]"
 * (initialFocus Cancel) > [div "flex flex-col gap-sm" (Title, Description mt-0, notes), he.Footer align between].
 * - Step 1: ipYtl3IVht 'Uncommitted changes on <b>{currentBranch}</b>', jGBYn1q7Ts 'Handle them before switching to
 *   <b>{targetBranch}</b>.', ETzdRE7DsE (other sessions in the folder) and 4M/7DCOUkQ '{n} files changed' with Yie's
 *   counts; footer Cancel | ye (shared-frame cF split button, secondary, side top, align end, collisionPadding lp =
 *   shared-18 wU) over Stash changes / Commit as WIP / Discard changes radio items (default stash).
 * - Discard asks again: wwn0pRsf6i 'Discard uncommitted changes?' / qhAHI7pagG 'All uncommitted changes on
 *   <b>{currentBranch}</b> will be permanently lost.' with Back | Discard (danger).
 * - N → qie: busy on the chosen mode; a failed resolve reports 'Couldn’t update the working tree.' (onError) and stays
 *   open; success calls onResolved. Focus first moves to the alertdialog itself.
 * - H (onOpenChange false): ignored while busy; on the discard step it goes back; otherwise onCancel.
 * Host: the status ({files, additions, deletions}) comes from branch-switch-check instead of getWorkingTreeStatus, and
 * the resolve goes through onResolve (main.cjs branch-switch-resolve) instead of the window bridge.
 */
export function SourceBranchSwitchDialog({ open = true, onExited, currentBranch, targetBranch, status, otherSessionCount = 0, onResolve, onResolved, onCancel, onError }) {
  const intl = useStartIntl();
  const [busy, setBusy] = useState(null), [confirmDiscard, setConfirmDiscard] = useState(false), [mode, setMode] = useState("stash");
  const cancelRef = useRef(null), backRef = useRef(null), step = useRef(confirmDiscard);
  useEffect(() => {
    if (step.current === confirmDiscard) return;
    step.current = confirmDiscard;
    if (open) (confirmDiscard ? backRef : cancelRef).current?.focus();
  }, [confirmDiscard, open]);
  const resolve = async (chosen) => {
    (backRef.current ?? cancelRef.current)?.ownerDocument.activeElement?.closest('[role="alertdialog"]')?.focus?.({ preventScroll: true });
    setBusy(chosen);
    let resolved = false;
    try {
      const result = await onResolve?.(chosen);
      if (!result?.success) onError?.(result?.error);
      else resolved = true;
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(null);
      setConfirmDiscard(false);
    }
    if (resolved) onResolved?.();
  };
  const labels = {
    stash: intl.formatMessage({ defaultMessage: "Stash changes", id: "vuCXR4HhzH" }),
    commit: intl.formatMessage({ defaultMessage: "Commit as WIP", id: "jKWkgYpA3L" }),
    discard: intl.formatMessage({ defaultMessage: "Discard changes", id: "yxguVqGJ5K" }),
  };
  const items = MODES.map((option) => ({ label: labels[option], checked: option === mode, checkedRole: "radio", onSelect: () => setMode(option) }));
  const primary = () => { if (mode === "discard") { setConfirmDiscard(true); return; } resolve(mode); };
  const onOpenChange = (next) => {
    if (next || busy !== null) return;
    if (confirmDiscard) { setConfirmDiscard(false); return; }
    onCancel?.();
  };
  const files = status?.files ?? 0, additions = status?.additions ?? 0, deletions = status?.deletions ?? 0;
  const count = Number.isFinite(otherSessionCount) ? otherSessionCount : 0;
  return <CodePaneRoot>
    <CdsAlertDialog.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={(next) => { if (!next) onExited?.(); }}>
      <CdsAlertDialog.Popup className="epitaxy-root break-words max-w-[30rem]" initialFocus={cancelRef}>
        <div className="flex flex-col gap-sm">
          {confirmDiscard ? <>
            <CdsAlertDialog.Title><StartMessage defaultMessage="Discard uncommitted changes?" id="wwn0pRsf6i" /></CdsAlertDialog.Title>
            <CdsAlertDialog.Description className="mt-0">
              <StartMessage defaultMessage="All uncommitted changes on <b>{currentBranch}</b> will be permanently lost." id="qhAHI7pagG"
                values={{ currentBranch, b: branchCode }} />
            </CdsAlertDialog.Description>
          </> : <>
            <CdsAlertDialog.Title>
              <StartMessage defaultMessage="Uncommitted changes on <b>{currentBranch}</b>" id="ipYtl3IVht" values={{ currentBranch, b: branchCode }} />
            </CdsAlertDialog.Title>
            <CdsAlertDialog.Description className="mt-0">
              <StartMessage defaultMessage="Handle them before switching to <b>{targetBranch}</b>." id="jGBYn1q7Ts" values={{ targetBranch, b: branchCode }} />
            </CdsAlertDialog.Description>
            {count > 0 && <p className="text-body text-secondary">
              <StartMessage defaultMessage="{count, plural, one {# other session is using this folder. Switching branches will affect it too.} other {# other sessions are using this folder. Switching branches will affect them too.}}"
                id="ETzdRE7DsE" values={{ count }} />
            </p>}
            {files > 0 && <p className="flex flex-wrap items-center gap-1.25 text-body text-secondary">
              <StartMessage defaultMessage="{count, plural, one {# file} other {# files}} changed" id="4M/7DCOUkQ" values={{ count: files }} />
              {(additions > 0 || deletions > 0) && <ChangeCounts additions={additions} deletions={deletions} />}
            </p>}
          </>}
        </div>
        <CdsAlertDialog.Footer align="between">
          <div className="flex items-center gap-sm">
            {confirmDiscard
              ? <CdsButton ref={backRef} variant="secondary" onClick={() => setConfirmDiscard(false)} disabled={busy !== null}>
                <StartMessage defaultMessage="Back" id="cyR7KhiuaU" /></CdsButton>
              : <CdsButton ref={cancelRef} variant="secondary" onClick={() => onCancel?.()} disabled={busy !== null}>
                <StartMessage defaultMessage="Cancel" id="47FYwba+bI" /></CdsButton>}
          </div>
          <div className="flex items-center gap-sm">
            {confirmDiscard
              ? <CdsButton variant="danger" onClick={() => resolve("discard")} busy={busy === "discard"} disabled={busy !== null}>
                <StartMessage defaultMessage="Discard" id="nmpevlUATU" /></CdsButton>
              : <CdsSplitDropdownButton variant="secondary" label={labels[mode]} onPrimaryClick={primary} busy={busy !== null} disabled={busy !== null}
                items={items} side="top" align="end" collisionPadding={menuCollisionPadding} />}
          </div>
        </CdsAlertDialog.Footer>
      </CdsAlertDialog.Popup>
    </CdsAlertDialog.Root>
  </CodePaneRoot>;
}
