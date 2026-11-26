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
// differences: the card is docked at the bottom, so the side is "top"; there are no plan tags, notices, credits or
// capability conflicts locally (WH's tag / leading column / tooltip stay empty). E41: view-tabs from the concrete
// shared-frame file (this menu belongs to the composer graph).
// host-wiring/chat (4.16336.0): the rows' Badges are the cds-core graph's (shared-frame-CJdE5Ria vh → Pu) inside the menu.
// chat-home r1-05: the popup, rows, submenus and switch are the cds-core CDS Dropdown (shared-frame UD: Popup rD, Item cD,
// Group, Header, Separator, Submenu, SubmenuTrigger) and CdsSwitch, as KH / WH / wE / TE / hE render them (`Q` / `ie`), not
// the host SourceMenu; the Root and Trigger are the composer's ($H: `Q.Root { open, onOpenChange }` around `Q.Trigger
// render: Button`, source-chat-composer.jsx), so this module renders $H's `Q.Popup` and its KH content.
import { CdsBadge, CdsDropdown, CdsSwitch, CdsTooltip } from './cds-core.mjs';
import { useDirection } from './source-sidebar-resize-adapters.jsx';
import { effortMenuMessages, modelSelector, modelSelectorMessages, modelSelectorPopupClass, modelSelectorSubmenuPopupClass, splitModelName } from './generated/chat-composer/model-selector.mjs';
import { effortId, effortName, modelMenuSections, modelProviderGroups, pickableModels, providerModelName } from './model-menu-model.mjs';
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
  // Hidden and user-removed models are left out (model-menu-model.mjs pickableModels), the checked one excepted.
  const listed = pickableModels(models, selected).filter(model => typeof modelKey(model) === 'string');
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

/** shared-8 WH (RU): the row under its Tooltip (side `qg("inline-end", dir)`, multiline; a disabled row in a div). No plan
 * tag, notice, credits or leading column locally. data-model-id is the host's (probes / tests read the row's model). */
/** RU's `Tooltip {content, side: qg("inline-end", dir), multiline}`; qg (shared-33 Cb) is "right" unless right-to-left. */
function ModelRowTooltip({ content, children }) {
  const side = useDirection() === 'rtl' ? 'left' : 'right';
  return <CdsTooltip content={content} side={side} multiline>{children}</CdsTooltip>;
}

function ModelRow({ model, checked, showDescription, onPick, name = modelName(model) }) {
  const { menu } = modelSelector;
  const disabled = !checked && !!model.disabled;
  const badge = typeof model.badge?.message === 'string' && model.badge.message ? model.badge : null;
  const item = <CdsDropdown.Item data-testid={menu.row.testId} onClick={() => { if (!checked && !disabled) onPick?.(model); }} disabled={disabled}
    checked={checked} checkedRole={menu.row.checkedRole} description={showDescription && hasText(model.description) ? model.description : undefined}
    data-model-id={modelKey(model)}>
    <span className={menu.rowNameClass}><RowName name={name} />
      {badge && <CdsBadge variant={badge.variant} size={menu.badge.size} truncate data-testid={menu.badge.testId}>{badge.message}</CdsBadge>}</span>
  </CdsDropdown.Item>;
  return <ModelRowTooltip content={disabled ? model.disabled_reason?.message : undefined}>{disabled ? <div>{item}</div> : item}</ModelRowTooltip>;
}

/** shared-8 GH (zU): one CdsDropdown Group of WH rows. */
function ModelGroup({ models, currentId, showDescription = true, onPick, nameOf }) {
  return <CdsDropdown.Group>{models.map(model => <ModelRow key={modelKey(model)} model={model} checked={modelKey(model) === currentId}
    showDescription={showDescription} onPick={onPick} {...(nameOf ? { name: nameOf(model) } : {})} />)}</CdsDropdown.Group>;
}

/** shared-33 hE (Jx) rows as gE lists them: every thinking mode but "off" / "standard"; a toggle picks it, or none. The
 * trailing switch sits in a span that stops the click (Zx) so only the row toggles. */
