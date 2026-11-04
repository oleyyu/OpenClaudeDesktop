import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// W14-code r8 css8-classic-context-row-dead (E95): the classic layout's context row (codeLayout=classic) is gone with its
// chips; the presets environment bar, the folder menu and the usage panel are what is left to pin here.
// Fidelity F03: environment chips (cc43287c9-BMbiZYzF.js dH :21863-22100, lH :21638-21850, hT :22009-22035),
// the usage panel (c360a9e1c vd :4240-4285 over c2d611398 I/V/z) and the retired code-ui Popover/MenuItem.
const app = path.resolve(import.meta.dirname, '..');
let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
});
after(() => server?.close());
const noop = () => {};
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceComposer, {
  codeLayout: 'classic', draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'ask', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture/project', showContext: true,
  workspaceInfo: { isRepo: true, branch: 'main', branches: ['main'] }, onAddFolder: noop, setWorktree: noop, ...props }));
test('the classic context row is gone: no .sc-context-row, Local / folder / branch / worktree chips or Add another folder (E95)', () => {
  // cc43287c9 Dle draws that row only off presets; claudeai_cc_epitaxy_session_presets_main is on for the 3P desktop (E92).
  for (const layout of ['classic', 'presets', 'side-session']) {
    const html = render({ codeLayout: layout, additionalFolders: ['/tmp/other/lib'] });
    assert.doesNotMatch(html, /sc-context-row|sc-context-chip|sc-folder-chip|sc-extra-folder|sc-add-folder|data-branch-worktree/, layout);
    assert.doesNotMatch(html, /Add another folder|Work in an isolated copy of the repository/, layout);
  }
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.doesNotMatch(source, /function ComposerButton|ENV_TOOLTIP|SPLIT_PILL_CLASS|WORKTREE_TOOLTIP|SearchablePillSelect|DraftGroupChip|DRAFT_GROUP_PILL_CLASS|onAddFolder\b|onRemoveFolder|onSelectBranch|setWorktree/);
  assert.equal(C.WORKTREE_TOOLTIP, undefined); assert.equal(C.DraftGroupChip, undefined);
  const css = fs.readFileSync(path.join(app, 'src/source-composer.css'), 'utf8');
  assert.doesNotMatch(css, /^\.(sc-context-row|sc-button|sc-icon-button|sc-folder-chip|sc-extra-folder|sc-add-folder|sc-tooltip-path)\b|\.sc-chin \.sc-(icon-)?button|\.smenu-popup\.sc-env-menu/m);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.doesNotMatch(main, /local: \{ side: "top"|case "local":|SourceLocalEnvironmentMenu|onAddFolder=|onRemoveFolder=\{dir|onSelectBranch=|setWorktree=\{setWorktree\}/);
});

test('Recent menu: radio rows (current checked, title = path), dismiss X on the others, then Open folder…', () => {
  const html = renderToStaticMarkup(React.createElement(C.SourceRecentFolderMenu, {
    rows: [
      { path: '/a/app', label: 'app', description: '/a', checked: true, dismissible: false },
      { path: '/b/app', label: 'app', description: '/b', checked: false, dismissible: true },
    ], onSelect: noop, onDismiss: noop, onBrowse: noop }));
  // (GroupLabel wires aria-labelledby in a layout effect, which SSR does not run.)
  assert.match(html, /<div role="group"[^>]*><div id="[^"]+" class="smenu-group-label">Recent<\/div>/);
  const rows = [...html.matchAll(/<div[^>]*role="menuitemradio"[^>]*>/g)].map((match) => match[0]);
  assert.equal(rows.length, 2);
  assert.match(rows[0], /aria-checked="true"/); assert.match(rows[0], /title="\/a\/app"/); assert.doesNotMatch(rows[0], /aria-keyshortcuts/);
  assert.match(rows[1], /aria-checked="false"/); assert.match(rows[1], /aria-keyshortcuts="Delete"/);
  assert.equal([...html.matchAll(/data-dismiss-recent="" aria-hidden="true" title="Remove from recent"/g)].length, 1, 'only the non-current row');
  assert.match(html, /class="smenu-description"[^>]*>\/b<\/span>/);
  assert.match(html, /<div role="separator" class="smenu-separator"><\/div><div[^>]*role="menuitem"[^>]*><span class="smenu-label smenu-copy-single">Open folder…<\/span>/);
  // Nothing recent: only Open folder… (the composer browses directly in that case).
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(C.SourceRecentFolderMenu, { rows: [], onBrowse: noop })), /Recent|separator/);
});

