// R4f-rail SR-3: extract the Code session rail's Servers and Background tasks sections, without executing any desktop
// runtime (decision D0: own generator, own output folder src/generated/session-rail-sections, own
// scripts/verify-gen-session-rail-sections.mjs). Spec: analysis/code-ui-migrate-20261017/research/r4-session-rail.md §1.2,
// §1.3, §3 #21 / #22, §8 SR-3, §10.
// w4-rail-sections (2026-10-26): the originals are Claude Desktop 3.6556.2 (analysis/claude-3.6556.2-migrate-20261025,
// research/panes.md §1.5 / §2.1 C1-12, §3.2; plan R1–R15, E3/E5/E13/E34). Target files and export names are those of
// 2.42304.0 (R4/E7); where 3.6556.2 moved an original to another chunk, the old target re-exports it from a new target
// (task-groups.mjs groupTasks <- task-grouping.mjs, minute-clock.mjs useDeferredWhileSame <- deferred-while-same.mjs).
//
//   servers-card.mjs           cf74bc599 $M: the Servers section (TN hands it to the rail as `serversSection: Fn` with
//                              `Fn = s($M, { sessionRef, readOnly })`). The session's local dev servers (HM: the active
//                              servers under the session's working folder, not stopped, not a hosted page) sorted by start,
//                              each openable in the Preview pane, with Stop; the remote servers of a remote session
//                              (`ve("sink_planter_vase")`) are a GrowthBook branch that is off here, so that list is always
//                              empty. ZM (stop, the row the Preview pane shows), XM (the card: "Servers", "{count} running",
//                              four rows then Show more), YM (a row: name, localhost:port, "Stopping…" while it stops,
//                              "Starting…" / "Failed to start", Open {name} in Preview, Stop this server).
//   background-tasks-card.mjs  cf74bc599 IM: the Background tasks section (`backgroundSection: In`). Running tasks (not
//                              ambient) and the session's loops / scheduled prompts that have not expired, "{count}
//                              finished" (the not-dismissed tasks that are no longer live), Stop with "Stop requested…" /
//                              "Task stopped" / "Loop stopped" announcements. FM (stop / open in the Tasks pane), NM (the
//                              card), MM (a row; a task being stopped says "Stopping…"), AM / kM (Next {countdown} /
//                              elapsed), OM (icon), jM (Stop label), DM (row key).
//   …                          and the pure originals those read: c96d752d0 G$e (task groups) / xU / SU, cccc2cf0a Jj / oM /
//                              cM (dismissed match, a loop's next run, the countdown), cea7057eb w / E (loop expiry, ambient
//                              task), c3e20fa3f k, c9c0413df i / c, shared-28 qN, shared-78 IL / LL / TL, shared-52 to / no /
//                              ro / co / ho, shared-0 Ax / La, shared-2 b_, shared-19 CP / qO, shared-182 zG, shared-25 ei /
//                              IH, shared-156 fK with shared-130 oL (the minute clock), cd4f82e77 ke (the second clock),
//                              shared-20 _E / bE (the live-region announcement), vendor-query E, c155b6b71 g (a preview's
//                              tabs) and c227f4d5e MH / cU / vU / IU.
//
// The Context section (c73f45bc3 Lx, `contextSection: l ? void 0 : s(L_, …)`) is extract-session-rail-context.mjs's
// (src/generated/session-rail-context); `deferred` stays empty.
//
// Every emitted binding is an original top-level declaration sliced from the 3.6556.2 chunk. A module's bindings are the
// reachable closure of its roots (Babel's scope analysis names what each declaration reads from outside). An import or
// same-chunk binding resolves, in this order, to: a host adapter (src/source-session-rail-sections-adapters.jsx, or the
// kit's adapter module for react-intl), feature-checked against the original it replaces; an earlier module of this area;
// a public name of the session rail kit (RailCard, the row primitives, the focus rescue …); a semantic public name of
// view-tabs (D1/D24; the React Compiler helpers by their E3 names); React (a vendor-frame export alias of
// official.reactAliases); or the export of another generated area that already slices the same 3.6556.2 binding
// (code-current, files-changes, sidebar-resize). A binding one of those areas slices without exporting is refused unless
// `duplicates` says why a second copy is harmless, and no createContext may be sliced here at all (the rail's contexts
// are the kit's). A root view-tabs publishes is re-exported (R4).
//
// The host data plane — the session meta query, the active servers store (claude.web Launch), the session tasks
// context, the session scope store (side panes, stopping ids), the stop mutations and the Tasks pane opener — is replaced
// by adapters that read SessionRailSectionsHostContext (the rail's mount provides it, SR-7) and the host's own task rows /
// dismissed task stores.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { sidebarResizeManifestFor, sidebarResizeExportsFor } from './sidebar-resize-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
// w4-rail-sections: 3.6556.2 (R1/E6). The constants come from official-3.6556.2.mjs.
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/session-rail-sections');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-sections-adapters.jsx';
const kitAdapterModule = '../../source-session-rail-kit-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const VENDOR_FRAME = official.vendorFrame;

