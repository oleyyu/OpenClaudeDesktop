import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const installedStyles = await fs.readFile(path.resolve(root, '../reference/installed-2.31226.0-20261012/ion-dist/assets/v1/c6a992d55-C0zTICcS.css'), 'utf8');
const evidence = path.resolve(root, '../analysis/chat-cowork-20261012/ui');
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
let passed = false;
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
        fontSize: parseFloat(getComputedStyle(text).fontSize), lineHeight: parseFloat(getComputedStyle(text).lineHeight),
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
    // GA("compact") in the installed source. A cycle can evaluate its constants
    // too early and silently leave React's inline fontSize undefined.
    const expectedFontSize = Math.min(2 * metric.rootRem, Math.max(1.5 * metric.rootRem, 1.15 * metric.rootRem + metric.viewport * .01));
    assert.ok(Math.abs(metric.fontSize - expectedFontSize) < .02, `Original compact greeting typography: ${JSON.stringify(metric)}`);
    assert.ok(Math.abs(metric.lineHeight - expectedFontSize * 1.2) < .02);
    assert.ok(Math.abs(metric.composerGap - metric.columnGap) < 1, `Greeting and composer use the original column gap: ${JSON.stringify(metric)}`);
    measurements.push(metric);
  }
  await fs.writeFile(path.join(evidence, `${surface}-greeting-geometry.json`), JSON.stringify(measurements, null, 2));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1200, 800));
}
async function verifyHomePosition(surface) {
  const measurements = [];
  for (const scenario of [
    {height: 600}, {height: 800}, {height: 899}, {height: 900},
    {height: 1000}, {height: 1200},
    {height: 800, arm: 'tall'}, {height: 1000, arm: 'short'},
    {height: 1000, activationHeight: '800px'},
  ]) {
    await app.evaluate(({BrowserWindow}, height) => BrowserWindow.getAllWindows()[0].setSize(1200, height), scenario.height);
    const metric = await page.evaluate(async ({css, scenario}) => {
      const html = document.documentElement;
      if (scenario.arm) html.setAttribute('data-prerender-headroom-arm', scenario.arm);
      else html.removeAttribute('data-prerender-headroom-arm');
      if (scenario.activationHeight) html.style.setProperty('--prerender-activation-viewport-height', scenario.activationHeight);
      else html.style.removeProperty('--prerender-activation-viewport-height');
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const column = document.querySelector('.surface-home-column');
      const toolbar = column.closest('.source-chat-tile-content').querySelector(':scope > .st-toolbar');
      column.parentElement.scrollTop = 0;
      // Independently render the installed, unscoped stylesheet. Do not encode
      // a copied percentage formula as the expected result.
      const frame = document.createElement('iframe');
      Object.assign(frame.style, {position:'fixed',left:'-20000px',width:`${innerWidth}px`,height:`${innerHeight}px`,border:'0'});
      document.body.append(frame);
      try {
        const doc = frame.contentDocument;
        doc.open(); doc.write('<!doctype html><html><head></head><body></body></html>'); doc.close();
        const style = doc.createElement('style'); style.textContent = css; doc.head.append(style);
        if (scenario.arm) doc.documentElement.setAttribute('data-prerender-headroom-arm', scenario.arm);
        if (scenario.activationHeight) doc.documentElement.style.setProperty('--prerender-activation-viewport-height', scenario.activationHeight);
        doc.documentElement.style.fontSize = getComputedStyle(html).fontSize;
        const reference = doc.createElement('div'); reference.className = column.className; doc.body.append(reference);
        const columnStyle = getComputedStyle(column), header = column.querySelector('.surface-greeting');
        const composer = column.querySelector('.composer-zone');
        return { ...scenario, viewportHeight:innerHeight,
          toolbarHeight:toolbar.getBoundingClientRect().height,
          expectedPadding:parseFloat(frame.contentWindow.getComputedStyle(reference).paddingTop),
          actualPadding:parseFloat(columnStyle.paddingTop),
          columnTop:column.getBoundingClientRect().top,
          greetingTop:header.getBoundingClientRect().top,
          greetingMargin:parseFloat(getComputedStyle(header).marginTop),
          greetingHeight:header.getBoundingClientRect().height,
          gap:parseFloat(columnStyle.rowGap), composerTop:composer.getBoundingClientRect().top };
      } finally { frame.remove(); }
    }, {css:installedStyles, scenario});
    measurements.push(metric);
    assert.equal(metric.toolbarHeight, 48, 'Installed Chat/Cowork header height');
    assert.ok(Math.abs(metric.actualPadding - metric.expectedPadding) < 0.1, `Installed home padding: ${JSON.stringify(metric)}`);
    const expectedComposerTop = metric.columnTop + metric.expectedPadding + metric.greetingMargin + metric.greetingHeight + metric.gap;
    assert.ok(Math.abs(metric.composerTop - expectedComposerTop) < 0.1, `Composer absolute position: ${JSON.stringify(metric)}`);
  }
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-prerender-headroom-arm');
    document.documentElement.style.removeProperty('--prerender-activation-viewport-height');
  });
  await fs.writeFile(path.join(evidence, `${surface}-home-position.json`), JSON.stringify(measurements,null,2));
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(1200,800));
}
try {
  await launch();
  await select('Chat');
  await verifyGreetingLayout('chat');
  await verifyHomePosition('chat');
  const home = await page.locator('[data-cds="ChatComposer"]').evaluate(node => ({height:node.firstElementChild.getBoundingClientRect().height,width:node.getBoundingClientRect().width,chin:!!node.querySelector('[data-cds="ChatComposerChin"]')}));
  assert.ok(home.height > 80 && home.height < 180, JSON.stringify(home));
  assert.equal(home.chin,true);
  await page.screenshot({path:path.join(evidence,'chat-home.png')});
  await send('fixture:complete chat');
  await page.getByText('Fixture response',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-cds="ChatComposerActions"]').getByRole('button',{name:'Add',exact:true}).count(),0);
  assert.equal(await page.locator('[data-cds="ChatComposerChin"]').getByRole('button',{name:'Add',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Changes',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Terminal',exact:true}).count(),0);
  await page.getByRole('button',{name:'Activity panel',exact:true}).click();
  await page.getByRole('complementary',{name:'Task details'}).waitFor();
  await page.getByRole('button',{name:'Activity panel',exact:true}).click();
  await page.getByRole('complementary',{name:'Task details'}).waitFor({state:'detached'});
  const replyGeometry=await page.locator('[data-cds="ChatComposer"]').evaluate(node=>({width:node.getBoundingClientRect().width,font:getComputedStyle(document.querySelector('.source-assistant-message .source-markdown')).fontFamily}));
  assert.equal(replyGeometry.width,768);
  assert.match(replyGeometry.font,/serif|Tiempos/i);
  await page.screenshot({path:path.join(evidence,'chat-reply.png')});
  checks.push('Chat sends through real Electron IPC; latest reply control placement renders');
  await send('fixture:plan');
  await page.getByRole('button',{name:'Activity panel',exact:true}).click();
  const activity=page.getByRole('complementary',{name:'Task details'});
  await activity.getByText('Dock the plan pane',{exact:true}).waitFor();
  assert.equal(await activity.locator('.group\\/todo').count(),3);
  const progress=activity.getByRole('button',{name:'Progress',exact:true});
  await progress.click(); assert.equal(await progress.getAttribute('aria-expanded'),'false');
  await progress.press('Enter'); assert.equal(await progress.getAttribute('aria-expanded'),'true');
  await activity.evaluate(async node=>{
    const images=[...node.querySelectorAll('[style*="background-image"]')];
    if(!images.length)throw Error('Missing current activity illustrations');
    await Promise.all(images.map(element=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Current activity image failed'));
      image.src=getComputedStyle(element).backgroundImage.slice(5,-2);
    })));
  });
  await page.screenshot({path:path.join(evidence,'current-activity.png')});
  checks.push('Current activity panel renders live plan events, original illustrations, and mouse/keyboard collapse');
  await select('Cowork');
  await verifyGreetingLayout('cowork');
  await verifyHomePosition('cowork');
  await page.getByRole('button',{name:'Permission mode',exact:true}).waitFor();
  await page.screenshot({path:path.join(evidence,'cowork-home.png')});
  await editor().fill('Cowork draft stays separate');
  await select('Chat');
  await select('Cowork');
  assert.equal(await editor().innerText(),'Cowork draft stays separate');
  checks.push('Chat/Cowork original greeting geometry at four widths; independent drafts and Cowork controls');
  checks.push('Chat/Cowork absolute composer placement matches unmodified installed CSS at six heights, including the 900px breakpoint and prerender variants');
  assert.deepEqual(errors,[]);
  passed = true;
} finally {
  await fs.writeFile(path.join(evidence,'report.json'),JSON.stringify({passed,checks,errors,profile},null,2));
  await app?.close();
}
console.log(JSON.stringify({checks,errors,evidence}));
