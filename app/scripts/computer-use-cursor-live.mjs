// Phantom cursor live, in the real app (CU_LIVE=1): the native NSPanels (native/computer-use PhantomCursor.swift) need
// the app's Cocoa main run loop, so everything runs inside the Electron main process of the real app.
//   A. Native, through computer_use.node in the app process: a floating cursor (no window), one stacked above a real
//      window (the app's own main window), the pulse, negative coordinates, a second display when there is one, a target
//      that is not on screen (minimized), hide one / all. Checked from the panel's own state (level, collection
//      behaviour 0x150, non-activating, click-through, never key, z-order right above its target, the tip on the point,
//      on the active Space — a full-screen one included), from the window under the tip (pointOwner), and — when a
//      display is awake — from a screenshot of the region around the tip (clay pixels under the arrow).
//   B. The app's wiring (main.cjs → service.cjs → cursor.cjs), through the tools the fixture core calls like a model:
//      request_access Finder (the user clicks Allow) → app_screenshot of a temp folder's Finder window (the lock: the
//      cursor at the window's centre) → app_click on an empty spot of it (the cursor at the click point, pulsed) →
//      app_release (the cursor goes). Skipped (recorded as blocked) while the screen is locked: no window capture then.
// Nothing is clicked or typed on the user's own windows: only the fixture's window and the temp folder's.
// Run from app/: CU_LIVE=1 node scripts/computer-use-cursor-live.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
import {buildFixture,launchFixture,FIXTURE,presenceSkip} from '../tests/computer-use-live-helpers.mjs';
// The presence gate (tests/computer-use-live-helpers.mjs): CU_LIVE=1, an unlocked screen and nobody at this Mac for 120 s
// (CU_LIVE_FORCE=1 runs it anyway); otherwise skipped with the reason.
{const skipped=await presenceSkip();if(skipped){console.log(JSON.stringify({skipped}));process.exit(0);}}
const require=createRequire(import.meta.url);
const root=path.resolve(import.meta.dirname,'..');
const native=require('../electron/computer-use/native.cjs').createNative();
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'computer-use-cursor-live-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true}));
const env={...process.env,CODE_DESKTOP_OFFSCREEN_LAUNCH:'1',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const report={directory,before:null,after:null,checks:[],blocked:[],states:{},rendererErrors:[],passed:false};
const facts=async()=>{const probe=await native.call('probe').catch(e=>({error:e.message}));const front=await native.call('frontmostApp').catch(()=>null);const cursor=await native.call('cursorPosition').catch(()=>null);
  const space=await native.call('spaceState',{}).catch(()=>null);
  return {screenLocked:probe.screenLocked,secureInput:probe.secureInput,idle:probe.secondsSinceUserInput,ownInput:probe.secondsSinceOwnInput,front:front?.bundleId??null,cursor,activeSpaceType:space?.activeSpaceType??null};};
report.before=await facts();
const displays=(await native.call('listDisplays').catch(()=>null))?.displays??[];
report.before.displays=displays.map(d=>({id:d.displayId,bounds:d.bounds,main:d.isMain}));
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});
// Native calls made inside the app's main process (where the main run loop is).
const inApp=(method,params={})=>app.evaluate(async({app},[method,params])=>{
  const {createRequire}=process.mainModule.require('node:module');
  const n=globalThis.__cuLiveNative??=createRequire(app.getAppPath()+'/package.json')('./electron/computer-use/native.cjs').createNative();
  try{return {ok:true,result:await n.call(method,params)};}catch(error){return {ok:false,code:error.code,message:error.message};}
},[method,params]);
const must=async(method,params)=>{const r=await inApp(method,params);if(!r.ok)throw new Error(`${method}: ${r.code} ${r.message}`);return r.result;};
// After a move (animated 0.18 s while visible) the panel's frame is read once it settled.
const settled=async(windowId)=>{await sleep(350);return (await must('phantomCursorState')).cursors.find(c=>c.windowId===(windowId??0));};
const cursorOf=async(windowId)=>(await must('phantomCursorState')).cursors.find(c=>c.windowId===windowId);
// The window under a point below the lock screen's shield (layers ≥ 1000 skipped: the login window / Window Server
// shields cover everything while the screen is locked).
const ownerAt=async(point)=>{const skipped=[];for(let i=0;i<8;i+=1){const owner=(await native.call('pointOwner',{point,ignoreWindowIds:skipped}).catch(()=>({owner:null}))).owner;
  if(!owner||owner.layer<1000)return {owner,skipped};skipped.push(owner.windowId);}return {owner:null,skipped};};
