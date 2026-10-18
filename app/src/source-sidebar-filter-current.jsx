// R3-sections step 3 (work item sidebar-filter-sessionlist-current, WI-5; ledger sidebar-17): the Code list's Group and
// sort, as 2.42304.0 renders it once the presets gate is on (D10): shared-21 _U (the session list's filter host) with vU
// (its trigger in the Sessions heading) and oU in its "sessionList" layout. Everything drawn is original:
//   - the trigger is shared-21 aU (CDS Tooltip around the CDS Dropdown trigger, a ghost icon CdsButton) in CB's
//     hover-revealed span, generated into sidebar-sections/section-filter-controls.mjs;
//   - the menu is the CDS Dropdown (view-tabs CdsDropdown, the detached-trigger handle from shared-19 L$ with view-tabs
//     CdsMenuCreateHandle) holding oU's sessionList branch (code-current sidebar-filter-view.mjs): Group by (Se, Custom
//     hidden), Sort by (lU: Last updated / Date created / Name), Show › Metadata / Empty groups, then sU (New section…,
//     Reset to defaults with its reason) and cU (View all, or its reason / Loading…);
//   - its writers are the original Sessions section writers: shared-16 ip / op / ap, shared-20 ES / TS (generated).
// What this module adds is oU's locals the original reads from the frame store, taken from the sidebar's preferences
// (main's Sessions section, sidebar-sections-layout.mjs sectionsPreferences), and the one empty-groups writer (below).
// The Hide / Show all nested sessions items are gone from this menu in 2.42304.0; they are the command palette's
// hide_all_nested_sessions / show_all_nested_sessions (shared-20 _S; sidebar-palette-model.mjs, sidebarNestedCommands).
import React, { useCallback, useId, useMemo, useState } from 'react';
import { CdsDropdown } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { useSidebarOverlayGate, useStatusGrouping, useIsDesktopApp, useSidebarSectionsStore } from './source-sidebar-sections-adapters.jsx';
import { useLazyMenu, useOverflowMenuFlag, useCloseWhenSidebarHides } from './generated/sidebar-sections/menu-triggers.mjs';
import { useDirection } from './generated/sidebar-sections/direction.mjs';
import { useCdsDensity } from './generated/sidebar-sections/cds-helpers.mjs';
import { groupByShown, writeSessionsGroupBy, writeSessionsSortBy, clearSessionsGroupBy } from './generated/sidebar-sections/group-mode.mjs';
import { writeSessionsAscending, writeSessionsMetadata } from './generated/sidebar-sections/sessions-view-writers.mjs';
import { defaultGroupBy, sessionsSectionId } from './generated/sidebar-sections/sections-model.mjs';
import { CurrentSidebarFilterContent } from './generated/code-current/sidebar-filter-view.mjs';
import { sidebarCurrentGroupOptions } from './generated/code-current/sidebar-filter-options.mjs';
import {
  sidebarFilterMessages, useSidebarSortOptions, useSidebarRegroupFocus, SidebarFilterTrigger, trailingControlClass,
  sortAscendingShown, sortAscendingStored,
} from './generated/code-current/sidebar-filter-controls.mjs';
import { normalizeSidebarPreferences } from './sidebar-model.js';
import { sessionListNotAtDefaults, sessionListResetSteps, CODE_ROUTINES_SECTION_HOST } from './sidebar-filter-current-model.mjs';

export { sidebarNestedCommands, sidebarViewAllValue } from './sidebar-filter-current-model.mjs';

/** shared-21 mU: the list host's closed state (open, the trigger that opened it, keyboard regroups so far). */
export const CLOSED_FILTER_STATE = Object.freeze({ open: false, triggerId: null, keyRegroups: 0 });
/** A host marker on the trigger (no style of its own; tests/style-control-reset-layer.test.mjs finds the button by it). */
export const FILTER_TRIGGER_MARKER = 'source-current-filter-button';

/** shared-16 sp's presets branch `a` (shared-21 Ux = sp: `[i, a]`): Show › Empty groups is the Sessions section's. The
 * hook itself also reads an account-scoped preference (yr) for the non-presets branch, which the host does not have. */
export function writeSessionsEmptyGroups(emptyGroups) {
  useSidebarSectionsStore.getState().setSectionView(sessionsSectionId, { show: { emptyGroups } });
}

/**
 * shared-21 _U + vU with the sidebar's one trigger. `preferences`: the Code list's (the Sessions section's group / sort /
 * ascending / metadata / empty groups); `listRef`: the list element (gU moves focus to its first heading after a
 * keyboard regroup).
 */
