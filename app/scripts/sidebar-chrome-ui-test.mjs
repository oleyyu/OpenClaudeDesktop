import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Sidebar chrome end to end: sidebar-main.js:14680 Vf("toggle_sidebar") cmd+b,
// sidebar-groups.js hw "Hide sidebar" (5320) / Nb "Show sidebar" (2685) CDS
// tooltips with the cmd+b shortcut, shared-2 Zm {collapsed, sidebarWidth}
// persistence, and index.chunk-ChZ67Jhw.js _Nr/gNr View > Hide/Show Sidebar
// (CmdOrCtrl+B), and code-mode bucket truncation at 20 rows with the source
// "Show {count} more" row. Back/Forward: sidebar-session.js:10732-10800 qM
// (aria-disabled, tooltipSide bottom, cmd+[ / cmd+]), sidebar-groups.js:2774-2840
// Ib collapsed chrome (df-collapsed-nav), index.chunk-D6ATlqeD.js gyr/Cyr/Syr Go
// menu. Tooltips/keyboard (0.2.114): sidebar-rows.js qD truncated-label tooltip
// (7675-7729), JD More (7730-7750), eO onKeyDown (7915-7962), sidebar-main.js lI
// Filter (12290-12350), c360a9e1c-GPs-MV9u.js mm/Fp titlebar Zt tooltips.
// Real main/preload/IPC with the isolated protocol fixture.
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'sidebar-chrome-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});
const now=Math.floor(Date.now()/1000),ids=['sidebar-chrome-A','sidebar-chrome-B','sidebar-chrome-C','sidebar-chrome-D'];
const LONG='Chrome session D with a deliberately long title that the 288px sidebar row has to truncate';
const thread=(id,name,age)=>({id,name,cwd:workspace,createdAt:now-age,updatedAt:now-age,archived:false,turns:[{id:id+'-turn-0',status:'completed',items:[{id:id+'-user-0',type:'userMessage',content:[{type:'text',text:'Seeded prompt.',text_elements:[]}]},{id:id+'-answer-0',type:'agentMessage',text:'Seeded answer.'}]}]});
// No sidebarCollapsed key: an existing profile starts expanded (Zm collapsed:false).
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:ids,sidebarWidth:288,displayName:'Fixture'}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:Object.fromEntries(ids.map((id,i)=>[id,thread(id,i<3?'Chrome session '+'ABC'[i]:LONG,i*10)]))}));
const read=async name=>JSON.parse(await fs.readFile(path.join(profile,name),'utf8'));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/main.jsx','src/source-sidebar.jsx','src/source-titlebar.jsx','src/code-ui.jsx','electron/main.cjs','electron/app-menu.cjs'])assert.ok(build.sources.some(entry=>entry.path===required),'build identifies '+required);
 const h=sha(await fs.readFile(path.join(root,'scripts/sidebar-chrome-ui-test.mjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('SIDEBAR-CHROME '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const composer=()=>page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
const hideButton=()=>page.getByRole('button',{name:'Hide sidebar',exact:true}),showButton=()=>page.getByRole('button',{name:'Show sidebar',exact:true});
const row=id=>page.locator(`[data-source-session-id="${id}"] [data-row-main-button]`);
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 await composer().waitFor();await row(ids[0]).waitFor({state:'attached'});}
const collapsedClass=()=>page.evaluate(()=>document.querySelector('.dframe-root').classList.contains('sidebar-collapsed'));
const saved=async()=>(await read('preferences.json')).sidebarCollapsed;
// View opens with Command Palette… (CmdOrCtrl+K), then the sidebar item (app-menu.cjs viewMenuItems).
const viewMenu=()=>app.evaluate(({Menu})=>{const items=Menu.getApplicationMenu().items.find(item=>item.label==='View').submenu.items;return {palette:[items[0].label,items[0].accelerator],label:items[1].label,accelerator:items[1].accelerator,type:items[1].type,next:items[2].type,roles:items.slice(3).map(item=>item.type==='separator'?'---':item.role?String(item.role).toLowerCase():item.label)};});
const clickViewSidebar=()=>app.evaluate(({Menu})=>{Menu.getApplicationMenu().items.find(item=>item.label==='View').submenu.items.find(item=>/^(Show|Hide) Sidebar$/.test(item.label)).click();});
// One collapsed state across DOM, the titlebar/sidebar button, disk and the menu label.
async function expectState(collapsed,label){
 await poll(async()=>await collapsedClass()===collapsed,label+' class');
 await (collapsed?showButton():hideButton()).waitFor();assert.equal(await (collapsed?hideButton():showButton()).count(),0);
 await poll(async()=>await saved()===collapsed,label+' saved');
 await poll(async()=>(await viewMenu()).label===(collapsed?'Show Sidebar':'Hide Sidebar'),label+' menu label');
}
const tipSelector='.source-tooltip-popup:not([data-state="ending"])';
async function tooltipFor(button,content){await page.mouse.move(700,700);await page.locator('.source-tooltip-popup').waitFor({state:'detached',timeout:3000}).catch(()=>{});
 await button.hover();await page.locator(tipSelector).filter({hasText:content}).waitFor();
 // Fidelity F02: tooltip shortcuts are the Shortcut text variant; read the visible glyphs past the sr-only names.
 const tip=await page.locator(tipSelector).evaluate(node=>({text:node.textContent,shortcut:(c=>c?[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''):null)(node.querySelector('.source-tooltip-shortcut')),hasShortcut:node.dataset.hasShortcut??null}));
 const title=await button.getAttribute('title');await page.mouse.move(700,700);return {...tip,title};}
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
// sidebar-groups.js:12741-12767 zP New selection, 7700-7760 CO/wO/OO empty
// states, sidebar-rows.js eO data-scrolled ("data-scrolled": i || void 0, so React writes "true") / scrollResetKey.
const sidebar=()=>page.locator('.source-sidebar'),newRow=()=>sidebar().locator('.source-sidebar-nav-row',{hasText:'New'});
// New row mD (sidebar-groups.js:7062-7073, :12828-12842) with the loaded shared-styles copy of
// desktop-layout.css:532-542 (hover 25% mix, transparent while focused), 884-886 (18px / 13px glyph)
// and 1917-1929 (glyph 700, web fill --cds-neutral-70, dark --cds-neutral-150). Tokens resolve on probes.
const circleState=()=>newRow().evaluate(node=>{const circle=node.querySelector(':scope > .df-leading-slot > .df-new-circle'),glyph=circle.querySelector(':scope > [data-cds="Icon"]'),style=getComputedStyle(circle),g=getComputedStyle(glyph),box=circle.getBoundingClientRect(),probe=document.createElement('i');node.append(probe);
 const token=(prop,value)=>{probe.style[prop]=value;const out=getComputedStyle(probe)[prop];probe.style[prop]='';return out;};
 const result={width:box.width,height:box.height,radius:parseFloat(style.borderTopLeftRadius),background:style.backgroundColor,neutral70:token('backgroundColor','var(--cds-neutral-70)'),neutral150:token('backgroundColor','var(--cds-neutral-150)'),hoverMix:token('backgroundColor','color-mix(in srgb, var(--cds-text-muted) 25%, transparent)'),
  glyphSize:g.fontSize,glyphWeight:g.fontWeight,glyphColor:g.color,secondary:token('color','var(--cds-text-secondary)'),primary:token('color','var(--cds-text-primary)'),circles:document.querySelectorAll('.source-sidebar .df-new-circle').length,inNew:!!circle};probe.remove();return result;});
// Account footer pw (sidebar-groups.js:5225-5310) in hL df-footer-row (sidebar-main.js:14187-14202) and the
// df-bottom-tray (:14970); desktop-layout.css:1945-1947 web row padding 8px, :1012-1015 suffix mask, :1957-1959 suffix font.
const accountButton=()=>page.getByRole('button',{name:'Account menu',exact:true});
const footerState=()=>accountButton().evaluate(node=>{const style=getComputedStyle(node),row=node.closest('.df-footer-row'),rowStyle=getComputedStyle(row),suffix=node.querySelector(':scope > .df-footer-suffix'),name=suffix.querySelector(':scope > .whitespace-nowrap.text-secondary'),texts=[...suffix.querySelectorAll(':scope > .df-footer-suffix-text')],caret=node.querySelector(':scope > [data-cds="Icon"]'),slot=node.querySelector(':scope > .df-on-rail'),spark=slot.querySelector('[data-cds="Spark"]');
 const probe=document.createElement('i');row.append(probe);const token=(prop,value)=>{probe.style[prop]=value;const out=getComputedStyle(probe)[prop];probe.style[prop]='';return out;};const box=node.getBoundingClientRect(),rowBox=row.getBoundingClientRect(),sideBox=node.closest('.source-sidebar').getBoundingClientRect();
 const result={height:box.height,radius:style.borderTopLeftRadius,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,gap:style.columnGap,rowPx:style.getPropertyValue('--df-row-px').trim(),rowGap:style.getPropertyValue('--df-row-gap').trim(),pill:style.getPropertyValue('--df-radius-pill').trim(),rowFont:style.getPropertyValue('--df-row-font').trim(),
  background:style.backgroundColor,hover:token('backgroundColor','var(--df-hover)'),boxShadow:style.boxShadow,focused:document.activeElement===node,focusVisible:node.matches(':focus-visible'),
  nameText:name.textContent,nameSize:getComputedStyle(name).fontSize,nameColor:getComputedStyle(name).color,secondary:token('color','var(--cds-text-secondary)'),muted:token('color','var(--cds-text-muted)'),
  suffixTexts:texts.map(n=>n.textContent),suffixSizes:texts.map(n=>getComputedStyle(n).fontSize),suffixColors:texts.map(n=>getComputedStyle(n).color),suffixHidden:texts.map(n=>n.getAttribute('aria-hidden')),mask:getComputedStyle(suffix).maskImage||getComputedStyle(suffix).webkitMaskImage,suffixPaddingRight:getComputedStyle(suffix).paddingRight,
  caretSize:getComputedStyle(caret).fontSize,caretColor:getComputedStyle(caret).color,slotWidth:slot.getBoundingClientRect().width,leadingSlot:style.getPropertyValue('--df-leading-slot').trim(),spark:[spark.getBoundingClientRect().width,spark.getBoundingClientRect().height],
  rowPadding:rowStyle.padding,rowHeight:rowBox.height,rowOverflow:row.scrollWidth-row.clientWidth,buttonOverflow:node.scrollWidth-node.clientWidth,withinSidebar:box.right<=sideBox.right&&rowBox.right<=sideBox.right+0.5,hairline:getComputedStyle(row.parentElement,'::before').borderTopWidth,hairlineProbe:(probe.style.borderTop='0.5px solid',getComputedStyle(probe).borderTopWidth),aux:row.querySelector(':scope > .df-footer-aux > button')?.getAttribute('aria-label')??null};probe.remove();return result;});
const selectedRows=()=>sidebar().evaluate(root=>[...root.querySelectorAll('[data-selected="focused"]')].map(node=>({row:node.classList.contains('source-session-row')?'session':node.classList.contains('source-sidebar-nav-row')?'nav:'+node.querySelector(':scope > .source-leading-slot + span').textContent:node.className,id:node.dataset.sourceSessionId??null})));
const onlySelected=async(expected,label)=>{let last;try{await poll(async()=>JSON.stringify(last=await selectedRows())===JSON.stringify([expected]),label);}catch(error){error.message+=' '+JSON.stringify(last);throw error;}};
const filterButton=()=>page.getByRole('button',{name:/^Filter(?: \(active\))?$/}),filterMenu=()=>page.getByRole('menu',{name:'Filter sessions',exact:true});
const savedSidebar=async()=>(await read('preferences.json')).sidebarPreferences||{};
const sidebarNav=name=>page.locator('.sidebar-toolbar > .source-nav-buttons').getByRole('button',{name,exact:true}),titleNav=name=>page.locator('.st-toolbar .df-collapsed-chrome > .df-collapsed-nav > .source-nav-buttons').getByRole('button',{name,exact:true});
const goMenu=()=>app.evaluate(({Menu})=>{const menu=Menu.getApplicationMenu(),labels=menu.items.map(item=>item.label||String(item.role)),go=menu.items.find(item=>item.label==='Go');
 return {labels,items:go.submenu.items.map(item=>item.type==='separator'?'---':({label:item.label,accelerator:item.accelerator,id:item.id||null,visible:item.visible,registerAccelerator:item.registerAccelerator,enabled:item.enabled}))};});
const goState=()=>app.evaluate(({Menu})=>{const menu=Menu.getApplicationMenu();return [menu.getMenuItemById('go-back').enabled,menu.getMenuItemById('go-forward').enabled];});
const expectGo=async(expected,label)=>{let last;try{await poll(async()=>JSON.stringify(last=await goState())===JSON.stringify(expected),label);}catch(error){error.message+=' '+JSON.stringify(last);throw error;}};
const clickGo=index=>app.evaluate(({Menu},index)=>{Menu.getApplicationMenu().items.find(item=>item.label==='Go').submenu.items[index].click();},index);
const buttonState=button=>button.evaluate(node=>({ariaDisabled:node.getAttribute('aria-disabled'),disabled:node.hasAttribute('disabled'),title:node.getAttribute('title'),keys:node.getAttribute('aria-keyshortcuts'),pointerEvents:getComputedStyle(node).pointerEvents,childOpacity:getComputedStyle(node.firstElementChild).opacity}));
const titleText=()=>page.locator('.st-toolbar .st-title').textContent();
const expectOpen=async(id,title,label)=>{await poll(async()=>(await row(id).getAttribute('aria-current'))==='page',label+' row');await poll(async()=>(await titleText().catch(()=>null))===title,label+' title');};
try{
 await integrity();await launch();
 step('initial');assert.equal(await collapsedClass(),false);await hideButton().waitFor();assert.notEqual((await read('preferences.json')).sidebarCollapsed,true);
 const menu=await viewMenu();assert.deepEqual(menu,{palette:['Command Palette…','CmdOrCtrl+K'],label:'Hide Sidebar',accelerator:'CmdOrCtrl+B',type:'normal',next:'separator',roles:['Show Terminal','Show Changes','Show Preview','Show Files','Show Side Chat','Close Pane','---','Split View','---','Actual Size','Zoom In','Zoom In (indie cooler version)','Zoom Out','Zoom In (numpad)','Zoom Out (numpad)','Actual Size (numpad)','---','reload','toggledevtools','---','Enter Full Screen']});report.metrics.initialMenu=menu;
 // Fidelity F04 (on purpose): pNr adds bNr's pane items and Close Pane after the sidebar item, and the source's
 // Enter/Exit Full Screen item (Control+Command+F) replaces the togglefullscreen role.
 report.checks.push('A profile without sidebarCollapsed starts expanded; View menu opens with Command Palette… (CmdOrCtrl+K) and Hide Sidebar (CmdOrCtrl+B), a separator, the bNr Show Terminal / Changes / Preview / Files / Side Chat / Close Pane items, the index.chunk-ChZ67Jhw.js dNr zoom items (in place of the zoom roles), reload/devtools and Enter Full Screen');
 step('nav-initial');const go=await goMenu();report.metrics.goMenu=go;
 // Fidelity F04 (on purpose): ANr's full menu bar, and Swr's Previous/Next Session and Search… after Back/Forward (9 items).
 assert.deepEqual(go.labels,['OpenClaude Desktop','File','Edit','View','Go','Window','Help']);assert.equal(go.items.length,9);
 assert.deepEqual(go.items,[{label:'Back',accelerator:'Command+[',id:null,visible:false,registerAccelerator:true,enabled:true},{label:'Back',accelerator:'Command+[',id:'go-back',visible:true,registerAccelerator:false,enabled:false},
  {label:'Forward',accelerator:'Command+]',id:null,visible:false,registerAccelerator:true,enabled:true},{label:'Forward',accelerator:'Command+]',id:'go-forward',visible:true,registerAccelerator:false,enabled:false},'---',
  {label:'Previous Session',accelerator:'Command+Shift+[',id:null,visible:true,registerAccelerator:true,enabled:true},{label:'Next Session',accelerator:'Command+Shift+]',id:null,visible:true,registerAccelerator:true,enabled:true},'---',
  {label:'Search…',accelerator:'Command+Shift+K',id:null,visible:true,registerAccelerator:true,enabled:true}]);
 for(const [name,keys] of [['Back','Meta+['],['Forward','Meta+]']]){const state=await buttonState(sidebarNav(name));report.metrics['launch'+name]=state;
  assert.deepEqual(state,{ariaDisabled:'true',disabled:false,title:null,keys,pointerEvents:'none',childOpacity:'0.5'});
  await sidebarNav(name).evaluate(node=>node.focus());assert.equal(await sidebarNav(name).evaluate(node=>node===document.activeElement),true);}
 await page.evaluate(()=>document.activeElement.blur());
 // Fidelity F01: shared-frame Li/sidebar-main pp make the sidebar a desktop CDS root; ghost icon buttons draw
 // focus-visible:shadow-focus (shared-frame-C_2npUJq.js:2689) instead of the old undefined --cds-focus-color outline.
 step('cds-root-focus');report.metrics.cdsRoot=await page.evaluate(()=>{const aside=document.querySelector('aside.source-sidebar');return {root:aside.closest('.cds-root[data-platform=desktop][data-font]')===aside,html:document.documentElement.dataset.platform,mode:document.documentElement.dataset.mode,font:aside.dataset.font,density:aside.dataset.density,cursor:getComputedStyle(aside).getPropertyValue('--cds-cursor-interactive').trim()};});
 assert.deepEqual(report.metrics.cdsRoot,{root:true,html:'desktop',mode:'light',font:'sans',density:'compact',cursor:'default'});
 const ring=async button=>{await button.focus();await page.keyboard.press('Shift');return button.evaluate(node=>{const probe=document.createElement('span');probe.style.color='var(--cds-fill-accent)';node.parentElement.append(probe);const accent=getComputedStyle(probe).color;probe.remove();const style=getComputedStyle(node);return {focusVisible:node.matches(':focus-visible'),boxShadow:style.boxShadow,outlineStyle:style.outlineStyle,accent};});};
 for(const [name,button] of [['HideSidebar',hideButton()],['Back',sidebarNav('Back')]]){const state=await ring(button);report.metrics['focusRing'+name]=state;
  assert.equal(state.focusVisible,true,name);assert.ok(state.boxShadow.includes(state.accent),name+' ring uses --cds-fill-accent');assert.equal(state.outlineStyle,'none',name);}
 await page.evaluate(()=>document.activeElement.blur());
 report.checks.push('The sidebar aside is a cds-root (compact, data-platform desktop, data-font, --cds-cursor-interactive default); keyboard focus on Hide sidebar and Back draws the --cds-focus-shadow accent ring with no outline');
 // index.chunk-ChZ67Jhw.js dNr/ONr/SNr/aF and titlebar-shared-21 _v: View zoom moves the traffic lights
 // (aun: {17,17} at 100%) and the renderer spacer (round(74 / min(zoom, 1))); the toggle clears the zoom button.
 step('zoom');const chromeState=()=>app.evaluate(({BrowserWindow,Menu})=>{const w=BrowserWindow.getAllWindows()[0];return {level:w.webContents.getZoomLevel(),factor:w.webContents.getZoomFactor(),lights:w.getWindowButtonPosition(),actualSize:Menu.getApplicationMenu().getMenuItemById('actual-size').enabled};});
 const spacer=()=>page.evaluate(()=>getComputedStyle(document.querySelector('.dframe-root')).getPropertyValue('--df-traffic-light-spacer').trim());
 const clickView=label=>app.evaluate(({Menu},label)=>Menu.getApplicationMenu().items.find(item=>item.label==='View').submenu.items.find(item=>item.label===label).click(),label);
 let zoom=await chromeState();report.metrics.zoomInitial=zoom;assert.deepEqual([zoom.level,zoom.lights,zoom.actualSize],[0,{x:17,y:17},false]);assert.equal(await spacer(),'74px');
 await clickView('Zoom Out');await poll(async()=>(await chromeState()).level===-0.5,'menu zoom out');await poll(async()=>await spacer()==='81px','spacer after zoom out');
 zoom=await chromeState();report.metrics.zoomOut=zoom;assert.deepEqual([zoom.lights,zoom.actualSize],[{x:15,y:15},true]);
 await clickView('Actual Size');await poll(async()=>(await chromeState()).level===0,'actual size');await poll(async()=>await spacer()==='74px','spacer reset');
 zoom=await chromeState();assert.deepEqual([zoom.lights,zoom.actualSize],[{x:17,y:17},false]);
 for(const factor of [0.8,1.25,1]){
  await app.evaluate(({BrowserWindow},factor)=>{const w=BrowserWindow.getAllWindows()[0];w.webContents.setZoomFactor(factor);w.webContents.emit('zoom-changed',{preventDefault(){}},factor<1?'out':'in');},factor);
  const expected=Math.round(74/Math.min(factor,1))+'px',lightsAt=Math.max(0,Math.round(22.5*factor-6));
  await poll(async()=>await spacer()===expected,'spacer at '+factor);await poll(async()=>{const state=await chromeState();return Math.abs(state.factor-factor)<1e-6&&state.lights.x===lightsAt&&state.lights.y===lightsAt;},'lights at '+factor);
  const left=await hideButton().evaluate(node=>node.getBoundingClientRect().left);zoom=await chromeState();report.metrics['zoom'+factor]={...zoom,spacer:await spacer(),hideLeftDip:left*factor};
  // Assumed macOS geometry: buttons 20pt apart and 14pt wide, so the zoom button ends near lights.x + 54.
  assert.ok(left*factor>=zoom.lights.x+54,'Hide sidebar clears the zoom button at '+factor);}
 report.checks.push('View > Zoom Out / Actual Size are the dNr items: level -0.5 moves the lights to {15,15}, the spacer to 81px and enables Actual Size; Actual Size restores {17,17}/74px; at 80%, 125% and 100% (zoom-changed resync) the spacer is round(74/min(z,1)) and Hide sidebar clears the zoom button');
 report.checks.push('At launch Back/Forward (qM) are aria-disabled="true" without a disabled attribute or native title, keep aria-keyshortcuts Meta+[ / Meta+], take focus, and have pointer-events none with 50% children (KM); Go follows View with hidden Command+[ / Command+] twins and go-back/go-forward disabled');
 step('new-selection');await onlySelected({row:'nav:New',id:null},'New selected on the launch new route');
 assert.equal(await newRow().getAttribute('aria-current'),'page');assert.equal(await newRow().getAttribute('aria-keyshortcuts'),'Meta+n');
 await row(ids[0]).click();await poll(async()=>(await row(ids[0]).getAttribute('aria-current'))==='page','session open');await onlySelected({row:'session',id:ids[0]},'only the open session row selected');
 assert.equal(await newRow().getAttribute('data-selected'),null);assert.equal(await newRow().getAttribute('aria-current'),null);assert.equal(await newRow().getAttribute('aria-keyshortcuts'),'Meta+n');
 report.metrics.openSessionSelection=await selectedRows();await shot('new-row-session-open');
 await newRow().click();await onlySelected({row:'nav:New',id:null},'only New selected after New');assert.equal(await newRow().getAttribute('aria-current'),'page');assert.equal(await row(ids[0]).getAttribute('aria-current'),null);
 report.metrics.newRouteSelection=await selectedRows();
 report.checks.push('Exactly one sidebar element is data-selected=focused: the open session row while a session is open (New has no data-selected/aria-current), and only New (aria-current=page) after clicking New; New always carries aria-keyshortcuts Meta+n');
 step('new-circle');let circle=await circleState();report.metrics.newCircleSelected=circle;assert.equal(circle.circles,1);assert.equal(circle.inNew,true);
 assert.equal(circle.background,'rgba(0, 0, 0, 0)','transparent while New is data-selected=focused');assert.equal(circle.glyphColor,circle.primary,'group-data-[selected=focused]:text-primary');
 await row(ids[0]).click();await onlySelected({row:'session',id:ids[0]},'session open for the filled circle');await page.mouse.move(700,700);
 circle=await circleState();report.metrics.newCircleFilled=circle;assert.deepEqual([circle.width,circle.height],[18,18]);assert.ok(circle.radius>=9,'rounded-full');
 assert.equal(circle.background,circle.neutral70,'web fill --cds-neutral-70');assert.notEqual(circle.background,'rgba(0, 0, 0, 0)');assert.deepEqual([circle.glyphSize,circle.glyphWeight],['13px','700']);assert.equal(circle.glyphColor,circle.secondary);
 await newRow().hover();circle=await circleState();report.metrics.newCircleHover=circle;assert.equal(circle.background,circle.hoverMix,'hover: muted 25% mix');assert.equal(circle.glyphColor,circle.primary,'group-hover:text-primary');await shot('new-circle-hover');
 await newRow().click();await onlySelected({row:'nav:New',id:null},'New selected again');circle=await circleState();report.metrics.newCircleReselected=circle;assert.equal(circle.background,'rgba(0, 0, 0, 0)','transparent again once New is selected (even hovered)');
 await page.mouse.move(700,700);
 report.checks.push('New leading slot holds the only df-new-circle: 18x18 rounded-full, web fill = resolved --cds-neutral-70 with a 13px/700 text-secondary Add glyph while a session is open; hover gives the 25% muted mix and a text-primary glyph; transparent while New is selected');
 step('account-footer');let foot=await footerState();report.metrics.accountFooter=foot;
 assert.equal(foot.height,28);assert.equal(foot.radius,'6px');assert.equal(foot.radius,foot.pill);assert.equal(foot.paddingLeft,foot.rowPx);assert.equal(foot.paddingRight,'6px','shared-styles .df-footer-row:has(.df-footer-aux:empty) .df-user-menu-btn: calc(var(--df-tray-caret-col) - 14px) = 8+24/2-14');assert.equal(foot.gap,foot.rowGap);
 assert.equal(foot.nameText,'Fixture');assert.equal(foot.nameSize,foot.rowFont);assert.equal(foot.nameColor,foot.secondary);
 assert.equal(foot.suffixTexts.length,2);assert.equal(foot.suffixTexts[0],'·');assert.ok(foot.suffixTexts[1].length>0);assert.deepEqual(foot.suffixHidden,['true',null]);
 assert.deepEqual(foot.suffixSizes,Array(2).fill(parseFloat(foot.rowFont)-2+'px'));assert.deepEqual(foot.suffixColors,[foot.muted,foot.muted]);assert.notEqual(foot.mask,'none');assert.match(foot.mask,/linear-gradient/);assert.equal(foot.suffixPaddingRight,'12px');
 assert.equal(foot.caretSize,'12px');assert.equal(foot.caretColor,foot.muted);assert.equal(foot.slotWidth+'px',foot.leadingSlot);assert.deepEqual(foot.spark,[16,16]);
 assert.equal(foot.rowPadding,'8px');assert.equal(foot.rowHeight,44);assert.equal(foot.hairline,foot.hairlineProbe,'tray :before 0.5px hairline (desktop-layout.css:602-611; snapped per DPR like a 0.5px probe)');assert.equal(foot.aux,null,'df-footer-aux stays empty while the core is connected (Connection settings shows only on a connection issue)');assert.equal(foot.background,'rgba(0, 0, 0, 0)');
 await accountButton().hover();foot=await footerState();report.metrics.accountFooterHover=foot;assert.equal(foot.background,foot.hover,'hover:bg-[var(--df-hover)]');assert.notEqual(foot.background,'rgba(0, 0, 0, 0)');await shot('account-footer-hover');await page.mouse.move(700,700);
 await accountButton().focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');foot=await footerState();report.metrics.accountFooterFocus=foot;
 assert.equal(foot.focused,true);assert.equal(foot.focusVisible,true);assert.notEqual(foot.boxShadow,'none','focus-visible:shadow-focus');await shot('account-footer-focus');await page.evaluate(()=>document.activeElement.blur());
 report.checks.push('Account footer is pw: 28px df-user-menu-btn with --df-radius-pill, --df-row-px / 6px (empty-aux caret column) padding and --df-row-gap; Spark in a --df-leading-slot df-on-rail; name at --df-row-font text-secondary; aria-hidden dot and suffix 2px smaller, text-muted, masked df-footer-suffix; xs muted caret; web footer row padding 8px (44px) under the tray hairline; hover --df-hover, keyboard (Shift+Tab, Tab) focus-visible box-shadow; empty df-footer-aux while connected');
 step('empty-filtered');await filterButton().click();await filterMenu().getByRole('menuitem',{name:/^Status/}).click();await page.getByRole('menu',{name:'Status',exact:true}).getByRole('menuitemradio',{name:'Archived',exact:true}).click();await filterMenu().waitFor({state:'detached'});
 const empty=sidebar().locator('[data-empty-variant="filtered"]');await empty.waitFor();assert.equal(await empty.locator('p').textContent(),'No sessions match the current filters');assert.equal(await sidebar().locator('.source-session-row').count(),0);
 await poll(async()=>(await savedSidebar()).status==='archived','archived status saved');
 report.metrics.emptyFiltered=await empty.evaluate(node=>{const style=getComputedStyle(node),text=getComputedStyle(node.querySelector('p')),button=getComputedStyle(node.querySelector('button')),probe=document.createElement('span');node.append(probe);const token=name=>{probe.style.color=`var(${name})`;return getComputedStyle(probe).color;};probe.style.fontSize='var(--cds-font-size-footnote)';const footnote=getComputedStyle(probe).fontSize;const colors={muted:token('--cds-text-muted'),secondary:token('--cds-text-secondary')};probe.remove();
  return {direction:style.flexDirection,align:style.alignItems,gap:style.rowGap,padding:style.padding,textAlign:style.textAlign,textSize:text.fontSize,textColor:text.color,buttonSize:button.fontSize,buttonColor:button.color,underlineOffset:button.textUnderlineOffset,footnote,...colors};});
 const m=report.metrics.emptyFiltered;assert.deepEqual([m.direction,m.align,m.gap,m.padding,m.textAlign],['column','center','8px','24px 16px','center']);assert.equal(m.textSize,m.footnote);assert.equal(m.buttonSize,m.footnote);assert.equal(m.footnote,'12px','compact cds-root footnote');assert.equal(m.textColor,m.muted);assert.equal(m.buttonColor,m.secondary);assert.equal(m.underlineOffset,'2px');
 await shot('empty-filtered');
 await empty.getByRole('button',{name:'Show all sessions',exact:true}).click();await poll(async()=>await sidebar().locator('.source-session-row').count()===ids.length,'rows return');assert.equal(await empty.count(),0);
 // sidebar-groups.js:21497-21507 He -> OU :21843-21847: Show all sessions sets status "all" (not Clear filters' "active").
 await poll(async()=>(await savedSidebar()).status==='all','all status saved');assert.notEqual((await savedSidebar()).stateActivityDays,0,'days untouched outside group by state');
 report.checks.push('Status=Archived with no archived sessions shows the OO filtered state "No sessions match the current filters" (footnote/muted, py-6 px-4 gap-2); Show all sessions follows OU: the rows return and preferences save status all (activity days untouched outside group by state)');

 // qD (sidebar-rows.js:7675-7729): the label span is the trigger of a side-right, non-hoverable tooltip whose content exists only while zD reports truncation.
 step('row-tooltips');const liveTips=()=>page.evaluate(()=>[...document.querySelectorAll('[role="tooltip"]')].filter(node=>node.dataset.state!=='ending').map(node=>{const r=node.getBoundingClientRect();return {text:node.querySelector('.source-tooltip-label')?.textContent??null,side:node.closest('[data-side]')?.dataset.side??null,left:r.left,top:r.top,bottom:r.bottom};}));
 const settle=async()=>{await page.mouse.move(700,700);await page.locator('.source-tooltip-popup').waitFor({state:'detached',timeout:3000}).catch(()=>{});};
 await settle();const label=id=>sidebar().locator(`[data-source-session-id="${id}"] .source-session-name`);
 const truncation=await Promise.all([ids[3],ids[1]].map(id=>label(id).evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth}))));report.metrics.rowTruncation=truncation;
 assert.ok(truncation[0].scroll>truncation[0].client,'long row label truncates');assert.ok(truncation[1].scroll<=truncation[1].client,'short row label fits');
 await label(ids[3]).hover();await page.locator(tipSelector).filter({hasText:LONG}).waitFor();const longTips=await liveTips();
 const rowBox=await page.locator(`[data-source-session-id="${ids[3]}"]`).evaluate(node=>{const r=node.getBoundingClientRect(),l=node.querySelector('.source-session-name').getBoundingClientRect();return {right:r.right,top:r.top,bottom:r.bottom,labelRight:l.right};});
 report.metrics.rowTooltip={tips:longTips,row:rowBox};assert.equal(longTips.length,1);assert.equal(longTips[0].text,LONG);assert.equal(longTips[0].side,'right');
 assert.ok(longTips[0].left>=rowBox.labelRight+3.5,'tooltip starts right of the label trigger (sideOffset 4)');assert.ok(longTips[0].top<rowBox.bottom&&longTips[0].bottom>rowBox.top,'tooltip beside the row');
 assert.equal(await row(ids[3]).getAttribute('title'),null);await shot('row-truncated-tooltip');
 await settle();await label(ids[1]).hover();await page.waitForTimeout(1000);assert.deepEqual(await liveTips(),[],'no tooltip for a short title');
 report.checks.push('A truncated row label (scrollWidth > clientWidth) shows exactly one CDS tooltip with the full title to the right of the label (data-side right, left >= label.right + 4); a fitting label shows none after 1s; rows carry no native title');
 // lI (sidebar-main.js:12290-12350): Filter tooltip {content, hoverable:false, open:false while its menu is open}; hp is Nu (default side top).
 step('filter-tooltip');await settle();const filterLabel=await filterButton().getAttribute('aria-label');await filterButton().hover();await page.locator(tipSelector).filter({hasText:filterLabel}).waitFor();
 const filterTips=await liveTips();report.metrics.filterTooltip={label:filterLabel,tips:filterTips};assert.equal(filterTips.length,1);assert.equal(filterTips[0].text,filterLabel);assert.equal(await filterButton().getAttribute('title'),null);await shot('filter-tooltip');
 await filterButton().click();await filterMenu().waitFor();await page.locator('.source-tooltip-popup').waitFor({state:'detached',timeout:3000});
 await page.mouse.move(700,700);await filterButton().hover({force:true});await page.waitForTimeout(1000);assert.deepEqual(await liveTips(),[],'no Filter tooltip while its menu is open');
 await page.keyboard.press('Escape');await filterMenu().waitFor({state:'detached'});
 report.checks.push('Filter shows its CDS tooltip (text = aria-label, no native title); once the filter menu is open the tooltip is gone and re-hovering the trigger does not reopen it');
 // JD (sidebar-rows.js:7730-7750) tabIndex -1 + data-row-action; eO (7915-7962) roving keys.
 step('row-keyboard');await settle();const mains=sidebar().locator('[data-row-main-button]'),active=()=>page.evaluate(()=>{const node=document.activeElement;return {main:node?.hasAttribute('data-row-main-button')??false,action:node?.hasAttribute('data-row-action')??false,toggle:node?.hasAttribute('data-group-toggle')??false,id:node?.closest('[data-source-session-id]')?.dataset.sourceSessionId??null};});
 const rowIds=await mains.evaluateAll(nodes=>nodes.map(node=>node.closest('[data-source-session-id]').dataset.sourceSessionId));report.metrics.rowOrder=rowIds;assert.ok(rowIds.length>=4);
 const more=await sidebar().locator('.source-session-more').first().evaluate(node=>({tabIndex:node.tabIndex,action:node.getAttribute('data-row-action'),title:node.getAttribute('title')}));assert.deepEqual(more,{tabIndex:-1,action:'',title:null});
 await mains.first().focus();await page.keyboard.press('Tab');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[1]},'Tab skips the More button');
 await page.keyboard.press('Shift+Tab');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[0]});
 const toggle=sidebar().locator('[data-group-toggle]').first();await toggle.focus();await page.keyboard.press('ArrowUp');assert.deepEqual(await active(),{main:false,action:false,toggle:true,id:null},'ArrowUp on a group toggle does nothing');
 await page.keyboard.press('ArrowDown');assert.deepEqual(await active(),{main:false,action:false,toggle:true,id:null},'ArrowDown on a group toggle does nothing');
 await mains.first().focus();await page.keyboard.press('ArrowRight');assert.deepEqual(await active(),{main:false,action:true,toggle:false,id:rowIds[0]},'ArrowRight moves to the row More button');
 await page.keyboard.press('ArrowRight');assert.deepEqual(await active(),{main:false,action:true,toggle:false,id:rowIds[0]},'clamped at the last row control');
 const moreVisible=await page.evaluate(()=>getComputedStyle(document.activeElement).opacity);assert.equal(moreVisible,'1');
 // The More button is a closed Menu.Trigger: source openOnArrowKeyDown (vendor-frame-BmPfNbgY.js:23791) opens its menu and Zr stops the event before eO (:20378-20383), so focus does not move rows.
 const sessionMenu=page.getByRole('menu',{name:'Session options',exact:true});
 await page.evaluate(()=>{window.__rowFocus=[];window.__rowFocusListener=event=>{const main=event.target.closest?.('[data-row-main-button]');if(main)window.__rowFocus.push(main.closest('[data-source-session-id]').dataset.sourceSessionId);};document.addEventListener('focusin',window.__rowFocusListener,true);});
 await page.keyboard.press('ArrowDown');await sessionMenu.waitFor();
 assert.equal(await sidebar().locator(`[data-source-session-id="${rowIds[0]}"] .source-session-more`).getAttribute('aria-expanded'),'true');await poll(()=>page.evaluate(()=>document.activeElement?.closest('[role="menu"]')?.getAttribute('aria-label')==='Session options'),'keyboard-opened menu takes focus');
 assert.deepEqual(await page.evaluate(()=>{document.removeEventListener('focusin',window.__rowFocusListener,true);return window.__rowFocus;}),[],'eO did not move focus to another row');
 await page.keyboard.press('Escape');await sessionMenu.waitFor({state:'detached'});await poll(async()=>JSON.stringify(await active())===JSON.stringify({main:false,action:true,toggle:false,id:rowIds[0]}),'Escape returns focus to More');
 await page.keyboard.press('ArrowLeft');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[0]},'ArrowLeft returns to the roving item');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[0]},'ArrowLeft clamps at the roving item');
 await page.keyboard.press('ArrowDown');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[1]},'ArrowDown from a row goes to the next row');
 await page.keyboard.press('ArrowUp');assert.deepEqual(await active(),{main:true,action:false,toggle:false,id:rowIds[0]});
 await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>{const items=[...document.querySelectorAll('nav.source-session-list [data-roving-item]')].filter(node=>node.offsetParent!==null);return items.length>1&&document.activeElement===items.at(-1);}),true,'ArrowUp wraps to the last roving item');
 await page.keyboard.press('Home');assert.equal((await active()).id,rowIds[0]);await page.evaluate(()=>document.activeElement.blur());
 report.checks.push('Row More buttons have tabindex -1 and data-row-action (Tab/Shift+Tab move row to row); ArrowUp/Down on a group toggle do nothing; ArrowRight from a row reaches its More button (clamped) and ArrowLeft returns (clamped); ArrowDown on the closed More trigger opens Session options instead of moving rows (source Menu.Trigger openOnArrowKeyDown + stopPropagation), Escape restores it; ArrowDown/Up move between rows, Up wraps and Home goes to the first row');
 // mm / Fp (c360a9e1c-GPs-MV9u.js:7387-7420, 6760-6810): Zt "Rename" and the cwd; the folder tooltip is closed while its menu is open.
 step('titlebar-tooltips');await row(ids[0]).click();await expectOpen(ids[0],'Chrome session A','open A for titlebar tooltips');await settle();
 // R4i-gui GU1 (R4f-rail SR-7/SR-8): rail mode has no titlebar folder pill (source-titlebar.jsx:471/:475); the folder chip is the rail
 // Environment card's (rail-view.mjs gD → repo-name-chip.mjs pLe: CdsTooltip {content 'Working folder', detail: the path, open: !menuOpen && undefined}).
 const railTipSelector='[data-cds="Tooltip"] [role="tooltip"]',railTips=()=>page.evaluate(sel=>[...document.querySelectorAll(sel)].map(node=>node.textContent),railTipSelector);
 const titleButton=page.locator('.st-toolbar .st-title'),folderPill=page.getByRole('complementary',{name:'Session details',exact:true}).locator('section[data-rail-section]').filter({has:page.locator('h3',{hasText:/^Environment/})}).getByRole('button',{name:path.basename(workspace),exact:true});
 assert.equal(await page.locator('.st-toolbar .st-folder').count(),0,'rail mode: no titlebar folder pill');
 await titleButton.hover();await page.locator(tipSelector).filter({hasText:'Rename'}).waitFor();const renameTips=await liveTips();const titleBox=await titleButton.boundingBox();
 report.metrics.renameTooltip={tips:renameTips,title:titleBox};assert.equal(renameTips.length,1);assert.equal(renameTips[0].text,'Rename');assert.equal(renameTips[0].side,'bottom','Nu default top flips below at the window top');assert.ok(renameTips[0].top>=titleBox.y+titleBox.height);await shot('titlebar-rename-tooltip');
 await settle();await folderPill.hover();await page.locator(railTipSelector).filter({hasText:'Working folder'}).filter({hasText:workspace}).waitFor();const folderTips=await railTips();report.metrics.folderTooltip=folderTips;assert.equal(folderTips.length,1);assert.equal(folderTips[0],'Working folder'+workspace);
 // R4i-gui GU1: the chip opens CdsDropdown.Popup over railRepoMenuItems (source-session-rail.jsx:379), no 'Working directory' group label.
 const folderGroupLabel=page.getByRole('menu').filter({has:page.getByRole('menuitem',{name:'Copy path',exact:true})});
 await settle();await folderPill.click();await folderGroupLabel.waitFor();await page.mouse.move(700,700);await folderPill.hover({force:true});await page.waitForTimeout(1000);
 assert.deepEqual(await railTips(),[],'no folder tooltip while the folder menu is open');await page.keyboard.press('Escape');await folderGroupLabel.waitFor({state:'detached'});
 report.checks.push('Titlebar: hovering the title shows the CDS "Rename" tooltip (flipped below); rail mode has no folder pill, the rail Environment card folder chip shows "Working folder" with the cwd, and with its menu open the chip shows no tooltip');
 const titled=await page.evaluate(()=>[...document.querySelectorAll('.app-sidebar [title], .st-lead [title]')].map(node=>node.outerHTML.slice(0,120)));report.metrics.titled=titled;assert.deepEqual(titled,[]);
 report.checks.push('No element in .app-sidebar or .st-lead carries a native title');
 step('nav-travel');await row(ids[0]).click();await expectOpen(ids[0],'Chrome session A','open A');await row(ids[1]).click();await expectOpen(ids[1],'Chrome session B','open B');
 await poll(async()=>(await buttonState(sidebarNav('Back'))).ariaDisabled===null,'Back enabled');assert.equal((await buttonState(sidebarNav('Forward'))).ariaDisabled,'true');await expectGo([true,false],'go-back enabled after A then B');
 const backTip=await tooltipFor(sidebarNav('Back'),'Back');report.metrics.backTooltip=backTip;assert.equal(backTip.title,null);assert.equal(backTip.shortcut,'⌘[');assert.ok(backTip.text.startsWith('Back'));
 await sidebarNav('Back').hover();const tipBox=await page.locator(tipSelector).filter({hasText:'Back'}).boundingBox(),backBox=await sidebarNav('Back').boundingBox();assert.ok(tipBox.y>=backBox.y+backBox.height,'tooltip below the button (tooltipSide bottom)');await shot('nav-back-tooltip');await page.mouse.move(700,700);
 await page.keyboard.press('Meta+BracketLeft');await expectOpen(ids[0],'Chrome session A','⌘[ back to A');await expectGo([true,true],'both directions after ⌘[');
 await page.keyboard.press('Meta+BracketRight');await expectOpen(ids[1],'Chrome session B','⌘] forward to B');await expectGo([true,false],'forward exhausted after ⌘]');
 report.checks.push('After opening A then B, Back is enabled (tooltip "Back" with ⌘[ below the button, no title); Meta+[ returns to A (row aria-current and titlebar title), Meta+] goes to B again, and Go > go-back/go-forward enabled follow each step');
 await clickGo(1);await expectOpen(ids[0],'Chrome session A','Go > Back');await expectGo([true,true],'Go > Back state');await clickGo(3);await expectOpen(ids[1],'Chrome session B','Go > Forward');
 await clickGo(0);await expectOpen(ids[0],'Chrome session A','hidden Back twin');await clickGo(2);await expectOpen(ids[1],'Chrome session B','hidden Forward twin');await expectGo([true,false],'menu round trip');
 report.checks.push('Go > Back/Forward (visible go-back/go-forward items and their hidden accelerator twins) navigate through the renderer history');
 step('nav-settings-guard');await page.keyboard.press('Meta+,');const navSettings=page.getByRole('dialog',{name:'Settings',exact:true});await navSettings.waitFor();await page.keyboard.press('Meta+BracketLeft');await clickGo(1);await page.waitForTimeout(400);
 await page.keyboard.press('Escape');await navSettings.waitFor({state:'detached'});await expectOpen(ids[1],'Chrome session B','still B after Settings');await expectGo([true,false],'unchanged after Settings');
 report.checks.push('While Settings is open neither Meta+[ nor Go > Back navigates');
 step('nav-collapsed');await composer().focus();await page.keyboard.press('Meta+B');await expectState(true,'collapse for nav');
 const order=await page.locator('.st-toolbar .df-collapsed-chrome').evaluate(node=>[...node.querySelectorAll('button')].map(button=>({label:button.getAttribute('aria-label'),nav:!!button.closest('.df-collapsed-nav')})));report.metrics.collapsedOrder=order;
 assert.deepEqual(order,[{label:'Show sidebar',nav:false},{label:'Back',nav:true},{label:'Forward',nav:true}]);
 assert.equal(await page.locator('.st-toolbar .df-collapsed-chrome > .code-icon-button + .df-collapsed-nav').count(),1);
 const boxes={show:await showButton().boundingBox(),back:await titleNav('Back').boundingBox(),forward:await titleNav('Forward').boundingBox()};report.metrics.collapsedBoxes=boxes;
 assert.ok(boxes.back.x>=boxes.show.x+boxes.show.width-0.5&&boxes.forward.x>=boxes.back.x+boxes.back.width-0.5,'Show sidebar, Back, Forward left to right');assert.ok(Math.abs(boxes.back.y-boxes.show.y)<=2);
 assert.equal(await page.locator('.df-collapsed-nav').evaluate(node=>getComputedStyle(node).webkitAppRegion??getComputedStyle(node).getPropertyValue('-webkit-app-region')),'no-drag');
 assert.equal((await buttonState(titleNav('Forward'))).ariaDisabled,'true');const collapsedTip=await tooltipFor(titleNav('Back'),'Back');assert.equal(collapsedTip.shortcut,'⌘[');assert.equal(collapsedTip.title,null);
 await titleNav('Back').hover();await page.locator(tipSelector).filter({hasText:'Back'}).waitFor();await shot('nav-collapsed-titlebar');await page.mouse.move(700,700);
 await titleNav('Back').click();await expectOpen(ids[0],'Chrome session A','collapsed Back');await poll(async()=>(await buttonState(titleNav('Forward'))).ariaDisabled===null,'collapsed Forward enabled');
 await titleNav('Forward').click();await expectOpen(ids[1],'Chrome session B','collapsed Forward');await poll(async()=>(await buttonState(titleNav('Forward'))).ariaDisabled==='true','collapsed Forward exhausted');
 report.checks.push('Collapsed (Meta+B): the titlebar shows Show sidebar then .df-collapsed-nav with Back and Forward (DOM and visual order, no-drag); Back/Forward there navigate and track availability');
 step('nav-expanded');await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'expand after nav');assert.equal(await page.locator('.df-collapsed-nav').count(),0);
 await sidebarNav('Back').click();await expectOpen(ids[0],'Chrome session A','sidebar Back');await sidebarNav('Forward').click();await expectOpen(ids[1],'Chrome session B','sidebar Forward');
 assert.equal((await buttonState(sidebarNav('Forward'))).ariaDisabled,'true');await sidebarNav('Forward').focus();await page.keyboard.press('Enter');await page.waitForTimeout(200);await expectOpen(ids[1],'Chrome session B','Enter on aria-disabled Forward is a no-op');
 report.checks.push('Expanded again, the sidebar toolbar Back/Forward navigate the same way; Enter on the focused aria-disabled Forward does nothing');
 await newRow().click();await onlySelected({row:'nav:New',id:null},'back on New before the ⌘B steps');
 // Fidelity F04: Km session cycling (shared-19-CjdiaR4X.js Km/Xm/$m) through the new-session page (position 0)
 // with ⌘⇧] / ⌘⇧[ and Ctrl+Tab / Ctrl+Shift+Tab, and Go > Previous/Next Session (Swr wwr, dispatchCycleSession).
 step('session-cycle');const openRow=()=>page.evaluate(()=>document.querySelector('.source-sidebar [data-row-main-button][aria-current="page"]')?.closest('[data-source-session-id]')?.dataset.sourceSessionId??null);
 const expectRow=async(id,label)=>{await poll(async()=>await openRow()===id,label);if(id===null)await onlySelected({row:'nav:New',id:null},label);};
 const clickGoLabel=label=>app.evaluate(({Menu},label)=>Menu.getApplicationMenu().items.find(item=>item.label==='Go').submenu.items.find(item=>item.label===label).click(),label);
 const cycleOrder=[];
 for(const [chord,id] of [['Meta+Shift+BracketRight',ids[0]],['Control+Tab',ids[1]],['Meta+Shift+BracketLeft',ids[0]],['Control+Shift+Tab',null],['Control+Shift+Tab',ids[3]],['Meta+Shift+BracketRight',null]]){
  await page.keyboard.press(chord);await expectRow(id,chord+' -> '+id);cycleOrder.push([chord,await openRow()]);}
 report.metrics.sessionCycle=cycleOrder;
 await clickGoLabel('Previous Session');await expectRow(ids[3],'Go > Previous Session from New wraps to the last row');
 await clickGoLabel('Next Session');await expectRow(null,'Go > Next Session from the last row wraps to New');
 await clickGoLabel('Next Session');await expectRow(ids[0],'Go > Next Session from New opens the first row');
 report.checks.push('From New, Meta+Shift+] opens A, Control+Tab B, Meta+Shift+[ A again, Control+Shift+Tab the New page (position 0), then the last row; Meta+Shift+] wraps back to New; Go > Previous/Next Session step the same ring');
 // View pane items / File ⌘W follow the renderer menu-state (bNr / iwr) and toggle panes through the renderer.
 // Fidelity F04: a React-menu row cancels the DOM contextmenu, so Chromium never asks for the native _W menu there;
 // the composer does (an editable target). The hidden offscreen window never pops a native menu either way.
 step('native-context-menu');await app.evaluate(({BrowserWindow})=>{globalThis.__contextParams=[];BrowserWindow.getAllWindows()[0].webContents.on('context-menu',(_e,p)=>globalThis.__contextParams.push({isEditable:p.isEditable}));});
 await row(ids[1]).click({button:'right'});const rowMenu=page.getByRole('menu').first();await rowMenu.waitFor();await page.keyboard.press('Escape');await rowMenu.waitFor({state:'detached'});
 const composerBox=await composer().boundingBox();await page.mouse.click(composerBox.x+20,composerBox.y+composerBox.height/2,{button:'right'});
 await poll(async()=>(await app.evaluate(()=>globalThis.__contextParams.length))>0,'composer context-menu event');
 assert.deepEqual(await app.evaluate(()=>globalThis.__contextParams),[{isEditable:true}],'only the composer reached the native menu');
 report.checks.push('Right-clicking a session row opens its React menu without a webContents context-menu event; right-clicking the composer emits one for an editable target');
 step('pane-menu-state');const menuRows=()=>app.evaluate(({Menu})=>{const menu=Menu.getApplicationMenu(),view=menu.items.find(item=>item.label==='View').submenu.items,file=menu.items.find(item=>item.label==='File').submenu.items;
  return {view:view.filter(item=>/^(Show|Hide) (Changes|Files)$|^Close Pane$/.test(item.label)).map(item=>[item.label,item.enabled]),file:file.filter(item=>item.visible&&item.accelerator==='CmdOrCtrl+W').map(item=>item.label)};});
 await poll(async()=>JSON.stringify((await menuRows()).view)===JSON.stringify([['Show Changes',true],['Show Files',true],['Close Pane',false]]),'pane items enabled for an open session');
 // R01 iwr: while the session view shows, File's ⌘W is Close Session (xdFFXdcjAb), with or without a pane.
 await poll(async()=>JSON.stringify((await menuRows()).file)===JSON.stringify(['Close Session']),'File ⌘W is Close Session in a session');
 const clickMenu=(menuLabel,label)=>app.evaluate(({Menu},[menuLabel,label])=>Menu.getApplicationMenu().items.find(item=>item.label===menuLabel).submenu.items.find(item=>item.label===label&&item.visible).click(),[menuLabel,label]);
 await clickMenu('View','Show Files');await page.locator('[data-tile-id="files"]').waitFor();
 await poll(async()=>JSON.stringify(await menuRows())===JSON.stringify({view:[['Show Changes',true],['Hide Files',true],['Close Pane',true]],file:['Close Session']}),'Hide Files + Close Pane once Files is open');
 report.metrics.paneMenuOpen=await menuRows();
 // Close Session closes the open pane first (the session view stays), then the labels settle back.
 const sessionShown=await page.evaluate(()=>document.querySelector('[data-row-main-button][aria-current="page"]')?.closest('[data-source-session-id]')?.dataset.sourceSessionId??null);assert.ok(sessionShown);
 await clickMenu('File','Close Session');await page.locator('[data-tile-id="files"]').waitFor({state:'detached'});
 await poll(async()=>JSON.stringify(await menuRows())===JSON.stringify({view:[['Show Changes',true],['Show Files',true],['Close Pane',false]],file:['Close Session']}),'labels back after File > Close Session closed the pane');
 assert.equal(await page.evaluate(id=>document.querySelector(`[data-source-session-id="${id}"] [data-row-main-button]`)?.getAttribute('aria-current'),sessionShown),'page','the session view stays while a pane was closed');
 await newRow().click();await onlySelected({row:'nav:New',id:null},'New again after the pane menu');
 await poll(async()=>JSON.stringify(await menuRows())===JSON.stringify({view:[['Show Changes',false],['Show Files',false],['Close Pane',false]],file:['Close Window']}),'pane items disabled and Close Window on New');
 report.checks.push('View > Show Changes / Show Files are enabled only for an open session; in a session File ⌘W reads Close Session (iwr) with or without a pane; Show Files relabels Hide Files and enables View > Close Pane; File > Close Session closes the open pane first and keeps the session; on New File ⌘W is Close Window again');
 // search_palette ⇧⌘K and Go > Search… open the ⌘K palette in search mode and never toggle it (sidebar-groups.js:4999-5047 sw n("search")).
 step('search-palette');const palette=()=>page.getByRole('dialog',{name:'Command palette',exact:true}),paletteField=()=>palette().getByRole('combobox');
 const fieldFocused=()=>page.evaluate(()=>document.activeElement?.id==='command-palette-input');
 await composer().focus();await page.keyboard.press('Meta+Shift+K');await palette().waitFor();await poll(fieldFocused,'⇧⌘K focuses the palette field');
 assert.equal(await palette().getAttribute('data-palette-mode'),'search');assert.equal(await paletteField().getAttribute('aria-label'),'Search sessions and projects');
 await page.keyboard.press('Meta+Shift+K');await page.waitForTimeout(200);assert.equal(await palette().isVisible(),true,'a second ⇧⌘K keeps it open');await poll(fieldFocused,'and keeps its field focused');
 await page.keyboard.press('Escape');await palette().waitFor({state:'detached'});
 await clickGoLabel('Search…');await palette().waitFor();await poll(fieldFocused,'Go > Search… focuses the palette field');assert.equal(await palette().getAttribute('data-palette-mode'),'search');
 await palette().getByRole('button',{name:'Close',exact:true}).click();await palette().waitFor({state:'detached'});
 const searchTip=await tooltipFor(page.getByRole('button',{name:'Search',exact:true}),'Search');report.metrics.searchTooltip=searchTip;
 assert.equal(searchTip.shortcut,'⇧⌘K');assert.equal(searchTip.title,null);assert.ok(searchTip.text.startsWith('Search'));await page.mouse.move(700,700);
 report.checks.push('Meta+Shift+K opens the ⌘K palette in search mode with its field focused, a second press keeps it open; Go > Search… does the same; the header button is "Search" with a ⇧⌘K CDS tooltip (_w) and no native title');
 // R01 (shortcuts-dialog-model.mjs searchShortcutAction): ⌘K toggles the command palette, a centred overlay whatever the
 // sidebar state (sidebar-groups.js:4999-5024 sw): a collapsed sidebar stays collapsed. Closing it, the chin chords work again.
 step('cmd-k-collapsed');await composer().focus();await page.keyboard.press('Meta+B');await expectState(true,'collapsed for ⌘K');
 await composer().focus();await page.keyboard.press('Meta+K');await palette().waitFor();await poll(fieldFocused,'⌘K focuses the palette field');
 report.metrics.cmdKSearch={mode:await palette().getAttribute('data-palette-mode'),label:await paletteField().getAttribute('aria-label'),inert:await paletteField().evaluate(node=>!!node.closest('[inert]')),collapsed:await collapsedClass()};
 assert.deepEqual(report.metrics.cmdKSearch,{mode:'default',label:'Search or start a session',inert:false,collapsed:true});
 await page.keyboard.press('Meta+K');await palette().waitFor({state:'detached'});
 const modelsMenu=()=>page.getByRole('menu',{name:'Models',exact:true});await composer().focus();await page.keyboard.press('Meta+Shift+KeyI');await modelsMenu().waitFor();
 await page.keyboard.press('Escape');await modelsMenu().waitFor({state:'detached'});
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'expanded again after ⌘K');
 report.checks.push('With the sidebar collapsed, ⌘K opens the palette overlay focused on its field and the sidebar stays collapsed; ⌘K again closes it; then ⇧⌘I opens the model menu (the chin chords are not blocked)');
 step('composer-cmd-b');await composer().focus();await page.keyboard.insertText('draft stays');await page.keyboard.press('Meta+B');await expectState(true,'composer collapse');
 assert.equal(await page.evaluate(()=>document.querySelector('[data-cds="ChatComposerEditor"]').value),'draft stays');assert.equal(await page.locator('[data-cds="ChatComposerEditor"] strong, [data-cds="ChatComposerEditor"] b').count(),0);
 const show=await showButton().boundingBox();report.metrics.showButton=show;assert.ok(show.x>=85,'Show sidebar clears the traffic lights');await shot('sidebar-collapsed-light');
 report.checks.push('Meta+B in the focused composer collapses the sidebar (root sidebar-collapsed, titlebar Show sidebar) without editing or bolding the draft');
 step('expand-cmd-b');await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'composer expand');
 report.checks.push('Meta+B again expands it; preferences and the View menu label follow each change');
 step('row-cmd-b');await row(ids[1]).focus();assert.equal(await row(ids[1]).evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Meta+B');await expectState(true,'row collapse');
 report.checks.push('With a session row focused Meta+B collapses the sidebar');
 step('menu-click');await clickViewSidebar();await expectState(false,'menu expand');await clickViewSidebar();await expectState(true,'menu collapse');await clickViewSidebar();await expectState(false,'menu expand again');
 report.checks.push('Invoking View > Show/Hide Sidebar click toggles through the renderer and relabels the item');
 step('settings-guard');await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();await page.waitForTimeout(300);
 const writesBefore=(await fs.stat(path.join(profile,'preferences.json'))).mtimeMs;await page.keyboard.press('Meta+B');await clickViewSidebar();await page.waitForTimeout(400);
 assert.equal(await collapsedClass(),false);assert.equal(await saved(),false);assert.equal((await viewMenu()).label,'Hide Sidebar');assert.equal((await fs.stat(path.join(profile,'preferences.json'))).mtimeMs,writesBefore);
 await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});
 report.checks.push('While Settings is open neither Meta+B nor the View menu item toggles or writes preferences');
 // Resize handle (0.2.117): sidebar-groups.js:5113-5207 uw over shared-19-CjdiaR4X.js Os; shared-2 Km/qm/Xm,
 // shared-22 TL (hide below MIN/2) / HL 3; desktop-layout.css:1459-1471, 2032-2036. settings IPC is counted by
 // wrapping the real desktop:call handler (as approval-card-ui-test does) and never altered.
 step('resize-handle');const handle=()=>page.getByRole('separator',{name:'Resize sidebar',exact:true});
 const cssWidth=()=>page.evaluate(()=>getComputedStyle(document.querySelector('.dframe-root')).getPropertyValue('--df-sidebar-width').trim());
 const asideWidth=()=>page.locator('.app-sidebar').evaluate(node=>node.getBoundingClientRect().width),resizing=()=>page.evaluate(()=>document.querySelector('.dframe-root').hasAttribute('data-resizing'));
 await app.evaluate(({ipcMain})=>{const channel='desktop:call',original=ipcMain._invokeHandlers?.get(channel);if(typeof original!=='function')throw new Error('Cannot wrap the real fixture IPC handler');
  const state={settings:[]};globalThis.sidebarResizeIpc=state;ipcMain.removeHandler(channel);
  ipcMain.handle(channel,(event,action,params)=>{if(action==='settings')state.settings.push(JSON.parse(JSON.stringify(params??null)));return original(event,action,params);});
  state.restore=()=>{ipcMain.removeHandler(channel);ipcMain.handle(channel,original);};});
 const settingsCalls=()=>app.evaluate(()=>globalThis.sidebarResizeIpc.settings.slice()),resetCalls=()=>app.evaluate(()=>{globalThis.sidebarResizeIpc.settings.length=0;});
 const expectCalls=async(expected,label)=>{let last;try{await poll(async()=>JSON.stringify(last=await settingsCalls())===JSON.stringify(expected),label);}catch(error){error.message+=' '+JSON.stringify(last);throw error;}};
 await settle();assert.equal(await asideWidth(),288);assert.equal(await cssWidth(),'288px');
 // wL floor (shared-22-Cz3C_T8d.js:13945-13959 -> uw minWidth, sidebar-main.js:14902): the toolbar row at max-content, clamped by qm.
 const chrome=await page.locator('.sidebar-toolbar').evaluate(node=>{const aside=node.parentElement,previous=node.style.width;node.style.width='max-content';const width=node.getBoundingClientRect().width+aside.offsetWidth-aside.clientWidth;node.style.width=previous;return width;});
 const floor=Math.min(420,Math.max(200,Math.ceil(chrome)));report.metrics.sidebarFloor={chrome,floor};
 const geo=await handle().evaluate(node=>{const aside=node.closest('.app-sidebar'),r=node.getBoundingClientRect(),a=aside.getBoundingClientRect(),style=getComputedStyle(node),pill=getComputedStyle(node.querySelector('[data-cds-part="resize-pill"]'));
  const hit=x=>document.elementFromPoint(x,r.top+200)?.closest('.dframe-resize-handle')===node;
  return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,asideRight:a.right,paddingRight:a.left+aside.clientLeft+aside.clientWidth,cssTop:style.top,headerH:style.getPropertyValue('--df-header-h').trim(),clip:style.clipPath,z:style.zIndex,cursor:style.cursor,cls:['cds-reset','group/resize','sidebar-resizer','dframe-resize-handle'].filter(name=>node.classList.contains(name)).join(' '),role:node.getAttribute('role'),orientation:node.getAttribute('aria-orientation'),tabIndex:node.tabIndex,title:node.getAttribute('title'),
   now:node.getAttribute('aria-valuenow'),min:node.getAttribute('aria-valuemin'),max:node.getAttribute('aria-valuemax'),pillWidth:pill.width,pillMaxHeight:pill.maxHeight,pillOpacity:pill.opacity,hitOutside:hit(a.right+3),hitEdge:hit(a.right-1),hitInside:hit(a.right-3),innerWidth};});
 report.metrics.resizeHandle=geo;
 assert.deepEqual([geo.cls,geo.role,geo.orientation,geo.tabIndex,geo.title,geo.now,geo.min,geo.max],['cds-reset group/resize sidebar-resizer dframe-resize-handle','separator','vertical',0,null,'288',String(floor),'420']);
 assert.equal(geo.width,12);assert.ok(Math.abs(geo.right-geo.paddingRight-6.25)<=0.01,'Os end-[calc(-6px-(0.5px-0px)/2)] straddles the sidebar edge');assert.deepEqual([geo.top,geo.cssTop],[0,'0px'],'web variant top: var(--df-chrome-bar-height), 0px without a WCO chrome bar');assert.equal(geo.clip,'inset(0px 0px 0px 37.5%)');assert.equal(geo.z,'25');assert.equal(geo.cursor,'col-resize');
 assert.deepEqual([geo.hitOutside,geo.hitEdge,geo.hitInside],[true,true,false],'hit area is the unclipped 7.5px from edge-1.25 to edge+6.25');assert.deepEqual([geo.pillWidth,geo.pillMaxHeight,geo.pillOpacity],['3px','48px','0']);
 report.checks.push('The sidebar handle is Os geometry: 12px separator straddling the sidebar edge (right = edge + 6.25px), clip-path inset(0 0 0 37.5%) leaving a 7.5px hit strip, z-index 25, col-resize, aria-valuemin = the sidebar floor (max(200, toolbar max-content), wL) / max 420 / now 288, a hidden 3px x max 48px pill and no native title');
 const hx=Math.round(geo.asideRight+3),hy=Math.round(geo.top+200);
 await page.mouse.move(hx+40,hy,{steps:2});await page.mouse.move(hx,hy,{steps:4});await page.locator(tipSelector).filter({hasText:'Drag to resize'}).waitFor();
 const handleTip=async()=>page.locator(tipSelector).filter({hasText:'Drag to resize'}).evaluate(node=>{const r=node.getBoundingClientRect();return {label:node.querySelector('.source-tooltip-label')?.textContent??null,shortcut:(c=>c?[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''):null)(node.querySelector('.source-tooltip-shortcut')),detail:node.querySelector('.source-tooltip-detail')?.textContent??null,side:node.closest('[data-side]')?.dataset.side??null,left:r.left,top:r.top,bottom:r.bottom,center:(r.top+r.bottom)/2};});
 await page.waitForTimeout(250);const tip=await handleTip();report.metrics.resizeTooltip={pointer:{x:hx,y:hy},tip};
 assert.deepEqual([tip.label,tip.shortcut,tip.detail,tip.side],['Hide sidebar','⌘B','Drag to resize','right']);assert.ok(tip.left>=geo.right+3.5,'right of the handle (sideOffset 4)');
 assert.ok(Math.abs(tip.center-hy)<=1.5,'Nu align center on the trackCursorAxis y anchor');
 assert.equal(await page.locator('[data-cds-part="resize-pill"]').evaluate(node=>getComputedStyle(node).opacity),'1','hovered pill shows after its 200ms delay');await shot('resize-handle-tooltip');
 await page.mouse.move(hx,hy+80,{steps:4});await poll(async()=>Math.abs((await handleTip()).center-(hy+80))<=1.5,'tooltip follows the pointer y');report.metrics.resizeTooltipMoved=await handleTip();
 report.checks.push('Hovering the handle shows one CDS tooltip "Hide sidebar" with the ⌘B keycap and "Drag to resize" detail to the right of the handle, vertically centred on the pointer y (Nu align center + trackCursorAxis y) and following the pointer 80px down; the hovered 3px pill is visible');
 step('resize-drag');await resetCalls();await page.mouse.move(hx,hy);await page.mouse.down();const liveWidths=[];
 for(const dx of [-10,-20,-30,-38]){await page.mouse.move(hx+dx,hy);await poll(async()=>await cssWidth()===`${288+dx}px`,'live width '+(288+dx));liveWidths.push({css:await cssWidth(),aside:await asideWidth(),resizing:await resizing(),valuenow:await handle().getAttribute('aria-valuenow')});
  assert.deepEqual(await settingsCalls(),[],'no settings write mid-drag');}
 report.metrics.resizeLive=liveWidths;assert.deepEqual(liveWidths.map(entry=>[entry.css,entry.aside,entry.resizing,entry.valuenow]),[['278px',278,true,'288'],['268px',268,true,'288'],['258px',258,true,'288'],['250px',250,true,'288']]);
 await poll(async()=>(await liveTips()).length===0,'tooltip closed while dragging');assert.equal(await handle().getAttribute('data-dragging'),'');
 const pillState=()=>page.locator('[data-cds-part="resize-pill"]').evaluate(node=>{const style=getComputedStyle(node),probe=document.createElement('span');probe.className='text-secondary';node.parentElement.append(probe);const secondary=getComputedStyle(probe).color;probe.remove();return {opacity:style.opacity,color:style.color,secondary};});
 await poll(async()=>{const pill=await pillState();return pill.opacity==='1'&&pill.color===pill.secondary;},'dragging pill text-secondary at full opacity');report.metrics.draggingPill=await pillState();await shot('resize-dragging-250');
 await page.mouse.up();await expectCalls([{sidebarWidth:250}],'one sidebarWidth write at pointerup');await page.waitForTimeout(400);assert.deepEqual(await settingsCalls(),[{sidebarWidth:250}],'still exactly one write');
 await poll(async()=>(await read('preferences.json')).sidebarWidth===250,'250 saved');assert.equal(await resizing(),false);assert.equal(await handle().getAttribute('aria-valuenow'),'250');assert.equal(await asideWidth(),250);assert.equal(await collapsedClass(),false);
 report.checks.push('Dragging 288 -> 250 in four steps moves only --df-sidebar-width (live 278/268/258/250 with data-resizing on the root, aria-valuenow still 288, the tooltip closed) and writes settings exactly once at pointerup: {sidebarWidth:250}, saved to preferences.json');
 step('resize-escape');await resetCalls();await page.mouse.move(hx-38,hy);await page.mouse.down();await page.mouse.move(hx-18,hy);await poll(async()=>await cssWidth()==='270px','escape drag live');await page.keyboard.press('Escape');
 await poll(async()=>await cssWidth()==='250px'&&!(await resizing()),'Escape restores the start width');await page.mouse.move(hx-90,hy);await page.mouse.up();await page.waitForTimeout(300);
 assert.equal(await cssWidth(),'250px');assert.deepEqual(await settingsCalls(),[],'a cancelled drag writes nothing');
 report.checks.push('Escape mid-drag (local useSourcePointerResize cancel) restores the start width, clears data-resizing and writes no settings; the later pointerup does nothing');
 step('resize-keys');await settle();await resetCalls();await handle().focus();const now=()=>handle().getAttribute('aria-valuenow');
 await page.keyboard.press('Home');await poll(async()=>await now()===String(floor),'Home = floor');assert.equal(await asideWidth(),floor);assert.equal(await cssWidth(),`${floor}px`);await expectCalls([{sidebarWidth:floor}],'Home one write');await shot('resize-home-floor');
 const toolbarAtFloor=await page.locator('.sidebar-toolbar').evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth}));report.metrics.toolbarAtFloor=toolbarAtFloor;assert.ok(toolbarAtFloor.scroll<=toolbarAtFloor.client,'the toolbar fits at the floor');
 const endWidth=await page.evaluate(()=>Math.min(420,Math.max(200,Math.floor(innerWidth)-330)));report.metrics.endWidth=endWidth;
 await page.keyboard.press('End');await poll(async()=>await now()===String(Math.max(floor,endWidth)),'End max');assert.equal(await asideWidth(),Math.max(floor,endWidth));await expectCalls([{sidebarWidth:floor},{sidebarWidth:Math.max(floor,endWidth)}],'End one write');
 await page.keyboard.press('Home');await poll(async()=>await now()===String(floor),'Home again');await resetCalls();for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
 await poll(async()=>await now()===String(floor+24),'ArrowRight x3');await expectCalls([1,2,3].map(i=>({sidebarWidth:floor+8*i})),'one write per arrow');
 await resetCalls();await page.keyboard.press('Shift+ArrowLeft');await poll(async()=>await now()===String(floor),'Shift+ArrowLeft 32 clamps at the floor');await page.keyboard.press('Shift+ArrowRight');await poll(async()=>await now()===String(floor+32),'Shift+ArrowRight 32');
 await expectCalls([{sidebarWidth:floor},{sidebarWidth:floor+32}],'shift steps');await page.keyboard.press('Meta+Home');await page.waitForTimeout(200);assert.equal(await now(),String(floor+32),'Home with Meta is ignored');
 await page.evaluate(()=>document.activeElement.blur());await settle();await resetCalls();const handleBox=await handle().boundingBox(),bx=Math.round(handleBox.x+handleBox.width-3);
 await page.mouse.move(bx,hy);await page.mouse.down();await page.mouse.move(bx+(288-floor-32)/2,hy);await page.mouse.move(bx+288-floor-32,hy);await page.mouse.up();
 await expectCalls([{sidebarWidth:288}],'drag back to 288');await poll(async()=>(await read('preferences.json')).sidebarWidth===288,'288 saved');assert.equal(await asideWidth(),288);
 report.checks.push('Keyboard: Home commits the floor (aria-valuenow = aria-valuemin, the toolbar no longer clipped) and End the viewport max qm(floor(innerWidth)-330), one settings write each; ArrowRight steps 8 and Shift+Arrow 32 (Os) clamped at the floor, each a single write; Meta+Home is ignored; a drag back to 288 is one more write');
 step('resize-drag-hide');await settle();await resetCalls();await page.mouse.move(hx,hy);await page.mouse.down();
 await page.mouse.move(hx-100,hy);await poll(async()=>await cssWidth()===`${floor}px`,'clamped at the floor');assert.equal(await collapsedClass(),false,'raw 188 keeps the sidebar');
 await page.mouse.move(hx-189,hy);await poll(collapsedClass,'raw 99 hides live');await expectCalls([{sidebarCollapsed:true}],'collapse persisted live');assert.equal(await cssWidth(),`${floor}px`);
 await page.mouse.move(hx-150,hy);await poll(async()=>!(await collapsedClass()),'raw 138 shows again');await page.mouse.move(hx-200,hy);await poll(collapsedClass,'hidden again');
 await page.mouse.up();await expectState(true,'drag hide');assert.equal(await cssWidth(),'288px','width restored to the pre-drag value');
 assert.deepEqual(await settingsCalls(),[{sidebarCollapsed:true},{sidebarCollapsed:false},{sidebarCollapsed:true}],'one collapsed write per change and no width write');assert.equal((await read('preferences.json')).sidebarWidth,288);await shot('resize-drag-hidden');
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'expand after drag hide');assert.equal(await asideWidth(),288);
 report.checks.push('Dragging below floor/2 (raw 99px; TL against uw minWidth) collapses the sidebar live (the same state as ⌘B: class, Show sidebar, saved sidebarCollapsed, menu label), back above shows it, and releasing hidden keeps it collapsed with the var restored; ⌘B brings it back at 288 with no width write');
 step('resize-click');await settle();await resetCalls();await page.mouse.move(hx,hy);await page.mouse.down();await page.mouse.move(hx+2,hy);await page.mouse.up();
 await expectState(true,'handle click hides');assert.deepEqual(await settingsCalls(),[{sidebarCollapsed:true}]);assert.equal(await cssWidth(),'288px');
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'expand after click');
 await resetCalls();await handle().focus();await page.keyboard.press('Enter');await expectState(true,'Enter hides');assert.deepEqual(await settingsCalls(),[{sidebarCollapsed:true}]);
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'expand after Enter');assert.equal(await asideWidth(),288);
 await app.evaluate(()=>globalThis.sidebarResizeIpc.restore());
 report.checks.push('A press with a 2px move (<= HL 3) and Enter on the focused handle both hide the sidebar like Hide sidebar (one sidebarCollapsed write, width untouched)');
 step('tooltips');const hide=await tooltipFor(hideButton(),'Hide sidebar');report.metrics.hideTooltip=hide;
 assert.equal(hide.title,null);assert.equal(hide.shortcut,'⌘B');assert.ok(hide.text.startsWith('Hide sidebar'));
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(true,'collapse for tooltip');
 const shown=await tooltipFor(showButton(),'Show sidebar');report.metrics.showTooltip=shown;assert.equal(shown.title,null);assert.equal(shown.shortcut,'⌘B');assert.ok(shown.text.startsWith('Show sidebar'));
 await showButton().hover();await page.locator(tipSelector).filter({hasText:'Show sidebar'}).waitFor();await shot('show-sidebar-tooltip');await page.mouse.move(700,700);
 report.checks.push('Hide sidebar / Show sidebar use the CDS tooltip with the ⌘B shortcut and carry no native title');
 // Fidelity F08 collapsed hover peek (sidebar-groups.js:2679-2750 Nb, desktop-layout.css:1346-1455, sidebar-main.js:15304-15320 dR).
 step('peek');const hovering=()=>page.evaluate(()=>document.querySelector('.dframe-root').hasAttribute('data-hovering')),peekBody=()=>page.locator('#frame-peek-popover');
 await page.mouse.move(700,700);await poll(async()=>!(await hovering()),'peek closed at rest');
 assert.deepEqual(await showButton().evaluate(node=>[node.getAttribute('aria-expanded'),node.getAttribute('aria-controls')]),['false','frame-peek-popover']);
 // The previous step's Show sidebar hover opened the peek; after its 180ms grace the card still runs the .14s opacity /
 // delayed-visibility exit transition (desktop-layout.css:1346-1455), so wait for the settled hidden state.
 await poll(async()=>(await peekBody().evaluate(node=>[node.inert,getComputedStyle(node).visibility,getComputedStyle(node).opacity].join()))==='true,hidden,0','the hidden card is inert and invisible');
 const peekCard=async()=>peekBody().evaluate(node=>{const style=getComputedStyle(node),r=node.getBoundingClientRect(),trigger=document.querySelector('.df-collapsed-chrome [aria-controls="frame-peek-popover"]'),t=trigger.getBoundingClientRect(),probe=document.createElement('span');
  probe.style.background='var(--cds-neutral-30)';document.body.append(probe);const neutral30=getComputedStyle(probe).backgroundColor;probe.remove();
  return {width:r.width,height:Math.round(r.height),maxHeight:Math.round(innerHeight*.7),gap:Math.round(r.top-t.bottom),left:Math.round(r.left),opacity:style.opacity,visibility:style.visibility,shadow:style.boxShadow,radius:style.borderRadius,padding:style.padding,
   inert:node.inert,peeked:document.querySelector('.dframe-root').hasAttribute('data-peeked'),expanded:trigger.getAttribute('aria-expanded'),triggerBg:getComputedStyle(trigger).backgroundColor,neutral30,background:style.backgroundColor,mode:document.documentElement.dataset.mode,handle:!!document.querySelector('.dframe-resize-handle')&&getComputedStyle(document.querySelector('.dframe-resize-handle')).display};});
 await showButton().hover();await poll(hovering,'hovering Show sidebar opens the peek');await page.waitForTimeout(300);
 const card=await peekCard();report.metrics.peekCard=card;
 assert.equal(card.width,280);assert.ok(card.height<=card.maxHeight,'max-height 70vh');assert.equal(card.gap,8);assert.equal(card.opacity,'1');assert.equal(card.visibility,'visible');
 assert.notEqual(card.shadow,'none');assert.equal(card.radius,'8px');assert.equal(card.padding,'7.5px 7.5px 13px');assert.equal(card.inert,false);assert.equal(card.peeked,true);assert.equal(card.expanded,'true');
 assert.equal(card.triggerBg,card.neutral30,'the trigger is bg-neutral-30 while peeked');assert.equal(card.handle,'none','the resize handle stays hidden');await shot('peek-card-light');
 await peekBody().hover({position:{x:140,y:30}});await page.waitForTimeout(300);assert.equal(await hovering(),true,'moving from the trigger into the card keeps it open');
 await page.mouse.move(900,600);await poll(async()=>!(await hovering()),'leaving the card closes it after the grace period');assert.equal(await showButton().getAttribute('aria-expanded'),'false');
 // An open trigger tooltip takes the first Escape (source-tooltip document capture), as Nb's !defaultPrevented guard does.
 await showButton().hover();await poll(hovering,'reopened');await page.keyboard.press('Escape');await page.waitForTimeout(100);if(await hovering())await page.keyboard.press('Escape');await poll(async()=>!(await hovering()),'Escape closes the peek');
 assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Show sidebar','Escape returns focus to the trigger');
 // The pointer is still over the trigger after Escape; the peek opens on pointerenter (Nb), so leave and come back.
 await page.mouse.move(700,700);await showButton().hover();await poll(hovering,'reopened for a row');await peekBody().hover({position:{x:140,y:30}});
 await page.locator(`#frame-peek-popover [data-source-session-id="${ids[2]}"] [data-row-main-button]`).click();await poll(async()=>!(await hovering()),'opening a row closes the peek');
 await poll(()=>page.evaluate(id=>document.querySelector(`[data-source-session-id="${id}"] [data-row-main-button]`)?.getAttribute('aria-current')==='page',ids[2]),'the row opened');assert.equal(await collapsedClass(),true,'the sidebar stays collapsed');
 await page.mouse.move(700,700);
 report.checks.push('Collapsed hover peek: hovering Show sidebar floats the body as a 280px card 8px below it (opacity 1, --df-shadow-pop, radius 8, padding 7.5/7.5/13, max 70vh) with aria-expanded=true and the neutral-30 trigger; crossing into the card keeps it, leaving closes it; Escape closes it and refocuses the trigger; opening a row closes it');
 step('relaunch');assert.equal(await saved(),true);await app.close();app=null;
 // Seed the next launch's theme only; sidebarCollapsed stays as the app saved it.
 const prefs=await read('preferences.json');assert.equal(prefs.sidebarCollapsed,true);await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...prefs,theme:'dark'}));
 await launch();await poll(collapsedClass,'restored collapsed');await showButton().waitFor();assert.equal((await viewMenu()).label,'Show Sidebar');
 report.checks.push('Close and relaunch of the same profile starts collapsed with View > Show Sidebar');
 step('dark-narrow');await poll(()=>page.evaluate(()=>document.documentElement.dataset.mode==='dark'),'dark mode');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await poll(()=>page.evaluate(()=>innerWidth===760),'760px');
 const overflow=()=>page.evaluate(()=>({doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth}));
 report.metrics.darkCollapsedOverflow=await overflow();assert.deepEqual(report.metrics.darkCollapsedOverflow,{doc:0,body:0});await shot('sidebar-collapsed-dark-760');
 await showButton().hover();await poll(hovering,'dark peek');await page.waitForTimeout(300);report.metrics.peekCardDark=await peekCard();
 assert.equal(report.metrics.peekCardDark.mode,'dark');assert.equal(report.metrics.peekCardDark.opacity,'1');assert.notEqual(report.metrics.peekCardDark.background,report.metrics.peekCard.background,'the card surface follows the theme');
 await shot('peek-card-dark');await page.mouse.move(700,700);await poll(async()=>!(await hovering()),'dark peek closed');
 await composer().focus();await page.keyboard.press('Meta+B');await expectState(false,'dark expand');report.metrics.darkExpandedOverflow=await overflow();assert.deepEqual(report.metrics.darkExpandedOverflow,{doc:0,body:0});await shot('sidebar-expanded-dark-760');
 report.checks.push('Dark theme at 760px has no horizontal overflow collapsed or expanded');
 step('dark-footer-760');const darkFoot=await footerState();report.metrics.darkFooter760=darkFoot;assert.equal(darkFoot.rowOverflow,0);assert.equal(darkFoot.buttonOverflow,0);assert.equal(darkFoot.withinSidebar,true);assert.equal(darkFoot.height,28);
 await row(ids[0]).click();await onlySelected({row:'session',id:ids[0]},'dark session open');await page.mouse.move(700,700);const darkCircle=await circleState();report.metrics.darkNewCircle=darkCircle;assert.equal(darkCircle.background,darkCircle.neutral150,'dark web fill --cds-neutral-150');
 assert.deepEqual(await overflow(),{doc:0,body:0});await shot('sidebar-footer-circle-dark-760');await newRow().click();await onlySelected({row:'nav:New',id:null},'dark New again');await page.mouse.move(700,700);
 report.checks.push('Dark 760px: the account footer row and button have no horizontal overflow and stay inside the sidebar; the New circle fill is the resolved --cds-neutral-150 while a session is open');
 // Fidelity F04 (titlebar-window-06): the main window's minimum is the source's 600x400 (OLi minWidth 600 / minHeight 400).
 // R01 narrow viewport (shared-2-C6aD8DvJ.js Jm/Ym: max-width max(700, ceil(288)+329) = 700px; sidebar-main.js:15367-15372):
 // at 600x400 the frame is collapsed to 'Show sidebar' and the peek card while preferences.sidebarCollapsed stays false;
 // nothing overflows and the content keeps the full width. Narrow, shared-2 toggleCollapsed opens/closes the peek instead
 // of the stored state (the trigger's click, ⌘B and View > Show/Hide Sidebar); opening a row closes it. 760px docks again.
 step('window-600');const minimum=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getMinimumSize());assert.deepEqual(minimum,[600,400]);
 assert.equal(await saved(),false,'the stored state is expanded');
 await row(ids[0]).click();await onlySelected({row:'session',id:ids[0]},'session open at 600');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(560,380));await poll(()=>page.evaluate(()=>innerWidth===600&&innerHeight===400),'clamped to the 600x400 minimum');
 await poll(collapsedClass,'the narrow viewport collapses the frame');await showButton().waitFor();assert.equal(await hideButton().count(),0,'the docked toolbar is hidden');
 assert.equal(await page.evaluate(()=>matchMedia('(max-width: 700px)').matches),true);
 const narrow=()=>page.evaluate(()=>{const over=node=>node?Math.max(0,Math.round(node.scrollWidth-node.clientWidth)):null,box=node=>node?.getBoundingClientRect(),toolbar=document.querySelector('.st-toolbar'),composerNodes=[...document.querySelectorAll('.sc-zone .sc-chin, [data-cds="ChatComposerEditor"]')].filter(node=>node.checkVisibility());
  const tools=[...(toolbar?.querySelectorAll('button')??[])].filter(node=>node.getClientRects().length).map(node=>box(node));
  return {doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth,toolbar:over(toolbar),
   toolsInside:tools.every(rect=>rect.left>=-0.5&&rect.right<=innerWidth+0.5),composerInside:composerNodes.length>0&&composerNodes.every(node=>box(node).right<=innerWidth+0.5),composerRights:composerNodes.map(node=>Math.round(box(node).right)),
   workspace:Math.round(box(document.querySelector('main.workspace')).width),innerWidth};});
 const narrow600=await narrow();report.metrics.window600Narrow=narrow600;await shot('window-600-narrow-dark');
 assert.deepEqual({...narrow600,composerRights:undefined,workspace:undefined},{doc:0,body:0,toolbar:0,toolsInside:true,composerInside:true,composerRights:undefined,workspace:undefined,innerWidth:600});
 assert.ok(narrow600.workspace>=narrow600.innerWidth-1,'the content keeps the full width');
 assert.equal(await saved(),false,'narrow never writes sidebarCollapsed');
 // The trigger's click toggles the card (Nb onClick -> toggleCollapsed). A pointer over the trigger would open it on
 // pointerenter first, so it is driven from the keyboard here.
 await page.mouse.move(590,390);await poll(async()=>!(await hovering()),'card closed at rest');
 await showButton().focus();await page.keyboard.press('Enter');await poll(hovering,'Show sidebar opens the peek card');
 await poll(async()=>(await peekBody().evaluate(node=>[node.inert,getComputedStyle(node).visibility].join()))==='false,visible','the card is visible and not inert');await shot('window-600-peek-dark');
 await page.keyboard.press('Enter');await poll(async()=>!(await hovering()),'a second click closes it');
 await page.keyboard.press('Enter');await poll(hovering,'opened again');
 await page.locator(`#frame-peek-popover [data-source-session-id="${ids[1]}"] [data-row-main-button]`).click();await poll(async()=>!(await hovering()),'opening a row closes the card');
 await onlySelected({row:'session',id:ids[1]},'row opened from the narrow card');assert.equal(await collapsedClass(),true);
 await page.mouse.move(590,390);await composer().focus();
 await page.keyboard.press('Meta+B');await poll(hovering,'⌘B opens the card while narrow');assert.equal(await collapsedClass(),true);
 await page.keyboard.press('Meta+B');await poll(async()=>!(await hovering()),'⌘B closes it');
 await clickViewSidebar();await poll(hovering,'View > Show/Hide Sidebar opens the card while narrow');
 // The composer's editor consumes Escape (prosemirror selectParentNode), so the unconsumed Escape comes from the page.
 await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Escape');await poll(async()=>!(await hovering()),'Escape closes it');
 await page.waitForTimeout(300);assert.equal(await saved(),false,'⌘B and the View item never wrote the preference while narrow');assert.equal(await collapsedClass(),true);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await poll(()=>page.evaluate(()=>innerWidth===760),'back to 760');
 await poll(async()=>!(await collapsedClass()),'760px docks the sidebar again');await hideButton().waitFor();assert.equal(await saved(),false);
 await newRow().click();await onlySelected({row:'nav:New',id:null},'New after the 600px check');
 report.checks.push('The window minimum is 600x400; at 600x400 (narrow viewport, max-width 700px) the frame collapses to Show sidebar without writing sidebarCollapsed, nothing overflows horizontally and the content keeps the full width; the trigger toggles the peek card, a row click closes it, ⌘B and View > Show/Hide Sidebar toggle the card; at 760px the sidebar is docked again');
 // Bucket truncation (sidebar-main.js:11657 Yn code truncateAt 20; sidebar-groups
 // bF/xF cut + BD/VD "Show {count} more" 7126-7231, 17516-17525): 45 real
 // fixture threads older than 30 days land in Older with group by date.
 step('truncate-seed');await app.close();app=null;
 const older=Array.from({length:45},(_,i)=>'sidebar-older-'+String(i).padStart(2,'0'));const db=await read('fixture-threads.json');
 for(const [i,id] of older.entries())db.threads[id]=thread(id,'Older session '+String(i).padStart(2,'0'),31*86400+i*60);
 await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify(db));const seeded=await read('preferences.json');
 await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...seeded,threadIds:[...ids,...older],sidebarPreferences:{...(seeded.sidebarPreferences||{}),groupBy:'date'}}));
 await launch();const olderGroup=page.locator('[data-group-key="older"]'),olderRows=olderGroup.locator('.source-session-row'),showMore=olderGroup.locator('.source-show-more');
 const rowOrder=()=>olderRows.evaluateAll(nodes=>nodes.map(node=>node.dataset.sourceSessionId));
 const expectRows=async(count,label)=>{await poll(async()=>await olderRows.count()===count,label);assert.deepEqual(await rowOrder(),older.slice(0,count));};
 await poll(async()=>await olderRows.count()>0,'older bucket');await expectRows(20,'20 older rows');
 assert.equal(await olderGroup.locator('[data-group-toggle] span').first().textContent(),'Older');
 assert.equal(await showMore.count(),1);assert.equal((await showMore.textContent()).trim(),'Show 20 more');assert.equal(await showMore.getAttribute('aria-label'),'Show 20 more in Older');
 const geometry=await showMore.evaluate(node=>{const style=getComputedStyle(node),scope=getComputedStyle(node.closest('.source-sidebar')),probe=document.createElement('span');probe.style.color='var(--cds-text-muted)';node.parentElement.append(probe);const muted=getComputedStyle(probe).color;probe.remove();
  const range=document.createRange();range.selectNodeContents([...node.childNodes].find(child=>child.nodeType===3&&child.textContent.trim()));const text=range.getBoundingClientRect(),title=document.querySelector('[data-group-key="older"] .source-session-title').getBoundingClientRect(),slot=node.querySelector('.source-leading-slot').getBoundingClientRect();
  return {height:style.height,rowH:scope.getPropertyValue('--df-row-h').trim(),fontSize:style.fontSize,rowFont:scope.getPropertyValue('--df-row-font').trim(),radius:style.borderTopLeftRadius,pill:scope.getPropertyValue('--df-radius-pill').trim(),
   paddingLeft:style.paddingLeft,rowPx:scope.getPropertyValue('--df-row-px').trim(),gap:style.columnGap,rowGap:scope.getPropertyValue('--df-row-gap').trim(),color:style.color,muted,slotWidth:slot.width,leadingSlot:scope.getPropertyValue('--df-leading-slot').trim(),textLeft:Math.round(text.left),titleLeft:Math.round(title.left),overflowAnchor:style.overflowAnchor,last:[...node.parentElement.children].filter(el=>!el.hidden&&el.getAttribute('role')!=='status').at(-1)===node};});
 // shared-21 H0 (21342-21356): the button is followed by its hidden description span and the S0 role=status announcer.
 report.metrics.showMore=geometry;assert.equal(geometry.height,geometry.rowH);assert.equal(geometry.fontSize,geometry.rowFont);assert.equal(geometry.radius,geometry.pill);assert.equal(geometry.paddingLeft,geometry.rowPx);assert.equal(geometry.gap,geometry.rowGap);
 assert.equal(geometry.color,geometry.muted);assert.equal(geometry.slotWidth+'px',geometry.leadingSlot);assert.equal(geometry.textLeft,geometry.titleLeft);assert.equal(geometry.overflowAnchor,'none');assert.equal(geometry.last,true);
 await shot('show-more-truncated-dark');
 report.checks.push('45 Older threads (group by date, code mode) render 20 rows then "Show 20 more" (aria-label "Show 20 more in Older"): row height/font/radius/padding/gap from --df-* tokens, text-muted, a leading-slot spacer aligning the label with row titles');
 step('truncate-reveal');await showMore.click();await expectRows(40,'40 older rows');assert.equal((await showMore.textContent()).trim(),'Show 5 more');assert.equal(await showMore.getAttribute('aria-label'),'Show 5 more in Older');
 // shared-21 H0 + xg showFewerRows 'collapse' (28248-28303): revealed to the end, the same button reads Show less.
 const showsLess=async()=>{assert.equal(await showMore.count(),1);assert.equal((await showMore.textContent()).trim(),'Show less');assert.equal(await showMore.getAttribute('aria-label'),'Show less in Older');};
 await showMore.click();await expectRows(45,'45 older rows');await showsLess();
 const toggleOlder=olderGroup.locator('[data-group-toggle]');await toggleOlder.click();await poll(async()=>await olderRows.count()===0,'older collapsed');await toggleOlder.click();await expectRows(45,'older reopened keeps reveal');await showsLess();
 // Show less folds back to the keep-visible floor (nothing open in Older: the first 20), then Show more reveals again.
 await showMore.click();await expectRows(20,'Show less folds to 20');assert.equal(await showMore.getAttribute('aria-label'),'Show 20 more in Older');
 await page.waitForTimeout(550);await showMore.click();await expectRows(40,'reveal after Show less');await showMore.click();await expectRows(45,'45 again');await showsLess();
 report.checks.push('Show more reveals 20 then the remaining 5 (label "Show 5 more"); at 45 the button reads Show less (shared-21 H0) and collapsing/reopening Older keeps all 45; Show less folds back to 20 ("Show 20 more")');
 // vF filter epoch (group/sort/status/activity; search is the ⌘K palette now and filters no rows): a sort change resets the reveal.
 const sortBy=async(label)=>{await filterButton().click();await filterMenu().getByRole('menuitem',{name:/^Sort by/}).click();await page.getByRole('menu',{name:'Sort by',exact:true}).getByRole('menuitemradio',{name:label,exact:true}).click();await filterMenu().waitFor({state:'detached'});};
 step('truncate-epoch');await sortBy('Date created');await expectRows(20,'a sort change resets reveal');assert.equal(await showMore.getAttribute('aria-label'),'Show 20 more in Older');
 await sortBy('Last activity');await expectRows(20,'sorting back keeps the reset');
 report.checks.push('A filter change (Sort by) resets the revealed rows to the first 20 (vF epoch)');
 step('truncate-keyboard');await olderRows.first().locator('[data-row-main-button]').focus();await page.keyboard.press('End');assert.equal(await showMore.evaluate(node=>node===document.activeElement),true);
 await page.keyboard.press('Enter');await expectRows(40,'keyboard reveal');await poll(()=>page.evaluate(()=>document.activeElement?.closest('[data-source-session-id]')?.dataset.sourceSessionId??null).then(id=>id===older[20]),'row 21 focused');
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[data-group-key="older"] .source-session-row')].indexOf(document.activeElement.closest('.source-session-row'))),20);
 report.checks.push('Roving End reaches the Show more button (hidden rows are not roving items); Enter reveals and focuses row 21');
 step('truncate-dark-narrow');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,768));await poll(()=>page.evaluate(()=>innerWidth===760),'760px truncation');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.mode),'dark');
 report.metrics.truncateDarkOverflow=await page.evaluate(()=>{const nav=document.querySelector('.source-session-list');return {doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth,nav:nav.scrollWidth-nav.clientWidth};});
 assert.deepEqual(report.metrics.truncateDarkOverflow,{doc:0,body:0,nav:0});await showMore.scrollIntoViewIfNeeded();await shot('show-more-dark-760');
 const olderTitled=await page.evaluate(()=>({bulk:document.querySelectorAll('.app-sidebar .source-older-menu').length,titled:[...document.querySelectorAll('.app-sidebar [title], .st-lead [title]')].map(node=>node.outerHTML.slice(0,120))}));report.metrics.olderTitled=olderTitled;
 assert.deepEqual(olderTitled,{bulk:1,titled:[]},'Older bulk trigger (Vz tooltip:false) and Show more add no native title');
 report.checks.push('Dark theme at 760px with the Show more row has no horizontal overflow in the document, body or session list; with the Older bulk trigger present the sidebar still has no [title]');
 step('scroll-fade');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,600));await poll(()=>page.evaluate(()=>innerHeight===600),'600px (window minHeight 580)');
 const nav=page.locator('nav.source-session-list');
 const navState=()=>nav.evaluate(node=>{const style=getComputedStyle(node);return {scrollTop:node.scrollTop,scrolled:node.getAttribute('data-scrolled'),mask:style.maskImage||style.webkitMaskImage,overflow:node.scrollHeight-node.clientHeight};});
 const scrollTo=async(top,scrolled,label)=>{await nav.evaluate((node,top)=>{node.scrollTop=top;},top);let last;try{await poll(async()=>{const state=last=await navState();return state.scrollTop===top&&state.scrolled===scrolled;},label);}catch(error){error.message+=' '+JSON.stringify(last);throw error;}return navState();};
 const top=await scrollTo(0,null,'nav at top');assert.equal(top.mask,'none');assert.ok(top.overflow>=40,'the list overflows');
 const faded=await scrollTo(40,'true','nav scrolled');assert.match(faded.mask,/linear-gradient/);report.metrics.scrolled=faded;await shot('nav-scrolled-fade');
 const back=await scrollTo(0,null,'nav back at top');assert.equal(back.mask,'none');report.metrics.scrolledTop=back;
 report.checks.push('Scrolling the session list 40px sets data-scrolled and the dframe-nav-scroll top mask (linear-gradient); at scrollTop 0 neither is present');
 // The heading's Filter button is opened by a dispatched click so it is never scrolled into view; the menu items live in the portal outside the nav.
 await scrollTo(40,'true','nav scrolled before group change');await filterButton().dispatchEvent('click');await filterMenu().waitFor();await filterMenu().getByRole('menuitem',{name:/^Group by/}).click();
 const groupMenu=page.getByRole('menu',{name:'Group by',exact:true});await groupMenu.waitFor();const before=await navState();assert.equal(before.scrollTop,40);assert.equal(before.scrolled,'true');
 await groupMenu.getByRole('menuitemradio',{name:'None',exact:true}).click();await filterMenu().waitFor({state:'detached'});
 await poll(async()=>{const state=await navState();return state.scrollTop===0&&state.scrolled===null;},'group change resets scroll');const reset=await navState();report.metrics.groupChangeReset={before,after:reset};
 assert.equal(reset.mask,'none');assert.ok(reset.overflow>=40,'still scrollable, so the reset is not a clamp');await poll(async()=>(await savedSidebar()).groupBy==='none','groupBy none saved');
 report.checks.push('Changing Group by while scrolled 40px (list still overflowing afterwards) resets scrollTop to 0 and clears data-scrolled (eO scrollResetKey)');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'sidebar-chrome-ui-report.json'),bytes);console.log(bytes);}
