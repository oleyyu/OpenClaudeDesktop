// composer-gen (research/composer.md §1.2/§4.1/§5; 3.6556.2: migration research/composer.md §1/§3.2, w2-composer-gen): the Code
// composer pieces are original 3.6556.2 bindings extracted by
// scripts/extract-code-composer.mjs into src/generated/code-composer. Nothing here opens a window: the generator
// contract, the verbatim official tokens, the pure helpers (cM / QX / Xj / wv / i0) under fake DOM objects, and SSR
// markup of the Send cell (lM) and the environment bar (l0 / u0). Mounting into the composer is composer-send-cell /
// composer-env-bar; this file only proves the extracted pieces are the official ones and run under the host adapters.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCodeComposer } from '../scripts/extract-code-composer.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-composer');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
let server, manifest, Adapters, ViewTabs, AdapterModules;
const load = name => server.ssrLoadModule(`/src/generated/code-composer/${name}`);
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Adapters = await server.ssrLoadModule('/src/source-composer-current-adapters.jsx');
  // R4g-composer CP4: adapter entries may name their own module (the attachment tiles' adapters).
  AdapterModules = {
    '../../source-composer-current-adapters.jsx': Adapters,
    '../../source-composer-attachment-adapters.jsx': await server.ssrLoadModule('/src/source-composer-attachment-adapters.jsx'),
  };
  ViewTabs = JSON.parse(await fs.readFile(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
});
after(() => server?.close());

