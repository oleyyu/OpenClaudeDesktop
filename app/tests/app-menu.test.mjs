import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import path from 'node:path';
import appMenu from '../electron/app-menu.cjs';
const {appMenuTemplate,sidebarCollapsedPatch,navigationState,menuState,sameMenuState,closeAction,activateAction,rendererOwned}=appMenu;
const menu=(template,label)=>template.find(item=>item.label===label).submenu;
const view=template=>menu(template,'View');
const shape=items=>items.map(item=>item.type==='separator'?'---':item.role&&!item.label?item.role:item.label);
// A menu click that fired through the item's own accelerator with ⌘ held (RZ's qxr(e,"cmd")).
const viaAccelerator={triggeredByAccelerator:true,metaKey:true};
const PANES={panes:{changes:{enabled:true,open:false},files:{enabled:true,open:true}},closePane:{enabled:true}};

test('sidebarCollapsed persists only real booleans (shared-2 Zm collapsed beside sidebarWidth)',()=>{
 assert.deepEqual(sidebarCollapsedPatch({sidebarCollapsed:true}),{sidebarCollapsed:true});
 assert.deepEqual(sidebarCollapsedPatch({sidebarCollapsed:false}),{sidebarCollapsed:false});
 for(const value of ['yes',1,0,null,undefined,{},'true'])assert.deepEqual(sidebarCollapsedPatch({sidebarCollapsed:value}),{});
 assert.deepEqual(sidebarCollapsedPatch({sidebarWidth:300}),{});
 assert.deepEqual(sidebarCollapsedPatch(undefined),{});
});

test('menu bar follows ANr: App, File, Edit, View, Go, Window, Help',()=>{
 const template=appMenuTemplate({sidebarOpen:true,emit:()=>{}});
 assert.deepEqual(template.map(item=>item.label||item.role),['OpenClaude Desktop','File','Edit','View','Go','Window','Help']);
 assert.deepEqual([template[5].role,template[6].role],['window','help']);
 assert.equal(template.some(item=>item.role==='editMenu'||item.role==='windowMenu'),false,'explicit Edit and Window submenus');
});

test('App submenu follows Gtr: About, Settings…, Services, Hide / Hide Others / Show All, Quit',()=>{
 const events=[];const items=menu(appMenuTemplate({sidebarOpen:true,emit:e=>events.push(e)}),'OpenClaude Desktop');
 assert.deepEqual(shape(items),['about','---','Settings…','---','services','---','hide','hideOthers','unhide','---','quit']);
 const settings=items.find(item=>item.label==='Settings…');assert.equal(settings.accelerator,'CommandOrControl+,');
 settings.click();settings.click({},null,viaAccelerator);
 assert.deepEqual(events,[{kind:'open-settings'},{kind:'open-settings'}],'Settings… always navigates (KK, not RZ)');
});

test('File follows lwr/nwr: New Session, New Window, Open File…, Open Folder…, then ⌘W Close Pane or Close Window (Home: no session view)',()=>{
 const events=[];const emit=e=>events.push(e);
 const plain=menu(appMenuTemplate({sidebarOpen:true,emit}),'File');
 assert.deepEqual(shape(plain),['New Session','New Session with Current Settings','New Window','---','Open File…','Open Folder…','---','Close Window','Close Window']);
 assert.deepEqual(plain.filter(item=>item.label).map(item=>[item.label,item.accelerator,item.role,item.visible,item.acceleratorWorksWhenHidden]),[
  ['New Session','CmdOrCtrl+N',undefined,undefined,undefined],['New Session with Current Settings','CmdOrCtrl+Shift+N',undefined,undefined,undefined],['New Window',undefined,undefined,undefined,undefined],['Open File…','CmdOrCtrl+O',undefined,undefined,undefined],['Open Folder…','CmdOrCtrl+Shift+O',undefined,undefined,undefined],
  ['Close Window','CmdOrCtrl+W','close',undefined,undefined],['Close Window','CmdOrCtrl+Shift+W','close',false,true]]);
 const pane=menu(appMenuTemplate({sidebarOpen:true,menuState:menuState(PANES),emit}),'File');
 assert.deepEqual(pane.slice(7).map(item=>[item.label,item.accelerator,item.role,item.visible]),[['Close Pane','CmdOrCtrl+W',undefined,undefined],['Close Window','CmdOrCtrl+Shift+W','close',undefined]]);
 for(const item of [plain[0],plain[1],plain[2],plain[4],plain[5],pane[7]])item.click();
 assert.deepEqual(events,[{kind:'new-session'},{kind:'new-session-current'},{kind:'new-window'},{kind:'open-file'},{kind:'open-folder'},{kind:'close-pane'}]);
 for(const label of ['Reopen Closed Session'])assert.equal(pane.some(item=>item.label===label),false,label);
});

