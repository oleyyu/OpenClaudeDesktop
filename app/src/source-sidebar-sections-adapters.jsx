// Host answers for the imports scripts/extract-sidebar-sections.mjs maps to this module (work item
// sidebar-sections-extract, research/sidebar-sections.md WI-1). The sections model, copy, label row, section view menu,
// header menu, disabled reasons and new-section dialog are the original 2.42304.0 bindings in
// src/generated/sidebar-sections; this module only supplies what those chunks read from the desktop frame store,
// GrowthBook, the account, telemetry, the sidebar row registry and the CDS pieces view-tabs does not (yet) name.
// Each export names the original binding it stands in for.
//
// Nothing here re-creates a view-tabs context or component. Since R3-sections step 3 (D24) the CDS Tooltip, Dropdown
// with its detached-trigger handle (Menu.createHandle), Dialog, TextInput and the CDS root are the view-tabs public names
// (CdsTooltip, CdsDropdown, CdsMenuCreateHandle, CdsDialog, CdsTextInput, CdsRoot), imported by the generated modules
// directly (scripts/extract-sidebar-sections.mjs externals). Since R4g-sidebar SB3 the context menu is view-tabs'
// too: SidebarContextMenu (shared-frame iD) is CdsContextMenu itself, its rows code-current's sidebar menu rows over the
// CDS Dropdown parts (source-sidebar-menu-kit.jsx). One CDS answer stays here, over the host SourceMenu:
//   - SidebarSectionsMenu (shared-frame EC) for move-to-menu.mjs only: shared-20 wx is the row menu's Move to submenu,
//     and the host row menu is SourceMenu.
import React, { useCallback, useSyncExternalStore } from 'react';
import { SourceMenu } from './source-menu.jsx';
import { CdsContextMenu } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { create } from './generated/sidebar-sections/zustand.mjs';
import { sectionsStoreActions, selectCodeSidebar, customGroupKeyPrefix } from './generated/sidebar-sections/sections-model.mjs';
import { sidebarSectionsStoreSlice } from '../electron/sidebar-sections-store.mjs';

// ---------------------------------------------------------------- react-intl (vendor-intl q / Gt)
// useIntl / FormattedMessage over the local catalog (English message looked up in zh-CN by t()).
export { useStartIntl as useIntl, StartMessage as FormattedMessage } from './source-code-start-adapters.jsx';
// shared-52 G read by shared-52 ih (sidebar hidden): the frame store the width handle already answers.
export { useSidebarFrameStore } from './source-sidebar-resize-adapters.jsx';

