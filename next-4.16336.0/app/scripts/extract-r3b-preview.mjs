// R3b-preview: extract the 3.6556.2 main-process preview dev-server and preview-browser logic the local preview
// service is built on, without executing any desktop runtime (asar/.vite/build/index.chunk-jPKPzV-P.js; the
// 2.42304.0 names from index.chunk-muI2IV6k.js are in brackets — every binding is token-for-token the same code):
//
//   r3b-preview-ports.mjs        preview-01 / preview-03 / preview-14
//     createPreviewPortPolicy(host) — the original top-level declarations verbatim inside one factory:
//       launch.json script port pinning (IXi / NXi / RXi / LXi [i0i / t0i / o0i / a0i] and the script tokenizer MXi,
//       _Xi, pXi, uXi … [e0i, z1i, F1i, M1i …]), the port-argument rewrite after a move (sXi [k1i]), the pending /
//       exact-bind reservations (n3i A3 j3, r3i [j2i t2 n2, M2i]), the next-free-port scan and the port decision with
//       its errors (a3i, s3i, t3i, m4i, M3, Q4i, Z4i, e3i, $4i [P2i, I2i, A2i, U0i, r2, D2i, E2i, k2i, O2i]), the server
//       identity check after readiness ($2i, q2i, J2i, Y2i, X2i, Z2i, Q2i [O0i, S0i, C0i, w0i, T0i, E0i, D0i]) and the
//       occupancy / conflicting-server filters (o3i, N6i, M6i [F2i, q4i, K4i]).
//     The chunk-level values these read and the local app replaces are the factory's parameters (`host`), passed under
//     their 2.42304.0 keys so electron/r3b-preview-host.mjs is unchanged: `n` (node:path), `p` (node:fs/promises),
//     `g` → _ (node:net) — each asserted to be that require in the chunk — and N (logger), ih → Bh (sleep), xi → ji
//     (@ant/claude-native loader), zy → nx (isRealpathWithin), Y0 → a3 (guarded read), J0 → i3 (path guard options),
//     a2 → P3 (the server registry: only `.servers` is read), mM → lP (in-app Browser preview on), $0 → l3
//     (GrowthBook 2711562102, default true).
//   r3b-preview-user-agent.mjs   preview-12
//     eui [ydi] (sites / claudeHosts user agents), tui [bdi] (per-request choice), iii [uai] (Claude hosts) and the host
//     lists they read.
//   r3b-preview-launch-fields.mjs preview-04
//     launchPortFields(e): the three statements of o3.parseConfiguration [X0] that type-check "autoPort" and "port"
//     (verbatim, returning the port they leave in `i`); launchUrlPortMismatch(a, i): its localhost-url port error.
//
// Host-side wiring the local service reproduces (P3.start readiness, p8i, f8i, startFromConfig, ZQ [a2, D3i, E3i, Pfi])
// is anchored: the generator fails when those call sites no longer read the extracted functions the same way. The
// emitted modules are parsed and may read no identifier they don't declare, apart from standard globals.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import fsPromises from 'node:fs/promises';
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
const manifestName = 'r3b-preview-manifest.json';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const STANDARD_GLOBALS = new Set(['Array', 'Date', 'Error', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise', 'Set', 'String', 'URL', 'clearTimeout', 'process', 'setTimeout']);

// Chunk-level requires the factory takes as the same module.
const requires = { n: { module: 'node:path', api: path }, p: { module: 'node:fs/promises', api: fsPromises }, _: { module: 'node:net', api: net } };

const targets = [
  {
    output: 'r3b-preview-ports.mjs',
    factory: 'createPreviewPortPolicy',
    host: {
      n: 'node:path', p: 'node:fs/promises', _: 'node:net',
      N: 'logger (info / warn / error / debug)', Bh: 'sleep(ms, signal?)', ji: '@ant/claude-native loader: { listTcpListeners, getProcessLineage } or null',
      nx: 'isRealpathWithin(path, root, options) → real path | false', a3: 'read a file as text → string | null', i3: 'path guard options passed to nx',
      P3: 'server registry: `.servers` → [{ serverId, name, port, status, cwd, sessionId }]', lP: 'in-app Browser preview enabled', l3: 'GrowthBook 2711562102 (default true)',
    },
    // The factory parameter key the host passes each value under: its 2.42304.0 name (R4: electron/r3b-preview-host.mjs is unchanged).
    hostKeys: { _: 'g', Bh: 'ih', ji: 'xi', nx: 'zy', a3: 'Y0', i3: 'J0', P3: 'a2', lP: 'mM', l3: '$0' },
    // Host values: each must still be a top-level declaration of the chunk, and these source strings must be in it.
    hostAnchors: { l3: ['getFeatureValue', '"2711562102",!0)!==!1'], ji: ['require("@ant/claude-native")'], Bh: ['setTimeout'], nx: ['realpath'], a3: ['iXi('], lP: ['cP()&&sP()'] },
    bindings: [
      // launch.json script port pinning and the port-argument rewrite
      'sXi', 'cXi', 'lXi', 'uXi', 's3', 'dXi', 'fXi', 'pXi', 'mXi', 'hXi', 'gXi', '_Xi', 'vXi', 'yXi', 'bXi', 'xXi', 'SXi', 'CXi', 'wXi', 'TXi', 'EXi', 'DXi',
      'OXi', 'kXi', 'AXi', 'jXi', 'MXi', 'NXi', 'PXi', 'c3', 'FXi', 'IXi', 'LXi', 'RXi',
      // the identity check
      'z2i', 'B2i', 'V2i', 'H2i', 'U2i', 'k3', 'W2i', 'G2i', 'K2i', 'q2i', 'J2i', 'Y2i', 'X2i', 'Z2i', 'Q2i', '$2i',
      // binding probes, reservations, the scan and the port decision
      'a4i', 'o4i', 's4i', 'c4i', 'u4i', 'd4i', 'f4i', 'p4i', 'm4i', 'Z4i', 'Q4i', '$4i', 'e3i', 't3i', 'n3i', 'A3', 'j3', 'r3i', 'i3i', 'a3i', 'o3i', 's3i', 'M3',
      // the user's Run: the servers it stops when the port can't move
      'M6i', 'N6i',
      // names in messages
      'UF',
    ],
    exports: {
      LXi: 'portMayReassign', RXi: 'portRetargetability', NXi: 'pinnedPortsOf', s3i: 'resolvePort', sXi: 'rewritePortArgs', r3i: 'releasePort',
      A3: 'pendingAllocations', j3: 'exactPortBinds', o3i: 'portOccupancy', $2i: 'verifyServerIdentity', N6i: 'conflictingServers', M3: 'PortInUseError',
      i3i: 'scanSpan', UF: 'messageName', k3: 'lsofHint',
    },
    callSites: {
      P3: ['let e=o3i(this.servers,a,t.port,r),i=this.collectSiblingRoots(a,r),o=await $2i(n,t.port,c.pid,e,i);if(u.status!=="starting")return;',
        'pendingAllocation:A3.has(t.port),exactPortBind:j3.has(t.port)};d.set(a,u),r3i(t.port)'],
      p8i: ['let _=await s3i(r.port,r.autoPort,a,d,g,f),v=_.port', 'y.args=sXi(r.args,v,{joinedShortForm:d,command:r.command})',
        'g=await NXi(((await new o3(s).getConfigFile())?.servers??[]).filter((e=>e.name!==r.name)),s)', '..._.movedFrom===void 0?{}:{configuredPort:_.movedFrom}'],
      f8i: ['await RXi(m,d,g)', 'portMayReassign:await LXi(m,g,_)'],
      m5i: ['let t=N6i(P3.servers,i.config,e,n);', 'portMayReassign:await LXi(i.config,o,s)', '(i.config.autoPort===!0||o&&s)'],
    },
  },
  {
    output: 'r3b-preview-user-agent.mjs',
    bindings: ['MM', 'My', 'Ny', 'ZHt', '$Ht', 'qHt', 'JHt', 'YHt', 'NHn', 'PHn', 'FHn', 'vUn', 'rii', 'iii', 'eui', 'tui'],
    exports: { eui: 'previewUserAgents', tui: 'previewRequestUserAgent', iii: 'isClaudeHost' },
    callSites: { ZQ: ['let t=eui(e),n=()=>Pb("3868149774");', 'o.setUserAgent?.(n()?t.claudeHosts:t.sites),o.webRequest.onBeforeSendHeaders(',
      'o=tui(t,r[a],n()||iii(MM(e.url)?.hostname??""))', 'e?.includes(" Electron/")'] },
  },
  { output: 'r3b-preview-launch-fields.mjs', launchFields: true },
];

// The launch.json class (2.42304.0 X0): its parseConfiguration is where launch-fields come from.
const launchClass = 'o3';

async function readChunk() {
  const bytes = await fs.readFile(path.join(source, chunkFile));
  const code = bytes.toString();
  return { bytes, code, ast: parsers.babel.parse(code, {}) };
}

function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id?.name === name) hits.push({ kind: 'function', node, statement: node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator, statement: node });
  }
  if (hits.length !== 1) throw Error(`${chunkFile}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const text = (chunk, node) => chunk.code.slice(node.start, node.end);

function walk(value, visit, parent = null) {
  if (!value || typeof value !== 'object') return;
  visit(value, parent);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => item && typeof item === 'object' && item.type && walk(item, visit, value));
    else if (child && typeof child === 'object' && child.type) walk(child, visit, value);
  }
}

// The module must be closed: anything it reads is declared in it (or a factory parameter), or a standard global.
function assertClosed(textOut, name) {
  const ast = babel.babelParse(textOut, name, true);
  let globals = [];
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); } });
  const unbound = globals.filter((global) => !STANDARD_GLOBALS.has(global));
  if (unbound.length) throw Error(`${name}: unbound ${unbound.join(', ')}`);
  return globals.sort();
}

// How the emitted factory reads each host parameter (scope-aware: a local `n` inside a function is not the host's):
// a namespace only as `host.member`, a function only by calling it, a value only by passing it on.
function hostUses(textOut, name, factory, params) {
  const ast = babel.babelParse(textOut, name, true);
  const uses = Object.fromEntries(params.map((param) => [param, { members: new Set(), calls: 0, values: 0 }]));
  babel.traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id?.name !== factory) return;
      for (const param of params) {
        const binding = p.scope.getBinding(param);
        if (!binding) throw Error(`${name}: ${param} is not a factory parameter`);
        for (const ref of binding.referencePaths) {
          const parent = ref.parent;
          if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.object === ref.node && !parent.computed) uses[param].members.add(parent.property.name);
          else if ((parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && parent.callee === ref.node) uses[param].calls++;
          else if ((parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && parent.arguments.includes(ref.node)) uses[param].values++;
          else throw Error(`${name}: host ${param} is used as ${parent.type}`);
        }
      }
    },
  });
  return Object.fromEntries(Object.entries(uses).map(([param, use]) => [param, { members: [...use.members].sort(), calls: use.calls, values: use.values }]));
}

function assertCallSites(chunk, callSites, target) {
  const anchors = {};
  for (const [name, needles] of Object.entries(callSites ?? {})) {
    const body = text(chunk, topLevel(chunk, name).node);
    for (const needle of needles) if (!body.includes(needle)) throw Error(`${target}: ${name} no longer contains ${JSON.stringify(needle)}`);
    anchors[name] = { sha256: sha(body), needles };
  }
  return anchors;
}

function emitBindings(chunk, spec) {
  const hits = spec.bindings.map((name) => ({ name, ...topLevel(chunk, name) }));
  const seen = new Set();
  for (const { name } of hits) { if (seen.has(name)) throw Error(`${spec.output}: ${name} listed twice`); seen.add(name); }
  // Source order: the chunk evaluates its declarations top-down, so initializers that read earlier ones still do.
  hits.sort((a, b) => a.node.start - b.node.start);
  const blocks = hits.map(({ kind, node }) => (kind === 'function' ? text(chunk, node) : `var ${text(chunk, node)};`));
  return { hits, blocks };
}

function launchFields(chunk) {
  const { node } = topLevel(chunk, launchClass);
  if (node.init?.type !== 'ClassExpression') throw Error(`${chunkFile}: ${launchClass} is no longer the launch.json class`);
  const method = node.init.body.body.find((member) => member.type === 'ClassMethod' && member.key?.name === 'parseConfiguration');
  if (!method || method.params.length !== 1 || method.params[0].name !== 'e') throw Error(`${chunkFile}: ${launchClass}.parseConfiguration(e) not found`);
  const statements = method.body.body;
  const at = statements.findIndex((statement) => statement.type === 'IfStatement' && text(chunk, statement.test).includes('e.autoPort!==void 0&&typeof e.autoPort!="boolean"'));
  if (at < 0) throw Error(`${chunkFile}: parseConfiguration no longer type-checks "autoPort"`);
  const [autoPortCheck, portDeclaration, portCheck] = statements.slice(at, at + 3);
  const throws = (statement, prefix) => statement?.type === 'IfStatement' && statement.consequent.type === 'ThrowStatement' && text(chunk, statement.consequent).includes(prefix);
  if (!throws(autoPortCheck, '`"autoPort" must be the JSON boolean true or false (unquoted), not ${JSON.stringify(e.autoPort)}`'))
    throw Error(`${chunkFile}: the "autoPort" check no longer throws its message`);
  if (portDeclaration?.type !== 'VariableDeclaration' || portDeclaration.declarations.map((d) => d.id.name).join() !== 'r,i' || !text(chunk, portDeclaration).startsWith('let r=e.port||void 0,'))
    throw Error(`${chunkFile}: the "port" declaration is no longer \`let r = e.port || void 0, i = …\``);
  if (!throws(portCheck, '`"port" must be a JSON number from 1 to 65535, not ${JSON.stringify(e.port)}`') || !text(chunk, portCheck.test).startsWith('i!==void 0'))
    throw Error(`${chunkFile}: the "port" check no longer throws its message`);
  // The localhost-url port mismatch: `a` the parsed url (`let a = e.url === void 0 ? null : …`), `i` the port.
  const urlDeclaration = statements.find((statement) => statement.type === 'VariableDeclaration' && statement.declarations.length === 1 && statement.declarations[0].id.name === 'a');
  if (!urlDeclaration || !text(chunk, urlDeclaration.declarations[0].init).startsWith('e.url===void 0?null:')) throw Error(`${chunkFile}: parseConfiguration's \`a\` is no longer the parsed url`);
  let mismatch = null;
  walk(method.body, (value) => {
    if (value.type !== 'ThrowStatement' || value.argument?.type !== 'CallExpression' || value.argument.callee?.name !== 'Error') return;
    const literal = value.argument.arguments[0];
    if (literal?.type === 'TemplateLiteral' && literal.quasis[0].value.cooked.startsWith('"url" is ') && text(chunk, literal).includes("but this entry's server runs on port")) {
      if (mismatch) throw Error(`${chunkFile}: two localhost-url port mismatch errors`);
      mismatch = literal;
    }
  });
  if (!mismatch) throw Error(`${chunkFile}: the localhost-url port mismatch error is gone`);
  const blocks = [
    `// ${launchClass}.parseConfiguration(e): its "autoPort" / "port" statements, verbatim; the port they leave in \`i\` is returned.\nfunction launchPortFields(e) {\n${[autoPortCheck, portDeclaration, portCheck].map((statement) => text(chunk, statement)).join('\n')}\nreturn i;\n}`,
    `// ${launchClass}.parseConfiguration(e): the localhost "url" port mismatch (\`a\` the parsed url, \`i\` the entry's port).\nfunction launchUrlPortMismatch(a, i) {\nreturn ${text(chunk, mismatch)};\n}`,
  ];
  return { blocks, sourceStatements: [autoPortCheck, portDeclaration, portCheck, mismatch].map((statement) => sha(text(chunk, statement))), exports: 'export { launchPortFields, launchUrlPortMismatch };' };
}

