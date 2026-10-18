// composer-row-chin (research/composer.md §3.3 / §3.12 / §3.20; ledger composer-03, composer-13, composer-v02): the chin
// triggers of the Code composer as 2.42304.0 draws them, and the row layout an open session's presets chin takes
// (c73f45bc3 K_ → c227f4d5e bQ `layout: "row"`). Everything here is the official DOM: the view-tabs CDS components by
// their semantic names (CdsButton / CdsTooltip / cdsClassNames, D1/D24), the generated originals (rQ mode label, DK row
// model class, the shared-8 KV ring, the shared-6 tokens) and the class strings of the official chunks they compose,
// which scripts/extract-code-composer.mjs (composer-row-chin.mjs chunk pins) and tests/source-composer-row-chin.test.mjs
// hold to the shipped text:
//   - bQ row branch: the leading slot holds only the mode picker J, in `"flex items-center ms-0.5 " + Sg` (Sg: 24px
//     controls, 6px padding, 13px / 20px body); the trailing is `Bo(Va, "gap-1", Sg, "compact:me-1")` (Va: the
//     auto-column grid) with the model selector, the usage ring (hZ `ringSize: 14`, no open request) and the Fast mode
//     live region; no EngineFooterStrip. Outside the row (the classic chin) the trailing is `Bo(Va, "gap-1")`.
//   - tQ (inside vQ's `inline-flex min-w-0`): CdsTooltip {content: tooltip ?? header, shortcut: the openModeMenu chord,
//     open: !menuOpen && undefined} over a ghost CdsButton `min-w-0 shrink` holding rQ (the truncating label, text-warning
//     for Manual, the hidden description it is aria-described by, dropped while disabled); _Q is the loading label.
//   - LK / shared-7 ModelSelector trigger (triggerVariant "pill"): a ghost CdsButton data-cds="ModelSelector",
//     `min-w-0 max-w-full` + DK `text-secondary` in the row, the name in a `truncate` span with the fast tier in
//     `text-muted @max-[280px]:hidden ms-1`; loading: `flex min-w-0 items-center gap-xs` with a spinner and the label.
//   - c8e04f916 EffortControl trigger: CdsTooltip {content: "Effort", open: !open && undefined} over a ghost CdsButton
//     data-cds="ModelSelectorEffort" `min-w-0 shrink-0` named "Effort: {name}", the name in `min-w-0 truncate`.
//   - yZ: CdsTooltip {content, detail, open: !open && undefined} over a ghost iconOnly CdsButton `shrink-0`
//     (tooltip false) whose icon is the KV ring (track alpha-2; alpha-4 once sized); a sized ring sits in Fa.
// Host adapters: the menus stay the composer's SourceMenu / SourcePopover (main.jsx onMenu), so each trigger carries
// menuTriggerProps instead of the Base UI Menu / Popover trigger; the triggers keep the local hook classes main.jsx's
// chords and slash commands query (.sc-permission / .sc-model-trigger / .sc-effort-trigger / .sc-usage-trigger) and the
// accessible names "Permission mode" / "Model" the local automation reads; effort stays its own trigger beside the model
// (the official row folds it into the CDS ModelSelector) and takes the row's DK like the selector it belongs to.
import React, { useId } from "react";
import { CdsButton, CdsTooltip, cdsClassNames } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { ModeTriggerLabel, rowModelTriggerClass } from "./generated/code-composer/composer-row-chin.mjs";
import { UsageRing } from "./generated/code-composer/usage-ring.mjs";
import { composerChinTrailingClass, composerRingSlotClass, composerRowControlClass, composerRowLeadingClass, composerRowTrailingInsetClass } from "./generated/code-composer/composer-tokens.mjs";
import { contextRingTrack } from "./context-usage-model.mjs";

// bQ `Ot` (row): the slot the mode picker sits in.
export const ROW_CHIN_LEADING_CLASS = `${composerRowLeadingClass} ${composerRowControlClass}`;
// bQ's trailing: `Bo(Va, "gap-1", Le && Sg, Le && "compact:me-1")`.
export const chinTrailingClass = (row) => cdsClassNames(composerChinTrailingClass, "gap-1", row && composerRowControlClass, row && composerRowTrailingInsetClass);
// shared-5 Kd (lc.Chin) inner row: the chin's ghost buttons read secondary and normal weight (the pressed one keeps its
// accent). The host chin box stands in for Kd until the CDS ChatComposer shell lands (composer-shell); these two classes
// are Kd's own, so the CDS triggers inside it get the official tone.
export const CHIN_BUTTON_TONE_CLASS = "[&_[data-cds=Button]:not([aria-pressed=true])]:text-secondary [&_[data-cds=Button]]:font-normal";
// vQ / tQ.
export const MODE_TRIGGER_WRAP_CLASS = "inline-flex min-w-0";
export const MODE_TRIGGER_CLASS = "min-w-0 shrink";
// shared-7 ModelSelector pill trigger: `gl(ax, className)` and the fast tier `gl("text-muted", ox, "ms-1")`.
export const MODEL_PILL_CLASS = "min-w-0 max-w-full";
export const MODEL_PILL_FAST_CLASS = "text-muted @max-[280px]:hidden ms-1";
// The highest effort level's tail reads purple (user decision 2026-10-18), in the menu row's 'text-pro font-medium'.
export const MODEL_PILL_TOP_EFFORT_CLASS = "text-pro font-medium @max-[280px]:hidden ms-1";
export const MODEL_PILL_LOADING_CLASS = "flex min-w-0 items-center gap-xs";
// c8e04f916 EffortControl trigger.
export const EFFORT_TRIGGER_CLASS = "min-w-0 shrink-0";

