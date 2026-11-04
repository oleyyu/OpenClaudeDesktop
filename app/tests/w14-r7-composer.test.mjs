import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// W14-code round 7, composer lane (reports/W14-code/r7-composer.md): r7c-05, css7-usage-compact-button, r7c-04,
// css7-branch-picker-bl, css7-recent-dismiss-handcopy. Source-only checks (E61): official strings, SSR, source text.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (prefix) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((name) => name.startsWith(prefix))), 'utf8');
const h = React.createElement;
const noop = () => {};
let server, C, R;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  R = await server.ssrLoadModule('/src/generated/code-routines/cd2687f9f-BuSCKovQ.mjs');
});
after(() => server?.close());
const composer = (props) => renderToStaticMarkup(h(C.SourceComposer, {
  codeLayout: 'classic', draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
  permission: 'ask', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/fixture/project', showContext: true,
  workspaceInfo: { isRepo: true, branch: 'main', branches: ['main'] }, onAddFolder: noop, setWorktree: noop, ...props }));

test('r7c-05: the effort stand-in box follows its element (resize, capture scroll, ResizeObserver)', () => {
  const source = read('src/source-composer.jsx');
  const body = source.slice(source.indexOf('export function SourceEffortPopover('), source.indexOf('// W14-code r5 css5-usage-popover-handcopy'));
  assert.match(body, /const \[rect, setRect\] = useState\(\(\) => anchor\?\.getBoundingClientRect\?\.\(\) \?\? null\);/);
  assert.match(body, /useLayoutEffect\(\(\) => \{/);
  assert.match(body, /win\.addEventListener\("resize", update\);/);
  assert.match(body, /win\.addEventListener\("scroll", update, true\);/);
  assert.match(body, /new win\.ResizeObserver\(update\)/);
  assert.match(body, /observer\?\.observe\(anchor\);/);
  assert.match(body, /win\.removeEventListener\("resize", update\); win\.removeEventListener\("scroll", update, true\); observer\?\.disconnect\(\);/);
  assert.match(body, /\}, \[anchor\]\);/);
  // Still the fixed, invisible stand-in S's trigger renders against (no anchor: a zero box).
  const html = renderToStaticMarkup(h(C.SourceEffortPopover, { anchor: null, levels: ['low', 'high'], value: 'high', onChange: noop, onClose: noop }));
  assert.match(html, /^<span aria-hidden="true" data-effort-anchor="" style="position:fixed;pointer-events:none;visibility:hidden;left:0;top:0;width:0;height:0"/);
});

test('css7-usage-compact-button: c2d611398 Ve — the py-xs row, CdsDisabledReason around the xs CdsButton', () => {
  const ve = official('c2d611398-');
  for (const feature of ['py-xs flex items-center gap-sm min-h-[20px] text-footnote`', 'size:"xs",onClick:o,disabled:u,"aria-describedby":h,className:"min-w-0 shrink-0"',
    'wrapperClassName:"min-w-0 shrink-0"']) assert.ok(ve.includes(feature), feature);
  assert.ok(official('shared-frame-6jtSkIit').includes('Uu as Eu') && official('shared-frame-6jtSkIit').includes('Zm as Wl'));
  const at60 = { last: { totalTokens: 76800 }, modelContextWindow: 128000 };
  const idle = renderToStaticMarkup(h(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { running: false, connected: true, autoCompact: undefined } }));
  assert.match(idle, /<div class="px-lg py-xs flex items-center gap-sm min-h-\[20px\] text-footnote" data-usage-compact=""><span id="[^"]+" class="flex-1 min-w-0 truncate text-secondary"><\/span><span [^>]*data-cds-disabled-reason-wrapper=""[^>]*class="[^"]* min-w-0 shrink-0"[^>]*><button type="button" data-cds="Button" data-size="xs" class="[^"]* min-w-0 shrink-0">(?:(?!<\/button>).)*<span class="truncate">Compact session<\/span><\/span><\/button><span id="[^"]+" hidden="" data-cds-disabled-reason=""><\/span><\/span><\/div>/);
  const running = renderToStaticMarkup(h(C.SourceUsagePanel, { usage: at60, onCompact: noop, compactState: { running: true, connected: true } }));
  assert.match(running, /<button type="button" disabled="" data-cds="Button" data-size="xs"/);
  assert.match(running, /data-cds-disabled-reason="">Available when DeepSeek finishes this turn</);
  const source = read('src/source-composer.jsx');
  assert.match(source, /useDisabledFocusHandOff\(button, disabled\);/, 'Ve I (ceeeccbd9 t): focus moves to the wrapper while disabled');
  assert.ok(official('ceeeccbd9-').includes('n&&i===e?r?.focus({preventScroll:!0})'));
  assert.doesNotMatch(source, /data-cds="TextLink" className="sc-usage-compact"/);
  assert.doesNotMatch(read('src/source-composer.css'), /sc-usage-compact/);
  assert.doesNotMatch(read('src/style.css'), /sc-usage-compact/);
});

