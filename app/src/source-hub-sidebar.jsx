// w13-close-cowork-sidebar (G12; closeout cwui-46 remainder and chatui-sidebar-star-02): the host pieces of the Cowork
// (hub) sidebar list of Claude Desktop 3.6556.2 over hub-sidebar-model.mjs (official evidence there):
//   - the per-mode list view (shared-52 sidebar store groupByByMode / sortByByMode, and $N's emptyGroupsState per mode),
//     persisted in localStorage as the official store persists those units;
//   - the Cowork "Group and sort" menu (shared-21 PJ `t === "cowork"` branch: qJ Group by, qJ Sort by, Show empty groups);
//   - the Cowork buckets of shared-22 bD (unread iw, state fw, project Bw, none yD → Nw "Recents") laid over the host's
//     flat list, and Bw's "View project" header button (shared-21 HQ);
//   - the hub multi-selection menu (shared-16 fm `I` → cf259e6ae SidebarBulkMenuItems, groups submenu shared-20 Wx / Ux).
import React, { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import { SourceMenu } from "./source-menu";
import { RegisterSidebarMenuRow } from "./generated/code-current/sidebar-menu-groups.mjs";
import { CdsButton, useDirection } from "./generated/view-tabs/index.js";
import { physicalSide } from "./generated/sidebar-resize/logical-side.mjs";
import { t } from "../electron/i18n/index.mjs";
import {
  COWORK_STATE_ORDER, HUB_BULK_MESSAGES, HUB_MESSAGES, HUB_SORT_OPTIONS, coworkGroupBy, coworkGroupByDisabled, coworkGroupByMenuValue,
  coworkGroupByOptions, coworkOffersEmptyGroups, coworkProjectBuckets, coworkStateBuckets, coworkUnreadBuckets, hubBulkHotkeys, hubSortBy,
} from "./hub-sidebar-model.mjs";

/**
 * A descriptor through the zh-CN catalog: the `"<English>|<id>"` key first (a word another surface translates otherwise,
 * e.g. the Unread grouping's "Read" next to the Read tool's 已读取), else the English key (as source-chat-export-adapters).
 */
export function hubMessage(descriptor, values) {
  const keyed = `${descriptor.defaultMessage}|${descriptor.id}`;
  return t(keyed) === keyed ? t(descriptor.defaultMessage, values) : t(keyed, values);
}

// ---------------------------------------------------------------- the per-mode list view

export const HUB_VIEW_KEY = "openclaude.sidebar.hubView";
const EMPTY_VIEW = Object.freeze({ groupByByMode: {}, sortByByMode: {}, showEmptyGroupsByMode: {} });
const readView = () => {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(HUB_VIEW_KEY) ?? "null");
    return value && typeof value === "object" ? { ...EMPTY_VIEW, ...value } : EMPTY_VIEW;
  } catch { return EMPTY_VIEW; }
};
let view = null;
const listeners = new Set();
const currentView = () => (view ??= readView());
const writeView = (next) => {
  view = next;
  try { globalThis.localStorage?.setItem(HUB_VIEW_KEY, JSON.stringify(next)); } catch {}
  for (const listener of [...listeners]) listener();
};
/** shared-52 setGroupBy / setSortBy (by mode) and jS's per-mode showEmptyGroups toggle. */
export const hubViewStore = Object.freeze({
  getState: currentView,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  setGroupBy(kind, value) { const s = currentView(); writeView({ ...s, groupByByMode: { ...s.groupByByMode, [kind]: value } }); },
  setSortBy(kind, value) { const s = currentView(); writeView({ ...s, sortByByMode: { ...s.sortByByMode, [kind]: value } }); },
  setShowEmptyGroups(kind, value) { const s = currentView(); writeView({ ...s, showEmptyGroupsByMode: { ...s.showEmptyGroupsByMode, [kind]: !!value } }); },
  /** Tests only. */
  reset() { view = null; for (const listener of [...listeners]) listener(); },
});
/** The kind's view: {groupBy (stored, may be undefined), sortBy, showEmptyGroups}. */
export function useHubSidebarView(kind) {
  const state = useSyncExternalStore(hubViewStore.subscribe, currentView, currentView);
  return { groupBy: state.groupByByMode?.[kind], sortBy: hubSortBy(state.sortByByMode?.[kind]), showEmptyGroups: state.showEmptyGroupsByMode?.[kind] === true };
}

// ---------------------------------------------------------------- the Cowork "Group and sort" menu

function MenuRow(props) { return <RegisterSidebarMenuRow><SourceMenu.Item {...props} /></RegisterSidebarMenuRow>; }

