import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Titlebar Changes toggle + pane shortcuts (0.2.105). Source: panes-toggle-current.js:3160-3172 diff spec
// {label "Changes", shortcut F("toggleDiff"), active p, activity n && !p}; cl (:3571-3593) ze side bottom around
// a ghost iconOnly Button with pressed/indicator/aria-label; sl (:3565-3570) 4px bg-fill-accent dot through the
// Button indicator grid (shared-frame-C_2npUJq.js:2885-2905); Ic (:3002-3012) dirty working tree.
// aR (shared-21-D098Wd--.js:14145-14187): toggleDiff cmd+shift+d, toggleBrowser cmd+shift+f; the view menu Files
// row carries F("toggleBrowser") (:3236-3253). Isolated profile + protocol fixture + throwaway git repo; only run
// through the offscreen run-suite adapter. Clipboard: only the run-suite in-memory store (file-header step).
// Pane body states + settings menu (0.2.106): ke (panes-diff-states-current.js:54-92) empty body
// div[data-diff-pane-body] around EmptyState (cc0a875c8-B6xI6vLN.js); fh (panes-tile-current.js:3692-3868)
// [diff-fold] | [diff-display] | [diff-refresh], only [diff-refresh] with an empty body; requestDiffFoldAll
// (panes-state-current.js:2809-2821). A PATH git shim logs every git the app spawns (as git-rail-ui-test).
// File header (0.2.122): c219730b0-DMsvWaVJ.js We (chevron He, ae file-kind icon, CDS tooltip {delay 150, side bottom,
// multiline, hoverable false} on the path), Ze (Open file, group/diff-file reveal) and $e (ContextMenu: Attach as
// context, c3e58cab4 Copy > Absolute/Relative path/Filename + toast "Copied to clipboard.", separator, Open file) over
// panes-diff-view-current.js:3700-3774 aa. The copy goes to run-suite's in-memory clipboard (saved/restored here).
// Changed files column (R10): dh ListBullet "Show files" + ⇧⌘Y (panes-tile-current.js:3640-3690), the fh diff-file-list group
// (:3740-3779), Ra/Ba tree + Ot resize + edge + banner (panes-diff-view-current.js:4096-4300, :5221-5330, :5530-5597),
// diffShowTree/width persisted (panes-state-current.js:646-647, cf3dc7910 epitaxy-diff-tree-width), large diffs collapsed.
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920');await fs.mkdir(evidence,{recursive:true});
const directory=await fs.mkdtemp(path.join(evidence,'changes-pane-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});
const git=(...args)=>execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','init.defaultBranch=main',...args],{cwd:workspace,env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'},encoding:'utf8'});
await fs.mkdir(path.join(workspace,'src'));await fs.writeFile(path.join(workspace,'README.md'),'# fixture\n');await fs.writeFile(path.join(workspace,'src/app.js'),'export const answer = 1;\n');await fs.writeFile(path.join(workspace,'notes.txt'),'notes\n');
// run.sh gets a mode-only change (100644 -> 100755, no hunks) in the no-body step.
await fs.writeFile(path.join(workspace,'run.sh'),'#!/bin/sh\necho fixture\n');
git('init','-q');git('add','.');git('commit','-q','-m','initial');
const dirty=async()=>{await fs.writeFile(path.join(workspace,'README.md'),'# fixture\nchanged line\n');await fs.writeFile(path.join(workspace,'src/app.js'),'export const answer = 2;\n');};
await dirty();assert.deepEqual(git('status','--porcelain').trimEnd().split('\n').map(l=>l.slice(3)).sort(),['README.md','src/app.js']);
const realGit=execFileSync('/usr/bin/which',['git'],{encoding:'utf8'}).trim(),shim=path.join(profile,'bin'),gitLog=path.join(profile,'git-calls.log');await fs.mkdir(shim);
await fs.writeFile(path.join(shim,'git'),`#!/bin/sh\nprintf '%s\\n' "$*" >> "${gitLog}"\nexec "${realGit}" "$@"\n`,{mode:0o755});
const gitLines=async()=>{try{return (await fs.readFile(gitLog,'utf8')).split('\n');}catch{return [];}};
// Both handlers snapshot with `status --porcelain=v1` (electron/git-status.cjs snapshot); only workspaceGitStatus runs the
// tracked `diff … --find-renames … --numstat` and only workspaceGitDiff the full `diff … --find-renames` without --numstat.
const gitCalls=async()=>{const lines=(await gitLines()).filter(l=>/(^|\s)diff\s/.test(l)&&l.includes('--find-renames'));return {status:lines.filter(l=>l.includes('--numstat')).length,diff:lines.filter(l=>!l.includes('--numstat')).length};};
const A='changes-pane-A',now=Math.floor(Date.now()/1000);
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:[A],sidebarWidth:288,displayName:'Fixture'}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[A]:{id:A,name:'Changes pane A',cwd:workspace,createdAt:now,updatedAt:now,archived:false,turns:[]}}}));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/pane-shortcuts.mjs','src/source-titlebar.jsx','src/source-titlebar.css','src/changes-menu-model.mjs','src/source-pane-states.jsx','src/source-pane-states.css','src/source-diff.jsx','src/diff-file-header-model.mjs','src/diff-file-list-model.mjs'])assert.ok(build.sources.some(e=>e.path===required),required);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version,build.version);
 const h=sha(await fs.readFile(path.join(root,'scripts/changes-pane-ui-test.mjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={suite:'changes-pane-ui',at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],clipboardSaved:false,clipboardRestored:false,passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('CHANGESPANE '+name);};
const env={...process.env,PATH:`${shim}:${process.env.PATH}`,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const frames=(count=4)=>page.evaluate(count=>new Promise(resolve=>{const step=()=>--count?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}),count);
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1280,820));await page.waitForFunction(()=>innerWidth===1280&&innerHeight===820);await frames();}
async function open(){await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await page.locator('.st-title').waitFor();await page.locator('.loading-state').waitFor({state:'detached'});await frames();}
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
const button=()=>page.locator('.st-trailing button[aria-label="Changes"]');
const indicator=()=>button().locator('[data-cds-part="indicator"]');
const diffTile=()=>page.locator('[data-pane-kind="diff"]'),filesTile=()=>page.locator('.source-side-tile[data-tile-id="files"]');
const tip='.source-tooltip-popup';
const menu=()=>page.getByRole('menu',{name:'Changes settings',exact:true});
// The titlebar Changes toggle sits where the opened tile's hover-intent arrange trigger lands, so park the pointer
// on the transcript after opening the tile and wait for that hover popup to close before measuring or capturing.
async function openTile(){await button().click();await diffTile().waitFor();await page.mouse.move(480,600);await page.locator('[role="menu"].spc-arrange').waitFor({state:'detached'});}
async function openSettings(){await diffTile().getByRole('button',{name:'Changes settings',exact:true}).click();await menu().waitFor();await frames();}
async function closeSettings(){await page.keyboard.press('Escape');await menu().waitFor({state:'detached'});}
const menuShape=()=>menu().evaluate(m=>[...m.querySelectorAll('[role^="menuitem"],[role="separator"]')].filter(n=>n.closest('[role="menu"]')===m)
 .map(n=>n.getAttribute('role')==='separator'?'|':{role:n.getAttribute('role'),label:n.querySelector('.smenu-label')?.textContent,disabled:n.getAttribute('aria-disabled')}));
const labels=shape=>shape.map(e=>e==='|'?e:e.label);
// fh order with a patch: [diff-file-list] | [diff-fold] | [diff-display] | [diff-refresh].
const FULL_MENU=['Show files','Group files by folder','Separate test, build, and generated files','|','Collapse all files','Expand all files','|','Side by side','Word wrap','Highlight changed words','Hide whitespace changes','|','Refresh'];
// R10 Changed files column locators.
const listToggle=()=>diffTile().locator('.source-pane-header [data-diff-file-list-toggle]'),fileTree=()=>diffTile().getByRole('tree',{name:'Changed files',exact:true});
const listColumn=()=>diffTile().locator('.sdiff-file-list'),listEdge=()=>diffTile().getByRole('separator',{name:'Show files',exact:true}),listDivider=()=>diffTile().getByRole('separator',{name:'Resize file list',exact:true});
const listShown=async()=>await fileTree().count()===1;
const listWidth=()=>listColumn().evaluate(n=>n.getBoundingClientRect().width);
const treeRows=()=>fileTree().evaluate(t=>[...t.querySelectorAll('[data-diff-tree-row]')].map(r=>[r.getAttribute('aria-level'),r.querySelector('[dir=ltr][aria-label]')?.getAttribute('aria-label')??r.querySelector('.truncate')?.textContent,r.getAttribute('aria-current')]));
const bodyOrder=()=>diffTile().locator('.sdiff-file').evaluateAll(nodes=>nodes.map(n=>n.dataset.filePath));
const storedTiles=()=>page.evaluate(()=>{const v=JSON.parse(localStorage.getItem('code-desktop-tiles')||'{}');return {shown:v.diffShowTree,width:v.diffTreeWidth,tree:v.diffFileTree,kind:v.diffGroupByKind};});
async function drag(locator,delta){const box=await locator.boundingBox();assert.ok(box,'resize handle visible');const x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta,y,{steps:6});await page.mouse.up();await frames();}
const filePaths=()=>diffTile().locator('.sdiff-file').evaluateAll(nodes=>nodes.map(n=>n.dataset.filePath).sort());
const toggles=()=>diffTile().locator('.sdiff-file-toggle').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-expanded')));
async function choose(name){await menu().getByRole('menuitem',{name,exact:true}).click();await menu().waitFor({state:'detached'});}
const emptyTitle=()=>diffTile().locator('[data-diff-pane-body] .source-empty-state p');
// EmptyState geometry and colors against the tile body; the probe resolves --cds-text-primary in the live theme.
const emptyProbe=()=>diffTile().evaluate(tile=>{const body=tile.querySelector('[data-diff-pane-body]'),root=body.querySelector('.source-empty-state'),title=root.querySelector('p'),s=getComputedStyle(title),r=title.getBoundingClientRect(),b=body.getBoundingClientRect(),header=tile.querySelector('.source-pane-header')?.getBoundingClientRect();
 const probe=document.createElement('span');probe.style.color='var(--cds-text-primary)';body.append(probe);const primary=getComputedStyle(probe).color;probe.remove();
 return {text:title.textContent,tabIndex:body.tabIndex,role:root.getAttribute('role'),icons:root.querySelectorAll('[data-cds="Icon"]').length,textAlign:getComputedStyle(root).textAlign,titleAlign:s.textAlign,color:s.color,primary,
  dx:(r.left+r.right)/2-(b.left+b.right)/2,dy:(r.top+r.bottom)/2-(b.top+b.bottom)/2,bodyTop:b.top,headerBottom:header?.bottom??null,bodyBottom:b.bottom,tileBottom:tile.getBoundingClientRect().bottom};});
