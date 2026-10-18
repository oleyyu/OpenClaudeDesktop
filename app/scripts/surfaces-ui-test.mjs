import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(root, '../analysis/chat-cowork');
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
async function verifyGreetingLayout(surface) {
  const measurements = [];
  for (const width of [800, 960, 1200, 1440]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 800), width);
    const metric = await page.locator('.surface-greeting').evaluate(async header => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const slot = header.querySelector('[data-new-page-greeting-spark]');
      const svg = slot.querySelector('svg');
      const text = header.querySelector('[data-new-page-greeting-text]');
      const column = header.closest('.surface-home-column');
      const columnStyle = getComputedStyle(column);
      const firstLetter = document.createRange();
      firstLetter.setStart(text.firstChild, 0);
      firstLetter.setEnd(text.firstChild, 1);
      const mark = svg.getBoundingClientRect(), box = slot.getBoundingClientRect();
      return { viewport: innerWidth, scale: mark.width / box.width, gap: firstLetter.getBoundingClientRect().left - mark.right,
        overflow: header.scrollWidth - header.clientWidth, width: svg.getAttribute('width'), height: svg.getAttribute('height'),
        sourceSpark: svg.dataset.cds, fontFamily: getComputedStyle(text).fontFamily,
        columnGap: parseFloat(columnStyle.rowGap), rootRem: parseFloat(getComputedStyle(document.documentElement).fontSize),
        scrollHost: getComputedStyle(column.parentElement).overflowY,
        composerGap: column.querySelector('.composer-zone').getBoundingClientRect().top - header.getBoundingClientRect().bottom };
    });
    assert.equal(metric.sourceSpark, 'Spark');
    assert.equal(metric.width, '100%');
    assert.equal(metric.height, '100%');
    assert.ok(Math.abs(metric.scale - 1.4) < 0.01, `Official compact Spark scale: ${JSON.stringify(metric)}`);
    assert.ok(metric.gap > 0, `Logo must not overlap the greeting: ${JSON.stringify(metric)}`);
    assert.ok(metric.overflow <= 1, `Greeting must fit the home column: ${JSON.stringify(metric)}`);
    assert.equal(metric.scrollHost, 'auto');
    assert.equal(metric.columnGap, metric.rootRem * 1.5);
    assert.ok(Math.abs(metric.composerGap - metric.columnGap) < 1, `Greeting and composer use the original column gap: ${JSON.stringify(metric)}`);
    measurements.push(metric);
  }
  await fs.writeFile(path.join(evidence, `${surface}-greeting-geometry.json`), JSON.stringify(measurements, null, 2));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1200, 800));
}
try {
  await launch();
  await editor().fill('Keep my code draft');
  await select('Chat');
  assert.equal((await editor().innerText()).trim(), '');
  assert.equal(await page.locator('[data-new-page-greeting-text]').innerText(), 'Local user returns!');
  assert.equal(await page.locator('[data-source-session-id="existing-code"]').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Permission mode', exact: true }).count(), 0);
  await editor().fill('Keep my chat draft');
  await select('Cowork');
  assert.equal((await editor().innerText()).trim(), '');
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
  await editor().fill('Keep my cowork draft');
  await select('Code');
  assert.equal(await editor().innerText(), 'Keep my code draft');
  await select('Chat');
  assert.equal(await editor().innerText(), 'Keep my chat draft');
  await editor().fill('');
  await page.screenshot({ path: path.join(evidence, 'chat-home.png') });
  await editor().fill('Keep my chat draft');
  checks.push('Three surfaces isolate their unsent drafts and sidebar history');
  await send('fixture:complete chat');
  await page.getByText('Fixture response', { exact: true }).waitFor();
  let prefs = await read('preferences.json');
  const chatId = Object.keys(prefs.sessionMetadata).find(id => prefs.sessionMetadata[id].surface === 'chat');
  assert.ok(chatId);
  const starts = await log('fixture-history.jsonl');
  const chatStart = starts.find(row => row.method === 'thread/start' && row.params.threadId === chatId);
  assert.equal(chatStart.params.sandbox, 'read-only');
  assert.equal(chatStart.params.approvalPolicy, 'never');
  assert.match(chatStart.params.developerInstructions, /conversational assistant/);
  assert.equal(chatStart.params.codeDesktop?.surface, undefined);
  assert.notEqual(chatStart.params.cwd, workspace);
  checks.push('Chat starts and completes through real Electron IPC with isolated cwd, conversation instructions and read-only policy');
  await select('Cowork');
  assert.equal(await editor().innerText(), 'Keep my cowork draft');
  await editor().fill('');
  await page.screenshot({ path: path.join(evidence, 'cowork-home.png') });
  await send('fixture:hold');
  await page.getByRole('button', { name: 'Stop response', exact: true }).waitFor();
  await page.getByRole('complementary', { name: 'Task details' }).waitFor();
  prefs = await read('preferences.json');
  const coworkId = Object.keys(prefs.sessionMetadata).find(id => prefs.sessionMetadata[id].surface === 'cowork');
  assert.ok(coworkId);
  await page.locator('.source-sidebar-nav-row').getByText('New', { exact: true }).first().click();
  const coworkHome = page.getByRole('region', { name: 'Cowork tasks', exact: true });
  await coworkHome.getByRole('status', { name: 'Running', exact: true }).waitFor();
  await coworkHome.locator(`a[href="/cowork/${coworkId}"]`).click();
  await page.getByRole('button', { name: 'Stop response', exact: true }).waitFor();
  let requests = await log('fixture-requests.jsonl');
  assert.equal(requests.find(row => row.method === 'turn/start' && row.params.threadId === coworkId).params.sandboxPolicy.type, 'workspaceWrite');
  await page.screenshot({ path: path.join(evidence, 'cowork-task.png') });
  await page.getByRole('button', { name: 'Stop response', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-cds="ChatComposer"]')?.dataset.busy);
  requests = await log('fixture-requests.jsonl');
  assert.ok(requests.some(row => row.method === 'turn/interrupt' && row.params.threadId === coworkId));
  checks.push('Cowork starts a writable task, shows task details, and stops the real fixture turn');
  await send('fixture:plan');
  const activity = page.getByRole('complementary', { name: 'Task details' });
  await activity.getByText('Dock the plan pane', { exact: true }).waitFor();
  assert.equal(await activity.locator('.group\\/todo').count(), 3);
  const progress = activity.getByRole('button', { name: 'Progress', exact: true });
  await progress.click();
  assert.equal(await progress.getAttribute('aria-expanded'), 'false');
  await progress.press('Enter');
  assert.equal(await progress.getAttribute('aria-expanded'), 'true');
  await activity.getByText('View and open files created during this task.', { exact: true }).waitFor();
  const replyLayout = await editor().evaluate(node => ({
    placeholder: node.dataset.placeholder,
    placeholderWidth: parseFloat(getComputedStyle(node, '::after').width),
    cardHeight: node.closest('[data-cds="ChatComposer"]').getBoundingClientRect().height,
  }));
  assert.equal(replyLayout.placeholder, 'Reply');
  assert.ok(replyLayout.placeholderWidth > 200, 'Reply placeholder must not inherit the send-button float width');
  assert.ok(replyLayout.cardHeight < 180, 'An empty reply must stay compact');
  await activity.evaluate(async node => {
    const illustrations = [...node.querySelectorAll('[style*="background-image"]')];
    if (!illustrations.length) throw new Error('Missing source illustrations');
    await Promise.all(illustrations.map(element => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => reject(new Error('Source illustration did not load: ' + image.src));
      image.src = getComputedStyle(element).backgroundImage.slice(5, -2);
    })));
  });
  await page.screenshot({ path: path.join(evidence, 'cowork-source-progress.png') });
  checks.push('Extracted Cowork progress renders real plan events and preserves mouse/keyboard collapse behavior');
  await app.close(); app = null;
  await launch();
  await page.waitForFunction(() => document.querySelector('.source-chat-tile-content')?.dataset.surface === 'cowork');
  await select('Chat');
  await page.locator(`[data-source-session-id="${chatId}"] [data-row-main-button]`).click();
  await page.getByText('Fixture response', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-source-session-id="existing-code"]').count(), 0);
  await select('Code');
  assert.equal(await editor().innerText(), 'Keep my code draft');
  assert.equal(await page.locator(`[data-source-session-id="${chatId}"]`).count(), 0);
  await page.locator('[data-source-session-id="existing-code"] [data-row-main-button]').click();
  checks.push('Restart preserves surface classification, chat history and the old Code draft/session');
  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Projects' }).click();
  await page.getByText('Looking to start a project?', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-pictogram="HandBlocks"]').count(), 1);
  await page.getByRole('button', { name: 'New project', exact: true }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'New project', exact: true });
  await projectDialog.getByLabel('Name', { exact: true }).fill('Research notebook');
  await projectDialog.getByLabel('Description', { exact: true }).fill('Keep sources and findings together');
  await projectDialog.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('link', { name: 'Research notebook', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Search projects', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search projects', exact: true }).fill('missing project');
  await page.getByText('No projects matching “missing project”', { exact: true }).waitFor();
  await page.getByRole('searchbox', { name: 'Search projects', exact: true }).fill('Research');
  await page.getByRole('link', { name: 'Research notebook', exact: true }).waitFor();
  await page.screenshot({ path: path.join(evidence, 'projects-source-list.png') });
  await app.close(); app = null;
  await launch();
  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Projects' }).click();
  await page.getByRole('link', { name: 'Research notebook', exact: true }).click();
  await page.getByRole('heading', { name: 'Research notebook', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Project or folder', exact: true }).getByText('Research notebook', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Pin project', exact: true }).click();
  await page.getByRole('button', { name: 'Unpin project', exact: true }).waitFor();
  await editor().fill('Keep this project draft');
  await page.locator('.source-sidebar-nav-row').getByText('New', { exact: true }).first().click();
  assert.notEqual(await editor().innerText(), 'Keep this project draft');
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Projects' }).click();
  await page.getByRole('link', { name: 'Research notebook', exact: true }).click();
  await page.getByRole('heading', { name: 'Research notebook', exact: true }).waitFor();
  assert.equal(await editor().innerText(), 'Keep this project draft');
  await page.getByRole('button', { name: 'Project options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Project instructions', exact: true }).click();
  const instructions = page.getByRole('dialog', { name: 'Project instructions', exact: true });
  await instructions.getByLabel('Instructions', { exact: true }).fill('PROJECT_CONTEXT_MARKER: cite every source.');
  await instructions.getByRole('button', { name: 'Save', exact: true }).click();
  await instructions.waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(evidence, 'project-source-detail.png') });
  await send('fixture:complete project');
  await page.getByText('Fixture response', { exact: true }).waitFor();
  prefs = await read('preferences.json');
  const project = prefs.localProjects.find(project => project.name === 'Research notebook');
  const projectSession = Object.entries(prefs.sessionMetadata).find(([, value]) => value.projectId === project.id);
  assert.ok(projectSession, 'Project task must retain its project association');
  assert.equal(prefs.threadMetadata[projectSession[0]].cwd, project.cwd);
  const projectRequests = await log('fixture-history.jsonl');
  assert.ok(projectRequests.some(row => row.method === 'thread/start' && row.params.developerInstructions?.includes('PROJECT_CONTEXT_MARKER')));
  assert.ok(projectRequests.filter(row => row.method === 'thread/start').every(row => !row.params.codeDesktop?.projectId));
  assert.equal(project.isStarred, true);
  assert.equal(project.instructions, 'PROJECT_CONTEXT_MARKER: cite every source.');
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Projects' }).click();
  await page.getByRole('link', { name: 'Research notebook', exact: true }).click();
  await page.getByRole('region', { name: 'Project sessions', exact: true }).getByRole('button').first().click();
  await page.getByText('Fixture response', { exact: true }).waitFor();
  checks.push('Official project header and session rows support pinning, isolated drafts, instructions, and reopening project history');
  checks.push('Official project list supports creation, search and restart; a project task retains its folder and explicit project ID');
  await send('fixture:complete artifact');
  await page.getByText('Fixture artifact ready', { exact: true }).waitFor();
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Artifacts' }).click();
  await page.getByRole('link', { name: 'research-report.md', exact: true }).waitFor();
  assert.equal(await page.locator('[data-gallery-card]').count(), 3);
  await page.locator('[data-gallery-card]').filter({ hasText: 'research-report.md' }).getByRole('button', { name: 'Pin', exact: true }).click();
  await page.getByRole('button', { name: 'Search your artifacts', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).fill('absent artifact');
  await page.getByText('No artifacts matching “absent artifact”', { exact: true }).waitFor();
  await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).fill('research');
  assert.equal(await page.locator('[data-gallery-card]').count(), 1);
  await page.getByRole('button', { name: 'Switch to list view', exact: true }).click();
  await page.locator('li[data-gallery-card]').waitFor();
  await page.screenshot({ path: path.join(evidence, 'artifacts-source-list.png') });
  await app.close(); app = null;
  await launch();
  await select('Cowork');
  await page.locator('.source-sidebar-nav-row').filter({ hasText: 'Artifacts' }).click();
  await page.locator('li[data-gallery-card]').first().waitFor();
  assert.equal(await page.locator('li[data-gallery-card]').count(), 3);
  await page.getByRole('button', { name: 'Unpin', exact: true }).waitFor();
  await app.evaluate(({ shell }) => { globalThis.artifactOpened = []; shell.openPath = async file => { globalThis.artifactOpened.push(file); return ''; }; });
  await page.getByRole('link', { name: 'research-report.md', exact: true }).click();
  const artifactPreview = page.getByRole('region', { name: 'Artifact preview', exact: true });
  await artifactPreview.getByRole('heading', { name: 'Research report', exact: true }).waitFor();
  assert.equal(await page.locator('.source-chat-tile-content > .workspace-toolbar').count(), 0);
  await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
  await artifactPreview.getByRole('button', { name: 'Show sidebar', exact: true }).click();
  assert.equal((await app.evaluate(() => globalThis.artifactOpened)).length, 0, 'Opening a card stays inside the app');
  await artifactPreview.getByRole('button', { name: 'View source', exact: true }).click();
  await artifactPreview.locator('[data-file-view="source"]').waitFor();
  await artifactPreview.getByRole('button', { name: 'Preview', exact: true }).click();
  await artifactPreview.getByRole('heading', { name: 'Research report', exact: true }).waitFor();
  await page.screenshot({ path: path.join(evidence, 'artifact-document-preview.png') });
  await fs.writeFile(path.join(project.cwd, 'research-report.md'), '# Updated report\nRefreshed content.\n');
  await artifactPreview.getByRole('button', { name: 'Reload', exact: true }).click();
  await artifactPreview.getByRole('heading', { name: 'Updated report', exact: true }).waitFor();
  await artifactPreview.getByRole('button', { name: 'Open in default app', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal((await app.evaluate(() => globalThis.artifactOpened))[0], path.join(project.cwd, 'research-report.md'));
  await artifactPreview.getByRole('button', { name: 'Back to artifacts', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'research-report.md');
  await page.getByRole('link', { name: 'results.csv', exact: true }).click();
  await artifactPreview.getByRole('region', { name: 'Table preview', exact: true }).waitFor();
  await artifactPreview.getByRole('cell', { name: '42', exact: true }).waitFor();
  await artifactPreview.press('Escape');
  await page.getByRole('link', { name: 'pixel.png', exact: true }).click();
  await page.waitForFunction(() => { const image = document.querySelector('.surface-artifact-viewer img'); return image?.complete && image.naturalWidth === 1; });
  await artifactPreview.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Search your artifacts', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).fill('research');
  await page.getByRole('link', { name: 'research-report.md', exact: true }).click();
  await fs.unlink(path.join(project.cwd, 'research-report.md'));
  await artifactPreview.getByRole('button', { name: 'Reload', exact: true }).click();
  await artifactPreview.getByText('Couldn’t find this file', { exact: true }).waitFor();
  await artifactPreview.getByRole('button', { name: 'Back to artifacts', exact: true }).click();
  assert.equal(await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).inputValue(), 'research');
  await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).fill('');
  await page.getByRole('button', { name: 'Switch to grid view', exact: true }).click();
  await page.screenshot({ path: path.join(evidence, 'artifacts-source-grid.png') });
  await page.getByRole('button', { name: 'Artifact options', exact: true }).first().click();
  await page.getByRole('menuitem', { name: 'Open conversation', exact: true }).click();
  await page.getByText('Fixture artifact ready', { exact: true }).waitFor();
  checks.push('Official artifact grid/list renders real file outputs, searches, pins, persists on restart, opens scoped files and returns to the source conversation');
  checks.push('Artifact viewer renders Markdown, CSV and images, toggles source, reloads changes, reports missing files and restores library search/focus');
  await app.close(); app = null;
  const homePrefs = await read('preferences.json'), homeFixture = await read('fixture-threads.json');
  for (let index = 0; index < 8; index++) {
    const id = `cowork-home-${index}`;
    homePrefs.threadIds.push(id);
    homePrefs.sessionMetadata[id] = { surface: 'cowork', pinned: index === 0, unread: index > 0 && index < 7 };
    homeFixture.threads[id] = { id, name: `Home task ${index}`, cwd: project.cwd, createdAt: now + index, updatedAt: now + index, turns: [], archived: false };
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
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled', { exact: true }).click();
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
  const routineList = page.getByRole('list', { name: 'Scheduled tasks', exact: true });
  await routineList.getByRole('link', { name: 'Morning notes', exact: true }).waitFor();
  assert.match(await routineList.innerText(), /Weekdays/);
  assert.doesNotMatch(await routineList.innerText(), /approx, select/);
  await routineList.getByRole('link', { name: 'Morning notes', exact: true }).hover();
  await routineList.getByRole('button', { name: 'More options for Morning notes', exact: true }).press('ArrowDown');
  await page.getByRole('menuitem', { name: 'Pause', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#local-routine-results')?.innerText.includes('Paused'));
  assert.equal(await page.locator('.st-section-title').innerText(), 'Scheduled tasks');
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
  await page.locator(`a.df-link-card[href="/cowork/${routineRun.threadId}"]`).click();
  await page.getByText('Fixture response', { exact: true }).waitFor();
  await app.close(); app = null;
  await launch(); await select('Cowork');
  await page.locator('.source-sidebar-nav-row').getByText('Scheduled', { exact: true }).click();
  await page.getByRole('list', { name: 'Scheduled tasks', exact: true }).getByRole('link', { name: 'Morning notes', exact: true }).click();
  await page.locator(`a.df-link-card[href="/cowork/${routineRun.threadId}"]`).waitFor();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  routineDialog = page.getByRole('dialog', { name: 'Edit scheduled task', exact: true });
  await routineDialog.getByLabel('Name', { exact: true }).fill('Renamed morning notes');
  await routineDialog.getByRole('combobox', { name: 'Permissions', exact: true }).click();
  // R4i-gui GU1 (R4g-routines RTC host difference 3): the 2.42304.0 Cowork form (c97b955f1 Ca) offers Default / Auto /
  // Skip all approvals; Default is the host's 'ask' (source-routine-cowork-page-adapters.jsx toHostPermission).
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
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Delete scheduled task?', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByText('No scheduled tasks yet.', { exact: true }).waitFor();
  assert.ok((await read('preferences.json')).threadIds.includes(routineRun.threadId));
  const timed = await page.evaluate(() => window.desktop.call('local-routines', { action: 'create', name: 'One-time fixture', prompt: 'fixture:complete timer', fireAt: Date.now() + 2000 }));
  await page.getByRole('list', { name: 'Scheduled tasks', exact: true }).getByRole('link', { name: 'One-time fixture', exact: true }).click();
  const firedTask = await completedRoutine('One-time fixture');
  await page.locator(`a.df-link-card[href="/cowork/${firedTask.runs[0].threadId}"]`).waitFor();
  assert.equal(firedTask.enabled, false); assert.equal(firedTask.nextRunAt, null); assert.equal(firedTask.runs.length, 1);
  assert.equal(firedTask.runs[0].trigger, 'scheduled');
  await page.evaluate(id => window.desktop.call('local-routines', { action: 'delete', id }), timed.id);
  checks.push('Original scheduled form, detail and menu create, pause, edit, persist and run Cowork tasks; cron validation, weekly presets, permissions (Default → ask), unsaved-change confirmation, instruction preview, history and deletion work through local services');
  // Resize last: hidden macOS Electron windows can stop servicing capturePage
  // after native resizing, though their renderer continues to lay out correctly.
  for (const surface of ['Chat', 'Cowork']) {
    await select(surface);
    await page.locator('.source-sidebar-nav-row').getByText('New', { exact: true }).first().click();
    await verifyGreetingLayout(surface.toLowerCase());
  }
  checks.push('Original greeting and Spark stay separated at four window widths in both Chat and Cowork');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(evidence, 'ui-report.json'), JSON.stringify({ passed: true, checks, errors, profile }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, evidence }, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(evidence, 'ui-report.json'), JSON.stringify({ passed: false, checks, errors, profile, error: error.stack }, null, 2));
  throw error;
} finally { if (app) await app.close(); }
