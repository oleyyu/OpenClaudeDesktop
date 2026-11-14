// Settings › Cores (core-manager.cjs) in the real app, isolated: the DeepSeek core is the fixture server (run as the
// bridge script), and a local HTTP server stands in for the Codex GitHub release. Its tarball holds a fake `codex`
// that answers --version and otherwise runs the fixture as a Codex core (no engine report). Installing streams it
// with progress and a checksum check; Use restarts the connection on the downloaded binary; Remove deletes it.
// The Codex fixture lists its own GPT-like catalog (the `models` knob in fixture-core-codex.json), so the default model
// is remembered per core (main reconciles and saves on connect), and Settings › Models shows the Codex endpoint group.
// Bypass across a switch (main.cjs bypassCarry): an active Bypass rides along to the one connection a Cores switch
// starts, applied once by the reloaded page and only in the folder it was confirmed in; a reload, a plain Reconnect, a
// refusing core, a failed select or another folder carry nothing.
import fs from 'node:fs/promises';import fsSync from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createHash,randomBytes} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'cores-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
const fixture=path.join(root,'tests/fixtures/codex-server.cjs');
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true});
await atom('fixture-core.json',{engine:'deepseek-harness',capabilities:{}});
const efforts=list=>list.map(reasoningEffort=>({reasoningEffort}));
const codexModels=[{id:'gpt-6-astra',model:'gpt-6-astra',displayName:'GPT-6 Astra',description:'Frontier agentic coding model.',isDefault:true,defaultReasoningEffort:'low',supportedReasoningEfforts:efforts(['low','medium','high','xhigh','max','ultra']),serviceTiers:[{id:'priority',name:'Fast',description:'2x speed, increased usage'}]},
 {id:'gpt-5.5',model:'gpt-5.5',displayName:'GPT-5.5',description:'Previous frontier model.',isDefault:false,defaultReasoningEffort:'medium',supportedReasoningEfforts:efforts(['low','medium','high','xhigh']),serviceTiers:[]}];
await atom('fixture-core-codex.json',{capabilities:{},models:codexModels});
// The fake release: codex-aarch64-apple-darwin + 2 MB of padding so the download shows progress.
const stage=path.join(directory,'release');await fs.mkdir(stage);
await fs.writeFile(path.join(stage,'codex-aarch64-apple-darwin'),`#!/bin/sh\nif [ "$1" = "--version" ]; then echo "codex-cli 0.155.1"; exit 0; fi\nexec env CODE_DESKTOP_FIXTURE_CORE_FILE=fixture-core-codex.json "${process.execPath}" "${fixture}" "$@"\n`,{mode:0o755});
await fs.writeFile(path.join(stage,'padding.bin'),randomBytes(2*1024*1024));
const archive=path.join(directory,'codex.tar.gz');execFileSync('tar',['-czf',archive,'-C',stage,'codex-aarch64-apple-darwin','padding.bin']);
const bytes=await fs.readFile(archive),sha256=createHash('sha256').update(bytes).digest('hex');
let served=0;
// The same loopback server stands in for a GPT relay (/v1/models) when the Codex endpoint is filled in.
const RELAY_KEY='sk-cores-relay-'+randomBytes(6).toString('hex');const relayCalls=[];
const server=http.createServer(async(req,res)=>{if(req.url.startsWith('/v1/')){relayCalls.push({method:req.method,url:req.url,bearer:req.headers.authorization===`Bearer ${RELAY_KEY}`});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{id:'relay-a'},{id:'relay-b'}]}));return;}
 if(req.url!=='/codex.tar.gz'){res.writeHead(404);res.end();return;}served++;res.writeHead(200,{'content-type':'application/gzip','content-length':bytes.length});
 for(let at=0;at<bytes.length;at+=128*1024){res.write(bytes.subarray(at,at+128*1024));await new Promise(r=>setTimeout(r,60));}res.end();});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const manifest=path.join(directory,'release.json');await fs.writeFile(manifest,JSON.stringify({url:`http://127.0.0.1:${server.address().port}/codex.tar.gz`,version:'0.155.1',sha256,size:bytes.length}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),DSH_HOME:path.join(profile,'dsh-home'),CODE_DESKTOP_DEEPSEEK_CORE:fixture,CODE_DESKTOP_NODE:process.execPath,CODE_DESKTOP_CORE_RELEASE_MANIFEST:manifest,CODE_DESKTOP_CORE_SYSTEM_PATHS:''};