// W14-code r7 css7-branch-picker-bl: the branch list, its search and Empty row are cd2687f9f we's own (bL popup);
// tests/w14-r7-composer.test.mjs pins the props the chip passes, and the host SourceBranchPickerMenu is gone.
test('the host branch menu is gone', () => {
  assert.equal(C.SourceBranchPickerMenu, undefined);
});

test('usage panel: context window section and the detailed-breakdown row; no Usage heading, no menuitem', () => {
  const html = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, {
    usage: { last: { totalTokens: 100 }, modelContextWindow: 128000 }, onSeeDetails: noop }));
  // W14-code r6 css6-usage-panel-body: c2d611398 Le's R header, ze's bar and Oe's separator strings verbatim.
  assert.match(html, /<button type="button" class="group flex items-center gap-2 px-lg py-xs min-h-\[20px\] text-start outline-none focus-visible:shadow-focus rounded" disabled=""><span class="text-footnote text-muted-as-secondary">Context window<\/span><span class="text-footnote text-muted-as-secondary tabular-nums ms-auto">100 \/ 128k \(0%\)<\/span><\/button>/);
  assert.match(html, /<div class="mt-pad-xs px-lg pb-xs"><div class="h-\[4px\] rounded-full overflow-hidden" style="background-color:var\(--cds-chart-reference-tint\)" role="progressbar" aria-label="Context window" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">/);
  assert.match(html, /<div class="mx-pad-lg my-xs h-px bg-alpha-2 first:hidden"><\/div>/);
  // W14-code r6 gen-final-6: c2d611398 Ne — `div.flex.px-lg.py-xs` over b.Close rendered as the CDS button (p = Eu, size
  // xs); the host's .sc-usage-link button is gone.
  assert.match(html, /<div class="flex px-lg py-xs"><button type="button" data-cds="Button" data-size="xs" [^>]*>(?:(?!<\/button>).)*See detailed breakdown<\/span><\/button><\/div>/);
  assert.doesNotMatch(html, /sc-usage-link/);
  assert.doesNotMatch(html, /menuitem|>Usage</);
  // An open session without a report shows only the breakdown row; the no-session draft reads 'Context 0'.
  const empty = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, onSeeDetails: noop }));
  assert.doesNotMatch(empty, /Context window|h-px bg-alpha-2/); assert.match(empty, /See detailed breakdown/);
  const draft = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, fresh: true }));
  assert.match(draft, /tabular-nums ms-auto">0<\/span>/); assert.match(draft, /aria-valuetext="0"/); assert.doesNotMatch(draft, /See detailed breakdown/);
});

// W14-code r6-composer-02: the effort popover's title, value label, slider and lit overlay are the sliced c8e04f916
// EffortControl / c2d9b9a76 Slider / c227f4d5e P$ (tests/w14-r6-composer.test.mjs); the host's hand-drawn control and
// its user-decision purple tier (any highest level) are gone with it (E95: the official accent is ultracode only).

