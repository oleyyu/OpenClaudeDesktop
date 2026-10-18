// R4f-rail SR-3: extract the 2.42304.0 Code session rail's Servers and Background tasks sections, without executing any
// desktop runtime (decision D0: own generator, own output folder src/generated/session-rail-sections, own
// scripts/verify-gen-session-rail-sections.mjs). Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.2,
// §1.3, §3 #21 / #22, §8 SR-3, §10.
//
//   servers-card.mjs           cf74bc599 QD: the Servers section (fO hands it to the rail as `serversSection:
//                              u(QD, { sessionRef, readOnly })`). The session's local dev servers (HD: the active
//                              servers under the session's working folder, not stopped, not a hosted page) sorted by
//                              start, each openable in the Preview pane, with Stop; the remote servers of a remote
//                              session (`B("sink_planter_vase")`) are a GrowthBook branch that is off here, so that list
//                              is always empty. ZD (stop, the row the Preview pane shows), XD (the card: "Servers",
//                              "{count} running", four rows then Show more), YD (a row: name, localhost:port or
//                              "Starting…" / "Failed to start", Open {name} in Preview, Stop this server).
//   background-tasks-card.mjs  cf74bc599 BD: the Background tasks section (`backgroundSection: u(BD, …)`). Running tasks
//                              (not ambient) and the session's loops / scheduled prompts that have not expired, "{count}
//                              finished" (the not-dismissed tasks that are no longer live), Stop with "Stop requested…" /
//                              "Task stopped" / "Loop stopped" announcements. zD (stop / open in the Tasks pane), LD (the
//                              card), ID (a row), PD / ND (Next {countdown} / elapsed), MD (icon), FD (Stop label), jD.
//   …                          and the pure originals those read: cccc2cf0a cE / QT / EE / OE (task groups, dismissed
//                              match, a loop's next run, the countdown), cea7057eb T / D (loop expiry, ambient task),
//                              c96d752d0 bG / xG with c2fd10b8d Go, cd902d735 o / u, shared-28 cA, shared-78 lj / uj / $A,
//                              shared-52 na / ra / ia / la / ha, shared-0 ib / Gi, shared-2 Wh (a task title that names an
//                              artifact link; a dev server URL hosted by claude.ai), shared-19 l2 / SW, shared-182 bV,
//                              shared-25 hi / MU, shared-156 OB / zP, cd4f82e77 O (minute / second clocks), shared-20 uE /
//                              pE (the live-region announcement), vendor-query E, c155b6b71 v (a preview's tabs) and
//                              c227f4d5e zR / oz / gz / Pz.
//
// The Context section (c73f45bc3 iy / ay, `contextSection: u(cg, { scopeStore, sessionRef })`) was deferred here (SR-3);
// R4i-rail RL3 emits it from its own generator, scripts/extract-session-rail-context.mjs (src/generated/session-rail-context),
// which pins fO's call site and re-measures the panel (c227f4d5e F, local hZ) it stands in for. `deferred` stays empty.
//
// Every emitted binding is an original top-level declaration sliced from the installed chunk. A module's bindings are the
// reachable closure of its roots (Babel's scope analysis names what each declaration reads from outside). An import or
// same-chunk binding resolves, in this order, to: a host adapter (src/source-session-rail-sections-adapters.jsx, or the
// kit's adapter module for react-intl), feature-checked against the original it replaces; an earlier module of this area;
// a public name of the session rail kit (R4f-rail SR-1, one copy of RailCard, the row primitives, the focus rescue …); a
// semantic public name of view-tabs (D1/D24); React (a vendor-frame `X = <React namespace>.member`); or the export of
// another generated area that already slices the same original binding (code-current, files-changes, sidebar-resize).
// A binding one of those areas slices without exporting is refused unless `duplicates` says why a second copy is
// harmless, and no createContext may be sliced here at all (the rail's contexts are the kit's).
//
// The host data plane — the session meta query (c5da7eb42 Q), the active servers store (shared-1 ym, which reads
// `globalThis["claude.web"].Launch`), the session tasks context (cea7057eb g), the session scope store (c03935b01:
// side panes, stopping ids), the stop mutations (cccc2cf0a d / f / l) and the Tasks pane opener (c227f4d5e nr) — is
// replaced by adapters that read SessionRailSectionsHostContext (the rail's mount provides it, SR-7) and the host's
// own task rows / dismissed task stores.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/session-rail-sections');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-sections-adapters.jsx';
const kitAdapterModule = '../../source-session-rail-kit-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = 'vendor-frame-DfPJ1QmD.js';

// vendor-frame's React namespaces: `X = <ns>.member` is `import { member } from <module>`. Each namespace is proved by
// strings of the CommonJS factory its closure wraps (as in extract-session-rail-kit.mjs).
const reactNamespaces = {
  o: { module: 'react', features: ['.useSyncExternalStore=function', '.forwardRef=function', '.useEffectEvent=function'] },
  fe: { module: 'react/jsx-runtime', features: ['.jsxs='] },
  Ln: { module: 'react-dom', features: ['.createPortal=function', '.flushSync=function'] },
};

