import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {dictionary} from '../electron/i18n/index.mjs';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {buildSidebarGroups,normalizeSidebarPreferences,buildNestedRuns} from '../src/sidebar-model.js';
import {sidebarCreatedTimestamp,compareSidebarTitle} from '../src/generated/code-current/sidebar-sort-model.mjs';
import {sessionListNotAtDefaults,sessionListResetSteps,sidebarNestedAvailability,sidebarNestedCommands,sidebarViewAllValue} from '../src/sidebar-filter-current-model.mjs';
import {physicalSide} from '../src/generated/sidebar-resize/logical-side.mjs';

// D21: view-tabs' preload-helper (shared-frame) calls document.createElement while it evaluates.
const documentStub={createElement:()=>({relList:{supports:()=>false}}),documentElement:{dir:'ltr',getAttribute:()=>null,hasAttribute:()=>false}};
let server,Host,Controls,View,Options,Menu,Sections,Mode,Sidebar,savedDocument;
before(async()=>{
  savedDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  if(!globalThis.document)Object.defineProperty(globalThis,'document',{value:documentStub,configurable:true,writable:true});
  server=await createServer({configFile:false,root:new URL('..',import.meta.url).pathname,plugins:[react()],server:{middlewareMode:true,hmr:false,ws:false,watch:null},appType:'custom',logLevel:'error'});
  Host=await server.ssrLoadModule('/src/source-sidebar-filter-current.jsx');
  Sidebar=await server.ssrLoadModule('/src/source-sidebar.jsx');
  Controls=await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-controls.mjs');
  View=await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-view.mjs');
  Options=await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-options.mjs');
  // R3-sections step 3: the session-list filter's menu is the CDS Dropdown (view-tabs), the same Base UI menu as eO / tO.
  Menu=(await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js')).CdsDropdown;
  Sections=await server.ssrLoadModule('/src/source-sidebar-sections-adapters.jsx');
  Mode=await server.ssrLoadModule('/src/generated/sidebar-sections/group-mode.mjs');
});after(async()=>{await server?.close();if(savedDocument)Object.defineProperty(globalThis,'document',savedDocument);else delete globalThis.document;});
const now=new Date(2026,9,17,12).getTime();
const date=(days,hour=12)=>{const d=new Date(now);d.setDate(d.getDate()-days);d.setHours(hour,0,0,0);return d.getTime();};
const row=(id,fields={})=>({id,name:id,cwd:'/repo',updatedAtMs:date(0),createdAtMs:date(5),...fields});
const ids=groups=>groups.flatMap(g=>g.sessions.map(s=>s.id));
const group=(sessions,preferences={},extras={})=>buildSidebarGroups({sessions,preferences:{groupBy:'none',...preferences},now,currentLayout:true,...extras});
test('original creation timestamp rejects missing, non-finite, nonpositive and future creation values',()=>{
  for(const createdAtMs of [undefined,NaN,Infinity,-1,0,101])assert.equal(sidebarCreatedTimestamp({createdAtMs,updatedAtMs:100}),100);
  assert.equal(sidebarCreatedTimestamp({createdAtMs:50,updatedAtMs:100}),50);
});
test('Code sorting uses original timestamp comparators, ascending reverses them and equal values stay stable',()=>{
  const sessions=[row('z',{updatedAtMs:date(0),createdAtMs:date(2)}),row('b',{updatedAtMs:date(1),createdAtMs:date(4)}),row('a',{updatedAtMs:date(1),createdAtMs:date(3)})];
  assert.deepEqual(ids(group(sessions)),['z','b','a']);
  assert.deepEqual(ids(group(sessions,{ascending:true})),['b','a','z']);
  assert.deepEqual(ids(group(sessions,{sortBy:'created'})),['z','a','b']);
  assert.deepEqual(ids(group(sessions,{sortBy:'created',ascending:true})),['b','a','z']);
  assert.deepEqual(sessions.map(s=>s.id),['z','b','a']);
  assert.equal(compareSidebarTitle({title:null},{title:'named'}),1);
});
test('date buckets follow created time when selected, and ascending reverses buckets without moving pinned rows',()=>{
  const sessions=[row('old',{updatedAtMs:date(0),createdAtMs:date(9)}),row('today',{createdAtMs:date(0)}),row('yesterday',{createdAtMs:date(1)}),row('pin',{createdAtMs:date(20)})];
  const extras={metadata:{pin:{pinned:true}},pinnedOrder:['pin']};
  const created=group(sessions,{groupBy:'date',sortBy:'created'},extras);
  assert.deepEqual(created.map(g=>g.key),['pinned','day-0','day-1','older']);
  assert.deepEqual(ids(created),['pin','today','yesterday','old']);
  assert.deepEqual(group(sessions,{groupBy:'date',sortBy:'created',ascending:true},extras).map(g=>g.key),['pinned','older','day-1','day-0']);
  assert.deepEqual(group(sessions,{groupBy:'date',sortBy:'recency'},extras).map(g=>g.key),['pinned','day-0']);
});
test('invalid creation time uses update date for both sorting and date buckets',()=>{
  const sessions=[row('future',{updatedAtMs:date(1),createdAtMs:date(-1)}),row('valid',{updatedAtMs:date(0),createdAtMs:date(2)})];
  assert.deepEqual(group(sessions,{groupBy:'date',sortBy:'created'}).map(g=>g.key),['day-1','day-2']);
});
test('current Status groups ignore legacy age cuts while the classic path still applies them',()=>{
  const sessions=[row('old',{updatedAtMs:date(20)})],preferences={groupBy:'state',stateActivityDays:7};
  assert.deepEqual(ids(group(sessions,preferences)),['old']);
  assert.deepEqual(buildSidebarGroups({sessions,preferences,now}),[]);
});
test('oU dt / ft: Reset is offered off the defaults, and resets sort, direction, empty groups and the group-by in ft order',()=>{
  const at={shown:'project',fallback:'project',sortBy:'recency',ascending:false,emptyGroups:false};
  assert.equal(sessionListNotAtDefaults(at),false);
  for(const change of [{shown:'date'},{sortBy:'alpha'},{ascending:true},{emptyGroups:true}])assert.equal(sessionListNotAtDefaults({...at,...change}),true,JSON.stringify(change));
  assert.equal(sessionListNotAtDefaults({...at,emptyGroups:true,emptyGroupsAvailable:false}),false,'de gates Empty groups');
  assert.deepEqual(sessionListResetSteps({...at,shown:'date',sortBy:'created',ascending:true,emptyGroups:true}),{sortBy:'recency',descending:true,emptyGroupsOff:true,regroup:true});
  // `Ee && l !== "alpha" && at(!1)`: a stored ascending under Name is left as it is (Name's stored false reads ascending).
  assert.deepEqual(sessionListResetSteps({...at,sortBy:'alpha',ascending:true}),{sortBy:'recency',descending:false,emptyGroupsOff:false,regroup:false});
  assert.deepEqual(sessionListResetSteps(at),{sortBy:null,descending:false,emptyGroupsOff:false,regroup:false});
});
test('HQ: View all opens the page once the settled list holds an archived session; Loading… while it loads; else disabled',()=>{
  const open=()=>{};
  assert.equal(sidebarViewAllValue({onViewAll:open,listSettled:true,archivedInHand:true}),open);
  assert.equal(sidebarViewAllValue({onViewAll:open,listSettled:true,filtered:true}),open);
  assert.equal(sidebarViewAllValue({onViewAll:open,listSettled:true,archivedInHand:false}),null);
  assert.equal(sidebarViewAllValue({onViewAll:open,listSettled:false,archivedInHand:true}),'loading');
  assert.equal(sidebarViewAllValue(undefined),'loading');
  assert.equal(sidebarViewAllValue({listSettled:true,archivedInHand:true}),null,'no Sessions page to open');
});
function nodes(tree,predicate){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(n=>nodes(n,predicate));return [...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];}
function fixture(component,props={},contexts=new Map()){
  const cells=[],effects=[];let cursor=0,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={useContext:c=>contexts.has(c)?contexts.get(c):c._currentValue,
    useRef(initial){const i=cursor++;cells[i]??={value:{current:initial}};return cells[i].value;},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},
    useSyncExternalStore(_subscribe,snapshot,serverSnapshot){return(serverSnapshot??snapshot)();},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}},
  };
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H=hooks;try{return tree=component(props);}finally{internal.H=old;}};
  render();return {get tree(){return tree;},render,flush(){while(effects.length)effects.shift()();},close(){cells.forEach(c=>c.cleanup?.());}};
}
const intl={formatMessage:m=>m.defaultMessage};
test('oU Se: grouping labels/order; Custom only without the custom-group overlay (be = ux()), Status only with ga()',()=>{
  assert.deepEqual(Options.sidebarCurrentGroupOptions({intl}),[['none','None'],['state','Status'],['date','Date'],['project','Environment'],['custom','Custom']]);
  assert.deepEqual(Options.sidebarCurrentGroupOptions({intl,customDisabled:true}).map(([key])=>key),['none','state','date','project']);
  assert.deepEqual(Options.sidebarCurrentGroupOptions({intl,statusGrouping:false,customDisabled:true}).map(([key])=>key),['none','date','project']);
});
test('lU / dU: Last updated, Date created and Name; the trailing label comes from the options; radios keep the menu open',()=>{
  const options=fixture(Controls.useSidebarSortOptions).tree;
  assert.deepEqual(options,[['recency','Last updated'],['created','Date created'],['alpha','Name']]);
  const calls=[],f=fixture(Controls.SidebarSortMenu,{options,value:'alpha',ascending:true,onChange:v=>calls.push(['sort',v]),onAscendingChange:v=>calls.push(['ascending',v])});
  assert.equal(nodes(f.tree,n=>n.type===Menu.SubmenuTrigger)[0].props.trailing.props.children,'Name','dU derives its label (no currentLabel)');
  const items=nodes(f.tree,n=>n.type===Menu.Item);
  assert.equal(items.length,5);assert.ok(items.every(n=>n.props.keepOpen&&n.props.checkedRole==='radio'));
  assert.deepEqual(items.map(n=>n.props.checked),[false,false,true,false,true]);
  items[0].props.onClick();items[3].props.onClick();assert.deepEqual(calls,[['sort','recency'],['ascending',false]]);
  // YH / XH: Name's stored direction is inverted (false reads ascending, A to Z).
  assert.deepEqual([Controls.sortAscendingShown('alpha',false),Controls.sortAscendingShown('recency',false),Controls.sortAscendingStored('alpha',true)],[true,false,false]);
});
test('uU forwards keyboard activation; the submenus open on the logical inline end (xp)',()=>{
  const called=[],f=fixture(Controls.SidebarOptionMenu,{label:'Group by',options:[['project','Environment']],value:'project',onChange:(...args)=>called.push(args)});
  const item=nodes(f.tree,n=>n.type===Menu.Item)[0];item.props.onClick({detail:0});item.props.onClick({detail:1});
  assert.deepEqual(called,[['project',true],['project',false]]);
  assert.equal(nodes(f.tree,n=>n.type===Menu.Popup)[0].props.side,'right');
  assert.equal(physicalSide('inline-end','rtl'),'left');assert.equal(physicalSide('inline-end','ltr'),'right');
});
test('the session-list menu writes the Sessions section through the original writers (ip / op / ES / TS / sp / ap), bridged to main',()=>{
  const calls=[],regroups=[];
  const disconnect=Sections.connectSidebarSectionActions((action,payload)=>calls.push([action,payload]));
  try{
    const props={handle:{},open:true,onOpenChange(){},onRegroup:k=>regroups.push(k),preferences:{groupBy:'project',sortBy:'alpha',ascending:false,showMetadata:false,showEmptyGroups:true}};
    const f=fixture(Host.SessionListFilterMenu,props),root=f.tree;
    assert.equal(root.type,Menu.Root);assert.deepEqual([root.props.handle,root.props.open],[props.handle,true]);
    const popup=root.props.children;assert.deepEqual([popup.type,popup.props.side,popup.props.align,popup.props.sideOffset,popup.props.className],[Menu.Popup,'bottom','end',4,undefined]);
    const content=popup.props.children.props;
    assert.equal(popup.props.children.type,View.CurrentSidebarFilterContent);
    assert.deepEqual(content.groupOptions.map(([key])=>key),['none','state','date','project'],'Custom hidden (overlay on, D10)');
    assert.deepEqual([content.groupBy,content.sortBy,content.ascending,content.metadata,content.emptyGroups,content.routinesAvailable,content.resetAvailable],
      ['project','alpha',true,false,true,false,true]);
    assert.deepEqual(content.sortOptions.map(([key])=>key),['recency','created','alpha']);
    content.onGroupBy('date',true);content.onGroupBy('project',false);
    assert.deepEqual(regroups,[true],'nt regroups only on a change');
    content.onSortBy('created');content.onAscending(true);content.onMetadata();content.onEmptyGroups();
    assert.deepEqual(calls,[
      ['view',{id:'sessions',view:{groupBy:'date'}}],['view',{id:'sessions',view:{groupBy:'environment'}}],['view',{id:'sessions',view:{sortBy:'created'}}],
      ['view',{id:'sessions',view:{ascending:false}}],['view',{id:'sessions',view:{show:{metadata:true}}}],['view',{id:'sessions',view:{show:{emptyGroups:false}}}],
    ],'XH(alpha, true) stores false');
    calls.length=0;content.onReset({detail:0});
    assert.deepEqual(calls,[['view',{id:'sessions',view:{sortBy:'recency'}}],['view',{id:'sessions',view:{show:{emptyGroups:false}}}],['view',{id:'sessions',view:{groupBy:null}}]]);
    // At the defaults Reset is disabled (sU atDefaults: !dt).
    const atDefaults=fixture(Host.SessionListFilterMenu,{...props,preferences:{groupBy:'project',sortBy:'recency',ascending:false,showEmptyGroups:false}}).tree.props.children.props.children.props;
    assert.equal(atDefaults.resetAvailable,false);
    // The writers are the generated originals.
    assert.equal(typeof Mode.writeSessionsGroupBy,'function');assert.equal(typeof Mode.clearSessionsGroupBy,'function');
  }finally{disconnect();Sections.useSidebarSectionsStore.setState({codeSidebarByScope:{}});}
});
test('oU sessionList: Group by, Sort by, Show (Metadata, Empty groups), then sU; no nested items, PR status or Clear filters',()=>{
  const props=fixture(Host.SessionListFilterMenu,{handle:{},open:true,onOpenChange(){},preferences:{groupBy:'none'}}).tree.props.children.props.children.props;
  const tree=View.CurrentSidebarFilterContent(props),parts=tree.props.children;
  assert.deepEqual(parts.map(n=>n?.type),[Controls.SidebarOptionMenu,Controls.SidebarSortMenu,Menu.Submenu,Controls.SidebarViewResetItems]);
  assert.equal(parts[3].props.atDefaults,!props.resetAvailable);
  const items=nodes(tree,n=>n.type===Menu.Item);
  assert.ok(items.some(n=>n.props.children?.props?.defaultMessage==='Metadata'&&n.props.keepOpen));
  assert.ok(items.some(n=>n.props.children==='Empty groups'&&n.props.keepOpen));
  assert.equal(nodes(tree,n=>/nested|PR status|Clear filters/i.test(String(n.props?.children))).length,0);
  assert.equal(Controls.SidebarNestedVisibilityItems,undefined,'ZH is gone in 2.42304.0');
});
test('palette hide_all_nested_sessions / show_all_nested_sessions (shared-20 _S): each only while it applies; pinned families excluded by the caller',()=>{
  assert.deepEqual(sidebarNestedAvailability([],['stale']),{anyShown:false,anyHidden:false});
  const writes=[],commands=sidebarNestedCommands(['p','q','p'],['p'],ids=>writes.push(ids));
  assert.deepEqual([commands.anyShown,commands.anyHidden],[true,true]);
  commands.onHideAll();commands.onShowAll();assert.deepEqual(writes,[['p','q'],[]]);
  assert.deepEqual([sidebarNestedCommands(['p'],[],()=>{}).anyHidden,sidebarNestedCommands(['p'],['p'],()=>{}).anyShown],[false,false]);
});
test('source keyboard regroup focus returns to the first heading only when the menu closes and focus is not elsewhere',()=>{
  let focused=0;const body={},outside={},target={focus(){focused++;}},doc={body,activeElement:body};
  const root={ownerDocument:doc,querySelector:selector=>selector==='[data-group-toggle]'?target:null},props={state:{open:true,keyRegroups:0}};
  const f=fixture(()=>Controls.useSidebarRegroupFocus({current:root},props.state));f.flush();
  props.state={open:true,keyRegroups:1};f.render();f.flush();assert.equal(focused,0);
  props.state={open:false,keyRegroups:1};f.render();f.flush();assert.equal(focused,1);
  f.render();f.flush();assert.equal(focused,1);
  doc.activeElement={closest:()=>null};props.state={open:false,keyRegroups:2};f.render();f.flush();assert.equal(focused,1);
  f.close();
});


