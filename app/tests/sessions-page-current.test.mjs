import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import {parsers} from '../../tools/node_modules/prettier/plugins/babel.mjs';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {sessionsPageRoute,isSessionsPageRoute,replaceSessionsPageSurface} from '../src/sessions-page-navigation.mjs';
import {readSessionsPageSearch,rememberSessionsPageSearch,clearSessionsPageSearches,sessionsPageAccountScope} from '../src/sessions-page-search-state.mjs';
import {buildSidebarGroups} from '../src/sidebar-model.js';
import {sessionPageRows,sessionIdFromPageHref,sessionPageHref} from '../src/sessions-page-model.mjs';
let server,Host,View,LoadHold,Controls,Primitives;
before(async()=>{
  server=await createServer({configFile:false,root:new URL('..',import.meta.url).pathname,plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
  Host=await server.ssrLoadModule('/src/source-sessions-page.jsx');
  View=await server.ssrLoadModule('/src/generated/code-current/sessions-page-view.mjs');
  LoadHold=await server.ssrLoadModule('/src/generated/code-current/sessions-page-load-hold.mjs');
  Controls=await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-controls.mjs');
  Primitives=await server.ssrLoadModule('/src/source-sessions-primitives.jsx');
});after(()=>server?.close());
const now=Date.now(),sessions=[{id:'live',name:'Live task',updatedAtMs:now},{id:'old',name:'Old task',updatedAtMs:now-1000},{id:'archive',name:'Stored task',archived:true,updatedAtMs:now+1000}];
const ids=rows=>rows.map(r=>r.ref.id);
test('page scopes active and archived records and sorts each by original update comparator',()=>{
  assert.deepEqual(ids(sessionPageRows(sessions)),['live','old']);assert.deepEqual(ids(sessionPageRows(sessions,{surface:'archived'})),['archive']);
  assert.deepEqual(ids(sessionPageRows([...sessions,sessions[0],null])),['live','old']);assert.equal(sessions[0].source,undefined);
});
test('Code page search covers titles, remains scoped to the surface and is case-insensitive',()=>{
  assert.deepEqual(ids(sessionPageRows(sessions,{query:'  LIVE  '})),['live']);assert.deepEqual(ids(sessionPageRows(sessions,{query:'Stored'})),[]);
  assert.deepEqual(ids(sessionPageRows(sessions,{query:'stored',surface:'archived'})),['archive']);assert.deepEqual(ids(sessionPageRows([{id:'x',preview:'not a title'}],{query:'not a title'})),[]);
});
test('row projection uses actual local unread, running, archive and repository state',()=>{
  const context={state:{active:{live:'turn'}},metadata:{live:{unread:true,pinned:true}},repoIdentities:{'/repo':{isRepo:true,name:'test',owner:'owner'}}};
  const [record]=sessionPageRows([{...sessions[0],cwd:'/repo'}],context);assert.equal(record.liveStatus,'running');assert.equal(record.isUnread,true);assert.equal(record.isStarred,true);
  assert.deepEqual(record.source.data.repoInfo,{name:'test',owner:'owner'});assert.equal(sessionPageRows([{...sessions[0],archived:true}],{...context,surface:'archived'})[0].liveStatus,'idle');
});
test('session links round trip identifiers without letting unrelated anchors select sessions',()=>{
  for(const id of ['local/a b','x#y?z','中文'])assert.equal(sessionIdFromPageHref(sessionPageHref(id)),id);
  assert.equal(sessionIdFromPageHref('#new'),null);assert.equal(sessionIdFromPageHref('#code-session/%GG'),null);
});
test('original page renders Active/Archived tabs, table and Code rows without Select',()=>{
  const html=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{sessions}));
  assert.match(html,/data-cds="Page"/);assert.match(html,/role="tablist"/);assert.match(html,/>Active</);assert.match(html,/>Archived</);
  assert.match(html,/<table/);assert.match(html,/Live task/);assert.doesNotMatch(html,/Stored task/);
  assert.doesNotMatch(html,/>Select<|>Deselect all<|>Delete selected/);assert.match(html,/href="#code-session\/live"/);
  assert.match(html,/data-cds="RelativeTime"/);assert.match(html,/href="#new"/);
});
test('archived page renders only archived records without the mixed-list archive badge',()=>{
  // gd Zn: showArchivedBadge is `fe && Yi(e)` and fe = U && L === "all" && !x; the Code page is text-first
  // (x = Ie() || codeScoped), so the badge (ce58a0513 t, data-cds="Badge") never shows there.
  const html=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{sessions,initialSurface:'archived'}));
  assert.match(html,/Stored task/);assert.doesNotMatch(html,/Live task/);assert.doesNotMatch(html,/data-cds="Badge"/);
});
test('2.42304.0 page uses the muted-as-secondary token and keeps tabs visible without a selection',()=>{
  const html=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{sessions,initialSurface:'archived'}));
  const root=html.match(/<div[^>]*data-cds="Tabs"[^>]*>/)?.[0];assert.ok(root);assert.doesNotMatch(root,/invisible|aria-hidden/);assert.match(html,/role="tablist"/);
  assert.doesNotMatch(html,/data-cds-part="tabs-status"/);assert.doesNotMatch(html,/\{count\} selected|selected</);
  const empty=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{}));
  assert.match(empty,/<p class="text-body text-muted-as-secondary">Sessions you start will show up here\./);
  const f=fixture(Host.SourceSessionsPage,{sessions});const searching=renderToStaticMarkup(React.createElement(View.SessionsPageView,{...view(f),hasQuery:true}));f.close();
  assert.match(searching,/<p role="status" class="text-body text-muted-as-secondary mb-2">Search covers the titles shown\.<\/p>/);
});
test('empty/loading views use original source copy and nine skeleton rows',()=>{
  const active=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{}));assert.match(active,/Sessions you start will show up here\./);
  const archived=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{initialSurface:'archived'}));assert.match(archived,/Archived sessions will show up here\./);
  const pending=renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,{loading:true}));assert.match(pending,/aria-busy="true"/);assert.doesNotMatch(pending,/Sessions you start will show up here/);
  assert.equal((pending.match(/box-content flex min-h-9/g)??[]).length,9);
});
function nodes(tree,predicate){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(n=>nodes(n,predicate));return [...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];}
function fixture(component,props={},contexts=new Map()){
  let cursor=0,tree;const cells=[],effects=[],same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={useContext:c=>contexts.has(c)?contexts.get(c):c._currentValue,useId:()=>':page:',useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,value=>{cells[i].value=typeof value==='function'?value(cells[i].value):value;}];},
    // 2.42304.0 c9c7785eb O (useRowSelection) keeps isActive/selectedIds in
    // vendor-frame xo (= React.useReducer), so the dispatcher must answer it;
    // like React, dispatch is stable and the optional init runs once.
    useReducer(reducer,initialArg,init){const i=cursor++;if(!cells[i]){const cell={value:init?init(initialArg):initialArg};cell.dispatch=action=>{cell.value=reducer(cell.value,action);};cells[i]=cell;}return [cells[i].value,cells[i].dispatch];},
    useRef(initial){const i=cursor++;cells[i]??={value:{current:initial}};return cells[i].value;},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const previous=cells[i];cells[i]={deps};effects.push(()=>{previous?.cleanup?.();cells[i].cleanup=fn();});}},
  };
  hooks.useLayoutEffect=hooks.useEffect;
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H=hooks;try{return tree=component(props);}finally{internal.H=old;}};
  render();return {get tree(){return tree;},render,flush(){while(effects.length)effects.shift()();},close(){cells.forEach(c=>c.cleanup?.());}};
}
const view=f=>nodes(f.tree,n=>n.type===View.SessionsPageView)[0].props;
test('tab events switch host records and preserve tab panel linkage',()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions});f.flush();assert.equal(view(f).surface,'code');view(f).tabs.props.onValueChange('archived');f.render();f.flush();
  const after=view(f);assert.equal(after.surface,'archived');assert.deepEqual(ids(after.rows),['archive']);assert.equal(after.panelId,`${after.tabsId}-panel`);
  after.tabs.props.onValueChange('unsupported');f.render();assert.equal(view(f).surface,'archived');f.close();
});
test('original selection hook leaves selection mode when the surface changes',()=>{
  // 2.42304.0 O resets through shared-52 aD(surface,{onMount:"skip"}) during
  // render instead of 2.37337.1 w's effect; React re-renders a render-phase
  // update before commit, which the second render() stands in for.
  // 2.42304.0 gd swaps the tabs for the "{count} selected" label while a selection is active (bulk gate closed),
  // so the surface change goes through the handler the tabs carried before; Back/Forward is the app's other way.
  const f=fixture(Host.SourceSessionsPage,{sessions});f.flush();const changeSurface=view(f).tabs.props.onValueChange;
  view(f).selection.enter('live');f.render();
  assert.equal(view(f).selection.isActive,true);assert.deepEqual([...view(f).selection.selectedIds],['live']);
  changeSurface('archived');f.render();f.render();
  assert.equal(view(f).selection.isActive,false);assert.equal(view(f).selection.selectedIds.size,0);f.close();
});
test('an active selection shows the original count label, hides search and keeps the closed bulk gate',()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions,historyKey:'selection-entry'});f.flush();assert.ok(view(f).search);
  view(f).selection.enter('live');f.render();const props=view(f);
  assert.equal(props.bulkMenu,false);assert.equal(props.search,undefined);assert.deepEqual(props.selectableRows,[]);
  assert.equal(props.tabs.type,'div');assert.equal(props.tabs.props.children.props.className,'text-body text-muted-as-secondary whitespace-nowrap');
  // R3-nested: gd lr = <Z defaultMessage="{count} selected" id="NKPfmmHQdx" values={{count: wn}}/>; wn counts selected chat
  // and cowork rows, so it is 0 here (the Code row 'live' is not selectable and never becomes a selected key).
  const label=props.tabs.props.children.props.children;
  assert.deepEqual({message:label.props.defaultMessage,id:label.props.id,values:label.props.values},{message:'{count} selected',id:'NKPfmmHQdx',values:{count:0}});
  assert.equal(props.countText,label);assert.equal(props.selectedCount,0);assert.deepEqual(props.selection.selectedKeys,[]);
  const html=renderToStaticMarkup(React.createElement(View.SessionsPageView,props));
  assert.match(html,/Exit selection/);assert.doesNotMatch(html,/data-cds-part="tabs-status"|>Select all<|>Archive<|>Delete</);
  assert.match(renderToStaticMarkup(props.tabs),/<span class="text-body text-muted-as-secondary whitespace-nowrap">0 selected<\/span>/);
  props.selection.exit();f.render();assert.equal(view(f).tabs.props.value,'code');assert.ok(view(f).search);f.close();
});
test('debounced search updates records, clears immediately and sort actions preserve query',async()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions});f.flush();view(f).search.onChange('old');f.render();f.flush();assert.equal(view(f).search.value,'old');assert.deepEqual(ids(view(f).rows),['live','old']);
  await new Promise(resolve=>setTimeout(resolve,320));f.render();assert.deepEqual(ids(view(f).rows),['old']);
  view(f).search.expandedActions.props.items[1].onSelect();f.render();assert.equal(view(f).search.expandedActions.props.items[1].checked,true);assert.equal(view(f).search.value,'old');
  view(f).search.onChange('');f.render();f.flush();assert.deepEqual(ids(view(f).rows),['live','old']);f.close();
});
test('New session and row More forward host callbacks with keyboard entry',()=>{
  let newCount=0,opened;const f=fixture(Host.SourceSessionsPage,{sessions,onNew:()=>newCount++,onSessionMenu:(...args)=>opened=args});
  const container=nodes(f.tree,n=>n.props?.className==='source-sessions-page')[0];let prevented=0;
  container.props.onClick({target:{closest:()=>({})},preventDefault:()=>prevented++});assert.equal(newCount,1);assert.equal(prevented,1);
  const action=view(f).renderActions(view(f).rows[0]).props.children,anchor={};action.props.onClick({currentTarget:anchor,detail:0});assert.deepEqual(opened,[sessions[0],anchor,'first']);f.close();
});

