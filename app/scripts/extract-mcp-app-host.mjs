// R4g-mcp MA-5: the renderer half of the 2.42304.0 MCP Apps host, extracted without executing any desktop runtime
// (decision D0: own generator, own output folder src/generated/mcp-app-host, own scripts/verify-gen-mcp-app-host.mjs).
//
//   app-renderer.mjs   cd9b7fccf (whole chunk, lazy entry "epitaxy_mcp_app_host"): AppRenderer k — reads the ui://
//                      resource, builds the sandbox URL (conversation origin, connect-src / resource-src / frame-src /
//                      dev), creates the outer frame, waits for sandbox-proxy-ready, connects an AppBridge over the
//                      postMessage transport Ee, sends sandbox-resource-ready {html, csp, permissions}, then tool-input /
//                      tool-result / host-context-changed, and answers size-changed, ui/message, ui/open-link,
//                      ui/download-file, ui/request-display-mode, tools/call and anthropic/set-view-state.
//   app-bridge.mjs     c131c9a32 (whole chunk): @modelcontextprotocol/ext-apps' AppBridge Q, LATEST_PROTOCOL_VERSION x
//                      ("2026-01-26"), the ui/* method names and every McpUi* zod schema.
//   mcp-protocol.mjs   c2a6d07ee C5ZtQVF4: the MCP SDK Protocol / errors the bridge extends (closure only).
//   mcp-types.mjs      c28eafaad: the MCP JSON-RPC message schemas (closure only).
//   zod.mjs            vendor-zod: the zod the two above are built on (closure only).
//   sandbox-frame.mjs  shared-78's MCP Apps section: jk (outer frame: sandbox="allow-scripts allow-same-origin
//                      allow-forms", the allow list, proxy-ready wait), Mk / Tk (reload or navigation), Bk (anthropic:*
//                      raw relay), Jk / Yk / qk / vC (UI resource read, format check, tool lookup, ui:// check), Kk
//                      (hostCapabilities), ek (postMessage), bk / yk / Sk / xk (frame size, allow mapping), the error
//                      classes, and the visualize server constants GD / KD.
//   host-context.mjs   c8e12f1a8 Pe (hostContext), Ne (containerDimensions), X / Oe / ke (copy image / text, gated on
//                      iframe-originated user activation), Ie (_keepMenuClear, __gb__1130162093), Ae (findServerTool,
//                      __gb__585138862).
//   widget-size.mjs    c06a5ffab (whole chunk): l (size-changed parse, clamp 5000), d (forceStableOrigin), m (text-size
//                      variables), h (visualize _hostStrings).
//   host-styles.mjs    cbc4150d0 BRaVNt32 (whole chunk): the MCP Apps standard style variables, @font-face text, the
//                      font-size ladder.
//   sandbox-origin.mjs cbc7fd025 (whole chunk): conversation hash, origin rewrites, ui.domain validation.
//   …                  and the small originals those read (rolldown-runtime export helper, preload-helper error text,
//                      shared-25 owner window / client value, shared-0 URL redaction, shared-1 permission level,
//                      shared-10 resident hook, shared-104 message lookup, shared-20 font families, shared-frame
//                      font-size table, c89766c40 user activation).
//
// Every emitted statement is an original top-level statement of the installed chunk; a module's statements are the
// reachable closure of its roots across chunks (a declaration's dependencies are its free variables, each declaration
// parsed on its own with Babel's scope analysis). A non-declaration statement of a closure chunk is kept when it assigns
// to, calls, or Object.assign()s a kept binding; whole chunks keep every statement. Generated modules import each other
// by the original export aliases (`import { t as Te } from "./app-bridge.mjs"` for `import{t as Te}from"./c131c9a32…"`), so
// a pinned dynamic import (shared-78 hk) is rewritten only in its specifier. An import resolves, in this order, to: a
// named host adapter in src/source-mcp-app-host-adapters.jsx (its original declaration must carry `features`), a
// verified React export of vendor-frame, or a chunk on the allow-list below. Anything else fails generation.
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
const output = path.join(root, 'src/generated/mcp-app-host');
const adapterModule = '../../source-mcp-app-host-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// vendor-frame re-exports React; each alias is checked against its `local=<ns>.<member>` assignment.
const vendor = {
  'vendor-frame-DfPJ1QmD.js': {
    Co: ['react', 'useState'], So: ['react', 'useRef'], uo: ['react', 'useCallback'], bo: ['react', 'useMemo'], mo: ['react', 'useEffect'],
    wo: ['react', 'useSyncExternalStore'], Va: ['react/jsx-runtime', 'jsx'], Ha: ['react/jsx-runtime', 'jsxs'],
  },
};

