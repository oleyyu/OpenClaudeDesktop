import React from 'react';
// w13-close-chat-composer (chatui-K4 menu, composer-shell-01; chatfn-39 thinking rows moved here): the Chat / Cowork
// card's model menu as 3.6556.2 builds it. The card's composer is shared-8 pG, whose model control is TU (=> bn): without
// a server CDS catalog (`ir(…).cdsCatalog`, the claude.ai bootstrap — never present for this local host, E59) TU renders
// $H (=> Tn), and $H's popup (`J.Popup {side: placement === "bottom" ? "top" : "bottom", sideOffset: 4, align: "end",
// className: ZH}`) holds KH:
//   - Se: the legacy header "{legacyModel} is no longer available. New replies will use {defaultModel}." when an open
//     conversation's model is not in the catalog ($H He); the checked row is then the default model.
//   - Ce: GH over the main models — in an open conversation (`se = !isNewConversation && !hideThinkingMenu`; Chat
//     never hides it) only the current model, else the catalog's main section. WH rows: CdsDropdown Item
//     {"data-testid": "model-selector-option", checked, checkedRole: "radio", description (GH's showDescription,
//     default true), children: span "inline-flex items-center gap-2 font-sans" [jH name with the version tail in
//     "text-muted-as-secondary", the catalog badge xxs "model-config-badge"]}; picking the checked row does nothing.
//   - we / Te: the thinking menu. With effort levels (`hasEffortOptions`) it is shared-28 wE (=> pa): a separator and the
//     "Effort" submenu (trigger "effort-menu-trigger" with the current level as its hint; popup align "end": the
//     "font-normal" header, TE level rows "effort-option-{id}" radio-checked with their badge, then gE's thinking rows);
//     without levels gE's rows sit after the model group (separator + hE rows).
//   - hE: Item {"data-testid": "thinking-mode-toggle", keepOpen, trailing: the switch (aria-label = the title),
//     children: span "block whitespace-normal" [span "block" title, span "mt-1 block text-footnote
//     text-muted-as-secondary" description]}.
//   - Ee: More models — a separator and a submenu ("model-selector-more-models", span "flex items-center gap-xs") whose
//     popup (QH) lists the remaining groups (open conversation: the other main models, then the overflow; new
//     chat: the overflow) with separators between them, without descriptions. KH searches inside it (SearchablePopup)
//     only for an Anthropic account (`ue = Lr(account)`, shared-52 sd: an @anthropic.com address), so here it is the
//     plain popup.
// Every class, test id and message comes from generated/chat-composer (scripts/extract-chat-composer.mjs). Host
// differences: the popup is the host menu (SourceMenu) anchored on the trigger, so the CdsDropdown root is not
// rendered; the card is docked at the bottom, so the side is "top"; there are no plan tags, notices, credits or
// capability conflicts locally (WH's tag / leading column / tooltip stay empty). E41: view-tabs from the concrete
// shared-frame file (this menu belongs to the composer graph).
import { CdsBadge } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { effortMenuMessages, modelSelector, modelSelectorMessages, modelSelectorPopupClass, modelSelectorSubmenuPopupClass, splitModelName } from './generated/chat-composer/model-selector.mjs';
import { effortId, effortName, modelMenuSections } from './model-menu-model.mjs';
import { SourceMenu } from './source-menu.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { t } from '../electron/i18n/index.mjs';

const message = descriptor => t(descriptor.defaultMessage);
const modelKey = model => model?.model || model?.id;
const modelName = model => model?.displayName || model?.name || modelKey(model) || '';
const hasText = value => typeof value === 'string' && value.trim() !== '';

/**
 * KH's grouping for a catalog: {legacy, current, main, more}. `legacy` is the open conversation's model id when the
 * catalog no longer lists it ($H He: `!!t && !r && de.length > 0 && !X(Ae)`), `current` the checked option (Ve: the
 * listed model, else the default model, else the first), `main` Ce's models and `more` Ee's non-empty groups.
 */
