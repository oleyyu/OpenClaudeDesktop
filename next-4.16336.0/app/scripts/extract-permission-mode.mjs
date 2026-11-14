// R4g-composer CP6 (composer-14), migrated to 3.6556.2 by lane w1-composer-pure and to 4.16336.0 by regions-misc
// (analysis/claude-4.16336.0-migrate-20261104/regions/regions-misc): extract the layered permission-mode resolution
// without executing any desktop runtime (decision D0: own generator, own output folder src/generated/permission-mode,
// own scripts/verify-gen-permission-mode.mjs).
//
//   resolution.mjs  c8eb45883 v (exported c; imported by c227f4d5e as `iy`; 3.6556.2 p / i / qb): the composer's base
//                   mode for an opening, `baseMode: userChoice ?? _(userSettingsDefault ?? folderChoice ??
//                   repoSettingsDefault ?? globalPref, heldPolicyCeiling)`, with baseModeSource (in_session_pick /
//                   settings_default_mode / folder_pick / repo_settings_default_mode / global_pick / auto_default /
//                   fallback), hasExplicitChoice and spawnModeIsProvisional. New in 4.16336.0: the `heldPolicyCeiling`
//                   parameter, the managed policy's defaultPermissionModeCeiling, caps every layer below the opening's
//                   own pick through _ (exported n, `cy`): `t!==void 0&&g(e,t)?t:e`, g comparing modes over the rank table
//                   a (exported t) with dontAsk ranked above an equal-rank default. v reads nothing else, so the module is
//                   the same-chunk closure v, _, g, a.
//
// Every emitted binding is the original top-level declaration sliced from the snapshot chunk (no hand edits). The root
// is located by its export alias and must be the only top-level declaration of its chunk carrying its features (R2/E5:
// looseFeature, literals and keys exact); its closure is computed by Babel scope analysis.
//
// The generator also pins, each exactly once, the c227f4d5e call sites the host adapter (src/permission-mode-resolution.mjs)
// follows but cannot import (the session composer's mode state): where every layer comes from (the opening-scoped
// userChoice `Id(j,EH)`, the account-scoped folder map — "epitaxy-folder-permission-mode-v2", seeded once from the v1
// "epitaxy-folder-permission-mode" through aH, which drops every Bypass pick on a local folder key — the global
// "cc-landing-draft-permission-mode" that only the auto-default nudge writes, the settings defaults split by source, and
// the policy ceiling `Ge=se?uy(E):void 0`), the draft folder/environment-move effect (rewritten in 4.16336.0: a pick that
// is neither Auto nor Bypass and that the new environment offers is kept across moves; a pick made before the first folder
// is carried into it unless Plan, Bypass into an fR key, or Auto without the auto-mode consent `Jx`), the running-session
// chain, and the Mode-menu pick that writes userChoice, records the folder it was committed in (`jt.current`) and the
// folder's pick (undone when the change fails), never the global preference. Since 4.16336.0 the scoped-key helpers live
// in cf059c6df (fR → _ / Gx, pR → v / Ux, the scratch key T / Xx, the risky-mode test p / Yx, the consent hook C / Jx);
// those declarations are pinned there and the import names they arrive under are pinned in c227f4d5e.
// React Compiler rewrote every call shape, so the pins are matched through looseFeature() with the names this
// generator binds kept literal (`boundNames`), and must match exactly once; a renamed or re-pointed binding fails
// generation instead of silently binding another value.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, ionSource as source, looseFeature } from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/permission-mode');
const target = 'resolution.mjs', manifestName = 'manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const chunk = { file: 'c8eb45883-Daa6ad-i.js', root: { alias: 'c', exportedAs: 'resolvePermissionBaseMode' },
  // The chunk's own export table: v leaves it as `c` (c227f4d5e imports `c as iy`), _ as `n` (`cy`), a as `t`.
  exportTable: 'export{s as a,v as c,h as d,l as f,o as i,f as l,_ as n,p as o,m as r,c as s,a as t,u};',
  // Literal keys and strings tell the root apart from any other function that might take its minified name (R2/E5).
  features: ['baseMode:e??_(t??r??n??i,s),', 'heldPolicyCeiling:s',
    'e===null?t===void 0?r===void 0?n===void 0?a===null?i==="auto"?"auto_default":"fallback":"global_pick":"repo_settings_default_mode":"folder_pick":"settings_default_mode":"in_session_pick"',
    'storedPickLayersSettled:o', 'c=e!==null||t===void 0&&r!==void 0', 'hasExplicitChoice:c,', 'spawnModeIsProvisional:o&&e===null&&t===void 0&&r===void 0&&n===void 0&&a===null'],
  // The closure members, each pinned to its own text: the ceiling cap, the rank comparison and the rank table.
  closure: {
    _: ['function _(e,t){return t!==void 0&&g(e,t)?t:e}'],
    g: ['function g(e,t){return a[e]>a[t]||a[e]===a[t]&&t==="dontAsk"&&e!=="dontAsk"}'],
    a: ['a={plan:0,default:1,dontAsk:1,acceptEdits:2,auto:3,bypassPermissions:4}'],
  } };

