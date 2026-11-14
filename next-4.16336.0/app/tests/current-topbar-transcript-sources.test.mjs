import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { graphemePrefix } from '../src/generated/code-current/grapheme-prefix.mjs';
import { sessionMenuTooltipLabel, sessionMenuTooltipLimit } from '../src/generated/code-current/session-menu-tooltip.mjs';
import { titlebarDraftTitle } from '../src/generated/code-current/titlebar-draft-title.mjs';
import { foldTitlebarToggles } from '../src/generated/code-current/titlebar-toggle-fold.mjs';
import { ownerViewOf, elementOrNull } from '../src/generated/code-current/dom-owner.mjs';
import { titleGroupRect } from '../src/generated/code-current/titlebar-title-rect.mjs';
import { displayText, displayTitle } from '../src/generated/code-current/display-text.mjs';
import { visibleBox } from '../src/generated/code-current/visible-box.mjs';
import { devServerDescription } from '../src/generated/code-current/dev-server-description.mjs';
import { splitPointerDrags, markSplitPointerDrag } from '../src/generated/code-current/split-drag-registry.mjs';
import { contentBox, minSize, walkResolvedFlexes } from '../src/generated/code-current/tile-layout-math.mjs';
import { fitOpenedLayout } from '../src/generated/code-current/tile-fit-opened.mjs';
import { attachTabFocusRelease } from '../src/generated/code-current/tab-focus-release.mjs';

// R2-topbar TT-01 (analysis/code-ui-migrate-20261017/research/topbar-transcript.md §5.1): the titlebar, attachment,
// approval read gate, dev-server port line, split drag registry, fitOpenedLayout and transcript focus helpers.
// W2 w2-titlebar-current moved the titlebar, split, tile and focus targets to Claude Desktop 3.6556.2
// (analysis/claude-3.6556.2-migrate-20261025/research/titlebar-frame.md §1.1/§3.2); attachment, approval, dev-server,
// cc-rest-transcript (W9) moved display-text, attachment-file-name, visible-box, approval-read-gate, dev-server-description
// and tab-focus-release (with the new tab-focus-tracker) to 3.6556.2 too (research/code-current-rest.md §2/§3 P0). These
// assertions pin the official behaviour the hosts consume.
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const GENERATED = path.join(ROOT, 'src/generated/code-current');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const current = name => fs.readFileSync(path.join(V3, name), 'utf8');
const generated = name => fs.readFileSync(path.join(GENERATED, name), 'utf8');
const manifest = JSON.parse(generated('manifest.json'));
const entry = target => manifest.modules.find(module => module.target === target);

// padded-top (3.6556.2) reads view-tabs isFizzyLakePartEnabled, so it and transcript-focus-landing load through Vite; the
// attachment name and the approval read gate import the React Compiler helpers from view-tabs shared-frame (E42).
let server, attachment, fold, paddedTop, landTranscriptFocus, landedFocusEvents, tabFocusFollows, createReadTracker, readLineVisible, ApprovalReadRows;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  attachment = await server.ssrLoadModule('/src/generated/code-current/attachment-file-name.mjs');
  fold = await server.ssrLoadModule('/src/generated/code-current/titlebar-fold-measure.mjs');
  ({ paddedTop } = await server.ssrLoadModule('/src/generated/code-current/padded-top.mjs'));
  ({ landTranscriptFocus, landedFocusEvents } = await server.ssrLoadModule('/src/generated/code-current/transcript-focus-landing.mjs'));
  ({ tabFocusFollows } = await server.ssrLoadModule('/src/generated/code-current/transcript-tab-focus.mjs'));
  ({ createReadTracker, readLineVisible, ApprovalReadRows } = await server.ssrLoadModule('/src/generated/code-current/approval-read-gate.mjs'));
});
after(() => server?.close());

