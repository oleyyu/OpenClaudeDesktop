// R3-sections step 3 (work item sidebar-filter-sessionlist-current, WI-5; ledger sidebar-17): the Code list's Group and
// sort, as the desktop renders it once the presets gate is on (D10). 3.6556.2 (w4-sidebar-filter; 2.42304.0 names in
// brackets): shared-21 rY [_U] (the session list's filter host) with iY [vU] (its trigger, here in the Sessions heading)
// and PJ [oU] in its "sessionList" layout. Everything drawn is original:
//   - the trigger is shared-21 NJ [aU] (CDS Tooltip around the CDS Dropdown trigger rendering yJ, a ghost icon CdsButton
//     that reads the CDS density itself) in OG's [CB's] hover-revealed span, generated into
//     sidebar-sections/section-filter-controls.mjs;
//   - the menu is the CDS Dropdown (view-tabs CdsDropdown, the detached-trigger handle from shared-16 xl with view-tabs
//     CdsMenuCreateHandle) holding PJ's sessionList block (code-current sidebar-filter-view.mjs): Group by (GJ, kept open,
//     Custom hidden), Sort by (KJ: Last updated / Date created / Name), Show › Metadata / [Routines] / [Side chats] /
//     Empty groups, then UJ (New section…, Reset to defaults with its reason) and WJ (View all, or its reason / Loading…);
//   - its writers are the original Sessions section writers (generated sidebar-sections group-mode / sessions-view-writers).
// What this module adds is PJ's locals the original reads from the frame store, taken from the sidebar's preferences
// (main's Sessions section, sidebar-sections-layout.mjs sectionsPreferences), and the one empty-groups writer (below).
// The Hide / Show all nested sessions items are gone from this menu since 2.42304.0; they are the command palette's
// hide_all_nested_sessions / show_all_nested_sessions (shared-20 _S; sidebar-palette-model.mjs, sidebarNestedCommands).
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
// E41: this module sits in the sidebar / menu graph, so CDS comes by semantic name from the view-tabs file, not the facade.
import { CdsDropdown, asElementNode } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import { useStartIntl } from './source-code-start-adapters.jsx';
import { useSidebarOverlayGate, useStatusGrouping, useIsDesktopApp, useSidebarSectionsStore, useSidebarRoutinesToggle } from './source-sidebar-sections-adapters.jsx';
import { useLazyMenu, useOverflowMenuFlag, useCloseWhenSidebarHides } from './generated/sidebar-sections/menu-triggers.mjs';
import { useDirection } from './generated/sidebar-sections/direction.mjs';
import { groupByShown, writeSessionsGroupBy, writeSessionsSortBy, clearSessionsGroupBy } from './generated/sidebar-sections/group-mode.mjs';
import { writeSessionsAscending, writeSessionsMetadata } from './generated/sidebar-sections/sessions-view-writers.mjs';
import { defaultGroupBy, sessionsSectionId } from './generated/sidebar-sections/sections-model.mjs';
import { CurrentSidebarFilterContent } from './generated/code-current/sidebar-filter-view.mjs';
import { useSidebarGroupByOptions } from './generated/code-current/sidebar-group-options.mjs';
import {
  sidebarFilterMessages, useSidebarSortOptions, SidebarFilterTrigger, trailingControlClass, sortAscendingShown, sortAscendingStored,
} from './generated/code-current/sidebar-filter-controls.mjs';
import { normalizeSidebarPreferences } from './sidebar-model.js';
import { sessionListNotAtDefaults, sessionListResetSteps, sessionListGroupOptions, frozenTriggerAnchor } from './sidebar-filter-current-model.mjs';

export { sidebarNestedCommands, sidebarViewAllValue } from './sidebar-filter-current-model.mjs';

/** shared-21 eY [mU]: the list host's closed state (open, the trigger that opened it, its frozen anchor, held). */
export const CLOSED_FILTER_STATE = Object.freeze({ open: false, triggerId: null, anchor: null, held: false });
/** A host marker on the trigger (no style of its own; tests/style-control-reset-layer.test.mjs finds the button by it). */
export const FILTER_TRIGGER_MARKER = 'source-current-filter-button';

/** shared-16 sp's presets branch `a` (shared-21 Ux = sp: `[i, a]`): Show › Empty groups is the Sessions section's. The
 * hook itself also reads an account-scoped preference (yr) for the non-presets branch, which the host does not have. */
export function writeSessionsEmptyGroups(emptyGroups) {
  useSidebarSectionsStore.getState().setSectionView(sessionsSectionId, { show: { emptyGroups } });
}

