// composer-row-chin: the chin triggers of the Code composer and the row layout an open session's presets chin takes, as
// Claude Desktop 4.16336.0 draws them: c73f45bc3 $x(e, "row") → c227f4d5e X6 (export g) `layout: "row"` (aS), the chin
// of the generated 4.16336.0 shell (generated/code-composer-v4 ChatComposerParts.Chin = shared-5 jp). Everything here is the
// official DOM over the cds-core CDS components (the v4 Chin provides cds-core's CdsButtonIconSizeContext, so its triggers
// are cds-core's, D1) and the generated 4.16336.0 originals (c227f4d5e j6 ModeTriggerLabel, Wz rowModelTriggerClass, the
// shared-8 RZ ring, the shared-38 tokens), which scripts/extract-code-composer.mjs (contract4, composer-row-chin.mjs chunk
// pins: inComposerRow / effortInModelMenu / "compact:me-1" / EngineFooterStrip / J6's call) holds to the shipped text:
//   - X6 row (tt = layout === "row"): leading `Sn = tt ? ln && p("span", {"aria-hidden": !0})` — the mode picker left the
//     leading slot; the trailing is `p("div", {className: Be(fp, "gap-1", Nn, Pn)})` (fp = shared-38 $t, Nn = the 24px
//     control / 6px pad / 13px-20px body variables = shared-38 ar, Pn = "compact:me-1" = shared-38 Wr) holding, in order,
//     [En footerIndicator, Ee trailingLeadAccessory, dn renderModelSelector({placement: "row"}), Dn modelBadge, On = tt ? ln
//     (the mode picker) : null, Te rightAccessory, kn = hideContextRing ? null : w3 (the usage ring), xn (the Fast mode
//     sr-only status + Q6 announcement), An L6]; the chin is `tl.Chin {className: Mn = tt ? mp (shared-38 en "-mt-1.5
//     -mb-2.5 md:-my-2"), leading: Sn, trailing: In, children: [Tn EngineFooterStrip, ke statusSlot, Ae chinNote]}`.
//     Outside the row (the classic chin) the trailing is `Be(fp, "gap-1")` and the leading holds the mode picker.
//   - Y6 → k6: `span.inline-flex.min-w-0` (anchorRef) > CdsTooltip {content: tooltip === !1 ? void 0 : tooltip ?? header,
//     shortcut: tooltip === !1 ? void 0 : triggerKey, open: !open && void 0} > Menu.Trigger > ghost CdsButton
//     "min-w-0 shrink" (aria-describedby while described) > j6 (warning tone / description dropped while disabled). While
//     the mode loads X6 passes `label: p(J6, {label: en, name: Qt})`: J6 is `span.relative.block` > [sr-only name,
//     span[aria-hidden][data-placeholder-label] "invisible before:content-[attr(data-placeholder-label)]",
//     CdsLoadingSkeleton {decorative, as: "span", className: "absolute inset-0 flex items-center"} > CdsSkeleton "w-full"].
//   - the ModelSelector pill (renderModelSelector, placement "row"): a ghost CdsButton data-cds="ModelSelector",
//     `min-w-0 max-w-full` + Wz `text-secondary` in the row, the name in a `truncate` span with the fast tier in
//     `text-muted @max-[280px]:hidden ms-1`; loading: `flex min-w-0 items-center gap-xs` with a spinner and the label.
//     X6 `St = tt || et`: in the row the effort is in the model menu (effortInModelMenu) and rides as the pill's tail.
//   - w3 → O3: CdsTooltip {content, detail, open: !open && void 0} over a ghost iconOnly CdsButton (tooltip false)
//     "shrink-0" — 4.16336.0 dropped 3.6556.2's non-row `me-px` — whose icon is the RZ ring `{pct, trackStroke: l ?
//     "var(--cds-alpha-3)" : "var(--cds-alpha-2)", stroke, size: 14}`; in the composer row (`inComposerRow: tt`) the
//     trigger sits in `span.gp` (shared-38 lr "flex shrink-0 ms-px").
// Host adapters (the X6 stops of surfaces-prod-3/composer/prep chinBoundary): the menus stay the composer's SourceMenu /
// SourcePopover (main.jsx onMenu) in place of W6's picker state and the Base UI Menu / Popover triggers, so each trigger
// carries menuTriggerProps; the usage popover is the host's (w3's popover body); there is no dictation ($6), no + in the
// row (wJ), no EngineFooterStrip (C6), no coordinator toggle (O6), no rail keys (L6). The triggers keep the local hook
// classes main.jsx's chords and slash commands query (.sc-permission / .sc-model-trigger / .sc-effort-trigger /
// .sc-usage-trigger) and the accessible names "Permission mode" / "Model" the local automation reads; outside Code the
// effort stays its own trigger beside the model (X6 folds it into the selector only in the row / titlebar layouts).
import React, { useId } from "react";
import { CdsButton, CdsLoadingSkeleton, CdsSkeleton, CdsSpinner, CdsTooltip, cdsClassNames } from "./cds-core.mjs";
import { ModeTriggerLabel, rowModelTriggerClass } from "./generated/code-composer-v4/composer-row-chin.mjs";
import { UsageRing } from "./generated/code-composer-v4/usage-ring.mjs";
import { composerChinTrailingClass, composerRingSlotClass, composerRowControlClass, composerRowTrailingInsetClass } from "./generated/code-composer-v4/composer-tokens.mjs";