test('manifest: every TT-01 target comes from its named official chunk and carries the official signatures', () => {
  const v3 = {
    'grapheme-prefix.mjs': ['shared-2-TF8v67kg.js', 'granularity:"grapheme"'],
    'session-menu-tooltip.mjs': ['cc43287c9-Me-M2ucD.js', 'Xe=Ze.length<=JW||yd(Ze,JW)===Ze?Ze:`${yd(Ze,79).trimEnd()}\\u2026`'],
    'titlebar-draft-title.mjs': ['cc43287c9-Me-M2ucD.js', '!t&&!o&&_?p("h1",{"data-pane-title":"",className:"draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary",children:_}):null'],
    'titlebar-toggle-fold.mjs': ['c73f45bc3-B7hbL7H9.js', 'folded:e.filter(e=>i.has(e))'],
    'dom-owner.mjs': ['shared-frame-6jtSkIit.js', 'function aa(e){return e?.ownerDocument.defaultView??globalThis.window}'],
    'titlebar-title-rect.mjs': ['shared-18-D3y8YMFN.js', '.cc-lined-title-group'],
    'titlebar-fold-measure.mjs': ['cd54a5401-wFztHb-d.js', 'code.titlebar_overflow_measure_bounded'],
    'split-drag-registry.mjs': ['shared-23-BZ6ZY5fu.js', 'FO=new WeakMap'],
    'tile-layout-math.mjs': ['cf53e1812-CX9VqRuk.js', 'e.borderPx??1'],
    'tile-layout-flex.mjs': ['c9543da06-BaufrsQl.js', 'overflowMinReachable'],
    'tile-fit-opened.mjs': ['cc43287c9-Me-M2ucD.js', 'withRoomForChat: walkResolvedFlexes gave no box for a child of a sized stack'],
    'padded-top.mjs': ['shared-15-BvlV43cI.js', 'getBoundingClientRect().top+Xs(e)'],
    'transcript-focus-landing.mjs': ['c96d752d0-CWv_7-n9.js', 'tabPresses:r=null'],
    'transcript-tab-focus.mjs': ['c99ca27a0-DVQoBCK_.js', 'Node.DOCUMENT_POSITION_FOLLOWING'],
    'display-text.mjs': ['shared-frame-6jtSkIit.js', '\\p{Default_Ignorable_Code_Point}'],
    'attachment-file-name.mjs': ['shared-2-TF8v67kg.js', 'flex min-w-0 flex-col [&:where(:root[dir=rtl]_:dir(rtl))]:text-right'],
    'visible-box.mjs': ['shared-156-BLTosN8U.js', 'scrollPaddingBottom'],
    'approval-read-gate.mjs': ['cc32965c2-BQu1bA_w.js', '{onReadState:r,onFits:i,headIsFirstLine:a,children:o}=e'],
    'dev-server-description.mjs': ['cc32965c2-BQu1bA_w.js', 'Runs in {cwd} on port {port} (or the next free port)'],
    'tab-focus-tracker.mjs': ['c99ca27a0-DVQoBCK_.js', 'isTabFocus:e=>'],
    'tab-focus-release.mjs': ['c9f414608-BplIKcn2.js', '!f.isTabFocus(t)'],
  };
  const legacy = {};
  for (const [version, table, read, snapshot] of [['3.6556.2', v3, current, /snapshots\/claude-3\.6556\.2-20261025-192807/], ['2.42304.0', legacy, official, /installed-2\.42304\.0-20261017/]]) {
    for (const [target, [file, signature]] of Object.entries(table)) {
      const module = entry(target);
      assert.ok(module, `${target} is in the manifest`);
      assert.equal(module.referenceVersion, version, target);
      assert.equal(path.basename(module.source), file, target);
      assert.match(module.source, snapshot, target);
      assert.ok(read(file).includes(signature), `${file} still carries ${signature}`);
      assert.ok(generated(target).startsWith(`// Original Claude Desktop ${version} bindings`), target);
    }
  }
  // The compiled conditionals are selected whole (code-current selections, w1-infra).
  assert.deepEqual(entry('session-menu-tooltip.mjs').sourceSelections.map(s => [s.binding, s.conditional, s.whole]), [['YW', 'Ze.length <= JW || yd(Ze, JW) === Ze', true]]);
  assert.deepEqual(entry('titlebar-draft-title.mjs').sourceSelections.map(s => [s.binding, s.conditional, s.whole]), [['oG', '!t && !o && _', true]]);
  // Host boundaries are only official helpers or documented constants; no hand-written look-alikes.
  assert.match(generated('tab-focus-release.mjs'), /import \{ ownerWindow as e \} from "\.\/owner-window\.mjs";/);
  assert.match(generated('tab-focus-release.mjs'), /import \{ trackTabFocus as t \} from "\.\/tab-focus-tracker\.mjs";/);
  assert.match(generated('owner-window.mjs'), /import \{ ownerWindow as pf \} from "\.\.\/view-tabs\/shared-25-DOWZRSlq\.js";/);
  assert.match(generated('visible-box.mjs'), /import \{ ownerWindow as Xt \} from "\.\/owner-window\.mjs";/);
  assert.match(generated('approval-read-gate.mjs'), /import \{ ownerWindow as oe \} from "\.\/owner-window\.mjs";\nimport \{ visibleBox as dn \} from "\.\/visible-box\.mjs";\n\/\/ c2d1aeb56 f reads the approval presentation context \(default "dock"\); OpenClaude only renders inline cards\.\nconst oo = \(\) => "card";/);
  assert.match(generated('attachment-file-name.mjs'), /import \{\s*afterFontsReady as fe,\s*textDirectionOf as Re,?\s*\} from "\.\.\/code-composer\/chat-composer-frame\.mjs";/);
  assert.match(generated('titlebar-fold-measure.mjs'), /import \{ isFizzyLakePartEnabled as ie \} from "\.\.\/view-tabs\/shared-4-DUB1Oi0O\.js";/);
  assert.match(generated('padded-top.mjs'), /import \{ isFizzyLakePartEnabled as dt \} from "\.\.\/view-tabs\/shared-4-DUB1Oi0O\.js";/);
  assert.match(generated('transcript-focus-landing.mjs'), /import \{ tabFocusFollows as due \} from "\.\/transcript-tab-focus\.mjs";/);
  assert.match(generated('tile-layout-math.mjs'), /export \{\s*minSize,\s*distributeFlex,\s*walkResolvedFlexes,?\s*\} from "\.\/tile-layout-flex\.mjs";/);
  assert.match(generated('attachment-file-name.mjs'), /import \{\s*cdsClassNames as B,\s*useCdsIsoLayoutEffect as _e,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(generated('attachment-file-name.mjs'), /import \{ clsx as c \} from "\.\.\/view-tabs\/vendor-frame-CnSY1sxv\.js";/);
  // Generated code never reaches view-tabs through the facade (R6/E41).
  for (const target of ['owner-window.mjs', 'attachment-file-name.mjs', 'approval-read-gate.mjs']) assert.doesNotMatch(generated(target), /view-tabs\/index\.js/, target);
  const viewTabs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const publicNames = viewTabs.publicNames;
  assert.deepEqual([publicNames.isFizzyLakePartEnabled.file, publicNames.isFizzyLakePartEnabled.local], ['shared-4-DUB1Oi0O.js', 'lp']);
  // The chunk imports these slices keep stand for the view-tabs public names they are imported as (same file, same local).
  for (const [name, file, local] of [['cdsClassNames', 'shared-frame-6jtSkIit.js', 'Q'], ['useCdsIsoLayoutEffect', 'shared-frame-6jtSkIit.js', 'Ln'], ['clsx', 'vendor-frame-CnSY1sxv.js', 've'], ['ownerWindow', 'shared-25-DOWZRSlq.js', 'pf']])
    assert.deepEqual([publicNames[name].file, publicNames[name].local], [file, local], name);
});

test('graphemePrefix keeps whole grapheme clusters', () => {
  const family = '\u{1F469}\u200D\u{1F469}\u200D\u{1F467}';
  assert.equal(graphemePrefix(`${family}abc`, 2), `${family}a`);
  assert.equal(graphemePrefix('e\u0301te\u0301', 2), 'e\u0301t');
  assert.equal(graphemePrefix('short', 10), 'short');
});

test('sessionMenuTooltipLabel keeps 80 graphemes and truncates longer titles to 79 plus an ellipsis', () => {
  assert.equal(sessionMenuTooltipLimit, 80);
  const eighty = 'a'.repeat(80);
  assert.equal(sessionMenuTooltipLabel(eighty), eighty);
  assert.equal(sessionMenuTooltipLabel('b'.repeat(81)), `${'b'.repeat(79)}\u2026`);
  // trimEnd runs on the 79-grapheme prefix before the ellipsis.
  assert.equal(sessionMenuTooltipLabel(`${'c'.repeat(77)}  ${'d'.repeat(10)}`), `${'c'.repeat(77)}\u2026`);
  // Counting is by grapheme, so 80 multi-code-unit emoji stay whole.
  const flags = '\u{1F1EF}\u{1F1F5}'.repeat(80);
  assert.equal(sessionMenuTooltipLabel(flags), flags);
  assert.equal(sessionMenuTooltipLabel('\u{1F1EF}\u{1F1F5}'.repeat(81)), `${'\u{1F1EF}\u{1F1F5}'.repeat(79)}\u2026`);
});

test('titlebarDraftTitle renders the official draft h1 only without a session or spawn', () => {
  assert.equal(renderToStaticMarkup(titlebarDraftTitle(null, undefined, 'New session')),
    '<h1 data-pane-title="" class="draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary">New session</h1>');
  assert.equal(titlebarDraftTitle({ id: 's' }, undefined, 'New session'), null);
  assert.equal(titlebarDraftTitle(null, { id: 'spawn' }, 'New session'), null);
  assert.equal(titlebarDraftTitle(null, undefined, null), null);
});

test('foldTitlebarToggles folds inactive toggles first and keeps the original order in both lists', () => {
  const specs = ['terminal', 'changes', 'preview', 'files'].map((id, index) => ({ id, active: index === 0 || index === 2 }));
  const ids = list => list.map(spec => spec.id);
  const none = foldTitlebarToggles(specs, 0);
  assert.deepEqual([ids(none.folded), ids(none.inline)], [[], ['terminal', 'changes', 'preview', 'files']]);
  assert.notEqual(none.inline, specs);
  const two = foldTitlebarToggles(specs, 2);
  assert.deepEqual([ids(two.folded), ids(two.inline)], [['changes', 'files'], ['terminal', 'preview']]);
  const three = foldTitlebarToggles(specs, 3.9);
  assert.deepEqual([ids(three.folded), ids(three.inline)], [['terminal', 'changes', 'files'], ['preview']]);
  assert.deepEqual(ids(foldTitlebarToggles(specs, 99).folded), ['terminal', 'changes', 'preview', 'files']);
  assert.deepEqual(ids(foldTitlebarToggles(specs, Number.NaN).inline), ['terminal', 'changes', 'preview', 'files']);
  assert.deepEqual(ids(foldTitlebarToggles(specs, -2).inline), ['terminal', 'changes', 'preview', 'files']);
});

test('titlebar fold measure loads with its official limits and share-slot attribute', () => {
  assert.equal(typeof fold.useTitlebarFold, 'function');
  assert.equal(fold.titlebarShareSlotAttribute, 'data-titlebar-share-slot');
  assert.deepEqual(fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: 0 }), { maxHidden: 6, railToggleFolded: false, hiddenMainPanes: 0 });
  assert.deepEqual(fold.titlebarFoldLimits({ railToggleFoldable: true, hiddenCount: 3 }), { maxHidden: 7, railToggleFolded: true, hiddenMainPanes: 2 });
  assert.deepEqual(fold.titlebarFoldLimits({ railToggleFoldable: false, hiddenCount: 3 }), { maxHidden: 6, railToggleFolded: false, hiddenMainPanes: 3 });
  // Before any measurement the hook reports nothing hidden and the pills uncompacted.
  let state;
  function Probe() {
    state = fold.useTitlebarFold({ rootRef: { current: null }, togglesRef: { current: null }, title: 'T', interactive: true });
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(state.hiddenCount, 0);
  assert.equal(state.pillsCompact, false);
  assert.equal(typeof state.titleRef, 'function');
});

test('dom owner helpers and the lined title rect follow the official fallbacks', () => {
  const view = {}, element = { nodeType: 1, ownerDocument: { defaultView: view } };
  assert.equal(ownerViewOf(element), view);
  assert.equal(ownerViewOf(undefined), globalThis.window);
  assert.equal(elementOrNull(element), element);
  assert.equal(elementOrNull({ nodeType: 3 }), null);
  assert.equal(elementOrNull(null), null);
  const groupRect = { left: 1 }, ownRect = { left: 2 };
  assert.equal(titleGroupRect({ closest: () => ({ getBoundingClientRect: () => groupRect }), getBoundingClientRect: () => ownRect }), groupRect);
  assert.equal(titleGroupRect({ closest: () => null, getBoundingClientRect: () => ownRect }), ownRect);
});

test('attachmentNameSplit returns null for names that fit and keeps the extension in a 12-grapheme tail', () => {
  const { attachmentNameSplit } = attachment;
  assert.equal(attachmentNameSplit('twelve__.txt', 4, true), null);
  assert.equal(attachmentNameSplit('x'.repeat(52), 4, false), null);
  assert.notEqual(attachmentNameSplit('x'.repeat(13), 4, true), null, 'overflow forces a split above 12 graphemes');
  const name = `${'x'.repeat(75)}.tsx`;
  const split = attachmentNameSplit(name, 4, false);
  assert.deepEqual(split, { head: 'x'.repeat(67), tailStem: 'x'.repeat(8), tailExt: '.tsx' });
  assert.equal(split.head + split.tailStem + split.tailExt, name);
  const noExt = attachmentNameSplit('y'.repeat(60), 4, false);
  assert.deepEqual(noExt, { head: 'y'.repeat(48), tailStem: 'y'.repeat(12), tailExt: '' });
  // The extension longer than the tail is not split off; graphemes are never torn.
  assert.equal(attachmentNameSplit(`a.${'b'.repeat(70)}`, 4, false).tailExt, '');
  const family = '\u{1F469}\u200D\u{1F469}\u200D\u{1F467}';
  assert.equal(attachmentNameSplit(family.repeat(60), 4, false).tailStem, family.repeat(12));
});

// 3.6556.2 shared-2 Km: the two-row layout right-aligns under an RTL document, the head sits in a clamped span around its
// own <bdi>, and an LTR name keeps its tail LTR and end-aligned there (vm); a right-to-left name gets no such classes.
test('AttachmentFileName renders the official clamp or head/tail markup', () => {
  const { AttachmentFileName } = attachment;
  const short = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: 'notes.md', lines: 4 }));
  assert.equal(short, '<span aria-hidden="true" title="notes.md" class="text-footnote font-normal text-primary line-clamp-4 break-words [overflow-wrap:anywhere]"><bdi>notes.md</bdi></span>');
  const long = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: `${'x'.repeat(75)}.tsx`, lines: 4 }));
  assert.match(long, /^<span aria-hidden="true" title="x{75}\.tsx" class="text-footnote font-normal text-primary flex min-w-0 flex-col \[&amp;:where\(:root\[dir=rtl\]_:dir\(rtl\)\)\]:text-right">/);
  assert.match(long, /<span class="max-h-\[3lh\] overflow-hidden break-words \[overflow-wrap:anywhere\]"><bdi>x{67}<\/bdi><\/span>/);
  const ltrTail = '\\[&amp;:where\\(:root\\[dir=rtl\\]_:dir\\(rtl\\)\\)\\]:\\[direction:ltr\\] \\[&amp;:where\\(:root\\[dir=rtl\\]_:dir\\(rtl\\)\\)\\]:justify-end';
  assert.match(long, new RegExp(`<span class="flex min-w-0 before:shrink-0 before:content-\\[&#x27;\u2026&#x27;\\] ${ltrTail}"><bdi class="truncate py-\\[0\\.125em\\] -my-\\[0\\.125em\\]">x{8}<\\/bdi><span class="shrink-0">\\.tsx<\\/span><\\/span><\\/span>$`));
  const rtl = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: `${'\u05D0'.repeat(75)}.tsx`, lines: 4 }));
  assert.match(rtl, /<span class="flex min-w-0 before:shrink-0 before:content-\[&#x27;\u2026&#x27;\]"><bdi class="truncate/, 'a right-to-left name keeps its own tail direction');
  // Control characters are removed from the shown name (shared-frame fn) before splitting.
  const control = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: 'a\u0007b\u200Bc.txt', lines: 2 }));
  assert.match(control, /class="text-footnote font-normal text-primary line-clamp-2 break-words \[overflow-wrap:anywhere\]"><bdi>abc\.txt<\/bdi>/);
});

