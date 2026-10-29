import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parsers} from '../../tools/node_modules/prettier/plugins/babel.mjs';
import {renderToStaticMarkup as renderServerMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {sessionsPageRoute,isSessionsPageRoute,replaceSessionsPageSurface,sessionsPageSearch,sessionsPageSurfaceFromHref,mirrorSessionsPageHistoryKey} from '../src/sessions-page-navigation.mjs';
import {readSessionsPageSearch,rememberSessionsPageSearch,clearSessionsPageSearches,registerSessionsPageReset,sessionsPageAccountScope} from '../src/sessions-page-search-state.mjs';
import {buildSidebarGroups} from '../src/sidebar-model.js';
import {sessionPageRows,sessionPageRecords,sessionIdFromPageHref,sessionPageHref} from '../src/sessions-page-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';
// w10-ccres-hf-host: the Code Sessions page renders the generated 3.6556.2 cbd6c85c8 Hf whole (src/generated/sessions-page,
// re-exported by code-current/sessions-page-view.mjs) over SessionsPageHfHost; these tests drive the host's side of it.
let server,Host,View,Hf,Adapters,LoadHold,Controls,Row,Primitives,SearchState;
before(async()=>{
  server=await createServer({configFile:false,root:new URL('..',import.meta.url).pathname,plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
  Host=await server.ssrLoadModule('/src/source-sessions-page.jsx');
  View=await server.ssrLoadModule('/src/generated/code-current/sessions-page-view.mjs');
  Hf=await server.ssrLoadModule('/src/generated/sessions-page/sessions-page-hf.mjs');
  Adapters=await server.ssrLoadModule('/src/source-sessions-page-hf-adapters.jsx');
  LoadHold=await server.ssrLoadModule('/src/generated/code-current/sessions-page-load-hold.mjs');
  Controls=await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-controls.mjs');
  Row=await server.ssrLoadModule('/src/generated/code-current/sessions-page-row.mjs');
  Primitives=await server.ssrLoadModule('/src/source-sessions-primitives.jsx');
  SearchState=await server.ssrLoadModule('/src/sessions-page-search-state.mjs');
});after(()=>server?.close());
const now=Date.now(),sessions=[{id:'live',name:'Live task',updatedAtMs:now},{id:'old',name:'Old task',updatedAtMs:now-1000},{id:'archive',name:'Stored task',archived:true,updatedAtMs:now+1000}];
const ids=rows=>rows.map(r=>r.ref.id);
const v3=name=>fs.readFileSync(new URL(`../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/${name}`,import.meta.url),'utf8');
// 3.6556.2 view-tabs c9c7785eb (CdsSelectableTable, official c9c7785eb-D_0oAvkh.js): the selection cell reads the row's
// selection with useSyncExternalStore(subscribe, getSnapshot) and no server snapshot (`return i(n,r)`), so the desktop
// renders the table on the client only and react-dom/server throws "Missing getServerSnapshot". renderToStaticMarkup is
// read here the way a client render reads it: while react-dom/server's dispatcher is installed, the store falls back to
// getSnapshot (the same value a client's first render takes).
const renderToStaticMarkup=element=>{
  const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,descriptor=Object.getOwnPropertyDescriptor(internals,'H'),wrapped=new WeakMap();
  let raw=internals.H;
  const wrap=d=>{if(!d?.useSyncExternalStore)return d;if(!wrapped.has(d))wrapped.set(d,{...d,useSyncExternalStore:(subscribe,get,server)=>d.useSyncExternalStore(subscribe,get,server??get)});return wrapped.get(d);};
  Object.defineProperty(internals,'H',{configurable:true,enumerable:descriptor.enumerable,get:()=>wrap(raw),set:d=>{raw=d;}});
  try{return renderServerMarkup(element);}finally{Object.defineProperty(internals,'H',{...descriptor,value:raw});}
};
const page=props=>renderToStaticMarkup(React.createElement(Host.SourceSessionsPage,props));
test('page scopes active and archived records and sorts each by original update comparator',()=>{
  assert.deepEqual(ids(sessionPageRows(sessions)),['live','old']);assert.deepEqual(ids(sessionPageRows(sessions,{surface:'archived'})),['archive']);
  assert.deepEqual(ids(sessionPageRows([...sessions,sessions[0],null])),['live','old']);assert.equal(sessions[0].source,undefined);
  // Hf gets every record once (shared-11 GC `sessions`) and lists them itself.
  assert.deepEqual(ids(sessionPageRecords([...sessions,sessions[0],null])),['live','old','archive']);
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
  const html=page({sessions,onSessionMenu(){}});
  assert.match(html,/data-cds="Page"/);assert.match(html,/<h1[^>]*>Sessions<\/h1>/);assert.match(html,/role="tablist"/);assert.match(html,/>Active</);assert.match(html,/>Archived</);
  assert.match(html,/<table/);assert.match(html,/Live task/);assert.doesNotMatch(html,/Stored task/);
  assert.doesNotMatch(html,/>Select<|>Deselect all<|>Delete selected/);
  // cbd6c85c8 Bf: the row link is the router link with data-primary, under codeRowLinkComponent's wrapper.
  assert.match(html,/<span class="contents"><a data-primary="true" aria-label="Live task" class="[^"]*" href="#code-session\/live">/);
  assert.match(html,/data-cds="RelativeTime"/);assert.match(html,/aria-label="More options for Live task"/);
  // Hf slot 441: the primary New session is a CDS Button link (`href: m ? k : "/new"`, k = shared-52 Jx = "/code").
  assert.match(html,/<a data-cds="Button"[^>]*class="[^"]* df-link-card" href="\/code"[^>]*><span[^>]*>.*?<\/span><span class="inline-flex min-w-0 items-center gap-1 ">New session<\/span><\/a>/);
  // Hf slot 486: the panel wraps the table and is labelled by the selected tab.
  assert.match(html,/<div id="([^"]+)-panel" role="tabpanel" aria-labelledby="\1-code" class="flex flex-col">/);
});
test('archived page renders only archived records without the mixed-list archive badge',()=>{
  // Hf bi: showArchivedBadge is `we && ia(e)` and we = q && H === "all" && !T; the Code page is text-first
  // (T = kt() || codeScoped), so the badge (data-cds="Badge") never shows there.
  const html=page({sessions,initialSurface:'archived'});
  assert.match(html,/Stored task/);assert.doesNotMatch(html,/Live task/);assert.doesNotMatch(html,/data-cds="Badge"/);
  assert.match(html,/aria-selected="true" id="[^"]*-archived"/);
});
test('page uses the muted-as-secondary token and keeps tabs visible without a selection',()=>{
  const html=page({sessions,initialSurface:'archived'});
  const root=html.match(/<div[^>]*data-cds="Tabs"[^>]*>/)?.[0];assert.ok(root);assert.doesNotMatch(root,/invisible|aria-hidden/);assert.match(html,/role="tablist"/);
  assert.doesNotMatch(html,/data-cds-part="tabs-status"/);assert.doesNotMatch(html,/\{count\} selected|selected</);
  // 3.6556.2 Hf slot 339: the empty paragraph gained "whitespace-normal wrap-anywhere".
  assert.match(page({}),/<p class="text-body text-muted-as-secondary whitespace-normal wrap-anywhere">Sessions you start will show up here\./);
  // Slot 446 (`q && !Ke && (m || …)`): with a query the Code page says what search covers.
  const hf=fs.readFileSync(new URL('../src/generated/sessions-page/sessions-page-hf.mjs',import.meta.url),'utf8');
  assert.ok(hf.includes('className: "text-body text-muted-as-secondary mb-2",\n              children: a(Y, {\n                defaultMessage: "Search covers the titles shown.",'));
});
test('empty/loading views use original source copy and nine skeleton rows',()=>{
  assert.match(page({}),/Sessions you start will show up here\./);
  assert.match(page({initialSurface:'archived'}),/Archived sessions will show up here\./);
  // E20: the host's loading is Hf's code list loading (isInitialLoading / isCodeLoading → load hold → table isLoading).
  const pending=page({loading:true});assert.match(pending,/aria-busy="true"/);assert.doesNotMatch(pending,/Sessions you start will show up here/);
  assert.equal((pending.match(/box-content flex min-h-9/g)??[]).length,9);
  // je is false on the Code page: no load banner and no "Sessions loaded." status, even when the load failed.
  assert.doesNotMatch(page({loadFailed:true}),/Couldn’t load|Sessions loaded\.|Try again/);
});
function nodes(tree,predicate){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(n=>nodes(n,predicate));return [...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];}
function fixture(component,props={},contexts=new Map()){
  let cursor=0,tree;const cells=[],effects=[],same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={useContext:c=>contexts.has(c)?contexts.get(c):c._currentValue,useId:()=>':page:',useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,value=>{cells[i].value=typeof value==='function'?value(cells[i].value):value;}];},
    useReducer(reducer,initialArg,init){const i=cursor++;if(!cells[i]){const cell={value:init?init(initialArg):initialArg};cell.dispatch=action=>{cell.value=reducer(cell.value,action);};cells[i]=cell;}return [cells[i].value,cells[i].dispatch];},
    useRef(initial){const i=cursor++;cells[i]??={value:{current:initial}};return cells[i].value;},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const previous=cells[i];cells[i]={deps};effects.push(()=>{previous?.cleanup?.();cells[i].cleanup=fn();});}},
    // React 19 useEffectEvent: a stable function that calls the latest callback.
    useEffectEvent(fn){const i=cursor++;cells[i]??={value:null,call:(...args)=>cells[i].value(...args)};cells[i].value=fn;return cells[i].call;},
    useSyncExternalStore:(subscribe,get)=>get(),useDebugValue(){},useTransition:()=>[false,fn=>fn()],useDeferredValue:value=>value,
  };
  hooks.useLayoutEffect=hooks.useEffect;hooks.useInsertionEffect=hooks.useEffect;
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H=withMemoCache(hooks);try{return tree=component(props);}finally{internal.H=old;}};
  render();return {get tree(){return tree;},render,flush(){while(effects.length)effects.shift()();},close(){cells.forEach(c=>c.cleanup?.());}};
}
const hostValue=f=>nodes(f.tree,n=>n.props?.value?.router)[0].props.value;
const hfProps=f=>nodes(f.tree,n=>n.type===View.SessionsPageView)[0].props;
test('the page view is the generated Hf, rendered with the Code page props',()=>{
  assert.equal(View.SessionsPageView,Hf.SessionsPageHf);
  const f=fixture(Host.SourceSessionsPage,{sessions,onSessionMenu(){}});const props=hfProps(f);
  assert.deepEqual([props.codeScoped,props.reportsRecentsLoad,props.codeRowLinkComponent],[true,false,Host.SessionsPageCodeRowLink]);
  assert.equal(typeof props.renderCodeRowActions,'function');
  const value=hostValue(f);assert.deepEqual(ids(value.list.sessions),['live','old','archive']);assert.equal(value.search,'');assert.equal(value.pathname,'/sessions');
  assert.equal(value.getRowHref({kind:'code',id:'live'}),'#code-session/live');assert.equal(value.linkComponent,Host.SessionsPageLink);
  assert.deepEqual([value.list.isInitialLoading,value.list.isCodeLoading,value.list.isCodeLoadError],[false,false,false]);
  const loading=fixture(Host.SourceSessionsPage,{loading:true,loadFailed:true});
  assert.deepEqual([hostValue(loading).list.isInitialLoading,hostValue(loading).list.isCodeLoading,hostValue(loading).list.isCodeLoadError],[true,true,true]);
  f.close();loading.close();
});
test('tab events replace the route surface and the host keeps the Archived tab',()=>{
  // Hf nf: `r === "all" ? i.delete(Qd) : i.set(Qd, r)` then `e.replace(\`${t}${a ? \`?${a}\` : ""}\`, { scroll: !1 })`.
  const hf=fs.readFileSync(new URL('../src/generated/sessions-page/sessions-page-hf.mjs',import.meta.url),'utf8');
  assert.ok(hf.includes('r === "all" ? i.delete(Qd) : i.set(Qd, r);'));assert.ok(hf.includes('e.replace(`${t}${a ? `?${a}` : ""}`, { scroll: !1 });'));
  assert.ok(hf.includes('(ee(t), te(t === P ? "all" : t))'));
  const changes=[],f=fixture(Host.SourceSessionsPage,{sessions,onSurfaceChange:surface=>changes.push(surface)});
  hostValue(f).router.replace('/sessions?surface=archived');f.render();
  assert.deepEqual(changes,['archived']);assert.equal(hostValue(f).search,'surface=archived');
  hostValue(f).router.replace('/sessions');f.render();assert.deepEqual(changes,['archived','code']);assert.equal(hostValue(f).search,'');
  assert.equal(sessionsPageSurfaceFromHref('/sessions?surface=chat'),'code');assert.equal(sessionsPageSearch('code'),'');f.close();
});
test('New session and row More forward host callbacks with keyboard entry',()=>{
  let newCount=0,opened;const f=fixture(Host.SourceSessionsPage,{sessions,onNew:()=>newCount++,onSessionMenu:(...args)=>opened=args});
  const container=nodes(f.tree,n=>n.props?.className==='source-sessions-page')[0];let prevented=0;
  const click=href=>container.props.onClick({target:{closest:()=>({getAttribute:()=>href})},preventDefault:()=>prevented++});
  click('/code');assert.equal(newCount,1);assert.equal(prevented,1);
  click('#code-session/live');assert.equal(newCount,1);assert.equal(prevented,1);
  hostValue(f).router.push('/code');assert.equal(newCount,2);
  const actions=hfProps(f).renderCodeRowActions(sessionPageRecords(sessions)[0].source.data);
  const more=actions.props.children,anchor={};
  assert.equal(more.props['aria-label'],'More options for Live task');
  more.props.onClick({currentTarget:anchor,detail:0});assert.deepEqual(opened,[sessions[0],anchor,'first']);
  // The row link's context menu (Qu's contextMenuTrigger) opens the same host session menu at the row link.
  const menu=f.tree.props.children,link={};
  const wrapper=fixture(Host.SessionsPageCodeRowLink,{item:sessionPageRecords(sessions)[1].source.data,link:'row'},new Map([[menu.type,menu.props.value]]));
  assert.equal(wrapper.tree.props.className,'contents');assert.equal(wrapper.tree.props.children,'row');
  let stopped=0;wrapper.tree.props.onContextMenu({preventDefault:()=>stopped++,target:{closest:()=>link},currentTarget:{}});
  assert.equal(stopped,1);assert.deepEqual(opened,[sessions[1],link,undefined]);
  assert.equal(fixture(Host.SourceSessionsPage,{sessions}).tree.props.children.props.value,null,'no host menu, no row actions');
  assert.equal(hfProps(fixture(Host.SourceSessionsPage,{sessions})).renderCodeRowActions(sessionPageRecords(sessions)[0].source.data),null);
  f.close();
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
  assert.equal(link.tree.props['data-primary'],true);
  link.tree.props.onClick(event);assert.equal(event.defaultPrevented,true);assert.equal(opened[0][0],'local/a b');
  link.tree.props.onClick({defaultPrevented:true});assert.equal(opened.length,1);parent.close();
});
test('original row applies Unicode-aware highlighting and exposes live state from engine records',()=>{
  // Hf's renderContent is `a(dp, { session, lowerQuery: On, … textFirstRows: T })`, dp the code-current row it imports.
  const hf=fs.readFileSync(new URL('../src/generated/sessions-page/sessions-page-hf.mjs',import.meta.url),'utf8');
  assert.match(hf,/import \{ SessionsPageRow as dp \} from "\.\.\/code-current\/sessions-page-row\.mjs";/);
  const [row]=sessionPageRows([{id:'unicode',name:'İstanbul task',updatedAtMs:now}],{state:{active:{unicode:'turn'}}});
  const html=renderToStaticMarkup(React.createElement(Row.SessionsPageRow,{session:row,lowerQuery:'i̇stanbul',showArchivedBadge:false,textFirstRows:true}));
  assert.match(html,/font-semibold text-primary">İstanbul/);assert.match(html,/Running/);
});
test('an open session menu keeps its original trigger expanded',()=>{
  const f=fixture(Host.SourceSessionsPage,{sessions,menuSessionId:'live',onSessionMenu(){}}),[live,old]=sessionPageRecords(sessions);
  assert.equal(hfProps(f).renderCodeRowActions(live.source.data).props.children.props['aria-expanded'],true);
  assert.equal(hfProps(f).renderCodeRowActions(old.source.data).props.children.props['aria-expanded'],false);f.close();
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
// cov11-02 through Hf's own store: Tf (window-wide Map) keyed by the shown entry's key, read from
// window.history.state.__TSR_key (shared-5 zk) at mount and written only for that entry (Ef `r !== null && r === Jn()`).
function withWindow(fn){
  const saved=Object.getOwnPropertyDescriptor(globalThis,'window');
  const win={history:{state:null,replaceState(state){this.state=state;}},navigator:{userAgent:'node'},addEventListener(){},removeEventListener(){}};
  Object.defineProperty(globalThis,'window',{configurable:true,writable:true,value:win});
  try{return fn(win);}finally{if(saved)Object.defineProperty(globalThis,'window',saved);else delete globalThis.window;}
}
function mountHf(props){
  const host=fixture(Host.SourceSessionsPage,props),contexts=new Map([[Adapters.SessionsPageHfHost,hostValue(host)]]),hf=fixture(View.SessionsPageView,hfProps(host),contexts);
  // rerender: the host renders again, then Hf under the host value it now provides (as React renders parent, then child).
  return {host,hf,get search(){return hf.tree.props.search;},rerender(){host.render();contexts.set(Adapters.SessionsPageHfHost,hostValue(host));hf.render();},close(){hf.close();host.close();}};
}
test('cov11-02: search and sort come back only when Back/Forward returns to the same history entry',()=>withWindow(win=>{
  const entry=sessionsPageRoute('code'),props={sessions,scopeKey:'restore-test',historyKey:entry.key};
  const first=mountHf(props);assert.equal(win.history.state.__TSR_key,`restore-test\u0000${entry.key}`);first.hf.flush();
  first.search.onChange('old');first.hf.render();first.hf.flush();
  first.search.expandedActions.props.items[1].onSelect();first.hf.render();first.hf.flush();first.close();
  const back=mountHf(props);assert.equal(back.search.value,'old');assert.equal(back.search.autoFocusHeldQuery,false);
  assert.equal(back.search.expandedActions.props.items[1].checked,true);back.close();
  const visit=mountHf({...props,historyKey:sessionsPageRoute('code').key});assert.equal(visit.search.value,'');assert.equal(visit.search.autoFocusHeldQuery,true);
  assert.equal(visit.search.expandedActions.props.items[0].checked,true);visit.close();
  // The key is scoped by the local engine (Hf scopes by orgUuid): another engine's entry starts empty.
  const other=mountHf({...props,scopeKey:'other-engine'});assert.equal(other.search.value,'');other.close();
  const clear=mountHf(props);clear.hf.flush();assert.equal(clear.search.value,'old');clear.search.onChange(' ');clear.hf.render();clear.hf.flush();clear.close();
  const cleared=mountHf(props);assert.equal(cleared.search.value,'');cleared.close();
  // Without an entry key the mirror is removed, so no other entry's search comes back and nothing is written.
  const keep=mountHf(props);keep.hf.flush();keep.search.onChange('live');keep.hf.render();keep.hf.flush();keep.close();
  const loose=mountHf({sessions,scopeKey:'restore-test'});assert.equal('__TSR_key' in win.history.state,false);assert.equal(loose.search.value,'');loose.close();
  assert.equal(mountHf(props).search.value,'live');
}));
test('cov11-02: a tab change replaces the entry key and the shown page keeps writing under the new key',()=>withWindow(win=>{
  let history=[sessionsPageRoute('code')];const firstKey=history[0].key;
  const props={sessions,scopeKey:'replace-test',historyKey:firstKey,onSurfaceChange:surface=>{history=replaceSessionsPageSurface(history,0,surface);}};
  const shown=mountHf(props);shown.hf.flush();shown.search.onChange('stored');shown.hf.render();shown.hf.flush();
  hostValue(shown.host).router.replace('/sessions?surface=archived');assert.equal(history[0].surface,'archived');assert.notEqual(history[0].key,firstKey);
  props.historyKey=history[0].key;shown.rerender();assert.equal(win.history.state.__TSR_key,`replace-test\u0000${history[0].key}`);
  shown.hf.flush();shown.close();
  const back=mountHf({...props,initialSurface:history[0].surface});assert.equal(back.search.value,'stored');back.close();
  assert.equal(mountHf({...props,historyKey:firstKey}).search.value,'stored','the old entry kept what it held when it was left');
}));
test('cov11-02: engine or account changes empty Hf\'s own Tf (cbd6c85c8 J(() => Tf.clear()) via shared-52 Xi)',()=>withWindow(()=>{
  const entry=sessionsPageRoute('code'),props={sessions,scopeKey:'reset-test',historyKey:entry.key};
  const first=mountHf(props);first.hf.flush();first.search.onChange('old');first.hf.render();first.hf.flush();first.close();
  const kept=mountHf(props);assert.equal(kept.search.value,'old');kept.close();
  // The app's module instance (the one main.jsx and the generated Hf's adapter share), loaded the way Hf is.
  SearchState.clearSessionsPageSearches();
  const cleared=mountHf(props);assert.equal(cleared.search.value,'','the same entry no longer brings the search back');cleared.close();
  // The registry is the shared-52 Xi shape: a callback per store, an unregister function back.
  let calls=0;const unregister=registerSessionsPageReset(()=>calls++);clearSessionsPageSearches();assert.equal(calls,1);
  unregister();clearSessionsPageSearches();assert.equal(calls,1);
}));
test('cov11-02: the history key mirror only touches __TSR_key',()=>{
  const win={history:{state:{other:1},calls:0,replaceState(state){this.calls++;this.state=state;}}};
  mirrorSessionsPageHistoryKey('k',win);assert.deepEqual(win.history.state,{other:1,__TSR_key:'k'});
  mirrorSessionsPageHistoryKey('k',win);assert.equal(win.history.calls,1);
  mirrorSessionsPageHistoryKey(null,win);assert.deepEqual(win.history.state,{other:1});mirrorSessionsPageHistoryKey(undefined,win);assert.equal(win.history.calls,2);
  mirrorSessionsPageHistoryKey('k',undefined);
});
test('cov11-02: engine or account changes clear the host search store (be(() => ed.clear()))',()=>{
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
test('sessions-page helpers come from cbd6c85c8 (3.6556.2 Hf) and its neighbours with semantic exports',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../src/generated/code-current/manifest.json',import.meta.url),'utf8'));
  const entries=Object.fromEntries(manifest.modules.filter(m=>m.target.startsWith('sessions-page-')).map(m=>[m.target,m]));
  const page3='cbd6c85c8-D1xuycDy.js',V3='3.6556.2',expected={
    'sessions-page-band.mjs':['shared-18-D3y8YMFN.js',['mb']],'sessions-page-load-deadline.mjs':['shared-20-mUr7IqZY.js',['$w']],
    'sessions-page-load-hold.mjs':[page3,['$u','ed']],'sessions-page-live-status.mjs':['shared-8-Db1QN4mf.js',['mb']],
    'sessions-page-model.mjs':['shared-11-_AVGLHEz.js',['dw','SC','cw','jC','AC','fw','pw']],'sessions-page-copy.mjs':[page3,['Af','jf','Mf','Nf','Pf']],
    'sessions-page-coordinator.mjs':['shared-26-CGuBxVt9.js',['qj','Jj']],'sessions-page-awaiting-label.mjs':['shared-18-D3y8YMFN.js',['kA']],
    'sessions-page-selection-bar.mjs':[page3,['Gd','Kd','qd','Jd','Yd']],'sessions-page-bulk-actions.mjs':[page3,['cd','Dd','Od','kd','Ad']],
    // w10-ccres-hf-host: the view re-exports the whole sliced Hf; the tabs / count-text / empty / search pieces are retired.
    'sessions-page-view.mjs':[page3,[]],'sessions-page-row.mjs':[page3,['dp','fp','pp']]};
  assert.deepEqual(Object.keys(entries).sort(),Object.keys(expected).sort());
  for(const [target,[file,bindings]] of Object.entries(expected)){
    const entry=entries[target];assert.equal(entry.referenceVersion,V3,target);assert.equal(entry.source.split('/').pop(),file,target);assert.deepEqual(entry.bindings,bindings,target);
  }
  // No code-current Sessions target reads 2.42304.0 any more.
  assert.equal(manifest.modules.filter(m=>m.target.startsWith('sessions-page-')&&m.referenceVersion!==V3).length,0);
  for(const name of ['tabs','count-text','empty','search'])assert.equal(fs.existsSync(new URL(`../src/generated/code-current/sessions-page-${name}.mjs`,import.meta.url)),false,name);
  const view=fs.readFileSync(new URL('../src/generated/code-current/sessions-page-view.mjs',import.meta.url),'utf8');
  assert.equal(view,'// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n\nexport { SessionsPageHf as SessionsPageView } from "../sessions-page/sessions-page-hf.mjs";\n');
  assert.equal(entries['sessions-page-view.mjs'].sha256,createHash('sha256').update(view).digest('hex'));
  const pages=JSON.parse(fs.readFileSync(new URL('../src/generated/sessions-page/manifest.json',import.meta.url),'utf8'));
  const page3Text=v3(page3);
  assert.equal(pages.root,`${page3}:Hf`);assert.equal(pages.modules.find(m=>m.target==='sessions-page-hf.mjs').sourceSha256,createHash('sha256').update(page3Text).digest('hex'));
  // The official Code page: gp renders Hf with codeScoped, hp row actions and Qu on the desktop.
  for(const feature of ['a(Hf,{codeScoped:!0,renderCodeRowActions:hp,codeRowLinkComponent:l?Qu:void 0})','function hp(e){return a(Xu,{item:e})}',
    'function Hf(e){let $=J9(537),{reportsRecentsLoad:t,codeScoped:n,renderCodeRowActions:o,codeRowLinkComponent:u}',
    'function ed(e){return e??"deadline"}','f(ed)},Math.max(0,t))','maxMs:a,backstopMs:o}=e,s=a===void 0?800:a,c=o===void 0?fi:o','or as fi,',
    'function Kd(e){return Gd[e].hidden}','header:"tabs","data-cds-part":"tabs-status"','{disabled:t,unarchiving:n,onUnarchive:r}=e',
    'defaultMessage:"Unarchiving\\u2026",id:"jBQAwvukAZ"','className:"text-body text-muted-as-secondary whitespace-normal wrap-anywhere"',
    'inputRef:Ma,onExpandedChange:Pa','codeRowLinkComponent:u','function Qf(e){return e.ref.kind!=="code"}','function pp(e){if(e.ref.kind==="chat")return Tr(e.awaitingKind)'])assert.ok(page3Text.includes(feature),feature);
  assert.match(page3Text,/import\{[^}]*\bor as fi,[^}]*\}from"\.\/shared-20-mUr7IqZY\.js"/);
  assert.ok(v3('shared-20-mUr7IqZY.js').includes('$w=1e4;function eT(e){return e.environmentId?'));assert.ok(v3('shared-20-mUr7IqZY.js').includes('$w as or'));
  const hold=fs.readFileSync(new URL('../src/generated/code-current/sessions-page-load-hold.mjs',import.meta.url),'utf8');
  assert.match(hold,/^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);assert.match(hold,/from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js"/);assert.match(hold,/reactMemoCache as J9/);
  const row=fs.readFileSync(new URL('../src/generated/code-current/sessions-page-row.mjs',import.meta.url),'utf8');
  assert.ok(row.includes('"truncate text-footnote text-muted-as-secondary"'));assert.ok(row.includes('"text-caption text-muted-as-secondary max-w-40 truncate"'));
  const generated=name=>fs.readFileSync(new URL(`../src/generated/code-current/sessions-page-${name}.mjs`,import.meta.url),'utf8');
  for(const name of ['selection-bar','bulk-actions','row']){
    const text=generated(name);assert.match(text,/^\/\/ Original Claude Desktop 3\.6556\.2 bindings/,name);
    assert.doesNotMatch(text,/view-tabs\/index\.js/,name);
  }
  assert.match(generated('selection-bar'),/import \{ CdsCheckbox as R \} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js"|CdsCheckbox as R,/);
  assert.match(generated('row'),/import \{ CdsRelativeTime as Hn \} from "\.\.\/view-tabs\/shared-2-TF8v67kg\.js"/);
  // Old 2.37337.1 names are reused for other values in 2.42304.0; no consumer may import them any more.
  assert.doesNotMatch(generated('row'),/import \{[^}]*\b(gu|_u|vu|yu|bu)\b[^}]*\} from "\.\/sessions-page-copy\.mjs"/);
  // The host renders Hf through code-current and no longer imports the gd-era pieces.
  const host=fs.readFileSync(new URL('../src/source-sessions-page.jsx',import.meta.url),'utf8');
  assert.match(host,/import \{SessionsPageView\} from '\.\/generated\/code-current\/sessions-page-view\.mjs';/);
  assert.doesNotMatch(host,/sessions-page-(tabs|count-text|empty|search|row|load-hold|bulk-actions)\.mjs|source-sessions-primitives/);
});
test('closed GrowthBook gate and unreachable stand-ins match the Code page branches',async()=>{
  const Bulk=await server.ssrLoadModule('/src/generated/code-current/sessions-page-bulk-actions.mjs');
  const Bar=await server.ssrLoadModule('/src/generated/code-current/sessions-page-selection-bar.mjs');
  assert.equal(Bulk.sessionsPageBulkMenuEnabled(),false);assert.equal(Bulk.sessionsPageBulkMenuEnabled(true),false);
  const actions=renderToStaticMarkup(React.createElement(Bulk.SessionsPageBulkActions,{disabled:false,onArchive(){},onUnarchive(){},onDelete(){}}));
  assert.match(actions,/>Archive<.*>Unarchive<.*>Delete</s);
  assert.equal(Bar.sessionsPageSelectionHiddenClass('tabs'),'@max-[540px]:hidden');assert.equal(Bar.sessionsPageSelectionHiddenClass('title'),'@max-[700px]:hidden');
  // 3.6556.2 Yd opens with its compiler cache (J9(5)), so it renders under a dispatcher; without a lead it returns the children.
  const child=React.createElement('span',null,'kept');assert.equal(fixture(Bar.SessionsPageSelectionLead,{lead:undefined,children:child}).tree,child);
  // 3.6556.2 Ad: while unarchiving the button is not disabled (o = t && !n) but busy, labelled "Unarchiving…" for the
  // CDS Button's busy announcement (the SSR markup shows aria-busy and the spinner; the label stays under it).
  const unarchive=fixture(Bulk.SessionsPageBulkActions,{disabled:true,unarchiving:true,onUnarchive(){}}).tree.props.children[1];
  const button=fixture(unarchive.type,unarchive.props).tree;
  assert.deepEqual([button.props.disabled,button.props.busy,button.props.busyLabel],[false,true,'Unarchiving…']);
  const busy=renderToStaticMarkup(React.createElement(Bulk.SessionsPageBulkActions,{disabled:true,unarchiving:true,onUnarchive(){}}));
  assert.match(busy,/aria-busy="true"/);assert.match(busy,/data-cds="Spinner"/);assert.doesNotMatch(busy,/<button[^>]*\sdisabled=""/);
  const SessionsAdapters=await server.ssrLoadModule('/src/source-sessions-adapters.jsx');
  const status=renderToStaticMarkup(React.createElement(Bar.SessionsPageTabsSelectionStatus,{selectedCount:1,selectableCount:2,countText:'1 selected'}));
  assert.match(status,/data-cds-part="tabs-status"/);assert.match(status,/role="checkbox"[^>]*aria-checked="mixed"[^>]*data-cds="Checkbox"/);
  assert.match(status,/aria-label="Select all"/);assert.match(status,/ms-3 truncate @max-\[116px\]:sr-only">1 selected</);
  const none=renderToStaticMarkup(React.createElement(Bar.SessionsPageTabsSelectionStatus,{selectedCount:0,selectableCount:0,countText:'0 selected'}));
  assert.match(none,/role="checkbox"[^>]*aria-checked="false"/);assert.match(none,/aria-disabled="true"|data-disabled=""/);
  assert.throws(()=>renderToStaticMarkup(React.createElement(SessionsAdapters.SessionsBulkMenuUnavailable)),/not reachable on the Code Sessions page/);
});
test('page shell passes the cd75b47e6 banner through to the original page header',()=>{
  const html=renderToStaticMarkup(React.createElement(Primitives.SessionsPageShell,{title:'Sessions',banner:React.createElement('div',{id:'shell-banner'},'Banner text')},React.createElement('p',null,'Body')));
  assert.match(html,/id="shell-banner">Banner text</);assert.match(html,/<div class="flex flex-1 flex-col" style="--list-header-scroll-offset:var\(--cds-page-header-scroll-offset\)"><p>Body<\/p>/);
  assert.doesNotMatch(html,/data-scrolls-under-page-header/);
});
