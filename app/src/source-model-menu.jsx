import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceSwitch as SettingSwitch } from "./source-switch.jsx";
import { SourceMenu } from "./source-menu";
import { SourceTooltip } from "./source-tooltip";
import { CdsBadge, CdsHiddenReasonText } from "./generated/view-tabs/index.js";
import { effortId, effortName, filterModels, isHighestEffort, modelMenuSections, shapeModelCatalog } from "./model-menu-model.mjs";
import "./source-model-menu.css";
import { t } from "../electron/i18n/index.mjs";

const modelKey = (model) => model.model || model.id;
const modelName = (model) => model.displayName || model.name || modelKey(model);

/** Code's CDS ModelSelector: current 2.2553.1 shared-14 FS → AS/kS → $.Popup
 * (data-cds ModelSelector, max-w min(26rem, available width)) over the shared
 * SourceMenu primitive. The primary/overflow split and the Fast decision are
 * model-menu-model.mjs modelMenuSections (first four, explicit catalog
 * sections first). Rows follow bS: main rows show descriptions, digit rows
 * carry a 16px trailing slot holding the accent Check or the digit, and the
 * name carries the catalog badge (pS: e.badge.message) or, from shapeModelCatalog (c593f7513 lp), 'Default' on the
 * model new sessions use (defaultModel) and a disabled 'Unsupported model' row for a current model the catalog
 * no longer lists.
 * Codex's Model type has no disabled/disabled_reason field, so no row is ever
 * disabled from the live catalog; the optional fields are read only if present.
 * The Fast section (ES) renders only for a model with a Fast tier.
 * Every core's menu reads like Code's Claude catalog (2.31226.0 shared-8 Mk/Rk with
 * Claude Code's chin catalog, which carries no descriptions): one-line rows, the
 * digit/Check slot, "More models", then the "Fast mode" header and switch rows.
 * Catalog descriptions (Codex model and service-tier descriptions) move to the
 * right-side multiline tooltip Mk/Ik use for tooltip content, and to
 * aria-description, instead of a second line. Several faster tiers (Codex Fast,
 * Ultrafast) are mutually exclusive switch rows under the same header.
 */
const hasText = (value) => typeof value === "string" && value.trim() !== "";
const withTip = (content, item) => hasText(content)
  ? <SourceTooltip content={content} side="right" multiline hoverable={false}><div role="none" className="sm-model-tip">{item}</div></SourceTooltip>
  : item;
/** 3.6556.2 shared-7-DBAgAi5H yw → _w `unavailable`: a disabled Fast tier (catalog `disabled`, `disabled_reason`,
 * `selection_notice.cta` — nw) is greyed with its reason unless it is the tier that is on; with an intent handler
 * (onIntent, source "fast_mode") its selection-notice CTA replaces the greying. An available tier (the host's Codex /
 * DeepSeek tiers carry none of these fields) has no `unavailable`. */
export function fastRowUnavailable(tier, { on = false, model, onIntent } = {}) {
  if (!tier?.disabled) return undefined;
  const blocked = !on;
  const cta = blocked && onIntent ? tier.selection_notice?.cta ?? undefined : undefined;
  return {
    reason: tier.disabled_reason?.message || undefined,
    greyed: blocked && !cta,
    cta: cta ? { copy: cta.copy, onActivate: () => onIntent?.({ cta, model, source: "fast_mode" }) } : undefined,
  };
}
/** 3.6556.2 c227f4d5e R$ `fastModeUnavailableRow` (b = {type, line, reason, cta:{copy, intent, run}, onShown}): the
 * catalog's fast tier becomes `disabled` with `disabled_reason {type, message: reason}`, its options lose their badge
 * and read the row's `line` as their description, and the row's CTA is its `selection_notice`
 * (`selection_notice:U===void 0||W===void 0?null:{cta:{copy:U,intent:W}}`); the switch shows off (`_e=_&&!b?"fast":"off"`),
 * a toggle does nothing (`ve=b?Wt:v`) and the CTA runs `b.cta.run` (`onFastModeCta:be`, shared-8 st → `source==="fast_mode"`).
 * The host's own Codex / DeepSeek tiers never carry a row (no blocked-fast data source), so this is null by default. */