test('displayText strips invisible controls and displayTitle refuses bidi or broken surrogate titles', () => {
  assert.equal(displayText('a\u0000b\u200Bc\u2028d'), 'abcd');
  assert.equal(displayTitle('plain.txt'), 'plain.txt');
  assert.equal(displayTitle('\u05D0.txt'), undefined);
  assert.equal(displayTitle('bad\uD800'), undefined);
  assert.equal(displayTitle('\u200B'), undefined);
});

test('devServerDescription covers the cwd/port branches and the reassign suffix', () => {
  const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)\}/g, (_, key) => values[key]) };
  assert.equal(devServerDescription(intl, '~/app', 5173), 'Runs in ~/app on port 5173');
  assert.equal(devServerDescription(intl, '~/app', 5173, true), 'Runs in ~/app on port 5173 (or the next free port)');
  assert.equal(devServerDescription(intl, '~/app', undefined, true), 'Runs in ~/app');
  assert.equal(devServerDescription(intl, undefined, 3000), 'Runs on port 3000');
  assert.equal(devServerDescription(intl, undefined, 3000, true), 'Runs on port 3000 (or the next free port)');
  assert.equal(devServerDescription(intl, undefined, undefined), undefined);
  assert.equal(devServerDescription(intl, '', 0), 'Runs on port 0', 'port 0 is still a port; an empty cwd is not a folder');
});

