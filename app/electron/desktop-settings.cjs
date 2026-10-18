const fs=require('node:fs/promises'),path=require('node:path');
const {t,getAssistantName}=require('./i18n/index.mjs');
const {createKeepAwakeNotice}=require('./keep-awake-notice.cjs');
// Fidelity F14: the original's first-run defaults. index.chunk-ChZ67Jhw.js preferences start with
// notificationLevels {} and rH reads an unset level as banner (c71860c77-yvGrrWO9.js:2270 `A?.[e] ?? "banner"`);
// ccKeepAwakeWhileWorking / ccKeepAwakeOnBattery default to true (tV: `Db(...) !== !1`). This reverses the
// earlier "off until enabled" local policy (analysis/settings-complete-20260921/source-contract.md:10).
const defaults={permissionNotifications:'banner',questionNotifications:'banner',completeNotifications:'banner',notificationSound:'system',drawAttention:false,keepAwake:true,keepAwakeOnBattery:true,menuBarEnabled:true,archiveInactiveDays:0,worktreeLocation:'project'};
// c71860c77:2004-2029 D: permission and question offer Off/Badge only/Banners; Task complete (idle) only Off/Banners.
const NOTIFICATION_LEVELS={permissionNotifications:['off','badge','banner'],questionNotifications:['off','badge','banner'],completeNotifications:['off','banner']};
// A Task complete level saved as 'badge' by an older build reads as Banners, the nearest level the original offers.
function desktopPreferences(config){const result={...defaults,...config};if(result.completeNotifications==='badge')result.completeNotifications='banner';return result;}
function desktopPatch(patch){const result={};for(const [key,levels] of Object.entries(NOTIFICATION_LEVELS))if(key in patch){if(!levels.includes(patch[key]))throw Error('Invalid notification level.');result[key]=patch[key];}
 for(const key of ['drawAttention','keepAwake','keepAwakeOnBattery','menuBarEnabled'])if(key in patch){if(typeof patch[key]!=='boolean')throw Error('Invalid desktop setting.');result[key]=patch[key];}
 if('notificationSound' in patch){if(!['system','none'].includes(patch.notificationSound))throw Error('Invalid notification sound.');result.notificationSound=patch.notificationSound;}
 if('archiveInactiveDays' in patch){if(![0,1,2,7,14,30].includes(patch.archiveInactiveDays))throw Error('Invalid archive interval.');result.archiveInactiveDays=patch.archiveInactiveDays;}
 if('worktreeLocation' in patch){if(!['project','custom'].includes(patch.worktreeLocation))throw Error('Invalid worktree location.');result.worktreeLocation=patch.worktreeLocation;}
 return result;
}
// NotificationService (2.31226.0 index.chunk-CiiI592G.js showIdleNotification / TV): a banner is titled with the
// session's title (its name, else its first prompt) — controls and whitespace runs folded to one space, at most 100
// characters then '…' — so several sessions' banners say which one finished; the app name stands in for an untitled one.
const NOTIFICATION_TITLE_MAX=100;
function notificationTitle(metadata,fallback='OpenClaude Desktop'){
 const raw=[metadata?.name,metadata?.preview].find(value=>typeof value==='string'&&value.trim());
 if(!raw)return fallback;
 const text=raw.replace(/[\s\p{Cc}]+/gu,' ').replace(/\p{Cs}/gu,'').trim(),chars=Array.from(text);
 return !chars.length?fallback:chars.length>NOTIFICATION_TITLE_MAX?`${chars.slice(0,NOTIFICATION_TITLE_MAX).join('')}\u2026`:text;
}
async function directoryUsage(root){let bytes=0,files=0,incomplete=false;const todo=[root];while(todo.length){const dir=todo.pop();let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch{incomplete=true;continue;}for(const entry of entries){if(++files>100000)return {path:root,bytes,incomplete:true};const target=path.join(dir,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory())todo.push(target);else if(entry.isFile())try{bytes+=(await fs.stat(target)).size;}catch{incomplete=true;}}}return {path:root,bytes,incomplete};}
// isViewingSession(id): a focused, visible window shows the session (main.cjs: windowRegistry.windowsShowing), when
// its banner is skipped as the reference's isUserViewingSession does; isAppFocused: any app window has the focus (no
// Dock badge then). Without them the first window's focus stands in for both.
// R4i-small SM1 (cov0-05): systemIdleMs (ms without keyboard or mouse input) defaults to powerMonitor.getSystemIdleTime;
// keepAwakeClock / keepAwakeTimers / keepAwakeLog are injected by tests (keep-awake-notice.cjs).
function createDesktopSettings({app,powerSaveBlocker,powerMonitor,Notification,getConfig,getClient,sessionOperations,save,emit,getWindow,gitStatus,isViewingSession,isAppFocused,systemIdleMs,keepAwakeClock,keepAwakeTimers,keepAwakeLog}){
 const active=new Map(),workflowThreads=new Map(),notices=new Map();let eventRevision=0;let blocker=null,timer=null,disposed=false,archiving=false;
 const prefs=()=>desktopPreferences(getConfig());
 // cov0-05: index.chunk-CFJssAFf.js noteKeptAwake(e,t): only a session that still exists, is not archived, has no error
 // and is not running gets keptAwake={heldMs,endedAt:Date.now()} (here: a desktop-kept-awake event for the windows).
 // A new turn drops it (LG/Un clear e.keptAwake); turnFailed: the session's last turn failed (n.error).
 const keptAwakeSessions=new Map(),turnFailed=new Set();
 function noteKeptAwake(id,heldMs){const c=getConfig();if(disposed||!Array.isArray(c?.threadIds)||!c.threadIds.includes(id)||active.has(id)||turnFailed.has(id))return false;const keptAwake={heldMs,endedAt:Date.now()};keptAwakeSessions.set(id,keptAwake);emit({kind:'desktop-kept-awake',threadId:id,keptAwake});return true;}
 function clearKeptAwake(id){if(keptAwakeSessions.delete(id))emit({kind:'desktop-kept-awake',threadId:id,keptAwake:null});}
 const keepAwake=createKeepAwakeNotice({onNotice:noteKeptAwake,
  systemIdleMs:typeof systemIdleMs==='function'?systemIdleMs:()=>typeof powerMonitor.getSystemIdleTime==='function'?powerMonitor.getSystemIdleTime()*1000:undefined,
  ...(keepAwakeClock?{now:keepAwakeClock}:{}),...(keepAwakeTimers?{setInterval:keepAwakeTimers.setInterval,clearInterval:keepAwakeTimers.clearInterval}:{}),...(keepAwakeLog?{log:keepAwakeLog}:{})});
 const keepAwakeSuspended=()=>keepAwake.suspended();
 // A session the user keeps awake (its row menu's 'Keep computer awake', sessionMetadata keepAwake) holds the Mac awake while it runs, whatever the app-wide switch.
 function power(){if(disposed)return;const p=prefs(),metadata=getConfig()?.sessionMetadata||{},sessionAwake=[...active.keys()].some(id=>metadata[id]?.keepAwake===true),needed=(p.keepAwake&&(active.size>0||workflowThreads.size>0)||sessionAwake)&&(p.keepAwakeOnBattery||!powerMonitor.isOnBatteryPower());if(needed&&blocker===null)blocker=powerSaveBlocker.start('prevent-app-suspension');else if(!needed&&blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;}
  // cov0-05: the working hold (official Fvr "code_turn": ccKeepAwakeWhileWorking and the battery rule) is what the
  // stayed-awake notice measures; a session's own 'Keep computer awake' hold is the other hold (wvr()) that suppresses it.
  const working=p.keepAwake&&(active.size>0||workflowThreads.size>0),batteryOk=()=>p.keepAwakeOnBattery||!powerMonitor.isOnBatteryPower();
  if(working&&batteryOk())keepAwake.held();else if(keepAwake.isHeld())keepAwake.released(!p.keepAwake?'setting_off':!batteryOk()?'battery':'idle',{otherHold:needed});}
 function clearNotices(){for(const n of notices.values())n.close();notices.clear();app.dock?.setBadge('');}
 // {who}: the persona name, else the running core's assistant (i18n getAssistantName, set by main from the chosen
 // core). An interpolated value is never rewritten by t(), so the fallback must already be the core's name.
 const viewing=id=>typeof isViewingSession==='function'?isViewingSession(id)===true:!!getWindow()?.isFocused();
 const appFocused=()=>typeof isAppFocused==='function'?isAppFocused()===true:!!getWindow()?.isFocused();
 const titleFor=id=>notificationTitle(getConfig()?.threadMetadata?.[id]);
 // showPermissionNotification titles a Code permission banner with the project (git repo, else folder name) and puts
 // the session title in the subtitle (macOS); idle and question banners carry the session title.
 const permissionTitle=id=>{const cwd=getConfig()?.threadMetadata?.[id]?.cwd;return notificationTitle({name:typeof cwd==='string'&&cwd?path.basename(cwd):''});};
 const permissionSubtitle=id=>{const title=notificationTitle(getConfig()?.threadMetadata?.[id],'');return title?{subtitle:title}:{};};
 function notify(type,id){const p=prefs(),level=p[type+'Notifications'];if(!getConfig().threadIds.includes(id)||level==='off'||viewing(id))return;if(!appFocused()){app.dock?.setBadge('•');if(p.drawAttention)app.dock?.bounce('informational');}if(level!=='banner'||!Notification.isSupported())return;
 const n=new Notification({...(type==='permission'?{title:permissionTitle(id),...permissionSubtitle(id)}:{title:titleFor(id)}),body:((who)=>t(type==='complete'?'{who} finished and is waiting for your input.':type==='question'?'{who} is asking you to choose between options.':'{who} needs your approval to use a tool.',{who}))((n=>typeof n==='string'&&n.length<=40&&!/[\x00-\x1f<>]/.test(n)?n:'')(getConfig().persona?.assistantName?.trim())||getAssistantName()),silent:p.notificationSound==='none'});const key=Symbol();notices.set(key,n);n.on('close',()=>notices.delete(key));n.on('click',()=>{getWindow()?.show();getWindow()?.focus();if(id)emit({kind:'desktop-navigate',threadId:id});});n.show();}
 // A dynamic workflow the model started finished (workflow-tool-service.cjs): the Task complete level decides, as for turns.
 function notifyWorkflow(run){const p=prefs(),level=p.completeNotifications,id=run?.threadId;if(!id||!getConfig().threadIds.includes(id)||level==='off'||viewing(id)||!Notification.isSupported())return;
  const name=String(run.title||run.name||run.description||'').slice(0,80);const body=run.status==='completed'?t('Dynamic workflow “{name}” completed',{name}):run.status==='stopped'?t('Dynamic workflow “{name}” was stopped',{name}):t('Dynamic workflow “{name}” failed',{name});
  const n=new Notification({title:titleFor(id),body,silent:p.notificationSound==='none'});const key=Symbol();notices.set(key,n);n.on('close',()=>notices.delete(key));n.on('click',()=>{getWindow()?.show();getWindow()?.focus();emit({kind:'desktop-navigate',threadId:id});});n.show();}
 // The agent's own notification (PushNotification, agent-tools/notify.mjs): the Task complete level and the sound decide,
 // as for a finished turn; nothing while the app is in front (the user is looking). Clicking it opens the session.
 // Returns what happened: 'sent', or why not ('focused', 'off', 'unsupported', 'unknown').
 function notifyAgent(id,{title,message}={}){const p=prefs(),level=p.completeNotifications;if(typeof id!=='string'||!getConfig().threadIds.includes(id))return 'unknown';if(level==='off')return 'off';if(getWindow()?.isFocused())return 'focused';
  app.dock?.setBadge('•');if(p.drawAttention)app.dock?.bounce('informational');if(!Notification.isSupported())return 'unsupported';
  const clean=(value,max)=>String(value??'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'').trim().slice(0,max);
  const n=new Notification({title:clean(title,80)||'OpenClaude Desktop',body:clean(message,200),silent:p.notificationSound==='none'});const key=Symbol();notices.set(key,n);n.on('close',()=>notices.delete(key));n.on('click',()=>{getWindow()?.show();getWindow()?.focus();emit({kind:'desktop-navigate',threadId:id});});n.show();return 'sent';}
 function observe(e){eventRevision++;if(e.kind==='workflow'){if(e.run.status==='running')workflowThreads.set(e.run.id,e.run.threadId);else workflowThreads.delete(e.run.id);power();return;}const p=e.params||{};if(e.method==='turn/started'){active.set(p.threadId,p.turn?.id);turnFailed.delete(p.threadId);keepAwake.turnStarted(p.threadId);clearKeptAwake(p.threadId);}if(e.method==='turn/completed'&&active.has(p.threadId)&&(active.get(p.threadId)===p.turn?.id||sessionOperations.isActive?.(p.threadId)===false)){active.delete(p.threadId);if(p.turn?.status==='failed')turnFailed.add(p.threadId);else turnFailed.delete(p.threadId);keepAwake.turnEnded(p.threadId,'completed');if(p.turn.status==='completed')notify('complete',p.threadId);}
 if(e.kind==='request')notify(e.method==='item/tool/requestUserInput'?'question':'permission',p.threadId);
 if((e.kind==='connection'&&!e.connected)||e.kind==='approval-invalidated'){for(const id of active.keys())keepAwake.turnEnded(id,'ended');active.clear();}power();}
 async function sweep(){if(archiving||disposed||!prefs().archiveInactiveDays)return;archiving=true;const owner=getClient();try{for(const id of [...getConfig().threadIds]){if(disposed||getClient()!==owner)return;if(active.has(id)||[...workflowThreads.values()].includes(id))continue;try{sessionOperations.assertAvailable(id);const revision=eventRevision;const {thread}=await owner.request('thread/read',{threadId:id,includeTurns:false});const restoredAt=getConfig().restoredAt?.[id],lastActivity=Math.max(thread?.updatedAt*1000,Number.isFinite(restoredAt)?restoredAt:0);if(!thread||!['idle','notLoaded'].includes(thread.status?.type)||!Number.isFinite(thread.updatedAt)||Date.now()-lastActivity<prefs().archiveInactiveDays*86400000)continue;
 // Unknown terminal state fails closed. Never archive a session with live background work.
 // modelProviders: [] counts Codex children recorded under any provider (OpenAI or a custom endpoint); bridges ignore it.
 // notLoaded: not loaded by this core, so nothing of it runs here; the checks below still apply.
 const background=await owner.request('thread/backgroundTerminals/list',{threadId:id});if(!Array.isArray(background.data)||background.data.length||background.nextCursor)continue;
 const children=await owner.request('thread/list',{sourceKinds:['subAgent'],limit:100,modelProviders:[]});if(!Array.isArray(children.data)||children.nextCursor)continue;if(children.data.some(child=>(child.parentThreadId===id||child.source?.subAgent?.thread_spawn?.parent_thread_id===id)&&child.status?.type!=='idle'))continue;
 if(thread.cwd&&(getConfig().worktreeBases?.[thread.cwd]||(getConfig().worktreeDirectories||[]).includes(thread.cwd))){const status=await gitStatus(thread.cwd);if(!status.isRepo||(status.workingTreeDirty??status.hasChanges))continue;}/* F12: hasChanges now spans the branch's commits; the sweep keeps its dirty-tree gate. */
 if(disposed||owner!==getClient())return;if(revision!==eventRevision||!prefs().archiveInactiveDays)continue;const release=sessionOperations.reserveMessage(id);try{await owner.request('thread/archive',{threadId:id});const c=getConfig();c.threadIds=c.threadIds.filter(x=>x!==id);c.archivedThreadIds=[...new Set([...c.archivedThreadIds,id])];save();keepAwake.turnEnded(id,'gone');keptAwakeSessions.delete(id);emit({kind:'desktop-archived',threadId:id});}finally{release();}
 }catch{/* A failed state query is not permission to archive. */}}}finally{archiving=false;}}
 function start(){powerMonitor.on('on-ac',power);powerMonitor.on('on-battery',power);powerMonitor.on('suspend',keepAwakeSuspended);getWindow()?.on('focus',clearNotices);timer=setInterval(sweep,60000);timer.unref();}
 function dispose(){disposed=true;clearInterval(timer);keepAwake.dispose();powerMonitor.removeListener('on-ac',power);powerMonitor.removeListener('on-battery',power);powerMonitor.removeListener('suspend',keepAwakeSuspended);getWindow()?.removeListener('focus',clearNotices);clearNotices();if(blocker!==null)powerSaveBlocker.stop(blocker);blocker=null;}
 // clearNotices: main.cjs also calls it when any other main window takes the focus (start() binds only the first).
 return {observe,notifyWorkflow,notifyAgent,power,start,dispose,sweep,clearNotices,noteKeptAwake,keptAwake:id=>keptAwakeSessions.get(id)??null,snapshot:()=>({notifications:Notification.isSupported(),runOnStartup:app.getLoginItemSettings().openAtLogin,powerActive:blocker!==null}),setStartup(value){if(typeof value!=='boolean')throw Error('Invalid startup setting.');app.setLoginItemSettings({openAtLogin:value});return app.getLoginItemSettings().openAtLogin;}};
}
module.exports={defaults,NOTIFICATION_LEVELS,notificationTitle,desktopPreferences,desktopPatch,directoryUsage,createDesktopSettings};
