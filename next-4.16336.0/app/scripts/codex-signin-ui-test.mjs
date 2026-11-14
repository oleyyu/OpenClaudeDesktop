// Setup with Codex (source-onboarding.jsx SignInCard, core descriptor `login`, i18n assistant name): Choose your agent
// → Codex → its pinned release downloads (a loopback stand-in) → the connection restarts on Codex and the window
// reloads with the copy naming "Codex" → "Sign in to Codex" offers ChatGPT, a device code and an OpenAI API key →
// the API key goes out as account/login/start {type: "apiKey", apiKey} → the core reports the account → setup ends.
// The connection stays on the fixture (CODEX_BINARY wins); fixture-core.json switches it to a Codex-like core (no engine)
// with a GPT-like catalog, so the restart saves a model that catalog lists. Codex signed out reports requiresOpenaiAuth
// true. A second launch covers Codex on a custom endpoint (Settings › Models): account/read reports requiresOpenaiAuth
// false and no account, so setup finishes without the Sign in step and Settings › Account names the endpoint instead.
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'codex-signin-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[]});
await atom('fixture-core.json',{engine:'deepseek-harness',capabilities:{}});
await fs.writeFile(path.join(profile,'account-fixture.marker'),'isolated-account-test\n');
const noKey={account:null,requiresOpenaiAuth:false,deepseek:{apiKey:{configured:false,source:null},platform:null,links:null}};
await atom('fixture-account.json',{'account/read':{result:noKey},'account/login/start':{result:{type:'apiKey'}}});
const stage=path.join(directory,'release');await fs.mkdir(stage);
await fs.writeFile(path.join(stage,'codex-aarch64-apple-darwin'),'#!/bin/sh\necho "codex-cli 0.155.1"\n',{mode:0o755});
const tarball=path.join(directory,'codex.tar.gz');execFileSync('tar',['-czf',tarball,'-C',stage,'codex-aarch64-apple-darwin']);
const bytes=await fs.readFile(tarball);
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-length':bytes.length});res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const manifest=path.join(directory,'release.json');await fs.writeFile(manifest,JSON.stringify({url:`http://127.0.0.1:${server.address().port}/codex.tar.gz`,version:'0.155.1',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs'),CODE_DESKTOP_CORE_SYSTEM_PATHS:'',CODE_DESKTOP_CORE_RELEASE_MANIFEST:manifest,CODE_DESKTOP_PICK_PACK:path.join(root,'extensions/codex')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/codex-signin-ui-test.mjs','tests/fixtures/codex-server.cjs','tests/fixtures/account-fixture.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+label);};
const readJson=file=>fs.readFile(path.join(profile,file),'utf8').then(JSON.parse);
const requests=async()=>{try{return (await fs.readFile(path.join(profile,'fixture-account-requests.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch{return [];}};
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,860));}
try{
 await integrity();
 await launch();
 const setup=()=>page.getByRole('dialog',{name:'Set up OpenClaude Desktop',exact:true});
 await setup().waitFor();await page.getByRole('button',{name:'Get started',exact:true}).click();
 // Codex is the Extension Pack the app ships (extensions/codex): added first (CODE_DESKTOP_PICK_PACK stands in for the picker).
 await setup().getByRole('button',{name:'Import extension pack…',exact:true}).click();
 const addCodex=page.getByRole('dialog',{name:'Add Codex?',exact:true});await addCodex.waitFor();
 await addCodex.getByRole('button',{name:'Add pack',exact:true}).click();await addCodex.waitFor({state:'detached'});
 await setup().locator('[data-core=codex]').click();
 // From now on the fixture answers as a Codex app-server (no engine report), signed out of ChatGPT.
 const efforts=list=>list.map(reasoningEffort=>({reasoningEffort}));
 const codexModels=[{id:'gpt-6-astra',model:'gpt-6-astra',displayName:'GPT-6 Astra',isDefault:true,defaultReasoningEffort:'low',supportedReasoningEfforts:efforts(['low','medium','high','xhigh','max','ultra']),serviceTiers:[]},
  {id:'gpt-5.5',model:'gpt-5.5',displayName:'GPT-5.5',isDefault:false,defaultReasoningEffort:'medium',supportedReasoningEfforts:efforts(['low','medium','high','xhigh']),serviceTiers:[]}];
 await atom('fixture-core.json',{capabilities:{},models:codexModels});
 await atom('fixture-account.json',{'account/read':{result:{account:null,requiresOpenaiAuth:true}},'account/login/start':{result:{type:'apiKey'}}});
 await page.getByRole('button',{name:'Download Codex and continue',exact:true}).click();
 // The window reloads onto Codex; setup continues at Sign in, and the copy names Codex.
 await page.getByRole('heading',{name:'Sign in to Codex',exact:true}).waitFor({timeout:30000});
 assert.equal((await readJson('preferences.json')).core,'codex');
 // chooseOnboardingCore → reconnect: main reconciled the saved DeepSeek-era model against the Codex catalog.
 let chosen;await poll(async()=>{chosen=await readJson('preferences.json');return codexModels.some(m=>m.model===chosen.model);},'a Codex model saved');
 report.metrics.chosenModel=chosen.model;assert.equal(chosen.model,'gpt-6-astra');
 assert.equal(await page.getByRole('textbox',{name:'Message Codex',exact:true}).count(),1,'the composer is “Message Codex”');
 const card=setup().locator('.sob-signin');
 report.metrics.options=await card.locator('[data-signin]').evaluateAll(list=>list.map(n=>[n.dataset.signin,n.innerText.trim()]));
 /* source-onboarding.jsx: a relay (custom Responses endpoint) is offered as a text link after the sign-in methods. */assert.deepEqual(report.metrics.options,[['chatgpt','Continue with ChatGPT'],['device-code','Use a device code'],['api-key','Continue with API key'],['custom-endpoint','Use a custom endpoint (relay)…']]);
 await page.screenshot({path:path.join(directory,'signin-codex.png')});
 report.checks.push('Choosing Codex downloads it, restarts on it and reloads the window naming “Codex” (composer “Message Codex”); setup continues at “Sign in to Codex” with ChatGPT, device code and API key, plus a custom endpoint (relay) link');
 await card.getByRole('textbox',{name:'API key',exact:true}).fill('sk-test-openai');
 await card.getByRole('button',{name:'Continue with API key',exact:true}).click();
 await poll(async()=>(await requests()).some(r=>r.method==='account/login/start'),'key sent');
 assert.deepEqual((await requests()).find(r=>r.method==='account/login/start').params,{type:'apiKey',apiKey:'sk-test-openai'});
 // The core now reports the account and says so.
 await atom('fixture-account.json',{'account/read':{result:{account:{type:'apiKey'},requiresOpenaiAuth:false}},'account/login/start':{result:{type:'apiKey'}}});
 await atom('fixture-account-events.json',[{id:'signed-in',method:'account/updated',params:{authMode:'apikey'}}]);
 await setup().waitFor({state:'detached',timeout:15000});
 assert.equal((await readJson('preferences.json')).onboarded,true);
 report.checks.push('The API key goes out as account/login/start {type:"apiKey", apiKey}; once the core reports the account, setup finishes');

 // Codex on a custom endpoint: no account, requiresOpenaiAuth false. A fresh setup ends by itself, with no Sign in step.
 await app.close();app=null;
 const prefs=await readJson('preferences.json');await atom('preferences.json',{...prefs,onboarded:false});
 await atom('fixture-account.json',{'account/read':{result:{account:null,requiresOpenaiAuth:false}},'account/login/start':{result:{type:'apiKey'}}});
 await atom('fixture-account-events.json',[]);
 await launch();
 await poll(async()=>(await readJson('preferences.json')).onboarded===true,'setup finished on the custom endpoint');
 assert.equal(await setup().count(),0,'setup never opens');
 assert.equal(await page.getByText('Sign in to Codex',{exact:true}).count(),0,'no Sign in step or card');
 await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'General',exact:true}).click();
 const accountRow=settings.locator('[data-setting-id=account]');await accountRow.waitFor();
 report.metrics.customAccount=await accountRow.innerText();
 assert.match(report.metrics.customAccount,/Using a custom endpoint \(Settings › Models\)/);
 assert.equal(await settings.getByRole('button',{name:'Sign in',exact:true}).count(),0);assert.doesNotMatch(await settings.innerText(),/Not signed in|Use device code/);
 await page.screenshot({path:path.join(directory,'account-custom-endpoint-light.png')});
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await page.screenshot({path:path.join(directory,'account-custom-endpoint-dark.png')});await page.evaluate(()=>{document.documentElement.dataset.mode='light';});
 report.checks.push('Codex on a custom endpoint (account null, requiresOpenaiAuth false): setup ends without the Sign in step, and Settings › Account says “Using a custom endpoint (Settings › Models)” with no Sign in rows');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();server.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'codex-signin-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