/**
 * shared-21 qJ: a SubmenuTrigger with the current value as `text-footnote` trailing text (`text-accent` when active,
 * else `text-muted`), its popup on the inline-end side (ny) holding one Menu.Group of radio items; `separatorBefore`
 * draws `div[aria-hidden][data-testid=submenu-line-before-<value>]` around a separator before that value.
 */
export function HubOptionSubmenu({ label, options, value, onChange, active = false, separatorBefore, disabledValues, keepOpen }) {
  const direction = useDirection();
  const current = options.find(([option]) => option === value)?.[1];
  const trailing = <span className={"text-footnote " + (active ? "text-accent" : "text-muted")}>{current ? hubMessage(current) : value}</span>;
  return <SourceMenu.Submenu>
    <SourceMenu.SubmenuTrigger label={label} trailing={trailing}>{label}</SourceMenu.SubmenuTrigger>
    <SourceMenu.Popup side={physicalSide("inline-end", direction)} align="start" label={label}>
      <SourceMenu.Group>
        {options.map(([option, message]) => <Fragment key={option}>
          {option === separatorBefore && <div aria-hidden data-testid={`submenu-line-before-${option}`}><SourceMenu.Separator /></div>}
          <MenuRow checked={option === value} checkedRole="radio" disabled={disabledValues?.has(option)} keepOpen={keepOpen}
            onClick={() => onChange(option)}>{hubMessage(message)}</MenuRow>
        </Fragment>)}
      </SourceMenu.Group>
    </SourceMenu.Popup>
  </SourceMenu.Submenu>;
}

/**
 * PJ cowork `fn = [e, rn, n, o, nn, s, c]` at the local gates: e (Type / Status / Last activity) and c (Reset to
 * defaults) need `x = yL()`, rn (Owner) and n (its separator) need `S(vl)` — all off; so Group by (`separatorBefore:
 * "none"`, `disabledValues: bt`), Sort by, then for Custom groups a separator and "Show empty groups" (keepOpen). `Bt`
 * (the routines placement item) needs shared-18 bT, the claude_ai_unified_routines gate (off, as extract-code-routines).
 */
export function SourceCoworkGroupSortMenu({ view, hasProjects = false, onClose }) {
  const value = coworkGroupByMenuValue(view.groupBy);
  const effective = coworkGroupBy(view.groupBy);
  // PJ `a`: `(e === "date" && ((L && O === "type") || (y && O === "project") || (v && C === "type"))) || Et(e)` — with
  // L, y and v off here every pick is Et → Z → Cx(t, e) (shared-11 vf: setGroupBy off Code).
  const pickGroup = (next) => { hubViewStore.setGroupBy("cowork", next); onClose?.(); };
  const pickSort = (next) => { hubViewStore.setSortBy("cowork", next); onClose?.(); };
  return <>
    <HubOptionSubmenu label={hubMessage(HUB_MESSAGES.groupBy)} options={coworkGroupByOptions()} value={value} onChange={pickGroup}
      disabledValues={coworkGroupByDisabled({ hasProjects })} separatorBefore="none" />
    <HubOptionSubmenu label={hubMessage(HUB_MESSAGES.sortBy)} options={HUB_SORT_OPTIONS} value={view.sortBy} onChange={pickSort} />
    {coworkOffersEmptyGroups(effective) && <>
      <SourceMenu.Separator />
      <MenuRow checked={view.showEmptyGroups} keepOpen onClick={() => hubViewStore.setShowEmptyGroups("cowork", !view.showEmptyGroups)}>
        {hubMessage(HUB_MESSAGES.showEmptyGroups)}</MenuRow>
    </>}
  </>;
}

// ---------------------------------------------------------------- the Cowork buckets (shared-22 bD)

/**
 * The host's groups for the Cowork list (buildSidebarGroups over coworkListPreferences) laid out as bD renders the
 * grouping: none → yD / Nw (one "Recents" list, collapse key "recents"); unread / state / project → gD(iw) / gD(fw) /
 * pD (Bw, flat Nw when no row has a project) over the flat list; date and custom stay the host's mD / vD buckets.
 * `factsOf(session)`: hub-sidebar-model coworkStateKey's facts; `projectIdOf(session)`: the row's local project id.
 */
