import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSettingsAnchor, highlightSettingsTarget } from '../src/settings-anchor.mjs';
function harness({reduced=false}={}) {
 let time=0,next=0;const timers=new Map(),frames=new Map(),events=new Map(),observers=[];
 const add=(type,fn)=>{if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);};
 const host={performance:{now:()=>time},innerHeight:800,matchMedia:()=>({matches:reduced}),getComputedStyle:node=>({overflowY:node.overflow||'visible'}),
  setTimeout(fn,ms){const id=++next;timers.set(id,{at:time+ms,fn});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame(fn){const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  addEventListener:add,removeEventListener:(type,fn)=>events.get(type)?.delete(fn),
  MutationObserver:class {constructor(fn){this.fn=fn;observers.push(this);}observe(){this.live=true;}disconnect(){this.live=false;}},
 };
 const advance=ms=>{const end=time+ms;while(true){const due=[...timers.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;time=due[1].at;timers.delete(due[0]);due[1].fn();}time=end;};
 return {host,advance,frames,timers,events,observers,step(ms=16){advance(ms);const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));},event(type){for(const fn of events.get(type)||[])fn();},mutate(){for(const observer of observers)if(observer.live)observer.fn();}};
}
function element(over={}) {
 const classes=new Set(),handlers=new Map();
 return {tagName:'DIV',isConnected:true,top:390,height:20,visible:true,parentElement:null,dataset:{settingId:'target'},classes,handlers,scrolls:[],
  classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},
  getBoundingClientRect(){return {top:this.top,bottom:this.top+this.height};},getClientRects(){return this.visible?[this.getBoundingClientRect()]:[];},
  closest(){return this.placeholder?{}:null;},querySelector(){return this.title||null;},scrollIntoView(options){this.scrolls.push(options);},
  addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:(type,fn)=>{if(handlers.get(type)===fn)handlers.delete(type);},...over};
}
function target(over={}) {const title=element(over),row=element({title});title.parentElement=row;return {row,title};}
const settle=h=>{for(let i=0;i<17;i++)h.step();};
test('highlight waits for at least 250ms and three stable frames, then ends only on its animation or fallback',()=>{
 const h=harness(),{row,title}=target();let done=0;
 const off=highlightSettingsTarget(row,()=>done++,h.host);
 assert.deepEqual(title.scrolls,[{block:'center',behavior:'smooth'}]);
 for(let i=0;i<15;i++)h.step();assert.equal(title.classes.size,0);
 h.step();assert.ok(title.classes.has('feature-anchor-highlight'));assert.ok(row.classes.has('feature-anchor-row-fill'));
 title.handlers.get('animationend')({animationName:'other'});assert.equal(done,0);
 title.handlers.get('animationend')({animationName:'ss-anchor-line'});assert.equal(done,1);
 off();h.advance(10000);assert.equal(done,1);assert.equal(row.classes.size,0);assert.equal(h.timers.size,0);
 assert.ok([...h.events.values()].every(set=>set.size===0));
});
test('moving target waits until stable; hard deadline prevents endless layout tracking',()=>{
 // kv recenters only beyond a quarter viewport; start outside that region.
 const h=harness(),{row,title}=target({top:700});const off=highlightSettingsTarget(row,()=>{},h.host);
 for(let i=0;i<93;i++){title.top+=2;h.step();}assert.equal(title.classes.size,0);
 title.top+=2;h.step();assert.ok(title.classes.has('feature-anchor-highlight'));assert.equal(title.scrolls.at(-1).behavior,'instant');off();
});
test('correction uses nearest scroll viewport, while user interaction suppresses a second scroll',()=>{
 for(const manual of [false,true]){
  const h=harness(),{row,title}=target({top:700});row.parentElement=element({top:100,height:400,overflow:'auto',scrollHeight:900,clientHeight:400});
  const off=highlightSettingsTarget(row,()=>{},h.host);h.advance(0);if(manual)h.event('wheel');settle(h);
  assert.equal(title.scrolls.length,manual?1:2);off();
 }
});
test('reduced motion is instant and fallback cleanup still removes classes; cancellation never completes a stale request',()=>{
 const h=harness({reduced:true}),{row,title}=target();let done=0;
 let off=highlightSettingsTarget(row,()=>done++,h.host);assert.equal(title.scrolls[0].behavior,'instant');settle(h);h.advance(2050);assert.equal(done,1);assert.equal(title.classes.size,0);off();
 off=highlightSettingsTarget(row,()=>done++,h.host);off();settle(h);h.advance(5000);assert.equal(done,1);assert.equal(h.frames.size,0);
 off=highlightSettingsTarget(row,()=>done++,h.host);title.isConnected=false;h.step();assert.equal(done,2);off();
});
test('late catalog targets wait for visible non-placeholder content, then detach the observer',()=>{
 const h=harness(),{row,title}=target();row.visible=false;
 const late=element(),root={querySelectorAll:selector=>selector==='[data-setting-id]'?[row]:[late],contains:()=>false};let done=0;
 const off=bindSettingsAnchor(root,'target',()=>done++,h.host);h.step();assert.equal(h.observers[0].live,true);
 h.advance(300);assert.equal(done,0);row.visible=true;row.placeholder=true;h.mutate();assert.equal(title.scrolls.length,0);
 row.placeholder=false;h.mutate();assert.equal(title.scrolls.length,1);assert.equal(h.observers[0].live,false);settle(h);assert.ok(title.classes.size>0);
 off();h.advance(10000);assert.equal(done,0);assert.equal(h.timers.size,0);
});
test('missing targets finish after 300ms or 5500ms for late slots; old observer cannot activate after cleanup',()=>{
 for(const delay of [false,true]){
  const h=harness(),{row,title}=target(),rows=[];let done=0;
  const root={querySelectorAll:selector=>selector==='[data-setting-id]'?rows:delay?[element()]:[],contains:()=>false};
  const off=bindSettingsAnchor(root,'target',()=>done++,h.host);h.step();h.advance(delay?5499:299);assert.equal(done,0);h.advance(1);assert.equal(done,1);
  rows.push(row);h.observers[0].fn();assert.equal(title.scrolls.length,0);off();
 }
});
