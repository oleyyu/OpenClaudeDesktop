// The Code session list's grouping on Claude Desktop 4.16336.0 (generated/frame-sidebar-nav), host side.
//
// 1. The group scope. The official Sessions section view (Group by / Sort by / Show, New group…) lives in the frame store
//    (cds-core store_shared92_Y) under `codeSidebarByScope[activeGroupScope]`, and every writer (shared-92 Qx / $x, addSection)
//    does nothing while activeGroupScope is null. Officially the claude.ai prefs sync sets it when the signed-in identity resolves
//    (shared-21 onIdentityResolve: `wl(accountUuid, orgUuid)`, shared-92 Hx = `${accountUuid}/${orgUuid}`); that sync is not
//    sliced and the host account has no uuid, so the scope stayed null and Group and sort changed nothing. The host gives the
//    store its own local identity's scope. The scope itself is not persisted (official partialize leaves it out and the
//    migration deletes it); codeSidebarByScope is, so the list's view survives a restart.
//
// 2. Group by › Model (OpenClaude's own grouping, offered while the running core's catalog spans providers: OpenCode's Claude,
//    GPT, Zen and imported providers). The official list knows Date / Status / Folder / Environment / Custom / None only: the
//    Sessions section's stored groupBy is one of those (shared-92 by maps anything else to "date"). So the host keeps the Model
//    choice beside the section view, and five generator boundaries (scripts/extract-frame-sidebar-nav.mjs "Group by › Model")
//    put it in front of the official ones:
//      sessionsSectionGroupBy  shared-39 Tm  the Code list's groupBy: "model" while chosen and offered, else the official read;
//      writeListGroupBy        shared-39 Mm  Group by's onChange: Model sets the choice, any other value clears it first;
//      clearListGroupBy        shared-39 Nm  Reset to defaults: clears it, then the official reset;
//      useGroupByOptions       shared-57 a_  the Group by radio list: the official one, Model after Environment while offered;
//      renderSessionGroups     shared-22 Ck  the list body: Model's provider buckets, else the official renderer table (Sk).
//    A provider bucket is the official SessionBucket (nav-body ET) as the Status grouping draws it (nav-body lk), with the
//    official "New session in {group}" button (shared-57 UA through ET's onNewSession): it starts a new session on that
//    provider's model (main.jsx sidebarNavValue.modelGroups.start). The choice persists in localStorage (the frame store's
//    partialize keeps only its own keys).
//
// Module order: frame-sidebar-nav-body.jsx imports this module after the nav slice (it reads nav exports) and provides these
// answers to the host table (frame-sidebar-nav-host.jsx provideNavGroups), which the boundaries reach only at call time.
import React, { useContext, useMemo } from "react";
import { store_shared92_Y as frameStore } from "./cds-core.mjs";
import { useIntl } from "./frame-sidebar-nav-adapter.mjs";
import { FrameSidebarNavHostContext } from "./frame-sidebar-nav-host.jsx";
import { SessionBucket, SessionListRenderers } from "./generated/frame-sidebar-nav/nav-body.mjs";
import { dm as sessionPresetsOn } from "./generated/frame-sidebar-nav/shared-39.mjs";
import { pB as useStatusGroupingOn } from "./generated/frame-sidebar-nav/shared-55.mjs";
import { Qf as useCustomGroupOverlay } from "./generated/frame-sidebar-nav/shared-140.mjs";
import { Yx as codeSidebarView, py as defaultSectionView, cy as SESSIONS_SECTION } from "./generated/frame-sidebar-nav/shared-92.mjs";
import { listToSectionGroupBy, modelSessionBuckets, sectionToListGroupBy } from "./frame-sidebar-nav-groups-model.mjs";

/** The host's group scope: the official `${accountUuid}/${orgUuid}` form for the one local identity. */
export const LOCAL_GROUP_SCOPE = "local/local";

/** Sets the local group scope on the frame store, and keeps it set. */
export function holdLocalGroupScope(store = frameStore) {
  const hold = (state) => { if (state.activeGroupScope !== LOCAL_GROUP_SCOPE) store.setState({ activeGroupScope: LOCAL_GROUP_SCOPE }); };
  hold(store.getState());
  return store.subscribe(hold);
}

/** Group by › Model's value in the official groupBy vocabulary. */
export const MODEL_GROUP_BY = "model";
// Frame store keys (not in the official partialize, so never persisted by it): the user's choice and whether it is offered.
const CHOSEN = "hostGroupByModel", OFFERED = "hostGroupByModelOffered";
const STORAGE_KEY = "openclaude.codeGroupByModel";
const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/** Loads the saved choice into the frame store (once, at module load). */
export function loadModelGroupChoice(store = frameStore, saved = storage()) {
  store.setState({ [CHOSEN]: saved?.getItem(STORAGE_KEY) === "1", [OFFERED]: store.getState()[OFFERED] === true });
}
function chooseModelGroups(on, store = frameStore, saved = storage()) {
  if (store.getState()[CHOSEN] !== on) store.setState({ [CHOSEN]: on });
  try { if (on) saved?.setItem(STORAGE_KEY, "1"); else saved?.removeItem(STORAGE_KEY); } catch { /* storage full or blocked: the choice lasts this run */ }
}
/** main.jsx's offer (FrameSidebarNavHost effect): Code mode on a core whose catalog spans providers. */
export function offerModelGroups(offered, store = frameStore) {
  if (store.getState()[OFFERED] !== !!offered) store.setState({ [OFFERED]: !!offered });
}

