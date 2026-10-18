import {sidebarDescendingComparators,sidebarAscendingComparators} from './generated/code-current/sidebar-sort-order.mjs';
import {sidebarCreatedTimestamp} from './generated/code-current/sidebar-sort-model.mjs';

// Original comparators receive unified timestamps; adapt only local field names.
export function sidebarSortRecord(session, updatedAt, createdAt) {
  return {title:session.name??session.title??null,updatedAtMs:updatedAt,createdAtMs:createdAt};
}
export function currentSidebarComparator(sortBy, ascending, record) {
  const compare=(ascending?sidebarAscendingComparators:sidebarDescendingComparators)[sortBy]??sidebarDescendingComparators.recency;
  return (a,b)=>compare(record(a),record(b));
}
export const currentSidebarCreatedAt=sidebarCreatedTimestamp;

// R3-sections step 3 (WI-5): 2.42304.0 shared-21 oU in its sessionList layout (pure parts; source-sidebar-filter-current.jsx).
/** oU `dt = ut !== lt || l !== "recency" || Ee || (de && W !== !1)`: the shown group-by is not the default one, the sort is
 * not recency, the stored ascending is on, or (de: always in the session list) Empty groups is on. sU's Reset is disabled
 * with "Grouping and sorting are already at their defaults." while this is false. */
export function sessionListNotAtDefaults({shown,fallback,sortBy,ascending,emptyGroups,emptyGroupsAvailable=true}) {
  return shown!==fallback||sortBy!=='recency'||ascending===true||(emptyGroupsAvailable&&emptyGroups!==false);
}
/** oU ft, as steps in its order: `l !== "recency" && rt("recency")`, `Ee && l !== "alpha" && at(!1)`, `W !== !1 && qe()`,
 * `ut !== lt && a?.(t.detail === 0)` (regroup), then `oS(e)` (ap: the Sessions group-by cleared, always). */
export function sessionListResetSteps({shown,fallback,sortBy,ascending,emptyGroups}) {
  return {sortBy:sortBy!=='recency'?'recency':null,descending:ascending===true&&sortBy!=='alpha',emptyGroupsOff:emptyGroups!==false,regroup:shown!==fallback};
}

// R4i-sidebar SI3 (sidebar-17): oU's Show › Routines item, as 2.42304.0 decides it (shared-21 oU locals):
//   [ne, re] = dS()      shared-16 Zf: [the routines section's `shown` (Gf(e, cn)), Xf = setSectionView(cn, {shown})];
//   ie = GH(ne)          shared-21 GH: `(codeEnabled || !ccdGateSettled) && (mc(org) || ne)`, mc = shared-52 Uh
//                        (navHasCodeRoutinesByOrg[org], which wG sets while the org has an enabled Code routine);
//   r && ie && !ae ? oe(!0) : !r && ae && oe(!1)   the latch `ae`: once offered while open, the item stays until close;
//   se = ie || r && ae   the item is drawn; Xe toggles ne (and sends show_routines, D17: not sent).
// The item shows and hides the routines section (shared-21 WY / gY / $Y over dX rows, kept in the sidebar only while
// fx().shown). The host has no Code routines section in its sidebar yet, so SessionListFilterMenu does not offer the
// item (CODE_ROUTINES_SECTION_HOST): a toggle with nothing to show or hide would be a dead control.
export const CODE_ROUTINES_SECTION_HOST=false;
/** shared-21 GH(ne). */
export function routinesItemOffered({codeEnabled=true,gateSettled=true,hasCodeRoutines=false,shown=false}={}) {
  return (codeEnabled||!gateSettled)&&(hasCodeRoutines||shown);
}
/** oU's latch `ae` after a render: `r && ie && !ae` sets it, `!r && ae` clears it. */
export function nextRoutinesLatch(open,offered,latched) {
  if(open&&offered&&!latched) return true;
  if(!open&&latched) return false;
  return latched;
}
/** oU `se = ie || r && ae`. */
export function routinesItemShown({open=false,offered=false,latched=false}={}) {
  return offered||(open&&latched);
}

/**
 * shared-21 HQ({facts, onViewAll}) → KH: `value: i ? t : a` with i = LQ(facts, r) and a = RQ(facts, r) ? "loading" : null.
 * The host's list is local (cloudPossible false), so LQ is `listSettled && (archivedInHand || filtered)` and RQ is
 * `facts === undefined || !listSettled`. `archivedInHand`: an archived session is among the listed ones (Gb); `filtered`:
 * a non-default list filter (shared-20 Gr; the sections layout has none: its status is fixed to active). View all opens
 * the host's Sessions page; without one there is nothing to offer (null).
 */
export function sidebarViewAllValue(facts) {
  if(facts===undefined) return 'loading';
  const {onViewAll,listSettled=true,archivedInHand=false,filtered=false}=facts;
  if(listSettled&&(archivedInHand||filtered)) return typeof onViewAll==='function'?onViewAll:null;
  return listSettled?null:'loading';
}

/** shared-20 Gx's answer over the families' parent ids: whether any family is shown (anyShown) or folded (anyHidden). */
export function sidebarNestedAvailability(parentIds,collapsed) {
  const closed=new Set(collapsed),ids=[...new Set(parentIds)];
  return {anyShown:ids.some(id=>!closed.has(id)),anyHidden:ids.some(id=>closed.has(id))};
}
/**
 * shared-20 _S: `_t("hide_all_nested_sessions", t.anyShown ? n : void 0)`, `_t("show_all_nested_sessions", t.anyHidden ?
 * r : void 0)` with n / r = Lx(!0 / !1, "palette"): fold every family (setFamiliesCollapsed(Nx(), true)) / unfold the
 * folded ones. `parentIds`: the listed families' parents (pinned rows excluded, as Gx(statusFilter, starredIds) does);
 * `setCollapsed(ids)`: the sidebar's collapsedNested writer.
 */
export function sidebarNestedCommands(parentIds,collapsed,setCollapsed) {
  const ids=[...new Set(parentIds)],folded=[...new Set(collapsed)];
  return {...sidebarNestedAvailability(ids,folded),
    onHideAll:()=>setCollapsed([...new Set([...folded,...ids])]),
    onShowAll:()=>setCollapsed([])};
}
