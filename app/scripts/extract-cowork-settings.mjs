// w13-coworkui-settings (research/w13-coworkui.md §1.5, cwui-38..42; plan-w13.md "w13-coworkui-settings"): extract the
// 3.6556.2 Settings › Cowork page (c71860c77-CKIsHnA3 De, `t("main",{className:"flex flex-col gap-7",children:[p,g,_]})`).
// Own generator, own output folder src/generated/cowork-settings, own scripts/verify-gen-cowork-settings.mjs (found by
// prepare-ui.mjs). The page's sections, in the official order `_ = [pe, d&&fe, d&&de, U, H, d&&q, R, l&&W, u&&G, (d||f)&&me]`:
//
//   c71860c77  De (the page), pe (an empty slot), q (the browser group: cabd7b1c1 J Preferred browser, cdc95db1a f Open
//              links in built-in browser, cdc95db1a p Allowed sites when Ip), me / he / ge / ve (Memory: "Use memory in
//              sessions", the memory files, "No memories yet…"), J / Y (the Memory section and its skeleton).
//   cfea69990  P (Cowork files: "Your artifacts and scheduled tasks are stored at {path}.", Change / Use recommended, the
//              "Change location for Cowork files?" dialog with Copy and restart, the migrate error messages j).
//   cabd7b1c1  se / te (Trusted Cowork folders: Manage, the folder list dialog with Add folder / Remove / Done, "No trusted
//              folders yet."), J / q / K (Preferred browser, shown when Claude in Chrome is available).
//   ced6780ff  ye / Se / be / me (Global instructions: the row with Edit, the editor with Save / Cancel, the notice).
//   shared-1   xC / EC (the settings row and section the official settings pages share).
//
// Same engine as extract-cowork-runs.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features as text or
// looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias; E3 the React Compiler
// helpers come from view-tabs by semantic name). A binding resolves, in this order, to: a host adapter of this graph
// (src/source-cowork-settings-adapters.jsx; its original declaration must carry `features`; `overridesShared` lets it answer
// a binding routines-shared also holds, for this graph only), a host adapter routines-shared already uses (useIntl,
// FormattedMessage, useErrors, useAnalytics, usePathname, useSearchParams, useCurrentAccount), a React alias of
// vendor-frame, a semantic public name of view-tabs, a binding routines-shared holds, a binding a linked graph holds
// (cowork-scheduled, cowork-progress, transcript-rows: imported, never sliced twice), or a copy in this graph's module for
// its chunk. The blocked parts (cwui-43 Dispatch cfea69990 R, cwui-44 trusted devices c79197f2b Ve / Ie, the guest-pass
// referral c79197f2b Re, the session-host backend toggle cabd7b1c1 ee, the account instructions import ced6780ff Be) need
// a claude.ai account (E59) and are host adapters that render nothing; their official mount points are pinned in
// rawCallSites. --survey prints the closure without writing.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/cowork-settings');
const adapterModule = '../../source-cowork-settings-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const roots = {
  "c71860c77-CKIsHnA3.js": {
    De: { name: "CoworkSettingsPage", features: ['className: "flex flex-col gap-7"', 'variant: "locked"', 'd = x().onThisDevice,', '(d || f) && e(me, {})', 'u && e(G, {})'] },
  },
};
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand). Service / data vendors are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
const adapters = {
  'shared-25-DOWZRSlq.js': {
    cc: { name: 'useIsDesktopApp', overridesShared: true, features: ['typeof window > "u"', 'An(window.navigator.userAgent, { version: t, platform: n })'] },
    Z: { name: 'useCoworkSettingsAccount', features: ['"Must call inside CurrentAccountProvider"'] },
    dY: { name: 'useCoworkInstructionsSeparate', features: ['additionalPermittedStatusCode: 404, editing: e'] },
    Ui: { name: 'coworkFilePickers', features: ['globalThis["claude.settings"]?.FilePickers'] },
    Wi: { name: 'coworkAppPreferences', features: ['globalThis["claude.settings"]?.AppPreferences'] },
  },
  'shared-0-DDOOdL6P.js': {
    YS: { name: 'coworkLocalAgentModeSessions', features: ['globalThis["claude.web"]?.LocalAgentModeSessions'] },
    ZS: { name: 'coworkUserFiles', features: ['globalThis["claude.web"]?.CoworkUserFiles'] },
    QS: { name: 'coworkMemoryBridge', features: ['globalThis["claude.web"]?.CoworkMemory'] },
  },
  'shared-78-D5Fw2h0a.js': {
    CE: { name: 'useCoworkEnabled', features: ['{ enabled: !0, isLoading: !1 }', 'Ar().data !== void 0'] },
    xE: { name: 'useCoworkMemorySupported', features: ['"coworkKappa"'] },
    FO: { name: 'useUpdateAccountSettings', features: ['"/api/account/settings"', '"PATCH"'] },
    GT: { name: 'useClaudeInChromeAvailable', features: ['pw() === "answered"'] },
    lB: { name: 'useChromeExtensionMcpIntegration', features: ['"chrome_ext_mcp_integration"', '"claude_browser_extension"'] },
    NR: { name: 'useClaudeInChromeConnectorEnabled', features: ['MR.useEnabled'] },
    lh: { name: 'useGate2142364912OrForeignOrg', features: ['"__gb__2142364912"', 'featureFlagsOrgUuid'] },
  },
  'shared-18-D3y8YMFN.js': {
    Ov: { name: 'useCoworkAdditionalDirectoriesClaudeMd', features: ['enableAdditionalDirectoriesClaudeMd ?? !1'] },
    fv: { name: 'useCoworkPreferredBrowser', features: ['cowork_preferred_browser', '"coworkPreferredBrowser" in n'] },
    pv: { name: 'useCoworkRemoteClaudeBrowser', features: ['"cowork_remote_claude_browser"'] },
    Tv: { name: 'useOpenLinksInBuiltInBrowserAvailable', features: ['openExternalLinkInPreview'] },
    Ev: { name: 'usePreviewAllowedSitesAvailable', features: ['getPreviewAllowedOrigins'] },
  },
  'shared-52-uHFNjl7C.js': {
    YO: { name: 'useCoworkHostLocation', features: ['{ onThisDevice: e }'] },
  },
  'shared-104-CTONUSaz.js': {
    pI: { name: 'coworkSessionHostReadState', features: ['n.state === "signIn" ? n : void 0'] },
    cI: { name: 'useCoworkPlacement', features: ['"sessionHost"', '{ onThisDevice: e } = qn()'] },
    JR: { name: 'CoworkPlacementBoundary', features: ['mode: "latest"', 'children: t(r)'] },
  },
  'shared-1-BJhqMmkf.js': {
    Mx: { name: 'useGate3213217663', features: ['"__gb__3213217663"'] },
  },
  'c79197f2b-DdO-gXlI.js': {
    Ve: { name: 'CoworkTrustedDevicesSetting', features: ['t(He, {})'] },
    Ie: { name: 'CoworkTrustedDevicesList', features: ['action: "highlight-local-devices"'] },
    Re: { name: 'CoworkGuestPassReferral', features: ['"cowork_referrals"', 'CLAUDE_CODE_GUEST_PASS'] },
  },
  'cbef3b9e7-D1tReYw7.js': {
    s: { name: 'CoworkLockedNotice', features: ['headlineLevel: l', 'ctaBusyLabel: S'] },
  },
  'cfea69990-BIgEsLcf.js': {
    R: { name: 'CoworkDispatchRow', features: ['"dispatch_sessions_bridge_toggle"'] },
  },
  'cabd7b1c1-BLDBBA7m.js': {
    ee: { name: 'CoworkBackendToggle', features: ['"switch_to_local_settings"', 'action: "highlight-cowork-backend"'] },
  },
  'ced6780ff-B4OnNWkF.js': {
    Be: { name: 'CoworkLocalInstructionsImport', features: ['antOnly: o', 'accountUuid: t'] },
    ve: { name: 'useCoworkGlobalInstructionsProfile', features: ['additionalPermittedStatusCode: 404', 'notKept: a'] },
  },
  'cdef253bf-DfRc8pJ9.js': {
    j: { name: 'useCoworkMemories', features: ['t === "sessionHost" && !!i', '"memory write not taken"'] },
  },
  'ce61829b3-DZ5WodUS.js': {
    n: { name: 'useOpenLinksInBuiltInBrowser', features: ['return t(e, !0);'] },
  },
  'ce3a18f86-BH8aHGSP.js': {
    r: { name: 'PreviewAllowedSitesModal', features: ['"preview_allowed_sites_modal"', 'PreviewAllowedSitesModal'] },
  },
};
const linkedDirs = ['cowork-scheduled', 'cowork-progress', 'transcript-rows'];
const rawCallSites = [
  { source: 'c71860c77-CKIsHnA3.js', role: 'De: the desktop page order (Dispatch and Cowork files on this device, Trusted folders, the backend toggle, the browser group, the guest pass, Global instructions or the account import, Memory)',
    features: ['children:[e(pe,{}),d&&e(fe,{}),d&&e(de,{}),e(U,{}),e(H,{}),d&&e(q,{}),e(R,{}),l&&e(W,{}),u&&e(G,{}),(d||f)&&e(me,{})]',
      't("main",{className:"flex flex-col gap-7",children:[p,g,_]})', 'l=o&&c,u=o&&!c,d=x().onThisDevice,f=O()!=="device"'] },
  { source: 'c71860c77-CKIsHnA3.js', role: 'De imports: B / z / R are c79197f2b (trusted devices, guest pass), fe is cfea69990 t (Dispatch), H is cabd7b1c1 r (the backend toggle), G is ced6780ff t (the account import)',
    features: ['import{n as R,r as z,t as B}from"./c79197f2b-DdO-gXlI.js"', 'import{n as de,t as fe}from"./cfea69990-BIgEsLcf.js"',
      'import{a as V,r as H,t as U}from"./cabd7b1c1-BLDBBA7m.js"', 'import{n as W,t as G}from"./ced6780ff-B4OnNWkF.js"'] },
  { source: 'cfea69990-BIgEsLcf.js', role: 'Dispatch (cwui-43) needs the phone pairing of a claude.ai account: hidden unless the bridge state reads',
    features: ['if(c===!0&&!y&&S(!0),!e&&!v||!i||c===null||a&&!y)return null', '{defaultMessage:"Dispatch",id:"MIchTR1xRO"}'] },
  { source: 'c79197f2b-DdO-gXlI.js', role: 'Trusted devices (cwui-44) need the account device registry',
    features: ['label:{defaultMessage:"Require trusted devices",id:"RCOlr8yhsq"}', 'action:"highlight-local-devices"'] },
  { source: 'shared-46-BIbZBGFq.js', role: 'Settings nav: the Cowork entry right after Claude Code, icon Fp (Tasks)',
    features: [{ loose: 'e.push({id:"cowork",href:"/settings/cowork",label:t,name:a.formatMessage({defaultMessage:"Cowork",id:"+MH0VdRCHz"}),icon:Fp})' }, 'Fp={name:"Tasks"'] },
  { source: 'ca25db325-TTHrVIfM.js', role: 'Settings search index: the Cowork page rows',
    features: ['{section:"cowork",label:{defaultMessage:"Cowork files",id:"ciLKOe5nmN"},desktopOnly:!0,localSessionRow:!0}',
      '{section:"cowork",label:{defaultMessage:"Trusted Cowork folders",id:"5UZ7woP+0X"},hideCoworkLabel:"12iymmb",desktopOnly:!0}'] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'arguments']);