export async function extractR3bPreview({ check = false } = {}) {
  const chunk = await readChunk();
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-r3b-preview.mjs', source: path.relative(root, path.join(source, chunkFile)), sourceSha256: sha(chunk.bytes), targets: {} };
  const files = new Map();
  for (const spec of targets) {
    let body, entry;
    if (spec.launchFields) {
      const fields = launchFields(chunk);
      body = `${fields.blocks.join('\n')}\n${fields.exports}\n`;
      entry = { from: `${launchClass}.parseConfiguration`, statementSha256: fields.sourceStatements, exports: ['launchPortFields', 'launchUrlPortMismatch'] };
    } else {
      const { hits, blocks } = emitBindings(chunk, spec);
      for (const local of Object.keys(spec.exports)) if (!spec.bindings.includes(local)) throw Error(`${spec.output}: export ${local} is not emitted`);
      const hostEntries = {};
      for (const [name, role] of Object.entries(spec.host ?? {})) {
        const hit = topLevel(chunk, name);
        const declared = text(chunk, hit.node);
        if (requires[name]) {
          if (hit.kind !== 'declarator' || hit.node.init?.type !== 'CallExpression' || hit.node.init.callee?.name !== 'require' || hit.node.init.arguments[0]?.value !== requires[name].module)
            throw Error(`${spec.output}: ${name} is no longer require(${JSON.stringify(requires[name].module)})`);
        }
        for (const needle of spec.hostAnchors?.[name] ?? []) if (!declared.includes(needle)) throw Error(`${spec.output}: host ${name} no longer contains ${JSON.stringify(needle)}`);
        hostEntries[name] = { ...(spec.hostKeys?.[name] ? { key: spec.hostKeys[name] } : {}), role, sourceSha256: sha(declared) };
      }
      const exportList = Object.entries(spec.exports).map(([local, name]) => `${name}: ${local}`);
      body = spec.factory
        ? `export function ${spec.factory}({ ${Object.keys(spec.host).map((name) => (spec.hostKeys?.[name] ? `${spec.hostKeys[name]}: ${name}` : name)).join(', ')} }) {\n${blocks.join('\n')}\nreturn { ${exportList.join(', ')} };\n}\n`
        : `${blocks.join('\n')}\nexport { ${Object.entries(spec.exports).map(([local, name]) => `${local} as ${name}`).join(', ')} };\n`;
      entry = { ...(spec.factory ? { factory: spec.factory, host: hostEntries } : {}), bindings: Object.fromEntries(hits.map((hit) => [hit.name, { sha256: sha(text(chunk, hit.node)), ...(spec.exports[hit.name] ? { exportedAs: spec.exports[hit.name] } : {}) }])) };
    }
    const out = await format(`// Original Claude Desktop ${referenceVersion} main-process code (${chunkFile}); generated by scripts/extract-r3b-preview.mjs — do not edit.\n${body}`, { parser: 'babel' });
    entry.globals = assertClosed(out, spec.output);
    if (spec.factory) {
      const uses = hostUses(out, spec.output, spec.factory, Object.keys(spec.host));
      for (const [param, use] of Object.entries(uses)) {
        if (!use.members.length && !use.calls && !use.values) throw Error(`${spec.output}: host ${param} is never read`);
        if (requires[param]) for (const member of use.members) if (!(member in requires[param].api)) throw Error(`${spec.output}: ${param}.${member} is not part of ${requires[param].module}`);
        Object.assign(entry.host[param], use);
      }
    }
    entry.callSites = assertCallSites(chunk, spec.callSites, spec.output);
    entry.sha256 = sha(out);
    manifest.targets[spec.output] = entry;
    files.set(spec.output, out);
  }
  files.set(manifestName, JSON.stringify(manifest, null, 2) + '\n');
  if (check) {
    for (const [name, content] of files) {
      let current = null;
      try { current = await fs.readFile(path.join(output, name), 'utf8'); } catch { /* missing */ }
      if (current !== content) throw Error(`r3b-preview generated file mismatch: electron/generated/${name}`);
    }
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const [name, content] of files) await fs.writeFile(path.join(output, name), content);
  }
  return [...files.keys()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const written = await extractR3bPreview({ check });
  console.log(`${check ? 'checked' : 'wrote'} ${written.map((name) => `electron/generated/${name}`).join(', ')}`);
}
