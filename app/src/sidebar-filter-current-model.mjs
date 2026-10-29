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

// R3-sections step 3 (WI-5): shared-21 oU in its sessionList layout (pure parts; source-sidebar-filter-current.jsx); 3.6556.2
// (w4-sidebar-filter) shared-21 PJ, the same menu, whose locals are named in brackets.
/** oU `dt = ut !== lt || l !== "recency" || Ee || (de && W !== !1)` [PJ `Zt = Xt !== Yt || f !== "recency" || De || (ce && Y
 * !== !1)`]: the shown group-by is not the default one, the sort is not recency, the stored ascending is on, or (de / ce:
 * always in the session list) Empty groups is on. sU's [UJ's] Reset is disabled with "Grouping and sorting are already at
 * their defaults." while this is false. */
export function sessionListNotAtDefaults({shown,fallback,sortBy,ascending,emptyGroups,emptyGroupsAvailable=true}) {
  return shown!==fallback||sortBy!=='recency'||ascending===true||(emptyGroupsAvailable&&emptyGroups!==false);
}
/** PJ Qt, as steps in its order: `f !== "recency" && Ht("recency")`, `De && f !== "alpha" && Wt(!1)`, `Y !== !1 && Mt()`,
 * `Xt !== Yt && kt("group_by", Yt)` (telemetry only, D17), then `tC(t)` (the Sessions group-by cleared, always). 2.42304.0
 * oU's ft also asked for a keyboard regroup there (`ut !== lt && a?.(t.detail === 0)`); 3.6556.2 has no regroup step: its
 * Group by keeps the menu open, and the list host (rY) keeps it anchored where it opened instead (SB-26). */
export function sessionListResetSteps({sortBy,ascending,emptyGroups}) {
  return {sortBy:sortBy!=='recency'?'recency':null,descending:ascending===true&&sortBy!=='alpha',emptyGroupsOff:emptyGroups!==false};
}

// w4-sidebar-filter (SB-02, E17): 3.6556.2 shared-21 GJ lists Date / [Status] / Folder (project) / Environment (environment:
// sessions bucketed by the saved environment they were started in) / [Custom] / None. Grouping by Environment buckets the
// Sessions list by saved environment (savedEnvironmentGroups below, sidebar-model.js buildSidebarGroups' environment
// branch; w4-sidebar-filter review fix), so the host offers it (true). The switch stays for a host without saved
// environments: an Environment radio that grouped by folder would be a dead control.
export const SAVED_ENVIRONMENT_GROUPS_HOST=true;
/** GJ's options as the session list menu offers them: `environment` only while the host buckets by saved environment. */
export function sessionListGroupOptions(options,{savedEnvironmentGroups=SAVED_ENVIRONMENT_GROUPS_HOST}={}) {
  return savedEnvironmentGroups?options:options.filter(([value])=>value!=='environment');
}

/** shared-22 BE / VE and the host's bucket-key form (`project:` like its folder buckets; officially `project-`). */
export const PRESET_BUCKET_PREFIX='preset::', PLACE_BUCKET_PREFIX='kind::';
const trimTrailingSeparators=(value)=>value.replace(/[/\\]+$/,'');
/** shared-22 rE: older environment first, then by id. */
const olderEnvironment=(a,b)=>a.createdAt-b.createdAt||(a.id<b.id?-1:+(a.id>b.id));
/** shared-22 vE: the most counted key (the first one on a tie). */
function mostCounted(counts) {
  let best, most=0;
  for(const [key,count] of counts) if(count>most) { best=key; most=count; }
  return best;
}
/** shared-18 dU (shared-22 Mc): numeric collation, then code points. */
const labelCollator=new Intl.Collator(undefined,{numeric:true});
const compareLabels=(a,b)=>a===b?0:labelCollator.compare(a,b)||(a<b?-1:1);

