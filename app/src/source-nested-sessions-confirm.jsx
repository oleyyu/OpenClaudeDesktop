// W14-code r2 fr2-01 / r2-shared-01: the nested sessions question before archiving or deleting a session that has nested
// sessions. 3.6556.2 shared-20 PA (the queue: one open request per window, a newer one settles the older with null) /
// FA (exported T; c48ea26ad X awaits it) / IA (the description) / BA (the dialog: Oi {size:"md", title, header
// {showClose:!1, description}, body: zA = ca674e66a NestedSessionsConfirmBody}). The body's footer, word for word:
//   a.Footer {align:"between"} > [i {variant:"ghost"} Cancel, div "flex gap-sm" > [i {variant:"secondary", busy:checking,
//   busyLabel:"Checking for uncommitted changes…"} "Archive # sessions" / "Archive all # sessions" (count = nested + 1),
//   i {variant: delete ? "danger" : "primary", autoFocus, "data-initial-focus":"", onKeyDown: l (no key repeat)} "Archive
//   this session" / "Delete this session"]]
// The answer is "only", "all" or null (Cancel, Escape, or a newer request). W14-code r3 fr3-03: a delete passes
// `checkAll` (c48ea26ad X: `checkAll: i === "delete" ? () => (d = g(q(e, i))).done : void 0`, main.jsx's
// familyWorktreeProbe); BA's onSettle w: "all" with checkAll marks the request checking and answers "all" once
// `ur(a.checkAll(), null, { checking: UA, deadline: t, answer: t, deadlineMs: MA })` settles (MA = 6e3: the reads, or
// six seconds); while it checks only Cancel answers (`e && a.id === h` returns). The body (ca674e66a) shows it: the
// secondary button busy with busyLabel, the danger "Delete this session" disabled with that label as its reason, and
// before the footer the shared-46 Oi strip `m && e(o, { afterHeader: !0, hold: d ? "reveal" : "reserve" })`
// (generated/files-changes WorktreeChecking). The host keeps the request in a module store (PA's zustand store) that
// main.jsx's sessionAction fills and this component drains.
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { SourceDialog, SourceDialogFooter } from "./source-dialog.jsx";
import { CdsButton } from "./generated/view-tabs/index.js";
import { WorktreeChecking } from "./generated/files-changes/worktree-checking.mjs";
import { t } from "../electron/i18n/index.mjs";
import { createStartIntl } from "./source-code-start-adapters.jsx";
import { nestedSessionsMessages } from "./generated/sessions-page/messages-shared-20.mjs";

// shared-20 MA: how long "all" waits for checkAll before it answers anyway.
export const NESTED_CHECK_DEADLINE_MS = 6000;

let queue = [];
let nextId = 0;
const listeners = new Set();
const emit = () => { for (const listener of listeners) listener(); };
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => queue[0] ?? null;

/** FA: open the question; resolves "only" | "all" | null. A newer request settles the open one with null (PA open). */
export function askNestedSessions({ action, sessionTitle, nestedCount, boundCount = 0, workingCount = 0, checkAll }) {
  return new Promise((resolve) => {
    const older = queue;
    queue = [{ id: nextId++, action, sessionTitle, nestedCount, boundCount, workingCount, checkAll: typeof checkAll === "function" ? checkAll : undefined, resolve }];
    emit();
    for (const entry of older) entry.resolve(null);
  });
}
function settle(entry, answer) {
  if (!queue.includes(entry)) return;
  queue = queue.filter((item) => item !== entry);
  emit();
  entry.resolve(answer);
}

/** IA: the description, joined by spaces. W14-code r8 fr8-05: IA's own plural ICU descriptors (sRMUaFT32i / rRvonVlblb /
 * ORGsUuPnMo / RbpU5T0BsV, wCLSAv7FiB, G1uB+fnj7o; generated messages-shared-20.mjs) formatted with intl, not host keys. */
