import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
let server,Tabs,Frame,Host;
before(async()=>{
  server=await createServer({configFile:false,root:path.resolve(import.meta.dirname,'..'),plugins:[react()],server:{middlewareMode:true,hmr:false,watch:null},appType:'custom',logLevel:'error'});
  Tabs=await server.ssrLoadModule('/src/generated/view-tabs/cfe7c4b3b-CP-IQXj8.js');
  Frame=await server.ssrLoadModule('/src/generated/view-tabs/vendor-frame-DfPJ1QmD.js');
  Host=await server.ssrLoadModule('/src/source-view-tabs.jsx');
});
after(()=>server?.close());
const noop=()=>{};
test('the original lazy popup module retains its public export instead of only a minified local name',async()=>{
  const module=await server.ssrLoadModule('/src/generated/view-tabs/c86ccec3d-zuivwocA.js');
  assert.equal(typeof module.SheetPopupHost,'function');
});
function fixture(component,props,{direction='ltr'}={}) {
  const cells=[],effects=[];let cursor=0,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const dispatcher={
    useContext:c=>c===Frame.DirectionContext?{direction}:c._currentValue,
    useState(initial){const i=cursor++;cells[i]??={value:typeof initial==='function'?initial():initial};return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next;}];},
    useRef(initial){return dispatcher.useState(()=>({current:initial}))[0];},
    useMemo(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps))cells[i]={value:fn(),deps};return cells[i].value;},
    useCallback(fn,deps){return dispatcher.useMemo(()=>fn,deps);},
    useId(){return dispatcher.useState(()=>`tab-fixture-${cursor}`)[0];},
    useEffectEvent(fn){const ref=dispatcher.useRef(fn);ref.current=fn;return dispatcher.useMemo(()=>(...args)=>ref.current(...args),[]);},
    useEffect(fn,deps){const i=cursor++;if(!cells[i]||!same(cells[i].deps,deps)){const old=cells[i];cells[i]={deps};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}},
    useLayoutEffect(fn,deps){dispatcher.useEffect(fn,deps);},
  };
  const render=()=>{cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internal.H;internal.H=dispatcher;try{tree=component(props);return tree;}finally{internal.H=previous;}};
  render();return {render,get tree(){return tree;},flush(){for(const effect of effects.splice(0))effect();return render();},close(){for(const cell of cells)cell?.cleanup?.();}};
}
function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of [...React.Children.toArray(tree.props?.children),tree.props?.render]){const result=find(child,predicate);if(result)return result;}return null;}
function event(key,fields={}){return {key,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,repeat:false,defaultPrevented:false,stopped:false,nativeEvent:{isComposing:false},preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},preventBaseUIHandler(){this.basePrevented=true;},...fields};}
function events(){const map=new Map();return {addEventListener(name,fn){if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);},removeEventListener(name,fn){map.get(name)?.delete(fn);},send(name,e){for(const fn of [...map.get(name)??[]])fn(e);},count(){return [...map.values()].reduce((n,s)=>n+s.size,0);}};}

test('original Base UI renders manual-activation tabs with current geometry and explicit RTL text direction',()=>{
  const html=renderToStaticMarkup(React.createElement(Host.SourceViewTabBar,{direction:'rtl',tabs:[{id:'a',label:'א',closable:true},{id:'b',label:'B',closable:false}],activeId:'a',onActivate:noop,onClose:noop,minTabWidth:92,'aria-label':'Side chat tabs'}));
  assert.match(html,/role="tablist"/);assert.match(html,/role="tab" tabindex="0" aria-selected="true"/);
  assert.match(html,/role="tab" tabindex="-1" aria-selected="false"/);assert.match(html,/data-vtb-label="true" dir="auto"/);
  assert.match(html,/overflow-x-hidden p-\[4px\]/);assert.match(html,/min-width:92px/);assert.match(html,/data-vtb-end-slack=""[^>]+width:96px/);
  assert.equal((html.match(/aria-label="Close tab"/g)||[]).length,1);
});

