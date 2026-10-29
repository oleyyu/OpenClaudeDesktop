// W10 compat-host-31: the sidebar drag ghost row follows 3.6556.2 shared-46 Mj (dj clone, Dj / Oj tone surfaces,
// data-tone, background-color transition, danger overlay, native-halo shrink). The ghost portals into the sidebar, so
// the component runs under a one-shot hook dispatcher and the portal's children are rendered with react-dom/server.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource, looseFeature, sharedFrame } from '../scripts/official-3.6556.2.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const official = readFileSync(path.join(ionSource, 'shared-46-BIbZBGFq.js'), 'utf8');
const ROW = 'absolute overflow-hidden rounded-[var(--df-radius-pill)] transition-[opacity,transform,width,left,top,background-color] duration-150 ease-out motion-reduce:transition-none';
const DJ = 'bg-[var(--df-web-sidebar-bg,var(--df-sidebar-bg))] [background-image:var(--df-web-sidebar-bg-image,none)] shadow-[var(--df-shadow-float)]';
const OVERLAY = 'absolute inset-0 rounded-[inherit] bg-danger shadow-ring-danger stacks:shadow-none transition-opacity duration-150 ease-out motion-reduce:transition-none';
const IDLE = 'opacity-90 dark:ring-1 dark:ring-alpha-2';
const BUBBLE_DANGER = 'bg-danger text-danger border-[0.5px] border-danger stacks:border-transparent font-medium';

let server, Drag, Cds;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Drag = await server.ssrLoadModule('/src/source-sidebar-drag.jsx');
  Cds = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

