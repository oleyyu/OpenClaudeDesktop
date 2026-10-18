import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fileKindIcon} from '../src/file-kind-icon.mjs';
// Files pane tree + filename-search rows (0.2.97). Source: panes-tile-current.js:5692-5775
// tree row: ONE Jt size xs "shrink-0 self-center text-muted" glyph, ae = directory ?
// CaretRight (transition-transform duration-fast motion-reduce:transition-none, rotate-90
// when open) : zr(name) = shared-14 cP; name "truncate text-primary"; no native title.
// File tabs (0.2.101): he (panes-tabs-current.js:333-491) over the ce model (panes-tile-current.js:6656-6710):
// no icon, no native title, 24px tab, 140px label, italic preview, pe close button, 700ms te tooltip
// with the relative dir as detail, and the he context menu (Keep open / Close file / Close other / Close all).
// Isolated profile + protocol fixture; only run through the offscreen run-suite adapter.
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920');await fs.mkdir(evidence,{recursive:true});
// The project root is a git repo now (analysis/ is gitignored inside it): keep the fixture workspace outside any repo.
const directory=await fs.mkdtemp(path.join(evidence,'files-pane-ui-')),profile=path.join(directory,'profile'),workspace=path.join(await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'cd-files-pane-'))),'workspace');
await fs.mkdir(profile,{recursive:true});await fs.mkdir(path.join(workspace,'nested','inner'),{recursive:true});await fs.mkdir(path.join(workspace,'skills','demo'),{recursive:true});
const files={'README.md':'# readme\n','index.html':'<p>x</p>\n','app.tsx':'export {};\n','data.csv':'a,b\n','store.sqlite':'','deck.pptx':'','bundle.zip':'','notes.txt':'notes\n','Makefile':'all:\n','config.json':'{}\n',
 'nested/deep.txt':'NESTED_DEEP_FILE\n','quarterly-infrastructure-migration-checklist.txt':'LONG_NAME_FILE\n','nested/inner/leaf.txt':'NESTED_LEAF_FILE\n','skills/demo/SKILL.md':'# skill\n',
 // R09: languages of the original 345-key map (c41eb0199) beyond the old ten extensions.
 'view-options.txt':'\talpha  beta\n'+('very_long_word '.repeat(120))+'\nlast\n','util.mjs':'export const answer = 42;\n','main.go':'package main\n\nfunc main() {}\n'};
for(const [name,body] of Object.entries(files))await fs.writeFile(path.join(workspace,name),body);
await fs.writeFile(path.join(workspace,'photo.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64'));
const A='files-pane-A',B='files-pane-B',now=Math.floor(Date.now()/1000);
const prefs=theme=>({cwd:workspace,theme,mode:'code',model:'fixture',effort:'low',threadIds:[A,B],sidebarWidth:288,displayName:'Fixture'});
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify(prefs('light')));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[A]:{id:A,name:'Files pane A',cwd:workspace,createdAt:now,updatedAt:now,archived:false,turns:[]},[B]:{id:B,name:'Files pane B',cwd:workspace,createdAt:now,updatedAt:now,archived:false,turns:[]}}}));
const glyphs=JSON.parse(await fs.readFile(path.join(root,'src/generated/icons.json'),'utf8')),glyph=name=>String.fromCodePoint(glyphs[name]);
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/file-kind-icon.mjs','src/source-session.jsx','src/source-session.css','src/source-files-search.jsx'])assert.ok(build.sources.some(e=>e.path===required),required);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version,build.version);
 const h=sha(await fs.readFile(path.join(root,'scripts/files-pane-ui-test.mjs'))+await fs.readFile(path.join(root,'src/file-kind-icon.mjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={suite:'files-pane-ui',at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('FILESPANE '+name);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const frames=(count=4)=>page.evaluate(count=>new Promise(resolve=>{const step=()=>--count?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}),count);
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();await size(1280,820);}
async function size(width,height){await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows()[0].setContentSize(s.width,s.height),{width,height});await page.waitForFunction(s=>innerWidth===s.width&&innerHeight===s.height,{width,height});await frames();}
const pane=()=>page.locator('.source-side-tile[data-tile-id="files"]');
// The tree is labelled "Project files" (panes-tile-current.js:4727; fidelity F11); only the kept tree or the
// filename-search results tree is shown at a time, so the role name stays unambiguous.
const tree=()=>pane().getByRole('tree',{name:'Project files',exact:true});
// F11 helpers: polling, toasts, menu rows ('|' = separator) and the run-suite in-memory clipboard (saved/restored here).
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const toasts=()=>page.locator('.source-toast-card:not([data-phase="ending"]) .source-toast-message').allTextContents();
const itemsOf=locator=>locator.evaluate(m=>[...m.querySelectorAll('[role^="menuitem"],[role="separator"]')].filter(n=>n.closest('[role="menu"]')===m).map(n=>n.getAttribute('role')==='separator'?'|':(n.querySelector('.smenu-label')?.textContent??n.textContent).trim()));
async function saveClipboard(){assert.equal(await app.evaluate(()=>!!globalThis.offscreenClipboard),true,'the Files pane copies require the offscreen in-memory clipboard');
 await app.evaluate(async({clipboard,ClipboardItem})=>{const originals=await clipboard.read();globalThis.filesPaneClipboard=await Promise.all(originals.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));});report.clipboardSaved=true;report.clipboardRestored=false;}
async function restoreClipboard(){await app.evaluate(async({clipboard})=>{const saved=globalThis.filesPaneClipboard;if(!saved)throw Error('Clipboard backup unavailable');if(saved.length)await clipboard.write(saved);else await clipboard.clear();delete globalThis.filesPaneClipboard;});report.clipboardRestored=true;}
async function open(){await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await page.locator('.st-title').waitFor();await page.locator('.loading-state').waitFor({state:'detached'});await frames();}
async function openFiles(){await page.getByRole('button',{name:'View options',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:'Files',exact:true}).click();await pane().waitFor();await tree().getByRole('button',{name:'README.md',exact:true}).waitFor();await frames();}
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
// Every rendered treeitem: its primary button holds exactly one 12px icon in --cds-text-muted and a --cds-text-primary name.
const rows=()=>tree().evaluate(treeNode=>{const probe=document.createElement('span');treeNode.append(probe);const color=v=>{probe.style.color=`var(${v})`;return getComputedStyle(probe).color;};
 const muted=color('--cds-text-muted'),primary=color('--cds-text-primary');probe.remove();
 return {muted,primary,rows:[...treeNode.querySelectorAll('[role="treeitem"]')].map(row=>{const body=row.querySelector(':scope > [data-tree-row-body]'),button=body.querySelector(':scope > [data-tree-primary]'),icons=[...button.querySelectorAll('[data-cds="Icon"]')],icon=icons[0],s=icon&&getComputedStyle(icon),name=button.querySelector(':scope > span.truncate');
  return {name:name?.textContent,path:button.dataset.filePath,level:Number(row.getAttribute('aria-level')),expanded:row.getAttribute('aria-expanded'),icons:icons.length,glyph:icon?.textContent,fontSize:s?.fontSize,color:s?.color,
   transform:s?.transform,transitionDuration:s?.transitionDuration,transitionProperty:s?.transitionProperty,nameColor:getComputedStyle(name).color,rowTitle:row.getAttribute('title'),buttonTitle:button.getAttribute('title'),titled:row.querySelectorAll(':scope > [data-tree-row-body] [title]').length,
   height:body.getBoundingClientRect().height,paddingLeft:getComputedStyle(body).paddingLeft};})};});
function assertRows(snapshot,label){assert.ok(snapshot.rows.length>=12,label+': rows rendered');for(const row of snapshot.rows){const where=`${label} ${row.path}`;
 assert.equal(row.icons,1,where+': exactly one icon');assert.equal(row.fontSize,'12px',where+': 12px icon');assert.equal(row.color,snapshot.muted,where+': icon colour = --cds-text-muted');
 assert.equal(row.nameColor,snapshot.primary,where+': name = --cds-text-primary');assert.equal(row.glyph,glyph(row.expanded===null?fileKindIcon(row.name):'CaretRight'),where+': glyph');
 assert.equal(row.rowTitle,null,where+': no treeitem title');assert.equal(row.buttonTitle,null,where+': no row title');assert.equal(row.titled,0,where+': no nested title');
 assert.ok(Math.abs(row.height-24)<=.5,where+': 24px row');assert.equal(row.paddingLeft,`${8+8*(row.level-1)}px`,where+': indent 8 + 8 * level');}}
