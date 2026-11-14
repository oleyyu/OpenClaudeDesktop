import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import * as menuModel from '../electron/tray-menu.mjs';
import menuBarModule from '../electron/menu-bar.cjs';
import desktop from '../electron/desktop-settings.cjs';
const {createMenuBar}=menuBarModule,{desktopPatch,defaults}=desktop;
const {trayUsageRows,trayMenuTemplate,collapseSeparators}=menuModel;

const chatgpt=(planType='pro',email='a@example.invalid')=>({account:{type:'chatgpt',email,planType},requiresOpenaiAuth:true});
const limits=(...used)=>({rateLimitsByLimitId:Object.fromEntries(used.map((u,i)=>[i?'model-'+i:'codex',{limitId:i?'model-'+i:'codex',primary:{usedPercent:u,windowDurationMins:300},secondary:null}]))});
const labels=items=>items.map(i=>i.type==='separator'?'---':i.label);

test('menu bar defaults on and validates as a boolean desktop preference',()=>{
 assert.equal(defaults.menuBarEnabled,true);
 assert.deepEqual(desktopPatch({menuBarEnabled:false}),{menuBarEnabled:false});
 assert.throws(()=>desktopPatch({menuBarEnabled:'yes'}),/Invalid desktop setting/);
});

test('tray rows follow tOr/sOr: plan, peak usage, unavailable only without any snapshot',()=>{
 assert.deepEqual(trayUsageRows({account:chatgpt(),limits:limits(12.4,61.6)},'en-US').map(r=>[r.label,r.enabled]),[['Pro plan',false],['Usage: 62%',false]]);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('plus'),limits:null,limitsFailed:true},'en-US')),['Plus plan','Usage unavailable']);
 // A later failed refresh keeps showing the last good snapshot instead.
 assert.deepEqual(labels(trayUsageRows({account:chatgpt(),limits:limits(40),limitsFailed:true},'en-US')),['Pro plan','Usage: 40%']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt(),limits:null,limitsFailed:false},'en-US')),['Pro plan']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt(),limits:{rateLimitsByLimitId:{}}},'en-US')),['Pro plan']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('unknown'),limits:limits(0)},'en-US')),['Usage: 0%']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt(),limits:limits(55)},'de-DE')),['Pro plan','Usage: 55\u00a0%']);
 for(const account of [null,{account:null},{account:{type:'apiKey'}},{account:{type:'amazonBedrock'}}])
  assert.deepEqual(trayUsageRows({account,limits:limits(90),limitsFailed:true},'en-US'),[]);
});

test('tray rows show a bridge sign-in name as it is, and only Codex plan ids as "{plan} plan"',()=>{
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('Z.ai Coding Plan'),limits:limits(40)},'en-US')),['Z.ai Coding Plan','Usage: 40%']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('OpenAI, GitHub Copilot'),limits:null},'en-US')),['OpenAI, GitHub Copilot']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('ChatGPT Pro/Plus'),limits:null},'en-US')),['ChatGPT Pro/Plus']);
 // A Codex plan id the labels don't know yet still reads as a plan.
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('business_plus'),limits:null},'en-US')),['business plus plan']);
 assert.deepEqual(labels(trayUsageRows({account:chatgpt('self_serve_business_prolite'),limits:null},'en-US')),['Business plan']);
});

test('menu template matches NOr with M5n separator collapsing',()=>{
 assert.deepEqual(labels(trayMenuTemplate({appName:'OpenClaude Desktop',rows:[]})),['Show App','---','Quit OpenClaude Desktop']);
 assert.deepEqual(labels(trayMenuTemplate({appName:'OpenClaude Desktop',rows:[{label:'Pro plan',enabled:false}]})),['Show App','---','Pro plan','---','Quit OpenClaude Desktop']);
 assert.deepEqual(labels(collapseSeparators([{type:'separator'},{label:'a'},{type:'separator'},{label:'h',visible:false},{type:'separator'},{label:'b'},{type:'separator'}])),['a','---','b']);
});

