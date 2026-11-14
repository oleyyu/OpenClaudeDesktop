// R4g-mcp MA-6: the 3.6556.2 transcript MCP App / Visualize widget card, extracted without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/mcp-app-card, own scripts/verify-gen-mcp-app-card.mjs).
//
//   tool-card.mjs   c96d752d0 lY = memo(lYe) and vYe: the transcript card of an MCP tool whose server gives it a ui://
//                   resource. lYe matches the tool to its server (built-in visualize, the session's own servers,
//                   connectors), works out why the widget would not render (DJe: gate_off / server_unknown / unverified /
//                   connector_rows_from_elsewhere / local_client_missing / remote_client_missing / sandbox_url_missing /
//                   conversation_hash_pending / init_error / host_chunk_failed / host_chunk_not_resident / pending_approval /
//                   result_payload_missing / call_refused / call_not_run / call_failed / ssh_host_call_not_completed /
//                   ssh_host_switches_unknown) and falls back to the plain tool row when it would not (its own
//                   callRefused / callFailed come from the tool's rejected / policyDenied / isError); it computes the
//                   conversation hash, remembers the row's open state ("mcpApp:<id>") and mounts vYe. vYe is the card: the
//                   status title (visualize: "Making a visual" / "Made a visual" / "Failed to make a visual" / "Visual from
//                   Claude"; other servers: "Widget from {server}", "Widget from {server} on {host}" for an SSH host
//                   entry, "A server on {host}: {server}"), the "Show in another pane" header button (only with the MCP
//                   App side pane), the hostContext (_hostStrings, availableDisplayModes, _hostCopiesText,
//                   _hostHandlesNotSent, the style variables with the host text sizes and fonts, _keepMenuClear), the
//                   remembered height, the ui/message, ui/open-link (https only, link policy, the desktop link check,
//                   the "Open link?" dialog), ui/download-file, copy-image and copy-text handlers, the view-state host
//                   (CJe, only for a call the deny-connectors gate allows), the side-pane and fullscreen guards, and the
//                   lazy AppRenderer (qJ: the "epitaxy_mcp_app_host" chunk, here
//                   src/generated/mcp-app-host/app-renderer.mjs, picked by its AppRenderer export).
//   …               and the closure those read from the other chunks (one module per chunk, see `chunks`).
//
// Every emitted statement is an original top-level statement of the 3.6556.2 chunk; a module's statements are the
// reachable closure of its roots across chunks (each declaration parsed on its own with Babel's scope analysis). Generated
// modules import each other by the original export aliases. A binding resolves, in this order, to: a named host adapter
// in src/source-mcp-app-card-adapters.jsx (its original declaration must carry `features`), a verified React export of
// vendor-frame (official-3.6556.2.mjs reactAliases, `Oo` = react/compiler-runtime#c), a module of the MA-5 MCP App host
// library (src/generated/mcp-app-host, by chunk and original local, so the card and the renderer share one AppRenderer,
// one resource cache and one gate reading), a semantic public name of the shared view-tabs graph (the React Compiler
// helpers and CDS, R3/R6), or a chunk on the allow-list below. Anything else fails generation.
//
// No 2.42304.0 view (E34 retired in wave 10, w10-trans-mcp-v3-pins): the last 2.42304.0 importers of this library
// (session-rail until W5, src/mcp-app-model.mjs `lf` until W7) are on 3.6556.2 names, so the `legacyExports` table, the
// importer scan, `manifest.legacy["2.42304.0"]` / `legacyImporters` and the frozen manifest
// scripts/mcp-app-card-legacy-2.42304.0.json are gone. scripts/mcp-app-card-compat.mjs serves the 3.6556.2 manifest only.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { mcpAppHostManifestFor } from './mcp-app-host-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/mcp-app-card');
const hostLibrary = path.join(root, 'src/generated/mcp-app-host');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-mcp-app-card-adapters.jsx';
const HOST_CHUNK = 'c96d752d0-CWv_7-n9.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The chunks the closure may enter, each with its generated module. `roots` maps an original local to its semantic export
// name; `features` pins a root to strings of its prettier text (literals and property keys, R2; `{ loose }` entries are
// official looseFeature() patterns over the minified text); `raw` pins strings of the minified bytes with their exact
// occurrence count. `localCuts` replace a top-level declaration of the chunk with a host adapter (the original text is
// pinned with `features`); `dynamicImports` re-point a pinned dynamic import at another generated library.
const chunks = {
  [HOST_CHUNK]: { target: 'tool-card.mjs',
    roots: { lY: 'McpAppToolCard', lYe: 'McpAppToolCardBody', vYe: 'McpAppWidgetCard', DJe: 'mcpAppSkipReason', tYe: 'SKIP_REASON_OUTCOME',
      TJe: 'useHostFontVariables', ZJ: 'isVisualizeMatch', YJ: 'stripToolServerPrefix', YJe: 'visualizeStatus', XJe: 'visualizeStatusLabel',
      QJ: 'truncateMiddle', XJ: 'messageTextForComposer', KJe: 'rememberedWidgetHeight', BJ: 'COLLAPSED_WIDGET_HEIGHT', kJe: 'NO_SAFE_AREA_INSETS',
      AJe: 'INLINE_DISPLAY_MODES', jJe: 'PANE_DISPLAY_MODES', qJ: 'appRendererChunk', qJe: 'LazyAppRenderer', NJe: 'AUTO_PANE_GATE', FJe: 'SERVER_HEADER_GATE' },
    features: {
      lYe: ['tool: t,', 'sessionRef: n,', 'fallback: l,', 'headerlessTitle: d,', 'sharesWithSession: y,', 'drawnWhileWritten: b,', 'savesViewState: x,',
        'mcpAppsSandboxProxyUrl: O', 'sessionOwned: L,', 'isSshHostEntry: B,', '`mcpApp:${t.id}`', 'headerlessUnverified: We,', 'callRefused: Fe,',
        'callFailed: Ie,', 'sshHostCallNotCompleted: Ue,', 'sshHostSwitchesUnknown: H,', 'isPendingApproval: A,', 'hostResident: ze === "resident",',
        'conversationHash: xe ?? void 0,', 'savesViewState: x === !0,', 'onHoldsRow: $e,', 'heldRowHeight: it?.height,', 'f(iL, { tool: t })',
        '? "built_in"', '? "first_party"', '? "claude_code"', '? "connector"', ': "other",'],
      vYe: ['me && { _hostHandlesNotSent: !0 }', 'me && { _keepMenuClear: Kt }', 'availableDisplayModes: Jt,', '"data-mcp-app-card": "",',
        'defaultMessage: "Widget from {server}",', 'id: "FhYnU4Hl8w",', 'defaultMessage: "Widget from {server} on {host}",', 'id: "H7+OhBL0+m",',
        '{ defaultMessage: "{server} on {host}", id: "j7hAGxq49x" }', 'defaultMessage: "A server on {host}: {server}",',
        'defaultMessage: "Rendering widget",', 'defaultMessage: "Show in another pane",', 'icon: "Expand",', 'defaultMessage: "Showing in another pane",',
        'defaultMessage: "Show here",', 'defaultMessage: "Show more",', 'onmessage: Ma,', 'ondownloadfile: Pa,', 'onDisplayModeChange: Fa,',
        'retrySandboxSetupAfterLoadMs: Ia,', 'onCopyImage: La,', 'accessibleTitle: ni,', 'smoothInitialHeight: W,', 'intersectDeclaredFrameDomains: X,',
        '"[Epitaxy MCP App] ui/message without iframe-originated user activation blocked",', 'if (i !== "https:" &&',
        '"relative text-muted-as-secondary after:absolute after:-inset-0.5"', '"flex min-w-0 gap-xs [&>button]:min-w-0"',
        '"relative flex h-[1lh] shrink-0 items-center"', 'n = Number.isFinite(t) && t > 8;'],
      DJe: ['? "unverified"', '? "connector_rows_from_elsewhere"', '? "conversation_hash_pending"', '? "init_error"', '? "host_chunk_failed"',
        '? "host_chunk_not_resident"', '? "pending_approval"', '? "result_payload_missing"', '? "call_refused"', '? "call_not_run"', '? "call_failed"',
        '? "ssh_host_call_not_completed"', '? "ssh_host_switches_unknown"', ': "sandbox_url_missing"', '? "local_client_missing"',
        ': "remote_client_missing"', ': "server_unknown"', ': "gate_off";'],
      tYe: ['connector_rows_from_elsewhere: "rows_from_elsewhere",', 'call_refused: "result_payload_missing",', 'call_failed: "result_payload_missing",',
        'ssh_host_switches_unknown: "result_payload_missing",'],
      TJe: ['("font-sans")', '("font-mono")', '"--font-sans"', '"--font-mono"'],
      ZJ: ['return e?.server.isBuiltIn === !0 &&'],
      YJ: ['let n = `mcp__${t}__`;', 'let r = `${t}:`;', 'let n = e.slice(21);', 'if (e.startsWith("mcp__")) {'],
      YJe: ['? "settled"', '? "failed"', '? "making"', '? "made"'],
      XJe: ['case "making":', 'case "made":', 'case "failed":', 'case "settled":', '.making);', '.made);', '.failed);'],
      XJ: ['(e) => (e.type === "text" ? [e.text] : [])', 'return i.trim() === "" ? null : i;'],
      KJe: ['return Number.isFinite(t) && t > 8 ? Math.min(t,'],
      QJ: ['`${n.slice(0, t - 1 - r).join("")}\\u2026${n.slice(-r).join("")}`'],
      BJ: ['BJ = 280'], AJe: ['AJe = ["inline"]'], jJe: ['jJe = ["inline", "fullscreen"]'], kJe: ['kJe = { top: 0, right: 0, bottom: 0, left: 0 }'],
      NJe: ['NJe = "__gb__2398473450"'], FJe: ['FJe = "__gb__3106245306"'],
      qJ: ['id: "epitaxy_mcp_app_host",', 'tier: "T1",', 'priority: 120,', 'pick: (e) => e.AppRenderer,', 'ssr: !1,', '("placeholder-would-mislead")', 'onChunkError: "fail-open",'],
      qJe: ['qJe = qJ.Component'],
      lY: [{ loose: 'lY=M(lYe)' }],
    },
    raw: [['"Widget from {server}"', 1], ['"Widget from {server} on {host}"', 1], ['"A server on {host}: {server}"', 1], ['"Rendering widget"', 1],
      ['"Show in another pane"', 1], ['"Showing in another pane"', 1], ['"data-mcp-app-card"', 1], ['retrySandboxSetupAfterLoadMs:', 1],
      ['id:"epitaxy_mcp_app_host"', 1], ['NJe="__gb__2398473450"', 1], ['FJe="__gb__3106245306"', 1], ['_Ye="mcp_apps_telemetry_config"', 1],
      ['"call_refused"', 1], ['"call_failed"', 1], ['"ssh_host_call_not_completed"', 1], ['"ssh_host_switches_unknown"', 1]],
    // iL: the plain tool row lYe falls back to when no `fallback` is passed (the transcript always passes the host's own
    // row, MA-7). gJe: the server header row of a non-visualize card, drawn only while __gb__3106245306 (FJe) is on.
    localCuts: {
      iL: { name: 'ToolRowFallback', features: ['(e) => e.epitaxyEngineToolRow,'] },
      gJe: { name: 'GatedServerHeaderRow', features: ['"group/tool relative flex w-full min-w-0 items-center gap-xs"', 'manageable: a,', 'children: [o, s, c, u],'] },
    },
    dynamicImports: { qJ: { 'cd9b7fccf-Ccxjzcg4.js': '../mcp-app-host/app-renderer.mjs' } } },
  // The visualize status messages (ex).
  'c52b02f3f-BejopSz8.js': { target: 'visual-messages.mjs', roots: { L: 'VISUAL_MESSAGES' },
    features: { L: ['defaultMessage: "Making a visual"', 'defaultMessage: "Made a visual"', 'defaultMessage: "Failed to make a visual"', 'defaultMessage: "Visual from Claude"'] },
    raw: [['defaultMessage:"Visual from Claude"', 1]] },
  // O: the anchor download the save hook falls back to (the host's save path, see useSaveFile).
  'cc61d0d63-D6fifMhm.js': { target: 'file-save.mjs', roots: { O: 'downloadBlob' },
    features: { O: ['(a.download = t),', 'a.click(),', 'setTimeout(() => URL.revokeObjectURL(i),'] } },
  // lb: an MCP server name as a tool-name segment (mcp__<segment>__<tool>).
  'shared-156-BLTosN8U.js': { target: 'tool-names.mjs', roots: { lb: 'mcpServerSegment' },
    features: { lb: ['return e.replace(/[^a-zA-Z0-9_-]/g, "_");'] } },
  // LP: the visualize tool-name prefixes (visualize:, mcp__visualize__, the built-in server uuid, local / internal).
  // w13-close-gen-dedup (coworkui-outputs-02, D1): tO (the error tag WeakMap; module state, so one instance), nO (tag an
  // error), q (assert never, throws an nO-tagged "assert_never" error) and qz ("Claude in Chrome") are published so
  // cowork-progress imports them instead of slicing a second WeakMap.
  // W13 G11 (D1, cowork-approval pendingDedupe): tj (the text / emoji variation selectors U+FE0E / U+FE0F) is published
  // too, so cowork-approval imports this copy instead of cutting a second one.
  'shared-78-D5Fw2h0a.js': { target: 'shared-78.mjs', roots: { LP: 'isVisualizeToolName', tO: 'errorTags', nO: 'tagError', q: 'assertNever', qz: 'claudeInChromeServerName',
    tj: 'variationSelectors' },
    features: { LP: ['e.startsWith("visualize:")', 'e.startsWith("mcp__visualize__")', 'e.startsWith("mcp__6f616b42-0ed8-571e-823f-ee4aca6b7ce9__")',
      'e.startsWith("mcp__local_visualize__")', 'e.startsWith("mcp__internal_visualize__")'],
      tO: [{ loose: 'tO=new WeakMap' }], nO: [{ loose: 'function nO(e,t){return tO.set(t,e),t}' }],
      q: ['"assert_never",', 'Unhandled discriminated union member: '], qz: ['"Claude in Chrome"'], tj: [{ loose: 'tj=new Set(["\\uFE0E","\\uFE0F"])' }] },
    // _o: load the public suffix list chunk (cd668e25e parseHost) once; the server favicon (WF, Co) derives a favicon
    // URL only after it has. The host does not load that chunk, so no remote favicon URL is derived (letter / globe).
    localCuts: { _o: { name: 'loadPublicSuffixList', features: ['return typeof window > "u" ? Promise.resolve() : ((co ??= go()), co);'] } } },
  // The MCP App model-context store (ui/update-model-context), read by the transcript mount (MA-8).
  'shared-28-DNYlf4wu.js': { target: 'shared-28.mjs', roots: { sv: 'mcpAppModelContextStore' },
    features: { sv: ['statesByConversation: {},', 'readBackByConversation: {},', 'updateModelContext: async (n, r, i, a) => {'] } },
};

