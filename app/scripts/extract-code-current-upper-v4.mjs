// Code current (upper), 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region
// code-current:upper; region-plan largeRegionSplits code-current step cc-upper): the twelve "upper" modules of
// src/generated/code-current (3.6556.2, scripts/extract-code-ui-current.mjs, not changed here) re-located in the frozen
// 4.16336.0 snapshot and cut into the isolated graph src/generated/code-current-upper-v4. The base graph
// src/generated/code-current-v4 (scripts/extract-code-current-v4.mjs) is not touched: this graph extends it by linking
// it (region-plan rule: "upper 输出到独立目录 … 让两个 manifest 各自版本一致"), so the base --check is unchanged and the
// upper modules, which import sessions-page / session-rail-changes / session-rail-kit / files-changes / sidebar
// (the 9-region SCC edges), do not make code-current-v4 depend on graphs that themselves link code-current-v4.
// Staged double output: nothing imports this graph until the code-current cutover (the 3.6556.2 consumers
// source-titlebar*.jsx, source-file-breadcrumb.jsx, source-terminal-selection.jsx, … keep reading code-current).
//
// Roots (4.16336.0 chunk#local; 3.6556.2 module and local in brackets):
//   c73f45bc3-C7dtUSq8  ex TitlebarSpawnLead (export N)       [titlebar-spawn-lead ay]   Nb TitlebarOriginLabel [Bv]
//                       wb originPillBase  [jv]  vb originPillSize [Tv]  yb originPillPanelsSize [Ev]
//                       Eb originPillStaticClass [Nv]  Ob originPillStaticPanelsClass [Fv]
//                       Db folderPillTriggerClass [titlebar-folder-pill Pv]  kb folderPillTriggerPanelsClass [Iv]
//                       mb useEpisodeSeed (export P)          [titlebar-seed-latch xv]
//   shared-92-BOgyxePb  Jk spawnOrigin (export Yf)            [titlebar-spawn-origin shared-52 nA]
//   ceb49ada3-COAk5936  u  SelectionActionBar (export t)      [terminal-action-bar u]
//   cc3b500c8-zdjI6Jju  C  EnvironmentDeleteQuestionHost (t)  [environment-delete-question x]
//                       S  askEnvironmentDelete (export r) [b]   v environmentDeleteQuestionText [g]
//                       _  environmentDeleteQuestionMessages [h]
//   cd2efac6e-B38TGyig  wm FileBreadcrumb [breadcrumb-file Wf]   dd BreadcrumbBody [breadcrumb-view Vl]
//                       pd BreadcrumbFileName [Ul]  md BreadcrumbSegment [Wl]  hd BreadcrumbSegmentLabel [Gl]
//                       fd BreadcrumbSizerText [Hl]  ld preventBreadcrumbNativeMenu [zl]
// Re-exports (FACADES): a 3.6556.2 upper module that only re-exported another area's binding now re-exports the
// 4.16336.0 binding from the -v4 area that holds and exports it (D1: never cut again); each official binding is located on
// the AST like a root (unique declaration carrying its features, raw declaration sha256 pinned) and the linked manifest
// must hold it under the export name used.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here), as
// extract-session-rail-changes-v4.mjs: sourceContract scripts/official-4.16336.0.mjs, sharedGraph 'cds-core' (manifest
// sha256 pinned), linkedAreas (D1), host boundaries as localAdapters re-exported by
// src/source-code-current-upper-v4-adapters.jsx (each original pinned by features and raw declaration sha256).
// No pin is ever refreshed by a script (`--locate` prints them for review).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CODE_CURRENT_UPPER_V4_OUTPUT = 'src/generated/code-current-upper-v4';
const ADAPTER_FILE = 'src/source-code-current-upper-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const TITLEBAR = 'c73f45bc3-C7dtUSq8.js';
export const S92 = 'shared-92-BOgyxePb.js';
export const ACTION_BAR = 'ceb49ada3-COAk5936.js';
export const ENV_DELETE = 'cc3b500c8-zdjI6Jju.js';
export const VIEWER = 'cd2efac6e-B38TGyig.js';
export const SESSIONS = 'cbd6c85c8-CxDdK_2w.js';
export const SIDEBAR = 'shared-57-grpFrBWt.js';