function fixture({enabled=true,account=chatgpt()}={}){
 const state={enabled,account,trays:[],menus:[],calls:[],quit:0};
 class FakeTray extends EventEmitter{constructor(image){super();this.image=image;this.destroyed=false;state.trays.push(this);}setToolTip(v){this.tooltip=v;}isDestroyed(){return this.destroyed;}destroy(){this.destroyed=true;}popUpContextMenu(menu){state.menus.push(menu);}}
 const Menu={buildFromTemplate:template=>({items:template})};
 const nativeImage={createFromPath:p=>({path:p})};
 const window={minimized:false,visible:true,destroyed:false,isDestroyed(){return this.destroyed;},isMinimized(){return this.minimized;},isVisible(){return this.visible;},
  restore(){state.calls.push('restore');this.minimized=false;},focus(){state.calls.push('focus');},show(){state.calls.push('show');this.visible=true;}};
 let pending=[];const client={request(method,params,timeout){state.calls.push([method,params,timeout]);return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
 const app={name:'OpenClaude Desktop',getLocale:()=>'en-US',quit:()=>state.quit++};
 const bar=createMenuBar({Tray:FakeTray,Menu,nativeImage,app,iconPath:'/icons/TrayIconTemplate.png',menuModel,getWindow:()=>window,getEnabled:()=>state.enabled,getAccount:()=>state.account,getClient:()=>state.client===undefined?client:state.client});
 return {state,bar,window,client,settle:(i,value,fail)=>fail?pending[i].reject(Error('read failed')):pending[i].resolve(value),pending:()=>pending};
}

test('update creates one template tray while enabled and destroys it when turned off',()=>{
 const f=fixture();f.bar.update();f.bar.update();
 assert.equal(f.state.trays.length,1);assert.equal(f.state.trays[0].image.path,'/icons/TrayIconTemplate.png');assert.equal(f.state.trays[0].tooltip,'OpenClaude Desktop');assert.equal(f.bar.active(),true);
 f.state.enabled=false;f.bar.update();assert.equal(f.state.trays[0].destroyed,true);assert.equal(f.bar.active(),false);
 f.state.enabled=true;f.bar.update();assert.equal(f.state.trays.length,2);f.bar.dispose();assert.equal(f.state.trays[1].destroyed,true);f.bar.update();assert.equal(f.state.trays.length,2);
 const off=fixture({enabled:false});off.bar.update();assert.equal(off.state.trays.length,0);
});

test('left click and Show App restore, show and focus the main window like pji/pK',()=>{
 const f=fixture();f.bar.update();const tray=f.state.trays[0];
 f.window.minimized=true;tray.emit('click');assert.deepEqual(f.state.calls,['restore','focus']);
 f.state.calls.length=0;f.window.visible=false;tray.emit('click');assert.deepEqual(f.state.calls,['show','focus']);
 f.state.calls.length=0;f.window.visible=true;f.bar.showApp();assert.deepEqual(f.state.calls,['focus']);
 f.state.calls.length=0;f.window.visible=false;f.bar.showApp();assert.deepEqual(f.state.calls,['show']);
 f.state.calls.length=0;f.window.minimized=true;f.bar.showApp();assert.deepEqual(f.state.calls,['restore','focus']);
 f.state.calls.length=0;f.window.destroyed=true;tray.emit('click');f.bar.showApp();assert.deepEqual(f.state.calls,[]);
});

test('right click refetches real limits, falls back after the wait, and wires Show App/Quit',async()=>{
 const f=fixture();f.bar.update();
 const first=f.bar.popUp();f.settle(0,limits(30,72));await first;
 assert.deepEqual(f.state.calls[0],['account/rateLimits/read',{},15000]);
 const menu=f.state.menus.at(-1);assert.deepEqual(labels(menu.items),['Show App','---','Pro plan','Usage: 72%','---','Quit OpenClaude Desktop']);
 assert.deepEqual(menu.items.filter(i=>i.label&&i.enabled===false).map(i=>i.label),['Pro plan','Usage: 72%']);
 menu.items.at(-1).click();assert.equal(f.state.quit,1);f.window.visible=true;menu.items[0].click();assert.equal(f.state.calls.at(-1),'focus');
 // A slow read shows the cached snapshot after the wait instead of blocking the menu.
 const t0=Date.now();await f.bar.popUp();assert.ok(Date.now()-t0>=700);assert.deepEqual(labels(f.state.menus.at(-1).items).slice(2,4),['Pro plan','Usage: 72%']);
 // The still-pending read is shared, not duplicated, then a failure keeps the snapshot.
 const again=f.bar.popUp();assert.equal(f.pending().length,2);f.settle(1,null,true);await again;assert.deepEqual(labels(f.state.menus.at(-1).items).slice(2,4),['Pro plan','Usage: 72%']);
});

test('usage cache never crosses accounts or connections, and ineligible accounts send no read',async()=>{
 const f=fixture();f.bar.update();const a=f.bar.popUp();f.settle(0,limits(88));await a;
 f.state.account=chatgpt('plus','b@example.invalid');const b=f.bar.popUp();f.settle(1,null,true);await b;
 assert.deepEqual(labels(f.state.menus.at(-1).items),['Show App','---','Plus plan','Usage unavailable','---','Quit OpenClaude Desktop']);
 f.state.client={request:async()=>limits(5)};await f.bar.popUp();assert.deepEqual(labels(f.state.menus.at(-1).items).slice(2,4),['Plus plan','Usage: 5%']);
 const reads=f.state.calls.length;f.state.account={account:{type:'apiKey'},requiresOpenaiAuth:false};await f.bar.popUp();
 assert.equal(f.state.calls.length,reads);assert.deepEqual(labels(f.state.menus.at(-1).items),['Show App','---','Quit OpenClaude Desktop']);
 f.state.account=null;await f.bar.popUp();assert.deepEqual(labels(f.state.menus.at(-1).items),['Show App','---','Quit OpenClaude Desktop']);
});

test('a menu requested while the tray is being removed never pops up',async()=>{
 const f=fixture();f.bar.update();const pending=f.bar.popUp();f.state.enabled=false;f.bar.update();f.settle(0,limits(10));await pending;assert.equal(f.state.menus.length,0);
 const g=fixture();g.bar.update();const late=g.bar.popUp();g.bar.dispose();g.settle(0,limits(10));await late;assert.equal(g.state.menus.length,0);
});