// E42: modules a plain `node --test` imports (src/mcp-app-model.mjs -> tool-names.mjs). Their generated import closure must
// stay inside this library (the `react` package aside) and must not reach view-tabs, the adapter module or the host library.
const PLAIN_NODE_TARGETS = ['tool-names.mjs'];
// Originals this library slices although the host library slices them too (neither exports them). Each is stateless,
// so the second copy is harmless; anything else the host library also holds fails generation.
const HOST_DUPLICATES = {
  'cc0e3547f-Bla_O6hq.js#bt': 'constant 1 (the comfortable type step offset)',
  'cc0e3547f-Bla_O6hq.js#xt': 'array of font-size table steps, built once from constants',
  'cc0e3547f-Bla_O6hq.js#St': 'pure function over xt and the fizzy-lake part check (off, E12)',
  'shared-0-DDOOdL6P.js#Fa': 'pure function (URL whitespace trim)',
  'shared-25-DOWZRSlq.js#ni': 'pure function (returns ri)',
  'shared-25-DOWZRSlq.js#ri': 'empty function',
};
// Chunks this library and the host library both slice under different locals; every binding emitted here must be
// stateless (functions, literals, regular expressions), so the two copies cannot diverge.
const STATELESS_CHUNKS = ['c531c760b-B_u8xPdC.js'];

