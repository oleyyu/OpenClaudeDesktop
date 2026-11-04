import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'), evidence=path.resolve(root,'../analysis/batch-20260920');
const profile=await fs.mkdtemp(path.join(evidence,'connection-profile-'));
const binary=path.join(profile,'connection-server.cjs');
await fs.writeFile(binary,`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const file=path.join(process.env.CODE_DESKTOP_DATA,'starts.json');
let list=[];try{list=JSON.parse(fs.readFileSync(file))}catch{}
const ordinal=list.length+1;list.push({pid:process.pid,ordinal});fs.writeFileSync(file,JSON.stringify(list));
readline.createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);if(m.id===undefined)return;
 let result={};
 if(m.method==='initialize')result={userAgent:'Connection lifecycle fixture'};
 if(m.method==='account/read')result={requiresOpenaiAuth:false,account:null};
 if(m.method==='model/list')result={data:[{id:'fixture-'+ordinal,model:'fixture-'+ordinal,displayName:'Connection fixture '+ordinal,isDefault:true,defaultReasoningEffort:'low',supportedReasoningEfforts:[{reasoningEffort:'low'}]}]};
 const send=()=>process.stdout.write(JSON.stringify({id:m.id,result})+'\\n');
 // F09 review: while the test leaves this flag file, initialize fails (a core that cannot start).
 if(m.method==='initialize'&&fs.existsSync(path.join(process.env.CODE_DESKTOP_DATA,'fail-initialize'))){process.stdout.write(JSON.stringify({id:m.id,error:{code:-32603,message:'Fixture initialize failure'}})+'\\n');return;}
 if(m.method==='initialize')setTimeout(send,ordinal===1?5000:400);else send();
});
`,{mode:0o755});
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:profile,threadIds:[],theme:'light'}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:binary};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env});
try{
 const page=await app.firstWindow();
 for(let i=0;i<100;i++){try{if(JSON.parse(await fs.readFile(path.join(profile,'starts.json'),'utf8')).length)break;}catch{}await new Promise(r=>setTimeout(r,30));}
 // F09 (cc43287c9 Zk): nothing replaces the home while the first core is still initializing (5 s):
 // no 'Connecting to DeepSeek…' connection card, and no lost-connection warning during the initial connect.
 // R4DC-N2 (E95): the code home is the presets start card in main.jsx's .welcome block (no greeting header).
 await page.locator('.welcome').first().waitFor();
 const connecting=await page.evaluate(()=>({cards:document.querySelectorAll('.connection-card').length,warning:document.querySelectorAll('[data-cds-composer-warning]').length,text:document.body.innerText.includes('Connecting to DeepSeek')}));
 assert.deepEqual(connecting,{cards:0,warning:0,text:false});
 const replacement=await page.evaluate(()=>window.desktop.call('reconnect'));
 assert.equal(replacement.connected,true);assert.equal(replacement.models[0].model,'fixture-2');
 // The previous init rejection has now settled. It cannot clear or overwrite
 // the replacement connection, and concurrent init readers share it.
 const reads=await page.evaluate(()=>Promise.all([window.desktop.call('init'),window.desktop.call('init')]));
 assert.ok(reads.every(r=>r.connected&&r.models[0].model==='fixture-2'));
 const next=await page.evaluate(()=>window.desktop.call('reconnect'));
 assert.equal(next.models[0].model,'fixture-3');
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'starts.json'),'utf8')).length,3);
 // F09 review: with the connection card gone, a lost or failed connection on Home is the composer's
 // warning row (data-cds-composer-warning + Retry) plus the page error banner carrying the reason.
 const homeState=(reason)=>page.waitForFunction((reason)=>{
  const row=document.querySelector('[data-cds-composer-warning]');
  const alert=[...document.querySelectorAll('[role=alert].composer-error')].map(node=>node.textContent).join('\n');
  if(!row||!alert.includes(reason))return null;
  return {cards:document.querySelectorAll('.connection-card').length,warning:row.querySelector('.sc-warning-text')?.textContent??null,retry:row.querySelector('button')?.textContent??null,connecting:document.body.innerText.includes('Connecting to DeepSeek'),home:!!document.querySelector('.welcome')};
 },reason,{timeout:15000}).then(handle=>handle.jsonValue());
 // coreName(boot.core): the fixture reports no engine, read as Codex by core-registry coreForEngine.
 const lostState={cards:0,warning:'Connection to Codex lost.',retry:'Retry',connecting:false,home:true};
 const third=JSON.parse(await fs.readFile(path.join(profile,'starts.json'),'utf8')).at(-1);
 process.kill(third.pid,'SIGTERM');
 assert.deepEqual(await homeState('DeepSeek disconnected'),lostState,'after a disconnect: no connection card; the warning row with Retry and the disconnect reason');
 // A failed manual reconnect (initialize rejected) keeps the warning row and shows why.
 await fs.writeFile(path.join(profile,'fail-initialize'),'');
 await page.locator('[data-cds-composer-warning]').getByRole('button',{name:'Retry',exact:true}).click();
 assert.deepEqual(await homeState('Fixture initialize failure'),lostState,'an initialize failure on Home shows its message and no connection card');
 await fs.rm(path.join(profile,'fail-initialize'));
 await page.locator('[data-cds-composer-warning]').getByRole('button',{name:'Retry',exact:true}).click();
 await page.locator('[data-cds-composer-warning]').waitFor({state:'detached'});
 await page.locator('[role=alert].composer-error').waitFor({state:'detached'});
 assert.equal(await page.locator('.connection-card').count(),0);
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'starts.json'),'utf8')).length,5,'the failed and the recovering Retry each start one core');
 const report={passed:true,at:new Date().toISOString(),fixture:true,checks:['replacement connect does not reuse an obsolete pending initialize','old rejection cannot clear replacement connection','concurrent init readers use current account/model snapshot','subsequent reconnect starts one new owned process','no connection card or lost-connection warning while the first core initializes','after a disconnect on Home: no connection card, the warning row with Retry, and the disconnect reason in the error banner','a failed Retry (initialize rejected) shows its message on Home with the warning row and no connection card; the next Retry recovers and clears both']};
 await fs.writeFile(path.join(evidence,'connection-lifecycle-test.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await app.close();}