for(const key of ['ELECTRON_RUN_AS_NODE','CODE_DESKTOP_DEV_URL','CODEX_BINARY','CODE_DESKTOP_CORE'])delete env[key];
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/cores-ui-test.mjs','scripts/composer-test-helpers.mjs','tests/fixtures/codex-server.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
const readJson=file=>fs.readFile(path.join(profile,file),'utf8').then(JSON.parse);
async function launch(label='Test model'){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,820));await ready(label);}
// The composer is enabled and its Model trigger names the expected model.
const ready=(label,timeout)=>page.waitForFunction(text=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled')&&document.querySelector('[aria-label="Model"]')?.textContent.includes(text);},label,timeout?{timeout}:undefined);
// Use on a core with another assistant name reloads the window (source-settings-cores.jsx reloadForAssistant): mark the
// page first, then wait for a fresh one.
const mark=()=>page.evaluate(()=>{window.__coresMark=1;});
const reloaded=async label=>{await poll(()=>page.evaluate(()=>!window.__coresMark),'window reloaded',20000);await ready(label,20000);};
try{
 await integrity();await launch();
 const openSection=async name=>{const settings=page.getByRole('dialog',{name:'Settings',exact:true});if(!await settings.count())await page.keyboard.press('Meta+,');await settings.waitFor();await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name,exact:true}).click();return settings;};
 const openCores=()=>openSection('Cores');
 const closeSettings=async()=>{const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.getByRole('button',{name:'Close',exact:true}).first().click();await settings.waitFor({state:'detached'});};
 const modelTrigger=()=>page.locator('[aria-label="Model"]').first();
 const dark=async file=>{await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await page.screenshot({path:path.join(directory,file)});await page.evaluate(()=>{document.documentElement.dataset.mode='light';});};
 const settings=await openCores();
 const row=id=>settings.locator(`[data-core-status=${id}]`);
 // Codex is a bundled Extension Pack, not a built-in core: no Codex core row until its Included row is added.
 assert.equal(await row('codex').count(),0,'no Codex core before its pack is added');
 await page.screenshot({path:path.join(directory,'cores-codex-included.png')});
 await settings.locator('[data-bundled-add=codex]').click();
 const addDialog=page.getByRole('dialog',{name:'Add Codex?',exact:true});await addDialog.waitFor();
 await addDialog.getByRole('button',{name:'Add pack',exact:true}).click();await addDialog.waitFor({state:'detached'});
 await row('codex').waitFor();
 assert.equal(await settings.locator('[data-bundled-add=codex]').count(),0,'an added pack is no longer offered');
 assert.ok(fsSync.existsSync(path.join(profile,'extensions/codex/manifest.json')),'the pack is installed in the data folder');
 report.checks.push('codex-pack-added');
 assert.equal(await row('deepseek').textContent(),'Built in');
 const deepseekRow=settings.locator('.settings-row,[data-setting-row]').filter({has:row('deepseek')});
 report.metrics.before=await settings.evaluate(n=>n.innerText.slice(0,1200));
 assert.match(report.metrics.before,/DeepSeek Harness[\s\S]*Running/);
 await page.screenshot({path:path.join(directory,'cores-before.png')});
 report.checks.push('Cores lists the built-in DeepSeek Harness as running and Codex with its pinned release');

 // Install: confirm dialog with size and source, streamed progress, checksum, extracted binary.
 await settings.locator('[data-core-install=codex]').click();
 const confirm=page.getByRole('dialog',{name:'Download Codex 0.155.1?',exact:true});await confirm.waitFor();
 report.metrics.confirm=await confirm.innerText();assert.match(report.metrics.confirm,/2 MB from 127\.0\.0\.1/);
 await confirm.getByRole('button',{name:'Download',exact:true}).click();await confirm.waitFor({state:'detached'});
 await poll(async()=>/Downloading… \d+ MB of 2 MB/.test(await row('codex').textContent()),'progress shown');
 await settings.getByRole('progressbar',{name:'Download progress'}).waitFor();
 await poll(async()=>(await settings.getByRole('progressbar',{name:'Download progress'}).getAttribute('aria-valuenow'))>0,'progress above 0');
 await poll(async()=>(await settings.getByRole('progressbar',{name:'Download progress'}).evaluate(n=>n.firstElementChild.getBoundingClientRect().width))>0,'the bar fills');
 report.metrics.fill=await settings.getByRole('progressbar',{name:'Download progress'}).evaluate(n=>({track:n.getBoundingClientRect().width,fill:n.firstElementChild.getBoundingClientRect().width,color:getComputedStyle(n.firstElementChild).backgroundColor,value:n.getAttribute('aria-valuenow')}));
 await page.screenshot({path:path.join(directory,'cores-downloading.png')});
 await poll(async()=>/Downloaded by OpenClaude Desktop · codex-cli 0\.155\.1|Downloaded by OpenClaude Desktop · 0\.155\.1/.test(await row('codex').textContent()),'installed',30000);
 const record=await readJson('cores/codex/manifest.json');assert.deepEqual([record.version,record.reported,record.sha256],['0.155.1','codex-cli 0.155.1',sha256]);
 assert.ok(fsSync.statSync(path.join(profile,'cores/codex/0.155.1/codex')).mode&0o111);assert.equal(served,1);
 report.checks.push('Install asks first (size and source), streams with a progress bar, checks the checksum and records the extracted binary under the app data folder');

 // Use: the connection restarts on the downloaded binary; the Codex fixture reports no engine.
 await mark();await settings.locator('[data-core-use=codex]').click();
 await poll(async()=>(await readJson('preferences.json')).core==='codex','choice saved');
 await poll(async()=>/Codex[\s\S]*Running/.test(await settings.evaluate(n=>n.innerText)),'codex running',20000);
 // The window reloads 150 ms after this (a new assistant name), so these two may land on the fresh page.
 report.metrics.after=await settings.evaluate(n=>n.innerText.slice(0,1200)).catch(()=>'(reloading)');
 await page.screenshot({path:path.join(directory,'cores-codex-running.png')}).catch(()=>{});
 report.checks.push('Use saves the choice and restarts the connection on the downloaded Codex, which then shows as running');
 await reloaded('GPT-6 Astra');

 // Per-core model: connect() reconciles the saved model against Codex's catalog and saves it; DeepSeek's stays remembered.
 await poll(async()=>(await readJson('preferences.json')).model==='gpt-6-astra','Codex default saved',20000);
 let prefs=await readJson('preferences.json');
 assert.equal(prefs.coreModels?.deepseek?.model,'fixture','the DeepSeek choice is remembered under coreModels.deepseek');
 assert.ok(codexModels[0].supportedReasoningEfforts.some(e=>e.reasoningEffort===prefs.effort),`effort ${prefs.effort} is one GPT-6 Astra supports`);
 await poll(async()=>(await modelTrigger().textContent()).includes('GPT-6 Astra'),'composer shows the Codex default');
 report.metrics.afterSwitch={model:prefs.model,effort:prefs.effort,coreModels:prefs.coreModels};

 // Settings › Models on Codex (after the reload onto Codex): the endpoint group (OpenAI / Custom endpoint) and the running core's models; no DeepSeek
 // connection, Pricing, Custom providers or Quick setup.
 const models=await openSection('Models');
 await models.getByRole('radiogroup',{name:'Codex provider',exact:true}).waitFor();
 await models.getByRole('heading',{name:'Codex models',exact:true}).waitFor();
 report.metrics.modelsPage=await models.locator('.msx-page').innerText();
 assert.match(report.metrics.modelsPage,/GPT-6 Astra\s*Default/);assert.match(report.metrics.modelsPage,/Fast available/);assert.match(report.metrics.modelsPage,/Ultra/);
 for(const gone of ['API provider','Pricing','Custom providers','Quick setup','DeepSeek API key','Advanced'])assert.equal(report.metrics.modelsPage.includes(gone),false,gone);
 assert.equal(await models.getByRole('radiogroup',{name:'API provider'}).count(),0);
 assert.equal(await models.getByRole('combobox',{name:'GPT-6 Astra default reasoning effort',exact:true}).isEnabled(),true);
 report.metrics.ultraColor=await models.locator('.msx-model-meta [data-top-tier]').first().evaluate(n=>getComputedStyle(n).color);
 await page.screenshot({path:path.join(directory,'models-codex-light.png')});await dark('models-codex-dark.png');
 // Custom endpoint: Base URL, write-only key, model ids fetched from the relay's /v1/models, Save → Restart core.
 await models.getByRole('radio',{name:'Custom endpoint',exact:true}).click();
 const relayBase=`http://127.0.0.1:${server.address().port}/v1`;
 await models.getByRole('textbox',{name:'Endpoint base URL',exact:true}).fill(relayBase);
 await models.getByLabel('Endpoint API key',{exact:true}).fill(RELAY_KEY);
 await models.getByRole('button',{name:'Fetch from endpoint',exact:true}).click();
 await poll(async()=>await models.getByRole('textbox',{name:'Endpoint model ids',exact:true}).inputValue()==='relay-a\nrelay-b','relay models fetched');
 assert.ok(relayCalls.some(call=>call.method==='GET'&&call.url==='/v1/models'&&call.bearer),'Fetch uses the typed key as a Bearer token');
 assert.equal(await models.getByRole('switch',{name:'Web search',exact:true}).getAttribute('aria-checked'),'false','web search starts off');
 assert.match(await models.locator('.msx-callout').innerText(),/only the OpenAI Responses API[\s\S]*custom provider on DeepSeek Harness/);
 await page.screenshot({path:path.join(directory,'models-codex-custom-light.png')});await dark('models-codex-custom-dark.png');
 await models.getByRole('button',{name:'Save',exact:true}).click();
 await models.getByRole('button',{name:'Restart core',exact:true}).waitFor({timeout:20000});
 assert.match(await models.locator('.msx-connection-status').innerText(),/Saved\. Restart the core to apply\./);
 const provider=JSON.parse(await fs.readFile(path.join(profile,'codex/provider.json'),'utf8'));
 assert.deepEqual([provider.mode,provider.baseURL,provider.models,provider.webSearch],['custom',relayBase,['relay-a','relay-b'],false]);
 assert.equal(JSON.stringify(provider).includes(RELAY_KEY),false,'provider.json holds no key');
 assert.equal((await fs.readFile(path.join(profile,'harness/provider-keys.bin'))).includes(RELAY_KEY),false,'the key file is encrypted');
 assert.equal(await models.getByLabel('Endpoint API key',{exact:true}).inputValue(),'','the key field is cleared after saving');
 assert.match(await models.getByLabel('Endpoint API key',{exact:true}).getAttribute('placeholder'),/Saved/);
 assert.equal((await page.content()).includes(RELAY_KEY),false,'the key is never echoed into the page');
 // Remove endpoint puts Codex back on OpenAI (applied at the next restart, so the switches below stay on the fixture).
 await models.getByRole('button',{name:'Remove endpoint',exact:true}).click();
 await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'codex/provider.json'),'utf8')).baseURL==='','endpoint removed');
 await models.getByRole('radio',{name:'OpenAI',exact:true,checked:true}).waitFor();
 report.checks.push('Settings › Models on Codex: OpenAI / Custom endpoint, Codex models with Default, Ultra and Fast; Custom endpoint fetches the relay’s /v1/models with the typed key, saves without echoing it (provider.json keyless, key file encrypted) and offers Restart core; Remove endpoint goes back to OpenAI');
 // Settings copy names the running core (settings-core-copy.mjs): Developer › Local engine and Preferences' account group.
 const developerPage=await openSection('Developer');await developerPage.getByRole('button',{name:'Reconnect',exact:true}).last().waitFor();
 report.metrics.developerCodex=await developerPage.locator('.ss-content').innerText();
 // The copy names the core's real config file: this launch's CODEX_HOME (profile/codex-home), not ~/.codex.
 assert.match(report.metrics.developerCodex,/Codex core[\s\S]*Runs Codex\.[\s\S]*\/codex-home\/config\.toml/);
 assert.equal(/DeepSeek Harness|DeepSeek API key/.test(report.metrics.developerCodex),false,'no DeepSeek Harness copy on Codex');
 await page.screenshot({path:path.join(directory,'developer-codex-light.png')});await dark('developer-codex-dark.png');
 const preferencesPage=await openSection('General');await preferencesPage.getByRole('heading',{name:'Codex account',exact:true}).waitFor();
 assert.equal(await preferencesPage.getByRole('heading',{name:'DeepSeek account',exact:true}).count(),0);
 report.checks.push('On Codex, Developer › Local engine reads “Codex core” / “Runs Codex.” with its CODEX_HOME config.toml and no DeepSeek Harness copy; Preferences shows a “Codex account” group');

 // A choice made on Codex is remembered too: pick GPT-5.5 in the composer, switch to DeepSeek and back.
 await closeSettings();
 await modelTrigger().click();const modelMenu=page.getByRole('menu',{name:'Models',exact:true});await modelMenu.waitFor();
 await modelMenu.locator('[data-model-id="gpt-5.5"]').click();
 await poll(async()=>{const value=await readJson('preferences.json');return value.model==='gpt-5.5'&&value.coreModels?.codex?.model==='gpt-5.5';},'Codex choice recorded');
 await mark();await (await openCores()).locator('[data-core-use=deepseek]').click();
 await poll(async()=>{const value=await readJson('preferences.json');return value.core==='deepseek'&&value.model==='fixture';},'DeepSeek model restored',20000);
 await reloaded('Test model');
 await mark();await (await openCores()).locator('[data-core-use=codex]').click();
 await poll(async()=>{const value=await readJson('preferences.json');return value.core==='codex'&&value.model==='gpt-5.5';},'Codex choice restored',20000);
 await reloaded('GPT-5.5');
 prefs=await readJson('preferences.json');report.metrics.memory={model:prefs.model,coreModels:prefs.coreModels};
 assert.equal(prefs.coreModels?.deepseek?.model,'fixture');
 report.checks.push('Switching cores keeps a default model per core: DeepSeek → Codex saves Codex’s default and keeps “fixture” for DeepSeek; a GPT-5.5 pick on Codex survives a round trip through DeepSeek');

 // Bypass across a core switch. The fixture answers configRequirements/read like the real Codex 0.155.1 ({requirements:null}).
 const policy=requirements=>atom('fixture-settings.json',{'config/read':{config:{sandbox_mode:'workspace-write',approval_policy:'on-request'},origins:{}},'configRequirements/read':{requirements}});await policy(null);
 const log=async file=>{try{return (await fs.readFile(path.join(profile,file),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(e){if(e.code==='ENOENT')return [];throw e;}};
 const turns=async()=>(await log('fixture-requests.jsonl')).filter(x=>x.method==='turn/start'),history=()=>log('fixture-history.jsonl');
 const input=name=>page.getByRole('textbox',{name:`Message ${name}`,exact:true}),trigger=()=>page.getByRole('button',{name:'Permission mode',exact:true});
 const modeMenu=()=>page.getByRole('menu',{name:'Mode',exact:true}),bypassDialog=()=>page.getByRole('alertdialog',{name:'Bypass all permissions?',exact:true});
 const mode=label=>poll(async()=>await trigger().textContent()===label,'mode '+label);
 const pick=async value=>{await trigger().click();await modeMenu().waitFor();await modeMenu().locator(`[data-permission-value="${value}"]`).click();await modeMenu().waitFor({state:'detached'});};
 const confirmBypass=async()=>{await pick('bypass');await bypassDialog().waitFor();await bypassDialog().getByRole('button',{name:'Bypass permissions',exact:true}).click();await bypassDialog().waitFor({state:'detached'});await mode('Bypass permissions');};
 // Straight to main (preload's desktop.call): what init/reconnect hand out, and the IPC-only negatives.
 const desktop=(action,payload)=>page.evaluate(([a,p])=>window.desktop.call(a,p).then(value=>({value}),error=>({error:error.message})),[action,payload]);
 const live=async()=>{const {value}=await desktop('init');return {connectionId:value?.approvalSnapshot?.connectionId,bypassCarry:value?.bypassCarry};};
 const switchTo=async(id,label)=>{await mark();await (await openCores()).locator(`[data-core-use=${id}]`).click();await reloaded(label);};
 const send=async(name,text)=>{const before=(await turns()).length;await fillComposer(page,input(name),text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await poll(async()=>(await turns()).length===before+1,'turn sent');const request=(await turns()).at(-1);await poll(async()=>{const db=await readJson('fixture-threads.json');return db.threads[request.params.threadId]?.turns.at(-1)?.status==='completed';},'fixture completed');await poll(async()=>await trigger().isEnabled(),'composer settled');return request;};
 // (a) Opt-in off: no Bypass entry, and main mints nothing even for a select and reconnect that ask to carry.
 await trigger().click();await modeMenu().waitFor();assert.equal(await modeMenu().locator('[data-permission-value=bypass]').count(),0);
 // On Codex the opt-in is still discoverable from the Mode menu (Claude Desktop's 'Bypass permissions · Enable' row).
 {const enable=modeMenu().locator('[data-permission-action=enable-bypass]');await enable.waitFor();assert.equal(await enable.getAttribute('role'),'menuitem');assert.equal(await enable.locator('.sp-permission-enable-text').textContent(),'Enable');assert.equal(await enable.getAttribute('aria-keyshortcuts'),null);}
 await page.keyboard.press('Escape');await modeMenu().waitFor({state:'detached'});
 assert.equal((await desktop('cores',{op:'select',id:'codex',carryBypass:true})).error,undefined);
 assert.equal((await desktop('reconnect',{carryBypass:true})).value?.bypassCarry,null,'no carry without the opt-in');
 await ready('GPT-5.5',20000);
 await trigger().click();await modeMenu().waitFor();await modeMenu().locator('[data-permission-action=enable-bypass]').click();
 const code=page.getByRole('dialog',{name:'Settings',exact:true});await code.waitFor();assert.equal(await code.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Code',exact:true}).getAttribute('aria-current'),'page','Enable opens Settings › Code');
 const optIn=code.getByRole('switch',{name:'Allow bypass permissions mode',exact:true});await poll(async()=>await code.locator('[data-setting-id=bypass]').evaluate(n=>{const r=n.getBoundingClientRect(),v=n.closest('.ss-content')?.getBoundingClientRect()??{top:0,bottom:innerHeight};return r.top>=v.top-1&&r.bottom<=v.bottom+1;}),'the opt-in row is scrolled into view');
 assert.notEqual((await readJson('preferences.json')).allowBypassPermissions,true,'the Enable row itself changes nothing');
 await poll(async()=>await optIn.isEnabled(),'policy read enables the opt-in');await optIn.click();
 await poll(async()=>(await readJson('preferences.json')).allowBypassPermissions===true,'opt-in saved');await closeSettings();
 const savedPermission=(await readJson('preferences.json')).permission;assert.equal(savedPermission,'auto');
 report.checks.push('Bypass carry: with the opt-in off the Mode menu offers only the Enable row (no Bypass mode) and main hands out no carry even when a select and its reconnect ask for one; Enable opens Settings › Code at the opt-in');
 // DeepSeek → Codex with Bypass confirmed on the DeepSeek draft: the reloaded Codex composer is in Bypass and the first
 // thread/start + turn/start on the new connection are danger-full-access / never.
 await switchTo('deepseek','Test model');await input('DeepSeek').waitFor();await mode('Auto');
 await confirmBypass();const requestsBefore=(await log('fixture-requests.jsonl')).length,historyBefore=(await history()).length;
 await switchTo('codex','GPT-5.5');await input('Codex').waitFor();await mode('Bypass permissions');
 assert.ok((await log('fixture-requests.jsonl')).slice(requestsBefore).some(x=>x.method==='configRequirements/read'),'the switch reads the new core’s requirements before carrying');
 await poll(async()=>(await live()).bypassCarry===null,'the reloaded page consumed the carry');
 await page.screenshot({path:path.join(directory,'bypass-carried-codex-light.png')});await dark('bypass-carried-codex-dark.png');
 const carried=await send('Codex','fixture:complete carried-bypass');
 assert.equal(carried.params.approvalPolicy,'never');assert.equal(carried.params.approvalsReviewer,'user');assert.deepEqual(carried.params.sandboxPolicy,{type:'dangerFullAccess'});
 const carriedStart=(await history()).slice(historyBefore).find(x=>x.method==='thread/start'&&x.params.threadId===carried.params.threadId);
 assert.equal(carriedStart?.params.sandbox,'danger-full-access');assert.equal(carriedStart.params.approvalPolicy,'never');
 prefs=await readJson('preferences.json');assert.equal(prefs.allowBypassPermissions,true);/* source-bypass-permission confirm(): a confirmed Bypass is the remembered mode (preference 'permission'), like any other mode. */assert.equal(prefs.permission,'bypass','a confirmed Bypass is remembered');
 report.metrics.bypassCarry={threadStart:{sandbox:carriedStart.params.sandbox,approvalPolicy:carriedStart.params.approvalPolicy},turnStart:{sandboxPolicy:carried.params.sandboxPolicy,approvalPolicy:carried.params.approvalPolicy}};
 // Consume-once: reloading the window afterwards starts from the saved default.
 await mark();await page.reload();await reloaded('GPT-5.5');await mode('Bypass permissions');assert.equal((await live()).bypassCarry,null);
 // Picking another mode replaces the remembered Bypass.
 await pick('auto');await mode('Auto');await poll(async()=>(await readJson('preferences.json')).permission===savedPermission,'Auto remembered again');
 report.checks.push('Bypass carry: Bypass confirmed on DeepSeek survives Use Codex (requirements read first); the reloaded “Message Codex” composer shows Bypass permissions and the next thread/start + turn/start send danger-full-access / dangerFullAccess / never; the confirmed Bypass is the remembered mode, so a later window reload stays in Bypass until another mode is picked');
 // (d) A plain Reconnect (Settings › Developer) hands out no carry; the remembered Bypass itself survives it.
 await confirmBypass();const {connectionId:beforeReconnect}=await live();
 const developer=await openSection('Developer');await developer.getByRole('button',{name:'Reconnect',exact:true}).last().click();
 await poll(async()=>{const id=(await live()).connectionId;return typeof id==='string'&&id!==beforeReconnect;},'reconnected',20000);
 await poll(async()=>await developer.getByRole('button',{name:'Reconnect',exact:true}).last().isEnabled(),'reconnect settled');await closeSettings();
 await mode('Bypass permissions');assert.equal((await live()).bypassCarry,null);await pick('auto');await mode('Auto');
 // (b) A core whose requirements refuse Bypass gets nothing carried, and even the remembered Bypass reads as Auto there
 // (main.jsx bypassRefusal), with the Mode menu's managed 'Disabled by your organization' row instead of Bypass.
 await confirmBypass();await policy({allowedSandboxModes:['workspace-write','read-only'],allowedApprovalPolicies:['on-request','untrusted']});
 await switchTo('deepseek','Test model');await input('DeepSeek').waitFor();await mode('Auto');assert.equal((await live()).bypassCarry,null);assert.equal((await readJson('preferences.json')).permission,'bypass','the remembered mode is kept for cores that allow it');
 await trigger().click();await modeMenu().waitFor();assert.equal(await modeMenu().locator('[data-permission-value=bypass]').count(),0);await modeMenu().locator('[data-permission-action=bypass-blocked]').waitFor();await page.keyboard.press('Escape');await modeMenu().waitFor({state:'detached'});
 await policy(null);await switchTo('codex','GPT-5.5');await mode('Bypass permissions');await pick('auto');await mode('Auto');
 // (c) A failed select drops the token a successful one minted, so a later reconnect (even one asking to carry) restores nothing.
 await confirmBypass();
 const missing=(await desktop('cores',{op:'list'})).value?.cores?.find(core=>!core.installed&&!core.selected);assert.ok(missing,'a core that isn’t installed');
 assert.equal((await desktop('cores',{op:'select',id:'codex',carryBypass:true})).error,undefined,'a successful select mints the token');
 assert.ok((await desktop('cores',{op:'select',id:missing.id,carryBypass:true})).error,`selecting ${missing.id} fails`);
 assert.equal((await desktop('reconnect',{carryBypass:true})).value?.bypassCarry,null,'the failed select left nothing for the restart');
 await ready('GPT-5.5',20000);/* the remembered Bypass, not a carry */await mode('Bypass permissions');await pick('auto');await mode('Auto');assert.equal((await readJson('preferences.json')).core,'codex');
 report.checks.push('Bypass carry negatives: a plain Reconnect carries nothing (the remembered Bypass survives it), a core whose requirements refuse danger-full-access gets nothing and shows Auto with the managed row, and a failed select followed by a core restart carries nothing');
 // (e) The carry lands only in the folder Bypass was confirmed in. config.cwd moves to another folder behind the renderer
 // (as a sidebar project or an opened session leaves the renderer's folder unsaved), Bypass is confirmed on the draft in
 // the workspace, and the switch reload opens the draft in config.cwd: Auto, and main drops the carry. Confirmed there
 // instead, it carries.
 const elsewhere=path.join(profile,'elsewhere');await fs.mkdir(elsewhere,{recursive:true});
 const savedFolder=async dir=>{await app.evaluate(({dialog},dir)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[dir]});},dir);assert.equal((await desktop('folder',{})).value,dir);await poll(async()=>(await readJson('preferences.json')).cwd===dir,'folder saved');};
 await savedFolder(elsewhere);await confirmBypass();const mismatchBefore=(await log('fixture-requests.jsonl')).length;
 await switchTo('deepseek','Test model');await input('DeepSeek').waitFor();/* the remembered Bypass still applies */await mode('Bypass permissions');
 assert.ok((await log('fixture-requests.jsonl')).slice(mismatchBefore).some(x=>x.method==='configRequirements/read'),'the switch did carry (requirements read) for the workspace');
 await poll(async()=>(await live()).bypassCarry===null,'the carry for another folder was dropped, not applied');await pick('auto');await mode('Auto');
 await confirmBypass();await switchTo('codex','GPT-5.5');await input('Codex').waitFor();await mode('Bypass permissions');
 await poll(async()=>(await live()).bypassCarry===null,'the carry for this folder was applied once');
 await savedFolder(workspace);
 report.checks.push('Bypass carry scope: confirmed on a draft in the workspace while the saved folder is elsewhere, a switch reloads into the saved folder and drops the carry (only the remembered Bypass applies there); confirmed in the folder the reload opens, it carries');

 // Update: once this build pins a newer release (the manifest says 0.155.2), the downloaded Codex shows “Update available”
 // and an Update button; updating the running core swaps the copy in place and reconnects onto it.
 await fs.writeFile(manifest,JSON.stringify({url:`http://127.0.0.1:${server.address().port}/codex.tar.gz`,version:'0.155.2',sha256,size:bytes.length}));
 const updating=await openCores();
 await poll(async()=>/Update available: 0\.155\.2/.test(await updating.locator('[data-core-status=codex]').textContent()),'update offered');
 await updating.locator('[data-core-update=codex]').click();
 const updateDialog=page.getByRole('dialog',{name:'Update Codex to 0.155.2?',exact:true});await updateDialog.waitFor();
 report.metrics.updateDialog=await updateDialog.innerText();assert.match(report.metrics.updateDialog,/Codex restarts on the new version once it is installed\./);
 const {connectionId:beforeUpdate}=await live();
 await updateDialog.getByRole('button',{name:'Update',exact:true}).click();await updateDialog.waitFor({state:'detached'});
 await poll(async()=>(await readJson('cores/codex/manifest.json')).version==='0.155.2','updated',30000);
 assert.equal(fsSync.existsSync(path.join(profile,'cores/codex/0.155.1')),false,'the old copy is gone');
 await poll(async()=>{const id=(await live()).connectionId;return typeof id==='string'&&id!==beforeUpdate;},'reconnected onto the update',20000);
 await poll(async()=>!/Update available/.test(await updating.locator('[data-core-status=codex]').textContent()),'no update left');
 await page.screenshot({path:path.join(directory,'cores-updated-light.png')});await dark('cores-updated-dark.png');
 await closeSettings();
 report.checks.push('A newer pinned release shows “Update available” and Update on the downloaded Codex; updating the running core asks first, swaps the copy in place and reconnects');

 // A relaunch keeps Codex. Remove download on the running Codex asks first, then stops it and switches to the DeepSeek core
 // (no other Codex exists), reloading for the DeepSeek copy.
 await app.close();app=null;await launch('GPT-5.5');const again=await openCores();await again.locator('[data-core-status=codex]').waitFor();
 assert.match(await again.evaluate(n=>n.innerText),/Codex[\s\S]*Running/);
 await again.locator('[data-core-remove=codex]').click();
 const removeDialog=page.getByRole('dialog',{name:'Remove the Codex download?',exact:true});await removeDialog.waitFor();
 report.metrics.removeDialog=await removeDialog.innerText();assert.match(report.metrics.removeDialog,/Codex is running\. It stops, and OpenClaude Desktop switches to DeepSeek Harness\./);
 await page.screenshot({path:path.join(directory,'cores-remove-running-light.png')});await dark('cores-remove-running-dark.png');
 await mark();await removeDialog.getByRole('button',{name:'Remove download',exact:true}).click();
 await poll(async()=>!fsSync.existsSync(path.join(profile,'cores/codex')),'removed');
 await reloaded('Test model');
 report.metrics.afterRemove=(await readJson('preferences.json')).core;assert.equal(report.metrics.afterRemove,'deepseek');
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).waitFor();
 const afterCores=await openCores();await afterCores.locator('[data-core-status=deepseek]').waitFor();assert.match(await afterCores.evaluate(n=>n.innerText),/DeepSeek Harness[\s\S]*Running/);
 report.checks.push('Relaunch keeps Codex; Remove download on the running Codex asks first, deletes the copy, and the app reconnects onto the DeepSeek core and reloads');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();server.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'cores-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