/**
 * 3.6556.2 shared-22 OE's Sessions buckets while grouping by Environment (`groupByEnvironment`, F = SE(catalog, _E, LL)),
 * over the host's saved environments (electron/saved-environments.mjs: local targets only, so SSH (D37) and cloud never
 * arise). `rows`: the unpinned rows in list order. `place(row)`: `{cwd, projectKey, owned, name, extra}` -- the host's
 * folder identity of the row (sidebar-model.js projectKey / projectName; projectKey null for the host's Other, i.e. no
 * repo; owned: a repo with an owner, official dE's `{projectKey}` without `ran`; extra: the disambiguation).
 *   1. SE: the environment the row was started in (LL: main's sessionMetadata[id].environmentId, the host's bySessionId),
 *      else _E: the oldest saved environment whose place is the row's folder (`local:${wslDistro ?? ""}:${cwd}` both
 *      sides, trailing separators trimmed); a local / SSH one (xE) gives a {saved} group, otherwise bE: {folder} by
 *      project key, or {unsaved} (no project key: the place bucket "This computer", XE → shared-46 zL).
 *   2. yE: a folder group of an owned repo goes to the local environment whose rows are mostly in that repo (vE, the
 *      older environment on a tie of repos).
 *   3. JE: saved buckets (label: the environment's name) and folder buckets (the folder label) sorted together by label
 *      (Mc), a folder after a saved one of the same label (`$T.indexOf(ran.kind)`), then by key; Yj over the stored order
 *      with Xj (an unranked bucket whose legacyOrderKey -- a saved one's most counted repo, a folder's own key -- is
 *      stored goes right after it); unranked ones keep the label order. Then YE's place bucket.
 * Buckets: saved `{key: 'project:preset::<id>', kind: 'environment', environmentId, environment, orderKey, label,
 * sessions}` (no cwd: its new-session and header menu are the preset group's, not a folder's); folder `{key:
 * 'project:<projectKey>', kind: 'project', projectKey, cwd, label, sessions}` as the folder grouping has them; place `{key:
 * 'project:kind::local', kind: 'project', projectKey: otherProjectKey, unsaved: {kind: 'local'}, plainHeading: true, label, sessions}`.
 * Empty saved environments and archived-only ghosts (OE `_`) do not show, as officially without hidden rows.
 */
