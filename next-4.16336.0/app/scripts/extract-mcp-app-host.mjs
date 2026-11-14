// R4g-mcp MA-5: the renderer half of the 3.6556.2 MCP Apps host, extracted without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/mcp-app-host, own scripts/verify-gen-mcp-app-host.mjs;
// 3.6556.2 migration w2-mcp-host, research/menus-dialogs-settings.md §2.1 / §4.3).
//
//   app-renderer.mjs    cd9b7fccf (whole chunk, lazy entry "epitaxy_mcp_app_host"): AppRenderer w — reads the ui://
//                       resource, builds the sandbox URL (conversation origin, connect-src / resource-src / frame-src /
//                       dev), creates the outer frame, waits for sandbox-proxy-ready, connects an AppBridge over the
//                       postMessage transport Te, sends sandbox-resource-ready {html, csp, permissions}, then tool-input /
//                       tool-result / host-context-changed, and answers size-changed, ui/message, ui/open-link,
//                       ui/download-file, ui/request-display-mode, tools/call and anthropic/set-view-state.
//   app-bridge.mjs      c131c9a32 (whole chunk, byte-identical to 2.42304.0): @modelcontextprotocol/ext-apps' AppBridge Q,
//                       LATEST_PROTOCOL_VERSION x ("2026-01-26"), the ui/* method names and every McpUi* zod schema.
//   mcp-protocol.mjs    c2a6d07ee C5ZtQVF4 / mcp-types.mjs c28eafaad / json-schema.mjs c4e4fae95 / zod.mjs vendor-zod: the
//                       MCP SDK the bridge is built on (closure only, byte-identical).
//   sandbox-frame.mjs   shared-78's MCP Apps section: DI (outer frame: sandbox="allow-scripts allow-same-origin
//                       allow-forms", the allow list, proxy-ready wait), OI / xI (reload or navigation), II (anthropic:*
//                       raw relay), WI / GI / UI / XO (UI resource read, format check, tool lookup, ui:// check), HI
//                       (hostCapabilities), XF (postMessage), gI / hI / vI / _I (frame size, allow mapping), the error
//                       classes, the visualize server constants IP / rk, and (moved here from shared-104 in 3.6556.2) the
//                       message lookup SG / CG.
//   host-context.mjs    cc0e3547f (new in 3.6556.2; replaces c8e12f1a8): Tt (hostContext), wt (containerDimensions),
//                       ft / pt / mt (copy image / text, gated on iframe-originated user activation), At (_keepMenuClear,
//                       __gb__1130162093), gt (findServerTool, __gb__585138862), the view-state contract moved here from
//                       cd9b7fccf (Pt "anthropic/set-view-state", Ft, It, Lt, Rt), the view-state host Ut (menus N4: the
//                       host has no claude.ai account, so it takes the refuse branch Ht) and the deny-connectors gate Yt
//                       (menus N5: off).
//   frame-domains.mjs   c9d6d9802 (new dependency of cd9b7fccf): declared / granted frame domains.
//   widget-size.mjs     c06a5ffab (whole chunk): c (size-changed parse, clamp 5000), u (forceStableOrigin), p (text-size
//                       variables), m (visualize _hostStrings).
//   host-styles.mjs     cbc4150d0 CyF7gh5Q (whole chunk): the MCP Apps standard style variables, @font-face text, the
//                       font-size ladder.
//   sandbox-origin.mjs  cbc7fd025 (whole chunk): conversation hash, origin rewrites, ui.domain validation.
//   …                   and the small originals those read (rolldown-runtime export helper, preload-helper error text,
//                       shared-25 owner window / client value, shared-0 URL redaction, shared-1 permission level,
//                       shared-10 resident hook, shared-20 font families, shared-frame font-size table, c89766c40 user
//                       activation).
//
// Every emitted statement is an original top-level statement of the 3.6556.2 chunk; a module's statements are the
// reachable closure of its roots across chunks (a declaration's dependencies are its free variables, each declaration
// parsed on its own with Babel's scope analysis). A non-declaration statement of a closure chunk is kept when it assigns
// to, calls, or Object.assign()s a kept binding; whole chunks keep every statement. Generated modules import each other
// by the original export aliases (`import { t as we } from "./app-bridge.mjs"` for `import{t as we}from"./c131c9a32…"`), so
// a pinned dynamic import (shared-78) is rewritten only in its specifier. An import resolves, in this order, to: a named
// host adapter in src/source-mcp-app-host-adapters.jsx (its original declaration must carry `features`), a verified React
// export of vendor-frame (official-3.6556.2.mjs reactAliases, `Oo` = react/compiler-runtime#c), a view-tabs public name
// (the React Compiler helpers and CDS of shared-frame, imported from ../view-tabs/<file> by semantic name, R3/R6), or a
// chunk on the allow-list below. Anything else fails generation.
//
// No 2.42304.0 view (w10-trans-mcp-v3-pins, E34 retired): src/generated/mcp-app-card is 3.6556.2 output and imports this
// library by the original 3.6556.2 export aliases (whole chunks keep every one) and the semantic root names, so the
// manifest carries no legacy["2.42304.0"] section and no module exports a 2.42304.0 name.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/mcp-app-host');
const adapterModule = '../../source-mcp-app-host-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked with assertVendorAlias (top-level `local=<namespace>.<member>`).
const vendorFile = official.vendorFrame;