export function chatModelMenuGroups({ models = [], selected = null, defaultModel = null, isNewConversation = true } = {}) {
  const listed = (Array.isArray(models) ? models : []).filter(model => typeof modelKey(model) === 'string');
  const { primary, overflow } = modelMenuSections({ models: listed, selected });
  const find = id => listed.find(model => modelKey(model) === id) ?? null;
  const legacy = !isNewConversation && !!selected && listed.length > 0 && !find(selected) ? selected : null;
  const current = find(selected) ?? (legacy ? find(defaultModel) ?? listed[0] ?? null : null);
  const currentId = modelKey(current);
  const openConversation = !isNewConversation;
  const main = openConversation ? (current ? [current] : []) : primary;
  const more = (openConversation ? [primary, overflow].map(group => group.filter(model => modelKey(model) !== currentId)) : [overflow])
    .filter(group => group.length > 0);
  return { legacy, current, main, more };
}

/** jH with mutedSuffix (AH): the name, its version tail (kH) in the muted class. */
function RowName({ name }) {
  const { base, tail } = splitModelName(name);
  return tail ? <>{base}<span className={modelSelector.menu.mutedTailClass}>{` ${tail}`}</span></> : name;
}

/** shared-8 WH (no plan tag, notice or tooltip locally). */
function ModelRow({ model, checked, showDescription, onPick }) {
  const { menu } = modelSelector;
  const name = modelName(model);
  const disabled = !checked && !!model.disabled;
  const badge = typeof model.badge?.message === 'string' && model.badge.message ? model.badge : null;
  return <SourceMenu.Item data-testid={menu.row.testId} className="sm-model-item" label={name} checked={checked} checkedRole={menu.row.checkedRole}
    disabled={disabled} disabledReason={disabled ? model.disabled_reason?.message : undefined} data-model-id={modelKey(model)}
    description={showDescription && hasText(model.description) ? model.description : undefined}
    onClick={() => { if (!checked && !disabled) onPick?.(model); }}>
    <span className={menu.rowNameClass}><RowName name={name} />
      {badge && <CdsBadge variant={badge.variant} size={menu.badge.size} truncate data-testid={menu.badge.testId}>{badge.message}</CdsBadge>}</span>
  </SourceMenu.Item>;
}

/** shared-8 GH: one CdsDropdown Group of WH rows. */
function ModelGroup({ models, currentId, showDescription = true, onPick }) {
  return <SourceMenu.Group>{models.map(model => <ModelRow key={modelKey(model)} model={model} checked={modelKey(model) === currentId}
    showDescription={showDescription} onPick={onPick} />)}</SourceMenu.Group>;
}

/** shared-28 hE rows as gE lists them: every thinking mode but "off" / "standard"; a toggle picks it, or none. */
function ThinkingRows({ options = [], value, onToggle }) {
  const { thinkingRow } = modelSelector;
  return <>{options.filter(option => option.id !== 'off' && option.id !== 'standard').map(option => {
    const active = value === option.id;
    const toggle = () => onToggle?.(active ? 'off' : option.id);
    return <SourceMenu.Item key={option.id} data-testid={thinkingRow.testId} data-thinking-mode={option.id} keepOpen label={option.name} onClick={toggle}
      trailing={<span onClick={event => event.stopPropagation()}><SourceSwitch label={option.name} checked={active} onChange={toggle} /></span>}>
      <span className={thinkingRow.copyClass}><span className={thinkingRow.titleClass}>{option.name}</span>
        {hasText(option.description) && <span className={thinkingRow.descriptionClass}>{option.description}</span>}</span>
    </SourceMenu.Item>;
  })}</>;
}