test('source View all item invokes the page callback; without a served page it is disabled with its reason',()=>{
  const calls=[],context=Controls.SidebarViewAllContext;
  const f=fixture(Controls.SidebarViewAllItem,{},new Map([[context,()=>calls.push('page')]]));
  const actionable=nodes(f.tree,n=>typeof n.props?.onClick==='function')[0];assert.ok(actionable);actionable.props.onClick({});assert.deepEqual(calls,['page']);
  // 2.42304.0 shared-21 cU (R3-sections step 3, WI-5): View all is always listed; without a page it is disabled with its reason.
  const none=fixture(Controls.SidebarViewAllItem,{},new Map([[context,null]])).tree;
  assert.deepEqual([none.props.disabled,none.props.onClick,none.props.disabledReason.props.defaultMessage],[true,undefined,'There are no other sessions to view.']);
});
test('session anchor opens exactly the linked local session and respects a handled click',()=>{
  const opened=[],parent=fixture(Host.SourceSessionsPage,{sessions,onOpen:(...args)=>opened.push(args)});
  const context=parent.tree.type,href=sessionPageHref('local/a b'),event={preventDefault(){this.defaultPrevented=true;}};
  const link=fixture(Host.SessionsPageLink,{href},new Map([[context,parent.tree.props.value]]));
  link.tree.props.onClick(event);assert.equal(event.defaultPrevented,true);assert.equal(opened[0][0],'local/a b');
  link.tree.props.onClick({defaultPrevented:true});assert.equal(opened.length,1);parent.close();
});
test('original row applies Unicode-aware highlighting and exposes live state from engine records',()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions:[{id:'unicode',name:'İstanbul task',updatedAtMs:now}],state:{active:{unicode:'turn'}}});
  const row=view(f).rows[0];const content=view(f).renderContent(row);const html=renderToStaticMarkup(React.cloneElement(content,{lowerQuery:'i̇stanbul'}));
  assert.match(html,/font-semibold text-primary">İstanbul/);assert.match(html,/Running/);f.close();
});
test('an open session menu keeps its original trigger expanded',()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions,menuSessionId:'live',onSessionMenu(){}});
  assert.equal(view(f).renderActions(view(f).rows[0]).props.children.props['aria-expanded'],true);
  assert.equal(view(f).renderActions(view(f).rows[1]).props.children.props['aria-expanded'],false);f.close();
});
test('original load hold releases when settled and has a bounded placeholder deadline',()=>{
  const original=globalThis.setTimeout,clear=globalThis.clearTimeout,timers=[];
  globalThis.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};globalThis.clearTimeout=()=>{};
  try {
    const props={pending:true,hasRows:true},f=fixture(LoadHold.useSessionsPageLoadHold,props);assert.equal(f.tree.held,true);f.flush();
    assert.ok(timers.at(-1).delay<=800&&timers.at(-1).delay>700);timers.at(-1).fn();f.render();assert.equal(f.tree.release,'deadline');f.close();
    const next={pending:true,hasRows:false},g=fixture(LoadHold.useSessionsPageLoadHold,next);g.flush();assert.ok(timers.at(-1).delay>9900&&timers.at(-1).delay<=10000);
    next.pending=false;g.render();assert.equal(g.tree.held,false);assert.equal(g.tree.release,'settled');g.close();
  } finally {globalThis.setTimeout=original;globalThis.clearTimeout=clear;}
});
test('cov11-02: search and sort come back only when Back/Forward returns to the same history entry',()=>{
  // cbd6c85c8 gd/ed/td: read ed.get(Kn()) at mount, write only for the shown entry, orgUuid (here the engine) must match.
  const entry=sessionsPageRoute('code'),props={sessions,scopeKey:'restore-test',historyKey:entry.key};
  const f=fixture(Host.SourceSessionsPage,props);f.flush();view(f).search.onChange('old');f.render();f.flush();view(f).search.expandedActions.props.items[1].onSelect();f.render();f.flush();f.close();
  const back=fixture(Host.SourceSessionsPage,props);assert.equal(view(back).search.value,'old');assert.deepEqual(ids(view(back).rows),['old']);
  assert.equal(view(back).search.autoFocusHeldQuery,false);assert.equal(view(back).search.expandedActions.props.items[1].checked,true);back.close();
  const visit=fixture(Host.SourceSessionsPage,{...props,historyKey:sessionsPageRoute('code').key});assert.equal(view(visit).search.value,'');
  assert.equal(view(visit).search.autoFocusHeldQuery,true);assert.equal(view(visit).search.expandedActions.props.items[0].checked,true);visit.close();
  const other=fixture(Host.SourceSessionsPage,{...props,scopeKey:'other-engine'});assert.equal(view(other).search.value,'');other.close();
  const clear=fixture(Host.SourceSessionsPage,props);clear.flush();assert.equal(view(clear).search.value,'old');view(clear).search.onChange(' ');clear.render();clear.flush();clear.close();
  const cleared=fixture(Host.SourceSessionsPage,props);assert.equal(view(cleared).search.value,'');cleared.close();
  const loose=fixture(Host.SourceSessionsPage,{sessions,scopeKey:'restore-test'});loose.flush();view(loose).search.onChange('live');loose.render();loose.flush();loose.close();
  assert.equal(readSessionsPageSearch(undefined,'restore-test'),undefined);assert.equal(readSessionsPageSearch(null,'restore-test'),undefined);
});
test('cov11-02: a tab change replaces the entry key and the shown page keeps writing under the new key',()=>{
  let history=[sessionsPageRoute('code')];const first=history[0].key;
  const props={sessions,scopeKey:'replace-test',historyKey:first,onSurfaceChange:surface=>{history=replaceSessionsPageSurface(history,0,surface);}};
  const f=fixture(Host.SourceSessionsPage,props);f.flush();view(f).search.onChange('stored');f.render();f.flush();
  view(f).tabs.props.onValueChange('archived');assert.equal(history[0].surface,'archived');assert.notEqual(history[0].key,first);
  props.historyKey=history[0].key;f.render();f.flush();
  view(f).tabs.props.onValueChange('code');assert.equal(history[0].surface,'code');props.historyKey=history[0].key;f.render();f.flush();f.close();
  const back=fixture(Host.SourceSessionsPage,{...props,initialSurface:history[0].surface});assert.equal(view(back).search.value,'stored');back.close();
});
test('cov11-02: engine or account changes clear every remembered search (be(() => ed.clear()))',()=>{
  const key=sessionsPageRoute('code').key;rememberSessionsPageSearch(key,'kept','date','engine-a');
  assert.deepEqual(readSessionsPageSearch(key,'engine-a'),{input:'kept',sortBy:'date',scope:'engine-a'});assert.equal(readSessionsPageSearch(key,'engine-b'),undefined);
  rememberSessionsPageSearch(null,'lost','type','engine-a');assert.equal(readSessionsPageSearch(null,'engine-a'),undefined);
  clearSessionsPageSearches();assert.equal(readSessionsPageSearch(key,'engine-a'),undefined);
  assert.equal(sessionsPageAccountScope({account:{type:'chatgpt',email:'user@example.test'}}),'chatgpt:user@example.test');
  assert.equal(sessionsPageAccountScope({account:{type:'apiKey'}}),'apiKey:');assert.equal(sessionsPageAccountScope(null),null);
  const code=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.ok(code.includes('useEffect(() => clearSessionsPageSearches, [coreEngine(boot?.core), sessionsPageAccountScope(boot?.account)]);'));
  assert.ok(code.includes('<SourceSessionsPage key={`${coreEngine(boot?.core)}:${historyAt}`} scopeKey={coreEngine(boot?.core)} historyKey={history[historyAt]?.key}'));
});