function call(component, props) {
  const cells = []; let cursor = 0;
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (next) => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo(fn) { return fn(); }, useCallback(fn) { return fn; },
    useEffect() {}, useLayoutEffect() {}, useContext(context) { return context._currentValue; },
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
const portal = { nodeType: 1 };
const base = { keys: ['a'], label: 'A task', unpinIntent: false, paneIntent: null, groupIntent: null, tearOffIntent: false, newWindowIntent: false, srcGroupLabel: '' };
const rowDrag = (patch = {}) => ({ ...base, rowGhost: { clone: null, portal, dx: 4, dy: 3, w: 200, h: 28 }, ...patch });
function ghost(drag) {
  const tree = call(Drag.SidebarDragGhost, { drag });
  assert.equal(tree.containerInfo, drag.rowGhost?.portal ?? globalThis.document.body, 'portals into the row ghost portal');
  return renderToStaticMarkup(tree.children);
}
const rowOf = (html) => html.match(/<div (?:data-tone="[^"]*" )?class="[^"]*rounded-\[var\(--df-radius-pill\)\] transition-\[opacity[^"]*"[^>]*>/)?.[0];
const classOf = (tag) => tag.match(/class="([^"]*)"/)[1];

test('3.6556.2 shared-46 Mj ghost row features are in the official chunk', () => {
  assert.ok(official.includes(`"${ROW}"`), 'row container classes');
  assert.ok(official.includes(`Dj="${DJ}"`), 'Dj sidebar surface');
  assert.match(official, looseFeature('Oj=T("popover")'), 'Oj popover surface');
  assert.match(official, /import\{[^}]*\bAl as T\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/, 'T is shared-frame Al');
  assert.match(official, /import\{[^}]*\bHf as O\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/, 'O is shared-frame Hf');
  assert.match(official, looseFeature('u("div",{"data-tone":L,className:O(L==="neutral"?Oj:Dj,'), 'data-tone and tone surface');
  assert.match(official, looseFeature(`l?q:I?"opacity-100":"${IDLE}"`), 'idle ring / label opacity');
  assert.match(official, looseFeature('L=I?M?"danger":"neutral":void 0'), 'tone from label and danger');
  assert.match(official, looseFeature('M=r||p===null'), 'danger = unpin or ungroup');
  assert.match(official, looseFeature('q=d?" opacity-0 scale-[0.35]":" opacity-0 scale-75"'), 'native-halo shrink');
  assert.match(official, looseFeature(`"${OVERLAY}"+(L==="danger"?" opacity-100":" opacity-0")`), 'danger overlay');
  assert.ok(official.includes(`"${BUBBLE_DANGER}"`), 'label bubble danger');
  assert.match(official, looseFeature('l&&!d?"opacity-100 scale-100":"opacity-0 scale-75 pointer-events-none"'), 'tear-off card');
  const manifest = JSON.parse(readFileSync(new URL('../src/generated/view-tabs/manifest.json', import.meta.url), 'utf8'));
  const named = (name) => Object.values(manifest).find((value) => value && typeof value === 'object' && value[name])?.[name];
  assert.deepEqual([named('cdsSurfaceClass')?.file, named('cdsSurfaceClass')?.export], [sharedFrame, 'Al']);
  assert.deepEqual([named('cdsClassNames')?.file, named('cdsClassNames')?.export], [sharedFrame, 'Hf']);
});

test('idle row: no tone, Dj surface, background-color transition, 90% with the dark ring', () => {
  const html = ghost(rowDrag());
  const row = rowOf(html); assert.ok(row, html);
  assert.doesNotMatch(row, /data-tone=/);
  assert.equal(classOf(row), Cds.cdsClassNames(DJ, ROW, IDLE, 'source-drag-ghost-row'));
  assert.ok(classOf(row).includes(ROW));
  assert.match(html, new RegExp(`class="${OVERLAY.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} opacity-0"`));
  assert.match(html, /text-primary"><span class="min-w-0 truncate" data-drag-label=""><\/span>/);
  assert.doesNotMatch(html, /transition-\[opacity,transform,width,left,top\] /, 'not the 2.x transition list');
});

test('a neutral label (split, group move) sits on the popover surface with data-tone="neutral"', () => {
  for (const [drag, text] of [[rowDrag({ paneIntent: 'right' }), 'Open in split view'], [rowDrag({ groupIntent: { groupId: 'g1', label: 'Work' } }), 'Move to Work']]) {
    const html = ghost(drag), row = rowOf(html);
    assert.match(row, /^<div data-tone="neutral" /);
    assert.equal(classOf(row), Cds.cdsClassNames(Cds.cdsSurfaceClass('popover'), ROW, 'opacity-100', 'source-drag-ghost-row'));
    assert.doesNotMatch(row, /--df-web-sidebar-bg/);
    assert.ok(html.includes(`>${text}</span>`), text);
    assert.match(html, /opacity-100 text-primary">/);
  }
});

test('Release to unpin and Ungroup are data-tone="danger" on Dj with the danger overlay and text', () => {
  for (const [drag, text] of [[rowDrag({ unpinIntent: true }), 'Release to unpin'], [rowDrag({ groupIntent: { groupId: null, label: '' }, srcGroupLabel: 'Work' }), 'Ungroup']]) {
    const html = ghost(drag), row = rowOf(html);
    assert.match(row, /^<div data-tone="danger" /);
    assert.equal(classOf(row), Cds.cdsClassNames(DJ, ROW, 'opacity-100', 'source-drag-ghost-row'));
    assert.ok(html.includes(`class="${OVERLAY} opacity-100"`));
    assert.match(html, /opacity-100 text-danger">/);
    assert.ok(html.includes(`>${text}</span>`), text);
  }
});

test('tear-off fades the row into the window card; a native-halo tear-off shrinks to 0.35 with no card', () => {
  const tear = ghost(rowDrag({ tearOffIntent: true }));
  assert.equal(classOf(rowOf(tear)), Cds.cdsClassNames(DJ, ROW, ' opacity-0 scale-75', 'source-drag-ghost-row'));
  assert.match(tear, /origin-top opacity-100 scale-100" data-tear-off-card="">/);
  const halo = ghost(rowDrag({ tearOffIntent: true, nativeHalo: true }));
  assert.equal(classOf(rowOf(halo)), Cds.cdsClassNames(DJ, ROW, ' opacity-0 scale-[0.35]', 'source-drag-ghost-row'));
  assert.match(halo, /origin-top opacity-0 scale-75 pointer-events-none">/);
  assert.doesNotMatch(halo, /data-tear-off-card/);
});

test('the row-less label bubble uses the danger classes (stacks:border-transparent) for unpin and ungroup', () => {
  const previous = globalThis.document;
  globalThis.document = { body: { nodeType: 1 } };
  try {
    const html = ghost({ ...base, rowGhost: null, unpinIntent: true });
    assert.ok(html.includes(BUBBLE_DANGER + ' opacity-100 scale-100" data-drag-label="">Release to unpin</div>'), html);
    const plain = ghost({ ...base, rowGhost: null });
    assert.match(plain, /text-primary border-\[0\.5px\] shadow-sm opacity-100 scale-100" data-drag-label="">A task<\/div>/);
    assert.doesNotMatch(plain, /data-tone=/);
  } finally { globalThis.document = previous; }
});

// w11-sweep-rest (w10-cleanup-host-compat notDone): the multi-row count is the CDS Counter (shared-frame Vo = vE),
// `n&&v>1?o(F,{value:v,variant:"accent",size:"xs",className:…,style:{left:y?-ie+4:re-ie-4,top:-Y+2}}):null`.
test('multi-row drag count: the official CdsCounter (accent, xs) at the row end, none for one row', () => {
  const COUNT = 'absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-150 ease-out motion-reduce:transition-none';
  assert.match(official, /import\{[^}]*\bVo as F\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/, 'F is shared-frame Vo');
  assert.match(official, looseFeature(`n&&v>1?o(F,{value:v,variant:"accent",size:"xs",className:"${COUNT}",style:{left:y?-ie+4:re-ie-4,top:-Y+2}}):null`));
  const frame = readFileSync(path.join(ionSource, sharedFrame), 'utf8');
  assert.match(frame, /[,{]vE as Vo[,}]/);
  assert.ok(frame.includes('"data-cds":"Counter"'));
  const html = ghost(rowDrag({ keys: ['a', 'b', 'c'] }));
  const counter = html.match(/<span data-cds="Counter"[^>]*>3<\/span>/)?.[0];
  assert.ok(counter, html);
  assert.ok(counter.includes('bg-fill-accent text-on-accent') && counter.includes(COUNT), counter);
  // left = re - ie - 4 (ltr): width 200, dx 4 -> 200 - 4 - 4; top = -dy + 2.
  assert.match(counter, /style="left:192px;top:-1px"/);
  assert.doesNotMatch(ghost(rowDrag()), /data-cds="Counter"/);
  assert.doesNotMatch(html, /source-drag-count/);
});
