// composer-gen (research/composer.md §1.2/§4.1/§5): the Code composer pieces are original 2.42304.0 bindings extracted by
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
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
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
test('generator output matches the pinned 2.42304.0 sources (check mode); imports resolve to React, itself, view-tabs semantic names or the adapter', async () => {
  manifest = await extractCodeComposer({ check: true });
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.equal(manifest.generator, 'scripts/extract-code-composer.mjs');
  assert.deepEqual(manifest.modules.map(m => m.target), [
    'composer-tokens.mjs', 'composer-testids.mjs', 'composer-glyph.mjs', 'owner-support.mjs', 'placeholder-fit.mjs', 'shortcut-caps.mjs',
    'transcript-surface.mjs', 'path-tooltip-placement.mjs', 'composer-card-tokens.mjs', 'composer-dialog-focus.mjs',
    'composer-focus-yield.mjs', 'composer-key-label.mjs', 'composer-send-cell.mjs',
    // R3-composer composer-copy-command: the transcript predicates and the /copy reply reader.
    'transcript-text-item.mjs', 'transcript-provisional.mjs', 'transcript-user-kind.mjs', 'transcript-replies.mjs',
    'copy-reply-arg.mjs', 'copy-reply-replies.mjs', 'environment-bar.mjs',
    // R3-composer composer-row-chin: the shared-8 context ring and the row chin's mode label / model class.
    'usage-ring.mjs', 'composer-row-chin.mjs',
    // R3-composer focus call sites (cc43287c9 Rte via cf74bc599 Da): shared-8 xM, consumed by src/composer-focus-handoff.mjs.
    'keyboard-activation.mjs',
    // R3-composer step 3 composer-shell: the CDS ChatComposer shell (shared-5 Af / jf / Df / Ef) over its closure.
    'chat-composer-react-version.mjs', 'chat-composer-frame.mjs', 'chat-composer-attachments.mjs', 'chat-composer-dock.mjs',
    'chat-composer-presence.mjs', 'chat-composer-layout.mjs', 'chat-composer-shell.mjs',
    // R4g-composer CP2 (X7-08): shared-28 Jx, the elementtiming mark of cm's placeholder span.
    'chat-composer-placeholder-timing.mjs',
    // R4g-composer CP3 (X7-09): the Add trigger's pure pieces (c227f4d5e Ej / Dj / Sj) and its popup's padding (shared-18 GR).
    'composer-add-menu.mjs', 'menu-collision-padding.mjs',
    // R4g-composer CP4 (X7-10, composer-12): c0fbbe82d's tile wrappers, the Code pane's experimental flags (shared-18 Ub),
    // and the one intake route (shared-52 mb / Dy, c98ab6e79 r, cc43287c9 aK).
    // R4i-graph GR3: the Video wrapper's object URL (shared-7 dC) and Vi's video name test (shared-28 bk) come first.
    'composer-object-url.mjs', 'composer-video-types.mjs',
    'composer-attachment-tiles.mjs', 'code-pane-experimental.mjs', 'composer-intake-split.mjs', 'composer-image-types.mjs', 'composer-intake-route.mjs',
    // R4i-graph GR3: the Code pane's drop zone (c4c113f6f f, cc43287c9 YI) and its drag-over state / halo (cc63499d2 u / d).
    'composer-drop-target.mjs', 'composer-pane-drop-zone.mjs',
  ]);
  assert.deepEqual((await fs.readdir(generated)).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.referenceVersion, '2.42304.0');
    assert.equal(module.sourceSha256, sha(await fs.readFile(path.join(reference, module.source))), module.source);
    assert.equal(module.sha256, sha(await fs.readFile(path.join(generated, module.target), 'utf8')), module.target);
    for (const entry of module.imports) {
      assert.ok(['react', 'generated', 'view-tabs', 'adapter'].includes(entry.kind), `${module.target}:${entry.local}`);
      if (entry.kind === 'adapter') {
        assert.ok(AdapterModules[entry.from], `${module.target}: adapter module ${entry.from}`);
        // ComposerAttachmentTiles is the tile set object (Hp's members); every other adapter is a component or hook.
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
  assert.deepEqual(byTarget['composer-send-cell.mjs'].bindings.map(b => b.name), ['QO', 'vA', 'Mj', 'Ij', 'sM', 'lM']);
  // R2 composer-send-cell: cM has its own pure module (the placeholder model reads it); c1c6ea9ac's overflow hook (Kf)
  // reads shared-25 fp (Af) / pp (Nf) through owner-support.
  assert.deepEqual(byTarget['composer-key-label.mjs'].bindings.map(b => b.name), ['cM']);
  assert.deepEqual(byTarget['placeholder-fit.mjs'].bindings.map(b => b.name), ['o']);
  assert.deepEqual(byTarget['placeholder-fit.mjs'].officialExports, { o: 't' });
  assert.deepEqual(byTarget['placeholder-fit.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'shared-25-DP8p7i1Z.js:Af=ownerDocument', 'shared-25-DP8p7i1Z.js:Nf=ownerResizeObserver', 'vendor-frame-DfPJ1QmD.js:Co=useState',
    'vendor-frame-DfPJ1QmD.js:So=useRef', 'vendor-frame-DfPJ1QmD.js:uo=useCallback', 'vendor-frame-DfPJ1QmD.js:yo=useLayoutEffect',
  ]);
  assert.equal(byTarget['owner-support.mjs'].officialExports.fp, 'Af');
  assert.deepEqual(byTarget['environment-bar.mjs'].bindings.map(b => b.name), ['n0', 'r0', 'i0', 'a0', 'o0', 's0', 'c0', 'l0', 'u0', 'y6', 'b6']);
  assert.deepEqual(byTarget['composer-focus-yield.mjs'].bindings.map(b => b.name), ['Yj', 'Xj']);
  assert.deepEqual(byTarget['copy-reply-arg.mjs'].bindings.map(b => b.name), ['QX']);
  // R3-composer: $X / eZ read c227f4d5e's predicates by their official export aliases (zs / Bs / Ws / nc), which read
  // cb27dab29 y (Pe), c06cf64bb _r (yu) and c4d199b75 C (ot); the folder tooltip body hn rides in path-tooltip-placement.
  assert.deepEqual(byTarget['copy-reply-replies.mjs'].bindings.map(b => b.name), ['$X', 'eZ']);
  assert.deepEqual(byTarget['copy-reply-replies.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'c227f4d5e-Ba-r--Rl.js:Bs=endsFinishedReply', 'c227f4d5e-Ba-r--Rl.js:Ws=replyItems', 'c227f4d5e-Ba-r--Rl.js:nc=replyText',
    'c227f4d5e-Ba-r--Rl.js:zs=isAssistantEntry',
  ]);
  assert.deepEqual(byTarget['transcript-replies.mjs'].bindings.map(b => b.name), ['cE', 'gE', '_E', 'yE', 'TE', 'EE', 'DE']);
  assert.deepEqual(byTarget['transcript-replies.mjs'].officialExports, { yE: 'zs', DE: 'Bs', EE: 'Ws', cE: 'nc' });
  assert.deepEqual(byTarget['transcript-replies.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'c06cf64bb-BE5q2vSr.js:_r=isEmptyProvisionalEntry', 'c4d199b75-BCsc0Miu.js:C=userEntryKind', 'cb27dab29-_H2_XKli.js:y=isTranscriptTextItem',
  ]);
  for (const [target, names, alias] of [['transcript-text-item.mjs', ['Pe'], { Pe: 'y' }], ['transcript-provisional.mjs', ['yu'], { yu: '_r' }],
    ['transcript-user-kind.mjs', ['ot'], { ot: 'C' }], ['path-tooltip-placement.mjs', ['mn', 'hn'], { mn: 'I', hn: 'L' }]]) {
    assert.deepEqual(byTarget[target].bindings.map(b => b.name), names, target);
    assert.deepEqual(byTarget[target].officialExports, alias, target);
  }
  // R3-composer composer-row-chin: KV / UV with their thresholds and the memo wrapper; rQ merges with view-tabs cdsClassNames.
  assert.deepEqual(byTarget['usage-ring.mjs'].bindings.map(b => b.name), ['PV', 'FV', 'IV', 'RV', 'HV', 'UV', 'WV', 'GV', 'KV']);
  assert.deepEqual(byTarget['usage-ring.mjs'].officialExports, { KV: 'v', UV: 'b' });
  assert.deepEqual(byTarget['usage-ring.mjs'].imports.map(i => `${i.via}=${i.name}`).sort(), [
    'vendor-frame-DfPJ1QmD.js:Ha=jsxs', 'vendor-frame-DfPJ1QmD.js:Va=jsx', 'vendor-frame-DfPJ1QmD.js:oo=memo',
  ]);
  assert.deepEqual(byTarget['composer-row-chin.mjs'].bindings.map(b => b.name), ['DK', 'rQ']);
  assert.equal(byTarget['composer-tokens.mjs'].officialExports.Eg, 'Ed');
  assert.deepEqual(byTarget['keyboard-activation.mjs'].bindings.map(b => b.name), ['xM']);
  assert.deepEqual(byTarget['keyboard-activation.mjs'].officialExports, { xM: 'Cr' });
  const routed = kind => manifest.modules.flatMap(m => m.imports.filter(i => i.kind === kind).map(i => `${i.via}=${i.name}`));
  // D24 (R3-graph named them): the CDS Tooltip / Shortcut / SplitDropdownButton are the view-tabs originals now; only
  // react-intl is still a host adapter.
  // R3-composer step 3: the shell's page drop scrim surface (gf, unreachable without onFileDrop) is the second adapter.
  // R4g-composer CP4 (X7-10): the tile wrappers' tile set (shared-2 Hp), path hover card (c856385e2 On) and FormattedMessage,
  // R4i-graph GR3: the tiles' failed-strip TextLink is view-tabs CdsTextLink now, no longer a refusing stand-in.
  assert.deepEqual([...new Set(routed('adapter'))].sort(), ['c856385e2-DVsjb2QL.js:i=ComposerPathHoverCard', 'shared-2-Cb74JByF.js:zg=ComposerAttachmentTiles',
    'shared-frame-BfjMqbuN.js:Fc=ComposerPageDropSurface', 'vendor-intl-Db7hDWRO.js:l=ComposerMessage',
    'vendor-intl-Db7hDWRO.js:p=useComposerIntl']);
  assert.deepEqual([...new Set(routed('view-tabs'))].sort(), [
    'shared-frame-BfjMqbuN.js:Hl=CdsIcon', 'shared-frame-BfjMqbuN.js:Oc=CdsTooltip', 'shared-frame-BfjMqbuN.js:Ol=CdsShortcut',
    'shared-frame-BfjMqbuN.js:cl=CdsButton', 'shared-frame-BfjMqbuN.js:kc=CdsTooltipProvider', 'shared-frame-BfjMqbuN.js:la=CdsDensityContext',
    'shared-frame-BfjMqbuN.js:li=CdsSplitDropdownButton', 'shared-frame-BfjMqbuN.js:xd=cdsClassNames', 'vendor-frame-DfPJ1QmD.js:za=clsx',
    // R4g-composer CP1 (X7-07): the seven contexts the shell's closure reads are view-tabs names now, no longer copies.
    'shared-frame-BfjMqbuN.js:Oa=CdsOwnerWindowContext', 'shared-frame-BfjMqbuN.js:da=CdsModeStoreContext', 'shared-frame-BfjMqbuN.js:hr=CdsFizzyLakePartsContext',
    'shared-frame-BfjMqbuN.js:ll=CdsButtonIconSizeContext', 'shared-frame-BfjMqbuN.js:nu=CdsSurfaceContext', 'shared-frame-BfjMqbuN.js:vn=CdsLabelsContext',
    'shared-frame-BfjMqbuN.js:xa=CdsNaturalImageTilesContext',
    // R4g-composer CP4: the shared-2 tiles' CDS Card and Badge, and the frame copies' twMerge join by its local name.
    'shared-frame-BfjMqbuN.js:ol=CdsCard', 'shared-frame-BfjMqbuN.js:Vl=CdsBadge', 'shared-frame-BfjMqbuN.js:X=cdsClassNames',
    // R4i-graph GR3: the Skeleton's two contexts (no longer copies), the failed strip's TextLink and the Video tile's platform.
    'shared-frame-BfjMqbuN.js:xu=CdsSkeletonShimmerContext', 'shared-frame-BfjMqbuN.js:Su=CdsSkeletonElementContext',
    'shared-frame-BfjMqbuN.js:Xc=CdsTextLink', 'shared-frame-BfjMqbuN.js:hu=useCdsPlatform',
  ].sort());
  // composer-shell (D1): nothing is imported from view-tabs by its minified name; what view-tabs holds without a name is
  // copied once. R4g-composer CP1: no React context is among the copies any more (the seven it listed — CdsRoot's xa / Oa /
  // vn / da / hr, the shell-provided Ea / Xl — are view-tabs names; tests/composer-cds-root.test.mjs).
  assert.equal(manifest.modules.flatMap(m => m.imports).filter(i => !['react', 'generated', 'view-tabs', 'adapter'].includes(i.kind)).length, 0);
  // R4g-composer CP4 copied the CDS Skeleton's two contexts (xu / Su); R4i-graph GR3 named them in view-tabs. The one copy
  // left is the layer base Vd the pane drop halo's z-index reads (view-tabs holds it back for mcp-app-card).
  assert.deepEqual(manifest.modules.filter(m => m.contextCopies).map(m => [m.target, Object.keys(m.contextCopies)]), [['chat-composer-frame.mjs', ['Vd']]]);
  assert.match(byTarget['chat-composer-frame.mjs'].contextCopies.Vd, /never above the Code session pane/);
  const copied = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}:${b.name}`)));
  for (const [name, { file, local }] of Object.entries(ViewTabs.publicNames)) assert.ok(!copied.has(`${file}:${local}`), `${name} is copied instead of imported`);
  assert.deepEqual(byTarget['chat-composer-shell.mjs'].imports.filter(i => i.substitute).map(i => `${i.via}=${i.name} (${i.substitute})`),
    ['shared-2-Cb74JByF.js:zg=MessageAttachments (Hp → Vp)']);
  assert.deepEqual(byTarget['chat-composer-shell.mjs'].officialExports, { Af: 'Ac', jf: 'kc', Df: 'Mc', Ef: 'Nc', Xf: 'Dc', Yf: 'Ec' });
  // R4g-composer CP2 (X7-08): cm's placeholder pieces — shared-26 Ja / Ya / Qa / $a / eo (shared-9 imports yh / ch / lh /
  // uh / th), shared-5 Xf / Yf (Dc / Ec), shared-28 Jx (Fi).
  assert.deepEqual(Object.fromEntries(['Ja', 'Ya', 'Qa', '$a', 'eo'].map(k => [k, byTarget['chat-composer-layout.mjs'].officialExports[k]])),
    { Ja: 'yh', Ya: 'ch', Qa: 'lh', $a: 'uh', eo: 'th' });
  assert.deepEqual(byTarget['chat-composer-placeholder-timing.mjs'].bindings.map(b => b.name), ['Jx']);
  assert.deepEqual(byTarget['chat-composer-placeholder-timing.mjs'].officialExports, { Jx: 'Fi' });
  // R4g-composer CP3 (X7-09): Oj's glyph box / icon tone / glyph size (cfca6870a a / n / r, c227f4d5e ry / ay / sy), its size
  // table, first row and accept list (pure, no imports), and shared-18 GR (xn, c227f4d5e zl).
  assert.deepEqual(byTarget['composer-glyph.mjs'].bindings.map(b => b.name), ['u', 'd', 'f', 'p', 'm']);
  assert.deepEqual(byTarget['composer-glyph.mjs'].officialExports, { d: 't', p: 'i', f: 'a', m: 'n', u: 'r' });
  assert.deepEqual(byTarget['composer-add-menu.mjs'].bindings.map(b => b.name), ['Sj', 'Ej', 'Dj']);
  assert.deepEqual(byTarget['composer-add-menu.mjs'].imports, []);
  assert.deepEqual(byTarget['menu-collision-padding.mjs'].bindings.map(b => b.name), ['GR']);
  assert.deepEqual(byTarget['menu-collision-padding.mjs'].officialExports, { GR: 'xn' });
  assert.deepEqual(byTarget['shortcut-caps.mjs'].exports, { Gs: 'shortcutCaps', Us: 'parseShortcutKeys', Bs: 'ownEntry' });
  assert.ok(byTarget['chat-composer-frame.mjs'].imports.some(i => i.via === 'shared-frame-BfjMqbuN.js:Us' && i.from === './shortcut-caps.mjs'), 'one copy of the key parser');
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
  const shared6 = await raw('shared-6-Cby4X-ms.js'), card = await raw('c227f4d5e-Ba-r--Rl.js');
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
    bashModeRingClass: 'inset-ring-1 inset-ring-pro', placeholderShapeResetClass: '[&_.ProseMirror]:before:[shape-outside:none]',
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
  assert.equal(Glyph.sendGlyphBoxClass, 'flex scale-90');
  assert.deepEqual(Glyph.dockGlyphProps, { size: 'base', dockGlyph: true });
  assert.equal(Ids.sendTestId, 'code-prompt-send');
  assert.equal(Ids.stopTestId, 'code-prompt-stop');
  assert.equal(Surface.transcriptSurfaceClass, 'bg-[var(--epitaxy-transcript-surface,var(--cds-surface-1))]');
  assert.deepEqual(Placement.pathTooltipPlacement, { side: 'bottom', align: 'start', className: 'max-w-[min(480px,var(--available-width))]' });
  const Bar = await load('environment-bar.mjs');
  assert.equal(Bar.environmentChipClass, `rounded ${Surface.transcriptSurfaceClass} [[data-landing-texture=canvas]~div_&]:rounded-none [[data-landing-texture=canvas]~div_&]:transform-gpu`);
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
  assert.match(html, /<div aria-hidden="true" inert="" class="col-start-1 row-start-1 flex invisible"><div data-cds="SplitDropdownButton" style="--cds-split-inset:[^"]*" role="group" aria-label="Send" class="relative inline-flex w-fit shrink-0 items-stretch rounded group\/split /);
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