test('the legacy code-ui Popover/MenuItem host is gone; menus and popovers use the CDS primitives', () => {
  const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
  const main = read('src/main.jsx'), codeUi = read('src/code-ui.jsx'), style = read('src/style.css');
  assert.doesNotMatch(codeUi, /export function (Popover|MenuItem)\b/);
  assert.doesNotMatch(main, /<Popover\b|<MenuItem\b|\bmenu-heading\b|\bmenu-divider\b/);
  assert.doesNotMatch(style, /\.code-popover|\.code-menu-item|\.menu-heading|\.menu-divider|\.menu-folder-path/);
  assert.doesNotMatch(main, /setWorktree\(true\)/, 'choosing a branch never flips worktree');
  assert.doesNotMatch(main, /local: \{ side: "top"/); // W14-code r8 css8-classic-context-row-dead: the Local pill menu is gone
  // W14-code r7 css7-branch-picker-bl: bL owns the branch popup; the host 'branch' menu is gone.
  assert.doesNotMatch(main, /branch: \{ side: "top"|SourceBranchPickerMenu|sc-branch-menu/);
  assert.match(main, /folder: \{ side: "bottom", align: "start", label: "Working directory" \}/);
  assert.match(main, /<SourceMenu\.GroupLabel>\{t\("Working directory"\)\}<\/SourceMenu\.GroupLabel>\s*\{gitRepoMenuItems\(/);
  // W14-code r4 复核 (E95): the sidebar footer's 'connection' menu (Connection settings, no en-US string) is gone.
  assert.doesNotMatch(main, /connection: \{ side: "top"/);
  const composer = read('src/source-composer.jsx');
  // W14-code r6-composer-02: c8e04f916 rt — the Popup class string is the generated EffortControl's own (c6a992d55
  // utilities); the host renders that control and keeps no effort popover rules.
  assert.ok(composer.includes('<OfficialEffortControl options={options}'));
  const composerCss = read('src/source-composer.css');
  assert.doesNotMatch(composerCss, /\.sc-effort-popover|\.sc-effort-label/);
  const utilities = read('public/assets/v1/c6a992d55-Che1orl5.css');
  for (const name of ['.isolate{', '.flex{', '.w-\\[220px\\]{', '.select-none{', '.flex-col{', '.gap-lg{', '.shrink-0{', '.text-muted{']) assert.ok(utilities.includes(name), name);
  // W14-code r5 css5-usage-popover-handcopy: c227f4d5e V3's popup / Title / body classes verbatim; the host rule only
  // releases source-popover.css's unlayered caps to those utilities.
  assert.ok(composer.includes('<SourcePopover anchor={anchor} side="top" align="end" sideOffset={8} padding="none" className="epitaxy-root break-words w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)] sc-usage-popover"'));
  assert.match(composer, /<SourcePopoverTitle className="sr-only">\{t\("Usage"\)\}<\/SourcePopoverTitle>/);
  assert.ok(composer.includes('<div className="flex flex-col py-sm"><SourceUsagePanel'));
  assert.match(read('src/source-composer.css'), /\.sp-popup\.sc-usage-popover \{ max-width: revert-layer; max-height: revert-layer; \}/);
  // W14-code composer-07: /cd without a path asks with "Change working directory" (c227f4d5e Lz SoyaAWkbuR).
  assert.match(read('electron/main.cjs'), /const title = p\.purpose === "cd" \? i18n\.t\("Change working directory"\) : p\.additional \? i18n\.t\("Add folder to session"\) : i18n\.t\("Select folder for local session"\);/);
});

test('SourcePopover carries the px/gx contract', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-popover.jsx'), 'utf8'), css = fs.readFileSync(path.join(app, 'src/source-popover.css'), 'utf8');
  assert.match(source, /side = "bottom", align = "center", sideOffset = POPOVER_SIDE_OFFSET/);
  assert.match(source, /export const POPOVER_SIDE_OFFSET = 6;/);
  assert.match(source, /export const POPOVER_LAYER_OFFSET = 20;/);
  assert.match(source, /padding = "lg"/);
  assert.match(source, /role="dialog"[^>]*\n?[^>]*data-cds=\{dataCds\} data-cds-overlay=""/);
  assert.match(source, /data-cds-popover-body="" data-cds-sheet-scroll=""/);
  assert.match(source, /if \(event\.defaultPrevented \|\| event\.isComposing \|\| event\.key !== "Escape"\) return;\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  assert.match(source, /window\.addEventListener\("resize", place\)/);
  assert.doesNotMatch(source, /addEventListener\("resize", (onClose|requestClose)/, 'a resize repositions, never closes');
  assert.match(css, /max-width: 320px;\s*max-height: var\(--available-height\);/);
  assert.match(css, /background: var\(--cds-surface-3\);/);
  for (const [name, token] of [['none', '0'], ['xs', 'var(--cds-pad-xs)'], ['sm', 'var(--cds-pad-sm)'], ['md', 'var(--cds-pad-md)'], ['lg', 'var(--cds-pad-lg)']])
    assert.ok(css.includes(`.sp-body[data-padding="${name}"] { padding: ${token}; }`), name);
});

// R05: the compact action row (c2d611398 H after the bar; cf6ae6197 Tw minPct 50, Ow reasons; c360a9e1c hd oe).
test('usage panel: a Compact session xs Button row at 50% or more with an onCompact; none at 0% or without one', () => {
  const at60 = { last: { totalTokens: 76800 }, modelContextWindow: 128000 };
  const html = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onSeeDetails: noop, onCompact: noop, compactState: { running: false, connected: true } }));
  // W14-code r7 css7-usage-compact-button (3.6556.2 c2d611398 Ve): the row 'px-lg py-xs …', the hint span always carries
  // hintId (aria-describedby only while a hint exists), and the action is the xs CdsButton inside CdsDisabledReason.
  assert.match(html, /<div class="px-lg py-xs flex items-center gap-sm min-h-\[20px\] text-footnote" data-usage-compact=""><span id="[^"]+" class="flex-1 min-w-0 truncate text-secondary"><\/span><span[^>]*class="[^"]*min-w-0 shrink-0[^"]*"[^>]*><button [^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*<span class="truncate">Compact session<\/span>/);
  assert.match(html, /<button [^>]*data-cds="Button"[^>]*data-size="xs"[^>]*>(?:(?!<\/button>).)*Compact session/);
  assert.doesNotMatch(html, /data-cds="TextLink"|sc-usage-compact/);
  assert.ok(html.indexOf('data-usage-compact') > html.indexOf('role="progressbar"') && html.indexOf('data-usage-compact') < html.indexOf('h-px bg-alpha-2'), 'after the bar, inside the context section');
  const running = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { running: true, connected: true } }));
  assert.match(running, /<button [^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Compact session/);
  assert.match(running, /data-cds-disabled-reason="">Available when DeepSeek finishes this turn</);
  const detached = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { connected: false } }));
  assert.match(detached, /data-cds-disabled-reason="">Available when reconnected</);
  for (const props of [{ usage: { last: { totalTokens: 100 }, modelContextWindow: 128000 }, onCompact: noop }, { usage: at60 }, { usage: at60, onCompact: noop, compactState: { compacting: true } }])
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(C.SourceUsagePanel, props)), /Compact session/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, fresh: true, onCompact: noop })), /Compact session/, 'the draft (no pct) has no row');
});

