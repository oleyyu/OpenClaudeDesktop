import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(root, '../analysis/code-ui-unpack-20261015/presets-validation');
await fs.mkdir(out, { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaude-presets-'));
const workspace = path.join(profile, 'workspace');
await fs.mkdir(workspace);
execFileSync('git', ['init', '-b', 'main', workspace], {stdio:'ignore'});
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ cwd: workspace, theme: 'light', mode: 'code', model: 'fixture', effort: 'low', sidebarWidth: 288, threadIds: ['S'] }));
await fs.writeFile(path.join(profile, 'fixture-threads.json'), JSON.stringify({ next: 100, threads: { S: { id:'S', name:'Presets regression session', cwd:workspace, createdAt:Date.now()/1000, updatedAt:Date.now()/1000, archived:false, turns:[] } } }));
await fs.mkdir(path.join(profile, 'backlog'));
await fs.writeFile(path.join(profile, 'backlog/tasks.json'), JSON.stringify({version:1,items:[{id:'todo_123456abcdef',cwd:workspace,source:'dismissed',title:'Review the source styles',prompt:'Review the stylesheet migration',suggestedAt:Date.now(),filedAt:Date.now(),originSessionId:'S',originTaskId:'task1'}]}));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs'), CODE_DESKTOP_OFFSCREEN_LAUNCH: '1' };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const build = JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8'));
async function verifyBuild() {
  for (const entry of build.sources) assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,entry.path))).digest('hex'),entry.sha256,`Stale build: ${entry.path}`);
}
let failure = null;
const addTrigger = '.sc-composer [data-cds="ChatComposerActions"] button[data-cds="Button"][aria-label="Add"]';
export let report = null;
let app; const errors = [], checks = [];
try {
  await verifyBuild();
  app = await electron.launch({ executablePath: path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [root], env });
  const page = await app.firstWindow(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 850));
  await page.locator('[data-testid="epitaxy-start-card"]').waitFor();
  assert.equal(await page.locator('h1[data-pane-title]').innerText(), 'New session');
  assert.equal(await page.locator('.home-greeting-slot').count(), 0);
  assert.equal(await page.locator('[data-testid="epitaxy-stats-card"]').count(), 0);
  // R4i-gui GU1 (R4g-composer CP3, R4i-graph GR3): the presets card's + is c73f45bc3 pv's Oj trigger in ChatComposerActions'
  // leading slot (source-composer.jsx Actions leading CARD_ADD_TRIGGER → source-composer-add-menu.jsx ComposerAddTrigger, a
  // view-tabs CdsButton aria-label "Add"); the Home draft hangs no chin, its environment bar (.sc-chin.sc-env-bar-scope) has no +.
  assert.equal(await page.locator(addTrigger).count(), 1);
  assert.equal(await page.locator('.sc-chin button[aria-label="Add"]').count(), 0);
  assert.equal(await page.locator('[data-testid="start-card-environments"] [aria-current="true"]').count(), 1);
  checks.push('Presets home, selection, draft title and in-card Add');
  await page.screenshot({ path: path.join(out, 'light-home.png') });
  const geometry = await page.evaluate(() => {
    const box = s => { const r = document.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
    return { card:box('[data-testid="start-card-environments"]'), composer:box('.sc-composer'), title:box('h1[data-pane-title]'), sidebar:box('.source-sidebar') };
  });
  assert.ok(geometry.card.width >= 250 && geometry.card.width <= 325, JSON.stringify(geometry));
  assert.ok(geometry.card.y + geometry.card.height < geometry.composer.y, 'Environment card must leave space for composer');
  await page.locator('[data-testid="start-card-choose"]').click();
  await page.getByRole('menuitem', {name: 'Edit local environment', exact:true}).waitFor();
  const worktree = page.getByRole('menuitemcheckbox',{name:'worktree',exact:true});
  await worktree.waitFor();
  const originalWorktree = await worktree.getAttribute('aria-checked');
  await worktree.click();
  await page.locator('[data-testid="start-card-choose"]').click();
  assert.notEqual(await worktree.getAttribute('aria-checked'),originalWorktree);
  await worktree.click();
  checks.push('Choose environment opens real local settings/folder menu');
  const editor = page.locator('.sc-input[contenteditable="true"]');
  await editor.fill('Test the new composer');
  assert.ok(await page.getByRole('button', {name:'Send',exact:true}).isEnabled());
  await editor.fill('');
  await page.locator(addTrigger).click();
  await page.getByRole('menuitem', {name:'Add files or photos',exact:true}).waitFor();
  await page.keyboard.press('Escape');
  checks.push('Typing enables Send; Add opens attachment menu');
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setContentSize(800, 600));
  await page.screenshot({path:path.join(out,'narrow-home.png')});
  assert.ok(await page.locator('[data-testid="start-card-choose"]').isVisible());
  checks.push('Narrow home remains usable');
  await page.getByRole('button', {name:'Review the source styles',exact:true}).click();
  assert.equal(await editor.innerText(), 'Review the stylesheet migration');
  await page.getByRole('button', {name:'Review the source styles',exact:true}).waitFor({state:'detached'});
  await editor.fill('');
  checks.push('Next steps inserts a real saved task and removes it from backlog');
  await page.locator('[data-source-session-id="S"] [data-row-main-button]').click();
  // R2-topbar TT-02: the New session page has its own Files toggle now; wait for the session's titlebar first.
  await page.locator('.st-lead .st-session-caret').waitFor();
  await page.locator('[data-pane-toggle="files"]').waitFor();
  await page.locator('[data-pane-toggle="files"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(out,'session-files.png')});
  assert.equal(await page.locator('[data-pane-toggle="files"]').getAttribute('aria-pressed'),'true');
  if (await page.locator('[data-pane-toggle="files"]').isVisible()) await page.locator('[data-pane-toggle="files"]').click();
  else {
    await page.getByRole('button',{name:'View options',exact:true}).click();
    await page.getByRole('menuitemcheckbox',{name:/Files/}).click();
  }
  checks.push('Existing session opens with working Files toolbar control');
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await page.locator('.source-chat-tile-content[data-section="projects"]').waitFor();
  assert.ok(await page.locator('.surface-projects').isVisible());
  await page.getByRole('button',{name:'New',exact:true}).click();
  await page.evaluate(() => window.desktop.call('settings',{mode:'chat'}));
  await page.reload();
  await page.locator('.source-chat-tile-content[data-surface="chat"]').waitFor();
  await page.screenshot({path:path.join(out,'chat-home.png')});
  assert.equal(await page.locator('.sc-zone[data-code-layout="presets"]').count(),0);
  checks.push('Projects navigation and Chat home survive the shared CSS update');
  await page.evaluate(() => window.desktop.call('settings',{mode:'code',theme:'dark',locale:'zh-CN'}));
  await page.reload();
  await page.getByRole('button',{name:'新建',exact:true}).click();
  await page.locator('[data-testid="epitaxy-start-card"]').waitFor();
  await page.screenshot({path:path.join(out,'dark-chinese-home.png')});
  assert.equal(await page.locator('[data-testid="start-card-choose"] > .truncate').innerText(),'选择环境');
  checks.push('Dark theme and Chinese render the same presets layout');
  assert.deepEqual(errors, []);
  await verifyBuild();
  await fs.writeFile(path.join(out,'result.json'), JSON.stringify({passed:true,checks,geometry,errors,build:JSON.parse(await fs.readFile(path.join(root,'dist/build-info.json'),'utf8')).sourceSha256},null,2));
  console.log(JSON.stringify({checks,geometry,errors}));
} catch(error) {
  failure = error;
  if(app) await (await app.firstWindow()).screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  console.error(error); process.exitCode=1;
} finally {
  if(app) await app.close(); await fs.rm(profile,{recursive:true,force:true});
  report = {passed:!failure,checks,rendererErrors:errors,build:{version:build.version,sourceSha256:build.sourceSha256},failure:failure?.message || null,evidence:out};
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));

}
