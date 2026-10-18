import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';

// R4i-graph GR1 (D46): the semantic names the routines-shared, code-routines and cowork-scheduled graphs import from
// the shared view-tabs graph, instead of minified locals. Most are published (`publicNames`); the ones other areas'
// generators still slice are settled but held back (`pendingNames`, with the generators they wait for).
// Reads only the local reference copy and the generated output; no network, no GUI.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/view-tabs');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
// [file, 'semanticName:2.42304.0 local ...'].
const d46 = [
  ["c193cfc9b-DSvIG0kE.js", 'cdsPageHeaderScrollOffsetVar:g'],
  ["preload-helper-D0dM6GpB.js", 'tagErrorText:e vitePreload:s'],
  ["rolldown-runtime-C3OYiQ02.js", 'toESM:l commonJS:o'],
  ["shared-0-ByI5P0CP.js", 'safeLocalStorage:$A createSafeStorage:QA getWindowStorage:ZA'],
  ["shared-25-DP8p7i1Z.js", 'toggledSet:gH isDocumentNode:lp getMutationObserverClass:mp getResizeObserverClass:pp ownerWindow:up'],
  ["shared-4-CJsHhp5n.js", 'isCaiCuriousTowerEnabled:Ad'],
  ["shared-52-DGviI8xb.js", 'useValueChanged:aD'],
  ["shared-78-D6VXYXaQ.js", 'isMacUserAgent:Wa'],
  ["shared-frame-BfjMqbuN.js", 'useCdsFocusReturnRef:$h isBlockedHref:$r isFocusedWithoutFocusVisible:$s isTextEditableElement:Bh '
    + 'isImeCompositionKeyEvent:Bm CdsSheetStackContext:By cdsHiddenPopupStyle:Cb '
    + 'blurWithoutRelatedTarget:Ch cdsIconSizes:Co CdsSkeletonStartedAtContext:Cu cdsMenuItemClass:Cx '
    + 'CdsSheetPopupHost:Db useCdsMergedRefs:Dn cdsFieldFocusWithinRingClass:Gb CdsEndSideTooltip:Gv '
    + 'cdsFieldSurfaceClass:Hb CdsFieldStateContext:Ib useCdsOwnerAnchor:Ja useCdsLayerAwareZIndex:Jd '
    + 'inertProps:Jm useLazyObserver:Jn ariaKeyShortcuts:Js coarsePointerQuery:Jt useCdsLocale:Ka '
    + 'cdsTextFieldClass:Kb useCdsPortalLayer:Kd useCdsFieldInvalid:Lb cdsMenuScrollAreaClass:Lx '
    + 'isFirstPartyHref:Mi useIsMacPlatform:Ms cdsStaysSecondaryTextClass:Mt newTabRelFor:Ni '
    + 'isDocumentCurrentTarget:Nx useValueLatchedWhileOpen:Ny CdsCheckboxIndicator:Pb '
    + 'useCdsIsoLayoutEffect:Q CdsTooltipImplContext:Qc CdsIconSlot:Qo useCdsSheetPopup:Qy '
    + 'useCdsFieldDisabled:Rb setCompositionEndTimestamp:Rm CdsDisabledReasonWrapper:Tl '
    + 'cdsFieldHoverRingClass:Ub cdsMenuPopupClass:Ux useIsInCdsField:Vb CdsLayerBaseContext:Vd '
    + 'cdsFocusVisibleRingClass:Wb connectedOwnerWindow:Xi windowOrDefault:Xt useCdsOwnerWindow:Ya '
    + 'useLazyMutationObserver:Yn isCdsIconName:Yo useCdsLabel:Z CdsSpinner:Zs matchesMediaQuery:Zt '
    + 'cdsSizeAttributes:aa cdsSurfaceClass:ah cdsUnanchoredPositionerProps:ay resolveCdsLabel:bn '
    + 'elementResizeObserverClass:bu cdsTypeScaleStep:ca cdsSheetPopupClass:db CdsSkeleton:dd '
    + 'cdsDefaultDensity:dy CdsOpensInNewTabHint:fd CdsPortalRoot:gf cdsNoSheetPopupState:ib '
    + 'cdsRemScaleVar:io useCdsDensity:ja asElementNode:lc useCdsThemeId:lr CdsSheetPopupProvider:nb '
    + 'cdsDisabledReasonWrappers:nc CdsLoadingSkeleton:nd useCdsFocusReturn:ng '
    + 'isNewBrowsingContextTarget:ni CdsLinkPrimitive:nu useIsInCdsSheetFrame:ob sanitizeCdsHref:oi '
    + 'CdsTextLinkInheritColorContext:pd useClickToFocus:ph useCdsOwnerWindowAnchor:qa useCdsLayer:qd '
    + 'useControllableOpenState:rb useIsCdsSheetPresentation:sb CdsPopupActionsScope:sf '
    + 'cdsHandedBackFocusTargets:tc cdsSurfaceLevels:th CdsTooltipDeferralContext:vl useFizzyLakePart:vr '
    + 'useLatestCallback:wn CdsSkeletonGroupContext:wu cdsMenuRadiusClass:wx cdsSheetScrollAttribute:wy '
    + 'CdsSearchableMenuPopup:yC resetCompositionEndOnKeyDown:zm'],
  ["vendor-frame-DfPJ1QmD.js", 'useComboboxRootContext:$g useFloatingClick:$s visuallyHiddenAbsoluteStyle:Ba '
    + 'findNonDisabledListIndex:Co useBaseButton:Cr useRenderElement:En noFallbackAxisSide:Es '
    + 'defaultFieldRootContext:Fm startingTransitionProps:Hd FieldRootContext:Im mathFloor:Ja '
    + 'ComboboxRootContext:Jg ReactStore:Jl useLabelableId:Jm isHTMLElement:Jn isAndroid:Jr useTypeahead:Ju '
    + 'usePopupScrollLock:Kp isIOS:Kr useFieldRootContext:Lm useValueAsRef:Ma triggerOpenStateMapping:Mi '
    + 'defaultFieldState:Mm pressableTriggerOpenStateMapping:Ni FloatingPortal:Ns stringifyValue:Og '
    + 'popupStateMapping:Pi fieldValidityMapping:Pm createChangeEventDetails:Q useTransitionStatus:Ql '
    + 'FloatingFocusManager:Qs useFloatingParentNodeId:Rs emptyObject:Sn isListIndexDisabled:To '
    + 'usePositionerElement:Ud InternalBackdrop:Uf useLabelableContext:Um isInteractiveElement:Vi '
    + 'useFormContext:Vm LabelableProvider:Wm userAgentLowerCase:Wr useIsoLayoutEffect:X PopoverRoot:Xh '
    + 'reasonNone:Xi FloatingRootStore:Xl useStableCallback:Y useOpenInteractionType:Yf nodeContains:Z '
    + 'supportsWebkitBackdropFilter:Zr PopupTriggerMap:_u useDismiss:ac PopoverPositioner:ag '
    + 'CompositeList:ap noop:bn isListIndexOutOfBounds:bo getEventTarget:ci formatBaseUiErrorMessage:cn '
    + 'useBaseUiId:dd PopoverTitle:dg useBaseUiMergedRefs:dn getOverflowAncestors:dr isControlOfForm:eh '
    + 'FieldControl:hh defaultValidityState:jm PopoverPopup:lg useFieldItemContext:lh '
    + 'reasonListNavigation:ma useRegisterFieldControl:mh reasonClosePress:na PopoverPortal:ng '
    + 'useControlled:np useOpenChangeComplete:nu reasonEscapeKey:pa PopoverClose:pg useCompositeListItem:pp '
    + 'inertAttributeValue:qd useValueChangeCallback:qf isElement:qn useListNavigation:qu '
    + 'focusableNonTabbableProps:ru isPointInsideElementRect:sm getComputedStyleOf:sr reasonItemPress:ta '
    + 'stopEvent:ti PopoverArrow:ug useRefWithInit:un emptyArray:xn ownerDocument:xr reasonCancelOpen:ya '
    + 'transitionStatusMapping:yi useIdOrGenerate:ys visuallyHiddenFixedStyle:za useAnchorPositioning:zd '
    + 'useFieldsetRootContext:zm useTimeout:zr'],
].flatMap(([file, list]) => list.split(' ').map(pair => { const [name, local] = pair.split(':'); return {name, file, local}; }));

