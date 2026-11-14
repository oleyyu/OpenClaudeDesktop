// W14-code diff lane: the Changes diff on the 3.6556.2 originals — the c49d7f557 @pierre/diffs line / number / selection /
// emphasis formulas over the ca7ba268c CDS FileDiff overrides (ua), the c44d00c7f Xu file header (ma over c82eca2bd Ce,
// style en), the CodeView scroll root (role group "Changes"), the Jd "Diff content unavailable" state, the cccc2cf0a ES
// findings bar, the shared-6 S_ PR row tint and the cccc2cf0a KE Files tree handles. Source / SSR only.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const chunk = (name) => fs.readFileSync(path.join(official.ionSource, name), 'utf8');
const has = (text, features) => { for (const feature of features) assert.ok(text.includes(feature), feature); };

let server, SourceDiff;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceDiff } = await server.ssrLoadModule('/src/source-diff.jsx'));
});
after(async () => { await server?.close(); });

test('official: c49d7f557 line / number / selection mixes and ca7ba268c CDS overrides', () => {
  has(chunk('c49d7f557-BzsUo6sq.js'), [
    '& [data-gutter-buffer], & [data-column-number] {\n      --mix-light: 91%;\n      --mix-dark: 85%;',
    '& [data-line], & [data-no-newline] {\n      --mix-light: 88%;\n      --mix-dark: 80%;',
    '--mix-selection-light: 82%;\n      --mix-selection-dark: 75%;',
    '--mix-selection-light: 75%;\n      --mix-selection-dark: 60%;',
    '--diffs-bg-addition-emphasis: var(--diffs-bg-addition-emphasis-override, light-dark(rgb(from var(--diffs-addition-base) r g b / .15), rgb(from var(--diffs-addition-base) r g b / .2)));',
    'content: "-";',
  ]);
  has(chunk('ca7ba268c-B3JMi1tw.js'), ['"--diffs-addition-color-override":"var(--cds-text-git-added)"', '"--diffs-deletion-color-override":"var(--cds-text-git-removed)"',
    '"--diffs-bg-selection-override":"var(--cds-fill-accent)"', '"--diffs-bg-context-override":"transparent"', 'ya=":host{--diffs-bg:var(--cds-filediff-bg,var(--cds-surface-1))}"']);
  // pierre's row hover needs lineHoverHighlight, off by default and not set by the Changes CodeView.
  assert.match(chunk('c64baa838-cddTLIc9.js'), /let\{lineHoverHighlight:t="disabled"\}=this\.options/);
});

