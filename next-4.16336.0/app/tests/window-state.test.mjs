import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import windowState from '../electron/window-state.cjs';
const {DEFAULT_WINDOW_SIZE,SAVE_DELAY_MS,WINDOW_EVENTS,validWindowState,placeOnDisplays,loadWindowState,windowStateBounds,restoreWindowState,trackWindowState}=windowState;
// index.chunk-ChZ67Jhw.js Sbe/Cbe/wbe/Ebe over a fake screen and window.
const display=(id,bounds,menuBar=33)=>({id,bounds,workArea:{x:bounds.x,y:bounds.y+menuBar,width:bounds.width,height:bounds.height-menuBar}});
const LAPTOP=display(1,{x:0,y:0,width:1470,height:956}),EXTERNAL=display(2,{x:1470,y:0,width:2560,height:1440});
const screenOf=(...displays)=>({getAllDisplays:()=>displays,getPrimaryDisplay:()=>displays[0],
 getDisplayMatching:rect=>displays.find(d=>rect.x<d.bounds.x+d.bounds.width&&d.bounds.x<rect.x+rect.width&&rect.y<d.bounds.y+d.bounds.height&&d.bounds.y<rect.y+rect.height)||displays[0]});
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'window-state-'));
class FakeWindow extends EventEmitter{
 constructor(bounds){super();this.bounds={...bounds};this.maximized=false;this.fullScreen=false;this.minimized=false;this.destroyed=false;this.calls=[];}
 getBounds(){return {...this.bounds};}isMaximized(){return this.maximized;}isFullScreen(){return this.fullScreen;}isMinimized(){return this.minimized;}isDestroyed(){return this.destroyed;}
 maximize(){this.calls.push('maximize');this.maximized=true;}setFullScreen(value){this.calls.push('setFullScreen:'+value);this.fullScreen=value;}
}
function fakeTimers(){const pending=new Map();let next=1;return {pending,setTimeout:(fn,ms)=>{const id=next++;pending.set(id,{fn,ms});return id;},clearTimeout:id=>pending.delete(id),run(){const due=[...pending.values()];pending.clear();for(const t of due)t.fn();}};}

test('a missing or corrupt file gives the Dfn default 1200x800 with no position (Electron centres it)',()=>{
 const dir=tmp(),file=path.join(dir,'window-state.json'),screen=screenOf(LAPTOP);
 assert.deepEqual(DEFAULT_WINDOW_SIZE,{width:1200,height:800});
 const fresh=loadWindowState(file,screen);
 assert.deepEqual(fresh,{width:1200,height:800,isMaximized:false,isFullScreen:false});
 assert.deepEqual(windowStateBounds(fresh),{width:1200,height:800});
 for(const text of ['{not json','null','[]','{"width":"wide"}','{"width":0,"height":600}','{"x":10,"y":10}']){
  fs.writeFileSync(file,text);assert.deepEqual(loadWindowState(file,screen),fresh,text);
 }
});

test('wbe keeps a position only with a size, and a flag-only state keeps the default size',()=>{
 assert.deepEqual(validWindowState({width:900,height:700,x:5.5,y:3}),{width:900,height:700,isMaximized:false,isFullScreen:false,displayBounds:undefined});
 assert.deepEqual(validWindowState({isMaximized:true,x:4,y:4}),{width:1200,height:800,isMaximized:true,isFullScreen:false,displayBounds:undefined});
 assert.deepEqual(validWindowState({width:900,height:700,x:4,y:8,displayBounds:{x:0,y:0,width:-1,height:5}}),{x:4,y:8,width:900,height:700,isMaximized:false,isFullScreen:false,displayBounds:undefined});
 assert.equal(validWindowState({isMaximized:'yes'}),undefined);
});

test('a frame on the saved display is clamped into its work area (Iye)',()=>{
 const placed=placeOnDisplays({x:600,y:10,width:1468,height:1000,isMaximized:false,isFullScreen:false,displayBounds:LAPTOP.bounds},screenOf(LAPTOP));
 assert.deepEqual([placed.x,placed.y,placed.width,placed.height],[2,33,1468,923],'shrunk to the 923px work area, origin pulled inside it');
 const inside=placeOnDisplays({x:100,y:80,width:1000,height:700,isMaximized:false,isFullScreen:false,displayBounds:LAPTOP.bounds},screenOf(LAPTOP));
 assert.deepEqual([inside.x,inside.y,inside.width,inside.height],[100,80,1000,700],'a frame that fits stays put');
});

test('bounds off every display are re-centred on the primary work area, shrunk to fit',()=>{
 const off={x:4000,y:3000,width:1600,height:1000,isMaximized:false,isFullScreen:false,displayBounds:EXTERNAL.bounds};
 const placed=placeOnDisplays(off,screenOf(LAPTOP));
 assert.deepEqual([placed.x,placed.y,placed.width,placed.height],[0,33,1470,923]);
 const small=placeOnDisplays({...off,width:1000,height:600},screenOf(LAPTOP));
 assert.deepEqual([small.x,small.y,small.width,small.height],[235,194,1000,600]);
});

