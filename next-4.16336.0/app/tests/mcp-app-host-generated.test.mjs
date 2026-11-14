import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractMcpAppHost } from '../scripts/extract-mcp-app-host.mjs';
import { mcpAppHostManifestFor, mcpAppHostViewFor } from '../scripts/mcp-app-host-compat.mjs';

// R4g-mcp MA-5: the renderer half of the MCP Apps host (cd9b7fccf AppRenderer, c131c9a32 AppBridge, the shared-78 frame /
// resource / relay primitives, cc0e3547f hostContext and view state, c06a5ffab, cbc4150d0, cbc7fd025), generated from
// Claude Desktop 3.6556.2 by scripts/extract-mcp-app-host.mjs (w2-mcp-host). The tests drive the generated originals with
// controlled inputs and fake windows; no frame is created in a browser, no network or process is touched.
const ROOT = path.resolve(import.meta.dirname, '..');
const GEN = path.join(ROOT, 'src/generated/mcp-app-host');
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
let server, Renderer, Bridge, Frame, Context, Size, Styles, Origin, Activation, FontTable, ErrorText, Adapters;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = name => server.ssrLoadModule(`/src/generated/mcp-app-host/${name}`);
  [Renderer, Bridge, Frame, Context, Size, Styles, Origin, Activation, FontTable, ErrorText] = await Promise.all(['app-renderer.mjs',
    'app-bridge.mjs', 'sandbox-frame.mjs', 'host-context.mjs', 'widget-size.mjs', 'host-styles.mjs', 'sandbox-origin.mjs', 'user-activation.mjs',
    'font-size-table.mjs', 'error-text.mjs'].map(load));
  Adapters = await server.ssrLoadModule('/src/source-mcp-app-host-adapters.jsx');
});
after(() => server?.close());

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('generated output is current (--check) and every module pins its original source', async () => {
  const manifest = await extractMcpAppHost({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  const bySource = Object.fromEntries(manifest.modules.map(m => [m.source, m]));
  for (const [file, target] of [['cd9b7fccf-Ccxjzcg4.js', 'app-renderer.mjs'], ['c131c9a32-CCtH6MRf.js', 'app-bridge.mjs'],
    ['shared-78-D5Fw2h0a.js', 'sandbox-frame.mjs'], ['cc0e3547f-Bla_O6hq.js', 'host-context.mjs'], ['c06a5ffab-DMQOdEAi.js', 'widget-size.mjs'],
    ['cbc4150d0-CyF7gh5Q.js', 'host-styles.mjs'], ['cbc7fd025-CL89uHGY.js', 'sandbox-origin.mjs'], ['vendor-zod-fszujTq6.js', 'zod.mjs'],
    ['c2a6d07ee-C5ZtQVF4.js', 'mcp-protocol.mjs'], ['c28eafaad-iTqpbj_J.js', 'mcp-types.mjs'], ['c9d6d9802-BXTz_Gob.js', 'frame-domains.mjs'],
    ['c531c760b-B_u8xPdC.js', 'view-state-store.mjs'], ['c89766c40-BBY6eGqq.js', 'user-activation.mjs']]) {
    assert.equal(bySource[file]?.target, target, file);
    const bytes = await fs.readFile(path.join(V3, file));
    assert.equal(bySource[file].sourceSha256, createHash('sha256').update(bytes).digest('hex'), file);
    assert.equal(bySource[file].referenceVersion, '3.6556.2', file);
  }
  // c8e12f1a8 is gone in 3.6556.2 (its code moved to cc0e3547f); shared-104's message lookup moved into shared-78.
  assert.equal(manifest.modules.some(m => m.source.startsWith('c8e12f1a8-') || m.source.startsWith('shared-104-')), false);
  for (const whole of ['app-renderer.mjs', 'app-bridge.mjs', 'widget-size.mjs', 'host-styles.mjs', 'sandbox-origin.mjs', 'user-activation.mjs'])
    assert.equal(manifest.modules.find(m => m.target === whole).whole, true, whole);
  // Adapters replace exactly the host boundaries the extractor names.
  const adapterImports = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via}=${i.name}`));
  assert.deepEqual([...new Set(adapterImports)].sort(), [
    'cbc4150d0-CyF7gh5Q.js:t=hostFontFaces', 'cbc7fd025-CL89uHGY.js:i=withConversationOrigin', 'preload-helper-D0dM6GpB.js:t=preloadChunk',
    'shared-0-DDOOdL6P.js:_b=isGrowthBookFeatureOn', 'shared-0-DDOOdL6P.js:p=useClaudeApiFetch', 'shared-1-BJhqMmkf.js:Eu=useHostTheme',
    'shared-156-BLTosN8U.js:ff=mcpToolsStore', 'shared-25-DOWZRSlq.js:Vh=readGrowthBookConfig', 'shared-25-DOWZRSlq.js:Yh=readGrowthBookGate',
    'shared-25-DOWZRSlq.js:vh=isDesktopClient', 'shared-3-BCEbd8Fv.js:Uh=frameRequestHeaders', 'shared-52-uHFNjl7C.js:og=isFizzyLakePart',
    'shared-frame-6jtSkIit.js:pd=useHostTextSize', 'vendor-intl-DYfox5Co.js:p=useMcpAppIntl']);
  // R3/R6: the React Compiler helpers and the CDS bindings come from view-tabs by semantic name, never copied.
  const tabs = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'view-tabs'));
  assert.ok(tabs.some(i => i.name === 'reactMemoCache' && i.from === '../view-tabs/shared-frame-6jtSkIit.js'));
  for (const i of tabs) assert.match(i.name, /^[a-z][A-Za-z0-9]{3,}$/, `${i.via} is imported by its semantic name`);
  const react = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'react').map(i => `${i.via}=${i.from}#${i.name}`));
  assert.ok(react.includes('vendor-frame-CnSY1sxv.js:Co=react#useRef'), 'Co is useRef in 3.6556.2');
  assert.ok(react.includes('vendor-frame-CnSY1sxv.js:wo=react#useState'), 'wo is useState in 3.6556.2');
  for (const m of manifest.modules) for (const b of m.bindings) assert.ok(!/^(J9|J8|J0|J[1-5]|K[0-5]|I[1-5]|Z[1-5])$/.test(b.name) || m.source !== 'shared-frame-6jtSkIit.js', b.name);
  // The one rewrite: shared-78 dI's dynamic import of the AppBridge chunk.
  assert.deepEqual(bySource['shared-78-D5Fw2h0a.js'].dynamicImports, [{ binding: 'dI', rewrites: { 'c131c9a32-CCtH6MRf.js': 'app-bridge.mjs' } }]);
});

test('E34 retired (w10-trans-mcp-v3-pins): no 2.42304.0 view, the card imports only 3.6556.2 names', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(GEN, 'manifest.json'), 'utf8'));
  assert.equal('legacy' in manifest, false, 'no legacy["2.42304.0"] section');
  await assert.rejects(fs.access(path.join(ROOT, 'scripts/mcp-app-host-legacy-2.42304.0.json')), { code: 'ENOENT' });
  // c05b96c7f (plain-object.mjs) was sliced only for the legacy sandbox-frame `jl`; it is gone with it.
  assert.equal(manifest.modules.some(m => m.source.startsWith('c05b96c7f-') || m.target === 'plain-object.mjs'), false);
  await assert.rejects(fs.access(path.join(GEN, 'plain-object.mjs')), { code: 'ENOENT' });
  for (const name of await fs.readdir(GEN)) if (name.endsWith('.mjs'))
    assert.doesNotMatch(await fs.readFile(path.join(GEN, name), 'utf8'), /2\.42304\.0|__legacy/, name);
  // The compat helper: the manifest for 3.6556.2, the card generator's error for any other release (2.42304.0 included).
  assert.equal((await mcpAppHostManifestFor('3.6556.2')).referenceVersion, '3.6556.2');
  await assert.rejects(mcpAppHostManifestFor('2.42304.0'), /^Error: mcp-app-host is 3\.6556\.2, expected 2\.42304\.0$/);
  assert.throws(() => mcpAppHostViewFor(manifest, '2.37337.1'), /^Error: mcp-app-host is 3\.6556\.2, expected 2\.37337\.1$/);
  assert.throws(() => mcpAppHostViewFor({ referenceVersion: '3.6556.2', legacy: { '2.42304.0': { referenceVersion: '2.42304.0' } } }, '2.42304.0'), /expected 2\.42304\.0/);
  assert.throws(() => mcpAppHostViewFor({ referenceVersion: '3.6556.2' }, 'toString'), /expected toString/);
  // Every name the card output (all 3.6556.2) imports from this library is exported here.
  const card = path.join(ROOT, 'src/generated/mcp-app-card');
  const wanted = new Map();
  for (const name of (await fs.readdir(card)).filter(f => f.endsWith('.mjs'))) {
    const code = await fs.readFile(path.join(card, name), 'utf8');
    assert.ok(code.startsWith('// Original Claude Desktop 3.6556.2 '), name);
    for (const m of code.matchAll(/import \{([^}]*)\} from "\.\.\/mcp-app-host\/([^"]+)"/g))
      for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) wanted.set(`${m[2]}#${spec.split(/\s+as\s+/)[0]}`, name);
  }
  assert.ok(wanted.size > 10);
  const mods = Object.fromEntries(await Promise.all([...new Set([...wanted.keys()].map(k => k.split('#')[0]))]
    .map(async t => [t, await server.ssrLoadModule(`/src/generated/mcp-app-host/${t}`)])));
  for (const [key, consumer] of wanted) {
    const [target, name] = key.split('#');
    assert.ok(name in mods[target], `${consumer} imports ${name} from ${target}`);
  }
  // The 2.42304.0-only names are gone; the lazy entry reads AppRenderer by name (cd9b7fccf `pick: (e) => e.AppRenderer`).
  assert.equal(Renderer.n, undefined);
  assert.equal(typeof Renderer.AppRenderer, 'function');
  assert.equal(ErrorText.n, undefined);
  assert.equal(typeof ErrorText.i, 'function', 'view-state-store.mjs reads the preload-helper error text as i');
  assert.equal(Frame.jl, undefined);
  assert.equal(FontTable.hi, undefined);
  assert.equal(FontTable.Ei['font-size-body'].comfortable, 0.875);
  // The short aliases the card still imports are the official 3.6556.2 export aliases of those whole chunks.
  const exportsOf = async file => Object.fromEntries([...(await fs.readFile(path.join(V3, file), 'utf8')).match(/export\{([^}]*)\}\s*;?\s*$/)[1].split(',')]
    .map(part => part.split(' as ')).map(([local, alias = local]) => [alias, local]));
  assert.deepEqual(await exportsOf('c06a5ffab-DMQOdEAi.js'), { a: 'c', i: 'o', n: 'p', r: 'u', t: 'm' });
  assert.deepEqual(await exportsOf('c89766c40-BBY6eGqq.js'), { a: 'r', i: 'o', n: 'n', r: 's', t: 'a' });
  assert.equal((await exportsOf('cbc7fd025-CL89uHGY.js')).c, 'x');
  assert.equal(Size.i, Size.MAX_WIDGET_HEIGHT);
  assert.equal(Size.n, Size.useFontSizeVariables);
  assert.equal(Size.r, Size.useForceStableOrigin);
  assert.equal(Size.t, Size.useVisualizeHostStrings);
  assert.equal(Origin.c, Origin.conversationSandboxHash);
  // c89766c40's own aliases, no longer shadowed by the 2.42304.0 i / n.
  assert.equal(Activation.a, Activation.markUserActivation);
  assert.equal(Activation.i, Activation.watchParentUserActivation);
  assert.equal(Activation.n, Activation.syncUserActivation);
  assert.equal(Activation.r, Activation.hasRecentUserActivation);
});