// The chunks the closure may enter, each with its generated module. `whole` keeps every top-level statement (and every
// original export); otherwise only the closure of `roots` and of the other modules' imports is kept. `roots` maps an
// original local to its semantic export name; `features` pins a root to strings of its prettier text (literals and
// property names only, R2); `raw` pins strings of the minified bytes with their exact occurrence count.
const chunks = {
  'cd9b7fccf-Ccxjzcg4.js': { target: 'app-renderer.mjs', whole: true,
    roots: { w: 'AppRenderer', Te: 'PostMessageTransport', Le: 'isToolVisibleToApp', Fe: 'withheldDevicePermissions', Ee: 'TOOL_INPUT_DELTA_METHOD' },
    features: {
      w: ['"https://assets.claude.ai",', '.searchParams.set("resource-src",', '.sendSandboxResourceReady({', '.sendToolInput({ arguments:',
        '.sendToolResult(', '.sendHostContextChange(', '.onsizechange = async', '?? { name: "Claude", version: "1.0.0" }', 'serverTools:',
        'accessibleTitle', 'smoothInitialHeight', '"model_context_rejected"', 'className: "h-full w-full"'],
      Te: ['this.sandboxWindow', '.safeParse(e.data);', 'addEventListener("message"'],
      Le: ['.visibility', '.includes("app")'],
      Fe: ['e !== "camera" &&', 'e !== "clipboardWrite"'],
      Ee: ['"ui/notifications/tool-input-delta"'],
    },
    raw: [['"ui/notifications/tool-input-delta"', 1], ['has no UI resource (no ui/resourceUri in tool._meta)', 1],
      ['Failed to load MCP App: the resource may exceed the 5 MB size limit.', 2], ['ms of the host sending its HTML to the sandbox.', 1],
      ['export{w as AppRenderer}', 1]] },
  'c131c9a32-CCtH6MRf.js': { target: 'app-bridge.mjs', whole: true,
    roots: { Q: 'AppBridge', x: 'LATEST_PROTOCOL_VERSION', g: 'appBridgeNamespace' },
    features: { x: ['x = "2026-01-26"'], g: ['AppBridge: () => Q,', 'LATEST_PROTOCOL_VERSION: () => x,'],
      Q: ['sendSandboxResourceReady(', 'sendToolInput(', 'sendToolResult(', 'sendHostContextChange('] },
    raw: [['x="2026-01-26"', 1], ['AppBridge:()=>', 1], ['"ui/notifications/sandbox-resource-ready"', 3], ['"ui/notifications/sandbox-proxy-ready"', 2],
      ['"ui/notifications/size-changed"', 2], ['"ui/notifications/host-context-changed"', 3]] },
  'c2a6d07ee-C5ZtQVF4.js': { target: 'mcp-protocol.mjs' },
  'c28eafaad-iTqpbj_J.js': { target: 'mcp-types.mjs' },
  'c4e4fae95-IXE_Woo4.js': { target: 'json-schema.mjs' },
  // zod reads its config and registry from globalThis (`var M = globalThis.__zod_globalConfig`); the two statements that
  // create them only assign the unkept temporaries Le / Ti, so they are pinned.
  'vendor-zod-fszujTq6.js': { target: 'zod.mjs',
    keepStatements: ['(Le=globalThis).__zod_globalConfig??(Le.__zod_globalConfig={});', '(Ti=globalThis).__zod_globalRegistry??(Ti.__zod_globalRegistry=Di());'] },
  'shared-78-D5Fw2h0a.js': { target: 'sandbox-frame.mjs',
    roots: { DI: 'createSandboxProxyFrame', OI: 'watchFrameReload', xI: 'isFrameAboutBlank', II: 'createRawMessageRelay', WI: 'readUiResource',
      GI: 'parseUiResource', UI: 'findToolUiResource', XO: 'toolUiResourceUri', HI: 'hostCapabilitiesFor', XF: 'postToFrame', gI: 'frameSizeStyle',
      hI: 'inlineFrameSizeStyle', vI: 'devicePermissionsAllow', _I: 'DEVICE_PERMISSION_FEATURES', pI: 'clampToContainer', mI: 'resolveDisplayMode',
      ZF: 'McpAppSandboxSetupError', QF: 'McpAppSandboxNavigatedError', $F: 'McpAppGuestInitializeTimeoutError', eI: 'NoUiResourceError',
      nI: 'UiResourceContentError', tI: 'ToolNotFoundError', rI: 'UiResourceTooLargeError', IP: 'VISUALIZE_SERVER_NAME', rk: 'VISUALIZE_SERVER_UUID' },
    features: {
      DI: ['.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms")', '?.blockDevicePermissions || ', '?.withholdFullscreen',
        '"fullscreen *"', '"picture-in-picture \'none\'"', '?.readyTimeoutMs ?? 3e4', '"ui/notifications/sandbox-proxy-ready"'],
      OI: ['.removeEventListener("load",'], xI: ['.contentWindow?.location.href === "about:blank"'],
      WI: ['.readResource({ uri:', '.cacheEnabled'], XF: ['.postMessage('], gI: ['height: "100%"'], hI: ['transition: "height 0.25s ease-out"'],
      GI: ['"UI resource not found: "', '"text/html+mcp"', '"text/html;profile=mcp-app"', '.contents.length !== 1', 'atob('],
      XO: ['.startsWith("ui://")', '?.["ui/resourceUri"]', '`Invalid UI resource URI: ${JSON.stringify('],
      UI: ['.listTools()', '[mcp-ext-apps-host] Tool'],
      vI: ['.join("; ")'], _I: ['clipboardWrite: "clipboard-write",'],
      HI: ['onopenlink ? { openLinks: {} } : {}', 'ondownloadfile ? { downloadFile: {} } : {}'],
      II: ['"anthropic:copy-image"', '"anthropic:copy-text"', '-result`'],
      pI: ['"maxHeight" in'], mI: ['?.availableDisplayModes ?? ["inline"]', '?.displayMode ?? "inline"'],
      ZF: ['"McpAppSandboxSetupError"'], QF: ['"McpAppSandboxNavigatedError"'], $F: ['"McpAppGuestInitializeTimeoutError"'], eI: ['"NoUiResourceError"'],
      nI: ['"UiResourceContentError"'], tI: ['"ToolNotFoundError"'], rI: ['"UiResourceTooLargeError"'],
      IP: ['IP = "visualize"'], rk: ['rk = "6f616b42-0ed8-571e-823f-ee4aca6b7ce9"'],
    },
    raw: [['u.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms")', 1], ['e==="text/html+mcp"||e==="text/html;profile=mcp-app"', 1],
      ['Check that *.claudemcpcontent.com is not blocked by your network or browser.', 1], ['"anthropic:copy-image"', 1],
      ['IP="visualize"', 1], ['rk="6f616b42-0ed8-571e-823f-ee4aca6b7ce9"', 1]],
    // dI loads the AppBridge namespace (GI parses the resource meta with McpUiResourceMetaSchema). Its specifier is the only
    // rewrite this generator makes: the target is the generated whole chunk, which keeps the original export `n`.
    dynamicImports: { dI: { 'c131c9a32-CCtH6MRf.js': 'app-bridge.mjs' } } },
  'cc0e3547f-Bla_O6hq.js': { target: 'host-context.mjs',
    roots: { Tt: 'useMcpAppHostContext', wt: 'useContainerDimensions', ft: 'widgetCopyWindow', pt: 'copyWidgetImage', mt: 'copyWidgetText',
      At: 'useKeepMenuClear', gt: 'useFindServerTool', kt: 'KEEP_MENU_CLEAR_GATE', ht: 'FIND_SERVER_TOOL_GATE',
      Rt: 'checkViewState', Pt: 'SET_VIEW_STATE_METHOD', Ft: 'VIEW_STATE_META_KEY', It: 'MAX_VIEW_STATE_BYTES', Lt: 'SetViewStateRequestSchema',
      Ut: 'useMcpAppViewStateHost', Ht: 'REFUSED_VIEW_STATE_HOST', Yt: 'useDenyConnectors' },
    features: {
      Tt: ['"desktop" : "web"', '["inline", "fullscreen"]', 'fonts:', 'variables:', 'availableDisplayModes:', 'containerDimensions:', 'deviceCapabilities:'],
      wt: ['maxHeight:', 'containerRef:', 'containerDimensions:', '.disconnect()'],
      ft: ['"widget copy without iframe-originated user activation"', '"widget copy from a frame that does not hold focus"', '.tagName === "IFRAME"'],
      pt: ['.navigator.clipboard.write(', '"image/png"'], mt: ['.navigator.clipboard.writeText('],
      kt: ['kt = "__gb__1130162093"'], ht: ['ht = "__gb__585138862"'],
      Rt: ['.byteLength', '"too_large"', '262111'], Pt: ['Pt = "anthropic/set-view-state"'], Ft: ['"anthropic/viewState"'],
      It: ['It = 262111'], Lt: ['params:', 'state:'],
      Ut: ['refuse:', 'hostContextExtras:', 'resolveHostContextExtras:', 'onSetViewState:'],
      Ht: ['hostContextExtras: {}', 'onSetViewState: () => Promise.reject('],
      Yt: ['"__gb__4291763747"', '"__gb__1932634900"'],
    },
    raw: [['var kt="__gb__1130162093"', 1], ['var ht="__gb__585138862"', 1], ['["inline","fullscreen"]', 1], ['Pt="anthropic/set-view-state"', 1],
      ['"/api/frame/mcpapp/widget-state"', 1], ['__gb__4291763747', 1], ['__gb__1932634900', 1], ['Kt=!1,qt={denyConnectors:[]}', 1]] },
  // W13 G11 (D1, cowork-approval pendingDedupe): the frame-domain helpers cowork-approval's c9d6d9802 slice reads (its
  // approved-domains row) are published, so that graph imports them instead of cutting a second copy.
  'c9d6d9802-BXTz_Gob.js': { target: 'frame-domains.mjs',
    roots: { r: 'FRAME_DOMAIN_PATTERN', i: 'parseFrameDomain', a: 'formatFrameDomain', o: 'frameDomainCovers', s: 'splitFrameDomains',
      c: 'grantedDeclaredFrameDomains' },
    features: { r: ['/^https:\\/\\/(\\*\\.)?([a-z0-9-]+(?:\\.[a-z0-9-]+)+)(?::([0-9]{1,5}))?$/i'], i: ['anySubdomain: t[1] !== void 0,'],
      a: ['`https://${e.anySubdomain ? "*." : ""}${e.host}'], o: ['t.host.endsWith(`.${e.host}`)'], s: ['.flatMap((e) => e.split(" "))'],
      c: ['{ granted: e, declared: t }'] } },
  // The widget view-state client (menus N4): keys, revision bookkeeping, the debounced store Ut opens per widget.
  'c531c760b-B_u8xPdC.js': { target: 'view-state-store.mjs' },
  'shared-46-BIbZBGFq.js': { target: 'conversation-registry.mjs' },
  'shared-130-dWztbTO1.js': { target: 'conversation-tombstones.mjs' },
  'c06a5ffab-DMQOdEAi.js': { target: 'widget-size.mjs', whole: true,
    roots: { c: 'parseSizeChanged', o: 'MAX_WIDGET_HEIGHT', u: 'useForceStableOrigin', p: 'useFontSizeVariables', m: 'useVisualizeHostStrings',
      l: 'FORCE_STABLE_ORIGIN_GATE', d: 'FONT_SIZE_STEPS_GATE' },
    features: { c: ['height: Math.min(Math.ceil(', '!Number.isFinite(', '<= 0) return null;'],
      o: ['o = 5e3'], p: ['? r : 16'], m: ['!== "visualize"', 'defaultMessage: "Copy as image",', 'defaultMessage: "Not sent:",'],
      l: ['l = "__gb__108722899"'], d: ['d = "__gb__4158246511"'] },
    raw: [['var l="__gb__108722899"', 1], ['var d="__gb__4158246511"', 1], ['defaultMessage:"Copy as image"', 1]] },
  'cbc4150d0-CyF7gh5Q.js': { target: 'host-styles.mjs', whole: true,
    roots: { a: 'MCP_APP_STYLE_VARIABLES', n: 'MCP_APP_FONT_FACES', i: 'fontSizeVariables' },
    features: { a: ['"--color-background-primary":'], n: ['https://assets.claude.ai/Fonts/AnthropicSans-Text-Regular-Static.otf'] },
    raw: [['"--color-background-primary":', 1], ['https://assets.claude.ai/Fonts/', 8]] },
  'cbc7fd025-CL89uHGY.js': { target: 'sandbox-origin.mjs', whole: true,
    roots: { c: 'sandboxHashInput', x: 'conversationSandboxHash', y: 'connectorSandboxHash', A: 'withConversationSubdomain', k: 'withUiDomainSubdomain',
      E: 'validateUiDomain', N: 'setStableOriginParam', P: 'withStableOriginHost', j: 'isOutsideSandboxDomain', u: 'SANDBOX_DOMAIN_SUFFIX',
      S: 'DomainValidationError' },
    features: { c: ['`claude-mcp-sandbox/v1\\n${'], j: ['.hostname.endsWith('],
      A: ['`staging-${', '.length >= 2 &&', '.join(".")'] },
    raw: [['claude-mcp-sandbox/v1', 1], ['u=".claudemcpcontent.com"', 1]] },
  // Small originals the closure reads.
  'rolldown-runtime-C3OYiQ02.js': { target: 'module-namespace.mjs' },
  'preload-helper-D0dM6GpB.js': { target: 'error-text.mjs' },
  'shared-25-DOWZRSlq.js': { target: 'owner-window.mjs' },
  'shared-0-DDOOdL6P.js': { target: 'url-redaction.mjs' },
  'shared-1-BJhqMmkf.js': { target: 'permission-level.mjs' },
  'shared-10-D6FXWZph.js': { target: 'host-resident.mjs' },
  'shared-20-mUr7IqZY.js': { target: 'font-families.mjs' },
  'shared-frame-6jtSkIit.js': { target: 'font-size-table.mjs' },
  // Whole: s() (iframe-originated activation) is only right with the chunk's trusted-input listeners on the host document.
  'c89766c40-BBY6eGqq.js': { target: 'user-activation.mjs', whole: true,
    roots: { r: 'markUserActivation', s: 'hasRecentUserActivation', o: 'watchParentUserActivation', n: 'syncUserActivation' },
    features: { s: ['navigator.userActivation?.isActive', 'performance.now() -', '>= 5250'], o: ['for (; t.parent && t.parent !== t; )'],
      r: ['= performance.now();'], n: ['navigator.userActivation?.isActive ? performance.now() : -1 / 0'] } },
};

