// R4e-preview: extract the 3.6556.2 main-process check that refuses a coordinate once the page's zoom or size has
// changed since the agent's last screenshot (preview-15), without executing any desktop runtime
// (asar/.vite/build/index.chunk-jPKPzV-P.js; 2.42304.0 names from index.chunk-muI2IV6k.js in brackets):
//
//   r4e-preview-coordinates.mjs
//     createPreviewCoordinateCheck({ Cvi: O1 }) — inside one factory, verbatim (the host still passes the geometry as Cvi):
//       q3i   [g4i] the size tolerance at a zoom (max(1, 20 / scale) CSS px),
//       J3i   [_4i] whether the tab's geometry moved past it since the screenshot (scale beyond 0.5 %, width or height
//             beyond q3i); it reads the current geometry through O1 [Cvi] (readVisualViewportGeometry), the host parameter,
//     and, for a point in the screenshot's pixels (R4f-preview-coords F2), verbatim with what they read:
//       X3i   [y4i] the point in the page's CSS pixels (× viewportWidth / screenshotWidth, rounded),
//       K3    (new in 3.6556.2) the clamp size: the viewport, or its visible part of a zoomed-in page (Y3i),
//       Z3i   [b4i] X3i clamped to K3's size — the point dispatched (2.42304.0 b4i inlined K3; the result is the same),
//       $3i   [S4i] the bounds check (outside the frame, Q3i px of slack; past the visible part of a zoomed-in page), its
//             message or null,
//       Y3i / hoi / moi / NZ / Q3i   [v4i / Osi / Dsi / Esi / x4i] the visible-part test (narrower than the layout by
//             more than moi), "zoomed in" (scale > 1.005), the frame's slack,
//     and, from e6i [C4i], its two needs_screenshot messages as functions of the action name (`n`):
//       zoomChangedError(n)  the screenshot's geometry no longer holds (`${n}: the page's zoom or size has changed; …`),
//       pageChangedError(n)  the record was already dropped for it (`${n}: this tab's page, zoom or size has changed; …`).
//
// The record keeping around them (B3 / V3 [d2 / f2]: R3i's [c4i] record of a screenshot with K3i's [h4i] viewport,
// U3(e, t, !0) [m2] when the check fails, e6i's order, o6i's [k4i] $3i → Z3i before a point is dispatched) is reproduced by
// electron/r4e-preview-coordinates.mjs; its call sites are anchored here, so the generator fails when
// they no longer read the extracted functions the same way. The emitted module is parsed and may read no identifier
// it doesn't declare, apart from standard globals.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, asarSource } from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
// R1: version, snapshot and asar directory from the shared 3.6556.2 constants.
const source = asarSource;
const output = path.join(root, 'electron/generated');
const chunkFile = 'index.chunk-jPKPzV-P.js';
const outputName = 'r4e-preview-coordinates.mjs';
const manifestName = 'r4e-preview-manifest.json';
const factory = 'createPreviewCoordinateCheck';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const STANDARD_GLOBALS = new Set(['Math', 'Number']);

