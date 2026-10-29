// R4g-composer CP6 (composer-14), migrated to 3.6556.2 by lane w1-composer-pure: extract the layered permission-mode
// resolution without executing any desktop runtime (decision D0: own generator, own output folder
// src/generated/permission-mode, own scripts/verify-gen-permission-mode.mjs).
//
//   resolution.mjs  c8eb45883 p (exported i; imported by c227f4d5e as `qb`): the composer's base mode for an opening,
//                   `baseMode: userChoice ?? userSettingsDefault ?? folderChoice ?? repoSettingsDefault ?? globalPref`,
//                   with baseModeSource (in_session_pick / settings_default_mode / folder_pick /
//                   repo_settings_default_mode / global_pick / auto_default / fallback), hasExplicitChoice and
//                   spawnModeIsProvisional. The function reads nothing outside its own parameters. Its text is the
//                   2.42304.0 d byte for byte; only the minified name and the export alias moved (d/n -> p/i).
//
// The emitted binding is the original top-level declaration sliced from the snapshot chunk (no hand edits). The
// generator also pins, each exactly once, the c227f4d5e call sites the host adapter (src/permission-mode-resolution.mjs)
// follows but cannot import (RR, the session composer's mode state): where every layer comes from (the opening-scoped
// userChoice `$l(k,WR)`, the account-scoped folder map — since 3.6556.2 "epitaxy-folder-permission-mode-v2", seeded once
// from the v1 "epitaxy-folder-permission-mode" through OR, which drops every Bypass pick on a local folder key — the
// global "cc-landing-draft-permission-mode" that only the auto-default nudge writes), the draft folder-move effect, the
// running-session chain and the Mode-menu pick that writes userChoice and the folder's pick (undone when the change
// fails), never the global preference. React Compiler rewrote every call shape, so the pins are matched through
// looseFeature() (R2: identifiers of at most three characters generalized, literals and keys kept) and must match
// exactly once; a renamed or re-pointed binding fails generation instead of silently binding another value.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, ionSource as source, looseFeature } from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/permission-mode');
const target = 'resolution.mjs', manifestName = 'manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const chunk = { file: 'c8eb45883-BdFVtK0i.js', bindings: ['p'], exported: { p: 'resolvePermissionBaseMode' },
  // The chunk's own export table: p leaves it as `i` (c227f4d5e imports `i as qb`). New in 3.6556.2: the mode rank
  // table a (`t`) and its comparison o (`n`), which RR uses for the remote folder fallback.
  exportTable: 'export{f as a,p as i,o as n,u as o,c as r,l as s,a as t};',
  // Literal keys and strings tell p apart from any other function that might take its minified name (R2/E5).
  features: { p: ['baseMode:e??t??r??n??i,', 'e===null?t===void 0?r===void 0?n===void 0?a===null?i==="auto"?"auto_default":"fallback":"global_pick":"repo_settings_default_mode":"folder_pick":"settings_default_mode":"in_session_pick"',
    'storedPickLayersSettled:o', 'hasExplicitChoice:e!==null||t===void 0&&r!==void 0,', 'spawnModeIsProvisional:o&&e===null&&t===void 0&&r===void 0&&n===void 0&&a===null'] } };