const near=(a,b,eps=0.6)=>Math.abs(a.x-b.x)<=eps&&Math.abs(a.y-b.y)<=eps;
let fixture=null,built=null,folder=null;
// The region around a tip, from a screenshot of the display it is on (only this app's and the fixture's windows):
// clay under the arrow (4 pt right of and 9 pt below the tip). null when no display is awake.
const clayAt=async(tip,ownBundle)=>{
  const display=displays.find(d=>tip.x>=d.bounds.x&&tip.x<d.bounds.x+d.bounds.width&&tip.y>=d.bounds.y&&tip.y<d.bounds.y+d.bounds.height);
  if(!display)return null;
  const local={x:tip.x-display.bounds.x,y:tip.y-display.bounds.y};
  const shot=await inApp('captureScreen',{displayId:display.displayId,allowedBundleIds:[ownBundle,FIXTURE],scale:1,region:{x:Math.max(0,local.x-30),y:Math.max(0,local.y-30),width:60,height:60}});
  if(!shot.ok)return {error:shot.code};
  const file=path.join(directory,`tip-${Math.round(tip.x)}-${Math.round(tip.y)}.jpg`);
  await fs.writeFile(file,Buffer.from(shot.result.dataUrl.split(',')[1],'base64'));
  const pixel=await app.evaluate(({nativeImage},[dataUrl,dx,dy])=>{const image=nativeImage.createFromDataURL(dataUrl);const {width,height}=image.getSize();const bitmap=image.toBitmap();
    const px=Math.round(dx*width),py=Math.round(dy*height),i=(py*width+px)*4;return {b:bitmap[i],g:bitmap[i+1],r:bitmap[i+2],width,height};},
    [shot.result.dataUrl,(Math.min(30,local.x)+4)/60,(Math.min(30,local.y)+9)/60]);
  return {file,pixel,clay:pixel.r>170&&pixel.g>80&&pixel.g<160&&pixel.b>50&&pixel.b<130};
};
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.rendererErrors.push(e.message));
 await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 const main=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()&&w.isVisible());return {id:Number(/^window:(\d+):/.exec(w.getMediaSourceId())?.[1]),bounds:w.getBounds()};});
 report.states.main=main;
 // ── A. Native ───────────────────────────────────────────────────────────────────────────────────────────────────
 const primary=displays.find(d=>d.isMain)?.bounds??{x:0,y:0,width:1470,height:956};
 const tip1={x:primary.x+primary.width/2,y:primary.y+primary.height/2};
 const floating=await must('setPhantomCursor',{screenX:tip1.x,screenY:tip1.y,pulse:false});
 report.states.floating=floating;
 assert.equal(floating.placement,'floating');
 assert.equal(floating.level,3,'no window: the floating level');
 assert.equal(floating.collectionBehavior,0x150);
 assert.equal(floating.styleMask&0x80,0x80,'non-activating');
 assert.equal(floating.ignoresMouseEvents,true);assert.equal(floating.isOpaque,false);assert.equal(floating.hasShadow,false);
 assert.equal(floating.isKeyWindow,false);
 const under=await ownerAt(tip1),ownBundle=under.owner;
 report.states.floatingOwner=under;
 if(floating.visible){
   assert.ok(near(floating.frameTip,tip1),'the tip is the panel centre, on the point');
   assert.equal(ownBundle?.windowId,floating.windowNumber,'the floating cursor is the window under its tip');
   report.checks.push(`A1 floating cursor (no window): level 3, collectionBehavior 0x150, non-activating, click-through, not key, the tip on (${tip1.x}, ${tip1.y}), the top window there${under.skipped.length?` below the lock-screen shield (${under.skipped.join(', ')})`:''}; on the active Space: ${floating.onActiveSpace} (active Space type ${report.before.activeSpaceType}${report.before.activeSpaceType===4?', a full-screen app':''})`);
 }else{
   report.blocked.push(`A1: the floating panel is not visible (${JSON.stringify({screens:(await must('phantomCursorState')).screens})}) — no display to order it onto`);
 }
 // Above a real window: the fixture app's window (a background app, its window on every Space — the active one too,
 // a full-screen app's Space included).
 built=buildFixture();
 fixture=await launchFixture(built,{background:true});
 report.states.fixture={windowId:fixture.windowId,bounds:fixture.bounds};
 const tip2={x:fixture.bounds.x+fixture.bounds.width/2,y:fixture.bounds.y+fixture.bounds.height/2};
 const placed=await must('setPhantomCursor',{screenX:tip2.x,screenY:tip2.y,windowId:fixture.windowId,pulse:true});
 const above=await settled(fixture.windowId);
 report.states.aboveFixture={placed:placed.placement,...above};
 assert.equal(above.collectionBehavior,0x150);
 if(above.targetOnScreen){
   assert.equal(placed.placement,'above_target');assert.equal(above.visible,true);
   assert.equal(above.level,above.targetLayer,'the target window\'s layer');
   assert.equal(above.zIndex,above.targetZIndex-1,'ordered directly above its target');
   assert.ok(near(above.frameTip,tip2));
   const fixtureFront=await native.call('frontmostApp').catch(()=>null);
   report.checks.push(`A2 cursor on a real window (fixture ${fixture.windowId}): its layer ${above.level}, z ${above.zIndex} directly above the target's ${above.targetZIndex}, pulse sent, the tip on its centre, on the active Space: ${above.onActiveSpace} (type ${report.before.activeSpaceType}${report.before.activeSpaceType===4?', a full-screen app\'s Space: fullScreenAuxiliary':''}); front app still ${fixtureFront?.bundleId}`);
 }else{
   assert.equal(placed.placement,'away');assert.equal(above.visible,false);
   report.blocked.push('A2: the fixture window is not on screen: the cursor was put away, as specified, but stacking above an on-screen window was not observed');
 }
 // Negative coordinates (left of / above the primary display): the frame, whatever display is there.
 const tip3={x:-300.5,y:-200.25};
 await must('setPhantomCursor',{screenX:tip3.x,screenY:tip3.y,pulse:false});
 const negative=await settled();
 report.states.negative=negative;
 assert.ok(near(negative.tip,tip3)&&near(negative.frameTip,tip3),'the panel frame maps back to the negative point');
 report.checks.push('A3 negative coordinates: the panel frame converts back to (-300.5, -200.25) exactly');
 // A second display.
 const second=displays.find(d=>!d.isMain);
 if(second){
   const tip4={x:second.bounds.x+second.bounds.width/3,y:second.bounds.y+second.bounds.height/3};
   await must('setPhantomCursor',{screenX:tip4.x,screenY:tip4.y,pulse:true});
   const there=await settled();
   report.states.secondDisplay=there;
   assert.ok(near(there.frameTip,tip4));
   const shot=await clayAt(tip4,ownBundle?.bundleId);report.states.secondShot=shot;
   if(shot?.clay)report.checks.push(`A4 second display ${second.displayId}: the tip at (${tip4.x}, ${tip4.y}), clay pixels under the arrow in a screenshot (${shot.file})`);
   else report.blocked.push(`A4 second display: screenshot check failed ${JSON.stringify(shot)}`);
 }else report.blocked.push(`A4: no second display (${displays.length} awake)`);
 // Screenshot of the floating one on the primary.
 if(floating.visible){
   await must('setPhantomCursor',{screenX:tip1.x,screenY:tip1.y,pulse:false});await sleep(400);
   const shot=await clayAt(tip1,ownBundle?.bundleId);report.states.primaryShot=shot;
   if(shot?.clay)report.checks.push(`A5 primary display screenshot: clay pixels under the arrow at the tip (${shot.file})`);
   else report.blocked.push(`A5 primary display screenshot: ${JSON.stringify(shot)}`);
 }else report.blocked.push(`A5 screenshot: no display awake (listDisplays: ${displays.length})`);
 // A target that is not on screen: the app's own main window when it is not on the active Space (a full-screen app's
 // Space), else minimized → away.
 const mainInfo=await must('setPhantomCursor',{screenX:main.bounds.x+40,screenY:main.bounds.y+40,windowId:main.id,pulse:false});
 let minimizedIt=false;
 if(mainInfo.targetOnScreen){
   await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows().find(w=>w.isVisible())?.minimize();});minimizedIt=true;
   await sleep(900);
 }
 const away=await must('setPhantomCursor',{screenX:main.bounds.x+40,screenY:main.bounds.y+40,windowId:main.id,pulse:false});
 report.states.away={minimizedIt,...away};
 assert.equal(away.placement,'away');assert.equal(away.visible,false);
 report.checks.push(`A6 a target not on screen (${minimizedIt?'minimized':'the app\'s main window, on another Space than the active full-screen one'}): the cursor is put away (orderOut), not left floating`);
 if(minimizedIt){await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())if(w.isMinimized())w.restore();});await sleep(900);}
 // Hide one, then all.
 const hidden=await must('hidePhantomCursor',{windowId:fixture.windowId});
 assert.deepEqual(hidden.hidden,[fixture.windowId]);
 assert.equal((await cursorOf(fixture.windowId)).visible,false);
 await must('hidePhantomCursor',{});
 assert.ok((await must('phantomCursorState')).cursors.every(c=>!c.visible&&!c.wanted));
 report.checks.push('A7 hidePhantomCursor(windowId) hides that one; hidePhantomCursor() hides all');
 // cursor.cjs over the real native module in this process: native mode (not the web fallback), the hide awaited
 // before an action, restore and release.
 const viaJs=await app.evaluate(async({app,BrowserWindow},[windowId,x,y])=>{
   const {createRequire}=process.mainModule.require('node:module');const req=createRequire(app.getAppPath()+'/package.json');
   const native=req('./electron/computer-use/native.cjs').createNative();
   const cursor=req('./electron/computer-use/cursor.cjs').createCursor({BrowserWindow,app,native,log:{info(){},warn(){}}});
   const state=async()=>(await native.call('phantomCursorState')).cursors.find(c=>c.windowId===windowId);
   await cursor.pointAt({x,y,windowId,pulse:false});const shown=await state();const numbers=cursor.windowNumbers();
   await cursor.beforeClick({windowId});const aside=await state();
   await cursor.restore({windowId});const restored=await state();
   await cursor.beforeClick({scope:'display'});const display=await state();
   await cursor.release({windowId});const released=await state();
   const webWindows=BrowserWindow.getAllWindows().filter(w=>cursor.owns(w)).length;
   return {mode:cursor.mode(),numbers,shown:shown.visible,aside:aside.visible,restored:restored.visible,display:display.visible,released:released.visible,wanted:released.wanted,webWindows,number:shown.windowNumber};
 },[fixture.windowId,tip2.x,tip2.y]);
 report.states.cursorJs=viaJs;
 assert.equal(viaJs.mode,'native');assert.equal(viaJs.webWindows,0);
 assert.deepEqual([viaJs.shown,viaJs.aside,viaJs.restored,viaJs.display,viaJs.released,viaJs.wanted],[true,false,true,true,false,false]);
 assert.deepEqual(viaJs.numbers,[viaJs.number]);
 report.checks.push('A9 cursor.cjs over the real module in the app process: native mode (no web window), windowNumbers() is the panel, beforeClick({windowId}) hides it before resolving, restore puts it back, display-scope leaves it, release hides it');
 const mid=await facts();
 report.states.afterNative={front:mid.front,cursor:mid.cursor};
 assert.equal(mid.front,report.before.front,'the cursor never activates the app');
 assert.ok(near(mid.cursor,report.before.cursor,0.01),'the real pointer never moved');
 report.checks.push('A8 the front app and the real pointer are unchanged by the native cursor');

 // ── B. The app's wiring through the tools ───────────────────────────────────────────────────────────────────────
 // A window of an installed app the session can be granted: Finder, on a temp folder opened in the background.
 const lockedNow=(await native.call('probe')).screenLocked===true;
 const awake=((await native.call('listDisplays').catch(()=>null))?.displays??[]).length>0;
 if(lockedNow||!awake){
   const capture=await native.call('captureWindow',{bundleId:FIXTURE,windowId:fixture.windowId}).then(()=>'ok',e=>`${e.code}: ${e.message}`);
   report.states.windowCaptureNow=capture;
   report.blocked.push(`B: the screen is locked${awake?'':' and no display is awake'}: a window capture fails (${capture}), so app_screenshot cannot take a lock and app_click is refused (screen_locked) — the wiring (lock → centre, click → pulse at the point, other actions → move, release → gone, hidden before each hit test) is covered by tests/computer-use-cursor.test.mjs with the real cursor.cjs over a recording native, not observed live`);
 }else{
   const FINDER='com.apple.finder';
   folder=await fs.mkdtemp(path.join(os.tmpdir(),'cu-cursor-live-'));
   for(let i=0;i<6;i+=1)await fs.writeFile(path.join(folder,`file-${i}.txt`),'');
   const {execFileSync}=await import('node:child_process');
   execFileSync('/usr/bin/open',['-g',folder]);
   const name=path.basename(folder);let win=null;
   for(let i=0;i<50&&!win;i+=1){await sleep(100);win=(await native.call('listWindows',{bundleId:FINDER})).windows.find(w=>w.title===name)??null;}
   assert.ok(win,'the temp Finder window opened');
   report.states.finder={windowId:win.window_id,bounds:win.bounds,offSpace:win.is_off_space};
   const input=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
   const send=async(text)=>{await fillComposer(page,input,text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();};
   const requests=async()=>(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8').catch(()=>'')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(e=>e.method==='mcp:tools/call').map(e=>e.params);
   const answered=async(tool,count)=>{const end=Date.now()+20000;while(Date.now()<end){const done=(await requests()).filter(c=>c.name===tool);if(done.length>=count)return done.at(-1);await sleep(100);}throw new Error(`no answer to ${tool}`);};
   await send(`fixture:app-tool request_access ${JSON.stringify({apps:['Finder'],reason:'phantom cursor live test'})}`);
   const allow=page.getByRole('button',{name:/Allow for this session/});
   await allow.waitFor({timeout:15000});await page.waitForTimeout(700);await allow.click();
   const access=await answered('request_access',1);
   assert.ok(!access.result?.isError,'request_access granted');
   await send(`fixture:app-tool app_screenshot ${JSON.stringify({app:FINDER,window_id:win.window_id})}`);
   const shot=await answered('app_screenshot',1);
   report.states.appScreenshot={isError:!!shot.result?.isError,text:shot.result?.content?.find(p=>p.type==='text')?.text?.slice(0,200)};
   assert.ok(!shot.result?.isError,'app_screenshot');
   await sleep(500);
   const centre={x:win.bounds.x+win.bounds.width/2,y:win.bounds.y+win.bounds.height/2};
   const locked=await cursorOf(win.window_id);
   report.states.lockCursor=locked;
   assert.ok(locked?.wanted&&near(locked.tip,centre,1),'the newly held window has its cursor at the centre');
   if(locked.targetOnScreen){
     assert.ok(locked.visible&&locked.zIndex===locked.targetZIndex-1,'on screen, directly above the Finder window');
     const pixel=await clayAt(centre,ownBundle?.bundleId);report.states.lockShot=pixel;
     if(pixel?.clay)report.checks.push(`B1 screenshot: clay pixels under the arrow at the Finder window's centre (${pixel.file})`);else report.blocked.push(`B1 screenshot: ${JSON.stringify(pixel)}`);
   }
   report.checks.push(`B1 app_screenshot took the lock: the cursor of Finder window ${win.window_id} at its centre (${centre.x}, ${centre.y}); target on screen ${locked.targetOnScreen}, cursor visible ${locked.visible}`);
   // A click on an empty spot of the list (no row: AX selects nothing harmful), in the screenshot's frame.
   await send(`fixture:app-tool app_click ${JSON.stringify({app:FINDER,window_id:win.window_id,coordinate:[300,40]})}`);
   const click=await answered('app_click',1);
   const clickText=click.result?.content?.find(p=>p.type==='text')?.text??'';
   report.states.appClick={isError:!!click.result?.isError,text:clickText.slice(0,300)};
   await sleep(500);
   const after=await cursorOf(win.window_id);report.states.clickCursor=after;
   if(click.result?.isError){
     assert.ok(after.wanted&&(near(after.tip,centre,1)),'a refused click puts the cursor back where it was');
     report.checks.push(`B2 app_click refused (${clickText.slice(0,120)}): the cursor is back at the centre`);
   }else{
     assert.ok(after.wanted&&!near(after.tip,centre,1),'moved to the click point');
     report.checks.push(`B2 app_click landed: the cursor moved to (${after.tip.x}, ${after.tip.y}) with the pulse`);
   }
   await send(`fixture:app-tool app_release ${JSON.stringify({app:FINDER})}`);
   await answered('app_release',1);await sleep(400);
   const released=await cursorOf(win.window_id);report.states.releaseCursor=released;
   assert.equal(released.visible,false);assert.equal(released.wanted,false);
   report.checks.push('B3 app_release: the window\'s cursor is gone');
   const closeFinder=()=>{try{execFileSync('osascript',['-e',`tell application "Finder" to if exists Finder window "${name}" then close Finder window "${name}"`]);}catch{}};
   closeFinder();
 }
 assert.deepEqual(report.rendererErrors,[]);
 // passed: every check that could run here passed; complete: nothing was blocked.
 report.passed=true;report.complete=report.blocked.length===0;
}catch(error){report.error=String(error?.stack??error);}
finally{
 await inApp('hidePhantomCursor',{}).catch(()=>{});
 await fixture?.quit().catch(()=>{});
 if(built)await fs.rm(built.dir,{recursive:true,force:true}).catch(()=>{});
 if(folder){try{(await import('node:child_process')).execFileSync('osascript',['-e',`tell application "Finder" to if exists Finder window "${path.basename(folder)}" then close Finder window "${path.basename(folder)}"`]);}catch{}
   await fs.rm(folder,{recursive:true,force:true}).catch(()=>{});}
 await app.close().catch(()=>{});
 report.after=await facts();
 if(report.before.front&&report.after.front!==report.before.front&&report.before.front!=='com.apple.loginwindow'){
   const {execFileSync}=await import('node:child_process');try{execFileSync('/usr/bin/open',['-b',report.before.front]);report.restoredFront=report.before.front;}catch{}
 }
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