// Host dependencies, keyed by the original binding (file:local) an import resolves to. `features` must appear in that
// binding's prettier form (`closure: true`: in the raw text of its same-chunk closure). `module` overrides the adapter
// module (the kit's react-intl adapters are shared, not repeated). Export names are those of 2.42304.0.
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the kit's adapters: useStartIntl / StartMessage).
  'vendor-intl-DYfox5Co.js:q': { name: 'useIntl', module: kitAdapterModule, features: ['return (Mt(e), e);'] },
  'vendor-intl-DYfox5Co.js:Gt': { name: 'FormattedMessage', module: kitAdapterModule, features: ['var Gt = c(Wt, Ut);'] },
  // c5da7eb42 QI (exported et): the session meta query with a `select` ($M reads workingDir / originCwd, IM loops / tags /
  // isArchived / createdAt). Host: the meta the rail's mount puts in SessionRailSectionsHostContext.
  'c5da7eb42-XijZdwf1.js:QI': { name: 'useSessionRailMeta', features: ['{ select: t, passive: r, enabled: i }', 'n?.passive ?? !1,', 'n?.enabled ?? !0;'] },
  // c5da7eb42 jL (exported H): whether a remote session's bridge is up ($M asks only for a remote session under
  // sink_planter_vase). No remote sessions here: false.
  'c5da7eb42-XijZdwf1.js:jL': { name: 'useRemoteSessionBridgeUp', features: ['passive: !0 })', 'return t ?? !1;'] },
  // c227f4d5e PU (exported ba): a remote session's servers (`e === null` gives the shared empty list). Always empty here.
  'c227f4d5e-B-FYKrwT.js:PU': { name: 'useRemoteSessionServers', features: ['if (e === null) {', 'r.length === 0 ?'] },
  // c227f4d5e LH (exported Ia): the per-folder preferred preview server (localStorage "preferredPreviewServers"), written
  // when a row opens its server. Host: the mount's rememberPreviewServer, when it has one.
  'c227f4d5e-B-FYKrwT.js:LH': { name: 'usePreferredPreviewServers', closure: true, features: ['AH="preferredPreviewServers"', 'jH={}', '{...t,[e]:n}'] },
  // c227f4d5e mQ (exported Kn): the Tasks pane opener (finished: expand the finished section; a taskId: open at that task;
  // an agent: push its subagent view; else the pane), null without side panes. Host: the mount's openTasksPane.
  'c227f4d5e-B-FYKrwT.js:mQ': { name: 'useOpenTasksPane', features: ['openTasksPaneAtTask: r,', 'expandFinishedSection: a,', '{ kind: "subagent", ...l }', 'return s ? l : null;'] },
  // cccc2cf0a Qj (exported f): the session's stopping ids of one kind ("server" / "loop" / "task") in the scope store
  // (isStopping / markStopping / releaseStopping). Host: taskRowsStore, the same per-session store the Background tasks
  // pane keeps its pending stops in.
  'cccc2cf0a-DhZC33Gc.js:Qj': { name: 'useRailStoppingIds', features: ['{ isStopping: a, markStopping: o, releaseStopping: s }', '{ ids: i, has: c, mark: l, release: u }'] },
  // cccc2cf0a Zj (exported m): the session's dismissed task ids (localStorage "epitaxy.dismissedTasksMap"). Host:
  // dismissedTasksStore, the Tasks pane's own store of the same thing.
  'cccc2cf0a-DhZC33Gc.js:Zj': { name: 'useDismissedTaskIds', closure: true, features: ['Fj="epitaxy.dismissedTasksMap"'] },
  // cccc2cf0a eM (exported u): stop a dev server through `claude.web Launch.stopServer` ("Couldn’t stop the preview
  // server." on failure). Host: the mount's stopServer.
  'cccc2cf0a-DhZC33Gc.js:eM': { name: 'useServerStop', features: ['?.stopServer?.(i);', 'defaultMessage: "Couldn\\u2019t stop the preview server.",', '{ stoppingServerIds: i, handleStopServer: c }'] },
  // cccc2cf0a $j (exported d): stop a loop by sending Claude "Cancel the recurring loop … by calling CronDelete". Host: the
  // mount's stopLoop (this host's scheduler stops its own jobs).
  'cccc2cf0a-DhZC33Gc.js:$j': { name: 'useLoopStop', features: ['("tasks_stop_loop")', 'by calling CronDelete, then confirm.', '{ stoppingLoopIds: r, handleStopLoop: s }'] },
  // cccc2cf0a rM (exported c): stop a background task (the stopBackgroundTask mutation), with the "Stop review?"
  // confirmation for ultrareview runs. Host: the mount's stopTask; no review runs here, so no dialog.
  'cccc2cf0a-DhZC33Gc.js:rM': { name: 'useTaskStop', features: ['{ sessionRef: t, tasks: n, allTasks: r, meta: i, surface: a }', '"ultrareview"', 'confirmDialog: B,'] },
  // shared-25 fs (exported Yh): a GrowthBook feature's `.on`. No GrowthBook here (D29 / D31): off.
  'shared-25-DOWZRSlq.js:fs': { name: 'useGrowthBookFeature', features: [').on;'] },
  // shared-78 tE (exported My): whether a preview opens in the browser instead of the Preview pane (local sessions:
  // claude.web Launch with frontend_preview_external_domains). No claude.web Launch / GrowthBook here: false.
  'shared-78-D5Fw2h0a.js:tE': { name: 'usePreviewOpensInBrowser', features: ['return e === "remote" ? n && r : t;'] },
  // shared-1 nd (exported mh): the active dev servers from `globalThis["claude.web"].Launch.activeServersStore`. Host: the
  // mount's servers (the session's preview servers, in the official row shape).
  'shared-1-BJhqMmkf.js:nd': { name: 'useActiveServers', features: ['?.activeServersStore;', 't({ state: "ready", result: e });', 'state: "error",'] },
  // shared-0 dC (exported ah): the claude.web Launch bridge. This host has none (its preview is its own pane).
  'shared-0-DDOOdL6P.js:dC': { name: 'claudeWebLaunch', features: ['var dC = globalThis["claude.web"]?.Launch;'] },
  // c03935b01 fu / Q / Su / lc (exported vt / _t / ft / F): the session scope store's context, a selector over it, whether
  // this window hosts native previews and whether a side pane is open. Host: the mount's sidePanes.
  'c03935b01-yhcY34vt.js:fu': { name: 'useRailScopeStoreApi', features: ['return f(Z);'] },
  'c03935b01-yhcY34vt.js:Q': { name: 'useRailScopeState', features: ['let t = f(Z);', 'return Ye(t ?? su, e);'] },
  'c03935b01-yhcY34vt.js:Su': { name: 'useRailPreviewViews', closure: true, features: ['function Su(){return Q(Cu)}', 'function Cu(e){return Fo(e.host)}'] },
  'c03935b01-yhcY34vt.js:lc': { name: 'railSidePaneOpen', features: ['if (e.currentSessionId === t) return w(e.tileLayout).has(n);', 'e.tileLayoutBySession[t]'] },
  // c155b6b71 u (exported c): the session's own preview id, only with claude.web Launch tabs. undefined here: a row opens
  // its server by id.
  'c155b6b71-66pw54FW.js:u': { name: 'useSessionPreviewId', features: ['if (!(e?.id === void 0 || !t))'] },
  // c68c4283d sd / mf (exported tf / Id): side pane and rail stop telemetry. Nothing is sent (D17).
  'c68c4283d-CWbOoVxS.js:sd': { name: 'logSidePaneOpened', features: ['presentation: ue(e, r) ? "overlay" : "split",'] },
  'c68c4283d-CWbOoVxS.js:mf': { name: 'logRailStopPressed', features: ['d("claudeai.epitaxy.session_rail.background_stop_pressed", e);'] },
  // cea7057eb _e (exported g): the session's background tasks (a context, [] by default). Host: the mount's tasks.
  'cea7057eb-De2BQu3K.js:_e': { name: 'useSessionTasks', closure: true, features: ['function _e(){return n(X)}', 'X=t(D)', 'D=[]'] },
};