export function applyFastUnavailableRow(tier, row) {
  if (!tier || !row) return tier;
  const cta = row.cta;
  return { ...tier, badge: undefined, description: undefined, line: row.line, disabled: true,
    disabled_reason: { type: row.type, message: row.reason },
    selection_notice: cta?.copy === undefined || cta?.intent === undefined ? null : { cta: { copy: cta.copy, intent: cta.intent } } };
}
/** shared-7 $C / ew: a badge variant outside neutral / accent / warning reads neutral. */
const BADGE_VARIANTS = new Set(["neutral", "accent", "warning"]);
export const badgeVariant = (variant) => BADGE_VARIANTS.has(variant) ? variant : "neutral";
/** shared-7 rw: the name's xxs CdsBadge; a warning badge carries the Warning icon over a truncating span. */
function NameBadge({ badge }) {
  return badge.variant === "warning"
    ? <CdsBadge variant="warning" size="xxs" icon="Warning" className="min-w-0 shrink"><span className="truncate">{badge.message}</span></CdsBadge>
    : <CdsBadge variant={badgeVariant(badge.variant)} size="xxs" truncate>{badge.message}</CdsBadge>;
}
/** shared-7 iw (no catalog tooltip on the host, so no trailing Info icon): the truncating name, then its badge (rw). */
function ModelName({ name, badge, className = "sm-model-name", labelClassName = "sm-model-label" }) {
  return <span className={className}><span className={labelClassName}>{name}</span>
    {typeof badge?.message === "string" && badge.message ? <NameBadge badge={badge} /> : null}</span>;
}
/** 3.6556.2 shared-7-DBAgAi5H _w over aw: a CTA row drops the checkbox role and trails the accent xxs CTA badge, and a
 * non-warning name badge turns neutral (`c&&r&&r.variant!=="warning"?{...r,variant:"neutral"}:r`); a greyed row is
 * disabled. Any `unavailable` row sits in a wrapper (`wrapForDisabled:E`) next to the hidden mirror span
 * (CdsHiddenReasonText `ie`, `mirrorId:d`) that the item names in aria-describedby (`d=s?.reason?u:void 0`), under the
 * right-side multiline tooltip of the reason (or the tier's own tooltip) — one that stays open on press when greyed
 * (`staysOnPress:l`). The host shows the tier description as that tooltip (one-line rows), the row's line below. */
function FastRow({ tier, label, checked, onToggle, unavailable, tooltipContent, disabled = false, busy = false }) {
  const mirrorId = useId();
  const cta = unavailable?.cta, greyed = unavailable?.greyed ?? false;
  const describedBy = unavailable?.reason ? mirrorId : undefined;
  const badge = cta && tier.badge && tier.badge.variant !== "warning" ? { ...tier.badge, variant: "neutral" } : tier.badge;
  const item = <SourceMenu.Item className="sm-model-item sm-model-fast"
    {...(cta ? {} : { role: "menuitemcheckbox", "aria-checked": checked })}
    label={label} data-speed={tier.key} keepOpen={!cta} disabled={disabled || greyed} aria-describedby={describedBy}
    aria-busy={busy || undefined} data-fast-unavailable={cta ? "cta" : greyed ? "greyed" : undefined}
    trailing={cta ? <CdsBadge variant="accent" size="xxs" truncate>{cta.copy}</CdsBadge> : <SettingSwitch checked={checked} decorative />}
    onClick={() => { if (greyed) return; if (cta) cta.onActivate(); else onToggle(); }}>
    <span className="sm-fast-copy"><ModelName name={label} badge={badge} className="sm-fast-name" labelClassName="sm-fast-label" />
      {hasText(tier.line) ? <span className="sm-fast-description">{tier.line}</span> : null}</span>
  </SourceMenu.Item>;
  const content = unavailable?.reason || tooltipContent;
  if (!content) return item;
  return <SourceTooltip content={content} side="right" multiline hoverable={false} {...(greyed ? { closeOnClick: false } : {})}>
    <div role="none" className="sm-model-tip">{item}{describedBy ? <CdsHiddenReasonText id={mirrorId} reason={content} /> : null}</div>
  </SourceTooltip>;
}
const tierLabel = (tier) => tier.key === "fast" ? t("Enable fast mode")
  : tier.key === "ultrafast" ? t("Enable ultrafast mode")
  : t("Enable {speed} mode", { speed: tier.name.toLowerCase() });
