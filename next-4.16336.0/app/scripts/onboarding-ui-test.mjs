// First-run setup (src/source-onboarding.jsx) in the real app, isolated: the fixture core reports the DeepSeek
// engine with no key at all, so setup opens by itself; a local HTTP server stands in for a vendor endpoint so the
// connection test, Fetch models and saving a custom provider run for real without the network.
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'onboarding-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
// core:'codex' stands for an earlier Choose your agent pick that was selected but never started (audit 94): finishing
// Connect a model must select DeepSeek Harness again. The fixture still reports the DeepSeek engine (CODEX_BINARY).
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],core:'codex'});
await atom('fixture-core.json',{engine:'deepseek-harness',capabilities:{}});
await atom('fixture-usage.json',{'account/read':{result:{account:null,requiresOpenaiAuth:false,deepseek:{apiKey:{configured:false,source:null},platform:null,links:null}}}});
// The stand-in vendor: Anthropic Messages with x-api-key auth, like the core's client.
const vendorCalls=[];
const vendor=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;vendorCalls.push({method:req.method,url:req.url,key:req.headers['x-api-key']||null,bearer:req.headers.authorization||null,body:raw?JSON.parse(raw):null});
 const json=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 if(req.headers['x-api-key']!=='test-key')return json(401,{type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}});
 if(req.method==='GET'&&req.url==='/anthropic/v1/models')return json(200,{data:[{id:'vendor-a'},{id:'vendor-b'}]});
 if(req.method==='POST'&&req.url==='/anthropic/v1/messages')return json(200,{id:'msg_1',type:'message',role:'assistant',content:[{type:'text',text:'p'}],stop_reason:'max_tokens',usage:{input_tokens:1,output_tokens:1}});
 json(404,{error:{message:'not found'}});});
