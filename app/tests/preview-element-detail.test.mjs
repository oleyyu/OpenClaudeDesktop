import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// w10-editor-preview-element: the detail, chip and transcript card are 3.6556.2 originals (c0fbbe82d / c2fd10b8d), React
// Compiler output over the view-tabs helpers, CdsIcon and CdsCollapsible; they load through Vite (view-tabs imports .jsx).
const h = React.createElement;
const app = path.resolve(import.meta.dirname, '..');
let server, details, closedDetails, Pill, usePreviewIntent, Transcript, intl;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const { createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-DYfox5Co.js');
  intl = createIntl({ locale: 'en', defaultLocale: 'en', messages: {} });
  const { createSelectedElementDetail } = await server.ssrLoadModule('/src/generated/code-editor/preview-element-detail.mjs');
  const { createSelectedElementPill } = await server.ssrLoadModule('/src/generated/code-editor/preview-element-chip.mjs');
  const { createSelectedElementTranscript } = await server.ssrLoadModule('/src/generated/code-editor/preview-element-transcript.mjs');
  const Message = ({ defaultMessage, values }) => intl.formatMessage({ id: defaultMessage, defaultMessage }, values);
  details = createSelectedElementDetail({
  useIntl: () => intl,
  Message,
  // Expose the panel in server rendering so all original detail sections are
  // exercised. Interactive CDS opening/focus is verified by the future UI run.
  Collapsible: { Root: ({ children }) => h('section', null, children), Trigger: ({ children }) => h('button', null, children), Panel: ({ children }) => h('div', null, children) },
  });
  closedDetails = createSelectedElementDetail({ useIntl: () => intl, Message });
  ({ Pill, usePreviewIntent } = createSelectedElementPill({ Message, useIntl: () => intl,
    Toggle: ({ value, ...props }) => h('button', { type: 'button', ...props }) }));
  Transcript = createSelectedElementTranscript({ useIntl: () => intl, Message, Details: closedDetails.Details, useDetailAnimation: closedDetails.useDetailAnimation,
    useErrors: () => ({ addSuccess() {}, addError() {} }),
    ImageTile: ({ src, alt, className, tabIndex, style, onContextMenu }) => h('img', { src, alt, className, tabIndex, style, 'data-menu': typeof onContextMenu }) });
});
after(() => server?.close());
const ctx = { tagName: 'button', classes: ['primary'], screenshot: 'cG5n', innerText: 'Save changes',
  attributes: { 'aria-label': 'Save' }, computedStyles: { display: 'flex' },
  parentPath: 'main > button', outerHTML: '<button>Save changes</button>',
  component: { name: 'SaveButton', owners: ['Form', 'App'], props: { disabled: false } } };

test('original detail renders its image, source section labels, ownership and folded-detail count', () => {
  const html = renderToStaticMarkup(h(details.Preview, { ctx, width: 320, scrollRegionLabel: '<SaveButton /> Save changes', openedVia: 'click' }));
  assert.match(html, /style="width:320px"/);
  assert.match(html, /max-h-\[360px\]/);
  assert.match(html, /max-h-\[120px\]/);
  assert.match(html, /alt="Screenshot of the selected element"/);
  assert.match(html, /src="data:image\/png;base64,cG5n"/);
  assert.match(html, /Included with your message/);
  assert.match(html, /Show 4 more details/);
  for (const label of ['Element', 'Component', 'Props', 'Text', 'Attributes', 'Selector', 'Computed styles', 'HTML']) assert.match(html, new RegExp('>' + label + '<'));
  assert.match(html, /in Form › App/);
  assert.match(html, /&lt;button&gt;Save changes&lt;\/button&gt;/);
  assert.doesNotMatch(html, /element-context-unsafe-notice/);
});

test('original preview exposes hidden characters without mutating the source context', () => {
  const unsafe = { ...ctx, innerText: '\u202Ehidden\u2066', screenshot: '' };
  const html = renderToStaticMarkup(h(details.Preview, { ctx: unsafe }));
  assert.match(html, /data-testid="element-context-unsafe-notice"/);
  assert.match(html, /Hidden characters are shown as codes/);
  assert.match(html, /\[U\+202E\]hidden\[U\+2066\]/);
  assert.doesNotMatch(html, /<img /);
  assert.equal(unsafe.innerText, '\u202Ehidden\u2066');
});

