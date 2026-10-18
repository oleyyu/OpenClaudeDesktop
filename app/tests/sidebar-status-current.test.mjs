import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolveSessionDisplayState } from '../src/generated/code-current/sidebar-session-state.mjs';
import { currentSidebarSession } from '../src/sidebar-session-current-model.mjs';
import { sidebarReadStatePatch } from '../electron/sidebar-read-state.cjs';

// cds-merge-props re-exports the view-tabs vendor-frame (SG-2), whose React boundary is a .jsx host adapter: load via Vite.
let server, Sidebar, Badge, NavBadge, Status, Fade, mergeCdsProps;
before(async () => {
  server = await createServer({ configFile:false, root:new URL('..',import.meta.url).pathname, plugins:[react()],
    server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error' });
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  Badge = await server.ssrLoadModule('/src/generated/code-current/cds-badge.mjs');
  NavBadge = await server.ssrLoadModule('/src/generated/code-current/sidebar-nav-badge.mjs');
  Status = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
  Fade = await server.ssrLoadModule('/src/generated/code-current/sidebar-fade-label.mjs');
  ({ mergeCdsProps } = await server.ssrLoadModule('/src/generated/code-current/cds-merge-props.mjs'));
});
after(()=>server?.close());
const thread=(fields={})=>({id:'row',name:'A task',cwd:'/repo',createdAt:1,updatedAt:1,...fields});
const render=(props={})=>renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,{sessions:[thread()],knownFolders:['/repo'],...props}));
const rowHtml=html=>html.slice(html.indexOf('class="source-session-row '),html.indexOf('source-current-session-more'));