export function coworkDisplayedGroups(groups, storedGroupBy, { factsOf, projectIdOf, projects = [] } = {}) {
  const groupBy = coworkGroupBy(storedGroupBy);
  if (groupBy === "date" || groupBy === "custom") return groups;
  const pinned = groups.filter((group) => group.kind === "pinned");
  const rest = groups.filter((group) => group.kind !== "pinned").flatMap((group) => group.sessions);
  const recents = () => (rest.length > 0 ? [{ key: "recents", label: hubMessage(HUB_MESSAGES.recents), sessions: rest, kind: "none" }] : []);
  if (groupBy === "unread") return [...pinned, ...coworkUnreadBuckets(rest, factsOf)
    .map((bucket) => ({ ...bucket, label: hubMessage(bucket.label), kind: "cowork-unread" }))];
  if (groupBy === "state") return [...pinned, ...coworkStateBuckets(rest, factsOf)
    .map((bucket) => ({ ...bucket, label: hubMessage(bucket.label), kind: "cowork-state" }))];
  if (groupBy === "project") {
    const { buckets, flat } = coworkProjectBuckets(rest, { projectIdOf, projects });
    if (flat) return [...pinned, ...recents()];
    return [...pinned, ...buckets.map((bucket) => ({ key: bucket.key, sessions: bucket.sessions, kind: "cowork-project",
      label: typeof bucket.label === "string" ? bucket.label : hubMessage(bucket.label), viewProject: bucket.project ?? undefined }))];
  }
  return [...pinned, ...recents()];
}
export { COWORK_STATE_ORDER };

/**
 * Bw's project bucket trailing: shared-21 HQ (Cg) with `"aria-label": formatMessage(zw.viewProject)` — CdsButton
 * (shared-frame Uu) ghost, ArrowUpRight at xs, iconOnly, revealed on the section's hover / focus.
 */
export function CoworkViewProjectButton({ onClick }) {
  return <CdsButton variant="ghost" icon="ArrowUpRight" size="xs" iconOnly aria-label={hubMessage(HUB_MESSAGES.viewProject)} onClick={onClick}
    className="df-chrome-btn df-touch-reveal -my-1 opacity-0 group-data-[hover-within]/section:opacity-100 group-focus-within/labelrow:opacity-100 focus-visible:opacity-100" />;
}

// ---------------------------------------------------------------- the hub multi-selection menu

/**
 * cf259e6ae `m` over hub-sidebar-model hubBulkMenuEntries: Pin / Unpin {count}, Mark {count} as read / unread, Move
 * {count} to group (shared-20 Wx: Folder icon, move-to-group-trigger; Ux rows: the groups as radio rows, Ungrouped after
 * a separator when a selected row is grouped, then New group… (new-custom-group), separated from the groups when there
 * is no Ungrouped), a separator, Archive {count}, Delete {count} (danger). Letter keys (`p`) run while it is open.
 * onRun(action, payload) runs the bulk action; onCreateGroup() opens the new-group dialog for the selection.
 */
export function SourceHubBulkMenu({ entries, customGroups = [], onRun, onCreateGroup, onClose }) {
  const run = (action, payload) => { onClose?.(); onRun(action, payload); };
  const hotkeys = useRef(new Map());
  hotkeys.current = hubBulkHotkeys(entries);
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const handler = (event) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]')) return;
      const action = hotkeys.current.get(event.key.toLowerCase());
      if (!action) return;
      event.preventDefault(); event.stopPropagation();
      runRef.current(action);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);
  const direction = useDirection();
  return <div className="source-session-menu-contents" data-hub-bulk-menu="">
    {entries.map((entry) => {
      if (entry.kind === "separator") return <SourceMenu.Separator key={entry.key} />;
      const label = hubMessage(entry.message, { count: entry.count });
      if (entry.kind === "move") return <SourceMenu.Submenu key="move">
        <SourceMenu.SubmenuTrigger label={label} icon={entry.icon} data-testid={entry.testId}>{label}</SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup side={physicalSide("inline-end", direction)} align="start" label={label}>
          {(customGroups.length > 0 || entry.anyAssigned) && <SourceMenu.Group>
            {customGroups.map((group) => <MenuRow key={group.id} checked={false} checkedRole="radio" labelDir="auto"
              onClick={() => run("move-to-group", { groupId: group.id })}>{group.name}</MenuRow>)}
            {customGroups.length > 0 && entry.anyAssigned && <SourceMenu.Separator />}
            {entry.anyAssigned && <MenuRow checked={false} checkedRole="radio" onClick={() => run("move-to-group", { groupId: null })}>
              {hubMessage(HUB_BULK_MESSAGES.ungrouped)}</MenuRow>}
          </SourceMenu.Group>}
          {customGroups.length > 0 && !entry.anyAssigned && <SourceMenu.Separator />}
          {onCreateGroup && <MenuRow data-testid="new-custom-group" onClick={() => { onClose?.(); onCreateGroup(); }}>{hubMessage(HUB_BULK_MESSAGES.newGroup)}</MenuRow>}
        </SourceMenu.Popup>
      </SourceMenu.Submenu>;
      return <MenuRow key={entry.action} data-testid={entry.testId} icon={entry.icon} shortcut={entry.shortcut} variant={entry.variant}
        onClick={() => run(entry.action)}>{label}</MenuRow>;
    })}
  </div>;
}
