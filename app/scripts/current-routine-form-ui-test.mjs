import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(root, '../analysis/current-routine-form-20261013/ui');
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, 'profile-'));
const workspace = path.join(profile, 'code-project');
await fs.mkdir(workspace);
const now = Math.floor(Date.now() / 1000);
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({
  cwd: workspace, theme: 'light', mode: 'code', model: 'fixture', effort: 'low', permission: 'auto',
  threadIds: ['existing-code'], displayName: 'Local user', locale: 'en-US', onboardingComplete: true,
}));
await fs.writeFile(path.join(profile, 'fixture-threads.json'), JSON.stringify({ next: 100, threads: {
  'existing-code': { id: 'existing-code', cwd: workspace, name: 'Existing code project', createdAt: now, updatedAt: now, turns: [], archived: false },
} }));
const env = { ...process.env, CODE_DESKTOP_OFFSCREEN_LAUNCH: '1', CODE_DESKTOP_DATA: profile,
  CODEX_HOME: path.join(profile, 'codex-home'), CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const checks = [], errors = [];
let app, page;
let passed = false;
const read = async name => JSON.parse(await fs.readFile(path.join(profile, name), 'utf8'));
const log = async name => (await fs.readFile(path.join(profile, name), 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
async function completedRoutine(name) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const task = (await read('preferences.json')).localRoutines.find(task => task.name === name);
    if (task?.runs[0]?.status === 'completed') return task;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Scheduled run did not complete: ${name}`);
}
async function launch() {
  app = await electron.launch({ args: [root], executablePath: path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), env });
  page = await app.firstWindow(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.setSize(1200, 800); win.webContents.setBackgroundThrottling(false); win.hide(); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.getByRole('radio', { name: 'Code', exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.sc-model-trigger')?.disabled);
}
async function select(surface) {
  if (surface === 'Code') await page.getByRole('radio', { name: 'Code', exact: true }).click();
  else {
    if (await page.getByRole('radio', { name: 'Code', exact: true }).getAttribute('aria-checked') === 'true') {
      await page.getByRole('radio', { name: 'Claude', exact: true }).click();
    }
    await page.locator('.surface-more').click();
    await page.getByRole('menuitemradio', { name: surface, exact: true }).click();
  }
  await page.waitForFunction(value => document.querySelector('.source-chat-tile-content')?.dataset.surface === value, surface.toLowerCase());
}
// Exercise the UI against the isolated Codex fixture runner. New production
// tasks use the Cowork VM, whose startup bug is outside this UI acceptance.
async function fixtureRoutineEngine() {
  await app.close(); app=null;
  const prefs=await read('preferences.json');
  for(const task of prefs.localRoutines) task.options.coreId='codex';
  await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify(prefs));
  await launch(); await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled',{exact:true}).click();
}
const editor = () => page.locator('.sc-input[contenteditable="true"]');
async function send(text) {
  await editor().fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
}

try {
  await launch(); await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled',{exact:true}).click();
  await page.getByRole('button',{name:'New task',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Create scheduled task',exact:true});
  await dialog.getByLabel('Name',{exact:true}).fill('Monthly review');
  await dialog.getByLabel('Description',{exact:true}).fill('Review the latest notes each month.');
  await dialog.getByLabel('Instructions',{exact:true}).fill('Summarize the latest notes.');
  await dialog.getByRole('combobox',{name:'Frequency',exact:true}).click();
  await page.getByRole('option',{name:'Monthly',exact:true}).click();
  await dialog.getByLabel('Time',{exact:true}).fill('14:35');
  const date=dialog.locator('[data-cds="DateInput"]');
  await date.waitFor();
  await date.getByRole('button',{name:'Calendar',exact:true}).click();
  await page.locator('[data-cds="Calendar"]').waitFor();

  const calendar=page.locator('[data-cds="Calendar"]');
  // R4i-gui GU1 (R4g-routines RTC): the form is the generated 2.42304.0 c97b955f1 Ca (cowork-scheduled), no longer the
  // 2.31226.0 current-chat bundle, so the calendar is no longer tagged data-chat-source-version 2.31226.0.
  assert.notEqual(await calendar.evaluate(n=>n.closest('[data-chat-source-version]')?.dataset.chatSourceVersion??null),'2.31226.0');
  const selected=calendar.locator('[aria-selected="true"] [role="button"]');
  const before=await date.locator('input').inputValue();
  await selected.press('ArrowRight'); await page.keyboard.press('Enter');
  await calendar.waitFor({state:'hidden'});
  const after=await date.locator('input').inputValue();
  assert.notEqual(after,before);
  assert.equal(await date.getByRole('button',{name:'Calendar',exact:true}).evaluate(n=>document.activeElement===n),true);
  await date.getByRole('button',{name:'Calendar',exact:true}).click();
  await calendar.getByRole('button',{name:'Next month',exact:true}).click();
  await calendar.getByRole('button',{name:'Previous month',exact:true}).click();
  await page.keyboard.press('Escape');
  await calendar.waitFor({state:'hidden'});
  assert.equal(await date.locator('input').inputValue(),after);
  const day=date.getByRole('spinbutton',{name:/day/i});
  await day.focus(); await day.press('ArrowUp'); await day.press('Tab');
  await dialog.getByLabel('Time',{exact:true}).focus();
  const committed=await date.locator('input').inputValue();
  assert.notEqual(committed,after);
  const expectedDay=Number(committed.split('-')[2]);
  assert.match(await dialog.innerText(),/Will be saved as “monthly-review”/);
  assert.doesNotMatch(await dialog.innerText(),/<link>/);
  assert.equal(await dialog.getByRole('link',{name:'See safe use tips',exact:true}).count(),1);
  const grid=dialog.locator('div.grid.grid-cols-1').first();
  for(const [width,height,columns,theme] of [[1200,800,1,'light'],[1200,640,6,'light'],[700,640,1,'dark']]) {
    await app.evaluate(({BrowserWindow},[width,height])=>BrowserWindow.getAllWindows()[0].setSize(width,height),[width,height]);
    await page.evaluate(theme=>window.desktop.call('settings',{theme}),theme);
    await page.waitForFunction(theme=>document.documentElement.dataset.mode===theme,theme);
    assert.equal((await grid.evaluate(n=>getComputedStyle(n).gridTemplateColumns)).split(' ').length,columns);
    assert.equal(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
    await dialog.getByRole('button',{name:'Save',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(evidence,`form-${width}x${height}-${theme}.png`)});
  }
  await dialog.getByRole('combobox',{name:'Permissions',exact:true}).click();
  // RTC host difference 3: Default / Auto / Skip all approvals; Default saves the host's 'ask'.
  await page.getByRole('option',{name:/^Default\b/}).click();
  await dialog.getByRole('button',{name:'Save',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  let task=(await read('preferences.json')).localRoutines.find(t=>t.name==='Monthly review');
  assert.equal(task.cron,`35 14 ${expectedDay} * *`); assert.equal(task.options.permission,'ask');
  await app.close(); app=null; await launch(); await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled',{exact:true}).click();
  await page.getByRole('link',{name:'Monthly review',exact:true}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Edit scheduled task',exact:true});
  assert.match(await dialog.getByRole('combobox',{name:'Permissions',exact:true}).innerText(),/^Default\b/);
  assert.equal(Number((await dialog.locator('[data-cds="DateInput"] input').inputValue()).split('-')[2]),expectedDay);
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  checks.push('Current source monthly date input supports calendar arrow selection, month navigation, Escape, focus restoration, segmented keyboard edits, persisted day/time/Default (ask) permissions after restart');
  checks.push('Current dialog portal inherits scoped CSS: 1-column tall form, original 6-column short desktop breakpoint, no horizontal overflow at 700px, both themes; slug preview and rich link render correctly');
  assert.deepEqual(errors,[]); passed=true;
} catch(error) {
  await fs.writeFile(path.join(evidence,'failure.json'),JSON.stringify({error:error.stack,errors,text:await page?.locator('body').innerText().catch(()=>null)},null,2));
  await page?.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{}); throw error;
} finally {
  await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify({passed,checks,errors,profile},null,2)); await app?.close();
}
console.log(JSON.stringify({passed,checks,evidence},null,2));