// Original bindings another importable area slices without exporting that this area may slice again. Pure functions
// and plain data only; nothing that holds state.
const duplicates = {
  // vendor-query E (react-query's replaceEqualDeep) with its helpers: files-changes slices them inside its query module
  // without exporting them.
  'vendor-query-DVJ0goAF.js:te': 'pure function (no state)', 'vendor-query-DVJ0goAF.js:O': 'pure function (no state)',
  'vendor-query-DVJ0goAF.js:ne': 'pure function (no state)', 'vendor-query-DVJ0goAF.js:ee': 'Object.prototype.hasOwnProperty (no state)',
  // shared-25 ri: the empty function an external source's idle cleanup is (files-changes' subscribe-never.mjs slices it
  // behind its subscribeNever export).
  'shared-25-DOWZRSlq.js:ri': 'empty function (no state)',
};
// Generated areas whose 3.6556.2 exports this generator imports (one copy of a binding they already slice).
const importableAreas = ['code-current', 'sidebar-resize', 'files-changes'];

// Emitted in dependency order. `exports` maps original local binding -> exported name; its keys are the roots and
// `features` pins each root to strings of its original (prettier-formatted) text, `closureFeatures` to its raw
// same-chunk closure. `reexports` keeps a 2.42304.0 export name whose original moved to another target (R4).
const modules = [
  // ---- shared-52 / shared-0 / shared-2 / shared-78 / shared-28: URL kinds (hosted pages, artifact links) ----
  // shared-52: the claude.ai app / preview hosts (to / no, and ro the preview host aliases), the artifact page path's
  // uuid (co) and the design project path (ho).
  { target: 'claude-hosts.mjs', source: 'shared-52-uHFNjl7C.js',
    exports: { to: 'CLAUDE_APP_HOSTS', no: 'CLAUDE_PREVIEW_HOSTS', ro: 'CLAUDE_PREVIEW_HOST_ALIASES', co: 'artifactPathUuid', ho: 'DESIGN_PROJECT_PATH' },
    features: { to: ['Object.values('], no: ['Object.keys('], ro: ['new Map(Object.entries('], co: ['.exec(e)?.[1];', '?.uuid;'], ho: ['/^\\/design\\/p\\/'] },
    closureFeatures: { to: ['"preview.claude.ai":"claude.ai"', '"preview.claude.com":"claude.com"'] } },
  // shared-0 La: a URL from text that starts with a scheme (null otherwise).
  { target: 'absolute-url.mjs', source: 'shared-0-DDOOdL6P.js', exports: { La: 'parseAbsoluteUrl' },
    features: { La: ['return new URL(e);', 'return null;'] } },
  // shared-0 Ax: the dev server status enum (starting / running / error / stopped).
  { target: 'dev-server-status.mjs', source: 'shared-0-DDOOdL6P.js', exports: { Ax: 'DevServerStatus' },
    features: { Ax: ['(e.Starting = "starting"),', '(e.Running = "running"),', '(e.Error = "error"),', '(e.Stopped = "stopped"),'] } },
  // shared-2 b_: a URL hash kept only when it is a plain fragment id.
  { target: 'url-anchor.mjs', source: 'shared-2-TF8v67kg.js', exports: { b_: 'plainAnchor' }, features: { b_: ['? e : void 0;'] },
    closureFeatures: { b_: ['/^#[A-Za-z0-9._:~-]{1,128}$/'] } },
  // shared-78: IL (an https claude.ai page URL: an artifact or design page — a server whose externalUrl is one is not
  // listed), LL (an artifact page URL) and TL (a preview id of an HTML / browser / design preview, not a dev server).
  { target: 'hosted-page-url.mjs', source: 'shared-78-D5Fw2h0a.js', exports: { IL: 'isHostedPageUrl', LL: 'isArtifactPageUrl', TL: 'isPagePreviewId' },
    features: { IL: ['t.protocol === "https:" &&', '!t.username &&', '!t.password &&', '.size > 500'], LL: ['URL.parse(e)?.pathname ?? ""'] },
    closureFeatures: { TL: ['startsWith("html-preview-")', 'startsWith("design-preview-")'] } },
  // shared-28 qN: an artifact link as the pane opens it ({ url, label, anchor }).
  { target: 'artifact-link.mjs', source: 'shared-28-DNYlf4wu.js', exports: { qN: 'artifactPaneLink' },
    features: { qN: ['label: t.slice(t.lastIndexOf("/") + 1),', '{ anchor: n }'] } },
  // c9c0413df i / c (moved from the gone cd902d735): bare http(s) URLs in text and the punctuation that trails one.
  { target: 'text-urls.mjs', source: 'c9c0413df-IGmtINHW.js', exports: { i: 'TEXT_URL_PATTERN', c: 'splitUrlTrail' },
    features: { i: ['/https?:\\/\\/[^\\s<>]+/g'], c: ['endsWith(")")', 'return [t, e.slice(t.length)];'] } },
  // c3e20fa3f k (moved from the gone c2fd10b8d): text split around its artifact links.
  { target: 'artifact-link-parts.mjs', source: 'c3e20fa3f-5lCatSBY.js', exports: { k: 'artifactLinkParts' },
    features: { k: ['if (!e.includes("://")) return;', 'paneUrl: a.url'] } },
  // c96d752d0 xU / SU: a task description's "artifact <link>" words (never for local_bash) and their plain text: the
  // Background tasks row title of a task without a name (cf74bc599 PM).
  { target: 'task-description.mjs', source: 'c96d752d0-CWv_7-n9.js', exports: { xU: 'taskDescriptionParts', SU: 'taskDescriptionText' },
    features: { xU: ['typeof e != "string"', 'word: t[1], href: e.href, paneUrl: e.paneUrl'], SU: ['(typeof e == "string" ? e : e.word)).join("")'] } },

  // ---- task grouping, loops and clocks ----
  // shared-19 CP (partition) and qO (Intl list of duration units, the countdown's formatter).
  { target: 'partition.mjs', source: 'shared-19-DIKJVT7c.js', exports: { CP: 'partition' }, features: { CP: ['.push(i);', 'return [n, r];'] } },
  { target: 'duration-units.mjs', source: 'shared-19-DIKJVT7c.js', exports: { qO: 'formatDurationUnits' },
    features: { qO: ['omitZeroUnits:', 'padTrailingUnits:', 'style: "unit",', 'minimumIntegerDigits: 2'] } },
  // shared-182 zG: group by key.
  { target: 'group-by.mjs', source: 'shared-182-BI1KJccu.js', exports: { zG: 'groupBy' }, features: { zG: ['Object.create(null)'] } },
  // cea7057eb w (a loop has expired: a one-shot past its run plus grace, else three days after it was created), E (an
  // ambient task: dream / auto mode scan / an artifact's live updates monitor, never a row) and Te (new in 3.6556.2: an
  // agent task's tool use id, the subagent view a Background tasks row opens).
  { target: 'task-kinds.mjs', source: 'cea7057eb-De2BQu3K.js', exports: { w: 'loopExpired', E: 'isAmbientTask', Te: 'taskAgentToolUseId' },
    features: { w: ['.graceMs', 'e.createdAt + n'], E: ['e.ambient === !0 ||', '"dream"', '"auto_mode_scan"'], Te: ['=== "agent" && e.toolUseId) || void 0'] },
    closureFeatures: { Te: ['case"local_agent":', 'return"agent"'] } },
  // c96d752d0 G$e (moved from cccc2cf0a cE): running / finished task groups (parent tasks with their children, finished
  // newest first). task-groups.mjs re-exports it under its 2.42304.0 name (R4).
  { target: 'task-grouping.mjs', source: 'c96d752d0-CWv_7-n9.js', exports: { G$e: 'groupTasks' },
    features: { G$e: ['(e) => e.live', 'return { running: n, finished:'] } },
  // cccc2cf0a Jj (a task the user dismissed), oM (a loop's next run, stepping a simple cron past now) and cM (the narrow
  // countdown).
  { target: 'task-groups.mjs', source: 'cccc2cf0a-DhZC33Gc.js', exports: { Jj: 'isDismissedTask', oM: 'loopNextRunAt', cM: 'formatCountdown' },
    reexports: { 'task-grouping.mjs': ['groupTasks'] },
    features: { Jj: ['return t.runId === void 0', '? e.has(t.taskId)', 't.endGuessed === !0'], oM: ['if (e.nextRunAt > t || e.recurring === !1) return e.nextRunAt;'],
      cM: ['defaultMessage: "now", id: "kaaf1Ejpee"', '{ minutes: r, seconds: t }', '{ days: a, hours: o }'] } },
  // shared-25 ei: an external source that subscribes upstream while it has listeners (the clocks below); IH: keep the
  // previous value while `t(previous, next)` says it is the same (the card rows' stable list).
  { target: 'external-source.mjs', source: 'shared-25-DOWZRSlq.js', exports: { ei: 'externalSource' },
    features: { ei: ['if (t.size === 0 && n !== void 0 && n !== ti) {', 'subscribe: (a) => {', 'notify: r,'] } },
  { target: 'stable-value.mjs', source: 'shared-25-DOWZRSlq.js', exports: { IH: 'useStableValue' },
    features: { IH: ['{ comparedWith: e, stable: e }', 'Object.is(r.comparedWith, e) || Object.is(r.stable, e)', 'return (o !== r && i(o), o.stable);'] } },
  // shared-130 oL (moved from shared-156 zP): the deferred value while a flag holds. minute-clock.mjs re-exports it under
  // its 2.42304.0 name (R4).
  { target: 'deferred-while-same.mjs', source: 'shared-130-dWztbTO1.js', exports: { oL: 'useDeferredWhileSame' },
    features: { oL: ['Object.is(n, t) ? r : e'] } },
  // shared-156 fK: now, floored to the minute and ticking on the minute while enabled (0 when not; enabled by default).
  { target: 'minute-clock.mjs', source: 'shared-156-BLTosN8U.js', exports: { fK: 'useMinuteNow' },
    reexports: { 'deferred-while-same.mjs': ['useDeferredWhileSame'] },
    features: { fK: ['e === void 0 || e'] }, closureFeatures: { fK: ['return e-e%6e4', '6e4-Date.now()%6e4'] } },
  // cd4f82e77 ke: now, floored to the second and ticking every second (the rows' elapsed / Next countdown).
  { target: 'second-clock.mjs', source: 'cd4f82e77-CAMIsQ30.js', exports: { ke: 'useSecondNow' },
    closureFeatures: { ke: ['return e-e%1e3', '1e3-r%1e3'] } },
  // shared-20 _E / bE: a polite live region and the hook that announces into it ("Stopping server…", "Task stopped" …).
  { target: 'announcement.mjs', source: 'shared-20-mUr7IqZY.js', exports: { _E: 'useAnnouncement', bE: 'Announcement' },
    features: { _E: ['{ nonce: 0, text: "" }', 'nonce: t.nonce + 1, text: e', '{ announcement: t, announce: r }'],
      bE: ['className: "sr-only",', 'role: "status",', 't.nonce % 2 == 1 ? "\\u200B" : ""'] } },
  // vendor-query E: react-query's replaceEqualDeep ($M / IM keep their row lists while equal).
  { target: 'replace-equal-deep.mjs', source: 'vendor-query-DVJ0goAF.js', exports: { E: 'replaceEqualDeep' },
    features: { E: ['if (n > 500) return t;', 'return i === o && c === i ? e : s;'] } },
  // c155b6b71 g: a preview's tabs from claude.web Launch (getPreviewTabs / onPreviewTabsChanged); without Launch, none.
  { target: 'preview-tabs.mjs', source: 'c155b6b71-66pw54FW.js', exports: { g: 'usePreviewTabs' },
    features: { g: ['?.getPreviewTabs;', '?.reorderPreviewTab'] } },
  // c227f4d5e: the origin folder of a worktree path (MH), a server under the session's folder (cU: not in a nested
  // worktree, not a page preview, this session's or the folder's), a remote server that is up (vU) and the remote preview
  // nonce (IU).
  { target: 'server-scope.mjs', source: 'c227f4d5e-B-FYKrwT.js', exports: { MH: 'originFolder', cU: 'serverInSession', vU: 'remoteServerLive', IU: 'nextPreviewNonce' },
    features: { MH: ['worktrees[\\\\/][^\\\\/]+$/, "");'], cU: ['(e.sessionId === void 0 && !r) || e.sessionId === n'],
      vU: ['(e.state === "starting" || e.state === "running")'], IU: ['++;'] } },
  // shared-8 HF (new in 3.6556.2): the Stop button's icon, "StopFilled" only under the fizzy-lake "icons" part (view-tabs
  // isFizzyLakePartEnabled; E12: never), else undefined ("Stop").
  { target: 'stop-icon.mjs', source: 'shared-8-Db1QN4mf.js', exports: { HF: 'railStopIcon' },
    features: { HF: ['("icons") ? "StopFilled" : void 0;'] } },

  // ---- cf74bc599: the two sections ----
  { target: 'servers-card.mjs', source: 'cf74bc599-CRYqipWN.js',
    exports: { $M: 'SessionRailServers', XM: 'RailServersCard', YM: 'RailServerRow', HM: 'useSessionDevServers', KM: 'railServerState',
      JM: 'railServerName', qM: 'railServerAddress', GM: 'railServerKey', UM: 'RAIL_SERVERS_LIMIT', WM: 'SERVER_META_FIELDS' },
    features: {
      $M: ['"sink_planter_vase"', 'kind: "local",', 'openable:', '?.focusOrOpenPreviewTab?.(', '`http://localhost:${e.server.port}`', '.setPendingRemotePreviewOpen({',
        'source: "gesture",', '"preview", "session_rail"', '.setSidePane("preview")', 'defaultMessage: "Stopping server\\u2026",', 'id: "YyAB/Ltrj7"', 'onStopPressed:'],
      XM: ['id: "servers",', 'defaultMessage: "Servers", id: "QOxktDjUiT"', 'defaultMessage: "{count} running",', 'id: "gjhcMbSA41"', '{ sectionWide: !0 }',
        '"flex flex-col outline-none"', 'renderItem:'],
      YM: ['{ name: "Cache" }', 'defaultMessage: "Stopping\\u2026", id: "NACfNicI6z"', 'defaultMessage: "Failed to start",', 'defaultMessage: "Starting\\u2026", id: "RFCwI6lJ1a"',
        'defaultMessage: "Open {name} in Preview",', 'defaultMessage: "Open {name} in Browser",', 'defaultMessage: "Stop this server",', '?? "Stop",', '"pe-xs"',
        '"flex min-w-0 items-center"', '"shrink-0 text-end text-footnote text-muted-as-secondary tabular-nums"', '"bg-fill-ghost-selected"', 'flush: "end",', '"inline-start"'],
      HM: ['.state !== "ready" || !t', '.externalUrl)', '.status !== "stopped"'], KM: ['e.kind === "remote"', 'return "failed";', '"running" : "starting"'],
      JM: ['return e.server.name ??', '?? e.server.serverId;'], qM: ['return e.server.port > 0 ? `localhost:${e.server.port}` : void 0;'],
      GM: ['return `${e.kind}:${e.server.serverId}`;'], UM: [' = 4;'], WM: ['("workingDir", "originCwd")'],
    },
    closureFeatures: { $M: ['section:"servers",kind:"server"', 'kind:"remote",server:e,openable:!0'] } },
  { target: 'background-tasks-card.mjs', source: 'cf74bc599-CRYqipWN.js',
    exports: { IM: 'SessionRailBackgroundTasks', NM: 'RailBackgroundTasksCard', MM: 'RailBackgroundTaskRow', PM: 'railTaskTitle', OM: 'railTaskIcon',
      jM: 'railStopLabel', DM: 'railTaskKey', wM: 'RAIL_TASKS_LIMIT', EM: 'TASK_META_FIELDS' },
    features: {
      IM: ['("session_rail")', '.loops ??', 'defaultMessage: "Stop requested\\u2026",', 'defaultMessage: "Task stopped",', 'defaultMessage: "Loop stopped",',
        'defaultMessage: "Scheduled prompt stopped",', 'defaultMessage: "Scheduled prompt",', 'id: "2gsTFbSUQm"', 'defaultMessage: "Recurring loop",', 'kind: "loop",',
        'title: e.prompt ?? (e.recurring === !1 ?', 'finishedCount:', 'openPane:'],
      NM: ['id: "backgroundTasks",', 'defaultMessage: "Background tasks", id: "PO+0DdDIId"', 'defaultMessage: "{count} finished",', 'defaultMessage: "{count} running",',
        '{ name: "AgentsSimple" }', 'taskStopping:', '"min-w-0 flex-1 truncate text-start text-primary"'],
      MM: ['defaultMessage: "Open {name} in Background tasks",', 'defaultMessage: "Stopping\\u2026", id: "NACfNicI6z"', 'defaultMessage: "Stop requested\\u2026",',
        'busyLabel:', 'hint:', 'hintDetail:', '"[[role=tooltip]_&]:line-clamp-4"', '"bdi", { dir: "ltr"', '"pe-xs"', '?? "Stop",', 'flush: "end",'],
      PM: ['(e.description, e.taskType)', ': e.description;'], OM: ['return "Clock";', 'e.taskType === "local_bash" ? "CommandLine" : "AgentsSimple"'],
      jM: ['defaultMessage: "Stop this task", id: "+ZLTl3VMv+"', 'defaultMessage: "Stop this loop. Claude will cancel it.",',
        'defaultMessage: "Stop this scheduled prompt. Claude will cancel it.",'],
      DM: ['return e.taskId;', 'return `loop:${e.loop.id}`;'], wM: [' = 4;'], EM: ['("loops", "tags", "isArchived", "createdAt")'],
    },
    closureFeatures: { IM: ['agentToolUseId:', 'surface:"session_rail"', 'section:"backgroundTasks"', '{toolUseId:e.agentToolUseId,description:e.title}',
      'defaultMessage:"Next {countdown}",id:"OCt80bz0DY"', 'title:e.name??PM(e)'] } },
];

