// W14-code r2 fr2-02: closing a split side that holds an unsent new-session draft asks first, as 3.6556.2 shared-16 bv
// (closePane of an extra pane) does: `let a = i ? gv(i.nonce) : null; if (!i || !a) return (…, n.closePane(e, t), !0);
// switch (await W_(a.text || void 0)) { case "cancel": return !1; case "start": return (dispatch Aa {nonce}, !1); case
// "discard": … n(e, a + 1) }`. gv: the draft's trimmed text, or any non-text content (attachments), else null.
//
// shared-16 V_ (the pending request; a newer one settles the older with "cancel"), U_ (the preview: whitespace folded,
// 60 characters then "…"), W_ (open), H_ (the copy) and G_ (the dialog), word for word:
//   M.Root {open:!0} > M.Popup {size:"sm", initialFocus: Keep editing} > [M.Header {showClose:!1, description} "Discard
//   draft?" (XTHxOYpOlm), M.Footer {className:"sm:flex-wrap"} > [T {"data-initial-focus":""} "Keep editing"
//   (nZCHBxEAlK), T "Start session" (J9JF+pOi5Y) unless noun is null, T {variant:"danger"} "Discard" (nmpevlUATU)]]
// T is the CDS Button (default variant). Each split side registers its draft here (registerSplitDraft), so a side can
// be closed from anywhere (its own ⌘W / menu, the other side's titlebar or sidebar) and the closing path asks the side
// that owns the draft, as bv reads any pane's draft from the shared draft store (Na).
import React, { useRef, useSyncExternalStore } from "react";
import { SourceDialog, SourceDialogFooter } from "./source-dialog.jsx";
import { CdsButton } from "./generated/view-tabs/index.js";
import { t } from "../electron/i18n/index.mjs";

let pending = null;
const listeners = new Set();
const emit = () => { for (const listener of listeners) listener(); };
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => pending;

/** U_: the description's preview of the draft text. */
export function draftPreview(text) {
  const folded = String(text).replace(/\s+/g, " ").trim();
  return folded.length > 60 ? `${folded.slice(0, 60)}…` : folded;
}

/** W_(text, noun = "session"): "cancel" | "start" | "discard". noun null offers no Start (descriptionNoStart). */
export function askDiscardDraft(text, noun = "session") {
  return new Promise((resolve) => {
    const older = pending;
    pending = { preview: text ? draftPreview(text) : undefined, noun, resolve };
    emit();
    older?.resolve("cancel");
  });
}
function settle(entry, answer) {
  if (pending !== entry) return;
  pending = null;
  emit();
  entry.resolve(answer);
}

/** H_: the description for the request. */
export function discardDraftDescription({ preview, noun }) {
  if (preview) return noun === null ? t("“{preview}” hasn’t been sent. Opening another session here will discard it.", { preview })
    : noun === "task" ? t("“{preview}” hasn’t been sent. Start a task from it, or discard it?", { preview })
      : t("“{preview}” hasn’t been sent. Start a session from it, or discard it?", { preview });
  return noun === null ? t("This draft hasn’t been sent. Opening another session here will discard it.")
    : noun === "task" ? t("This draft hasn’t been sent. Start a task from it, or discard it?")
      : t("This draft hasn’t been sent. Start a session from it, or discard it?");
}

export function SourceDiscardDraftDialog() {
  const request = useSyncExternalStore(subscribe, snapshot, snapshot);
  const keep = useRef(null);
  if (!request) return null;
  const answer = (value) => settle(request, value);
  return (
    <SourceDialog open onClose={() => answer("cancel")} size="sm" showClose={false} initialFocusRef={keep}
      title={t("Discard draft?")} description={discardDraftDescription(request)}>
      <SourceDialogFooter className="sm:flex-wrap">
        <CdsButton ref={keep} data-initial-focus="" onClick={() => answer("cancel")}>{t("Keep editing")}</CdsButton>
        {request.noun !== null && <CdsButton onClick={() => answer("start")}>{request.noun === "task" ? t("Start task") : t("Start session")}</CdsButton>}
        <CdsButton variant="danger" onClick={() => answer("discard")}>{t("Discard")}</CdsButton>
      </SourceDialogFooter>
    </SourceDialog>
  );
}

// side → () => {text, start(), discard()} | null (gv over that side's new-session draft).
const sideDrafts = new Map();
/** A split side's draft reader; returns the unregister. */
export function registerSplitDraft(side, read) {
  sideDrafts.set(side, read);
  return () => { if (sideDrafts.get(side) === read) sideDrafts.delete(side); };
}
/**
 * bv for a split side: close at once when the side holds no unsent draft; otherwise ask. "start" sends the draft from
 * that side and keeps it open (bv answers false); "discard" clears it and closes. Resolves whether the side closed.
 */
export async function closeSplitSide(index, close) {
  const draft = sideDrafts.get(index)?.() ?? null;
  if (!draft) { close(index); return true; }
  switch (await askDiscardDraft(draft.text || undefined)) {
    case "start": draft.start(); return false;
    case "discard": draft.discard(); close(index); return true;
    default: return false;
  }
}
