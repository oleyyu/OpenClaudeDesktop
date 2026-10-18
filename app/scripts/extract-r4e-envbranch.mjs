// R4e-envbranch (home-15): extract the 2.42304.0 originals behind "a draft's start branch that doesn't exist is cleared
// with a warning", without executing any desktop runtime.
//
//   renderer  cc43287c9 qZ (async (cwd, branch, refetchLocalBranches) → is the branch missing: not origin/…, not a sha,
//             a non-empty local list without it, and LocalSessions.isBranchOnOrigin(cwd, branch) === false), and the
//             cc0051c10 FA.branchMissing message descriptor (94ae6MV2dl) Te warns with.
//             qZ's only free name, J (shared-0 Om = globalThis["claude.web"]?.LocalSessions), is a named host adapter
//             in src/source-r4e-envbranch-adapters.mjs.
//             The call sites the host reproduces by hand (Te / G inside the JZ hook, me in the environment apply hook,
//             yC's refetch of the local branch list) are anchored: generation fails when their text changes.
//   main      index.chunk-CxZMGoHL.js GitStatusService.isBranchOnOrigin / pushLeavesOriginRef (verbatim class methods),
//             with the chunk namespaces they read rebuilt from originals: a.n = BhBOA_v0 j (isPlausibleBranchName),
//             n.r = BQi7slPm r (a failed git run's exit code), t.FO / t.IO = muI2IV6k zur / Bur (remote.origin.fetch
//             refspec parsing and matching, with the refname checks Hur / Vur they read). r.v (the git runner, BDxF0-vT
//             an) and `this.git.runGit` / `requireTrustedCwd` / `isKnownNonGitDir` are the factory's host parameters.
//
// D0: own generator, own output (src/generated/r4e-envbranch/, electron/generated/r4e-envbranch-origin.cjs and its
// manifest), own scripts/verify-gen-r4e-envbranch.mjs. Output is prettier-formatted; each emitted module is parsed and
// may read no identifier it does not declare, apart from standard globals and the mapped imports.
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
const source = path.resolve(root, '../reference', referenceSnapshot, 'ion-dist/assets/v1');
const mainSource = path.resolve(root, '../reference', referenceSnapshot, 'asar/.vite/build');
const output = path.join(root, 'src/generated/r4e-envbranch');
const rendererTarget = 'start-branch-missing.mjs';
const electronOutput = path.join(root, 'electron/generated');
const electronTarget = 'r4e-envbranch-origin.cjs', electronManifest = 'r4e-envbranch-origin-manifest.json';
const adapterModule = '../../source-r4e-envbranch-adapters.mjs';
const generator = 'scripts/extract-r4e-envbranch.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const STANDARD_GLOBALS = new Set(['Array', 'Error', 'JSON', 'Map', 'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String', 'undefined']);

