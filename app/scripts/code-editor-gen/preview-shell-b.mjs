// Area "preview-shell-b": Preview settings menu, pane menu, link destination chooser and CDS radio card.
// Claude Desktop 3.6556.2 (w10-editor-preview-shell-b; research/w10-editor.md, plan-w10 §w10-editor-preview-shell-b):
//   c224804cc-Ct9XIdre  settings labels `B`, cookie modes `V`/`H`, sections hook `ae` (compiled) with its filter `oe`,
//                       menu `U` and clear-data dialog `W` (compiled)
//   ca5db7aaf-qq5selW3  pane menu `H` (compiled), sections `U W`, rows `Z`, searchable submenu `G K q J Y X`, unroll `Q ee`,
//                       popup context-menu guard `P` and empty list `F`
//   cf700d36e-BRuz1Q_U  link destination chooser `p` (compiled); cebf5596d-q9cCbs9l input arming delay `n r` (compiled)
//   shared-frame-6jtSkIit radio card `sV cV` (compiled `cV`) with its description class `kS` (`Mt`)
// React Compiler helpers and cdsClassNames come from view-tabs by semantic name (R3/E3, concrete file, E41); host
// primitives (pane menu, Menu/Button/Tooltip, confirmation dialog, radio, intl, stores, portal) stay factory parameters.
// Binding table (2.31226.0 → 3.6556.2): settings `oe→B se→V ce→H B→ae V→U H→W` (the old sections hook `B` is the compiled
// `ae`; 3.6556.2 adds `autoOpenFiles` and drops the Export and Color scheme items), pane menu `F→P I→F U→H W→U G→G K→K
// q→q J→J Y→X X→Z Z→Q` (+ `W Y ee`, the filters the compiler hoisted; the menu no longer takes `className`), chooser
// `v→p`, arming `n→n` (+ `r`), radio `PN→sV FN→cV` (+ `kS`/`Mt`: the description is `text-[color:var(--cds-text-stays-
// secondary,…)]` instead of `text-muted`).
import { compilerHelpers, looseFeature } from '../official-3.6556.2.mjs';

const version = '3.6556.2', base = 'ion', viewTabs = '../view-tabs';
const vendorFrame = 'vendor-frame-CnSY1sxv.js', frameFile = 'shared-frame-6jtSkIit.js';
const helperNames = new Map(Object.values(compilerHelpers).map(({ local, name }) => [local, name]));

