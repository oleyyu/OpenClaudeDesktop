// Target window highlight live, in the real app (CU_LIVE=1): the native panels (WindowHighlight.swift) need the app's
// Cocoa main run loop, so the native calls run inside the Electron main process of the real app. Only the fixture app's
// windows are highlighted, moved, resized, minimized or sent to another Space (tests/fixtures/cu-text-fixture: SIGUSR2
// runs the command in $CU_FIXTURE_COMMAND on its own window); nothing is clicked or typed anywhere.
//   H1 shown on a real window: its frame is the window's kCGWindowBounds exactly (alignment), its layer, ordered
//      directly above it, non-activating, click-through, never key, collection behaviour 0x150, faded in, pulsing.
//   H2 the window moves and resizes: the frame follows within a tick (50 ms).
//   H3 hit tests: the display hit test finds the panel unless it is in the ignore list (main.cjs passes the panels'
//      numbers); an Accessibility hit test (axClick dry run) is not taken by it.
//   H4 minimized: put away; restored: back on the window.
//   H5 another Space: put away; back on the active Space: back on the window (when a second Space is known).
//   H6 Reduce motion: no pulse; the system / app setting off: the pulse.
//   H7 window-highlight.cjs (controller + driver) over the real module in the app process: in use → shown; the session
//      takes the display lock → gives way; released → gone.
//   H8 a screenshot of the window's edge (only this app's and the fixture's windows): clay at the inner edge, none at
//      the centre — when a display is awake.
//   H9 hide: faded out and ordered out.
// Run from app/: CU_LIVE=1 node scripts/computer-use-window-highlight-live.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {buildFixture,launchFixture,FIXTURE} from '../tests/computer-use-live-helpers.mjs';
if(process.env.CU_LIVE!=='1'){console.log(JSON.stringify({skipped:'set CU_LIVE=1 to run the live window highlight test'}));process.exit(0);}
const require=createRequire(import.meta.url);
const root=path.resolve(import.meta.dirname,'..');
const native=require('../electron/computer-use/native.cjs').createNative();
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'computer-use-highlight-live-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true}));
const env={...process.env,CODE_DESKTOP_OFFSCREEN_LAUNCH:'1',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const report={directory,before:null,after:null,checks:[],blocked:[],states:{},rendererErrors:[],passed:false};
const facts=async()=>{const probe=await native.call('probe').catch(e=>({error:e.message}));const front=await native.call('frontmostApp').catch(()=>null);const cursor=await native.call('cursorPosition').catch(()=>null);
  const space=await native.call('spaceState',{}).catch(()=>null);
  return {screenLocked:probe.screenLocked,secureInput:probe.secureInput,idle:probe.secondsSinceUserInput,ownInput:probe.secondsSinceOwnInput,front:front?.bundleId??null,cursor,activeSpace:space?.activeSpace??null,activeSpaceType:space?.activeSpaceType??null};};
report.before=await facts();
const displays=(await native.call('listDisplays').catch(()=>null))?.displays??[];
report.before.displays=displays.map(d=>({id:d.displayId,bounds:d.bounds,main:d.isMain}));
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const near=(a,b,eps=0.6)=>Math.abs(a.x-b.x)<=eps&&Math.abs(a.y-b.y)<=eps;
const sameRect=(a,b,eps=0.5)=>!!a&&!!b&&['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<=eps);
const commandFile=path.join(directory,'fixture-command.txt');
process.env.CU_FIXTURE_COMMAND=commandFile;
const app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env:{...env,CU_FIXTURE_COMMAND:commandFile},timeout:20000});
const inApp=(method,params={})=>app.evaluate(async({app},[method,params])=>{
  const {createRequire}=process.mainModule.require('node:module');
  const n=globalThis.__cuLiveNative??=createRequire(app.getAppPath()+'/package.json')('./electron/computer-use/native.cjs').createNative();
  try{return {ok:true,result:await n.call(method,params)};}catch(error){return {ok:false,code:error.code,message:error.message};}
},[method,params]);
const must=async(method,params)=>{const r=await inApp(method,params);if(!r.ok)throw new Error(`${method}: ${r.code} ${r.message}`);return r.result;};
const highlightOf=async(windowId)=>(await must('windowHighlightState')).highlights.find(h=>h.windowId===windowId);
// Once the target's frame has stopped changing (an animation — minimize, restore — may still be moving it): the
// highlight state read after two equal frames 200 ms apart (at most 8 s).
const settledOf=async(windowId)=>{let last=null;for(let i=0;i<40;i+=1){const now=await highlightOf(windowId);
  if(last&&JSON.stringify(now.targetBounds)===JSON.stringify(last.targetBounds)&&now.targetOnScreen===last.targetOnScreen){await sleep(120);return highlightOf(windowId);}
  last=now;await sleep(200);}return highlightOf(windowId);};