// iwr: 'Close Session' (xdFFXdcjAb) while a session view shows, with Close Window on ⌘⇧W; rwr: Reopen Closed
// Session (t77UbkPnXg) only while available, enabled from the report; owr: ⌘W itself belongs to the renderer.
test('File with a session view: Close Session ⌘W, Close Window ⇧⌘W, then Reopen Closed Session ⇧⌘T (iwr/rwr/owr)',()=>{
 const events=[],targets=[];const emit=(e,window)=>{events.push(e);targets.push(window);};
 const file=state=>menu(appMenuTemplate({sidebarOpen:true,menuState:menuState(state),emit}),'File');
 const open=file({...PANES,session:{open:true},reopenClosed:{available:true,enabled:true}});
assert.deepEqual(shape(open),['New Session','New Session with Current Settings','New Window','---','Open File…','Open Folder…','---','Close Session','Close Window','Reopen Closed Session']);
 assert.deepEqual(open.slice(7).map(item=>[item.label,item.accelerator,item.role,item.visible,item.registerAccelerator,item.enabled]),[
  ['Close Session','CmdOrCtrl+W',undefined,undefined,undefined,undefined],['Close Window','CmdOrCtrl+Shift+W','close',undefined,undefined,undefined],
  ['Reopen Closed Session','CmdOrCtrl+Shift+T',undefined,undefined,true,true]]);
 const target={id:'main'};
 open[7].click({},target);open[7].click({},target,viaAccelerator);open[9].click({},target);open[9].click({},target,viaAccelerator);
 assert.deepEqual(events,[{kind:'close-session'},{kind:'close-session',accelerator:true},{kind:'reopen-closed'}],'a ⌘W/⇧⌘T that reached the menu is marked or dropped (RZ)');
 assert.deepEqual(targets,[target,target,target]);
 // A session view without a closable pane still reads Close Session; the reopen item follows enabled.
 const disabled=file({session:{open:true},reopenClosed:{available:true,enabled:false}});
 assert.deepEqual(shape(disabled.slice(7)),['Close Session','Close Window','Reopen Closed Session']);assert.equal(disabled[9].enabled,false);
 // Home: the original Close Window pair, Reopen still listed while available.
 const home=file({reopenClosed:{available:true,enabled:true}});
 assert.deepEqual(home.slice(7).map(item=>[item.label,item.accelerator,item.role,item.visible]),[['Close Window','CmdOrCtrl+W','close',undefined],['Close Window','CmdOrCtrl+Shift+W','close',false],['Reopen Closed Session','CmdOrCtrl+Shift+T',undefined,undefined]]);
 // Home with a pane: Close Pane; unavailable reopen is omitted entirely (rwr returns []).
 assert.deepEqual(shape(file({...PANES,reopenClosed:{available:false,enabled:true}}).slice(7)),['Close Pane','Close Window']);
});

test('Edit follows FSr("mac") in place of the editMenu role, then ISr\'s Find submenu',()=>{
 const items=menu(appMenuTemplate({sidebarOpen:true,emit:()=>{}}),'Edit');
 assert.deepEqual(items.map(item=>item.type==='separator'?'---':[item.label,item.accelerator,item.role,item.visible]),[
  ['Undo','CmdOrCtrl+Z','undo',undefined],['Redo','CmdOrCtrl+Shift+Z','redo',undefined],'---',['Cut','CmdOrCtrl+X','cut',undefined],['Copy','CmdOrCtrl+C','copy',undefined],
  ['Paste','CmdOrCtrl+V','paste',undefined],['Paste and Match Style','CmdOrCtrl+Alt+Shift+V','pasteAndMatchStyle',undefined],['Paste and Match Style','CmdOrCtrl+Shift+V','pasteAndMatchStyle',false],
  ['Delete',undefined,'delete',undefined],['Select All','CmdOrCtrl+A','selectAll',undefined],'---',['Find',undefined,undefined,undefined]]);
 assert.equal(items[7].acceleratorWorksWhenHidden,true);
});

