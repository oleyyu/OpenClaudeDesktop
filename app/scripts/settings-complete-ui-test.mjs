import { chooseSetting, settingOptions } from './select-test-helpers.mjs';
import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
// The first device pixel of a 1x1 CSS clip, decoded from the PNG (every filter type leaves a first-row first pixel raw).
async function pagePixel(target, { x, y }) {
  const png = await target.screenshot({ clip: { x, y, width: 1, height: 1 } });
  let offset = 8, colorType = 6;
  const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8), body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") colorType = body[9];
    if (type === "IDAT") data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  return [...raw.subarray(1, 1 + (colorType === 6 ? 4 : 3))];
}

// Claude 2.2553.1 shared-11/cc183b3ab slash contract; real-shaped isolated
// Codex protocol fixture. Never opens user sessions or writes the clipboard.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `settings-complete-ui-${startedAt.replaceAll(":", "-")}`);
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
const testSources=['scripts/settings-complete-ui-test.mjs','scripts/select-test-helpers.mjs','tests/fixtures/codex-server.cjs','src/settings-model.mjs','electron/desktop-settings.cjs'];
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
  await fs.writeFile(path.join(profile,'fixture-settings.json'),JSON.stringify({'config/read':{config:{sandbox_mode:'read-only',approval_policy:'on-request',mcp_servers:{'local-fixture':{command:'node',args:['fixture-server.js'],env:{TOKEN:'not-for-renderer'}}}},origins:{sandbox_mode:{name:{type:'mdm'},version:'1'}}},'configRequirements/read':{requirements:{allowedSandboxModes:['read-only']}},'account/usage/read':{summary:{},dailyUsageBuckets:[{startDate:'2026-09-21',tokens:321}]}}));
  app=await electron.launch({executablePath,args:[root],env});
  // Native startup APIs are stubbed only in this isolated fixture process. No OS setting changes.
  await app.evaluate(({app,powerSaveBlocker,powerMonitor})=>{let startup=false;app.getLoginItemSettings=()=>({openAtLogin:startup});app.setLoginItemSettings=({openAtLogin})=>{startup=openAtLogin;};app.dock.setBadge=()=>{};app.dock.bounce=()=>0;powerSaveBlocker.start=()=>1;powerSaveBlocker.stop=()=>{};powerMonitor.isOnBatteryPower=()=>false;});
  page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>rendererErrors.push(e.message));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1324,768));await page.waitForFunction(()=>innerWidth===1324&&innerHeight===768);
  await page.getByRole('textbox',{ name: /^(?:Prompt|Message DeepSeek)$/ }).waitFor();await page.keyboard.press('Meta+,');const dialog=page.getByRole('dialog',{name:'Settings',exact:true});await dialog.waitFor();
  // HANDOFF 0.2.119: useModalPresence commits data-open="true" only on the rAF after mount
  // (use-modal-presence.js:11-12); before it no transition exists, so the getAnimations()
  // wait below is vacuously true. The v119 chain run then clicked Close while data-open was
  // already "false" ("Closing style never committed"). Wait for the entered state first.
  await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.dataset.open==='true');
  await page.waitForFunction(()=>document.querySelector('.ss-dialog')?.getAnimations().every(a=>a.playState==='finished'));
  // Fidelity F14 (on purpose): cc011544b _t focuses the nav search on open (shared-22:4549 sw: never the popup itself).
  /* shared-19 JD desktop-rail clamp (B23): 1324px wide → max(1024,min(1280,1324-96)) = 1228. */metrics.geometry=await dialog.evaluate(el=>({width:el.offsetWidth,height:el.offsetHeight,nav:el.querySelector('nav').offsetWidth,focus:document.activeElement===el.querySelector('input[aria-label="Search settings"]')}));assert.deepEqual(metrics.geometry,{width:1228,height:736,nav:192,focus:true});
  metrics.layout=await dialog.evaluate(el=>{const row=el.querySelector('[data-settings-row]'),copy=row.querySelector('.settings-row-title'),desc=row.querySelector('[data-settings-desc]'),pane=el.querySelector('.ss-pane'),header=el.querySelector('.ss-page-header'),content=el.querySelector('.ss-content');return {label:getComputedStyle(copy).fontSize,desc:getComputedStyle(desc).fontSize,paneFlex:getComputedStyle(pane).display,headerEnd:header.getBoundingClientRect().bottom,contentStart:content.getBoundingClientRect().top,contentTop:getComputedStyle(content).paddingTop};});
  assert.equal(metrics.layout.label,metrics.layout.desc);assert.equal(metrics.layout.paneFlex,'flex');assert.equal(metrics.layout.headerEnd,metrics.layout.contentStart);assert.equal(metrics.layout.contentTop,'8px');
  // shared-22 cw:4548–4606 retains the closing dialog for a 200ms transition.
  // Observe the actual closing commit and invoke the production keyboard
  // handler in that same browser task: CDP round trips must not consume the
  // entire transition before testing an interrupted close. No timer/geometry
  // override, no component state or dialog markup injection.
  metrics.residency = await page.evaluate(()=>new Promise((resolve,reject)=>{
    const root=document.querySelector('.ss-settings-dialog');if(root.dataset.open!=='true'){reject(Error('Settings dialog not entered before close: data-open='+root.dataset.open));return;}root.dataset.residencyFixture='same';
    const timer=setTimeout(()=>{observer.disconnect();reject(Error('Closing style never committed'));},1500);
    const observer=new MutationObserver(()=>{
      if(root.dataset.open!=='false')return;
      observer.disconnect();clearTimeout(timer);
      const evidence={closing:root.dataset.open,inert:document.querySelector('#root').inert,connected:root.isConnected};
      window.dispatchEvent(new KeyboardEvent('keydown',{key:',',code:'Comma',metaKey:true,bubbles:true,cancelable:true}));
      resolve(evidence);
    });
    observer.observe(root,{attributes:true,attributeFilter:['data-open']});
    root.querySelector('.ss-page-header [aria-label="Close"]').click();
  }));
  assert.deepEqual(metrics.residency,{closing:'false',inert:true,connected:true});
  await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.dataset.open==='true');
  await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.getAnimations().every(a=>a.playState==='finished'));
  assert.equal(await dialog.getAttribute('data-residency-fixture'),'same');checks.push('Source row/body type, separate fixed header, closing residency and cancelled stale exit');

  assert.equal(await dialog.getByRole('navigation').getByRole('button',{name:'Account',exact:true}).count(),0);
  await page.keyboard.press('Meta+f');const search=dialog.getByRole('textbox',{name:'Search settings'});await search.fill('fast');const hit=dialog.getByRole('button',{name:'Fast mode in Code',exact:true});await hit.waitFor();assert.equal(await page.locator('.ss-search-results').evaluate(e=>e.offsetWidth),280);await page.keyboard.press('Enter');await page.locator('[data-setting-id="fast"].feature-anchor-row-fill').waitFor();
  // shared-21 kv:1380–1472: repeat navigation cancels the old animation,
  // then waits for layout stability before adding a fresh highlight.
  await page.evaluate(()=>{
    const row=document.querySelector('[data-setting-id="fast"]');
    const evidence={events:[],observer:null};window.__settingsAnchorEvidence=evidence;
    evidence.observer=new MutationObserver(()=>evidence.events.push({at:performance.now(),active:row.classList.contains('feature-anchor-row-fill')}));
    evidence.observer.observe(row,{attributes:true,attributeFilter:['class']});
  });
  await search.fill('fast');await hit.click();
  await page.waitForFunction(()=>window.__settingsAnchorEvidence.events.some(event=>!event.active));
  await page.waitForFunction(()=>window.__settingsAnchorEvidence.events.at(-1)?.active===true);
  metrics.anchorRepeat=await page.evaluate(()=>{const evidence=window.__settingsAnchorEvidence;evidence.observer.disconnect();delete window.__settingsAnchorEvidence;return evidence.events;});
  const removed=metrics.anchorRepeat.find(event=>!event.active),added=metrics.anchorRepeat.find(event=>event.active);
  assert.ok(removed&&added&&added.at-removed.at>=250,'repeat highlight starts after source 250ms settling minimum');
  await page.waitForFunction(()=>!document.querySelector('[data-setting-id="fast"]').classList.contains('feature-anchor-row-fill'));
  assert.equal(await page.locator('.feature-anchor-highlight').count(),0);
  checks.push('Repeated search restarts the source highlight after stable scrolling, then removes both title and row animation classes');
  await page.keyboard.press('Meta+f');await search.fill('nonexistent-setting');await page.getByText('No matching settings',{exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await dialog.count(),1);assert.equal(await page.locator('.ss-search-results').count(),0);checks.push('Source geometry, initial dialog focus, no Account nav, popup search and Escape ownership');
  // cc011544b Z/gt:614–830: real grouped results, first literal match in accent,
  // and an empty query closes the popup without changing the current page.
  await page.keyboard.press('Meta+f');await search.fill('transcript');
  assert.equal(await dialog.locator('.ss-search-results>[data-kind=hit]').count(),1);
  assert.equal(await dialog.locator('.ss-search-results>[data-kind=child]').count(),3);
  assert.equal(await dialog.locator('.ss-search-match').count(),3);
  await search.dispatchEvent('keydown',{key:'Escape',isComposing:true,bubbles:true});
  assert.equal(await search.inputValue(),'transcript');assert.equal(await dialog.locator('.ss-search-results').count(),1);
  await search.fill('');assert.equal(await dialog.locator('.ss-search-results').count(),0);
  await search.fill('mcp');await dialog.getByRole('button',{name:'Connectors',exact:true}).filter({has:page.locator('.ss-search-via')}).click();
  await page.locator('[data-cz-page="connectors"]').waitFor();
  // F13 customize-page-notices: no local notice paragraphs or config-hint row above the list (page shell :410-424).
  await page.locator('[data-cz-page="connectors"] :is(table,[data-cz-empty],.cz-load-error)').first().waitFor();
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(.cz-notice,.cz-config-hint)').count(),0);
  checks.push('Grouped search children, literal accent matches, composing Escape, empty query and real MCP keyword destination');
  await dialog.getByRole('navigation').getByRole('button',{name:'Code',exact:true}).click();await page.getByRole('switch',{name:'Allow bypass permissions mode'}).waitFor();assert.equal(await page.getByRole('switch',{name:'Allow bypass permissions mode'}).isDisabled(),true);await page.getByText('Managed by your organization',{exact:true}).first().waitFor();
  // Fidelity F14 (on purpose): a fresh profile reads Banners and keep-awake on (index.chunk-ChZ67Jhw.js defaults; c71860c77:2270),
  // Task complete offers only Off / Banners (:2004-2029), and Draw attention is disabled while Permission requests and Questions are
  // both Off (:2108, :2335). The battery row follows the keep-awake switch.
  const awakeSwitch=page.getByRole('switch',{name:'Keep computer awake while DeepSeek works'}),batterySwitch=page.getByRole('switch',{name:'Keep awake on battery power'}),drawAttention=page.getByRole('switch',{name:'Draw attention on notifications'});
  assert.equal(await awakeSwitch.getAttribute('aria-checked'),'true');assert.equal(await batterySwitch.getAttribute('aria-checked'),'true');
  metrics.levels=await page.evaluate(()=>['Permission requests','Questions','Task complete'].map(label=>document.querySelector(`[role=combobox][aria-label="${label} notification level"] .sselect-value`)?.textContent));assert.deepEqual(metrics.levels,['Banners','Banners','Banners']);
  assert.deepEqual(await settingOptions(page,'Task complete notification level'),[['off','Off'],['banner','Banners']]);assert.deepEqual((await settingOptions(page,'Permission requests notification level')).map(([value])=>value),['off','badge','banner']);
  await awakeSwitch.click();await batterySwitch.waitFor({state:'detached'});await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))).keepAwake===false,'saved keep-awake off');await awakeSwitch.click();await batterySwitch.waitFor();
  await chooseSetting(page,'Task complete notification level','off');await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))).completeNotifications==='off','saved notification preference');
  assert.equal(await drawAttention.isDisabled(),false);await chooseSetting(page,'Permission requests notification level','off');assert.equal(await drawAttention.isDisabled(),false);await chooseSetting(page,'Questions notification level','off');await poll(()=>drawAttention.isDisabled(),'Draw attention disabled when both are Off');
  await chooseSetting(page,'Questions notification level','badge');await poll(async()=>!(await drawAttention.isDisabled()),'Draw attention re-enabled');await poll(async()=>JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))).questionNotifications==='badge','saved question level');
  checks.push('Fidelity F14: fresh-profile Banners and keep-awake on, per-type level options, Draw attention gated on Permission requests and Questions');
  const brokenAria=await page.locator('[data-settings-row]').evaluateAll(rows=>rows.filter(row=>!document.getElementById(row.getAttribute('aria-labelledby'))).length);assert.equal(brokenAria,0);checks.push('Real read-only policy, persisted desktop preferences, conditional battery row and row semantics');
  await dialog.getByRole('navigation').getByRole('button',{name:'System',exact:true}).click();assert.equal(await page.locator('.ss-version').textContent(),build.version);await page.getByRole('switch',{name:'Run on startup'}).click();await page.getByRole('switch',{name:'Run on startup',checked:true}).waitFor();assert.equal(await app.evaluate(({app})=>app.getLoginItemSettings().openAtLogin),true);
  // c71860c77-B72Ova_w:1138–1163: Manage opens Dialog lg, not inline rows.
  // R03 (shared-frame-C_2npUJq.js:5569 yf, :5619-5620 Ef/Df): Storage nested over Settings keeps a clear backdrop; Settings
  // dims and blurs itself (data-nested-dialog-open), so a page pixel outside both dialogs keeps the Settings-only value.
  const outside=await page.evaluate(()=>({x:6,y:Math.round(innerHeight/2)}));
  // Scroll-driven animations (the nav's scroll-fade-y, a ScrollTimeline) never finish; only time-based ones settle.
  const settled=()=>page.waitForFunction(()=>document.querySelector('.ss-settings-dialog').getAnimations({subtree:true}).every(a=>a.timeline!==document.timeline||a.playState==='finished'));
  await settled();const settingsOnlyPixel=await pagePixel(page,outside);
  await page.getByRole('button',{name:'Manage',exact:true}).click();const storage=page.getByRole('dialog',{name:'Storage',exact:true});await storage.waitFor();
  await page.waitForFunction(()=>document.querySelector('.ss-settings-dialog')?.hasAttribute('data-nested-dialog-open'));await settled();
  metrics.nestedStorage=await storage.evaluate(node=>{const backdrop=getComputedStyle(node.parentElement),settings=document.querySelector('.ss-settings-dialog');return {background:backdrop.backgroundColor,backdropFilter:backdrop.backdropFilter,settingsFilter:getComputedStyle(settings).filter,overlayOpacity:getComputedStyle(settings,'::after').opacity};});
  metrics.nestedStorage.pixel=await pagePixel(page,outside);metrics.nestedStorage.settingsOnlyPixel=settingsOnlyPixel;
  assert.equal(metrics.nestedStorage.background,'rgba(0, 0, 0, 0)','the nested Storage backdrop is transparent');assert.equal(metrics.nestedStorage.backdropFilter,'none');assert.equal(metrics.nestedStorage.settingsFilter,'blur(2px)');assert.equal(metrics.nestedStorage.overlayOpacity,'1');
  assert.ok(metrics.nestedStorage.pixel.every((value,index)=>Math.abs(value-settingsOnlyPixel[index])<=1),`page dimmed once: ${metrics.nestedStorage.pixel} vs ${settingsOnlyPixel}`);
  // Fidelity F14 (on purpose): c71860c77-B72Ova_w ht/X/Z — Disk space used, then the Code sessions and worktrees / Runtime /
  // App caches and logs rows with no paths, a relative 'Calculated', and a Details disclosure holding a 4px kind bar.
  await storage.locator('.ss-storage-rows').waitFor();
  metrics.storage=await storage.evaluate(root=>({rows:[...root.querySelectorAll('[data-settings-row] .settings-row-title')].map(n=>n.textContent),calculated:root.querySelector('[data-settings-row] [data-settings-desc]')?.textContent,relative:!!root.querySelector('time[data-cds=RelativeTime]'),text:root.textContent}));
  assert.deepEqual(metrics.storage.rows,['Disk space used','Code sessions and worktrees','Runtime','App caches and logs']);assert.equal(metrics.storage.calculated,'Calculated just now.');assert.equal(metrics.storage.relative,true);assert.equal(metrics.storage.text.includes(profile),false,'no paths');delete metrics.storage.text;
  await storage.getByRole('button',{name:'App cache details',exact:true}).click();const kindBar=storage.getByRole('img',{name:/^App storage by kind: /});await kindBar.waitFor();
  metrics.storageKindBar=await kindBar.evaluate(n=>({height:n.offsetHeight,segments:n.children.length,legend:n.parentElement.querySelectorAll('li').length}));assert.equal(metrics.storageKindBar.height,4);assert.ok(metrics.storageKindBar.segments>=1&&metrics.storageKindBar.legend>=metrics.storageKindBar.segments);
  assert.equal(await storage.evaluate(e=>e.offsetWidth),720);assert.equal(await dialog.evaluate(e=>e.inert),true);await storage.getByRole('button',{name:'Refresh',exact:true}).click();await storage.getByRole('button',{name:'Refresh',exact:true}).waitFor();await page.screenshot({path:path.join(directory,'settings-general.png')});await page.keyboard.press('Escape');await storage.waitFor({state:'detached'});assert.equal(await dialog.evaluate(e=>e.inert),false);assert.equal(await dialog.evaluate(e=>e.hasAttribute('data-nested-dialog-open')),false);checks.push('R03 nested Storage: transparent nested backdrop, Settings data-nested-dialog-open with blur(2px) and its ::after overlay, page pixel outside both dialogs equal to the Settings-only value');assert.equal(await page.getByRole('button',{name:'Manage',exact:true}).evaluate(e=>document.activeElement===e),true);
  // c71860c77-CCdfSDER:44–161,338–383: real transport details in 192px split.
  await dialog.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Developer',exact:true}).click();await page.locator('.ss-mcp-detail').getByText('node',{exact:true}).waitFor();assert.equal(await page.locator('.ss-mcp-list').evaluate(e=>e.offsetWidth),192);await page.locator('.ss-mcp-detail').getByText('fixture-server.js',{exact:true}).waitFor();/* Source shared-frame Collapsible now uses a button, preserving the same expansion assertion. */await page.getByRole('button',{name:'Advanced options',exact:true}).click();await page.locator('.ss-mcp-detail').getByText('TOKEN',{exact:true}).waitFor();assert.equal(await page.getByText('not-for-renderer',{exact:true}).count(),0);checks.push('Source Developer split and nested Storage dialog with real data, Escape ownership and focus restoration');
  // c71860c77:68–90,308–329: ghost/sm Delete with native confirmation.
  const deleteServer = page.locator('.ss-mcp-detail').getByRole('button', {name:'Delete',exact:true});
  await deleteServer.waitFor();
  const deleteBox = await deleteServer.evaluate(element => {
    const style=getComputedStyle(element), probe=document.createElement('i');
    probe.style.height=style.getPropertyValue('--cds-h-control'); element.append(probe);
    const token=parseFloat(getComputedStyle(probe).height);probe.remove();
    return {width:element.offsetWidth,height:element.offsetHeight,token};
  });
  assert.equal(deleteBox.width,deleteBox.token);assert.equal(deleteBox.height,deleteBox.token);
  const writes = async () => (await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line)).filter(row=>row.method==='config/batchWrite').length;
  const beforeCancel=await writes();
  const confirmation = page.waitForEvent('dialog');
  const clickDelete=deleteServer.click();
  const nativeConfirm=await confirmation;
  // Read the prompt, answer it, then assert: an assertion thrown while the confirm is open leaves the renderer blocked in
  // window.confirm, the pending click times out as an unhandled rejection and node exits before run-suite writes a report
  // (the "no dialog event / click hangs" failure logged since 2026-10-01 was this stale copy check, not the adapter).
  // developer-server-actions.mjs:9 copy (tests/developer-server-actions.test.mjs:26): the DeepSeek Harness configuration.
  metrics.removeConfirm={type:nativeConfirm.type(),message:nativeConfirm.message()};
  await nativeConfirm.dismiss();await clickDelete;
  assert.equal(metrics.removeConfirm.type,'confirm');assert.match(metrics.removeConfirm.message,/“local-fixture”/);assert.match(metrics.removeConfirm.message,/This changes the DeepSeek Harness configuration\./);
  await poll(()=>deleteServer.isEnabled(),'cancelled removal settles');
  assert.equal(await writes(),beforeCancel);
  await page.locator('.ss-mcp-detail').getByText('fixture-server.js',{exact:true}).waitFor();
  checks.push('Developer Delete has source size and cancellation performs no configuration write');

  const acceptRemoval = async () => {
    const prompted=page.waitForEvent('dialog'), click=deleteServer.click();
    const confirmation=await prompted;assert.equal(confirmation.type(),'confirm');
    await confirmation.accept();await click;
  };
  // Exercise the real renderer -> IPC -> fixture RPC path, including a denied
  // write. The fixture itself replays accepted batchWrite into config/read.
  const writeFailure=path.join(profile,'fixture-mcp-write-error');
  await fs.writeFile(writeFailure,'isolated write failure');
  await acceptRemoval();
  // R03 (c4fa092cc K5b1jjmNX7): the failure shows the catalog copy 'Couldn’t remove {serverName}.'; the raw reason is only logged.
  await dialog.getByRole('alert').filter({hasText:'Couldn’t remove local-fixture.'}).waitFor();
  await poll(()=>deleteServer.isEnabled(),'failed removal settles');
  assert.equal(await writes(),beforeCancel+1);
  await page.locator('.ss-mcp-detail').getByText('fixture-server.js',{exact:true}).waitFor();
  assert.equal(await deleteServer.evaluate(element=>document.activeElement===element),true,'failed removal restores Delete focus');
  await fs.rm(writeFailure);
  await acceptRemoval();
  await dialog.getByText('No servers added',{exact:true}).waitFor();
  assert.equal(await page.locator('.ss-mcp-detail').count(),0);
  assert.equal(await writes(),beforeCancel+2);
  const removalTrace=(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  const writeIndex=removalTrace.findLastIndex(entry=>entry.method==='config/batchWrite');
  assert.deepEqual(removalTrace[writeIndex].params,{edits:[{keyPath:'mcp_servers.local-fixture',value:null,mergeStrategy:'replace'}],reloadUserConfig:true});
  assert.ok(removalTrace.slice(writeIndex+1).some(entry=>entry.method==='config/mcpServer/reload'));
  assert.ok(removalTrace.slice(writeIndex+1).some(entry=>entry.method==='config/read'));
  assert.ok(removalTrace.slice(writeIndex+1).some(entry=>entry.method==='mcpServerStatus/list'));
  const editEmpty=dialog.getByRole('button',{name:'Edit config',exact:true});
  await poll(()=>editEmpty.isEnabled(),'successful removal settles');
  assert.equal(await editEmpty.evaluate(element=>document.activeElement===element),true,'removed selection restores a surviving control');
  assert.equal(await dialog.getByRole('alert').filter({hasText:'Couldn’t remove local-fixture.'}).count(),0);
  await page.screenshot({path:path.join(directory,'settings-developer-empty.png')});
  checks.push('Developer failure keeps the real row and restores focus; confirmation success writes once, reloads and rereads configuration, clears stale errors and focuses the surviving Edit config control');

  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(760,580));await page.getByRole('tablist',{name:'Settings'}).waitFor();assert.equal(await dialog.getByRole('navigation',{name:'Settings',exact:true}).count(),0);/* B23: shared-19 ZC lists Usage in the narrow tabs too. */assert.equal(await dialog.getByRole('tab',{name:'Usage',exact:true}).count(),1);assert.equal(await dialog.getByRole('textbox',{name:'Search settings'}).count(),0);
  /* B23 shared-19 BD (zy.Tabs activateOnFocus:false): arrows, Home and End move focus only; Enter or Space (a click) selects. */
  const narrowTab=name=>dialog.getByRole('tab',{name,exact:true}),focusedTab=name=>narrowTab(name).evaluate(e=>document.activeElement===e);
  await narrowTab('Developer').focus();await page.keyboard.press('Home');assert.equal(await focusedTab('General'),true);assert.equal(await narrowTab('General').getAttribute('aria-selected'),'false');assert.equal(await narrowTab('Developer').getAttribute('aria-selected'),'true');
  await page.keyboard.press('Enter');assert.equal(await narrowTab('General').getAttribute('aria-selected'),'true');assert.equal(await focusedTab('General'),true);
  // shared-19 ZC and BD: Customize follows This computer; Hooks (a hooksList core, as the Codex fixture is) is the last tab.
  await page.keyboard.press('End');assert.equal(await focusedTab('Hooks'),true);assert.equal(await narrowTab('Hooks').getAttribute('aria-selected'),'false');assert.equal(await narrowTab('General').getAttribute('aria-selected'),'true');await page.keyboard.press('ArrowRight');assert.equal(await focusedTab('General'),true);assert.equal(await narrowTab('General').getAttribute('aria-selected'),'true');assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await page.locator('#root').evaluate(e=>e.inert),false);checks.push('Startup adapter without OS writes, storage facts, narrow tabs and focus/inert teardown');assert.deepEqual(rendererErrors,[]);

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
  const report = { schemaVersion: 1, suite: "settings-complete-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "settings-complete-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