test('host: source-diff.css ports those formulas onto the rows and cells; no srgb git fills or 2.x fallbacks', () => {
  const css = read('src/source-diff.css');
  has(css, ['--diffs-addition-color-override: var(--cds-text-git-added);', '--diffs-bg-selection-override: var(--cds-fill-accent);',
    '--cds-filediff-bg: light-dark(var(--code-theme-light-bg, var(--cds-surface-2)), var(--code-theme-dark-bg, var(--cds-surface-2)));',
    '.sdiff-view .sdiff-row > .sdiff-line-number { --mix-light: 91%; --mix-dark: 85%;', '.sdiff-view .sdiff-row, .sdiff-view .sdiff-raw-code > code { --mix-light: 88%; --mix-dark: 80%;',
    '--diffs-computed-diff-line-bg: light-dark(color-mix(in lab, var(--diffs-bg) var(--mix-light), var(--diffs-diff-line-mix-target)), color-mix(in lab, var(--diffs-bg) var(--mix-dark), var(--diffs-diff-line-mix-target)));',
    '--mix-selection-light: 82%; --mix-selection-dark: 75%;', '--mix-selection-light: 75%; --mix-selection-dark: 60%;']);
  assert.doesNotMatch(css, /--cds-bg-git-(?:added|removed)|#1e9e3c|#cd2054|in srgb, var\(--cds-fill-accent\) 14%/);
  const code = read('src/source-diff-code.css');
  assert.match(code, /\[data-kind=added\] \.source-diff-code \[data-diff-span\] \{ background-color:var\(--diffs-bg-addition-emphasis,/);
  assert.doesNotMatch(code, /#0dbe4e|#ff2e3f/);
  const session = read('src/source-session.css');
  assert.doesNotMatch(session, /^\.source-diff \{|\.source-diff\.diff \.added|source-tree-divider|source-tree-edge|data-tree-resizing/m);
  // W14-code r8 css8-gh-hint-popover-host: source-git-status.css itself is gone (its last .sg-gh-* rules became ii's utility classes).
  assert.equal(fs.existsSync(path.join(app, 'src/source-git-status.css')), false);
});

test('SSR: the Changes header is c44d00c7f Xu; the classic "-" indicator; the scroll root is the "Changes" group', () => {
  has(chunk('c44d00c7f-Cr1FDL2F.js'), ['ma=`${tr} w-full select-none text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus disabled:cursor-default`',
    'className:"group/diff-file @container/diff-file relative"', 'defaultMessage:"Changes",id:"dgqhUM6BxJ"']);
  has(chunk('c82eca2bd-CImI7zNG.js'), ['V="epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md"', 'bg-[linear-gradient(var(--cds-alpha-1),var(--cds-alpha-1))]`} enabled:hover:bg-[linear-gradient(var(--cds-alpha-2),var(--cds-alpha-2))]`']);
  const patch = 'diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1,2 +1,2 @@\n-one\n+two\n same\n';
  const html = renderToStaticMarkup(React.createElement(SourceDiff, { value: patch, placement: 'changes', fileList: { shown: false }, fileActions: { root: '/r', onCopy() {} } }));
  assert.match(html, /<div class="sdiff-header group\/diff-file @container\/diff-file relative" data-diff-file-header="">/);
  assert.ok(html.includes('class="sdiff-file-toggle epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md bg-alpha-1 h-[calc(2rem*var(--cds-rem-scale,1))] bg-[linear-gradient(var(--cds-alpha-1),var(--cds-alpha-1))] enabled:hover:bg-[linear-gradient(var(--cds-alpha-2),var(--cds-alpha-2))] w-full select-none text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus disabled:cursor-default aria-disabled:cursor-default" data-sticky="" style="background-color:light-dark(var(--code-theme-light-bg, var(--cds-surface-2)), var(--code-theme-dark-bg, var(--cds-surface-2)))"'));
  assert.match(html, /<span class="sdiff-marker" aria-hidden="true">-<\/span>/);
  assert.doesNotMatch(html, /−<\/span><code/);
  assert.match(html, /<div class="source-changes outline-none focus-visible:outline-hidden focus-visible:shadow-focus transition-shadow duration-fast" role="group" aria-label="Changes" tabindex="0">/);
  assert.doesNotMatch(html, /aria-label="File changes"/);
  const source = read('src/source-diff.jsx');
  assert.doesNotMatch(source, /Expand unmodified lines|Expand \{count\} unmodified lines|Expand 100 lines/);
});

test('SSR: Jd "Diff content unavailable for {count} files." when the comparison lists files and the patch has none', () => {
  has(chunk('c44d00c7f-Cr1FDL2F.js'), ['"flex h-full items-center justify-center text-body text-muted-as-secondary"',
    'defaultMessage:"Diff content unavailable for {count, plural, one {# file} other {# files}}.",id:"j+pZ+dRA4W"']);
  const render = (props) => renderToStaticMarkup(React.createElement(SourceDiff, { value: '', placement: 'changes', fileList: { shown: false }, emptyPlaceholder: 'EMPTY', ...props }));
  assert.equal(render({ comparisonFiles: [{ filename: 'a.bin' }, { filename: 'b.bin' }] }),
    '<div class="flex h-full items-center justify-center text-body text-muted-as-secondary">Diff content unavailable for 2 files.</div>');
  assert.match(render({ comparisonFiles: [{ filename: 'a.bin' }] }), />Diff content unavailable for 1 file\.</);
  assert.match(render({ comparisonFiles: [] }), /EMPTY/);
});

test('findings bar, PR row tint and the Files tree handles follow cccc2cf0a / shared-6', () => {
  has(chunk('cccc2cf0a-DhZC33Gc.js'), ['TS="rounded-[5px] text-footnote px-[6px]"', 'className:"text-body text-muted-as-secondary whitespace-nowrap tabular-nums"',
    'defaultMessage:"Resize file tree",id:"rYZg4lHVFY"', 'defaultMessage:"Hide file tree",id:"bljYQX0Hqq"']);
  has(chunk('shared-6-sd9jbJqs.js'), ['purple:"bg-git-merged",yellow:"bg-git-queued"']);
  // W14-code r7 css7-git-band-prbarrow: the band row is the generated c96d752d0 EL, whose Rte(Ake[state]) is shared-6 C_
  // (S_ purple bg-git-merged / yellow bg-git-queued); the host .sg-row tint rules are gone.
  assert.equal(fs.existsSync(path.join(app, 'src/source-git-status.css')), false, 'W14-code r8: the whole .sg-* stylesheet is gone');
  assert.ok(read('src/generated/session-rail-changes/branch-row-classes.mjs').includes('purple: "bg-git-merged"'));
  const session = read('src/source-session.jsx');
  has(session, ['<DiffTreeResizeHandle handleProps={treeColumn.handleProps} label={t("Resize file tree")}', 'actionLabel={treeColumn.hidesColumn ? t("Hide file tree") : undefined}',
    '<DiffTreeEdgeHandle handleProps={treeColumn.edgeHandleProps} label={t("Resize file tree")} actionLabel={t("Show file tree")}', '<DiffTreeResizeShield active={treeColumn.resizing} />']);
  assert.doesNotMatch(session, /useSourcePointerResize|source-tree-divider|source-tree-edge|resizeTreeKey/);
});

test('pane-ui-test e2e finds the Files tree handles by the official Ir/Lr markup (E50: assertions only, not run)', () => {
  const e2e = read('scripts/pane-ui-test.mjs');
  assert.doesNotMatch(e2e, /source-tree-edge|source-tree-divider|separator", \{ name: "Show file tree"/);
  // Lr wraps the edge in "relative w-0 shrink-0"; both handles are labelled "Resize file tree"; hm = 8px key step.
  has(read('src/generated/sidebar-resize/diff-tree-resize-handle.mjs'), ['className: "relative w-0 shrink-0"', 'n(it, { ...t, "aria-label": r, className: m, style: h })']);
  has(read('src/generated/sidebar-resize/resize-handle.mjs'), ['var hm = 8;', 'role: "separator"']);
  has(e2e, ['\'.relative.w-0.shrink-0 > [role="separator"][aria-label="Resize file tree"]\'',
    'node.parentElement?.matches(".relative.w-0.shrink-0")', 'near((await treeColumn.boundingBox()).width, 248);']);
  assert.doesNotMatch(e2e, /treeDivider\.dblclick\(\)|drag\(treeDivider, -190, true\)/);
});
