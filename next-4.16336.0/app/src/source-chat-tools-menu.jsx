import React, { useRef, useState } from 'react';
// w13-chatui-composer-tools (research/w13-chatui.md §1.6 K2, research/w13-chatfn.md §1.5 C1/C2): the Chat card's + button
// and + menu as 3.6556.2 builds them.
//   - ChatAddTrigger: shared-8 kF — CdsButton {"data-testid": "chat-input-attach" (shared-1 S_), "data-chorus-callout":
//     "attach", iconOnly, icon "Add", variant "ghost", aria-label "Add files, connectors, and more", tooltip off,
//     className "ms-0.5"} inside CdsTooltip {content: the label unless the menu is open, side "bottom", shortcut "/"
//     unless hideShortcut}. The caller's props spread after the testid, as kF spreads its rest after `nr`.
//   - chatAddMenuSlots / chatAddMenuEntries: c752b32f8 Js — the slot object (Ws uploadFile, Fs screenshot, ks project,
//     connectors, shared-5 yz research, Tz webSearch), testids applied by ra (na), split by shared-8 lN into
//     [base, tools, modes] and joined with the `separator-tools` / `separator-modes` separators.
//   - ChatAddMenuItems / ChatAddMenu (r2 chat-home-r2-01): 4.16336.0 c752b32f8 ga's row kinds on the CDS Dropdown, inside
//     shared-8 wP's own Root / Popup (was zi / Bi on the host SourceMenu popup).
// What 3.6556.2 does NOT have in the Chat composer (tests/w13-chat-composer-tools.test.mjs locks the evidence): a
// separate tools menu (c9b54eb90 pe is the org/project tools hook; Extended thinking is a model-selector thinking mode,
// shared-50 thinking_mode_extended_title) and a style picker (shared-28 sends `has_personalized_style:!1`; "Style"
// GQM96kFSM3 is voice mode's, "Choose a style" AU4HcqqKpC is Code's output-style dialog cc43287c9 efe).
// 4.16336.0 (composer host cutover): ChatAddTrigger renders inside the v4 shell's Actions (generated/code-composer-v4),
// whose CDS contexts are cds-core's, so the Button / Tooltip are cds-core's too (one graph inside the shell).
import { BaseMenuCheckboxItem, CdsButton, CdsDropdown, CdsIcon, CdsSkeleton, CdsSwitch, CdsTooltip, cdsClassNames, cdsMenuItemClass, clsx } from './cds-core.mjs';
import { useDirection } from './source-sidebar-resize-adapters.jsx';
import { SkillDescriptionTooltip } from './source-menu.jsx';
import { chatAddMenu, chatAddMenuMessages } from './generated/chat-composer-menus/add-menu.mjs';
import { splitAddMenuSlots, withAddMenuTestIds } from './generated/chat-composer-menus/add-menu-slots.mjs';
import { t } from '../electron/i18n/index.mjs';

const message = descriptor => t(descriptor.defaultMessage);

/** shared-8 kF. `undimmed` (kF's `[--cds-opacity-disabled:1]` / aria-busy colour branch) has no local caller. */
export function ChatAddTrigger({ disabled = false, isMenuOpen = false, hideShortcut = false, icon, ...rest }) {
  const { trigger } = chatAddMenu;
  const label = message(chatAddMenuMessages.addFilesConnectorsAndMore);
  return <CdsTooltip content={isMenuOpen ? undefined : label} side={trigger.tooltipSide} shortcut={hideShortcut ? undefined : trigger.shortcut}>
    <CdsButton data-testid={trigger.testId} {...rest} data-chorus-callout={trigger.callout} iconOnly icon={icon ?? trigger.icon}
      variant={trigger.variant} aria-label={label} tooltip={false} disabled={disabled} className={trigger.className} />
  </CdsTooltip>;
}