test('Edit ends with ISr Find: Find… / Find Next / Find Previous emit find-open and find-step to the renderer',()=>{
 const events=[],windows=[];const target={id:'main'};
 const items=menu(appMenuTemplate({sidebarOpen:true,emit:(e,window)=>{events.push(e);windows.push(window);}}),'Edit');
 assert.deepEqual(items.at(-2),{type:'separator'});
 const find=items.at(-1);assert.equal(find.label,'Find');
 assert.deepEqual(find.submenu.slice(0,3).map(item=>[item.label,item.accelerator,item.registerAccelerator]),[
  ['Find…','CmdOrCtrl+F',false],['Find Next','CmdOrCtrl+G',false],['Find Previous','CmdOrCtrl+Shift+G',false]]);
 for(const item of find.submenu.slice(0,3))item.click({},target);
 // A click through a (shown, unregistered) accelerator still dispatches: the renderer owns the keys themselves.
 find.submenu[1].click({},target,viaAccelerator);
 assert.deepEqual(events,[{kind:'find-open'},{kind:'find-step',forward:true},{kind:'find-step',forward:false},{kind:'find-step',forward:true}]);
 assert.deepEqual(windows,[target,target,target,target]);
 assert.deepEqual(find.submenu[3],{type:'separator'});
 assert.equal(find.submenu[4].label,'Find in Files…');assert.equal(find.submenu[4].enabled,false);
 const enabled=menu(appMenuTemplate({sidebarOpen:true,menuState:menuState({findInFiles:{enabled:true}}),emit:(e,w)=>{events.push(e);windows.push(w);}}),'Edit').at(-1).submenu.at(-1);
 assert.equal(enabled.enabled,true);assert.equal(enabled.accelerator,undefined);enabled.click({},target);assert.deepEqual(events.at(-1),{kind:'find-in-files'});assert.equal(windows.at(-1),target);
 assert.equal(sameMenuState(menuState(),menuState({findInFiles:{enabled:true}})),false);
});

test('View follows pNr: sidebar item first, bNr pane items and Close Pane, dNr zoom, Reload, devtools only unpackaged, full screen',()=>{
 const events=[];const emit=e=>events.push(e);
 const open=view(appMenuTemplate({sidebarOpen:true,allowDevTools:true,emit})),closed=view(appMenuTemplate({sidebarOpen:false,emit}));
 // _Nr opens with Command Palette… (⌘K toggles the palette), then the sidebar item.
 assert.equal(open[0].label,'Command Palette…');assert.equal(open[0].accelerator,'CmdOrCtrl+K');
 assert.equal(open[1].label,'Hide Sidebar');assert.equal(closed[1].label,'Show Sidebar');
 for(const items of [open,closed]){
  assert.equal(items[1].accelerator,'CmdOrCtrl+B');assert.equal(items[1].type,undefined);assert.equal('checked' in items[1],false);
  assert.deepEqual(items[2],{type:'separator'});
  for(const role of ['resetZoom','zoomIn','zoomOut','togglefullscreen'])assert.equal(items.some(item=>item.role===role),false,role);
 }
 assert.deepEqual(shape(open.slice(3)),['Show Changes','Show Files','Close Pane','---','Split View','---','Actual Size','Zoom In','Zoom In (indie cooler version)','Zoom Out','Zoom In (numpad)','Zoom Out (numpad)','Actual Size (numpad)','---','reload','toggleDevTools','---','Enter Full Screen']);
 assert.equal(closed.some(item=>item.role==='toggleDevTools'),false,'no Toggle Developer Tools in a packaged build');
 assert.deepEqual(open.at(-1).accelerator,'Control+Command+F');
 assert.equal(view(appMenuTemplate({sidebarOpen:true,fullScreen:true,emit})).at(-1).label,'Exit Full Screen');
 open[1].click();closed[1].click();open.at(-1).click();open[0].click();open[0].click({},null,viaAccelerator);
 assert.deepEqual(events,[{kind:'toggle-sidebar'},{kind:'toggle-sidebar'},{kind:'toggle-full-screen'},{kind:'open-search',toggle:true}],'⌘K through the accelerator is the renderer’s');
});