// F12: the default diff scope is "All changes" (panes-tile-current.js:3547 uncommittedOnly only for the uncommitted scope).
function assertEmpty(probe,label){assert.equal(probe.text,'No changes to show',label);assert.equal(probe.tabIndex,-1);assert.equal(probe.role,null);assert.equal(probe.icons,0);
 assert.equal(probe.textAlign,'center');assert.equal(probe.titleAlign,'center');assert.equal(probe.color,probe.primary,label+' title is --cds-text-primary');
 assert.ok(Math.abs(probe.dx)<=1,label+' centered horizontally '+probe.dx);assert.ok(Math.abs(probe.dy)<=1,label+' centered vertically '+probe.dy);
 assert.ok(probe.headerBottom===null||probe.bodyTop>=probe.headerBottom-.5,'body starts below the pane header');assert.ok(Math.abs(probe.bodyBottom-probe.tileBottom)<=1.5,label+' body fills to the tile bottom');}
async function neutral(){await page.mouse.move(640,700);await page.waitForFunction(s=>!document.querySelector(s),tip);}
const toasts=()=>page.locator('.source-toast-card:not([data-phase="ending"]) .source-toast-message').allTextContents();
// Save every format of the adapter's isolated store before copying; restore it before the dark relaunch (and in finally).
async function saveClipboard(){assert.equal(await app.evaluate(()=>!!globalThis.offscreenClipboard),true,'the file-header copy requires the offscreen in-memory clipboard');
 await app.evaluate(async({clipboard,ClipboardItem})=>{const originals=await clipboard.read();globalThis.changesPaneClipboard=await Promise.all(originals.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));});report.clipboardSaved=true;}
