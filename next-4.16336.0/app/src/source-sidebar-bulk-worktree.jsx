import React from "react";
import { SourceConfirmationDialog } from "./source-dialog.jsx";
import { useStartIntl } from "./source-code-start-adapters.jsx";
import { worktreeConfirmReady } from "./worktree-dispose-model.mjs";
import { worktreeConfirmCopyOf, WorktreeSessionTitles } from "./generated/code-current/sidebar-bulk-worktree-copy.mjs";
import { t } from "../electron/i18n/index.mjs";

/*
 * R3-sidebar2 (sidebar-15): EY (2.42304.0 shared-19) showing a yY entry — the confirm a family delete asks after the
 * nested sessions question when it could not check some members' worktrees (c48ea26ad de → yY(titles, count, window)).
 * AY's `sessions` branch gives the copy ("Delete {count, plural, one {session} other {# sessions}}?", "Delete # sessions",
 * "Anything uncommitted may be permanently discarded. Couldn’t check for uncommitted changes in:") and NY lists the titles
 * (ten, then "… and {more} more"), both generated (generated/code-current/sidebar-bulk-worktree-copy.mjs). As in EY: a
 * danger confirm with Cancel focused, "More sessions with uncommitted changes will follow." while a dirty confirm waits
 * behind it, and a press counts only 500 ms after the later of the queue advancing (`guardSince`) and the confirm opening
 * (`openedAt`, which yY always records). `sessions`: {titles, count}. The single-session confirms stay
 * SourceWorktreeDirtyDialog (source-worktree-dispose-dialog.jsx).
 * R4i-sidebar SI2: mounted by main.jsx for a queue head with `sessions` (sidebar-bulk-model worktreeConfirmVariant, EY's
 * `n.sessions===void 0` branch); yY's host entry point is sidebar-bulk-model confirmCouldntCheck.
 */
export function SidebarBulkWorktreeConfirm({ open, onExited, sessions, more = false, guardSince = 0, openedAt = 0, onConfirm, onClose }) {
  const intl = useStartIntl();
  const titles = sessions?.titles ?? [];
  const copy = worktreeConfirmCopyOf(intl, "delete", "unknown", { changes: titles, sessions: sessions?.count ?? titles.length });
  return <SourceConfirmationDialog open={open} onExited={onExited} className="source-confirm-dialog" descriptionClassName="source-confirm-body"
    title={copy.title} body={copy.description} confirmLabel={copy.confirmLabel} confirmVariant="danger" initialFocus="cancel"
    onCancel={onClose}
    onConfirm={() => { if (worktreeConfirmReady({ guardSince, openedAt })) onConfirm?.(); }}>
    {titles.length > 0 && <WorktreeSessionTitles titles={titles} />}
    {more && <p className="mt-md text-footnote text-muted-as-secondary">{t("More sessions with uncommitted changes will follow.")}</p>}
  </SourceConfirmationDialog>;
}