// c227f4d5e (the session composer's mode state, function RR): the layer sources and the pick, as shipped.
const composer = { file: 'c227f4d5e-B-FYKrwT.js', pins: [
  'import{a as Kb,i as qb,n as Jb,o as Yb,r as Xb,s as Zb}from"./c8eb45883-BdFVtK0i.js"',
  // globalPref: the stored local value and the account-scoped one, through c8eb45883 f (Kb).
  '[ve]=Xd("cc-landing-draft-permission-mode",null),ye=J0($,29)?K0($,29,{scope:"account"}):$[29],[be,xe]=Xd("cc-landing-draft-permission-mode",null,ye)',
  '{globalPref:Ee,consultedStoredGlobalPref:De}=Kb({storedGlobalPref:ve,accountGlobalPref:be,autoDefaultAllowed:we})',
  // userSettingsDefault / repoSettingsDefault: settings.json defaultPermissionMode, split by its source.
  'je=w?.defaultPermissionMode,Me=J3($,30,b,s,E)?K3($,30,b,s,E,Yb(!s&&!!b&&mi(b),E)):$[33],Ne=q&&Me?Xb(je?.value):void 0,Pe=Zb(je?.source,E),Fe=Pe?Ne:void 0,Ie=Pe?void 0:Ne',
  // folderChoice: the v2 folder map, seeded from v1 without a local folder's Bypass (OR keeps it only for fR keys).
  '[We,Ge]=Xd("epitaxy-folder-permission-mode-v2",kR,AR),Ke=c?.originCwd',
  'var kR={},AR={scope:"account",seedFromPref:{key:"epitaxy-folder-permission-mode",map:e=>typeof e=="object"&&e&&!Array.isArray(e)?OR(e):void 0}}',
  'function OR(e){return Object.fromEntries(Object.entries(e).filter(([e,t])=>t!=="bypassPermissions"||fR(e)))}',
  'function fR(e){return/^(?:remote|remote-env|remote-session|scratch|ssh|wsl):/.test(e)}',
  // The session's folder: its originCwd without /.claude/worktrees/<name> (pR); a Plan folder pick is ignored.
  'function pR(e){return e.replace(/\\/\\.claude\\/worktrees\\/[^/]+$/,"")}',
  'Je=Ke===void 0?void 0:pR(Ke);let e;bb0:{',
  'et=$e?We[$e]:void 0,tt=c?.remote?Je:null',
  'it=et??(rt!==void 0&&Jb(Ef(rt,X),Ef(Ie??Ee,X))?rt:void 0),at=it==="plan"?void 0:it',
  // userChoice: an in-memory pick per opening, starting null.
  '[ot]=vR(),st=ge&&(Te||ot),[ct,lt]=$l(k,WR)',
  'function WR(){return null}var GR={probing:"Detecting remote OS and shell..."',
  // The draft folder-move effect: a pick made before the first folder carries into it, then any move clears it.
  'let n=e===null||e===wR,r=n&&t!==null&&t!=="plan",i=r&&!(t==="bypassPermissions"&&$e!==null&&fR($e))&&!(DR($e)&&cR(t,{autoIsDefault:Te})&&!(t==="auto"&&ot));i&&!Be||(i&&$e!==null&&Ge(e=>({...e,[$e]:t})),n&&ER($e)&&(i||!r)||lt(null),mt.current=$e)',
  // The draft's base mode through c8eb45883 p (qb).
  '{baseMode:Tt,baseModeSource:Et,hasExplicitChoice:Dt,spawnModeIsProvisional:Ot}=J5($,81,De,at,Ee,Ie,xt,ct,Fe)?K5($,81,De,at,Ee,Ie,xt,ct,Fe,qb({userChoice:ct,userSettingsDefault:Fe,repoSettingsDefault:Ie,folderChoice:at,globalPref:Ee,consultedStoredGlobalPref:De,storedPickLayersSettled:xt})):$[88]',
  // A running session: its pick, the kept Bypass, the session record's mode, the spawn mode, the global preference.
  'kt=c?.permissionMode,At=hh(s?.type==="local"?s.id:null)',
  'bb1:{if(s){Ut=ct??(At?"bypassPermissions":void 0)??kt??jt??A??Ee;break bb1}if(st){Ut="auto";break bb1}if(!yt){Ut=Tt;break bb1}',
  // The Mode-menu pick: the same mode is no pick; otherwise userChoice and (not Plan, not the approval card, no Bypass on
  // a scratch or remote-env key) the folder's pick, both undone when the change fails.
  'if(e===l)return Pn&&Nn&&(e==="auto"||e==="bypassPermissions")&&Promise.resolve(Nn(Pn,e)).catch(BR),!j&&ut.current===null&&ER(Rn.current)&&lt(e),Promise.resolve("unchanged")',
  'v=!!g&&c!=="approval_card"&&e!=="plan"&&!(e==="bypassPermissions"&&DR(g));lt(e),v&&Ge(t=>({...t,[g]:e}))',
  'y=()=>{_&&Pn&&yy(Pn,"chosen"),lt(m),v&&Ge(e=>{if(h===void 0){let t={...e};return delete t[g],t}return{...e,[g]:h}})}',
  'function DR(e){return e===wR||ER(e)}',
  'wR=bR,TR="remote-env:"',
  'var bR="scratch:"',
] };

function topLevel(ast, file, name) {
  const hits = [];
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator });
  }
  if (hits.length !== 1) throw Error(`${file}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const count = (text, needle) => text.split(needle).length - 1;
/** R2: a pin or feature matches through looseFeature(); the count is of loose matches. */
export const looseCount = (text, feature) => [...text.matchAll(looseFeature(feature, { flags: 'g' }))].length;

export async function extractPermissionMode({ check = false } = {}) {
  const bytes = await fs.readFile(path.join(source, chunk.file));
  const code = bytes.toString();
  if (count(code, chunk.exportTable) !== 1) throw Error(`${chunk.file}: export table changed`);
  const ast = parsers.babel.parse(code, {});
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-permission-mode.mjs', output: target, sources: [], bindings: {}, pins: {}, pinMatch: 'looseFeature' };
  const texts = [];
  for (const name of chunk.bindings) {
    const { kind, node } = topLevel(ast, chunk.file, name);
    const raw = code.slice(node.start, node.end);
    for (const feature of chunk.features[name] ?? []) if (looseCount(raw, feature) !== 1) throw Error(`${chunk.file}: ${name} lost feature ${feature}`);
    texts.push(kind === 'function' ? raw : `var ${raw};`);
    manifest.bindings[name] = { source: chunk.file, exportedAs: chunk.exported[name] };
  }
  manifest.sources.push({ file: path.relative(root, path.join(source, chunk.file)), sourceSha256: sha(bytes), bindings: chunk.bindings });
  const composerBytes = await fs.readFile(path.join(source, composer.file));
  const composerCode = composerBytes.toString();
  for (const pin of composer.pins) if (looseCount(composerCode, pin) !== 1) throw Error(`${composer.file}: pin is not exactly once: ${pin}`);
  manifest.sources.push({ file: path.relative(root, path.join(source, composer.file)), sourceSha256: sha(composerBytes), pins: composer.pins.length });
  manifest.pins[composer.file] = composer.pins;
  const exports = `export { ${Object.entries(chunk.exported).map(([local, name]) => `${local} as ${name}`).join(', ')} };`;
  const text = await format(`// Original Claude Desktop ${referenceVersion} binding; generated by scripts/extract-permission-mode.mjs.\n// ${chunk.file}\n${texts.join('\n')}\n${exports}\n`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it.
  const parsed = babel.babelParse(text, target, true);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals); } });
  if (globals.length) throw Error(`${target}: unbound ${globals.join(', ')}`);
  manifest.sha256 = sha(text);
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
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
