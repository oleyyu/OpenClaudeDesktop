// R2-home (home-env-03 / home-env-04 / map-cc-env / SC-ENV, research/home-env.md §2.9 and §5 WI-03/WI-04): pins for the
// environment-* helpers that scripts/extract-code-ui-current.mjs emits from the 3.6556.2 renderer (every pin reads
// v3Source since the W9 gate; earlier rounds pinned 2.37337.1 and 2.42304.0). Before each emit
// this checks that the hand-listed binding set is exactly the same-chunk closure of the roots the helper exports (minus
// the locals the emit replaces with host adapters), that every binding still carries feature strings of its original
// text, that the chunk still exports the roots under the official aliases its consumers import, and that every replaced
// import still names the same export of its vendor/shared chunk. Minified names are reused for unrelated values between
// releases (2.37337.1 `lt` was the default branch, 2.42304.0 `lt` is an import), so a re-pointed name fails here instead
// of emitting the wrong binding.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { compilerHelpers as envUiCompilerHelpers } from './official-3.6556.2.mjs';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const vendor = 'vendor-frame-DfPJ1QmD.js', frame = 'shared-frame-BfjMqbuN.js', intl = 'vendor-intl-Db7hDWRO.js';
const react = member => ({ react: member });
// cc-rest-env-ui (3.6556.2, research/code-current-rest.md §3 P1): the dialog/menu pins below whose `source` is a 3.6556.2
// chunk run against official.ionSource. React Compiler helpers (J9/J0…K5/I1…/Z1…) are imported from view-tabs by their
// E3 names; envUiMemo pins each one's shared-frame export alias and 3.6556.2 declaration (official.compilerHelpers).
const envUiVendor = 'vendor-frame-CnSY1sxv.js', envUiFrame = 'shared-frame-6jtSkIit.js', envUiIntl = 'vendor-intl-DYfox5Co.js';
const envUiHelper = local => {
  const entry = Object.entries(envUiCompilerHelpers).find(([, helper]) => helper.local === local);
  if (!entry) throw Error(`Unknown React Compiler helper ${local}`);
  return entry;
};
const envUiMemo = locals => {
  const imports = {}, dependencies = {};
  for (const local of locals.split(' ')) {
    const [alias, helper] = envUiHelper(local);
    imports[local] = `${envUiFrame}:${alias}`;
    dependencies[`${envUiFrame}:${alias}`] = [helper.feature];
  }
  return { imports, dependencies };
};
// 3.6556.2 pins (W9 cc-rest-env-model): a vendor-frame import is checked with official.assertVendorAlias (top-level
// `local=<namespace>.<member>`, R3), a React Compiler helper or other shared name with the view-tabs 3.6556.2 public
// name of the same chunk and export alias (E3/R6). v3Memo('J9 J1 …') lists the compiled closure's cache helpers.
const v3Vendor = official.vendorFrame, v3Frame = official.sharedFrame;
const v3React = (alias, member) => [`${v3Vendor}:${alias}`, { vendor: member }];
const v3Memo = locals => locals.split(' ').map(local => {
  const [alias, entry] = Object.entries(official.compilerHelpers).find(([, e]) => e.local === local) ?? [];
  if (!alias) throw Error(`No compiler helper ${local}`);
  return [local, `${v3Frame}:${alias}`, { viewTabs: entry.name }];
});
// { imports, dependencies } of a 3.6556.2 pin from [local, 'file:alias', check] rows.
const v3Imports = rows => ({
  imports: Object.fromEntries(rows.map(([local, via]) => [local, via])),
  dependencies: Object.fromEntries(rows.map(([, via, check]) => [via, check])),
});