test('View pane items in bNr order: Terminal, Changes, Preview, Files, Side Chat (⌘;), Close Pane',()=>{
 const all={panes:{changes:{enabled:true,open:false},files:{enabled:true,open:false},terminal:{enabled:true,open:true},preview:{enabled:true,open:false},sideChat:{enabled:true,open:true}},closePane:{enabled:true}};
 const events=[];const items=view(appMenuTemplate({sidebarOpen:true,menuState:menuState(all),emit:e=>events.push(e)})).slice(3,9);
 assert.deepEqual(items.map(item=>[item.label,item.accelerator]),[['Hide Terminal','Command+J'],['Show Changes','CmdOrCtrl+Shift+D'],['Show Preview','CmdOrCtrl+Shift+P'],['Show Files','CmdOrCtrl+Shift+F'],['Hide Side Chat','CmdOrCtrl+;'],['Close Pane','CmdOrCtrl+\\']]);
 items[4].click();
 assert.deepEqual(events,[{kind:'toggle-pane',pane:'sideChat'}]);
 // A core without side questions reports no sideChat: no row.
 const { sideChat, ...panes } = all.panes;
 assert.equal(view(appMenuTemplate({sidebarOpen:true,menuState:menuState({...all,panes}),emit:()=>{}})).some(item=>/Side Chat/.test(item.label||'')),false);
});

test('View pane items follow bNr/gNr: Hide only while enabled and open, enabled from menu-state, RZ clicks',()=>{
 const items=state=>view(appMenuTemplate({sidebarOpen:true,menuState:menuState(state),emit:()=>{}})).slice(3,6);
 assert.deepEqual(items(undefined).map(item=>[item.label,item.accelerator,item.enabled,item.registerAccelerator]),[
  ['Show Changes','CmdOrCtrl+Shift+D',false,undefined],['Show Files','CmdOrCtrl+Shift+F',false,undefined],['Close Pane','CmdOrCtrl+\\',false,undefined]]);
 assert.deepEqual(items(PANES).map(item=>[item.label,item.enabled]),[['Show Changes',true],['Hide Files',true],['Close Pane',true]]);
 // gNr labels by `enabled && open`: an unavailable pane never reads Hide.
 assert.deepEqual(items({panes:{changes:{enabled:false,open:true},files:{enabled:true,open:true}}}).map(item=>item.label),['Show Changes','Hide Files','Close Pane']);
 const events=[];const live=view(appMenuTemplate({sidebarOpen:true,menuState:menuState(PANES),emit:e=>events.push(e)})).slice(3,6);
 for(const item of live){item.click();item.click({},null,viaAccelerator);}
 assert.deepEqual(events,[{kind:'toggle-pane',pane:'changes'},{kind:'toggle-pane',pane:'files'},{kind:'close-pane'}],'the renderer owns the chord when the accelerator fired');
});

test('View zoom items follow index.chunk-ChZ67Jhw.js dNr: Actual Size only while zoomed, hidden =/numpad twins, {kind:"zoom"} clicks',()=>{
 for(const zoomed of [false,true]){
  const events=[];const items=view(appMenuTemplate({sidebarOpen:true,zoomed,emit:e=>events.push(e)}));
  const zoom=items.filter(item=>/Zoom|Actual Size/.test(item.label||''));
  assert.deepEqual(zoom.map(item=>[item.label,item.accelerator,item.id,item.visible,item.acceleratorWorksWhenHidden,item.enabled]),[
   ['Actual Size','CmdOrCtrl+0','actual-size',undefined,undefined,zoomed],
   // 2.42304.0 yPi: the visible Zoom In / Zoom Out carry ids and _Pi() / vPi() (no level: enabled); see r4e-zoom-menu.test.mjs.
   ['Zoom In','CmdOrCtrl+Plus','zoom-in',undefined,undefined,true],
   ['Zoom In (indie cooler version)','CmdOrCtrl+=',undefined,false,true,undefined],
   ['Zoom Out','CmdOrCtrl+-','zoom-out',undefined,undefined,true],
   ['Zoom In (numpad)','CmdOrCtrl+numadd',undefined,false,true,undefined],
   ['Zoom Out (numpad)','CmdOrCtrl+numsub',undefined,false,true,undefined],
   ['Actual Size (numpad)','CmdOrCtrl+num0','actual-size-numpad',false,true,zoomed]]);
  for(const item of zoom)item.click();
  assert.deepEqual(events,[{kind:'zoom',reset:true},{kind:'zoom',delta:.5},{kind:'zoom',delta:.5},{kind:'zoom',delta:-.5},{kind:'zoom',delta:.5},{kind:'zoom',delta:-.5},{kind:'zoom',reset:true}]);
 }
 // Without a zoom state the menu starts at actual size.
 assert.equal(view(appMenuTemplate({sidebarOpen:true,emit:()=>{}})).find(item=>item.id==='actual-size').enabled,false);
});

