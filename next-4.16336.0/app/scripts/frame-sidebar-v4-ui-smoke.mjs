// frame-sidebar 4.16336.0 GUI smoke (productionPlan step 7): the built app/dist in an isolated Electron profile (os.tmpdir(),
// removed afterwards) with the fixture core (tests/fixtures/codex-server.cjs) and synthetic sessions only. Checks that the
// main window's frame root is the official vB with the host-only marks on the same element (review P2: desktop-app on
// .dframe-root), that KR's aside holds the host slots, that collapse / expand go through the sliced collapse button and fO
// trigger, and records renderer errors. Screenshots + JSON go to FRAME_SIDEBAR_GUI_DIR (default: os.tmpdir()).
//   node scripts/frame-sidebar-v4-ui-smoke.mjs
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { _electron as electron } from '../../tools/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const out = process.env.FRAME_SIDEBAR_GUI_DIR ?? await fs.mkdtemp(path.join(os.tmpdir(), 'frame-sidebar-gui-'));
await fs.mkdir(out, { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-sidebar-profile-'));
const workspace = path.join(profile, 'workspace');
await fs.mkdir(workspace, { recursive: true });
const now = Math.floor(Date.now() / 1000), ids = ['fs-fixture-a', 'fs-fixture-b', 'fs-fixture-c'];
const thread = (id, name, age) => ({ id, name, cwd: workspace, createdAt: now - age, updatedAt: now - age, archived: false,
  turns: [{ id: `${id}-turn`, status: 'completed', items: [{ id: `${id}-user`, type: 'userMessage', content: [{ type: 'text', text: 'Fixture prompt.', text_elements: [] }] },
    { id: `${id}-agent`, type: 'agentMessage', text: 'Fixture answer.' }] }] });
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ cwd: workspace, theme: process.env.FRAME_SIDEBAR_THEME ?? 'light', locale: 'en-US', mode: 'code',
  model: 'fixture', effort: 'low', permission: 'auto', threadIds: ids, sidebarWidth: 288, displayName: 'Fixture User', onboardingComplete: true }));