/** shared-21 $J: while the menu is open at its frozen anchor, a wheel outside the menu does not scroll the list away from
 * it (ctrl+wheel, the zoom, is left alone). */
export function menuWheelGuard(event) {
  if (!event.ctrlKey && !asElementNode(event.target)?.closest('[role="menu"]')) event.preventDefault();
}
/** shared-21 QJ(open, anchor): $J on the anchor's document while the menu is open. */
function useMenuWheelGuard(open, anchor) {
  const doc = anchor?.contextElement.ownerDocument;
  useEffect(() => {
    if (!open || !doc) return undefined;
    doc.addEventListener('wheel', menuWheelGuard, { passive: false });
    return () => { doc.removeEventListener('wheel', menuWheelGuard); };
  }, [open, doc]);
}

/**
 * shared-21 rY + iY with the sidebar's one trigger. `preferences`: the Code list's (the Sessions section's group / sort /
 * ascending / metadata / empty groups); `listRef`: the list element. rY's own parts the host keeps:
 *   - `y(open, trigger, reason)`: opening records the trigger's id and ZJ(trigger), the anchor PJ's Popup stays at while
 *     the list regroups under it (Group by keeps the menu open); closing keeps both (`{...t, open: !1}`) and marks the
 *     close as from inside (Escape / an item) for rY's refocus effect; then the overflow-menu flag (Fj, `m(e, !0)`);
 *   - QJ (above) while open; Lj [vi] closes the menu when the sidebar hides; the effect that moves a Status grouping to
 *     Date when status grouping is unavailable.
 * The trigger-gone path (b: re-anchor to the nearest `[data-group-sort-trigger]` and hold the menu open, or close it and
 * nY the focus) is for the per-group triggers official rY provides to; the host's one trigger is in the Sessions heading,
 * which stays while the menu is open, so `held` stays false. The keyboard-regroup focus of 2.42304.0 (gU and its regroup
 * count) is gone in 3.6556.2 (SB-26).
 */
export function SourceCodeSidebarFilter({ preferences, listRef }) {
  const { handle, hasBody, triggerProps } = useLazyMenu();
  const [state, setState] = useState(CLOSED_FILTER_STATE);
  const { open, triggerId, anchor, held } = state;
  const overflow = useOverflowMenuFlag();
  const opening = useRef(null);
  // rY _: once closed, the close record is dropped (its held refocus does not arise with one trigger).
  useEffect(() => {
    if (!open && opening.current?.closing) opening.current = null;
  }, [open]);
  useMenuWheelGuard(open, anchor);
  const onOpenChange = useCallback((next, trigger, reason) => {
    if (next) opening.current = trigger ? { triggerId: trigger.id, anchor: frozenTriggerAnchor(trigger), closing: false, fromInside: false } : null;
    else if (opening.current) { opening.current.closing = true; opening.current.fromInside = reason === 'escape-key' || reason === 'item-press'; }
    const record = opening.current;
    setState((current) => next ? { open: true, triggerId: record?.triggerId ?? null, anchor: record?.anchor ?? null, held: false }
      : current.open ? { ...current, open: false } : current);
    overflow(next, true);
  }, [overflow]);
  // rY S / Zb: close when the sidebar hides.
  useCloseWhenSidebarHides(useCallback(() => onOpenChange(false), [onOpenChange]));
  // rY E: `!T && C === "state" && Cx("code", "date")`.
  const statusGrouping = useStatusGrouping();
  const groupBy = normalizeSidebarPreferences(preferences).groupBy;
  useEffect(() => {
    if (!statusGrouping && groupBy === 'state') writeSessionsGroupBy('code', 'date');
  }, [statusGrouping, groupBy]);
  // iY: `o = openTriggerId === t`, the span OG(o && !held, s) with `scrollMarginBlock: 8` and data-group-sort-trigger,
  // around NJ({handle, triggerProps, open: o, label: groupAndSort, held: o && held, id: t}); s (fizzy-lake panels) is off.
  const id = useId();
  const intl = useStartIntl();
  const mine = open && triggerId === id;
  const marked = useMemo(() => ({ ...triggerProps, className: FILTER_TRIGGER_MARKER }), [triggerProps]);
  return <>
    <span className={trailingControlClass(mine && !held, false)} style={TRIGGER_SPAN_STYLE} data-group-sort-trigger={id}>
      {SidebarFilterTrigger({ handle, triggerProps: marked, open: mine, label: intl.formatMessage(sidebarFilterMessages.groupAndSort), held: mine && held, id })}
    </span>
    {hasBody && <SessionListFilterMenu handle={handle} open={open} onOpenChange={onOpenChange} triggerId={triggerId}
      anchor={anchor ?? undefined} preferences={preferences} />}
  </>;
}
const TRIGGER_SPAN_STYLE = Object.freeze({ scrollMarginBlock: 8 });

