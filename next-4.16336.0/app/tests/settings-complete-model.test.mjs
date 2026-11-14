import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {settingsSearch,sandboxFacts,mcpStatus,desktopErrors,DEEPSEEK_SANDBOX_REASON} from '../src/settings-model.mjs';
import {configReadResponse} from '../../harness/packages/codex-app-server/src/catalog.js';
import desktop from '../electron/desktop-settings.cjs';
const {desktopPatch,createDesktopSettings,desktopPreferences,defaults:desktopDefaults}=desktop;
test('settings search ranks whole labels, word starts and fragments, without returning unsupported rows',()=>{const sections=[{id:'code',label:'Code'},{id:'general',label:'General'}],groups=[{tab:'code',rows:[{id:'awake',label:'Keep computer awake'},{id:'fast',label:'Fast mode'}]}];assert.equal(settingsSearch(sections,groups,'fast')[0].id,'fast');assert.equal(settingsSearch(sections,groups,'keep awake')[0].id,'awake');assert.equal(settingsSearch(sections,groups,'code')[0].tab,'code');assert.deepEqual(settingsSearch(sections,groups,'billing'),[]);assert.equal(settingsSearch(sections,groups,'').length,2);});
test('sandbox only reports management from real requirements or relevant origins',()=>{assert.equal(sandboxFacts(null,null).mode,null);assert.equal(sandboxFacts({config:{sandbox_mode:'read-only'},origins:{model:{name:{type:'mdm'}}}},{}).reason,'The Mode menu sets this for each message, overriding your Codex configuration. Choose Bypass permissions for full access.');assert.equal(sandboxFacts({config:{sandbox_mode:'workspace-write'}},{requirements:{allowedSandboxModes:['workspace-write']}}).reason,'Managed by your organization');assert.equal(sandboxFacts({config:{sandbox_mode:'danger-full-access',approval_policy:'never'}},{}).bypass,true);assert.equal(mcpStatus({runtimeStatus:'connected'}),'Running');assert.equal(mcpStatus({runtimeStatus:'connected',toolsError:'failed discovery'}),'Failed');assert.equal(mcpStatus({runtimeStatus:null}),'Status unavailable');});
test('DeepSeek sandbox row reads the bridge config/read with the Mode-menu reason; Codex names itself',()=>{const bridge=configReadResponse({mcpEntries:[{options:{id:'gh',name:'@deepseek-ai/dsh-mcp-client',config:{serverName:'gh',transport:'stdio',command:'npx',args:['-y','x'],env:{TOKEN:'secret'}}}}]});const facts=sandboxFacts(bridge,{requirements:null},{engine:'deepseek'});assert.equal(facts.mode,'workspace-write');assert.equal(facts.reason,DEEPSEEK_SANDBOX_REASON);assert.equal(facts.reason,'Set per session with the Mode menu (DeepSeek Harness permission presets).');assert.equal(facts.bypass,false);assert.equal(sandboxFacts(bridge,{requirements:null}).reason,'The Mode menu sets this for each message, overriding your Codex configuration. Choose Bypass permissions for full access.');assert.equal(sandboxFacts(null,null,{engine:'deepseek'}).mode,null);assert.equal(sandboxFacts(bridge,{requirements:{allowedSandboxModes:['read-only']}},{engine:'deepseek'}).reason,'Managed by your organization');});
// Audit 11/19/39/61/83: the reason and mode name the running core (descriptor), never a fixed DeepSeek, in both languages.
test('sandbox row copy names the running core on every core',async()=>{
 const {setAssistantName,setLocale}=await import('../electron/i18n/index.mjs');
 const {registerCores,coreById,coreForEngine,coreCapabilities}=await import('../electron/core-registry.mjs');
 const config=mode=>({config:{sandbox_mode:mode,approval_policy:'on-request'}});
 try{
  for(const name of ['Codex','GLM']){setAssistantName(name);
   // Codex: config/read reports no sandbox_mode; the app sets it per turn from the Mode menu.
   assert.deepEqual([sandboxFacts(config(null),null,{engine:'codex'}).reason,sandboxFacts(config(null),null,{engine:'codex'}).mode],['Set per session with the Mode menu.','Per session']);
   assert.equal(sandboxFacts(config('read-only'),null,{engine:'codex'}).reason,'The Mode menu sets this for each message, overriding your Codex configuration. Choose Bypass permissions for full access.');
   assert.equal(sandboxFacts(config('read-only'),null,{engine:'codex'}).mode,'read-only');
   // Bridges that sandbox commands (Seatbelt) get the Mode-menu reason; one whose descriptor or reported
   // capabilities say sandbox: false gets "None" (keyed on the registry, so this holds before and after a core declares it).
   for(const engine of ['zcode','opencode','mimo','kimi',{engine:'zcode'}]){const id=typeof engine==='string'?engine:engine.engine,unsandboxed=coreForEngine(id).sandbox===false||coreCapabilities(engine).sandbox===false,facts=sandboxFacts(config('workspace-write'),null,{engine});
    assert.deepEqual([facts.reason,facts.mode],unsandboxed?[`${coreForEngine(id).name} doesn’t sandbox commands. The Mode menu sets which ones need your approval.`,'None']:['Set per session with the Mode menu.','workspace-write'],JSON.stringify(engine));}
   for(const [engine,core] of [['codex','Codex'],['zcode','ZCode'],['opencode','OpenCode'],['deepseek','DeepSeek Harness']])assert.equal(sandboxFacts(null,null,{engine}).reason,`${core} configuration is unavailable.`);
   for(const engine of ['codex','zcode','opencode','mimo'])for(const result of [config(null),config('workspace-write'),null])assert.doesNotMatch(sandboxFacts(result,null,{engine}).reason,/DeepSeek/,engine);
  }
  // A core without a sandbox (descriptor or reported sandbox: false) says so instead of echoing a synthetic mode.
  registerCodexPack([{...coreById('zcode'),sandbox:false}]);
  const none=sandboxFacts(config('workspace-write'),null,{engine:'zcode'});
  assert.deepEqual([none.reason,none.mode],['ZCode doesn’t sandbox commands. The Mode menu sets which ones need your approval.','None']);
  registerCodexPack([]);
  assert.equal(sandboxFacts(config('workspace-write'),null,{engine:{engine:'opencode',capabilities:{sandbox:false}}}).mode,'None');
  setLocale('zh-CN');setAssistantName('Codex');
  for(const result of [config(null),config('read-only'),null])assert.doesNotMatch(sandboxFacts(result,null,{engine:'codex'}).reason,/DeepSeek/);
  assert.match(sandboxFacts(config('read-only'),null,{engine:'codex'}).reason,/Codex/);
  assert.match(sandboxFacts(config('workspace-write'),null,{engine:'deepseek'}).reason,/DeepSeek Harness/);
 }finally{registerCodexPack([]);setLocale('en-US');setAssistantName('DeepSeek');}
});
// ZCode runs approved commands unconfined (zcode-bridge README: "ZCode has no sandbox"), while its config/read
// reports a synthetic sandbox_mode; the row must say "None", not "workspace-write". Pending the descriptor
// (app/electron/cores/zcode.mjs `sandbox: false`) or the bridge's initialize capabilities.sandbox: false.
test('ZCode sandbox row says it does not sandbox commands',async()=>{
 const {coreCapabilities,coreForEngine}=await import('../electron/core-registry.mjs');
 assert.ok(coreForEngine('zcode').sandbox===false||coreCapabilities('zcode').sandbox===false);
 const facts=sandboxFacts({config:{sandbox_mode:'workspace-write',approval_policy:'on-request'}},null,{engine:'zcode'});
 assert.deepEqual([facts.mode,facts.reason],['None','ZCode doesn’t sandbox commands. The Mode menu sets which ones need your approval.']);
});
test('settings pages never print raw RPC failures; only a lost core gets one short notice',()=>{assert.deepEqual(desktopErrors({policy:{code:-32601}}),[]);assert.deepEqual(desktopErrors({policy:'config/read is not supported by the DeepSeek core yet.',servers:'boom'}),[]);assert.deepEqual(desktopErrors(undefined),[]);const notices=desktopErrors({connection:'Error invoking remote method: DeepSeek connection changed.',policy:'x'});assert.equal(notices.length,1);assert.equal(notices[0].key,'connection');assert.doesNotMatch(notices[0].message,/invoking|connection changed/);});
test('desktop preference validation rejects unsupported levels and archive periods',()=>{assert.throws(()=>desktopPatch({archiveInactiveDays:3}));assert.throws(()=>desktopPatch({keepAwake:1}));assert.throws(()=>desktopPatch({completeNotifications:'automatic'}));assert.deepEqual(desktopPatch({keepAwake:true,archiveInactiveDays:14,arbitrary:'x'}),{keepAwake:true,archiveInactiveDays:14});});
function fixture(overrides={}){const config={threadIds:['t'],archivedThreadIds:[],keepAwake:true,completeNotifications:'banner',notificationSound:'none',...overrides},calls=[],pm=new EventEmitter(),window=new EventEmitter();let battery=false,focus=false;pm.isOnBatteryPower=()=>battery;window.isFocused=()=>focus;window.show=()=>calls.push('show');window.focus=()=>calls.push('focus');class Notice extends EventEmitter{static isSupported(){return true;}constructor(options){super();calls.push(['notice',options]);}show(){calls.push('notice-show');}close(){calls.push('notice-close');}}
 const app={dock:{setBadge:v=>calls.push(['badge',v]),bounce:v=>calls.push(['bounce',v])},getLoginItemSettings:()=>({openAtLogin:false}),setLoginItemSettings:v=>calls.push(['startup',v])};const client={request:async(method,params)=>{calls.push([method,params]);if(method==='thread/read')return {thread:{id:'t',status:{type:'idle'},updatedAt:1}};if(['thread/backgroundTerminals/list','thread/list'].includes(method))return {data:[],nextCursor:null};return {};}};
 const service=createDesktopSettings({app,powerMonitor:pm,powerSaveBlocker:{start:v=>(calls.push(['power-start',v]),4),stop:v=>calls.push(['power-stop',v])},Notification:Notice,getConfig:()=>config,getClient:()=>client,sessionOperations:{assertAvailable(){},reserveMessage:()=>()=>{}},save:()=>calls.push('save'),emit:e=>calls.push(e),getWindow:()=>window,gitStatus:async()=>({isRepo:true,hasChanges:!!config.fixtureDirty})});return {service,config,calls,pm,client,battery:v=>{battery=v;pm.emit('on-battery');}};}