// ---------------------------------------------------------------- shared-52 G (exported `If`): the frame store
// The official store is one module-level zustand store; these chunks read its sections / custom-group slice, the
// overflow-menu flag, `hovering` and `resolvedMode`, as a hook (`U(selector)`) and statically (`U.getState()`). The host
// store is the original zustand `create` (generated/sidebar-sections/zustand.mjs) over the original store actions
// (sectionsStoreActions: addCustomGroup … assignToSection, setOverflowMenuOpen, verbatim from the shared-52 creator).
// Host differences: the scope is the fixed "local" (no account / organization: `${accountUuid}/${orgUuid}` officially);
// the mode is always "code" (this host's sidebar is the Code sidebar); there is no hover peek, so `hovering` stays false;
// persistence (official dframe-store localStorage + account sync) is the host's config.json via the sidebar-state IPC
// (electron/sidebar-sections-store.mjs): hydrateSidebarSectionsStore below loads a sidebar-state snapshot into it, and the
// sidebar sends section changes as sidebar-state requests (main.jsx sectionAction); the sections layout
// (source-sidebar-sections.jsx useSidebarSectionsHost) mounts both.
export const SIDEBAR_SECTIONS_SCOPE = 'local';
// R3-sections (sidebar-sections-layout): the original chunks call the store actions directly (dx addCustomGroup, yx
// renameCustomGroup / deleteCustomGroup, tO / aO setSectionView, iO moveSection, the drag's assignToCustomGroup). Each
// bridged action still runs the original action on this store (so its return value and the store's own follow-ups --
// keepGroupWhileEmpty for a new section, Rp's inherited view -- are the official ones), and the outermost bridged call
// then sends the change to main as the matching sidebar-state request (connectSidebarSectionActions: SourceSidebar's
// onSectionAction). Main is the source of truth: the sidebar renders main's snapshot and hydrates this store from it
// again when the answer comes back (hydrateSidebarSectionsStore), so whatever main decided replaces the local result.
// addCustomGroup proposes its `cg-<uuid>` to main, so the group kept while empty is the group main stores.
let sectionActionHandler = null;
export function connectSidebarSectionActions(handler) {
  sectionActionHandler = handler;
  return () => { if (sectionActionHandler === handler) sectionActionHandler = null; };
}
const sectionById = (state, id) => selectCodeSidebar(state).sections.find(section => section.id === id);
// action -> (arguments, result, state before) -> [sidebarSectionRequest action, payload] | falsy (nothing to send).
const BRIDGED_SECTION_ACTIONS = Object.freeze({
  addCustomGroup: ([name], group) => group && ['add', { name, id: group.id }],
  addSection: ([name], section) => section && ['add', { name, id: section.id }],
  renameCustomGroup: ([id, name]) => ['rename', { id, name }],
  renameSection: ([id, name], done) => done && ['rename', { id, name }],
  deleteCustomGroup: ([id]) => ['delete', { id }],
  deleteSection: ([id], done) => done && ['delete', { id }],
  moveSection: ([id, index]) => ['move', { id, index }],
  setSectionView: ([id, view]) => ['view', { id, view }],
  assignToCustomGroup: ([key, sectionId]) => ['assign', { keys: [key], sectionId }],
  assignToSection: ([keys, sectionId], done) => done && ['assign', { keys: [...keys], sectionId }],
  // expandGroup(um(id)) also opens the section (shared-52 `t.startsWith(lm) ? km(… Ip(…, {collapsed: !1}))`).
  expandGroup: ([key], _result, before) => typeof key === 'string' && key.startsWith(customGroupKeyPrefix)
    && sectionById(before, key.slice(customGroupKeyPrefix.length))?.collapsed === true
    && ['view', { id: key.slice(customGroupKeyPrefix.length), view: { collapsed: false } }],
});
let bridgedDepth = 0;
function bridgeSectionActions(actions, get) {
  const bridged = { ...actions };
  for (const [name, request] of Object.entries(BRIDGED_SECTION_ACTIONS)) {
    const original = actions[name];
    bridged[name] = (...args) => {
      const before = get();
      bridgedDepth += 1;
      let result;
      try { result = original(...args); } finally { bridgedDepth -= 1; }
      // addSection → addCustomGroup, renameSection → renameCustomGroup …: only the outermost call is the user's change.
      if (bridgedDepth === 0 && sectionActionHandler) {
        const entry = request(args, result, before);
        if (entry) sectionActionHandler(entry[0], entry[1]);
      }
      return result;
    };
  }
  return bridged;
}
export const useSidebarSectionsStore = create((set, get) => ({
  activeGroupScope: SIDEBAR_SECTIONS_SCOPE,
  resolvedMode: 'code',
  hovering: false,
  overflowMenuOpen: false,
  groupByByMode: {},
  sortByByMode: {},
  collapsedGroups: [],
  groupsKeptWhileEmpty: [],
  customGroupsByScope: {},
  codeSidebarByScope: {},
  ...bridgeSectionActions(sectionsStoreActions(set, get), get),
}));
// The persisted slice (customGroupsByScope / codeSidebarByScope / collapsedGroups, scope "local") from a sidebar-state
// snapshot; metadata: the sidebar's session metadata (Codex sections included) for the manual sections' members.
// groupsKeptWhileEmpty and overflowMenuOpen stay as they are: officially they are not persisted either.
export function hydrateSidebarSectionsStore(snapshot, { metadata } = {}) {
  useSidebarSectionsStore.setState(sidebarSectionsStoreSlice(snapshot, { metadata }));
}
// R3-sections: groupsKeptWhileEmpty for the host sidebar (KO keeps a new, still empty section listed). Plain
// useSyncExternalStore, so a host component needs no zustand hook of its own.
const keptWhileEmpty = () => useSidebarSectionsStore.getState().groupsKeptWhileEmpty;
export function useSectionsKeptWhileEmpty() {
  return useSyncExternalStore(useSidebarSectionsStore.subscribe, keptWhileEmpty, keptWhileEmpty);
}

