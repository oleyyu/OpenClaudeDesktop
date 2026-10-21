// OpenClaude Desktop's own computer-use tools (electron/agent-tools/computer-use.mjs) in the real app against the fixture
// core, without taking the screen: the window is transparent and click-through while it runs.
//   1. fixture:computer-use-app — a code_desktop app_screenshot row expands to its element summary and the picture
//   2. fixture:app-tool request_access — the access card names Finder by bundle id with its icon; after "Allow for this
//      session" the same session's next request_access answers without a card, and app_list_windows runs with the grant
//      (the last call reaches the native module: read-only, Finder's window list)
//   2c. fixture:app-tool request_teach_access — the teach card (official markup); Deny answers teach_declined
//   3. Settings › System › Computer use — Finder is listed under Allowed apps; Remove revokes it (the next app_list_windows
//      is app_not_granted) and shows the empty state; the switch saves agentComputerUse: false
//   4. a relaunch restores the saved preferred mode (Full control)
//   5. full control's side panel (side-panel.cjs) docks this transparent window in the top-right corner and puts it back
// Run from app/ after `npm run build`: node scripts/computer-use-tools-ui-test.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'computer-use-tools-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true}));
// The fixture's "screenshot": Finder's icon as a PNG (sips ships with macOS).
execFileSync('/usr/bin/sips',['-s','format','png','/System/Library/CoreServices/Finder.app/Contents/Resources/Finder.icns','--out',path.join(profile,'fixture-computer.png')],{stdio:'ignore'});
const env={...process.env,CODE_DESKTOP_OFFSCREEN_LAUNCH:'1',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const report={directory,checks:[],rendererErrors:[],passed:false};
const launch=()=>electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});
let app=await launch();
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.rendererErrors.push(e.message));
 // CODE_DESKTOP_OFFSCREEN_LAUNCH keeps extra windows hidden but shows the first; this one stays rendered (no hidden-page
 // throttling) but transparent and click-through, so the user's screen is never covered.
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows()){w.setOpacity(0);w.setIgnoreMouseEvents(true);}});
 await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 const input=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
 const send=async(text)=>{await fillComposer(page,input,text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();};

 // 1. The screenshot row.
 await send('fixture:computer-use-app');await page.getByText('COMPUTER_USE_APP_FIXTURE_DONE').waitFor({timeout:15000});
 const group=page.locator('[data-tool-group]').last();const toggles=group.locator('[data-cds-row-toggle]');
 await toggles.first().click();await page.waitForTimeout(400);
 const rows=await toggles.evaluateAll(list=>list.map(b=>document.getElementById(b.getAttribute('aria-labelledby'))?.innerText??''));
 const index=rows.findIndex(label=>/app screenshot|Captured window/.test(label));assert.ok(index>0,`a screenshot row: ${JSON.stringify(rows)}`);
 await toggles.nth(index).click();await page.waitForTimeout(400);
 const body=await toggles.nth(index).evaluate(b=>({expanded:b.getAttribute('aria-expanded'),text:document.getElementById(b.getAttribute('aria-controls')||'')?.innerText??''}));
 assert.equal(body.expanded,'true');assert.match(body.text,/Window 133 of com\.apple\.finder/);
 assert.ok(await group.locator('img[src^="data:image/png"]').count()>=1,'the row shows the picture');
 report.checks.push('A code_desktop app_screenshot row expands to its element summary and shows the picture');

 // 2. The access card, once per session.
 const ask='fixture:app-tool request_access {"apps":["Finder"],"reason":"List the Finder windows"}';
 const allow=page.getByRole('button',{name:/Allow for this session/});
 await send(ask);await allow.waitFor({timeout:15000});
 const card=await page.evaluate(()=>{const row=document.querySelector('[data-cua-app]');return {app:row?.dataset.cuaApp??null,icon:!!row?.querySelector('img[src^="data:image/png"]'),risk:row?.dataset.cuaRisk??null};});
 assert.deepEqual(card,{app:'com.apple.finder',icon:true,risk:'filesystem'});
 // Official c96d752d0 JEe: the preferred mode is Background and full control isn't approved → the Background line above the rows.
 const note=await page.evaluate(()=>{const p=document.querySelector('[data-cua-note]');return p?{kind:p.dataset.cuaNote,className:p.className,text:p.textContent}:null;});
 assert.deepEqual(note,{kind:'background',className:'text-footnote text-muted-as-secondary',text:'DeepSeek will work in these apps in the background while you keep using your Mac.'});
 await page.screenshot({path:path.join(directory,'access-card.png')});
 await page.waitForTimeout(700); // allow clicks arm 400 ms after the card appears (source-approval-card.jsx useAllowArming)
 await allow.click();await allow.waitFor({state:'detached',timeout:5000});
 await page.waitForFunction(()=>/"tier": "full"/.test(document.body.innerText),null,{timeout:15000});
 report.checks.push('request_access raises the access card (Finder by bundle id, its icon, the file-system risk) and Allow grants it');
 const items=()=>page.locator('[data-transcript-item-id]').count(),before=await items();
 await send(ask);
 const end=Date.now()+4000;let carded=false;
 while(Date.now()<end&&!carded){carded=await allow.isVisible().catch(()=>false);if(!carded)await page.waitForTimeout(50);}
 assert.equal(carded,false,'no second card in the same session');
 await page.waitForFunction(n=>document.querySelectorAll('[data-transcript-item-id]').length>n,before,{timeout:15000});
 await send('fixture:app-tool app_list_windows {"app":"com.apple.finder"}');
 await page.waitForFunction(()=>/"windows"|APP_TOOL_ERROR/.test(document.body.innerText),null,{timeout:15000});
 const calls=(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(entry=>entry.method==='mcp:tools/call');
 assert.deepEqual(calls.map(call=>[call.params.name,call.params.result?.isError===true]),[['request_access',false],['request_access',false],['app_list_windows',false]]);
 report.checks.push('The same session asks again without a card, and app_list_windows runs with the grant');

 // 2b. request_full_control raises the take-over card (official c96d752d0 JEe takeoverFrom): no app or capability rows,
 //     the "Take over the screen?" title, "Deny" and "Allow for this session". (The docked strip the lock
 //     drives is covered in the in-use unit test — the fixture's turn ends at once, so the lock the official build
 //     releases at turn end would only flash here.)
 await send('fixture:app-tool request_full_control {}');
 const takeoverAllow=page.getByRole('button',{name:/Allow for this session/});
 await takeoverAllow.waitFor({timeout:15000});
 await page.getByText(/Take over the screen\?/).waitFor({timeout:5000});
 await page.getByRole('button',{name:/^Deny/}).last().waitFor({timeout:5000});
 const takeoverCard=await page.evaluate(()=>{
   const card=[...document.querySelectorAll('[data-approval-kind="elicitation"]')].find(el=>/Take over the screen/.test(el.innerText));
   return {hasAppRows:!!card?.querySelector('[data-cua-app]'),hasCapabilityRows:!!card?.querySelector('[data-cua-capability]'),
     deny:!!card&&/Deny/.test(card.innerText),stay:!!card&&/Stay in background/.test(card.innerText)};});
 assert.deepEqual(takeoverCard,{hasAppRows:false,hasCapabilityRows:false,deny:true,stay:false},'the take-over card: no app/capability rows, Deny (not Stay in background)');
 await page.screenshot({path:path.join(directory,'takeover-card.png')});
 await page.waitForTimeout(700); // the allow arms 400 ms after the card appears
 await takeoverAllow.click();await takeoverAllow.waitFor({state:'detached',timeout:5000});
 await page.waitForFunction(()=>/"outcome": "ok"|"approved": true|already approved/i.test(document.body.innerText),null,{timeout:15000});
 report.checks.push('request_full_control raises the take-over card (no app rows, Deny + Allow for this session) and Allow approves full-screen control');
 await send('fixture:app-tool release_full_control {}');
 await page.waitForFunction(()=>/Released full-screen control|nothing to release/.test(document.body.innerText),null,{timeout:15000});
 report.checks.push('release_full_control hands the screen back');

 // 2c. request_teach_access raises the teach card (official ca31fdde5 Ua): the GraduationCap header "Let … guide you step
 //     by step?", the reason, what happens, Finder's row (Already allowed: granted above), Deny (⌘.) and Start guide (⌘↵).
 //     Deny answers teach_declined; nothing is shown on the screen. (Start guide and the tooltips: computer-use-teach-live.mjs.)
 await send('fixture:app-tool request_teach_access {"apps":["Finder"],"reason":"finding a file in Finder"}');
 const startGuide=page.locator('[data-computer-use-teach] [data-approval-action="acceptForSession"]');
 await startGuide.waitFor({timeout:15000});
 const teachCard=await page.evaluate(()=>{const card=document.querySelector('[data-computer-use-teach]');if(!card)return null;
   return {shell:card.className.split(' ').slice(0,7).join(' '),root:card.hasAttribute('data-approval-root'),
     head:card.querySelector('.p-md > .mb-1.flex.items-start.gap-2 > span.font-semibold')?.textContent??null,
     reason:card.querySelector('p.ms-7.mb-2')?.textContent??null,note:card.querySelector('p.ms-7.mb-3.text-footnote')?.textContent??null,
     app:card.querySelector('.divide-y [data-cua-app]')?.dataset.cuaApp??null,badge:card.querySelector('.divide-y [data-cds=Badge]')?.textContent??null,
     buttons:[...card.querySelectorAll('.ms-7.flex.gap-sm button .sac-button-label')].map(b=>b.textContent),capabilities:card.querySelectorAll('[data-cua-capability]').length};});
 assert.deepEqual(teachCard,{shell:'source-message mb-4 overflow-hidden rounded-card border bg-surface-panel shadow-lg',root:true,
   head:'Let DeepSeek guide you step by step?',reason:'finding a file in Finder',
   note:'The DeepSeek window will hide. A tooltip appears next to each step with a Next button. Click Exit anytime to stop.',
   app:'com.apple.finder',badge:'Already allowed',buttons:['Deny','Start guide'],capabilities:0});
 // The hiding line (official willHide): only when the next full-screen action would hide some app on this display.
 const teachHide=await page.evaluate(()=>{const p=document.querySelector('[data-computer-use-teach] [data-cua-note="hide"]');return p?{className:p.className,text:p.textContent}:null;});
 if(teachHide)assert.deepEqual(teachHide,{className:'ms-7 mb-3 text-body text-secondary',text:'Your other windows will be hidden, then restored when DeepSeek is done.'});
 report.teachHideLine=teachHide;
 await page.locator('[data-computer-use-teach]').scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(directory,'teach-card.png')});
 await page.locator('[data-computer-use-teach] [data-approval-action="decline"]').click();
 await startGuide.waitFor({state:'detached',timeout:5000});
 await page.waitForFunction(()=>/teach_declined/.test(document.body.innerText),null,{timeout:15000});
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>!w.isDestroyed()&&/cu-teach-/.test(w.webContents.getURL()))),false,'no overlay was made');
 report.checks.push('request_teach_access raises the teach card (official shell, GraduationCap header, reason, Finder already allowed, Deny / Start guide) and Deny answers teach_declined');

 // 3. Settings › System › Computer use: the allowed app is listed; removing it revokes the grant; the switch drops the tools.
 await page.keyboard.press('Meta+,');const settings=page.getByRole('dialog',{name:'Settings',exact:true});await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'System',exact:true}).click();
 const section=settings.locator('section.ss-group',{has:page.getByRole('heading',{name:/Computer use/})});
 await section.waitFor({timeout:5000});
 assert.match(await section.locator('h3').innerText(),/Computer use\s*Beta/);
 await section.locator('[data-setting-id="computer-use-preferred-mode"] [data-cds="SegmentedControl"]').waitFor({timeout:5000});
 assert.ok(await section.getByRole('radio',{name:'Background',exact:true}).count()>=1,'the preferred-mode Background segment');
 assert.ok(await section.getByRole('radio',{name:'Full control',exact:true}).count()>=1,'the preferred-mode Full control segment');
 report.checks.push('Settings shows the Background / Full control preferred-mode segmented control');
 // The Teach mode row says whether teach mode can run here (computer-use:probe), never "not available in this build".
 await page.waitForFunction(()=>{const t=[...document.querySelectorAll('section.ss-group')].find(s=>/Computer use/.test(s.querySelector('h3')?.textContent||''))?.innerText||'';return /Teach mode/.test(t)&&/(ask it to teach you|Accessibility and Screen Recording permission|can’t run on this computer)/.test(t);},null,{timeout:5000});
 assert.doesNotMatch(await section.innerText(),/Not available in this build/);
 report.checks.push('Settings › Computer use: the Teach mode row reflects whether teach mode can run here');
 // Choosing Full control saves computerUsePreferredMode (checked again after a relaunch, at the end).
 await section.getByRole('radio',{name:'Full control',exact:true}).first().click();
 for(let i=0;i<50;i++){const saved=JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8'));if(saved.computerUsePreferredMode==='full_control')break;await page.waitForTimeout(100);}
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).computerUsePreferredMode,'full_control');
 report.checks.push('Choosing Full control saves computerUsePreferredMode: full_control');
 const chip=section.locator('[data-computer-use-allowed] > div');
 await chip.first().waitFor({timeout:5000});
 assert.deepEqual(await chip.locator('span.text-primary').allInnerTexts(),['Finder']);
 await section.scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(directory,'settings-computer-use.png')});
 await section.getByRole('button',{name:'Remove Finder from allowed apps',exact:true}).click();
 await section.getByText(/No apps allowed right now/).waitFor({timeout:5000});
 await page.screenshot({path:path.join(directory,'settings-computer-use-empty.png')});
 report.checks.push('Settings › System › Computer use lists Finder as allowed; Remove revokes it and shows the empty state');
 await settings.getByRole('button',{name:'Close',exact:true}).first().click().catch(()=>page.keyboard.press('Escape'));
 await settings.waitFor({state:'detached',timeout:5000}).catch(()=>page.keyboard.press('Escape'));
 await send('fixture:app-tool app_list_windows {"app":"com.apple.finder"}');
 await page.waitForFunction(()=>(document.body.innerText.match(/app_not_granted/g)||[]).length>=1,null,{timeout:15000});
 report.checks.push('After the revoke, app_list_windows answers app_not_granted');
 await page.keyboard.press('Meta+,');await settings.waitFor();
 await settings.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'System',exact:true}).click();
 await section.getByRole('switch',{name:'Enable computer use'}).click();
 await section.getByText(/Allowed apps/).waitFor({state:'detached',timeout:5000});
 const prefs=JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8'));
 assert.equal(prefs.agentComputerUse,false);
 report.checks.push('The Enable computer use switch saves agentComputerUse: false and hides the rows below it');
 assert.deepEqual(report.rendererErrors,[]);
 // 4. A relaunch restores the saved preferred mode (main.cjs restores it once preferences.json is read): the segmented
 //    control shows Full control selected. (Computer use is switched back on in the file so the rows show.)
 await app.close();
 await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({...JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')),agentComputerUse:true}));
 app=await launch();
 const again=await app.firstWindow();again.on('pageerror',e=>report.rendererErrors.push(e.message));
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows()){w.setOpacity(0);w.setIgnoreMouseEvents(true);}});
 await again.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 await again.keyboard.press('Meta+,');const settings2=again.getByRole('dialog',{name:'Settings',exact:true});await settings2.waitFor();
 await settings2.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'System',exact:true}).click();
 const section2=settings2.locator('section.ss-group',{has:again.getByRole('heading',{name:/Computer use/})});
 await section2.locator('[data-setting-id="computer-use-preferred-mode"] [data-cds="SegmentedControl"]').waitFor({timeout:5000});
 const fullRadio=section2.getByRole('radio',{name:'Full control',exact:true}).first();
 await again.waitForFunction(()=>[...document.querySelectorAll('[data-setting-id="computer-use-preferred-mode"] [role=radio]')].some(r=>/Full control/.test(r.textContent||r.getAttribute('aria-label')||'')&&r.getAttribute('aria-checked')==='true'),null,{timeout:5000});
 assert.equal(await fullRadio.getAttribute('aria-checked'),'true');
 assert.equal(await section2.getByRole('radio',{name:'Background',exact:true}).first().getAttribute('aria-checked'),'false');
 await again.screenshot({path:path.join(directory,'settings-preferred-mode-restored.png')});
 report.checks.push('After a relaunch, Settings shows Full control selected (the saved preferred mode is restored)');
 assert.deepEqual(report.rendererErrors,[]);
 await again.keyboard.press('Escape');await settings2.waitFor({state:'detached',timeout:5000}).catch(()=>again.keyboard.press('Escape'));

 // 5. Full control's side panel (electron/computer-use/side-panel.cjs, official [cu-side-panel]) on this real, transparent
 //    window: the dock state alone folds the frame to the narrow layout; a lock docks the window in the top-right corner
 //    of its display's work area (min(520, w-20) × min(720, h-20), 20 px in), floating on every Space; the release puts
 //    back the bounds, the minimum size and the maximized state. The module runs as main.cjs wires it (the dock state
 //    goes to the window as "computer-use-dock-state"), except that focus is not taken on release (focus: no-op), so the
 //    user's front app keeps the keyboard while this runs. The fixture's turns end at once, so a real lock would only
 //    flash the dock; main.cjs's wiring is covered in tests/computer-use-side-panel.test.mjs.
 const collapsed=()=>again.evaluate(()=>document.querySelector('.dframe-root')?.classList.contains('sidebar-collapsed')??null);
 const wide=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(x=>!x.isDestroyed()&&x.isVisible());const a=screen.getDisplayMatching(w.getBounds()).workArea;
  w.setBounds({x:a.x+40,y:a.y+30,width:Math.min(1200,a.width-80),height:Math.min(800,a.height-60)});return w.getBounds();});
 await again.waitForFunction(()=>!document.querySelector('.dframe-root')?.classList.contains('sidebar-collapsed'),null,{timeout:5000});
 const setup=await app.evaluate(({BrowserWindow,screen},mainPath)=>{
  const load=process.mainModule?process.mainModule.require.bind(process.mainModule):process.getBuiltinModule('module').createRequire(mainPath);
  const {createSidePanel,dockedBounds}=load('./computer-use/side-panel.cjs');
  const w=BrowserWindow.getAllWindows().find(x=>!x.isDestroyed()&&x.isVisible());
  const send=(win,docked,holder)=>win.webContents.send('desktop:event',{kind:'computer-use-dock-state',docked,holder});
  globalThis.__cuSidePanelTest={w,send,panel:createSidePanel({screen,dispatch:send,focus:()=>{}})};
  return {expected:dockedBounds(w,screen),before:w.getBounds(),min:w.getMinimumSize(),onTop:w.isAlwaysOnTop(),allSpaces:w.isVisibleOnAllWorkspaces()};},path.join(root,'electron/main.cjs'));
 assert.deepEqual(setup.before,wide);assert.equal(setup.onTop,false);
 // The event alone (no resize): the frame folds to the narrow layout, and unfolds when it says undocked.
 await app.evaluate(()=>{const t=globalThis.__cuSidePanelTest;t.send(t.w,true,'ui-test');});
 await again.waitForFunction(()=>document.querySelector('.dframe-root')?.classList.contains('sidebar-collapsed'),null,{timeout:5000});
 await app.evaluate(()=>{const t=globalThis.__cuSidePanelTest;t.send(t.w,false,null);});
 await again.waitForFunction(()=>!document.querySelector('.dframe-root')?.classList.contains('sidebar-collapsed'),null,{timeout:5000});
 report.checks.push('The dock state alone folds the frame to the narrow layout (sidebar collapsed) and undocking unfolds it');
 const settle=async()=>{let last=null;for(let i=0;i<60;i++){const b=await app.evaluate(()=>globalThis.__cuSidePanelTest.w.getBounds());if(last&&JSON.stringify(b)===JSON.stringify(last))return b;last=b;await again.waitForTimeout(60);}return last;};
 await app.evaluate(()=>globalThis.__cuSidePanelTest.panel.lockChanged('ui-test-holder',{window:globalThis.__cuSidePanelTest.w}));
 const dockedAt=await settle();
 const docked=await app.evaluate(()=>{const {w,panel}=globalThis.__cuSidePanelTest;return {onTop:w.isAlwaysOnTop(),allSpaces:w.isVisibleOnAllWorkspaces(),min:w.getMinimumSize(),panel:panel.window()===w};});
 assert.deepEqual(dockedAt,setup.expected,'docked in the top-right corner of the work area');
 assert.ok(setup.expected.width<=520&&setup.expected.height<=720);assert.equal(docked.onTop,true);assert.equal(docked.allSpaces,true);assert.equal(docked.panel,true);
 assert.deepEqual(docked.min,[Math.min(setup.min[0],setup.expected.width),Math.min(setup.min[1],setup.expected.height)]);
 assert.equal(await collapsed(),true);
 await again.screenshot({path:path.join(directory,'side-panel-docked.png')});
 report.checks.push(`A lock docks the window at ${JSON.stringify(dockedAt)} (top-right of the work area), always on top and on every Space, minimum size ${JSON.stringify(docked.min)}; the frame is narrow`);
 await app.evaluate(()=>globalThis.__cuSidePanelTest.panel.lockChanged(null,{window:globalThis.__cuSidePanelTest.w}));
 const restoredAt=await settle();
 const restored=await app.evaluate(()=>{const {w,panel}=globalThis.__cuSidePanelTest;return {onTop:w.isAlwaysOnTop(),allSpaces:w.isVisibleOnAllWorkspaces(),min:w.getMinimumSize(),panel:panel.window()};});
 assert.deepEqual(restoredAt,setup.before);assert.deepEqual(restored,{onTop:false,allSpaces:setup.allSpaces,min:setup.min,panel:null});
 await again.waitForFunction(()=>!document.querySelector('.dframe-root')?.classList.contains('sidebar-collapsed'),null,{timeout:5000});
 report.checks.push('The release restores the bounds, the minimum size, not floating, not on every Space; the frame unfolds');
 // A maximized window is un-maximized to dock and maximized again after.
 await app.evaluate(()=>globalThis.__cuSidePanelTest.w.maximize());
 await again.waitForTimeout(600);
 const maxBounds=await settle();
 await app.evaluate(()=>globalThis.__cuSidePanelTest.panel.lockChanged('ui-test-holder',{window:globalThis.__cuSidePanelTest.w}));
 await settle();
 assert.equal(await app.evaluate(()=>globalThis.__cuSidePanelTest.w.isMaximized()),false);
 await app.evaluate(()=>globalThis.__cuSidePanelTest.panel.lockChanged(null,{window:globalThis.__cuSidePanelTest.w}));
 await again.waitForTimeout(600);await settle();
 assert.equal(await app.evaluate(()=>globalThis.__cuSidePanelTest.w.isMaximized()),true);
 report.checks.push(`A maximized window (${JSON.stringify(maxBounds)}) is un-maximized to dock and maximized again after the release`);
 await app.evaluate(()=>{const t=globalThis.__cuSidePanelTest;t.w.unmaximize();delete globalThis.__cuSidePanelTest;});
 assert.deepEqual(report.rendererErrors,[]);
 report.passed=true;
}finally{
 await app.close();
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