const go=template=>menu(template,'Go');
test('Go menu follows gyr/Cyr + Swr: Back/Forward twins, Previous/Next Session, Search…',()=>{
 for(const [canGoBack,canGoForward] of [[false,false],[true,false],[false,true],[true,true]]){
  const events=[];const items=go(appMenuTemplate({sidebarOpen:true,canGoBack,canGoForward,emit:e=>events.push(e)}));
  assert.equal(items.length,9);
  assert.deepEqual(items.map(item=>item.type==='separator'?'---':[item.label,item.accelerator,item.id,item.visible,item.registerAccelerator,item.enabled]),[
   ['Back','Command+[',undefined,false,undefined,undefined],
   ['Back','Command+[','go-back',undefined,false,canGoBack],
   ['Forward','Command+]',undefined,false,undefined,undefined],
   ['Forward','Command+]','go-forward',undefined,false,canGoForward],
   '---',
   ['Previous Session','Command+Shift+[',undefined,undefined,undefined,undefined],
   ['Next Session','Command+Shift+]',undefined,undefined,undefined,undefined],
   '---',
   ['Search…','Command+Shift+K',undefined,undefined,undefined,undefined]]);
  for(const item of items)item.click?.();
  assert.deepEqual(events,[{kind:'navigate',delta:-1},{kind:'navigate',delta:-1},{kind:'navigate',delta:1},{kind:'navigate',delta:1},
   {kind:'cycle-session',delta:-1},{kind:'cycle-session',delta:1},{kind:'open-search'}]);
  // RZ: ⌘⇧[ / ⌘⇧] / ⌘⇧K reaching the menu itself are the renderer's chords; nothing is re-dispatched.
  for(const item of items.slice(5))item.click?.({},null,viaAccelerator);
  assert.equal(events.length,7);
 }
 // Without navigation state both directions start unavailable (local history [null]).
 const initial=go(appMenuTemplate({sidebarOpen:false,emit:()=>{}}));
 assert.deepEqual([initial[1].enabled,initial[3].enabled],[false,false]);
});

test('Window follows kNr and Help follows Djr without the Anthropic web items',()=>{
 const events=[];const template=appMenuTemplate({sidebarOpen:true,emit:e=>events.push(e)});
 const windowItems=menu(template,'Window'),help=menu(template,'Help');
 assert.deepEqual(windowItems.map(item=>item.type==='separator'?'---':[item.role,item.label]),[['minimize','Minimize'],['zoom','Zoom'],'---',[undefined,'Show Main Window'],'---',['front','Bring All to Front']]);
 assert.deepEqual(shape(help),['Keyboard Shortcuts','---','Troubleshooting']);
 assert.equal(help[0].accelerator,'CmdOrCtrl+/');
 assert.deepEqual(shape(help[2].submenu),['Show Logs in Finder']);
 windowItems[3].click();help[0].click();help[0].click({},null,viaAccelerator);help[2].submenu[0].click();
 assert.deepEqual(events,[{kind:'show-main-window'},{kind:'open-shortcuts'},{kind:'show-logs'}]);
 for(const label of ['Claude Help','Get Support'])assert.equal(help.some(item=>item.label===label),false,label);
});

test('rendererOwned is RZ’s accelerator-with-⌘ test',()=>{
 assert.equal(rendererOwned(viaAccelerator),true);
 for(const event of [undefined,{},{triggeredByAccelerator:true},{triggeredByAccelerator:false,metaKey:true},{triggeredByAccelerator:true,metaKey:false}])assert.equal(rendererOwned(event),false);
});

test('navigation-state payload keeps only real true flags (Syr {canGoBack, canGoForward})',()=>{
 assert.deepEqual(navigationState({canGoBack:true,canGoForward:false}),{canGoBack:true,canGoForward:false});
 assert.deepEqual(navigationState({canGoBack:false,canGoForward:true}),{canGoBack:false,canGoForward:true});
 for(const value of ['true',1,null,undefined,{}])assert.deepEqual(navigationState({canGoBack:value,canGoForward:value}),{canGoBack:false,canGoForward:false});
 assert.deepEqual(navigationState(undefined),{canGoBack:false,canGoForward:false});
});