test('date grouping keeps a family in the newest member bucket or the parent creation bucket',()=>{
  const sessions=[row('parent',{updatedAtMs:date(8),createdAtMs:date(10)}),row('child',{forkedFromId:'parent',updatedAtMs:date(0),createdAtMs:date(0)}),row('unrelated',{updatedAtMs:date(1),createdAtMs:date(1)})];
  const recency=group(sessions,{groupBy:'date'});
  assert.deepEqual(recency.map(g=>g.key),['day-0','day-1']);assert.deepEqual(new Set(recency[0].sessions.map(s=>s.id)),new Set(['parent','child']));
  const created=group(sessions,{groupBy:'date',sortBy:'created'});
  assert.deepEqual(created.map(g=>g.key),['day-1','older']);assert.deepEqual(new Set(created[1].sessions.map(s=>s.id)),new Set(['parent','child']));
});
test('original nested ordering uses the parent position for created sort and best member for recency',()=>{
  const sessions=[row('child',{forkedFromId:'parent'}),row('unrelated'),row('parent')];
  assert.deepEqual(buildNestedRuns(sessions,{}, {currentLayout:true,sortBy:'recency'}).ordered.map(s=>s.id),['parent','child','unrelated']);
  assert.deepEqual(buildNestedRuns(sessions,{}, {currentLayout:true,sortBy:'created'}).ordered.map(s=>s.id),['unrelated','parent','child']);
  const spawned=[row('spawned',{forkedFromId:'parent',sideSpawnerId:'child'}),row('parent'),row('child',{forkedFromId:'parent'})];
  assert.deepEqual(buildNestedRuns(spawned,{}, {currentLayout:true,sortBy:'created'}).ordered.map(s=>s.id),['parent','child','spawned']);
});
test('actual sidebar consumes ascending and original nested order, with the current CDS Group and sort trigger',()=>{
  const sessions=[row('old',{updatedAtMs:date(2)}),row('new',{updatedAtMs:date(0)})];
  const html=renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,{sessions,sidebarPreferences:{groupBy:'none',ascending:true}}));
  assert.ok(html.indexOf('data-source-session-id="old"')<html.indexOf('data-source-session-id="new"'));
  const trigger=html.match(/<button[^>]*aria-label="Group and sort"[^>]*>/)?.[0];assert.ok(trigger);
  assert.match(trigger,/data-cds="Button"/);assert.match(trigger,/df-chrome-btn/);assert.doesNotMatch(trigger,/code-icon-button/);
});
test('the newly reachable menu copy has Chinese translations through the existing host localization',()=>{
  const zh=dictionary('zh-CN');
  for(const label of ['Group and sort','Show','Metadata','Empty groups','Ascending','Descending','Reset to defaults','Name','View all','Loading…',
    'Grouping and sorting are already at their defaults.','There are no other sessions to view.','Hide all nested sessions','Show all nested sessions'])assert.ok(zh[label]&&zh[label]!==label,label);
});