test('feature strings survive into the generated originals', async () => {
  const read = name => fs.readFile(path.join(GEN, name), 'utf8');
  const [bridge, frame, context, renderer] = await Promise.all(['app-bridge.mjs', 'sandbox-frame.mjs', 'host-context.mjs', 'app-renderer.mjs'].map(read));
  assert.match(bridge, /x = "2026-01-26"/);
  assert.equal(bridge.split('"ui/notifications/sandbox-resource-ready"').length - 1, 3);
  assert.match(frame, /\.setAttribute\("sandbox", "allow-scripts allow-same-origin allow-forms"\)/);
  assert.match(frame, /e === "text\/html\+mcp" \|\| e === "text\/html;profile=mcp-app"/);
  assert.match(frame, /import\("\.\/app-bridge\.mjs"\)\.then\(\(e\) => e\.n\)/);
  assert.match(context, /var kt = "__gb__1130162093";/);
  assert.match(context, /var Ce = "\/api\/frame\/mcpapp\/widget-state";/);
  assert.match(renderer, /\.sendSandboxResourceReady\(\{/);
  assert.match(renderer, /^import \{[^}]*reactMemoCache as J9[^}]*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";$/m);
  assert.equal(Bridge.LATEST_PROTOCOL_VERSION, '2026-01-26');
  assert.equal(Frame.VISUALIZE_SERVER_NAME, 'visualize');
  assert.equal(Frame.VISUALIZE_SERVER_UUID, '6f616b42-0ed8-571e-823f-ee4aca6b7ce9');
  // The view-state contract moved from cd9b7fccf to cc0e3547f in 3.6556.2.
  assert.equal(Context.SET_VIEW_STATE_METHOD, 'anthropic/set-view-state');
  assert.equal(Context.VIEW_STATE_META_KEY, 'anthropic/viewState');
  assert.equal(Context.MAX_VIEW_STATE_BYTES, 262111);
  assert.equal('checkViewState' in Renderer, false);
  assert.equal(Renderer.TOOL_INPUT_DELTA_METHOD, 'ui/notifications/tool-input-delta');
  assert.equal('appRendererNamespace' in Renderer, false, 'cd9b7fccf exports only AppRenderer in 3.6556.2');
});

test('c06a5ffab l: size-changed is parsed and the height clamped to 5000', () => {
  const parse = Size.parseSizeChanged;
  assert.equal(Size.MAX_WIDGET_HEIGHT, 5000);
  for (const [input, expected] of [
    [{ height: 120 }, { height: 120 }], [{ height: 120.2, width: 300.4 }, { height: 121, width: 301 }], [{ height: 9000 }, { height: 5000 }],
    [{ height: 5000.5 }, { height: 5000 }], [{ height: 10, width: -1 }, { height: 10 }], [{ height: 10, width: Infinity }, { height: 10 }],
    [{ height: 0 }, null], [{ height: -4 }, null], [{ height: NaN }, null], [{ height: '120' }, null], [{ width: 10 }, null],
    [[120], null], [null, null], [undefined, null], [120, null], [Object.create({ height: 50 }), null],
  ]) assert.deepEqual(parse(input), expected, JSON.stringify(input));
});

test('shared-78 GI: a UI resource is exactly one html content (text or base64 blob)', async () => {
  const parse = Frame.parseUiResource;
  const kind = async (result, ctx = { uri: 'ui://a' }) => { try { await parse(result, ctx); return 'ok'; } catch (e) { assert.ok(e instanceof Frame.UiResourceContentError); return e.kind; } };
  assert.equal(await kind(undefined), 'not_found');
  assert.equal(await kind({ contents: [] }), 'empty');
  const html = { uri: 'ui://a', mimeType: 'text/html;profile=mcp-app', text: '<p>hi</p>' };
  assert.equal(await kind({ contents: [html, html] }), 'multiple_contents');
  assert.equal(await kind({ contents: [{ ...html, mimeType: 'text/html' }] }), 'unsupported_format');
  assert.equal(await kind({ contents: [{ uri: 'ui://a', mimeType: 'text/html;profile=mcp-app', text: 5 }] }), 'unsupported_format');
  assert.deepEqual(await parse({ contents: [html] }, { uri: 'ui://a' }), { html: '<p>hi</p>', meta: undefined, metaSource: 'none' });
  const blob = { uri: 'ui://a', mimeType: 'text/html+mcp', blob: Buffer.from('<b>x</b>').toString('base64') };
  assert.equal((await parse({ contents: [blob] }, { uri: 'ui://a' })).html, '<b>x</b>');
  // _meta.ui: the content's wins over the listing's; parsed with the AppBridge chunk's McpUiResourceMetaSchema (dI).
  const meta = { ui: { csp: { connectDomains: ['https://esm.sh'] }, permissions: { clipboardWrite: {} } } };
  const fromContent = await parse({ contents: [{ ...html, _meta: meta }] }, { uri: 'ui://a', listingMeta: { ui: { domain: 'x' } } });
  assert.equal(fromContent.metaSource, 'content');
  assert.deepEqual(fromContent.meta.csp.connectDomains, ['https://esm.sh']);
  const fromListing = await parse({ contents: [html] }, { uri: 'ui://a', listingMeta: meta });
  assert.equal(fromListing.metaSource, 'listing');
  assert.deepEqual(fromListing.meta.permissions, { clipboardWrite: {} });
});

test('shared-78 WI: resources are read through the client and cached per server and uri', async () => {
  let reads = 0;
  const client = { readResource: async ({ uri }) => { reads++; return { contents: [{ uri, mimeType: 'text/html;profile=mcp-app', text: `<i>${uri}</i>` }] }; } };
  const a = await Frame.readUiResource(client, { uri: 'ui://cached', serverIdentifier: 's1', cacheEnabled: true });
  const b = await Frame.readUiResource(client, { uri: 'ui://cached', serverIdentifier: 's1', cacheEnabled: true });
  assert.equal(a, b);
  assert.equal(reads, 1);
  await Frame.readUiResource(client, { uri: 'ui://cached', serverIdentifier: 's2', cacheEnabled: true });
  await Frame.readUiResource(client, { uri: 'ui://cached', serverIdentifier: 's1' });
  assert.equal(reads, 3);
});

test('shared-78 XO / UI: a tool UI resource must be a ui:// uri', async () => {
  const uri = Frame.toolUiResourceUri;
  assert.equal(uri({ _meta: { ui: { resourceUri: 'ui://imagine/show-widget.html' } } }), 'ui://imagine/show-widget.html');
  assert.equal(uri({ _meta: { 'ui/resourceUri': 'ui://legacy' } }), 'ui://legacy');
  assert.equal(uri({ _meta: {} }), undefined);
  assert.equal(uri({}), undefined);
  assert.throws(() => uri({ _meta: { ui: { resourceUri: 'https://evil.example/app.html' } } }), /Invalid UI resource URI/);
  assert.throws(() => uri({ _meta: { ui: { resourceUri: 7 } } }), /Invalid UI resource URI/);
  const client = { listTools: async () => ({ tools: [{ name: 'show', _meta: { ui: { resourceUri: 'ui://w' } } }, { name: 'plain' }] }) };
  assert.deepEqual((await Frame.findToolUiResource(client, 'show')).uri, 'ui://w');
  assert.equal(await Frame.findToolUiResource(client, 'plain'), null);
  await assert.rejects(Frame.findToolUiResource(client, 'missing'), Frame.ToolNotFoundError);
});

test('shared-78 vI / HI and cd9b7fccf Fe / Le: allow list, host capabilities, withheld permissions, tool visibility', () => {
  assert.equal(Frame.devicePermissionsAllow({ camera: {}, clipboardWrite: {}, microphone: null, geolocation: undefined, usb: {} }), 'camera; clipboard-write');
  assert.equal(Frame.devicePermissionsAllow(undefined), '');
  assert.deepEqual(Frame.DEVICE_PERMISSION_FEATURES, { camera: 'camera', microphone: 'microphone', geolocation: 'geolocation', clipboardWrite: 'clipboard-write' });
  assert.deepEqual(Frame.hostCapabilitiesFor({}), {});
  const f = () => {};
  assert.deepEqual(Frame.hostCapabilitiesFor({ onopenlink: f, ondownloadfile: f, onUpdateModelContext: f, onmessage: f }),
    { openLinks: {}, downloadFile: {}, updateModelContext: { text: {}, image: {} }, message: { text: {} } });
  assert.deepEqual(Frame.hostCapabilitiesFor({ onmessage: f }), { message: { text: {} } });
  const permissions = { camera: {}, microphone: {}, geolocation: {}, clipboardWrite: {}, other: {} };
  assert.deepEqual(Renderer.withheldDevicePermissions(true, permissions), { other: {} });
  assert.equal(Renderer.withheldDevicePermissions(false, permissions), permissions);
  assert.equal(Renderer.isToolVisibleToApp({}), true);
  assert.equal(Renderer.isToolVisibleToApp({ _meta: { ui: { visibility: ['model', 'app'] } } }), true);
  assert.equal(Renderer.isToolVisibleToApp({ _meta: { ui: { visibility: ['model'] } } }), false);
  assert.equal(Renderer.isToolVisibleToApp({ _meta: { ui: { visibility: 'app' } } }), false);
  assert.deepEqual(Frame.frameSizeStyle('fullscreen', true, 300), { height: '100%' });
  assert.deepEqual(Frame.frameSizeStyle('inline', true, 6000, false, { width: 400, maxHeight: 5000 }), { height: '5000px' });
  assert.deepEqual(Frame.inlineFrameSizeStyle(undefined, true), { height: '0', transition: 'height 0.25s ease-out' });
  assert.deepEqual(Frame.inlineFrameSizeStyle(undefined, false), {});
  assert.equal(Frame.resolveDisplayMode('fullscreen', { availableDisplayModes: ['inline'], displayMode: 'inline' }), 'inline');
});

test('cc0e3547f Rt: view state must be a small JSON tree', () => {
  const check = Context.checkViewState;
  assert.deepEqual(check({ a: [1, 'x', null, true] }).ok, true);
  assert.equal(check({ __proto_key__: 1 }).reason, 'reserved_key');
  const cycle = {}; cycle.self = cycle;
  assert.equal(check(cycle).reason, 'not_a_tree');
  assert.equal(check({ a: undefined }).reason, 'not_json');
  assert.equal(check({ s: 'x'.repeat(262200) }).reason, 'too_large');
  let deep = 1; for (let i = 0; i < 40; i++) deep = [deep];
  assert.equal(check(deep).reason, 'too_deep');
  assert.equal(Context.SetViewStateRequestSchema.safeParse({ method: 'anthropic/set-view-state', params: { state: { a: 1 } } }).success, true);
  assert.equal(Context.SetViewStateRequestSchema.safeParse({ method: 'ui/message', params: { state: 1 } }).success, false);
});

test('cc0e3547f Ut / Yt: no account, so view state takes the refuse branch; deny-connectors is off (menus N4 / N5, E24)', async () => {
  let refused, none, deny;
  function Probe() {
    refused = Context.useMcpAppViewStateHost(null, { refuse: true });
    none = Context.useMcpAppViewStateHost(null);
    deny = Context.useDenyConnectors(['server-1']);
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(refused, Context.REFUSED_VIEW_STATE_HOST);
  assert.deepEqual(refused.hostContextExtras, {});
  assert.deepEqual(await refused.resolveHostContextExtras(), {});
  const error = await refused.onSetViewState({ a: 1 }).catch(e => e);
  assert.ok(error instanceof Error);
  assert.match(error.message, /^View state not saved: saving is unavailable for this view/);
  assert.equal(none, undefined, 'without refuse and without an account: no view-state host');
  assert.equal(deny, false, '__gb__4291763747 off (and Kt = !1 in 3.6556.2)');
  // The host's API fetch adapter: never reached without an account, and refuses if it is.
  await assert.rejects(Adapters.useClaudeApiFetch()('/api/frame/mcpapp/widget-state'), /not available in this host/);
  assert.deepEqual(Adapters.frameRequestHeaders('chat'), {});
  assert.equal(Adapters.readGrowthBookConfig('__gb__1932634900', null), null);
});

test('cbc7fd025: the conversation hash, and the host origin adapter for the oc-mcp-sandbox: scheme', async () => {
  const expected = createHash('sha256').update('session-1server-9').digest('hex').slice(0, 32);
  assert.equal(await Origin.conversationSandboxHash('session-1', 'server-9'), expected);
  const official = new URL('https://sandbox.claudemcpcontent.com/mcp_apps');
  assert.equal(Origin.withConversationSubdomain(official, expected, false).hostname, `${expected}.claudemcpcontent.com`);
  assert.equal(Origin.withConversationSubdomain(official, expected, true).hostname, `staging-${expected}.claudemcpcontent.com`);
  const local = new URL('oc-mcp-sandbox://sandbox/mcp_apps?x=1');
  // The original leaves non-claudemcpcontent hosts alone; the adapter gives the local scheme the same per-conversation host.
  assert.equal(Origin.withConversationSubdomain(local, expected, false).href, local.href);
  assert.equal(Adapters.withConversationOrigin(local, expected, false).href, `oc-mcp-sandbox://${expected}/mcp_apps?x=1`);
  assert.equal(Adapters.withConversationOrigin(official, expected, false).href, official.href);
  assert.equal(Origin.isOutsideSandboxDomain(local), true);
  // Stable origins are GrowthBook-gated (cai_misty_cascade): off, the URL is unchanged.
  const stable = new URL(`https://${expected}.claudemcpcontent.com/mcp_apps`);
  assert.equal((await Origin.withStableOriginHost(new URL(stable.href))).href, stable.href);
  assert.equal(Origin.sandboxHashInput(expected, new URLSearchParams('connect-src=a&evil=1')), null);
  assert.equal(Origin.sandboxHashInput(expected, new URLSearchParams('connect-src=a')), `claude-mcp-sandbox/v1\n${expected}\n["a",null,null,null]`);
  await assert.rejects(Origin.validateUiDomain(`${expected}.claudemcpcontent.com`, undefined), /cannot be used with local connectors/);
});

test('c131c9a32 AppBridge: ui/initialize handshake, notifications and handlers over a transport', async () => {
  const sent = [];
  const transport = { async start() {}, async send(message) { sent.push(message); }, async close() { this.onclose?.(); } };
  const client = { getServerCapabilities: () => ({}), request: async () => ({}), setNotificationHandler() {} };
  const capabilities = { ...Frame.hostCapabilitiesFor({ onmessage() {} }), logging: {}, sandbox: { permissions: { clipboardWrite: {} }, csp: undefined } };
  const bridge = new Bridge.AppBridge(client, { name: 'Claude', version: '1.0.0' }, capabilities, { hostContext: { theme: 'dark', displayMode: 'inline' } });
  const events = [];
  bridge.oninitialized = () => events.push('initialized');
  bridge.onsizechange = ({ width, height }) => events.push(`size ${width}x${height}`);
  bridge.onmessage = async params => { events.push(`message ${params.content[0].text}`); return {}; };
  await bridge.connect(transport);
  transport.onmessage({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: { protocolVersion: '2025-11-21', appInfo: { name: 'w', version: '1' }, appCapabilities: {} } });
  await tick();
  const init = sent.find(m => m.id === 1);
  assert.equal(init.result.protocolVersion, '2026-01-26');
  assert.deepEqual(init.result.hostInfo, { name: 'Claude', version: '1.0.0' });
  assert.deepEqual(init.result.hostContext, { theme: 'dark', displayMode: 'inline' });
  assert.deepEqual(init.result.hostCapabilities.message, { text: {} });
  transport.onmessage({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
  transport.onmessage({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { width: 320, height: 140 } });
  transport.onmessage({ jsonrpc: '2.0', id: 2, method: 'ui/message', params: { role: 'user', content: [{ type: 'text', text: 'hi' }] } });
  transport.onmessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'x', arguments: {} } });
  transport.onmessage({ jsonrpc: '2.0', id: 4, method: 'ui/request-display-mode', params: { mode: 'fullscreen' } });
  await tick();
  assert.deepEqual(events, ['initialized', 'size 320x140', 'message hi']);
  assert.deepEqual(sent.find(m => m.id === 2).result, {});
  assert.ok(sent.find(m => m.id === 3).error, 'no tools: tools/call is refused');
  assert.deepEqual(sent.find(m => m.id === 4).result, { mode: 'inline' });
  await bridge.sendSandboxResourceReady({ html: '<p>x</p>', csp: { connectDomains: [] }, permissions: {} });
  await bridge.sendToolInput({ arguments: { title: 't' } });
  await bridge.sendToolResult({ content: [{ type: 'text', text: 'done' }] });
  await bridge.sendHostContextChange({ theme: 'light' });
  assert.deepEqual(sent.slice(-4).map(m => m.method), ['ui/notifications/sandbox-resource-ready', 'ui/notifications/tool-input',
    'ui/notifications/tool-result', 'ui/notifications/host-context-changed']);
  assert.deepEqual(sent.at(-4).params, { html: '<p>x</p>', csp: { connectDomains: [] }, permissions: {} });
});

test('cd9b7fccf Ee: the postMessage transport only hears the sandbox window at its origin', async () => {
  const listeners = new Set();
  const host = { addEventListener: (type, fn) => listeners.add(fn), removeEventListener: (type, fn) => listeners.delete(fn) };
  const posted = [];
  const sandbox = { postMessage: (data, origin) => posted.push({ data, origin }) };
  const transport = new Renderer.PostMessageTransport(sandbox, 'oc-mcp-sandbox://abc', host);
  const got = [];
  transport.onmessage = message => got.push(message);
  await transport.start();
  const fire = event => { for (const fn of listeners) fn(event); };
  const message = { jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} };
  fire({ source: {}, origin: 'oc-mcp-sandbox://abc', data: message });
  fire({ source: sandbox, origin: 'https://evil.example', data: message });
  fire({ source: sandbox, origin: 'oc-mcp-sandbox://abc', data: { not: 'json-rpc' } });
  fire({ source: sandbox, origin: 'oc-mcp-sandbox://abc', data: message });
  assert.deepEqual(got, [message]);
  await transport.send({ jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: {} } });
  assert.deepEqual(posted, [{ data: { jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: {} } }, origin: 'oc-mcp-sandbox://abc' }]);
  await transport.close();
  assert.equal(listeners.size, 0);
  await transport.send({ jsonrpc: '2.0', method: 'x' });
  assert.equal(posted.length, 1, 'closed: nothing more is posted');
});

