// Extract the 2.42304.0 main-process built-in "visualize" MCP server (R4g-mcp MA-1, D35: the visualize tool and the MCP
// App host are migrated on their enabled branch) without executing any desktop runtime. Source: asar
// index.chunk-BaLvO2wi.js, a module whose only exports is `exports.getImagineServerDef=A` (official CCD / Cowork
// internal-server list index.chunk-B5tintml.js requires it and pushes `getImagineServerDef()`):
//   pure      n (CDS vanilla token guide), r (platform → widget width), i (read_me preamble), a / c / l (width-dependent
//             UI-components / SVG-setup / diagram-type guides), o, s, u, d, f, p (elicitation, color palette, Chart.js,
//             data-viz, art guides and the closing "Do not overthink" note), m (the visualize widget HTML template, a
//             single template literal), h / g (read_me module and platform enums), _ (module → guide table), v / y / b / x
//             (resource uri, maxResultSizeChars, the show_widget / read_me tool array, the resource listing), S / C / w
//             (tool call, resource read, resource list), T (unavailable-reason enum), E (server name), D (policy refusal);
//   host-bound O (the once-only refusal log latch), k (refuse when the org policy withholds inline visualizations) and
//             A (getImagineServerDef: { serverName, tools, handleToolCall, handleReadResource, handleListResources,
//             isEnabled }).
//
// The chunk's own module-level imports are `e = require("./index.chunk-muI2IV6k.js")` (only `e.p5`, the main-process
// logger, is read) and `t = require("./index.chunk-D89SZXs4.js")` (only `t.n`, the org-policy / HIPAA withhold check,
// and `t.t`, GrowthBook 3444158716 && !t.n(), are read). Those two are the only host bindings: O, k and A are emitted
// verbatim inside bindImagineServer(e, t), whose parameters stand in for the module-level `e` and `t`; the host adapter
// (electron/visualize-adapters.cjs) supplies them. Every other top-level statement stays at module level, in source
// order, byte-for-byte (the generated file is not reformatted, so the 327 KB template literal keeps its exact raw text).
//
// Every top-level statement of the chunk is accounted for: the Sentry release / debug-id preamble, the side-effect
// require of index.chunk-D4B44ehk.js, the `const e=…,t=…` imports and the trailing `exports.getImagineServerDef=A` are
// asserted by shape and dropped; everything else must be a listed binding (or one of the two dead `c(680);` /
// `l(680);` calls the minifier left, kept verbatim). A binding declared more than once, reassigned (O aside, which is
// host-bound), missing a feature string, or an unlisted top-level statement fails generation, so a version bump that
// re-points a minified name fails here instead of silently binding the wrong value. The assembled module must be closed
// (Babel scope: only Math, Set, Error and module are free) and `e` / `t` may only be read as `e.p5` / `t.n`, `t.t`.
//
// D0: own generator, own output (electron/generated/visualize/imagine-server.cjs and manifest.json), own
// scripts/verify-gen-visualize.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = '2.42304.0';
const referenceSnapshot = 'installed-2.42304.0-20261017';
const mainSource = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const output = path.join(root, 'electron/generated/visualize');
const target = 'imagine-server.cjs', targetManifest = 'manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const file = 'index.chunk-BaLvO2wi.js';
const gateFile = 'index.chunk-D89SZXs4.js';
const callerFile = 'index.chunk-B5tintml.js';