test('a frame on a display that moved keeps its offset on a same-sized display (Dbe)',()=>{
 const moved=display(3,{x:-2560,y:0,width:2560,height:1440});
 const placed=placeOnDisplays({x:1570,y:100,width:1000,height:700,isMaximized:false,isFullScreen:false,displayBounds:EXTERNAL.bounds},screenOf(LAPTOP,moved));
 assert.deepEqual([placed.x,placed.y,placed.width,placed.height],[-2460,100,1000,700]);
});

test('a saved file round-trips through loadWindowState and keeps maximized state',()=>{
 const dir=tmp(),file=path.join(dir,'window-state.json');
 fs.writeFileSync(file,JSON.stringify({x:100,y:80,width:1000,height:700,isMaximized:true,isFullScreen:false,displayBounds:LAPTOP.bounds}));
 const state=loadWindowState(file,screenOf(LAPTOP));
 assert.deepEqual(state,{x:100,y:80,width:1000,height:700,isMaximized:true,isFullScreen:false,displayBounds:LAPTOP.bounds});
 const win=new FakeWindow(windowStateBounds(state));restoreWindowState(win,state);
 assert.deepEqual(win.calls,['maximize']);
 const full=new FakeWindow({x:0,y:0,width:10,height:10});restoreWindowState(full,{...state,isMaximized:false,isFullScreen:true});
 assert.deepEqual(full.calls,['setFullScreen:true']);
});

test('track: debounced bbe save on window events, immediate save on close, minimized skipped, bounds kept while maximized',()=>{
 const dir=tmp(),file=path.join(dir,'nested','window-state.json'),screen=screenOf(LAPTOP),timers=fakeTimers();
 assert.equal(SAVE_DELAY_MS,1000);
 assert.deepEqual(WINDOW_EVENTS,['resize','move','maximize','unmaximize','enter-full-screen','leave-full-screen']);
 const win=new FakeWindow({x:135,y:89,width:1200,height:800});
 const tracker=trackWindowState(win,{file,screen,state:{width:1200,height:800,isMaximized:false,isFullScreen:false},timers});
 win.bounds={x:200,y:100,width:900,height:650};win.emit('resize');win.emit('move');
 assert.equal(timers.pending.size,1,'one debounced save');assert.equal([...timers.pending.values()][0].ms,1000);
 assert.equal(fs.existsSync(file),false,'nothing written before the delay');
 timers.run();
 const saved=()=>JSON.parse(fs.readFileSync(file,'utf8'));
 assert.deepEqual(saved(),{width:900,height:650,isMaximized:false,isFullScreen:false,x:200,y:100,displayBounds:LAPTOP.bounds});
 // Maximized: the normal bounds stay; only the flag changes.
 win.maximized=true;win.bounds={x:0,y:33,width:1470,height:923};win.emit('maximize');timers.run();
 assert.deepEqual([saved().x,saved().width,saved().isMaximized],[200,900,true]);
 // Minimized: skipped entirely.
 win.maximized=false;win.minimized=true;win.bounds={x:0,y:0,width:10,height:10};win.emit('unmaximize');timers.run();
 assert.equal(saved().isMaximized,true);
 // Close saves at once (no timer).
 win.minimized=false;win.bounds={x:300,y:120,width:1000,height:700};win.emit('close');
 assert.equal(timers.pending.size,0);assert.deepEqual([saved().x,saved().y,saved().width,saved().isMaximized],[300,120,1000,false]);
 assert.deepEqual(loadWindowState(file,screen),{...saved()},'the written file loads back unchanged');
 win.emit('closed');assert.equal(win.listenerCount('resize'),0,'closed unmanages');assert.equal(tracker.state.x,300);
});

test('a session torn off the sidebar opens its window at the drop point, kept on that display (shared-19 DY initialPosition)',()=>{
 const {positionWindowState}=windowState,screen=screenOf(LAPTOP,EXTERNAL);
 const state={width:1200,height:800,isMaximized:true,isFullScreen:false};
 assert.deepEqual(positionWindowState(state,{x:1600,y:200},screen),{width:1200,height:800,x:1600,y:200,isMaximized:false,isFullScreen:false});
 // Near the laptop's right edge: pulled back so the frame stays on its work area (below the menu bar).
 assert.deepEqual(positionWindowState(state,{x:1000,y:0},screenOf(LAPTOP)),{width:1200,height:800,x:270,y:33,isMaximized:false,isFullScreen:false});
 assert.equal(positionWindowState(state,null,screen),state);
 assert.equal(positionWindowState(state,{x:NaN,y:1},screen),state);
});
