// W14-code r2 R2T-TA6: the tool requests waiting behind the pending approval card, as c96d752d0 tke draws them under the
// card (`n && s.length > 0 ? _("div", {className: "flex flex-col gap-[var(--chat-item-gap)]", children: [f("div", {className:
// "text-footnote text-muted-as-secondary", children: "Also waiting" (/b65yhE6Ld)}), s.map(ike)]})`), each ike `f(iL, {tool:
// e, pendingCollapsed: !0}, e.id)` — iL the transcript rows' tool row (generated/transcript-rows ToolRow, BOe), collapsed
// with its "Needs approval" status. The host's requests become the SDK tool objects the rows read (transcript-sdk-tools).
import React from "react";
import { ToolRow } from "./generated/transcript-rows/group-status.mjs";
import { sdkTools } from "./transcript-sdk-tools.mjs";
import { t } from "../electron/i18n/index.mjs";

/** The waiting request's tool call (its transcript item, awaiting approval), or null when it has none the rows draw. */
export function approvalQueueTool(item) {
  if (!item || typeof item !== "object") return null;
  const calls = sdkTools(item, { awaiting: true });
  if (!calls?.length) return null;
  const { hostItem: _hostItem, ...tool } = calls[0];
  return tool;
}

export function SourceApprovalQueue({ tools }) {
  const list = (tools ?? []).filter(Boolean);
  if (!list.length) return null;
  return <div className="flex flex-col gap-[var(--chat-item-gap)]" data-approval-queue="">
    <div className="text-footnote text-muted-as-secondary">{t("Also waiting")}</div>
    {list.map((tool) => <ToolRow key={tool.id} tool={tool} pendingCollapsed={true} />)}
  </div>;
}
