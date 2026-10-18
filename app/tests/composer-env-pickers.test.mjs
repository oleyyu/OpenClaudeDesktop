import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Legacy layout coverage (codeLayout=classic), retained for alternate callers.
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
const contextRow = (html) => {
  const start = html.indexOf('<div class="sc-context-row">');
  assert.ok(start >= 0, 'context row rendered');
  return html.slice(start, html.indexOf('<form', start));
};
const button = (html, className) => {
  const match = new RegExp(`<button[^>]*class="[^"]*${className}[^"]*"[^>]*>`).exec(html);
  assert.ok(match, `${className} rendered`);
  return match[0];
};

test('no native title inside .sc-context-row; chips are CDS menu triggers named like the source', () => {
  const row = contextRow(render({}));
  assert.doesNotMatch(row, /\stitle="/, 'CDS tooltips replace the native title fallback');
  // Local / folder / branch open CDS menus (Z.Trigger / hT): aria-haspopup="menu" + aria-expanded.
  for (const name of ['sc-context-chip"', 'sc-folder-chip', 'sc-branch-chip']) assert.match(button(row, name.replace('"', '')), /aria-haspopup="menu"/);
  assert.match(button(row, 'sc-folder-chip'), /aria-label="project"/, 'the folder chip is named by its basename');
  assert.match(row, /<span>project<\/span>/);
  assert.match(button(row, 'sc-branch-chip'), /aria-label="Branch"/);
  // The worktree checkbox is labelled by 'worktree' and described by the sr-only tooltip copy.
  const input = /<input type="checkbox"[^>]*>/.exec(row)[0];
  const described = /aria-describedby="([^"]+)"/.exec(input)[1], labelled = /aria-labelledby="([^"]+)"/.exec(input)[1];
  assert.match(row, new RegExp(`<span id="${labelled}">worktree</span>`));
  assert.match(row, new RegExp(`<span id="${described}" class="sc-sr-only">Work in an isolated copy of the repository</span>`));
  assert.equal(C.WORKTREE_TOOLTIP, 'Work in an isolated copy of the repository');
});

test("folder chip: 'Select folder…' with no folder; a plain button that browses when there is nothing recent", () => {
  const empty = contextRow(render({ workdir: '' }));
  assert.match(button(empty, 'sc-folder-chip'), /aria-label="Select folder…"/);
  assert.match(empty, /<span>Select folder…<\/span>/);
  const direct = button(contextRow(render({ workdir: '', folderMenu: false })), 'sc-folder-chip');
  assert.doesNotMatch(direct, /aria-haspopup/);
});

test("branch chip reads the branch or '—'; an added folder keeps the source's native title (YB)", () => {
  assert.match(contextRow(render({ workspaceInfo: { isRepo: true, branch: '' } })), /sc-branch-chip[^>]*>.*?<span>—<\/span>/);
  const extra = contextRow(render({ additionalFolders: ['/tmp/other/lib'], onRemoveFolder: noop }));
  assert.match(extra, /<span class="sc-context-chip sc-extra-folder" title="\/tmp\/other\/lib">/);
  assert.equal([...extra.matchAll(/\stitle="/g)].length, 1, 'only the added-folder chip carries a title');
});

test('composer source passes the original tooltip copy and options', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.match(source, /content: "Where DeepSeek runs", \.\.\.ENV_TOOLTIP/);
  assert.match(source, /const ENV_TOOLTIP = \{ hoverable: false, collisionPadding: \{ top: 48, right: 8, bottom: 8, left: 8 \} \};/);
  assert.match(source, /content: "Working directory", detail: workdir \? <span className="sc-tooltip-path"><bdi>\{workdir\}<\/bdi><\/span>/);
  assert.match(source, /tooltip=\{\{ content: BRANCH_TOOLTIP \}\}/);
  assert.match(source, /<SourceTooltip content=\{WORKTREE_TOOLTIP\} \{\.\.\.ENV_TOOLTIP\}>/);
  assert.match(source, /tooltip=\{\{ content: "Add another folder", \.\.\.ENV_TOOLTIP \}\}/);
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

test('Branch menu: radio rows without icons or heading, Empty row, search field last', () => {
  const html = renderToStaticMarkup(React.createElement(C.SourceBranchPickerMenu, { branches: ['main', 'feature'], current: 'feature', onSelect: noop }));
  const rows = [...html.matchAll(/<div[^>]*role="menuitemradio"[^>]*>/g)].map((match) => match[0]);
  assert.deepEqual(rows.map((row) => /data-branch="([^"]+)"/.exec(row)[1]), ['main', 'feature']);
  assert.match(rows[1], /aria-checked="true"/);
  assert.doesNotMatch(html, /smenu-icon|smenu-group-label/);
  assert.doesNotMatch(html, /No branches match/);
  assert.ok(html.indexOf('sc-branch-search') > html.indexOf('data-branch="feature"'), 'side top: the field follows the list');
  assert.match(html, /<input[^>]*placeholder="Search branches…" aria-label="Search branches…"/);
  assert.match(renderToStaticMarkup(React.createElement(C.SourceBranchPickerMenu, { branches: [], onSelect: noop })), /<div class="sc-branch-empty">No branches match<\/div>/);
});

test('usage panel: context window section and the detailed-breakdown row; no Usage heading, no menuitem', () => {
  const html = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, {
    usage: { last: { totalTokens: 100 }, modelContextWindow: 128000 }, onSeeDetails: noop }));
  assert.match(html, /<button type="button" class="sc-usage-row sc-usage-context-header" disabled=""><span class="sc-usage-muted">Context window<\/span><span class="sc-usage-muted sc-usage-summary">100 \/ 128k \(0%\)<\/span><\/button>/);
  assert.match(html, /role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"/);
  assert.match(html, /class="sc-usage-separator"/);
  assert.match(html, /<button type="button" class="sc-usage-row sc-usage-link">See detailed breakdown<\/button>/);
  assert.doesNotMatch(html, /menuitem|>Usage</);
  // An open session without a report shows only the breakdown row; the no-session draft reads 'Context 0'.
  const empty = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, onSeeDetails: noop }));
  assert.doesNotMatch(empty, /Context window|sc-usage-separator/); assert.match(empty, /See detailed breakdown/);
  const draft = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, fresh: true }));
  assert.match(draft, /sc-usage-summary">0<\/span>/); assert.match(draft, /aria-valuetext="0"/); assert.doesNotMatch(draft, /See detailed breakdown/);
});