let server; const loaded = new Map();
before(async () => {
  server = await createServer({configFile:false, root:app, plugins:[react()], server:{middlewareMode:true, hmr:false, ws:false, watch:null}, appType:'custom', logLevel:'error'});
  for (const file of new Set(d46.map(entry => entry.file))) loaded.set(file, await server.ssrLoadModule(`/src/generated/view-tabs/${file}`));
});
after(() => server?.close());
// A published name is the module's export; a held-back one is still reached through its local here.
const get = name => manifest.publicNames[name] ? loaded.get(manifest.publicNames[name].file)[name]
  : loaded.get(manifest.pendingNames[name].file)[manifest.pendingNames[name].local];
const h = React.createElement, render = element => renderToStaticMarkup(element);

test('D46 names point at selected 2.42304.0 locals, under the official export alias when the chunk exports them', () => {
  assert.equal(d46.length, 207);
  assert.equal(new Set(d46.map(entry => entry.name)).size, d46.length);
  const pending = Object.keys(manifest.pendingNames);
  assert.equal(pending.length, 35);
  assert.equal(d46.filter(({name}) => name in manifest.publicNames).length + pending.length, d46.length);
  for (const {name, file, local} of d46) {
    assert.ok(!(name in manifest.publicNames && name in manifest.pendingNames), name);
    const entry = manifest.publicNames[name] ?? manifest.pendingNames[name];
    assert.ok(entry, name);
    assert.equal(entry.file, file, name); assert.equal(entry.local, local, name);
    assert.ok(manifest.modules.find(m => m.source === file).bindings.includes(local), `${name}: ${local} is not selected`);
    const original = fs.readFileSync(path.join(reference, file), 'utf8');
    const officialExports = original.slice(original.lastIndexOf('export{'));
    const escaped = local.replace(/\$/g, '\\$');
    const alias = officialExports.match(new RegExp(`[{,]${escaped} as ([\\w$]+)[,}]`))?.[1];
    assert.equal(entry.export, alias, `${name}: export alias`);
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    const exportList = text.slice(text.lastIndexOf('\nexport {'));
    if (name in manifest.publicNames) {
      assert.match(exportList, new RegExp(`[{,]${escaped} as ${name}[,}]`), name);
      assert.ok(name in loaded.get(file), name);
    } else {
      // Held back: not exported under the name yet, so the other areas' generators keep their --check.
      assert.ok(!(name in loaded.get(file)), name);
      assert.ok(entry.waitsFor.every(generator => fs.existsSync(path.join(app, 'scripts', `extract-${generator}.mjs`))), name);
    }
  }
});