// ---------------------------------------------------------------- generator contract
test('generator output matches the pinned 3.6556.2 sources (check mode); imports resolve to React, itself, view-tabs semantic names or the adapter', async () => {
  manifest = await extractCodeComposer({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.generator, 'scripts/extract-code-composer.mjs');
  assert.deepEqual(manifest.modules.map(m => m.target), [
    'composer-tokens.mjs', 'composer-testids.mjs', 'composer-glyph.mjs', 'owner-support.mjs', 'placeholder-fit.mjs', 'shortcut-caps.mjs',
    'transcript-surface.mjs', 'path-tooltip-placement.mjs', 'composer-card-tokens.mjs', 'composer-dialog-focus.mjs',
    'composer-focus-yield.mjs', 'composer-key-label.mjs',
    // 3.6556.2: shared-8 HF (Jr), the Stop glyph name KM reads (fizzy-lake icons part, off).
    'composer-stop-glyph.mjs', 'composer-send-cell.mjs',
    // R3-composer composer-copy-command: the transcript predicates and the /copy reply reader.
    'transcript-text-item.mjs', 'transcript-provisional.mjs', 'transcript-user-kind.mjs', 'transcript-replies.mjs',
    'copy-reply-arg.mjs', 'copy-reply-replies.mjs', 'environment-bar.mjs',
    // R3-composer composer-row-chin: the shared-8 context ring and the row chin's mode label / model class.
    'usage-ring.mjs', 'composer-row-chin.mjs',
    // R3-composer focus call sites: shared-8 pR (2.42304.0 xM), consumed by src/composer-focus-handoff.mjs.
    'keyboard-activation.mjs',
    // R3-composer step 3 composer-shell: the CDS ChatComposer shell (shared-5 vm / Sm / hm / mm) over its closure.
    'chat-composer-react-version.mjs', 'chat-composer-frame.mjs', 'chat-composer-attachments.mjs', 'chat-composer-dock.mjs',
    'chat-composer-presence.mjs', 'chat-composer-layout.mjs', 'chat-composer-shell.mjs',
    // R4g-composer CP2 (X7-08): shared-28 nw, the elementtiming mark of cm's placeholder span.
    'chat-composer-placeholder-timing.mjs',
    // R4g-composer CP3 (X7-09): the Add trigger's pure pieces (c227f4d5e dM / fM / sM) and its popup's padding (shared-18 wU).
    'composer-add-menu.mjs', 'menu-collision-padding.mjs',
    // R4g-composer CP4 / R4i-graph GR3: the object URL hook, the video name test, c0fbbe82d's tile wrappers, the Code
    // pane's experimental flags, the one intake route (shared-52 nP / pb, cafc2a89b a, cc43287c9 Kq) and the pane drop zone.
    'composer-object-url.mjs', 'composer-video-types.mjs',
    'composer-attachment-tiles.mjs', 'code-pane-experimental.mjs', 'composer-intake-split.mjs', 'composer-image-types.mjs', 'composer-intake-route.mjs',
    'composer-drop-target.mjs', 'composer-pane-drop-zone.mjs',
  ]);
  assert.deepEqual((await fs.readdir(generated)).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.referenceVersion, '3.6556.2');
    assert.equal(module.sourceSha256, sha(await fs.readFile(path.join(reference, module.source))), module.source);
    assert.equal(module.sha256, sha(await fs.readFile(path.join(generated, module.target), 'utf8')), module.target);
    for (const entry of module.imports) {
      assert.ok(['react', 'generated', 'view-tabs', 'adapter'].includes(entry.kind), `${module.target}:${entry.local}`);
      if (entry.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react-dom', 'react/compiler-runtime'].includes(entry.from), `${module.target}:${entry.local}`);
      if (entry.kind === 'adapter') {
        assert.ok(AdapterModules[entry.from], `${module.target}: adapter module ${entry.from}`);
        // ComposerAttachmentTiles is the tile set object (th's members); every other adapter is a component or hook.
        assert.equal(typeof AdapterModules[entry.from][entry.name], entry.name === 'ComposerAttachmentTiles' ? 'object' : 'function', `adapter export ${entry.name}`);
      }
      if (entry.kind === 'view-tabs') {
        const pub = ViewTabs.publicNames[entry.name];
        assert.ok(pub, `view-tabs publicName ${entry.name}`);
        assert.equal(entry.from, `../view-tabs/${pub.file}`);
        // An import of the chunk names the official alias; a same-chunk dependency of a viewTabsSame copy names the local.
        assert.ok([`${pub.file}:${pub.export}`, `${pub.file}:${pub.local}`].includes(entry.via), `${module.target}: ${entry.via}`);
        assert.equal(entry.original, pub.local);
      }
    }
  }
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  // KM (2.42304.0 lM) with its crossfade bM, hint rows WM, idle-action context gM, focus-steal guard mj and hasText reader Gk.
  assert.deepEqual(byTarget['composer-send-cell.mjs'].bindings.map(b => b.name), ['Gk', 'Kk', 'qk', 'mj', 'gM', 'bM', 'WM', 'KM']);
  assert.deepEqual(byTarget['composer-stop-glyph.mjs'].bindings.map(b => b.name), ['HF']);
  assert.deepEqual(byTarget['composer-stop-glyph.mjs'].officialExports, { HF: 'Jr' });
  // R2 composer-send-cell: GM (cM) has its own pure module (the placeholder model reads it); c1c6ea9ac's overflow hook a
  // reads shared-25 hf (ap) through owner-support and getResizeObserverClass (cp) from view-tabs (published since 3.6556.2).
  assert.deepEqual(byTarget['composer-key-label.mjs'].bindings.map(b => b.name), ['GM']);
  assert.deepEqual(byTarget['placeholder-fit.mjs'].bindings.map(b => b.name), ['a']);
  assert.deepEqual(byTarget['placeholder-fit.mjs'].officialExports, { a: 't' });
  assert.deepEqual(byTarget['placeholder-fit.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'shared-25-DOWZRSlq.js:ap=ownerDocument', 'shared-25-DOWZRSlq.js:cp=getResizeObserverClass',
    'shared-frame-6jtSkIit.js:$f=memoChanged2', 'shared-frame-6jtSkIit.js:Qf=memoChanged1', 'shared-frame-6jtSkIit.js:cp=memoStore3',
    'shared-frame-6jtSkIit.js:ep=memoChanged3', 'shared-frame-6jtSkIit.js:ip=reactMemoCache', 'shared-frame-6jtSkIit.js:lp=memoStore4',
    'shared-frame-6jtSkIit.js:op=memoStore1', 'shared-frame-6jtSkIit.js:sp=memoStore2',
    'vendor-frame-CnSY1sxv.js:Co=useRef', 'vendor-frame-CnSY1sxv.js:bo=useLayoutEffect', 'vendor-frame-CnSY1sxv.js:wo=useState',
  ]);
  // shared-25 pf / gf / _f are view-tabs ownerWindow / getResizeObserverClass / getMutationObserverClass now (not copied).
  assert.deepEqual(byTarget['owner-support.mjs'].exports, { mf: 'ownerWindowOrGlobal', ni: 'noopSubscribe', hf: 'ownerDocument' });
  assert.equal(byTarget['owner-support.mjs'].officialExports.hf, 'ap');
  // Dae / a8 / i8 / Eae (2.42304.0 l0 / u0 / c0 / a0); o0 is r8 `rounded ${TF}` and s0 is gone with the landing texture.
  assert.deepEqual(byTarget['environment-bar.mjs'].bindings.map(b => b.name), ['t8', 'Tae', 'n8', 'Eae', 'r8', 'i8', 'Dae', 'a8', 'Q5', '$5']);
  assert.ok(!('s0' in byTarget['environment-bar.mjs'].exports) && !Object.values(byTarget['environment-bar.mjs'].exports).includes('environmentLineSurfaceClass'));
  assert.deepEqual(byTarget['composer-focus-yield.mjs'].bindings.map(b => b.name), ['NM', 'PM']);
  assert.deepEqual(byTarget['copy-reply-arg.mjs'].bindings.map(b => b.name), ['V$']);
  // H$ / U$ read c227f4d5e's predicates by their official export aliases (cl / ll / pl / El), which read cb27dab29 y (Fe),
  // c06cf64bb Sr (jy) and c4d199b75 C (ot).
  assert.deepEqual(byTarget['copy-reply-replies.mjs'].bindings.map(b => b.name), ['H$', 'U$']);
  assert.deepEqual(byTarget['copy-reply-replies.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'c227f4d5e-B-FYKrwT.js:El=replyText', 'c227f4d5e-B-FYKrwT.js:cl=isAssistantEntry', 'c227f4d5e-B-FYKrwT.js:ll=endsFinishedReply',
    'c227f4d5e-B-FYKrwT.js:pl=replyItems',
  ]);
  // WE (2.42304.0 DE) now counts an aside entry as a turn boundary (FE: channel or aside) and skips aside entries.
  assert.deepEqual(byTarget['transcript-replies.mjs'].bindings.map(b => b.name), ['wE', 'ME', 'NE', 'FE', 'IE', 'HE', 'UE', 'WE']);
  assert.deepEqual(byTarget['transcript-replies.mjs'].officialExports, { IE: 'cl', WE: 'll', UE: 'pl', wE: 'El' });
  assert.deepEqual(byTarget['transcript-replies.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'c06cf64bb-CdJdJuVd.js:Sr=isEmptyProvisionalEntry', 'c4d199b75-D3cQB-UP.js:C=userEntryKind', 'cb27dab29-B4WyL7_M.js:y=isTranscriptTextItem',
  ]);
  for (const [target, names, alias] of [['transcript-text-item.mjs', ['Fe'], { Fe: 'y' }], ['transcript-provisional.mjs', ['jy'], { jy: 'Sr' }],
    ['transcript-user-kind.mjs', ['ot'], { ot: 'C' }], ['path-tooltip-placement.mjs', ['t', 'n'], { t: 't', n: 'n' }]]) {
    assert.deepEqual(byTarget[target].bindings.map(b => b.name), names, target);
    assert.deepEqual(byTarget[target].officialExports, alias, target);
  }
  // E39: the path tooltip placement and body are the split-out cc5c56f5c t / n (2.42304.0 c0fbbe82d mn / hn).
  assert.equal(byTarget['path-tooltip-placement.mjs'].source, 'cc5c56f5c-BoRtnbt1.js');
  // The context ring EX / SX (2.42304.0 KV / UV) is React Compiler output: memo + the view-tabs memo helpers.
  assert.deepEqual(byTarget['usage-ring.mjs'].bindings.map(b => b.name), ['pX', 'mX', 'hX', '_X', 'xX', 'SX', 'CX', 'wX', 'EX']);
  assert.deepEqual(byTarget['usage-ring.mjs'].officialExports, { EX: 'O', SX: 'A' });
  assert.deepEqual(byTarget['usage-ring.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'shared-frame-6jtSkIit.js:$f=memoChanged2', 'shared-frame-6jtSkIit.js:ip=reactMemoCache', 'shared-frame-6jtSkIit.js:lp=memoStore4',
    'shared-frame-6jtSkIit.js:np=memoChanged5', 'shared-frame-6jtSkIit.js:sp=memoStore2', 'shared-frame-6jtSkIit.js:tp=memoChanged4',
    'shared-frame-6jtSkIit.js:up=memoStore5', 'vendor-frame-CnSY1sxv.js:Ha=jsx', 'vendor-frame-CnSY1sxv.js:Ua=jsxs', 'vendor-frame-CnSY1sxv.js:so=memo',
  ]);
  assert.deepEqual(byTarget['composer-row-chin.mjs'].bindings.map(b => b.name), ['D$', 'H6']);
  assert.equal(byTarget['composer-tokens.mjs'].officialExports.Lg, 'Ud');
  assert.deepEqual(byTarget['keyboard-activation.mjs'].bindings.map(b => b.name), ['pR']);
  assert.deepEqual(byTarget['keyboard-activation.mjs'].officialExports, { pR: 'vr' });
  const routed = kind => manifest.modules.flatMap(m => m.imports.filter(i => i.kind === kind).map(i => `${i.via}=${i.name}`));
  // Host adapters: react-intl (useIntl, FormattedMessage), the tile wrappers' tile set (shared-2 th) and path hover card
  // (c856385e2 Kn). 3.6556.2: the page drop scrim's portal root is view-tabs CdsPortalRoot, so its stand-in is gone.
  assert.deepEqual([...new Set(routed('adapter'))].sort(), ['c856385e2-aEyDzrcK.js:a=ComposerPathHoverCard', 'shared-2-TF8v67kg.js:ry=ComposerAttachmentTiles',
    'vendor-intl-DYfox5Co.js:l=ComposerMessage', 'vendor-intl-DYfox5Co.js:p=useComposerIntl']);
  assert.equal(Adapters.ComposerPageDropSurface, undefined, 'the throwing drop surface stand-in is removed');
  const viewTabs = new Set(routed('view-tabs'));
  for (const pin of ['shared-frame-6jtSkIit.js:Eu=CdsButton', 'shared-frame-6jtSkIit.js:od=CdsIcon', 'shared-frame-6jtSkIit.js:Kl=CdsTooltip',
    'shared-frame-6jtSkIit.js:Ku=CdsShortcut', 'shared-frame-6jtSkIit.js:ql=CdsTooltipProvider', 'shared-frame-6jtSkIit.js:bi=CdsSplitDropdownButton',
    'shared-frame-6jtSkIit.js:Hf=cdsClassNames', 'vendor-frame-CnSY1sxv.js:Ba=clsx', 'shared-frame-6jtSkIit.js:$l=CdsPortalRoot',
    // The contexts the shell's closure reads are view-tabs instances (R4g-composer CP1 / E4).
    'shared-frame-6jtSkIit.js:Sa=CdsModeStoreContext', 'shared-frame-6jtSkIit.js:Du=CdsButtonIconSizeContext', 'shared-frame-6jtSkIit.js:bd=CdsSurfaceContext',
    'shared-frame-6jtSkIit.js:Ma=CdsNaturalImageTilesContext', 'shared-frame-6jtSkIit.js:cu=useCdsLayerAwareZIndex',
    // E3: the React Compiler cache and its helpers come from view-tabs (one helper copy for every compiled closure).
    'shared-frame-6jtSkIit.js:ip=reactMemoCache', 'shared-frame-6jtSkIit.js:Qf=memoChanged1', 'shared-frame-6jtSkIit.js:op=memoStore1'])
    assert.ok(viewTabs.has(pin), pin);
  // The compiler runtime itself is never imported directly: J9 is view-tabs reactMemoCache (vendor-frame Oo underneath).
  assert.ok(!manifest.modules.some(m => m.imports.some(i => i.from === 'react/compiler-runtime')));
  assert.equal(manifest.modules.flatMap(m => m.imports).filter(i => !['react', 'generated', 'view-tabs', 'adapter'].includes(i.kind)).length, 0);
  // No React context is copied any more: the layer base the pane drop halo reads is view-tabs CdsLayerBaseContext (E4).
  assert.deepEqual(manifest.modules.filter(m => m.contextCopies).map(m => m.target), []);
  const copied = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}:${b.name}`)));
  for (const [name, { file, local }] of Object.entries(ViewTabs.publicNames)) assert.ok(!copied.has(`${file}:${local}`), `${name} is copied instead of imported`);
  assert.deepEqual(byTarget['chat-composer-shell.mjs'].imports.filter(i => i.substitute).map(i => `${i.via}=${i.name} (${i.substitute})`),
    ['shared-2-TF8v67kg.js:ry=MessageAttachments (th → eh)']);
  assert.deepEqual(byTarget['chat-composer-shell.mjs'].officialExports, { vm: 'Ll', Sm: 'Il', hm: 'zl', mm: 'Bl', Vm: 'Pl', Bm: 'Nl' });
  // cm's placeholder pieces — shared-26 uo / fo / ho / go / _o, shared-5 Vm / Bm, shared-28 nw.
  assert.deepEqual(Object.fromEntries(['uo', 'fo', 'ho', 'go', '_o'].map(k => [k, byTarget['chat-composer-layout.mjs'].officialExports[k]])),
    { uo: 'Jg', fo: 'Lg', ho: 'Rg', go: 'zg', _o: 'Ag' });
  assert.deepEqual(byTarget['chat-composer-placeholder-timing.mjs'].bindings.map(b => b.name), ['nw']);
  assert.deepEqual(byTarget['chat-composer-placeholder-timing.mjs'].officialExports, { nw: 'Ea' });
  // Oj's glyph pieces: cfca6870a p (now a function of the fizzy-lake icons part) / h / m / g / f.
  assert.deepEqual(byTarget['composer-glyph.mjs'].bindings.map(b => b.name), ['f', 'p', 'm', 'h', 'g']);
  assert.deepEqual(byTarget['composer-glyph.mjs'].officialExports, { p: 'a', h: 'r', m: 'i', g: 't', f: 'n' });
  assert.deepEqual(byTarget['composer-add-menu.mjs'].bindings.map(b => b.name), ['sM', 'dM', 'fM']);
  assert.deepEqual(byTarget['composer-add-menu.mjs'].imports, []);
  assert.deepEqual(byTarget['menu-collision-padding.mjs'].bindings.map(b => b.name), ['wU']);
  assert.deepEqual(byTarget['menu-collision-padding.mjs'].officialExports, { wU: 'Sn' });
  assert.deepEqual(byTarget['shortcut-caps.mjs'].exports, { wc: 'shortcutCaps', Sc: 'parseShortcutKeys', yc: 'ownEntry' });
  // The card-tokens module lost nM (placeholderShapeResetClass): 3.6556.2 qM passes trailingNotch "pad" instead.
  assert.ok(!Object.values(byTarget['composer-card-tokens.mjs'].exports).includes('placeholderShapeResetClass'));
  for (const name of ['ComposerTooltip', 'ComposerShortcut', 'ComposerSplitDropdownButton']) assert.equal(Adapters[name], undefined, `${name} stand-in removed`);
  // D1: view-tabs only by semantic name; D0: own verify-gen script that prepare-ui discovers.
  for (const file of [...(await fs.readdir(generated)).filter(f => f.endsWith('.mjs')).map(f => path.join(generated, f)), path.join(app, 'src/source-composer-current-adapters.jsx')]) {
    const text = await fs.readFile(file, 'utf8');
    for (const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']*view-tabs[^"']*)["']/g))
      for (const name of match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean))
        assert.ok(ViewTabs.publicNames[name], `${path.basename(file)} imports view-tabs ${name} by a non-semantic name`);
  }
  assert.equal(await fs.readFile(path.join(app, 'scripts/verify-gen-code-composer.mjs'), 'utf8'),
    "import { extractCodeComposer } from './extract-code-composer.mjs';\nawait extractCodeComposer({ check: true });\n");
});

test('every generated composer module loads under SSR', async () => {
  for (const name of (await fs.readdir(generated)).filter(f => f.endsWith('.mjs'))) {
    const module = await load(name);
    assert.ok(Object.keys(module).length > 0, name);
  }
});

// ---------------------------------------------------------------- tokens, verbatim
test('class tokens are the official strings, verbatim in the shipped chunks', async () => {
  const Tokens = await load('composer-tokens.mjs'), Card = await load('composer-card-tokens.mjs');
  const Glyph = await load('composer-glyph.mjs'), Ids = await load('composer-testids.mjs');
  const Surface = await load('transcript-surface.mjs'), Placement = await load('path-tooltip-placement.mjs');
  const raw = async file => fs.readFile(path.join(reference, file), 'utf8');
  const shared6 = await raw('shared-6-sd9jbJqs.js'), card = await raw('c227f4d5e-B-FYKrwT.js');
  const expected = {
    composerCardSizeClass: '[--cds-h-control:calc(1.75rem*var(--cds-rem-scale,1))] [--cds-radius-composer:calc(0.875rem*var(--cds-rem-scale,1))]',
    composerRowControlClass: '[--cds-h-control:calc(1.5rem*var(--cds-rem-scale,1))] [--cds-pad-md:calc(0.375rem*var(--cds-rem-scale,1))] [--cds-font-size-body:calc(0.8125rem*var(--cds-rem-scale,1))] [--cds-leading-body:calc(1.25rem*var(--cds-rem-scale,1))]',
    composerRowChinClass: '-mt-1 compact:-mt-1 comfortable:-mt-1.5 -mb-2.5',
    composerRowChinSlotClass: 'block h-6',
    composerChinTrailingClass: 'grid min-w-0 grid-flow-col auto-cols-[minmax(0,max-content)] items-center',
    composerTrailingControlsClass: 'flex items-center gap-2',
    composerRowLeadingClass: 'flex items-center ms-0.5',
    composerRowTrailingInsetClass: 'compact:me-1',
    composerPetSlotClass: '-mb-1.5 compact:-mb-1.5 comfortable:-mb-2',
    environmentBarClass: 'pt-1 compact:pt-1 comfortable:pt-0.5 -mb-0.5',
    environmentBarInsetClass: 'px-2.5',
    environmentBarLineClass: 'absolute inset-x-0 bottom-1.5 ps-4 pe-20 text-footnote',
  };
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(Tokens[name], value, name);
    assert.ok(shared6.includes(JSON.stringify(value)), `${name} verbatim in shared-6`);
  }
  // d_ = `${s_} …`, the presets card rootClassName (cc43287c9 Hc).
  assert.equal(Tokens.composerCardRootClass, `${expected.composerCardSizeClass} [--cmp-font-size:var(--prompt-text-size)] [--cmp-line-height:var(--prompt-line-height)]`);
  assert.ok(shared6.includes(' [--cmp-font-size:var(--prompt-text-size)] [--cmp-line-height:var(--prompt-line-height)]`'));
  assert.deepEqual(Tokens.environmentBarResponsive, {
    row: '@max-[28.75rem]:flex-wrap', chips: '@max-[28.75rem]:basis-full', pickers: '@max-[28.75rem]:flex-wrap',
    trailing: '@max-[28.75rem]:basis-0 @max-[28.75rem]:grow @max-[28.75rem]:justify-end', ghost: 'h-6 @max-[28.75rem]:h-13.5',
  });
  const cardExpected = {
    sendCellClass: 'grid shrink-0 items-center justify-items-end', sendCellLayerClass: 'col-start-1 row-start-1 flex',
    bashModeRingClass: 'inset-ring-1 inset-ring-pro',
    shelfStartProperty: '--epitaxy-shelf-start', shelfStartPaddingClass: 'ltr:ps-[var(--epitaxy-shelf-start,0px)]',
    suggestionGhostClass: 'italic text-muted-as-secondary',
    submitLayerClass: 'col-start-1 row-start-1 flex cursor-default items-center justify-end',
    submitLayerEnterClass: 'motion-safe:animate-[cds-fade-in_0.12s_ease-out_0.08s_backwards]',
    submitLayerExitClass: 'pointer-events-none invisible opacity-0 [transition:visibility_0s_linear_80ms] motion-safe:[transition:opacity_80ms_ease-out,visibility_0s_linear_80ms]',
  };
  for (const [name, value] of Object.entries(cardExpected)) {
    assert.equal(Card[name], value, name);
    assert.ok(card.includes(JSON.stringify(value)), `${name} verbatim in c227f4d5e`);
  }
  assert.equal(Card.shelfStartInset, 4);
  assert.equal(Card.stopSendGuardMs, 500);
  assert.equal(Card.strayEnterWindowMs, 500);
  // 3.6556.2 cfca6870a p: a call, "flex scale-90" unless the fizzy-lake icons part is on (never: shared-52 Qm = [], E12).
  assert.equal(typeof Glyph.sendGlyphBoxClass, 'function');
  assert.equal(Glyph.sendGlyphBoxClass(), 'flex scale-90');
  assert.equal(Card.placeholderShapeResetClass, undefined, 'nM is gone in 3.6556.2');
  assert.ok(!card.includes('[shape-outside:none]'));
  assert.deepEqual(Glyph.dockGlyphProps, { size: 'base', dockGlyph: true });
  assert.equal(Ids.sendTestId, 'code-prompt-send');
  assert.equal(Ids.stopTestId, 'code-prompt-stop');
  assert.equal(Surface.transcriptSurfaceClass, 'bg-[var(--epitaxy-transcript-surface,var(--cds-surface-1))]');
  assert.deepEqual(Placement.pathTooltipPlacement, { side: 'bottom', align: 'start', className: 'max-w-[min(480px,var(--available-width))]' });
  const Bar = await load('environment-bar.mjs');
  // 3.6556.2 r8: the landing-texture variants are gone with the texture (E10); s0 is gone too.
  assert.equal(Bar.environmentChipClass, `rounded ${Surface.transcriptSurfaceClass}`);
  assert.equal(Bar.environmentLineSurfaceClass, undefined);
  assert.equal(Bar.environmentBarHysteresis, 2);
});

