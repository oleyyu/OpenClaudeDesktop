// W14-code round 5, lane "cleanup" (reports/W14-code/r5-cleanup.md): pins the dead-code removals, the persona greeting
// removal (R5DC-01), the find bar's official SM / wM strings (css5-transcript-find-icons), the This computer variables
// field (fr5-04), the official sr-only (css5-sr-only-handcopies) and the converted SourceSettingsButton call sites.
// Official chunks are read as text only, never executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLocale } from '../electron/i18n/index.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const official = (prefix) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
setLocale('en-US');

// ── R5DC-01 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('R5DC-01: Settings › Persona has no Home greeting row; the copy no longer mentions the home page or a greeting', async () => {
  const page = local('src/source-settings-persona.jsx');
  assert.equal(count(page, "'persona-greeting'"), 0);
  assert.equal(count(page, 'Home greeting'), 1, 'only in the comment that records the removal');
  assert.match(page, /row\('persona-icon', t\('Assistant icon'\), t\('Replaces the spark in the sidebar and while it works\.'\), null,/);
  assert.match(page, /row\('persona-reset', t\('Reset persona'\), t\('Restore the default name and icon\.'\),/);
  // zh-CN follows the two new sentences; the removed row's keys are gone.
  const zh = (await import('../electron/i18n/zh-CN/settings.mjs')).default;
  assert.equal(zh['Replaces the spark in the sidebar and while it works.'], '替换边栏和工作时显示的火花图标。');
  assert.equal(zh['Restore the default name and icon.'], '恢复默认的名称和图标。');
  for (const gone of ['Home greeting', 'The heading on the home page.', 'for your first name. Leave empty for the default greeting.',
    'Replaces the spark in the sidebar, the home page and while it works.', 'Restore the default name, greeting and icon.',
    'Enter a greeting.', 'The greeting can’t contain control characters.']) assert.equal(gone in zh, false, gone);
});

test('R5DC-01: the greeting model chain is gone and an older preferences.json greeting is ignored', async () => {
  const persona = await import('../electron/prefs/persona.mjs');
  assert.deepEqual({ ...persona.PERSONA_DEFAULT }, { assistantName: '', sparkIcon: 'spark', sparkImage: '' });
  for (const gone of ['GREETING_MAX', 'personaGreetingError']) assert.equal(gone in persona, false, gone);
  assert.deepEqual(persona.normalizePersona({ assistantName: 'Ada', greeting: 'Hi {name}' }), { assistantName: 'Ada', sparkIcon: 'spark', sparkImage: '' });
  assert.deepEqual(persona.validatePersona({ assistantName: 'Ada', greeting: 'Hi {name}' }), { assistantName: 'Ada', sparkIcon: 'spark', sparkImage: '' });
  assert.throws(() => persona.validatePersona({ extra: 1 }), /Invalid persona setting/);
  const store = await import('../src/persona-store.mjs');
  for (const gone of ['greetingFor', 'fillGreeting']) assert.equal(gone in store, false, gone);
  const home = await import('../src/home-model.mjs');
  for (const gone of ['greetingName', 'greetingText', 'landingClear', 'RANGE_DAYS', 'parseDayKey', 'rangeCutoff']) assert.equal(gone in home, false, gone);
  // Still used: the Usage page's day keys.
  assert.equal(home.localDayKey(new Date(2026, 0, 5)), '2026-01-05');
});

// ── R5DC-02 / R5DC-05 / R5DC-04 ─────────────────────────────────────────────────────────────────────────────────────
test('R5DC-02: icons.jsx exports Icon only (no Phosphor-name wrappers, no make)', () => {
  const icons = local('src/icons.jsx');
  assert.deepEqual([...icons.matchAll(/^export (?:function|const) (\w+)/gm)].map((match) => match[1]), ['Icon']);
  assert.equal(count(icons, 'const make'), 0);
});