test('markSplitPointerDrag counts pointer drags per host', () => {
  const host = {}, a = {}, b = {};
  markSplitPointerDrag(host, a, true);
  markSplitPointerDrag(host, b, true);
  markSplitPointerDrag(host, a, true);
  assert.equal(splitPointerDrags.get(host).size, 2);
  markSplitPointerDrag(host, a, false);
  assert.equal(splitPointerDrags.get(host).size, 1);
  markSplitPointerDrag(host, b, false);
  assert.equal(splitPointerDrags.get(host).size, 0);
  markSplitPointerDrag(null, a, true);
  assert.equal(splitPointerDrags.get(null), undefined);
});

test('fitOpenedLayout widens rows so overflowMin tiles fit, recursing unless rootRowOnly', () => {
  const config = { padding: 0, gap: 8, minTileBasePx: 100, borderPx: 0 };
  assert.deepEqual(contentBox({ padding: 4 }, { width: 100, height: 50 }), { width: 90, height: 40 }, 'borderPx defaults to 1');
  const tiles = { files: { overflowMin: { width: 600 } } };
  const tileById = id => tiles[id];
  const tile = (tileId, flex = 1) => ({ kind: 'tile', tileId, flex });
  const nested = { kind: 'stack', id: 'nested', direction: 'row', flex: 1, children: [tile('a'), tile('files')] };
  const layout = { root: { kind: 'stack', id: 'root', direction: 'row', children: [tile('chat'), nested] } };
  assert.equal(minSize(nested, 'row', tileById, config), 708);
  assert.equal(minSize(nested, 'row', tileById, config, { overflowMinReachable: true }), 208);
  const widths = result => {
    const out = {};
    walkResolvedFlexes(result.root, { width: 1000, height: 0 }, tileById, config, (_parent, child, _index, _flex, box) => {
      out[child.tileId ?? child.id] = box.width;
    });
    return out;
  };
  assert.ok(widths(layout).files < 600, 'the even split leaves the files tile below its overflow minimum');
  const fitted = fitOpenedLayout({ layout, containerWidth: 1000, splitConfig: config, tileById, rootRowOnly: false });
  assert.notEqual(fitted, layout);
  assert.ok(widths(fitted).nested >= 708, `nested stack gets its full minimum (${widths(fitted).nested})`);
  assert.ok(widths(fitted).files >= 599, `files tile reaches overflowMin (${widths(fitted).files})`);
  assert.notEqual(fitted.root.children[1].children, nested.children, 'the nested row is refitted');
  const rootOnly = fitOpenedLayout({ layout, containerWidth: 1000, splitConfig: config, tileById, rootRowOnly: true });
  assert.ok(widths(rootOnly).nested >= 708);
  assert.equal(rootOnly.root.children[1].children, nested.children, 'rootRowOnly leaves nested stacks untouched');
  assert.ok(widths(rootOnly).files < 599);
  // Already-fitting layouts and non-row roots come back unchanged.
  const roomy = { root: { kind: 'stack', id: 'root', direction: 'row', children: [tile('chat'), tile('a')] } };
  assert.equal(fitOpenedLayout({ layout: roomy, containerWidth: 1000, splitConfig: config, tileById, rootRowOnly: false }), roomy);
  const column = { root: { ...layout.root, direction: 'column' } };
  assert.equal(fitOpenedLayout({ layout: column, containerWidth: 1000, splitConfig: config, tileById, rootRowOnly: false }), column);
});

