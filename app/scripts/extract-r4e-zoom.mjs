// Extract the 2.42304.0 main-process zoom bindings lane R4e-zoom reuses (menus-14 / layout-16: View › Zoom In / Zoom Out
// are disabled at the zoom limits), without executing any desktop runtime. From asar index.chunk-muI2IV6k.js:
//   pure      jHn=.25, MHn=Math.log(1.2), NHn=Math.log(jHn)/MHn, PHn=Math.log(5)/MHn (the zoom-level range, Chromium's
//             1.2^level steps between factors .25 and 5), FHn (clamp a level to [NHn, PHn]) and mPi=.5 (the step);
//   host-bound gPi (the main view's level, void 0 without one), _Pi / vPi (Zoom In / Zoom Out enabled: level below PHn /
//             above NHn, or no level), PPi (I$: after every reset APi, step FPi, dom-ready, blur and hide, set
//             actual-size / actual-size-numpad / zoom-in / zoom-out enabled from the current level).
//
// gPi and PPi read the official module-level main view `V` (kSe: V=new a.WebContentsView(e)) and PPi reads the electron
// namespace `a` (a.Menu). Those two are the only host bindings: the original declarations are emitted verbatim inside
// bindZoomMenu(V, a), whose parameters stand in for the module-level `V` and `a` (the host passes its main window,
// which has the same `.webContents`, and `{ Menu }`). The pure bindings stay at module level.
//
// Each binding is sliced from the minified chunk: a function as the shortest text from `function <name>(` that parses
// as exactly that one declaration; a `var` declarator as the shortest `<name>=…` cut at a `,`/`;` that parses as exactly
// that one declarator. A name declared more than once, or ever reassigned, fails generation. Every binding and every
// official caller that fixes how it is used (yPi's menu items, APi/FPi/MPi/NPi/I$) carries feature strings that must
// still appear in the original text, so a version bump that re-points a minified name fails here instead of silently
// binding the wrong value. The assembled module must be closed (Babel scope: only Math and module are free) and `V` /
// `a` may only be read as `V.webContents` / `a.Menu`. Output is prettier-formatted after assembly.
//
// D0: own generator, own output (electron/generated/r4e-zoom.cjs and its manifest), own scripts/verify-gen-r4e-zoom.mjs.
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
const mainSource = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const electronOutput = path.join(root, 'electron/generated');
const target = 'r4e-zoom.cjs', targetManifest = 'r4e-zoom-manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const file = 'index.chunk-muI2IV6k.js';
// Module-level (pure) bindings, in source order.
const pure = [
  { name: 'jHn', kind: 'var', features: ['jHn=.25'] },
  { name: 'MHn', kind: 'var', features: ['MHn=Math.log(1.2)'] },
  { name: 'NHn', kind: 'var', features: ['NHn=Math.log(jHn)/MHn'] },
  { name: 'PHn', kind: 'var', features: ['PHn=Math.log(5)/MHn'] },
  { name: 'FHn', kind: 'function', features: ['return Math.min(PHn,Math.max(NHn,e))'] },
  { name: 'mPi', kind: 'var', features: ['mPi=.5'] },
];
// Bindings that read the official module-level `V` / `a`, emitted inside bindZoomMenu(V, a).
const hostBound = [
  { name: 'gPi', kind: 'var', features: ['V?.webContents!=null&&!V.webContents.isDestroyed()?V.webContents.getZoomLevel():void 0'] },
  { name: '_Pi', kind: 'var', features: ['_Pi=(e=gPi())=>e===void 0||e<PHn'] },
  { name: 'vPi', kind: 'var', features: ['vPi=(e=gPi())=>e===void 0||e>NHn'] },
  { name: 'PPi', kind: 'function', params: 0, features: ['if(!V?.webContents||V.webContents.isDestroyed())return;', 'let e=V.webContents.getZoomLevel(),t=a.Menu.getApplicationMenu()',
    'n=[["actual-size",e!==0],["actual-size-numpad",e!==0],["zoom-in",_Pi(e)],["zoom-out",vPi(e)]]', 'for(let[e,r]of n){let n=t?.getMenuItemById(e);n&&(n.enabled=r)}'] },
];
const hostParams = { V: ['webContents'], a: ['Menu'] };
// Semantic export names (bindZoomMenu returns the host-bound ones).
const exportsAs = { NHn: 'ZOOM_LEVEL_MIN', PHn: 'ZOOM_LEVEL_MAX', FHn: 'clampZoomLevel', mPi: 'ZOOM_STEP' };
const boundAs = { gPi: 'zoomLevel', _Pi: 'canZoomIn', vPi: 'canZoomOut', PPi: 'refreshZoomMenu' };
// Official callers that fix how the bindings are used.
const callers = {
  yPi: { kind: 'var', features: ['{id:"actual-size",', 'enabled:hPi(),click:APi}', '{id:"zoom-in",', 'accelerator:"CmdOrCtrl+Plus",enabled:_Pi(),click:MPi}',
    '{id:"zoom-out",', 'accelerator:"CmdOrCtrl+-",enabled:vPi(),click:NPi}', '{id:"actual-size-numpad",label:"Actual Size (numpad)"'] },
  APi: { kind: 'function', features: ['V.webContents.setZoomLevel(0),jPi(0),I$(),F$()'] },
  FPi: { kind: 'function', features: ['n=FHn(e===0?t:Math.round((t+e)/mPi)*mPi+0);V.webContents.setZoomLevel(n),jPi(n),I$(),F$()'] },
  MPi: { kind: 'function', features: ['FPi(mPi)'] },
  NPi: { kind: 'function', features: ['FPi(-.5)'] },
  I$: { kind: 'function', features: ['function I$(){PPi()}'] },
};

