// R4g-mcp MA-6: the 2.42304.0 transcript MCP App / Visualize widget card, extracted without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/mcp-app-card, own scripts/verify-gen-mcp-app-card.mjs).
//
//   tool-card.mjs   c96d752d0 VX = memo(kQe) and PQe: the transcript card of an MCP tool whose server gives it a ui://
//                   resource. kQe matches the tool to its server (built-in visualize, the session's own servers,
//                   connectors), works out why the widget would not render (YZe: gate_off / server_unknown / unverified /
//                   connector_rows_from_elsewhere / local_client_missing / remote_client_missing / sandbox_url_missing /
//                   conversation_hash_pending / init_error / host_chunk_failed / host_chunk_not_resident / pending_approval /
//                   result_payload_missing / call_not_run) and falls back to the plain tool row when it would not; it
//                   computes the conversation hash (cbc7fd025 x), remembers the row's open state ("mcpApp:<id>") and
//                   mounts PQe. PQe is the card: the status title (visualize: "Making a visual" / "Made a visual" /
//                   "Failed to make a visual" / "Visual from Claude"; other servers: "Widget from {server}", "Widget from
//                   this session's server: {server}", "Widget from a server on {host}: {server}"), the hostContext
//                   (_hostStrings, availableDisplayModes, _hostCopiesText, _hostHandlesNotSent, the style variables with the
//                   host text sizes and fonts, _centerContent, _scrollWide, _keepMenuClear), the remembered height, the
//                   ui/message, ui/open-link (https only, link policy, the desktop link check, the "Open link?" dialog),
//                   ui/download-file, copy-image and copy-text handlers, the side-pane and fullscreen guards, and the lazy
//                   AppRenderer (DX: the "epitaxy_mcp_app_host" chunk, here src/generated/mcp-app-host/app-renderer.mjs).
//   …               and the closure those read from the other chunks (one module per chunk, see `chunks`).
//
// Every emitted statement is an original top-level statement of the installed chunk; a module's statements are the
// reachable closure of its roots across chunks (each declaration parsed on its own with Babel's scope analysis). Generated
// modules import each other by the original export aliases. A binding resolves, in this order, to: a named host adapter
// in src/source-mcp-app-card-adapters.jsx (its original declaration must carry `features`), a verified React export of
// vendor-frame, a module of the MA-5 MCP App host library (src/generated/mcp-app-host, by chunk and original local, so the
// card and the renderer share one AppRenderer, one resource cache and one gate reading), a semantic public name of the
// shared view-tabs graph (D1/D24), or a chunk on the allow-list below. Anything else fails generation.
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
const output = path.join(root, 'src/generated/mcp-app-card');
const hostLibrary = path.join(root, 'src/generated/mcp-app-host');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-mcp-app-card-adapters.jsx';
const HOST_CHUNK = 'c96d752d0-BOCqU7c2.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    yo: ['react', 'useLayoutEffect'], oo: ['react', 'memo'], Ba: ['react', 'Fragment'], Ja: ['react', 'Fragment'], eo: ['react', 'createContext'],
    do: ['react', 'useContext'], go: ['react', 'useId'], ro: ['react', 'forwardRef'], wo: ['react', 'useSyncExternalStore'], ho: ['react', 'useEffectEvent'],
    to: ['react', 'createElement'], io: ['react', 'isValidElement'], so: ['react', 'default'], Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
    Sa: ['react-dom', 'createPortal'],
  },
};

