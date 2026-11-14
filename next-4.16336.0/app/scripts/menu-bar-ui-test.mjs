import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// General > Menu bar end to end: real settings switch -> IPC -> preferences -> main
// Tray controller, and NOr's right-click menu fed by the fixture's actual
// account/read + account/rateLimits/read replies. Only meaningful under the
// offscreen adapter, which records Tray calls instead of creating an OS icon.
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'menu-bar-ui-')),profile=path.join(directory,'profile');
await fs.mkdir(path.join(profile,'workspace'),{recursive:true});
// No menuBarEnabled key: an existing profile must get the source default (on). One seeded fixture session backs the
// R01 Close Session / Reopen Closed Session step.
const SESSION='menu-bar-session',seededAt=Math.floor(Date.now()/1000);
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:path.join(profile,'workspace'),mode:'code',theme:'light',threadIds:[SESSION]}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[SESSION]:{id:SESSION,name:'Menu bar session',cwd:path.join(profile,'workspace'),createdAt:seededAt,updatedAt:seededAt,archived:false,
 turns:[{id:SESSION+'-turn',status:'completed',items:[{id:SESSION+'-user',type:'userMessage',content:[{type:'text',text:'Seeded prompt.',text_elements:[]}]},{id:SESSION+'-answer',type:'agentMessage',text:'Seeded answer.'}]}]}}}));
