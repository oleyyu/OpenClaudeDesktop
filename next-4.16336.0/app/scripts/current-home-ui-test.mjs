import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(root, '../analysis/current-cowork-home-20261012/ui');
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
const editor = () => page.locator('.sc-input[contenteditable="true"]');
async function send(text) {
  await editor().fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
}
try {
  await launch();
  await select('Cowork');
  const ideas = page.getByRole('region', { name: 'Cowork tasks', exact: true });
  await ideas.getByRole('heading', { name: 'Ideas for you', exact: true }).waitFor();
  assert.equal(await ideas.locator('button').count(), 3);
  assert.equal(await ideas.locator('button svg').count(), 3);
  const idea = ideas.getByRole('button', { name: 'Find themes in my messy files', exact: true });
  const preview = page.locator('[data-cds="ChatComposerOverlay"]');
  await idea.hover();
  await preview.waitFor({ state: 'visible' });
  const ideaPrompt = await preview.innerText();
  assert.match(ideaPrompt, /^Look through a folder I point you to/);
  assert.equal((await editor().innerText()).trim(), '', 'Hover must not write a draft');
  await idea.press('Enter');
  await page.waitForFunction(text => document.querySelector('.sc-input[contenteditable="true"]')?.innerText === text, ideaPrompt);
  await preview.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelector('.sc-input[contenteditable="true"]') === document.activeElement);
  assert.equal(await editor().evaluate(node => node === document.activeElement), true);
  assert.equal((await read('preferences.json')).threadIds.length, 1, 'Selecting an idea must not submit it');
  await editor().fill('Preserve this draft during preview');
  await idea.hover();
  await preview.waitFor({ state: 'visible' });
  assert.equal(await editor().innerText(), 'Preserve this draft during preview');
  await editor().click();
  await preview.waitFor({ state: 'detached' });
  assert.equal(await editor().innerText(), 'Preserve this draft during preview');
  checks.push('Original Cowork ideas and illustrations preview without changing drafts; keyboard selection fills and focuses the editor without submitting');

  await app.close(); app=null;
  const homePrefs = await read('preferences.json'), homeFixture = await read('fixture-threads.json');
  for (let index = 0; index < 8; index++) {
    const id = `cowork-home-${index}`;
    homePrefs.threadIds.push(id);
    homePrefs.sessionMetadata[id] = { surface: 'cowork', pinned: index === 0, unread: index > 0 && index < 7 };
    homeFixture.threads[id] = { id, name: `Home task ${index}`, cwd: workspace, createdAt: now + index, updatedAt: now + index, turns: [], archived: false };
  }
  await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify(homePrefs));
  await fs.writeFile(path.join(profile, 'fixture-threads.json'), JSON.stringify(homeFixture));
  await launch();
  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('New', { exact: true }).first().click();
  const taskHome = page.getByRole('region', { name: 'Cowork tasks', exact: true });
  await taskHome.getByRole('heading', { name: 'Pinned', exact: true }).waitFor();
  assert.equal(await taskHome.getByRole('link').count(), 5);
  await taskHome.getByRole('button', { name: 'Show more', exact: true }).click();
  assert.equal(await taskHome.getByRole('link').count(), 7);
  assert.equal(await taskHome.getByRole('link', { name: 'Home task 7', exact: true }).count(), 0);
  assert.equal(await taskHome.getByRole('link').first().getAttribute('aria-label'), 'Home task 6');
  await taskHome.getByRole('button', { name: 'Show less', exact: true }).click();
  assert.equal(await taskHome.getByRole('link').count(), 5);
  await taskHome.getByRole('button', { name: 'Clear active', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.surface-cowork-home a').length === 1 && document.querySelector('.surface-cowork-home')?.getAttribute('aria-busy') !== 'true');
  assert.equal(await taskHome.getByRole('link').count(), 1);
  const clearedPrefs = await read('preferences.json');
  assert.equal(clearedPrefs.sessionMetadata['cowork-home-0'].pinned, true);
  for (let index = 1; index < 7; index++) assert.equal(clearedPrefs.sessionMetadata[`cowork-home-${index}`].unread, false);
  assert.ok(clearedPrefs.threadIds.includes('cowork-home-7'), 'Clear active must not delete sessions');
  await taskHome.getByRole('link', { name: 'Home task 0', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.source-chat-tile-content')?.dataset.home === undefined);
  checks.push('Original Cowork task overview opens running sessions, orders unread/pinned tasks, folds at five rows and clears activity without deleting sessions or pins');

  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('New', {exact:true}).first().click();
  const scheduleIds = await page.evaluate(async cwd => {
    const ids=[];
    for(let index=0;index<6;index++) {
      const task=await window.desktop.call('local-routines',{action:'create',name:`Home schedule ${index}`,prompt:'fixture:complete scheduled',cron:'0 0 1 1 *',cwd,enabled:index!==5,options:{model:'fixture',permission:'auto'}});
      ids.push(task.id);
    }
    return ids;
  },workspace);
  await taskHome.getByRole('heading',{name:'Scheduled tasks',exact:true}).waitFor();
  const schedules=taskHome.locator('section').filter({has:page.getByRole('heading',{name:'Scheduled tasks',exact:true})});
  assert.equal(await schedules.getByRole('link').count(),3);
  await schedules.getByRole('button',{name:'Show more',exact:true}).click();
  assert.equal(await schedules.getByRole('link').count(),6);
  assert.match(await schedules.getByRole('link').last().innerText(),/Home schedule 5/);
  const row=schedules.getByRole('link').first();
  const before=await row.evaluate(node=>({width:node.getBoundingClientRect().width,title:node.querySelector('span').getBoundingClientRect().width,arrow:getComputedStyle(node.lastElementChild).visibility}));
  await row.hover();
  const after=await row.evaluate(node=>({width:node.getBoundingClientRect().width,title:node.querySelector('span').getBoundingClientRect().width,arrow:getComputedStyle(node.lastElementChild).visibility}));
  assert.equal(before.width,after.width);assert.equal(before.title,after.title);assert.equal(before.arrow,'hidden');assert.equal(after.arrow,'visible');
  for(const width of [800,1200,1440]) {
    await app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows()[0].setSize(width,900),width);
    assert.equal(await taskHome.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  }
  await page.screenshot({path:path.join(evidence,'current-home-tasks.png')});
  await page.evaluate(()=>window.desktop.call('settings',{theme:'dark'}));
  await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');
  await page.screenshot({path:path.join(evidence,'current-home-dark.png')});
  await row.click();
  await page.getByRole('heading',{name:'Home schedule 0',exact:true}).waitFor();
  checks.push('Current scheduled rows sort enabled before paused, fold at three, reserve caret space on hover, open real scheduled task, fit 800/1200/1440 widths and dark theme');
  assert.deepEqual(errors,[]);passed=true;
} finally {
  await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify({passed,checks,errors,profile},null,2));
  await app?.close();
}
console.log(JSON.stringify({passed,checks,errors,evidence}));