const renderer = {
  file: 'cc43287c9-DAfOi8yP.js',
  binding: 'qZ', exportedAs: 'startBranchMissing',
  features: ['if(!J?.isBranchOnOrigin||t.startsWith("origin/")||/^[0-9a-f]{40}$/.test(t))return!1',
    'try{let r=await n();return r.length>0&&!r.includes(t)&&await J.isBranchOnOrigin(e,t)===!1}catch{return!1}'],
  // Free names of qZ -> { import alias in the chunk, its source chunk, the adapter export, a feature of the original }.
  adapters: { J: { from: './shared-0-ByI5P0CP.js', imported: 'Om', name: 'LocalSessions', declaration: 'globalThis["claude.web"]?.LocalSessions' } },
  // Te (the start-branch check after trust), G (handleSelectSourceBranch) and yC's list — inside JZ.
  callSites: {
    JZ: [
      'let Te=A(async(e,t)=>{let n={target:t};_e(n);let r=!0;try{J?.checkBranchSwitchConflict?r=await J.checkBranchSwitchConflict(e,t):J?.isWorkingTreeDirty&&(r=await J.isWorkingTreeDirty(e))}catch{}let i=r&&await qZ(e,t,B);',
      'if(ye(n),ue.current===e&&we.current===t){if(i){M(void 0),pe(void 0);let e=de.current,{environments:n,selectedEnvironmentId:r}=$P.getState();f(u.formatMessage(FA.branchMissing,{branch:t,known:e?"yes":"no",fallback:e,saved:n.some(e=>e.id===r&&e.settings?.branch===t)?"yes":"no"}),{uniqueKey:`branch-missing:${t}`})}else r?pe(t):M(t)}',
      'G=A(e=>{if(we.current=e,!k&&!l&&!ie&&!p&&e!==void 0&&e!==L&&ee!==!1){',
      'r.trusted?await Te(t,e)',
      '_e(void 0),M(e)},[',
      '{addError:d,addWarning:f}=Ao()',
      '{branches:R,isAvailable:z,refetch:B}=yC(h,m)',
      'ue=_(n),de=_(L);P(()=>{ue.current=n,de.current=L},[n,L])',
      'handleSelectSourceBranch:G,',
    ],
  },
  // me (the environment apply's branch stage) is a closure of a larger top-level hook: located by its unique text.
  textSites: {
    me: 'me=(t,n,r)=>{let i=n.kind==="ssh"||n.kind==="local"&&!!n.wslDistro,a=t.worktree??e.settings.worktree.preference,o=n.kind==="local"&&!!n.variant,s=i&&!a||o?void 0:t.branch;!s&&e.branch&&!r?e.onSelectBranch(void 0):s&&e.branch!==s&&e.onSelectBranch(s)}',
    onSelectBranch: 'onSelectBranch:q.setSourceBranch,',
    setSourceBranch: 'setSourceBranch:Cn,',
    stableHandler: 'Cn=Lt(Yt);',
  },
  // Imports the call sites read, pinned to their chunks (FA: the message table; yC: the local-branch query hook).
  imports: { FA: { from: './cc0051c10-pi8fKHOz.js', imported: 't' }, yC: { from: './cc233fde2-PIn4Ni4H.js', imported: 't' } },
  // yC's refetch (B) is a fresh getLocalBranches(cwd) that answers [] on error.
  listHook: { file: 'cc233fde2-PIn4Ni4H.js', features: ['return t?.getLocalBranches?t.getLocalBranches(u):[]', 'g=e(async()=>{if(!u||!l)return i;let e=await h();return e.isError?i:e.data??i},[u,l,h])', 'queryKey:["localGitBranches",u,c??null]'] },
};
const message = {
  file: 'cc0051c10-pi8fKHOz.js', exported: 't', property: 'branchMissing', id: '94ae6MV2dl', exportedAs: 'branchMissingMessage',
  // te = a({...}) where a is vendor-intl f (defineMessages, the identity `function tn(e){return e}`).
  defineMessages: { from: './vendor-intl-Db7hDWRO.js', imported: 'f', file: 'vendor-intl-Db7hDWRO.js', declaration: 'function tn(e){return e}' },
  features: ['Branch {branch} wasn\u2019t found in this folder\u2019s repository. This session will start from {fallback}.',
    'Branch {branch} wasn\u2019t found in this folder\u2019s repository, so it won\u2019t be used.', '{saved, select, yes { To pick another branch, edit the environment.} other {}}'],
};