/**
 * The Chat + menu's slot object in c752b32f8 Js's shape. Each input is optional; a missing one leaves its slot empty
 * (lN drops empty slots), as the official hooks return null when their feature is unavailable.
 *   attach: () => void, attachShortcut?: string            -> Ws uploadFile ("Add files or photos", Attachment)
 *   screenshot: () => void                                  -> Fs screenshot ("Take a screenshot", Camera)
 *   project: { popup: ReactNode, onOpenChange? }            -> ks project submenu ("Add to project", Projects)
 *   connectors: ReactNode                                   -> the connectors slot (host element, like Js's elements)
 *   research: { checked, disabled, tooltip?, onToggle }     -> yz research checkbox (Research)
 *   webSearch: { checked, disabled, tooltip?, onToggle } | { blocked: true, tooltip? } -> Tz (Globe / blocked: Lock)
 * Js's other slots the host already draws as its own rows (main.jsx case "add"): addFolder, teach, github, skills and
 * plugins take a ReactNode and become element rows (Js passes googleDrive the same way), so a Chat branch can reuse the
 * host rows in Js's slot order (iN) without rebuilding them; null / false / undefined leaves the slot empty. Whether a
 * slot shows in Chat is the caller's (w13-chatfn-tools: Plugins hidden, Add folder / Record a skill by the official
 * conditions). Js's addPeople / googleDrive / shareScreen / designSystem / devices / haystack / memory /
 * permissionMode have no local feature and stay empty.
 */
const ELEMENT_SLOTS = Object.freeze({ addFolder: 'add-folder', teach: 'teach', github: 'github', skills: 'skills', plugins: 'plugins' });

// r2 chat-home-r2-01: the host's teach / skills / connectors / plugins rows as c752b32f8 row descriptors (the CDS rows
// below draw them; SourceMenu elements cannot live in the CDS popup). Same data and actions as the Code menu's rows.
const skillRow = (item, onSkill) => ({ type: 'skill', label: item.label, icon: item.icon || 'Scroll', path: item.path, pluginLabel: item.pluginLabel || undefined,
  skillDescription: item.description || item.skillDescription || undefined, sourcePluginName: item.sourcePluginName || undefined, sourceRepo: item.sourceRepo || undefined,
  disabled: !!item.disabled, className: item.className, onAction: () => onSkill?.(item) });
/** Lc's "Record a skill" row (copper_heron): icon Recording, disabled while a start is in flight. */
export function chatTeachSlot({ available, isStarting, label, onStart }) {
  return available ? { type: 'button', label, icon: 'Recording', disabled: !!isStarting, onAction: onStart } : null;
}
/** The Skills submenu (icon Scroll, skill rows, footer "Manage skills"); none without skill rows. */
export function chatSkillsSlot({ items = [], onSkill, onManage }) {
  if (!items.length) return null;
  return { type: 'submenu', icon: 'Scroll', label: t('Skills'), items: items.map(item => skillRow(item, onSkill)),
    submenuFooterItems: [{ type: 'button', icon: 'Tool', label: t('Manage skills'), onAction: onManage }] };
}
/** add-menu-model addConnectorsEntry → the loading row, "Manage connectors", or the Connectors submenu. */
export function chatConnectorsSlot(entry, { reconnectHint, statusLabel, onManage, onOpen, onToggle }) {
  if (!entry) return null;
  if (entry.kind === 'loading') return { type: 'loading' };
  const manage = { type: 'button', icon: 'Connectors', label: t('Manage connectors'), onAction: onManage };
  if (entry.kind === 'manage') return manage;
  const rows = entry.items.map(item => {
    const { row, setting } = item;
    if (item.type === 'connecting') return { type: 'button', label: t('Connecting…'), disabled: true };
    if (item.type === 'reconnect') return { type: 'button', icon: 'CloudSlash', label: row.title || row.name, subtitle: t('Reconnect'), onAction: () => onOpen(row) };
    if (item.type === 'toggle') return { type: 'toggle', icon: 'Connectors', label: row.title || row.name, checked: setting.enabled !== false,
      subtitle: setting.enabled === false ? t('Off') : statusLabel(row), onAction: () => onToggle(row, setting) };
    return { type: 'button', icon: 'Connectors', label: row.title || row.name, onAction: () => onOpen(row) };
  });
  return { type: 'submenu', icon: 'Connectors', label: t('Connectors'), hint: entry.reconnectCount > 0 ? reconnectHint?.(entry.reconnectCount) : undefined,
    items: [{ ...manage, icon: 'Tool' }, { type: 'separator', label: 'separator-manage' }, ...rows] };
}
/** add-menu-model addPluginsEntry → the loading row, "Add plugins", or the Plugins submenu (us's rows, then "Manage
 * plugins" / "Browse plugins" after a separator). */
