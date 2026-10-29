// Small source-owned helpers from the current installed renderer.
//
// Every target reads Claude Desktop 3.6556.2: the renderer chunks (`v3Source`, official.ionSource) or the main-process
// build (`v3Desktop`, official.asarSource); the manifest records 3.6556.2 at the top and on every module (W10
// w10-cleanup-cc-public retired the 2.42304.0 / 2.37337.1 source directories). Target ownership (plan §4 / D19): each
// lane edits only its own emit lines and runs `--only <targets>` / `--check --only <targets>`; the shared constants,
// emit() and selectBinding() belong to w1-infra (wave 7: w7-cleanup; W10: w10-cleanup-cc-public).
//   csv-parser … owner-window                                   w2-btw-approval
//   sidebar-row-primitive … sidebar-row-view                    w2-sidebar-current-a
//   sidebar-family-sort … sidebar-bulk-* / session-cycle-*      w2-sidebar-current-b (sidebar-filter-controls,
//                                                               sidebar-filter-view: w3-sidebar-sections-gen, E38;
//                                                               session-cycle-step: w10-ccres-cycle-step)
//   side-session-prompt                                         w2-tr-turn
//   sessions-page-*                                             cc-rest-sessions-view / w10-ccres-hf-gen
//   csv-model / csv-view / document-frame                       cc-rest-csv
//   tab-focus-* / environment-form-layout                       cc-rest-transcript / cc-rest-env-ui
//   button-press / tooltip-structure                            w2-cds-followup
//   grapheme-prefix … surface-chord                             w2-titlebar-current
//   environment-* (except composer-focus-capability)            cc-rest-env-* (W8/W9)
//   composer-focus-capability / mention-output-files /
//   composer-composition                                        w3-composer-host
//   nested-session-*                                            w2-sidebar-resize-nested (nested-session-parts:
//                                                               w10-ccres-nested-parts)
//   file-* / breadcrumb-* / path-tooltip (mapped ones)          w2-files (path-tooltip: composer map cc5c56f5c, E39)
//   terminal-*                                                  cc-rest-terminal-a/-b (terminal-tab-overflow:
//                                                               w10-trans-tab-overflow)
//   sidebar-running-mark                                        w12b-frame-titlebar-sidebar
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import * as official from './official-3.6556.2.mjs';
const root = path.resolve(import.meta.dirname, '..');
// Only the base a module's manifest `source` is written relative to (`../../../../snapshots/claude-3.6556.2-…/…`);
// nothing is read from it. It stays the first round's directory so those paths keep their shape: session-rail-kit and
// session-rail-changes pick code-current modules by `/${referenceSnapshot}/` in `source`, and tests resolve it.
const manifestSourceBase = path.resolve(root, '../reference/installed-2.37337.1-20261015/ion-dist/assets/v1');
const output = path.join(root, 'src/generated/code-current');
// The two 3.6556.2 source directories: the renderer chunks (default) and the main-process build (the snapshot has no
// ion-dist/desktop; those chunks ship in the asar build).
const v3Source = official.ionSource;
const v3Desktop = official.asarSource;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// `selections[name]` emits one expression from binding `name` instead of its whole declaration, as
// `function name(parameters) { return <fragment>; }`. The owner must contain exactly one match:
//   {local, direct?, initType?} the init of a nested `local = …` (direct) or the body of its first-argument callback;
//                          `initType` (an AST node type) keeps only the declarators whose init has that type
//   {call, argument}       a `call(argument, …)` call
//   {assignment}           the right side of `assignment = …`
//   {test, callee?}        the consequent of the conditional whose test is this source text (prettier-formatted)
//   {conditional, whole}   the whole conditional whose test is this source text; `whole: true` is required
//   {ifTest, result, cache} (3.6556.2, React Compiler output) the block of the `if (…)` / `else if (…)` whose test is
//                          this source text, as the component body: the owner's own compiler-cache declarator `cache`
//                          (`$ = J9(n)`, so the block's slots keep their indices), then the block's statements, then
//                          `return result` (the local the block assigns its element to)
export function selectBinding(code, ast, name, config) {
  if (config.conditional !== undefined && config.whole !== true) throw Error(`Selection ${name}: conditional needs whole: true`);
  const declaration = ast.program.body.find(node => node.id?.name === name) ?? ast.program.body.flatMap(node=>node.declarations??[]).find(node=>node.id?.name===name);
  if (!declaration) throw Error(`Missing selection owner ${name}`);
  const matches = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (config.local && node.type === 'VariableDeclarator' && node.id.name === config.local && (!config.initType || node.init?.type === config.initType)) matches.push(config.direct ? node.init : node.init.arguments[0].body);
    if (config.call && node.type==='CallExpression' && node.callee.name===config.call && node.arguments[0]?.name===config.argument) matches.push(node);
    if (config.assignment && node.type==='AssignmentExpression' && node.left.name===config.assignment) matches.push(node.right);
    if (config.test && node.type === 'ConditionalExpression' && code.slice(node.test.start, node.test.end) === config.test && (!config.callee || node.consequent.callee?.name === config.callee)) matches.push(node.consequent);
    if (config.conditional && node.type === 'ConditionalExpression' && code.slice(node.test.start, node.test.end) === config.conditional) matches.push(node);
    if (config.ifTest && node.type === 'IfStatement' && code.slice(node.test.start, node.test.end) === config.ifTest && node.consequent.type === 'BlockStatement') matches.push(node.consequent);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  };
  visit(declaration);
  if (matches.length !== 1) throw Error(`Ambiguous ${name} branch ${config.conditional ?? config.test ?? config.ifTest}${matches.length ? ` (${matches.length} matches)` : ' (no match)'}`);
  const fragment = code.slice(matches[0].start, matches[0].end);
  if (config.ifTest) {
    const cache = declaration.body?.body?.[0]?.declarations?.find(d => d.id.name === config.cache);
    if (!cache) throw Error(`Selection ${name}: no compiler cache ${config.cache} opens the owner`);
    const record = { binding: name, ifTest: config.ifTest, result: config.result, cache: code.slice(cache.start, cache.end), fragmentSha256: sha(fragment), parameters: config.parameters };
    return { text: `function ${name}(${config.parameters}) { let ${record.cache}, ${config.result}; ${fragment.slice(1, -1)} return ${config.result}; }`, record };
  }
  const record = { binding: name, ...(config.conditional ? {conditional:config.conditional,whole:true} : config.test ? {test:config.test,callee:config.callee} : config.call ? {call:config.call,argument:config.argument} : config.assignment ? {assignment:config.assignment} : {local:config.local,...(config.direct?{direct:true}:{}),...(config.initType?{initType:config.initType}:{})}), fragmentSha256: sha(fragment), parameters: config.parameters };
  return { text: `function ${name}(${config.parameters}) { return ${fragment}; }`, record };
}
// `only` limits a run to the listed targets so parallel migration lanes can regenerate or check their own helpers
// while other lanes edit theirs. Skipped targets keep their existing manifest entry in its emit position, so a
// partial run writes the same manifest a full run would. Writes are serialized with a directory lock.
export async function extractCurrentCodeHelpers(options = {}) {
  if (options.check) return extractHelpers(options);
  const lock = path.join(output, '.extract-lock');
  await fs.mkdir(output, { recursive: true });
  for (let waited = 0; ; waited += 250) {
    try { await fs.mkdir(lock); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = await fs.stat(lock).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 180_000) { await fs.rm(lock, { recursive: true, force: true }); continue; }
      if (waited > 600_000) throw Error(`Timed out waiting for ${lock}`);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  try { return await extractHelpers(options); } finally { await fs.rm(lock, { recursive: true, force: true }); }
}
async function extractHelpers({ check = false, only = null } = {}) {
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, modules: [] };
  const selected = target => !only || only.has(target);
  const previous = only ? new Map(JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8').catch(() => '{"modules":[]}')).modules.map(entry => [entry.target, entry])) : new Map();
  const mismatches = [];
  async function emit(prefix, target, names, imports, exports, directory = v3Source, selections = {}) {
    if (!selected(target)) { if (previous.has(target)) manifest.modules.push(previous.get(target)); return; }
    if (![v3Source, v3Desktop].includes(directory)) throw Error(`${target}: emits read 3.6556.2 (v3Source or v3Desktop), not ${directory}`);
    const candidates = (await fs.readdir(directory)).filter(name => prefix.endsWith('.js') ? name === prefix : name.startsWith(prefix + '-') && name.endsWith('.js'));
    if (candidates.length !== 1) throw Error(`Ambiguous source ${prefix}`);
    const name = candidates[0], bytes = await fs.readFile(path.join(directory, name));
    const code = await format(bytes.toString(), { parser: 'babel' });
    const ast = parsers.babel.parse(code, {});
    const selectedFragments = [];
    const blocks = names.map(name => {
      if (selections[name]) {
        const { text, record } = selectBinding(code, ast, name, selections[name]);
        selectedFragments.push(record);
        return text;
      }
      for (const node of ast.program.body) {
        if (node.id?.name === name) return code.slice(node.start, node.end);
        const d = node.declarations?.find(d => d.id.name === name);
        if (d) return `var ${code.slice(d.start, d.end)};`;
      }
      throw Error(`Missing ${name} in ${prefix}`);
    });
    const referenceVersion = official.referenceVersion;
    const text = await format(`// Original Claude Desktop ${referenceVersion} bindings; generated by extract-code-ui-current.mjs.\n${imports}\n${blocks.join('\n')}\n${exports}`, { parser: 'babel' });
    manifest.modules.push({ referenceVersion, source: path.relative(manifestSourceBase, path.join(directory, name)), sourceSha256: sha(bytes), target, sha256: sha(text), bindings: names, ...(selectedFragments.length ? { sourceSelections: selectedFragments } : {}) });
    if (check) { if (await fs.readFile(path.join(output, target), 'utf8').catch(() => null) !== text) mismatches.push(`Current Code helper mismatch: ${target}`); }
    else { await fs.mkdir(path.dirname(path.join(output, target)), { recursive: true }); await fs.writeFile(path.join(output, target), text); }
  }
  if (!check) await fs.mkdir(output, { recursive: true });
  // csv-parse and its Buffer shim are self-contained: retain the shipped bytes.
  // w2-btw-approval: read from 3.6556.2 (the chunk keeps its name and bytes from 2.42304.0 and 2.37337.1).
  const csvVendorName = 'c63ad9d34-BwRS70iU.js';
  if (selected('csv-parser-vendor.mjs')) {
    const csvVendor = await fs.readFile(path.join(v3Source, csvVendorName));
    manifest.modules.push({ referenceVersion: official.referenceVersion, source: path.relative(manifestSourceBase, path.join(v3Source, csvVendorName)), sourceSha256: sha(csvVendor), target: 'csv-parser-vendor.mjs', sha256: sha(csvVendor), bindings: [], transform: 'byte-for-byte' });
    if (check) { if (!csvVendor.equals(await fs.readFile(path.join(output, 'csv-parser-vendor.mjs')).catch(() => Buffer.alloc(0)))) mismatches.push('Current CSV parser vendor mismatch'); }
    else await fs.writeFile(path.join(output, 'csv-parser-vendor.mjs'), csvVendor);
  } else if (previous.has('csv-parser-vendor.mjs')) manifest.modules.push(previous.get('csv-parser-vendor.mjs'));
  // w2-btw-approval (3.6556.2): pure renames, each binding identical to its 2.42304.0 original after identifier
  // normalisation (checked declaration by declaration; c02d6193d-C2yr-dVD.js keeps its name and bytes).
  await emit('c02d6193d-C2yr-dVD.js', 'csv-parser.mjs', ['n','r','i','a','o','s','c','l','u','d','f','p','m'], "import { n as e, t } from './csv-parser-vendor.mjs';", 'export { m as parseCsvPreview };', v3Source);
  // shared-78 Ky (exported nS; 2.42304.0 Hv).
  await emit('shared-78', 'string-count.mjs', ['Ky'], '', 'export { Ky as countOccurrences };', v3Source);
  // shared-2 cU / lU / fU (fU exported ts; 2.42304.0 EI / DI / AI).
  await emit('shared-2', '../../../electron/generated/string-grapheme-limit.mjs', ['cU','lU','fU'], '', 'export { fU as graphemeSafeLimit };', v3Source);
  // c73f45bc3 Mf / Nf / Ff / Lf (2.42304.0 Su / Cu / Tu / Du); Ff reads `ts as vn` = shared-2 fU. cccc2cf0a ux
  // (2.42304.0 ey) reads `ap as ke` = shared-25 hf, the owner-document below (shared-25 df / ff / hf, 2.42304.0
  // cp / lp / fp, hf exported ap). Export names stay.
  await emit('c73f45bc3', '../../../electron/generated/btw-title.mjs', ['Mf','Nf','Ff','Lf'], "import {graphemeSafeLimit as vn} from './string-grapheme-limit.mjs';", 'export { Mf as btwTitleLimit, Nf as btwTitlePrefix, Ff as btwTitle, Lf as btwTitleWords };', v3Source);
  // cc-rest-btw-focus (3.6556.2, research/code-current-rest.md §2.1/§2.3/§3 P2): the focus intent moved from c5259f582
  // (2.42304.0 H/de/U/W/G/fe/K/me) to c03935b01 Vr/Hr/Ur/Wr/Gr/Kr/qr/Zr and changed shape: remember (qr, exported Nn)
  // stores `{...options, askedAt}` and the intent hook (Zr, In) returns that record, or null when stale, instead of a
  // boolean; Jr (En) applies one to a composer (`afterKeyPress` → ignoreStrayEnter, then scheduleFocus), as cccc2cf0a
  // `f && ql(o.current, f)` does. Kr (kn) keeps the capture listeners. p is vendor-frame wo (useState); J9 / J1 / K1 are
  // view-tabs' compiler helpers (E3). Export names stay; focusBtwComposer is new.
  // w10-ccres-e31-btw (w10-trans-btw-focus, E44): Xr / Yr (Mn / On; cccc2cf0a `ou` = nT's keyboard Dismiss, `cu` = the
  // tab strip's onReselect) are sliced too. They read the draft hook ni's composer registry Rr (`Rr.set(t, e)` with
  // `{composerRef, keptFor, setInitialDraft}`, deleted on unmount when still its own); the host adapter
  // src/btw-composer-registry.mjs is that Map, which each /btw child composer fills with its `{composerRef}` while mounted.
  if (selected('btw-focus-intent.mjs')) {
    // Pinned against the raw chunk: each binding's whole declaration has its looseFeature shape (literals, keys and
    // member names stay; short locals generalise), the chunk exports the six under the aliases cccc2cf0a / c73f45bc3
    // import (En / In / Nn / kn / Mn / On; Rr is pinned but not sliced: the host adapter is that Map), and p / J9 / J1 / K1 are still the vendor-frame / shared-frame imports named below.
    const label = 'btw-focus-intent.mjs (c03935b01-yhcY34vt.js)', raw = await fs.readFile(path.join(v3Source, 'c03935b01-yhcY34vt.js'), 'utf8');
    const body = parsers.babel.parse(raw, {}).program.body;
    const declared = new Map(body.flatMap(n => n.type === 'FunctionDeclaration' ? [[n.id.name, n]] : (n.declarations ?? []).map(d => [d.id.name, d])));
    const shapes = { Vr: 'Vr=new Map', Hr: 'Hr=1e3', Ur: 'Ur=0', Wr: 'Wr=new WeakSet', Gr: 'function Gr(){Ur=performance.now()}',
      Kr: 'function Kr(e){return e&&!Wr.has(e)&&(Wr.add(e),e.addEventListener("keydown",Gr,!0),e.addEventListener("pointerdown",Gr,!0)),performance.now()}',
      qr: 'function qr(e,t,n){Vr.set(e,{...n,askedAt:t})}', Jr: 'function Jr(e,t){t?.afterKeyPress&&e?.ignoreStrayEnter(),e?.scheduleFocus()}',
      Rr: 'Rr=new Map', Yr: 'function Yr(e){Rr.get(e)?.composerRef.current?.ignoreStrayEnter()}',
      Xr: 'function Xr(e,t,n){let r=Rr.get(e)?.composerRef.current;r?Jr(r,n):qr(e,t,n)}',
      Zr:'function Zr(e){let $=J9(2),t=J1($,0,e)?K1($,0,e,()=>{let t=Vr.get(e);return Vr.delete(e),t!==void 0&&Ur<=t.askedAt+Hr?t:null}):$[1],[n]=p(t);return n}' };
    for (const [name, shape] of Object.entries(shapes)) {
      const node = declared.get(name);
      if (!node || !new RegExp(`^${official.looseFeature(shape).source}$`).test(raw.slice(node.start, node.end))) throw Error(`${label}: ${name} is no longer ${shape}`);
    }
    const exported = new Map(body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    for (const [alias, local] of Object.entries({ En: 'Jr', In: 'Zr', Nn: 'qr', kn: 'Kr', Mn: 'Xr', On: 'Yr' })) if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
    // The registry entry the host adapter mirrors: ni registers `{composerRef, keptFor, setInitialDraft}` per session while
    // shown and removes only its own entry (keptFor / setInitialDraft feed Br's kept-draft restore, which the host has not).
    const register = 'if(!n||!o)return;let e={composerRef:n,keptFor:i,setInitialDraft:d};return Rr.set(t,e),Br(t,e),()=>{Rr.get(t)===e&&Rr.delete(t)}';
    if (!declared.get('ni') || !official.looseFeature(register).test(raw.slice(declared.get('ni').start, declared.get('ni').end))) throw Error(`${label}: ni no longer registers ${register}`);
    const imported = new Map(body.filter(n => n.type === 'ImportDeclaration').flatMap(n => n.specifiers.map(s => [s.local.name, `${n.source.value}:${s.imported?.name}`])));
    for (const [local, via] of Object.entries({ p: `./${official.vendorFrame}:wo`, J9: `./${official.sharedFrame}:ip`, J1: `./${official.sharedFrame}:Qf`, K1: `./${official.sharedFrame}:op` }))
      if (imported.get(local) !== via) throw Error(`${label}: ${local} imports ${imported.get(local)}, not ${via}`);
    official.assertVendorAlias(await fs.readFile(path.join(v3Source, official.vendorFrame), 'utf8'), 'wo', ['react', 'useState']);
  }
  await emit('c03935b01', 'btw-focus-intent.mjs', ['Vr','Hr','Ur','Wr','Gr','Kr','qr','Jr','Yr','Xr','Zr'], "import {useState as p} from 'react'; import {reactMemoCache as J9,memoChanged1 as J1,memoStore1 as K1} from '../view-tabs/shared-frame-6jtSkIit.js'; import {btwComposerRegistry as Rr} from '../../btw-composer-registry.mjs';", 'export {Kr as captureBtwFocus,qr as rememberBtwFocus,Jr as focusBtwComposer,Yr as armBtwSessionComposer,Xr as focusBtwSessionComposer,Zr as useBtwFocusIntent};', v3Source);
  // w10-ccres-e31-btw (w10-trans-btw-focus): c9bc99274 b (exported i; cccc2cf0a imports it as P_ and its onReselect does
  // `t && (cu(e), P_(t)?.focus())` over the tab strip's [data-pane-root]): the pane's focus target, its
  // [data-tile-focus-target] (a, exported t; c227f4d5e puts it on the composer textbox) when focusable, else the first
  // focusable text field (u). Plain DOM functions with no imports (the chunk's c7f8992b4 import feeds only the tile host).
  if (selected('pane-focus-target.mjs')) {
    const label = 'pane-focus-target.mjs (c9bc99274-DTZfHMJt.js)', raw = await fs.readFile(path.join(v3Source, 'c9bc99274-DTZfHMJt.js'), 'utf8');
    const body = parsers.babel.parse(raw, {}).program.body;
    const declared = new Map(body.flatMap(n => n.type === 'FunctionDeclaration' ? [[n.id.name, n]] : (n.declarations ?? []).map(d => [d.id.name, d])));
    const shapes = { a: 'a="data-tile-focus-target"', c: `c='[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]'`,
      l: 'l=`a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex],${c}`', u: 'u=`textarea,input[type="text"],input[type="search"],input:not([type]),${c}`',
      f: 'function f(e){return"focus"in e&&typeof e.focus=="function"}',
      _: `function _(e){return!f(e)||!(e.tabIndex>=0||e.matches(c)&&!e.hasAttribute("tabindex"))||"disabled"in e&&e.disabled===!0||e.classList.contains("tiles-drag-handle")||e.closest("[inert],[hidden],[aria-hidden='true']")!==null?!1:typeof e.checkVisibility!="function"||e.checkVisibility({visibilityProperty:!0})}`,
      v: 'function v(e,t=l){for(let n of e.querySelectorAll(t))if(_(n))return n;return null}',
      y: 'function y(e){let t=e.querySelector(`[${a}]`);return t===null?null:_(t)?t:v(t)}', b: 'function b(e){return y(e)??v(e,u)}' };
    for (const [name, shape] of Object.entries(shapes)) {
      const node = declared.get(name);
      if (!node || !new RegExp(`^${official.looseFeature(shape).source}$`).test(raw.slice(node.start, node.end))) throw Error(`${label}: ${name} is no longer ${shape}`);
    }
    const exported = new Map(body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    for (const [alias, local] of Object.entries({ i: 'b', t: 'a' })) if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  }
  await emit('c9bc99274', 'pane-focus-target.mjs', ['a','c','l','u','f','_','v','y','b'], '', 'export {a as tileFocusTargetAttribute,b as paneFocusTarget};', v3Source);
  await emit('shared-25', 'owner-document.mjs', ['df','ff','hf'], '', 'export {hf as ownerDocument};', v3Source);
  await emit('cccc2cf0a', 'pane-focus-owner.mjs', ['ux'], "import {ownerDocument as ke} from './owner-document.mjs';", 'export {ux as paneOwnsFocus};', v3Source);
  // cc-rest-transcript (3.6556.2, research/code-current-rest.md §2/§4.1): shared-25 pf / mf (exported up / lp; 2.42304.0
  // up / dp, identical after renaming). pf is view-tabs' published ownerWindow: re-exported from the concrete view-tabs
  // file (shared-25-DOWZRSlq.js has no imports, so the plain-node models side-chat-keyboard / terminal-pane-model still
  // load it, E42; never the facade, R6/E41), so only mf is sliced, over that pf. sidebar-reorder resolves its shared-25
  // mf through this 3.6556.2 entry (same file, same local). Export names stay. Pinned below (ownerWindowPin).
  await emit('shared-25', 'owner-window.mjs', ['mf'], "import {ownerWindow as pf} from '../view-tabs/shared-25-DOWZRSlq.js';", 'export {pf as ownerWindow,mf as ownerWindowOrGlobal};', v3Source);
  // w2-sidebar-current-a: sidebar-row-primitive … sidebar-row-view read 3.6556.2 (research/sidebar.md §1.2/§1.3/§3.5,
  // data/sidebar-targets.json). The bodies are React Compiler output: their cache helpers J0…Z5/J8/J9 are imported from
  // view-tabs by the E3 semantic names (R3), never sliced again. Export names stay (R4/E7).
  const sidebarMemo = locals => `import {${locals.split(' ').map(local => {
    const helper = Object.values(official.compilerHelpers).find(entry => entry.local === local);
    if (!helper) throw Error(`Unknown React Compiler helper ${local}`);
    return `${helper.name} as ${local}`;
  }).join(',')}} from '../view-tabs/${official.sharedFrame}';`;
  await emit('shared-18', 'sidebar-row-primitive.mjs', ['bk','kk','_k'], `import {jsx as m} from 'react/jsx-runtime'; ${sidebarMemo('J9 J1 K1 J5 K5')}`, 'export {bk as sidebarFocusClass,kk as SidebarRowButton,_k as sidebarHitRowClass};', v3Source);
  // R2-sidebar SG-2: no second CDS copy. Base UI mergeProps (vendor-frame Kt) and clsx (ge, which the sidebar chunks
  // import as their class joiner; not the twMerge cdsClassNames X) and the 2.42304.0 density context (la), Badge (cs)
  // and Pulse (eN) are re-exported from view-tabs, so the sidebar Badge reads the same context as CdsButton.
  // 3.6556.2: the sidebar chunks still join classes with vendor-frame clsx (`ve`, exported Ba), not CDS twMerge.
  await emit(official.vendorFrame, 'cds-merge-props.mjs', [], '', `export {mergeProps as mergeCdsProps,clsx as cdsClassNames} from '../view-tabs/${official.vendorFrame}';`, v3Source);
  await emit(official.sharedFrame, 'cds-badge.mjs', [], '', `export {CdsDensityContext as CdsBadgeDensity,CdsBadge as CurrentCdsBadge,CdsPulse as CurrentPulse} from '../view-tabs/${official.sharedFrame}';`, v3Source);
  // R2-sidebar: pure renames (binding-map-code-current.json, every binding identical) moved these to 2.42304.0. Export names
  // stay; only minified locals and import aliases change. CDS pieces come straight from view-tabs semantic names.
  // 3.6556.2 shared-3 LR (old CP), shared-21 CQ/TQ/EQ/DQ/OQ (old AG/MG/NG/PG/FG): compiler rewrites only, same copy.
  await emit('shared-3', 'sidebar-upgrade-badge.mjs', ['LR'], `import {jsx as p} from 'react/jsx-runtime'; import {clsx as d} from '../view-tabs/${official.vendorFrame}'; import {StartMessage as X} from '../../source-code-start-adapters.jsx'; ${sidebarMemo('J9 J1 K1 J2 K2 J4 K4')}`, 'export {LR as SidebarUpgradeBadge};', v3Source);
  await emit('shared-21', 'sidebar-nav-badge.mjs', ['CQ','TQ','EQ','DQ','OQ'], `
    import {jsx as u} from 'react/jsx-runtime';
    import {CdsBadge as se} from '../view-tabs/${official.sharedFrame}';
    import {SidebarUpgradeBadge as Bf} from './sidebar-upgrade-badge.mjs';
    import {clsx as c} from '../view-tabs/${official.vendorFrame}';
    import {StartMessage as xf} from '../../source-code-start-adapters.jsx';
    ${sidebarMemo('J9 J0 K0 J1 K1 J2 K2')}
    const bf=messages=>messages;
  `, 'export {OQ as SidebarNavBadge};', v3Source);
  // W12b-FTS-4 (w12b-frame-titlebar-sidebar): 3.6556.2 shared-21 UY (the row mark slot: `role:"img","aria-label":t`,
  // inline "ms-auto me-[…] flex size-[var(--df-row-ctl)] …") and GY (UY around qp {kind:"running"}), which l5 draws after
  // the Code New row's title while K = av(f5) says the New session page's terminal or browser is active. qp is shared-18
  // PA, whose running branch is qv (NestedStatusDot; status-color "clay" / needsYou "blue" are fizzy-lake, off, E12).
  await emit('shared-21', 'sidebar-running-mark.mjs', ['UY','GY'], `
    import {jsx as u} from 'react/jsx-runtime';
    import {NestedStatusDot as qp} from './nested-session-parts.mjs';
    ${sidebarMemo('J9 J0 K0 J1 K1 J3 K3')}
  `, 'export {UY as SidebarRowMarkSlot,GY as SidebarRunningMark};', v3Source);
  // 3.6556.2 shared-8 pb (old T_) resolves the live/error/unread part through shared-26 Ij, the priority table the
  // section badge also reads (Nj: awaiting 0, error 1, ready 2, running 3, idle 4); the PR overlay is unchanged.
  await emit('shared-26', 'sidebar-session-priority.mjs', ['Nj','Ij'], '', 'export {Ij as resolveSessionStatePriority,Nj as sessionStatePriorities};', v3Source);
  await emit('shared-8', 'sidebar-session-state.mjs', ['pb','hb'], "import {resolveSessionStatePriority as ms} from './sidebar-session-priority.mjs';", 'export {pb as resolveSessionDisplayState,hb as sessionNeedsAttention};', v3Source);
  await emit('shared-18', 'sidebar-pr-model.mjs', ['yO','bO','SO','CO','DO','OO','FO'], '', 'export {yO as resolvePrState,bO as prStateOrder,CO as prWebUrl,OO as aggregatePullRequests,FO as pullRequestEntries};', v3Source);
  // 3.6556.2 ED/DD/OD/jD/wU (old Yw/Xw/Zw/eT/GR): the "none" state reads the muted-as-secondary token (TD).
  await emit('shared-18', 'sidebar-pr-icon.mjs', ['TD','ED','DD','OD','jD','wU'], `
    import {jsx as m} from 'react/jsx-runtime';
    import {SidebarCdsIcon as _e} from '../../source-sidebar-current-adapters.jsx';
    ${sidebarMemo('J9 J1 K1 J5 K5')}
    const Af=messages=>messages;
  `, 'export {ED as sidebarPrAppearance,OD as sidebarPrStateLabel,jD as SidebarPrIcon,wU as sidebarPreviewCollisionPadding};', v3Source);
  // 3.6556.2 shared-20 PR card (old _E…eD → PE…yD, data/sidebar-targets.json). Compiler rewrites plus mD, the entry
  // renderer pD now maps with (`t.map(mD)`). LE still wraps the icon behind isFizzyLakePartEnabled("panels") and gD's
  // 16px glyph needs "icons" (both off, E12). The popup side is shared-28 $h (= sidebar-resize physicalSide); `a` stays
  // the host's document-dir answer for vendor-frame useDirection, since no DirectionContext wraps the sidebar.
  await emit('shared-20', 'sidebar-pr-card.mjs', ['PE','FE','IE','LE','RE','zE','BE','VE','HE','GE','qE','JE','YE','XE','aD','oD','sD','cD','lD','uD','dD','fD','mD','pD','hD','gD','yD'], `
    import {createContext as b,useContext as m,useEffect as g,useState as S,cloneElement as p} from 'react';
    import {jsx as i,jsxs as c} from 'react/jsx-runtime';
    import {CdsPreviewCard as $c} from '../view-tabs/shared-156-BLTosN8U.js';
    import {cdsClassNames as O} from '../view-tabs/${official.sharedFrame}';
    import {clsx as n} from '../view-tabs/${official.vendorFrame}';
    import {isFizzyLakePartEnabled as J} from '../view-tabs/shared-4-DUB1Oi0O.js';
    import {physicalSide as El} from '../sidebar-resize/logical-side.mjs';
    import {SidebarPrIcon as Lc,sidebarPrAppearance as Cc,sidebarPrStateLabel as Tc,sidebarPreviewCollisionPadding as oc} from './sidebar-pr-icon.mjs';
    import {SidebarCdsIcon as U,useSidebarOverlayState as q} from '../../source-sidebar-current-adapters.jsx';
    import {useStartIntl as Z} from '../../source-code-start-adapters.jsx';
    import {SourceTooltip as M} from '../../source-tooltip.jsx';
    import {useSidebarStatusTooltips as nc} from './sidebar-status-glyph.mjs';
    ${sidebarMemo('J9 J0 K0 J1 K1 J2 K2 J3 K3 J4 K4 J5 K5 I1 I2 I4 Z1 Z2')}
    const ms=messages=>messages;
    const a=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
  `, 'export {HE as SidebarPrCardContext,GE as sidebarPrMessages,XE as sidebarPrEntryLabel,sD as SidebarPrEntry,pD as SidebarPrCard,hD as sidebarPrCoveredControl,gD as SidebarPrGlyph,yD as sidebarPrTitle,lD as SidebarDetailTooltip};', v3Source);
  // 3.6556.2 moved the remote name helper from shared-104 (ez) to shared-78 (C4); the prefix must change (sidebar §0.2).
  await emit('shared-78', 'sidebar-remote-name.mjs', ['C4'], '', 'export {C4 as sidebarRemoteName};', v3Source);
  await emit('shared-78', 'sidebar-environment-copy.mjs', ['vQ'], 'const Ba=messages=>messages;', 'export {vQ as sidebarEnvironmentMessages};', v3Source);
  // R2-sidebar map-cc-sidebar: shared-20 row details (2.42304.0 in R2). fD (old DT) tells a self-hosted runner pool from
  // cloud through the new tT place (session environment_id / self_hosted_runner_pool_id, or the pending cloud worker);
  // the view adds the selfHosted glyph/label and moves its muted text to text-muted-as-secondary.
  // 3.6556.2 shared-20 ZE/QE/$E/jD/MD/eT/ND/PD: every binding identical (pure rename); the basename helper is shared-52 nk.
  await emit('shared-20', 'sidebar-details-model.mjs', ['ZE','QE','$E','jD','MD','eT','ND','PD'], `
    import {environmentBasename as bn} from '../../../electron/generated/environment-basename.mjs';
    import {sidebarRemoteName as ei} from './sidebar-remote-name.mjs';
  `, 'export {$E as sidebarDescription,jD as sidebarFolder,MD as sidebarBranch,ND as sidebarEnvironment,PD as sidebarRemoteEnvironment,eT as sidebarEnvironmentPlace};', v3Source);
  // 3.6556.2 shared-20 details view (old DE/kE/zE/BE/QE/$E/nD → WE/KE/nD/rD/_D/vD/xD): compiler rewrites; rD hoists
  // the `e !== void 0` filter into iD.
  await emit('shared-20', 'sidebar-details-view.mjs', ['WE','KE','nD','iD','rD','_D','vD','xD'], `
    import {jsx as i,jsxs as c} from 'react/jsx-runtime';
    import {clsx as n} from '../view-tabs/${official.vendorFrame}';
    import {useStartIntl as Z} from '../../source-code-start-adapters.jsx';
    import {SidebarCdsIcon as U} from '../../source-sidebar-current-adapters.jsx';
    import {SidebarPrGlyph as gD,SidebarDetailTooltip as lD,sidebarPrMessages as GE} from './sidebar-pr-card.mjs';
    import {sidebarEnvironmentMessages as ki} from './sidebar-environment-copy.mjs';
    ${sidebarMemo('J9 J1 K1 J3 J4 K4 I1 I3 Z1')}
  `, 'export {rD as SidebarDescription,_D as SidebarEnvironmentGlyph,vD as sidebarEnvironmentLabel,xD as sidebarRightDecoration};', v3Source);
  // 3.6556.2 shared-18 status glyph (old CT…ZD → oO…$A, FD → IA by `"df-tab-dot-running"`, sidebar §1.3). FA (old PD)
  // still inlines the three CDS colors; the Pulse is view-tabs CdsPulse by its semantic name. IA adds the unread look
  // (BC) and the blue palette (WC/KC), both behind fizzy-lake `type` (shared-52 th = aa, off: Qm=[], E12), so the mark
  // is unchanged. WA (the error mark, old UD) stays the host adapter so this glyph never imports the row-details view.
  await emit('shared-18', 'sidebar-status-glyph.mjs', ['oO','cO','mO','hO','_O','YO','XO','KO','BC','EA','DA','OA','FA','GC','WC','KC','JO','IA','$A'], `
    import {createContext as M,useContext as D} from 'react';
    import {jsx as m} from 'react/jsx-runtime';
    import {useStartIntl as jf} from '../../source-code-start-adapters.jsx';
    import {SourceTooltip as Y} from '../../source-tooltip.jsx';
    import {CdsPulse as B} from '../view-tabs/${official.sharedFrame}';
    import {isFizzyLakePartEnabled as aa} from '../view-tabs/shared-4-DUB1Oi0O.js';
    import {NestedStatusDot as PA,synchronizeStatusAnimation as Kv} from './nested-session-parts.mjs';
    import {SidebarCodeErrorGlyph as WA} from '../../source-sidebar-error-adapters.jsx';
    ${sidebarMemo('J9 J1 K1 J2 K2 J3 K3 J4 K4 J5 K5')}
    const Af=messages=>messages;
  `, 'export {DA as SidebarStatusLabel,OA as sidebarStatusMessages,$A as SidebarStatusGlyph,KO as SidebarStatusLayout,YO as SidebarStatusTooltips,XO as useSidebarStatusTooltips,_O as sidebarErrorKind,mO as sidebarErrorShapes,hO as sidebarErrorColors};', v3Source);
  // 3.6556.2 shared-18 fade label (old RE…aD → jk…$k). The hover fades now set `--df-hover-mask` and share Gk (sidebar
  // §2.1 C3), so Gk is sliced ahead of Kk/qk. Text direction and the tooltip side stay host answers as before.
  await emit('shared-18', 'sidebar-fade-label.mjs', ['jk','Nk','Pk','Ik','Lk','Rk','zk','Bk','Vk','Hk','Uk','Wk','Gk','Kk','qk','Zk','Qk','$k'], `
    import {createContext as M,useContext as D,useRef as p,useLayoutEffect as w} from 'react';
    import {jsx as m} from 'react/jsx-runtime';
    import {clsx as f} from '../view-tabs/${official.vendorFrame}';
    import {SourceTooltip as Y} from '../../source-tooltip.jsx';
    import {useSidebarStatusTooltips as XO} from './sidebar-status-glyph.mjs';
    import {useSidebarLabelInteraction as ne} from '../../source-sidebar-current-adapters.jsx';
    import {ownerWindow as Pt,ownerWindowOrGlobal as Et} from './owner-window.mjs';
    ${sidebarMemo('J9 J1 K1 J2 K2 J3 K3 J4 K4 J5 K5')}
    const h=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
    const Ph=(side,dir)=>(side==='inline-start')==(dir==='rtl')?'right':'left';
  `, 'export {$k as SidebarFadeLabel,Qk as observeSidebarLabelOverflow,Lk as sidebarLabelOverflows,Ik as SidebarLabelMenuOpen,Nk as sidebarDecorationMinimum,Pk as sidebarDecorationProperty};', v3Source);
  // 3.6556.2 shared-18 row (old EE…sD → yk…rA). Ak adds multiSelected (", selected"), nameId/aria-labelledby, actionRow,
  // data-row-nav and data-editing (sidebar §2.1 C1); its fizzy `type` weight (hk + Qc("type")) and rA's panels glyph
  // (tA/nA/eA) stay off (E12). rA no longer calls the identity oD, which is dropped.
  await emit('shared-18', 'sidebar-row-view.mjs', ['yk','xk','Sk','Ck','wk','Tk','Ek','Dk','Ok','hk','Ak','Mk','Fk','Jk','Yk','Xk','nA','eA','tA','rA'], `
    import {createContext as M,useState as F,useRef as p,useLayoutEffect as w,useImperativeHandle as P,isValidElement as C,cloneElement as E,useContext as D,use as N} from 'react';
    import {jsx as m,jsxs as y,Fragment as b} from 'react/jsx-runtime';
    import {cva as _,clsx as f} from '../view-tabs/${official.vendorFrame}';
    import {CdsButton as U} from '../view-tabs/${official.sharedFrame}';
    import {isFizzyLakePartEnabled as Qc} from '../view-tabs/shared-4-DUB1Oi0O.js';
    import {useEventCallback as nn} from '../view-tabs/shared-0-DDOOdL6P.js';
    import {useMergedRefs as Rf} from '../view-tabs/vendor-all-0-DXM0MGjZ.js';
    import {SidebarStatusLayout as KO} from './sidebar-status-glyph.mjs';
    import {sidebarFocusClass as bk,SidebarRowButton as kk,sidebarHitRowClass as _k} from './sidebar-row-primitive.mjs';
    import {SidebarFadeLabel as $k,sidebarDecorationMinimum as Nk,sidebarDecorationProperty as Pk} from './sidebar-fade-label.mjs';
    import {useStartIntl as jf} from '../../source-code-start-adapters.jsx';
    import {SourceShortcut as X} from '../../source-shortcut.jsx';
    import {SidebarRenameEnhancer as b_,SidebarCdsIcon as _e} from '../../source-sidebar-current-adapters.jsx';
    ${sidebarMemo('J8 J9 J0 K0 J1 K1 J2 K2 J3 K3 J4 K4 J5 K5')}
  `, 'export {Ak as CurrentSidebarRow,Ek as sidebarRowClasses,Dk as useSidebarRename,Ok as SidebarRenameInput,Xk as SidebarWideDecoration,rA as SidebarRowMoreControl};', v3Source);
  // R2-sessions NBS-8: the Code Sessions page (2.42304.0 in R2: cbd6c85c8 page gd, old Du). Minified names are reused
  // across versions (old gu/_u/vu/yu/bu were copy; the new ones are the bulk-action gate and actions), so every module
  // exports semantic names.
  // cc-rest-sessions-model (W9, research/code-current-rest.md §2/§5): band, deadline, load hold, live status,
  // coordinator, model, copy and awaiting label read 3.6556.2. Full file names: shared-N groups are re-bundled across
  // releases. Each binding equals its 2.42304.0 original after identifier normalisation, except the load hold, which is
  // React Compiler output (cache helpers from view-tabs by the E3 names, R3) whose deadline updater `e => e ?? "deadline"`
  // is hoisted to the module-level `ed`. The deadline is shared-20 $w = 1e4 (cbd6c85c8 `or as fi`, followed by the same
  // `function eT(e){return e.environmentId?…` as the old eT/tT pair), not the map's shared-0 mv (the emitAfterPaint hold).
  await emit('shared-18-D3y8YMFN.js','sessions-page-band.mjs',['mb'],'','export {mb as sessionsPageBand};',v3Source);
  await emit('shared-20-mUr7IqZY.js','sessions-page-load-deadline.mjs',['$w'],'','export {$w as sessionsPageLoadDeadline};',v3Source);
  await emit('cbd6c85c8-D1xuycDy.js','sessions-page-load-hold.mjs',['$u','ed'],`
    import {useState as g,useRef as i,useLayoutEffect as u,useEffect as p} from 'react';
    import {sessionsPageLoadDeadline as fi} from './sessions-page-load-deadline.mjs';
    ${sidebarMemo('J9 J1 K1 J2 K2 J4 K5')}
  `,'export {$u as useSessionsPageLoadHold};',v3Source);
  // shared-11 cw reads a chat row's state through shared-8 mb (`ju as Go`), not the raw liveStatus.
  await emit('shared-8-Db1QN4mf.js','sessions-page-live-status.mjs',['mb'],'','export {mb as sessionPageLiveStatus};',v3Source);
  // R3-nested NBS-3: shared-11 pw (exported `vt`) is !scheduledTaskId && !shownInParentTabs && !fw; fw tests a remote
  // row's coordinator tag through shared-26 Jj (`oi as zr`, qj = "_coordinator").
  await emit('shared-26-CGuBxVt9.js','sessions-page-coordinator.mjs',['qj','Jj'],'','export {qj as coordinatorSessionTag,Jj as isCoordinatorSession};',v3Source);
  await emit('shared-11-_AVGLHEz.js','sessions-page-model.mjs',['dw','SC','cw','jC','AC','fw','pw'], `
    import {compareSidebarUpdated as DC} from './sidebar-sort-model.mjs';
    import {resolveSessionDisplayState as Io} from './sidebar-session-state.mjs';
    import {sessionPageLiveStatus as Go} from './sessions-page-live-status.mjs';
    import {isCoordinatorSession as zr} from './sessions-page-coordinator.mjs';
  `,'export {dw as isSessionArchived,SC as withSessionResponding,cw as sessionPageState,jC as sessionPageMatches,AC as sortSessionPageRows,fw as isCoordinatorSessionRow,pw as isListedSession};',v3Source);
  // vendor-intl `d as Xn` / `f as Zn` (defineMessage / defineMessages) return their argument.
  await emit('cbd6c85c8-D1xuycDy.js','sessions-page-copy.mjs',['Af','jf','Mf','Nf','Pf'],'const Xn=message=>message,Zn=messages=>messages;',
    'export {Af as sessionsPageMixedTitle,jf as sessionsPageTitle,Mf as sessionsPageRowKinds,Nf as sessionsPageFilterLabels,Pf as sessionsPageActiveLabel};',v3Source);
  // The row's chat awaiting label (cbd6c85c8 `es as Tr` = shared-18 kA, over shared-18 OA).
  await emit('shared-18-D3y8YMFN.js','sessions-page-awaiting-label.mjs',['kA'],`
    import {sidebarStatusMessages as OA} from './sidebar-status-glyph.mjs';
  `,'export {kA as sessionsPageAwaitingLabel};',v3Source);
  // cc-rest-sessions-view (W9, research/code-current-rest.md §2/§3/§5): the selection bar, bulk actions, row, tabs,
  // count text, empty state and search read 3.6556.2 cbd6c85c8-D1xuycDy.js. The page component (old gd, now Hf) is React
  // Compiler output, so the five old gd fragments (local/assignment/call over plain JSX) no longer exist; each target now
  // takes the matching piece of Hf (E27 redesign, the root still pinned by its own features). w10-ccres-hf-host retired
  // the tabs / count-text / empty / search pieces below: the page now renders Hf whole (sessions-page-view.mjs).
  //   tabs        the conditional `X.isActive && !fr ? <count label> : <Li.Root …>` (plain JSX; Hf wraps it in `ji ? … :
  //               void 0`, ji = T && oe.length > 1, always true for the two Code tabs)
  //   count-text  the store branch of Hf's `{count} selected` slot (`J1($, 301, Hr) ? K1($, 301, Hr, <…>) : $[302]`)
  //   empty       the store branch of the empty-state slot 339 (`… whitespace-normal wrap-anywhere`)
  //   search      the `if (!X.isActive) { … }` block that builds the search props (Ua) over Hf's own cache (J9(537)), so
  //               it is a hook: the host calls it on every render
  // A store branch `Kn($, slot, …deps, value)` writes the deps and value into `$` and returns value; those two fragments
  // take a fresh `$ = []` in place of Hf's cache (written, never read), so they stay plain functions. The free names of
  // each fragment are its parameters, with the values Hf computes on the Code page (codeScoped m, textFirstRows T, Code
  // sessions w; chat-only recents search Fe and its state J closed). sessionsViewPins(target, pins, features) checks
  // every bound local against the chunk's import table ('react' = official.reactAliases, 'memo' = a view-tabs compiler
  // helper (E3), 'view' = the view-tabs semantic name of that `file#export` imported from the concrete file (R6), or
  // [`file#export=local`, module, name] for a host or code-current stand-in) and that each named declaration still holds
  // its raw-text features (R2).
  const sessionsPage3 = 'cbd6c85c8-D1xuycDy.js';
  let sessionsPage3Chunk;
  const sessionsViewExports = new Map();
  async function sessionsViewPins(target, pins, features = {}, lines = []) {
    if (!selected(target)) return '';
    if (!sessionsPage3Chunk) {
      const code = await fs.readFile(path.join(v3Source, sessionsPage3), 'utf8'), imports = new Map(), declarations = new Map();
      for (const node of parsers.babel.parse(code, {}).program.body) {
        if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, `${node.source.value.replace(/^\.\//, '')}#${s.imported?.name ?? '*'}`);
        else if (node.id) declarations.set(node.id.name, code.slice(node.start, node.end));
        else for (const d of node.declarations ?? []) declarations.set(d.id.name, code.slice(d.start, d.end));
      }
      const viewTabs = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
      sessionsPage3Chunk = { imports, declarations, viewTabs };
    }
    const { imports, declarations, viewTabs } = sessionsPage3Chunk, groups = new Map();
    const exportsOf = async file => {
      if (!sessionsViewExports.has(file)) {
        const text = await fs.readFile(path.join(v3Source, file), 'utf8');
        sessionsViewExports.set(file, new Map([...text.matchAll(/export\{([^}]*)\}/g)].flatMap(m => m[1].split(',')).map(s => { const [local, name] = s.split(' as '); return [(name ?? local).trim(), local.trim()]; })));
      }
      return sessionsViewExports.get(file);
    };
    for (const [local, spec] of Object.entries(pins)) {
      const origin = imports.get(local), [from, alias] = origin?.split('#') ?? [];
      let module, name;
      if (spec === 'react') {
        if (from !== official.vendorFrame || !official.reactAliases[alias]) throw Error(`${sessionsPage3}: ${local} is ${origin}, not a vendor-frame React export`);
        [module, name] = official.reactAliases[alias];
      } else if (spec === 'memo') {
        if (from !== official.sharedFrame || !official.compilerHelpers[alias]) throw Error(`${sessionsPage3}: ${local} is ${origin}, not a React Compiler helper`);
        [module, name] = [`../view-tabs/${official.sharedFrame}`, official.compilerHelpers[alias].name];
      } else if (spec === 'view') {
        name = Object.entries(viewTabs).find(([, entry]) => entry.file === from && entry.export === alias)?.[0];
        if (!name) throw Error(`${sessionsPage3}: ${local} (${origin}) has no view-tabs semantic name`);
        module = `../view-tabs/${from}`;
      } else {
        const [expected, binding] = spec[0].split('=');
        if (origin !== expected) throw Error(`${sessionsPage3}: ${local} is ${origin}, expected ${expected}`);
        if (binding !== undefined && (await exportsOf(from)).get(alias) !== binding) throw Error(`${sessionsPage3}: ${expected} is not ${binding}`);
        [module, name] = [spec[1], spec[2]];
      }
      if (!groups.has(module)) groups.set(module, []);
      groups.get(module).push(`${name} as ${local}`);
    }
    for (const [owner, list] of Object.entries(features)) {
      const text = declarations.get(owner);
      if (text === undefined) throw Error(`${sessionsPage3}: missing ${owner}`);
      for (const feature of list) if (!text.includes(feature)) throw Error(`${sessionsPage3}: ${owner} no longer has ${feature}`);
    }
    return [...[...groups].map(([module, names]) => `import {${names.join(',')}} from '${module}';`), ...lines].join('\n');
  }
  const sessionsIntl = name => [`${official.vendorIntl}#${name}`, '../../source-code-start-adapters.jsx', name === 'p' ? 'useStartIntl' : 'StartMessage'];
  // Hf is the Sessions page: its props carry codeRowLinkComponent and it reports chats_load / recents_load, so a re-pointed
  // Hf fails.
  const sessionsPageRoot = ['codeRowLinkComponent:', '"chats_load"', '"recents_load"'];
  // Selection status (tabs-status part, title lead) and bulk actions (3.6556.2 Gd/Kd/qd/Jd/Yd, cd/Dd/Od/kd/Ad; 2.42304.0
  // ku/Au/ju/Mu/Nu, fu/gu/_u/vu/yu). Code rows are never selectable, so for Code only the closed gate (Dd, shared-25 hs
  // through the host gate) and the pass-through Yd are reached; jd (the GrowthBook bulk menu) is a host stand-in that throws
  // if reached. The Unarchive button gained the unarchiving busy state ("Unarchiving…").
  await emit(sessionsPage3,'sessions-page-selection-bar.mjs',['Gd','Kd','qd','Jd','Yd'],await sessionsViewPins('sessions-page-selection-bar.mjs',
    {a:'react',s:'react',r:'view',R:'view',Qn:sessionsIntl('p'),J9:'memo',J1:'memo',K1:'memo',I1:'memo',J2:'memo',K2:'memo',J3:'memo',K3:'memo',J5:'memo',K5:'memo'},
    {Gd:['"@max-[540px]:hidden"','"min-w-7 @max-[700px]:flex"'],qd:['"@container hidden min-h-control w-0 grow items-center overflow-hidden"','"text-body text-muted-as-secondary ms-3 truncate @max-[116px]:sr-only"'],
      Jd:['header:"tabs","data-cds-part":"tabs-status"'],Yd:['header:"title"'],Hf:sessionsPageRoot}),
    'export {Gd as sessionsPageSelectionClasses,Kd as sessionsPageSelectionHiddenClass,Jd as SessionsPageTabsSelectionStatus,Yd as SessionsPageSelectionLead};',v3Source);
  await emit(sessionsPage3,'sessions-page-bulk-actions.mjs',['cd','Dd','Od','kd','Ad'],await sessionsViewPins('sessions-page-bulk-actions.mjs',
    {a:'react',s:'react',c:'react',y:'view',Y:sessionsIntl('l'),Qn:sessionsIntl('p'),fe:['shared-25-DOWZRSlq.js#rg=hs','../../source-sessions-adapters.jsx','sessionsFeatureGate'],
      J9:'memo',J0:'memo',K0:'memo',J1:'memo',K1:'memo',J2:'memo',K2:'memo',J4:'memo',K4:'memo'},
    {cd:['"__gb__4293940309"'],Dd:['===void 0||'],Od:['variant:"danger"'],Ad:['busyLabel:','id:"jBQAwvukAZ"'],jd:['rowActions:']},
    ["import {SessionsBulkMenuUnavailable as jd} from '../../source-sessions-adapters.jsx';"]),
    'export {Dd as sessionsPageBulkMenuEnabled,Od as SessionsPageBulkActions};',v3Source);
  // w10-ccres-hf-host (3.6556.2): the page view is Hf itself. extract-sessions-page.mjs slices Hf whole with its closure
  // (E27) into src/generated/sessions-page; this target only re-exports it under the name the host imports (R4), never
  // through the view-tabs facade (E41). The tabs, count label, empty state and search pieces (cc-rest-sessions-view) are
  // inside that Hf, so their targets are retired (R4/E7: the host was their only importer). Pinned: the chunk's Hf is
  // still the Sessions page, and the sessions-page manifest slices exactly this chunk's Hf under SessionsPageHf.
  if (selected('sessions-page-view.mjs')) {
    const pages = JSON.parse(await fs.readFile(path.join(root, 'src/generated/sessions-page/manifest.json'), 'utf8'));
    const hf = pages.modules?.find(entry => entry.target === 'sessions-page-hf.mjs');
    const chunk = await fs.readFile(path.join(v3Source, sessionsPage3));
    if (pages.referenceVersion !== official.referenceVersion || pages.root !== `${sessionsPage3}:Hf` || hf?.source !== sessionsPage3
      || hf.sourceSha256 !== sha(chunk) || hf.exports?.Hf !== 'SessionsPageHf') throw Error('sessions-page/sessions-page-hf.mjs is not the 3.6556.2 cbd6c85c8 Hf');
  }
  await emit(sessionsPage3,'sessions-page-view.mjs',[],await sessionsViewPins('sessions-page-view.mjs',{},
    {Hf:[...sessionsPageRoot,'reportsRecentsLoad:','renderCodeRowActions:','"New session",id:"Ajmo+3Cu3b"','className:"df-link-card"']}),
    "export {SessionsPageHf as SessionsPageView} from '../sessions-page/sessions-page-hf.mjs';",v3Source);
  // The row (3.6556.2 dp/fp/pp; 2.42304.0 _d/vd/yd): React Compiler output, no literal added or removed. The row reads
  // view-tabs layout, highlight, archived badge, Badge and RelativeTime from their concrete files by semantic name (R6);
  // the row/read-state hooks, read mark and needs-attention test (shared-11 wC/lw/sw, shared-2 OG) are the host stand-ins
  // (the local parent projects fresh engine state); state, archive, awaiting label and status glyph are the 3.6556.2
  // code-current targets of the same bindings.
  await emit(sessionsPage3,'sessions-page-row.mjs',['dp','fp','pp'],await sessionsViewPins('sessions-page-row.mjs',
    {m:'react',a:'react',s:'react',c:'react',Qn:sessionsIntl('p'),Y:sessionsIntl('l'),
      fa:['shared-11-_AVGLHEz.js#kt=wC','../../source-sessions-adapters.jsx','useSessionPageRow'],qi:['shared-11-_AVGLHEz.js#Tt=lw','../../source-sessions-adapters.jsx','sessionPageReadMark'],
      Wn:['shared-2-TF8v67kg.js#ro=OG','../../source-sessions-adapters.jsx','useSessionPageReadState'],Sa:['shared-11-_AVGLHEz.js#xt=sw','../../source-sessions-adapters.jsx','sessionPageNeedsAttention'],
      Ma:'view',io:'view',Ba:'view',M:'view',Hn:'view',Fs:'view',Rs:'view',zs:'view',
      yr:['shared-18-D3y8YMFN.js#Qo=$A','./sidebar-status-glyph.mjs','SidebarStatusGlyph'],mr:['shared-18-D3y8YMFN.js#Jo=OA','./sidebar-status-glyph.mjs','sidebarStatusMessages'],
      xa:['shared-11-_AVGLHEz.js#wt=cw','./sessions-page-model.mjs','sessionPageState'],ia:['shared-11-_AVGLHEz.js#ft=dw','./sessions-page-model.mjs','isSessionArchived'],
      Tr:['shared-18-D3y8YMFN.js#es=kA','./sessions-page-awaiting-label.mjs','sessionsPageAwaitingLabel'],
      J9:'memo',J1:'memo',K1:'memo',I1:'memo',Z1:'memo',J2:'memo',K2:'memo',I2:'memo',J3:'memo',K3:'memo',J4:'memo',K4:'memo',J5:'memo',K5:'memo'},
    {dp:['"truncate text-footnote text-muted-as-secondary"','"text-caption text-muted-as-secondary max-w-40 truncate"','"size-2 shrink-0 rounded-full bg-fill-brand"','id:"J8cAGGisOh"'],
      fp:['tooltip:!1'],pp:['"AskUserQuestion"']},
    ["import {sessionsPageRowKinds as Mf} from './sessions-page-copy.mjs';"]),
    'export {dp as SessionsPageRow,fp as SessionsPageRowStatus};',v3Source);
  // w2-sidebar-current-b (3.6556.2; research/sidebar.md §1.1-§1.3, §3.5): the sidebar sort / date / group copy / search
  // / menu rows / group view / session cycle / bulk targets read the snapshot by full file name (the shared-N groups were
  // regrouped: shared-19's sidebar pieces now live in shared-46, so a `shared-19` prefix would resolve to another
  // module). v3SidebarImports(file, pins, features) builds an emit's import lines from the chunk's own import table and
  // checks every local it binds (R2/R3): 'react' = a vendor-frame export by official.reactAliases, 'memo' = a shared-
  // frame React Compiler helper by its view-tabs name (official.compilerHelpers, E3), [origin, module, name] = the
  // import `file#export` (`=local` also checks the declaration that file exports under it; module null = `name` is an
  // inline host shim line). `features` are raw-text strings each named root declaration must still contain, so a
  // re-pointed minified name fails here.
  const v3Chunks = new Map();
  const v3Chunk = async file => {
    if (!v3Chunks.has(file)) {
      const code = await fs.readFile(path.join(v3Source, file), 'utf8'), imports = new Map(), exported = new Map(), declarations = new Map();
      for (const node of parsers.babel.parse(code, {}).program.body) {
        if (node.type === 'ImportDeclaration') for (const s of node.specifiers) imports.set(s.local.name, `${node.source.value.replace(/^\.\//, '')}#${s.imported?.name ?? s.imported?.value ?? '*'}`);
        else if (node.type === 'ExportNamedDeclaration' && !node.source) for (const s of node.specifiers) exported.set(s.exported.name ?? s.exported.value, s.local.name);
        else if (node.id) declarations.set(node.id.name, code.slice(node.start, node.end));
        else for (const d of node.declarations ?? []) declarations.set(d.id.name, code.slice(d.start, d.end));
      }
      v3Chunks.set(file, { imports, exported, declarations });
    }
    return v3Chunks.get(file);
  };
  async function v3SidebarImports(target, file, pins, features = {}) {
    if (!selected(target)) return '';
    const chunk = await v3Chunk(file), groups = new Map(), lines = [];
    for (const [local, spec] of Object.entries(pins)) {
      const origin = chunk.imports.get(local), [from, alias] = origin?.split('#') ?? [];
      let module, name;
      if (spec === 'react') {
        if (from !== official.vendorFrame || !official.reactAliases[alias]) throw Error(`${file}: ${local} is ${origin}, not a vendor-frame React export`);
        [module, name] = official.reactAliases[alias];
      } else if (spec === 'memo') {
        if (from !== official.sharedFrame || !official.compilerHelpers[alias]) throw Error(`${file}: ${local} is ${origin}, not a React Compiler helper`);
        [module, name] = [`../view-tabs/${official.sharedFrame}`, official.compilerHelpers[alias].name];
      } else {
        const [expected, binding] = spec[0].split('=');
        if (origin !== expected) throw Error(`${file}: ${local} is ${origin}, expected ${expected}`);
        if (binding !== undefined && (await v3Chunk(from)).exported.get(alias) !== binding) throw Error(`${file}: ${expected} is not ${binding}`);
        if (spec[1] === null) { lines.push(spec[2]); continue; }
        [module, name] = [spec[1], spec[2]];
      }
      if (!groups.has(module)) groups.set(module, []);
      groups.get(module).push(`${name} as ${local}`);
    }
    for (const [name, list] of Object.entries(features)) {
      const text = chunk.declarations.get(name);
      if (text === undefined) throw Error(`${file}: missing ${name}`);
      for (const feature of list) if (!text.includes(feature)) throw Error(`${file}: ${name} no longer has ${feature}`);
    }
    return [...[...groups].map(([module, names]) => `import {${names.join(',')}} from '${module}';`), ...lines].join('\n');
  }
  const v3Intl = official.vendorIntl, v3Frame = official.sharedFrame;
  const v3Defined = local => [`${v3Intl}#f`, null, `const ${local}=messages=>messages;`];
  // w2-sidebar-current-b: pure renames to 3.6556.2 (data/sidebar-targets.json, every binding identical; tz -> WU is now
  // a function declaration). 2.42304.0 ZR $R ez tz rz iz az nz sz cz -> shared-21 BU HU UU WU KU qU JU GU XU ZU.
  await emit('shared-21-R7LldJ05.js', 'sidebar-family-sort.mjs', ['BU','HU','UU','WU','KU','qU','JU','GU','XU','ZU'], await v3SidebarImports('sidebar-family-sort.mjs', 'shared-21-R7LldJ05.js', {}, {BU:['sideParentId'], GU:['sideSpawnerId'], JU:['parentOf'], XU:['parentId:void 0,rows:[...e]']}), 'export {HU as sidebarFamilyPivot,UU as sidebarFamilyHead,JU as orderSidebarFamilies,XU as splitSidebarFamilies};', v3Source);
  // yw / fw pw _w vw -> shared-22 IT / bT xT PT FT; FT's imports: shared-21 Di (HU) / Ei (UU), shared-11 it (OC).
  await emit('shared-22-Bwn3sJTG.js', 'sidebar-date-pivot.mjs', ['IT'], await v3SidebarImports('sidebar-date-pivot.mjs', 'shared-22-Bwn3sJTG.js', {}, {IT:['Number.isNaN(e.updatedAtMs)']}), 'export {IT as sidebarLatestFamilyMember};', v3Source);
  await emit('shared-22-Bwn3sJTG.js', 'sidebar-date-groups.mjs', ['bT','xT','PT','FT'], await v3SidebarImports('sidebar-date-groups.mjs', 'shared-22-Bwn3sJTG.js', {
    Hh: ['shared-21-R7LldJ05.js#Di=HU', './sidebar-family-sort.mjs', 'sidebarFamilyPivot'],
    Xh: ['shared-21-R7LldJ05.js#Ei=UU', './sidebar-family-sort.mjs', 'sidebarFamilyHead'],
    kp: ['shared-11-_AVGLHEz.js#it=OC', './sidebar-sort-model.mjs', 'sidebarCreatedTimestamp'],
    Qs: v3Defined('Qs'),
  }, {PT:['"zWgbGgjUUg"','"6dIxDP1C8c"','"iIeVwABUWb"'], FT:['byCreated','oldestFirst','bulkScope']}) + "\nimport {sidebarLatestFamilyMember as IT} from './sidebar-date-pivot.mjs';", 'export {FT as currentSidebarDateGroups};', v3Source);
  await emit('shared-11-_AVGLHEz.js', 'sidebar-sort-model.mjs', ['DC','OC','kC','MC'], await v3SidebarImports('sidebar-sort-model.mjs', 'shared-11-_AVGLHEz.js', {}, {OC:['e.createdAtMs<=e.updatedAtMs'], MC:['localeCompare']}), 'export {DC as compareSidebarUpdated,OC as sidebarCreatedTimestamp,kC as compareSidebarCreated,MC as compareSidebarTitle};', v3Source);
  // R2-sidebar map-cc-sidebar: shared-21 sort order. jU (old HR) reverses Name only between two titled rows, so untitled
  // sessions stay last when the order is flipped (3.6556.2: VR HR -> AU jU, identical).
  await emit('shared-21-R7LldJ05.js', 'sidebar-sort-order.mjs', ['AU','jU'], await v3SidebarImports('sidebar-sort-order.mjs', 'shared-21-R7LldJ05.js', {
    BS: ['shared-11-_AVGLHEz.js#nt=DC', './sidebar-sort-model.mjs', 'compareSidebarUpdated'],
    wS: ['shared-11-_AVGLHEz.js#et=kC', './sidebar-sort-model.mjs', 'compareSidebarCreated'],
    YS: ['shared-11-_AVGLHEz.js#tt=MC', './sidebar-sort-model.mjs', 'compareSidebarTitle'],
  }, {AU:['recency:','alpha:','created:'], jU:['e.title&&t.title']}), 'export {AU as sidebarDescendingComparators,jU as sidebarAscendingComparators};', v3Source);
  await emit('shared-18-D3y8YMFN.js', 'sidebar-group-copy.mjs', ['ck'], await v3SidebarImports('sidebar-group-copy.mjs', 'shared-18-D3y8YMFN.js', {Af: v3Defined('Af')}, {ck:['"GJD89iLOVK"','"Create and group by custom"']}), 'export {ck as sidebarGroupMessages};', v3Source);
  // cc-rest-sidebar-nested (research/code-current-rest.md §2.2): the 2.42304.0 sidebar-filter-options.mjs (shared-21 oU's
  // `Se`, the old Group by list) is retired; the host Group by reads sidebar-group-options.mjs (3.6556.2 GJ) below.
  // w2-sidebar-current-b (sidebar §2.1 A1): 3.6556.2 moved the Group by options out of the menu into their own hook,
  // shared-21 GJ (exported Er; PJ's `Se` is now only ["none", xe]): Date / [Status] / Folder (project) / Environment
  // (environment, id bYA6fPCd5A) / [Custom] / None. Sliced whole as a new target; sidebar-filter-options.mjs (2.42304.0
  // oU's Se) stays until the host Group by moves to it with the saved-environment buckets (w4-sidebar-filter), then W7
  // drops it. Sf is vendor-intl p (useIntl), is shared-46 wn (the status-bucket gate: the host's useStatusGrouping), aw
  // shared-16 wt (`Ph(){return Fh().overlayEnabled}`, here over the host's useSidebarOverlayGate).
  await emit('shared-21-R7LldJ05.js', 'sidebar-group-options.mjs', ['GJ'], await v3SidebarImports('sidebar-group-options.mjs', 'shared-21-R7LldJ05.js', {
    J9: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo', J5: 'memo', K5: 'memo',
    Sf: [`${v3Intl}#p`, '../../source-code-start-adapters.jsx', 'useStartIntl'],
    is: ['shared-46-BIbZBGFq.js#wn=SN', '../../source-sidebar-sections-adapters.jsx', 'useStatusGrouping'],
    aw: ['shared-16-ByfgAyLr.js#wt=Ph', null, "import {useSidebarOverlayGate} from '../../source-sidebar-sections-adapters.jsx'; const aw=()=>useSidebarOverlayGate().overlayEnabled;"],
  }, {GJ:['"P7PLVjLe4f"','"tzMNF3jWoU"','"ukQpDs7M+0"','"bYA6fPCd5A"','"Sjo1P44FYy"','"9/SKZH+1jy"','["project",','["environment",']}), 'export {GJ as useSidebarGroupByOptions};', v3Source);
  // The controls (eU lU uU dU sU cU KH qH YH XH hU gU aU CB; old WH $H eU tU aU oU zH BH QH) are one copy: the
  // extract-sidebar-sections.mjs slice the section view menu (shared-22 tO) renders, re-exported here under the names the
  // host imports. 2.42304.0 dropped ZH (Hide / Show all nested sessions) from this menu (now the palette's shared-20 _S),
  // QH became cU (View all, always shown: disabled with a reason, or "Loading…"), sU adds New section… / Reset to
  // defaults, lU adds Name, and uU's clsx is view-tabs' (vendor-frame ge), not cds-merge-props' alias.
  // 3.6556.2 (w3-sidebar-sections-gen, E38): the slice is shared-21-R7LldJ05.js (qJ JJ KJ UJ WJ vJ xJ SJ _J nY NJ OG OJ);
  // SB-26: gU (useSidebarRegroupFocus, `keyRegroups`) is deleted officially, so it is no longer re-exported.
  await emit('shared-21-R7LldJ05.js', 'sidebar-filter-controls.mjs', [], '', "export {sidebarFilterMessages,useSidebarSortOptions,SidebarOptionMenu,SidebarSortMenu,focusSidebarAfterRegroup,SidebarViewAllContext,useSidebarViewAll,SidebarViewAllItem,SidebarViewResetItems,sortAscendingShown,sortAscendingStored,SidebarFilterTrigger,trailingControlClass} from '../sidebar-sections/section-filter-controls.mjs';", v3Source);
  // 3.6556.2 (w3-sidebar-sections-gen, E38; research/sidebar.md §3.5): the Group and sort menu is shared-21 PJ (old oU)
  // and its sessionList layout is now an `else if (n === "sessionList") { … fn = h(g, {children: [t, n, v, b]}) }` block
  // of React Compiler output, so it is selected as that block over PJ's own cache (`$ = J9(482)`; the block uses slots
  // 378-434). What changed from oU: Group by (qJ) is keepOpen with separatorBefore "none"; Show › Metadata, then one
  // Separator while Routines is offered / Empty groups is available / Side chats is offered, the Routines toggle (VJ's
  // state through HJ, `{...ie}`), Side chats (ae.sideChatRowsShown, offered by X = the side-chat tab strip capability),
  // Empty groups; then UJ (atDefaults: !Zt). The host passes PJ's locals: Q intl, c direction, we GJ() (Group by
  // options), Xt / Vt the shown group-by and its writer, ke KJ() / f / Ht sort, Ut / Wt shown ascending and its writer,
  // Te / Pt metadata, ie the Routines toggle, X / ae / Ft side chats (E16: not offered), ce / Y / Mt empty groups,
  // Zt "not at defaults" and Qt the reset. HJ is the host's SidebarShowToggleItem (shared-21 HJ is not sliced: it reads
  // the routines navigation store, which the host does not have).
  await emit('shared-21-R7LldJ05.js', 'sidebar-filter-view.mjs', ['PJ'], await v3SidebarImports('sidebar-filter-view.mjs', 'shared-21-R7LldJ05.js', {
    u: 'react', h: 'react', g: 'react',
    J9: 'memo', J0: 'memo', K0: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo', I2: 'memo', Z1: 'memo', Z2: 'memo', J4: 'memo', K4: 'memo', J5: 'memo', K5: 'memo',
    H: [`${v3Frame}#Jo=GT`, `../view-tabs/${v3Frame}`, 'CdsDropdown'],
    xf: [`${v3Intl}#l`, '../../source-code-start-adapters.jsx', 'StartMessage'],
    ny: ['shared-28-DNYlf4wu.js#js=$h', '../sidebar-resize/logical-side.mjs', 'physicalSide'],
  }, {
    PJ: ['"sessionList"', 'keepOpen:!0,label:e,options:we,value:Xt,onChange:Vt,separatorBefore:"none"', 'ie.offered||ce||X', 'checked:ae.sideChatRowsShown', 'OJ.sideChats', 'OJ.emptyGroups', 'atDefaults:y,onReset:Qt', '"8Q504Vv22k"'],
    HJ: ['separatorBefore:a', 'keepOpen:!0,onClick:i,children:r'],
  }) + `
    import {sidebarFilterMessages as OJ,SidebarOptionMenu as qJ,SidebarSortMenu as JJ,SidebarViewResetItems as UJ} from './sidebar-filter-controls.mjs';
    import {SidebarShowToggleItem as HJ} from '../../source-sidebar-sections-adapters.jsx';
  `, 'export {PJ as CurrentSidebarFilterContent};', v3Source, {PJ:{ifTest:'n === "sessionList"',result:'fn',cache:'$',parameters:'{intl:Q,direction:c,groupOptions:we,groupBy:Xt,onGroupBy:Vt,sortOptions:ke,sortBy:f,onSortBy:Ht,ascending:Ut,onAscending:Wt,metadata:Te,onMetadata:Pt,routinesToggle:ie={offered:false,checked:false},sideChatsOffered:X=false,sideChatRows:ae={sideChatRowsShown:false},onSideChats:Ft,emptyGroupsAvailable:ce=true,emptyGroups:Y,onEmptyGroups:Mt,resetAvailable:Zt,onReset:Qt}'}});
  // R2-sidebar map-cc-sidebar: shared-21 search field. Hz (2.42304.0 zF, old iI) joins the hit-row family (hit-row
  // hit-row-main [--cds-hit-gap-y:10px]) so its click target reaches across the gap below it. 3.6556.2 (sidebar §2.1 E6):
  // RF zF -> Vz Hz (React Compiler form; Hz's onMouseDown is the hoisted Uz). Vz only adds the fizzy-lake `panels`
  // case (ql = view-tabs isFizzyLakePartEnabled, off: Qm = [], E12), with Dz its `panels && !e` test.
  await emit('shared-21-R7LldJ05.js', 'sidebar-search.mjs', ['Dz','Vz','Uz','Hz'], await v3SidebarImports('sidebar-search.mjs', 'shared-21-R7LldJ05.js', {
    u: 'react', h: 'react',
    J9: 'memo', J0: 'memo', K0: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo', J3: 'memo', K3: 'memo', J5: 'memo', K5: 'memo',
    ql: ['shared-4-DUB1Oi0O.js#Yo=lp', '../view-tabs/shared-4-DUB1Oi0O.js', 'isFizzyLakePartEnabled'],
    Np: ['shared-18-D3y8YMFN.js#Ss=bk', './sidebar-row-primitive.mjs', 'sidebarFocusClass'],
    vm: ['shared-18-D3y8YMFN.js#gs=kk', './sidebar-row-primitive.mjs', 'SidebarRowButton'],
    fe: [`${v3Frame}#od=us`, '../../source-code-start-adapters.jsx', 'StartIcon'],
    xf: [`${v3Intl}#l`, '../../source-code-start-adapters.jsx', 'StartMessage'],
    j_: ['shared-20-mUr7IqZY.js#Vi=vy', '../../source-sidebar-current-adapters.jsx', 'useSidebarSearchIntent'],
    nr: ['shared-1-BJhqMmkf.js#Pn=WV', '../../source-sidebar-current-adapters.jsx', 'useSidebarSearchShortcut'],
    X: [`${v3Frame}#Zu=lc`, '../../source-sidebar-current-adapters.jsx', 'useSidebarShortcutPlatform'],
    ie: [`${v3Frame}#Xu=Dc`, '../../source-sidebar-current-adapters.jsx', 'sidebarShortcutAria'],
    W: [`${v3Frame}#Ku=oc`, '../../source-sidebar-current-adapters.jsx', 'SidebarSearchShortcut'],
  }, {Vz:['fieldAboveNew','recentsHeaderIcon','"panels"'], Dz:['"panels"'], Hz:['"sidebar_field"','"command_palette"','df-search-field hit-row hit-row-main [--cds-hit-gap-y:10px]','"xmcVZ0BU63"','"data-tab-section"','df-search-field-keys']}), 'export {Vz as sidebarSearchPlacement,Hz as SidebarSearchField};', v3Source);
  // R4g-sidebar SB3 (X7-06): shared-16's menu rows over the CDS Dropdown parts (3.6556.2: `Jo as O`, view-tabs
  // CdsDropdown), the parts of the CDS ContextMenu the section header, reorder and blank-area menus put these rows in.
  // The host kit answers them there and the host SourceMenu inside the host's own SourceSidebarMenu body.
  // 3.6556.2 (React Compiler form): ru iu au cu lu uu -> kl Al jl Il Ll Rl (the mapping tool's ru -> ec / iu missing is a
  // mismatch: ec is an unrelated ut(null) store; kl is the row-count context Il / Rl provide and Al reads). Al now
  // registers in a layout effect (p = vendor-frame bo = useLayoutEffect).
  await emit('shared-16-ByfgAyLr.js', 'sidebar-menu-groups.mjs', ['kl','Al','jl','Il','Ll','Rl'], await v3SidebarImports('sidebar-menu-groups.mjs', 'shared-16-ByfgAyLr.js', {
    b: 'react', g: 'react', p: 'react', S: 'react', a: 'react', u: 'react',
    J9: 'memo', J0: 'memo', K0: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo', J3: 'memo', K3: 'memo',
    O: [`${v3Frame}#Jo=GT`, '../../source-sidebar-menu-kit.jsx', 'SidebarMenuKit'],
  }, {kl:['b(null)'], Al:['n(1),()=>n(-1)'], jl:['O.Item'], Il:['hasOwnRows','O.Separator'], Ll:['registerRow','separatorBefore'], Rl:['O.Group','"presentation"']}), 'export {Al as RegisterSidebarMenuRow,jl as SidebarMenuItem,Il as SidebarMenuSection,Ll as OrderedSidebarMenuGroups};', v3Source);
  // 3.6556.2: shared-19 jX MX -> shared-46 EO DO (sidebar §1.1: shared-19's sidebar pieces moved to shared-46).
  await emit('shared-46-BIbZBGFq.js', 'sidebar-menu-order.mjs', ['EO','DO'], await v3SidebarImports('sidebar-menu-order.mjs', 'shared-46-BIbZBGFq.js', {
    o: 'react', J9: 'memo', J1: 'memo', K1: 'memo',
    Kf: ['shared-16-ByfgAyLr.js#ii=Ll', './sidebar-menu-groups.mjs', 'OrderedSidebarMenuGroups'],
  }, {EO:['"new","open","edit","share","organize","settings","view","staff","panes","remove"'], DO:['order:EO']}), 'export {EO as sidebarMenuGroupOrder,DO as SidebarOrderedMenu};', v3Source);
  // R2-sidebar map-cc-sidebar: the group view. vk (2.42304.0 uZ, old hY) reads "any collapsed group" through hk (sZ),
  // which the blank-area Select all also uses; exported for it. $e is shared-25 up, the original ownerWindow.
  // 3.6556.2 (sidebar §2.1 B4): shared-19 nZ oZ sZ cZ lZ uZ -> shared-46 YO mk hk gk _k vk (cZ / sZ were missed by the
  // mapping tool: `checkVisibility?.() !== !1`, `"collapsed").length > 0`). Collapse all and Expand all are both always
  // listed now, the one that cannot act disabled with its reason (MO.collapseAll / expandAll: "Everything shown is
  // already collapsed." / "Everything is already expanded."); nothing is rendered when neither can act. MO (with the
  // Archive all reasons) is exported for the section header menus (w3-sidebar-sections-gen).
  await emit('shared-46-BIbZBGFq.js', 'sidebar-group-view.mjs', ['YO','mk','hk','gk','_k','MO','vk'], await v3SidebarImports('sidebar-group-view.mjs', 'shared-46-BIbZBGFq.js', {
    x: 'react', h: 'react', S: 'react', o: 'react', u: 'react', d: 'react',
    J9: 'memo', J0: 'memo', K0: 'memo', J1: 'memo', K1: 'memo', I1: 'memo', J2: 'memo', K2: 'memo', J3: 'memo', K3: 'memo',
    Yf: ['shared-16-ByfgAyLr.js#si=jl', './sidebar-menu-groups.mjs', 'SidebarMenuItem'],
    Z: [`${v3Intl}#l`, '../../source-code-start-adapters.jsx', 'StartMessage'],
    $e: ['shared-25-DOWZRSlq.js#up=pf', './owner-window.mjs', 'ownerWindow'],
    Ho: v3Defined('Ho'),
  }, {YO:['x(null)'], mk:['[data-group-toggle][aria-expanded=','[inert]:not([data-cds-sheet-inert])'], hk:['"collapsed").length>0'], gk:['checkVisibility'], _k:['DOCUMENT_POSITION_FOLLOWING'], MO:['"Nothing to archive right now."','"Everything shown is already collapsed."','"Everything is already expanded."'], vk:['getList','canCollapse','canExpand','"C/hoUWymw3"','"u6c1aDVosk"','disabledReason']}), 'export {YO as SidebarListContext,mk as sidebarGroupToggles,hk as sidebarHasCollapsedGroups,gk as sidebarToggleVisible,_k as sidebarPrecedingToggles,vk as SidebarGroupViewItems,MO as sidebarListMenuReasons};', v3Source);
  // R3-sidebar2 (cov7-02): session cycling from shared-16's cycler (3.6556.2 Pg, exported `Y`; 2.42304.0 qp): Fg
  // (modifier keys), Ig (the focus guard: Ng composer / Mg listbox selectors, ah over oh), Kg (ctrl_tab /
  // cmd_shift_bracket / alt_arrow), Lg / Rg / zg (row-key resume), Bg / Vg (alias rows, data-cycle-expands-group), Hg /
  // Ug (the list and the selected row's neighbour), Wg (expand the folded group a step lands in), Gg (open a row button,
  // its group expanded first), and Pg's own step position `m` (the aria-current skip). shared-52 ah (X, the dframe store)
  // is the host's folded-group state (src/session-cycle-adapters.mjs); the step's `Hg` is the host's list (a parameter,
  // so the host can hand in its own DOM form of Hg).
  // 3.6556.2 (w2-sidebar-current-b; old -> new by feature strings, every body identical unless noted): shared-1 tg lg fg
  // -> y_ D_ A_; shared-156 BB HB WB ff pf -> PK IK RK pm mm; shared-9 Dm Om km -> zy By Vy; shared-7 XM -> zB (now takes
  // the document, default `document`); shared-16 Wp Gp Kp Jp Mf jf Yp am -> jg Mg Ng Fg oh ah Ig Kg, where Kg reads
  // ⌘⇧] / ⌘⇧[ through the new Th (the key itself: ] } +1, [ { -1; else BracketRight / BracketLeft by code unless the
  // key is a printable character the layout types there: + - = _, or any once navigator.keyboard's layout map shows no
  // [ / ] key, yh bh xh Sh Ch wh). The rows Xp…im -> Lg…Gg are identical (data/sidebar-targets.json); the step owner qp
  // -> Pg (local p -> m). Imports by the chunk's import table (v3SidebarImports): shared-1 tf / Wd = y_ / A_ (tt / Ye),
  // shared-156 Cr / wr = IK / RK (br / Tr) and Ig = mm (Sr), shared-9 pn = Vy (Mi), shared-7 Q = zB (Ni), shared-78 mE =
  // Eo (tn, generated as surface-chord-platform), shared-frame Iu = Uc (E, generated as dom-owner, which keeps the
  // cycle modules loadable without the CDS graph), vendor-frame Sa = flushSync (c).
  await emit('shared-1-BJhqMmkf.js', 'session-cycle-composer.mjs', ['y_','D_','A_'], await v3SidebarImports('session-cycle-composer.mjs', 'shared-1-BJhqMmkf.js', {}, {y_:['"chat-input"'], D_:['"code-prompt-input"'], A_:['[data-testid="${D_}"]']}), 'export {y_ as chatInputTestId,A_ as codePromptInputSelector};', v3Source);
  await emit('shared-156-BLTosN8U.js', 'session-cycle-focus.mjs', ['PK','IK','RK','pm','mm'], await v3SidebarImports('session-cycle-focus.mjs', 'shared-156-BLTosN8U.js', {}, {PK:['32'], IK:['shadowRoot?.activeElement','isTruncated:!0'], RK:['e.isTruncated||e.hops.some(t)'], mm:['pm+=1','--pm']}), 'export {IK as activeElementHops,RK as anyActiveElementHop,mm as asProgrammaticClick};', v3Source);
  await emit('shared-9-CM21XrJw.js', 'session-cycle-claims.mjs', ['zy','By','Vy'], await v3SidebarImports('session-cycle-claims.mjs', 'shared-9-CM21XrJw.js', {}, {zy:['new WeakMap'], By:['n.delete(t)'], Vy:['if(e())return!0']}), 'export {By as claimComposerArrowKeys,Vy as composerClaimsArrowKeys};', v3Source);
  await emit('shared-7-DBAgAi5H.js', 'session-cycle-terminal.mjs', ['zB'], await v3SidebarImports('session-cycle-terminal.mjs', 'shared-7-DBAgAi5H.js', {}, {zB:['[data-ccd-terminal]','e=document']}), 'export {zB as terminalHasFocus};', v3Source);
  await emit('shared-16-ByfgAyLr.js', 'session-cycle-chords.mjs', ['jg','Mg','Ng','Fg','oh','ah','Ig','yh','bh','xh','Sh','Ch','wh','Th','Kg'], await v3SidebarImports('session-cycle-chords.mjs', 'shared-16-ByfgAyLr.js', {
    tt: ['shared-1-BJhqMmkf.js#tf=y_', './session-cycle-composer.mjs', 'chatInputTestId'],
    Ye: ['shared-1-BJhqMmkf.js#Wd=A_', './session-cycle-composer.mjs', 'codePromptInputSelector'],
    br: ['shared-156-BLTosN8U.js#Cr=IK', './session-cycle-focus.mjs', 'activeElementHops'],
    Tr: ['shared-156-BLTosN8U.js#wr=RK', './session-cycle-focus.mjs', 'anyActiveElementHop'],
    Mi: ['shared-9-CM21XrJw.js#pn=Vy', './session-cycle-claims.mjs', 'composerClaimsArrowKeys'],
    Ni: ['shared-7-DBAgAi5H.js#Q=zB', './session-cycle-terminal.mjs', 'terminalHasFocus'],
    tn: ['shared-78-D5Fw2h0a.js#mE=Eo', './surface-chord-platform.mjs', 'isMacUserAgent'],
    E: [`${v3Frame}#Iu=Uc`, './dom-owner.mjs', 'elementOrNull'],
  }, {jg:['50'], Mg:['select,[role="combobox"],[role="listbox"],[role="application"]'], Fg:['"Control"','"Meta"','"Alt"'], oh:['.epitaxy-approval-card:not([data-collapsed])'], Ig:['"alt_arrow"','data-draft-persisted'], yh:['"]":1'], bh:['BracketRight:1,BracketLeft:-1'], wh:['getLayoutMap'], Th:['e.code'], Kg:['"alt_arrow"','"ctrl_tab"','"cmd_shift_bracket"','"ArrowDown"']}), 'export {jg as sessionCycleRepeatMs,Mg as cycleListboxSelector,Ng as cycleComposerSelector,Fg as isCycleModifierKey,ah as ownsArrowKeys,Ig as cycleBlockedByFocus,Kg as sessionCycleChord,Th as cycleBracketDirection};', v3Source);
  await emit('shared-16-ByfgAyLr.js', 'session-cycle-rows.mjs', ['Lg','Rg','zg','Bg','Vg','Hg','Ug','Wg','Gg'], await v3SidebarImports('session-cycle-rows.mjs', 'shared-16-ByfgAyLr.js', {
    c: 'react',
    Sr: ['shared-156-BLTosN8U.js#Ig=mm', './session-cycle-focus.mjs', 'asProgrammaticClick'],
    X: ['shared-52-uHFNjl7C.js#ah=q', '../../session-cycle-adapters.mjs', 'sessionCycleGroupStore'],
  }, {Bg:['"data-row-alias-of"'], Vg:['"data-cycle-expands-group"'], Hg:['[data-row-main-button]'], Wg:['collapsedGroups','expandGroup'], Gg:['scrollIntoView']}), 'export {Lg as cycleRowKey,Rg as cycleButtonForRowKey,zg as cycleResumePosition,Bg as rowAliasAttribute,Vg as cycleExpandsGroupAttribute,Hg as recentsCycleButtons,Ug as cycleNeighbourButton,Wg as expandCycleGroup,Gg as openCycleButton};', v3Source);
  // w10-ccres-cycle-step: 3.6556.2 Pg's step arrow `m = () => { let { buttons: e, selectedIdx: t } = Hg(l), …` (Pg
  // has a second `m`, the capture keydown `m = J2($, 13, t, s) ? …`, told apart by initType). Its free names are the
  // parameters, in the order of the old 2.42304.0 qp `p` (u, c, f, o, tm): d (the held record), l (the mode), p (Home
  // shows a draft), o (the direction), Hg (the list); zg is session-cycle-rows' cycleResumePosition. Outside the
  // fragment: the ctrl_tab branch is behind the GrowthBook gate _g() (hg="__gb__320800483", off here, R15) and the
  // capture mousedown `x` is session-cycle-model.mjs `mousedown`, added by main.jsx with {capture: true}.
  await emit('shared-16-ByfgAyLr.js', 'session-cycle-step.mjs', ['Pg'], "import {cycleResumePosition as zg} from './session-cycle-rows.mjs';", 'export {Pg as sessionCycleStep};', v3Source, {Pg:{local:'m',direct:true,initType:'ArrowFunctionExpression',parameters:'d, l, p, o, Hg'}});
  // R3-sidebar2 (sidebar-15): the bulk archive / delete originals (3.6556.2 shared-46; 2.42304.0 shared-19): LO (IX: which
  // targets of a bulk action go through the nested-sessions question, a family nested in more of them first), eO / $D /
  // tO (IY / FY / LY: the bulk delete confirmation copy: "Delete # sessions", the archived and unloaded lines) and RD /
  // VD / WD / qD (wY / DY / AY / NY: the worktree confirm copy, with the several-sessions "Couldn’t check" variant, and
  // its list of titles; qD is React Compiler output now, its row callback hoisted as JD). Ho is vendor-intl f
  // (defineMessages, identity); Z is FormattedMessage over the host catalog; o / u are the JSX runtime (Ha / Ua).
  await emit('shared-46-BIbZBGFq.js', 'sidebar-bulk-family.mjs', ['LO'], await v3SidebarImports('sidebar-bulk-family.mjs', 'shared-46-BIbZBGFq.js', {}, {LO:['nestedSessionsToAsk','codeRef']}), 'export {LO as bulkNestedFamilies};', v3Source);
  await emit('shared-46-BIbZBGFq.js', 'sidebar-bulk-delete-copy.mjs', ['eO','$D','tO'], await v3SidebarImports('sidebar-bulk-delete-copy.mjs', 'shared-46-BIbZBGFq.js', {Ho: v3Defined('Ho')}, {eO:['someArchived','unloadedStay','groupTitle'], tO:['confirmLabel']}), 'export {eO as bulkDeleteMessages,$D as remoteDeleteMessages,tO as bulkDeleteCopy};', v3Source);
  await emit('shared-46-BIbZBGFq.js', 'sidebar-bulk-worktree-copy.mjs', ['RD','VD','WD','JD','qD'], await v3SidebarImports('sidebar-bulk-worktree-copy.mjs', 'shared-46-BIbZBGFq.js', {
    o: 'react', u: 'react', J9: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo',
    Z: [`${v3Intl}#l`, '../../source-code-start-adapters.jsx', 'StartMessage'],
    Ho: v3Defined('Ho'),
  }, {RD:['10'], VD:['discardDirty','discardUnknown'], WD:['"checking"','"dirty"','"discard"','"archive"'], qD:['"wHChJytals"','mt-md flex flex-col gap-xs break-words']}), 'export {RD as worktreeListLimit,VD as worktreeFolderMessages,WD as worktreeConfirmCopyOf,qD as WorktreeSessionTitles};', v3Source);
  // R2-btw NBS-1: 2.42304.0 main process (asar index.chunk-B5tintml.js, "Link a session whenever you mention one").
  // w2-tr-turn: 3.6556.2 index.chunk-DBIg6EBr Ey (2.42304.0 B5tintml Sy), found by "Link a session whenever you mention
  // one" (cy); the prompt text is unchanged, only the names moved (xy→Ty, by→wy, yy→Cy, _y→xy, vy→Sy, Sy→Ey).
  await emit('index.chunk-DBIg6EBr.js', '../../../electron/generated/side-session-prompt.mjs', ['cy','Ty','wy','Cy','xy','Sy','Ey'], '', 'export {Ey as sideSessionPrompt};', v3Desktop);
  // cc-rest-csv (3.6556.2, research/code-current-rest.md §3 P2, data/code-current-rest-map.json batch cc-rest-csv):
  // cd5fd9055-BXQRn_nx.js. csv-model is the 2.42304.0 model renamed (v/y/b/x/S/C/w/T/E/re/ie/ae/oe/ce/le/O/ue →
  // f/p/m/h/g/ce/_/v/y/le/ue/de/fe/ge/_e/x/ye) except the ISO date: the regex ce gains a fraction group
  // `(?::(\d{2})(?:[.,](\d+))?)?` and y passes `Number(l.slice(0,3).padEnd(3,"0"))` as milliseconds. countOccurrences
  // is shared-78 `Ky as nS` (string-count.mjs). Export names stay the 2.42304.0 locals (R4/E7).
  await emit('cd5fd9055-BXQRn_nx.js', 'csv-model.mjs', ['f','p','m','h','g','ce','_','v','y','le','ue','de','fe','ge','_e','x','ye'], "import {countOccurrences as u} from './string-count.mjs';", 'export { f as v, m as b, y as E, le as re, ue as ie, de as ae, fe as oe, ge as ce, _e as le, ye as ue };', v3Source);
  // c3fde7009-LYGOoUpG.js ct/lt/cn (2.42304.0 lt/ut/rn): React Compiler output of the same print context, print
  // registration hook and document column (vendor-frame to/uo/ho/Ha = createContext/use/useEffect/jsx as x/S/m/r; S is
  // React's use(), as in both releases, not useContext). Cache helpers from view-tabs by the E3 names (R3).
  await emit('c3fde7009-LYGOoUpG.js', 'document-frame.mjs', ['ct','lt','cn'], `import {createContext as x, use as S, useEffect as m} from 'react'; import {jsx as r} from 'react/jsx-runtime'; ${sidebarMemo('J9 J1 K1 J2 K2 J5 K5')}`, 'export { ct as PrintContext, lt as usePrintRegistration, cn as DocumentColumn };', v3Source);
  // cd5fd9055 b/he (2.42304.0 D/se), compiled; pe (the field's onContextMenu stopPropagation), me (the identity index
  // map) and ve ("w-56", 2.42304.0 "w-[14rem]") are hoisted by the compiler. Until the field lands it holds its width
  // with `data-testid="csv-filter-field-hold"` (`${ve} shrink-0`); an unsorted sort button is text-muted-as-secondary.
  // Imports (vendor-frame Co/_o/mo/wo/Ha/Ua/Ba = useRef/useId/useDeferredValue/useState/jsx/jsxs/clsx as t/i/a/o/n/r/e;
  // shared-frame Eu/od/vs = CdsButton/CdsIcon/CdsTextInput as s/c/l, view-tabs names; vendor-intl l/p as d/ee;
  // shared-156 `aI as Vs` (the after-paint field landing, unpublished) as te; cc0a875c8 t as ie; c68c4283d telemetry
  // gn/hn (table.sorted/table.filtered) as ne/re; c3fde7009 l/m as ae/oe; c02d6193d t as se). Host services as before.
  await emit('cd5fd9055-BXQRn_nx.js', 'csv-view.mjs', ['b','pe','me','he','ve'], `
    import {useRef as t, useId as i, useDeferredValue as a, useState as o} from 'react';
    import {jsx as n, jsxs as r} from 'react/jsx-runtime';
    import {re as le, ie as ue, ae as de, oe as fe, ce as ge, le as _e, ue as ye} from './csv-model.mjs';
    import {parseCsvPreview as se} from './csv-parser.mjs';
    import {DocumentColumn as ae, usePrintRegistration as oe} from './document-frame.mjs';
    import {clsx as e} from '../view-tabs/${official.vendorFrame}';
    import {CdsButton as s, CdsIcon as c, CdsTextInput as l} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5 I3 I5 Z1')}
    import {CsvMessage as d, useCsvIntl as ee, useCsvFieldLanding as te, CsvEmptyState as ie} from '../../source-csv-adapters.jsx';
    const ne=()=>{}, re=()=>{};
  `, 'export { b as EpitaxyCsvPreview };', v3Source);
  // cc-rest-transcript (3.6556.2, research/code-current-rest.md §3 P0): the Tab-key tracking of 2.42304.0 c9f414608 i
  // moved into c99ca27a0 r (exported t): document-level keydown / keyup / focusin capture and window blur, the
  // "[data-base-ui-focus-guard]" selector e and the element test n, returning {isTabFocus, stop}. c9f414608 i
  // (attachTabFocusRelease) keeps only its own focusin test over it (`f.isTabFocus(t)`, one release per Tab press:
  // `l === d`), `e` is shared-25 up (pf, ownerWindow). Both are pinned below (tabFocusPins); export names stay.
  await emit('c99ca27a0', 'tab-focus-tracker.mjs', ['e','n','r'], '', 'export {r as trackTabFocus};', v3Source);
  await emit('c9f414608', 'tab-focus-release.mjs', ['n','r','i'], "import {ownerWindow as e} from './owner-window.mjs'; import {trackTabFocus as t} from './tab-focus-tracker.mjs';", 'export { i as attachTabFocusRelease };', v3Source);
  // R3-topbar TT-05: the follow hook's key classifier c7f8992b4 ge (classifyKeyScroll, exported n; 2.42304.0 C) with the
  // editable selector m / g and the modifier keys he it reads, and the key-intent window ne = 1e3 (2.42304.0 re; `ce = p
  // - N.current < ne`: an upward scroll within a second of a classified "up" is the reader's). 3.6556.2: pure renames.
  // The sub-agent view passes ge itself (cccc2cf0a-DhZC33Gc: `classifyKeyScroll:ys`, `n as ys`).
  await emit('c7f8992b4', 'tab-focus-key-scroll.mjs', ['m','g','he','ge','ne'], '', 'export { ge as classifyKeyScroll, ne as keyScrollIntentMs, m as keyScrollEditable };', v3Source);
  // cc-rest-env-ui (3.6556.2): form-layout, field-header, folder-view, menu-controls, menu-rows and select-parts read the
  // 3.6556.2 renderer through their pins (cache helpers: view-tabs E3 names via sidebarMemo); checkbox re-exports the
  // view-tabs CdsCheckbox; field-controls slices the 3.6556.2 Field parts over the host native field adapters (the
  // view-tabs CdsTextInput reads Base UI's field context, not theirs). c29df1c52 _ / v: the body class lost -mb-pad-sm and ends pb-lg; CDS Dialog
  // `a` is the host footer.
  const envUiPins = async target => (await import('./code-current-environment-pins.mjs')).pinEnvironmentHelper(target, v3Source, selected(target));
  await emit('c29df1c52', 'environment-form-layout.mjs', await envUiPins('environment-form-layout.mjs'), `import {jsx as e} from 'react/jsx-runtime'; import {SourceDialogFooter as Footer} from '../../source-dialog.jsx'; ${sidebarMemo('J9 J2 K2')} const a={Footer};`, 'export { _ as environmentBodyClass, v as EnvironmentFooter };', v3Source);
  // W2 w2-cds-followup (plan §4, R2/R3/E5): button-press and tooltip-structure read 3.6556.2 shared-frame-6jtSkIit.js.
  // 2.42304.0 ps ms hs Ll Rl zl Bl -> Hs Us Ws Eu Du Ou ku and Gc Kc qc -> Dl Ol kl (same bodies, renamed; none is
  // exported by the chunk). Each binding is found by its own declaration and its shape pinned with looseFeature over the
  // raw chunk (so a minified name reused for something else fails here); tooltip-structure's `ge` / `Se` must be the
  // vendor-frame imports Ya / ao, i.e. React's Fragment / isValidElement. Export names stay.
  const cdsPin = async (target, pins, vendor = {}) => {
    if (!selected(target)) return;
    const raw = await fs.readFile(path.join(v3Source, official.sharedFrame), 'utf8'), ast = parsers.babel.parse(raw, {});
    for (const [name, shape] of Object.entries(pins)) {
      const node = ast.program.body.flatMap(n => n.type === 'FunctionDeclaration' ? [n] : n.declarations ?? []).filter(n => n.id?.name === name);
      if (node.length !== 1) throw Error(`${target}: ${official.sharedFrame} declares ${name} ${node.length} times`);
      if (!new RegExp(`^${official.looseFeature(shape).source}$`).test(raw.slice(node[0].start, node[0].end))) throw Error(`${target}: ${name} is no longer ${shape}`);
    }
    const vendorText = Object.keys(vendor).length ? await fs.readFile(path.join(v3Source, official.vendorFrame), 'utf8') : '';
    for (const [local, [alias, member]] of Object.entries(vendor)) {
      const specs = ast.program.body.filter(n => n.type === 'ImportDeclaration' && n.source.value === `./${official.vendorFrame}`).flatMap(n => n.specifiers);
      if (!specs.some(s => s.imported.name === alias && s.local.name === local)) throw Error(`${target}: ${local} is not vendor-frame ${alias}`);
      official.assertVendorAlias(vendorText, alias, ['react', member]);
    }
  };
  await cdsPin('button-press.mjs', { Hs: 'Hs=.8', Us: 'function Us(e,t,n){return e<=0||t<=0?null:{sx:Math.max(Hs,1-2*n/e),sy:Math.max(Hs,1-2*n/t)}}',
    Ws: 'function Ws(e,t,n,r){let i=Us(e.offsetWidth,e.offsetHeight,t);i!==null&&(e.style.setProperty(n,String(i.sx)),e.style.setProperty(r,String(i.sy)))}',
    Eu: 'Eu=1/32', Du: 'Du=.5', Ou: 'Ou=1.5', ku: 'function ku(e){return Math.min(Ou,Math.max(Du,e*Eu))}' });
  await emit(official.sharedFrame, 'button-press.mjs', ['Hs','Us','Ws','Eu','Du','Ou','ku'], '', 'export { Us as buttonPressScale, Ws as writeButtonPressScale, ku as buttonPressInset };', v3Source);
  await cdsPin('tooltip-structure.mjs', { Dl: 'Dl=new WeakMap', Ol: 'Ol=0',
    kl: 'function kl(e){if(e==null||e===""||typeof e=="boolean")return"none";if(Array.isArray(e))return`[${e.map(kl).join(",")}]`;if(!Se(e))return typeof e;let t=e.key??"",n=e.type;if(n===ge||typeof n=="string"){let{children:r}=e.props;return`<${String(n)}:${t}>${kl(r)}`}if(typeof n!="function"&&(typeof n!="object"||!n))return`tag:${String(n)}:${t}`;let r=Dl.get(n);return r===void 0&&(r=`type:${Ol++}`,Dl.set(n,r)),`${r}:${t}`}' },
    { ge: ['Ya', 'Fragment'], Se: ['ao', 'isValidElement'] });
  await emit(official.sharedFrame, 'tooltip-structure.mjs', ['Dl','Ol','kl'], "import {Fragment as ge,isValidElement as Se} from 'react';", 'export { kl as tooltipContentKey };', v3Source);
  // W2 w2-titlebar-current (research/titlebar-frame.md §1.1/§3.2, plan R2/R3): the titlebar, split, tile and focus
  // targets below read 3.6556.2 (v3Source). Before each emit, titlebarPin checks the new chunk: every listed root still
  // carries its stable features (literals, keys, class strings: never minified statements), the binding list is exactly
  // the same-chunk closure of the roots (stopping at imports; selections list their owner only), each import the slice
  // keeps names the same export of its chunk as `imports` says (so a local import alias below always stands for that
  // official export), and the chunk still exports the roots under the official aliases its consumers import.
  // display-text … dev-server-description: 3.6556.2 since cc-rest-transcript (research/code-current-rest.md).
  const titlebarChunks = new Map(), looseFeature = official.looseFeature;
  const titlebarPin = async (target, prefix, { roots, bindings, features = {}, imports = {}, exports = {} }) => {
    if (!selected(target)) return;
    const files = (await fs.readdir(v3Source)).filter(name => prefix.endsWith('.js') ? name === prefix : name.startsWith(prefix + '-') && name.endsWith('.js'));
    if (files.length !== 1) throw Error(`Ambiguous source ${prefix}`);
    const label = `${target} (${files[0]})`;
    if (!titlebarChunks.has(files[0])) {
      const raw = await fs.readFile(path.join(v3Source, files[0]), 'utf8');
      const ast = parsers.babel.parse(raw, {});
      const babel = (await import('../../tools/node_modules/playwright/lib/transform/babelBundle.js')).default;
      let program;
      babel.traverse(ast, { Program(p) { program = p; } });
      titlebarChunks.set(files[0], { raw, ast, program });
    }
    const { raw, ast, program } = titlebarChunks.get(files[0]);
    const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    for (const [alias, local] of Object.entries(exports)) if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
    const declaration = name => {
      const binding = program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
      return binding.path;
    };
    for (const [name, list] of Object.entries(features)) {
      const node = declaration(name).node, text = raw.slice(node.start, node.end);
      const absent = list.filter(feature => typeof feature === 'string' ? !text.includes(feature) : !feature.test(text));
      if (absent.length) throw Error(`${label}: ${name} lacks ${absent.map(feature => typeof feature === 'string' ? JSON.stringify(feature) : String(feature)).join(', ')}`);
    }
    const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
    const closure = new Set(), reached = new Map();
    const visit = name => {
      if (closure.has(name) || reached.has(name)) return;
      const binding = program.scope.getBinding(name);
      if (!binding) throw Error(`${label}: unbound ${name}`);
      if (binding.path.isImportSpecifier()) { reached.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`); return; }
      closure.add(name);
      if (!roots) return;
      for (const [dependency, other] of Object.entries(program.scope.bindings))
        if (other.referencePaths.some(q => within(binding.path, q)) || other.constantViolations.some(q => within(binding.path, q))) visit(dependency);
    };
    (roots ?? bindings).forEach(visit);
    if (roots && JSON.stringify([...closure].sort()) !== JSON.stringify([...bindings].sort())) throw Error(`${label}: closure of ${roots.join(',')} is ${[...closure].sort().join(',')}, emit lists ${[...bindings].sort().join(',')}`);
    for (const [local, via] of Object.entries(imports)) {
      const binding = program.scope.getBinding(local);
      const actual = binding?.path.isImportSpecifier() ? `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}` : undefined;
      if (actual !== via) throw Error(`${label}: ${local} imports ${actual}, not ${via}`);
    }
    if (roots) for (const [local, via] of reached) if (imports[local] !== via) throw Error(`${label}: closure import ${local} (${via}) has no replacement`);
  };
  // The React Compiler slot helpers (E3) are view-tabs' published names; the official chunks import them from
  // shared-frame as J9 (ip) … K5 (up).
  const memo = `import {reactMemoCache as J9,memoSentinel as J8,memoIsEmpty as J0,memoChanged1 as J1,memoChanged2 as J2,memoChanged3 as J3,memoChanged4 as J4,memoChanged5 as J5,memoStore0 as K0,memoStore1 as K1,memoStore2 as K2,memoStore3 as K3,memoStore4 as K4,memoStore5 as K5} from '../view-tabs/shared-frame-6jtSkIit.js';`;
  const memoImports = Object.fromEntries(Object.entries({ J9:'ip', J8:'rp', J0:'Zf', J1:'Qf', J2:'$f', J3:'ep', J4:'tp', J5:'np', K0:'ap', K1:'op', K2:'sp', K3:'cp', K4:'lp', K5:'up' }).map(([local, alias]) => [local, `shared-frame-6jtSkIit.js:${alias}`]));
  const memoOf = (...locals) => Object.fromEntries(locals.map(local => [local, memoImports[local]]));
  // shared-2 dU (exported `es`; cc43287c9 imports it as yd): graphemePrefix over the lazily built Intl.Segmenter cU.
  await titlebarPin('grapheme-prefix.mjs', 'shared-2', { roots: ['dU'], bindings: ['cU','lU','dU'], exports: { es: 'dU' },
    features: { lU: ['granularity:"grapheme"'], dU: [looseFeature('.segment(e)'), looseFeature('Array.from(e).slice(0,t).join("")')] } });
  await emit('shared-2', 'grapheme-prefix.mjs', ['cU','lU','dU'], '', 'export {dU as graphemePrefix};', v3Source);
  // cc43287c9 YW (the session title menu): the caret tooltip label is now a memoised `Xe = <conditional>` (Xe is
  // assigned twice, so the whole conditional is selected), truncated at JW = 80 graphemes (`${yd(Ze, 79).trimEnd()}…`).
  await titlebarPin('session-menu-tooltip.mjs', 'cc43287c9', { bindings: ['JW','YW'], imports: { yd: 'shared-2-TF8v67kg.js:es' },
    features: { JW: ['JW=80'], YW: ['.trimEnd()}\\u2026`', 'sessionRef:t'] } });
  await emit('cc43287c9', 'session-menu-tooltip.mjs', ['JW','YW'], "import {graphemePrefix as yd} from './grapheme-prefix.mjs';", 'export {YW as sessionMenuTooltipLabel,JW as sessionMenuTooltipLimit};', v3Source, {YW:{conditional:'Ze.length <= JW || yd(Ze, JW) === Ze', whole:true, parameters:'Ze'}});
  // cc43287c9 oG (props sessionRef t, spawn o, draftTitle _): the draft h1[data-pane-title], `!t && !o && _ ? p("h1", …)
  // : null` inside a memo slot; p is vendor-frame Ha (jsx).
  await titlebarPin('titlebar-draft-title.mjs', 'cc43287c9', { bindings: ['oG'], imports: { p: 'vendor-frame-CnSY1sxv.js:Ha' },
    features: { oG: ['sessionRef:t', 'spawn:o', 'draftTitle:_', '"data-pane-title":"",className:"draggable truncate ps-2.5 text-body font-medium font-control text-muted-as-secondary"'] } });
  await emit('cc43287c9', 'titlebar-draft-title.mjs', ['oG'], "import {jsx as p} from 'react/jsx-runtime';", 'export {oG as titlebarDraftTitle};', v3Source, {oG:{conditional:'!t && !o && _', whole:true, parameters:'t, o, _'}});
  await titlebarPin('titlebar-toggle-fold.mjs', 'c73f45bc3', { roots: ['p_'], bindings: ['p_'], exports: { it: 'p_' },
    features: { p_: [looseFeature('folded:e.filter(e=>i.has(e))'), looseFeature('inline:e.filter(e=>!i.has(e))'), looseFeature('...e.filter(e=>!e.active)')] } });
  await emit('c73f45bc3', 'titlebar-toggle-fold.mjs', ['p_'], '', 'export {p_ as foldTitlebarToggles};', v3Source);
  await titlebarPin('dom-owner.mjs', 'shared-frame-6jtSkIit.js', { roots: ['aa','Uc'], bindings: ['aa','Uc'], exports: { Bd: 'aa', Iu: 'Uc' },
    features: { aa: [looseFeature('e?.ownerDocument.defaultView??globalThis.window')], Uc: [looseFeature('e?.nodeType===1?e:null')] } });
  await emit('shared-frame-6jtSkIit.js', 'dom-owner.mjs', ['aa','Uc'], '', 'export {aa as ownerViewOf,Uc as elementOrNull};', v3Source);
  await titlebarPin('titlebar-title-rect.mjs', 'shared-18', { roots: ['aS'], bindings: ['aS'], exports: { md: 'aS' }, features: { aS: ['.cc-lined-title-group'] } });
  await emit('shared-18', 'titlebar-title-rect.mjs', ['aS'], '', 'export {aS as titleGroupRect};', v3Source);
  // cd54a5401 nn (exported `c`): the titlebar fold hook, compiled. TF-C9: an end-clearance child
  // ([data-lined-row-end-clearance], shared-18 Jb) is measured as room, not as a pane; lastEnd is the rightmost rect in
  // both directions. rn (the rect map) is a compiler-hoisted function. f / m are shared-frame Bd / Iu (dom-owner), le is
  // shared-18 md (titleGroupRect), ie is shared-4 Yo (isFizzyLakePartEnabled, false while fizzy-lake is off, E12).
  await titlebarPin('titlebar-fold-measure.mjs', 'cd54a5401', { roots: ['nn','qt'], bindings: ['Lt','Rt','zt','Bt','Vt','Ht','Ut','Wt','Gt','qt','Jt','Yt','Xt','Zt','Qt','$t','en','tn','nn','rn'],
    exports: { c: 'nn', s: 'qt' },
    imports: { e: 'vendor-frame-CnSY1sxv.js:Co', n: 'vendor-frame-CnSY1sxv.js:Sa', o: 'vendor-frame-CnSY1sxv.js:bo', s: 'vendor-frame-CnSY1sxv.js:ho', u: 'vendor-frame-CnSY1sxv.js:wo',
      f: 'shared-frame-6jtSkIit.js:Bd', m: 'shared-frame-6jtSkIit.js:Iu', ie: 'shared-4-DUB1Oi0O.js:Yo', le: 'shared-18-D3y8YMFN.js:md', T: 'shared-0-DDOOdL6P.js:xv',
      ...memoOf('J9','J8','J0','J1','J2','J3','J4','J5','K0','K2','K3','K4','K5') },
    features: { Gt: ['"data-titlebar-share-slot"'], Jt: ['"code.titlebar_overflow_measure_bounded"'], qt: [looseFeature('maxHidden:e?7:6'), looseFeature('hiddenMainPanes:n?t-1:t')],
      nn: ['rootRef:', 'togglesRef:', 'sampleRef:', 'foldSetKey:', '"data-lined-row-end-clearance"', 'paddingInlineEnd', 'tier:"pill_compaction"', 'reason:"pass_cap"', 'hiddenCount:', 'pillsCompact:', 'titleRef:'],
      rn: [looseFeature('return e.getBoundingClientRect()')] } });
  await emit('cd54a5401', 'titlebar-fold-measure.mjs', ['Lt','Rt','zt','Bt','Vt','Ht','Ut','Wt','Gt','qt','Jt','Yt','Xt','Zt','Qt','$t','en','tn','nn','rn'], `
    import {useRef as e,useLayoutEffect as o,useEffect as s,useState as u} from 'react';
    import {flushSync as n} from 'react-dom';
    ${memo}
    import {ownerViewOf as f,elementOrNull as m} from './dom-owner.mjs';
    import {titleGroupRect as le} from './titlebar-title-rect.mjs';
    import {isFizzyLakePartEnabled as ie} from '../view-tabs/shared-4-DUB1Oi0O.js';
    // shared-0 xv (the O11Y datadog logger) has no local sink.
    const T=()=>{};
  `, 'export {nn as useTitlebarFold,qt as titlebarFoldLimits,Gt as titlebarShareSlotAttribute};', v3Source);
  // c73f45bc3 iy (cc43287c9 imports it as the not-ready lead): the known title as a non-interactive
  // span[data-pane-title] beside an aria-hidden caret slot, or the pulsing title ghost when no title is known. Its
  // classes are shared-6 constants (cg Kh sg ig lg dg, imported as un tn fn mn cn pn); Sr is shared-15 vn (true only
  // inside the fizzy `panels` scope), Qn is shared-18 px and zn shared-18 dS (the `panels` lead class, unused while
  // isFizzyLakePartEnabled("panels") is false, the local case).
  await titlebarPin('titlebar-lead-classes.mjs', 'shared-6', { roots: ['sg','cg','Kh','ig','lg','dg'], bindings: ['og','sg','cg','Kh','ig','lg','ug','dg'],
    exports: { lp: 'og', ip: 'sg', cp: 'cg', Df: 'Kh', up: 'ig', ap: 'lg', sp: 'ug', op: 'dg' },
    features: { og: ['"min-w-[32px] group-data-[pills-compact]/lead:min-w-[8px]"'], cg: ['min-w-[calc(32px+var(--cds-h-control,24px))]'], Kh: ['gap-[calc(--spacing(1)+var(--cds-pad-md))]'],
      ig: ['"truncate text-body font-medium font-control text-primary select-none"'], lg: ['"aspect-square w-control shrink-0"'], ug: ['rounded-[3px] bg-alpha-2'], dg: ['motion-safe:animate-pulse'] } });
  await emit('shared-6', 'titlebar-lead-classes.mjs', ['og','sg','cg','Kh','ig','lg','ug','dg'], '', 'export {cg as titleLeadClass,Kh as titleLeadGapClass,sg as titleSlotClass,ig as titleTextClass,lg as titleCaretSlotClass,dg as titleGhostClass};', v3Source);
  await titlebarPin('titlebar-panels-scope.mjs', 'shared-15', { roots: ['_n','vn'], bindings: ['_n','vn'], exports: { in: '_n', sn: 'vn' },
    imports: { m: 'vendor-frame-CnSY1sxv.js:to', u: 'vendor-frame-CnSY1sxv.js:fo' }, features: { _n: [looseFeature('m(void 0)')], vn: [looseFeature('return u(_n)===!0')] } });
  await emit('shared-15', 'titlebar-panels-scope.mjs', ['_n','vn'], "import {createContext as m,useContext as u} from 'react';", 'export {_n as TitlebarPanelsScope,vn as useTitlebarPanelsScope};', v3Source);
  // shared-18 px reads vendor-frame Ia (Base UI useDirection), now a view-tabs published name.
  await titlebarPin('titlebar-lead-parts.mjs', 'shared-18', { roots: ['dS','px'], bindings: ['iS','dS','px'], exports: { Ku: 'dS', Yd: 'px' },
    imports: { h: 'vendor-frame-CnSY1sxv.js:Ia' }, features: { px: [looseFeature('h()==="rtl"?"auto":void 0')], dS: ['group-data-[pills-compact]/lead'] } });
  await emit('shared-18', 'titlebar-lead-parts.mjs', ['iS','dS','px'], "import {useDirection as h} from '../view-tabs/vendor-frame-CnSY1sxv.js';", 'export {px as titleDirection,dS as panelsTitleLeadClass};', v3Source);
  await titlebarPin('titlebar-title-skeleton.mjs', 'c73f45bc3', { roots: ['iy'], bindings: ['iy'], exports: { I: 'iy' },
    imports: { i: 'vendor-frame-CnSY1sxv.js:Ha', s: 'vendor-frame-CnSY1sxv.js:Ua', Dt: 'shared-4-DUB1Oi0O.js:Yo', Sr: 'shared-15-BvlV43cI.js:sn', Qn: 'shared-18-D3y8YMFN.js:Yd', zn: 'shared-18-D3y8YMFN.js:Ku',
      un: 'shared-6-sd9jbJqs.js:cp', tn: 'shared-6-sd9jbJqs.js:Df', fn: 'shared-6-sd9jbJqs.js:ip', mn: 'shared-6-sd9jbJqs.js:up', cn: 'shared-6-sd9jbJqs.js:ap', pn: 'shared-6-sd9jbJqs.js:op', ...memoOf('J9','J4','K4') },
    features: { iy: ['"data-slot":"title-preview","data-pane-title":""', '"data-slot":"title-caret-slot"', '"data-slot":"title-ghost"', looseFeature('Dt("panels")')] } });
  await emit('c73f45bc3', 'titlebar-title-skeleton.mjs', ['iy'], `
    import {jsx as i,jsxs as s} from 'react/jsx-runtime';
    ${memo}
    import {isFizzyLakePartEnabled as Dt} from '../view-tabs/shared-4-DUB1Oi0O.js';
    import {useTitlebarPanelsScope as Sr} from './titlebar-panels-scope.mjs';
    import {titleDirection as Qn,panelsTitleLeadClass as zn} from './titlebar-lead-parts.mjs';
    import {titleLeadClass as un,titleLeadGapClass as tn,titleSlotClass as fn,titleTextClass as mn,titleCaretSlotClass as cn,titleGhostClass as pn} from './titlebar-lead-classes.mjs';
  `, 'export {iy as TitlebarTitleSkeleton};', v3Source);
  // w12b-titlebar-spawn-lead (W11 sweep-shell-a titlebar row; W10 titlebar notdone 1): while a new session spawns
  // (sessionRef t null, spawn o set) cc43287c9 oG's lead is `t||o ? p(EP,{origin:pe&&{kind:pe,label:ve},title:J,bare:M})`,
  // EP = c73f45bc3 ay (exported L): span[role=status] with the sr-only "Loading session", then ry's origin box (Qv's
  // origin glyph, local without a connection tint, or the pulsing origin ghost), the title (iy) and, once a title and
  // a folder label are known, Vv's static folder pill. ry's box classes are shared-6 Yh / Wh / Jh / Gh (c73f45bc3 en /
  // nn / an / dn); hn is shared-6 qh, held by session-rail-kit rail-column.mjs, fl (cccebaa3a "BookClosed") by
  // session-rail-kit rail-repo-icon.mjs and iy by titlebar-title-skeleton.mjs above (D1: imported, not sliced twice;
  // the pin still checks the whole closure, iy included). oG's seeds: pe / ve go through c73f45bc3 xv (RP, the
  // episode latch over shared-182 zL, held by mcp-app-card shared-182.mjs as rc) and the live origin is shared-52 nA
  // (cc43287c9 ni, `ne = o ? ni(o) : void 0`) over nk (files-changes path-basename.mjs).
  await titlebarPin('titlebar-origin-classes.mjs', 'shared-6', { roots: ['Yh','Wh','Jh','Gh'], bindings: ['Yh','Wh','Jh','Gh'],
    exports: { Cp: 'Yh', Ff: 'Wh', Mf: 'Jh', gf: 'Gh' },
    features: { Yh: ['"flex min-w-0 items-center"'], Wh: ['w-[var(--chat-gutter-start,32px)]', 'min-w-[calc(var(--origin-box-end-clearance,0)*1.75rem*var(--cds-rem-scale,1))]'],
      Jh: ['"ps-md shrink-0"'], Gh: ['"flex size-control shrink-0 items-center justify-center me-[calc(--spacing(1)+var(--cds-pad-md))]"'] } });
  await emit('shared-6', 'titlebar-origin-classes.mjs', ['Yh','Wh','Jh','Gh'], '', 'export {Yh as originRowClass,Wh as originBoxClass,Jh as panelsNoOriginClass,Gh as panelsOriginBoxClass};', v3Source);
  await titlebarPin('titlebar-spawn-origin.mjs', 'shared-52', { roots: ['nA'], bindings: ['nA','nk'], exports: { Gl: 'nA' },
    features: { nA: ['label:e.isScratchWorkspace?void 0:e.repoInfo?.name??(e.cwd?nk(e.cwd):void 0)', 'isScratchWorkspace:e.isScratchWorkspace===!0'],
      nk: ['Math.max(t.lastIndexOf("/"),t.lastIndexOf("\\\\"))'] } });
  await emit('shared-52', 'titlebar-spawn-origin.mjs', ['nA'], "import {pathBasename as nk} from '../files-changes/path-basename.mjs';", 'export {nA as spawnOrigin};', v3Source);
  await titlebarPin('titlebar-seed-latch.mjs', 'c73f45bc3', { roots: ['xv'], bindings: ['xv'], exports: { R: 'xv' },
    imports: { pr: 'shared-182-BI1KJccu.js:rc', ...memoOf('J9','J1','K1') }, features: { xv: [looseFeature('()=>e||void 0'), looseFeature('a!==r&&i(a),e??a')] } });
  await emit('c73f45bc3', 'titlebar-seed-latch.mjs', ['xv'], `
    import {reactMemoCache as J9,memoChanged1 as J1,memoStore1 as K1} from '../view-tabs/shared-frame-6jtSkIit.js';
    import {rc as pr} from '../mcp-app-card/shared-182.mjs';
  `, 'export {xv as useEpisodeSeed};', v3Source);
  const spawnLeadBindings = ['wv','Tv','Ev','Dv','Ov','kv','Av','jv','Nv','Fv','Rv','zv','Bv','Vv','Zv','Qv','ry','ay'];
  await titlebarPin('titlebar-spawn-lead.mjs', 'c73f45bc3', { roots: ['ay'], bindings: [...spawnLeadBindings, 'iy'], exports: { L: 'ay', I: 'iy' },
    imports: { i: 'vendor-frame-CnSY1sxv.js:Ha', s: 'vendor-frame-CnSY1sxv.js:Ua', c: 'vendor-frame-CnSY1sxv.js:Va', Z: `${official.vendorIntl}:l`,
      j: 'shared-frame-6jtSkIit.js:Kl', V: 'shared-frame-6jtSkIit.js:od', Sr: 'shared-15-BvlV43cI.js:sn', fl: 'cccebaa3a-DQt76PcF.js:t',
      en: 'shared-6-sd9jbJqs.js:Cp', nn: 'shared-6-sd9jbJqs.js:Ff', an: 'shared-6-sd9jbJqs.js:Mf', dn: 'shared-6-sd9jbJqs.js:gf', hn: 'shared-6-sd9jbJqs.js:vp',
      Dt: 'shared-4-DUB1Oi0O.js:Yo', Qn: 'shared-18-D3y8YMFN.js:Yd', zn: 'shared-18-D3y8YMFN.js:Ku',
      un: 'shared-6-sd9jbJqs.js:cp', tn: 'shared-6-sd9jbJqs.js:Df', fn: 'shared-6-sd9jbJqs.js:ip', mn: 'shared-6-sd9jbJqs.js:up', cn: 'shared-6-sd9jbJqs.js:ap', pn: 'shared-6-sd9jbJqs.js:op',
      ...memoOf('J9','J0','J1','J2','J3','J4','J5','K0','K1','K2','K3','K4','K5') },
    features: { ay: ['defaultMessage:"Loading session",id:"IY7S4mLrkm"', '"data-slot":"origin-ghost",className:"size-[18px] motion-safe:animate-pulse rounded bg-alpha-1"',
        'connection:t.kind==="local"?void 0:"connecting"', 'role:"status",className:"flex min-w-0 items-center"'],
      ry: ['"flex items-center gap-0.75 min-w-0 group-data-[pills-compact]/lead:shrink-0"'], Qv: ['"data-slot":"origin-glyph"', '"data-testid":"epitaxy-origin-indicator"'],
      Bv: ['"data-testid":"epitaxy-origin-label"'], kv: ['"CommandLine"', '"Laptop"', '"CloudSlash"'] } });
  // The emitted CdsIcon / CdsTooltip are view-tabs' published names in their concrete file (R3/R6, no facade); Z is
  // FormattedMessage over the host catalog (StartMessage, as the other code-current views).
  if (selected('titlebar-spawn-lead.mjs')) {
    const published = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
    for (const [name, alias] of Object.entries({ CdsIcon: 'od', CdsTooltip: 'Kl' }))
      if (published[name]?.file !== official.sharedFrame || published[name]?.export !== alias) throw Error(`titlebar-spawn-lead.mjs: view-tabs ${name} is not shared-frame ${alias}`);
  }
  await emit('c73f45bc3', 'titlebar-spawn-lead.mjs', spawnLeadBindings, `
    import {jsx as i,jsxs as s,Fragment as c} from 'react/jsx-runtime';
    ${memo}
    import {CdsIcon as V,CdsTooltip as j} from '../view-tabs/shared-frame-6jtSkIit.js';
    import {StartMessage as Z} from '../../source-code-start-adapters.jsx';
    import {useTitlebarPanelsScope as Sr} from './titlebar-panels-scope.mjs';
    import {TitlebarTitleSkeleton as iy} from './titlebar-title-skeleton.mjs';
    import {originRowClass as en,originBoxClass as nn,panelsNoOriginClass as an,panelsOriginBoxClass as dn} from './titlebar-origin-classes.mjs';
    import {LEAD_NO_ORIGIN_CLASS as hn} from '../session-rail-kit/rail-column.mjs';
    import {RAIL_REPO_ICON as fl} from '../session-rail-kit/rail-repo-icon.mjs';
  `, 'export {ay as TitlebarSpawnLead};', v3Source);
  // cc43287c9 hands focus on when a keyboard-focused toggle folds away, once the document has lost it (c4db265df tt
  // over c70925de4 t; `e` there is shared-25 ap = hf, the same ownerDocument as the generated owner-document.mjs).
  await titlebarPin('titlebar-focus-lost.mjs', 'c70925de4', { roots: ['t'], bindings: ['t'], exports: { t: 't' }, imports: { e: 'shared-25-DOWZRSlq.js:ap' }, features: { t: [looseFeature('r===null||r===n.body')] } });
  await emit('c70925de4', 'titlebar-focus-lost.mjs', ['t'], "import {ownerDocument as e} from './owner-document.mjs';", 'export {t as focusLost};', v3Source);
  await titlebarPin('titlebar-focus-orphaned.mjs', 'c4db265df', { roots: ['tt'], bindings: ['tt'], exports: { p: 'tt' }, imports: { Je: 'c70925de4-SEtaxEBR.js:t' }, features: { tt: [looseFeature('Je(e)||e.activeElement?.isConnected===!1')] } });
  await emit('c4db265df', 'titlebar-focus-orphaned.mjs', ['tt'], "import {focusLost as Je} from './titlebar-focus-lost.mjs';", 'export {tt as focusOrphaned};', v3Source);
  // cc-rest-transcript (3.6556.2; research/code-current-rest.md §2/§3 P0, data/code-current-rest-map.json): owner-window,
  // the tab-focus trio, display-text, attachment-file-name, visible-box, approval-read-gate and dev-server-description.
  // Each pin checks the new chunk before (or, for the targets emitted above in their manifest positions, right after) its
  // emit: roots, the same-chunk closure, the official export aliases, every import the slice keeps, and stable features.
  // Chunk imports that stand for a view-tabs public name are checked against the view-tabs manifest (same file, same
  // local), and generated code imports them from that concrete file by name (R3/R6), never through the facade.
  const viewTabsPublic = JSON.parse(await fs.readFile(path.join(root, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const assertPublished = async (target, pairs) => {
    if (!selected(target)) return;
    if (viewTabsPublic.referenceVersion !== official.referenceVersion) throw Error(`${target}: view-tabs is ${viewTabsPublic.referenceVersion}`);
    for (const [via, name] of Object.entries(pairs)) {
      const [file, alias] = via.split(':'), local = alias === undefined ? file.split('#')[1] : (await v3Chunk(file)).exported.get(alias);
      const pub = viewTabsPublic.publicNames[name], at = alias === undefined ? file.split('#')[0] : file;
      if (!pub || pub.file !== at || pub.local !== local) throw Error(`${target}: ${via} (${local}) is not view-tabs ${name}`);
    }
  };
  const restMemo = (...locals) => Object.fromEntries(locals.map(local => {
    const [alias, helper] = Object.entries(official.compilerHelpers).find(([, h]) => h.local === local);
    return [local, [`${official.sharedFrame}:${alias}`, helper.name]];
  }));
  const restMemoImport = memoLocals => `import {${Object.entries(memoLocals).map(([local, [, name]]) => `${name} as ${local}`).join(',')}} from '../view-tabs/${official.sharedFrame}';`;
  const restMemoPins = memoLocals => Object.fromEntries(Object.entries(memoLocals).map(([local, [via]]) => [local, via]));
  // owner-window.mjs (emitted above): shared-25 mf over pf (view-tabs ownerWindow).
  await titlebarPin('owner-window.mjs', 'shared-25-DOWZRSlq.js', { roots: ['pf','mf'], bindings: ['df','ff','pf','mf'], exports: { up: 'pf', lp: 'mf' },
    features: { pf: ['.ownerDocument)?.defaultView??null'], mf: ['??globalThis.window'] } });
  await assertPublished('owner-window.mjs', { 'shared-25-DOWZRSlq.js#pf': 'ownerWindow', 'shared-25-DOWZRSlq.js#ff': 'isDocumentNode' });
  // tab-focus-tracker.mjs / tab-focus-release.mjs / tab-focus-key-scroll.mjs (emitted above).
  await titlebarPin('tab-focus-tracker.mjs', 'c99ca27a0', { roots: ['r'], bindings: ['e','n','r'], exports: { t: 'r', n: 'e' },
    features: { e: ['"[data-base-ui-focus-guard]"'], r: ['"keydown"', 'e.key==="Tab"&&!e.ctrlKey&&!e.metaKey', '"keyup"', '"focusin"', 'Event.NONE', '"blur"', 'isTabFocus:', 'stop:'] } });
  await titlebarPin('tab-focus-release.mjs', 'c9f414608', { roots: ['i'], bindings: ['n','r','i'], exports: { attachTabFocusRelease: 'i' },
    imports: { e: 'shared-25-DOWZRSlq.js:up', t: 'c99ca27a0-DVQoBCK_.js:t' },
    features: { n: [looseFeature('n=4')], i: ['.isTabFocus(', 'scrollPaddingTop', '.setPinned(!1)', '"focusin"', '.stop()'] } });
  await titlebarPin('tab-focus-key-scroll.mjs', 'c7f8992b4', { roots: ['ge','ne','m'], bindings: ['m','g','he','ge','ne'], exports: { n: 'ge' },
    features: { m: ['[contenteditable="plaintext-only"]'], he: ['["ArrowUp","Home"]'], ge: ['"PageUp"', '"PageDown"', 'e.key==="Tab"', '.ownerDocument.body'], ne: [looseFeature('ne=1e3')] } });
  // shared-frame hn / yn (exported jf / kf; 2.42304.0 fn / gn): display text without invisible controls, and the title
  // that refuses bidi or broken surrogates. Pure renames.
  await titlebarPin('display-text.mjs', official.sharedFrame, { roots: ['hn','yn'], bindings: ['fn','pn','mn','hn','yn'], exports: { jf: 'hn', kf: 'yn' },
    features: { pn: ['\\p{Default_Ignorable_Code_Point}'], mn: ['"$1"'], yn: ['\\uFFFD]/u.test(t)'] } });
  await emit(official.sharedFrame, 'display-text.mjs', ['fn','pn','mn','hn','yn'], '', 'export {hn as displayText,yn as displayTitle};', v3Source);
  // shared-frame Pt (exported Uf: run once the document's fonts are ready, or now) and Fn over Nn (exported vf: the
  // direction of the first letter) are what 3.6556.2's attachment name reads (shared-2 fe / Re). view-tabs does not
  // publish them; code-composer's chat-composer-frame.mjs already slices exactly these 3.6556.2 declarations, so they are
  // imported from there (one copy; session-rail-context slices shared-frame Nn itself and refuses a second unexported
  // code-current slice of it).
  const composerFrame = async target => {
    if (!selected(target)) return;
    const composer = JSON.parse(await fs.readFile(path.join(root, 'src/generated/code-composer/manifest.json'), 'utf8'));
    const frame = composer.modules.find(m => m.target === 'chat-composer-frame.mjs');
    const names = (frame?.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name));
    if ((frame?.referenceVersion ?? composer.referenceVersion) !== official.referenceVersion || path.basename(frame?.source ?? '') !== official.sharedFrame
      || !['Pt','Nn','Fn'].every(n => names.includes(n)) || frame.exports?.Pt !== 'afterFontsReady' || frame.exports?.Fn !== 'textDirectionOf')
      throw Error(`${target}: code-composer chat-composer-frame.mjs no longer exports ${official.sharedFrame} Pt / Fn as afterFontsReady / textDirectionOf`);
  };
  await titlebarPin('attachment-file-name.mjs', official.sharedFrame, { roots: ['Pt','Fn'], bindings: ['Pt','Nn','Fn'], exports: { Uf: 'Pt', vf: 'Fn' },
    features: { Pt: ['e?.fonts?.ready', 'typeof t?.then=="function"'], Fn: ['/\\p{L}/u.exec(e)', '"rtl":"ltr"'] } });
  await composerFrame('attachment-file-name.mjs');
  // shared-2 Km (2.42304.0 Np): the file card name, line-clamped or a head and a 12-grapheme tail; 3.6556.2 right-aligns the
  // two-row layout under RTL, keeps an LTR tail stem with vm, and checks overflow once the fonts are ready (Gm over
  // afterFontsReady; 2.42304.0 Mp waited on document.fonts.ready itself). xm / hm (old up / ap) are pure renames.
  const attachmentMemo = restMemo('J9','J8','J1','J2','J3','J5','K1','K3','K5','I1');
  await titlebarPin('attachment-file-name.mjs', 'shared-2-TF8v67kg.js', { roots: ['Km','xm','hm'], bindings: ['xp','Sp','gm','_m','hm','fm','vm','ym','bm','xm','Gm','Km'],
    imports: { l: `${official.vendorFrame}:Co`, A: `${official.vendorFrame}:wo`, u: `${official.vendorFrame}:Ha`, m: `${official.vendorFrame}:Ua`, c: `${official.vendorFrame}:Ba`,
      B: `${official.sharedFrame}:Hf`, _e: `${official.sharedFrame}:_f`, Oe: `${official.sharedFrame}:jf`, Me: `${official.sharedFrame}:kf`, fe: `${official.sharedFrame}:Uf`, Re: `${official.sharedFrame}:vf`,
      ...restMemoPins(attachmentMemo) },
    features: { Sp: ['granularity:"grapheme"'], ym: ['"line-clamp-2"'], bm: ['"max-h-[1lh]"'], vm: ['"rtl"', '[direction:ltr]'],
      Km: ['"text-footnote font-normal text-primary"', 'flex min-w-0 flex-col [&:where(:root[dir=rtl]_:dir(rtl))]:text-right', "before:content-['\\u2026']", 'react.early_return_sentinel', '"aria-hidden"'],
      Gm: ['n.scrollHeight>n.clientHeight+1'] } });
  await assertPublished('attachment-file-name.mjs', { [`${official.vendorFrame}:Ba`]: 'clsx', [`${official.sharedFrame}:Hf`]: 'cdsClassNames', [`${official.sharedFrame}:_f`]: 'useCdsIsoLayoutEffect' });
  await emit('shared-2-TF8v67kg.js', 'attachment-file-name.mjs', ['xp','Sp','gm','_m','hm','fm','vm','ym','bm','xm','Gm','Km'], `
    import {useRef as l,useState as A} from 'react';
    import {jsx as u,jsxs as m} from 'react/jsx-runtime';
    import {clsx as c} from '../view-tabs/${official.vendorFrame}';
    import {cdsClassNames as B,useCdsIsoLayoutEffect as _e} from '../view-tabs/${official.sharedFrame}';
    ${restMemoImport(attachmentMemo)}
    import {displayText as Oe,displayTitle as Me} from './display-text.mjs';
    import {afterFontsReady as fe,textDirectionOf as Re} from '../code-composer/chat-composer-frame.mjs';
  `, 'export {Km as AttachmentFileName,xm as attachmentNameSplit,hm as attachmentNameExtension};', v3Source);
  // shared-156 Uq (exported dr; 2.42304.0 WV) over the scroll-padding reader Vq (HV): pure renames; Xt is shared-25 up.
  await titlebarPin('visible-box.mjs', 'shared-156-BLTosN8U.js', { roots: ['Uq'], bindings: ['Vq','Uq'], exports: { dr: 'Uq' }, imports: { Xt: 'shared-25-DOWZRSlq.js:up' },
    features: { Vq: ['e.endsWith("px")'], Uq: ['scrollPaddingTop', 'scrollPaddingBottom', 'ownScope:'] } });
  await emit('shared-156-BLTosN8U.js', 'visible-box.mjs', ['Vq','Uq'], "import {ownerWindow as Xt} from './owner-window.mjs';", 'export {Uq as visibleBox};', v3Source);
  // The approval read gate moved from c96d752d0 (2.42304.0 VDe eE tE nE rE iE HDe UDe) into cc32965c2 wc Tc Ec Dc Oc kc
  // Ac jc, one closure (Ec = 1 is Dc's own tolerance, so nothing comes from c96d752d0 any more). jc gains the optional
  // headIsFirstLine (default false: the first line is the first <li>, as before); 3.6556.2 sets it only on the
  // update_environment change-target block, which the host card has no counterpart of. kc is the compiler form of iE.
  // oo is c2d1aeb56 f (O: the approval presentation context, createContext("dock")); OpenClaude only renders cards.
  const approvalMemo = restMemo('J9','J0','J1','J4','K0','K1','K5');
  await titlebarPin('approval-read-gate.mjs', 'cc32965c2-BQu1bA_w.js', { roots: ['jc','Dc','Tc'], bindings: ['wc','Tc','Ec','Dc','Oc','kc','Ac','jc'],
    imports: { t: `${official.vendorFrame}:Co`, l: `${official.vendorFrame}:bo`, n: `${official.vendorFrame}:Ha`, oe: 'shared-25-DOWZRSlq.js:up', dn: 'shared-156-BLTosN8U.js:dr',
      oo: 'c2d1aeb56-BwMYdDs2.js:f', ...restMemoPins(approvalMemo) },
    features: { wc: ['length:1001'], Tc: ['[data-approval-card-root]', 'ownScope:'], Ec: [looseFeature('Ec=1')], Dc: ['atFirstFrame', 'waiting:', 'forget:'],
      Oc: ['IntersectionObserver', 'fonts?.ready?.then', 'kick:'], Ac: ['overflowY', 'n.scrollHeight<=n.clientHeight+2'],
      jc: ['onReadState:', 'onFits:', 'headIsFirstLine:', '"unlaid"', '"waiting"', '"approval-read-rows"', 'querySelector("li")'] } });
  await emit('cc32965c2-BQu1bA_w.js', 'approval-read-gate.mjs', ['wc','Tc','Ec','Dc','Oc','kc','Ac','jc'], `
    import {useRef as t,useLayoutEffect as l} from 'react';
    import {jsx as n} from 'react/jsx-runtime';
    ${restMemoImport(approvalMemo)}
    import {ownerWindow as oe} from './owner-window.mjs';
    import {visibleBox as dn} from './visible-box.mjs';
    // c2d1aeb56 f reads the approval presentation context (default "dock"); OpenClaude only renders inline cards.
    const oo=()=>'card';
  `, 'export {jc as ApprovalReadRows,Dc as createReadTracker,Tc as readLineVisible};', v3Source);
  // cc32965c2 kg (2.42304.0 c96d752d0 wA): the dev-server "Runs in {cwd} on port {port}" line. Pure rename.
  await titlebarPin('dev-server-description.mjs', 'cc32965c2-BQu1bA_w.js', { roots: ['kg'], bindings: ['kg'],
    features: { kg: ['"Runs in {cwd} on port {port} (or the next free port)"', '"/nE6wpuaxv"', '"Runs in {cwd} on port {port}"', '"Runs in {cwd}"', '"Runs on port {port} (or the next free port)"', '"Runs on port {port}"'] } });
  await emit('cc32965c2-BQu1bA_w.js', 'dev-server-description.mjs', ['kg'], '', 'export {kg as devServerDescription};', v3Source);
  // W2 w2-titlebar-current: shared-23 FO / IO (3.6556.2), the split pointer-drag registry.
  await titlebarPin('split-drag-registry.mjs', 'shared-23', { roots: ['IO'], bindings: ['FO','IO'], features: { FO: ['new WeakMap'], IO: [looseFeature('n?r.add(t):r.delete(t)')] } });
  await emit('shared-23', 'split-drag-registry.mjs', ['FO','IO'], '', 'export {FO as splitPointerDrags,IO as markSplitPointerDrag};', v3Source);
  // TF-C15: 3.6556.2 moved minSize / distributeFlex / walkResolvedFlexes out of cf53e1812 into c9543da06 Gd / Wd / Kd
  // (exported o / s / c, a closure of their own); contentBox stays cf53e1812 r (exported d). tile-layout-math.mjs keeps
  // its four export names by re-exporting tile-layout-flex.mjs.
  await titlebarPin('tile-layout-flex.mjs', 'c9543da06', { roots: ['Gd','Wd','Kd'], bindings: ['Gd','Wd','Kd'], exports: { o: 'Gd', s: 'Wd', c: 'Kd' },
    features: { Gd: ['minTileWidthPx', 'minTileBasePx', 'overflowMinReachable', 'overflowMin.width'], Wd: [looseFeature('if(r===0||n<=0)return[...e]'), '-.5)'], Kd: ['overflowMinReachable:!0', 'e.direction==="row"', '.gap*'] } });
  await emit('c9543da06', 'tile-layout-flex.mjs', ['Gd','Wd','Kd'], '', 'export {Gd as minSize,Wd as distributeFlex,Kd as walkResolvedFlexes};', v3Source);
  await titlebarPin('tile-layout-math.mjs', 'cf53e1812', { roots: ['r'], bindings: ['t','n','r'], exports: { d: 'r' },
    features: { n: ['e.borderPx??1'], t: ['e.paddingStart??', 'e.paddingTop??'] } });
  await emit('cf53e1812', 'tile-layout-math.mjs', ['t','n','r'], '', "export {r as contentBox}; export {minSize,distributeFlex,walkResolvedFlexes} from './tile-layout-flex.mjs';", v3Source);
  await titlebarPin('tile-fit-opened.mjs', 'cc43287c9', { roots: ['B9','dbe'], bindings: ['B9','dbe'],
    imports: { kw: 'cf53e1812-CX9VqRuk.js:d', ed: 'c9543da06-BaufrsQl.js:o', ad: 'c9543da06-BaufrsQl.js:s', Vu: 'c9543da06-BaufrsQl.js:c', c: 'preload-helper-D0dM6GpB.js:n' },
    features: { B9: ['withRoomForChat: walkResolvedFlexes gave no box for a child of a sized stack'], dbe: ['rootRowOnly'] } });
  await emit('cc43287c9', 'tile-fit-opened.mjs', ['B9','dbe'], `
    import {contentBox as kw} from './tile-layout-math.mjs';
    import {minSize as ed,distributeFlex as ad,walkResolvedFlexes as Vu} from './tile-layout-flex.mjs';
    // preload-helper n (local e) only tags the error for O11Y.
    const c=error=>error;
  `, 'export {dbe as fitOpenedLayout,B9 as withRoomForChat};', v3Source);
  // shared-15 Xs reads scroll-padding-top only for a fizzy `panels` behind-title-bar scroller (E12: always 0 here).
  await titlebarPin('padded-top.mjs', 'shared-15', { roots: ['Zs'], bindings: ['Xs','Zs'], exports: { R: 'Zs', L: 'Xs' },
    imports: { O: 'shared-25-DOWZRSlq.js:up', dt: 'shared-4-DUB1Oi0O.js:Yo' },
    features: { Xs: ['"panels"', '"data-epitaxy-behind-title-bar"', '"scroller"', 'scrollPaddingTop'], Zs: [looseFeature('getBoundingClientRect().top+Xs(e)')] } });
  await emit('shared-15', 'padded-top.mjs', ['Xs','Zs'], "import {ownerWindow as O} from './owner-window.mjs'; import {isFizzyLakePartEnabled as dt} from '../view-tabs/shared-4-DUB1Oi0O.js';", 'export {Zs as paddedTop};', v3Source);
  // c96d752d0 f6 (3.6556.2) adds the optional `tabPresses` watcher (default null: the 2.42304.0 path, which is all the
  // host takes); with it, a Tab press into the transcript lands through c99ca27a0 t (exported r, as `due`).
  await titlebarPin('transcript-tab-focus.mjs', 'c99ca27a0', { roots: ['t'], bindings: ['t'], exports: { r: 't' }, features: { t: ['Node.DOCUMENT_POSITION_FOLLOWING', looseFeature('t.contains(e)')] } });
  await emit('c99ca27a0', 'transcript-tab-focus.mjs', ['t'], '', 'export {t as tabFocusFollows};', v3Source);
  await titlebarPin('transcript-focus-landing.mjs', 'c96d752d0', { roots: ['f6'], bindings: ['o6','net','u6','f6'],
    imports: { ae: 'shared-frame-6jtSkIit.js:Iu', Pl: 'shared-15-BvlV43cI.js:R', due: 'c99ca27a0-DVQoBCK_.js:r' },
    features: { o6: ['\'[role="article"]\''], net: ['audio[controls], video[controls]'], u6: ['new WeakSet'],
      f6: ['scroller:', 'pointerDownAt:', 'tabPresses:', 'isPinned:', 'scrollToTail:', 'setPinned:', '"[data-base-ui-focus-guard]"', 'preventScroll:!0', '<500'] } });
  await emit('c96d752d0', 'transcript-focus-landing.mjs', ['o6','net','u6','f6'], "import {elementOrNull as ae} from './dom-owner.mjs'; import {paddedTop as Pl} from './padded-top.mjs'; import {tabFocusFollows as due} from './transcript-tab-focus.mjs';", 'export {f6 as landTranscriptFocus,u6 as landedFocusEvents};', v3Source);
  // R2-appswitch W3 (research/app-switch.md W3), 3.6556.2 since W2 w2-titlebar-current: the ⌥⌘←/→ surface chord of
  // shared-22 — shared-1 eH/oH, the useShortcut matcher GV and the LV.chorus_surface_prev/next binding tables.
  // code-current-surface-chord-pins.mjs checks each list is the closure of its roots, the feature strings, the official
  // export aliases and the replaced imports (Ze is shared-25 ap, the generated owner-document.mjs).
  const chordPins = async target => (await import('./code-current-surface-chord-pins.mjs')).pinSurfaceChordHelper(target, v3Source, selected(target));
  await emit('shared-156', 'surface-chord-layers.mjs', (await chordPins('surface-chord-layers.mjs')).bindings, '', 'export {qK as surfaceChordLayerSelector};', v3Source);
  await emit('shared-78', 'surface-chord-platform.mjs', (await chordPins('surface-chord-platform.mjs')).bindings, '', 'export {Eo as isMacUserAgent};', v3Source);
  const surfaceChord = await chordPins('surface-chord.mjs');
  await emit('shared-1', 'surface-chord.mjs', surfaceChord.bindings, `
    import {surfaceChordLayerSelector as Ws} from './surface-chord-layers.mjs';
    import {isMacUserAgent as so} from './surface-chord-platform.mjs';
    import {ownerDocument as Ze} from './owner-document.mjs';
    ${surfaceChord.prelude}
  `, 'export {eH as surfaceChordDirection,oH as adjacentSurface,GV as shortcutBindingMatches,tH as shortcutLayerOpen,surfaceChordShortcuts};', v3Source);
  // R2-home (home-env-03/04, map-cc-env): environment-* helpers. Each binding list comes from
  // code-current-environment-pins.mjs, which first checks it is the closure of the exported roots, the feature strings
  // of every binding and that each replaced import still names the same vendor/shared export.
  // W9 cc-rest-env-model: basename, parent, modifier keys, common copy, dialog model, star keys and machine variables read 3.6556.2 (research/code-current-rest.md
  // §5, data/code-current-rest-map.json); envModelPins checks them against v3Source.
  const envModelPins = async target => (await import('./code-current-environment-pins.mjs')).pinEnvironmentHelper(target, v3Source, selected(target));
  await emit('shared-52', '../../../electron/generated/environment-basename.mjs', await envModelPins('../../../electron/generated/environment-basename.mjs'), '', 'export {nk as environmentBasename};', v3Source);
  await emit('shared-18', '../../../electron/generated/environment-parent.mjs', await envModelPins('../../../electron/generated/environment-parent.mjs'), '', 'export {lU as environmentParent};', v3Source);
  // presets (cd0cf5b5e-BCzJmEwZ) and name-parts (c96d752d0 pL) are 3.6556.2 since the W9 gate switch; session-rail
  // environment-target.mjs, session-rail-kit branch-chip.mjs and session-rail-changes pr-rows.mjs import them (one copy, D1).
  await emit('cd0cf5b5e', '../../../electron/generated/environment-presets.mjs', await envModelPins('../../../electron/generated/environment-presets.mjs'), `
    import {environmentBasename as a} from './environment-basename.mjs';
    import {environmentParent as re} from './environment-parent.mjs';
  `, 'export {c as sameEnvironmentName,l as availableEnvironmentName,fe as uniqueEnvironmentName,m as sameEnvironmentTarget,g as isFolderlessLocal,y as folderCheckoutSettings,ke as sameFolderSettings,x as cleanEnvironmentSettings,S as splitEnvironmentSettings,Re as readEnvironmentRecord,D as withoutPermissionMode,O as recentEnvironments};', v3Source);
  // shared-1 tK: the modifier keys the height hold ignores; shared-78 QW: the CDS copy the folder row labels its X from.
  await emit('shared-1', 'environment-modifier-keys.mjs', await envModelPins('environment-modifier-keys.mjs'), '', 'export {tK as environmentModifierKeys};', v3Source);
  await emit('shared-78', 'environment-common-copy.mjs', await envModelPins('environment-common-copy.mjs'), '', 'export {QW as environmentCommonMessages};', v3Source);
  // ca690a791 _n's WSL folder (shared-20 QA over XA, shared-78 AQ): plain code, so the draft model stays plain-node.
  await emit('shared-78', 'environment-wsl-unc.mjs', await envModelPins('environment-wsl-unc.mjs'), '', 'export {AQ as wslUncPath};', v3Source);
  await emit('shared-20', 'environment-wsl-folder.mjs', await envModelPins('environment-wsl-folder.mjs'), "import {wslUncPath as Jr} from './environment-wsl-unc.mjs';", 'export {QA as wslFolderPath};', v3Source);
  // E42: the pure draft / branch / target model is its own target (src/saved-environment-model.mjs imports it in plain
  // node); environment-dialog-model.mjs adds the compiled height hold Yt and re-exports it under the same names (E7).
  // 3.6556.2 dropped the body spacing constant (2.42304.0 en, environmentBodySpacing; no importer).
  await emit('ca690a791', 'environment-dialog-draft.mjs', await envModelPins('environment-dialog-draft.mjs'), `
    import {environmentBasename as D} from '../../../electron/generated/environment-basename.mjs';
    import {folderCheckoutSettings as Je,sameFolderSettings as He} from '../../../electron/generated/environment-presets.mjs';
    import {wslFolderPath as Ce} from './environment-wsl-folder.mjs';
  `, 'export {Nt as environmentBranchOrder,Pt as environmentDefaultBranch,Ft as environmentBranchLabel,It as environmentNotRepositoryNote,Lt as folderCheckout,Rt as promotedFolderSettings,Vt as withoutFolderSettings,en as environmentDraft,nn as environmentDraftDirty,cn as sameEnvironmentName,pn as replaceEnvironmentFolder,_n as environmentTarget,Gt as pinnedPopupHeightProperty,wn as environmentDialogClass,Tn as environmentMinHeight,Cn as environmentLabelClass,On as environmentFolderLabelClass};', v3Source);
  await emit('ca690a791', 'environment-dialog-model.mjs', await envModelPins('environment-dialog-model.mjs'), `
    import {useEffectEvent as o,useRef as e,useLayoutEffect as a} from 'react';
    import {reactMemoCache as J9,memoChanged1 as J1,memoChanged2 as J2,memoChanged3 as J3,memoStore1 as K1,memoStore2 as K2,memoStore3 as K3} from '../view-tabs/${official.sharedFrame}';
    import {ownerWindow as w} from '../view-tabs/shared-25-DOWZRSlq.js';
    import {environmentModifierKeys as E} from './environment-modifier-keys.mjs';
    import {environmentBranchOrder as Nt,environmentDefaultBranch as Pt,environmentBranchLabel as Ft,environmentNotRepositoryNote as It,folderCheckout as Lt,promotedFolderSettings as Rt,withoutFolderSettings as Vt,environmentDraft as en,environmentDraftDirty as nn,sameEnvironmentName as cn,replaceEnvironmentFolder as pn,environmentTarget as _n,pinnedPopupHeightProperty as Gt,environmentDialogClass as wn,environmentMinHeight as Tn,environmentLabelClass as Cn,environmentFolderLabelClass as On} from './environment-dialog-draft.mjs';
  `, 'export {Nt as environmentBranchOrder,Pt as environmentDefaultBranch,Ft as environmentBranchLabel,It as environmentNotRepositoryNote,Lt as folderCheckout,Rt as promotedFolderSettings,Vt as withoutFolderSettings,en as environmentDraft,nn as environmentDraftDirty,cn as sameEnvironmentName,pn as replaceEnvironmentFolder,_n as environmentTarget,Yt as useCenteredEnvironmentHeight,Gt as pinnedPopupHeightProperty,wn as environmentDialogClass,Tn as environmentMinHeight,Cn as environmentLabelClass,On as environmentFolderLabelClass};', v3Source);
  await emit('c96d752d0', 'environment-name-parts.mjs', await envModelPins('environment-name-parts.mjs'), '', 'export {pL as environmentNameParts};', v3Source);
  // cc-rest-env-ui (3.6556.2): c387a4508 i, a React Compiler rewrite (vendor-frame Ha/Ua = jsx/jsxs now).
  await emit('c387a4508', 'environment-field-header.mjs', await envUiPins('environment-field-header.mjs'), `import {jsx as e,jsxs as t} from 'react/jsx-runtime'; import {StartMessage as r} from '../../source-code-start-adapters.jsx'; import {cdsClassNames as n} from '../view-tabs/${official.sharedFrame}'; ${sidebarMemo('J9 J1 J2 J3 K1 K2 K3')}`, 'export {i as EnvironmentFieldHeader};', v3Source);
  // cc-rest-env-ui (3.6556.2): shared-frame xP (2.42304.0 wA), the folder row's Worktree box, is view-tabs' CdsCheckbox:
  // re-exported from the concrete view-tabs file by its semantic name (not the facade, R6/E2/E41), no second copy.
  await emit(official.sharedFrame, 'environment-checkbox.mjs', [], '', `export {CdsCheckbox as EnvironmentCheckbox} from '../view-tabs/${official.sharedFrame}';`, v3Source);
  // cc-rest-env-ui (3.6556.2): cd8823d73-CrZFkwi4 (pins: code-current-environment-pins.mjs). The folder name's middle
  // ellipsis measures through breadcrumb-measure (graphemeEnds de, observeWidth le, useHeadCut ue); a renamed folder's
  // name opens its path in a tooltip (path-tooltip fe/pe). CDS Menu g, Tooltip _, OverflowTooltip m, TooltipProvider y and
  // Button p stay the host adapters they were in 2.42304.0.
  await emit('cd8823d73', 'environment-folder-view.mjs', await envUiPins('environment-folder-view.mjs'), `
    import {Fragment as o,useId as s,useLayoutEffect as c,useRef as e,useState as d} from 'react';
    import {flushSync as r} from 'react-dom';
    import {jsx as t,jsxs as i} from 'react/jsx-runtime';
    import {CdsIcon as v,cdsClassNames as h} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5')}
    import {StartTooltipGroup as y,StartMessage as V,useStartIntl as H} from '../../source-code-start-adapters.jsx';
    import {SourceSettingsButton as p} from '../../source-settings-button.jsx';
    import {EnvironmentMenu as g,EnvironmentTooltip as _,EnvironmentOverflowText as m} from '../../source-environment-folder-adapters.jsx';
    import {EnvironmentCheckbox as S} from './environment-checkbox.mjs';
    import {environmentCommonMessages as ne} from './environment-common-copy.mjs';
    import {EnvironmentFieldHeader as Ce} from './environment-field-header.mjs';
    import {graphemeEnds as de,observeWidth as le,useHeadCut as ue} from './breadcrumb-measure.mjs';
    import {pathTooltipContent as fe,pathTooltipOptions as pe} from './path-tooltip.mjs';
  `, 'export {G as EnvironmentFolderField,K as EnvironmentFolderList,q as EnvironmentEmptyFolders,J as EnvironmentFolderRow,X as EnvironmentFolderName,Be as EnvironmentBranchName,Ge as EnvironmentFolderControls,Ue as environmentBranchOptions,Ve as environmentBranchShown,He as environmentBranchTyped,Z as environmentPlaceFirstAttribute,Ke as environmentAddFolderSelect};', v3Source);
  // cc-rest-env-ui (3.6556.2): c227f4d5e B$/V$/H$/U$/W$/Y$ (2.42304.0 zK..JK), React Compiler rewrites.
  await emit('c227f4d5e', 'environment-menu-controls.mjs', await envUiPins('environment-menu-controls.mjs'), `
    import {jsx as y} from 'react/jsx-runtime';
    import {StartIcon as Re,StartMessage as Q} from '../../source-code-start-adapters.jsx';
    ${sidebarMemo('J9 J1 J2 J3 K1 K2 K3')}
    // vendor-frame Ia (Base UI useDirection): OpenClaude's two locales are LTR. Honor an explicit root direction when supplied.
    const x=()=>globalThis.document?.documentElement?.dir==='rtl'?'rtl':'ltr';
  `, 'export { B$ as EnvironmentAction, V$ as EnvironmentSettingsAction, H$ as environmentOpenKey, U$ as EnvironmentActionHint, W$ as EnvironmentStarAction, Y$ as environmentSelectedProps };', v3Source);
  // R3-home (home-env-05): the environment picker's rows (cc43287c9 k0/A0/j0/e2/a2/l2/p2), its star keys (shared-19) and
  // its machine-variable query (c3f9f1667 Me), pinned by code-current-environment-pins.mjs. The Menu X and the starred
  // store's toggle Zr, the desktop bridge f and the revision store je are host adapters.
  // W9 cc-rest-env-model (3.6556.2): the star keys moved to shared-46 (qx/Jx/Yx/iS/zL); c3f9f1667 L is compiled now (its
  // revision store F and the desktop bridge f stay host adapters).
  await emit('shared-46', 'environment-picker-keys.mjs', await envModelPins('environment-picker-keys.mjs'), '', 'export {qx as environmentStarKey,Jx as environmentStarKeys,Yx as thisComputerStarKey,iS as starredIncludes,zL as thisComputerLabel};', v3Source);
  await emit('c3f9f1667', 'environment-machine-variables.mjs', await envModelPins('environment-machine-variables.mjs'), `
    import {useState as a,useEffect as r} from 'react';
    import {reactMemoCache as J9,memoChanged1 as J1,memoChanged2 as J2,memoStore1 as K1,memoStore3 as K3} from '../view-tabs/${official.sharedFrame}';
    import {localEnvironmentRevision as F,localSessionEnvironment as f} from '../../source-environment-menu-adapters.jsx';
  `, 'export {L as useMachineHasVariables};', v3Source);
  // cc-rest-env-ui (3.6556.2): cc43287c9-Me-M2ucD m8/Rae/zae/uoe/w8/D8/M8 (2.42304.0 k0/A0/j0/e2/a2/l2/p2). The Menu K and
  // the starred store's toggle Ta are host adapters; vendor-frame Va is the jsx-runtime Fragment.
  await emit('cc43287c9', 'environment-menu-rows.mjs', await envUiPins('environment-menu-rows.mjs'), `
    import {Fragment as y} from 'react';
    import {jsx as p,jsxs as v} from 'react/jsx-runtime';
    import {CdsBadge as ve} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5 I2 I5 Z1')}
    import {StartMessage as Q,useStartIntl as qd} from '../../source-code-start-adapters.jsx';
    import {EnvironmentPickerMenu as K,toggleEnvironmentStar as Ta} from '../../source-environment-menu-adapters.jsx';
    import {EnvironmentActionHint as _E,EnvironmentSettingsAction as ok,EnvironmentStarAction as OD,environmentOpenKey as OE,environmentSelectedProps as vO} from './environment-menu-controls.mjs';
    import {environmentStarKey as Ia,environmentStarKeys as Aa,starredIncludes as Qa,thisComputerLabel as Ja} from './environment-picker-keys.mjs';
    import {useMachineHasVariables as hR} from './environment-machine-variables.mjs';
  `, 'export {m8 as EnvironmentPickerRow,Rae as EnvironmentPickerRows,zae as EnvironmentPickerNew,uoe as EnvironmentPickerComputer,w8 as environmentPresetKey,D8 as EnvironmentPickerNote,M8 as EnvironmentPickerNoMatches};', v3Source);
  // cc-rest-env-ui (3.6556.2): the CDS Select pieces of the dialog's "+ Add" folder control (cd8823d73 Ke); its popup is
  // the host menu. Field rings, cdsClassNames, CdsIcon, CdsIconSlot and the cache helpers are view-tabs semantic names.
  await emit(official.sharedFrame, 'environment-select-parts.mjs', await envUiPins('environment-select-parts.mjs'), `
    import {forwardRef as X} from 'react';
    import {jsx as b,jsxs as G} from 'react/jsx-runtime';
    import {CdsIcon as us,CdsIconSlot as _s,cdsClassNames as Q,cdsFieldSurfaceClass as JS,cdsFieldHoverRingClass as YS,cdsFieldFocusWithinRingClass as ZS} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J1 J5 K1 K4 K5')}
  `, 'export {vM as selectTriggerClassName,yM as selectTriggerVariantClassNames,bM as selectTriggerModeClassNames,CM as selectTriggerButtonClassName,uM as selectEmptyTextClassName,WM as selectEmptyClassName,GM as selectFooterDividerClassName,KM as selectFooterClassName,FM as selectPopupSearchClassName,tN as selectSearchText,nN as selectItemMatches,QN as SelectFooterAction};', v3Source);
  // cc-rest-env-ui (3.6556.2): shared-frame Jj/Yj/Zj/uC (2.42304.0 xO/SO/wO/tx) over the host native field adapters
  // (Base UI Field.Root/Label/Error/Control and the labelable context), registered with the host field registry.
  // W9 gate: Fn over Nn is code-composer chat-composer-frame.mjs's slice of the same 3.6556.2 declarations (one copy, D1;
  // session-rail-context slices shared-frame Nn itself and refuses a second unexported code-current slice of it).
  await composerFrame('environment-field-controls.mjs');
  await emit(official.sharedFrame, 'environment-field-controls.mjs', await envUiPins('environment-field-controls.mjs'), `
    import {forwardRef as X,useRef as l,useState as Z,useSyncExternalStore as W} from 'react';
    import {textDirectionOf as Fn} from '../code-composer/chat-composer-frame.mjs';
    import {jsx as b,jsxs as G} from 'react/jsx-runtime';
    import {NativeFieldRoot as I,NativeFieldLabel as o,NativeFieldError as Ge,NativeFieldControl as m,useNativeFieldMetadata as T,registerNativeFieldComponents} from '../../source-field-adapters.jsx';
    import {cdsClassNames as Q,cdsStaysSecondaryTextClass as Mt,cdsSizeAttributes as ga,cdsFieldSurfaceClass as JS,cdsFieldHoverRingClass as YS,cdsFocusVisibleRingClass as XS,cdsFieldFocusWithinRingClass as ZS,cdsTextFieldClass as tC,CdsFieldStateContext as HS,useCdsFieldInvalid as US,useCdsFieldDisabled as WS,useCdsMergedRefs as jn,useClickToFocus as fg,useCdsIsoLayoutEffect as Ln} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J0 J1 J2 J3 J4 J5 K0 K1 K2 K3 K4 K5 I1 I2 Z1')}
    import {StartIcon as us} from '../../source-code-start-adapters.jsx';
    // R3-home: shared-frame Uu (CDS Button) under uC's clear button -> the host native-field button, which answers the
    // CDS-only tooltip prop (tooltip:!1, no auto tooltip) instead of passing it to SourceSettingsButton's DOM button.
    import {NativeFieldButton as Uu} from '../../source-field-adapters.jsx';
    import {t} from '../../../electron/i18n/index.mjs';
    // shared-frame wn reads the CDS copy provider with the English fallback; the host catalog answers it.
    const wn=(_key,fallback)=>t(fallback);
  `, 'registerNativeFieldComponents({Field:Jj,Label:Yj,ErrorText:Zj,TextInput:uC}); export {Jj as EnvironmentField,Yj as EnvironmentLabel,Zj as EnvironmentFieldError,uC as EnvironmentTextInput};', v3Source);
  // R2-composer: the three composer helper binding lists live in code-current-composer-pins.mjs, which checks them
  // against the closure, feature strings, official export alias and replaced vendor imports first (w3-composer-host: 3.6556.2).
  await emit(official.sharedFrame, 'composer-focus-capability.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('composer-focus-capability.mjs', v3Source, selected('composer-focus-capability.mjs')), '', 'export { rn as canFocusComposerOnClick };', v3Source);
  // R3-nested NBS-2: the nested-session helpers (2.42304.0 in R3). model (mz,LG; old pz,gG) and separator (h$; old JQ) are
  // pure renames. shared-20 Q lost hideAllNested/showAllNested and JC was deleted (the new shared-20 JC is KC.handle; the
  // binding map's JC -> shared-2 PH is a mismatch): Hide/Show all moved to the command palette
  // (hide_all_nested_sessions/show_all_nested_sessions), whose copy is shared-1 IM/LM.description with RM search hints.
  // V3-w2-sidebar-resize-nested (research/sidebar.md §1.2, §2.1 E1): 3.6556.2, full chunk names (shared-21 / shared-1 /
  // shared-20 are reshuffled groups). model: mz -> shared-21 rW and LG -> shared-26 Lj (identical; LG left shared-21),
  // so LG is its own target re-exported by the model under the same name. palette copy IM/LM/RM -> eI/tI/nI
  // (identical, defineMessages is vendor-intl f). copy Q/yD/bD/xD/SD -> wE/DE/OE/kE/AE: "{count} new" (hiddenNew) is
  // now "{count} unread" (hiddenUnread, uWLP2YHSdk); the returned keys (failed/unread/working) are unchanged.
  // separator h$ -> z7 is React Compiler output (view-tabs helpers, E3). parts is 3.6556.2 too (w10-ccres-nested-parts, below).
  await emit('shared-26-CGuBxVt9.js', 'nested-session-needs-input.mjs', ['Lj'], '', 'export {Lj as nestedSessionNeedsInput};', v3Source);
  await emit('shared-21-R7LldJ05.js', 'nested-session-model.mjs', ['rW'], '', "export {rW as nestedSessionCounts}; export {nestedSessionNeedsInput} from './nested-session-needs-input.mjs';", v3Source);
  await emit('shared-1-BJhqMmkf.js', 'nested-session-palette-copy.mjs', ['eI','tI','nI'], 'const q=messages=>messages;', 'export {eI as hideAllNestedSessionsCopy,tI as showAllNestedSessionsCopy,nI as nestedSessionsSearchHints};', v3Source);
  // R4i-small SM3 (Y1-R3-nested-1): the host-compat allNestedToggleLabel export is gone; its only consumer (the
  // sidebar filter menu's ZH) was removed by R3-sections and the palette reads nested-session-palette-copy directly.
  await emit('shared-20-mUr7IqZY.js', 'nested-session-copy.mjs', ['wE','DE','OE','kE','AE'], `
    const ms=messages=>messages;
  `, 'export {DE as nestedToggleLabel,OE as nestedSessionLabel,kE as nestedStatusLabels,AE as nestedRevealLabel};', v3Source);
  await emit('shared-21-R7LldJ05.js', 'nested-session-separator.mjs', ['z7'], `
    import {jsx as u,jsxs as h} from 'react/jsx-runtime';
    import {reactMemoCache as J9,memoIsEmpty as J0,memoChanged1 as J1,memoStore0 as K0,memoStore1 as K1} from '../view-tabs/shared-frame-6jtSkIit.js';
  `, 'export {z7 as NestedStatusSeparator};', v3Source);
  // w10-ccres-nested-parts (research/w10-ccres.md cc:nested-session-parts): 3.6556.2 shared-18 qv / vk / HA (2.42304.0
  // K_ / TE / VD; bodies identical up to React Compiler memo). The other three originals are not sliced again (D1): Kv
  // (with Gv; old G_ / W_) is app-switch-frame.mjs's syncInfiniteAnimations, _k / bk (old wE / DE) are
  // sidebar-row-primitive.mjs's sidebarHitRowClass / sidebarFocusClass; each holder is checked to slice that very
  // shared-18 local. HA draws the CDS Icon (_e = shared-frame od, view-tabs CdsIcon) where the 2.42304.0 slice used the
  // host StartIcon. This module is the one copy: extract-sidebar-sections.mjs resolves its status-dot.mjs (qv, HA) and
  // group-label.mjs (vk) to it, and it imports only view-tabs, app-switch-frame and sidebar-row-primitive (no cycle).
  if (selected('nested-session-parts.mjs')) {
    const holders = [['app-switch', 'app-switch-frame.mjs', { Kv: 'syncInfiniteAnimations' }], ['code-current', 'sidebar-row-primitive.mjs', { _k: 'sidebarHitRowClass', bk: 'sidebarFocusClass' }]];
    for (const [area, target, names] of holders) {
      const held = JSON.parse(await fs.readFile(path.join(root, 'src/generated', area, 'manifest.json'), 'utf8')).modules.find(m => m.target === target);
      const text = await fs.readFile(path.join(root, 'src/generated', area, target), 'utf8');
      if (held?.referenceVersion !== official.referenceVersion || path.basename(held.source) !== 'shared-18-D3y8YMFN.js') throw Error(`nested-session-parts.mjs: ${area}/${target} is not a 3.6556.2 shared-18-D3y8YMFN.js slice`);
      for (const [local, name] of Object.entries(names)) {
        if (!held.bindings.some(b => (b.name ?? b) === local)) throw Error(`nested-session-parts.mjs: ${area}/${target} does not slice shared-18 ${local}`);
        if (!new RegExp(`(?<![\\w$])${local.replace('$', '\\$')} as ${name}\\b`).test(text)) throw Error(`nested-session-parts.mjs: ${area}/${target} does not export ${local} as ${name}`);
      }
    }
  }
  await emit('shared-18-D3y8YMFN.js', 'nested-session-parts.mjs', ['qv','vk','HA'], `
    ${await v3SidebarImports('nested-session-parts.mjs', 'shared-18-D3y8YMFN.js', {
      m: 'react', J9: 'memo', J1: 'memo', K1: 'memo', J2: 'memo', K2: 'memo',
      _e: [`${official.sharedFrame}#od`, `../view-tabs/${official.sharedFrame}`, 'CdsIcon'],
    }, { qv: ['"status-dot"', 'onAnimationStart:Kv'], vk: ['${_k} hit-row-main'], HA: ['"Warning"', 'size:"sm"', 'm(_e,'] })}
    import {syncInfiniteAnimations as Kv} from '../app-switch/app-switch-frame.mjs';
    import {sidebarHitRowClass as _k,sidebarFocusClass as bk} from './sidebar-row-primitive.mjs';
  `, 'export {qv as NestedStatusDot,Kv as synchronizeStatusAnimation,bk as nestedFocusClass,vk as sidebarHitRowMainClass,HA as NestedErrorIcon};', v3Source);
  // w10-shell-sidebar-row (research/w10-shell.md notdone 79): 3.6556.2 shared-21 g1, the nested-family caret a head row
  // shows as its nameSuffix (f0 `U = a === void 0 ? void 0 : u(h1,{headId:t.id,title:c.title})`), and l1, the container
  // toggle it draws (mode "button": role=button, aria-expanded, aria-labelledby, data-row-action, tabIndex -1). h1 only
  // reads the family's collapsed state (shared-20 cS) and stays a host prop (source-code-sidebar-row.jsx). yv / Qg
  // (shared-20 nS / TS) are host services; Sb / pb are the session-rail-kit fizzy-icon slice of shared-9 yw / Sw (fizzy
  // off, E12: CaretRight size xs); ec is the sessions-page slice of shared-78 hv (untitled).
  await emit('shared-21-R7LldJ05.js', 'sidebar-nested-caret.mjs', ['i1','a1','c1','l1','u1','d1','f1','g1'], await v3SidebarImports('sidebar-nested-caret.mjs', 'shared-21-R7LldJ05.js', {
    u: 'react', h: 'react', v: 'react',
    J9: 'memo', J0: 'memo', J1: 'memo', J2: 'memo', J3: 'memo', J4: 'memo', J5: 'memo',
    K0: 'memo', K1: 'memo', K2: 'memo', K3: 'memo', K4: 'memo', I1: 'memo', Z1: 'memo', Z5: 'memo',
    c: [`${official.vendorFrame}#Ba`, `../view-tabs/${official.vendorFrame}`, 'clsx'],
    U: [`${v3Frame}#Kl`, `../view-tabs/${v3Frame}`, 'CdsTooltip'],
    fe: [`${v3Frame}#od`, `../view-tabs/${v3Frame}`, 'CdsIcon'],
    Sf: [`${v3Intl}#p`, '../../source-code-start-adapters.jsx', 'useStartIntl'],
    Sb: ['shared-9-CM21XrJw.js#wt=yw', '../session-rail-kit/fizzy-icon.mjs', 'fizzyIconName'],
    pb: ['shared-9-CM21XrJw.js#Ct=Sw', '../session-rail-kit/fizzy-icon.mjs', 'FIZZY_CARET_DROP_STYLE'],
    ec: ['shared-78-D5Fw2h0a.js#WS=hv', '../sessions-page/pure-shared-78.mjs', 'sidebarListMessages'],
    _v: ['shared-20-mUr7IqZY.js#sn=DE', './nested-session-copy.mjs', 'nestedToggleLabel'],
    yv: ['shared-20-mUr7IqZY.js#ti=nS', '../../source-sidebar-nested-caret-adapters.mjs', 'toggleNestedFamily'],
    Qg: ['shared-20-mUr7IqZY.js#$r=TS', '../../source-sidebar-nested-caret-adapters.mjs', 'guardNestedCaretMultiClick'],
  }, {
    g1: ['"row_caret"', '"CaretRightFilled"', 'mode:"button"', 'labelledBy:', '"transition-transform duration-fast motion-reduce:transition-none"', 'size:"xs"', 'content:', 'lazy:!0'],
    l1: ['"data-container-icon":""', 'role:"button"', '"aria-expanded":', '"aria-labelledby":', '"data-row-action":""', 'tabIndex:-1'],
  }), 'export {g1 as SidebarNestedCaret,l1 as SidebarContainerToggle};', v3Source);
  // R3-nested NBS-3: nested_less_side_chats. cc-rest-sidebar-nested: 3.6556.2 shared-11 Ou/Nu/Fl/su/cu -> Rf/Uf/jl/jd/Md.
  // Uf no longer reads appFeatures.btwChildSessions: it is nested_less_side_chats when Ef, `sideChatTabStripForRows &&
  // !sideChatRowsShown` (the Ff() snapshot {appFeatures, sideChatRowsShown, sideChatTabStripForRows}); the host keeps
  // sideChatTabStripForRows false (E16), so it nests. jd (old su) reads the /btw side-child test through Rl (same
  // predicate, factored out); jl and Md are identical. Md (old cu) drops the in-tabs children from the drawn parent map.
  await emit('shared-11-_AVGLHEz.js', 'nested-session-parent-tabs.mjs', ['jl','Rl','jd','Md','Ef','Rf','Uf'], await v3SidebarImports('nested-session-parent-tabs.mjs', 'shared-11-_AVGLHEz.js', {}, {
    jl: ['projectThreadStarted!==!0'], Rl: ['spawnedFrom?.btw===!0', 'sideSession===!0', 'userFork===!0', 'lineageDetached'],
    jd: ['isArchived', 'spawnedFrom?.sessionId'], Ef: ['sideChatTabStripForRows', 'sideChatRowsShown'],
    Rf: ['appFeatures?.sideSessions?.status==="supported"'], Uf: ['"nested_less_side_chats"', '"nested"', '"flat"'],
  }), 'export {Rf as sideSessionsSupported,Uf as sideSessionNesting,jl as projectThreadNotStarted,jd as btwChildrenInParentTabs,Md as withoutParentTabChildren};', v3Source);
  // cc-rest-files (research/code-current-rest.md §2.2): the 2.42304.0 file-tree-density.mjs (shared-frame Co) is
  // retired; its 3.6556.2 table is shared-frame Ro, which view-tabs publishes as cdsIconSizes (file-tree-style.mjs).
  // w2-files (research/panes.md §2.3 C3-2): 3.6556.2 moved the geometry to c621b1e2d-CU5cG_mP.js, identical bodies
  // (w,T,E,D,O,k,L,R,z,B,V -> n,r,i,a,o,s,h,g,_,v,y). The icon size table is shared-frame Ro (exported `cd`), which
  // view-tabs publishes as cdsIconSizes; the "panels" part is shared-4 Yo (isFizzyLakePartEnabled, Qm=[] so "xs").
  // file-tree-density.mjs (2.42304.0) is no longer read by it.
  await emit('c621b1e2d-CU5cG_mP.js', 'file-tree-style.mjs', ['n','r','i','a','o','s','h','g','_','v','y'], "import {isFizzyLakePartEnabled as t} from '../view-tabs/shared-4-DUB1Oi0O.js'; import {cdsIconSizes as e} from '../view-tabs/shared-frame-6jtSkIit.js';", 'export { h as treeIndent, v as fileTreeGuideStyle, _ as guideGradient, y as fileTreeRowStyle, i as fileTreeIconSize };', v3Source); // R3-files FT-16: i for the compact tree (files-changes file-tree-compact.mjs)
  // cc-rest-files (research/code-current-rest.md §2–§3, data/code-current-rest-map.json): the file helpers are
  // 3.6556.2 renames (Gs/Ks/qs/Js -> Nc/Pc/Fc/Ic, …). Fc (old qs, old oc) also remembers mediaAsText and, new in
  // 3.6556.2, toldNoSftp; the host's media "View as text anyway" is a forced read (forcedText), and it never sets
  // toldNoSftp (no SSH/SFTP sessions, D37).
  await emit('cd2efac6e-Be7wcc4w.js', 'file-view-memory.mjs', ['Nc','Pc','Fc','Ic'], '', 'export { Fc as rememberFileView, Ic as readFileView };', v3Source);
  await emit('shared-28-DNYlf4wu.js', 'file-document-types.mjs', ['lN','dN','vN'], '', 'export { dN as isOfficeDocument, vN as binaryFileExtension };', v3Source);
  // The binary-text check (2.42304.0 cd2efac6e Uc) moved to c650084fd T (exported `y`, cd2efac6e reads it as ha). One
  // copy, in electron/generated so the main-process decoder keeps it when packaging excludes renderer src/.
  await emit('c650084fd-BlejO2XR.js', '../../../electron/generated/file-text-binary.mjs', ['T'], '', 'export { T as looksBinaryText };', v3Source);
  // xn is shared-28 nr (vN, file-document-types.mjs).
  await emit('cd2efac6e-Be7wcc4w.js', 'file-text-decoding.mjs', ['vd','yd','Ed'], "import {binaryFileExtension as xn} from './file-document-types.mjs'; import {looksBinaryText as ha} from '../../../electron/generated/file-text-binary.mjs';", 'export { vd as hasReplacementLoss, yd as utf8ByteLength, Ed as needsPlainTextView };', v3Source);
  // Electron must retain this decoder when packaging excludes renderer src/.
  await emit('cd2efac6e-Be7wcc4w.js', '../../../electron/generated/file-text-decoder.mjs', ['cd','dd','pd','md','gd','_d'], "import {looksBinaryText as ha} from './file-text-binary.mjs';", 'export { pd as detectTextEncoding, gd as decodeFileBytes, cd as detectionSampleBytes, dd as maximumTextBytes };', v3Source);
  // c30db9bec ql -> Zn now waits on an injectable clock (`n?.clock ?? Xn`, Xn = new Yn(): Date.now / performance.now /
  // a setTimeout that returns its own cancel); every other FileIndex binding is a rename (Jl…au -> er…dr).
  await emit('c30db9bec-CdR1oH22.js', 'file-index.mjs', ['Yn','Xn','Zn','er','tr','nr','rr','ir','ar','or','sr','cr','lr','ur','fr','pr','mr','hr','gr','_r','vr','yr','dr'], '', 'export { dr as FileIndex };', v3Source);
  await emit('c227f4d5e', 'mention-output-files.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('mention-output-files.mjs', v3Source, selected('mention-output-files.mjs')), `
    import {FileIndex} from './file-index.mjs';
    // Ma (shared-104 Fc): the resident FileIndex module; Rg (c68c4283d t): telemetry; qO/KO: the Folder/File icons by name.
    const Ma=()=>({FileIndex}), Rg=()=>{}, qO='Folder', KO='File';
  `, 'export { WO as mergeOutputFileOptions, HO as toFileMentionOption };', v3Source);
  // cc-rest-files: shared-26 Wb/Gb/qb -> DS/OS/AS, shared-28 PO/UO/zO -> _M/EM/SM (Ni is shared-26 nl = DS).
  await emit('shared-26-CGuBxVt9.js', 'file-output-root.mjs', ['DS','OS','AS'], '', 'export { DS as windowsAbsolutePath, AS as isUncPath };', v3Source);
  await emit('shared-28-DNYlf4wu.js', 'file-output-normalize.mjs', ['_M','EM','SM'], "import {windowsAbsolutePath as Ni} from './file-output-root.mjs';", 'export { SM as normalizeOutputPath, _M as isAbsolutePath };', v3Source);
  // w2-files: shared-0 Pa (old Hi) and shared-28 DM (old WO) are byte-identical bodies under new names.
  // W13 G11 (D1): Pa itself is routines-shared's shared-0 copy (that module has no imports, so plain node and E42 hold);
  // lazy-init.mjs only re-exports it under its code-current name, so code-current's own targets keep their import.
  await emit('shared-0', 'lazy-init.mjs', [], "import { Pa } from '../routines-shared/shared-0-DDOOdL6P.mjs';", 'export { Pa as lazyInit };', v3Source);
  await emit('shared-28', 'path-parts.mjs', ['DM'], '', 'export { DM as splitPath };', v3Source);
  // w2-files (research/sidebar.md §1.1, data/sidebar-targets.json): ce574895a-sBAnWI9w.js keeps every name; g / v are
  // React Compiler output now (their cache helpers come from view-tabs by the E3 names, R3; y / b are the callbacks the
  // compiler hoisted out of v). r is shared-25 up (pf, the
  // same ownerWindow body as code-current owner-window.mjs), i is shared-0 Lb (lazy-init.mjs).
  await emit('ce574895a-sBAnWI9w.js', 'breadcrumb-measure.mjs', ['a','o','s','c','l','u','d','f','p','m','h','g','_','v','y','b'], `
    import {flushSync as e} from 'react-dom';
    import {useLayoutEffect as t,useState as n} from 'react';
    import {memoStore3 as K3,memoChanged3 as J3,reactMemoCache as J9,memoStore4 as K4,memoChanged5 as J5,memoChanged4 as J4,memoStore5 as K5} from '../view-tabs/shared-frame-6jtSkIit.js';
    import {lazyInit as i} from './lazy-init.mjs';
    import {ownerWindow as r} from './owner-window.mjs';
  `, 'export { l as observeWidth, g as useHeadCut, v as useBreadcrumbCut, d as graphemeEnds, f as headCut, _ as breadcrumbCut };', v3Source);
  // R2-files FT-01: the breadcrumb path helpers moved from cd2efac6e to the new cfac349aa chunk (pure renames).
  // w2-files (research/sidebar.md §1.1, data/sidebar-targets.json): 3.6556.2 split cfac349aa again. jt/Mt/Xt/Gt/Vt are
  // cd2efac6e El/Dl/Kl/Bl/Rl and Ut is c0fbbe82d $r (exported `j`, cd2efac6e reads it as ta), all identical bodies. bn
  // (shared-28 mr = _M) and ht (shared-26 rl = AS) are file-output-normalize.mjs / file-output-root.mjs (3.6556.2 since
  // cc-rest-files; the 2.42304.0 PO / qb bodies were the same).
  await emit('c0fbbe82d-COsmfHJY.js', 'breadcrumb-within-root.mjs', ['$r'], '', 'export { $r as pathWithinRoot };', v3Source);
  await emit('cd2efac6e-Be7wcc4w.js', 'breadcrumb-paths.mjs', ['El','Dl','Kl','Bl','Rl'], `
    import {splitPath as dn} from './path-parts.mjs';
    import {isAbsolutePath as bn} from './file-output-normalize.mjs';
    import {isUncPath as ht} from './file-output-root.mjs';
    import {pathWithinRoot as ta} from './breadcrumb-within-root.mjs';
  `, 'export { El as segmentClass, Dl as segmentKeys, Kl as folderLabel, ta as pathWithinRoot, Bl as breadcrumbSegments, Rl as segmentMenuTarget };', v3Source);
  // w2-files (E39, research/composer.md §1: c0fbbe82d mn/hn -> cc5c56f5c-BoRtnbt1.js t/n, the same map
  // code-composer path-tooltip-placement.mjs uses); e is vendor-frame Ha, jsx.
  await emit('cc5c56f5c-BoRtnbt1.js', 'path-tooltip.mjs', ['t','n'], "import {jsx as e} from 'react/jsx-runtime';", 'export { t as pathTooltipOptions, n as pathTooltipContent };', v3Source);
  // R3-files FT-06 / SC-2, w2-files: 3.6556.2 folds the 2.42304.0 cfac349aa breadcrumb body back into cd2efac6e (Vl/Wl/
  // Gl/Hl/Ul/zl, segment menus ask the gone hook first) next to the FileBreadcrumb shell (Wf, passing askIfGone). The
  // binding lists and their imports are pinned by code-current-files-pins.mjs (closure, feature strings, import meaning).
  const filesPin = async target => (await import('./code-current-files-pins.mjs')).pinFilesHelper(target, v3Source, selected(target));
  const breadcrumbView = await filesPin('breadcrumb-view.mjs');
  await emit('cd2efac6e-Be7wcc4w.js', 'breadcrumb-view.mjs', breadcrumbView.bindings, breadcrumbView.imports, breadcrumbView.exports, v3Source);
  const breadcrumbFile = await filesPin('breadcrumb-file.mjs');
  await emit('cd2efac6e-Be7wcc4w.js', 'breadcrumb-file.mjs', breadcrumbFile.bindings, breadcrumbFile.imports, breadcrumbFile.exports, v3Source);
  // cc-rest-files: shared-130 Y…OR -> UV…QH and c73f45bc3 wv…Rv -> Ub…rx, identical bodies. In c73f45bc3, yr/hr/mr/gr
  // are shared-130 go/Ka/Ja/Wa (WV/JH/tU/zH), Vr is shared-28 jr (SM), and nx (old Lv) reads a message's outputs.
  // w12-viewtabs (D1): UV is exported too (forwardSlashes), so session-rail saved-output.mjs imports this one copy.
  await emit('shared-130-dWztbTO1.js', 'file-output-paths.mjs', ['UV','WV','XV','ZV','VH','HH','UH','WH','JH','$H','eU','tU','zH','YH','XH','ZH','QH'], '', 'export { UV as forwardSlashes, WV as outputBasename, JH as isAgentTemporaryPath, tU as isTemporaryPath, zH as isClaudeConfigPath, QH as isSideSessionNotesPath, XV as relativePathSegmentPattern, ZV as hasRelativePathSegment };', v3Source);
  await emit('c73f45bc3-B7hbL7H9.js', 'file-output-order.mjs', ['Ub','Kb','qb','Jb','Yb','Xb','Zb','Qb','$b','ex','rx'], `
    import {normalizeOutputPath as Vr} from './file-output-normalize.mjs';
    import {outputBasename as yr,isAgentTemporaryPath as hr,isTemporaryPath as mr,isClaudeConfigPath as gr} from './file-output-paths.mjs';
    // Protocol adapter: the host supplies completed Write/SendUserFile records.
    const nx=message=>message.outputFiles;
  `, 'export { rx as recentOutputPaths };', v3Source);
  // cc-rest-terminal-a (3.6556.2, research/code-current-rest.md §2/§5): terminal-selection … terminal-registry read
  // 3.6556.2; every binding is identical to its 2.42304.0 original after renaming. Each
  // binding list is pinned by code-current-terminal-pins.mjs (closure of the exported roots, feature strings, official
  // export aliases, replaced imports and the call sites that give them meaning). Export names stay (R4/E7).
  // cc-rest-terminal-b: terminal-errors / -idle-cursor / -clear-item / -tab-overflow read 3.6556.2 too (their compiled
  // closures import the cache helpers by the E3 names, sidebarMemo); every terminal-* target is now 3.6556.2.
  const terminalPinV3 = async target => (await import('./code-current-terminal-pins.mjs')).pinTerminalHelper(target, v3Source, selected(target));
  await emit('cccc2cf0a-DhZC33Gc.js', 'terminal-selection.mjs', await terminalPinV3('terminal-selection.mjs'), '', 'export { rS as terminalAttachmentText };', v3Source);
  await emit('cf718f694-C6OUPnrm.js', 'terminal-description.mjs', await terminalPinV3('terminal-description.mjs'), '', 'export { he as terminalDescription };', v3Source);
  // T (shared-0 yb = Zo; 2.42304.0 C) is the GrowthBook check of Vt "__gb__1475692361" that gates the prompt-navigation
  // keys; on locally.
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-commands.mjs', await terminalPinV3('terminal-commands.mjs'), 'const T = () => true;', 'export { Kt as installTerminalCommands };', v3Source);
  // R3-terminal FT-03/FT-04: the terminal pane's original bindings (they replaced the 2.31226.0 adapters of
  // extract-code-editor.mjs).
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-geometry.mjs', await terminalPinV3('terminal-geometry.mjs'), '', 'export { gi as terminalSelectionEndRow, _i as terminalSelectionBox, yi as isWholeTerminalSelection, bi as wholeTerminalSelectionAnchor, xi as terminalSelectionPillPosition };', v3Source);
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-output.mjs', await terminalPinV3('terminal-output.mjs'), '', 'export { dr as attachVisibleTerminalOutput, $n as terminalSelectionText };', v3Source);
  // ce is shared-78 mE = Eo (the macOS user-agent test; view-tabs isMacUserAgent), already emitted from 3.6556.2 as
  // surface-chord-platform.mjs (a plain module, no view-tabs import).
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-mouse.mjs', await terminalPinV3('terminal-mouse.mjs'), "import {isMacUserAgent as ce} from './surface-chord-platform.mjs';", 'export { ti as terminalOwnsContextMenu };', v3Source);
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-colors.mjs', await terminalPinV3('terminal-colors.mjs'), '', 'export { zn as installTerminalColorPolicy };', v3Source);
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-link-selection.mjs', await terminalPinV3('terminal-link-selection.mjs'), '', 'export { Dn as selectionBlocksTerminalLink };', v3Source);
  // j is vendor-intl f (react-intl defineMessages, the identity); the host formats the descriptors with its catalog.
  // cc-rest-terminal-b: ii..di (2.42304.0 Kr..Qr); ci adds needsNewerAppBody, di's closure adds ui.
  // w10-trans-terminal-inline-error (L126): si (TerminalLoadFailed) and li (the kind as the inline run's error text).
  await emit('c6bf19e8f-CgQ1_Jhf.js', 'terminal-errors.mjs', await terminalPinV3('terminal-errors.mjs'), 'const j = messages => messages;', 'export { ii as needsNewerAppError, ai as startFailedError, oi as loadFailedError, si as TerminalLoadFailed, ci as terminalErrorMessages, li as terminalErrorText, di as terminalStartError };', v3Source);
  // The shared-78 title sanitizer (jh/Fh/Vh = bj/yj/Tj; 2.42304.0 Xw/Yw/eT) and its shared-25/-52/-0 dependencies;
  // Ut/sn are shared-0 Lb = Pa (lazy-init.mjs, 3.6556.2).
  await emit('shared-25-DOWZRSlq.js', 'terminal-title-wellformed.mjs', await terminalPinV3('terminal-title-wellformed.mjs'), '', 'export { FH as stripLoneSurrogates, NH as isWellFormedText };', v3Source);
  // W13 G11 (D1): jL / ML are routines-shared's shared-0 copy (the pin links them); this file only re-exports them.
  await emit('shared-0-DDOOdL6P.js', 'terminal-title-invisibles.mjs', await terminalPinV3('terminal-title-invisibles.mjs'), "import { jL, ML } from '../routines-shared/shared-0-DDOOdL6P.mjs';", 'export { ML as invisibleBlankClass, jL as invisibleBlankCodePoints };', v3Source);
  await emit('shared-52-uHFNjl7C.js', 'terminal-title-runs.mjs', await terminalPinV3('terminal-title-runs.mjs'), "import {lazyInit as sn} from './lazy-init.mjs';", 'export { kB as capBlankRuns, bB as blankRunClass };', v3Source);
  await emit('shared-78-D5Fw2h0a.js', 'terminal-title-text.mjs', await terminalPinV3('terminal-title-text.mjs'), `
    import {stripLoneSurrogates as se} from './terminal-title-wellformed.mjs';
    import {lazyInit as Ut} from './lazy-init.mjs';
    import {capBlankRuns as Gi,blankRunClass as Mr} from './terminal-title-runs.mjs';
    import {invisibleBlankClass as Ct} from './terminal-title-invisibles.mjs';
  `, 'export { bj as visibleTitleText, yj as sanitizeTitleText, Tj as limitCodePoints };', v3Source);
  // a (shared-0 yb = Zo) and s (shared-52 Qd = Bw) read __gb__736896549, on locally; m (vendor-all-0 F, zustand) is the
  // host store.
  await emit('cf718f694-C6OUPnrm.js', 'terminal-titles.mjs', await terminalPinV3('terminal-titles.mjs'), `
    import {visibleTitleText as u,sanitizeTitleText as c,limitCodePoints as l} from './terminal-title-text.mjs';
    import {createTerminalTitleStore as m} from '../../terminal-title-store.mjs';
    const a = () => true, s = () => "on";
  `, 'export { be as installTerminalTitles, me as terminalTitleValue, J as forgetTerminalTitle, ge as terminalTitlesEnabled, G as terminalTitleStore };', v3Source);
  // v (c51596d2b S; 2.42304.0 te) is __gb__2265785636, on locally; _ (shared-28 Uc; 2.42304.0 h) reads the preference
  // from the local view settings.
  await emit('cf718f694-C6OUPnrm.js', 'terminal-idle-cursor.mjs', await terminalPinV3('terminal-idle-cursor.mjs'), `
    import {jsx as t} from 'react/jsx-runtime';
    import {clsx as e} from '../view-tabs/${official.vendorFrame}';
    ${sidebarMemo('J9 J1 K1 J2 K2 J3 K3 J5 K5')}
    import {useTerminalPreference as _} from '../../terminal-view-settings.mjs';
    const v = () => true;
  `, 'export { B as TerminalIdleCursor, z as useTerminalIdleCursorBlink, E as terminalCursorBlinkKey };', v3Source);
  await emit('cf718f694-C6OUPnrm.js', 'terminal-registry.mjs', await terminalPinV3('terminal-registry.mjs'), '', 'export { ne as registerTerminalRegistry, ce as terminalRegistryHas, se as clearTerminalViaRegistry };', v3Source);
  // me is view-tabs CdsContextMenu (source-terminal-adapters.jsx re-exports it: the terminal strip is the official
  // ViewTabBar, whose tab menu is that context menu); Z/Lr are the local catalog.
  // cc-rest-terminal-b: aS/oS/sS (2.42304.0 Yy/Xy/Zy).
  await emit('cccc2cf0a-DhZC33Gc.js', 'terminal-clear-item.mjs', await terminalPinV3('terminal-clear-item.mjs'), `
    import {useState as k} from 'react';
    import {jsx as u} from 'react/jsx-runtime';
    ${sidebarMemo('J9 J1 K1 J0 K0 J3 K3')}
    import {TerminalMenu as me,TerminalMessage as Z,useTerminalIntl as Lr} from '../../source-terminal-adapters.jsx';
    import {terminalRegistryHas as od,clearTerminalViaRegistry as ad} from './terminal-registry.mjs';
  `, 'export { aS as mountedTerminalViews, oS as terminalClearState, sS as TerminalClearItem };', v3Source);
  // w11-e31-terminal-cont: ceb49ada3 u, the selection action bar (pinned in code-current-terminal-pins.mjs). r/i/a/o are
  // view-tabs' cdsSurfaceClass / CdsButton / ariaKeyShortcuts / useIsMacPlatform from the concrete file (R6/E2); s is
  // cd59309dc n, which session-rail-changes already slices as useContextMenuOpenInWindow (D1: one store, so the marker
  // the terminal body menu, c0cdf4a08 g = RowContextMenu, renders is the one this bar reads).
  await emit('ceb49ada3-COmVjFwx.js', 'terminal-action-bar.mjs', await terminalPinV3('terminal-action-bar.mjs'), `
    import {jsx as e,jsxs as t} from 'react/jsx-runtime';
    import {Fragment as n} from 'react';
    import {cdsSurfaceClass as r,CdsButton as i,ariaKeyShortcuts as a,useIsMacPlatform as o} from '../view-tabs/${official.sharedFrame}';
    ${sidebarMemo('J9 J0 K0 J1 K1 J2 K2 J3 K3')}
    import {useContextMenuOpenInWindow as s} from '../session-rail-changes/context-menu-marker.mjs';
  `, 'export { u as SelectionActionBar };', v3Source);
  // R3-terminal FT-15 (terminal-10, global-v01): the shared view-tab strip's overflow menu row, with its compact size
  // table, typeahead reset keys and RTL key flip (replaced extract-code-editor.mjs's patched 2.31226.0
  // preview-tab-overflow.mjs; 2.42304.0 cfe7c4b3b ce/R/L/I).
  // cc-rest-terminal-b (3.6556.2): cfe7c4b3b se/P/L/ie/ce (2.42304.0 ce/N/I/L); ne / re are shared-25 up
  // (owner-window.mjs) and shared-19 ln (keyboard-repeat.mjs). te is shared-frame wd (ga), view-tabs' cdsSizeAttributes,
  // and the size table le is view-tabs' viewTabSizes: both imported from the concrete view-tabs files (R6/E2, never the
  // facade). w10-cleanup-cc-public retired terminal-tab-size-attrs.mjs, which only re-exported cdsSizeAttributes for it.
  // w10-trans-tab-overflow (L125): _ is the official one again, shared-frame Jo = view-tabs CdsDropdown (the pin checks
  // that publication), so se.Item is the CDS dropdown's Base UI item and the host overflow menu
  // (source-preview-tab-overflow.jsx) renders the rows in a CdsDropdown Root/Popup, as ae does.
  // w12-viewtabs (D1): the pin slices nothing; se / L / ie / le are re-exported from the concrete view-tabs file
  // (ViewTabOverflowItem, viewTabRtlArrowKey, viewTabOverflowTypeaheadResetKeys, viewTabSizes; the pin checks each
  // publication), so the overflow row and its P lead-glyph context exist once. Export names stay.
  await emit('cfe7c4b3b-BF79K6ux.js', 'terminal-tab-overflow.mjs', await terminalPinV3('terminal-tab-overflow.mjs'), '',
    "export { ViewTabOverflowItem as TabOverflowItem, viewTabSizes as tabOverflowSizes, viewTabOverflowTypeaheadResetKeys as tabOverflowTypeaheadResetKeys, viewTabRtlArrowKey as tabOverflowRtlKey } from '../view-tabs/cfe7c4b3b-BF79K6ux.js';", v3Source);
  await emit('shared-28', 'composer-composition.mjs', await (await import('./code-current-composer-pins.mjs')).pinComposerHelper('composer-composition.mjs', v3Source, selected('composer-composition.mjs')), `
    import {Plugin as lf, PluginKey as pf, TextSelection as df, Selection as hf} from 'prosemirror-state';
    // Only Tiptap extension registration and telemetry are host adapters.
    const Hf={create: options=>options};
    const Hb=()=>{}, Vb=message=>new Error(message), AS=()=>{};
  `, 'export const compositionEdgePlugins=()=>Qb.addProseMirrorPlugins(); export {RS as finishCompositionBeforePaste, FS as trackComposition, Jb as clearCompositionEdge, Wb as compositionEdgeKey, qb as isNonInclusiveMarkEdge};', v3Source);
  if (only) for (const target of only) if (!manifest.modules.some(entry => entry.target === target)) throw Error(`Unknown --only target ${target}`);
  const text = JSON.stringify(manifest, null, 2) + '\n';
  if (check) { if (await fs.readFile(path.join(output, 'manifest.json'), 'utf8') !== text) mismatches.push('Current Code helper manifest changed'); }
  else await fs.writeFile(path.join(output, 'manifest.json'), text);
  if (mismatches.length) throw Error(mismatches.join('\n'));
  console.log(`${check ? 'Verified' : 'Extracted'} ${only ? `${only.size} of ` : ''}${manifest.modules.length} current Code source helper modules.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--only');
  const only = index > 0 ? new Set(process.argv[index + 1].split(',').filter(Boolean)) : null;
  await extractCurrentCodeHelpers({ check: process.argv.includes('--check'), only });
}