function ThinkingRows({ options = [], value, onToggle }) {
  const { thinkingRow } = modelSelector;
  return <>{options.filter(option => option.id !== 'off' && option.id !== 'standard').map(option => {
    const active = value === option.id;
    const toggle = () => onToggle?.(active ? 'off' : option.id);
    return <CdsDropdown.Item key={option.id} data-testid={thinkingRow.testId} data-thinking-mode={option.id} keepOpen onClick={toggle}
      trailing={<span onClick={event => event.stopPropagation()}><CdsSwitch aria-label={option.name} checked={active} onCheckedChange={toggle} tabIndex={-1} /></span>}>
      <span className={thinkingRow.copyClass}><span className={thinkingRow.titleClass}>{option.name}</span>
        {hasText(option.description) && <span className={thinkingRow.descriptionClass}>{option.description}</span>}</span>
    </CdsDropdown.Item>;
  })}</>;
}

// shared-33 wE (rS) passes the levels popup `collisionAvoidance: zo(y) ? { side: "shift", align: "shift" } : { align: "shift" }`;
// zo is the narrow-surface test, off for the composer card.
const EFFORT_POPUP_COLLISION = Object.freeze({ align: 'shift' });
const MODEL_POPUP_COLLISION = Object.freeze({ top: modelSelector.trigger.popupCollisionTop });

/** shared-33 wE: the Effort submenu, its level rows (TE) and gE's thinking rows after them. */
function EffortSubmenu({ levels = [], value, onPick, thinking, defaultOpen = false }) {
  const { effortMenu } = modelSelector;
  const options = levels.map(level => ({ id: effortId(level), name: effortName(effortId(level), levels), badge: typeof level === 'object' ? level.badge : undefined }))
    .filter(option => option.id);
  if (!options.length) return null;
  const selected = options.find(option => option.id === value);
  const label = message(effortMenuMessages.effort);
  return <>
    <CdsDropdown.Separator />
    <CdsDropdown.Submenu defaultOpen={defaultOpen}>
      <CdsDropdown.SubmenuTrigger data-testid={effortMenu.trigger.testId}>
        <span className={effortMenu.trigger.rowClass}><span className={effortMenu.labelClass}><span className={effortMenu.labelTextClass}>{label}</span></span>
          {selected?.name && <span className={effortMenu.hintClass}>{selected.name}</span>}</span>
      </CdsDropdown.SubmenuTrigger>
      <CdsDropdown.Popup align={effortMenu.popupAlign} collisionAvoidance={EFFORT_POPUP_COLLISION}>
        <CdsDropdown.Header className={effortMenu.headerClass}>{message(effortMenuMessages.header)}</CdsDropdown.Header>
        <CdsDropdown.Group>{options.map(option => {
          const warning = option.badge?.variant === 'warning';
          return <CdsDropdown.Item key={option.id} onClick={() => { if (option.id !== value) onPick?.(option.id); }} data-testid={`${effortMenu.optionTestIdPrefix}${option.id}`}
            checked={option.id === value} checkedRole="radio">
            <span className={effortMenu.optionNameClass}>{option.name}
              {option.badge?.message && (warning
                ? <CdsBadge variant="warning" size={effortMenu.defaultBadge.size} icon="Warning" className="min-w-0 shrink"><span className="truncate">{option.badge.message}</span></CdsBadge>
                : <CdsBadge variant={option.badge.variant ?? effortMenu.defaultBadge.variant} size={effortMenu.defaultBadge.size} truncate>{option.badge.message}</CdsBadge>)}</span>
          </CdsDropdown.Item>;
        })}</CdsDropdown.Group>
        {thinking && <><CdsDropdown.Separator /><ThinkingRows {...thinking} /></>}
      </CdsDropdown.Popup>
    </CdsDropdown.Submenu>
  </>;
}