test('shared-78 II: anthropic:copy-text / copy-image need the sandbox origin and user activation', async () => {
  const posted = [];
  const sandbox = { postMessage: (data, origin) => posted.push({ data, origin }) };
  const copied = [];
  const relay = Frame.createRawMessageRelay({ getSandboxWindow: () => sandbox, sandboxOrigin: 'oc-mcp-sandbox://abc', hostWindow: {},
    onAttachFiles() {}, onElicitSubmit() {}, onCopyText: async text => { copied.push(text); } });
  const active = { userActivation: { isActive: true } };
  relay({ source: sandbox, origin: 'oc-mcp-sandbox://abc', data: { type: 'anthropic:copy-text', requestId: 'r1', text: 'hello' }, ...active });
  relay({ source: sandbox, origin: 'oc-mcp-sandbox://abc', data: { type: 'anthropic:copy-text', requestId: 'r2', text: 'nope' } });
  relay({ source: sandbox, origin: 'https://evil.example', data: { type: 'anthropic:copy-text', requestId: 'r3', text: 'evil' }, ...active });
  relay({ source: sandbox, origin: 'oc-mcp-sandbox://abc', data: { type: 'anthropic:copy-image', requestId: 'r4', blob: 'not a blob' }, ...active });
  await tick();
  assert.deepEqual(copied, ['hello']);
  // A refusal answers at once; an accepted copy answers when the host's copy settles.
  assert.deepEqual(posted.map(p => [p.data.type, p.data.requestId, p.data.ok, p.origin]), [
    ['anthropic:copy-text-result', 'r2', false, 'oc-mcp-sandbox://abc'], ['anthropic:copy-text-result', 'r1', true, 'oc-mcp-sandbox://abc']]);
});

