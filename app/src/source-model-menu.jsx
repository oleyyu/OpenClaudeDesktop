import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceSwitch as SettingSwitch } from "./source-switch.jsx";
import { SourceMenu } from "./source-menu";
import { SourceTooltip } from "./source-tooltip";
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
const tierLabel = (tier) => tier.key === "fast" ? t("Enable fast mode")
  : tier.key === "ultrafast" ? t("Enable ultrafast mode")
  : t("Enable {speed} mode", { speed: tier.name.toLowerCase() });
export function SourceModelMenu({
  anchor, models = [], selected, onSelect, onClose, fastTier, fastMode = false, fastDisabled = false,
  fastSaving = false, onFastModeChange, initialHighlight, scopeNote = null,
  // Several faster tiers (Fast, Ultrafast): one switch row each under "Fast mode", mutually exclusive.
  speedTiers = [], speed = "standard", onSpeedChange, defaultModel = null,
  // effort {levels, value, onPick}: the environment bar folds the effort into the model trigger (x6 modelMenu "bar",
  // showEffortSection), so its menu carries the shared-7 yx effort section.
  effort = null,
}) {
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
      <span className="sm-model-name"><span className="sm-model-label">{modelName(model)}</span>{typeof model.badge?.message === "string" && model.badge.message && <span className="sm-model-badge">{model.badge.message}</span>}</span>
    </SourceMenu.Item>);
  };

  return <SourceMenu.Popup anchor={anchor} side="top" align="end" label={t("Models")} dataCds="ModelSelector"
    className="sm-model-menu" onClose={onClose} initialHighlight={initialHighlight}>
    <SourceMenu.Group>{primary.map((model) => row(model, true))}</SourceMenu.Group>
    {!primary.length && !overflow.length && <div className="sm-model-empty" role="status">{t("No models available")}</div>}
    {effort && <EffortSection {...effort} />}
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
      {(severalSpeeds ? speedTiers : [{ ...fastTier, key: fastTier?.key ?? "fast" }]).map((tier) => {
        const on = severalSpeeds ? speed === tier.key : fastMode;
        const toggle = () => severalSpeeds ? onSpeedChange(on ? "standard" : tier.key) : onFastModeChange(!fastMode);
        return <React.Fragment key={tier.key}>{withTip(tier.description, <SourceMenu.Item className="sm-model-item sm-model-fast" role="menuitemcheckbox" aria-checked={on}
          aria-description={hasText(tier.description) ? tier.description : undefined} label={tierLabel(tier)} data-speed={tier.key}
          keepOpen disabled={fastDisabled} aria-busy={fastSaving || undefined}
          trailing={<SettingSwitch checked={on} decorative />} onClick={toggle}>
          <span className="sm-fast-copy"><span className="sm-fast-name"><span className="sm-fast-label">{tierLabel(tier)}</span></span></span>
        </SourceMenu.Item>)}</React.Fragment>;
      })}
    </>}
    {scopeNote && <div className="sm-model-scope" data-model-scope="">{scopeNote}</div>}
  </SourceMenu.Popup>;
}

/** shared-7 yx (thinkingStyle unset, as c227f4d5e AK gives the chin placement): after the model group, a separator
 * and an "Effort" submenu whose trigger hints the current level (P?.name; none for a warning badge) and whose popup
 * lists the levels as fx rows — radio-checked items (data-effort-id) with the level description (not for a warning
 * badge), the name with its badge (nx) and ultracode in "text-pro font-medium" — then dx, the selected warning
 * level description as a text-warning header. The host has no catalog thinking.description header. */
function EffortSection({ levels = [], value, onPick }) {
  const options = (levels || []).map((level) => {
    const id = effortId(level);
    return { id, name: effortName(id, levels), description: typeof level === "object" ? level.description : undefined, badge: typeof level === "object" ? level.badge : undefined };
  }).filter((option) => option.id);
  if (!options.length) return null;
  const selected = options.find((option) => option.id === value);
  const warning = selected?.badge?.variant === "warning";
  return <>
    <SourceMenu.Separator />
    <SourceMenu.Submenu>
      <SourceMenu.SubmenuTrigger className="sm-model-item" label={t("Effort")} hint={warning ? undefined : selected?.name}>{t("Effort")}</SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={t("Effort")} dataCds="ModelSelector" className="sm-model-menu sm-model-submenu">
        <SourceMenu.Group>{options.map((option) => {
          const optionWarning = option.badge?.variant === "warning";
          return <SourceMenu.Item key={option.id} className="sm-model-item" label={option.name} checked={option.id === value} checkedRole="radio"
            data-effort-id={option.id} description={optionWarning || !hasText(option.description) ? undefined : option.description}
            onClick={() => onPick?.(option.id)}>
            <span className="sm-model-name"><span className={isHighestEffort(option.id, options) ? "sm-model-label text-pro font-medium" : "sm-model-label"}>{option.name}</span>
              {typeof option.badge?.message === "string" && option.badge.message && <span className="sm-model-badge">{option.badge.message}</span>}</span>
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
