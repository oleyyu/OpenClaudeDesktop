// Settings › Account for a bridge core (account-settings-model.mjs plan 'bridge', core descriptor `login`): the fixture
// core reports engine "zcode", so the page offers ZCode's browser sign-ins and API key types; saving a key sends
// account/login/start {type: "apiKey", apiKey, codeDesktop: {template}}. The sidebar names the core, not "DeepSeek API".
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'bridge-account-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true});
await atom('fixture-core.json',{engine:'zcode',capabilities:{}});
await fs.writeFile(path.join(profile,'account-fixture.marker'),'isolated-account-test\n');
await atom('fixture-account.json',{'account/read':{result:{account:null,requiresOpenaiAuth:false}},'account/login/start':{result:{type:'apiKey'}},'account/logout':{result:{}}});
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs'),CODE_DESKTOP_CORE_SYSTEM_PATHS:''};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/bridge-account-ui-test.mjs','tests/fixtures/codex-server.cjs','tests/fixtures/account-fixture.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
const requests=async()=>{try{return (await fs.readFile(path.join(profile,'fixture-account-requests.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch{return [];}};
try{
 await integrity();
 app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,860));await page.waitForFunction(()=>document.querySelector('[data-cds=ChatComposer]'));
 // The sidebar footer names the running core.
 await poll(async()=>/ZCode/.test(await page.locator('.sidebar, [data-sidebar], aside').first().innerText()),'sidebar names ZCode');
 report.checks.push('The sidebar account footer names the running core (ZCode), not "DeepSeek API"');
 await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByText('Sign in with GLM Coding Plan (Z.ai)',{exact:true}).waitFor();
 report.metrics.rows=await settings.locator('[data-setting-id^=signin-], [data-setting-id=apikey], [data-setting-id=account]').evaluateAll(list=>list.map(n=>n.getAttribute('data-setting-id')));
 assert.deepEqual(report.metrics.rows,['account','signin-zai','signin-bigmodel','apikey']);
 assert.equal(await settings.getByRole('button',{name:'Use device code'}).count(),0,'no ChatGPT device code on a bridge core');
 await settings.locator('[data-setting-id=apikey]').scrollIntoViewIfNeeded();await new Promise(r=>setTimeout(r,500));
 await page.screenshot({path:path.join(directory,'account-bridge.png')});
 report.checks.push('Settings shows ZCode’s own sign-in options (two browser sign-ins, an API key with key types) and no ChatGPT device code');
 await settings.getByRole('combobox',{name:'Key type',exact:true}).click();await page.getByRole('option',{name:'Z.ai API key',exact:true}).click();
 await settings.getByRole('textbox',{name:'API key',exact:true}).fill('zai-test-key');
 await settings.getByRole('button',{name:'Save key',exact:true}).click();
 await poll(async()=>(await requests()).some(r=>r.method==='account/login/start'),'key sent');
 const sent=(await requests()).find(r=>r.method==='account/login/start');
 assert.deepEqual(sent.params,{type:'apiKey',apiKey:'zai-test-key',codeDesktop:{template:'zai-standard-api'}});
 await poll(async()=>await settings.getByRole('textbox',{name:'API key',exact:true}).inputValue()==='','field cleared after saving');
 report.checks.push('Saving a key sends account/login/start {type:"apiKey", apiKey, codeDesktop:{template}} with the chosen key type and clears the field');
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await page.screenshot({path:path.join(directory,'account-bridge-dark.png')});
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'bridge-account-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