test('the current sidebar stays active-only after migrating legacy archived/all preferences',()=>{
  for(const status of ['all','archived']){
    const groups=buildSidebarGroups({sessions,preferences:{status,groupBy:'none'},currentLayout:true});
    assert.deepEqual(groups.flatMap(group=>group.sessions.map(s=>s.id)),['live','old']);
  }
});

test('page history entries stay distinct from session IDs and tab changes replace only the current page entry',()=>{
  const route=sessionsPageRoute('code'),history=[null,'thread-a',route,'thread-b'];
  assert.equal(isSessionsPageRoute('sessions'),false);assert.equal(isSessionsPageRoute(null),false);assert.equal(isSessionsPageRoute({page:'sessions',surface:'bad'}),false);
  assert.equal(isSessionsPageRoute(route),true);
  const next=replaceSessionsPageSurface(history,2,'archived');assert.equal(next.length,4);assert.equal(next[1],'thread-a');assert.equal(next[3],'thread-b');assert.deepEqual({...next[2],key:null},{page:'sessions',surface:'archived',key:null});
  assert.equal(typeof route.key,'string');assert.ok(route.key);assert.notEqual(next[2].key,route.key);assert.notEqual(sessionsPageRoute('code').key,sessionsPageRoute('code').key);
  assert.equal(history[2].surface,'code');assert.equal(replaceSessionsPageSurface(history,1,'archived'),history);
});

