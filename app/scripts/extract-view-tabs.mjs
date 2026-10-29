// Reachable bindings of the official view-tab bar, the current Sessions page
// primitives and the CDS controls the host shares with them.
// Extraction parses source only; no official desktop service is executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsers} from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
// R1: release, snapshot and source directory come from the shared 3.6556.2 constants module.
import * as official from './official-3.6556.2.mjs';
const root=path.resolve(import.meta.dirname,'..');
const source=official.ionSource;
const output=path.join(root,'src/generated/view-tabs');
// w10-cleanup-viewtabs-legacy: the manifest is 3.6556.2 only. The frozen 2.42304.0 name view (and the pre-migration
// manifest JSON it was read from) went once turn-box, the turn-plan renderer and every code-current pin sliced
// 3.6556.2; scripts/view-tabs-compat.mjs serves this release only.
const facade='index.js';
const sha=text=>createHash('sha256').update(text).digest('hex');
// Every chunk the closure may enter. Leaving this list is an error, so a new
// dependency of the official source is reviewed instead of silently copied.
const files=[
  'cfe7c4b3b-BF79K6ux.js','vendor-frame-CnSY1sxv.js','vendor-base-ui-2Rtuj3JT.js','shared-frame-6jtSkIit.js',
  'shared-25-DOWZRSlq.js','shared-0-DDOOdL6P.js','shared-19-DIKJVT7c.js','shared-78-D5Fw2h0a.js',
  'rolldown-runtime-C3OYiQ02.js','preload-helper-D0dM6GpB.js','shared-frame-boot-Drp5VUjq.js','c86ccec3d-CIt4iOS0.js',
  'shared-156-BLTosN8U.js','shared-2-TF8v67kg.js','vendor-all-0-DXM0MGjZ.js',
  // `Yo`: fizzy-lake part gate read by the tab bar's size table. 3.6556.2 moved its allow-list and the
  // data-cds-fizzy-lake reader into shared-52 (`th/eh/Xm/Qm`); `Qm=[]` is empty, so it is always off and the
  // original gate is kept rather than a host stub (E12 / cds:C25).
  'shared-4-DUB1Oi0O.js',
  // `tf`: useValueChanged ({onMount:"skip"}), used by the row-selection hook; and the fizzy-lake allow-list above.
  'shared-52-uHFNjl7C.js',
  // cds:C20: the Sessions table's loading skeleton rows (z_/B_/V_), new in 3.6556.2.
  'shared-46-BIbZBGFq.js',
  'c193cfc9b-C3NZYkrZ.js','cf35aed38-BG5R4ZJ8.js','shared-10-D6FXWZph.js','c9c7785eb-D_0oAvkh.js','ce802b15a-C7eXhKeI.js',
  'c75e89812-h8Vuo8ke.js','c12ca901f-DFYdP-5B.js','c51c45b79-DNX9mtgl.js','cc18d27d7-Dym2_dzB.js','ce58a0513-DSWVLStl.js',
  'c1ea8a271-CHvO08g4.js','cdfb0c433-OOm3enZf.js',
  // w12 viewtabs-cont: the CDS checkbox row (h, exported `t`) the settings page renders (c09817156 imports only
  // vendor-frame and shared-frame bindings this graph already reaches).
  'c09817156-D4yWRk21.js',
];
// Host boundaries, located by the import they replace (chunk family + imported
// name) rather than by a minified local name. `target` is asserted against the
// imported module so a reused export name cannot redirect the boundary.
const adapters=[
  {file:'ce58a0513-DSWVLStl.js',from:'vendor-intl',imported:'l',host:['../../source-code-start-adapters.jsx','StartMessage'],
    target:[{to:'Wt',ref:'(@@,Ut)'},{in:'Wt',has:'description:s,defaultMessage:c'}]},
  {file:'c9c7785eb-D_0oAvkh.js',from:'vendor-intl',imported:'p',host:['../../source-code-start-adapters.jsx','useStartIntl'],
    target:[{to:'Mt',ref:'return @@(e),e'},{in:'Mt',has:'Could not find required `intl` object'}]},
  // The CDS locale hook: `function ro(){return J(Ra)}`, Ra being the locale context CdsRoot (lo) provides.
  {file:'shared-2-TF8v67kg.js',from:'shared-frame',imported:'kd',host:['../../source-sessions-adapters.jsx','useSessionsLocale'],
    target:[{to:'Ra',ref:'return J(@@)'},{in:'lo',has:'locale:s'},{in:'lo',loose:'ne=J(Ra)'}]},
];
// The vendor's CommonJS wrappers are module boundaries to the host's React,
// never a second bundled copy. Their declarations must keep this exact shape.
const wrappers=[
  {file:'vendor-frame-CnSY1sxv.js',local:'l',declaration:'l=c.default',host:['react','default']},
  {file:'vendor-frame-CnSY1sxv.js',local:'c',declaration:'c=e(i())',host:['react','default']},
  {file:'vendor-frame-CnSY1sxv.js',local:'i',declaration:'i=n(((e,t)=>{t.exports=r()}))',host:['../../source-view-tabs-adapters.jsx','requireHostReact'],
    expect:[{in:'r',has:'Symbol.for("react.transitional.element")'}]},
  // cds:C9 / E3: 3.6556.2 is React Compiler output; `o` is react/compiler-runtime's `c` (useMemoCache), which the
  // host's own React provides (no adapter, no bundled copy).
  {file:'vendor-frame-CnSY1sxv.js',local:'o',declaration:'o=e(n(((e,t)=>{t.exports=a()}))()).c',host:['react/compiler-runtime','c'],
    expect:[{in:'a',has:'useMemoCache'}]},
  {file:'vendor-frame-CnSY1sxv.js',local:'me',declaration:'me=e(n(((e,t)=>{t.exports=pe()}))())',host:['react/jsx-runtime','*'],
    expect:[{in:'pe',has:'.jsxs='}]},
  {file:'vendor-frame-CnSY1sxv.js',local:'Hn',declaration:'Hn=e(le())',host:['react-dom','*'],
    expect:[{in:'le',has:'__REACT_DEVTOOLS_GLOBAL_HOOK__'}]},
];
// Roots, each exported under a semantic name (`publicNames`) that consumers
// import instead of the minified local: every version reuses old minified
// names for unrelated values. `export` (when the chunk exports it) and `local`
// must agree, and the declaration must carry `expect`:
//   'text'                 the declaration contains this stable text (literals, keys, class names);
//   {loose:'text'}         the same with each identifier of at most 3 characters that is not a key, member or
//                          keyword matching any such identifier (looseFeature, R2/E5);
//   {to:'X',ref:'..@@..'}  the declaration contains the loose pattern with @@ being exactly the local X;
//   {in:'X',has|loose:...} the top-level declaration X of the chunk contains it;
//   {in:'X',ref:'..@@..'}  X contains the loose pattern with @@ being exactly this root's local (a reader that
//                          pins the root, for declarations too short to identify by themselves);
//   {boundary:[module,name]} the declaration is `local=Y`, Y imported from a wrapper bound to that host module.
// The root's own features (strings, loose, to/ref) must identify exactly one top-level declaration of the chunk
// unless a reader (`in`+`ref`) or a boundary pins it, so a renamed binding fails loudly instead of silently
// selecting another value. Comments that name minified locals name the 2.42304.0 ones unless they say otherwise.
const SF='shared-frame-6jtSkIit.js',VF='vendor-frame-CnSY1sxv.js';
const roots=[
  // View tab bar and the parts its source tests drive directly.
  {file:'cfe7c4b3b-BF79K6ux.js',local:'Re',export:'t',name:'ViewTabBar',expect:['renderCreateButton:','createMenu:']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'F',export:'n',name:'useViewTabIconSize',expect:[{loose:'return s(N)'},{in:'P',loose:'c("xs")'}]},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'le',name:'viewTabSizes',expect:['basis:"basis-[192px]"']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'N',name:'viewTabLabels',expect:['closeTabsToRightRtl:"']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'ve',name:'ViewTab',expect:['overflowed:','"after:pointer-events-none after:absolute after:inset-[3px] after:rounded-sm after:content-[\'\'] has-[:focus-visible]:after:shadow-focus"']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'se',name:'ViewTabOverflowItem',expect:['"grid shrink-0 cursor-interactive place-items-center rounded-sm text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary"']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'ae',name:'ViewTabOverflowMenu',expect:['onKeyDownCapture']},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'Te',name:'useViewTabOverflow',expect:['"data-vtb-hidden"','hiddenIds:']},
  // Base UI direction context and class-variance helper.
  {file:VF,local:'ln',name:'DirectionContext',expect:[{in:'un',ref:'(@@)?.direction??"ltr"'}]},
  {file:VF,local:'Vn',export:'Ta',name:'cva',expect:['compoundVariants','defaultVariants']},
  // CDS controls (shared-frame). SegmentedControl, Pulse and TooltipProvider
  // are rooted for the Chat/Code switch so it shares these contexts.
  {file:SF,local:'ba',name:'CdsDensityContext',expect:[{loose:'G("comfortable")'},{in:'Ha',ref:'W(@@)'}]},
  {file:SF,local:'Uu',export:'Eu',name:'CdsButton',expect:['hideShortcut:','"Button")']},
  {file:SF,local:'us',export:'od',name:'CdsIcon',expect:['"data-cds":"Icon"',{loose:'data-cds-mirror'}]},
  {file:SF,local:'Ps',export:'ad',name:'CdsBadge',expect:['"removeItem"','"-ml-0.5 mr-[calc(min(calc(0.1875rem*var(--cds-rem-scale,1)),(var(--cds-h-control-nested)-calc(0.75rem*var(--cds-rem-scale,1)))/2)-var(--cds-pad-sm))] [&:where(:root[dir=rtl]_:dir(rtl))]:-ms-0.5 [&:where(:root[dir=rtl]_:dir(rtl))]:me-[calc(min(calc(0.1875rem*var(--cds-rem-scale,1)),(var(--cds-h-control-nested)-calc(0.75rem*var(--cds-rem-scale,1)))/2)-var(--cds-pad-sm))]"']},
  {file:SF,local:'ab',export:'Xc',name:'CdsConfirmationDialog',expect:['confirmLabel:','closeOnConfirm:']},
  {file:SF,local:'GT',export:'Jo',name:'CdsDropdown',expect:['SearchablePopup:','SubmenuTrigger:']},
  {file:SF,local:'Q',export:'Hf',name:'cdsClassNames',expect:[{loose:'return Gt(Y(e))'},{in:'Jt',has:'conflictingClassGroups:'},{in:'zF',ref:'mposited"?Q(LF,bF[f],i):@@(xF,bF[f],SF,f==="strong'}]},
  {file:SF,local:'xh',export:'ql',name:'CdsTooltipProvider',expect:['.Provider','closeDelay:','children:','delay:','value:',{in:'km',ref:'()=>Xm,TooltipGroup:()=>@@,TooltipImplProvider:()='}]},
  {file:SF,local:'Vj',export:'Pi',name:'CdsSegmentedControl',expect:['"SegmentedControl")','thumbPosition:']},
  {file:SF,local:'mL',export:'Ar',name:'CdsPulse',expect:['"data-cds":"Pulse"']},
  // PR preview card: moved from shared-5 to shared-156 in 2.42304.0.
  {file:'shared-156-BLTosN8U.js',local:'qU',export:'Ai',name:'CdsPreviewCard',expect:['Root:',{loose:'Trigger:mR,'},{loose:'Popup:_R}'},{in:'KU',has:'"data-cds":"PreviewCard"'}]},
  {file:'shared-156-BLTosN8U.js',local:'BU',name:'CdsPreviewCardContext',expect:['setPopupFocused:()=>void 0']},
  {file:'shared-156-BLTosN8U.js',local:'HU',name:'CdsPreviewCardTrigger',expect:['interactiveHint','className:"sr-only select-none"']},
  // fizzy-lake part gate (`co`), shared with the 2.42304.0 sidebar PR card and file tree.
  {file:'shared-4-DUB1Oi0O.js',local:'lp',export:'Yo',name:'isFizzyLakePartEnabled',expect:[{to:'cp',ref:'&&(@@[e]?.()??!0)'},{in:'cp',has:'{panels:'}]},
  // Hooks shared with generated sidebar rows.
  {file:'shared-0-DDOOdL6P.js',local:'ve',export:'LS',name:'useEventCallback',expect:[{loose:'(()=>he(t));return n}'},{in:'ge',loose:'e.current(...t)'}]},
  {file:'vendor-all-0-DXM0MGjZ.js',local:'Te',export:'v',name:'useMergedRefs',expect:[{loose:'return l(De(...e),e)'}]},
  // Current Sessions page: page/header, selectable table and row primitives.
  {file:'c193cfc9b-C3NZYkrZ.js',local:'_',export:'n',name:'CdsPage',expect:['topSentinelRef:','"tall-frame"']},
  {file:'shared-10-D6FXWZph.js',local:'Qr',export:'_a',name:'CdsTabs',expect:['Root:','List:','Tab:']},
  {file:'c9c7785eb-D_0oAvkh.js',local:'T',export:'n',name:'useRowSelection',expect:['restoreFocusRef']},
  {file:'c9c7785eb-D_0oAvkh.js',local:'F',export:'t',name:'CdsSelectableTable',expect:['getRowKey:','renderActions:']},
  {file:'c75e89812-h8Vuo8ke.js',local:'i',export:'t',name:'SessionsRowLayout',expect:['titleAccessories:','subline:']},
  {file:'c75e89812-h8Vuo8ke.js',local:'a',export:'r',name:'SessionsDateLayout',expect:['first-letter:capitalize']},
  {file:'c75e89812-h8Vuo8ke.js',local:'o',export:'n',name:'SessionsMoreButton',expect:['icon:"DotsVertical"']},
  {file:'cc18d27d7-Dym2_dzB.js',local:'A',export:'r',name:'SessionsMenuContext',expect:[{in:'P',ref:' J3($,61,A,a,i)?K3($,61,@@,a,i,a?t(C,{...A,context'}]},
  {file:'cc18d27d7-Dym2_dzB.js',local:'E',export:'s',name:'SessionsRowRail',expect:[{loose:'text-footnote text-muted-as-secondary'}]},
  {file:'cc18d27d7-Dym2_dzB.js',local:'D',export:'c',name:'SessionsActionsRail',expect:['group-data-[selection-mode]/table:hidden']},
  {file:'ce58a0513-DSWVLStl.js',local:'r',export:'t',name:'SessionsArchivedBadge',expect:['"0HT+IbyW6O"']},
  {file:'c1ea8a271-CHvO08g4.js',local:'r',export:'t',name:'SessionsHighlight',expect:[{loose:'bg-accent text-inherit rounded-sm'}]},
  {file:'cdfb0c433-OOm3enZf.js',local:'e',export:'r',name:'findSessionTitleMatch',expect:[{loose:'indexOf(t);if(i!==-1)return['}]},
  {file:'shared-2-TF8v67kg.js',local:'y6',export:'ot',name:'CdsRelativeTime',expect:['"data-cds":"RelativeTime"','absoluteAfterHours:']},
  // R2-sidebar SG-2: Base UI mergeProps and clsx, already reached through the CDS
  // controls, for code-current's cds-merge-props re-export (no second copy).
  {file:VF,local:'Jt',export:'La',name:'mergeProps',expect:[{loose:'if(!n&&!r&&!i&&!e)return Jt(t)'},{in:'rn',has:'baseUIHandlerPrevented'}]},
  {file:VF,local:'ve',export:'Ba',name:'clsx',expect:[{loose:'(t=he(e))&&(r&&(r+=" "),r+=t)'},{in:'_e',loose:'Array.isArray(e)'},{in:'Gg',ref:'ria-checked":ye?"mixed":@@,"aria-readonly":m||void'}]},
  // R3-graph (D24): CDS controls the code-current, sidebar-sections, composer,
  // environment and files surfaces replace with host stand-ins today. All but
  // the Menu handle, layer provider, Dialog and root were already reachable;
  // naming them adds no binding. Appended so the existing selection order holds.
  {file:SF,local:'Xm',export:'Kl',name:'CdsTooltip',expect:['"data-cds":"Tooltip"',{in:'yh',loose:'bm=G(null)'}]},
  {file:SF,local:'oc',export:'Ku',name:'CdsShortcut',expect:['className:"mx-[-0.15em] [color:var(--cds-shortcut-cap-ink)]"']},
  {file:SF,local:'cF',export:'bi',name:'CdsSplitDropdownButton',expect:['"data-cds":"SplitDropdownButton"',{loose:'onPrimaryClick:_'}]},
  {file:SF,local:'xP',export:'xi',name:'CdsCheckbox',expect:['"data-cds":"Checkbox"','indeterminate']},
  {file:SF,local:'uC',export:'vs',name:'CdsTextInput',expect:['"data-cds":"TextInput"',{loose:'slotStart:r,slotEnd:i'}]},
  {file:SF,local:'kA',export:'qi',name:'CdsContextMenu',expect:[{loose:'Item:EC.Item'},{loose:'SubmenuPopup:EC.Popup'},{in:'EA',loose:'sheetTitle:t,backLabel:n'}]},
  // Base UI Menu.createHandle: a handle pairs a detached Trigger with its Root and
  // only works with the same Base UI instance as CdsDropdown, hence this graph.
  {file:VF,local:'Sm',export:'Gt',name:'CdsMenuCreateHandle',expect:[{to:'xm',ref:'return new @@'},{in:'xm',has:'"Menu")'},{in:'xm',loose:'super(Qp(),"Menu")'}]},
  {file:SF,local:'hh',export:'Gl',name:'CdsOverflowTooltip',expect:['"data-cds":"OverflowTooltip"','text-ellipsis whitespace-nowrap']},
  // Layer stacking: popups add their offset to the nearest provider's base (qd).
  {file:SF,local:'Lf',export:'ou',name:'CdsLayerProvider',expect:['"CdsLayer"',{loose:'"--cds-layer-base":a'},{in:'If',loose:'Vd=G(0)'},{in:'Pf',loose:'zd=100'}]},
  // Dialog (Root/Trigger/Popup/Header/Title/Description/Footer/Close/CloseButton);
  // the alert variant j_ shares Popup but has its own Root and createHandle.
  {file:SF,local:'nb',export:'Zc',name:'CdsDialog',expect:[{loose:'Root:O_,'},{loose:'CloseButton:C_}'},{in:'tb',loose:'dismissible:e,disablePointerDismissal:t'},{in:'qy',has:'"data-cds":"Dialog"'}]},
  // CDS root: density/mode/platform/font/locale/theme providers on div.cds-root.
  {file:SF,local:'lo',export:'yd',name:'CdsRoot',expect:['"cds-root text-primary"',{loose:'"data-cds-fizzy-lake":k'},{loose:'pageBackground:a'},{in:'ba',loose:'la=G("comfortable")'}]},
  // R4f-graph G1 (D24): CDS controls the proposal group card (r4-proposal-group-card.md WI-0), the R3b-transcript
  // stand-ins and the R4e plugin Overview card replace with host replicas today. Locals and export aliases are the
  // 2.42304.0 shared-frame / vendor-frame ones; the R4 draft's Vh/jh/kh are vendor-frame's Base UI Collapsible
  // Panel/Trigger/Root (exported gt/vt/yt), reached here under CdsCollapsible (Qw) and CdsBanner's details path,
  // not published themselves. Appended so the existing selection order holds.
  // Popover { Root, Trigger, Popup, Title, Description, Close, Arrow, createHandle } (Popup KT -> JT -> GT).
  {file:SF,local:'bk',export:'ua',name:'CdsPopover',expect:[{loose:'Popup:KT,'},{loose:'createHandle:Ce}'},'triggerEl:']},
  {file:SF,local:'IA',export:'Ki',name:'CdsSwitch',expect:['"data-cds":"Switch"',{loose:'disabledReasonSide:r'}]},
  {file:SF,local:'Tk',export:'la',name:'CdsInfoTooltip',expect:[{loose:'Z("moreInfo","More info")'},'"data-cds":"InfoTip"',{loose:'H(nE.Popup,'}]},
  {file:SF,local:'zF',export:'_i',name:'CdsShimmer',expect:['"data-cds":"ShimmerText"']},
  {file:SF,local:'NO',export:'ya',name:'CdsBanner',expect:['"data-cds":"Banner"','"data-prose-box":""',{loose:'T(Qw.Root,'}]},
  // Collapsible { Root, Trigger, Panel } over Base UI's Collapsible.
  {file:SF,local:'fO',export:'xa',name:'CdsCollapsible',expect:[{loose:'Root:qw,Trigger:Xw,Panel:'}]},
  // Disabled-reason wrapper: a CdsTooltip over a focusable span carrying the reason in a hidden described-by span.
  {file:SF,local:'Zm',export:'Wl',name:'CdsDisabledReason',expect:['closeOnClick:!1,openOnHandedBackFocus:!0',{loose:'H(Yc,{id:d,reason:e})'}]},
  // Base UI useDirection over DirectionContext (wd, published above).
  {file:VF,local:'un',export:'Ia',name:'useDirection',expect:[{loose:'return N(wd)?.direction??"ltr"'}]},
  // CDS Card = Object.assign(pu, { Link, Media }) (the R4e plugin Overview rail card).
  {file:SF,local:'cd',export:'Tu',name:'CdsCard',expect:[{loose:'Object.assign(pu,{Link:hu,Media:vu})'},{in:'td',has:'"data-cds":"Card"'},{in:'rd',has:'"data-cds":"CardLink"'},{in:'sd',has:'"data-cds":"CardMedia"'}]},
  // R4g-composer CP1 (X7-07): the React contexts extract-code-composer.mjs used to copy (its contextCopies, now
  // empty). CdsRoot (Za) provides the first five; the composer shell provides the CDS surface (Ea) and Chin (Kd)
  // the CdsButton icon size (Xl). Named so the composer's readers (Sa, Ya, Z, Pa, gr, za, Zl) share these
  // instances with CdsRoot and the view-tabs controls. Each was already selected (CdsRoot's closure): naming adds
  // no binding. xa / da / hr are not exported by the official chunk. Appended so the selection order holds.
  {file:SF,local:'Ma',name:'CdsNaturalImageTilesContext',expect:[{loose:'xa=G(void 0)'},{in:'lo',ref:'90,M,Fe)?K2($,90,M,Fe,b(@@.Provider,{value:M,child'}]},
  {file:SF,local:'za',export:'_d',name:'CdsOwnerWindowContext',expect:[{loose:'Oa=G(void 0)'},{in:'ao',ref:'function ao(){return J(@@)}'}]},
  {file:SF,local:'xn',export:'wf',name:'CdsLabelsContext',expect:[{loose:'vn=G(void 0)'},{in:'pN',ref:'e,Ee=q===void 0||q,De=J(@@),Oe=wn("clearSelection"'}]},
  {file:SF,local:'Sa',name:'CdsModeStoreContext',expect:[{loose:'da=G(void 0)'},{in:'Ga',ref:'let e=W(@@)??fa;'}]},
  {file:SF,local:'Zn',name:'CdsFizzyLakePartsContext',expect:[{loose:'hr=G(void 0)'},{in:'pN',ref:'en:gn,searchPlaceholder:@@,inputDir:c,triggerPrefi'}]},
  {file:SF,local:'La',export:'bd',name:'CdsSurfaceContext',expect:[{loose:'Ea=G(void 0)'},{in:'lo',ref:'2,V,ze)?K2($,102,V,ze,b(@@.Provider,{value:V,child'}]},
  {file:SF,local:'Bu',export:'Du',name:'CdsButtonIconSizeContext',expect:[{loose:'Xl=G(void 0)'},{in:'Uu',ref:',be,Be)?K2($,61,be,Be,b(@@.Provider,{value:be,chil'}]},
  // R4i-graph GR1 (D46): every binding the routines-shared, code-routines and cowork-scheduled graphs import from
  // this graph, named after what the original code does, so no generator imports a minified local (2.42304.0
  // reuses minified names for unrelated values). Each was already selected by the roots above: naming adds no
  // binding. Features are plain strings of the declaration (unique among the chunk's top-level declarations) and,
  // where the declaration is short or carries its own name, one consumer that reads it. vendor-frame's React
  // re-exports (`M=o.useCallback` and the like) are not named: those generators import them from React itself.
  // Names that other areas still slice copies of are held back in `pendingNames` below. Appended so the order holds.
  // Runtime helpers, storage and platform probes the routines graphs reach through view-tabs.
  {file:'c193cfc9b-C3NZYkrZ.js',local:'te',export:'t',name:'cdsPageHeaderScrollOffsetVar',expect:['"--cds-page-header-scroll-offset"']},
  {file:'preload-helper-D0dM6GpB.js',local:'e',export:'n',name:'tagErrorText',expect:[{loose:'(e,t,n){try{'},{in:'r',ref:'catch{}return @@(a,n,"vouched"'}]},
  {file:'preload-helper-D0dM6GpB.js',local:'s',export:'t',name:'vitePreload',expect:['"failed to fetch dynamically imported module"']},
  {file:'rolldown-runtime-C3OYiQ02.js',local:'l',export:'i',name:'toESM',expect:['"default"',{loose:'(n,r,o)=>('}]},
  {file:'rolldown-runtime-C3OYiQ02.js',local:'o',export:'t',name:'commonJS',expect:[{loose:'(e,t)=>()=>('}]},
  {file:'shared-0-DDOOdL6P.js',local:'Qr',export:'Fx',name:'safeLocalStorage',expect:[{loose:'QA("localStorage",!0)'}]},
  {file:'shared-0-DDOOdL6P.js',local:'Zr',name:'createSafeStorage',expect:[{loose:'(e,t){let n=()=>ZA('}]},
  {file:'shared-0-DDOOdL6P.js',local:'Xr',export:'Lx',name:'getWindowStorage',expect:[{loose:'(e){if(typeof window>"u")return XA;'}]},
  {file:'shared-25-DOWZRSlq.js',local:'ZV',export:'Xn',name:'toggledSet',expect:[{loose:'(e,t,n){let r=new Set('}]},
  {file:'shared-25-DOWZRSlq.js',local:'ff',name:'isDocumentNode',expect:[{loose:'(e){return e.nodeType===cp}'}]},
  {file:'shared-25-DOWZRSlq.js',local:'_f',export:'sp',name:'getMutationObserverClass',expect:[{loose:'(e){return up(e)?.MutationObserv'}]},
  {file:'shared-25-DOWZRSlq.js',local:'gf',export:'cp',name:'getResizeObserverClass',expect:[{loose:'(e){return up(e)?.ResizeObserver'}]},
  {file:'shared-25-DOWZRSlq.js',local:'pf',export:'up',name:'ownerWindow',expect:[{loose:'(e){return e?('},{in:'mf',ref:' dp(e){return @@(e)??globalThi'}]},
  {file:'shared-4-DUB1Oi0O.js',local:'ip',export:'Qo',name:'isCaiCuriousTowerEnabled',expect:[{loose:'(){return Od}'},{in:'cp',ref:'Af={panels:@@}'}]},
  {file:'shared-52-uHFNjl7C.js',local:'ZC',export:'tf',name:'useValueChanged',expect:['"skip"','value:',{in:'Pw',ref:'=re??(n&&!M&&!r&&!l);if(@@(M,J0($,12)?K0($,12,{onM'}]},
  {file:'shared-78-D5Fw2h0a.js',local:'Eo',export:'mE',name:'isMacUserAgent',expect:['window.navigator.userAgent.toLowerCase()',{to:'To',ref:'return @@.test(e)'},{in:'To',has:'/(macintosh|macintel|macppc|mac68k|macos)/i'}]},
  // CDS (shared-frame) parts and helpers.
  {file:SF,local:'lv',name:'useCdsFocusReturnRef',expect:['"function"',{in:'DN',ref:'t):$[50],Ze=jn(Ye,t.ref,@@(Xe)),{positionMethod:Qe'}]},
  {file:SF,local:'ui',export:'nf',name:'isBlockedHref',expect:[{loose:'(e,t){return t==="#"&&e!==vo'}]},
  {file:SF,local:'Mc',export:'Lu',name:'isFocusedWithoutFocusVisible',expect:[{loose:'(e){if(e.ownerDocument'}]},
  {file:SF,local:'W_',export:'cl',name:'isTextEditableElement',expect:[{loose:'(e){return e==null?!1:e.matches('}]},
  {file:SF,local:'zh',export:'Il',name:'isImeCompositionKeyEvent',expect:[{loose:'(e){return e.isComposing||'}]},
  {file:SF,local:'Y_',export:'ol',name:'CdsSheetStackContext',expect:[{loose:'By=G(null)'},{in:'tP',ref:'sName:jM,children:s}):G(@@.Provider,{value:i.stack'}]},
  {file:SF,local:'bS',name:'cdsHiddenPopupStyle',expect:['{visibility:"hidden",opacity:0}']},
  {file:SF,local:'e_',export:'_l',name:'blurWithoutRelatedTarget',expect:[{loose:'(e){let t=e=>{'},{in:'v_',ref:'n)&&t!==null&&@@(t)}'}]},
  {file:SF,local:'Ro',export:'cd',name:'cdsIconSizes',expect:['"small"','{xs:{px:12,',{in:'Hu',ref:'ntrol) - ${lo(@@[e].px)}) / 2)'}]},
  {file:SF,local:'pd',name:'CdsSkeletonStartedAtContext',expect:[{loose:'Cu=G(null)'},{in:'hd',ref:',{value:null,children:b(@@.Provider,{value:null,ch'}]},
  {file:SF,local:'FC',export:'ls',name:'cdsMenuItemClass',expect:['"text-primary data-[highlighted]:bg-fill-ghost-hover"']},
  {file:SF,local:'wS',name:'CdsSheetPopupHost',expect:['pending:','kind:','children:',{in:'dk',ref:'2($,0,e,t)?K2($,0,e,t,b(@@,{kind:"popover",childre'}]},
  {file:SF,local:'jn',export:'bf',name:'useCdsMergedRefs',expect:[{in:'oO',ref:'Kw=e=>@@(e,Gw(),zw())'}]},
  {file:SF,local:'ZS',export:'Cs',name:'cdsFieldFocusWithinRingClass',expect:['"has-[:focus-visible]:shadow-focus data-[invalid]:has-[:focus-visible]:shadow-focus-danger"']},
  {file:SF,local:'Vb',export:'Oc',name:'CdsEndSideTooltip',expect:['"right"','"left"','"rtl"','side:',{in:'dT',ref:',I,ee,e=>h===void 0?e:b(@@,{content:ee?h:void 0,mu'}]},
  {file:SF,local:'JS',export:'ys',name:'cdsFieldSurfaceClass',expect:['"bg-fill-field shadow-field-ring data-[invalid]:shadow-field-invalid"']},
  {file:SF,local:'HS',name:'CdsFieldStateContext',expect:[{loose:'Ib=G(null)'},{in:'$j',ref:'nction $j(e,t){return b(@@.Provider,{value:qj[`${t'}]},
  {file:SF,local:'oo',export:'Fd',name:'useCdsOwnerAnchor',expect:[{loose:'(){let e=W(Oa)'},{in:'pN',ref:'"})]}),Dn]})):$[164],Xn=@@(),Zn=p??f,Qn=Fe==="chip'}]},
  {file:SF,local:'Uf',export:'cu',name:'useCdsLayerAwareZIndex',expect:['useCdsLayerAwareZIndex(']},
  {file:SF,local:'qh',export:'Fl',name:'inertProps',expect:[{loose:'(e){return e?{inert:qm?!0:""'}]},
  {file:SF,local:'wr',export:'sf',name:'useLazyObserver',expect:[{loose:'(e,t){let n=qn(()=>new e(t));return{observe:(e,t)=>n.attempt(n=>t===void 0?n.o'}]},
  {file:SF,local:'Dc',export:'Xu',name:'ariaKeyShortcuts',expect:[{loose:'(e,t){let[n,...r]'}]},
  {file:SF,local:'Zt',name:'coarsePointerQuery',expect:[{loose:'Jt="(pointer: coarse)"'},'"(pointer: coarse)"',{in:'rn',ref:'s(Yt)?!0:!(Zt(@@,t)&&(t?.navig'}]},
  {file:SF,local:'ro',export:'kd',name:'useCdsLocale',expect:[{loose:'(){return W(Da)'},{in:'EI',ref:'$=J9(8),{seconds:t}=e,n=@@(),r=bI(),i=n??(r?void 0'}]},
  {file:SF,local:'tC',export:'xs',name:'cdsTextFieldClass',expect:[{loose:'h-control ps-md rounded '},' font-sans text-body font-normal text-primary transition duration-fast']},
  {file:SF,local:'Vf',export:'uu',name:'useCdsPortalLayer',expect:[{loose:'(e){return qd('},{in:'qy',ref:'-dvh":""} ${h?Qv:""}`,v=@@("modal");Ty(o);let y=J('}]},
  {file:SF,local:'US',export:'As',name:'useCdsFieldInvalid',expect:[{loose:'(){return W(Ib)?.invalid??!1}'}]},
  {file:SF,local:'QC',export:'is',name:'cdsMenuScrollAreaClass',expect:['"relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y rounded-[inherit] border-b-[length:var(--cds-ring-inner)] border-transparent forced-colors:border-b-0 p-[var(--cds-menu-gutter,0.25rem)]"']},
  {file:SF,local:'Ui',export:'qd',name:'isFirstPartyHref',expect:[{loose:'(e){if(!e)return!1;'}]},
  {file:SF,local:'lc',export:'Zu',name:'useIsMacPlatform',expect:[{loose:'(){return yt(js,'},{in:'oc',ref:'ap":i,s=a!==void 0&&a,c=@@(),l=wn("sequenceThen",i'}]},
  {file:SF,local:'Mt',export:'Wf',name:'cdsStaysSecondaryTextClass',expect:['"text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]"']},
  {file:SF,local:'Wi',export:'Jd',name:'newTabRelFor',expect:['"noopener noreferrer"']},
  {file:SF,local:'JC',name:'isDocumentCurrentTarget',expect:[{loose:'(e){return e?.currentTarget?'}]},
  {file:SF,local:'kx',name:'useValueLatchedWhileOpen',expect:['wasOpen:']},
  {file:SF,local:'jS',export:'Rs',name:'CdsCheckboxIndicator',expect:['"data-indeterminate"']},
  {file:SF,local:'Ln',export:'_f',name:'useCdsIsoLayoutEffect',expect:[{in:'_M',ref:'scrollToIndex(e)}),[c]),@@(()=>{c.measure()},[c,t]'}]},
  // w2-routines-shared fix (3.6556.2): the tooltip implementation context (2.42304.0 Qc, read by the deferred tooltip
  // trigger and provided with {Tooltip,DisabledReasonTooltip}) is Fl here; HE is the header intl context.
  {file:SF,local:'Fl',name:'CdsTooltipImplContext',expect:[{loose:'Qc=ut(null)'},{in:'_h',ref:'return J1($,0,t)?K1($,0,t,b(@@.Provider,{value:gh,children:t})):$[1]'},{in:'gh',has:'Tooltip:'},{in:'gh',has:'DisabledReasonTooltip:'}]},
  {file:SF,local:'_s',export:'sd',name:'CdsIconSlot',expect:['firstLine:','size:"auto"','className:','children:',{in:'pN',ref:'nter gap-2",children:[b(@@,{icon:ot.icon}),b("span'}]},
  {file:SF,local:'Jx',name:'useCdsSheetPopup',expect:['[data-sheet-tree="','onOpenChangeComplete:']},
  {file:SF,local:'WS',export:'ks',name:'useCdsFieldDisabled',expect:[{loose:'(){return W(Ib)?.disabled??!1}'}]},
  {file:SF,local:'Lh',export:'Ll',name:'setCompositionEndTimestamp',expect:[{loose:'function Rm(e){Fm=e}'}]},
  {file:SF,local:'pu',name:'CdsDisabledReasonWrapper',expect:['interceptors:','wrapperClassName:']},
  {file:SF,local:'YS',export:'bs',name:'cdsFieldHoverRingClass',expect:['"[&:hover:not(:focus-visible):not(:has(:focus-visible)):not([data-invalid]):not([data-disabled])]:shadow-field-hover"']},
  {file:SF,local:'iw',export:'rs',name:'cdsMenuPopupClass',expect:[{loose:'X(`cds-reset draggable'}]},
  {file:SF,local:'qS',export:'Ms',name:'useIsInCdsField',expect:[{loose:'(){return W(Ib)!==null}'},{in:'RN',ref:' 0?"outline":s,l=be(),u=@@(),d=a["aria-label"]!==v'}]},
  {file:SF,local:'If',export:'su',name:'CdsLayerBaseContext',expect:[{loose:'Vd=G(0)'},{in:'Uf',ref:'Jd(e){let t=W(@@);return Gd(`u'}]},
  {file:SF,local:'XS',export:'Ss',name:'cdsFocusVisibleRingClass',expect:['"focus-visible:shadow-focus data-[invalid]:focus-visible:shadow-focus-danger"']},
  {file:SF,local:'sa',export:'Vd',name:'connectedOwnerWindow',expect:[{loose:'(e){if(!Yi('},{in:'ry',ref:'g(e){return e?@@(e)?.matchMedi'}]},
  // context-breakdown (session-rail-context chart-meter): "inside a CdsTooltipProvider" (reads bm, so one instance).
  {file:SF,local:'bh',export:'Yl',name:'useInsideCdsTooltipProvider',expect:[{loose:'function xm(){return W(bm)!==null}'},{in:'km',ref:'>_h,useTooltipGroup:()=>@@,useTooltipTrigger:()=>P'}]},
  {file:SF,local:'$t',name:'windowOrDefault',expect:[{loose:'function Xt(e){return e??(typeof window>"u"?void 0:window)}'},{in:'en',ref:'Zt(e,t){let n=@@(t);return typ'}]},
  {file:SF,local:'so',export:'Nd',name:'useCdsOwnerWindow',expect:[{in:'fx',ref:'y(){return Fn(@@(),An)}'}]},
  {file:SF,local:'Tr',export:'of',name:'useLazyMutationObserver',expect:[{loose:'(e,t){let n=qn(()=>new e(t));return{observe:(e,t)=>n.attempt(n=>n.observe('}]},
  {file:SF,local:'fs',name:'isCdsIconName',expect:[{loose:'(e){return typeof e=="string"}'}]},
  {file:SF,local:'wn',export:'Ef',name:'useCdsLabel',expect:[{in:'DN',ref:'","Loading options"),ce=@@("loadingMoreOptions","L'}]},
  {file:SF,local:'Ac',export:'Vu',name:'CdsSpinner',expect:['"color-mix(in srgb, currentColor 25%, transparent)"']},
  {file:SF,local:'en',name:'matchesMediaQuery',expect:[{loose:'(e,t){let n=Xt(t);return typeof '}]},
  {file:SF,local:'ga',export:'wd',name:'cdsSizeAttributes',expect:[{loose:'(e){return e&&e!=="base"?{'}]},
  {file:SF,local:'ig',export:'Al',name:'cdsSurfaceClass',expect:['"panel"',{loose:'(e){let t=`rounded-card '}]},
  // w11-e31-terminal-cont: the CDS Surface (3.6556.2 cg, exported Dl) the terminal find bar (c6bf19e8f rn `u`) renders.
  {file:SF,local:'cg',export:'Dl',name:'CdsSurface',expect:['"data-cds":"Surface"','"data-surface":']},
  // D1 (w11-pictogram-d1): the CDS TextArea and Pictogram, sliced by cowork-scheduled until 3.6556.2 wave 11 and now
  // published here once (cowork-scheduled, the Projects dialog and SourcePictogram import them by these names).
  {file:SF,local:'nk',export:'da',name:'CdsTextArea',expect:['"data-cds":"TextArea"','autosize:',{to:'XS',ref:'shadow-field-hover ${@@} ${T}'},{in:'XS',has:'data-[invalid]:focus-visible:shadow-focus-danger'}]},
  {file:'shared-156-BLTosN8U.js',local:'KG',export:'Hr',name:'CdsPictogram',expect:['"data-cds":"Pictogram"','highlightFill:',{to:'VG',ref:'className:@@[zG(l)]'},{in:'VG',has:'cactus:"fill-pictogram-highlight-cactus"'},{to:'BG',ref:'typeof c=="number"?c:@@[c]'},{in:'BG',has:'{sm:64,md:96}'}]},
  {file:SF,local:'tx',export:'_c',name:'cdsUnanchoredPositionerProps',expect:['{disableAnchorTracking']},
  {file:SF,local:'Cn',export:'Tf',name:'resolveCdsLabel',expect:[{loose:'(e,t,n,r){return e?.('}]},
  {file:SF,local:'ud',export:'wu',name:'elementResizeObserverClass',expect:[{loose:'(e){return e?.ownerDocument.defaultView?.ResizeObserve'}]},
  {file:SF,local:'ya',export:'Sd',name:'cdsTypeScaleStep',expect:[{loose:'(e,t){let n=oa['},{in:'bT',ref:'C(e,t){return @@(e,t)>=4?"sm":'}]},
  {file:SF,local:'cS',export:'qs',name:'cdsSheetPopupClass',expect:['`group/sheet relative ']},
  {file:SF,local:'af',export:'vu',name:'CdsSkeleton',expect:[{loose:'Object.assign(rd,'},'Lines:']},
  {file:SF,local:'sx',export:'pc',name:'cdsDefaultDensity',expect:[{loose:'dy="comfortable"'}]},
  {file:SF,local:'of',export:'_u',name:'CdsOpensInNewTabHint',expect:['"(opens in new tab)"']},
  {file:SF,local:'hp',export:'$l',name:'CdsPortalRoot',expect:['"cds-root pointer-events-auto"']},
  {file:SF,local:'tS',name:'cdsNoSheetPopupState',expect:['{sheet:!1,concealed:!1,']},
  {file:SF,local:'bo',name:'cdsRemScaleVar',expect:['"--cds-rem-scale"',{in:'So',ref:'o}rem * var(${@@}, 1))`'}]},
  {file:SF,local:'Ha',export:'Td',name:'useCdsDensity',expect:[{loose:'(){return W(la)'},{in:'Uo',ref:'n Do(){return @@()==="comforta'}]},
  {file:SF,local:'Uc',export:'Iu',name:'asElementNode',expect:[{loose:'(e){return e?.nodeType===1?e'}]},
  {file:SF,local:'Wn',name:'useCdsThemeId',expect:[{in:'pN',ref:'tiple:Hn,items:Un,value:@@,onValueChange:Gn,open:S'}]},
  {file:SF,local:'$x',name:'CdsSheetPopupProvider',expect:['value:','children:',{in:'yk',ref:'der,{value:s,children:b(@@,{value:f,children:g})})'}]},
  {file:SF,local:'Fc',name:'cdsDisabledReasonWrappers',expect:[{loose:'nc=new WeakSet'},{in:'wl',ref:'(e){e!==null&&@@.add(e)}'}]},
  {file:SF,local:'Kd',export:'bu',name:'CdsLoadingSkeleton',expect:['\'[data-cds="SkeletonGroup"]\'']},
  {file:SF,local:'bv',name:'useCdsFocusReturn',expect:['popupRef:','finalFocus:',{in:'aw',ref:'inalFocus:m,popupRef:h}=@@(J1($,12,p)?K1($,12,p,{r'}]},
  {file:SF,local:'pi',export:'tf',name:'isNewBrowsingContextTarget',expect:[{loose:'(e){return!!e&&!ei.has('}]},
  {file:SF,local:'qu',name:'CdsLinkPrimitive',expect:['actionDisabled:','nativeButton:']},
  {file:SF,local:'rS',name:'useIsInCdsSheetFrame',expect:[{loose:'(){return W(Fy)'},{in:'TN',ref:' Mk(e){return @@()?H(Nk,{...e}'}]},
  {file:SF,local:'_i',export:'Zd',name:'sanitizeCdsHref',expect:['"it starts with whitespace the browser keeps"']},
  {file:SF,local:'sf',name:'CdsTextLinkInheritColorContext',expect:[{loose:'pd=G(!1)'},{in:'hp',ref:'er,{value:!0,children:b(@@.Provider,{value:!1,chil'}]},
  {file:SF,local:'fg',export:'El',name:'useClickToFocus',expect:['shouldIgnoreTarget:']},
  {file:SF,local:'ao',export:'Id',name:'useCdsOwnerWindowAnchor',expect:[{loose:'(){return W(Oa)'},{in:'bA',ref:'onText:u}=e,d=l(null),f=@@(),p=wn("mentionSuggesti'}]},
  {file:SF,local:'Hf',export:'lu',name:'useCdsLayer',expect:['"--cds-portal-z"',{in:'Vf',ref:' Kd(e){return @@(e)}'}]},
  {file:SF,local:'eS',name:'useControllableOpenState',expect:['onOpenChange:','open:',{in:'_P',ref:'s:t,registration:n}=e,r=@@(t),{onOpenChange:i}=r,a'}]},
  {file:SF,local:'iS',name:'useIsCdsSheetPresentation',expect:[{loose:'(){let e=yy('},{in:'DT',ref:'lse t=$[1],n=$[2];let r=@@(),i=J(vC),{onOpenChange'}]},
  {file:SF,local:'tp',name:'CdsPopupActionsScope',expect:['actionsRef:','value:','children:',{in:'TT',ref:'n.triggerRef,children:b(@@,{actionsRef:n.actionsRe'}]},
  {file:SF,local:'Pc',name:'cdsHandedBackFocusTargets',expect:[{loose:'tc=new WeakMap'},{in:'Jl',ref:'=!1,n!==null&&@@.set(n,t),queu'}]},
  {file:SF,local:'eg',export:'kl',name:'cdsSurfaceLevels',expect:['{panel:"surface-2",']},
  {file:SF,local:'tu',name:'CdsTooltipDeferralContext',expect:[{loose:'vl=G(null)'},{in:'ou',ref:'xl(){return W(@@)?.engage??nul'}]},
  {file:SF,local:'er',export:'hf',name:'useFizzyLakePart',expect:[{in:'tr',ref:'on yr(){let e=@@("color"),t=lr'}]},
  {file:SF,local:'On',export:'Sf',name:'useLatestCallback',expect:[{loose:'(e){let t=V(e);gt(()=>{t.current=e},[e]);let[n]=f(()=>xn('},{in:'pN',ref:']:hidden"})})})):$[116],@@=Ee&&!fn?"w-full min-w-0'}]},
  {file:SF,local:'md',name:'CdsSkeletonGroupContext',expect:[{loose:'wu=G(null)'},{in:'Md',ref:' Hu(){let e=W(@@);return yt(e='}]},
  {file:SF,local:'IC',export:'cs',name:'cdsMenuRadiusClass',expect:['"rounded-[calc(var(--cds-radius)+var(--cds-menu-gutter,calc(0.25rem*var(--cds-rem-scale,1))))]"']},
  {file:SF,local:'bx',export:'cc',name:'cdsSheetScrollAttribute',expect:['"data-cds-sheet-scroll"']},
  {file:SF,local:'IT',export:'Yo',name:'CdsSearchableMenuPopup',expect:['\'[role^="menuitem"]:not([aria-disabled="true"])\'']},
  {file:SF,local:'Rh',export:'Rl',name:'resetCompositionEndOnKeyDown',expect:[{loose:'(e){(e.key!=="Enter"||'}]},
  // Base UI / Floating UI internals (vendor-frame).
  {file:VF,local:'t_',export:'Y',name:'useComboboxRootContext',expect:[{loose:'(){let e=N(Jg)'},{in:'dv',ref:'=!1,...r}=e,i=@@(),a=i.useStat'}]},
  {file:VF,local:'ic',export:'Kr',name:'useFloatingClick',expect:['"virtual"',{loose:'(e,t={}){let{enabled:n=!0,event:r="click'}]},
  {file:VF,local:'Ga',export:'gi',name:'visuallyHiddenAbsoluteStyle',expect:['position:"absolute"','"absolute"','position:',{in:'ue',ref:'{case 31:case 13:return @@===null?Tu():n.alternate'}]},
  {file:VF,local:'Oo',name:'findNonDisabledListIndex',expect:[{loose:'(e,{startingIndex:t=-1,'}]},
  {file:VF,local:'Or',export:'da',name:'useBaseButton',expect:[{loose:'(e={}){let{disabled:t=!1'}]},
  {file:VF,local:'jn',export:'Da',name:'useRenderElement',expect:[{loose:'(e,t,n={}){let r=t.rende'}]},
  {file:VF,local:'js',export:'ei',name:'noFallbackAxisSide',expect:['{fallbackAxisSide:"none"}']},
  {file:VF,local:'Lm',name:'defaultFieldRootContext',expect:['{invalid:void 0,',{in:'Rm',ref:'Im=x(@@)'}]},
  {file:VF,local:'Gd',export:'Bn',name:'startingTransitionProps',expect:['"starting"',{in:'mv',ref:'tRef.current?.focus()}},@@(g),s],stateAttributesMa'}]},
  {file:VF,local:'Rm',name:'FieldRootContext',expect:[{loose:'Im=x(Fm)'},{in:'zm',ref:'e=!0){let t=N(@@);if(t.setVali'}]},
  {file:VF,local:'$a',name:'mathFloor',expect:[{loose:'Ja=Math.floor'},{in:'il',ref:')return;let m=@@(d),h=Ja(a.cli'}]},
  {file:VF,local:'Xg',name:'ComboboxRootContext',expect:[{loose:'Jg=x(void 0)'},{in:'t_',ref:' $g(){let e=N(@@);if(!e)throw '}]},
  {file:VF,local:'$l',export:'xr',name:'ReactStore',expect:[{loose:'class extends ql{'},'"function"',{in:'cd',ref:'class extends @@{setState(e){}'}]},
  {file:VF,local:'Xm',export:'Pt',name:'useLabelableId',expect:[{loose:'(e={}){let{id:t,enabled:n=!0}'}]},
  {file:VF,local:'$n',export:'ba',name:'isHTMLElement',expect:[{loose:'(e){return Hn()?e instanceof HTMLElement||'}]},
  {file:VF,local:'$r',name:'isAndroid',expect:[{loose:'Gr===qr||Wr.includes('}]},
  {file:VF,local:'$u',name:'useTypeahead',expect:[{loose:'(e,t){let{listRef:n,elementsRef:r,'}]},
  {file:VF,local:'Jp',name:'usePopupScrollLock',expect:[{loose:'(e,t,n,r){let['},{in:'fv',ref:'lazyFlip:!0});@@(S&&x,w==="tou'}]},
  {file:VF,local:'Zr',export:'ia',name:'isIOS',expect:['"macintel"',{loose:'/^i(os$|p)'},{in:'ti',ref:'Xr=Yr||@@'}]},
  {file:VF,local:'zm',export:'zt',name:'useFieldRootContext',expect:[{loose:'(e=!0){let t=N(Im)'},{in:'_h',ref:'ionMode:x,validation:S}=@@(),{clearErrors:C,elemen'}]},
  {file:VF,local:'La',export:'vi',name:'useValueAsRef',expect:[{loose:'(e){let t=un(Na,'},{in:'Fh',ref:'),S=dn(t,d),C=@@(s),w=tu(d),T='}]},
  {file:VF,local:'Li',export:'Ki',name:'triggerOpenStateMapping',expect:[{in:'ue',ref:'currentValue=n}function @@(e){e._currentValue=Ni.c'}]},
  {file:VF,local:'Pm',name:'defaultFieldState',expect:['{valid:null,']},
  {file:VF,local:'Ri',export:'Gi',name:'pressableTriggerOpenStateMapping',expect:[{in:'hm',ref:',stateAttributesMapping:@@,state:ae,ref:oe,props:s'}]},
  {file:VF,local:'Rs',export:'Qr',name:'FloatingPortal',expect:['"aria-owns"',{loose:'w(function(e,t){let{render:n,className:r,style:i,children:a,container:o,'}]},
  {file:VF,local:'Ag',name:'stringifyValue',expect:[{loose:'(e){if(e==null)return"";'}]},
  {file:VF,local:'zi',export:'Ui',name:'popupStateMapping',expect:[{in:'Kd',ref:',stateAttributesMapping:@@})}'}]},
  {file:VF,local:'Im',export:'Bt',name:'fieldValidityMapping',expect:[{loose:'{valid(e){'}]},
  {file:VF,local:'Q',export:'xi',name:'createChangeEventDetails',expect:[{loose:'(e,t,n,r){let i=!1,'}]},
  {file:VF,local:'ru',export:'yr',name:'useTransitionStatus',expect:[{loose:'(e,t=!1,n=!1,r=!1)'}]},
  {file:VF,local:'rc',name:'FloatingFocusManager',expect:['"[data-base-ui-click-trigger]"']},
  {file:VF,local:'Us',export:'Xr',name:'useFloatingParentNodeId',expect:[{loose:'()=>N(Is)?.id||null'}]},
  {file:VF,local:'Dn',export:'Aa',name:'emptyObject',expect:['Object.freeze({}']},
  {file:VF,local:'Ao',name:'isListIndexDisabled',expect:[{loose:'(e,t,n){if(typeof n=="function"?'}]},
  {file:VF,local:'Kd',export:'zn',name:'usePositionerElement',expect:[{loose:'(e,t,{styles:n,'},{in:'qd',ref:'eOrigin")}),O=@@(e,V(()=>({ope'}]},
  {file:VF,local:'Gf',name:'InternalBackdrop',expect:['polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,']},
  {file:VF,local:'Gm',export:'It',name:'useLabelableContext',expect:[{loose:'(){return N(Hm)'},{in:'fh',ref:'),{labelId:u}=@@(),d={...c.sta'}]},
  {file:VF,local:'Ki',name:'isInteractiveElement',expect:[{loose:'(e){return e?.closest('}]},
  {file:VF,local:'Um',export:'Rt',name:'useFormContext',expect:[{loose:'(){return N(Bm)'},{in:'mh',ref:'(),{errors:p}=@@(),m=d&&Object'}]},
  {file:VF,local:'Km',export:'Ft',name:'LabelableProvider',expect:[{loose:'function(e){let t=dd('}]},
  {file:VF,local:'Yr',name:'userAgentLowerCase',expect:[{loose:'Vr.toLowerCase('},{in:'$r',ref:'Jr=Gr===qr||@@.includes(qr)'}]},
  {file:VF,local:'X',export:'ma',name:'useIsoLayoutEffect',expect:[{in:'Fh',ref:'tion"&&(v.current=!0)});@@(()=>{!y||u==="starting"'}]},
  {file:VF,local:'Qh',export:'mt',name:'PopoverRoot',expect:[{loose:'(e){return Uh('},'props:','children:']},
  {file:VF,local:'ta',export:'Ii',name:'reasonNone',expect:[{loose:'Xi="none"'},'"none"',{in:'Pa',ref:'enChange(!1,Q(@@))):(p(!1),e?.'}]},
  {file:VF,local:'tu',export:'br',name:'FloatingRootStore',expect:[{loose:'class extends Jl{constructor(e){'}]},
  {file:VF,local:'Y',export:'ha',name:'useStableCallback',expect:[{loose:'(e){let t=un(gr)'},{in:'Yf',ref:'{let n=U(e),r=@@(t);X(()=>{n.c'}]},
  {file:VF,local:'Zf',name:'useOpenInteractionType',expect:[{loose:'(e){let[t,n]=W(null)'}]},
  {file:VF,local:'Z',export:'ta',name:'nodeContains',expect:[{loose:'(e,t){if(!e||!t)'},{in:'Io',ref:'n!!n&&(e===n||@@(n,e))}'}]},
  {file:VF,local:'ni',name:'supportsWebkitBackdropFilter',expect:['"-webkit-backdrop-filter:none"']},
  {file:VF,local:'Su',export:'cr',name:'PopupTriggerMap',expect:['class{constructor(){']},
  {file:VF,local:'uc',export:'Gr',name:'useDismiss',expect:['"__outsidePressBubbles"']},
  {file:VF,local:'sg',export:'dt',name:'PopoverPositioner',expect:[{loose:'w(function(e,t){let{render:n,className:r,style:i,anchor:a,'}]},
  {file:VF,local:'sp',export:'fn',name:'CompositeList',expect:[{loose:'(e){let{children:t,elementsRef:n,'}]},
  {file:VF,local:'Tn',export:'ja',name:'noop',expect:[{loose:'function bn(){}'},{in:'zm',ref:'alidityData===@@&&!e)throw Err'}]},
  {file:VF,local:'To',name:'isListIndexOutOfBounds',expect:[{loose:'(e,t){return t<0||t>=e.lengt'}]},
  {file:VF,local:'pi',export:'na',name:'getEventTarget',expect:[{loose:'(e){return"composedPath"in'}]},
  {file:VF,local:'pn',export:'Pa',name:'formatBaseUiErrorMessage',expect:['"https://base-ui.com/production-error"']},
  {file:VF,local:'gd',export:'qn',name:'useBaseUiId',expect:[{loose:'(e){return ys('},'"base-ui"',{in:'Zm',ref:'Ym(e,t){let n=@@(e);return X(('}]},
  {file:VF,local:'pg',export:'ct',name:'PopoverTitle',expect:['"titleElementId"','"h2"',{to:'Gh',ref:'=@@(),'},{in:'Gh',loose:'throw Error(pn(47))'}]},
  {file:VF,local:'gn',export:'Ma',name:'useBaseUiMergedRefs',expect:[{loose:'(e,t,n,r){let i=un('},{in:'ue',ref:'X"in e?e.movementX:(e!==@@&&(gn&&e.type==="mousemo'}]},
  {file:VF,local:'gr',export:'_a',name:'getOverflowAncestors',expect:[{loose:'(e,t,n){t===void 0&&('},{in:'ue',ref:'=s&&s&&s.ownerDocument&&@@(s.ownerDocument.documen'}]},
  {file:VF,local:'nh',export:'Nt',name:'isControlOfForm',expect:[{loose:'(e,t){return e.matches('}]},
  {file:VF,local:'_h',export:'Et',name:'FieldControl',expect:['"FieldControl"']},
  {file:VF,local:'Nm',name:'defaultValidityState',expect:['{badInput:!1,',{in:'th',ref:'m=Object.keys(@@)'}]},
  {file:VF,local:'dg',export:'ut',name:'PopoverPopup',expect:['"openOnHover"',{loose:'w(function(e,t){let{render:n,className:r,style:i,initialFocus:a,finalFocus:o,...s}=e,c=Uh('}]},
  {file:VF,local:'dh',name:'useFieldItemContext',expect:[{loose:'(){return N(ch)'},{in:'fh',ref:'=e,c=Lm(!1),l=@@(),{labelId:u}'}]},
  {file:VF,local:'ya',export:'Pi',name:'reasonListNavigation',expect:[{loose:'ma="list-navigation"'},{in:'jv',ref:'.setOpen(!0,Q(@@,e.nativeEvent'}]},
  {file:VF,local:'gh',export:'Dt',name:'useRegisterFieldControl',expect:[{loose:'(e,t,n,r,i=!0,'},{in:'_h',ref:'rrent?.value);@@(S.inputRef,A,'}]},
  {file:VF,local:'sa',name:'reasonClosePress',expect:[{loose:'na="close-press"'},{in:'G_',ref:'.setOpen(!1,Q(@@,e.nativeEvent'}]},
  {file:VF,local:'ig',export:'ft',name:'PopoverPortal',expect:['keepMounted:','"mounted"',{to:'Gh',ref:'return @@().useState("mounted")'},{in:'Gh',loose:'throw Error(pn(47))'}]},
  {file:VF,local:'ip',export:'pn',name:'useControlled',expect:[{loose:'({controlled:e,'},'current:','"value"',{in:'yh',ref:'ed:i}=e,[a,o]=@@({controlled:t'}]},
  {file:VF,local:'su',export:'_r',name:'useOpenChangeComplete',expect:[{loose:'(e){let{enabled:t=!0,open:n,'}]},
  {file:VF,local:'va',name:'reasonEscapeKey',expect:[{loose:'pa="escape-key"'},{in:'Z_',ref:':M===null,n=Q(@@,e.nativeEvent'}]},
  {file:VF,local:'hg',export:'ot',name:'PopoverClose',expect:[{loose:'w(function(e,t){let{render:n,className:r,style:i,disabled:a=!1,nativeButton:o=!0,...s}=e,{'}]},
  {file:VF,local:'hp',export:'un',name:'useCompositeListItem',expect:[{loose:'(e={}){let{guess:t,'}]},
  {file:VF,local:'Xd',export:'Fn',name:'inertAttributeValue',expect:[{loose:'(e){return vn('},'"true"',{in:'Kf',ref:'dropRef,inert:@@(!s)}),e.child'}]},
  {file:VF,local:'Yf',export:'vn',name:'useValueChangeCallback',expect:[{loose:'(e,t){let n=U(e)'},{in:'Zf',ref:'f(e,n);return @@(e,t=>{t&&!e&&'}]},
  {file:VF,local:'Qn',export:'ya',name:'isElement',expect:[{loose:'(e){return Hn()?e instanceof Element||e in'}]},
  {file:VF,local:'Qu',name:'useListNavigation',expect:['"aria-activedescendant"']},
  {file:VF,local:'cu',export:'lr',name:'focusableNonTabbableProps',expect:['{tabIndex:-1,[',{in:'Jd',ref:'Ref,g],props:[@@,f,Hd(d),a],st'}]},
  {file:VF,local:'lm',name:'isPointInsideElementRect',expect:[{loose:'(e,t){let n=cm('},{in:'$_',ref:'r,n)||Z(i,n)||@@(e,t)||g.conte'}]},
  {file:VF,local:'fr',export:'ga',name:'getComputedStyleOf',expect:[{loose:'(e){return Wn('},{in:'tl',ref:' Xc(e){return @@(e).direction='}]},
  {file:VF,local:'oa',name:'reasonItemPress',expect:[{loose:'ta="item-press"'},{in:'kp',ref:'vent:e,reason:@@})},onMouseUp('}]},
  {file:VF,local:'oi',export:'ra',name:'stopEvent',expect:[{loose:'(e){e.preventDefault(),e.stopPropaga'}]},
  {file:VF,local:'fg',export:'lt',name:'PopoverArrow',expect:[{loose:'w(function(e,t){let{render:n,className:r,style:i,...a}=e,o=Uh().useState('}]},
  {file:VF,local:'hn',export:'Na',name:'useRefWithInit',expect:[{loose:'(e,t){let n=U(ln)'},{in:'La',ref:'n Ma(e){let t=@@(Na,e).current'}]},
  {file:VF,local:'En',export:'ka',name:'emptyArray',expect:['Object.freeze([]',{in:'Vr',ref:'ion Ir(e){I(e,@@)}'}]},
  {file:VF,local:'Er',export:'fa',name:'ownerDocument',expect:[{loose:'(e){return e?.ownerDocument|'}]},
  {file:VF,local:'wa',name:'reasonCancelOpen',expect:['"cancel-open"',{in:'Tm',ref:'.setOpen(!1,Q(@@,e))},{once:!0'}]},
  {file:VF,local:'wi',export:'Zi',name:'transitionStatusMapping',expect:['{transitionStatus(']},
  {file:VF,local:'ws',export:'ii',name:'useIdOrGenerate',expect:[{loose:'(e,t){if(vs!==void 0)'}]},
  {file:VF,local:'Wa',export:'hi',name:'visuallyHiddenFixedStyle',expect:['position:"fixed"','left:','position:','"fixed"',{in:'Ka',ref:'span",{...e,ref:t,style:@@,"aria-hidden":!n||void '}]},
  {file:VF,local:'Hd',export:'Vn',name:'useAnchorPositioning',expect:[{loose:'(e){return Bd('},{in:'qd',ref:'ionStatus"),D=@@({anchor:i,pos'}]},
  {file:VF,local:'Vm',name:'useFieldsetRootContext',expect:[{loose:'(e=!1){let t=N(Rm)'},{in:'ch',ref:'ontrolValue:v,...y}=e,b=@@(!0)?.disabled,x=Y(s||(('}]},
  {file:VF,local:'Wr',export:'oa',name:'useTimeout',expect:[{loose:'(){let e=un(Rr.create)'},{in:'Sd',ref:'erablePopup"),P=W(!1),F=@@(),I=W(void 0);function '}]},
  // R4i-graph GR3: what the composer attachment tiles (extract-code-composer.mjs, shared-2 wp / Pp / Bp / Ap) still
  // copied or stood in for. xu / Su are the two contexts the CDS Skeleton reads (rd / ad): `true` / the element type
  // under a Skeleton's shimmer (its children's provider), reset to false / "div" by Tu under every popup surface; already
  // selected (CdsSkeleton's closure), naming adds no binding. Cd (exported `Xc`) is the CDS TextLink the failed strip's
  // Retry renders, over CdsLinkPrimitive (nu) and CdsTextLinkInheritColorContext (pd), published above.
  {file:SF,local:'dd',name:'CdsSkeletonShimmerContext',expect:[{loose:'xu=G(!1)'},{in:'hd',ref:'rn J1($,0,t)?K1($,0,t,b(@@.Provider,{value:!1,chil'}]},
  {file:SF,local:'fd',name:'CdsSkeletonElementContext',expect:[{loose:'Su=G("div")'},{in:'Jd',loose:'s=Eu[i??o]'}]},
  {file:SF,local:'_f',export:'hu',name:'CdsTextLink',expect:['"cursor-default opacity-disabled"']},
  // The CDS platform the Video tile reads (Fa, exported `hu`: CdsRoot's `platform`, provided as ga, "web" outside one).
  {file:SF,local:'Da',name:'CdsPlatformContext',expect:[{loose:'ga=G(void 0)'},{in:'Ka',ref:'return W(@@)??"web"'}]},
  {file:SF,local:'Ka',export:'Pd',name:'useCdsPlatform',expect:[{loose:'return W(ga)??"web"'}]},
  // 2026-10-18 account avatar: the sidebar account button's avatar (shared-19 C0 = pp{name,src,size:"sm"}, pp = shared-frame `si`): the image,
  // or the name's initials (lj: first + last word's first letter, upper-cased in the CDS locale, "?" when empty).
  {file:SF,local:'vF',export:'vi',name:'CdsAvatar',expect:['"data-cds":"Avatar"',{loose:'onError:()=>u(!0)'},{in:'_F',loose:'.toLocaleUpperCase(t)||"?"'}]},
  // E3 (3.6556.2): the React Compiler cache helpers every 3.6556.2 component closure imports from shared-frame
  // (`let $=J9(n)`, `J1($,i,v)?K1($,i,v,…):$[i+1]`). They are published here once, under fixed semantic names, so
  // other areas' 3.6556.2 slices import them instead of a minified local or a second copy (D1/D24/D46). A helper's
  // whole body is its identity: the parameters are the minifier's positional names (e,t,n,…), so the features are
  // exact rather than loose (a loose body would also match the helper that stores in the other order).
  {file:SF,local:'J9',export:'ip',name:'reactMemoCache',expect:[{boundary:['react/compiler-runtime','c']}]},
  {file:SF,local:'J8',export:'rp',name:'memoSentinel',expect:['Symbol.for("react.memo_cache_sentinel")']},
  {file:SF,local:'J0',export:'Zf',name:'memoIsEmpty',expect:[{to:'J8',ref:'(e,t){return e[t]===@@}'}]},
  {file:SF,local:'J1',export:'Qf',name:'memoChanged1',expect:['(e,t,n){return e[t]!==n}']},
  {file:SF,local:'J2',export:'$f',name:'memoChanged2',expect:['(e,t,n,r){return e[t]!==n||e[t+1]!==r}']},
  {file:SF,local:'J3',export:'ep',name:'memoChanged3',expect:['(e,t,n,r,i){return e[t]!==n||e[t+1]!==r||e[t+2]!==i}']},
  {file:SF,local:'J4',export:'tp',name:'memoChanged4',expect:['(e,t,n,r,i,a){return e[t]!==n||e[t+1]!==r||e[t+2]!==i||e[t+3]!==a}']},
  {file:SF,local:'J5',export:'np',name:'memoChanged5',expect:['(e,t,...n){for(let r=0;r<n.length;r++)if(e[t+r]!==n[r])return!0;return!1}']},
  {file:SF,local:'K0',export:'ap',name:'memoStore0',expect:['(e,t,n){return e[t]=n,n}']},
  {file:SF,local:'K1',export:'op',name:'memoStore1',expect:['(e,t,n,r){return e[t]=n,e[t+1]=r,r}']},
  {file:SF,local:'K2',export:'sp',name:'memoStore2',expect:['(e,t,n,r,i){return e[t]=n,e[t+1]=r,e[t+2]=i,i}']},
  {file:SF,local:'K3',export:'cp',name:'memoStore3',expect:['(e,t,n,r,i,a){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,a}']},
  {file:SF,local:'K4',export:'lp',name:'memoStore4',expect:['(e,t,n,r,i,a,o){return e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a,e[t+4]=o,o}']},
  {file:SF,local:'K5',export:'up',name:'memoStore5',expect:['(e,t,...n){for(let r=0;r<n.length;r++)e[t+r]=n[r];return n[n.length-1]}']},
  {file:SF,local:'I1',export:'Kf',name:'memoStoreValueFirst1',expect:['(e,t,n,r){return e[t]=r,e[t+1]=n,n}']},
  {file:SF,local:'I2',export:'qf',name:'memoStoreValueFirst2',expect:['(e,t,n,r,i){return e[t]=r,e[t+1]=i,e[t+2]=n,n}']},
  {file:SF,local:'I3',export:'Jf',name:'memoStoreValueFirst3',expect:['(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=n,n}']},
  {file:SF,local:'I4',export:'Yf',name:'memoStoreValueFirst4',expect:['(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,e[t+4]=n,n}']},
  {file:SF,local:'I5',export:'Xf',name:'memoStoreValueFirst5',expect:['(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return e[t+r.length]=n,n}']},
  {file:SF,local:'Z1',export:'dp',name:'memoStoreDeps1',expect:['(e,t,n,r){return e[t]=r,n}']},
  {file:SF,local:'Z2',export:'fp',name:'memoStoreDeps2',expect:['(e,t,n,r,i){return e[t]=r,e[t+1]=i,n}']},
  {file:SF,local:'Z3',export:'pp',name:'memoStoreDeps3',expect:['(e,t,n,r,i,a){return e[t]=r,e[t+1]=i,e[t+2]=a,n}']},
  {file:SF,local:'Z4',export:'mp',name:'memoStoreDeps4',expect:['(e,t,n,r,i,a,o){return e[t]=r,e[t+1]=i,e[t+2]=a,e[t+3]=o,n}']},
  {file:SF,local:'Z5',export:'hp',name:'memoStoreDeps5',expect:['(e,t,n,...r){for(let n=0;n<r.length;n++)e[t+n]=r[n];return n}']},
  // cds:C8 / E32 / E37 (3.6556.2): the new CDS Toolbar (Object.assign(root, {Title})), published as a root only; areas
  // that import it (shared-frame `ll`, e.g. the pane region's `x.Title`) migrate to this name when they move.
  {file:SF,local:'H_',export:'ll',name:'CdsToolbar',expect:[{to:'B_',ref:'Object.assign(@@,{Title:'},{in:'B_',has:'"data-cds":"Toolbar"'},{in:'B_',has:'role:"toolbar"'},{in:'B_',has:'translucentTakesPointer:'}]},
  // w2-routines-shared (3.6556.2, D46): bindings view-tabs holds that other graphs read (cdbc75b4b Br in routines-shared,
  // files-changes' coarse-pointer target and code-composer's frame: the touch-like pointer check and its media change
  // subscription; c9e1458cd's page title row: the fizzy-lake part check, always off because the allow-list Qm is empty,
  // asserted below; E12).
  {file:SF,local:'tn',export:'Rf',name:'matchesCoarseOrHoverlessPointer',expect:[{to:'Yt',ref:'{return en(@@,e)}'},{in:'Yt',has:'"(pointer: coarse), (hover: none)"'}]},
  {file:SF,local:'an',export:'Vf',name:'subscribeInputMediaChanges',expect:['.matchMedia(e));for(let t of r)t.addEventListener("change",e);',{loose:'[Yt,Xt,Zt].map('}]},
  {file:'shared-52-uHFNjl7C.js',local:'th',export:'og',name:'isFizzyLakePartOptedIn',expect:[{loose:'return eh().parts.includes(e)'}]},
  // w3-code-routines (3.6556.2, D46): bindings view-tabs holds that the Code Routines form reads through the shared-frame
  // CDS pieces it copies (c0fd2fda3's name / Runs on / model fields: the text input nk, the combobox yP, shared-7's
  // model picker Nw). Va is a context (the CDS portal root marks its subtree), so it must stay one object.
  {file:SF,local:'jl',export:'Pu',name:'CdsHiddenReasonText',expect:[{loose:'{id:t,reason:n}=e'},'hidden:!0']},
  {file:SF,local:'El',export:'Fu',name:'cdsHasContent',expect:['return!!e',{in:'jl',ref:'let a=@@(n)?n:null'}]},
  {file:SF,local:'PT',export:'Zo',name:'useCdsPopupFocusOrigin',expect:['["keydown","pointerdown","pointermove","pointerover","wheel"]','[role="menu"]']},
  {file:SF,local:'zS',name:'useCdsTextInputState',expect:[{loose:'{value:n,dir:r,type:i,remountKey:a}=t'},'i==="password"']},
  {file:SF,local:'fu',export:'Au',name:'CdsDeferredTooltip',expect:[{loose:'{impl:t,wasCold:n,interceptors:r,trackTrigger:i}=su(!0)'},'e.autoFocus===!1']},
  {file:SF,local:'Va',name:'CdsPortalRootContext',expect:[{loose:'Va=ut(!1)'},{in:'oo',ref:'n=J(@@);return e??(n?void 0:t)'}]},
  // w3-cowork-scheduled (3.6556.2, D46): the Electron-or-not-touch window check shared-7 kk (the focus-return hook of
  // c058fad4e's form section, read by c97b955f1 La) calls; named as code-current's copy (canFocusComposerOnClick).
  {file:SF,local:'rn',export:'If',name:'canFocusComposerOnClick',expect:[{loose:'return t?.navigator?.userAgent?.includes(Qt)?!0:!(en(Zt,t)&&(t?.navigator?.maxTouchPoints??0)>0)'}]},
  // w11-sweep-rest (w10-chat-tests low*): the CDS locale context (3.6556.2 shared-frame Ra; not exported by the
  // official chunk). The official root CdsRoot (frame-shell-chrome Ji `locale:r.locale`, shared-50 `locale:l`) provides
  // it; useCdsLocale (ro) and nested CdsRoots read it. The host root has no CdsRoot, so it provides this context with
  // its UI locale. Already selected by CdsRoot's closure: naming adds no binding.
  // w11-sweep-rest (w10-cleanup-host-compat): the CDS Counter (3.6556.2 shared-frame vE, exported `Vo`) the sidebar drag
  // ghost's multi-row count is (shared-46 Mj `o(F,{value:v,variant:"accent",size:"xs",…})`, F = shared-frame Vo).
  {file:SF,local:'vE',export:'Vo',name:'CdsCounter',expect:['"data-cds":"Counter"','showZero:',{loose:'h=m>u?`${u}+`:`${m}`'}]},
  {file:SF,local:'Ra',name:'CdsLocaleContext',expect:[{loose:'Ra=ut(void 0)'},{in:'ro',ref:'function ro(){return J(@@)}'},{in:'lo',ref:'ne=J(@@),re=J1($,10,s)'}]},
  // w12-preview: the attachment pill c0fbbe82d ko positions its hover preview with Floating UI (`l(he)` useFloating,
  // `[y(8), s(Fo), c(Po)]` offset/shift/size, Oo wraps `o` autoUpdate), and the image menu c26fb8b6b E/He read the
  // anchor's window through shared-frame Bd (aa). All already selected (vendor-frame/shared-frame closures): naming adds no binding.
  {file:VF,local:'xl',export:'Pr',name:'useFloating',expect:[{loose:'(e){e===void 0&&(e={});let{placement:t="bottom",strategy:n="absolute",middleware:r=[]'},'floatingStyles:']},
  {file:VF,local:'al',export:'Lr',name:'floatingAutoUpdate',expect:[{loose:'(e,t,n,r){r===void 0&&(r={});let{ancestorScroll:i=!0,ancestorResize:a=!0'}]},
  {file:VF,local:'Sl',export:'jr',name:'floatingOffset',expect:[{to:'ol',ref:'(e,t)=>{let n=@@(e);return{name:n.name,fn:n.fn,options:[e,t]}}'}]},
  {file:VF,local:'Cl',export:'Mr',name:'floatingShift',expect:[{to:'cl',ref:'(e,t)=>{let n=@@(e);return{name:n.name,fn:n.fn,options:[e,t]}}'}]},
  {file:VF,local:'El',export:'Nr',name:'floatingSize',expect:[{to:'ul',ref:'(e,t)=>{let n=@@(e);return{name:n.name,fn:n.fn,options:[e,t]}}'}]},
  {file:SF,local:'aa',export:'Bd',name:'cdsNodeOwnerWindow',expect:[{loose:'(e){return e?.ownerDocument.defaultView??globalThis.window}'}]},
  // w12-viewtabs (item 8, publish only): the CDS RadioGroup (dV = Object.assign(lV,{Root:uV,Item:oV,Card:cV}), exported
  // `yt`), its item (aV = oV, not exported: Base UI Radio.Root with the cds-reset group/rd classes) and indicator (iV),
  // and the CDS Combobox (vP = Object.assign(pN,{Root,Trigger,…}), exported `Ci`) with its Field wrapper (yP, exported
  // `Si`: label/hint/error around vP). The settings consumers move to these names in a follow-up lane.
  {file:SF,local:'dV',export:'yt',name:'CdsRadioGroup',expect:[{loose:'Object.assign(lV,{Root:uV,Item:oV,Card:cV})'},{in:'lV',has:'"data-cds":"RadioGroup"'}]},
  {file:SF,local:'aV',name:'CdsRadioGroupItem',expect:['"cds-reset group/rd inline-flex"','"gap-2 border-0 outline-none focus-visible:outline-hidden text-start text-body font-normal text-primary data-[disabled]:opacity-disabled"']},
  {file:SF,local:'iV',name:'CdsRadioIndicator',expect:['"group-focus-visible/rd:shadow-focus"','"mt-[calc((1lh_-_var(--cds-checkbox,1rem))_/_2)]"']},
  {file:SF,local:'vP',export:'Ci',name:'CdsCombobox',expect:[{loose:'Object.assign(pN,{Root:gP,Trigger:RN,Value:zN,'},'ChipRemove:','Collection:']},
  {file:SF,local:'yP',export:'Si',name:'CdsComboboxField',expect:['fieldClassName:','o.mode!=="input"&&o.triggerMode!=="chips"']},
  // The Field and Combobox parts other graphs read directly once vP / yP live here (D1/D46): code-routines'
  // c0fd2fda3 form and cowork-scheduled's c97b955f1 La render the CDS Field pieces (Qj label/hint/error wrapper over
  // Jj Field.Root, Yj label, Xj description, Zj error; GS the label id), shared-7's model picker reads the control and
  // field classes (QS, $S = cdsFieldSurfaceClass + cdsFieldHoverRingClass, eC) and c0fd2fda3 the item filter (nN);
  // cd2687f9f builds its own combobox from the Base UI Combobox parts (vendor-frame, below). Naming adds no binding.
  {file:SF,local:'Qj',export:'Ni',name:'CdsLabeledField',expect:[{loose:'{label:t,hint:n,error:r,fieldClassName:i,children:a}=e'},{loose:'b(Zj,{match:!0,children:r})'}]},
  {file:SF,local:'Jj',export:'Mi',name:'CdsField',expect:['"data-cds":"Field"','"flex flex-col gap-xs font-sans"','"onBlur"']},
  {file:SF,local:'Yj',export:'ji',name:'CdsFieldLabel',expect:['"text-body font-medium leading-none text-primary"']},
  {file:SF,local:'Xj',export:'ki',name:'CdsFieldDescription',expect:['"text-footnote font-normal leading-snug"',{loose:'Q("text-footnote font-normal leading-snug",Mt,n)'}]},
  {file:SF,local:'Zj',export:'Ai',name:'CdsFieldError',expect:['"flex items-start gap-1 text-footnote font-normal leading-snug text-danger"','name:"WarningCircle"']},
  {file:SF,local:'GS',export:'js',name:'useCdsFieldLabelId',expect:[{loose:'(){let{labelId:e,controlId:t}=T();return e??(t?`${t}-label`:void 0)}'}]},
  {file:SF,local:'QS',export:'Es',name:'cdsControlBaseClass',expect:['"cds-reset inline-flex items-center gap-1.5 h-control rounded font-sans text-body font-normal font-control text-primary outline-none focus-visible:outline-hidden transition duration-fast data-[disabled]:opacity-disabled data-[disabled]:pointer-events-none"']},
  {file:SF,local:'$S',export:'Ds',name:'cdsFieldSurfaceHoverClass',expect:[{loose:'$S=`${JS} ${YS}`'},{to:'JS',ref:'`${@@} ${YS}`'},{to:'YS',ref:'`${JS} ${@@}`'}]},
  {file:SF,local:'eC',export:'Os',name:'cdsFieldIconSlotClass',expect:['`pointer-events-none flex size-icon shrink-0 items-center justify-center ${']},
  {file:SF,local:'nN',export:'wi',name:'cdsComboboxItemMatches',expect:[{loose:'(e,t){let n=tN(t);return tN(e.label).includes(n)||tN(e.value).includes(n)}'}]},
  // The root rem-size hook (Lo, exported `pd`: useSyncExternalStore over Io / Po / Fo); Io's listener set No and the
  // cached size Mo are module state, now held here (the combobox reads it), so transcript-rows imports this one copy.
  {file:SF,local:'Lo',export:'pd',name:'useCdsRootRemPx',expect:[{to:'Io',ref:'(){return W(@@,Po,Fo)}'},{in:'Io',has:'new ResizeObserver('},{in:'Io',loose:'No.add(e)'}]},
  // w12-viewtabs (item 9, D1): bindings view-tabs already held without a semantic name, copied by other areas
  // (artifact-library / working-line / session-rail-kit / code-composer `viewTabsCopies`, sessions-page pure-shared-25):
  // the CDS icon alias table (yo, exported `md`), the reduced-motion query, attribute and check (Sh / Ch / wh, wh exported
  // `Hl`), the CDS Spark (Jg, exported `bl`; its stateful wrapper ZO is not rooted: the animated YO lazy-loads
  // cf2613ee5 through qO, a dynamic boundary this graph refuses), and shared-25's set toggle (QV, exported `Zn`; ZV is
  // toggledSet above).
  {file:SF,local:'yo',export:'md',name:'cdsIconAliases',expect:['Animation:"PlayCircle"','CaretDownFilled:"CaretDown"']},
  {file:SF,local:'Sh',name:'reducedMotionQuery',expect:['"(prefers-reduced-motion: reduce)"']},
  {file:SF,local:'Ch',name:'reduceMotionAttribute',expect:['"data-reduce-motion"',{in:'wh',ref:'getAttribute(@@)==="true"'}]},
  {file:SF,local:'wh',export:'Hl',name:'prefersReducedMotion',expect:[{loose:'window.matchMedia(Sh).matches||document.documentElement.getAttribute(Ch)==="true"'}]},
  {file:SF,local:'Jg',export:'bl',name:'CdsSpark',expect:['"data-cds":"Spark"','"--cds-spark-size":','viewBox:"0 0 100 100"']},
  {file:'shared-25-DOWZRSlq.js',local:'QV',export:'Zn',name:'setToggle',expect:[{loose:'(e,t){return ZV(e,t,!e.has(t))}'}]},
  // w12-viewtabs (item 10, D1): the overflow menu's RTL arrow flip (L) and typeahead reset keys (ie), both read by ae and
  // ViewTabOverflowItem (se); already selected, so code-current's terminal-tab-overflow.mjs re-exports these with se and
  // viewTabSizes instead of slicing a second se (and a second P = createContext("xs") icon-size context).
  {file:'cfe7c4b3b-BF79K6ux.js',local:'L',name:'viewTabRtlArrowKey',expect:[{loose:'(e){return e==="ArrowLeft"?"ArrowRight":e==="ArrowRight"?"ArrowLeft":e}'}]},
  {file:'cfe7c4b3b-BF79K6ux.js',local:'ie',name:'viewTabOverflowTypeaheadResetKeys',expect:['["ArrowUp","ArrowDown","Home","End","ArrowRight","Delete"]']},
  // w12 viewtabs-cont (publish only, for the settings / diff / side-chat lanes): the labeled text input and textarea
  // (eM exported `Oi`, tM exported `Di`: Qj label/hint/error over uC CdsTextInput / nk CdsTextArea), the checkbox row
  // classes (DS `Fs`, OS `Ls`, kS `Is`) and its double-click selection guard (Ks `$u`), the checkbox row itself
  // (c09817156 h), the dropdown group label class (hT `qo`) and the CDS ButtonGroup (lF `yi`) c4db265df's pane header
  // (rn, side chat N_) reads. The CdsDropdown parts need no names: they are members of GT (CdsDropdown.Item = dT, …).
  {file:SF,local:'eM',export:'Oi',name:'CdsTextInputField',expect:[{to:'uC',ref:'b(@@,{ref:t,required:o,...s})'},{loose:'b(Qj,{label:a,hint:i,error:n,fieldClassName:r,children:c})'}]},
  {file:SF,local:'tM',export:'Di',name:'CdsTextAreaField',expect:[{to:'nk',ref:'b(@@,{ref:t,required:o,...s})'},{loose:'b(Qj,{label:a,hint:i,error:n,fieldClassName:r,children:c})'}]},
  {file:SF,local:'DS',export:'Fs',name:'cdsCheckboxRowClass',expect:['"inline-flex gap-xs text-start font-sans text-body font-normal text-primary"']},
  {file:SF,local:'OS',export:'Ls',name:'cdsCheckboxTopAlignClass',expect:['OS="mt-[calc((1lh_-_var(--cds-checkbox,1rem))_/_2)]"']},
  {file:SF,local:'kS',export:'Is',name:'cdsCheckboxDescriptionClass',expect:['`text-footnote leading-snug ${Mt}`']},
  {file:SF,local:'Ks',export:'$u',name:'preventMultiClickSelection',expect:[{loose:'(e){e.detail<=1||e.button!==0||e.target.closest?.("input:not([type=\'hidden\']):not([disabled]),[contenteditable]:not([contenteditable=\'false\']),textarea:not([disabled])")||e.preventDefault()}'}]},
  {file:'c09817156-D4yWRk21.js',local:'h',export:'t',name:'CdsCheckboxRow',expect:['"group/cb items-start self-start"','"flex min-w-0 flex-col"',{loose:'onMouseDown:a,onClick:m'}]},
  {file:SF,local:'hT',export:'qo',name:'cdsDropdownGroupLabelClass',expect:['"compact:px-2 comfortable:px-2.5 py-1 text-footnote font-medium text-muted"']},
  {file:SF,local:'lF',export:'yi',name:'CdsButtonGroup',expect:[{loose:'{variant:t,orientation:n,children:r,size:i,buttonVariant:a}=e,o=t===void 0?"spaced":t'}]},
  // The window.open wrapper (ua, exported `Ud`) the preview issue pill and the question card's links call (question-cont,
  // preview-cont): opens through the anchor's owner window (aa), refuses when oa says the node is detached.
  {file:SF,local:'ua',export:'Ud',name:'cdsOpenWindow',expect:[{loose:'(e,t,n="_blank",r="noopener"){try{if(oa(e))return!1;let i=aa(e);return i?(i.open(t,n,r),!0):!1}catch{return!1}}'}]},
  // w12-viewtabs (item 8, D1/D46): Base UI's Combobox parts (vendor-frame, reached through CdsCombobox), which
  // code-routines' cd2687f9f model picker composes itself; named by the Base UI part each one is.
  {file:VF,local:'P_',export:'J',name:'BaseComboboxRoot',expect:['selectionMode:t?"multiple":"single"',{loose:'formAutoComplete:a'}]},
  {file:VF,local:'Z_',export:'W',name:'BaseComboboxInput',expect:[{loose:'let{render:n,className:r,disabled:i=!1,id:a,style:o,...s}=e,{state:c,disabled:l,setTouched:u,setFocused:d,validationMode:f,validation:m}=zm(),{labelId:h}=Gm(),g=H_()'}]},
  {file:VF,local:'$_',export:'U',name:'BaseComboboxTrigger',expect:[{loose:'let{render:n,className:r,nativeButton:i=!0,disabled:a=!1,id:o,style:s,...c}=e,{state:l,disabled:u,setTouched:d,setFocused:f,validationMode:p,validation:m}=zm(),{labelId:h}=Gm(),g=t_(),_=g.useState("selectionMode")'}]},
  {file:VF,local:'cv',export:'B',name:'BaseComboboxStatus',expect:[{loose:'{let{render:n,className:r,style:i,children:a,...o}=e;return jn("div",e,{ref:[t,sv()],props:[{children:a,role:"status","aria-live":"polite","aria-atomic":!0},o]})}'}]},
  {file:VF,local:'Nv',export:'k',name:'BaseComboboxEmpty',expect:['emptyRef',{loose:'u=s.length===0?a:null;'}]},
  {file:VF,local:'Tv',export:'P',name:'BaseComboboxItem',expect:['"virtualized"',{loose:'indexFromFilter:void 0'}]},
  {file:VF,local:'Ev',export:'N',name:'BaseComboboxItemIndicator',expect:[{loose:'{let{selected:n}=bv();return e.keepMounted||n?K(Dv,{...e,ref:t}):null}'}]},
  {file:VF,local:'_v',export:'I',name:'BaseComboboxGroup',expect:[{loose:'role:s?"rowgroup":"group","aria-labelledby":c'}]},
  {file:VF,local:'vv',export:'F',name:'BaseComboboxGroupLabel',expect:[{loose:'{setLabelId:s}=gv(),c=gd(a);return X(()=>(s(c),()=>{s(e=>e===c?void 0:e)}),[c,s])'}]},
  {file:VF,local:'iv',export:'V',name:'BaseComboboxList',expect:['"aria-multiselectable"','"listElement"','keyboardActiveRef']},
  {file:VF,local:'mv',export:'L',name:'BaseComboboxPopup',expect:[{loose:'initialFocus:a,finalFocus:o,...s}=e,c=t_(),l=W_(),u=n_()'}]},
  {file:VF,local:'fv',export:'R',name:'BaseComboboxPositioner',expect:['"inputGroupElement"','"inputInsidePopup"','"popupSide"']},
  {file:VF,local:'dv',export:'z',name:'BaseComboboxPortal',expect:[{loose:'a=i.useState("mounted"),o=i.useState("forceMounted");return a||n||o?K(lv.Provider,{value:n,children:K(Rs,{ref:t,...r})}):null'}]},
  // w12b-slash-plugin-groups (publish only): TanStack Virtual's useVirtualizer (sy, exported `S`), already selected
  // through shared-frame; ccc334009's slash list M calls it (`r({count, getItemKey, getScrollElement, estimateSize,
  // overscan: 8, scrollPaddingStart: 28, scrollPaddingEnd: 28})`) once the list reaches A = 30 rows.
  {file:VF,local:'sy',export:'S',name:'useVirtualizer',expect:[{loose:'(e){return oy({observeElementRect:Jv,observeElementOffset:Qv,scrollToFn:ey,...e})}'}]},
  // w12b-terminal-preview-tabs (TPT-2, publish only): the CDS alert dialog parts (ib, exported `Yc`), which cf580efe9 va
  // (`Yc as E`: `E.Root`, `E.Popup`, `E.Title`, `E.Description`, `E.Footer`) renders for "Close {host}?".
  {file:SF,local:'ib',export:'Yc',name:'CdsAlertDialog',expect:[{loose:'Root:rb,Trigger:Ie,Popup:qy,Backdrop:F,Header:Zy,Title:Jy,Description:Qy,Footer:eb,Close:Ue,CloseButton:Xy,createHandle:ze'},
    {in:'rb',has:'actionsRef:r'}]},
  // w12b-terminal-preview-tabs (TPT-5, publish only): the dialog popup's viewport height cap (Yv, exported `Qc`), which
  // c36734a81 P puts on its unstyled CdsDialog popup (`max-w-[calc(100vw-2rem)] ${f}`).
  {file:SF,local:'Yv',export:'Qc',name:'cdsDialogViewportMaxHeightClass',expect:[{loose:'Yv="max-h-[calc(100dvh_-_max(2rem,2*var(--desktop-titlebar-inset,0px))_-_2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))]"'}]},
  // w13-coworkui-approval (publish only): the composer radius class ($h, exported `jl`), which cef5c410f p (the hub
  // approval card surface `a(c,"bg-surface-3 shadow-panel-sm")`) reads; cowork-approval imports it.
  {file:SF,local:'$h',export:'jl',name:'composerRadiusClass',expect:['$h="rounded-composer"']},
  // w13-close-chat-project-rows (publish only, D1): the CDS data table (ce802b15a Mo = memo(forwardRef(To)), exported
  // `t`), already selected through CdsSelectableTable (c9c7785eb F); c71dee58b Ol renders it as `bo` for the project
  // page's conversation rows (columns Tl, getRowKey _l, getRowHref vl, linkComponent Sl, flush), and chat-projects imports it.
  {file:'ce802b15a-C7eXhKeI.js',local:'Mo',export:'t',name:'CdsDataTable',expect:[{to:'To',ref:'(@@))'},{in:'To',has:'getRowLinkLabel:m,'},{in:'To',has:'skeletonRowCount:x,'}]},
];
// E4 (3.6556.2): every D46 name once held back here is published; nothing is pending.
const pendingNames={};
const identifier=/^[A-Za-z_$][\w$]*$/;
const keywords=/^(return|let|var|new|void|in|of|if|for|null|true|false|typeof|this|try|catch|else|case|function|const|throw|while|do|break|continue|switch|default|delete|instanceof|class|extends|super|async|await|yield)$/;
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// R2/E5 loose fragment: string literals stay exact, identifiers of at most 3 characters (minified names) match any
// such identifier unless they are keywords, object keys or member names. Kept beside official.looseFeature on purpose:
// most `ref`/`loose` features here are byte windows cut mid-token (`"aria-checked":ye?…`, `…throw Err`, `X(\`cds-reset`)
// that looseFeature rejects (unterminated string) or misses (word boundaries, back-references); measured over this
// generator's --check, 81 distinct features differ (w10-cleanup-viewtabs-legacy report).
function looseSource(feature) {
  let out='',i=0;
  while(i<feature.length) {
    const c=feature[i];
    if(c==='"'||c==="'"||c==='`'){let j=i+1;while(j<feature.length&&feature[j]!==c){if(feature[j]==='\\')j++;j++;}out+=escape(feature.slice(i,j+1));i=j+1;continue;}
    const word=/^[A-Za-z_$][\w$]*/.exec(feature.slice(i));
    if(word&&!/[\w$]/.test(feature[i-1]??'')) {
      const t=word[0],next=feature[i+t.length];
      out+=feature[i-1]==='.'||(next===':'&&feature[i+t.length+1]!==':')||t.length>3||keywords.test(t)?escape(t):'[\\w$]{1,3}';
      i+=t.length;continue;
    }
    out+=escape(c);i++;
  }
  return out;
}
const refSource=(ref,local)=>{const parts=ref.split('@@');if(parts.length!==2)throw Error(`Feature ${JSON.stringify(ref)} needs exactly one @@`);return looseSource(parts[0])+escape(local)+looseSource(parts[1]);};
export async function extractViewTabs({check=false}={}) {
  const parsed=new Map(),modules=new Map();
  async function parse(name) {
    if(parsed.has(name))return parsed.get(name);
    const code=await fs.readFile(path.join(source,name),'utf8'),ast=parsers.babel.parse(code);let program;
    babel.traverse(ast,{Program(p){program=p;}});
    const exports=new Map(ast.program.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers.map(s=>[s.exported.name,s.local.name])));
    const unit={name,code,ast,program,exports};parsed.set(name,unit);return unit;
  }
  async function read(name) {
    if(modules.has(name))return modules.get(name);
    const module={...await parse(name),selected:new Map(),imports:new Map(),seen:new Set(),initializers:[],publicNames:[]};
    modules.set(name,module);return module;
  }
  const declaration=(unit,name)=>{
    const p=unit.program.scope.getBinding(name)?.path;
    if(!p||p.isImportSpecifier()||p.isImportDefaultSpecifier()||p.isImportNamespaceSpecifier())throw Error(`${unit.name}:${name} is not a local declaration`);
    return unit.code.slice(p.node.start,p.node.end);
  };
  const topLevel=unit=>unit.ast.program.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations.map(d=>[d.id.name,d]):n.id?[[n.id.name,n]]:[]);
  // An own feature as a test on a declaration's text (strings, loose, to/ref); null for owner and boundary features.
  const ownTest=item=>typeof item==='string'?text=>text.includes(item)
    :item.in===undefined&&item.loose!==undefined?(rx=>text=>rx.test(text))(new RegExp(looseSource(item.loose)))
    :item.in===undefined&&item.to!==undefined?(rx=>text=>rx.test(text))(new RegExp(refSource(item.ref,item.to))):null;
  const boundaries=new Map(),boundaryInfo=new Map();
  function assertFeatures(unit,name,expect,label) {
    if(!expect.length)throw Error(`${label}: no features`);
    const text=declaration(unit,name);let pinned=false;
    for(const item of expect) {
      const test=ownTest(item);
      if(test){if(!test(text))throw Error(`${label}: ${unit.name}:${name} lacks ${JSON.stringify(item)}`);continue;}
      if(item.boundary) {
        const [, value]=/^[\w$]+=([\w$]+)$/.exec(text)??[];
        const p=value&&unit.program.scope.getBinding(value)?.path;
        if(!p?.isImportSpecifier())throw Error(`${label}: ${unit.name}:${name} is not an alias of an imported binding`);
        const file=p.parent.source.value.slice(2),local=parsed.get(file)?.exports.get(p.node.imported.name);
        const host=boundaries.get(file)?.get(local);
        if(!host||host.join('#')!==item.boundary.join('#'))throw Error(`${label}: ${unit.name}:${name} = ${file}:${local}, not the ${item.boundary.join('#')} boundary`);
        pinned=true;continue;
      }
      const owned=declaration(unit,item.in);
      const ok=item.has!==undefined?owned.includes(item.has):item.loose!==undefined?new RegExp(looseSource(item.loose)).test(owned):new RegExp(refSource(item.ref,name)).test(owned);
      if(!ok)throw Error(`${label}: ${unit.name}:${item.in} lacks ${JSON.stringify(item)}`);
      if(item.ref!==undefined)pinned=true;
    }
    const tests=expect.map(ownTest).filter(Boolean);
    if(!pinned) {
      if(!tests.length)throw Error(`${label}: no feature of ${unit.name}:${name} itself identifies it`);
      const owners=topLevel(unit).filter(([,n])=>{const t=unit.code.slice(n.start,n.end);return tests.every(test=>test(t));}).map(([n])=>n);
      if(owners.length!==1||owners[0]!==name)throw Error(`${label}: features ${JSON.stringify(expect)} identify ${owners.join(',')||'nothing'} in ${unit.name}, not ${name}`);
    }
  }
  // Resolve host boundaries before walking the graph.
  const family=from=>new RegExp(`^\\./${from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}-[\\w-]{8}\\.js$`);
  for(const wrapper of wrappers) {
    const unit=await parse(wrapper.file),text=declaration(unit,wrapper.local);
    if(text!==wrapper.declaration)throw Error(`CommonJS wrapper ${wrapper.file}:${wrapper.local} changed: ${text.slice(0,120)}`);
    for(const {in:owner,has} of wrapper.expect??[])if(!declaration(unit,owner).includes(has))throw Error(`CommonJS factory ${wrapper.file}:${owner} lacks ${has}`);
    (boundaries.get(wrapper.file)??boundaries.set(wrapper.file,new Map()).get(wrapper.file)).set(wrapper.local,wrapper.host);
  }
  for(const adapter of adapters) {
    const unit=await parse(adapter.file),pattern=family(adapter.from);
    const matches=unit.ast.program.body.filter(n=>n.type==='ImportDeclaration'&&pattern.test(n.source.value))
      .flatMap(n=>n.specifiers.filter(s=>s.type==='ImportSpecifier'&&s.imported.name===adapter.imported).map(s=>[n.source.value.slice(2),s.local.name]));
    if(matches.length!==1)throw Error(`Adapter ${adapter.file} ${adapter.from}#${adapter.imported}: ${matches.length} imports`);
    const [file,local]=matches[0],target=await parse(file),targetLocal=target.exports.get(adapter.imported);
    if(!targetLocal)throw Error(`Adapter target ${file}#${adapter.imported} is not exported`);
    assertFeatures(target,targetLocal,adapter.target,`Adapter ${adapter.file}:${local}`);
    (boundaries.get(adapter.file)??boundaries.set(adapter.file,new Map()).get(adapter.file)).set(local,adapter.host);
    boundaryInfo.set(`${adapter.file}:${local}`,{source:file,imported:adapter.imported});
  }
  async function add(m,name) {
    if(m.seen.has(name))return;m.seen.add(name);
    const adapter=boundaries.get(m.name)?.get(name);if(adapter){m.imports.set(name,adapter);return;}
    const p=m.program.scope.getBinding(name)?.path;if(!p)throw Error(`Unbound ${m.name}:${name}`);
    if(p.isImportSpecifier()) {
      const file=p.parent.source.value.slice(2);
      if(!files.includes(file))throw Error(`Boundary ${m.name}:${name} -> ${file}:${p.node.imported.name}`);
      const dep=await read(file),local=dep.exports.get(p.node.imported.name);
      if(!local)throw Error(`Missing export ${file}#${p.node.imported.name}`);
      m.imports.set(name,['./'+file,local]);await add(dep,local);return;
    }
    if(p.isImportDefaultSpecifier()||p.isImportNamespaceSpecifier())throw Error(`Unsupported import form ${m.name}:${name}`);
    m.selected.set(name,p);
    const deps=new Set(),dynamic=new Set();p.traverse({ReferencedIdentifier(r){if(r.scope.getBinding(r.node.name)?.scope===m.program.scope)deps.add(r.node.name);},CallExpression(r){if(r.node.callee.type==='Import')dynamic.add(r.node.arguments[0]?.value);},ImportExpression(r){dynamic.add(r.node.source?.value);}});
    for(const specifier of dynamic){const file=specifier?.slice(2);if(!files.includes(file))throw Error(`Dynamic boundary ${m.name}:${name} -> ${specifier}`);const dep=await read(file);dep.dynamic=true;for(const local of dep.exports.values())await add(dep,local);}
    for(const dep of deps)try{await add(m,dep);}catch(error){throw Error(`${m.name}:${name} -> ${error.message}`);}
  }
  for(const entry of roots) {
    const unit=await parse(entry.file);
    if(!identifier.test(entry.name))throw Error(`Invalid public name ${entry.name}`);
    if(entry.export!==undefined&&unit.exports.get(entry.export)!==entry.local)throw Error(`Root ${entry.name}: ${entry.file}#${entry.export} is ${unit.exports.get(entry.export)}, not ${entry.local}`);
    assertFeatures(unit,entry.local,entry.expect,`Root ${entry.name}`);
    const module=await read(entry.file);await add(module,entry.local);if(!pendingNames[entry.name])module.publicNames.push([entry.local,entry.name]);
  }
  // cds:C25: the fizzy-lake allow-list the part gate filters through is empty in this build (always off, E12).
  // shared-4 `lp` reads shared-52 `th`: `th(e)` = eh().parts.includes(e), eh() filters <html data-cds-fizzy-lake> through Qm.
  {const gate=await parse('shared-52-uHFNjl7C.js');if(declaration(gate,'Qm')!=='Qm=[]')throw Error('shared-52 fizzy-lake allow-list Qm is no longer empty');
    if(declaration(gate,'Ym')!=='Ym="data-cds-fizzy-lake"')throw Error('shared-52 Ym is no longer the data-cds-fizzy-lake attribute');
    if(!new RegExp(refSource('getAttribute(Ym),@@)','Qm')).test(declaration(gate,'eh')))throw Error('shared-52 eh no longer filters through Qm');
    if(!new RegExp(looseSource('return eh().parts.includes(e)')).test(declaration(gate,'th')))throw Error('shared-52 th no longer reads eh');}
  // Base UI's React 19 store hook registers before/after render handlers in a
  // top-level call, not a declaration. Locate that call by content whenever a
  // selected binding pushes syncHooks; omitting it leaves syncHooks absent.
  for(let changed=true;changed;) {
    changed=false;
    for(const m of [...modules.values()]) {
      if(m.storeHook||![...m.selected.values()].some(p=>m.code.slice(p.node.start,p.node.end).includes('syncHooks.push')))continue;
      const candidates=m.program.get('body').filter(p=>{
        if(!p.isExpressionStatement()||p.node.expression.type!=='CallExpression')return false;
        const args=p.node.expression.arguments;if(args.length!==1||args[0].type!=='ObjectExpression')return false;
        const keys=args[0].properties.map(x=>x.key?.name);
        return keys.includes('before')&&keys.includes('after')&&m.code.slice(p.node.start,p.node.end).includes('syncHooks');
      });
      if(candidates.length!==1)throw Error(`Base UI store hook registration changed in ${m.name} (${candidates.length} candidates)`);
      const p=candidates[0];m.storeHook=true;m.initializers.push(p);changed=true;
      const deps=new Set();p.traverse({ReferencedIdentifier(r){if(r.scope.getBinding(r.node.name)?.scope===m.program.scope)deps.add(r.node.name);}});
      for(const dep of deps)await add(m,dep);
    }
    // w11-pictogram-d1: a top-level property write on a selected binding belongs to it and is copied with it
    // (3.6556.2 shared-156 `KG.isCdsPictogram=!0`, which shared-frame gO reads to tell a pictogram from an icon).
    for(const m of [...modules.values()])for(const p of m.program.get('body')) {
      if(m.initializers.includes(p)||!p.isExpressionStatement())continue;
      const e=p.node.expression;
      if(e.type!=='AssignmentExpression'||e.left.type!=='MemberExpression'||e.left.computed||e.left.object.type!=='Identifier'||!m.selected.has(e.left.object.name))continue;
      m.initializers.push(p);changed=true;
      const deps=new Set();p.traverse({ReferencedIdentifier(r){if(r.scope.getBinding(r.node.name)?.scope===m.program.scope)deps.add(r.node.name);}});
      for(const dep of deps)await add(m,dep);
    }
  }
  const manifest={referenceVersion:official.referenceVersion,referenceSnapshot:official.referenceSnapshot,publicNames:{},pendingNames:{},facade,modules:[]};
  for(const name of Object.keys(pendingNames))if(!roots.some(entry=>entry.name===name))throw Error(`Pending name ${name} has no root`);
  for(const entry of roots){const table=pendingNames[entry.name]?manifest.pendingNames:manifest.publicNames;if(manifest.publicNames[entry.name]||manifest.pendingNames[entry.name])throw Error(`Duplicate public name ${entry.name}`);table[entry.name]={file:entry.file,local:entry.local,...(entry.export!==undefined?{export:entry.export}:{}),...(pendingNames[entry.name]?{waitsFor:pendingNames[entry.name].split(' ')}:{})};}
  const outputs=[];
  for(const m of modules.values()) {
    const imports=[...m.imports].map(([local,[file,name]])=>name==='*'?`import * as ${local} from ${JSON.stringify(file)};`:`import {${name} as ${local}} from ${JSON.stringify(file)};`);
    const selected=[...m.selected].sort((a,b)=>a[1].node.start-b[1].node.start);
    const blocks=[...selected.map(([,p])=>p),...m.initializers].sort((a,b)=>a.node.start-b.node.start).map(p=>p.isVariableDeclarator()?`var ${m.code.slice(p.node.start,p.node.end)};`:m.code.slice(p.node.start,p.node.end));
    const names=[...m.selected.keys(),...m.imports.keys()];
    const aliases=m.dynamic?[...m.exports].filter(([exported,local])=>exported!==local).map(([exported,local])=>{if(names.includes(exported))throw Error(`Dynamic export collision: ${m.name}:${exported}`);return [local,exported];}):[];
    const exported=new Set([...names,...aliases.map(([,name])=>name)]);
    for(const [local,name] of m.publicNames){if(exported.has(name))throw Error(`Public name collision: ${m.name}:${name}`);if(!m.selected.has(local))throw Error(`Public name ${name} is not selected in ${m.name}`);exported.add(name);}
    const list=[...names,...[...aliases,...m.publicNames].map(([local,name])=>`${local} as ${name}`)];
    const text=`// Original Claude Desktop ${official.referenceVersion} bindings; generated by extract-view-tabs.mjs.\n${imports.join('\n')}\n${blocks.join('\n')}\nexport {${list.join(',')}};\n`;
    manifest.modules.push({source:m.name,sourceSha256:sha(m.code),sha256:sha(text),bindings:selected.map(([name])=>name),
      initializers:m.initializers.map(p=>({start:p.node.start,sha256:sha(m.code.slice(p.node.start,p.node.end))})),
      adapters:[...m.imports].filter(([,v])=>!v[0].startsWith('./')).map(([local,[from,name]])=>({local,from,name,...boundaryInfo.get(`${m.name}:${local}`)})),
      dynamic:!!m.dynamic});
    outputs.push([m.name,text]);
  }
  // E2: a version-independent facade, every public name re-exported from its current file. Hand-written host code
  // imports it; generated consumers keep importing the concrete file (recomputed per version).
  const byFile=new Map();
  for(const [name,{file}] of Object.entries(manifest.publicNames))(byFile.get(file)??byFile.set(file,[]).get(file)).push(name);
  const facadeText=`// View-tabs facade over the Claude Desktop ${official.referenceVersion} graph; generated by extract-view-tabs.mjs.\n`
    +[...byFile].map(([file,names])=>`export {${names.join(',')}} from ${JSON.stringify('./'+file)};`).join('\n')+'\n';
  outputs.push([facade,facadeText]);
  const json=JSON.stringify(manifest,null,2)+'\n',expected=new Set([...outputs.map(([name])=>name),'manifest.json']);
  if(check) {
    const present=(await fs.readdir(output)).sort(),extra=present.filter(name=>!expected.has(name)),missing=[...expected].filter(name=>!present.includes(name));
    if(extra.length||missing.length)throw Error(`View tab output directory mismatch; stale: ${extra.join(', ')||'none'}; missing: ${missing.join(', ')||'none'}`);
    for(const [name,text] of outputs)if(await fs.readFile(path.join(output,name),'utf8')!==text)throw Error(`View tab source mismatch: ${name}`);
    if(await fs.readFile(path.join(output,'manifest.json'),'utf8')!==json)throw Error('View tab manifest mismatch');
  } else {
    await fs.mkdir(output,{recursive:true});
    // Remove only modules this generator listed previously and no longer emits.
    let previous=null;try{previous=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const listed=(previous?.modules??[]).map(m=>m.source);
    if(previous?.facade)listed.push(previous.facade);
    for(const name of listed)if(!expected.has(name)&&/^[\w.-]+\.js$/.test(name))await fs.rm(path.join(output,name),{force:true});
    for(const [name,text] of outputs)await fs.writeFile(path.join(output,name),text);
    await fs.writeFile(path.join(output,'manifest.json'),json);
  }
  console.log(`${check?'Verified':'Extracted'} ${manifest.modules.length} current view-tab source modules (${manifest.modules.reduce((n,m)=>n+m.bindings.length,0)} bindings, ${Object.keys(manifest.publicNames).length} public names) from ${official.referenceVersion} and the facade.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await extractViewTabs({check:process.argv.includes('--check')});