async function restoreClipboard(){await app.evaluate(async({clipboard})=>{const saved=globalThis.changesPaneClipboard;if(!saved)throw Error('Clipboard backup unavailable');if(saved.length)await clipboard.write(saved);else await clipboard.clear();delete globalThis.changesPaneClipboard;});report.clipboardRestored=true;}
const contextMenu=()=>page.locator('[data-cds="ContextMenu"]');
const itemsOf=locator=>locator.evaluate(m=>[...m.querySelectorAll('[role^="menuitem"],[role="separator"]')].filter(n=>n.closest('[role="menu"]')===m).map(n=>n.getAttribute('role')==='separator'?'|':(n.querySelector('.smenu-label')?.textContent??n.textContent).trim()));
try{
 await integrity();await launch();await open();
 step('dirty-dot');await indicator().waitFor();
 const dot=await button().evaluate(node=>{const indicator=node.querySelector('[data-cds-part="indicator"]'),dot=indicator.firstElementChild,s=getComputedStyle(dot),probe=document.createElement('span');
  probe.style.backgroundColor='var(--cds-fill-accent)';node.append(probe);const accent=getComputedStyle(probe).backgroundColor;probe.remove();
  const icon=indicator.previousElementSibling.getBoundingClientRect(),r=dot.getBoundingClientRect(),w=indicator.getBoundingClientRect(),grid=getComputedStyle(indicator.parentElement),is=getComputedStyle(indicator);
  return {title:node.getAttribute('title'),pressed:node.getAttribute('aria-pressed'),keys:node.getAttribute('aria-keyshortcuts'),ariaHidden:indicator.getAttribute('aria-hidden'),count:node.querySelectorAll('[data-cds-part="indicator"]').length,
   width:s.width,height:s.height,radius:s.borderTopLeftRadius,background:s.backgroundColor,accent,display:grid.display,alignSelf:is.alignSelf,justifySelf:is.justifySelf,position:is.position,
   dotMargins:[s.marginInlineEnd,s.marginTop],indicatorMargins:[is.marginInlineEnd,is.marginTop],dot:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},icon:{x:icon.x,y:icon.y,right:icon.right,bottom:icon.bottom},wrapper:{right:w.right,top:w.top}};});
 report.metrics.dot=dot;
 assert.equal(dot.title,null);assert.equal(dot.pressed,'false');assert.equal(dot.keys,'Meta+Shift+D');assert.equal(dot.ariaHidden,'true');assert.equal(dot.count,1);
 assert.equal(dot.width,'4px');assert.equal(dot.height,'4px');assert.equal(dot.background,dot.accent);assert.notEqual(dot.accent,'rgba(0, 0, 0, 0)');assert.equal(dot.display,'grid');
 assert.equal(dot.alignSelf,'start');assert.equal(dot.justifySelf,'end');assert.equal(dot.position,'relative');assert.deepEqual(dot.dotMargins,['-1px','-1px']);assert.deepEqual(dot.indicatorMargins,['-1px','-1px']);
 // Overlays the icon's top-right corner: the dot sits inside the icon box's top-right quadrant, nudged out by the -1px margins.
 assert.ok(dot.dot.right>dot.icon.right-1&&dot.dot.right<=dot.icon.right+2.01,'dot right edge at icon right');assert.ok(dot.dot.y>=dot.icon.y-2.01&&dot.dot.y<dot.icon.y+1,'dot top edge at icon top');
 await button().screenshot({path:path.join(directory,'changes-dirty-button.png')});await shot('changes-dirty');
 report.checks.push('Dirty repo + closed pane: button[aria-label=Changes] (no title, aria-pressed false, aria-keyshortcuts Meta+Shift+D) holds one aria-hidden [data-cds-part=indicator] grid overlay whose 4x4px dot is --cds-fill-accent at the icon top-right corner');
 step('tooltip');await neutral();await button().hover();
 await page.waitForFunction(s=>{const n=document.querySelector(s);return n?.dataset.state==='open'&&n.querySelector('.source-tooltip-label')?.textContent==='Changes'&&getComputedStyle(n).opacity==='1';},tip);
 const tipInfo=await page.locator(tip).evaluate(n=>({label:n.querySelector('.source-tooltip-label').textContent,shortcut:(c=>c&&[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''))(n.querySelector('.source-tooltip-shortcut')),top:n.getBoundingClientRect().top}));
 const box=await button().boundingBox();report.metrics.tooltip={...tipInfo,buttonBottom:box.y+box.height};
 // Fidelity F02: Mu draws the cmd+shift+d spec in io order (shared-frame-C_2npUJq.js:2136, :4572-4580).
 assert.equal(tipInfo.label,'Changes');assert.equal(tipInfo.shortcut,'⇧⌘D');assert.ok(tipInfo.top>=box.y+box.height,'tooltip below the button');await shot('changes-tooltip');await neutral();
 report.checks.push('Hover shows the CDS tooltip "Changes" with the ⇧⌘D shortcut below the button');
 step('meta-shift-d');await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor();await poll(async()=>await button().getAttribute('aria-pressed')==='true','pressed');
 assert.equal(await indicator().count(),0);await frames();await shot('changes-open');
 const repeat=await page.evaluate(()=>{const e=new KeyboardEvent('keydown',{code:'KeyD',key:'D',metaKey:true,shiftKey:true,repeat:true,bubbles:true,cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
 await frames();assert.equal(repeat,true);assert.equal(await diffTile().count(),1,'a held repeat does not toggle');
 await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor({state:'detached'});await poll(async()=>await button().getAttribute('aria-pressed')==='false','unpressed');await indicator().waitFor();
 report.checks.push('Meta+Shift+D opens the Changes tile (data-pane-kind=diff), aria-pressed true and the dot hidden; a repeat is preventDefaulted without toggling; pressing again closes it and the dot returns');
 step('meta-shift-f');await page.keyboard.press('Meta+Shift+F');await filesTile().waitFor();assert.equal(await diffTile().count(),0);assert.equal(await button().getAttribute('aria-pressed'),'false');
 await page.keyboard.press('Meta+Shift+F');await filesTile().waitFor({state:'detached'});
 report.checks.push('Meta+Shift+F opens and closes the Files tile');
 step('view-menu');await page.getByRole('button',{name:'View options',exact:true}).click();const files=page.getByRole('menuitemcheckbox',{name:'Files',exact:true});await files.waitFor();
 const row=await files.evaluate(n=>({keys:n.getAttribute('aria-keyshortcuts'),caps:(c=>c&&[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''))(n.querySelector('.smenu-shortcut'))}));report.metrics.filesRow=row;
 assert.equal(row.keys,'Meta+Shift+F');assert.equal(row.caps,'⇧⌘F');
 // Besides Files, only the Preview (⇧⌘P) and Terminal (⌘J) rows carry their pane chords.
 const others=await page.locator('.st-view-item').evaluateAll(nodes=>nodes.filter(n=>!/Files|Preview|Terminal/.test(n.textContent)).map(n=>!!n.querySelector('.smenu-shortcut')));assert.ok(others.every(v=>!v));
 report.metrics.viewRows=await page.locator('.st-view-item').evaluateAll(nodes=>nodes.map(n=>[n.textContent.replace(/[⇧⌘⌃⌥].*$/,'').trim(),n.getAttribute('aria-keyshortcuts')]));
 for(const [label,keys] of report.metrics.viewRows){if(label==='Terminal')assert.equal(keys,'Meta+J');if(label==='Preview')assert.equal(keys,'Meta+Shift+P');}
 await shot('view-menu-files');await page.keyboard.press('Escape');await files.waitFor({state:'detached'});
 report.checks.push('The view menu Files row shows the ⇧⌘F caps (aria-keyshortcuts Meta+Shift+F); no other pane row carries a shortcut');
 step('settings-guard');await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await page.keyboard.press('Meta+Shift+D');await page.keyboard.press('Meta+Shift+F');await page.waitForTimeout(300);assert.equal(await diffTile().count(),0);assert.equal(await filesTile().count(),0);
 await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});assert.equal(await diffTile().count(),0);
 report.checks.push('With Settings open, Meta+Shift+D / Meta+Shift+F do nothing');
 step('changes-menu');await openTile();await poll(async()=>(await filePaths()).length===2,'two changed files');
 assert.deepEqual(await filePaths(),['README.md','src/app.js']);assert.deepEqual(await toggles(),['true','true']);await frames();await shot('changes-diff-light');
 await openSettings();let shape=await menuShape();report.metrics.menu=shape;
 assert.deepEqual(labels(shape),FULL_MENU);
 assert.deepEqual(shape.filter(e=>e!=='|').map(e=>e.role),['menuitemcheckbox','menuitemcheckbox','menuitemcheckbox','menuitem','menuitem','menuitemcheckbox','menuitemcheckbox','menuitemcheckbox','menuitemcheckbox','menuitem']);assert.ok(shape.filter(e=>e!=='|').every(e=>e.disabled!=='true'),'no item disabled');
 await shot('changes-menu-light');
 report.checks.push('Dirty repo with 2 files: the Changes settings menu is Show files, Group files by folder, Separate test, build, and generated files | Collapse all files, Expand all files | Side by side, Word wrap, Highlight changed words, Hide whitespace changes | Refresh with role=separator between the groups (fh order)');
 step('collapse-all');await choose('Collapse all files');await poll(async()=>(await toggles()).every(v=>v==='false'),'all collapsed');assert.equal(await diffTile().locator('.sdiff-file-body').count(),0);
 await diffTile().locator('.sdiff-file-toggle').first().click();await poll(async()=>(await toggles()).join()==='true,false','manual toggle after collapse all');
 step('expand-all');await openSettings();await choose('Expand all files');await poll(async()=>(await toggles()).every(v=>v==='true'),'all expanded');assert.equal(await diffTile().locator('.sdiff-file-body').count(),2);
 await openSettings();await choose('Collapse all files');await poll(async()=>(await toggles()).every(v=>v==='false'),'collapsed again');await openSettings();await choose('Expand all files');await poll(async()=>(await toggles()).every(v=>v==='true'),'expanded again');
 report.checks.push('Collapse all files sets every .sdiff-file-toggle aria-expanded=false (no bodies); a manual toggle still works afterwards; Expand all files sets them all true; repeated requests apply each time');
 // B14 D4/D5 (c44d00c7f ha/ga :2732-2810, yo :3564-3860): the gutter '+' opens an inline 'Tell Claude what to change' card
 // under its row; Save attaches a keyed composer snippet and Delete detaches it; a right-click on the diff body opens
 // Attach as context / Add comment / Copy.
 step('diff-comments');await neutral();{
 const readme=diffTile().locator('.sdiff-file[data-file-path="README.md"]'),commentRow=readme.locator('.sdiff-row[data-commentable]').first();
 await commentRow.scrollIntoViewIfNeeded();await commentRow.hover();
 const gutterAdd=commentRow.locator('button[aria-label="Add comment on this line"]');await gutterAdd.click();
 const draft=readme.getByPlaceholder('Tell Claude what to change',{exact:true});await draft.waitFor();
 assert.equal(await draft.evaluate(n=>n===document.activeElement),true,'the new card takes focus');
 await draft.fill('Rename this heading');await readme.getByRole('button',{name:'Save comment',exact:true}).click();
 // R4i-gui GU1 (R4g-composer CP4): a snippet is c0fbbe82d Hi > vr, the MessageAttachmentsQuote tile (data-cds-attachment root),
 // named by its label: its remove control reads "Remove {label}" (chat-composer-attachments.mjs dp).
 const snippetPill=page.locator('.sc-composer [data-cds-attachment][data-cds="MessageAttachmentsQuote"]');await poll(async()=>await snippetPill.count()===1,'Save attaches one composer snippet');
 assert.match(await snippetPill.locator('[data-cds-attachment-remove]').getAttribute('aria-label'),/^Remove README\.md:L\d+$/,'the snippet tile is named by the file and line');
 await readme.locator('.sfv-comment-body').filter({hasText:'Rename this heading'}).waitFor();
 await readme.getByRole('button',{name:'Delete comment',exact:true}).click();
 await poll(async()=>await snippetPill.count()===0,'Delete detaches the snippet');assert.equal(await readme.locator('[data-file-comment-card]').count(),0);
 await neutral();await readme.locator('.sdiff-row .sdiff-code-cell').first().click({button:'right'});
 const bodyMenu=page.getByRole('menu',{name:'README.md actions',exact:true});await bodyMenu.waitFor();
 assert.deepEqual((await bodyMenu.getByRole('menuitem').allTextContents()).map(text=>text.replace(/[⇧⌘⌃⌥].*$/,'').trim()),['Attach as context','Add comment','Copy']);
 await page.keyboard.press('Escape');await bodyMenu.waitFor({state:'detached'});
 report.checks.push("Diff line comments: hovering a row shows the gutter 'Add comment on this line'; it opens a focused 'Tell Claude what to change' card under the row; Save attaches a README.md:L<n> composer snippet and leaves the saved card; Delete removes the card and the snippet; a right-click on a code row opens 'README.md actions' with Attach as context / Add comment / Copy");}
 step('file-header');await neutral();await saveClipboard();
 const appFile=()=>diffTile().locator('.sdiff-file[data-file-path="src/app.js"]'),appHeader=()=>appFile().locator('.sdiff-header'),openWrap=()=>appFile().locator('.sdiff-open-file');
 assert.equal(await diffTile().locator('.sdiff-header [title]').count(),0,'no native title in a modified-file header');
 assert.equal(await diffTile().getByRole('button',{name:/Copy patch/}).count(),0);assert.equal(await diffTile().locator('.sdiff-header [role="status"]').count(),0);
 // We CDS tooltip on the path: delay 150 from pointer entry, below the path, text = the path.
 await page.evaluate(()=>{const target=document.querySelector('[data-pane-kind="diff"] .sdiff-file[data-file-path="src/app.js"] .sdiff-path');window.__pathTip={};
  target.addEventListener('pointerenter',()=>{window.__pathTip.enter??=performance.now();});
  new MutationObserver((_,observer)=>{const node=[...document.querySelectorAll('[data-cds="Tooltip"]')].find(n=>n.textContent.includes('src/app.js'));if(node&&window.__pathTip.enter!=null){window.__pathTip.shown=performance.now();observer.disconnect();}}).observe(document.body,{childList:true,subtree:true,attributes:true});});
 await appFile().locator('.sdiff-path').hover();await page.waitForFunction(()=>window.__pathTip.shown!=null);
 const pathTip=await page.evaluate(()=>{const node=[...document.querySelectorAll('[data-cds="Tooltip"]')].find(n=>n.textContent.includes('src/app.js')),path=document.querySelector('[data-pane-kind="diff"] .sdiff-file[data-file-path="src/app.js"] .sdiff-path').getBoundingClientRect();
  return {delay:window.__pathTip.shown-window.__pathTip.enter,text:node.querySelector('.source-tooltip-label')?.textContent??node.textContent,top:node.querySelector('.source-tooltip-popup')?.getBoundingClientRect().top??node.getBoundingClientRect().top,pathBottom:path.bottom};});
 report.metrics.pathTooltip=pathTip;assert.equal(pathTip.text,'src/app.js');assert.ok(pathTip.delay>=140&&pathTip.delay<2000,'tooltip opens after the 150ms delay: '+pathTip.delay);assert.ok(pathTip.top>=pathTip.pathBottom,'tooltip below the path');
 await page.waitForFunction(s=>{const n=document.querySelector(s);return n?.dataset.state==='open'&&n.textContent.includes('src/app.js')&&getComputedStyle(n).opacity==='1';},tip);
 await shot('changes-path-tooltip');await neutral();
 report.checks.push('Hovering a Changes file path shows [data-cds=Tooltip] "src/app.js" below it about 150ms after pointer entry (We CDS tooltip delay 150, side bottom); the header has no native title, no Copy patch button and no status line');
 // Ze: hidden until the group/diff-file header is hovered; the w-control reserve matches the button; Open file opens the Files pane.
 // The path hover above also hovered the header, so wait for the transition-opacity fade to settle at 0.
 await poll(async()=>await openWrap().evaluate(n=>getComputedStyle(n).opacity)==='0','Open file hidden away from the header');
 await appHeader().hover({position:{x:24,y:16}});await poll(async()=>await openWrap().evaluate(n=>getComputedStyle(n).opacity)==='1','Open file revealed on header hover');
 const ze=await appFile().evaluate(file=>{const header=file.querySelector('.sdiff-header').getBoundingClientRect(),button=file.querySelector('.sdiff-open-file [data-cds="Button"]').getBoundingClientRect(),spacer=file.querySelector('.sdiff-file-toggle [data-size="xs"].w-control').getBoundingClientRect();
  return {buttonWidth:button.width,spacerWidth:spacer.width,rightInset:header.right-button.right,height:button.height,label:file.querySelector('.sdiff-open-file [data-cds="Button"]').getAttribute('aria-label')};});
 report.metrics.openFile=ze;assert.equal(ze.label,'Open file');assert.ok(Math.abs(ze.buttonWidth-ze.spacerWidth)<=0.5,'reserve equals the xs control');assert.ok(Math.abs(ze.rightInset-8)<=0.5,'pr-md inset '+ze.rightInset);
 await shot('changes-open-file-hover');
 await appFile().getByRole('button',{name:'Open file',exact:true}).click();await filesTile().waitFor();
 await poll(async()=>(await filesTile().getByRole('tab').allTextContents()).some(t=>t.includes('app.js')),'app.js tab in the Files pane');
 await poll(async()=>((await filesTile().textContent())||'').includes('export const answer = 2;'),'app.js contents in the Files pane');await shot('changes-open-file-files-pane');
 await page.keyboard.press('Meta+Shift+F');await filesTile().waitFor({state:'detached'});await neutral();
 report.checks.push('The Open file wrapper (Ze) is opacity 0 until the header is hovered, then 1; its xs ghost button sits pr-md (8px) from the header edge with a same-width w-control reserve in the row; clicking it opens src/app.js in the Files pane');
 // Chevron He rotates -90deg while collapsed (-rotate-90 on the svg).
 const chevron=()=>appFile().locator('.sdiff-chevron svg').evaluate(n=>getComputedStyle(n).rotate);assert.equal(await chevron(),'none');
 await appFile().locator('.sdiff-file-toggle').click();await poll(async()=>await chevron()==='-90deg','collapsed chevron');assert.equal(await appFile().locator('.sdiff-file-toggle').getAttribute('aria-expanded'),'false');
 await appFile().locator('.sdiff-file-toggle').click();await poll(async()=>await chevron()==='none','expanded chevron');assert.equal(await appFile().locator('.sdiff-file-toggle').getAttribute('aria-expanded'),'true');await neutral();
 report.checks.push('The header chevron svg computes rotate -90deg while the file is collapsed and none when expanded');
 // $e ContextMenu (c219730b0 Gt): Attach as context, Copy (c3e58cab4 submenu right/start/-4), separator, Open file, then
 // B16 renderFileMenuItems (c856385e2 tn): Open in ▸ installed editors (only when this machine has any) and Show in Finder.
 const fileMenuTail=items=>items.slice(items[4]==='Open in'?5:4);
 await appHeader().click({button:'right',position:{x:120,y:16}});await contextMenu().waitFor();
 {const items=await itemsOf(contextMenu());report.metrics.headerMenu=items;assert.deepEqual(items.slice(0,4),['Attach as context','Copy','|','Open file']);assert.deepEqual(fileMenuTail(items),['Show in Finder']);}
 const copyTrigger=contextMenu().getByRole('menuitem',{name:'Copy',exact:true});await copyTrigger.hover();const copyMenu=page.getByRole('menu',{name:'Copy',exact:true});await copyMenu.waitFor();await frames();
 assert.deepEqual(await itemsOf(copyMenu),['Absolute path','Relative path','Filename']);
 // A submenu is anchored horizontally to its parent popup's edge (menu-model nestedAnchor, Base UI), so side right
 // with sideOffset -4 puts its left edge 4px inside the root ContextMenu's right edge.
 const root=await contextMenu().boundingBox(),sub=await copyMenu.boundingBox();report.metrics.copySubmenu={rootRight:root.x+root.width,subLeft:sub.x};
 assert.ok(Math.abs(sub.x-(root.x+root.width-4))<=1.5,'submenu side right with sideOffset -4');await shot('changes-context-copy');
 await copyMenu.getByRole('menuitem',{name:'Relative path',exact:true}).click();await contextMenu().waitFor({state:'detached'});
 await poll(async()=>(await toasts()).includes('Copied to clipboard.'),'copy toast');assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),'src/app.js');
 await restoreClipboard();
 report.checks.push('Right-clicking the header opens [data-cds=ContextMenu] Attach as context, Copy, separator, Open file (then Open in when editors are installed, and Show in Finder); Copy opens its submenu on the right (-4px) with Absolute path, Relative path, Filename; Relative path writes "src/app.js" to the in-memory clipboard with the toast "Copied to clipboard."');
 await appHeader().click({button:'right',position:{x:120,y:16}});await contextMenu().waitFor();await contextMenu().getByRole('menuitem',{name:'Attach as context',exact:true}).click();await contextMenu().waitFor({state:'detached'});
 const pill=page.locator('[data-cds-attachment][data-cds="MessageAttachmentsFile"]').filter({has:page.getByRole('button',{name:'app.js',exact:true})});await pill.waitFor();await shot('changes-attach-context');
 await pill.hover();await page.getByRole('button',{name:'Remove app.js',exact:true}).click();await pill.waitFor({state:'detached'});await neutral();
 report.checks.push('Attach as context stages src/app.js as a composer file attachment (the path-referenced mention lane); removing it clears the pill');
 step('refresh');await frames();await page.evaluate(()=>{window.__changesFocus=0;window.addEventListener('focus',()=>window.__changesFocus++);});const before=await gitCalls();await fs.writeFile(path.join(workspace,'notes.txt'),'notes\nthird file\n');
 await openSettings();await choose('Refresh');await poll(async()=>(await filePaths()).length===3,'third file after Refresh');assert.deepEqual(await filePaths(),['README.md','notes.txt','src/app.js']);
 await page.waitForTimeout(600);const after=await gitCalls();report.metrics.refreshCalls={before,after};
 assert.equal(after.status-before.status,1,'one workspace-git-status per Refresh');assert.equal(after.diff-before.diff,1,'one workspace-git-diff per Refresh');
 assert.equal(await page.evaluate(()=>window.__changesFocus),0,'no window focus event was involved');
 report.checks.push('Modifying a third file on disk and choosing Refresh shows it without a window focus event; one Refresh ran exactly one git status and one full git diff');
 // No body (panes-diff-view-current.js:3279 hasBody = meta && hunks.length > 0; aa :3717-3723; We disabled): a mode-only
 // change is aria-disabled with no aria-expanded/aria-controls and no onClick, its chevron span is opacity-40 and the svg stays
 // -rotate-90; click, Enter and Expand all files never give it a body; W 'Made executable' + counts +0/−0 (We renders them
 // unconditionally); the tooltip applies the W suffix; the header stays the $e ContextMenu trigger.
 step('no-body');await fs.chmod(path.join(workspace,'run.sh'),0o755);await openSettings();await choose('Refresh');
 await poll(async()=>(await filePaths()).length===4,'mode-only file after Refresh');assert.deepEqual(await filePaths(),['README.md','notes.txt','run.sh','src/app.js']);
 const runFile=()=>diffTile().locator('.sdiff-file[data-file-path="run.sh"]'),runToggle=()=>runFile().locator('.sdiff-file-toggle');
 const noBody=()=>runFile().evaluate(file=>{const toggle=file.querySelector('.sdiff-file-toggle'),chevron=file.querySelector('.sdiff-chevron');
  return {disabled:toggle.getAttribute('aria-disabled'),expanded:toggle.getAttribute('aria-expanded'),controls:toggle.getAttribute('aria-controls'),cursor:getComputedStyle(toggle).cursor,
   opacity:getComputedStyle(chevron).opacity,rotate:getComputedStyle(chevron.querySelector('svg')).rotate,labels:[...file.querySelectorAll('.sdiff-row-label')].map(n=>n.textContent),
   counts:[...file.querySelectorAll('.sdiff-counts > span')].map(n=>n.textContent),bodies:file.querySelectorAll('.sdiff-file-body').length,filler:/No text hunks/.test(file.textContent)};});
 const expectNoBody=async label=>{const probe=await noBody();report.metrics.noBody??=probe;assert.deepEqual(probe,{disabled:'true',expanded:null,controls:null,cursor:'default',opacity:'0.4',rotate:'-90deg',
  labels:['Made executable'],counts:['+0','−0'],bodies:0,filler:false},label);};
 await frames();await expectNoBody('after Refresh');
 // Playwright's actionability check treats aria-disabled as not enabled, so force the (real) pointer click.
 await runToggle().click({force:true});await frames();await expectNoBody('after a click');
 await runToggle().focus();await page.keyboard.press('Enter');await frames();await expectNoBody('after Enter');
 await openSettings();await choose('Expand all files');await frames();await expectNoBody('after Expand all files');
 assert.equal(await diffTile().locator('.sdiff-file-body').count(),3,'the three files with hunks keep their bodies');
 await neutral();await runFile().locator('.sdiff-path').hover();
 await page.waitForFunction(s=>{const n=document.querySelector(s);return n?.dataset.state==='open'&&n.textContent.includes('run.sh (made executable)')&&getComputedStyle(n).opacity==='1';},tip);
 await shot('changes-no-body');await neutral();
 await runFile().locator('.sdiff-header').click({button:'right',position:{x:120,y:16}});await contextMenu().waitFor();
 {const items=await itemsOf(contextMenu());assert.deepEqual(items.slice(0,4),['Attach as context','Copy','|','Open file']);assert.deepEqual(fileMenuTail(items),['Show in Finder']);}await page.keyboard.press('Escape');await contextMenu().waitFor({state:'detached'});await neutral();
 report.checks.push('A mode-only change (run.sh 100644 -> 100755, no hunks) renders the aa no-body header: aria-disabled="true" without aria-expanded/aria-controls, cursor default, chevron span opacity 0.4 with the svg at -90deg; click, Enter and Expand all files add no body and no filler text; W "Made executable", counts +0/−0, tooltip "run.sh (made executable)"; right-click still opens the ContextMenu');
 // F12 zm diff scope (panes-tile-current.js:2949-3110): a ghost "Diff scope: main → working tree" trigger in place of the
 // title, popup side bottom / align start with All changes (vs main) | Compare against; Uncommitted changes refetches.
 step('scope');await neutral();
 const scopeTrigger=name=>diffTile().getByRole('button',{name,exact:true}),scopeMenu=()=>page.getByRole('menu',{name:'Diff scope',exact:true});
 await scopeTrigger('Diff scope: main → working tree').waitFor();
 report.metrics.scopeTrigger=await scopeTrigger('Diff scope: main → working tree').evaluate(n=>{const probe=document.createElement('span');probe.style.color='var(--cds-text-secondary)';document.body.append(probe);const secondary=getComputedStyle(probe).color;probe.remove();
  return {variant:n.dataset.variant,parts:[...n.querySelectorAll('.sds-part')].map(p=>p.textContent),arrow:n.querySelector('.sds-arrow')?.getAttribute('aria-label'),partColor:getComputedStyle(n.querySelector('.sds-part')).color,secondary};});
 assert.equal(report.metrics.scopeTrigger.variant,'ghost');assert.deepEqual(report.metrics.scopeTrigger.parts,['main','working tree']);assert.equal(report.metrics.scopeTrigger.arrow,'to');
 assert.equal(report.metrics.scopeTrigger.partColor,report.metrics.scopeTrigger.secondary,'label spans are text-secondary');
 await scopeTrigger('Diff scope: main → working tree').click();await scopeMenu().waitFor();await frames();
 report.metrics.scopeMenu=await scopeMenu().evaluate(m=>[...m.querySelectorAll('[role^="menuitem"],[role="separator"]')].filter(n=>n.closest('[role="menu"]')===m)
  .map(n=>n.getAttribute('role')==='separator'?'|':[n.querySelector('.smenu-label')?.textContent,n.getAttribute('aria-checked'),n.querySelector('.smenu-hint')?.textContent??null]));
 assert.deepEqual(report.metrics.scopeMenu,[['All changes','true','vs main'],['Uncommitted changes','false',null],'|',['Compare against',null,'main']]);
 report.metrics.scopeAlign=await page.evaluate(()=>({trigger:document.querySelector('[data-pane-kind="diff"] .sds-trigger').getBoundingClientRect().left,menu:[...document.querySelectorAll('[role=menu]')].find(n=>n.getAttribute('aria-label')==='Diff scope').getBoundingClientRect().left}));
 assert.ok(Math.abs(report.metrics.scopeAlign.trigger-report.metrics.scopeAlign.menu)<=1,'scope popup align start '+JSON.stringify(report.metrics.scopeAlign));await shot('changes-scope-menu');
 const scopeBefore=await gitCalls();await scopeMenu().getByRole('menuitemradio',{name:'Uncommitted changes',exact:true}).click();await scopeMenu().waitFor({state:'detached'});
 await scopeTrigger('Diff scope: Uncommitted changes').waitFor();await poll(async()=>(await gitCalls()).diff===scopeBefore.diff+1,'uncommitted scope refetch');
 await poll(async()=>(await filePaths()).length===4,'uncommitted scope files');
 await scopeTrigger('Diff scope: Uncommitted changes').click();await scopeMenu().waitFor();await scopeMenu().getByRole('menuitemradio',{name:/^All changes/}).click();
 await scopeTrigger('Diff scope: main → working tree').waitFor();await poll(async()=>(await gitCalls()).diff===scopeBefore.diff+2,'branch scope refetch');await poll(async()=>(await filePaths()).length===4,'branch scope files');
 report.checks.push('The Changes title is the ghost "Diff scope: main → working tree" trigger (text-secondary parts around an ArrowRight "to"); its start-aligned popup lists All changes (vs main, checked) and Uncommitted changes | Compare against (main); choosing Uncommitted changes and back each refetch the diff once');
 // F12 panes-tile-current.js:3805-3835 + gn/Tn: an indent-only edit hides behind 'Whitespace only'; word highlights toggle off and on.
 step('whitespace');await fs.writeFile(path.join(workspace,'run.sh'),'#!/bin/sh\n    echo fixture\n');await openSettings();await choose('Refresh');
 const runLabels=()=>diffTile().locator('.sdiff-file[data-file-path="run.sh"] .sdiff-row-label').allTextContents();
 await poll(async()=>await diffTile().locator('.sdiff-file[data-file-path="run.sh"] .sdiff-file-body').count()===1,'run.sh indent body');assert.deepEqual(await runLabels(),['Made executable']);
 const toggleDisplay=async(name,expected)=>{await openSettings();const item=menu().getByRole('menuitemcheckbox',{name,exact:true});assert.equal(await item.getAttribute('aria-checked'),String(!expected));await item.click();await poll(async()=>await item.getAttribute('aria-checked')===String(expected),name+' '+expected);await closeSettings();};
 await toggleDisplay('Hide whitespace changes',true);
 await poll(async()=>(await runLabels()).join()==='Whitespace only,Made executable','Whitespace only label');assert.equal(await diffTile().locator('.sdiff-file[data-file-path="run.sh"] .sdiff-file-body').count(),0);await shot('changes-whitespace-only');
 await toggleDisplay('Hide whitespace changes',false);await poll(async()=>(await runLabels()).join()==='Made executable','whitespace shown again');
 const appHunk=()=>diffTile().locator('.sdiff-file[data-file-path="src/app.js"] .sdiff-hunk').first();
 await poll(async()=>await appHunk().getAttribute('data-word-diff')!==null,'word ranges on by default');
 await toggleDisplay('Highlight changed words',false);await poll(async()=>await appHunk().getAttribute('data-word-diff')===null,'word ranges off');
 await toggleDisplay('Highlight changed words',true);await poll(async()=>await appHunk().getAttribute('data-word-diff')!==null,'word ranges back');
 report.checks.push("Hide whitespace changes (keepOpen checkbox) turns an indent-only run.sh edit into the 'Whitespace only' row label with no body and back; Highlight changed words off removes the hunk word ranges and on restores them");
 // R10 Changed files column. Default off: the ghost ListBullet "Show files" (aria-pressed false, Meta+Shift+Y, no title,
 // -ml-[4px]) precedes the scope trigger; the body carries the "Show files" edge handle.
 step('file-list-toggle');await neutral();
 const toggleInfo=await listToggle().evaluate(b=>({label:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),keys:b.getAttribute('aria-keyshortcuts'),title:b.getAttribute('title'),
  beforeScope:!!(b.compareDocumentPosition(b.closest('.source-pane-header').querySelector('.sds-trigger'))&Node.DOCUMENT_POSITION_FOLLOWING),marginLeft:getComputedStyle(b).marginLeft}));
 report.metrics.fileListToggle=toggleInfo;
 assert.deepEqual(toggleInfo,{label:'Show files',pressed:'false',keys:'Meta+Shift+Y',title:null,beforeScope:true,marginLeft:'-4px'});
 assert.equal(await fileTree().count(),0);await listEdge().waitFor();assert.deepEqual(await storedTiles(),{shown:false,width:240,tree:true,kind:false});
 await listToggle().hover();
 await page.waitForFunction(s=>{const n=document.querySelector(s);return n?.dataset.state==='open'&&n.querySelector('.source-tooltip-label')?.textContent==='Show files'&&getComputedStyle(n).opacity==='1';},tip);
 const listTip=await page.locator(tip).evaluate(n=>({label:n.querySelector('.source-tooltip-label').textContent,shortcut:(c=>c&&[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''))(n.querySelector('.source-tooltip-shortcut'))}));
 report.metrics.fileListTooltip=listTip;assert.deepEqual(listTip,{label:'Show files',shortcut:'⇧⌘Y'});await shot('changes-file-list-tooltip');await neutral();
 // Button: shown, aria-pressed true, "Hide files"; folders first (src), then root files; the body follows the list order.
 await listToggle().click();await fileTree().waitFor();
 assert.equal(await listToggle().getAttribute('aria-pressed'),'true');assert.equal(await listToggle().getAttribute('aria-label'),'Hide files');assert.equal(await listEdge().count(),0);
 assert.deepEqual(await treeRows(),[['1','src',null],['2','app.js',null],['1','notes.txt',null],['1','README.md',null],['1','run.sh',null]]);
 assert.deepEqual(await bodyOrder(),['src/app.js','notes.txt','README.md','run.sh']);
 const column=await listColumn().evaluate(n=>{const s=getComputedStyle(n),row=n.querySelector('[data-diff-tree-row]'),tree=n.querySelector('[role="tree"]');
  return {width:n.getBoundingClientRect().width,borderRight:s.borderRightWidth,rowHeight:row.getBoundingClientRect().height,rowRadius:getComputedStyle(row).borderTopLeftRadius,
   indent:getComputedStyle(row).paddingLeft,treePadding:[getComputedStyle(tree).paddingLeft,getComputedStyle(tree).paddingTop],main:n.parentElement.querySelector('.sdiff-changes-main').getBoundingClientRect().left-n.getBoundingClientRect().right};});
 report.metrics.fileListColumn=column;assert.ok(Math.abs(column.width-240)<=1,'default 240px column '+column.width);assert.equal(column.borderRight,'1px');assert.equal(column.indent,'8px');
 assert.ok(Math.abs(column.main)<=1,'the diff starts at the column edge');
 assert.deepEqual(await storedTiles(),{shown:true,width:240,tree:true,kind:false});await shot('changes-file-list-light');
 await listToggle().click();await poll(async()=>!(await listShown()),'button hides the list');assert.equal(await listToggle().getAttribute('aria-pressed'),'false');await listEdge().waitFor();
 report.checks.push('Changes header: ghost ListBullet "Show files" (aria-pressed false, aria-keyshortcuts Meta+Shift+Y, no title, margin-left -4px) before the scope trigger with a CDS tooltip "Show files" ⇧⌘Y; clicking shows the 240px "Changed files" tree (src, app.js, notes.txt, README.md, run.sh; border-right 1px) with "Hide files" pressed, the body in list order, diffShowTree persisted; clicking again hides it and the "Show files" edge returns');
 // Menu: [diff-file-list] Show files (⇧⌘Y caps, keepOpen checkbox) toggles the column; Group files by folder off flattens it.
 step('file-list-menu');await openSettings();const showItem=menu().getByRole('menuitemcheckbox',{name:'Show files',exact:true});
 assert.deepEqual(await showItem.evaluate(n=>({checked:n.getAttribute('aria-checked'),keys:n.getAttribute('aria-keyshortcuts'),caps:(c=>c&&[...c.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join(''))(n.querySelector('.smenu-shortcut'))})),
  {checked:'false',keys:'Meta+Shift+Y',caps:'⇧⌘Y'});
 await showItem.click();await poll(async()=>await showItem.getAttribute('aria-checked')==='true','menu shows the list');await fileTree().waitFor();
 const byFolder=menu().getByRole('menuitemcheckbox',{name:'Group files by folder',exact:true});assert.equal(await byFolder.getAttribute('aria-checked'),'true');
 await byFolder.click();await poll(async()=>await byFolder.getAttribute('aria-checked')==='false','flat list');
 assert.deepEqual(await treeRows(),[['1','notes.txt',null],['1','README.md',null],['1','run.sh',null],['1','src/app.js',null]]);await shot('changes-file-list-flat');
 await byFolder.click();await poll(async()=>await byFolder.getAttribute('aria-checked')==='true','folders again');
 await showItem.click();await poll(async()=>await showItem.getAttribute('aria-checked')==='false','menu hides the list');assert.equal(await fileTree().count(),0);
 await showItem.click();await poll(async()=>await showItem.getAttribute('aria-checked')==='true','menu shows it again');await closeSettings();await fileTree().waitFor();
 report.checks.push('Changes settings Show files (keepOpen checkbox, Meta+Shift+Y, ⇧⌘Y caps) shows and hides the column with the menu open; Group files by folder off lists notes.txt, README.md, run.sh, src/app.js flat and back');
 // ⇧⌘Y: the open Changes pane's list (nothing focused); from the focused Files pane it toggles that tree instead; with the
 // Changes pane closed it opens Changes with the list shown ($r).
 step('file-list-shortcut');await neutral();await page.evaluate(()=>document.activeElement?.blur());
 await page.keyboard.press('Meta+Shift+Y');await poll(async()=>!(await listShown()),'⇧⌘Y hides the list');assert.equal(await listToggle().getAttribute('aria-pressed'),'false');
 await page.keyboard.press('Meta+Shift+Y');await fileTree().waitFor();assert.equal(await listToggle().getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Meta+Shift+F');await filesTile().waitFor();const filesTree=()=>filesTile().evaluate(n=>n.querySelector('.source-file-body')?.dataset.treeVisible);
 await poll(async()=>(await filesTree())!==undefined,'Files body');const filesBefore=await filesTree();
 await filesTile().getByRole('button',{name:'Go to file or search',exact:true}).focus();await page.keyboard.press('Meta+Shift+Y');
 await poll(async()=>await filesTree()!==filesBefore,'the focused Files pane takes ⇧⌘Y');assert.equal((await storedTiles()).shown,true,'the Changes list is untouched');
 await page.keyboard.press('Meta+Shift+Y');await poll(async()=>await filesTree()===filesBefore,'Files tree back');
 await page.keyboard.press('Meta+Shift+F');await filesTile().waitFor({state:'detached'});
 await listToggle().click();await poll(async()=>!(await listShown()),'hidden before closing');
 await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor({state:'detached'});await page.evaluate(()=>document.activeElement?.blur());
 await page.keyboard.press('Meta+Shift+Y');await diffTile().waitFor();await fileTree().waitFor();assert.equal(await listToggle().getAttribute('aria-pressed'),'true');
 await page.mouse.move(480,600);await page.locator('[role="menu"].spc-arrange').waitFor({state:'detached'});
 report.checks.push('⇧⌘Y with nothing focused toggles the Changes list; with the Files pane focused it toggles the Files tree and leaves the list; with Changes closed it opens Changes with the list shown');
 // A row click scrolls its file to the top of the diff scroller and expands it (Zt + reveal); the row becomes aria-current.
 step('file-list-select');const bigFile=prefix=>Array.from({length:400},(_,i)=>`${prefix} line ${i+1}`).join('\n')+'\n';
 await fs.writeFile(path.join(workspace,'big.txt'),bigFile('big'));await fs.writeFile(path.join(workspace,'zz-big.txt'),bigFile('zz'));
 await openSettings();await choose('Refresh');await poll(async()=>(await bodyOrder()).includes('zz-big.txt'),'big files after Refresh');
 assert.deepEqual(await bodyOrder(),['src/app.js','big.txt','notes.txt','README.md','run.sh','zz-big.txt']);
 const readme=()=>diffTile().locator('.sdiff-file[data-file-path="README.md"]'),scroller=()=>diffTile().locator('.source-changes');
 await readme().locator('.sdiff-file-toggle').click();await poll(async()=>await readme().locator('.sdiff-file-toggle').getAttribute('aria-expanded')==='false','README collapsed');
 await scroller().evaluate(n=>{n.scrollTop=0;});await frames();
 await fileTree().getByRole('treeitem',{name:/^README\.md/}).click();
 await poll(async()=>await readme().locator('.sdiff-file-toggle').getAttribute('aria-expanded')==='true','row click expands README.md');
 await poll(async()=>Math.abs(await readme().evaluate(n=>n.getBoundingClientRect().top-n.closest('.source-changes').getBoundingClientRect().top))<=1,'README.md at the scroller top');
 const selected=await scroller().evaluate(n=>n.scrollTop);report.metrics.fileListScrollTop=selected;assert.ok(selected>400*10,'scrolled past big.txt: '+selected);
 assert.equal((await treeRows()).find(r=>r[1]==='README.md')[2],'true');await shot('changes-file-list-selected');
 report.checks.push('Between two 400-line files (big.txt above, zz-big.txt below), clicking the README.md row expands the collapsed README.md, scrolls its section to the top of .source-changes and marks the row aria-current');
 // Width: dragging the "Resize file list" handle persists diffTreeWidth; closing and reopening the pane keeps it.
 step('file-list-width');const layoutWidth=await diffTile().locator('.sdiff-changes-layout').evaluate(n=>n.getBoundingClientRect().width);
 const startWidth=await listWidth(),target=Math.min(startWidth+60,layoutWidth-160);await drag(listDivider(),target-startWidth);
 await poll(async()=>Math.abs(await listWidth()-target)<=1.5,'dragged to '+target);await poll(async()=>(await storedTiles()).width===Math.round(target),'width stored');
 await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor({state:'detached'});await openTile();await fileTree().waitFor();
 await poll(async()=>Math.abs(await listWidth()-target)<=1.5,'width kept after reopening');report.metrics.fileListWidth={layoutWidth,startWidth,target,reopened:await listWidth()};
 report.checks.push('Dragging "Resize file list" from '+startWidth+'px to '+target+'px stores diffTreeWidth '+Math.round(target)+'; closing and reopening the Changes pane keeps the width and the shown list');
 // Large diff: 5001 changed lines collapse every file under the banner; Expand all files is disabled with the tooltip.
 step('large-diff');await fs.writeFile(path.join(workspace,'huge.txt'),Array.from({length:5001},(_,i)=>`huge line ${i+1}`).join('\n')+'\n');
 await openSettings();await choose('Refresh');const banner=()=>diffTile().locator('.sdiff-large-banner');await banner().waitFor();
 // Files that appear in a large diff mount collapsed (the folded seed, panes-diff-view-current.js:5258-5276); files already
 // on screen keep their state, so a fresh mount (close + reopen) folds every file.
 const hugeToggle=()=>diffTile().locator('.sdiff-file[data-file-path="huge.txt"] .sdiff-file-toggle');await poll(async()=>await hugeToggle().getAttribute('aria-expanded')==='false','new huge.txt collapsed');
 await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor({state:'detached'});await openTile();await banner().waitFor();await fileTree().waitFor();
 const bannerInfo=await banner().evaluate(n=>({text:n.textContent,size:getComputedStyle(n).fontSize,inScroller:!!n.closest('.source-changes'),padding:[getComputedStyle(n).paddingLeft,getComputedStyle(n).paddingTop]}));
 report.metrics.largeBanner=bannerInfo;assert.equal(bannerInfo.text,'Files are collapsed for large diffs. Select a file to expand it.');assert.equal(bannerInfo.inScroller,false,'banner above the scroller');
 await poll(async()=>(await toggles()).filter(v=>v!==null).every(v=>v==='false'),'every file collapsed');assert.equal(await diffTile().locator('.sdiff-file-body').count(),0);
 await openSettings();const expandAll=menu().getByRole('menuitem',{name:'Expand all files',exact:true});
 const expandInfo=await expandAll.evaluate(n=>({disabled:n.getAttribute('aria-disabled'),reason:document.getElementById(n.getAttribute('aria-describedby')||'')?.textContent??null}));
 report.metrics.expandAllLarge=expandInfo;assert.deepEqual(expandInfo,{disabled:'true',reason:'This diff is too large to expand at once. Select a file to expand it.'});
 // The disabled item has no pointer events (source-menu.css); its role=none .smenu-reason wrapper carries the tooltip.
 const reasonWrap=menu().locator('.smenu-reason');assert.equal(await reasonWrap.count(),1);await reasonWrap.hover();
 await page.waitForFunction(s=>[...document.querySelectorAll(s)].some(n=>n.textContent.includes('too large to expand at once')&&getComputedStyle(n).opacity==='1'),tip);
 await shot('changes-large-diff-menu');await reasonWrap.click();await frames();assert.equal(await menu().count(),1,'a disabled item keeps the menu open');await closeSettings();
 assert.equal(await diffTile().locator('.sdiff-file-body').count(),0,'Expand all did nothing');
 await fileTree().getByRole('treeitem',{name:/^README\.md/}).click();await poll(async()=>await readme().locator('.sdiff-file-toggle').getAttribute('aria-expanded')==='true','selecting a file expands it');
 await shot('changes-large-diff-light');
 for(const name of ['huge.txt','big.txt','zz-big.txt'])await fs.rm(path.join(workspace,name));await openSettings();await choose('Refresh');
 await poll(async()=>await banner().count()===0,'banner gone');await openSettings();
 assert.equal(await menu().getByRole('menuitem',{name:'Expand all files',exact:true}).getAttribute('aria-disabled'),null);await closeSettings();
 report.checks.push('huge.txt (+5001, beside the two 400-line files): the muted banner "Files are collapsed for large diffs. Select a file to expand it." sits above the scroller, the new huge.txt mounts collapsed and after reopening the pane every file starts collapsed, Expand all files is aria-disabled with the tooltip "This diff is too large to expand at once. Select a file to expand it." and does nothing; selecting README.md expands it; removing the files clears the banner and re-enables Expand all files');
 step('refresh-clean');git('checkout','--','.');assert.equal(git('status','--porcelain').trim(),'');await openSettings();await choose('Refresh');
 await poll(async()=>await emptyTitle().count()===1,'empty state after Refresh');await frames();const empty=await emptyProbe();report.metrics.emptyLight=empty;assertEmpty(empty,'light');
 await openSettings();shape=await menuShape();assert.deepEqual(labels(shape),['Refresh']);assert.equal(shape[0].role,'menuitem');await shot('changes-empty-menu-light');await closeSettings();await shot('changes-empty-light');
 report.checks.push('After cleaning the repo, Refresh shows div[data-diff-pane-body][tabindex=-1] with the EmptyState title "No changes to show" (default All changes scope) centered in the pane body (text-align center, color --cds-text-primary); the menu offers only Refresh');
 step('redirty');await dirty();await page.keyboard.press('Meta+Shift+D');await diffTile().waitFor({state:'detached'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await indicator().waitFor();
 step('clean');git('checkout','--','.');assert.equal(git('status','--porcelain').trim(),'');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await indicator().waitFor({state:'detached'});assert.equal(await button().getAttribute('aria-pressed'),'false');
 await button().screenshot({path:path.join(directory,'changes-clean-button.png')});
 report.checks.push('After git checkout -- . and a window focus refresh the dot is gone');
 step('dark-relaunch');await app.close();app=null;await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')),theme:'dark'}));
 await launch();await open();await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await openTile();await poll(async()=>await emptyTitle().count()===1,'dark empty state');await frames();
 const dark=await emptyProbe();report.metrics.emptyDark=dark;assertEmpty(dark,'dark');assert.notEqual(dark.primary,empty.primary,'dark --cds-text-primary differs from light');await shot('changes-empty-dark');
 await dirty();await openSettings();await choose('Refresh');await poll(async()=>(await filePaths()).length===2,'dark diff after Refresh');await frames();
 await fileTree().waitFor();assert.equal(await listToggle().getAttribute('aria-pressed'),'true','diffShowTree survives the relaunch');
 assert.ok(Math.abs(await listWidth()-report.metrics.fileListWidth.target)<=1.5,'diffTreeWidth survives the relaunch');await shot('changes-diff-dark');await shot('changes-file-list-dark');
 await openSettings();assert.deepEqual(labels(await menuShape()),FULL_MENU);await shot('changes-menu-dark');await closeSettings();
 report.checks.push('Dark relaunch: the empty state keeps the centered layout in the dark --cds-text-primary; after dirtying and Refresh the diff, the persisted Changed files column (shown, same width) and the full menu return');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app&&report.clipboardSaved&&!report.clipboardRestored){try{await restoreClipboard();}catch(error){report.clipboardRestoreError=String(error);report.passed=false;process.exitCode=1;}}if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'changes-pane-ui-report.json'),bytes);console.log(bytes.slice(0,4000));}