// Host dependencies (checked first), by chunk and export alias. `local` is the declaration the alias must still name;
// `features` must appear in its prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  // GrowthBook reads. The host has no GrowthBook (D29/D31): every gate is off.
  'shared-25-DOWZRSlq.js': {
    Yh: { name: 'readGrowthBookGate', local: 'fs', features: [').on;'] },
    // Rs: a GrowthBook dynamic config, parsed by its schema; without GrowthBook every config is its default.
    Vh: { name: 'readGrowthBookConfig', local: 'Rs', features: ['type: "dynamic_config"'] },
    // cc: whether this client is the desktop app (the user agent's Claude desktop token). The host is the desktop app.
    vh: { name: 'isDesktopClient', local: 'cc', features: ['window.navigator.userAgent, { version:'] },
  },
  // Z (shared-156 ff): the MCP servers/tools store findServerTool (cc0e3547f gt / _t) reads. gt reads it only when
  // __gb__585138862 is on; the host keeps that gate off, and its adapter throws if anything reaches it.
  'shared-156-BLTosN8U.js': { ff: { name: 'mcpToolsStore', local: 'Z', features: ['Z = X'] } },
  // th (shared-52 og): a fizzy-lake part is on only when the root's data-cds-fizzy-lake names it and the allow-list Qm has
  // it. 3.6556.2 ships `Qm = []` and the host keeps fizzy-lake off (E12/R15), so the comfortable type steps (St) stay off.
  'shared-52-uHFNjl7C.js': { og: { name: 'isFizzyLakePart', local: 'th', features: ['.parts.includes('], also: { Qm: ['Qm = []'] } } },
  // _3 (shared-0 p): the authenticated claude.ai API fetch hook. Ut builds the widget view-state store over it (POST
  // /api/frame/mcpapp/widget-state); the host has no claude.ai account (D17/E24), so this fetch always fails and the store
  // answers "unavailable". The card passes no account, so Ut takes its refuse branch before any store exists.
  'shared-0-DDOOdL6P.js': {
    p: { name: 'useClaudeApiFetch', local: '_3', features: ['applicationType:', 'replayable:', 'resendAfterStepUp:'] },
    // Ko: a GrowthBook feature read (cbc7fd025's cai_* origin rewrites). No GrowthBook here: off.
    _b: { name: 'isGrowthBookFeatureOn', local: 'Ko', features: ['.isOn('] },
  },
  // NS (shared-1 Eu): the theme context ({theme, mode, resolvedMode}); the default MS is light. Here: the window's resolved
  // mode (documentElement data-mode, "system" through prefers-color-scheme). An adapter, so the library never creates a
  // second theme context.
  'shared-1-BJhqMmkf.js': { Eu: { name: 'useHostTheme', local: 'NS', features: [], also: { MS: ['resolvedMode: "light",', 'mode: "auto",'] } } },
  // s: Vite's preload helper (modulepreload links, vite:preloadError, chunk-load retries). The host bundler preloads its own
  // chunks (shared-78 dI loads the AppBridge namespace with no deps), so the loader runs as is.
  'preload-helper-D0dM6GpB.js': { t: { name: 'preloadChunk', local: 's', features: ['"vite:preloadError"'] } },
  // n (cbc4150d0 t): the @font-face text cc0e3547f Tt sends as styles.css.fonts. Its fonts live on assets.claude.ai,
  // which the host does not load (G4); the adapter sends no font faces, so widgets use their fallback stacks.
  'cbc4150d0-CyF7gh5Q.js': { t: { name: 'hostFontFaces', local: 'n', features: ['src: url("https://assets.claude.ai/Fonts/AnthropicSans-Text-Regular-Static.otf") format("opentype");'] } },
  // A (cbc7fd025 i): put the conversation hash in the first label of a *.claudemcpcontent.com sandbox URL (other hosts are
  // returned unchanged). The host's sandbox is the local oc-mcp-sandbox: scheme (MA-3), whose host is that hash.
  'cbc7fd025-CL89uHGY.js': { i: { name: 'withConversationOrigin', local: 'A', features: ['`staging-${'],
    also: { j: ['.hostname.endsWith('] } } },
  // Nh (shared-3 Uh): the X-Frame-* headers of a claude.ai API request (Oe). Never reached without an account; the host
  // sends none.
  'shared-3-BCEbd8Fv.js': { Uh: { name: 'frameRequestHeaders', local: 'Nh', features: ['"X-Frame-CP": "go"', '"X-Frame-Surface":', '"X-Frame-Session-Id":'] } },
  // Lo (shared-frame pd): the user's text-size step (a store). c06a5ffab p reads it only when __gb__4158246511 is on,
  // which it never is here, and then uses 16; the host has no text-size preference, so the adapter answers that base.
  'shared-frame-6jtSkIit.js': { pd: { name: 'useHostTextSize', local: 'Lo', features: [] } },
  // react-intl useIntl over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-DYfox5Co.js': {
    p: { name: 'useMcpAppIntl', local: 'q', features: [], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
  },
};

