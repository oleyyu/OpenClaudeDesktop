import React, { useId } from "react";
import { SourceMenu } from "./source-menu";
import "./source-permission-menu.css";
import { t } from "../electron/i18n/index.mjs";

// These are the existing Codex wire values, not Claude's permission-mode enum.
// Order and copy: shared-14-BOJVa-jT.js:10259-10273 nE/rE for a local session
// (['default','acceptEdits','plan'], auto unshifted when autoFirst, bypass last) and
// :10283-10440 aE: Accept edits :10302-10313, Bypass :10370-10388, Manual :10431-10440.
// The nn item builder (ion-dist cf6ae6197) passes no icon, so no item draws one.
export const PERMISSION_OPTIONS = Object.freeze([
  // Auto: aE local branch (shared-14 :10346-10356) 'Claude handles permission decisions', no period.
  Object.freeze({ value: "auto", label: t("Auto"), description: t("DeepSeek handles permission decisions") }),
  Object.freeze({ value: "ask", label: t("Manual"), description: t("Always ask before making changes") }),
  Object.freeze({ value: "acceptEdits", label: t("Accept edits"), description: t("Automatically accept all file edits") }),
  Object.freeze({ value: "plan", label: t("Plan"), description: t("Create a plan before making changes") }),
  Object.freeze({ value: "bypass", label: t("Bypass permissions"), description: t("Accepts all permissions") }),
]);
const BYPASS_LABEL = PERMISSION_OPTIONS.at(-1).label;
/** Bypass while its local opt-in is off (approval-shared-current.js Lb nn, :8746-8803): a managed refusal shows a
 * disabled 'Bypass permissions' row ('Disabled by your organization'); otherwise (Vc showDisabled) the row has no quick
 * key and a trailing 'Enable' (text-footnote text-primary) and opens the Code settings page at the opt-in. */
export function bypassOffer({ enabled = false, availability = null } = {}) {
  if (enabled) return null;
  if (availability && availability.allowed === false && /organization/.test(availability.reason || "")) return "blocked";
  return "enable";
}
/** The chin trigger reads the item's full label (`ht = triggerLabel ?? label`;
 * the compact 'Accept'/'Bypass' trigger labels belong to the compact composer). */
export const permissionLabel = value => PERMISSION_OPTIONS.find(option => option.value === value)?.label ?? t("Manual");

/** Current 2.2553.1 chin: c360 Ud → Wr.Popup (side top, align start, one
 * GroupLabel "Mode") → cfca6870a item mapper, on the shared SourceMenu.
 * Selection closes the menu and hands focus to the composer editor through
 * finalFocus; Escape returns to the trigger (retained verified behavior).
 * Badges (ca80fca8d Mn :20490-20497, `dz(uz(t, n === r ? -1 : n, e, void 0, "inline"), r, e)`): defaultValue
 * (Settings' default permission mode) gets 'Default' and, while the current mode is not Auto (An = Ie && St !==
 * 'auto'; every local core offers Auto), the Auto row gets 'Recommended', which takes the place of 'Default' when
 * both fall on Auto. fz "inline": the badge (pz: neutral xxs truncate pointer-events-none) sits in the label,
 * 'flex min-w-0 items-center gap-sm' after the truncated name; the composer menu passes no settings source, so
 * the badge has no source tooltip. The row's accessible name stays the mode name (aria-labelledby).
 */
export function permissionBadges({ value, defaultValue, values = PERMISSION_OPTIONS.map((option) => option.value) } = {}) {
  const recommended = values.includes("auto") && value !== "auto" ? "auto" : null;
  const badges = {};
  if (defaultValue && values.includes(defaultValue) && defaultValue !== recommended) badges[defaultValue] = "default";
  if (recommended) badges[recommended] = "recommended";
  return badges;
}
const BADGE_TEXT = { default: () => t("Default"), recommended: () => t("Recommended") };
const InlineBadge = ({ kind }) => <>{" "}<span className="sp-permission-badge" data-cds="Badge" data-variant="neutral" data-step="1" data-permission-badge={kind}>
  <span className="sp-permission-badge-text">{BADGE_TEXT[kind]()}</span></span></>;
