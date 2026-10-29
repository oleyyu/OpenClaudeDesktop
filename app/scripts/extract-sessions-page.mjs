// w10-ccres-hf-gen (analysis/claude-3.6556.2-migrate-20261025 specs/plan-w10.md "#### w10-ccres-hf-gen" and, merged by
// E44, "#### w10-trans-sessions-view-gen"; research/w10-ccres.md §1 cc:sessions-page-view / notdone:124; data/
// w10-ccres-hf-externals.json): the Sessions page shell of Claude Desktop 3.6556.2, cbd6c85c8 `Hf`
// (`function Hf(e){let $=J9(537),{reportsRecentsLoad:t,codeScoped:n,renderCodeRowActions:o,codeRowLinkComponent:u}`),
// sliced whole (E27 closure generation) instead of rebuilt from its ~20 memo slots. Nothing official is executed.
//
//   sessions-page-hf.mjs   cbd6c85c8 Hf and its static same-chunk closure (124 locals in the official chunk). A local
//                          that an already generated 3.6556.2 module holds *and exports* (code-current's Sessions
//                          targets first: Gd…Yd, cd/Dd/Od/kd/Ad, dp/fp/pp, Af…Pf, $u/ed) is imported from there instead
//                          of being sliced a second time; the rest is sliced here verbatim.
//   pure-<chunk>.mjs       small bindings of other chunks that Hf imports and no generated module exports yet (set
//                          helpers, message tables, row builders, hooks, constants): sliced verbatim. "pure" only means
//                          "no component of its own"; they do import React hooks and other generated areas (view-tabs
//                          shared-25 toggledSet / shared-0 useEventCallback, app-switch, routines-shared, code-routines,
//                          mcp-app-card, sidebar-sections), so plain node cannot load them (E42) and pure models must
//                          not import them. code-current's sidebar-nested-caret.mjs imports pure-shared-78.mjs
//                          (sidebarListMessages): renaming that module or export means regenerating that target too.
//
// Every import resolves to exactly one of (in this order): a module generated here; a React / ReactDOM export of
// vendor-frame (official.reactAliases, each alias checked); a view-tabs public name (R3/R6: the compiler helpers and the
// CDS components, by semantic name from the concrete view-tabs file); an already generated 3.6556.2 module holding the
// same original binding (proved by its manifest record: same official source file and sha256, a whole-binding slice
// that declares and exports that local; code-current wins over other areas); or a named host adapter in
// src/source-sessions-page-hf-adapters.jsx. Roots and adapters carry feature strings (R2: literals, keys, class names)
// that must still appear in the original text.
//
// Dynamic imports inside the closure (the lazily loaded chunks of the chat-only branches: served recents search
// cf9da38bc, the flask/search chunks) are rewritten to the official failure branch: `import("./<chunk>")` becomes a
// rejected promise and vite's `__vite__mapDeps([…])` argument becomes `void 0`; every rewrite is recorded in the
// manifest. The Code page (codeScoped) never reaches them.
//
// D0: own generator, own output folder (src/generated/sessions-page), own scripts/verify-gen-sessions-page.mjs
// (discovered by prepare-ui.mjs, which therefore needs no edit).
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/sessions-page');
const generatedRoot = path.join(root, 'src/generated');
const adapterFile = path.join(root, 'src/source-sessions-page-hf-adapters.jsx');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };
const loose = official.looseFeature;

const VENDOR = official.vendorFrame, SF = official.sharedFrame;
const PAGE = 'cbd6c85c8-D1xuycDy.js';
const S0 = 'shared-0-DDOOdL6P.js', S2 = 'shared-2-TF8v67kg.js', S5 = 'shared-5-Bg6ZMqvt.js', S8 = 'shared-8-Db1QN4mf.js';
const S11 = 'shared-11-_AVGLHEz.js', S16 = 'shared-16-ByfgAyLr.js', S18 = 'shared-18-D3y8YMFN.js', S20 = 'shared-20-mUr7IqZY.js';
const S25 = 'shared-25-DOWZRSlq.js', S26 = 'shared-26-CGuBxVt9.js', S3 = 'shared-3-BCEbd8Fv.js', S52 = 'shared-52-uHFNjl7C.js';
const S78 = 'shared-78-D5Fw2h0a.js', S104 = 'shared-104-CTONUSaz.js', S130 = 'shared-130-dWztbTO1.js', S156 = 'shared-156-BLTosN8U.js';
const S182 = 'shared-182-BI1KJccu.js', INTL = official.vendorIntl, QUERY = 'vendor-query-DVJ0goAF.js';
const MENU = 'cc18d27d7-Dym2_dzB.js', MOVE = 'cd540469d-BuzMFsy1.js';