test('shared-78 DI: the outer frame is sandboxed like the official one and waits for proxy-ready from its own window', async () => {
  const saved = { document: globalThis.document };
  const listeners = new Set();
  const win = { addEventListener: (t, fn) => t === 'message' && listeners.add(fn), removeEventListener: (t, fn) => listeners.delete(fn) };
  const frameWindow = {};
  const frame = { attrs: {}, style: {}, contentWindow: frameWindow, isConnected: true, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {} };
  const doc = { nodeType: 9, defaultView: win, visibilityState: 'visible', createElement: tag => { assert.equal(tag, 'iframe'); return frame; } };
  globalThis.document = doc;
  try {
    const url = new URL('https://abc.sandbox.example/mcp_apps?connect-src=https%3A%2F%2Fesm.sh');
    const { iframe, onReady } = await Frame.createSandboxProxyFrame(url, { clipboardWrite: {}, camera: {} }, 'visualize', 'Visual', { hostDocument: doc, readyTimeoutMs: 1000 });
    assert.equal(iframe, frame);
    assert.equal(frame.attrs.sandbox, 'allow-scripts allow-same-origin allow-forms');
    // The allow list follows the resource's permission keys (vI), after fullscreen.
    assert.equal(frame.attrs.allow, 'fullscreen *; clipboard-write *; camera *');
    assert.equal(frame.attrs.title, 'Visual');
    assert.equal(frame.src, url.href);
    const fire = event => { for (const fn of [...listeners]) fn(event); };
    fire({ source: {}, origin: url.origin, data: { method: 'ui/notifications/sandbox-proxy-ready' } });
    fire({ source: frameWindow, origin: 'https://evil.example', data: { method: 'ui/notifications/sandbox-proxy-ready' } });
    fire({ source: frameWindow, origin: url.origin, data: { method: 'ui/notifications/sandbox-proxy-ready' } });
    const ready = await onReady;
    assert.equal(ready.readyAfterLoadMs, null);
    const withheld = await Frame.createSandboxProxyFrame(url, { camera: {} }, 'x', undefined, { hostDocument: doc, readyTimeoutMs: 5, blockDevicePermissions: true });
    // 3.6556.2: withheld device permissions also turn picture-in-picture off.
    assert.equal(frame.attrs.allow, "picture-in-picture 'none'");
    const error = await withheld.onReady.catch(e => e);
    assert.ok(error instanceof Frame.McpAppSandboxSetupError);
    assert.equal(error.kind, 'timeout');
    // Host difference recorded in the MA-5 report: the official setup error names *.claudemcpcontent.com.
    assert.match(error.message, /claudemcpcontent\.com is not blocked/);
  } finally {
    globalThis.document = saved.document;
  }
});