test('created Older bulk scope excludes an entire family with recent activity, including hidden children',()=>{
  const sessions=[row('parent',{createdAtMs:date(20),updatedAtMs:date(9)}),row('child',{forkedFromId:'parent',createdAtMs:date(8),updatedAtMs:date(0)}),row('old',{createdAtMs:date(12),updatedAtMs:date(8)}),row('recent',{createdAtMs:date(20),updatedAtMs:date(0)})];
  const older=group(sessions,{groupBy:'date',sortBy:'created',collapsedNested:['parent']}).find(g=>g.key==='older');
  assert.equal(older.sessions.length,4);assert.deepEqual(older.bulkScope.map(s=>s.id),['old']);
  const recency=group(sessions,{groupBy:'date'}).find(g=>g.key==='older');
  assert.deepEqual(recency.sessions.map(s=>s.id),['old']);assert.equal(recency.bulkScope,undefined);
});
test('the source bulk cutoff is seven local calendar buckets, not a rolling 168-hour window',()=>{
  const sessions=[row('boundary',{createdAtMs:date(20),updatedAtMs:date(6,0)}),row('older',{createdAtMs:date(20),updatedAtMs:date(7,23)})];
  const older=group(sessions,{groupBy:'date',sortBy:'created'}).find(g=>g.key==='older');
  assert.deepEqual(older.bulkScope.map(s=>s.id),['older']);
});

test('the rendered Older heading does not offer bulk actions for recently active created-date rows',()=>{
  const updatedAtMs=Date.now(),createdAtMs=updatedAtMs-20*86400000;
  const props={sidebarPreferences:{groupBy:'date',sortBy:'created'},onSessionAction(){},sessions:[row('active-old',{updatedAtMs,createdAtMs})]};
  const html=renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,props));
  assert.match(html,/data-group-key="older"/);assert.doesNotMatch(html,/aria-label="Bulk actions for older sessions"/);
  const eligible=renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,{...props,sessions:[...props.sessions,row('inactive-old',{updatedAtMs:updatedAtMs-10*86400000,createdAtMs})]}));
  assert.match(eligible,/aria-label="Bulk actions for older sessions"/);
});