// Host dependencies (src/source-sessions-page-hf-adapters.jsx), keyed by the original binding (file:local). The data
// hooks read SessionsPageHfHost (Code page defaults: codeScoped, surfaces code/archived, no chat / recents queries);
// GrowthBook-style switches are closed (R15); chat-, task- and project-only pieces fail loudly if ever reached.
const adapters = {
  // shared-25 nf / Zd / Jd (exported `bp` / `_p` / `yp`): the router's search params, pathname and navigator.
  [`${S25}:nf`]: { name: 'useSessionsSearchParams', features: ['.searchStr'] },
  [`${S25}:Zd`]: { name: 'useSessionsPathname', features: ['.pathname'] },
  [`${S25}:Jd`]: { name: 'useSessionsRouter', features: ['{ warn: !1 }'] },
  // shared-25 Z (exported `zr`): the current account / organization.
  [`${S25}:Z`]: { name: 'useSessionsAccount', features: ['"Must call inside CurrentAccountProvider"'] },
  // shared-25 Cx (exported `Gl`): the router link the rows fall back to when no codeRowLinkComponent is given.
  [`${S25}:Cx`]: { name: 'SessionsRouterLink', features: ['prefetch:', 'scroll:'] },
  // shared-0 fZ (exported `In`): a desktop store switch OR'ed with its argument.
  [`${S0}:fZ`]: { name: 'useSessionsDesktopSwitch', features: [loose('fZ = (e) => k(ZX, dZ) || !!e')] },
  // shared-0 B (exported `xv`): the O11Y logger the served-search telemetry writes to.
  [`${S0}:B`]: { name: 'sessionsObservability', features: ['O11Y_INTERNALS'] },
  // shared-52 cB (exported `ha`): the toasts (ErrorsProvider).
  [`${S52}:cB`]: { name: 'useSessionsErrors', features: ['"Must be called within ErrorsProvider"'] },
  // shared-52 $_ / dv (exported `ih` / `nh`): the sidebar store's custom-group selectors (chat "Move to" menu).
  [`${S52}:$_`]: { name: 'useCustomGroupAssign', features: [loose('return q(Wf(ev));')] },
  [`${S52}:dv`]: { name: 'useCustomGroupAssignment', features: ['.assignments[e]'] },
  // shared-52 Xi (exported `Jx`): the sign-out reset registry (cbd6c85c8 top level `J(() => Tf.clear())`).
  [`${S52}:Xi`]: { name: 'registerSessionsReset', features: [loose('Gi.add(e)'), loose('{ durable: t = !1 } = {}')] },
  // shared-52 ZN / QN (exported `dc` / `fc`): conversation-search telemetry.
  [`${S52}:ZN`]: { name: 'trackConversationSearch', features: ['"conversationSearch"'] },
  [`${S52}:QN`]: { name: 'trackConversationSearchHandoff', features: ['"handoff"', 'variant: "recents"'] },
  // shared-78 w0 (exported `Mt`): whether a query key is fetching (the chat list).
  [`${S78}:w0`]: { name: 'useQueryKeyFetching', features: ['getQueryCache().subscribe', '.isFetching({ queryKey: e, exact: n })'] },
  // shared-78 qY (exported `pa`): the live product mode.
  [`${S78}:qY`]: { name: 'useLiveMode', features: [loose('return YY("live");')] },
  // shared-26 Vk / qk (exported `La` / `Ra`): the chats-page switch and the page variant.
  [`${S26}:Vk`]: { name: 'useChatsPageSwitch', features: ['"dramatic_shrimp"'] },
  [`${S26}:qk`]: { name: 'useSessionsPageVariant', features: [loose('return Kk(Wk());')] },
  // shared-26 aE (exported `Vs`): how many chats a delete would remove for good (chat rows only).
  [`${S26}:aE`]: { name: 'countDeletedChats', features: ['{ deleted: 0, unknown: 0 }'] },
  // shared-26 OA / DA (exported `la` / `ua`): invalidate / patch the recents queries.
  [`${S26}:OA`]: { name: 'invalidateRecents', features: [loose('e.invalidateQueries({ queryKey: [Ae] });')] },
  [`${S26}:DA`]: { name: 'patchRecents', features: ['getQueryCache()', 'fetchStatus !== "idle"'] },
  // shared-26 CA (exported `pa`): the served-search "chat source degraded" API error.
  [`${S26}:CA`]: { name: 'ServedSearchChatDegraded', features: ['"chat_source_degraded"'] },
  // shared-104 co (exported `Nm`): the lazy chunk registry (served recents search, `id`).
  [`${S104}:co`]: { name: 'defineSessionsLazyChunk', features: ['priority: e.priority ?? 100', 'state: "idle"'] },
  // shared-2 OX / D2 / pG / ih / aJ / _X / nk (exported `Pi` / `Qt` / `do` / `ny` / `wa` / `Bi` / `Dp`).
  [`${S2}:OX`]: { name: 'markPageLoad', features: ['renderMode:', 'artifactType:'] },
  [`${S2}:D2`]: { name: 'findCachedChat', features: ['getQueriesData('] },
  [`${S2}:pG`]: { name: 'useHubEligible', features: [loose('Ss("hub", e, t) || n')] },
  [`${S2}:ih`]: { name: 'useIdleReady', features: [loose('(t ? ec(() => e()) : rh)')] },
  [`${S2}:aJ`]: { name: 'useChatsViewCount', features: ['count: "fullViews"'] },
  [`${S2}:_X`]: { name: 'isLocalCoworkUnarchivable', features: [loose('return Ei(e);')] },
  [`${S2}:nk`]: { name: 'useStarredChats', features: [loose('return UO(rk);')] },
  // vendor-intl Gt / q (exported `l` / `p`): FormattedMessage and useIntl, the host intl (as code-current).
  [`${INTL}:Gt`]: { name: 'SessionsMessage', features: [loose('Gt = c(Wt, Ut)')] },
  [`${INTL}:q`]: { name: 'useSessionsIntl', features: [loose('let e = a(K);')] },
  // vendor-query J (exported `p`): useQueryClient. The Sessions page has no react-query client (the files-changes copy
  // throws without its provider), so the adapter hands out an inert client.
  [`${QUERY}:J`]: { name: 'useSessionsQueryClient', features: ['No QueryClient set, use QueryClientProvider to set one'] },
  // vendor-query st (exported `t`): useInfiniteQuery (the served recents search, disabled on the Code page).
  [`${QUERY}:st`]: { name: 'useSessionsInfiniteQuery', features: [loose('return et(e, Me, t);')] },
  // shared-3 Ky (exported `Qp`): a boolean that turns true after a delay.
  [`${S3}:Ky`]: { name: 'useDelayedFlag', features: ['setTimeout(() => i(!0), t)'] },
  // shared-18 qC (exported `ou`): the selection-active providers around the table.
  [`${S18}:qC`]: { name: 'SessionsSelectionProviders', features: ['{ active: t, children: n }', '.Provider, { value: t }'] },
  // shared-182 NB (exported `Go`): whether the window has focus.
  [`${S182}:NB`]: { name: 'useWindowFocused', features: [loose('return v(jB, MB, MB);')] },
  // shared-130 Bh / Oh / Qv / Dg / $$ / Qc: the chat-list queries and mutations.
  [`${S130}:Bh`]: { name: 'useTrimChatPages', features: ['"infinite"'] },
  [`${S130}:Oh`]: { name: 'chatListQueryKey', features: ['"infinite"', 'searchQuery: i'] },
  [`${S130}:Qv`]: { name: 'useUpdateChat', features: ['conversationUuid'] },
  [`${S130}:Dg`]: { name: 'useChatProjects', features: ['["quiet"]'] },
  [`${S130}:$$`]: { name: 'useChatArtifacts', features: ['"include_deleted_artifacts"'] },
  [`${S130}:Qc`]: { name: 'useChatPendingDelete', features: [loose('g(Bc.subscribe, t, $c)')] },
  // shared-8 __ / XC (exported `af` / `Uc`): load archived local sessions; the history entry key.
  [`${S8}:__`]: { name: 'loadArchivedSessions', features: ['loadArchivedSessions()'] },
  [`${S8}:XC`]: { name: 'useSessionsHistoryKey', features: [loose('XC = JC ?? YC')] },
  // shared-11 (exported names in parentheses).
  [`${S11}:vE`]: { name: 'useBulkDeleteTracker', features: ['navigator.userAgent'] }, // _
  [`${S11}:WE`]: { name: 'applyChatBulk', features: ['"applied"', '"rate_limited"'] }, // a
  [`${S11}:_E`]: { name: 'userFacingLoadError', features: ['"user_facing"'] }, // g
  [`${S11}:hw`]: { name: 'isHiddenCoworkRow', features: ['e.source.kind === "cowork"'] }, // ht
  [`${S11}:KE`]: { name: 'useSessionsDesktopBridge', features: [loose('return L(GE);')] }, // i
  [`${S11}:GC`]: { name: 'useSessionsPageList', features: ['hasRemoteCoworkMore', 'allCoworkSessions'] }, // jt
  [`${S11}:id`]: { name: 'useSessionsNavigate', features: ['e.push(`${t}${rd()}`)'] }, // ro
  [`${S11}:UE`]: { name: 'useChatMutation', features: ['addApiError'] }, // s
  [`${S11}:uC`]: { name: 'usePendingChats', features: ['pendingAmong(e)', 'is_pending'] }, // It
  [`${S11}:xC`]: { name: 'codeSearchRow', features: ['e.isUnread ?? !1', 'Date.parse(e.timestamp)'] }, // ot
  [`${S11}:fC`]: { name: 'coworkSearchRow', features: ['kind: "cowork", id: e.sessionId'] }, // st
  [`${S11}:op`]: { name: 'useCustomGroupKeyOf', features: ['a.sessions'] }, // ha
  // shared-16 (chat organize / move / menu pieces and the row href builder).
  [`${S16}:Bp`]: { name: 'useDeleteChatsToast', features: ['{ deleted: a, unknown: o }'] },
  [`${S16}:al`]: { name: 'useSessionsRowHref', features: ['"epitaxy-project"', '"frame-artifact"'] },
  [`${S16}:Lf`]: { name: 'SessionsChatRowMenu', features: ['onSelectForBulk', 'onRenameStart'] },
  // cc18d27d7 (the shared row menu module: readOnly, actions, cowork row, close panes).
  [`${MENU}:j`]: { name: 'isRowReadOnly', features: ['cloudReadOnly === !0', 'localReadOnly === !0'] },
  [`${MENU}:M`]: { name: 'useSessionsRowActions', features: ['readOnlyDeleteOffered', 'canSetProject'] },
  [`${MENU}:L`]: { name: 'SessionsCoworkRow', features: [loose('{ session: n } = e')] },
  [`${MENU}:N`]: { name: 'closeRowPanes', features: ['extraPanesByMode', 'closePopout('] },
  // shared-20 jA (exported `E`): whether a row can be pinned (chat / cowork only).
  [`${S20}:jA`]: { name: 'isRowPinnable', features: ['markedTemporary:', 'is_temporary'] },
  // cd540469d d / f: move rows to an existing / new custom group.
  [`${MOVE}:d`]: { name: 'moveRowsToGroup', features: ['overlayEnabled:', 'callerUnpins:'] },
  [`${MOVE}:f`]: { name: 'moveRowsToNewGroup', features: ['addCustomGroup(o)'] },
  // shared-156 _m (exported `Pg`): navigation performance marks.
  [`${S156}:_m`]: { name: 'markNavigation', features: ['performance.mark('] },
};