function frames() {
  const queue = [];
  return {
    view: {
      requestAnimationFrame: callback => queue.push(callback),
      cancelAnimationFrame: id => { queue[id - 1] = null; },
    },
    flush() { const pending = queue.splice(0); pending.forEach(callback => callback?.()); },
    get size() { return queue.filter(Boolean).length; },
  };
}

test('createReadTracker confirms a line only after it stays visible across two frames without layout change', () => {
  const element = { clientWidth: 300, scrollHeight: 100, clientHeight: 100 };
  const raf = frames();
  let tracker, rechecks = 0, visible = true;
  const recheck = () => { rechecks++; tracker.pass(); tracker.seen('head', () => visible); };
  tracker = createReadTracker(element, raf.view, recheck);
  tracker.pass();
  assert.equal(tracker.seen('head', () => false), false, 'an invisible line is not seen');
  assert.equal(tracker.waiting(), false);
  assert.equal(tracker.seen('head', () => visible), true);
  assert.equal(tracker.waiting(), true, 'seen once is still waiting for the settle frames');
  raf.flush();
  assert.equal(rechecks, 0);
  raf.flush();
  assert.equal(rechecks, 1);
  assert.equal(tracker.waiting(), false);
  visible = false;
  assert.equal(tracker.seen('head', () => visible), true, 'a confirmed line stays read');
  tracker.forget();
  assert.equal(tracker.seen('head', () => visible), false, 'forget clears confirmed lines');
});

