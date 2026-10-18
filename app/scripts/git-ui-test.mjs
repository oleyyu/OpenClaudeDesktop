import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'), evidence=path.join(root,'../analysis/batch-20260920');
const profile=await fs.mkdtemp(path.join(evidence,'git-ui-profile-')), cwd=path.join(profile,'git-workspace'), now=Math.floor(Date.now()/1000);
await fs.mkdir(cwd);const git=(...args)=>execFileSync('git',args,{cwd,env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'},encoding:'utf8'});
git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
await fs.writeFile(path.join(cwd,'change.txt'),'original\n');git('add','.');git('commit','-m','Fixture base');
await fs.writeFile(path.join(cwd,'change.txt'),'replacement\nsecond\n');
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd,theme:'light',model:'fixture',threadIds:['git-ui-thread']}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{'git-ui-thread':{id:'git-ui-thread',cwd,name:'Git status verification',createdAt:now,updatedAt:now,turns:[],archived:false}}}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env}), checks=[],errors=[];
await app.evaluate(async({clipboard,ClipboardItem})=>{const originals=await clipboard.read();globalThis.gitUiClipboard=await Promise.all(originals.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));});
try{
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 /* R4i-gui GU1 (R4i-rail RL2, cc43287c9 Mte `mr`): rail mode hides the band; the git row is the rail Changes card's
    (aside "Session details" › nav "Repository and pull request controls" › changes-row.mjs OLe data-rail-changes-row): the
    counts are DiffCounts (.text-git-added / .text-git-removed, sr-only "2 additions, 1 deletion") inside the ghost button
    "Open changes, 2 added, 1 removed" (onDiffOpen = main.jsx setPanel("changes"): it opens, it does not toggle). */
 await page.locator('[data-source-session-id="git-ui-thread"] .source-session-open').click();
 {const toggle=page.locator('.st-toolbar').getByRole('button',{name:'Show session rail',exact:true});if(await toggle.count())await toggle.click();}
 const row=page.locator('aside[aria-label="Session details"] nav[aria-label="Repository and pull request controls"] [data-rail-changes-row]');await row.waitFor();
 await page.waitForFunction(sel=>{const el=document.querySelector(sel);return el?.querySelector('.text-git-added')?.textContent==='+2'&&el.querySelector('.text-git-removed')?.textContent==='−1';},'aside[aria-label="Session details"] nav[aria-label="Repository and pull request controls"] [data-rail-changes-row]');
 const geometry=await row.evaluate(el=>({height:el.offsetHeight,width:el.getBoundingClientRect().width,bands:document.querySelectorAll('nav.sg-status').length}));assert.equal(geometry.bands,0,'no band in rail mode');checks.push('real Git HEAD→working-tree counts on the rail Changes row (no band in rail mode)');
 const diff=row.getByRole('button',{name:/^Open changes, /});
 assert.equal(await diff.getAttribute('aria-label'),'Open changes, 2 added, 1 removed');assert.equal(await diff.locator('.sr-only').textContent(),'2 additions, 1 deletion');
 await diff.click();await page.locator('.source-diff').filter({hasText:'+replacement'}).waitFor();assert.match(await page.locator('.source-diff').textContent(),/\u2212original/);/* removed-line marker is U+2212 since 0.2.45 (source-diff.jsx:53 DiffLine; work/diff-separators-headless-20260922/check.mjs:62); HANDOFF 0.2.125 */checks.push('changes panel loads actual local diff');
 /* The rail counts open Changes (OLe onClick: onDiffOpen); the pane closes from its own Close panel. */
 await diff.click();assert.equal(await page.locator('[data-pane-kind="diff"]').count()>0,true,'a second press keeps Changes open');
 await page.locator('.source-side-tile').getByRole('button',{name:'Close panel',exact:true}).click();await page.locator('[data-pane-kind="diff"]').waitFor({state:'detached'});checks.push('rail counts open the Changes pane; Close panel closes it');
 /* The branch chip is the rail Environment card's (session-rail-kit/branch-chip.mjs k: menu Copy branch name). */
 await page.locator('aside[aria-label="Session details"]').getByRole('button',{name:'main',exact:true}).click();await page.getByRole('menuitem',{name:'Copy branch name'}).click();await app.evaluate(async({clipboard})=>{const deadline=Date.now()+3000;while(await clipboard.readText()!=='main'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));});assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),'main');checks.push('branch menu copies actual branch');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,600));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(evidence,'git-source-compact.png')});
 /* F12 git-status-card 4666-4669 / 5180-5181: a commit-mode row has no Dismiss and no reserved space. */
 assert.equal(await page.locator('.sg-dismiss, .sg-dismiss-reserved, nav.sg-status').count(),0);checks.push('compact layout without a band; no Dismiss');
 assert.deepEqual(errors,[]);const report={passed:true,at:new Date().toISOString(),fixture:true,realGit:true,checks,geometry,errors};await fs.writeFile(path.join(evidence,'git-ui-test.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await app.evaluate(async({clipboard})=>{const originals=globalThis.gitUiClipboard;if(originals?.length)await clipboard.write(originals);else await clipboard.clear();delete globalThis.gitUiClipboard;});await app.close();}