// Host dependencies, keyed by the original binding (file:local) an import resolves to. `features` must appear in that
// binding's prettier form (`closure: true`: in the raw text of its same-chunk closure). `module` overrides the adapter
// module (the kit's react-intl adapters are shared, not repeated).
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters: useStartIntl / StartMessage).
  'vendor-intl-Db7hDWRO.js:q': { name: 'useIntl', module: kitAdapterModule, features: ['let e = o(K);', 'return (Mt(e), e);'] },
  'vendor-intl-Db7hDWRO.js:Gt': { name: 'FormattedMessage', module: kitAdapterModule, features: ['var Gt = u(Wt, Ut);'] },
  // c5da7eb42 Q (local iM): the session meta query with a `select` (QD reads workingDir / originCwd, BD loops / tags /
  // isArchived / createdAt). Host: the meta the rail's mount puts in SessionRailSectionsHostContext.
  'c5da7eb42-B8cTG8SI.js:iM': { name: 'useSessionRailMeta', features: ['return Q(e, {', 'select: t,', 'passive: n?.passive ?? !1,'] },
  // c5da7eb42 B (local LM): whether a remote session's bridge is up (QD asks only for a remote session under
  // sink_planter_vase). No remote sessions here: false.
  'c5da7eb42-B8cTG8SI.js:LM': { name: 'useRemoteSessionBridgeUp', features: ['let { data: t } = Q(e, { select: sc, passive: !0 });', 'return t ?? !1;'] },
  // c227f4d5e Ki (local Mz): a remote session's servers (`e === null` gives the shared empty list). Always empty here.
  'c227f4d5e-Ba-r--Rl.js:Mz': { name: 'useRemoteSessionServers', features: ['if (e === null) return mz;', 'return he(n, ue);'] },
  // c227f4d5e oa (local WR): the per-folder preferred preview server (localStorage "preferredPreviewServers"), written
  // when a row opens its server. Host: the mount's rememberPreviewServer, when it has one.
  'c227f4d5e-Ba-r--Rl.js:WR': { name: 'usePreferredPreviewServers', closure: true, features: ['let[e,t]=Bc(LR,RR);', 'LR="preferredPreviewServers"'] },
  // c227f4d5e nr (local HW): the Tasks pane opener (finished: expand the finished section; a taskId: open at that task;
  // else the pane), null without side panes. Host: the mount's openTasksPane.
  'c227f4d5e-Ba-r--Rl.js:HW': { name: 'useOpenTasksPane', features: ['openTasksPaneAtTask: n,', 'expandFinishedSection: r,', 'return a ? s : null;'] },
  // cccc2cf0a p (local nE): the session's stopping ids of one kind ("server" / "loop" / "task") in the scope store
  // (stoppingIdsBySession, markStopping / releaseStopping). Host: taskRowsStore, the same per-session store the
  // Background tasks pane keeps its pending stops in.
  'cccc2cf0a-B0D--VZp.js:nE': { name: 'useRailStoppingIds', features: ['{ isStopping: i, markStopping: a, releaseStopping: o } = dd();', 'release: O((e) => o(n, t, e), [o, n, t]),'] },
  // cccc2cf0a h (local tE): the session's dismissed task ids (localStorage "epitaxy.dismissedTasksMap"). Host:
  // dismissedTasksStore, the Tasks pane's own store of the same thing (ES / wS / TS).
  'cccc2cf0a-B0D--VZp.js:tE': { name: 'useDismissedTaskIds', closure: true, features: ['BT="epitaxy.dismissedTasksMap"', 'function tE(e){return k(JT,()=>qT(e),()=>qT(e))}'] },
  // cccc2cf0a d (local iE): stop a dev server through `claude.web Launch.stopServer` ("Couldn’t stop the preview
  // server." on failure). Host: the mount's stopServer.
  'cccc2cf0a-B0D--VZp.js:iE': { name: 'useServerStop', features: ['let c = oe?.stopServer?.(i);', 'defaultMessage: "Couldn\\u2019t stop the preview server.",', 'handleStopServer: O('] },
  // cccc2cf0a f (local rE): stop a loop by sending Claude "Cancel the recurring loop … by calling CronDelete". Host: the
  // mount's stopLoop (this host's scheduler stops its own jobs).
  'cccc2cf0a-B0D--VZp.js:rE': { name: 'useLoopStop', features: ['Em("tasks_stop_loop")', 'by calling CronDelete, then confirm.', 'handleStopLoop: O('] },
  // cccc2cf0a l (local oE): stop a background task (c6b8adeaf's stopBackgroundTask mutation), with the "Stop review?"
  // confirmation for ultrareview runs. Host: the mount's stopTask; no review runs here, so no dialog.
  'cccc2cf0a-B0D--VZp.js:oE': { name: 'useTaskStop', features: ['handleStop: T,', 'stoppingTaskIds: o,', 'confirmDialog: g(aE, { open: D, onConfirm: M, onClose: N }),'] },
  // shared-25 Th (local Zs): a GrowthBook feature's `.on`. No GrowthBook here (D29 / D31): off.
  'shared-25-DP8p7i1Z.js:Zs': { name: 'useGrowthBookFeature', features: ['return Rs(I(e)).on;'] },
  // shared-78 ss (local SU): whether a preview opens in the browser instead of the Preview pane (local sessions:
  // `!!Launch && frontend_preview_external_domains`). No claude.web Launch / GrowthBook here: false.
  'shared-78-D6VXYXaQ.js:SU': { name: 'usePreviewOpensInBrowser', features: ['return e === "remote" ? n && r : t;'] },
  // shared-1 ym (local cu): the active dev servers from `globalThis["claude.web"].Launch.activeServersStore`. Host: the
  // mount's servers (the session's preview servers, in the official row shape).
  'shared-1-CAAiD7E3.js:cu': { name: 'useActiveServers', closure: true, features: ['su?.activeServersStore?{state:"loading"}:{state:"missing"}', 'su=globalThis["claude.web"]?.Launch'] },
  // shared-0 Cm (local Fx): the claude.web Launch bridge. This host has none (its preview is its own pane).
  'shared-0-ByI5P0CP.js:Fx': { name: 'claudeWebLaunch', features: ['var Fx = globalThis["claude.web"]?.Launch;'] },
  // c03935b01 mt / pt / ct / M (locals _c / Q / wc / To): the session scope store's context, a selector over it, whether
  // this window hosts native previews and whether a side pane is open. Host: the mount's sidePanes.
  'c03935b01-CyJKQj4N.js:_c': { name: 'useRailScopeStoreApi', features: ['return f(Z);'] },
  'c03935b01-CyJKQj4N.js:Q': { name: 'useRailScopeState', features: ['let t = f(Z);', 'return Ye(t ?? fc, e);'] },
  'c03935b01-CyJKQj4N.js:wc': { name: 'useRailPreviewViews', features: ['return Q((e) => oa(e.host));'] },
  'c03935b01-CyJKQj4N.js:To': { name: 'railSidePaneOpen', features: ['if (e.currentSessionId === t) return b(e.tileLayout).has(n);'] },
  // c155b6b71 c (local f): the session's own preview id, only with claude.web Launch tabs (`hU()` needs Launch).
  // undefined here: a row opens its server by id.
  'c155b6b71-CwKMsMtR.js:f': { name: 'useSessionPreviewId', features: ['if (!(e?.id === void 0 || !t)) return s(e.id);'] },
  // c68c4283d yd / id (locals _u / Cd): side pane and rail stop telemetry. Nothing is sent (D17).
  'c68c4283d-CPuRD0vx.js:_u': { name: 'logSidePaneOpened', features: ['presentation: fe(e, r) ? "overlay" : "split",'] },
  'c68c4283d-CPuRD0vx.js:Cd': { name: 'logRailStopPressed', features: ['u("claudeai.epitaxy.session_rail.background_stop_pressed", e);'] },
  // cea7057eb g (local ve): the session's background tasks (a context, [] by default). Host: the mount's tasks.
  'cea7057eb-p4xbrGBz.js:ve': { name: 'useSessionTasks', closure: true, features: ['function ve(){return n(X)}', 'X=t(O)', 'O=[]'] },
};