// ---------------------------------------------------------------- gates (GrowthBook / account), D10
// shared-16 Pp (exported `et`): `{overlayEnabled: e || t, environments: e}` with e = the presets gate. D10: on.
const overlayGate = Object.freeze({ overlayEnabled: true, environments: true });
export function useSidebarOverlayGate() { return overlayGate; }
// shared-11 rc (exported `Ya`): `claudeai_cc_epitaxy_session_presets_main` (latched). D10: on.
export function usePresetsGate() { return true; }
// shared-11 ic (exported `Ja`, shared-16 Oi under qf): the same gate read outside render (the Sessions writers ip / op / ap
// skip the legacy groupByByMode / sortByByMode while it is on). D10: on.
export function presetsGateNow() { return true; }
// shared-25 ml (exported `Rm`): running inside the Claude desktop app. This host is the desktop app.
export function useIsDesktopApp() { return true; }
// shared-19 e2 (exported `wr`): GrowthBook `claudeai_session_state` && account `ccr_session_state_buckets` (default true).
// The host groups by status (sidebar-model state buckets), so Status is offered.
export function useStatusGrouping() { return true; }
// shared-19 qX: `!inPayload || on` for `__gb__873492543`; without GrowthBook the flag is not in the payload -> true.
export function useArchiveAllEnabled() { return true; }
// shared-25 Z (exported `lr`): the current account. There is no account here.
const noAccount = Object.freeze({ account: null });
export function useCurrentAccount() { return noAccount; }
// shared-16 of (exported `en`): an agent-owned session counts as yours when it was started by this account. Without
// accounts no session is agent-owned by anyone, so the answer is always no (UX then never exempts one).
export function isStartedByAccount() { return false; }

// ---------------------------------------------------------------- telemetry (D17: not migrated)
// shared-8 iv (exported `Bl`): claudeai.epitaxy.sidebar.section_changed.
export function trackSectionChange() {}
// shared-16 dp (exported `ft`): claudeai.epitaxy.sidebar.custom_group_changed.
export function trackCustomGroupChange() {}
// shared-52 EO (exported `Zo`): the analytics client ({track}).
const analytics = Object.freeze({ track() {} });
export function useAnalytics() { return analytics; }

// ---------------------------------------------------------------- shared-6 row registry and selection
// Officially every sidebar row registers itself (rows by key, keys by bucket, visible keys in list order) and the
// multi-select store lives beside them. The host's sidebar owns its rows; it hands them over with
// setSidebarRowRegistry (sidebar-sections-layout.mjs sectionsRowRegistry), and connects its own bulk selection with
// connectSidebarSelection (source-sidebar-sections.jsx useSidebarSectionsHost).
const rowRegistry = { buckets: new Map(), rows: new Map(), visible: [], open: new Set() };
/** buckets: Map<bucketKey, key[]>; rows: Map<key, {ref, isPinned, isArchived, isAgentOwned, startedByAccountId, codeRef}>;
 * visible: key[] in list order; open: keys open in a pane / popout / the current route. */
export function setSidebarRowRegistry({ buckets, rows, visible, open } = {}) {
  if (buckets) rowRegistry.buckets = buckets;
  if (rows) rowRegistry.rows = rows;
  if (visible) rowRegistry.visible = visible;
  if (open) rowRegistry.open = open;
}
// shared-6 uO (exported `bo`): the keys a bucket shows.
export function sidebarBucketKeys(bucketKey) { return rowRegistry.buckets.get(bucketKey); }
// shared-6 mO (exported `Co`): the visible keys, in list order.
export function sidebarVisibleKeys() { return [...rowRegistry.visible]; }
// shared-6 aO (exported `xo`): a row's record.
export function sidebarRowRecord(key) { return rowRegistry.rows.get(key); }
// shared-6 iO (exported `So`): every registered row key (the blank-area Select all's "Expand a section…" test). Officially
// the rows a folded bucket keeps in its hidden container are registered too; the host's registry holds every row of every
// bucket, folded or behind Show more (a row cut by Show more is not mounted, so not registered, officially).
export function sidebarRowKeys() { return [...rowRegistry.rows.keys()]; }
// shared-19 PX: keys that must not be archived from a group (open in a pane, a popout, or the current route).
export function sidebarOpenSessionKeys() { return new Set(rowRegistry.open); }
// shared-11 Zu (exported `ji`): how many sessions deleting a group releases. Officially a nested family counts its
// members too; the host's custom groups hold rows by key, so this counts the assigned keys.
export function countGroupSessions(assignments, groupId) {
  return Object.values(assignments).filter(value => value === groupId).length;
}
// shared-6 PD (exported `Lo`): the multi-select store (aZ Select all calls setSelection).
let selectionHandler = null;
export const useSidebarSelectionStore = create(set => ({
  selectedKeys: new Set(),
  setSelection: keys => { set({ selectedKeys: new Set(keys) }); selectionHandler?.([...keys]); },
  clear: () => { set({ selectedKeys: new Set() }); selectionHandler?.([]); },
}));
export function connectSidebarSelection(handler) {
  selectionHandler = handler;
  return () => { if (selectionHandler === handler) selectionHandler = null; };
}
// shared-19 YX (exported `ka`): the bulk archive / delete flow (confirmation, worktree checks, core calls). The host's
// own flow (main.jsx bulk archive with its worktree dialog) is connected here; officially the flow's confirmation for
// Archive all is UY ("Archive all sessions in “{groupName}”?").
let bulkArchive = null;
export function connectSidebarBulkArchive(handler) {
  bulkArchive = handler;
  return () => { if (bulkArchive === handler) bulkArchive = null; };
}
export function useSidebarBulkArchive(setConfirmOpen) {
  return useCallback(async (action, keys, options) => { await bulkArchive?.({ action, keys, options, setConfirmOpen }); }, [setConfirmOpen]);
}