const main = {
  service: {
    file: 'index.chunk-CxZMGoHL.js', classBinding: 'j', exported: 't', methods: ['isBranchOnOrigin', 'pushLeavesOriginRef'],
    features: {
      isBranchOnOrigin: ['if(await this.requireTrustedCwd(e)||this.isKnownNonGitDir(e)||!a.n(t))return null',
        'return await this.git.runGit(["rev-parse","--verify","--quiet",`refs/remotes/origin/${t}^{commit}`],e,5e3),!0',
        'catch(e){if(n.r(e)!==1)return null}', 'return!await this.pushLeavesOriginRef(e,t)&&null'],
      pushLeavesOriginRef: ['await r.v("configRead",["--no-pager","config","--no-includes","--get-all","remote.origin.fetch"],e,5e3)',
        'if(i.length===0)return!1;let a=t.FO(i,"origin");return a.kind==="all"||a.kind==="patterns"&&t.IO(n,a)'],
    },
    // Chunk-level requires the methods read, and the members they may read of each.
    namespaces: {
      a: { require: './index.chunk-BhBOA_v0.js', members: ['n'] },
      n: { require: './index.chunk-BQi7slPm.js', members: ['r'] },
      r: { require: './index.chunk-BDxF0-vT.js', members: ['v'] },
      t: { require: './index.chunk-muI2IV6k.js', members: ['FO', 'IO'] },
    },
    thisMembers: ['git', 'isKnownNonGitDir', 'pushLeavesOriginRef', 'requireTrustedCwd'],
  },
  // Original top-level functions that rebuild a.n, n.r and t.FO / t.IO; `closure` is every declaration emitted with the
  // export (each found by its unique `function <name>(` text).
  functions: [
    { file: 'index.chunk-BhBOA_v0.js', exported: 'n', binding: 'j', closure: ['j'], as: 'isPlausibleBranchName',
      features: ['e.length>0&&e.length<=244&&/^[A-Za-z0-9][A-Za-z0-9._/+@-]*$/.test(e)', '!e.endsWith(".lock")'] },
    { file: 'index.chunk-BQi7slPm.js', exported: 'r', binding: 'r', closure: ['r'], as: 'gitExitCode',
      features: ['if(t?.remoteExitSynthesized===!0)return;let n=t?.result?.code??t?.remoteExitCode;return typeof n=="number"&&n>=0?n:void 0'] },
    { file: 'index.chunk-muI2IV6k.js', exported: 'FO', binding: 'zur', closure: ['zur', 'Vur', 'Hur'], as: 'parseFetchRefspecs',
      features: ['if(l===`refs/heads/*:${n}/*`){i=!0;continue}', 'return a?{kind:"refused"}:i?{kind:"all",prune:!s}:'] },
    { file: 'index.chunk-muI2IV6k.js', exported: 'IO', binding: 'Bur', closure: ['Bur'], as: 'refspecsCoverBranch',
      features: ['let n=e.startsWith("refs/heads/")?e.slice(11):e;return t.patterns.some('] },
  ],
  // r.v: the official git runner (an(intent, args, cwd, timeoutMs) → stdout); answered by the host.
  host: { file: 'index.chunk-BDxF0-vT.js', exported: 'v', features: ['let{stdout:o}=await M(await Z(e,n,', 'return o}'] },
  // The desktop surface the renderer's J.isBranchOnOrigin reaches, and its IPC schema (cwd, branch) → boolean | null.
  callers: [
    { file: 'index.chunk-DLn6Mdsc.js', needle: 'async isBranchOnOrigin(e,t){return l.gitStatus.isBranchOnOrigin(e,t)}' },
    { file: 'index.chunk-muI2IV6k.js', needle: '["isBranchOnOrigin",[["cwd",F],["branch",F]],R(I)]' },
  ],
};

const exportTable = text => {
  const start = text.lastIndexOf('export{');
  if (start < 0) return new Map();
  const body = text.slice(start + 7, text.indexOf('}', start));
  return new Map(body.split(',').filter(Boolean).map(entry => {
    const [local, exported = local] = entry.split(' as ');
    return [exported.trim(), local.trim()];
  }));
};
// CommonJS chunks: Object.defineProperty(exports,"<name>",{enumerable:!0,get:function(){return <local>}}).
const cjsExport = (code, name, file) => {
  const found = [...code.matchAll(new RegExp(`Object\\.defineProperty\\(exports,"${name.replace(/\$/g, '\\$')}",\\{enumerable:!0,get:function\\(\\)\\{return ([\\w$]+)\\}\\}\\)`, 'g'))];
  if (found.length !== 1) throw Error(`${file}: expected one export ${name}, found ${found.length}`);
  return found[0][1];
};