async function readSource(name, cache) {
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
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
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
const normalised = text => text.replace(/\s+/g, ' ');
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
async function resolveImport(entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function viewTabsGraph() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Set();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, pending };
}
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice): cowork-progress (the
// cc5a62f6f panel Section L, row classes T, the flat / shrink contexts w / ne, the card surface ie), cowork-scheduled
// (c1dd841c3 o the run origin badge, shared-16 Xp the open-entity messages), cowork-home (shared-0 ia / ra, the remote
// session id test), proposal-group (shared-52 rd, the cse_ → session_ id normaliser). Only held bindings the linked module
// exports are imported (by its export name); their host adapters are not borrowed.
async function linkedGraphs() {
  const held = new Map();
  for (const dir of linkedDirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    for (const mod of manifest.modules) {
      // proposal-group keeps the official file names (no target field).
      const target = mod.target ?? mod.source;
      const exported = await moduleExports(path.join(root, 'src/generated', dir, target));
      for (const b of mod.bindings) {
        const key = `${mod.source}#${b.name}`;
        if (!held.has(key) && exported.has(b.name)) held.set(key, { dir, target, sha256: b.sha256, exportName: exported.get(b.name) });
      }
    }
  }
  return held;
}
// local -> exported name of a generated module's `export { … }` lists.
async function moduleExports(file) {
  const text = await fs.readFile(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
async function routinesSharedGraph() {
  const manifest = await routinesSharedManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractCoworkSettings({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const rs = await routinesSharedGraph();
  const linked = await linkedGraphs();
  const resolved = new Map();
  const chunks = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set(), linked: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (rs.held.has(key) && !adapter.overridesShared) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(src, local)) {
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (published.has(key)) {
      result = { kind: 'view-tabs', name: published.get(key), file };
    } else if (held.has(key)) {
      if (!pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, file, pendingName: pending.get(key) };
    } else if (rs.held.has(key)) {
      const h = rs.held.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: routines-shared holds a different declaration; rerun its generator`);
      result = { kind: 'routines-shared', name: local, target: h.target };
    } else if (linked.has(key)) {
      const h = linked.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: ${h.dir} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', name: h.exportName, from: `../${h.dir}/${h.target}` };
    } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'routines-shared': 'routinesShared', linked: 'linked' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      await visit(`${target.file}#${target.local}`, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }

  if (survey) {
    for (const p of problems) console.log('PROBLEM', p);
    for (const [file, locals] of chunks) console.log('CHUNK', file, [...locals].join(' '));
    for (const [k, set] of Object.entries(used)) console.log('USED', k, [...set].map(key => `${key}=>${resolved.get(key).name}`).join(' '));
    return null;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-settings.mjs', adapterModule: 'src/source-cowork-settings-adapters.jsx',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx', publicNames: {}, modules: [], contexts: [], callSites: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') spec = { from: `../routines-shared/${cls.target}`, name: cls.name, kind: 'routines-shared' };
        else if (cls.kind === 'linked') spec = { from: cls.from, name: cls.name, kind: 'linked' };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`) || linked.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
    }
    const groups = new Map();
    const namespaceLines = [];
    for (const [local, spec] of imports) {
      if (spec.name === '*') { namespaceLines.push(`import * as ${local} from ${JSON.stringify(spec.from)};`); continue; }
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).concat(namespaceLines.sort()).join('\n');
    const emittedNodes = new Set();
    const blocks = order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => emittedText(src, entry));
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-settings.mjs.\n// Edit the extractor or src/source-cowork-settings-adapters.jsx, never this file.\n`;
    const target = moduleName(file);
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
    });
  }
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../routines-shared/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(spec.export !== undefined && { export: spec.export }), ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the cowork-settings roots; generated by extract-cowork-settings.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
  manifest.linkedImports = [...used.linked].sort().map(key => ({ original: key, from: resolved.get(key).from, name: resolved.get(key).name }));
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  // pendingDedupe: copies of this graph that another 3.6556.2 generated graph also holds without exporting them (D1 debt for
  // a later cleanup lane; empty means every held binding this closure reaches is imported).
  manifest.pendingDedupe = [];
  const copies = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const dir of (await fs.readdir(path.join(root, 'src/generated'))).sort()) {
    if (dir === 'cowork-settings') continue;
    const other = await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8').then(JSON.parse, () => null);
    if (other?.referenceVersion !== referenceVersion) continue;
    for (const mod of other.modules ?? []) for (const b of mod.bindings ?? []) {
      const key = `${mod.source}#${typeof b === 'string' ? b : b.name}`;
      if (copies.has(key)) manifest.pendingDedupe.push({ original: key, heldBy: dir });
    }
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork settings output set changed: ${present.join(',')}. Run scripts/extract-cowork-settings.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork settings source mismatch: ${name}. Run scripts/extract-cowork-settings.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork settings modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkSettings({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