// Names the pins bind: kept literal inside loose pins so a reused minified name cannot stand in for them.
const boundNames = ['iy', 'sy', 'ly', 'uy', 'dy', 'ay', 'fy', 'oy', 'cy', 'Gx', 'Ux', 'Yx', 'Xx', 'Jx', 'Id', 'kl',
  'aH', 'rH', 'iH', 'tH', 'nH', 'oH', 'sH', 'EH', 'TH'];
// c227f4d5e (the session composer's mode state): the layer sources and the pick, as shipped.
const composer = { file: 'c227f4d5e-DGDdGBTz.js', pins: [
  'import{a as ry,c as iy,f as ay,i as oy,l as sy,n as cy,o as ly,r as uy,s as dy,u as fy}from"./c8eb45883-Daa6ad-i.js"',
  // cf059c6df: the scoped-key test, the worktree strip, the scratch key, the risky-mode test, the auto-mode consent.
  'import{a as Ux,c as Wx,i as Gx,l as Kx,n as qx,o as Jx,r as Yx,t as Xx}from"./cf059c6df-B32mQ24C.js"',
  // globalPref: the stored local value and the account-scoped one, through c8eb45883 f (sy).
  '[Ee]=kl("cc-landing-draft-permission-mode",null),De=J0($,32)?K0($,32,{scope:"account"}):$[32],[Oe,ke]=kl("cc-landing-draft-permission-mode",null,De)',
  '{globalPref:Pe,consultedStoredGlobalPref:Fe}=sy({storedGlobalPref:Ee,accountGlobalPref:Oe,autoDefaultAllowed:Me})',
  // userSettingsDefault / repoSettingsDefault: settings.json's default mode beneath the policy (c8eb45883 p, `ly`), split
  // by its source; heldPolicyCeiling: the policy's defaultPermissionModeCeiling (c8eb45883 m, `uy`), local/SSH only.
  'ze=ly(E),Be=J3($,33,x,l,O)?K3($,33,x,l,O,fy(!l&&!!x&&bo(x),O)):$[36],Ve=se&&Be?dy(ze?.value):void 0,He=ay(ze?.source,O),Ue=He?Ve:void 0,We=He?void 0:Ve',
  'Ge=se?uy(E):void 0',
  // folderChoice: the v2 folder map, seeded from v1 without a local folder's Bypass (aH keeps it only for Gx keys).
  '[rt,it]=kl("epitaxy-folder-permission-mode-v2",oH,sH),at=u?.originCwd',
  'var oH={},sH={scope:"account",seedFromPref:{key:"epitaxy-folder-permission-mode",map:e=>typeof e=="object"&&e&&!Array.isArray(e)?aH(e):void 0}}',
  'function aH(e){return Object.fromEntries(Object.entries(e).filter(([e,t])=>t!=="bypassPermissions"||Gx(e)))}',
  // The session's folder: its originCwd without /.claude/worktrees/<name> (Ux); a Plan folder pick is ignored.
  'st=at===void 0?void 0:Ux(at);let e;bb0:{',
  'mt=pt?rt[pt]:void 0,gt=u?.remote?st:null',
  'xt=mt??(bt!==void 0&&oy(Nc(bt,Y),Nc(We??Pe,Y))?bt:void 0),St=xt==="plan"?void 0:xt',
  // userChoice: an in-memory pick per opening, starting null; jt: the folder the pick was committed in, starting null.
  '[Ct]=Jx(),wt=we&&(Ne||Ct),[X,Tt]=Id(j,EH)',
  'let jt=Pd(j,TH)',
  'function TH(){return null}function EH(){return null}',
  // The draft folder/environment-move effect.
  'let{key:e,env:t,envId:n}=Ot.current,r={key:pt,env:V,envId:x};if(l){Ot.current=r;return}let i=e!==pt;if(!i&&t===V&&(n===void 0||n===x)){Ot.current=r;return}',
  'let a=Et.current,o=i&&pt!==null&&(e===null||e===tH),s=jt.current,c=s===null||s===tH,u=a!==null&&!Yx(a,{autoIsDefault:!1})&&(t===V||a==="plan")&&Y.includes(a),d=o&&c&&a!==null&&a!=="plan"&&!(a==="bypassPermissions"&&pt!==null&&Gx(pt))&&!(a==="auto"&&!Ct&&Yx(a,{autoIsDefault:Ne}));if(d&&!Ze&&!et)return;let f=d&&Ze;f&&pt!==null&&it(e=>({...e,[pt]:a}));let p=u&&(!rH(pt)||c);a===null||p||o&&rH(pt)&&f?a!==null&&pt!==null&&pt!==tH&&(jt.current=pt):Tt(null),Ot.current=r',
  // The draft's base mode through c8eb45883 v (iy), with the policy ceiling.
  '{baseMode:Vt,baseModeSource:Ht,hasExplicitChoice:Ut,spawnModeIsProvisional:Wt}=J5($,115,Fe,St,Pe,Ge,We,Lt,X,Ue)?K5($,115,Fe,St,Pe,Ge,We,Lt,X,Ue,iy({userChoice:X,userSettingsDefault:Ue,repoSettingsDefault:We,folderChoice:St,globalPref:Pe,consultedStoredGlobalPref:Fe,storedPickLayersSettled:Lt,heldPolicyCeiling:Ge})):$[123]',
  // A running session: its pick, the kept Bypass, the session record's mode, the spawn modes, then the global preference.
  'Gt=u?.permissionMode,Kt=Mh(l?.type==="local"?l.id:null)',
  'let sn=X??(Kt?"bypassPermissions":void 0)??Gt??qt??F??null,cn;bb1:{if(l){cn=sn;break bb1}if(wt){cn="auto";break bb1}if(!Ft){cn=Vt;break bb1}',
  'let ln=cn,un=ln??Pe',
  // The Mode-menu pick: the same mode is no pick; otherwise userChoice, the folder it is committed in and (not Plan, not
  // the approval card, no Bypass on a scratch or remote-env key) the folder's pick, both undone when the change fails.
  'if(f)return er&&$n&&(e==="auto"||e==="bypassPermissions")&&Promise.resolve($n(er,e)).catch(xH),!I&&Et.current===null&&rH(ir.current)&&(jt.current=ir.current,Tt(e)),Promise.resolve("unchanged")',
  'y=!!_&&u!=="approval_card"&&e!=="plan"&&!(e==="bypassPermissions"&&iH(_))',
  'jt.current=ir.current,Tt(e),y&&it(t=>({...t,[_]:e}))',
  'let x=t=>{y&&it(n=>{if(t?.onlyIfKept&&n[_]!==e)return n;if(g===void 0){let e={...n};return delete e[_],e}return{...n,[_]:g}})}',
  'S=()=>{v&&er&&_y(er,"chosen"),Tt(h),x()}',
  'function iH(e){return e===tH||rH(e)}',
  'function rH(e){return e?.startsWith(nH)===!0}',
  'tH=Xx,nH="remote-env:"',
] };
// cf059c6df: the helpers c227f4d5e imports under the names above.
const helpers = { file: 'cf059c6df-B32mQ24C.js', pins: [
  'export{v as a,E as c,_ as i,d as l,m as n,C as o,p as r,h as s,T as t};',
  'function _(e){return/^(?:remote|remote-env|remote-session|scratch|ssh|wsl):/.test(e)}',
  'function v(e){return e.replace(/\\/\\.claude\\/worktrees\\/[^/]+$/,"")}',
  'var T="scratch:"',
  'function p(e,t){return e==="bypassPermissions"||e==="auto"&&!0}',
  '[n,r]=s("epitaxy-auto-mode-consented",!1,t)',
] };

