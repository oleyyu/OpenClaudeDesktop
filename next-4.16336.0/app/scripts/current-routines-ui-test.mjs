import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(root, '../analysis/current-routines-20261012/ui');
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
  await launch();
  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled', { exact: true }).click();

  const templates = page.locator('.surface-routines').locator('button').filter({hasText:'Daily briefing'});
  await templates.waitFor();
  assert.equal(await page.locator('.surface-routines button[aria-busy]').count(), 6);
  assert.equal(await page.locator('.surface-routines [data-cds="Pictogram"]').count(),1);
  const templateGrid = page.locator('.surface-routines button[aria-busy]').first().locator('..');
  assert.equal((await templateGrid.evaluate(n=>getComputedStyle(n).gridTemplateColumns)).split(' ').length,2);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(700,800));
  assert.equal((await templateGrid.evaluate(n=>getComputedStyle(n).gridTemplateColumns)).split(' ').length,1);
  assert.equal(await page.locator('.surface-routines').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1200,800));
  await templates.hover();
  await page.screenshot({path:path.join(evidence,'templates.png')});
  await templates.click();
  const seeded = page.getByRole('dialog',{name:'Create scheduled task',exact:true});
  assert.equal(await seeded.getByLabel('Name',{exact:true}).inputValue(),'Daily briefing');
  // R4i-gui GU1 (R4g-routines RTC host difference 1): the 2.42304.0 templates (ccd3f68fe Xc) carry no promptBody, so the
  // host's template flow opens the form with the name, description and cron only; the instructions start empty.
  assert.equal(await seeded.getByLabel('Instructions',{exact:true}).inputValue(), '');
  await seeded.getByRole('button',{name:'Cancel',exact:true}).click();
  const discard = page.getByRole('alertdialog',{name:'Discard unsaved changes?',exact:true});
  // c97b955f1 Ca's discard confirmation: cancel "Keep editing", confirm "Discard" (nmpevlUATU).
  if(await discard.isVisible()) await discard.getByRole('button',{name:'Discard',exact:true}).click();
  await seeded.waitFor({state:'hidden'});
  checks.push('Six installed templates (2.42304.0 Xc on the empty page) include the stopwatch pictogram, schedule hints and a creation form prefilled with name/description/cron (no instructions: Xc has no promptBody)');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  let routineDialog = page.getByRole('dialog', { name: 'Create scheduled task', exact: true });
  await routineDialog.getByLabel('Name', { exact: true }).fill('Morning notes');
  await routineDialog.getByLabel('Description', { exact: true }).fill('Review the daily notes.');
  await routineDialog.getByLabel('Instructions', { exact: true }).fill('fixture:complete scheduled');
  await routineDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  const discardDialog = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true });
  await discardDialog.waitFor();
  await page.waitForFunction(() => document.activeElement?.textContent === 'Keep editing');
  await discardDialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await discardDialog.waitFor({ state: 'hidden' });
  assert.equal(await routineDialog.getByLabel('Name', { exact: true }).inputValue(), 'Morning notes');
  await routineDialog.getByRole('combobox', { name: 'Frequency', exact: true }).click();
  await page.getByRole('option', { name: 'Custom', exact: true }).click();
  await routineDialog.getByLabel('Cron expression', { exact: true }).fill('invalid');
  await routineDialog.getByText('Enter a valid 5-field cron expression.', { exact: true }).waitFor();
  assert.equal(await routineDialog.getByRole('button', { name: 'Save', exact: true }).isDisabled(), true);
  await routineDialog.getByLabel('Cron expression', { exact: true }).fill('0 9 * * 1-5');
  await page.screenshot({ path: path.join(evidence, 'scheduled-source-form.png') });
  await routineDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await routineDialog.waitFor({ state: 'hidden' });
  await fixtureRoutineEngine();
  const routineList = page.getByRole('list', { name: 'Scheduled tasks', exact: true });
  await routineList.getByRole('link', { name: 'Morning notes', exact: true }).waitFor();
  assert.match(await routineList.innerText(), /Weekdays/);
  assert.doesNotMatch(await routineList.innerText(), /approx, select/);
  await routineList.getByRole('link', { name: 'Morning notes', exact: true }).hover();
  await routineList.getByRole('button', { name: 'More options for Morning notes', exact: true }).press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Pause', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#local-routine-results')?.innerText.includes('Paused'));
  await page.getByRole('heading', {name:'Scheduled tasks',exact:true}).waitFor();
  await page.screenshot({ path: path.join(evidence, 'scheduled-list.png') });
  await routineList.getByRole('link', { name: 'Morning notes', exact: true }).click();
  const instructionsTrigger = page.getByRole('button', { name: 'View instructions', exact: true });
  await instructionsTrigger.click();
  const instructionsDialog = page.getByRole('dialog', { name: 'Morning notes', exact: true });
  await instructionsDialog.getByText('fixture:complete scheduled', { exact: true }).waitFor();
  await instructionsDialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'View instructions');
  await page.getByRole('button', { name: 'Run now', exact: true }).click();
  let routine = await completedRoutine('Morning notes');
  assert.equal(routine.enabled, false); assert.equal(routine.runs.length, 1);
  assert.equal(routine.description, 'Review the daily notes.');
  const routineRun = routine.runs[0];
  assert.equal((await read('preferences.json')).sessionMetadata[routineRun.threadId].surface, 'cowork');
  const routineRequests = await log('fixture-requests.jsonl');
  const routineTurn = routineRequests.find(row => row.method === 'turn/start' && row.params.threadId === routineRun.threadId);
  assert.equal(routineTurn.params.sandboxPolicy.type, 'workspaceWrite');
  assert.deepEqual(routineTurn.params.sandboxPolicy.writableRoots, [routine.cwd]);
  await page.locator(`a[href="/cowork/${routineRun.threadId}"]`).click();
  await page.getByText('Fixture response', { exact: true }).waitFor();
  await app.close(); app = null;
  await launch(); await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled', { exact: true }).click();
  await page.getByRole('list', { name: 'Scheduled tasks', exact: true }).getByRole('link', { name: 'Morning notes', exact: true }).click();
  await page.locator(`a[href="/cowork/${routineRun.threadId}"]`).waitFor();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  routineDialog = page.getByRole('dialog', { name: 'Edit scheduled task', exact: true });
  await routineDialog.getByLabel('Name', { exact: true }).fill('Renamed morning notes');
  await routineDialog.getByRole('combobox', { name: 'Permissions', exact: true }).click();
  // R4i-gui GU1 (RTC host difference 3): the 2.42304.0 Cowork form offers Default / Auto / Skip all approvals; Default is the
  // host's 'ask' (source-routine-cowork-page-adapters.jsx toHostPermission).
  await page.getByRole('option', { name: /^Default\b/ }).click();
  await routineDialog.getByRole('combobox', { name: 'Frequency', exact: true }).click();
  await page.getByRole('option', { name: 'Weekly', exact: true }).click();
  await routineDialog.getByLabel('Time', { exact: true }).fill('14:35');
  await routineDialog.getByRole('combobox', { name: 'Day of week', exact: true }).click();
  await page.getByRole('option', { name: 'Wednesday', exact: true }).click();
  await routineDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await routineDialog.waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: 'Renamed morning notes', exact: true }).waitFor();
  routine = (await read('preferences.json')).localRoutines.find(task => task.id === routine.id);
  assert.equal(routine.runs[0].threadId, routineRun.threadId);
  assert.equal(routine.options.permission, 'ask');
  assert.equal(routine.cron, '35 14 * * 3');
  await page.screenshot({ path: path.join(evidence, 'scheduled-task.png') });
  for(const width of [700,900,1440]) {
    await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
    assert.equal(await page.locator('.surface-routines').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  }
  await page.evaluate(()=>window.desktop.call('settings',{theme:'dark'}));
  await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');
  await page.screenshot({path:path.join(evidence,'scheduled-detail-dark.png')});
  await page.evaluate(()=>window.desktop.call('settings',{theme:'light'}));
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1200,800));
  checks.push('Installed template grid changes from two columns to one; detail fits 700/900/1440 widths and both themes');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const deleteDialog=page.getByRole('alertdialog', { name: 'Delete scheduled task?', exact: true });
  // ccd3f68fe qo's own confirmation (Fn: title We.deleteEntity, body gi(…) "Delete “{taskName}”? …").
  assert.match(await deleteDialog.innerText(),/Delete “Renamed morning notes”\?/);
  await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByText('No scheduled tasks yet.', { exact: true }).waitFor();
  assert.ok((await read('preferences.json')).threadIds.includes(routineRun.threadId));
  const timed = await page.evaluate(() => window.desktop.call('local-routines', { action: 'create', name: 'One-time fixture', prompt: 'fixture:complete timer', fireAt: Date.now() + 300000 }));
  await fixtureRoutineEngine();
  // Arm after the fixture runner is ready: a slow Electron restart can otherwise
  // miss the deadline, which the production scheduler correctly skips.
  await page.evaluate(task => window.desktop.call('local-routines', { action: 'update', id: task.id, name: task.name, prompt: task.prompt, fireAt: Date.now() + 1000 }), timed);
  await page.getByRole('list', { name: 'Scheduled tasks', exact: true }).getByRole('link', { name: 'One-time fixture', exact: true }).click();
  const firedTask = await completedRoutine('One-time fixture');
  await page.locator(`a[href="/cowork/${firedTask.runs[0].threadId}"]`).waitFor();
  assert.equal(firedTask.enabled, false); assert.equal(firedTask.nextRunAt, null); assert.equal(firedTask.runs.length, 1);
  assert.equal(firedTask.runs[0].trigger, 'scheduled');
  await page.evaluate(id => window.desktop.call('local-routines', { action: 'delete', id }), timed.id);
  checks.push('Original scheduled form, detail and menu create, pause, edit, persist and run tasks with the isolated Codex fixture runner; cron validation, weekly presets, permissions (Default → ask), unsaved-change confirmation (Keep editing / Discard), instruction preview, history and deletion work through local services');

  assert.deepEqual(errors,[]);passed=true;
} catch (error) {
  await fs.writeFile(path.join(evidence,'failure.json'),JSON.stringify({error:error.stack,errors,text:await page?.locator('body').innerText().catch(()=>null)},null,2));
  await page?.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{});
  throw error;
} finally {
  await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify({passed,checks,errors,profile},null,2));
  await app?.close();
}
console.log(JSON.stringify({passed,checks,evidence},null,2));