// ---------------------------------------------------------------- pure helpers
test('cM labels keys with the official cap table: glyphs joined on mac, spoken names joined with "+"', async () => {
  const { shortcutLabel: cM } = await load('composer-key-label.mjs');
  assert.equal((await load('composer-send-cell.mjs')).shortcutLabel, undefined, 'cM lives in composer-key-label.mjs only');
  assert.equal(cM('cmd+enter', true), '⌘⏎');
  assert.equal(cM('enter', true), '⏎');
  assert.equal(cM('cmd+enter', true, true), 'Command+Enter');
  assert.equal(cM('cmd+enter', false), 'Ctrl+Enter');
  assert.equal(cM('cmd+enter', false, true), 'Ctrl+Enter');
  // The sliced shared-frame cap table agrees with the host's (src/shortcut-model.mjs) on the composer's keys.
  const { shortcutCaps } = await load('shortcut-caps.mjs');
  const host = await server.ssrLoadModule('/src/shortcut-model.mjs');
  for (const mac of [true, false]) for (const keys of ['cmd+enter', 'enter', 'escape', 'cmd+alt+enter', 'shift+enter'])
    assert.deepEqual(shortcutCaps(keys, mac), host.shortcutCaps(keys, mac), `${keys} mac=${mac}`);
});