export function chatPluginsSlot(entry, { rows = [], onSkill, onManage, onBrowse }) {
  if (!entry) return null;
  if (entry.kind === 'loading') return { type: 'loading' };
  if (entry.kind === 'add') return { type: 'button', icon: 'Plugin', label: t('Add plugins'), onAction: onBrowse };
  if (entry.kind !== 'submenu') return null;
  return { type: 'submenu', icon: 'Plugin', label: t('Plugins'),
    items: rows.map(row => row.type === 'skill' ? skillRow(row, onSkill) : { type: 'submenu', icon: row.icon, label: row.label, subtitle: row.subtitle,
      submenuClassName: row.submenuClassName, items: row.items.map(item => skillRow(item, onSkill)) }),
    submenuFooterItems: [{ type: 'button', icon: 'Tool', label: t('Manage plugins'), onAction: onManage },
      { type: 'button', icon: 'Add', label: t('Browse plugins'), onAction: onBrowse }] };
}
export function chatAddMenuSlots({ attach, attachShortcut, screenshot, project, connectors, research, webSearch, ...hostRows } = {}) {
  const { items } = chatAddMenu;
  const m = chatAddMenuMessages;
  // r2 chat-home-r2-01: a host row given as a row descriptor ({type: 'button' | 'submenu' | 'loading' …}, as the official
  // hooks return them) is the slot itself; a React element stays an element row.
  const element = key => !hostRows[key] ? null : !React.isValidElement(hostRows[key]) && typeof hostRows[key]?.type === 'string' ? hostRows[key]
    : { type: 'element', label: ELEMENT_SLOTS[key], element: hostRows[key] };
  return {
    addFolder: element('addFolder'), teach: element('teach'), github: element('github'), skills: element('skills'),
    plugins: element('plugins'),
    uploadFile: attach ? { ...items.uploadFile, label: message(m.addFilesOrPhotos), onAction: attach, shortcut: attachShortcut } : null,
    screenshot: screenshot ? { ...items.screenshot, label: message(m.takeAScreenshot), onAction: screenshot } : null,
    project: !project ? null : project.renderPopup ? { ...items.project, label: message(m.addToProject), renderPopup: project.renderPopup }
      : { ...items.project, label: message(m.addToProject), popup: project.popup, onOpenChange: project.onOpenChange },
    connectors: !connectors ? null : !React.isValidElement(connectors) && typeof connectors.type === 'string' ? connectors : { type: 'element', label: 'connectors', element: connectors },
    research: research ? { ...items.research, label: message(m.research), checked: !!research.checked, disabled: !!research.disabled,
      tooltip: research.tooltip, onAction: research.onToggle } : null,
    webSearch: !webSearch ? null : webSearch.blocked ? { ...items.webSearchBlocked, label: message(m.webSearch), tooltip: webSearch.tooltip }
      : { ...items.webSearch, label: message(m.webSearch), checked: !!webSearch.checked, disabled: !!webSearch.disabled,
        tooltip: webSearch.tooltip, onAction: webSearch.onToggle },
  };
}

/**
 * c752b32f8 Js's assembly: ra (testids) → lN (agent mode / session host / per-chat-tools filters) → separators.
 * lN's mapper: Js passes `h = (e, t) => p && ur.has(e) ? nr(t, m) : t`, which swaps a row for its org-locked state when
 * an admin policy locks that slot; this host has no org policy, so the mapper is lN's identity default (undefined).
 */
// 4.16336.0 lN (Xj) takes a sixth argument, Js's `y = ge(nn())`: shared-8 kN, true only inside the offered-files context
// (DN) with its gate (Bd) on. It fills the artifactFile / artifactDrive rows (b.computer / b.drive of the remote files
// service) and drops designSystem (Yj). This host has neither that context nor that service, so the flag is the value
// kN gives outside it, false, and no artifactFile / artifactDrive slot is passed (regions-chat report, open item).
const ARTIFACT_FILE_ROWS = false;
export function chatAddMenuEntries(slots, { agentMode = false, onSessionHost = false, perChatToolsUnavailable = false } = {}) {
  const [base, tools, modes] = splitAddMenuSlots(withAddMenuTestIds(slots), agentMode, undefined, onSessionHost, perChatToolsUnavailable, ARTIFACT_FILE_ROWS);
  const { separators } = chatAddMenu;
  return [
    ...base,
    ...(tools.length > 0 ? [{ type: 'separator', label: separators.tools }, ...tools] : []),
    ...(modes.length > 0 ? [{ type: 'separator', label: separators.modes }, ...modes] : []),
  ];
}

