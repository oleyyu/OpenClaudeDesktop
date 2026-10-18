import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SourceConfirmationDialog } from "./source-dialog.jsx";
import { t } from "../electron/i18n/index.mjs";
import { createWorktreeDisposeCheck, worktreeChangeList, worktreeConfirmCopy, worktreeConfirmReady, worktreeProbe } from "./worktree-dispose-model.mjs";
import { WorktreeChecking } from "./generated/files-changes/worktree-checking.mjs";

/*
 * Archive / delete confirms for a session in its own worktree (2.31226.0 shared-19-DmuztgN-.js, readable
 * analysis/code-ui-sync-20261013/readable/shared-19-DmuztgN-.js.readable.js):
 * - EK :19165-19178 "Checking for uncommitted changes…" footnote: invisible while it only reserves its line
 *   (phase confirm), animate-placeholder-reveal + aria-busy while the check runs. Since 2.42304.0 it is shared-19 jY
 *   (generated/files-changes/worktree-checking.mjs, the original): text-muted-as-secondary, its text a CDS ShimmerText
 *   (variant muted) that shimmers except while reserving; mt-md unless `afterHeader` (only the nested-sessions confirm
 *   passes it, so both confirms here keep mt-md).
 * - DK :19179-19203 the changed files: a <pre> of the first ten porcelain lines and "… and {more} more".
 * - BK :19420-19700 over IK :19373-19418: the single "Delete session?" confirm that turns into the dirty / couldn't-check
 *   copy in place (title, description, "Delete anyway"), moves focus to Cancel when that copy appears and accepts the
 *   second press only after 500 ms.
 * - SK :18966-19050 the dirty confirm an archive (or a bulk delete) opens after its probe: TK copy, DK list,
 *   initial focus Cancel, danger confirm.
 * The probe is main's worktree-status (worktrees.cjs worktreeStatus: count + porcelain lines).
 */

export { WorktreeChecking };

export function WorktreeChangeList({ changes }) {
  const { shown, more } = worktreeChangeList(changes);
  return <pre className="mt-md max-h-40 overflow-auto whitespace-pre-wrap rounded bg-alpha-1 p-sm text-code text-secondary" data-worktree-changes="">
    {shown.join("\n")}
    {more > 0 ? <>{"\n"}{t("… and {more} more", { more })}</> : null}
  </pre>;
}

const reasonText = (reason) => reason?.message || String(reason);

/**
 * BK + IK: "Delete session?" whose Delete first checks the session's worktree. `probe()` resolves worktree-status (or
 * rejects); `onDelete({confirmedDirty, probe})` deletes (probe.worktree: the worktree to remove with it, else null).
 * `showChecking` (hv: the session is known to work in a worktree) reserves the checking line from the start.
 */
export function SourceSessionDeleteDialog({ open, onExited, title, body, confirmLabel, probe, showChecking = false, onDelete, onClose }) {
  const [check, setCheck] = useState({ phase: "confirm", changes: [], count: 0 });
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const latest = useRef({});
  latest.current = { probe, onDelete, onClose };
  const decided = useRef(null), mounted = useRef(true), cancelButton = useRef(null);
  const run = async (result) => {
    decided.current = result;
    setPending(true); setError("");
    try { await latest.current.onDelete?.(result); if (mounted.current) latest.current.onClose?.(); }
    catch (reason) { if (mounted.current) { setError(reasonText(reason)); setPending(false); } }
  };
  const machine = useRef(null);
  const checker = () => (machine.current ??= createWorktreeDisposeCheck({
    probe: () => latest.current.probe?.() ?? null,
    onChange: (state) => { if (mounted.current) setCheck(state); },
    decide: (result) => { if (mounted.current) void run(result); },
  }));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; machine.current?.cancel(); machine.current = null; }; }, []);
  // BK: when the dirty / couldn't-check copy appears, Cancel takes focus (while focus is inside or lost to <body>).
  const shown = check.phase === "dirty" || check.phase === "unknown";
  useLayoutEffect(() => {
    if (!shown) return;
    const button = cancelButton.current, dialog = button?.closest('[role="alertdialog"]');
    if (!button || !dialog) return;
    const active = button.ownerDocument.activeElement;
    if (!active || active === button.ownerDocument.body || dialog.contains(active)) button.focus({ preventScroll: true, focusVisible: true });
  }, [shown, check.phase]);
  const copy = shown ? worktreeConfirmCopy("delete", check.phase, check.count) : null;
  return <SourceConfirmationDialog open={open} onExited={onExited} className="source-confirm-dialog" descriptionClassName="source-confirm-body"
    title={copy?.title ?? title} body={copy?.description ?? body} confirmLabel={copy?.confirmLabel ?? confirmLabel} confirmVariant="danger"
    pending={pending} cancelRef={cancelButton} onCancel={onClose}
    onConfirm={() => { if (decided.current) void run(decided.current); else checker().press(); }}>
    {showChecking && (check.phase === "confirm" || check.phase === "checking") && <WorktreeChecking hold={check.phase === "confirm" ? "reserve" : "reveal"} />}
    {check.phase === "dirty" && check.changes.length > 0 && <WorktreeChangeList changes={check.changes} />}
    {error && <p role="alert" className="source-confirm-error">{error}</p>}
  </SourceConfirmationDialog>;
}

/**
 * SK: the confirm an archive (or a bulk delete) opens when its worktree-status probe found uncommitted changes (or, for
 * a delete, could not read them). `status` is the worktree-status answer. The confirms wait in a queue (cK): `more`
 * shows "More sessions with uncommitted changes will follow." when a dirty one waits behind this one, and a press counts
 * only 500 ms after the later of the queue advancing (`guardSince`) and the confirm opening after another dialog
 * (`openedAt`, 2.42304.0 EY S). `onConfirm()` / `onClose()` answer the waiting action
 * (yK resolve), which then archives / deletes outside the dialog, as SK's x(!0) does.
 */
export function SourceWorktreeDirtyDialog({ open, onExited, action, status, more = false, guardSince = 0, openedAt = 0, onConfirm, onClose }) {
  const probe = worktreeProbe(status), phase = probe.status === "dirty" ? "dirty" : "unknown";
  const copy = worktreeConfirmCopy(action === "archive" ? "archive" : "delete", phase, probe.count);
  return <SourceConfirmationDialog open={open} onExited={onExited} className="source-confirm-dialog" descriptionClassName="source-confirm-body"
    title={copy.title} body={copy.description} confirmLabel={copy.confirmLabel} confirmVariant="danger" initialFocus="cancel"
    onCancel={onClose}
    onConfirm={() => { if (worktreeConfirmReady({ guardSince, openedAt })) onConfirm?.(); }}>
    {phase === "dirty" && probe.changes.length > 0 && <WorktreeChangeList changes={probe.changes} />}
    {more && <p className="mt-md text-footnote text-muted-as-secondary">{t("More sessions with uncommitted changes will follow.")}</p>}
  </SourceConfirmationDialog>;
}