// Original bindings another importable area slices without exporting that this area may slice again. Pure functions
// and plain data only; nothing that holds state.
const duplicates = {
  // vendor-query E (react-query's replaceEqualDeep) with its helpers: files-changes slices them inside its query module
  // without exporting them.
  'vendor-query-Dqcf4jOo.js:E': 'pure function (no state)', 'vendor-query-Dqcf4jOo.js:te': 'pure function (no state)',
  'vendor-query-Dqcf4jOo.js:O': 'pure function (no state)', 'vendor-query-Dqcf4jOo.js:ne': 'pure function (no state)',
  'vendor-query-Dqcf4jOo.js:ee': 'Object.prototype.hasOwnProperty (no state)',
  // shared-25 vi: the empty function an external source's idle cleanup is (files-changes' subscribe-never.mjs slices it
  // behind its subscribeNever export).
  'shared-25-DP8p7i1Z.js:vi': 'empty function (no state)',
};
// Generated areas whose exports this generator imports (one copy of a binding they already slice). Areas still being
// written by other steps of this round are not listed, so --check does not change under them.
const importableAreas = ['code-current', 'sidebar-resize', 'files-changes'];

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text.
const modules = [
  // ---- shared-52 / shared-0 / shared-2 / shared-78 / shared-28: URL kinds (hosted pages, artifact links) ----
  // shared-52: the claude.ai app / preview hosts (na / ra, and ia the preview host aliases), the artifact page path's
  // uuid (la) and the design project path (ha).
  { target: 'claude-hosts.mjs', source: 'shared-52-DGviI8xb.js',
    exports: { na: 'CLAUDE_APP_HOSTS', ra: 'CLAUDE_PREVIEW_HOSTS', ia: 'CLAUDE_PREVIEW_HOST_ALIASES', la: 'artifactPathUuid', ha: 'DESIGN_PROJECT_PATH' },
    features: { na: ['na = Object.values(ta)'], ra: ['ra = Object.keys(ta)'], ia: ['ia = new Map(Object.entries(ta))'], la: ['let t = sa.exec(e)?.[1];', 'return ca(t)?.uuid;'],
      ha: ['/^\\/design\\/p\\/'] } },
  // shared-0 Gi: a URL from text that starts with a scheme (null otherwise).
  { target: 'absolute-url.mjs', source: 'shared-0-ByI5P0CP.js', exports: { Gi: 'parseAbsoluteUrl' },
    features: { Gi: ['if (!Wi.test(Ui(e))) return null;', 'return new URL(e);'] } },
  // shared-0 ib: the dev server status enum (starting / running / error / stopped).
  { target: 'dev-server-status.mjs', source: 'shared-0-ByI5P0CP.js', exports: { ib: 'DevServerStatus' },
    features: { ib: ['(e.Starting = "starting"),', '(e.Running = "running"),', '(e.Error = "error"),', '(e.Stopped = "stopped"),'] } },
  // shared-2 Wh: a URL hash kept only when it is a plain fragment id.
  { target: 'url-anchor.mjs', source: 'shared-2-Cb74JByF.js', exports: { Wh: 'plainAnchor' }, features: { Wh: ['return Uh.test(e) ? e : void 0;'] } },
  // shared-78: lj (an https claude.ai page URL: an artifact or design page — a server whose externalUrl is one is not
  // listed), uj (an artifact page URL) and $A (a preview id of an HTML / browser / design preview, not a dev server).
  { target: 'hosted-page-url.mjs', source: 'shared-78-D6VXYXaQ.js', exports: { lj: 'isHostedPageUrl', uj: 'isArtifactPageUrl', $A: 'isPagePreviewId' },
    features: { lj: ['t.protocol === "https:" &&', 'aj.has(t.host) &&', '(_i(t.pathname) !== void 0 || di.test(t.pathname));'],
      uj: ['return e ? _i(URL.parse(e)?.pathname ?? "") !== void 0 : !1;'], $A: ['return kA(e) || jA(e) || NA(e);'] } },
  // shared-28 cA: an artifact link as the pane opens it ({ url, label, anchor }).
  { target: 'artifact-link.mjs', source: 'shared-28-DcgD7xXH.js', exports: { cA: 'artifactPaneLink' },
    features: { cA: ['if (t === void 0 || !gr(t) || !xr(t)) return;', 'label: t.slice(t.lastIndexOf("/") + 1),'] } },
  // cd902d735 o / u: bare http(s) URLs in text and the punctuation that trails one.
  { target: 'text-urls.mjs', source: 'cd902d735-DUvLyT6a.js', exports: { o: 'TEXT_URL_PATTERN', u: 'splitUrlTrail' },
    features: { o: ['o = /https?:\\/\\/[^\\s<>]+/g'], u: ['l.test(t) && (t = t.slice(0, -1));', 'return [t, e.slice(t.length)];'] } },
  // c2fd10b8d Go: text split around its artifact links.
  { target: 'artifact-link-parts.mjs', source: 'c2fd10b8d-BM8B1vbe.js', exports: { Go: 'artifactLinkParts' },
    features: { Go: ['if (!e.includes("://")) return;', 't.push({ href: i, paneUrl: a.url }),'] } },
  // c96d752d0 bG / xG: a task description's "artifact <link>" words (never for local_bash) and their plain text: the
  // Background tasks row title of a task without a name (cf74bc599 RD).
  { target: 'task-description.mjs', source: 'c96d752d0-BOCqU7c2.js', exports: { bG: 'taskDescriptionParts', xG: 'taskDescriptionText' },
    features: { bG: ['if (t !== void 0 && wWe.has(t)) return;', 'r.push({ word: t[1], href: e.href, paneUrl: e.paneUrl }),'],
      xG: ['return e.map((e) => (typeof e == "string" ? e : e.word)).join("");'] } },

  // ---- task grouping, loops and clocks ----
  // shared-19 l2 (partition) and SW (Intl list of duration units, the countdown's formatter).
  { target: 'partition.mjs', source: 'shared-19-CkPOiIKm.js', exports: { l2: 'partition' }, features: { l2: ['for (let i of e) (t(i) ? n : r).push(i);'] } },
  { target: 'duration-units.mjs', source: 'shared-19-CkPOiIKm.js', exports: { SW: 'formatDurationUnits' },
    features: { SW: ['return e.formatList(', 'style: "unit",', '...(a && n > 0 ? { minimumIntegerDigits: 2 } : null),'] } },
  // shared-182 bV: group by key.
  { target: 'group-by.mjs', source: 'shared-182-eT1kXtya.js', exports: { bV: 'groupBy' }, features: { bV: ['let n = Object.create(null),'] } },
  // cea7057eb T (a loop has expired: a one-shot past its run plus grace, else three days after it was created) and D
  // (an ambient task: dream / auto mode scan / an artifact's live updates monitor, never a row).
  { target: 'task-kinds.mjs', source: 'cea7057eb-p4xbrGBz.js', exports: { T: 'loopExpired', D: 'isAmbientTask' },
    features: { T: ['? t >= Math.max(e.nextRunAt, r.from ?? 0) + r.graceMs', ': t > e.createdAt + n;'], D: ['e.ambient === !0 ||', 'e.wireTaskType === "auto_mode_scan" ||'] } },
  // cccc2cf0a cE (running / finished task groups: parent tasks with their children, finished newest first), QT (a task
  // the user dismissed), EE (a loop's next run, stepping a simple cron past now) and OE (the narrow countdown).
  { target: 'task-groups.mjs', source: 'cccc2cf0a-B0D--VZp.js', exports: { cE: 'groupTasks', QT: 'isDismissedTask', EE: 'loopNextRunAt', OE: 'formatCountdown' },
    features: { cE: ['return { running: n, finished: lE(r, t) };'], QT: ['return t.runId === void 0', '? e.has(t.taskId)'],
      EE: ['if (e.nextRunAt > t || e.recurring === !1) return e.nextRunAt;'], OE: ['defaultMessage: "now", id: "kaaf1Ejpee"', 'return We(e, { seconds: n }, DE);'] } },
  // shared-25 hi: an external source that subscribes upstream while it has listeners (the clocks below); MU: keep the
  // previous value while `t(previous, next)` says it is the same (the card rows' stable list).
  { target: 'external-source.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { hi: 'externalSource' },
    features: { hi: ['if (t.size === 0 && n !== void 0 && n !== gi) {', 'return { subscribe: (a) => {'] } },
  { target: 'stable-value.mjs', source: 'shared-25-DP8p7i1Z.js', exports: { MU: 'useStableValue' },
    features: { MU: ['comparedWith: e, stable: e', 'return (i !== n && r(i), i.stable);'] } },
  // shared-156 OB: now, floored to the minute and ticking on the minute while enabled (0 when not); zP: the deferred
  // value while a flag holds.
  { target: 'minute-clock.mjs', source: 'shared-156-Bikz018e.js', exports: { OB: 'useMinuteNow', zP: 'useDeferredWhileSame' },
    features: { OB: ['return DB(pB, e);'], zP: ['return Object.is(n, t) ? r : e;'] } },
  // cd4f82e77 O: now, floored to the second and ticking every second (the rows' elapsed / Next countdown).
  { target: 'second-clock.mjs', source: 'cd4f82e77-BZMvPH7p.js', exports: { O: 'useSecondNow' }, features: { O: ['return re(u(Ae, D, D));'] } },
  // shared-20 uE / pE: a polite live region and the hook that announces into it ("Stopping server…", "Task stopped" …).
  { target: 'announcement.mjs', source: 'shared-20-B7UqYfsi.js', exports: { uE: 'useAnnouncement', pE: 'Announcement' },
    features: { uE: ['t((t) => ({ nonce: t.nonce + 1, text: e }));'], pE: ['className: "sr-only",', 'role: "status",', 'e.nonce % 2 == 1 ? "\\u200B" : ""'] } },
  // vendor-query E: react-query's replaceEqualDeep (QD / BD keep their row lists while equal).
  { target: 'replace-equal-deep.mjs', source: 'vendor-query-Dqcf4jOo.js', exports: { E: 'replaceEqualDeep' },
    features: { E: ['if (n > 500) return t;', 'return i === o && c === i ? e : s;'] } },
  // c155b6b71 v: a preview's tabs from claude.web Launch (getPreviewTabs / onPreviewTabsChanged); without Launch, none.
  { target: 'preview-tabs.mjs', source: 'c155b6b71-CwKMsMtR.js', exports: { v: 'usePreviewTabs' },
    features: { v: ['let c = o?.getPreviewTabs;', 'S = !!s && !!o?.reorderPreviewTab,'] } },
  // c227f4d5e: the origin folder of a worktree path (zR), a server under the session's folder (oz, not in a nested
  // worktree, not a page preview, this session's or the folder's), a remote server that is up (gz) and the remote
  // preview nonce (Pz).
  { target: 'server-scope.mjs', source: 'c227f4d5e-Ba-r--Rl.js', exports: { zR: 'originFolder', oz: 'serverInSession', gz: 'remoteServerLive', Pz: 'nextPreviewNonce' },
    features: { zR: ['worktrees[\\\\/][^\\\\/]+$/, "");'], oz: ['az(e, t) && !br(e.serverId) && (e.sessionId === void 0 || e.sessionId === n)'],
      gz: ['(e.state === "starting" || e.state === "running")'], Pz: ['return Nz++;'] } },

  // ---- cf74bc599: the two sections ----
  { target: 'servers-card.mjs', source: 'cf74bc599-D9NZWRyl.js',
    exports: { QD: 'SessionRailServers', XD: 'RailServersCard', YD: 'RailServerRow', HD: 'useSessionDevServers', KD: 'railServerState',
      JD: 'railServerName', qD: 'railServerAddress', GD: 'railServerKey', UD: 'RAIL_SERVERS_LIMIT', WD: 'SERVER_META_FIELDS' },
    features: {
      QD: ['{ data: r } = Td(e, WD),', 'p = B("sink_planter_vase") && e.type === "remote" ? e : null,', '_ = dp((e) => e.hasSidePanes) && g !== null,',
        '.toSorted((e, t) => Date.parse(e.startedAt) - Date.parse(t.startedAt))', 'openable: v && e.status === _e.Running && e.port > 0,',
        ': n.requestServerLogs(t.server.serverId, t.server.serverId),', 'n.setSidePane("preview"));', 'defaultMessage: "Stopping server\\u2026",'],
      XD: ['id: "servers",', 'defaultMessage: "Servers", id: "QOxktDjUiT"', 'defaultMessage: "{count} running",', 'limit: UD,'],
      YD: ['u(Sl, { name: "Cache" }),', 'defaultMessage: "Failed to start",', 'defaultMessage: "Starting\\u2026", id: "RFCwI6lJ1a"',
        'defaultMessage: "Open {name} in Preview",', 'defaultMessage: "Open {name} in Browser",', 'defaultMessage: "Stop this server",', 'icon: "Stop",'],
      HD: ['(n) => ru(n, t, e) && !Et(n.externalUrl) && n.status !== "stopped",'], KD: ['case _e.Error:', 'return "failed";'],
      JD: ['return e.server.name ?? qD(e) ?? e.server.serverId;'], qD: ['return e.server.port > 0 ? `localhost:${e.server.port}` : void 0;'],
      GD: ['return `${e.kind}:${e.server.serverId}`;'], UD: ['UD = 4'], WD: ['WD = kn("workingDir", "originCwd")'],
    } },
  { target: 'background-tasks-card.mjs', source: 'cf74bc599-D9NZWRyl.js',
    exports: { BD: 'SessionRailBackgroundTasks', LD: 'RailBackgroundTasksCard', ID: 'RailBackgroundTaskRow', RD: 'railTaskTitle', MD: 'railTaskIcon',
      FD: 'railStopLabel', jD: 'railTaskKey', OD: 'RAIL_TASKS_LIMIT', AD: 'TASK_META_FIELDS' },
    features: {
      BD: ['r = $m(),', '{ data: a } = Td(e, AD),', 's = a ? (a.loops ?? kD) : void 0,', 'g = ju("session_rail"),', 'defaultMessage: "Stop requested\\u2026",',
        'defaultMessage: "Task stopped",', 'defaultMessage: "Loop stopped",', 'defaultMessage: "Scheduled prompt stopped",', '.filter((e) => e.status === "running" && !Qm(e))',
        'title: e.prompt ?? (e.recurring === !1 ? w : T),', 'title: e.name ?? RD(e),'],
      LD: ['id: "backgroundTasks",', 'defaultMessage: "Background tasks", id: "PO+0DdDIId"', 'defaultMessage: "{count} finished",', 'u(Sl, { name: "AgentsSimple" }),'],
      ID: ['defaultMessage: "Open {name} in Background tasks",', 'defaultMessage: "Stopping\\u2026", id: "NACfNicI6z"', 'hint: g === void 0 ? void 0 : _,'],
      RD: ['let t = Ec(e.description, e.taskType);', 'return t ? tc(t) : e.description;'], MD: ['return "Clock";', 'e.taskType === "local_bash" ? "CommandLine" : "AgentsSimple"'],
      FD: ['defaultMessage: "Stop this task", id: "+ZLTl3VMv+"', 'defaultMessage: "Stop this loop. Claude will cancel it.",'],
      jD: ['return `loop:${e.loop.id}`;'], OD: ['OD = 4'], AD: ['AD = kn("loops", "tags", "isArchived", "createdAt")'],
    } },
];