const escapeName = name => name.replace(/\$/g, '\\$');
// A minified name is assigned only by its own declaration (a var declarator's `<name>=`, none for a function).
function assertSingleBinding(code, name, kind) {
  const assigns = code.match(new RegExp(`(?<![\\w$.])${escapeName(name)}\\s*=(?![=>])`, 'g'))?.length ?? 0;
  const functions = code.split(`function ${name}(`).length - 1;
  if (kind === 'function' ? functions !== 1 || assigns !== 0 : functions !== 0 || assigns !== 1)
    throw Error(`${file}: expected ${name} to be bound once as a ${kind} (functions ${functions}, assignments ${assigns})`);
}
const parse = text => { try { return parsers.babel.parse(text, {}); } catch { return null; } };

function sliceFunction(code, name) {
  const marker = `function ${name}(`;
  const at = code.indexOf(marker);
  if (!/[;}{)]$|^$/.test(code.slice(Math.max(0, at - 1), at))) throw Error(`${file}: ${name} is not a statement-level declaration`);
  for (let end = code.indexOf('}', at); end >= 0; end = code.indexOf('}', end + 1)) {
    const text = code.slice(at, end + 1);
    const ast = parse(text);
    if (!ast) continue;
    const [node, ...rest] = ast.program.body;
    if (rest.length || node?.type !== 'FunctionDeclaration' || node.id?.name !== name) throw Error(`${file}: ${name} does not slice as one declaration`);
    return { text, node };
  }
  throw Error(`${file}: ${name} never closes`);
}

function sliceDeclarator(code, name) {
  const re = new RegExp(`(?<![\\w$.])${escapeName(name)}=(?![=>])`, 'g');
  const at = re.exec(code)?.index;
  // A declarator of a `var` list: right after `var ` or after the `,` that ends the previous declarator.
  if (at === undefined || !(code.slice(at - 4, at) === 'var ' || code[at - 1] === ',')) throw Error(`${file}: ${name} is not a var declarator`);
  for (let end = at + name.length + 1; end < code.length; end++) {
    if (code[end] !== ',' && code[end] !== ';') continue;
    const text = code.slice(at, end);
    const ast = parse(`var ${text};`);
    if (!ast) continue;
    const [node, ...rest] = ast.program.body;
    if (rest.length || node?.type !== 'VariableDeclaration' || node.declarations.length !== 1 || node.declarations[0].id.name !== name)
      throw Error(`${file}: ${name} does not slice as one declarator`);
    return { text, node: node.declarations[0] };
  }
  throw Error(`${file}: ${name} never ends`);
}

function slice(code, name, spec) {
  assertSingleBinding(code, name, spec.kind);
  const found = spec.kind === 'function' ? sliceFunction(code, name) : sliceDeclarator(code, name);
  for (const feature of spec.features) if (!found.text.includes(feature)) throw Error(`${target}: ${name} lacks ${JSON.stringify(feature)}`);
  if (spec.params !== undefined && found.node.params.length !== spec.params) throw Error(`${target}: ${name} now takes ${found.node.params.length} parameters`);
  return found;
}

const declaration = (name, { kind }, text) => kind === 'function' ? text : `var ${text};`;