test('3.6556.2 detail renders the official CdsCollapsible trigger closed, with the folded-detail count', () => {
  const html = renderToStaticMarkup(h(closedDetails.Preview, { ctx, width: 320, scrollRegionLabel: 'x', openedVia: 'hover' }));
  assert.match(html, /data-cds="Icon"/);
  assert.match(html, /Show 4 more details/);
  assert.match(html, />Component</);
  assert.doesNotMatch(html, />Computed styles</, 'folded rows stay in the closed panel');
});

test('ko pill body is the 3.6556.2 body: me-xs, logical padding and -control text come from the original', () => {
  // (w12 preview-cont: the separate chip-body factory is retired; the tile / quiet bodies are ko's own.)
  const tile = renderToStaticMarkup(h(Pill, { value: 'e1', label: 'Save', sublabel: 'button', tile: true, thumbnail: h('i'), hoverPeek: true, previewContent: h('p'), onPreviewIntent() {} }));
  assert.match(tile, /class="flex items-center justify-center shrink-0 me-xs"/);
  assert.match(tile, /epitaxy-pill-body overflow-hidden focus-visible:outline-hidden focus-visible:shadow-focus hide-focus-ring epitaxy-pill-body--tile rounded-card border inline-flex items-center gap-sm py-xs pe-md ps-lg text-secondary-control text-body bg-surface-3/);
  assert.match(tile, /class="flex min-w-0 flex-col items-start text-start"/);
  assert.match(tile, /aria-haspopup="dialog"/);
  assert.match(tile, /aria-expanded="false"/);
  const pill = renderToStaticMarkup(h(Pill, { value: 'e1', label: '<SaveButton /> Save', quiet: true, thumbnail: h('i'), onPreviewIntent() {} }));
  assert.match(pill, /rounded-sm border-0 inline-flex items-center gap-1\.25 h-10 px-md text-secondary-control text-body epitaxy-pill-body--flat bg-alpha-2 text-muted-control/);
  assert.match(pill, /class="truncate max-w-\[160px\]"/);
  assert.match(pill, /class="flex items-center justify-center shrink-0"/);
  assert.doesNotMatch(pill, /aria-expanded/);
  assert.doesNotMatch(tile + pill, /mr-xs|pr-md|pl-lg/);
  // The 3.6556.2 original ships these classes; the manifest no longer records a local style patch.
  const official = fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c0fbbe82d-COsmfHJY.js'), 'utf8');
  for (const needle of ['X=B&&p!==void 0&&"me-xs"', '"inline-flex items-center gap-sm py-xs pe-md ps-lg text-secondary-control text-body"', ])
    assert.equal(official.split(needle).length - 1, 1, needle);
  assert.equal(official.split('de?"max-w-[260px]":"max-w-[160px]"').length - 1, 3);
  const area = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/code-editor/areas/preview-element.json'), 'utf8'));
  const chip = area.adapters.find(entry => entry.name === 'preview-element-chip.mjs');
  assert.equal(chip.referenceVersion, '3.6556.2');
  assert.equal('styleCompatibility' in chip, false);
  assert.deepEqual(area.adapters.map(entry => entry.referenceVersion), Array(7).fill('3.6556.2'));
  assert.equal(area.referenceVersion, '3.6556.2');
  const generator = fs.readFileSync(path.join(app, 'scripts/code-editor-gen/preview-element.mjs'), 'utf8');
  assert.doesNotMatch(generator, /replaceAll\('"mr-xs"'/);
});

test('3.6556.2 transcript card renders its image tile and the closed CdsCollapsible disclosure', () => {
  const view = { title: '<SaveButton />', sections: [{ id: 'element', kind: 'text', value: '<button>' }, { id: 'attributes', kind: 'text', value: 'x' }], partial: true };
  const html = renderToStaticMarkup(h(Transcript, { view, screenshot: { src: 'data:image/png;base64,cG5n' } }));
  assert.match(html, /data-find-omitted=""/);
  assert.match(html, /data-transcript-click-acts=""/);
  assert.match(html, /data-cds="Collapsible"/);
  assert.match(html, /<span dir="ltr" class="min-w-0 truncate text-primary">&lt;SaveButton \/&gt;<\/span>/);
  assert.doesNotMatch(html, /These rows do not show everything that was sent\./, 'the partial note lives in the closed panel');
  assert.match(html, /alt="Screenshot of the selected element"/);
  assert.match(html, /data-cds="Icon"/);
  const overflow = renderToStaticMarkup(h(Transcript, { view: { overflow: 2 } }));
  assert.match(overflow, /2 more selected elements were sent to Claude, not shown here/);
});

// w12-preview: the whole c0fbbe82d ko pill (preview floating layer, remove button, context menu) and Go's preview intent.
const OFFICIAL = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const officialText = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
test('the element pill is the whole 3.6556.2 ko: pill root, toggle body, remove button, under the CdsContextMenu', () => {
  const html = renderToStaticMarkup(h(Pill, { value: 'e1', label: '<SaveButton /> Save', ariaLabel: 'Save button', thumbnail: h('i'), hoverPeek: true,
    previewOpen: false, previewContent: h('p', null, 'detail'), onPreviewIntent() {}, onRemove() {} }));
  assert.match(html, /class="group\/pill relative shrink-0 hover:z-10 focus-within:z-10"/);
  assert.match(html, /data-cds-attachment=""/);
  assert.doesNotMatch(html, /data-cds-attachment-restored/);
  assert.match(html, /style="[^"]*--cds-attachment-vt-name:cds-attachment-/);
  assert.match(html, /aria-label="Save button"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="truncate max-w-\[160px\]">&lt;SaveButton \/&gt; Save</);
  assert.match(html, /class="epitaxy-pill-remove absolute -top-1\.5 -end-1\.5 z-10 grid place-items-center size-4 rounded-full bg-surface-2 text-secondary ring-1 ring-alpha-2 opacity-0 pointer-events-none/);
  assert.match(html, /aria-label="Remove &lt;SaveButton \/&gt; Save"/);
  assert.doesNotMatch(html, /data-epitaxy-pill-preview/, 'the floating preview is a portal only while open');
  // Original text: the generated pill carries ko's floating layer, keyboard map and menu verbatim.
  const generated = fs.readFileSync(path.join(app, 'src/generated/code-editor/preview-element-chip.mjs'), 'utf8');
  for (const needle of ['placement: "top-start"', 'strategy: "fixed"', '"epitaxy-root text-body text-primary break-words isolate"', 'T("popover")',
    '"data-epitaxy-pill-preview": ""', 'defaultMessage: "Show what this sends"', 'id: "ZPKWqGjW88"', 'defaultMessage: "Remove {name}"', 'case "ArrowLeft":',
    'n.floating.style.maxWidth = `${Math.max(Math.floor(t), yo)}px`', 'var go = ".epitaxy-attachment-shelf"'])
    assert.ok(generated.includes(needle), needle);
  const pill = officialText('c0fbbe82d-COsmfHJY.js');
  for (const needle of ['placement:"top-start",strategy:"fixed",transform:!1,whileElementsMounted:Oo', 'defaultMessage:"Show what this sends",id:"ZPKWqGjW88"',
    'className:"group/pill relative shrink-0 hover:z-10 focus-within:z-10"'])
    assert.equal(pill.split(needle).length - 1, 1, needle);
  // The floating helpers come from the one view-tabs copy (D1), not an inlined Floating UI.
  assert.match(generated, /useFloating as \$vt_useFloating,[\s\S]*from "\.\.\/view-tabs\/vendor-frame-CnSY1sxv\.js"/);
  assert.doesNotMatch(generated, /function xl\(/);
  assert.match(generated, /ContextMenuOpenMarker as \S+ } from "\.\.\/session-rail-changes\/context-menu-marker\.mjs"/);
});

test('Go preview intent: closed and unpinned until hovered, hover by default', () => {
  let seen;
  function Probe() { seen = usePreviewIntent(); return null; }
  renderToStaticMarkup(h(Probe));
  assert.equal(seen.open, null);
  assert.equal(seen.pinned, null);
  assert.equal(seen.openedVia, 'hover');
  for (const key of ['onPreviewIntent', 'onPreviewEnter', 'onPreviewLeave', 'close']) assert.equal(typeof seen[key], 'function', key);
  const go = officialText('c0fbbe82d-COsmfHJY.js');
  for (const needle of ['var fo=600,po=200', 'onPreviewIntent:Nt,onPreviewEnter:rn,onPreviewLeave:an']) assert.equal(go.split(needle).length - 1, 1, needle);
});

test('the transcript screenshot carries the 3.6556.2 image menu (c26fb8b6b Ue): Copy image / Save image', () => {
  const view = { title: '<SaveButton />', sections: [{ id: 'element', kind: 'text', value: '<button>' }] };
  const html = renderToStaticMarkup(h(Transcript, { view, screenshot: { src: 'data:image/png;base64,cG5n' } }));
  assert.match(html, /<img[^>]*tabindex="-1"[^>]*style="[^"]*outline:none"[^>]*data-menu="function"/);
  const generated = fs.readFileSync(path.join(app, 'src/generated/code-editor/preview-element-transcript.mjs'), 'utf8');
  for (const needle of ['defaultMessage: "Copy image"', 'id: "xzV2K7Pydt"', 'defaultMessage: "Save image"', 'id: "c0MU9uo4b8"',
    'defaultMessage: "Image copied to clipboard."', 'new ClipboardItem({ "image/png": T(e).then(Le) })', 'onContextMenu: We', 'surface: "attachment"'])
    assert.ok(generated.includes(needle), needle);
  assert.doesNotMatch(generated, /\(\{ children \}\) => children/, 'no pass-through stand-in for Ue');
  const menu = officialText('c26fb8b6b-B7Friu61.js');
  for (const needle of ['defaultMessage:"Copy image",id:"xzV2K7Pydt"', 'defaultMessage:"Save image",id:"c0MU9uo4b8"', 'Ue as D'])
    assert.equal(menu.split(needle).length - 1, 1, needle);
});

test('host SourceSelectedElementPill renders ko directly in the strip (no host wrapper, Cursor CdsIcon, intl Element label)', async () => {
  const host = await server.ssrLoadModule('/src/source-selected-element.jsx');
  const entry = { id: 'el-1', kind: 'elementContext', status: 'loading', context: ctx };
  function Strip() { const intent = host.useAttachmentPreviewIntent(); return h('div', { className: 'sca-strip' }, h(host.SourceSelectedElementPill, { entry, intent, onRemove() {} })); }
  const html = renderToStaticMarkup(h(Strip));
  assert.match(html, /^<div class="sca-strip"><div [^>]*data-cds-attachment="" class="group\/pill relative shrink-0/);
  assert.doesNotMatch(html, /selected-element-pill|sca-pill|data-kind=/);
  assert.match(html, /data-cds="Icon"/);
  assert.match(html, /role="status"/, 'the processing notice rides in the pill body (ko trailing)');
  assert.match(html, /epitaxy-pill-remove absolute/);
  assert.equal(fs.existsSync(path.join(app, 'src/source-selected-element.css')), false);
});

// w12 preview-cont: Go owns one intent per strip; the composer strips call the hook once and hand it to every pill.
test('one Go intent per strip: element, agent and issue pills are ko under the strip handlers (c0fbbe82d Go)', async () => {
  const host = await server.ssrLoadModule('/src/source-selected-element.jsx');
  const entry = { id: 'el-1', kind: 'elementContext', status: 'ready', context: ctx };
  const agent = { kind: 'agent', label: 'Reviewer', onRemove() {} };
  const issue = { kind: 'issue', label: '#12 Fix it', loading: true, onOpen() {}, onRemove() {} };
  let intents = 0;
  function Strip() {
    const intent = host.useAttachmentPreviewIntent(); intents++;
    const handlers = host.attachmentStripHandlers(intent);
    assert.deepEqual(Object.keys(handlers), ['onMouseEnter', 'onMouseLeave', 'onBlur']);
    return h('div', { className: 'flex flex-wrap items-center gap-1' },
      h(host.SourceContextPill, { pill: agent, intent }), h(host.SourceContextPill, { pill: issue, intent }),
      h(host.SourceSelectedElementPill, { entry, intent, onRemove() {} }));
  }
  const html = renderToStaticMarkup(h(Strip));
  assert.equal(intents, 1);
  assert.equal(html.split('class="group/pill relative shrink-0 hover:z-10 focus-within:z-10"').length - 1, 3, 'three ko roots');
  assert.match(html, />Reviewer</);
  assert.match(html, />#12 Fix it</);
  assert.match(html, /aria-label="Remove Reviewer"/);
  assert.match(html, /aria-label="Remove #12 Fix it"/);
  assert.match(html, /data-cds="Spinner"/, 'the loading issue shows CdsSpinner sm (Go `i(ae, { size: "sm" })`)');
  assert.doesNotMatch(html, /sca-pill|sc-context-pill/);
  // Original: every pill of the strip gets the same `onPreviewIntent: Nt`; the strip carries s / d / m.
  const go = officialText('c0fbbe82d-COsmfHJY.js');
  for (const needle of ['value:"agent",thumbnail:i(N,{name:"Agent",size:"xs"}),label:c,restored:u?.has(Va(c)),onPreviewIntent:Nt,onRemove:me}',
    'value:"issue",thumbnail:l.bodyStatus==="loading"?i(ae,{size:"sm"}):i(N,{name:"Placeholder",size:"xs"}),label:l.label,onPreviewIntent:Nt,',
    'className:"flex flex-wrap items-center gap-1",onMouseEnter:s,onMouseLeave:d,onBlur:m,children:[e,t,r,a]'])
    assert.equal(go.split(needle).length - 1, 1, needle);
  assert.equal(go.split('onPreviewIntent:Nt,').length - 1, 4);
  // Each host strip calls the hook once; the pill itself no longer owns an intent, and the chip-body factory is gone.
  for (const file of ['src/source-composer-tiles.jsx', 'src/source-composer-attachments.jsx']) {
    const text = fs.readFileSync(path.join(app, file), 'utf8');
    assert.equal(text.split('useAttachmentPreviewIntent()').length - 1, 1, file);
    assert.equal(text.split('{...attachmentStripHandlers(intent)}').length - 1, 1, file);
    assert.doesNotMatch(text, /createSelectedElementChipBody|function ContextPill/, file);
  }
  const selected = fs.readFileSync(path.join(app, 'src/source-selected-element.jsx'), 'utf8');
  assert.doesNotMatch(selected, /usePreviewIntent\(\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/generated/code-editor/preview-element-chip.mjs'), 'utf8'), /createSelectedElementChipBody/);
});

// w12 preview-cont (D1, viewtabs 9c): shared-0 Pa is one copy; the shared-156 display safety lives once, the parser
// imports it; the pure targets still reach no view-tabs (E42).
// W13 G11 (D1, assertions follow the regenerated output): that one Pa is routines-shared's import-free shared-0 (code-current
// lazy-init.mjs only re-exports it), and kX / VX / qX are code-routines' shared-156 copy, DX approval-titles' (both import
// only routines-shared's shared-0), so the view inlines just wX / EX and re-exports the six for the parser.
test('D1: pure targets link routines-shared Pa and share one display-safety copy', async () => {
  const dir = path.join(app, 'src/generated/code-editor');
  const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
  for (const name of ['preview-element-serialization.mjs', 'preview-element-label.mjs', 'preview-element-view.mjs', 'preview-element-parser.mjs']) {
    const text = read(name);
    assert.doesNotMatch(text, /function Pa\(/, name);
    assert.match(text, /import \{ Pa as \S+ \} from "\.\.\/routines-shared\/shared-0-DDOOdL6P\.mjs";/, name);
    assert.doesNotMatch(text, /view-tabs/, `${name} (E42)`);
  }
  assert.doesNotMatch(read('preview-element-view.mjs'), /function qX\(|function VX\(|var kX =|var DX =|var ML =/);
  assert.match(read('preview-element-view.mjs'), /kX as \S+,\s*VX as \S+,\s*qX as \S+,?\s*\} from "\.\.\/code-routines\/shared-156-BLTosN8U\.mjs";/);
  assert.match(read('preview-element-view.mjs'), /import \{ DX as \S+ \} from "\.\.\/approval-titles\/shared-156-BLTosN8U\.mjs";/);
  assert.doesNotMatch(read('preview-element-parser.mjs'), /function qX\(|function VX\(/);
  assert.match(read('preview-element-parser.mjs'), /displaySafetyEscape as \$sib_displaySafetyEscape[\s\S]*from "\.\/preview-element-view\.mjs"/);
  const lazy = fs.readFileSync(path.join(app, 'src/generated/code-current/lazy-init.mjs'), 'utf8');
  assert.match(lazy, /^import \{ Pa \} from "\.\.\/routines-shared\/shared-0-DDOOdL6P\.mjs";$/m, 'lazy-init.mjs re-exports the routines-shared copy');
  assert.doesNotMatch(lazy, /function Pa\(/);
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/generated/routines-shared/shared-0-DDOOdL6P.mjs'), 'utf8'), /^import /m, 'routines-shared shared-0 is import-free');
  // Plain node loads the pure models (E42) and they still behave.
  const view = await import(path.join(dir, 'preview-element-view.mjs'));
  assert.equal(view.displaySafetyCodePoints('‮'), '[U+202E]');
  assert.equal(view.displaySafetyBlankPattern().test('​ '), true);
  const parser = await import(path.join(dir, 'preview-element-parser.mjs'));
  assert.equal(typeof parser.parseSelectedElementMessage, 'function');
  const shared0 = officialText('shared-0-DDOOdL6P.js');
  assert.equal(shared0.split('Pa as Lb').length - 1, 1, 'export Lb is shared-0 Pa');
  assert.equal(shared0.split('function Pa(e){let t,n=!1;return()=>(n||=(t=e(),!0),t)}').length - 1, 1);
});