// Functions, and constants (a `var` of one numeric literal): emitted in the chunk's order.
const bindings = ['NZ', 'moi', 'hoi', 'q3i', 'J3i', 'Y3i', 'K3', 'X3i', 'Z3i', 'Q3i', '$3i'];
const constants = new Set(['moi', 'Q3i']);
const exportsAs = {
  NZ: 'zoomedIn', hoi: 'partlyVisible', q3i: 'sizeTolerance', J3i: 'zoomOrSizeChanged', Y3i: 'visiblePart',
  K3: 'clampSize', X3i: 'frameToViewport', Z3i: 'dispatchPoint', $3i: 'coordinateProblem',
};
// The host value: still a top-level declaration of the chunk, reading the visual viewport geometry. `key` is the factory's
// parameter key the host passes it under: the 2.42304.0 name Cvi, kept so electron/r4e-preview-coordinates.mjs is unchanged (R4).
const host = { O1: { key: 'Cvi', role: 'the tab\'s current geometry: { scale, width, height } (readVisualViewportGeometry)', anchors: ['readVisualViewportGeometry()'] } };
// The message source (2.42304.0 C4i): its two needs_screenshot messages (each a template literal `${n}: …` over the action name).
const messageSource = 'e6i';
const messages = [
  { name: 'zoomChangedError', starts: ": the page's zoom or size has changed; take a new screenshot (" },
  { name: 'pageChangedError', starts: ": this tab's page, zoom or size has changed; take a new screenshot (" },
];
// What electron/r4e-preview-coordinates.mjs reproduces around them.
const callSites = {
  // e6i [C4i]: a record whose geometry moved fails with the first message and is dropped as changed (U3(e,t,!0)); without a
  // record, a tab whose record was dropped that way fails with the second.
  e6i: ['i=()=>{let e=B3.get(r);return e&&e.screenshotWidth>0&&e.screenshotHeight>0?e:void 0},a=i();',
    'if(a&&await J3i(e,t,a))return U3(e,t,!0),{error:', 'errorClass:"needs_screenshot"};if(a=i(),!a&&V3.get(r)!==!0){',
    'return a?{dims:a}:{error:V3.get(r)===!0?'],
  // R3i [c4i]: a screenshot records its frame, K3i's viewport and its geometry (`visible`), and clears the changed flag.
  R3i: ['B3.set(o,{viewportWidth:r?.w||1280,viewportHeight:r?.h||800,screenshotWidth:i.frameWidth??i.width,screenshotHeight:i.frameHeight??i.height,',
    'visible:r&&r.visible.width>0&&r.visible.height>0?r.visible:null}),(!a||!V3.has(o))&&V3.set(o,!1)'],
  // K3i [h4i]: the viewport in CSS pixels (innerWidth × innerHeight over a zoom above 1) and the geometry it was read at.
  K3i: ['a=Math.max(1,i.scale);return{w:r.w/a,h:r.h/a,visible:i}'],
  // U3(e, t, !0) [m2]: the record goes, and the tab is marked changed.
  U3: ['B3.delete(r),n&&V3.has(r)&&V3.set(r,!0);return'],
  // o6i [k4i]: every action given a coordinate (clicks, hover, scroll, drag) goes through e6i first, then $3i (its message
  // after the action's name, errorClass coordinate_out_of_bounds), and dispatches Z3i's point; 3.6556.2 also returns
  // K3's size as `viewport` (read by the new F3 action marker); the screenshot's result names its size.
  o6i: ['if(n.coordinate){let r=await e6i(e,t,o);if("error"in r)return r;',
    'let i=$3i(r.dims,n.coordinate[0],n.coordinate[1]);return i?{error:`${o}: ${i}`,errorClass:"coordinate_out_of_bounds"}:{dispatch:Z3i(r.dims,n.coordinate[0],n.coordinate[1]),echo:[Math.round(n.coordinate[0]),Math.round(n.coordinate[1])],viewport:K3(r.dims)}',
    'let a=$3i(i.dims,n.coordinate[0],n.coordinate[1]);if(a)return BF(`scroll: ${a}`,"coordinate_out_of_bounds");let s=Z3i(i.dims,n.coordinate[0],n.coordinate[1])',
    'text:`Screenshot size: ${o.width}x${o.height}${c}${l}`'],
};

async function readChunk() {
  const bytes = await fs.readFile(path.join(source, chunkFile));
  const code = bytes.toString();
  return { bytes, code, ast: parsers.babel.parse(code, {}) };
}

function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator, statement: node });
  }
  if (hits.length !== 1) throw Error(`${chunkFile}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const text = (chunk, node) => chunk.code.slice(node.start, node.end);

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => item && typeof item === 'object' && item.type && walk(item, visit));
    else if (child && typeof child === 'object' && child.type) walk(child, visit);
  }
}

function assertClosed(textOut) {
  const ast = babel.babelParse(textOut, outputName, true);
  let globals = [];
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); } });
  const unbound = globals.filter((global) => !STANDARD_GLOBALS.has(global));
  if (unbound.length) throw Error(`${outputName}: unbound ${unbound.join(', ')}`);
  return globals.sort();
}

// The factory's host parameter may only be called (Cvi(e, t)).
function hostCalls(textOut) {
  const ast = babel.babelParse(textOut, outputName, true);
  const calls = Object.fromEntries(Object.keys(host).map((name) => [name, 0]));
  babel.traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name !== factory) return;
      for (const name of Object.keys(host)) {
        for (const ref of p.scope.getBinding(name)?.referencePaths ?? []) {
          if (ref.parent.type !== 'CallExpression' || ref.parent.callee !== ref.node) throw Error(`${outputName}: host ${name} is used as ${ref.parent.type}`);
          calls[name]++;
        }
      }
    },
  });
  for (const [name, count] of Object.entries(calls)) if (!count) throw Error(`${outputName}: host ${name} is never called`);
  return calls;
}

function messageFunctions(chunk) {
  const { node } = topLevel(chunk, messageSource);
  if (node.type !== 'FunctionDeclaration' || !node.async || node.params.map((param) => param.name).join() !== 'e,t,n') throw Error(`${chunkFile}: ${messageSource} is no longer async function ${messageSource}(e,t,n)`);
  return messages.map((spec) => {
    const found = [];
    walk(node.body, (value) => {
      if (value.type === 'TemplateLiteral' && value.quasis[1]?.value.cooked?.startsWith(spec.starts)) found.push(value);
    });
    if (found.length !== 1) throw Error(`${chunkFile}: ${messageSource} has ${found.length} messages starting ${JSON.stringify(spec.starts)}`);
    const [literal] = found;
    if (literal.quasis[0].value.cooked !== '' || literal.expressions.length !== 1 || literal.expressions[0].type !== 'Identifier' || literal.expressions[0].name !== 'n')
      throw Error(`${chunkFile}: ${messageSource}'s ${spec.name} message is no longer \`\${n}: …\``);
    return { name: spec.name, code: `// ${messageSource}: ${spec.name === 'zoomChangedError' ? 'the record no longer holds' : 'the record was dropped as changed'} (errorClass "needs_screenshot").\nfunction ${spec.name}(n) {\nreturn ${text(chunk, literal)};\n}`, sha256: sha(text(chunk, literal)) };
  });
}