// r2 chat-home-r2-01: the rows are c752b32f8 ga / _a / ba / Sa / Aa / Da / ka / ja on the cds-core CDS Dropdown (Uc maps
// Vc's menuItems through Wc → ga), inside shared-8 wP's own `Q.Root` / `Q.Popup` (ChatAddMenu below), not the host
// SourceMenu. Literals: chatAddMenu.rows / chatAddMenu.popup (extract-chat-composer-menus.mjs).
// chat-home-r3-01: _a's "toggle" row is base-ui Menu.CheckboxItem (vendor-frame `on`, cds-core BaseMenuCheckboxItem since
// wave cc2) with k (cdsMenuItemClass), CdsIcon and ma's inert CdsSwitch, as _a draws it (ToggleRow below; literals
// chatAddMenu.rows.toggle). Host differences: Ea's right-to-left `dir` swap of a
// label that is all left-to-right text, and ba's `Qt` reason filter, have no local caller. "toggle-submenu",
// "search-input" and "connector-tool" rows have no local slot.
const ROWS = chatAddMenu.rows;
const perfProps = attribute => ({ [attribute.name]: attribute.value });
const groupClass = className => cdsClassNames(ROWS.groupClass, typeof className === 'string' && className);
/** Xr(side, direction) (shared-33 Cb): "inline-end" is "right", or "left" right-to-left. */
const inlineSide = (side, direction) => side === 'inline-end' ? (direction === 'rtl' ? 'left' : 'right') : side === 'inline-start' ? (direction === 'rtl' ? 'right' : 'left') : side;

/** c752b32f8 Da (Oa): the label, with a tooltip once a hover finds it truncated. */
function RowText({ text }) {
  const direction = useDirection();
  const ref = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const span = <span ref={ref} className={ROWS.labelClass} onMouseEnter={() => { if (ref.current) setTruncated(ref.current.scrollWidth > ref.current.clientWidth); }}>{text}</span>;
  if (!truncated) return span;
  const { labelTooltip } = ROWS;
  return <CdsTooltip multiline className={labelTooltip.className} content={text} side={inlineSide(labelTooltip.side, direction)} align={labelTooltip.align}>{span}</CdsTooltip>;
}
/** c752b32f8 Aa: the label, and the subtitle (ka) under it. */
function RowLabel({ label, subtitle }) {
  const text = label ?? '';
  return subtitle ? <span className={ROWS.subtitleStackClass}><RowText text={text} /><span className={ROWS.subtitleClass}>{subtitle}</span></span> : <RowText text={text} />;
}

/** c752b32f8 ja: a skill row; hovering one with a description, plugin or repo shows c17e03edc's tooltip. */
function SkillRow({ item }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const { skillDescription, sourcePluginName, sourceRepo } = item;
  return <>
    <CdsDropdown.Item labelDir={ROWS.skill.labelDir} ref={ref} icon={item.icon} hint={item.pluginLabel} hintDir={ROWS.skill.hintDir} disabled={item.disabled}
      onClick={item.onAction ? () => item.onAction({ isExplicitSelection: true }) : undefined}
      onMouseEnter={() => { if (skillDescription || sourcePluginName || sourceRepo) setHovered(true); }} onMouseLeave={() => setHovered(false)}
      className={groupClass(item.className)} data-skill-path={item.path}>{item.label}</CdsDropdown.Item>
    {hovered && <SkillDescriptionTooltip anchor={ref} description={skillDescription || undefined} sourcePluginName={sourcePluginName || undefined} sourceRepo={sourceRepo || undefined} />}
  </>;
}

/** c752b32f8 Sa: a submenu's popup — the title header, leading rows, items, rows; the footer after a separator; a search
 * field (SearchablePopup) when the content has one. */