test('original display-state precedence covers errors, permissions, running, unread and open/closed PRs',()=>{
  const base={kind:'code',liveStatus:'idle',prState:'none',hasCompleted:false,isUnread:false};
  const cases=[
    [{},'idle'],[{hasError:true,liveStatus:'awaiting'},'error'],[{liveStatus:'awaiting'},'awaiting'],
    [{liveStatus:'running',hasCompleted:true,isUnread:true},'running'],
    [{hasCompleted:true,isUnread:true},'ready'],[{prState:'open'},'pr'],
    [{prState:'open',hasCompleted:true,isUnread:true},'ready'],
    [{prState:'merged',hasCompleted:true,isUnread:true},'pr'],
    [{prState:'closed',hasCompleted:true,isUnread:true,explicitUnread:true},'ready'],
    [{isArchived:true,hasError:true},'idle'],
  ];
  for(const [patch,expected] of cases)assert.equal(resolveSessionDisplayState({...base,...patch}),expected,JSON.stringify(patch));
  assert.equal(resolveSessionDisplayState({...base,prState:'open',hasCompleted:true,isUnread:true},{readyAfterPr:true}),'pr');
});
test('local projection suppresses stale errors while responding and attributes child approvals to the owner',()=>{
  assert.equal(currentSidebarSession(thread(),{errors:{row:'old'},active:{row:'turn'}}).mark,'running');
  assert.equal(currentSidebarSession(thread(),{errors:{row:'old'}}).mark,'error');
  const state={approvals:[{params:{threadId:'child'}}],threadParents:{child:'row'},active:{row:'turn'}};
  assert.equal(currentSidebarSession(thread(),state).mark,'awaiting');
  assert.equal(currentSidebarSession(thread({liveStatus:'awaiting'})).mark,'awaiting');
  assert.equal(currentSidebarSession(thread({pendingPermissions:1})).mark,'awaiting');
  assert.equal(currentSidebarSession(thread({archived:true}),state,{unread:true}).mark,null);
});
test('selected panes suppress server unread; explicit local unread remains separate from PR state',()=>{
  assert.equal(currentSidebarSession(thread({isUnread:true}),{}, {},{paneSelected:true}).mark,null);
  assert.equal(currentSidebarSession(thread({isUnread:true})).mark,'ready');
  assert.equal(currentSidebarSession(thread({isUnread:true}),{}, {unread:true},{paneSelected:true}).mark,'ready');
  const merged=thread({prState:'merged'});
  assert.equal(currentSidebarSession(merged,{}, {unread:true}).displayState,'pr');
  assert.equal(currentSidebarSession(merged,{}, {unread:true}).mark,'ready','cq keeps unread even beside a completed PR');
  assert.equal(currentSidebarSession(merged,{}, {unread:true,explicitUnread:true}).displayState,'ready');
  assert.equal(currentSidebarSession(merged,{}, {},{showPrStatus:false}).prState,'none');
});
test('shared metadata boundary distinguishes automatic completions from manual unread and clears explicit state on read',()=>{
  assert.deepEqual(sidebarReadStatePatch({unread:true}),{unread:true,explicitUnread:true});
  assert.deepEqual(sidebarReadStatePatch({unread:true},{automatic:true}),{unread:true,explicitUnread:false});
  assert.deepEqual(sidebarReadStatePatch({unread:false,explicitUnread:true}),{unread:false,explicitUnread:false});
  assert.deepEqual(sidebarReadStatePatch({unread:'true',explicitUnread:true}),{});
  assert.deepEqual(sidebarReadStatePatch({pinned:true}),{});
  const main=readFileSync(new URL('../electron/main.cjs',import.meta.url),'utf8');
  assert.match(main,/sidebarReadStatePatch\(p\.patch, \{ automatic: p\.automatic === true \}\)/);
});
test('Code Projects uses the original compact neutral xs Beta badge with the source label wrapper',()=>{
  const html=render();
  assert.match(html,/<span class="flex min-w-0 flex-1 items-center"><span>Projects<\/span><span data-cds="Badge" data-size="xs"[^>]*bg-neutral text-secondary ms-2/);
  assert.match(html,/leading-\[calc\(0\.75rem\*var\(--cds-rem-scale,1\)\)\] py-\[0\.125em\] -my-\[0\.125em\]">Beta<\/span>/);
  assert.doesNotMatch(html,/surface-new-badge/);
  const chat=render({mode:'chat'});assert.match(chat,/surface-new-badge/);
});
test('original navigation badge supports New, Beta, Preview, neutral New and upgrade without fabricating lab labels',()=>{
  const badge=value=>renderToStaticMarkup(React.createElement(Badge.CdsBadgeDensity.Provider,{value:'compact'},React.createElement(NavBadge.SidebarNavBadge,{badge:value})));
  assert.equal(badge(undefined),'');assert.equal(badge('lab'),'');
  assert.match(badge('new'),/bg-tint-blue text-accent/);assert.match(badge('new-neutral'),/bg-neutral text-secondary/);
  assert.match(badge('preview'),/>Preview<\/span>/);assert.match(badge('upgrade'),/data-inline-badge=""/);
  const comfortable=renderToStaticMarkup(React.createElement(Badge.CurrentCdsBadge,{size:'xs'},'Beta'));
  assert.match(comfortable,/pb-\[0\.05em\]/);
});
test('original CDS removal-prop merge preserves styles, custom handler ordering and Base UI cancellation',()=>{
  const calls=[];
  const props=mergeCdsProps({className:'base',style:{color:'red',opacity:1},onClick:()=>calls.push('base')},
    {className:'custom',style:{opacity:.5},onClick:event=>{calls.push('custom');event.preventBaseUIHandler();}});
  assert.equal(props.className,'custom base');assert.deepEqual(props.style,{color:'red',opacity:.5});
  props.onClick({nativeEvent:{}});assert.deepEqual(calls,['custom']);
});
test('ordinary and nested Code rows omit the leading slot while pinned rows keep the Code icon',()=>{
  assert.doesNotMatch(rowHtml(render()),/class="df-leading-slot(?: |")/);
  const pinned=rowHtml(render({sessionMetadata:{row:{pinned:true}}}));
  assert.match(pinned,/class="df-leading-slot(?: |")/);assert.doesNotMatch(pinned,/source-session-dot/);
  const nested=render({sessions:[thread({id:'parent'}),thread({forkedFromId:'parent'})],sidebarPreferences:{groupBy:'none'}});
  assert.match(nested,/data-nested="parent"/);
  const nestedRow=nested.slice(nested.indexOf('data-source-session-id="row"'));
  assert.doesNotMatch(nestedRow.split('source-current-session-more')[0],/class="df-leading-slot(?: |")/);
});
test('current marks use the original Pulse and one visible-state announcement; More replaces only the visual mark',()=>{
  for(const [props,label,color] of [
    [{state:{active:{row:'turn'}}},'Running','muted'],
    [{sessions:[thread({liveStatus:'awaiting'})]},'Awaiting input','warning'],
    [{sessionMetadata:{row:{unread:true}}},'Unread response','accent'],
  ]) {
    const html=render(props);
    assert.match(html,new RegExp(`data-find-omitted=""> ${label}</span>`));
    assert.match(html,/data-row-decoration=""[^>]*group-hover:opacity-0 group-has-\[:focus-visible\]:opacity-0/);
    assert.match(html,/data-cds="Pulse"/);assert.match(html,new RegExp(`background:var\\(--cds-(?:text|fill)-${color}\\)`));
    assert.equal((html.match(new RegExp(`data-find-omitted=""> ${label}`,'g'))??[]).length,1);
  }
  const row=rowHtml(render({state:{active:{row:'turn'}}}));
  assert.match(row,/opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto/);
  assert.match(row,/group-has-\[:focus-visible\]:pointer-events-auto/);
});
test('original error glyph mapping preserves usage and offline categories; status handlers ignore a pointer drag',()=>{
  for(const [category,kind] of [['rate_limit','usage'],['network_error','offline'],['bridge_host_exit','offline'],['server_error','warning']]) {
    assert.equal(Status.sidebarErrorKind(category),kind);
  }
  const old=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H;
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H={useContext:()=>false};
  let tree;try{tree=Status.SidebarStatusLabel({label:'Running',children:'dot'});}finally{React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H=old;}
  let stopped=0;tree.props.onPointerMove({buttons:0,stopPropagation(){stopped++;}});
  tree.props.onPointerMove({buttons:1,stopPropagation(){stopped++;}});assert.equal(stopped,1);
});
test('original label overflow accounts for the decoration slot and shares resize observation within its owner window',()=>{
  assert.equal(Fade.sidebarLabelOverflows(100,100,false),false);
  assert.equal(Fade.sidebarLabelOverflows(101,100,false),true);
  assert.equal(Fade.sidebarLabelOverflows(56,100,true),false);
  assert.equal(Fade.sidebarLabelOverflows(57,100,true),true);
  assert.equal(Fade.sidebarLabelOverflows(45,100,true,12),true);
  const observers=[];
  class ResizeObserver {
    constructor(callback){this.callback=callback;this.watched=new Set();observers.push(this);}
    observe(node){this.watched.add(node);}
    unobserve(node){this.watched.delete(node);}
  }
  const ownerDocument={defaultView:{ResizeObserver}},attrs=new Map();
  const label={ownerDocument,toggleAttribute:(name,on)=>attrs.set(name,on),removeAttribute:name=>attrs.delete(name)},inner={ownerDocument};
  let reads=0,result=true;
  const release=Fade.observeSidebarLabelOverflow(label,inner,()=>{reads++;return result;});
  assert.equal(observers.length,1);assert.equal(observers[0].watched.size,2);
  observers[0].callback([{target:label},{target:inner}]);assert.equal(reads,1);assert.equal(attrs.get('data-overflowing'),true);
  result=false;observers[0].callback([{target:inner}]);assert.equal(attrs.get('data-overflowing'),false);
  result=null;observers[0].callback([{target:inner}]);assert.equal(attrs.get('data-overflowing'),false);
  release();assert.equal(observers[0].watched.size,0);assert.equal(attrs.has('data-overflowing'),false);
  const again=Fade.observeSidebarLabelOverflow(label,inner,()=>false);assert.equal(observers.length,1);again();
});