// The chunks the closure may enter, each with its generated module. `roots` maps an original local to its semantic export
// name; `features` pins a root to strings of its prettier text; `raw` pins strings of the minified bytes with their exact
// occurrence count. `localCuts` replace a top-level declaration of the chunk with a host adapter (the original text is
// pinned with `features`); `dynamicImports` re-point a pinned dynamic import at another generated library.
const chunks = {
  [HOST_CHUNK]: { target: 'tool-card.mjs',
    roots: { VX: 'McpAppToolCard', kQe: 'McpAppToolCardBody', PQe: 'McpAppWidgetCard', YZe: 'mcpAppSkipReason', xQe: 'SKIP_REASON_OUTCOME',
      JZe: 'useHostFontVariables', jX: 'isVisualizeMatch', kX: 'stripToolServerPrefix', hQe: 'visualizeStatus', gQe: 'visualizeStatusLabel',
      MX: 'truncateMiddle', AX: 'messageTextForComposer', fQe: 'rememberedWidgetHeight', xX: 'COLLAPSED_WIDGET_HEIGHT', XZe: 'NO_SAFE_AREA_INSETS',
      ZZe: 'INLINE_DISPLAY_MODES', QZe: 'PANE_DISPLAY_MODES', DX: 'appRendererChunk', pQe: 'LazyAppRenderer', eQe: 'AUTO_PANE_GATE', nQe: 'SERVER_HEADER_GATE' },
    features: {
      kQe: ['"[Epitaxy MCP App] conversation hash failed; widget disabled",', 'headerlessUnverified: _ && !jX(T, e.name),', '[K, ae] = nS(`mcpApp:${e.id}`),',
        'ue = v && !!E && !B && !!te && !ce && !le,', 'return c ?? b(Uz, { tool: e });', 'conversationHash: ie ?? void 0,', 'hostResident: de === "resident",',
        'onToggleExpanded: () => ae(!q),'],
      PQe: ['...(K && { _keepMenuClear: it }),', '...(K && { _hostHandlesNotSent: !0 }),', 'availableDisplayModes: ze === null ? ZZe : QZe,',
        'variables: { ...(tt.styles?.variables ?? fCe), ...nt },', '"data-mcp-app-card": "",', 'retrySandboxSetupAfterLoadMs: V ? mee : 0,',
        'defaultMessage: "Widget from {server}", id: "FhYnU4Hl8w"', 'defaultMessage: "Widget from a server on {host}: {server}",', 'id: "g+nyx1GzSt",',
        'defaultMessage: "A server on {host}: {server}",', 'id: "Ez4vnGyxQa",', 'defaultMessage: "Rendering widget",', 'defaultMessage: "Showing in another pane",',
        'defaultMessage: "Show here",', 'defaultMessage: "Show more",', 'onmessage: i && K ? cn : r ? tn : void 0,', 'ondownloadfile: K ? vn : void 0,',
        'onDisplayModeChange: ze === null ? void 0 : Jn,', 'onCopyImage: K ? xn : void 0,', 'if (r !== "https:" && !fpe(e))',
        '"[Epitaxy MCP App] ui/message without iframe-originated user activation blocked",', 'Ot = yi(oe(nQe, !K)) && !K && !g,',
        'let t = Number.isFinite(e) && e > 8;', 'let t = Math.min(e, xw);'],
      YZe: ['? "unverified"', '"connector_rows_from_elsewhere"', '? "conversation_hash_pending"', '? "host_chunk_failed"', '"host_chunk_not_resident"',
        '? "pending_approval"', '? "result_payload_missing"', '? "call_not_run"', ': "sandbox_url_missing"', '? "local_client_missing"',
        ': "remote_client_missing"', ': "server_unknown"', ': "gate_off";'],
      JZe: ['t = Wu((e) => dI[e.chatTextSize]),', 'r = lTe(qZe[n - 1]),', 'i = Um("font-sans"),', '...uX("--font-mono", a)'],
      jX: ['return e?.server.isBuiltIn === !0 && rr(t);'],
      hQe: ['? "settled"', '? "failed"', '? "making"', '? "made"'],
      gQe: ['return e.formatMessage(Ay.making);', 'return e.formatMessage(Ay.made);', 'return e.formatMessage(Ay.failed);'],
      AX: ['n = ule(Lee(t)).text;', 'if (aye(n)) return null;', 'let r = oae(Yc(n));'],
      fQe: ['return Number.isFinite(t) && t > 8 ? Math.min(t, xw) : 0;'],
      xX: ['xX = 280'], ZZe: ['ZZe = ["inline"]'], QZe: ['QZe = ["inline", "fullscreen"]'], XZe: ['XZe = { top: 0, right: 0, bottom: 0, left: 0 }'],
      eQe: ['eQe = "__gb__2398473450"'], nQe: ['nQe = "__gb__3106245306"'],
      DX: ['id: "epitaxy_mcp_app_host",', 'tier: "T1",', 'pick: (e) => e.AppRenderer,', 'ssr: !1,', 'loading: Do("placeholder-would-mislead"),', 'onChunkError: "fail-open",'],
      VX: ['VX = M(kQe)'],
    },
    raw: [['[Epitaxy MCP App] conversation hash failed; widget disabled', 1], ['function PQe(', 1], ['_keepMenuClear:', 1], ['"data-mcp-app-card"', 1],
      ['retrySandboxSetupAfterLoadMs:', 1], ['Widget from {server}', 1], ['Widget from a server on {host}: {server}', 1], ['A server on {host}: {server}', 1],
      ['Rendering widget', 1], ['Showing in another pane', 1], ['id:"epitaxy_mcp_app_host"', 1], ['eQe="__gb__2398473450"', 1], ['nQe="__gb__3106245306"', 1],
      ['NQe="mcp_apps_telemetry_config"', 1]],
    // Uz: the plain tool row kQe falls back to when no `fallback` is passed (the transcript always passes the host's own row,
    // MA-7). zZe / BZe: the server header of a non-visualize card, drawn only while __gb__3106245306 (nQe) is on.
    localCuts: {
      Uz: { name: 'ToolRowFallback', features: ['(e) => e.epitaxyEngineToolRow,'] },
      zZe: { name: 'GatedServerToolLabel', features: ['b($Y, { server: e, size: 16 }),'] },
      BZe: { name: 'GatedServerHeaderRow', features: ['b(LZe, { server: e, toolName: t, manageable: i }),'] },
    },
    dynamicImports: { DX: { 'cd9b7fccf-C8-F2T2b.js': '../mcp-app-host/app-renderer.mjs' } } },
  // The visualize status messages (Ay).
  'c52b02f3f-DUwt0Dsx.js': { target: 'visual-messages.mjs', roots: { R: 'VISUAL_MESSAGES' },
    features: { R: ['defaultMessage: "Making a visual"', 'defaultMessage: "Made a visual"', 'defaultMessage: "Failed to make a visual"', 'defaultMessage: "Visual from Claude"'] },
    raw: [['defaultMessage:"Visual from Claude"', 1]] },
  // D: the anchor download the save hook falls back to (the host's save path, see useSaveFile).
  'cc61d0d63-DhbBdZx8.js': { target: 'file-save.mjs', roots: { D: 'downloadBlob' },
    features: { D: ['(a.download = t),', 'a.click(),', 'setTimeout(() => URL.revokeObjectURL(i), E));'] } },
  // Ya: the owner window of the surface (the popout's window, else the main one).
  'shared-frame-BfjMqbuN.js': { target: 'shared-frame.mjs', roots: { Ya: 'useOwnerWindow' }, features: { Ya: ['return Ji(W(Oa));'] } },
  // q_ (nf): the visualize tool-name prefixes (visualize:, mcp__visualize__, the built-in server uuid, local / internal).
  'shared-156-Bikz018e.js': { target: 'tool-names.mjs', roots: { q_: 'isVisualizeToolName' },
    features: { q_: ['e.startsWith("visualize:")', 'e.startsWith("mcp__visualize__")', 'e.startsWith("mcp__6f616b42-0ed8-571e-823f-ee4aca6b7ce9__")'] },
    raw: [['e.startsWith("mcp__visualize__")', 1]] },
};

