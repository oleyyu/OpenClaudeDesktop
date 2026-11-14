// Focused cold-mount duplicate admission regression. Copy this file alone to
// app/scripts; execute serially against a fresh build or actual installed app.
// This test never sends a model turn or changes production data/functions.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const inAppScripts=import.meta.dirname.endsWith(path.join('app','scripts'));
const project=path.resolve(import.meta.dirname,inAppScripts?'../..':'../../..'),root=path.join(project,'app');
const {_electron:electron}=await import(pathToFileURL(path.join(project,'tools/node_modules/playwright/index.mjs')).href);
const sourceRoot=process.env.TEST_SOURCE_ROOT||root,buildFile=process.env.TEST_EXPECT_BUILD||path.join(root,'dist/build-info.json');
const appPath=process.env.TEST_APP_PATH?path.resolve(process.env.TEST_APP_PATH):null;
const executablePath=appPath?path.join(appPath,'Contents/MacOS/OpenClaude Desktop'):process.env.TEST_ELECTRON_BINARY||path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const server=path.join(root,'tests/fixtures/codex-server.cjs'),evidenceRoot=process.env.HIGHLIGHT_COALESCING_EVIDENCE_DIR||path.join(project,'analysis/batch-20260920');
await fs.mkdir(evidenceRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(evidenceRoot,appPath?'highlight-coalescing-packaged-':'highlight-coalescing-local-'));
const profile=await fs.mkdtemp(path.join(directory,'profile-')),workspace=path.join(profile,'workspace');await fs.mkdir(workspace);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),startedAt=new Date().toISOString();
const A='highlight-coalescing-A',B='highlight-coalescing-B',USER='burst-samples-user',ANSWER='burst-samples-answer',LONG='burst-long-answer';
const samples={
 [A]:[
  {language:'js',text:'// Installed JavaScript\nconst message = "hello";'},
  {language:'ts',text:'type User = { name: string };'},
  {language:'json',text:'{"ready":true,"count":42}'},
  {language:'python',text:'def greet(name):\n    return "Hello " + name'},
  {language:'bash',text:'# Shell sample\necho "hello"'},
 ],
 [B]:[
  {language:'js',text:'// Session B JavaScript\nconst message = "B_ONLY";'},
  {language:'ts',text:'type SessionB = { other: number };'},
  {language:'json',text:'{"session":"B_ONLY","count":24}'},
  {language:'python',text:'def greet_b(name):\n    return "B_ONLY " + name'},
  {language:'bash',text:'# Session B shell\necho "B_ONLY"'},
 ],
};
const fence=({language,text})=>'```'+language+'\n'+text+'\n```';
const longText=id=>Array.from({length:90},(_,i)=>`// ${id===A?'':'B_ONLY '}Scroll sample ${String(i+1).padStart(2,'0')}`).join('\n');
const prefix=id=>id===A?'COALESCING_A ordinary user snippets.':'COALESCING_B ordinary user snippets.';
const expected=id=>[...samples[id],...samples[id],{language:'js',text:longText(id)}];
function fixture(cwd,now){return{next:100,threads:Object.fromEntries([A,B].map(id=>[id,{id,name:id,cwd,createdAt:now,updatedAt:now,archived:false,turns:[
 {id:'shared-samples-turn',status:'completed',items:[{id:USER,type:'userMessage',content:[{type:'text',text:prefix(id)+'\n\n'+samples[id].map(fence).join('\n\n')}]},{id:ANSWER,type:'agentMessage',text:samples[id].map(fence).join('\n\n')}]},
 {id:'shared-long-turn',status:'completed',items:[{id:'burst-long-user',type:'userMessage',content:[{type:'text',text:'Show the ninety source comment lines.'}]},{id:LONG,type:'agentMessage',text:fence({language:'js',text:longText(id)})}]},
 ]}]))};}
