import React from "react";
import { Icon } from "./icons";
import { CdsIcon } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { SourceSpinner } from "./source-pane-states.jsx";
import { SourceInlineRuns } from "./source-user-text.jsx";
import "./source-plan-pane.css";
import { t } from "../electron/i18n/index.mjs";

// The plan pane's task list (turn/plan/updated steps {step, status}), shared
// with the todo_write tool row, which the source also renders as its todo
// checklist (approval-current.js KO :6966-6977 -> ZO). ZO
// (cd5a31703-ChuTw_FH.js:7262-7290): ul gap-xs py-xs; li items-start gap-1,
// completed rows struck through in text-secondary; step text through the
// inline renderer. Codex statuses map to the TodoWrite ones VT branches on.
const STATUS = { completed: "completed", inProgress: "in_progress", in_progress: "in_progress" };
export function planStepStatus(status) {
  return STATUS[status] ?? "pending";
}

// VT (cd5a31703-ChuTw_FH.js:2098-2150): a 16px box (BT) holding Check,
// the sm Spinner or a muted Placeholder, each with its sr-only word.
const BOX = "shrink-0 size-[calc(1rem*var(--cds-rem-scale,1))] mt-[1px] flex items-center justify-center";
function PlanStepIcon({ status, state = null }) {
  // A task the agent gave up on (MiMo 'abandoned', codeDesktop.state): an X, not a check.
  if (state === "abandoned")
    return <span className={`${BOX} text-secondary`}><Icon name="X" size={14} /><span className="sr-only select-none">{t("abandoned")}</span></span>;
  if (status === "completed")
    return <span className={`${BOX} text-primary`}><Icon name="Check" size={16} /><span className="sr-only select-none">{t("done")}</span></span>;
  if (status === "in_progress")
    return <span className={`${BOX} text-primary`}><SourceSpinner size="sm" /><span className="sr-only select-none">{t("in progress")}</span></span>;
  // 3.6556.2 cb6930dae Ta (:629): Placeholder size sm, className "text-muted-as-secondary". W14-code r8 gen-final-8 (panes
  // review low #2): the CDS Icon itself, `M{name:"Placeholder",size:"sm",className:"text-muted-as-secondary","aria-hidden":!0}`
  // (sm is calc(1rem * --cds-rem-scale), not the host Icon's fixed 16px).
  return <span className={BOX}><CdsIcon name="Placeholder" size="sm" className="text-muted-as-secondary" aria-hidden /><span className="sr-only select-none">{t("not done")}</span></span>;
}

export function SourcePlanChecklist({ plan, className = "" }) {
  return (
    <ul className={`flex flex-col gap-xs text-body select-text py-xs source-plan-list ${className}`.trim()}>
      {plan.map((step, i) => {
        const status = planStepStatus(step.status);
        // A bridge's own task state beyond Codex's three (MiMo: abandoned, blocked), as a muted tag after the step.
        const state = step.codeDesktop?.state === "abandoned" || step.codeDesktop?.state === "blocked" ? step.codeDesktop.state : null;
        return (
          <li key={i} data-state={status} data-task-state={state || undefined}
            className={`flex items-start gap-1 ${status === "completed" ? "line-through decoration-1 text-secondary" : "text-primary"}`}>
            <PlanStepIcon status={status} state={state} />
            <div className="suc-text source-plan-step min-w-0 flex-1"><SourceInlineRuns text={String(step.step ?? "")} />
              {state && <span className="source-plan-step-state no-underline">{state === "abandoned" ? t("Abandoned") : t("Blocked")}</span>}</div>
          </li>
        );
      })}
    </ul>
  );
}