test('effort control: its title names the popover; the section no longer carries data-cds', () => {
  const html = renderToStaticMarkup(React.createElement(C.EffortControl, { levels: ['low', 'high'], value: 'low', onChange: noop }));
  assert.match(html, /<h2 class="sp-title sc-effort-label">Effort<\/h2>/);
  assert.match(html, /<section class="sc-effort-control" aria-label="Effort settings">/);
});

// Purple top tier (c8e04f916 effort.js:59-112/:150-153, c360a9e1c:5257, c2d9b9a76 slider.js:194/:240-247): the accent follows
// the previewed id 'ultra'; the lit overlay sits inside the fill only when the last level is ultra, and data-at-max marks the top stop.
test('effort control: the highest level gets the purple accent, the 4-layer glow label and the lit overlay (user decision 2026-10-18: ultra, max or xhigh alike)', () => {
  const effort = (levels, value, extra = {}) => renderToStaticMarkup(React.createElement(C.EffortControl, { levels, value, onChange: noop, ...extra }));
  const slider = (html) => /<div class="sc-slider"[^>]*>/.exec(html)?.[0] || '';
  const top = effort(['low', 'high', { reasoningEffort: 'ultra', description: 'Maximum reasoning with automatic task delegation' }], 'ultra');
  assert.match(slider(top), / data-at-max=""/);
  assert.match(top, /<div class="sc-slider-fill"><span class="sc-slider-overlay" data-slider-overlay="" aria-hidden="true"><span class="sc-effort-lit-ground" data-on=""/, 'overlay inside the fill');
  assert.match(top, /<span class="sc-effort-value" aria-hidden="true"><span class="sc-effort-swap" data-accent=""/);
  assert.deepEqual([...top.matchAll(/class="sc-effort-glow" data-r="([^"]+)">Ultra</g)].map((match) => match[1]), ['0', '0.5', '1', '2']);
  assert.doesNotMatch(top, /data-animate|data-leaving/, 'no swap animation on first mount');
  assert.match(top, /aria-valuetext="Ultra"/);
  const low = effort(['low', 'high', 'ultra'], 'low');
  assert.match(low, /data-slider-overlay=""/, 'the overlay is mounted for an ultra model at any stop');
  assert.doesNotMatch(slider(low), /data-at-max/); assert.doesNotMatch(low, /data-accent|data-on=""|<canvas/, 'unlit: no accent, ground off, canvas not yet mounted');
  const deepseek = effort([{ reasoningEffort: 'off' }, { reasoningEffort: 'low' }, { reasoningEffort: 'high' }, { reasoningEffort: 'max' }], 'max');
  assert.match(deepseek, /data-slider-overlay=""/, 'DeepSeek max is its highest level: the purple tier');
  assert.match(deepseek, /data-accent=""/);
  assert.match(effort(['low', 'medium', 'high', 'xhigh', 'max'], 'max'), /data-accent=""/, 'gpt-5.6-luna max is its highest level');
  assert.doesNotMatch(effort(['low', 'medium', 'high', 'xhigh', 'max'], 'xhigh'), /data-accent/, 'a lower level has no accent');
  assert.doesNotMatch(effort(['ultra'], 'ultra'), /data-slider-overlay|data-at-max/, 'a single level is unavailable: no overlay');
  assert.doesNotMatch(effort(['low', 'ultra'], 'ultra', { disabled: true }), /data-slider-overlay/, 'disabled: no overlay');
});

test('the legacy code-ui Popover/MenuItem host is gone; menus and popovers use the CDS primitives', () => {
  const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
  const main = read('src/main.jsx'), codeUi = read('src/code-ui.jsx'), style = read('src/style.css');
  assert.doesNotMatch(codeUi, /export function (Popover|MenuItem)\b/);
  assert.doesNotMatch(main, /<Popover\b|<MenuItem\b|\bmenu-heading\b|\bmenu-divider\b/);
  assert.doesNotMatch(style, /\.code-popover|\.code-menu-item|\.menu-heading|\.menu-divider|\.menu-folder-path/);
  assert.doesNotMatch(main, /setWorktree\(true\)/, 'choosing a branch never flips worktree');
  assert.match(main, /local: \{ side: "top", align: "start", label: "Local environment", className: "sc-env-menu" \}/);
  assert.match(main, /branch: \{ side: "top", align: "start", sideOffset: 8, label: "Branch", className: "sc-branch-menu" \}/);
  assert.match(main, /folder: \{ side: "bottom", align: "start", label: "Working directory" \}/);
  assert.match(main, /<SourceMenu\.GroupLabel>\{t\("Working directory"\)\}<\/SourceMenu\.GroupLabel>\s*\{gitRepoMenuItems\(/);
  // R02 (work/fidelity-r3/LOG.md "Identity"): the connection header names the active core.
  assert.match(main, /<SourceMenu\.Header>\{connectionMenuHeader\(engine, !!boot\?\.connected\)\}<\/SourceMenu\.Header>/);
  const composer = read('src/source-composer.jsx');
  assert.match(composer, /<SourcePopover anchor=\{anchor\} side="top" align="end" dataCds="ModelSelectorEffort" className="sc-effort-popover"/);
  assert.match(composer, /<SourcePopover anchor=\{anchor\} side="top" align="end" sideOffset=\{8\} padding="none" className="epitaxy-root sc-usage-popover"/);
  assert.match(composer, /<SourcePopoverTitle className="sp-sr-only">\{t\("Usage"\)\}<\/SourcePopoverTitle>/);
  assert.match(read('src/source-composer.css'), /\.sp-popup\.sc-usage-popover \{ width: 360px; max-width: calc\(100vw - 2rem\); max-height: min\(var\(--available-height\), 640px\);/);
  assert.match(read('electron/main.cjs'), /const title = p\.additional \? i18n\.t\("Add folder to session"\) : i18n\.t\("Select folder for local session"\);/);
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
test('usage panel: a Compact session TextLink row at 50% or more with an onCompact; none at 0% or without one', () => {
  const at60 = { last: { totalTokens: 76800 }, modelContextWindow: 128000 };
  const html = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onSeeDetails: noop, onCompact: noop, compactState: { running: false, connected: true } }));
  // c2d611398 Ne: the hint span always carries hintId; aria-describedby only while a hint exists.
  assert.match(html, /<div class="sc-usage-compact-row"><span class="sc-usage-compact-hint" id="[^"]+"><\/span><button type="button" data-cds="TextLink" class="sc-usage-compact">Compact session<\/button><\/div>/);
  assert.ok(html.indexOf('sc-usage-compact-row') > html.indexOf('sc-usage-bar') && html.indexOf('sc-usage-compact-row') < html.indexOf('sc-usage-separator'), 'after the bar, inside the context section');
  const running = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { running: true, connected: true } }));
  assert.match(running, /<button type="button" data-cds="TextLink" class="sc-usage-compact" disabled="" data-disabled="true">Compact session<\/button>/);
  assert.match(running, /data-cds-disabled-reason="">Available when DeepSeek finishes this turn</);
  const detached = renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { connected: false } }));
  assert.match(detached, /data-cds-disabled-reason="">Available when reconnected</);
  for (const props of [{ usage: { last: { totalTokens: 100 }, modelContextWindow: 128000 }, onCompact: noop }, { usage: at60 }, { usage: at60, onCompact: noop, compactState: { compacting: true } }])
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(C.SourceUsagePanel, props)), /Compact session/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(C.SourceUsagePanel, { usage: undefined, fresh: true, onCompact: noop })), /Compact session/, 'the draft (no pct) has no row');
});

// B03: 'Where Claude runs' is the running core's: ComposerButton's t(tooltip.content) names its assistant.
test("the env pill tooltip names the running core's assistant, in English and zh-CN", async (context) => {
  const i18n = await import('../electron/i18n/index.mjs');
  const previous = i18n.getAssistantName();
  context.after(() => { i18n.setAssistantName(previous); i18n.setLocale(i18n.DEFAULT_LOCALE); });
  i18n.setAssistantName('Codex');
  assert.equal(i18n.t('Where DeepSeek runs'), 'Where Codex runs');
  i18n.setLocale('zh-CN');
  i18n.setAssistantName('Kimi');
  assert.equal(i18n.t('Where DeepSeek runs'), 'Kimi 的运行位置');
  const source = fs.readFileSync(path.join(app, 'src/source-composer.jsx'), 'utf8');
  assert.match(source, /<SourceTooltip \{\.\.\.tooltip\} content=\{t\(tooltip\.content\)\}>/);
});