function appNavigationFunction(name,env) {
  const code=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8'),ast=parsers.babel.parse(code),matches=[];
  const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='FunctionDeclaration'&&node.id?.name===name)matches.push(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};
  visit(ast);assert.equal(matches.length,1);const node=matches[0];
  return Function(...Object.keys(env),`return (${code.slice(node.start,node.end)});`)(...Object.values(env));
}
test('actual app View all navigation pushes a page entry, truncates forward history and closes the peek/menu',()=>{
  let history=[null,'thread-a','old-forward'],at=1,surface,section;const events=[];
  const open=appNavigationFunction('showSessionsPage',{historyAt:at,sessionsPageRoute,closePeek:()=>events.push('peek'),setMenu:value=>events.push(value),setSessionsPageSurface:value=>surface=value,setSection:value=>section=value,setHistory:update=>history=update(history),setHistoryAt:value=>at=value});
  open('archived');assert.deepEqual(history.slice(0,2),[null,'thread-a']);assert.equal(history.length,3);
  assert.deepEqual({...history[2],key:null},{page:'sessions',surface:'archived',key:null});assert.equal(typeof history[2].key,'string');assert.equal(at,2);assert.equal(surface,'archived');assert.equal(section,'sessions');assert.deepEqual(events,['peek',null]);
});
test('actual app Back/Forward restores page routes without passing route objects to the engine',()=>{
  const opened=[],noted=[];let at,section,surface;
  const env={historyAt:2,history:['thread-a',sessionsPageRoute('archived'),'thread-b'],setHistoryAt:value=>at=value,closePeek(){},setMenu(){},isSessionsPageRoute,setSessionsPageSurface:value=>surface=value,setSection:value=>section=value,openSession:id=>opened.push(id),noteSessionSwitch:id=>noted.push(id)};
  appNavigationFunction('travel',env)(-1);assert.equal(at,1);assert.equal(surface,'archived');assert.equal(section,'sessions');assert.deepEqual(opened,[]);
  appNavigationFunction('travel',{...env,historyAt:1})(-1);assert.equal(section,'new');assert.deepEqual(opened,['thread-a']);assert.deepEqual(noted,['thread-a']);
  appNavigationFunction('travel',{...env,historyAt:0})(-1);assert.deepEqual(opened,['thread-a']);
});