// Members of each host parameter read inside the factory (only `<param>.<member>` / `<param>?.<member>` reads).
function hostReads(ast) {
  const reads = Object.fromEntries(Object.keys(hostParams).map(name => [name, new Set()]));
  let factory = 0;
  babel.traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name !== 'bindZoomMenu') return;
      factory++;
      for (const name of Object.keys(hostParams)) {
        const binding = p.scope.getBinding(name);
        if (!binding || binding.kind !== 'param') throw Error(`${target}: ${name} is not bindZoomMenu's parameter`);
        if (binding.constantViolations.length) throw Error(`${target}: ${name} is reassigned`);
        for (const ref of binding.referencePaths) {
          const parent = ref.parent;
          if (!/^(Optional)?MemberExpression$/.test(parent.type) || parent.object !== ref.node || parent.computed) throw Error(`${target}: ${name} is used other than as a member read`);
          reads[name].add(parent.property.name);
        }
      }
    },
  });
  if (factory !== 1) throw Error(`${target}: expected one bindZoomMenu`);
  return Object.fromEntries(Object.entries(reads).map(([name, set]) => [name, [...set].sort()]));
}

async function extractMain() {
  const bytes = await fs.readFile(path.join(mainSource, file));
  const code = bytes.toString();
  const sliced = {};
  for (const spec of [...pure, ...hostBound]) sliced[spec.name] = slice(code, spec.name, spec).text;
  for (const [name, spec] of Object.entries(callers)) slice(code, name, spec);
  const pureText = pure.map(spec => declaration(spec.name, spec, sliced[spec.name])).join('\n');
  const boundText = hostBound.map(spec => declaration(spec.name, spec, sliced[spec.name])).join('\n');
  const header = `// Original Claude Desktop ${referenceVersion} main-process bindings; generated by scripts/extract-r4e-zoom.mjs.\n`
    + `// ${file}: the zoom-level range (jHn, MHn, NHn, PHn), FHn and mPi; gPi / _Pi / vPi / PPi read the module-level main view V\n`
    + `// and the electron namespace a, which bindZoomMenu(V, a) takes from the host (main window, { Menu }).\n`;
  const factory = `// V: the main view (official module-level \`let V\`); a: the electron namespace (only a.Menu is read).\n`
    + `function bindZoomMenu(V, a) {\n${boundText}\nreturn { ${hostBound.map(spec => `${boundAs[spec.name]}: ${spec.name}`).join(', ')} };\n}\n`;
  const exportText = `module.exports = { ${pure.map(spec => spec.name).join(', ')}, ${Object.entries(exportsAs).map(([name, alias]) => `${alias}: ${name}`).join(', ')}, bindZoomMenu };\n`;
  const text = await format(`${header}"use strict";\n${pureText}\n${factory}${exportText}`, { parser: 'babel' });
  // The module must be closed: every identifier it reads is declared in it (Math and CommonJS module aside).
  const parsed = babel.babelParse(text, target, false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals).filter(name => !['Math', 'module'].includes(name)); } });
  if (globals.length) throw Error(`${target}: unbound ${globals.join(', ')}`);
  const reads = hostReads(parsed);
  for (const [name, members] of Object.entries(reads))
    if (JSON.stringify(members) !== JSON.stringify(hostParams[name])) throw Error(`${target}: ${name} reads ${members.join(', ')}, expected ${hostParams[name].join(', ')}`);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r4e-zoom.mjs', output: target,
    source: path.relative(root, path.join(mainSource, file)), sourceSha256: sha(bytes),
    bindings: [...pure.map(spec => ({ ...spec, scope: 'module' })), ...hostBound.map(spec => ({ ...spec, scope: 'bindZoomMenu' }))]
      .map(({ name, kind, scope, features }) => ({ name, kind, scope, sha256: sha(sliced[name]), features })),
    exportsAs, boundAs, hostParams, callers: Object.fromEntries(Object.entries(callers).map(([name, spec]) => [name, spec.features])), sha256: sha(text) };
  return { [target]: text, [targetManifest]: JSON.stringify(manifest, null, 2) + '\n' };
}

export async function extractR4eZoom({ check = false } = {}) {
  const files = await extractMain();
  if (check) {
    for (const [name, text] of Object.entries(files)) {
      const present = await fs.readFile(path.join(electronOutput, name), 'utf8').catch(() => null);
      if (present !== text) throw Error(`r4e-zoom main-process mismatch: ${name}. Run scripts/extract-r4e-zoom.mjs.`);
    }
  } else {
    await fs.mkdir(electronOutput, { recursive: true });
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(electronOutput, name), text);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} ${target} (${pure.length + hostBound.length} original ${referenceVersion} main-process bindings).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR4eZoom({ check: process.argv.includes('--check') });
