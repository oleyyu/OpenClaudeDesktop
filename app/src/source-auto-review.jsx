import React, { useState } from "react";
import "./source-auto-review.css";
import { t } from "../electron/i18n/index.mjs";
import { deniedActionSummary, guardianDenialEvent } from "./auto-review-model.mjs";
// W14-code r6 R6DC-02: shared-frame Uu (E41 direct import), not the host replica.
import { CdsButton } from './generated/view-tabs/shared-frame-6jtSkIit.js';

// Codex's 'Approve for me' (approvalsReviewer auto_review): item/autoApprovalReview/started|completed name the item
// they review (targetItemId); state.js keeps them per thread. Each shows as one muted line under that row:
// 'Reviewing request…', then 'Auto-review approved · Low risk' or 'Auto-review denied' with Codex's rationale.
const RISK = { low: "Low risk", medium: "Medium risk", high: "High risk", critical: "Critical risk" };
const STATUS = { inProgress: "Reviewing request…", approved: "Auto-review approved", denied: "Auto-review denied", timedOut: "Auto-review timed out", aborted: "Auto-review stopped" };
export function autoReviewsFor(reviews, item) {
  if (!reviews || !item) return [];
  const ids = new Set([item.id, ...(Array.isArray(item.toolGroup) ? item.toolGroup.map((member) => member?.id) : []),
    ...(Array.isArray(item.fileRun) ? item.fileRun.map((member) => member?.id) : [])].filter(Boolean));
  return Object.values(reviews).filter((review) => review?.targetItemId && ids.has(review.targetItemId))
    .sort((a, b) => (a.startedAtMs ?? 0) - (b.startedAtMs ?? 0));
}
export function autoReviewLabel(review) {
  const status = t(STATUS[review?.status] || STATUS.inProgress);
  const risk = review?.status !== "inProgress" && RISK[review?.riskLevel] ? t(RISK[review.riskLevel]) : "";
  return risk ? `${status} · ${risk}` : status;
}
// onApproveOnce(review): Codex's /auto-review, one retry of a denied action, after a confirmation naming it.
export function SourceAutoReviews({ reviews, onApproveOnce }) {
  if (!reviews?.length) return null;
  return <div className="sar-list">
    {reviews.map((review) => <AutoReviewLine key={review.reviewId} review={review} onApproveOnce={onApproveOnce} />)}
  </div>;
}
function AutoReviewLine({ review, onApproveOnce }) {
  const [phase, setPhase] = useState("idle"), [error, setError] = useState("");
  const approvable = review.status === "denied" && typeof onApproveOnce === "function" && !!guardianDenialEvent(review);
  const approve = async () => {
    setPhase("busy"); setError("");
    try { await onApproveOnce(review); setPhase("done"); }
    catch (failure) { setError(failure?.message || String(failure)); setPhase("confirm"); }
  };
  return <div className="sar-line" data-status={review.status} role="status">
    <span className={review.status === "inProgress" ? "sar-label source-shimmer" : "sar-label"}>{autoReviewLabel(review)}</span>
    {review.rationale && review.status !== "inProgress" && <span className="sar-rationale"><bdi>{review.rationale}</bdi></span>}
    {approvable && phase === "idle" && <CdsButton size="sm" variant="ghost" className="sar-approve" onClick={() => setPhase("confirm")}>{t("Approve once")}</CdsButton>}
    {approvable && (phase === "confirm" || phase === "busy") && <div className="sar-confirm" role="group" aria-label={t("Approve once")}>
      <span>{t("Let this run once anyway?")} <code className="sar-action"><bdi>{deniedActionSummary(review.action)}</bdi></code></span>
      <span className="sar-confirm-actions">
        <CdsButton size="sm" variant="secondary" disabled={phase === "busy"} onClick={() => { setPhase("idle"); setError(""); }}>{t("Cancel")}</CdsButton>
        <CdsButton size="sm" variant="primary" busy={phase === "busy"} onClick={() => void approve()}>{t("Approve once")}</CdsButton>
      </span>
      {error && <span className="sar-error" role="alert">{error}</span>}
    </div>}
    {phase === "done" && <span className="sar-done">{t("Approved once. The action can run on its retry.")}</span>}
  </div>;
}