const atom=async(name,value)=>{const p=path.join(profile,name);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
const limits=(...used)=>({rateLimitsByLimitId:Object.fromEntries(used.map((u,i)=>[i?'model-'+i:'codex',{limitId:i?'model-'+i:'codex',limitName:i?'Fixture model':null,primary:{usedPercent:u,windowDurationMins:300},secondary:null}]))});
const usage={'account/read':{result:{account:{type:'chatgpt',email:'menu@example.invalid',planType:'pro'},requiresOpenaiAuth:true}},'account/rateLimits/read':{result:limits(31,72)}};
const set=async(method,reply)=>{usage[method]=reply;await atom('fixture-usage.json',usage);};await atom('fixture-usage.json',usage);
const read=async name=>JSON.parse(await fs.readFile(path.join(profile,name),'utf8'));
const exists=async name=>{try{await fs.stat(path.join(profile,name));return true;}catch{return false;}};
const requests=async()=>{try{return (await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const h=sha(await fs.readFile(path.join(root,'scripts/menu-bar-ui-test.mjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('MENUBAR '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 // The adapter must own Tray; otherwise this run would place a real menu bar icon.
 assert.equal(await app.evaluate(()=>Array.isArray(globalThis.offscreenEvidence?.trays)),true,'menu bar suite requires the offscreen Tray adapter');
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();}
const trays=()=>app.evaluate(()=>globalThis.offscreenEvidence.trays.map(t=>({...t,menus:t.menus.length})));
const live=async()=>(await trays()).filter(t=>!t.destroyed);
async function rightClick(){const before=await app.evaluate(()=>globalThis.offscreenEvidence.trays.reduce((n,t)=>n+t.menus.length,0));await app.evaluate(()=>globalThis.offscreenTrayObjects.findLast(t=>!t.isDestroyed()).emit('right-click'));
 await poll(async()=>await app.evaluate(()=>globalThis.offscreenEvidence.trays.reduce((n,t)=>n+t.menus.length,0))===before+1,'tray menu popped');
 return app.evaluate(()=>globalThis.offscreenEvidence.trays.findLast(t=>!t.destroyed).menus.at(-1));}
const labels=menu=>menu.map(i=>i.type==='separator'?'---':i.label);
const settings=()=>page.getByRole('dialog',{name:'Settings',exact:true});
async function openGeneral(){await page.keyboard.press('Meta+,');await settings().waitFor();await settings().getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'System',exact:true}).click();await settings().getByRole('heading',{name:'System',exact:true}).waitFor();}
const menuSwitch=()=>settings().getByRole('switch',{name:'Menu bar',exact:true});
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
try{
 await integrity();await launch();
 step('default-on');await poll(async()=>(await live()).length===1,'tray created at launch');const [tray]=await live();
 assert.deepEqual(tray.image,{size:{width:24,height:24},template:true});assert.equal(tray.tooltip,'OpenClaude Desktop');report.metrics.launchTray=tray;
 report.checks.push('A profile without menuBarEnabled gets one 24pt template tray image with the app name tooltip at launch');
 step('menu-usage');await poll(async()=>(await page.evaluate(()=>window.desktop.call('init'))).account?.account?.email==='menu@example.invalid','fixture account');
 const readsBefore=(await requests()).filter(r=>r.method==='account/rateLimits/read').length;let menu=await rightClick();
 assert.deepEqual(labels(menu),['Show App','---','Pro plan','Usage: 72%','---','Quit OpenClaude Desktop']);assert.deepEqual(menu.filter(i=>i.label==='Pro plan'||i.label?.startsWith('Usage')).map(i=>i.enabled),[false,false]);
 assert.equal((await requests()).filter(r=>r.method==='account/rateLimits/read').length,readsBefore+1);report.metrics.menu=menu;
 report.checks.push('Right click refetches actual rate limits and shows NOr Show App / greyed Pro plan and peak Usage: 72% / Quit rows');
 step('held-and-failed-read');await set('account/rateLimits/read',{result:limits(90),hold:'tray'});const t0=Date.now();menu=await rightClick();report.metrics.heldMenuMs=Date.now()-t0;
 assert.ok(report.metrics.heldMenuMs<3000);assert.deepEqual(labels(menu).slice(2,4),['Pro plan','Usage: 72%']);await poll(()=>exists('fixture-usage-tray-held.json'),'held read');await fs.writeFile(path.join(profile,'fixture-usage-tray-release'),'');await poll(()=>exists('fixture-usage-tray-sent.json'),'held read released');
 await page.waitForTimeout(100);await set('account/rateLimits/read',{error:{code:-32603,message:'Fixture limits unavailable'}});menu=await rightClick();assert.deepEqual(labels(menu).slice(2,4),['Pro plan','Usage: 90%']);
 report.checks.push('A held read opens the menu after the bounded wait with the previous snapshot; the late reply updates it; a failed read keeps the last actual snapshot');
 step('show-app');const blockedBefore=(await app.evaluate(()=>globalThis.offscreenEvidence.blocked.length));await app.evaluate(()=>globalThis.offscreenTrayObjects.findLast(t=>!t.isDestroyed()).lastMenu.items[0].click());
 const blocked=await app.evaluate(()=>globalThis.offscreenEvidence.blocked);assert.deepEqual(blocked.slice(blockedBefore),['window.show']);
 await app.evaluate(()=>globalThis.offscreenTrayObjects.findLast(t=>!t.isDestroyed()).emit('click'));assert.deepEqual((await app.evaluate(()=>globalThis.offscreenEvidence.blocked)).slice(blockedBefore+1),['window.show','window.focus']);
 report.checks.push('Show App follows pK (hidden offscreen window -> show) and left click follows the pji fallback (show + focus); both stop at the adapter');
 // R01 (index.chunk-ChZ67Jhw.js iwr/rwr/owr; shared-21-D098Wd--.js pR cmd+w, reopenClosed cmd+shift+t; ion-dist
 // shared-19 Kh/qh, cb24e6301 planReopen): in a session File's ⌘W is Close Session and the renderer's ⌘W closes the
 // session view (Home) instead of the window, which never sees a close; ⇧⌘T reopens it. Home keeps Close Window ⌘W.
 step('close-session');await app.evaluate(({BrowserWindow})=>{globalThis.__mainCloses=0;BrowserWindow.getAllWindows()[0].on('close',()=>{globalThis.__mainCloses+=1;});});
 // The close block follows New Session and the ewr Open… block (Open File… ⌘O, Open Folder… ⇧⌘O).
 const fileItems=()=>app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='File').submenu.items.filter(item=>item.visible&&item.type!=='separator').filter((item,index,items)=>index>items.findIndex(entry=>entry.label==='Open Folder…')).map(item=>[item.label,item.accelerator,item.enabled]));
 const sessionRow=()=>page.locator(`[data-source-session-id="${SESSION}"] [data-row-main-button]`);
 const sessionOpen=()=>sessionRow().evaluate(node=>node.getAttribute('aria-current')==='page');
 const onHome=()=>page.evaluate(()=>!document.querySelector('[data-row-main-button][aria-current="page"]')&&!!document.querySelector('.source-sidebar-nav-row[aria-current="page"]'));
 const sameItems=async(expected,label)=>{let last;try{await poll(async()=>JSON.stringify(last=await fileItems())===JSON.stringify(expected),label);}catch(error){error.message+=' '+JSON.stringify(last);throw error;}};
 await sameItems([['Close Window','CmdOrCtrl+W',true],['Reopen Closed Session','CmdOrCtrl+Shift+T',false]],'Home: Close Window, Reopen listed but disabled');
 await sessionRow().click();await poll(sessionOpen,'session opened');
 await sameItems([['Close Session','CmdOrCtrl+W',true],['Close Window','CmdOrCtrl+Shift+W',true],['Reopen Closed Session','CmdOrCtrl+Shift+T',false]],'session: Close Session, Close Window on ⇧⌘W');
 await page.keyboard.press('Meta+W');await poll(onHome,'⌘W returns Home');
 await page.waitForTimeout(200);assert.equal(await app.evaluate(()=>globalThis.__mainCloses),0,'the window never received a close');
 assert.deepEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({destroyed:w.isDestroyed()}))),[{destroyed:false}]);
 assert.equal(await page.evaluate(()=>document.querySelector('[data-cds="ChatComposerEditor"]')!==null),true,'the renderer is still live');
 await sameItems([['Close Window','CmdOrCtrl+W',true],['Reopen Closed Session','CmdOrCtrl+Shift+T',true]],'Reopen Closed Session enabled after the close');
 await page.keyboard.press('Meta+Shift+T');await poll(sessionOpen,'⇧⌘T reopens the closed session');
 await sameItems([['Close Session','CmdOrCtrl+W',true],['Close Window','CmdOrCtrl+Shift+W',true],['Reopen Closed Session','CmdOrCtrl+Shift+T',false]],'the reopened entry left the stack');
 // File > Close Session by mouse closes the session too; back on Home for the window-close step.
 await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='File').submenu.items.find(item=>item.label==='Close Session').click());await poll(onHome,'File > Close Session returns Home');
 assert.equal(await app.evaluate(()=>globalThis.__mainCloses),0);report.metrics.closeSession={home:await fileItems()};
 report.checks.push('In a session File ⌘W reads Close Session with Close Window on ⇧⌘W; ⌘W goes Home without closing the window; Reopen Closed Session (⇧⌘T) is enabled afterwards and reopens the session; File > Close Session does the same by click; Home keeps Close Window ⌘W');
 // Fidelity F04 (titlebar-window-01): index.chunk-ChZ67Jhw.js m.on("close") hides the main window instead of quitting;
 // window-all-closed is a no-op, and the tray's Show App, the Dock (app "activate") and Window > Show Main Window bring it back.
 step('close-hides');assert.equal(await onHome(),true,'closing the window runs from Home');const blockedAtClose=await app.evaluate(()=>globalThis.offscreenEvidence.blocked.length);
 await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].close();});await page.waitForTimeout(300);
 report.metrics.afterClose=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({destroyed:w.isDestroyed(),visible:w.isVisible()})));
 assert.deepEqual(report.metrics.afterClose,[{destroyed:false,visible:false}],'close() keeps the window alive and hidden');
 assert.equal(await page.evaluate(()=>document.querySelector('[data-cds="ChatComposerEditor"]')!==null),true,'the renderer is still live');
 await app.evaluate(()=>globalThis.offscreenTrayObjects.findLast(t=>!t.isDestroyed()).lastMenu.items[0].click());
 await app.evaluate(({app})=>app.emit('activate',{preventDefault(){}},false));
 const windowMenu=await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='Window').submenu.items.map(item=>item.type==='separator'?'---':item.label));
 assert.deepEqual(windowMenu,['Minimize','Zoom','---','Show Main Window','---','Bring All to Front']);
 await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.find(item=>item.label==='Window').submenu.items.find(item=>item.label==='Show Main Window').click());
 assert.deepEqual((await app.evaluate(()=>globalThis.offscreenEvidence.blocked)).slice(blockedAtClose),['window.show','window.show','window.show']);
 report.checks.push('BrowserWindow.close() on the main window keeps it alive and hidden (renderer live); the tray Show App, app "activate" and Window > Show Main Window each ask to show it (stopped at the adapter)');
 // Fidelity F04 (titlebar-window-02): the native context menu (_W). A real right-click in the composer reaches
 // webContents "context-menu" as an editable target (sidebar-chrome checks that React-menu rows never do); the hidden
 // offscreen window gets no native popup, so the template is read by stubbing popup on a window reported visible.
 step('context-menu');await app.evaluate(({BrowserWindow})=>{globalThis.__contextParams=[];BrowserWindow.getAllWindows()[0].webContents.on('context-menu',(_e,p)=>globalThis.__contextParams.push({isEditable:p.isEditable,canPaste:p.editFlags.canPaste}));});
 const composerBox=await page.locator('[data-cds="ChatComposerEditor"]').boundingBox();await page.mouse.click(composerBox.x+20,composerBox.y+composerBox.height/2,{button:'right'});
 await poll(async()=>(await app.evaluate(()=>globalThis.__contextParams.length))===1,'composer context-menu event');
 assert.equal((await app.evaluate(()=>globalThis.__contextParams[0])).isEditable,true);
 const nativeMenu=(params)=>app.evaluate(({BrowserWindow,Menu},params)=>{const w=BrowserWindow.getAllWindows()[0],popup=Menu.prototype.popup,shown=[];
  Menu.prototype.popup=function(options){shown.push({items:this.items.map(item=>item.type==='separator'?'---':[item.label,item.role?String(item.role).toLowerCase():null,item.enabled]),x:options.x,y:options.y,window:options.window===w});};
  w.isVisible=()=>true;try{w.webContents.emit('context-menu',{preventDefault(){}},{x:30,y:40,linkURL:'',srcURL:'',mediaType:'none',hasImageContents:false,isEditable:false,selectionText:'',misspelledWord:'',dictionarySuggestions:[],editFlags:{canUndo:false,canRedo:false,canCut:false,canCopy:false,canPaste:false,canSelectAll:false},...params});}
  finally{Menu.prototype.popup=popup;delete w.isVisible;}return shown;},params);
 const editable=await nativeMenu({isEditable:true,misspelledWord:'teh',dictionarySuggestions:['the'],editFlags:{canUndo:true,canRedo:false,canCut:true,canCopy:true,canPaste:true,canSelectAll:true}});
 assert.equal(editable.length,1);assert.deepEqual([editable[0].x,editable[0].y,editable[0].window],[30,40,true]);
 assert.deepEqual(editable[0].items,[['the',null,true],'---',['Learn Spelling',null,true],'---',['Undo','undo',true],['Redo','redo',false],'---',['Cut','cut',true],['Copy','copy',true],['Paste','paste',true],'---',['Select All','selectall',true],'---',['Inspect Element',null,true]]);
 const link=await nativeMenu({linkURL:'https://example.invalid/',selectionText:'example',editFlags:{canCopy:true,canSelectAll:true}});
 assert.deepEqual(link[0].items.map(item=>item==='---'?item:item[0]),['Look Up','---','Open Link in Default Browser','Copy Link Address','---','Copy','---','Select All','---','Inspect Element']);
 const script=await nativeMenu({linkURL:'javascript:void(0)'});assert.deepEqual(script[0].items.slice(0,2).map(item=>item==='---'?item:item[0]),['Copy Link Address','---']);
 report.metrics.contextMenu={editable:editable[0].items,link:link[0].items};
 report.checks.push('The composer right-click reaches webContents context-menu as editable; the _W template (spelling, Learn Spelling, Undo/Redo, Cut/Copy/Paste from editFlags, Select All, Inspect Element when unpackaged; Look Up and Open Link only for http(s)) pops up at the click point over the main window; a hidden window shows nothing');
 // Fidelity F14 (on purpose): c71860c77-B72Ova_w It lists version, Run on startup, Menu bar and Storage; the Code page's
 // keep-awake rows are no longer repeated here, and three skeleton rows stand in until the desktop snapshot arrives.
 step('settings-row');await openGeneral();await settings().getByRole('switch',{name:'Run on startup',exact:true}).waitFor();await settings().locator('.ss-version').waitFor();assert.equal(await settings().locator('[data-settings-skeleton]').count(),0);const order=await settings().locator('[data-setting-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.settingId));report.metrics.generalOrder=order;
 assert.deepEqual(order,['version','startup','menuBarEnabled','storage'],'source order');
 await settings().getByText('Show OpenClaude Desktop in the menu bar.',{exact:true}).waitFor();assert.equal(await menuSwitch().getAttribute('aria-checked'),'true');await shot('menu-bar-general');
 report.checks.push('General shows version, Run on startup, Menu bar (checked by default, adapted source description) and Storage, with no duplicated keep-awake rows');
 step('toggle-off');await menuSwitch().click();await poll(async()=>(await read('preferences.json')).menuBarEnabled===false,'disabled saved');await poll(async()=>(await live()).length===0,'tray destroyed');
 // Main persists and updates the tray before its IPC reply reaches the renderer.
 await poll(async()=>await menuSwitch().getAttribute('aria-checked')==='false','switch reflects saved off');assert.equal(await menuSwitch().evaluate(n=>n===document.activeElement),true);
 step('toggle-on');await menuSwitch().press('Space');await poll(async()=>(await read('preferences.json')).menuBarEnabled===true,'enabled saved');await poll(async()=>(await live()).length===1,'tray recreated');assert.equal((await trays()).length,2);await poll(async()=>await menuSwitch().getAttribute('aria-checked')==='true','switch reflects saved on');
 report.checks.push('The real switch writes menuBarEnabled to isolated preferences, destroys the tray when off and creates a fresh one when turned back on by keyboard');
 // HANDOFF 0.2.120 (same mechanism as 0.2.119 settings-complete): before useModalPresence's first rAF commits data-open='true' there is no
 // transition, so getAnimations().every(finished) is vacuously true; filling then races SettingsContent's mount rAF root.focus() (source-settings.jsx:141),
 // which blurs the search and onBlur closeSearch clears it (offscreen-settings-race-probe: 3/3 deterministic). Wait for entered first.
 step('search');await page.keyboard.press('Escape');await settings().waitFor({state:'detached'});await page.keyboard.press('Meta+,');await settings().waitFor();await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.dataset.open==='true');await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.getAnimations().every(a=>a.playState==='finished'));const search=settings().getByRole('textbox',{name:'Search settings',exact:true});await search.fill('menu bar');assert.equal(await search.inputValue(),'menu bar');
 await settings().getByRole('button',{name:'Menu bar in System',exact:true}).click();await menuSwitch().waitFor();
 report.checks.push('Settings search finds Menu bar in System (the This computer › System page, B23) and navigates to the row');
 step('dark-narrow');await settings().getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'General',exact:true}).click();await settings().getByRole('radio',{name:'Dark',exact:true}).click();await poll(async()=>(await read('preferences.json')).theme==='dark','dark saved');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await settings().getByRole('tab',{name:'System',exact:true}).click();await menuSwitch().scrollIntoViewIfNeeded();
 assert.equal(await settings().evaluate(n=>n.scrollWidth<=n.clientWidth),true);await shot('menu-bar-dark-narrow');
 step('persist-off');await menuSwitch().click();await poll(async()=>(await read('preferences.json')).menuBarEnabled===false,'disabled saved again');await app.close();app=null;
 await launch();
 // Fidelity F04 (titlebar-window-06): Sbe persisted the 760x768 window at quit; the relaunch restores it (within the
 // work area) with the source's 600x400 minimum. The rest of the suite then returns to the 1200x800 default size,
 // where Settings shows its side navigation again (it uses tabs at 760).
 step('window-state');const savedState=await read('window-state.json');report.metrics.windowState=savedState;
 assert.deepEqual([savedState.width,savedState.height,savedState.isMaximized,savedState.isFullScreen],[760,768,false,false]);
 const restored=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows()[0];return {bounds:w.getBounds(),min:w.getMinimumSize(),workArea:screen.getDisplayMatching(w.getBounds()).workArea};});report.metrics.restoredWindow=restored;
 // Ebe/Iye: the saved frame is placed inside the work area of its (still present) display.
 const wa=restored.workArea,clamp=(value,start,room)=>Math.min(Math.max(value,start),start+Math.max(0,room));
 assert.deepEqual([restored.bounds.width,restored.bounds.height,restored.bounds.x,restored.bounds.y],[760,768,clamp(savedState.x,wa.x,wa.width-760),clamp(savedState.y,wa.y,wa.height-768)]);assert.deepEqual(restored.min,[600,400]);
 await poll(()=>page.evaluate(()=>innerWidth===760&&innerHeight===768),'renderer at the restored 760x768');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1200,800));await poll(()=>page.evaluate(()=>innerWidth===1200),'back to 1200');
 report.checks.push('The 760x768 frame is written to userData/window-state.json at quit and restored on relaunch inside the display work area (Ebe/Iye); the window minimum is 600x400');
 step('persist-off-relaunched');await page.waitForTimeout(300);assert.deepEqual(await trays(),[]);await openGeneral();assert.equal(await menuSwitch().getAttribute('aria-checked'),'false');
 report.checks.push('A saved off preference survives restart: no tray is created and the switch reads off');
 step('quit-item');await menuSwitch().click();await poll(async()=>(await live()).length===1,'tray for quit');await poll(async()=>(await read('preferences.json')).menuBarEnabled===true,'enabled for quit');menu=await rightClick();assert.equal(labels(menu).at(-1),'Quit OpenClaude Desktop');
 // Clicking it would end the app before the offscreen runner records its boundary evidence; Quit -> app.quit wiring is unit-tested.
 report.checks.push('After re-enabling in the restarted app the tray menu ends with Quit OpenClaude Desktop');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.requestCounts=Object.fromEntries(['account/read','account/rateLimits/read'].map(m=>[m,0]));for(const r of await requests())if(r.method in report.requestCounts)report.requestCounts[r.method]++;report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'menu-bar-ui-report.json'),bytes);console.log(bytes);}
