// OpenClaude Desktop's own computer-use tools (electron/agent-tools/computer-use.mjs) in the real app against the fixture
// core, without taking the screen: the window is transparent and click-through while it runs.
//   1. fixture:computer-use-app — a code_desktop app_screenshot row expands to its element summary and the picture
//   2. fixture:app-tool request_access — the access card names Finder by bundle id with its icon; after "Allow for this
//      session" the same session's next request_access answers without a card, and app_list_windows runs with the grant
//      (the last call reaches the native module: read-only, Finder's window list)
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
const app=await electron.launch({args:[root],executablePath:path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),env,timeout:20000});
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
 assert.deepEqual(report.rendererErrors,[]);
 report.passed=true;
}finally{
 await app.close();
 await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