const started=id=>({method:'turn/started',params:{threadId:'t',turn:{id}}}),completed=id=>({method:'turn/completed',params:{threadId:'t',turn:{id,status:'completed'}}});
test('awake tracks observed turns, old completions cannot stop newer work, battery and disposal stop blockers',()=>{const f=fixture({keepAwakeOnBattery:false});f.service.start();assert.equal(f.service.snapshot().powerActive,false);f.service.observe(started('a'));assert.equal(f.service.snapshot().powerActive,true);f.service.observe(started('b'));f.service.observe(completed('a'));assert.equal(f.service.snapshot().powerActive,true);f.battery(true);assert.equal(f.service.snapshot().powerActive,false);f.battery(false);assert.equal(f.service.snapshot().powerActive,true);f.service.dispose();assert.equal(f.pm.listenerCount('on-battery'),0);assert.equal(f.service.snapshot().powerActive,false);assert.equal(f.calls.some(v=>v[0]==='startup'),false);});
test('notifications use actual completion and sound choice, and close on disposal',()=>{const f=fixture({keepAwake:false});f.service.observe(started('a'));f.service.observe(completed('a'));const notice=f.calls.find(v=>v[0]==='notice');assert.equal(notice[1].silent,true);assert.equal(f.calls.filter(v=>v==='notice-show').length,1);f.service.observe(completed('a'));assert.equal(f.calls.filter(v=>v==='notice-show').length,1);f.service.dispose();assert.ok(f.calls.includes('notice-close'));});
test('inactive archive checks real thread state and terminals, fails closed, persists only after actual RPC',async()=>{const f=fixture({archiveInactiveDays:1});await f.service.sweep();assert.equal(f.calls.filter(v=>v[0]==='thread/archive').length,1);assert.deepEqual(f.config.archivedThreadIds,['t']);f.service.dispose();const g=fixture({archiveInactiveDays:1});g.client.request=async m=>{if(m==='thread/read')return {thread:{status:{type:'idle'},updatedAt:1}};if(m==='thread/backgroundTerminals/list')throw Error('unsupported');throw Error('must not archive');};await g.service.sweep();assert.deepEqual(g.config.threadIds,['t']);g.service.dispose();});
test('inactive archive treats a session the core has not loaded (DeepSeek cold read) as quiescent, never an active one',async()=>{for(const [type,archives] of [['notLoaded',1],['active',0],['systemError',0]]){const f=fixture({archiveInactiveDays:1});const original=f.client.request;f.client.request=async(m,p)=>{if(m==='thread/read'){f.calls.push([m,p]);return {thread:{id:'t',status:{type},updatedAt:1}};}return original(m,p);};await f.service.sweep();assert.equal(f.calls.filter(v=>v[0]==='thread/archive').length,archives,type);assert.deepEqual(f.config.archivedThreadIds,archives?['t']:[],type);f.service.dispose();}});
test('archive refuses a live child, dirty worktree, or activity arriving during its queries',async()=>{for(const mode of ['child','dirty','race']){const f=fixture({archiveInactiveDays:1,worktreeDirectories:['/test']});const original=f.client.request;f.client.request=async(m,p)=>{if(m==='thread/read')return {thread:{status:{type:'idle'},updatedAt:1,cwd:mode==='dirty'?'/test':null}};if(m==='thread/list'&&mode==='child')return {data:[{parentThreadId:'t',status:{type:'active'}}],nextCursor:null};if(m==='thread/list'&&mode==='race')f.service.observe(started('new'));return original(m,p);};if(mode==='dirty')f.config.fixtureDirty=true;
 await f.service.sweep();assert.deepEqual(f.config.threadIds,['t']);assert.equal(f.calls.some(v=>v[0]==='thread/archive'),false);f.service.dispose();}});