// Host dependencies (checked first), by chunk and export alias. `local` is the declaration the alias must still name;
// `features` must appear in its prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  'shared-78-D6VXYXaQ.js': {
    // oH: the renderer's epitaxyMcpApps switch (window.desktopBootFeatures, else GrowthBook). The main process answers it
    // statically supported (gW epitaxyMcpApps:fW), and D35 turns MCP Apps on in the host.
    Ko: { name: 'useMcpAppsEnabled', local: 'oH', features: ['r = e?.epitaxyMcpApps;', 'r.status === "supported"'] },
    // bJ: whether the page is the Claude Code route (telemetry product surface only). The card lives in Code.
    gr: { name: 'useInCodeRoute', local: 'bJ', features: ['return e ? e.isCCDRoute : t;'] },
    // sH: epitaxyMcpAppPane (main process GrowthBook 513873720); the host keeps the side pane off (D29/D31), ze === null.
    Go: { name: 'useMcpAppPaneSupported', local: 'sH', features: ['epitaxyMcpAppPane?.status === "supported"'] },
    // Wk: the prefersBorder of a resource already in shared-78's resource cache Vk. MA-5 keeps Vk inside its
    // sandbox-frame module without exporting it, so the card starts from undefined and takes the value from
    // onresourcemeta once the resource is read (the original does the same for an uncached resource).
    Kp: { name: 'cachedResourceMeta', local: 'Wk', features: ['return Vk.get(Uk(t, e))?.meta;'] },
  },
  'shared-0-ByI5P0CP.js': {
    // zJ: the configuration context; the card reads mcpAppsSandboxProxyUrl (shared-23: the remote
    // https://sandbox.claudemcpcontent.com/mcp_apps). The host's sandbox is the local oc-mcp-sandbox: scheme (MA-3, X1 G1).
    Rt: { name: 'useHostConfiguration', local: 'zJ', features: ['"useConfiguration must be called from within ConfigurationProvider"'] },
  },
  // X: the tool permission request store (requestsBySession); the card waits while a matching request is pending.
  'shared-11-BuQ3CK5I.js': { Wn: { name: 'toolApprovalStore', local: 'X', features: ['requestsBySession: {},', 'approvedPlans: {},'] } },
  'cef1e6037-8DivyY4m.js': {
    // Vt: the session's MCP server state (the store slice the matchers read).
    P: { name: 'useSessionMcpState', local: 'Vt', features: ['return n(() => (r ? te(t, r) : t), [t, r]);'] },
    // Ot: whether an SSH session holds the server and the SSH host label. The host has no SSH sessions (D37).
    F: { name: 'useSshServerHold', local: 'Ot', features: ['{ held: a || o === "", sshHost: o || void 0 }'] },
    // kt: whether a claude.ai connector's rows come from this client. The host has no claude.ai connectors (D17).
    j: { name: 'useConnectorRowsHere', local: 'kt', features: ['At(e?.type, i)'] },
    // Ft: the proxied copy of a connector call run elsewhere (claude.ai connectors only, D17).
    L: { name: 'useProxiedConnectorCall', local: 'Ft', features: ['wanted: n'] },
    // _t: the session's local MCP client for a server segment. Here: the host bridge client (MA-4 mcp-app:* actions).
    M: { name: 'useSessionMcpClient', local: '_t', features: ['sessionOwned: n = !1'] },
    // Bt: the Claude Code CLI MCP servers of a session (findServerTool, gated off by __gb__585138862).
    I: { name: 'useSessionCliMcpServers', local: 'Bt', features: ['t.bySession[e]'] },
    // yt: whether a session is held by the CLI bridge (P). The host has no such sessions.
    k: { name: 'isBridgeHeldSession', local: 'yt', features: ['return P.has(e);'] },
  },
  'shared-156-Bikz018e.js': {
    // $b / Vb / X / Ky / Cb / Jg: the desktop MCP coordinator (servers, tools, clients, remote connections). The host's
    // servers are the built-in visualize server and the session's own servers (MA-4 listing).
    Dd: { name: 'matchSessionMcpTool', local: '$b', features: ['return r?.toolsEnumerated === !1 && n !== "forLabel" ? void 0 : r;'] },
    tf: { name: 'isSessionOwnedServer', local: 'Vb', features: ['return Rb.get(e)?.has(t) === !0;'] },
    op: { name: 'mcpClientsStore', local: 'X', features: ['...na(...e), ...L_(...e)'] },
    Td: { name: 'connectRemoteMcpServer', local: 'Ky', features: ['waitWhileTurnedOff: n = !1'] },
    Hd: { name: 'isConnectorToolOfServer', local: 'Cb', features: ['e.startsWith(`mcp__${pb(t)}__`)'] },
    Sp: { name: 'RemoteMcpClient', local: 'Jg', features: ['this.getClient = e'] },
    // dB: a lazy chunk's load state for a handle ("resident" / "failed" / …), shared-104's lazy chunk machinery.
    Ir: { name: 'useLazyChunkState', local: 'dB', features: ['let r = n?.reportWait ?? !0,'] },
  },
  // dP: the server uuid of a tool that has a ui:// resource (undefined otherwise).
  'shared-1-CAAiD7E3.js': { ni: { name: 'findMcpAppToolServer', local: 'dP', features: ['i = r?.tool ? sa({ _meta: r.tool._meta }) : void 0;'] } },
  // h: a transcript row's remembered open state ([value, setter]), keyed "mcpApp:<id>" / "mcpAppFull:<id>".
  'cc6e9624e-Dw5fc5HL.js': { u: { name: 'useTranscriptRowExpanded', local: 'h', features: ['t.getState().setRowExpanded(e, n);'] } },
  'shared-104-Cqo2-vQh.js': {
    // Fo: the lazy chunk component factory (tiers, preload, chunk error policy). Here: React lazy over the same loader.
    fh: { name: 'defineLazyChunk', local: 'Fo', features: ['let t = Aa(e.entry),', 'e.options.suspense === !0 ? void 0 : e.options.loading,'] },
  },
  'shared-10-THQui8pC.js': {
    // Hr: the chunk's telemetry gate attributes (preload reason, stamp age).
    zi: { name: 'chunkGateAttributes', local: 'Hr', features: ['preload_reason:'] },
    // zr: the "tool_cell_mcp_app" recent-use stamp that warms the chunk on later launches.
    Bi: { name: 'mcpAppRecentUse', local: 'zr', features: ['zr = lt("tool_cell_mcp_app", Lr)'] },
  },
  'preload-helper-D0dM6GpB.js': { t: { name: 'preloadChunk', local: 's', features: ['"vite:preloadError"'] } },
  // c68c4283d: telemetry events. The host sends no telemetry (D17); the adapters record nothing.
  'c68c4283d-CPuRD0vx.js': {
    An: { name: 'logWidgetFallback', local: 'Ss', features: ['"claudeai.epitaxy.mcp_app.widget_fallback"'] },
    jn: { name: 'logWidgetMounted', local: 'Cs', features: ['"claudeai.epitaxy.mcp_app.widget_mounted"'] },
    Cd: { name: 'logSidePaneToggled', local: 'H', features: ['"claudeai.epitaxy.side_pane.toggled"'] },
    kn: { name: 'logQuestionForm', local: 'ws', features: ['"claudeai.epitaxy.mcp_app.question_form"'] },
    // ye: the renderer error report (Sentry / Datadog); here the console.
    t: { name: 'reportRendererError', local: 'ye', features: ['feature: "ccd",', 'source: t,'] },
    yd: { name: 'logSidePaneOpened', local: '_u', features: ['presentation: fe(e, r) ? "overlay" : "split",'] },
  },
  // Jv: the armed time of the session's pending turn (the side pane's auto-open bookkeeping).
  'c06cf64bb-BE5q2vSr.js': { mt: { name: 'pendingTurnArmedAt', local: 'Jv', features: ['t.pendingTurn?.armedAt ?? null'] } },
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
  },
  // We: turnStatusRows (GrowthBook __gb__2846116625, on in this host): the card's row is a CDS TurnStatus step (c734f318c).
  // The adapter re-exports the working line's generated We / jt.
  'c26fb8b6b-DfPeiuGP.js': { T: { name: 'useInsideStepList', local: 'We', features: ['return l(D) ?? !1;'] } },
  'shared-25-DP8p7i1Z.js': {
    // GrowthBook reads. The host has no GrowthBook (D29/D31): every gate is off.
    Th: { name: 'readGrowthBookGate', local: 'Zs', features: ['return Rs(I(e)).on;'] },
    Nh: { name: 'readGrowthBookFlag', local: 'ec', features: ['return !t || !n?.growthbook ? !1 : As(n, I(e)).on;'] },
  },
  // s: the approved frame domains of a remote server (mcp_apps_frame_domains, toolcards-12: not-applicable-host).
  'c9d6d9802-CEv9o01T.js': { t: { name: 'useApprovedFrameDomains', local: 's', features: ['t("mcp_apps_frame_domains")'] } },
  'c8e12f1a8-6AP_7dPS.js': {
    // De / ue / fe: the sign-in parking of a claude.ai connector's tools/call (onCallToolAuthRequired is passed only
    // for a RemoteMcpClient, which the host never has; D17).
    o: { name: 'useAppSignInParking', local: 'De', features: ['"Another request from this app is already waiting for you to sign in."'] },
    _: { name: 'AppSignInPrompt', local: 'ue', features: ['chromeClassName: "border-b-0.5 bg-surface-1 px-3 py-2",'] },
    v: { name: 'AppSignInOverlay', local: 'fe', features: ['"pointer-events-auto absolute inset-0 z-[5] bg-bg-100/60"'] },
    // The widget load timing telemetry (D17).
    l: { name: 'startWidgetLoadTiming', local: 've', features: ['startMs: performance.now(),'] },
    c: { name: 'endWidgetLoadTiming', local: 'Ee', features: ['t.isInstanceLive() ||'] },
    p: { name: 'markWidgetHandoff', local: 'Se', features: ['Y(e, t, "handoff");'] },
    m: { name: 'markWidgetResultClean', local: 'Ce', features: ['t.toolResultSettledClean = !0'] },
    d: { name: 'cancelWidgetLoadTiming', local: 'we', features: ['clearTimeout(t.deadlineTimer)'] },
    u: { name: 'markWidgetInitialized', local: 'ye', features: ['Y(e, t, "success")'] },
    f: { name: 'markWidgetLoadError', local: 'be', features: ['kind: "load_failure"'] },
  },
  // Ff: a dynamic config value (mcp_apps_telemetry_config: the load-timing deadline). Telemetry only (D17).
  'shared-52-DGviI8xb.js': { zp: { name: 'useDynamicConfig', local: 'Ff', features: ['return x(() => O(t, n), [t, n]);'] } },
  // The session pane store (side panes, tiles). The host's MCP App side pane is off (sH), so no pane store exists here.
  'c03935b01-CyJKQj4N.js': {
    st: { name: 'useMainPaneHost', local: 'bc', features: ['e.host.kind === "main"'] },
    mt: { name: 'usePaneStoreContext', local: '_c', features: ['return f(Z);'] },
    pt: { name: 'usePaneStore', local: 'Q', features: ['return Ye(t ?? fc, e);'] },
  },
  // m: the portal host element of the side pane (null when the pane is off).
  'c87a7a2df-DdjUUMHE.js': { i: { name: 'useSidePanePortalHost', local: 'm', features: ['e.className = "h-full w-full"'] } },
  // Q (Wd): the sessions store (child sessions of the pending-question bookkeeping, side pane only).
  'shared-8-B5lJ8U5C.js': { Wd: { name: 'sessionsStore', local: 'Q', features: ['name: "ccd-sessions-filter",'] } },
  // m: open a link in the session's preview pane when it can (else the caller's window.open). The host opens the
  // confirmed link through its external-link action; its window.open is denied (main.cjs setWindowOpenHandler).
  'cc6e65d4b-CKlso-Pn.js': { r: { name: 'useOpenConfirmedLink', local: 'm', features: ['setPendingPreviewLinkUrl(e, { explicit: !0 })'] } },
  // ux: the pending AskUserQuestion prompts (side pane guards only).
  'c5da7eb42-B8cTG8SI.js': { Hn: { name: 'questionPromptsStore', local: 'ux', features: ['promptsBySession: {},'] } },
  // Wt: whether an auto-opened side pane is armed for this call (side pane only).
  'cd4f82e77-BZMvPH7p.js': { v: { name: 'useSidePaneAutoOpen', local: 'Wt', features: ['let i = r && e !== void 0 && t !== void 0 ? e : null,'] } },
  'c227f4d5e-Ba-r--Rl.js': {
    // jT: keep a split layout when the pane is collapsed (side pane only).
    fc: { name: 'keepSplitForTile', local: 'jT', features: ['n?.tileId === t && (n.keepSplit = !0);'] },
  },
  // QN: the composer's send-text cleaner, gated by __gb__3182548365 (off in the host: the text is sent as written).
  'shared-3-DnHYUZdJ.js': { Ss: { name: 'cleanSendText', local: 'QN', features: ['return zN() ? t(e) : { text: e, removedCount: 0 };'], also: { LN: ['LN = "__gb__3182548365"'] } } },
  // M: whether a tile can be expanded (side pane only).
  'ca5db7aaf-DNznjmvJ.js': { u: { name: 'canExpandTile', local: 'M', features: ['e.hasSidePanes &&'] } },
  // jt: the step list (Step / Phrases); used only inside a step list (We).
  'c734f318c-BRH2gAJZ.js': { t: { name: 'StepList', local: 'jt', features: ['jt = Object.assign(At, { Step: St, Phrases: ut })'] } },
  // L: the appearance settings store; the card reads chatTextSize (s / m / l, default "m"). The host has no chat text
  // size preference, so it answers the default.
  'shared-14-u0TSV9dR.js': { et: { name: 'appearanceSettingsStore', local: 'L', features: ['chatTextSize: N(I.chatTextSize) ? I.chatTextSize : Fe,'], also: { Fe: ['Fe = "m"'] } } },
  // st: the file save hook (download_sign content signing when GrowthBook turns it on and an organization is
  // active; otherwise the plain anchor download D). The host has neither: the gate-off branch, D with the owner window.
  'cc61d0d63-DhbBdZx8.js': { i: { name: 'useSaveFile', local: 'st', features: ['if (t === "off" || !r || !i || !ee) {', 'D(u, l, s);'] } },
  // f: the resolved font stack of a theme token (font-sans / font-mono).
  'c8748971a-B4mdzZFm.js': { t: { name: 'useResolvedFontToken', local: 'f', features: ['if (o === "font-sans" || o === "font-sans-display") {'] } },
};