export function savedEnvironmentGroups(rows,{environments=[],environmentIdOf=()=>undefined,place,projectOrder=[],otherProjectKey,thisComputer='This computer'}={}) {
  const saved=environments.filter(row=>row&&typeof row.id==='string'&&(row.target?.kind==='local'||row.target?.kind==='ssh'));
  const byId=new Map(saved.map(row=>[row.id,row]));
  const placeKey=(cwd,distro)=>`local:${distro??''}:${trimTrailingSeparators(cwd)}`;
  const byPlace=new Map();
  for(const row of saved) {
    if(row.target.kind!=='local'||typeof row.target.cwd!=='string'||!row.target.cwd) continue;
    const key=placeKey(row.target.cwd,row.target.wslDistro);
    byPlace.set(key,[...(byPlace.get(key)??[]),row]);
  }
  for(const list of byPlace.values()) list.sort(olderEnvironment);
  const entries=rows.map(row=>{
    const where=place(row);
    const id=environmentIdOf(row);
    const environment=(typeof id==='string'?byId.get(id):undefined)
      ??(typeof where.cwd==='string'&&where.cwd?byPlace.get(placeKey(where.cwd))?.[0]:undefined);
    const group=environment?{kind:'saved',environment}:where.projectKey?{kind:'folder',projectKey:where.projectKey,owned:where.owned===true}:{kind:'unsaved'};
    return {row,where,group};
  });
  // yE: per local environment, its most counted repo; the older environment wins a repo.
  const repoCounts=new Map();
  for(const {where,group} of entries) {
    if(group.kind!=='saved'||!where.projectKey) continue;
    const counts=repoCounts.get(group.environment)??new Map();
    repoCounts.set(group.environment,counts.set(where.projectKey,(counts.get(where.projectKey)??0)+1));
  }
  const ownerOfRepo=new Map();
  for(const [environment,counts] of repoCounts) {
    const repo=mostCounted(counts), held=repo===undefined?undefined:ownerOfRepo.get(repo);
    if(repo!==undefined&&environment.target.kind==='local'&&(!held||olderEnvironment(environment,held)<0)) ownerOfRepo.set(repo,environment);
  }
  // KE: one bucket per group, with the repos of its rows counted (legacyKeys).
  const buckets=new Map();
  for(const {row,where,group:found} of entries) {
    const owner=found.kind==='folder'&&found.owned?ownerOfRepo.get(found.projectKey):undefined;
    const group=owner?{kind:'saved',environment:owner}:found;
    const key=group.kind==='saved'?`project:${PRESET_BUCKET_PREFIX}${group.environment.id}`
      :group.kind==='folder'?`project:${group.projectKey}`:`project:${PLACE_BUCKET_PREFIX}local`;
    let bucket=buckets.get(key);
    if(!bucket) buckets.set(key,bucket={key,group,rows:[],repos:new Map(),cwd:where.cwd,name:where.name,extra:where.extra});
    bucket.rows.push(row);
    if(where.projectKey) bucket.repos.set(where.projectKey,(bucket.repos.get(where.projectKey)??0)+1);
  }
  // The folder label, as the folder grouping names it: a name two folders share gets ' · ' and its disambiguation.
  const names=new Map();
  for(const bucket of buckets.values()) if(bucket.group.kind==='folder') names.set(bucket.name,(names.get(bucket.name)??0)+1);
  const named=[];
  for(const bucket of buckets.values()) {
    const {group}=bucket;
    if(group.kind==='saved') named.push({key:bucket.key,label:group.environment.name,sessions:bucket.rows,kind:'environment',
      environmentId:group.environment.id,environment:group.environment,orderKey:`${PRESET_BUCKET_PREFIX}${group.environment.id}`,
      legacyOrderKey:mostCounted(bucket.repos),ranIndex:-1});
    else if(group.kind==='folder') {
      const extra=names.get(bucket.name)>1?bucket.extra:null;
      named.push({key:bucket.key,projectKey:group.projectKey,label:extra?`${bucket.name} · ${extra}`:bucket.name,cwd:bucket.cwd,
        sessions:bucket.rows,kind:'project',orderKey:group.projectKey,legacyOrderKey:group.owned?undefined:group.projectKey,ranIndex:0});
    }
  }
  named.sort((a,b)=>compareLabels(a.label,b.label)||a.ranIndex-b.ranIndex||(a.key<b.key?-1:1));
  // Xj then Yj over the stored order (the host's projectOrder; its `ccg::` keys name no bucket here).
  const stored=(Array.isArray(projectOrder)?projectOrder:[]).filter(key=>typeof key==='string');
  let order=stored;
  if(stored.length) {
    const has=new Set(stored), after=new Map();
    for(const bucket of named) if(bucket.legacyOrderKey&&!has.has(bucket.orderKey)&&has.has(bucket.legacyOrderKey))
      after.set(bucket.legacyOrderKey,[...(after.get(bucket.legacyOrderKey)??[]),bucket.orderKey]);
    if(after.size) order=stored.flatMap(key=>[key,...(after.get(key)??[])]);
  }
  const rank=new Map(order.map((key,at)=>[key,at]));
  const ranked=order.length?[...named].sort((a,b)=>(rank.get(a.orderKey)??Infinity)-(rank.get(b.orderKey)??Infinity)):named;
  const groups=ranked.map(({legacyOrderKey,ranIndex,...bucket})=>bucket);
  const placed=buckets.get(`project:${PLACE_BUCKET_PREFIX}local`);
  // W12: IE wraps a place bucket in `o(FE,{mark:"plainHeading",children:je})`; shared-21's row then draws the folder-only
  // line (`e=r.plainHeading===!0&&!r.metadata&&!i`, A_ `folderOnly:e`), read by sidebar-details-current-model.mjs.
  if(placed) groups.push({key:placed.key,projectKey:otherProjectKey,unsaved:{kind:'local'},plainHeading:true,label:thisComputer,sessions:placed.rows,kind:'project'});
  return groups;
}

/** shared-21 ZJ: the opening trigger frozen as a virtual anchor (its rect at the moment the menu opened). */
export function frozenTriggerAnchor(element) {
  const rect=element.getBoundingClientRect();
  return {contextElement:element,getBoundingClientRect:()=>rect};
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
