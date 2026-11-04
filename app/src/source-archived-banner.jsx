// W14-code r2 css2-archived-note: an archived Code session shows 3.6556.2 c9543da06 yu (exported S; cc43287c9 imports it
// as Mu and draws `p(Mu, {sessionRef: Hn}, `${t}:archived`)` in place of the composer) instead of the host's
// "This session is archived." line above a disabled composer.
//
// yu renders c0b46114c _ (imported as uo) with `role: "note"`, `standsInForComposer: !0`, `actionsInline: !0`:
//   div {[B5 "data-composer-stand-in"]: "", className: Hf(C_(accent), T_, "text-body", "epitaxy-band-enter")}
//     > div Hf("flex min-w-0 flex-1 flex-wrap gap-x-sm gap-y-sm", "items-start")
//       > div "min-w-0 flex-[1_1_32ch]" > [span "text-primary" "This session is archived. Unarchive it to keep working
//         in this session." (2Xfm7IN5gs), span[role=status].sr-only "Unarchiving…" (jBQAwvukAZ) while pending]
//       > div "flex min-w-0 max-w-full shrink-0 flex-wrap items-start gap-x-sm gap-y-sm"
//         > y (lo) span "flex h-[1lh] shrink-0 items-center" > S {variant:"secondary", size:"sm", busy, className:"shrink-0"}
//           "Unarchive" (ftDYZo4V2C)
// W14-code r7 gen-final-7 review fix (E84 rule 2, D1): uo / lo are the generated c0b46114c _ / y themselves
// (generated/session-rail/band-frame.mjs BandFrame / BandActionCell, the one copy the inline bands read; C_ is
// session-rail-changes branch-row-classes bandAccentClassName, T_ session-rail band-frame-classes BAND_ROW_ALIGN_CLASS,
// B5 cowork-session-states'). The hand-copied BAND_ROW_CLASS / BAND_TOP_ALIGNED_CLASS / ARCHIVED_BANNER_CLASS are gone.
// W14-code r6 git css6-archived-discard: yu's kept-worktree sentence and ghost "Discard changes" (yxguVqGJ5K). The
// official reads keptDirtyWorktree / folderTrees from the session metadata (_r(t, gu), vu); the host's worktrees live in
// the main process, so the banner asks worktree-status for the session's own worktree (main.cjs answers archived
// sessions too) and shows the sentence while it still has uncommitted changes (the archive kept it: main.jsx
// lateArchiveWorktree "kept-dirty"). Discard follows shared-46 Mo: the "discard" confirm (jD ask "always" → the worktree
// queue dialog, shared-46 WD copy), then the removal (main.cjs worktree-remove); "busy" (another session works there)
// and a failure raise the official toasts, and the status is read again (Po / not_kept invalidate).
import React, { useEffect, useState } from "react";
import { CdsButton } from "./generated/view-tabs/index.js";
import { BandFrame, BandActionCell } from "./generated/session-rail/band-frame.mjs"; // c0b46114c _ / y (c9543da06 uo / lo)
import { worktreeProbe } from "./worktree-dispose-model.mjs";
import { getLocale, t } from "../electron/i18n/index.mjs";

// shared-46 bD (c9543da06 Re): a worktree folder's display name, its last path segment.
const folderName = (folder) => String(folder).split(/[\\/]/).filter(Boolean).pop() ?? String(folder);
// c9543da06 yu `b`: the kept-worktree sentence after the archived line (one worktree, or the folders' list).
export function keptWorktreeSentence(folders = []) {
  if (folders.length > 1) {
    // yu: `n.formatList(e.map(Re), {type: "conjunction"})` in the app locale.
    const list = new Intl.ListFormat(getLocale(), { type: "conjunction" }).format(folders.map(folderName));
    return t("Worktrees for {folders} still have uncommitted changes on disk.", { folders: list });
  }
  return folders.length === 1 ? t("Its worktree still has uncommitted changes on disk.") : null;
}

/** shared-46 Mo onSuccess / onError: the toast copy for a worktree-remove answer (null: removed). */
export function discardOutcomeMessage(result) {
  if (result?.inUse) return t("Couldn’t discard changes because the worktree is in use. Try again shortly.");
  return result?.removed ? null : t("Couldn’t discard changes. Try again.");
}

