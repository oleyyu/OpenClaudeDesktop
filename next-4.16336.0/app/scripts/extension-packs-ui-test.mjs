// Extension Packs (extension-packs.cjs, source-extension-import.jsx) in the real app, isolated. First run: Choose your
// agent → Import extension pack… (CODE_DESKTOP_PICK_PACK stands in for the picker) → the confirmation (what it is,
// that it runs code) → Add pack → the pack's core is listed and selected → Download and continue fetches its agent
// from the release the manifest names (a loopback server here), checks the checksum, chooses the core and restarts the
// connection; setup closes. Then Settings › Cores lists the pack and removing it falls back to the DeepSeek core.
// Kimi Code is a built-in core now (cores/kimi.mjs), so the fixture pack overrides it by id (core-registry allCores):
// removing the pack leaves the built-in Kimi Code listed.
// The connection itself stays on the fixture (CODEX_BINARY wins), so no pack code is run by this suite.
import fs from 'node:fs/promises';import fsSync from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'extension-packs-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[]});
await atom('fixture-core.json',{engine:'deepseek-harness',capabilities:{}});
await atom('fixture-usage.json',{'account/read':{result:{account:null,requiresOpenaiAuth:false,deepseek:{apiKey:{configured:false,source:null},platform:null,links:null}}}});
// The agent release the pack names: kimi-aarch64-apple-darwin answering --version.
const stage=path.join(directory,'release');await fs.mkdir(stage);
await fs.writeFile(path.join(stage,'kimi-aarch64-apple-darwin'),'#!/bin/sh\necho "kimi-code 2.1.0"\n',{mode:0o755});
const tarball=path.join(directory,'kimi.tar.gz');execFileSync('tar',['-czf',tarball,'-C',stage,'kimi-aarch64-apple-darwin']);
const bytes=await fs.readFile(tarball),sha256=createHash('sha256').update(bytes).digest('hex');
const server=http.createServer((req,res)=>{if(req.url!=='/kimi-aarch64-apple-darwin.tar.gz'){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-length':bytes.length});res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
// The pack: manifest + bridge (never run here).
const pack=path.join(directory,'kimi-pack');await fs.mkdir(path.join(pack,'bridge/bin'),{recursive:true});
await fs.writeFile(path.join(pack,'bridge/bin/app-server.mjs'),'#!/usr/bin/env node\n// fixture bridge\n');
await fs.writeFile(path.join(pack,'README.md'),'# Kimi Code pack (fixture)\n');
await fs.writeFile(path.join(pack,'manifest.json'),JSON.stringify({format:1,version:'0.3.0',description:'Kimi Code, Moonshot’s open-source coding agent, in OpenClaude Desktop.',core:{id:'kimi',name:'Kimi Code',vendor:'Moonshot',engine:'kimi',kind:'bridge',
 models:'Kimi models',license:'MIT',bridge:{script:'bridge/bin/app-server.mjs'},implies:{customization:true,toolSelection:true,permissionHints:true},
 agent:{binary:'kimi',systemPaths:[],release:{type:'tar.gz',version:'2.1.0',tag:'v2.1.0',url:`http://127.0.0.1:${server.address().port}/{name}`,assets:{arm64:{name:'kimi-aarch64-apple-darwin.tar.gz',size:bytes.length,sha256},x64:{name:'kimi-aarch64-apple-darwin.tar.gz',size:bytes.length,sha256}}}}}},null,2));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs'),CODE_DESKTOP_CORE_SYSTEM_PATHS:'',CODE_DESKTOP_PICK_PACK:pack};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/extension-packs-ui-test.mjs','tests/fixtures/codex-server.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
const readJson=file=>fs.readFile(path.join(profile,file),'utf8').then(JSON.parse);
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,900));}
try{
 await integrity();await launch();
 const setup=page.getByRole('dialog',{name:'Set up OpenClaude Desktop',exact:true});await setup.waitFor();
 await page.getByRole('button',{name:'Get started',exact:true}).click();await page.getByRole('heading',{name:'Choose your agent',exact:true}).waitFor();
 // The built-in DeepSeek core; Codex is an Extension Pack, so a fresh setup has no Codex card until it is added.
 await poll(async()=>await setup.locator('[data-core=deepseek]').count()===1,'built-in agent listed');
 assert.equal(await setup.locator('[data-core=codex]').count(),0,'no Codex card before its pack is added');
 // Every built-in core is adapted (no Coming soon cards); Kimi Code is offered with its logo before any pack.
 await poll(async()=>await setup.locator('[data-core=kimi] .sbl-mark svg').count()===1,'Kimi Code is a built-in card with its logo');
 assert.equal(await setup.locator('[data-core-soon]').count(),0,'no Coming soon cards');
 assert.equal(await setup.locator('[data-core=deepseek] .sbl-mark svg').count(),1,'DeepSeek card shows its logo');
 assert.deepEqual((await setup.locator('[data-core]').evaluateAll(list=>list.map(n=>n.dataset.core)))[0],'deepseek');
 // Import: the confirmation says what the pack is and that it runs code.
 await setup.getByRole('button',{name:'Import extension pack…',exact:true}).click();
 const confirm=page.getByRole('dialog',{name:'Add Kimi Code?',exact:true});await confirm.waitFor();
 report.metrics.confirm=await confirm.innerText();
 for(const text of ['Moonshot','0.3.0','MIT','customization','toolSelection','runs code on your Mac','downloads kimi from the release this pack names'])assert.ok(report.metrics.confirm.includes(text),text);
 await page.screenshot({path:path.join(directory,'import-confirm.png')});
 assert.equal(fsSync.existsSync(path.join(profile,'extensions')),false,'nothing installed before Add pack');
 await confirm.getByRole('button',{name:'Add pack',exact:true}).click();await confirm.waitFor({state:'detached'});
 await poll(async()=>await setup.locator('[data-core=kimi]').getAttribute('aria-checked')==='true','imported core listed and selected');
 assert.match(await setup.locator('[data-core-status=kimi]').textContent(),/\d+ MB download/);
 assert.equal(await setup.locator('[data-core=kimi] .sbl-mark svg').count(),1,'a pack without a logo keeps the built-in Kimi logo');
 assert.ok(fsSync.existsSync(path.join(profile,'extensions/kimi/manifest.json')));
 await page.screenshot({path:path.join(directory,'choose-agent-with-pack.png')});
 report.checks.push('Setup › Choose your agent imports a pack: the confirmation shows maker, version, license, capabilities, the runs-code warning and the agent download; Add pack installs it and selects its core');
 // Download and continue: the agent from the manifest's release, checksum-checked; the core is chosen; setup closes.
 // The connection stays on the fixture (CODEX_BINARY wins); from the restart on it answers as the Kimi engine with an
 // account, as a signed-in Kimi bridge would, so the window reloads for Kimi's copy and setup finishes there.
 await atom('fixture-core.json',{engine:'kimi',capabilities:{}});
 await atom('fixture-usage.json',{'account/read':{result:{account:{type:'apiKey'},requiresOpenaiAuth:false}}});
 await page.getByRole('button',{name:'Download Kimi Code and continue',exact:true}).click();
 await setup.waitFor({state:'detached',timeout:20000});
 const record=await readJson('cores/kimi/manifest.json');assert.deepEqual([record.version,record.reported,record.sha256],['2.1.0','kimi-code 2.1.0',sha256]);
 await poll(async()=>{const prefs=await readJson('preferences.json');return prefs.core==='kimi'&&prefs.onboarded===true;},'Kimi chosen and setup finished');
 await page.getByRole('textbox',{name:'Message Kimi',exact:true}).waitFor({timeout:20000});
 assert.equal(await setup.count(),0,'setup stays closed after the reload');
 report.checks.push('Download and continue fetches the pack agent from its release (checksum checked), chooses the core, restarts the connection, reloads for the Kimi copy and finishes setup');
 // Settings › Cores: the pack and its core; removing the pack falls back to DeepSeek Harness.
 await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Cores',exact:true}).click();
 await settings.locator('[data-core-status=kimi]').waitFor();
 report.metrics.cores=await settings.evaluate(n=>n.innerText.slice(n.innerText.indexOf('Agent cores')));
 assert.match(report.metrics.cores,/Kimi Code[\s\S]*(Running|Selected)[\s\S]*Downloaded by OpenClaude Desktop · 2\.1\.0/);assert.match(report.metrics.cores,/Extension packs[\s\S]*Kimi Code[\s\S]*0\.3\.0/);
 await page.screenshot({path:path.join(directory,'settings-cores-pack.png')});
 // The pack runs the current core, so Remove asks first; the app then restarts on DeepSeek Harness (the fixture answers
 // as it again) and reloads for its copy.
 await atom('fixture-core.json',{engine:'deepseek-harness',capabilities:{}});
 await settings.getByRole('button',{name:'Remove',exact:true}).click();
 const removeConfirm=page.getByRole('dialog',{name:'Remove the Kimi Code pack?',exact:true});await removeConfirm.waitFor();
 await removeConfirm.getByRole('button',{name:'Remove',exact:true}).click();
 await poll(async()=>!fsSync.existsSync(path.join(profile,'extensions/kimi')),'pack removed');
 await poll(async()=>(await readJson('preferences.json')).core==='deepseek','choice falls back');
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).waitFor({timeout:20000});
 if(!await settings.count()){await page.keyboard.press('Meta+,');await settings.waitFor();}
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Cores',exact:true}).click();
 await settings.getByText('No extension packs yet',{exact:true}).waitFor();
 await settings.locator('[data-core-status=kimi]').waitFor();
 assert.equal(await settings.locator('[data-core-status=kimi]').count(),1,'the built-in Kimi Code stays listed');
 report.checks.push('Settings › Cores lists the pack and its downloaded agent; removing the pack empties the pack list, keeps the built-in Kimi Code core and falls back to DeepSeek Harness');
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await page.screenshot({path:path.join(directory,'settings-cores-dark.png')});
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();server.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'extension-packs-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