function SubmenuPopup({ frame, content }) {
  const { align, className } = frame;
  const { items, leadingRows, rows, search, headerItems, footerItems, title } = content;
  const max = content.maxVisibleItems ?? frame.maxVisibleItems;
  const maxVisibleItems = className?.includes(ROWS.submenu.maxVisibleClassHint) ? undefined : (max ?? ROWS.submenu.maxVisibleItems);
  const footer = footerItems && footerItems.length > 0 ? <><CdsDropdown.Separator />{footerItems.map((entry, index) => <ChatAddMenuRow key={'label' in entry ? `footer-${entry.label}-${index}` : `footer-${index}`} entry={entry} />)}</> : undefined;
  const popup = { ...perfProps(ROWS.submenu.perfAttribute), align, collisionPadding: ROWS.submenu.collisionPadding, className, maxVisibleItems, footer };
  const body = <>{title && <CdsDropdown.Header>{title}</CdsDropdown.Header>}{leadingRows}{items?.map(rowElement)}{rows}</>;
  if (search) {
    // Sa hands SearchablePopup a render function (the rows, or PendingList around them while pending / loading).
    const list = () => search.pending === undefined && search.loading === undefined ? body
      : <CdsDropdown.PendingList pending={search.pending} loading={search.loading} icon>{body}</CdsDropdown.PendingList>;
    return <CdsDropdown.SearchablePopup {...popup} searchLabel={search.label} query={search.value} onQueryChange={search.onChange} onSubmitQuery={search.onSubmit}>{list}</CdsDropdown.SearchablePopup>;
  }
  const header = headerItems && headerItems.length > 0 ? <>{headerItems.map((entry, index) => <ChatAddMenuRow key={'label' in entry ? `header-${entry.label}-${index}` : `header-${index}`} entry={entry} />)}<CdsDropdown.Separator /></> : undefined;
  return <CdsDropdown.Popup {...popup} header={header}>{body}</CdsDropdown.Popup>;
}

/** c752b32f8 ba: a submenu row; a `renderPopup` popup mounts once the submenu has opened. */
function SubmenuRow({ item }) {
  const align = item.align === undefined ? ROWS.submenu.align : item.align;
  const [opened, setOpened] = useState(item.open === true);
  const frame = { align, className: item.submenuClassName, maxVisibleItems: item.maxVisibleItems };
  const onOpenChange = next => { if (next) setOpened(true); item.onOpenChange?.(next); };
  const popup = 'renderPopup' in item
    ? (opened || item.open === true) && item.renderPopup(content => <SubmenuPopup frame={frame} content={content} />)
    : <SubmenuPopup frame={frame} content={{ items: item.items, search: item.search, headerItems: item.submenuHeaderItems, footerItems: item.submenuFooterItems, title: item.submenuTitle }} />;
  return <CdsDropdown.Submenu disabled={item.disabled} open={item.open} onOpenChange={onOpenChange}>
    <CdsDropdown.SubmenuTrigger data-testid={item.testId} icon={item.icon} trailing={item.suffix} hint={item.hint} hintDir={ROWS.submenu.hintDir}
      openOnHover={item.openOnHover} className={groupClass(item.className)}><RowLabel label={item.label} subtitle={item.subtitle} /></CdsDropdown.SubmenuTrigger>
    {popup}
  </CdsDropdown.Submenu>;
}

/** c752b32f8 ma: the toggle row's switch, inert and hidden from assistive tech (the CheckboxItem carries the state). */
function ToggleSwitch({ checked, disabled }) {
  const { switch: sw } = ROWS.toggle;
  return <div aria-hidden={sw.ariaHidden} className={sw.frameClass}><span inert className={sw.inertClass}><CdsSwitch size={sw.size} checked={checked} disabled={disabled} /></span></div>;
}
/** c752b32f8 _a `case "toggle"`: base-ui Menu.CheckboxItem {data-testid, checked, closeOnClick (default false), onClick (none
 * while toggleDisabled), aria-disabled (toggleDisabled), className t(k({variant}), "group", cursorDefault && …), disabled}
 * around [icon span, label stack (Oa + ka), trailing span (suffix + ma)]. */
function ToggleRow({ entry }) {
  const T = ROWS.toggle;
  const { icon, label, subtitle, suffix, onAction, checked, disabled, toggleDisabled, cursorDefault, closeOnClick, testId } = entry;
  return <BaseMenuCheckboxItem data-testid={testId} checked={checked} closeOnClick={closeOnClick !== undefined ? closeOnClick : T.closeOnClickDefault}
    onClick={toggleDisabled ? undefined : onAction} aria-disabled={toggleDisabled || undefined}
    className={clsx(cdsMenuItemClass({ variant: T.variant }), T.groupClass, cursorDefault && T.cursorDefaultClass)} disabled={disabled}>
    {icon !== undefined && <span className={T.iconClass}>{typeof icon === 'string' ? <CdsIcon name={icon} size={T.iconSize} /> : icon}</span>}
    <span className={T.labelStackClass}><RowText text={label} />{subtitle && <span className={ROWS.subtitleClass}>{subtitle}</span>}</span>
    <span className={T.trailingClass}>{suffix}<ToggleSwitch checked={checked} disabled={disabled || toggleDisabled} /></span>
  </BaseMenuCheckboxItem>;
}