/**
 * shared-46 Mo `_` over the host: read the worktree again (a clean or gone worktree is Mo's not_kept: just refresh), ask
 * the "discard" confirm (jD), then remove the worktree. Resolves "kept" (nothing done), "cancelled", "discarded" or
 * "failed"; onConfirmed() marks the removal under way, onError(message) raises the toast.
 */
export async function discardKeptWorktree({ sessionId, call, confirmDiscard, fallback = null, onConfirmed, onError }) {
  const fresh = await Promise.resolve().then(() => call("worktree-status", { threadId: sessionId })).catch(() => null);
  const probe = worktreeProbe(fresh);
  if (probe.status === "none" || probe.status === "clean") return "kept";
  const worktree = fresh?.worktree ?? fallback;
  if (!worktree || !(await confirmDiscard({ action: "discard", status: fresh ?? { worktree, unknown: true } }))) return "cancelled";
  onConfirmed?.();
  try {
    const message = discardOutcomeMessage(await call("worktree-remove", { worktree }));
    if (!message) return "discarded";
    onError?.(message);
  } catch {
    onError?.(t("Couldn’t discard changes. Try again."));
  }
  return "failed";
}

/**
 * sessionId / call: the archived session and the host bridge (worktree-status, worktree-remove). confirmDiscard(entry)
 * asks the worktree queue's "Discard uncommitted changes?" confirm and resolves whether it was accepted; onDiscardError
 * raises a toast.
 */
export function SourceArchivedBanner({ onUnarchive, sessionId, call, confirmDiscard, onDiscardError }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(null), [reads, setReads] = useState(0);
  const [confirming, setConfirming] = useState(false), [discarding, setDiscarding] = useState(false);
  useEffect(() => {
    if (!sessionId || !call) return undefined;
    let live = true;
    Promise.resolve().then(() => call("worktree-status", { threadId: sessionId }))
      .then((answer) => { if (live) setStatus(answer ?? null); }, () => { if (live) setStatus(null); });
    return () => { live = false; };
  }, [sessionId, call, reads]);
  const kept = worktreeProbe(status);
  const folders = kept.status === "dirty" ? [status.worktree] : [];
  const unarchive = () => {
    if (pending || !onUnarchive) return;
    setPending(true);
    Promise.resolve().then(onUnarchive).catch(() => {}).finally(() => setPending(false));
  };
  const discard = () => {
    if (confirming || discarding || !folders.length || !confirmDiscard) return;
    setConfirming(true);
    discardKeptWorktree({ sessionId, call, confirmDiscard, fallback: folders[0], onError: onDiscardError,
      onConfirmed: () => { setConfirming(false); setDiscarding(true); } })
      .catch(() => {})
      .finally(() => { setConfirming(false); setDiscarding(false); setReads((count) => count + 1); });
  };
  return <ArchivedBannerContent folders={folders} pending={pending} confirming={confirming} discarding={discarding}
    onUnarchive={unarchive} onDiscard={confirmDiscard ? discard : undefined} />;
}

/** c9543da06 yu's render: uo {role note, standsInForComposer, actionsInline} with Unarchive and the ghost Discard changes. */
export function ArchivedBannerContent({ folders = [], pending = false, confirming = false, discarding = false, onUnarchive, onDiscard }) {
  const sentence = keptWorktreeSentence(folders);
  // yu: `d(g, {role: x, standsInForComposer: C, actionsInline: T, actions: _, children: [E, D, O]})`, _ = [D (lo >
  // Unarchive), O (lo > Discard changes)].
  return (
    <BandFrame role="note" standsInForComposer actionsInline actions={<>
      <BandActionCell>
        <CdsButton variant="secondary" size="sm" onClick={onUnarchive} busy={pending} disabled={discarding} className="shrink-0">{t("Unarchive")}</CdsButton>
      </BandActionCell>
      {folders.length > 0 && onDiscard ? <BandActionCell>
        <CdsButton variant="ghost" size="sm" onClick={onDiscard} busy={discarding} disabled={pending || confirming} className="shrink-0">{t("Discard changes")}</CdsButton>
      </BandActionCell> : null}
    </>}>
      <span className="text-primary">{t("This session is archived. Unarchive it to keep working in this session.")}{sentence ? <>{" "}{sentence}</> : null}</span>
      {pending && <span role="status" className="sr-only">{t("Unarchiving…")}</span>}
      {discarding && <span role="status" className="sr-only">{t("Discarding changes…")}</span>}
    </BandFrame>
  );
}
