import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/functions-20260920'),profile=await fs.mkdtemp(path.join(evidence,'actions-live-')),workspace=path.join(profile,'workspace');await fs.mkdir(workspace);
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',permission:'plan',effort:'low',threadIds:[]}));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'))),scriptHash=createHash('sha256').update(await fs.readFile(import.meta.filename)).digest('hex');
const report={passed:false,realCodex:true,profile,build,scriptHash,startedAt:new Date().toISOString(),checks:[],cleanup:[]};
const env={...process.env,CODE_DESKTOP_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;delete env.CODEX_BINARY;delete env.CODE_DESKTOP_DEV_URL;
let app,page;const errors=[];
const prefs=async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json')));
async function slash(text){const editor=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });await editor.fill(text);await editor.press('Enter');}
// W14-code r3 css3-operation-status-band: 3.6556.2 Code draws no session-action strip (main.jsx renders
// .session-operation-status only outside Code), so the terminal phase is read from the recorded session-operation events.
async function terminal(operation){const latest=()=>page.evaluate(operation=>(window.actionTestEvents||[]).filter(e=>e.kind==='session-operation'&&e.operation===operation).at(-1)??null,operation);
 await page.waitForFunction(operation=>['completed','failed'].includes((window.actionTestEvents||[]).filter(e=>e.kind==='session-operation'&&e.operation===operation).at(-1)?.phase),operation,{timeout:180000});
 const last=await latest();assert.equal(last.phase,'completed',last.error||operation);}
try{
 app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env});page=await app.firstWindow();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>document.querySelector('.sc-model-trigger')&&!document.querySelector('.sc-model-trigger').disabled,{},{timeout:60000});
 await page.evaluate(()=>{window.actionTestEvents=[];window.desktop.onEvent(e=>{if(e.kind==='session-operation')window.actionTestEvents.push(e);else if(e.method==='turn/started'||e.method==='turn/completed'||e.method==='item/started'||e.method==='item/completed')window.actionTestEvents.push({method:e.method,threadId:e.params.threadId,turnId:e.params.turn?.id||e.params.turnId,status:e.params.turn?.status,itemType:e.params.item?.type,error:e.params.turn?.error?.message});});});
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).fill('Remember the exact marker FUNCTION_ACCEPTANCE_211. Reply only with this marker. Do not use tools.');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 await page.locator('.assistant-message').filter({hasText:'FUNCTION_ACCEPTANCE_211'}).waitFor({timeout:180000});await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({state:'detached',timeout:180000});
 const original=(await prefs()).threadIds[0];report.original=original;
 await slash('/compact');await terminal('compact');report.checks.push('Real thread/compact/start completes only on terminal event');
 await slash('/fork Function acceptance fork');await page.locator(':is(.st-title,button[data-pane-title])').filter({hasText:'Function acceptance fork'}).waitFor();await page.waitForFunction(()=>!document.querySelector('.conversation-loading')&&!document.querySelector('[data-testid="code-prompt-send"][aria-busy="true"]'));
 const fork=(await prefs()).threadIds.find(id=>id!==original);assert.ok(fork);report.fork=fork;assert.equal((await prefs()).sessionMetadata[fork].forkedFrom,original);
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).fill('What exact marker did I ask you to remember? Reply only with the marker. Do not use tools.');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.assistant-message')].filter(el=>el.textContent.includes('FUNCTION_ACCEPTANCE_211')).length>=2&&!document.querySelector('[data-testid="code-prompt-stop"]:not([inert] *)'),{},{timeout:180000});
 report.checks.push('Real thread/fork new ID preserves compacted conversation and marker recall');
 const before=await page.evaluate(async id=>(await window.desktop.call('rpc',{method:'thread/read',params:{threadId:id,includeTurns:true}})).thread.turns.length,original);assert.ok(before>=1);report.originalTurns=before;
 await slash('/review Review only this proposed JavaScript function: function identity(x) { return x; }. Do not use tools or inspect files. Give a brief assessment.');await page.getByRole('button',{name:'Start review'}).click();await terminal('review');
 // W14-code r4 R4T-03: the review is the reply's prose (no "Review result" step); the reply follows the review turn.
 assert.ok(await page.locator('[data-transcript-item-id]').count());await page.screenshot({path:path.join(profile,'real-review.png')});
 const after=await page.evaluate(async id=>(await window.desktop.call('rpc',{method:'thread/read',params:{threadId:id,includeTurns:true}})).thread.turns.length,original);assert.equal(after,before);report.checks.push('Real inline review produces review item and completes; source session stays unchanged');
 await slash('/status');await page.getByRole('dialog',{name:'Session status',exact:true}).waitFor();await page.getByRole('button',{name:'Refresh',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('[aria-label="Account usage limits"] [role="status"]'));
 report.status={context:await page.locator('.session-status-details').innerText().then(s=>s.slice(s.indexOf('Context tokens'))),rateLimitWindows:await page.locator('.session-limit').count(),unavailable:await page.locator('.session-status-limits').innerText()};assert.ok(report.status.rateLimitWindows>0 || /Unavailable/.test(report.status.unavailable));await page.keyboard.press('Escape');report.checks.push('Real account/rateLimits/read and live context status without invented values');
 report.events=await page.evaluate(()=>window.actionTestEvents);assert.deepEqual(errors,[]);report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page){report.events=await page.evaluate(()=>window.actionTestEvents).catch(()=>[]);await page.screenshot({path:path.join(profile,'failure.png')}).catch(()=>{});}}
finally{
 const owned=[...new Set([...(await prefs()).threadIds,...(await prefs()).archivedThreadIds||[]])];report.threadIds=owned;
 for(const id of owned){try{await page.evaluate(async id=>window.desktop.call('rpc',{method:'thread/archive',params:{threadId:id}}),id);report.cleanup.push({threadId:id,archived:true});}catch(error){report.cleanup.push({threadId:id,archived:false,error:error.message});}}
 await app?.close().catch(e=>{report.error ||=e.stack;report.passed=false;process.exitCode=1;});report.pageErrors=errors;report.finishedAt=new Date().toISOString();
 await fs.writeFile(path.join(profile,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(evidence,'session-actions-live.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,profile,checks:report.checks,cleanup:report.cleanup,error:report.error},null,2));
}
