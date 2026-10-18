import { sidebarComposerFocus } from './sidebar-open-model.mjs';
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { ToolButton, SIDEBAR_TOGGLE_TOOLTIP } from "./code-ui";
import { SourceNavButtons } from "./source-nav-buttons";
import { SourceAppSwitch } from "./source-app-switch.jsx";
import { SourceTooltip, textOverflows } from "./source-tooltip";
import { SourceSpark } from "./source-spark.jsx";
import { CdsAvatar } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { SourceMenu, menuTriggerProps } from "./source-menu";
import { CONTEXT_MENU_ALIGN_OFFSET, CONTEXT_MENU_SIDE_OFFSET } from "./menu-model.mjs";
import {
  buildSidebarGroups, buildNestedRuns, bulkTargets, CLASSIC_GROUP_OPTIONS, CLASSIC_SORT_OPTIONS,
  CLASSIC_STATUS_OPTIONS, clearSidebarFilters, folderName, hasSidebarFilters, lineageKind, movePinned,
  nestedStubCounts, nestedRowNeedsInput, splitNestedRun, normalizeSidebarPreferences, sessionArchived, sessionName, sessionState, showAllSessionsPreferences, sidebarEmptyHasNonDefaultFilter, sidebarEmptyVariant, truncateRuns,
  showFewerRows, stickyListFailure, toggleCollapsedGroup, expandCollapsedGroup,
  OTHER_PROJECT_KEY, customOrderKey, isCustomOrderKey, moveSection, sectionOrderKeys, sortSectionsAlphabetically, withSectionOrder,
} from "./sidebar-model";
// A sub-agent's approval is attributed to the session that owns it: the
// sub-agent thread is never a sidebar row, so a bare threadId match would
// leave a blocked session with no "awaiting input" state at all.
import { hasPendingApproval, latestTurnError } from "./state.js";
import { describeTurnError } from "./turn-error-model.mjs";
import { archiveBlockedByField, archiveChord, archiveNeighbour, collectJumpRows, createJumpHints, isTypingTarget } from "./sidebar-jump-model.mjs";
import { connectSessionCycleGroups } from "./session-cycle-adapters.mjs";
import { useSourceToasts } from "./source-toast.jsx";
import { useSidebarRowDrag, SidebarDragGhost, PinnedDropRow } from "./source-sidebar-drag.jsx";
import { dragRowStyle, pinnedOrderAfterDrop } from "./sidebar-drag-model.mjs";
import { sessionPaneDropHost, splitStore, useSplitSides } from "./source-split-view.jsx";
import { useStartIntl } from './source-code-start-adapters.jsx';
import { nestedSessionLabel, nestedStatusLabels, nestedRevealLabel } from './generated/code-current/nested-session-copy.mjs';
import { NestedStatusSeparator } from './generated/code-current/nested-session-separator.mjs';
import { NestedStatusDot, NestedErrorIcon, nestedFocusClass, sidebarHitRowMainClass } from './generated/code-current/nested-session-parts.mjs';
import { SidebarSearchField } from './generated/code-current/sidebar-search.mjs';
import { CdsDensityContext as CdsBadgeDensity } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { SidebarNavBadge } from './generated/code-current/sidebar-nav-badge.mjs';
import { currentSidebarSession } from './sidebar-session-current-model.mjs';
import { SourceCodeSidebarRow, SidebarCurrentMenuHost, SourceSidebarRowMore } from './source-code-sidebar-row.jsx';
import { SourceCodeSidebarFilter, sidebarNestedCommands } from './source-sidebar-filter-current.jsx';
import { currentSidebarDetails } from './sidebar-details-current-model.mjs';
import { SidebarSearchContext } from './source-sidebar-current-adapters.jsx';
import { RegisterSidebarMenuRow, SidebarMenuSection } from './generated/code-current/sidebar-menu-groups.mjs';
import { SidebarOrderedMenu } from './generated/code-current/sidebar-menu-order.mjs';
import { SidebarListContext, SidebarGroupViewItems } from './generated/code-current/sidebar-group-view.mjs';
// R4g-sidebar SB3 (X7-06): those rows are CDS Dropdown parts (shared-16 K) unless they sit in a host SourceMenu body.
import { SourceMenuRows } from './source-sidebar-menu-kit.jsx';
import { listedSidebarSessions } from './nested-less-side-chats.mjs';
// R3-sections (sidebar-sections-layout, D10): the Code list is the 2.42304.0 sections layout (Pinned → manual sections → Sessions).
import { buildSidebarSections, folderBucketMenu, foldingSection, sectionFoldTarget, sectionsFoldedKeys, sectionsPreferences, sectionsRowRegistry, sessionsSectionId,
  sessionsViewPatch, sidebarSectionsList, withLegacyListFields } from './sidebar-sections-layout.mjs';
import { SidebarBlankArea, SidebarSectionsList, bulkArchiveConfirmCopy, useSidebarSectionsHost, usePendingSectionFolds } from './source-sidebar-sections.jsx';
import { useSectionsKeptWhileEmpty, useSidebarSectionsStore } from './source-sidebar-sections-adapters.jsx';
import { CreateGroupDialog } from './generated/sidebar-sections/group-dialog.mjs';
import { sectionMessages } from './generated/sidebar-sections/group-copy.mjs';
import { digitFor, moveToGroupRows, multiHotkeys, multiMenuState, pinTargets,
  bulkDeleteConfirmCopy, runBulkSessions } from "./sidebar-bulk-model.mjs";
import {
  clearSelection, createSelection, isSelected, pruneSelection, selectRange, setSelection as replaceSelection, toggleSelection,
} from "./sidebar-selection.mjs";
import { SIDEBAR_WIDTH, sidebarFloorWidth } from "./sidebar-width-model.mjs";
import { SidebarResizeHandle as OriginalSidebarResizeHandle } from "./generated/sidebar-resize/sidebar-resize-handle.mjs";
import { useSidebarResizeHost } from "./source-sidebar-resize-adapters.jsx";
import { SourceConfirmationDialog, SourceDialog, SourceDialogFooter, useDialogRetention } from "./source-dialog.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourceSwitch } from "./source-switch.jsx";
import { hiddenSessionsNotice } from "./session-engine-model.mjs";
import { SourceSidebarPalette } from "./source-sidebar-palette.jsx";
import { paletteActions } from "./sidebar-palette-model.mjs";
import { JUMP_COMMANDS } from "./focus-region-model.mjs";
import { jumpToRegions, regionJumpAvailable } from "./use-focus-regions.js";
import "./source-sidebar.css";
import { getAssistantName, t, tn } from "../electron/i18n/index.mjs";
import { coreForEngine, coreName, coreSupports } from "../electron/core-registry.mjs";

/** Current classic sidebar DOM menus on the shared CDS SourceMenu primitive:
 * sidebar-main Z.Root/Z.Popup (Filter: side bottom, align end, sideOffset 4,
 * classic !min-w-[200px]) and sidebar-session J.Popup (side bottom, align end);
 * the right-click variant follows the context-menu branch (ev.Root over Base
 * UI ContextMenu): data-cds ContextMenu, cursor anchor with the positioner's
 * context-menu defaults sideOffset -5 / alignOffset 2, and al('contextmenu')
 * layer offset 30. */
// align: shared-21 IV X.Popup align = e.align ?? "end" (the title bar's header session menu passes "start").
export function SourceSidebarMenu({ anchor, label, onClose, children, point, kind, initialHighlight, align }) {
  const cursor = !!point;
  return <SourceMenu.Popup anchor={anchor} point={point} side="bottom" align={cursor ? "start" : align ?? "end"}
    sideOffset={cursor ? CONTEXT_MENU_SIDE_OFFSET : kind === "filter" ? 4 : undefined}
    alignOffset={cursor ? CONTEXT_MENU_ALIGN_OFFSET : 0} layer={cursor ? "contextmenu" : "menu"}
    dataCds={cursor ? "ContextMenu" : "Menu"} label={label} onClose={onClose}
    className={kind === "filter" ? "source-sidebar-filter-menu" : undefined} initialHighlight={initialHighlight}>
    <SourceMenuRows>{children}</SourceMenuRows>
  </SourceMenu.Popup>;
}

// String children are looked up (literal item copy is localized; translated text passes through). `raw` marks a
// user-provided label (a custom group name, shared-21 lz `children: e.name`): shown verbatim, never looked up.
export function Choice({ children, checked, radio, onClick, disabled, disabledReason, shortcut, keepOpen, icon, variant, digit, raw = false }) {
  return <RegisterSidebarMenuRow><SourceMenu.Item checked={checked} checkedRole={radio ? "radio" : "checkbox"} disabled={disabled} variant={variant} digit={digit}
    disabledReason={disabledReason} shortcut={shortcut} keepOpen={keepOpen} icon={icon} onClick={onClick}>{raw ? children : t(children)}</SourceMenu.Item></RegisterSidebarMenuRow>;
}

function Divider() { return <SourceMenu.Separator />; }

/** sidebar-main dI: SubmenuTrigger with the current value as footnote trailing text (accent when active). */
function Submenu({ label, detail, active, children, onOpenChange }) {
  return <SourceMenu.Submenu onOpenChange={onOpenChange}>
    <SourceMenu.SubmenuTrigger label={label}
      trailing={detail ? <span className={"source-menu-detail" + (active ? " is-active" : "")}>{detail}</span> : undefined}>{label}</SourceMenu.SubmenuTrigger>
    <SourceMenu.Popup label={label}>{children}</SourceMenu.Popup>
  </SourceMenu.Submenu>;
}

export function SourceSidebarFilterMenu({ preferences, onChange, onClose, knownFolders = [], customGroups = [], showMetadataOption = true }) {
  const prefs = normalizeSidebarPreferences(preferences);
  const update = (patch, keepOpen = false) => {
    onChange({ ...prefs, ...patch });
    if (!keepOpen) onClose();
  };
  const optionMenu = (name, label, options, active = false) => <Submenu
    key={name} label={label} detail={t(options.find(([value]) => value === prefs[name])?.[1])} active={active}>
    {options.map(([value, title]) => <React.Fragment key={value}>
      {name === "groupBy" && value === "none" && <Divider />}
      <Choice radio checked={prefs[name] === value} onClick={() => update({
        [name]: value, ...(name === "groupBy" && value === "state" ? { status: "active" } : {}),
      })}>{t(title)}</Choice>
    </React.Fragment>)}
  </Submenu>;
  return <>
    {optionMenu("status", t("Status"), CLASSIC_STATUS_OPTIONS, prefs.status !== "active")}
    {prefs.groupBy === "state" && optionMenu("stateActivityDays", t("Last activity"),
      [[1, "1d"], [3, "3d"], [7, "7d"], [30, "30d"], [0, "All"]], prefs.stateActivityDays !== 7)}
    <Divider />
    {optionMenu("groupBy", t("Group by"), CLASSIC_GROUP_OPTIONS)}
    {optionMenu("sortBy", t("Sort by"), CLASSIC_SORT_OPTIONS)}
    {showMetadataOption && <Submenu label={t("Show")}>
      <Choice checked={prefs.showMetadata} keepOpen
        onClick={() => update({ showMetadata: !prefs.showMetadata }, true)}>{t("Metadata")}</Choice>
    </Submenu>}
    {/* shared-23 xF code branch: separator, 'Show empty groups' (W: a folder or custom grouping with groups to show),
        then 'Show PR status' (always; show_pr_status), both keepOpen checkboxes. */}
    <Divider />
    {((prefs.groupBy === "project" && knownFolders.length > 0) || (prefs.groupBy === "custom" && customGroups.length > 0)) &&
      <Choice checked={prefs.showEmptyGroups} keepOpen
        onClick={() => update({ showEmptyGroups: !prefs.showEmptyGroups }, true)}>{t("Show empty groups")}</Choice>}
    <Choice checked={prefs.showPrStatus} keepOpen
      onClick={() => update({ showPrStatus: !prefs.showPrStatus }, true)}>{t("Show PR status")}</Choice>
    {hasSidebarFilters(prefs) && <>
      <Divider />
      <Choice onClick={() => { onChange(clearSidebarFilters(prefs)); onClose(); }}>{t("Clear filters")}</Choice>
    </>}
  </>;
}

// sidebar-session.js GH: while a row menu is open, letter hotkeys are read at
// the document level except when the key is typed into an editable control.
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]';
// Base UI menu store setOpen (vendor-frame-BmPfNbgY.js:26059-26062, :23720): only a trigger press with
// event.detail 0 (Enter / Space) is a keyboard open that highlights the first item; a pointer open (and a
// right-click) highlights nothing and focuses the popup ("popup", source-menu.jsx), so the highlight follows the
// pointer and ArrowDown starts at the first row. The arrow keys pass "first" / "last" (menuTriggerProps).
export const keyboardEntry = (event) => (event?.detail === 0 ? "first" : undefined);
// Bulk result toasts: the composed English ("Archived {count} older sessions",
// "{count} session couldn’t be removed. Try again.") is the dictionary key.
const bulkDoneMessage = (verb, count, noun) => tn(count, `${verb} {count} ${noun}`, `${verb} {count} ${noun}s`);
const bulkFailedMessage = (verb, count) => tn(count, `{count} session couldn’t be ${verb}. Try again.`, `{count} sessions couldn’t be ${verb}. Try again.`);

/**
 * Session row menu (sidebar-session-items.js M single / N multi). Letter keys
 * (p u r f a d; p u a d for multi) are handled by a document-level capture
 * listener while the menu is open, never while a submenu is open or the key
 * is typed into an editable target. Items with no local backing (project/cloud/
 * runner items) are not rendered. Export (e)
 * saves the transcript as /export does (sidebar-session-items.js:467-473), and
 * 'Keep computer awake' (:672-690) keeps the Mac awake while this one session
 * runs (sessionMetadata keepAwake, desktop-settings power()).
 */