async function readChunk(dir, name, cache, { parse = true } = {}) {
  const key = `${dir}\0${name}`;
  const cached = cache.get(key);
  if (cached && (!parse || cached.ast)) return cached;
  const bytes = cached?.bytes ?? await fs.readFile(path.join(dir, name));
  const code = bytes.toString();
  const record = { name, bytes, code, ast: parse ? parsers.babel.parse(code, {}) : null };
  cache.set(key, record);
  return record;
}
const text = (chunk, node) => chunk.code.slice(node.start, node.end);
function topLevel(chunk, name) {
  const hits = [];
  for (const node of chunk.ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === name) hits.push({ kind: 'function', node });
    for (const declarator of node.declarations ?? []) if (declarator.id?.name === name) hits.push({ kind: 'declarator', node: declarator });
  }
  if (hits.length !== 1) throw Error(`${chunk.name}: expected one top-level ${name}, found ${hits.length}`);
  return hits[0];
}
const needAll = (body, needles, label) => { for (const needle of needles) if (!body.includes(needle)) throw Error(`${label} lacks ${JSON.stringify(needle)}`); };
// `import { imported as local } from "from"` in an ES chunk.
function importOf(chunk, local) {
  for (const node of chunk.ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    for (const specifier of node.specifiers) if (specifier.local.name === local) return { from: node.source.value, imported: specifier.imported?.name ?? 'default' };
  }
  return null;
}
// Free identifiers of a standalone module text (babel scope globals).
function freeNames(code, file) {
  const parsed = babel.babelParse(code, file, false);
  let globals;
  babel.traverse(parsed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  return globals;
}
// Free names of a standalone text and the members read of each (`name.member`; any other use of a free name throws).
// Scope-aware: a parameter or local that shadows a namespace (pushLeavesOriginRef's `n`, its `let a`) is not it.
function freeMemberReads(code, file) {
  const parsed = babel.babelParse(code, file, false), reads = {};
  babel.traverse(parsed, { ReferencedIdentifier(p) {
    const name = p.node.name;
    if (p.scope.hasBinding(name) || STANDARD_GLOBALS.has(name)) return;
    const parent = p.parent;
    if (parent?.type !== 'MemberExpression' || parent.object !== p.node || parent.computed) throw Error(`${file}: ${name} is used other than as a member read`);
    (reads[name] ??= new Set()).add(parent.property.name);
  } });
  return Object.fromEntries(Object.entries(reads).map(([name, members]) => [name, [...members].sort()]));
}
// `this.<member>` reads inside a method.
function thisReads(node) {
  const reads = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'MemberExpression' && value.object?.type === 'ThisExpression') {
      if (value.computed) throw Error('computed this member');
      reads.add(value.property.name);
    }
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object' && child.type) visit(child);
  };
  visit(node);
  return [...reads].sort();
}