const fixtureDefinitionSha256=sha(JSON.stringify(fixture('/isolated-highlight-coalescing',1))),seed=fixture(workspace,Math.floor(Date.now()/1000));
await fs.writeFile(path.join(profile,'highlight-coalescing.marker'),'isolated-highlight-coalescing-test\n');
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify(seed));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',threadIds:[A,B],sidebarWidth:288}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:server};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const selector='.transcript .source-user-message .suc-code,.transcript .source-assistant-message .scb-code';
const checks=[],metrics={phases:[],switches:[]},pageErrors=[],failedRequests=[],screenshots=[],workers=[],cleanupErrors=[];
let app,page,build,runtime,asarHashBefore,asarHash,testSourceHashes,testSourceHashesAfter,failure,clipboardSaved=false,clipboardRestored=false,profileRemoved=false,processExited=false,watchdog,emergencyCleanup,watchdogTriggered=false;
function phase(name){metrics.phases.push({name,at:new Date().toISOString()});console.log('COALESCING '+name);}
async function within(promise,label,ms=8000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' exceeded '+ms+'ms')),ms);})]);}finally{clearTimeout(timer);}}
async function poll(read,check,label,ms=8000){const end=Date.now()+ms;let last;do{last=await within(read(),label+' sample',2500);if(check(last))return last;await new Promise(resolve=>setTimeout(resolve,25));}while(Date.now()<end);throw new Error(label+': '+JSON.stringify(last));}
async function frames(){await within(page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),'Two frames',2500);}
async function verify(){
 const next=JSON.parse(await fs.readFile(buildFile,'utf8'));if(build)assert.deepEqual(next,build,'Build replaced');else build=next;
 const [major,minor,patch]=build.version.split('.').map(Number);assert.ok(major>0||minor>2||minor===2&&patch>=10,'Requires integrated0.2.10 or later');
 assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);assert.equal(JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'),'utf8')).version,build.version);
 for(const entry of build.sources)assert.equal(sha(await fs.readFile(path.join(sourceRoot,entry.path))),entry.sha256,'Stale source '+entry.path);
 for(const name of ['src/highlight-service.mjs','src/highlight-model.mjs','src/highlight-binding.mjs','src/use-settled-highlight.mjs','src/source-user-text.jsx','src/source-code-block.jsx'])assert.ok(build.sources.some(entry=>entry.path===name),'Missing source '+name);
 const hashes={script:sha(await fs.readFile(import.meta.filename)),server:sha(await fs.readFile(server))};if(testSourceHashes){testSourceHashesAfter=hashes;assert.deepEqual(hashes,testSourceHashes,'Test/fixture changed');}else testSourceHashes=hashes;
 if(appPath){asarHash=sha(await fs.readFile(path.join(appPath,'Contents/Resources/app.asar')));if(asarHashBefore)assert.equal(asarHash,asarHashBefore,'Installed ASAR changed');else asarHashBefore=asarHash;}
}
function observeWorker(worker){if(workers.some(entry=>entry.worker===worker))return;const entry={worker,url:worker.url(),createdAt:new Date().toISOString(),closed:false};workers.push(entry);worker.on('close',()=>{entry.closed=true;entry.closedAt=new Date().toISOString();});}
async function open(id,{ready=true}={}){
 await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
 if(ready){await page.locator(`[data-transcript-item-id="${USER}"] .suc-text`).filter({hasText:prefix(id)}).waitFor({state:'attached'});await page.locator('.loading-state').waitFor({state:'detached'});}
}
async function readBlocks(){return page.locator(selector).evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,tokenText:[...node.querySelectorAll('[data-code-token]')].map(token=>token.textContent).join(''),tokenCount:node.querySelectorAll('[data-code-token]').length,
 owner:node.closest('.source-user-message')?'user':'assistant',language:node.closest('[data-language]')?.dataset.language,
 tokens:[...node.querySelectorAll('[data-code-token]')].map(token=>({text:token.textContent,color:getComputedStyle(token).color})),
 comments:[...node.querySelectorAll('[data-code-token]')].filter(token=>token.textContent.startsWith('//')).map(token=>({text:token.textContent,color:getComputedStyle(token).color}))})));}