// The chunks the closure may enter, each with its generated module. `whole` keeps every top-level statement (and every
// original export); otherwise only the closure of `roots` and of the other modules' imports is kept. `roots` maps an
// original local to its semantic export name; `features` pins a root to strings of its prettier text; `raw` pins strings
// of the minified bytes with their exact occurrence count.
const chunks = {
  'cd9b7fccf-C8-F2T2b.js': { target: 'app-renderer.mjs', whole: true,
    roots: { k: 'AppRenderer', D: 'appRendererNamespace', Ee: 'PostMessageTransport', Le: 'isToolVisibleToApp', Ie: 'withheldDevicePermissions',
      C: 'checkViewState', De: 'TOOL_INPUT_DELTA_METHOD', Oe: 'SET_VIEW_STATE_METHOD', x: 'VIEW_STATE_META_KEY' },
    features: {
      k: ['`Tool ${r} has no UI resource (no ui/resourceUri in tool._meta)`', '"https://assets.claude.ai",', 'l.searchParams.set("resource-src", d.join(" ")),',
        'R.sendSandboxResourceReady({', 'html: F,', 'permissions: Ie(L, I?.permissions),', 'R.sendToolInput({ arguments: h })', 'R.sendToolResult(x)',
        'R.sendHostContextChange(S)', '_.onsizechange = async ({ height: e }) => {', 'if (Kt.current && e <= 8) return;', 'let t = ae(e, J.current?.containerDimensions);',
        'serverTools: Bt.current ? void 0 : he?.tools,', 'sandbox: { permissions: l, csp: I?.csp },', 'i ?? { name: "Claude", version: "1.0.0" },',
        '`MCP app did not send ui/notifications/initialized within ${A} ms of the host sending its HTML to the sandbox.`',
        'l("div", { ref: V, className: "h-full w-full" })'],
      Ee: ['if (e.source !== this.sandboxWindow || e.origin !== this.origin)', 'let t = b.safeParse(e.data);'],
      Le: ['return n === void 0 || (Array.isArray(n) && n.includes("app"));'],
      Ie: ['e !== "camera" &&', 'e !== "clipboardWrite",'],
      D: ['D = e({ AppRenderer: () => k })'],
    },
    raw: [['AppRenderer:()=>', 1], ['"anthropic/set-view-state"', 1], ['ui/notifications/tool-input-delta', 1],
      ['has no UI resource (no ui/resourceUri in tool._meta)', 1], ['Failed to load MCP App: the resource may exceed the 5 MB size limit.', 2],
      ['within ${A} ms of the host sending its HTML to the sandbox.', 1]] },
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
  'shared-78-D6VXYXaQ.js': { target: 'sandbox-frame.mjs',
    roots: { jk: 'createSandboxProxyFrame', Mk: 'watchFrameReload', Tk: 'isFrameAboutBlank', Bk: 'createRawMessageRelay', Jk: 'readUiResource',
      Yk: 'parseUiResource', qk: 'findToolUiResource', vC: 'toolUiResourceUri', Kk: 'hostCapabilitiesFor', ek: 'postToFrame', bk: 'frameSizeStyle',
      yk: 'inlineFrameSizeStyle', Sk: 'devicePermissionsAllow', xk: 'DEVICE_PERMISSION_FEATURES', _k: 'clampToContainer', vk: 'resolveDisplayMode',
      tk: 'McpAppSandboxSetupError', nk: 'McpAppSandboxNavigatedError', rk: 'McpAppGuestInitializeTimeoutError', ik: 'NoUiResourceError',
      ok: 'UiResourceContentError', ak: 'ToolNotFoundError', sk: 'UiResourceTooLargeError', GD: 'VISUALIZE_SERVER_NAME', KD: 'VISUALIZE_SERVER_UUID' },
    features: {
      jk: ['u.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms")', 'i?.blockDevicePermissions || i?.withholdFullscreen ? "" : "fullscreen *",',
        'g = i?.withholdFullscreen ? "picture-in-picture \'none\'" : "";', 'let _ = i?.readyTimeoutMs ?? 3e4,'],
      Yk: ['e === "text/html+mcp" || e === "text/html;profile=mcp-app";', 'if (e.contents.length !== 1)', 'r = atob(n.blob);'],
      vC: ['n.startsWith("ui://")', '(n = t?.["ui/resourceUri"])'],
      Sk: ['.map((e) => xk[e])', '.join("; ")'],
      xk: ['clipboardWrite: "clipboard-write",'],
      Kk: ['...(e.onopenlink ? { openLinks: {} } : {}),', '...(e.onmessage ? { message: { text: {} } } : {}),'],
      Bk: ['t.data?.type === "anthropic:copy-image" &&', 't.data?.type === "anthropic:copy-text" &&', 'type: `${t.data.type}-result`,'],
      GD: ['GD = "visualize"'], KD: ['KD = "6f616b42-0ed8-571e-823f-ee4aca6b7ce9"'],
    },
    raw: [['u.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms")', 1], ['e==="text/html+mcp"||e==="text/html;profile=mcp-app"', 1],
      ['Check that *.claudemcpcontent.com is not blocked by your network or browser.', 1], ['"anthropic:copy-image"', 1],
      ['GD="visualize"', 1], ['KD="6f616b42-0ed8-571e-823f-ee4aca6b7ce9"', 1]],
    // hk loads the AppBridge namespace (Yk parses the resource meta with McpUiResourceMetaSchema). Its specifier is the only
    // rewrite this generator makes: the target is the generated whole chunk, which keeps the original export `n`.
    dynamicImports: { hk: { 'c131c9a32-CCtH6MRf.js': 'app-bridge.mjs' } } },
  'c8e12f1a8-6AP_7dPS.js': { target: 'host-context.mjs',
    roots: { Pe: 'useMcpAppHostContext', Ne: 'useContainerDimensions', X: 'widgetCopyWindow', Oe: 'copyWidgetImage', ke: 'copyWidgetText',
      Ie: 'useKeepMenuClear', Ae: 'useFindServerTool', Fe: 'KEEP_MENU_CLEAR_GATE', Z: 'FIND_SERVER_TOOL_GATE' },
    features: {
      Pe: ['platform: s ? "desktop" : "web",', 'availableDisplayModes: ["inline", "fullscreen"],', 'styles: { variables: { ...F, ...g }, css: { fonts: I } },',
        'containerDimensions: u,'],
      Ne: ['? { width: i.width ?? 0, maxHeight: L }'],
      X: ['"widget copy without iframe-originated user activation"', '"widget copy from a frame that does not hold focus"'],
      Ie: ['return f(Fe);'], Fe: ['Fe = "__gb__1130162093"'], Ae: ['let n = f(Z),', 'return n ? r : void 0;'], Z: ['Z = "__gb__585138862"'],
    },
    raw: [['var Fe="__gb__1130162093"', 1], ['var Z="__gb__585138862"', 1], ['availableDisplayModes:["inline","fullscreen"]', 1]] },
  'c06a5ffab-BHsFLtx8.js': { target: 'widget-size.mjs', whole: true,
    roots: { l: 'parseSizeChanged', s: 'MAX_WIDGET_HEIGHT', d: 'useForceStableOrigin', m: 'useFontSizeVariables', h: 'useVisualizeHostStrings',
      u: 'FORCE_STABLE_ORIGIN_GATE', f: 'FONT_SIZE_STEPS_GATE' },
    features: { l: ['let r = { height: Math.min(Math.ceil(t), s) };', 'if (typeof t != "number" || !Number.isFinite(t) || t <= 0) return null;'],
      s: ['s = 5e3'], m: ['a = n ? r : 16;'], h: ['if (t === "visualize")', 'defaultMessage: "Copy as image",', 'defaultMessage: "Not sent:",'] },
    raw: [['var u="__gb__108722899"', 1], ['var f="__gb__4158246511"', 1], ['defaultMessage:"Copy as image"', 1]] },
  'cbc4150d0-BRaVNt32.js': { target: 'host-styles.mjs', whole: true,
    roots: { a: 'MCP_APP_STYLE_VARIABLES', n: 'MCP_APP_FONT_FACES', i: 'fontSizeVariables' },
    features: { a: ['"--color-background-primary":'], n: ['https://assets.claude.ai/Fonts/AnthropicSans-Text-Regular-Static.otf'] },
    raw: [['"--color-background-primary":', 1], ['https://assets.claude.ai/Fonts/', 8]] },
  'cbc7fd025-CAGIpAIM.js': { target: 'sandbox-origin.mjs', whole: true,
    roots: { c: 'sandboxHashInput', x: 'conversationSandboxHash', y: 'connectorSandboxHash', A: 'withConversationSubdomain', k: 'withUiDomainSubdomain',
      E: 'validateUiDomain', N: 'setStableOriginParam', P: 'withStableOriginHost', j: 'isOutsideSandboxDomain', u: 'SANDBOX_DOMAIN_SUFFIX',
      S: 'DomainValidationError' },
    features: { c: ['return `claude-mcp-sandbox/v1\\n${e}\\n${JSON.stringify(r)}`;'], x: ['return _(e + t);'], j: ['return !e.hostname.endsWith(u);'],
      A: ['let i = n ? `staging-${t}` : t,', 'a.length >= 2 && ((a[0] = i), (r.hostname = a.join(".")))'] },
    raw: [['claude-mcp-sandbox/v1', 1], ['u=".claudemcpcontent.com"', 1]] },
  // Small originals the closure reads.
  'rolldown-runtime-C3OYiQ02.js': { target: 'module-namespace.mjs' },
  'preload-helper-D0dM6GpB.js': { target: 'error-text.mjs' },
  'shared-25-DP8p7i1Z.js': { target: 'owner-window.mjs' },
  'shared-0-ByI5P0CP.js': { target: 'url-redaction.mjs' },
  'shared-1-CAAiD7E3.js': { target: 'permission-level.mjs' },
  'shared-10-THQui8pC.js': { target: 'host-resident.mjs' },
  'shared-104-Cqo2-vQh.js': { target: 'intl-messages.mjs' },
  'shared-20-B7UqYfsi.js': { target: 'font-families.mjs' },
  'shared-frame-BfjMqbuN.js': { target: 'font-size-table.mjs' },
  // Whole: s() (iframe-originated activation) is only right with the chunk's trusted-input listeners on the host document.
  'c89766c40-D_7i6Bva.js': { target: 'user-activation.mjs', whole: true },
};