// Original text the rail's mount follows (SR-7) but cannot import: fO hands the sections to the rail view.
const rawCallSites = [
  { source: 'cf74bc599-D9NZWRyl.js', role: 'fO gives the rail its Servers and Background tasks sections (host: SR-7)',
    features: ['serversSection:u(QD,{sessionRef:e,readOnly:o}),backgroundSection:u(BD,{sessionRef:e,readOnly:o})'] },
];
// Sections not emitted yet, with the measure that keeps them out (research §10). None since R4i-rail RL3 (the Context
// section is extract-session-rail-context.mjs's).
const deferred = [];

const cache = new Map();
async function readSource(name) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map(), writers: null };
  cache.set(name, record);
  return record;
}
// Top-level statements that assign to a top-level binding (`X.displayName = …`, an enum body): a sliced binding must
// have none, or its slice would miss what they set.
function topLevelWriters(src) {
  if (src.writers) return src.writers;
  src.writers = new Map();
  for (const node of src.ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue;
    const parsed = babel.babelParse(src.code.slice(node.start, node.end), `${src.name}@${node.start}`, true);
    babel.traverse(parsed, {
      AssignmentExpression(p) {
        const left = p.node.left;
        const id = left.type === 'Identifier' ? left : left.type === 'MemberExpression' && left.object.type === 'Identifier' ? left.object : null;
        if (id && !p.scope.hasBinding(id.name) && src.top.has(id.name)) src.writers.set(id.name, node.start);
      },
    });
  }
  return src.writers;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
// The raw text of a binding's same-chunk closure (imports excluded), and its size.
function closure(src, name) {
  const seen = new Set(), parts = [], imports = new Set();
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const entry = src.top.get(n);
    if (!entry) return;
    if (entry.kind === 'import') { imports.add(`${entry.file}:${entry.alias}`); return; }
    parts.push(declarationText(src, entry));
    for (const dep of declarationDeps(src, n)) visit(dep);
  };
  visit(name);
  return { text: parts.join('\n'), locals: parts.length, imports };
}
const closureText = (src, name) => closure(src, name).text;
const normalised = text => text.replace(/\s+/g, ' ');
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

