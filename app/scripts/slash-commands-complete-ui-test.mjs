import {fillComposer} from './composer-test-helpers.mjs';
// 0.2.81: source skillChip requires a real contenteditable editor; read its serialized draft API, not textarea inputValue.
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
const directory = path.join(evidence, `slash-commands-complete-ui-${startedAt.replaceAll(":", "-")}`);
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
// R04 skills/list rows carrying the DeepSeek bridge's invocation policy (harness catalog.js skillsListEntry): a slash-only
// skill (disable-model-invocation: enabled false, userInvocable true) and a model-only one (user-invocable: false).
const fxSkill=(name,over)=>({name,description:`${name} fixture skill`,path:path.join(profile,'codex-home','skills',name,'SKILL.md'),scope:'user',pluginId:null,...over});
await fs.writeFile(path.join(profile,'fixture-customize.json'),JSON.stringify({skills:[{cwd:workspace,errors:[],skills:[
  fxSkill('fx-slash-only',{enabled:false,userInvocable:true,modelInvocable:false}),
  fxSkill('fx-model-only',{enabled:true,userInvocable:false,modelInvocable:true}),
  fxSkill('fx-both',{enabled:true,userInvocable:true,modelInvocable:true}),
]}]}));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME:path.join(profile,'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const checks=[],metrics={},rendererErrors=[];
let app,page,build,failure,runtime,clipboardSaved=false,clipboardRestored=false,profileRemoved=false;
const testSources=['scripts/composer-test-helpers.mjs','scripts/slash-commands-complete-ui-test.mjs','tests/fixtures/codex-server.cjs','src/session-command-model.mjs','src/slash-actions-model.mjs'];
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
  const editor=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
  const command=async text=>{await fillComposer(page,editor,text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();};
  const requests=async()=>{try{return (await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch{return [];}};
  await fillComposer(page,editor,'/');const menu=page.getByRole('menu',{name:'Slash commands',exact:true});await menu.waitFor();
  assert.equal(await menu.getByRole('menuitem').filter({hasText:/^(status|rename|export|diff)$/}).count(),0);
  await menu.getByText('More commands available once the session is running',{exact:true}).waitFor();
  metrics.menu=await menu.evaluate(node=>{const s=getComputedStyle(node),row=node.querySelector('[role=menuitem]'),r=getComputedStyle(row);return {minWidth:s.minWidth,maxHeight:parseFloat(s.maxHeight),padding:getComputedStyle(node.querySelector('.source-slash-body')).padding,outerPadding:s.padding,radius:s.borderRadius,height:row.getBoundingClientRect().height,font:r.fontSize,lineHeight:r.lineHeight,icons:node.querySelectorAll('svg').length};});
  assert.equal(metrics.menu.minWidth,'240px');assert.ok(metrics.menu.maxHeight<=384);/* shared-11 BT + shared-frame sg:4px belongs to the inner scroller. */assert.equal(metrics.menu.outerPadding,'0px');assert.equal(metrics.menu.padding,'4px');assert.equal(metrics.menu.radius,'10px');assert.equal(metrics.menu.height,24);assert.equal(metrics.menu.font,'13px');assert.equal(metrics.menu.lineHeight,'19px');assert.equal(metrics.menu.icons,0);
  await page.locator('.slash-filter').getByText('Type to filter',{exact:true}).waitFor();
  // R04 (customize-model skillInvocable): '/' lists the user-invocable skills — the slash-only one included, the model-only one omitted.
  await fillComposer(page,editor,'/fx-');await poll(async()=>await menu.getByRole('menuitem').filter({hasText:'fx-slash-only'}).count()===1,'slash-only skill in /');
  metrics.slashSkills=await menu.getByRole('menuitem').evaluateAll(nodes=>nodes.map(node=>node.querySelector('.slash-label')?.textContent??node.textContent));
  assert.deepEqual(metrics.slashSkills,['fx-both','fx-slash-only'],'model-only skill omitted from /');
  await fillComposer(page,editor,'');
  checks.push("R04 '/' lists the user-invocable skills: the slash-only (disable-model-invocation) skill is offered, the model-only (user-invocable: false) one is not");
  await fillComposer(page,editor,'/sett');await menu.getByRole('menuitem').filter({hasText:'config (settings)'}).waitFor();
  assert.equal(await menu.locator('b').textContent(),'sett');assert.equal(await menu.locator('b').evaluate(n=>getComputedStyle(n).fontWeight),'600');
  await editor.press('Escape');await editor.press('s');assert.equal(await menu.count(),0,'dismissal persists while the starting slash remains');
  // B05 C4 (2.31226.0 shared-5 mS/yS; c5cd1b4dc qt): a '/name' typed mid-message opens the list at the caret and the pick
  // becomes the chip in place of that token; a bare '/' mid-message stays closed (ca80fca8d midMessageNeedsName).
  await fillComposer(page,editor,'');await fillComposer(page,editor,'please use /them');await menu.waitFor();await editor.press('Enter');
  assert.equal(await editor.evaluate(node=>node.value),'please use /theme ');assert.equal(await editor.locator('[data-skill-chip]').count(),1);assert.equal(await menu.count(),0);
  await fillComposer(page,editor,'');await fillComposer(page,editor,'please /');await page.waitForTimeout(150);assert.equal(await menu.count(),0,'a bare / mid-message stays closed');
  checks.push("B05 C4 mid-message slash: 'please use /them' opens the list and Enter turns only that token into the /theme chip; a bare mid-message '/' stays closed");
  await fillComposer(page,editor,'');await fillComposer(page,editor,'/theme');await menu.waitFor();await editor.press('Enter');assert.equal(await editor.evaluate(node=>node.value),'/theme ');assert.equal(await menu.count(),0);assert.equal(await page.getByRole('dialog',{name:'Settings',exact:true}).count(),0,'selection does not execute');
  const hint=page.locator('[data-skill-arg-hint]');assert.equal(await hint.textContent(),'[system|light|dark]');assert.equal(await hint.getAttribute('aria-hidden'),'true');assert.equal(await hint.evaluate(n=>getComputedStyle(n).opacity),'0.5');
  // Fidelity F05 (cc43287c9-BMbiZYzF.js:30292, :33700-33716): slash notices are CDS toasts (addSuccess → neutral), never the
  // removed .inline-notice row; this replaces the former role=status row expectation on purpose.
  const toast=(text,variant)=>page.locator(`[data-cds="Toast"] .source-toast-card${variant?`[data-variant="${variant}"]`:''}`).filter({hasText:text});
  await editor.press('d');assert.equal(await hint.count(),0);await fillComposer(page,editor,'/theme dark');await editor.press('Enter');await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');await toast('Appearance set to Dark','neutral').waitFor();
  // git-layout-shared.js:12302-12440 kN: the composer zone is a toast safe region, so the toast sits above it (not over Send).
  const toastLift=async text=>{await page.waitForFunction(text=>[...document.querySelectorAll('[data-cds="Toast"] .source-toast-card[data-phase="open"]')].some(node=>node.textContent.includes(text)&&node.getAnimations().length===0),text);
    return page.evaluate(text=>{const card=[...document.querySelectorAll('[data-cds="Toast"] .source-toast-card')].find(node=>node.textContent.includes(text)),zone=document.querySelector('[data-toast-safe-region]');
      return {above:card.getBoundingClientRect().bottom<=zone.getBoundingClientRect().top,clearance:document.querySelector('[data-cds="Toast"]').style.getPropertyValue('--toast-clearance'),mode:document.documentElement.dataset.mode};},text);};
  metrics.toastDark=await toastLift('Appearance set to Dark');await page.screenshot({path:path.join(directory,'theme-toast-dark.png')});
  await command('/theme light');await page.waitForFunction(()=>document.documentElement.dataset.mode==='light');await toast('Appearance set to Light','neutral').waitFor();
  metrics.toastLight=await toastLift('Appearance set to Light');await page.screenshot({path:path.join(directory,'theme-toast-light.png')});
  assert.ok(metrics.toastDark.above&&metrics.toastLight.above&&/^\d+px$/.test(metrics.toastLight.clearance),`toasts clear the composer: ${JSON.stringify([metrics.toastDark,metrics.toastLight])}`);
  assert.equal(await page.locator('.inline-notice').count(),0,'no inline notice row');
  checks.push('Source menu geometry and unavailable gates; alias highlights; persistent Escape; Enter inserts text and accessible argument hint before execution');
  /* /compact now takes [instructions] (session-command-model); /status still takes none. */await command('/status x');await page.getByRole('alert').filter({hasText:'doesn’t take arguments here'}).waitFor();
  await command('/diff\nfoo');await page.getByRole('alert').filter({hasText:'only works on a single line'}).waitFor();
  await command('/compac');await page.getByRole('alert').filter({hasText:'isn’t a command here'}).waitFor();await page.getByRole('button',{name:'/compact',exact:true}).click();assert.equal(await editor.evaluate(node=>node.value),'/compact ');
  assert.equal((await requests()).filter(r=>r.method==='turn/start').length,0);
  await fillComposer(page,editor,'');await page.getByRole('button',{name:'Add',exact:true}).click();const add=page.getByRole('menu',{name:'Add',exact:true});/* R05 (c099c328d :8052-8330 em = [Qp, ...Kp, ...Hp]) + B31 (ca80fca8d zN): in the draft 'Slash commands' follows 'Add files or photos', 'Add folder' and 'Import GitHub issue' (enabled, or disabled with its reason). */await add.getByRole('menuitem',{name:'Import GitHub issue'}).waitFor();assert.deepEqual(await add.getByRole('menuitem').evaluateAll(nodes=>nodes.slice(0,4).map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll('[aria-hidden="true"],[hidden]').forEach(n=>n.remove());return copy.textContent;})),['Add files or photos','Add folder','Import GitHub issue','Slash commands']);await add.getByRole('menuitem',{name:'Slash commands',exact:true}).click();await menu.waitFor();assert.equal(await editor.evaluate(node=>node.value),'/');await editor.press('Escape');
  assert.equal(await page.locator('.session-command-palette').count(),0);
  checks.push('Source single-line/no-args/unknown suggestion errors do not send; Add first row opens slash input without a command modal');
  await fillComposer(page,editor,'');await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();await page.getByText('ORIGINAL_RESPONSE',{exact:true}).waitFor();
  await command('/status');const status=page.locator('[data-local-command="status"]');await status.waitFor();await status.getByText('80% remaining',{exact:true}).waitFor();assert.equal(await page.getByRole('dialog',{name:'Session status',exact:true}).count(),0);assert.match(await status.innerText(),/Context tokens\nUnavailable/);
  await page.screenshot({path:path.join(directory,'status-light.png')});
  // :33437-33444 / :33800-33810: a command error is a warning toast, not the composer banner.
  await command('/model nonexistent');await toast('“nonexistent” isn’t an available model.','warning').waitFor();assert.equal(await page.locator('.composer-error').count(),0,'no composer banner for a command error');
  await command('/effort high');/* In an open session /effort is that session's own (sessionMetadata[id].effort); the Settings default stays. */await poll(async()=>{const prefs=JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8'));return prefs.sessionMetadata?.[RC]?.effort==='high'&&prefs.effort!=='high';},'effort persisted for the session');
  // :11310-11322 addWarning(…, {uniqueKey:'epitaxy-fast-command-notice'}): a repeat replaces the keyed toast instead of stacking.
  await command('/fast on');await poll(async()=>await editor.evaluate(node=>node.value)===''&&JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).fastMode===true,'first fast command acknowledged');await command('/fast on');await toast('Fast mode is already on.','warning').waitFor();
  await poll(async()=>await editor.evaluate(node=>node.value)==='','second fast command acknowledged');await command('/fast on');await page.waitForTimeout(300);
  metrics.fastToast=await toast('Fast mode is already on.').evaluateAll(nodes=>nodes.filter(node=>node.dataset.phase!=='ending').map(node=>node.textContent));
  assert.equal(metrics.fastToast.length,1,'one keyed toast');assert.ok(!metrics.fastToast[0].includes('×'),'the keyed toast is replaced, not counted');
  await command('/name Renamed fixture');await page.locator('.st-title').filter({hasText:'Renamed fixture'}).waitFor();assert.equal(await page.getByRole('dialog',{name:'Rename session'}).count(),0);
  await command('/plan Explain the change');await poll(async()=>await editor.evaluate(node=>node.value)==='Explain the change','plan leaves description in draft');await fillComposer(page,editor,'');
  // :33860-33877: already planning with no plan written → the 'No plan written yet' warning toast (uniqueKey epitaxy-plan-command-notice).
  await command('/plan');await toast('Already in plan mode. No plan written yet.','warning').waitFor();
  // :28890-28916 vG: a description while already planning still goes to the draft, with 'Already in plan mode.' (same key).
  await command('/plan Explain again');await poll(async()=>await editor.evaluate(node=>node.value)==='Explain again','plan description while planning');
  await toast(/Already in plan mode\.(?! No plan)/,'warning').waitFor();await fillComposer(page,editor,'');
  // /continue (= /resume) opens 'Resume a session' searching for its argument (thread/list), closed with Cancel.
  {const resume=page.getByRole('dialog',{name:'Resume a session'});await command('/continue Renamed');await resume.waitFor();assert.equal(await resume.getByRole('searchbox',{name:'Search sessions',exact:true}).inputValue(),'Renamed');await resume.getByRole('button',{name:'Cancel',exact:true}).click();await resume.waitFor({state:'detached'});}
  await command('/tasks');await page.locator('.sag-pane').waitFor();await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await command('/add-dir '+path.join(workspace,'extra'));await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).sessionMetadata?.[RC]?.additionalFolders?.includes(path.join(workspace,'extra')),'additional folder persisted');
  checks.push('Inline status uses real rate limits without protocol rows; model validation, effort, fast, direct rename, plan draft (and \'Already in plan mode.\' with a description while planning), resume search, tasks and validated additional directory work');
  // 0.2.68 Usage contract: user screenshot + cf400e6a4:4370–4410
  // uses a standalone Usage dialog and % used, retaining the same real 20% quota.
  await command('/usage');const usage=page.getByRole('dialog',{name:'Usage',exact:true});await usage.waitFor();await usage.getByText('Your usage',{exact:true}).waitFor();await usage.getByText('20% used',{exact:true}).waitFor();/* fidelity F14: shared-22:4511-4515 names the stacked header's close button 'Close'. */await usage.getByRole('button',{name:'Close',exact:true}).click();
  // shared-22 cw:4548–4606 keeps the modal/inert for its 200ms exit.
  await usage.waitFor({state:'detached'});
  assert.equal(await page.locator('#root').evaluate(node=>node.inert),false);
  await command('/fork fixture:complete branch prompt');await page.getByText('Fixture response',{exact:true}).waitFor();
  await poll(async()=>!await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').count(),'fork completes');
  const db=JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')),fork=Object.values(db.threads).find(t=>t.forkedFromId===RC);assert.ok(fork);assert.equal(db.threads[RC].turns.length,1);assert.equal(fork.turns.length,2);assert.equal(fork.turns[1].items[0].content[0].text,'fixture:complete branch prompt');
  assert.equal(await editor.evaluate(node=>node.value),'');
  const exportPath=path.join(profile,'export.md');await app.evaluate(({dialog},file)=>{globalThis.slashSaveOriginal=dialog.showSaveDialog;dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},exportPath);
  await command('/export');await poll(async()=>await fs.readFile(exportPath,'utf8'),'export saved');const exported=await fs.readFile(exportPath,'utf8');assert.ok(exported.includes('ORIGINAL_RESPONSE'));assert.ok(exported.includes('fixture:complete branch prompt'));assert.ok(!exported.includes('/status'));
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=globalThis.slashSaveOriginal;delete globalThis.slashSaveOriginal;});
  await command('/rewind');const rewind=page.getByRole('dialog',{name:'Rewind',exact:true});await rewind.waitFor();
  // Fidelity F02: Rewind is the shared CDS Dialog (source-dialog.jsx; shared-frame-C_2npUJq.js:5561-5574, :5806-5869): surface-3,
  // --cds-backdrop + blur(2px), the CloseButton 'Close' and CDS footer Buttons. Read once the enter transition has settled.
  await page.waitForFunction(()=>{const n=document.querySelector('[role=dialog].sdlg-popup');return n&&!n.hasAttribute('data-starting-style')&&n.getAnimations().length===0&&n.parentElement.getAnimations().length===0;});
  metrics.rewindDialog=await rewind.evaluate(n=>{const probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;background:var(--cds-surface-3)';n.parentElement.append(probe);const surface=getComputedStyle(probe).backgroundColor;probe.style.background='var(--cds-backdrop)';const backdrop=getComputedStyle(probe).backgroundColor;probe.remove();
    return {surface:getComputedStyle(n).backgroundColor===surface,backdrop:getComputedStyle(n.parentElement).backgroundColor===backdrop,blur:getComputedStyle(n.parentElement).backdropFilter,footer:[...n.querySelectorAll('footer [data-cds=Button]')].map(b=>b.dataset.variant)};});
  metrics.rewindDialog.close=await rewind.getByRole('button',{name:'Close',exact:true}).count();
  // B12 J1 (cc43287c9 :30061-30231): the Rewind picker has no footer; the latest message starts active and Enter on the
  // list picks it. The fixture core restores no files (no capabilities.rewindFiles), so G4 rewinds at once, without the confirm.
  assert.deepEqual(metrics.rewindDialog,{surface:true,backdrop:true,blur:'blur(2px)',footer:[],close:1});const rewindOption=rewind.getByRole('option',{name:'fixture:complete branch prompt',exact:true});assert.equal(await rewindOption.getAttribute('aria-selected'),'true','J1: the latest message starts active');assert.equal((await requests()).filter(r=>r.method==='thread/revert').length,0,'no mutation before a pick');await rewind.getByRole('listbox').press('Enter');await rewind.waitFor({state:'detached'});
  await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'fixture-threads.json'),'utf8')).threads[fork.id].turns.length===1,'durable history reverted');assert.equal(await page.getByText('Fixture response',{exact:true}).count(),0);assert.equal(await editor.evaluate(node=>node.value),'fixture:complete branch prompt');
  assert.equal((await requests()).filter(r=>r.method==='thread/revert').length,1);
  checks.push('Usage targets settings; fork prompt goes only to new branch; export reads full history and excludes local status; rewind confirms and reloads paginated retained history');
  await fillComposer(page,editor,'');await fillComposer(page,editor,'/');await menu.waitFor();await editor.press('ArrowDown');await page.locator('[data-cds="Tooltip"]').waitFor();await page.screenshot({path:path.join(directory,'menu-light.png')});await editor.press('Escape');await command('/theme dark');await fillComposer(page,editor,'');await fillComposer(page,editor,'/');await menu.waitFor();await page.screenshot({path:path.join(directory,'menu-dark.png')});
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
  const report = { schemaVersion: 1, suite: "slash-commands-complete-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "slash-commands-complete-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
