import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

let server, Sidebar, Search, Host, Groups, View, Order, Sections;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  Search = await server.ssrLoadModule('/src/generated/code-current/sidebar-search.mjs');
  Host = await server.ssrLoadModule('/src/source-sidebar-current-adapters.jsx');
  Groups = await server.ssrLoadModule('/src/generated/code-current/sidebar-menu-groups.mjs');
  View = await server.ssrLoadModule('/src/generated/code-current/sidebar-group-view.mjs');
  Order = await server.ssrLoadModule('/src/generated/code-current/sidebar-menu-order.mjs');
  Sections = await server.ssrLoadModule('/src/source-sidebar-sections.jsx');
});
after(() => server?.close());

// Execute the real function components with controlled hook state and DOM
// contracts. No browser renderer, screenshots, Electron or core process.
function fixture(component, props = {}, contexts = new Map()) {
  const cells = [], effects = []; let cursor = 0, tree;
  const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const hooks = {
    useState(initial) { const i=cursor++; cells[i] ??= {value:typeof initial === 'function' ? initial() : initial}; return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next;}]; },
    useRef(initial) { return hooks.useState(()=>({current:initial}))[0]; },
    useMemo(fn,deps) { const i=cursor++; if(!cells[i] || !same(cells[i].deps,deps)) cells[i]={value:fn(),deps}; return cells[i].value; },
    useCallback(fn,deps) { return hooks.useMemo(()=>fn,deps); },
    useId() { return hooks.useMemo(()=>`fixture-${cursor}`,[]); },
    useContext(context) { return contexts.has(context) ? contexts.get(context) : context._currentValue; },
    useSyncExternalStore(_subscribe,snapshot,serverSnapshot) { return (serverSnapshot ?? snapshot)(); },
    useEffect(fn,deps) { const i=cursor++; if(!cells[i] || !same(cells[i].deps,deps)) { const old=cells[i]; cells[i]={deps}; effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();}); } },
  };
  hooks.useLayoutEffect=hooks.useEffect;
  const render=()=>{cursor=0;const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internals.H;
    internals.H=hooks;try {tree=component(props);}finally {internals.H=previous;}return tree;};
  render();return {get tree(){return tree;},render,flush:()=>{while(effects.length)effects.shift()();},close:()=>cells.forEach(c=>c.cleanup?.())};
}
function nodes(tree, predicate) {
  if(!tree || typeof tree!=='object')return [];
  if(Array.isArray(tree))return tree.flatMap(child=>nodes(child,predicate));
  return [...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];
}
const node=(tree,predicate)=>nodes(tree,predicate)[0];
const textOf=tree=>typeof tree==='string'?tree:Array.isArray(tree)?tree.map(textOf).join(''):textOf(tree?.props?.children ?? '');
const thread=(id,fields={})=>({id,name:id,cwd:'/repo',createdAt:1,updatedAt:1,...fields});

test('original search field opens default command palette, prevents focus theft, and exposes the command shortcut',()=>{
  const opened=[],contexts=new Map([[Host.SidebarSearchContext,{open:(...args)=>opened.push(args),shortcut:'cmd+k'}]]);
  const f=fixture(Search.SidebarSearchField,{},contexts),button=node(f.tree,n=>n.props?.className?.startsWith('df-search-field '));
  let prevented=false;button.props.onMouseDown({preventDefault(){prevented=true;}});button.props.onClick();
  assert.equal(prevented,true);assert.deepEqual(opened,[['default','sidebar_field']]);
  assert.equal(button.props['aria-keyshortcuts'],'Control+k');assert.equal(Host.sidebarShortcutAria('cmd+k',true),'Meta+k');
  assert.equal(button.props['data-roving-item'],'');assert.ok(node(f.tree,n=>n.props?.['data-row-label']===''));
  const html=renderToStaticMarkup(React.createElement(Host.SidebarSearchContext.Provider,{value:{shortcut:'cmd+k'}},React.createElement(Search.SidebarSearchField)));
  assert.match(html,/df-search-field-keys/);assert.match(html,/>Search<\/span>/);assert.doesNotMatch(html,/surface-sidebar-search|Meta\+Shift|title=/);
});
test('search placement follows the source gate truth table without suppressing Code',()=>{
  assert.deepEqual(Search.sidebarSearchPlacement(true,true,false),{fieldAboveNew:true,recentsHeaderIcon:false});
  assert.deepEqual(Search.sidebarSearchPlacement(true,false,false),{fieldAboveNew:false,recentsHeaderIcon:true});
  assert.deepEqual(Search.sidebarSearchPlacement(false,true,false),{fieldAboveNew:false,recentsHeaderIcon:false});
  assert.deepEqual(Search.sidebarSearchPlacement(false,false,true),{fieldAboveNew:false,recentsHeaderIcon:true});
});
test('Code keeps New above the scroller, with remaining navigation outside the session token scope',()=>{
  const html=renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,{sessions:[thread('pinned'),thread('normal')],sessionMetadata:{pinned:{pinned:true}},knownFolders:['/repo']}));
  const scroll=html.indexOf('<nav '),pins=html.indexOf('data-testid="nav-pin-rows"'),list=html.indexOf('class="df-session-list flex flex-col"');
  assert.ok(html.indexOf('df-search-field ') < html.indexOf('>New</span>'));
  assert.ok(html.indexOf('>New</span>') < scroll && scroll < pins && pins < html.indexOf('>Projects</span>'));
  assert.ok(html.indexOf('>Customize</span>') < list && list < html.indexOf('data-pinned-list=""'));
  assert.match(html,/<span[^>]*data-group-caret=""/);
  const css=readFileSync(new URL('../public/assets/v1/shared-styles-Bl9zqrv-.css',import.meta.url),'utf8');
  assert.match(css,/\[data-testid=nav-pin-rows\]\{padding-bottom:10px\}/);
  assert.match(css,/\.df-session-list\{--df-row-h:28px;--df-row-ctl:24px/);
  assert.match(css,/\[data-pinned-list\]\{--df-row-h:26px;--df-row-ctl:20px/);
});

