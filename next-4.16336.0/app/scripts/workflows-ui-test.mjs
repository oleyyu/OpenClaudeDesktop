import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {fillComposer} from "./composer-test-helpers.mjs";

// Claude 2.2553.1 shared-11/cc183b3ab slash contract; real-shaped isolated
// Codex protocol fixture. Never opens user sessions or writes the clipboard.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `workflows-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);


const RC='slash-parent';const now=Math.floor(Date.now()/1000);
const parent={id:RC,name:'Slash fixture',cwd:workspace,historyMode:'paginated',createdAt:now,updatedAt:now,turns:[{id:'original-turn',status:'completed',items:[{id:'original-user',type:'userMessage',content:[{type:'text',text:'Original prompt'}]},{id:'original-answer',type:'agentMessage',text:'ORIGINAL_RESPONSE'}]}]};
await fs.mkdir(path.join(workspace,'extra'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',threadIds:[RC],sidebarWidth:288}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:900,threads:{[RC]:parent}}));
await fs.writeFile(path.join(profile,'fixture-model-list.json'),JSON.stringify({fastTierModels:['fixture']}));
await fs.writeFile(path.join(profile,'fixture-rate-limits.json'),JSON.stringify({rateLimitsByLimitId:{codex:{primary:{usedPercent:20,windowDurationMins:300,resetsAt:null}}}}));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,'codex-home'), CODE_DESKTOP_WORKFLOW_BINARY:path.join(root,'tests/fixtures/workflow-server.cjs'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const checks=[],metrics={},rendererErrors=[],rendererErrorStacks=[];
let app,page,build,failure,runtime,clipboardSaved=false,clipboardRestored=false,profileRemoved=false;
const testSources=['src/source-workflow.jsx','src/source-workflow.css','tests/fixtures/workflow-server.cjs','scripts/workflows-ui-test.mjs','scripts/composer-test-helpers.mjs','tests/fixtures/codex-server.cjs','src/workflow-progress-model.mjs','electron/workflow-service.cjs'];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/command-summary.mjs", "src/ansi-model.mjs", "src/command-row-model.mjs",
    "src/source-command.jsx", "src/source-command.css", "src/source-session.jsx", "src/source-session.css",
    "src/state.js", "src/main.jsx", "electron/main.cjs", "src/source-agent.jsx", "src/source-agent.css", "src/agent-model.mjs", "src/source-tool-group.jsx", "src/source-tool-group.css"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
async function poll(check, label, timeout = 12000) {
  const until = Date.now() + timeout;
  for (;;) {
    try { const value = await check(); if (value) return value; } catch {}
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}
try {
  build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));await verifySource();
  app=await electron.launch({executablePath,args:[root],env});page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>{rendererErrors.push(e.message);rendererErrorStacks.push(e.stack || String(e));});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324&&innerHeight===768);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.getByText('ORIGINAL_RESPONSE',{exact:true}).waitFor();
  const emptyChild=path.join(workspace,'empty-child.js');await fs.writeFile(emptyChild,'export const meta={name:"empty",description:"Empty child"};return 1');
  const script=path.join(workspace,'inspect.workflow.js');await fs.writeFile(script,'export const meta={name:"inspect-project",title:"Inspect project",description:"Read project files and verify results"};\nawait workflow({scriptPath:'+JSON.stringify(emptyChild)+'}); phase("Inspect"); phase("Inspect"); await agent("GUI",{label:"Inspect files"}); phase("Check"); return await parallel([()=>agent("WAIT",{label:"Wait"}),()=>agent("FAIL",{label:"Failure"})]);');
  await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).focus();await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Code',exact:true}).click();assert.equal(await settings.getByRole('switch',{name:'Dynamic workflows',exact:true}).getAttribute('aria-checked'),'true','Dynamic workflows is on by default (Claude enableWorkflows)');await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});
  const editor=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });await fillComposer(page,editor,'/workflow '+JSON.stringify(script));await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();const launcher=page.getByRole('dialog',{name:'Run workflow'});await launcher.getByRole('button',{name:'Run workflow',exact:true}).click();await launcher.waitFor({state:'hidden'});
  const pane=page.getByRole('complementary',{name:'Background tasks',exact:true});await pane.waitFor();const card=pane.locator('.swf-card');await card.waitFor();await pane.getByText('Error',{exact:true}).waitFor();assert.equal(await card.getAttribute('data-workflow-status'),'running');const compact=page.locator('.swf-compact');assert.equal(await compact.locator('.swf-title').textContent(),'Inspect project');assert.equal(await card.locator('.swf-heading>span').first().textContent(),'Inspect project');await compact.click();await pane.getByRole('button',{name:/Phase: Check, Failed/}).waitFor();
  metrics.geometry=await card.evaluate(el=>{const c=el.querySelector('.swf-cell'),s=getComputedStyle(el),cell=getComputedStyle(c);return {radius:s.borderRadius,padding:s.padding,gap:s.gap,cellWidth:cell.width,cellHeight:cell.height,cellGap:getComputedStyle(c.parentElement).gap};});assert.deepEqual(metrics.geometry,{radius:'8px',padding:'8px 8px 12px',gap:'24px',cellWidth:'6px',cellHeight:'6px',cellGap:'2px'});checks.push('Real engine lifecycle drives compact card, task card, two phases, failure, and source grid geometry');
  // ipe:52129–52326 nested12/5 header, rT:59–68 sm secondary; compact density=20px.
  metrics.layout=await card.evaluate(n=>{const css=q=>getComputedStyle(n.querySelector(q)),box=q=>n.querySelector(q).getBoundingClientRect();const end=box('.swf-heading-group'),desc=box('.swf-description');return {headerGap:css('.swf-header').gap,innerGap:css('.swf-heading-group').gap,descriptionGap:desc.top-end.bottom,stopWidth:box('.swf-stop').width,stopHeight:box('.swf-stop').height,stopRadius:css('.swf-stop').borderRadius,stopVariant:n.querySelector('.swf-stop').dataset.variant,body:getComputedStyle(n).fontSize,foot:css('.swf-meta').fontSize,metaGap:css('.swf-meta').gap,select:css('.swf-header').userSelect,kind:css('.swf-kind').color,value:css('.swf-value').color,meta:css('.swf-meta').color,phaseGap:css('.swf-phase-head').gap,phaseTitleHeight:box('.swf-phase-title').height,caretHeight:box('.swf-phase-caret').height};});
  assert.equal(metrics.layout.headerGap,'12px');assert.equal(metrics.layout.innerGap,'5px');assert.equal(metrics.layout.descriptionGap,12);assert.equal(metrics.layout.stopWidth,20);assert.equal(metrics.layout.stopHeight,20);assert.equal(metrics.layout.stopRadius,'5px');assert.equal(metrics.layout.stopVariant,'secondary');assert.equal(metrics.layout.body,'13px');assert.equal(metrics.layout.foot,'12px');/* CDS compact gap-sm=.5rem and gap-xs=.375rem; not spacing-1. */assert.equal(metrics.layout.metaGap,'3px 8px');assert.equal(metrics.layout.select,'none');assert.equal(metrics.layout.kind,metrics.layout.value);assert.notEqual(metrics.layout.kind,metrics.layout.meta);assert.equal(metrics.layout.phaseGap,'6px');assert.equal(metrics.layout.phaseTitleHeight,20);assert.equal(metrics.layout.caretHeight,20);
  assert.equal(await compact.locator('.swf-title').evaluate(n=>n.classList.contains('source-shimmer')),true);assert.equal(await compact.locator('.swf-caret-slot').evaluate(n=>n.getBoundingClientRect().height),19);
  const checkPhase=card.getByRole('button',{name:/Phase: Check, Failed/}),checkGroup=checkPhase.locator('..');assert.equal(await checkPhase.evaluate(n=>getComputedStyle(n).borderRadius),'4px');const basePaint=await checkPhase.evaluate(n=>getComputedStyle(n).backgroundColor);await checkPhase.hover();assert.equal(await checkPhase.evaluate(n=>getComputedStyle(n).backgroundColor),basePaint);await checkPhase.click();assert.equal(await checkPhase.getAttribute('aria-expanded'),'false');assert.equal(await checkGroup.locator('.swf-agents').count(),0);await checkPhase.click();assert.equal(await checkGroup.locator('.swf-agents').count(),1);assert.equal(await card.locator('.swf-cell:not([data-state=ghost])').count(),3);assert.equal(await card.locator('.swf-cell[data-state=ghost]').count(),1);
  await page.screenshot({path:path.join(directory,'workflow-running-light.png')});checks.push('Source nested12/5 header,20px sm Stop,body/footnote fonts,secondary values,phase gap/centred caret and stable expanded hover; real collapse keeps all three agents');
  assert.equal(await card.locator('.swf-table>.swf-tokens').first().isVisible(),false);await pane.getByRole('button',{name:'Expand',exact:true}).click();await poll(async()=>await card.locator('.swf-table>.swf-tokens').first().isVisible(),'expanded pane exposes token column');metrics.wideTable=await card.locator('.swf-table').first().evaluate(n=>({rows:getComputedStyle(n).gridTemplateRows,columnGap:getComputedStyle(n).columnGap,rowGap:getComputedStyle(n).rowGap,width:n.getBoundingClientRect().width}));assert.equal(metrics.wideTable.rows,'15px 16px');assert.equal(metrics.wideTable.columnGap,'8px');assert.equal(metrics.wideTable.rowGap,'4px');assert.ok(metrics.wideTable.width>318);await page.screenshot({path:path.join(directory,'workflow-expanded.png')});await pane.getByRole('button',{name:'Collapse',exact:true}).click();await poll(async()=>!await card.locator('.swf-table>.swf-tokens').first().isVisible(),'collapsed pane hides token column');checks.push('Actual Expand/Collapse changes responsive agent columns; source table has auto15px header,16px agent rows and8px/4px gaps');


  // dpe's Mi is shared-11 Dl/tp PreviewCard: hover600ms, focus-visible,
  // 200–360px selectable content; it is not a click/autofocus dialog.
  const errorTrigger=card.locator('.swf-error-trigger').first();await errorTrigger.hover();
  const errorPreview=page.locator('[data-cds="PreviewCard"].swf-error-popup');await errorPreview.waitFor();
  assert.ok((await errorPreview.textContent()).includes('Fixture failed'));
  assert.equal(await errorPreview.locator('.swf-error-text').evaluate(el=>getComputedStyle(el).userSelect),'text');
  assert.equal(await errorPreview.getAttribute('role'),null);
  await page.keyboard.press('Escape');await errorPreview.waitFor({state:'hidden'});
  checks.push('Real agent error opens a selectable PreviewCard and Escape dismisses without dialog semantics');
  for(const [label,size] of [['Small','13px'],['Large','15px'],['Medium','14px']]){await editor.focus();await page.keyboard.press('Meta+,');await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Code',exact:true}).click();await settings.getByRole('radiogroup',{name:'Transcript text size',exact:true}).getByRole('radio',{name:label,exact:true}).click();await poll(async()=>await compact.locator('.swf-title').evaluate(n=>getComputedStyle(n).fontSize)===size,'workflow title '+label);await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});assert.equal(await card.evaluate(n=>getComputedStyle(n).fontSize),'13px');}
  checks.push('Actual Small/Large/Medium setting updates transcript workflow title13/15/14px (B38: Large is 15px, c6a992d55-C0zTICcS.css [data-chat-text-size=l]) while task panel retains CDS13px body');

  await editor.focus();await page.keyboard.press('Meta+,');await settings.getByRole('radio',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});await card.waitFor();
  await errorTrigger.focus();await errorPreview.waitFor();await page.screenshot({path:path.join(directory,'workflow-running-dark.png')});assert.equal(await page.locator('.swf-error-portal').getAttribute('data-mode'),'dark');await page.keyboard.press('Escape');await errorPreview.waitFor({state:'hidden'});
  let wire=await fs.readFile(path.join(workspace,'workflow-wire.jsonl'),'utf8');await fs.writeFile(path.join(directory,'workflow-wire.jsonl'),wire);const requests=wire.trim().split('\n').map(JSON.parse);const starts=requests.filter(q=>q.method==='thread/start');assert.equal(starts.length,3);/* The session runs in the default Auto Mode, so its agents get workspace-write (permission-policy.mjs workflowAccess), never more, and never ask. */for(const q of starts){assert.equal(q.params.sandbox,'workspace-write');assert.equal(q.params.approvalPolicy,'never');}assert.equal(requests.filter(q=>q.method==='turn/start').length,3);
  checks.push('Actual settings dark theme and keyboard error preview preserve running workflow; isolated child protocol proves three real workspace-write agents (the Auto Mode access) that never ask');

  if(!(await card.locator('.swf-table>.swf-tokens').first().isVisible()))await pane.getByRole('button',{name:'Expand',exact:true}).click();
  const retryMember=card.getByRole('button',{name:'Retry agent: Wait',exact:true});await retryMember.waitFor();await card.getByRole('button',{name:'Skip agent: Wait',exact:true}).waitFor();await retryMember.click();await poll(async()=>{wire=await fs.readFile(path.join(workspace,'workflow-wire.jsonl'),'utf8');return wire.trim().split('\n').map(JSON.parse).filter(q=>q.method==='thread/start').length===4;},'member retry starts a replacement child');await card.getByText(' · Attempt 2',{exact:true}).waitFor();assert.equal(await card.locator('.swf-table ul>li').count(),3);await fs.writeFile(path.join(directory,'workflow-wire.jsonl'),wire);await page.screenshot({path:path.join(directory,'workflow-member-retry.png')});await pane.getByRole('button',{name:'Collapse',exact:true}).click();checks.push('Retry control aborts one member and starts its replacement; cumulative attempt is shown without adding a logical agent row');

  await card.getByRole('button',{name:'Stop this workflow'}).click();await pane.getByRole('button',{name:'Finished 1'}).waitFor();await pane.getByRole('button',{name:'Finished 1'}).click();await pane.getByRole('region',{name:'Stopped'}).waitFor();assert.equal(await card.getAttribute('data-workflow-status'),'stopped');assert.equal(await page.locator('.swf-terminal').getByText('Ran workflow',{exact:true}).count(),1);assert.equal(await pane.getByRole('button',{name:'Stop this workflow'}).count(),0);checks.push('Stop waits for child process exit; terminal row and persisted finished card show real stopped result');
  await pane.getByRole('button',{name:/Phase: Check, Failed/}).click();assert.equal(await pane.locator('.swf-agent-label[title="Wait"]').count(),1);assert.equal(await pane.locator('.swf-error-trigger').count(),2);await page.screenshot({path:path.join(directory,'workflow-stopped.png')});
  // Stop settles the owned child before the restart traffic baseline is captured.
  wire=await fs.readFile(path.join(workspace,'workflow-wire.jsonl'),'utf8');await fs.writeFile(path.join(directory,'workflow-wire.jsonl'),wire);
  const workflowDir=path.join(profile,'workflows'),ids=await fs.readdir(workflowDir);assert.equal(ids.length,1);const snapshotFile=path.join(workflowDir,ids[0],'meta.json');const persisted=JSON.parse(await fs.readFile(snapshotFile,'utf8'));assert.equal(persisted.status,'stopped');assert.equal(persisted.name,'inspect-project');assert.equal(persisted.title,'Inspect project');assert.equal(persisted.workflowProgress.filter(x=>x.type==='workflow_phase').length,2);assert.deepEqual(persisted.workflowProgress.filter(x=>x.type==='workflow_phase').map(x=>x.index),[2,3]);assert.equal(persisted.workflowProgress.filter(x=>x.type==='workflow_agent').length,3);metrics.persisted={id:persisted.id,status:persisted.status,sequence:persisted.sequence,phases:2,agents:3};await fs.copyFile(snapshotFile,path.join(directory,'workflow-stopped-snapshot.json'));
  await app.close();app=null;app=await electron.launch({executablePath,args:[root],env});page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>{rendererErrors.push(e.message);rendererErrorStacks.push(e.stack || String(e));});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.locator('.swf-terminal').getByText('Ran workflow',{exact:true}).waitFor();
  const reopenedEditor=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });await fillComposer(page,reopenedEditor,'/workflows');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();const reopened=page.getByRole('complementary',{name:'Background tasks',exact:true});await reopened.waitFor();const finished=reopened.getByRole('button',{name:'Finished 1'});if(await finished.getAttribute('aria-expanded')==='false')await finished.click();const restored=reopened.locator('.swf-card');await restored.waitFor();assert.equal(await restored.getAttribute('data-workflow-status'),'stopped');assert.equal(await restored.locator('.swf-heading>span').first().textContent(),'Inspect project');assert.equal(await restored.getByRole('button',{name:'Stop this workflow'}).count(),0);await restored.getByRole('button',{name:/Phase: Check, Failed/}).click();assert.equal(await restored.locator('.swf-error-trigger').count(),2);assert.deepEqual(JSON.parse(await fs.readFile(snapshotFile,'utf8')),persisted);
  await page.screenshot({path:path.join(directory,'workflow-restored-dark.png')});checks.push('Complete isolated Electron restart replays persisted stopped workflow, deduplicated phases, reserved index gaps and three agents without restarting any child or altering the snapshot');
  assert.equal(await fs.readFile(path.join(workspace,'workflow-wire.jsonl'),'utf8'),wire,'Reopening must not reconnect or restart workflow agents');
  const failedScript=path.join(workspace,'failed.workflow.js');await fs.writeFile(failedScript,'export const meta={name:"failed-fixture",description:"Failure fixture"}; phase("No agents"); throw new Error("Fixture workflow failure");');await fillComposer(page,reopenedEditor,'/workflow '+JSON.stringify(failedScript));await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await page.getByRole('dialog',{name:'Run workflow'}).getByRole('button',{name:'Run workflow',exact:true}).click();await reopened.getByRole('button',{name:'Finished 2'}).waitFor();const allFinished=reopened.getByRole('button',{name:'Finished 2'});if(await allFinished.getAttribute('aria-expanded')==='false')await allFinished.click();const failedCard=reopened.locator('.swf-card[data-workflow-status=failed]');await failedCard.waitFor();const failedRow=page.locator('.swf-terminal[data-status=failed]');await failedRow.waitFor();assert.equal(await failedRow.locator('span').first().evaluate(n=>getComputedStyle(n).color),await failedCard.locator('.swf-reason>span').first().evaluate(n=>getComputedStyle(n).color));assert.equal(await failedCard.locator('.swf-cell').count(),0);const emptyPhase=failedCard.getByRole('button',{name:/Phase: No agents/});assert.equal(await emptyPhase.evaluate(n=>getComputedStyle(n).paddingBottom),'6px');await emptyPhase.click();await failedCard.getByText('Failed before any agents started',{exact:true}).waitFor();assert.ok((await failedCard.getByRole('region',{name:'Error',exact:true}).textContent()).includes('Fixture workflow failure'));await page.screenshot({path:path.join(directory,'workflow-failed-empty.png')});checks.push('Real runner failure paints terminal verb and reason danger; empty phase keeps source6px bottom padding and shows actual no-agent failure with no invented grid cells');


  const queueScript=path.join(workspace,'queued.workflow.js');
  await fs.writeFile(queueScript,'export const meta={name:"queue-fixture",title:"Queued members",description:"Display every admitted call"};phase("Queue");const work=Array.from({length:17},(_,i)=>agent("WAIT",{label:"Queued "+(i+1)}));phase("After");return await Promise.all(work);');
  await fillComposer(page,reopenedEditor,'/workflow '+JSON.stringify(queueScript));await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await page.getByRole('dialog',{name:'Run workflow'}).getByRole('button',{name:'Run workflow',exact:true}).click();
  const queuedCard=reopened.locator('.swf-card[data-workflow-status=running]');await queuedCard.waitFor();
  await poll(async()=>await queuedCard.locator('.swf-cell:not([data-state=ghost])').count()===17,'all queued calls appear');
  await poll(async()=>await queuedCard.locator('.swf-table ul>li[data-state=progress]').count()>0,'published members become running');
  const queuedRows=queuedCard.locator('.swf-table ul>li[data-state=start]');assert.ok(await queuedRows.count()>0);assert.equal(await queuedRows.getByRole('button').count(),0);
  const queuedIds=await fs.readdir(workflowDir);let queueSnapshot,queueSnapshotFile;
  await poll(async()=>{for(const id of queuedIds){const file=path.join(workflowDir,id,'meta.json'),value=JSON.parse(await fs.readFile(file,'utf8'));if(value.name==='queue-fixture'){queueSnapshot=value;queueSnapshotFile=file;}}return queueSnapshot?.workflowProgress.filter(row=>row.type==='workflow_agent').length===17;},'queued history is persisted');
  const queuedProgress=queueSnapshot.workflowProgress;assert.deepEqual(queuedProgress.map(row=>row.type),['workflow_phase',...Array(17).fill('workflow_agent'),'workflow_phase']);assert.ok(queuedProgress.some(row=>row.type==='workflow_agent'&&row.state==='start'&&!row.childId));
  metrics.queue={agents:17,pending:await queuedRows.count(),pendingControls:0};await page.screenshot({path:path.join(directory,'workflow-queued-dark.png')});
  await queuedCard.getByRole('button',{name:'Stop this workflow'}).click();await reopened.getByRole('button',{name:'Finished 3'}).waitFor();
  await poll(async()=>JSON.parse(await fs.readFile(queueSnapshotFile,'utf8')).status==='stopped','queue run stops and persists');
  assert.equal(JSON.parse(await fs.readFile(queueSnapshotFile,'utf8')).workflowProgress.filter(row=>row.type==='workflow_agent').length,17);
  checks.push('Seventeen actual agent calls persist before the later phase; queued cells remain pending without member controls and publication updates rows without duplication');

  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await reopened.locator('.swf-cell').first().evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(rendererErrors.length,0);await verifySource();
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.rcClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.length) await clipboard.write(saved); else await clipboard.clear();
        delete globalThis.rcClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { metrics.clipboardRestoreError = String(error); failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "workflows-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, rendererErrorStacks, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "workflows-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
