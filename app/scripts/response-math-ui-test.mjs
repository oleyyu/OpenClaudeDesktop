import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'response-math-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const A='math-A',B='math-B',CONTROL='highlight-control',now=Math.floor(Date.now()/1000);
const item=(id,text)=>({id,type:'agentMessage',text});
const thread=(id,name,text)=>({id,name,cwd:workspace,createdAt:now,updatedAt:now,archived:false,turns:text?[{id:id+'-seed',status:'completed',items:[item(id+'-seed-item',text)]}]:[]});
await fs.writeFile(path.join(profile,'highlight-fixture.marker'),'isolated-highlight-test\n');
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'highlight-fixture',threadIds:[A,B],sidebarWidth:288}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[A]:thread(A,'Math output','Prices $5 and $10; code `x^2` stays code.'),[B]:thread(B,'Other conversation','OTHER_CONVERSATION'),[CONTROL]:thread(CONTROL,'Isolated math controls')}}));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
const testFiles=['scripts/response-math-ui-test.mjs','tests/fixtures/highlight-server.cjs'];let hashes;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);assert.equal(JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')).sourceSha256,build.sourceSha256);for(const f of build.sources)assert.equal(sha(await fs.readFile(path.join(root,f.path))),f.sha256,f.path);const next=Object.fromEntries(await Promise.all(testFiles.map(async f=>[f,sha(await fs.readFile(path.join(root,f)))])));if(hashes)assert.deepEqual(next,hashes);else hashes=next;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],passed:false};
let app,page,phase='launch';const phaseTo=name=>{phase=name;console.log('RESPONSE-MATH '+name);};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/highlight-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const node=id=>page.locator(`[data-transcript-item-id="${id}"]`);
const rpc=(method,params)=>page.evaluate(({method,params})=>window.desktop.call('rpc',{method,params}),{method,params});
const control=command=>rpc('turn/start',{threadId:CONTROL,input:[{type:'text',text:'HIGHLIGHT_TEST:'+JSON.stringify({threadId:A,...command})}]});
async function open(id){await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();await node(id+'-seed-item').waitFor();await page.locator('.loading-state').waitFor({state:'detached'});await rpc('thread/resume',{threadId:CONTROL});}
async function ready(){await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Highlight fixture'}).waitFor();}
async function poll(fn,label){const end=Date.now()+12000;while(Date.now()<end){if(await fn())return;await page.waitForTimeout(25);}throw Error('Timed out: '+label);}
async function resourceMode(mode){await app.evaluate(({BrowserWindow},mode)=>{
 const session=BrowserWindow.getAllWindows()[0].webContents.session;
 for(const cb of globalThis.mathHeld||[])cb({cancel:true});
 globalThis.mathHeld=[];globalThis.mathRequests=[];globalThis.mathResourceMode=mode;
 session.webRequest.onBeforeRequest((details,callback)=>{
  const engine=/\/katex-[^/]+\.js(?:$|\?)/.test(details.url),css=/\/katex-[^/]+\.css(?:$|\?)/.test(details.url);
  if(engine||css||/KaTeX_/.test(details.url))globalThis.mathRequests.push({url:details.url,engine,css,mode:globalThis.mathResourceMode});
  if(engine&&globalThis.mathResourceMode==='hold-engine'){globalThis.mathHeld.push(callback);return;}
  callback({cancel:engine&&globalThis.mathResourceMode==='block-engine'||css&&globalThis.mathResourceMode==='block-css'});
 });
},mode);}
const requests=()=>app.evaluate(()=>globalThis.mathRequests||[]);
async function release(){await app.evaluate(()=>{globalThis.mathResourceMode='none';for(const callback of globalThis.mathHeld.splice(0))callback({cancel:false});});}
async function reload(mode){await resourceMode(mode);await app.evaluate(async({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.session.clearCache());await page.reload();await ready();await open(A);}
async function put(id,text){const turnId=id+'-turn';await control({op:'start',turnId});await control({op:'item',turnId,item:item(id,text)});await control({op:'complete',turnId});await node(id).waitFor();}
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
try{
 await integrity();app=await electron.launch({executablePath:process.env.TEST_ELECTRON_BINARY||path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env});page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));await page.context().setOffline(true);await page.context().addInitScript(()=>{globalThis.mathPreloadErrors=[];window.addEventListener('vite:preloadError',event=>globalThis.mathPreloadErrors.push(String(event.payload?.message||event.payload)));});await ready();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await resourceMode('none');await open(A);
 phaseTo('eligible-frontier');assert.equal(await page.locator('.srm-inline,.srm-display').count(),0);assert.deepEqual(await requests(),[]);
 await control({op:'start',turnId:'frontier-turn'});await control({op:'item',turnId:'frontier-turn',item:item('frontier','$$\n\\frac{a}{'),completed:false});
 await page.waitForFunction(()=>document.querySelector('[data-transcript-item-id="frontier"] .srm-display[data-incomplete]')?.textContent==='$$\n\\frac{a}{');assert.deepEqual(await requests(),[]);
 report.checks.push('Actual ordinary and open-frontier protocol text loads no math resource and preserves exact unfinished TeX');
 phaseTo('shared-pending');await resourceMode('hold-engine');await control({op:'delta',turnId:'frontier-turn',itemId:'frontier',delta:'b}\n$$'});
 await control({op:'item',turnId:'frontier-turn',item:item('second-formula','Inline \\(E=mc^2\\).')});
 await poll(async()=>(await requests()).some(r=>r.engine),'actual engine held');await node('second-formula').locator('.srm-inline[data-math-fallback]').waitFor();
 // Protocol ACK precedes paced Markdown reveal; assert after its actual closing delimiter reaches the renderer.
 await page.waitForFunction(()=>document.querySelector('[data-transcript-item-id="frontier"] .srm-display:not([data-incomplete])')?.textContent==='$$\\frac{a}{b}$$');assert.equal(await node('frontier').locator('[role=math]').count(),0);assert.equal((await requests()).filter(r=>r.engine).length,1);assert.equal(await node('frontier').locator('.srm-display').textContent(),'$$\\frac{a}{b}$$');
 await release();await node('frontier').locator('[role=math]').waitFor();await node('second-formula').locator('[role=math]').waitFor();await control({op:'complete',turnId:'frontier-turn'});await page.evaluate(()=>document.fonts.ready);
 report.metrics.initialRequests=await requests();assert.equal(report.metrics.initialRequests.filter(r=>r.engine).length,1);assert.ok(report.metrics.initialRequests.some(r=>r.css));assert.ok(report.metrics.initialRequests.some(r=>/KaTeX_.*\.woff2/.test(r.url)));assert.ok(report.metrics.initialRequests.every(r=>r.url.startsWith('file:')));
 assert.equal(await node('frontier').locator('annotation').textContent(),'\\frac{a}{b}');assert.equal(await node('frontier').locator('.mfrac').count(),1);assert.equal(await node('frontier').locator('[role=math]').getAttribute('tabindex'),'0');assert.equal(await node('second-formula').locator('[role=math]').getAttribute('tabindex'),null);
 assert.equal(await page.evaluate(()=>performance.getEntriesByName('chat:latex_plugins_ready').length),1);
 report.checks.push('Two real formulas share one held production import; both existing consumers update on readiness, local CSS/fonts load offline, exact TeX/MathML/fraction and display-only keyboard focus are preserved');
 phaseTo('showcase');const showcase=String.raw`## Mathematical output

Inline energy \(E=mc^2\) and a quadratic root \(x=\frac{-b+\sqrt{b^2-4ac}}{2a}\).

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

`+'```math\n'+String.raw`\begin{bmatrix} a & b \\ c & d \end{bmatrix}\begin{bmatrix} x \\ y \end{bmatrix}=\begin{bmatrix} ax+by \\ cx+dy \end{bmatrix}`+'\n```';
 await put('showcase',showcase);await poll(async()=>await node('showcase').locator('[role=math]').count()===4,'showcase formulas');await page.evaluate(()=>document.fonts.ready);await node('showcase').scrollIntoViewIfNeeded();await shot('math-light');
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).focus();await page.keyboard.press('Meta+,');await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor();await page.getByRole('radio',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Settings',exact:true}).waitFor({state:'detached'});await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).theme==='dark','saved dark theme');await node('showcase').scrollIntoViewIfNeeded();await shot('math-dark');
 assert.equal(await node('showcase').locator('.srm-inline').count(),2);assert.equal(await node('showcase').locator('.srm-display').count(),2);assert.equal(await node('showcase').locator('p>div').count(),0);assert.equal(await page.evaluate(()=>performance.getEntriesByName('chat:latex_plugins_ready').length),1);
 report.checks.push('Actual conversation renders inline root/energy, display integral and fenced matrix in light and saved dark theme without invalid paragraph nesting or duplicate readiness marks');
 phaseTo('safe-formulas');await put('bad-math','```math\n\\frac{\n```');await node('bad-math').locator('.katex-error').waitFor();assert.match(await node('bad-math').locator('.katex-error').textContent(),/\\frac/);
 await put('unsafe-math','```math\n\\includegraphics{https://example.invalid/tracker}\n```');await node('unsafe-math').locator('[role=math]').waitFor();assert.equal(await node('unsafe-math').locator('img,a').count(),0);
 report.checks.push('Malformed TeX remains readable and untrusted includegraphics cannot insert an image or link');
 phaseTo('css-failure');await reload('block-css');await node('frontier').locator('[role=math]').waitFor();await node('second-formula').locator('[role=math]').waitFor();report.metrics.cssFailurePreloadErrors=await page.evaluate(()=>globalThis.mathPreloadErrors);assert.equal(report.metrics.cssFailurePreloadErrors.length,1);assert.match(report.metrics.cssFailurePreloadErrors[0],/CSS/);report.metrics.cssFailureRequests=await requests();assert.ok(report.metrics.cssFailureRequests.some(r=>r.css));assert.equal(await node('frontier').locator('annotation').textContent(),'\\frac{a}{b}');assert.equal(await node('frontier').locator('[data-math-fallback]').count(),0);
 report.checks.push('Real production CSS request rejection still lets the independently loaded engine render existing formulas; no TeX-only dead end');
 phaseTo('js-failure');await reload('block-engine');await poll(async()=>(await requests()).some(r=>r.engine),'real engine rejection');await node('frontier').locator('[data-math-fallback]').waitFor();assert.equal(await node('frontier').locator('[role=math]').count(),0);assert.equal(await node('frontier').locator('.srm-display').textContent(),'$$\\frac{a}{b}$$');
 await page.waitForTimeout(10100);await open(B);await open(A);await page.waitForTimeout(150);assert.equal((await requests()).filter(r=>r.engine).length,1);await release();await open(B);await open(A);assert.equal(await node('frontier').locator('[role=math]').count(),0);report.metrics.jsFailurePreloadErrors=await page.evaluate(()=>globalThis.mathPreloadErrors);assert.equal(report.metrics.jsFailurePreloadErrors.length,1);assert.match(report.metrics.jsFailurePreloadErrors[0],/module|import/i);report.metrics.jsFailureRequests=await requests();
 report.checks.push('Real missing engine chunk remains exact readable source; Vite preloadError forbids retries after10s and remount, even when the block is lifted in the same document');
 phaseTo('reload-recovery');await reload('none');await node('frontier').locator('[role=math]').waitFor();await node('showcase').locator('[role=math]').first().waitFor();assert.equal(await node('frontier').locator('[data-math-fallback]').count(),0);report.checks.push('A fresh renderer recovers the same persisted formulas after the actual module request failure is removed');
 phaseTo('unmount-pending');await reload('hold-engine');await poll(async()=>(await requests()).some(r=>r.engine),'held reload engine');await node('frontier').locator('[data-math-fallback]').waitFor();await open(B);await release();await page.waitForTimeout(250);assert.equal(await page.locator('.srm-display,.srm-inline').count(),0);await open(A);await node('frontier').locator('[role=math]').waitFor();assert.equal((await requests()).filter(r=>r.engine).length,1);report.checks.push('Switching conversations while the real engine import is pending never paints the old formula into the new conversation; returning uses the single shared ready engine');
 phaseTo('narrow-keyboard-scroll');await put('wide-math','$$\n'+Array.from({length:35},(_,i)=>`x_{${i}}`).join('+')+'=0\n$$');await node('wide-math').locator('[role=math]').waitFor();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(800,768));await node('wide-math').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 const wide=node('wide-math').locator('.srm-display');report.metrics.wide=await wide.evaluate(n=>({overflow:n.scrollWidth>n.clientWidth,body:document.documentElement.scrollWidth>innerWidth,padding:getComputedStyle(n).paddingTop,overflowX:getComputedStyle(n).overflowX,font:document.fonts.check('16px KaTeX_Main')}));assert.deepEqual(report.metrics.wide,{overflow:true,body:false,padding:'2px',overflowX:'auto',font:true});await wide.locator('[role=math]').focus();await page.keyboard.press('ArrowRight');await poll(async()=>await wide.evaluate(n=>n.scrollLeft)>0,'math keyboard scroll');await shot('math-narrow');report.checks.push('Long display math scrolls horizontally by keyboard at800px without widening the conversation, using local KaTeX fonts and source2px padding');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=hashes;report.checks.push('No uncaught renderer exception; production source manifest and test/fixture hashes unchanged');report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{if(app){await app.evaluate(({BrowserWindow})=>{for(const callback of globalThis.mathHeld||[])callback({cancel:true});BrowserWindow.getAllWindows()[0]?.webContents.session.webRequest.onBeforeRequest(null);}).catch(()=>{});await app.close();}const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'response-math-ui-report.json'),bytes);console.log(bytes);}