// ── Roots: file -> local -> { name, module (the 3.6556.2 semantic module it belongs to), export (the chunk's own
// alias, null: chunk-internal), probe (raw), features (prettier form) } ─────────────────────────────────────────────
export const ROOTS = {
  [TITLEBAR]: {
    ex: { name: 'TitlebarSpawnLead', module: 'titlebar-spawn-lead', export: 'N', probe: '"data-slot":"origin-ghost"',
      features: ['{ origin: t, title: n, bare: a } = e,', 'defaultMessage: "Loading session",', 'id: "IY7S4mLrkm",', 'connection: t.kind === "local" ? void 0 : "connecting",',
        '"size-[18px] motion-safe:animate-pulse rounded bg-alpha-1"', 'repository: t.kind === "remote"', 'role: "status",', 'className: "flex min-w-0 items-center",'] },
    Nb: { name: 'TitlebarOriginLabel', module: 'titlebar-spawn-lead', export: null, probe: '"data-testid":"epitaxy-origin-label"',
      features: ['{ label: t, environmentName: n, repository: a } = e,', '"data-testid": "epitaxy-origin-environment",', '"data-testid": "epitaxy-origin-label",', '? Il : "Folder",'] },
    wb: { name: 'originPillBase', module: 'titlebar-spawn-lead', export: null, probe: 'before:bg-alpha-2 ${t} min-w-0',
      features: ['return `${e} before:bg-alpha-2 ${t} min-w-0 group-data-[pills-compact]/lead:min-w-fit group-data-[pills-compact]/lead:shrink-0`;'] },
    vb: { name: 'originPillSize', module: 'titlebar-spawn-lead', export: null, probe: 'vb=_b("h-[20px] px-1.25")', features: ['var vb = _b("h-[20px] px-1.25");'] },
    yb: { name: 'originPillPanelsSize', module: 'titlebar-spawn-lead', export: null, probe: 'yb=_b("h-control px-3")', features: ['var yb = _b("h-control px-3");'] },
    Eb: { name: 'originPillStaticClass', module: 'titlebar-spawn-lead', export: null, probe: 'Eb=wb(vb,"text-secondary")', features: ['var Eb = wb(vb, "text-secondary");'] },
    Ob: { name: 'originPillStaticPanelsClass', module: 'titlebar-spawn-lead', export: null, probe: 'Ob=wb(yb,"text-secondary")', features: ['var Ob = wb(yb, "text-secondary");'] },
    Db: { name: 'folderPillTriggerClass', module: 'titlebar-folder-pill', export: null, probe: 'Db=Tb(wb(vb,"text-secondary-control"))',
      features: ['var Db = Tb(wb(vb, "text-secondary-control"));'] },
    kb: { name: 'folderPillTriggerPanelsClass', module: 'titlebar-folder-pill', export: null, probe: 'kb=Tb(wb(yb,"text-secondary-control"))',
      features: ['var kb = Tb(wb(yb, "text-secondary-control"));'] },
    mb: { name: 'useEpisodeSeed', module: 'titlebar-seed-latch', export: 'P', probe: '()=>e||void 0',
      features: ['K1($, 0, e, () => e || void 0)', '(a !== r && i(a), e ?? a)'] },
  },
  [S92]: {
    Jk: { name: 'spawnOrigin', module: 'titlebar-spawn-origin', export: 'Yf', probe: 'isScratchWorkspace:e.isScratchWorkspace===!0',
      features: ['type: e.type,', ': (e.repoInfo?.name ?? (e.cwd ? pk(e.cwd) : void 0)),', 'remote: e.remote,', 'isScratchWorkspace: e.isScratchWorkspace === !0,'] },
  },
  [ACTION_BAR]: {
    u: { name: 'SelectionActionBar', module: 'terminal-action-bar', export: 't', probe: 'group-hover/split:opacity-0 group-focus-within/split:opacity-0',
      features: ['{ actions: f } = u,', 'if (f.length === 0) return null;', '!rounded group/split flex', 'pressedVariant:', '"aria-keyshortcuts": i.shortcut'] },
  },
  [ENV_DELETE]: {
    C: { name: 'EnvironmentDeleteQuestionHost', module: 'environment-delete-question', export: 't', probe: '{question:t},t.key',
      features: ['t = y(D),', 'e(E, { question: t }, t.key)'] },
    S: { name: 'askEnvironmentDelete', module: 'environment-delete-question', export: 'r', probe: 'y.getState().pending?.resolve(null),x+=1',
      features: ['y.getState().pending?.resolve(null),', 'y.setState({ pending: { ...e, key: x, resolve: t } })'] },
    v: { name: 'environmentDeleteQuestionText', module: 'environment-delete-question', export: null, probe: 'someRanElsewhere:a=!1',
      features: ['someRanElsewhere: a = !1,', 'e.formatMessage(_.ranElsewhere)', 'o.join(" ")'] },
    _: { name: 'environmentDeleteQuestionMessages', module: 'environment-delete-question', export: null, probe: 'id:"1sJ0FTOE0U"',
      features: ['defaultMessage: "Delete environment?",', 'id: "1sJ0FTOE0U",'] },
  },
  [VIEWER]: {
    wm: { name: 'FileBreadcrumb', module: 'breadcrumb-file', export: null, probe: 'id:"qf/DkufjnS"',
      features: ['askIfGone: m,', 'renderSegmentMenu: p,', 'defaultMessage: "Copy path {path}",', 'id: "qf/DkufjnS",',
        '"text-body font-normal font-control text-secondary flex min-w-0 -mx-0.75"', '\'[data-cds="Toolbar"], [role="toolbar"]\''] },
    dd: { name: 'BreadcrumbBody', module: 'breadcrumb-view', export: null, probe: '"data-file-breadcrumb":!0',
      features: ['askIfGone:', '"data-file-breadcrumb": !0,', '"[data-breadcrumb-segment]"'] },
    pd: { name: 'BreadcrumbFileName', module: 'breadcrumb-view', export: null, probe: 'e.length<20?0:e.at(-13)',
      features: ['e.length < 20 ? 0 : e.at(-13)', '"absolute inset-0 truncate text-start select-none"'] },
    md: { name: 'BreadcrumbSegment', module: 'breadcrumb-view', export: null, probe: '{gone:b,beforeOpen:x}=ua(y,y)',
      features: ['askIfGone: f,', '{ gone: b, beforeOpen: x } = ua(y, y);', 'u?.({ ...v, gone: b })', 'beforeOpen: x,'] },
    hd: { name: 'BreadcrumbSegmentLabel', module: 'breadcrumb-view', export: null, probe: '.listsDir===void 0', features: ['.listsDir === void 0', 'dirLabel:'] },
    fd: { name: 'BreadcrumbSizerText', module: 'breadcrumb-view', export: null, probe: 'before:content-[attr(data-text)]', features: ['before:content-[attr(data-text)]'] },
    ld: { name: 'preventBreadcrumbNativeMenu', module: 'breadcrumb-view', export: null, probe: 'e.currentTarget.contains(e.target)&&e.preventDefault()',
      features: ['e.currentTarget.contains(e.target) && e.preventDefault();'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c73f45bc3-C7dtUSq8.js#ex': '6016aec5a748aadd34f87de7e10b8d6e9e3260f421e8b6bab961dcd1de5d8225',
  'c73f45bc3-C7dtUSq8.js#Nb': '75b5492c52a3e8a73768d918a89fb0e4b7b9d8743a3c10ea8f5f3c62d1facb99',
  'c73f45bc3-C7dtUSq8.js#wb': 'cb541209a68e7d183a084b7c022f4b8a68401eecc4475d2d99fc43362d965c6f',
  'c73f45bc3-C7dtUSq8.js#vb': '3b112d87c95c2dde99f220023491fc2a06513dae0478aa5a70fd956bc3e4b36e',
  'c73f45bc3-C7dtUSq8.js#yb': '2e46db162952e62746f18e8c93dc6feda560d20ccac51a3a3f2ab2c08623d6cd',
  'c73f45bc3-C7dtUSq8.js#Eb': 'eb60f081a8fcfaf38596d4214324a7ab846cf99603c1b12f57ec9140f89906f1',
  'c73f45bc3-C7dtUSq8.js#Ob': 'c2f24ba03c8d4295dbe5fab6dbd9846aecc6c2fd5eb49309a636b909e1ecd49c',
  'c73f45bc3-C7dtUSq8.js#Db': 'a019383718b673d45fb3e2fbc6c745d42f462688866a28c0e350a5816c25878b',
  'c73f45bc3-C7dtUSq8.js#kb': '52010796a5bcdc913a48bca36d8ea03eada0d1f1d9d4351ccd8c1edf069c9364',
  'c73f45bc3-C7dtUSq8.js#mb': 'b34e16de92c9f0eee8f4ad41cbbde3ba5cb6e8c072f67fd9b3ae5a532109caa2',
  'shared-92-BOgyxePb.js#Jk': 'a4829d532e9511c614a1efeb3d3b7da03302c5b36048f7ae82fcaa15e89fb9c3',
  'ceb49ada3-COAk5936.js#u': 'ae3d593ae7ce6181ac38bd1b17c0519c1d7dccce72b9737127f2cb6631ffe8c4',
  'cc3b500c8-zdjI6Jju.js#C': 'bd7f0cc4c70f6bd92965e27bef82cdff72281d8eb3d369f6a1a79e6f3bbf9a53',
  'cc3b500c8-zdjI6Jju.js#S': 'c7da65a34a5dba90761b6531cc76128b68ea4db947bc9902ee33dcfdcd646cb9',
  'cc3b500c8-zdjI6Jju.js#v': '448820c959cc6ba17db916e2be58cd42d8aa9f18830762df4901c6cfd5bab877',
  'cc3b500c8-zdjI6Jju.js#_': '5cd34a9436e28716555dfcdacff6de4d0b0cfca018e27f3354f73d7050a6403b',
  'cd2efac6e-B38TGyig.js#wm': '1babe488d8dc0c1ceb5253246c1cc93a9d1a9d29b8a8a5c3ef1447fd755136a2',
  'cd2efac6e-B38TGyig.js#dd': '4362933432d1302cbc1b98a63539eb9393ad681318c287442e60dcc44b6d5b16',
  'cd2efac6e-B38TGyig.js#pd': 'fe6ddd82d92a5fb8cdbff7c29d7be1afdc41dfb96b93535b019e83dda1987a64',
  'cd2efac6e-B38TGyig.js#md': '889cec1373664398fd2ec05420a289afa4b7ddd443ee601c12355fe0cfb9dcec',
  'cd2efac6e-B38TGyig.js#hd': '8fbfe897dee5b38b0c72211015f1b52c48e014d3487ac0a16a99db8382c1cad5',
  'cd2efac6e-B38TGyig.js#fd': '7ab8d5f0e95f2fb0644ddb97beae28e8ccab9e69873a22991d3ac9d7e4bb08dd',
  'cd2efac6e-B38TGyig.js#ld': 'fbe6a9779fec092b51888670908aaf44c3a6d0c39d9384c8b9c3c035018f2d9b',
};

// ── Facades: semantic module -> export name -> { file, local, area, probe, features } ─────────────────────────────────
export const FACADES = {
  // 3.6556.2 sessions-page-view.mjs re-exported sessions-page's Hf (the whole Sessions page). Its 4.16336.0 counterpart
  // cbd6c85c8 hm is held and exported by sessions-page-v4 (scripts/extract-sessions-page-v4.mjs ROOTS hm).
  'sessions-page-view': {
    SessionsPageView: { file: SESSIONS, local: 'hm', area: 'sessions-page-v4', probe: 'reportsRecentsLoad:t,codeScoped:n',
      features: ['let $ = J9(616),', 'reportsRecentsLoad: t,', 'codeScoped: n,', 'renderCodeRowActions: r,', 'codeRowLinkComponent: u,'] },
  },
  // round-4 real-b sidebar lane (RW8-NAV-1, round4/relink-w8/patches/frame-sidebar-nav-linkExports-request.json): the 3.6556.2
  // sidebar modules whose 4.16336.0 counterparts sit in shared-57-grpFrBWt.js, cut whole by frame-sidebar-nav. That graph
  // exports them now (yS / Kg linkExports since round-4 addendum B W8B-N1; fS / Bg / s_ / c_ / r_ sharedExports) and is
  // wired (main.jsx mounts the official nav body, frame-sidebar-nav-body.jsx), so they become facades onto it (D1: never
  // cut again here). 3.6556.2 sidebar-nested-caret cut g1 (props headId / title / hidden, the row caret) and l1 (props
  // toggle / expanded / className / muted / caret / children, the container toggle): 4.16336.0 yS and fS, same props.
  'sidebar-nested-caret': {
    SidebarContainerToggle: { file: SIDEBAR, local: 'fS', area: 'frame-sidebar-nav', probe: '"data-container-icon":""',
      features: ['toggle: t,', 'expanded: n,', 'caret: o,', '"data-container-icon": "",', 'onPointerDown: hS,'] },
    SidebarNestedCaret: { file: SIDEBAR, local: 'yS', area: 'frame-sidebar-nav', probe: '"row_caret"',
      features: ['{ headId: t, title: n, hidden: r } = e,', 'us(t, "row_caret"),'] },
  },
  // 3.6556.2 sidebar-filter-controls re-exported sidebar-sections' Group and sort menu parts; four of them are located in
  // 4.16336.0 shared-57 (the messages Bg, the option / sort menus s_ / c_, the reset items r_). The rest stay in NOT_PORTED.
  'sidebar-filter-controls': {
    sidebarFilterMessages: { file: SIDEBAR, local: 'Bg', area: 'frame-sidebar-nav', probe: 'id:"wib5ZqAv1q"',
      features: ['groupAndSort: { defaultMessage: "Group and sort", id: "wib5ZqAv1q" },', 'emptyGroups: { defaultMessage: "Empty groups", id: "72eO6R57Yo" },'] },
    SidebarOptionMenu: { file: SIDEBAR, local: 's_', area: 'frame-sidebar-nav', probe: 'disabledValues:f,keepOpen:p',
      features: ['separatorBefore: l,', 'disabledValues: f,', 'keepOpen: p,'] },
    SidebarSortMenu: { file: SIDEBAR, local: 'c_', area: 'frame-sidebar-nav', probe: 'onAscendingChange:s',
      features: ['ascending: a,', 'onAscendingChange: s,'] },
    SidebarViewResetItems: { file: SIDEBAR, local: 'r_', area: 'frame-sidebar-nav', probe: '{atDefaults:t,onReset:n}=e',
      features: ['{ atDefaults: t, onReset: n } = e,'] },
  },
};
export const FACADE_PINS = {
  'cbd6c85c8-CxDdK_2w.js#hm': '3fb4c43f629991d2b75395cb9237841d58f0b42ecd9044111fda5b1ac80c7464',
  // RW8-NAV-1 (round-4 real-b sidebar lane; `--locate` output, reviewed).
  'shared-57-grpFrBWt.js#fS': 'c5217e1b09a50c2f9e292979ba4043c29a6e617e60ca270d9bd96d1787af0ad2',
  'shared-57-grpFrBWt.js#yS': 'eb4f3498a94f759c3263f85702b8f3e2d585535f341231f88a023d203f877bd6',
  'shared-57-grpFrBWt.js#Bg': '63407e9fa9fa9d715a89fb5ec50bde9c7f1011092f30d4f0d17430e492d73504',
  'shared-57-grpFrBWt.js#s_': '01732795b7481f57134d5ac1960cd76e29136d9eb2b0f136bdf7cc1eb3fafbe6',
  'shared-57-grpFrBWt.js#c_': '6dcc6523b8fd94c4419bfe48a785386b687b2af1ff0dc8a40dba5d79fa41717a',
  'shared-57-grpFrBWt.js#r_': '944993e9f30b8a1415a30bc38dd9cfdb6d05c45a4f362da824a8beb9a7541eaa',
};

// ── Host boundaries: file#local -> { name, from, features } ────────────────────────────────────────────────────────
const RAIL_CHANGES = 'src/source-session-rail-changes-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl useIntl / FormattedMessage over the local catalog (3.6556.2: useStartIntl / StartMessage of
  // source-code-start-adapters.jsx; the 4.16336.0 graphs answer vendor-intl q / Gt with the kit's adapters, as
  // session-rail-changes-v4 does). Read by cc3b500c8 h (useIntl), cd2efac6e Rn (useIntl) and c73f45bc3 Z (FormattedMessage).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RAIL_CHANGES, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RAIL_CHANGES, features: ['var Gt = a(Wt, Ut);'] },
};
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!ADAPTER_PINS[key]) throw Error(`adapter ${key}: no reviewed pin`);

// Pure bindings a linked area cuts without exporting, cut again here (each with its reason).
const linkedCopies = {};

export const LINKED_AREA_NAMES = ['code-current-v4', 'files-changes-v4', 'session-rail-kit-v4', 'session-rail-changes-v4', 'session-rail-sections-v4',
  'sessions-page-v4', 'routines-shared-v4', 'code-composer-v4', 'code-editor-current-v4', 'cowork-scheduled-v4', 'cowork-progress-v4', 'r3b-transcript-v4'];
async function linkedAreas() {
  const out = [];
  for (const area of LINKED_AREA_NAMES) {
    const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    out.push(m.modules.some(x => !x.source) ? { area, modules: m.modules.filter(x => x.source).map(x => x.target) } : area);
  }
  return out;
}

// Roots held back until a linked area exports what they need (D1: module state is never cut twice); none today. cd2efac6e
// dd (BreadcrumbBody) reads cd8a7d7c0 g (`t(m)`: use of the path display options context m = createContext({})) and _
// (the hover options context h); r3b-transcript-v4 path-display-options.mjs holds m and h (it renders their provider v,
// PathDisplayOptionsProvider). dd and wm (FileBreadcrumb, which renders dd) waited here until r3b-transcript-v4 exported
// m (linkExports ['m'], round 3 relink task rl-queued-bar-pierre): now g is cut here and links that one context.
// The generator checks every entry left here on each run (a met need stops the run so the root moves back).
export const PENDING_ROOTS = {};
const emitted = (file, roots) => Object.fromEntries(Object.entries(roots).filter(([local]) => !PENDING_ROOTS[`${file}#${local}`]));
async function assertPending() {
  const out = [];
  for (const [key, p] of Object.entries(PENDING_ROOTS)) {
    for (const need of p.needs) {
      const [file, local] = need.binding.split('#');
      const link = await linkedExportOf(need.area, file, local);
      if (!link) throw Error(`${key} (${p.name}): ${need.area} no longer holds ${need.binding}; review the pending root`);
      if (link.name) throw Error(`${key} (${p.name}): ${need.area} now exports ${need.binding}; move the root back`);
    }
    out.push({ root: key, ...p });
  }
  return out;
}
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+(?:-\d+)?|preload-helper|rolldown-runtime|c[0-9a-f]+)-[\w-]+\.js$/.exec(file)[1]}.mjs`;
// cd8a7d7c0: dd's g (usePathDisplayOptions, export o, `t(m)`) is cut here; its context m is linked from r3b-transcript-v4.
export const CLOSURE_CHUNKS = ['shared-19-UalAfDtn.js', 'shared-38-DyF0_Fim.js', 'cd59309dc-Bi2OcXJ2.js', 'cd8a7d7c0-DuH0T8rm.js'];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)]).filter(([, roots]) => Object.keys(roots).length).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CLOSURE_CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
async function locateOne(src, file, local, spec, pins, requirePins, label) {
  const hits = [];
  for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
  if (hits.length !== 1) throw Error(`${file} ${local} (${label}): ${hits.length} top-level declarations carry its features, expected 1`);
  const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
  if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${label}'s features is ${names.join(', ')}, not ${local}`);
  const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
  const declarationSha256 = sha(rawText(src, hits[0]));
  const pin = pins[`${file}#${local}`];
  if (pin === undefined && requirePins) throw Error(`${file}#${local}: no reviewed pin`);
  if (pin !== undefined && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
  return { alias, declarationSha256, pinned: pin !== undefined };
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map(), { requirePins = true } = {}) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const { alias, declarationSha256, pinned } = await locateOne(src, file, local, spec, ROOT_PINS, requirePins, spec.name);
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      found.push({ file, local, name: spec.name, module: spec.module, export: alias, declarationSha256, pinned });
    }
  }
  return found;
}

