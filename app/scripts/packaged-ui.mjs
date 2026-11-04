import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const evidence=path.join(root,'../analysis/batch-20260920');
const expectedBuild=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
const appPath=process.env.TEST_APP_PATH || path.join(root,'../releases/OpenClaude Desktop-darwin-arm64/OpenClaude Desktop.app');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const scriptSha256=digest(await fs.readFile(import.meta.filename));
const asarPath=path.join(appPath,'Contents/Resources/app.asar');
const asarHashBefore=digest(await fs.readFile(asarPath));
const profile=await fs.mkdtemp(path.join(evidence,'packaged-profile-'));
const preferencesPath=path.join(profile,'preferences.json');
await fs.writeFile(preferencesPath,JSON.stringify({cwd:path.join(root,'../workspace'),theme:'light',mode:'code',permission:'plan',effort:'low',threadIds:[]}));
const env={...process.env,CODE_DESKTOP_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;delete env.CODEX_BINARY;delete env.CODE_DESKTOP_DEV_URL;
let app;
let report={passed:false,startedAt:new Date().toISOString(),packagedApp:appPath,realCodex:true,profile,profileRemoved:false,scriptSha256,asarHashBefore};
try{
 app=await electron.launch({executablePath:path.join(appPath,'Contents/MacOS/OpenClaude Desktop'),args:[],env});
 const page=await app.firstWindow();const errors=[],requests=[];
 // Isolate Chromium hover input from the shared desktop; installed native
 // interactions are separately exercised through Computer Use.
 await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.webContents.setBackgroundThrottling(false);win.hide();});
 const inputSession=await page.context().newCDPSession(page);await inputSession.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 report.inputIsolation='Hidden installed-app window with CDP focus emulation; native acceptance recorded separately';
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.waitForFunction(()=>!!document.querySelector('.sc-model-trigger')&&!document.querySelector('.sc-model-trigger').disabled,{},{timeout:60000});
 await page.locator('.sc-pet-animation[data-ready] svg').waitFor();await page.evaluate(()=>document.fonts.ready);
 const runtime=await app.evaluate(({app,BrowserWindow})=>({path:app.getAppPath(),version:app.getVersion(),size:BrowserWindow.getAllWindows()[0].getContentSize(),bounds:BrowserWindow.getAllWindows()[0].getBounds()}));
 assert.equal(runtime.path,path.join(appPath,'Contents/Resources/app.asar'));assert.equal(runtime.version,JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version);assert.equal(runtime.bounds.width,1200);assert.equal(runtime.bounds.height,800);assert.equal(runtime.size[0],1468);assert.ok(runtime.size[1]>=851&&runtime.size[1]<=852);
 const packagedBuild=await page.evaluate(async()=>await (await fetch('./build-info.json')).json());
 assert.equal(packagedBuild.version,expectedBuild.version);assert.equal(packagedBuild.sourceSha256,expectedBuild.sourceSha256);
 assert.equal(await page.evaluate(()=>document.fonts.check('14px anthropic-sans')),true);
 assert.equal(await page.locator('.claude-spark').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 await page.screenshot({path:path.join(evidence,'packaged-home.png')});
 await page.getByRole('button',{name:'Account menu'}).click();await page.getByRole('menuitem',{name:/Settings/}).click();await page.getByRole('radio',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await page.getByRole('dialog',{name:'Settings',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:path.join(evidence,'packaged-dark.png')});
 await page.evaluate(theme=>window.desktop.call('settings',{theme}),'light');await page.waitForFunction(()=>document.documentElement.dataset.mode==='light');
 await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).fill('Reply with CODE_DESKTOP_PACKAGED_OK on the first line, then a fenced js code block containing exactly: const packaged = true; Do not use tools.');
 await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 await page.waitForFunction(()=>document.querySelector('.assistant-message')?.textContent.includes('CODE_DESKTOP_PACKAGED_OK')&&!document.querySelector('.source-working'),{},{timeout:150000});
 const codeBlock=page.locator('.scb-block').filter({hasText:'const packaged = true;'});await codeBlock.waitFor();
 await codeBlock.getByRole('button',{name:'Copy code',exact:true}).waitFor();
 await codeBlock.locator('[data-code-token]').first().waitFor();
 assert.match(await codeBlock.locator('code').textContent(),/const packaged = true;/);
 assert.equal(await codeBlock.locator('[data-code-token]').evaluateAll(nodes=>nodes.map(node=>node.textContent).join('')),await codeBlock.locator('code').textContent());
 // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
 await page.getByRole('button',{name:'Changes',exact:true}).hover();await page.getByRole('tooltip').filter({hasText:'Changes'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Changes',exact:true}).getAttribute('title'),null);
 await page.mouse.move(800,400);await page.getByRole('tooltip').waitFor({state:'detached'});
 await page.screenshot({path:path.join(evidence,'packaged-conversation.png')});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,600));
 await page.getByRole("button", {name: "View options", exact: true}).click(); await page.getByRole("menuitemcheckbox", {name: "Files", exact: true}).click();await page.getByRole('textbox',{name:'Filter files',exact:true}).fill('ui-smoke');await page.locator('.sfs-results [data-tree-row]').getByRole('button',{name:'ui-smoke.txt',exact:true}).click();await page.locator('.source-file-preview').filter({hasText:'CODE_DESKTOP_SMOKE_OK'}).waitFor();await page.getByRole('button',{name:'Close panel'}).click();
 // Source labels: sidebar-groups.js hw "Hide sidebar" / Nb "Show sidebar".
 await page.getByRole('button',{name:'Hide sidebar'}).click();const bounds=await page.getByRole('button',{name:'Show sidebar'}).boundingBox();assert.ok(bounds.x>=85);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 report={...report,passed:true,at:new Date().toISOString(),runtime,build:packagedBuild,checks:['packaged app.asar identity, version and the Dfn 1200x800 default bounds (fidelity F04)','original fonts/spark/Lottie loaded from installed assets','light/dark theme','custom titlebar tooltip in packaged renderer','real Codex response and copy-ready, syntax-highlighted fenced code in read-only mode','compact filename search through installed ASAR worker/IPC and real file preview','collapsed toolbar avoids native controls'],errors,failedRequests:requests};
}catch(error){report.error=error.stack||String(error);process.exitCode=1}
finally{
 await app?.close().catch(error=>{report.error ||= error.stack||String(error);process.exitCode=1});
 try{
  const bytes=await fs.readFile(preferencesPath),prefs=JSON.parse(bytes);
  // This profile was seeded with no IDs. Only the persisted IDs actually
  // created by this run are attributed to it; no shared history is enumerated.
  const ids=[...new Set([...(prefs.threadIds||[]),...(prefs.archivedThreadIds||[])])];
  report.threadIds=ids;report.threadId=ids.length===1?ids[0]:null;
  report.cwd=report.threadId?prefs.threadMetadata?.[report.threadId]?.cwd??prefs.cwd:prefs.cwd;
  report.cwdSource=report.threadId&&prefs.threadMetadata?.[report.threadId]?.cwd?'preferences.threadMetadata[threadId].cwd':'preferences.cwd';
  report.profilePreferences={path:preferencesPath,sha256:digest(bytes),initialThreadIds:[],threadIds:prefs.threadIds||[],archivedThreadIds:prefs.archivedThreadIds||[]};
  report.scriptSha256After=digest(await fs.readFile(import.meta.filename));
  report.asarHash=digest(await fs.readFile(asarPath));
  report.integrity={scriptUnchanged:report.scriptSha256===report.scriptSha256After,asarUnchanged:report.asarHashBefore===report.asarHash};
  if(!report.integrity.scriptUnchanged||!report.integrity.asarUnchanged)throw new Error('Packaged validation script or app.asar changed during the run');
 }catch(error){report.error ||= error.stack||String(error);process.exitCode=1}
 await fs.rm(profile,{recursive:true,force:true}).then(()=>{report.profileRemoved=true}).catch(error=>{report.error ||= error.stack||String(error);process.exitCode=1});
 if(report.error)report.passed=false;
 report.finishedAt=new Date().toISOString();
 await fs.writeFile(path.join(evidence,'packaged-app-test.json'),JSON.stringify(report,null,2));console.log(report);
}
