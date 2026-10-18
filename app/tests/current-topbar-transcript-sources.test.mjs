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
import { createReadTracker, readLineVisible, ApprovalReadRows } from '../src/generated/code-current/approval-read-gate.mjs';
import { devServerDescription } from '../src/generated/code-current/dev-server-description.mjs';
import { splitPointerDrags, markSplitPointerDrag } from '../src/generated/code-current/split-drag-registry.mjs';
import { contentBox, minSize, walkResolvedFlexes } from '../src/generated/code-current/tile-layout-math.mjs';
import { fitOpenedLayout } from '../src/generated/code-current/tile-fit-opened.mjs';
import { paddedTop } from '../src/generated/code-current/padded-top.mjs';
import { landTranscriptFocus, landedFocusEvents } from '../src/generated/code-current/transcript-focus-landing.mjs';
import { attachTabFocusRelease } from '../src/generated/code-current/tab-focus-release.mjs';

// R2-topbar TT-01 (analysis/code-ui-migrate-20261017/research/topbar-transcript.md §5.1): the titlebar, attachment,
// approval read gate, dev-server port line, split drag registry, fitOpenedLayout and transcript focus helpers are
// extracted from Claude Desktop 2.42304.0. These assertions pin the official behaviour the hosts will consume.
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const GENERATED = path.join(ROOT, 'src/generated/code-current');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const generated = name => fs.readFileSync(path.join(GENERATED, name), 'utf8');
const manifest = JSON.parse(generated('manifest.json'));
const entry = target => manifest.modules.find(module => module.target === target);

let server, attachment, fold;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  attachment = await server.ssrLoadModule('/src/generated/code-current/attachment-file-name.mjs');
  fold = await server.ssrLoadModule('/src/generated/code-current/titlebar-fold-measure.mjs');
});
after(() => server?.close());

test('manifest: every TT-01 target comes from the named 2.42304.0 chunk and carries the official signatures', () => {
  const expected = {
    'grapheme-prefix.mjs': ['shared-2-Cb74JByF.js', 'granularity:"grapheme"'],
    'session-menu-tooltip.mjs': ['cc43287c9-DAfOi8yP.js', '`${Ru(Ve,79).trimEnd()}\\u2026`'],
    'titlebar-draft-title.mjs': ['cc43287c9-DAfOi8yP.js', 'draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary'],
    'titlebar-toggle-fold.mjs': ['c73f45bc3-CFrHin0p.js', 'folded:e.filter(e=>i.has(e))'],
    'dom-owner.mjs': ['shared-frame-BfjMqbuN.js', 'e?.ownerDocument.defaultView??globalThis.window'],
    'titlebar-title-rect.mjs': ['shared-18-D4XxL6Tg.js', '.cc-lined-title-group'],
    'titlebar-fold-measure.mjs': ['cd54a5401-B0T2EyYD.js', 'code.titlebar_overflow_measure_bounded'],
    'display-text.mjs': ['shared-frame-BfjMqbuN.js', '\\p{Default_Ignorable_Code_Point}'],
    'attachment-file-name.mjs': ['shared-2-Cb74JByF.js', 'before:content-[\'\\u2026\']'],
    'visible-box.mjs': ['shared-156-Bikz018e.js', 'scrollPaddingBottom'],
    'approval-read-gate.mjs': ['c96d752d0-BOCqU7c2.js', '"data-testid":"approval-read-rows"'],
    'dev-server-description.mjs': ['c96d752d0-BOCqU7c2.js', 'Runs in {cwd} on port {port} (or the next free port)'],
    'split-drag-registry.mjs': ['shared-23-Bu_lvvVo.js', 'D2=new WeakMap'],
    'tile-layout-math.mjs': ['cf53e1812-CivLPgES.js', 'e.borderPx??1'],
    'tile-fit-opened.mjs': ['cc43287c9-DAfOi8yP.js', 'withRoomForChat: walkResolvedFlexes gave no box for a child of a sized stack'],
    'padded-top.mjs': ['shared-15-Cc9xvKlF.js', 'getBoundingClientRect().top+Ea(e)'],
    'transcript-focus-landing.mjs': ['c96d752d0-BOCqU7c2.js', '[role="article"]'],
    'tab-focus-release.mjs': ['c9f414608-DLf4iO0V.js', '[data-base-ui-focus-guard]'],
  };
  for (const [target, [file, signature]] of Object.entries(expected)) {
    const module = entry(target);
    assert.ok(module, `${target} is in the manifest`);
    assert.equal(module.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(module.source), file, target);
    assert.match(module.source, /installed-2\.42304\.0-20261017/, target);
    assert.ok(official(file).includes(signature), `${file} still carries ${signature}`);
    assert.match(generated(target), /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/, target);
  }
  assert.deepEqual(entry('session-menu-tooltip.mjs').sourceSelections.map(s => [s.binding, s.local]), [['_W', 'Ue']]);
  assert.deepEqual(entry('titlebar-draft-title.mjs').sourceSelections.map(s => [s.binding, s.local]), [['wW', 'Me']]);
  // Host boundaries are only official helpers or documented constants; no hand-written look-alikes.
  assert.match(generated('tab-focus-release.mjs'), /import \{ ownerWindow as e \} from "\.\/owner-window\.mjs";/);
  assert.match(generated('titlebar-fold-measure.mjs'), /import \{ isFizzyLakePartEnabled as te \} from "\.\.\/view-tabs\/shared-4-CJsHhp5n\.js";/);
  assert.match(generated('attachment-file-name.mjs'), /import \{ cdsClassNames as Ku \} from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js";/);
  const publicNames = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
  assert.deepEqual([publicNames.isFizzyLakePartEnabled.file, publicNames.isFizzyLakePartEnabled.local], ['shared-4-CJsHhp5n.js', 'jf']);
  assert.deepEqual([publicNames.cdsClassNames.file, publicNames.cdsClassNames.local], ['shared-frame-BfjMqbuN.js', 'X']);
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

test('AttachmentFileName renders the official clamp or head/tail markup', () => {
  const { AttachmentFileName } = attachment;
  const short = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: 'notes.md', lines: 4 }));
  assert.equal(short, '<span aria-hidden="true" title="notes.md" class="text-footnote font-normal text-primary line-clamp-4 break-words [overflow-wrap:anywhere]"><bdi>notes.md</bdi></span>');
  const long = renderToStaticMarkup(React.createElement(AttachmentFileName, { name: `${'x'.repeat(75)}.tsx`, lines: 4 }));
  assert.match(long, /^<span aria-hidden="true" title="x{75}\.tsx" class="text-footnote font-normal text-primary flex min-w-0 flex-col">/);
  assert.match(long, /<bdi class="max-h-\[3lh\] overflow-hidden break-words \[overflow-wrap:anywhere\]">x{67}<\/bdi>/);
  assert.match(long, /<span class="flex min-w-0 before:shrink-0 before:content-\[&#x27;\u2026&#x27;\]"><bdi class="truncate py-\[0\.125em\] -my-\[0\.125em\]">x{8}<\/bdi><span class="shrink-0">\.tsx<\/span><\/span>/);
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