/** shared-28 wE: the Effort submenu, its level rows (TE) and gE's thinking rows after them. */
function EffortSubmenu({ levels = [], value, onPick, thinking }) {
  const { effortMenu } = modelSelector;
  const options = levels.map(level => ({ id: effortId(level), name: effortName(effortId(level), levels), badge: typeof level === 'object' ? level.badge : undefined }))
    .filter(option => option.id);
  if (!options.length) return null;
  const selected = options.find(option => option.id === value);
  const label = message(effortMenuMessages.effort);
  return <>
    <SourceMenu.Separator />
    <SourceMenu.Submenu>
      <SourceMenu.SubmenuTrigger data-testid={effortMenu.trigger.testId} className="sm-model-item" label={label}>
        <span className={effortMenu.trigger.rowClass}><span className={effortMenu.labelClass}><span className={effortMenu.labelTextClass}>{label}</span></span>
          {selected?.name && <span className={effortMenu.hintClass}>{selected.name}</span>}</span>
      </SourceMenu.SubmenuTrigger>
      <SourceMenu.Popup label={label} align={effortMenu.popupAlign} dataCds="ModelSelector" className="sm-model-menu sm-model-submenu">
        <SourceMenu.Header className={effortMenu.headerClass}>{message(effortMenuMessages.header)}</SourceMenu.Header>
        <SourceMenu.Group>{options.map(option => {
          const warning = option.badge?.variant === 'warning';
          return <SourceMenu.Item key={option.id} data-testid={`${effortMenu.optionTestIdPrefix}${option.id}`} className="sm-model-item" label={option.name}
            checked={option.id === value} checkedRole="radio" onClick={() => { if (option.id !== value) onPick?.(option.id); }}>
            <span className={effortMenu.optionNameClass}>{option.name}
              {option.badge?.message && (warning
                ? <CdsBadge variant="warning" size={effortMenu.defaultBadge.size} icon="Warning" className="min-w-0 shrink"><span className="truncate">{option.badge.message}</span></CdsBadge>
                : <CdsBadge variant={option.badge.variant ?? effortMenu.defaultBadge.variant} size={effortMenu.defaultBadge.size} truncate>{option.badge.message}</CdsBadge>)}</span>
          </SourceMenu.Item>;
        })}</SourceMenu.Group>
        {thinking && <><SourceMenu.Separator /><ThinkingRows {...thinking} /></>}
      </SourceMenu.Popup>
    </SourceMenu.Submenu>
  </>;
}

/**
 * The Chat / Cowork model menu (KH under $H's popup). effort {levels, value, onPick} | null; thinking {options, value,
 * onToggle} | null; isNewConversation: no conversation is open yet.
 */
export function SourceChatModelMenu({ anchor, models = [], selected = null, defaultModel = null, isNewConversation = true, onSelect, onClose,
  effort = null, thinking = null, initialHighlight }) {
  const { menu } = modelSelector;
  const { legacy, current, main, more } = chatModelMenuGroups({ models, selected, defaultModel, isNewConversation });
  const currentId = modelKey(current);
  const pick = model => { if (modelKey(model) !== currentId) onSelect?.(model); };
  const levels = Array.isArray(effort?.levels) ? effort.levels : [];
  return <SourceMenu.Popup anchor={anchor} side="top" align={modelSelector.trigger.alignDefault} sideOffset={modelSelector.trigger.popupSideOffset}
    label={t('Models')} dataCds="ModelSelector" className={`sm-model-menu ${modelSelectorPopupClass}`} onClose={onClose} initialHighlight={initialHighlight}>
    {legacy && <SourceMenu.Header>{t(modelSelectorMessages.legacyModel.defaultMessage, { legacyModel: legacy, defaultModel: modelName(current) })}</SourceMenu.Header>}
    <ModelGroup models={main} currentId={currentId} onPick={pick} />
    {levels.length > 0
      ? <EffortSubmenu levels={levels} value={effort.value} onPick={effort.onPick} thinking={thinking} />
      : thinking ? <><SourceMenu.Separator /><ThinkingRows {...thinking} /></> : null}
    {more.length > 0 && <>
      <SourceMenu.Separator />
      <SourceMenu.Submenu>
        <SourceMenu.SubmenuTrigger data-testid={menu.moreModelsTestId} className="sm-model-item" label={message(modelSelectorMessages.moreModels)}>
          <span className={menu.moreModelsRowClass}>{message(modelSelectorMessages.moreModels)}</span>
        </SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup label={message(modelSelectorMessages.moreModels)} dataCds="ModelSelector" className={`sm-model-menu sm-model-submenu ${modelSelectorSubmenuPopupClass}`}>
          {more.map((group, index) => <React.Fragment key={modelKey(group[0])}>
            {index > 0 && <SourceMenu.Separator />}
            <ModelGroup models={group} currentId={currentId} showDescription={false} onPick={pick} />
          </React.Fragment>)}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>
    </>}
  </SourceMenu.Popup>;
}