// Host dependencies (checked first), by chunk and export alias. `local` is the declaration the alias must still name;
// `features` must appear in its prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  'shared-78-D5Fw2h0a.js': {
    _y: { name: 'useMcpAppsEnabled', local: 'Aw', features: ['?.epitaxyMcpApps', 'status === "supported"'] },
    tv: { name: 'useInCodeRoute', local: 'iD', features: ['.isCCDRoute'] },
    gy: { name: 'useMcpAppPaneSupported', local: 'jw', features: ['?.epitaxyMcpAppPane?.status === "supported"'] },
    nf: { name: 'cachedResourceMeta', local: 'BI', features: [{ loose: 'function BI(e,t){return LI.get(zI(t,e))?.meta}' }] },
  },
  'shared-0-DDOOdL6P.js': {
    tn: { name: 'useHostConfiguration', local: 'AQ', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
    // iO: report a handled severe renderer error (Datadog RUM / Sentry, O11Y_INTERNALS); here the console.
    Vp: { name: 'reportHandledError', local: 'iO', features: [{ loose: 'iO=I(cO,F.O11Y_INTERNALS)' }] },
  },
  'shared-11-_AVGLHEz.js': { or: { name: 'toolApprovalStore', local: 'w_', features: ['requestsBySession: {},', 'approvedPlans: {},', 'setRequestStatus:'] } },
  'cef1e6037-C9OZ_iaL.js': {
    R: { name: 'useSessionMcpState', local: 'an', features: [{ loose: 'function an(e){let $=J9(3),t=Ue(),n=en(e);return J2($,0,t,n)?K2($,0,t,n,n?Ve(t,n):t):$[2]}' }] },
    z: { name: 'useSshServerHold', local: 'Vt', features: ['.here[a] === void 0', '.sshHost[a]', 'held: f,', 'sshHost: p'] },
    P: { name: 'useConnectorRowsHere', local: 'Ht', features: ['e?.type === "local" ? e.id : void 0', '.here[r]'], also: { Ut: ['case "local":', 'return t === !0;', 'case "bridge":', 'case "cli":'] } },
    V: { name: 'useProxiedConnectorCall', local: 'Jt', features: ['sessionRef: n,', 'toolUseId: r,', 'wanted: a', '.calls['] },
    F: { name: 'useSessionMcpClient', local: 'Ct', features: ['sessionId: n,', 'serverSegment: r,', 'sessionOwned: i,', 'isSshHostEntry: a', '.clients, n, r, c'] },
    H: { name: 'useSshReconnectGeneration', local: 'rn', features: ['e === void 0 ? 0 : (t.bySession[e] ?? 0)'] },
    L: { name: 'useIsSshHostEntry', local: 'tn', features: ['.bySession[e], t) !== void 0'] },
    B: { name: 'useSessionCliMcpServers', local: 'en', features: ['t.bySession[e];', 'return n?.length ? n : void 0;'] },
    M: { name: 'isBridgeHeldSession', local: 'Tt', features: [{ loose: 'function Tt(e){return M.has(e)}' }] },
  },
  'c03935b01-yhcY34vt.js': {
    // The session pane store (side panes, tiles). The host's MCP App side pane is off (gy), so no pane store exists here.
    _t: { name: 'usePaneStore', local: 'Q', features: [{ loose: 'function Q(e){let t=f(Z);return Ye(t??su,e)}' }] },
    vt: { name: 'usePaneStoreContext', local: 'fu', features: [{ loose: 'function fu(){return f(Z)}' }] },
    dt: { name: 'useMainPaneHost', local: 'gu', features: [{ loose: 'function gu(){let e=Q(_u);return pu()&&e}' }] },
  },
  'cc6e9624e-CoHywWvV.js': { u: { name: 'useTranscriptRowExpanded', local: 'm', features: ['.getState().setRowExpanded(e, n);', '(t) => t.rows[e]'] } },
  'cc6e65d4b-D0J5j7gV.js': { r: { name: 'useOpenConfirmedLink', local: 'm', features: ['.getState().setPendingPreviewLinkUrl(r, { explicit: !0 })'] } },
  'cd4f82e77-CAMIsQ30.js': { v: { name: 'useSidePaneAutoOpen', local: 'an', features: ['sessionId: e,', 'messageId: t,', 'toolId: n,', 'enabled: r,', 'none: !1,'] } },
  'shared-52-uHFNjl7C.js': { Lg: { name: 'useDynamicConfig', local: 'Kp', features: [{ loose: 'function Kp(e){let $=J9(5),t=We(),n=J1($,0,e)?K1($,0,e,fr(e)):$[1];return J2($,2,t,n)?K2($,2,t,n,Re(t,n)):$[4]}' }] } },
  'shared-25-DOWZRSlq.js': {
    // GrowthBook reads. The host has no GrowthBook (D29/D31): host-growthbook.mjs answers.
    Yh: { name: 'readGrowthBookGate', local: 'fs', features: [{ loose: 'return $o(J1($,0,e)?K1($,0,e,H(e)):$[1]).on' }] },
    rg: { name: 'readGrowthBookFlag', local: 'hs', features: ['return !t || !n?.growthbook'] },
  },
  'shared-7-DBAgAi5H.js': {
    // The appearance settings store; the card reads chatTextSize (s / m / l, default "m").
    as: { name: 'appearanceSettingsStore', local: 'jg', features: ['chatTextSize: Sg(Ag.chatTextSize) ? Ag.chatTextSize : "m",', 'setChatTextSize: (t) => e({ chatTextSize: t }),'] },
  },
  'shared-156-BLTosN8U.js': {
    _f: { name: 'matchSessionMcpTool', local: 'Cw', features: ['?.toolsEnumerated === !1', '"forLabel"'] },
    Gf: { name: 'isSessionOwnedServer', local: 'dw', features: [{ loose: 'function dw(e,t){return cw.get(e)?.has(t)===!0}' }] },
    tm: { name: 'mcpClientsStore', local: 'X', features: [{ loose: 'X=Zl()(By(Xl((...e)=>({...Rc(...e),...Mb(...e)}))))' }] },
    hf: { name: 'connectRemoteMcpServer', local: 'uC', features: ['waitWhileTurnedOff: n = !1', '.remoteConnectionStates['] },
    Mf: { name: 'isConnectorToolOfServer', local: 'qC', features: ['e.startsWith(`mcp__${lb(t)}__`)'] },
    Cm: { name: 'RemoteMcpClient', local: 'Iy', features: ['this.inflightRequestCount = 0', 'disconnectIfNoOngoingRequests()'] },
    Mr: { name: 'useLazyChunkState', local: 'SK', features: ['reportWait', 'e.preload("open")'] },
  },
  'shared-1-BJhqMmkf.js': { Xr: { name: 'findMcpAppToolServer', local: 'nR', features: ['hubClientToolNames === !0', '"lcl-"', 'serverUuid: r.server.uuid'] } },
  'shared-104-CTONUSaz.js': { mm: { name: 'defineLazyChunk', local: 'ss', features: ['e.options.suspense === !0', '"ui-unsized"', '"placeholder"'] } },
  'shared-10-D6FXWZph.js': {
    qi: { name: 'chunkGateAttributes', local: 'Fi', features: ['preload_reason:', 'stamp_age_h:'] },
    Ji: { name: 'mcpAppRecentUse', local: 'Mi', features: ['"tool_cell_mcp_app"'] },
  },
  'preload-helper-D0dM6GpB.js': { t: { name: 'preloadChunk', local: 's', features: ['"vite:preloadError"'] } },
  'c68c4283d-CWbOoVxS.js': {
    Nn: { name: 'logWidgetFallback', local: 'nc', features: ['"claudeai.epitaxy.mcp_app.widget_fallback"'] },
    Pn: { name: 'logWidgetMounted', local: 'rc', features: ['"claudeai.epitaxy.mcp_app.widget_mounted"'] },
    af: { name: 'logSidePaneToggled', local: 'W', features: ['"claudeai.epitaxy.side_pane.toggled"'] },
    Mn: { name: 'logQuestionForm', local: 'ic', features: ['"claudeai.epitaxy.mcp_app.question_form"'] },
    tf: { name: 'logSidePaneOpened', local: 'sd', features: ['opened: !0,', 'presentation:', '"overlay"', '"split"'] },
    // ve: the renderer error report (Sentry / Datadog); here the console.
    t: { name: 'reportRendererError', local: 've', features: ['feature: "ccd",', 'source: t,'] },
  },
  'c06cf64bb-CdJdJuVd.js': { mt: { name: 'pendingTurnArmedAt', local: 'jO', features: ['.pendingTurn?.armedAt'] } },
  'vendor-intl-DYfox5Co.js': { p: { name: 'useIntl', local: 'q', features: [{ loose: 'function q(){let e=a(K);return Mt(e),e}' }] } },
  'c26fb8b6b-B7Friu61.js': { T: { name: 'useInsideStepList', local: 'Xe', features: [{ loose: 'function Xe(){return l(D)??!1}' }], also: { qe: ['qe = "__gb__2846116625"'] } } },
  'c9d6d9802-BXTz_Gob.js': { t: { name: 'useApprovedFrameDomains', local: 'y', features: ['remoteServerUuid: r', '"mcp_apps_frame_domains"'] } },
  'c87a7a2df-BjGrnhdM.js': { i: { name: 'useSidePanePortalHost', local: 'g', features: ['"h-full w-full"'] } },
  'shared-8-Db1QN4mf.js': { Df: { name: 'sessionsStore', local: 'og', features: ['name: "ccd-sessions-filter",', 'archivedRowsPending: !1,'] } },
  'c5da7eb42-XijZdwf1.js': { Xn: { name: 'questionPromptsStore', local: 'iT', features: ['promptsBySession: {},', '"trailing"'] } },
  'c227f4d5e-B-FYKrwT.js': { Zn: { name: 'keepSplitForTile', local: 'oQ', features: ['.keepSplit = !0'] } },
  'shared-3-BCEbd8Fv.js': { qs: { name: 'cleanSendText', local: 'fR', features: ['removedCount: 0'] } },
  'ca5db7aaf-qq5selW3.js': { u: { name: 'canExpandTile', local: 'j', features: ['e.hasSidePanes &&', '.toggleExpandedTile)', '.tileLayout).has(t)'] } },
  'c734f318c-SHcb2X2p.js': { t: { name: 'StepList', local: 'It', features: [{ loose: 'It=Object.assign(Ft,{Step:Et,Phrases:dt})' }] } },
  'cc61d0d63-D6fifMhm.js': { i: { name: 'useSaveFile', local: 'ut', features: ['"claudeai.ochre_wren.download_sign"', 'O(d, u, s);'] } },
  'c8748971a-B0-mlqu7.js': { t: { name: 'useResolvedFontToken', local: 'f', features: ['"font-sans-display"', '"font-system"'] } },
  'cc0e3547f-Bla_O6hq.js': {
    // dt / Je / Xe: the sign-in parking of a claude.ai connector's tools/call (onCallToolAuthRequired is passed only
    // for a RemoteMcpClient, which the host never has; D17).
    m: { name: 'useAppSignInParking', local: 'dt', features: ['"Another request from this app is already waiting for you to sign in."'] },
    T: { name: 'AppSignInPrompt', local: 'Je', features: ['chromeClassName: "border-b-0.5 bg-surface-1 px-3 py-2",'] },
    E: { name: 'AppSignInOverlay', local: 'Xe', features: ['"pointer-events-auto absolute inset-0 z-[5] bg-bg-100/60"'] },
    // The widget load timing telemetry (D17).
    _: { name: 'startWidgetLoadTiming', local: 'nt', features: ['startMs: performance.now(),', 'toolResultSettledClean: t.toolResult === "clean",'] },
    g: { name: 'endWidgetLoadTiming', local: 'ut', features: ['.isInstanceLive() ||', 'toolResultIsError:'] },
    x: { name: 'markWidgetHandoff', local: 'ot', features: ['"handoff"'] },
    S: { name: 'markWidgetResultClean', local: 'st', features: ['.toolResultSettledClean = !0', '"failure"'] },
    y: { name: 'cancelWidgetLoadTiming', local: 'ct', features: ['clearTimeout(t.deadlineTimer)'] },
    v: { name: 'markWidgetInitialized', local: 'rt', features: ['"guest_initialize_deadline"', '"success"'] },
    b: { name: 'markWidgetLoadError', local: 'it', features: ['kind: "load_failure"'] },
  },
};

