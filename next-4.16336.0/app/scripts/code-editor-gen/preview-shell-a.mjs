// Area "preview-shell-a": Preview address field, navigation row, server-menu items, split dev-server menu and URL copy.
// Claude Desktop 3.6556.2 (w10-editor-preview-shell-a; research/w10-editor.md, plan-w10 §w10-editor-preview-shell-a):
//   cf550b864-hZr1-4Cn  address field `pe` (compiled) + tooltip context `S/C/ae`, helpers `oe se ce le ue de fe me`
//   c224804cc-Ct9XIdre  display URL `Y/pe`, navigation `M N P F` (compiled `P`/`F`)
//   cd5e3435c-x0WPI3Iu  pane header line `o s` (fizzy-lake "panels" branch, off per E12/R15)
//   cfca6870a-Dn2eYjs8  menu items `_ v y b x S` (compiled `b`/`x`)
//   cf580efe9-BFcQCjF9  dev-server menu `ai oi si ci li ui di fi pi mi` (compiled `li`/`mi`), URL copy `Ra za Ba`
// React Compiler helpers and CDS hooks come from view-tabs by semantic name (R3/R6, concrete files, E41); host
// primitives (Button/Tooltip/Spinner/Menu, stable callbacks, intl, toasts, clipboard) stay factory parameters.
// The old binding → new binding table (2.31226.0 → 3.6556.2): address `se→ue ce→de le→fe O→pe ae→oe oe→se E→ce D→le`
// (the reload button left the field: `oe` has no `reload`, `pe` reads no `onReload`; it is the navigation row's `P`),
// display `X→Y pe→pe`, navigation `P→M F→N ie→P` (`I` became the compiled `F`), header `r→o i→s`, menu items
// `d→_ f→v p→y m→x h→S` (+ searchable popup `b`), servers `Mr→ai Nr→oi Pr→si Fr→ci Ir→li Lr→mi`, copy `Ai→Ra ji→za Mi→Ba`.
import { compilerHelpers, looseFeature } from '../official-3.6556.2.mjs';
import { fs, path, root } from './common.mjs';

const version = '3.6556.2', base = 'ion', viewTabs = '../view-tabs';
const helperNames = new Map(Object.values(compilerHelpers).map(({ local, name }) => [local, name]));

// Compiler helpers the emitted text uses, imported from view-tabs shared-frame by semantic name (E3).
function helperImport(text, extra = []) {
  const used = [...helperNames.keys()].filter(local => new RegExp(`(?<![\\w$])${local}(?![\\w$])`).test(text));
  const names = [...used.map(local => `${helperNames.get(local)} as ${local}`), ...extra];
  return names.length ? `import {${names.join(',')}} from '${viewTabs}/shared-frame-6jtSkIit.js';` : '';
}
// R2/E5: the official import line must bind the expected alias (the chunk is pinned by hash, this guards a rename).
function expectImport(text, file, alias, local, from) {
  const pattern = new RegExp(`import\\s*\\{[^}]*(?<![\\w$])${alias.replace(/\$/g, '\\$')}\\s+as\\s+${local.replace(/\$/g, '\\$')}(?![\\w$])[^}]*\\}\\s*from\\s*"\\./${from.replace(/[.]/g, '\\.')}"`);
  if (!pattern.test(text)) throw Error(`${file}: expected import ${alias} as ${local} from ${from}`);
}
function expectFeature(text, file, feature) {
  const ok = feature instanceof RegExp ? feature.test(text) : text.includes(feature);
  if (!ok) throw Error(`${file}: feature ${feature} not found in the 3.6556.2 slice`);
}

