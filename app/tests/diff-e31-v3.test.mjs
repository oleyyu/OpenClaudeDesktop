// w10-ccres-e31-diff (E31 diff browser, panes:C2-7): the Changes pane's Commits section on 3.6556.2 c44d00c7f
// (Bi / Ni / Fi / Ii) and the ⌥F9 / ⇧⌥F9 PR-comment bindings (Jd Qn). Source-only: official chunks are read as text,
// never executed; the host components render through Vite SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official3 from '../scripts/official-3.6556.2.mjs';
import { fileTreeCompactRow, fileTreeRowCurrent, fileTreeRowIdle } from '../src/generated/files-changes/file-tree-row-classes.mjs';
import { commandShortcut } from '../src/generated/session-rail-changes/command-shortcut.mjs';
import { COMMITS_HEADER_ROW, COMMIT_META_CLASS, COMMIT_ROW_ACTIVE, COMMIT_ROW_CLASS, COMMIT_ROW_IDLE, COMMITS_PANEL_CLASS, NATIVE_MENU_TARGETS,
  OLDER_COMMITS_CLASS, SCOPE_ROW_CLASS, preventNativeMenu, suppressNativeMenu } from '../src/diff-commits-model.mjs';
import { PR_COMMENT_KEYBOARD_GATE, prCommentKeyboardEnabled, prCommentShortcutsEnabled, prCommentStep, prCommentStepIndex } from '../src/diff-pr-comment-nav-model.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const official = (name) => fs.readFileSync(path.join(official3.ionSource, name), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DIFF = 'c44d00c7f-Cr1FDL2F.js';

let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  // The facade evaluates every view-tabs module (and their adapters) first, so nothing is still loading at close.
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  C = await server.ssrLoadModule('/src/source-diff-commits.jsx');
  // As tests/source-diff-scope.test.mjs: the session graph (source-session.jsx imports source-diff.jsx) settles every
  // module the commits section's imports reach, so none is still loading when the server closes.
  await server.ssrLoadModule('/src/source-session.jsx');
});
after(async () => { await server?.close(); });

test('official 3.6556.2 Commits section (Bi / Ni / Fi / Ii) and ki / ZG, read as text', () => {
  const text = official(DIFF);
  for (const feature of [
    // Bi: CdsCollapsible Root > header > Trigger; the caret turns by the rotate prop (no rotate-90 class).
    'm=s?0:90', 'name:"CaretRight",size:p,rotate:m,className:"shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none"',
    'className:"rounded hover:bg-fill-ghost-hover",children:o(oe.Trigger,{ref:c,hideCaret:!0,style:zi,className:`${xt} text-secondary-control`,children:[h,g,_]})',
    'n("div",{className:"shrink-0 px-xs py-1.25",onContextMenu:f,children:v})', 'onOpenChange:u,className:"flex min-h-0 flex-col",children:[y,b]',
    'n("span",{className:"min-w-0 flex-1 truncate",children:n(J,{defaultMessage:"Commits",id:"/c0GeY5Wgm"})})',
    'n("span",{className:"shrink-0 text-footnote tabular-nums text-muted",children:r.commits.length})',
    'Li="min-h-0 overflow-y-auto",Ri=`${Li} h-auto transition-none duration-0 data-[starting-style]:h-auto data-[starting-style]:overflow-y-auto data-[ending-style]:h-auto data-[ending-style]:overflow-y-auto data-[animating]:overflow-y-auto`',
    // Ni / Fi rows, Ii hidden label, the toolbar's context menu.
    '"group flex w-full flex-col items-start gap-[2px] rounded px-xs py-[6px] text-start text-body focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"',
    '"scroll-mt-(--cds-pad-md) rounded px-xs py-[6px] text-start text-body focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"',
    'className:"flex w-full items-center gap-1 text-footnote text-muted-as-secondary",children:[w,T,D,O]',
    '"px-xs py-[6px] text-footnote text-muted-as-secondary",C&&"select-none"', 'onFocus:Di,onContextMenu:T,className:D',
    'function ki(e){ke(e,e.currentTarget)&&e.preventDefault()}',
  ]) assert.ok(text.includes(feature), feature);
  // c44d00c7f imports xt / _t / St / ht / Q from c621b1e2d (generated/files-changes/file-tree-row-classes.mjs and
  // generated/code-current/file-tree-style.mjs carry them as fileTreeCompactRow / fileTreeRowCurrent / fileTreeRowIdle).
  assert.match(text, /import\{[^}]*\bc as Q,d as ht,[^}]*\br as xt,s as St[^}]*\}from"\.\/c621b1e2d-CU5cG_mP\.js"/);
  assert.match(text, /import\{[^}]*\bi as _t,[^}]*\}from"\.\/c621b1e2d-CU5cG_mP\.js"/);
  const tree = official('c621b1e2d-CU5cG_mP.js');
  assert.ok(tree.includes(`f=\`flex items-center \${u} h-control app-list-row pe-md rounded text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus\``));
  // shared-1 XG / ZG, the native-menu rule ki applies.
  const shared1 = official('shared-1-BJhqMmkf.js');
  assert.ok(shared1.includes(`XG='${NATIVE_MENU_TARGETS}'`));
  assert.ok(shared1.includes('function ZG(e,t){if(e.defaultPrevented)return!1;let n=e.nativeEvent.composedPath(),r=n.indexOf(t);if(r===-1||n.slice(0,r+1).some(e=>ne(e)?.matches(XG)))return!1;'));
  // The host constants are those strings.
  assert.equal(COMMITS_HEADER_ROW, `${fileTreeCompactRow} text-secondary-control`);
  assert.equal(COMMIT_ROW_ACTIVE, fileTreeRowCurrent);
  assert.equal(COMMIT_ROW_IDLE, fileTreeRowIdle);
  assert.ok(text.includes(`"${COMMIT_ROW_CLASS}"`) && text.includes(`"${SCOPE_ROW_CLASS}"`) && text.includes(`"${COMMIT_META_CLASS}"`) && text.includes(`"${OLDER_COMMITS_CLASS}"`));
  assert.ok(text.includes('Ri=`${Li}' + COMMITS_PANEL_CLASS.slice('min-h-0 overflow-y-auto'.length) + '`'));
});

