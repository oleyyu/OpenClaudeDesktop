import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as official from '../scripts/official-3.6556.2.mjs';

// Every check reads the official chunks as text only (plan R13); nothing official is executed.
const read = file => fs.readFileSync(path.join(official.ionSource, file), 'utf8');
const vendor = read(official.vendorFrame), shared = read(official.sharedFrame);

test('constants point at the 3.6556.2 snapshot and the 2.42304.0 install', () => {
  assert.equal(official.referenceVersion, '3.6556.2');
  assert.equal(official.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(official.previousVersion, '2.42304.0');
  assert.equal(official.previousSnapshot, 'installed-2.42304.0-20261017');
  assert.equal(JSON.parse(fs.readFileSync(path.join(official.snapshotRoot, 'manifest.json'), 'utf8')).version, '3.6556.2');
  for (const dir of [official.ionSource, official.asarSource, official.i18nSource, official.previousIonSource, official.previousAsarSource, official.previousI18nSource])
    assert.ok(fs.statSync(dir).isDirectory(), dir);
  assert.ok(fs.existsSync(path.join(official.i18nSource, 'en-US.json')));
  assert.ok(fs.existsSync(path.join(official.asarSource, 'index.js')) || fs.readdirSync(official.asarSource).some(name => name.startsWith('index')));
  for (const file of [official.vendorFrame, official.sharedFrame, official.vendorIntl]) assert.ok(fs.existsSync(path.join(official.ionSource, file)), file);
  // The vendor and shared frames are new files in 3.6556.2.
  assert.equal(fs.existsSync(path.join(official.previousIonSource, official.vendorFrame)), false);
  assert.equal(fs.existsSync(path.join(official.previousIonSource, official.sharedFrame)), false);
});

test('React alias table matches the plan and resolves on vendor-frame', () => {
  const plan = { wo: 'useState', Co: 'useRef', xo: 'useMemo', do: 'useCallback', ho: 'useEffect', bo: 'useLayoutEffect', _o: 'useId',
    so: 'memo', io: 'forwardRef', to: 'createContext', fo: 'useContext', To: 'useSyncExternalStore', lo: 'startTransition',
    ao: 'isValidElement', yo: 'useInsertionEffect', go: 'useEffectEvent' };
  for (const [alias, member] of Object.entries(plan)) assert.deepEqual(official.reactAliases[alias], ['react', member], alias);
  assert.deepEqual(official.reactAliases.Ha, ['react/jsx-runtime', 'jsx']);
  assert.deepEqual(official.reactAliases.Ua, ['react/jsx-runtime', 'jsxs']);
  assert.deepEqual(official.reactAliases.Va, ['react/jsx-runtime', 'Fragment']);
  assert.deepEqual(official.reactAliases.Sa, ['react-dom', 'flushSync']);
  assert.deepEqual(official.reactAliases.xa, ['react-dom', 'createPortal']);
  assert.deepEqual(official.reactAliases.Oo, ['react/compiler-runtime', 'c']);
  assert.ok(Object.isFrozen(official.reactAliases) && Object.isFrozen(official.reactAliases.Co));
  const namespaces = new Map();
  for (const [alias, target] of Object.entries(official.reactAliases)) {
    const resolved = official.assertVendorAlias(vendor, alias);
    assert.deepEqual([resolved.module, resolved.member], [...target], alias);
    if (resolved.namespace) namespaces.set(resolved.module, new Set([...(namespaces.get(resolved.module) ?? []), resolved.namespace]));
  }
  // One namespace per module, and the three are distinct.
  assert.deepEqual(Object.fromEntries([...namespaces].map(([module, set]) => [module, [...set]])), { react: ['c'], 'react/jsx-runtime': ['me'], 'react-dom': ['Hn'] });
  // Every vendor-frame alias that is a top-level React/jsx/react-dom member read is in the table.
  const { parseAst } = createRequire(path.resolve(import.meta.dirname, '../package.json'))('rolldown/parseAst');
  const ast = parseAst(vendor), byLocal = new Map();
  for (const node of ast.body) if (node.type === 'ExportNamedDeclaration' && !node.source) for (const s of node.specifiers) byLocal.set(s.local.name, s.exported.name);
  const measured = {};
  for (const node of ast.body) if (node.type === 'VariableDeclaration') for (const d of node.declarations)
    if (d.init?.type === 'MemberExpression' && ['c', 'me', 'Hn'].includes(d.init.object.name) && byLocal.has(d.id.name)) measured[byLocal.get(d.id.name)] = d.init.property.name;
  assert.deepEqual(Object.keys(measured).sort(), Object.keys(official.reactAliases).filter(alias => alias !== 'Oo').sort());
});

test('assertVendorAlias rejects reused and unknown aliases', () => {
  // 2.42304.0 `Co` was useState; on 3.6556.2 it is useRef.
  assert.throws(() => official.assertVendorAlias(vendor, 'Co', ['react', 'useState']), /Co no longer resolves to react:useState/);
  assert.throws(() => official.assertVendorAlias(vendor, 'Va', ['react/jsx-runtime', 'jsx']), /Va no longer resolves/);
  assert.throws(() => official.assertVendorAlias(vendor, '$a', ['react', 'cloneElement']), /\$a no longer resolves/);
  assert.throws(() => official.assertVendorAlias(vendor, 'Ha', ['react', 'jsx']), /Ha no longer resolves to react:jsx/);
  assert.throws(() => official.assertVendorAlias(vendor, 'zzz', ['react', 'useState']), /does not export zzz/);
  assert.throws(() => official.assertVendorAlias(vendor, 'zzz'), /No React alias entry/);
  // The same check accepts the old meaning on the old vendor-frame.
  const previous = fs.readFileSync(path.join(official.previousIonSource, 'vendor-frame-DfPJ1QmD.js'), 'utf8');
  assert.equal(official.assertVendorAlias(previous, 'Co', ['react', 'useState']).member, 'useState');
});

test('Oo is react/compiler-runtime c with the useMemoCache factory', () => {
  assert.deepEqual(official.assertCompilerRuntime(vendor), { alias: 'Oo', local: 'o', factory: 'a', module: 'react/compiler-runtime', member: 'c' });
  assert.match(vendor, /[,;]o=e\(n\(\(\(e,t\)=>\{t\.exports=a\(\)\}\)\)\(\)\)\.c[,;]/);
  assert.equal(official.assertVendorAlias(vendor, 'Oo').factory, 'a');
  assert.throws(() => official.assertCompilerRuntime(vendor, 'Co'), /react\/compiler-runtime shape/);
  assert.throws(() => official.assertVendorAlias(vendor, 'Oo', ['react/compiler-runtime', 'useMemoCache']), /has no useMemoCache/);
  const previous = fs.readFileSync(path.join(official.previousIonSource, 'vendor-frame-DfPJ1QmD.js'), 'utf8');
  assert.throws(() => official.assertCompilerRuntime(previous), /does not export Oo/);
  // The host React (19.3.0) ships the real subpath the generated code imports (E3).
  const require = createRequire(path.resolve(import.meta.dirname, '../package.json'));
  assert.ok(fs.existsSync(require.resolve('react/compiler-runtime')));
});

test('24 compiler helpers carry the E3 names and their shared-frame bodies', () => {
  const e3 = { reactMemoCache: ['J9', 'ip'], memoSentinel: ['J8', 'rp'], memoIsEmpty: ['J0', 'Zf'],
    memoChanged1: ['J1', 'Qf'], memoChanged2: ['J2', '$f'], memoChanged3: ['J3', 'ep'], memoChanged4: ['J4', 'tp'], memoChanged5: ['J5', 'np'],
    memoStore0: ['K0', 'ap'], memoStore1: ['K1', 'op'], memoStore2: ['K2', 'sp'], memoStore3: ['K3', 'cp'], memoStore4: ['K4', 'lp'], memoStore5: ['K5', 'up'],
    memoStoreValueFirst1: ['I1', 'Kf'], memoStoreValueFirst2: ['I2', 'qf'], memoStoreValueFirst3: ['I3', 'Jf'], memoStoreValueFirst4: ['I4', 'Yf'], memoStoreValueFirst5: ['I5', 'Xf'],
    memoStoreDeps1: ['Z1', 'dp'], memoStoreDeps2: ['Z2', 'fp'], memoStoreDeps3: ['Z3', 'pp'], memoStoreDeps4: ['Z4', 'mp'], memoStoreDeps5: ['Z5', 'hp'] };
  assert.equal(Object.keys(official.compilerHelpers).length, 24);
  assert.deepEqual(Object.fromEntries(Object.entries(official.compilerHelpers).map(([alias, { local, name }]) => [name, [local, alias]])), e3);
  const resolved = official.assertCompilerHelpers(shared);
  assert.deepEqual(Object.fromEntries(Object.entries(resolved).map(([name, { local, alias }]) => [name, [local, alias]])), e3);
  // Raw-text spot checks of the declarations the table pins.
  assert.ok(shared.includes('J8=Symbol.for("react.memo_cache_sentinel")'));
  assert.ok(shared.includes('function J0(e,t){return e[t]===J8}'));
  assert.ok(shared.includes(',Oo as B,') || /[{,]Oo as B[,}]/.test(shared));
  assert.match(shared, /[,; ]J9=B[,;]/);
  // There is no 25th helper export.
  const helperExports = [...shared.matchAll(/[{,]([JKIZ]\d) as ([\w$]+)(?=[,}])/g)].map(m => m[2]).sort();
  assert.deepEqual(helperExports, Object.keys(official.compilerHelpers).sort());
  // A helper whose body changes no longer passes.
  assert.throws(() => official.assertCompilerHelpers(shared.replace('function J1(e,t,n){return e[t]!==n}', 'function J1(e,t,n){return e[t]===n}')), /J1 \(memoChanged1\) no longer matches/);
  assert.throws(() => official.assertCompilerHelpers(shared, { vendor: 'vendor-frame-DfPJ1QmD.js' }), /not the vendor-frame-DfPJ1QmD.js Oo import/);
});

test('looseFeature generalizes short identifiers and keeps stable strings', () => {
  const feature = official.looseFeature('let{formatMessage:i,textComponent:a=r}=q()');
  assert.match('let{formatMessage:x,textComponent:y=z}=Ab()', feature);
  assert.match('let{formatMessage:i,textComponent:a=r}=q()', feature);
  assert.doesNotMatch('let{formatMessage:x,textComponents:y=z}=Ab()', feature);
  // Property names after `.`, object keys, strings and long identifiers stay literal.
  assert.match('x.useMemoCache(y)', official.looseFeature('t.useMemoCache(e)'));
  assert.doesNotMatch('x.useMemo(y)', official.looseFeature('t.useMemoCache(e)'));
  assert.doesNotMatch('a.b(c)', official.looseFeature('t.H(e)'));
  assert.match('{"data-cds":"Toolbar",ref:q}', official.looseFeature('{"data-cds":"Toolbar",ref:e}'));
  assert.doesNotMatch('{"data-cds":"Toolbars",ref:q}', official.looseFeature('{"data-cds":"Toolbar",ref:e}'));
  assert.doesNotMatch('{"data-cds":"Toolbar",key:q}', official.looseFeature('{"data-cds":"Toolbar",ref:e}'));
  assert.doesNotMatch('Ze.length<=JWXY', official.looseFeature('Ze.length<=JW'));
  assert.match('Ze.length<=JWX', official.looseFeature('Ze.length<=JW'));
  assert.doesNotMatch('Zeta.length<=JW', official.looseFeature('Ze.length<=JW'));
  // The same short identifier must bind the same name again; different ones may coincide.
  const repeat = official.looseFeature('return e[t]!==n||e[t+1]!==r');
  assert.match('return a[b]!==c||a[b+1]!==d', repeat);
  assert.match('return a[b]!==c||a[b+1]!==c', repeat);
  assert.doesNotMatch('return a[b]!==c||x[b+1]!==d', repeat);
  assert.doesNotMatch('return a[b]!==c||a[b+2]!==d', repeat);
  // Ternary branches are generalized; `keep`, keywords and numbers are literal.
  assert.match('x?y:z', official.looseFeature('a?b:c'));
  assert.doesNotMatch('function K0(e){}', official.looseFeature('function J0(e){}', { keep: ['J0'] }));
  assert.match('function K0(e){}', official.looseFeature('function J0(e){}'));
  assert.doesNotMatch('let x=1e4', official.looseFeature('let t=1e3'));
  assert.doesNotMatch('var x=1e3', official.looseFeature('let t=1e3'));
  assert.match('let x=1e3', official.looseFeature('let t=1e3'));
  assert.match('const x=new Map', official.looseFeature('const e=new Map'));
  assert.doesNotMatch('const x=new Set', official.looseFeature('const e=new Map'));
  assert.equal(official.looseFeature('a', { flags: 'g' }).flags, 'g');
  assert.match('`${a}…`', official.looseFeature('`${a}…`'));
  assert.throws(() => official.looseFeature(''), /non-empty string/);
  assert.throws(() => official.looseFeature('"open'), /unterminated string/);
  // Whitespace between tokens is optional, so one feature matches raw and prettier text.
  const sequence = official.looseFeature('Xe=Ze.length<=JW||yd(Ze,JW)===Ze?Ze:');
  assert.match('(Xe = Ze.length <= JW || yd(Ze, JW) === Ze ? Ze : `', sequence);
  assert.match('Xe=Ze.length<=JW||yd(Ze,JW)===Ze?Ze:`', sequence);
});
