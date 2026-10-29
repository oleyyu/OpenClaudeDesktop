import React, { useState } from "react";
import { Icon } from "./icons";
import "./source-session-notices.css";
import { t } from "../electron/i18n/index.mjs";
import { SourceMarkdown } from "./source-session.jsx";
import { localizeBridgeText } from "./bridge-text-model.mjs";
// W12b: the 3.6556.2 usage band's live reset countdown (c227f4d5e QF) and the notice card context its card look
// provides around the headline and detail (aL `E(ZF.Provider, { value: !0, children: [T, D] })`).
import { UsageNoticeCardContext, UsageResetCountdown } from "./generated/usage-countdown/usage-countdown.mjs";

// Non-modal notices above the composer: what the core reported that changes how it behaves but is not a turn
// error (state.js notices / warnings / threadNotices: deprecationNotice, warning, configWarning, guardianWarning,
// strict auto-review, cyber verification, model reroutes) plus the usage-limit notice (usage-model.mjs composerUsageNotice).
// Each can be dismissed for this window; an identical notice is never listed twice (state.js appendNotice).
//
// Codex's own text (summary/details) is shown as is; the fixed sources state.js uses for notices without text are
// translated here.
export const PROJECT_TRUST = /until the project is trusted/i;
// A bridge core's warning that it ignores the session folder's project files until the folder is trusted (Gemini CLI:
// acp-bridge gemini.js GEMINI_UNTRUSTED_FOLDER); main.jsx adds 'Trust this folder' on a core with workspaceTrust.
export const UNTRUSTED_FOLDER_NOTICE = /until you trust the folder\.$/;
export function noticeKey(notice) {
  return notice.dismissKey || JSON.stringify([notice.kind, notice.summary, notice.details ?? null, notice.path ?? null]);
}
export function sessionNotices({ notices = [], warnings = [], threadNotices = [] } = {}) {
  return [
    ...threadNotices.map((notice) => ({ ...notice, scope: "thread" })),
    ...warnings.filter((message) => typeof message === "string" && message).map((message) => ({ kind: "warning", summary: message, details: null, scope: "thread" })),
    ...notices.map((notice) => ({ ...notice, scope: "connection" })),
  ];
}
const FIXED = new Set(["strictReview", "verification", "rerouted", "autoReviewDenied", "hookBlocked", "hookFailed"]);
// A bridge's fixed English warning (bridge-text-model.mjs: MiniMax's terminal-session note) reads in the UI language.
export function noticeText(notice) {
  return FIXED.has(notice.kind) ? t(notice.summary, notice.values) : notice.kind === "warning" ? localizeBridgeText(notice.summary) : notice.summary;
}
// The icon follows the notice's weight: warnings keep the triangle, informational notices (level 'info': recap,
// upsell, headline, usage info…) get a neutral Info glyph unless they name their own (recap: Chat).
// Codex writes config keys, model names and paths in its warnings as Markdown code spans (Model metadata for `dummy`
// not found…). A notice's plain text renders those spans as inline code, like a reply's, instead of showing the
// backticks; any other Markdown stays literal text. noticePlainText drops the backticks (for labels).
const CODE_SPAN = /`([^`\n]+)`/g;
export function noticeInline(text) {
  if (typeof text !== "string" || !text.includes("`")) return text;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<code key={match.index} className="ssn-code">{match[1]}</code>);
    last = match.index + match[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
export function noticePlainText(text) {
  return typeof text === "string" ? text.replace(CODE_SPAN, "$1") : text;
}
export function noticeIcon(notice) {
  if (typeof notice.icon === "string" && notice.icon) return notice.icon;
  return notice.level === "info" ? "Info" : "Warning";
}
export function SourceSessionNotices({ notices, onReveal, onTrust, trusting = false, extra = null }) {
  const [dismissed, setDismissed] = useState(() => new Set());
  const shown = (notices || []).filter((notice) => !dismissed.has(noticeKey(notice)));
  if (!shown.length && !extra) return null;
  return <div className="ssn-list" role="region" aria-label={t("Notices")}>
    {extra}
    {shown.map((notice) => {
      const key = noticeKey(notice), trust = notice.kind === "config" && onTrust && PROJECT_TRUST.test(notice.summary);
      const actions = Array.isArray(notice.actions) ? notice.actions.filter((action) => action?.label && typeof action.run === "function") : [];
      return <div key={key} className="ssn-notice" data-kind={notice.kind} data-level={notice.level || undefined} role="status">
        <Icon name={noticeIcon(notice)} size={16} className="ssn-icon" />
        <div className="ssn-body">
          <UsageNoticeCardContext.Provider value={true}>
          <p className="ssn-summary"><bdi>{noticeInline(noticeText(notice))}</bdi></p>
          {/* A reached usage limit (composerUsageNotice countdown): its text, then the reset as the band's QF, which
              ticks within the hour before it and reads the absolute VI time to assistive tech. */}
          {notice.countdown ? <p className="ssn-details"><bdi>{notice.countdown.lead ? <>{noticeInline(notice.countdown.lead)}{" "}</> : null}<UsageResetCountdown
            resetsAtSeconds={notice.countdown.resetsAtSeconds} absolute={notice.countdown.absolute} /></bdi></p>
          /* Model-written details (a /recap answer) arrive as Markdown: render them like a reply, in a bounded scroller
              so a long catch-up never pushes the transcript away. */
          : notice.details && notice.kind !== "rerouted" && (notice.markdown
            ? <div className="ssn-details ssn-markdown" tabIndex={0} role="group" aria-label={noticePlainText(noticeText(notice))}><SourceMarkdown text={notice.details} sessionKey={`notice-${key}`} itemId={`notice-${key}`} /></div>
            : <p className="ssn-details"><bdi>{noticeInline(notice.details)}</bdi></p>)}
          </UsageNoticeCardContext.Provider>
          {notice.path && <p className="ssn-details ssn-path" title={notice.path}><bdi>{notice.path}{notice.line ? `:${notice.line}` : ""}</bdi></p>}
          {(trust || (notice.path && onReveal) || actions.length > 0) && <div className="ssn-actions">
            {/* w12c-wiring: `disabled` is NI's settled request ("Request sent to admin", `disabled:!0`). */}
            {actions.map((action) => <button key={action.label} type="button" className="ssn-action" disabled={action.disabled === true || undefined} aria-disabled={action.busy === true || undefined} aria-busy={action.busy === true || undefined} onClick={() => { if (action.busy !== true && action.disabled !== true) action.run(); }}>{action.label}</button>)}
            {trust && <button type="button" className="ssn-action" disabled={trusting} onClick={() => onTrust()}>{trusting ? t("Trusting…") : t("Trust this folder")}</button>}
            {notice.path && onReveal && <button type="button" className="ssn-action" onClick={() => onReveal(notice.path)}>{t("Show in Finder")}</button>}
          </div>}
        </div>
        {/* A backend banner with presentation 'inline' (Codex BannerPresentation) stays until the backend drops it. */}
        {notice.dismissible !== false && <button type="button" className="ssn-dismiss" aria-label={t("Dismiss notice")} title={t("Dismiss notice")}
          onClick={() => { setDismissed((current) => new Set(current).add(key)); notice.onDismiss?.(); }}><Icon name="X" size={12} /></button>}
      </div>;
    })}
  </div>;
}