test('source tab Delete closes once and consumes the held key until release; locked tab keeps its handler inert',()=>{
  const view=events(),doc={defaultView:view},closed=[];
  const props={tab:{id:'child',label:'Child',closable:true},selected:true,sizes:Tabs.viewTabSizes,labels:Tabs.viewTabLabels,posinset:1,setsize:2,onClose:id=>closed.push(id)};
  const f=fixture(Tabs.ViewTab.type,props),tab=find(f.tree,n=>n.props?.value==='child'&&n.props?.onKeyDown);
  const first=event('Delete',{currentTarget:{ownerDocument:doc}});tab.props.onKeyDown(first);assert.deepEqual(closed,['child']);assert.equal(view.count(),2);
  const held=event('Delete',{repeat:true});view.send('keydown',held);assert.equal(held.defaultPrevented,true);assert.equal(held.stopped,true);assert.deepEqual(closed,['child']);
  view.send('keyup',event('Delete'));assert.equal(view.count(),0);
  props.tab={...props.tab,closable:false};f.render();find(f.tree,n=>n.props?.value==='child'&&n.props?.onKeyDown).props.onKeyDown(event('Backspace',{currentTarget:{ownerDocument:doc}}));assert.deepEqual(closed,['child']);f.close();
});

test('original overflow row closes with the directional arrow, Backspace or Delete; repeated and modified keys do not close again',()=>{
  for(const direction of ['ltr','rtl']){
    const closed=[],f=fixture(Tabs.ViewTabOverflowItem,{tab:{id:'hidden',label:'Hidden',closable:true},rtl:direction==='rtl',onActivate:noop,onClose:id=>closed.push(id),sizes:Tabs.viewTabSizes});
    const closeKey=direction==='rtl'?'ArrowLeft':'ArrowRight',other=direction==='rtl'?'ArrowRight':'ArrowLeft';
    f.tree.props.onKeyDown(event(other));f.tree.props.onKeyDown(event(closeKey,{ctrlKey:true}));assert.equal(closed.length,0);
    const e=event(closeKey);f.tree.props.onKeyDown(e);assert.deepEqual(closed,['hidden']);assert.equal(e.stopped,true);
    f.tree.props.onKeyDown(event(closeKey,{repeat:true}));assert.equal(closed.length,1);
    f.tree.props.onKeyDown(event('Backspace'));assert.equal(closed.length,2);f.close();
  }
});

test('typeahead Backspace is consumed in overflow capture before it can close a tab',()=>{
  const f=fixture(Tabs.ViewTabOverflowMenu,{tabs:[{id:'hidden',label:'Hidden',closable:true}],labels:Tabs.viewTabLabels,onActivate:noop,onClose:noop,sizes:Tabs.viewTabSizes});
  const popup=find(f.tree,n=>n.props?.onKeyDownCapture),capture=popup.props.onKeyDownCapture;
  capture(event('h'));const removeLetter=event('Backspace');capture(removeLetter);assert.equal(removeLetter.stopped,true);
  const closeTab=event('Backspace');capture(closeTab);assert.equal(closeTab.stopped,false);
  capture(event('h'));capture(event('ArrowDown'));const afterNavigation=event('Backspace');capture(afterNavigation);assert.equal(afterNavigation.stopped,false);f.close();
});

