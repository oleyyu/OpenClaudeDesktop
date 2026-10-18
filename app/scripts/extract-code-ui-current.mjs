// Small source-owned helpers from the current installed renderer.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
const root = path.resolve(import.meta.dirname, '..');
const source = path.resolve(root, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-current');
const latestSource = path.resolve(root, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
// R2-btw NBS-1: the 2.42304.0 main-process chunks (the snapshot has no ion-dist/desktop; they ship in the asar build).
const latestDesktop = path.resolve(root, '../reference/installed-2.42304.0-20261017/asar/.vite/build');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// `only` limits a run to the listed targets so parallel migration lanes can regenerate or check their own helpers
// while other lanes edit theirs. Skipped targets keep their existing manifest entry in its emit position, so a
// partial run writes the same manifest a full run would. Writes are serialized with a directory lock.
export async function extractCurrentCodeHelpers(options = {}) {
  if (options.check) return extractHelpers(options);
  const lock = path.join(output, '.extract-lock');
  await fs.mkdir(output, { recursive: true });
  for (let waited = 0; ; waited += 250) {
    try { await fs.mkdir(lock); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = await fs.stat(lock).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 180_000) { await fs.rm(lock, { recursive: true, force: true }); continue; }
      if (waited > 600_000) throw Error(`Timed out waiting for ${lock}`);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  try { return await extractHelpers(options); } finally { await fs.rm(lock, { recursive: true, force: true }); }
}
async function extractHelpers({ check = false, only = null } = {}) {
  const manifest = { referenceVersion: '2.37337.1', modules: [] };
  const selected = target => !only || only.has(target);
  const previous = only ? new Map(JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8').catch(() => '{"modules":[]}')).modules.map(entry => [entry.target, entry])) : new Map();
  const mismatches = [];
  async function emit(prefix, target, names, imports, exports, directory = source, selections = {}) {
    if (!selected(target)) { if (previous.has(target)) manifest.modules.push(previous.get(target)); return; }
    const candidates = (await fs.readdir(directory)).filter(name => prefix.endsWith('.js') ? name === prefix : name.startsWith(prefix + '-') && name.endsWith('.js'));
    if (candidates.length !== 1) throw Error(`Ambiguous source ${prefix}`);
    const name = candidates[0], bytes = await fs.readFile(path.join(directory, name));
    const code = await format(bytes.toString(), { parser: 'babel' });
    const ast = parsers.babel.parse(code, {});
    const selectedFragments = [];
    const blocks = names.map(name => {
      if (selections[name]) {
        const config = selections[name];
        const declaration = ast.program.body.find(node => node.id?.name === name) ?? ast.program.body.flatMap(node=>node.declarations??[]).find(node=>node.id?.name===name);
        if (!declaration) throw Error(`Missing selection owner ${name}`);
        const matches = [];
        const visit = node => {
          if (!node || typeof node !== 'object') return;
          if (config.local && node.type === 'VariableDeclarator' && node.id.name === config.local) matches.push(config.direct ? node.init : node.init.arguments[0].body);
          if (config.call && node.type==='CallExpression' && node.callee.name===config.call && node.arguments[0]?.name===config.argument) matches.push(node);
          if (config.assignment && node.type==='AssignmentExpression' && node.left.name===config.assignment) matches.push(node.right);
          if (config.test && node.type === 'ConditionalExpression' && code.slice(node.test.start, node.test.end) === config.test && (!config.callee || node.consequent.callee?.name === config.callee)) matches.push(node.consequent);
          for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
        };
        visit(declaration);
        if (matches.length !== 1) throw Error(`Ambiguous ${name} branch ${config.test}`);
        const fragment = code.slice(matches[0].start, matches[0].end);
        selectedFragments.push({ binding: name, ...(config.test ? {test:config.test,callee:config.callee} : config.call ? {call:config.call,argument:config.argument} : config.assignment ? {assignment:config.assignment} : {local:config.local,...(config.direct?{direct:true}:{})}), fragmentSha256: sha(fragment), parameters: config.parameters });
        return `function ${name}(${config.parameters}) { return ${fragment}; }`;
      }
      for (const node of ast.program.body) {
        if (node.id?.name === name) return code.slice(node.start, node.end);
        const d = node.declarations?.find(d => d.id.name === name);
        if (d) return `var ${code.slice(d.start, d.end)};`;
      }
      throw Error(`Missing ${name} in ${prefix}`);
    });
    const referenceVersion = [latestSource, latestDesktop].includes(directory) ? '2.42304.0' : '2.37337.1';
    const text = await format(`// Original Claude Desktop ${referenceVersion} bindings; generated by extract-code-ui-current.mjs.\n${imports}\n${blocks.join('\n')}\n${exports}`, { parser: 'babel' });
    manifest.modules.push({ ...(referenceVersion === '2.42304.0' ? {referenceVersion} : {}), source: path.relative(source, path.join(directory, name)), sourceSha256: sha(bytes), target, sha256: sha(text), bindings: names, ...(selectedFragments.length ? { sourceSelections: selectedFragments } : {}) });
    if (check) { if (await fs.readFile(path.join(output, target), 'utf8').catch(() => null) !== text) mismatches.push(`Current Code helper mismatch: ${target}`); }
    else { await fs.mkdir(path.dirname(path.join(output, target)), { recursive: true }); await fs.writeFile(path.join(output, target), text); }
  }
  if (!check) await fs.mkdir(output, { recursive: true });
  // csv-parse and its Buffer shim are self-contained: retain the shipped bytes.
  // R2-files FT-01: read from 2.42304.0 (the chunk is byte-identical to 2.37337.1's c63ad9d34-BwRS70iU.js).
  const csvVendorName = 'c63ad9d34-BwRS70iU.js';
  if (selected('csv-parser-vendor.mjs')) {
    const csvVendor = await fs.readFile(path.join(latestSource, csvVendorName));
    manifest.modules.push({ referenceVersion: '2.42304.0', source: path.relative(source, path.join(latestSource, csvVendorName)), sourceSha256: sha(csvVendor), target: 'csv-parser-vendor.mjs', sha256: sha(csvVendor), bindings: [], transform: 'byte-for-byte' });
    if (check) { if (!csvVendor.equals(await fs.readFile(path.join(output, 'csv-parser-vendor.mjs')).catch(() => Buffer.alloc(0)))) mismatches.push('Current CSV parser vendor mismatch'); }
    else await fs.writeFile(path.join(output, 'csv-parser-vendor.mjs'), csvVendor);
  } else if (previous.has('csv-parser-vendor.mjs')) manifest.modules.push(previous.get('csv-parser-vendor.mjs'));
  // R2-files FT-01: pure renames to 2.42304.0 (binding-map-code-current.json, every binding identical).
  await emit('c02d6193d-C2yr-dVD.js', 'csv-parser.mjs', ['n','r','i','a','o','s','c','l','u','d','f','p','m'], "import { n as e, t } from './csv-parser-vendor.mjs';", 'export { m as parseCsvPreview };', latestSource);
  await emit('shared-78', 'string-count.mjs', ['Hv'], '', 'export { Hv as countOccurrences };', latestSource);
  await emit('shared-2', '../../../electron/generated/string-grapheme-limit.mjs', ['EI','DI','AI'], '', 'export { AI as graphemeSafeLimit };', latestSource);
  // R2-btw NBS-1: pure renames to 2.42304.0 (identical after identifier normalisation). Import aliases follow the new
  // chunks: c73f45bc3 `Do as qt` = shared-2 AI, c5259f582 `Co as e` = vendor-frame W = useState, cccc2cf0a
  // `Af as M` = shared-25 fp. Export names stay.
  await emit('c73f45bc3', '../../../electron/generated/btw-title.mjs', ['Su','Cu','Tu','Du'], "import {graphemeSafeLimit as qt} from './string-grapheme-limit.mjs';", 'export { Su as btwTitleLimit, Cu as btwTitlePrefix, Tu as btwTitle, Du as btwTitleWords };', latestSource);
  await emit('c5259f582', 'btw-focus-intent.mjs', ['H','de','U','W','G','fe','K','me'], "import {useState as e} from 'react';", 'export {fe as captureBtwFocus,K as rememberBtwFocus,me as useBtwFocusIntent};', latestSource);
  await emit('shared-25', 'owner-document.mjs', ['cp','lp','fp'], '', 'export {fp as ownerDocument};', latestSource);
  await emit('cccc2cf0a', 'pane-focus-owner.mjs', ['ey'], "import {ownerDocument as M} from './owner-document.mjs';", 'export {ey as paneOwnsFocus};', latestSource);
  await emit('shared-25', 'owner-window.mjs', ['cp','lp','up','dp'], '', 'export {up as ownerWindow,dp as ownerWindowOrGlobal};', latestSource);
  await emit('shared-18', 'sidebar-row-primitive.mjs', ['DE','IE','wE'], "import {jsx as b} from 'react/jsx-runtime';", 'export {DE as sidebarFocusClass,IE as SidebarRowButton,wE as sidebarHitRowClass};', latestSource);
  // R2-sidebar SG-2: no second CDS copy. Base UI mergeProps (vendor-frame Kt) and clsx (ge, which the sidebar chunks
  // import as their class joiner; not the twMerge cdsClassNames X) and the 2.42304.0 density context (la), Badge (cs)
  // and Pulse (eN) are re-exported from view-tabs, so the sidebar Badge reads the same context as CdsButton.
  await emit('vendor-frame-DfPJ1QmD.js', 'cds-merge-props.mjs', [], '', "export {mergeProps as mergeCdsProps,clsx as cdsClassNames} from '../view-tabs/vendor-frame-DfPJ1QmD.js';", latestSource);
  await emit('shared-frame-BfjMqbuN.js', 'cds-badge.mjs', [], '', "export {CdsDensityContext as CdsBadgeDensity,CdsBadge as CurrentCdsBadge,CdsPulse as CurrentPulse} from '../view-tabs/shared-frame-BfjMqbuN.js';", latestSource);
  // R2-sidebar: pure renames (binding-map-code-current.json, every binding identical) now read 2.42304.0. Export names
  // stay; only minified locals and import aliases change. CDS pieces come straight from view-tabs semantic names.
  await emit('shared-3', 'sidebar-upgrade-badge.mjs', ['CP'], "import {jsx as _} from 'react/jsx-runtime'; import {clsx as M} from '../view-tabs/vendor-frame-DfPJ1QmD.js'; import {StartMessage as X} from '../../source-code-start-adapters.jsx';", 'export {CP as SidebarUpgradeBadge};', latestSource);
  await emit('shared-21', 'sidebar-nav-badge.mjs', ['AG','MG','NG','PG','FG'], `
    import {jsx as _} from 'react/jsx-runtime';
    import {CdsBadge as _f} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {SidebarUpgradeBadge as Yf} from './sidebar-upgrade-badge.mjs';
    import {clsx as N} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
    const wp=messages=>messages;
  `, 'export {FG as SidebarNavBadge};', latestSource);
  await emit('shared-8', 'sidebar-session-state.mjs', ['T_','D_'], '', 'export {T_ as resolveSessionDisplayState,D_ as sessionNeedsAttention};', latestSource);
  await emit('shared-18', 'sidebar-pr-model.mjs', ['IT','LT','zT','BT','WT','GT','QT'], '', 'export {IT as resolvePrState,LT as prStateOrder,BT as prWebUrl,GT as aggregatePullRequests,QT as pullRequestEntries};', latestSource);
  await emit('shared-18', 'sidebar-pr-icon.mjs', ['Yw','Xw','Zw','eT','GR'], `
    import {jsx as b} from 'react/jsx-runtime';
    import {SidebarCdsIcon as Yd} from '../../source-sidebar-current-adapters.jsx';
    const X=messages=>messages;
  `, 'export {Yw as sidebarPrAppearance,Zw as sidebarPrStateLabel,eT as SidebarPrIcon,GR as sidebarPreviewCollisionPadding};', latestSource);
  // R2-sidebar map-cc-sidebar / SC-4: shared-20 PR card from 2.42304.0 (old Mw…hT -> _E…eD). Changed: bE wraps the icon
  // behind isFizzyLakePartEnabled("panels") (view-tabs shared-4 jf; the shipped part list is empty, so off) and uses
  // text-start; SE/wE add dir="ltr", match-parent title alignment and text-muted-as-secondary; OE adds selfHosted; ZE
  // pads with ps/pe over --df-pr-glyph/--df-heading-pitch and sizes the icon explicitly (12, not bold). Fragment is no
  // longer used. The popup side is the original shared-28 Pm (sidebar-resize physicalSide); `p` stays the host's
  // document-dir answer for vendor-frame Td, since no DirectionContext wraps the sidebar.
  await emit('shared-20', 'sidebar-pr-card.mjs', ['_E','vE','yE','bE','xE','SE','CE','wE','TE','OE','AE','jE','ME','NE','VE','HE','UE','WE','GE','KE','qE','JE','YE','XE','ZE','eD'], `
    import {createContext as _,useContext as g,useEffect as x,useState as o,cloneElement as i} from 'react';
    import {jsx as f,jsxs as s} from 'react/jsx-runtime';
    import {CdsPreviewCard as Rt} from '../view-tabs/shared-156-Bikz018e.js';
    import {cdsClassNames as ic} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {clsx as k} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {isFizzyLakePartEnabled as W} from '../view-tabs/shared-4-CJsHhp5n.js';
    import {physicalSide as Ec} from '../sidebar-resize/logical-side.mjs';
    import {SidebarPrIcon as Il,sidebarPrAppearance as zl,sidebarPrStateLabel as jl,sidebarPreviewCollisionPadding as Kl} from './sidebar-pr-icon.mjs';
    import {SidebarCdsIcon as Bs,useSidebarOverlayState as U} from '../../source-sidebar-current-adapters.jsx';
    import {useStartIntl as Y} from '../../source-code-start-adapters.jsx';
    import {SourceTooltip as Us} from '../../source-tooltip.jsx';
    import {useSidebarStatusTooltips as Gc} from './sidebar-status-glyph.mjs';
    const Ac=messages=>messages;
    const p=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
  `, 'export {TE as SidebarPrCardContext,OE as sidebarPrMessages,NE as sidebarPrEntryLabel,UE as SidebarPrEntry,YE as SidebarPrCard,XE as sidebarPrCoveredControl,ZE as SidebarPrGlyph,eD as sidebarPrTitle,GE as SidebarDetailTooltip};', latestSource);
  await emit('shared-104', 'sidebar-remote-name.mjs', ['ez'], '', 'export {ez as sidebarRemoteName};', latestSource);
  await emit('shared-78', 'sidebar-environment-copy.mjs', ['LX'], 'const sa=messages=>messages;', 'export {LX as sidebarEnvironmentMessages};', latestSource);
  // R2-sidebar map-cc-sidebar: shared-20 row details from 2.42304.0. fD (old DT) tells a self-hosted runner pool from
  // cloud through the new tT place (session environment_id / self_hosted_runner_pool_id, or the pending cloud worker);
  // the view adds the selfHosted glyph/label and moves its muted text to text-muted-as-secondary.
  await emit('shared-20', 'sidebar-details-model.mjs', ['PE','FE','IE','uD','dD','tT','fD','pD'], `
    import {environmentBasename as Fa} from '../../../electron/generated/environment-basename.mjs';
    import {sidebarRemoteName as co} from './sidebar-remote-name.mjs';
  `, 'export {IE as sidebarDescription,uD as sidebarFolder,dD as sidebarBranch,fD as sidebarEnvironment,pD as sidebarRemoteEnvironment,tT as sidebarEnvironmentPlace};', latestSource);
  await emit('shared-20', 'sidebar-details-view.mjs', ['DE','kE','zE','BE','QE','$E','nD'], `
    import {jsx as f,jsxs as s} from 'react/jsx-runtime';
    import {clsx as k} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {useStartIntl as Y} from '../../source-code-start-adapters.jsx';
    import {SidebarCdsIcon as Bs} from '../../source-sidebar-current-adapters.jsx';
    import {SidebarPrGlyph as ZE,SidebarDetailTooltip as GE,sidebarPrMessages as OE} from './sidebar-pr-card.mjs';
    import {sidebarEnvironmentMessages as si} from './sidebar-environment-copy.mjs';
  `, 'export {BE as SidebarDescription,QE as SidebarEnvironmentGlyph,$E as sidebarEnvironmentLabel,nD as sidebarRightDecoration};', latestSource);
  // R2-sidebar map-cc-sidebar: shared-18 status glyph from 2.42304.0. PD (old zE) inlines the three CDS colors, so the
  // host token table `wd` is gone; the Pulse is the view-tabs CdsPulse (shared-frame eN) by its semantic name. UD (the
  // error mark) comes from its own adapter module so this glyph never imports the row-details view (see that file).
  await emit('shared-18', 'sidebar-status-glyph.mjs', ['CT','TT','jT','MT','PT','fE','pE','uE','TD','ED','DD','PD','FD','ZD'], `
    import {createContext as T,useContext as w} from 'react';
    import {jsx as b} from 'react/jsx-runtime';
    import {useStartIntl as Q} from '../../source-code-start-adapters.jsx';
    import {SourceTooltip as Qd} from '../../source-tooltip.jsx';
    import {CdsPulse as xf} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {NestedStatusDot as ND,synchronizeStatusAnimation as G_} from './nested-session-parts.mjs';
    import {SidebarCodeErrorGlyph as UD} from '../../source-sidebar-error-adapters.jsx';
    const X=messages=>messages;
  `, 'export {ED as SidebarStatusLabel,DD as sidebarStatusMessages,ZD as SidebarStatusGlyph,uE as SidebarStatusLayout,fE as SidebarStatusTooltips,pE as useSidebarStatusTooltips,PT as sidebarErrorKind,jT as sidebarErrorShapes,MT as sidebarErrorColors};', latestSource);
  await emit('shared-18', 'sidebar-fade-label.mjs', ['RE','BE','VE','UE','WE','GE','KE','qE','JE','YE','XE','ZE','QE','$E','rD','iD','aD'], `
    import {createContext as T,useContext as w,useRef as y,useCallback as N,useLayoutEffect as I} from 'react';
    import {jsx as b} from 'react/jsx-runtime';
    import {classNames as L} from '../../source-chat-adapters.jsx';
    import {SourceTooltip as Qd} from '../../source-tooltip.jsx';
    import {useSidebarStatusTooltips as pE} from './sidebar-status-glyph.mjs';
    import {useSidebarLabelInteraction as uf} from '../../source-sidebar-current-adapters.jsx';
    import {ownerWindow as ce,ownerWindowOrGlobal as pe} from './owner-window.mjs';
    const x=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
    const wp=(side,dir)=>side==='inline-end'?(dir==='rtl'?'left':'right'):side;
  `, 'export {aD as SidebarFadeLabel,iD as observeSidebarLabelOverflow,WE as sidebarLabelOverflows,UE as SidebarLabelMenuOpen,BE as sidebarDecorationMinimum,VE as sidebarDecorationProperty};', latestSource);
  await emit('shared-18', 'sidebar-row-view.mjs', ['EE','OE','kE','AE','jE','ME','NE','PE','FE','LE','zE','HE','eD','tD','nD','oD','sD'], `
    import {useState as m,useReducer as F,useRef as y,useLayoutEffect as I,useImperativeHandle as S,isValidElement as O,cloneElement as f,useContext as w} from 'react';
    import {jsx as b,jsxs as g,Fragment as p} from 'react/jsx-runtime';
    import {cva as h} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {CdsButton as cf} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {SidebarStatusLayout as uE} from './sidebar-status-glyph.mjs';
    import {useEventCallback as fn} from '../view-tabs/shared-0-ByI5P0CP.js';
    import {useMergedRefs as Mp} from '../view-tabs/vendor-all-0-CTKbbUUg.js';
    import {cdsClassNames as L} from './cds-merge-props.mjs';
    import {sidebarFocusClass as DE,SidebarRowButton as IE,sidebarHitRowClass as wE} from './sidebar-row-primitive.mjs';
    import {SidebarFadeLabel as aD,sidebarDecorationMinimum as BE,sidebarDecorationProperty as VE} from './sidebar-fade-label.mjs';
    import {useStartIntl as Q} from '../../source-code-start-adapters.jsx';
    import {SourceShortcut as $d} from '../../source-shortcut.jsx';
    import {SidebarRenameEnhancer as $h} from '../../source-sidebar-current-adapters.jsx';
  `, 'export {LE as CurrentSidebarRow,NE as sidebarRowClasses,PE as useSidebarRename,FE as SidebarRenameInput,nD as SidebarWideDecoration,sD as SidebarRowMoreControl};', latestSource);
  // R2-sessions NBS-8: the Code Sessions page from 2.42304.0 (cbd6c85c8 page gd, old Du). Minified names are reused
  // across versions (old gu/_u/vu/yu/bu were copy; the new ones are the bulk-action gate and actions), so every module
  // exports semantic names.
  await emit('shared-18','sessions-page-band.mjs',['ey'],'','export {ey as sessionsPageBand};',latestSource);
  await emit('shared-20','sessions-page-load-deadline.mjs',['eT'],'','export {eT as sessionsPageLoadDeadline};',latestSource);
  await emit('cbd6c85c8','sessions-page-load-hold.mjs',['iu'],`
    import {useState as i,useRef as o,useLayoutEffect as g,useEffect as f} from 'react';
    import {sessionsPageLoadDeadline as li} from './sessions-page-load-deadline.mjs';
  `,'export {iu as useSessionsPageLoadHold};',latestSource);
  // shared-11 cb reads a chat row's state through shared-8 $l (E_), not the raw liveStatus.
  await emit('shared-8','sessions-page-live-status.mjs',['E_'],'','export {E_ as sessionPageLiveStatus};',latestSource);
  // R3-nested NBS-3: shared-11 pb (exported `ot`; shared-21 Gb filters the sidebar rows, cbd6c85c8 ra the Code page rows)
  // is !scheduledTaskId && !shownInParentTabs && !fb; fb tests a remote row's coordinator tag through shared-8 WR
  // (`pt as ro`, UR = "_coordinator").
  await emit('shared-8','sessions-page-coordinator.mjs',['UR','WR'],'','export {UR as coordinatorSessionTag,WR as isCoordinatorSession};',latestSource);
  await emit('shared-11','sessions-page-model.mjs',['db','Ny','cb','Hy','Vy','fb','pb'], `
    import {compareSidebarUpdated as Ry} from './sidebar-sort-model.mjs';
    import {resolveSessionDisplayState as oo} from './sidebar-session-state.mjs';
    import {sessionPageLiveStatus as za} from './sessions-page-live-status.mjs';
    import {isCoordinatorSession as ro} from './sessions-page-coordinator.mjs';
  `,'export {db as isSessionArchived,Ny as withSessionResponding,cb as sessionPageState,Hy as sessionPageMatches,Vy as sortSessionPageRows,fb as isCoordinatorSessionRow,pb as isListedSession};',latestSource);
  await emit('cbd6c85c8','sessions-page-copy.mjs',['id','ad','od','sd','cd'],'const er=message=>message,tr=messages=>messages;',
    'export {id as sessionsPageMixedTitle,ad as sessionsPageTitle,od as sessionsPageRowKinds,sd as sessionsPageFilterLabels,cd as sessionsPageActiveLabel};',latestSource);
  // The row's chat awaiting label (cbd6c85c8 Fr = shared-18 ts).
  await emit('shared-18','sessions-page-awaiting-label.mjs',['OD'],`
    import {sidebarStatusMessages as DD} from './sidebar-status-glyph.mjs';
  `,'export {OD as sessionsPageAwaitingLabel};',latestSource);
  // Selection status (tabs-status part, title lead) and bulk actions. Code rows are never selectable, so for Code only
  // the closed gate (gu) and the pass-through Nu are reached; Bn and bu are host stand-ins that throw if reached.
  await emit('cbd6c85c8','sessions-page-selection-bar.mjs',['ku','Au','ju','Mu','Nu'],`
    import {jsx as s,jsxs as a} from 'react/jsx-runtime';
    import {clsx as _} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {useStartIntl as nr} from '../../source-code-start-adapters.jsx';
    import {SessionsSelectionCheckbox as Bn} from '../../source-sessions-adapters.jsx';
  `,'export {ku as sessionsPageSelectionClasses,Au as sessionsPageSelectionHiddenClass,Mu as SessionsPageTabsSelectionStatus,Nu as SessionsPageSelectionLead};',latestSource);
  await emit('cbd6c85c8','sessions-page-bulk-actions.mjs',['fu','gu','_u','vu','yu'],`
    import {jsx as s,jsxs as a,Fragment as r} from 'react/jsx-runtime';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {currentSessionsButton as X} from '../../source-sessions-primitives.jsx';
    import {sessionsFeatureGate as C,SessionsBulkMenuUnavailable as bu} from '../../source-sessions-adapters.jsx';
  `,'export {gu as sessionsPageBulkMenuEnabled,_u as SessionsPageBulkActions};',latestSource);
  await emit('cbd6c85c8','sessions-page-tabs.mjs',['gd'],`
    import {jsx as s} from 'react/jsx-runtime';
    import {clsx as _} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {currentSessionsTabs as Oi} from '../../source-sessions-primitives.jsx';
    import {sessionsPageFilterLabels as sd,sessionsPageActiveLabel as cd} from './sessions-page-copy.mjs';
  `,'export {gd as SessionsPageTabs};',latestSource,{gd:{local:'gr',direct:true,parameters:`{surface:L,onSurface:A,replaceSurface:j=()=>{},intl:c,tabsId:ar,panelId:sr,filterLabel:tr,
    selection:J={isActive:false},bulkMenu:Jt=false,countText:lr,selectionHiddenClass:hr,I=['code','archived'],O='code',cr=true,dr=cr&&!J.isActive}`}});
  // R3-nested: gd lr, the "{count} selected" label (values {count: wn}) the tabs show while a selection is active and the
  // title actions show with the bulk gate open.
  await emit('cbd6c85c8','sessions-page-count-text.mjs',['gd'],`
    import {jsx as s} from 'react/jsx-runtime';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
  `,'export {gd as SessionsPageCountText};',latestSource,{gd:{local:'lr',direct:true,parameters:'{selectedCount:wn=0}'}});
  await emit('cbd6c85c8','sessions-page-empty.mjs',['gd'],`
    import {jsx as s} from 'react/jsx-runtime';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
  `,'export {gd as SessionsPageEmpty};',latestSource,{gd:{local:'vr',parameters:`{query:ce,surface:L,U=!!ce,t=true,y=true,S=false}`}});
  await emit('cbd6c85c8','sessions-page-search.mjs',['gd'],`
    import {jsx as s} from 'react/jsx-runtime';
    import {currentSessionsDropdown as Ln} from '../../source-sessions-primitives.jsx';
  `,'export {gd as sessionsPageSearchProps};',latestSource,{gd:{assignment:'br',parameters:`{value:H,onChange:Ut,intl:c,sortItems:_r,sortBy:V='type',hasQuery:U=false,heldQuery:z,
    t=true,x=true,v=false,g='code',be=false,W={}}`}});
  // Page view: the Code page passes t (codeScoped), x (textFirstRows) and the selection hook; the chat/cowork-only
  // locals keep the values gd computes for Code (no selectable rows, closed bulk gate, no recents search).
  await emit('cbd6c85c8','sessions-page-view.mjs',['gd'],`
    import {jsx as s,jsxs as a,Fragment as r} from 'react/jsx-runtime';
    import {clsx as _} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {SessionsPageShell as Wa,currentSessionsButton as X,currentSessionsConfirm as Rn,SessionsCodeScope as ur,
      currentSessionsMenuContext as fs,currentSessionsTable as Ds} from '../../source-sessions-primitives.jsx';
    import {sessionsPageMixedTitle as id,sessionsPageTitle as ad} from './sessions-page-copy.mjs';
    import {SessionsPageTabsSelectionStatus as Mu,SessionsPageSelectionLead as Nu} from './sessions-page-selection-bar.mjs';
    import {SessionsPageBulkActions as _u} from './sessions-page-bulk-actions.mjs';
    // shared-78 vx (Re.recents) titles the non-Code recents page only.
    const Re={};
  `,'export {gd as SessionsPageView};',latestSource,{gd:{call:'a',argument:'Wa',parameters:`{tabs:gr,search:br,loading:yr,surface:L,newHref:w,panelId:sr,tabsId:ar,hasQuery:U,rows:Mt,
    getRowKey:dd,getRowHref:Jn,getRowLabel:Yn,renderContent:Zn,renderActions:er,linkComponent:pd,emptyState:vr,intl:c,selection:J,
    bulkMenu:Jt=false,selectableRows:Wt=[],selectButtonRef:Gt,countText:lr,tabsStatus:pr,selectionLead:mr,selectionHiddenClass:hr,
    t=true,x=true,v=false,g='code',rr=[],ir,cr=true,dr=cr&&!J.isActive,selectedCount:wn=0,Tn=[],_n,En,jn=false,Nn=false,Pn=false,Dn=0,zn,qn,
    G=false,Ue=false,ge=false,W={},fn=null,tn,Qt=()=>{},Y=e=>e.ref.kind!=='code',Ht,h=true,Lt,Nt=false,vt=false,
    kn=null,An=()=>{},Fn={action:'delete',deletable:0,nonDeletable:0},Hn,Bn,$n=null}`}});
  await emit('cbd6c85c8','sessions-page-row.mjs',['_d','vd','yd'],`
    import {memo as p} from 'react';
    import {jsx as s,jsxs as a,Fragment as r} from 'react/jsx-runtime';
    import {useStartIntl as nr,StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {SessionsRowLayout as _s,SessionsDateLayout as gs,SessionsRowRail as ps,SessionsHighlight as Za,
      SessionsArchivedBadge as Ta,SessionsRelativeTime as Xt,currentSessionsBadge as An,findSessionTitleMatch as Sa} from '../../source-sessions-primitives.jsx';
    import {SidebarStatusGlyph as dr,sidebarStatusMessages as vr} from './sidebar-status-glyph.mjs';
    import {isSessionArchived as Yi,sessionPageState as qi} from './sessions-page-model.mjs';
    import {useSessionPageRow as Zi,useSessionPageReadState as pn,sessionPageReadMark as Xi,sessionPageNeedsAttention as Gi} from '../../source-sessions-adapters.jsx';
    import {sessionsPageRowKinds as od} from './sessions-page-copy.mjs';
    import {sessionsPageAwaitingLabel as Fr} from './sessions-page-awaiting-label.mjs';
  `,'export {_d as SessionsPageRow,vd as SessionsPageRowStatus};',latestSource);
  // R2-sidebar: pure renames to 2.42304.0 (old QR/$R/iz/oz -> $R/ez/az/sz; the shuffled locals are binding-map pairs).
  await emit('shared-21', 'sidebar-family-sort.mjs', ['ZR','$R','ez','tz','rz','iz','az','nz','sz','cz'], '', 'export {$R as sidebarFamilyPivot,ez as sidebarFamilyHead,az as orderSidebarFamilies,sz as splitSidebarFamilies};', latestSource);
  await emit('shared-22', 'sidebar-date-pivot.mjs', ['yw'], '', 'export {yw as sidebarLatestFamilyMember};', latestSource);
  await emit('shared-22', 'sidebar-date-groups.mjs', ['fw','pw','_w','vw'], `
    import {sidebarFamilyPivot as Z_,sidebarFamilyHead as Hv} from './sidebar-family-sort.mjs';
    import {sidebarLatestFamilyMember as yw} from './sidebar-date-pivot.mjs';
    import {sidebarCreatedTimestamp as Sp} from './sidebar-sort-model.mjs';
    const Vc=messages=>messages;
  `, 'export {vw as currentSidebarDateGroups};', latestSource);
  await emit('shared-11', 'sidebar-sort-model.mjs', ['Ry','zy','By','Uy'], '', 'export {Ry as compareSidebarUpdated,zy as sidebarCreatedTimestamp,By as compareSidebarCreated,Uy as compareSidebarTitle};', latestSource);
  // R2-sidebar map-cc-sidebar: shared-21 sort order from 2.42304.0. HR (old VR) reverses Name only between two titled
  // rows, so untitled sessions stay last when the order is flipped.
  await emit('shared-21', 'sidebar-sort-order.mjs', ['VR','HR'], `
    import {compareSidebarUpdated as Jy,compareSidebarCreated as sb,compareSidebarTitle as Wy} from './sidebar-sort-model.mjs';
  `, 'export {VR as sidebarDescendingComparators,HR as sidebarAscendingComparators};', latestSource);
  await emit('shared-18', 'sidebar-group-copy.mjs', ['vE'], 'const X=messages=>messages;', 'export {vE as sidebarGroupMessages};', latestSource);
  // R3-sections step 3 (WI-5, sidebar-17): the session-list Group and sort from 2.42304.0 shared-21 oU (old XH), its
  // sessionList branch. The Group by options are oU's `Se` (Custom hidden once the custom-group overlay is on, be = ux()).
  await emit('shared-21', 'sidebar-filter-options.mjs', ['oU'], '', 'export {oU as sidebarCurrentGroupOptions};', latestSource, {oU:{local:'Se',parameters:'{intl:q,statusGrouping:d=true,customDisabled:be=false}'}});
  // The controls (eU lU uU dU sU cU KH qH YH XH hU gU aU CB; old WH $H eU tU aU oU zH BH QH) are one copy: the
  // extract-sidebar-sections.mjs slice the section view menu (shared-22 tO) renders, re-exported here under the names the
  // host imports. 2.42304.0 dropped ZH (Hide / Show all nested sessions) from this menu (now the palette's shared-20 _S),
  // QH became cU (View all, always shown: disabled with a reason, or "Loading…"), sU adds New section… / Reset to
  // defaults, lU adds Name, and uU's clsx is view-tabs' (vendor-frame ge), not cds-merge-props' alias.
  await emit('shared-21-IP-SVetq.js', 'sidebar-filter-controls.mjs', [], '', "export {sidebarFilterMessages,useSidebarSortOptions,SidebarOptionMenu,SidebarSortMenu,focusSidebarAfterRegroup,useSidebarRegroupFocus,SidebarViewAllContext,useSidebarViewAll,SidebarViewAllItem,SidebarViewResetItems,sortAscendingShown,sortAscendingStored,SidebarFilterTrigger,trailingControlClass} from '../sidebar-sections/section-filter-controls.mjs';", latestSource);
  // oU's sessionList branch (`t === "sessionList" ? f(c, …)`) over the CDS Dropdown (view-tabs, the same Base UI menu as
  // the controls'); the host (source-sidebar-filter-current.jsx) passes oU's locals: dt is "not at defaults" (sU atDefaults: !dt).
  await emit('shared-21', 'sidebar-filter-view.mjs', ['oU'], `
    import {jsx as _,jsxs as f,Fragment as c} from 'react/jsx-runtime';
    import {CdsDropdown as X} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {sidebarFilterMessages as eU,SidebarOptionMenu as uU,SidebarSortMenu as dU,SidebarViewResetItems as sU} from './sidebar-filter-controls.mjs';
    import {physicalSide as xp} from '../sidebar-resize/logical-side.mjs';
  `, 'export {oU as CurrentSidebarFilterContent};', latestSource, {oU:{test:'t === "sessionList"',callee:'f',parameters:'{groupOptions:Se,groupBy:ut,onGroupBy:nt,sortOptions:Oe,sortBy:l,onSortBy:rt,ascending:it,onAscending:at,intl:q,direction:o,metadata:Ce,onMetadata:Ye,routinesAvailable:se=false,routines:ne=false,onRoutines:Xe,routinesCopy:ce,emptyGroupsAvailable:de=true,emptyGroups:W,onEmptyGroups:qe,resetAvailable:dt,onReset:ft}'}});
  // R2-sidebar map-cc-sidebar: shared-21 search field from 2.42304.0. zF (old iI) joins the hit-row family
  // (hit-row hit-row-main [--cds-hit-gap-y:10px]) so its click target reaches across the gap below it.
  await emit('shared-21', 'sidebar-search.mjs', ['RF','zF'], `
    import {jsx as _,jsxs as f} from 'react/jsx-runtime';
    import {sidebarFocusClass as Am,SidebarRowButton as Xm} from './sidebar-row-primitive.mjs';
    import {StartIcon as lf,StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {useSidebarSearchIntent as Lg,useSidebarSearchShortcut as Dn,useSidebarShortcutPlatform as pf,sidebarShortcutAria as ff,SidebarSearchShortcut as hf} from '../../source-sidebar-current-adapters.jsx';
  `, 'export {RF as sidebarSearchPlacement,zF as SidebarSearchField};', latestSource);
  // R4g-sidebar SB3 (X7-06): shared-16's K is the CDS Dropdown (`qa as K`, shared-frame EC), the parts of the CDS
  // ContextMenu (iD Item / Separator / Group are EC's) the section header, reorder and blank-area menus put these rows
  // in. The host kit answers EC's parts there and the host SourceMenu inside the host's own SourceSidebarMenu body.
  await emit('shared-16', 'sidebar-menu-groups.mjs', ['ru','iu','au','cu','lu','uu'], `
    import {createContext as p,useContext as f,useEffect as y,useState as r,useCallback as _} from 'react';
    import {jsx as s,jsxs as a} from 'react/jsx-runtime';
    import {SidebarMenuKit as K} from '../../source-sidebar-menu-kit.jsx';
  `, 'export {iu as RegisterSidebarMenuRow,au as SidebarMenuItem,cu as SidebarMenuSection,lu as OrderedSidebarMenuGroups};', latestSource);
  await emit('shared-19', 'sidebar-menu-order.mjs', ['jX','MX'], "import {jsx as x} from 'react/jsx-runtime'; import {OrderedSidebarMenuGroups as rS} from './sidebar-menu-groups.mjs';", 'export {jX as sidebarMenuGroupOrder,MX as SidebarOrderedMenu};', latestSource);
  // R2-sidebar map-cc-sidebar: shared-19 group view from 2.42304.0. uZ (old hY) reads "any collapsed group" through the
  // new sZ, which the 2.42304.0 blank-area Select all (shared-21 bB) also uses; exported for it. le is shared-25 up,
  // the original ownerWindow (old Oe was a host stand-in over ownerDocument).
  await emit('shared-19', 'sidebar-group-view.mjs', ['nZ','oZ','sZ','cZ','lZ','uZ'], `
    import {createContext as O,useContext as D,useState as h,Fragment as p} from 'react';
    import {jsx as x,jsxs as g} from 'react/jsx-runtime';
    import {SidebarMenuItem as iS} from './sidebar-menu-groups.mjs';
    import {StartMessage as X} from '../../source-code-start-adapters.jsx';
    import {ownerWindow as le} from './owner-window.mjs';
  `, 'export {nZ as SidebarListContext,oZ as sidebarGroupToggles,sZ as sidebarHasCollapsedGroups,cZ as sidebarToggleVisible,lZ as sidebarPrecedingToggles,uZ as SidebarGroupViewItems};', latestSource);
  // R3-sidebar2 (cov7-02): session cycling from 2.42304.0 shared-16 qp (exported `G`): Jp (modifier keys), Yp (the
  // focus guard: Kp composer / Gp listbox selectors, jf over Mf), am (ctrl_tab / cmd_shift_bracket / alt_arrow), Xp / Zp /
  // Qp (row-key resume), $p / em (alias rows, data-cycle-expands-group), tm / nm (the list and the selected row's
  // neighbour), rm (expand the folded group a step lands in), im (open a row button, its group expanded first), and qp's
  // own step position `p` (the aria-current skip). Imports, by the chunk's import table: shared-1 fd / td = tg / fg (Fe /
  // Ge), shared-156 Cr / wr = HB / WB (Ye / $e) and Eh = pf (Xe), shared-9 vt = km (wi), shared-7 N = XM (bi), shared-78
  // kw = Wa (xt, generated as surface-chord-platform), shared-frame vl = lc (pr, dom-owner), vendor-frame Ca = flushSync
  // (n). shared-52 If (W, the dframe store) is the host's folded-group state (src/session-cycle-adapters.mjs); qp's
  // `tm` is the host's list (a parameter, so the host can hand in its own DOM form of tm).
  await emit('shared-1', 'session-cycle-composer.mjs', ['tg','lg','fg'], '', 'export {tg as chatInputTestId,fg as codePromptInputSelector};', latestSource);
  await emit('shared-156', 'session-cycle-focus.mjs', ['BB','HB','WB','ff','pf'], '', 'export {HB as activeElementHops,WB as anyActiveElementHop,pf as asProgrammaticClick};', latestSource);
  await emit('shared-9', 'session-cycle-claims.mjs', ['Dm','Om','km'], '', 'export {Om as claimComposerArrowKeys,km as composerClaimsArrowKeys};', latestSource);
  await emit('shared-7', 'session-cycle-terminal.mjs', ['XM'], '', 'export {XM as terminalHasFocus};', latestSource);
  await emit('shared-16', 'session-cycle-chords.mjs', ['Wp','Gp','Kp','Jp','Mf','jf','Yp','am'], `
    import {chatInputTestId as Fe,codePromptInputSelector as Ge} from './session-cycle-composer.mjs';
    import {activeElementHops as Ye,anyActiveElementHop as $e} from './session-cycle-focus.mjs';
    import {composerClaimsArrowKeys as wi} from './session-cycle-claims.mjs';
    import {terminalHasFocus as bi} from './session-cycle-terminal.mjs';
    import {isMacUserAgent as xt} from './surface-chord-platform.mjs';
    import {elementOrNull as pr} from './dom-owner.mjs';
  `, 'export {Wp as sessionCycleRepeatMs,Gp as cycleListboxSelector,Kp as cycleComposerSelector,Jp as isCycleModifierKey,jf as ownsArrowKeys,Yp as cycleBlockedByFocus,am as sessionCycleChord};', latestSource);
  await emit('shared-16', 'session-cycle-rows.mjs', ['Xp','Zp','Qp','$p','em','tm','nm','rm','im'], `
    import {flushSync as n} from 'react-dom';
    import {asProgrammaticClick as Xe} from './session-cycle-focus.mjs';
    import {sessionCycleGroupStore as W} from '../../session-cycle-adapters.mjs';
  `, 'export {Xp as cycleRowKey,Zp as cycleButtonForRowKey,Qp as cycleResumePosition,$p as rowAliasAttribute,em as cycleExpandsGroupAttribute,tm as recentsCycleButtons,nm as cycleNeighbourButton,rm as expandCycleGroup,im as openCycleButton};', latestSource);
  await emit('shared-16', 'session-cycle-step.mjs', ['qp'], "import {cycleResumePosition as Qp} from './session-cycle-rows.mjs';", 'export {qp as sessionCycleStep};', latestSource, {qp:{local:'p',direct:true,parameters:'u, c, f, o, tm'}});
  // R3-sidebar2 (sidebar-15): the bulk archive / delete originals of 2.42304.0 shared-19: IX (which targets of a bulk
  // action go through the nested-sessions question, a family nested in more of them first), IY / FY / LY (the bulk delete
  // confirmation copy VY shows: "Delete # sessions", the archived and unloaded lines) and wY / DY / AY / NY (EY's worktree
  // confirm copy, with yY's several-sessions "Couldn’t check" variant, and its list of titles). lg is vendor-intl f
  // (defineMessages, identity); X is FormattedMessage over the host catalog; x / g are the JSX runtime (Va / Ha).
  await emit('shared-19', 'sidebar-bulk-family.mjs', ['IX'], '', 'export {IX as bulkNestedFamilies};', latestSource);
  await emit('shared-19', 'sidebar-bulk-delete-copy.mjs', ['IY','FY','LY'], 'const lg=messages=>messages;', 'export {IY as bulkDeleteMessages,FY as remoteDeleteMessages,LY as bulkDeleteCopy};', latestSource);
  await emit('shared-19', 'sidebar-bulk-worktree-copy.mjs', ['wY','DY','AY','NY'], `
    import {jsx as x,jsxs as g} from 'react/jsx-runtime';
    import {StartMessage as X} from '../../source-code-start-adapters.jsx';
    const lg=messages=>messages;
  `, 'export {wY as worktreeListLimit,DY as worktreeFolderMessages,AY as worktreeConfirmCopyOf,NY as WorktreeSessionTitles};', latestSource);
  // R2-btw NBS-1: 2.42304.0 main process (asar index.chunk-B5tintml.js, "Link a session whenever you mention one").
  await emit('index.chunk-B5tintml.js', '../../../electron/generated/side-session-prompt.mjs', ['cy','xy','by','yy','_y','vy','Sy'], '', 'export {Sy as sideSessionPrompt};', latestDesktop);
  // R2-files FT-01: cd5fd9055-CiZdOOG4.js. csv-model and document-frame are pure renames; csv-view D moves its three
  // footnotes to text-muted-as-secondary and every import alias moved (vendor-frame W/me/U/K/V/R/F/ge = useState/jsxs/
  // useRef/jsx/useMemo/useId/useDeferredValue/clsx as e/t/n/r/i/a/o/s; shared-frame cl/Hl/ho = Button/Icon/TextInput
  // as u/l/d; c68c4283d telemetry hn/mn as ne/p). Button, Icon and clsx are the 2.42304.0 originals by view-tabs name.
  // R3-files FT-18: so is TextInput (shared-frame ho = tx, view-tabs CdsTextInput, D24), no longer the 2.2553.1 Bh.
  await emit('cd5fd9055-CiZdOOG4.js', 'csv-model.mjs', ['v','y','b','x','S','C','w','T','E','re','ie','ae','oe','ce','le','O','ue'], "import {countOccurrences as c} from './string-count.mjs';", 'export { v, b, E, re, ie, ae, oe, ce, le, ue };', latestSource);
  // h is vendor-frame lo (local A=o.use): React's use(), as in both releases, not useContext.
  await emit('c3fde7009-BbbO5TX9.js', 'document-frame.mjs', ['lt','ut','rn'], "import {createContext as f, use as h, useEffect as g} from 'react'; import {jsx as l} from 'react/jsx-runtime';", 'export { lt as PrintContext, ut as usePrintRegistration, rn as DocumentColumn };', latestSource);
  await emit('cd5fd9055-CiZdOOG4.js', 'csv-view.mjs', ['D','se'], `
    import {useRef as n, useId as a, useDeferredValue as o, useState as e, useMemo as i} from 'react';
    import {jsxs as t, jsx as r} from 'react/jsx-runtime';
    import {re,ie,ae,oe,ce,le,ue} from './csv-model.mjs';
    import {parseCsvPreview as _} from './csv-parser.mjs';
    import {DocumentColumn as h,usePrintRegistration as g} from './document-frame.mjs';
    import {clsx as s} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {CdsButton as u, CdsIcon as l, CdsTextInput as d} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {CsvMessage as f, useCsvIntl as ee, useCsvFieldLanding as te, CsvEmptyState as m} from '../../source-csv-adapters.jsx';
    const p=()=>{}, ne=()=>{};
  `, 'export { D as EpitaxyCsvPreview };', latestSource);
  // c9f414608 is byte-identical to 2.37337.1 after its import; `e` is shared-25 Ff (ownerWindow) in both versions.
  await emit('c9f414608', 'tab-focus-release.mjs', ['t','n','r','i'], "import {ownerWindow as e} from './owner-window.mjs';", 'export { i as attachTabFocusRelease };', latestSource);
  // R3-topbar TT-05: the follow hook's key classifier c7f8992b4 C (classifyKeyScroll; identical in 2.37337.1) with the
  // editable selector g / v and the modifier keys he it reads, and T's key-intent window re = 1e3 (`ae = u - I.current
  // < re`: an upward scroll within a second of a classified "up" is the reader's). The sub-agent view passes C itself
  // (cccc2cf0a mO: es({classifyKeyScroll: $o}), `n as $o`).
  await emit('c7f8992b4', 'tab-focus-key-scroll.mjs', ['g','v','he','C','re'], '', 'export { C as classifyKeyScroll, re as keyScrollIntentMs, g as keyScrollEditable };', latestSource);
  // R2-home: environment-* binding lists are pinned against 2.42304.0 by code-current-environment-pins.mjs.
  const envPins = async target => (await import('./code-current-environment-pins.mjs')).pinEnvironmentHelper(target, latestSource, selected(target));
  await emit('c29df1c52', 'environment-form-layout.mjs', await envPins('environment-form-layout.mjs'), "import {jsx as n} from 'react/jsx-runtime'; import {SourceDialogFooter as Footer} from '../../source-dialog.jsx'; const o={Footer};", 'export { v as environmentBodyClass, y as EnvironmentFooter };', latestSource);
  // R3-topbar: button-press and tooltip-structure read 2.42304.0 shared-frame-BfjMqbuN.js (binding-map-code-current.json:
  // 7/7 and 3/3 identical, pure renames ns rs is al ol sl cl -> ps ms hs Ll Rl zl Bl and fc pc mc -> Gc Kc qc). The new
  // chunk imports React's Fragment and isValidElement as `j` (vendor-frame Ja = d = o.Fragment) and `ze` (io = T =
  // o.isValidElement). Export names stay.
  await emit('shared-frame-BfjMqbuN.js', 'button-press.mjs', ['ps','ms','hs','Ll','Rl','zl','Bl'], '', 'export { ms as buttonPressScale, hs as writeButtonPressScale, Bl as buttonPressInset };', latestSource);
  await emit('shared-frame-BfjMqbuN.js', 'tooltip-structure.mjs', ['Gc','Kc','qc'], "import {Fragment as j,isValidElement as ze} from 'react';", 'export { qc as tooltipContentKey };', latestSource);
  // R2-topbar TT-01 (research/topbar-transcript.md §5.1): titlebar, attachment name, approval read gate, dev-server
  // port line, split drag registry, fitOpenedLayout and transcript focus landing, all from 2.42304.0.
  await emit('shared-2', 'grapheme-prefix.mjs', ['EI','DI','kI'], '', 'export {kI as graphemePrefix};', latestSource);
  // cc43287c9 _W local Ue: the caret tooltip label, truncated at gW = 80 graphemes (`${Ru(Ve, 79).trimEnd()}…`).
  await emit('cc43287c9', 'session-menu-tooltip.mjs', ['gW','_W'], "import {graphemePrefix as Ru} from './grapheme-prefix.mjs';", 'export {_W as sessionMenuTooltipLabel,gW as sessionMenuTooltipLimit};', latestSource, {_W:{local:'Ue',direct:true,parameters:'Ve'}});
  // cc43287c9 wW local Me: the draft h1[data-pane-title] (wW props sessionRef e, spawn a, draftTitle h).
  await emit('cc43287c9', 'titlebar-draft-title.mjs', ['wW'], "import {jsx as v} from 'react/jsx-runtime';", 'export {wW as titlebarDraftTitle};', latestSource, {wW:{local:'Me',direct:true,parameters:'e, a, h'}});
  await emit('c73f45bc3', 'titlebar-toggle-fold.mjs', ['jh'], '', 'export {jh as foldTitlebarToggles};', latestSource);
  await emit('shared-frame-BfjMqbuN.js', 'dom-owner.mjs', ['Ji','lc'], '', 'export {Ji as ownerViewOf,lc as elementOrNull};', latestSource);
  await emit('shared-18', 'titlebar-title-rect.mjs', ['Wy'], '', 'export {Wy as titleGroupRect};', latestSource);
  await emit('cd54a5401', 'titlebar-fold-measure.mjs', ['Wt','Gt','Kt','qt','Jt','Yt','Xt','Zt','Qt','tn','en','nn','rn','an','on','sn','cn','ln','un'], `
    import {useState as r,useRef as a,useLayoutEffect as p,useCallback as f,useEffect as u} from 'react';
    import {flushSync as n} from 'react-dom';
    import {ownerViewOf as q,elementOrNull as K} from './dom-owner.mjs';
    import {titleGroupRect as pe} from './titlebar-title-rect.mjs';
    import {isFizzyLakePartEnabled as te} from '../view-tabs/shared-4-CJsHhp5n.js';
    // shared-0 V (O11Y internals logger) has no local sink.
    const g=()=>{};
  `, 'export {un as useTitlebarFold,en as titlebarFoldLimits,Qt as titlebarShareSlotAttribute};', latestSource);
  // R3-topbar TT-02: the lead of a session that is not ready yet is c73f45bc3 n_ (cc43287c9 imports it as `Wee`): the
  // known title as a non-interactive span[data-pane-title] beside an aria-hidden caret slot, or the pulsing title
  // ghost when no title is known. Its classes are shared-6 constants (Xh Fh Yh qh Zh $h, imported as Pt Vt It Ft Lt zt);
  // zr is shared-15 xn (true only inside the fizzy `panels` scope that shared-18 provides), nr is shared-18 qb and pr
  // shared-18 Yy (the `panels` lead class, unused while isFizzyLakePartEnabled("panels") is false, the local case).
  await emit('shared-6', 'titlebar-lead-classes.mjs', ['Jh','Yh','Xh','Fh','qh','Zh','Qh','$h'], '', 'export {Xh as titleLeadClass,Fh as titleLeadGapClass,Yh as titleSlotClass,qh as titleTextClass,Zh as titleCaretSlotClass,$h as titleGhostClass};', latestSource);
  await emit('shared-15', 'titlebar-panels-scope.mjs', ['bn','xn'], "import {createContext as p,useContext as f} from 'react';", 'export {bn as TitlebarPanelsScope,xn as useTitlebarPanelsScope};', latestSource);
  await emit('shared-18', 'titlebar-lead-parts.mjs', ['Uy','Yy','qb'], `
    import {useContext} from 'react';
    import {DirectionContext} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    // vendor-frame Td (Base UI useDirection: N(wd)?.direction ?? 'ltr') over the view-tabs DirectionContext (wd).
    const x=()=>useContext(DirectionContext)?.direction??'ltr';
  `, 'export {qb as titleDirection,Yy as panelsTitleLeadClass};', latestSource);
  await emit('c73f45bc3', 'titlebar-title-skeleton.mjs', ['n_'], `
    import {jsx as c,jsxs as i} from 'react/jsx-runtime';
    import {isFizzyLakePartEnabled as st} from '../view-tabs/shared-4-CJsHhp5n.js';
    import {useTitlebarPanelsScope as zr} from './titlebar-panels-scope.mjs';
    import {titleDirection as nr,panelsTitleLeadClass as pr} from './titlebar-lead-parts.mjs';
    import {titleLeadClass as Pt,titleLeadGapClass as Vt,titleSlotClass as It,titleTextClass as Ft,titleCaretSlotClass as Lt,titleGhostClass as zt} from './titlebar-lead-classes.mjs';
  `, 'export {n_ as TitlebarTitleSkeleton};', latestSource);
  // R3-topbar TT-03: cc43287c9 uW hands focus on when a keyboard-focused toggle folds away, once the document has lost
  // it (vI = c4db265df Ze over c70925de4 t; `e` there is shared-25 Af = fp, the generated ownerDocument).
  await emit('c70925de4', 'titlebar-focus-lost.mjs', ['t'], "import {ownerDocument as e} from './owner-document.mjs';", 'export {t as focusLost};', latestSource);
  await emit('c4db265df', 'titlebar-focus-orphaned.mjs', ['Ze'], "import {focusLost as Je} from './titlebar-focus-lost.mjs';", 'export {Ze as focusOrphaned};', latestSource);
  await emit('shared-frame-BfjMqbuN.js', 'display-text.mjs', ['ln','un','dn','fn','gn'], '', 'export {fn as displayText,gn as displayTitle};', latestSource);
  await emit('shared-2', 'attachment-file-name.mjs', ['ff','pf','op','sp','cp','lp','ap','np','up','Mp','Np'], `
    import {useRef as m,useState as u,useLayoutEffect,useEffect} from 'react';
    import {jsx as h,jsxs as d} from 'react/jsx-runtime';
    import {displayText as Vu,displayTitle as gu} from './display-text.mjs';
    import {cdsClassNames as Ku} from '../view-tabs/shared-frame-BfjMqbuN.js';
    const ru=typeof window<'u'?useLayoutEffect:useEffect; // shared-frame Q
  `, 'export {Np as AttachmentFileName,up as attachmentNameSplit,ap as attachmentNameExtension};', latestSource);
  await emit('shared-156', 'visible-box.mjs', ['HV','WV'], "import {ownerWindow as V} from './owner-window.mjs';", 'export {WV as visibleBox};', latestSource);
  await emit('c96d752d0', 'approval-read-gate.mjs', ['VDe','eE','tE','nE','rE','iE','HDe','UDe'], `
    import {useRef as y,useLayoutEffect as R} from 'react';
    import {jsx as b} from 'react/jsx-runtime';
    import {ownerWindow as te} from './owner-window.mjs';
    import {visibleBox as zn} from './visible-box.mjs';
    // c12c146ad x reads the approval presentation context (default "dock"); OpenClaude only renders inline cards.
    const EC=()=>'card';
  `, 'export {UDe as ApprovalReadRows,nE as createReadTracker,eE as readLineVisible};', latestSource);
  await emit('c96d752d0', 'dev-server-description.mjs', ['wA'], '', 'export {wA as devServerDescription};', latestSource);
  await emit('shared-23', 'split-drag-registry.mjs', ['D2','O2'], '', 'export {D2 as splitPointerDrags,O2 as markSplitPointerDrag};', latestSource);
  await emit('cf53e1812', 'tile-layout-math.mjs', ['t','n','r','O','D','k'], '', 'export {r as contentBox,O as minSize,D as distributeFlex,k as walkResolvedFlexes};', latestSource);
  await emit('cc43287c9', 'tile-fit-opened.mjs', ['B9','Rre'], `
    import {contentBox as LE,minSize as IE,distributeFlex as AE,walkResolvedFlexes as BE} from './tile-layout-math.mjs';
    // preload-helper n only tags the error for O11Y.
    const c=error=>error;
  `, 'export {Rre as fitOpenedLayout,B9 as withRoomForChat};', latestSource);
  await emit('shared-15', 'padded-top.mjs', ['Ea','Da'], '', 'export {Da as paddedTop};', latestSource);
  await emit('c96d752d0', 'transcript-focus-landing.mjs', ['tet','Y6','Z6'], "import {elementOrNull as Bs} from './dom-owner.mjs'; import {paddedTop as zu} from './padded-top.mjs';", 'export {Z6 as landTranscriptFocus,Y6 as landedFocusEvents};', latestSource);
  // R2-appswitch W3 (research/app-switch.md W3): the ⌥⌘←/→ surface chord of shared-22 AM — shared-1 qL/$L, the
  // useShortcut matcher RL and the jL.chorus_surface_prev/next binding tables. code-current-surface-chord-pins.mjs checks
  // each list is the closure of its roots, the feature strings, the official export aliases and the replaced imports.
  const chordPins = async target => (await import('./code-current-surface-chord-pins.mjs')).pinSurfaceChordHelper(target, latestSource, selected(target));
  await emit('shared-156', 'surface-chord-layers.mjs', (await chordPins('surface-chord-layers.mjs')).bindings, '', 'export {$B as surfaceChordLayerSelector};', latestSource);
  await emit('shared-78', 'surface-chord-platform.mjs', (await chordPins('surface-chord-platform.mjs')).bindings, '', 'export {Wa as isMacUserAgent};', latestSource);
  const surfaceChord = await chordPins('surface-chord.mjs');
  await emit('shared-1', 'surface-chord.mjs', surfaceChord.bindings, `
    import {surfaceChordLayerSelector as ci} from './surface-chord-layers.mjs';
    import {isMacUserAgent as Da} from './surface-chord-platform.mjs';
    ${surfaceChord.prelude}
  `, 'export {qL as surfaceChordDirection,$L as adjacentSurface,RL as shortcutBindingMatches,JL as shortcutLayerOpen,surfaceChordShortcuts};', latestSource);
  // R2-home (home-env-03/04, map-cc-env): the environment-* helpers read 2.42304.0. Each binding list comes from
  // code-current-environment-pins.mjs, which first checks it is the closure of the exported roots, the feature strings
  // of every binding and that each replaced import still names the same vendor/shared export.
  await emit('shared-52', '../../../electron/generated/environment-basename.mjs', await envPins('../../../electron/generated/environment-basename.mjs'), '', 'export {n_ as environmentBasename};', latestSource);
  await emit('shared-18', '../../../electron/generated/environment-parent.mjs', await envPins('../../../electron/generated/environment-parent.mjs'), '', 'export {jR as environmentParent};', latestSource);
  await emit('cd0cf5b5e', '../../../electron/generated/environment-presets.mjs', await envPins('../../../electron/generated/environment-presets.mjs'), `
    import {environmentBasename as o} from './environment-basename.mjs';
    import {environmentParent as re} from './environment-parent.mjs';
  `, 'export {c as sameEnvironmentName,l as availableEnvironmentName,fe as uniqueEnvironmentName,m as sameEnvironmentTarget,g as isFolderlessLocal,y as folderCheckoutSettings,ke as sameFolderSettings,x as cleanEnvironmentSettings,S as splitEnvironmentSettings,Re as readEnvironmentRecord,D as withoutPermissionMode,O as recentEnvironments};', latestSource);
  // shared-1 GV: the modifier keys Ot ignores; shared-104 Fl: the CDS copy he labels its X button from.
  await emit('shared-1', 'environment-modifier-keys.mjs', await envPins('environment-modifier-keys.mjs'), '', 'export {GV as environmentModifierKeys};', latestSource);
  await emit('shared-104', 'environment-common-copy.mjs', await envPins('environment-common-copy.mjs'), '', 'export {Fl as environmentCommonMessages};', latestSource);
  // ht replaces the deleted lt with (repoInfo, branches, kind); gt returns {pick, none}; Ot holds the height per view.
  await emit('ca690a791', 'environment-dialog-model.mjs', await envPins('environment-dialog-model.mjs'), `
    import {useRef as i,useLayoutEffect as d,useEffectEvent as c} from 'react';
    import {environmentBasename as b} from '../../../electron/generated/environment-basename.mjs';
    import {folderCheckoutSettings as k,sameFolderSettings as Be} from '../../../electron/generated/environment-presets.mjs';
    import {ownerWindow as f} from './owner-window.mjs';
    import {environmentModifierKeys as v} from './environment-modifier-keys.mjs';
  `, 'export {mt as environmentBranchOrder,ht as environmentDefaultBranch,gt as environmentBranchLabel,_t as environmentNotRepositoryNote,vt as folderCheckout,yt as promotedFolderSettings,xt as withoutFolderSettings,Nt as environmentDraft,Ft as environmentDraftDirty,Bt as sameEnvironmentName,Wt as replaceEnvironmentFolder,qt as environmentTarget,Ot as useCenteredEnvironmentHeight,Tt as pinnedPopupHeightProperty,Qt as environmentDialogClass,$t as environmentMinHeight,en as environmentBodySpacing,Zt as environmentLabelClass,rn as environmentFolderLabelClass};', latestSource);
  await emit('c0a531389', 'environment-name-parts.mjs', await envPins('environment-name-parts.mjs'), '', 'export {E as environmentNameParts};', latestSource);
  await emit('c387a4508', 'environment-field-header.mjs', await envPins('environment-field-header.mjs'), "import {jsx as t,jsxs as e} from 'react/jsx-runtime'; import {StartMessage as r} from '../../source-code-start-adapters.jsx'; import {cdsClassNames as n} from '../view-tabs/shared-frame-BfjMqbuN.js';", 'export {i as EnvironmentFieldHeader};', latestSource);
  // shared-frame wA (CDS Checkbox) for he's Worktree box; only the Base UI root and the disabled-reason wrapper are host.
  await emit('shared-frame-BfjMqbuN.js', 'environment-checkbox.mjs', await envPins('environment-checkbox.mjs'), `
    import {forwardRef as q,useId as Pe,useState as f} from 'react';
    import {jsx as H,jsxs as T} from 'react/jsx-runtime';
    import {CdsIcon as Jo,cdsClassNames as X} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {clsx as Y} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {EnvironmentCheckboxRoot as ae,EnvironmentDisabledReason as aD} from '../../source-environment-folder-adapters.jsx';
  `, 'export {wA as EnvironmentCheckbox};', latestSource);
  // cd8823d73: the folder field/list/row plus he, the inline branch picker + Worktree box + X that replace "More options".
  await emit('cd8823d73', 'environment-folder-view.mjs', await envPins('environment-folder-view.mjs'), `
    import {useState as t,useRef as r,useId as s} from 'react';
    import {flushSync as e} from 'react-dom';
    import {jsxs as n,jsx as i} from 'react/jsx-runtime';
    import {CdsIcon as S,cdsClassNames as k} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {StartTooltipGroup as E,StartMessage as A,useStartIntl as j} from '../../source-code-start-adapters.jsx';
    import {SourceSettingsButton as w} from '../../source-settings-button.jsx';
    import {EnvironmentMenu as O,EnvironmentTooltip as C,EnvironmentOverflowText as x} from '../../source-environment-folder-adapters.jsx';
    import {EnvironmentCheckbox as ee} from './environment-checkbox.mjs';
    import {environmentCommonMessages as _} from './environment-common-copy.mjs';
    import {EnvironmentFieldHeader as ae} from './environment-field-header.mjs';
    import {environmentNameParts as ie} from './environment-name-parts.mjs';
    import {useHeadCut as P} from './breadcrumb-measure.mjs';
  `, 'export {B as EnvironmentFolderField,V as EnvironmentFolderList,H as EnvironmentEmptyFolders,U as EnvironmentFolderRow,W as EnvironmentFolderName,de as EnvironmentBranchName,he as EnvironmentFolderControls,pe as environmentBranchOptions,fe as environmentBranchShown,q as environmentBranchTyped,J as environmentPlaceFirstAttribute,ge as environmentAddFolderSelect};', latestSource);
  await emit('c227f4d5e', 'environment-menu-controls.mjs', await envPins('environment-menu-controls.mjs'), `
    import {jsx as D} from 'react/jsx-runtime';
    import {StartIcon as ro,StartMessage as Z} from '../../source-code-start-adapters.jsx';
    // vendor-frame Wn (Base UI useDirection): OpenClaude's two locales are LTR. Honor an explicit root direction when supplied.
    const k=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
  `, 'export { zK as EnvironmentAction, BK as EnvironmentSettingsAction, VK as environmentOpenKey, HK as EnvironmentActionHint, UK as EnvironmentStarAction, JK as environmentSelectedProps };', latestSource);
  // R3-home (home-env-05): the environment picker's rows (cc43287c9 k0/A0/j0/e2/a2/l2/p2), its star keys (shared-19) and
  // its machine-variable query (c3f9f1667 Me), pinned by code-current-environment-pins.mjs. The Menu X and the starred
  // store's toggle Zr, the desktop bridge f and the revision store je are host adapters.
  await emit('shared-19', 'environment-picker-keys.mjs', await envPins('environment-picker-keys.mjs'), '', 'export {ZB as environmentStarKey,QB as environmentStarKeys,$B as thisComputerStarKey,sV as starredIncludes,A7 as thisComputerLabel};', latestSource);
  await emit('c3f9f1667', 'environment-machine-variables.mjs', await envPins('environment-machine-variables.mjs'), `
    import {useState as n,useEffect as l} from 'react';
    import {localEnvironmentRevision as je,localSessionEnvironment as f} from '../../source-environment-menu-adapters.jsx';
  `, 'export {Me as useMachineHasVariables};', latestSource);
  await emit('cc43287c9', 'environment-menu-rows.mjs', await envPins('environment-menu-rows.mjs'), `
    import {Fragment as u} from 'react';
    import {jsx as v,jsxs as p} from 'react/jsx-runtime';
    import {CdsBadge as id} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {StartIcon as Zu,StartMessage as Z,useStartIntl as Q} from '../../source-code-start-adapters.jsx';
    import {EnvironmentPickerMenu as X,toggleEnvironmentStar as Zr} from '../../source-environment-menu-adapters.jsx';
    import {EnvironmentActionHint as tS,EnvironmentSettingsAction as qy,EnvironmentStarAction as Yv,environmentOpenKey as qx,environmentSelectedProps as Hx} from './environment-menu-controls.mjs';
    import {environmentStarKey as Dr,environmentStarKeys as ti,starredIncludes as oi,thisComputerLabel as Fr} from './environment-picker-keys.mjs';
    import {useMachineHasVariables as LR} from './environment-machine-variables.mjs';
  `, 'export {k0 as EnvironmentPickerRow,A0 as EnvironmentPickerRows,j0 as EnvironmentPickerNew,e2 as EnvironmentPickerComputer,a2 as environmentPresetKey,l2 as EnvironmentPickerNote,p2 as EnvironmentPickerNoMatches};', latestSource);
  // R3-home: the CDS Select pieces of the dialog's "+ Add" folder control (cd8823d73 ge); its popup is the host menu.
  await emit('shared-frame-BfjMqbuN.js', 'environment-select-parts.mjs', await envPins('environment-select-parts.mjs'), `
    import {forwardRef as q} from 'react';
    import {jsx as H,jsxs as T} from 'react/jsx-runtime';
    import {CdsIcon as Jo,cdsClassNames as X} from '../view-tabs/shared-frame-BfjMqbuN.js';
  `, 'export {HO as selectTriggerClassName,UO as selectTriggerVariantClassNames,WO as selectTriggerModeClassNames,qO as selectTriggerButtonClassName,PO as selectEmptyTextClassName,dk as selectEmptyClassName,fk as selectFooterDividerClassName,pk as selectFooterClassName,rk as selectPopupSearchClassName,xk as selectSearchText,Sk as selectItemMatches,tA as SelectFooterAction};', latestSource);
  await emit('shared-frame-BfjMqbuN.js', 'environment-field-controls.mjs', await envPins('environment-field-controls.mjs'), `
    import {forwardRef as q,createContext as G,useContext as W,useRef as V,useState as f,useMemo as U,useCallback as J,useInsertionEffect as gt} from 'react';
    import {jsx as H,jsxs as T} from 'react/jsx-runtime';
    import {NativeFieldRoot as Ue,NativeFieldLabel as s,NativeFieldError as Ke,NativeFieldControl as v,useNativeFieldMetadata as b,registerNativeFieldComponents} from '../../source-field-adapters.jsx';
    import {cdsClassNames as X} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {StartIcon as Jo} from '../../source-code-start-adapters.jsx';
    // R3-home: shared-frame $l (CDS Button) under tx's clear button -> the host native-field button, which answers the
    // CDS-only tooltip prop (tooltip:!1, no auto tooltip) instead of passing it to SourceSettingsButton's DOM button.
    import {NativeFieldButton as $l} from '../../source-field-adapters.jsx';
    import {t} from '../../../electron/i18n/index.mjs';
    // shared-frame Z reads the CDS copy provider (vn) with the English fallback; the host catalog answers it.
    const Z=(_key,fallback)=>t(fallback);
  `, 'registerNativeFieldComponents({Field:xO,Label:SO,ErrorText:wO,TextInput:tx}); export {xO as EnvironmentField,SO as EnvironmentLabel,wO as EnvironmentFieldError,tx as EnvironmentTextInput};', latestSource);
  // R2-composer: the three composer helper binding lists live in code-current-composer-pins.mjs, which checks them
  // against the 2.42304.0 closure, feature strings, official export alias and replaced vendor imports first.
  await emit('shared-frame-BfjMqbuN.js', 'composer-focus-capability.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('composer-focus-capability.mjs', latestSource, selected('composer-focus-capability.mjs')), '', 'export { en as canFocusComposerOnClick };', latestSource);
  // R3-nested NBS-2: the nested-session helpers from 2.42304.0. model (mz,LG; old pz,gG) and separator (h$; old JQ) are
  // pure renames. shared-20 Q lost hideAllNested/showAllNested and JC was deleted (the new shared-20 JC is KC.handle; the
  // binding map's JC -> shared-2 PH is a mismatch): Hide/Show all moved to the command palette
  // (hide_all_nested_sessions/show_all_nested_sessions), whose copy is shared-1 IM/LM.description with RM search hints.
  await emit('shared-21', 'nested-session-model.mjs', ['mz','LG'], '', 'export {mz as nestedSessionCounts,LG as nestedSessionNeedsInput};', latestSource);
  await emit('shared-1', 'nested-session-palette-copy.mjs', ['IM','LM','RM'], 'const W=messages=>messages;', 'export {IM as hideAllNestedSessionsCopy,LM as showAllNestedSessionsCopy,RM as nestedSessionsSearchHints};', latestSource);
  // R4i-small SM3 (Y1-R3-nested-1): the host-compat allNestedToggleLabel export is gone; its only consumer (the
  // sidebar filter menu's ZH) was removed by R3-sections and the palette reads nested-session-palette-copy directly.
  await emit('shared-20', 'nested-session-copy.mjs', ['Q','yD','bD','xD','SD'], `
    const Ac=messages=>messages;
  `, 'export {yD as nestedToggleLabel,bD as nestedSessionLabel,xD as nestedStatusLabels,SD as nestedRevealLabel};', latestSource);
  await emit('shared-21', 'nested-session-separator.mjs', ['h$'], "import {jsx as _,jsxs as f} from 'react/jsx-runtime';", 'export {h$ as NestedStatusSeparator};', latestSource);
  // shared-18 W_,G_,K_,VD (old zv,Bv,Vv,KE) are identical; DE (old IT) adds focus-visible:outline-hidden; TE is
  // `${wE} hit-row-main`, the hit-row class shared-21 g$ (the family stub, old YQ) now puts after df-family-stub. ce is
  // shared-25 up (owner-window.mjs, the original ownerWindow); Yd, the CDS Icon, stays the host StartIcon.
  await emit('shared-18', 'nested-session-parts.mjs', ['W_','G_','K_','DE','TE','VD'], `
    import {jsx as b} from 'react/jsx-runtime';
    import {StartIcon as Yd} from '../../source-code-start-adapters.jsx';
    import {ownerWindow as ce} from './owner-window.mjs';
    import {sidebarHitRowClass as wE} from './sidebar-row-primitive.mjs';
  `, 'export {K_ as NestedStatusDot,G_ as synchronizeStatusAnimation,DE as nestedFocusClass,TE as sidebarHitRowMainClass,VD as NestedErrorIcon};', latestSource);
  // R3-nested NBS-3: nested_less_side_chats. shared-11 Nu picks the nesting from appFeatures (sideSessions, then
  // btwChildSessions); su is the set of live /btw children shown in their live parent's tabs (Fl: no project thread), cu
  // drops them from the drawn parent map (_g inParentTabs / drawnNestParentById; the row's shownInParentTabs).
  await emit('shared-11', 'nested-session-parent-tabs.mjs', ['Ou','Nu','Fl','su','cu'], '', 'export {Ou as sideSessionsSupported,Nu as sideSessionNesting,Fl as projectThreadNotStarted,su as btwChildrenInParentTabs,cu as withoutParentTabChildren};', latestSource);
  // R2-files FT-01: the tree geometry moved from ce9ca5630 to ca7840910-DSVFtTw1.js (w,T,E,D,O,k,L,R,z,B,V). E now
  // reads the fizzy-lake "panels" part (shared-4 jf, view-tabs isFizzyLakePartEnabled; Ef=Cf=[] so it is false in this
  // build and the icon size stays "xs"); z/B write var(--cds-border) literally. v is shared-frame Wl (local Co), the CDS
  // icon density table, emitted below rather than restated.
  await emit('shared-frame-BfjMqbuN.js', 'file-tree-density.mjs', ['Co'], '', 'export { Co as iconDensities };', latestSource);
  await emit('ca7840910-DSVFtTw1.js', 'file-tree-style.mjs', ['w','T','E','D','O','k','L','R','z','B','V'], "import {isFizzyLakePartEnabled as p} from '../view-tabs/shared-4-CJsHhp5n.js'; import {iconDensities as v} from './file-tree-density.mjs';", 'export { L as treeIndent, B as fileTreeGuideStyle, z as guideGradient, V as fileTreeRowStyle, E as fileTreeIconSize };', latestSource); // R3-files FT-16: E for the compact tree (files-changes file-tree-compact.mjs)
  // qs (old oc) also remembers mediaAsText; the host's media "View as text anyway" is a forced read (forcedText).
  await emit('cd2efac6e-C1jvGOgh.js', 'file-view-memory.mjs', ['Gs','Ks','qs','Js'], '', 'export { qs as rememberFileView, Js as readFileView };', latestSource);
  await emit('shared-28', 'file-document-types.mjs', ['Tk','Dk','Pk'], '', 'export { Dk as isOfficeDocument, Pk as binaryFileExtension };', latestSource);
  await emit('cd2efac6e-C1jvGOgh.js', 'file-text-decoding.mjs', ['Uc','$c','el','ol'], "import {binaryFileExtension as xt} from './file-document-types.mjs';", 'export { $c as hasReplacementLoss, el as utf8ByteLength, ol as needsPlainTextView };', latestSource);
  // Electron must retain this decoder when packaging excludes renderer src/.
  await emit('cd2efac6e-C1jvGOgh.js', '../../../electron/generated/file-text-decoder.mjs', ['Uc','Y','Kc','Jc','Yc','Zc','Qc'], '', 'export { Jc as detectTextEncoding, Zc as decodeFileBytes, Y as detectionSampleBytes, Kc as maximumTextBytes };', latestSource);
  await emit('c30db9bec-DjF3pT_h.js', 'file-index.mjs', ['ql','Jl','Yl','Xl','Zl','Ql','$l','eu','tu','nu','ru','iu','ou','su','cu','lu','uu','du','fu','pu','au'], '', 'export { au as FileIndex };', latestSource);
  await emit('c227f4d5e', 'mention-output-files.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('mention-output-files.mjs', latestSource, selected('mention-output-files.mjs')), `
    import {FileIndex} from './file-index.mjs';
    // ka (shared-104 ul): the resident FileIndex module; yh (c68c4283d t): telemetry; oO/aO: the Folder/File icons by name.
    const ka=()=>({FileIndex}), yh=()=>{}, oO='Folder', aO='File';
  `, 'export { rO as mergeOutputFileOptions, tO as toFileMentionOption };', latestSource);
  await emit('shared-26', 'file-output-root.mjs', ['Wb','Gb','qb'], '', 'export { Wb as windowsAbsolutePath, qb as isUncPath };', latestSource);
  await emit('shared-28', 'file-output-normalize.mjs', ['PO','UO','zO'], "import {windowsAbsolutePath as Mr} from './file-output-root.mjs';", 'export { zO as normalizeOutputPath, PO as isAbsolutePath };', latestSource);
  await emit('shared-0', 'lazy-init.mjs', ['Hi'], '', 'export { Hi as lazyInit };', latestSource);
  await emit('shared-28', 'path-parts.mjs', ['WO'], '', 'export { WO as splitPath };', latestSource);
  await emit('ce574895a-h0uyeRAC.js', 'breadcrumb-measure.mjs', ['a','o','s','c','l','u','d','f','p','m','h','g','_','v'], `
    import {flushSync as e} from 'react-dom';
    import {useLayoutEffect as n,useState as t} from 'react';
    import {lazyInit as i} from './lazy-init.mjs';
    import {ownerWindow as r} from './owner-window.mjs';
  `, 'export { l as observeWidth, g as useHeadCut, v as useBreadcrumbCut, d as graphemeEnds, f as headCut, _ as breadcrumbCut };', latestSource);
  // R2-files FT-01: the breadcrumb path helpers moved from cd2efac6e to the new cfac349aa chunk (pure renames).
  await emit('cfac349aa-BiPinwNg.js', 'breadcrumb-paths.mjs', ['jt','Mt','Xt','Ut','Gt','Vt'], `
    import {splitPath as A} from './path-parts.mjs';
    import {isAbsolutePath as oe} from './file-output-normalize.mjs';
    import {isUncPath as w} from './file-output-root.mjs';
  `, 'export { jt as segmentClass, Mt as segmentKeys, Xt as folderLabel, Ut as pathWithinRoot, Gt as breadcrumbSegments, Vt as segmentMenuTarget };', latestSource);
  await emit('c0fbbe82d-BOWKSems.js', 'path-tooltip.mjs', ['mn','hn'], "import {jsx as f} from 'react/jsx-runtime';", 'export { mn as pathTooltipOptions, hn as pathTooltipContent };', latestSource);
  // R3-files FT-06 / SC-2: 2.42304.0 split the breadcrumb: the body and its segments are cfac349aa (Kt/Jt/Yt/Q/qt/Ht,
  // segment menus ask the gone hook first), the FileBreadcrumb shell stays in cd2efac6e (Yl, passing askIfGone). The
  // binding lists and their imports are pinned by code-current-files-pins.mjs (closure, feature strings, import meaning).
  const filesPin = async target => (await import('./code-current-files-pins.mjs')).pinFilesHelper(target, latestSource, selected(target));
  const breadcrumbView = await filesPin('breadcrumb-view.mjs');
  await emit('cfac349aa-BiPinwNg.js', 'breadcrumb-view.mjs', breadcrumbView.bindings, breadcrumbView.imports, breadcrumbView.exports, latestSource);
  const breadcrumbFile = await filesPin('breadcrumb-file.mjs');
  await emit('cd2efac6e-C1jvGOgh.js', 'breadcrumb-file.mjs', breadcrumbFile.bindings, breadcrumbFile.imports, breadcrumbFile.exports, latestSource);
  await emit('shared-130', 'file-output-paths.mjs', ['Y','SL','OL','kL','_R','vR','yR','bR','wR','kR','AR','jR','hR','TR','ER','DR','OR'], '', 'export { SL as outputBasename, wR as isAgentTemporaryPath, jR as isTemporaryPath, hR as isClaudeConfigPath, OR as isSideSessionNotesPath };', latestSource);
  await emit('c73f45bc3-CFrHin0p.js', 'file-output-order.mjs', ['wv','Dv','Ov','kv','Av','jv','Mv','Nv','Pv','Fv','Rv'], `
    import {normalizeOutputPath as Vn} from './file-output-normalize.mjs';
    import {outputBasename as Tr,isAgentTemporaryPath as br,isTemporaryPath as Sr,isClaudeConfigPath as xr} from './file-output-paths.mjs';
    // Protocol adapter: the host supplies completed Write/SendUserFile records.
    const Lv=message=>message.outputFiles;
  `, 'export { Rv as recentOutputPaths };', latestSource);
  await emit('cccc2cf0a-B0D--VZp.js', 'terminal-selection.mjs', ['qy'], '', 'export { qy as terminalAttachmentText };', latestSource);
  await emit('cf718f694-jeQhHLuv.js', 'terminal-description.mjs', ['de','W','he'], '', 'export { he as terminalDescription };', latestSource);
  // C (shared-0 gy, old b) is the GrowthBook check of Bt "__gb__1475692361" that gates the prompt-navigation keys; on locally.
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-commands.mjs', ['Bt','Vt','Ht','Ut','Wt','Gt'], 'const C = () => true;', 'export { Gt as installTerminalCommands };', latestSource);
  // R3-terminal FT-03/FT-04: the terminal pane's original bindings from 2.42304.0, replacing the 2.31226.0 adapters of
  // extract-code-editor.mjs. Each binding list is pinned by code-current-terminal-pins.mjs (closure of the exported
  // roots, feature strings, official export aliases, replaced imports and the call sites that give them meaning).
  const terminalPin = async target => (await import('./code-current-terminal-pins.mjs')).pinTerminalHelper(target, latestSource, selected(target));
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-geometry.mjs', await terminalPin('terminal-geometry.mjs'), '', 'export { ri as terminalSelectionEndRow, ii as terminalSelectionBox, oi as isWholeTerminalSelection, si as wholeTerminalSelectionAnchor, ci as terminalSelectionPillPosition };', latestSource);
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-output.mjs', await terminalPin('terminal-output.mjs'), '', 'export { $n as attachVisibleTerminalOutput, Vn as terminalSelectionText };', latestSource);
  // ae is shared-78 kw (Wa, the macOS user-agent test), already emitted as surface-chord-platform.mjs.
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-mouse.mjs', await terminalPin('terminal-mouse.mjs'), "import {isMacUserAgent as ae} from './surface-chord-platform.mjs';", 'export { Ur as terminalOwnsContextMenu };', latestSource);
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-colors.mjs', await terminalPin('terminal-colors.mjs'), '', 'export { Nn as installTerminalColorPolicy };', latestSource);
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-link-selection.mjs', await terminalPin('terminal-link-selection.mjs'), '', 'export { xn as selectionBlocksTerminalLink };', latestSource);
  // fe is vendor-intl f (react-intl defineMessages, the identity); the host formats the descriptors with its catalog.
  await emit('c6bf19e8f-oq2b1_8O.js', 'terminal-errors.mjs', await terminalPin('terminal-errors.mjs'), 'const fe = messages => messages;', 'export { Kr as needsNewerAppError, qr as startFailedError, Jr as loadFailedError, Xr as terminalErrorMessages, Qr as terminalStartError };', latestSource);
  // The shared-78 title sanitizer (l_/p_/y_ = Xw/Yw/eT) and its shared-25/-52/-0 dependencies; dn/F are shared-0 Hi.
  await emit('shared-25-DP8p7i1Z.js', 'terminal-title-wellformed.mjs', await terminalPin('terminal-title-wellformed.mjs'), '', 'export { jU as stripLoneSurrogates, kU as isWellFormedText };', latestSource);
  await emit('shared-0-ByI5P0CP.js', 'terminal-title-invisibles.mjs', await terminalPin('terminal-title-invisibles.mjs'), '', 'export { XP as invisibleBlankClass, YP as invisibleBlankCodePoints };', latestSource);
  await emit('shared-52-DGviI8xb.js', 'terminal-title-runs.mjs', await terminalPin('terminal-title-runs.mjs'), "import {lazyInit as F} from './lazy-init.mjs';", 'export { Uj as capBlankRuns, Pj as blankRunClass };', latestSource);
  await emit('shared-78-D6VXYXaQ.js', 'terminal-title-text.mjs', await terminalPin('terminal-title-text.mjs'), `
    import {stripLoneSurrogates as Ce} from './terminal-title-wellformed.mjs';
    import {lazyInit as dn} from './lazy-init.mjs';
    import {capBlankRuns as Rr,blankRunClass as Oi} from './terminal-title-runs.mjs';
    import {invisibleBlankClass as Cn} from './terminal-title-invisibles.mjs';
  `, 'export { Xw as visibleTitleText, Yw as sanitizeTitleText, eT as limitCodePoints };', latestSource);
  // a (shared-0 gy) and p (shared-52 ms) read __gb__736896549, on locally; ee (vendor-all-0 I, zustand) is the host store.
  await emit('cf718f694-jeQhHLuv.js', 'terminal-titles.mjs', await terminalPin('terminal-titles.mjs'), `
    import {visibleTitleText as s,sanitizeTitleText as c,limitCodePoints as l} from './terminal-title-text.mjs';
    import {createTerminalTitleStore as ee} from '../../terminal-title-store.mjs';
    const a = () => true, p = () => "on";
  `, 'export { be as installTerminalTitles, me as terminalTitleValue, J as forgetTerminalTitle, ge as terminalTitlesEnabled, G as terminalTitleStore };', latestSource);
  // te (c51596d2b _) is __gb__2265785636, on locally; h (shared-28 gs) reads the preference from the local view settings.
  await emit('cf718f694-jeQhHLuv.js', 'terminal-idle-cursor.mjs', await terminalPin('terminal-idle-cursor.mjs'), `
    import {jsx as e} from 'react/jsx-runtime';
    import {clsx as r} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {useTerminalPreference as h} from '../../terminal-view-settings.mjs';
    const te = () => true;
  `, 'export { B as TerminalIdleCursor, z as useTerminalIdleCursorBlink, E as terminalCursorBlinkKey };', latestSource);
  await emit('cf718f694-jeQhHLuv.js', 'terminal-registry.mjs', await terminalPin('terminal-registry.mjs'), '', 'export { oe as registerTerminalRegistry, b as terminalRegistryHas, le as clearTerminalViaRegistry };', latestSource);
  // Qn.Item is the host menu item (the tab menu is SourceMenu, not the CDS context menu); X/Z are the local catalog.
  await emit('cccc2cf0a-B0D--VZp.js', 'terminal-clear-item.mjs', await terminalPin('terminal-clear-item.mjs'), `
    import {useState as u} from 'react';
    import {jsx as g} from 'react/jsx-runtime';
    import {TerminalMenu as Qn,TerminalMessage as X,useTerminalIntl as Z} from '../../source-terminal-adapters.jsx';
    import {terminalRegistryHas as Md,clearTerminalViaRegistry as jd} from './terminal-registry.mjs';
  `, 'export { Yy as mountedTerminalViews, Xy as terminalClearState, Zy as TerminalClearItem };', latestSource);
  // R3-terminal FT-15 (terminal-10, global-v01): cfe7c4b3b ce, the shared view-tab strip's overflow menu row, with its
  // compact size table R, typeahead reset keys L and RTL key flip I (replaces extract-code-editor.mjs's patched 2.31226.0
  // preview-tab-overflow.mjs). O.Item is the host menu item (the overflow list is SourceMenu, not the CDS dropdown);
  // g / b are the generated shared-25 up and shared-19 dZ; D is shared-frame aa.
  await emit('shared-frame-BfjMqbuN.js', 'terminal-tab-size-attrs.mjs', await terminalPin('terminal-tab-size-attrs.mjs'), '', 'export { aa as cdsSizeAttributes };', latestSource);
  await emit('cfe7c4b3b-CP-IQXj8.js', 'terminal-tab-overflow.mjs', await terminalPin('terminal-tab-overflow.mjs'), `
    import {createContext as c,useCallback as p} from 'react';
    import {jsx as i,jsxs as n} from 'react/jsx-runtime';
    import {clsx as h} from '../view-tabs/vendor-frame-DfPJ1QmD.js';
    import {CdsIcon as S,CdsOverflowTooltip as x} from '../view-tabs/shared-frame-BfjMqbuN.js';
    import {ownerWindow as g} from './owner-window.mjs';
    import {suppressKeyRepeat as b} from '../code-editor-current/keyboard-repeat.mjs';
    import {cdsSizeAttributes as D} from './terminal-tab-size-attrs.mjs';
    import {TerminalMenu as O} from '../../source-terminal-adapters.jsx';
  `, 'export { ce as TabOverflowItem, R as tabOverflowSizes, L as tabOverflowTypeaheadResetKeys, I as tabOverflowRtlKey };', latestSource);
  await emit('shared-28', 'composer-composition.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('composer-composition.mjs', latestSource, selected('composer-composition.mjs')), `
    import {Plugin as bd, PluginKey as wd, TextSelection as Sd, Selection as Ed} from 'prosemirror-state';
    // Only Tiptap extension registration and telemetry are host adapters.
    const ef={create: options=>options};
    const Rv=()=>{}, Lv=message=>new Error(message), Sb=()=>{};
  `, 'export const compositionEdgePlugins=()=>Jv.addProseMirrorPlugins(); export {Ab as finishCompositionBeforePaste, Db as trackComposition, Wv as clearCompositionEdge, Bv as compositionEdgeKey, Uv as isNonInclusiveMarkEdge};', latestSource);
  if (only) for (const target of only) if (!manifest.modules.some(entry => entry.target === target)) throw Error(`Unknown --only target ${target}`);
  const text = JSON.stringify(manifest, null, 2) + '\n';
  if (check) { if (await fs.readFile(path.join(output, 'manifest.json'), 'utf8') !== text) mismatches.push('Current Code helper manifest changed'); }
  else await fs.writeFile(path.join(output, 'manifest.json'), text);
  if (mismatches.length) throw Error(mismatches.join('\n'));
  console.log(`${check ? 'Verified' : 'Extracted'} ${only ? `${only.size} of ` : ''}${manifest.modules.length} current Code source helper modules.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--only');
  const only = index > 0 ? new Set(process.argv[index + 1].split(',').filter(Boolean)) : null;
  await extractCurrentCodeHelpers({ check: process.argv.includes('--check'), only });
}