test('QX parses the /copy [N] argument: empty is the latest reply, a positive integer is N, anything else is refused', async () => {
  const { parseCopyReplyCount: QX } = await load('copy-reply-arg.mjs');
  assert.equal(QX(''), 1);
  assert.equal(QX('2'), 2);
  assert.equal(QX('12'), 12);
  for (const bad of ['0', 'x', '-1', '1.5', '02', ' 2', '2 '] ) assert.equal(QX(bad), null, JSON.stringify(bad));
});

// A minimal element tree: contains/closest over parent links, checkVisibility per element.
function fakeDocument() {
  const document = { activeElement: null };
  const element = ({ tag = 'div', role, cds, contentEditable, visible = true, parent = null } = {}) => {
    const node = { tag, role, cds, contentEditable, parent, ownerDocument: document, checkVisibility: () => visible };
    node.contains = other => { for (let n = other; n; n = n.parent) if (n === node) return true; return false; };
    node.matches = selector => selector.split(',').map(s => s.trim()).some(part => {
      if (part === tag) return true;
      if (part === '[contenteditable=""]') return contentEditable === '';
      if (part === '[contenteditable="true"]') return contentEditable === 'true';
      const roleMatch = part.match(/^\[role="([^"]+)"\]$/);
      if (roleMatch) return role === roleMatch[1];
      const cdsMatch = part.match(/^\[data-cds="([^"]+)"\]$/);
      if (cdsMatch) return cds === cdsMatch[1];
      return false;
    });
    node.closest = selector => { for (let n = node; n; n = n.parent) if (n.matches(selector)) return n; return null; };
    return node;
  };
  return { document, element };
}
test('Xj (scheduleFocus yieldsToUser) yields to a visible field or an overlay elsewhere, never to focus inside itself', async () => {
  const { focusBelongsElsewhere: Xj, editableFieldSelector } = await load('composer-focus-yield.mjs');
  const { focusInsideOverlay: wv, overlaySurfaceSelector } = await load('composer-dialog-focus.mjs');
  assert.equal(editableFieldSelector, 'input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  assert.equal(overlaySurfaceSelector, '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-radix-dialog-content], [data-cds="AskUserQuestion"]');
  const { document, element } = fakeDocument();
  const body = element({ tag: 'body' });
  const composer = element({ contentEditable: 'true', parent: body });
  const inner = element({ tag: 'span', parent: composer });
  const search = element({ tag: 'input', parent: body });
  const hidden = element({ tag: 'textarea', parent: body, visible: false });
  const plain = element({ tag: 'button', parent: body });
  const dialog = element({ role: 'dialog', parent: body });
  const dialogButton = element({ tag: 'button', parent: dialog });
  const ask = element({ cds: 'AskUserQuestion', parent: body });
  const askOption = element({ tag: 'button', parent: ask });
  document.activeElement = null; assert.equal(Xj(composer), false, 'nothing focused');
  document.activeElement = inner; assert.equal(Xj(composer), false, 'focus inside the composer');
  document.activeElement = search; assert.equal(Xj(composer), true, 'a visible input elsewhere');
  document.activeElement = hidden; assert.equal(Xj(composer), false, 'a field that is not visible');
  document.activeElement = plain; assert.equal(Xj(composer), false, 'a plain button is not a field');
  document.activeElement = dialogButton; assert.equal(Xj(composer), true, 'a button inside [role=dialog]');
  assert.equal(wv(composer), true);
  document.activeElement = askOption; assert.equal(wv(composer), true, 'AskUserQuestion surface');
  // The composer inside the dialog does not yield to its own dialog.
  const nested = element({ contentEditable: 'true', parent: dialog });
  document.activeElement = dialogButton; assert.equal(wv(nested), false);
});