export function nestedSessionsDescription({ action, sessionTitle, nestedCount: count, boundCount = 0, workingCount = 0 }, intl = createStartIntl()) {
  const remove = action === "delete", title = typeof sessionTitle === "string" ? sessionTitle.trim() : "";
  const values = { sessionTitle: title, count };
  const parts = [intl.formatMessage(title
    ? remove ? nestedSessionsMessages.deleteNamed : nestedSessionsMessages.archiveNamed
    : remove ? nestedSessionsMessages.deleteUnnamed : nestedSessionsMessages.archiveUnnamed, values)];
  if (boundCount > 0) parts.push(intl.formatMessage(nestedSessionsMessages.bound, { count: boundCount }));
  if (!remove && workingCount > 0) parts.push(intl.formatMessage(nestedSessionsMessages.working, { workingCount }));
  return parts.join(" ");
}

// ca674e66a l: a held Enter / Space does not repeat the press.
const noRepeat = (event) => { if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault(); };

/** shared-46 ID with no checking delay: `answer` once `promise` settles or at the deadline, whichever comes first; the
 * returned function cancels both. */
export function settleAfterCheck(promise, { deadlineMs = NESTED_CHECK_DEADLINE_MS, answer, schedule = setTimeout, cancel = clearTimeout }) {
  let done = false;
  const finish = () => { if (done) return; done = true; cancel(timer); answer(); };
  const timer = schedule(finish, deadlineMs);
  Promise.resolve(promise).then(finish, finish);
  return () => { done = true; cancel(timer); };
}

export function SourceNestedSessionsConfirm() {
  const request = useSyncExternalStore(subscribe, snapshot, snapshot);
  // BA `[d, f] = S(a); a !== null && a !== d && f(a)`: the last request stays on screen while the dialog closes.
  const [shown, setShown] = React.useState(request);
  if (request !== null && request !== shown) setShown(request);
  // BA `[h, _] = S(null)`, `C = d !== null && d.id === h`; c: the running check's cancel (also run on settle and unmount).
  const [checkingId, setCheckingId] = React.useState(null);
  const stopCheck = useRef(null);
  useEffect(() => () => stopCheck.current?.(), []);
  if (!shown) return null;
  const remove = shown.action === "delete", total = shown.nestedCount + 1, checking = shown.id === checkingId;
  const finish = (entry, value) => { stopCheck.current?.(); stopCheck.current = null; settle(entry, value); };
  // BA w: while the request checks, only a null answer (Cancel, Escape) gets through.
  const answer = (value) => {
    if (!request || (value && request.id === checkingId)) return;
    if (value !== "all" || !request.checkAll) { finish(request, value); return; }
    const entry = request, done = () => finish(entry, "all");
    setCheckingId(entry.id);
    stopCheck.current?.();
    stopCheck.current = settleAfterCheck(Promise.resolve().then(() => entry.checkAll()), { answer: done });
  };
  const checkingLabel = t("Checking for uncommitted changes…");
  return (
    <SourceDialog open={request !== null} onClose={() => answer(null)} onExited={() => setShown(null)} size="md" showClose={false}
      title={remove ? t("Delete session?") : t("Archive session?")} description={nestedSessionsDescription(shown)}>
      {remove && <WorktreeChecking afterHeader hold={checking ? "reveal" : "reserve"} />}
      <SourceDialogFooter align="between">
        <CdsButton variant="ghost" onClick={() => answer(null)}>{t("Cancel")}</CdsButton>
        <div className="flex gap-sm">
          <CdsButton variant="secondary" busy={checking} busyLabel={checkingLabel} onClick={() => answer("all")}>
            {remove ? (total === 2 ? t("Delete {count} sessions", { count: total }) : t("Delete all {count} sessions", { count: total }))
              : total === 2 ? t("Archive {count} sessions", { count: total }) : t("Archive all {count} sessions", { count: total })}
          </CdsButton>
          <CdsButton variant={remove ? "danger" : "primary"} disabled={checking} disabledReason={remove ? checkingLabel : undefined} autoFocus data-initial-focus="" onKeyDown={noRepeat} onClick={() => answer("only")}>
            {remove ? t("Delete this session") : t("Archive this session")}
          </CdsButton>
        </div>
      </SourceDialogFooter>
    </SourceDialog>
  );
}
