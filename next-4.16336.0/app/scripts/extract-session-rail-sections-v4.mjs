// Session rail Servers and Background tasks sections, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104,
// account2 batch 5, region session-rail-sections): the semantic roots scripts/extract-session-rail-sections.mjs cuts from
// 3.6556.2 into src/generated/session-rail-sections, re-located in the frozen 4.16336.0 snapshot and cut into the
// isolated graph src/generated/session-rail-sections-v4. The 3.6556.2 output is untouched (staged double output; no
// production switch: src/source-session-rail.jsx keeps rendering src/generated/session-rail-sections).
//
// Roots (account2/plan.json session-rail-sections roots.probedRoots; 3.6556.2 counterpart in brackets):
//   cf74bc599-BytvntCE  lP  SessionRailServers          [cf74bc599 $M]   KN  SessionRailBackgroundTasks [IM]
//                       oP  RailServersCard             [XM]             aP  RailServerRow              [YM]
//                       QN  useSessionDevServers        [HM]             nP  railServerState            [KM]
//                       iP  railServerName              [JM]             rP  railServerAddress          [qM]
//                       tP  railServerKey               [GM]             $N  RAIL_SERVERS_LIMIT         [UM]
//                       eP  SERVER_META_FIELDS          [WM]             UN  RailBackgroundTasksCard    [NM]
//                       HN  RailBackgroundTaskRow       [MM]             WN  railTaskTitle              [PM]
//                       RN  railTaskIcon                [OM]             VN  railStopLabel              [jM]
//                       LN  railTaskKey                 [DM]             PN  RAIL_TASKS_LIMIT           [wM]
//                       IN  TASK_META_FIELDS            [EM]
//                       (sP / GN, the cards' stop wiring that $M / IM inlined in 3.6556.2, are emitted in the closure.)
//   shared-20-DUEo90UF  Nj  useAnnouncement (export pr)  [shared-20 _E]  Ij  Announcement (export dr)   [bE]
//   c9bd7af9c-Bvb7EG4D  _F  isDismissedTask (export f)   [cccc2cf0a Jj]  kF  loopNextRunAt (export a)   [oM]
//                       jF  formatCountdown (export i)   [cM]
//   cea7057eb-BrXukOIp  w   loopExpired (export v)       [cea7057eb w]   T   isAmbientTask (export _)   [E]
//                       Te  taskAgentToolUseId (export n) [Te]
//   c96d752d0-D9VB6ArX  hZe groupTasks (export Qr)       [c96d752d0 G$e] mH  taskDescriptionParts (yi)  [xU]
//                       hH  taskDescriptionText (bi)     [SU]
//   c227f4d5e-DGDdGBTz  _O  originFolder (export jc)     [c227f4d5e MH]  qO  serverInSession (xc)       [cU]
//                       oL  remoteServerLive (Qa)        [vU]            wL  nextPreviewNonce (Za)      [IU]
//   shared-25-D-aF0gt9  IW  useStableValue (export Zn)   [shared-25 IH]
//   c155b6b71-CtScXPSD  g   usePreviewTabs (export f)    [c155b6b71 g]
//   shared-0-CnnWnVrT   aD  DevServerStatus (export s_)  [shared-0 Ax]
//   cd4f82e77-Cuw99s6A  Me  useSecondNow (export vt)     [cd4f82e77 ke]
//   shared-123-1Hc1RTKl Ck  isHostedPageUrl (export ih)  [shared-78 IL]
// useMinuteNow (plan root shared-183 _J, 3.6556.2 shared-156 fK) is not rooted here: routines-shared-v4 already holds
// it with its minute clock state (D1), so KN imports it from there and a consumer links routines-shared-v4 for it.
// pickFields (shared-123 rG) is emitted in the closure only: shared-123 holds a byte-identical twin (gq), so no feature
// tells the two apart for a root (the session-rail-kit-v4 manifest `unrooted` note); cf74bc599 kt imports rG.
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, plan.json session-rail-sections `linked` + owners.alreadyOwnedByAppGraphs): session-rail-kit-v4
//     (RailCard, the row primitives, the focus rescue …), files-changes-v4, routines-shared-v4 (the minute clock) and
//     code-routines-v4 (react-query's replaceEqualDeep, which files-changes-v4 cuts without exporting): every binding one
//     of them already holds and exports is imported from it, never cut again;
//   - host boundaries as localAdapters (file#local), each an existing host adapter re-exported by
//     src/source-session-rail-sections-v4-adapters.jsx (the 3.6556.2 graph adapts the same official services, now in
//     their 4.16336.0 chunks/locals); each original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its raw declaration sha256
// pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const SESSION_RAIL_SECTIONS_V4_OUTPUT = 'src/generated/session-rail-sections-v4';
const ADAPTER_FILE = 'src/source-session-rail-sections-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const SECTIONS = 'cf74bc599-BytvntCE.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [SECTIONS]: {
    lP: { name: 'SessionRailServers', export: null, probe: 'kind:"local",server:e,stopping:p.has(e.serverId)',
      features: ['{ sessionRef: t, readOnly: n } = e,', '{ data: i } = Ru(t, eP),', 'f = QN(t.id, a),', '{ ids: p } = lx(t, "server"),', 'm = Pt() && t.type === "remote" ? t : null,',
        'v = Hf(dP) && _ !== null,', 'kind: "local",', 'openable: y && e.status === Se.Running && e.port > 0,', 'J?.focusOrOpenPreviewTab?.(', '`http://localhost:${e.server.port}`,',
        'n.setPendingRemotePreviewOpen({', 'source: "gesture",', 'rf(n, "preview", "session_rail"),', 'n.setSidePane("preview"));', 'defaultMessage: "Stopping server\\u2026",',
        'id: "YyAB/Ltrj7",', 'if (!v) return null;', 'o(sP, {', 'onStopPressed: D,', 'o(di, { announcement: T })'] },
    KN: { name: 'SessionRailBackgroundTasks', export: null, probe: 'defaultMessage:"Stop requested\\u2026",id:"V02rUvAsBz"',
      features: ['i = Kh(),', '{ data: a } = Ru(t, IN),', 's = a ? (a.loops ?? FN) : void 0,', 'l = jn(!!s?.length),', '{ ids: d, release: f } = lx(t, "loop"),', 'p = vx(t.id),',
        '_ = Dp("session_rail"),', 'defaultMessage: "Stop requested\\u2026",', 'defaultMessage: "Task stopped",', 'defaultMessage: "Scheduled prompt stopped",',
        'defaultMessage: "Loop stopped",', 'defaultMessage: "Scheduled prompt",', 'id: "2gsTFbSUQm",', 'defaultMessage: "Recurring loop",', 'kind: "loop",',
        'title: e.prompt ?? (e.recurring === !1 ? k : A),', 'o(GN, {', 'finishedCount: g,', 'openPane: _,', 'onStopPressed: C,'] },
    oP: { name: 'RailServersCard', export: null, probe: 'id:"gjhcMbSA41"', features: ['{ rows: t, inBrowser: n, shownServerId: r, onOpenRow: i, onStopRow: a } = e,',
      'K0($, 0, { sectionWide: !0 })', 'o(Q, { defaultMessage: "Servers", id: "QOxktDjUiT" })', 'defaultMessage: "{count} running",', 'id: "gjhcMbSA41",',
      'className: "flex flex-col outline-none",', 'limit: $N,', 'id: "servers",'] },
    aP: { name: 'RailServerRow', export: null, probe: 'id:"rrBTXINTfh"', features: ['{ row: t, inBrowser: n, current: r, onOpen: i, onStop: a } = e,', 'o(Th, { name: "Cache" })',
      'defaultMessage: "Stopping\\u2026", id: "NACfNicI6z"', 'defaultMessage: "Failed to start",', 'defaultMessage: "Starting\\u2026", id: "RFCwI6lJ1a"',
      'defaultMessage: "Open {name} in Browser",', 'defaultMessage: "Open {name} in Preview",', 'defaultMessage: "Stop this server",', '"bg-fill-ghost-selected"'] },
    QN: { name: 'useSessionDevServers', export: null, probe: '!Ft(n.externalUrl)&&n.status!=="stopped"',
      features: ['n = ot(),', 'if (n.state !== "ready" || !t) {', 'r = ZN;', '(n) => wh(n, t, e) && !Ft(n.externalUrl) && n.status !== "stopped",'] },
    nP: { name: 'railServerState', export: null, probe: 'e.server.state==="running"?"running":"starting"',
      features: ['if (e.kind === "remote")', 'case Se.Running:', 'case Se.Error:', 'return "failed";'] },
    iP: { name: 'railServerName', export: null, probe: 'e.server.name??rP(e)??e.server.serverId', features: ['return e.server.name ?? rP(e) ?? e.server.serverId;'] },
    rP: { name: 'railServerAddress', export: null, probe: 'e.server.port>0?`localhost:${e.server.port}`:void 0',
      features: ['return e.server.port > 0 ? `localhost:${e.server.port}` : void 0;'] },
    tP: { name: 'railServerKey', export: null, probe: '`${e.kind}:${e.server.serverId}`', features: ['return `${e.kind}:${e.server.serverId}`;'] },
    $N: { name: 'RAIL_SERVERS_LIMIT', export: null, probe: '$N=4', features: ['var $N = 4;'] },
    eP: { name: 'SERVER_META_FIELDS', export: null, probe: 'kt("workingDir","originCwd")', features: ['var eP = kt("workingDir", "originCwd");'] },
    UN: { name: 'RailBackgroundTasksCard', export: null, probe: 'id:"PO+0DdDIId"', features: ['onOpenFinished: r,', 'stoppingTaskIds: s,',
      'defaultMessage: "{count} finished",', 'id: "cVFY6xFDhQ",', 'o(Q, { defaultMessage: "Background tasks", id: "PO+0DdDIId" })', 'o(hp, { items: p, limit: PN, renderItem: v })',
      'o(Th, { name: "AgentsSimple" })', 'className: "min-w-0 flex-1 truncate text-start text-primary",', 'id: "backgroundTasks",'] },
    HN: { name: 'RailBackgroundTaskRow', export: null, probe: 'id:"fFubbBep+3"', features: ['{ row: t, onOpen: n, onStop: r, taskStopping: i } = e,',
      'defaultMessage: "Stop requested\\u2026",', 'defaultMessage: "Stopping\\u2026",', 'className: "[[role=tooltip]_&]:line-clamp-4",', 'defaultMessage: "Open {name} in Background tasks",'] },
    WN: { name: 'railTaskTitle', export: null, probe: 'Wl(e.description,e.taskType)', features: ['let t = Wl(e.description, e.taskType);', 'return t ? Pc(t) : e.description;'] },
    RN: { name: 'railTaskIcon', export: null, probe: 'return"Clock"', features: ['return "Clock";', 'return e.taskType === "local_bash" ? "CommandLine" : "AgentsSimple";'] },
    VN: { name: 'railStopLabel', export: null, probe: 'id:"+ZLTl3VMv+"', features: ['e.formatMessage({ defaultMessage: "Stop this task", id: "+ZLTl3VMv+" })',
      'defaultMessage: "Stop this scheduled prompt. Claude will cancel it.",'] },
    LN: { name: 'railTaskKey', export: null, probe: 'return`loop:${e.loop.id}`', features: ['return e.taskId;', 'return `loop:${e.loop.id}`;'] },
    PN: { name: 'RAIL_TASKS_LIMIT', export: null, probe: 'PN=4', features: ['var PN = 4;'] },
    IN: { name: 'TASK_META_FIELDS', export: null, probe: 'kt("loops","tags","isArchived","createdAt")', features: ['var IN = kt("loops", "tags", "isArchived", "createdAt");'] },
  },
  'shared-20-DUEo90UF.js': {
    Nj: { name: 'useAnnouncement', export: 'pr', probe: '{nonce:0,text:""}', features: ['K0($, 0, { nonce: 0, text: "" })', 'n((t) => ({ nonce: t.nonce + 1, text: e }));', '{ announcement: t, announce: r }'] },
    Ij: { name: 'Announcement', export: 'dr', probe: 'className:"sr-only",role:"status"', features: ['{ announcement: t } = e,', 'n = t.nonce % 2 == 1 ? "\\u200B" : "";', 'className: "sr-only",', 'role: "status",'] },
  },
  'c9bd7af9c-Bvb7EG4D.js': {
    _F: { name: 'isDismissedTask', export: 'f', probe: 't.endGuessed===!0&&e.has(mF(t,!0))', features: ['return t.runId === void 0', '? e.has(t.taskId)', 't.endGuessed === !0'] },
    kF: { name: 'loopNextRunAt', export: 'a', probe: 'if(e.nextRunAt>t||e.recurring===!1)return e.nextRunAt', features: ['if (e.nextRunAt > t || e.recurring === !1) return e.nextRunAt;', 'let n = OF(e.cron);'] },
    jF: { name: 'formatCountdown', export: 'i', probe: 'defaultMessage:"now",id:"kaaf1Ejpee"', features: ['e.formatMessage({ defaultMessage: "now", id: "kaaf1Ejpee" });', '{ minutes: r, seconds: t }', '{ days: a, hours: o }'] },
  },
  'cea7057eb-BrXukOIp.js': {
    w: { name: 'loopExpired', export: 'v', probe: 'r.graceMs:t>e.createdAt+n', features: ['+ r.graceMs', ': t > e.createdAt + n;'] },
    T: { name: 'isAmbientTask', export: '_', probe: 'e.wireTaskType==="auto_mode_scan"', features: ['e.ambient === !0 ||', 'e.wireTaskType === "dream" ||', 'e.wireTaskType === "auto_mode_scan" ||'] },
    Te: { name: 'taskAgentToolUseId', export: 'n', probe: '==="agent"&&e.toolUseId||void 0', features: ['return (we(e.taskType) === "agent" && e.toolUseId) || void 0;'] },
  },
  'c96d752d0-D9VB6ArX.js': {
    hZe: { name: 'groupTasks', export: 'Qr', probe: 'e=>e.live);return{running:n,finished:', features: ['(e) => e.live);', 'return { running: n, finished: BH(r, t) };'] },
    mH: { name: 'taskDescriptionParts', export: 'yi', probe: 'r.push({word:t[1],href:e.href,paneUrl:e.paneUrl})',
      features: ['if (typeof e != "string" || (t !== void 0 && iZe.has(t))) return;', 'r.push({ word: t[1], href: e.href, paneUrl: e.paneUrl }),'] },
    hH: { name: 'taskDescriptionText', export: 'bi', probe: 'typeof e=="string"?e:e.word).join("")', features: ['return e.map((e) => (typeof e == "string" ? e : e.word)).join("");'] },
  },
  'c227f4d5e-DGDdGBTz.js': {
    _O: { name: 'originFolder', export: 'jc', probe: '.claude[\\\\/]worktrees[\\\\/]', features: ['return e?.replace(/[\\\\/]\\.claude[\\\\/]worktrees[\\\\/][^\\\\/]+$/, "");'] },
    qO: { name: 'serverInSession', export: 'xc', probe: '!Pi(e.serverId)&&(e.sessionId===void 0&&!r||e.sessionId===n)',
      features: ['KO(e, t) &&', '!Pi(e.serverId) &&', '((e.sessionId === void 0 && !r) || e.sessionId === n)'] },
    oL: { name: 'remoteServerLive', export: 'Qa', probe: 'e!==void 0&&(e.state==="starting"||e.state==="running")',
      features: ['return e !== void 0 && (e.state === "starting" || e.state === "running");'] },
    wL: { name: 'nextPreviewNonce', export: 'Za', probe: 'return CL++', features: ['return CL++;'] },
  },
  'shared-25-D-aF0gt9.js': {
    IW: { name: 'useStableValue', export: 'Zn', probe: '({comparedWith:e,stable:e})', features: ['{ comparedWith: e, stable: e }', 'Object.is(r.comparedWith, e) || Object.is(r.stable, e)'] },
  },
  'c155b6b71-CtScXPSD.js': {
    g: { name: 'usePreviewTabs', export: 'f', probe: 'i?.getPreviewTabs', features: ['let s = i?.getPreviewTabs;', 'i?.onPreviewTabsChanged?.('] },
  },
  'shared-0-CnnWnVrT.js': {
    aD: { name: 'DevServerStatus', export: 's_', probe: 'e.Starting="starting",e.Running="running",e.Error="error",e.Stopped="stopped"',
      features: ['(e.Starting = "starting"),', '(e.Running = "running"),', '(e.Error = "error"),', '(e.Stopped = "stopped"),'] },
  },
  'cd4f82e77-Cuw99s6A.js': {
    Me: { name: 'useSecondNow', export: 'vt', probe: 'return _(e(je,A,A))', features: ['return _(e(je, A, A));'] },
  },
  'shared-123-1Hc1RTKl.js': {
    Ck: { name: 'isHostedPageUrl', export: 'ih', probe: 't.protocol==="https:"&&!t.username&&!t.password',
      features: ['t.protocol === "https:" &&', '!t.username &&', '!t.password &&', 'Sk.size > 500'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'cf74bc599-BytvntCE.js#lP': '5c04cb6264e588c87883f1a33572e53adf0447e8f38ae20c2bf2f9aeb93af131', 'cf74bc599-BytvntCE.js#KN': 'bc4a0e4e393fc6c363614ebb997f1edd33b0a5857ec8f1950689bee530a7a1da', 'cf74bc599-BytvntCE.js#oP': 'daf1fa2643241443d45bdd91ea2764c4765f24c0d305282dc864a866d6f5e489', 'cf74bc599-BytvntCE.js#aP': 'ccd572be129fec6386b0e6f289ea3f779476a2150fab0de1576aa2538030f067',
  'cf74bc599-BytvntCE.js#QN': '55f75a3c123c7393cfeb31339f8dc11d57aad110e7ececf64c52494c9fe2ba9a', 'cf74bc599-BytvntCE.js#nP': '2f97f29dfab54acdc38bcee9ded4a42f46a8686a5f44d81d67fa038dc9612fd7', 'cf74bc599-BytvntCE.js#iP': '4a691ac7882420a87be3dea2293be2654b73352e2eb13d98ae7a8093144f736d', 'cf74bc599-BytvntCE.js#rP': '4b39016db854d0baaac2cf681f08499a917fd0f8c2920def7b840b8ee7985f69',
  'cf74bc599-BytvntCE.js#tP': 'e3400b0a1262acbfcbe677e4dba577263ee68ede4ee2af8753931de554c81a1a', 'cf74bc599-BytvntCE.js#$N': '524fc3698e51b52ec265f9a82210f587112d4d30ea41b9c262949389d8d0ba68', 'cf74bc599-BytvntCE.js#eP': '503683ce2c01a8c78cf3cecc6f28164568ce0b20096995bbd79140733fa47c32', 'cf74bc599-BytvntCE.js#UN': 'ea305a19038618897d038d24355f19a6d3c6435366aea75b651cefa533fb5cde',
  'cf74bc599-BytvntCE.js#HN': '29db8c252dd168ac552bf8c0b9538156614bac0a50c1fad6b273aaae25a95ce4', 'cf74bc599-BytvntCE.js#WN': 'bfc6fdd493300494fad023c8f5d77a045aa07b7fa93effec98e2379c09c78fa0', 'cf74bc599-BytvntCE.js#RN': '88576a5fa8ee8d43b32e01936ce1157a9b12e052229450a5393ddff054601a17', 'cf74bc599-BytvntCE.js#VN': '77a72f6644667b5418541fbd4b0a68ccc8681f157f44e68c508c3fac3bcb5b15',
  'cf74bc599-BytvntCE.js#LN': '2216a3ea781e723dbc8038328f48a0a7d9b1e238b19721a767a9f5895a5fab40', 'cf74bc599-BytvntCE.js#PN': 'b45a2ba83952668f497ef393fc8577bb318ed6ea52b557bcc9c4cdd331fd2f53', 'cf74bc599-BytvntCE.js#IN': '6775b44bc62f0cd5c88adbf630065ac9df2071c2ec87adfbea841170836a82a3',
  'shared-20-DUEo90UF.js#Nj': 'acd0e5159a14d779b0298bb9fde5e899e8b4133c610b979c91dd80f9af573694', 'shared-20-DUEo90UF.js#Ij': '3dee44d2153850d8e5720844a0491ea870e998bc1d6fe274df6b162525a14f06',
  'c9bd7af9c-Bvb7EG4D.js#_F': '64e94477c98612d97cde80b7c13eb05c019b52f72dd0a89085d5959b5afca7c8', 'c9bd7af9c-Bvb7EG4D.js#kF': 'b0f3000e482d80b4723f79f1e978591ffe3efa538160bd22aeba08dc13c50fe4', 'c9bd7af9c-Bvb7EG4D.js#jF': '60094a30379c703209834fdc9629899c5f5fd771de71ab788f3ac0f9508e2317',
  'cea7057eb-BrXukOIp.js#w': '25fd7fb2068e215d6deb58a4b9f2b29cffb39e5c992a17ea57da5430668f4e2f', 'cea7057eb-BrXukOIp.js#T': '4eb4106ad8e51585f0edacbb113536e04861e79328ddb8374cba1736171298ee', 'cea7057eb-BrXukOIp.js#Te': '60d0ab69dde50e304c149b14142487a9e6eb316f431b36e37c699c7df8701b12',
  'c96d752d0-D9VB6ArX.js#hZe': '16ebb24052764460096277afb0eb79808954f6d0a34a261cde7bb36cdaf6909f', 'c96d752d0-D9VB6ArX.js#mH': 'f1bc3388b5710c62403c5f1e04562f6dbee4be51fe0eb03a5cee9a779d5506df', 'c96d752d0-D9VB6ArX.js#hH': '430f130b086308db4d30beee5bfa45f31aa33dff6054e5c66fd5d0bd539d09d2',
  'c227f4d5e-DGDdGBTz.js#_O': 'a6f52139dd163269ae995f2b304ab3e633bbc58069e8855c281e96f9b8562747', 'c227f4d5e-DGDdGBTz.js#qO': 'fb68b30c978a439998c55ea89b6219c03bff501a3696cba2aaa64acef143b3e6', 'c227f4d5e-DGDdGBTz.js#oL': '5e61da09a935a3ee3b98687403e48299bced6229eeac3a7f77fb6c3bccfa9e4f', 'c227f4d5e-DGDdGBTz.js#wL': 'c2e42759e5539edb44b76b46762b8779b4b8f36aee330c377c7cee3c0adbdead',
  'shared-25-D-aF0gt9.js#IW': '6bddb9fb6d9bc2bfab4a71172bf41200ad0bfe0fe33bc7be39f445f342e3679a', 'c155b6b71-CtScXPSD.js#g': 'db19b5563d21743addd4b2b9212b9da5e4c6c87cda3b8d2c0b712f627c91dbc3', 'shared-0-CnnWnVrT.js#aD': '13b272940fcea9bd9f8223dce458261ccf346d90675c5f5bb0873a9fc86ce548', 'cd4f82e77-Cuw99s6A.js#Me': '74398969f44a894481e99625f6f5811fc801ef6167ac7ad3eb6f5f7deb69090b',
  'shared-123-1Hc1RTKl.js#Ck': 'f054e81e7bf4df45bdc8c58107a2f7c4150239974ad61e8c6b3f36800e02e727',
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, old, features } ────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there); `old` is
// the 3.6556.2 original that adapter already stands for in src/generated/session-rail-sections.
const SEC = 'src/source-session-rail-sections-adapters.jsx', KIT = 'src/source-session-rail-kit-adapters.jsx';
export const HOST_ADAPTERS = {
  // react-intl over the local catalog (the kit's adapters, as the 3.6556.2 graph).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: KIT, old: 'vendor-intl-DYfox5Co.js#q', features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: KIT, old: 'vendor-intl-DYfox5Co.js#Gt', features: ['var Gt = a(Wt, Ut);'] },
  // The session meta query with a `select` (lP reads workingDir / originCwd, KN loops / tags / isArchived / createdAt).
  'c5da7eb42-aEqbSKbC.js#LL': { name: 'useSessionRailMeta', from: SEC, old: 'c5da7eb42-XijZdwf1.js#QI', features: ['{ select: t, passive: r, enabled: i }', 'n?.passive ?? !1,', 'n?.enabled ?? !0;'] },
  // Whether a remote session's bridge is up (asked only for a remote session under sink_planter_vase).
  'c5da7eb42-aEqbSKbC.js#mR': { name: 'useRemoteSessionBridgeUp', from: SEC, old: 'c5da7eb42-XijZdwf1.js#jL', features: ['passive: !0 })', 'return t ?? !1;'] },
  // A remote session's servers (`e === null` gives the shared empty list).
  'c227f4d5e-DGDdGBTz.js#SL': { name: 'useRemoteSessionServers', from: SEC, old: 'c227f4d5e-B-FYKrwT.js#PU', features: ['if (e === null) {', 'n = r.length === 0 ? iL : r;'] },
  // The per-folder preferred preview server `[preferred, remember]`, written when a Servers row opens its server.
  'c227f4d5e-DGDdGBTz.js#SO': { name: 'usePreferredPreviewServers', from: SEC, old: 'c227f4d5e-B-FYKrwT.js#LH', features: ['[e, t] = kl(hO, gO),', '(t[e] === n ? t : { ...t, [e]: n })'] },
  // The Tasks pane opener (finished / a taskId / an agent's subagent view), null without side panes.
  'c227f4d5e-DGDdGBTz.js#BB': { name: 'useOpenTasksPane', from: SEC, old: 'c227f4d5e-B-FYKrwT.js#mQ',
    features: ['openTasksPaneAtTask: r,', 'expandFinishedSection: a,', '{ kind: "subagent", ...l }', 'return s ? l : null;'] },
  // The session's stopping ids of one kind ("server" / "loop" / "task") in the scope store.
  'c9bd7af9c-Bvb7EG4D.js#xF': { name: 'useRailStoppingIds', from: SEC, old: 'cccc2cf0a-DhZC33Gc.js#Qj', features: ['{ isStopping: a, markStopping: o, releaseStopping: s } = cd(),'] },
  // The session's dismissed task ids.
  'c9bd7af9c-Bvb7EG4D.js#bF': { name: 'useDismissedTaskIds', from: SEC, old: 'cccc2cf0a-DhZC33Gc.js#Zj', features: ['((t = () => dF(e)), (n = () => dF(e)), K2($, 0, e, t, n))', 'c(fF, t, n)'] },
  // Stop a dev server through claude.web Launch.stopServer ("Couldn’t stop the preview server." on failure).
  'c9bd7af9c-Bvb7EG4D.js#CF': { name: 'useServerStop', from: SEC, old: 'cccc2cf0a-DhZC33Gc.js#eM',
    features: ['let c = je?.stopServer?.(i);', 'defaultMessage: "Couldn\\u2019t stop the preview server.",', '{ stoppingServerIds: i, handleStopServer: c }'] },
  // Stop a loop by asking Claude to call CronDelete.
  'c9bd7af9c-Bvb7EG4D.js#SF': { name: 'useLoopStop', from: SEC, old: 'cccc2cf0a-DhZC33Gc.js#$j',
    features: ['Oh("tasks_stop_loop")', 'by calling CronDelete, then confirm.', '{ stoppingLoopIds: r, handleStopLoop: s }'] },
  // Stop a background task (the stopBackgroundTask mutation, the "Stop review?" confirmation for review runs).
  'c9bd7af9c-Bvb7EG4D.js#EF': { name: 'useTaskStop', from: SEC, old: 'cccc2cf0a-DhZC33Gc.js#rM',
    features: ['{ sessionRef: t, tasks: n, allTasks: r, meta: i, surface: a } = e,', 'i?.tags?.includes("ultrareview")'] },
  // GrowthBook `.on` (shared-123 py reads sink_planter_vase through it). The host table (host-growthbook.mjs).
  'shared-25-D-aF0gt9.js#ko': { name: 'useGrowthBookFeature', from: SEC, old: 'shared-25-DOWZRSlq.js#fs', features: ['return go(J1($, 0, e) ? K1($, 0, e, H(e)) : $[1]).on;'] },
  // Whether a preview opens in the browser instead of the Preview pane.
  'shared-123-1Hc1RTKl.js#yy': { name: 'usePreviewOpensInBrowser', from: SEC, old: 'shared-78-D5Fw2h0a.js#tE', features: ['e === "remote" ? fy() && n : t'] },
  // The active dev servers from `globalThis["claude.web"].Launch.activeServersStore`.
  'shared-1-D1bGaTaN.js#qm': { name: 'useActiveServers', from: SEC, old: 'shared-1-BJhqMmkf.js#nd',
    features: ['let e = Km?.activeServersStore;', 'n || t({ state: "ready", result: e });', 'state: "error",'] },
  // The claude.web Launch bridge.
  'shared-0-CnnWnVrT.js#GO': { name: 'claudeWebLaunch', from: SEC, old: 'shared-0-DDOOdL6P.js#dC', features: ['var GO = globalThis["claude.web"]?.Launch;'] },
  // The session scope store's context, a selector over it, whether this window hosts native previews, and whether a
  // side pane is open in the session's tile layout.
  'c03935b01-BylKMWqe.js#wf': { name: 'useRailScopeStoreApi', from: SEC, old: 'c03935b01-yhcY34vt.js#fu', features: ['return u(vf);'] },
  'c03935b01-BylKMWqe.js#Q': { name: 'useRailScopeState', from: SEC, old: 'c03935b01-yhcY34vt.js#Q', features: ['let t = u(vf);', 'return $e(t ?? yf, e);'] },
  'c03935b01-BylKMWqe.js#Pf': { name: 'useRailPreviewViews', from: SEC, old: 'c03935b01-yhcY34vt.js#Su', features: ['return Q(Ff);'] },
  'c03935b01-BylKMWqe.js#Jl': { name: 'railSidePaneOpen', from: SEC, old: 'c03935b01-yhcY34vt.js#lc',
    features: ['if (e.currentSessionId === t) return S(e.tileLayout).has(n);', 'e.tileLayoutBySession[t]'] },
  // The session's own preview id, only with claude.web Launch tabs.
  'c155b6b71-CtScXPSD.js#u': { name: 'useSessionPreviewId', from: SEC, old: 'c155b6b71-66pw54FW.js#u', features: ['if (!(e?.id === void 0 || !t))'] },
  // Side pane opened / rail stop pressed telemetry. Nothing is sent (D17).
  'c68c4283d-FxwfdZSA.js#Hd': { name: 'logSidePaneOpened', from: SEC, old: 'c68c4283d-CWbOoVxS.js#sd', features: ['presentation: pe(e, r) ? "overlay" : "split",'] },
  'c68c4283d-FxwfdZSA.js#qf': { name: 'logRailStopPressed', from: SEC, old: 'c68c4283d-CWbOoVxS.js#mf', features: ['u("claudeai.epitaxy.session_rail.background_stop_pressed", e);'] },
  // The session's background tasks (a context, [] by default).
  'cea7057eb-BrXukOIp.js#_e': { name: 'useSessionTasks', from: SEC, old: 'cea7057eb-De2BQu3K.js#_e', features: ['return e(X);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'c5da7eb42-aEqbSKbC.js#LL': '6b7105ae24f3ae257f8320347117a0f95159a2f96952da4134221c3550c95cca',
  'c5da7eb42-aEqbSKbC.js#mR': '65d32cd52db375fa13d77cf70fb181a7856bbd943a2d2dc65cc1458a768bc133',
  'c227f4d5e-DGDdGBTz.js#SL': 'd6859c88404ffd7787cb8a04245157c8571fd226a9afcc8097816ae517bbedb7',
  'c227f4d5e-DGDdGBTz.js#SO': '35c332534c20e2cee92cba93d10452a7c56fd4b2cacf26a1f2920cf21c2fc33c',
  'c227f4d5e-DGDdGBTz.js#BB': '019f0b864f9dc18d9b97c08315e35bbb223c7cee523932d7dd8dbf82c82675e8',
  'c9bd7af9c-Bvb7EG4D.js#xF': '2f36fd8d03bd3543fb22cfb79200bafa5ae818ed58ed904c79e2c8f94064bc52',
  'c9bd7af9c-Bvb7EG4D.js#bF': 'd4587c5b6e70700468800fa5e076c74564a195c0eb3a8312768bfef2713cb14c',
  'c9bd7af9c-Bvb7EG4D.js#CF': '5b6e052e02d45716ca04f6bd223dd76fbdb59a1ca9a961273d15740f144e4ed6',
  'c9bd7af9c-Bvb7EG4D.js#SF': 'ba974c6dae55260d4476e1dab06c633a68ec42efbbd8fe176c4a151476636455',
  'c9bd7af9c-Bvb7EG4D.js#EF': '3b8b6cc08e380847770c8a3dc40ce3e87d884ad3d92b55081f1285a144c5e435',
  'shared-25-D-aF0gt9.js#ko': 'e464cf91ab4b3e69b54bd9ab46a2b248691395fd4fb7d28be593006226268ffa',
  'shared-123-1Hc1RTKl.js#yy': 'd3ac0c5a7128562a47c91e15500c7fe95eca71502a55070030dc4b6ea90dd573',
  'shared-1-D1bGaTaN.js#qm': '83170f95145934c0e86d87af1c29a042346ee0e48d7ad59a98b1c7af0a50bb00',
  'shared-0-CnnWnVrT.js#GO': 'f17376a00b0e7c66b0299393a7fdf0f71d48f99348ee9b9b869dfd176e8227d3',
  'c03935b01-BylKMWqe.js#wf': '955fe933005a3eb32c3875981ca9f0bc7822eb63e2902250bdf8863d0a7b732d',
  'c03935b01-BylKMWqe.js#Q': 'edb002966b51329ac5fb095961ab8e5496c17acc9c3d4e47583dbea64f71c6ca',
  'c03935b01-BylKMWqe.js#Pf': '368e1be09eba403f4e7b8df47771b69ba96cd5d3d0bd5784bb3340d548b3fc23',
  'c03935b01-BylKMWqe.js#Jl': '09abaf71ce77672d1b48ef1b4007e129e78dc8db5ff1ba412080aa689a7b7578',
  'c155b6b71-CtScXPSD.js#u': '35b7a9f1b3095bf25775fbae05cee5a667a61c3dac9061aef70cd832cf8edf25',
  'c68c4283d-FxwfdZSA.js#Hd': '3122ada754afa8c01aeca079a3b69b804564d5c7f0230f06e31046704f6d7cd2',
  'c68c4283d-FxwfdZSA.js#qf': 'd5e8617065093db063662eab8795ddcec663ea27ae69168254f5a635345ab81e',
  'cea7057eb-BrXukOIp.js#_e': 'e6d97bd12bad6d285b85017747ab5f193e5c823049a492defb0ddba079870638',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (ADAPTER_PINS[key] === undefined) throw Error(`adapter ${key}: no reviewed pin`);

const LINKED_AREAS = ['code-routines-v4', 'files-changes-v4', 'routines-shared-v4', 'session-rail-kit-v4'];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z]+|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
const ROOT_FILES = new Set(Object.keys(ROOTS));
const modules = [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  // The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
  // listed, stops generation).
  ...['shared-19-UalAfDtn.js', 'shared-2-CsjIBQD8.js', 'shared-212-BHMAi0oa.js', 'shared-3-IQTrO7Gx.js', 'cd902d735-DCi6CgIM.js', 'c3e20fa3f-OImNPq13.js', 'cb6930dae-DPu57U90.js']
    .filter(source => !ROOT_FILES.has(source)).map(source => ({ source, target: target(source) })),
];

// Pinned on the minified bytes (each exactly once): the session rail host renders the two sections side by side.
const rawCallSites = [
  { source: SECTIONS, role: 'The session rail host hands the rail its Servers and Background tasks sections (Vn / Hn, both { sessionRef, readOnly })',
    features: ['J2($,306,d,t)?(Vn=o(lP,{sessionRef:t,readOnly:d}),Hn=o(KN,{sessionRef:t,readOnly:d}),K3($,306,d,t,Vn,Hn)):(Vn=$[308],Hn=$[309])'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from, previous: spec.old, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module re-exports exactly the adapted names, each from the host adapter that documents it.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (exported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not re-exported from ${from}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the session-rail-sections-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function sessionRailSectionsV4Config() {
  return {
    name: 'session rail sections (4.16336.0)', generator: 'extract-session-rail-sections-v4.mjs', output: path.join(root, SESSION_RAIL_SECTIONS_V4_OUTPUT),
    adapterModule: '../../source-session-rail-sections-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
// The probe (account2/session-rail-sections/prestage/tools) explores the same configuration.
export const probeConfig = sessionRailSectionsV4Config;

export async function extractSessionRailSectionsV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...sessionRailSectionsV4Config(),
    async artifacts(m) {
      return {
        'index.mjs': `// Semantic names for the session-rail-sections roots (${official.referenceVersion}); generated by extract-session-rail-sections-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.keys(rs).map(l => rs[l].name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-session-rail-sections-v4.mjs',
          previous: { generator: 'scripts/extract-session-rail-sections.mjs', output: 'src/generated/session-rail-sections', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          notRooted: {
            useMinuteNow: { file: 'shared-183-B2N6Zy4J.js', local: '_J', heldBy: 'routines-shared-v4', why: 'held with its minute clock state by routines-shared-v4 (D1): imported from there, a consumer links routines-shared-v4' },
            pickFields: { file: 'shared-123-1Hc1RTKl.js', local: 'rG', why: 'shared-123 holds a byte-identical twin (gq); emitted in the closure, not rooted' },
          },
          roots, adapters,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    for (const f of await locateRoots()) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters()) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractSessionRailSectionsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