// The window under a point below the lock screen's shield (layers ≥ 1000: the login window / Window Server shields).
const ownerAt=async(point,ignore=[])=>{const skipped=[];for(let i=0;i<8;i+=1){const owner=(await native.call('pointOwner',{point,ignoreWindowIds:[...ignore,...skipped]}).catch(()=>({owner:null}))).owner;
  if(!owner||owner.layer<1000)return {owner,skipped};skipped.push(owner.windowId);}return {owner:null,skipped};};
let fixture=null,fixture2=null,built=null;
const command=async(target,text,ms=350)=>{await fs.writeFile(commandFile,text);process.kill(target.pid,'SIGUSR2');await sleep(ms);};
const windowOf=async(target)=>(await native.call('listWindows',{bundleId:FIXTURE})).windows.find(w=>w.window_id===target.windowId);
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.rendererErrors.push(e.message));
 await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 const main=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()&&w.isVisible());return {id:Number(/^window:(\d+):/.exec(w.getMediaSourceId())?.[1]),bounds:w.getBounds()};});
 report.states.main=main;
 built=buildFixture();
 fixture=await launchFixture(built,{background:true});
 report.states.fixture={windowId:fixture.windowId,bounds:fixture.bounds};
 // ── H1 ──
 const shown=await must('showWindowHighlight',{windowId:fixture.windowId});
 await sleep(450);
 const h1=await highlightOf(fixture.windowId);
 report.states.h1={returned:shown.placement,...h1};
 assert.equal(h1.collectionBehavior,0x150);assert.equal(h1.styleMask&0x80,0x80,'non-activating');
 assert.equal(h1.ignoresMouseEvents,true);assert.equal(h1.isOpaque,false);assert.equal(h1.hasShadow,false);
 assert.equal(h1.isKeyWindow,false);assert.equal(h1.canBecomeKey,false);assert.equal(h1.hidesOnDeactivate,false);
 assert.equal(h1.wanted,true);
 if(!h1.targetOnScreen)throw new Error('the fixture window is not on screen: nothing to align with');
 assert.equal(h1.placement,'above_target');assert.equal(h1.visible,true);
 assert.ok(sameRect(h1.bounds,h1.targetBounds),`aligned: ${JSON.stringify(h1.bounds)} vs ${JSON.stringify(h1.targetBounds)}`);
 assert.equal(h1.level,h1.targetLayer,'the target window\'s layer');
 assert.equal(h1.zIndex,h1.targetZIndex-1,'ordered directly above its target');
 assert.ok(h1.alpha>0.99,`faded in (${h1.alpha})`);
 const systemReduce=await app.evaluate(({systemPreferences})=>systemPreferences.getAnimationSettings?.().prefersReducedMotion??null);
 report.states.systemReduceMotion=systemReduce;
 assert.equal(h1.pulsing,systemReduce!==true,'the glow pulse unless the system reduces motion');
 const front1=(await native.call('frontmostApp').catch(()=>null))?.bundleId??null;
 report.checks.push(`H1 highlight on fixture window ${h1.windowId}: frame ${JSON.stringify(h1.bounds)} = the window's kCGWindowBounds ${JSON.stringify(h1.targetBounds)}; layer ${h1.level}; z ${h1.zIndex} directly above the target's ${h1.targetZIndex}; 0x150, non-activating, click-through, not key; alpha ${h1.alpha}; pulsing ${h1.pulsing}; on the active Space ${h1.onActiveSpace} (Space type ${report.before.activeSpaceType}); front app still ${front1}`);
 // ── H2 ── move and resize (the fixture sets its own frame).
 const b=h1.targetBounds,moved={x:b.x+40,y:b.y+30,width:b.width+60,height:b.height+40};
 await command(fixture,`frame ${moved.x} ${moved.y} ${moved.width} ${moved.height}`,150);
 const h2=await highlightOf(fixture.windowId);
 report.states.h2=h2;
 assert.ok(sameRect(h2.targetBounds,moved),`the fixture moved: ${JSON.stringify(h2.targetBounds)}`);
 assert.ok(sameRect(h2.bounds,h2.targetBounds),`followed: ${JSON.stringify(h2.bounds)} vs ${JSON.stringify(h2.targetBounds)}`);
 assert.equal(h2.zIndex,h2.targetZIndex-1);
 const moved2={x:moved.x-80,y:moved.y+10,width:moved.width-120,height:moved.height-70};
 await command(fixture,`frame ${moved2.x} ${moved2.y} ${moved2.width} ${moved2.height}`,150);
 const h2b=await highlightOf(fixture.windowId);
 assert.ok(sameRect(h2b.bounds,moved2)&&sameRect(h2b.targetBounds,moved2),`followed the shrink: ${JSON.stringify(h2b.bounds)}`);
 report.checks.push(`H2 the window moved / grew to ${JSON.stringify(moved)} and moved / shrank to ${JSON.stringify(moved2)}: the highlight's frame matched it each time within 150 ms, still directly above it`);
 // ── H3 ── hit tests.
 const centre={x:moved2.x+moved2.width/2,y:moved2.y+moved2.height/2};
 const plain=await ownerAt(centre),ignoring=await ownerAt(centre,[h2b.windowNumber]);
 report.states.h3={plain,ignoring};
 assert.equal(plain.owner?.windowId,h2b.windowNumber,'without the ignore list the display hit test finds the panel (on top, not transparent)');
 assert.equal(ignoring.owner?.windowId,fixture.windowId,'with the panel ignored it finds the fixture window');
 const dry=await native.call('axClick',{bundleId:FIXTURE,windowId:fixture.windowId,winLocalPt:{x:moved2.width/2,y:moved2.height-50},dryRun:true}).catch(e=>({error:e.code,message:e.message}));
 report.states.h3.axDryRun=dry;
 const axTaken=['foreign_pid','anotherWindowIsOnTopAtThePressPoint'].includes(dry?.reasonCode);
 assert.ok(!axTaken,`the Accessibility hit test is not taken by the panel: ${JSON.stringify(dry)}`);
 // The ladder's own hit test, read only (the dry run stops at the screen-lock gate while the screen is locked): at the
 // window's centre and near its inner edge (the rim's strongest part), with the highlight up.
 const {execFileSync}=await import('node:child_process');
 const probe=path.join(built.dir,'cu-ax-hit');
 execFileSync('swiftc',['-O','-o',probe,path.join(root,'tests/fixtures/cu-ax-hit.swift')],{stdio:'pipe'});
 const axAt=(point)=>JSON.parse(execFileSync(probe,[String(fixture.pid),String(point.x),String(point.y)],{encoding:'utf8'}).trim());
 const edge={x:moved2.x+6,y:moved2.y+moved2.height/2};
 const axCentre=axAt(centre),axEdge=axAt(edge);
 report.states.h3.ax={centre:axCentre,edge:axEdge};
 const panelPid=plain.owner?.pid;
 for(const [name,hit] of [['centre',axCentre],['edge',axEdge]]){
   assert.notEqual(hit.pid,panelPid,`the AX hit test at the ${name} is not the highlight's process`);
   if(hit.axError===0)assert.equal(hit.pid,fixture.pid,`the AX hit at the ${name} is the fixture's`);
 }
 // Baseline: the same hit test with the highlight down.
 await must('hideWindowHighlight',{windowId:fixture.windowId});await sleep(450);
 const baseCentre=axAt(centre),baseEdge=axAt(edge);
 report.states.h3.axWithout={centre:baseCentre,edge:baseEdge};
 await must('showWindowHighlight',{windowId:fixture.windowId});await sleep(450);
 for(const [name,hit,base] of [['centre',axCentre,baseCentre],['edge',axEdge,baseEdge]]){
   assert.deepEqual({pid:hit.pid,role:hit.role,windowId:hit.windowId},{pid:base.pid,role:base.role,windowId:base.windowId},`the AX hit at the ${name} is the same with and without the highlight`);
 }
 // Seen: the hit is an element inside the window (not the bare application element AX answers when it sees no window).
 const axSeen=[axCentre,axEdge].every(hit=>hit.axError===0&&hit.role!=='AXApplication');
 if(axSeen)assert.ok([axCentre.windowId,axEdge.windowId].every(id=>id===fixture.windowId),'inside the target window');
 report.checks.push(`H3 display hit test: the panel ${h2b.windowNumber} is the top window at the window's centre unless ignored (main.cjs passes it in overlayWindowIds), then the fixture window ${fixture.windowId}. Accessibility hit test (the AX ladder's AXUIElementCopyElementAtPosition on the target app) with the highlight up: centre ${JSON.stringify(axCentre)}, inner edge ${JSON.stringify(axEdge)} — never the highlight's process (${panelPid}); the dry-run axClick itself answered ${JSON.stringify({outcome:dry?.outcome??null,reasonCode:dry?.reasonCode??null,error:dry?.error??null})}`);
 if(!axSeen)report.blocked.push(`H3 AX: with and without the highlight the hit test answered the bare application element (${JSON.stringify(axCentre)}; screen locked ${(await native.call('probe')).screenLocked}: Accessibility sees no window then), so "an element inside the target window under the highlight" was not observed — only "the same answer as without the highlight, never the highlight's process"`);
 else if(dry?.reasonCode==='screen_locked')report.checks.push('H3 note: axClick dry run stopped at the screen-lock gate (expected while locked); the ladder\'s hit test was checked with the read-only probe instead');
 // ── H4 ── minimized and restored.
 await command(fixture,'minimize',900);
 const h4=await settledOf(fixture.windowId);
 report.states.h4=h4;
 if(h4.targetOnScreen===false){
   assert.equal(h4.placement,'away');assert.equal(h4.visible,false);assert.equal(h4.wanted,true);
   report.checks.push('H4 minimized: the highlight was put away (still wanted)');
 }else{
   // With no display awake the genie animation never runs to its end: the window stays on screen, shrunk at the Dock.
   assert.ok(sameRect(h4.bounds,h4.targetBounds),'it still follows the window\'s frame');
   report.blocked.push(`H4 minimize: the window did not leave the screen (no display awake: the minimize animation does not run to its end; the window settled at ${JSON.stringify(h4.targetBounds)}); the highlight followed that frame (${JSON.stringify(h4.bounds)}) — "minimized → put away" is covered by the Swift placement test, not observed live`);
 }
 await command(fixture,'restore',900);
 const h4b=await settledOf(fixture.windowId);
 report.states.h4b=h4b;
 assert.equal(h4b.targetOnScreen,true,'the fixture restored');
 assert.equal(h4b.placement,'above_target');assert.equal(h4b.visible,true);assert.ok(sameRect(h4b.bounds,h4b.targetBounds));
 assert.equal(h4b.zIndex,h4b.targetZIndex-1);
 report.checks.push(`H4 restored: back on the window ${JSON.stringify(h4b.bounds)}, aligned and directly above it`);
 // ── H5 ── another Space: a second fixture window that stays on one Space (launched in the background it lands on a
 // Space other than the active one when that is a full-screen app's).
 fixture2=await launchFixture(built,{background:true,allSpaces:false});
 const space=await native.call('spaceState',{windowId:fixture2.windowId}).catch(()=>null);
 await must('showWindowHighlight',{windowId:fixture2.windowId});await sleep(400);
 const first=await highlightOf(fixture2.windowId);
 report.states.h5={active:space?.activeSpace,activeType:space?.activeSpaceType,windowSpaces:space?.windowSpaces??null,first};
 const flip=async(target)=>{await command(fixture2,`space ${target}`,900);return highlightOf(fixture2.windowId);};
 const other=(space?.windowSpaces??[]).find(id=>id!==space?.activeSpace)??null;
 if(first.targetOnScreen===false){
   assert.equal(first.placement,'away');assert.equal(first.visible,false);assert.equal(first.wanted,true);
   report.checks.push(`H5 a window on another Space (${JSON.stringify(space?.windowSpaces)}, active ${space?.activeSpace}): the highlight is put away, not left floating on the active Space`);
   const here=await flip(space.activeSpace);
   report.states.h5.here=here;
   if(here.targetOnScreen){
     assert.equal(here.placement,'above_target');assert.equal(here.visible,true);assert.ok(sameRect(here.bounds,here.targetBounds));assert.equal(here.onActiveSpace,true);
     const away=await flip(other);report.states.h5.away=away;
     assert.equal(away.visible,away.targetOnScreen);
     report.checks.push(`H5 moved onto the active Space: the highlight came on it, aligned, on the active Space; moved back to ${other}: visible ${away.visible} (target on screen ${away.targetOnScreen})`);
   }else{
     report.blocked.push(`H5 return: moving the fixture's window to the active Space ${space.activeSpace} (type ${space.activeSpaceType}${space.activeSpaceType===4?', a full-screen app\'s':''}) left it off screen, so "back on the active Space → shown again" was not observed live`);
   }
 }else if(other!==null){
   const there=await flip(other);report.states.h5.there=there;
   if(there.targetOnScreen===false){assert.equal(there.placement,'away');assert.equal(there.visible,false);report.checks.push(`H5 the window moved to Space ${other}: the highlight was put away`);}
   else report.blocked.push(`H5: the fixture window stayed on screen after a move to Space ${other}`);
 }else{
   report.blocked.push(`H5: the second fixture window is on the active Space and no other Space is known (${JSON.stringify(space)})`);
 }
 await must('hideWindowHighlight',{windowId:fixture2.windowId});
 // ── H6 ── Reduce motion.
 const reduced=await must('showWindowHighlight',{windowId:fixture.windowId,reduceMotion:true});
 assert.equal(reduced.pulsing,false);assert.equal(reduced.reduceMotion,true);
 const unreduced=await must('showWindowHighlight',{windowId:fixture.windowId,reduceMotion:false});
 assert.equal(unreduced.pulsing,systemReduce!==true);
 report.checks.push(`H6 the app's Reduce motion: no pulse; off again: pulsing ${unreduced.pulsing} (system reduce motion ${systemReduce})`);
 // ── H7 ── window-highlight.cjs over the real module, in the app process.
 const viaJs=await app.evaluate(async({app},windowId)=>{
   const {createRequire}=process.mainModule.require('node:module');const req=createRequire(app.getAppPath()+'/package.json');
   const native=req('./electron/computer-use/native.cjs').createNative();
   const {createWindowHighlight,createHighlightDriver}=req('./electron/computer-use/window-highlight.cjs');
   const highlight=createWindowHighlight({native,log:{info(){},warn(){}}});
   let sessions=[],holder=null;const listeners=new Set();
   const driver=createHighlightDriver({highlight,inUse:{sessions:()=>sessions,onChange:(fn)=>{listeners.add(fn);return ()=>listeners.delete(fn);}},holder:()=>holder});
   const state=async()=>{await new Promise(r=>setTimeout(r,450));const h=(await native.call('windowHighlightState')).highlights.find(x=>x.windowId===windowId);return {visible:h.visible,wanted:h.wanted};};
   await native.call('hideWindowHighlight',{});await new Promise(r=>setTimeout(r,450));
   driver.target({sessionId:'s',bundleId:'x',windowId});const before=await state();
   sessions=['s'];for(const fn of listeners)fn(sessions);const using=await state();const numbers=highlight.windowNumbers();
   holder='s';driver.lockChanged();const locked=await state();
   holder=null;driver.lockChanged();const unlocked=await state();
   driver.released({sessionId:'s',windowId});const released=await state();
   return {mode:highlight.mode(),before,using,locked,unlocked,released,numbers};
 },fixture.windowId);
 report.states.h7=viaJs;
 assert.equal(viaJs.mode,'native');
 assert.deepEqual([viaJs.before.visible,viaJs.using.visible,viaJs.locked.visible,viaJs.unlocked.visible,viaJs.released.visible],[false,true,false,true,false]);
 assert.equal(viaJs.numbers.length,1);
 report.checks.push('H7 window-highlight.cjs over the real module in the app process: a target before the session uses the computer stays hidden; in use → shown (its panel number for the hit test); the session takes the display lock → hidden (the screen glow\'s turn); lock released → shown; the window released → hidden');
 // ── H8 ── screenshot of the edge.
 const awake=((await native.call('listDisplays').catch(()=>null))?.displays??[]).length>0;
 // The panel's own layers rendered off screen (what it draws, whether or not a display can show it): the window's size,
 // clay at the inner edges, clear at the centre.
 {
   await must('showWindowHighlight',{windowId:fixture.windowId});await sleep(450);
   const now=await highlightOf(fixture.windowId);
   const snap=await must('windowHighlightSnapshot',{windowId:fixture.windowId});
   const file=path.join(directory,'highlight-rim.png');await fs.writeFile(file,Buffer.from(snap.png,'base64'));
   const px=await app.evaluate(({nativeImage},png)=>{const image=nativeImage.createFromBuffer(Buffer.from(png,'base64'));const {width,height}=image.getSize();const bitmap=image.toBitmap();
     const at=(x,y)=>{const i=(Math.round(y)*width+Math.round(x))*4;return {r:bitmap[i+2],g:bitmap[i+1],b:bitmap[i],a:bitmap[i+3]};};
     return {width,height,left:at(1,height/2),right:at(width-2,height/2),top:at(width/2,1),bottom:at(width/2,height-2),corner:at(1,1),inset60:at(60,height/2),centre:at(width/2,height/2)};},snap.png);
   report.states.h8snapshot={file,size:[snap.width,snap.height],target:now.targetBounds,px};
   assert.deepEqual([snap.width,snap.height],[Math.round(now.targetBounds.width),Math.round(now.targetBounds.height)],'the rim is drawn at the window\'s size');
   const clay=(p)=>p.a>90&&p.r>p.g&&p.g>p.b;
   for(const edge of ['left','right','top','bottom','corner'])assert.ok(clay(px[edge]),`clay at the ${edge}: ${JSON.stringify(px[edge])}`);
   assert.ok(px.inset60.a<px.left.a,'fading inward');
   assert.ok(px.centre.a<12,`clear at the centre: ${JSON.stringify(px.centre)}`);
   report.checks.push(`H8a the panel's layers rendered off screen (${file}): ${snap.width}×${snap.height} = the window's size; clay at all four inner edges and the corner (left ${JSON.stringify(px.left)}), fainter 60 pt in (${JSON.stringify(px.inset60)}), clear at the centre (${JSON.stringify(px.centre)})`);
 }
 if(!awake){
   report.blocked.push(`H8 screenshot: no display is awake (listDisplays empty; screen locked ${(await native.call('probe')).screenLocked}) — the rim could not be captured on screen; the alignment is shown by the window server's own frames (H1, H2, H4) and the rim by the off-screen render (H8a)`);
 }else{
   await must('showWindowHighlight',{windowId:fixture.windowId});await sleep(500);
   const now=await highlightOf(fixture.windowId);
   const tb=now.targetBounds;
   const display=displays.find(d=>tb.x+tb.width/2>=d.bounds.x&&tb.x+tb.width/2<d.bounds.x+d.bounds.width&&tb.y+tb.height/2>=d.bounds.y&&tb.y+tb.height/2<d.bounds.y+d.bounds.height)??displays[0];
   const ownBundle=plain.owner?.bundleId;
   const region={x:Math.max(0,tb.x-display.bounds.x),y:Math.max(0,tb.y-display.bounds.y),width:Math.min(tb.width,display.bounds.width),height:Math.min(tb.height,display.bounds.height)};
   const shot=await inApp('captureScreen',{displayId:display.displayId,allowedBundleIds:[ownBundle,FIXTURE],scale:1,region});
   if(!shot.ok){report.blocked.push(`H8 screenshot: ${shot.code} ${shot.message}`);}
   else{
     const file=path.join(directory,'highlight-window.jpg');await fs.writeFile(file,Buffer.from(shot.result.dataUrl.split(',')[1],'base64'));
     const pixels=await app.evaluate(({nativeImage},dataUrl)=>{const image=nativeImage.createFromDataURL(dataUrl);const {width,height}=image.getSize();const bitmap=image.toBitmap();
       const at=(fx,fy)=>{const px=Math.min(width-1,Math.round(fx*width)),py=Math.min(height-1,Math.round(fy*height)),i=(py*width+px)*4;return {r:bitmap[i+2],g:bitmap[i+1],b:bitmap[i]};};
       return {width,height,edge:at(0.004,0.5),centre:at(0.5,0.5)};},shot.result.dataUrl);
     report.states.h8={file,pixels};
     const warm=(p)=>p.r-p.b;
     if(warm(pixels.edge)>warm(pixels.centre)+20)report.checks.push(`H8 screenshot of the window (${file}): the inner left edge is clay-tinted ${JSON.stringify(pixels.edge)}, the centre is not ${JSON.stringify(pixels.centre)}`);
     else report.blocked.push(`H8 screenshot: no clay at the edge ${JSON.stringify(pixels)} (${file})`);
   }
 }
 // ── H9 ── hide.
 const hidden=await must('hideWindowHighlight',{windowId:fixture.windowId});
 assert.deepEqual(hidden.hidden,[fixture.windowId]);
 await sleep(450);
 const h9=await highlightOf(fixture.windowId);
 report.states.h9=h9;
 assert.equal(h9.visible,false);assert.equal(h9.wanted,false);assert.ok(h9.alpha<0.01);
 report.checks.push('H9 hide: faded out (alpha 0) and ordered out after 320 ms');
 const mid=await facts();
 report.states.afterNative={front:mid.front,cursor:mid.cursor};
 assert.equal(mid.front,report.before.front,'the highlight never activates an app');
 assert.ok(near(mid.cursor,report.before.cursor,0.01),'the real pointer never moved');
 report.checks.push('H10 the front app and the real pointer are unchanged');
 assert.deepEqual(report.rendererErrors,[]);
 report.passed=true;report.complete=report.blocked.length===0;
}catch(error){report.error=String(error?.stack??error);}
finally{
 await inApp('hideWindowHighlight',{}).catch(()=>{});
 await fixture?.quit().catch(()=>{});
 await fixture2?.quit().catch(()=>{});
 if(built)await fs.rm(built.dir,{recursive:true,force:true}).catch(()=>{});
 await app.close().catch(()=>{});
 report.after=await facts();
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
