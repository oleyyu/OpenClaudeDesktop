// Per-session tools and tool profiles (prefs/tool-profiles.mjs, harness tool-gate.js) in the real app against the
// fixture core advertising capabilities.toolSelection: Add › Tools switches the draft's and an open session's
// tools, thread/start and turn/start carry them, Settings › Profiles creates a default profile a new session starts with.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),evidence=path.join(project,'analysis/batch-20260920');
const directory=await fs.mkdtemp(path.join(evidence,'tool-profiles-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
const atom=async(file,value)=>{const p=path.join(profile,file);await fs.writeFile(p+'.tmp',JSON.stringify(value));await fs.rename(p+'.tmp',p);};
await atom('preferences.json',{cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[]});
await atom('fixture-core.json',{capabilities:{toolSelection:true}});
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
let testHashes;const testSources=['scripts/tool-profiles-ui-test.mjs','scripts/composer-test-helpers.mjs','tests/fixtures/codex-server.cjs'];
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);const hashes=Object.fromEntries(await Promise.all(testSources.map(async file=>[file,sha(await fs.readFile(path.join(root,file)))])));if(testHashes)assert.deepEqual(hashes,testHashes);else testHashes=hashes;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],rendererErrors:[],metrics:{},passed:false};let app,page;
const poll=async(fn,label)=>{const end=Date.now()+10000;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+label);};
const readJson=file=>fs.readFile(path.join(profile,file),'utf8').then(JSON.parse);
const log=async file=>{try{return (await fs.readFile(path.join(profile,file),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(e){if(e.code==='ENOENT')return [];throw e;}};
const turns=async()=>(await log('fixture-requests.jsonl')).filter(x=>x.method==='turn/start');
const starts=async()=>(await log('fixture-history.jsonl')).filter(x=>x.method==='thread/start');
async function launch(){app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push(e.message));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324&&innerHeight===768);await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled')&&document.querySelector('[aria-label="Model"]')?.textContent.includes('Test model');});}
try{
 await integrity();await launch();
 const input=()=>page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });
 const toolsMenu=()=>page.getByRole('menu',{name:'Tools',exact:true});
 const openTools=async()=>{await page.getByRole('button',{name:'Add',exact:true}).click();const trigger=page.getByTestId('add-tools');await trigger.waitFor();await trigger.click();await toolsMenu().waitFor();await poll(async()=>await toolsMenu().getByRole('menuitemcheckbox',{name:'write',exact:true}).count()===1,'tool rows loaded');};
 const closeMenus=async()=>{for(let i=0;i<3&&await page.getByRole('menu').count();i++)await page.keyboard.press('Escape');await poll(async()=>await page.getByRole('menu').count()===0,'menus closed');};
 const row=name=>toolsMenu().getByRole('menuitemcheckbox',{name,exact:true});
 const send=async text=>{const before=(await turns()).length;await fillComposer(page,input(),text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await poll(async()=>(await turns()).length===before+1,'turn sent');const request=(await turns()).at(-1);await poll(async()=>{const db=await readJson('fixture-threads.json');return db.threads[request.params.threadId]?.turns.at(-1)?.status==='completed';},'fixture completed');return request;};

 // 1. The draft: every tool on, rows keep the menu open, a switched-off tool goes out with thread/start.
 await openTools();
 assert.equal(await toolsMenu().getByRole('menuitemradio',{name:'All tools',exact:true}).getAttribute('aria-checked'),'true');
 report.metrics.rows=await toolsMenu().evaluate(n=>[...n.querySelectorAll('[data-tool],[data-tool-server]')].map(r=>[r.dataset.tool||'server:'+r.dataset.toolServer,r.getAttribute('aria-checked')]));
 assert.deepEqual(report.metrics.rows,[['bash','true'],['edit','true'],['read','true'],['skill','true'],['write','true'],['server:git','true']]);
 assert.equal((await toolsMenu().locator('[data-tool-server=git] .smenu-hint').textContent()).trim(),'2');
 await row('write').click();await poll(async()=>await row('write').getAttribute('aria-checked')==='false','write off');
 assert.equal(await toolsMenu().count(),1,'a row keeps the menu open');
 assert.equal(await toolsMenu().getByRole('menuitemradio',{name:'All tools',exact:true}).getAttribute('aria-checked'),'false');
 await page.screenshot({path:path.join(directory,'tools-menu-draft.png')});
 await closeMenus();
 const first=await send('fixture:complete tools-a'),idA=first.params.threadId;
 const startA=(await starts()).find(x=>x.params.threadId===idA);
 assert.deepEqual(startA.params.codeDesktop?.tools,{disabled:['write'],disabledServers:[]});
 assert.deepEqual(first.params.codeDesktop?.tools,{disabled:['write'],disabledServers:[]});
 await poll(async()=>JSON.stringify((await readJson('preferences.json')).threadTools?.[idA])===JSON.stringify({disabled:['write'],disabledServers:[]}),'session tools saved');
 report.checks.push('Add › Tools lists the core’s tools and MCP servers; a switched-off draft tool goes out on thread/start and turn/start and is saved as the session’s');

 // 2. The open session: switching an MCP server saves at once and reaches the core with the next turn.
 await openTools();
 assert.equal(await row('write').getAttribute('aria-checked'),'false','the session keeps its set');
 await toolsMenu().locator('[data-tool-server=git]').click();await poll(async()=>(await readJson('preferences.json')).threadTools?.[idA]?.disabledServers?.includes('git'),'server off saved');
 await closeMenus();
 const second=await send('fixture:complete tools-b');
 assert.equal(second.params.threadId,idA);assert.deepEqual(second.params.codeDesktop?.tools,{disabled:['write'],disabledServers:['git']});
 report.checks.push('In an open session a switched server is saved immediately and the next turn/start carries the new set');

 // 3. Settings › Profiles: a default profile with a permission mode; a new draft starts with it.
 await input().focus();await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Profiles',exact:true}).click();
 // No profiles yet: the header button and the centred empty state's primary both say New profile.
 assert.equal(await settings.getByRole('button',{name:'New profile',exact:true}).count(),2);await settings.getByRole('button',{name:'New profile',exact:true}).last().click();
 const editor=page.getByRole('dialog',{name:'New profile',exact:true});await editor.waitFor();
 await editor.getByRole('textbox',{name:'Profile name',exact:true}).fill('Read-only');
 await poll(async()=>await editor.getByRole('checkbox',{name:'bash',exact:true}).count()===1,'editor tools loaded');
 await editor.getByRole('checkbox',{name:'bash',exact:true}).uncheck();await editor.getByRole('checkbox',{name:'write',exact:true}).uncheck();await editor.getByRole('checkbox',{name:'edit',exact:true}).uncheck();
 await page.screenshot({path:path.join(directory,'profile-editor.png')});
 await editor.getByRole('button',{name:'Create profile',exact:true}).click();await editor.waitFor({state:'detached'});
 await poll(async()=>(await readJson('preferences.json')).toolProfiles?.length===1,'profile saved');
 const saved=(await readJson('preferences.json')).toolProfiles[0];assert.equal(saved.name,'Read-only');assert.deepEqual([...saved.tools.disabled].sort(),['bash','edit','write']);
 await settings.getByRole('switch',{name:'Use for new sessions',exact:true}).click();
 await poll(async()=>(await readJson('preferences.json')).defaultToolProfile===saved.id,'default saved');
 // The editor's backdrop has left: no nested-dialog mark and no stacked dialog over Settings.
 await new Promise(r=>setTimeout(r,600));
 report.metrics.afterEditor=await page.evaluate(()=>({dialogs:[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(n=>n.getAttribute('aria-label')||n.querySelector('h2')?.textContent),nested:[...document.querySelectorAll('[data-nested-dialog-open]')].map(n=>n.className),backdrops:[...document.querySelectorAll('[class*=backdrop]')].map(n=>n.className+' op='+getComputedStyle(n).opacity+' bg='+getComputedStyle(n).backgroundColor)}));
 assert.deepEqual(report.metrics.afterEditor.nested,[],'the nested-dialog mark is removed');
 await page.screenshot({path:path.join(directory,'profiles-page.png')});
 await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});
 await page.getByRole('button',{name:'New',exact:true}).click();
 await openTools();
 assert.equal(await toolsMenu().getByRole('menuitemradio',{name:'Read-only',exact:true}).getAttribute('aria-checked'),'true');
 assert.equal(await row('bash').getAttribute('aria-checked'),'false');assert.equal(await row('read').getAttribute('aria-checked'),'true');
 await page.screenshot({path:path.join(directory,'tools-menu-profile.png')});
 await closeMenus();
 const third=await send('fixture:complete tools-c'),idC=third.params.threadId;assert.notEqual(idC,idA);
 const startC=(await starts()).find(x=>x.params.threadId===idC);assert.deepEqual([...startC.params.codeDesktop.tools.disabled].sort(),['bash','edit','write']);
 report.checks.push('Settings › Profiles creates a profile from the core’s tool list; as the default it is checked in a new draft’s Tools menu and its set goes out on thread/start');

 // 4. All tools clears a session's set.
 await openTools();await toolsMenu().getByRole('menuitemradio',{name:'All tools',exact:true}).click();
 await poll(async()=>!(await readJson('preferences.json')).threadTools?.[idC],'session set cleared');
 const fourth=await send('fixture:complete tools-d');assert.equal(fourth.params.codeDesktop?.tools,null);
 report.checks.push('All tools clears the session’s set; the next turn/start carries tools: null');

 // 5. Dark appearance paint of the menu.
 await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});await openTools();await page.screenshot({path:path.join(directory,'tools-menu-dark.png')});await closeMenus();
 assert.deepEqual(report.rendererErrors,[]);await integrity();report.testSourceHashes=testHashes;report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;if(page)await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});}
finally{await app?.close();await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(evidence,'tool-profiles-ui-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