const count = (text, needle) => text.split(needle).length - 1;
/** R2: a pin or feature matches through looseFeature(); the count is of loose matches. Regex-literal pins only match
 * verbatim (looseFeature does not tokenize regex bodies), so an exact hit counts as such. */
export const looseCount = (text, feature, keep = boundNames) => {
  const exact = count(text, feature);
  if (exact) return exact;
  return [...text.matchAll(looseFeature(feature, { keep, flags: 'g' }))].length;
};

function topLevelDeclarations(ast) {
  const all = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id) all.set(node.id.name, [...(all.get(node.id.name) ?? []), { kind: 'function', node }]);
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id?.type === 'Identifier') all.set(d.id.name, [...(all.get(d.id.name) ?? []), { kind: 'declarator', node: d }]);
  }
  return all;
}
const exportAliases = ast => new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
  .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));

export async function extractPermissionMode({ check = false } = {}) {
  const bytes = await fs.readFile(path.join(source, chunk.file));
  const code = bytes.toString();
  if (count(code, chunk.exportTable) !== 1) throw Error(`${chunk.file}: export table changed`);
  const ast = parsers.babel.parse(code, {});
  const declarations = topLevelDeclarations(ast);
  const single = name => {
    const hits = declarations.get(name) ?? [];
    if (hits.length !== 1) throw Error(`${chunk.file}: expected one top-level ${name}, found ${hits.length}`);
    return hits[0];
  };
  const raw = entry => code.slice(entry.node.start, entry.node.end);
  // The root: the export alias's local, and the only top-level declaration carrying every feature.
  const rootName = exportAliases(ast).get(chunk.root.alias);
  if (!rootName) throw Error(`${chunk.file}: no export ${chunk.root.alias}`);
  const carriers = [...declarations].filter(([, hits]) => hits.some(h => chunk.features.every(f => looseCount(raw(h), f, []) === 1))).map(([n]) => n);
  if (carriers.length !== 1 || carriers[0] !== rootName) throw Error(`${chunk.file}: root features match ${carriers.join(', ') || 'nothing'}, export ${chunk.root.alias} is ${rootName}`);
  // The closure: every top-level binding the root reaches, by Babel scope analysis over the chunk.
  let program;
  babel.traverse(babel.babelParse(code, chunk.file, true), { Program(p) { program = p; p.stop(); } });
  const within = (outer, q) => q.node.start >= outer.start && q.node.end <= outer.end;
  const reached = new Set();
  const visit = name => {
    if (reached.has(name)) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${chunk.file}: unbound ${name}`);
    if (binding.kind === 'module') throw Error(`${chunk.file}: ${name} is an import (the resolution must stay pure)`);
    reached.add(name);
    const node = single(name).node;
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (dep !== name && (b.referencePaths.some(q => within(node, q)) || b.constantViolations.some(q => within(node, q)))) visit(dep);
  };
  visit(rootName);
  const closureNames = [...reached].filter(n => n !== rootName);
  if (JSON.stringify([...closureNames].sort()) !== JSON.stringify(Object.keys(chunk.closure).sort()))
    throw Error(`${chunk.file}: ${rootName} now reaches ${closureNames.join(', ')}`);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-permission-mode.mjs', output: target, sources: [], bindings: {},
    pins: {}, pinMatch: 'looseFeature', boundNames, rootMatch: 'export alias + unique looseFeature carrier' };
  const ordered = [...reached].map(name => ({ name, ...single(name) })).sort((a, b) => a.node.start - b.node.start);
  const texts = [];
  for (const entry of ordered) {
    const text = raw(entry);
    const features = entry.name === rootName ? chunk.features : chunk.closure[entry.name];
    for (const feature of features) if (looseCount(text, feature, []) !== 1) throw Error(`${chunk.file}: ${entry.name} lost feature ${feature}`);
    texts.push(entry.kind === 'function' ? text : `var ${text};`);
    manifest.bindings[entry.name] = { source: chunk.file, sha256: sha(text), ...(entry.name === rootName ? { exportedAs: chunk.root.exportedAs, chunkExport: chunk.root.alias } : { reachedFrom: rootName }) };
  }
  manifest.sources.push({ file: path.relative(root, path.join(source, chunk.file)), sourceSha256: sha(bytes), bindings: ordered.map(e => e.name) });
  for (const site of [composer, helpers]) {
    const siteBytes = await fs.readFile(path.join(source, site.file));
    const siteCode = siteBytes.toString();
    for (const pin of site.pins) {
      const n = looseCount(siteCode, pin);
      if (n !== 1) throw Error(`${site.file}: pin is not exactly once (${n}): ${pin}`);
    }
    manifest.sources.push({ file: path.relative(root, path.join(source, site.file)), sourceSha256: sha(siteBytes), pins: site.pins.length });
    manifest.pins[site.file] = site.pins;
  }
  const exports = `export { ${rootName} as ${chunk.root.exportedAs} };`;
  const text = await format(`// Original Claude Desktop ${referenceVersion} bindings; generated by scripts/extract-permission-mode.mjs.\n// ${chunk.file}: ${ordered.map(e => e.name).join(', ')}\n${texts.join('\n')}\n${exports}\n`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it.
  const parsed = babel.babelParse(text, target, true);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals); } });
  if (globals.length) throw Error(`${target}: unbound ${globals.join(', ')}`);
  manifest.sha256 = sha(text);
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort();
    if (JSON.stringify(present) !== JSON.stringify([manifestName, target].sort())) throw Error(`permission mode output set changed: ${present.join(',')}`);
    if (await fs.readFile(path.join(output, target), 'utf8') !== text) throw Error(`permission mode resolution mismatch: ${target}`);
    if (await fs.readFile(path.join(output, manifestName), 'utf8') !== manifestText) throw Error(`permission mode manifest mismatch: ${manifestName}`);
  } else {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, target), text);
    await fs.writeFile(path.join(output, manifestName), manifestText);
  }
  return { text, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await extractPermissionMode({ check: process.argv.includes('--check') });
  console.log(process.argv.includes('--check') ? 'Original permission mode resolution verified.' : 'Extracted original permission mode resolution.');
}