const byName=(snapshot,name)=>snapshot.rows.find(row=>row.name===name);
try{
 await integrity();await launch();await open();
 step('tree-light');await openFiles();
 await tree().getByRole('button',{name:'nested',exact:true}).click();await tree().getByRole('button',{name:'deep.txt',exact:true}).waitFor();
 // B33 (cccc2cf0a av/ne :3970-3984, :5484-5503): expanding skills auto-expands its single-child folder chain (demo), so demo is not clicked again.
 await tree().getByRole('button',{name:'skills',exact:true}).click();await tree().getByRole('button',{name:'SKILL.md',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.querySelector('[role="treeitem"] > [data-tree-row-body] > [data-file-path="skills/demo"]')?.closest('[role="treeitem"]')?.getAttribute('aria-expanded')),'true','single-child chain auto-expanded');
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="treeitem"][aria-expanded] > [data-tree-row-body] [data-cds="Icon"]')].every(n=>n.getAnimations().every(a=>a.playState==='finished')));await frames();
 let snapshot=await rows();assertRows(snapshot,'light');report.metrics.light=snapshot;
 const expect={'README.md':'Note','index.html':'Globe','app.tsx':'Code','data.csv':'Spreadsheet','store.sqlite':'Database','deck.pptx':'Slides','bundle.zip':'Archive','photo.png':'Image','notes.txt':'File','Makefile':'File','config.json':'Code','SKILL.md':'Scroll','deep.txt':'File'};
 for(const [name,icon] of Object.entries(expect))assert.equal(byName(snapshot,name)?.glyph,glyph(icon),`${name} shows ${icon}`);
 const openCaret=byName(snapshot,'nested'),closedCaret=byName(snapshot,'inner');
 assert.equal(openCaret.expanded,'true');
 assert.match(openCaret.transform,/^matrix\((?:6\.12323e-17|0), 1, -1, (?:6\.12323e-17|0), 0, 0\)$/,'expanded caret is rotate(90deg)');
 assert.equal(closedCaret.expanded,'false');assert.equal(closedCaret.transform,'none','collapsed caret is unrotated');
 const fast=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cds-dur-fast').trim());report.metrics.durFast=fast;assert.ok(fast,'--cds-dur-fast token resolves');
 assert.equal(openCaret.transitionProperty,'transform');assert.equal(openCaret.transitionDuration,`${parseFloat(fast)/(fast.endsWith('ms')?1000:1)}s`,'caret transition uses --cds-dur-fast');
 assert.equal(byName(snapshot,'README.md').transitionDuration,'0s','file glyphs do not transition');
 await shot('tree-light');
 report.checks.push('Each Files treeitem renders exactly one 12px glyph in --cds-text-muted (README.md Note, index.html Globe, app.tsx/config.json Code, data.csv Spreadsheet, store.sqlite Database, deck.pptx Slides, bundle.zip Archive, photo.png Image, notes.txt/Makefile/deep.txt File, skills/demo/SKILL.md Scroll) with a --cds-text-primary name, no native title, 24px rows indented 8 + 8 * level');
 report.checks.push('Directories show only CaretRight: expanded rotate(90deg) with a transform transition of --cds-dur-fast, collapsed unrotated; file glyphs do not transition');
 step('reduced-motion');await page.evaluate(()=>{document.documentElement.dataset.localMotion='reduce';window.dispatchEvent(new Event('local-motion-change'));});await frames();
 snapshot=await rows();assert.equal(byName(snapshot,'nested').transitionDuration,'0s','no caret transition under data-local-motion=reduce');assert.match(byName(snapshot,'nested').transform,/^matrix\((?:6\.12323e-17|0), 1, -1/);
 await tree().getByRole('button',{name:'nested',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role="treeitem"] > [data-tree-row-body] > [data-file-path="nested"]')?.closest('[role="treeitem"]')?.getAttribute('aria-expanded')==='false');
 assert.equal(await tree().locator('[data-file-path="nested"] [data-cds="Icon"]').evaluate(n=>getComputedStyle(n).transform),'none','collapsing under reduced motion snaps to unrotated');
 await tree().getByRole('button',{name:'nested',exact:true}).click();await tree().getByRole('button',{name:'deep.txt',exact:true}).waitFor();
 await page.evaluate(()=>{document.documentElement.dataset.localMotion='auto';window.dispatchEvent(new Event('local-motion-change'));});await frames();
 assert.notEqual(await tree().locator('[data-file-path="nested"] [data-cds="Icon"]').evaluate(n=>getComputedStyle(n).transitionDuration),'0s','transition returns when the local motion setting is off');
 report.checks.push('html[data-local-motion=reduce] makes the caret transition 0s (collapse snaps to none, expand to rotate(90deg)); restoring the setting restores the transition');
 step('keyboard');await pane().getByRole('textbox',{name:'Filter files',exact:true}).focus();await page.keyboard.press('Tab');await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='treeitem');
 await page.keyboard.press('Home');const firstRow=await page.evaluate(()=>document.activeElement.querySelector('[data-tree-primary] > span.truncate').textContent);
 const order=[];for(let i=0;i<4;i++){order.push(await page.evaluate(()=>document.activeElement.querySelector('[data-tree-primary] > span.truncate').textContent));await page.keyboard.press('ArrowDown');}
 assert.equal(order[0],firstRow);assert.equal(new Set(order).size,4,'ArrowDown walks distinct rows');
 await page.keyboard.press('Home');for(let i=0;i<order.indexOf('nested');i++)await page.keyboard.press('ArrowDown');
 assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-expanded')),'true');await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-expanded')==='false');
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-expanded')==='true');await tree().getByRole('button',{name:'deep.txt',exact:true}).waitFor();
 report.metrics.keyboardOrder=order;report.checks.push('Tree keyboard is unchanged: Tab lands on a treeitem, Home/ArrowDown walk rows, ArrowLeft collapses and ArrowRight expands the focused directory');
 step('search-results');const filter=pane().getByRole('textbox',{name:'Filter files',exact:true});await filter.fill('e');await pane().locator('.sfs-browser[data-search-phase="success"]').waitFor();await pane().locator('.sfs-result-row').first().waitFor();
 const results=await pane().locator('.sfs-results').evaluate(list=>{const probe=document.createElement('span');list.append(probe);probe.style.color='var(--cds-text-muted)';const muted=getComputedStyle(probe).color;probe.remove();
  return {muted,rows:[...list.querySelectorAll('.sfs-result-row')].map(row=>{const icons=[...row.querySelectorAll('[data-cds="Icon"]')];return {path:row.querySelector('[data-tree-primary]').getAttribute('aria-label'),icons:icons.length,glyph:icons[0]?.textContent,fontSize:getComputedStyle(icons[0]).fontSize,color:getComputedStyle(icons[0]).color};})};});
 report.metrics.search=results;assert.ok(results.rows.length>=5,'search lists several files');
 for(const row of results.rows){assert.equal(row.icons,1,row.path);assert.equal(row.fontSize,'12px',row.path);assert.equal(row.color,results.muted,row.path);assert.equal(row.glyph,glyph(fileKindIcon(path.posix.basename(row.path))),row.path+' search glyph');}
 assert.ok(new Set(results.rows.map(r=>r.glyph)).size>=3,'search results show several file kinds');await shot('search-light');
 await filter.fill('');await pane().locator('.sfs-results[hidden]').waitFor({state:'attached'});
 report.checks.push('Filename search results use the same shared-14 cP glyph per file at 12px in --cds-text-muted');
 step('file-tabs');
 // 0.2.128: c_ "Go to file or search" (panes-tile-current.js:6791-6807, trailing slot :16366-16378) adds a 24px ghost control + 2px gap
 // to the header, so the four-tab strip below loses 26px at 1280 (r1: README.md clipped). The 2:3 chat:pane split gives the
 // pane 3/5 of a wider window: 1328px (+48 -> ~+29px) restores the strip width these unchanged tab assertions were written for.
 await size(1328,820);
 // Opens from the tree (double-click keeps, single click previews), re-showing the tree if a file view hid it.
 const tabRoot=name=>pane().locator(`.source-file-tab[data-file-path=${JSON.stringify(name)}]`),tabsNow=()=>pane().locator('.source-file-tab').evaluateAll(nodes=>nodes.map(n=>({path:n.dataset.filePath,preview:n.dataset.preview==='true',selected:n.hasAttribute('data-selected')})));
 async function openTab(name,keep){if(!(await tree().isVisible()))await pane().getByRole('button',{name:'Show file tree',exact:true}).click();const row=tree().getByRole('button',{name,exact:true});await row.waitFor();
  // Fidelity F11 opens the tab synchronously (panes-state-current.js F; vi drops the tree peek), so while the tree is not
  // shown beside the file the first click already swaps the tree for the viewer and a row double-click cannot land.
  // Keep the preview through its tab instead (the tab's double-click keeps it, as the row's does).
  const previews=await page.evaluate(()=>localStorage.getItem('epitaxy-files-preview-tabs')!=='false');
  await row.click();await page.waitForFunction(({name,previews})=>{const tab=document.querySelector(`.source-file-tab[data-file-path$="${name}"]`);return tab&&tab.hasAttribute('data-preview')===previews;},{name,previews});
  if(keep&&previews){await pane().locator(`.source-file-tab[data-file-path$=${JSON.stringify(name)}]`).dblclick();await page.waitForFunction(n=>document.querySelector(`.source-file-tab[data-file-path$="${n}"]:not([data-preview])`),name);}await frames();}
 const longName='quarterly-infrastructure-migration-checklist.txt';
 await openTab('notes.txt',true);await openTab(longName,true);await openTab('deep.txt',true);await openTab('README.md',false);
 const deepPath=(await tabsNow()).find(t=>t.path.endsWith('deep.txt')).path;assert.equal(path.posix.basename(deepPath),'deep.txt');
 assert.deepEqual((await tabsNow()).map(t=>[path.posix.basename(t.path),t.preview,t.selected]),[['notes.txt',false,false],[longName,false,false],['deep.txt',false,false],['README.md',true,true]]);
 await page.mouse.move(2,2);await frames();
 const tabInfo=await pane().locator('.source-file-tabs').evaluate(list=>{const probe=document.createElement('span');list.append(probe);const color=v=>{probe.style.color=`var(${v})`;return getComputedStyle(probe).color;},bg=v=>{probe.style.backgroundColor=`var(${v})`;return getComputedStyle(probe).backgroundColor;};
  const tokens={muted:color('--cds-text-muted'),primary:color('--cds-text-primary'),secondary:color('--cds-text-secondary'),selectedBg:bg('--cds-fill-ghost-selected'),hoverBg:bg('--cds-fill-ghost-hover'),radius:(probe.style.borderRadius='var(--cds-radius)',getComputedStyle(probe).borderRadius)};probe.remove();
  return {tokens,tabs:[...list.querySelectorAll('.source-file-tab')].map(root=>{const tab=root.querySelector(':scope > [role="tab"]'),label=root.querySelector('.source-file-tab-label'),inner=label.firstElementChild,close=root.querySelector(':scope > button'),bgLayer=root.querySelector(':scope > .source-file-tab-bg'),rs=getComputedStyle(root),ts=getComputedStyle(tab),ls=getComputedStyle(label);
   return {path:root.dataset.filePath,role:root.getAttribute('role'),tabIcons:tab.querySelectorAll('[data-cds="Icon"]').length,rootIcons:root.querySelectorAll('[data-cds="Icon"]').length,closeIcons:close?.querySelectorAll('[data-cds="Icon"]').length,
    titled:root.querySelectorAll('[title]').length+(root.hasAttribute('title')?1:0),height:root.getBoundingClientRect().height,basis:rs.flexBasis,padding:rs.padding,gap:rs.gap,radius:rs.borderRadius,color:rs.color,justify:rs.justifyContent,
    tabPadLeft:ts.paddingLeft,tabMin:ts.minWidth,tabGap:ts.gap,labelMax:ls.maxWidth,clipped:label.hasAttribute('data-clipped'),mask:ls.maskImage||ls.webkitMaskImage,fontStyle:getComputedStyle(inner).fontStyle,whiteSpace:getComputedStyle(inner).whiteSpace,
    srPreview:[...inner.querySelectorAll('.source-sr-only')].map(n=>n.textContent),name:tab.textContent,bg:getComputedStyle(bgLayer).backgroundColor,bgZ:getComputedStyle(bgLayer).zIndex,bgHidden:bgLayer.getAttribute('aria-hidden'),
    closeTag:close?.tagName,closeType:close?.getAttribute('type'),closeHidden:close?.getAttribute('aria-hidden'),closeTabIndex:close?.tabIndex,closeLabel:close?.getAttribute('aria-label'),closeColor:close&&getComputedStyle(close).color,closeSize:close&&[close.getBoundingClientRect().width,close.getBoundingClientRect().height],closeOpacity:close&&getComputedStyle(close).opacity,closeIconSize:close&&getComputedStyle(close.querySelector('[data-cds="Icon"]')).fontSize};})};});
 report.metrics.fileTabs=tabInfo;const {tokens}=tabInfo;
 for(const t of tabInfo.tabs){const where='tab '+t.path,selected=t.path.endsWith('README.md');
  assert.equal(t.role,'presentation',where);assert.equal(t.tabIcons,0,where+': no icon before the label (ce has no icon)');assert.equal(t.rootIcons,1,where+': only the close X glyph');assert.equal(t.closeIcons,1,where);assert.equal(t.titled,0,where+': no native title');
  assert.ok(Math.abs(t.height-24)<=.5,where+': 24px tab');assert.equal(t.basis,'192px',where);assert.equal(t.padding,'2px',where);assert.equal(t.gap,'4px',where);assert.equal(t.radius,tokens.radius,where+': rounded = --cds-radius (design-system.css:14250)');
  assert.equal(t.tabPadLeft,'6px',where);assert.equal(t.tabMin,'6px',where);assert.equal(t.tabGap,'2px',where);assert.equal(t.labelMax,'140px',where+': label max-w-[140px]');assert.equal(t.whiteSpace,'nowrap',where);
  assert.equal(t.color,selected?tokens.primary:tokens.secondary,where+': text colour');assert.equal(t.justify,selected?'flex-end':'flex-start',where);assert.equal(t.bg,selected?tokens.selectedBg:'rgba(0, 0, 0, 0)',where+': background layer');assert.equal(t.bgZ,'-1',where);assert.equal(t.bgHidden,'true',where);
  assert.equal(t.closeTag,'BUTTON',where);assert.equal(t.closeType,'button',where);assert.equal(t.closeHidden,'true',where+': close button aria-hidden');assert.equal(t.closeTabIndex,-1,where+': close button tabIndex -1');
  assert.equal(t.closeLabel,'Close file',where+': pe label = le.closeTab (panes-tile-current.js:6671)');assert.equal(t.closeColor,selected?tokens.primary:tokens.muted,where+': close colour');assert.deepEqual(t.closeSize,[20,20],where+': 1.25rem close');assert.equal(t.closeOpacity,'1',where+': always visible');assert.equal(t.closeIconSize,'12px',where+': X size xs');}
 const [notesTab,longTab,deepTab,readmeTab]=tabInfo.tabs;
 assert.equal(readmeTab.fontStyle,'italic','preview label is italic');assert.deepEqual(readmeTab.srPreview,[', preview']);assert.equal(readmeTab.name,'README.md, preview');
 for(const t of [notesTab,longTab,deepTab]){assert.equal(t.fontStyle,'normal',t.path);assert.deepEqual(t.srPreview,[],t.path);}
 assert.equal(longTab.clipped,true,'long label is clipped at 140px');assert.match(longTab.mask,/^linear-gradient\((to right|90deg), (rgb\(0, 0, 0\)|#000) calc\(100% - 8px\), (transparent|rgba\(0, 0, 0, 0\)) 100%\)$/,'fe mask on a clipped closable label');
 for(const t of [notesTab,deepTab,readmeTab]){assert.equal(t.clipped,false,t.path);assert.equal(t.mask,'none',t.path);}
 await shot('file-tabs-light');
 report.checks.push('File tabs (he over ce): role=presentation root, no icon, no native title, 24px tall, basis 192px, 2px padding, 4px gap, --cds-radius, 6px tab padding, 140px nowrap label (fe mask only on the clipped one), selected text-primary/justify-end/--cds-fill-ghost-selected; preview label italic with sr-only ", preview"; pe close button <button type=button aria-hidden tabIndex=-1 aria-label="Close file"> 20px, X 12px, always visible, --cds-text-muted (text-primary on the selected tab)');
 // has-[:focus-visible]:shadow-focus (panes-tabs-current.js:357-375) must not be clipped: the Xd tablist z is -mx-[4px] ... overflow-x-hidden p-[4px]
 // (:1138-1141), so every scroll/clip ancestor leaves >=4px around a keyboard-focused tab (the 1px accent ring + part of the 6px glow, design-system.css:52987).
 const ringProbe=()=>page.evaluate(()=>{const tab=document.activeElement,root=tab?.closest('.source-file-tab'),list=root?.closest('.source-file-tabs');if(!root)return null;
  const r=root.getBoundingClientRect(),clip={left:-Infinity,top:-Infinity,right:Infinity,bottom:Infinity};
  for(let n=root.parentElement;n&&n!==document.documentElement;n=n.parentElement){const cs=getComputedStyle(n);if(cs.overflowX==='visible'&&cs.overflowY==='visible')continue;const b=n.getBoundingClientRect(),left=b.left+n.clientLeft,top=b.top+n.clientTop;
   clip.left=Math.max(clip.left,left);clip.top=Math.max(clip.top,top);clip.right=Math.min(clip.right,left+n.clientWidth);clip.bottom=Math.min(clip.bottom,top+n.clientHeight);}
  const ls=getComputedStyle(list),header=list.closest('.source-pane-header').getBoundingClientRect(),lr=list.getBoundingClientRect();
  return {path:root.dataset.filePath,focusVisible:tab.matches(':focus-visible'),shadow:getComputedStyle(root).boxShadow,room:{left:r.left-clip.left,top:r.top-clip.top,right:clip.right-r.right,bottom:clip.bottom-r.bottom},
   listPadding:ls.padding,listMargin:[ls.marginLeft,ls.marginRight],listHeight:lr.height,inHeader:lr.top>=header.top-.5&&lr.bottom<=header.bottom+.5,overflowing:list.scrollWidth>list.clientWidth};});
 await tabRoot('README.md').locator('[role="tab"]').focus();await page.keyboard.press('Home');await page.waitForFunction(()=>document.activeElement?.closest('.source-file-tab')?.dataset.filePath==='notes.txt');await frames();
 const firstRing=await ringProbe();await page.keyboard.press('End');await page.waitForFunction(()=>document.activeElement?.closest('.source-file-tab')?.dataset.filePath==='README.md');await frames();
 const lastRing=await ringProbe();report.metrics.tabFocusRing={first:firstRing,last:lastRing};
 for(const ring of [firstRing,lastRing]){const where='focused tab '+ring.path;assert.equal(ring.focusVisible,true,where+': keyboard focus is :focus-visible');assert.notEqual(ring.shadow,'none',where+': shadow-focus applied');
  assert.equal(ring.listPadding,'4px',where+': tablist p-[4px]');assert.deepEqual(ring.listMargin,['-4px','-4px'],where+': tablist -mx-[4px]');assert.ok(Math.abs(ring.listHeight-32)<=.5,where+': 24px tab + 2*4px');assert.equal(ring.inHeader,true,where+': tablist fits the 32px header');
  for(const side of ['top','bottom'])assert.ok(ring.room[side]>=4-.5,`${where}: ${side} ring room ${ring.room[side]}px`);}
 assert.ok(firstRing.room.left>=4-.5,`first tab left ring room ${firstRing.room.left}px`);assert.equal(lastRing.overflowing,false,'four tabs fit the tablist');assert.ok(lastRing.room.right>=4-.5,`last tab right ring room ${lastRing.room.right}px`);
 assert.deepEqual(await tabsNow().then(t=>t.map(x=>[path.posix.basename(x.path),x.preview,x.selected])),[['notes.txt',false,false],[longName,false,false],['deep.txt',false,false],['README.md',true,true]],'Home/End roving restores README selection');
 // Z (:309-314) on he onMouseUp (:359): a middle-button mouseup on a closable tab is default-prevented (as mousedown/auxclick are).
 assert.equal(await tabRoot('README.md').evaluate(n=>!n.dispatchEvent(new MouseEvent('mouseup',{button:1,bubbles:true,cancelable:true}))),true,'middle mouseup default-prevented');
 await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(2,2);await frames();
 report.checks.push('Keyboard-focused tab ring is not clipped: the tablist has the Xd p-[4px] / -mx-[4px] (32px tall inside the 32px header) and every clip ancestor leaves >=4px top/bottom around the focused tab, left of the first and right of the last; middle-button mouseup is default-prevented (Z)');
 // te tooltip (panes-tabs-current.js:382-392): delay 700, bottom/start, label + detail (relative dir); none for a short root-level file.
 const hoverTiming=async(name)=>{await page.mouse.move(2,2);await page.waitForFunction(()=>!document.querySelector('.source-tooltip-popup'));await page.waitForTimeout(700);
  await page.evaluate(()=>{window.__tabTip={};const mo=new MutationObserver(()=>{if(!window.__tabTip.at&&document.querySelector('.source-tooltip-popup'))window.__tabTip.at=performance.now();});mo.observe(document.body,{childList:true,subtree:true});window.__tabTip.mo=mo;});
  const box=await tabRoot(name).locator('[role="tab"]').boundingBox();await page.evaluate(()=>{window.__tabTip.start=performance.now();});await page.mouse.move(box.x+box.width/2,box.y+box.height/2);const t0=Date.now();return {t0,box};};
 let hover=await hoverTiming(deepPath);await page.waitForTimeout(Math.max(0,500-(Date.now()-hover.t0)));
 assert.equal(await page.locator('.source-tooltip-popup').count(),0,'no tooltip at 500ms');
 await page.locator('.source-tooltip-popup').waitFor({timeout:Math.max(1,900-(Date.now()-hover.t0))});
 const tip=await page.evaluate(()=>{const popup=document.querySelector('.source-tooltip-popup'),r=popup.getBoundingClientRect();window.__tabTip.mo.disconnect();
  return {elapsed:window.__tabTip.at-window.__tabTip.start,side:popup.closest('[data-side]')?.dataset.side,label:popup.querySelector('.source-tooltip-label')?.textContent,detail:popup.querySelector('.source-tooltip-detail')?.textContent,lines:popup.querySelectorAll('.source-tooltip-label-line').length,left:r.left,top:r.top,titled:document.querySelectorAll('.source-file-tabs [title]').length};});
 report.metrics.deepTooltip={...tip,tab:hover.box};
 assert.ok(tip.elapsed>=500&&tip.elapsed<=900,`tooltip opened after ${tip.elapsed}ms (700ms delay)`);assert.equal(tip.side,'bottom');assert.ok(tip.top>=hover.box.y+hover.box.height-.5,'tooltip below the tab');assert.ok(Math.abs(tip.left-hover.box.x)<=1,`tooltip start-aligned (${tip.left} vs ${hover.box.x})`);
 assert.equal(tip.label,'deep.txt','tooltip content = basename');assert.equal(tip.detail,'nested','tooltip detail = relative dir (ce detail)');assert.equal(tip.lines,1);assert.equal(tip.titled,0);
 await shot('file-tab-tooltip');
 hover=await hoverTiming('notes.txt');await page.waitForTimeout(1000);assert.equal(await page.locator('.source-tooltip-popup').count(),0,'short root-level file: no tooltip');
 hover=await hoverTiming(longTab.path);await page.locator('.source-tooltip-popup').waitFor({timeout:1200});
 assert.deepEqual(await page.evaluate(()=>{const p=document.querySelector('.source-tooltip-popup');return [p.querySelector('.source-tooltip-label')?.textContent,p.querySelector('.source-tooltip-detail')];}),[longName,null],'clipped root-level label: label only, no detail');
 await page.mouse.move(2,2);await page.waitForFunction(()=>!document.querySelector('.source-tooltip-popup'));
 report.checks.push('Tab tooltip (te): nothing at 500ms, shown by 900ms (measured '+Math.round(tip.elapsed)+'ms), below the tab start-aligned, "deep.txt" + detail "nested"; a short root-level file has none; a clipped root-level label shows the label without detail; no native title');
 // he context menu (panes-tabs-current.js:470-485), anchored bottom/start to the tab root.
 // F11: the tab menu now leads with the l_ file items (panes-tile-current.js:6809-6862: Mn Attach as context, Copy, Show in
 // Finder, then Reveal in file tree) and a separator (he renderTabMenuItems); labels are read from .smenu-label.
 // kn's 'Open in' submenu lists the editors installed on this Mac (main.cjs installed-editors); absent when there are none.
 const OPEN_IN=(await page.evaluate(()=>window.desktop.call('installed-editors'))).length?['Open in']:[];
 const FILE_ITEMS=['Attach as context','Copy',...OPEN_IN,'Show in Finder','Reveal in file tree'];
 const menuItems=()=>page.locator('[data-cds="ContextMenu"] [role="menuitem"]').evaluateAll(nodes=>nodes.map(n=>(n.querySelector('.smenu-label')?.textContent??n.textContent).trim()));
 const openMenu=async name=>{await tabRoot(name).locator('[role="tab"]').click({button:'right'});await page.locator('[data-cds="ContextMenu"][data-open]').waitFor();await frames();};
 await openMenu('README.md');assert.deepEqual(await menuItems(),[...FILE_ITEMS,'Keep open','Close file','Close other files','Close all files'],'preview tab menu order');
 const menuGeo=await page.evaluate(()=>{const popup=document.querySelector('[data-cds="ContextMenu"][data-open]'),root=document.querySelector('.source-file-tab[data-popup-open]');return {side:popup.dataset.side,align:popup.dataset.align,popup:popup.getBoundingClientRect().toJSON(),root:root?.getBoundingClientRect().toJSON(),rootPath:root?.dataset.filePath};});
 report.metrics.tabMenu=menuGeo;assert.equal(menuGeo.rootPath,'README.md');assert.equal(menuGeo.side,'bottom');assert.equal(menuGeo.align,'start');assert.ok(menuGeo.popup.top>=menuGeo.root.bottom-.5,'menu below the tab root');assert.ok(Math.abs(menuGeo.popup.left-menuGeo.root.left)<=1,'menu start-aligned to the tab root');
 await shot('file-tab-menu');await page.keyboard.press('Escape');await page.locator('[data-cds="ContextMenu"]').waitFor({state:'detached'});
 await openMenu(deepPath);assert.deepEqual(await menuItems(),[...FILE_ITEMS,'Close file','Close other files','Close files to the right','Close all files'],'pinned tab menu has no Keep open');
 assert.deepEqual(await itemsOf(page.locator('[data-cds="ContextMenu"][data-open]')),['Attach as context','Copy','|',...OPEN_IN,'Show in Finder','|','Reveal in file tree','|','Close file','Close other files','Close files to the right','Close all files'],'file items, then a separator before the tab items');
 assert.equal(await tabRoot(deepPath).evaluate(n=>getComputedStyle(n.querySelector('.source-file-tab-bg')).backgroundColor),tokens.hoverBg,'data-popup-open tab uses --cds-fill-ghost-hover');
 await page.waitForTimeout(900);assert.equal(await page.locator('.source-tooltip-popup').count(),0,'tooltip suppressed while the tab menu is open');
 await page.keyboard.press('Escape');await page.locator('[data-cds="ContextMenu"]').waitFor({state:'detached'});
 // Current source: close-right preserves an active file on the left; otherwise activates the clicked tab.
 await tabRoot('notes.txt').locator('[role="tab"]').click();
 await openMenu(deepPath);await page.getByRole('menuitem',{name:'Close files to the right',exact:true}).click();
 assert.deepEqual((await tabsNow()).map(t=>[t.path,t.selected]),[['notes.txt',true],[longTab.path,false],[deepPath,false]]);
 await openTab('README.md',false);
 await openMenu(deepPath);await page.getByRole('menuitem',{name:'Close files to the right',exact:true}).click();
 assert.equal((await tabsNow()).find(t=>t.selected)?.path,deepPath,'closing the active right-hand tab selects the clicked tab');
 await openMenu(deepPath);assert.ok(!(await menuItems()).includes('Close files to the right'),'last tab omits close-right');await page.keyboard.press('Escape');
 await openTab('README.md',false);
 report.checks.push('2.31226.0 close-right: menu only on non-last tabs, preserves an active left tab, selects clicked tab if active right tab closes');
 await openMenu('README.md');await page.getByRole('menuitem',{name:'Close other files',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.source-file-tab').length===1);
 assert.deepEqual(await tabsNow(),[{path:'README.md',preview:true,selected:true}],'Close other files leaves only that tab');
 await openMenu('README.md');assert.deepEqual(await menuItems(),[...FILE_ITEMS,'Keep open','Close file'],'solo preview tab: Keep open + Close file');
 await page.getByRole('menuitem',{name:'Keep open',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.source-file-tab[data-preview]'));
 assert.equal(await tabRoot('README.md').locator('.source-file-tab-label > span').evaluate(n=>getComputedStyle(n).fontStyle),'normal','kept tab is no longer italic');
 await openMenu('README.md');assert.deepEqual(await menuItems(),[...FILE_ITEMS,'Close file'],'solo pinned tab: Close file only');await page.keyboard.press('Escape');await page.locator('[data-cds="ContextMenu"]').waitFor({state:'detached'});
 await tabRoot('README.md').locator('.source-file-tab-close').click();await page.waitForFunction(()=>!document.querySelector('.source-file-tab'));
 report.checks.push('Tab context menu (he): the l_ file items (Attach as context, Copy, separator, Show in Finder, separator, Reveal in file tree) and a separator, then the preview tab lists Keep open / Close file / Close other files / Close all files, pinned tab omits Keep open, solo tabs omit the close-other/all items; popup below-start of the tab root with data-popup-open fill-ghost-hover and no tooltip; Close other files leaves only that tab; Keep open drops italics; the aria-hidden close button still closes by pointer');
 step('viewer-menus');
 // F11 (cd2efac6e jo/Yo/Ma, Mn file_browser, toggleDiffFileList, _e/K): the breadcrumb subheader and numbered rows, the
 // tree-row ContextMenu Copy ▸ Relative path, ⌘⇧Y with its CDS tooltip, and "More files" once the tabs overflow.
 await saveClipboard();
 await openTab('deep.txt',true);await pane().locator('[data-file-viewer] .cm-line').first().waitFor();
 const viewer=await pane().evaluate(n=>{const wrap=n.querySelector('.source-file-breadcrumb'),b=wrap.querySelector(':scope > div'),crumb=b.querySelector('[data-file-breadcrumb]'),segs=[...crumb.querySelectorAll('[data-breadcrumb-segment]')],rows=[...n.querySelectorAll('[data-file-viewer] .cm-line')],probe=document.createElement('span');n.append(probe);probe.style.color='var(--cds-text-muted)';const muted=getComputedStyle(probe).color;probe.style.color='var(--cds-text-secondary)';const secondary=getComputedStyle(probe).color;probe.remove();
  const sub=n.querySelector('.sfv-subheader').getBoundingClientRect();
  return {label:b.getAttribute('aria-label'),lister:wrap.hasAttribute('data-breadcrumb-lister'),tag:b.tagName,segments:segs.map(s=>s.textContent),title:segs.at(-1)?.getAttribute('aria-description')??null,crumb:crumb.textContent,dirColor:getComputedStyle(segs[0]).color,muted,secondary,buttonColor:getComputedStyle(b).color,subHeight:sub.height,
   rows:rows.map((r,i)=>[String(i+1),r.textContent]),gutterColor:getComputedStyle(n.querySelector('.cm-gutters')).color,whiteSpace:getComputedStyle(n.querySelector('.cm-content')).whiteSpace,
   back:!!n.querySelector('[aria-label="Back to files"], .source-file-location')};});
 report.metrics.viewer=viewer;
 // Yo with a lister (local sessions, cd2efac6e :4804-4872): a plain div, no Copy path button; each in-workspace segment opens "Files in {folder}".
 assert.equal(viewer.label,null);assert.equal(viewer.lister,true);assert.equal(viewer.tag,'DIV');assert.deepEqual(viewer.segments,['nested','deep.txt']);assert.ok(viewer.title.endsWith('/nested/deep.txt'),viewer.title);assert.equal(viewer.crumb,'nested/deep.txt');
 assert.equal(viewer.dirColor,viewer.muted,'folder segment text-muted');assert.equal(viewer.buttonColor,viewer.secondary,'breadcrumb button text-secondary');assert.ok(Math.abs(viewer.subHeight-32)<=.5,'2rem subheader');
 assert.deepEqual(viewer.rows,[['1','NESTED_DEEP_FILE'],['2','']]);assert.equal(viewer.gutterColor,viewer.muted,'muted gutter');assert.equal(viewer.whiteSpace,'break-spaces');assert.equal(viewer.back,false,'no Back to files / location row');
 const folderSegment=pane().locator('[data-file-breadcrumb] [data-breadcrumb-segment]',{hasText:'nested'}).first();await folderSegment.click();
 const folderPopover=page.getByRole('dialog',{name:'Files in nested',exact:true});await folderPopover.waitFor();
 assert.equal(await folderSegment.getAttribute('aria-expanded'),'true');
 assert.deepEqual(await folderPopover.locator('[data-folder-tree] [data-folder-tree-row]').evaluateAll(rows=>rows.map(r=>[r.querySelector('bdi').textContent,r.getAttribute('aria-current')==='true'])),[['inner',false],['deep.txt',true]],'folders first, the open file is the selected row');
 await shot('breadcrumb-folder-popover');await page.keyboard.press('Escape');await folderPopover.waitFor({state:'detached'});/* Escape closes only the popover (source-session.jsx: a portaled layer's Escape never closes the pane) */assert.equal(await pane().count(),1,'the Files pane stays open');
 if(!(await tree().isVisible()))await pane().getByRole('button',{name:'Show file tree',exact:true}).click();
 await tree().getByRole('button',{name:'notes.txt',exact:true}).click({button:'right'});const rowMenu=page.locator('[data-cds="ContextMenu"][data-open]');await rowMenu.waitFor();await frames();
 assert.deepEqual(await itemsOf(rowMenu),['Attach as context','Copy','|',...OPEN_IN,'Show in Finder'],'file_browser items (Mn)');
 await rowMenu.getByRole('menuitem',{name:'Copy',exact:true}).hover();const copyMenu=page.getByRole('menu',{name:'Copy',exact:true});await copyMenu.waitFor();await frames();
 assert.deepEqual(await itemsOf(copyMenu),['Absolute path','Relative path','Filename']);await shot('tree-row-copy-menu');
 await copyMenu.getByRole('menuitem',{name:'Relative path',exact:true}).click();await page.locator('[data-cds="ContextMenu"]').waitFor({state:'detached'});
 await poll(async()=>(await toasts()).includes('Copied to clipboard.'),'copy toast');assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),'notes.txt');
 await restoreClipboard();
 report.checks.push('Viewer: local-session lister breadcrumb (muted folder segment, text-secondary path, 32px subheader); the nested segment opens "Files in nested" with deep.txt selected, Escape closes it; one numbered pre-wrap row with a muted gutter; no Back to files. Tree row ContextMenu: Attach as context, Copy, separator, Show in Finder; Copy ▸ Relative path writes "notes.txt" with "Copied to clipboard."');
 // ⌘⇧Y toggles the tree beside the open file; the ListBullet tooltip shows the keycap and the button has no native title.
 const treeState=()=>pane().evaluate(n=>n.querySelector('.source-file-body').dataset.treeVisible);
 const toggle=pane().locator('.source-pane-header > button[aria-pressed]');
 assert.deepEqual(await toggle.evaluate(b=>({title:b.getAttribute('title'),keys:b.getAttribute('aria-keyshortcuts')})),{title:null,keys:'Meta+Shift+Y'});
 await page.mouse.move(2,2);await toggle.hover();const treeTip=page.locator('.source-tooltip-popup').filter({hasText:/file tree/});await treeTip.waitFor();
 const tipInfo=await treeTip.evaluate(p=>({label:p.querySelector('.source-tooltip-label')?.textContent??p.textContent,keys:[...p.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join('')}));
 report.metrics.treeToggleTooltip=tipInfo;assert.match(tipInfo.label,/^(Show|Hide) file tree/);assert.ok(/⇧/.test(tipInfo.keys)&&/⌘/.test(tipInfo.keys)&&/Y/.test(tipInfo.keys),'⌘⇧Y keycaps: '+tipInfo.keys);
 await page.mouse.move(2,2);await page.evaluate(()=>document.activeElement?.blur());
 const before=await treeState();await page.keyboard.press('Meta+Shift+Y');await poll(async()=>await treeState()!==before,'⌘⇧Y toggles the tree');
 await page.keyboard.press('Meta+Shift+Y');await poll(async()=>await treeState()===before,'⌘⇧Y toggles it back');
 report.checks.push('⌘⇧Y toggles the Files tree ('+before+' → '+(before==='true'?'false':'true')+' → '+before+'); the ListBullet has aria-keyshortcuts Meta+Shift+Y, no title, and a CDS tooltip "'+tipInfo.label+'" with '+tipInfo.keys);
 // Eight pinned tabs overflow the strip: hidden tabs move into "More files" (side bottom, align end) and the active tab stays in view.
 for(const name of ['README.md','index.html','app.tsx','data.csv','notes.txt','Makefile','config.json','bundle.zip'])await openTab(name,true);
 await page.waitForFunction(()=>document.querySelector('.source-side-tile[data-tile-id="files"] [data-vtb-overflow]'));await frames();
 const strip=await pane().evaluate(n=>{const list=n.querySelector('.source-file-tabs'),tabs=[...list.querySelectorAll('.source-file-tab')],lr=list.getBoundingClientRect(),active=list.querySelector('.source-file-tab[data-selected]'),ar=active.getBoundingClientRect();
  return {count:tabs.length,hidden:tabs.filter(t=>t.hasAttribute('data-overflowed')).map(t=>t.dataset.filePath),active:active.dataset.filePath,activeVisible:ar.left>=lr.left-.5&&ar.right<=lr.right+.5&&getComputedStyle(active).visibility==='visible',
   trigger:n.querySelector('[data-vtb-overflow] button')?.getAttribute('aria-label'),stripWidth:list.clientWidth,paneWidth:n.clientWidth};});
 report.metrics.tabOverflow=strip;assert.equal(strip.count,8,'eight tabs (the cap)');assert.ok(strip.hidden.length>0,'some tabs are hidden');assert.equal(strip.trigger,'More files');
 assert.equal(strip.active,'bundle.zip');assert.equal(strip.activeVisible,true,'the active tab is in view');assert.ok(!strip.hidden.includes(strip.active));
 await pane().getByRole('button',{name:'More files',exact:true}).click();const more=page.getByRole('menu',{name:'More files',exact:true});await more.waitFor();await frames();
 const moreInfo=await more.evaluate(m=>({rows:[...m.querySelectorAll('[role="menuitem"]')].map(n=>n.dataset.filePath),side:m.dataset.side,align:m.dataset.align,hint:m.querySelector('.source-sr-only')?.textContent}));
 report.metrics.moreFiles=moreInfo;assert.deepEqual(moreInfo.rows,strip.hidden,'the menu lists exactly the hidden tabs');assert.equal(moreInfo.side,'bottom');assert.equal(moreInfo.align,'end');assert.equal(moreInfo.hint,'press right arrow to close');
 await shot('file-tabs-more-files');
 const target=strip.hidden[0];await more.locator(`[role="menuitem"][data-file-path=${JSON.stringify(target)}]`).click();await more.waitFor({state:'detached'});
 await page.waitForFunction(p=>{const t=[...document.querySelectorAll('.source-side-tile[data-tile-id="files"] .source-file-tab')].find(n=>n.dataset.filePath===p);return t&&t.hasAttribute('data-selected')&&!t.hasAttribute('data-overflowed');},target);
 report.checks.push('Eight pinned tabs in a '+strip.stripWidth+'px strip: '+strip.hidden.length+' hidden behind the ghost CaretDown "More files" menu (bottom/end, rows = the hidden tabs, "press right arrow to close"); choosing '+target+' activates it in view');
 await openMenu(target);await page.getByRole('menuitem',{name:'Close all files',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.source-side-tile[data-tile-id="files"] .source-file-tab'));
 assert.deepEqual(report.rendererErrors,[]);
 step('search-files');
 // c_ (panes-tile-current.js:6791-6807): ghost iconOnly "Go to file or search" first in the file pane's trailing slot (:16366-16378), before the
 // yh settings menu; onClick focusFilesTreeFilter (panes-state-current.js:3097-3113) shows the tree (beside the file when it fits), then
 // focuses "Filter files" and selects its text. The CDS tooltip is the aria-label (shared-frame ks oe/se); no native title.
 const searchButton=pane().getByRole('button',{name:'Go to file or search',exact:true}),filterBox=pane().getByRole('textbox',{name:'Filter files',exact:true});
 const trailing=await pane().locator('.source-pane-header .spc-controls').evaluate(n=>[...n.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')));
 report.metrics.searchFilesTrailing=trailing;assert.deepEqual(trailing.slice(0,2),['Go to file or search','Files settings'],'Go to file or search precedes the Files settings menu');
 assert.equal(trailing.at(-1),'Close panel');assert.ok(trailing.indexOf('Expand')>1||trailing.indexOf('Collapse')>1,'Expand/Collapse after the settings menu');
 assert.deepEqual(await searchButton.evaluate(b=>({title:b.getAttribute('title'),ghost:b.classList.contains('spc-ghost'),icons:b.querySelectorAll('[data-cds="Icon"]').length,text:b.textContent.length})),{title:null,ghost:true,icons:1,text:1});
 await searchButton.hover();await page.locator('.source-tooltip-popup').filter({hasText:'Go to file or search'}).waitFor();await page.mouse.move(2,2);await page.waitForFunction(()=>!document.querySelector('.source-tooltip-popup'));
 const paneState=()=>pane().evaluate(n=>{const body=n.querySelector('.source-file-body'),tree=n.querySelector('.source-files-tree');return {treeVisible:body.dataset.treeVisible,column:body.dataset.treeColumn,treeShown:!!tree&&!tree.hidden&&tree.getClientRects().length>0,
  preview:n.querySelector('[data-file-breadcrumb]')?.textContent??null,selected:n.querySelector('.source-file-tab[data-selected]')?.dataset.filePath??null,tabs:[...n.querySelectorAll('.source-file-tab')].map(t=>t.dataset.filePath),paneWidth:n.querySelector('.source-file-panel').clientWidth};});
 const focusedFilter=()=>page.evaluate(()=>{const n=document.activeElement;return n?.getAttribute('aria-label')==='Filter files'?{value:n.value,start:n.selectionStart,end:n.selectionEnd}:null;});
 // Tree shown: the button only focuses and selects.
 await filterBox.fill('notes');await pane().locator('.sfs-browser[data-search-phase="success"]').waitFor();await page.evaluate(()=>document.activeElement?.blur());
 const shownBefore=await paneState();assert.equal(shownBefore.treeShown,true);
 await searchButton.click();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Filter files');
 assert.deepEqual(await focusedFilter(),{value:'notes',start:0,end:5},'Filter files focused with its text selected');assert.deepEqual(await paneState(),shownBefore,'tree already shown: only focus changes');
 await filterBox.fill('');await pane().locator('.sfs-results[hidden]').waitFor({state:'attached'});
 // Tree hidden with a file open (the pane fits a tree beside it): the tree comes back beside the same file.
 await openTab('notes.txt',true);await filterBox.fill('deep');await pane().locator('.sfs-browser[data-search-phase="success"]').waitFor();
 if(await pane().getByRole('button',{name:'Hide file tree',exact:true}).count())await pane().getByRole('button',{name:'Hide file tree',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.source-side-tile[data-tile-id="files"] .source-file-body')?.dataset.treeVisible==='false');
 const hiddenBefore=await paneState();report.metrics.searchFilesHidden=hiddenBefore;
 assert.ok(hiddenBefore.paneWidth>=400,`pane ${hiddenBefore.paneWidth}px fits the tree beside the file`);assert.equal(hiddenBefore.treeShown,false);assert.equal(path.posix.basename(hiddenBefore.preview??''),'notes.txt');
 await searchButton.click();await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Filter files');
 const hiddenAfter=await paneState();report.metrics.searchFilesShown=hiddenAfter;
 assert.deepEqual(await focusedFilter(),{value:'deep',start:0,end:4},'Filter files focused with its text selected');
 assert.deepEqual([hiddenAfter.treeVisible,hiddenAfter.column,hiddenAfter.treeShown],['true','true',true],'tree shown as a column beside the file');
 assert.deepEqual([hiddenAfter.preview,hiddenAfter.selected,hiddenAfter.tabs],[hiddenBefore.preview,hiddenBefore.selected,hiddenBefore.tabs],'the open file stays selected and previewed');
 assert.equal(await pane().locator('.source-file-body').getAttribute('data-tree-peek'),'true','search temporarily peeks the hidden tree');
 await shot('search-files-beside');
 await filterBox.fill('');await pane().locator('.sfs-results[hidden]').waitFor({state:'attached'});
 // Current source wb reads unavailable=missing (not generic errors) for the tab's deleted marker.
 await fs.rename(path.join(workspace,'notes.txt'),path.join(workspace,'notes.saved'));
 try {
  await pane().getByRole('button',{name:'Files settings',exact:true}).click();
  await page.getByRole('menuitem',{name:'Reload file',exact:true}).click();
  await tabRoot('notes.txt').locator('[role="tab"]').filter({hasText:'deleted'}).waitFor();
  assert.equal(await tabRoot('notes.txt').getAttribute('data-deleted'),'true');
  assert.equal(await tabRoot('notes.txt').locator('.source-file-tab-label > span').evaluate(n=>getComputedStyle(n).textDecorationLine),'line-through');
  await shot('deleted-file-tab');
 } finally { await fs.rename(path.join(workspace,'notes.saved'),path.join(workspace,'notes.txt')); }
 await tree().getByRole('button',{name:'notes.txt',exact:true}).click();
 await poll(async()=>await tabRoot('notes.txt').getAttribute('data-deleted')===null,'restored file clears deleted state');
 report.checks.push('2.31226.0 deleted file: a real missing read strikes through its tab and announces deleted; restoring and reopening clears it');
 const storedTreePreference=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('code-desktop-tiles')).filesTreeShown);
 assert.equal(await storedTreePreference(),false,'search peek never changes the persistent tree preference');
 await pane().getByRole('button',{name:'Close panel',exact:true}).click();await pane().waitFor({state:'detached'});
 await page.getByRole('button',{name:'View options',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:'Files',exact:true}).click();await pane().waitFor();
 await poll(async()=>await treeState()==='false','closing the pane clears temporary peek');
 assert.equal(await pane().locator('.source-file-body').getAttribute('data-tree-peek'),null);
 assert.equal(await storedTreePreference(),false);
 report.checks.push('2.31226.0 tree peek does not persist; closing and reopening the Files pane restores the hidden tree preference');

 await tabRoot(hiddenAfter.selected).locator('.source-file-tab-close').click();await page.waitForFunction(()=>!document.querySelector('.source-side-tile[data-tile-id="files"] .source-file-tab'));
 report.checks.push('Go to file or search (c_): ghost icon-only button first in the Files trailing controls ['+trailing.join(', ')+'], CDS tooltip, no native title; with the tree shown it only focuses "Filter files" and selects its text; with the tree hidden and a file open it shows the tree beside that file (pane '+hiddenBefore.paneWidth+'px), keeps the file selected, then focuses and selects the filter');
 assert.deepEqual(report.rendererErrors,[]);
 step('previews');
 // R09 (cd2efac6e qo/en/pn, the Eye/Code toggle :4169-4186, nr :4481-4500; c41eb0199 r(); shared-frame cs :2697/:2724):
 // .mjs/.go highlight, README opens as its Markdown preview and toggles to numbered source and back, photo.png renders
 // from its file:// URL, and the pressed ListBullet is text-accent on bg-accent.
 if(!(await tree().isVisible()))await pane().getByRole('button',{name:'Show file tree',exact:true}).click();
 const pressedPaint=()=>pane().evaluate(n=>{const b=n.querySelector('.source-pane-header > button[aria-pressed="true"]'),probe=document.createElement('span');n.append(probe);
  probe.style.cssText='color:var(--cds-text-accent);background-color:var(--cds-bg-accent)';const accent={color:getComputedStyle(probe).color,background:getComputedStyle(probe).backgroundColor};probe.remove();
  return {label:b?.getAttribute('aria-label')??null,color:b?getComputedStyle(b).color:null,background:b?getComputedStyle(b).backgroundColor:null,accent};});
 await page.mouse.move(2,2);await frames();
 const pressedLight=await pressedPaint();report.metrics.pressedLight=pressedLight;
 assert.equal(pressedLight.label,'Hide file tree','the tree is shown, so the ListBullet is pressed');
 assert.equal(pressedLight.color,pressedLight.accent.color,'pressed ListBullet colour = --cds-text-accent');assert.equal(pressedLight.background,pressedLight.accent.background,'pressed ListBullet fill = --cds-bg-accent');
 const tokenInfo=async name=>{await openTab(name,true);await page.waitForFunction(n=>{const v=document.querySelector(`.source-side-tile[data-tile-id="files"] .source-file-view[data-file-path="${n}"]`);return !!v?.querySelector('.sfv-editor [data-code-token]');},name);
  return pane().evaluate((n,name)=>{const v=n.querySelector(`.source-file-view[data-file-path="${name}"]`),spans=[...v.querySelectorAll('[data-code-token]')];return {tokens:spans.length,colors:new Set(spans.map(s=>getComputedStyle(s).color)).size,first:v.querySelector('.cm-line').textContent};},name);};
 const mjs=await tokenInfo('util.mjs'),go=await tokenInfo('main.go');report.metrics.highlightedFiles={mjs,go};
 assert.ok(mjs.tokens>=3&&mjs.colors>=2,'util.mjs is highlighted as javascript: '+JSON.stringify(mjs));assert.equal(mjs.first,'export const answer = 42;');
 assert.ok(go.tokens>=3&&go.colors>=2,'main.go is highlighted as go: '+JSON.stringify(go));
 await openTab('README.md',true);const readme=pane().locator('.source-file-view[data-file-path="README.md"]'),viewToggle=readme.locator('.sfv-subheader [data-view-toggle]');
 await readme.locator('[data-file-preview="markdown"] .epitaxy-file-prose h1').filter({hasText:'readme'}).waitFor();
 const readmePreview=await readme.evaluate(v=>({view:v.dataset.fileView,label:v.querySelector('[data-view-toggle]').getAttribute('aria-label'),rows:v.querySelectorAll('.cm-line').length,h1:getComputedStyle(v.querySelector('.epitaxy-file-prose h1')).fontSize,
  column:getComputedStyle(v.querySelector('.max-w-\\[860px\\]')).maxWidth,scroller:v.querySelector('[data-file-preview]').classList.contains('source-file-preview')}));
 report.metrics.readmePreview=readmePreview;assert.deepEqual(readmePreview,{view:'preview',label:'View source',rows:0,h1:'22px',column:'860px',scroller:true});
 await viewToggle.click();await readme.locator('[data-file-viewer] .cm-line').first().waitFor();
 assert.deepEqual(await readme.evaluate(v=>({view:v.dataset.fileView,label:v.querySelector('[data-view-toggle]').getAttribute('aria-label'),rows:[...v.querySelectorAll('.cm-line')].map((r,i)=>[String(i+1),r.textContent])})),
  {view:'source',label:'Preview',rows:[['1','# readme'],['2','']]},'View source shows the numbered rows');
 await viewToggle.click();await readme.locator('[data-file-preview="markdown"] h1').waitFor();assert.equal(await viewToggle.getAttribute('aria-label'),'View source');
 await shot('readme-preview');
 await openTab('photo.png',true);const photo=pane().locator('[data-file-viewer][data-file-media="image"] img');await photo.waitFor();
 await page.waitForFunction(()=>{const i=document.querySelector('.source-side-tile[data-tile-id="files"] [data-file-media="image"] img');return !!i&&i.complete&&i.naturalWidth>0;});
 const photoInfo=await photo.evaluate(i=>({naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,alt:i.alt,src:i.getAttribute('src'),fit:getComputedStyle(i).objectFit,toggle:!!document.querySelector('.source-side-tile[data-tile-id="files"] [data-view-toggle]')}));
 report.metrics.photo=photoInfo;assert.deepEqual([photoInfo.naturalWidth,photoInfo.naturalHeight,photoInfo.alt,photoInfo.fit,photoInfo.toggle],[1,1,'photo.png','contain',false]);assert.match(photoInfo.src,/^file:\/\/\/.+\/photo\.png$/);
 await shot('photo-preview');
 await openMenu('photo.png');await page.getByRole('menuitem',{name:'Close all files',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.source-side-tile[data-tile-id="files"] .source-file-tab'));
 if(!(await tree().isVisible()))await pane().getByRole('button',{name:'Show file tree',exact:true}).click();
 report.checks.push('Previews: util.mjs and main.go render highlighted token spans ('+mjs.tokens+' / '+go.tokens+'); README.md opens as its Markdown preview (h1 22px in the 860px prose column) with the "View source" Code toggle, which shows the numbered source and flips to "Preview"; photo.png renders from its file:// URL with naturalWidth 1 and no toggle; the pressed ListBullet paints --cds-text-accent on --cds-bg-accent');
 step('file-view-settings');
 await openTab('view-options.txt',true);
 const source=()=>pane().locator('.cm-scroller');
 await source().waitFor();
 const original=files['view-options.txt'];
 const codeText=()=>source().locator('.cm-line').allTextContents().then(parts=>parts.join('\n'));
 const option=label=>page.getByRole('menuitemcheckbox',{name:label,exact:true});
 const openSettings=()=>pane().getByRole('button',{name:'Files settings',exact:true}).click();
 await openSettings();
 assert.equal(await option('Word wrap').getAttribute('aria-checked'),'true');
 await option('Word wrap').click();assert.equal(await option('Word wrap').getAttribute('aria-checked'),'false');
 assert.equal(await source().evaluate(n=>getComputedStyle(n.querySelector('.cm-content')).whiteSpace),'pre');
 assert.ok(await source().evaluate(n=>n.scrollWidth>n.clientWidth),'nowrap permits horizontal scrolling inside the file');
 await option('Show whitespace').click();assert.equal(await option('Show whitespace').getAttribute('aria-checked'),'true');
 await source().locator('.cm-highlightTab').first().waitFor();assert.equal(await codeText(),original,'decorations preserve exact source text');
 assert.notEqual(await source().locator('.cm-highlightSpace').first().evaluate(n=>getComputedStyle(n).backgroundImage),'none');
 await option('Scroll past end').click();
 assert.ok(await source().evaluate(n=>parseFloat(getComputedStyle(n.querySelector('.cm-content')).paddingBottom)>n.clientHeight-50),'last line can scroll to the top');
 await page.getByRole('menuitem',{name:/^Tab size/}).click();await page.getByRole('menuitemradio',{name:'8',exact:true}).click();
 assert.equal(await source().evaluate(n=>getComputedStyle(n.querySelector('.cm-content')).tabSize),'8');
 const width8=await source().locator('.cm-highlightTab').first().evaluate(n=>n.getBoundingClientRect().width);
 await openSettings();const tabSizeMenu=page.getByRole('menuitem',{name:/^Tab size/});await tabSizeMenu.focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.getByRole('menuitemradio',{name:'8',exact:true}).getAttribute('aria-checked'),'true');
 await page.getByRole('menuitemradio',{name:'2',exact:true}).click();
 const width2=await source().locator('.cm-highlightTab').first().evaluate(n=>n.getBoundingClientRect().width);
 assert.ok(Math.abs(width8-width2*4)<1,`Tab width actually changes: ${width8}px vs ${width2}px`);
 await openSettings();await page.getByRole('menuitem',{name:/^Tab size/}).click();await page.getByRole('menuitemradio',{name:'8',exact:true}).click();

 await shot('file-view-settings');
 await source().locator('.cm-content').click();await page.keyboard.press('Meta+f');
 await pane().getByRole('textbox',{name:'Find in file',exact:true}).fill('alpha');
 await poll(async()=>!!(await source().locator('.sfv-editor-find-current').count()),'find survives whitespace decoration');
 await page.keyboard.press('Escape');
 await saveClipboard();
 await openSettings();await page.getByRole('menuitem',{name:'Copy file contents',exact:true}).click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),original,'copy uses unmodified content');await restoreClipboard();
 await openSettings();await option('Word wrap').click();await page.keyboard.press('Escape');
 assert.equal(await source().evaluate(n=>getComputedStyle(n.querySelector('.cm-content')).whiteSpace),'break-spaces');
 assert.ok(await source().evaluate(n=>n.scrollWidth<=n.clientWidth+1),'wrapping removes horizontal overflow');
 report.checks.push('Files view options: live wrap/nowrap, whitespace backgrounds without text mutation, unchanged Copy/Find, scroll-past-end padding and Tab size 8');
 step('preview-tab-preference');
 await openTab('README.md',false);
 await openSettings();assert.equal(await option('Preview tabs').getAttribute('aria-checked'),'true');await option('Preview tabs').click();
 await poll(async()=>(await tabsNow()).every(tab=>!tab.preview),'disable fixes existing preview');
 assert.equal(await option('Preview tabs').getAttribute('aria-checked'),'false');await page.keyboard.press('Escape');
 await openTab('notes.txt',false);
 assert.deepEqual((await tabsNow()).map(tab=>[tab.path,tab.preview]),[['view-options.txt',false],['README.md',false],['notes.txt',false]],'single click appends fixed tabs when preview mode is off');
 await openMenu('notes.txt');assert.ok(!(await menuItems()).includes('Keep open'));await page.keyboard.press('Escape');
 await openSettings();await option('Preview tabs').click();await page.keyboard.press('Escape');
 assert.ok((await tabsNow()).every(tab=>!tab.preview),'enabling does not unpin files');
 await openTab('index.html',false);await openTab('deep.txt',false);
 assert.deepEqual((await tabsNow()).map(tab=>[tab.path,tab.preview]),[['view-options.txt',false],['README.md',false],['notes.txt',false],[deepPath,true]],'only the preview slot is replaced after re-enabling');
 await openSettings();await option('Preview tabs').click();await page.keyboard.press('Escape');
 await openMenu(deepPath);await page.getByRole('menuitem',{name:'Close all files',exact:true}).click();
 report.checks.push('Preview tabs: disabling fixes existing previews, future single clicks append fixed tabs, Keep open disappears; enabling preserves fixed files and resumes one replaceable preview slot');

 assert.deepEqual(report.rendererErrors,[]);
 step('dark-relaunch');await app.close();app=null;await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')),theme:'dark'}));
 const selectionFixture=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8'));
 selectionFixture.threads[A].turns.push({id:'selection-turn',status:'completed',items:[{id:'selection-answer',type:'agentMessage',text:'Selected transcript context'}]});
 await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify(selectionFixture));
 await launch();await open();if(!(await pane().count()))await openFiles();await tree().getByRole('button',{name:'README.md',exact:true}).waitFor();
 if(!(await tree().getByRole('button',{name:'deep.txt',exact:true}).count())){await tree().getByRole('button',{name:'nested',exact:true}).click();await tree().getByRole('button',{name:'deep.txt',exact:true}).waitFor();}
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="treeitem"][aria-expanded] > [data-tree-row-body] [data-cds="Icon"]')].every(n=>n.getAnimations().every(a=>a.playState==='finished')));await frames();
 snapshot=await rows();assertRows(snapshot,'dark');report.metrics.dark=snapshot;
 await page.mouse.move(2,2);await frames();const pressedDark=await pressedPaint();report.metrics.pressedDark=pressedDark;
 assert.equal(pressedDark.label,'Hide file tree');assert.equal(pressedDark.color,pressedDark.accent.color,'dark pressed ListBullet colour = --cds-text-accent');
 assert.equal(pressedDark.background,pressedDark.accent.background,'dark pressed ListBullet fill = --cds-bg-accent');assert.notEqual(pressedDark.color,pressedLight.color,'the accent follows the theme');assert.notEqual(snapshot.primary,report.metrics.light.primary,'dark theme resolves a different --cds-text-primary'); await shot('tree-dark'); // --cds-text-muted is gray-400 in both themes (design-system.css:53578/54142).
 await size(760,768);const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth<=document.documentElement.clientWidth,body:document.body.scrollWidth<=document.body.clientWidth}));
 assert.deepEqual(overflow,{doc:true,body:true});if(await pane().count()){snapshot=await rows();assertRows(snapshot,'dark-760');}await shot('tree-dark-760');
 await openTab('view-options.txt',true);
 assert.equal(await source().evaluate(n=>getComputedStyle(n.querySelector('.cm-content')).tabSize),'8','tab size survives relaunch');
 assert.ok(await source().locator('.cm-highlightTab').count()>0,'whitespace preference survives relaunch');
 assert.equal(await pane().locator('.sfv-editor').getAttribute('data-scroll-past-end'),'true','scroll preference survives relaunch');
 await saveClipboard();await openSettings();await page.getByRole('menuitem',{name:'Copy file contents',exact:true}).click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),original,'virtualized editor retains the full file after dark relaunch');await restoreClipboard();
 await source().evaluate(n=>{n.scrollTop=n.scrollHeight;});await source().locator('.cm-line').filter({hasText:/^last$/}).waitFor();
 assert.ok((await tabsNow()).every(tab=>!tab.preview),'preview-tabs off survives relaunch');
 await openSettings();assert.equal(await option('Preview tabs').getAttribute('aria-checked'),'false');await page.keyboard.press('Escape');
 report.checks.push('File view settings survive dark relaunch with the same profile and keep source text intact');
 report.checks.push('Dark relaunch keeps one 12px glyph per row in --cds-text-muted (gray-400 in both themes) with the dark --cds-text-primary name; 760px has no document/body horizontal overflow');
 step('content-search');
 await fs.writeFile(path.join(workspace,'content-a.txt'),'header\nNeedle\nneedlework\nneedle\nNEEDLE\n');
 await fs.writeFile(path.join(workspace,'content-b.txt'),'other\nneedle needle\n');
 await fs.writeFile(path.join(workspace,'content-cap.txt'),Array.from({length:8},()=> 'capword').join('\n'));
 await size(1440,900);await pane().getByRole('button',{name:'Go to file or search',exact:true}).click();
 const contentFilter=pane().getByRole('textbox',{name:'Filter files',exact:true});await contentFilter.waitFor();
 assert.equal(await contentFilter.getAttribute('placeholder'),'Filter, or ? to search in files');
 await contentFilter.fill('?');await pane().getByText('Type after ? to search in files',{exact:true}).waitFor();
 const contentRows=()=>pane().locator('[data-content-match]');
 const queryContent=async text=>{await contentFilter.fill(text);await pane().locator('.sfs-browser[data-search-phase="success"]').waitFor();};
 await queryContent('?needle');assert.equal(await contentRows().count(),5);
 const contentOptions=pane().locator('.sfs-field').getByRole('group',{name:'Search options',exact:true});
 await contentOptions.getByRole('button',{name:'Match case',exact:true}).click();await poll(async()=>await contentRows().count()===3,'case-sensitive content matches');
 await contentOptions.getByRole('button',{name:'Match whole word',exact:true}).click();await poll(async()=>await contentRows().count()===2,'whole-word content matches');
 await contentOptions.getByRole('button',{name:'Use regular expression',exact:true}).click();await queryContent('?^Needle$');assert.equal(await contentRows().count(),1);
 await contentFilter.fill('?[');await pane().getByText('Invalid regular expression',{exact:true}).waitFor();assert.equal(await contentFilter.getAttribute('aria-invalid'),'true');assert.equal(await contentRows().count(),0);
 for(const name of ['Match case','Match whole word','Use regular expression'])await contentOptions.getByRole('button',{name,exact:true}).click();
 await queryContent('?needle');assert.equal(await contentRows().count(),5);
 await contentFilter.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-level')),'1');
 await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-level')),'2');
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-level')),'1');
 await page.keyboard.press('ArrowUp');assert.equal(await contentFilter.evaluate(n=>n===document.activeElement),true);
 await shot('content-search-dark');
 await openSettings();await option('Preview tabs').click();await page.keyboard.press('Escape');
 await pane().getByRole('button',{name:'content-a.txt:4',exact:true}).click();
 await pane().locator('.source-file-view[data-file-path="content-a.txt"] .cm-content').waitFor();
 assert.equal(await pane().getByRole('textbox',{name:'Find in file',exact:true}).inputValue(),'needle');
 await poll(async()=>/3 of 4/.test(await pane().locator('.sfv-find-status').innerText()),'content hit selects the requested line in original file find');
 await shot('content-search-open-line');
 assert.equal((await tabsNow()).find(t=>t.path==='content-a.txt').preview,true,'single-click content result is a preview');
 step('search-result-actions');
 const hit=()=>pane().getByRole('button',{name:'content-a.txt:4',exact:true});
 const fileActionsMenu=()=>page.getByRole('menu',{name:'File actions',exact:true});
 await hit().click({button:'right'});await fileActionsMenu().waitFor();
 const contentMenuItems=await itemsOf(fileActionsMenu());
 assert.deepEqual(contentMenuItems,['Ask about this','Attach as context','Copy','|',...OPEN_IN,'Show in Finder']);
 await shot('content-search-menu');
 await saveClipboard();await fileActionsMenu().getByRole('menuitem',{name:'Copy',exact:true}).hover();
 await page.getByRole('menuitem',{name:'Relative path',exact:true}).click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),'content-a.txt');await restoreClipboard();
 // Keep the real IPC and editor service; intercept only OS launch effects for this isolated fixture.
 await app.evaluate(async({app})=>{
   const {createRequire}=process.mainModule.require('node:module');const service=createRequire(app.getAppPath()+'/package.json')('./electron/editors.cjs');
   globalThis.editorLocationProbe={service,original:service.openInEditor,calls:[]};
   const probe=globalThis.editorLocationProbe;
   service.openInEditor=(target,type,options)=>probe.original(target,type,{...options,
     openExternal:async uri=>probe.calls.push({kind:'uri',uri}),
     run:(command,args,_options,done)=>{probe.calls.push({kind:'process',command,args});done(null);}});
 });
 try {
   const editor=(await page.evaluate(()=>window.desktop.call('installed-editors'))).find(e=>e.type==='vscode');
   assert.ok(editor,'line-navigation fixture requires the installed VS Code');
   for(const [name,line] of [['content-a.txt:4',4],['content-b.txt:2',2]]){
     await pane().getByRole('button',{name,exact:true}).click({button:'right'});
     await fileActionsMenu().getByRole('menuitem',{name:'Open in',exact:true}).hover();
     await page.getByRole('menuitem',{name:editor.name,exact:true}).click();
     await poll(async()=>await app.evaluate(()=>globalThis.editorLocationProbe.calls.length)>=(line===4?1:2),'editor launch effect');
   }
   report.metrics.editorLocations=await app.evaluate(()=>globalThis.editorLocationProbe.calls);
   assert.deepEqual(report.metrics.editorLocations,[
     {kind:'uri',uri:`vscode://file/${path.join(workspace,'content-a.txt').split('/').map(encodeURIComponent).join('/')}:4`},
     {kind:'uri',uri:`vscode://file/${path.join(workspace,'content-b.txt').split('/').map(encodeURIComponent).join('/')}:2`},
   ]);
   // The matching file header has no line: the existing ordinary launch is preserved.
   await pane().locator('.sfs-results').getByRole('button',{name:'content-a.txt',exact:true}).click({button:'right'});
   await fileActionsMenu().getByRole('menuitem',{name:'Open in',exact:true}).hover();await page.getByRole('menuitem',{name:editor.name,exact:true}).click();
   await poll(async()=>await app.evaluate(()=>globalThis.editorLocationProbe.calls.length)===3,'ordinary editor launch effect');
   const ordinary=await app.evaluate(()=>globalThis.editorLocationProbe.calls[2]);assert.equal(ordinary.kind,'process');assert.equal(ordinary.args.at(-1),path.join(workspace,'content-a.txt'));
 } finally {await app.evaluate(()=>{const probe=globalThis.editorLocationProbe;probe.service.openInEditor=probe.original;delete globalThis.editorLocationProbe;});}
 report.checks.push('Content-result Open in actions preserve distinct line numbers through real IPC and the editor service into the original encoded VS Code URI; file headers retain ordinary opening. OS launch effects are intercepted, so external editor navigation itself is not asserted');
 // Keyboard invocation uses the same menu and returns focus to the matching row.
 await hit().evaluate(n=>n.closest('[data-tree-row]').focus());await page.keyboard.press('Shift+F10');await fileActionsMenu().waitFor();
 await page.waitForFunction(()=>document.activeElement?.getAttribute('role')?.startsWith('menuitem'));
 await page.keyboard.press('Escape');await fileActionsMenu().waitFor({state:'detached'});
 report.metrics.searchMenuFocus=await page.evaluate(()=>({active:document.activeElement?.outerHTML?.slice(0,600)}));
 await poll(async()=>await hit().evaluate(n=>n.closest('[data-tree-row]')===document.activeElement),'context menu returns focus to match row');
 // Source Vv/Hv: middle click and keyboard activation pin instead of replacing the preview.
 await hit().click({button:'middle'});await poll(async()=>(await tabsNow()).some(t=>t.path==='content-a.txt'&&!t.preview),'middle click pins content hit');
 const secondHit=pane().getByRole('button',{name:'content-b.txt:2',exact:true});await secondHit.evaluate(n=>n.closest('[data-tree-row]').focus());await page.keyboard.press('Enter');
 await poll(async()=>(await tabsNow()).some(t=>t.path==='content-b.txt'&&!t.preview),'keyboard pins content hit');
 await fs.writeFile(path.join(profile,'fixture-customize.json'),JSON.stringify({autoCompleteTurns:true}));
 const firstSelectionRow=page.locator('[data-transcript-item-id="selection-answer"]');await firstSelectionRow.scrollIntoViewIfNeeded();
 await firstSelectionRow.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
 await page.getByRole('toolbar',{name:'Selection actions',exact:true}).getByRole('button',{name:'Start a side chat',exact:true}).waitFor();
 await page.evaluate(()=>getSelection().removeAllRanges());await page.getByRole('toolbar',{name:'Selection actions',exact:true}).waitFor({state:'hidden'});
 const beforeQuestion=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns;
 await hit().click({button:'right'});await fileActionsMenu().getByRole('menuitem',{name:'Ask about this',exact:true}).click();
 const side=page.getByRole('complementary',{name:'Side chat',exact:true});await side.waitFor();
 assert.equal(await side.locator('.ssc-user').innerText(),'In content-a.txt at line 4: `needle` — explain what this does and where it’s used.');
 await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();
 await poll(async()=>await side.locator('.ssc-input').evaluate(n=>n===document.activeElement),'side question receives keyboard focus');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion,'side question leaves the parent conversation untouched');
 await shot('content-search-side-question');
 step('side-chat-geometry');
 const panelRect=()=>side.evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};});
 const near=(actual,expected,label)=>{for(const key of Object.keys(expected))assert.ok(Math.abs(actual[key]-expected[key])<1,`${label} ${key}: ${actual[key]} vs ${expected[key]}`);};
 const drag=async(locator,dx,dy)=>{const box=await locator.boundingBox();assert.ok(box);const x=box.x+box.width/2,y=box.y+box.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();await frames();};
 const originalSideViewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
 const initialSide=await panelRect();near(initialSide,{width:320,height:340},'original initial panel');
 assert.equal(await side.locator('.ssc-resize').count(),8);
 // Clicking the session outside the floating panel no longer dismisses it.
 await pane().getByRole('textbox',{name:'Filter files',exact:true}).click();assert.equal(await side.isVisible(),true);
 await drag(side.locator('.ssc-title'),-300,-100);
 const movedSide=await panelRect();near(movedSide,{...initialSide,left:initialSide.left-300,top:initialSide.top-100},'header drag');
 await drag(side.locator('[data-edge="se"]'),80,40);
 near(await panelRect(),{...movedSide,width:400,height:380},'southeast resize');
 await drag(side.locator('[data-edge="nw"]'),300,300);
 near(await panelRect(),{left:movedSide.left+120,top:movedSide.top+220,width:280,height:160},'northwest minimum preserves opposite edges');
 await drag(side.locator('[data-edge="nw"]'),-120,-180);
 const savedSide=await panelRect();near(savedSide,{left:movedSide.left,top:movedSide.top+40,width:400,height:340},'northwest expands');
 assert.equal(await page.evaluate(()=>document.body.style.userSelect),'','pointer capture cleanup restores selection');
 await size(1100,760);near(await panelRect(),{...savedSide,left:savedSide.left+1100-originalSideViewport.width,top:savedSide.top+760-originalSideViewport.height},'resize retains closer right/bottom edges');
 await size(originalSideViewport.width,originalSideViewport.height);near(await panelRect(),savedSide,'viewport restoration');
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 await poll(()=>app.evaluate(({Menu,BrowserWindow})=>{const find=menu=>{for(const item of menu.items){if(item.label==='Show Side Chat'&&item.enabled)return item;const child=item.submenu&&find(item.submenu);if(child)return child;}};const item=find(Menu.getApplicationMenu());if(!item)return false;item.click(item,BrowserWindow.getAllWindows()[0]);return true;}),'reopen side chat via actual menu');
 await side.waitFor();near(await panelRect(),savedSide,'reopening preserves panel geometry');
 assert.equal(await side.locator('.ssc-user').count(),1,'reopening retains messages without sending again');
 await side.locator('.ssc-input').fill('unsent side draft');
 await side.locator('.ssc-input').press('Escape');await side.waitFor({state:'hidden'});
 await poll(()=>app.evaluate(({Menu,BrowserWindow})=>{const find=menu=>{for(const item of menu.items){if(item.label==='Show Side Chat'&&item.enabled)return item;const child=item.submenu&&find(item.submenu);if(child)return child;}};const item=find(Menu.getApplicationMenu());if(!item)return false;item.click(item,BrowserWindow.getAllWindows()[0]);return true;}),'reopen after Escape');
 await side.waitFor();assert.equal(await side.locator('.ssc-input').evaluate(n=>n.value),'unsent side draft');await side.locator('.ssc-input').fill('');
 await shot('side-chat-moved-resized');
 report.metrics.sideChatGeometry={initial:initialSide,moved:movedSide,saved:savedSide};
 report.checks.push('Current original side-chat geometry: 320px initial width, eight handles, header drag, southeast and northwest resize, 280×160 minimum, opposite-edge anchoring, viewport rebasing, outside-click persistence and close/Escape/reopen preserving messages, draft and geometry');
 step('side-chat-controls');
 const questionInput=()=>side.locator('.ssc-input');
 const showSide=()=>poll(()=>app.evaluate(({Menu,BrowserWindow})=>{const find=menu=>{for(const item of menu.items){if(item.label==='Show Side Chat'&&item.enabled)return item;const child=item.submenu&&find(item.submenu);if(child)return child;}};const item=find(Menu.getApplicationMenu());if(!item)return false;item.click(item,BrowserWindow.getAllWindows()[0]);return true;}),'show side chat');
 const requests=async()=>{const data=await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8');return data.trim().split('\n').map(line=>JSON.parse(line));};
 const starts=async()=>(await requests()).filter(call=>call.method==='turn/start').length;
 // A real fixture stream exercises renderer → IPC → fork → turn/interrupt.
 for(const via of ['button','escape']){
   await side.evaluate(node=>{window.__sideStatusTrace=[];const read=()=>{const row=node.querySelector('.ssc-status');if(!row)return;const state={phase:row.dataset.sideStatus,announcement:row.querySelector('[role=status]').textContent,clock:row.querySelector('[data-runtime-stat=elapsed]')?.textContent??null,visual:row.querySelector('.sts-label').textContent};const previous=window.__sideStatusTrace.at(-1);if(JSON.stringify(state)!==JSON.stringify(previous))window.__sideStatusTrace.push(state);};window.__sideStatusObserver=new MutationObserver(read);window.__sideStatusObserver.observe(node,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-side-status']});read();});
   await questionInput().fill('fixture:hold');await questionInput().press('Enter');
   await side.getByRole('button',{name:'Stop response',exact:true}).waitFor();
   await poll(async()=>await side.locator('.ssc-answer').last().innerText().then(text=>text.includes('HOLD_CHUNK_')),'partial side reply');
   assert.equal(await questionInput().isDisabled(),true,'current source disables input during a response');
   assert.equal(await side.evaluate(n=>getComputedStyle(n).outlineStyle),'none','source frame is outline-none even while focused');
   await side.locator('.ssc-status[data-side-status=running] [data-runtime-stat=elapsed]').waitFor();
   assert.equal(await side.locator('.ssc-status [role=status]').innerText(),'Thinking…','live announcement continues after text begins');
   assert.equal(await side.locator('.ssc-status [data-cds=Spark]').getAttribute('data-spark-state'),'thinking');
   await side.locator('.ssc-status').scrollIntoViewIfNeeded();
   const statusGeometry=await side.locator('.ssc-status .sts-row').evaluate(row=>{const css=getComputedStyle(row),spark=row.querySelector('[data-cds=Spark]').getBoundingClientRect();return {height:row.getBoundingClientRect().height,gap:parseFloat(css.gap),sparkWidth:spark.width,sparkHeight:spark.height};});
   assert.deepEqual(statusGeometry,{height:20,gap:16,sparkWidth:18,sparkHeight:18},'classic current Ta row geometry');
   await shot('side-chat-streaming-'+via);
   if(via==='button')await side.getByRole('button',{name:'Stop response',exact:true}).click();else{await side.focus();await page.keyboard.press('Escape');}
   await poll(async()=>!(await questionInput().isDisabled()),'stop restores composer');
   assert.equal(await side.isVisible(),true,'stopping keeps the panel open');
   assert.ok((await side.locator('.ssc-answer').last().innerText()).includes('HOLD_CHUNK_'),'partial answer remains');
   assert.equal(await side.getByRole('alert').count(),0);assert.equal(await side.getByRole('button',{name:'Retry',exact:true}).count(),0);
   const trace=await page.evaluate(()=>{window.__sideStatusObserver.disconnect();delete window.__sideStatusObserver;return window.__sideStatusTrace;});
   assert.ok(trace.some(s=>s.phase==='running'&&s.clock===null),'clock starts hidden');assert.ok(trace.some(s=>s.phase==='running'&&s.clock),'clock appears after two seconds');
   assert.ok(trace.some(s=>s.phase==='running'&&s.visual.includes('Waiting for')),'first-response waiting label is visible');
   assert.ok(trace.some(s=>s.phase==='stopping'&&s.announcement==='Stopping…'&&s.clock===null),'stop has its own announcement and hides elapsed clock');
   assert.equal(trace.at(-1).phase,'idle');assert.equal(trace.at(-1).announcement,'');assert.equal(trace.at(-1).clock,null);
   assert.equal(await side.locator('.ssc-status [data-cds=Spark]').count(),1,'idle retains one source mark');assert.equal(await side.locator('.ssc-status [data-cds=Spark]').getAttribute('data-spark-state'),null);
   report.metrics['sideStatus-'+via]=trace;

 }
 report.checks.push('Current side working row persists during text streaming, announces Thinking, reveals the elapsed clock after two seconds, changes to Stopping via button/Escape and retains only the static mark when idle');
 const stops=(await requests()).filter(call=>call.method==='turn/interrupt');assert.equal(stops.length,2);
 assert.ok(stops.every(call=>call.params.threadId!==A&&call.params.threadId!==B),'only side forks are interrupted');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion,'main history remains unchanged after both stops');
 await questionInput().fill('session A private draft');
 await page.locator(`[data-source-session-id="${B}"] .source-session-open`).click();await side.waitFor({state:'hidden'});await showSide();await side.waitFor();
 assert.equal(await questionInput().evaluate(n=>n.value),'','session B does not inherit session A draft');await questionInput().fill('session B private draft');
 await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await side.waitFor({state:'hidden'});await showSide();await side.waitFor();
 assert.equal(await questionInput().evaluate(n=>n.value),'session A private draft');
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();assert.equal(await questionInput().evaluate(n=>n.value),'session A private draft','toolbar clear preserves draft');
 assert.equal(await side.locator('.ssc-user').count(),0);
 for(const command of ['/clear','/RESET','/new']){
   await questionInput().fill('ordinary question');await questionInput().press('Enter');await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();
   await poll(async()=>!(await questionInput().isDisabled()),'answer settles');const before=await starts();
   await questionInput().fill(command);await questionInput().press('Enter');await side.locator('.ssc-empty').waitFor();
   assert.equal(await questionInput().evaluate(n=>n.value),'');assert.equal(await starts(),before,command+' is not sent to the model');
 }
 step('side-chat-current-layout');
 assert.equal(await side.locator('.ssc-context').count(),0,'current panel has no legacy message-count strip');
 assert.equal(await side.locator('.ssc-header [data-cds="Shortcut"]').count(),0,'close shortcut lives in its tooltip');
 assert.equal(await questionInput().getAttribute('contenteditable'),'true');assert.ok((await questionInput().getAttribute('class')).includes('ProseMirror'));
 const sideLayout=await side.evaluate(node=>{const css=getComputedStyle(node),header=getComputedStyle(node.querySelector('.ssc-header')),empty=getComputedStyle(node.querySelector('.ssc-empty p')),composer=getComputedStyle(node.querySelector('.ssc-composer'));
  const probe=node.ownerDocument.createElement('span');probe.style.borderRadius='var(--cds-radius)';node.append(probe);const baseRadius=parseFloat(getComputedStyle(probe).borderRadius);probe.remove();
  return {scale:parseFloat(css.getPropertyValue('--cds-rem-scale'))||1,radius:parseFloat(css.borderRadius),baseRadius,headerHeight:parseFloat(header.height),headerBorder:header.borderBottomWidth,darkOutline:getComputedStyle(node.querySelector('.ssc-content')).outlineWidth,emptyBackground:empty.backgroundColor,emptyAlign:empty.textAlign,emptyPadding:empty.paddingLeft,composerBorder:composer.borderTopWidth};});
 assert.equal(sideLayout.headerHeight,32*sideLayout.scale);assert.equal(sideLayout.radius,sideLayout.baseRadius+4*sideLayout.scale);
 assert.equal(sideLayout.darkOutline,'1px');assert.equal(sideLayout.headerBorder,'0px');assert.equal(sideLayout.composerBorder,'0px');assert.equal(sideLayout.emptyAlign,'start');
 assert.notEqual(sideLayout.emptyBackground,'rgba(0, 0, 0, 0)');assert.match(await side.locator('.ssc-empty').innerText(),/Codex sees the full context/);
 const sendGlyph=await side.getByRole('button',{name:'Send',exact:true}).locator('[data-cds="Icon"]').innerText();assert.equal(sendGlyph,glyph('ArrowReturn'));
 await side.getByRole('button',{name:'Close side chat',exact:true}).hover();await page.getByRole('tooltip').filter({hasText:'Close side chat'}).waitFor();
 assert.ok(await page.getByRole('tooltip').filter({hasText:'Close side chat'}).locator('[data-cds="Shortcut"],kbd').count(),'close tooltip renders its shortcut');
 await page.mouse.move(500,400);await questionInput().fill('first line');const beforeEditor=await starts();
 await questionInput().press('Shift+Enter');await page.keyboard.type('second line');await questionInput().press('Alt+Enter');await page.keyboard.type('third line');
 const multiline=await questionInput().evaluate(n=>n.value);assert.equal(multiline,'first line\nsecond line\nthird line');assert.equal(await starts(),beforeEditor);
 await questionInput().press('Meta+z');assert.notEqual(await questionInput().evaluate(n=>n.value),multiline);await questionInput().press('Meta+Shift+z');assert.equal(await questionInput().evaluate(n=>n.value),multiline);
 await questionInput().evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true})));
 assert.equal(await starts(),beforeEditor,'IME composing Enter does not submit');assert.equal(await questionInput().evaluate(n=>n.value),multiline);
 await shot('side-chat-editor-multiline');await questionInput().press('Enter');await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();
 assert.equal(await side.locator('.ssc-user').last().innerText(),multiline,'rich editor sends exact multiline text');
 // OT/RW: measure on the inner bubble only, current compact tokens and no answer footer.
 await questionInput().fill('Long side question '+ 'wrap '.repeat(100));await questionInput().press('Enter');
 await poll(async()=>await questionInput().getAttribute('contenteditable')==='true'&&(await side.locator('.ssc-answer').count())===2,'long question settled');
 const messageLayout=await side.evaluate(node=>{
   const messages=node.querySelector('.ssc-messages'),user=[...node.querySelectorAll('.ssc-user')].at(-1),body=user.querySelector('.ssc-user-body'),bubble=user.querySelector('.ssc-user-bubble'),answer=[...node.querySelectorAll('.ssc-answer')].at(-1),text=answer.querySelector('.ssc-answer-text');
   const css=getComputedStyle(bubble),probe=document.createElement('div');probe.style.cssText='position:absolute;visibility:hidden;background:var(--cds-bg-user-message);border-radius:calc(var(--cds-radius) + .25rem * var(--cds-rem-scale,1));padding:var(--cds-pad-md) var(--cds-pad-lg);font-size:var(--cds-font-size-heading);line-height:var(--cds-leading-heading)';node.append(probe);const expected=getComputedStyle(probe);
   const result={userWidth:user.getBoundingClientRect().width,bodyWidth:body.getBoundingClientRect().width,bubbleWidth:bubble.getBoundingClientRect().width,answerInset:text.getBoundingClientRect().left-answer.getBoundingClientRect().left,answerExtraHeight:answer.getBoundingClientRect().height-text.getBoundingClientRect().height,overflow:messages.scrollWidth>messages.clientWidth,
    actual:[css.backgroundColor,css.borderRadius,css.paddingTop,css.paddingLeft,css.fontSize,css.lineHeight],expected:[expected.backgroundColor,expected.borderRadius,expected.paddingTop,expected.paddingLeft,expected.fontSize,expected.lineHeight]};probe.remove();return result;
 });
 assert.ok(Math.abs(messageLayout.userWidth-messageLayout.bodyWidth)<1,'context wrapper takes full row width');
 assert.ok(Math.abs(messageLayout.bubbleWidth-messageLayout.userWidth*.85)<1,'bubble applies original 85% measure once');
 assert.deepEqual(messageLayout.actual,messageLayout.expected,'bubble uses current compact message color, radius, padding and heading typography');
 assert.equal(messageLayout.answerInset,0);assert.equal(messageLayout.answerExtraHeight,0);assert.equal(messageLayout.overflow,false);
 assert.equal(await side.getByRole('button',{name:'Copy answer',exact:true}).count(),0);assert.equal(await side.getByRole('button',{name:'Branch to new chat',exact:true}).count(),0);
 report.metrics.sideMessageLayout=messageLayout;report.checks.push('Current OT/RW side-chat messages use full-width context rows and one 85% bubble measure, compact source color/radius/padding/heading tokens, with no assistant inset or legacy Copy/Branch footer; long questions do not overflow');
 await shot('side-chat-message-layout');
 step('side-chat-user-content');
 const syntheticAnthropic='sk-ant-'+'x'.repeat(32),syntheticGithub='ghp_'+'y'.repeat(32),syntheticAws='AKIA'+'A'.repeat(24);
 const richSideQuestion=['List question','','3. third','4. fourth','   * nested','','Literal `code` https://example.com','','```js','* literal fence','```','','Secrets: '+syntheticAnthropic+' '+syntheticGithub+' '+syntheticAws].join('\n');
 await questionInput().fill(richSideQuestion);assert.equal(await questionInput().evaluate(n=>n.value),richSideQuestion);await questionInput().press('Enter');
 await poll(async()=>await side.locator('.ssc-answer').count()===3&&!(await questionInput().isDisabled()),'list side answer settles');
 const userContent=side.locator('.ssc-user-content').last();await userContent.locator('ol[start="3"]').waitFor();assert.equal(await userContent.locator('ol > li').count(),2);assert.equal(await userContent.locator('ol ul > li').innerText(),'nested');
 assert.equal(await userContent.locator('pre,code,a').count(),0,'source ordinary user content keeps code and links literal');
 assert.ok((await userContent.innerText()).includes('```js\n* literal fence\n```'));
 const listPaint=await userContent.locator('ol').evaluate(n=>({style:getComputedStyle(n).listStyleType,padding:getComputedStyle(n).paddingLeft,gap:getComputedStyle(n).gap}));
 assert.deepEqual(listPaint,{style:'decimal',padding:'20px',gap:'6px'});
 const bodyBeforeReveal=await userContent.evaluate(n=>n.outerHTML);assert.ok(!bodyBeforeReveal.includes(syntheticAnthropic)&&!bodyBeforeReveal.includes(syntheticGithub)&&!bodyBeforeReveal.includes(syntheticAws),'fake secrets are masked in the DOM');
 assert.equal(await userContent.locator('[data-redacted-secret]').count(),3);assert.ok(!(await userContent.locator('[data-redacted-secret]').last().innerText()).includes('A'.repeat(12)),'current detector masks extended fixed-length token suffixes');
 const revealAnthropic=userContent.getByRole('button',{name:'Reveal Anthropic API key',exact:true});await revealAnthropic.click();assert.ok((await userContent.innerText()).includes(syntheticAnthropic));assert.ok(!(await userContent.innerText()).includes(syntheticGithub));
 await userContent.getByRole('button',{name:'Hide Anthropic API key',exact:true}).click();
 const revealGithub=userContent.getByRole('button',{name:'Reveal GitHub token',exact:true});await revealGithub.focus();await page.keyboard.press('Enter');assert.equal(await userContent.getByRole('button',{name:'Hide GitHub token',exact:true}).getAttribute('aria-pressed'),'true');await page.keyboard.press('Enter');
 assert.ok(!(await userContent.innerText()).includes(syntheticGithub));
 const richRequest=(await requests()).filter(call=>call.method==='turn/start').at(-1);assert.equal(richRequest.params.input[0].text,richSideQuestion,'presentation leaves original side-question wire text intact');
 await userContent.locator('ol').scrollIntoViewIfNeeded();await shot('side-chat-user-lists');await revealGithub.scrollIntoViewIfNeeded();await shot('side-chat-user-redaction');
 report.checks.push('Current original user-list parser/renderer preserves ordered starts and nested lists, keeps code fences/links literal, masks synthetic secrets with independent mouse/keyboard reveal toggles and sends unchanged question text through the real fork');


 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();
 report.metrics.sideChatLayout=sideLayout;
 report.checks.push('Current side-chat layout uses a 32px header, token card radius, tooltip-only close shortcut, top alpha notice naming the configured core and no legacy count/separators; shared ProseMirror editor supports Shift/Alt Enter, undo/redo, composing-Enter suppression and exact multiline dispatch with ArrowReturn');
 await shot('side-chat-reset');
 step('side-chat-file-mentions');
 const startsBeforeMention=await starts();
 await questionInput().fill('@read');
 const sideSuggestions=side.getByRole('listbox',{name:'Mention suggestions',exact:true});
 await sideSuggestions.getByRole('option').first().waitFor();
 const mentionMenuProbe=await sideSuggestions.evaluate(node=>{const r=node.getBoundingClientRect();return {visible:node.contains(document.elementFromPoint(r.left+r.width/2,r.top+Math.min(12,r.height/2))),width:r.width};});
 assert.equal(mentionMenuProbe.visible,true,'mention list is above the side panel and receives pointer input');
 await questionInput().press('Escape');await sideSuggestions.waitFor({state:'hidden'});assert.equal(await side.isVisible(),true,'first Escape only dismisses mention suggestions');
 await questionInput().fill('@');await sideSuggestions.getByRole('option').first().waitFor();
 const optionCount=await sideSuggestions.getByRole('option').count();assert.ok(optionCount>1);await page.mouse.move(0,0);
 await questionInput().press('End');await poll(async()=>await sideSuggestions.getByRole('option').last().getAttribute('aria-selected')==='true','End selects the last file option');
 await sideSuggestions.getByRole('option').nth(1).hover();await poll(async()=>await sideSuggestions.getByRole('option').nth(1).getAttribute('aria-selected')==='true','mouse hover paints its own option');
 await page.mouse.move(0,0);await poll(async()=>await sideSuggestions.getByRole('option').last().getAttribute('aria-selected')==='true','leaving restores the keyboard option');
 await questionInput().press('ArrowDown');await poll(async()=>await sideSuggestions.getByRole('option').first().getAttribute('aria-selected')==='true','Down wraps to the first file option');
 await questionInput().fill('@read');await sideSuggestions.getByRole('option').filter({hasText:'README.md'}).waitFor();
 await shot('side-chat-file-mentions');
 await questionInput().press('Enter');await sideSuggestions.waitFor({state:'hidden'});
 await questionInput().locator('[data-mention="README.md"]').waitFor();assert.equal(await starts(),startsBeforeMention,'Enter picks a file without submitting');
 assert.equal(await page.locator('.sc-input:not(.ssc-input) [data-mention="README.md"]').count(),0,'side file picks do not touch the main draft');
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await showSide();
 await questionInput().locator('[data-mention="README.md"]').waitFor();
 // File chips share the same copy/open/delete menu; Escape must not close the side panel.
 await questionInput().locator('.sc-mention-chip').click();
 const mentionActionsMenu=page.getByRole('menu',{name:'Mention actions',exact:true});await mentionActionsMenu.waitFor();
 assert.equal(await mentionActionsMenu.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}),true,'file chip actions sit above the side panel');
 await page.keyboard.press('Escape');await mentionActionsMenu.waitFor({state:'hidden'});assert.equal(await side.isVisible(),true);
 await questionInput().press('End');await questionInput().press('Enter');
 await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();await poll(async()=>!(await questionInput().isDisabled()),'file mention answer finishes');
 const mentionRequest=(await requests()).filter(call=>call.method==='turn/start').at(-1);assert.ok(mentionRequest.params.input[0].text.endsWith('@README.md'),'file path reaches the actual side fork');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion,'file mention question leaves parent history unchanged');
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();
 // Closing during the search debounce must leave no body-portal menu behind.
 await questionInput().fill('@read');await side.getByRole('button',{name:'Close side chat',exact:true}).click();await new Promise(resolve=>setTimeout(resolve,250));
 assert.equal(await page.getByRole('listbox',{name:'Mention suggestions',exact:true}).count(),0);await showSide();await questionInput().fill('');
 report.checks.push('Side composer file mentions use isolated project search; menu is pointer-visible, wraps keyboard selection, consumes first Enter/Escape, keeps atomic file chips across close/reopen, sends the path only to the real side fork and leaves no menu after close');
 step('side-chat-native-progress');
 const customizeBeforeProgress=JSON.parse(await fs.readFile(path.join(profile,'fixture-customize.json'),'utf8'));
 await fs.writeFile(path.join(profile,'fixture-customize.json'),JSON.stringify({...customizeBeforeProgress,sideForkDelayMs:800}));
 await questionInput().fill('Lifecycle warmup');await questionInput().press('Enter');
 const sideStatus=()=>side.locator('.ssc-status');
 await side.locator('.ssc-title').getByText('Forking…',{exact:true}).waitFor();await sideStatus().getByRole('status').getByText('Forking session…',{exact:true}).waitFor();
 assert.equal(await questionInput().isDisabled(),true);await shot('side-chat-forking');
 await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();await poll(async()=>!(await questionInput().isDisabled()),'fork warmup finishes');assert.equal(await side.locator('.ssc-title').innerText(),'Side chat');
 await fs.writeFile(path.join(profile,'fixture-customize.json'),JSON.stringify(customizeBeforeProgress));
 const forksBeforeTools=(await requests()).filter(call=>call.method==='thread/fork').length;
 await questionInput().fill('fixture:side-tools');await questionInput().press('Enter');
 await sideStatus().getByRole('status').getByText('Reading README.md',{exact:true}).waitFor();
 await sideStatus().locator('.sts-activity').getByText('Running tools…',{exact:true}).waitFor();assert.equal(await side.locator('.ssc-title').innerText(),'Side chat');
 await sideStatus().getByRole('status').getByText('Searching for needle',{exact:true}).waitFor();await shot('side-chat-tool-activity');
 await sideStatus().getByRole('status').getByText('Finding files',{exact:true}).waitFor();
 await side.locator('.ssc-status[data-side-stage="waiting"]').waitFor();assert.equal(await sideStatus().getByRole('status').innerText(),'Thinking…');
 await side.getByText('SIDE_TOOL_REPLY',{exact:true}).waitFor();await poll(async()=>!(await questionInput().isDisabled()),'tool side reply settles');
 assert.equal(await sideStatus().getAttribute('data-side-status'),'idle');assert.equal(await sideStatus().getAttribute('data-side-stage'),null);
 assert.equal((await requests()).filter(call=>call.method==='thread/fork').length,forksBeforeTools,'follow-up tools reuse the ephemeral fork');
 await questionInput().fill('fixture:side-close');await questionInput().press('Enter');await side.getByRole('button',{name:'Stop response',exact:true}).waitFor();await poll(async()=>!(await questionInput().isDisabled()),'closed side fork releases the pending question');
 assert.equal(await sideStatus().getAttribute('data-side-status'),'idle');assert.equal(await side.getByRole('alert').count(),0);assert.equal(await side.getByRole('button',{name:'Retry',exact:true}).count(),0);assert.equal(await side.isVisible(),true);
 await questionInput().fill('Restart after side close');await questionInput().press('Enter');await poll(async()=>!(await questionInput().isDisabled())&&(await side.locator('.ssc-answer').count())===3,'new question starts a fresh fork after close');assert.equal((await requests()).filter(call=>call.method==='thread/fork').length,forksBeforeTools+1);


 const recoveredRequest=(await requests()).filter(call=>call.method==='turn/start').at(-1).params;
 const recoveredText=recoveredRequest.input[0].text;
 assert.ok(recoveredText.startsWith('Side conversation boundary.'));
 assert.ok(recoveredText.includes('<side_chat_history>\nUser: Lifecycle warmup'));
 assert.ok(recoveredText.includes('Assistant: CUSTOMIZE_FIXTURE_REPLY'));
 assert.ok(recoveredText.includes('User: fixture:side-tools'));assert.ok(recoveredText.includes('Assistant: SIDE_TOOL_REPLY'));
 assert.ok(recoveredText.includes('User: Restart after side close'));assert.ok(!recoveredText.includes('User: fixture:side-close'),'the unanswered closed question was replaced, not replayed');
 assert.equal(recoveredText.split('User: Lifecycle warmup').length,2,'history appears once');
 assert.equal(await side.locator('.ssc-user').last().innerText(),'Restart after side close','the transport replay never replaces the visible question');
 await shot('side-chat-history-recovered');
 await questionInput().fill('Healthy follow-up after recovery');await questionInput().press('Enter');
 await poll(async()=>!(await questionInput().isDisabled())&&(await side.locator('.ssc-answer').count())===4,'recovered fork handles its next question');
 const healthyRequest=(await requests()).filter(call=>call.method==='turn/start').at(-1).params;
 assert.equal(healthyRequest.threadId,recoveredRequest.threadId);assert.equal(healthyRequest.input[0].text,'Healthy follow-up after recovery');
 report.checks.push('After unexpected native fork closure, a fresh read-only fork receives bounded source-formatted prior side questions and answers plus the latest unanswered question; the visible question stays unchanged, parent history is untouched and a healthy follow-up does not replay history twice');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion,'tool lifecycle events never enter parent history');
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();
 report.checks.push('Real native fork lifecycle events show Forking header/status during delayed thread/fork, then structured Read/Search/List tool announcements and Running tools, model wait, final answer and idle; follow-ups reuse the fork, unexpected fork closure releases busy state without a false error/retry, and parent history remains untouched');

 report.checks.push('Side chat Stop button/Escape interrupt only the real ephemeral fork, keep partial output and leave the panel open without error/retry; busy input is disabled; per-session drafts survive switches; toolbar Clear retains draft and /clear /reset /new clear locally without model calls');
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 step('transcript-side-chat-selection');
 const selectedQuote='Selected transcript context';
 const selectionToolbar=()=>page.getByRole('toolbar',{name:'Selection actions',exact:true});
 const selectQuote=async()=>{
   const row=page.locator('[data-transcript-item-id="selection-answer"]');await row.scrollIntoViewIfNeeded();
   await row.evaluate(node=>{const body=node.querySelector('.smd')??node;const range=document.createRange();range.selectNodeContents(body);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
   await selectionToolbar().waitFor();
 };
 const beforeSelection=await starts();await selectQuote();
 assert.deepEqual(await selectionToolbar().getByRole('button').allTextContents(),['Send to side chat','Reply']);
 await shot('transcript-selection-toolbar');await selectionToolbar().getByRole('button',{name:'Send to side chat',exact:true}).click();await side.waitFor();
 assert.equal(await starts(),beforeSelection,'selection only stages context, it does not start a request');
 const staged=()=>side.locator('.ssc-composer [data-kind="snippet"]');await staged().waitFor();
 assert.equal(await questionInput().evaluate(n=>n===document.activeElement),true);
 await staged().getByRole('button',{name:selectedQuote,exact:true}).click();await page.locator('[data-cds="AttachmentPreview"]').waitFor();
 assert.equal(await page.locator('.sca-preview-text').innerText(),selectedQuote);
 await poll(()=>page.locator('.sca-preview-text').evaluate(n=>{const r=n.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-cds=AttachmentPreview]');}),'selection preview is painted above the side panel');await frames();await shot('side-chat-selection-preview');await page.keyboard.press('Escape');
 await page.locator('[data-cds="AttachmentPreview"]').waitFor({state:'hidden'});assert.equal(await side.isVisible(),true);
 await questionInput().fill('keep draft');await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 await showSide();await side.waitFor();assert.equal(await staged().count(),0,'closing discards context');assert.equal(await questionInput().evaluate(n=>n.value),'keep draft');
 await questionInput().fill('');await selectQuote();await selectionToolbar().getByRole('button',{name:'Send to side chat',exact:true}).click();await staged().waitFor();
 await staged().hover();await staged().getByRole('button',{name:'Remove '+selectedQuote,exact:true}).click();assert.equal(await staged().count(),0);assert.equal(await questionInput().evaluate(n=>n===document.activeElement),true);
 await selectQuote();await selectionToolbar().getByRole('button',{name:'Send to side chat',exact:true}).click();await staged().waitFor();
 await questionInput().fill('Explain this selection');await questionInput().press('Enter');await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();
 assert.equal(await staged().count(),0);assert.equal(await side.locator('.ssc-user p').last().innerText(),'Explain this selection');
 assert.equal(await side.locator('.ssc-user [data-kind="snippet"]').count(),1);assert.equal(await side.locator('.ssc-user .sca-remove').count(),0,'sent selection is a read-only preview');
 await side.locator('.ssc-user [data-kind="snippet"]').getByRole('button').click();await page.locator('[data-cds=AttachmentPreview]').waitFor();
 await poll(()=>page.locator('.sca-preview-text').evaluate(n=>{const r=n.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-cds=AttachmentPreview]');}),'sent quote preview is painted above the side panel');await page.keyboard.press('Escape');await page.locator('[data-cds=AttachmentPreview]').waitFor({state:'hidden'});
 const selectionStart=(await requests()).filter(call=>call.method==='turn/start').at(-1);
 assert.ok(JSON.stringify(selectionStart.params).includes('<!-- attach -->\\n> Selected transcript context\\n\\nExplain this selection'),'actual fork receives the original context wire format');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion,'selection question does not mutate the parent');
 await shot('side-chat-selection-answer');await selectQuote();await selectionToolbar().getByRole('button',{name:'Send to side chat',exact:true}).click();await staged().waitFor();
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();assert.equal(await staged().count(),1,'clear messages preserves staged context');
 await page.evaluate(()=>getSelection().removeAllRanges());await selectionToolbar().waitFor({state:'hidden'});
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 report.checks.push('Original transcript selection toolbar stages a previewable/removable quote without model calls; close clears only context, send uses original attachment wire on a read-only fork, sent quote previews are immutable, and started sessions use Send to side chat');
 step('side-chat-source-scroll');
 await showSide();await side.waitFor();
 for(let index=0;index<3;index++){
   await questionInput().fill('Earlier side question '+index);await questionInput().press('Enter');
   await poll(async()=>await side.locator('.ssc-answer').count()===index+1&&!(await questionInput().isDisabled()),'earlier side answer');
 }
 const scrollSnapshot=()=>side.locator('.ssc-messages').evaluate(node=>{
   const bounds=node.getBoundingClientRect();
   const lastUser=[...node.querySelectorAll('.ssc-user')].at(-1),text=[...node.querySelectorAll('.ssc-answer')].at(-1)?.textContent??'';
   const chunks=[...text.matchAll(/HOLD_CHUNK_(\d+)/g)].map(match=>Number(match[1]));
   return {top:node.scrollTop,height:node.scrollHeight,view:node.clientHeight,userOffset:lastUser?lastUser.getBoundingClientRect().top-bounds.top:null,lastChunk:Math.max(0,...chunks)};
 });
 await questionInput().fill('fixture:hold');await questionInput().press('Enter');
 await poll(async()=>{const r=await scrollSnapshot();return r.lastChunk>=10&&r.height>r.view+300;},'long side reply');
 const anchored=await scrollSnapshot();assert.ok(Math.abs(anchored.userOffset-8)<=1,'source keeps the current question eight pixels below the top');
 await poll(async()=>(await scrollSnapshot()).lastChunk>=anchored.lastChunk+2,'reply grows after anchoring');
 const grown=await scrollSnapshot();assert.ok(Math.abs(grown.top-anchored.top)<=1,'long reply does not chase its tail');assert.ok(grown.height-grown.view-grown.top>100);
 await shot('side-chat-long-reply-anchor');
 const messageBounds=await side.locator('.ssc-messages').boundingBox();await page.mouse.move(messageBounds.x+messageBounds.width/2,messageBounds.y+messageBounds.height/2);await page.mouse.wheel(0,-120);
 await poll(async()=>(await scrollSnapshot()).top<grown.top-60,'read earlier side messages');await frames();const reading=await scrollSnapshot();
 await poll(async()=>(await scrollSnapshot()).lastChunk>=reading.lastChunk+2,'reply grows while reading history');
 assert.ok(Math.abs((await scrollSnapshot()).top-reading.top)<=1,'stream leaves manual reading position intact');
 await side.getByRole('button',{name:'Stop response',exact:true}).click();await poll(async()=>!(await questionInput().isDisabled()),'long reply stopped');
 assert.ok(Math.abs((await scrollSnapshot()).top-reading.top)<=1,'settling response keeps reading position');await shot('side-chat-long-reply-history');
 await questionInput().fill('New question after reading history');await questionInput().press('Enter');await poll(async()=>!(await questionInput().isDisabled())&&await side.locator('.ssc-answer').count()===5,'new answer after history');
 const latest=await scrollSnapshot();assert.ok(latest.userOffset>=0&&latest.userOffset<latest.view-20,'new question becomes visible');
 await page.locator(`[data-source-session-id="${B}"] .source-session-open`).click();await side.waitFor({state:'hidden'});await showSide();await side.locator('.ssc-empty').waitFor();
 await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await side.waitFor({state:'hidden'});await showSide();await side.waitFor();
 const reopened=await scrollSnapshot();assert.ok(reopened.userOffset>=0&&reopened.userOffset<reopened.view-20,'returning from another session targets this session’s last question');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion);
 report.metrics.sideChatScroll={anchored,grown,reading,latest,reopened};
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 report.checks.push('Original side-chat scrolling anchors the question 8px below the viewport during a real long stream, retains manual history reading through growth/Stop, exposes the next question, and resets correctly across sessions without changing parent history');
 step('side-chat-background-lifecycle');
 await showSide();await side.waitFor();const beforeUnmount=await panelRect();
 const storedPanel=await page.evaluate(()=>JSON.parse(localStorage.getItem('epitaxy.sideChat.v1')));
 near(storedPanel,beforeUnmount,'completed drag writes source geometry key');
 // Warm the fresh fork: its first prompt carries the native boundary, whereas fixture:hold is an exact fixture command.
 await questionInput().fill('Background lifecycle warmup');await questionInput().press('Enter');await side.getByText('CUSTOMIZE_FIXTURE_REPLY',{exact:true}).waitFor();await poll(async()=>!(await questionInput().isDisabled()),'background fork ready');
 await questionInput().fill('fixture:hold');await questionInput().press('Enter');
 await poll(async()=>(await scrollSnapshot()).lastChunk>=2,'stream before leaving session');
 await poll(async()=>parseInt(await side.locator('.ssc-status [data-runtime-stat=elapsed]').textContent().catch(()=>''),10)>=2,'background clock reaches two seconds');
 const beforeLeavingClock=await side.locator('.ssc-status [data-runtime-stat=elapsed]').innerText();
 const beforeLeaving=await scrollSnapshot();await page.getByRole('button',{name:'New',exact:true}).click();
 await poll(async()=>await page.locator('.ssc-root').count()===0,'side panel completely unmounts on New');
 // Wait on actual fork traffic, rather than a wall-clock guess, while no panel exists.
 await poll(async()=>{
   const calls=await requests(),lastStart=calls.filter(call=>call.method==='turn/start').at(-1);
   const database=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8'));
   return !!lastStart&&database.threads[lastStart.params.threadId]?.turns.at(-1)?.status==='inProgress';
 },'side fork remains active without a view');
 // The fixture persists at completion, so observe delivered native events for streamed progress.
 const eventChunks=()=>app.evaluate(({BrowserWindow})=>{
   const win=BrowserWindow.getAllWindows()[0];return win.webContents.executeJavaScript('window.__sideLifecycleChunks??0');
 });
 await page.evaluate(()=>{window.__sideLifecycleChunks=0;window.__stopSideLifecycleProbe=window.desktop.onEvent(e=>{if(e.method==='codeDesktop/sideQuestion/delta')window.__sideLifecycleChunks++;});});
 await poll(async()=>await eventChunks()>=4,'four deltas while side component is absent');
 await page.evaluate(()=>{window.__stopSideLifecycleProbe();delete window.__stopSideLifecycleProbe;delete window.__sideLifecycleChunks;});
 await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await page.locator('.loading-state').waitFor({state:'detached'});await showSide();await side.waitFor();
 near(await panelRect(),beforeUnmount,'panel rectangle survives full component unmount');
 await poll(async()=>(await scrollSnapshot()).lastChunk>=beforeLeaving.lastChunk+4,'background stream is visible on return');
 const assertContinuous=async()=>{
   const chunks=await side.locator('.ssc-answer').last().evaluate(n=>[...n.textContent.matchAll(/HOLD_CHUNK_(\d+)/g)].map(m=>Number(m[1])));
   assert.ok(chunks.length>=6);assert.deepEqual(chunks,Array.from({length:chunks.at(-1)},(_,i)=>i+1),'every streamed chunk appears once, including while absent');return chunks.length;
 };
 await assertContinuous();
 // Mount a second session App. Its hidden side panel must not subscribe to and duplicate A's stream.
 await page.locator(`[data-source-session-id="${B}"] .source-session-open`).click({button:'right'});
 await page.getByRole('menuitem',{name:'Open in',exact:true}).click();await page.getByRole('menu',{name:'Open in',exact:true}).getByRole('menuitem',{name:'Split view',exact:true}).click();
 await page.locator('.split-pane-secondary .st-title').waitFor();assert.equal(await page.locator('.ssc-root').count(),2);
 const beforeSplit=(await scrollSnapshot()).lastChunk;await poll(async()=>(await scrollSnapshot()).lastChunk>=beforeSplit+3,'stream with two mounted side panels');await assertContinuous();assert.ok(parseInt(await side.locator('.ssc-status [data-runtime-stat=elapsed]').innerText(),10)>=parseInt(beforeLeavingClock,10),'request clock survives complete view unmount and split mounting');await shot('side-chat-split-stream');
 await app.evaluate(({Menu,BrowserWindow})=>{const view=Menu.getApplicationMenu().items.find(i=>i.label==='View'),split=view.submenu.items.find(i=>i.label==='Split View'),close=split.submenu.items.find(i=>i.label==='Close Split View');close.click(close,BrowserWindow.getAllWindows()[0]);});
 await page.locator('.split-pane-secondary').waitFor({state:'detached'});await page.locator(`[data-source-session-id="${A}"] .source-session-open`).click();await page.locator('.loading-state').waitFor({state:'detached'});if(!await side.isVisible())await showSide();await side.waitFor();
 await assertContinuous();await side.getByRole('button',{name:'Stop response',exact:true}).click();await poll(async()=>!(await questionInput().isDisabled()),'background stream stops');
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[A].turns,beforeQuestion);
 await side.getByRole('button',{name:'Clear side chat',exact:true}).click();await side.locator('.ssc-empty').waitFor();await side.getByRole('button',{name:'Close side chat',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();await open();await showSide();await side.waitFor();
 near(await panelRect(),beforeUnmount,'original panel rectangle persists through renderer reload');assert.equal(await side.locator('.ssc-user').count(),0,'side messages are not persisted');await shot('side-chat-restored-geometry');
 await side.getByRole('button',{name:'Close side chat',exact:true}).click();await side.waitFor({state:'hidden'});
 report.checks.push('Request-owned side streams retain every chunk across full panel unmount and two mounted split views without duplicates; stop affects only the fork; original geometry key survives unmount/reload without persisting messages');
 if(!await pane().isVisible()){await page.getByRole('button',{name:'View options',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:'Files',exact:true}).click();await pane().waitFor();}
 await pane().getByRole('button',{name:'Go to file or search',exact:true}).click();await queryContent('?needle');
 // File headers and filename matches retain the shared file menu, without Ask about this.
 await pane().locator('.sfs-results').getByRole('button',{name:'content-a.txt',exact:true}).click({button:'right'});await fileActionsMenu().waitFor();
 assert.equal(await fileActionsMenu().getByRole('menuitem',{name:'Ask about this',exact:true}).count(),0);
 await page.waitForFunction(()=>document.activeElement?.closest('[role=menu]'));await page.keyboard.press('Escape');
 await queryContent('content-b');await pane().locator('.sfs-results').getByRole('button',{name:'content-b.txt',exact:true}).click({button:'right'});await fileActionsMenu().waitFor();
 assert.deepEqual(await itemsOf(fileActionsMenu()),['Attach as context','Copy','|',...OPEN_IN,'Show in Finder']);
 await page.waitForFunction(()=>document.activeElement?.closest('[role=menu]'));await page.keyboard.press('Escape');
 report.checks.push('Search-result context menus reuse file actions; matching lines offer Ask about this through the real read-only side-chat route with exact path/line/snippet and unchanged parent history; keyboard menu focus and middle/keyboard pinning match source behavior');
 step('multi-file-search-actions');
 await queryContent('content-');
 const searchRows=()=>pane().locator('.sfs-results [data-tree-row]');
 const multiSearchButton=name=>pane().locator('.sfs-results').getByRole('button',{name,exact:true});
 await searchRows().first().focus();await page.keyboard.press('Meta+a');await page.keyboard.press('Escape');
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),0);
 await multiSearchButton('content-cap.txt').click({modifiers:['Meta']});await multiSearchButton('content-a.txt').click({modifiers:['Meta']});
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),2);
 const selectedPaths=await pane().locator('.sfs-results [aria-selected="true"] button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 await multiSearchButton('content-a.txt').click({button:'right'});await fileActionsMenu().getByText('2 items selected',{exact:true}).waitFor();
 assert.deepEqual(await itemsOf(fileActionsMenu()),['Attach as context','Copy',...(OPEN_IN.length?['|',...OPEN_IN]:[])]);
 await shot('multi-file-search-menu');
 await saveClipboard();await fileActionsMenu().getByRole('menuitem',{name:'Copy',exact:true}).hover();
 assert.deepEqual(await itemsOf(page.getByRole('menu',{name:'Copy',exact:true})),['Absolute paths','Relative paths','Filenames']);
 await page.getByRole('menuitem',{name:'Relative paths',exact:true}).click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),selectedPaths.join('\n'));await restoreClipboard();
 await multiSearchButton('content-a.txt').click({button:'right'});await fileActionsMenu().getByRole('menuitem',{name:'Attach as context',exact:true}).click();
 for(const name of selectedPaths)await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).waitFor();
 assert.equal(await page.locator('[data-cds-attachment]').count(),2,'one batch stages both files');
 for(const name of selectedPaths){await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).hover();await page.getByRole('button',{name:`Remove ${name}`,exact:true}).click();}
 // Right-click on a nonselected row resets selection and restores the single-file menu.
 await multiSearchButton('content-b.txt').click({button:'right'});await fileActionsMenu().waitFor();
 assert.equal(await fileActionsMenu().getByText('2 items selected',{exact:true}).count(),0);
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),1);
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"] button').getAttribute('aria-label'),'content-b.txt');
 await page.waitForFunction(()=>document.activeElement?.closest('[role=menu]'));await page.keyboard.press('Escape');
 // Shift selection uses the most recent command-click anchor, then plain Escape clears the range.
 await multiSearchButton('content-a.txt').click({modifiers:['Meta']});await multiSearchButton('content-cap.txt').click({modifiers:['Shift']});
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),3);
 await searchRows().first().focus();await page.keyboard.press('Escape');
 assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),0);assert.equal(await contentFilter.inputValue(),'content-');
 await fs.copyFile(path.join(workspace,'photo.png'),path.join(workspace,'second-photo.png'));
 await queryContent('photo.png');assert.equal(await searchRows().count(),2);await searchRows().first().focus();await page.keyboard.press('Meta+a');
 await searchRows().first().locator('button').click({button:'right'});await fileActionsMenu().getByText('2 items selected',{exact:true}).waitFor();
 assert.deepEqual(await itemsOf(fileActionsMenu()),['Attach as context','Copy'],'image-only selection excludes external text editors');
 await page.waitForFunction(()=>document.activeElement?.closest('[role=menu]'));await page.keyboard.press('Escape');
 report.checks.push('Multi-selected filename results show the source count label and batch menu; Copy uses visual order and newline separation, Attach stages all selected files, unselected right-click resets selection, Cmd-click updates the Shift anchor, and Escape clears selection without clearing the query; image-only selections omit external text editors');
 await contentFilter.fill('?no-content-hit-anywhere');await pane().getByText('No matches in file contents',{exact:true}).waitFor();
 await queryContent('?capword');assert.equal(await contentRows().count(),5);await pane().getByText('More matches in this file.',{exact:true}).waitFor();
 await contentFilter.fill('');await pane().locator('.sfs-results[hidden]').waitFor({state:'attached'});
 report.checks.push('Question-mark content search scans real unopened files, groups matching lines, applies case/whole-word/regexp options and invalid-pattern states, supports hierarchical keyboard navigation, opens exact lines with the query/options in file Find, reports no matches and caps each file at five visible hits');
 step('nested-tree-selection');
 const plainTree=()=>pane().locator('.sfs-kept-tree [role="tree"][aria-label="Project files"]');
 const plainButton=name=>plainTree().getByRole('button',{name,exact:true});
 const selectedTree=()=>plainTree().locator('[data-tree-row][aria-selected="true"]');
 await plainTree().locator('[data-tree-row]').first().focus();await page.keyboard.press('Meta+a');await page.keyboard.press('Escape');
 assert.equal(await selectedTree().count(),0);assert.equal(await plainTree().getAttribute('aria-multiselectable'),'true');
 const activeBefore=(await tabsNow()).find(t=>t.selected)?.path;
 await plainButton('notes.txt').click({modifiers:['Meta']});await plainButton('README.md').click({modifiers:['Meta']});
 assert.equal(await selectedTree().count(),2);assert.equal((await tabsNow()).find(t=>t.selected)?.path,activeBefore,'modified tree clicks only change selection');
 const treePaths=await selectedTree().evaluateAll(nodes=>nodes.map(n=>n.querySelector('[data-tree-primary]').dataset.filePath));
 await plainButton('notes.txt').click({button:'right'});await fileActionsMenu().getByText('2 items selected',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.activeElement?.closest('[role=menu]'));
 assert.equal(await plainTree().locator('[data-tree-row-body]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).boxShadow!=='none').length),0,'only the keyboard-focused tree row can show a focus ring');
 await shot('nested-tree-multi-menu');
 await saveClipboard();await fileActionsMenu().getByRole('menuitem',{name:'Copy',exact:true}).hover();await page.getByRole('menuitem',{name:'Relative paths',exact:true}).click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),treePaths.join('\n'));await restoreClipboard();
 await plainButton('notes.txt').click({button:'right'});await fileActionsMenu().getByRole('menuitem',{name:'Attach as context',exact:true}).click();
 for(const name of treePaths)await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).waitFor();
 assert.equal(await page.locator('[data-cds-attachment]').count(),2);
 for(const name of treePaths){await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).hover();await page.getByRole('button',{name:`Remove ${name}`,exact:true}).click();}
 await plainButton('nested').click({button:'right'});await fileActionsMenu().waitFor();assert.equal(await selectedTree().count(),1);
 await fileActionsMenu().getByRole('menuitem',{name:'Attach as context',exact:true}).click();
 const folderPill=page.locator('[data-cds-attachment]').filter({has:page.getByRole('button',{name:'nested',exact:true})});await folderPill.waitFor();
 // R4i-gui GU1 (R4g-composer CP4): composer-attachment-tiles.mjs _r badges a directory "Folder" (a file: its upper-case extension).
 assert.match(await folderPill.textContent(),/Folder/,'attached directory keeps its Folder badge');
 await folderPill.hover();await page.getByRole('button',{name:'Remove nested',exact:true}).click();
 if(await plainButton('nested').evaluate(n=>n.closest('[data-tree-row]').getAttribute('aria-expanded'))!=='true')await plainButton('nested').click();
 await plainButton('deep.txt').waitFor();await plainButton('deep.txt').click({modifiers:['Meta']});
 await plainButton('deep.txt').evaluate(n=>n.closest('[data-tree-row]').focus());await page.keyboard.press('Shift+ArrowDown');
 assert.equal(await selectedTree().count(),2,'shift navigation spans flattened visible nested rows');
 await page.keyboard.press('Escape');assert.equal(await selectedTree().count(),0);
 await page.keyboard.press('Meta+Space');assert.equal(await selectedTree().count(),1);
 await page.keyboard.press('Shift+F10');await fileActionsMenu().waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')?.startsWith('menuitem'));
 await page.keyboard.press('Escape');await fileActionsMenu().waitFor({state:'detached'});assert.equal(await plainTree().evaluate(n=>n.contains(document.activeElement)),true);
 report.checks.push('Nested file tree uses original multi-selection/range/anchor state; modified clicks preserve preview, batch context Copy and Attach operate on visual order, directory attachments retain Folder identity, Shift navigation crosses visible nesting, Escape clears selection and keyboard context menus restore tree focus');
 step('file-context-drag');
 // R4i-gui GU1 (R4i-graph GR3): in a Code session the drop target is the pane, not the card: main.jsx wraps
 // div.source-chat-tile-content in SourcePaneDropZone (generated c4c113f6f f, useFileDropTarget over cc63499d2 u) whose
 // appDrag accepts the owned file-context drag; while a drag is over it the zone draws the cc63499d2 d halo
 // (shadow-[inset_0_0_0_2px_var(--cds-fill-accent)]). The card has no drop handlers then (source-composer.jsx paneDrop).
 const composerDrop=page.locator('div:has(> .source-chat-tile-content)').first();
 const paneHalo=()=>composerDrop.evaluate(zone=>!!zone.querySelector(':scope > [class*="shadow-[inset_0_0_0_2px_var(--cds-fill-accent)]"]'));
 // Each tile's remove control is button[data-cds-attachment-remove] named "Remove {item}" (chat-composer-attachments.mjs dp/_p).
 const removeStaged=async()=>{for(const label of await page.locator('[data-cds-attachment] [data-cds-attachment-remove]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))){const name=label.replace(/^Remove /,'');await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).hover();await page.getByRole('button',{name:label,exact:true}).click();}};
 const dragTransfer=()=>page.evaluateHandle(()=>new DataTransfer());
 const dragRow=button=>button.locator('xpath=ancestor::*[@data-tree-row-body][1]');
 await plainTree().locator('[data-tree-row]').first().focus();await page.keyboard.press('Meta+a');await page.keyboard.press('Escape');
 await plainButton('notes.txt').click({modifiers:['Meta']});await plainButton('README.md').click({modifiers:['Meta']});
 const dt=await dragTransfer();const dragSource=dragRow(plainButton('notes.txt'));assert.equal(await dragSource.getAttribute('draggable'),'true');
 await dragSource.dispatchEvent('dragstart',{dataTransfer:dt});
 assert.deepEqual(await dt.evaluate(d=>[...d.types]),['application/x-claude-file-context']);assert.equal(await dt.evaluate(d=>d.getData('text/plain')),'');
 await composerDrop.dispatchEvent('dragenter',{dataTransfer:dt});await composerDrop.dispatchEvent('dragover',{dataTransfer:dt});await poll(paneHalo,'the session pane accepts the owned file-context drag (drop halo)');
 await composerDrop.dispatchEvent('drop',{dataTransfer:dt});await dragSource.dispatchEvent('dragend',{dataTransfer:dt});
 for(const name of ['notes.txt','README.md'])await page.locator('[data-cds-attachment]').getByRole('button',{name,exact:true}).waitFor();assert.equal(await page.locator('[data-cds-attachment]').count(),2);
 await shot('tree-drag-attachments');await removeStaged();
 // A drag outside the existing selection only carries that directory; cancellation clears its pending action.
 const folderSource=dragRow(plainButton('nested')),folderTransfer=await dragTransfer();
 await folderSource.dispatchEvent('dragstart',{dataTransfer:folderTransfer});await composerDrop.dispatchEvent('drop',{dataTransfer:folderTransfer});await folderSource.dispatchEvent('dragend',{dataTransfer:folderTransfer});
 assert.equal(await page.locator('[data-cds-attachment]').count(),1);assert.match(await page.locator('[data-cds-attachment]').textContent(),/Folder/);await removeStaged();
 const cancelledTransfer=await dragTransfer();await dragSource.dispatchEvent('dragstart',{dataTransfer:cancelledTransfer});await dragSource.dispatchEvent('dragend',{dataTransfer:cancelledTransfer});
 await composerDrop.dispatchEvent('drop',{dataTransfer:cancelledTransfer});assert.equal(await page.locator('[data-cds-attachment]').count(),0);
 // Blank-area press + click clears selection; pointercancel prevents the clearing click.
 await plainTree().dispatchEvent('pointerdown',{button:0,clientX:0,clientY:0});await plainTree().dispatchEvent('pointercancel');await plainTree().dispatchEvent('click');assert.equal(await selectedTree().count(),2);
 await plainTree().dispatchEvent('pointerdown',{button:0,clientX:0,clientY:0});await plainTree().dispatchEvent('click');assert.equal(await selectedTree().count(),0);
 await queryContent('content-');await searchRows().first().focus();await page.keyboard.press('Meta+a');
 const resultsBox=pane().locator('.sfs-results');await resultsBox.dispatchEvent('pointerdown',{button:0,clientX:0,clientY:0});await resultsBox.dispatchEvent('click');assert.equal(await resultsBox.locator('[aria-selected="true"]').count(),0);
 const searchDrag=resultsBox.locator('[data-tree-row]').first(),searchName=await searchDrag.locator('button').getAttribute('aria-label'),searchTransfer=await dragTransfer();
 await searchDrag.dispatchEvent('dragstart',{dataTransfer:searchTransfer});await composerDrop.dispatchEvent('drop',{dataTransfer:searchTransfer});await searchDrag.dispatchEvent('dragend',{dataTransfer:searchTransfer});
 await page.locator('[data-cds-attachment]').getByRole('button',{name:searchName,exact:true}).waitFor();assert.equal(await page.locator('[data-cds-attachment]').count(),1);await removeStaged();
 await queryContent('?needle');assert.ok((await contentRows().evaluateAll(nodes=>nodes.map(n=>n.getAttribute('draggable')))).every(value=>value==='false'),'content-hit rows are not file drag handles');
 await contentFilter.fill('');
 report.checks.push('Browser DataTransfer/DragEvent integration uses the original private marker to attach tree selections, unselected directories and filename results through the composer; dragend cancellation prevents stale drops, content hits are not draggable, and blank press/click clears selection unless pointercancel intervenes');
 step('shared-tree-search-selection');
 const treeSelectionPaths=()=>selectedTree().evaluateAll(nodes=>nodes.map(n=>n.querySelector('[data-tree-primary]').dataset.filePath));
 const searchSelectionPaths=()=>pane().locator('.sfs-results [aria-selected="true"] button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
 await plainButton('content-a.txt').click({modifiers:['Meta']});await plainButton('content-b.txt').click({modifiers:['Meta']});
 assert.deepEqual(await treeSelectionPaths(),['content-a.txt','content-b.txt']);
 await queryContent('content-');assert.deepEqual(await searchSelectionPaths(),['content-a.txt','content-b.txt'],'matching tree selection survives into filename results');
 await multiSearchButton('content-b.txt').click();await contentFilter.fill('');await plainTree().waitFor({state:'visible'});
 assert.deepEqual(await treeSelectionPaths(),['content-b.txt'],'clearing search uses the new shared selection, not the previous tree selection');
 await queryContent('content-');await multiSearchButton('content-cap.txt').click({modifiers:['Meta']});
 assert.deepEqual(await searchSelectionPaths(),['content-b.txt','content-cap.txt']);
 await queryContent('README.md');assert.deepEqual(await searchSelectionPaths(),[],'a nonempty filtered list retains only matching paths');
 await contentFilter.fill('');assert.deepEqual(await treeSelectionPaths(),[],'filtered-out selection cannot reappear in the tree');
 await plainButton('content-a.txt').click({modifiers:['Meta']});await queryContent('zz-file-does-not-exist');
 await pane().getByText('No matching files',{exact:true}).waitFor();await contentFilter.fill('');
 assert.deepEqual(await treeSelectionPaths(),['content-a.txt'],'an empty notice has no source Wv list and does not prune the existing selection');
 await queryContent('?needle');assert.equal(await pane().locator('.sfs-results [aria-selected="true"]').count(),0);await contentFilter.fill('');
 assert.deepEqual(await treeSelectionPaths(),[],'entering content mode clears the common selection');
 await queryContent('content-');await multiSearchButton('content-cap.txt').click({modifiers:['Shift']});
 assert.deepEqual(await searchSelectionPaths(),['content-cap.txt'],'Shift-click with no surviving anchor starts at the clicked result');
 await multiSearchButton('content-a.txt').click({modifiers:['Meta']});await searchRows().first().focus();await page.keyboard.press('Shift+End');
 assert.deepEqual(await searchSelectionPaths(),['content-a.txt','content-cap.txt'],'source Home/End focus movement does not extend selection');
 await contentFilter.focus();await page.keyboard.press('ArrowDown');await multiSearchButton('content-b.txt').click({modifiers:['Shift']});
 assert.deepEqual(await searchSelectionPaths(),['content-a.txt','content-b.txt'],'Down from the input moves the shared range anchor to the first result');
 await shot('shared-search-selection');
 await contentFilter.focus();await page.keyboard.press('Enter');
 await poll(async()=>JSON.stringify(await searchSelectionPaths())===JSON.stringify(['content-a.txt']),'Enter activation updates shared selection');
 await contentFilter.fill('');assert.deepEqual(await treeSelectionPaths(),['content-a.txt']);
 report.checks.push('Tree and filename results share original selection/anchor state across mode switches: nonempty lists prune hidden paths, empty notices preserve state, content mode clears it, unanchored Shift starts at the clicked row, Home/End do not extend a range, input Down sets the first-row anchor and Enter selects the activated file');
 step('file-search-entry-points');
 const filterSelection=()=>contentFilter.evaluate(n=>({value:n.value,start:n.selectionStart,end:n.selectionEnd,focused:document.activeElement===n}));
 await pane().getByRole('button',{name:'Close panel',exact:true}).click();await pane().waitFor({state:'detached'});
 await page.locator('[data-cds="ChatComposerEditor"]').focus();await page.keyboard.press('Meta+p');await pane().waitFor();
 await poll(async()=>await contentFilter.evaluate(n=>document.activeElement===n),'global Cmd P opens and focuses file filter');
 await contentFilter.fill('needle');
 const nativeFind=async()=>app.evaluate(({Menu,BrowserWindow})=>{
   const menu=Menu.getApplicationMenu(),item=menu.getMenuItemById('find-in-files');
   if(!item?.enabled)throw Error('Find in Files is not enabled');
   item.click(item,BrowserWindow.getAllWindows()[0],{});
 });
 await poll(async()=>await app.evaluate(({Menu})=>Menu.getApplicationMenu()?.getMenuItemById('find-in-files')?.enabled),'native Find in Files availability');
 await nativeFind();await poll(async()=>JSON.stringify(await filterSelection())===JSON.stringify({value:'?needle',start:1,end:7,focused:true}),'native content search prefixes and selects query');
 await pane().locator('.sfs-browser[data-search-phase="success"]').waitFor();assert.equal(await contentRows().count(),5);
 await nativeFind();await poll(async()=>JSON.stringify(await filterSelection())===JSON.stringify({value:'?needle',start:1,end:7,focused:true}),'repeated content entry does not double-prefix');
 await page.keyboard.type('capword');await pane().getByText('More matches in this file.',{exact:true}).waitFor();assert.equal(await contentFilter.inputValue(),'?capword');
 await pane().getByRole('button',{name:'Go to file or search',exact:true}).click();await poll(async()=>JSON.stringify(await filterSelection())===JSON.stringify({value:'?capword',start:0,end:8,focused:true}),'filter entry selects the full query');
 await contentFilter.evaluate(n=>n.setSelectionRange(3,3));await page.keyboard.press('Meta+p');await poll(async()=>(await filterSelection()).start===0&&(await filterSelection()).end===8,'pane Cmd P selects the full query');
 await contentFilter.fill('');await nativeFind();await poll(async()=>JSON.stringify(await filterSelection())===JSON.stringify({value:'?',start:1,end:1,focused:true}),'empty content entry places caret after question mark');
 await pane().getByText('Type after ? to search in files',{exact:true}).waitFor();await shot('native-find-in-files');
 await contentFilter.fill('');
 report.checks.push('Current Go to file or search toolbar label and Cmd+P work inside Files and from the composer with Files closed; real Electron Edit/Find menu dispatch opens content mode, prefixes ? once, selects only the query and places an empty-query caret after ?; normal filter entry selects the whole query');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app&&report.clipboardSaved&&!report.clipboardRestored){try{await restoreClipboard();}catch(error){report.clipboardRestoreError=String(error);report.passed=false;process.exitCode=1;}}
 if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'files-pane-ui-report.json'),bytes);console.log(bytes.slice(0,4000));}
