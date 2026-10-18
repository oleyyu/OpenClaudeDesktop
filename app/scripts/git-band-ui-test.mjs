import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
// Git status band hints and repo menu end to end, against a real temp git repo:
// CDS tooltips with source gating instead of native titles (git-status-card
// 1270-1318 K 'View changes' / multiline behind, 1085-1119 Fe → shared-frame
// Pu 4869-4895 disabled reason; git-chips D 46-96 repo tooltip = cwd only when
// it differs from the label and closed while the chip menu is open, M 97-221
// branch tooltip only while the label is truncated), the Ko/qo repo menu
// (cc70f2bdf 2270-2394: Show in Finder | Copy path; F12 c18ab0d94 b() reveal label) and the addSuccess copy
// toasts. Only meaningful under the offscreen adapter with the in-memory
// clipboard (run-suite git-band): writeText never reaches the OS clipboard,
// and Show in Finder is asserted as a menu row only (shell.openPath is
// blocked before any native call and would fail the run's boundary check).
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/batch-20260920'),directory=await fs.mkdtemp(path.join(evidence,'git-band-ui-')),profile=path.join(directory,'profile');
const cwd=path.join(profile,'git-band-repo'),SESSION='git-band-thread',now=Math.floor(Date.now()/1000);await fs.mkdir(cwd,{recursive:true});
// F12 review: a second dirty session on the same checkout for the A→B→A band hold, and an archived one for the
// Commit failure toast (sendCommitTurn routes the archived precondition to the xr danger toast).
const SESSION_B='git-band-thread-b',SESSION_ARCHIVED='git-band-thread-archived',COMMIT_FAILED='Message couldn’t be sent. Try again.';
const git=(...args)=>execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid',...args],{cwd,env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'},encoding:'utf8'});
git('init','-q','-b','main');await fs.writeFile(path.join(cwd,'change.txt'),'original\n');git('add','.');git('commit','-qm','Fixture base');
// F12: an origin/main remote-tracking ref makes main the session base (getGitInfo defaultBranch), so the band
// counts merge-base(origin/main, HEAD) → worktree and survives a commit on the branch (no network: a local ref only).
git('update-ref','refs/remotes/origin/main','HEAD');
await fs.writeFile(path.join(cwd,'change.txt'),'replacement\nsecond\n'); // dirty worktree: +2 −1
// Second phase switches to this branch (carrying the dirty tree) so the chip label truncates.
const LONG='feature/git-band-source-tooltips-with-an-intentionally-very-long-branch-name-for-truncation';assert.ok(LONG.length>=60);
const RESPONDING_REASON='DeepSeek is working — wait for the turn to finish'; // git-rail-model COMMIT_RESPONDING_REASON: the assistant word of the default core (the fixture profile picks none)
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd,theme:'light',mode:'code',model:'fixture',effort:'low',threadIds:[SESSION,SESSION_B],archivedThreadIds:[SESSION_ARCHIVED],displayName:'Fixture',
 // The sidebar lists archived rows from the remembered metadata only (session-engine-model.mjs partitionSessions), as composer-states seeds it.
 threadMetadata:{[SESSION_ARCHIVED]:{id:SESSION_ARCHIVED,name:'Git band archived session',cwd,createdAt:now-10,updatedAt:now-10}}}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:100,threads:{[SESSION]:{id:SESSION,cwd,name:'Git band verification',createdAt:now,updatedAt:now,turns:[],archived:false},
 [SESSION_B]:{id:SESSION_B,cwd,name:'Git band second session',createdAt:now-5,updatedAt:now-5,turns:[],archived:false},
 [SESSION_ARCHIVED]:{id:SESSION_ARCHIVED,cwd,name:'Git band archived session',createdAt:now-10,updatedAt:now-10,turns:[],archived:true}}}));