// X6 row leading: `Sn = tt ? ln && p("span", {"aria-hidden": !0})` — an empty aria-hidden span while there is a mode picker.
export function RowChinLeading({ shown }) {
  return shown ? <span aria-hidden="true" /> : null;
}
// X6's trailing: `Be(fp, "gap-1", Nn, Pn)` with Nn / Pn only in the row.
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

/** Y6 → k6: the mode picker (its menu is the composer's permission menu). `tooltip` false drops the tooltip. */
export function ComposerModeTrigger({ tooltip, header, shortcut, tooltipOpen, label, warning = false, description, disabled = false, className, ...props }) {
  const descriptionId = useId();
  // k6 `C = v ? void 0 : g`: a disabled trigger drops the description (and j6 the warning tone).
  const described = disabled ? undefined : description;
  // k6 `D = i === !1 ? void 0 : (i ?? n)`, `O = i === !1 ? void 0 : r`.
  const content = tooltip === false ? undefined : (tooltip ?? header);
  return <span className={MODE_TRIGGER_WRAP_CLASS}>
    <CdsTooltip content={content} shortcut={tooltip === false ? undefined : shortcut} open={tooltipOpen}>
      <CdsButton variant="ghost" className={cdsClassNames(MODE_TRIGGER_CLASS, className)} disabled={disabled}
        aria-describedby={described ? descriptionId : undefined} {...props}>
        <ModeTriggerLabel warning={warning && !disabled} description={described} descriptionId={descriptionId}>{label}</ModeTriggerLabel>
      </CdsButton>
    </CdsTooltip>
  </span>;
}

/** J6: while the mode loads, the label keeps its width invisibly under a skeleton bar; the sr-only name reads instead. */
export function ModeTriggerLoadingLabel({ label, name }) {
  // J6 `p(U, {decorative: !0, as: "span", className: "absolute inset-0 flex items-center", children: p(q, {className:
  // "w-full"})})`, U = shared-frame Au (mg CdsLoadingSkeleton), q = shared-frame Ou (Eg CdsSkeleton), both cds-core's.
  return <span className="relative block">
    <span className="sr-only">{name}</span>
    <span aria-hidden="true" data-placeholder-label={label} className="invisible before:content-[attr(data-placeholder-label)]" />
    <CdsLoadingSkeleton decorative as="span" className="absolute inset-0 flex items-center">
      <CdsSkeleton className="w-full" />
    </CdsLoadingSkeleton>
  </span>;
}

/** The model selector's pill trigger (its menu is the composer's model menu, side top / align end like LK's). */
// shared-7 pill (:5630-5700): with the effort in the model menu (thinkingStyle not "separate"), the chosen level rides as
// the pill's tail word `gl(V, ox, B)` after the fast tier (V text-muted without a color preference).
export function ComposerModelTrigger({ row = false, name, fastLabel = null, effortLabel = null, effortTop = false, loading = false, loadingLabel, className, ...props }) {
  return <CdsButton variant="ghost" data-cds="ModelSelector" className={cdsClassNames(MODEL_PILL_CLASS, row && rowModelTriggerClass, className)} {...props}>
    {loading
      // W14-code css/composer/model-pill-spinner: shared-7's pill `i.loading && h(se, { size: "sm" })`, the CDS Spinner.
      ? <span className={MODEL_PILL_LOADING_CLASS}><CdsSpinner size="sm" /><span className="truncate">{loadingLabel}</span></span>
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

// 4.16336.0 c227f4d5e O3: the ring's size and its two tracks; the trigger is "shrink-0" in and out of the row (the
// 3.6556.2 non-row `me-px` inset is gone).
export const USAGE_RING_SIZE = 14;
export const USAGE_RING_ROW_TRACK = "var(--cds-alpha-3)";
export const USAGE_RING_TRACK = "var(--cds-alpha-2)";
export const usageRingTriggerClass = () => "shrink-0";

/** w3 → O3's trigger: the context ring button (its popover is the composer's usage popover). */
export function ComposerUsageRing({ pct = 0, inComposerRow = false, tooltip, detail, tooltipOpen, className, ...props }) {
  const trigger = <CdsTooltip content={tooltip} detail={detail ?? undefined} open={tooltipOpen}>
    <CdsButton variant="ghost" tooltip={false} className={cdsClassNames(usageRingTriggerClass(inComposerRow), className)} iconOnly
      icon={<UsageRing pct={pct} trackStroke={inComposerRow ? USAGE_RING_ROW_TRACK : USAGE_RING_TRACK} size={USAGE_RING_SIZE} />} {...props} />
  </CdsTooltip>;
  return inComposerRow ? <span className={composerRingSlotClass}>{trigger}</span> : trigger;
}