// ---------------------------------------------------------------- the blank-area menu's New environment (R3-sections WI-4)
// shared-21 bB `d = () => { Qg(s, l.code); lB(); }`: reset the composer draft and go to the Code page (shared-20 ST over
// the shared-16 zm navigator and the shared-78 wq routes), then ask for a new environment (shared-21 lB: the lazily
// loaded environment dialog's requestNewEnvironment). The host's answers: its own "New session" (main.jsx
// openInFocusedSide(null): a draft in the focused side) and its saved-environment editor (main.jsx
// editSavedEnvironment), connected by the sidebar (connectSidebarBlankArea).
let blankAreaHost = null;
export function connectSidebarBlankArea(handlers) {
  blankAreaHost = handlers;
  return () => { if (blankAreaHost === handlers) blankAreaHost = null; };
}
/** shared-16 zm (exported `E`): the sidebar's navigator, `(route) => …`. */
export function useSidebarNavigate() { return navigateSidebar; }
function navigateSidebar(route) { if (route === CODE_HOME_ROUTE) blankAreaHost?.newSession?.(); }
const CODE_HOME_ROUTE = 'code';
const homeRoutes = Object.freeze({ code: CODE_HOME_ROUTE });
/** shared-78 wq (exported `Lr`): the home route of each mode; the host's Code home is a new draft session. */
export function useHomeRoutes() { return homeRoutes; }
/** shared-20 ST (exported `Tn`): `xT(); setDraftCustomGroupId(n); Ad(); e(t, r)`. The host's new session starts its own
 * empty draft (no draft custom group), so this is the navigation alone. */
export function startCodeDraft(navigate, route) { navigate(route); }
/** shared-21 lB: request the new-environment dialog. */
export function requestNewEnvironment() { blankAreaHost?.newEnvironment?.(); }

// ---------------------------------------------------------------- shared-frame EC (exported `qa`), move-to-menu.mjs only
// The row menu's Move to submenu (shared-20 wx / Cx) over the host SourceMenu the host row menu is made of: Submenu,
// SubmenuTrigger, Popup, Group, Separator and Item are SourceMenu's (prop-compatible: checked, checkedRole, keepOpen,
// disabled, ReactNode disabledReason / hint since R3-menu, D25). The section view menus (shared-22 eO / tO) and the
// session-list Group and sort render the real CdsDropdown (view-tabs) instead.
const MenuItem = SourceMenu.Item;
export const SidebarSectionsMenu = Object.freeze({ ...SourceMenu, Item: MenuItem });

// ---------------------------------------------------------------- shared-frame iD (exported `Ii`): the CDS ContextMenu
// R4g-sidebar SB3 (X7-06): the section header menu (shared-20 yx, `Ii as Vs`), the reorder menu (shared-19 g$, `Ii as
// Rf`) and the blank-area menu (shared-21 _B, `Ii as uf`) run on the real CDS ContextMenu, view-tabs CdsContextMenu
// (Base UI ContextMenu Root / Trigger, the CDS Popup with data-cds="ContextMenu" in the CDS portal). Their rows are
// code-current's sidebar menu rows, which render as that menu's own Base UI items (EC.Item / Separator / Group,
// source-sidebar-menu-kit.jsx). Trigger semantics are Base UI's: the consumer's onContextMenu runs first and may call
// event.preventBaseUIHandler() (yx's gx), the open change carries Base UI's event details (_B compares the event with
// the press it remembered), the cursor anchor uses the positioner's context-menu offsets, and a touch long-press opens it.
// Host difference: none left in the menu itself; the former host Popup also skipped a right-click that React bubbled
// up from a portaled popup to an enclosing trigger, which Base UI's trigger does not do (official behaviour now).
export const SidebarContextMenu = CdsContextMenu;