async function readSource(name, cache, dir = source) {
  const key = `${dir}\n${name}`;
  if (cache.has(key)) return cache.get(key);
  const bytes = await fs.readFile(path.join(dir, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(), aliasesOf = new Map();
  const top = new Map(), statements = [], bareImports = [];
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration || node.source) throw Error(`${name}: unsupported export form`);
      for (const s of node.specifiers) {
        exported.set(s.exported.name, s.local.name);
        if (!aliasesOf.has(s.local.name)) aliasesOf.set(s.local.name, []);
        aliasesOf.get(s.local.name).push(s.exported.name);
      }
    } else if (node.type === 'ImportDeclaration') {
      if (!node.specifiers.length) bareImports.push(node.source.value.replace(/^\.\//, ''));
      for (const s of node.specifiers) {
        if (s.type !== 'ImportSpecifier') throw Error(`${name}: unsupported import form`);
        top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported.name });
      }
    } else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d, keyword: node.kind });
    // Other statements (if / for / try …) are kept only in whole chunks; a closure chunk keeps an expression or for-of
    // statement by its targets (statementTargets).
    else statements.push({ kind: 'statement', node });
  }
  const record = { name, bytes, code, exported, aliasesOf, top, statements, bareImports, formatted: new Map(), deps: new Map() };
  cache.set(key, record);
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
// A unit's free variables that are top-level bindings of its chunk.
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
  if (file !== vendorFile) return null;
  if (!official.reactAliases[alias]) throw Error(`vendor-frame ${alias} is not a React export (official-3.6556.2.mjs reactAliases)`);
  const { module, member } = official.assertVendorAlias(src.code, alias);
  return [module, member];
}
// Every global the emitted originals read (at call time, except zod's and c89766c40's guarded feature checks). A new one
// fails generation so it is reviewed.
const allowedGlobals = new Set([
  'Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
  'RegExp', 'Date', 'Intl', 'Reflect', 'BigInt', 'Function', 'Uint8Array', 'globalThis', 'decodeURIComponent', 'console',
  'window', 'document', 'navigator', 'performance', 'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'AbortController', 'setTimeout', 'clearTimeout', 'atob',
  // 3.6556.2: the view-state request URL (cc0e3547f Oe).
  'encodeURIComponent',
]);