test('workflow activity prevents archive and survives a separate Codex connection loss without clearing awake',async()=>{const f=fixture({archiveInactiveDays:1});f.service.observe({kind:'workflow',run:{id:'workflow-1',threadId:'t',status:'running'}});f.service.observe({kind:'connection',connected:false});assert.equal(f.service.snapshot().powerActive,true);await f.service.sweep();assert.equal(f.calls.some(v=>v[0]==='thread/archive'),false);f.service.observe({kind:'workflow',run:{id:'workflow-1',threadId:'t',status:'completed'}});assert.equal(f.service.snapshot().powerActive,false);await f.service.sweep();assert.equal(f.calls.filter(v=>v[0]==='thread/archive').length,1);f.service.dispose();});
test('a just-restored long-idle session is not re-archived until a full inactivity window passes after the restore',async()=>{const f=fixture({archiveInactiveDays:1,restoredAt:{t:Date.now()}});await f.service.sweep();assert.equal(f.calls.filter(v=>v[0]==='thread/archive').length,0);assert.deepEqual(f.config.threadIds,['t']);f.service.dispose();const g=fixture({archiveInactiveDays:1,restoredAt:{t:Date.now()-2*86400000}});await g.service.sweep();assert.equal(g.calls.filter(v=>v[0]==='thread/archive').length,1);g.service.dispose();});