// Host dependencies (checked first), by chunk and export alias. `local` is the declaration the alias must still name;
// `features` must appear in its prettier form, and `also` pins further declarations of the same chunk.
const adapters = {
  // GrowthBook reads. The host has no GrowthBook (D29/D31): every gate is off.
  'shared-25-DP8p7i1Z.js': {
    Th: { name: 'readGrowthBookGate', local: 'Zs', features: ['return Rs(I(e)).on;'] },
    // ml: whether this client is the desktop app (the user agent's Claude desktop token). The host is the desktop app.
    Rm: { name: 'isDesktopClient', local: 'ml', features: ['let a = se(window.navigator.userAgent, { version: e, platform: t });'] },
  },
  'shared-0-ByI5P0CP.js': { my: { name: 'isGrowthBookFeatureOn', local: 'Za', features: ['return t ? t.isOn(Pa(e)) : !1;'] } },
  // nx: the theme context ({theme, mode, resolvedMode}); the default tx is light. Here: the window's resolved mode
  // (documentElement data-mode, "system" through prefers-color-scheme).
  'shared-1-CAAiD7E3.js': { Hl: { name: 'useHostTheme', local: 'nx', features: ['return y(Ab) ?? tx;'], also: { tx: ['resolvedMode: "light",'] } } },
  // So: the user's text-size step (a store). c06a5ffab m reads it only when __gb__4158246511 is on, which it never is
  // here, and then uses 16; the host has no text-size preference, so the adapter answers that base.
  'shared-frame-BfjMqbuN.js': { Yl: { name: 'useHostTextSize', local: 'So', features: ['return yt(xo, yo, bo);'] } },
  // Z (shared-156 Sd): the MCP servers/tools store findServerTool (c8e12f1a8 Ae / je) reads. Ae reads it only when
  // __gb__585138862 is on; the host keeps that gate off, and its adapter throws if anything reaches it.
  'shared-156-Bikz018e.js': { Sd: { name: 'mcpToolsStore', local: 'Z', features: ['Z = X'] } },
  // react-intl useIntl over the local catalog (source-code-start-adapters.jsx useStartIntl).
  'vendor-intl-Db7hDWRO.js': {
    p: { name: 'useMcpAppIntl', local: 'q', features: ['let e = o(K);', 'return (Mt(e), e);'], also: { Mt: ['[React Intl] Could not find required `intl` object.'] } },
  },
  // s: Vite's preload helper (modulepreload links, vite:preloadError). The host bundler preloads its own chunks.
  'preload-helper-D0dM6GpB.js': { t: { name: 'preloadChunk', local: 's', features: ['"vite:preloadError"'] } },
  // n (cbc4150d0 t): the @font-face text c8e12f1a8 Pe sends as styles.css.fonts. Its fonts live on assets.claude.ai,
  // which the host does not load (G4); the adapter sends no font faces, so widgets use their fallback stacks.
  'cbc4150d0-BRaVNt32.js': { t: { name: 'hostFontFaces', local: 'n', features: ['src: url("https://assets.claude.ai/Fonts/AnthropicSans-Text-Regular-Static.otf") format("opentype");'] } },
  // A (cbc7fd025 i): put the conversation hash in the first label of a *.claudemcpcontent.com sandbox URL (other hosts are
  // returned unchanged). The host's sandbox is the local oc-mcp-sandbox: scheme (MA-3), whose host is that hash.
  'cbc7fd025-CAGIpAIM.js': { i: { name: 'withConversationOrigin', local: 'A', features: ['if (j(r)) return r;', 'let i = n ? `staging-${t}` : t,'],
    also: { j: ['return !e.hostname.endsWith(u);'] } } },
};

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
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
  const target = vendor[file]?.[alias];
  if (!target) return null;
  const local = src.exported.get(alias);
  const escaped = local?.replace(/\$/g, '\\$');
  if (!local || !new RegExp(`(?<![\\w$.])${escaped}=[\\w$]+\\.${target[1]}\\b`).test(src.code))
    throw Error(`vendor-frame ${alias} no longer resolves to ${target.join(':')}`);
  return target;
}
// Every global the emitted originals read (at call time, except zod's and c89766c40's guarded feature checks). A new one
// fails generation so it is reviewed.
const allowedGlobals = new Set([
  'Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
  'RegExp', 'Date', 'Intl', 'Reflect', 'BigInt', 'Function', 'Uint8Array', 'globalThis', 'decodeURIComponent', 'console',
  'window', 'document', 'navigator', 'performance', 'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'AbortController', 'setTimeout', 'clearTimeout', 'atob',
]);

export async function extractMcpAppHost({ check = false } = {}) {
  const cache = new Map();
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
    for (const local of set) { const entry = src.top.get(local); if (entry.kind !== 'import') units.push({ local, entry, start: entry.node.start }); }
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
    const importText = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportMap = new Map(exportsNeeded.get(file) ?? []);
    for (const [local, name] of Object.entries(spec.roots ?? {})) {
      if (exportMap.has(name) && exportMap.get(name) !== local) throw Error(`${spec.target}: export ${name} is taken`);
      exportMap.set(name, local);
      manifest.publicNames[name] = { module: spec.target, file, local };
    }
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
