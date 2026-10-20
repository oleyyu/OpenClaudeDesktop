// Computer use in the real app (src/computer-use-model.mjs, source-computer-use.jsx) against the fixture core:
// `fixture:computer-use` streams a screenshot, an MCP click, an Anthropic-shape typing step, a drag and a held key
// press. Checks the docked strip (no action, no screenshot, Stop), the screenshot thumbnails and the image viewer, the tool group as the 2.42304.0
// original draws it (turnStatusRows on: the original group n0, its summary and one TurnStatusStep per member), and the
// dark appearance. The host's computerUse items read the official Code-tab verbs; the MCP / Anthropic computer tools are
// the original rows, which give a computer-use server the generic MCP wording until the session registers it as the
// built-in server (rows-c52b02f3f un / shared-156 wb).
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'computer-use-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true});
// The "desktop": any real screenshot of this app (a committed-style PNG from the onboarding evidence, else a 1x1).
const candidates=(await fs.readdir(evidence)).filter(name=>name.startsWith('onboarding-ui-')).map(name=>path.join(evidence,name,'welcome-light.png'));
let png=null;for(const file of candidates){try{png=await fs.readFile(file);break;}catch{}}
await fs.writeFile(path.join(profile,'fixture-computer.png'),png??Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/computer-use-ui-test.mjs','scripts/composer-test-helpers.mjs','tests/fixtures/codex-server.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,900));await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled')&&document.querySelector('[aria-label="Model"]')?.textContent.includes('Test model');});}
try{
 await integrity();await launch();
 const input=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
 await fillComposer(page,input,'fixture:computer-use');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 // 1. The official docked strip (c5f921d63 W) while the session uses the computer (main's in-use signal, from the first
 //    computer-use step to the end of the turn): first in the conversation column, above the
 //    transcript; clay tint and border, the pulsing dot, "{core} is using your computer", a secondary xs Stop; no action.
 const banner=page.locator('[data-computer-use-banner]');await banner.waitFor();
 report.metrics.banner=await banner.evaluate(n=>{const r=n.getBoundingClientRect(),first=document.querySelector('[data-transcript-item-id]')?.getBoundingClientRect(),s=getComputedStyle(n),dot=getComputedStyle(n.querySelector('span'));
  return {text:n.innerText.replace(/\s+/g,' ').trim(),bottom:r.bottom,firstItemTop:first?.top??null,borderBottom:s.borderBottomWidth,dot:[dot.width,dot.backgroundColor,dot.animationName],
   stop:n.querySelector('[data-testid="cu-docked-stop"]')?.dataset.size??null,stopVariant:n.querySelector('[data-testid="cu-docked-stop"]')?.dataset.variant??null,thumb:!!n.querySelector('img')};});
 assert.equal(report.metrics.banner.text,'Codex is using your computer Stop');
 assert.ok(report.metrics.banner.firstItemTop===null||report.metrics.banner.bottom<=report.metrics.banner.firstItemTop+1,'the strip sits above the transcript');
 assert.equal(report.metrics.banner.borderBottom,'1px');
 assert.deepEqual(report.metrics.banner.dot,['8px','rgb(198, 97, 63)','pulse'],'the 8px clay dot pulses');
 assert.deepEqual([report.metrics.banner.stop,report.metrics.banner.stopVariant],['xs','secondary']);
 assert.equal(report.metrics.banner.thumb,false,'no screenshot in the strip');
 await page.screenshot({path:path.join(directory,'banner.png')});
 report.checks.push('While the session uses the computer, the official docked strip sits above the transcript: clay tint, the pulsing 8px clay dot, “Codex is using your computer”, a secondary xs Stop, no action or screenshot');
 // The screen glow (electron/computer-use/glow.cjs) on the same signal: the original page in a transparent, click-through,
 // unfocusable panel on top of everything, over the display of the app's window.
 const glow=()=>app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(x=>!x.isDestroyed()&&x.webContents.getURL().endsWith('/cu-glow.html'));
  if(!w)return null;const main=BrowserWindow.getAllWindows().find(x=>x!==w&&!x.isDestroyed()&&x.isVisible());
  return {visible:w.isVisible(),onTop:w.isAlwaysOnTop(),focusable:w.isFocusable(),bounds:w.getBounds(),display:main?screen.getDisplayMatching(main.getBounds()).bounds:null};});
 await poll(async()=>(await glow())?.visible===true,'the glow shows');
 report.metrics.glow=await glow();
 await new Promise(r=>setTimeout(r,900));
 await fs.writeFile(path.join(directory,'glow.png'),Buffer.from(await app.evaluate(async({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(x=>!x.isDestroyed()&&x.webContents.getURL().endsWith('/cu-glow.html'));return (await w.webContents.capturePage()).toPNG().toString('base64');}),'base64'));
 assert.deepEqual([report.metrics.glow.onTop,report.metrics.glow.focusable],[true,false]);
 assert.deepEqual(report.metrics.glow.bounds,report.metrics.glow.display,'the glow covers the app window’s display');
 report.checks.push('The screen glow comes up with the strip: the original page in an always-on-top, unfocusable panel covering the app window’s display');
 await banner.waitFor({state:'detached',timeout:8000});
 await poll(async()=>(await glow())?.visible===false,'the glow hides',2000);
 report.checks.push('The strip goes away when the turn ends, and the glow fades and hides with it');
 // 2. The group: the original tool group over the five members.
 const group=page.locator('[data-tool-group]').last();await group.waitFor();
 await poll(async()=>/Used 5 tools/.test(await group.innerText()),'group summary');
 await group.locator('button').first().click();
 const steps=group.locator('[data-cds="TurnStatusStep"]');await poll(async()=>await steps.count()===5,'five rows');
 report.metrics.rows=await steps.evaluateAll(list=>list.map(n=>n.innerText.replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim()));
 assert.deepEqual(report.metrics.rows,['Captured screen','Used computer-use: left click','Used computer','Dragged','Pressed key ⌘S']);
 report.checks.push('Five steps in three shapes form the original group “Used 5 tools”; the host steps read the official verbs (Captured screen, Dragged, Pressed key ⌘S), the MCP / Anthropic tools the original rows’ generic wording for an unregistered server');
 // The host rows carry the action's icon before the verb (the chat renderer's computer-use icons).
 report.metrics.icons=await steps.evaluateAll(list=>list.map(n=>n.querySelector('[data-icon]')?.dataset.icon??null));
 assert.deepEqual(report.metrics.icons,['Camera',null,null,'Reorder','Keyboard']);
 report.checks.push('The host computer-use rows show the action’s icon before the verb: Camera, Reorder, Keyboard');
 // 3. The official screenshot thumbnail (cc1aae219 NH) in the step's media slot: 36×28, no marker; it opens the viewer.
 const thumbs=group.locator('[data-testid="tool-image-thumbnail"]');await poll(async()=>await thumbs.count()===2,'two thumbnails');
 report.metrics.thumbs=await thumbs.evaluateAll(list=>list.map(n=>{const r=n.getBoundingClientRect(),row=n.closest('[data-cds="TurnStatusStep"]');
  return {row:row?.innerText.replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim()??null,size:[Math.round(r.width),Math.round(r.height)],media:!!n.closest('[data-cds-row-media]'),title:n.title,alt:n.querySelector('img')?.alt??null,dot:!!n.querySelector('div'),markers:!!row?.querySelector('svg.scu-marker,.scu-ring')};}));
 assert.deepEqual(report.metrics.thumbs.map(t=>[t.row,t.size,t.media,t.title,t.alt,t.dot,t.markers]),[
  ['Captured screen',[36,28],true,'Click to view full screenshot','Screenshot thumbnail',false,false],['Dragged',[36,28],true,'Click to view full screenshot','Screenshot thumbnail',false,false]]);
 // A host row is a cell of the group: the thumbnail (28px) overflows the step's 1lh media slot without growing it.
 report.metrics.cellHeights=await steps.evaluateAll(list=>list.map(n=>Math.round(n.closest('.py-sm')?.getBoundingClientRect().height??-1)));
 assert.ok(Math.max(...report.metrics.cellHeights)-Math.min(...report.metrics.cellHeights)<=1,'every row of the group is one height');
 await thumbs.first().click();const viewer=page.locator('[data-cds="ImagePreviewModal"]');await viewer.waitFor();
 report.metrics.viewerCaption=await viewer.locator('.siv-caption').innerText();assert.equal(report.metrics.viewerCaption,'Captured screen');
 await page.keyboard.press('Escape');await viewer.waitFor({state:'detached'});assert.equal(await steps.count(),5,'the thumbnail does not toggle the group');
 report.checks.push('The steps with a screenshot carry the official 36×28 thumbnail in the step’s media slot, with no click dot or marker; pressing it opens the image viewer and Escape closes it');
 // 4. The computer-use card in the session rail (c21f11e6d P_ over c5f921d63 N): the transcript's last screenshot, no
 //    Live caption without a live preview; pressing the frame opens it.
 const card=page.locator('[data-computer-use-card]');await card.waitFor();
 report.metrics.card=await card.evaluate(n=>{const section=n.closest('section'),img=n.querySelector('img');
  return {title:section?.querySelector('h3')?.innerText.replace(/[\uE000-\uF8FF]/g,'').trim()??null,frame:img?.src.slice(0,22)??null,frameClass:img?.className??null,caption:n.querySelector('p')?.innerText??null,live:n.dataset.live??null};});
 assert.deepEqual(report.metrics.card,{title:'Computer use',frame:'data:image/png;base64,',frameClass:'w-full h-auto max-h-72 object-contain',caption:null,live:null});
 await card.locator('button').first().click();await viewer.waitFor();await page.keyboard.press('Escape');await viewer.waitFor({state:'detached'});
 await card.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'rail-card.png')});
 report.checks.push('The session rail shows the computer-use card with the last screenshot (no Live caption without a live preview); its frame opens the image viewer');
 await group.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'rows-light.png')});
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await group.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'rows-dark.png')});
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'computer-use-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
