import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'), evidence=path.join(root,'../analysis/batch-20260920');
const profile=await fs.mkdtemp(path.join(evidence,'race-profile-')), now=Math.floor(Date.now()/1000);
const workspace=path.join(profile,'workspace');await fs.mkdir(workspace);
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',model:'fixture',threadIds:['race-a','race-b']}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:Object.fromEntries(['race-a','race-b'].map(id=>[id,{id,cwd:workspace,name:id,createdAt:now,updatedAt:now,turns:[],archived:false}]))}));
// HANDOFF 0.2.124: since the 0.2.15 Codex 0.155.1 adaptation (analysis/protocol-0155-20260921/source-contract.md) a
// paginated thread (the fixture default, codex-server.cjs:27) resumes with excludeTurns + initialTurnsPage
// (src/thread-history-model.mjs:63-66) and hydrates from initialTurnsPage (src/main.jsx:1067), not thread.turns;
// the delayed snapshots are injected where that route reads them (thread.turns only for a legacy response).
const binary=path.join(profile,'proxy.cjs'), fixture=path.join(root,'tests/fixtures/codex-server.cjs');
await fs.writeFile(binary,`#!/usr/bin/env node
const {spawn}=require('node:child_process'), readline=require('node:readline'), fs=require('node:fs');
const child=spawn(process.execPath,[${JSON.stringify(fixture)}],{stdio:['pipe','pipe','inherit']});
const waits=new Map();let resumes=0;
readline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line); if(m.method==='thread/archive'||m.method==='turn/start') waits.set(m.id,{delay:1200}); if(m.method==='thread/resume'&&m.params.threadId==='race-a'){resumes++;if(resumes<=2)waits.set(m.id,{delay:resumes===1?1300:0,text:resumes===1?'STALE_SNAPSHOT':'CURRENT_SNAPSHOT'});}child.stdin.write(line+'\\n');});
readline.createInterface({input:child.stdout}).on('line',line=>{const m=JSON.parse(line),w=waits.get(m.id); if(w){waits.delete(m.id);if(w.text){const turns=[{id:'snapshot',status:'completed',items:[{id:'snapshot-message',type:'agentMessage',text:w.text}]}];if(m.result.initialTurnsPage)m.result.initialTurnsPage.data=turns;else m.result.thread.turns=turns;}setTimeout(()=>process.stdout.write(JSON.stringify(m)+'\\n'),w.delay);}else process.stdout.write(line+'\\n');});
process.stdin.on('end',()=>child.stdin.end());child.on('exit',code=>process.exit(code||0));
`);await fs.chmod(binary,0o755);
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:binary};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env});const errors=[],checks=[];
try{
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 const row=id=>page.locator(`[data-source-session-id="${id}"] .source-session-open`);
 await row('race-a').waitFor();await row('race-a').click();await row('race-b').click();await row('race-a').click();
 await page.getByText('CURRENT_SNAPSHOT',{exact:true}).waitFor();await page.waitForTimeout(1600);assert.equal(await page.getByText('STALE_SNAPSHOT',{exact:true}).count(),0);
 checks.push('A→B→A out-of-order resume cannot replace current transcript with stale history');
 const input=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });await input.fill('fixture:complete delayed send');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 // R4 closeout: the pending send is the CdsButton's busy state (composer-send-cell KM `busy: submitQueued` -> aria-busy), not .sc-spinner.
 await page.locator('[data-testid="code-prompt-send"][aria-busy="true"]:not([inert] *)').waitFor();await input.fill('A new draft typed during the pending send');await page.waitForFunction(()=>!document.querySelector('[data-testid="code-prompt-send"][aria-busy="true"]'));
 // HANDOFF 0.2.81/0.2.124: the composer is a contenteditable ProseMirror editor exposing its serialized draft as
 // node.value (src/source-composer-editor.jsx:61); Playwright inputValue only reads input/textarea/select.
 assert.equal(await input.evaluate(node=>node.value),'A new draft typed during the pending send');checks.push('pending send does not discard text typed after submission');
 await input.fill('');await row('race-a').hover();await page.locator('[data-source-session-id="race-a"] .source-session-more').click();await page.getByRole('menuitem',{name:/Archive/}).click();await row('race-b').click();
 await page.waitForTimeout(1600);assert.equal(await page.locator(':is(.st-title,button[data-pane-title])').textContent(),'race-b');assert.equal(await row('race-a').count(),0);
 checks.push('delayed archive of A preserves navigation to B');
 assert.deepEqual(errors,[]);const report={passed:true,at:new Date().toISOString(),fixture:true,checks,errors};await fs.writeFile(path.join(evidence,'integration-race-test.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await app.close();}