// Original text the transcript mount (MA-7) follows but cannot import (prettier form of the named declaration).
const callSites = [
  { source: HOST_CHUNK, binding: 'ZNe', role: 'Transcript row kinds: a tool the session marks as an MCP App tool is its own "mcp_app" row, not a tool group member',
    features: ['t.isMcpAppTool?.(e.name)', '? "mcp_app"'] },
  { source: HOST_CHUNK, binding: 'K1e', role: 'Solo tool row: in an owned session an MCP App tool is lY with savesViewState (no fallback; lY falls back to iL)',
    features: ['tool: t.tools[0],', 'sessionRef: n,', 'onPrefillComposer: r,', 'savesViewState: !0,'] },
  { source: HOST_CHUNK, binding: 'n1', role: 'Grouped tool row: the same lY with the group row as fallback and savesViewState',
    features: ['tool: d,', 'sessionRef: a,', 'onPrefillComposer: o,', 'fallback: E,', 'savesViewState: !0,'] },
  { source: HOST_CHUNK, binding: 'NYe', role: 'Channel visualize widget (Cowork / channels, not the Code transcript): lY with sharesWithSession false and the channel props',
    features: ['"data-testid": "channel-widget-visualize",', 'sharesWithSession: !1,', 'drawCards: m,', 'unboxed: w,', 'drawnWhileWritten: I,'] },
];


