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
// Overview card (Card). Reads only the local reference copy and the generated output. Since the 3.6556.2 migration
// (w1-cds-viewtabs) the locals, export aliases and features are the 3.6556.2 ones; the semantic names are unchanged.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/view-tabs');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const frame = 'shared-frame-6jtSkIit.js', vendorFrame = 'vendor-frame-CnSY1sxv.js';
// [semantic name, file, 3.6556.2 local, official export alias, features of the local's declaration].
// The first feature occurs exactly once in the official chunk (grep -c -F style).
const added = [
  ['CdsPopover', frame, 'bk', 'ua', ['Arrow:qe,createHandle:Ce}', 'Popup:uk,']],
  ['CdsSwitch', frame, 'IA', 'Ki', ['disabledReasonSide:i,onKeyDown:a', 'disabledReason:r']],
  ['CdsInfoTooltip', frame, 'Tk', 'la', ['"aria-label":n,icon:r,size:i,side:a']],
  ['CdsShimmer', frame, 'zF', '_i', ['variant:u,delay:a,paused:o', 'active:c']],
  ['CdsBanner', frame, 'NO', 'ya', ['composerCalibration:p', 'dismissLabel:d']],
  ['CdsCollapsible', frame, 'fO', 'xa', ['Root:sO,Trigger:uO,Panel:']],
  ['CdsDisabledReason', frame, 'Zm', 'Wl', ['wrapperClassName:u,children:d}=e', 'hoverable:c']],
  ['useDirection', vendorFrame, 'un', 'Ia', ['F(ln)?.direction??"ltr"']],
  ['CdsCard', frame, 'cd', 'Tu', ['Object.assign(td,{Link:rd,Media:sd})']],
];
// The names published before this step, by local: none may move or disappear.
const prior = ('ViewTabBar:Re useViewTabIconSize:F viewTabSizes:le viewTabLabels:N ViewTab:ve ViewTabOverflowItem:se '
  + 'ViewTabOverflowMenu:ae useViewTabOverflow:Te DirectionContext:ln cva:Vn CdsDensityContext:ba CdsButton:Uu CdsIcon:us '
  + 'CdsBadge:Ps CdsConfirmationDialog:ab CdsDropdown:GT cdsClassNames:Q CdsTooltipProvider:xh CdsSegmentedControl:Vj '
  + 'CdsPulse:mL CdsPreviewCard:qU CdsPreviewCardContext:BU CdsPreviewCardTrigger:HU isFizzyLakePartEnabled:lp '
  + 'useEventCallback:ve useMergedRefs:Te CdsPage:_ CdsTabs:Qr useRowSelection:T CdsSelectableTable:F SessionsRowLayout:i '
  + 'SessionsDateLayout:a SessionsMoreButton:o SessionsMenuContext:A SessionsRowRail:E SessionsActionsRail:D '
  + 'SessionsArchivedBadge:r SessionsHighlight:r findSessionTitleMatch:e CdsRelativeTime:y6 mergeProps:Jt clsx:ve '
  + 'CdsTooltip:Xm CdsShortcut:oc CdsSplitDropdownButton:cF CdsCheckbox:xP CdsTextInput:uC CdsContextMenu:kA '
  + 'CdsMenuCreateHandle:Sm CdsOverflowTooltip:hh CdsLayerProvider:Lf CdsDialog:nb CdsRoot:lo').split(' ').map(pair => pair.split(':'));

let server; const loaded = new Map();
before(async () => {
  server = await createServer({configFile:false, root:app, plugins:[react()], server:{middlewareMode:true, hmr:false, ws:false, watch:null}, appType:'custom', logLevel:'error'});
  for (const file of [frame, vendorFrame]) loaded.set(file, await server.ssrLoadModule(`/src/generated/view-tabs/${file}`));
});
after(() => server?.close());
const exported = name => loaded.get(manifest.publicNames[name].file)[name];
const h = React.createElement, render = element => renderToStaticMarkup(element);
const provider = child => h(exported('CdsTooltipProvider'), {}, child);

