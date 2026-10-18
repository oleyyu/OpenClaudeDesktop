// R4g-composer CP6 (composer-14): extract the 2.42304.0 layered permission-mode resolution without executing any
// desktop runtime (decision D0: own generator, own output folder src/generated/permission-mode, own
// scripts/verify-gen-permission-mode.mjs).
//
//   resolution.mjs  c8eb45883 d (exported n; imported by c227f4d5e as `yy`): the composer's base mode for an opening,
//                   `baseMode: userChoice ?? userSettingsDefault ?? folderChoice ?? repoSettingsDefault ?? globalPref`,
//                   with baseModeSource (in_session_pick / settings_default_mode / folder_pick /
//                   repo_settings_default_mode / global_pick / auto_default / fallback), hasExplicitChoice and
//                   spawnModeIsProvisional. The function reads nothing outside its own parameters.
//
// The emitted binding is the original top-level declaration sliced from the installed chunk (no hand edits). The
// generator also pins, each exactly once, the c227f4d5e call sites the host adapter (src/permission-mode-resolution.mjs)
// follows but cannot import: where every layer comes from (the opening-scoped userChoice zt(E), the account-scoped folder
// map "epitaxy-folder-permission-mode", the global "cc-landing-draft-permission-mode" that only the auto-default nudge
// writes), the draft folder-move effect, the running-session chain and the Mode-menu pick (gn) that writes userChoice and
// the folder's pick, never the global preference. A renamed or re-pointed binding fails generation instead of silently
// binding another value.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const output = path.join(root, 'src/generated/permission-mode');
const target = 'resolution.mjs', manifestName = 'manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const chunk = { file: 'c8eb45883-BKWHnsew.js', bindings: ['d'], exported: { d: 'resolvePermissionBaseMode' },
  // The chunk's own export table: d leaves it as `n` (c227f4d5e imports `n as yy`).
  exportTable: 'export{s as a,c as i,d as n,u as r,o as t};',
  features: { d: ['baseMode: e ?? t ?? r ?? n ?? i,', ': "in_session_pick",', ': "folder_pick"', ': "global_pick"', 'storedPickLayersSettled: o,', 'hasExplicitChoice: e !== null || (t === void 0 && r !== void 0),'] } };

// c227f4d5e (the session composer's mode state, function JI): the layer sources and the pick, as shipped.
const composer = { file: 'c227f4d5e-Ba-r--Rl.js', pins: [
  'import{a as _y,i as vy,n as yy,r as by,t as xy}from"./c8eb45883-BKWHnsew.js"',
  '[be,xe]=Bc("cc-landing-draft-permission-mode",null,{scope:"account"})',
  '{globalPref:De,consultedStoredGlobalPref:Oe}=by({storedGlobalPref:ye,accountGlobalPref:be,autoDefaultAllowed:Te})',
  'Me=b?.defaultPermissionMode,Ne=vy(!o&&!!g&&ir(g),S),Pe=U&&Ne?xy(Me?.value):void 0,Fe=_y(Me?.source,S),Ie=Fe?Pe:void 0,Le=Fe?void 0:Pe',
  '[Ge,Ke]=Bc("epitaxy-folder-permission-mode",BI,{scope:"account"})',
  'qe=s?.originCwd?.replace(/\\/\\.claude\\/worktrees\\/[^/]+$/,"")',
  'Ze=Xe?Ge[Xe]:void 0,Qe=Ze==="plan"?void 0:Ze',
  '[q,tt]=zt(E,()=>null)',
  'let n=e===null||e===II,r=n&&t!==null&&t!=="plan",i=r&&!(zI(Xe)&&AI(t,{autoIsDefault:Ee})&&!(t==="auto"&&$e));i&&!Ve||(i&&Xe!==null&&Ke(e=>({...e,[Xe]:t})),n&&RI(Xe)&&(i||!r)||tt(null),rt.current=Xe)',
  '{baseMode:ft,baseModeSource:pt,hasExplicitChoice:ht,spawnModeIsProvisional:gt}=M(()=>yy({userChoice:q,userSettingsDefault:Ie,repoSettingsDefault:Le,folderChoice:Qe,globalPref:De,consultedStoredGlobalPref:Oe,storedPickLayersSettled:ct}),[q,Ie,Le,Qe,De,Oe,ct])',
  'J=M(()=>o?q??(vt?"bypassPermissions":void 0)??_t??yt??l??De:et?"auto":at?Su(ft,he):ft,[o,q,vt,_t,yt,l,ft,De,he,at,et])',
  'if(a===c)return sn&&on&&(a==="auto"||a==="bypassPermissions")&&Promise.resolve(on(sn,a)).catch(()=>void 0),!O&&nt.current===null&&RI(dn.current)&&tt(a),Promise.resolve("unchanged")',
  '_=!!h&&o!=="approval_card"&&a!=="plan"&&!(a==="bypassPermissions"&&zI(h));tt(a),_&&Ke(e=>({...e,[h]:a}))',
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

export async function extractPermissionMode({ check = false } = {}) {
  const bytes = await fs.readFile(path.join(source, chunk.file));
  const code = bytes.toString();
  if (count(code, chunk.exportTable) !== 1) throw Error(`${chunk.file}: export table changed`);
  const ast = parsers.babel.parse(code, {});
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-permission-mode.mjs', output: target, sources: [], bindings: {}, pins: {} };
  const texts = [];
  for (const name of chunk.bindings) {
    const { kind, node } = topLevel(ast, chunk.file, name);
    const raw = code.slice(node.start, node.end);
    const pretty = await format(kind === 'function' ? raw : `var ${raw};`, { parser: 'babel' });
    for (const feature of chunk.features[name] ?? []) if (count(pretty, feature) !== 1) throw Error(`${chunk.file}: ${name} lost feature ${feature}`);
    texts.push(kind === 'function' ? raw : `var ${raw};`);
    manifest.bindings[name] = { source: chunk.file, exportedAs: chunk.exported[name] };
  }
  manifest.sources.push({ file: path.relative(root, path.join(source, chunk.file)), sourceSha256: sha(bytes), bindings: chunk.bindings });
  const composerBytes = await fs.readFile(path.join(source, composer.file));
  const composerCode = composerBytes.toString();
  for (const pin of composer.pins) if (count(composerCode, pin) !== 1) throw Error(`${composer.file}: pin is not exactly once: ${pin}`);
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