// Original text the transcript mount (MA-7) follows but cannot import (prettier form of the named declaration).
const callSites = [
  { source: HOST_CHUNK, binding: 'KBe', role: 'Transcript row kinds: a tool the session marks as an MCP App tool is its own "mcp_app" row, not a tool group member',
    features: ['t.isMcpAppTool?.(e.name)', '? "mcp_app"'] },
  { source: HOST_CHUNK, binding: 'm2e', role: 'Solo tool row: in an owned session an MCP App tool is VX (no fallback; VX falls back to Uz)',
    features: ['if (a && r?.(e.tools[0].name))', 'return b(VX, { tool: e.tools[0], sessionRef: t, onPrefillComposer: n });'] },
  { source: HOST_CHUNK, binding: 'e0', role: 'Grouped tool row: the same VX with the group row as fallback',
    features: ['o && r?.(d.name)', '? b(VX, { tool: d, sessionRef: i, onPrefillComposer: a, fallback: _ })'] },
  { source: HOST_CHUNK, binding: 'UQe', role: 'Channel visualize widget (Cowork / channels, not the Code transcript): VX with sharesWithSession false and the channel props',
    features: ['"data-testid": "channel-widget-visualize",', 'sharesWithSession: !1,'] },
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
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !text.includes(f) && !flat.includes(normalised(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
function vendorImport(file, alias, src) {
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  const member = target[1] === 'default' ? '[\\w$]+' : target[1];
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${member}\\b`).test(src.code) && !(target[1] === 'default' && new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.default\\b`).test(src.code)))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
// Every global the emitted originals read. A new one fails generation so it is reviewed.
const allowedGlobals = new Set([
  'Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'DOMException', 'Proxy', 'ArrayBuffer', 'DataView', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
  'RegExp', 'Date', 'Intl', 'Reflect', 'BigInt', 'Function', 'Uint8Array', 'globalThis', 'decodeURIComponent', 'encodeURIComponent', 'decodeURI', 'encodeURI', 'TextDecoder', 'console', 'localStorage', 'sessionStorage', 'Element', 'HTMLElement', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'getComputedStyle',
  'window', 'document', 'navigator', 'performance', 'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'AbortController', 'setTimeout', 'clearTimeout', 'atob',
  'Node', 'Infinity', 'NaN', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'location', 'Blob', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
]);

// The libraries the card shares with other generators, by (chunk, original local) -> {module, export name}.
async function sharedLibraries() {
  const byLocal = new Map();
  const host = JSON.parse(await fs.readFile(path.join(hostLibrary, 'manifest.json'), 'utf8'));
  if (host.referenceVersion !== referenceVersion) throw Error(`mcp-app-host is ${host.referenceVersion}, expected ${referenceVersion}`);
  const hostInternal = new Map();
  for (const m of host.modules) {
    for (const [name, local] of Object.entries(m.exports)) {
      const key = `${m.source}#${local}`;
      if (!byLocal.has(key)) byLocal.set(key, { from: `../mcp-app-host/${m.target}`, name, kind: 'mcp-app-host', original: local });
    }
    for (const b of m.bindings) hostInternal.set(`${m.source}#${b.name}`, m.target);
  }
  const tabs = JSON.parse(await fs.readFile(path.join(viewTabs, 'manifest.json'), 'utf8'));
  if (tabs.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${tabs.referenceVersion}, expected ${referenceVersion}`);
  for (const [name, entry] of Object.entries(tabs.publicNames ?? {})) {
    const key = `${entry.file}#${entry.local}`;
    if (!byLocal.has(key)) byLocal.set(key, { from: `../view-tabs/${entry.file}`, name, kind: 'view-tabs', original: entry.local });
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
  const chainOf = key => { const out = []; for (let k = key; k && out.length < 40; k = reachedFrom.get(k)) out.push(k.replace(/-[A-Za-z0-9_-]+\.js#/, '#')); return out.join(' <- '); };
  const need = (file, local, from) => queue.push({ file, local, from });
  const markExport = (file, local, alias) => {
    if (!exportsNeeded.has(file)) exportsNeeded.set(file, new Map());
    exportsNeeded.get(file).set(alias, local);
  };
  const allowed = new Set(['c96d752d0-BOCqU7c2.js', ...Object.keys(chunks), ...ALLOWED_CLOSURE_CHUNKS]);
  for (const [file, spec] of Object.entries(chunks)) for (const local of Object.keys(spec.roots ?? {})) need(file, local, 'root');
  const ensure = file => { if (!needed.has(file)) { needed.set(file, new Set()); resolved.set(file, new Map()); } };
  const drain = async () => {
    while (queue.length) {
      const { file, local, from } = queue.shift();
      if (!allowed.has(file)) throw Error(`${from}: ${file} is not on the allow-list (needs ${local})`);
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
        assertFeatures(`local cut ${file}#${local}`, await featureText(src, entry), cut.features);
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
          assertFeatures(`adapter ${via} (${depLocal})`, await featureText(dep, original), adapter.features);
          for (const [other, features] of Object.entries(adapter.also ?? {})) {
            const also = dep.top.get(other);
            if (!also || also.kind === 'import') throw Error(`adapter ${via} pins ${other}, which is not a declaration of ${entry.file}`);
            assertFeatures(`adapter ${via} (${other})`, await featureText(dep, also), features);
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
        if (!rewrites) throw Error(`${file}: dynamic import inside ${local}`);
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
      assertFeatures(`${spec.target}: root ${local}`, await featureText(src, entry), features);
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
  manifest.callSites = [];
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}:${site.binding} is not a declaration`);
    assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features);
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
  'shared-78-D6VXYXaQ.js', 'shared-0-ByI5P0CP.js', 'cef1e6037-8DivyY4m.js', 'shared-1-CAAiD7E3.js', 'c7407a74b-CeQLL5tW.js', 'c9081d688-Blaoes4B.js', 'c26909c77-D7pbz1nX.js', 'shared-4-CJsHhp5n.js', 'shared-5-kdJVRUsT.js', 'vendor-all-0-CTKbbUUg.js',
  'shared-26-CgdP_nTj.js', 'shared-104-Cqo2-vQh.js', 'shared-10-THQui8pC.js', 'shared-25-DP8p7i1Z.js', 'c8e12f1a8-6AP_7dPS.js', 'shared-28-DcgD7xXH.js',
  'shared-52-DGviI8xb.js', 'c03935b01-CyJKQj4N.js', 'c87a7a2df-DdjUUMHE.js', 'c19e90103-muBq-gyt.js', 'shared-8-B5lJ8U5C.js', 'shared-frame-BfjMqbuN.js',
  'c0532af3d-CvAg_NYA.js', 'cc61d0d63-DhbBdZx8.js', 'ccef66963-DLJuiL6B.js', 'c4acc1503-B_cdqucS.js', 'c16f659b9-Lmh4bP4f.js', 'c425fb3cf-CEgSkv8l.js', 'cf53e1812-CivLPgES.js', 'c227f4d5e-Ba-r--Rl.js',
  'c81ea1931-ChuE7vym.js', 'cfdfec14c-3LbBfVtj.js', 'shared-7-B8UIMGDr.js', 'c8f38bf1f-D_EZalnr.js', 'shared-182-eT1kXtya.js', 'c4a9ee384-ZZIKqgNM.js',
  'c4a70913c-C9EYof6i.js', 'shared-19-CkPOiIKm.js', 'shared-11-BuQ3CK5I.js', 'vendor-intl-Db7hDWRO.js', 'shared-14-u0TSV9dR.js',
];
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractMcpAppCard({ check: process.argv.includes('--check') });