// Every facade binding: located like a root, held and exported (under `name`'s link) by its linked area.
async function linkedExportOf(area, file, local) {
  const m = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
  for (const mod of m.modules) {
    if (!mod.source || path.basename(mod.source) !== file) continue;
    if (!(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) continue;
    const name = mod.exports?.[local] ?? ((mod.linkExports ?? []).includes(local) || (mod.sharedExports ?? []).includes(local) ? local : null);
    const bytes = await fs.readFile(path.join(generatedRoot, area, mod.target));
    if (sha(bytes) !== mod.sha256) throw Error(`${area}/${mod.target} differs from its manifest`);
    return { target: mod.target, name };
  }
  return null;
}
export async function locateFacades(cache = new Map(), { requirePins = true } = {}) {
  const found = [];
  for (const [module, names] of Object.entries(FACADES)) for (const [exportName, spec] of Object.entries(names)) {
    const src = await readSource(spec.file, cache, official.ionSource);
    const { declarationSha256, pinned } = await locateOne(src, spec.file, spec.local, spec, FACADE_PINS, requirePins, `${module} ${exportName}`);
    const link = await linkedExportOf(spec.area, spec.file, spec.local);
    if (!link) throw Error(`facade ${module} ${exportName}: ${spec.area} does not hold ${spec.file}#${spec.local}`);
    if (!link.name) throw Error(`facade ${module} ${exportName}: ${spec.area}/${link.target} holds ${spec.file}#${spec.local} without exporting it`);
    found.push({ module, exportName, file: spec.file, local: spec.local, area: spec.area, target: link.target, linkedName: link.name, declarationSha256, pinned });
  }
  return found;
}

export async function pinAdapters(cache = new Map(), { requirePins = true } = {}) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin === undefined && requirePins) throw Error(`adapter ${key}: no reviewed pin`);
    if (pin !== undefined && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, declarationSha256, pinned: pin !== undefined });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const item of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [orig, as] = item.split(/\s+as\s+/);
      exported.set(as ?? orig, { from: `src/${m[2]}`, orig });
    }
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a]));
  for (const [name, a] of wanted) if (exported.get(name)?.from !== a.from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${a.from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, { from, orig }] of exported) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    const o = orig.replace('$', '\\$');
    if (!new RegExp(`export (?:const|function|async function) ${o}\\b|export \\{[^}]*\\b${o}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${orig} (${name})`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the code-current-upper-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function codeCurrentUpperV4Config() {
  return {
    name: 'code current upper (4.16336.0)', generator: 'extract-code-current-upper-v4.mjs', output: path.join(root, CODE_CURRENT_UPPER_V4_OUTPUT),
    adapterModule: '../../source-code-current-upper-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites: [], linkedCopies, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: [...LINKED_AREA_NAMES],
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}

// The semantic modules (3.6556.2 file names and export names): each re-exports its roots from the chunk module that
// holds them, or (facade) the linked area's binding.
function semanticModules(facades) {
  const out = {};
  const add = (module, line) => (out[`${module}.mjs`] ??= []).push(line);
  for (const [file, roots] of Object.entries(ROOTS).map(([file, all]) => [file, emitted(file, all)])) {
    const byModule = new Map();
    for (const r of Object.values(roots)) { if (!byModule.has(r.module)) byModule.set(r.module, []); byModule.get(r.module).push(r.name); }
    for (const [module, names] of byModule) add(module, `export { ${names.join(', ')} } from "./${target(file)}";`);
  }
  for (const f of facades) add(f.module, `export { ${f.linkedName === f.exportName ? f.exportName : `${f.linkedName} as ${f.exportName}`} } from "../${f.area}/${f.target}";`);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, lines]) =>
    [name, `// ${name.replace(/\.mjs$/, '')} (code-current upper, ${official.referenceVersion}); generated by extract-code-current-upper-v4.mjs.\n${lines.join('\n')}\n`]));
}