const badgedLabel = (label, labelId, kind) => kind
  ? <span className="sp-permission-label-row"><span className="sp-permission-label-text" id={labelId}>{label}</span><InlineBadge kind={kind} /></span>
  : label;
// agents / agentValue / defaultAgent / onAgentChange: a core whose sessions can run as one of its own primary agents
// (OpenCode's and MiMo's build, docs, compose…) adds an 'Agent' group; Plan still runs the core's plan agent.
export function SourcePermissionMenu({ anchor, value, defaultValue, onChange, onClose, onSelectComplete, initialHighlight, bypassEnabled = false, bypassOffer = null, onEnableBypass,
  bypassKept = false, agents = null, agentValue = null, defaultAgent = null, onAgentChange }) {
  const prefix = useId(), headingId = `${prefix}-heading`, agentHeadingId = `${prefix}-agent-heading`;
  const modeOptions = PERMISSION_OPTIONS.filter(option => option.value !== "bypass" || bypassEnabled);
  const badges = permissionBadges({ value, defaultValue, values: modeOptions.map((option) => option.value) });
  return (
    <SourceMenu.Popup anchor={anchor} side="top" align="start" collisionPadding={{ top: 48, right: 8, bottom: 8, left: 8 }}
      labelledBy={headingId} className="sp-permission-menu" onClose={onClose}
      finalFocus={onSelectComplete ? () => { onSelectComplete(); return null; } : undefined}
      initialHighlight={initialHighlight}>
      <SourceMenu.Group aria-labelledby={headingId}>
        <SourceMenu.GroupLabel id={headingId} className="sp-permission-heading">{t("Mode")}</SourceMenu.GroupLabel>
        {modeOptions.map((option, index) => {
          const selected = option.value === value, labelId = `${prefix}-${option.value}-label`;
          const descriptionId = `${prefix}-${option.value}-description`, digit = index + 1, badge = badges[option.value];
          return <SourceMenu.Item key={option.value} className="sp-permission-item" checked={selected} checkedRole="radio"
            label={option.label} description={bypassKept && option.value === "bypass" ? t("Turns on when Claude finishes working.") : option.description} labelId={badge ? undefined : labelId} descriptionId={descriptionId}
            aria-labelledby={labelId} aria-describedby={descriptionId} shortcut={String(digit)} digit={digit}
            data-permission-value={option.value} onClick={() => { if (option.value !== value) onChange?.(option.value); }}>
            {badgedLabel(option.label, labelId, badge)}
          </SourceMenu.Item>;
        })}
        {!bypassEnabled && bypassOffer === "enable" && onEnableBypass && <SourceMenu.Item className="sp-permission-item sp-permission-enable" label={BYPASS_LABEL}
          description={t("Turn on in Settings to use it")} data-permission-action="enable-bypass"
          trailing={<span className="sp-permission-enable-text">{t("Enable")}</span>}
          onClick={() => onEnableBypass()}>{BYPASS_LABEL}</SourceMenu.Item>}
        {!bypassEnabled && bypassOffer === "blocked" && <SourceMenu.Item className="sp-permission-item" label={BYPASS_LABEL} disabled
          disabledReason={t("Disabled by your organization")} data-permission-action="bypass-blocked">{BYPASS_LABEL}</SourceMenu.Item>}
      </SourceMenu.Group>
      {Array.isArray(agents) && agents.length > 1 && onAgentChange && <SourceMenu.Group aria-labelledby={agentHeadingId}>
        <SourceMenu.GroupLabel id={agentHeadingId} className="sp-permission-heading">{t("Agent")}</SourceMenu.GroupLabel>
        {agents.map((agent) => <SourceMenu.Item key={agent.name} className="sp-permission-item" checked={agent.name === agentValue} checkedRole="radio"
          label={agent.name} description={agent.description || (value === "plan" ? t("Used when you leave Plan") : undefined)}
          data-agent-value={agent.name} onClick={() => { if (agent.name !== agentValue) onAgentChange(agent.name); }}>
          {badgedLabel(agent.name, undefined, agent.name === defaultAgent ? "default" : null)}</SourceMenu.Item>)}
      </SourceMenu.Group>}
    </SourceMenu.Popup>
  );
}
