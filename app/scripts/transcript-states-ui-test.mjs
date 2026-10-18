import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Transcript pane states end to end (approval-entry-current.js 2.2553.1): _d
// :1141-1190 pending -> Zw (shared-22 :5356-5374) + k_ skeleton (ion-dist
// shared-8-B5xbG2px.js O_/k_), xu :4211-4217 load failure (c4ea84cb3 V) with
// Retry, and :4224-4233 Cl "No messages yet" (cc0a875c8 EmptyState u). Real
// main/preload/IPC with the isolated fixture: resumeDelayMs holds thread/resume
// open, resumeFailOnce answers it once with JSON-RPC -32603.
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'transcript-states-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});
const now=Math.floor(Date.now()/1000),SLOW='states-slow',SLOW_DARK='states-slow-dark',SLOW_RM='states-slow-reduced',FAIL='states-fail',EMPTY='states-empty';
const turn=(id,prompt,answer)=>({id,status:'completed',items:[{id:id+'-user',type:'userMessage',content:[{type:'text',text:prompt,text_elements:[]}]},{id:id+'-answer',type:'agentMessage',text:answer}]});
const thread=(id,name,turns,extra={})=>({id,name,cwd:workspace,historyMode:'paginated',createdAt:now,updatedAt:now,archived:false,turns,...extra});
// Three slow copies: the skeleton only exists before the first hydrate (later
// opens keep cached rows), and light, dark and reduced motion each need one.
const slow=(id,name)=>thread(id,name,[turn(id+'-1','First slow prompt.','SLOW_ANSWER_ONE'),turn(id+'-2','Second slow prompt.','SLOW_ANSWER_TWO')],{resumeDelayMs:1500});
const threads={[SLOW]:slow(SLOW,'Slow session'),[SLOW_DARK]:slow(SLOW_DARK,'Slow dark session'),[SLOW_RM]:slow(SLOW_RM,'Slow reduced session'),
 [FAIL]:thread(FAIL,'Failing session',[turn(FAIL+'-1','Fail prompt.','FAIL_ANSWER')],{resumeFailOnce:true}),[EMPTY]:thread(EMPTY,'Empty session',[])};
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'system',mode:'code',model:'fixture',effort:'low',threadIds:Object.keys(threads),sidebarWidth:288,displayName:'Fixture'}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads}));
const read=async name=>JSON.parse(await fs.readFile(path.join(profile,name),'utf8'));
const history=async()=>String(await fs.readFile(path.join(profile,'fixture-history.jsonl'))).trim().split('\n').map(JSON.parse);
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/main.jsx','src/source-transcript-states.jsx','src/source-transcript-states.css','src/source-settings-button.jsx'])assert.ok(build.sources.some(entry=>entry.path===required),'build identifies '+required);
 const h=sha(await fs.readFile(path.join(root,'scripts/transcript-states-ui-test.mjs'))+await fs.readFile(path.join(root,'tests/fixtures/codex-server.cjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('TRANSCRIPT-STATES '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+label);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const composer=()=>page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
const open=id=>page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
const skeleton=()=>page.locator('[data-transcript-skeleton]');
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324);
 await page.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'});await composer().waitFor();await page.evaluate(()=>document.fonts.ready);}
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
// Geometry of the pending skeleton, measured against its own containers.
const measure=()=>page.evaluate(()=>{const sk=document.querySelector('[data-transcript-skeleton]'),status=sk.closest('[role=status]'),scroller=document.querySelector('.transcript');
 const r=n=>n.getBoundingClientRect(),bars=[...sk.querySelectorAll('[data-cds=Skeleton]')],bubble=bars[0],bubbleRow=bubble.parentElement;
 const paragraphs=[...sk.querySelectorAll('.ps-\\[var\\(--msg-text-inset\\,0\\.5rem\\)\\] > .flex.flex-col')].map(p=>[...p.querySelectorAll('[data-cds=Skeleton]')].map(b=>Math.round(r(b).width/r(p).width*1000)/10));
 const column=sk.querySelector('.ps-\\[var\\(--msg-text-inset\\,0\\.5rem\\)\\]'),cs=getComputedStyle(column);
 return {statusRole:status?.getAttribute('role'),statusLoading:status?.classList.contains('loading-state'),srText:status?.querySelector(':scope > .sr-only')?.textContent,ariaHidden:sk.getAttribute('aria-hidden'),paddingTop:getComputedStyle(sk).paddingTop,
  bars:bars.length,bubble:{width:r(bubble).width,right:r(bubble).right,rowRight:r(bubbleRow).right,rowWidth:r(bubbleRow).width,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize),
   height:r(bubble).height,boxSizing:getComputedStyle(bubble).boxSizing,lineHeight:parseFloat(getComputedStyle(bubble).lineHeight),padMd:(()=>{const probe=document.createElement('div');probe.style.cssText='position:absolute;height:var(--cds-pad-md)';bubble.append(probe);const v=parseFloat(getComputedStyle(probe).height);probe.remove();return v;})()},paragraphs,paragraphInsets:[cs.paddingLeft,cs.paddingRight],
  skeletonBottom:r(sk).bottom,scrollerBottom:r(scroller).bottom,scroll:{height:scroller.scrollHeight,client:scroller.clientHeight},
  strips:['.scroll-fade-strip-top','.scroll-fade-strip-bottom'].map(s=>{const n=document.querySelector(s);return n?+getComputedStyle(n).opacity:null;}),
  loadingText:document.body.innerText.includes('Loading conversation'),hold:sk.querySelector('[data-cds=SkeletonGroup]')?.dataset.hold};});
async function checkSkeleton(id,label){await open(id);await skeleton().waitFor({timeout:1400});const m=await measure();report.metrics[label]=m;
 assert.deepEqual([m.statusRole,m.statusLoading,m.srText,m.ariaHidden,m.paddingTop,m.bars,m.hold],['status',true,'Loading session','true','48px',11,'none']);
 const expected=Math.min(18*m.bubble.rootFont,0.85*m.bubble.rowWidth);assert.ok(Math.abs(m.bubble.width-expected)<=0.5,`bubble width ${m.bubble.width} vs min(288, 85%) ${expected}`);
 assert.ok(Math.abs(m.bubble.right-m.bubble.rowRight)<=0.5,'bubble bar is right-aligned in its justify-end row');
 // shared-8 k_ "box-content h-[1lh] … py-md text-heading": content-box, 1lh + 2 x pad-md.
 assert.equal(m.bubble.boxSizing,'content-box','bubble bar keeps the source box-content');assert.ok(m.bubble.padMd>0&&m.bubble.lineHeight>0);
 assert.ok(Math.abs(m.bubble.height-(m.bubble.lineHeight+2*m.bubble.padMd))<=0.5,`bubble height ${m.bubble.height} vs 1lh ${m.bubble.lineHeight} + 2 x pad-md ${m.bubble.padMd}`);
 const want=[[96,100,92,58],[100,94,41],[97,90,66]];assert.equal(m.paragraphs.length,3);m.paragraphs.forEach((p,i)=>{assert.equal(p.length,want[i].length);p.forEach((w,j)=>assert.ok(Math.abs(w-want[i][j])<=0.5,`paragraph ${i} line ${j}: ${w}% vs ${want[i][j]}%`));});
 assert.equal(m.loadingText,false,'the old "Loading conversation…" copy is gone');
 assert.ok(m.scroll.height<=m.scroll.client+1,`skeleton clips inside the scroller (${m.scroll.height} <= ${m.scroll.client}+1)`);assert.ok(m.skeletonBottom<=m.scrollerBottom+1,'skeleton bottom within the scroller');
 m.strips.forEach(o=>o!==null&&assert.ok(Math.abs(o)<=0.001,'no fade strip without overflow'));return m;}
async function hydrated(prefix){await page.getByText('SLOW_ANSWER_TWO',{exact:true}).waitFor();await page.locator('.loading-state').waitFor({state:'detached'});assert.equal(await skeleton().count(),0,prefix+' skeleton detached after hydrate');}
try{
 await integrity();await launch();
 step('home');assert.equal(await page.getByText('No messages yet',{exact:true}).count(),0,'the home draft never shows the empty state');
 step('skeleton-light');await checkSkeleton(SLOW,'skeletonLight');await shot('skeleton-light');await hydrated('light');
 report.checks.push('SLOW (resume held 1.5s): role=status .loading-state with sr-only "Loading session" holds the aria-hidden Zw skeleton, top padding 48, 1 right-aligned content-box bubble bar at min(18rem, 85%) wide and 1lh + 2 x pad-md tall, and 3 paragraphs whose bars are 96/100/92/58, 100/94/41, 97/90/66% (±0.5), hold none; no "Loading conversation" copy, no scroller overflow, fade strips at 0; detached when the rows hydrate');
 step('skeleton-dark');await page.emulateMedia({colorScheme:'dark'});await poll(()=>page.evaluate(()=>document.documentElement.dataset.mode==='dark'),'dark mode');
 await checkSkeleton(SLOW_DARK,'skeletonDark');await shot('skeleton-dark');await hydrated('dark');
 report.metrics.darkBar=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cds-skeleton-base').trim());
 report.checks.push('Dark theme: same skeleton geometry and no overflow (skeleton-dark.png)');
 await page.emulateMedia({colorScheme:'light'});await poll(()=>page.evaluate(()=>document.documentElement.dataset.mode==='light'),'light mode');
 step('reduced-motion');await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await open(SLOW_RM);await skeleton().waitFor({timeout:1400});
 await poll(()=>page.evaluate(()=>[...document.querySelectorAll('[data-transcript-skeleton] [data-cds=Skeleton]')].every(n=>n.getAnimations().every(a=>a.playState!=='running'))),'no running bar animations',1000);
 const rm=await page.evaluate(()=>{const bars=[...document.querySelectorAll('[data-transcript-skeleton] [data-cds=Skeleton]')];return {bars:bars.length,after:bars.map(n=>{const s=getComputedStyle(n,'::after');return s.content==='none'||s.display==='none';}),durations:[...new Set(bars.map(n=>getComputedStyle(n).animationDuration))],running:bars.flatMap(n=>n.getAnimations()).filter(a=>a.playState==='running').length};});
 report.metrics.reducedMotion=rm;assert.equal(rm.bars,11);assert.ok(rm.after.every(Boolean),'no bar ::after shimmer');assert.equal(rm.running,0);
 await hydrated('reduced');await page.emulateMedia({reducedMotion:'no-preference'});
 report.checks.push('prefers-reduced-motion: no bar has a ::after shimmer and no bar animation is running (design-system SkeletonGroup reduce rule)');
 step('load-failure');await open(FAIL);const alert=page.getByRole('alert').filter({hasText:'Couldn’t load this session'});await alert.waitFor();
 const failure=await alert.evaluate(node=>{const ps=node.querySelectorAll('p'),t=ps[0],r=node.getBoundingClientRect(),scroller=document.querySelector('.transcript').getBoundingClientRect(),probe=document.createElement('span');probe.style.cssText='position:absolute;width:36ch';t.append(probe);const ch=getComputedStyle(probe).width;probe.remove();
  const text=node.querySelector('.flex.flex-col.items-center').getBoundingClientRect();return {title:t.textContent,body:ps[1]?.textContent,titleMax:getComputedStyle(t).maxWidth,ch36:ch,button:node.querySelector('button[data-cds=Button]')?.dataset.variant,centerX:(text.left+text.right)/2-(scroller.left+scroller.right)/2,alignSelf:getComputedStyle(node).justifyContent};});
 report.metrics.failure=failure;assert.equal(failure.title,'Couldn’t load this session');assert.equal(failure.body,'Something went wrong while loading earlier messages.');
 assert.ok(Math.abs(parseFloat(failure.titleMax)-parseFloat(failure.ch36))<=1/64,`title max-width ${failure.titleMax} is 36ch (${failure.ch36}; layout width snaps to 1/64px)`);assert.equal(failure.button,'primary');assert.ok(Math.abs(failure.centerX)<=8,`centered (${failure.centerX})`);
 assert.equal(await page.locator('.composer-error').count(),0,'the raw error never reaches the composer banner');assert.equal(await page.locator('.inline-error:not(.composer-error)').count(),0,'R08: no raw transcript alert (thread errors are source cards)');assert.equal(await page.getByText('fixture resume failure',{exact:false}).count(),0);
 assert.equal(await page.getByText('No messages yet',{exact:true}).count(),0);
 assert.equal(await page.locator('[data-testid=code-transcript-status]').count(),0,'xu replaces the scroller: no transcript status row under the failure state');
 const failed=(await history()).filter(r=>r.method==='thread/resume'&&r.params?.threadId===FAIL);assert.deepEqual(failed.map(r=>!!r.failed),[true]);
 await shot('load-failure-light');
 const beforeRetry=await page.evaluate(()=>location.href);await alert.getByRole('button',{name:'Retry',exact:true}).click();
 await page.getByText('FAIL_ANSWER',{exact:true}).waitFor();await alert.waitFor({state:'detached'});assert.equal(await page.locator('.composer-error').count(),0);assert.equal(await page.evaluate(()=>location.href),beforeRetry);
 assert.equal((await history()).filter(r=>r.method==='thread/resume'&&r.params?.threadId===FAIL).length,2);assert.equal((await read('fixture-threads.json')).threads[FAIL].resumeFailOnce,undefined,'fixture flag consumed');
 report.checks.push('FAIL (resume -32603 once): centered role=alert EmptyState "Couldn’t load this session" + source body, title max-width 36ch, primary Retry, no .composer-error, no raw message and no transcript status row; Retry re-resumes in place and the rows replace the alert');
 step('empty');await open(EMPTY);await page.locator('.loading-state').waitFor({state:'detached'});const empty=page.getByText('No messages yet',{exact:true});await empty.waitFor();assert.equal(await empty.count(),1);
 const centre=await empty.evaluate(node=>{const t=node.getBoundingClientRect(),s=document.querySelector('.transcript'),v=s.getBoundingClientRect();return {delta:(t.top+t.bottom)/2-(v.top+v.bottom)/2,scroll:s.scrollHeight-s.clientHeight,deltaX:(t.left+t.right)/2-(v.left+v.right)/2};});
 report.metrics.empty=centre;assert.ok(Math.abs(centre.delta)<=2,`vertically centred (${centre.delta})`);assert.ok(centre.scroll<=1,'no overflow');
 assert.equal(await page.locator('[data-testid=code-transcript-status]').count(),0,'Cl replaces the scroller: no transcript status row under the empty state');
 await shot('empty-light');
 await composer().fill('hello');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 await page.locator('.source-transcript-content').getByText('hello',{exact:true}).first().waitFor();await empty.waitFor({state:'detached'});
 report.checks.push('EMPTY (0 turns): exactly one "No messages yet", vertically centred in the transcript viewport (±2px) without overflow or a transcript status row; sending "hello" replaces it with the user row');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'transcript-states-ui-report.json'),bytes);console.log(bytes);}
