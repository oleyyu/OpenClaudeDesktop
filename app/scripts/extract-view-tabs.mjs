// Reachable bindings of the installed view-tab bar, the current Sessions page
// primitives and the CDS controls the host shares with them.
// Extraction parses source only; no official desktop service is executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parsers} from '../../tools/node_modules/prettier/plugins/babel.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
export const reference={version:'2.42304.0',snapshot:'installed-2.42304.0-20261017'};
const root=path.resolve(import.meta.dirname,'..');
const source=path.resolve(root,'../reference',reference.snapshot,'ion-dist/assets/v1');
const output=path.join(root,'src/generated/view-tabs');
const sha=text=>createHash('sha256').update(text).digest('hex');
// Every chunk the closure may enter. Leaving this list is an error, so a new
// dependency of the installed source is reviewed instead of silently copied.
const files=[
  'cfe7c4b3b-CP-IQXj8.js','vendor-frame-DfPJ1QmD.js','vendor-base-ui-BAzDEXDQ.js','shared-frame-BfjMqbuN.js',
  'shared-25-DP8p7i1Z.js','shared-0-ByI5P0CP.js','shared-19-CkPOiIKm.js','shared-78-D6VXYXaQ.js',
  'rolldown-runtime-C3OYiQ02.js','preload-helper-D0dM6GpB.js','shared-frame-boot-C0bwV_QB.js','c86ccec3d-zuivwocA.js',
  'shared-156-Bikz018e.js','shared-2-Cb74JByF.js','vendor-all-0-CTKbbUUg.js',
  // `co`: fizzy-lake part gate read by the tab bar's size table. It requires the
  // document's data-cds-fizzy-lake attribute and this build's empty allow-list,
  // so it is always off; the original gate is kept rather than a host stub.
  'shared-4-CJsHhp5n.js',
  // `_s`: useValueChanged ({onMount:"skip"}), used by the row-selection hook.
  'shared-52-DGviI8xb.js',
  'c193cfc9b-DSvIG0kE.js','cf35aed38-8wxb1NWy.js','shared-10-THQui8pC.js','c9c7785eb-D11Dl0qm.js','ce802b15a-3619IE88.js',
  'c75e89812-B96Fecq3.js','c12ca901f-CwUGbIt3.js','c51c45b79-BdxchTZz.js','cc18d27d7-CqmzUQPM.js','ce58a0513-BLDzNrSI.js',
  'c1ea8a271-DQNA8ZHR.js','cdfb0c433-OOm3enZf.js',
];
// Host boundaries, located by the import they replace (chunk family + imported
// name) rather than by a minified local name. `target` is asserted against the
// imported module so a reused export name cannot redirect the boundary.
const adapters=[
  {file:'ce58a0513-BLDzNrSI.js',from:'vendor-intl',imported:'l',host:['../../source-code-start-adapters.jsx','StartMessage'],
    target:['(Wt,Ut)',{in:'Wt',has:'description:s,defaultMessage:c'}]},
  {file:'c9c7785eb-D11Dl0qm.js',from:'vendor-intl',imported:'p',host:['../../source-code-start-adapters.jsx','useStartIntl'],
    target:['return Mt(e),e',{in:'Mt',has:'Could not find required `intl` object'}]},
  {file:'shared-2-Cb74JByF.js',from:'shared-frame',imported:'uu',host:['../../source-sessions-adapters.jsx','useSessionsLocale'],
    target:['return W(Da)',{in:'Za',has:'locale:o'},{in:'Za',has:'ne=W(Da)'}]},
];
// The vendor's CommonJS wrappers are module boundaries to the host's React,
// never a second bundled copy. Their declarations must keep this exact shape.
const wrappers=[
  {file:'vendor-frame-DfPJ1QmD.js',local:'s',declaration:'s=o.default',host:['react','default']},
  {file:'vendor-frame-DfPJ1QmD.js',local:'o',declaration:'o=e(i())',host:['react','default']},
  {file:'vendor-frame-DfPJ1QmD.js',local:'i',declaration:'i=n(((e,t)=>{t.exports=r()}))',host:['../../source-view-tabs-adapters.jsx','requireHostReact'],
    expect:[{in:'r',has:'Symbol.for("react.transitional.element")'}]},
  {file:'vendor-frame-DfPJ1QmD.js',local:'fe',declaration:'fe=e(n(((e,t)=>{t.exports=de()}))())',host:['react/jsx-runtime','*'],
    expect:[{in:'de',has:'.jsxs='}]},
  {file:'vendor-frame-DfPJ1QmD.js',local:'Ln',declaration:'Ln=e(se())',host:['react-dom','*'],
    expect:[{in:'se',has:'__REACT_DEVTOOLS_GLOBAL_HOOK__'}]},
];
// Roots, each exported under a semantic name (`publicNames`) that consumers
// import instead of the minified local: 2.42304.0 reuses many old minified
// names for unrelated values. `export` (when the chunk exports it) and `local`
// must agree, the declaration must contain `expect`, and its plain-string
// features must identify exactly one top-level declaration of the chunk, so a
// renamed binding fails loudly instead of silently selecting another value.
const SF='shared-frame-BfjMqbuN.js',VF='vendor-frame-DfPJ1QmD.js';
const roots=[
  // View tab bar and the parts its source tests drive directly.
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'Y',export:'t',name:'ViewTabBar',expect:['renderCreateButton:','createMenu:']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'P',export:'n',name:'useViewTabIconSize',expect:['return s(N)',{in:'N',has:'c("xs")'}]},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'R',name:'viewTabSizes',expect:['basis:"basis-[192px]"']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'oe',name:'viewTabLabels',expect:['closeTabsToRightRtl:"']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'ge',name:'ViewTab',expect:['overflowed:','dragging:v=!1']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'ce',name:'ViewTabOverflowItem',expect:['({tab:e,hintIds:t,']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'se',name:'ViewTabOverflowMenu',expect:['onKeyDownCapture']},
  {file:'cfe7c4b3b-CP-IQXj8.js',local:'xe',name:'useViewTabOverflow',expect:['"data-vtb-hidden"','hiddenIds:']},
  // Base UI direction context and class-variance helper.
  {file:'vendor-frame-DfPJ1QmD.js',local:'wd',name:'DirectionContext',expect:[{in:'Td',has:'(wd)?.direction??"ltr"'}]},
  {file:'vendor-frame-DfPJ1QmD.js',local:'In',export:'Ea',name:'cva',expect:['compoundVariants','defaultVariants']},
  // CDS controls (shared-frame). SegmentedControl, Pulse and TooltipProvider
  // are rooted for the Chat/Code switch so it shares these contexts.
  {file:'shared-frame-BfjMqbuN.js',local:'la',name:'CdsDensityContext',expect:['G("comfortable")',{in:'ja',has:'W(la)'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'$l',export:'cl',name:'CdsButton',expect:['iconPosition:i="start"','hideShortcut:','"Button")']},
  {file:'shared-frame-BfjMqbuN.js',local:'Jo',export:'Hl',name:'CdsIcon',expect:['"data-cds":"Icon"','data-cds-mirror']},
  {file:'shared-frame-BfjMqbuN.js',local:'cs',export:'Vl',name:'CdsBadge',expect:['"data-cds":"Badge"','"removeItem"']},
  {file:'shared-frame-BfjMqbuN.js',local:'M_',export:'qs',name:'CdsConfirmationDialog',expect:['confirmLabel:','closeOnConfirm:']},
  {file:'shared-frame-BfjMqbuN.js',local:'EC',export:'qa',name:'CdsDropdown',expect:['SearchablePopup:','SubmenuTrigger:']},
  {file:'shared-frame-BfjMqbuN.js',local:'X',export:'xd',name:'cdsClassNames',expect:['return Gt(Y(e))',{in:'Gt',has:'conflictingClassGroups:'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'Sm',export:'kc',name:'CdsTooltipProvider',expect:['closeDelay:t=200','.Provider']},
  {file:'shared-frame-BfjMqbuN.js',local:'hO',export:'Ci',name:'CdsSegmentedControl',expect:['"SegmentedControl")','thumbPosition:']},
  {file:'shared-frame-BfjMqbuN.js',local:'eN',export:'yr',name:'CdsPulse',expect:['"data-cds":"Pulse"']},
  // PR preview card: moved from shared-5 to shared-156 in 2.42304.0.
  {file:'shared-156-Bikz018e.js',local:'vR',export:'Ei',name:'CdsPreviewCard',expect:['Root:','Trigger:mR,','Popup:_R}',{in:'_R',has:'"data-cds":"PreviewCard"'}]},
  {file:'shared-156-Bikz018e.js',local:'fR',name:'CdsPreviewCardContext',expect:['setPopupFocused:()=>void 0']},
  {file:'shared-156-Bikz018e.js',local:'mR',name:'CdsPreviewCardTrigger',expect:['({render:e})','interactiveHint']},
  // fizzy-lake part gate (`co`), shared with the 2.42304.0 sidebar PR card and file tree.
  {file:'shared-4-CJsHhp5n.js',local:'jf',export:'co',name:'isFizzyLakePartEnabled',expect:['&&(Af[e]?.()??!0)',{in:'Of',has:'getAttribute(Sf)'},{in:'Sf',has:'"data-cds-fizzy-lake"'},{in:'Cf',has:'Cf=[]'}]},
  // Hooks shared with generated sidebar rows.
  {file:'shared-0-ByI5P0CP.js',local:'_e',export:'xx',name:'useEventCallback',expect:['(()=>he(t));return n}',{in:'he',has:'e.current(...t)'}]},
  {file:'vendor-all-0-CTKbbUUg.js',local:'Oe',export:'y',name:'useMergedRefs',expect:['return l(De(...e),e)']},
  // Current Sessions page: page/header, selectable table and row primitives.
  {file:'c193cfc9b-DSvIG0kE.js',local:'k',export:'n',name:'CdsPage',expect:['topSentinelRef:','"tall-frame"']},
  {file:'shared-10-THQui8pC.js',local:'ir',export:'ca',name:'CdsTabs',expect:['Root:','List:','Tab:']},
  {file:'c9c7785eb-D11Dl0qm.js',local:'O',export:'n',name:'useRowSelection',expect:['restoreFocusRef']},
  {file:'c9c7785eb-D11Dl0qm.js',local:'I',export:'t',name:'CdsSelectableTable',expect:['getRowKey:','renderActions:']},
  {file:'c75e89812-B96Fecq3.js',local:'i',export:'t',name:'SessionsRowLayout',expect:['titleAccessories:','subline:']},
  {file:'c75e89812-B96Fecq3.js',local:'a',export:'r',name:'SessionsDateLayout',expect:['first-letter:capitalize']},
  {file:'c75e89812-B96Fecq3.js',local:'o',export:'n',name:'SessionsMoreButton',expect:['icon:"DotsVertical"']},
  {file:'cc18d27d7-CqmzUQPM.js',local:'A',export:'r',name:'SessionsMenuContext',expect:[{in:'F',has:'=n(A),'},{in:'F',has:'byHref'}]},
  {file:'cc18d27d7-CqmzUQPM.js',local:'D',export:'s',name:'SessionsRowRail',expect:['text-footnote text-muted-as-secondary']},
  {file:'cc18d27d7-CqmzUQPM.js',local:'O',export:'c',name:'SessionsActionsRail',expect:['group-data-[selection-mode]/table:hidden']},
  {file:'ce58a0513-BLDzNrSI.js',local:'r',export:'t',name:'SessionsArchivedBadge',expect:['"0HT+IbyW6O"']},
  {file:'c1ea8a271-DQNA8ZHR.js',local:'r',export:'t',name:'SessionsHighlight',expect:['bg-accent text-inherit rounded-sm']},
  {file:'cdfb0c433-OOm3enZf.js',local:'e',export:'r',name:'findSessionTitleMatch',expect:['indexOf(t);if(i!==-1)return[']},
  {file:'shared-2-Cb74JByF.js',local:'oX',export:'H',name:'CdsRelativeTime',expect:['"data-cds":"RelativeTime"','absoluteAfterHours:']},
  // R2-sidebar SG-2: Base UI mergeProps and clsx, already reached through the CDS
  // controls, for code-current's cds-merge-props re-export (no second copy).
  {file:'vendor-frame-DfPJ1QmD.js',local:'Kt',export:'Ia',name:'mergeProps',expect:['if(!n&&!r&&!i&&!e)return Jt(t)',{in:'tn',has:'baseUIHandlerPrevented'}]},
  {file:'vendor-frame-DfPJ1QmD.js',local:'ge',export:'za',name:'clsx',expect:['(t=he(e))&&(r&&(r+=" "),r+=t)',{in:'he',has:'Array.isArray(e)'}]},
  // R3-graph (D24): CDS controls the code-current, sidebar-sections, composer,
  // environment and files surfaces replace with host stand-ins today. All but
  // the Menu handle, layer provider, Dialog and root were already reachable;
  // naming them adds no binding. Appended so the existing selection order holds.
  {file:'shared-frame-BfjMqbuN.js',local:'Zp',export:'Oc',name:'CdsTooltip',expect:['openOnHandedBackFocus:y=!1','"data-cds":"Tooltip"',{in:'bm',has:'bm=G(null)'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'ks',export:'Ol',name:'CdsShortcut',expect:['"data-cds":"Shortcut"','variant:t="keycap"']},
  {file:'shared-frame-BfjMqbuN.js',local:'ej',export:'li',name:'CdsSplitDropdownButton',expect:['"data-cds":"SplitDropdownButton"','onPrimaryClick:_','menuTooltip:E=!1']},
  {file:'shared-frame-BfjMqbuN.js',local:'wA',export:'ui',name:'CdsCheckbox',expect:['"data-cds":"Checkbox"','indeterminate']},
  {file:'shared-frame-BfjMqbuN.js',local:'tx',export:'ho',name:'CdsTextInput',expect:['"data-cds":"TextInput"','clearable:a=!1','slotStart:r,slotEnd:i']},
  {file:'shared-frame-BfjMqbuN.js',local:'iD',export:'Ii',name:'CdsContextMenu',expect:['Item:EC.Item','SubmenuPopup:EC.Popup',{in:'tD',has:'sheetTitle:t,backLabel:n'}]},
  // Base UI Menu.createHandle: a handle pairs a detached Trigger with its Root and
  // only works with the same Base UI instance as CdsDropdown, hence this graph.
  {file:'vendor-frame-DfPJ1QmD.js',local:'bm',export:'Wt',name:'CdsMenuCreateHandle',expect:['return new ym',{in:'ym',has:'super(Qp(),"Menu")'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'gm',export:'Dc',name:'CdsOverflowTooltip',expect:['"data-cds":"OverflowTooltip"','text-ellipsis whitespace-nowrap']},
  // Layer stacking: popups add their offset to the nearest provider's base (qd).
  {file:'shared-frame-BfjMqbuN.js',local:'Hd',export:'Vc',name:'CdsLayerProvider',expect:['"CdsLayer"','"--cds-layer-base":a',{in:'Vd',has:'Vd=G(0)'},{in:'zd',has:'zd=100'}]},
  // Dialog (Root/Trigger/Popup/Header/Title/Description/Footer/Close/CloseButton);
  // the alert variant j_ shares Popup but has its own Root and createHandle.
  {file:'shared-frame-BfjMqbuN.js',local:'k_',export:'Js',name:'CdsDialog',expect:['Root:O_,','CloseButton:C_}',{in:'O_',has:'dismissible:e,disablePointerDismissal:t'},{in:'b_',has:'"data-cds":"Dialog"'}]},
  // CDS root: density/mode/platform/font/locale/theme providers on div.cds-root.
  {file:'shared-frame-BfjMqbuN.js',local:'Za',export:'tu',name:'CdsRoot',expect:['"cds-root text-primary"','"data-cds-fizzy-lake":k','pageBackground:a',{in:'la',has:'la=G("comfortable")'}]},
  // R4f-graph G1 (D24): CDS controls the proposal group card (r4-proposal-group-card.md WI-0), the R3b-transcript
  // stand-ins and the R4e plugin Overview card replace with host replicas today. Locals and export aliases are the
  // 2.42304.0 shared-frame / vendor-frame ones; the R4 draft's Vh/jh/kh are vendor-frame's Base UI Collapsible
  // Panel/Trigger/Root (exported gt/vt/yt), reached here under CdsCollapsible (Qw) and CdsBanner's details path,
  // not published themselves. Appended so the existing selection order holds.
  // Popover { Root, Trigger, Popup, Title, Description, Close, Arrow, createHandle } (Popup KT -> JT -> GT).
  {file:'shared-frame-BfjMqbuN.js',local:'nE',export:'Zi',name:'CdsPopover',expect:['Popup:KT,','createHandle:Ce}',{in:'KT',has:'H(JT,{...s,ref:o,sheetPopup:ib,sheetParts:null})'},{in:'JT',has:'H(GT,'},{in:'GT',has:'"data-cds":"Popover"'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'dD',export:'Fi',name:'CdsSwitch',expect:['"data-cds":"Switch"','disabledReasonSide:r']},
  {file:'shared-frame-BfjMqbuN.js',local:'oE',export:'Xi',name:'CdsInfoTooltip',expect:['Z("moreInfo","More info")','"data-cds":"InfoTip"','H(nE.Popup,']},
  {file:'shared-frame-BfjMqbuN.js',local:'Aj',export:'oi',name:'CdsShimmer',expect:['active:t=!0,variant:n="default"','"data-cds":"ShimmerText"']},
  {file:'shared-frame-BfjMqbuN.js',local:'gT',export:'oa',name:'CdsBanner',expect:['"data-cds":"Banner"','"data-prose-box":""','T(Qw.Root,']},
  // Collapsible { Root, Trigger, Panel } over Base UI's Collapsible.
  {file:'shared-frame-BfjMqbuN.js',local:'Qw',export:'ca',name:'CdsCollapsible',expect:['Root:qw,Trigger:Xw,Panel:',{in:'qw',has:'"data-cds":"Collapsible"'},{in:'Xw',has:'name:"CaretRight"'}]},
  // Disabled-reason wrapper: a CdsTooltip over a focusable span carrying the reason in a hidden described-by span.
  {file:'shared-frame-BfjMqbuN.js',local:'Qp',export:'Ec',name:'CdsDisabledReason',expect:['closeOnClick:!1,openOnHandedBackFocus:!0','H(Yc,{id:d,reason:e})']},
  // Base UI useDirection over DirectionContext (wd, published above).
  {file:'vendor-frame-DfPJ1QmD.js',local:'Td',export:'Wn',name:'useDirection',expect:['return N(wd)?.direction??"ltr"']},
  // CDS Card = Object.assign(pu, { Link, Media }) (the R4e plugin Overview rail card).
  {file:'shared-frame-BfjMqbuN.js',local:'yu',export:'ol',name:'CdsCard',expect:['Object.assign(pu,{Link:hu,Media:vu})',{in:'pu',has:'"data-cds":"Card"'},{in:'hu',has:'"data-cds":"CardLink"'},{in:'vu',has:'"data-cds":"CardMedia"'}]},
  // R4g-composer CP1 (X7-07): the React contexts extract-code-composer.mjs used to copy (its contextCopies, now
  // empty). CdsRoot (Za) provides the first five; the composer shell provides the CDS surface (Ea) and Chin (Kd)
  // the CdsButton icon size (Xl). Named so the composer's readers (Sa, Ya, Z, Pa, gr, za, Zl) share these
  // instances with CdsRoot and the view-tabs controls. Each was already selected (CdsRoot's closure): naming adds
  // no binding. xa / da / hr are not exported by the official chunk. Appended so the selection order holds.
  {file:'shared-frame-BfjMqbuN.js',local:'xa',name:'CdsNaturalImageTilesContext',expect:['xa=G(void 0)',{in:'Sa',has:'return W(xa)??!1'},{in:'Za',has:'H(xa.Provider,{value:O,'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'Oa',export:'$l',name:'CdsOwnerWindowContext',expect:['Oa=G(void 0)',{in:'Ya',has:'return Ji(W(Oa))'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'vn',export:'rd',name:'CdsLabelsContext',expect:['vn=G(void 0)',{in:'Z',has:'return bn(W(vn),e,t,n)'},{in:'Za',has:'H(vn.Provider,{value:E,'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'da',name:'CdsModeStoreContext',expect:['da=G(void 0)',{in:'Pa',has:'let e=W(da)??fa;'},{in:'Za',has:'H(da.Provider,{value:ce,'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'hr',name:'CdsFizzyLakePartsContext',expect:['hr=G(void 0)',{in:'gr',has:'return W(hr)'},{in:'Za',has:'H(hr.Provider,{value:k,'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'Ea',export:'nu',name:'CdsSurfaceContext',expect:['Ea=G(void 0)',{in:'za',has:'return W(Ea)'},{in:'Za',has:'H(Ea.Provider,{value:te,'}]},
  {file:'shared-frame-BfjMqbuN.js',local:'Xl',export:'ll',name:'CdsButtonIconSizeContext',expect:['Xl=G(void 0)',{in:'Zl',has:'n=W(Xl)'}]},
  // R4i-graph GR1 (D46): every binding the routines-shared, code-routines and cowork-scheduled graphs import from
  // this graph, named after what the original code does, so no generator imports a minified local (2.42304.0
  // reuses minified names for unrelated values). Each was already selected by the roots above: naming adds no
  // binding. Features are plain strings of the declaration (unique among the chunk's top-level declarations) and,
  // where the declaration is short or carries its own name, one consumer that reads it. vendor-frame's React
  // re-exports (`M=o.useCallback` and the like) are not named: those generators import them from React itself.
  // Names that other areas still slice copies of are held back in `pendingNames` below. Appended so the order holds.
  // Runtime helpers, storage and platform probes the routines graphs reach through view-tabs.
  {file:'c193cfc9b-DSvIG0kE.js',local:'g',export:'t',name:'cdsPageHeaderScrollOffsetVar',expect:['"--cds-page-header-scroll-offset"']},
  {file:'preload-helper-D0dM6GpB.js',local:'e',export:'n',name:'tagErrorText',expect:['(e,t,n){try{',{in:'r',has:'catch{}return e(a,n,"vouched"'}]},
  {file:'preload-helper-D0dM6GpB.js',local:'s',export:'t',name:'vitePreload',expect:['"failed to fetch dynamically imported module"']},
  {file:'rolldown-runtime-C3OYiQ02.js',local:'l',export:'i',name:'toESM',expect:['"default"','(n,r,o)=>(']},
  {file:'rolldown-runtime-C3OYiQ02.js',local:'o',export:'t',name:'commonJS',expect:['(e,t)=>()=>(']},
  {file:'shared-0-ByI5P0CP.js',local:'$A',export:'Hu',name:'safeLocalStorage',expect:['QA("localStorage",!0)']},
  {file:'shared-0-ByI5P0CP.js',local:'QA',name:'createSafeStorage',expect:['(e,t){let n=()=>ZA(']},
  {file:'shared-0-ByI5P0CP.js',local:'ZA',export:'Wu',name:'getWindowStorage',expect:['(e){if(typeof window>"u")return XA;']},
  {file:'shared-25-DP8p7i1Z.js',local:'gH',export:'xn',name:'toggledSet',expect:['(e,t,n){let r=new Set(']},
  {file:'shared-25-DP8p7i1Z.js',local:'lp',name:'isDocumentNode',expect:['(e){return e.nodeType===cp}']},
  {file:'shared-25-DP8p7i1Z.js',local:'mp',export:'Mf',name:'getMutationObserverClass',expect:['(e){return up(e)?.MutationObserv']},
  {file:'shared-25-DP8p7i1Z.js',local:'pp',export:'Nf',name:'getResizeObserverClass',expect:['(e){return up(e)?.ResizeObserver']},
  {file:'shared-25-DP8p7i1Z.js',local:'up',export:'Ff',name:'ownerWindow',expect:['(e){return e?(',{in:'dp',has:' dp(e){return up(e)??globalThi'}]},
  {file:'shared-4-CJsHhp5n.js',local:'Ad',export:'Mo',name:'isCaiCuriousTowerEnabled',expect:['(){return Od}',{in:'Af',has:'Af={panels:Ad}'}]},
  {file:'shared-52-DGviI8xb.js',local:'aD',export:'_s',name:'useValueChanged',expect:['(e,t){let[n,r]=g(()=>t.onMount==="skip"?{value:e}']},
  {file:'shared-78-D6VXYXaQ.js',local:'Wa',export:'kw',name:'isMacUserAgent',expect:['(){if(typeof window>"u")return!1;let e=window.navigator.userAgent.toLowerCase();return Ua.test(']},
  // CDS (shared-frame) parts and helpers.
  {file:SF,local:'$h',name:'useCdsFocusReturnRef',expect:['(e,t){let n=V(t);Q(()=>{n.current=t}']},
  {file:SF,local:'$r',export:'Lu',name:'isBlockedHref',expect:['(e,t){return t==="#"&&e!==vo']},
  {file:SF,local:'$s',export:'yl',name:'isFocusedWithoutFocusVisible',expect:['(e){if(e.ownerDocument']},
  {file:SF,local:'Bh',export:'ec',name:'isTextEditableElement',expect:['(e){return e==null?!1:e.matches(']},
  {file:SF,local:'Bm',export:'vc',name:'isImeCompositionKeyEvent',expect:['(e){return e.isComposing||']},
  {file:SF,local:'By',export:'Go',name:'CdsSheetStackContext',expect:['By=G(null)',{in:'eb',has:'$y,children:H(By.Provider,{val'}]},
  {file:SF,local:'Cb',name:'cdsHiddenPopupStyle',expect:['{visibility:"hidden",opacity:0}']},
  {file:SF,local:'Ch',export:'nc',name:'blurWithoutRelatedTarget',expect:['(e){let t=e=>{',{in:'Mh',has:'n)&&t!==null&&Ch(t)}'}]},
  {file:SF,local:'Co',export:'Wl',name:'cdsIconSizes',expect:['"small"','{xs:{px:12,',{in:'Ql',has:'ntrol) - ${lo(Co[e].px)}) / 2)'}]},
  {file:SF,local:'Cu',name:'CdsSkeletonStartedAtContext',expect:['Cu=G(null)',{in:'Pu',has:'Pu(){return W(Cu)}'}]},
  {file:SF,local:'Cx',export:'oo',name:'cdsMenuItemClass',expect:['"text-primary data-[highlighted]:bg-fill-ghost-hover"']},
  {file:SF,local:'Db',name:'CdsSheetPopupHost',expect:['({kind:e,children:t}']},
  {file:SF,local:'Dn',export:'$u',name:'useCdsMergedRefs',expect:['(e,t,n){return U(',{in:'Kw',has:'Kw=e=>Dn(e,Gw(),zw())'}]},
  {file:SF,local:'Gb',export:'yo',name:'cdsFieldFocusWithinRingClass',expect:['"has-[:focus-visible]:shadow-focus data-[invalid]:has-[:focus-visible]:shadow-focus-danger"']},
  {file:SF,local:'Gv',export:'xs',name:'CdsEndSideTooltip',expect:['"right"','(e){let t=ge()',{in:'XE',has:'0B");return H(Gv,{content:p,mu'}]},
  {file:SF,local:'Hb',export:'go',name:'cdsFieldSurfaceClass',expect:['"bg-fill-field shadow-field-ring data-[invalid]:shadow-field-invalid"']},
  {file:SF,local:'Ib',name:'CdsFieldStateContext',expect:['Ib=G(null)',{in:'Vb',has:'Vb(){return W(Ib)!==null}'}]},
  {file:SF,local:'Ja',export:'gu',name:'useCdsOwnerAnchor',expect:['(){let e=W(Oa)',{in:'eD',has:'{let n=ob(),r=Ja();return n?H('}]},
  {file:SF,local:'Jd',export:'Uc',name:'useCdsLayerAwareZIndex',expect:['useCdsLayerAwareZIndex(']},
  {file:SF,local:'Jm',export:'_c',name:'inertProps',expect:['(e){return e?{inert:qm?!0:""']},
  {file:SF,local:'Jn',export:'qu',name:'useLazyObserver',expect:['(e,t){let n=qn(()=>new e(t));return{observe:(e,t)=>n.attempt(n=>t===void 0?n.o']},
  {file:SF,local:'Js',export:'Ml',name:'ariaKeyShortcuts',expect:['(e,t){let[n,...r]',{in:'XS',has:'yshortcuts":n?Js(n,M):void 0,"'}]},
  {file:SF,local:'Jt',name:'coarsePointerQuery',expect:['Jt="(pointer: coarse)"',{in:'en',has:'s(Yt)?!0:!(Zt(Jt,t)&&(t?.navig'}]},
  {file:SF,local:'Ka',export:'uu',name:'useCdsLocale',expect:['(){return W(Da)',{in:'pM',has:'nds:e}){let t=Ka(),n=lM(),r=t?'}]},
  {file:SF,local:'Kb',export:'vo',name:'cdsTextFieldClass',expect:['h-control ps-md rounded ']},
  {file:SF,local:'Kd',export:'Gc',name:'useCdsPortalLayer',expect:['(e){return qd(',{in:'Eb',has:'(Fy),n=Ja(),r=Kd(e);qv(t?.open'}]},
  {file:SF,local:'Lb',export:'Co',name:'useCdsFieldInvalid',expect:['(){return W(Ib)?.invalid??!1}']},
  {file:SF,local:'Lx',export:'no',name:'cdsMenuScrollAreaClass',expect:['"min-h-0 overflow-y-auto scroll-fade-y rounded-[inherit] border-b-[length:var(--cds-ring-inner)] border-transparent forced-colors:border-b-0 p-[var(--cds-menu-gutter,0.25rem)]"']},
  {file:SF,local:'Mi',export:'Ou',name:'isFirstPartyHref',expect:['(e){if(!e)return!1;']},
  {file:SF,local:'Ms',export:'Nl',name:'useIsMacPlatform',expect:['(){return yt(js,',{in:'ks',has:',...i}){let a=Ms(),o=Z("sequen'}]},
  {file:SF,local:'Mt',export:'Sd',name:'cdsStaysSecondaryTextClass',expect:['"text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]"']},
  {file:SF,local:'Ni',export:'ku',name:'newTabRelFor',expect:['"noopener noreferrer"']},
  {file:SF,local:'Nx',name:'isDocumentCurrentTarget',expect:['(e){return e?.currentTarget?']},
  {file:SF,local:'Ny',name:'useValueLatchedWhileOpen',expect:['(e,t,n){let[r,i]=f((']},
  {file:SF,local:'Pb',export:'Ao',name:'CdsCheckboxIndicator',expect:['"data-indeterminate"']},
  {file:SF,local:'Q',export:'Qu',name:'useCdsIsoLayoutEffect',expect:['typeof window<"u"?wt:K']},
  {file:SF,local:'Qc',name:'CdsTooltipImplContext',expect:['Qc=G(null)',{in:'vm',has:':e}){return H(Qc.Provider,{val'}]},
  {file:SF,local:'Qo',export:'Ul',name:'CdsIconSlot',expect:['({icon:e,firstLine:t=!']},
  {file:SF,local:'Qy',name:'useCdsSheetPopup',expect:['[data-sheet-tree="']},
  {file:SF,local:'Rb',export:'So',name:'useCdsFieldDisabled',expect:['(){return W(Ib)?.disabled??!1}']},
  {file:SF,local:'Rm',export:'yc',name:'setCompositionEndTimestamp',expect:['function Rm(e){Fm=e}',{in:'LF',has:'=J(e=>{a?.(e),Rm(e.nativeEvent'}]},
  {file:SF,local:'Tl',name:'CdsDisabledReasonWrapper',expect:['(e){let{impl:t,wasCold:n,interceptors:r}']},
  {file:SF,local:'Ub',export:'_o',name:'cdsFieldHoverRingClass',expect:['"[&:hover:not(:focus-visible):not(:has(:focus-visible)):not([data-invalid]):not([data-disabled])]:shadow-field-hover"']},
  {file:SF,local:'Ux',export:'to',name:'cdsMenuPopupClass',expect:['X(`cds-reset draggable']},
  {file:SF,local:'Vb',name:'useIsInCdsField',expect:['(){return W(Ib)!==null}']},
  {file:SF,local:'Vd',export:'Hc',name:'CdsLayerBaseContext',expect:['Vd=G(0)',{in:'Jd',has:'Jd(e){let t=W(Vd);return Gd(`u'}]},
  {file:SF,local:'Wb',name:'cdsFocusVisibleRingClass',expect:['"focus-visible:shadow-focus data-[invalid]:focus-visible:shadow-focus-danger"']},
  {file:SF,local:'Xi',export:'Su',name:'connectedOwnerWindow',expect:['(e){if(!Yi(',{in:'jg',has:'g(e){return e?Xi(e)?.matchMedi'}]},
  // context-breakdown (session-rail-context chart-meter): "inside a CdsTooltipProvider" (reads bm, so one instance).
  {file:SF,local:'xm',export:'jc',name:'useInsideCdsTooltipProvider',expect:['function xm(){return W(bm)!==null}']},
  {file:SF,local:'Xt',name:'windowOrDefault',expect:['function Xt(e){return e??(typeof window>"u"?void 0:window)}',{in:'Zt',has:'Zt(e,t){let n=Xt(t);return typ'}]},
  {file:SF,local:'Ya',export:'mu',name:'useCdsOwnerWindow',expect:['(){return Ji(',{in:'gy',has:'y(){return Fn(Ya(),An)}'}]},
  {file:SF,local:'Yn',export:'Ku',name:'useLazyMutationObserver',expect:['(e,t){let n=qn(()=>new e(t));return{observe:(e,t)=>n.attempt(n=>n.observe(']},
  {file:SF,local:'Yo',name:'isCdsIconName',expect:['(e){return typeof e=="string"}']},
  {file:SF,local:'Z',export:'ad',name:'useCdsLabel',expect:['(e,t,n){return bn(']},
  {file:SF,local:'Zs',export:'Cl',name:'CdsSpinner',expect:['"color-mix(in srgb, currentColor 25%, transparent)"']},
  {file:SF,local:'Zt',name:'matchesMediaQuery',expect:['(e,t){let n=Xt(t);return typeof ']},
  {file:SF,local:'aa',export:'ou',name:'cdsSizeAttributes',expect:['(e){return e&&e!=="base"?{']},
  {file:SF,local:'ah',export:'fc',name:'cdsSurfaceClass',expect:['"panel"','(e){let t=`rounded-card ']},
  {file:SF,local:'ay',export:'us',name:'cdsUnanchoredPositionerProps',expect:['{disableAnchorTracking']},
  {file:SF,local:'bn',export:'id',name:'resolveCdsLabel',expect:['(e,t,n,r){return e?.(']},
  {file:SF,local:'bu',export:'al',name:'elementResizeObserverClass',expect:['(e){return e?.ownerDocument.defaultView?.ResizeObserve']},
  {file:SF,local:'ca',export:'iu',name:'cdsTypeScaleStep',expect:['(e,t){let n=oa[',{in:'aC',has:'C(e,t){return ca(e,t)>=4?"sm":'}]},
  {file:SF,local:'db',export:'zo',name:'cdsSheetPopupClass',expect:['`group/sheet relative ']},
  {file:SF,local:'dd',export:'$c',name:'CdsSkeleton',expect:['Object.assign(rd,',{in:'ud',has:':t}){return H(dd,{className:t,'}]},
  {file:SF,local:'dy',export:'os',name:'cdsDefaultDensity',expect:['dy="comfortable"',{in:'iA',has:'ver,density:S?dy:void 0,childr'}]},
  {file:SF,local:'fd',export:'Qc',name:'CdsOpensInNewTabHint',expect:['"(opens in new tab)"']},
  {file:SF,local:'gf',export:'Fc',name:'CdsPortalRoot',expect:['"cds-root pointer-events-auto"']},
  {file:SF,local:'ib',name:'cdsNoSheetPopupState',expect:['{sheet:!1,concealed:!1,']},
  {file:SF,local:'io',name:'cdsRemScaleVar',expect:['"--cds-rem-scale"',{in:'oo',has:'o}rem * var(${io}, 1))`'}]},
  {file:SF,local:'ja',export:'su',name:'useCdsDensity',expect:['(){return W(la)',{in:'Do',has:'n Do(){return ja()==="comforta'}]},
  {file:SF,local:'lc',export:'vl',name:'asElementNode',expect:['(e){return e?.nodeType===1?e']},
  {file:SF,local:'lr',export:'Wu',name:'useCdsThemeId',expect:['(){let e=W(or)??sr;return yt(e.subscribe,e.getId,']},
  {file:SF,local:'nb',name:'CdsSheetPopupProvider',expect:['({value:e,children:t}']},
  {file:SF,local:'nc',name:'cdsDisabledReasonWrappers',expect:['nc=new WeakSet',{in:'Hc',has:'(e){e!==null&&nc.add(e)}'}]},
  {file:SF,local:'nd',export:'tl',name:'CdsLoadingSkeleton',expect:["'[data-cds=\"SkeletonGroup\"]'"]},
  {file:SF,local:'ng',name:'useCdsFocusReturn',expect:['(e){let t=e?.skipRestoreOnOu']},
  {file:SF,local:'ni',export:'Iu',name:'isNewBrowsingContextTarget',expect:['(e){return!!e&&!ei.has(']},
  {file:SF,local:'nu',name:'CdsLinkPrimitive',expect:['({stamp:e,',{in:'hu',has:'s}=e;return H(nu,{stamp:{"data'}]},
  {file:SF,local:'ob',name:'useIsInCdsSheetFrame',expect:['(){return W(Fy)',{in:'Mk',has:' Mk(e){return ob()?H(Nk,{...e}'}]},
  {file:SF,local:'oi',export:'Mu',name:'sanitizeCdsHref',expect:['"it starts with whitespace the browser keeps"']},
  {file:SF,local:'pd',name:'CdsTextLinkInheritColorContext',expect:['pd=G(!1)',{in:'md',has:':e}){return H(pd.Provider,{val'}]},
  {file:SF,local:'ph',export:'cc',name:'useClickToFocus',expect:['(e,t={}){let{disabled:n=!1']},
  {file:SF,local:'qa',export:'_u',name:'useCdsOwnerWindowAnchor',expect:['(){return W(Oa)',{in:'jd',has:'n jd(e){let t=qa(),n=J(()=>(Ad'}]},
  {file:SF,local:'qd',export:'Wc',name:'useCdsLayer',expect:['"--cds-portal-z"',{in:'Kd',has:' Kd(e){return qd(e)}'}]},
  {file:SF,local:'rb',name:'useControllableOpenState',expect:['(e){let[t,n]=f(e.defaultOpen??']},
  {file:SF,local:'sb',name:'useIsCdsSheetPresentation',expect:['(){let e=yy(',{in:'cC',has:'n cC(e){let t=sb(),n=W(sx),r=h'}]},
  {file:SF,local:'sf',name:'CdsPopupActionsScope',expect:['({actionsRef:e,children:t}']},
  {file:SF,local:'tc',name:'cdsHandedBackFocusTargets',expect:['tc=new WeakMap',{in:'dl',has:'=!1,n!==null&&tc.set(n,t),queu'}]},
  {file:SF,local:'th',export:'dc',name:'cdsSurfaceLevels',expect:['{panel:"surface-2",']},
  {file:SF,local:'vl',name:'CdsTooltipDeferralContext',expect:['vl=G(null)',{in:'xl',has:'xl(){return W(vl)?.engage??nul'}]},
  {file:SF,local:'vr',export:'Uu',name:'useFizzyLakePart',expect:['(e){return _r(',{in:'yr',has:'on yr(){let e=vr("color"),t=lr'}]},
  {file:SF,local:'wn',export:'td',name:'useLatestCallback',expect:['(e){let t=V(e);gt(()=>{t.current=e},[e]);let[n]=f(()=>xn(']},
  {file:SF,local:'wu',name:'CdsSkeletonGroupContext',expect:['wu=G(null)',{in:'Hu',has:' Hu(){let e=W(wu);return yt(e='}]},
  {file:SF,local:'wx',export:'ao',name:'cdsMenuRadiusClass',expect:['"rounded-[calc(var(--cds-radius)+var(--cds-menu-gutter,calc(0.25rem*var(--cds-rem-scale,1))))]"']},
  {file:SF,local:'wy',export:'ts',name:'cdsSheetScrollAttribute',expect:['"data-cds-sheet-scroll"']},
  {file:SF,local:'yC',export:'Ja',name:'CdsSearchableMenuPopup',expect:["'[role^=\"menuitem\"]:not([aria-disabled=\"true\"])'"]},
  {file:SF,local:'zm',export:'bc',name:'resetCompositionEndOnKeyDown',expect:['(e){(e.key!=="Enter"||']},
  // Base UI / Floating UI internals (vendor-frame).
  {file:VF,local:'$g',export:'Y',name:'useComboboxRootContext',expect:['(){let e=N(Jg)',{in:'lv',has:'=!1,...r}=e,i=$g(),a=i.useStat'}]},
  {file:VF,local:'$s',export:'qr',name:'useFloatingClick',expect:['"virtual"','(e,t={}){let{enabled:n=!0,event:r="click']},
  {file:VF,local:'Ba',export:'_i',name:'visuallyHiddenAbsoluteStyle',expect:['{...Ra,position:"absolute"}']},
  {file:VF,local:'Co',name:'findNonDisabledListIndex',expect:['(e,{startingIndex:t=-1,']},
  {file:VF,local:'Cr',export:'fa',name:'useBaseButton',expect:['(e={}){let{disabled:t=!1']},
  {file:VF,local:'En',export:'Oa',name:'useRenderElement',expect:['(e,t,n={}){let r=t.rende']},
  {file:VF,local:'Es',export:'ti',name:'noFallbackAxisSide',expect:['{fallbackAxisSide:"none"}']},
  {file:VF,local:'Fm',name:'defaultFieldRootContext',expect:['{invalid:void 0,',{in:'Im',has:'Im=x(Fm)'}]},
  {file:VF,local:'Hd',export:'Bn',name:'startingTransitionProps',expect:['(e){return e==="starting"?bs:Sn}']},
  {file:VF,local:'Im',name:'FieldRootContext',expect:['Im=x(Fm)',{in:'Lm',has:'e=!0){let t=N(Im);if(t.setVali'}]},
  {file:VF,local:'Ja',name:'mathFloor',expect:['Ja=Math.floor',{in:'$c',has:')return;let m=Ja(d),h=Ja(a.cli'}]},
  {file:VF,local:'Jg',name:'ComboboxRootContext',expect:['Jg=x(void 0)',{in:'$g',has:' $g(){let e=N(Jg);if(!e)throw '}]},
  {file:VF,local:'Jl',export:'Sr',name:'ReactStore',expect:['class extends ql{',{in:'rd',has:'class extends Jl{setState(e){}'}]},
  {file:VF,local:'Jm',export:'Nt',name:'useLabelableId',expect:['(e={}){let{id:t,enabled:n=!0}']},
  {file:VF,local:'Jn',export:'xa',name:'isHTMLElement',expect:['(e){return Hn()?e instanceof HTMLElement||']},
  {file:VF,local:'Jr',name:'isAndroid',expect:['Gr===qr||Wr.includes(']},
  {file:VF,local:'Ju',name:'useTypeahead',expect:['(e,t){let{listRef:n,elementsRef:r,']},
  {file:VF,local:'Kp',name:'usePopupScrollLock',expect:['(e,t,n,r){let[',{in:'uv',has:'lazyFlip:!0});Kp(S&&x,w==="tou'}]},
  {file:VF,local:'Kr',export:'aa',name:'isIOS',expect:['"macintel"','/^i(os$|p)',{in:'Xr',has:'Xr=Yr||Kr'}]},
  {file:VF,local:'Lm',export:'Rt',name:'useFieldRootContext',expect:['(e=!0){let t=N(Im)']},
  {file:VF,local:'Ma',export:'yi',name:'useValueAsRef',expect:['(e){let t=un(Na,',{in:'Nh',has:'),S=dn(t,d),C=Ma(s),w=tu(d),T='}]},
  {file:VF,local:'Mi',export:'qi',name:'triggerOpenStateMapping',expect:['{open(e){return e?Di:null}']},
  {file:VF,local:'Mm',name:'defaultFieldState',expect:['{valid:null,',{in:'Nm',has:'isabled:!1,...Mm}'}]},
  {file:VF,local:'Ni',export:'Ki',name:'pressableTriggerOpenStateMapping',expect:['{open(e){return e?Oi:null}']},
  {file:VF,local:'Ns',export:'$r',name:'FloatingPortal',expect:['"aria-owns"','w(function(e,t){let{render:n,className:r,style:i,children:a,container:o,']},
  {file:VF,local:'Og',name:'stringifyValue',expect:['(e){if(e==null)return"";']},
  {file:VF,local:'Pi',export:'Wi',name:'popupStateMapping',expect:['{open(e){return e?ki:Ai}']},
  {file:VF,local:'Pm',export:'zt',name:'fieldValidityMapping',expect:['{valid(e){',{in:'dh',has:'dh={...Pm,...yi}'}]},
  {file:VF,local:'Q',export:'Si',name:'createChangeEventDetails',expect:['(e,t,n,r){let i=!1,']},
  {file:VF,local:'Ql',export:'br',name:'useTransitionStatus',expect:['(e,t=!1,n=!1,r=!1)']},
  {file:VF,local:'Qs',name:'FloatingFocusManager',expect:['"[data-base-ui-click-trigger]"']},
  {file:VF,local:'Rs',export:'Zr',name:'useFloatingParentNodeId',expect:['()=>N(Is)?.id||null']},
  {file:VF,local:'Sn',export:'ja',name:'emptyObject',expect:['Object.freeze({}',{in:'Hd',has:'"starting"?bs:Sn}'}]},
  {file:VF,local:'To',name:'isListIndexDisabled',expect:['(e,t,n){if(typeof n=="function"?']},
  {file:VF,local:'Ud',export:'zn',name:'usePositionerElement',expect:['(e,t,{styles:n,',{in:'Wd',has:'eOrigin")}),O=Ud(e,V(()=>({ope'}]},
  {file:VF,local:'Uf',name:'InternalBackdrop',expect:['polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,']},
  {file:VF,local:'Um',export:'Ft',name:'useLabelableContext',expect:['(){return N(Hm)',{in:'uh',has:'),{labelId:u}=Um(),d={...c.sta'}]},
  {file:VF,local:'Vi',name:'isInteractiveElement',expect:['(e){return e?.closest(']},
  {file:VF,local:'Vm',export:'Lt',name:'useFormContext',expect:['(){return N(Bm)',{in:'fh',has:'(),{errors:p}=Vm(),m=d&&Object'}]},
  {file:VF,local:'Wm',export:'Pt',name:'LabelableProvider',expect:['function(e){let t=dd(']},
  {file:VF,local:'Wr',name:'userAgentLowerCase',expect:['Vr.toLowerCase(',{in:'Jr',has:'Jr=Gr===qr||Wr.includes(qr)'}]},
  {file:VF,local:'X',export:'ha',name:'useIsoLayoutEffect',expect:['typeof document<"u"?ee:(']},
  {file:VF,local:'Xh',export:'mt',name:'PopoverRoot',expect:['(e){return Uh(']},
  {file:VF,local:'Xi',export:'Li',name:'reasonNone',expect:['Xi="none"',{in:'ka',has:'enChange(!1,Q(Xi))):(p(!1),e?.'}]},
  {file:VF,local:'Xl',export:'xr',name:'FloatingRootStore',expect:['class extends Jl{constructor(e){']},
  {file:VF,local:'Y',export:'ga',name:'useStableCallback',expect:['(e){let t=un(gr)',{in:'qf',has:'{let n=U(e),r=Y(t);X(()=>{n.c'}]},
  {file:VF,local:'Yf',name:'useOpenInteractionType',expect:['(e){let[t,n]=W(null)']},
  {file:VF,local:'Z',export:'na',name:'nodeContains',expect:['(e,t){if(!e||!t)',{in:'jo',has:'n!!n&&(e===n||Z(n,e))}'}]},
  {file:VF,local:'Zr',name:'supportsWebkitBackdropFilter',expect:['"-webkit-backdrop-filter:none"']},
  {file:VF,local:'_u',export:'lr',name:'PopupTriggerMap',expect:['class{constructor(){']},
  {file:VF,local:'ac',export:'Kr',name:'useDismiss',expect:['"__outsidePressBubbles"']},
  {file:VF,local:'ag',export:'dt',name:'PopoverPositioner',expect:['w(function(e,t){let{render:n,className:r,style:i,anchor:a,']},
  {file:VF,local:'ap',export:'dn',name:'CompositeList',expect:['(e){let{children:t,elementsRef:n,']},
  {file:VF,local:'bn',export:'Ma',name:'noop',expect:['function bn(){}',{in:'Lm',has:'alidityData===bn&&!e)throw Err'}]},
  {file:VF,local:'bo',name:'isListIndexOutOfBounds',expect:['(e,t){return t<0||t>=e.lengt']},
  {file:VF,local:'ci',export:'ra',name:'getEventTarget',expect:['(e){return"composedPath"in']},
  {file:VF,local:'cn',export:'Fa',name:'formatBaseUiErrorMessage',expect:['"https://base-ui.com/production-error"']},
  {file:VF,local:'dd',export:'Jn',name:'useBaseUiId',expect:['(e){return ys(',{in:'Ym',has:'Ym(e,t){let n=dd(e);return X(('}]},
  {file:VF,local:'dg',export:'ct',name:'PopoverTitle',expect:['s),En("h2",e,{']},
  {file:VF,local:'dn',export:'Na',name:'useBaseUiMergedRefs',expect:['(e,t,n,r){let i=un(']},
  {file:VF,local:'dr',export:'va',name:'getOverflowAncestors',expect:['(e,t,n){t===void 0&&(']},
  {file:VF,local:'eh',export:'Mt',name:'isControlOfForm',expect:['(e,t){return e.matches(']},
  {file:VF,local:'hh',export:'Et',name:'FieldControl',expect:['"FieldControl"']},
  {file:VF,local:'jm',name:'defaultValidityState',expect:['{badInput:!1,',{in:'$m',has:'m=Object.keys(jm)'}]},
  {file:VF,local:'lg',export:'ut',name:'PopoverPopup',expect:['"openOnHover"','w(function(e,t){let{render:n,className:r,style:i,initialFocus:a,finalFocus:o,...s}=e,c=Uh(']},
  {file:VF,local:'lh',name:'useFieldItemContext',expect:['(){return N(ch)',{in:'uh',has:'=e,c=Lm(!1),l=lh(),{labelId:u}'}]},
  {file:VF,local:'ma',export:'Fi',name:'reasonListNavigation',expect:['ma="list-navigation"',{in:'kv',has:'.setOpen(!0,Q(ma,e.nativeEvent'}]},
  {file:VF,local:'mh',export:'Dt',name:'useRegisterFieldControl',expect:['(e,t,n,r,i=!0,',{in:'hh',has:'rrent?.value);mh(S.inputRef,A,'}]},
  {file:VF,local:'na',name:'reasonClosePress',expect:['na="close-press"',{in:'U_',has:'.setOpen(!1,Q(na,e.nativeEvent'}]},
  {file:VF,local:'ng',export:'ft',name:'PopoverPortal',expect:['w(function(e,t){let{keepMounted:n=!1,...r}=e;return Uh(']},
  {file:VF,local:'np',export:'fn',name:'useControlled',expect:['({controlled:e,',{in:'_h',has:'ed:i}=e,[a,o]=np({controlled:t'}]},
  {file:VF,local:'nu',export:'vr',name:'useOpenChangeComplete',expect:['(e){let{enabled:t=!0,open:n,']},
  {file:VF,local:'pa',name:'reasonEscapeKey',expect:['pa="escape-key"',{in:'Y_',has:':M===null,n=Q(pa,e.nativeEvent'}]},
  {file:VF,local:'pg',export:'ot',name:'PopoverClose',expect:['w(function(e,t){let{render:n,className:r,style:i,disabled:a=!1,nativeButton:o=!0,...s}=e,{']},
  {file:VF,local:'pp',export:'ln',name:'useCompositeListItem',expect:['(e={}){let{guess:t,']},
  {file:VF,local:'qd',export:'Fn',name:'inertAttributeValue',expect:['(e){return vn(',{in:'Wf',has:'dropRef,inert:qd(!s)}),e.child'}]},
  {file:VF,local:'qf',export:'_n',name:'useValueChangeCallback',expect:['(e,t){let n=U(e)',{in:'Yf',has:'f(e,n);return qf(e,t=>{t&&!e&&'}]},
  {file:VF,local:'qn',export:'ba',name:'isElement',expect:['(e){return Hn()?e instanceof Element||e in']},
  {file:VF,local:'qu',name:'useListNavigation',expect:['"aria-activedescendant"']},
  {file:VF,local:'ru',export:'ur',name:'focusableNonTabbableProps',expect:['{tabIndex:-1,[',{in:'Gd',has:'Ref,g],props:[ru,f,Hd(d),a],st'}]},
  {file:VF,local:'sm',name:'isPointInsideElementRect',expect:['(e,t){let n=cm(',{in:'Z_',has:'r,n)||Z(i,n)||sm(e,t)||g.conte'}]},
  {file:VF,local:'sr',export:'_a',name:'getComputedStyleOf',expect:['(e){return Wn(',{in:'Xc',has:' Xc(e){return sr(e).direction='}]},
  {file:VF,local:'ta',name:'reasonItemPress',expect:['ta="item-press"',{in:'Dp',has:'vent:e,reason:ta})},onMouseUp('}]},
  {file:VF,local:'ti',export:'ia',name:'stopEvent',expect:['(e){e.preventDefault(),e.stopPropaga']},
  {file:VF,local:'ug',export:'lt',name:'PopoverArrow',expect:['w(function(e,t){let{render:n,className:r,style:i,...a}=e,o=Uh().useState(']},
  {file:VF,local:'un',export:'Pa',name:'useRefWithInit',expect:['(e,t){let n=U(ln)',{in:'Ma',has:'n Ma(e){let t=un(Na,e).current'}]},
  {file:VF,local:'xn',export:'Aa',name:'emptyArray',expect:['Object.freeze([]',{in:'Ir',has:'ion Ir(e){I(e,xn)}'}]},
  {file:VF,local:'xr',export:'pa',name:'ownerDocument',expect:['(e){return e?.ownerDocument|']},
  {file:VF,local:'ya',name:'reasonCancelOpen',expect:['"cancel-open"',{in:'Cm',has:'.setOpen(!1,Q(ya,e))},{once:!0'}]},
  {file:VF,local:'yi',export:'Qi',name:'transitionStatusMapping',expect:['{transitionStatus(']},
  {file:VF,local:'ys',export:'ai',name:'useIdOrGenerate',expect:['(e,t){if(vs!==void 0)']},
  {file:VF,local:'za',export:'gi',name:'visuallyHiddenFixedStyle',expect:['{...Ra,position:"fixed",']},
  {file:VF,local:'zd',export:'Vn',name:'useAnchorPositioning',expect:['(e){return Bd(',{in:'Wd',has:'ionStatus"),D=zd({anchor:i,pos'}]},
  {file:VF,local:'zm',name:'useFieldsetRootContext',expect:['(e=!1){let t=N(Rm)']},
  {file:VF,local:'zr',export:'sa',name:'useTimeout',expect:['(){let e=un(Rr.create)']},
  // R4i-graph GR3: what the composer attachment tiles (extract-code-composer.mjs, shared-2 wp / Pp / Bp / Ap) still
  // copied or stood in for. xu / Su are the two contexts the CDS Skeleton reads (rd / ad): `true` / the element type
  // under a Skeleton's shimmer (its children's provider), reset to false / "div" by Tu under every popup surface; already
  // selected (CdsSkeleton's closure), naming adds no binding. Cd (exported `Xc`) is the CDS TextLink the failed strip's
  // Retry renders, over CdsLinkPrimitive (nu) and CdsTextLinkInheritColorContext (pd), published above.
  {file:SF,local:'xu',name:'CdsSkeletonShimmerContext',expect:['xu=G(!1)',{in:'Tu',has:'H(xu.Provider,{value:!1,children:H(Su.Provider,{value:"div",'},{in:'rd',has:'let a=W(xu),o=W(Su),'}]},
  {file:SF,local:'Su',name:'CdsSkeletonElementContext',expect:['Su=G("div")',{in:'rd',has:'s=Eu[i??o]'}]},
  {file:SF,local:'Cd',export:'Xc',name:'CdsTextLink',expect:['stamp:{"data-cds":"TextLink"}','iconPosition:r="end"']},
  // The CDS platform the Video tile reads (Fa, exported `hu`: CdsRoot's `platform`, provided as ga, "web" outside one).
  {file:SF,local:'ga',name:'CdsPlatformContext',expect:['ga=G(void 0)',{in:'Fa',has:'return W(ga)??"web"'},{in:'Za',has:'H(ga.Provider,{value:ie,'}]},
  {file:SF,local:'Fa',export:'hu',name:'useCdsPlatform',expect:['return W(ga)??"web"']},
  // 2026-10-18 account avatar: the sidebar account button's avatar (shared-19 C0 = pp{name,src,size:"sm"}, pp = shared-frame `si`): the image,
  // or the name's initials (lj: first + last word's first letter, upper-cased in the CDS locale, "?" when empty).
  {file:SF,local:'uj',export:'si',name:'CdsAvatar',expect:['"data-cds":"Avatar"','onError:()=>u(!0)',{in:'lj',has:'.toLocaleUpperCase(t)||"?"'}]},
];
// D46 names whose publication waits on other areas' generators (value: the generators). Each of those still slices
// its own copy of the binding (roots or closure) and, by design, re-routes or refuses as soon as view-tabs publishes
// the (file, local): publishing now would break their --check, and they are other lanes' files. The roots above
// still assert these features (so the names are settled); the manifest lists them under `pendingNames`, not
// `publicNames`, and the routines generators import them by local until the listed generators import the names.
// Move a name out of this table in the same change that switches its last listed consumer.
const pendingNames={
  isMacUserAgent:'session-rail-changes',
  CdsLayerBaseContext:'mcp-app-card code-composer',cdsTypeScaleStep:'mcp-app-card',useCdsLayerAwareZIndex:'mcp-app-card code-composer',
  CdsSkeleton:'code-composer',cdsSizeAttributes:'code-composer',cdsStaysSecondaryTextClass:'code-composer',
  coarsePointerQuery:'code-composer',elementResizeObserverClass:'code-composer',
  getMutationObserverClass:'code-composer',inertProps:'code-composer',matchesMediaQuery:'code-composer',
  resolveCdsLabel:'code-composer',useCdsIsoLayoutEffect:'code-composer',useCdsLabel:'code-composer',
  useCdsMergedRefs:'code-composer',useClickToFocus:'code-composer',useFizzyLakePart:'code-composer',
  useLatestCallback:'code-composer',useLazyObserver:'code-composer',windowOrDefault:'code-composer',
  CdsSpinner:'turn-box',createSafeStorage:'turn-box',safeLocalStorage:'turn-box',
  asElementNode:'code-composer mcp-app-card proposal-group r4e-findings',
  cdsRemScaleVar:'code-composer turn-box',
  getResizeObserverClass:'code-composer r3b-transcript session-rail-kit turn-box',
  getWindowStorage:'session-rail-kit turn-box',
  isDocumentNode:'code-composer mcp-app-card proposal-group r3b-transcript r4e-findings turn-box',
  ownerWindow:'code-composer mcp-app-card proposal-group r3b-transcript r4e-findings turn-box',
  ariaKeyShortcuts:'code-composer session-rail-changes',useIsMacPlatform:'code-composer session-rail-changes',
  useCdsDensity:'code-composer mcp-app-card',useCdsOwnerWindow:'code-composer mcp-app-card',
  useLazyMutationObserver:'code-composer session-rail-kit',
};
const identifier=/^[A-Za-z_$][\w$]*$/;
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
  function assertFeatures(unit,name,expect,label) {
    const text=declaration(unit,name);
    for(const item of expect) {
      const [owner,needle]=typeof item==='string'?[name,item]:[item.in,item.has];
      if(!(owner===name?text:declaration(unit,owner)).includes(needle))throw Error(`${label}: ${unit.name}:${owner} lacks ${JSON.stringify(needle)}`);
    }
    const strings=expect.filter(item=>typeof item==='string');
    if(strings.length) {
      const owners=topLevel(unit).filter(([,n])=>{const t=unit.code.slice(n.start,n.end);return strings.every(s=>t.includes(s));}).map(([n])=>n);
      if(owners.length!==1||owners[0]!==name)throw Error(`${label}: features ${JSON.stringify(strings)} identify ${owners.join(',')||'nothing'} in ${unit.name}, not ${name}`);
    }
  }
  // Resolve host boundaries before walking the graph.
  const boundaries=new Map(),boundaryInfo=new Map();
  const family=from=>new RegExp(`^\\./${from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}-[\\w-]{8}\\.js$`);
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
  for(const wrapper of wrappers) {
    const unit=await parse(wrapper.file),text=declaration(unit,wrapper.local);
    if(text!==wrapper.declaration)throw Error(`CommonJS wrapper ${wrapper.file}:${wrapper.local} changed: ${text.slice(0,120)}`);
    for(const {in:owner,has} of wrapper.expect??[])if(!declaration(unit,owner).includes(has))throw Error(`CommonJS factory ${wrapper.file}:${owner} lacks ${has}`);
    (boundaries.get(wrapper.file)??boundaries.set(wrapper.file,new Map()).get(wrapper.file)).set(wrapper.local,wrapper.host);
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
    const deps=new Set(),dynamic=new Set();p.traverse({ReferencedIdentifier(r){if(r.scope.getBinding(r.node.name)?.scope===m.program.scope)deps.add(r.node.name);},CallExpression(r){if(r.node.callee.type==='Import')dynamic.add(r.node.arguments[0]?.value);},ImportExpression(r){dynamic.add(r.node.source.value);}});
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
  }
  const manifest={referenceVersion:reference.version,referenceSnapshot:reference.snapshot,publicNames:{},pendingNames:{},modules:[]};
  for(const name of Object.keys(pendingNames))if(!roots.some(entry=>entry.name===name))throw Error(`Pending name ${name} has no root`);
  for(const entry of roots){const table=pendingNames[entry.name]?manifest.pendingNames:manifest.publicNames;if(manifest.publicNames[entry.name]||manifest.pendingNames[entry.name])throw Error(`Duplicate public name ${entry.name}`);table[entry.name]={file:entry.file,local:entry.local,...(entry.export!==undefined?{export:entry.export}:{}),...(table===manifest.pendingNames?{waitsFor:pendingNames[entry.name].split(' ')}:{})};}
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
    const text=`// Original Claude Desktop ${reference.version} bindings; generated by extract-view-tabs.mjs.\n${imports.join('\n')}\n${blocks.join('\n')}\nexport {${list.join(',')}};\n`;
    manifest.modules.push({source:m.name,sourceSha256:sha(m.code),sha256:sha(text),bindings:selected.map(([name])=>name),
      initializers:m.initializers.map(p=>({start:p.node.start,sha256:sha(m.code.slice(p.node.start,p.node.end))})),
      adapters:[...m.imports].filter(([,v])=>!v[0].startsWith('./')).map(([local,[from,name]])=>({local,from,name,...boundaryInfo.get(`${m.name}:${local}`)})),
      dynamic:!!m.dynamic});
    outputs.push([m.name,text]);
  }
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
    for(const {source:name} of previous?.modules??[])if(!expected.has(name)&&/^[\w.-]+\.js$/.test(name))await fs.rm(path.join(output,name),{force:true});
    for(const [name,text] of outputs)await fs.writeFile(path.join(output,name),text);
    await fs.writeFile(path.join(output,'manifest.json'),json);
  }
  console.log(`${check?'Verified':'Extracted'} ${manifest.modules.length} current view-tab source modules (${manifest.modules.reduce((n,m)=>n+m.bindings.length,0)} bindings, ${Object.keys(manifest.publicNames).length} public names) from ${reference.version}.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await extractViewTabs({check:process.argv.includes('--check')});