export async function extractR4ePreview({ check = false } = {}) {
  const chunk = await readChunk();
  const hits = bindings.map((name) => ({ name, ...topLevel(chunk, name) }));
  for (const hit of hits) {
    if (!constants.has(hit.name)) {
      if (hit.kind !== 'function') throw Error(`${chunkFile}: ${hit.name} is no longer a function declaration`);
      continue;
    }
    // A constant is emitted as its whole statement, which must declare it alone, as a number.
    if (hit.kind !== 'declarator' || hit.statement.declarations.length !== 1 || hit.node.init?.type !== 'NumericLiteral') throw Error(`${chunkFile}: ${hit.name} is no longer \`var ${hit.name}=<number>\``);
    hit.node = hit.statement;
  }
  hits.sort((a, b) => a.node.start - b.node.start);
  const hostEntries = {};
  for (const [name, spec] of Object.entries(host)) {
    const declared = text(chunk, topLevel(chunk, name).node);
    for (const needle of spec.anchors) if (!declared.includes(needle)) throw Error(`${outputName}: host ${name} no longer contains ${JSON.stringify(needle)}`);
    hostEntries[name] = { ...(spec.key ? { key: spec.key } : {}), role: spec.role, sourceSha256: sha(declared) };
  }
  const anchors = {};
  for (const [name, needles] of Object.entries(callSites)) {
    const body = text(chunk, topLevel(chunk, name).node);
    for (const needle of needles) if (!body.includes(needle)) throw Error(`${outputName}: ${name} no longer contains ${JSON.stringify(needle)}`);
    anchors[name] = { sha256: sha(body), needles };
  }
  const messageCode = messageFunctions(chunk);
  const exportList = [...hits.filter((hit) => exportsAs[hit.name]).map((hit) => `${exportsAs[hit.name]}: ${hit.name}`), ...messageCode.map((message) => message.name)];
  const params = Object.entries(host).map(([name, spec]) => (spec.key && spec.key !== name ? `${spec.key}: ${name}` : name));
  const body = `export function ${factory}({ ${params.join(', ')} }) {\n${hits.map((hit) => text(chunk, hit.node)).join('\n')}\n${messageCode.map((message) => message.code).join('\n')}\nreturn { ${exportList.join(', ')} };\n}\n`;
  const out = await format(`// Original Claude Desktop ${referenceVersion} main-process code (${chunkFile}); generated by scripts/extract-r4e-preview.mjs — do not edit.\n${body}`, { parser: 'babel' });
  const entry = {
    factory, host: hostEntries,
    bindings: Object.fromEntries(hits.map((hit) => [hit.name, { sha256: sha(text(chunk, hit.node)), ...(exportsAs[hit.name] ? { exportedAs: exportsAs[hit.name] } : {}) }])),
    messages: Object.fromEntries(messageCode.map((message) => [message.name, { from: messageSource, sha256: message.sha256 }])),
    globals: assertClosed(out), hostCalls: hostCalls(out), callSites: anchors, sha256: sha(out),
  };
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r4e-preview.mjs', source: path.relative(root, path.join(source, chunkFile)), sourceSha256: sha(chunk.bytes), targets: { [outputName]: entry } };
  const files = new Map([[outputName, out], [manifestName, JSON.stringify(manifest, null, 2) + '\n']]);
  if (check) {
    for (const [name, content] of files) {
      let current = null;
      try { current = await fs.readFile(path.join(output, name), 'utf8'); } catch { /* missing */ }
      if (current !== content) throw Error(`r4e-preview generated file mismatch: electron/generated/${name}`);
    }
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const [name, content] of files) await fs.writeFile(path.join(output, name), content);
  }
  return [...files.keys()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const written = await extractR4ePreview({ check });
  console.log(`${check ? 'checked' : 'wrote'} ${written.map((name) => `electron/generated/${name}`).join(', ')}`);
}
