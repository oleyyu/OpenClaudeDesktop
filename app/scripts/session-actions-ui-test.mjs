// 0.2.81: source skillChip requires a real contenteditable editor; read its serialized draft API, not textarea inputValue.
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// HANDOFF 0.2.124: clears and draft fills go through fillComposer (composer-test-helpers.mjs, 0.2.81): on the ProseMirror editor
// Playwright fill('') sets a DOM Range and presses Delete before PM reads the selection (r1 failure.png: the
// old /unknown-command draft left selected, not deleted; r3: 'First message' fill after /usage left the composer
// empty and Send disabled); real Meta+A/Backspace + insertText, awaited on the serialized value, is what PM observes.
import {fillComposer} from './composer-test-helpers.mjs';
import {chooseSetting} from './select-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..'),evidence=path.resolve(root,'../analysis/functions-20260920');
await fs.mkdir(evidence,{recursive:true});
const profile=await fs.mkdtemp(path.join(evidence,'actions-ui-')),workspace=path.join(profile,'repo');await fs.mkdir(workspace);
for(const args of [['init','-b','main'],['config','user.email','test@example.invalid'],['config','user.name','Test']])execFileSync('git',['-C',workspace,...args]);
await fs.writeFile(path.join(workspace,'sample.txt'),'before\n');execFileSync('git',['-C',workspace,'add','sample.txt']);execFileSync('git',['-C',workspace,'commit','-m','Isolated test seed']);await fs.writeFile(path.join(workspace,'sample.txt'),'after\n');
await fs.writeFile(path.join(profile,'session-action-test.marker'),'isolated');await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,permission:'plan',theme:'light',threadIds:[]}));
const build=JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'))),appPath=process.env.TEST_APP_PATH;
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:path.join(root,'tests/fixtures/session-actions-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const hashes=async()=>Object.fromEntries(await Promise.all(['scripts/session-actions-ui-test.mjs','tests/fixtures/session-actions-server.cjs'].map(async name=>[name,createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')])));
const report={passed:false,startedAt:new Date().toISOString(),build,appPath:appPath||null,profile,checks:[],sourceHashes:await hashes()},errors=[];
let app,page;
const trace=async()=>String(await fs.readFile(path.join(profile,'action-trace.jsonl'))).trim().split('\n').map(JSON.parse);
async function command(text){const input=page.getByRole('textbox',{name:'Message DeepSeek'});await fillComposer(page,input,text);await input.press('Enter');if(await page.getByRole('menu',{name:'Slash commands',exact:true}).count()===0 && await input.evaluate(node=>node.value)===text+' ')await input.press('Enter');}
async function idle(){await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({state:'detached'});await page.waitForFunction(()=>!document.querySelector('.sc-spinner'));}
// Fidelity F02: every action dialog is the shared CDS Dialog (source-dialog.jsx; shared-frame-C_2npUJq.js:5561-5574,
// :5738-5869): surface-3 popup, bg-backdrop + 2px blur, a data-starting-style first frame (recorded when the portal
// is inserted) and the CloseButton named 'Close'. Paint is read once the enter transition has settled.
const recordDialogStarts=()=>page.evaluate(()=>{if(window.__dialogStarts)return;window.__dialogStarts=[];new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){const popup=node.nodeType===1&&node.querySelector?.('.sdlg-popup');if(popup)window.__dialogStarts.push({title:popup.querySelector('h2')?.textContent,starting:popup.hasAttribute('data-starting-style'),opacity:getComputedStyle(popup).opacity});}}).observe(document.body,{childList:true});});
async function dialogPaint(name){const dialog=page.getByRole('dialog',{name,exact:true});await dialog.waitFor();
 await page.waitForFunction(name=>{const node=[...document.querySelectorAll('[role=dialog]')].find(n=>n.querySelector('h2')?.textContent===name);return node&&!node.hasAttribute('data-starting-style')&&node.getAnimations().length===0&&node.parentElement.getAnimations().length===0;},name);
 const paint=await dialog.evaluate(n=>{const probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;background:var(--cds-surface-3)';n.parentElement.append(probe);const surface=getComputedStyle(probe).backgroundColor;probe.style.background='var(--cds-backdrop)';const backdrop=getComputedStyle(probe).backgroundColor;probe.remove();const b=getComputedStyle(n.parentElement);
  return {background:getComputedStyle(n).backgroundColor,surface,backdrop:b.backgroundColor,backdropToken:backdrop,blur:b.backdropFilter,modal:n.getAttribute('aria-modal'),rootInert:document.getElementById('root').inert,starts:window.__dialogStarts.filter(entry=>entry.title===n.querySelector('h2')?.textContent)};});
 paint.closeButtons=await dialog.getByRole('button',{name:'Close',exact:true}).count();
 assert.equal(paint.background,paint.surface,name+' popup is --cds-surface-3');assert.equal(paint.backdrop,paint.backdropToken,name+' backdrop is --cds-backdrop');assert.equal(paint.blur,'blur(2px)');assert.equal(paint.modal,'true');assert.equal(paint.rootInert,true,'#root is inert behind '+name);
 assert.ok(paint.starts.length&&paint.starts.at(-1).starting&&paint.starts.at(-1).opacity==='0',name+' mounted with a data-starting-style (opacity 0) frame');return paint;}
