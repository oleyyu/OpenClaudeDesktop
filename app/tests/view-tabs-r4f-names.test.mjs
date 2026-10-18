import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

// R4f-graph G1 (D24): semantic names added to the shared view-tabs graph for the
// proposal group card (Popover / Switch / InfoTooltip / Shimmer), the R3b-transcript
// stand-ins (Banner / Collapsible / DisabledReason / useDirection) and the R4e plugin
// Overview card (Card). Reads only the local reference copy and the generated output.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/view-tabs');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const frame = 'shared-frame-BfjMqbuN.js', vendorFrame = 'vendor-frame-DfPJ1QmD.js';
// [semantic name, file, 2.42304.0 local, official export alias, features of the local's declaration].
// The first feature occurs exactly once in the installed chunk (grep -c -F style).
const added = [
  ['CdsPopover', frame, 'nE', 'Zi', ['createHandle:Ce}', 'Popup:KT,']],
  ['CdsSwitch', frame, 'dD', 'Fi', ['"data-cds":"Switch"', 'disabledReasonSide:r']],
  ['CdsInfoTooltip', frame, 'oE', 'Xi', ['Z("moreInfo","More info")', '"data-cds":"InfoTip"', 'H(nE.Popup,']],
  ['CdsShimmer', frame, 'Aj', 'oi', ['active:t=!0,variant:n="default"', '"data-cds":"ShimmerText"']],
  ['CdsBanner', frame, 'gT', 'oa', ['"data-cds":"Banner"', '"data-prose-box":""', 'T(Qw.Root,']],
  ['CdsCollapsible', frame, 'Qw', 'ca', ['Root:qw,Trigger:Xw,Panel:']],
  ['CdsDisabledReason', frame, 'Qp', 'Ec', ['closeOnClick:!1,openOnHandedBackFocus:!0', 'H(Yc,{id:d,reason:e})']],
  ['useDirection', vendorFrame, 'Td', 'Wn', ['return N(wd)?.direction??"ltr"']],
  ['CdsCard', frame, 'yu', 'ol', ['Object.assign(pu,{Link:hu,Media:vu})']],
];
// The names published before this step, by local: none may move or disappear.
const prior = ('ViewTabBar:Y useViewTabIconSize:P viewTabSizes:R viewTabLabels:oe ViewTab:ge ViewTabOverflowItem:ce '
  + 'ViewTabOverflowMenu:se useViewTabOverflow:xe DirectionContext:wd cva:In CdsDensityContext:la CdsButton:$l CdsIcon:Jo '
  + 'CdsBadge:cs CdsConfirmationDialog:M_ CdsDropdown:EC cdsClassNames:X CdsTooltipProvider:Sm CdsSegmentedControl:hO '
  + 'CdsPulse:eN CdsPreviewCard:vR CdsPreviewCardContext:fR CdsPreviewCardTrigger:mR isFizzyLakePartEnabled:jf '
  + 'useEventCallback:_e useMergedRefs:Oe CdsPage:k CdsTabs:ir useRowSelection:O CdsSelectableTable:I SessionsRowLayout:i '
  + 'SessionsDateLayout:a SessionsMoreButton:o SessionsMenuContext:A SessionsRowRail:D SessionsActionsRail:O '
  + 'SessionsArchivedBadge:r SessionsHighlight:r findSessionTitleMatch:e CdsRelativeTime:oX mergeProps:Kt clsx:ge '
  + 'CdsTooltip:Zp CdsShortcut:ks CdsSplitDropdownButton:ej CdsCheckbox:wA CdsTextInput:tx CdsContextMenu:iD '
  + 'CdsMenuCreateHandle:bm CdsOverflowTooltip:gm CdsLayerProvider:Hd CdsDialog:k_ CdsRoot:Za').split(' ').map(pair => pair.split(':'));

let server; const loaded = new Map();
before(async () => {
  server = await createServer({configFile:false, root:app, plugins:[react()], server:{middlewareMode:true, hmr:false, ws:false, watch:null}, appType:'custom', logLevel:'error'});
  for (const file of [frame, vendorFrame]) loaded.set(file, await server.ssrLoadModule(`/src/generated/view-tabs/${file}`));
});
after(() => server?.close());
const exported = name => loaded.get(manifest.publicNames[name].file)[name];
const h = React.createElement, render = element => renderToStaticMarkup(element);
const provider = child => h(exported('CdsTooltipProvider'), {}, child);

test('R4f names point at the 2.42304.0 declarations their features identify, under the official export alias', () => {
  for (const [name, file, local, exportName, features] of added) {
    assert.deepEqual(manifest.publicNames[name], {file, local, export:exportName}, name);
    assert.ok(manifest.modules.find(m => m.source === file).bindings.includes(local), name);
    const original = fs.readFileSync(path.join(reference, file), 'utf8');
    assert.equal(original.split(features[0]).length - 1, 1, `${name}: ${features[0]} must occur once in ${file}`);
    assert.match(original.slice(original.lastIndexOf('export{')), new RegExp(`[{,]${local} as ${exportName}[,}]`), name);
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    const declaration = text.split('\n').find(line => line.startsWith(`function ${local}(`) || line.startsWith(`var ${local}=`));
    assert.ok(declaration, `${name}: ${file} has no declaration of ${local}`);
    for (const feature of features) assert.ok(declaration.includes(feature), `${name}: ${local} lacks ${feature}`);
    assert.match(text.slice(text.lastIndexOf('\nexport {')), new RegExp(`[{,]${local} as ${name}[,}]`), name);
    assert.ok(name in loaded.get(file), name);
  }
});