test('R5DC-05: the test-only exports are gone; the sidebar row drag keeps its own threshold', async () => {
  assert.equal('estimateTokens' in await import('../src/context-breakdown-model.mjs'), false);
  assert.equal('openKindSections' in await import('../src/diff-file-list-model.mjs'), false);
  assert.equal('isLocalOnly' in await import('../src/git-rail-model.mjs'), false);
  assert.equal('DRAG_THRESHOLD' in await import('../src/sidebar-width-model.mjs'), false);
  assert.equal((await import('../src/sidebar-drag-model.mjs')).DRAG_THRESHOLD, 4);
  assert.match(local('src/source-sidebar-drag.jsx'), /DRAG_THRESHOLD, GHOST_Z_INDEX[^\n]*\n[^\n]*\} from "\.\/sidebar-drag-model\.mjs"|from "\.\/sidebar-drag-model\.mjs"/);
  assert.equal(count(local('src/state.js'), 'export function userText'), 0);
});

test('R5DC-04: .sh-retry left the disabled-colour keep list; W14-code r7: so did .sg-button (the band row is the generated c96d752d0 EL)', () => {
  const style = local('src/style.css');
  assert.equal(count(style, 'sh-retry'), 0);
  assert.match(style, /\.session-title, \.slp-option,/);
  assert.ok(!local('src/source-git-status.jsx').includes('sg-button'));
});