// Controlled hooks exercise source layout callbacks; no DOM/app window is opened.
test('latest mixed-direction title measures its actual start padding and observes decorated labels',()=>{
  const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous=internal.H,refs=[],effects=[];
  internal.H={useRef:value=>{const ref={current:value};refs.push(ref);return ref;},useContext:ctx=>ctx._currentValue,useCallback:fn=>fn,useLayoutEffect:fn=>effects.push(fn)};
  let tree;
  try{tree=Fade.SidebarFadeLabel({children:'مرحبا title',decorated:true,endControls:true});}finally{internal.H=previous;}
  const label=tree.props.children;
  assert.equal(label.props.dir,'auto');
  assert.match(label.props.className,/\[text-align:match-parent\]/);
  assert.match(label.props.className,/dir\(rtl\)/);
  let callback,unobserved=0,padding='30px';
  const attrs=new Map(),ownerDocument={defaultView:{
    getComputedStyle:()=>({paddingInlineStart:padding}),
    ResizeObserver:class{constructor(fn){callback=fn;}observe(){}unobserve(){unobserved++;}},
  }};
  const outer={ownerDocument,offsetWidth:100,closest:()=>null,toggleAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
  const inner={ownerDocument,scrollWidth:65};
  refs[0].current=outer;refs[1].current=inner;
  const cleanup=effects[0]();assert.equal(typeof callback,'function','decorations no longer skip observation');
  callback([{target:outer}]);assert.equal(attrs.get('data-overflowing'),false,'65 fits the 70px after start padding');
  inner.scrollWidth=71;callback([{target:inner}]);assert.equal(attrs.get('data-overflowing'),true);
  const tooltip=tree.props.content();assert.equal(tooltip.props.dir,'auto');assert.equal(tooltip.props.children,'مرحبا title');
  padding='0px';inner.scrollWidth=57;callback([{target:inner}]);assert.equal(attrs.get('data-overflowing'),true,'normal decoration reserves the source 44px');
  cleanup();assert.equal(unobserved,2);assert.equal(attrs.has('data-overflowing'),false);
});

test('latest title reserves space for end controls even without a status decoration',()=>{
  const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internal.H;
  internal.H={useRef:value=>({current:value}),useContext:ctx=>ctx._currentValue,useCallback:fn=>fn,useLayoutEffect(){}};
  let tree;try{tree=Fade.SidebarFadeLabel({children:'عنوان',endControls:true});}finally{internal.H=previous;}
  const label=tree.props.children;
  assert.match(label.props.className,/df-label-start-fade/);
  assert.match(label.props.className,/touch:.*ps-0/);
  assert.match(label.props.className,/df-label-fade-angle/);
});