// Module-level (pure) bindings, in source order, with their semantic export names.
const pure = [
  { name: 'n', kind: 'var', as: 'CDS_VANILLA_TOKENS_GUIDE', features: ['# CDS tokens \\u2014 vanilla', '`--text-primary`'] },
  { name: 'r', kind: 'function', as: 'widthForPlatform', features: ['function r(e){return e==="mobile"?380:680}'] },
  { name: 'i', kind: 'var', as: 'READ_ME_PREAMBLE', features: ['# Imagine \\u2014 Visual Creation Suite', 'Call read_me again with the modules parameter'] },
  { name: 'a', kind: 'function', as: 'uiComponentsGuide', features: ['return`## UI components\\n\\n### Layout width\\nThe widget container is ${e}px wide.'] },
  { name: 'o', kind: 'var', as: 'ELICITATION_GUIDE', features: ['o=`## Elicitation \\u2014 collecting skill arguments'] },
  { name: 's', kind: 'var', as: 'COLOR_PALETTE_GUIDE', features: ['s=`## Color palette\\n\\n9 color ramps'] },
  { name: 'c', kind: 'function', as: 'svgSetupGuide', features: ['let t=e-40,n=Math.round(e*.7)', 'return`## SVG setup'] },
  { name: 'l', kind: 'function', as: 'diagramTypesGuide', features: ['return`## Diagram types'] },
  { name: 'u', kind: 'var', as: 'CHARTS_GUIDE', features: ['## Charts (Chart.js)'] },
  { name: 'd', kind: 'var', as: 'DATA_VIZ_GUIDE', features: ['d=`## Data visualization \\u2014 the design layer'] },
  { name: 'f', kind: 'var', as: 'ART_GUIDE', features: ["f='## Art and illustration"] },
  { name: 'p', kind: 'var', as: 'READ_ME_CLOSING', features: ['p="Do not overthink. Try to keep thinking below 500 tokens.'] },
  { name: 'm', kind: 'function', as: 'widgetHtml', template: true,
    features: ['function m(){return`<!DOCTYPE html>', '<title>Visualize Widget</title>', '/libs/imagine/streaming-helpers-1/streaming-helpers.mjs',
      'applyKeepMenuClear', '_keepMenuClear', 'ui/notifications/size-changed'],
    counts: { 'data-keep-menu-clear': 16, 'menu-room': 12, 'frame-held': 8 } },
  { name: 'h', kind: 'var', as: 'READ_ME_MODULES', features: ['h=["diagram","mockup","interactive","data_viz","art","chart","elicitation"]'] },
  { name: 'g', kind: 'var', as: 'READ_ME_PLATFORMS', features: ['g=["mobile","desktop","unknown"]'] },
  { name: '_', kind: 'function', as: 'readMeModuleTable',
    features: ['let t=c(e),r=l(e),i=a(e);return{diagram:[s,t,r],mockup:[i,s,n],interactive:[i,s,n],data_viz:[i,s,u,d],art:[t,f],chart:[i,s,u,d],elicitation:[o]}'] },
  { name: 'v', kind: 'var', as: 'WIDGET_RESOURCE_URI', features: ['v="ui://imagine/show-widget.html"'] },
  { name: 'y', kind: 'var', as: 'MAX_RESULT_SIZE_CHARS', features: ['y=2e5'] },
  { name: 'b', kind: 'var', as: 'IMAGINE_TOOLS',
    features: ['{name:"show_widget",', 'required:["loading_messages","title","widget_code"]},annotations:{readOnlyHint:!0},_meta:{ui:{resourceUri:v}}}',
      '{name:"read_me",', 'enum:[...h]', 'enum:[...g]', '_meta:{"claude.ai/hidden_in_chat":!0,"anthropic/maxResultSizeChars":y}'] },
  { name: 'x', kind: 'var', as: 'IMAGINE_RESOURCES', features: ['x=[{uri:v,name:"visualize widget",', 'mimeType:"text/html;profile=mcp-app"}]'] },
  { name: 'S', kind: 'function', as: 'handleImagineToolCall',
    features: ['if(e==="show_widget")return{content:[{type:"text",text:"Content rendered and shown to the user.',
      'let e=t.modules??[],a=t.platform??"unknown",o=_(n??r(a)),s=new Set,c=[i];', 'return c.push(p),{content:[{type:"text",text:c.join(`\\n\\n`)}]}',
      'text:`Unknown tool: ${e}`}],isError:!0}'] },
  { name: 'C', kind: 'function', as: 'readImagineResource',
    features: ['if(e===v)return{contents:[{uri:v,mimeType:"text/html;profile=mcp-app",text:m(),_meta:{ui:{permissions:{clipboardWrite:{}},csp:{',
      'connectDomains:["https://esm.sh","https://cdnjs.cloudflare.com","https://cdn.jsdelivr.net","https://unpkg.com"]',
      'resourceDomains:["https://esm.sh","https://cdnjs.cloudflare.com","https://cdn.jsdelivr.net","https://unpkg.com","https://fonts.googleapis.com","https://fonts.gstatic.com"]',
      'throw Error(`Unknown resource: ${e}`)'] },
  { name: 'w', kind: 'function', as: 'listImagineResources', features: ['function w(){return x}'] },
  { name: 'T', kind: 'var', as: 'ResourceUnavailable',
    features: ['e.BlockedByPolicy="blocked_by_policy",e.NeedsSignIn="needs_sign_in",e.NotConnected="not_connected",e.ReadFailed="read_failed"'] },
  { name: 'E', kind: 'var', as: 'IMAGINE_SERVER_NAME', features: ['E="visualize"'] },
  { name: 'D', kind: 'var', as: 'POLICY_REFUSAL_TEXT', features: ["D=\"Inline visualizations are disabled by your organization's policy. Retries will fail; answer in text instead.\""] },
];
// Dead top-level calls the minifier kept; emitted verbatim, in place.
const deadCalls = ['c(680);', 'l(680);'];
// Bindings that read the module-level `e` / `t` (or the mutable latch O), emitted inside bindImagineServer(e, t).
const hostBound = [
  { name: 'O', kind: 'var', as: 'refusalLogged', mutable: true, features: ['O=!1'] },
  { name: 'k', kind: 'function', as: 'refuseWhenWithheld', features: ['return t.n()?(O||(O=!0,e.p5.info(`[imagine] ${n} refused \\u2014 withheld by the org\'s Inline visualizations answer`)),!0):!1'] },
  { name: 'A', kind: 'function', as: 'getImagineServerDef',
    features: ['return{serverName:E,tools:b.map((e=>({name:e.name,description:e.description,inputSchema:e.inputSchema,_meta:e._meta,alwaysLoad:!0,maxResultSizeChars:e._meta?.["anthropic/maxResultSizeChars"]})))',
      'handleToolCall:async(e,t)=>k(e)?{content:[{type:"text",text:D}],isError:!0}:S(e,t)',
      'handleReadResource:e=>k("widget resource read")?{contents:[],unavailable:T.BlockedByPolicy}:C(e)',
      'handleListResources:()=>k("widget resource list")?[]:w()', 'isEnabled:()=>t.t()}'] },
];
const hostParams = { e: ['p5'], t: ['n', 't'] };
const allowedGlobals = ['Math', 'Set', 'Error', 'module'];
// The statements of the chunk that are not bindings, by exact text or prefix.
const dropped = [
  { what: 'Sentry release preamble', test: text => text.startsWith('(function(){try{var e=typeof window<"u"?window') && text.includes('e.SENTRY_RELEASE=') },
  { what: 'Sentry debug-id preamble', test: text => text.startsWith('try{(function(){var e=typeof window<"u"?window') && text.includes('_sentryDebugIds') },
  { what: 'side-effect require', test: text => text === 'require("./index.chunk-D4B44ehk.js");' },
  { what: 'imports e, t', test: text => text === `const e=require("./index.chunk-muI2IV6k.js"),t=require("./${gateFile}");` },
  { what: 'export', test: text => text === 'exports.getImagineServerDef=A;' },
];
// Official callers and the gate module that fix how the bindings are used.
const callers = {
  [callerFile]: ['try{let{getImagineServerDef:e}=await Promise.resolve().then((()=>require("./index.chunk-BaLvO2wi.js")));c.push(e())}catch{}'],
  [gateFile]: ['var t="inline_visualizations",n="3444158716",r="2742800629"', 'function l(t){return e.LZ(n)&&!c(t)}',
    'Object.defineProperty(exports,"n",{enumerable:!0,get:function(){return c}}),Object.defineProperty(exports,"t",{enumerable:!0,get:function(){return l}})'],
};