export function SourceModelMenu({
  anchor, models = [], selected, onSelect, onClose, fastTier, fastMode = false, fastDisabled = false,
  fastSaving = false, onFastModeChange, initialHighlight, scopeNote = null,
  // Several faster tiers (Fast, Ultrafast): one switch row each under "Fast mode", mutually exclusive.
  speedTiers = [], speed = "standard", onSpeedChange, defaultModel = null, onFastIntent,
  // effort {levels, value, onPick}: the environment bar folds the effort into the model trigger (x6 modelMenu "bar",
  // showEffortSection), so its menu carries the shared-7 yx effort section.
  effort = null,
  // w13-close-chat-composer: Chat's thinking rows (chatfn-39) moved with the Chat menu to source-chat-model-menu.jsx
  // (shared-8 $H → KH, shared-28 gE / hE); this is Code's menu only.
  // E21: opened from the Effort chord in the row / titlebar placement (c227f4d5e Q6 `T=y==="effort"||w&&x&&p`), the
  // Effort submenu starts open on the current level.
  effortOpen = false,
  // c227f4d5e R$ fastModeUnavailableRow ({type, line, reason, cta:{copy, intent, run}, onShown}); none on the host.
  fastUnavailableRow = null,
}) {
  const blockedRow = fastUnavailableRow && typeof fastUnavailableRow === "object" ? fastUnavailableRow : null;
  // R$ `zn(t&&b!==void 0,te)`: an open menu with a row reports it once.
  useEffect(() => { if (blockedRow) blockedRow.onShown?.(); }, [blockedRow]);
  const severalSpeeds = Array.isArray(speedTiers) && speedTiers.length > 1 && !!onSpeedChange;
  const shaped = useMemo(() => shapeModelCatalog({ models, selected, defaultModel }), [models, selected, defaultModel]);
  const { primary, overflow, showFast, searchable } = useMemo(() => modelMenuSections({ models: shaped, fastTier, selected }), [shaped, fastTier, selected]);
  const primaryDigits = useMemo(() => {
    const digits = new Map();
    let digit = 1;
    primary.forEach((model) => {
      if (!model.disabled && digit <= 9) digits.set(modelKey(model), digit++);
    });
    return digits;
  }, [primary]);
  const pick = (model) => {
    if (modelKey(model) !== selected) onSelect?.(model);
  };
  const row = (model, main) => {
    const id = modelKey(model), active = id === selected, digit = main ? primaryDigits.get(id) : undefined;
    // lp c: the unsupported current model stays checked but disabled (Sk: no digit for a deprecated row).
    const disabled = !!model.disabled && (!active || !!model.unsupported);
    const description = hasText(model.description) ? model.description : undefined;
    const trailing = digit !== undefined
      ? <span className="sm-model-trailing" aria-hidden="true">{active
          ? <Icon name="Check" size={16} weight="strong" />
          : <span className="sm-model-digit">{digit}</span>}</span>
      : undefined;
    return withTip(disabled ? undefined : description, <SourceMenu.Item key={id} className="sm-model-item" label={modelName(model)}
      aria-description={description} disabled={disabled} disabledReason={disabled ? model.disabled_reason?.message : undefined}
      checked={digit !== undefined ? undefined : active} checkedRole="radio"
      {...(digit !== undefined ? { role: "menuitemradio", "aria-checked": active, "aria-keyshortcuts": String(digit) } : {})}
      data-model-id={id} digit={digit}
      trailing={trailing} onClick={() => pick(model)}>
      <ModelName name={modelName(model)} badge={model.badge} />
    </SourceMenu.Item>);
  };

  return <SourceMenu.Popup anchor={anchor} side="top" align="end" label={t("Models")} dataCds="ModelSelector"
    className="sm-model-menu" onClose={onClose} initialHighlight={initialHighlight}>
    <SourceMenu.Group>{primary.map((model) => row(model, true))}</SourceMenu.Group>
    {!primary.length && !overflow.length && <div className="sm-model-empty" role="status">{t("No models available")}</div>}
    {effort ? <EffortSection {...effort} open={effortOpen} /> : null}
    {overflow.length > 0 && <>
      <SourceMenu.Separator />
      <SourceMenu.Submenu>
        <SourceMenu.SubmenuTrigger className="sm-model-item" label={t("More models")}>{t("More models")}</SourceMenu.SubmenuTrigger>
        {searchable
          ? <OverflowSearch overflow={overflow} row={row} pick={pick} onClose={onClose} />
          : <SourceMenu.Popup label={t("More models")} dataCds="ModelSelector" className="sm-model-menu sm-model-submenu">
              <SourceMenu.Group>{overflow.map((model) => row(model, false))}</SourceMenu.Group>
            </SourceMenu.Popup>}
      </SourceMenu.Submenu>
    </>}
    {showFast && (severalSpeeds || onFastModeChange) && <>
      <SourceMenu.Separator />
      <SourceMenu.Header className="sm-model-header">{t("Fast mode")}</SourceMenu.Header>
      {(severalSpeeds ? speedTiers : [{ ...fastTier, key: fastTier?.key ?? "fast" }]).map((catalogTier) => {
        const tier = applyFastUnavailableRow(catalogTier, blockedRow);
        const on = !blockedRow && (severalSpeeds ? speed === tier.key : fastMode);
        const toggle = () => { if (blockedRow) return; if (severalSpeeds) onSpeedChange(on ? "standard" : tier.key); else onFastModeChange(!fastMode); };
        // yw → _w: the tier's unavailable form (CTA, greyed, or a reason on an available-looking row).
        const unavailable = fastRowUnavailable(tier, { on, model: selected, onIntent: blockedRow ? () => blockedRow.cta?.run?.() : onFastIntent });
        return <FastRow key={tier.key} tier={tier} label={tierLabel(tier)} checked={on} onToggle={toggle} unavailable={unavailable}
          tooltipContent={hasText(tier.description) ? tier.description : undefined} disabled={fastDisabled} busy={fastSaving} />;
      })}
    </>}
    {scopeNote && <div className="sm-model-scope" data-model-scope="">{scopeNote}</div>}
  </SourceMenu.Popup>;
}