// ── R5DC-03 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('R5DC-03: no workflow member / pause / save / settings back end; Stop and start stay', async () => {
  const main = local('electron/main.cjs');
  for (const gone of ['"workflow-member"', '"workflow-pause"', '"workflow-save"', '"workflow-settings"', 'codeDesktop/workflow/member',
    'codeDesktop/workflow/pause', 'codeDesktop/workflow/resume', 'codeDesktop/workflow/artifact', '"codeDesktop/workflow/settings"'])
    assert.equal(count(main, gone), 0, gone);
  assert.match(main, /case "workflow-stop": return workflowService\.stop\(p\.id\);/);
  assert.match(main, /"codeDesktop\/workflow\/stop",\n/);
  assert.match(main, /if \(p\.method === "codeDesktop\/workflow\/stop" && \(typeof params\.threadId !== "string" \|\| !config\.threadIds\.includes\(params\.threadId\)\)\) throw new Error\("Unknown session\."\);/);
  assert.equal(count(local('electron/workflow-child.mjs'), "message?.control"), 0);
  assert.equal(count(local('electron/core-registry.mjs'), '//   workflowArtifacts   codeDesktop'), 0);
  const { createWorkflowService } = require('../electron/workflow-service.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r5-cleanup-wf-'));
  try {
    const service = createWorkflowService({ root, getConfig: () => ({ threadIds: [] }), emit() {}, version: 'test', home: root });
    await service.ready;
    for (const gone of ['member', 'pause', 'save']) assert.equal(gone in service, false, gone);
    for (const kept of ['list', 'start', 'stop', 'get', 'dispose', 'orphans']) assert.equal(typeof service[kept], 'function', kept);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  // The renderer never called them (HEAD's card is gone): no src caller is left.
  for (const file of fs.readdirSync(path.join(app, 'src')).filter((name) => /\.(jsx?|mjs)$/.test(name)))
    assert.doesNotMatch(local(`src/${file}`), /["']workflow-(member|pause|save|settings)["']|codeDesktop\/workflow\/(member|pause|resume|artifact|settings)/, file);
});

// ── css5-transcript-find-icons ──────────────────────────────────────────────────────────────────────────────────────
test('find bar: the official shared-23 SM root / input / status and wM button strings, 16px (sm) icons', () => {
  const sm = official('shared-23-');
  const root = '"fixed end-4 top-14","flex items-center gap-1","rounded-lg border-0.5 border-strong bg-surface-3 px-2 py-1.5","shadow-lg"';
  const input = '"w-48 min-w-0 border-0 bg-transparent outline-none","text-body text-primary placeholder:text-muted hide-focus-ring"';
  const status = 'className:"whitespace-nowrap text-footnote text-muted-as-secondary tabular-nums"';
  const button = '"inline-flex size-6 items-center justify-center rounded","text-muted-as-secondary hover:bg-surface-0 hover:text-primary","can-focus disabled:pointer-events-none disabled:opacity-40"';
  for (const needle of [root, input, status, button, 'c(ne,{name:"CaretUp",size:"sm"})', 'c(ne,{name:"CaretDown",size:"sm"})', 'c(ne,{name:"X",size:"sm"})', 'w(c("div",{ref:S,children:fe}),document.body)'])
    assert.equal(count(sm, needle), 1, needle);
  const join = (literal) => [...literal.matchAll(/"([^"]+)"/g)].map((match) => match[1]).join(' ');
  const bar = local('src/source-find-bar.jsx');
  assert.ok(bar.includes(`const FIND_ROOT_CLASS = "${join(root)}";`));
  assert.ok(bar.includes(`const FIND_INPUT_CLASS = "${join(input)}";`));
  assert.ok(bar.includes('const FIND_STATUS_CLASS = "whitespace-nowrap text-footnote text-muted-as-secondary tabular-nums";'));
  assert.ok(bar.includes(`const FIND_BUTTON_CLASS = "${join(button)}";`));
  assert.match(bar, /<div><div ref=\{rootRef\} role="search" tabIndex=\{-1\} data-find-provider-scope="" className=\{FIND_ROOT_CLASS\} style=\{\{ zIndex: FIND_Z \}\}>/);
  assert.match(bar, /<button type="button" aria-label=\{label\} \{\.\.\.props\} className=\{FIND_BUTTON_CLASS\}>\n\s+<Icon name=\{icon\} size=\{16\} \/>/);
  assert.doesNotMatch(bar, /className="sfb-|\bsfb-(root|input|status|button)"/);
  const css = local('src/source-find-bar.css');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\.sfb-/);
  assert.match(css, /::highlight\(transcript-find\) \{/);
  assert.match(css, /::highlight\(transcript-find-active\) \{/);
  // Every utility the bar uses ships in the CSS index.html loads.
  const loaded = ['shared-frame-CegduNQ2.css', 'shared-styles-D_GJawPO.css', 'c6a992d55-Che1orl5.css', 'c8e31bf58-C7gq8dUF.css', 'c3fde7009-BszyXGym.css']
    .map((name) => fs.readFileSync(path.join(app, 'public/assets/v1', name), 'utf8')).join('\n');
  const escape = (name) => name.replace(/[:.\/\[\]()%]/g, (ch) => `\\${ch}`);
  for (const name of new Set([join(root), join(input), 'whitespace-nowrap text-footnote text-muted-as-secondary tabular-nums', join(button)].join(' ').split(' ')))
    assert.ok(loaded.includes(`.${escape(name)}`), name);
});

// ── fr5-04 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('fr5-04: the variables field is CdsTextAreaField with c3f9f1667 Z props, the hint link a CdsTextLink (external)', () => {
  const z = official('c3f9f1667-');
  assert.equal(count(z, 't(o,{dir:"ltr",label:c,hint:l,error:i,value:n,onChange:u,placeholder:k,rows:8,className:"font-mono",autoComplete:"off","data-1p-ignore":"true","data-lpignore":"true",disabled:a,autoFocus:s,fieldClassName:"gap-sm"})'), 1);
  assert.equal(count(z, 'import{$f as J2,Di as o,'), 1, 'o = shared-frame Di');
  assert.match(JSON.stringify(JSON.parse(local('src/generated/view-tabs/manifest.json'))), /"CdsTextAreaField":\{"file":"shared-frame-6jtSkIit\.js","local":"tM","export":"Di"\}/);
  assert.match(JSON.stringify(JSON.parse(local('src/generated/view-tabs/manifest.json'))), /"CdsTextLink":\{"file":"shared-frame-6jtSkIit\.js","local":"_f","export":"hu"\}/);
  const dialog = local('src/source-local-environment-dialog.jsx');
  assert.match(dialog, /<CdsTextAreaField dir="ltr" label=\{t\("Environment variables"\)\} hint=\{hint\} error=\{error \|\| undefined\} value=\{value\}\n\s+onChange=\{\(event\) => onChange\(event\.target\.value\)\} placeholder=\{ENVIRONMENT_PLACEHOLDER\} rows=\{8\} className="font-mono"\n\s+autoComplete="off" data-1p-ignore="true" data-lpignore="true" disabled=\{disabled\} autoFocus=\{autoFocus\}\n\s+data-autofocus=\{autoFocus \? "" : undefined\} fieldClassName="gap-sm" \/>/);
  assert.match(dialog, /<CdsTextLink href=\{ENV_FORMAT_DOCS_URL\} external\n\s+onClick=\{\(event\) => \{ event\.preventDefault\(\); openExternal\(ENV_FORMAT_DOCS_URL\); \}\}>/);
  assert.doesNotMatch(dialog, /className="sle-(field|label|textarea|hint|link|error)/);
  assert.doesNotMatch(local('src/source-local-environment-dialog.css').replace(/\/\*[\s\S]*?\*\//g, ''), /\.sle-(field|label|textarea|hint|link|error)\b/);
});

// ── css5-sr-only-handcopies ─────────────────────────────────────────────────────────────────────────────────────────
test('sr-only: no hand-copied visually-hidden rule or class is left; the find model excludes the official class', async () => {
  const src = path.join(app, 'src');
  const files = fs.readdirSync(src).filter((name) => /\.(css|jsx|mjs|js)$/.test(name));
  const oldClasses = /\b(source-sr-only|sle-sr-only|scds-sr|st-visually-hidden|sch-sr-only|spal-sr-only|cz-sr-only|ss-sr-only|sdc-status|siv-sr-only|smenu-sr-only|sua-sr-only|sca-sr-only|stf-sr-only|sp-sr-only)\b/;
  for (const name of files) {
    const text = local(`src/${name}`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(text, oldClasses, name);
    if (!name.endsWith('.css')) continue;
    // A 1px clipped box is the sr-only hand-copy (the preview pane's skip link is clipped but sized by its padding).
    for (const block of text.match(/[^{}]+\{[^{}]*\}/g) ?? [])
      assert.ok(!(/width:\s*1px/.test(block) && /(clip-path:\s*inset\(50%\)|clip:\s*rect\()/.test(block)), `${name}: ${block.trim().slice(0, 80)}`);
  }
  const official = fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8');
  assert.ok(official.includes('.sr-only{clip-path:inset(50%);white-space:nowrap;border-width:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}'));
  const { findMatches } = await import('../src/transcript-find-model.mjs');
  assert.match(local('src/transcript-find-model.mjs'), /const SR_ONLY_CLASSES = \["sr-only"\];/);
  assert.equal(typeof findMatches, 'function');
  // Hooks that other code reads stay beside the official class.
  assert.match(local('src/source-user-actions.jsx'), /className="sua-show-actions sr-only"/);
  assert.match(local('src/source-turn-footer.jsx'), /className="stf-status sr-only"/);
  assert.match(local('src/source-code-block.jsx'), /className="scb-status sr-only"/);
  assert.match(local('src/source-session.jsx'), /className="sr-only smd-secret-sr"/);
  assert.match(local('src/source-shortcut.jsx'), /<span className="sr-only select-none">\{spoken\}<\/span>/);
});

// ── css5-settings-button-replica (partial) ──────────────────────────────────────────────────────────────────────────
test('SourceSettingsButton: the converted Code call sites use the shared-frame CdsButton', () => {
  // Review fix (【补做】): source-file-viewer, source-preview-pane and source-git-status are converted too.
  for (const file of ['src/main.jsx', 'src/source-sidebar.jsx', 'src/source-pane-review.jsx', 'src/source-image-viewer.jsx', 'src/source-local-environment-dialog.jsx',
    'src/source-file-viewer.jsx', 'src/source-preview-pane.jsx', 'src/source-git-status.jsx']) {
    const text = local(file);
    assert.equal(count(text, 'SourceSettingsButton'), 0, file);
    assert.ok(text.includes('<CdsButton'), file);
  }
  // cb1b78cfa's image preview close: iconOnly X, tooltip off, close-file-preview test id.
  assert.equal(count(official('cb1b78cfa-'), 't(o,{iconOnly:!0,icon:"X","aria-label":m,tooltip:!1,"data-testid":"close-file-preview"})'), 1);
  assert.match(local('src/source-image-viewer.jsx'), /<CdsButton ref=\{closeButton\} variant="ghost" iconOnly icon="X" aria-label=\{t\("Close image preview"\)\} tooltip=\{false\}\n\s+data-testid="close-file-preview"/);
  // cccc2cf0a ES steppers carry the label as their disabled reason.
  assert.match(local('src/source-pane-review.jsx'), /<CdsButton variant="ghost" iconOnly icon=\{icon\} className=\{STEP_CLASS\} aria-label=\{label\} disabledReason=\{label\} disabled=\{disabled\}/);
  assert.doesNotMatch(local('src/source-pane-review.css').replace(/\/\*[\s\S]*?\*\//g, ''), /\.spr-(step|action|dismiss)\b/);
  // cd2efac6e :6939-6999 / :6610-6617: the file cards' xxs buttons use the official busyLabel and disabledReason.
  for (const id of ['O90uuqzJRU', 'pwP08zBuJL', 'EUNIQWzl7D']) assert.equal(count(official('cd2efac6e-'), `busyLabel:`) > 0 && count(official('cd2efac6e-'), id) > 0, true, id);
  const viewer = local('src/source-file-viewer.jsx');
  for (const label of ['tryingAgain', 'creatingFile', 'addingFolder']) assert.match(viewer, new RegExp(`busyLabel: FILE_CARD_LABELS\\.${label}`), label);
  assert.match(viewer, /<CdsButton variant="secondary" size="xxs" disabled disabledReason=\{FILE_CARD_LABELS\.revealFailed\} data-card-action="reveal">/);
  assert.doesNotMatch(viewer, /<SourceTooltip|import \{ SourceTooltip/);
  // c219730b0 ii: the gh hint trigger's official class list; the host .sg-gh-hint / .sg-action / .spv-server-action rules are gone.
  assert.equal(count(official('c219730b0-'), 'className:"shrink-0 text-muted hover:text-secondary @max-[699px]/branch-row:hidden"'), 1);
  // W14-code r8 css8-gh-hint-popover-host: the trigger is ii's own CdsButton (no host hook class) and source-git-status.css is gone.
  assert.match(local('src/source-git-status.jsx'), /<CdsButton variant="secondary" className="shrink-0 text-muted hover:text-secondary @max-\[699px\]\/branch-row:hidden">/);
  assert.equal(fs.existsSync(path.join(app, 'src/source-git-status.css')), false);
  assert.equal(count(official('cf580efe9-'), 'r(g,{size:"sm",variant:O,icon:k,iconOnly:!0,busy:A,disabled:j,"aria-label":M,onClick:N,onMouseDown:Kn,className:"min-w-8 shrink-0"'), 1);
  assert.equal(count(official('cf580efe9-'), 'className:"w-full text-muted hover:text-primary"'), 1);
  assert.doesNotMatch(local('src/source-preview-pane.css'), /source-settings-button|\.spv-server-action|\.spv-see-all/);
});

test('SSR: the Changes review bar and the sidebar boundary render CdsButton markup', async () => {
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const { SourceSidebarBoundary } = await server.ssrLoadModule('/src/source-sidebar.jsx');
    const boundary = new SourceSidebarBoundary({});
    boundary.state = SourceSidebarBoundary.getDerivedStateFromError(new Error('x'));
    const html = renderToStaticMarkup(boundary.render());
    assert.match(html, /<button type="button" data-cds="Button" class="[^"]*">[\s\S]*bg-fill-secondary[\s\S]*Try again<\/span><\/button>/);
    assert.doesNotMatch(html, /ssb-|source-settings-button/);
  } finally { await server.close(); }
});