const occurrences = (text, needle) => text.split(needle).length - 1;

function collect(code) {
  const ast = babel.babelParse(code, file, false);
  const slices = new Map();
  const order = [];
  for (const statement of ast.program.body) {
    const text = code.slice(statement.start, statement.end);
    if (statement.type === 'FunctionDeclaration') {
      const name = statement.id.name;
      if (slices.has(name)) throw Error(`${file}: ${name} is declared twice`);
      slices.set(name, { kind: 'function', text, node: statement });
      order.push({ name });
    } else if (statement.type === 'VariableDeclaration' && statement.kind === 'var') {
      for (const declarator of statement.declarations) {
        const name = declarator.id.name;
        if (slices.has(name)) throw Error(`${file}: ${name} is declared twice`);
        slices.set(name, { kind: 'var', text: code.slice(declarator.start, declarator.end), node: declarator });
        order.push({ name });
      }
    } else if (deadCalls.includes(text)) {
      order.push({ dead: text });
    } else {
      const drop = dropped.find(entry => entry.test(text));
      if (!drop) throw Error(`${file}: unexpected top-level statement ${JSON.stringify(text.slice(0, 80))}`);
      if (drop.seen) throw Error(`${file}: ${drop.what} appears twice`);
      drop.seen = true;
    }
  }
  for (const entry of dropped) if (!entry.seen) throw Error(`${file}: missing ${entry.what}`);
  // Reassignments at any depth of each top-level name.
  const violations = {};
  babel.traverse(ast, { Program(p) { for (const name of slices.keys()) violations[name] = p.scope.getBinding(name)?.constantViolations.length ?? 0; } });
  return { slices, order, violations };
}