export async function extractCodeCurrentUpperV4({ check = false, dryRun = false, explore = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache, { requirePins: !explore });
  const facades = await locateFacades(cache, { requirePins: !explore });
  const adapters = await pinAdapters(cache, { requirePins: !explore });
  await assertAdapterModule();
  const pendingRoots = await assertPending();
  const linked = {};
  for (const area of LINKED_AREA_NAMES) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const semantic = semanticModules(facades);
  const cfg = {
    ...codeCurrentUpperV4Config(), linkedAreas: await linkedAreas(),
    async artifacts(m) {
      return {
        ...semantic,
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-code-current-upper-v4.mjs',
          previous: { generator: 'scripts/extract-code-ui-current.mjs', output: 'src/generated/code-current', referenceVersion: official.previousVersion },
          base: { generator: 'scripts/extract-code-current-v4.mjs', output: 'src/generated/code-current-v4' },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, pendingRoots, facades, adapters, linkedCopies, notPorted: NOT_PORTED,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

// 3.6556.2 upper exports not carried by this graph (each with why); recorded in provenance.json.
export const NOT_PORTED = {
  // The three sidebar modules. Their 4.16336.0 counterparts are in shared-57-grpFrBWt.js, which the sidebar surface graph
  // src/generated/frame-sidebar-nav (scripts/extract-frame-sidebar-nav.mjs) cuts whole (D1: never cut again here). Since the
  // round-4 real-b sidebar lane (RW8-NAV-1) that graph is wired (main.jsx mounts the official nav body) and exports them, so
  // sidebar-nested-caret (yS / fS) and four sidebar-filter-controls names (Bg / s_ / c_ / r_) are FACADES above. What stays
  // here has no 4.16336.0 binding with the 3.6556.2 contract. (Round 3 wording: "it does not load yet and is not wired; Bg,
  // s_, c_, r_, fS are among its sharedExports, yS and Kg are not exported".) The 3.6556.2 consumers
  // (source-sidebar-filter-current.jsx, source-code-sidebar-row.jsx, source-sidebar-nested-caret-adapters.mjs) belong to the
  // SourceSidebar body column, which the main window no longer draws (slot "overlays"); deleting them is SB-2 (R4-U1).
  'sidebar-filter-controls': { why: 'the 3.6556.2 re-export of sidebar-sections section-filter-controls; the located parts are facades onto frame-sidebar-nav (FACADES sidebar-filter-controls); these names have no 4.16336.0 counterpart located in shared-57',
    map: { unlocated: 'useSidebarSortOptions, focusSidebarAfterRegroup, SidebarViewAllContext, useSidebarViewAll, SidebarViewAllItem, sortAscendingShown, sortAscendingStored, SidebarFilterTrigger, trailingControlClass' } },
  'sidebar-filter-view': { why: 'CurrentSidebarFilterContent was a 3.6556.2 select fragment (the n === "sessionList" block of shared-21 PJ, driven by props: groupOptions / groupBy / sortOptions / ascending / metadata / onReset …); its 4.16336.0 owner is the whole Group and sort menu shared-57 Kg (props mode / layout / handle / open / onOpenChange / triggerId / anchor, its state from the official sidebar stores), exported by frame-sidebar-nav (linkExports, W8B-N1) and rendered whole by the official nav body main.jsx mounts; runSlicer has no select roots, and a facade under the 3.6556.2 name would change that contract',
    map: { CurrentSidebarFilterContent: `${SIDEBAR}#Kg (frame-sidebar-nav linkExport; whole menu, not a facade)` } },
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots(new Map(), { requirePins: false })) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const f of await locateFacades(new Map(), { requirePins: false })) console.log('facade', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED', `${f.area}/${f.target} ${f.linkedName}`);
    for (const a of await pinAdapters(new Map(), { requirePins: false })) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else if (process.argv.includes('--explore')) {
    process.env.WORKING_LINE_EXPLORE = '1';
    await extractCodeCurrentUpperV4({ dryRun: true, explore: true });
    const edges = globalThis.__exploreEdges ?? [];
    const out = process.env.EXPLORE_OUT;
    if (out) await fs.writeFile(out, JSON.stringify({ edges, lazy: [...(globalThis.__exploreLazy ?? [])] }));
  } else await extractCodeCurrentUpperV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