test('createReadTracker restarts the settle wait when the rows resize', () => {
  const element = { clientWidth: 300, scrollHeight: 100, clientHeight: 100 };
  const raf = frames();
  let tracker, rechecks = 0;
  tracker = createReadTracker(element, raf.view, () => { rechecks++; tracker.pass(); tracker.seen('end', () => true); });
  tracker.pass();
  tracker.seen('end', () => true);
  raf.flush();
  element.scrollHeight = 180;
  raf.flush();
  assert.equal(rechecks, 1);
  assert.equal(tracker.waiting(), true, 'a layout shift does not confirm the line');
  raf.flush();
  raf.flush();
  assert.equal(rechecks, 2);
  assert.equal(tracker.waiting(), false, 'stable after the resize, the line is confirmed');
});

test('readLineVisible and visibleBox clip to scrolling ancestors and skip scroll padding inside the card', () => {
  const body = {};
  const style = new Map();
  const view = { innerHeight: 800, getComputedStyle: node => style.get(node) };
  const document = { defaultView: view, body };
  const scroller = { parentElement: body, getBoundingClientRect: () => ({ top: 0, bottom: 300, left: 0, right: 500 }) };
  style.set(scroller, { overflowY: 'auto', overflowX: 'visible', scrollPaddingTop: '110px', scrollPaddingBottom: '0px' });
  let root = null;
  const rows = { ownerDocument: document, parentElement: scroller, closest: () => root,
    getBoundingClientRect: () => ({ top: 100, bottom: 400, left: 10, right: 400, width: 390, height: 300 }) };
  assert.equal(readLineVisible(rows, view, 20, 'first'), false, 'the scroller scroll-padding hides the first line');
  assert.equal(readLineVisible(rows, view, 20, 'last'), false, 'the last line is clipped by the scroller');
  root = { contains: node => node === scroller };
  assert.equal(readLineVisible(rows, view, 20, 'first'), true, 'inside the approval card the padding is ignored');
  assert.deepEqual(visibleBox(rows, { box: { top: 100, bottom: 400, left: 10, right: 400, width: 390, height: 300 } }),
    { top: 110, bottom: 300, left: 10, right: 400 });
  assert.equal(readLineVisible({ ...rows, getBoundingClientRect: () => ({ height: 0 }) }, view, 20, 'first'), true, 'unlaid rows count as read');
  assert.equal(renderToStaticMarkup(React.createElement(ApprovalReadRows, { onReadState() {}, children: 'rows' })), '<div data-testid="approval-read-rows">rows</div>');
});

