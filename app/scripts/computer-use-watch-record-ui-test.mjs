// Watch-record, "Record a skill" (docs/computer-use-official-spec-20261021.md §2.4), in the real app against the fixture
// core and the fixture recorder (tests/fixtures/watch-record-native-fixture.cjs: no input tap, no screen capture, no
// microphone — synthetic frames and events). Every window is transparent and click-through, and no window may take focus,
// so the user's screen and keyboard are left alone.
//   1. the composer's Add menu has "Record a skill" (icon Recording); it opens the chooser window — the official page
//      (title, description, warning, Cancel / Start recording, 500×280) — and Cancel records nothing
//   2. Start recording without the macOS permissions → the "Grant macOS permissions" dialog (Accessibility / Screen
//      recording rows, "Close without granting permission"); Request on both → "Continue to recording", which resumes
//      without a second chooser
//   3. recording: the main window hides, the pill shows "Capturing" (472×112 at the work area's bottom centre)
//   4. Done → "Processing", the recording goes to a new session as one user message (turn/start input: the
//      <watch-record-demonstration> text with the pictures as localImage parts), shown as the "Recorded demonstration ·
//      N.Ns" card whose rows open; the pill goes and the main window is back
//   5. Customize › Skills › Add has "Record your screen"
// Run from app/ after `npm run build`: node scripts/computer-use-watch-record-ui-test.mjs
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {_electron as electron} from '../../tools/node_modules/playwright/index.mjs';
import {fillComposer} from './composer-test-helpers.mjs';
const root=path.resolve(import.meta.dirname,'..');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'watch-record-ui-')),profile=path.join(directory,'profile'),workspace=path.join(profile,'workspace');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(path.join(profile,'codex-home'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:workspace,theme:'light',mode:'code',model:'fixture',permission:'auto',threadIds:[],onboarded:true}));
const env={...process.env,CODE_DESKTOP_OFFSCREEN_LAUNCH:'1',CODE_DESKTOP_DATA:profile,CODEX_HOME:path.join(profile,'codex-home'),CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs'),
  CODE_DESKTOP_WATCH_RECORD_FIXTURE:'1',CODE_DESKTOP_WATCH_RECORD_FIXTURE_TCC:'denied'};