await new Promise(r=>vendor.listen(0,'127.0.0.1',r));const vendorURL=`http://127.0.0.1:${vendor.address().port}/anthropic`;
const env={...process.env,CODE_DESKTOP_CORE_SYSTEM_PATHS:'',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;delete env.DEEPSEEK_API_KEY;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/onboarding-ui-test.mjs','tests/fixtures/codex-server.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
const readJson=file=>fs.readFile(path.join(profile,file),'utf8').then(JSON.parse);
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,820));await page.waitForFunction(()=>innerWidth===1324&&innerHeight===820);}
try{
 await integrity();await launch();
 const setup=()=>page.getByRole('dialog',{name:'Set up OpenClaude Desktop',exact:true});
 // 1. Welcome opens by itself on a keyless DeepSeek core.
 await setup().waitFor();await page.getByRole('button',{name:'Get started',exact:true}).waitFor();
 report.metrics.welcome=await setup().evaluate(n=>{const r=s=>n.querySelector(s)?.getBoundingClientRect();const title=n.querySelector('.sob-title');return {title:title.textContent,titleFont:getComputedStyle(title).fontSize,titleFamily:getComputedStyle(title).fontFamily,spark:r('.sob-spark')?.width,bottomGap:innerHeight-r('.sob-bottom').bottom,buttonHeight:r('.sob-bottom button').height,bottomWidth:r('.sob-bottom').width};});
 assert.equal(report.metrics.welcome.title,'OpenClaude Desktop');assert.equal(report.metrics.welcome.titleFont,'30px');assert.equal(report.metrics.welcome.spark,64);assert.equal(Math.round(report.metrics.welcome.bottomGap),48);assert.ok(report.metrics.welcome.bottomWidth<=448);
 await page.screenshot({path:path.join(directory,'welcome-light.png')});
 report.checks.push('Setup opens by itself on a DeepSeek core with no key: 64px spark, 30px serif title, bottom-pinned 448px button stack 48px from the bottom');

 // 2. Connect: Quick setup fills official endpoints; DeepSeek first.
 await page.getByRole('button',{name:'Get started',exact:true}).click();
 // Choose your agent: DeepSeek Harness (built in) is preselected; Codex offers its pinned release.
 await page.getByRole('heading',{name:'Choose your agent',exact:true}).waitFor();
 await poll(async()=>await setup().locator('[data-core-status=codex]').count()===1,'agents listed');
 assert.equal(await setup().locator('[data-core=deepseek]').getAttribute('aria-checked'),'true');
 assert.match(await setup().locator('[data-core-status=codex]').textContent(),/\d+ MB download/);
 await page.screenshot({path:path.join(directory,'choose-agent.png')});
 // Continue stays in view however long the agent list is (sticky actions), and the next step opens at its top with its heading focused.
 report.metrics.agentContinue=await page.evaluate(()=>{const shell=document.querySelector('.sob-shell');shell.scrollTop=0;const button=document.querySelector('.sob-agent-actions .sob-wide').getBoundingClientRect();const box=shell.getBoundingClientRect();shell.scrollTop=shell.scrollHeight;return {inView:button.bottom<=box.bottom+0.5,scrolled:shell.scrollTop};});
 assert.equal(report.metrics.agentContinue.inView,true,'Continue is visible without scrolling');
 await page.getByRole('button',{name:'Continue with DeepSeek Harness',exact:true}).click();
 await page.getByRole('heading',{name:'Connect a model',exact:true}).waitFor();
 report.metrics.connectOpen=await page.evaluate(()=>({scrollTop:document.querySelector('.sob-shell').scrollTop,focus:document.activeElement?.textContent}));
 assert.deepEqual(report.metrics.connectOpen,{scrollTop:0,focus:'Connect a model'},'Connect a model opens at its top with its heading focused');
 const card=()=>setup().locator('.sob-card'),field=label=>card().getByLabel(label,{exact:true});
 assert.equal(await card().getByRole('radio',{name:/^DeepSeek/}).getAttribute('aria-checked'),'true');
 assert.equal(await field('API base URL').inputValue(),'https://api.deepseek.com/anthropic');assert.equal(await field('Model').inputValue(),'deepseek-v4-pro');
 await card().getByRole('radio',{name:/^Kimi/}).click();
 assert.equal(await field('API base URL').inputValue(),'https://api.moonshot.cn/anthropic');assert.equal(await field('Model').inputValue(),'kimi-k3');
 assert.deepEqual(await card().locator('.sob-chip').allTextContents(),['kimi-k3','kimi-k2.7-code','kimi-k2.7-code-highspeed']);
 await card().getByRole('combobox',{name:'Region or plan',exact:true}).click();await page.getByRole('option',{name:'International (moonshot.ai)',exact:true}).click();
 await poll(async()=>await field('API base URL').inputValue()==='https://api.moonshot.ai/anthropic','intl variant');
 report.metrics.card=await card().evaluate(n=>({width:n.getBoundingClientRect().width,radius:getComputedStyle(n).borderRadius,padding:getComputedStyle(n).padding,border:getComputedStyle(n).borderTopWidth}));
 assert.equal(report.metrics.card.radius,'32px');assert.equal(report.metrics.card.padding,'28px');assert.ok(report.metrics.card.width<=560);
 await page.screenshot({path:path.join(directory,'connect-kimi.png')});
 report.checks.push('Quick setup fills the vendor’s official endpoint and models (DeepSeek default, Kimi China, then International via Region or plan); card 32px radius, 28px padding');

 // 3. Custom endpoint: a wrong key fails the 1-token test with the endpoint's answer; Fetch models lists its ids.
 await card().getByRole('radio',{name:/^Custom/}).click();
 await field('API base URL').fill(vendorURL);await field('API key').fill('wrong-key');await field('Model').fill('vendor-a');
 await card().getByRole('button',{name:'Test and continue',exact:true}).click();
 await card().getByRole('alert').waitFor();report.metrics.wrongKey=await card().getByRole('alert').textContent();assert.match(report.metrics.wrongKey,/Connection test failed: 401: invalid x-api-key/);
 assert.equal(vendorCalls.at(-1).key,'wrong-key');assert.equal(vendorCalls.at(-1).bearer,null,'Anthropic Messages authenticates with x-api-key only');assert.deepEqual(vendorCalls.at(-1).body.max_tokens,1);
 await field('API key').fill('test-key');await card().getByRole('button',{name:'Fetch models',exact:true}).click();
 await poll(async()=>(await card().locator('.sob-chip').allTextContents()).join()==='vendor-a,vendor-b','fetched models');
 await card().locator('.sob-chip',{hasText:'vendor-b'}).click();assert.equal(await field('Model').inputValue(),'vendor-b');
 await card().getByRole('button',{name:'Advanced setup',exact:true}).click();await field('Provider id').fill('Local Test!');assert.equal(await field('Provider id').inputValue(),'local-test-');await field('Provider id').fill('local-test');await field('Display name').fill('Local vendor');
 await page.screenshot({path:path.join(directory,'connect-custom-advanced.png')});
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await page.screenshot({path:path.join(directory,'connect-custom-dark.png')});await page.evaluate(()=>{document.documentElement.dataset.mode='light';});
 report.checks.push('A wrong key fails the real 1-token x-api-key test with the endpoint’s 401 message; Fetch models lists the endpoint’s ids; Advanced setup sanitizes the provider id');

 // 4. Test and continue saves the provider (key encrypted, never in providers.json), restarts the core and closes setup.
 const before=vendorCalls.length;
 await card().getByRole('button',{name:'Test and continue',exact:true}).click();
 await setup().waitFor({state:'detached',timeout:20000});
 assert.ok(vendorCalls.slice(before).some(call=>call.method==='POST'&&call.key==='test-key'&&call.body.model==='vendor-b'));
 const providers=await readJson('harness/providers.json');assert.deepEqual(providers.providers,[{route:'local-test',displayName:'Local vendor',api:'anthropic-messages',baseURL:vendorURL,models:['vendor-b']}]);
 assert.equal(JSON.stringify(providers).includes('test-key'),false);await fs.stat(path.join(profile,'harness/provider-keys.bin'));
 assert.equal((await fs.readFile(path.join(profile,'harness/provider-keys.bin'))).includes('test-key'),false,'the key file is encrypted');
 await poll(async()=>(await readJson('preferences.json')).onboarded===true,'onboarded saved');
 // connect() reconciles the saved model against the running core's catalog (the fixture lists fixture, fixture-1…5) and
 // remembers it per core; the picked vendor-b isn't listed by the fixture, so the saved model stays a listed one.
 const saved=await readJson('preferences.json');report.metrics.savedModel={model:saved.model,effort:saved.effort,coreModels:saved.coreModels};
 assert.ok(['fixture',...Array.from({length:5},(_,i)=>`fixture-${i+1}`)].includes(saved.model),`saved model ${saved.model} is in the catalog`);
 assert.equal(saved.coreModels?.deepseek?.model,saved.model,'the DeepSeek core remembers it');
 assert.equal(saved.core,'deepseek','finishing Connect a model selects DeepSeek Harness over the core an earlier pick left selected');
 // The window started naming the core that pick left ("Codex") and reloads for DeepSeek's copy.
 await page.waitForFunction(()=>document.querySelector('[data-cds=ChatComposer]'),null,{timeout:20000});
 await poll(async()=>await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).count()===1,'composer names DeepSeek after the reload');
 assert.equal(await setup().count(),0,'setup stays closed after the reload');
 report.checks.push('Test and continue saves the custom provider (providers.json without the key, encrypted key file), selects DeepSeek Harness over a core an earlier pick left selected, restarts the core and closes setup; onboarded persists and the saved model is one the running catalog lists, remembered for the DeepSeek core');

 // 5. Relaunch: setup stays closed; Settings › Models offers Quick setup, which opens on the connect step.
 await app.close();app=null;await launch();
 await page.waitForFunction(()=>document.querySelector('[data-cds=ChatComposer]'));await new Promise(r=>setTimeout(r,800));assert.equal(await setup().count(),0);
 await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Models',exact:true}).click();
 await settings.getByRole('button',{name:'Quick setup…',exact:true}).click();await setup().waitFor();await page.getByRole('heading',{name:'Connect a model',exact:true}).waitFor();
 await card().getByRole('button',{name:'Back',exact:true}).click();await setup().waitFor({state:'detached'});
 report.checks.push('After setup it never opens by itself again; Settings › Models › Quick setup… opens it on Connect, and Back closes it');
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();vendor.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'onboarding-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