function viewList({ visible=true, outsideFocus=false }={}) {
  const frames=[],focused=[],body={},doc={body,activeElement:null,defaultView:{requestAnimationFrame:fn=>frames.push(fn)}};
  const make=(id,expanded,inert=false)=>({id,expanded,visible:true,ownerDocument:doc,
    closest:()=>inert?{}:null,checkVisibility(){return this.visible;},compareDocumentPosition:()=>4,
    click(){this.expanded=!this.expanded;},focus(){focused.push(id);doc.activeElement=this;}});
  const a=make('a',true),b=make('b',true),c=make('c',false),ignored=make('inert',true,true),toggles=[a,b,c,ignored];
  const opener={isConnected:true,ownerDocument:doc,checkVisibility:()=>visible,closest:()=>null};doc.activeElement=outsideFocus?body:opener;
  const list={ownerDocument:doc,contains:e=>e===opener,querySelectorAll(selector){
    const match=selector.match(/aria-expanded="(true|false)"/);return match?toggles.filter(t=>t.expanded===(match[1]==='true')):toggles;
  }};
  return {list,toggles,a,b,c,ignored,opener,doc,focused,frames,setHidden:()=>{visible=false;doc.activeElement=body;}};
}
test('original group menu snapshots availability, skips inert toggles and collapses/expands the current list',()=>{
  const v=viewList({outsideFocus:true}),f=fixture(View.SidebarGroupViewItems,{},new Map([[View.SidebarListContext,{getList:()=>v.list}]]));
  const choices=nodes(f.tree,n=>n.type===Groups.SidebarMenuItem);
  assert.equal(choices.length,2);assert.equal(choices[0].props.children.props.defaultMessage,'Collapse all');
  choices[0].props.onClick();assert.equal(v.a.expanded,false);assert.equal(v.b.expanded,false);assert.equal(v.ignored.expanded,true);
  choices[1].props.onClick();assert.equal(v.a.expanded,true);assert.equal(v.b.expanded,true);assert.equal(v.c.expanded,true);
  v.a.visible=false;v.b.visible=false;v.c.visible=false;
  const empty=fixture(View.SidebarGroupViewItems,{},new Map([[View.SidebarListContext,{getList:()=>v.list}]]));
  assert.equal(nodes(empty.tree,n=>n.type===Groups.SidebarMenuItem).length,0,'invisible expanded groups do not enable Collapse all');
});
test('collapse restores the last visible preceding toggle only when opener vanished and no real focus replaced it',()=>{
  const previousNode=globalThis.Node;globalThis.Node={DOCUMENT_POSITION_FOLLOWING:4};
  try { for(const replacement of [false,true]) {
    const v=viewList(),f=fixture(View.SidebarGroupViewItems,{},new Map([[View.SidebarListContext,{getList:()=>v.list}]]));
    v.ignored.compareDocumentPosition=()=>0;v.c.compareDocumentPosition=()=>0;
    nodes(f.tree,n=>n.type===Groups.SidebarMenuItem)[0].props.onClick();v.setHidden();
    if(replacement)v.doc.activeElement={closest:()=>null};v.frames.forEach(fn=>fn());
    assert.deepEqual(v.focused,replacement?[]:['b']);
  }} finally {globalThis.Node=previousNode;}
});
test('original ordered groups register real rows, put separators only between occupied groups, and unregister on exit',()=>{
  const f=fixture(Groups.OrderedSidebarMenuGroups,{order:['new','edit','view','remove'],groups:{new:'new',edit:'edit',view:null,remove:'remove'}});
  const rows=[];
  for(const group of f.tree.filter(g=>g.props.id!=='view')) {
    const wrapper=fixture(group.type,group.props),provider=wrapper.tree;
    const row=fixture(Groups.RegisterSidebarMenuRow,{children:'row'},new Map([[provider.type,provider.props.value]]));row.flush();rows.push(row);
  }
  f.render();assert.deepEqual(f.tree.map(g=>[g.props.id,g.props.hasRows,g.props.separatorBefore]),[
    ['new',true,false],['edit',true,true],['view',false,false],['remove',true,true]]);
  rows[1].close();f.render();assert.equal(f.tree[1].props.hasRows,false);assert.equal(f.tree[3].props.separatorBefore,true);
  rows[0].close();rows[2].close();f.render();assert.ok(f.tree.every(g=>!g.props.hasRows&&!g.props.separatorBefore));
});