// ---- other generated areas ------------------------------------------------------------------------------------------
const jsonCache = new Map();
async function readJson(file) {
  if (!jsonCache.has(file)) jsonCache.set(file, JSON.parse(await fs.readFile(file, 'utf8')));
  return jsonCache.get(file);
}
function exportedNames(text) {
  const out = new Map();
  for (const block of text.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of block[1].split(',').map(s => s.trim()).filter(Boolean)) {
      const [local, as] = part.split(/\s+as\s+/);
      out.set(local, [...(out.get(local) ?? []), as ?? local]);
    }
  return out;
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await readJson(path.join(generatedRoot, 'view-tabs/manifest.json'));
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const viewTabsByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) viewTabsByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames)) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // file#local -> [{ area, target }] for every 2.42304.0 binding the importable areas slice (code-current mixes versions;
  // only its modules sliced from this snapshot count).
  const sliced = new Map();
  for (const area of importableAreas) {
    const manifest = await readJson(path.join(generatedRoot, area, 'manifest.json'));
    for (const m of manifest.modules) {
      const version = m.referenceVersion ?? manifest.referenceVersion;
      if (version !== referenceVersion) continue;
      if (m.source.includes('/') && !m.source.includes(`/${referenceSnapshot}/`)) continue;
      const file = path.basename(m.source);
      for (const b of m.bindings ?? []) {
        const key = `${file}#${typeof b === 'string' ? b : b.name}`;
        if (!sliced.has(key)) sliced.set(key, []);
        sliced.get(key).push({ area, target: m.target });
      }
    }
  }
  areas = { viewTabsByLocal, kitByLocal, sliced };
  return areas;
}
const exportCache = new Map();
async function areaExports(area, target) {
  const key = `${area}/${target}`;
  if (!exportCache.has(key)) exportCache.set(key, exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return exportCache.get(key);
}

// vendor-frame `var X = ns.member` with ns a proved React namespace.
const provedNamespaces = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const entry = src.top.get(local);
  if (entry?.kind !== 'var') return null;
  const init = entry.node.init;
  if (init?.type !== 'MemberExpression' || init.computed || init.object.type !== 'Identifier' || init.property.type !== 'Identifier') return null;
  const ns = reactNamespaces[init.object.name];
  if (!ns) return null;
  if (!provedNamespaces.has(init.object.name)) {
    assertFeatures(`React namespace ${init.object.name}`, closureText(src, init.object.name), ns.features);
    provedNamespaces.add(init.object.name);
  }
  const react = await import(ns.module === 'react/jsx-runtime' ? 'react/jsx-runtime' : ns.module);
  if (!(init.property.name in react)) throw Error(`${ns.module} has no ${init.property.name} (vendor-frame ${local})`);
  return { from: ns.module, name: init.property.name };
}
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailSections({ check = false, explore = null } = {}) {
  const { viewTabsByLocal, kitByLocal, sliced } = await loadAreas();
  const emitted = [];
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail-sections.mjs',
    adapterModule: 'src/source-session-rail-sections-adapters.jsx', modules: [], publicNames: {}, callSites: [], deferred: [],
  };
  const files = {};
  const owner = (file, local) => emitted.find(m => m.spec.source === file && Object.hasOwn(m.spec.exports, local));
  // Resolves the original binding file:local to an import, or null when it is to be sliced (same chunk only).
  const resolveBinding = async (spec, file, local, via) => {
    const self = path.join(output, spec.target);
    const adapter = adapters[`${file}:${local}`];
    if (adapter) {
      const dep = await readSource(file);
      const original = dep.top.get(local);
      if (!original || original.kind === 'import') throw Error(`${spec.target}: adapter ${via} (${local}) is not a declaration of ${file}`);
      assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      return { from: adapter.module ?? adapterModule, name: adapter.name, via, kind: 'adapter', original: `${file}:${local}` };
    }
    const mine = owner(file, local);
    if (mine) return { from: `./${mine.spec.target}`, name: mine.spec.exports[local], via, kind: 'generated', original: `${file}:${local}` };
    const kit = kitByLocal.get(`${file}#${local}`);
    if (kit) return { from: rel(self, path.join(generatedRoot, 'session-rail-kit', kit.target)), name: kit.name, via, kind: 'session-rail-kit', original: `${file}:${local}` };
    const pub = viewTabsByLocal.get(`${file}#${local}`);
    if (pub) return { from: rel(self, path.join(generatedRoot, 'view-tabs', pub.file)), name: pub.name, via, kind: 'view-tabs', original: `${file}:${local}` };
    const react = await reactMember(file, local);
    if (react) return { ...react, via, kind: 'react' };
    const elsewhere = sliced.get(`${file}#${local}`);
    if (elsewhere) {
      for (const { area, target } of elsewhere) {
        const names = (await areaExports(area, target)).get(local);
        if (names?.length) return { from: rel(self, path.join(generatedRoot, area, target)), name: names[0], via, kind: area, original: `${file}:${local}` };
      }
      if (!duplicates[`${file}:${local}`]) {
        const message = `${spec.target}: ${via} (${local}) is sliced by ${elsewhere.map(e => `${e.area}/${e.target}`).join(', ')} but not exported; it must not be sliced twice`;
        if (!explore) throw Error(message);
        explore.push({ target: spec.target, via: 'DUPLICATE', local: `${file}:${local}`, size: message });
      }
    }
    return null;
  };
  for (const spec of modules) {
    const src = await readSource(spec.source);
    const writers = topLevelWriters(src);
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const entry = src.top.get(name);
      if (!entry) throw Error(`${spec.target}: unbound ${name}`);
      if (entry.kind === 'import') {
        const dep = await readSource(entry.file);
        const local = dep.exported.get(entry.alias);
        const via = `${entry.file}:${entry.alias}`;
        if (!local) throw Error(`${spec.target}: ${via} is not exported`);
        const resolved = await resolveBinding(spec, entry.file, local, via);
        if (resolved) { imports.set(name, resolved); return; }
        if (explore) {
          explore.push({ target: spec.target, via, local, size: closureText(dep, local).length });
          imports.set(name, { from: '__unresolved__', name: local, via, kind: 'unresolved' });
          return;
        }
        throw Error(`${spec.target}: unresolved import ${via} (${local})`);
      }
      const isRoot = Object.hasOwn(spec.exports, name);
      if (!isRoot) {
        const resolved = await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`);
        if (resolved) { imports.set(name, resolved); return; }
      } else if (adapters[`${spec.source}:${name}`] || kitByLocal.has(`${spec.source}#${name}`) || viewTabsByLocal.has(`${spec.source}#${name}`))
        throw Error(`${spec.target}: root ${name} is provided elsewhere`);
      if (entry.kind !== 'function' && entry.kind !== 'var') throw Error(`${spec.target}: unsupported declaration ${name} (${entry.kind})`);
      if (writers.has(name)) throw Error(`${spec.target}: ${spec.source}:${name} is also written by the top-level statement at ${writers.get(name)}`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) throw Error(`${spec.target}: dynamic import inside ${name}`);
      selected.set(name, entry);
      for (const dep of declarationDeps(src, name)) await add(dep);
      // No context is sliced here: the rail's contexts are the kit's (one instance each).
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
        const callee = imports.get(init.callee.name);
        if (callee?.kind === 'react' && callee.name === 'createContext') {
          const message = `${spec.target}: ${spec.source}:${name} is a context; a section must read the kit's instance, not slice one`;
          if (!explore) throw Error(message);
          explore.push({ target: spec.target, via: 'CONTEXT', local: name, size: message });
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'FEATURE', local: name, size: error.message });
      }
      await add(name);
    }
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, entry]) => emittedText(src, entry));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail-sections.mjs.\n// Edit the extractor or src/source-session-rail-sections-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    if (!explore) {
      // The module must be closed: every identifier it reads is imported or declared in it.
      const closed = babel.babelParse(text, spec.target, true);
      let globals;
      babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
      const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
        'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'URL', 'BigInt', 'Boolean', 'window', 'document']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ spec });
    for (const [local, name] of Object.entries(spec.exports)) {
      if (manifest.publicNames[name]) throw Error(`public name ${name} is used twice`);
      manifest.publicNames[name] = { file: spec.source, local, target: spec.target };
    }
  }
  if (explore) return manifest;
  for (const site of rawCallSites) {
    const bytes = await fs.readFile(path.join(source, site.source));
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = text.split(feature).length - 1;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  for (const item of deferred) {
    const src = await readSource(item.source);
    if (src.exported.get(item.export) !== item.binding) throw Error(`deferred ${item.id}: ${item.source} exports ${item.export} as ${src.exported.get(item.export)}, not ${item.binding}`);
    for (const [binding, features] of Object.entries(item.features)) assertFeatures(`deferred ${item.id}: ${binding}`, await featureText(src, src.top.get(binding)), features);
    const panelSrc = await readSource(item.panel.source);
    const panelLocal = panelSrc.exported.get(item.panel.export);
    const measured = closure(panelSrc, panelLocal);
    const chunks = new Set([...measured.imports].map(i => i.split(':')[0]));
    // The deferral holds while the panel stays this large; a much smaller panel would be emitted instead.
    if (measured.locals < item.panel.minLocals || measured.imports.size < item.panel.minImports)
      throw Error(`deferred ${item.id}: ${item.panel.source}:${panelLocal} is down to ${measured.locals} declarations / ${measured.imports.size} imports; emit the section`);
    manifest.deferred.push({ id: item.id, source: item.source, binding: item.binding, export: item.export, role: item.role, sourceSha256: sha(src.bytes),
      features: item.features, panel: { source: item.panel.source, binding: panelLocal, export: item.panel.export, declarations: measured.locals,
        bytes: measured.text.length, imports: measured.imports.size, chunks: chunks.size } });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Session rail sections output set changed: ${present.join(',')}. Run scripts/extract-session-rail-sections.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Session rail sections source mismatch: ${name}. Run scripts/extract-session-rail-sections.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail section modules (${count} original ${referenceVersion} bindings, ${manifest.callSites.length} pinned call sites, ${manifest.deferred.length} deferred section).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--explore')) {
    const found = [];
    const manifest = await extractSessionRailSections({ explore: found });
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailSections({ check: process.argv.includes('--check') });
}