/**
 * shared-21 PJ({mode: "code", layout: "sessionList", handle, open, onOpenChange, triggerId, anchor}): H.Root (triggerId)
 * / H.Popup (side bottom, align end, sideOffset 4, the frozen anchor, finalFocus while anchored; no min width in this
 * layout) around its sessionList block, with PJ's locals:
 *   we  GJ() (code-current sidebar-group-options.mjs): Date / [Status: is()] / Folder / Environment / [Custom: !aw()] /
 *       None; Environment only once the host buckets by saved environment (sessionListGroupOptions, E17);
 *   Xt  fC(l, _e): the effective Sessions group-by as the radios show it; Yt the desktop default (the reset target);
 *   f   the Sessions sort, De its stored ascending (Ut = xJ(f, De) is what the radios show);
 *   Te  Show › Metadata, Y Show › Empty groups (ce = true: code, sessionList);
 *   ie  VJ(open): Show › Routines (HJ); the host has no Code routines section to toggle (CODE_ROUTINES_SECTION_HOST),
 *       so the adapter's toggle is not offered (R4i-sidebar SI3, sidebar-17);
 *   X   QS().sideChatTabStripForRows: Show › Side chats; off in the host (E16), so it is not passed;
 *   Zt  "not at defaults" (UJ shows Reset disabled while !Zt), Qt the reset.
 * Vt is `Z(e)` (Cx; its `ee("active")` for Status is moot: the sections layout lists active sessions only); kt's and
 * Tt's telemetry (sidebar_settings.opened / changed) is not sent (D17).
 */
export function SessionListFilterMenu({ handle, open, onOpenChange, triggerId, anchor, preferences }) {
  const prefs = normalizeSidebarPreferences(preferences);
  const intl = useStartIntl(), direction = useDirection();
  const { overlayEnabled } = useSidebarOverlayGate();
  const desktop = useIsDesktopApp();
  const options = useSidebarGroupByOptions();
  const groupOptions = useMemo(() => sessionListGroupOptions(options), [options]);
  const sortOptions = useSidebarSortOptions();
  const routinesToggle = useSidebarRoutinesToggle();
  const { groupBy, sortBy, ascending, showMetadata: metadata, showEmptyGroups: emptyGroups } = prefs;
  const shown = groupByShown(groupBy, overlayEnabled);
  const fallback = groupByShown(defaultGroupBy('code', desktop), overlayEnabled);
  const onGroupBy = (next) => writeSessionsGroupBy('code', next);
  const onSortBy = (next) => writeSessionsSortBy('code', next);
  const onAscending = (next) => writeSessionsAscending(sortAscendingStored(sortBy, next));
  // Qt, in its order: Sort by recency, Descending, Empty groups off, then the cleared group-by (tC).
  const onReset = () => {
    const steps = sessionListResetSteps({ sortBy, ascending, emptyGroups });
    if (steps.sortBy) onSortBy(steps.sortBy);
    if (steps.descending) onAscending(false);
    if (steps.emptyGroupsOff) writeSessionsEmptyGroups(false);
    clearSessionsGroupBy('code');
  };
  return <CdsDropdown.Root handle={handle} open={open} triggerId={triggerId}
    onOpenChange={(next, details) => onOpenChange(next, details?.trigger, details?.reason)}>
    <CdsDropdown.Popup side="bottom" align="end" sideOffset={4} anchor={anchor} finalFocus={anchor ? true : undefined}>
      <CurrentSidebarFilterContent intl={intl} direction={direction}
        groupOptions={groupOptions} groupBy={shown} onGroupBy={onGroupBy}
        sortOptions={sortOptions} sortBy={sortBy} onSortBy={onSortBy}
        ascending={sortAscendingShown(sortBy, ascending)} onAscending={onAscending}
        metadata={metadata} onMetadata={() => writeSessionsMetadata(!metadata)}
        routinesToggle={routinesToggle} emptyGroupsAvailable emptyGroups={emptyGroups} onEmptyGroups={() => writeSessionsEmptyGroups(!emptyGroups)}
        resetAvailable={sessionListNotAtDefaults({ shown, fallback, sortBy, ascending, emptyGroups })} onReset={onReset} />
    </CdsDropdown.Popup>
  </CdsDropdown.Root>;
}