// Fidelity F14: the original first-run defaults (index.chunk-ChZ67Jhw.js preferences: notificationLevels {} read as
// banner by rH, c71860c77-yvGrrWO9.js:2270 `?? "banner"`; ccKeepAwakeWhileWorking/OnBattery true, tV `!== !1`) and the
// per-type level options (c71860c77:2004-2029: Task complete offers only Off and Banners).
test('defaults: notification levels read as Banners and keep-awake (and on battery) as on; saved values win',()=>{
 assert.deepEqual(['permissionNotifications','questionNotifications','completeNotifications','keepAwake','keepAwakeOnBattery'].map(key=>desktopDefaults[key]),['banner','banner','banner',true,true]);
 const empty=desktopPreferences({threadIds:[]});assert.equal(empty.completeNotifications,'banner');assert.equal(empty.permissionNotifications,'banner');assert.equal(empty.questionNotifications,'banner');assert.equal(empty.keepAwake,true);assert.equal(empty.keepAwakeOnBattery,true);
 const saved=desktopPreferences({permissionNotifications:'off',questionNotifications:'badge',keepAwake:false,keepAwakeOnBattery:false});assert.deepEqual([saved.permissionNotifications,saved.questionNotifications,saved.keepAwake,saved.keepAwakeOnBattery],['off','badge',false,false]);
 // A Task complete level an older build saved as 'badge' reads as Banners.
 assert.equal(desktopPreferences({completeNotifications:'badge'}).completeNotifications,'banner');
});
test('Task complete rejects Badge only; permission and question accept off, badge and banner',()=>{
 assert.throws(()=>desktopPatch({completeNotifications:'badge'}),/Invalid notification level/);
 assert.deepEqual(desktopPatch({completeNotifications:'banner',permissionNotifications:'badge',questionNotifications:'off'}),{permissionNotifications:'badge',questionNotifications:'off',completeNotifications:'banner'});
 assert.deepEqual(desktopPatch({completeNotifications:'off'}),{completeNotifications:'off'});
});
test('a profile without the keys gets a banner when a turn completes and keeps the Mac awake on battery while a thread works',()=>{
 const f=fixture({keepAwake:undefined,completeNotifications:undefined,notificationSound:'system'});delete f.config.keepAwake;delete f.config.completeNotifications;
 f.service.start();f.battery(true);f.service.observe(started('a'));
 assert.equal(f.service.snapshot().powerActive,true,'keep-awake and keep-awake on battery default on');assert.ok(f.calls.some(v=>v[0]==='power-start'));
 f.service.observe(completed('a'));
 const notice=f.calls.find(v=>v[0]==='notice');assert.ok(notice,'banner shown');assert.equal(notice[1].body,'DeepSeek has finished your instructions.');assert.equal(notice[1].silent,false);assert.ok(f.calls.includes('notice-show'));
 assert.equal(f.service.snapshot().powerActive,false,'the blocker stops once no thread works');f.service.dispose();
});
test('a stored Task complete badge level notifies as a banner',()=>{
 const f=fixture({keepAwake:false,completeNotifications:'badge'});f.service.observe(started('a'));f.service.observe(completed('a'));assert.ok(f.calls.includes('notice-show'));f.service.dispose();
});
test('renderer level options and Draw attention gating follow the original',async()=>{
 const {NOTIFICATION_LEVEL_ITEMS,notificationLevel,drawAttentionDisabled,keepAwakeEnabled}=await import('../src/settings-shell-model.mjs');
 assert.deepEqual(NOTIFICATION_LEVEL_ITEMS.completeNotifications.map(item=>[item.value,item.label]),[['off','Off'],['banner','Banners']]);
 for(const key of ['permissionNotifications','questionNotifications'])assert.deepEqual(NOTIFICATION_LEVEL_ITEMS[key].map(item=>[item.value,item.label]),[['off','Off'],['badge','Badge only'],['banner','Banners']]);
 assert.equal(Object.values(NOTIFICATION_LEVEL_ITEMS).flat().some(item=>'disabled' in item),false,'Banners is never a disabled option');
 // The main process and the renderer agree on the levels each type accepts.
 for(const [key,items] of Object.entries(NOTIFICATION_LEVEL_ITEMS))assert.deepEqual(items.map(item=>item.value),desktop.NOTIFICATION_LEVELS[key]);
 assert.equal(notificationLevel(undefined),'banner');assert.equal(notificationLevel('off'),'off');
 assert.equal(drawAttentionDisabled({permissionNotifications:'off',questionNotifications:'off'}),true);
 assert.equal(drawAttentionDisabled({permissionNotifications:'off',questionNotifications:'badge'}),false);
 assert.equal(drawAttentionDisabled({permissionNotifications:'banner',questionNotifications:'off'}),false);
 assert.equal(drawAttentionDisabled({}),false,'unset levels are Banners, not Off');
 assert.equal(keepAwakeEnabled(undefined),true);assert.equal(keepAwakeEnabled(false),false);assert.equal(keepAwakeEnabled(true),true);
});
test('main seeds the renderer config with the defaults and maps a saved Task complete badge',async()=>{
 const fs=await import('node:fs'),path=await import('node:path');
 const main=fs.readFileSync(path.resolve(import.meta.dirname,'../electron/main.cjs'),'utf8');
 const block=main.slice(main.indexOf('menuBarEnabled: true,'),main.indexOf('...config,',main.indexOf('menuBarEnabled: true,')));
 for(const line of ['permissionNotifications: "banner"','questionNotifications: "banner"','completeNotifications: "banner"','keepAwake: true','keepAwakeOnBattery: true'])assert.ok(block.includes(line),line);
 assert.match(main,/if \(config\.completeNotifications === "badge"\) config\.completeNotifications = "banner";/);
});
// Losing the core names that core (Audit: "Couldn’t load settings from the DeepSeek core" read "GLM core" on ZCode):
// boot.core / a core id when the page passes one, else the core this window runs (windowCore), translated.
test('the lost-core notice names the running core, never a fixed DeepSeek',async()=>{
 const {setAssistantName,setLocale}=await import('../electron/i18n/index.mjs');const {windowCore}=await import('../src/settings-model.mjs');
 const message=(errors,options)=>desktopErrors(errors,options)[0]?.message;
 try{
  for(const [engine,name] of [['zcode','ZCode'],[{engine:'zcode',capabilities:{}},'ZCode'],['codex','Codex'],[{engine:'deepseek-harness'},'DeepSeek Harness'],['kimi','Kimi Code']])
   assert.equal(message({connection:'x'},{engine}),`Couldn’t load settings from ${name}. Reconnect and try again.`,JSON.stringify(engine));
  for(const [assistant,name] of [['DeepSeek','DeepSeek Harness'],['GLM','ZCode'],['Codex','Codex']]){setAssistantName(assistant);assert.equal(windowCore()?.name,name);assert.equal(message({connection:'x'}),`Couldn’t load settings from ${name}. Reconnect and try again.`);}
  setAssistantName('Acme');assert.equal(windowCore(),null);assert.equal(message({connection:'x'}),'Couldn’t load settings from the agent core. Reconnect and try again.');
  assert.deepEqual(desktopErrors({policy:'x'},{engine:'zcode'}),[]);
  setLocale('zh-CN');assert.equal(message({connection:'x'},{engine:'zcode'}),'无法从 ZCode 加载设置。请重新连接后重试。');
 }finally{setLocale('en-US');setAssistantName('DeepSeek');}
});
test('a session kept awake from its row menu holds the Mac awake while it runs, with the app-wide switch off',()=>{const f=fixture({keepAwake:false,sessionMetadata:{t:{keepAwake:true}}});f.service.observe(started('a'));assert.equal(f.service.snapshot().powerActive,true);f.service.observe(completed('a'));assert.equal(f.service.snapshot().powerActive,false);f.config.sessionMetadata.t.keepAwake=false;f.service.observe(started('b'));assert.equal(f.service.snapshot().powerActive,false);f.service.dispose();});