const sha = (n) => n.toString(16).padStart(40, 'c');
const commit = (n, extra = {}) => ({ sha: sha(n), shortSha: sha(n).slice(0, 7), subject: `Commit ${n}`, authorName: 'Ada', date: 0, ...extra });
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceDiffCommits, { commits: [commit(1), commit(2)], total: 2, onSelect() {}, ...props }));

test('SSR: the collapsible Commits header is CdsCollapsible with the 3.6556.2 Trigger, caret and Panel', () => {
  const html = render({ selectedSha: sha(2), onSelectUncommitted() {}, collapsed: false, onCollapsedChange() {} });
  assert.match(html, /^<div data-open="" data-cds="Collapsible" class="flex min-h-0 flex-col"><div class="shrink-0 px-xs py-1\.25"><div class="rounded hover:bg-fill-ghost-hover"><button type="button"/);
  const trigger = html.match(/<button type="button" data-panel-open=""[^>]*>/)?.[0] ?? '';
  assert.match(trigger, /aria-expanded="true"/);
  assert.match(trigger, /aria-controls="[^"]+"/);
  assert.match(trigger, /style="padding-inline-start:8px"/, 'ht(0)');
  // CdsCollapsible's own Trigger classes merged with `${xt} text-secondary-control` (its text-secondary gives way).
  assert.match(trigger, new RegExp(`class="cds-reset group/clp [^"]*hover:text-primary [^"]*${fileTreeCompactRow.replace(/[()[\]./:+-]/g, '\\$&')} text-secondary-control"`));
  assert.doesNotMatch(trigger, / text-secondary[ "]/);
  assert.match(html, /<span data-cds="Icon" data-cds-mirror="" data-cds-rotate="" style="[^"]*--cds-icon-rotate:90deg" class="shrink-0 text-muted-as-secondary transition-transform duration-fast motion-reduce:transition-none" aria-hidden="true">[^<]*<\/span>/, 'the glyph is a private-use character');
  assert.ok(html.includes('<span class="min-w-0 flex-1 truncate">Commits</span><span class="shrink-0 text-footnote tabular-nums text-muted">2</span></button>'), 'name and count');
  assert.doesNotMatch(html, /rotate-90|sdiff-tree-caret|sdiff-commits-trigger|data-commit-sha/);
  assert.match(html, new RegExp(`<div data-open="" id="[^"]+" style="[^"]*" class="[^"]*${COMMITS_PANEL_CLASS.replace(/[()[\]./:+-]/g, '\\$&')}"><div class="px-xs"><div role="toolbar"`));
  // Rows: text-start, the c621b1e2d fills, the meta line text-muted-as-secondary.
  assert.match(html, /class="sdiff-commit-scope scroll-mt-\(--cds-pad-md\) rounded px-xs py-\[6px\] text-start text-body [^"]*select-none bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-\[pressed\]:bg-fill-ghost-hover">All changes</);
  assert.match(html, /<button type="button" data-commit-row="commit" tabindex="-1" aria-pressed="true" class="sdiff-commit-row group flex w-full flex-col items-start gap-\[2px\] rounded px-xs py-\[6px\] text-start text-body [^"]*bg-fill-control hover:bg-fill-control text-primary">/);
  assert.match(html, /<span class="flex w-full items-center gap-1 text-footnote text-muted-as-secondary"><span class="text-code">ccccccc<\/span>/);
});

test('SSR: collapsed Commits — caret unturned (no rotate attribute), no panel; hidden-commits label class', () => {
  const html = render({ collapsed: true, onCollapsedChange() {} });
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="toolbar"|data-cds-rotate|--cds-icon-rotate/);
  const list = Array.from({ length: 101 }, (_, index) => commit(index + 1));
  const many = renderToStaticMarkup(React.createElement(C.SourceDiffCommits, { commits: list, total: 140, onSelect() {}, collapsed: false, onCollapsedChange() {} }));
  assert.match(many, /<span class="px-xs py-\[6px\] text-footnote text-muted-as-secondary select-none">40 older commits not shown<\/span>/);
});

// Minimal DOM-shaped fakes for ZG.
const node = (selector = null) => ({ nodeType: 1, matches: (list) => selector !== null && list === NATIVE_MENU_TARGETS && selector });
function menuEvent({ path, target, prevented = false, selection = '' }) {
  const doc = { getSelection: () => (selection ? { rangeCount: 1, toString: () => selection, getRangeAt: () => ({ intersectsNode: (n) => n === target }) } : { rangeCount: 0, toString: () => '' }) };
  target.ownerDocument = doc;
  let defaultPrevented = prevented;
  return { get defaultPrevented() { return defaultPrevented; }, preventDefault() { defaultPrevented = true; }, currentTarget: target, nativeEvent: { composedPath: () => path } };
}

test('ki / ZG: the native menu is suppressed unless handled, over a field / link / media / menu, or over a selection', () => {
  const header = node();
  const plain = menuEvent({ path: [node(), header, node()], target: header });
  assert.equal(suppressNativeMenu(plain, header), true);
  preventNativeMenu(plain);
  assert.equal(plain.defaultPrevented, true);
  assert.equal(suppressNativeMenu(menuEvent({ path: [node(), header], target: header, prevented: true }), header), false, 'a row already opened its menu');
  assert.equal(suppressNativeMenu(menuEvent({ path: [node(true), header], target: header }), header), false, 'a link or field on the way');
  assert.equal(suppressNativeMenu(menuEvent({ path: [node()], target: header }), header), false, 'not under the target');
  const selected = menuEvent({ path: [header], target: header, selection: 'abc' });
  preventNativeMenu(selected);
  assert.equal(selected.defaultPrevented, false, 'selected text keeps Copy');
});

test('official ⌥F9 / ⇧⌥F9 PR-comment bindings (shared-46 YL, c44d00c7f Jd Qn, cc8941b7b nt, c4d5c642f), read as text', () => {
  const table = official('shared-46-BIbZBGFq.js');
  assert.ok(table.includes('{command:"nextPrComment",key:"alt+f9",code:"F9",when:"!isLinux"},{command:"prevPrComment",key:"shift+alt+f9",code:"F9",when:"!isLinux"}'));
  assert.ok(table.includes('eR as v'), 'shared-46 v (the event matcher Fn uses) is eR');
  const text = official(DIFF);
  assert.match(text, official3.looseFeature(`Xn=Yn&&!Tn,Zn=Nr(),Qn=e=>({target:()=>Ft.current?.closest('[data-pane-root], [role="dialog"]')??Ft.current,enabled:Zn&&Xn&&kt.open.length>0,onMatch:t=>{!t.isComposing&&t.keyCode!==229&&Lt(e)}});Fn({command:"nextPrComment",...Qn(1)})`));
  assert.ok(text.includes('{command:"prevPrComment",...$n}'));
  assert.ok(text.includes('import{n as Mr,t as Nr}from"./c4d5c642f-D_0CUva6.js"'));
  assert.ok(official('c4d5c642f-D_0CUva6.js').includes(`function n(){return!e("${PR_COMMENT_KEYBOARD_GATE}")}export{t as n,n as t}`));
  assert.ok(official('cc8941b7b-DAgMZRvX.js').includes('function nt({all:e,open:t},n,r,i=!1){let a=n===null?-1:e.indexOf(n);if(a<0)return r>0?0:t.length-1;let o=t.filter(t=>e.indexOf(t)<a).length,s=t[o]===n,c=r>0?o+ +!!s:o-1;return i?(c+t.length)%t.length:Math.min(t.length-1,Math.max(0,c))}'));
  const hook = official('ca6e98a55-Cuuxbadn.js');
  assert.ok(hook.includes('r=e=>{e.preventDefault(),e.repeat||v(e)}'), 'Fn: preventDefault, then nothing on a repeat');
});

test('PR-comment keys: the generated YL table, the desktop app, not on Linux; IME and other modifiers do not step', () => {
  assert.equal(commandShortcut('nextPrComment', true, { mac: true, linux: false }), 'alt+f9');
  assert.equal(commandShortcut('prevPrComment', true, { mac: true, linux: false }), 'shift+alt+f9');
  assert.equal(commandShortcut('nextPrComment', true, { mac: false, linux: true }), undefined);
  const key = (extra) => ({ key: 'F9', code: 'F9', metaKey: false, ctrlKey: false, shiftKey: false, altKey: true, ...extra });
  for (const mac of [true, false]) {
    assert.equal(prCommentStep(key({}), { mac, linux: false }), 1);
    assert.equal(prCommentStep(key({ shiftKey: true }), { mac, linux: false }), -1);
    assert.equal(prCommentStep(key({}), { mac, linux: true }), 0, '!isLinux');
    assert.equal(prCommentStep(key({ altKey: false }), { mac, linux: false }), 0);
    assert.equal(prCommentStep(key({ ctrlKey: true }), { mac, linux: false }), 0);
    assert.equal(prCommentStep(key({ isComposing: true }), { mac, linux: false }), 0);
    assert.equal(prCommentStep(key({ keyCode: 229 }), { mac, linux: false }), 0);
    assert.equal(prCommentStep({ ...key({}), defaultPrevented: true }, { mac, linux: false }), 0);
  }
  // macOS's ⌥F9 reports key "F9" (a named key: matched by code).
  assert.equal(prCommentStep(key({ key: 'Unidentified' }), { mac: true, linux: false }), 1);
});

test('PR-comment step (cc8941b7b nt) and Qn enabled; OpenClaude has none, so the binding is off', () => {
  const stops = { all: ['a', 'b', 'c', 'd'], open: ['a', 'c', 'd'] };
  assert.equal(prCommentStepIndex(stops, null, 1, true), 0);
  assert.equal(prCommentStepIndex(stops, null, -1, true), 2);
  assert.equal(prCommentStepIndex(stops, 'a', 1, true), 1);
  assert.equal(prCommentStepIndex(stops, 'd', 1, true), 0, 'wraps');
  assert.equal(prCommentStepIndex(stops, 'd', 1, false), 2, 'clamps');
  assert.equal(prCommentStepIndex(stops, 'a', -1, true), 2);
  assert.equal(prCommentStepIndex(stops, 'b', 1, true), 1, 'from a resolved comment: the next open one');
  assert.equal(prCommentStepIndex(stops, 'b', -1, true), 0);
  assert.equal(prCommentKeyboardEnabled(() => false), true);
  assert.equal(prCommentKeyboardEnabled((flag) => flag === PR_COMMENT_KEYBOARD_GATE), false);
  assert.equal(prCommentKeyboardEnabled(), true, 'host-growthbook does not list the flag');
  assert.equal(prCommentShortcutsEnabled({ files: 2, open: 1 }), true);
  assert.equal(prCommentShortcutsEnabled({ files: 2, open: 0 }), false);
  assert.equal(prCommentShortcutsEnabled({ files: 0, open: 1 }), false);
  assert.equal(prCommentShortcutsEnabled({ files: 2, open: 1, priming: true }), false);
  assert.equal(prCommentShortcutsEnabled({ files: 2, open: 1, keyboard: false }), false);
  // Mounted in SourceDiff beside the change keys, with no PR comments.
  const diff = source('src/source-diff.jsx');
  assert.match(diff, /usePrCommentShortcuts\(\{ rootRef: root, files: changes \? entries\.length : 0 \}\);/);
  assert.match(diff, /const NO_PR_COMMENTS = Object\.freeze\(\[\]\);/);
  const comments = source('src/source-diff-comments.jsx');
  assert.match(comments, /export function usePrCommentShortcuts\(/);
  assert.match(comments, /view\.closest\('\[data-pane-root\], \[role="dialog"\]'\) \?\? view/);
  // R6: the Commits section reads view-tabs through the facade.
  assert.match(source('src/source-diff-commits.jsx'), /import \{ CdsCollapsible, CdsIcon, isMacUserAgent \} from "\.\/generated\/view-tabs\/index\.js";/);
});

test('official 3.6556.2 Changes file header (aa / la / _a / il, the c219730b0 header moved into c44d00c7f) and the host header', () => {
  const text = official(DIFF);
  const features = [
    'className:"group/diff-file @container/diff-file relative"',
    '"flex items-center justify-center size-[16px] shrink-0 text-muted-as-secondary"',
    'B=!c&&"-rotate-90 [&:where(:root[dir=rtl]_:dir(rtl))]:rotate-90"',
    'n(wt,{fileName:r,size:"xs",className:"shrink-0 text-muted-as-secondary"})',
    'dir:"ltr",className:"flex shrink-0 items-center gap-0.5 text-body tabular-nums"',
    '"absolute inset-y-0 end-0 flex items-center pe-md opacity-0 transition-opacity motion-reduce:transition-none group-hover/diff-file:opacity-100 group-focus-within/diff-file:opacity-100 pointer-coarse:opacity-100"',
    '"pointer-events-none absolute inset-y-0 end-0 flex items-center gap-xs pe-md"',
    'Gi="min-w-0 shrink-[9999] truncate text-body text-muted-as-secondary"',
    '"flex min-w-0 shrink-[9999] items-baseline gap-1 overflow-hidden whitespace-nowrap text-body text-muted-as-secondary"',
  ];
  for (const feature of features) assert.ok(text.includes(feature), feature);
  const host = source('src/source-diff.jsx');
  for (const literal of ['sdiff-header group/diff-file @container/diff-file relative', 'flex items-center justify-center size-[16px] shrink-0 text-muted-as-secondary',
    ' -rotate-90 [&:where(:root[dir=rtl]_:dir(rtl))]:rotate-90', '<FileTypeIcon fileName={file.path || path} size="xs" className="shrink-0 text-muted-as-secondary" />',
    '<span dir="ltr" className="sdiff-counts flex shrink-0 items-center gap-0.5 text-body tabular-nums">',
    'sdiff-open-file absolute inset-y-0 end-0 flex items-center pe-md opacity-0 transition-opacity motion-reduce:transition-none group-hover/diff-file:opacity-100 group-focus-within/diff-file:opacity-100 pointer-coarse:opacity-100',
    'sdiff-view-image pointer-events-none absolute inset-y-0 end-0 flex items-center gap-xs pe-md', "'min-w-0 shrink-[9999] truncate text-body text-muted-as-secondary'",
    'sdiff-renamed flex min-w-0 shrink-[9999] items-baseline gap-1 overflow-hidden whitespace-nowrap text-body text-muted-as-secondary'])
    assert.ok(host.includes(literal), literal);
  assert.doesNotMatch(host, /fileKindIcon|right-0 flex items-center (gap-xs )?pr-md/);
});