test('the Code list hands its blank-area host New session / New environment; group toggles accumulate in one batch',()=>{
  const saved=[],actions=[],props={sessions:[thread('one'),thread('two',{cwd:'/other'})],knownFolders:['/repo','/other'],
    sidebarPreferences:{groupBy:'custom'},customGroups:[{id:'g',name:'Group'}],onSessionAction(){},onGroupAction(){},onCreateGroup(){},
    onNew:()=>actions.push('new'),onCreateEnvironment:()=>actions.push('environment'),onSidebarPreferencesChange:value=>saved.push(value)};
  const oldElement=globalThis.Element;class FakeElement{closest(){return null;}}globalThis.Element=FakeElement;
  try {
    const f=fixture(Sidebar.SourceSidebar,props),nav=node(f.tree,n=>n.type==='nav');
    // R3-sections step 2 (WI-4): the Code list's blank-area menu is the original shared-21 _B / bB with the list itself as
    // its trigger (tests/sidebar-group-menus-current.test.mjs); the nav's own handler is the other modes' menu only.
    nav.props.onContextMenu({target:new FakeElement(),currentTarget:{},clientX:1,clientY:2,preventDefault(){}});f.render();
    assert.equal(node(f.tree,n=>n.type===Sidebar.SourceSidebarMenu),undefined);
    const blank=node(f.tree,n=>n.type===Sections.SidebarBlankArea);
    assert.deepEqual([blank.props.enabled,blank.props.showCreateGroup],[true,true]);
    blank.props.onNewSession();blank.props.onNewEnvironment();assert.deepEqual(actions,['new','environment']);
    props.sidebarPreferences={groupBy:'project'};f.render();
    // The folder buckets' headings are the original uD inside SidebarSectionsList; their toggles call the list's toggle.
    const {host,model}=node(f.tree,n=>n.type===Sections.SidebarSectionsList).props;
    const buckets=model.layout.at(-1).buckets;assert.ok(buckets.length>=2);
    buckets.forEach(bucket=>host.toggle(bucket.key));
    assert.equal(saved.at(-1).collapsedGroups.length,buckets.length,'each click must build on prior clicks in the same React event');
    f.close();
  } finally {globalThis.Element=oldElement;}
});

test('folder buckets hand the worked-out header menu their new session and order slot; manual sections keep their own',()=>{
  const oldElement=globalThis.Element;class FakeElement{closest(){return null;}}globalThis.Element=FakeElement;
  try {for(const custom of [false,true]) {
    const actions=[],props={sessions:[thread('one')],knownFolders:['/repo'],sidebarPreferences:{groupBy:custom?'custom':'project'},
      customGroups:custom?[{id:'g',name:'Group'}]:[],sessionMetadata:custom?{one:{customGroupId:'g'}}:{},
      onSessionAction(){},onCreateGroup(){},onGroupAction:(...args)=>actions.push(args),onProject:cwd=>actions.push(cwd)};
    const f=fixture(Sidebar.SourceSidebar,props);
    // R3-sections: a manual section's header menu is the original shared-20 yx (tests/sidebar-sections-current and
    // sidebar-sections-layout); the Sessions folder buckets keep this list's OB menu through the host's groupMenu.
    const {host,model}=node(f.tree,n=>n.type===Sections.SidebarSectionsList).props;
    if (custom) {
      const entry=model.layout.find(e=>e.kind==='manual');assert.equal(entry.key,'custom-g');
      assert.equal(host.folderMenu(entry.buckets[0]),null,'no folder menu on a manual section (its own is yx hand-made)');
      host.newSessionInSection(entry);assert.deepEqual(actions[0].slice(0,1),['new-session']);
      assert.equal(actions[0][1].customGroupId,'g');assert.deepEqual(actions[0][2],{cwd:'/repo'});f.close();continue;
    }
    // R3-sections step 2 (WI-4): a folder bucket's menu is the original shared-20 yx as a worked-out group (sT → bC):
    // its New session is the folder's, its order slot moves through project-order (tests/sidebar-group-menus-current).
    const bucket=model.buckets.find(b=>b.key==='project:/repo');assert.ok(bucket);
    const menu=host.folderMenu(bucket);assert.deepEqual([menu.order.index,menu.order.count,menu.order.reset],[0,1,undefined]);
    menu.onNewSession();assert.equal(actions[0],'/repo');f.close();
  }}finally {globalThis.Element=oldElement;}
});