// The 7 MB main chunk is not parsed whole: each wanted top-level function is located by its unique `function <name>(`
// text and cut at the first closing brace where the slice parses as exactly that one declaration. A name declared more
// than once, or ever reassigned, fails generation.
function sliceFunction(code, name, file) {
  const marker = `function ${name}(`;
  const at = code.indexOf(marker);
  if (at < 0 || code.indexOf(marker, at + 1) >= 0) throw Error(`${file}: expected one ${marker}`);
  if (new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*=(?!=)`).test(code)) throw Error(`${file}: ${name} is reassigned`);
  const start = code.startsWith('async ', at - 6) ? at - 6 : at;
  if (!/[;}{)]$|^$/.test(code.slice(Math.max(0, start - 1), start))) throw Error(`${file}: ${name} is not a statement-level declaration`);
  for (let end = code.indexOf('}', at); end >= 0; end = code.indexOf('}', end + 1)) {
    const slice = code.slice(start, end + 1);
    let ast;
    try { ast = parsers.babel.parse(slice, {}); } catch { continue; }
    const [node, ...rest] = ast.program.body;
    if (rest.length || node?.type !== 'FunctionDeclaration' || node.id?.name !== name) throw Error(`${file}: ${name} does not slice as one declaration`);
    return slice;
  }
  throw Error(`${file}: ${name} never closes`);
}

async function extractRenderer(cache) {
  const chunk = await readChunk(source, renderer.file, cache);
  const qZ = topLevel(chunk, renderer.binding);
  if (qZ.kind !== 'function' || !qZ.node.async || qZ.node.params.map(param => param.name).join() !== 'e,t,n') throw Error(`${renderer.file}: ${renderer.binding} is no longer async (e, t, n)`);
  const qZText = text(chunk, qZ.node);
  needAll(qZText, renderer.features, `${renderer.file}:${renderer.binding}`);
  const free = freeNames(qZText, renderer.binding).filter(name => !STANDARD_GLOBALS.has(name));
  const imports = [];
  for (const name of free) {
    const adapter = renderer.adapters[name];
    if (!adapter) throw Error(`${renderer.file}: ${renderer.binding} reads unmapped ${name}`);
    const found = importOf(chunk, name);
    if (found?.from !== adapter.from || found.imported !== adapter.imported) throw Error(`${renderer.file}: ${name} is no longer ${adapter.from}:${adapter.imported} (${JSON.stringify(found)})`);
    const dep = await readChunk(source, adapter.from.replace(/^\.\//, ''), cache, { parse: false });
    const local = exportTable(dep.code).get(adapter.imported);
    if (!local || !new RegExp(`[,;\\s]${local.replace(/\$/g, '\\$')}=${adapter.declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,;]`).test(dep.code))
      throw Error(`${adapter.from}:${adapter.imported} (${local}) is no longer ${adapter.declaration}`);
    imports.push({ local: name, name: adapter.name, from: adapterModule, via: `${adapter.from}:${adapter.imported} (${local})` });
  }
  for (const name of Object.keys(renderer.adapters)) if (!free.includes(name)) throw Error(`${renderer.file}: ${renderer.binding} no longer reads ${name}`);
  for (const [local, expected] of Object.entries(renderer.imports)) {
    const found = importOf(chunk, local);
    if (found?.from !== expected.from || found.imported !== expected.imported) throw Error(`${renderer.file}: ${local} is no longer ${expected.from}:${expected.imported}`);
  }
  const callSites = {};
  for (const [name, needles] of Object.entries(renderer.callSites)) {
    const body = text(chunk, topLevel(chunk, name).node);
    needAll(body, needles, `${renderer.file}:${name}`);
    callSites[name] = { sha256: sha(body), needles };
  }
  for (const [label, needle] of Object.entries(renderer.textSites)) {
    const at = chunk.code.indexOf(needle);
    if (at < 0 || chunk.code.indexOf(needle, at + 1) >= 0) throw Error(`${renderer.file}: expected one ${label} site ${JSON.stringify(needle)}`);
    const owner = chunk.ast.program.body.find(node => node.start <= at && at < node.end);
    const name = owner?.type === 'FunctionDeclaration' ? owner.id.name : owner?.declarations?.find(d => d.start <= at && at < d.end)?.id?.name;
    callSites[label] = { in: name ?? null, needle };
  }
  const list = await readChunk(source, renderer.listHook.file, cache, { parse: false });
  needAll(list.code, renderer.listHook.features, renderer.listHook.file);

  // FA.branchMissing: one property of cc0051c10's te = defineMessages({...}).
  const messages = await readChunk(source, message.file, cache);
  const table = exportTable(messages.code).get(message.exported);
  const declarator = topLevel(messages, table);
  const init = declarator.node.init;
  if (declarator.kind !== 'declarator' || init?.type !== 'CallExpression' || init.callee.type !== 'Identifier' || init.arguments.length !== 1 || init.arguments[0].type !== 'ObjectExpression')
    throw Error(`${message.file}: ${table} is no longer defineMessages({...})`);
  const define = importOf(messages, init.callee.name);
  if (define?.from !== message.defineMessages.from || define.imported !== message.defineMessages.imported) throw Error(`${message.file}: ${init.callee.name} is no longer vendor-intl defineMessages`);
  const intl = await readChunk(source, message.defineMessages.file, cache, { parse: false });
  const defineLocal = exportTable(intl.code).get(message.defineMessages.imported);
  if (!intl.code.includes(message.defineMessages.declaration) || !message.defineMessages.declaration.startsWith(`function ${defineLocal}(`)) throw Error(`${message.defineMessages.file}: ${message.defineMessages.imported} is no longer the identity`);
  const property = init.arguments[0].properties.filter(p => p.type === 'ObjectProperty' && !p.computed && (p.key.name ?? p.key.value) === message.property);
  if (property.length !== 1 || property[0].value.type !== 'ObjectExpression') throw Error(`${message.file}: expected one ${message.property} descriptor`);
  const fields = Object.fromEntries(property[0].value.properties.map(p => [p.key.name, p.value]));
  if (Object.keys(fields).sort().join() !== 'defaultMessage,id' || fields.id.type !== 'StringLiteral' || fields.id.value !== message.id || fields.defaultMessage.type !== 'StringLiteral')
    throw Error(`${message.file}: ${message.property} is no longer {defaultMessage, id: ${message.id}}`);
  needAll(fields.defaultMessage.value, message.features, `${message.file}:${message.property}`);
  const descriptorText = text(messages, property[0].value);

  const header = `// Original Claude Desktop ${referenceVersion} bindings: ${renderer.file} ${renderer.binding} and ${message.file} FA.${message.property};\n// generated by ${generator}. Edit the extractor or src/source-r4e-envbranch-adapters.mjs, never this file.\n`;
  const importText = imports.map(entry => `import { ${entry.name} as ${entry.local} } from ${JSON.stringify(entry.from)};`).join('\n');
  const body = `${header}${importText}\n${qZText}\n// FA.${message.property} (${message.file} te = defineMessages({...}), id ${message.id}).\nvar ${message.property} = ${descriptorText};\nexport { ${renderer.binding} as ${renderer.exportedAs}, ${message.property} as ${message.exportedAs} };\n`;
  const out = await format(body, { parser: 'babel' });
  const leftover = freeNames(out, rendererTarget).filter(name => !STANDARD_GLOBALS.has(name));
  if (leftover.length) throw Error(`${rendererTarget}: unbound ${leftover.join(', ')}`);
  const manifest = {
    referenceVersion, referenceSnapshot, generator, adapterModule: 'src/source-r4e-envbranch-adapters.mjs',
    modules: [{
      target: rendererTarget, sha256: sha(out),
      sources: { [renderer.file]: sha(chunk.bytes), [message.file]: sha(messages.bytes) },
      bindings: [{ file: renderer.file, name: renderer.binding, sha256: sha(qZText), exportedAs: renderer.exportedAs },
        { file: message.file, name: `${table}.${message.property}`, sha256: sha(descriptorText), exportedAs: message.exportedAs }],
      imports, callSites,
    }],
  };
  return { [rendererTarget]: out, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' };
}

async function extractMain(cache) {
  const spec = main.service;
  const chunk = await readChunk(mainSource, spec.file, cache);
  if (cjsExport(chunk.code, spec.exported, spec.file) !== spec.classBinding) throw Error(`${spec.file}: exports.${spec.exported} is no longer ${spec.classBinding}`);
  const service = topLevel(chunk, spec.classBinding);
  if (service.kind !== 'declarator' || service.node.init?.type !== 'ClassExpression') throw Error(`${spec.file}: ${spec.classBinding} is no longer the GitStatusService class`);
  const methods = spec.methods.map(name => {
    const found = service.node.init.body.body.filter(member => member.type === 'ClassMethod' && !member.static && member.kind === 'method' && member.key?.name === name);
    if (found.length !== 1 || !found[0].async) throw Error(`${spec.file}: expected one async ${name}`);
    const methodText = text(chunk, found[0]);
    needAll(methodText, spec.features[name], `${spec.file}:${name}`);
    for (const member of thisReads(found[0])) if (!spec.thisMembers.includes(member)) throw Error(`${spec.file}: ${name} reads unmapped this.${member}`);
    return { name, node: found[0], text: methodText };
  });
  // Chunk prelude: `const <ns>=require("<file>")` once each; the methods' free names are exactly these namespaces, read
  // only for the mapped members.
  for (const [namespace, wanted] of Object.entries(spec.namespaces)) {
    const hit = topLevel(chunk, namespace);
    if (hit.kind !== 'declarator' || hit.node.init?.type !== 'CallExpression' || hit.node.init.callee.name !== 'require' || hit.node.init.arguments[0]?.value !== wanted.require)
      throw Error(`${spec.file}: ${namespace} is no longer require(${JSON.stringify(wanted.require)})`);
  }
  const reads = freeMemberReads(`({${methods.map(m => m.text).join(',')}});`, spec.file);
  if (JSON.stringify(Object.keys(reads).sort()) !== JSON.stringify(Object.keys(spec.namespaces).sort())) throw Error(`${spec.file}: the methods read ${Object.keys(reads).join(',')}`);
  for (const [namespace, members] of Object.entries(reads))
    if (JSON.stringify(members) !== JSON.stringify([...spec.namespaces[namespace].members].sort())) throw Error(`${spec.file}: the methods read ${namespace}.${members.join(',')}`);
  const functionBlocks = [], functionEntries = [];
  for (const fn of main.functions) {
    const dep = await readChunk(mainSource, fn.file, cache, { parse: false });
    if (cjsExport(dep.code, fn.exported, fn.file) !== fn.binding) throw Error(`${fn.file}: exports.${fn.exported} is no longer ${fn.binding}`);
    const slices = fn.closure.map(name => ({ name, text: sliceFunction(dep.code, name, fn.file) }));
    needAll(slices[0].text, fn.features, `${fn.file}:${fn.binding}`);
    const block = `// ${fn.file} ${fn.binding} (exports.${fn.exported})${fn.closure.length > 1 ? ` with ${fn.closure.slice(1).join(', ')}` : ''}.\nconst ${fn.as} = (() => {\n${slices.map(s => s.text).join('\n')}\nreturn ${fn.binding};\n})();`;
    const unbound = freeNames(block, fn.as).filter(name => !STANDARD_GLOBALS.has(name));
    if (unbound.length) throw Error(`${fn.file}: ${fn.binding} reads ${unbound.join(', ')} outside its closure`);
    functionBlocks.push(block);
    functionEntries.push({ file: fn.file, exported: fn.exported, binding: fn.binding, as: fn.as, sourceSha256: sha(dep.bytes), bindings: slices.map(s => ({ name: s.name, sha256: sha(s.text) })) });
  }
  const host = await readChunk(mainSource, main.host.file, cache, { parse: false });
  const runner = cjsExport(host.code, main.host.exported, main.host.file);
  needAll(sliceFunction(host.code, runner, main.host.file), main.host.features, `${main.host.file}:${runner}`);
  const callers = [];
  for (const caller of main.callers) {
    const dep = await readChunk(mainSource, caller.file, cache, { parse: false });
    if (!dep.code.includes(caller.needle)) throw Error(`${caller.file} lacks ${JSON.stringify(caller.needle)}`);
    callers.push({ ...caller, sourceSha256: sha(dep.bytes) });
  }
  const by = Object.fromEntries(main.functions.map(fn => [`${fn.file}:${fn.exported}`, fn.as]));
  const namespaceValues = {
    a: `{ n: ${by['index.chunk-BhBOA_v0.js:n']} }`, n: `{ r: ${by['index.chunk-BQi7slPm.js:r']} }`,
    r: '{ v: host.configRead }', t: `{ FO: ${by['index.chunk-muI2IV6k.js:FO']}, IO: ${by['index.chunk-muI2IV6k.js:IO']} }`,
  };
  const header = `// Original Claude Desktop ${referenceVersion} main-process code; generated by ${generator} — do not edit.\n`
    + `// ${spec.file} GitStatusService (exports.${spec.exported}) isBranchOnOrigin / pushLeavesOriginRef, verbatim, behind the desktop's\n`
    + `// LocalSessions.isBranchOnOrigin(cwd, branch) (index.chunk-DLn6Mdsc.js → gitStatus). host: { git: { runGit(args, cwd, timeoutMs) → stdout,\n`
    + `// rejecting with { result: { code } } }, configRead(intent, args, cwd, timeoutMs) → stdout (BDxF0-vT ${runner}), requireTrustedCwd(cwd)\n`
    + `// → a refusal or null, isKnownNonGitDir(cwd) → boolean }.\n`;
  const factory = `function createBranchOnOrigin(host) {\n`
    + Object.entries(spec.namespaces).map(([namespace, wanted]) => `// ${namespace} = require("${wanted.require}")\nconst ${namespace} = ${namespaceValues[namespace]};`).join('\n')
    + `\nreturn {\nrequireTrustedCwd: host.requireTrustedCwd,\nisKnownNonGitDir: host.isKnownNonGitDir,\ngit: host.git,\n${methods.map(m => m.text).join(',\n')}\n};\n}`;
  const exportsList = ['createBranchOnOrigin', ...main.functions.map(fn => fn.as)];
  const out = await format(`${header}"use strict";\n${functionBlocks.join('\n')}\n${factory}\nmodule.exports = { ${exportsList.join(', ')} };\n`, { parser: 'babel' });
  const unbound = freeNames(out, electronTarget).filter(name => !STANDARD_GLOBALS.has(name) && name !== 'module');
  if (unbound.length) throw Error(`${electronTarget}: unbound ${unbound.join(', ')}`);
  const manifest = {
    referenceVersion, referenceSnapshot, generator, output: electronTarget,
    service: { file: spec.file, sourceSha256: sha(chunk.bytes), class: spec.classBinding, exported: spec.exported,
      methods: methods.map(m => ({ name: m.name, sha256: sha(m.text) })), namespaces: spec.namespaces, thisMembers: spec.thisMembers },
    functions: functionEntries, host: { file: main.host.file, exported: main.host.exported, binding: runner, sourceSha256: sha(host.bytes) },
    callers, exports: exportsList, sha256: sha(out),
  };
  return { [electronTarget]: out, [electronManifest]: JSON.stringify(manifest, null, 2) + '\n' };
}

export async function extractR4eEnvbranch({ check = false } = {}) {
  const cache = new Map();
  const files = await extractRenderer(cache);
  const electronFiles = await extractMain(cache);
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`r4e-envbranch output set changed: ${present.join(',')}. Run ${generator}.`);
    for (const [name, content] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== content) throw Error(`r4e-envbranch source mismatch: ${name}. Run ${generator}.`);
    for (const [name, content] of Object.entries(electronFiles))
      if (await fs.readFile(path.join(electronOutput, name), 'utf8').catch(() => null) !== content) throw Error(`r4e-envbranch main-process mismatch: ${name}. Run ${generator}.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(output, name), content);
    await fs.mkdir(electronOutput, { recursive: true });
    for (const [name, content] of Object.entries(electronFiles)) await fs.writeFile(path.join(electronOutput, name), content);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} r4e-envbranch: ${rendererTarget} (qZ + FA.branchMissing) and ${electronTarget} (${main.service.methods.join(', ')} + ${main.functions.map(fn => fn.binding).join(', ')}).`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractR4eEnvbranch({ check: process.argv.includes('--check') });