test('cc0e3547f Tt and the gates: the hostContext the host sends, _keepMenuClear off, findServerTool off', () => {
  let ctx, keep, find, strings, sizes;
  function Probe() {
    ctx = Context.useMcpAppHostContext({ displayMode: 'inline', safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 } }).hostContext;
    keep = Context.useKeepMenuClear();
    find = Context.useFindServerTool('6f616b42-0ed8-571e-823f-ee4aca6b7ce9', 'show_widget');
    strings = Size.useVisualizeHostStrings('visualize');
    sizes = Size.useFontSizeVariables();
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(ctx.platform, 'desktop');
  assert.equal(ctx.theme, 'light');
  assert.deepEqual(ctx.availableDisplayModes, ['inline', 'fullscreen']);
  assert.deepEqual(ctx.containerDimensions, { width: 0, maxHeight: 5000 });
  assert.equal(ctx.displayMode, 'inline');
  assert.equal(ctx.styles.css.fonts, '', 'G4: no assets.claude.ai font faces');
  assert.equal(ctx.styles.variables['--color-background-primary'], Styles.MCP_APP_STYLE_VARIABLES['--color-background-primary']);
  assert.equal(ctx.styles.variables['--font-text-md-size'], Styles.fontSizeVariables(16)['--font-text-md-size']);
  assert.deepEqual(sizes, Styles.fontSizeVariables(16), '__gb__4158246511 off: the 16px ladder');
  assert.equal(keep, false);
  assert.equal(find, undefined);
  assert.equal(Context.KEEP_MENU_CLEAR_GATE, '__gb__1130162093');
  assert.equal(Size.useForceStableOrigin(), false);
  assert.equal(strings.moreLabel, 'More actions');
  assert.equal(strings.clipLabel, 'Copy as image');
  assert.equal(strings.notSent, 'Not sent:');
  assert.equal(strings.zoomLabel, undefined, 'catalog-less optional labels stay out');
  assert.match(Styles.MCP_APP_FONT_FACES, /assets\.claude\.ai\/Fonts/, 'the original text is kept in the generated module');
});