function measurement(direction='ltr') {
  const observers=[],view={...events(),getComputedStyle:node=>({direction,columnGap:'4px',width:node.width??'96px'}),ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
  const doc={nodeType:9,defaultView:view,body:{}};doc.activeElement=doc.body;
  const list={...events(),nodeType:1,ownerDocument:doc,clientWidth:212,scrollWidth:324,scrollLeft:0,querySelectorAll:()=>nodes,querySelector:()=>null};
  const nodes=['a','b','c'].map((id,index)=>({nodeType:1,ownerDocument:doc,dataset:{vtbId:id},offsetWidth:100,
    get offsetLeft(){return direction==='rtl'?list.clientWidth-4-index*104-100:4+index*104;},
    hasAttribute:name=>false,querySelector:()=>({scrollWidth:55,clientWidth:60}),contains:node=>node===doc.activeElement&&doc.activeElement.tabId===id}));
  const root={...events(),nodeType:1,ownerDocument:doc,children:[],contains:node=>node===list||nodes.includes(node),querySelector:()=>null};
  const args={root:{current:root},list:{current:list},slack:{current:{ownerDocument:doc,width:'96px'}},ids:['a','b','c'],active:'a'};
  const f=fixture(p=>Tabs.useViewTabOverflow(p.root,p.list,p.slack,p.ids,p.active,0),args,{direction});f.flush();
  const measure=()=>{observers.filter(o=>!o.disconnected).at(-1).fn();return f.render();};
  return {f,args,doc,root,list,nodes,measure};
}
test('original measurements overflow full tabs, keep the active tab in view, and clear overflow when width returns',()=>{
  const m=measurement();assert.deepEqual(m.measure().hiddenIds,['c']);assert.equal(m.f.tree.endSlack,true);
  m.args.active='c';m.f.render();m.f.flush();const last=m.measure();assert.deepEqual(last.hiddenIds,['a']);assert.equal(m.list.scrollLeft,104);
  m.list.clientWidth=400;const wide=m.measure();assert.deepEqual(wide.hiddenIds,[]);assert.equal(wide.endSlack,false);assert.equal(m.list.scrollLeft,0);m.f.close();
});
test('RTL overflow uses logical starts and a negative scroll offset for the selected final tab',()=>{
  const m=measurement('rtl');assert.deepEqual(m.measure().hiddenIds,['c']);m.args.active='c';m.f.render();m.f.flush();
  assert.deepEqual(m.measure().hiddenIds,['a']);assert.equal(m.list.scrollLeft,-104);m.f.close();
});

// 2.42304.0 additions to the original bar, exercised through its own functions.
const pair=[{id:'a',label:'A',closable:true},{id:'b',label:'B',closable:true}];
test('original create control becomes the CDS split dropdown only when a create menu accompanies onCreate',()=>{
  const bar=props=>renderToStaticMarkup(React.createElement(Host.SourceViewTabBar,{tabs:pair,activeId:'a',onActivate:noop,onClose:noop,'aria-label':'Tabs',...props}));
  const split=bar({onCreate:noop,createMenu:{label:'More new tab options',items:[{label:'Terminal',onClick:noop}]}});
  assert.match(split,/data-cds="SplitDropdownButton"/);assert.match(split,/aria-label="New tab"/);
  const plain=bar({onCreate:noop});
  assert.doesNotMatch(plain,/SplitDropdownButton/);assert.match(plain,/data-cds="Button"[^>]*data-cds-ghost=""|data-cds-ghost=""[^>]*data-cds="Button"/);assert.match(plain,/aria-label="New tab"/);
  assert.doesNotMatch(bar({createMenu:{label:'More',items:[]}}),/SplitDropdownButton|aria-label="New tab"/);
});
test('fizzy-lake panels stay off for the host: tabs keep the default size table and never read --vtb-room',()=>{
  const html=renderToStaticMarkup(React.createElement(Host.SourceViewTabBar,{tabs:pair,activeId:'a',onActivate:noop,onClose:noop,density:'comfortable','aria-label':'Tabs'}));
  assert.match(html,/basis-\[192px\]/);assert.doesNotMatch(html,/--vtb-room|basis-\[212px\]/);
  assert.equal(Tabs.viewTabSizes.basis,'basis-[192px]');assert.equal(Tabs.viewTabSizes.roomVar,undefined);
});
// R4g SM2 (global-10 / X7-21): 2.42304.0 compiles fizzy-lake off. shared-23's spa:fizzy-lake writer GJ=[WJ(VJ)] has an
// empty switch table (VJ={}), both CdsRoot mounts read shared-4 Of (`Of as uo` -> `uo as T_`), and Of filters the
// data-cds-fizzy-lake attribute through Ef=Cf=[], so kf/jf (and shared-frame vr through CdsRoot) are always false.
test('global-10: the official build compiles fizzy-lake off and the host never turns a part on',async()=>{
  const fs=await import('node:fs/promises');
  const count=(text,s)=>text.split(s).length-1;
  const ref=path.resolve(import.meta.dirname,'../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const s23=await fs.readFile(path.join(ref,'shared-23-Bu_lvvVo.js'),'utf8'),s4=await fs.readFile(path.join(ref,'shared-4-CJsHhp5n.js'),'utf8');
  assert.equal(count(s23,'var VJ={},HJ={panels:Jg}'),1);assert.equal(count(s23,'GJ=[WJ(VJ)]'),1);
  assert.equal(count(s23,'fizzyLake:T_()'),2);assert.equal(count(s23,'uo as T_'),1);assert.equal(count(s4,'Of as uo'),1);
  assert.equal(count(s4,'Cf=[]'),1);assert.equal(count(s4,'var Ef=Cf'),1);
  const gate=await server.ssrLoadModule('/src/generated/view-tabs/shared-4-CJsHhp5n.js');
  assert.deepEqual(gate.Cf,[]);assert.equal(gate.Ef,gate.Cf);assert.deepEqual(gate.wf('panels color bubbles',gate.Ef),[]);
  for(const part of ['panels','color','bubbles'])assert.equal(gate.isFizzyLakePartEnabled(part),false,part);
  const app=path.resolve(import.meta.dirname,'..'),hits=[];
  for(const dir of ['src','electron'])for(const name of await fs.readdir(path.join(app,dir),{recursive:true})){
    if(name.split(path.sep).includes('generated')||!/\.(jsx?|mjs|cjs|css|html)$/.test(name))continue;
    const text=await fs.readFile(path.join(app,dir,name),'utf8');
    for(const s of ['data-cds-fizzy-lake','spa:fizzy-lake','fizzyLake'])if(text.includes(s))hits.push(`${dir}/${name}: ${s}`);
  }
  const index=await fs.readFile(path.join(app,'index.html'),'utf8');if(index.includes('fizzy-lake'))hits.push('index.html');
  assert.deepEqual(hits,[]);
});
test('original tab menu names the close-to-end action by reading direction: right in LTR, left in RTL',()=>{
  for(const [direction,label] of [['ltr','Close tabs to the right'],['rtl','Close tabs to the left']]){
    const f=fixture(Tabs.ViewTab.type,{tab:{id:'a',label:'A',closable:true},selected:true,sizes:Tabs.viewTabSizes,labels:Tabs.viewTabLabels,posinset:1,setsize:2,onClose:noop,onCloseToRight:noop},{direction});
    assert.ok(find(f.tree,n=>n.props?.children===label),direction);
    assert.equal(find(f.tree,n=>n.props?.children===(direction==='rtl'?'Close tabs to the right':'Close tabs to the left')),null,direction);f.close();
  }
  assert.equal(Tabs.viewTabLabels.closeTabsToRightRtl,'Close tabs to the left');
});
test('closing from the overflow menu consumes the held key on its owner window until release',()=>{
  const view=events(),closed=[];
  const f=fixture(Tabs.ViewTabOverflowItem,{tab:{id:'hidden',label:'Hidden',closable:true},rtl:false,onActivate:noop,onClose:id=>closed.push(id),sizes:Tabs.viewTabSizes});
  const first=event('Delete',{currentTarget:{ownerDocument:{defaultView:view}}});f.tree.props.onKeyDown(first);
  assert.deepEqual(closed,['hidden']);assert.equal(view.count(),2);
  const held=event('Delete',{repeat:true});view.send('keydown',held);assert.equal(held.defaultPrevented,true);assert.equal(held.stopped,true);
  view.send('keyup',event('Delete'));assert.equal(view.count(),0);
  f.tree.props.onKeyDown(event('Backspace'));assert.deepEqual(closed,['hidden','hidden']);f.close();
});