// W13 G11 (D1): originals an import-free module of another generated 3.6556.2 graph already holds and exports; imported
// from it (re-exported under this library's alias where a module here exports it), never cut again. shared-0 sW
// (isPlainObject) is session-rail-kit plain-object.mjs, the copy cowork-live, transcript-rows and proposal-group use.
const linkedModules = [{ dir: 'session-rail-kit', target: 'plain-object.mjs' }];
async function linkedOriginals(cache) {
  const out = new Map();
  for (const { dir, target } of linkedModules) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    const m = manifest.modules.find(x => x.target === target);
    if (manifest.referenceVersion !== referenceVersion || !m) throw Error(`${dir} has no ${referenceVersion} ${target}`);
    const src = await readSource(m.source, cache);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`${dir}/${target} was cut from other ${m.source} bytes`);
    const text = await fs.readFile(path.join(root, 'src/generated', dir, target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`${dir}/${target} differs from its manifest`);
    if (/^import /m.test(text)) throw Error(`${dir}/${target} is no longer import-free`);
    for (const b of m.bindings) {
      const local = typeof b === 'string' ? b : b.name;
      if (m.exports?.[local]) out.set(`${m.source}#${local}`, { from: `../${dir}/${target}`, name: m.exports[local] });
    }
  }
  return out;
}

