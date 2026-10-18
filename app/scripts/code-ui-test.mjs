import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const evidence=path.join(root,'../analysis/batch-20260920');
const profile=await fs.mkdtemp(path.join(evidence,'code-ui-profile-'));
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({cwd:path.join(root,'../workspace'),theme:'light',displayName:'Oley',threadIds:[]}));
const env={...process.env,CODE_DESKTOP_DATA:profile,CODEX_BINARY:path.join(root,'tests/fixtures/codex-server.cjs')};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:process.env.TEST_ELECTRON_BINARY || path.join(root,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),args:[root],env});
const errors=[]; const checks=[];
try{
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model'}).waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.locator('.sc-pet-animation[data-ready] svg').waitFor();
 const metrics=await page.evaluate(()=>({iconFont:getComputedStyle(document.querySelector('.source-sidebar-nav-row [data-cds="Icon"]')).fontFamily,sidebar:document.querySelector('.app-sidebar').getBoundingClientRect().width,composer:document.querySelector('.sc-composer').getBoundingClientRect().width,stats:document.querySelector('[data-testid="epitaxy-stats-card"]')?.getBoundingClientRect().width??null,sidebarBackground:getComputedStyle(document.querySelector('.app-sidebar')).backgroundColor,composerPadding:getComputedStyle(document.querySelector('.sc-composer .sc-card')).padding,sends:document.querySelectorAll('[data-testid="code-prompt-send"]').length}));
 assert.match(metrics.iconFont,/Anthropicons/);assert.equal(metrics.sidebar,288);assert.equal(metrics.composer,768);// R4i-gui GU1: the Code composer is the presets card (source-composer.jsx .sc-composer around the shell's .sc-card; the
 // retired code-ui.jsx Composer's .composer and the host .sc-surface are gone) and lM shows no Send without a draft
 // (sendOnDraftOnly). The stats card is code-start's [data-testid="epitaxy-stats-card"]; its width and the card padding
 // are recorded for a runtime re-baseline.
 assert.equal(metrics.sends,0,'no Send on the empty presets card');
 checks.push('original font, glyph, Lottie load and measured home dimensions');
 // 0.2.113: no dictation control (hideDictation). R4i-gui GU1 (R4g-composer CP3, R4i-graph GR3): the presets card's + is
 // ChatComposerActions' leading (CARD_ADD_TRIGGER: the md glyph in sendGlyphBoxClass), and the Home draft hangs no chin:
 // its pickers sit in the environment bar (source-composer-environment-bar.jsx: .sc-chin.sc-env-bar-scope around the
 // generated l0, the place chip [data-testid="environment-bar-trigger"], the folder chip [data-testid="environment-bar-folder"]
 // and the mode slot holding .sc-permission). Sizes are recorded, not asserted (they need a runtime re-baseline).
 metrics.chin=await page.evaluate(()=>{
  const card=document.querySelector('.sc-composer'),bar=document.querySelector('.sc-chin.sc-env-bar-scope'),add=card.querySelector('[data-cds="ChatComposerActions"] button[aria-label="Add"]');
  return {bar:!!bar,addWidth:add?.getBoundingClientRect().width??null,addHeight:add?.getBoundingClientRect().height??null,addGlyph:add?getComputedStyle(add.querySelector('[data-cds="Icon"]')).fontSize:null,
   voice:document.querySelectorAll('.sc-chin [data-cds="SplitDropdownButton"], .sc-composer [data-cds="SplitDropdownButton"], [aria-label^="Dictat"]').length,
   addInBar:!!bar?.querySelector('button[aria-label="Add"]'),mode:!!bar?.querySelector('.sc-permission'),place:!!bar?.querySelector('[data-testid="environment-bar-trigger"]'),folder:!!bar?.querySelector('[data-testid="environment-bar-folder"]'),
   contextRow:document.querySelectorAll('.sc-context-row').length};
 });
 assert.deepEqual({bar:metrics.chin.bar,voice:metrics.chin.voice,add:metrics.chin.addWidth!==null,addInBar:metrics.chin.addInBar,mode:metrics.chin.mode,place:metrics.chin.place,folder:metrics.chin.folder,contextRow:metrics.chin.contextRow},
  {bar:true,voice:0,add:true,addInBar:false,mode:true,place:true,folder:true,contextRow:0});
 const editor=page.getByRole('textbox',{name:'Message DeepSeek'});
 await editor.fill(Array.from({length:30},(_,i)=>`Draft line ${i+1}`).join('\n'));
 // ca80fca8d yP editor maxHeight 'min(24rem, 40svh)' (B05): grows to 24rem, or 40% of the window height when that is less, before it scrolls.
 {const [height,cap]=await editor.evaluate(node=>[node.getBoundingClientRect().height,Math.min(384,innerHeight*0.4)]);assert.ok(Math.abs(height-cap)<1,`editor capped at ${cap}px, got ${height}px`);}
 metrics.sendIcon=await page.locator('[data-testid="code-prompt-send"]').evaluate(node=>node.querySelector('[data-cds="Icon"]')?.textContent.codePointAt(0));assert.equal(metrics.sendIcon,57359,'ArrowReturn on Send once the draft has text');
 await editor.fill('');assert.equal(await editor.evaluate(node=>node.getBoundingClientRect().height),24);
 checks.push('presets Home: the + leads ChatComposerActions, no dictation control, the environment bar holds place / folder / Mode (no context row), and one autosize owner clamps the editor to 24–384px (max-h-96)');
 await page.getByRole('button',{name:'Model',exact:true}).click();
 const modelMenu=page.getByRole('menu',{name:'Models',exact:true}); await modelMenu.waitFor();
 assert.equal(await modelMenu.locator('[aria-checked="true"]').getAttribute('data-model-id'),'fixture');
 assert.equal(await modelMenu.getByRole('menuitemradio').count(),4);
 await page.waitForFunction(()=>document.activeElement?.closest('[aria-label="Models"]'));
 await page.keyboard.press('2');
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model 2'}).waitFor();
 await page.getByRole('button',{name:'Model',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement?.closest('[aria-label="Models"]')); await page.keyboard.press('End'); await page.keyboard.press('ArrowRight');
 const more=page.getByRole('menu',{name:'More models',exact:true}); await more.waitFor(); await page.waitForFunction(()=>document.activeElement?.closest('[aria-label="More models"]')); 
 assert.equal(await more.getByRole('menuitemradio').count(),2);
 await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Model',exact:true}).filter({hasText:'Test model 6'}).waitFor();
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).model,'fixture-5');
 await page.getByRole('button',{name:'Model',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement?.closest('[aria-label="Models"]')); await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await more.waitFor(); await page.waitForFunction(()=>document.activeElement?.closest('[aria-label="More models"]')); 
 assert.equal(await more.locator('[aria-checked="true"]').getAttribute('data-model-id'),'fixture-5');
 await page.keyboard.press('Escape'); assert.equal(await more.count(),0); await modelMenu.waitFor();
 await page.keyboard.press('2');
 checks.push('source DOM model menu, numeric selection, overflow keyboard navigation, selected indicator, persistence');
 // Fidelity F03: the effort chip opens the CDS Popover (c8e04f916 p.Popup data-cds ModelSelectorEffort, w-[220px]).
 const effortPopup=page.locator('[role="dialog"][data-cds="ModelSelectorEffort"]');
 await page.getByRole('button',{name:/^Effort: /}).click();
 assert.equal((await effortPopup.boundingBox()).width,220);
 const slider=page.getByRole('slider',{name:'Effort',exact:true});await slider.focus();await slider.press('ArrowRight');await slider.press('ArrowRight');
 assert.equal(await slider.getAttribute('aria-valuetext'),'High');assert.equal(await effortPopup.count(),1);
 assert.equal(JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).effort,'high');
 await page.keyboard.press('Escape');checks.push('220px discrete effort slider, keyboard commit, remains open, persistence');
 // 0.2.103: c360a9e1c hd Y = !P && sessionRef === null, so this home/draft composer's usage trigger is named 'Usage: Context 0' (Se), not 'Usage'; only that name varies, so it alone is matched by /^Usage/.
 for(const name of ['Permission mode','Add','Usage','Account menu']){
  await page.getByRole('button',name==='Usage'?{name:/^Usage/}:{name,exact:true}).click();// Mode and Account are CDS menus (role=menu on the shared SourceMenu primitive, sidebar-rows J.Popup); Add became one too when it gained the Skills/Plugins submenus (main.jsx renders menu.kind==="add" as SourceMenu.Popup label="Add"); Usage is the CDS Popover (F03, c360a9e1c vd).
  const popup=page.locator(name==='Permission mode'?'.sp-permission-menu':name==='Account menu'?'[role="menu"]':name==='Add'?'[role="menu"][aria-label="Add"]':'[role="dialog"][data-cds="Popover"]');await popup.waitFor();const box=await popup.boundingBox();const vp=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));assert.ok(box.x>=0&&box.y>=0&&box.y+box.height<=vp.h&&box.x+box.width<=vp.w);await page.keyboard.press('Escape');
 }
 checks.push('popover collision placement and Escape');
 // code-home Kw: stats tabs are aria-hidden disabled buttons until the card is hovered/focused (deferred mount).
 await page.locator('[data-testid="epitaxy-stats-card"]').hover();await page.getByRole('tablist',{name:'Date range'}).waitFor();
 const heatmap=()=>page.locator('.activity-heatmap').innerHTML();const allHeatmap=await heatmap();await page.getByRole('tab',{name:'7d',exact:true}).click();assert.equal(await heatmap(),allHeatmap);checks.push('heatmap independent of aggregate range');
 // code-home cT: an empty range reads "No model usage in this range".
 await page.getByRole('tab',{name:'Models',exact:true}).click();await page.getByText('No model usage in this range').waitFor();await page.getByRole('tab',{name:'Overview',exact:true}).click();
 await page.getByRole('button',{name:'What’s new',exact:true}).click();const releaseNotes=page.getByRole('dialog',{name:'What’s new',exact:true});await releaseNotes.waitFor();/* R03: the shared Dialog's bleed header Close (titlebar-release-notes.js B). */await releaseNotes.getByRole('button',{name:'Close',exact:true}).click();await releaseNotes.waitFor({state:'detached'});checks.push('local release notes');
 await page.getByRole('button',{name:'Account menu'}).click();await page.getByRole('menuitem',{name:/Settings/}).click();await page.getByRole('radio',{name:'Dark',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');assert.equal(await page.locator('html').getAttribute('data-mode'),'dark');await page.getByRole('dialog',{name:'Settings',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await page.screenshot({path:path.join(evidence,'code-source-dark.png')});
 {const settingsDialog=page.getByRole('dialog',{name:'Settings',exact:true});if(await settingsDialog.count()){await page.keyboard.press('Escape');await settingsDialog.waitFor({state:'detached'});}}await page.evaluate(theme=>window.desktop.call('settings',{theme}),'light');await page.waitForFunction(()=>document.documentElement.dataset.mode==='light');/* no appearance items in the account menu (Claude parity) */
 await page.getByRole('separator',{name:'Resize sidebar'}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.app-sidebar').evaluate(e=>e.getBoundingClientRect().width),296);await page.keyboard.press('ArrowLeft');checks.push('appearance and keyboard sidebar resize');
 await page.locator('body').click({position:{x:600,y:400}}); await page.screenshot({path:path.join(evidence,'code-source-light.png')});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(800,600));
 await page.getByRole('button',{name:/^Effort: /}).click();const small=await effortPopup.boundingBox();assert.ok(small.x>=0&&small.y>=0);await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('800x600 viewport');
 assert.deepEqual(errors,[]);const report={passed:true,at:new Date().toISOString(),checks,metrics,errors};await fs.writeFile(path.join(evidence,'code-source-test.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await app.close();}