test('landTranscriptFocus moves keyboard focus entering a pinned transcript to a visible article', () => {
  const rect = (top, height = 40) => ({ top, bottom: top + height });
  const node = (top, extra = {}) => {
    const item = { nodeType: 1, tabIndex: 0, getAttribute: () => null, matches: () => false, checkVisibility: () => true,
      getBoundingClientRect: () => rect(top), focus(options) { item.focused = options; }, ...extra };
    return item;
  };
  const target = node(100), article = node(700), outside = node(0);
  const inside = new Set([target, article]);
  const scroller = { nodeType: 1, scrollHeight: 2000, clientHeight: 500, scrollTop: 1000, contains: el => el === scroller || inside.has(el),
    getBoundingClientRect: () => ({ top: 0, bottom: 500 }), querySelectorAll: selector => selector === '[role="article"]' ? [article] : [target, article] };
  assert.equal(paddedTop(scroller), 0);
  let tail = 0, pinned = true;
  const options = (overrides = {}) => ({ scroller, pointerDownAt: -Infinity, isPinned: () => pinned, scrollToTail: () => { tail++; }, setPinned: value => { pinned = value; }, ...overrides });
  const event = (relatedTarget = outside) => { const e = { target, relatedTarget, stopped: 0, stopPropagation() { e.stopped++; } }; return e; };
  const entering = event();
  assert.equal(landTranscriptFocus(entering, options()), true);
  assert.equal(tail, 1);
  assert.deepEqual(article.focused, { preventScroll: true });
  assert.equal(entering.stopped, 1);
  assert.ok(landedFocusEvents.has(entering));
  assert.equal(landTranscriptFocus(event(article), options()), false, 'focus moving within the transcript is left alone');
  assert.equal(landTranscriptFocus(event(), options({ pointerDownAt: performance.now() })), false, 'pointer focus is left alone');
  pinned = false;
  assert.equal(landTranscriptFocus(event(), options()), false, 'only a following transcript lands focus');
  pinned = true;
  const empty = { ...scroller, querySelectorAll: () => [] };
  assert.equal(landTranscriptFocus(event(), options({ scroller: empty })), false);
  assert.equal(pinned, false, 'with nothing visible to land on, following is released');
});

test('tab-focus-release now resolves its window through the official ownerWindow', () => {
  const document = new EventTarget(), view = new EventTarget();
  document.defaultView = view;
  view.AbortController = AbortController;
  const viewport = new EventTarget();
  viewport.ownerDocument = document;
  const dispose = attachTabFocusRelease(viewport, { isPinned: () => true, setPinned() {} });
  assert.equal(typeof dispose, 'function');
  dispose();
});

// 3.6556.2 c96d752d0 f6: an optional tabPresses watcher. A focus that is not the Tab press's own landing (isTabFocus
// false) never moves focus itself: it releases following unless c99ca27a0 t (tabFocusFollows) finds the target at or
// after the last article, visible. Without the watcher (the host today) the 2.42304.0 path above is unchanged.
test('landTranscriptFocus with a tabPresses watcher only releases following for non-Tab focus', () => {
  const savedNode = globalThis.Node;
  globalThis.Node = { DOCUMENT_POSITION_FOLLOWING: 4 };
  try {
  const rect = (top, height = 40) => ({ top, bottom: top + height });
  const node = (top, extra = {}) => ({ nodeType: 1, tabIndex: 0, getAttribute: () => null, matches: () => false, checkVisibility: () => true,
    getBoundingClientRect: () => rect(top), focus() { throw Error('no focus move'); }, ...extra });
  const article = node(100), target = node(300), outside = node(0);
  const inside = new Set([article, target]);
  const scroller = { nodeType: 1, scrollHeight: 2000, clientHeight: 500, scrollTop: 1500, contains: el => el === scroller || inside.has(el),
    getBoundingClientRect: () => ({ top: 0, bottom: 500 }), querySelectorAll: selector => selector === '[role="article"]' ? [article] : [] };
  article.compareDocumentPosition = () => 4; // target follows the last article
  article.contains = () => false;
  let pinned = true;
  const options = (isTabFocus) => ({ scroller, pointerDownAt: -Infinity, tabPresses: { isTabFocus }, isPinned: () => pinned, scrollToTail() { throw Error('no tail'); }, setPinned: value => { pinned = value; } });
  const event = () => ({ target, relatedTarget: outside, stopPropagation() { throw Error('no stop'); } });
  const visible = event();
  assert.equal(landTranscriptFocus(visible, options(() => false)), false);
  assert.equal(pinned, true, 'a target after the last article, visible, keeps following');
  assert.equal(landedFocusEvents.has(visible), false);
  article.compareDocumentPosition = () => 2; // target precedes the last article
  const before = event();
  assert.equal(landTranscriptFocus(before, options(() => false)), false);
  assert.equal(pinned, false, 'otherwise following is released');
  assert.ok(landedFocusEvents.has(before));
  // A focus guard entered without a Tab landing is left alone.
  pinned = true;
  const guard = { ...event(), target: Object.assign(node(300), { matches: selector => selector === '[data-base-ui-focus-guard]' }) };
  inside.add(guard.target);
  assert.equal(landTranscriptFocus(guard, options(() => false)), false);
  assert.equal(pinned, true);
  // tabFocusFollows: no last article, a contained or following target, and the visibility callback's verdict.
  assert.equal(tabFocusFollows(target, null, false, () => true), false);
  assert.equal(tabFocusFollows(target, { contains: () => true }, true, (_, isArticle) => isArticle), true);
  assert.equal(tabFocusFollows(target, { contains: () => false, compareDocumentPosition: () => 4 }, false, () => false), false);
  } finally { globalThis.Node = savedNode; }
});

