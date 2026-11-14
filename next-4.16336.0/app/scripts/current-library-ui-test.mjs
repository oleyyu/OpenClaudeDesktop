import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.resolve(root, '../analysis/chat-cowork-ui-20261012/ui');
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
const editor = () => page.locator('.source-chat-composer .sc-input[contenteditable="true"]');
async function send(text) {
  await editor().fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
}
try {
  await launch();
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
  checks.push('Current project creation, search, restart, detail, pinning, draft isolation, instruction editing');
  await select('Chat');
  await page.locator('.source-sidebar-nav-row').getByText('New', { exact: true }).first().click();
  await send('fixture:complete artifact');
  await page.getByText('Fixture artifact ready', { exact: true }).waitFor();
  var artifactCwd = path.dirname(Object.values((await read('preferences.json')).localArtifacts)[0].path);
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
  await fs.writeFile(path.join(artifactCwd, 'research-report.md'), '# Updated report\nRefreshed content.\n');
  await artifactPreview.getByRole('button', { name: 'Reload', exact: true }).click();
  await artifactPreview.getByRole('heading', { name: 'Updated report', exact: true }).waitFor();
  await artifactPreview.getByRole('button', { name: 'Open in default app', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal((await app.evaluate(() => globalThis.artifactOpened))[0], path.join(artifactCwd, 'research-report.md'));
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
  await fs.unlink(path.join(artifactCwd, 'research-report.md'));
  await artifactPreview.getByRole('button', { name: 'Reload', exact: true }).click();
  await artifactPreview.getByText('Couldn’t find this file', { exact: true }).waitFor();
  await artifactPreview.getByRole('button', { name: 'Back to artifacts', exact: true }).click();
  assert.equal(await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).inputValue(), 'research');
  await page.getByRole('searchbox', { name: 'Search your artifacts', exact: true }).fill('');
  await page.getByRole('button', { name: 'Switch to grid view', exact: true }).click();
  await page.screenshot({ path: path.join(evidence, 'artifacts-source-grid.png') });
  const geometry = [];
  for (const width of [800, 1000, 1440]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 800), width);
    await page.getByRole('button', { name: 'Search your artifacts', exact: true }).click();
    const search = page.getByRole('searchbox', { name: 'Search your artifacts', exact: true });
    await search.fill('pixel');
    await page.getByRole('link', { name: 'pixel.png', exact: true }).waitFor();
    await search.press('Escape');
    assert.equal(await search.inputValue(), '');
    await search.press('Escape');
    await search.waitFor({ state: 'detached' });
    const metric = await page.locator('.surface-artifact-library').evaluate(async node => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const header = node.querySelector('[data-cds="PageHeader"]');
      const list = node.querySelector('ul');
      return { width: innerWidth, overflow: node.scrollWidth - node.clientWidth,
        headerOverflow: header.scrollWidth - header.clientWidth,
        columns: getComputedStyle(list).gridTemplateColumns.split(' ').length,
        controlWidth: header.querySelector('[data-cds-part="controls"]').getBoundingClientRect().width };
    });
    assert.ok(metric.overflow <= 1 && metric.headerOverflow <= 1, JSON.stringify(metric));
    geometry.push(metric);
    await page.screenshot({ path: path.join(evidence, `artifacts-${width}.png`) });
  }
  await fs.writeFile(path.join(evidence, 'geometry.json'), JSON.stringify(geometry, null, 2));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1200, 800));
  await page.evaluate(() => window.desktop.call('settings', { theme: 'dark' }));
  await page.waitForFunction(() => document.documentElement.dataset.mode === 'dark');
  await page.screenshot({ path: path.join(evidence, 'artifacts-dark.png') });
  await page.getByRole('link', { name: 'pixel.png', exact: true }).click();
  await page.getByTestId('frame-artifact-title').waitFor();
  assert.equal(await page.getByTestId('frame-artifact-viewer-header').evaluate(node => node.getBoundingClientRect().height), 48);
  await page.screenshot({ path: path.join(evidence, 'artifact-viewer-dark.png') });
  await page.getByRole('button', { name: 'Back to artifacts', exact: true }).click();
  checks.push('Current search expands and collapses with Escape; no header overflow at 800/1000/1440px; dark library and 48px artifact frame render');
  // 3.6556.2 c69e9937a cn: the card trigger reads "More options for {label}".
  await page.getByRole('button', { name: /^More options for / }).first().click();
  await page.getByRole('menuitem', { name: 'Open conversation', exact: true }).click();
  await page.getByText('Fixture artifact ready', { exact: true }).waitFor();
  var artifactCwd = path.dirname(Object.values((await read('preferences.json')).localArtifacts)[0].path);
  checks.push('Official artifact grid/list renders real file outputs, searches, pins, persists on restart, opens scoped files and returns to the source conversation');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(evidence, 'ui-report.json'), JSON.stringify({ passed: true, checks, errors, profile }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, evidence }, null, 2));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(evidence, 'ui-report.json'), JSON.stringify({ passed: false, checks, errors, profile, error: error.stack }, null, 2));
  throw error;
} finally { if (app) await app.close(); }