try{
 app=await electron.launch({executablePath:appPath?path.join(appPath,'Contents/MacOS/OpenClaude Desktop'):path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:appPath?[]:[root],env});
 page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Action test model'}).waitFor();
 const runtimeBuild=await page.evaluate(async()=>await(await fetch('./build-info.json')).json());assert.equal(runtimeBuild.sourceSha256,build.sourceSha256);
 const editor=page.getByRole('textbox',{name:'Message DeepSeek'});
 await editor.fill('/');await page.getByRole('menu',{name:'Slash commands',exact:true}).waitFor();assert.equal(await page.getByRole('menuitem',{name:'compact',exact:true}).count(),0);
 await editor.press('Escape');assert.equal(await page.getByRole('menu',{name:'Slash commands',exact:true}).count(),0);
 await command('/unknown-command');await page.getByRole('alert').filter({hasText:'isn’t a command here'}).waitFor();assert.equal((await trace()).filter(m=>m.method==='turn/start').length,0);
 await page.getByRole('button',{name:'Dismiss error'}).click();
 // 2.2553.1 c099c328d/shared-11: Add inserts slash, no modal; Usage is a settings page.
 await fillComposer(page,editor,'');await page.getByRole('button',{name:'Add',exact:true}).click();await page.getByRole('menuitem',{name:'Slash commands',exact:true}).click();await page.getByRole('menu',{name:'Slash commands',exact:true}).waitFor();await editor.press('Escape');
 // HANDOFF 0.2.68/0.2.124: /usage opens the standalone Usage dialog (fidelity F14: its close button is named 'Close', shared-22:4511-4515) whose
 // meters show usedPercent (source-usage.jsx UsageRow); the codex bucket's 20% used (was "80% remaining") must win
 // over the legacy rateLimits.primary 99% (was "1% remaining"), session-actions-server.cjs:34.
 await command('/usage');const settings=page.getByRole('dialog',{name:'Usage',exact:true});await settings.waitFor();await settings.getByText('20% used',{exact:true}).waitFor();assert.equal(await settings.getByText('99% used',{exact:true}).count(),0);await page.screenshot({path:path.join(profile,'usage-home.png')});await settings.getByRole('button',{name:'Close',exact:true}).click();
 // HANDOFF 0.2.124 product fix (source-settings.jsx opener layout effect): closing Usage opened by /usage returns focus to the composer, not Account menu.
 await settings.waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.getAttribute('data-cds')==='ChatComposerEditor');
 report.checks.push('slash suggestion gating, Escape, unknown command does not send; Add inserts slash; Usage settings prefers actual rate-limit buckets');
 await recordDialogStarts();
 await command('/help');report.helpDialog=await dialogPaint('Help and support');assert.equal(report.helpDialog.closeButtons,1);
 await page.getByRole('dialog',{name:'Help and support',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('dialog',{name:'Help and support',exact:true}).waitFor({state:'detached'});
 assert.equal(await page.locator('#root').evaluate(n=>n.inert),false);await page.waitForFunction(()=>document.activeElement?.getAttribute('data-cds')==='ChatComposerEditor');
 // shared-21-D098Wd--.js:14583-14625 IR + shared-22-Cz3C_T8d.js:11740-11749 shortcuts_modal: ⌘/ opens 'Keyboard shortcuts' (focus on
 // the popup, then a focusable region with zR's three sections); ⌘/ again keeps it open (I = v(!0)), Escape closes it.
 await page.keyboard.press('Meta+/');const shortcuts=page.getByRole('dialog',{name:'Keyboard shortcuts',exact:true});report.shortcutsDialog=await dialogPaint('Keyboard shortcuts');assert.equal(report.shortcutsDialog.closeButtons,1);
 const region=shortcuts.getByRole('region',{name:'Keyboard shortcuts',exact:true});
 report.shortcutsDialog.content=await shortcuts.evaluate(n=>({focus:document.activeElement===n,width:n.getBoundingClientRect().width,sections:[...n.querySelectorAll('.shortcuts-section')].map(x=>x.textContent),
  changes:[...n.querySelectorAll('[data-command=changes] kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent),density:n.closest('[data-density]')?.dataset.density,header:getComputedStyle(n.querySelector('.sdlg-header')).backgroundColor,bleed:!!n.querySelector('.sdlg-bleed-header')}));
 assert.deepEqual(report.shortcutsDialog.content,{focus:true,width:520,sections:['General','Panes','Composer'],changes:['⇧','⌘','D'],density:'comfortable',header:'rgba(0, 0, 0, 0)',bleed:false});
 assert.equal(await region.getAttribute('tabindex'),'0');
 // R01 (shared-21-D098Wd--.js zR :15017-15060, :15173-15178, :15200-15206): every bound chord has its row, in zR order.
 report.shortcutsDialog.rows=await shortcuts.evaluate(n=>[...n.querySelectorAll('.shortcuts-row')].map(row=>[row.dataset.command,row.querySelector('.shortcuts-label').textContent,[...row.querySelectorAll('kbd')].map(k=>(k.querySelector('[aria-hidden="true"]')??k).textContent).join('')]));
 const dialogRow=command=>report.shortcutsDialog.rows.find(row=>row[0]===command);
 assert.deepEqual(['close-session','reopen-closed','jump-session','archive-session','transcript-view','file-list'].map(dialogRow),[
  ['close-session','Close tab, pane, or session','⌘W'],['reopen-closed','Reopen closed session','⇧⌘T'],['jump-session','Jump to session','⌘1…9'],
  ['archive-session','Archive session','⌥⌘A'],['transcript-view','Transcript view','⌃O'],['file-list','Toggle file list in changes or files','⇧⌘Y']]);
 // :15157-15170 jumpPrevPrompt / jumpNextPrompt (⌥⌘↑ / ⌥⌘↓) follow the session rows, before Stop.
 const general=report.shortcutsDialog.rows.map(row=>row[0]);
 // B25: 2.31226 c518a31cc Ce order (split rows inside General after Jump to session, then the ⌥⌘ session block with Open session PR).
 assert.deepEqual(general.slice(general.indexOf('new-session'),general.indexOf('stop')+1),['new-session','new-session-current','close-session','reopen-closed','next-session','previous-session','jump-session','split-open','split-new-right','split-new-below','split-focus-next','split-focus-previous','split-close','pin-session','rename-session','archive-session','unread-session','open-session-pr','fork-session','jump-prev-prompt','jump-next-prompt','transcript-view','find','find-next','find-previous','stop']);
 // :15208-15214 mR("goToDiffFile") (⌘P, Go to file in changes or files) sits between the file list and Files; B34: next / previous change (c518a31cc Ce d) follow the file list.
 assert.deepEqual(general.slice(general.indexOf('changes'),general.indexOf('files')+1),['changes','file-list','next-change','previous-change','go-to-file','preview','select-element','annotate','preview-new-tab','preview-reopen-tab','preview-next-tab','preview-previous-tab','preview-jump-tab','preview-address','files']);
 // The terminal (⌃` / ⌘J), File › New Session with Current Settings (⇧⌘N) and View › Split View chords (⌃⌘\ ⌃] ⌃[ ⌃⌘W) are listed with their caps.
 assert.deepEqual(['new-session-current','terminal','split-new-right','split-new-below','split-focus-next','split-focus-previous','split-close'].map(dialogRow),[
  ['new-session-current','New session with current settings','⇧⌘N'],['terminal','Toggle terminal','⌃`⌘J'],['split-new-right','New session on the right','⌃⌘\\'],['split-new-below','New session below','⌃⌘-'],
  ['split-focus-next','Focus next split view','⌃]'],['split-focus-previous','Focus previous split view','⌃['],['split-close','Close split view','⌃⌘W']]);
 await page.keyboard.press('Tab');assert.equal(await shortcuts.getByRole('button',{name:'Close',exact:true}).evaluate(n=>n===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await region.evaluate(n=>n===document.activeElement&&getComputedStyle(n).boxShadow!=='none'),true,'the region takes focus with the focus shadow');
 await page.keyboard.press('Tab');assert.equal(await shortcuts.getByRole('button',{name:'Close',exact:true}).evaluate(n=>n===document.activeElement),true,'Tab is trapped in the dialog');
 // Dark mode: the portal inherits <html>'s mode (no copied data-mode), so a live flip repaints the open dialog.
 await page.screenshot({path:path.join(profile,'shortcuts-light.png')});
 const darkPaint=async()=>shortcuts.evaluate(n=>{for(const a of document.getAnimations())try{a.finish();}catch{}const probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;background:var(--cds-surface-3);color:var(--cds-backdrop)';n.parentElement.append(probe);const r={surface:getComputedStyle(probe).backgroundColor,backdropToken:getComputedStyle(probe).color,background:getComputedStyle(n).backgroundColor,backdrop:getComputedStyle(n.parentElement).backgroundColor,mode:document.documentElement.dataset.mode};probe.remove();return r;});
 report.shortcutsDialog.light=await darkPaint();await page.evaluate(()=>{document.documentElement.dataset.mode='dark';});report.shortcutsDialog.dark=await darkPaint();await page.screenshot({path:path.join(profile,'shortcuts-dark.png')});await page.evaluate(()=>{document.documentElement.dataset.mode='light';});
 assert.equal(report.shortcutsDialog.dark.background,report.shortcutsDialog.dark.surface);assert.equal(report.shortcutsDialog.dark.backdrop,report.shortcutsDialog.dark.backdropToken);assert.equal(report.shortcutsDialog.dark.backdrop,'rgba(0, 0, 0, 0.5)');assert.equal(report.shortcutsDialog.light.backdrop,'rgba(0, 0, 0, 0.4)');assert.notEqual(report.shortcutsDialog.dark.background,report.shortcutsDialog.light.background);
 await page.keyboard.press('Meta+/');await page.waitForTimeout(250);assert.equal(await shortcuts.count(),1);assert.equal(await shortcuts.evaluate(n=>!n.hasAttribute('data-ending-style')),true,'⌘/ keeps the open dialog open');
 await page.keyboard.press('Escape');await shortcuts.waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.getAttribute('data-cds')==='ChatComposerEditor');
 report.checks.push('Help and Keyboard shortcuts are the shared CDS Dialog: surface-3, --cds-backdrop + blur(2px), a starting-style first frame, #root inert, one Close button; ⌘/ opens the 520px comfortable shortcuts dialog (standard Header, no bleed bar: 3.6556.2 shared-19 jM; focus on the popup, focusable region with General/Panes/Composer and ⇧⌘D), Tab is trapped, a live dark flip repaints it (surface-3 dark, backdrop #00000080 vs #0006 light), ⌘/ keeps it open, Escape closes it and focus returns to the composer');
 await fillComposer(page,editor,'First message');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await page.getByText('ACTION_HISTORY_PRESERVED',{exact:true}).waitFor();await idle();
 const original=JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))).threadIds[0];
 // R01 cycleTranscriptMode ctrl+o (shared-21 :14189; code-workspace.js:2273-2280): Control+O steps the open session's view
 // through qa filtered by availability (no reasoning here: Normal -> Verbose -> Normal), stored per session like the
 // Transcript view menu; the keyboard path shows no 'Switched transcript view' toast (c360a9e1c um via "keyboard").
 const sessionViews=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('code-desktop-transcript-view-by-session')??'{}'));
 assert.equal((await sessionViews())[original],undefined,'the session follows the default view');
 await editor.focus();await page.keyboard.press('Control+O');await page.waitForFunction(id=>JSON.parse(localStorage.getItem('code-desktop-transcript-view-by-session')??'{}')[id]==='verbose',original);
 assert.equal(await page.evaluate(()=>document.querySelector('[data-cds="ChatComposerEditor"]').value),'','Control+O never edits the draft');
 await page.keyboard.press('Control+O');await page.waitForFunction(id=>JSON.parse(localStorage.getItem('code-desktop-transcript-view-by-session')??'{}')[id]===undefined,original);
 assert.equal(await page.locator('.source-toast-message').filter({hasText:'Switched transcript view'}).count(),0);
 report.checks.push('Control+O cycles the open session\'s transcript view Normal -> Verbose -> Normal (Thinking unavailable without reasoning), stored per session, without editing the draft or a toast');
 await command('/compact');await page.locator('[data-operation="compact"][data-phase="starting"]').waitFor();assert.equal(await page.getByText('Conversation compacted',{exact:true}).count(),0);
 // Main process also rejects direct concurrent actions, independent of disabled UI.
 const blocked=await page.evaluate(async id=>{const b=await window.desktop.call('init');try{await window.desktop.call('session-action',{operation:'fork',threadId:id,permission:'plan',mode:'code',expected:{connectionId:b.approvalSnapshot.connectionId,connectionEpoch:b.approvalSnapshot.connectionEpoch}});return false;}catch{return true;}},original);assert.equal(blocked,true);
 await page.locator('[data-operation="compact"][data-phase="completed"]').waitFor();await idle();assert.equal((await trace()).filter(m=>m.method==='thread/compact/start').length,1);
 await command('/status');await page.locator('[data-local-command="status"]').waitFor();assert.match(await page.locator('.session-status-details').innerText(),/120 \/ 128,000/);await page.getByRole('button',{name:'Dismiss session status',exact:true}).click();
 report.checks.push('compact ack remains pending, duplicate IPC refused, terminal notification completes; actual context telemetry');
 // cc183b3ab fork [prompt]: the argument starts a turn in the new thread, not a title.
 await command('/fork Forked test');await page.waitForFunction(()=>document.querySelectorAll('.assistant-message').length===2);await idle();
 let prefs=JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))),fork=prefs.threadIds.find(id=>id!==original);assert.ok(fork);assert.equal(prefs.sessionMetadata[fork].forkedFrom,original);assert.equal(await page.getByText('ACTION_HISTORY_PRESERVED',{exact:true}).count(),2);
 await fillComposer(page,editor,'Fork-only message');await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();await page.waitForFunction(()=>document.querySelectorAll('.assistant-message').length===3);await idle();
 let db=JSON.parse(await fs.readFile(path.join(profile,'action-fixture.json')));assert.equal(db.threads[original].turns.length,2);assert.equal(db.threads[fork].turns.length,4);assert.equal(db.threads[fork].turns[2].items[0].content[0].text,'Forked test');
 report.checks.push('fork gets new persisted ID, copies history, and subsequent messages leave source unchanged');
 // B09: the title bar's View options menu (cf74bc599 ZT) holds no session commands; /review opens the same dialog.
 await command('/review');
 await page.getByRole('dialog',{name:'Review code',exact:true}).waitFor();report.reviewDialog=await dialogPaint('Review code');assert.equal(report.reviewDialog.closeButtons,1);await chooseSetting(page,'Review target','baseBranch');await page.getByLabel('Base branch',{exact:true}).fill('--help');await page.getByRole('button',{name:'Start review'}).click();await page.getByRole('alert').filter({hasText:'Invalid Git reference'}).waitFor();assert.equal((await trace()).filter(m=>m.method==='review/start').length,0);
 await page.getByLabel('Base branch',{exact:true}).fill('main');await page.getByRole('button',{name:'Start review'}).click();await page.getByRole('dialog',{name:'Review code',exact:true}).waitFor({state:'detached'});await page.locator('[data-operation="review"][data-phase="completed"]').waitFor();
 await page.getByRole('button').filter({hasText:'Review result'}).click();await page.getByText('ACTION_REVIEW_RESULT: no issues in the isolated fixture.',{exact:true}).waitFor();await page.screenshot({path:path.join(profile,'review-result.png')});
 const review=(await trace()).find(m=>m.method==='review/start');assert.deepEqual(review.params.target,{type:'baseBranch',branch:'main'});assert.equal(review.params.delivery,'inline');
 report.checks.push('/review dialog validates references and dispatches inline base-branch review; review result rendered');
 await command('/review');await page.getByRole('button',{name:'Start review'}).click();await page.getByRole('dialog',{name:'Review code',exact:true}).waitFor({state:'detached'});await page.locator('[data-operation="review"][data-phase="completed"]').waitFor();
 assert.equal((await trace()).filter(m=>m.method==='review/start').at(-1).params.target.type,'uncommittedChanges');
 await command('/review');await chooseSetting(page,'Review target','commit');await page.getByRole('textbox',{name:'Commit',exact:true}).fill('HEAD');await page.getByRole('button',{name:'Start review'}).click();await page.getByRole('dialog',{name:'Review code',exact:true}).waitFor({state:'detached'});await page.locator('[data-operation="review"][data-phase="completed"]').waitFor();
 const expectedSha=execFileSync('git',['-C',workspace,'rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.deepEqual((await trace()).filter(m=>m.method==='review/start').at(-1).params.target,{type:'commit',sha:expectedSha});
 report.checks.push('uncommitted review and commit UI; main resolves HEAD to actual commit SHA');
 await command('/model');await page.getByRole('menu',{name:'Models',exact:true}).waitFor();await page.keyboard.press('Escape');
 await command('/permissions');await page.getByRole('menu',{name:'Mode',exact:true}).waitFor();await page.keyboard.press('Escape');
 await command('/plan');await page.getByRole('button',{name:'Permission mode',exact:true}).filter({hasText:'Plan'}).waitFor();assert.equal(JSON.parse(await fs.readFile(path.join(profile,'preferences.json'))).permission,'plan');
 // cc43287c9 rename argument directly dispatches the title update.
 await command('/rename Renamed fork');await page.locator('.st-title').filter({hasText:'Renamed fork'}).waitFor();assert.equal(await page.getByRole('dialog',{name:'Rename session'}).count(),0);
 await command('/diff');await page.getByRole('button',{name:'Close panel',exact:true}).waitFor();await page.getByRole('button',{name:'Close panel',exact:true}).click();
 await fs.writeFile(path.join(profile,'rates-unavailable.marker'),'isolated');await command('/usage');await page.getByRole('dialog',{name:'Usage',exact:true}).getByRole('alert').filter({hasText:'Rate limits temporarily unavailable'}).waitFor();assert.equal(await page.locator('.session-limit').count(),0);assert.equal(await page.getByRole('dialog',{name:'Usage',exact:true}).getByRole('meter').count(),0);await page.keyboard.press('Escape');
 // The dialog stays mounted with #root inert through its exit transition (use-modal-presence.js/modal-inert.mjs); typing
 // before it detaches is dropped (r6: /review HOLD never reached the composer), so wait as the /usage close above does.
 await page.getByRole('dialog',{name:'Usage',exact:true}).waitFor({state:'detached'});await fs.rm(path.join(profile,'rates-unavailable.marker'));
 report.checks.push('model, permission, plan, rename and diff commands reuse working UI; rate-limit failure remains unavailable');

 await command('/review HOLD');await page.getByRole('button',{name:'Start review'}).click();await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor();
 // Official status is deferred during a running turn, never a fabricated live card.
 await command('/status');await page.getByRole('alert').filter({hasText:'Session info is available when DeepSeek finishes this turn.'}).waitFor();await fillComposer(page,editor,'');await page.getByRole('button',{name:'Dismiss error'}).click();
 await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();await page.locator('[data-operation="review"][data-phase="failed"]').filter({hasText:'Task stopped'}).waitFor();await idle();
 await command('/review FAIL');await page.getByRole('button',{name:'Start review'}).click();await page.getByRole('dialog',{name:'Review code',exact:true}).getByRole('alert').filter({hasText:'Review failed'}).waitFor();await page.keyboard.press('Escape');
 report.checks.push('status deferred during running review, real interrupt exact turn, failed review keeps retryable form');
 await command('/review DISCONNECT');await page.getByRole('button',{name:'Start review'}).click();await page.locator('[data-operation="review"][data-phase="failed"]').waitFor();await page.keyboard.press('Escape');
 const denied=await page.evaluate(async id=>{try{await window.desktop.call('session-action',{operation:'fork',threadId:id,permission:'plan',mode:'code',expected:{connectionId:'old',connectionEpoch:1}});return false;}catch{return true;}},fork);assert.equal(denied,true);
 report.checks.push('disconnect ends pending UI and stale connection mutation rejected');
 assert.deepEqual(errors,[]);report.passed=true;report.threadIds=[original,fork];report.trace=await trace();
}catch(error){report.error=error.stack;process.exitCode=1;if(page){await page.screenshot({path:path.join(profile,'failure.png')}).catch(()=>{});
 // Failure-path evidence only (HANDOFF 0.2.124): focus owner, composer state and open dialogs.
 report.failureState=await page.evaluate(()=>{const e=document.querySelector('[data-cds="ChatComposerEditor"]'),a=document.activeElement;return {active:a&&{tag:a.tagName,label:a.getAttribute('aria-label'),cls:String(a.className).slice(0,80)},composer:e&&{value:e.value,editable:e.getAttribute('contenteditable'),inert:!!e.closest('[inert]'),text:e.textContent},dialogs:[...document.querySelectorAll('[role=dialog]')].map(d=>({label:d.getAttribute('aria-label'),open:d.getAttribute('data-open')}))};}).catch(error=>({error:error.message}));}}
finally{
 await app?.close().catch(error=>{report.error ||=error.stack;report.passed=false;process.exitCode=1;});
 report.finishedAt=new Date().toISOString();report.errors=errors;report.sourceHashesAfter=await hashes();assert.deepEqual(report.sourceHashesAfter,report.sourceHashes);
 await fs.writeFile(path.join(profile,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(evidence,appPath?'session-actions-installed.json':'session-actions-local.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,profile,checks:report.checks,error:report.error},null,2));
}