/** shared-7 yx (thinkingStyle unset, as c227f4d5e AK gives the chin placement): after the model group, a separator
 * and an "Effort" submenu whose trigger hints the current level (P?.name; none for a warning badge) and whose popup
 * lists the levels as fx rows — radio-checked items (data-effort-id) with the level description (not for a warning
 * badge), the name with its badge (nx) and ultracode in "text-pro font-medium" — then dx, the selected warning
 * level description as a text-warning header. The host has no catalog thinking.description header.
 * open (E21): ww `ee = f===!0&&Y!=="separate"`, `[X,te]=F(ee)`, `ne=X!==null` — the submenu is `defaultOpen:ne,
 * closeParentOnEsc:ne` and gw focuses `ie=(U??R[0])?.id` (the checked level, else the first); closing it drops ne
 * (`onOpenChange:e=>{e||te(null)}`), so a later hover open is a plain one. */
function EffortSection({ levels = [], value, onPick, open = false }) {
  const [levelFocus, setLevelFocus] = useState(!!open);
  const options = (levels || []).map((level) => {
    const id = effortId(level);
    return { id, name: effortName(id, levels), description: typeof level === "object" ? level.description : undefined, badge: typeof level === "object" ? level.badge : undefined };
  }).filter((option) => option.id);
  if (!options.length) return null;
  const selected = options.find((option) => option.id === value);
  const warning = selected?.badge?.variant === "warning";
  return <>
    <SourceMenu.Separator />
    <SourceMenu.Submenu defaultOpen={levelFocus} closeParentOnEsc={levelFocus} onOpenChange={(next) => { if (!next) setLevelFocus(false); }}>
      <SourceMenu.SubmenuTrigger className="sm-model-item" label={t("Effort")} hint={warning ? undefined : selected?.name}>{t("Effort")}</SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={t("Effort")} dataCds="ModelSelector" className="sm-model-menu sm-model-submenu" initialHighlight={levelFocus ? "checked" : undefined}>
        <SourceMenu.Group>{options.map((option) => {
          const optionWarning = option.badge?.variant === "warning";
          return <SourceMenu.Item key={option.id} className="sm-model-item" label={option.name} checked={option.id === value} checkedRole="radio"
            data-effort-id={option.id} description={optionWarning || !hasText(option.description) ? undefined : option.description}
            onClick={() => onPick?.(option.id)}>
            <ModelName name={option.name} badge={option.badge} labelClassName={isHighestEffort(option.id, options) ? "sm-model-label text-pro font-medium" : "sm-model-label"} />
          </SourceMenu.Item>;
        })}</SourceMenu.Group>
        {warning && hasText(selected.description) && <SourceMenu.Header className="sm-model-header whitespace-normal font-normal text-warning">{selected.description}</SourceMenu.Header>}
      </SourceMenu.Popup>
    </SourceMenu.Submenu>
  </>;
}