export function SourceSidebarSessionMenu({
  session, metadata = {}, customGroups = [], state = {}, onAction, onRename, onCreateGroup, onClose,
  onDelete, onFork, forkUnavailable, multi, pinnedSiblings, nested, editors = [], shareable = false,
  // ce4f4374c Ae isUnarchiving: this session's Unarchive is in flight ("Unarchiving…", disabled).
  unarchiving = false,
  // Split view and windows (main.jsx; official lE/uE and cE): splitItem(id) → {kind:"open"} | {kind:"close", side} | null.
  windowActions = null,
  // c593f7513 wm/Om header menu (k = Rt with canPin false, no readState, hideMoveToGroup, keepAwake and paneItems
  // dropped): no Move up/down, Pin, Mark as read/unread, nested toggle, Move to group or Keep computer awake;
  // settingsItems (the Transcript view submenu) fill ce4f4374c's settings section (ke) above Archive/Delete.
  header = false, settingsItems = null,
  // R3-sections: the sections layout's Move to copy (shared-18 xE / shared-20 Sx); null keeps the classic group copy.
  sectionCopy = null,
}) {
  // The open submenu (its name) and each numbered submenu's digits (official onKeyDownCapture on those popups: 1-9
  // without modifiers pick an entry while it is open); letter hotkeys stand down while any submenu is open.
  const openSubmenu = useRef(null);
  const hotkeys = useRef(new Map());
  const digitActions = useRef(new Map());
  useEffect(() => {
    const handler = (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR)) return;
      const run = openSubmenu.current ? digitActions.current.get(openSubmenu.current)?.get(event.key) : hotkeys.current.get(event.key.toLowerCase());
      if (!run) return;
      event.preventDefault(); event.stopPropagation();
      run();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);
  const trackSubmenu = (name) => (open) => {
    if (open) openSubmenu.current = name;
    else if (openSubmenu.current === name) openSubmenu.current = null;
  };
  const numbered = (actions) => new Map(actions.slice(0, 9).map((action, index) => [String(index + 1), action]));
  const act = (action, payload) => { onClose(); onAction(action, session, payload); };
  const currentGroupName = customGroups.find((group) => group.id === metadata.customGroupId)?.name;
  const groupCopy = sectionCopy ? {
    moveTo: t(sectionCopy.moveTo.defaultMessage), moveCountTo: (count) => t(sectionCopy.moveCountTo.defaultMessage, { count }),
    // Sx: "Remove from {groupName}" for the row's own section, "Remove from groups" when there is none to name.
    removeFrom: currentGroupName === undefined ? t(sectionCopy.removeFromSeveral.defaultMessage) : t(sectionCopy.removeFrom.defaultMessage, { groupName: currentGroupName }),
    removeFromSeveral: t(sectionCopy.removeFromSeveral.defaultMessage), newEllipsis: t(sectionCopy.newEllipsis.defaultMessage),
  } : { moveTo: t("Move to group"), moveCountTo: (count) => t("Move {count} to group", { count }), removeFrom: t("Ungrouped"), removeFromSeveral: t("Ungrouped"), newEllipsis: t("New group…") };
  if (multi) {
    // ce4f4374c Me over c39a247c4 ve: Pin {count} / Unpin {count} (only when some selected row would change; p pins,
    // else unpins), Mark {count} as unread, Move {count} to group, Set model for {count} (Ne: the model catalog,
    // numbered), then Archive / Unarchive {count} and Delete {count}.
    const { count, sessions: selected, onBulk, pin = null, unpin = null, models = [] } = multi;
    const allArchived = selected.length > 0 && selected.every(sessionArchived);
    const run = (action, payload, targets = selected) => { onClose(); onBulk(action, targets, payload); };
    const runPin = () => run("pin", undefined, pin.sessions), runUnpin = () => run("unpin", undefined, unpin.sessions);
    const setModel = (model) => run("set-model", { model });
    const keyed = { pin: runPin, unpin: runUnpin, "mark-unread": () => run("mark-unread"), archive: () => run("archive"), unarchive: () => run("unarchive"), delete: () => run("delete") };
    hotkeys.current = new Map(multiHotkeys({ pin, unpin }, { allArchived }).map(([key, action]) => [key, keyed[action]]));
    const moveEntries = customGroups.length + 1 + (onCreateGroup ? 1 : 0);
    digitActions.current = new Map([
      ["move", numbered([
        ...customGroups.map((group) => () => run("move-to-group", { groupId: group.id })),
        () => run("move-to-group", { groupId: null }),
        ...(onCreateGroup ? [() => { onClose(); onCreateGroup(selected); }] : []),
      ])],
      ["model", numbered(models.map((model) => () => setModel(model.id)))],
    ]);
    // R3-sections (WI-4, sidebar-06): 2.42304.0 ce4f4374c Be renders these items flat (no Menu.Group around them; only the
    // Move {count} to submenu's list is one): Pin / Unpin / Mark {count} as unread, the separator (`ae`) before Move
    // {count} to and Set model for {count}, a separator, then Archive or -- when every selected row is archived
    // (c39a247c4: onUnarchive only if `i.every(e => e.isArchived && …capabilities.unarchive === !0)`; every local core
    // can unarchive) -- Unarchive {count}, and Delete {count}, counting the lifecycle rows (here every selected row).
    return <div className="source-session-menu-contents" data-multi-count={count}>
      {pin && <Choice shortcut="p" onClick={runPin}>{t("Pin {count}", { count: pin.count })}</Choice>}
      {unpin && <Choice shortcut={pin ? undefined : "p"} onClick={runUnpin}>{t("Unpin {count}", { count: unpin.count })}</Choice>}
      <Choice shortcut="u" onClick={() => run("mark-unread")}>{t("Mark {count} as unread", { count })}</Choice>
      {(customGroups.length > 0 || onCreateGroup || models.length > 0) && <><Divider />
      {(customGroups.length > 0 || onCreateGroup) && <SourceMenu.Submenu onOpenChange={trackSubmenu("move")}>
        <SourceMenu.SubmenuTrigger label={groupCopy.moveCountTo(count)}>{groupCopy.moveCountTo(count)}</SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup label={groupCopy.moveCountTo(count)}>
          <SourceMenu.Group>
            {customGroups.map((group, index) => <Choice key={group.id} raw shortcut={digitFor(index)} digit={digitFor(index)}
              onClick={() => run("move-to-group", { groupId: group.id })}>{group.name}</Choice>)}
            {customGroups.length > 0 && <Divider />}
            <Choice shortcut={digitFor(customGroups.length)} digit={digitFor(customGroups.length)}
              onClick={() => run("move-to-group", { groupId: null })}>{groupCopy.removeFromSeveral}</Choice>
          </SourceMenu.Group>
          {onCreateGroup && <>
            <Divider />
            <Choice shortcut={digitFor(moveEntries - 1)} digit={digitFor(moveEntries - 1)}
              onClick={() => { onClose(); onCreateGroup(selected); }}>{groupCopy.newEllipsis}</Choice>
          </>}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>}
      {/* Ne: no submenu without a model to pick (f.length === 0). Model names are the catalog's own (verbatim). */}
      {models.length > 0 && <SourceMenu.Submenu onOpenChange={trackSubmenu("model")}>
        <SourceMenu.SubmenuTrigger label={t("Set model for {count}", { count })}>{t("Set model for {count}", { count })}</SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup label={t("Set model for {count}", { count })}>
          {models.map((model, index) => <Choice key={model.id} raw shortcut={digitFor(index)} digit={digitFor(index)}
            onClick={() => setModel(model.id)}>{model.name}</Choice>)}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>}
      </>}
      <Divider />
      <Choice shortcut="a" onClick={() => run(allArchived ? "unarchive" : "archive")}>{allArchived ? t("Unarchive {count}", { count }) : t("Archive {count}", { count })}</Choice>
      <Choice shortcut="d" variant="danger" onClick={() => run("delete")}>{t("Delete {count}", { count })}</Choice>
    </div>;
  }
  // shared-21 lz: the Move to group rows and their 1-9 digits (onKeyDownCapture while that submenu is open).
  const moveRows = moveToGroupRows({ customGroups, currentGroupId: metadata.customGroupId, canCreate: !!onCreateGroup });
  const moveActions = moveRows.filter((row) => row.kind !== "separator").map((row) => row.kind === "create"
    ? () => { onClose(); onCreateGroup([session]); } : () => act("move-to-group", { groupId: row.id }));
  digitActions.current = new Map([["move", numbered(moveActions)]]);
  // ce4f4374c Oe (:837-870) / shared-21 vV openPr: the session's PR (core binding or the band's gh lookup) opens first, g.
  const prUrl = [session.prInfo?.url, session.prLink, session.codeDesktop?.pr?.url].find((value) => typeof value === "string" && /^https:\/\//i.test(value)) ?? null;
  const busy = sessionState(session, state) === "working" || hasPendingApproval(state, session.id);
  const running = !!state.active?.[session.id];
  const canArchive = !running;
  const archived = sessionArchived(session);
  // forkUnavailable: the core cannot fork at all (unsupportedCommand, session-command-model).
  const forkReason = forkUnavailable || (running ? t("Stop the running task before forking it.") : archived ? t("Restore this session before forking it.") : undefined);
  const pinnedAt = pinnedSiblings && metadata.pinned ? pinnedSiblings.indexOf(session.id) : -1;
  const reorder = (direction) => {
    const ids = movePinned(pinnedSiblings, session.id, direction);
    if (ids) act("pinned-order", { ids });
  };
  hotkeys.current = new Map([
    ...(!header ? [["p", () => act(metadata.pinned ? "unpin" : "pin")]] : []),
    ["r", () => { onClose(); onRename(); }],
    ...(canArchive && !(archived && unarchiving) ? [["a", () => act(archived ? "unarchive" : "archive")]] : []),
    ...(!busy && !header ? [["u", () => act(metadata.unread ? "mark-read" : "mark-unread")]] : []),
    ...(onFork && !forkReason ? [["f", () => { onClose(); onFork(session); }]] : []),
    ...(onDelete && canArchive ? [["d", () => { onClose(); onDelete(session); }]] : []),
    ...(!running ? [["e", () => act("export")]] : []),
    ...(shareable && session.codeDesktop?.shareUrl ? [["c", () => act("copy-share-link")]] : []),
    ...(prUrl ? [["g", () => act("open-pr", { url: prUrl })]] : []),
  ]);
  const splitItem = windowActions?.splitItem?.(session.id) ?? null;
  // c80a67939 g/_/b/x: one "Open in" submenu. Its layout section holds Split view (only for a session this window
  // does not show, so never in the title-bar menu) and New window; after a separator come the installed editors
  // (sorted by name, main.cjs installed-editors), Terminal and Finder, with no divider between them. Every row is
  // numbered 1-9 (numbered:!0, y's digit keys) and none has an icon. Close split view stays in View › Split View (⌃⌘W).
  const openInLayout = windowActions ? [
    ...(splitItem?.kind === "open" && windowActions.onOpenSplit ? [{ key: "split", label: t("Split view"), testId: "open-in-split-trigger", run: () => { onClose(); windowActions.onOpenSplit(session); } }] : []),
    ...(windowActions.onOpenWindow ? [{ key: "window", label: t("New window"), testId: "open-in-new-window-trigger", run: () => { onClose(); windowActions.onOpenWindow(session); } }] : []),
  ] : [];
  const openInTargets = session.cwd ? [
    ...editors.map((editor) => ({ key: `editor:${editor.type}`, label: editor.name, run: () => act("open-in-editor", { type: editor.type }) })),
    { key: "terminal", label: t("Terminal"), run: () => act("open-terminal") },
    { key: "finder", label: t("Finder"), run: () => act("reveal-folder") },
  ] : [];
  const openInRow = (entry, index) => <SourceMenu.Item key={entry.key} data-testid={entry.testId} shortcut={digitFor(index)} digit={digitFor(index)}
    onClick={entry.run}>{entry.label}</SourceMenu.Item>;
  const hasOrganize = !header && (pinnedAt > 0 || pinnedAt !== -1 && pinnedAt < pinnedSiblings.length - 1 || customGroups.length > 0 || onCreateGroup);
  return <div className="source-session-menu-contents">
    {(prUrl || openInLayout.length + openInTargets.length > 0) && <><SourceMenu.Group>
      {prUrl && <Choice shortcut="g" onClick={() => act("open-pr", { url: prUrl })}>{t("Open PR")}</Choice>}
    {openInLayout.length + openInTargets.length > 0 &&
      <Submenu label={t("Open in")} onOpenChange={trackSubmenu("open-in")}>
        {openInLayout.map((entry, index) => openInRow(entry, index))}
        {openInLayout.length > 0 && openInTargets.length > 0 && <Divider />}
        {openInTargets.map((entry, index) => openInRow(entry, openInLayout.length + index))}
      </Submenu>}
      </SourceMenu.Group><Divider />
    </>}
    <SourceMenu.Group>
    {!header && <Choice shortcut="p" onClick={() => act(metadata.pinned ? "unpin" : "pin")}>{metadata.pinned ? t("Unpin") : t("Pin")}</Choice>}
    {!busy && !header && <Choice shortcut="u" onClick={() => act(metadata.unread ? "mark-read" : "mark-unread")}>{metadata.unread ? t("Mark as read") : t("Mark as unread")}</Choice>}
    <Choice shortcut="r" onClick={() => { onClose(); onRename(); }}>{t("Rename")}</Choice>
    {onFork && <Choice shortcut="f" disabled={!!forkReason} disabledReason={forkReason} onClick={() => { onClose(); onFork(session); }}>{t("Fork")}</Choice>}
    {!header && nested && nested.childCount > 0 && <Choice onClick={() => { onClose(); nested.onToggle(); }}>{nested.collapsed ? t("Show nested sessions") : t("Hide nested sessions")}</Choice>}
    </SourceMenu.Group>
    <Divider />
    <SourceMenu.Group>
    {/* sidebar-session-items.js Share / Copy link: a core that publishes a session to its own share page (OpenCode /share,
        capabilities.threadShare); the link rides on the session (codeDesktop.shareUrl). */}
    {shareable && !session.codeDesktop?.shareUrl && <Choice onClick={() => act("share")}>{t("Share")}</Choice>}
    {shareable && session.codeDesktop?.shareUrl && <>
      <Choice shortcut="c" onClick={() => act("copy-share-link")}>{t("Copy link")}</Choice>
      <Choice onClick={() => act("unshare")}>{t("Stop sharing")}</Choice>
    </>}
    <Choice shortcut="e" disabled={running} disabledReason={running ? t("Available when {assistant} finishes this turn", { assistant: getAssistantName() }) : undefined}
      onClick={() => act("export")}>{t("Export")}</Choice>
    </SourceMenu.Group>
    {hasOrganize && <><Divider /><SourceMenu.Group>
    {pinnedAt > 0 && !header && <Choice onClick={() => reorder("up")}>{t("Move up")}</Choice>}
    {!header && pinnedAt !== -1 && pinnedAt < pinnedSiblings.length - 1 && <Choice onClick={() => reorder("down")}>{t("Move down")}</Choice>}
    {!header && (customGroups.length > 0 || onCreateGroup) && <>
      {/* shared-21 lz (showIcon false, closeMenuForHotkeys): numbered radio rows for the groups (checked: the
          session's), 'Ungrouped' (cz) while it is in one, then 'New group…'. */}
      <Submenu label={groupCopy.moveTo} onOpenChange={trackSubmenu("move")}>
        {moveRows.map((row, index) => row.kind === "separator" ? <Divider key={`sep-${index}`} />
          : row.kind === "group" ? <Choice key={row.id} raw radio checked={row.checked} shortcut={row.digit} digit={row.digit}
            onClick={() => act("move-to-group", { groupId: row.id })}>{row.name}</Choice>
          : row.kind === "ungrouped" ? <Choice key="ungrouped" radio checked={false} shortcut={row.digit} digit={row.digit}
            onClick={() => act("move-to-group", { groupId: null })}>{groupCopy.removeFrom}</Choice>
          : <Choice key="create" shortcut={row.digit} digit={row.digit} onClick={() => { onClose(); onCreateGroup([session]); }}>{groupCopy.newEllipsis}</Choice>)}
      </Submenu>
    </>}
    </SourceMenu.Group></>}
    {/* ce4f4374c Yt && an: a separator above the ke section (Keep computer awake) whenever items precede it.
        sidebar-session-items.js:665-683: a menuitemcheckbox with an xs Switch that stays open, so the change shows. */}
    {header ? settingsItems && <>
      <Divider />
      <SourceMenu.Group>{settingsItems}</SourceMenu.Group>
    </> : <>
      <Divider />
      <SourceMenu.Group><SessionKeepAwakeItem session={session} metadata={metadata} onAction={onAction} /></SourceMenu.Group>
    </>}
    <Divider />
    <SourceMenu.Group>
    <Choice shortcut="a" disabled={!canArchive || (archived && unarchiving)} onClick={() => act(archived ? "unarchive" : "archive")}>
      {archived ? (unarchiving ? t("Unarchiving…") : t("Unarchive")) : t("Archive")}
    </Choice>
    {onDelete && <Choice shortcut="d" variant="danger" disabled={!canArchive} disabledReason={canArchive ? undefined : t("Stop the running task before deleting it.")}
      onClick={() => { onClose(); onDelete(session); }}>{t("Delete")}</Choice>}
    </SourceMenu.Group>
  </div>;
}

/** sidebar-session-items.js:665-683 / ce4f4374c ke: 'Keep computer awake', a menuitemcheckbox with an xs Switch that
 * stays open (sessionMetadata keepAwake). The row menu and the title bar's View options menu (cf74bc599 ZT O) share it. */
export function SessionKeepAwakeItem({ session, metadata = {}, onAction }) {
  return <SourceMenu.Item keepOpen role="menuitemcheckbox" aria-checked={metadata.keepAwake === true} description={t("Only for this session")} data-keep-awake=""
    trailing={<SourceSwitch decorative size="xs" checked={metadata.keepAwake === true} />}
    onClick={() => onAction("keep-awake", session, { value: metadata.keepAwake !== true })}>{t("Keep computer awake")}</SourceMenu.Item>;
}

/** sidebar-rows.js:8060-8088 aO: every leading status glyph sits in a 14px-minimum centred span with
 * role status (live states) or img and the label as its name, inside a CDS tooltip with the same label
 * (Xs delay 500, closeDelay 0, hoverable false). */
function StatusGlyph({ label, live = false, children }) {
  return <SourceTooltip content={label} delay={500} closeDelay={0} hoverable={false}>
    <span role={live ? "status" : "img"} aria-label={label} className="source-status-glyph">{children}</span>
  </SourceTooltip>;
}

// sidebar-rows.js:6687-6697 fE (PR state names) for the review glyph; :6755-6772 TE/EE/DE for the code
// error glyph: rate_limit -> usage, network -> offline, anything else -> warning.
const PR_STATE_LABELS = { open: t("Open"), draft: t("Draft"), approved: t("Approved"), changesRequested: t("Changes requested"), conflicting: t("Merge conflicts") };
const ERROR_GLYPHS = { warning: ["Warning", "danger"], usage: ["UsageGaugeHigh", "danger"], offline: ["CloudSlash", "secondary"] };

/** NO (sidebar-rows.js:8512-8545) with DO/mO/bO/CO (:8152-8270): archived, error, awaiting, running,
 * unread ('ready') and the idle hollow dot. The error label is bO's category title (rO): the short
 * turn-error headline, or shared-18 W.generic 'Something went wrong' when no turn error is known. */
function SessionStatus({ session, state, unread, showPrStatus = true }) {
  const status = sessionState(session, state);
  const approval = hasPendingApproval(state, session.id);
  if (sessionArchived(session)) return <StatusGlyph label={t("Archived")}><Icon name="Archive" size={16} className="source-status-archived" /></StatusGlyph>;
  if (status === "blocked" && !approval) {
    const error = latestTurnError(state, session.id);
    const view = error ? describeTurnError(error) : null;
    const [icon, tone] = ERROR_GLYPHS[view?.category === "rate_limit" ? "usage" : view?.category === "network" ? "offline" : "warning"];
    return <StatusGlyph live label={view?.headline ?? t("Something went wrong")}>
      <Icon name={icon} size={16} className="source-status-error" data-tone={tone} />
    </StatusGlyph>;
  }
  if (status === "blocked" || status === "working" || unread) {
    const kind = approval ? "awaiting" : status === "working" ? "running" : "ready";
    return <StatusGlyph live label={approval ? t("Awaiting input") : status === "working" ? t("Running") : t("Unread response")}>
      <span className="status-dot" data-kind={kind} />
    </StatusGlyph>;
  }
  // 'Show PR status' off (filter menu, show_pr_status): a review row keeps the idle dot.
  if (status === "review" && showPrStatus) return <StatusGlyph label={PR_STATE_LABELS[session.prState] ?? t("Open")}><Icon name="GitPullRequest" size={16} /></StatusGlyph>;
  return <StatusGlyph label={t("Idle")}><span className="source-session-dot" /></StatusGlyph>;
}

/** AD + jD (sidebar-rows.js:7222-7325): the inline edit field. It focuses and selects on entry; a blur in
 * the first 250ms refocuses it; Enter submits and Escape cancels, both returning focus to the row; a
 * later blur submits without moving focus. Submitting closes at once; the caller shows the optimistic
 * name and reverts it if the request fails. jD classes: hide-focus-ring bg-transparent text-primary
 * border-none. */
function InlineRenameInput({ initial, label, maxLength, className = "", onCommit, onClose }) {
  const [value, setValue] = useState(initial);
  const input = useRef(null), done = useRef(false), entering = useRef(true);
  useEffect(() => {
    input.current?.focus(); input.current?.select();
    entering.current = true;
    const timer = setTimeout(() => { entering.current = false; }, 250);
    return () => clearTimeout(timer);
  }, []);
  const finish = (submit, refocus) => {
    if (done.current) return;
    done.current = true;
    onClose(refocus);
    const name = value.trim();
    if (submit && name && name !== initial) onCommit(name);
  };
  return <input ref={input} type="text" value={value} maxLength={maxLength} aria-label={t(label)}
    className={`hide-focus-ring ${className}`.trim()} onChange={(event) => setValue(event.target.value)}
    onBlur={() => {
      if (done.current) return;
      if (entering.current) { input.current?.focus(); input.current?.select(); return; }
      finish(true, false);
    }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter") { event.preventDefault(); finish(true, true); }
      else if (event.key === "Escape") { event.preventDefault(); finish(false, true); }
    }} />;
}

/** sidebar-rows.js:7400-7420, :7531-7537: the editing row keeps the row's own leading status glyph and
 * its hover/selected background (kD + ED, no ring); the field is labelled 'Rename'. */
function RenameRow({ label, glyph, selected, nested, iconless = false, onCommit, onClose }) {
  return <div className="source-session-row source-session-rename" data-row="" data-nested={nested || undefined}
    data-selected={selected ? "focused" : undefined} data-iconless={iconless || undefined}>
    {!iconless && <span className="source-leading-slot">{glyph}</span>}
    <InlineRenameInput initial={label} label={t("Rename")} maxLength={200} className="source-session-rename-input" onCommit={onCommit} onClose={onClose} />
  </div>;
}

// sidebar-session.js:16434-16510 ZB on the shared Dialog: size sm, comfortable density (Kl), a Header
// without the close button, a grid gap-2 form whose 'Group name' field takes the initial focus, the
// switchNote when the list is not grouped by custom, and a Footer with Cancel (secondary) and 'Create
// group' / 'Create and group by custom' (primary). Renaming is inline in the group header (QD).
function GroupNameDialog({ switchesToCustom = false, onSubmit, onClose, open, onExited }) {
  const [name, setName] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState("");
  const input = useRef(null);
  const close = () => { if (!pending) onClose(); };
  return <SourceDialog open={open} onExited={onExited} size="sm" showClose={false} density="comfortable" title={t("New group")} initialFocusRef={input}
    onClose={close} className="source-group-dialog">
    <form className="source-group-form" onSubmit={async (event) => {
      event.preventDefault();
      if (!name.trim() || pending) return;
      setPending(true); setError("");
      try { await onSubmit(name.trim()); onClose(); }
      catch (reason) { setError(reason.message || String(reason)); setPending(false); }
    }}>
      <input ref={input} aria-label={t("Group name")} placeholder={t("Group name")} value={name} maxLength={100}
        disabled={pending} onChange={(event) => setName(event.target.value)} />
      {switchesToCustom && <p className="source-group-switch-note">{t("The list will switch to Custom groups to show it.")}</p>}
      {error && <p role="alert">{error}</p>}
      <SourceDialogFooter>
        <SourceSettingsButton disabled={pending} onClick={close}>{t("Cancel")}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" busy={pending} disabled={!name.trim()}>{switchesToCustom ? t("Create and group by custom") : t("Create group")}</SourceSettingsButton>
      </SourceDialogFooter>
    </form>
  </SourceDialog>;
}