async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map();
  const top = new Map(), statements = [], bareImports = [];
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration || node.source) throw Error(`${name}: unsupported export form`);
      for (const s of node.specifiers) exported.set(s.exported.name, s.local.name);
    } else if (node.type === 'ImportDeclaration') {
      if (!node.specifiers.length) bareImports.push(node.source.value.replace(/^\.\//, ''));
      for (const s of node.specifiers) {
        if (s.type !== 'ImportSpecifier') throw Error(`${name}: unsupported import form`);
        top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported.name });
      }
    } else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d, keyword: node.kind });
    else statements.push({ kind: 'statement', node });
  }
  const record = { name, bytes, code, exported, top, statements, bareImports, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const sliceText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `${entry.keyword} ${sliceText(src, entry)};` : sliceText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry).replace(/^(let|const) /, 'var '), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function programGlobals(text, label) {
  const ast = babel.babelParse(text, label, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  return globals;
}
function unitDeps(src, entry, key) {
  if (src.deps.has(entry)) return src.deps.get(entry);
  const text = emittedText(src, entry).replace(/^(let|const) /, 'var ');
  const deps = programGlobals(text, `${src.name}#${key}`).filter(n => n !== key && src.top.has(n));
  src.deps.set(entry, deps);
  return deps;
}
// What a closure chunk's side-effect statement acts on: identifiers it assigns, calls, or Object.assign()s.
function statementTargets(node) {
  const out = new Set();
  const visit = e => {
    if (!e) return;
    if (e.type === 'SequenceExpression') e.expressions.forEach(visit);
    else if (e.type === 'AssignmentExpression') { if (e.left.type === 'Identifier') out.add(e.left.name); }
    else if (e.type === 'CallExpression') {
      if (e.callee.type === 'Identifier') out.add(e.callee.name);
      if (e.callee.type === 'MemberExpression' && e.callee.object.name === 'Object' && e.callee.property.name === 'assign' && e.arguments[0]?.type === 'Identifier')
        out.add(e.arguments[0].name);
    }
  };
  if (node.type === 'ExpressionStatement') visit(node.expression);
  else if (node.type === 'ForOfStatement' && node.body.type === 'ExpressionStatement') visit(node.body.expression);
  return [...out];
}
const normalised = text => text.replace(/\s+/g, ' ');
// A feature is a string of the prettier text, or { loose } (official looseFeature over the minified or the prettier text).
function assertFeatures(label, text, features = [], raw = '') {
  const flat = normalised(text);
  const missing = features.filter(f => (typeof f === 'string'
    ? !text.includes(f) && !flat.includes(normalised(f))
    : !official.looseFeature(f.loose).test(raw) && !official.looseFeature(f.loose).test(text)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  if (file !== official.vendorFrame) return null;
  // Other vendor-frame exports (clsx, Base UI) resolve through view-tabs' public names or fail as unresolved.
  if (!official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(src.code, alias);
  return [module, member];
}
// Every global the emitted originals read. A new one fails generation so it is reviewed.
const allowedGlobals = new Set([
  'Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'DOMException', 'Proxy', 'ArrayBuffer', 'DataView', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
  'RegExp', 'Date', 'Intl', 'Reflect', 'BigInt', 'Function', 'Uint8Array', 'globalThis', 'decodeURIComponent', 'encodeURIComponent', 'decodeURI', 'encodeURI', 'TextDecoder', 'console', 'localStorage', 'sessionStorage', 'Element', 'HTMLElement', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'getComputedStyle',
  'window', 'document', 'navigator', 'performance', 'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'AbortController', 'setTimeout', 'clearTimeout', 'atob',
  'Node', 'Infinity', 'NaN', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'location', 'Blob', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  // 3.6556.2: a hash over the connector claims (shared-25 GW, shared-8 mT).
  'Uint32Array',
]);

// The libraries the card shares with other generators, by (chunk, original local) -> {module, export name}.
async function sharedLibraries() {
  const byLocal = new Map();
  const host = await mcpAppHostManifestFor(referenceVersion);
  if (host.referenceVersion !== referenceVersion) throw Error(`mcp-app-host is ${host.referenceVersion}, expected ${referenceVersion}`);
  const hostInternal = new Map();
  for (const m of host.modules) {
    for (const [name, local] of Object.entries(m.exports)) {
      const key = `${m.source}#${local}`;
      if (!byLocal.has(key)) byLocal.set(key, { from: `../mcp-app-host/${m.target}`, name, kind: 'mcp-app-host', original: local });
    }
    for (const b of m.bindings) hostInternal.set(`${m.source}#${b.name}`, m.target);
  }
  const tabs = await viewTabsManifestFor(referenceVersion);
  if (tabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${tabs.referenceVersion}, expected ${referenceVersion}`);
  for (const [name, entry] of Object.entries(tabs.publicNames ?? {})) {
    const key = `${entry.file}#${entry.local}`;
    if (!byLocal.has(key)) byLocal.set(key, { from: `../view-tabs/${entry.file}`, name, kind: 'view-tabs', original: entry.local });
  }
  // W13 G11 (D1): routines-shared's shared-0 (no imports, so plain node and E41/E42 safe) holds the shared-0 originals
  // this card's closure reaches (Pa lazyInit, AL / jL / ML, the GrowthBook reads sk…SA, bA); imported from it, one copy.
  const rs = await routinesSharedManifestFor(referenceVersion);
  if (rs.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${rs.referenceVersion}, expected ${referenceVersion}`);
  for (const target of ['shared-0-DDOOdL6P.mjs']) {
    const m = rs.modules.find(x => x.target === target);
    const text = await fs.readFile(path.join(root, 'src/generated/routines-shared', target), 'utf8');
    if (!m || sha(text) !== m.sha256) throw Error(`routines-shared ${target} differs from its manifest; run its generator`);
    const names = new Set(m.bindings.map(b => b.name));
    for (const block of text.matchAll(/^export \{([^}]*)\};/gm))
      for (const spec of block[1].split(',').map(v => v.trim()).filter(Boolean)) {
        const [local, as] = spec.split(/\s+as\s+/);
        const key = `${m.source}#${local}`;
        if (names.has(local) && !byLocal.has(key)) byLocal.set(key, { from: `../routines-shared/${target}`, name: as ?? local, kind: 'routines-shared', original: local });
      }
  }
  return { byLocal, hostInternal, hostManifestSha: sha(JSON.stringify(host.modules.map(m => [m.target, m.sha256]))) };
}

export async function extractMcpAppCard({ check = false } = {}) {
  const cache = new Map();
  const shared = await sharedLibraries();
  // Chunks the closure entered without a spec of their own get a module named after the chunk.
  const specOf = file => {
    if (!chunks[file]) chunks[file] = { target: `${file.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}.mjs`, implicit: true };
    return chunks[file];
  };
  const needed = new Map(), resolved = new Map(), exportsNeeded = new Map(), kept = new Map(), dynamic = new Map(), cutsUsed = new Map();
  const queue = [], reachedFrom = new Map();
  const chainOf = key => { const out = []; for (let k = key; k && out.length < 40; k = reachedFrom.get(k)) out.push(k.replace(/-[A-Za-z0-9_-]{8}\.js#/, '#')); return out.join(' <- '); };
  const need = (file, local, from) => queue.push({ file, local, from });
  const markExport = (file, local, alias) => {
    if (!exportsNeeded.has(file)) exportsNeeded.set(file, new Map());
    exportsNeeded.get(file).set(alias, local);
  };
  const allowed = new Set([HOST_CHUNK, ...Object.keys(chunks), ...ALLOWED_CLOSURE_CHUNKS]);
  for (const [file, spec] of Object.entries(chunks)) for (const local of Object.keys(spec.roots ?? {})) need(file, local, 'root');
  const ensure = file => { if (!needed.has(file)) { needed.set(file, new Set()); resolved.set(file, new Map()); } };
  const drain = async () => {
    while (queue.length) {
      const { file, local, from } = queue.shift();
      if (!allowed.has(file)) throw Error(`${from}: ${file} is not on the allow-list (needs ${local}) [${chainOf(from)}]`);
      const spec = specOf(file);
      ensure(file);
      if (needed.get(file).has(local)) continue;
      needed.get(file).add(local);
      reachedFrom.set(`${file}#${local}`, from);
      const src = await readSource(file, cache);
      const entry = src.top.get(local);
      if (!entry) throw Error(`${from}: ${file} has no top-level ${local}`);
      const isRoot = Object.hasOwn(spec.roots ?? {}, local);
      // A declaration another library already emits is imported from it (not for this generator's roots).
      if (entry.kind !== 'import' && !isRoot && shared.byLocal.has(`${file}#${local}`)) { resolved.get(file).set(local, shared.byLocal.get(`${file}#${local}`)); continue; }
      const cut = spec.localCuts?.[local];
      if (cut && entry.kind !== 'import') {
        assertFeatures(`local cut ${file}#${local}`, await featureText(src, entry), cut.features, sliceText(src, entry));
        resolved.get(file).set(local, { kind: 'adapter', from: adapterModule, name: cut.name, via: `${file}#${local}`, original: local });
        cutsUsed.set(`${file}#${local}`, cut.name);
        continue;
      }
      if (entry.kind === 'import') {
        const via = `${entry.file}:${entry.alias}`;
        const dep = await readSource(entry.file, cache);
        const depLocal = dep.exported.get(entry.alias);
        if (!depLocal) throw Error(`${file}#${local}: ${via} is not exported`);
        const adapter = adapters[entry.file]?.[entry.alias];
        if (adapter) {
          if (adapter.local !== depLocal) throw Error(`${file}#${local}: adapter alias ${via} is ${depLocal}, expected ${adapter.local}`);
          const original = dep.top.get(depLocal);
          if (!original || original.kind === 'import') throw Error(`adapter ${via} (${depLocal}) is not a declaration`);
          assertFeatures(`adapter ${via} (${depLocal})`, await featureText(dep, original), adapter.features, sliceText(dep, original));
          for (const [other, features] of Object.entries(adapter.also ?? {})) {
            const also = dep.top.get(other);
            if (!also || also.kind === 'import') throw Error(`adapter ${via} pins ${other}, which is not a declaration of ${entry.file}`);
            assertFeatures(`adapter ${via} (${other})`, await featureText(dep, also), features, sliceText(dep, also));
          }
          resolved.get(file).set(local, { kind: 'adapter', from: adapterModule, name: adapter.name, via, original: depLocal });
          continue;
        }
        const react = vendorImport(entry.file, entry.alias, dep);
        if (react) { resolved.get(file).set(local, { kind: 'react', from: react[0], name: react[1], via }); continue; }
        const lib = shared.byLocal.get(`${entry.file}#${depLocal}`);
        if (lib && !Object.hasOwn(chunks[entry.file]?.roots ?? {}, depLocal)) { resolved.get(file).set(local, { ...lib, via }); continue; }
        if (!allowed.has(entry.file)) throw Error(`${file}#${local}: unresolved import ${via} (${depLocal}); ${entry.file} is not on the allow-list`);
        resolved.get(file).set(local, { kind: 'generated', from: `./${specOf(entry.file).target}`, name: entry.alias, via });
        markExport(entry.file, depLocal, entry.alias);
        need(entry.file, depLocal, `${file}#${local}`);
        continue;
      }
      const text = sliceText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const rewrites = spec.dynamicImports?.[local];
        if (!rewrites) throw Error(`${file}: dynamic import inside ${local} [${chainOf(`${file}#${local}`)}]`);
        for (const target of Object.keys(rewrites))
          if (text.split(`import("./${target}")`).length - 1 !== 1) throw Error(`${file}#${local}: expected one import("./${target}")`);
        if (text.replace(/import\("\.\/([^"]+)"\)/g, (m, t) => (rewrites[t] ? '' : m)).match(/\bimport\s*\(/))
          throw Error(`${file}#${local}: unpinned dynamic import`);
        dynamic.set(`${file}#${local}`, rewrites);
      }
      for (const dep of unitDeps(src, entry, local)) need(file, dep, `${file}#${local}`);
    }
  };
  await drain();
  for (let changed = true; changed;) {
    changed = false;
    for (const [file, set] of needed) {
      const src = await readSource(file, cache);
      if (!kept.has(file)) kept.set(file, new Set());
      for (const stmt of src.statements) {
        if (kept.get(file).has(stmt)) continue;
        const targets = statementTargets(stmt.node);
        // Only statements acting on bindings this module emits itself (not ones imported from a shared library).
        if (!targets.some(t => set.has(t) && !resolved.get(file).has(t))) continue;
        kept.get(file).add(stmt);
        changed = true;
        const text = src.code.slice(stmt.node.start, stmt.node.end);
        if (/\bimport\s*\(/.test(text)) throw Error(`${file}: dynamic import in a top-level statement`);
        for (const dep of programGlobals(text, `${file}#statement`).filter(n => src.top.has(n))) need(file, dep, `${file}#statement`);
      }
    }
    if (queue.length) { await drain(); changed = true; }
  }
  for (const [file, spec] of Object.entries(chunks)) for (const [local] of Object.entries(spec.localCuts ?? {}))
    if (!cutsUsed.has(`${file}#${local}`)) throw Error(`local cut ${file}#${local} was not reached`);

  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-mcp-app-card.mjs', adapterModule: 'src/source-mcp-app-card-adapters.jsx',
    hostLibrary: 'src/generated/mcp-app-host', hostLibraryModulesSha256: shared.hostManifestSha, modules: [], publicNames: {} };
  const files = {};
  const targets = new Set();
  for (const [file, spec] of Object.entries(chunks)) {
    if (!needed.has(file)) { if (spec.implicit) continue; throw Error(`on the allow-list but not reached: ${file}`); }
    if (targets.has(spec.target)) throw Error(`duplicate target ${spec.target}`);
    targets.add(spec.target);
    const src = await readSource(file, cache);
    const set = needed.get(file);
    for (const [local, features] of Object.entries(spec.features ?? {})) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`${spec.target}: root ${local} is not a declaration of ${file}`);
      assertFeatures(`${spec.target}: root ${local}`, await featureText(src, entry), features, sliceText(src, entry));
    }
    for (const [feature, count] of spec.raw ?? []) {
      const found = src.code.split(feature).length - 1;
      if (found !== count) throw Error(`${file}: ${JSON.stringify(feature)} occurs ${found} times, expected ${count}`);
    }
    const units = [];
    for (const local of set) {
      const entry = src.top.get(local);
      if (entry.kind !== 'import' && !resolved.get(file).has(local)) units.push({ local, entry, start: entry.node.start });
    }
    for (const stmt of kept.get(file) ?? []) units.push({ statement: true, entry: stmt, start: stmt.node.start });
    units.sort((a, b) => a.start - b.start);
    const blocks = units.map(u => {
      let text = emittedText(src, u.entry);
      const rewrites = u.local && dynamic.get(`${file}#${u.local}`);
      if (rewrites) for (const [from, to] of Object.entries(rewrites)) text = text.split(`import("./${from}")`).join(`import(${JSON.stringify(to)})`);
      return text;
    });
    const groups = new Map();
    for (const [local, r] of resolved.get(file)) {
      if (!set.has(local)) continue;
      if (!groups.has(r.from)) groups.set(r.from, []);
      groups.get(r.from).push(r.name === local ? local : `${r.name} as ${local}`);
    }
    const importText = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportMap = new Map(exportsNeeded.get(file) ?? []);
    for (const [local, name] of Object.entries(spec.roots ?? {})) {
      if (exportMap.has(name) && exportMap.get(name) !== local) throw Error(`${spec.target}: export ${name} is taken`);
      exportMap.set(name, local);
      manifest.publicNames[name] = { module: spec.target, file, local };
    }
    for (const [name, local] of exportMap) if (!set.has(local)) throw Error(`${spec.target}: export ${name} (${local}) is not kept`);
    if (STATELESS_CHUNKS.includes(file)) {
      if ((kept.get(file) ?? new Set()).size) throw Error(`${spec.target}: a stateless chunk keeps a top-level statement`);
      for (const u of units) {
        const ok = u.entry.kind === 'function' || (u.entry.kind === 'var' && ['RegExpLiteral', 'StringLiteral', 'NumericLiteral', 'BigIntLiteral', 'BooleanLiteral'].includes(u.entry.node.init?.type));
        if (!ok) throw Error(`${spec.target}: ${u.local} of the stateless chunk ${file} is not a function or a literal`);
      }
    }
    const exportText = exportMap.size
      ? `export { ${[...exportMap].sort(([a], [b]) => a.localeCompare(b)).map(([name, local]) => (name === local ? local : `${local} as ${name}`)).join(', ')} };`
      : '';
    const header = `// Original Claude Desktop ${referenceVersion} code from ${file}; generated by extract-mcp-app-card.mjs.\n// Edit the extractor or src/source-mcp-app-card-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const unbound = programGlobals(text, spec.target).filter(name => !allowedGlobals.has(name));
    if (unbound.length) {
      const readers = units.filter(u => u.local && programGlobals(emittedText(src, u.entry).replace(/^(let|const) /, 'var '), u.local).some(n => unbound.includes(n))).map(u => `${u.local} [${chainOf(`${file}#${u.local}`)}]`);
      throw Error(`${spec.target}: unbound ${unbound.join(', ')} (read by ${readers.join(', ')})`);
    }
    files[spec.target] = text;
    const bindings = units.filter(u => u.local);
    manifest.modules.push({
      target: spec.target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      statements: units.length,
      bindings: bindings.map(u => ({ name: u.local, sha256: sha(sliceText(src, u.entry)),
        ...(shared.hostInternal.has(`${file}#${u.local}`) && !HOST_DUPLICATES[`${file}#${u.local}`]
          ? (() => { throw Error(`${spec.target}: ${u.local} is also sliced by mcp-app-host/${shared.hostInternal.get(`${file}#${u.local}`)} (not a listed stateless duplicate)`); })() : {}),
        ...(shared.hostInternal.has(`${file}#${u.local}`) ? { alsoInMcpAppHost: shared.hostInternal.get(`${file}#${u.local}`) } : {}) })),
      sideEffects: units.filter(u => u.statement).map(u => ({ at: u.start, sha256: sha(src.code.slice(u.entry.node.start, u.entry.node.end)) })),
      droppedBareImports: src.bareImports,
      imports: [...resolved.get(file)].filter(([local]) => set.has(local))
        .map(([local, r]) => ({ local, from: r.from, name: r.name, via: r.via, kind: r.kind, ...(r.original ? { original: r.original } : {}) })),
      dynamicImports: [...dynamic].filter(([key]) => key.startsWith(`${file}#`)).map(([key, rewrites]) => ({ binding: key.split('#')[1], rewrites })),
      exports: Object.fromEntries([...exportMap].sort(([a], [b]) => a.localeCompare(b))),
      features: spec.features ?? {}, raw: spec.raw ?? [], localCuts: spec.localCuts ?? {},
    });
  }
  manifest.modules.sort((a, b) => a.target.localeCompare(b.target));
  // E42: a plain-node module's generated import closure stays inside this library (no view-tabs, adapters, host library).
  for (const target of PLAIN_NODE_TARGETS) {
    const seen = new Set(), stack = [target];
    while (stack.length) {
      const t = stack.pop();
      if (seen.has(t)) continue;
      seen.add(t);
      if (!files[t]) throw Error(`plain-node ${target}: ${t} is not a module of this library`);
      for (const node of parsers.babel.parse(files[t], {}).program.body) {
        if (!node.source) continue;
        const from = node.source.value;
        if (from === 'react') continue; // a package plain node resolves (createContext only, no renderer)
        // W13 G11: routines-shared's shared-0 has no imports at all, so plain node loads it (E42 holds).
        if (from === '../routines-shared/shared-0-DDOOdL6P.mjs') {
          const held = await fs.readFile(path.join(root, 'src/generated/routines-shared/shared-0-DDOOdL6P.mjs'), 'utf8');
          if (parsers.babel.parse(held, {}).program.body.some(n => n.source)) throw Error(`plain-node ${target}: ${from} is no longer import-free`);
          continue;
        }
        if (!/^\.\/[^/]+\.mjs$/.test(from)) throw Error(`plain-node ${target}: ${t} imports ${from}`);
        stack.push(from.slice(2));
      }
    }
  }
  manifest.callSites = [];
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features, sliceText(src, entry));
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sha256: sha(sliceText(src, entry)), features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`MCP App card output set changed: ${present.join(',')}. Run scripts/extract-mcp-app-card.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`MCP App card source mismatch: ${name}. Run scripts/extract-mcp-app-card.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.statements, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} MCP App card modules (${count} original ${referenceVersion} statements).`);
  return manifest;
}

// Chunks the closure may enter beyond the named ones above (each becomes a module named after the chunk). Entering any
// other chunk fails generation.
const ALLOWED_CLOSURE_CHUNKS = [
  'cef1e6037-C9OZ_iaL.js', 'c7407a74b-C6T6reA_.js', 'shared-10-D6FXWZph.js', 'c9d6d9802-BXTz_Gob.js', 'shared-26-CGuBxVt9.js', 'cc0e3547f-Bla_O6hq.js',
  'c03935b01-yhcY34vt.js', 'c19e90103-BQFzF8EA.js', 'shared-8-Db1QN4mf.js', 'shared-0-DDOOdL6P.js', 'ccef66963-DKybPjBo.js', 'c4acc1503-CtuKkx7L.js',
  'c16f659b9-Lmh4bP4f.js', 'c91e0ef26-DQDo_PAG.js', 'c0fbbe82d-COsmfHJY.js', 'c425fb3cf-B-SGR6Na.js', 'cf53e1812-CX9VqRuk.js', 'shared-1-BJhqMmkf.js',
  'c81ea1931-ChuE7vym.js', 'c87a7a2df-BjGrnhdM.js', 'cfdfec14c-C31l4QmB.js', 'c227f4d5e-B-FYKrwT.js', 'c8f38bf1f-Ba2QaQov.js', 'shared-182-BI1KJccu.js',
  'shared-104-CTONUSaz.js', 'vendor-intl-DYfox5Co.js', 'shared-25-DOWZRSlq.js', 'shared-19-DIKJVT7c.js', 'c531c760b-B_u8xPdC.js', 'shared-7-DBAgAi5H.js',
  'shared-52-uHFNjl7C.js', 'c4a9ee384-RLCjceOL.js', 'c4a70913c-BfrWompY.js', 'vendor-all-0-DXM0MGjZ.js', 'c0532af3d-CvAg_NYA.js', 'shared-4-DUB1Oi0O.js',
  'shared-frame-6jtSkIit.js', 'shared-46-BIbZBGFq.js', 'shared-5-Bg6ZMqvt.js', 'cced621b6-BqCKLL3Y.js', 'c68c4283d-CWbOoVxS.js', 'c26909c77-TCen2GL0.js',
  'c9081d688-d6gSB2Ai.js', 'shared-11-_AVGLHEz.js', 'shared-9-CM21XrJw.js', 'shared-6-sd9jbJqs.js',
];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractMcpAppCard({ check: process.argv.includes('--check') });