// Bindings of other chunks Hf imports that no generated module exports: sliced verbatim here (roots pinned by features).
const pure = [
  // shared-25 QV (set toggle) is not sliced here: view-tabs publishes it as setToggle (w12-viewtabs, D1), so Hf imports
  // that copy through the holders below.
  { target: 'pure-shared-25.mjs', source: S25, exports: { JV: 'setUnion', YV: 'setDifference' },
    features: { JV: ['n.add(e)'], YV: ['t.has(r) || n.add(r)'] } },
  // shared-0 ra (session id -> "ccr" / "local") is not sliced here: cowork-home/shared-0-DDOOdL6P.mjs already holds and
  // exports it, so Hf imports that copy (D1; w11-sweep-ccres). Roots below are checked against the holders.
  { target: 'pure-shared-0.mjs', source: S0, exports: { Oz: 'servedRecentsSearchKey' },
    features: { Oz: ['"served-recents-search"'] } },
  { target: 'pure-shared-52.mjs', source: S52, exports: { OT: 'useLatchedValue' }, features: { OT: ['t.mode === "latest"'] } },
  { target: 'pure-shared-78.mjs', source: S78, exports: { Sv: 'sidebarMessages', hv: 'sidebarListMessages', zy: 'useCoworkOnlyMode' },
    features: { Sv: [loose('return cp() ? xv : bv;')], hv: ['"Untitled"', '"Recents"'], zy: [loose('return (Ty(), !1);')] } },
  { target: 'pure-shared-26.mjs', source: S26,
    exports: { EA: 'steadyOasisGateKey', wA: 'ServedSearchCursorInvalid', xA: 'ServedSearchUnavailable', TA: 'recentsRowRef', rE: 'attachedChatUuid' },
    features: { EA: ['"cai_steady_oasis"'], wA: ['"ServedSearchCursorInvalid"'], xA: ['"ServedSearchUnavailable"'], TA: ['kind: "code", id: e.session.id'], rE: ['"attachedChatUuid" in e'] } },
  { target: 'pure-shared-2.mjs', source: S2, exports: { yK: 'useCoworkChatsInRecents', AX: 'pinFailedMessage' },
    features: { yK: [loose('return jn(cK, vK());')], AX: ['.pinFailed', '.unpinFailed'] } },
  { target: 'pure-shared-5.mjs', source: S5, exports: { zk: 'historyEntryKey' }, features: { zk: ['__TSR_key'] } },
  { target: 'pure-vendor-query.mjs', source: QUERY, exports: { ie: 'keepPreviousData' }, features: { ie: [loose('function ie(e) { return e; }')] } },
  { target: 'pure-shared-182.mjs', source: S182, exports: { sY: 'settleWithConcurrency' }, features: { sY: ['status: "fulfilled"'] } },
  { target: 'pure-shared-130.mjs', source: S130, exports: { yh: 'sharedChatLimit', jh: 'chatListDefaults' },
    features: { yh: [loose('yh = 1e4')], jh: ['{ limit: 30, archived: !1 }'] } },
  { target: 'pure-shared-8.mjs', source: S8, exports: { EE: 'openCreateProject', Xb: 'trackChatMoved' },
    features: { EE: [loose('TE.forEach((e) => {')], Xb: ['origin: "chats_page"'] } },
  { target: 'pure-shared-11.mjs', source: S11,
    exports: { xT: 'coworkTaskUuidsToDelete', ST: 'deleteCoworkTasksLabel', $m: 'oldestLoadedAcross', eh: 'rowsSinceOldest', th: 'pagesAtOldest',
      Tx: 'useSessionsPageMounted', uw: 'isStarredRow', EC: 'reconcileRows', eC: 'chatRowLiveStatusSource', tC: 'chatSearchRow' },
    features: { xT: ['deletes_cowork_session === !0'], ST: ['.deleteCoworkTasksCount'], $m: ['oldestLoadedMs'], eh: ['e.updatedAtMs >= t'],
      th: ['i.hasMore'], Tx: ['e = Ex(!0)'], uw: [loose('return e.isStarred;')], EC: ['r.set(X(e.ref), e)'], eC: [loose('return ux() ? $S : void 0;')],
      tC: ['kind: "chat", id: e.uuid'] } },
  { target: 'pure-c36a59cfe.mjs', source: 'c36a59cfe-D_Gw-sC6.js', exports: { n: 'useLoadMoreSentinel' }, features: { n: [loose('let $ = J9(19)')] } },
  { target: 'pure-cb5a8eb56.mjs', source: 'cb5a8eb56-B9qWyNr0.js', exports: { i: 'useSearchTelemetry' }, features: { i: ['searchVersion:'] } },
  { target: 'pure-ccd3f66ef.mjs', source: 'ccd3f66ef-DpchzIn2.js', exports: { b: 'artifactsStaleTime', W: 'hasChatArtifact' },
    features: { b: [loose('b = 6e4')], W: ['chat_conversation_uuid === t'] } },
];
const page = { target: 'sessions-page-hf.mjs', source: PAGE, exports: { Hf: 'SessionsPageHf' },
  features: { Hf: ['codeRowLinkComponent:', 'reportsRecentsLoad:', 'renderCodeRowActions:', '"chats_load"', '"recents_load"', loose('let $ = J9(537)')] } };