/** yD deleteBody (sidebar-rows.js:7097-7140) for a custom group holding `count` sessions. */
export function deleteGroupCopy(groupName, count) {
  const rest = count === 0 ? t("Nothing is in it.") : tn(count, "The {count} item in it will no longer be grouped.", "The {count} items in it will no longer be grouped.");
  return { title: t("Delete group?"), body: t("“{name}” will be removed. {rest}", { name: groupName, rest }), confirmLabel: t("Delete"), danger: true };
}

/** Confirm dialog for destructive sidebar actions: the shared ConfirmationDialog (shared-frame rp,
 * danger confirmVariant). The confirm action runs before the dialog closes; a rejection stays
 * inside the dialog. */
export function SourceConfirmDialog({ title, body, confirmLabel, danger = false, initialFocus = "confirm", onConfirm, onClose, open, onExited }) {
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  return <SourceConfirmationDialog open={open} onExited={onExited} title={title} body={body} descriptionClassName="source-confirm-body"
    confirmLabel={confirmLabel} confirmVariant={danger ? "danger" : "primary"} pending={pending} onCancel={onClose} initialFocus={initialFocus}
    className="source-confirm-dialog" onConfirm={async () => {
      setPending(true); setError("");
      try { await onConfirm(); onClose(); }
      catch (reason) { setError(reason.message || String(reason)); setPending(false); }
    }}>
    {error && <p role="alert" className="source-confirm-error">{error}</p>}
  </SourceConfirmationDialog>;
}

// A core with capabilities.deleteHistory deletes its own history with the
// session (the DeepSeek core: its Harness sessions folder, codex-app-server
// deleteSessionFiles; a bridge: the agent's own session store), so its dialogs
// say so and name that core. engine is boot.core, a core id or an engine name.
const deletesCoreHistory = (engine) => coreSupports(engine, "deleteHistory");
// Where that history lives, in copy: the core's name, plus the folder it keeps
// it in (a "~/..." path): what the running core reports
// (capabilities.historyLocation), else its descriptor's historyLocation (the
// DeepSeek core's: the Harness sessions folder its bridge deletes from).
const locationText = (value) => typeof value === "string" && value.trim() && value.length <= 200 ? value.trim() : null;
function coreHistory(engine) {
  const descriptor = coreForEngine(typeof engine === "string" ? engine : engine?.engine);
  const name = descriptor.name || descriptor.id;
  const reported = engine && typeof engine === "object" ? engine.capabilities?.historyLocation : null;
  const location = locationText(reported) ?? locationText(descriptor.historyLocation);
  return { name, place: location ? `${name} (${location})` : name };
}

/** sidebar-session.js:13885-13924 delete confirm copy; a core that deletes its own history names it too. */
export function deleteConfirmCopy(sessions, { engine, intl } = {}) {
  const count = sessions.length, history = deletesCoreHistory(engine) ? coreHistory(engine) : null;
  // R3-sidebar2 (sidebar-15): a bulk delete is VY's bulk confirmation (2.42304.0 shared-19 KY over LY, sidebar-bulk-model):
  // "Delete # sessions", the archived lines, Cancel focused. The host's own core-history sentence stays as the body.
  if (count > 1 && intl) {
    const copy = bulkDeleteConfirmCopy(intl, { count, archivedCount: sessions.filter(sessionArchived).length });
    return history ? { ...copy, body: t("These {count} sessions and their history in {place} will be permanently deleted. This can’t be undone.", { count, place: history.place }) } : copy;
  }
  return {
    title: tn(count, "Delete session?", "Delete {count} sessions?"),
    body: count === 1
      ? history ? t("“{name}” and its history in {place} will be permanently deleted. This can’t be undone.", { name: sessionName(sessions[0]), place: history.place })
        : t("“{name}” will be permanently deleted. This can’t be undone.", { name: sessionName(sessions[0]) })
      : history ? t("These {count} sessions and their history in {place} will be permanently deleted. This can’t be undone.", { count, place: history.place })
        : t("These {count} sessions will be permanently deleted. This can’t be undone.", { count }),
    confirmLabel: t("Delete"), danger: true,
  };
}

/** sidebar-groups.js:18641-18669 Older bucket confirm copy (a core that deletes its own history names it). */
export function olderConfirmCopy(action, count, { engine } = {}) {
  if (action === "archive") return {
    title: t("Archive older sessions?"),
    body: tn(count, "This will archive {count} session older than a week. Pinned sessions aren’t affected.", "This will archive {count} sessions older than a week. Pinned sessions aren’t affected."),
    confirmLabel: t("Archive all"), danger: false,
  };
  const history = deletesCoreHistory(engine) ? coreHistory(engine) : null;
  return {
    title: t("Delete older sessions?"),
    body: history ? tn(count, "This will permanently delete {count} session older than a week, including its history in {place}. Pinned sessions aren’t affected. This can’t be undone.", "This will permanently delete {count} sessions older than a week, including their history in {place}. Pinned sessions aren’t affected. This can’t be undone.", { place: history.place })
      : tn(count, "This will permanently delete {count} session older than a week. Pinned sessions aren’t affected. This can’t be undone.", "This will permanently delete {count} sessions older than a week. Pinned sessions aren’t affected. This can’t be undone."),
    confirmLabel: t("Delete all"), danger: true,
  };
}


// sidebar-groups.js:7648-7671 hO/gO/_O pictogram rects, verbatim; bO
// (:7672-7686) emits hO as whole rects and gO/_O through the vO checkerboard
// (gO cells where (row+col)%2==0, _O cells where row%2==0 && col%2==0).
const EMPTY_PICTO_RECTS = [[90, 0, 20, 20], [90, 40, 20, 20], [70, 20, 20, 20], [110, 20, 20, 20]];
const EMPTY_PICTO_CHECKER = [[20, 40, 20, 20], [20, 80, 20, 20], [0, 60, 20, 20], [40, 60, 20, 20], [90, 20, 20, 20], [140, 40, 10, 20],
  [110, 60, 10, 20], [130, 60, 20, 20], [120, 80, 20, 20], [110, 100, 10, 20], [100, 120, 10, 20]];
const EMPTY_PICTO_SPARSE = [[20, 60, 20, 20], [40, 100, 10, 20], [50, 120, 10, 20]];
const pictoCells = (rects, keep) => {
  let d = "";
  for (const [x, y, w, h] of rects) for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) if (keep(row, col)) d += `M${x + col} ${y + row}h1v1h-1z`;
  return d;
};
let emptyPictoPath = null;
const emptyPictogramPath = () => (emptyPictoPath ??= EMPTY_PICTO_RECTS.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("")
  + pictoCells(EMPTY_PICTO_CHECKER, (row, col) => (row + col) % 2 === 0) + pictoCells(EMPTY_PICTO_SPARSE, (row, col) => row % 2 === 0 && col % 2 === 0));

/** sidebar-groups.js:7688-7699 xO (scale .55 from OO) + 7721-7760 OO: the
 * filtered variant offers "Show all sessions" when a handler exists
 * (sidebar-main.js:13774-13778 onShowAllSessions, code mode only). */
export function SourceSidebarEmpty({ variant, onShowAllSessions, onRetry }) {
  if (variant === "load-failed") return <SourceSidebarLoadFailed onRetry={onRetry} />;
  if (variant === "filtered") return <div className="source-sidebar-empty" data-empty-variant="filtered">
    <p className="source-sidebar-empty-text">{t("No sessions match the current filters")}</p>
    {onShowAllSessions && <button type="button" className="source-sidebar-show-all hide-focus-ring" onClick={onShowAllSessions}>{t("Show all sessions")}</button>}
  </div>;
  const scale = 0.55;
  return <div className="source-sidebar-empty" data-empty-variant="no-sessions">
    <p className="source-sidebar-empty-text">{t("Sessions you start will show up here")}</p>
    <div aria-hidden="true"><svg width={150 * scale} height={140 * scale} viewBox="0 0 150 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={emptyPictogramPath()} fill="hsl(var(--pictogram-200))" />
    </svg></div>
  </div>;
}

/** shared-21 YQ (readable 18199-18225): "Couldn’t load your sessions" as an
 * alert with a small Try again that stays busy until the reload settles (kp +
 * nb refetch; locally onRetry reads the list again or reconnects the core). */
function SourceSidebarLoadFailed({ onRetry }) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return <div className="source-sidebar-empty" data-empty-variant="load-failed">
    <p role="alert" className="source-sidebar-empty-text">{t("Couldn’t load your sessions")}</p>
    {onRetry && <SourceSettingsButton size="sm" busy={busy} onClick={() => {
      setBusy(true);
      Promise.resolve().then(onRetry).catch(() => {}).finally(() => { if (mounted.current) setBusy(false); });
    }}>{t("Try again")}</SourceSettingsButton>}
  </div>;
}

/** shared-21 lK (readable 14548-14571), the FrameSidebarNav ErrorBoundary
 * fallback (shared-22 15368-15373): "Sidebar failed to load." and a secondary
 * Try again that remounts. The source boundary wraps only the nav; the local
 * list state lives in SourceSidebar itself, so main.jsx wraps the whole
 * sidebar and this fallback keeps the aside frame (toolbar strip and body). */
export class SourceSidebarBoundary extends React.Component {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // Nothing is logged or persisted: session metadata can carry user content.
  }
  render() {
    if (!this.state.failed) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    return <aside className="app-sidebar dframe-sidebar source-sidebar cds-root" aria-label={t("Sidebar")} data-variant="web" data-density="compact" data-platform="desktop">
      <div className="sidebar-toolbar df-titlebar window-drag"><div className="traffic-space" /></div>
      <div className="dframe-sidebar-body source-sidebar-failed" data-testid="sidebar">
        <p className="source-sidebar-failed-text">{t("Sidebar failed to load.")}</p>
        <SourceSettingsButton variant="secondary" onClick={() => {
          try { this.props.onReset?.(); } finally { this.setState((state) => ({ failed: false, attempt: state.attempt + 1 })); }
        }}>{t("Try again")}</SourceSettingsButton>
      </div>
    </aside>;
  }
}

/** shared-21 y0/x0/S0 (readable 21120-21144): a polite status span whose text
 * clears after 4s; the nonce toggles a zero-width space so a repeat is read again. */
