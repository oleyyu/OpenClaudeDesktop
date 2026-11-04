import React, { useState } from "react";
import { ActionDialog } from "./source-session-actions.jsx";
import { SourceDialogFooter } from "./source-dialog.jsx";
// W14-code r7 R7DC-02 / css7-deliverables-settings-button: the CDS Button (shared-frame Uu, official Eu) straight from the
// shared-frame file (E41), in place of the host settings-button copy.
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { t } from "../electron/i18n/index.mjs";
import "./source-claude-import.css";

// Codex /feedback (tui bottom_pane/feedback_view.rs 'How was this?'): a category, a note, and optionally this
// session's logs, sent with feedback/upload; the returned thread id is the reference to quote in a GitHub issue.
const CATEGORIES = () => [
  { value: "bug", label: t("Bug"), description: t("Crash, error message, hang, or broken UI/behavior.") },
  { value: "bad_result", label: t("Bad result"), description: t("Output was off-target, incorrect, incomplete, or unhelpful.") },
  { value: "good_result", label: t("Good result"), description: t("Helpful, correct, high-quality, or delightful result worth celebrating.") },
  { value: "safety_check", label: t("Safety check"), description: t("Benign usage blocked due to safety checks or refusals.") },
  { value: "other", label: t("Other"), description: t("Slowness, feature suggestion, UX feedback, or anything else.") },
];
// coreLabel / logs: the same dialog for another core's own feedback (capabilities.feedbackUpload: Kimi Code's managed
// /feedback, text only, so no logs choice there).
// A core whose feedback is a bug report the user files in the browser (Gemini CLI's /bug) answers {url}: the dialog opens it
// (onOpenLink) and says to finish it there instead of 'sent'.
export function CodexFeedbackDialog({ rpc, threadId = null, initialNote = "", coreLabel = "Codex", logsSupported = true, onOpenLink = null, onClose, ...dialog }) {
  const [category, setCategory] = useState("bug"), [note, setNote] = useState(initialNote), [logs, setLogs] = useState(!!threadId && logsSupported);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState(null), [opened, setOpened] = useState(null);
  const send = async () => {
    setBusy(true); setError("");
    try {
      const value = await rpc("feedback/upload", { classification: category, reason: note.trim() || null, threadId: logs || !logsSupported ? threadId : null, includeLogs: logs && !!threadId });
      const url = typeof value?.url === "string" && /^https:\/\//.test(value.url) ? value.url : null;
      if (url) { setOpened(url); await onOpenLink?.(url); }
      setSent(value?.feedbackId || (url ? "" : value?.threadId) || "");
    }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setBusy(false); }
  };
  return <ActionDialog {...dialog} title={coreLabel === "Codex" ? t("Send feedback to Codex") : t("Send feedback to {core}", { core: coreLabel })} className="claude-import-dialog" onClose={() => !busy && onClose()}>
    {sent !== null ? <>
      <p role="status">{opened ? t("{core}’s bug report opened in your browser. Review it and submit it there.", { core: coreLabel }) : t("Thanks. Your feedback was sent.")}</p>
      {opened && <p className="claude-import-muted"><CdsButton size="sm" variant="ghost" onClick={() => void onOpenLink?.(opened)}>{t("Open again")}</CdsButton>
        <CdsButton size="sm" variant="ghost" onClick={() => void globalThis.navigator?.clipboard?.writeText(opened).catch(() => {})}>{t("Copy link")}</CdsButton></p>}
      {sent && <p className="claude-import-muted">{t("Reference: {id}", { id: sent })} <CdsButton size="sm" variant="ghost" onClick={() => void globalThis.navigator?.clipboard?.writeText(sent).catch(() => {})}>{t("Copy")}</CdsButton></p>}
      <SourceDialogFooter><CdsButton variant="primary" data-autofocus onClick={onClose}>{t("Done")}</CdsButton></SourceDialogFooter>
    </> : <>
      <div className="claude-import-list" role="radiogroup" aria-label={t("How was this?")}>{CATEGORIES().map((entry) => <label key={entry.value} className="claude-import-item">
        <input type="radio" name="codex-feedback" checked={category === entry.value} disabled={busy} onChange={() => setCategory(entry.value)} />
        <span><strong>{entry.label}</strong><span className="claude-import-muted">{entry.description}</span></span>
      </label>)}</div>
      <textarea className="codex-feedback-note" data-cds="TextArea" rows={3} aria-label={t("Note")} placeholder={t("Anything else to add? (optional)")} value={note} disabled={busy} onChange={(event) => setNote(event.target.value)} />
      {threadId && logsSupported && <label className="claude-import-item"><input type="checkbox" checked={logs} disabled={busy} onChange={(event) => setLogs(event.target.checked)} />
        <span><strong>{t("Include this session’s logs")}</strong><span className="claude-import-muted">{t("Share this session’s Codex logs and diagnostics with OpenAI for troubleshooting.")}</span></span></label>}
      {error && <p role="alert" className="claude-import-error">{error}</p>}
      <SourceDialogFooter><CdsButton data-autofocus disabled={busy} onClick={onClose}>{t("Cancel")}</CdsButton>
        <CdsButton variant="primary" busy={busy} onClick={() => void send()}>{t("Send feedback")}</CdsButton></SourceDialogFooter>
    </>}
  </ActionDialog>;
}