test('vendor-frame React re-exports are not named: the routines graphs import them from React itself', () => {
  const text = fs.readFileSync(path.join(directory, 'vendor-frame-DfPJ1QmD.js'), 'utf8');
  for (const {name, local} of d46.filter(entry => entry.file === 'vendor-frame-DfPJ1QmD.js'))
    assert.doesNotMatch(text, new RegExp(`^var ${local.replace(/\$/g, '\\$')}=(o|fe|Ln)\\.[\\w$]+;$`, 'm'), name);
  for (const dir of ['routines-shared', 'code-routines', 'cowork-scheduled']) {
    const generated = JSON.parse(fs.readFileSync(path.join(app, 'src/generated', dir, 'manifest.json'), 'utf8'));
    const pendingLocals = new Set(Object.values(manifest.pendingNames).map(({file, local}) => `${file}#${local}`));
    for (const [, from, name] of JSON.stringify(generated).matchAll(/"from":"\.\.\/view-tabs\/([^"]+)","name":"([^"]+)","kind":"view-tabs-held"/g))
      assert.ok(pendingLocals.has(`${from}#${name}`), `${dir} imports ${from}#${name} without a semantic name`);
  }
});

test('runtime helpers, storage and platform probes are the original values', () => {
  const cjs = get('commonJS')((exports, module) => { module.exports = {answer:42}; });
  assert.equal(get('toESM')(cjs()).default.answer, 42);
  assert.equal(typeof get('vitePreload'), 'function');
  const error = get('tagErrorText')(new Error('x'), 'Could not load', 'chunk');
  assert.deepEqual(error[Symbol.for('ant.o11y.errorText')], {text:'Could not load', kind:'chunk'});
  // No window in SSR: the safe storage answers from its in-memory fallback and never throws.
  assert.equal(get('safeLocalStorage').getItem('missing'), null);
  assert.equal(typeof get('createSafeStorage')('sessionStorage', true).setItem, 'function');
  assert.deepEqual([...get('toggledSet')(new Set(['a']), 'b', true)], ['a', 'b']);
  assert.deepEqual([...get('toggledSet')(new Set(['a', 'b']), 'a', false)], ['b']);
  const view = {ResizeObserver:'RO', MutationObserver:'MO'}, doc = {nodeType:9, defaultView:view}, element = {nodeType:1, ownerDocument:doc};
  assert.equal(get('ownerWindow')(element), view); assert.equal(get('ownerWindow')(doc), view); assert.equal(get('ownerWindow')(null), null);
  assert.equal(get('isDocumentNode')(doc), true); assert.equal(get('isDocumentNode')(element), false);
  assert.equal(get('getResizeObserverClass')(element), 'RO'); assert.equal(get('getMutationObserverClass')(element), 'MO');
  assert.equal(get('isMacUserAgent')(), false);
  assert.equal(get('cdsPageHeaderScrollOffsetVar'), '--cds-page-header-scroll-offset');
  assert.equal(typeof get('isCaiCuriousTowerEnabled')(), 'boolean');
});