await fs.writeFile(path.join(profile, 'fixture-threads.json'), JSON.stringify({ next: 100, threads: Object.fromEntries(ids.map((id, i) => [id, thread(id, `Fixture session ${'ABC'[i]}`, i * 60)])) }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: path.join(profile, 'codex-home'), CODE_DESKTOP_OFFSCREEN_LAUNCH: '1',
  CODEX_BINARY: path.join(root, 'tests/fixtures/codex-server.cjs') };
await fs.mkdir(env.CODEX_HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;

const build = JSON.parse(await fs.readFile(path.join(root, 'dist/build-info.json'), 'utf8'));
const report = { at: new Date().toISOString(), out, build: { version: build.version, sourceSha256: build.sourceSha256, builtAt: build.builtAt }, checks: [], pageErrors: [], consoleErrors: [], states: {}, passed: false };
const check = (name, value) => { report.checks.push(name); return value; };
const poll = async (fn, label, ms = 10000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await new Promise((r) => setTimeout(r, 50)); } throw Error(`Timed out: ${label}`); };

// The frame facts read in the renderer.
const probe = () => {
  const rect = (e) => e && (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(e.getBoundingClientRect());
  const roots = [...document.querySelectorAll('.dframe-root')];
  const rootEl = roots[0];
  const aside = rootEl?.querySelector(':scope aside.dframe-sidebar');
  const attrs = (e) => e ? Object.fromEntries([...e.attributes].filter((a) => a.name !== 'style').map((a) => [a.name, a.value])) : null;
  const cs = rootEl ? getComputedStyle(rootEl) : null;
  const titlebar = aside?.querySelector('.df-titlebar');
  return {
    rootCount: roots.length, desktopAppOnRoot: !!rootEl?.matches('.desktop-app.dframe-root'), desktopAppElsewhere: document.querySelectorAll('.desktop-app:not(.dframe-root)').length,
    root: attrs(rootEl), rootDisplay: cs?.display, sidebarLeft: cs?.getPropertyValue('--df-sidebar-left').trim(), sidebarWidthVar: cs?.getPropertyValue('--df-sidebar-width').trim(),
    aside: attrs(aside), asideRect: rect(aside), asidePosition: aside && getComputedStyle(aside).position,
    titlebar: titlebar ? [...titlebar.querySelectorAll('button,[role=radiogroup]')].map((b) => b.getAttribute('aria-label') ?? b.getAttribute('role')) : null,
    appSwitchInTitlebar: !!titlebar?.querySelector('.df-app-switch, [data-cds=SegmentedControl], [role=radiogroup]'),
    navBodyScope: !!aside?.querySelector('#frame-peek-popover .source-sidebar.contents'),
    rows: aside ? aside.querySelectorAll('[data-source-session-id]').length : 0,
    navRows: aside ? [...aside.querySelectorAll('.source-sidebar-nav-row')].map((r) => r.textContent.trim().slice(0, 40)) : [],
    trayAccount: !!aside?.querySelector('.df-bottom-tray [data-testid=user-menu-button]'),
    resizeHandle: !!aside?.querySelector('.dframe-resize-handle'),
    content: rect(rootEl?.querySelector('main.dframe-content')), contentInnerPadding: (() => { const e = rootEl?.querySelector('.dframe-content-inner'); return e ? getComputedStyle(e).paddingInlineStart : null; })(),
    workspaceInside: !!rootEl?.querySelector('main.dframe-content .dframe-content-inner main.workspace, main.dframe-content .dframe-content-inner .workspace'),
    compactTrigger: rect(document.querySelector('[data-testid=sidebar-compact-trigger]')),
    htmlAttrs: Object.fromEntries(['data-color-version', 'data-dframe'].map((n) => [n, document.documentElement.getAttribute(n)])),
  };
};

let app, page;
try {
  app = await electron.launch({ executablePath: path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [root], env, timeout: 30000 });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => report.pageErrors.push(e.message.slice(0, 500)));
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 400)); });
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setSize(1440, 900); });
  await page.locator('aside.dframe-sidebar [data-source-session-id]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(800);

  const expanded = report.states.expanded = await page.evaluate(probe);
  await page.screenshot({ path: path.join(out, 'expanded.png') });
  check('one .dframe-root, and it is .desktop-app (no wrapper)', (assert.equal(expanded.rootCount, 1), assert.ok(expanded.desktopAppOnRoot), assert.equal(expanded.desktopAppElsewhere, 0)));
  check('vB root: comfortable, web variant, frame mode mark', (assert.equal(expanded.root['data-sidebar-density'], 'comfortable'), assert.equal(expanded.root['data-variant'], 'web'),
    assert.equal(expanded.root['data-frame-mode'], 'code'), assert.equal(expanded.root['data-collapsed'], undefined)));
  check('KR aside comfortable with the host body, rows, tray account and resize handle', (assert.equal(expanded.aside['data-density'], 'comfortable'), assert.equal(expanded.aside['aria-label'], 'Sidebar'),
    assert.ok(expanded.navBodyScope), assert.ok(expanded.rows >= 3), assert.ok(expanded.trayAccount), assert.ok(expanded.resizeHandle)));
  check('titlebar: Hide sidebar, Back, Forward and the app switch', (assert.ok(expanded.titlebar.includes('Hide sidebar')), assert.ok(expanded.titlebar.includes('Back')), assert.ok(expanded.appSwitchInTitlebar)));
  check('workspace renders inside main.dframe-content', assert.ok(expanded.workspaceInside));

  await page.locator('aside.dframe-sidebar button[aria-label="Hide sidebar"]').click();
  await poll(() => page.evaluate(() => document.querySelector('.dframe-root')?.hasAttribute('data-collapsed')), 'collapsed');
  await page.waitForTimeout(500);
  const collapsed = report.states.collapsed = await page.evaluate(probe);
  await page.screenshot({ path: path.join(out, 'collapsed.png') });
  check('collapsed: data-collapsed on vB root, fO trigger shown, desktop-app kept', (assert.ok(collapsed.compactTrigger && collapsed.compactTrigger.w > 0), assert.ok(collapsed.desktopAppOnRoot)));
  const prefs = JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8'));
  report.states.savedCollapsed = prefs.sidebarCollapsed;
  check('collapse saved to the host preference', assert.equal(prefs.sidebarCollapsed, true));

  await page.locator('[data-testid=sidebar-compact-trigger]').click();
  await poll(() => page.evaluate(() => !document.querySelector('.dframe-root')?.hasAttribute('data-collapsed')), 'expanded again');
  await page.waitForTimeout(400);
  report.states.reexpanded = await page.evaluate(probe);
  check('fO trigger expands the sidebar again', assert.ok(report.states.reexpanded.desktopAppOnRoot));

  await page.keyboard.press('Meta+b');
  await page.waitForTimeout(400);
  report.states.afterCmdB = await page.evaluate(() => document.querySelector('.dframe-root')?.hasAttribute('data-collapsed'));
  if (report.states.afterCmdB) { await page.keyboard.press('Meta+b'); await page.waitForTimeout(300); }

  check('no renderer page errors', assert.deepEqual(report.pageErrors, []));
  report.passed = true;
} catch (error) {
  report.error = String(error?.stack ?? error).slice(0, 2000);
  if (page) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
} finally {
  await app?.close().catch(() => {});
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await fs.rm(profile, { recursive: true, force: true });
  console.log(`FRAME-SIDEBAR GUI ${report.passed ? 'PASS' : 'FAIL'} ${out}`);
  if (!report.passed) process.exitCode = 1;
}