test('R4f names point at the 3.6556.2 declarations their features identify, under the official export alias', () => {
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
  // R4i-graph GR1 (D46) appended the names the routines graphs import (tests/view-tabs-manifest.test.mjs pins them):
  // the block of extract-view-tabs.mjs roots after its D46 header.
  const source = fs.readFileSync(path.join(app, 'scripts/extract-view-tabs.mjs'), 'utf8');
  const block = source.slice(source.indexOf('// R4i-graph GR1 (D46)'), source.indexOf('  // R4i-graph GR3:', source.indexOf('// R4i-graph GR1 (D46)')));
  // 2026-10-18 context-breakdown (D50) added one root inside this block, useInsideCdsTooltipProvider (shared-frame xm, the
  // session-rail-context chart meter reads bm through it); it is a new name, not a D46 one, so it is counted on its own.
  const contextBreakdown = ['useInsideCdsTooltipProvider'];
  // Wave 11 added three roots after cdsSurfaceClass inside this block: CdsSurface (w11-e31-terminal-cont, shared-frame cg)
  // and the D1 move of cowork-scheduled's TextArea / Pictogram roots (w11-pictogram-d1, shared-frame nk, shared-156 KG).
  const wave11 = [['CdsSurface', 'cg', 'Dl'], ['CdsTextArea', 'nk', 'da'], ['CdsPictogram', 'KG', 'Hr']];
  const d46 = [...block.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]).filter(name => !contextBreakdown.includes(name) && !wave11.some(([n]) => n === name));
  assert.equal(d46.length, 207);
  for (const name of contextBreakdown) assert.equal(manifest.publicNames[name]?.local, 'bh', name);
  for (const [name, local, exportName] of wave11) {
    assert.equal(manifest.publicNames[name]?.local, local, name);
    assert.equal(manifest.publicNames[name]?.export, exportName, name);
  }
  // R4i-graph GR3 appended what the composer attachment tiles copied or stood in for (the Skeleton's two contexts, the
  // TextLink, the platform context and its reader); tests/composer-attachment-tiles.test.mjs pins their use.
  const gr3 = ['CdsSkeletonShimmerContext', 'CdsSkeletonElementContext', 'CdsTextLink', 'CdsPlatformContext', 'useCdsPlatform'];
  const gr3Block = source.slice(source.indexOf('  // R4i-graph GR3:'), source.indexOf('  // 2026-10-18 account avatar:', source.indexOf('  // R4i-graph GR3:')));
  assert.deepEqual([...gr3Block.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]), gr3);
  // 2026-10-18 (user ruling) appended the CDS Avatar (shared-frame uj, exported `si`) the sidebar account button draws.
  const accountAvatar = ['CdsAvatar'];
  const avatarBlock = source.slice(source.indexOf('  // 2026-10-18 account avatar:'), source.indexOf('  // E3 (3.6556.2): the React Compiler cache helpers'));
  assert.deepEqual([...avatarBlock.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]), accountAvatar);
  assert.equal(manifest.publicNames.CdsAvatar?.local, 'vF');
  assert.equal(manifest.publicNames.CdsAvatar?.export, 'vi');
  // 3.6556.2 (E3, cds:C8) appended the 24 React Compiler cache helpers and the CDS Toolbar after the avatar block.
  const v3Block = source.slice(source.indexOf('  // E3 (3.6556.2): the React Compiler cache helpers'), source.indexOf('  // w2-routines-shared (3.6556.2, D46):'));
  const v3 = [...v3Block.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]);
  assert.equal(v3.length, 25); assert.equal(v3.at(-1), 'CdsToolbar');
  // w2-routines-shared (D46) appended three view-tabs bindings other 3.6556.2 graphs read (routines-shared, files-changes, code-composer).
  // A later lane's block (w3-code-routines, D46) follows inside the same array: the w2 block ends at its header.
  const routinesStart = source.indexOf('  // w2-routines-shared (3.6556.2, D46):'), routinesEnd = source.indexOf('\n];', routinesStart);
  const codeRoutinesStart = source.indexOf('  // w3-code-routines (3.6556.2, D46):', routinesStart);
  const routinesBlock = source.slice(routinesStart, codeRoutinesStart !== -1 && codeRoutinesStart < routinesEnd ? codeRoutinesStart : routinesEnd);
  const routinesShared = [...routinesBlock.matchAll(/name:'([\w$]+)'/g)].map(m => m[1]);
  assert.deepEqual(routinesShared, ['matchesCoarseOrHoverlessPointer', 'subscribeInputMediaChanges', 'isFizzyLakePartOptedIn']);
  // w3-code-routines (D46) appended the shared-frame bindings the Code Routines form's CDS copies read; counted as their
  // own block (tests/code-routines-generated.test.mjs pins their use).
  const codeRoutines = codeRoutinesStart !== -1 && codeRoutinesStart < routinesEnd
    ? [...source.slice(codeRoutinesStart, routinesEnd).matchAll(/name:'([\w$]+)'/g)].map(m => m[1]) : [];
  for (const name of codeRoutines) assert.ok(manifest.publicNames[name], name);
  assert.equal(manifest.publicNames.CdsTooltipImplContext?.local, 'Fl');
  const known = new Set([...prior.map(([name]) => name), ...added.map(([name]) => name), ...r4g, ...d46, ...gr3, ...contextBreakdown, ...wave11.map(([name]) => name), ...accountAvatar, ...v3, ...routinesShared, ...codeRoutines]);
  assert.deepEqual(Object.keys(manifest.publicNames).filter(name => !known.has(name)), []);
  // The CdsRoot labels context (vn) is named only now that extract-code-composer.mjs no longer copies it.
  assert.equal(manifest.publicNames.CdsLabelsContext?.local, 'xn');
  // R4i-graph GR3 held the layer base Vd back (pendingNames) while extract-mcp-app-card.mjs sliced its own Vd / Jd, and
  // extract-code-composer.mjs copied it. 3.6556.2 (E4): every pending name is published, so code-composer (3.6556.2)
  // imports CdsLayerBaseContext / useCdsLayerAwareZIndex from view-tabs and its contextCopies is empty again.
  const composerSource = fs.readFileSync(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  assert.match(composerSource, /\nconst contextCopies = \{\};\n/, 'code-composer copies no view-tabs context');
  const frameText = fs.readFileSync(path.join(reference, frame), 'utf8');
  for (const [name, local, exportName] of [['CdsLayerBaseContext', 'If', 'su'], ['useCdsLayerAwareZIndex', 'Uf', 'cu']]) {
    assert.deepEqual(manifest.publicNames[name], {file:frame, local, export:exportName}, name);
    assert.match(frameText.slice(frameText.lastIndexOf('export{')), new RegExp(`[{,]${local} as ${exportName}[,}]`), name);
  }
  // w10-cleanup-viewtabs-legacy: no 2.42304.0 view holds them back any more.
  assert.equal(manifest.legacy, undefined);
  // No new module, and the only top-level initializers are the Base UI store hook and (w11-pictogram-d1) shared-156's
  // `KG.isCdsPictogram=!0`, the property write that belongs to the CdsPictogram root.
  // w12 viewtabs-cont: the one module since is c09817156 (CdsCheckboxRow).
  assert.equal(manifest.modules.length, 30);
  assert.deepEqual(manifest.modules.filter(m => m.initializers.length).map(m => [m.source, m.initializers.length]), [[vendorFrame, 1], ['shared-156-BLTosN8U.js', 1]]);
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
