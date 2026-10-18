// Shared native-protocol predicate. Renderer and persistent side-session host
// must agree whether a completed plan still needs the user's decision.
export function planHandoff({ items = [], hints = false, permission, mode = "code", running = false, waiting = false,
  turnErrors = null, answered = null } = {}) {
  if (hints === true || permission !== "plan" || mode !== "code" || running || waiting || !Array.isArray(items)) return null;
  const turnId = items.findLast(item => typeof item?.turnId === "string" && item.turnId)?.turnId;
  if (!turnId || turnErrors?.[turnId]) return null;
  if (answered && (typeof answered.has === "function" ? answered.has(turnId) : answered === turnId)) return null;
  const plan = items.findLast(item => item?.type === "plan" && item.turnId === turnId);
  if (!plan || typeof plan.text !== "string" || !plan.text.trim() || ["inProgress", "running", "interrupted", "failed"].includes(plan.status)) return null;
  return { turnId, planItemId: plan.id ?? null };
}
