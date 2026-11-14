import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {classifyMode,compareUi029Layout,comparisonKind,deriveUi029BaselineMode,expectedColumnInner,probeIssues,probeScrollbarMode} from './scrollbar-mode-gate.mjs';
import {IDS,makeFixture,USER_JS,USER_UNKNOWN,USER_TEXT,USER_B_JS,ASSISTANT_JS,TURN_COPY,OVERLONG,UNCLOSED,TILDE,STREAM_PROMPT,APPROVAL_PROMPT} from './ui029-fixtures.mjs';

// Copy this file plus ui029-fixtures.mjs into app/scripts. Run serially only
// after a fresh build, or against an explicit installed bundle. Never production
// data. UI029_BASELINE=1 is a separate geometry-only frozen-0.2.8 run.
// UI029_BASELINE_REPORT overrides the canonical frozen report path; the
// comparison is gated on the scrollbar mode of both reports (scrollbar-mode-gate).
const project=path.resolve(import.meta.dirname,'../..'),root=path.join(project,'app');
const baseline=process.env.UI029_BASELINE==='1',expectedFile=process.env.TEST_EXPECT_BUILD||path.join(root,'dist/build-info.json');
const sourceRoot=process.env.TEST_SOURCE_ROOT||root,appPath=process.env.TEST_APP_PATH?path.resolve(process.env.TEST_APP_PATH):null;
const executablePath=appPath?path.join(appPath,'Contents/MacOS/OpenClaude Desktop'):process.env.TEST_ELECTRON_BINARY||path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const fixture=path.join(root,'tests/fixtures/codex-server.cjs');
const evidence=process.env.UI029_EVIDENCE_DIR||path.join(project,'analysis/batch-20260920');
const baselineReport=path.resolve(process.env.UI029_BASELINE_REPORT||path.join(project,'analysis/batch-20260920/ui029-baseline-report.json'));
await fs.mkdir(evidence,{recursive:true});const directory=await fs.mkdtemp(path.join(evidence,baseline?'ui029-baseline-':appPath?'ui029-packaged-':'ui029-local-'));
const profile=await fs.mkdtemp(path.join(directory,'profile-')),workspace=path.join(profile,'workspace');await fs.mkdir(workspace);
const sha=value=>createHash('sha256').update(value).digest('hex');
const fixtureDefinitionSha256=sha(JSON.stringify(makeFixture({cwd:'/isolated-ui029-fixture',now:1})));
const seeded=makeFixture({cwd:workspace});
await fs.writeFile(path.join(workspace,'fixture-image.txt'),'Isolated attachment descriptor only.\n');
await fs.writeFile(path.join(profile,'ui029-fixture.marker'),'isolated-ui029-test\n');
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify(seeded));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:Object.values(IDS),sidebarWidth:288,displayName:'Fixture'}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:fixture};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const USER_ROW_DELTA=32;// 2.2553.1 ordinary user turn: gap-sm 8px + h-control 24px actions row
const TAIL='.source-transcript-status',STATE='data-transcript-status',SPARK='.sts-spark',USER_CODE=process.env.UI029_USER_CODE_SELECTOR||'.suc-code';
const checks=[],metrics={layouts:{},phases:[]},screenshots=[],pageErrors=[],cleanupErrors=[];
const startedAt=new Date().toISOString();let app,page,build,runtime,asarHash,asarHashBefore,testSourceHashes,testSourceHashesAfter,failure,clipboardSaved=false,clipboardRestored=false,profileRemoved=false,processExited=false,watchdog,watchdogTriggered=false;
const near=(actual,expected,label,tolerance=1)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: expected ${expected}, got ${actual}`);
const phase=name=>{metrics.phases.push({name,at:new Date().toISOString()});console.log('UI029 '+name);};
async function within(promise,label,ms=10000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out')),ms);})]);}finally{clearTimeout(timer);}}
async function frames(count=4){await within(page.evaluate(count=>new Promise(resolve=>{const step=()=>--count?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}),count),'Layout frames',2500);}
async function poll(read,predicate,label,ms=6000){const end=Date.now()+ms;let last;while(Date.now()<end){last=await read();if(predicate(last))return last;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error(label+': '+JSON.stringify(last));}
async function verifyIdentity(){
 const next=JSON.parse(await fs.readFile(expectedFile,'utf8'));if(build)assert.deepEqual(next,build,'Expected build changed');else build=next;
 assert.equal(build.version,baseline?'0.2.8':JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version);assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);
 assert.equal(JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'),'utf8')).version,build.version);
 for(const entry of build.sources)assert.equal(sha(await fs.readFile(path.join(sourceRoot,entry.path))),entry.sha256,'Stale source: '+entry.path);
 for(const required of ['src/source-transcript.jsx','src/source-transcript.css','src/source-session.jsx','src/turn-copy-model.mjs','src/use-transcript-scroll.js'])assert.ok(build.sources.some(entry=>entry.path===required),'Build omits '+required);
 if(!baseline)for(const required of ['src/source-transcript-status.jsx','src/stop-request-model.mjs'])assert.ok(build.sources.some(entry=>entry.path===required),'Build omits '+required);
 const nextHashes={script:sha(await fs.readFile(import.meta.filename)),fixtures:sha(await fs.readFile(path.join(import.meta.dirname,'ui029-fixtures.mjs'))),gate:sha(await fs.readFile(path.join(import.meta.dirname,'scrollbar-mode-gate.mjs'))),server:sha(await fs.readFile(fixture))};
 if(testSourceHashes){testSourceHashesAfter=nextHashes;assert.deepEqual(nextHashes,testSourceHashes,'Test/fixture changed');}else testSourceHashes=nextHashes;
 if(appPath){const value=sha(await fs.readFile(path.join(appPath,'Contents/Resources/app.asar')));if(asarHashBefore)assert.equal(value,asarHashBefore,'Installed ASAR changed');else asarHashBefore=value;asarHash=value;}
}
async function open(id,{wait=true}={}){
 await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
 if(wait){await page.locator('.loading-state').waitFor({state:'hidden'});if(seeded.threads[id].turns.length){const item=seeded.threads[id].turns[0].items[0].id;await page.locator(`[data-transcript-item-id="${item}"]`).waitFor({state:'attached'});}await frames();}
}
const snapshot=()=>page.locator('.transcript').evaluate(v=>{
 const r=v.getBoundingClientRect(),s=v.querySelector('.source-transcript-content'),items=[...s.querySelectorAll('[data-transcript-item-id]')];
 const first=items.find(x=>{const r2=x.getBoundingClientRect();return r2.bottom>r.top+1&&r2.top<r.bottom;});
 return {top:v.scrollTop,remaining:v.scrollHeight-v.clientHeight-v.scrollTop,extent:v.scrollHeight,height:v.clientHeight,following:v.closest('.source-transcript-frame').dataset.following,anchor:first?.dataset.transcriptItemId??null,offset:first?first.getBoundingClientRect().top-r.top:null,tailCount:v.querySelectorAll('.source-transcript-status').length,tailState:v.querySelector('.source-transcript-status')?.dataset.transcriptStatus??null};
});
async function stable(){await within(page.evaluate(()=>new Promise((resolve,reject)=>{let prior,count=0;const end=performance.now()+2000;function step(){const v=document.querySelector('.transcript'),top=v?.scrollTop;count=prior!==undefined&&Math.abs(top-prior)<0.1?count+1:0;prior=top;if(count>=4)resolve();else if(performance.now()>end)reject(new Error('Scroll did not settle'));else requestAnimationFrame(step);}requestAnimationFrame(step);})), 'Scroll settle',2500);}
async function tail(){return poll(snapshot,s=>s.following==='true'&&s.remaining<=1,'Expected actual tail');}
async function idle(){await page.locator(`${TAIL}[${STATE}="idle"]`).waitFor({state:'attached'});await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({state:'hidden'});await frames();}
async function jump(){const b=page.getByTestId('jump-to-latest');if(await b.getAttribute('data-visible')==='true')await b.click();return tail();}
async function wheelUp(){const r=await page.locator('.transcript').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,-530);await poll(snapshot,s=>s.following==='false'&&s.remaining>200,'Wheel releases following');await stable();return snapshot();}
async function sameAnchor(before,label){await frames();const after=await snapshot();assert.equal(after.following,'false',label+': following');assert.equal(after.anchor,before.anchor,label+': item');near(after.offset,before.offset,label+': offset',2);return after;}
async function send(text){await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).fill(text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();}
async function store(){return JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8'));}
async function turnState(id){const t=(await store()).threads[id].turns.at(-1);return {id:t.id,status:t.status,text:t.items.filter(item=>item.type==='agentMessage').map(item=>item.text).join('\n')};}
async function shot(name){const file=path.join(directory,name+'.png');await within(page.screenshot({path:file,timeout:4000}),'Screenshot',4500);screenshots.push(file);}
async function assertIdle(){
 const t=page.locator(TAIL);assert.equal(await t.count(),1);assert.equal(await t.getAttribute(STATE),'idle');assert.equal(await t.getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('.source-working').count(),0);assert.equal(await t.locator(SPARK).count(),1);assert.equal(await t.locator(SPARK).getAttribute('aria-hidden'),'true');
 assert.doesNotMatch(await t.ariaSnapshot(),/Working|Stopping|Waiting|progressbar/);
 assert.equal(await t.locator(SPARK).evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
 assert.equal(await t.locator('[data-transcript-item-id]').count(),0);assert.equal(await t.getAttribute('data-transcript-item-id'),null);
}
async function layout(){return page.locator('.transcript').evaluate(v=>{
 const vr=v.getBoundingClientRect(),s=v.querySelector('.source-transcript-content'),sr=s.getBoundingClientRect(),style=getComputedStyle(s),vs=getComputedStyle(v),num=x=>parseFloat(x)||0;
 const r=x=>{if(!x)return null;const b=x.getBoundingClientRect();return {top:b.top-vr.top+v.scrollTop,bottom:b.bottom-vr.top+v.scrollTop,height:b.height,width:b.width,x:b.left};};
 // Scrollbar-mode evidence (scroll-messages-current.js:63963 both-edges feed;
 // titlebar-shared-12.js:974-977 clientWidth-based column): reserved gutters,
 // scrollport and sizer edges so the column algebra is checked per mode.
 const viewport={left:vr.left,right:vr.right,width:vr.width,clientWidth:v.clientWidth,offsetWidth:v.offsetWidth,scrollWidth:v.scrollWidth,reservedInlineGutters:v.offsetWidth-v.clientWidth-num(vs.borderLeftWidth)-num(vs.borderRightWidth),scrollbarGutter:vs.scrollbarGutter,scrollbarWidth:vs.scrollbarWidth};
 const sizer={left:sr.left,right:sr.right,width:sr.width,paddingLeft:num(style.paddingLeft),paddingRight:num(style.paddingRight),innerWidth:sr.width-num(style.paddingLeft)-num(style.paddingRight)-num(style.borderLeftWidth)-num(style.borderRightWidth)};
 const rows=[...s.querySelectorAll(':scope > [data-transcript-item-id],:scope > .stf-footer')].map(x=>({id:x.dataset.transcriptItemId??'footer:'+x.dataset.turnCopyId,user:x.classList.contains('source-user-message'),...r(x)}));
 const status=s.querySelector('.source-transcript-status'),body=s.querySelector('[data-transcript-item-id="geometry-answer"] .scb-body'),footer=s.querySelector('[data-turn-copy-id="geometry-turn"]');
 const t=r(status),b=r(body),f=r(footer),spark=r(status?.querySelector('.sts-spark')),row=status?.querySelector('.sts-row');
 const css=x=>{if(!x)return null;const c=getComputedStyle(x);return {height:c.height,minHeight:c.minHeight,maxHeight:c.maxHeight,marginTop:c.marginTop,marginBottom:c.marginBottom,gap:c.gap,flexShrink:c.flexShrink,spacing:c.getPropertyValue('--spacing'),remScale:c.getPropertyValue('--cds-rem-scale'),chatBody:c.getPropertyValue('--chat-body'),chatTurnGap:c.getPropertyValue('--chat-turn-gap'),fontSize:c.fontSize};};
 return {width:innerWidth,height:innerHeight,viewport,sizer,rows,contentHeight:sr.height,scrollHeight:v.scrollHeight,viewportHeight:v.clientHeight,paddingTop:parseFloat(style.paddingTop),paddingBottom:parseFloat(style.paddingBottom),status:t,statusRow:r(row),statusCSS:css(status),rowCSS:css(row),sparkCSS:css(status?.querySelector('.sts-spark')),rootFontSize:getComputedStyle(document.documentElement).fontSize,spark,body:b,footer:f,bodyToFooter:b&&f?f.top-b.bottom:null,footerToTail:f&&t?t.top-f.bottom:null,bodyToSpark:b&&spark?spark.top-b.bottom:null};
});}
function assertGeometry(m){near(m.bodyToFooter,8,'Body→footer');near(m.footer.height,24,'Footer occupancy');near(m.footerToTail,15,'Ordinary turn gap');near(m.status.height,20,'Classic status outer');near(m.statusRow.height,20,'Classic status row');near(m.spark.height,18,'Default Spark');near((m.spark.top+m.spark.bottom)/2,(m.status.top+m.status.bottom)/2,'Spark centered');}
async function saveClipboard(){
 metrics.clipboardApi=await app.evaluate(async({clipboard,ClipboardItem})=>{
  if(typeof clipboard.read==='function'&&typeof ClipboardItem==='function'){const items=await clipboard.read();globalThis.ui029Clipboard={kind:'items',items:await Promise.all(items.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))))};return 'ClipboardItem[]';}
  const data={text:await clipboard.readText()};if(typeof clipboard.readHTML==='function')data.html=clipboard.readHTML();if(typeof clipboard.readRTF==='function')data.rtf=clipboard.readRTF();if(typeof clipboard.readImage==='function'){const image=clipboard.readImage();if(!image.isEmpty())data.image=image;}if(typeof clipboard.readBookmark==='function'){const b=clipboard.readBookmark();if(b.title)data.bookmark=b.title;}
  globalThis.ui029Clipboard={kind:typeof clipboard.readHTML==='function'?'legacy':'text',data,empty:typeof clipboard.availableFormats==='function'&&clipboard.availableFormats().length===0};return 'legacy/text';
 });clipboardSaved=true;
}
const clipboard=()=>app.evaluate(({clipboard})=>clipboard.readText());
async function copyBlock(id,expected){const code=page.locator(`[data-transcript-item-id="${id}"] .scb-block`).first();await code.getByRole('button',{name:'Copy code',exact:true}).click();await poll(clipboard,value=>value===expected,'Canonical assistant code clipboard');}
async function theme(value){/* no appearance items in the account menu (Claude parity): the theme preference */await page.evaluate(theme=>window.desktop.call('settings',{theme}),value);await page.waitForFunction(value=>document.documentElement.dataset.mode===value,value);await frames();}
async function userBodies(id){return page.locator(`[data-transcript-item-id="${id}"]`).locator(USER_CODE).allTextContents();}
async function assertUser(id,bodies,plainIndices=[]){
 const row=page.locator(`[data-transcript-item-id="${id}"]`);assert.deepEqual(await userBodies(id),bodies);
 assert.equal(await row.locator('.scb-actions,.scb-copy,.stf-footer,[role="toolbar"],.sdiff-file-header,.sdiff-line-number').count(),0);
 assert.equal(await row.getByRole('button',{name:/Copy code|Run|Cancel|Open in terminal/}).count(),0);
 assert.equal(await row.locator('script,img[src="x"]').count(),0);assert.equal(await page.evaluate(()=>globalThis.UI029_XSS),undefined);
 for(const i of plainIndices)assert.equal(await row.locator(USER_CODE).nth(i).locator('[data-code-token]').count(),0);
}
async function size(width,height=852){await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows()[0].setContentSize(s.width,s.height),{width,height});await page.waitForFunction(s=>innerWidth===s.width&&innerHeight===s.height,{width,height});await frames();}
async function openFiles(){await page.getByRole('button',{name:'View options',exact:true}).click();await page.getByRole('menuitemcheckbox',{name:'Files',exact:true}).click();await page.getByRole('complementary',{name:'Files panel'}).waitFor();await frames();}
async function closeFiles(){await page.locator('.source-side-tile').getByRole('button',{name:'Close panel',exact:true}).click();await page.locator('.source-side-tile').waitFor({state:'detached'});await frames();}
async function paneWidth(width){
 // 0.2.14 tile engine: separators are labelled "Resize {i} and {i+1}" (2.2553.1 Mh aria-label).
 const divider=page.getByRole('separator',{name:/^Resize Chat and /});await divider.focus();await page.keyboard.press('Home');await frames();
 const actual=await page.locator('.source-chat-tile').evaluate(n=>n.getBoundingClientRect().width);
 if(Math.abs(actual-width)>0.5){const r=await divider.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+width-actual,y,{steps:5});await page.mouse.up();await frames();}
 near(await page.locator('.source-chat-tile').evaluate(n=>n.getBoundingClientRect().width),width,'Actual pane-resized chat width',1.5);
}
function readAppleShowScrollBars(){try{return execFileSync('defaults',['read','-g','AppleShowScrollBars'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}catch(error){return /Could not find key|does not exist/i.test(String(error.stderr||error.message))?'unset/Automatic':'unreadable: '+(error.message||error);}}
async function scrollbarMode(){
 // Official runtime probe order (c360a9e1c-GPs-MV9u.js:8593-8606): the feed's
 // own reserved width, then a hidden both-edges probe. Read-only OS preference.
 const probe=await page.evaluate(probeScrollbarMode);
 metrics.scrollbarMode={mode:classifyMode(probe.feedReserved),...probe,electron:runtime.electron,chrome:runtime.chrome,appleShowScrollBars:readAppleShowScrollBars()};
 assert.deepEqual(probeIssues(probe),[],'Scrollbar probe consistency');assert.equal(probe.probesRemaining,0,'Probe nodes removed');
 return metrics.scrollbarMode;
}
function assertColumn(name,m){
 // Mode-independent column rules: inner width from clientWidth, both-edges
 // symmetry, thin feed scrollbar, no horizontal overflow.
 const expected=expectedColumnInner({windowWidth:m.width,clientWidth:m.viewport.clientWidth});
 near(m.sizer.innerWidth,expected,name+' column inner width from clientWidth',.25);near(m.rows[0].width,expected,name+' row width equals the column',.5);
 near(m.sizer.left-m.viewport.left,m.viewport.reservedInlineGutters/2,name+' both-edges start symmetry',.5);near(m.viewport.right-m.sizer.right,m.viewport.reservedInlineGutters/2,name+' both-edges end symmetry',.5);
 assert.ok(m.viewport.scrollWidth<=m.viewport.clientWidth+1,name+' no horizontal overflow');assert.equal(m.viewport.scrollbarGutter,'stable both-edges',name+' feed scrollbar-gutter');assert.equal(m.viewport.scrollbarWidth,'thin',name+' feed scrollbar-width');
}
async function geometryMatrix(){
 await open(IDS.longA);await size(1468);await stable();const observed=await scrollbarMode();metrics.layouts['wide-1468']=await layout();
 await size(1324,768);metrics.layouts['default-1324']=await layout();
 await size(780,768);metrics.layouts['window-780']=await layout();
 await size(781,768);metrics.layouts['window-781']=await layout();
 await size(1468);await openFiles();for(const width of [280,419,560]){await paneWidth(width);metrics.layouts['pane-'+width]=await layout();}await closeFiles();
 if(!baseline){
  for(const [name,m] of Object.entries(metrics.layouts)){near(m.rows[0].top,48,name+' regular first item');near(m.paddingTop,48,name+' top reserve');near(m.paddingBottom,48,name+' bottom reserve');assert.equal(m.status.height,20);assertColumn(name,m);near(m.viewport.reservedInlineGutters,observed.feedReserved,name+' same reserved gutters as the probe',.5);}
  const bytes=await fs.readFile(baselineReport),previous=JSON.parse(bytes);assert.equal(previous.passed,true);assert.equal(previous.mode,'baseline');assert.equal(previous.build.version,'0.2.8');assert.equal(previous.fixtureDefinitionSha256,fixtureDefinitionSha256);
  // Mode gate (scrollbar-mode-gate.mjs): the frozen 0.2.8 report has no mode
  // field, so its mode is derived from window-780 and recorded. Same mode ->
  // the full comparison unchanged (0.2.14: every ordinary user article gains
  // the source 8px gap plus the persistent 24px actions row, USER_ROW_DELTA;
  // rows below shift per preceding user row; assistant/footer boxes stay).
  // Cross mode -> wide layouts still fit the 768 measure and keep the full
  // comparison; narrow layouts assert width == baseline - reserved gutters and
  // wrap-independent gaps, recording wrap-dependent heights instead.
  const baselineMode=deriveUi029BaselineMode(previous),observedMode=observed.mode,layouts=[];
  for(const [name,after] of Object.entries(metrics.layouts)){
   const before=previous.metrics.layouts[name];assert.ok(before,'Missing baseline '+name);
   const baselineClientWidth=before.viewport?.clientWidth??after.viewport.clientWidth+after.viewport.reservedInlineGutters-baselineMode.reserved;
   const kind=comparisonKind({baselineMode:baselineMode.mode,observedMode,windowWidth:after.width,baselineClientWidth,observedClientWidth:after.viewport.clientWidth});
   const gutterDelta=after.viewport.reservedInlineGutters-baselineMode.reserved;
   // 0.2.14 tile engine: chat is an anchored shell with min-width 320 (2.2553.1 Sh overflowMin);
   // the frozen "pane-280" content column (chat wrap 280) sits in that 320 shell, whose part the neighbour covers is
   // inset (tile-layout-model.mjs coveredWidth): the column shows the wrap plus the 12px tile gap, width algebra +12.
   const columnDelta=name==='pane-280'?12:0;
   const {failures,record}=compareUi029Layout(name,before,after,{kind,gutterDelta,columnDelta,userRowDelta:USER_ROW_DELTA});
   assert.deepEqual(failures,[],name+' '+kind+' ('+baselineMode.mode+' baseline vs '+observedMode+' observed)');
   layouts.push({...record,baselineMode:baselineMode.mode,observedMode,baselineClientWidth,observedClientWidth:after.viewport.clientWidth});
  }
  metrics.baselineComparison={path:baselineReport,sha256:sha(bytes),sourceSha256:previous.build.sourceSha256,baselineVersion:previous.build.version,baselineMode,observedMode,layouts,comparisons:layouts};
  const kinds=[...new Set(layouts.map(l=>l.comparison))];
  checks.push(`Seven real window/pane layouts follow the clientWidth column and both-edges symmetry in observed ${observedMode} mode; frozen 0.2.8 ${baselineMode.mode} baseline (${baselineMode.derivation}) compared as ${layouts.map(l=>l.name+'='+l.comparison).join(', ')}`+(kinds.length===1&&kinds[0]==='same-mode-full'?'; assistant dimensions preserved with source top +24 / final tail +73 / +32 per user actions row':'; wide layouts keep the full comparison, narrow layouts assert width algebra and gap invariants with heights recorded'));
 }
 if(baseline)checks.push('Seven real window/pane baseline layouts recorded from frozen 0.2.8 with scrollbar mode '+observed.mode);
}
async function idleAndSpacing(){
 phase('idle and source spacing');await size(1468);await open(IDS.empty);
 // HANDOFF 0.2.119: written (0.2.8) when an empty session drew the idle Spark tail. Since 0.2.100 an
 // empty session renders Cl "No messages yet" (approval-entry-current.js:4224-4233) in place of the
 // transcript status (main.jsx emptyPane), so assert that state and the absent tail instead.
 await page.getByText('No messages yet',{exact:true}).waitFor();assert.equal(await page.locator(TAIL).count(),0);assert.equal(await page.locator(SPARK).count(),0);const empty=await snapshot();assert.ok(empty.extent<=empty.height+1);assert.equal(await page.getByTestId('jump-to-latest').getAttribute('data-visible'),'false');
 await open(IDS.short);await idle();await assertIdle();const short=await snapshot();assert.ok(short.extent<=short.height+1);assert.equal(await page.getByTestId('jump-to-latest').getAttribute('data-visible'),'false');
 await open(IDS.multi);await idle();await assertIdle();assert.equal(await page.locator('.stf-footer').count(),2);
 await open(IDS.geometry);await idle();await assertIdle();const before=await layout();assertGeometry(before);
 await page.locator('[data-transcript-item-id="geometry-answer"]').hover();await page.getByRole('toolbar',{name:'Message actions'}).waitFor();await frames();const after=await layout();assertGeometry(after);near(after.status.top,before.status.top,'Actions reveal does not move Spark',.5);
 metrics.idle={empty,short,before,after};await shot('idle-tail-light');
 await page.getByRole('button',{name:'New',exact:true}).click();await page.locator('.welcome').waitFor();assert.equal(await page.locator(TAIL).count(),0);
 checks.push('Empty session shows Cl "No messages yet" with no tail or Spark (HANDOFF 0.2.119); one static aria-hidden tail for short/multiple completed turns; real 8/24/15/20/18 geometry; no empty/short overflow or home Working decoration');
}
async function userFencesAndCopy(){
 // F06: rust is one of the 235 bundled grammars now, so the ```rust fence (fixture pinned by the 0.2.8 baseline
 // hash) highlights; its HTML-like body must still render as text. The unsupported-language fallback is covered by
 // the highlight / stream-highlight suites with a 'notalang' fence. The overlong js fence stays plain (line limit).
 phase('ordinary user fences and canonical Copy');await open(IDS.userA);await idle();
 const displayJs=USER_JS.endsWith('\n')?USER_JS.slice(0,-1):USER_JS;
 await page.locator('[data-transcript-item-id="shared-user"] '+USER_CODE).first().waitFor();await assertUser('shared-user',[displayJs,USER_UNKNOWN]);
 const row=page.locator('[data-transcript-item-id="shared-user"]');/* F10: the only h2 is the sr-only 'You said: …' heading (scroll-messages-current.js:39513-39521), outside the rendered text */assert.equal(await row.locator('strong,h1,h2:not([data-find-omitted].sr-only)').count(),0);assert.match(await row.locator('h2[data-find-omitted].sr-only').textContent(),/^You said: /);assert.match(await row.locator('.suc-text').first().textContent(),/\*\*literal text\*\*/);assert.equal(await row.locator('.source-user-attachments').count(),1);
 const canonical=(await store()).threads[IDS.userA].turns[0].items[0];assert.equal(canonical.content[0].text,USER_TEXT);assert.deepEqual(canonical.content[1],seeded.threads[IDS.userA].turns[0].items[0].content[1]);
 await row.locator(USER_CODE).first().locator('[data-code-token]').first().waitFor({state:'attached'});const light=await row.locator(USER_CODE).first().locator('[data-code-token]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,color:getComputedStyle(n).color})));
 await copyBlock('shared-answer',ASSISTANT_JS);await page.locator('[data-transcript-item-id="shared-answer"]').hover();const footer=page.locator('[data-turn-copy-id="shared-turn"]');await footer.getByRole('button',{name:'Copy',exact:true}).click();await poll(clipboard,value=>value===TURN_COPY,'Whole assistant turn Copy excludes user and Spark');
 await theme('dark');await assertUser('shared-user',[displayJs,USER_UNKNOWN]);const dark=await row.locator(USER_CODE).first().locator('[data-code-token]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,color:getComputedStyle(n).color})));
 assert.equal(light.map(t=>t.text).join(''),displayJs);assert.equal(dark.map(t=>t.text).join(''),displayJs);assert.ok(light.some((t,i)=>t.color!==dark[i]?.color),'User syntax tokens must use real theme colors');await shot('user-fences-dark');await theme('light');
 // Real rapid navigation; no delayed worker/mock is injected. Outstanding-
 // worker stale-response timing remains covered by existing lifecycle tests.
 for(let i=0;i<3;i++){await open(IDS.userA,{wait:false});await open(IDS.userB);await assertUser('shared-user',[USER_B_JS]);assert.doesNotMatch(await page.locator('[data-transcript-item-id="shared-user"]').textContent(),/KEEP_USER/);}
 await open(IDS.bounded);await assertUser('bounded-user',[OVERLONG,USER_UNKNOWN],[0]);
 for(const [id,text] of [['unclosed-user',UNCLOSED],['tilde-user',TILDE]]){assert.equal(await page.locator(`[data-transcript-item-id="${id}"]`).locator(USER_CODE).count(),0);assert.equal(await page.locator(`[data-transcript-item-id="${id}"] .source-user-bubble`).textContent(),text);}
 await size(780,768);const bound=await page.locator('[data-transcript-item-id="bounded-user"] .source-user-bubble').evaluate(n=>({scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}));assert.ok(bound.scrollWidth<=bound.clientWidth+1,'Overbudget plain code still wraps in narrow user bubble');await size(1468);
 metrics.userFences={light,dark,canonicalSourceSha256:sha(USER_TEXT),displayJsSha256:sha(displayJs),assistantCodeCopySha256:sha(ASSISTANT_JS),turnCopySha256:sha(TURN_COPY),narrow:bound};
 checks.push('Ordinary user fences retain canonical payload/attachments, dedicated no-action rendering, exact existing assistant Copies, bounded full-plain fallback, session ownership and real theme colors');
}
async function streamAndMotion(){
 phase('real stream and reduced motion');await open(IDS.short);await send(STREAM_PROMPT);await page.locator(`${TAIL}[${STATE}="running"]`).waitFor({state:'attached'});
 assert.equal(await page.locator(TAIL).count(),1);assert.equal(await page.locator('.source-working').count(),1);assert.match(await page.locator(TAIL).ariaSnapshot(),/Working/);
 const active=await poll(()=>turnState(IDS.short),s=>s.status==='inProgress','Real turn active');assert.equal(await page.locator(`[data-turn-copy-id="${active.id}"]`).count(),0);assert.equal(await page.locator('[data-turn-copy-id="short-turn"]').count(),1);
 // 0.2.14 stream-highlight: classic Y5 passes state "thinking" to the Spark while working (scroll-messages-current.js:58466-58479); shared-frame uv runs the 9x90ms strip through WAAPI, which animation:none cannot suppress, so the live reduced-motion store must unmount it.
 await page.locator(`${TAIL} span.sts-spark[data-spark-rendering="sprite"][data-spark-state="thinking"]`).waitFor({state:'attached',timeout:1500});await frames();
 const sprite=await page.locator(`${TAIL} [data-cds-spark-strip]`).evaluate(n=>{const a=n.getAnimations()[0];const t=a?.effect.getComputedTiming();return {count:n.getAnimations().length,playState:a?.playState,duration:t?.duration,easing:t?.easing,iterations:t?.iterations,height:n.parentElement.getBoundingClientRect().height,width:n.parentElement.getBoundingClientRect().width};});
 assert.equal(sprite.count,1);assert.equal(sprite.playState,'running');assert.equal(sprite.duration,810);assert.equal(sprite.easing,'steps(9, jump-none)');assert.equal(sprite.iterations,Infinity);near(sprite.height,18,'Sprite height');near(sprite.width,18,'Sprite width');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator(`${TAIL} svg.sts-spark[data-spark-rendering="static-fallback"]`).waitFor({state:'attached',timeout:1500});await frames();const animation=await page.locator(TAIL).evaluate(n=>({running:n.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,readable:getComputedStyle(n.querySelector('.sts-label')).webkitTextFillColor}));assert.equal(animation.running,0);assert.notEqual(animation.readable,'rgba(0, 0, 0, 0)');
 await idle();await assertIdle();const terminal=await turnState(IDS.short);assert.equal(terminal.status,'completed');const final=await tail();assert.equal(await page.locator(`[data-turn-copy-id="${active.id}"]`).count(),1);await page.emulateMedia({reducedMotion:'no-preference'});
 metrics.streaming={active,terminal:{id:terminal.id,status:terminal.status},final,animation,sprite};
 checks.push('Real streamed turn drives exactly one Working row with the running 9x90ms thinking sprite; live reduced motion falls back to the static Spark with zero running animations and a readable label; terminal event returns idle, real footer eligibility and true bottom');
}
async function stopIdentity(){
 phase('pending stop identity');await open(IDS.longA);await send(STREAM_PROMPT);await page.locator(`${TAIL}[${STATE}="running"]`).waitFor({state:'attached'});
 const active=await poll(()=>turnState(IDS.longA),s=>s.status==='inProgress','Real turn started before interrupt');
 await page.locator(`[data-transcript-item-id="reply-${active.id}"]`).filter({hasText:'SCROLL_CHUNK_01'}).waitFor({state:'attached'});
 const tracePath=path.join(profile,'fixture-interrupts.jsonl');
 const readTrace=async()=>{try{return (await fs.readFile(tracePath,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(error){if(error.code==='ENOENT')return [];throw error;}};
 const traceBefore=await readTrace();
 const rejected=await page.evaluate(async payload=>{try{await window.desktop.call('interrupt',payload);return {rejected:false};}catch(error){return {rejected:true,message:error.message};}},{threadId:IDS.longA,turnId:active.id,expected:{connectionId:'ui029-wrong-owner',connectionEpoch:1}});
 assert.equal(rejected.rejected,true,'Wrong connection identity must reject actual IPC');assert.match(rejected.message,/connection changed|not sent/i);
 assert.deepEqual(await readTrace(),traceBefore,'Wrong connection must never reach fixture interrupt');assert.equal((await turnState(IDS.longA)).status,'inProgress');assert.equal(await page.locator(TAIL).getAttribute(STATE),'running');
 metrics.interruptNegative={threadId:IDS.longA,turnId:active.id,rejected,traceCountBefore:traceBefore.length,traceCountAfter:(await readTrace()).length};
 // The fixture's pending interval is 350ms (ui029-fixtures.mjs, hash-locked to the baseline), shorter than a few
 // Playwright round trips on a loaded host. Record the tail in the page at the first render of the stopping state
 // (its accessible label, aria-hidden and Spark) instead of racing locator reads against the interrupt's completion.
 await page.evaluate(({TAIL,STATE})=>{window.ui029Stopping=null;const take=()=>{const tail=document.querySelector(`${TAIL}[${STATE}="stopping"]`);if(!tail||window.ui029Stopping)return;const label=tail.querySelector('.sts-label');
  window.ui029Stopping={at:Date.now(),tailHidden:tail.getAttribute('aria-hidden'),labelHidden:label?.getAttribute('aria-hidden')??null,role:label?.getAttribute('role')??null,name:label?.getAttribute('aria-label')??null,text:label?.textContent??'',sprites:tail.querySelectorAll('span.sts-spark[data-spark-rendering="sprite"][data-spark-state="thinking"]').length};observer.disconnect();};
  const observer=new MutationObserver(take);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:[STATE,'aria-hidden','aria-label','data-spark-state','data-spark-rendering']});take();},{TAIL,STATE});
 const stop=page.locator('[data-testid="code-prompt-stop"]:not([inert] *)');await stop.click();
 const seen=await poll(()=>page.evaluate(()=>window.ui029Stopping),s=>!!s,'Stopping tail rendered');
 const stoppedAt=seen.at;metrics.stoppingTail=seen;
 assert.equal(seen.tailHidden,null,'Stopping tail is exposed to assistive tech');assert.equal(seen.labelHidden,null);assert.equal(seen.role,'status');assert.match(seen.name,/Stopping/);assert.match(seen.text,/Stopping/);
 assert.equal(seen.sprites,1,'Stopping keeps the same thinking sprite (Y5: working||stopping)');
 // Official showStop = busy && !interrupting: once the stop is pending the Stop control is unmounted and the
 // disabled Send glyph holds the slot, so a second pointer activation is impossible by construction. The
 // remaining live activation path is Escape in the focused editor, which the interrupting guard must ignore.
 await stop.waitFor({state:'detached'});
 const pendingSlot=await page.locator('.sc-submit-layer:not([data-leaving]) .sc-submit-slot button').evaluate(n=>({label:n.getAttribute('aria-label'),disabled:n.disabled,busy:n.getAttribute('aria-busy')}));
 assert.deepEqual(pendingSlot,{label:'Send',disabled:true,busy:null},'Pending interrupt shows the disabled Send glyph instead of Stop');
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).focus();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await open(IDS.longB);await idle();await assertIdle();assert.doesNotMatch(await page.locator('.conversation').innerText(),/Stopping/);
 await poll(()=>turnState(IDS.longA),s=>s.status==='interrupted','Delayed real interruption');
 const trace=(await fs.readFile(path.join(profile,'fixture-interrupts.jsonl'),'utf8')).trim().split('\n').map(JSON.parse).filter(e=>e.threadId===IDS.longA&&e.turnId===active.id);
 assert.equal(trace.filter(e=>e.phase==='requested').length,1,'Duplicate UI activation must not dispatch another effective interrupt');assert.equal(trace.filter(e=>e.phase==='completed').length,1);
 assert.ok(Date.parse(trace.find(e=>e.phase==='completed').at)-Date.parse(trace.find(e=>e.phase==='requested').at)>=250,'Fixture did not provide a meaningful pending interval');
 const after=await turnState(IDS.longA);await new Promise(resolve=>setTimeout(resolve,180));assert.equal((await turnState(IDS.longA)).text,after.text,'Canceled stream emitted late text');
 await open(IDS.longA);await idle();await assertIdle();metrics.stopping={turnId:active.id,trace,observedPendingAt:stoppedAt,finalStatus:after.status};
 checks.push('Wrong-connection actual IPC rejects without protocol dispatch or changing the running turn; actual delayed interrupt displays Stopping for its owning session only, unmounts Stop for the disabled Send glyph, ignores repeated Escape activation, stops stream and clears on the real interrupted event');
}
async function approvalAndReading(){
 phase('approval replacement and reading');await open(IDS.longA);await send(APPROVAL_PROMPT);await page.locator(`${TAIL}[${STATE}="running"]`).waitFor({state:'attached'});const reading=await wheelUp();
 const approval=page.locator('[data-approval-presentation="card"]');await approval.waitFor({state:'attached'});assert.equal(await page.locator(TAIL).count(),0);assert.equal(await page.locator('.source-working').count(),0);await sameAnchor(reading,'Mounted approval replaces tail without stealing anchor');
 assert.equal(await page.getByTestId('jump-to-latest').getAttribute('aria-label'),'Needs your input. Scroll to the request');await jump();await new Promise(resolve=>setTimeout(resolve,450));await approval.getByRole('button',{name:'Deny',exact:true}).click();await approval.waitFor({state:'detached'});await idle();await assertIdle();await tail();
 const responses=(await fs.readFile(path.join(profile,'fixture-responses.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(responses.at(-1).result.decision,'decline');
 const before=await wheelUp();await open(IDS.longB);await idle();await open(IDS.longA);await idle();await stable();await sameAnchor(before,'Delayed A session restore');
 // Background growth/terminal transition while reading uses the real fixture.
 await send(STREAM_PROMPT);await page.locator(`${TAIL}[${STATE}="running"]`).waitFor({state:'attached'});const during=await wheelUp();await idle();await sameAnchor(during,'Stream completion and idle tail preserve reading');
 await size(1324,768);await stable();const resized=await snapshot();assert.equal(resized.following,'false');await size(1468);await stable();assert.equal((await snapshot()).following,'false');
 metrics.reading={approvalAnchor:reading,restored:before,streamAnchor:during,resized};checks.push('Real pending approval replaces the tail, Deny restores idle, and history anchors survive growth/completion and delayed session restore');
}

async function ownedChildExit(child,ms=3000){
 if(!child||child.exitCode!==null||child.signalCode!==null)return true;
 return new Promise(resolve=>{const done=value=>{clearTimeout(timer);child.off('exit',onExit);resolve(value);};const onExit=()=>done(true);const timer=setTimeout(()=>done(false),ms);child.once('exit',onExit);});
}
try{
 phase('identity preflight');await verifyIdentity();
 app=await electron.launch({executablePath,args:appPath?[]:[root],env,timeout:20000});
 watchdog=setTimeout(()=>{watchdogTriggered=true;app?.process()?.kill('SIGTERM');},240000);
 runtime=await within(app.evaluate(({app})=>({version:app.getVersion(),appPath:app.getAppPath(),userData:app.getPath('userData'),electron:process.versions.electron,chrome:process.versions.chrome})),'Runtime identity');
 assert.equal(runtime.version,build.version);assert.equal(runtime.userData,profile);assert.equal(runtime.appPath,appPath?path.join(appPath,'Contents/Resources/app.asar'):root);
 page=await within(app.firstWindow(),'First isolated window',12000);page.setDefaultTimeout(8000);page.on('pageerror',error=>pageErrors.push(error.message));
 // firstWindow() can resolve before the window has navigated to the app page; under parallel suite load the subscribe then
 // ran on the blank initial document ('reading onEvent' of undefined). Wait for the preload bridge (electron/preload.cjs) first.
 await page.waitForFunction(()=>typeof window.desktop?.onEvent==='function');
 await page.evaluate(()=>{window.ui029Events=[];window.ui029Unsubscribe=window.desktop.onEvent(event=>{const p=event.params||{};window.ui029Events.push({kind:event.kind,method:event.method,threadId:p.threadId,turnId:p.turnId||p.turn?.id,status:p.turn?.status,at:Date.now()});});});
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();
 const actual=await page.evaluate(async()=>(await fetch('./build-info.json')).json());assert.deepEqual(actual,build,'Runtime must serve the expected exact build');
 await within(page.evaluate(()=>document.fonts.ready),'Fonts',5000);await size(1468);
 if(!baseline)await within(saveClipboard(),'Clipboard backup',5000);
 phase('seven layout baseline');await geometryMatrix();await shot('layout-wide-after-pane');
 if(!baseline){await idleAndSpacing();await userFencesAndCopy();await streamAndMotion();await stopIdentity();await approvalAndReading();await shot('final-reading');}
 assert.deepEqual(pageErrors,[],'Renderer errors');
 await verifyIdentity();
}catch(error){
 failure=error;
 if(page){await shot('failure').catch(e=>cleanupErrors.push('Failure screenshot: '+e.message));metrics.failureState=await snapshot().catch(e=>({error:e.message}));metrics.failureLayout=await layout().catch(e=>({error:e.message}));}
}finally{
 clearTimeout(watchdog);
 if(watchdogTriggered){failure ||= new Error('Owned GUI exceeded 240 second watchdog');cleanupErrors.push('Watchdog terminated only the owned Electron process');}
 if(page){metrics.protocolEvents=await within(page.evaluate(()=>{window.ui029Unsubscribe?.();return window.ui029Events||[];}),'Read passive fixture event summary',3000).catch(e=>{cleanupErrors.push(e.message);return [];});}
 // All seed/event state belongs to this marked profile; no production data is read.
 try{await fs.copyFile(path.join(profile,'fixture-threads.json'),path.join(directory,'fixture-final.json'));}catch(e){cleanupErrors.push('Fixture evidence: '+e.message);failure ||= e;}
 if(app&&clipboardSaved){try{
  await within(app.evaluate(async({app,clipboard},expectedProfile)=>{
   if(app.getPath('userData')!==expectedProfile)throw new Error('Refusing clipboard cleanup in another profile');
   const saved=globalThis.ui029Clipboard;if(!saved)throw new Error('Missing clipboard backup');
   if(saved.kind==='items'){if(saved.items.length)await clipboard.write(saved.items);else await clipboard.clear();}
   else if(saved.empty)await clipboard.clear();else if(saved.kind==='legacy')await clipboard.write(saved.data);else await clipboard.writeText(saved.data.text);
   delete globalThis.ui029Clipboard;
  },profile),'Restore actual clipboard',5000);clipboardRestored=true;
 }catch(e){cleanupErrors.push('Clipboard restore: '+e.message);failure ||= e;}}
 if(app){const child=app.process();try{await within(app.close(),'Close isolated application',10000);}catch(e){cleanupErrors.push(e.message);failure ||= e;}
  processExited=await ownedChildExit(child,1000);
  if(!processExited){child.kill('SIGTERM');processExited=await ownedChildExit(child,1500);}
  if(!processExited){child.kill('SIGKILL');processExited=await ownedChildExit(child,2500);}
  if(!processExited){cleanupErrors.push('Owned Electron exit unconfirmed; profile retained');failure ||= new Error('Isolated process cleanup failed');}
 }else processExited=true;
 if(build)await verifyIdentity().catch(e=>{cleanupErrors.push('Post-run identity: '+e.message);failure ||= e;});
 if(processExited){try{await fs.rm(profile,{recursive:true,force:true});profileRemoved=true;}catch(e){cleanupErrors.push('Remove isolated profile: '+e.message);failure ||= e;}}
 if(cleanupErrors.length)failure ||= new Error('Cleanup or evidence capture failed');
 const report={schemaVersion:1,suite:'ui029',mode:baseline?'baseline':'validation',passed:!failure,startedAt,at:new Date().toISOString(),fixture:true,productionProfileUsed:false,
  fixtureDefinitionSha256,testSourceHashes,testSourceHashesAfter,build:build?{version:build.version,sourceSha256:build.sourceSha256,builtAt:build.builtAt,verifiedSourceFiles:build.sources.length}:null,
  expectedBuildPath:path.resolve(expectedFile),sourceRoot:path.resolve(sourceRoot),runtime,appPath,asarHashBefore,asarHash,executablePath,directory,profile,workspace,profileRemoved,processExited,
  clipboardSaved,clipboardRestored,clipboardNotUsed:baseline,checks,metrics,screenshots,pageErrors,cleanupErrors,...(failure?{error:failure.stack||String(failure)}:{})};
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 const name=baseline?'ui029-baseline-report.json':appPath?'ui029-packaged-report.json':'ui029-ui-report.json';await fs.writeFile(path.join(evidence,name),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,mode:report.mode,build:report.build,checks,directory,report:path.join(evidence,name),error:report.error},null,2));
}
// run-suite (0.2.119) imports this module: throw as well as exitCode so the importer records the failure.
if(failure){process.exitCode=1;throw failure;}