delete env.ELECTRON_RUN_AS_NODE;delete env.CODE_DESKTOP_DEV_URL;
const report={directory,checks:[],rendererErrors:[],passed:false};
const app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.rendererErrors.push(e.message));
 // Every window, now and later: invisible, click-through, never focused (the chooser's show()+focus() becomes showInactive).
 await app.evaluate(({app:electronApp,BrowserWindow})=>{
  const quiet=(w)=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);};
  for(const w of BrowserWindow.getAllWindows())quiet(w);
  electronApp.on('browser-window-created',(_event,w)=>quiet(w));
  BrowserWindow.prototype.focus=function(){};
  BrowserWindow.prototype.show=function(){this.showInactive();};
 });
 await page.waitForFunction(()=>{const c=document.querySelector('[data-cds=ChatComposer]');return c&&!c.hasAttribute('data-disabled');},null,{timeout:20000});
 const mainId=await app.evaluate(({BrowserWindow})=>Math.min(...BrowserWindow.getAllWindows().map(w=>w.id)));
 const mainVisible=()=>app.evaluate(({BrowserWindow},id)=>BrowserWindow.fromId(id).isVisible(),mainId);
 const windows=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).map(w=>({id:w.id,title:w.getTitle(),visible:w.isVisible(),bounds:w.getBounds(),url:w.webContents.getURL()})));
 const waitWindow=async(match,timeout=10000)=>{const end=Date.now()+timeout;while(Date.now()<end){const found=(await windows()).find(match);if(found)return found;await page.waitForTimeout(50);}throw new Error('window not found');};
 const run=(id,code)=>app.evaluate(({BrowserWindow},[id,code])=>BrowserWindow.fromId(id).webContents.executeJavaScript(code),[id,code]);
 const openRecord=async()=>{
  await page.locator('[data-cds="ChatComposerActions"] button[aria-label="Add"]').first().click();
  const item=page.getByRole('menuitem',{name:'Record a skill',exact:true});
  await item.waitFor({timeout:5000});
  await item.click();
 };

 // 1. The Add menu entry and the chooser; Cancel.
 await openRecord();
 let chooser=await waitWindow(w=>w.url.includes('wr-chooser-'));
 const page1=await run(chooser.id,`({h1:document.querySelector('h1').textContent.trim(),desc:document.querySelector('.desc').textContent.replace(/\\s+/g,' ').trim(),
   warn:document.querySelector('.warn span').textContent.replace(/\\s+/g,' ').trim(),buttons:[...document.querySelectorAll('.actions > .btn')].map(b=>b.textContent),
   mic:getComputedStyle(document.querySelector('.micGroup')).display,api:!!window["claude.internal.computerUse"]?.CuWatchRecordChooser})`);
 assert.deepEqual(page1,{h1:'Record a skill',desc:'Your screen, clicks, and typing are recorded, then sent to Claude and turned into a repeatable skill.',
  warn:"Don't type passwords or secrets, or display sensitive information or private conversations while recording.",buttons:['Cancel','Start recording'],mic:'none',api:true});
 assert.deepEqual([chooser.bounds.width,chooser.bounds.height],[500,280]);
 await run(chooser.id,`document.getElementById('cancel').click()`);
 await page.waitForFunction(()=>true);await page.waitForTimeout(300);
 assert.equal((await windows()).some(w=>w.url.includes('wr-chooser-')),false,'Cancel closes the chooser');
 assert.equal(await page.locator('[data-watch-record-permissions]').count(),0);
 report.checks.push('Add › "Record a skill" opens the official chooser (title, description, warning, Cancel / Start recording, 500×280, no microphone); Cancel closes it and records nothing');

 // 2. Start recording → the permissions dialog → Request both → Continue resumes without a chooser.
 await openRecord();
 chooser=await waitWindow(w=>w.url.includes('wr-chooser-'));
 await page.waitForTimeout(450); // the 300 ms input protection
 await run(chooser.id,`document.getElementById('record').click()`);
 const permissions=page.getByRole('dialog',{name:'Grant macOS permissions'});
 await permissions.waitFor({timeout:10000});
 const dialog1=await permissions.evaluate(node=>({text:node.innerText,rows:[...node.querySelectorAll('[data-watch-record-permission]')].map(row=>[row.dataset.watchRecordPermission,row.hasAttribute('data-granted')]),
  footer:node.querySelector('footer')?.innerText}));
 assert.match(dialog1.text,/To record your screen and actions, grant the macOS permissions below\./);
 assert.deepEqual(dialog1.rows,[['accessibility',false],['screenRecording',false]]);
 assert.equal(dialog1.footer.trim(),'Close without granting permission');
 for(const kind of ['accessibility','screenRecording'])await permissions.locator(`[data-watch-record-permission="${kind}"] button`).click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-watch-record-permission][data-granted]').length===2,null,{timeout:5000});
 const continueButton=permissions.getByRole('button',{name:'Continue to recording'});
 await continueButton.click();
 report.checks.push('Without the macOS permissions the official "Grant macOS permissions" dialog lists Accessibility and Screen recording; Request grants each and the button becomes "Continue to recording"');

 // 3. Recording: the pill, the main window hidden, no second chooser.
 const pill=await waitWindow(w=>w.url.includes('cu-watch-record-pill-'));
 assert.equal((await windows()).some(w=>w.url.includes('wr-chooser-')),false,'resumed without the chooser');
 assert.deepEqual([pill.bounds.width,pill.bounds.height],[472,112]);
 const work=await app.evaluate(({screen})=>screen.getPrimaryDisplay().workArea);
 assert.equal(pill.bounds.x,Math.round(work.x+(work.width-472)/2));
 // uRa's y; macOS may nudge a window whose transparent margin reaches past the visible frame by a few points.
 const pillY=work.y+work.height-48-32-24;
 assert.ok(pill.bounds.y<=pillY&&pill.bounds.y>=pillY-16,`pill y ${pill.bounds.y} (uRa ${pillY})`);
 assert.equal(await mainVisible(),false,'the main window hides while recording');
 const capturing=await run(pill.id,`({label:document.querySelector('.label').innerText,mic:getComputedStyle(document.getElementById('mic')).display})`);
 assert.match(capturing.label,/^Capturing\s*·\s*0:0\d/);
 assert.equal(capturing.mic,'none','no narration: no microphone button');
 report.checks.push('Recording shows the official pill (472×112, bottom centre of the work area, "Capturing · m:ss", no microphone) and hides the main window');

 // 4. Done → delivered as one user message into a new session, shown as the card.
 await page.waitForTimeout(1200);
 await run(pill.id,`document.getElementById('done').click()`);
 const card=page.locator('[data-watch-record]');
 await card.waitFor({timeout:15000});
 const label=await card.locator('button[aria-expanded] > span.flex-1').innerText();
 assert.match(label,/^Recorded demonstration · \d+\.\ds$/);
 await card.locator('button[aria-expanded]').click();
 await page.waitForTimeout(400);
 const opened=await card.evaluate(node=>({expanded:node.querySelector('button[aria-expanded]').getAttribute('aria-expanded'),text:node.innerText,images:node.querySelectorAll('img[src^="file://"]').length,
  lead:node.querySelector('.source-user-bubble')?.innerText}));
 assert.equal(opened.expanded,'true');
 assert.match(opened.text,/Clicked/);
 assert.match(opened.text,/Typed\s*hello/);
 assert.match(opened.text,/Screenshot · \d+\.\ds/);
 assert.ok(opened.images>=1,'the pictures, staged as files');
 assert.equal(opened.lead,'I recorded a demonstration of a desktop workflow for you to learn from.');
 const turns=(await fs.readFile(path.join(profile,'fixture-requests.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(entry=>entry.method==='turn/start');
 const input=turns.at(-1).params.input;
 assert.match(input[0].text,/^<watch-record-demonstration durationMs="\d+" steps="\d+" images="\d+">I recorded a demonstration/);
 assert.ok(input.some(part=>part.type==='localImage'&&part.path.startsWith('/')));
 assert.match(input.at(-1).text,/<\/watch-record-demonstration>\n\n<system-reminder>/);
 await page.waitForFunction(()=>/Recorded demonstration \(\d+\.\ds\)/.test(document.body.innerText),null,{timeout:10000});
 const after=await windows();
 assert.equal(after.some(w=>w.url.includes('cu-watch-record-pill-')),false,'the pill goes once the session shows');
 assert.equal(await mainVisible(),true,'the main window is back');
 report.checks.push('Done sends the recording to a new session titled "Recorded demonstration (N.Ns)" as one turn (the demonstration text, pictures as localImage parts) and shows the official card: lead, steps, captions, pictures; the pill goes');

 // 5. Customize › Skills › Add.
 await fillComposer(page,page.getByRole('textbox',{name:'Message DeepSeek',exact:true}),'/skills');
 await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
 const settings=page.getByRole('dialog',{name:'Settings',exact:true});
 await settings.waitFor({timeout:10000});
 await settings.getByRole('button',{name:'Add skill'}).first().click();
 const record=page.getByRole('menuitem',{name:'Record your screen',exact:true});
 await record.waitFor({timeout:5000});
 report.checks.push('Customize › Skills › Add lists "Record your screen"');
 await page.keyboard.press('Escape');

 assert.deepEqual(report.rendererErrors,[]);
 report.passed=true;
}catch(error){report.error=error.stack||String(error);}
finally{await app.close().catch(()=>{});}
console.log(JSON.stringify(report,null,1));
if(!report.passed)process.exitCode=1;