/** tQ's trigger in vQ: the mode picker (its menu is the composer's permission menu). */
export function ComposerModeTrigger({ tooltip, shortcut, tooltipOpen, label, warning = false, description, disabled = false, className, ...props }) {
  const descriptionId = useId();
  // tQ `y = a ? void 0 : m`: a disabled trigger drops the description (and rQ the warning tone).
  const described = disabled ? undefined : description;
  return <span className={MODE_TRIGGER_WRAP_CLASS}>
    <CdsTooltip content={tooltip} shortcut={tooltip === undefined ? undefined : shortcut} open={tooltipOpen}>
      <CdsButton variant="ghost" className={cdsClassNames(MODE_TRIGGER_CLASS, className)} disabled={disabled}
        aria-describedby={described ? descriptionId : undefined} {...props}>
        <ModeTriggerLabel warning={warning && !disabled} description={described} descriptionId={descriptionId}>{label}</ModeTriggerLabel>
      </CdsButton>
    </CdsTooltip>
  </span>;
}

/** _Q: while the mode loads, the label keeps its width invisibly under a skeleton bar; the sr-only name reads instead. */
export function ModeTriggerLoadingLabel({ label, name }) {
  return <span className="relative block">
    <span className="sr-only">{name}</span>
    <span aria-hidden="true" className="invisible">{label}</span>
    {/* `D(Io, {decorative: !0, as: "span", className: "absolute inset-0 flex items-center", children: D(Xa, {className:
        "w-full"})})`: the CDS skeleton pieces are not in the view-tabs graph, so the host skeleton bar stands in. */}
    <span aria-hidden="true" className="absolute inset-0 flex items-center">
      <span data-cds="Skeleton" className="smenu-skeleton sc-permission-skeleton w-full" />
    </span>
  </span>;
}

/** The model selector's pill trigger (its menu is the composer's model menu, side top / align end like LK's). */
// shared-7 pill (:5630-5700): with the effort in the model menu (thinkingStyle not "separate"), the chosen level rides as
// the pill's tail word `gl(V, ox, B)` after the fast tier (V text-muted without a color preference).
export function ComposerModelTrigger({ row = false, name, fastLabel = null, effortLabel = null, effortTop = false, loading = false, loadingLabel, className, ...props }) {
  return <CdsButton variant="ghost" data-cds="ModelSelector" className={cdsClassNames(MODEL_PILL_CLASS, row && rowModelTriggerClass, className)} {...props}>
    {loading
      ? <span className={MODEL_PILL_LOADING_CLASS}><span className="sc-spinner" aria-hidden="true" /><span className="truncate">{loadingLabel}</span></span>
      : <span className="truncate">{name}{fastLabel ? <span className={cdsClassNames(MODEL_PILL_FAST_CLASS, "sc-fast-label")}>{" "}{fastLabel}</span> : null}{effortLabel ? <span className={cdsClassNames(effortTop ? MODEL_PILL_TOP_EFFORT_CLASS : MODEL_PILL_FAST_CLASS, "sc-effort-tail")} data-top-tier={effortTop ? "" : undefined}>{" "}{effortLabel}</span> : null}</span>}
  </CdsButton>;
}

/** EffortControl's trigger (its popover is the composer's effort slider). */
export function ComposerEffortTrigger({ row = false, tooltip, tooltipOpen, label, className, ...props }) {
  return <CdsTooltip content={tooltip} open={tooltipOpen}>
    <CdsButton variant="ghost" data-cds="ModelSelectorEffort" className={cdsClassNames(EFFORT_TRIGGER_CLASS, row && rowModelTriggerClass, className)} {...props}>
      <span className="min-w-0 truncate">{label}</span>
    </CdsButton>
  </CdsTooltip>;
}

/** yZ's trigger: the context ring button (its popover is the composer's usage popover). */
export function ComposerUsageRing({ pct = 0, ringSize, tooltip, detail, tooltipOpen, className, ...props }) {
  const trigger = <CdsTooltip content={tooltip} detail={detail ?? undefined} open={tooltipOpen}>
    <CdsButton variant="ghost" tooltip={false} className={cdsClassNames("shrink-0", className)} iconOnly
      icon={<UsageRing pct={pct} trackStroke={contextRingTrack(ringSize)} size={ringSize} />} {...props} />
  </CdsTooltip>;
  return ringSize === undefined ? trigger : <span className={composerRingSlotClass}>{trigger}</span>;
}
