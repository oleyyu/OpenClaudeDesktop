import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { currentSidebarDetails } from '../src/sidebar-details-current-model.mjs';
import { normalizeSidebarPreferences } from '../src/sidebar-model.js';

let server, Sidebar, Row, Details, Cds;
before(async()=>{
  server=await createServer({configFile:false,root:new URL('..',import.meta.url).pathname,plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
  Sidebar=await server.ssrLoadModule('/src/source-sidebar.jsx');
  Row=await server.ssrLoadModule('/src/generated/code-current/sidebar-row-view.mjs');
  Details=await server.ssrLoadModule('/src/generated/code-current/sidebar-details-view.mjs');
  Cds=await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
});
after(()=>server?.close());
const session={id:'row',name:'A task',cwd:'/work/repository',createdAt:1,updatedAt:1};
const metadata={preferences:{showMetadata:true,groupBy:'none'}};
const project=(patch={},view={},options=metadata)=>currentSidebarDetails({...session,...patch},view,options);
const render=(props={})=>renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar,{sessions:[session],knownFolders:[session.cwd],sidebarPreferences:{groupBy:'none',showMetadata:true},...props}));

test('metadata uses observed branch and folder, deduplicates group heading and hides scratch folders',()=>{
  assert.deepEqual(project({gitInfo:{branch:'feature'}}).description,{kind:'place',pr:undefined,branch:'feature',folder:'repository'});
  assert.equal(project({gitInfo:{branch:'feature'}},{},{...metadata,repoIdentity:{name:'remote-name'}}).description.folder,'remote-name');
  assert.equal(project({},{},{...metadata,group:{label:'repository'}}).description,undefined);
  assert.equal(project({isScratchWorkspace:true}).description,undefined);
  assert.equal(project({name:'branch: fake'}).description.branch,undefined);
  assert.equal(project({repoBranches:[{branch:'one'},{branch:'two'}],ownBranch:'one'}).description.branch,undefined);
  assert.equal(project({repoBranches:[{branch:'one'},{branch:'one'}]}).description.branch,'one');
});
test('pinned metadata is absent, while nested rows keep their branch instead of a folder-only heading',()=>{
  const pr={titleState:'open',lineState:'open',entries:[]};
  const pinned=project({type:'remote',branch:'main'},{pr},{...metadata,pinned:true});
  assert.equal(pinned.description,undefined);assert.equal(pinned.pr,undefined);assert.equal(pinned.env,undefined);
  const options={preferences:{showMetadata:false,groupBy:'custom'},group:{plainHeading:true,label:'remote'}};
  assert.deepEqual(project({branch:'main'},{pr},options).description,{kind:'place',pr:undefined,branch:undefined,folder:'repository'});
  assert.equal(project({branch:'main'},{pr},{...options,nested:true}).description,undefined);
  assert.equal(project({branch:'main'},{pr},{...metadata,nested:true}).description.branch,'main');
});
test('blocked descriptions follow the source status and group-heading precedence',()=>{
  assert.deepEqual(project({branch:'main'},{mark:'awaiting'}).description,{kind:'blocked',word:true,reason:undefined});
  assert.equal(project({},{mark:'awaiting'},{...metadata,group:{key:'state-blocked'}}).description,undefined);
  assert.equal(project({branch:'main'},{mark:'running'}).description.kind,'place');
});
test('environment decorations come only from actual typed records and respect project grouping',()=>{
  assert.equal(project().env,undefined);
  assert.deepEqual(project({type:'remote'}).env,{kind:'cloud',label:'repository'});
  assert.deepEqual(project({type:'bridge',bridgeMachineName:'Laptop',isBridgeOffline:true}).env,{kind:'bridge',label:'Laptop',offline:true});
  assert.deepEqual(project({type:'cli',remote:{kind:'ssh',sshHost:'host'}}).env,{kind:'ssh',label:'repository'});
  assert.equal(project({type:'remote'},{},{preferences:{groupBy:'project'}}).env,undefined);
  assert.equal(project({type:'remote'},{},{preferences:{groupBy:'project'},group:{ownSection:true}}).env.kind,'cloud');
  const mark=React.createElement('span',null,'working');
  assert.equal(Details.sidebarRightDecoration({mark,env:{kind:'cloud'}}).props.children,mark);
});
test('actual sidebar renders original described geometry, metadata tooltip and branch glyph',()=>{
  const html=render({sessions:[{...session,gitInfo:{branch:'feature'}}]});
  assert.match(html,/data-described="true"/);assert.match(html,/df-described-row flex-col items-stretch justify-center/);
  assert.match(html,/class="df-meta-line [^"]*" title="feature, repository"/);
  assert.match(html,/data-branch-glyph=""/);assert.match(html,/<bdi[^>]*>feature<\/bdi>/);
  const disabled=render({sidebarPreferences:{groupBy:'none',showMetadata:false}});
  assert.doesNotMatch(disabled,/df-meta-line|data-described/);
  const pinned=render({sessionMetadata:{row:{pinned:true}}});assert.doesNotMatch(pinned,/df-meta-line/);
});
test('selected rows keep source touch controls and archived records move to the Sessions page',()=>{
  const selected=render({current:'row',section:'new'});
  assert.match(selected,/data-touch-menu="true"/);assert.match(selected,/aria-current="page"/);
  assert.match(selected,/touch:group-data-\[touch-menu\]:pointer-events-auto/);
  const archived=render({sessions:[{...session,archived:true}],sidebarPreferences:{status:'archived',showMetadata:true}});
  assert.doesNotMatch(archived,/data-source-session-id="row"/);
  assert.match(archived,/data-empty-variant="filtered"/);
  assert.doesNotMatch(archived,/data-cds="Pulse"/);
});
function nodes(tree,predicate){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(t=>nodes(t,predicate));return [...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)];}
function fixture(component,props={}){
  const cells=[],effects=[];let cursor=0,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={
    useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next;}];},
    useReducer(reducer,initial){const [value,set]=hooks.useState(initial);return [value,next=>set(old=>reducer(old,next))];},
    useRef(initial){return hooks.useState(()=>({current:initial}))[0];},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useContext(context){return context._currentValue;},
    useSyncExternalStore(_subscribe,snapshot,serverSnapshot){return (serverSnapshot??snapshot)();},
    useId(){return hooks.useMemo(()=>`button-fixture-${cursor}`,[]);},
    useImperativeHandle(ref,create,deps){hooks.useEffect(()=>{if(ref)ref.current=create();},deps);},
    useEffectEvent(fn){const ref=hooks.useRef(fn);ref.current=fn;return hooks.useCallback((...args)=>ref.current(...args),[]);},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}},
  };hooks.useLayoutEffect=hooks.useEffect;
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H=hooks;try{return tree=component(props);}finally{internal.H=old;}};
  render();return {get tree(){return tree;},render,flush(){while(effects.length)effects.shift()();},close(){cells.forEach(c=>c.cleanup?.());}};
}
test('Metadata checkbox persists the preference while leaving its menu open and preserving other settings',()=>{
  const changed=[];let closed=0;
  const tree=Sidebar.SourceSidebarFilterMenu({preferences:{groupBy:'custom',showPrStatus:false},onChange:p=>changed.push(p),onClose:()=>closed++});
  const choice=nodes(tree,n=>n.props?.children==='Metadata')[0];assert.ok(choice);assert.equal(choice.props.keepOpen,true);
  choice.props.onClick();assert.equal(closed,0);assert.equal(changed[0].showMetadata,true);assert.equal(changed[0].groupBy,'custom');assert.equal(changed[0].showPrStatus,false);
  assert.equal(normalizeSidebarPreferences(changed[0]).showMetadata,true);
  const chat=Sidebar.SourceSidebarFilterMenu({preferences:{},showMetadataOption:false,onChange(){},onClose(){}});
  assert.equal(nodes(chat,n=>n.props?.children==='Metadata').length,0);
});
function renameFixture(onRename,label='Old'){
  const f=fixture(()=>Row.useSidebarRename(onRename,label));let focus=0,select=0,returned=0;
  const input={scrollLeft:10,focus(){focus++;},select(){select++;}};
  f.tree.inputRef.current=input;f.tree.focusTargetRef.current={focus(){returned++;}};f.flush();
  return {f,input,get counts(){return {focus,select,returned};},start(){f.tree.startEdit();f.render();f.flush();}};
}
test('original rename focuses/selects input and protects entry blur for 250ms before committing once',()=>{
  const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;let timer,delay;
  globalThis.setTimeout=(fn,ms)=>{timer=fn;delay=ms;return 1;};globalThis.clearTimeout=()=>{};
  const names=[];let r;
  try{
    r=renameFixture(n=>names.push(n));r.start();assert.equal(delay,250);assert.equal(r.input.scrollLeft,0);
    assert.deepEqual(r.counts,{focus:1,select:1,returned:0});
    r.f.tree.setEditValue('  New  ');r.f.render();r.f.tree.handleBlur();assert.deepEqual(names,[]);assert.equal(r.counts.focus,2);
    timer();r.f.tree.handleBlur();r.f.tree.submitEdit();r.f.render();r.f.flush();
    assert.deepEqual(names,['New']);assert.equal(r.f.tree.optimisticLabel,'New');assert.equal(r.f.tree.isEditing,false);assert.equal(r.counts.returned,0);
  }finally{r?.f.close();globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
});
test('rename cancels and returns focus; modified double-click never enters; blank and unchanged values do not persist',()=>{
  const names=[],r=renameFixture(n=>names.push(n));
  try{
    for(const key of ['shiftKey','metaKey','ctrlKey']){r.f.tree.handleDoubleClick({[key]:true});r.f.render();assert.equal(r.f.tree.isEditing,false);}
    r.start();r.f.tree.setEditValue('discard');r.f.render();r.f.tree.cancelEdit();r.f.render();r.f.flush();assert.equal(r.counts.returned,1);
    for(const value of ['   ',' Old ']){r.start();r.f.tree.setEditValue(value);r.f.render();r.f.tree.submitEdit();r.f.render();r.f.flush();}
    assert.deepEqual(names,[]);assert.equal(r.f.tree.optimisticLabel,null);
  }finally{r.f.close();}
});
test('failed rename rolls back the original optimistic label',async()=>{
  let reject;const r=renameFixture(()=>new Promise((_,no)=>{reject=no;}));
  try{
    r.start();r.f.tree.setEditValue('New');r.f.render();r.f.tree.submitEdit();r.f.render();assert.equal(r.f.tree.optimisticLabel,'New');
    reject(new Error('persistence failed'));await Promise.resolve();r.f.render();assert.equal(r.f.tree.optimisticLabel,null);
  }finally{r.f.close();}
});
test('original input ignores IME Enter/Escape, stops bubbling and preserves the host length limit',()=>{
  let submitted=0,cancelled=0,stopped=0,prevented=0;const values=[];
  const tree=Row.SidebarRenameInput({inputRef:{current:null},value:'Old',maxLength:200,onSubmit:()=>submitted++,onCancel:()=>cancelled++,onValueChange:v=>values.push(v)});
  const input=nodes(tree,n=>n.type==='input')[0];assert.equal(input.props.maxLength,200);assert.equal(input.props.dir,'auto');assert.match(input.props.className,/\[text-align:match-parent\]/);
  for(const isComposing of [true,false])for(const key of ['Enter','Escape'])input.props.onKeyDown({key,nativeEvent:{isComposing},stopPropagation(){stopped++;},preventDefault(){prevented++;}});
  assert.deepEqual([submitted,cancelled,stopped,prevented],[1,1,4,2]);input.props.onChange({target:{value:'新标题'}});assert.deepEqual(values,['新标题']);
});


test('More uses the original compact CDS ghost button, 12px icon and source control size',()=>{
  const html=render({onSessionAction(){}});
  const button=html.match(/<button[^>]*class="[^"]*source-current-session-more[^"]*"[^>]*>(?:(?!<\/button>).)*<\/button>/s)?.[0];
  assert.ok(button);assert.match(button,/data-cds="Button"/);assert.match(button,/data-cds-ghost=""/);
  assert.match(button,/data-size="xs"/);assert.match(button,/size-\[var\(--df-row-ctl\)\]/);
  assert.match(button,/data-cds-part="paint"/);assert.match(button,/font-size:calc\(0.75rem \* var\(--cds-rem-scale, 1\)\)/);
  assert.doesNotMatch(button,/code-icon-button|source-settings-button/);
  const css=readFileSync(new URL('../src/source-sidebar.css',import.meta.url),'utf8');
  // D26 (R3-style): the native-button reset is layered, so KT's controls need no revert-layer bridge
  // (tests/style-control-reset-layer.test.mjs resolves the cascade).
  assert.doesNotMatch(css,/\.source-current-session-host :is\(button, input\)/,'no release of the layered button reset');
});
test('source More prevents row navigation and isolates its click before opening the menu',()=>{
  const calls=[],f=fixture(Row.SidebarRowMoreControl,{icon:'DotsHorizontal',onClick:()=>calls.push('menu')});
  assert.equal(f.tree.type,Cds.CdsButton);assert.equal(f.tree.props.tooltip,false);assert.equal(f.tree.props.tabIndex,-1);
  assert.equal(f.tree.props['data-row-action'],'');assert.equal(f.tree.props.variant,'ghost');
  f.tree.props.onClick({stopPropagation:()=>calls.push('stop'),preventDefault:()=>calls.push('prevent')});
  assert.deepEqual(calls,['stop','prevent','menu']);f.close();
});
test('original icon resolves optical sizes from the actual density context',()=>{
  const icon=density=>renderToStaticMarkup(React.createElement(Cds.CdsDensityContext,{value:density},React.createElement(Cds.CdsIcon,{name:'DotsHorizontal',size:'auto-sm'})));
  assert.match(icon('compact'),/font-size:calc\(0.75rem \* var\(--cds-rem-scale, 1\)\)/);
  assert.match(icon('comfortable'),/font-size:calc\(1rem \* var\(--cds-rem-scale, 1\)\)/);
});

test('original CDS button suppresses held activation and isolates busy activation while preserving host handlers',()=>{
  const calls=[];
  const f=fixture(props=>Cds.CdsButton.render(props,null),{variant:'ghost',size:'xs',iconOnly:true,icon:'DotsHorizontal',tooltip:false,onKeyDown:()=>calls.push('key'),onClick:()=>calls.push('click')});
  const button=nodes(f.tree,n=>n.props?.['data-cds']==='Button')[0];assert.ok(button);
  const event=(key,repeat=false)=>({key,repeat,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}});
  const held=event('Enter',true);button.props.onKeyDown(held);assert.equal(held.prevented,true);assert.deepEqual(calls,['key']);
  button.props.onClick(event('Enter'));assert.deepEqual(calls,['key','click']);f.close();
  const busy=fixture(props=>Cds.CdsButton.render(props,null),{busy:true,tooltip:false,onClick:()=>calls.push('bad')});
  const busyButton=nodes(busy.tree,n=>n.props?.['data-cds']==='Button')[0];assert.equal(busyButton.props['aria-disabled'],true);assert.equal(busyButton.props['aria-busy'],true);
  for(const key of ['Enter',' ']){const e=event(key);busyButton.props.onKeyDown(e);assert.equal(e.prevented,true);assert.equal(e.stopped,true);}
  const click=event('Enter');busyButton.props.onClick(click);assert.equal(click.prevented,true);assert.deepEqual(calls,['key','click']);busy.close();
});

test('2.42304.0 CDS button keeps its shortcut for the tooltip but can withhold the announced key binding',()=>{
  const button=props=>renderToStaticMarkup(React.createElement(Cds.CdsButton,{variant:'ghost',size:'xs',iconOnly:true,icon:'DotsHorizontal',tooltip:false,'aria-label':'More',shortcut:'cmd+k',...props}));
  assert.match(button({}),/aria-keyshortcuts="(Meta|Control)\+k"/);
  assert.doesNotMatch(button({hideShortcut:true}),/aria-keyshortcuts=/);
});
test('original icon marks directional glyphs for the RTL mirror rule and leaves symmetric glyphs alone',()=>{
  const icon=name=>renderToStaticMarkup(React.createElement(Cds.CdsIcon,{name,size:'auto-sm'}));
  assert.match(icon('ArrowLeft'),/data-cds="Icon"[^>]*data-cds-mirror=""/);
  assert.doesNotMatch(icon('DotsHorizontal'),/data-cds-mirror/);
});