function check(slices, violations, spec) {
  const found = slices.get(spec.name);
  if (!found) throw Error(`${file}: ${spec.name} is not a top-level binding`);
  if (found.kind !== spec.kind) throw Error(`${file}: ${spec.name} is a ${found.kind}, expected ${spec.kind}`);
  if ((violations[spec.name] > 0) !== Boolean(spec.mutable)) throw Error(`${file}: ${spec.name} is ${spec.mutable ? 'no longer' : ''} reassigned`);
  for (const feature of spec.features) if (!found.text.includes(feature)) throw Error(`${file}: ${spec.name} lacks ${JSON.stringify(feature)}`);
  for (const [needle, count] of Object.entries(spec.counts ?? {}))
    if (occurrences(found.text, needle) !== count) throw Error(`${file}: ${spec.name} has ${occurrences(found.text, needle)} × ${needle}, expected ${count}`);
  if (spec.template) {
    const ret = found.node.body.body;
    if (ret.length !== 1 || ret[0].type !== 'ReturnStatement' || ret[0].argument.type !== 'TemplateLiteral' || ret[0].argument.expressions.length)
      throw Error(`${file}: ${spec.name} no longer returns one expression-free template literal`);
  }
  return found.text;
}

const declaration = (spec, text) => spec.kind === 'function' ? text : `var ${text};`;

function hostReads(ast) {
  const reads = Object.fromEntries(Object.keys(hostParams).map(name => [name, new Set()]));
  let factory = 0;
  babel.traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name !== 'bindImagineServer') return;
      factory++;
      for (const name of Object.keys(hostParams)) {
        const binding = p.scope.getBinding(name);
        if (!binding || binding.kind !== 'param') throw Error(`${target}: ${name} is not bindImagineServer's parameter`);
        if (binding.constantViolations.length) throw Error(`${target}: ${name} is reassigned`);
        for (const ref of binding.referencePaths) {
          const parent = ref.parent;
          if (!/^(Optional)?MemberExpression$/.test(parent.type) || parent.object !== ref.node || parent.computed) throw Error(`${target}: ${name} is used other than as a member read`);
          reads[name].add(parent.property.name);
        }
      }
    },
  });
  if (factory !== 1) throw Error(`${target}: expected one bindImagineServer`);
  return Object.fromEntries(Object.entries(reads).map(([name, set]) => [name, [...set].sort()]));
}