/**
 * The Chat / Cowork model menu: $H's `Q.Popup {side: placement === "bottom" ? "top" : "bottom", sideOffset: 4, align,
 * className: ZH}` with KH inside (the card's composer is on the page, placement "bottom", so the side is "top"). The Root
 * and Trigger are the composer's (source-chat-composer.jsx ChatModelMenuRoot). effort {levels, value, onPick} | null;
 * thinking {options, value, onToggle} | null; isNewConversation: no conversation is open yet; effortOpen: the host's
 * `{effortOpen}` entry (the effort chord / slash command) opens the Effort submenu with the menu.
 */
export function SourceChatModelMenu({ models = [], selected = null, defaultModel = null, isNewConversation = true, onSelect,
  effort = null, thinking = null, effortOpen = false, groupByProvider = false }) {
  const { menu } = modelSelector;
  const { legacy, current, main, more } = chatModelMenuGroups({ models, selected, defaultModel, isNewConversation });
  // OpenCode (main.jsx): the providers first, each one's models in a submenu (model-menu-model.mjs modelProviderGroups),
  // the current model's provider hinting its name; a catalog of one provider keeps KH's layout.
  const providers = groupByProvider ? modelProviderGroups(models, modelKey(current) ?? selected) : null;
  const currentId = modelKey(current);
  const pick = model => { if (modelKey(model) !== currentId) onSelect?.(model); };
  const levels = Array.isArray(effort?.levels) ? effort.levels : [];
  // r2 chat-home-r2-04: $H's `collisionPadding: { top: gt }`, gt = 52 on the mac desktop window.
  return <CdsDropdown.Popup side="top" sideOffset={modelSelector.trigger.popupSideOffset} align={modelSelector.trigger.alignDefault}
    collisionPadding={MODEL_POPUP_COLLISION} className={modelSelectorPopupClass}>
    {legacy && <CdsDropdown.Header>{t(modelSelectorMessages.legacyModel.defaultMessage, { legacyModel: legacy, defaultModel: modelName(current) })}</CdsDropdown.Header>}
    {providers
      ? <CdsDropdown.Group>{providers.map(group => <CdsDropdown.Submenu key={group.id}>
          <CdsDropdown.SubmenuTrigger data-model-provider={group.id} hint={group.selected ? providerModelName(group.selected) : undefined}>
            <span className={menu.moreModelsRowClass}>{group.name}</span>
          </CdsDropdown.SubmenuTrigger>
          <CdsDropdown.Popup className={modelSelectorSubmenuPopupClass}>
            <ModelGroup models={group.models} currentId={currentId} showDescription={false} onPick={pick} nameOf={providerModelName} />
          </CdsDropdown.Popup>
        </CdsDropdown.Submenu>)}</CdsDropdown.Group>
      : <ModelGroup models={main} currentId={currentId} onPick={pick} />}
    {levels.length > 0
      ? <EffortSubmenu levels={levels} value={effort.value} onPick={effort.onPick} thinking={thinking} defaultOpen={effortOpen} />
      : thinking ? <><CdsDropdown.Separator /><ThinkingRows {...thinking} /></> : null}
    {!providers && more.length > 0 && <>
      <CdsDropdown.Separator />
      <CdsDropdown.Submenu>
        <CdsDropdown.SubmenuTrigger data-testid={menu.moreModelsTestId}>
          <span className={menu.moreModelsRowClass}>{message(modelSelectorMessages.moreModels)}</span>
        </CdsDropdown.SubmenuTrigger>
        <CdsDropdown.Popup className={modelSelectorSubmenuPopupClass}>
          {more.map((group, index) => <React.Fragment key={modelKey(group[0])}>
            {index > 0 && <CdsDropdown.Separator />}
            <ModelGroup models={group} currentId={currentId} showDescription={false} onPick={pick} />
          </React.Fragment>)}
        </CdsDropdown.Popup>
      </CdsDropdown.Submenu>
    </>}
  </CdsDropdown.Popup>;
}