const modules = [...pure, page];

// ---------------------------------------------------------------- reading the original chunks
const formatted = new Map();
async function readSource(name, dir = source) {
  const key = path.join(dir, name);
  if (formatted.has(key)) return formatted.get(key);
  const bytes = await fs.readFile(key);
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const record = { name, bytes, code, program, exported: chunkExports(bytes.toString()) };
  formatted.set(key, record);
  return record;
}
const raw = new Map();
async function readRaw(name, dir = source) {
  const key = path.join(dir, name);
  if (!raw.has(key)) {
    const bytes = await fs.readFile(key);
    raw.set(key, { name, bytes, text: bytes.toString(), exported: chunkExports(bytes.toString()) });
  }
  return raw.get(key);
}
function chunkExports(text) {
  const at = text.lastIndexOf('export{');
  if (at < 0) throw Error('chunk without an export table');
  const map = new Map();
  for (const part of text.slice(at + 7, text.indexOf('}', at)).split(',')) {
    const [local, alias] = part.trim().split(/\s+as\s+/);
    map.set(alias ?? local, local);
  }
  return map;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const nodeDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const p = src.program.scope.getBinding(n)?.path;
    if (!p || p.isImportSpecifier()) return;
    parts.push(declarationText(src, p));
    for (const dep of nodeDeps(src, p)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? String(f) : JSON.stringify(f))).join(', ')}`);
}
async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
function exportTable(text) {
  const map = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      map.set(local, as ?? local);
    }
  return map;
}

// ---------------------------------------------------------------- holders: generated 3.6556.2 modules
// `${officialFile}:${local}` -> [{ area, file, name }]: view-tabs public names, then whole-binding slices of the other
// generated areas (code-current first) whose manifest record names the same official file with the same sha256 and
// whose output declares and exports that local.
let holderIndex;
async function holders() {
  if (holderIndex) return holderIndex;
  holderIndex = new Map();
  const add = (key, entry) => { if (!holderIndex.has(key)) holderIndex.set(key, []); holderIndex.get(key).push(entry); };
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  for (const [name, pub] of Object.entries(viewTabs.publicNames ?? {}))
    add(`${pub.file}:${pub.local}`, { area: 'view-tabs', file: path.join(generatedRoot, 'view-tabs', pub.file), name });
  // code-current first, then the Code page's own areas (files-changes: shared-104 Cm withLoadingFlag, which W13's
  // cowork-progress sliced a second time; w13-close-rail-regen keeps the Sessions page on the Code copy), then the rest.
  const preferred = ['code-current', 'files-changes'];
  const rank = a => (preferred.includes(a) ? preferred.indexOf(a) : preferred.length);
  const areas = (await fs.readdir(generatedRoot, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)
    .filter(a => a !== 'view-tabs' && a !== 'sessions-page').sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const officialSha = new Map();
  for (const area of areas) {
    const manifest = await readJson(path.join(generatedRoot, area, 'manifest.json')).catch(() => null);
    for (const module of manifest?.modules ?? []) {
      if ((module.referenceVersion ?? manifest.referenceVersion) !== referenceVersion || !module.target || module.sourceSelections) continue;
      if (module.kind === 'copy' || typeof module.source !== 'string') continue;
      const file = path.basename(module.source);
      if (!officialSha.has(file)) officialSha.set(file, await fs.readFile(path.join(source, file)).then(sha, () => null));
      if (!module.sourceSha256 || officialSha.get(file) !== module.sourceSha256) continue;
      const target = path.join(generatedRoot, area, module.target);
      const text = await fs.readFile(target, 'utf8').catch(() => null);
      if (!text) continue;
      const exported = exportTable(text);
      for (const binding of module.bindings ?? []) {
        const local = typeof binding === 'string' ? binding : binding.name;
        const declared = new RegExp(`(?:^|\\n)(?:async\\s+)?(?:function\\s+|class\\s+|var\\s+|let\\s+|const\\s+|\\s+)${local.replace(/\$/g, '\\$')}\\s*(?:\\(|=|\\{|extends)`).test(text);
        if (exported.has(local) && declared) add(`${file}:${local}`, { area, file: target, name: exported.get(local) });
      }
    }
  }
  return holderIndex;
}

// ---------------------------------------------------------------- resolving one original import
async function resolveImport({ self, file, alias, emitted, via }) {
  // vendor-frame: React / ReactDOM by alias; anything else (clsx `Ba`) only as a view-tabs public name below.
  if (file === VENDOR && official.reactAliases[alias]) {
    const react = official.reactAliases[alias];
    official.assertVendorAlias((await readRaw(VENDOR)).text, alias);
    return { from: react[0], name: react[1], via, kind: 'react' };
  }
  const chunk = await readRaw(file);
  const local = chunk.exported.get(alias);
  if (!local) throw Error(`${via} is not exported`);
  return (await resolveLocal({ self, file, local, emitted, via })) ?? (() => { throw Error(`${via}: unresolved ${file}:${local}`); })();
}
async function resolveLocal({ self, file, local, emitted, via }) {
  const key = `${file}:${local}`;
  const sibling = emitted.find(m => m.spec.source === file && m.spec.exports[local]);
  if (sibling) return { from: rel(self, path.join(output, sibling.spec.target)), name: sibling.spec.exports[local], via, kind: 'generated', original: key };
  if (adapters[key]) {
    const entry = adapters[key];
    assertFeatures(`adapter ${key}`, closureText(await readSource(file), local), entry.features);
    return { from: rel(self, adapterFile), name: entry.name, via, kind: 'adapter', original: key };
  }
  const held = (await holders()).get(key)?.[0];
  if (held) return { from: rel(self, held.file), name: held.name, via, kind: 'held', area: held.area, original: key };
  return null;
}

// ---------------------------------------------------------------- dynamic imports -> the official failure branch
function rewriteDynamicImports(src, p, name) {
  const edits = [], records = [];
  p.traverse({
    CallExpression(c) {
      const node = c.node;
      if (node.callee.type === 'Import' || node.callee.type === 'ImportExpression') {
        const spec = node.arguments[0];
        if (spec?.type !== 'StringLiteral') throw Error(`${name}: non-literal dynamic import`);
        edits.push({ node, text: `Promise.reject(Error(${JSON.stringify(`${spec.value.replace(/^\.\//, '')} is not part of OpenClaude (sessions-page)`)}))` });
      } else if (node.callee.type === 'Identifier' && node.callee.name === '__vite__mapDeps') {
        edits.push({ node, text: 'void 0' });
      }
    },
    ImportExpression(c) {
      const spec = c.node.source;
      if (spec?.type !== 'StringLiteral') throw Error(`${name}: non-literal dynamic import`);
      edits.push({ node: c.node, text: `Promise.reject(Error(${JSON.stringify(`${spec.value.replace(/^\.\//, '')} is not part of OpenClaude (sessions-page)`)}))` });
    },
  });
  if (!edits.length) return null;
  let text = declarationText(src, p);
  for (const edit of edits.sort((a, b) => b.node.start - a.node.start)) {
    const start = edit.node.start - p.node.start, end = edit.node.end - p.node.start;
    records.unshift({ binding: name, original: text.slice(start, end), replacement: edit.text });
    text = text.slice(0, start) + edit.text + text.slice(end);
  }
  return { text, records, drop: '__vite__mapDeps' };
}

// ---------------------------------------------------------------- slices
async function sliceModule(spec, emitted) {
  const src = await readSource(spec.source);
  const self = path.join(output, spec.target);
  const selected = new Map(), imports = new Map(), seen = new Set(), rewrites = [];
  const add = async name => {
    if (seen.has(name)) return;
    seen.add(name);
    const via = `${spec.source}:${name}`;
    if (!spec.exports[name]) {
      const resolved = await resolveLocal({ self, file: spec.source, local: name, emitted, via });
      if (resolved) { imports.set(name, resolved); return; }
    }
    const binding = src.program.scope.getBinding(name);
    if (!binding) throw Error(`${spec.target}: unbound ${name}`);
    const p = binding.path;
    if (p.isImportSpecifier()) {
      const file = p.parent.source.value.replace(/^\.\//, '');
      imports.set(name, await resolveImport({ self, file, alias: p.node.imported.name, emitted, via: `${file}:${p.node.imported.name}` }));
      return;
    }
    if (!p.isFunctionDeclaration() && !p.isVariableDeclarator() && !p.isClassDeclaration()) throw Error(`${spec.target}: unsupported declaration ${name}`);
    const rewrite = rewriteDynamicImports(src, p, name);
    if (rewrite) rewrites.push(...rewrite.records);
    selected.set(name, { p, text: rewrite?.text ?? declarationText(src, p) });
    for (const dep of nodeDeps(src, p)) if (dep !== rewrite?.drop) await add(dep);
  };
  for (const name of Object.keys(spec.exports)) {
    const binding = src.program.scope.getBinding(name);
    if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
    assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
    // D1: a root another generated 3.6556.2 module already holds and exports is imported from there, never sliced twice.
    const holder = (await holders()).get(`${spec.source}:${name}`)?.[0];
    if (holder) throw Error(`${spec.target}: root ${name} is already held by ${holder.area}/${path.basename(holder.file)} (${holder.name}); import it (D1)`);
    await add(name);
  }
  // Top-level statements of the chunk that are not declarations but touch a selected binding run as in the original
  // (cbd6c85c8 `var Tf=new Map;J(()=>Tf.clear());`: Tf registers with the shared-52 Xi sign-out reset). They are
  // emitted verbatim in source order, their own dependencies resolved like any other; repeated until nothing new.
  const statements = new Map();
  for (let grew = true; grew;) {
    grew = false;
    for (const p of src.program.get('body')) {
      if (!p.isExpressionStatement() || statements.has(p.node)) continue;
      const deps = nodeDeps(src, p);
      if (!deps.some(d => selected.has(d))) continue;
      if (rewriteDynamicImports(src, p, 'top-level statement')) throw Error(`${spec.target}: dynamic import in a top-level statement`);
      statements.set(p.node, p);
      grew = true;
      for (const dep of deps) await add(dep);
    }
  }
  // A declarator that other code reassigns (`rd`) or that reads __vite__mapDeps only through a rewritten load stays
  // as written; everything selected is emitted in source order.
  const order = [...selected].sort((a, b) => a[1].p.node.start - b[1].p.node.start);
  const emittedStatements = [...statements.values()].map(p => ({ p, text: declarationText(src, p) }));
  const blocks = [...order.map(([, entry]) => entry), ...emittedStatements].sort((a, b) => a.p.node.start - b.p.node.start)
    .map(({ p, text }) => (p.isVariableDeclarator() ? `var ${text};` : text));
  const groups = new Map();
  for (const [local, entry] of imports) {
    if (!groups.has(entry.from)) groups.set(entry.from, []);
    groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
  }
  const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
  const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
  const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-sessions-page.mjs.\n// Edit the extractor or src/source-sessions-page-hf-adapters.jsx, never this file.\n`;
  const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
  emitted.push({ spec });
  return {
    text,
    record: {
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion, kind: 'slice',
      bindings: order.map(([name, { p }]) => ({ name, sha256: sha(declarationText(src, p)) })),
      ...(rewrites.length ? { rewrites } : {}),
      ...(emittedStatements.length ? { statements: emittedStatements.sort((a, b) => a.p.node.start - b.p.node.start).map(({ text }) => ({ text, sha256: sha(text) })) } : {}),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.area ? { area: e.area } : {}), ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    },
  };
}

export async function extractSessionsPage({ check = false } = {}) {
  official.assertCompilerHelpers((await readRaw(SF)).text);
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-sessions-page.mjs',
    adapterModule: 'src/source-sessions-page-hf-adapters.jsx', root: `${PAGE}:Hf`, modules: [],
  };
  const files = {}, emitted = [];
  for (const spec of modules) {
    const { text, record } = await sliceModule(spec, emitted);
    files[spec.target] = text;
    manifest.modules.push(record);
  }
  // Every adapter is used (an unused entry would hide a binding that moved).
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.original)));
  const unused = Object.keys(adapters).filter(k => !used.has(k));
  if (unused.length) throw Error(`unused adapters: ${unused.join(', ')}`);
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const own = Object.keys(files);
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort();
    if (JSON.stringify(present) !== JSON.stringify([...own].sort())) throw Error(`Sessions page output set changed: ${present.join(',')}. Run scripts/extract-sessions-page.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8').catch(() => null) !== text) throw Error(`Sessions page source mismatch: ${name}. Run scripts/extract-sessions-page.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!own.includes(name)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} sessions page modules (${count} sliced bindings, ${used.size} adapters, ${referenceVersion}).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractSessionsPage({ check: process.argv.includes('--check') });
