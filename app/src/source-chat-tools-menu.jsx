import React from 'react';
// w13-chatui-composer-tools (research/w13-chatui.md §1.6 K2, research/w13-chatfn.md §1.5 C1/C2): the Chat card's + button
// and + menu as 3.6556.2 builds them.
//   - ChatAddTrigger: shared-8 kF — CdsButton {"data-testid": "chat-input-attach" (shared-1 S_), "data-chorus-callout":
//     "attach", iconOnly, icon "Add", variant "ghost", aria-label "Add files, connectors, and more", tooltip off,
//     className "ms-0.5"} inside CdsTooltip {content: the label unless the menu is open, side "bottom", shortcut "/"
//     unless hideShortcut}. The caller's props spread after the testid, as kF spreads its rest after `nr`.
//   - chatAddMenuSlots / chatAddMenuEntries: c752b32f8 Js — the slot object (Ws uploadFile, Fs screenshot, ks project,
//     connectors, shared-5 yz research, Tz webSearch), testids applied by ra (na), split by shared-8 lN into
//     [base, tools, modes] and joined with the `separator-tools` / `separator-modes` separators.
//   - ChatAddMenuItems: zi / Bi's row kinds (separator, element, button, checkbox, submenu) on the host SourceMenu, since
//     the + popup is the host menu (main.jsx onMenu('add')), not CdsDropdown.
// What 3.6556.2 does NOT have in the Chat composer (tests/w13-chat-composer-tools.test.mjs locks the evidence): a
// separate tools menu (c9b54eb90 pe is the org/project tools hook; Extended thinking is a model-selector thinking mode,
// shared-50 thinking_mode_extended_title) and a style picker (shared-28 sends `has_personalized_style:!1`; "Style"
// GQM96kFSM3 is voice mode's, "Choose a style" AU4HcqqKpC is Code's output-style dialog cc43287c9 efe).
// E41: this module is in the composer graph (source-chat-composer.jsx imports it), so view-tabs comes from the concrete
// shared-frame file by semantic name, not the facade.
import { CdsButton, CdsTooltip } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { chatAddMenu, chatAddMenuMessages } from './generated/chat-composer-menus/add-menu.mjs';
import { splitAddMenuSlots, withAddMenuTestIds } from './generated/chat-composer-menus/add-menu-slots.mjs';
import { SourceMenu } from './source-menu.jsx';
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
export function chatAddMenuSlots({ attach, attachShortcut, screenshot, project, connectors, research, webSearch, ...hostRows } = {}) {
  const { items } = chatAddMenu;
  const m = chatAddMenuMessages;
  const element = key => hostRows[key] ? { type: 'element', label: ELEMENT_SLOTS[key], element: hostRows[key] } : null;
  return {
    addFolder: element('addFolder'), teach: element('teach'), github: element('github'), skills: element('skills'),
    plugins: element('plugins'),
    uploadFile: attach ? { ...items.uploadFile, label: message(m.addFilesOrPhotos), onAction: attach, shortcut: attachShortcut } : null,
    screenshot: screenshot ? { ...items.screenshot, label: message(m.takeAScreenshot), onAction: screenshot } : null,
    project: project ? { ...items.project, label: message(m.addToProject), popup: project.popup, onOpenChange: project.onOpenChange } : null,
    connectors: connectors ? { type: 'element', label: 'connectors', element: connectors } : null,
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
export function chatAddMenuEntries(slots, { agentMode = false, onSessionHost = false, perChatToolsUnavailable = false } = {}) {
  const [base, tools, modes] = splitAddMenuSlots(withAddMenuTestIds(slots), agentMode, undefined, onSessionHost, perChatToolsUnavailable);
  const { separators } = chatAddMenu;
  return [
    ...base,
    ...(tools.length > 0 ? [{ type: 'separator', label: separators.tools }, ...tools] : []),
    ...(modes.length > 0 ? [{ type: 'separator', label: separators.modes }, ...modes] : []),
  ];
}

// zi / Bi on SourceMenu. A tooltip shows as the row's disabled reason (zi wraps the row in a CdsTooltip at inline-end;
// the host menu's reason popover is its equivalent and only appears on a disabled row). closeOnClick false keeps the
// menu open (Bi `keepOpen: u === !1`).
function Row({ entry }) {
  const common = { icon: entry.icon, 'data-testid': entry.testId, disabled: !!entry.disabled,
    disabledReason: entry.disabled ? entry.tooltip : undefined, keepOpen: entry.closeOnClick === false };
  switch (entry.type) {
    case 'separator': return <SourceMenu.Separator />;
    case 'element': return entry.element;
    case 'button': return <SourceMenu.Item {...common} shortcut={entry.shortcut} onClick={entry.onAction}>{entry.label}</SourceMenu.Item>;
    case 'checkbox': return <SourceMenu.Item {...common} checked={!!entry.checked} onClick={entry.onAction}>{entry.label}</SourceMenu.Item>;
    case 'submenu': return <SourceMenu.Submenu onOpenChange={entry.onOpenChange}>
      <SourceMenu.SubmenuTrigger icon={entry.icon} data-testid={entry.testId}>{entry.label}</SourceMenu.SubmenuTrigger>
      {entry.popup}
    </SourceMenu.Submenu>;
    default: return null;
  }
}

/** The + menu rows; keys as Xs's Zs (`${label}-${index}` for labelled rows, else the index). */
export function ChatAddMenuItems({ entries }) {
  return <>{entries.map((entry, index) => <Row key={'label' in entry ? `${entry.label}-${index}` : index} entry={entry} />)}</>;
}