const turnStarts=async()=>{try{return (await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).split('\n').filter(line=>line&&JSON.parse(line).method==='turn/start').length;}catch(error){if(error.code==='ENOENT')return 0;throw error;}};
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');let testHash;
async function integrity(){assert.equal(sha(JSON.stringify(build.sources)),build.sourceSha256);for(const file of build.sources)assert.equal(sha(await fs.readFile(path.join(root,file.path))),file.sha256);
 for(const required of ['src/source-session-rail.jsx','src/source-session-rail-changes-adapters.jsx','src/git-rail-model.mjs','src/source-toast.jsx','src/main.jsx'])assert.ok(build.sources.some(e=>e.path===required),'Build does not identify '+required);
 const h=sha(await fs.readFile(path.join(root,'scripts/git-band-ui-test.mjs')));if(testHash)assert.equal(h,testHash);else testHash=h;}
const report={at:new Date().toISOString(),directory,build:{version:build.version,sourceSha256:build.sourceSha256},checks:[],metrics:{},rendererErrors:[],clipboardSaved:false,clipboardRestored:false,passed:false};let app,page,phase='launch';
const step=name=>{phase=name;console.log('GITBAND '+name);};
const poll=async(fn,label,ms=10000)=>{const end=Date.now()+ms;for(;;){try{if(await fn())return;}catch{}if(Date.now()>end)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,40));}};
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
// R4i-gui GU1 (R4i-rail RL2, cc43287c9 Mte `mr = tp(Zn, e => e.railMode)`): a Code session in rail mode has no band
// (main.jsx railHidesBand); the band's surfaces moved to the session rail (rail-view.mjs rD, aside "Session details"):
//   - the Changes card's nav[aria-label="Repository and pull request controls"] (source-session-rail-changes-adapters.jsx
//     SessionRailChanges) holds OLe's row (changes-row.mjs `data-rail-changes-row`): the "Open changes, {added} added,
//     {removed} removed" ghost button over DiffCounts (.text-git-added / .text-git-removed), the Commit verb
//     (changes-verb.mjs DLe: PrActionFocusKeeper's onMouseDown preventDefault span → CdsDisabledReason wrapper →
//     CdsButton "Commit changes") and the ⋮ "More options for {branch}";
//   - the Environment card's folder chip (rail-view.mjs gD → repo-name-chip.mjs pLe: tooltip "Working folder" + the path,
//     menu = source-session-rail.jsx railRepoMenuItems) and branch chip (session-rail-kit/branch-chip.mjs k: tooltip
//     "Branch" + the name, menu Copy branch name + the rail's Open in terminal).
// Tooltips are view-tabs CdsTooltip: [data-cds="Tooltip"] > [role="tooltip"] holding the label and the detail.
const rail='aside[aria-label="Session details"]';
const card=title=>page.locator(rail).locator('section[data-rail-section]').filter({has:page.locator('h3',{hasText:new RegExp('^'+title)})});
const changesNav=()=>page.locator(`${rail} nav[aria-label="Repository and pull request controls"]`);
const live='[data-cds="Tooltip"] [role="tooltip"]';
// An open CDS tooltip whose text is exactly `text` (label + detail, as CdsTooltip renders them).
const tooltip=text=>page.waitForFunction(({live,text})=>[...document.querySelectorAll(live)].some(n=>n.textContent===text),{live,text},{timeout:4000});
const tipCount=()=>page.locator(live).count();
async function neutral(){await page.mouse.move(700,160);await page.locator(live).waitFor({state:'detached',timeout:4000});}
// Longer than the open delay plus the transition: any tooltip would be showing by now.
const settle=()=>page.waitForTimeout(900);
const titles=()=>page.locator(rail).evaluate(n=>[...n.querySelectorAll('[title]')].map(e=>e.outerHTML.slice(0,120)));
const toasts=()=>page.locator('.source-toast-card:not([data-phase="ending"]) .source-toast-message').allTextContents();
const clipboardText=()=>app.evaluate(({clipboard})=>clipboard.readText());
async function shot(name){await page.screenshot({path:path.join(directory,name+'.png')});}
try{
 await integrity();
 app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});page=await app.firstWindow();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.rendererErrors.push({phase,message:e.message}));
 assert.equal(await app.evaluate(()=>!!globalThis.offscreenClipboard),true,'git band suite requires the offscreen in-memory clipboard');
 // Save every clipboard format (the adapter's isolated store) and restore it in finally.
 await app.evaluate(async({clipboard,ClipboardItem})=>{const originals=await clipboard.read();globalThis.gitBandClipboard=await Promise.all(originals.map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));});report.clipboardSaved=true;
 await page.locator(`[data-source-session-id="${SESSION}"] .source-session-open`).click();
 // The rail is shown by default (rail-shown-store.mjs `shown: !0`); the titlebar toggle (rail-shell.mjs EH) brings it back otherwise.
 const railToggle=page.locator('.st-toolbar').getByRole('button',{name:'Show session rail',exact:true});if(await railToggle.count())await railToggle.click();
 const row=changesNav().locator('[data-rail-changes-row]');await row.waitFor();
 const diff=row.getByRole('button',{name:/^Open changes, /}),commit=row.getByRole('button',{name:'Commit changes',exact:true});
 const repoName=path.basename(cwd),folderChip=card('Environment').getByRole('button',{name:repoName,exact:true});
 const branchChip=name=>card('Environment').getByRole('button',{name,exact:true});
 await page.locator('.loading-state').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready);await page.mouse.move(700,160);

 step('band');
 assert.equal(await page.locator('nav.sg-status').count(),0,'rail mode hides the band (main.jsx railHidesBand)');
 // DiffCounts animates its counts (400ms, off under reduced motion); wait for the settled values.
 await poll(async()=>await row.locator('.text-git-added').textContent()==='+2'&&await row.locator('.text-git-removed').textContent()==='−1','rail Changes row settles on +2 −1');
 assert.equal(await diff.getAttribute('aria-label'),'Open changes, 2 added, 1 removed');
 assert.equal(await folderChip.count(),1,'the Environment card names the repository folder');assert.equal(await branchChip('main').count(),1,'the Environment card shows the main branch');
 assert.deepEqual(await titles(),[]);report.metrics.band=await row.evaluate(el=>({height:el.offsetHeight,width:el.getBoundingClientRect().width}));
 report.checks.push('Rail mode: no band; the rail Changes row shows +2 −1 behind "Open changes, 2 added, 1 removed", the Environment card shows the repo folder and main, and the rail contains no [title] element');

 // F12 review (git-status-card.js:1116 `onMouseDown: Mn`): in the rail the Commit verb sits in changes-verb.mjs Qz
 // (PrActionFocusKeeper), whose span prevents the mouse down, so pressing Commit does not take focus from the composer.
 // The pointer is released away from the button, so no Commit turn is sent.
 step('commit-focus');const composer=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});await composer.focus();
 assert.equal(await commit.isEnabled(),true,'Commit is enabled on the dirty idle session');const startsBeforeFocus=await turnStarts();
 const commitBox=await commit.boundingBox();await page.mouse.move(commitBox.x+commitBox.width/2,commitBox.y+commitBox.height/2);await page.mouse.down();
 report.metrics.commitMouseDown=await page.evaluate(()=>({onCommit:document.activeElement?.textContent==='Commit changes',tag:document.activeElement?.tagName??null}));
 report.metrics.commitMouseDown.composerFocused=await composer.evaluate(el=>el===document.activeElement||el.contains(document.activeElement));
 await page.mouse.move(700,160);await page.mouse.up();
 assert.deepEqual({onCommit:report.metrics.commitMouseDown.onCommit,composerFocused:report.metrics.commitMouseDown.composerFocused},{onCommit:false,composerFocused:true},'pressing Commit keeps the composer focused');
 await page.waitForTimeout(300);assert.equal(await turnStarts(),startsBeforeFocus,'no Commit turn was sent');
 report.checks.push('Pressing the enabled rail Commit keeps keyboard focus in the composer (PrActionFocusKeeper onMouseDown preventDefault)');

 // The band's A→B→A held snapshot ([data-prbar-stale], git-pr-slot cm) has no rail counterpart (the rail Changes row is
 // eze's, rebuilt from the session's own status). What stays checkable: the composer never unmounts across the switch,
 // A's rail row comes back with its own counts, and (R4i-gui fix) the composer top does not drift frame by frame: with the
 // band gone nothing above the composer depends on the git status, so every sampled frame of A→B→A keeps A's settled top.
 step('switch-hold');
 const composerTopOf=()=>page.evaluate(()=>document.querySelector('.sc-composer')?.getBoundingClientRect().top??null);
 await page.waitForTimeout(300);const holdATop=await composerTopOf();assert.ok(holdATop!==null,'A shows its composer before the switch');
 await page.locator(`[data-source-session-id="${SESSION_B}"] .source-session-open`).click();
 await page.locator(`[data-source-session-id="${SESSION_B}"] .source-session-open[aria-current="page"]`).waitFor();
 await page.locator('.loading-state').waitFor({state:'detached'});await row.waitFor();
 await page.waitForTimeout(300);const holdBTop=await composerTopOf();
 await page.evaluate(()=>{const samples=[];window.gitBandHold={samples,running:true};const tick=()=>{const node=document.querySelector('.sc-composer');samples.push(node?node.getBoundingClientRect().top:null);if(window.gitBandHold.running)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await page.locator(`[data-source-session-id="${SESSION}"] .source-session-open`).click();
 await page.locator(`[data-source-session-id="${SESSION}"] .source-session-open[aria-current="page"]`).waitFor();
 await page.locator('.loading-state').waitFor({state:'detached'});
 await poll(async()=>await row.locator('.text-git-added').textContent()==='+2','A shows its rail Changes row again',8000);
 const hold=await page.evaluate(()=>{window.gitBandHold.running=false;return window.gitBandHold.samples;});
 const mounted=hold.filter(top=>top!==null),composerDrift=mounted.length?Math.max(...mounted.map(top=>Math.abs(top-holdATop))):null;
 report.metrics.switchHold={frames:hold.length,missing:hold.length-mounted.length,holdATop,holdBTop,composerDrift,finalTop:await composerTopOf()};
 assert.ok(hold.length>=2,'frames were sampled across the switch back to A: '+hold.length);assert.equal(report.metrics.switchHold.missing,0,'the composer stays mounted');
 // Sub-pixel tolerance only: a band-height jump (the regression the band-era drift checks guarded) is far above 1px.
 assert.ok(Math.abs(holdBTop-holdATop)<1,'B composer top matches A: '+JSON.stringify(report.metrics.switchHold));
 assert.ok(composerDrift<1,'composer top drifted across A→B→A: '+JSON.stringify(report.metrics.switchHold));
 assert.ok(Math.abs(report.metrics.switchHold.finalTop-holdATop)<1,'A composer top after the return: '+JSON.stringify(report.metrics.switchHold));
 await shot('switch-hold-return');await page.mouse.move(700,160);
 report.checks.push(`A→B→A between two dirty sessions: over ${report.metrics.switchHold.frames} sampled frames the composer stayed mounted with its top within ${report.metrics.switchHold.composerDrift}px of A's settled top (B's top matched), and A's rail Changes row came back with +2 −1`);

 step('view-changes');await diff.hover();const openChangesTip=await page.locator(live).filter({hasText:'Open changes'}).first();await openChangesTip.waitFor();
 report.metrics.viewChangesTip=await openChangesTip.textContent();assert.match(report.metrics.viewChangesTip,/^Open changes/);
 assert.deepEqual(await titles(),[]);await shot('view-changes-tooltip');await neutral();
 report.checks.push("Hovering the rail +2 −1 shows the CDS tooltip 'Open changes' (changes-row.mjs OLe, with the toggleDiff chord while the pane is closed)");

 // session-rail-kit/branch-chip.mjs k: the rail's branch chip passes tooltip "Branch" with the name as detail (rail-view.mjs
 // rD `tooltip: "Branch", tooltipDetail: ae`), so unlike the band's M the tooltip shows whether or not the label truncates.
 step('short-branch');await branchChip('main').hover();await tooltip('Branchmain');
 report.metrics.shortBranch=await branchChip('main').evaluate(n=>{const label=n.querySelector('span.truncate');return {scrollWidth:label.scrollWidth,clientWidth:label.clientWidth,ariaLabel:n.getAttribute('aria-label')};});
 assert.ok(report.metrics.shortBranch.scrollWidth<=report.metrics.shortBranch.clientWidth);assert.equal(report.metrics.shortBranch.ariaLabel,null,'an unsplit branch name is the button text');await neutral();
 report.checks.push("The rail's short branch chip (main, not split) shows the CDS tooltip 'Branch' with the name as detail");

 step('repo-tooltip');await folderChip.hover();await tooltip('Working folder'+cwd);await shot('repo-tooltip');
 report.checks.push("The rail folder chip shows 'Working folder' with the cwd as detail (repo-name-chip pLe: tooltip only when it differs from the repo name)");

 step('repo-menu');await folderChip.click();const menu=page.getByRole('menu').filter({has:page.getByRole('menuitem',{name:'Copy path',exact:true})});await menu.waitFor();
 assert.equal(await folderChip.getAttribute('aria-expanded'),'true');await settle();assert.equal(await tipCount(),0,'no folder tooltip while its menu is open');
 const box=await folderChip.boundingBox();await page.mouse.move(box.x+box.width/2+2,box.y+box.height/2);await settle();assert.equal(await tipCount(),0,'re-hovering the chip with its menu open shows no tooltip');
 const rows=await menu.evaluate(n=>[...n.querySelectorAll('[role=menuitem],[role=separator]')].map(e=>e.getAttribute('role')==='separator'?'---':e.textContent.trim()));report.metrics.repoMenu=rows;
 assert.deepEqual(rows,['Show in Finder','---','Copy path','---','Open in terminal']);assert.deepEqual(await titles(),[]);await shot('repo-menu');
 // pLe: CdsDropdown.Popup side bottom, align start (menuAlign "start"), so the popup's left edge is the chip's left edge.
 report.metrics.repoMenuAlign=await folderChip.evaluate(chip=>{const m=[...document.querySelectorAll('[role=menu]')].at(-1),c=chip.getBoundingClientRect(),r=m.getBoundingClientRect();return {chip:c.left,menu:r.left,below:r.top>=c.bottom,above:r.bottom<=c.top,roomBelow:innerHeight-c.bottom,menuHeight:r.height};});
 assert.ok(Math.abs(report.metrics.repoMenuAlign.chip-report.metrics.repoMenuAlign.menu)<=1,'folder menu start-aligned: '+JSON.stringify(report.metrics.repoMenuAlign));
 const fitsBelow=report.metrics.repoMenuAlign.roomBelow>=report.metrics.repoMenuAlign.menuHeight;assert.equal(fitsBelow?report.metrics.repoMenuAlign.below:report.metrics.repoMenuAlign.above,true,'folder menu below the chip, or flipped above when it does not fit: '+JSON.stringify(report.metrics.repoMenuAlign));
 report.checks.push('With the rail folder menu open no tooltip shows (open:false); the menu is Show in Finder | separator | Copy path | separator | Open in terminal (railRepoMenuItems), start-aligned with the chip within 1px; Show in Finder is not clicked so no native shell call happens');

 step('copy-path');assert.deepEqual(await toasts(),[]);await menu.getByRole('menuitem',{name:'Copy path',exact:true}).click();await menu.waitFor({state:'detached'});
 await poll(async()=>(await toasts()).length>0,'copy path toast');await page.waitForTimeout(300);assert.deepEqual(await toasts(),['Path copied to clipboard.']);
 assert.equal(await clipboardText(),cwd);report.metrics.pathToastVariant=await page.locator('.source-toast-card').first().getAttribute('data-variant');assert.equal(report.metrics.pathToastVariant,'neutral');await shot('copy-path-toast');await neutral();
 report.checks.push("Copy path writes the cwd through the host copyText (in-memory clipboard) and raises exactly one neutral toast 'Path copied to clipboard.'");

 step('long-branch');git('checkout','-q','-b',LONG);assert.match(git('status','--porcelain'),/change\.txt/);
 // The rail status refetches on window focus (main.jsx focus → gitRefresh); the real handler runs, only the event is synthetic.
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await poll(async()=>await branchChip(LONG).count()===1,'rail shows the long branch');
 // branch-chip.mjs k over E(s): a long name splits into head / tail spans and the button takes the full name as aria-label.
 report.metrics.longBranch=await branchChip(LONG).evaluate(n=>[...n.querySelectorAll('span[dir="ltr"] > span:not([aria-hidden])')].map(s=>({text:s.textContent,scrollWidth:s.scrollWidth,clientWidth:s.clientWidth})));
 assert.equal(report.metrics.longBranch.length,2);assert.equal(report.metrics.longBranch.map(s=>s.text).join(''),LONG);
 assert.deepEqual(await titles(),[]);await branchChip(LONG).hover();await tooltip('Branch'+LONG);await shot('long-branch-tooltip');
 report.checks.push(`After a real branch switch to a ${LONG.length}-char name the rail branch chip splits head/tail (aria-label = the full name) and shows 'Branch' with the full name`);

 step('branch-menu');await branchChip(LONG).click();const branchMenu=page.getByRole('menu').filter({has:page.getByRole('menuitem',{name:'Copy branch name',exact:true})});await branchMenu.waitFor();await settle();assert.equal(await tipCount(),0,'no branch tooltip while its menu is open');
 report.metrics.branchMenuAlign=await branchChip(LONG).evaluate(chip=>({chip:chip.getBoundingClientRect().left,menu:[...document.querySelectorAll('[role=menu]')].at(-1).getBoundingClientRect().left}));
 assert.ok(Math.abs(report.metrics.branchMenuAlign.chip-report.metrics.branchMenuAlign.menu)<=1,'branch menu start-aligned: '+JSON.stringify(report.metrics.branchMenuAlign));
 await branchMenu.getByRole('menuitem',{name:'Copy branch name',exact:true}).click();await branchMenu.waitFor({state:'detached'});
 await poll(async()=>(await toasts()).includes('Branch name copied to clipboard.'),'copy branch toast');assert.equal((await toasts()).filter(t=>t==='Branch name copied to clipboard.').length,1);
 assert.equal(await clipboardText(),LONG);await shot('copy-branch-toast');await neutral();
 report.checks.push("With the rail branch menu open no tooltip shows; Copy branch name writes the full branch and raises one toast 'Branch name copied to clipboard.'");

 step('running');await page.getByRole('textbox',{name:'Message DeepSeek',exact:true}).fill('fixture:hold');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 await poll(async()=>await commit.isDisabled(),'Commit disabled while responding');await neutral();
 // view-tabs CdsDisabledReason (Uc): the wrapper carries data-cds-disabled-reason-wrapper, tabIndex 0 and aria-describedby →
 // the hidden [data-cds-disabled-reason] span (Yc) holding the reason.
 const described=await commit.evaluate(el=>{const wrap=el.closest('[data-cds-disabled-reason-wrapper]'),id=wrap?.getAttribute('aria-describedby'),reason=id&&document.getElementById(id);return {wrapped:!!wrap,tabIndex:wrap?.tabIndex,hidden:reason?.hidden,marker:reason?.hasAttribute('data-cds-disabled-reason'),text:reason?.textContent,title:el.getAttribute('title')};});
 report.metrics.disabledCommit=described;assert.deepEqual(described,{wrapped:true,tabIndex:0,hidden:true,marker:true,text:RESPONDING_REASON,title:null});assert.deepEqual(await titles(),[]);
 await row.locator('[data-cds-disabled-reason-wrapper]').hover();await tooltip(RESPONDING_REASON);await shot('running-disabled-reason');
 report.checks.push('During a held turn the disabled rail Commit sits in the CdsDisabledReason wrapper (tabindex 0, aria-describedby → hidden data-cds-disabled-reason) and hovering shows the reason');
 await neutral();await row.locator('[data-cds-disabled-reason-wrapper]').focus();assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-cds-disabled-reason-wrapper')),true);await tooltip(RESPONDING_REASON);
 report.checks.push(`Keyboard focus on the disabled rail Commit wrapper shows '${RESPONDING_REASON}'`);
 await page.mouse.move(700,160);await page.getByRole('textbox',{name:'Message DeepSeek',exact:true}).focus();

 // F12 (git-status-card 4725/4912-4960): commit the work on the branch; the rail row keeps +2 −1 for the branch
 // (merge-base with origin/main) and Commit is disabled with 'No changes to commit' (clean tree wins over responding).
 step('after-commit');git('add','-A');git('commit','-qm','Fixture commit');assert.equal(git('status','--porcelain').trim(),'');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await poll(async()=>await commit.evaluate(el=>{const wrap=el.closest('[data-cds-disabled-reason-wrapper]'),id=wrap?.getAttribute('aria-describedby');return el.disabled&&!!id&&document.getElementById(id)?.textContent==='No changes to commit';}),'Commit disabled as clean after the commit');
 assert.equal(await row.count(),1,'the rail Changes row stays after the commit');assert.equal(await row.locator('.text-git-added').textContent(),'+2');assert.equal(await row.locator('.text-git-removed').textContent(),'−1');
 await shot('after-commit');
 report.checks.push("After a real commit on the branch the rail Changes row stays with +2 −1 (merge-base with origin/main) and Commit is disabled with 'No changes to commit'");

 // The band's archived-session Commit failure toast has no rail counterpart: an archived session's rail is read-only and
 // fO passes no pullRequests then (source-session-rail.jsx `pullRequests={o ? undefined : …}`, main.jsx sessionRailHost
 // readOnly: !!session?.archived), so the Changes card is not there to press Commit on.
 step('archived-read-only');await fs.writeFile(path.join(cwd,'toast.txt'),'dirty again\n');
 await page.getByRole('button',{name:/^Filter(?: \(active\))?$/}).click();const filterMenu=page.getByRole('menu',{name:'Filter sessions',exact:true});
 await filterMenu.getByRole('menuitem',{name:/^Status/}).click();await page.getByRole('menu',{name:'Status',exact:true}).getByRole('menuitemradio',{name:'Archived',exact:true}).click();
 await filterMenu.waitFor({state:'detached'});await page.locator(`[data-source-session-id="${SESSION_ARCHIVED}"] .source-session-open`).click();
 await page.getByRole('button',{name:'Restore session',exact:true}).waitFor();await page.waitForTimeout(500);
 const startsBeforeArchived=await turnStarts();
 report.metrics.archivedRail={changesRows:await changesNav().locator('[data-rail-changes-row]').count(),band:await page.locator('nav.sg-status').count(),errorBanners:await page.locator('.composer-error').count(),turnStarts:await turnStarts()-startsBeforeArchived};
 assert.deepEqual(report.metrics.archivedRail,{changesRows:0,band:0,errorBanners:0,turnStarts:0});await shot('archived-read-only');
 report.checks.push('An archived (read-only) session shows no rail Changes row and no band, so no Commit can be sent from it');

 assert.deepEqual(report.rendererErrors,[]);await integrity();report.passed=true;
}catch(error){report.failure=error.stack;report.phase=phase;process.exitCode=1;if(page)await shot('failure').catch(()=>{});}
finally{
 if(app&&report.clipboardSaved){try{await app.evaluate(async({clipboard})=>{const saved=globalThis.gitBandClipboard;if(!saved)throw Error('Clipboard backup unavailable');if(saved.length)await clipboard.write(saved);else await clipboard.clear();delete globalThis.gitBandClipboard;});report.clipboardRestored=true;}catch(error){report.clipboardRestoreError=String(error);report.passed=false;process.exitCode=1;}}
 if(app)await app.close().catch(()=>{});const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(path.join(directory,'report.json'),bytes);await fs.writeFile(path.join(evidence,'git-band-ui-report.json'),bytes);console.log(bytes);}