export function SourceCodeSidebarFilter({ preferences, listRef }) {
  const { handle, hasBody, triggerProps } = useLazyMenu();
  const [state, setState] = useState(CLOSED_FILTER_STATE);
  useSidebarRegroupFocus(listRef, state);
  const overflow = useOverflowMenuFlag();
  // _U p: open / close, remembering the opening trigger, and the overflow-menu flag.
  const onOpenChange = useCallback((open, triggerId) => {
    setState((current) => open ? { ...current, open: true, triggerId: triggerId ?? null }
      : current.open ? { ...current, open: false, triggerId: null } : current);
    overflow(open);
  }, [overflow]);
  // _U m: a regroup made from the keyboard counts, so gU focuses the first heading once the menu has closed.
  const onRegroup = useCallback((keyboard) => {
    if (keyboard) setState((current) => ({ ...current, keyRegroups: current.keyRegroups + 1 }));
  }, []);
  // _U vi: close when the sidebar hides.
  useCloseWhenSidebarHides(useCallback(() => onOpenChange(false), [onOpenChange]));
  // vU: `aU({handle, triggerProps, open: a, label: groupAndSort, comfortable, sm, id})` in `span.CB(a, o)`; o (the
  // fizzy-lake panel chrome) is off here. With one trigger, a is the menu's open state (iU's form).
  const id = useId();
  const intl = useStartIntl();
  const comfortable = useCdsDensity() === 'comfortable';
  const marked = useMemo(() => ({ ...triggerProps, className: FILTER_TRIGGER_MARKER }), [triggerProps]);
  return <>
    <span className={trailingControlClass(state.open, false)}>
      {SidebarFilterTrigger({ handle, triggerProps: marked, open: state.open, label: intl.formatMessage(sidebarFilterMessages.groupAndSort), comfortable, sm: false, id })}
    </span>
    {hasBody && <SessionListFilterMenu handle={handle} open={state.open} onOpenChange={onOpenChange} onRegroup={onRegroup} preferences={preferences} />}
  </>;
}

/**
 * shared-21 oU({mode: "code", layout: "sessionList", handle, open, onOpenChange, onRegroup}): X.Root / X.Popup (side
 * bottom, align end, sideOffset 4, no min width in this layout) around its sessionList branch, with oU's locals:
 *   Se  sidebarCurrentGroupOptions({statusGrouping: ga(), customDisabled: be = ux() = overlayEnabled});
 *   s   the effective Sessions group-by (ep), ut = jx(s, be), lt = jx(gh(void 0, "code", …), be): the desktop default;
 *   l   the Sessions sort, Ee its stored ascending (it = YH(l, Ee) is what the radios show);
 *   Ce  Show › Metadata (DS), W Show › Empty groups (sp), de = true (code, sessionList);
 *   se  Show › Routines: `ie || r && ae` with ie = GH(ne) over the routines section's `shown` (sidebar-filter-current-
 *       model.mjs routinesItemOffered / nextRoutinesLatch / routinesItemShown). The item toggles the sidebar's Code
 *       routines section (shared-21 WY / gY), which the host has not migrated yet (CODE_ROUTINES_SECTION_HOST), so it
 *       is not offered here (R4i-sidebar SI3, sidebar-17);
 *   dt  "not at defaults" (sU shows Reset disabled while !dt), ft the reset.
 * mt's telemetry (claudeai.desktop.sidebar_settings.opened) and We's are not sent (D17).
 */
export function SessionListFilterMenu({ handle, open, onOpenChange, onRegroup, preferences }) {
  const prefs = normalizeSidebarPreferences(preferences);
  const intl = useStartIntl(), direction = useDirection();
  const statusGrouping = useStatusGrouping();
  const { overlayEnabled } = useSidebarOverlayGate();
  const desktop = useIsDesktopApp();
  const groupOptions = useMemo(() => sidebarCurrentGroupOptions({ intl, statusGrouping, customDisabled: overlayEnabled }), [intl, statusGrouping, overlayEnabled]);
  const sortOptions = useSidebarSortOptions();
  const { groupBy, sortBy, ascending, showMetadata: metadata, showEmptyGroups: emptyGroups } = prefs;
  const shown = groupByShown(groupBy, overlayEnabled);
  const fallback = groupByShown(defaultGroupBy('code', desktop), overlayEnabled);
  // nt: `fe(e)` (ip; its `V("active")` for Status is moot: the sections layout lists active sessions only), then the
  // regroup when the group-by changed.
  const onGroupBy = (next, keyboard = false) => { writeSessionsGroupBy('code', next); if (groupBy !== next) onRegroup?.(keyboard); };
  const onSortBy = (next) => writeSessionsSortBy('code', next);
  const onAscending = (next) => writeSessionsAscending(sortAscendingStored(sortBy, next));
  // ft, in its order: Sort by recency, Descending, Empty groups off, the regroup, then the cleared group-by (ap).
  const onReset = (event) => {
    const steps = sessionListResetSteps({ shown, fallback, sortBy, ascending, emptyGroups });
    if (steps.sortBy) onSortBy(steps.sortBy);
    if (steps.descending) onAscending(false);
    if (steps.emptyGroupsOff) writeSessionsEmptyGroups(false);
    if (steps.regroup) onRegroup?.(event?.detail === 0);
    clearSessionsGroupBy('code');
  };
  return <CdsDropdown.Root handle={handle} open={open} onOpenChange={(next, details) => onOpenChange(next, details?.trigger?.id)}>
    <CdsDropdown.Popup side="bottom" align="end" sideOffset={4}>
      <CurrentSidebarFilterContent intl={intl} direction={direction}
        groupOptions={groupOptions} groupBy={shown} onGroupBy={onGroupBy}
        sortOptions={sortOptions} sortBy={sortBy} onSortBy={onSortBy}
        ascending={sortAscendingShown(sortBy, ascending)} onAscending={onAscending}
        metadata={metadata} onMetadata={() => writeSessionsMetadata(!metadata)}
        routinesAvailable={CODE_ROUTINES_SECTION_HOST} emptyGroupsAvailable emptyGroups={emptyGroups} onEmptyGroups={() => writeSessionsEmptyGroups(!emptyGroups)}
        resetAvailable={sessionListNotAtDefaults({ shown, fallback, sortBy, ascending, emptyGroups })} onReset={onReset} />
    </CdsDropdown.Popup>
  </CdsDropdown.Root>;
}