async function extractMain() {
  const bytes = await fs.readFile(path.join(mainSource, file));
  const code = bytes.toString();
  const { slices, order, violations } = collect(code);
  const listed = new Set([...pure, ...hostBound].map(spec => spec.name));
  for (const name of slices.keys()) if (!listed.has(name)) throw Error(`${file}: unlisted top-level binding ${name}`);
  const sliced = {};
  for (const spec of [...pure, ...hostBound]) sliced[spec.name] = check(slices, violations, spec);
  // Source order of the module-level part (bindings and the dead calls); host-bound ones must close the chunk.
  const moduleOrder = order.filter(entry => entry.dead || !hostBound.some(spec => spec.name === entry.name));
  const boundOrder = order.filter(entry => hostBound.some(spec => spec.name === entry.name)).map(entry => entry.name);
  if (JSON.stringify(boundOrder) !== JSON.stringify(hostBound.map(spec => spec.name))) throw Error(`${file}: host-bound order is ${boundOrder.join(', ')}`);
  if (order.findIndex(entry => entry.name === hostBound[0].name) < order.length - hostBound.length) throw Error(`${file}: host-bound bindings no longer close the chunk`);
  const pureOrder = moduleOrder.filter(entry => entry.name).map(entry => entry.name);
  if (JSON.stringify(pureOrder) !== JSON.stringify(pure.map(spec => spec.name))) throw Error(`${file}: module-level order is ${pureOrder.join(', ')}`);
  for (const [name, features] of Object.entries(callers)) {
    const text = await fs.readFile(path.join(mainSource, name), 'utf8');
    for (const feature of features) if (occurrences(text, feature) !== 1) throw Error(`${name}: expected ${JSON.stringify(feature)} once`);
  }
  const byName = Object.fromEntries([...pure, ...hostBound].map(spec => [spec.name, spec]));
  const moduleText = moduleOrder.map(entry => entry.dead ?? declaration(byName[entry.name], sliced[entry.name])).join('\n');
  const boundText = hostBound.map(spec => declaration(spec, sliced[spec.name])).join('\n');
  const header = `// Original Claude Desktop ${referenceVersion} main-process built-in visualize MCP server; generated by scripts/extract-visualize.mjs.\n`
    + `// ${file}, every top-level binding verbatim and in source order (not reformatted). O / k / A read the chunk's module-level\n`
    + `// imports e (index.chunk-muI2IV6k.js, only e.p5: the logger) and t (${gateFile}, only t.n: org policy withholds,\n`
    + `// t.t: GrowthBook 3444158716 && !t.n()); bindImagineServer(e, t) takes them from the host (electron/visualize-adapters.cjs).\n`
    + `// Do not edit by hand: run node scripts/extract-visualize.mjs.\n`;
  const factory = `// e: { p5: logger }; t: { n(): policy withholds inline visualizations, t(): the server is enabled }.\n`
    + `function bindImagineServer(e, t) {\n${boundText}\nreturn { ${hostBound.filter(spec => !spec.mutable).map(spec => `${spec.as}: ${spec.name}`).join(', ')} };\n}\n`;
  const exportText = `module.exports = { ${pure.map(spec => `${spec.as}: ${spec.name}`).join(', ')}, bindImagineServer };\n`;
  const text = `${header}"use strict";\n${moduleText}\n${factory}${exportText}`;
  // The module must be closed: every identifier it reads is declared in it (Math, Set, Error and CommonJS module aside).
  const parsed = babel.babelParse(text, target, false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals).filter(name => !allowedGlobals.includes(name)); } });
  if (globals.length) throw Error(`${target}: unbound ${globals.join(', ')}`);
  const reads = hostReads(parsed);
  for (const [name, members] of Object.entries(reads))
    if (JSON.stringify(members) !== JSON.stringify(hostParams[name])) throw Error(`${target}: ${name} reads ${members.join(', ')}, expected ${hostParams[name].join(', ')}`);
  // Every slice survives byte-for-byte in the output.
  for (const [name, slice] of Object.entries(sliced)) if (!text.includes(slice)) throw Error(`${target}: ${name} is not verbatim`);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-visualize.mjs', output: `electron/generated/visualize/${target}`,
    source: path.relative(root, path.join(mainSource, file)), sourceSha256: sha(bytes),
    bindings: [...pure.map(spec => ({ ...spec, scope: 'module' })), ...hostBound.map(spec => ({ ...spec, scope: 'bindImagineServer' }))]
      .map(({ name, kind, as, scope, features, counts }) => ({ name, kind, as, scope, sha256: sha(sliced[name]), length: sliced[name].length, features, ...(counts ? { counts } : {}) })),
    deadCalls, dropped: dropped.map(entry => entry.what), hostParams, allowedGlobals, callers, sha256: sha(text) };
  return { [target]: text, [targetManifest]: JSON.stringify(manifest, null, 2) + '\n' };
}

export async function extractVisualize({ check = false } = {}) {
  const files = await extractMain();
  if (check) {
    for (const [name, text] of Object.entries(files)) {
      const present = await fs.readFile(path.join(output, name), 'utf8').catch(() => null);
      if (present !== text) throw Error(`visualize main-process mismatch: ${name}. Run scripts/extract-visualize.mjs.`);
    }
    const extra = (await fs.readdir(output)).filter(name => !(name in files));
    if (extra.length) throw Error(`visualize: unexpected files in electron/generated/visualize: ${extra.join(', ')}`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} visualize/${target} (${pure.length + hostBound.length} original ${referenceVersion} main-process bindings).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractVisualize({ check: process.argv.includes('--check') });