// Compiler helpers the emitted text uses, imported from view-tabs shared-frame by semantic name (E3).
function helperImport(text, extra = []) {
  const used = [...helperNames.keys()].filter(local => new RegExp(`(?<![\\w$])${local}(?![\\w$])`).test(text));
  const names = [...used.map(local => `${helperNames.get(local)} as ${local}`), ...extra];
  return names.length ? `import {${names.join(',')}} from '${viewTabs}/${frameFile}';` : '';
}
const escape = value => value.replace(/[$.]/g, match => `\\${match}`);
// R2/E5: the official import line must bind the expected alias (the chunk is pinned by hash, this guards a rename).
function expectImport(text, file, alias, local, from) {
  const pattern = new RegExp(`import\\s*\\{[^}]*(?<![\\w$])${escape(alias)}\\s+as\\s+${escape(local)}(?![\\w$])[^}]*\\}\\s*from\\s*"\\./${escape(from)}"`);
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
      const declared = new RegExp(`(?:^|\\n)(?:const ${escape(name)}=|function ${escape(name)}\\()`);
      if (!declared.test(result.text)) throw Error(`${file}: 3.6556.2 binding ${name} not found`);
    }
    for (const feature of features) expectFeature(result.text, file, feature);
    return result;
  }
  const raw = async file => (await readSource(file, { base })).text;

  // ---- settings menu (c224804cc B V H ae oe U W) ----
  const settingsFile = 'c224804cc-Ct9XIdre.js', settingsRaw = await raw(settingsFile);
  for (const [alias, local, from] of [['Ha', 't', vendorFrame], ['so', 'o', vendorFrame], ['Xc', 'u', frameFile],
    ['RS', '_', 'shared-0-DDOOdL6P.js'], ['p', 'w', 'vendor-intl-DYfox5Co.js'], ['i', 'k', 'ca5db7aaf-qq5selW3.js']])
    expectImport(settingsRaw, settingsFile, alias, local, from);
  const settings = await pick(settingsFile, ['B', 'V', 'H', 'ae', 'oe', 'U', 'W'], [
    'autoOpenFiles:"Auto-open files Claude writes"', 'showAnnotationTools:"Show annotation tools"', 'let $=J9(149)',
    '{label:q.autoOpenFiles,checked:e,checkedRole:"checkbox",keepOpen:!0,onSelect:t}', '"data-preview-settings-menu":!0',
    looseFeature('t(k,{sections:a,onOpenChange:r,paneName:i,unroll:!1,disabled:n.disabled})'),
    'id:"jp9NW95hOO"', 'id:"5LIyxTSh0P"', 'confirmVariant:"danger"']);
  // 3.6556.2 dropped the Export and Color scheme rows from this menu.
  if (/onExport|onColorScheme|colorScheme:/.test(settings.text)) throw Error(`${settingsFile}: the 3.6556.2 settings menu is expected to carry no Export/Color scheme rows`);
  await adapter('preview-settings-menu.mjs', `// Original Claude Desktop 3.6556.2 Preview settings sections (c224804cc ae), menu (U) and clear-data dialog (W);
// host supplies the pane menu, the stable optional callback, the confirmation dialog and intl.
import {memo as o} from 'react';
import {jsx as t} from 'react/jsx-runtime';
${helperImport(settings.text)}
export function createPreviewSettingsMenu({useOptionalStable:_,PaneMenu:k,ConfirmDialog:u,useIntl:w}) {
${settings.text}
return {Menu:U,useSections:ae,ClearDataDialog:W,labels:B};
}`, [settings.source], version);

  // ---- pane menu (ca5db7aaf) ----
  const paneFile = 'ca5db7aaf-qq5selW3.js', paneRaw = await raw(paneFile);
  for (const [alias, local, from] of [['Ha', 't', vendorFrame], ['Ua', 'n', vendorFrame], ['Va', 'r', vendorFrame], ['Ya', 'i', vendorFrame],
    ['so', 'o', vendorFrame], ['wo', 's', vendorFrame], ['Eu', 'c', frameFile], ['Id', 'l', frameFile], ['Iu', 'u', frameFile],
    ['Jo', 'd', frameFile], ['Kl', 'f', frameFile], ['Nd', 'p', frameFile], ['p', 'g', 'vendor-intl-DYfox5Co.js'],
    ['Sn', '_', 'shared-18-D3y8YMFN.js'], ['xr', 'y', 'shared-156-BLTosN8U.js']])
    expectImport(paneRaw, paneFile, alias, local, from);
  expectFeature(paneRaw, paneFile, /export\{[^}]*(?<![\w$])H as i,/);
  const pane = await pick(paneFile, ['P', 'F', 'H', 'U', 'W', 'G', 'K', 'q', 'J', 'Y', 'X', 'Z', 'Q', 'ee'], [
    'function P(e){y(e.target)||e.preventDefault()}', 'F=[]', 'let $=J9(31)', 'defaultMessage:"{pane} settings",id:"0v5PlsRKXz"',
    'icon:"DotsVertical"', 'onContextMenu:P,side:"bottom",align:"end"', 'G=10.5', 'maxVisibleItems:G', 'd.SearchablePopup',
    '"px-md py-sm text-footnote text-muted-as-secondary"', 'Symbol.for("react.early_return_sentinel")']);
  if (/className:c/.test(pane.text.slice(pane.text.indexOf('const H='), pane.text.indexOf('function U(')))) throw Error(`${paneFile}: the 3.6556.2 pane menu is expected to take no className`);
  await adapter('preview-pane-menu.mjs', `// Original Claude Desktop 3.6556.2 pane menu trigger (ca5db7aaf H), sections (U) and rows (Z, searchable J/X);
// host supplies the Menu/Button/Tooltip primitives, intl, the portal container, the owner window and the DOM probes.
import {memo as o,useState as s,Fragment as i} from 'react';
import {jsx as t,jsxs as n,Fragment as r} from 'react/jsx-runtime';
${helperImport(pane.text)}
import {menuCollisionPadding as _} from '../code-composer/menu-collision-padding.mjs';
export function createPreviewPaneMenu({Menu:d,Button:c,Tooltip:f,useIntl:g,usePortal:l,isTextInput:y,asElement:u,useOwnerWindow:p}) {
${pane.text}
return {Menu:H,Sections:U};
}`, [pane.source], version);

  // ---- link destination chooser (cf700d36e p) + arming delay (cebf5596d n r) ----
  const chooserFile = 'cf700d36e-BRuz1Q_U.js', chooserRaw = await raw(chooserFile);
  for (const [alias, local, from] of [['Ha', 't', vendorFrame], ['Ua', 'n', vendorFrame], ['_o', 'ee', vendorFrame], ['so', 'r', vendorFrame],
    ['wo', 'i', vendorFrame], ['Ju', 'a', frameFile], ['Xc', 'te', frameFile], ['Zu', 'ne', frameFile], ['od', 'o', frameFile], ['yt', 's', frameFile],
    ['p', 're', 'vendor-intl-DYfox5Co.js'], ['n', 'c', 'ce61829b3-DZ5WodUS.js'], ['r', 'l', 'ce61829b3-DZ5WodUS.js'], ['bt', 'u', 'c03935b01-yhcY34vt.js'],
    ['t', 'd', 'c8ae173c6-DhxlbTId.js'], ['t', 'ie', 'cebf5596d-q9cCbs9l.js']])
    expectImport(chooserRaw, chooserFile, alias, local, from);
  const chooser = await pick(chooserFile, ['p'], ['let $=J9(57)', 'id:"SW2I2RenJ7"', 'id:"oqpJZ5fC7z"', 'initialFocus:"cancel"',
    'className:"epitaxy-root break-words"', '"text-caption text-muted-as-secondary"', 'let A=ie(r&&_,h)', 'P=te']);
  const armFile = 'cebf5596d-q9cCbs9l.js', armRaw = await raw(armFile);
  for (const [alias, local] of [['ho', 'e'], ['wo', 't']]) expectImport(armRaw, armFile, alias, local, vendorFrame);
  expectFeature(armRaw, armFile, /export\{n as t\}/);
  const arm = await pick(armFile, ['n', 'r'], ['setTimeout(()=>o(!0),500)', 'return e+1']);
  await adapter('preview-link-chooser.mjs', `// Original Claude Desktop 3.6556.2 link destination chooser (cf700d36e p) and input arming delay (cebf5596d n);
// host supplies the radio group, confirmation dialog, icon, shortcut/platform, intl and the two preference stores.
import {useId as ee,useState as i,memo as r} from 'react';
import {jsx as t,jsxs as n} from 'react/jsx-runtime';
import {useState as armState,useEffect as armEffect} from 'react';
${helperImport(`${chooser.text}\n${arm.text}`)}
const ie=(()=>{const e=armEffect,t=armState;
${arm.text}
return n;})();
export function createPreviewLinkChooser({RadioGroup:s,useShortcut:a,Icon:o,ConfirmationDialog:te,platform:ne,useIntl:re,
 useChooserSeen:c,useLinksPreference:l,useModalPresence:u,useBrowserLabel:d}) {
${chooser.text}
return p;
}`, [chooser.source, arm.source], version);

  // ---- radio card (shared-frame sV cV, description class kS/Mt) ----
  const frameRaw = await raw(frameFile);
  // X forwardRef, be useId, b jsx, G jsxs; _ (Km, Base UI labelable provider) and Qe (Ng, Base UI radio) are host parts.
  for (const [alias, local] of [['io', 'X'], ['_o', 'be'], ['Ha', 'b'], ['Ua', 'G'], ['Ft', '_'], ['nt', 'Qe']]) expectImport(frameRaw, frameFile, alias, local, vendorFrame);
  expectFeature(frameRaw, frameFile, /export\{[^}]*(?<![\w$])Q as Hf,/);
  const radioClasses = await pick(frameFile, ['Mt', 'kS'], ['Mt="text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]"', 'kS=`text-footnote leading-snug ${Mt}`']);
  const radio = await pick(frameFile, ['sV', 'cV'], ['sV="cds-reset group/rd flex w-full items-start gap-md rounded-card border', 'let $=J9(35)',
    'm=J0($,0)?K0($,0,qs(void 0)):$[0]', 'b(iV,{topAlign:!0})', 'className:kS', '"aria-labelledby":d', 'u?b(_,{children:E}):E']);
  await adapter('preview-link-radio.mjs', `// Original Claude Desktop 3.6556.2 CDS radio-card layout (shared-frame cV). Radio semantics, the indicator, the
// field-wrap probe (qS) and the mouse-down guard (qs) belong to the local host; the field wrapper (_) is a Fragment
// because the host renders no CdsField (qS is false).
import {forwardRef as X,useId as be,Fragment as _} from 'react';
import {jsx as b,jsxs as G} from 'react/jsx-runtime';
${helperImport(radio.text, ['cdsClassNames as Q'])}
${radioClasses.text}
export function createPreviewLinkRadio({Radio:Qe,Indicator:iV,useWrap:qS,onMouseDown:qs}) {
${radio.text}
return cV;
}`, [radio.source, radioClasses.source], version);

  // ---- Allowed sites dialog (w12b-terminal-preview-tabs TPT-5): c36734a81 P (compiled) over the card M and the list S,
  // with the row sizes v/ee, the default labels y/j, the focus fallback b, the host label x and the title class hook
  // c4e7cbfa9 t. 3.6556.2 renders it in CdsDialog (Zc) as an unstyled popup holding a CdsSurface popover (Dl), not the
  // 2.31226.0 dialog shell; c25b1be4a (the container over the desktop bridge) stays the host's SourcePreviewAllowedSites.
  const sitesFile = 'c36734a81-CAUg1TAj.js', sitesRaw = await raw(sitesFile);
  for (const [alias, local, from] of [['Ba', 'e', vendorFrame], ['Co', 't', vendorFrame], ['Ha', 'n', vendorFrame], ['Ia', 'r', vendorFrame],
    ['Ua', 'i', vendorFrame], ['_o', 'a', vendorFrame], ['bo', 'o', vendorFrame], ['ho', 's', vendorFrame], ['so', 'c', vendorFrame], ['wo', 'l', vendorFrame],
    ['Dl', 'u', frameFile], ['Eu', 'd', frameFile], ['Qc', 'f', frameFile], ['Td', 'p', frameFile], ['Zc', 'm', frameFile], ['yd', 'h', frameFile],
    ['Yo', 'g', 'shared-4-DUB1Oi0O.js'], ['t', '_', 'c4e7cbfa9-DST98yAi.js']])
    expectImport(sitesRaw, sitesFile, alias, local, from);
  expectFeature(sitesRaw, sitesFile, /export\{b as n,P as t\}/);
  // A is `async function A(e,t)` (the clear-all pending wrapper), which pick's declaration check does not read.
  const clearPending = await originalBindings(sitesFile, ['A'], { base });
  expectFeature(clearPending.text, sitesFile, 'async function A(e,t){t(!0);try{await e()}catch{}finally{t(!1)}}');
  const sites = await pick(sitesFile, ['v', 'ee', 'y', 'b', 'x', 'S', 'C', 'w', 'T', 'E', 'D', 'O', 'k', 'j', 'M', 'N', 'P', 'F', 'I'], [
    'ee={row:"h-7 rounded-[6px]",remove:"base",field:"h-7 rounded-[6px]",add:"sm"}', 'B=g("panels")&&R==="comfortable"?v:ee', 'dir:"ltr",id:I',
    '"aria-label":q.remove(r,t.caption)', 'has-[input:focus-visible]:shadow-focus', 'O=u,P="popover",F=`flex min-h-0 w-[400px] max-w-full flex-col ${a??""}`',
    'B="flex min-h-0 w-full flex-col gap-[20px] p-[16px] font-normal"', 'className:"m-0 text-heading-semibold text-primary"',
    'n(m.Popup,{unstyled:!0,initialFocus:g,className:`fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col max-w-[calc(100vw-2rem)] ${f} transition-[opacity,scale,filter] duration-base ease-out motion-reduce:transition-none data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98] outline-none draggable-none`',
    '!e&&!o&&!c&&!u&&a()']);
  const titleFile = 'c4e7cbfa9-DST98yAi.js', titleRaw = await raw(titleFile);
  expectImport(titleRaw, titleFile, 'og', 'e', 'shared-52-uHFNjl7C.js');
  expectFeature(titleRaw, titleFile, /export\{t\}/);
  const title = await pick(titleFile, ['t'], ['return e("type")?t.replace("text-heading-semibold","text-heading"):t']);
  await adapter('preview-allowed-sites.mjs', `// Original Claude Desktop 3.6556.2 Allowed sites dialog (c36734a81 P over M and S) and its focus fallback (b); the
// host container (src/source-preview-allowed-sites.jsx, c25b1be4a's place) passes the entries, the draft and the callbacks.
import {useRef as t,useId as a,useLayoutEffect as o,useEffect as s,memo as c,useState as l} from 'react';
import {jsx as n,jsxs as i} from 'react/jsx-runtime';
${helperImport(sites.text, ['CdsSurface as u', 'CdsButton as d', 'cdsDialogViewportMaxHeightClass as f', 'useCdsDensity as p', 'CdsDialog as m', 'CdsRoot as h'])}
import {clsx as e,useDirection as r} from '${viewTabs}/${vendorFrame}';
import {isFizzyLakePartEnabled as g} from '${viewTabs}/shared-4-DUB1Oi0O.js';
import {isFizzyLakePartOptedIn as titleTypePart} from '${viewTabs}/shared-52-uHFNjl7C.js';
const _=(()=>{const e=titleTypePart;
${title.text}
return t;})();
${clearPending.text}
${sites.text}
export {P as PreviewAllowedSitesDialog,b as focusAllowedSitesFallback,x as allowedSiteHost};`, [sites.source, title.source], version);
}