const ANNOUNCEMENT_MS = 4000;
function useSidebarAnnouncement() {
  const [announcement, setAnnouncement] = useState({ nonce: 0, text: "" });
  const announce = useCallback((text) => setAnnouncement((previous) => ({ nonce: previous.nonce + 1, text })), []);
  useEffect(() => {
    if (announcement.text === "") return undefined;
    const timer = setTimeout(() => announce(""), ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [announcement, announce]);
  return { announcement, announce };
}

/** shared-21 Bz/Hz (readable 11298-11313, attached by Vz as capture handlers on the
 * code session list, 11514-11517): after a Show less click the list swallows the
 * rest of that multi-click (detail > 1) for 500ms, so the second click does not
 * open or rename the row that moved under the pointer. */
let multiClickGuardUntil = 0;
const guardMultiClick = (ms) => { multiClickGuardUntil = performance.now() + ms; };
const swallowGuardedMultiClick = (event) => {
  if (performance.now() < multiClickGuardUntil && event.nativeEvent.detail > 1) { event.stopPropagation(); event.preventDefault(); }
};

/** shared-21 H0 (readable 21209-21357) for a local bucket: "Show {count} more"
 * while rows are hidden, "Show less" once revealed to the end (xg
 * showFewerRows "collapse"), or a held Show less (aria-disabled, data-held,
 * described by "You have something open near the end of this list.", CDS
 * tooltip lazy/delay 350/right/multiline) when folding would hide the open row.
 * Each action is announced in a role=status span (S0). A click inside a row
 * hands focus to the button first so folding never drops it (T). */
export function SourceShowMoreButton({ bucketLabel, count = 0, fewer, onShowMore, onShowLess }) {
  const { announcement, announce } = useSidebarAnnouncement();
  const describedBy = useId();
  const showLess = fewer !== undefined, held = fewer === "held";
  const heldText = held ? t("You have something open near the end of this list.") : undefined;
  const button = <button type="button" className="source-show-more" data-row="" data-roving-item=""
    aria-disabled={held || undefined} aria-describedby={held ? describedBy : undefined} data-held={held ? "" : undefined}
    aria-label={showLess ? t("Show less in {bucketLabel}", { bucketLabel }) : t("Show {count} more in {group}", { count, group: bucketLabel })}
    onClick={(event) => {
      if (held) return;
      if (event.detail > 1) return;
      if (showLess) {
        const active = event.currentTarget.ownerDocument.activeElement;
        const scope = event.currentTarget.closest(".dframe-sidebar") ?? event.currentTarget.ownerDocument;
        if (active && scope.contains(active) && active.closest("[data-row-key]")) event.currentTarget.focus({ preventScroll: true });
        onShowLess?.();
        announce(t("Showing less in {bucketLabel}", { bucketLabel }));
        if (event.detail > 0) guardMultiClick(500);
        return;
      }
      onShowMore?.(event);
      if (count > 0) announce(t("Showing {count} more in {bucketLabel}", { count, bucketLabel }));
    }}>
    <span className="source-leading-slot df-leading-slot" aria-hidden="true" />{showLess ? t("Show less") : t("Show {count} more", { count })}
  </button>;
  // H0 always wraps the button in Sh (empty content = no tooltip) and always renders the hidden description, so
  // the button is not remounted (and keeps focus) when the held state comes or goes.
  return <>
    <SourceTooltip content={heldText} delay={350} side="right" multiline closeOnClick={false}>{button}</SourceTooltip>
    <span id={describedBy} hidden>{heldText}</span>
    <span className="source-sr-only" role="status">{announcement.text}{announcement.nonce % 2 === 1 ? "\u200B" : ""}</span>
  </>;
}

/** sidebar-groups.js:7761-7830 AO single-line rows: df-leading-slot with a
 * 6x6 rounded-full Ml skeleton, then a kO-width bar at the row font height.
 * The source row count comes from rememberedRecentsRows, which this app does
 * not persist, so the local count stays 3. */
const SKELETON_WIDTHS = ["68%", "54%", "44%"];
export function SourceSidebarSkeleton({ rows = 3 }) {
  return <div className="df-placeholder-rows source-sidebar-skeleton" data-testid="sidebar-rows-skeleton" role="status" aria-label={t("Loading sessions")}>
    {Array.from({ length: rows }, (_, index) => <div key={index} data-row="" className="source-sidebar-skeleton-row">
      <span className="source-leading-slot"><span data-cds="Skeleton" className="smenu-skeleton source-skeleton-dot" style={{ width: 6, height: 6 }} /></span>
      <span data-cds="Skeleton" className="smenu-skeleton" style={{ width: SKELETON_WIDTHS[index % SKELETON_WIDTHS.length], height: "var(--df-row-font, 13px)" }} />
    </div>)}
  </div>;
}

/** cov8-01: the sidebar width handle is the original 2.42304.0 shared-21 DF (exported `ra`) over shared-15 Jt (the CDS
 * ResizeHandle), extracted by scripts/extract-sidebar-resize.mjs into generated/sidebar-resize. A drag moves the
 * sidebar's inline width live (DF yk/_k on .dframe-sidebar) and commits the width once at the end; raw widths below
 * half the floor hide the sidebar live (setCollapsedPref, persisted like ⌘B). When the mouse release is lost (a mouse
 * pointermove without the primary button), DF stops following (held -> awaited) and, unless the late mouseup arrives,
 * ends the drag 200ms later and commits the width without treating it as a click (-> lost). A press without a >3px
 * move, or Enter/Space, is Hide sidebar; arrows (8 / Shift 32) and Home/End commit once each; Escape restores the
 * start width and the expanded state; window blur cancels. The host store/tooltip/intl/context answers are in
 * source-sidebar-resize-adapters.jsx; this component only feeds them SourceSidebar's width, collapsed state and
 * callbacks. */
function SidebarResizeHandle({ width, minWidth = SIDEBAR_WIDTH.MIN, collapsed, onCommit, onCollapse, onCollapsedChange }) {
  useSidebarResizeHost({ width, collapsed, onCommit, onCollapse, onCollapsedChange });
  return <OriginalSidebarResizeHandle minWidth={minWidth} />;
}

const SELECTION_DOMAIN = "code";
const SOURCE_TRUNCATE_AT = 20;
const EMPTY_REVEALED = new Map();
// Dialog backdrops live in a [data-cds-portal] root (source-dialog.jsx).
const SELECTION_SAFE_SELECTOR = '[data-row], [data-cds-portal], [role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]';

export function SourceSidebar({
  collapsed, onCollapse, onCollapsedChange, historyAt = 0, historyLength = 1, travel, mode = "code", onMode,
  onNew, onViewAllSessions, groups = [], sessions, current, state = {}, onOpen, onProject, onMenu, onAccount, accountMenuOpen = false, connectionMenuOpen = false,
  displayName = t("Local user"), accountLabel, avatarName, search = "", setSearch, showSearch, setShowSearch, searchMatches = null,
  onFolder, sidebarWidth = 288, setSidebarWidth, section, setSection, sidebarFloor = SIDEBAR_WIDTH.MIN, onSidebarFloor, fullScreen = false,
  trafficLightSpacer, cdsFont = "sans",
  sidebarPreferences, onSidebarPreferencesChange, sessionMetadata = {}, customGroups = [], pinnedOrder = [],
  knownFolders, fallbackCwd = "", onSessionAction, onCreateGroup, onCreateEnvironment, onGroupAction, loading = false,
  // R3-sections: main's section list (config.sidebarSections) and its section actions (main.jsx sectionAction → sidebar-state).
  sidebarSections, onSectionAction,
  // B37 shared-19 FK/IK: a single Delete opens main's one-dialog worktree check (SourceSessionDeleteDialog) when given.
  onConfirmDelete,
  // shared-21 BQ/VQ: the session list failed to load (core not connected, or the read failed); onRetryLoad reads it again.
  loadFailed = false, onRetryLoad,
  // Session ids whose Unarchive is in flight (ce4f4374c Ae isUnarchiving).
  unarchiving = null,
  engine = "codex", hiddenSessions, onRetryHidden, onForgetHidden, forkUnavailable,
  // Fidelity F08: Folder grouping by repo identity + the persisted section order, and the collapsed
  // hover peek owned by main.jsx (peekOpen mirrors .dframe-root[data-hovering]).
  repoIdentities, projectOrder = [], peekOpen = false, onPeekEnter, onPeekLeave, editors = [], shareable = false, onStartSession,
  // Split view and windows (main.jsx): the row menu's split / new window items, and rows drag onto the session area.
  windowActions = null,
  // ⌘K palette (source-sidebar-palette.jsx): Settings › section rows, and whether the core has full-text search.
  onOpenSettings, deepSearch = false,
  // () => the open session's and its panes' palette commands (main.jsx: sidebar-palette-model.mjs paletteActions'
  // session / panes / prompts / onShortcuts / onFileUpload / onTogglePane / onClosePane), called while the palette is open.
  paletteCommands = null,
  // The footer aux control shows only while the core is not connected (source aux slot is empty in code mode).
  connectionIssue = false,
  // ce4f4374c Ne: the model catalog (main.jsx models) the multi-selection's 'Set model for {count}' lists.
  models = null,
}) {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  const splitSides = useSplitSides();
  const openNestedIds = useMemo(() => new Set([current, ...splitSides.sides.map(side => side.current)].filter(Boolean)), [current, splitSides.sides]);
  const bulkModels = useMemo(() => (Array.isArray(models) ? models : []).map((model) => ({ id: model?.model || model?.id, name: model?.displayName || model?.name || model?.model || model?.id }))
    .filter((model) => typeof model.id === "string" && model.id), [models]);
  // Ro addSuccess / addError (sidebar-groups.js:18676-18682): row and bulk results are CDS toasts.
  const notify = (message, options) => toasts?.add(message, options);
  const notifyError = (reason, fallback = t("Something went wrong")) => notify(reason?.message || (reason ? String(reason) : fallback), { variant: "danger" });
  const [localPreferences, setLocalPreferences] = useState(() => normalizeSidebarPreferences(sidebarPreferences));
  const legacyPreferences = sidebarPreferences ?? localPreferences;
  // R3-sections: the Code list is laid out by sections; its group / sort / ascending / empty groups / metadata are the
  // Sessions section's (sidebar-sections-layout.mjs sectionsPreferences), the rest stays in the sidebar preferences.
  // R4g-sidebar SB1 (X7-05): with the section folds still pending at main laid over its snapshot.
  const sectionsList = usePendingSectionFolds(useMemo(() => mode === "code" ? sidebarSectionsList({ sidebarSections, customGroups, sessionMetadata, sidebarPreferences: legacyPreferences, projectOrder }) : null,
    [mode, sidebarSections, customGroups, sessionMetadata, legacyPreferences, projectOrder]));
  const preferences = sectionsList ? sectionsPreferences(legacyPreferences, sectionsList) : normalizeSidebarPreferences(legacyPreferences);
  const preferencesLive = useRef(preferences); preferencesLive.current = preferences;
  const [menu, setMenuState] = useState(null);
  // shared-50 G collapsedGroups: folded group keys persist with the sidebar preferences (`closed` is set below, after
  // the sections layout, which folds its sections by their own collapsed flag).
  // Every open gets a fresh token so the popup remounts instead of re-targeting
  // a live instance (a right-click while another sidebar menu is open).
  const menuToken = useRef(0);
  const setMenu = useCallback((next) => setMenuState(next ? { ...next, token: ++menuToken.current } : null), []);
  const navRef = useRef(null), laneSentinel = useRef(null);
  // sidebar-rows.js:7887-7896 + 7970-7977 eO: onScroll pins scrollLeft to 0
  // and marks data-scrolled past 2px (desktop-layout.css:799-801 top fade).
  const [scrolled, setScrolled] = useState(false);
  // sidebar-rows.js:7898-7908: measure the nav scroller's reserved lane
  // (offsetWidth - clientWidth) into --df-nav-scrollbar-lane on the enclosing
  // body, re-measured by a ResizeObserver on a zero-height sentinel inside the
  // scroller. Zero in overlay mode; the thin classic lane otherwise.
  useLayoutEffect(() => {
    const nav = navRef.current, scope = nav?.parentElement, sentinel = laneSentinel.current;
    if (!nav || !scope || !sentinel) return undefined;
    let applied = scope.style.getPropertyValue("--df-nav-scrollbar-lane") || "0px";
    const measure = () => {
      const next = `${nav.offsetWidth - nav.clientWidth}px`;
      if (next !== applied) { applied = next; scope.style.setProperty("--df-nav-scrollbar-lane", next); }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [collapsed]);
  // eO scrollResetKey (sidebar-main filter epoch): a filter change scrolls the
  // list back to the top and clears the fade. Locally keyed on the normalized
  // status/group/sort/activity/empty-groups preferences.
  const scrollResetKey = [preferences.status, preferences.groupBy, preferences.sortBy, preferences.ascending, preferences.stateActivityDays, preferences.showEmptyGroups].join("\u0000");
  useEffect(() => {
    const nav = navRef.current;
    if (nav && nav.scrollTop !== 0) nav.scrollTop = 0;
    setScrolled(false);
  }, [scrollResetKey]);
  const [renaming, setRenaming] = useState(null), [groupDialog, setGroupDialog] = useState(null), [confirm, setConfirm] = useState(null);
  // Closed dialogs stay mounted through their exit transition (source-dialog.jsx).
  const shownGroupDialog = useDialogRetention(groupDialog), shownConfirm = useDialogRetention(confirm);
  // AD optimistic labels: the submitted name shows until the session (or group) carries it, and is
  // dropped again when the request fails. renamingGroup: the custom group whose header is an input (QD).
  const [pendingNames, setPendingNames] = useState(() => new Map()), [pendingGroupNames, setPendingGroupNames] = useState(() => new Map());
  const [renamingGroup, setRenamingGroup] = useState(null);
  // pj hint store (sidebar-groups.js:9110-9132 qA): {rowKey: digit} while the held-modifier hints show.
  const [jumpHints, setJumpHints] = useState(null);
  const [selection, setSelectionState] = useState(createSelection);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const pendingRevealFocus = useRef(null), toolbarRef = useRef(null);
  // wL (shared-22-Cz3C_T8d.js:13945-13959) sums the chrome bar parts
  // (traffic-light spacer, search, nav, switcher) into the sidebar floor;
  // locally those parts are the toolbar row, measured at max-content. The
  // traffic-light spacer is gone in full screen, like wL's spacer px.
  useLayoutEffect(() => {
    const node = toolbarRef.current;
    // F08: the collapsed aside stays mounted for the hover peek with its toolbar hidden, so the floor
    // keeps its expanded value until the sidebar is shown again.
    if (!node || !onSidebarFloor || collapsed) return;
    // The aside's own right border (0.5px, painted as a device pixel) is
    // part of its width; it is dropped while collapsed, so re-measure then.
    const aside = node.parentElement, previous = node.style.width;
    node.style.width = "max-content";
    const floor = sidebarFloorWidth(node.getBoundingClientRect().width + (aside.offsetWidth - aside.clientWidth));
    node.style.width = previous;
    onSidebarFloor(floor);
  }, [fullScreen, collapsed, onSidebarFloor, trafficLightSpacer]);
  const lastChatSurface = useRef('cowork');
  if (mode !== 'code') lastChatSurface.current = mode;
  const [surfaceMenu, setSurfaceMenu] = useState(null);
  const sourceSessions = useMemo(() => sessions ?? groups.flatMap(([, items]) => items), [sessions, groups]);
  // R3-nested NBS-3: the Code list keeps a row only when shared-21 cH's Gb (shared-11 pb) holds, so a /btw child shown in
  // its parent's tabs (nested_less_side_chats) is no row, Pinned entry or family member (nested-less-side-chats.mjs).
  const listedSessions = useMemo(() => mode === "code" ? listedSidebarSessions(sourceSessions, sessionMetadata, engine) : sourceSessions, [mode, sourceSessions, sessionMetadata, engine]);
  const folders = useMemo(() => knownFolders ?? groups.map(([cwd]) => cwd), [knownFolders, groups]);
  // The list itself is never filtered by text: what is typed searches in the ⌘K palette (source-sidebar-palette.jsx).
  // R3-sections: groupsKeptWhileEmpty (KO keeps a new, still empty section listed) lives in the sections store only.
  const keptWhileEmpty = useSectionsKeptWhileEmpty();
  const sectionsModel = useMemo(() => sectionsList ? buildSidebarSections({ sections: sectionsList, sessions: listedSessions, preferences: legacyPreferences,
    metadata: sessionMetadata, customGroups, knownFolders: folders, state, fallbackCwd, pinnedOrder, repoIdentities, projectOrder, keptWhileEmpty, held: loading }) : null,
  [sectionsList, listedSessions, legacyPreferences, sessionMetadata, customGroups, folders, state, fallbackCwd, pinnedOrder, repoIdentities, projectOrder, keptWhileEmpty, loading]);
  const displayed = useMemo(() => sectionsModel ? sectionsModel.buckets : buildSidebarGroups({ sessions: listedSessions,
    preferences: mode === "code" ? preferences : { ...preferences, groupBy: "date" }, metadata: sessionMetadata, customGroups, knownFolders: folders,
    state, search: "", fallbackCwd, pinnedOrder, repoIdentities, projectOrder, contentMatches: null, currentLayout: mode === "code",
  }), [mode, listedSessions, preferences.groupBy, preferences.sortBy, preferences.ascending, preferences.status,
    preferences.stateActivityDays, preferences.showEmptyGroups, sessionMetadata, customGroups, folders, state, fallbackCwd, pinnedOrder,
    repoIdentities, projectOrder, sectionsModel]);
  const closed = useMemo(() => sectionsModel ? sectionsFoldedKeys(sectionsModel.layout, preferences.collapsedGroups) : new Set(preferences.collapsedGroups),
    [sectionsModel, preferences.collapsedGroups]);
  // sidebar-groups.js:21476-21486 CO(visible, total, hasNonDefaultFilter) + wO
  // hasArchived; the archived probe is the loaded session list here. The
  // hasNonDefaultFilter is fO (:7600-7609), not the filter badge's test.
  const visibleCount = displayed.reduce((sum, group) => sum + group.sessions.length, 0);
  // shared-21 19180-19195: Ge = VQ({failed: BQ(..), loading, list: statusFilter}); Ke = loading && !Ge ? undefined
  // (the skeleton) : HQ(visible, total, filtered, Ge), then UQ. VQ's sticky state is kept across renders here.
  const [failureState, setFailureState] = useState(() => ({ list: preferences.status, failed: false }));
  const failure = stickyListFailure(failureState, { failed: loadFailed, loading, list: preferences.status });
  if (failure !== failureState) setFailureState(failure);
  const listFailed = failure.failed;
  const listLoading = loading && !listFailed;
  const emptyVariant = listLoading ? undefined : sidebarEmptyVariant({ visible: visibleCount, total: listedSessions.length,
    hasNonDefaultFilter: sidebarEmptyHasNonDefaultFilter(mode === "code" ? {...preferences,stateActivityDays:0} : preferences), hasArchived: listedSessions.some(sessionArchived), failed: listFailed });
  // sidebar-groups zF/WF/GF/KF per bucket: lineage runs from real Thread fields.
  const runsByGroup = useMemo(() => new Map(displayed.map((group) => [group.key, buildNestedRuns(group.sessions, sessionMetadata, {currentLayout:mode === "code",sortBy:group.sortBy ?? preferences.sortBy})])), [displayed, sessionMetadata, mode, preferences.sortBy]);
  const collapsedNested = useMemo(() => new Set(preferences.collapsedNested), [preferences.collapsedNested]);
  const needsInput = useCallback((session) => nestedRowNeedsInput(session, state), [state.approvals, state.threadParents]);
  const splitRun = useCallback((run) => {
    return splitNestedRun(run, collapsedNested.has(run.parentId), { state, openIds: openNestedIds });
  }, [collapsedNested, state.approvals, state.threadParents, openNestedIds]);
  // Bucket truncation (sidebar-main.js:11657 Yn: code mode truncateAt 20; the
  // 5-row variant needs a sidebar layout context this app does not have, and
  // chat mode never truncates). sidebar-main.js:9300-9316 Px(g, 20, S): the
  // Pinned section is cut at 20 in either mode. xF keeps extraRevealed per
  // bucket; it survives collapsing/reopening the group and is reset when the
  // vF filter epoch changes, locally the group/sort/status/activity/search
  // preferences (the stand-in for sidebar-main filterEpoch).
  const revealEpoch = [preferences.groupBy, preferences.sortBy, preferences.status, preferences.stateActivityDays].join("\u0000");
  const [revealState, setRevealState] = useState(() => ({ epoch: revealEpoch, byKey: new Map() }));
  // xF `m && (o(i), c(0), d(null))`: the epoch reset happens during render.
  if (revealState.epoch !== revealEpoch) setRevealState({ epoch: revealEpoch, byKey: new Map() });
  const revealed = revealState.epoch === revealEpoch ? revealState.byKey : EMPTY_REVEALED;
  // R3-sections: Cj truncateAt 5 (manual) / Sr 5 grouped, 20 flat / qk 20 (Pinned); a sub-grouped section is never cut.
  const truncateAtFor = useCallback((group) => sectionsModel ? group.truncateAt : group.kind === "pinned" || mode === "code" ? SOURCE_TRUNCATE_AT : undefined, [mode, sectionsModel]);
  // bF keep-visible rows: the open session, selected rows and rows awaiting input.
  const keepVisibleIds = useMemo(() => new Set([...openNestedIds, ...selection.selectedKeys, ...sourceSessions.filter(needsInput).map((session) => session.id)].filter(Boolean)),
    [openNestedIds, selection.selectedKeys, sourceSessions, needsInput]);
  const truncatedByGroup = useMemo(() => new Map(displayed.map((group) => [group.key, truncateRuns(runsByGroup.get(group.key)?.runs || [], {
    truncateAt: truncateAtFor(group), extraRevealed: revealed.get(group.key) || 0, keepVisibleIds, shownRows: (run) => splitRun(run).kept,
  })])), [displayed, runsByGroup, truncateAtFor, revealed, keepVisibleIds, splitRun]);
  // xF `j > h && c(j)`: a keep-visible extension is written back so the row
  // stays revealed after the session/selection moves on.
  useEffect(() => {
    const grown = [...truncatedByGroup].filter(([key, result]) => result.extraRevealed > (revealed.get(key) || 0));
    if (grown.length === 0) return;
    setRevealState((previous) => {
      const byKey = new Map(previous.epoch === revealEpoch ? previous.byKey : []);
      for (const [key, result] of grown) byKey.set(key, Math.max(byKey.get(key) || 0, result.extraRevealed));
      return { epoch: revealEpoch, byKey };
    });
  }, [truncatedByGroup, revealed, revealEpoch]);
  // Visible row order for shift ranges (sidebar-groups bu ordered key list);
  // rows behind a bucket's Show more are not part of it.
  const visibleOrder = useMemo(() => {
    const ids = [];
    for (const group of displayed) {
      if (closed.has(group.key)) continue;
      for (const run of truncatedByGroup.get(group.key)?.runs || []) {
        if (run.parentId === null) ids.push(...run.rows.map((row) => row.id));
        else ids.push(...splitRun(run).kept.map((row) => row.id));
      }
    }
    return ids;
  }, [displayed, closed, truncatedByGroup, splitRun]);
  const visibleOrderRef = useRef(visibleOrder);
  visibleOrderRef.current = visibleOrder;
  const sessionById = useMemo(() => new Map(sourceSessions.map((session) => [session.id, session])), [sourceSessions]);
  const selectedSessions = useMemo(() => visibleOrder.filter((id) => isSelected(selection, id)).map((id) => sessionById.get(id)).filter(Boolean), [visibleOrder, selection, sessionById]);
  // R3-sections: the original header menu's Select all / Archive all read this list's rows (shared-6 registry), select
  // through its selection and archive through its bulk flow (shared-19 YX: the "Archive all sessions in …" confirm, then
  // runBulk); the sections store is hydrated from main's snapshot and its section actions go to main (sidebar-state).
  const sectionsSnapshot = useMemo(() => sectionsList && ({ customGroups, sessionMetadata, sidebarPreferences: legacyPreferences, projectOrder, sidebarSections: sectionsList }),
    [sectionsList, customGroups, sessionMetadata, legacyPreferences, projectOrder]);
  const sectionsRegistry = useMemo(() => sectionsModel && sectionsRowRegistry({ layout: sectionsModel.layout, buckets: sectionsModel.buckets, visibleOrder,
    metadata: sessionMetadata, state, isWorking: (session) => sessionState(session, state) === "working", openIds: [...openNestedIds] }),
  [sectionsModel, visibleOrder, sessionMetadata, state, openNestedIds]);
  const sectionKeyId = (key) => typeof key === "string" && key.startsWith("code:") ? key.slice(5) : null;
  useSidebarSectionsHost({ active: !!sectionsModel, snapshot: sectionsSnapshot, metadata: sessionMetadata, onSectionAction, onError: (reason) => notifyError(reason),
    registry: sectionsRegistry,
    onSelect: (keys) => setSelectionState((previous) => replaceSelection(previous, keys.map(sectionKeyId).filter(Boolean), SELECTION_DOMAIN)),
    onBulkArchive: ({ action, keys, options = {}, setConfirmOpen }) => {
      if (action !== "archive") return;
      const targets = bulkTargets(keys.map((key) => sessionById.get(sectionKeyId(key))).filter(Boolean), { metadata: sessionMetadata, currentId: current, state, action: "archive" });
      if (targets.length === 0) return;
      setConfirmOpen?.(true);
      setConfirm({ ...bulkArchiveConfirmCopy(intl, { groupName: options.confirmArchive?.groupName, count: targets.length, unloadedRemain: options.unloadedRemain }),
        onConfirm: () => runBulk("archive", targets), onClosed: () => setConfirmOpen?.(false) });
    } });
  // shared-20 dx: iO's new-section dialog (mounted by SidebarSectionsList), for the blank-area and Group and sort menus too.
  const sectionDialog = useRef(null);
  const openSectionDialog = () => sectionDialog.current?.();
  // A section made for sessions (the row menus' "New section"): created with them, as shared-20 rx files the row.
  const createSectionWith = (name, targets) => {
    const ids = targets?.map((session) => session.id);
    Promise.resolve(onSectionAction ? onSectionAction("add", { name, ...(ids?.length ? { sessionIds: ids } : {}) }) : onCreateGroup?.(name, ids?.[0], ids))
      .catch((reason) => notifyError(reason));
    if (targets?.length > 1) setSelectionState(clearSelection);
  };
  useEffect(() => { setMenu(null); }, [collapsed]);
  useEffect(() => { setSelectionState((previous) => pruneSelection(previous, sessionById.keys())); }, [sessionById]);
  // sidebar-groups ZT/QT: Escape and a plain pointerdown outside rows, menus
  // and dialogs clear a non-empty selection.
  const hasSelection = selection.selectedKeys.size > 0;
  useEffect(() => {
    if (!hasSelection) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setSelectionState(clearSelection); };
    const onPointer = (event) => {
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(SELECTION_SAFE_SELECTOR)) return;
      setSelectionState(clearSelection);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer, true); };
  }, [hasSelection]);
  // AD h(): an optimistic label is dropped once the real name matches it (or the row/group is gone).
  useEffect(() => {
    setPendingNames((previous) => {
      if (previous.size === 0) return previous;
      const next = new Map([...previous].filter(([id, name]) => sessionById.has(id) && sessionName(sessionById.get(id)) !== name));
      return next.size === previous.size ? previous : next;
    });
  }, [sessionById]);
  useEffect(() => {
    setPendingGroupNames((previous) => {
      if (previous.size === 0) return previous;
      const names = new Map(customGroups.map((group) => [group.id, group.name]));
      const next = new Map([...previous].filter(([id, name]) => names.has(id) && names.get(id) !== name));
      return next.size === previous.size ? previous : next;
    });
  }, [customGroups]);
  const shownName = (session) => pendingNames.get(session.id) ?? sessionName(session);
  const shownGroupLabel = (group) => (group.customGroupId && pendingGroupNames.get(group.customGroupId)) || group.label;
  const forget = (setter, id, name) => setter((previous) => {
    if (previous.get(id) !== name) return previous;
    const next = new Map(previous); next.delete(id); return next;
  });
  const commitSessionRename = (session, name, { throwOnError = false } = {}) => {
    setPendingNames((previous) => new Map(previous).set(session.id, name));
    return Promise.resolve(onSessionAction?.("rename", session, { name })).catch((reason) => {
      forget(setPendingNames, session.id, name);
      notifyError(reason);
      if (throwOnError) throw reason;
    });
  };
  const commitGroupRename = (group, name) => {
    setPendingGroupNames((previous) => new Map(previous).set(group.customGroupId, name));
    Promise.resolve(onGroupAction?.("rename", group, { name })).catch((reason) => {
      forget(setPendingGroupNames, group.customGroupId, name);
      notifyError(reason);
    });
  };
  // pj + bL (sidebar-jump-model.mjs): ⌘1–9 opens the Nth visible row; holding ⌘ (or Ctrl+Shift) for
  // 200ms shows 1–9 over the leading slots. Inert while collapsed or under a menu or a modal dialog.
  const jumpBlocked = useRef(() => false);
  jumpBlocked.current = () => collapsed || !!document.querySelector('[role="menu"]') || document.getElementById("root")?.inert === true;
  useEffect(() => {
    const hints = createJumpHints({
      rows: () => collectJumpRows(navRef.current?.querySelectorAll("[data-jump-hint-row]") ?? []),
      blocked: () => jumpBlocked.current(),
      typing: () => isTypingTarget(document.activeElement),
      show: setJumpHints, hide: () => setJumpHints(null),
      open: (row) => {
        const button = row.querySelector("[data-row-main-button]");
        if (!button) return;
        button.scrollIntoView({ block: "nearest" });
        button.click();
      },
    });
    const keydown = (event) => hints.keydown(event), keyup = (event) => hints.keyup(event), pointer = (event) => hints.pointer(event), reset = () => hints.reset();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", reset);
    window.addEventListener("mousemove", pointer);
    window.addEventListener("mousedown", pointer);
    window.addEventListener("wheel", pointer, { passive: true });
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", reset);
      window.removeEventListener("mousemove", pointer);
      window.removeEventListener("mousedown", pointer);
      window.removeEventListener("wheel", pointer);
      document.removeEventListener("visibilitychange", reset);
      hints.reset();
    };
  }, []);
  useEffect(() => { if (collapsed) setJumpHints(null); }, [collapsed]);
  // ⌘⇧⌫ Archive session (ion-dist shared-19-CjdiaR4X.js rg/ag/ig, sidebar-jump-model.mjs): the row it
  // archives is the one shown in the focused pane (Xm/ao data-selected="focused"; locally the current
  // session, there is no split view), never a typing target with content (ig), under no modal layer or
  // menu (DB), with nothing multi-selected and not already archived. Once the archive commits, Qm
  // scrolls to and clicks the next row, else the previous one (Zm), which opens it; with no neighbour
  // tg returns the view Home. Code mode only ($e() === "code").
  const archiveInFlight = useRef(false), archiveShortcut = useRef(null);
  archiveShortcut.current = (event) => {
    if (event.defaultPrevented || !archiveChord(event) || archiveBlockedByField(document.activeElement)) return;
    if (mode !== "code" || (section && section !== "new") || !onSessionAction || !current || archiveInFlight.current || selectionRef.current.selectedKeys.size > 0) return;
    if (document.querySelector('[role="menu"]') || document.getElementById("root")?.inert === true) return;
    const keys = [...new Set([...(navRef.current?.querySelectorAll(".source-session-row[data-row-key]") ?? [])].map((node) => node.getAttribute("data-row-key")))];
    const session = sessionById.get(current);
    if (!keys.includes(current) || !session || sessionArchived(session) || sessionMetadata[current]?.pinned || state.active?.[current] || sessionState(session, state) === "working") return;
    event.preventDefault();
    const neighbour = archiveNeighbour(keys, current);
    archiveInFlight.current = true;
    Promise.resolve(onSessionAction("archive", session, { keepView: true })).then(() => {
      const button = neighbour && navRef.current?.querySelector(`.source-session-row[data-row-key="${CSS.escape(neighbour)}"] [data-row-main-button]`);
      if (button?.isConnected) { button.scrollIntoView({ block: "nearest" }); button.click(); }
      else onNew?.();
    }, (reason) => notifyError(reason)).finally(() => { archiveInFlight.current = false; });
  };
  useEffect(() => {
    const keydown = (event) => archiveShortcut.current?.(event);
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const updatePreferences = (next) => {
    const normalized = normalizeSidebarPreferences(next);
    // R3-sections: in the sections layout the Sessions-owned list fields go to the Sessions section (shared-16 ip / op /
    // sp: setSectionView(sessions, …), the legacy groupByByMode is not written); the rest is the sidebar preferences.
    if (sectionsModel) {
      const patch = sessionsViewPatch(preferencesLive.current, normalized);
      if (patch) useSidebarSectionsStore.getState().setSectionView(sessionsSectionId, patch);
      preferencesLive.current = { ...normalized, status: "active" };
      const stored = withLegacyListFields(normalized, legacyPreferences);
      setLocalPreferences(stored);
      onSidebarPreferencesChange?.(stored);
      return;
    }
    preferencesLive.current = normalized;
    setLocalPreferences(normalized);
    onSidebarPreferencesChange?.(normalized);
  };
  const runAction = async (...args) => {
    try { await onSessionAction?.(...args); }
    catch (reason) { notifyError(reason); }
  };
  // Bulk actions (sidebar-groups XT / CodeSessionRowActionsHost multi payload):
  // concurrency 8, the open session is skipped for archive/delete. Results are
  // toasts (sidebar-groups.js:6219-6240 multi-select 'Archived {n} sessions',
  // key group-bulk-{action}; :18866-18915 Older bucket 'Archived {n} older
  // sessions', key {action}-older-bulk; both 3s; KT partial-failure addError).
  // c39a247c4 ve: Pin / Unpin {count} (F) and Set model for {count} (P) run over the selection with the open session
  // last (_e); Set model reports 'Model set for {count} sessions' for the sessions whose model changed (3s) and
  // 'Model couldn’t be set for …' for failures.
  const runBulk = async (action, targets, payload, { older = false } = {}) => {
    // R3-sidebar2 (sidebar-15): 2.42304.0 shared-19 YX → IX. Families whose nested sessions must be asked about leave the
    // bulk part and go one by one afterwards (LX); with no nested sessions flow connected IX asks nothing. A bulk delete
    // tells the worktree check it is one (c6b8adeaf de `bulk`: an unreadable worktree is kept). R4i-sidebar SI2
    // (Y1-R3-sidebar2-3/-7): the flow and YX's S / C counts (a cancelled worktree confirm is neither) are
    // sidebar-bulk-model runBulkSessions, tested there.
    const { results, done, failed } = await runBulkSessions(action, targets, payload, { current, run: onSessionAction,
      present: (id) => sessionById.has(id), archived: (id) => sessionArchived(sessionById.get(id)) });
    if (done > 0 && (action === "archive" || action === "delete")) notify(bulkDoneMessage(action === "archive" ? "Archived" : "Deleted", done, older ? "older session" : "session"),
      { variant: "neutral", key: older ? `${action}-older-bulk` : `group-bulk-${action}`, timeout: 3000 });
    if (action === "set-model") {
      const changed = results.filter((result) => result.status === "fulfilled" && result.value?.changed !== false).length;
      if (changed > 0) notify(tn(changed, "Model set for {count} session", "Model set for {count} sessions"), { variant: "neutral", key: "bulk-set-model", timeout: 3000 });
      if (failed > 0) notify(tn(failed, "Model couldn’t be set for {count} session. Try again.", "Model couldn’t be set for {count} sessions. Try again."), { variant: "danger" });
    } else if (failed > 0) notify(action === "archive" || action === "delete"
      ? bulkFailedMessage(action === "archive" ? "archived" : "deleted", failed)
      : results.find((result) => result.status === "rejected")?.reason?.message || t("Some sessions could not be updated."), { variant: "danger" });
    setSelectionState(clearSelection);
  };
  // A single Delete goes straight to the session action (the open session is
  // allowed and navigates home); bulk Delete skips the open session like archive.
  const requestDelete = (targets) => targets.length === 1 && onConfirmDelete ? onConfirmDelete(targets[0]) : setConfirm({ ...deleteConfirmCopy(targets, { engine, intl }),
    onConfirm: targets.length === 1 ? () => onSessionAction("delete", targets[0]) : () => runBulk("delete", targets) });
  // shared-22 4276-4285 U: toggleGroupCollapsed(key) on the persisted store.
  // hY clicks all current toggles in one event; accumulate their updates
  // before React renders the next preference snapshot.
  // R3-sections: a section's own fold is its collapsed flag (shared-22 aO / Cj Zn / $n: setSectionView); every other
  // bucket folds in collapsedGroups (bC toggleGroupCollapsed).
  const toggleGroup = (key) => {
    const section = sectionsModel && sectionFoldTarget(sectionsModel.layout, key);
    if (section) useSidebarSectionsStore.getState().setSectionView(section.id, { collapsed: !section.collapsed });
    else updatePreferences(toggleCollapsedGroup(preferencesLive.current, key));
  };
  const groupViewItems = () => <SidebarGroupViewItems/>;

  // shared-22 yS (readable 4198-4235) with mS/_S (4182-4190): per grouping, the bucket each open row was last seen
  // in. When the open session lands in a folded bucket for the first time (or moves to another Folder bucket),
  // expandGroup unfolds it and its row scrolls into view. Locally the open rows are the current session.
  const openRowBuckets = useRef(new Map());
  const pendingOpenRowScroll = useRef(null);
  const openGroupBy = mode === "code" ? preferences.groupBy : "date";
  useEffect(() => {
    for (const seen of openRowBuckets.current.values()) for (const id of seen.keys()) if (id !== current) seen.delete(id);
    if (!current) return;
    let seen = openRowBuckets.current.get(openGroupBy);
    if (!seen) openRowBuckets.current.set(openGroupBy, seen = new Map());
    for (const group of displayed) {
      const previous = seen.get(current);
      if (previous === group.key || !group.sessions.some((session) => session.id === current)) continue;
      seen.set(current, group.key);
      if (closed.has(group.key) && (previous === undefined || (openGroupBy === "project" && !group.customGroupId))) {
        pendingOpenRowScroll.current = { id: current, key: group.key };
        const section = sectionsModel && foldingSection(sectionsModel.layout, group.key);
        if (section?.collapsed) useSidebarSectionsStore.getState().setSectionView(section.id, { collapsed: false });
        if (preferences.collapsedGroups.includes(group.key)) updatePreferences(expandCollapsedGroup(preferencesLive.current, group.key));
      }
    }
  }, [current, displayed, closed, openGroupBy]);
  // R3-sidebar2 (cov7-02): the session cycle's rm (2.42304.0 shared-16) reads the folded keys and expandGroup through
  // W.getState() (session-cycle-adapters.mjs); its expandGroup is the open-row unfold above (a section's collapsed flag,
  // then collapsedGroups). rm runs it inside flushSync, so the cycle step is taken again over the unfolded list.
  const cycleGroups = useRef(null);
  cycleGroups.current = {
    collapsedGroups: () => [...closed],
    expandGroup: (key) => {
      const section = sectionsModel && foldingSection(sectionsModel.layout, key);
      if (section?.collapsed) useSidebarSectionsStore.getState().setSectionView(section.id, { collapsed: false });
      if (preferences.collapsedGroups.includes(key)) updatePreferences(expandCollapsedGroup(preferencesLive.current, key));
    },
  };
  useEffect(() => connectSessionCycleGroups({ collapsedGroups: () => cycleGroups.current.collapsedGroups(), expandGroup: (key) => cycleGroups.current.expandGroup(key) }), []);
  const allParentIds = () => [...runsByGroup.values()].flatMap((entry) => entry.runs.filter((run) => run.parentId !== null).map((run) => run.parentId));
  const toggleNested = (parentId, all = false) => {
    const collapse = !collapsedNested.has(parentId);
    const next = new Set(collapsedNested);
    for (const id of all ? allParentIds() : [parentId]) collapse ? next.add(id) : next.delete(id);
    updatePreferences({ ...preferences, collapsedNested: [...next] });
  };
  // R3-sections step 3 (WI-5): the Code list's Group and sort is 2.42304.0 shared-21 _U / vU / aU / oU (sessionList) over
  // the CDS Dropdown (source-sidebar-filter-current.jsx); the classic Filter below stays the chat list's.
  const headerControls = mode === "code" ? <SourceCodeSidebarFilter preferences={preferences} listRef={navRef} /> : <>
    {/* sidebar-groups.js:5352-5377 _w: aria-label and Kl content "Search" with the
        search_palette shortcut (⇧⌘K), hoverable false; it opens the command palette in
        search mode (DF("search"), source-sidebar-palette.jsx). */}
    {/* sidebar-main.js:12290-12350 lI: hp (shared-frame Nu, default side "top",
        shared-frame-C_2npUJq.js:4588) {content, hoverable:false, open:false
        while the filter menu is open} around a trigger with tooltip:false. */}
    <ToolButton label={hasSidebarFilters(preferences) ? t("Filter (active)") : t("Filter")} icon="Filter"
      tooltip={{ content: hasSidebarFilters(preferences) ? t("Filter (active)") : t("Filter"), hoverable: false, open: menu?.kind === "filter" ? false : undefined }}
      active={menu?.kind === "filter"}
      {...menuTriggerProps({ open: menu?.kind === "filter", onOpen: (entry, event) => setMenu({ kind: "filter", anchor: event.currentTarget, entry }) })}
      onClick={(event) => setMenu(menu?.kind === "filter" ? null : { kind: "filter", anchor: event.currentTarget, entry: keyboardEntry(event) })} />
  </>;
  // AD p(refocus): Enter/Escape return focus to the row's main button; a blur-submit does not.
  const closeRename = (id, refocus) => {
    setRenaming(null);
    if (refocus) requestAnimationFrame(() => document.querySelector(`[data-source-session-id="${CSS.escape(id)}"] [data-row-main-button]`)?.focus());
  };
  // XB 'Rename group' starts the header edit through a 100ms debounce (YB), after the menu has closed.
  const startGroupRename = (group) => setTimeout(() => setRenamingGroup(group.customGroupId), 100);
  const closeGroupRename = (group, refocus) => {
    setRenamingGroup(null);
    if (refocus) requestAnimationFrame(() => document.querySelector(`[data-group-key="${CSS.escape(group.key)}"] [data-group-toggle]`)?.focus());
  };
  // sidebar-groups H (2.2553.1): ⇧⌘-click toggles the selection, ⇧-click selects a range, ⌘-click opens the session
  // in its own window (popout, entryPoint cmd_click), ⌥-click opens it beside the current one (split view,
  // modifier_click); a plain click clears the selection, then opens. Without window actions (a window that can't
  // open others) ⌘-click toggles the selection as before.
  const rowClick = (event, session) => {
    const command = event.metaKey || event.ctrlKey;
    if (event.shiftKey && command) {
      event.preventDefault();
      setSelectionState((previous) => toggleSelection(previous, session.id, SELECTION_DOMAIN));
      return;
    }
    if (event.shiftKey) {
      event.preventDefault();
      setSelectionState((previous) => selectRange(previous, previous.anchorKey, session.id, visibleOrderRef.current, SELECTION_DOMAIN));
      return;
    }
    if (command) {
      event.preventDefault();
      if (windowActions?.onOpenWindow && !sessionArchived(session)) { setSelectionState(clearSelection); windowActions.onOpenWindow(session); }
      else setSelectionState((previous) => toggleSelection(previous, session.id, SELECTION_DOMAIN));
      return;
    }
    if (event.altKey) {
      event.preventDefault();
      if (windowActions?.onOpenSplit && !sessionArchived(session) && current && current !== session.id) { setSelectionState(clearSelection); windowActions.onOpenSplit(session); }
      return;
    }
    setSelectionState(clearSelection);
    const split = splitStore.getState();
    onOpen?.(session.id, { focusComposerEnd: sidebarComposerFocus(event, { mode, splitOpen: split.open, focusedPane: split.active }) });
  };
  const openRowMenu = (session, extra) => {
    if (!onSessionAction) return;
    const multi = selectionRef.current.selectedKeys.size > 1 && isSelected(selectionRef.current, session.id);
    setMenu({ kind: "session", session, multi, ...extra });
  };
  const pinnedIds = displayed.find((group) => group.kind === "pinned")?.sessions.map((session) => session.id) || [];
  // shared-19 DY (source-sidebar-drag.jsx): rows lift with the pointer and drop into the Pinned list (pin / reorder),
  // below it (unpin), onto a custom group section, onto the session area (split view) or out of the window (a new
  // window at the cursor). A selected row carries the selection (visible order) onto a group section.
  const dragContext = useRef(null);
  dragContext.current = {
    selectionKeys: (key) => {
      const sel = selectionRef.current;
      return sel.selectedKeys.size > 1 && isSelected(sel, key) ? visibleOrderRef.current.filter((id) => isSelected(sel, id)) : null;
    },
    isShown: (id) => id === current || splitStore.isShown(id),
    canTearOff: (session) => !!windowActions?.onOpenWindow && !!session && !sessionArchived(session),
    canSplit: (session) => !!windowActions?.onOpenSplit && !!session && !sessionArchived(session),
    splitOpen: () => splitStore.getState().open,
    onDrop: (outcome, drag, snapshot) => {
      const session = drag.session;
      if (outcome.type === "pane") { sessionPaneDropHost()?.drop(drag.paneDraft ? null : session.id, outcome.pane); return; }
      if (!session) return;
      if (outcome.type === "window") { windowActions?.onOpenWindow?.(session, { position: outcome.position }); return; }
      if (outcome.type === "group") {
        const targets = outcome.keys.map((id) => sessionById.get(id)).filter(Boolean);
        if (targets.length > 1) void runBulk("move-to-group", targets, { groupId: outcome.groupId });
        else void runAction("move-to-group", session, { groupId: outcome.groupId });
        return;
      }
      if (outcome.type === "unpin") { void runAction("unpin", session); return; }
      // H(): pin at the slot ({type:"pin", at}) / reorder ({type:"reorder", from, to}): the persisted Pinned order.
      // A folded Pinned list shows no rows (ZO A && V drop row), so its slot 0 is the top of the list.
      const before = outcome.before ?? (outcome.type === "pin" && outcome.at === 0 && snapshot?.pinnedKeys.length === 0 ? pinnedIds[0] ?? null : null);
      const order = pinnedOrderAfterDrop(pinnedIds, session.id, before);
      void (async () => {
        try {
          if (outcome.type === "pin") await onSessionAction("pin", session);
          await onSessionAction("pinned-order", session, { ids: order });
        } catch (reason) { notifyError(reason); }
      })();
    },
  };
  const { drag, begin: beginDrag } = useSidebarRowDrag({ navRef, context: dragContext });
  const canDragRows = !!onSessionAction;
  const shiftStyle = (key) => dragRowStyle(drag, key);
  // kJ: a single row that can pin is being dragged (opens the empty Pinned stub and its drop row).
  const pinDropOpen = !!drag?.canPin && drag.keys.length === 1;
  const renderRow = (session, { nested = null, parent = null, childCount = 0, pinned = false, group } = {}) => {
    // The open session's row is selected only while the main view shows it (section "new"), not while Artifacts or
    // Routines replaces it: then their nav row is the one selected, and clicking the session row goes back to it.
    const shown = current === session.id && (section === undefined || section === "new");
    const selected = shown || isSelected(selection, session.id);
    const code = mode === 'code', iconless = code && !pinned;
    const view = code ? currentSidebarSession(session, state, sessionMetadata[session.id], { paneSelected: shown || splitStore.isShown(session.id), showPrStatus: preferences.showPrStatus }) : null;
    const glyph = code ? pinned ? <Icon name="Code" size={16} /> : null
      : <SessionStatus session={session} state={state} unread={sessionMetadata[session.id]?.unread} showPrStatus={preferences.showPrStatus} />;
    if (!code && renaming === session.id) return <RenameRow key={session.id} label={shownName(session)} glyph={glyph} selected={selected} nested={nested} iconless={iconless}
      onCommit={(name) => commitSessionRename(session, name)} onClose={(refocus) => closeRename(session.id, refocus)} />;
    const kind = nested ? lineageKind(session, sessionMetadata) : null;
    const lineage = kind === "fork" ? t("Forked from {name}", { name: sessionName(parent) }) : kind ? t("Started by {assistant} from {name}", { assistant: getAssistantName(), name: sessionName(parent) }) : null;
    const hint = jumpHints?.[session.id];
    const MoreButton = code ? SourceSidebarRowMore : ToolButton;
    const more = <MoreButton label={t("More options for {name}", { name: shownName(session) })} icon={code ? "DotsHorizontal" : "DotsVertical"} className={code ? "source-current-session-more" : "source-session-more code-icon-button"}
      tooltip={false} tabIndex={-1} data-row-action=""
      {...menuTriggerProps({ open: menu?.session?.id === session.id, onOpen: (entry, event) => {
        if (onSessionAction) openRowMenu(session, { anchor: event.currentTarget, entry });
        else onMenu?.("session", event.currentTarget, session, entry);
      } })}
      onClick={(event) => {
        if (!onSessionAction) { onMenu?.("session", event.currentTarget, session); return; }
        if (menu?.session?.id === session.id && !menu.point) setMenu(null);
        else openRowMenu(session, { anchor: event.currentTarget, entry: keyboardEntry(event) });
      }} />;
    const title = <><span className="source-session-title">{shownName(session)}</span>{lineage && <span className="source-sr-only"> {lineage}</span>}</>;
    if (code) {
      const details = currentSidebarDetails(session, view, { preferences: group?.showMetadata === undefined ? preferences : { ...preferences, showMetadata: group.showMetadata }, group, pinned, nested: !!nested, repoIdentity: repoIdentities?.[session.cwd] });
      const rowMenuOpen = menu?.session?.id === session.id;
      return <div key={session.id} className="source-session-row source-current-session-host df-drag-shiftable" data-source-session-id={session.id}
        data-selected={selected ? 'focused' : undefined} data-menu-open={rowMenuOpen || undefined}
        data-iconless={iconless || undefined} data-status-mark={view.mark || undefined}
        data-unread={sessionMetadata[session.id]?.unread || undefined} data-archived={view.archived || undefined}
        data-nested={nested || undefined} data-child-count={childCount || undefined} data-row-key={session.id} data-jump-hint-row=""
        data-drag-key={session.id} style={shiftStyle(session.id)}
        onPointerDown={canDragRows ? event => beginDrag(event, { key: session.id, session, label: shownName(session) }) : undefined}
        onContextMenu={event => {
          if (!onSessionAction) return;
          event.preventDefault();
          openRowMenu(session, { anchor: event.currentTarget.querySelector('[data-row-main-button]'), point: { x: event.clientX, y: event.clientY } });
        }}>
        <SourceCodeSidebarRow view={view} details={details} label={shownName(session)} pinned={pinned} selected={selected} shown={shown}
          title={<><span className="source-session-title">{shownName(session)}</span>{lineage && <span className="source-sr-only"> {lineage}</span>}</>}
          menu={<SidebarCurrentMenuHost>{more}</SidebarCurrentMenuHost>}
          menuOpen={rowMenuOpen} anyMenuOpen={!!menu} contextMenuOpen={rowMenuOpen && !!menu.point} dragging={!!drag}
          renameRequested={renaming === session.id} onRenameStarted={() => setRenaming(null)}
          onRename={onSessionAction ? name => commitSessionRename(session, name, { throwOnError: true }) : undefined}
          draggable={false} onMouseDown={event => { if (event.shiftKey) event.preventDefault(); }}
          onClick={event => rowClick(event, session)}
          onKeyDown={event => {
            if ((event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) && onSessionAction) {
              event.preventDefault(); openRowMenu(session, { anchor: event.currentTarget, entry: 'first' });
            }
          }}/>
        {hint && <kbd aria-hidden="true" className="source-jump-hint">{hint}</kbd>}
      </div>;
    }
    // sidebar-groups.js:17202-17213: rows carry data-row-key and data-jump-hint-row for the pj hints.
    return <div key={session.id} className="source-session-row df-drag-shiftable group" data-row="" data-source-session-id={session.id}
      data-selected={selected ? "focused" : undefined} data-menu-open={menu?.session?.id === session.id || undefined}
      data-iconless={iconless || undefined} data-status-mark={view?.mark || undefined} data-touch-menu={code && selected || undefined}
      data-unread={sessionMetadata[session.id]?.unread || undefined} data-archived={sessionArchived(session) || undefined}
      data-nested={nested || undefined} data-child-count={childCount || undefined} data-row-key={session.id} data-jump-hint-row=""
      data-drag-key={session.id} style={shiftStyle(session.id)}
      onPointerDown={canDragRows ? (event) => beginDrag(event, { key: session.id, session, label: shownName(session) }) : undefined}
      onContextMenu={(event) => {
        if (!onSessionAction) return;
        event.preventDefault();
        openRowMenu(session, { anchor: event.currentTarget.querySelector('[data-row-main-button]'), point: { x: event.clientX, y: event.clientY } });
      }}>
      <button type="button" className="source-session-open" data-row-main-button="" data-roving-item=""
        aria-current={shown ? "page" : undefined}
        // The row is a pointer drag (onPointerDown above): never a native drag (an image or text drag).
        draggable={false}
        onMouseDown={(event) => { if (event.shiftKey) event.preventDefault(); }}
        onClick={(event) => rowClick(event, session)}
        onDoubleClick={onSessionAction ? (event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey) setRenaming(session.id); } : undefined}
        onKeyDown={(event) => {
          if (event.key === "F2" && onSessionAction) { event.preventDefault(); setRenaming(session.id); }
          if ((event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) && onSessionAction) {
            event.preventDefault(); openRowMenu(session, { anchor: event.currentTarget, entry: "first" });
          }
        }}>
        {!iconless && <span className="source-leading-slot">{glyph}</span>}
        {/* sidebar-rows.js:7675-7729 qD: the label span (ref a) is the trigger of
            Xs {side "right", hoverable:false, lazy}; content is the title only
            while zD says it is truncated (inner scrollWidth > label
            offsetWidth), resolved when the tooltip opens, and none while
            dragging (ic) — here: while a row is dragged or this row's menu is
            open (renaming swaps in RenameRow). No native title. */}
        {<SourceTooltip side="right" hoverable={false} open={drag || menu?.session?.id === session.id ? false : undefined}
          content={() => textOverflows(document.querySelector(`[data-source-session-id="${CSS.escape(session.id)}"] .source-session-name`)) ? shownName(session) : undefined}>
          <span className="source-session-name">{title}</span>
        </SourceTooltip>}
      </button>
      {/* sidebar-groups.js:9303-9312 mj: the aria-hidden keycap over the leading slot. */}
      {hint && <kbd aria-hidden="true" className="source-jump-hint">{hint}</kbd>}
      {/* sidebar-rows.js:7730-7750 JD: tooltip:false, tabIndex -1 and
          data-row-action (reached with ArrowRight from the row, not Tab). */}
      {more}
    </div>;
  };
  // sidebar-groups IR/LR/rI/oI: nested run with tree guide, fold handle and stub.
  const renderNested = (run, group) => {
    const parent = sessionById.get(run.parentId);
    const { collapsed: folded, kept, hidden } = splitRun(run);
    // 2.42304.0 shared-21 mz/g$ and shared-20 bD/xD/SD (old pz/YQ, YC/XC/ZC). Only the record and
    // navigation services are adapted to this host; copy/count helpers are original.
    const counts = nestedStubCounts(hidden, {
      isFailed: row => !!(state.errors?.[row.id] || latestTurnError(state, row.id) || row.hasError),
      isUnread: row => !!sessionMetadata[row.id]?.unread,
      isWorking: row => sessionState(row, state) === "working",
    });
    const stubText = nestedSessionLabel(intl, counts.count, kept.length > 0);
    const units = nestedStatusLabels(intl, counts);
    const stubLabel = nestedRevealLabel(intl, stubText, [units.failed, units.unread, units.working]);
    // uJ data-pinned-family: a family under a pinned head moves with it while that head is dragged (shared-22 uS:
    // df-drag-shiftable with the head's own drag style, so it shifts with the head and hides while the head is carried).
    const pinnedFamily = group?.kind === "pinned";
    return <div key={`nest:${run.parentId}`} className={"source-nested df-accordion-guide flex flex-col df-family" + (pinnedFamily ? " df-drag-shiftable" : "")} data-nested-parent={run.parentId} data-collapsed={folded || undefined}
      data-pinned-family={pinnedFamily ? "" : undefined} style={pinnedFamily ? shiftStyle(run.parentId) : undefined}>
      {/* Current Code RS has no legacy rail-sized button. Collapse remains
          available in the parent's menu; the hidden-family stub expands it. */}
      {mode !== 'code' && <SourceTooltip content={folded ? t("Show nested sessions") : t("Hide nested sessions")} delay={350} side="right">
      <button type="button" className="df-family-handle" tabIndex={-1} aria-expanded={!folded}
        aria-label={folded ? t("Show nested sessions") : t("Hide nested sessions")}
        onMouseDown={(event) => event.preventDefault()} onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); if (event.detail > 1) return; toggleNested(run.parentId, event.altKey); }} />
      </SourceTooltip>}
      {kept.map((row) => renderRow(row, { nested: run.parentId, parent, pinned: group.kind === 'pinned', group }))}
      {/* The host drag service reserves label:* for non-session rows. */}
      {hidden.length > 0 && <div className="relative df-drag-shiftable" data-drag-key={`label:stub:${run.parentId}`} style={shiftStyle(`label:stub:${run.parentId}`)}>
      {/* g$: df-family-stub, then TE (hit-row [--cds-hit-gap-y:7px] hit-row-main), ..., DE last. */}
      <button type="button" className={`df-family-stub ${sidebarHitRowMainClass} flex h-[var(--df-row-h)] w-full min-w-0 items-center rounded-[var(--df-radius-pill)] pe-[var(--df-row-px)] ps-[calc(var(--df-row-px)+var(--df-row-indent,0px)+var(--df-iconless-pad,calc((var(--df-leading-slot)-var(--df-icon-size))/2)))] text-start text-[length:var(--df-group-font)] text-secondary hover:text-primary ${nestedFocusClass}`} data-row="" data-roving-item="" aria-label={stubLabel}
        onClickCapture={event => { if (drag) { event.stopPropagation(); event.preventDefault(); } }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={event => {
          if (event.detail > 1 || event.defaultPrevented) return;
          if (event.detail === 0 || event.currentTarget.matches(':focus-visible') || event.currentTarget.ownerDocument.activeElement === event.currentTarget) pendingRevealFocus.current = hidden[0].id;
          toggleNested(run.parentId);
        }}>
        <span className="df-fade-truncate flex items-center whitespace-nowrap">
          <span data-row-label="" className="min-w-0">{stubText}</span>
          {units.failed !== undefined && <NestedStatusSeparator>{units.failed}</NestedStatusSeparator>}
          {units.unread !== undefined && <NestedStatusSeparator><span className="flex items-center gap-1.5 text-accent"><NestedStatusDot kind="ready" />{units.unread}</span></NestedStatusSeparator>}
          {units.working !== undefined && <NestedStatusSeparator>{units.working}</NestedStatusSeparator>}
        </span>
        {units.failed !== undefined && <span aria-hidden="true" data-row-decoration="" className="me-[calc(var(--df-row-ctl-inset,calc((var(--df-row-h)-var(--df-row-ctl))/2))-var(--df-row-px))] ms-auto flex size-[var(--df-row-ctl)] shrink-0 items-center justify-center"><NestedErrorIcon color="text-warning" /></span>}
      </button></div>}
    </div>;
  };
  // sidebar-groups.js:13497-13512 xF showMoreRows: reveal truncateAt more
  // rows; ID(e) "always" (keyboard activation: detail 0 or :focus-visible)
  // moves focus to the first newly revealed row.
  const showMore = (group, truncated, event) => {
    const keyboard = event.detail === 0 || event.currentTarget.matches(":focus-visible");
    const step = truncateAtFor(group);
    if (keyboard && truncated.firstHiddenId) pendingRevealFocus.current = truncated.firstHiddenId;
    setRevealState((previous) => {
      const byKey = new Map(previous.epoch === revealEpoch ? previous.byKey : []);
      byKey.set(group.key, Math.max(byKey.get(group.key) || 0, truncated.extraRevealed) + step);
      return { epoch: revealEpoch, byKey };
    });
  };
  // shared-21 xg K (readable 28293-28295) showFewerRows: the bucket folds back to the keep-visible floor (the open,
  // selected and awaiting-input rows stay shown); H0 T then scrolls the button into view (block nearest).
  const pendingShowLessScroll = useRef(null);
  const showLess = (group, floor) => {
    pendingShowLessScroll.current = group.key;
    setRevealState((previous) => {
      const byKey = new Map(previous.epoch === revealEpoch ? previous.byKey : []);
      byKey.set(group.key, floor);
      return { epoch: revealEpoch, byKey };
    });
  };
  useEffect(() => {
    const id = pendingRevealFocus.current;
    if (id) {
      pendingRevealFocus.current = null;
      document.querySelector(`[data-source-session-id="${CSS.escape(id)}"] [data-row-main-button]`)?.focus();
    }
    const key = pendingShowLessScroll.current;
    if (key) {
      pendingShowLessScroll.current = null;
      navRef.current?.querySelector(`[data-group-key="${CSS.escape(key)}"] .source-show-more`)?.scrollIntoView({ block: "nearest" });
    }
    // yS second effect: once the bucket is unfolded, the open row scrolls into view (block nearest).
    const opened = pendingOpenRowScroll.current;
    if (opened && !closed.has(opened.key)) {
      pendingOpenRowScroll.current = null;
      navRef.current?.querySelector(`[data-row-key="${CSS.escape(opened.id)}"]`)?.scrollIntoView({ block: "nearest" });
    }
  });
  const renderGroupRows = (group) => {
    const entry = runsByGroup.get(group.key);
    if (!entry) return null;
    const truncated = truncatedByGroup.get(group.key);
    const childCounts = new Map();
    for (const run of entry.runs) if (run.parentId !== null) childCounts.set(run.parentId, run.rows.length);
    return <>
      {(truncated?.runs || entry.runs).map((run) => run.parentId === null
        ? run.rows.map((session) => renderRow(session, { childCount: childCounts.get(session.id) || 0, pinned: group.kind === 'pinned', group }))
        : renderNested(run, group))}
      {/* sidebar-groups.js:17516-17525 BD / 7177-7231 VD: after the rows while
          rows are hidden; AD classes with a df-leading-slot spacer. shared-21 H0
          (21209-21357): once revealed to the end it becomes Show less (xg showFewerRows). */}
      {(() => {
        if (!truncated) return null;
        const floorOf = () => truncateRuns(entry.runs, { truncateAt: truncateAtFor(group), extraRevealed: 0, keepVisibleIds, shownRows: (run) => splitRun(run).kept }).extraRevealed;
        const fewer = truncated.hiddenCount === 0 ? showFewerRows({ total: truncated.total, truncateAt: truncateAtFor(group), extraRevealed: truncated.extraRevealed,
          hiddenCount: 0, floor: truncated.extraRevealed > 0 ? floorOf() : 0 }) : undefined;
        if (truncated.hiddenCount === 0 && !fewer) return null;
        // og shiftKey label:showmore:{key}: the button moves with the rows while a drag opens a gap above it.
        return <div key="show-more" className="df-drag-shiftable" data-drag-key={`label:showmore:${group.key}`} style={shiftStyle(`label:showmore:${group.key}`)}>
          <SourceShowMoreButton bucketLabel={group.label} count={truncated.revealCount} fewer={fewer}
            onShowMore={(event) => showMore(group, truncated, event)} onShowLess={() => showLess(group, floorOf())} />
        </div>;
      })()}
    </>;
  };
  const olderTargets = (group, action) => bulkTargets(group.bulkScope ?? group.sessions, { metadata: sessionMetadata, currentId: current, state, action });
  // sidebar-groups.js:18919-18921 Vz: the Older bucket overflow button exists
  // only while at least one session is archivable or deletable; an open menu
  // closes with it. (The 2.2553.1 row hover card is disabled for every row
  // that is not awaiting input and flag-gated, so no summary card is rendered.)
  const olderGroup = preferences.groupBy === "date" && onSessionAction ? displayed.find((group) => group.key === "older") : null;
  const olderCounts = olderGroup ? { archive: olderTargets(olderGroup, "archive").length, delete: olderTargets(olderGroup, "delete").length } : { archive: 0, delete: 0 };
  const olderMenuAvailable = olderCounts.archive > 0 || olderCounts.delete > 0;
  useEffect(() => { if (!olderMenuAvailable) setMenuState((previous) => previous?.kind === "older" ? null : previous); }, [olderMenuAvailable]);
  // Group header menus: project buckets other than Other (OB inside LB), custom groups (XB). Both need
  // the persisted section order (onGroupAction "project-order").
  const groupMenuKind = (group) => !onGroupAction || !onSessionAction ? null : group.customGroupId ? "custom"
    : group.kind === "project" && group.projectKey && group.projectKey !== OTHER_PROJECT_KEY ? "project" : null;
  const sectionKeysOf = (custom) => sectionOrderKeys(displayed).filter((key) => isCustomOrderKey(key) === custom);
  const saveSectionOrder = (keys) => {
    if (!keys?.length) return;
    Promise.resolve(onGroupAction("project-order", null, { ids: withSectionOrder(projectOrder, keys) })).catch((reason) => notifyError(reason));
  };
  // XB I(): the delete confirm counts the sessions assigned to the group (Zv over the assignments).
  const requestGroupDelete = (group) => {
    const count = sourceSessions.filter((session) => sessionMetadata[session.id]?.customGroupId === group.customGroupId).length;
    setConfirm({ ...deleteGroupCopy(shownGroupLabel(group), count), onConfirm: () => onGroupAction("delete", group) });
  };
  // Mz (sidebar-groups.js:18411-18427): a new session for the group, prefilled with the folder its
  // sessions share (Ez), and filed into the group once it starts.
  const newSessionInGroup = (group) => {
    const folders = new Set(group.sessions.map((session) => session.cwd).filter(Boolean));
    Promise.resolve(onGroupAction("new-session", group, { cwd: folders.size === 1 ? [...folders][0] : null })).catch((reason) => notifyError(reason));
  };
  // A bucket heading's own controls: a folder's "+", a custom group's "+", the Older bucket menu, and (first heading) the
  // list's Group and sort (R3-sections: shared by the classic list and the sections layout).
  const groupActions = (group, withHeaderControls) => <>
    {/* sidebar-groups.js:13871-13907 cI: project buckets have no target, so no tooltip.
        :19866-19880: the Other bucket has no cwd, so no '+'. */}
    {group.cwd && onProject && <ToolButton label={t("New session in {name}", { name: group.label })} icon="Add" tooltip={false} onClick={() => onProject(group.cwd)} />}
    {/* sidebar-groups.js:17392-17410 / :18560-18590 / :19895-19905: a custom group's '+' (cI with the
        Dz target: the folder its sessions share, else none) is labelled with the target and the group,
        with the target tooltip and an 'Added to {group}' detail; in the code list it is the xs glyph in
        the hover-reveal span (opacity 0 until the section has hover or focus within; touch shows it).
        Its click is the header menu's Mz 'New session' (newSessionInGroup). */}
    {group.customGroupId && onGroupAction && (() => {
      const name = shownGroupLabel(group), folders = new Set(group.sessions.map((session) => session.cwd).filter(Boolean));
      const target = folders.size === 1 ? folderName([...folders][0]) : null;
      const content = target === null ? t("New session with no folder picked") : t("New session in {name}", { name: target });
      return <span className="source-group-reveal">
        <ToolButton label={target === null ? t("New session with no folder picked, added to {group}", { group: name }) : t("New session in {name}, added to {group}", { name: target, group: name })}
          tooltip={{ content, detail: t("Added to {group}", { group: name }), side: "right", hoverable: false }} onClick={() => newSessionInGroup(group)}>
          <Icon name="Add" size={12} />
        </ToolButton>
      </span>;
    })()}
    {/* sidebar-groups.js:18925-18933 Vz trigger: tooltip:false. */}
    {group === olderGroup && olderMenuAvailable && <ToolButton label={t("Bulk actions for older sessions")} icon="DotsVertical" tooltip={false}
      className="source-older-menu code-icon-button" active={menu?.kind === "older"}
      {...menuTriggerProps({ open: menu?.kind === "older", onOpen: (entry, event) => setMenu({ kind: "older", anchor: event.currentTarget, group, entry }) })}
      onClick={(event) => setMenu(menu?.kind === "older" ? null : { kind: "older", anchor: event.currentTarget, group, entry: keyboardEntry(event) })} />}
    {withHeaderControls && headerControls}
  </>;
  // R3-sections: what the sections layout (source-sidebar-sections.jsx) takes from this list.
  const sectionsHost = sectionsModel && {
    renderRows: renderGroupRows, shiftStyle, toggle: toggleGroup, folded: closed, drag, dropTargets: !!onSessionAction, headerControls, canCreate: !!onCreateGroup,
    trailing: (group, { first }) => first || (group.cwd && onProject) || (group.customGroupId && onGroupAction) || (group === olderGroup && olderMenuAvailable) ? groupActions(group, first) : null,
    // R3-sections (WI-4): a Sessions folder bucket's header menu is the original shared-20 yx as a worked-out group (sT → bC,
    // sidebar-sections-layout.mjs folderBucketMenu); Pinned and the date / state buckets have none (bC V).
    folderMenu: (group) => onSessionAction ? folderBucketMenu(group, { order: sectionKeysOf(false), projectOrder,
      newSession: group.cwd && onProject ? () => onProject(group.cwd) : undefined,
      save: onGroupAction ? (ids) => Promise.resolve(onGroupAction("project-order", null, { ids })).catch((reason) => notifyError(reason)) : undefined }) : null,
    newSessionInSection: onGroupAction && onSessionAction ? (entry) => newSessionInGroup({ key: entry.key, label: entry.label, customGroupId: entry.section.id, sessions: entry.rows }) : undefined,
    sectionPlus: (entry) => groupActions({ key: entry.key, label: entry.label, customGroupId: entry.section.id, sessions: entry.rows }, false),
    pinnedFoldedDrop: drag?.canPin && drag.keys.length === 1 ? <div className="source-group-rows flex flex-col gap-px" data-pinned-rows=""><PinnedDropRow hot={drag.slotIdx != null} dragging /></div> : null,
    emptyHint: () => t("No active sessions"),
    // shared-21 HQ facts (R3-sections step 3): View all opens the Sessions page once the list is settled and holds an
    // archived session; while it loads View all shows Loading…; otherwise it is disabled with its reason.
    viewAll: { onViewAll: onViewAllSessions ? () => onViewAllSessions() : undefined, listSettled: !listLoading, archivedInHand: listedSessions.some(sessionArchived) },
  };
  // pw u (sidebar-groups.js:5241): the whole IO identity (main.jsx accountIdentity), ellipsized by CSS.
  const primaryRows = mode === 'code'
    ? [["New", "Add", "new"], ["Projects", "Projects", "projects"], ["Artifacts", "Artifacts", "artifacts"], ["Routines", "Clock", "routines"], ["Customize", "Tool", "customize"]]
    : [["New", "Add", "new"], ["Projects", "Projects", "projects"], ["Artifacts", "Artifacts", "artifacts"], ["Scheduled", "Clock", "routines"], ["Design", "Palette", "design"], ["Customize", "Tool", "customize"]];
  const renderNavRow = ([label, icon, key]) => {
    const selected = key === "new" ? section === "new" && !current : section === key;
    // shared-21 ND (:7590-7597) puts "group" on every plain row button, so the
    // New glyph's group-hover / group-data-[selected=focused] utilities resolve.
    return <button key={key} type="button" className="source-sidebar-nav-row group" data-row="" data-roving-item="" data-selected={selected ? "focused" : undefined}
      aria-current={key === "new" && selected ? "page" : undefined} aria-keyshortcuts={key === "new" ? "Meta+n" : undefined}
      // shared-19 MY: New session drags into the session area as a new split side (a draft pane).
      onPointerDown={key === "new" && mode === "code" && windowActions?.onOpenSplit ? (event) => beginDrag(event, { key: "__new-session-drag-source__", label: t("New session"), draft: true }) : undefined}
      onClick={() => key === "new" ? onNew?.() : setSection?.(key)}>
      {/* sidebar-groups.js:12828-12842: only New's df-leading-slot holds mD
          (:7062-7073) - span.df-new-circle around Icon Add "sm" (16, shared-frame
          ra) in text-secondary, primary on row hover / selected. Size, fill and the
          13px/700 glyph come from the loaded shared-styles copy of
          desktop-layout.css:532-542, 884-886, 1917-1929 (web variant fill). */}
      {key === "new"
        ? <span className="source-leading-slot df-leading-slot"><span className="df-new-circle flex shrink-0 items-center justify-center rounded-full">
          <Icon name="Add" size={16} className="text-secondary group-hover:text-primary group-data-[selected=focused]:text-primary" /></span></span>
        : <span className="source-leading-slot"><Icon name={icon} size={16} /></span>}
      {mode === 'code' ? <span className="flex min-w-0 flex-1 items-center"><span>{t(label)}</span>{key === 'projects' && <CdsBadgeDensity.Provider value="compact"><SidebarNavBadge badge="beta" /></CdsBadgeDensity.Provider>}</span>
        : <><span>{t(label)}</span>{key === 'projects' && <span className="surface-new-badge">{t("New")}</span>}</>}
      {key === "new" && <kbd aria-hidden="true">⌘ N</kbd>}
    </button>;
  };
  const accountName = displayName;
  const hiddenNotice = hiddenSessionsNotice(hiddenSessions, engine);
  // sidebar-main.js:14874-14892 pp wraps the sidebar in a CDS root provider
  // (shared-frame-C_2npUJq.js:1196-1208 Li: cds-root, data-density compact
  // on desktop, data-platform, data-font), so the sidebar gets compact tokens,
  // the desktop default cursor and the --cds-font-sans family.
  // ca1d33d05 jt / kt (F6 page areas): the "navigation" stop is the whole aside, or while collapsed the peek card
  // (the body) when it shows; focus anywhere in it holds the stop.
  return <aside data-surface={mode} data-code-list={mode === "code" ? "" : undefined} className="app-sidebar dframe-sidebar source-sidebar cds-root" aria-label={t("Sidebar")} data-variant="web" data-density="compact" data-platform="desktop" data-font={cdsFont}
    data-focus-region={collapsed ? undefined : "navigation"} data-focus-region-holds={collapsed ? undefined : "contains"}>
    <div ref={toolbarRef} className="sidebar-toolbar df-titlebar window-drag">
      <div className="traffic-space" />
      {/* sidebar-groups.js:5320 hw: "Hide sidebar" with CDS tooltip Kl
          {shortcut:"cmd+b", hoverable:false} and no native title; the sidebar
          is hidden (visibility) while collapsed, so this is the open state only. */}
      {/* shared-21 tK: df-sidebar-hover-reveal flex (shared-styles: .7 until the sidebar is hovered or holds focus-visible). */}
      <div className="df-sidebar-hover-reveal flex">
        <ToolButton label={t("Hide sidebar")} tooltip={SIDEBAR_TOGGLE_TOOLTIP.hide} icon="Sidebar" onClick={onCollapse} />
      </div>
      {/* sidebar-session.js:10732-10800 qM in the sidebar placement. */}
      <SourceNavButtons placement="sidebar" historyAt={historyAt} historyLength={historyLength} travel={travel} />
      {/* R2-appswitch (D11): 2.42304.0 shared-22 DN ends the macOS titlebar with the compact switch
          (shared-21 vC -> _C -> shared-18 df-app-switch -> CDS SegmentedControl); see source-app-switch.jsx. It
          moves into the peek card while collapsed (W2), and `chord` binds ⌥⌘←/→ with its tooltip hint (W3, AM). */}
      {!collapsed && <SourceAppSwitch mode={mode} homeMode={lastChatSurface.current} onMode={onMode} chord />}
    </div>
    {/* sidebar-main.js:14903-14909: while collapsed, the bridge spans the gap between the 'Show sidebar'
        trigger and the floating body so the pointer can cross it (pointer events only while peeking). */}
    {collapsed && <div className="dframe-peek-bridge" aria-hidden="true" onPointerEnter={onPeekEnter} onPointerLeave={onPeekLeave} />}
    {/* sidebar-main.js:14918-14925: the body is the peek card while collapsed (id = the trigger's
        aria-controls); it is inert while the card is hidden. */}
    <div className="dframe-sidebar-body" data-testid="sidebar" id="frame-peek-popover" data-focus-region={collapsed ? "navigation" : undefined} data-focus-region-holds={collapsed ? "contains" : undefined} inert={collapsed && !peekOpen ? true : undefined}
      onPointerEnter={collapsed ? onPeekEnter : undefined} onPointerLeave={collapsed ? onPeekLeave : undefined}>
      {/* R2-appswitch W2: shared-22 DN `ae` puts the same switch at the top of the peek card while collapsed. */}
      {collapsed && <SourceAppSwitch placement="peek" mode={mode} homeMode={lastChatSurface.current} onMode={onMode} chord />}
      <div className="source-sidebar-header">
      {mode === 'code' ? <SidebarSearchContext.Provider value={{open: entry => setShowSearch?.(entry), shortcut: 'cmd+k'}}>
        <SidebarSearchField/>
      </SidebarSearchContext.Provider> : <div className="mb-2">
        <button type="button" className="df-search-field surface-sidebar-search" onClick={() => setShowSearch?.('search')} aria-label={t('Search')} aria-keyshortcuts={mode === "code" ? "Meta+Shift+k" : "Meta+k"}>
          <span className="source-leading-slot"><Icon name="Search" size={16} /></span><span>{t('Search')}</span>
        </button>
      </div>}
      <div className="source-sidebar-primary">
        {/* sidebar-groups.js:12741-12767 zP: New is selected (y = _ && !v) only
            on the new route for the mode (aP :12310), never while a session is
            open; aria-current follows it and aria-keyshortcuts is always
            Rl("cmd+n") = "Meta+n" (shared-frame vo keeps a one-letter key as
            typed after po lowercases it). */}
        {(mode === 'code' ? primaryRows.slice(0, 1) : primaryRows).map(renderNavRow)}
      </div>
      {mode !== 'code' && <button type="button" className="source-sidebar-nav-row surface-more" aria-haspopup="menu" aria-expanded={!!surfaceMenu}
        onClick={event => setSurfaceMenu(surfaceMenu ? null : event.currentTarget)}><span className="source-leading-slot"><Icon name="CaretRight" size={16} /></span>{t('More')}</button>}
      {mode === 'code' && <div aria-hidden="true" className="h-1 shrink-0"/>}
      </div>
      {/* _j/EE: New stays above the scroll area; HZ navigation precedes the
          session-only token scope, so it keeps the default 26px row height. */}
      {/* dframe-nav-scroll: the loaded shared-styles copy of desktop-layout.css:799-801
          masks the top 12px while data-scrolled is set. */}
      <nav ref={navRef} className="source-session-list dframe-nav-scroll" aria-label={t("Sessions")} aria-busy={listLoading}
        data-scrolled={scrolled || undefined} data-pin-dragging={drag ? "" : undefined}
        onPointerDownCapture={swallowGuardedMultiClick} onMouseDownCapture={swallowGuardedMultiClick}
        onClickCapture={swallowGuardedMultiClick} onDoubleClickCapture={swallowGuardedMultiClick}
        onScroll={(event) => {
          const nav = event.currentTarget;
          if (nav.scrollLeft !== 0) nav.scrollLeft = 0;
          setScrolled(nav.scrollTop > 2);
        }}
        onContextMenu={(event) => {
          // sidebar-groups XT: whitespace menu on any right-click that is not on a row, heading control or field.
          // R3-sections (WI-4): the Code list's is the original shared-21 _B on the list itself (SidebarBlankArea
          // below; officially only the list is its trigger), so this host menu is the other modes' only.
          if (!onSessionAction || mode === "code" || event.defaultPrevented || !(event.target instanceof Element)) return;
          if (event.target.closest('[data-row], .source-group-heading, [data-sidebar-group-label], button, input, [role="menu"]')) return;
          event.preventDefault();
          setMenu({ kind: "whitespace", anchor: event.currentTarget, point: { x: event.clientX, y: event.clientY } });
        }}
        onKeyDown={(event) => {
          // sidebar-rows.js:7915-7962 eO. Left/Right move between a [data-row]'s
          // roving item and its [data-row-action]s (clamped; preventDefault only
          // when focus moves). Up/Down/Home/End resolve focus to its row's
          // roving item and do nothing outside a row (group toggles, header
          // buttons); an item missing from the visible list enters at 0 / last.
          // A closed menu trigger (row More) keeps ArrowUp/Down: the source
          // Menu.Trigger opens on them (openOnArrowKeyDown, vendor-frame-
          // BmPfNbgY.js:23791) and stops the event (useListNavigation reference
          // onKeyDown Zr = preventDefault + stopPropagation, :20378-20383,
          // :14774), so eO never sees it. menuTriggerProps only prevents default.
          if (event.defaultPrevented || event.target.tagName === "INPUT" || event.metaKey || event.ctrlKey || event.altKey) return;
          const active = document.activeElement, list = event.currentTarget;
          if (!active || !list.contains(active)) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            const row = active.closest("[data-row]");
            if (!row) return;
            const stops = [...row.querySelectorAll("[data-roving-item], [data-row-action]")];
            if (stops.length < 2) return;
            const next = stops[Math.max(0, Math.min(stops.length - 1, stops.indexOf(active) + (event.key === "ArrowRight" ? 1 : -1)))];
            if (next !== active) { event.preventDefault(); next.focus(); }
            return;
          }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          const item = active.hasAttribute("data-roving-item") ? active : active.closest("[data-row]")?.querySelector("[data-roving-item]");
          if (!item) return;
          const rows = [...list.querySelectorAll("[data-roving-item]")].filter((row) => row.offsetParent !== null);
          if (rows.length === 0) return;
          const at = rows.indexOf(item);
          const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1
            : at === -1 ? (event.key === "ArrowDown" ? 0 : rows.length - 1)
            : (at + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
          event.preventDefault(); rows[next].focus(); rows[next].scrollIntoView({ block: "nearest" });
        }}>
        {mode === 'code' && <div data-testid="nav-pin-rows" className="source-sidebar-nav-pins">{primaryRows.slice(1).map(renderNavRow)}</div>}
        {/* R3-sections (WI-4): shared-22 vj → shared-21 _B, the Code list's blank-area menu, with this list as its trigger. */}
        <SidebarBlankArea enabled={mode === "code" && !!onSessionAction} showCreateGroup={!!onCreateGroup} onNewSession={onNew} onNewEnvironment={onCreateEnvironment}>
        <div className="df-session-list flex flex-col">
        {/* Local notice (no source counterpart): remembered sessions loadSessions
            kept out of the list, i.e. the other core's or unreadable ones. */}
        {hiddenNotice && <div className="source-sidebar-no-match source-sidebar-hidden-notice" data-sidebar-notice="hidden-sessions">
          <p>{hiddenNotice} {tn(hiddenSessions?.missing || 0, "Its files were deleted or can’t be read by {core}.", "Their files were deleted or can’t be read by {core}.", { core: coreName(engine) })}</p>
          {(onRetryHidden || onForgetHidden) && <span className="source-sidebar-hidden-actions">
            {onRetryHidden && <button type="button" className="source-sidebar-hidden-action" onClick={() => onRetryHidden()}>{t("Try again")}</button>}
            {onForgetHidden && <button type="button" className="source-sidebar-hidden-action" onClick={() => onForgetHidden()}>{t("Remove from sidebar")}</button>}
          </span>}
        </div>}
        {!sectionsModel && displayed.length === 0 && <div className="source-group-heading"><span>{preferences.status === "archived" ? t("Archived") : t(mode === "code" ? "Sessions" : "Recents")}</span><div className="source-group-actions">{headerControls}</div></div>}
        {/* shared-22 ZO: with nothing pinned the Pinned list is a stub that opens (df-pin-section-reveal) while a single
            row that can pin is dragged, holding XO's drop row. */}
        {canDragRows && !displayed.some((group) => group.kind === "pinned") && <section className="source-pinned-drop df-pin-section-reveal" data-pinned-list=""
          data-stub={pinDropOpen ? undefined : ""} inert={pinDropOpen ? undefined : true}>
          <div className="source-pinned-drop-heading" data-sidebar-group-label=""><span>{t("Pinned")}</span></div>
          <div className="source-group-rows flex flex-col gap-px" data-pinned-rows=""><PinnedDropRow hot={drag?.slotIdx != null} dragging={pinDropOpen} /></div>
        </section>}
        {sectionsModel ? <SidebarSectionsList model={sectionsModel} host={sectionsHost} createRef={sectionDialog} /> : displayed.map((group, index) => <section key={group.key} className="source-session-group" data-group-key={group.key}
          data-pinned-list={group.kind === "pinned" ? "" : undefined}
          // shared-22 SS De: a custom group section (and Ungrouped) is a drop target (data-group-list = its id, "" = none).
          data-group-list={group.kind === "custom" && onSessionAction ? group.customGroupId ?? "" : undefined}
          data-group-label={group.kind === "custom" && onSessionAction ? shownGroupLabel(group) : undefined}>
          {/* sidebar-session.js:15909-16030 OB/kB/MB (project) and :16275-16432 XB (custom): the group
              label row is a ContextMenu trigger; the Other and Ungrouped buckets have none. */}
          <div className="source-group-heading df-drag-shiftable" data-sidebar-group-label="" data-menu-open={menu?.kind === "group" && menu.group.key === group.key || undefined}
            data-drag-key={`label:${group.key}`} style={shiftStyle(`label:${group.key}`)}
            onContextMenu={groupMenuKind(group) ? (event) => {
              if (event.target instanceof Element && event.target.closest("input")) return;
              event.preventDefault();
              setMenu({ kind: "group", group, anchor: event.currentTarget, point: { x: event.clientX, y: event.clientY } });
            } : undefined}>
            {/* sidebar-rows.js:7811-7870 $D: the group toggle has no title or tooltip; QD swaps in the
                'Rename group' field (jD classes + -my-1 -ml-1 min-w-0 flex-1 py-1 pl-1 group font). */}
            {renamingGroup && renamingGroup === group.customGroupId
              ? <InlineRenameInput initial={shownGroupLabel(group)} label="Rename group" maxLength={100} className="source-group-rename-input"
                onCommit={(name) => commitGroupRename(group, name)} onClose={(refocus) => closeGroupRename(group, refocus)} />
              : <button type="button" className="source-group-toggle"
                aria-expanded={!closed.has(group.key)} data-group-toggle="" onClick={() => toggleGroup(group.key)}>
                <span>{shownGroupLabel(group)}</span><Icon name="CaretRight" size={12} className="source-group-caret" data-group-caret="" />
              </button>}
            <div className="source-group-actions">{groupActions(group, index === 0)}</div>
          </div>
          {!closed.has(group.key) && <div className="source-group-rows flex flex-col gap-px" data-group-rows="" data-pinned-rows={group.kind === "pinned" ? "" : undefined}>
            {renderGroupRows(group)}
            {/* sidebar-groups.js:17505-17516: an empty custom group invites a drop; xB elsewhere. */}
            {group.sessions.length === 0 && <p className="source-empty-group df-drag-shiftable" data-drag-key={`label:hint:${group.key}`}
              style={shiftStyle(`label:hint:${group.key}`)}>{group.customGroupId ? t("Drag or move sessions here") : t("No active sessions")}</p>}
          </div>}
          {/* ZO (A && V): a folded Pinned list still takes a dragged row. */}
          {group.kind === "pinned" && closed.has(group.key) && drag?.canPin && drag.keys.length === 1 && <div className="source-group-rows flex flex-col gap-px" data-pinned-rows="">
            <PinnedDropRow hot={drag.slotIdx != null} dragging />
          </div>}
          {/* shared-22 SS (readable 4490-4503): the target section's band while a row is held over it. */}
          {group.kind === "custom" && onSessionAction && (() => {
            const hot = !!drag?.groupIntent && drag.groupIntent.groupId === (group.customGroupId ?? null);
            return <div aria-hidden="true" className={"source-group-drop-band pointer-events-none absolute inset-x-0 rounded-lg transition-[background-color,box-shadow] " + (hot ? "bg-accent-muted ring-2 ring-inset ring-fill-accent" : "")}
              style={{ top: `calc(max(0px, var(--df-group-band-mt, var(--df-group-pt)) - 6px) - ${hot ? drag.groupIntent.extendTopPx : 0}px)`, bottom: hot ? -drag.groupIntent.extendBottomPx : 0 }} />;
          })()}
        </section>)}
        {listLoading && sourceSessions.length === 0 && <SourceSidebarSkeleton rows={3} />}
        {mode === "code" && emptyVariant && <SourceSidebarEmpty variant={emptyVariant} onRetry={onRetryLoad}
          onShowAllSessions={onViewAllSessions ? ()=>onViewAllSessions("archived") : ()=>updatePreferences(showAllSessionsPreferences(preferences))} />}
        {!sectionsModel && preferences.groupBy === "custom" && onCreateGroup && <button className="source-create-group" onClick={() => setGroupDialog({ kind: "create" })}>
          <Icon name="Add" size={14} />{t("New group")}
        </button>}
        </div>
        </SidebarBlankArea>
        <div ref={laneSentinel} aria-hidden="true" className="source-session-list-lane-sentinel" />
      </nav>
      {/* sidebar-main.js:14970-14976 df-bottom-tray > hL (:14187-14202)
          df-footer-row: LC = pw (sidebar-groups.js:5225-5310, hideSuffix false) in
          min-w-0 flex-1, then df-footer-aux. */}
      <div className="df-bottom-tray shrink-0">
        <div className="df-footer-row account-footer shrink-0 flex items-center gap-[var(--df-footer-gap)]">
          <div className="min-w-0 flex-1">
            <button type="button" data-testid="user-menu-button" aria-label={t("Account menu")}
              className="df-user-menu-btn account-button cds-reset flex h-[max(28px,var(--df-footer-btn-size))] max-w-full items-center gap-[var(--df-row-gap)] rounded-[var(--df-radius-pill)] ps-[var(--df-row-px)] pe-2 text-start outline-none hover:bg-[var(--df-hover)] focus-visible:shadow-focus"
              {...menuTriggerProps({ open: accountMenuOpen, onOpen: (entry, event) => onAccount?.(event, entry) })} onClick={(event) => onAccount?.(event, keyboardEntry(event))}>
              {/* shared-19 E0 avatar slot: C0 = CDS Avatar pp{name, src, size:"sm", aria-hidden} while __gb__496524976
                  (S0) is on (host-growthbook, user ruling: on; no image source, so the name's initials); off, T0's
                  static Spark at 16. */}
              <span className="df-on-rail relative flex w-[var(--df-leading-slot)] shrink-0 items-center justify-center">{hostGrowthBookFlag("__gb__496524976")
                ? <CdsAvatar name={avatarName ?? accountName} size="sm" aria-hidden />
                : <SourceSpark size={16} className="shrink-0" />}</span>
              <span className="flex min-w-0 gap-1 overflow-hidden text-[length:var(--df-row-font)] df-footer-suffix items-baseline">
                <span className="whitespace-nowrap text-secondary max-w-full shrink-0 truncate">{accountName}</span>
                {accountLabel && <>
                  <span aria-hidden="true" className="df-footer-suffix-text text-muted">·</span>
                  <span className="df-footer-suffix-text min-w-0 whitespace-nowrap text-muted">{accountLabel}</span>
                </>}
              </span>
              {accountName !== "" && <Icon name="CaretDown" size={12} className="shrink-0 text-muted" />}
            </button>
          </div>
          {/* sidebar-main.js:14185-14235 hL df-footer-aux (vL/yL/gL) is empty in code mode. Locally it holds a
              Connection settings control only while the core is not connected (neutral Disconnect glyph, CDS
              tooltip, no native title); it opens main.jsx 'connection' (Header + Reconnect / Settings). */}
          <div className="df-footer-aux ml-auto flex shrink-0 items-center">
            {connectionIssue && <ToolButton label={t("Connection settings")} icon="Disconnect" tooltip={{ hoverable: false, open: connectionMenuOpen ? false : undefined }}
              {...menuTriggerProps({ open: connectionMenuOpen, onOpen: (entry, event) => onMenu?.("connection", event.currentTarget, undefined, entry) })}
              onClick={(event) => onMenu?.("connection", event.currentTarget, undefined, keyboardEntry(event))} />}
          </div>
        </div>
      </div>
    </div>
    {setSidebarWidth && <SidebarResizeHandle width={sidebarWidth} minWidth={sidebarFloor} collapsed={collapsed} onCommit={setSidebarWidth} onCollapse={onCollapse} onCollapsedChange={onCollapsedChange} />}
    <SidebarDragGhost drag={drag} />
    {surfaceMenu && <SourceMenu.Popup anchor={surfaceMenu} side="right" label={t('More')} onClose={() => setSurfaceMenu(null)}>
      <SourceMenu.Item icon="Chats" checked={mode === 'chat'} checkedRole="radio" onClick={() => { setSurfaceMenu(null); onMode?.('chat'); }}>{t('Chat')}</SourceMenu.Item>
      <SourceMenu.Item icon="Tasks" checked={mode === 'cowork'} checkedRole="radio" onClick={() => { setSurfaceMenu(null); onMode?.('cowork'); }}>{t('Cowork')}</SourceMenu.Item>
    </SourceMenu.Popup>}
    {menu && <SidebarListContext.Provider value={{getList:()=>navRef.current}}><SourceSidebarMenu key={menu.token} anchor={menu.anchor} point={menu.point} kind={menu.kind} initialHighlight={menu.entry ?? "popup"}
      label={t(menu.kind === "filter" ? "Filter sessions" : menu.kind === "group" ? "Group options" :menu.kind === "older" ? "Older sessions" : menu.kind === "whitespace" ? "Sessions list options" : "Session options")}
      onClose={() => setMenu(null)}>
      {menu.kind === "filter" && <SourceSidebarFilterMenu showMetadataOption={false} preferences={preferences} onChange={updatePreferences} onClose={() => setMenu(null)} knownFolders={folders} customGroups={customGroups} />}
      {menu.kind === "session" && <SourceSidebarSessionMenu session={menu.session} metadata={sessionMetadata[menu.session.id]} customGroups={customGroups}
        state={state} onAction={runAction} onClose={() => setMenu(null)} onRename={() => setRenaming(menu.session.id)}
        unarchiving={!!unarchiving?.has?.(menu.session.id)}
        onCreateGroup={onCreateGroup ? (targets) => setGroupDialog({ kind: "create", sessions: targets }) : undefined} sectionCopy={sectionsModel ? sectionMessages : null}
        onDelete={(target) => requestDelete([target])} onFork={(target) => runAction("fork", target)} forkUnavailable={forkUnavailable}
        pinnedSiblings={pinnedIds} editors={editors} shareable={shareable} windowActions={menu.multi ? null : windowActions}
        nested={(() => {
          const count = [...runsByGroup.values()].flatMap((entry) => entry.runs).find((run) => run.parentId === menu.session.id)?.rows.length || 0;
          return count ? { childCount: count, collapsed: collapsedNested.has(menu.session.id), onToggle: () => toggleNested(menu.session.id) } : null;
        })()}
        multi={menu.multi ? { count: selectedSessions.length, sessions: selectedSessions, models: bulkModels,
          ...(() => {
            const { pin, unpin } = multiMenuState(selectedSessions, sessionMetadata);
            return { pin: pin ? { ...pin, sessions: pinTargets(selectedSessions, sessionMetadata, true) } : null,
              unpin: unpin ? { ...unpin, sessions: pinTargets(selectedSessions, sessionMetadata, false) } : null };
          })(),
          onBulk: (action, targets, payload) => action === "delete" ? requestDelete(targets) : runBulk(action, targets, payload) } : undefined} />}
      {menu.kind === "group" && (() => {
        const group = menu.group, custom = groupMenuKind(group) === "custom";
        const archivable = bulkTargets(group.sessions, { metadata: sessionMetadata, currentId: current, state, action: "archive" });
        const archiveGroup = archivable.length > 0 ? <Choice onClick={() => setConfirm({ ...(sectionsModel ? bulkArchiveConfirmCopy(intl, { groupName: group.label, count: archivable.length }) : olderConfirmCopy("archive", archivable.length)), onConfirm: () => runBulk("archive", archivable) })}>{t("Archive all ({count})", { count: archivable.length })}</Choice> : null;
        const keys = sectionKeysOf(custom), own = custom ? customOrderKey(group.customGroupId) : group.projectKey, at = keys.indexOf(own);
        // jB (sidebar-session.js:15959-15982): Move up / Move down where the section can move, then
        // 'Sort A to Z' (the order reset; locally an A to Z order of these sections).
        const orderItems = <>
          {at > 0 && <Choice onClick={() => saveSectionOrder(moveSection(keys, own, "up"))}>Move up</Choice>}
          {at !== -1 && at < keys.length - 1 && <Choice onClick={() => saveSectionOrder(moveSection(keys, own, "down"))}>Move down</Choice>}
          <Choice onClick={() => saveSectionOrder(sortSectionsAlphabetically(displayed.filter((entry) => custom ? !!entry.customGroupId : entry.kind === "project")))}>Sort A to Z</Choice>
        </>;
        // Current xZ uses KJ new/edit/view/remove sections; empty sections
        // never leave orphan separators.
        if (!custom) return <SidebarOrderedMenu groups={{
          new: group.cwd && onProject && <Choice onClick={() => onProject(group.cwd)}>{t("New session")}</Choice>,
          edit: orderItems, view: groupViewItems(), remove: archiveGroup,
        }}/>;
        // Current uy uses the same order, with New group in new and Rename
        // in edit. Saved-environment groups remain a separate host feature.
        return <SidebarOrderedMenu groups={{
          new: <><Choice onClick={() => newSessionInGroup(group)}>{t("New session")}</Choice>
            {onCreateGroup && <Choice onClick={() => setGroupDialog({ kind: "create" })}>{t("New group…")}</Choice>}</>,
          edit: <><Choice onClick={() => startGroupRename(group)}>Rename group</Choice>{orderItems}</>,
          view: groupViewItems(),
          remove: <>{archiveGroup}<Choice variant="danger" onClick={() => requestGroupDelete(group)}>Delete group</Choice></>,
        }}/>;
      })()}
      {menu.kind === "whitespace" && <>
        <SidebarMenuSection separator="after">
          {onNew && <Choice onClick={onNew}>{t("New session")}</Choice>}
          {sectionsModel ? onCreateGroup && <Choice onClick={openSectionDialog}>{t(sectionMessages.newEllipsis.defaultMessage)}</Choice>
            : preferences.groupBy === "custom" && onCreateGroup && <Choice onClick={() => setGroupDialog({ kind: "create" })}>{t("New group…")}</Choice>}
          {(sectionsModel || preferences.groupBy === "custom") && onCreateEnvironment && <Choice onClick={onCreateEnvironment}>{t("New environment")}</Choice>}
        </SidebarMenuSection>
        <Choice onClick={() => setSelectionState((previous) => replaceSelection(previous, visibleOrderRef.current, SELECTION_DOMAIN))}>{t("Select all")}</Choice>
        {groupViewItems()}
      </>}
      {menu.kind === "older" && (() => {
        const archivable = olderTargets(menu.group, "archive"), deletable = olderTargets(menu.group, "delete");
        return <>
          {archivable.length > 0 && <Choice onClick={() => setConfirm({ ...olderConfirmCopy("archive", archivable.length), onConfirm: () => runBulk("archive", archivable, undefined, { older: true }) })}>{t("Archive all ({count})", { count: archivable.length })}</Choice>}
          {deletable.length > 0 && <Choice variant="danger" onClick={() => setConfirm({ ...olderConfirmCopy("delete", deletable.length, { engine }), onConfirm: () => runBulk("delete", deletable, undefined, { older: true }) })}>{t("Delete all ({count})", { count: deletable.length })}</Choice>}
        </>;
      })()}
    </SourceSidebarMenu></SidebarListContext.Provider>}
    {/* R3-sections: shared-20 xx for a section made for sessions (row menus), dx's own for the header / blank-area menus. */}
    {sectionsModel && <CreateGroupDialog isOpen={!!groupDialog} onClose={() => setGroupDialog(null)} onSubmit={(name) => createSectionWith(name, groupDialog?.sessions)} />}
    {!sectionsModel && shownGroupDialog.value && <GroupNameDialog key={`group-${shownGroupDialog.key}`} open={shownGroupDialog.open} onExited={shownGroupDialog.onExited}
      switchesToCustom={preferences.groupBy !== "custom"} onClose={() => setGroupDialog(null)} onSubmit={async (name) => {
        const dialog = shownGroupDialog.value;
        await onCreateGroup(name, dialog.sessions?.[0]?.id, dialog.sessions?.map((session) => session.id));
        if (dialog.sessions?.length > 1) setSelectionState(clearSelection);
      }} />}
    {shownConfirm.value && <SourceConfirmDialog key={`confirm-${shownConfirm.key}`} open={shownConfirm.open} onExited={shownConfirm.onExited}
      title={shownConfirm.value.title} body={shownConfirm.value.body} confirmLabel={shownConfirm.value.confirmLabel} danger={shownConfirm.value.danger}
      initialFocus={shownConfirm.value.initialFocus} onConfirm={shownConfirm.value.onConfirm} onClose={() => { shownConfirm.value.onClosed?.(); setConfirm(null); }} />}
    {/* ⌘K / ⇧⌘K and the header Search button (sidebar-groups.js:5352-5377 _w): the centred command palette.
        showSearch is false or the entry mode ("default" for ⌘K, "search" for ⇧⌘K / Search). */}
    {setShowSearch && <SourceSidebarPalette open={!!showSearch} entry={showSearch === "search" ? "search" : "default"} onClose={() => setShowSearch(false)}
      query={search} setQuery={setSearch} sessions={sourceSessions} folders={folders} contentMatches={searchMatches} deepSearch={deepSearch}
      state={state} metadata={sessionMetadata} actions={paletteActions({ onNew, setSection, onToggleSidebar: onCollapse, onOpenSettings,
        jumps: showSearch ? JUMP_COMMANDS.filter((command) => regionJumpAvailable(command.regions)) : [], onJump: jumpToRegions,
        nested: mode === "code" && showSearch ? sidebarNestedCommands(allParentIds().filter((id) => !sessionMetadata[id]?.pinned && !sessionArchived(sourceSessions.find((session) => session.id === id) ?? {})),
          preferences.collapsedNested, (collapsedNested) => updatePreferences({ ...preferences, collapsedNested })) : null,
        ...(showSearch && typeof paletteCommands === "function" ? paletteCommands() : null) })}
      onOpenSession={onOpen} onStartSession={onStartSession} onNew={onNew} onProject={onProject} />}
  </aside>;
}

export { SourceSidebar as Sidebar, RenameRow as SourceSidebarRenameRow };