test('menu-state payload keeps only real true flags and compares by value (vSr/_Sr)',()=>{
 const none={panes:{changes:{enabled:false,open:false},files:{enabled:false,open:false}},closePane:{enabled:false},session:{open:false},reopenClosed:{available:false,enabled:false}};
 assert.deepEqual(menuState(undefined),none);
 assert.deepEqual(menuState({panes:{changes:{enabled:'true',open:1},files:{enabled:true}},closePane:{enabled:{}}}),{...none,panes:{...none.panes,files:{enabled:true,open:false}}});
 assert.deepEqual(menuState({...PANES,extra:1}),{...PANES,session:none.session,reopenClosed:none.reopenClosed});
 assert.deepEqual(menuState({session:{open:'yes'},reopenClosed:{available:true,enabled:1}}),{...none,reopenClosed:{available:true,enabled:false}});
 assert.equal(sameMenuState(PANES,JSON.parse(JSON.stringify(PANES))),true);
 assert.equal(sameMenuState(PANES,{...PANES,closePane:{enabled:false}}),false);
 assert.equal(sameMenuState(PANES,{...PANES,session:{open:true}}),false);
 assert.equal(sameMenuState({reopenClosed:{available:true,enabled:false}},{reopenClosed:{available:true,enabled:true}}),false);
 assert.equal(sameMenuState(undefined,none),true);
});

test('closeAction: only a quit closes the main window; otherwise it hides, leaving full screen first',()=>{
 assert.equal(closeAction({quitting:true,fullScreen:false}),'close');
 assert.equal(closeAction({quitting:true,fullScreen:true}),'close');
 assert.equal(closeAction({quitting:false,fullScreen:false}),'hide');
 assert.equal(closeAction({quitting:false,fullScreen:true}),'leave-full-screen');
});

test('activateAction: recreate, restore only when nothing is visible, show a hidden window',()=>{
 assert.equal(activateAction({exists:false}),'create');
 assert.equal(activateAction({exists:true,minimized:true,visible:false,hasVisibleWindows:false}),'restore');
 assert.equal(activateAction({exists:true,minimized:true,visible:false,hasVisibleWindows:true}),null);
 assert.equal(activateAction({exists:true,minimized:false,visible:false,hasVisibleWindows:false}),'show');
 assert.equal(activateAction({exists:true,minimized:false,visible:true,hasVisibleWindows:true}),null);
});

test('main.cjs wires the lifecycle: before-quit before the shutdown handler, a no-op window-all-closed, activate, 600x400 minimum',()=>{
 const main=readFileSync(path.resolve(import.meta.dirname,'../electron/main.cjs'),'utf8');
 // Autosave and dirty-file guards run before the quit guard in the shutdown handler; quitting is set only once shutdown starts,
 // so a quit the guard holds or the user cancels keeps the window's close-hides behavior.
 const shutdown=main.indexOf('installShutdownHandler(app, {');
 assert.ok(shutdown>0);
 assert.match(main.slice(shutdown),/^installShutdownHandler\(app, \{\s*guard: \(event\) => \{\s*if \(fileAutosaveQuitGate\.handle\(event\)\) return true;[\s\S]*?return quitGuard\.handle\(event\);\s*\},\s*onStart: \(\) => \{ quitting = true; try \{ savePopoutsForRelaunch\(\); \}/);
 assert.doesNotMatch(main,/app\.on\("before-quit"/,'no listener marks a held quit as quitting');
 assert.match(main,/app\.on\("window-all-closed", \(\) => \{\}\);/);
 assert.doesNotMatch(main,/app\.quit\(\);\s*\}\);\s*menuBar = createMenuBar/,'closing the main window no longer quits');
 assert.match(main,/app\.on\("activate", \(_event, hasVisibleWindows\) => \{/);
 assert.match(main,/const action = closeAction\(\{ quitting, fullScreen: window\.isFullScreen\(\) \}\);/);
 assert.match(main,/minWidth: 600,\s*minHeight: 400,/);
 assert.match(main,/attachContextMenu\(window\);[\s\S]*attachContextMenu\(window\);/,'main window and pane windows get the native context menu');
});

test('File › New Window is disabled at the window limit, with the reason as its tooltip (never a silent no-op)',()=>{
 const item=(newWindow)=>menu(appMenuTemplate({sidebarOpen:true,newWindow,emit:()=>{}}),'File').find(entry=>entry.label==='New Window');
 assert.equal(item(undefined).enabled,true);assert.equal(item(undefined).toolTip,undefined);
 assert.equal(item(true).enabled,true);
 assert.equal(item(false).enabled,false);assert.equal(item(false).toolTip,'Close a window before opening another.');
});