// R2-appswitch W3 surface chord, 3.6556.2 since W2 w2-titlebar-current (tests/app-switch-current.test.mjs defers to
// this file once the targets are 3.6556.2): shared-156 qK, shared-78 Eo and shared-1 eH/oH/GV over the LV tables.
test('surface chord targets are 3.6556.2 originals pinned by closure, features, aliases and imports', async () => {
  const { createHash } = await import('node:crypto');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const { pinSurfaceChordHelper, surfaceChordPins } = await import('../scripts/code-current-surface-chord-pins.mjs');
  const chordTargets = {
    'surface-chord-layers.mjs': ['shared-156-BLTosN8U.js', ['UK', 'GK', 'qK']],
    'surface-chord-platform.mjs': ['shared-78-D5Fw2h0a.js', ['To', 'Eo']],
    'surface-chord.mjs': ['shared-1-BJhqMmkf.js', ['FP', 'RP', 'zP', 'HP', 'qV', 'JV', 'YV', 'ZV', 'QV', 'tH', 'GV', 'eH', 'oH']],
  };
  for (const [target, [source, bindings]] of Object.entries(chordTargets)) {
    const module = entry(target);
    assert.equal(module.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(module.source), source, target);
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(V3, source))), target);
    assert.deepEqual(module.bindings, bindings, target);
    const text = generated(target);
    assert.equal(sha(text), module.sha256, target);
    assert.ok(text.startsWith('// Original Claude Desktop 3.6556.2 bindings; generated by extract-code-ui-current.mjs.\n'), target);
    assert.deepEqual((await pinSurfaceChordHelper(target, V3)).bindings, bindings, target);
  }
  const chordText = generated('surface-chord.mjs');
  assert.match(chordText, /import \{ surfaceChordLayerSelector as Ws \} from "\.\/surface-chord-layers\.mjs";/);
  assert.match(chordText, /import \{ isMacUserAgent as so \} from "\.\/surface-chord-platform\.mjs";/);
  assert.match(chordText, /import \{ ownerDocument as Ze \} from "\.\/owner-document\.mjs";/);
  const Chord = await server.ssrLoadModule('/src/generated/code-current/surface-chord.mjs');
  assert.deepEqual(Chord.surfaceChordShortcuts, {
    chorus_surface_prev: [{ key: 'arrowleft', modifiers: ['cmd', 'alt'], platform: 'mac', app: 'desktop' }, { key: 'arrowleft', modifiers: ['ctrl', 'alt'], platform: 'non-mac', app: 'desktop' }],
    chorus_surface_next: [{ key: 'arrowright', modifiers: ['cmd', 'alt'], platform: 'mac', app: 'desktop' }, { key: 'arrowright', modifiers: ['ctrl', 'alt'], platform: 'non-mac', app: 'desktop' }],
  });
  assert.equal(Chord.adjacentSurface(['chat', 'code'], 'chat', 'next'), 'code');
  assert.equal(Chord.adjacentSurface(['chat', 'code'], 'chat', 'prev'), null);
  // shared-22 still imports the direction / next-mode helpers and the platform test under the aliases the pins name.
  const s22 = current('shared-22-Bwn3sJTG.js'), s1 = current('shared-1-BJhqMmkf.js');
  for (const needle of ['("chorus_surface_prev")', '("chorus_surface_next")', 'On as St', 'kn as Ft']) assert.ok(s22.includes(needle), needle);
  for (const needle of ['eH as On', 'oH as kn', 'mE as so', 'ap as Ze', '_r as Ws', 'chorus_surface_prev:{description:']) assert.ok(s1.includes(needle), needle);
  // A binding list that is not the closure is refused.
  const pin = surfaceChordPins['surface-chord.mjs'];
  const saved = pin.bindings;
  pin.bindings = saved.filter(name => name !== 'HP');
  try { await assert.rejects(pinSurfaceChordHelper('surface-chord.mjs', V3), /closure of eH,oH,GV/); }
  finally { pin.bindings = saved; }
});