/** shared-8 Hk overflowSearch: a long catalog (OpenCode with OpenRouter: 400+ models) keeps its capped main list
 * and searches inside the "More models" child (vo searchLabel "Search models", rows filtered by yk, "No matches").
 * Enter picks the first match; Escape clears the query before it closes the child. */
function OverflowSearch({ overflow, row, pick, onClose }) {
  const [query, setQuery] = useState(""), searchRef = useRef(null);
  const searching = query.trim() !== "";
  const shown = useMemo(() => (searching ? filterModels(overflow, query) : overflow), [searching, overflow, query]);
  useEffect(() => { const timer = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0); return () => clearTimeout(timer); }, []);
  const keyDown = (event) => {
    if (event.target !== searchRef.current || event.nativeEvent?.isComposing) return;
    if (event.key === "Enter" && searching) { event.preventDefault(); if (shown[0]) { pick(shown[0]); onClose?.(); } }
    else if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); setQuery(""); }
  };
  return <SourceMenu.Popup label={t("More models")} dataCds="ModelSelector" className="sm-model-menu sm-model-submenu" initialHighlight={null} onKeyDown={keyDown}>
    <div className="sm-model-search">
      <Icon name="Search" size={14} aria-hidden="true" />
      <input ref={searchRef} type="text" className="sm-model-search-input cds-reset" aria-label={t("Search models")} placeholder={t("Search models")}
        value={query} spellCheck={false} autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
    </div>
    {shown.length > 0
      ? <SourceMenu.Group>{shown.map((model) => row(model, false))}</SourceMenu.Group>
      : <div className="sm-model-empty" role="status">{t("No matches")}</div>}
  </SourceMenu.Popup>;
}
