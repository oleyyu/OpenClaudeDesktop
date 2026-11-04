import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Claude 2.2553.1 shared-11/cc183b3ab slash contract; real-shaped isolated
// Codex protocol fixture. Never opens user sessions or writes the clipboard.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `background-tasks-ui-${startedAt.replaceAll(":", "-")}`);
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
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const checks=[],metrics={},rendererErrors=[];
let app,page,build,failure,runtime,clipboardSaved=false,clipboardRestored=false,profileRemoved=false;
const testSources=['scripts/background-tasks-ui-test.mjs','tests/fixtures/codex-server.cjs','src/background-tasks-model.mjs','electron/background-tasks.cjs'];
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
  app=await electron.launch({executablePath,args:[root],env});page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>rendererErrors.push(e.message));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324&&innerHeight===768);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.getByText('ORIGINAL_RESPONSE',{exact:true}).waitFor();
  const editor=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });await editor.fill('fixture:background-command');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  const command=page.locator('.source-step').filter({hasText:'sleep 30'}),commandTrigger=command.locator('.source-step-trigger');
  // Product correction (0.2.116): approval-current.js:17279 renders XM "View live output" in the row
  // heading (`ne ? GM{toolUseId}`), not in the KE running footer (:2894-2925); it opens the pane
  // without expanding the row (XM onClick stopPropagation). Previously this clicked the trigger first.
  const live=commandTrigger.locator('button[data-row-live]');await live.waitFor();
  assert.equal(await commandTrigger.getAttribute('aria-expanded'),'false');assert.equal(await live.isVisible(),true);
  const cssColor=(locator,value)=>locator.evaluate((el,value)=>{const probe=document.createElement('span');probe.style.color=value;el.parentElement.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;},value);
  metrics.liveHeader=await live.evaluate(el=>{const cs=getComputedStyle(el),caret=el.parentElement.querySelector('.source-step-caret');return {text:el.textContent,type:el.type,color:cs.color,decoration:cs.textDecorationLine,shrink:cs.flexShrink,radius:cs.borderRadius,
    beforeCaret:!!(caret&&(el.compareDocumentPosition(caret)&Node.DOCUMENT_POSITION_FOLLOWING)),afterMeta:!!(el.previousElementSibling?.classList.contains('source-step-meta')),inFooter:!!el.closest('.src-cmd-footer')};});
  metrics.liveHeader.expectedColor=await cssColor(live,'var(--cds-text-primary)');
  await live.hover();metrics.liveHeader.hover=await live.evaluate(el=>({decoration:getComputedStyle(el).textDecorationLine,offset:getComputedStyle(el).textUnderlineOffset}));
  assert.deepEqual({...metrics.liveHeader,color:undefined,expectedColor:undefined},{text:'View live output',type:'button',decoration:'none',shrink:'0',radius:'3px',beforeCaret:true,afterMeta:true,inFooter:false,hover:{decoration:'underline',offset:'3px'},color:undefined,expectedColor:undefined});
  assert.equal(metrics.liveHeader.color,metrics.liveHeader.expectedColor);await page.mouse.move(1,1);
  checks.push('View live output renders in the collapsed command row heading after the meta and before the caret, text-primary with a 3px hover underline offset (XM :16345-16365, :17279)');
  // Y5 K/P (scroll-messages-current.js:58273-58327, :58615-58628): "{n} running tasks" ghost xs
  // button after the stats (U5 middot) toggles the tasks pane with aria-pressed.
  const statusRow=page.locator('[data-testid=code-transcript-status]'),tasksButton=statusRow.locator('button.sts-tasks');
  await poll(async()=>await tasksButton.textContent()==='1 running task'&&await tasksButton.evaluate(el=>el.previousElementSibling?.classList.contains('sts-separator')&&el.previousElementSibling.textContent==='·'&&!!el.previousElementSibling.previousElementSibling?.matches('[data-runtime-stat]')),'running tasks button after the stats separator');
  metrics.tasksButton=await tasksButton.evaluate(el=>{const label=el.querySelector('.sts-tasks-label'),next=el.nextElementSibling;return {type:el.type,pressed:el.getAttribute('aria-pressed'),variant:el.dataset.variant,size:el.dataset.size,flush:el.dataset.flush,font:getComputedStyle(label).fontSize,color:getComputedStyle(el).color,
    before:{position:getComputedStyle(el,'::before').position,top:getComputedStyle(el,'::before').top,bottom:getComputedStyle(el,'::before').bottom,left:getComputedStyle(el,'::before').left,right:getComputedStyle(el,'::before').right},next:next?.classList.contains('sts-separator')&&next.nextElementSibling?.classList.contains('sts-activity'),
    hidden:!!el.closest('[aria-hidden="true"]')};});
  metrics.tasksButton.expected=await tasksButton.evaluate(el=>{const probe=document.createElement('span');probe.style.cssText='font-size:var(--cds-font-size-footnote);color:var(--cds-text-secondary)';el.parentElement.append(probe);const a=getComputedStyle(probe);const result={font:a.fontSize,color:a.color};probe.style.color='var(--cds-text-accent)';result.accent=getComputedStyle(probe).color;probe.remove();return result;});
  assert.deepEqual({type:metrics.tasksButton.type,pressed:metrics.tasksButton.pressed,variant:metrics.tasksButton.variant,size:metrics.tasksButton.size,flush:metrics.tasksButton.flush,next:metrics.tasksButton.next,hidden:metrics.tasksButton.hidden,before:metrics.tasksButton.before},
    {type:'button',pressed:'false',variant:'ghost',size:'xs',flush:'both',next:true,hidden:false,before:{position:'absolute',top:'-10px',bottom:'-10px',left:'0px',right:'0px'}});
  assert.equal(metrics.tasksButton.font,metrics.tasksButton.expected.font);assert.equal(metrics.tasksButton.color,metrics.tasksButton.expected.color);assert.notEqual(metrics.tasksButton.expected.accent,metrics.tasksButton.expected.color);
  await tasksButton.hover();metrics.tasksButton.hoverColor=await tasksButton.evaluate(el=>getComputedStyle(el).color);assert.equal(metrics.tasksButton.hoverColor,metrics.tasksButton.expected.accent);
  await page.screenshot({path:path.join(directory,'running-task-status.png')});
  const pane=page.getByRole('complementary',{name:'Background tasks',exact:true});
  await tasksButton.click();await pane.waitFor();assert.equal(await tasksButton.getAttribute('aria-pressed'),'true');
  await tasksButton.click();await pane.waitFor({state:'detached'});assert.equal(await tasksButton.getAttribute('aria-pressed'),'false');await page.mouse.move(1,1);
  checks.push('Status row shows "1 running task" after the stats middot in footnote/text-secondary (accent on hover), and toggles the Background tasks pane with aria-pressed');
  await live.click();await pane.waitFor();assert.equal(await commandTrigger.getAttribute('aria-expanded'),'false','heading View live output does not toggle the row');
  assert.equal(await tasksButton.getAttribute('aria-pressed'),'true');const task=pane.locator('[data-task-id][data-status] > div');await task.waitFor();
  // Background terminal inventory is fetched asynchronously (main poll 2s).
  // Wait for its actual running report before checking the settled card;
  // never infer running solely from the presence of a command row.
  await poll(async()=>await task.getAttribute('data-status')==='running','authoritative background inventory reports running');
  assert.equal(await task.getAttribute('data-status'),'running');const trigger=task.getByRole('button',{name:'Background task: sleep 30'});assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  await task.getByRole('region',{name:'Output for sleep 30'}).waitFor();metrics.geometry=await task.evaluate(el=>{const body=el.firstElementChild,out=el.querySelector('pre[aria-label^="Output"]'),content=el.closest('[class~="min-w-[220px]"]');return {radius:getComputedStyle(el).borderRadius,padding:getComputedStyle(body).padding,contentPadding:getComputedStyle(content).padding,maxHeight:getComputedStyle(out).maxHeight,font:getComputedStyle(out).fontSize,lineHeight:getComputedStyle(out).lineHeight};});assert.deepEqual(metrics.geometry,{radius:'8px',padding:'8px',contentPadding:'10px',maxHeight:'200px',font:'12px',lineHeight:'17px'});checks.push('Real background process opens the tasks pane from the heading View live output, expands and renders source card/output geometry');
  // cccc2cf0a zb + c7146e7f4: actual fixture output carries ANSI text;
  // selecting/reopening output never injects fake task DOM or output values.
  const output = task.getByRole('region', { name: 'Output for sleep 30' });
  await output.locator('span').filter({ hasText: 'background output' }).waitFor();
  assert.equal(await output.locator('span').filter({ hasText: 'background output' }).evaluate(el => getComputedStyle(el).color), 'rgb(113, 140, 0)');
  assert.equal(await output.locator('script').count(), 0);
  assert.ok((await output.textContent()).includes('<script>literal output</script>'));
  const commandCode = task.getByRole('region', { name: 'Command for sleep 30' });
  await commandCode.locator('[data-highlight-source="settled"]').waitFor();
  assert.equal(await commandCode.locator('.src-cmd-prompt').textContent(), '$\u00a0');
  assert.equal(await commandCode.locator('.src-cmd-text').textContent(), 'sleep 30');
  assert.equal(await commandCode.getByRole('button', { name: 'Copy', exact: true }).count(), 0);
  await poll(() => output.evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight < 16), 'initial output follows bottom');
  await output.evaluate(el => { el.scrollTop = 0; });
  await poll(() => output.evaluate(el => el.scrollTop === 0), 'user scrolls to output start');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await trigger.click(); await output.waitFor({ state: 'detached' });
  await trigger.click(); await output.waitFor();
  assert.equal(await output.evaluate(el => el.scrollTop), 0);
  checks.push('Background command uses the shared syntax card and ANSI output, escapes HTML-looking text, and preserves paused follow intent after collapse/reopen');
  await page.evaluate(()=>{window.tasksButtonTrace=[];const record=()=>{const text=document.querySelector('[data-testid=code-transcript-status] button.sts-tasks')?.textContent??null;if(window.tasksButtonTrace.at(-1)?.text!==text)window.tasksButtonTrace.push({text,at:performance.now()});};window.tasksButtonObserver=new MutationObserver(record);window.tasksButtonObserver.observe(document.body,{subtree:true,childList:true,characterData:true});record();});
  await task.getByRole('button',{name:'Stop this task'}).click();await pane.getByRole('status').filter({hasText:'Stop requested'}).waitFor();await pane.getByRole('button',{name:'Finished 1'}).waitFor();
  // Whe :58132-58145 (Uhe 1500ms): the finished count is held, then the button leaves.
  await page.waitForFunction(()=>!document.querySelector('[data-testid=code-transcript-status] button.sts-tasks'),null,{timeout:3000});
  metrics.finishedTrace=await page.evaluate(()=>{window.tasksButtonObserver.disconnect();return window.tasksButtonTrace;});
  assert.deepEqual(metrics.finishedTrace.map(x=>x.text),['1 running task','1 task finished',null]);
  metrics.finishedHoldMs=metrics.finishedTrace[2].at-metrics.finishedTrace[1].at;assert.ok(metrics.finishedHoldMs>=1450&&metrics.finishedHoldMs<=2600,`finished hold ${metrics.finishedHoldMs}ms`);
  checks.push('After the command ends the status button reads "1 task finished" and is removed after the 1500ms hold');assert.equal(await pane.getByRole('button',{name:'Finished 1'}).getAttribute('aria-expanded'),'false');await pane.getByRole('button',{name:'Finished 1'}).click();await pane.getByText('Completed',{exact:true}).waitFor();
  // 0.155.1 CommandExecutionStatus has no interrupted; the fixture reports completed/143.
  assert.equal(await pane.getByText('Stopped',{exact:true}).count(),0);const trace=(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(trace.filter(r=>r.method==='thread/backgroundTerminals/terminate').length,1);checks.push('Stop dispatches actual terminate, waits for actual item completion, never infers Stopped from exit code');
  await pane.getByRole('button',{name:'Clear finished tasks'}).click();await pane.getByText('Background tasks appear here',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('codeDesktop.dismissedTasks'))).flat().length),1);await page.screenshot({path:path.join(directory,'tasks-cleared.png')});checks.push('Finished starts collapsed, clearing persists per session and restores the source empty state');assert.deepEqual(rendererErrors,[]);

  // 0.2.35 race contract: release an inventory captured before a live start.
  // All state still arrives through actual app-server notifications and IPC.
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({state:'detached'});
  const marker=name=>path.join(profile,'fixture-background-'+name);
  const exists=async file=>fs.access(file).then(()=>true,()=>false);
  const rpcStart=async text=>page.evaluate(({threadId,text})=>window.desktop.call('rpc',{method:'turn/start',params:{threadId,input:[{type:'text',text}]}}),{threadId:RC,text});
  const requests=async()=>String(await fs.readFile(path.join(profile,'fixture-requests.jsonl'))).trim().split('\n').map(JSON.parse);
  await fs.writeFile(marker('hold-next-list'),'isolated');await poll(()=>exists(marker('list-held')),'inventory request is held before new start');
  assert.deepEqual(JSON.parse(await fs.readFile(marker('list-held'))).data,[]);
  const race=await rpcStart('fixture:background-command'),raceId='bash:background-'+race.turn.id;
  const raceTask=pane.locator(`[data-task-id="${raceId}"]`);await raceTask.waitFor();
  await page.evaluate(id=>{window.taskRaceStates=[];const record=()=>{const row=document.querySelector(`[data-task-id="${id}"]`);if(row)window.taskRaceStates.push(row.dataset.status);};window.taskRaceObserver=new MutationObserver(record);window.taskRaceObserver.observe(document.querySelector('[class~="scroll-py-2.5"]'),{subtree:true,childList:true,attributes:true});record();},raceId);
  assert.equal(await raceTask.getAttribute('data-status'),'running');
  await fs.writeFile(marker('release-list'),'isolated');await poll(()=>exists(marker('list-released')),'old empty inventory released');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await raceTask.getAttribute('data-status'),'running');
  await fs.writeFile(marker('hold-completion'),'isolated');
  const beforeStop=(await requests()).filter(x=>x.method==='thread/backgroundTerminals/list').length;
  await raceTask.getByRole('button',{name:'Stop this task'}).click();
  await poll(async()=>(await requests()).filter(x=>x.method==='thread/backgroundTerminals/terminate').length===2,'early stop reaches actual terminate after refreshed inventory');
  assert.equal((await requests()).filter(x=>x.method==='thread/backgroundTerminals/list').length,beforeStop+1);
  assert.equal(await raceTask.getAttribute('data-status'),'running');assert.equal(await raceTask.getByRole('button',{name:'Stop this task'}).isDisabled(),true);
  metrics.raceStates=await page.evaluate(()=>{window.taskRaceObserver.disconnect();return window.taskRaceStates;});assert.ok(metrics.raceStates.length);assert.ok(metrics.raceStates.every(x=>x==='running'));
  await page.screenshot({path:path.join(directory,'early-stop-pending.png')});
  await fs.writeFile(marker('release-completion'),'isolated');await pane.getByRole('button',{name:'Finished 1'}).waitFor();
  // Previous toggle was open; actual settled task is immediately visible.
  await raceTask.waitFor();await poll(async()=>await raceTask.getAttribute('data-status')==='completed','authoritative completion');
  checks.push('A deliberately delayed empty inventory cannot negate a later live start; early Stop refreshes real membership, sends one terminate, stays running/busy until item/completed');

  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({state:'detached'});
  const dropped=await rpcStart('fixture:background-command-disconnect'),dropId='bash:background-'+dropped.turn.id;
  const dropTask=pane.locator(`[data-task-id="${dropId}"]`);await dropTask.waitFor();assert.equal(await dropTask.getAttribute('data-status'),'running');
  await fs.writeFile(marker('disconnect'),'isolated');
  await poll(async()=>await dropTask.getAttribute('data-status')==='unknown','connection loss reports unknown process status');
  assert.equal(await dropTask.getByRole('button',{name:'Stop this task'}).count(),0);
  // W14-code r5pa-05: cccc2cf0a lists such a task under Running with no status word (no Status unavailable section).
  assert.equal(await dropTask.getByText('Status unavailable',{exact:true}).count(),0);
  const disconnectedGroup=page.locator(`[data-tool-group="background-${dropped.turn.id}"]`);
  await poll(async()=>(await disconnectedGroup.locator('.stg-trigger').textContent()).includes('Status unavailable'),'collapsed batch reports unknown despite a completed neighbor');
  assert.deepEqual(await disconnectedGroup.locator('.stg-summary').evaluateAll(nodes=>nodes.filter(node=>!node.closest('[aria-hidden="true"]')).map(node=>node.textContent)),['Ran 2 commands']);
  await disconnectedGroup.locator('.stg-trigger').click();
  const disconnectedRow=page.locator(`[data-transcript-item-id="background-${dropped.turn.id}"]`);
  assert.equal(await disconnectedRow.getAttribute('data-state'),'unknown');assert.equal(await disconnectedRow.locator('.source-step-outcome').textContent(),'Status unavailable');
  await disconnectedRow.locator('.source-step-trigger').focus();await page.keyboard.press('Enter');
  assert.ok(!(await disconnectedRow.textContent()).includes('Tool execution was interrupted.'));
  await page.screenshot({path:path.join(directory,'disconnected-status.png')});
  await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
  await settings.getByRole('textbox',{name:'Search settings'}).fill('Codex core');await settings.getByRole('textbox',{name:'Search settings'}).press('Enter');
  await settings.getByRole('button',{name:'Reconnect',exact:true}).click();
  await poll(async()=>await settings.getByText('Connected',{exact:true}).count()===1,'actual fixture reconnect');
  await page.keyboard.press('Escape');await settings.waitFor({state:'detached'});
  await poll(async()=>await dropTask.getAttribute('data-status')==='running','new connection restores real inventory');
  assert.equal(await dropTask.getByRole('button',{name:'Stop this task'}).isEnabled(),true);
  await page.screenshot({path:path.join(directory,'reconnected-running.png')});
  checks.push('Actual fixture process exit shows Status unavailable on task, tool and mixed collapsed group without synthetic interrupted output; Settings Reconnect reads persisted real fixture membership and restores Running/Stop');
  assert.deepEqual(rendererErrors,[]);

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
  const report = { schemaVersion: 1, suite: "background-tasks-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "background-tasks-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