export async function emit({ adapter, originalBindings, readSource }) {
  // Every wanted declaration must exist (originalBindings silently skips a missing name).
  async function pick(file, wanted, features = []) {
    const result = await originalBindings(file, wanted, { base });
    for (const name of wanted) {
      const declared = new RegExp(`(?:^|\\n)(?:const ${name.replace(/\$/g, '\\$')}=|function ${name.replace(/\$/g, '\\$')}\\()`);
      if (!declared.test(result.text)) throw Error(`${file}: 3.6556.2 binding ${name} not found`);
    }
    for (const feature of features) expectFeature(result.text, file, feature);
    return result;
  }
  const raw = async file => (await readSource(file, { base })).text;

  // ---- address field (cf550b864) + display URL (c224804cc) ----
  const addressFile = 'cf550b864-hZr1-4Cn.js', displayFile = 'c224804cc-Ct9XIdre.js', frameFile = 'shared-frame-6jtSkIit.js';
  const addressRaw = await raw(addressFile);
  for (const [alias, local, from] of [['Co', 'e', 'vendor-frame-CnSY1sxv.js'], ['Ha', 't', 'vendor-frame-CnSY1sxv.js'], ['Ua', 'n', 'vendor-frame-CnSY1sxv.js'],
    ['bo', 'r', 'vendor-frame-CnSY1sxv.js'], ['fo', 'i', 'vendor-frame-CnSY1sxv.js'], ['ho', 'a', 'vendor-frame-CnSY1sxv.js'], ['so', 'o', 'vendor-frame-CnSY1sxv.js'],
    ['to', 's', 'vendor-frame-CnSY1sxv.js'], ['wo', 'c', 'vendor-frame-CnSY1sxv.js'], ['Bd', 'l', frameFile], ['Eu', 'u', frameFile], ['Id', 'd', frameFile], ['Vu', 'ee', frameFile]])
    expectImport(addressRaw, addressFile, alias, local, from);
  const addressContext = await pick(addressFile, ['S', 'C', 'ae'], ['S=s(!0)', 'C=S.Provider', 'return i(S)']);
  const address = await pick(addressFile, ['oe', 'se', 'ce', 'le', 'ue', 'de', 'fe', 'pe', 'me'], [
    '"group/field relative h-full min-w-0 flex-1"', 'before:content-[attr(data-scheme)]', '"ArrowOutSquare"', 'pe=ae()',
    looseFeature('{address:"Address",openExternal:"Open in default browser",loading:"Loading page"}')]);
  if (/onReload|reload:/.test(address.text)) throw Error(`${addressFile}: the 3.6556.2 field is expected to carry no reload button`);
  const ownerWindow = await pick(frameFile, ['aa'], ['e?.ownerDocument.defaultView??globalThis.window']);
  const display = await pick(displayFile, ['Y', 'pe'], [looseFeature('let t=e.replace(/^https?:\\/\\//,"");if(t===e)return e;')]);
  const addressBody = `${addressContext.text}\n${address.text}`;
  await adapter('preview-address-field.mjs', `// Original Claude Desktop 3.6556.2 Preview address field (cf550b864 pe) and display URL (c224804cc Y); host supplies
// the Button and Spinner primitives. The tooltip context (S/C/ae) is shared with preview-navigation.mjs.
import {useRef as e,useLayoutEffect as r,useContext as i,useEffect as a,memo as o,createContext as s,useState as c} from 'react';
import {jsx as t,jsxs as n} from 'react/jsx-runtime';
${helperImport(addressBody, ['useCdsOwnerWindowAnchor as d'])}
${ownerWindow.text}
const l=aa;
${addressContext.text}
export {C as PreviewAddressTooltipProvider};
export function createPreviewAddressField({Button:u,Spinner:ee}) {
${address.text}
return pe;
}
const displayPreviewURL=(()=>{${display.text}
return Y;})();
export {displayPreviewURL};`, [address.source, ownerWindow.source, display.source], version);

  // ---- navigation row (c224804cc M N P F) + pane header line (cd5e3435c o s) ----
  const navigationRaw = await raw(displayFile);
  for (const [alias, local, from] of [['Ha', 't', 'vendor-frame-CnSY1sxv.js'], ['Ua', 'n', 'vendor-frame-CnSY1sxv.js'], ['Va', 'r', 'vendor-frame-CnSY1sxv.js'],
    ['so', 'o', 'vendor-frame-CnSY1sxv.js'], ['Eu', 'c', frameFile], ['Kl', 'l', frameFile], ['ql', 'ee', frameFile],
    ['t', 'E', 'cd5e3435c-x0WPI3Iu.js'], ['s', 're', addressFile]])
    expectImport(navigationRaw, displayFile, alias, local, from);
  const navigation = await pick(displayFile, ['M', 'N', 'P', 'F'], ['N="hidden @[320px]:inline-flex"', '"aria-label":y.pageTools', 'extraTool:m', 't(re,{value:W,children:d})']);
  const headerFile = 'cd5e3435c-x0WPI3Iu.js', headerRaw = await raw(headerFile);
  for (const [alias, local, from] of [['uo', 'e', 'vendor-frame-CnSY1sxv.js'], ['Hf', 't', frameFile], ['Yo', 'n', 'shared-4-DUB1Oi0O.js'],
    ['an', 'r', 'shared-15-BvlV43cI.js'], ['a', 'i', 'c5a5ed580-Dr77qXb6.js'], ['r', 'a', 'c5a5ed580-Dr77qXb6.js']])
    expectImport(headerRaw, headerFile, alias, local, from);
  const header = await pick(headerFile, ['o', 's'], ['o="flex min-w-0 shrink-0 items-center h-9 gap-2 border-b px-1"', 'n("panels")', '"data-pane-header-line":""']);
  // Panels-only header inputs (dead while the fizzy-lake part is off, E12): shared-15 `an` (= `bn`, createContext(false)),
  // c5a5ed580 `a`/`r` (= locals `d`/`u`, built from shared-6 `df ff mf wf` = `Lh Mh Rh Ph`).
  const headerLineFile = 'c5a5ed580-Dr77qXb6.js', headerLineRaw = await raw(headerLineFile);
  expectFeature(headerLineRaw, headerLineFile, 'import{df as e,ff as t,mf as n,wf as r}from"./shared-6-sd9jbJqs.js"');
  expectFeature(headerLineRaw, headerLineFile, /export\{[^}]*(?<![\w$])d as a,[^}]*(?<![\w$])u as r,/);
  const headerLine = await pick(headerLineFile, ['i', 'u', 'd'], ['relative border-b-0 gap-1']);
  const toolbarTokens = await pick('shared-6-sd9jbJqs.js', ['Lh', 'Mh', 'Ph', 'Rh'], ['Rh="px-sm"']);
  const paneHeaderFile = 'shared-15-BvlV43cI.js';
  expectFeature(await raw(paneHeaderFile), paneHeaderFile, /export\{[^}]*(?<![\w$])bn as an(?![\w$])/);
  const paneHeader = await pick(paneHeaderFile, ['bn'], ['bn=m(!1)']);
  const navigationBody = navigation.text;
  await adapter('preview-navigation.mjs', `// Original Claude Desktop 3.6556.2 Preview navigation row (c224804cc P) and pane header line (cd5e3435c s); host
// supplies the Button and Tooltip primitives. The address field's tooltip context wraps the row's children (re).
import {memo as o,use as reactUse,createContext as reactCreateContext} from 'react';
import {jsx as t,jsxs as n,Fragment as r} from 'react/jsx-runtime';
${helperImport(navigationBody, ['CdsTooltipProvider as ee', 'cdsClassNames'])}
import {isFizzyLakePartEnabled} from '${viewTabs}/shared-4-DUB1Oi0O.js';
import {PreviewAddressTooltipProvider as re} from './preview-address-field.mjs';
const E=(()=>{
const [i,a]=(()=>{${toolbarTokens.text}
const e=Lh,t=Mh,n=Rh,r=Ph;
${headerLine.text}
return [d,u];})();
const r=(()=>{const m=reactCreateContext;${paneHeader.text}
return bn;})();
const e=reactUse,t=cdsClassNames,n=isFizzyLakePartEnabled;
${header.text}
return s;})();
export function createPreviewNavigation({Button:c,Tooltip:l}) {
${navigationBody}
return P;
}`, [navigation.source, header.source, headerLine.source, toolbarTokens.source, paneHeader.source], version);

  // ---- menu items (cfca6870a) ----
  const itemsFile = 'cfca6870a-Dn2eYjs8.js', itemsRaw = await raw(itemsFile);
  for (const [alias, local, from] of [['Ha', 'e', 'vendor-frame-CnSY1sxv.js'], ['Ua', 't', 'vendor-frame-CnSY1sxv.js'], ['Va', 'n', 'vendor-frame-CnSY1sxv.js'],
    ['Ya', 'r', 'vendor-frame-CnSY1sxv.js'], ['ho', 'i', 'vendor-frame-CnSY1sxv.js'], ['Jo', 'a', frameFile], ['Kl', 'o', frameFile], ['Vu', 's', frameFile],
    ['Sn', 'l', 'shared-18-D3y8YMFN.js'], ['As', 'u', 'shared-28-DNYlf4wu.js'], ['js', 'd', 'shared-28-DNYlf4wu.js']])
    expectImport(itemsRaw, itemsFile, alias, local, from);
  const items = await pick(itemsFile, ['_', 'v', 'y', 'b', 'x', 'S'], ['"press right arrow to activate"', '"press left arrow to activate"', 'maxVisibleItems:8.5', 'a.SearchablePopup']);
  const sides = await pick('shared-28-DNYlf4wu.js', ['$h', 'eg'], ['return e==="inline-start"==(t==="rtl")?"right":"left"']);
  await adapter('preview-menu-items.mjs', `// Original Claude Desktop 3.6556.2 menu item renderer (cfca6870a S): submenus, searchable popups, tooltips, loading
// and trailing actions; host supplies the Menu, Tooltip and Spinner primitives. S(container, intl, onClose, rtl).
import {useEffect as i,Fragment as r} from 'react';
import {jsx as e,jsxs as t,Fragment as n} from 'react/jsx-runtime';
${helperImport(items.text)}
import {menuCollisionPadding as l} from '../code-composer/menu-collision-padding.mjs';
${sides.text}
const u=eg,d=$h;
export function createPreviewMenuItems({Menu:a,Tooltip:o,Spinner:s}) {
${items.text}
return S;
}`, [items.source, sides.source], version);

  // ---- split dev-server menu (cf580efe9) ----
  const serverFile = 'cf580efe9-BFcQCjF9.js', serverRaw = await raw(serverFile);
  for (const [alias, local, from] of [['Ha', 'r', 'vendor-frame-CnSY1sxv.js'], ['Ua', 'o', 'vendor-frame-CnSY1sxv.js'], ['Va', 's', 'vendor-frame-CnSY1sxv.js'],
    ['Ya', 'c', 'vendor-frame-CnSY1sxv.js'], ['so', 'f', 'vendor-frame-CnSY1sxv.js'], ['wo', 'm', 'vendor-frame-CnSY1sxv.js'], ['Ia', 'i', 'vendor-frame-CnSY1sxv.js'],
    ['Eu', 'g', frameFile], ['Id', 'v', frameFile], ['Jo', 'b', frameFile], ['Kl', 'S', frameFile], ['Vu', 'w', frameFile],
    ['LS', 'R', 'shared-0-DDOOdL6P.js'], ['RS', 'z', 'shared-0-DDOOdL6P.js'], ['p', 'Oe', 'vendor-intl-DYfox5Co.js'], ['Sn', 'Fe', 'shared-18-D3y8YMFN.js'],
    ['Jr', 'X', 'shared-8-Db1QN4mf.js'], ['n', 'Kn', 'c9c84d68b-CwNakXgX.js'], ['o', 'ar', itemsFile]])
    expectImport(serverRaw, serverFile, alias, local, from);
  const servers = await pick(serverFile, ['ai', 'oi', 'si', 'ci', 'li', 'ui', 'di', 'fi', 'pi', 'mi'], [
    'empty:"No dev server configured"', 'icon:"Cache"', 'className:"min-w-8 shrink-0"', 'onContextMenu:ai', 'ar(O,k,void 0,A)']);
  const stopIcon = await pick('shared-8-Db1QN4mf.js', ['HF'], ['ks("icons")?"StopFilled":void 0']);
  expectImport(await raw('shared-8-Db1QN4mf.js'), 'shared-8-Db1QN4mf.js', 'Yo', 'ks', 'shared-4-DUB1Oi0O.js');
  const preventDefault = await pick('c9c84d68b-CwNakXgX.js', ['T'], ['return e.preventDefault()']);
  await adapter('preview-server-menu.mjs', `// Original Claude Desktop 3.6556.2 split dev-server menu (cf580efe9 mi) and section/action builder (li); host supplies
// the Menu/Tooltip/Button/Spinner primitives, stable callbacks (official useEventCallback/useOptional…), the portal
// anchor, intl and the item renderer (preview-menu-items.mjs).
import {memo as f,useState as m} from 'react';
import {jsx as r,jsxs as o,Fragment as s} from 'react/jsx-runtime';
import {Fragment as c} from 'react';
${helperImport(servers.text)}
import {useDirection as i} from '${viewTabs}/vendor-frame-CnSY1sxv.js';
import {isFizzyLakePartEnabled as ks} from '${viewTabs}/shared-4-DUB1Oi0O.js';
import {menuCollisionPadding as Fe} from '../code-composer/menu-collision-padding.mjs';
${stopIcon.text}
const X=HF;
const Kn=(()=>{${preventDefault.text}
return T;})();
export function createPreviewServerMenu({Menu:b,Tooltip:S,Button:g,Spinner:w,
 useStable:R,useOptionalStable:z,usePortal:v,useIntl:Oe,renderItems:ar}) {
${servers.text}
return {Menu:mi,useSections:li,isEmpty:si};
}`, [servers.source, stopIcon.source, preventDefault.source], version);

  // ---- URL copy (cf580efe9 Ra za Ba; preload-helper e = view-tabs tagErrorText) ----
  for (const [alias, local, from] of [['Co', 'n', 'vendor-frame-CnSY1sxv.js'], ['ho', 'd', 'vendor-frame-CnSY1sxv.js'], ['Id', 'v', frameFile],
    ['Kd', 'x', frameFile], ['pa', 'W', 'shared-52-uHFNjl7C.js'], ['ah', 'B', 'shared-0-DDOOdL6P.js'], ['n', 'e', 'preload-helper-D0dM6GpB.js']])
    expectImport(serverRaw, serverFile, alias, local, from);
  const copy = await pick(serverFile, ['Ra', 'za', 'Ba'], ['Ra="__gb__110515556"', '"preview_copy_url_failed"', '"The pane holds no address."', 's=$t(Ra)']);
  expectImport(serverRaw, serverFile, 'S', '$t', 'c51596d2b-Dy8p_zYF.js');
  await adapter('preview-copy-url.mjs', `// Original Claude Desktop 3.6556.2 URL copy hook (cf580efe9 Ba): website validation, clipboard result and
// generation-scoped feedback. Gate ${'`'}__gb__110515556${'`'} is read through the host useFeature (D29/D31 unchanged).
import {useRef as n,useEffect as d} from 'react';
${helperImport(copy.text)}
import {tagErrorText as e} from '${viewTabs}/preload-helper-D0dM6GpB.js';
export function createPreviewCopyUrl({useIntl:Oe,useToasts:W,useOwnerWindow:v,useFeature:$t,useStable:R,writeClipboard:x,previewApi:B}) {
${copy.text}
return Ba;
}`, [copy.source], version);

  // ---- tab strip pieces (w12b-terminal-preview-tabs TPT-1/2/6): cf580efe9 Oa's strip helpers `Ca wa Ta` and its close
  // confirmation `va` (compiled), c224804cc `G` (mr, the cap) and `K` (gr, the favicon at the strip density), c155b6b71
  // `_ x l` (pt/ht/_t: local origin, origin label, the seed id) over cf790d7f8 `l u` (the loopback host test), c62dc633f
  // `t` ($n, the strip labels). D1: the favicon c25e47851 `a` is the copy extract-cowork-live owns (the link is checked
  // against its manifest). "Open in {browserName}" (c8ae173c6, On) is w12b-settings-dialogs' default-browser-name store.
  for (const [alias, local, from] of [['Co', 'n', 'vendor-frame-CnSY1sxv.js'], ['Ha', 'r', 'vendor-frame-CnSY1sxv.js'], ['Ia', 'i', 'vendor-frame-CnSY1sxv.js'],
    ['Ua', 'o', 'vendor-frame-CnSY1sxv.js'], ['so', 'f', 'vendor-frame-CnSY1sxv.js'], ['wo', 'm', 'vendor-frame-CnSY1sxv.js'], ['Eu', 'g', frameFile],
    ['Yc', 'E', frameFile], ['qi', 'O', frameFile], ['l', 'J', 'vendor-intl-DYfox5Co.js'], ['p', 'Oe', 'vendor-intl-DYfox5Co.js'], ['Qd', 'Pe', 'shared-18-D3y8YMFN.js'],
    ['bt', 'Jt', 'c03935b01-yhcY34vt.js'], ['i', 'pt', 'c155b6b71-66pw54FW.js'], ['o', 'ht', 'c155b6b71-66pw54FW.js'], ['t', '_t', 'c155b6b71-66pw54FW.js'],
    ['t', 'Qn', 'cfe7c4b3b-BF79K6ux.js'], ['t', '$n', 'c62dc633f-DX11ZrnB.js'], ['a', 'mr', displayFile], ['i', 'gr', displayFile]])
    expectImport(serverRaw, serverFile, alias, local, from);
  const strip = await pick(serverFile, ['Ca', 'wa', 'Ta'], ['function Ca(e){try{let{port:t}=new URL(e);if(t&&pt(e))return t}catch{}return ht(e)}',
    'return t==="http:"||t==="https:"', 'r(O.Item,{onClick:a,children:n})']);
  // The strip itself (Oa) is host wiring around ViewTabBar (window.B, stores, analytics); its props are pinned here.
  for (const feature of ['r(Qn,{ref:fe,className:"min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden"',
    'defaultMessage:"Browser tabs",id:"PWNKw3lqV8"', 'defaultMessage:"Preview tabs",id:"QU/W+eha/0"', 'activeId:E.length===0?_t:D,onActivate:Ve,onReselect:Le,onClose:rt,onCreate:ue,newTabShortcut:a?"cmd+t":void 0,createDisabled:mr(E.length),renderTabMenuItems:B?.openPreviewInBrowser?kt:void 0,onCloseOthers:At,onReorder:A?O:void 0,labels:It',
    'label:t.title?.trim()||Ca(t.origin),detail:t.origin,icon:r(gr,{src:t.faviconUrl,busy:t.loading||t.toolActive===!0},t.faviconUrl),closable:!0',
    '{id:t.tabId,label:t.tabId==="seed"?e:N}', '[{id:_t,label:N,closable:!1}]', '!t||!wa(t)?null:r(Ta,{tabId:e,label:C,onOpenInBrowser:Dt})',
    '{...Nt,closeOtherTabs:Pt}', 'defaultMessage:"Close other tabs",id:"kcQzEk8MkX"'])
    expectFeature(serverRaw, serverFile, feature);
  const closeDialog = await pick(serverFile, ['va'], ['let $=J9(50),{pending:t,onCancel:a,onKeepRunning:s,onStopServer:c,onClosed:l}=e',
    'defaultMessage:"the dev server",id:"Qfb02UEU5e"', 'defaultMessage:"{count, plural, one {Stop server and close} other {Stop servers and close}}",id:"pcQAGNzCUk"',
    'o(E.Footer,{align:"between",children:[j,ee]})', 'o(E.Popup,{initialFocus:p,className:"epitaxy-root break-words max-w-[28rem]",children:[k,L]})',
    'r(Pe,{children:r(E.Root,{open:f,onOpenChange:y,onOpenChangeComplete:b,children:R})})']);
  const displayRaw = await raw(displayFile);
  for (const [alias, local, from] of [['Ha', 't', 'vendor-frame-CnSY1sxv.js'], ['t', 'D', 'c25e47851-BMvEUx1u.js'], ['n', 'A', 'cfe7c4b3b-BF79K6ux.js']])
    expectImport(displayRaw, displayFile, alias, local, from);
  expectFeature(displayRaw, displayFile, /export\{[^}]*(?<![\w$])G as a,[^}]*(?<![\w$])K as i,/);
  const favicon = await pick(displayFile, ['G', 'K'], ['function G(e){return e>8}', 'n=A()==="md"?20:12', 't(D,{...e,size:n})']);
  const originFile = 'c155b6b71-66pw54FW.js', originRaw = await raw(originFile);
  expectImport(originRaw, originFile, 'i', 'c', 'cf790d7f8-xYEccUK6.js');
  expectFeature(originRaw, originFile, /export\{[^}]*(?<![\w$])_ as i,[^}]*(?<![\w$])x as o,[^}]*(?<![\w$])l as t\}/);
  const origin = await pick(originFile, ['_', 'x', 'l'], ['return c(URL.parse(e)?.hostname??"")', 'if(t.protocol==="file:")', 'l="seed"']);
  const originLine = prefix => {
    const lines = origin.text.split('\n').filter(line => line.startsWith(prefix));
    if (lines.length !== 1) throw Error(`${originFile}: expected one declaration starting ${prefix}`);
    return lines[0];
  };
  const loopbackFile = 'cf790d7f8-xYEccUK6.js';
  expectFeature(await raw(loopbackFile), loopbackFile, /export\{[^}]*(?<![\w$])u as i,/);
  const loopback = await pick(loopbackFile, ['l', 'u'], ['e.replace(/\\.+$/,"")', 't==="localhost"||t.endsWith(".localhost")||t==="[::1]"||t==="0.0.0.0"']);
  const labelsFile = 'c62dc633f-DX11ZrnB.js';
  expectImport(await raw(labelsFile), labelsFile, 'p', 'e', 'vendor-intl-DYfox5Co.js');
  const labels = await pick(labelsFile, ['t'], ['let $=J9(28),t=e()', 'defaultMessage:"Tab limit reached. Close a tab to open a new one.",id:"I/88mP3stO"',
    'newTab:n,newTabAtCap:r,newTabBusy:i,moreTabs:a,closeTab:o,closeTabHint:s,closeTabHintRtl:c,closeTabDeleteHint:l,moveTabHint:u']);
  // D1 links: the owner's manifest must still record the target as that binding of the same chunk.
  async function linked(manifest, target, sourceFile, binding) {
    const owned = JSON.parse(await fs.readFile(path.join(root, 'src/generated', manifest), 'utf8')).modules?.find(entry => entry.target === target);
    if (owned?.source !== sourceFile || !owned.bindings?.some(entry => (entry.name ?? entry) === binding))
      throw Error(`preview-tab-strip: ${manifest} no longer records ${target} as ${sourceFile} ${binding}`);
  }
  await linked('cowork-live/manifest.json', 'c25e47851-BMvEUx1u.mjs', 'c25e47851-BMvEUx1u.js', 'a');
  await adapter('preview-tab-strip.mjs', `// Original Claude Desktop 3.6556.2 Preview tab strip pieces around ViewTabBar (cfe7c4b3b t): the tab label (cf580efe9
// Ca over c155b6b71 _ / x and cf790d7f8 u), the web-origin test (wa), the tab menu's open-in-browser item (Ta), the cap
// (c224804cc G), the favicon at the strip density (c224804cc K over c25e47851 a), the seed tab id (c155b6b71 l), the strip
// labels (c62dc633f t) and the close confirmation (cf580efe9 va, compiled); the host supplies intl, FormattedMessage, the
// modal presence hook and the Code pane's compact CdsRoot (shared-18 fx).
import {memo as f,useRef as n,useState as m} from 'react';
import {jsx as r,jsxs as o,jsx as t} from 'react/jsx-runtime';
${helperImport(`${strip.text}\n${closeDialog.text}\n${favicon.text}\n${labels.text}`, ['CdsAlertDialog as E', 'CdsButton as g', 'CdsContextMenu as O'])}
import {useDirection as i} from '${viewTabs}/vendor-frame-CnSY1sxv.js';
import {useViewTabIconSize as A} from '${viewTabs}/cfe7c4b3b-BF79K6ux.js';
import {a as D} from '../cowork-live/c25e47851-BMvEUx1u.mjs';
const pt=(()=>{${loopback.text}
const c=u;
${originLine('function _(')}
return _;})();
const ht=(()=>{${originLine('function x(')}
return x;})();
const _t=(()=>{${originLine('const l=')}
return l;})();
${strip.text}
${favicon.text}
export {Ca as previewTabLabel,wa as isWebOrigin,Ta as PreviewTabOpenInBrowserItem,G as previewTabsAtCap,K as PreviewTabFavicon,_t as previewSeedTabId,pt as isLocalOrigin,ht as originLabel};
export function createPreviewTabStripLabels({useIntl:e}) {
${labels.text}
return t;
}
export function createPreviewCloseTabsDialog({useIntl:Oe,FormattedMessage:J,useModalPresence:Jt,CodePaneRoot:Pe}) {
${closeDialog.text}
return va;
}`, [strip.source, favicon.source, origin.source, loopback.source, labels.source], version);

  // ---- dev server logs lines (w12b TPT-4): cf580efe9 So's rows Go tint a line by _o (the first 200 characters, a tsc
  // "Found 0 errors" banner blanked out) with vo's classes.
  expectFeature(serverRaw, serverFile, 'function Go(e,n){let i=_o(e.line);return r("div",{className:t("whitespace-pre-wrap break-all",i&&vo[i]),children:r(Dn,{text:e.line})},n)}');
  const logLines = await pick(serverFile, ['go', '_o', 'vo'], ['go="FOUND 0 ERRORS. WATCHING FOR FILE CHANGES."', 'n.includes("ERR!")', 'vo={error:"text-danger",warn:"text-warning"}']);
  await adapter('preview-log-lines.mjs', `// Original Claude Desktop 3.6556.2 dev server log line tint (cf580efe9 _o over go) and its classes (vo), read by the
// logs drawer's rows (So's Go: "whitespace-pre-wrap break-all" plus the tint).
${logLines.text}
export {_o as devServerLogTone,vo as devServerLogToneClasses};`, [logLines.source], version);
}
