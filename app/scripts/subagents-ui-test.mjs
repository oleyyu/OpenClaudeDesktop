// 0.2.81: shared-14 fN is an atomic editor node; read the contenteditable serialized draft API.
import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// File tools acceptance: approval-current:4164–4238,6370–6390,6784–6837;
// cf6ae6197:6903–6962/6986–7031/16245–16440. Protocol fixture only,
// isolated data + CODEX_HOME, 1324x768, verified build, full clipboard restore.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `subagents-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);


const RC='agent-parent', OTHER='agent-other';
const now=Math.floor(Date.now()/1000);
const parent={id:RC,name:'Agent fixture',cwd:workspace,historyMode:'paginated',createdAt:now,updatedAt:now,turns:[]};
const other={id:OTHER,name:'Other fixture',cwd:workspace,historyMode:'paginated',createdAt:now,updatedAt:now,turns:[{id:'other-turn',status:'completed',items:[{id:'other-text',type:'agentMessage',text:'OTHER_SESSION'}]}]};
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',threadIds:[RC,OTHER],sidebarWidth:288}));
await fs.writeFile(path.join(profile,'fixture-threads.json'),JSON.stringify({next:900,threads:{[RC]:parent,[OTHER]:other}}));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const checks=[],metrics={},rendererErrors=[];
let app,page,build,failure,runtime,clipboardSaved=false,clipboardRestored=false,profileRemoved=false;
const testSources=['scripts/subagents-ui-test.mjs','tests/fixtures/codex-server.cjs','src/agent-model.mjs'];
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
const row = id => page.locator(`.source-step[data-transcript-item-id="${id}"]`);
const body = id => row(id).locator(".sft-card");
async function expand(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") !== "true") { await trigger.focus(); await trigger.press("Enter"); }
  await row(id).locator(".source-step-detail").waitFor();
}
async function collapse(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") === "true") { await trigger.focus(); await trigger.press("Enter"); }
}
async function send(text) {
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
// Resolve a CDS token to the colour the renderer actually paints.
async function tokenColor(name) {
  return page.evaluate(name => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}
const readClipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());

try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  // This suite never writes the clipboard.
  await page.locator(`[data-source-session-id="${RC}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();
  const sendPhase=async phase=>{
    const composer=page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ });
    await composer.fill(`fixture:agent-phase:${phase}`);
    await composer.press('Enter');
    await poll(async()=>await composer.evaluate(node=>node.value)==='','steer accepted by real composer transport');
  };
  await send('fixture:agent-demo');
  const agent=page.locator('.source-chat-tile-content .sag[data-agent-thread-id]');
  await agent.waitFor();
  const childId=await agent.getAttribute('data-agent-thread-id');
  const trigger=agent.locator('.sag-trigger');
  assert.equal(await agent.getAttribute('data-agent-state'),'running','spawn completed is only an acknowledgement');
  assert.equal(await trigger.evaluate(node=>node.getBoundingClientRect().width),318);
  assert.equal(await trigger.getAttribute('aria-expanded'),null);
  assert.equal(await trigger.getAttribute('data-transcript-keeps-pin'),'');
  // R08: a div[role=button] agent row is an arrow under :root[data-dframe] (desktop-layout.css:1026-1032).
  assert.equal(await trigger.evaluate(node=>getComputedStyle(node).cursor),'default');
  assert.equal(await trigger.locator('.sag-description').textContent(),'nova · reviewer');
  await page.screenshot({path:path.join(directory,'running-card.png')});
  const parentScroll=await page.locator('.source-chat-tile-content .transcript').evaluate(node=>node.scrollTop);
  await trigger.focus();await page.keyboard.press('Enter');
  const pane=page.locator('.sag-pane');await pane.waitFor();
  await pane.locator('.sag-model-note').waitFor();
  assert.equal(await pane.locator('.sag-model-note').textContent(),'Model gpt-6-astra');
  assert.equal(await pane.locator('.sag-pane-title').textContent(),'nova · reviewer');
  // panes-tile-current:16235: tasks now has a real root list, so one child view can return to it.
  assert.equal(await pane.getByRole('button',{name:'Back',exact:true}).count(),1);
  assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').evaluate(node=>node.getBoundingClientRect().height),20);
  assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').textContent(),'Thinking…');
  await poll(async()=>await pane.locator('[data-cds="Spark"]').getAttribute('data-spark-rendering')==='sprite','thinking sprite loads');
  const spark=pane.locator('.sag-transcript div[role="status"].min-h-5 [data-cds="Spark"]');
  assert.deepEqual(await spark.evaluate(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,overflow:getComputedStyle(node).overflow})),{width:18,height:18,overflow:'hidden'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await poll(async()=>await spark.getAttribute('data-spark-rendering')!=='sprite','reduced motion uses static spark');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await pane.locator('[data-cds="UserMessage"]').count(),1);
  assert.equal(await pane.locator('.source-user-actions').count(),0,'agent prompt has no parent-message rollback controls');
  assert.ok(await pane.locator('.source-pane-header').evaluate(node=>node.contains(document.activeElement)));
  assert.equal(await page.locator('.source-chat-tile-content .transcript').evaluate(node=>node.scrollTop),parentScroll);
  checks.push('Completed spawn acknowledgement remains running; source 318px card navigates via Enter without disclosure, with Model/prompt/20px Thinking row and focused header');

  await sendPhase('activity');
  await poll(async()=>await agent.locator('.sag-activity').textContent()==='· Run command · 3','three child tools roll up');
  assert.equal(await agent.locator('.sag-card').count(),0);
  assert.equal(await agent.locator('.sag-model').textContent(),'gpt-6-astra');
  const expectedColor=async token=>page.evaluate(token=>{const n=document.createElement('span');n.style.color=`var(${token})`;document.body.append(n);const c=getComputedStyle(n).color;n.remove();return c;},token);
  // he (approval-current.js:17127-17131): text-secondary while running (Ve false), muted once settled;
  // on purpose since F07 (was asserted muted while running).
  assert.equal(await agent.locator('.sag-model').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-secondary'));
  assert.equal(await agent.locator('.sag-activity').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-secondary'));
  assert.deepEqual(await trigger.evaluate(node=>[...node.children].filter(n=>n.classList.contains('sag-model')||n.classList.contains('sag-activity')).map(n=>n.className)),['sag-model','sag-activity']);
  assert.equal(await page.locator('.source-chat-tile-content [data-transcript-item-id="agent-tool-0"]').count(),0);
  assert.equal(await pane.locator('[data-cds="UserMessage"]').count(),1,'real prompt replaces synthesized view without duplicate');
  const group=pane.locator('.stg-trigger');await group.click();
  assert.equal(await pane.locator('.stg-row').count(),3);
  await pane.locator('[data-transcript-item-id="agent-tool-0"] .source-step-trigger').click();
  await pane.getByText('CHILD_TOOL_OUTPUT_0',{exact:true}).waitFor();
  await page.screenshot({path:path.join(directory,'child-activity.png')});
  checks.push('Child-only tools render in nested transcript and roll up exactly 3 tools; model precedes heartbeat; child prompt deduplicates');

  await sendPhase('nested');
  const nested=pane.locator('[data-transcript-item-id="nested-spawn"] .sag-trigger');await nested.waitFor();
  await nested.focus();await page.keyboard.press(' ');
  await poll(async()=>await pane.locator('.sag-pane-title').textContent()==='echo','nested target opens');
  await pane.getByText('NESTED_AGENT_RESULT',{exact:true}).waitFor();
  await pane.getByRole('button',{name:'Back',exact:true}).click();
  await poll(async()=>await pane.locator('.sag-pane-title').textContent()==='nova · reviewer','Back restores first child');
  checks.push('Nested spawn opens its own real thread; Back pops view stack without mixing parent/grandchild items');

  await page.locator(`[data-source-session-id="${OTHER}"] .source-session-open`).click();
  await page.getByText('OTHER_SESSION',{exact:true}).waitFor();assert.equal(await page.locator('.sag-pane').count(),0);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();
  await pane.waitFor();assert.equal(await pane.locator('.sag-pane-title').textContent(),'nova · reviewer');
  assert.equal(await page.locator(`[data-source-session-id="${childId}"]`).count(),0,'child never becomes sidebar session');
  await pane.locator('.source-pane-header button').first().focus();await page.keyboard.press('Escape');
  await pane.waitFor({state:'detached'});
  assert.ok(await trigger.evaluate(node=>node===document.activeElement),'Escape after session return resolves the remounted opener');
  await trigger.focus();await page.keyboard.press(' ');await pane.waitFor();
  await pane.locator('.source-pane-header button').first().focus();await page.keyboard.press('Escape');
  assert.ok(await trigger.evaluate(node=>node===document.activeElement),'Escape restores connected opener');
  await trigger.click();await pane.waitFor();
  checks.push('Per-session child view survives session switch; child omitted from sidebar; Space opens and Escape closes/restores focus');

  await sendPhase('completed');
  await poll(async()=>await agent.getAttribute('data-agent-state')==='completed','child turn completion settles parent row');
  assert.equal(await agent.locator('.sag-verb').textContent(),'Ran agent');
  assert.equal(await agent.locator('.sag-activity').count(),0);
  // F07 :16885-16888: the model stays visible once settled, muted.
  assert.equal(await agent.locator('.sag-model').textContent(),'gpt-6-astra');
  assert.equal(await agent.locator('.sag-model').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-muted'));
  await pane.getByText('CHILD_FINAL_RESULT',{exact:true}).waitFor();
  assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').count(),0);
  const calls=(await fs.readFile(path.join(profile,'fixture-history.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.ok(calls.some(call=>call.method==='thread/turns/list' && call.params.threadId===childId),'child uses real paginated history RPC');
  assert.equal(calls.some(call=>call.method==='thread/read' && call.params.threadId===childId && call.params.includeTurns===true),false);
  checks.push('Actual child completion settles row, removes heartbeat and displays child result; child history uses paginated read/list');

  for(const [wire,status,word] of [['interrupted','stopped','Stopped'],['failed','failed','Failed to run agent']]) {
    await send('fixture:agent-demo');
    const newest=page.locator('.source-chat-tile-content .sag[data-agent-thread-id]').last();
    await poll(async()=>await newest.getAttribute('data-agent-state')==='running','next child running');
    await newest.locator('.sag-trigger').click();
    await sendPhase(wire);
    await poll(async()=>await newest.getAttribute('data-agent-state')===status,'child terminal state');
    assert.ok((await newest.textContent()).includes(word));
    await pane.getByText(`No result — task ${status}`,{exact:true}).waitFor();
    assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').count(),0);
    if(status==='failed')assert.equal(await newest.locator('.sag-verb').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-danger'));
  }
  checks.push('Real interrupted and failed child turns show Stopped/Failed to run agent and exact no-result states; thinking sprite is 18px clipped and static under reduced motion');
  await send('fixture:agent-demo');
  const emptyAgent=page.locator('.source-chat-tile-content .sag[data-agent-thread-id]').last();
  await poll(async()=>await emptyAgent.getAttribute('data-agent-state')==='running','empty child starts');
  await emptyAgent.locator('.sag-trigger').click();
  await sendPhase('empty');
  await poll(async()=>await emptyAgent.getAttribute('data-agent-state')==='completed','empty child completes');
  assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').count(),1,'Ex retains Thinking for the real completion/result race');
  await pane.getByText('No result — task ended',{exact:true}).waitFor();
  assert.equal(await pane.locator('.sag-transcript div[role="status"].min-h-5').count(),0);
  checks.push('Completed child with no result keeps the 2500ms wait then shows No result — task ended');
  // F07 oO/Ie (approval-current.js:4271-4296, :16921-16934, :17112-17126): a DeepSeek delegation
  // with a description reads it in the row's tense instead of 'Running agent'/'Ran agent' + name.
  await send('fixture:agent-demo-described');
  const described=page.locator('.source-chat-tile-content .sag[data-agent-thread-id]').last();
  await poll(async()=>await described.getAttribute('data-agent-state')==='running','described child starts');
  await described.locator('.sag-trigger').click();
  await sendPhase('activity');
  await poll(async()=>await described.locator('.sag-verb').textContent()==='Auditing the login flow','running tense label');
  assert.equal(await described.locator('.sag-name').count(),0,'no name beside a description label');
  assert.equal(await described.locator('.sag-verb').getAttribute('data-described'),'');
  assert.equal(await described.locator('.sag-model').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-secondary'));
  await sendPhase('completed');
  await poll(async()=>await described.getAttribute('data-agent-state')==='completed','described child completes');
  assert.equal(await described.locator('.sag-verb').textContent(),'Audited the login flow');
  assert.ok(!(await described.locator('.sag-trigger').textContent()).includes('Ran agent'));
  assert.equal(await described.locator('.sag-model').textContent(),'gpt-6-astra');
  assert.equal(await described.locator('.sag-model').evaluate(n=>getComputedStyle(n).color),await expectedColor('--cds-text-muted'));
  await page.screenshot({path:path.join(directory,'described-agent-done.png')});
  checks.push("F07 described delegation: 'Auditing the login flow' while running (secondary model, no name), 'Audited the login flow' when done with the muted model still shown");
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:path.join(directory,'completed-light.png')});
  await page.evaluate(()=>{document.documentElement.dataset.mode='dark';}); // no appearance row in the account menu (shared-21 $B)
  await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');
  await page.screenshot({path:path.join(directory,'completed-dark.png')});
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
  const report = { schemaVersion: 1, suite: "subagents-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "subagents-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