export async function extractMcpAppHost({ check = false } = {}) {
  const cache = new Map();
  const tabs = await viewTabsManifestFor(referenceVersion);
  const viewTabs = new Map(Object.entries(tabs.publicNames ?? {}).map(([name, e]) => [`${e.file}#${e.local}`, { name, ...e }]));
  const linked = await linkedOriginals(cache);
  // needed: file -> Set(local); imports: file -> Map(local -> resolution)
  const needed = new Map(), resolved = new Map(), exportsNeeded = new Map(), kept = new Map(), dynamic = new Map();
  const queue = [];
  const need = (file, local, from) => queue.push({ file, local, from });
  const markExport = (file, local, alias) => {
    if (!exportsNeeded.has(file)) exportsNeeded.set(file, new Map());
    exportsNeeded.get(file).set(alias, local);
  };
  for (const [file, spec] of Object.entries(chunks)) {
    const src = await readSource(file, cache);
    if (spec.whole) {
      for (const [local, entry] of src.top) if (entry.kind !== 'import') need(file, local, 'whole');
      for (const [alias, local] of src.exported) markExport(file, local, alias);
    }
    for (const local of Object.keys(spec.roots ?? {})) need(file, local, 'root');
  }
  const drain = async () => {
    while (queue.length) {
      const { file, local, from } = queue.shift();
      const spec = chunks[file];
      if (!spec) throw Error(`${from}: ${file} is not on the allow-list (needs ${local})`);
      if (!needed.has(file)) { needed.set(file, new Set()); resolved.set(file, new Map()); }
      if (needed.get(file).has(local)) continue;
      needed.get(file).add(local);
      // A declaration view-tabs publishes is imported from there by its semantic name, never copied (one CDS graph).
      const held = viewTabs.get(`${file}#${local}`);
      if (held) { resolved.get(file).set(local, { kind: 'view-tabs', from: `../view-tabs/${file}`, name: held.name, via: `${file}#${local}`, original: local }); continue; }
      const link = linked.get(`${file}#${local}`);
      if (link) { resolved.get(file).set(local, { kind: 'linked', from: link.from, name: link.name, via: `${file}#${local}`, original: local }); continue; }
      const src = await readSource(file, cache);
      const entry = src.top.get(local);
      if (!entry) throw Error(`${from}: ${file} has no top-level ${local}`);
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
        const tab = viewTabs.get(`${entry.file}#${depLocal}`);
        if (tab) { resolved.get(file).set(local, { kind: 'view-tabs', from: `../view-tabs/${entry.file}`, name: tab.name, via, original: depLocal }); continue; }
        if (!chunks[entry.file]) throw Error(`${file}#${local}: unresolved import ${via} (${depLocal}); ${entry.file} is not on the allow-list`);
        resolved.get(file).set(local, { kind: 'generated', from: `./${chunks[entry.file].target}`, name: entry.alias, via });
        markExport(entry.file, depLocal, entry.alias);
        need(entry.file, depLocal, `${file}#${local}`);
        continue;
      }
      const text = sliceText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const rewrites = spec.dynamicImports?.[local];
        if (!rewrites) throw Error(`${file}: dynamic import inside ${local}`);
        for (const target of Object.keys(rewrites)) {
          if (!chunks[target]?.whole) throw Error(`${file}#${local}: dynamic import target ${target} must be a whole chunk`);
          if (text.split(`import("./${target}")`).length - 1 !== 1) throw Error(`${file}#${local}: expected one import("./${target}")`);
        }
        if (text.replace(/import\("\.\/([^"]+)"\)/g, (m, t) => (rewrites[t] ? '' : m)).match(/\bimport\s*\(/))
          throw Error(`${file}#${local}: unpinned dynamic import`);
        dynamic.set(`${file}#${local}`, rewrites);
      }
      for (const dep of unitDeps(src, entry, local)) need(file, dep, `${file}#${local}`);
    }
  };
  await drain();
  // Side-effect statements, to a fixpoint (a kept statement can keep more bindings, which can keep more statements).
  for (let changed = true; changed;) {
    changed = false;
    for (const [file, set] of needed) {
      const src = await readSource(file, cache);
      if (!kept.has(file)) kept.set(file, new Set());
      for (const stmt of src.statements) {
        if (kept.get(file).has(stmt)) continue;
        const pinned = (chunks[file].keepStatements ?? []).includes(src.code.slice(stmt.node.start, stmt.node.end));
        if (!chunks[file].whole && !pinned && !statementTargets(stmt.node).some(t => set.has(t))) continue;
        kept.get(file).add(stmt);
        changed = true;
        const text = src.code.slice(stmt.node.start, stmt.node.end);
        if (/\bimport\s*\(/.test(text)) throw Error(`${file}: dynamic import in a top-level statement`);
        for (const dep of programGlobals(text, `${file}#statement`).filter(n => src.top.has(n))) need(file, dep, `${file}#statement`);
      }
    }
    if (queue.length) { await drain(); changed = true; }
  }

  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-mcp-app-host.mjs', adapterModule: 'src/source-mcp-app-host-adapters.jsx',
    modules: [], publicNames: {} };
  const files = {};
  const targets = new Set();
  for (const [file, spec] of Object.entries(chunks)) for (const text of spec.keepStatements ?? []) {
    const src = await readSource(file, cache);
    const count = src.statements.filter(stmt => src.code.slice(stmt.node.start, stmt.node.end) === text).length;
    if (count !== 1) throw Error(`${file}: pinned statement ${JSON.stringify(text)} matches ${count} statements`);
  }
  const unreached = Object.keys(chunks).filter(file => !needed.has(file));
  if (unreached.length) throw Error(`on the allow-list but not reached: ${unreached.join(', ')}`);
  for (const [file, spec] of Object.entries(chunks)) {
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
    for (const local of set) { const entry = src.top.get(local); if (entry.kind !== 'import' && !resolved.get(file).has(local)) units.push({ local, entry, start: entry.node.start }); }
    for (const stmt of kept.get(file) ?? []) units.push({ statement: true, entry: stmt, start: stmt.node.start });
    units.sort((a, b) => a.start - b.start);
    const blocks = units.map(u => {
      let text = emittedText(src, u.entry);
      const rewrites = u.local && dynamic.get(`${file}#${u.local}`);
      if (rewrites) for (const [from, to] of Object.entries(rewrites)) text = text.split(`import("./${from}")`).join(`import(${JSON.stringify(`./${to}`)})`);
      return text;
    });
    const groups = new Map();
    for (const [local, r] of resolved.get(file)) {
      if (!set.has(local)) continue;
      if (!groups.has(r.from)) groups.set(r.from, []);
      groups.get(r.from).push(r.name === local ? local : `${r.name} as ${local}`);
    }
    const exportMap = new Map(exportsNeeded.get(file) ?? []);
    for (const [local, name] of Object.entries(spec.roots ?? {})) {
      if (exportMap.has(name) && exportMap.get(name) !== local) throw Error(`${spec.target}: export ${name} is taken`);
      exportMap.set(name, local);
      manifest.publicNames[name] = { module: spec.target, file, local };
    }
    const importText = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    for (const [name, local] of exportMap) if (!set.has(local) || src.top.get(local).kind === 'import' && !resolved.get(file).has(local))
      throw Error(`${spec.target}: export ${name} (${local}) is not kept`);
    const exportText = exportMap.size
      ? `export { ${[...exportMap].sort(([a], [b]) => a.localeCompare(b)).map(([name, local]) => (name === local ? local : `${local} as ${name}`)).join(', ')} };`
      : '';
    const header = `// Original Claude Desktop ${referenceVersion} code from ${file}${spec.whole ? ' (whole chunk)' : ''}; generated by extract-mcp-app-host.mjs.\n// Edit the extractor or src/source-mcp-app-host-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const unbound = programGlobals(text, spec.target).filter(name => !allowedGlobals.has(name));
    if (unbound.length) throw Error(`${spec.target}: unbound ${unbound.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: file, whole: !!spec.whole, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      statements: units.length,
      bindings: units.filter(u => u.local).map(u => ({ name: u.local, sha256: sha(sliceText(src, u.entry)) })),
      sideEffects: units.filter(u => u.statement).map(u => ({ at: u.start, sha256: sha(src.code.slice(u.entry.node.start, u.entry.node.end)) })),
      // Bare imports of the original only order module evaluation; their chunks' kept code arrives through named imports.
      droppedBareImports: src.bareImports,
      droppedStatements: src.statements.filter(stmt => !(kept.get(file) ?? new Set()).has(stmt))
        .map(stmt => ({ at: stmt.node.start, text: src.code.slice(stmt.node.start, Math.min(stmt.node.end, stmt.node.start + 100)) })),
      imports: [...resolved.get(file)].filter(([local]) => set.has(local))
        .map(([local, r]) => ({ local, from: r.from, name: r.name, via: r.via, kind: r.kind, ...(r.original ? { original: r.original } : {}) })),
      dynamicImports: [...dynamic].filter(([key]) => key.startsWith(`${file}#`)).map(([key, rewrites]) => ({ binding: key.split('#')[1], rewrites })),
      exports: Object.fromEntries([...exportMap].sort(([a], [b]) => a.localeCompare(b))),
      features: spec.features ?? {}, raw: spec.raw ?? [],
    });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`MCP App host output set changed: ${present.join(',')}. Run scripts/extract-mcp-app-host.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`MCP App host source mismatch: ${name}. Run scripts/extract-mcp-app-host.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.statements, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} MCP App host modules (${count} original ${referenceVersion} statements).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractMcpAppHost({ check: process.argv.includes('--check') });