test('Base UI reasons, constants and helpers keep their original values', () => {
  assert.deepEqual(['reasonNone', 'reasonListNavigation', 'reasonClosePress', 'reasonEscapeKey', 'reasonItemPress', 'reasonCancelOpen'].map(get),
    ['none', 'list-navigation', 'close-press', 'escape-key', 'item-press', 'cancel-open']);
  assert.ok(Object.isFrozen(get('emptyObject')) && Object.isFrozen(get('emptyArray')));
  assert.equal(get('mathFloor'), Math.floor);
  assert.equal(get('noop')(), undefined);
  assert.match(get('formatBaseUiErrorMessage')(22), /base-ui\.com\/production-error/);
  const details = get('createChangeEventDetails')('escape-key');
  assert.equal(details.reason, 'escape-key'); details.cancel(); assert.equal(details.isCanceled, true);
  assert.deepEqual(get('triggerOpenStateMapping').open(false), null);
  assert.deepEqual(Object.values(get('pressableTriggerOpenStateMapping').open(true)), ['', '']);
  assert.equal(get('visuallyHiddenAbsoluteStyle').position, 'absolute'); assert.equal(get('visuallyHiddenFixedStyle').position, 'fixed');
  assert.equal(get('isListIndexOutOfBounds')([1, 2], 2), true);
  assert.equal(get('stringifyValue')({a:1}), '{"a":1}');
  assert.equal(typeof get('ReactStore'), 'function'); assert.equal(typeof get('FloatingRootStore'), 'function');
  assert.ok(Object.getPrototypeOf(get('FloatingRootStore')) === get('ReactStore'));
  assert.equal(get('getEventTarget')({target:'t'}), 't');
});

test('CDS helpers and controls render the original markup', () => {
  assert.match(render(h(get('CdsSpinner'), {})), /data-cds="Spinner"/);
  assert.match(render(h(get('CdsSkeleton'), {width:40})), /data-cds="Skeleton"/);
  assert.equal(render(h(get('CdsOpensInNewTabHint'), {id:'n'})), '<span id="n" hidden="" class="sr-only">(opens in new tab)</span>');
  assert.equal(render(h(() => get('useCdsLabel')('moreInfo', 'More info'))), 'More info');
  assert.equal(render(h(() => get('useCdsDensity')())), 'comfortable');
  assert.equal(get('cdsDefaultDensity'), 'comfortable');
  assert.equal(get('cdsIconSizes').sm.px, 16);
  assert.deepEqual(get('cdsSizeAttributes')('lg'), {'data-size':'lg'}); assert.deepEqual(get('cdsSizeAttributes')('base'), {});
  assert.equal(get('cdsTypeScaleStep')('comfortable', 'lg'), 5);
  assert.equal(get('sanitizeCdsHref')('https://claude.ai/x'), 'https://claude.ai/x');
  assert.equal(get('isFirstPartyHref')('https://claude.ai/x'), true); assert.equal(get('isFirstPartyHref')('https://example.com'), false);
  assert.equal(get('newTabRelFor')('https://example.com'), 'noopener noreferrer');
  assert.equal(get('isNewBrowsingContextTarget')('_blank'), true); assert.equal(get('isNewBrowsingContextTarget')('_self'), false);
  assert.equal(get('ariaKeyShortcuts')('cmd+shift+k', true), 'Shift+Meta+k');
  assert.equal(get('ariaKeyShortcuts')('cmd+k', false), 'Control+k');
  assert.equal(get('coarsePointerQuery'), '(pointer: coarse)');
  // The layer base context and its readers are one instance with CdsLayerProvider.
  const z = () => get('useCdsLayerAwareZIndex')(5);
  assert.equal(render(h(get('CdsLayerBaseContext').Provider, {value:100}, h(z))), '105');
});
