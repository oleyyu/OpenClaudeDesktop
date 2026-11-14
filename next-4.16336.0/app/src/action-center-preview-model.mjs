// The sidebar hover card's inline tool approval (W14-code r4 sidebar-new: the host Action Center that first drew it —
// B29's row card, its awaiting preview and its open / close delays — was never mounted and is gone, R4DC-N1 / E95; the card
// is now the 3.6556.2 shared-20 QO slice, generated/sidebar-hover-card, whose ca0409d7c tool card stand-in reads this).
import { approvalCardModel, ELICITATION } from "./approval-card-model.mjs";

/**
 * 1002481325 (V3-W14-approvals): the hover card's inline tool approval. ca0409d7c `_e` case "tool_permission" renders
 * the live request (`f.lane === "live"`, an input the request asserts) through G — `{ ...e, hasAlwaysAllow: !1,
 * alwaysAllowDisabledReason: void 0, hasThreadAllow: !1 }` — so the card offers Deny and Allow once only; any other
 * request (a question, a plan review, an elicitation that is not a tool approval, a card without its own Allow once)
 * keeps the preview. Returns the card model with those decisions, else null.
 */
export function hoverApprovalModel(request, item = null) {
  if (!request || typeof request !== "object" || request.method === "item/tool/requestUserInput") return null;
  let model;
  try { model = approvalCardModel(request, item); } catch { return null; }
  if (!model?.supported || model.ownHeading || model.access || model.takeover || model.teach) return null;
  if (request.method === ELICITATION && model.elicitation?.mode !== "approval") return null;
  const allows = (Array.isArray(model.allows) ? model.allows : []).filter(allow => !allow.persistent && allow.key !== "acceptForSession" && allow.key !== "acceptAlways");
  if (!allows.some(allow => allow.key === "accept")) return null;
  return { ...model, allows: allows.map(allow => allow.key === "accept" ? { ...allow, primary: true } : allow) };
}