test('every name published before R4f keeps its file and local; only new names are added', () => {
  for (const [name, local] of prior) assert.equal(manifest.publicNames[name]?.local, local, name);
  // R4g-composer CP1 (X7-07) appended the seven contexts extract-code-composer.mjs used to copy (its contextCopies is
  // empty now); tests/composer-cds-root.test.mjs pins them.
  const r4g = ['CdsNaturalImageTilesContext', 'CdsOwnerWindowContext', 'CdsLabelsContext', 'CdsModeStoreContext', 'CdsFizzyLakePartsContext', 'CdsSurfaceContext', 'CdsButtonIconSizeContext'];
  // R4i-graph GR1 (D46) appended the names the routines graphs import (tests/view-tabs-d46-names.test.mjs pins them):
  // the block of extract-view-tabs.mjs roots after its D46 header.
  const source = fs.readFileSync(path.join(app, 'scripts/extract-view-tabs.mjs'), 'utf8');
  const block = source.slice(source.indexOf('// R4i-graph GR1 (D46)'), source.indexOf('  // R4i-graph GR3:', source.indexOf('// R4i-graph GR1 (D46)')));
  // 2026-10-18 context-breakdown (D50) added one root inside this block, useInsideCdsTooltipProvider (shared-frame xm, the
  // session-rail-context chart meter reads bm through it); it is a new name, not a D46 one, so it is counted on its own.
  const contextBreakdown = ['useInsideCdsTooltipProvider'];
  const d46 = [...block.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]).filter(name => !contextBreakdown.includes(name));
  assert.equal(d46.length, 207);
  for (const name of contextBreakdown) assert.equal(manifest.publicNames[name]?.local, 'xm', name);
  // R4i-graph GR3 appended what the composer attachment tiles copied or stood in for (the Skeleton's two contexts, the
  // TextLink, the platform context and its reader); tests/composer-attachment-tiles.test.mjs pins their use.
  const gr3 = ['CdsSkeletonShimmerContext', 'CdsSkeletonElementContext', 'CdsTextLink', 'CdsPlatformContext', 'useCdsPlatform'];
  const gr3Block = source.slice(source.indexOf('  // R4i-graph GR3:'), source.indexOf('  // 2026-10-18 account avatar:', source.indexOf('  // R4i-graph GR3:')));
  assert.deepEqual([...gr3Block.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]), gr3);
  // 2026-10-18 (user ruling) appended the CDS Avatar (shared-frame uj, exported `si`) the sidebar account button draws.
  const accountAvatar = ['CdsAvatar'];
  const avatarBlock = source.slice(source.indexOf('  // 2026-10-18 account avatar:'), source.indexOf('\n];', source.indexOf('  // 2026-10-18 account avatar:')));
  assert.deepEqual([...avatarBlock.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]), accountAvatar);
  assert.equal(manifest.publicNames.CdsAvatar?.local, 'uj');
  assert.equal(manifest.publicNames.CdsAvatar?.export, 'si');
  const known = new Set([...prior.map(([name]) => name), ...added.map(([name]) => name), ...r4g, ...d46, ...gr3, ...contextBreakdown, ...accountAvatar]);
  assert.deepEqual(Object.keys(manifest.publicNames).filter(name => !known.has(name)), []);
  // The CdsRoot labels context (vn) is named only now that extract-code-composer.mjs no longer copies it.
  assert.equal(manifest.publicNames.CdsLabelsContext?.local, 'vn');
  // R4i-graph GR3: the only context extract-code-composer.mjs still copies is the layer base Vd (the pane drop halo's
  // z-index), which view-tabs holds back in pendingNames for mcp-app-card; none of the published contexts is copied.
  const composerSource = fs.readFileSync(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  const copies = composerSource.slice(composerSource.indexOf('\nconst contextCopies = {'), composerSource.indexOf('\n};\n', composerSource.indexOf('\nconst contextCopies = {')));
  // R4i-graph fix (review): this is a temporary exception to `contextCopies = {}`, not a new rule. It holds only while
  // view-tabs keeps CdsLayerBaseContext back because extract-mcp-app-card.mjs still slices its own Vd / Jd; once that
  // copy is gone (or the name is published) the table must be empty again.
  const layerBase = manifest.pendingNames.CdsLayerBaseContext;
  const mcpFrame = path.join(app, 'src/generated/mcp-app-card/shared-frame.mjs');
  const mcpCopiesVd = fs.existsSync(mcpFrame) && fs.readFileSync(mcpFrame, 'utf8').split('\nvar Vd = G(0);\n').length - 1 === 1;
  if (layerBase && layerBase.waitsFor.includes('mcp-app-card') && mcpCopiesVd) {
    assert.deepEqual([...copies.matchAll(/\n    ([\w$]+): '/g)].map(m => m[1]), ['Vd']);
    assert.equal(layerBase.local, 'Vd');
    assert.deepEqual(layerBase.waitsFor, ['mcp-app-card', 'code-composer']);
    assert.deepEqual(manifest.pendingNames.useCdsLayerAwareZIndex?.waitsFor, ['mcp-app-card', 'code-composer']);
  } else {
    assert.match(composerSource, /\nconst contextCopies = \{\};\n/, 'mcp-app-card no longer holds Vd back: drop the Vd copy and publish CdsLayerBaseContext');
  }
  // No new module and no new top-level initializer: naming these adds declarations only.
  assert.equal(manifest.modules.length, 28);
  assert.deepEqual(manifest.modules.filter(m => m.initializers.length).map(m => [m.source, m.initializers.length]), [[vendorFrame, 1]]);
});

test('CdsSwitch renders the original Base UI switch with data-cds="Switch" and its disabled-reason wrapper', () => {
  const on = render(provider(h(exported('CdsSwitch'), {checked:true, onCheckedChange(){}, 'aria-label':'Auto'})));
  assert.match(on, /role="switch"/);
  assert.match(on, /data-cds="Switch"/);
  assert.match(on, /aria-checked="true"/);
  const disabled = render(provider(h(exported('CdsSwitch'), {checked:false, onCheckedChange(){}, disabled:true, disabledReason:'Not available', 'aria-label':'Auto'})));
  assert.match(disabled, /data-cds-disabled-reason-wrapper=""/);
  assert.match(disabled, /data-cds="Switch"/);
  assert.match(disabled, /Not available/);
});

test('CdsBanner, CdsCard and CdsCollapsible render their original CDS markup', () => {
  const banner = render(provider(h(exported('CdsBanner'), {variant:'warning'}, 'Low disk space')));
  assert.match(banner, /^<div data-cds="Banner" data-prose-box="" data-icon-layout="first-line" data-cta-layout="inline" data-action-align="first-line" role="status"/);
  assert.match(banner, /data-cds="Icon"/);
  assert.match(banner, /Low disk space/);
  const card = exported('CdsCard');
  assert.equal(typeof card.render, 'function');
  assert.equal(typeof card.Link.render, 'function');
  assert.equal(typeof card.Media.render, 'function');
  assert.match(render(h(card, {}, 'Body')), /^<div data-cds="Card"[^>]*><span aria-hidden="true" class="[^"]*"><\/span><div data-cds-card-body="" class="[^"]*">Body<\/div><\/div>$/);
  const collapsible = exported('CdsCollapsible');
  assert.deepEqual(Object.keys(collapsible), ['Root', 'Trigger', 'Panel']);
  const open = render(h(collapsible.Root, {defaultOpen:true}, h(collapsible.Trigger, {}, 'Details'), h(collapsible.Panel, {}, 'More')));
  assert.match(open, /^<div data-open="" data-cds="Collapsible">/);
  assert.match(open, /<button[^>]*aria-expanded="true"/);
  assert.match(open, /More/);
});

test('CdsPopover, CdsInfoTooltip, CdsShimmer, CdsDisabledReason and useDirection are the original values', () => {
  const popover = exported('CdsPopover');
  assert.deepEqual(Object.keys(popover), ['Root', 'Trigger', 'Popup', 'Title', 'Description', 'Close', 'Arrow', 'createHandle']);
  assert.match(render(h(popover.Root, {}, h(popover.Trigger, {}, 'Options'))), /^<button type="button"[^>]*aria-haspopup="dialog" aria-expanded="false"[^>]*>Options<\/button>$/);
  assert.equal(typeof popover.createHandle(), 'object');
  const info = render(provider(h(exported('CdsInfoTooltip'), {content:'Why this is off'})));
  assert.match(info, /^<button[^>]*data-cds="InfoTip"/);
  assert.match(info, /aria-label="More info"/);
  assert.match(render(h(exported('CdsShimmer'), {}, 'Thinking')), /^<span data-cds="ShimmerText" data-shimmering="true"[^>]*>Thinking/);
  assert.equal(render(h(exported('CdsShimmer'), {active:false, className:'x'}, 'Idle')), '<span data-cds="ShimmerText" data-shimmering="false" class="x">Idle</span>');
  const reason = render(provider(h(exported('CdsDisabledReason'), {reason:'Busy'}, h('button', {type:'button', disabled:true}, 'Go'))));
  assert.match(reason, /data-cds-disabled-reason-wrapper=""/);
  assert.match(reason, /tabindex="0"/);
  assert.match(reason, /Busy/);
  const direction = () => exported('useDirection')();
  assert.equal(render(h(direction)), 'ltr');
  // The hook reads the DirectionContext view-tabs already publishes (one Base UI instance).
  assert.equal(render(h(exported('DirectionContext').Provider, {value:{direction:'rtl'}}, h(direction))), 'rtl');
});