async function allHighlighted(id){
 const values=expected(id),blocks=await poll(readBlocks,rows=>rows.length===11&&rows.every((row,index)=>row.tokenCount>0&&row.text===values[index].text&&row.tokenText===values[index].text),'All11 actual code positions must be highlighted with exact text',12000);
 assert.equal(blocks.filter(block=>block.owner==='user').length,5);assert.equal(blocks.filter(block=>block.owner==='assistant').length,6);
 for(let i=0;i<5;i++)assert.deepEqual(blocks[i].tokens,blocks[i+5].tokens,'Shared canonical code must paint identically for user and assistant');
 assert.equal(blocks.at(-1).comments.length,90);assert.equal(await page.locator(`[data-transcript-item-id="${USER}"] .scb-copy`).count(),0,'No assistant controls added to user snippets');
 return blocks;
}
const summarized=blocks=>blocks.map(block=>({owner:block.owner,language:block.language,textLength:block.text.length,textSha256:sha(block.text),tokenCount:block.tokenCount,tokenTextSha256:sha(block.tokenText),colors:[...new Set(block.tokens.map(token=>token.color))],commentCount:block.comments.length,firstCommentColor:block.comments[0]?.color??null}));
async function appearance(mode){await page.evaluate(mode=>{document.documentElement.dataset.mode=mode;},mode);await page.waitForFunction(mode=>document.documentElement.dataset.mode===mode,mode);await frames();}
async function saveClipboard(){
 await within(app.evaluate(async({app,clipboard,ClipboardItem},expectedProfile)=>{
  if(app.getPath('userData')!==expectedProfile)throw new Error('Wrong profile');
  if(typeof clipboard.read!=='function'||typeof clipboard.write!=='function'||typeof ClipboardItem!=='function')throw new Error('All-format clipboard backup is required');
  const originals=await clipboard.read();globalThis.coalescingClipboard=await Promise.all(originals.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));
 },profile),'All-format clipboard backup',5000);clipboardSaved=true;
}
async function restoreClipboard(){if(!app||!clipboardSaved||clipboardRestored)return;await within(app.evaluate(async({app,clipboard},expectedProfile)=>{if(app.getPath('userData')!==expectedProfile)throw new Error('Wrong cleanup profile');const originals=globalThis.coalescingClipboard;if(!originals)throw new Error('Missing clipboard backup');if(originals.length)await clipboard.write(originals);else await clipboard.clear();delete globalThis.coalescingClipboard;},profile),'Restore original clipboard',5000);clipboardRestored=true;}
async function copy(id,index,text){const block=page.locator(`[data-transcript-item-id="${id}"] .scb-block`).nth(index);await block.getByRole('button',{name:'Copy code',exact:true}).click();await poll(()=>app.evaluate(({clipboard})=>clipboard.readText()),value=>value===text,'Actual canonical clipboard',4000);return{itemId:id,index,textSha256:sha(text),length:text.length};}
async function shot(name){const file=path.join(directory,name+'.png');await within(page.screenshot({path:file,timeout:3500}),'Screenshot',4000);screenshots.push(file);}
async function ownedExit(child,ms){if(!child||child.exitCode!==null||child.signalCode!==null)return true;return new Promise(resolve=>{const done=value=>{clearTimeout(timer);child.off('exit',onExit);resolve(value);};const onExit=()=>done(true),timer=setTimeout(()=>done(false),ms);child.once('exit',onExit);});}
try{
 phase('identity and cold launch');await verify();
 app=await electron.launch({executablePath,args:appPath?[]:[root],env,timeout:20000});
 watchdog=setTimeout(()=>{watchdogTriggered=true;emergencyCleanup=restoreClipboard().catch(error=>cleanupErrors.push(error.message)).finally(()=>app?.process()?.kill('SIGTERM'));},120000);
 runtime=await within(app.evaluate(({app})=>({version:app.getVersion(),appPath:app.getAppPath(),userData:app.getPath('userData'),electron:process.versions.electron,chrome:process.versions.chrome})),'Runtime identity');
 assert.equal(runtime.version,build.version);assert.equal(runtime.userData,profile);assert.equal(runtime.appPath,appPath?path.join(appPath,'Contents/Resources/app.asar'):root);
 page=await within(app.firstWindow(),'Window',12000);page.setDefaultTimeout(8000);page.on('pageerror',error=>pageErrors.push(error.message));page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}));page.on('worker',observeWorker);page.workers().forEach(observeWorker);
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();
 assert.deepEqual(await page.evaluate(async()=>(await fetch('./build-info.json')).json()),build,'Actual served build');await within(page.evaluate(()=>document.fonts.ready),'Fonts',5000);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1468,852));await page.waitForFunction(()=>innerWidth===1468&&innerHeight===852);
 assert.equal(await page.locator(selector).count(),0);assert.equal(workers.filter(entry=>!entry.closed).length,0,'Cold launch has not created a highlighter');
 await saveClipboard();
 phase('cold A eleven positions');await open(A);const light=await allHighlighted(A);metrics.coldA=summarized(light);
 const active=workers.filter(entry=>!entry.closed);assert.equal(active.length,1,'One actual native worker handles the burst');assert.match(active[0].url,/highlight-worker-/);assert.ok(active[0].url.startsWith('file:'),'Actual worker is a local distributed module');
 assert.equal(light.at(-1).comments[0].color,'rgb(153, 153, 153)','Previously rejected90-line block now uses actual comment palette');
 metrics.copy=[await copy(LONG,0,longText(A)),await copy(ANSWER,4,samples[A][4].text)];
 await shot('cold-A-light');checks.push('Cold11 consumers/6 canonical keys all have actual tokens and exact code; final90 comments use gray, and formerly rejected bash/long Copy are exact');
 phase('theme without text changes');await appearance('dark');const dark=await allHighlighted(A);metrics.darkA=summarized(dark);
 for(let i=0;i<11;i++)assert.ok(dark[i].tokens.some((token,index)=>token.color!==light[i].tokens[index]?.color),'Actual theme palette changes block '+i);
 assert.equal(dark.at(-1).comments[0].color,'rgb(129, 136, 152)');await shot('A-dark');await appearance('light');await allHighlighted(A);assert.deepEqual(failedRequests,[],'Cold load and theme requests succeeded');checks.push('Both real themes paint all11 existing code positions while preserving every canonical string');
 phase('same item IDs across sessions');
 for(let i=0;i<3;i++){
  await open(B);await open(A,{ready:false});await open(B);
  const blocks=await allHighlighted(B);metrics.switches.push({iteration:i,session:B,blocks:summarized(blocks)});
  await poll(async()=>workers.filter(entry=>!entry.closed).length,count=>count===1,'Settled session retains one actual worker',3000);
  await open(A);await allHighlighted(A);
 }
 metrics.finalA=summarized(await allHighlighted(A));
 const actual=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8'));assert.deepEqual(actual,seed,'Display/Copy/navigation did not modify canonical protocol data or send turns');
 checks.push('Actual rapid A/B navigation with identical item IDs leaves only each owning session text/tokens; canonical protocol seed stays unchanged');
 metrics.expectedCancellationRequests=failedRequests.filter(entry=>entry.error==='net::ERR_ABORTED'&&entry.url.startsWith('file:'));
 assert.deepEqual(pageErrors,[]);assert.deepEqual(failedRequests.filter(entry=>!metrics.expectedCancellationRequests.includes(entry)),[],'Unexpected request failure');await verify();
}catch(error){failure=error;if(page){await shot('failure').catch(error=>cleanupErrors.push(error.message));metrics.failureBlocks=await within(readBlocks(),'Failure token state',3000).then(summarized).catch(error=>({error:error.message}));}}
finally{
 clearTimeout(watchdog);if(emergencyCleanup)await within(emergencyCleanup,'Emergency cleanup',6000).catch(error=>cleanupErrors.push(error.message));
 if(watchdogTriggered){failure ||= new Error('Owned GUI watchdog fired');cleanupErrors.push('Watchdog fired');}
 await restoreClipboard().catch(error=>{failure ||= error;cleanupErrors.push(error.message);});
 if(app){const child=app.process();try{await within(app.close(),'Close isolated app',10000);}catch(error){failure ||= error;cleanupErrors.push(error.message);}
  processExited=await ownedExit(child,1000);if(!processExited){child.kill('SIGTERM');processExited=await ownedExit(child,1500);}if(!processExited){child.kill('SIGKILL');processExited=await ownedExit(child,2500);}
 }else processExited=true;
 if(!processExited){failure ||= new Error('Owned process exit unconfirmed; profile retained');cleanupErrors.push('Process exit unconfirmed');}
 if(app&&processExited)await poll(async()=>workers.every(entry=>entry.closed),Boolean,'Native worker targets closed with renderer',3000).catch(error=>{failure ||= error;cleanupErrors.push(error.message);});
 if(build)await verify().catch(error=>{failure ||= error;cleanupErrors.push(error.message);});
 if(processExited){try{await fs.rm(profile,{recursive:true,force:true});profileRemoved=true;}catch(error){failure ||= error;cleanupErrors.push(error.message);}}
 if(cleanupErrors.length)failure ||= new Error('Cleanup failed');
 const report={schemaVersion:1,suite:'highlight-coalescing-ui',mode:appPath?'packaged':'local-built',passed:!failure,startedAt,at:new Date().toISOString(),fixture:true,productionProfileUsed:false,modelTurnsSent:false,
  fixtureDefinitionSha256,testSourceHashes,testSourceHashesAfter,build:build?{version:build.version,builtAt:build.builtAt,sourceSha256:build.sourceSha256,verifiedSourceFiles:build.sources.length}:null,
  runtime,appPath,asarHashBefore,asarHash,executablePath,sourceRoot,expectedBuildPath:buildFile,server,directory,profile,workspace,profileRemoved,processExited,clipboardSaved,clipboardRestored,
  workerTargets:workers.map(({worker,...entry})=>entry),checks,metrics,screenshots,pageErrors,failedRequests,cleanupErrors,limitation:'Focused cold duplicate admission and actual session ownership; exact dispatcher counts/caps/cancellation order use pure tests. No worker proxy, fake tokens, retry or full highlighting parity claim.',...(failure?{error:failure.stack||String(failure)}:{})};
 const name=appPath?'highlight-coalescing-packaged-report.json':'highlight-coalescing-ui-report.json';await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidenceRoot,name),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,build:report.build,checks:checks.length,directory,error:report.error},null,2));
}
if(failure)process.exitCode=1;