// B03: 'Where Claude runs' is the running core's: t() names its assistant.
test("the env pill tooltip names the running core's assistant, in English and zh-CN", async (context) => {
  const i18n = await import('../electron/i18n/index.mjs');
  const previous = i18n.getAssistantName();
  context.after(() => { i18n.setAssistantName(previous); i18n.setLocale(i18n.DEFAULT_LOCALE); });
  i18n.setAssistantName('Codex');
  assert.equal(i18n.t('Where DeepSeek runs'), 'Where Codex runs');
  i18n.setLocale('zh-CN');
  i18n.setAssistantName('Kimi');
  assert.equal(i18n.t('Where DeepSeek runs'), 'Kimi 的运行位置');
  // (W14-code r8: the environment bar's place chip is its reader now, source-composer-environment-bar.jsx; the classic
  // row's ComposerButton is gone.)
  assert.ok(fs.readFileSync(path.join(app, 'src/source-composer-environment-bar.jsx'), 'utf8').includes('content={t("Where DeepSeek runs")}'));
});

// composer-env-chip-caret (3.6556.2 cc43287c9 a8 `caret: o`): the place chip shows CaretDown only for a cloud auto place
// (`caret: U`, `U = B !== void 0`, B = cloudAuto); the host has no cloud environments, so the presets Home bar's chips
// carry no caret, as the official closed branch.
test('the Home environment bar chips carry no caret (official caret only with cloudAuto)', () => {
  const official = fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cc43287c9-Me-M2ucD.js'), 'utf8');
  assert.ok(official.includes('name:"CaretDown",size:"xs",className:"shrink-0 text-muted-as-secondary"'));
  assert.ok(official.includes('caret:!1,onClick:e'));
  const html = render({ codeLayout: 'presets', environmentMenu: true });
  const bar = html.slice(html.indexOf('data-env-bar-host'));
  assert.ok(bar.includes('data-testid="environment-bar-trigger"'), 'the place chip rendered');
  assert.doesNotMatch(bar, /shrink-0 text-muted-as-secondary/, 'no chip caret');
});