// B35 (NotificationService showIdleNotification / isUserViewingSession / TV): the banner is titled with the session,
// and only a focused window showing that session suppresses it.
test('completion banners carry the session title and are skipped only while the session is in view',()=>{
 assert.equal(desktop.notificationTitle({name:'  Fix\n\tthe   bug '}),'Fix the bug');
 assert.equal(desktop.notificationTitle({name:'',preview:'Write tests'}),'Write tests');
 assert.equal(desktop.notificationTitle({}),'OpenClaude Desktop');
 assert.equal(desktop.notificationTitle({name:'x'.repeat(120)}),'x'.repeat(100)+'…');
 const run=(viewing,focused)=>{const calls=[];class Notice extends EventEmitter{static isSupported(){return true;}constructor(options){super();calls.push(['notice',options]);}show(){calls.push('notice-show');}close(){}}
  const service=createDesktopSettings({app:{dock:{setBadge:v=>calls.push(['badge',v]),bounce(){}}},powerMonitor:Object.assign(new EventEmitter(),{isOnBatteryPower:()=>false}),powerSaveBlocker:{start:()=>1,stop(){}},Notification:Notice,
   getConfig:()=>({threadIds:['t'],archivedThreadIds:[],keepAwake:false,completeNotifications:'banner',notificationSound:'none',threadMetadata:{t:{name:'Refactor parser',cwd:'/Users/me/parser-lib'}}}),getClient:()=>({request:async()=>({})}),
   sessionOperations:{},save(){},emit(){},getWindow:()=>Object.assign(new EventEmitter(),{isFocused:()=>focused}),isViewingSession:id=>viewing===id,isAppFocused:()=>focused});
  service.observe(started('a'));service.observe(completed('a'));service.observe({kind:'request',method:'item/commandExecution/requestApproval',params:{threadId:'t'}});service.dispose();return calls;};
 const background=run(null,true);assert.equal(background.find(v=>v[0]==='notice')[1].title,'Refactor parser');
 // showPermissionNotification: the project as the title, the session title as the subtitle.
 assert.deepEqual(background.filter(v=>v[0]==='notice').map(v=>[v[1].title,v[1].subtitle]),[['Refactor parser',undefined],['parser-lib','Refactor parser']]);assert.equal(background.some(v=>v[0]==='badge'&&v[1]==='•'),false,'no badge while the app is in front');
 assert.equal(run('t',true).some(v=>v==='notice-show'),false,'the focused window shows the session');
 const away=run(null,false);assert.ok(away.includes('notice-show'));assert.deepEqual(away.find(v=>v[0]==='badge'),['badge','•']);
});