const sessionsSection = (state) => codeSidebarView(state).sections.find((section) => section.id === SESSIONS_SECTION) ?? defaultSectionView(SESSIONS_SECTION);

// shared-39 Tm (read inside the official store selector of Em and by Om): the Code list's groupBy.
export function sessionsSectionGroupBy(state) {
  if (state[CHOSEN] === true && state[OFFERED] === true) return MODEL_GROUP_BY;
  const { groupBy } = sessionsSection(state);
  return groupBy === undefined ? undefined : sectionToListGroupBy(groupBy);
}
// shared-39 Mm: Group by's onChange (shared-57 the Group and sort menu, `ed(t, e)`).
export function writeListGroupBy(mode, value, store = frameStore) {
  const state = store.getState();
  if (mode !== "code") { state.setGroupBy(mode, value); return; }
  if (value === MODEL_GROUP_BY) { chooseModelGroups(true, store); return; }
  chooseModelGroups(false, store);
  if (!sessionPresetsOn() && value !== "environment") state.setGroupBy(mode, value);
  state.setSectionView(SESSIONS_SECTION, { groupBy: listToSectionGroupBy(value) ?? "none" });
}
// shared-39 Nm: Reset to defaults (shared-57 `Ad(t)`).
export function clearListGroupBy(mode, store = frameStore) {
  const state = store.getState();
  if (mode !== "code") { state.clearGroupBy(mode); return; }
  chooseModelGroups(false, store);
  if (!sessionPresetsOn()) state.clearGroupBy(mode);
  state.setSectionView(SESSIONS_SECTION, { groupBy: null });
}
// shared-57 a_: the Code list's Group by options, in the official order and copy; Model after Environment while offered.
export function useGroupByOptions() {
  const intl = useIntl();
  const status = useStatusGroupingOn();
  const overlay = useCustomGroupOverlay();
  const offered = frameStore((state) => state[OFFERED] === true);
  return useMemo(() => [
    ["date", intl.formatMessage({ defaultMessage: "Date", id: "P7PLVjLe4f" })],
    ...(status ? [["state", intl.formatMessage({ defaultMessage: "Status", id: "tzMNF3jWoU" })]] : []),
    ["project", intl.formatMessage({ defaultMessage: "Folder", id: "ukQpDs7M+0" })],
    ["environment", intl.formatMessage({ defaultMessage: "Environment", id: "bYA6fPCd5A" })],
    ...(offered ? [[MODEL_GROUP_BY, intl.formatMessage({ defaultMessage: "Model", id: "openclaude.groupByModel" })]] : []),
    ...(overlay ? [] : [["custom", intl.formatMessage({ defaultMessage: "Custom", id: "Sjo1P44FYy" })]]),
    ["none", intl.formatMessage({ defaultMessage: "None", id: "9/SKZH+1jy" })],
  ], [intl, status, overlay, offered]);
}

// The Model buckets (nav-body lk, the Status grouping's body, with a provider in place of a status): the official bucket per
// provider, the list's header trailing on the first and the group trailing on the rest, each provider's own "New session in".
function ModelSessionGroups({ sessions, truncateAt, onOpen, headerTrailing, groupHeaderTrailing }) {
  const host = useContext(FrameSidebarNavHostContext);
  const intl = useIntl();
  const groups = host?.modelGroups;
  const otherLabel = intl.formatMessage({ defaultMessage: "Other", id: "openclaude.groupByModel.other" });
  const buckets = useMemo(() => modelSessionBuckets(sessions, groups?.models, otherLabel), [sessions, groups?.models, otherLabel]);
  return buckets.map((bucket, index) => (
    <SessionBucket key={bucket.key} bucketKey={`model-${bucket.key}`} label={bucket.label} bucket={bucket.rows} onOpen={onOpen}
      trailing={index === 0 && headerTrailing !== undefined ? headerTrailing : groupHeaderTrailing}
      onNewSession={bucket.provider && groups?.start ? () => groups.start(bucket.provider, bucket.recentModel) : undefined}
      truncateAt={truncateAt} groupMenuKind={truncateAt !== undefined ? "day-or-status" : undefined} />
  ));
}
// shared-22 Ck: the list body for a groupBy (official: the Sk renderer for it, per kind, else the Date one, keyed by groupBy).
export function renderSessionGroups(groupBy, ctx) {
  if (groupBy === MODEL_GROUP_BY && ctx.kind === "code" && ctx.recentRows?.length > 0) {
    return <React.Fragment key={groupBy}><ModelSessionGroups sessions={ctx.recentRows} truncateAt={ctx.truncateAt} onOpen={ctx.onOpen}
      headerTrailing={ctx.headerTrailing} groupHeaderTrailing={ctx.groupHeaderTrailing} /></React.Fragment>;
  }
  // Model with no rows (or outside Code) draws the Date body, whose header still carries Group and sort.
  const official = SessionListRenderers[groupBy === MODEL_GROUP_BY ? "date" : groupBy];
  const render = typeof official === "function" ? official : (official?.[ctx.kind] ?? SessionListRenderers.date);
  return <React.Fragment key={groupBy}>{render(ctx)}</React.Fragment>;
}

/** The five answers frame-sidebar-nav-host.jsx gives the Group by › Model boundaries. */
export const NAV_GROUP_ANSWERS = { sessionsSectionGroupBy, writeListGroupBy, clearListGroupBy, useGroupByOptions, renderSessionGroups, offerModelGroups };