// Original text the rail's mount follows (SR-7) but cannot import: TN hands the sections to the rail view (R2:
// official.looseFeature, each exactly once).
const rawCallSites = [
  { source: 'cf74bc599-CRYqipWN.js', role: 'TN gives the rail its Servers and Background tasks sections (host: SR-7)', keep: ['$M', 'IM'],
    features: ['J2($,299,l,t)?(Fn=s($M,{sessionRef:t,readOnly:l}),In=s(IM,{sessionRef:t,readOnly:l}),K3($,299,l,t,Fn,In))'] },
];
// Sections not emitted here (research §10). None: the Context section is extract-session-rail-context.mjs's.
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
// An importable area's manifest for this release, or null while that area is still on another one (its modules then
// slice nothing of 3.6556.2).
async function areaManifest(area) {
  try {
    if (area === 'sidebar-resize') return await sidebarResizeManifestFor(referenceVersion);
  } catch (error) {
    if (/ is .*, expected /.test(error.message)) return null;
    throw error;
  }
  return readJson(path.join(generatedRoot, area, 'manifest.json'));
}
let areas;
async function loadAreas() {
  if (areas) return areas;
  const viewTabs = await viewTabsManifestFor(referenceVersion);
  if (viewTabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${viewTabs.referenceVersion}, expected ${referenceVersion}`);
  const viewTabsByLocal = new Map();
  for (const [name, entry] of Object.entries(viewTabs.publicNames ?? {})) viewTabsByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  const viewTabsBindings = new Map();
  for (const m of viewTabs.modules) viewTabsBindings.set(m.source, new Set(m.bindings));
  const kit = await readJson(path.join(generatedRoot, 'session-rail-kit/manifest.json'));
  if (kit.referenceVersion !== referenceVersion) throw Error(`session-rail-kit is ${kit.referenceVersion}, expected ${referenceVersion}`);
  const kitByLocal = new Map();
  for (const [name, entry] of Object.entries(kit.publicNames)) kitByLocal.set(`${entry.file}#${entry.local}`, { name, ...entry });
  // file#local -> [{ area, target }] for every 3.6556.2 binding the importable areas slice (code-current mixes versions;
  // only its modules sliced from this snapshot count).
  const sliced = new Map();
  for (const area of importableAreas) {
    const manifest = await areaManifest(area);
    if (!manifest) continue;
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
  areas = { viewTabsByLocal, viewTabsBindings, kitByLocal, sliced };
  return areas;
}
const exportCache = new Map();
async function areaExports(area, target) {
  const key = `${area}/${target}`;
  if (!exportCache.has(key)) exportCache.set(key, area === 'sidebar-resize' ? await sidebarResizeExportsFor(referenceVersion, target) : exportedNames(await fs.readFile(path.join(generatedRoot, area, target), 'utf8')));
  return exportCache.get(key);
}

// vendor-frame: the export alias of `local` that official.reactAliases lists, proved once (R3).
const provedAliases = new Set();
async function reactMember(file, local) {
  if (file !== VENDOR_FRAME) return null;
  const src = await readSource(file);
  const alias = [...src.exported].find(([name, l]) => l === local && Object.hasOwn(official.reactAliases, name))?.[0];
  if (!alias) return null;
  if (!provedAliases.has(alias)) { official.assertVendorAlias(src.code, alias); provedAliases.add(alias); }
  const [module, member] = official.reactAliases[alias];
  return { from: module, name: member };
}
const posix = p => p.split(path.sep).join('/');
const rel = (fromFile, toFile) => { const r = posix(path.relative(path.dirname(fromFile), toFile)); return r.startsWith('.') ? r : `./${r}`; };

export async function extractSessionRailSections({ check = false, explore = null } = {}) {
  const { viewTabsByLocal, viewTabsBindings, kitByLocal, sliced } = await loadAreas();
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
      try {
        assertFeatures(`${spec.target}: adapter ${via} (${local})`, adapter.closure ? closureText(dep, local) : await featureText(dep, original), adapter.features);
      } catch (error) {
        if (!explore) throw error;
        explore.push({ target: spec.target, via: 'ADAPTER-FEATURE', local, size: error.message });
      }
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
    const selected = new Map(), imports = new Map(), seen = new Set(), contexts = [];
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
      } else {
        if (adapters[`${spec.source}:${name}`] || kitByLocal.has(`${spec.source}#${name}`)) throw Error(`${spec.target}: root ${name} is provided elsewhere`);
        // R4: a root view-tabs publishes in 3.6556.2 keeps this area's export name as a re-export of the one view-tabs copy.
        if (viewTabsByLocal.has(`${spec.source}#${name}`)) {
          imports.set(name, await resolveBinding(spec, spec.source, name, `${spec.source}:${name}`));
          return;
        }
      }
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
          contexts.push(name);
        }
      }
    };
    for (const name of Object.keys(spec.exports)) {
      const entry = src.top.get(name);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      try {
        assertFeatures(`${spec.target}: root ${name}`, await featureText(src, entry), spec.features?.[name]);
        assertFeatures(`${spec.target}: root ${name} (closure)`, closureText(src, name), spec.closureFeatures?.[name]);
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
    // `reexports` (R4): a 2.42304.0 export name whose 3.6556.2 original moved to another target is re-exported from it.
    const reexportText = Object.entries(spec.reexports ?? {}).map(([target, names]) => {
      const from = emitted.find(m => m.spec.target === target);
      if (!from) throw Error(`${spec.target}: re-export from ${target}, which is not an earlier module of this area`);
      for (const n of names) if (!Object.values(from.spec.exports).includes(n)) throw Error(`${spec.target}: ${target} does not export ${n}`);
      return `\nexport { ${names.join(', ')} } from "./${target}";`;
    }).join('');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };${reexportText}`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-session-rail-sections.mjs.\n// Edit the extractor or src/source-session-rail-sections-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    if (!explore) {
      // The module must be closed: every identifier it reads is imported or declared in it.
      const closed = babel.babelParse(text, spec.target, true);
      let globals;
      babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
      const allowed = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'String', 'Set', 'Map', 'JSON', 'Symbol', 'Promise', 'RegExp',
        'globalThis', 'setTimeout', 'clearTimeout', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'URL', 'BigInt', 'Boolean', 'window',
        'document', 'parseInt', 'parseFloat', 'isNaN', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'WeakMap', 'console']);
      const unbound = globals.filter(name => !allowed.has(name));
      if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
      ...(spec.reexports ? { reexports: spec.reexports } : {}),
      ...(contexts.length ? { contexts } : {}),
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
      const count = [...text.matchAll(official.looseFeature(feature, { flags: 'g', keep: site.keep ?? [] }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, loose: true, features: site.features });
  }
  // Nothing is deferred since R4i-rail RL3 (`deferred` is empty); a deferred section would be pinned here.
  if (deferred.length) throw Error('session-rail-sections defers no section');
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
    for (const m of manifest.modules) console.log(`${m.target}\t${m.bindings.length} bindings [${m.bindings.map(b => b.name).join(' ')}]\t${m.imports.filter(i => i.kind !== 'unresolved').map(i => `${i.local}=${i.kind}:${i.name}`).join(' ')}`);
    for (const f of found) console.log(`UNRESOLVED ${f.target}\t${f.via}\t${f.local}\t${f.size}`);
  } else await extractSessionRailSections({ check: process.argv.includes('--check') });
}