test('i0 signs the environment bar row by its texts, rounded mode width and wrap state', async () => {
  const { environmentBarSignature: i0 } = await load('environment-bar.mjs');
  assert.equal(i0({ textContent: 'repo' }, { textContent: 'Opus' }, { getBoundingClientRect: () => ({ width: 41.6 }) }, false), 'repo|Opus|42|false');
  assert.equal(i0({ textContent: 'repo' }, { textContent: 'Opus' }, null, true), 'repo|Opus|0|true');
});

// ---------------------------------------------------------------- SSR: the Send cell (lM)
function sendCell(Cell, props = {}) {
  const { composerTextStore } = Adapters;
  const hasText = props.hasText ?? false;
  return renderToStaticMarkup(h(Cell, {
    hasTextStore: composerTextStore(() => hasText), hasAttachments: false, submitBlocked: false, blockedSendPress: undefined,
    submitQueued: false, sendBusyLabel: undefined, busy: false, showStop: false, isBashMode: false, isCoarsePointer: false,
    plainEnterSends: true, draftStoreKey: 'draft', handleSubmit() {}, clickSteerOptions: () => ({}), handleStopClick() {},
    stopClickAtRef: { current: 0 }, enableQueueVsSteer: true, swapToSendOnDraft: false, enableForkSubmit: false,
    forkSubmitLabel: undefined, stayOnDraftHint: false, escapeClaimed: false, cmdEnterClaimed: false, sendOnDraftOnly: true,
    idleSendAction: null, ...props,
  }));
}
test('SSR: sendOnDraftOnly with an empty draft keeps the trailing controls and an inert size placeholder, and no Send', async () => {
  const { ComposerSendCell } = await load('composer-send-cell.mjs');
  const html = sendCell(ComposerSendCell);
  assert.ok(html.startsWith('<div data-testid="code-prompt-trailing-controls" class="flex items-center gap-2"><div data-testid="code-prompt-send-cell" class="grid shrink-0 items-center justify-items-end">'), html);
  assert.ok(html.includes('<div aria-hidden="true" inert="" class="col-start-1 row-start-1 flex invisible"><span class="size-control"></span></div>'), html);
  assert.doesNotMatch(html, /code-prompt-send"/);
  assert.doesNotMatch(html, /code-prompt-stop/);
});
test('SSR: a draft shows the official Send button with the md glyph box; running shows Stop', async () => {
  const { ComposerSendCell } = await load('composer-send-cell.mjs');
  const draft = sendCell(ComposerSendCell, { hasText: true });
  assert.match(draft, /data-testid="code-prompt-send"/);
  assert.match(draft, /<span class="flex scale-90">/);
  assert.match(draft, /aria-label="Send"/);
  assert.match(draft, /data-cds="Button"/, 'the view-tabs CdsButton');
  assert.match(draft, /class="col-start-1 row-start-1 flex cursor-default items-center justify-end"/, 'Ij send layer');
  const running = sendCell(ComposerSendCell, { busy: true, showStop: true });
  assert.match(running, /data-testid="code-prompt-stop"/);
  assert.match(running, /aria-label="Stop"/);
  assert.doesNotMatch(running, /code-prompt-send"/, 'empty draft while running: the crossfade shows Stop only');
  // Without sendOnDraftOnly the idle action sits before the crossfade in a plain flex row (no trailing-controls cell).
  // `!z && T !== void 0 && M === "alone" ? null`: an idle-action slot (even an empty one) replaces a lone idle Send.
  const legacy = sendCell(ComposerSendCell, { sendOnDraftOnly: false, idleSendAction: undefined });
  assert.ok(legacy.startsWith('<div class="flex items-center gap-xs">'), legacy);
  assert.match(legacy, /data-testid="code-prompt-send"/);
  assert.equal(sendCell(ComposerSendCell, { sendOnDraftOnly: false, idleSendAction: null }), '<div class="flex items-center gap-xs"></div>');
});
test('SSR: the coarse-pointer placeholder is the original CDS SplitDropdownButton (view-tabs ej), the joined group', async () => {
  const { ComposerSendCell } = await load('composer-send-cell.mjs');
  const html = sendCell(ComposerSendCell, { isCoarsePointer: true });
  assert.match(html, /<div aria-hidden="true" inert="" class="col-start-1 row-start-1 flex invisible"><div data-cds="SplitDropdownButton" style="--cds-split-inset:[^"]*" role="group" aria-label="Send" class="relative inline-flex w-fit shrink-0 items-stretch rounded-\[calc\(var\(--cds-radius\)\+var\(--cds-button-radius-add,0px\)\)\] group\/split /, '3.6556.2 CDS: the split radius adds --cds-button-radius-add');
  assert.match(html, /<div data-cds-segment="" class="contents">/, 'NA variant "joined"');
  assert.match(html, /aria-label="More send options"/, 'lM menuLabel, not the CDS default "More options"');
});

// ---------------------------------------------------------------- SSR: the environment bar (l0 / u0)
test('SSR: the environment bar is the official l0 DOM with the original test ids and slots', async () => {
  const { EnvironmentBar, EnvironmentChip } = await load('environment-bar.mjs');
  const Tokens = await load('composer-tokens.mjs');
  const place = h(EnvironmentChip, { icon: 'Folder', label: 'Choose…', placeholder: true });
  const html = renderToStaticMarkup(h(EnvironmentBar, { place, mode: null, line: null, lineEl: null, trailing: h('span', null, 'Opus') }));
  assert.ok(html.startsWith(`<div data-testid="epitaxy-environment-bar" class="@container flex w-full min-w-0 flex-col ${Tokens.environmentBarClass}">`), html);
  assert.ok(html.includes(`data-testid="environment-bar-row" class="flex min-h-6 w-full min-w-0 items-center gap-x-1 gap-y-1.5 ${Tokens.environmentBarResponsive.row} ${Tokens.environmentBarInsetClass} ${Tokens.composerRowControlClass}"`), html);
  assert.match(html, /data-testid="environment-bar-place" class="flex shrink rounded /);
  assert.match(html, /data-testid="environment-bar-mode" class="flex shrink-0 empty:hidden rounded /);
  assert.match(html, /data-testid="environment-bar-trailing" class="ms-auto flex items-center gap-1 @max-\[28.75rem\]:basis-0/);
  assert.doesNotMatch(html, /environment-bar-second/);
  assert.doesNotMatch(html, /environment-bar-line/, 'no portal target, no line');
  // u0: the placeholder chip is a ghost CdsButton with the muted label, and keeps its text (not iconOnly on first render).
  assert.match(html, /data-placeholder=""/);
  assert.match(html, /<span class="flex min-w-0 max-w-64 items-center gap-xs text-muted-control"><span class="line-clamp-1 min-w-\[5ch\]/);
  assert.match(html, />Choose…<\/span>/);
  assert.doesNotMatch(html, /data-icon-only/);
});