test('2.42304.0: sessions-page helpers come from cbd6c85c8 gd and its neighbours with semantic exports',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../src/generated/code-current/manifest.json',import.meta.url),'utf8'));
  const entries=Object.fromEntries(manifest.modules.filter(m=>m.target.startsWith('sessions-page-')).map(m=>[m.target,m]));
  const page='cbd6c85c8-PO73iD62.js',expected={
    'sessions-page-band.mjs':['shared-18-D4XxL6Tg.js',['ey']],'sessions-page-load-deadline.mjs':['shared-20-B7UqYfsi.js',['eT']],
    'sessions-page-load-hold.mjs':[page,['iu']],'sessions-page-live-status.mjs':['shared-8-B5lJ8U5C.js',['E_']],
    'sessions-page-model.mjs':['shared-11-BuQ3CK5I.js',['db','Ny','cb','Hy','Vy','fb','pb']],'sessions-page-copy.mjs':[page,['id','ad','od','sd','cd']],
    'sessions-page-coordinator.mjs':['shared-8-B5lJ8U5C.js',['UR','WR']],'sessions-page-count-text.mjs':[page,['gd']],
    'sessions-page-awaiting-label.mjs':['shared-18-D4XxL6Tg.js',['OD']],'sessions-page-selection-bar.mjs':[page,['ku','Au','ju','Mu','Nu']],
    'sessions-page-bulk-actions.mjs':[page,['fu','gu','_u','vu','yu']],'sessions-page-tabs.mjs':[page,['gd']],'sessions-page-empty.mjs':[page,['gd']],
    'sessions-page-search.mjs':[page,['gd']],'sessions-page-view.mjs':[page,['gd']],'sessions-page-row.mjs':[page,['_d','vd','yd']]};
  assert.deepEqual(Object.keys(entries).sort(),Object.keys(expected).sort());
  for(const [target,[file,bindings]] of Object.entries(expected)){
    const entry=entries[target];assert.equal(entry.referenceVersion,'2.42304.0',target);assert.equal(entry.source.split('/').pop(),file,target);assert.deepEqual(entry.bindings,bindings,target);
  }
  const selections=Object.fromEntries(['tabs','empty','search','view','count-text'].map(name=>[name,entries[`sessions-page-${name}.mjs`].sourceSelections[0]]));
  assert.equal(selections['count-text'].local,'lr');assert.equal(selections['count-text'].direct,true);assert.match(selections.view.parameters,/selectedCount:wn=0/);
  assert.equal(selections.tabs.local,'gr');assert.equal(selections.tabs.direct,true);assert.equal(selections.empty.local,'vr');
  assert.equal(selections.search.assignment,'br');assert.equal(selections.view.call,'a');assert.equal(selections.view.argument,'Wa');
  const official=fs.readFileSync(new URL('../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/cbd6c85c8-PO73iD62.js',import.meta.url),'utf8');
  for(const feature of ['lr=s(Z,{defaultMessage:"{count} selected",id:"NKPfmmHQdx",values:{count:wn}})','ed.set(r,{input:e,sortBy:t,orgUuid:n})','fu="__gb__4293940309"','"data-cds-part":"tabs-status"','codeScoped:!0,renderCodeRowActions:xd'])assert.ok(official.includes(feature),feature);
  const row=fs.readFileSync(new URL('../src/generated/code-current/sessions-page-row.mjs',import.meta.url),'utf8');
  assert.ok(row.includes('"truncate text-footnote text-muted-as-secondary"'));assert.ok(row.includes('"text-caption text-muted-as-secondary max-w-40 truncate"'));
  // Old 2.37337.1 names are reused for other values in 2.42304.0; no consumer may import them any more.
  for(const file of ['sessions-page-view.mjs','sessions-page-tabs.mjs','sessions-page-row.mjs']){
    const text=fs.readFileSync(new URL(`../src/generated/code-current/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(text,/import \{[^}]*\b(gu|_u|vu|yu|bu)\b[^}]*\} from "\.\/sessions-page-copy\.mjs"/);
  }
});
test('closed GrowthBook gate and unreachable stand-ins match the Code page branches',async()=>{
  const Bulk=await server.ssrLoadModule('/src/generated/code-current/sessions-page-bulk-actions.mjs');
  const Bar=await server.ssrLoadModule('/src/generated/code-current/sessions-page-selection-bar.mjs');
  assert.equal(Bulk.sessionsPageBulkMenuEnabled(),false);assert.equal(Bulk.sessionsPageBulkMenuEnabled(true),false);
  const actions=renderToStaticMarkup(React.createElement(Bulk.SessionsPageBulkActions,{disabled:false,onArchive(){},onUnarchive(){},onDelete(){}}));
  assert.match(actions,/>Archive<.*>Unarchive<.*>Delete</s);
  assert.equal(Bar.sessionsPageSelectionHiddenClass('tabs'),'@max-[540px]:hidden');assert.equal(Bar.sessionsPageSelectionHiddenClass('title'),'@max-[700px]:hidden');
  const child=React.createElement('span',null,'kept');assert.equal(Bar.SessionsPageSelectionLead({lead:undefined,children:child}),child);
  // Bn (cbd6c85c8 `ui as Bn`, shared-frame wA) is view-tabs CdsCheckbox itself (R3-graph D24).
  const Adapters=await server.ssrLoadModule('/src/source-sessions-adapters.jsx'),Frame=await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  assert.equal(Adapters.SessionsSelectionCheckbox,Frame.CdsCheckbox);
  const status=renderToStaticMarkup(React.createElement(Bar.SessionsPageTabsSelectionStatus,{selectedCount:1,selectableCount:2,countText:'1 selected'}));
  assert.match(status,/data-cds-part="tabs-status"/);assert.match(status,/role="checkbox"[^>]*aria-checked="mixed"[^>]*data-cds="Checkbox"/);
  assert.match(status,/aria-label="Select all"/);assert.match(status,/ms-3 truncate @max-\[116px\]:sr-only">1 selected</);
  const none=renderToStaticMarkup(React.createElement(Bar.SessionsPageTabsSelectionStatus,{selectedCount:0,selectableCount:0,countText:'0 selected'}));
  assert.match(none,/role="checkbox"[^>]*aria-checked="false"/);assert.match(none,/aria-disabled="true"|data-disabled=""/);
  assert.throws(()=>renderToStaticMarkup(React.createElement(Adapters.SessionsBulkMenuUnavailable)),/not reachable on the Code Sessions page/);
});
test('page shell passes the cd75b47e6 banner through to the original page header',()=>{
  const html=renderToStaticMarkup(React.createElement(Primitives.SessionsPageShell,{title:'Sessions',banner:React.createElement('div',{id:'shell-banner'},'Banner text')},React.createElement('p',null,'Body')));
  assert.match(html,/id="shell-banner">Banner text</);assert.match(html,/<div class="flex flex-1 flex-col" style="--list-header-scroll-offset:var\(--cds-page-header-scroll-offset\)"><p>Body<\/p>/);
  assert.doesNotMatch(html,/data-scrolls-under-page-header/);
});