export const environmentHelperPins = {
  // cc-rest-env-ui: 3.6556.2 c29df1c52 _/v (2.42304.0 v/y): the environment form's scroll body class (no -mb-pad-sm,
  // bottom padding pb-lg) and its bordered footer over the CDS Dialog's Footer (shared-frame Zc, here the host footer).
  'environment-form-layout.mjs': {
    source: 'c29df1c52-CULYovxc.js', roots: ['_', 'v'], bindings: ['_', 'v'], officialExports: { n: '_', i: 'v' },
    imports: { e: `${envUiVendor}:Ha`, a: `${envUiFrame}:Zc`, ...envUiMemo('J9 J2 K2').imports },
    dependencies: { [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiFrame}:Zc`]: ['Footer:eb', 'CloseButton:Xy'], ...envUiMemo('J9 J2 K2').dependencies },
    features: {
      _: ['"-mx-pad-xl flex min-h-[6rem]', 'scroll-fade-y px-xl pt-3 pb-lg', 'min-h-[calc-size(min-content,min(size,6rem))]'],
      v: ['-mx-pad-xl mt-auto border-t px-xl pt-lg', 'className: "mt-0"', 'n === void 0 ? "end" : n'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-52 nk (2.42304.0 n_, 2.37337.1 ty): a path's last segment.
  '../../../electron/generated/environment-basename.mjs': {
    source: 'shared-52-uHFNjl7C.js', roots: ['nk'], bindings: ['nk'], officialExports: { Ou: 'nk' },
    features: { nk: ['t.lastIndexOf("/")', 't.lastIndexOf("\\\\")', 'e.replace(/[\\\\/]$/, "")'] },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-18 lU (2.42304.0 jR, 2.37337.1 rB): a path's parent folder.
  '../../../electron/generated/environment-parent.mjs': {
    source: 'shared-18-D3y8YMFN.js', roots: ['lU'], bindings: ['lU'], officialExports: { jn: 'lU' },
    features: { lU: ['e.lastIndexOf("/")', 'e.slice(0, t)'] },
  },
  // cd0cf5b5e (2.37337.1 cd0cf5b5e-zXuejA0A): saved-environment record model. 2.42304.0 renamed _e..Le and changed y,
  // which keeps an additional folder's branch only with its worktree.
  // 3.6556.2 cd0cf5b5e-BCzJmEwZ (W9 gate switch): the same code as 2.42304.0 with only the basename import renamed
  // (shared-52 Ou). session-rail environment-target.mjs imports m/S from this module (one copy, D1).
  '../../../electron/generated/environment-presets.mjs': {
    source: 'cd0cf5b5e-BCzJmEwZ.js', roots: ['c', 'l', 'fe', 'm', 'g', 'y', 'ke', 'x', 'S', 'Re', 'D', 'O'],
    bindings: ['c', 'ue', 'de', 'fe', 'l', 've', 'ye', 'm', 'g', 'v', 'y', 'ke', 'Ae', 'b', 'je', 'Me', 'Ne', 'Pe', 'x', 'S', 'Re', 'D', 'O'],
    // x / Re / D are module-internal in the chunk (no export alias); the host uses them through this module.
    officialExports: { W: 'c', G: 'l', U: 'fe', k: 'm', b: 'g', p: 'y', E: 'ke', N: 'S', S: 'O' },
    imports: { a: 'shared-52-uHFNjl7C.js:Ou', re: 'shared-18-D3y8YMFN.js:jn' },
    // The 3.6556.2 dialog draft (ca690a791 imports cd0cf5b5e-BCzJmEwZ p/E, i.e. y/ke) reads these exports.
    dependencies: { 'shared-52-uHFNjl7C.js:Ou': ['lastIndexOf("/")'], 'shared-18-D3y8YMFN.js:jn': ['return t>0?e.slice(0,t):null'] },
    features: {
      c: ['e.trim().toLowerCase() === t.trim().toLowerCase()'], ue: ['"worktrees"', '".claude"'],
      y: ['e === !0 && (n[r] = { worktree: e, ...(i ? { branch: i } : {}) })'], ke: ['worktree === !0) ==', 'branch || void 0'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-78 AQ (exported Nr), a \\wsl$ / \\wsl.localhost UNC path's distro and POSIX path.
  'environment-wsl-unc.mjs': {
    source: 'shared-78-D5Fw2h0a.js', roots: ['AQ'], bindings: ['AQ'], officialExports: { Nr: 'AQ' },
    features: { AQ: ['(?:wsl\\$|wsl\\.localhost)', 'posixPath: n === "" ? "/" : n'] },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-20 QA (exported S) over XA: a folder as the WSL distro sees it (a POSIX path
  // stays, a UNC path inside that distro becomes its POSIX path, anything else is null). ca690a791 _n calls it for a
  // local environment with a wslDistro (never set on this host: it has no WSL).
  'environment-wsl-folder.mjs': {
    source: 'shared-20-mUr7IqZY.js', roots: ['QA'], bindings: ['XA', 'QA'], officialExports: { S: 'QA' },
    imports: { Jr: 'shared-78-D5Fw2h0a.js:Nr' },
    dependencies: { 'shared-78-D5Fw2h0a.js:Nr': ['wsl\\.localhost', 'posixPath:n===""?"/":n'] },
    features: {
      XA: ['e.distro.name.toLowerCase() === n.distro.toLowerCase() && e.selectable', 'posixPath: n.posixPath'],
      QA: ['e.startsWith("/")', '[{ distro: { name: t }, selectable: !0 }]', '?.posixPath ?? null'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2), E42: ca690a791-C6pAwzdL's pure draft / branch / target model and the dialog classes,
  // a target of its own so plain-node models (src/saved-environment-model.mjs) never reach view-tabs. 2.42304.0 names:
  // mt→Nt ht→Pt gt→Ft _t→It vt→Lt yt→Rt xt→Vt Nt→en Pt→tn Ft→nn Bt→cn Wt→pn qt→_n Kt→hn sn→jn Tt→Gt Qt→wn $t→Tn
  // Zt→Cn rn→On. 3.6556.2 changes: en takes the variant record (6th argument; variantDirty when given), nn compares the
  // variant records (JSON.stringify) instead of variantDirty alone, _n converts a WSL folder (shared-20 QA) and returns
  // null when it cannot, gn is its folderless-local guard; the 2.42304.0 body spacing constant (en "mb-0 gap-md pb-lg")
  // is gone from the release.
  'environment-dialog-draft.mjs': {
    source: 'ca690a791-C6pAwzdL.js',
    roots: ['Nt', 'Pt', 'Ft', 'It', 'Lt', 'Rt', 'Vt', 'en', 'nn', 'cn', 'pn', '_n', 'Gt', 'wn', 'Tn', 'Cn', 'On'],
    bindings: ['Nt', 'Pt', 'Ft', 'It', 'Lt', 'Rt', 'Vt', 'en', 'tn', 'nn', 'cn', 'pn', 'gn', '_n', 'hn', 'jn', 'Gt', 'wn', 'Tn', 'Cn', 'On'],
    officialExports: {},
    imports: { D: 'shared-52-uHFNjl7C.js:Ou', He: 'cd0cf5b5e-BCzJmEwZ.js:E', Je: 'cd0cf5b5e-BCzJmEwZ.js:p', Ce: 'shared-20-mUr7IqZY.js:S' },
    dependencies: {
      'shared-52-uHFNjl7C.js:Ou': ['lastIndexOf("/")'], 'cd0cf5b5e-BCzJmEwZ.js:p': ['e===!0&&(n[r]={worktree:e'],
      'cd0cf5b5e-BCzJmEwZ.js:E': ['worktree===!0==(t?.[n]?.worktree===!0)'], 'shared-20-mUr7IqZY.js:S': ['e.startsWith("/")?e:'],
    },
    features: {
      Nt: ['e === "main" ? 0 : e === "master" ? 1 : 2'], Pt: ['e?.defaultBranch ??', 'n === "local"', 'e === "main" || e === "master"'],
      Ft: ['"starts-worktree"', '"switches-folder"', 'mark: "default"', 'mark: "current"', '"Current branch"'],
      It: ['"Not a Git repository"'], Lt: ['firstWorktree: a', 'worktree: c === 0 ? a'], Rt: ['worktree: t?.worktree ?? !1'],
      en: ['nameDirty: r !== void 0', 'variantRecord: { ...a }', 'variantLoad: "pending"', 'variantDirty: a !== void 0'],
      nn: ['JSON.stringify(t.variantRecord) !== JSON.stringify(e.variantRecord)', 't.envVarsState === "dirty"'],
      cn: ['e.trim().toLowerCase() === t.trim().toLowerCase()'], pn: ['r[Math.min(t, r.length)] = n'],
      gn: ['!e.wslDistro && !e.variant'], _n: ['additionalFolders: e.additionalFolders', 'folderSettings: r', 'if (n === null) return null;'],
      hn: ['n === "environment" || n === "pool"'], Gt: ['"--pinned-popup-open-height"'],
      wn: ['[--environment-dialog-cap:calc(100dvh_-_', 'max-h-[min(1056px,var(--environment-dialog-cap),', 'var(--pinned-popup-open-height,var(--environment-dialog-cap))'],
      Tn: ['"min-h-0"'], Cn: ['"flex min-h-5 items-center gap-xs"'], On: ['"h-5"'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2): ca690a791-C6pAwzdL Yt (2.42304.0 Ot), the dialog's height hold, now React Compiler
  // output (cache helpers: view-tabs E3 names); Kt/qt/Jt are 2.42304.0 Et/F/Dt. The module re-exports the draft model
  // above under the same names, so its importers see one module (E7); Gt comes from there.
  'environment-dialog-model.mjs': {
    source: 'ca690a791-C6pAwzdL.js', roots: ['Yt'], bindings: ['Yt', 'Kt', 'qt', 'Jt'], officialExports: {},
    hosts: { Gt: ['"--pinned-popup-open-height"'] },
    ...v3Imports([
      ['o', ...v3React('go', 'useEffectEvent')], ['e', ...v3React('Co', 'useRef')], ['a', ...v3React('bo', 'useLayoutEffect')],
      ...v3Memo('J9 J1 J2 J3 K1 K2 K3'),
      ['w', 'shared-25-DOWZRSlq.js:up', { viewTabs: 'ownerWindow' }], ['E', 'shared-1-BJhqMmkf.js:_', ['"AltGraph"', '"CapsLock"', '"ScrollLock"']],
    ]),
    features: {
      Kt: ['"pointerdown"', '"keydown"', '"click"'], qt: ['e.style.top !== ""'], Jt: ['`${t.height}px`', 't.window = ""'],
      Yt: ['"--desktop-titlebar-inset"', 'e.key === "Tab"', '.has(e.key)', 'new e.ResizeObserver(o)', 'attributeFilter: ["style"]', 'n.style.setProperty("height", `${a}px`)'],
    },
  },
  // c0a531389 E (2.42304.0): the head/tail split of a long folder name. 3.6556.2 merged c0a531389 into c96d752d0-CWv_7-n9
  // as pL (module-internal, identical code; W9 gate switch). session-rail-kit branch-chip.mjs and session-rail-changes
  // pr-rows.mjs import it from this module (one copy, D1).
  'environment-name-parts.mjs': {
    source: 'c96d752d0-CWv_7-n9.js', roots: ['pL'], bindings: ['pL'], officialExports: {},
    features: { pL: ['t.length < 16'] },
  },
  // cc-rest-env-ui: 3.6556.2 c387a4508 i (same local; React Compiler rewrite only): a field header (label,
  // "(optional)" muted as secondary, tip, add slot).
  'environment-field-header.mjs': {
    source: 'c387a4508-CuXnQTW8.js', roots: ['i'], bindings: ['i'], officialExports: { t: 'i' },
    imports: { e: `${envUiVendor}:Ha`, t: `${envUiVendor}:Ua`, n: `${envUiFrame}:Hf`, r: `${envUiIntl}:l`, ...envUiMemo('J9 J1 J2 J3 K1 K2 K3').imports },
    dependencies: {
      [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiVendor}:Ua`]: react('jsxs'), [`${envUiFrame}:Hf`]: ['return Jt(c(e))'],
      [`${envUiIntl}:l`]: ['"MemoizedFormattedMessage"'], ...envUiMemo('J9 J1 J2 J3 K1 K2 K3').dependencies,
    },
    features: { i: ['flex h-[1lh] items-center justify-between gap-sm', '"(optional)"', 'text-footnote text-muted-as-secondary', 'font-medium text-primary'] },
  },
  // cc-rest-env-ui: 3.6556.2 cd8823d73-CrZFkwi4 (research/code-current-rest.md §3 P1; 2.42304.0 B/V/H/U/W/de/he/pe/fe/q/J/ge
  // -> G/K/q/J/X/Be/Ge/Ue/Ve/He/Z/Ke). The folder name is now a grid of the full run (data-name-run) over a measured
  // head…tail pair (Ae/Ne/Ie/Le/Fe over breadcrumb-measure graphemeEnds/useHeadCut/observeWidth) drawn as a bdi middle
  // ellipsis; a renamed folder's name is a button that opens its path tooltip (Oe, path-tooltip). The row's name column
  // is me-auto max-w-max flex-[28_1_0%], the controls Ge flex-[72_1_0%], the branch popup w-96 max-w-[var(--available-width)].
  // CDS Menu/Tooltip/OverflowTooltip/TooltipProvider/Button stay host adapters (as in 2.42304.0); CdsCheckbox is view-tabs.
  'environment-folder-view.mjs': {
    source: 'cd8823d73-CrZFkwi4.js', roots: ['G', 'K', 'q', 'J', 'X', 'Be', 'Ge', 'Ue', 'Ve', 'He', 'Z', 'Ke'],
    bindings: ['De', 'G', 'K', 'q', 'Oe', 'J', 'ke', 'Ae', 'je', 'Y', 'Me', 'Ne', 'Pe', 'Fe', 'Ie', 'Le', 'X', 'Re', 'ze', 'Be', 'Ve', 'He', 'Ue', 'We', 'Z', 'Ge', 'Ke'],
    officialExports: { f: 'G', p: 'K', d: 'q', h: 'J', m: 'Be', g: 'Ge', l: 'Ke' },
    imports: {
      e: `${envUiVendor}:Co`, t: `${envUiVendor}:Ha`, i: `${envUiVendor}:Ua`, r: `${envUiVendor}:Sa`, o: `${envUiVendor}:Ya`, s: `${envUiVendor}:_o`,
      c: `${envUiVendor}:bo`, d: `${envUiVendor}:wo`,
      g: `${envUiFrame}:Jo`, _: `${envUiFrame}:Kl`, m: `${envUiFrame}:Gl`, y: `${envUiFrame}:ql`, p: `${envUiFrame}:Eu`, S: `${envUiFrame}:xi`,
      v: `${envUiFrame}:od`, h: `${envUiFrame}:Hf`, V: `${envUiIntl}:l`, H: `${envUiIntl}:p`,
      Ce: 'c387a4508-CuXnQTW8.js:t', de: 'ce574895a-sBAnWI9w.js:t', le: 'ce574895a-sBAnWI9w.js:i', ue: 'ce574895a-sBAnWI9w.js:n',
      fe: 'cc5c56f5c-BoRtnbt1.js:n', pe: 'cc5c56f5c-BoRtnbt1.js:t', ne: 'shared-78-D5Fw2h0a.js:Ls',
      ...envUiMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5').imports,
    },
    dependencies: {
      [`${envUiVendor}:Co`]: react('useRef'), [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiVendor}:Ua`]: react('jsxs'), [`${envUiVendor}:Sa`]: react('flushSync'),
      [`${envUiVendor}:Ya`]: react('Fragment'), [`${envUiVendor}:_o`]: react('useId'), [`${envUiVendor}:bo`]: react('useLayoutEffect'), [`${envUiVendor}:wo`]: react('useState'),
      [`${envUiFrame}:Jo`]: ['TriggerButton:kT', 'SearchablePopup:IT', 'GroupLabel:_T', 'Header:gT', 'Separator:mT'],
      [`${envUiFrame}:Kl`]: ['content:t,detail:n', 'closeOnClick:y,lazy:x'], [`${envUiFrame}:Gl`]: ['hoverable:s,lazy:c,children:r'],
      [`${envUiFrame}:ql`]: ['n===void 0?200:n'], [`${envUiFrame}:Eu`]: ['iconOnly:a,iconPosition:o,tooltip:s'], [`${envUiFrame}:xi`]: ['disabledReason:o,animated:f'],
      [`${envUiFrame}:od`]: ['customIcon:t,size:l'], [`${envUiFrame}:Hf`]: ['return Jt(c(e))'],
      [`${envUiIntl}:l`]: ['"MemoizedFormattedMessage"'], [`${envUiIntl}:p`]: ['let e=a(K);return Mt(e),e'],
      'c387a4508-CuXnQTW8.js:t': ['"(optional)"'], 'ce574895a-sBAnWI9w.js:t': ['n.segment(e)'], 'ce574895a-sBAnWI9w.js:i': ['ResizeObserver'],
      'ce574895a-sBAnWI9w.js:n': ['headRef:a,head:o,identity:s,remeasureKey:c'], 'cc5c56f5c-BoRtnbt1.js:n': ['inline-block max-w-full whitespace-pre-wrap'],
      'cc5c56f5c-BoRtnbt1.js:t': ['max-w-[min(480px,var(--available-width))]'], 'shared-78-D5Fw2h0a.js:Ls': ['removeItem:{defaultMessage:"Remove {item}"'],
      ...envUiMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5').dependencies,
    },
    features: {
      De: ['variant: "ghost"', 'align: "end"', 'className: "min-w-0 shrink"', 'popupClassName: "w-max min-w-48 max-w-96"'],
      G: ['role: "group"', '"aria-labelledby": d'], K: ['rounded shadow-card-ring', 'role: "list"'], q: ['outline-dashed', 'text-muted-as-secondary'],
      Oe: ['select-text hide-focus-ring', 'hoverable: !1', 'closeOnClick: !1'],
      J: ['group/place flex min-w-0', 'me-auto flex min-h-7 max-w-max min-w-0 flex-[28_1_0%] items-center text-body', 'mt-1.5 shrink-0 text-secondary', 'min-w-[45%]'],
      Ae: ['n >= 5'], Ne: ['.repeat(n - 1) + '], Fe: ['e.scrollWidth - e.clientWidth', '"slack"'], Ie: ['run: "none"'], Le: ['"ellipsis"'],
      X: ['"data-name-run": ""', 'relative grid min-w-0 overflow-hidden', 'invisible col-start-1 row-start-1 flex min-w-0 select-none', '"bdi"', 'min-w-[2em] truncate'],
      Re: ['"[data-name-run]"'], ze: ['font-mono-ui', 'dir: "ltr"'], He: ['e.typed && t !== ""'], Ue: ['r.mark === "current"', 'checked: e === i ||'],
      We: ['side: "inline-start"', 'checkedRole: "radio"', 'lazy: !0'], Z: ['"data-place-first"'],
      Ge: [
        'flex min-h-7 max-w-max min-w-0 flex-[72_1_0%] items-center gap-xs', 'modal: !1', '"Branch for {label}:"', '"Switch to {branch}"', 'tagName: o',
        '"Start worktree from"', '"Switch this folder to"', '"Worktree for {label}"', '"Worktree"', '.removeItem', 'size: "xxs"',
        'group-hover/place:opacity-100', 'w-96 max-w-[var(--available-width)]',
      ],
      Ke: ['...De', 'variant: "outline"', 'size: "sm"', 'hideCaret: !0', 'value: null', 'flex items-center gap-xs text-primary', 'name: "Add"', '"2/2yg+qAwp"'],
    },
  },
  // cc-rest-env-ui: 3.6556.2 c227f4d5e B$/V$/H$/U$/W$/Y$ (2.42304.0 zK..JK; React Compiler rewrites, same props and copy):
  // the environment menu's row actions. vendor-frame Ia (Base UI useDirection) stays the host's document-dir answer.
  'environment-menu-controls.mjs': {
    source: 'c227f4d5e-B-FYKrwT.js', roots: ['B$', 'V$', 'H$', 'U$', 'W$', 'Y$'], bindings: ['B$', 'V$', 'H$', 'U$', 'W$', 'Y$'],
    officialExports: { wn: 'V$', En: 'H$', Cn: 'U$', Tn: 'W$', bn: 'Y$' },
    imports: { y: `${envUiVendor}:Ha`, Re: `${envUiFrame}:od`, Q: `${envUiIntl}:l`, x: `${envUiVendor}:Ia`, ...envUiMemo('J9 J1 J2 J3 K1 K2 K3').imports },
    dependencies: {
      [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiFrame}:od`]: ['customIcon:t,size:l'], [`${envUiIntl}:l`]: ['"MemoizedFormattedMessage"'],
      [`${envUiVendor}:Ia`]: ['?.direction??"ltr"'], ...envUiMemo('J9 J1 J2 J3 K1 K2 K3').dependencies,
    },
    features: {
      B$: ['text-muted-as-secondary opacity-0', 'pointer-coarse:opacity-100', 'e.stopPropagation()', 'size: "sm"'], V$: ['icon: "Settings"'],
      H$: ['"ArrowLeft" : "ArrowRight"'], U$: ['", edit environment, right arrow"', '", environment settings, left arrow"'],
      W$: ['"env-picker-unstar"', '"StarSlash"'], Y$: ['checkedRole: "radio"', 'role: "menuitemradio"'],
    },
  },
  // cc-rest-env-ui: 3.6556.2 shared-frame Field / Label / FieldError / TextInput of the environment form (2.42304.0
  // xO/SO/wO/tx -> Jj/Yj/Zj/uC; bO -> qj, Jj's state render -> $j). Base UI's Field parts (vendor-frame Mt Root, At
  // Label, kt Error, Et Control, It labelable context) stay the host's native field adapters, so the parts register
  // with the host field registry as before. uC adds the RTL typed-direction effect zS (dir/type/remountKey; inert on
  // OpenClaude's LTR locales). CDS classes, CdsFieldStateContext (HS, which $j provides and US/WS read), useCdsMergedRefs,
  // useClickToFocus, useCdsIsoLayoutEffect and the cache helpers are view-tabs semantic names; Uu (Button) is the host
  // native-field button, us (Icon) the start-card icon and wn (CDS copy) the host catalog, as in 2.42304.0.
  // W9 gate: Fn over Nn (the first letter's direction; uC's typed-direction effect) is code-composer
  // chat-composer-frame.mjs's 3.6556.2 slice (textDirectionOf), imported rather than sliced again (one copy, D1).
  'environment-field-controls.mjs': {
    source: envUiFrame, roots: ['Jj', 'Yj', 'Zj', 'uC'],
    bindings: ['MS', 'NS', 'PS', 'FS', 'IS', 'LS', 'RS', 'zS', 'BS', 'VS', 'GS', 'nC', 'aC', 'oC', 'sC', 'cC', 'lC', 'uC', 'dC', 'fC', 'qj', 'Jj', 'Yj', 'Zj', '$j'],
    officialExports: { vs: 'uC' },
    hosts: {
      Fn: ['/\\p{L}/u.exec(e)', '"rtl" : "ltr"'], Q: ['return Jt(c(e));'], us: ['"data-cds": "Icon"'], Uu: ['"data-cds": "Button"'], wn: [], Mt: ['text-[color:var(--cds-text-stays-secondary'],
      ga: [], JS: ['bg-fill-field shadow-field-ring'], YS: [':shadow-field-hover'], XS: ['focus-visible:shadow-focus'],
      ZS: ['has-[:focus-visible]:shadow-focus'], tC: ['h-control ps-md rounded'], HS: [], US: ['?.invalid ?? !1'], WS: ['?.disabled ?? !1'],
      jn: [], fg: [], Ln: ['typeof window < "u"'], J9: [], J0: [], J1: [], J2: [], J3: [], J4: [], J5: [], K0: [], K1: [], K2: [], K3: [], K4: [], K5: [], I1: [], I2: [], Z1: [],
    },
    imports: {
      X: `${envUiVendor}:io`, Z: `${envUiVendor}:wo`, l: `${envUiVendor}:Co`, W: `${envUiVendor}:To`, b: `${envUiVendor}:Ha`, G: `${envUiVendor}:Ua`,
      I: `${envUiVendor}:Mt`, o: `${envUiVendor}:At`, Ge: `${envUiVendor}:kt`, m: `${envUiVendor}:Et`, T: `${envUiVendor}:It`,
    },
    dependencies: {
      [`${envUiVendor}:io`]: react('forwardRef'), [`${envUiVendor}:wo`]: react('useState'), [`${envUiVendor}:Co`]: react('useRef'),
      [`${envUiVendor}:To`]: react('useSyncExternalStore'), [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiVendor}:Ua`]: react('jsxs'),
      // Base UI Field.Root / Field.Label / Field.Error / Field.Control and the labelable context (labelId/controlId).
      [`${envUiVendor}:Mt`]: ['initialControlId:e.initialControlId'], [`${envUiVendor}:At`]: ['nativeLabel:o=!0', '{labelId:u}=Gm()'],
      [`${envUiVendor}:kt`]: ['match:a', '{setMessageIds:f}=Gm()'], [`${envUiVendor}:Et`]: ['onValueChange:c', 'setDirty:_'], [`${envUiVendor}:It`]: ['function Gm(){return F(Wm)}'],
    },
    features: {
      MS: ['t.nativeEvent.defaultPrevented || e(t)'], NS: ['"search"'], PS: ['"data-cds-typed-dir"'],
      FS: ['e.removeAttribute("dir")'], IS: ['new WeakMap()'], LS: ['attributeFilter: ["dir"]'], RS: ['() => () => void 0'], BS: ['return !1'],
      VS: ['typeof document'], GS: ['labelId: e, controlId: t', '`${t}-label`'], zS: ['remountKey: a', '"password"', 'requestAnimationFrame'],
      nC: ['cds-input cds-reset min-w-0 flex-1 h-full'], aC: ['aC = tC'], oC: ['oC = nC'], sC: ['[&_[data-cds=Button]:not([data-cds-ghost])]:h-[var(--fhn)]'],
      cC: ['has-[[data-cds-end-slot]_[data-cds=Button]'], lC: ['"pe-[calc((var(--cds-h-control)-var(--cds-h-control-nested))/2)]"'],
      uC: ['"data-cds": "TextInput"', 'tooltip: !1', '"data-cds-end-slot": ""', 'wn("clear", "Clear")', '"pe-md"'], dC: ['e.preventDefault()'],
      fC: ['stopImmediatePropagation()'], qj: ['invalid: !0, disabled: !0'], Jj: ['"data-cds": "Field"', 'flex flex-col gap-xs font-sans', 'render: $j', '"onBlur"'],
      Yj: ['text-body font-medium leading-none text-primary'], Zj: ['"wrap-break-word"', 'name: "WarningCircle"', 'leading-snug text-danger'],
      $j: ['HS.Provider', 't.valid === !1'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-1 tK (2.42304.0 GV): the modifier keys the height hold Yt ignores, so
  // pressing only a modifier does not hold the dialog height.
  'environment-modifier-keys.mjs': {
    source: 'shared-1-BJhqMmkf.js', roots: ['tK'], bindings: ['tK'], officialExports: { _: 'tK' },
    features: { tK: ['"Alt"', '"AltGraph"', '"CapsLock"', '"Control"', '"Meta"', '"NumLock"', '"ScrollLock"', '"Shift"'] },
  },
  // W9 cc-rest-env-model (3.6556.2): shared-78 QW over ZW (exported Ls; 2.42304.0 shared-104 Fl over Pl): the common CDS
  // copy; the folder row labels its X "Remove {item}" from it. 3.6556.2 adds scroll/emoji/chart keys and drops share.
  'environment-common-copy.mjs': {
    source: 'shared-78-D5Fw2h0a.js', roots: ['QW'], bindings: ['ZW', 'QW'], officialExports: { Ls: 'QW' },
    features: { ZW: ['return e;'], QW: ['removeItem: { defaultMessage: "Remove {item}", id: "GHRzoS0vqm" }', 'scrollBack: { defaultMessage: "Scroll back"'] },
  },
  // cc-rest-env-ui: environment-checkbox.mjs is no longer sliced. 3.6556.2 shared-frame xP (2.42304.0 wA) is the CdsCheckbox
  // view-tabs publishes; the emit re-exports it from ../view-tabs/shared-frame-6jtSkIit.js (not the facade, R6/E41), so
  // the folder row's Worktree box is the official Base UI checkbox and disabled-reason wrapper.
  // W9 cc-rest-env-model (3.6556.2): shared-46 qx/Jx/Yx/iS/zL (with Gx, VL; 2.42304.0 shared-19 ZB/QB/$B/sV/A7, YB, j7), the
  // environment picker's star keys. A local preset stars as machine-preset:<id> (qx over Gx), either form lists it (Jx,
  // iS); This computer stars as local:this-computer (Yx) and is labelled by zL/VL. The starred store is the host's.
  'environment-picker-keys.mjs': {
    source: 'shared-46-BIbZBGFq.js', roots: ['qx', 'Jx', 'Yx', 'iS', 'zL'], bindings: ['Gx', 'qx', 'Jx', 'Yx', 'iS', 'VL', 'zL'],
    officialExports: { go: 'qx', _o: 'Jx', po: 'Yx', yo: 'iS', w: 'zL' },
    features: {
      Gx: ['local: !0', 'ssh: !0', 'cloud: !1', 'bridge: !1'], qx: ['`machine-preset:${e.id}`', '`preset:${e.id}`'],
      Jx: ['[`preset:${e.id}`, `machine-preset:${e.id}`]'], Yx: ['"local:this-computer"'], iS: ['t.some((t) => e.includes(t))'],
      VL: ['"This computer"', '"Red8UM0oCv"'], zL: ['return VL(e)'],
    },
  },
  // W9 cc-rest-env-model (3.6556.2): c3f9f1667-DnyzRZCB L (exported d; 2.42304.0 Me) over I, now React Compiler output:
  // whether this machine has any local environment variable beyond CLAUDE_CONFIG_DIR / CLAUDE_CODE_TMPDIR, queried while
  // the picker is open and re-read after a save (F's revision). The compiler hoisted the callbacks: z (any key passes
  // B), R (a failure counts as having variables), V (the revision selector). The desktop bridge f (shared-0 lh =
  // LocalSessionEnvironment) and the revision store F are host-provided.
  'environment-machine-variables.mjs': {
    source: 'c3f9f1667-DnyzRZCB.js', roots: ['L'], bindings: ['I', 'L', 'z', 'R', 'B', 'V'], officialExports: { d: 'L', u: 'I' },
    hosts: { F: ['revision: 0', 'bump: () =>'] },
    ...v3Imports([
      ['a', ...v3React('wo', 'useState')], ['r', ...v3React('ho', 'useEffect')], ...v3Memo('J9 J1 J2 K1 K3'),
      ['f', 'shared-0-DDOOdL6P.js:lh', ['?.LocalSessionEnvironment']],
    ]),
    features: {
      I: ['"CLAUDE_CONFIG_DIR"', '"CLAUDE_CODE_TMPDIR"'], B: ['!I.includes(e.toUpperCase())'], z: ['Object.keys(e).some('],
      R: ['return !0;'], V: ['return e.revision;'],
      L: ['{ has: !1, revision: t }', '!e || !f?.get', '.then(z)', '.catch(R)', 'i.has && i.revision === t'],
    },
  },
  // cc-rest-env-ui: 3.6556.2 cc43287c9-Me-M2ucD m8/Rae/zae/uoe/w8/D8/M8 (2.42304.0 k0/A0/j0/e2/a2/l2/p2): React Compiler
  // output (Rae returns through react.early_return_sentinel); same props and copy. The menu body stays the host's
  // (source-environment-menu.jsx). K (CdsDropdown) is the host picker menu and Ta (shared-46 aS, the starred store's
  // toggle) the host toggle; the row actions, star keys and machine-variable query are the generated modules.
  'environment-menu-rows.mjs': {
    source: 'cc43287c9-Me-M2ucD.js', roots: ['m8', 'Rae', 'zae', 'uoe', 'w8', 'D8', 'M8'], bindings: ['m8', 'Rae', 'zae', 'uoe', 'w8', 'D8', 'M8'],
    officialExports: {},
    imports: {
      p: `${envUiVendor}:Ha`, v: `${envUiVendor}:Ua`, y: `${envUiVendor}:Va`, K: `${envUiFrame}:Jo`, ve: `${envUiFrame}:ad`, Q: `${envUiIntl}:l`, qd: `${envUiIntl}:p`,
      OE: 'c227f4d5e-B-FYKrwT.js:En', vO: 'c227f4d5e-B-FYKrwT.js:bn', ok: 'c227f4d5e-B-FYKrwT.js:wn', OD: 'c227f4d5e-B-FYKrwT.js:Tn', _E: 'c227f4d5e-B-FYKrwT.js:Cn',
      Ta: 'shared-46-BIbZBGFq.js:So', Ia: 'shared-46-BIbZBGFq.js:go', Aa: 'shared-46-BIbZBGFq.js:_o', Qa: 'shared-46-BIbZBGFq.js:yo', Ja: 'shared-46-BIbZBGFq.js:w',
      hR: 'c3f9f1667-DnyzRZCB.js:d', ...envUiMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5 I2 I5 Z1').imports,
    },
    dependencies: {
      [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiVendor}:Ua`]: react('jsxs'), [`${envUiVendor}:Va`]: react('Fragment'),
      [`${envUiFrame}:Jo`]: ['TriggerButton:kT', 'SearchablePopup:IT', 'GroupLabel:_T', 'Submenu:pT', 'SubmenuTrigger:fT'], [`${envUiFrame}:ad`]: ['onRemove:s,removeLabel:l'],
      [`${envUiIntl}:l`]: ['"MemoizedFormattedMessage"'], [`${envUiIntl}:p`]: ['let e=a(K);return Mt(e),e'],
      'c227f4d5e-B-FYKrwT.js:En': ['x()==="rtl"?"ArrowLeft":"ArrowRight"'], 'c227f4d5e-B-FYKrwT.js:bn': ['role:"menuitemradio","aria-checked":!1'],
      'c227f4d5e-B-FYKrwT.js:wn': ['icon:"Settings"'], 'c227f4d5e-B-FYKrwT.js:Tn': ['"env-picker-unstar"'], 'c227f4d5e-B-FYKrwT.js:Cn': ['", edit environment, right arrow"'],
      'shared-46-BIbZBGFq.js:So': ['toggleStarred:r}=Kx.getState()'], 'shared-46-BIbZBGFq.js:go': ['`machine-preset:${e.id}`:`preset:${e.id}`'],
      'shared-46-BIbZBGFq.js:_o': ['return[`preset:${e.id}`,`machine-preset:${e.id}`]'], 'shared-46-BIbZBGFq.js:yo': ['return t.some(t=>e.includes(t))'],
      'shared-46-BIbZBGFq.js:w': ['return VL(e)'], 'c3f9f1667-DnyzRZCB.js:d': ['f.get().then(z).catch(R)'],
      ...envUiMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5 I2 I5 Z1').dependencies,
    },
    features: {
      m8: ['labelDir: "auto"', '"env-picker-environment"', 'edit: !0'],
      Rae: ['(e.target?.kind ?? "local") === t', 'e.name.toLowerCase().includes(s)', '"react.early_return_sentinel"'],
      zae: ['"env-picker-new-environment"', 'defaultMessage: "New environment"', '"YxxUA60sT0"'],
      uoe: ['"env-picker-this-computer"', '"Desktop only"', 'className: "size-icon shrink-0"', '", downloads the Claude desktop app"'],
      w8: ['`preset:${e.id}`'], D8: ['px-md py-sm text-footnote text-muted-as-secondary'], M8: ['"No matches"', '"96GJ5wSQam"'],
    },
  },
  // cc-rest-env-ui: 3.6556.2 shared-frame Select pieces of the Folders field's "+ Add" control (2.42304.0 HO/UO/WO/qO/PO/dk/
  // fk/pk/rk/xk/Sk/tA -> vM/yM/bM/CM/uM/WM/GM/KM/FM/tN/nN/QN). 3.6556.2 moved group/cbx out of the base class QS into
  // vM = `group/cbx ${QS}`, which is what the official trigger composes (`${vM} ${yM[…]} ${bM[…]}`), so the trigger
  // class export is vM. The field rings (JS/YS/ZS), cdsClassNames (Q), CdsIcon (us), CdsIconSlot (_s) and the React
  // Compiler helpers are view-tabs semantic names (R3, no second CDS copy); the helpers' bodies are pinned by
  // tests/official-3-6556-2.test.mjs, so they carry no feature here.
  'environment-select-parts.mjs': {
    source: envUiFrame, roots: ['vM', 'yM', 'bM', 'CM', 'uM', 'WM', 'GM', 'KM', 'FM', 'tN', 'nN', 'QN'],
    bindings: ['QS', '$S', 'uM', 'vM', 'yM', 'bM', 'CM', 'FM', 'WM', 'GM', 'KM', 'tN', 'nN', 'QN'],
    officialExports: { Es: 'QS' },
    hosts: {
      JS: ['bg-fill-field shadow-field-ring'], YS: [':shadow-field-hover'], ZS: ['has-[:focus-visible]:shadow-focus'], Q: ['return Jt(c(e));'],
      us: ['"data-cds": "Icon"'], _s: ['{ icon: t, firstLine: n } = e'], J9: [], J1: [], J5: [], K1: [], K4: [], K5: [],
    },
    imports: { X: `${envUiVendor}:io`, b: `${envUiVendor}:Ha`, G: `${envUiVendor}:Ua` },
    dependencies: { [`${envUiVendor}:io`]: react('forwardRef'), [`${envUiVendor}:Ha`]: react('jsx'), [`${envUiVendor}:Ua`]: react('jsxs') },
    features: {
      QS: ['"cds-reset inline-flex items-center gap-1.5 h-control rounded'], $S: ['`${JS} ${YS}`'], vM: ['`group/cbx ${QS}`'],
      uM: ['px-md py-1.5 text-body text-muted select-none'], yM: ['outline: $S', 'has-[[aria-haspopup][aria-expanded=true]]:bg-fill-ghost-hover'],
      bM: ['select: `ps-0 ${ZS} data-[disabled]:cursor-default`'],
      CM: ['cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch ps-sm text-start'], FM: ['border-b-[var(--cds-border)]', 'placeholder:text-muted'],
      WM: ['`empty:hidden ${uM}`'], GM: ['mx-pad-md mt-1 h-px shrink-0 bg-border'], KM: ['"shrink-0 pt-1"'],
      tN: ['.normalize("NFD")', '\\p{Diacritic}'], nN: ['tN(e.label).includes(n) || tN(e.value).includes(n)'],
      QN: ['min-h-control px-md rounded', 'hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover', 'className: "text-muted"'],
    },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const exportTable = bytes => new Map(([...bytes.matchAll(/export\s*\{([^}]*)\}/g)].pop()?.[1] ?? '').split(',')
  .map(s => s.trim().split(/\s+as\s+/)).filter(([l]) => l).map(([l, e]) => [e ?? l, l]));