test('cc0e3547f ft: widget copies need iframe-originated activation and a focused frame', async () => {
  await assert.rejects(Context.copyWidgetText({ text: 'x', show() {}, host: {}, ownerWindow: {} }), /iframe-originated user activation/);
});

test('cd9b7fccf AppRenderer renders its container only on the server', () => {
  const html = renderToStaticMarkup(React.createElement(Renderer.AppRenderer, {
    client: { getServerCapabilities: () => ({}) }, sandboxProxyUrl: new URL('oc-mcp-sandbox://sandbox/mcp_apps'), toolName: 'show_widget',
    toolResourceUri: 'ui://imagine/show-widget.html', hostContext: {} }));
  assert.equal(html, '<div class="h-full w-full"></div>');
});

test('adapters: the theme follows html[data-mode], the closed findServerTool store refuses reads', () => {
  const win = (mode, dark) => ({ document: { documentElement: { dataset: { mode } } }, matchMedia: () => ({ matches: dark }) });
  assert.equal(Adapters.resolvedHostMode(win('dark', false)), 'dark');
  assert.equal(Adapters.resolvedHostMode(win('light', true)), 'light');
  assert.equal(Adapters.resolvedHostMode(win('system', true)), 'dark');
  assert.equal(Adapters.resolvedHostMode(win(undefined, false)), 'light');
  assert.throws(() => Adapters.mcpToolsStore.getState(), /gated off/);
  assert.equal(Adapters.readGrowthBookGate('__gb__1130162093'), false);
  assert.equal(Adapters.hostFontFaces, '');
  assert.equal(Adapters.isFizzyLakePart('type'), false);
  assert.equal(Adapters.isDesktopClient(), true);
  assert.equal(Adapters.isGrowthBookFeatureOn('__gb__4291763747'), false);
});