/** c752b32f8 _a: the row itself. */
function RowBody({ entry }) {
  switch (entry.type) {
    case 'button': return <CdsDropdown.Item data-testid={entry.testId} icon={entry.icon} trailing={entry.suffix} shortcut={entry.shortcut} focusesNothing={entry.focusesNothing}
      onClick={entry.onAction ? () => entry.onAction() : undefined} onPointerEnter={entry.onPointerEnter} onPointerLeave={entry.onPointerLeave}
      keepOpen={entry.closeOnClick === false} disabled={entry.disabled} disabledReason={entry.disabledReason} className={groupClass(entry.className)}>
      <RowLabel label={entry.label} subtitle={entry.subtitle} /></CdsDropdown.Item>;
    case 'checkbox': return <CdsDropdown.Item data-testid={entry.testId} icon={entry.icon} checked={entry.checked ?? false} trailing={entry.suffix} onClick={entry.onAction}
      keepOpen={entry.closeOnClick === false} disabled={entry.disabled} className={groupClass(entry.className)}>
      <RowLabel label={entry.label} subtitle={entry.subtitle} /></CdsDropdown.Item>;
    case 'toggle': return <ToggleRow entry={entry} />;
    case 'submenu': return <SubmenuRow item={entry} />;
    case 'skill': return <SkillRow item={entry} />;
    default: return null;
  }
}

/** c752b32f8 ga: separators, headers, the loading skeleton row, host elements, and the rows (a tooltip wraps a row
 * in a hoverable CdsTooltip at inline-end, except a button that carries its own disabledReason). */
export function ChatAddMenuRow({ entry }) {
  const direction = useDirection();
  if (entry.type === 'separator') return <CdsDropdown.Separator />;
  if (entry.type === 'section-header') return <CdsDropdown.Header>{entry.label}</CdsDropdown.Header>;
  if (entry.type === 'loading') {
    const { loading } = ROWS;
    return <div className={loading.className}>
      <CdsSkeleton width={loading.icon.width} height={loading.icon.height} />
      <span aria-hidden className={loading.labelClass}><CdsSkeleton width={loading.label.width} height={loading.label.height} /></span>
    </div>;
  }
  if (entry.type === 'element') return entry.element;
  const { tooltip, ...item } = entry;
  if (item.type === 'button' && item.disabledReason !== undefined) return <RowBody entry={item} />;
  if (!tooltip) return <RowBody entry={item} />;
  return <CdsTooltip hoverable={ROWS.tooltip.hoverable} content={tooltip} side={inlineSide(ROWS.tooltip.side, direction)} sideOffset={ROWS.tooltip.sideOffset}>
    <div><RowBody entry={item} /></div>
  </CdsTooltip>;
}
const rowElement = (entry, index) => <ChatAddMenuRow key={'label' in entry ? `${entry.label}-${index}` : index} entry={entry} />;

/** The + menu rows (c752b32f8 Uc: Vc's menuItems through Wc; keys `${label}-${index}` for labelled rows, else the index). */
export function ChatAddMenuItems({ entries }) {
  return <>{entries.map(rowElement)}</>;
}

/**
 * shared-8 wP's menu: `Q.Root {open, onOpenChange, sheetTitle: "Add"}` around `Q.Trigger {render: TP}` (ChatAddTrigger)
 * and `Q.Popup {align: "start", side: "bottom", sideOffset: 4, collisionPadding: 10, className:
 * "max-h-[min(var(--available-height),24rem)]", "data-perf-overlay": "composer_add_menu"}` holding the rows. The open
 * state is the host's (main.jsx menu "add"); onOpenChange asks the host to toggle it, as the model menu does.
 */
export function ChatAddMenu({ open = false, onOpenChange, trigger, children }) {
  const { popup } = chatAddMenu;
  return <CdsDropdown.Root open={open} onOpenChange={onOpenChange} sheetTitle={message(chatAddMenuMessages.add)}>
    <CdsDropdown.Trigger render={trigger} />
    <CdsDropdown.Popup align={popup.align} side={popup.side} sideOffset={popup.sideOffset} collisionPadding={popup.collisionPadding}
      className={popup.className} {...perfProps(popup.perfAttribute)}>{children}</CdsDropdown.Popup>
  </CdsDropdown.Root>;
}
