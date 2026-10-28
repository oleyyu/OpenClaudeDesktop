// Teach mode live, in the real app (CU_LIVE=1): request_teach_access → Start guide → screenshot → a two-step teach_batch
// whose tooltips appear on the real overlay window (electron/computer-use/teach.cjs, the official page teach-page.cjs)
// and whose actions run on the real native module, then a teach_step ended with Exit. The fixture core
// (tests/fixtures/codex-server.cjs 'fixture:app-tools') makes the calls in one turn, as a model would; this script plays
// the user: it clicks Start guide on the card and Next / Exit in the overlay page (Playwright, through the page's own
// buttons → the CuTeach preload → main). The step actions are the ones that answer with the screen locked too
// (cursor_position, wait, screenshot): nothing is clicked or typed on the user's screen. The app's main window is
// transparent and click-through while it runs; the overlay is click-through except over its tooltip.
// Run from app/ after `npm run build`: CU_LIVE=1 node scripts/computer-use-teach-live.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
import {presenceSkip} from '../tests/computer-use-live-helpers.mjs';
// The presence gate (tests/computer-use-live-helpers.mjs): CU_LIVE=1, an unlocked screen and nobody at this Mac for 120 s
// (CU_LIVE_FORCE=1 runs it anyway); otherwise skipped with the reason.
{const skipped=await presenceSkip();if(skipped){console.log(JSON.stringify({skipped}));process.exit(0);}}
const require=createRequire(import.meta.url);
const root=path.resolve(import.meta.dirname,'..');
const native=require('../electron/computer-use/native.cjs').createNative();
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'computer-use-teach-live-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true}));
const env={...process.env,CODE_DESKTOP_OFFSCREEN_LAUNCH:'1',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const report={directory,before:null,after:null,checks:[],states:[],rendererErrors:[],passed:false};
const facts=async()=>{const probe=await native.call('probe').catch(e=>({error:e.message}));const front=await native.call('frontmostApp').catch(()=>null);const cursor=await native.call('cursorPosition').catch(()=>null);
  return {screenLocked:probe.screenLocked,secureInput:probe.secureInput,idle:probe.secondsSinceUserInput,ownInput:probe.secondsSinceOwnInput,front:front?.bundleId??null,cursor};};
report.before=await facts();
// With the displays asleep (a locked screen whose display went dark) there is no display to capture: the screenshot calls
// are left out and the anchor can't be placed (the tooltip centers, as official ei() does when R() fails).
const displaysUp=((await native.call('listDisplays').catch(()=>null))?.displays??[]).length>0;
report.before.displaysUp=displaysUp;
const app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});
const requests=async()=>(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8').catch(()=>'')).split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(e=>e.method==='mcp:tools/call').map(e=>e.params);
const overlayPage=async(timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){for(const w of app.windows()){if(/cu-teach-\d+\.html$/.test(w.url()))return w;}await new Promise(r=>setTimeout(r,100));}throw new Error('no teach overlay window');};
// focusable: the app's own windows (the main window); the glow and the overlay never take focus.
const windowFacts=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).map(w=>({teach:/cu-teach-/.test(w.webContents.getURL()),visible:w.isVisible(),onTop:w.isAlwaysOnTop(),focusable:w.isFocusable(),bounds:w.getBounds()})));
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.rendererErrors.push(e.message));
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows()){w.setOpacity(0);w.setIgnoreMouseEvents(true);}});
 await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 const input=page.getByRole('textbox',{name:'Message DeepSeek',exact:true});
 const send=async(text)=>{await fillComposer(page,input,text);await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();};
 const steps=[
   {explanation:'Step one of two. This tooltip points at a spot near the top left of the screen.',next_preview:'Next: I\'ll read where the pointer is and wait a moment.',anchor:[300,200],
    actions:[{action:'cursor_position'},{action:'wait',duration:0.3}]},
   {explanation:'Step two of two. A centered tooltip with no arrow.',next_preview:'',actions:displaysUp?[{action:'screenshot',scale:0.3}]:[{action:'wait',duration:0.1},{action:'cursor_position'}]},
 ];
 await send(`fixture:app-tools ${JSON.stringify([['request_teach_access',{apps:['Finder'],reason:'a two-step teach test'}],...(displaysUp?[['screenshot',{scale:0.5}]]:[]),['teach_batch',{steps}]])}`);
 // The user: Start guide.
 const start=page.locator('[data-computer-use-teach] [data-approval-action="acceptForSession"]');
 await start.waitFor({timeout:15000});
 await page.waitForTimeout(700);await start.click();
 report.checks.push('The teach card came up and Start guide was clicked');
 const overlay=await overlayPage();
 assert.equal(await overlay.title(),'Teaching');
 await overlay.evaluate(()=>{window.__states=[];const t=document.getElementById('tooltip');new MutationObserver(()=>window.__states.push(t.className)).observe(t,{attributes:true,attributeFilter:['class']});});
 const showing=async(text)=>{await overlay.waitForFunction(t=>document.getElementById('tooltip').classList.contains('visible')&&!document.getElementById('tooltip').classList.contains('is-working')&&document.getElementById('explanation').textContent===t,text,{timeout:15000});
   return overlay.evaluate(()=>({explanation:document.getElementById('explanation').textContent,preview:document.getElementById('next-preview').textContent,arrow:document.getElementById('arrow').className,
     left:document.getElementById('tooltip').style.left,top:document.getElementById('tooltip').style.top,dark:document.body.className}));};
 const first=await showing(steps[0].explanation);
 report.states.push({step:1,...first});
 assert.equal(first.preview,steps[0].next_preview);
 assert.equal(first.arrow,displaysUp?'arrow arrow-top':'arrow arrow-none',displaysUp?'an anchor near the top: the tooltip below it, the arrow on its top edge':'no display to place the anchor on: centered');
 const wins=await windowFacts();
 report.states.push({windows:wins});
 const teachWin=wins.find(w=>w.teach);
 assert.ok(teachWin?.visible&&teachWin.onTop&&teachWin.focusable===false,'the overlay is up, on top and never focusable');
 assert.ok(wins.filter(w=>!w.teach&&w.focusable).every(w=>!w.visible),'the main window is hidden while a step is shown');
 await overlay.screenshot({path:path.join(directory,'teach-step-1.png')});
 report.checks.push(`Step 1: the tooltip shows the explanation and next line, ${displaysUp?'anchored (arrow-top)':'centered (no display to place the anchor on)'}, the overlay is on top, the main window is hidden`);
 // The user: Next.
 await overlay.locator('#next-btn').click();
 const second=await showing(steps[1].explanation);
 report.states.push({step:2,...second});
 assert.equal(second.arrow,'arrow arrow-none','no anchor: centered, no arrow');
 assert.equal(second.preview,'');
 await overlay.screenshot({path:path.join(directory,'teach-step-2.png')});
 const states=await overlay.evaluate(()=>window.__states);
 report.states.push({classChanges:states});
 assert.ok(states.some(c=>/is-working/.test(c)),'Working… showed while step 1\'s actions ran');
 report.checks.push('Next ran step 1\'s actions (Working… meanwhile) and moved the tooltip to step 2, centered');
 await overlay.locator('#next-btn').click();
 await page.waitForFunction(()=>/"stepsCompleted": ?2/.test(document.body.innerText),null,{timeout:20000});
 const calls=await requests();
 const batch=calls.find(c=>c.name==='teach_batch');
 assert.ok(batch&&!batch.result?.isError,'teach_batch answered without an error');
 const answer=JSON.parse(batch.result.content[0].text);
 report.states.push({teachBatch:answer,parts:batch.result.content.map(p=>p.type)});
 assert.equal(answer.stepsCompleted,2);
 assert.deepEqual(answer.results.map(step=>step.map(r=>[r.action,r.ok])),[[['cursor_position',true],['wait',true]],displaysUp?[['screenshot',true]]:[['wait',true],['cursor_position',true]]]);
 // The final screenshot (official ni(): only the answer when the capture fails, e.g. no display awake).
 assert.equal(batch.result.content.at(-1).type,displaysUp?'image':'text');
 const access=JSON.parse(calls.find(c=>c.name==='request_teach_access').result.content[0].text);
 assert.equal(access.teachModeActive,true);
 report.checks.push(`teach_batch returned stepsCompleted 2, each action ok, ${displaysUp?'and the final screenshot':'and no picture (no display awake to capture: the answer alone, as official ni())'}`);
 // The turn ended: the overlay fades out and hides, the main window is back.
 await new Promise(r=>setTimeout(r,800));
 const afterWins=await windowFacts();
 report.states.push({afterTurn:afterWins});
 assert.ok(afterWins.filter(w=>w.teach).every(w=>!w.visible),'the overlay hid when the turn ended');
 assert.ok(afterWins.some(w=>!w.teach&&w.focusable&&w.visible),'the main window came back');
 report.checks.push('The turn ending ended teach mode: the overlay hid and the main window came back');
 // Exit: a new tour, one step, the user clicks Exit.
 await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows()){if(!/cu-teach-/.test(w.webContents.getURL())){w.setOpacity(0);w.setIgnoreMouseEvents(true);}}});
 await send(`fixture:app-tools ${JSON.stringify([['request_teach_access',{apps:['Finder'],reason:'an exit test'}],['teach_step',{explanation:'Click Exit to stop.',next_preview:'Next: nothing',actions:[{action:'wait',duration:0}]}]])}`);
 await start.waitFor({timeout:15000});await page.waitForTimeout(700);await start.click();
 await showing('Click Exit to stop.');
 await overlay.locator('#exit-btn').click();
 const end=Date.now()+15000;let exited=null;
 while(Date.now()<end&&!exited){exited=(await requests()).filter(c=>c.name==='teach_step').at(-1)??null;if(!exited)await new Promise(r=>setTimeout(r,100));}
 report.states.push({exit:exited?.result});
 assert.deepEqual(JSON.parse(exited.result.content[0].text),{exited:true});
 await new Promise(r=>setTimeout(r,800));
 const exitWins=await windowFacts();
 report.states.push({afterExit:exitWins});
 assert.ok(exitWins.filter(w=>w.teach).every(w=>!w.visible),'the overlay hid after Exit');
 assert.ok(exitWins.some(w=>!w.teach&&w.focusable&&w.visible),'the main window came back after Exit');
 report.checks.push('Exit answered {exited: true}, stopped the turn, hid the overlay and brought the main window back');
 assert.deepEqual(report.rendererErrors,[]);
 report.passed=true;
}finally{
 await app.close().catch(()=>{});
 report.after=await facts();
 // Put the app that was in front back (never the login window, which only means the screen is locked).
 if(report.before.front&&report.after.front!==report.before.front&&report.before.front!=='com.apple.loginwindow'){
   const {execFileSync}=await import('node:child_process');try{execFileSync('/usr/bin/open',['-b',report.before.front]);report.restoredFront=report.before.front;}catch{}
 }
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