test('r7c-04: /effort alone opens the model menu (Effort submenu) when the effort is in the model menu or has ≤1 level', () => {
  assert.ok(official('c227f4d5e-').includes('let t=e==="effort"&&(p||a<=1)?"model":e'));
  assert.ok(official('c227f4d5e-').includes('S(e==="effort"&&p)'));
  assert.ok(official('cc43287c9-').includes('e.openComposerMenu("effort")'));
  const main = read('src/main.jsx');
  const body = main.slice(main.indexOf('case "effort":\n            // W14-code r7c-04'), main.indexOf('case "permissions":'));
  assert.match(body, /if\(!args\)\{const effortInModelMenu=!scope\(\)\.querySelector\('\.sc-chin \.sc-effort-trigger'\);/);
  assert.match(body, /if\(effortInModelMenu\|\|efforts\.length<=1\)\{const trigger=scope\(\)\.querySelector\('\.sc-composer \.sc-model-trigger, \[data-env-bar-host\] \.sc-model-trigger'\)\|\|scope\(\)\.querySelector\('\.sc-model-trigger'\);/);
  assert.match(body, /if\(trigger&&!trigger\.disabled\)openMenu\("model",trigger,effortInModelMenu\?\{effortOpen:true\}:undefined\);break;\}/);
  // With a chip of its own and more than one level the chip's EffortControl popover stays.
  assert.match(body, /setMenu\(\{kind:"effort",anchor:scope\(\)\.querySelector\('\.sc-chin \.sc-effort-trigger'\),token:\+\+menuToken\.current\}\);break;\}/);
  // The ⌘⇧E path it mirrors.
  assert.ok(main.includes('openMenu(CHIN_MENU_KINDS[kind], trigger, effortOpen ? { effortOpen: true } : undefined);'));
});

// W14-code r8 css8-classic-context-row-dead (E95): the classic context row, and the bL split pill css7-branch-picker-bl put
// in it, is gone — the Code composer is always the presets layout (cc43287c9 Dle draws that row only off presets;
// claudeai_cc_epitaxy_session_presets_main is on for the 3P desktop, E92). The generated bL slice stays.
test('css7-branch-picker-bl → r8: no classic split pill; the generated cd2687f9f we / k slice remains', () => {
  assert.match(read('src/generated/code-routines/index.mjs'), /export \{\s*we as SearchablePillSelect,\s*k as identityItemLabel,\s*\} from "\.\/cd2687f9f-BuSCKovQ\.mjs";/);
  assert.equal(R.k('feature/x'), 'feature/x');
  const html = composer({ branches: ['main', 'feature/x'] });
  assert.ok(!html.includes('group/split') && !html.includes('data-branch-worktree'));
  const source = read('src/source-composer.jsx');
  assert.doesNotMatch(source, /SearchablePillSelect|setWorktree|function SourceBranchPickerMenu|className="sc-(branch|worktree)/);
  const main = read('src/main.jsx');
  assert.doesNotMatch(main, /onSelectBranch=\{\(branch\) => \{ selectBranch\(branch\); \}\}|SourceBranchPickerMenu|sc-branch-menu|case "branch":/);
  assert.doesNotMatch(read('src/source-composer.css'), /sc-branch-|sc-worktree/);
});

test('css7-recent-dismiss-handcopy: the Recent row is group/recent and its X the official utilities over CdsIcon X xs', () => {
  const cc = official('cc43287c9-');
  assert.ok(cc.includes('className:"group/recent"'));
  assert.ok(cc.includes('"relative ms-xs grid size-icon shrink-0 place-items-center text-muted-as-secondary opacity-0 hover:bg-fill-ghost-hover hover:text-primary group-data-[highlighted]/recent:opacity-100 pointer-coarse:opacity-100",children:p(Se,{name:"X",size:"xs"})'));
  const html = renderToStaticMarkup(h(C.SourceRecentFolderMenu, { rows: [{ path: '/b/app', label: 'app', description: '/b', checked: false, dismissible: true }], onSelect: noop, onDismiss: noop, onBrowse: noop }));
  assert.match(html, /role="menuitemradio"[^>]*class="smenu-item group\/recent"/);
  assert.match(html, /<span class="flex w-0"><span data-dismiss-recent="" aria-hidden="true" title="Remove from recent" class="relative ms-xs grid size-icon shrink-0 place-items-center text-muted-as-secondary opacity-0 hover:bg-fill-ghost-hover hover:text-primary group-data-\[highlighted\]\/recent:opacity-100 pointer-coarse:opacity-100"><span data-cds="Icon" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\)[^"]*" aria-hidden="true">[^<]*<\/span><\/span><\/span>/);
  assert.doesNotMatch(read('src/source-composer.css'), /sc-recent-dismiss/);
  assert.doesNotMatch(read('src/source-composer.jsx'), /className="sc-recent-dismiss/);
  // The official CSS carries the highlighted reveal (the row must be the group/recent element that holds data-highlighted).
  const css = official('c6a992d55-');
  assert.ok(css.includes('group-data-\\[highlighted\\]\\/recent\\:opacity-100'));
  assert.ok(read('src/source-menu.jsx').includes('data-highlighted={highlightedNow ? "" : undefined}'));
});