const escape = name => name.replace(/\$/g, '\\$');

// Returns the pinned binding list, which is what the emit slices; `run` false (target skipped by --only) skips the checks.
export async function pinEnvironmentHelper(target, directory, run = true) {
  const pin = environmentHelperPins[target];
  if (!pin) throw Error(`No environment pin for ${target}`);
  if (!run) return [...pin.bindings];
  const label = `${target} (${pin.source})`;
  const raw = await fs.readFile(path.join(directory, pin.source), 'utf8');
  const code = await format(raw, { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = exportTable(code);
  const declaration = name => {
    const p = program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => code.slice(p.node.start, p.node.end);
  const missing = (name, features = []) => {
    const found = features.filter(f => !text(declaration(name)).includes(f));
    if (found.length) throw Error(`${label}: ${name} lacks ${found.map(f => JSON.stringify(f)).join(', ')}`);
  };
  for (const [alias, local] of Object.entries(pin.officialExports ?? {}))
    if (alias !== local && exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  for (const [name, features] of Object.entries(pin.features)) missing(name, features);
  for (const [name, features] of Object.entries(pin.hosts ?? {})) missing(name, features);
  // The same-chunk closure of the roots, stopping at imports and at the host-replaced locals.
  const closure = new Set(), imports = new Map();
  const visit = name => {
    if (closure.has(name) || pin.hosts?.[name]) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      imports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    const p = binding.path;
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  const listed = [...pin.bindings].sort(), reached = [...closure].sort();
  if (JSON.stringify(listed) !== JSON.stringify(reached)) throw Error(`${label}: closure of ${pin.roots.join(',')} is ${reached.join(',')}, emit lists ${listed.join(',')}`);
  const expectedImports = JSON.stringify(Object.entries(pin.imports ?? {}).sort());
  const actualImports = JSON.stringify([...imports].sort());
  if (actualImports !== expectedImports) throw Error(`${label}: replaced imports are ${actualImports}, expected ${expectedImports}`);
  // Each replaced import still names the same export of its vendor/shared chunk, checked on the shipped bytes. Vendor
  // chunks reuse short locals across inlined modules, so any declaration of the local that carries the features passes.
  for (const [via, check] of Object.entries(pin.dependencies ?? {})) {
    const [file, alias] = via.split(':');
    const bytes = await fs.readFile(path.join(directory, file), 'utf8');
    const local = exportTable(bytes).get(alias);
    if (!local) throw Error(`${label}: ${file} no longer exports ${alias}`);
    if (check.react) {
      if (!new RegExp(`(?<![\\w$.])${escape(local)}=[\\w$]+\\.${check.react}\\b`).test(bytes))
        throw Error(`${label}: ${file} ${alias} (${local}) no longer resolves to React ${check.react}`);
      continue;
    }
    // 3.6556.2 (W9 cc-rest-env-model): see v3React / v3Memo above.
    if (check.vendor) {
      if (file !== official.vendorFrame) throw Error(`${label}: ${via} is not the 3.6556.2 vendor-frame`);
      official.assertVendorAlias(bytes, alias, check.vendor);
      continue;
    }
    if (check.viewTabs) {
      const entry = (await viewTabsManifestFor(official.referenceVersion)).publicNames?.[check.viewTabs];
      if (entry?.file !== file || entry.export !== alias) throw Error(`${label}: ${via} is not view-tabs ${check.viewTabs} (${JSON.stringify(entry)})`);
      continue;
    }
    const features = Array.isArray(check) ? check : check.features, size = Array.isArray(check) ? 1200 : check.window;
    const starts = [...bytes.matchAll(new RegExp(`(?:function ${escape(local)}\\(|(?<![\\w$.])${escape(local)}=)`, 'g'))].map(m => m.index);
    if (!starts.length) throw Error(`${label}: ${file} ${alias} (${local}) has no declaration`);
    if (!starts.some(start => features.every(f => bytes.slice(start, start + size).includes(f))))
      throw Error(`${label}: ${file} ${alias} (${local}) lacks ${features.map(f => JSON.stringify(f)).join(', ')}`);
  }
  return [...pin.bindings];
}
