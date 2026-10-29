// W12 diff-cont: the Changed files tree's `jumps` (3.6556.2 c44d00c7f Vo) over the host reveal channel's per-session
// scroll targets (diff-reveal.mjs, cc8941b7b scrollTargetBySession / scrollToAnnotation / clearScrollTarget). Original
// text pinned from the 3.6556.2 snapshot (parsed, never executed); the hooks run under a hand-built dispatcher.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(V1, name), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
let server, Reveal, Diff, Memory;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Reveal = await server.ssrLoadModule('/src/diff-reveal.mjs');
  Diff = await server.ssrLoadModule('/src/source-diff.jsx');
  Memory = await server.ssrLoadModule('/src/generated/files-changes/diff-tree-memory.mjs');
});
after(async () => { await server?.close(); });

// A hook dispatcher (as tests/source-diff-scope.test.mjs): setters land on the next render().
function hookFixture(hook, props) {
  let cursor = 0, result;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: (context) => context._currentValue,
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (value) => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect() { cursor++; },
    useSyncExternalStore(subscribe, getSnapshot) { cursor++; return getSnapshot(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = (next = props) => {
    props = next; cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
    try { return (result = hook(props)); } finally { internal.H = old; }
  };
  render();
  // React re-runs a component that set state while rendering; twice settles the render-phase updates here.
  const settle = (next) => { render(next); return render(next); };
  return { get result() { return result; }, render, settle };
}

test('3.6556.2 originals: the store\'s scroll target, Vo\'s count and where Jd / Jo / Xo use it', () => {
  const store = official('cc8941b7b-DAgMZRvX.js');
  for (const text of ['nonce:(e.scrollTargetBySession[t]?.nonce??0)+1,...r?.fuzzy&&{fuzzy:!0},...r?.tileId&&{tileId:r.tileId},...r?.anchor&&{anchor:r.anchor}',
    'clearScrollTarget:t=>e(e=>{if(!e.scrollTargetBySession[t])return e;', 'F as V'])
    assert.ok(store.includes(text), `cc8941b7b: ${text}`);
  const diff = official('c44d00c7f-Cr1FDL2F.js');
  for (const text of ['i!==void 0&&!i.fuzzy&&i.anchor===void 0&&(!i.tileId||i.tileId===n)&&i.filePath===r?i:void 0',
    'a=mr(i),[o,s]=x(a),[c,l]=x(0);return a!==o&&(s(a),a!==void 0&&l(c+1)),c', 'scope:"source",activePath:c,holdsActive:D,jumps:O',
    'jumps:O,onClickFile:ee', 'K4($,31,c,y,x,O,[c,O,y,x])', 'e=>wr.scrollToAnnotation(i,e,{tileId:a})',
    'wr.scrollToAnnotation(i,t[0].filePath,{tileId:ei.tileId,anchor:ei.anchor})'])
    assert.ok(diff.includes(text), `c44d00c7f: ${text}`);
  // mr is cc8941b7b's store hook (`V as mr`, exported `F as V`).
  assert.match(diff, /V as mr,[^}]*\}from"\.\/cc8941b7b-DAgMZRvX\.js"/);
});

test('diff-reveal.mjs: per-session scroll targets as scrollToAnnotation / clearScrollTarget, Vo\'s selector, anchored requests', () => {
  Reveal.resetDiffReveal();
  let calls = 0;
  const stop = Reveal.subscribeDiffTargets(() => { calls += 1; });
  Reveal.scrollDiffTarget('s', 'src/a.js');
  assert.deepEqual(Reveal.diffTarget('s'), { filePath: 'src/a.js', nonce: 1 });
  Reveal.scrollDiffTarget('s', 'src/a.js', { fuzzy: true, tileId: 'diff', anchor: { side: 'additions', line: 3 } });
  assert.deepEqual(Reveal.diffTarget('s'), { filePath: 'src/a.js', nonce: 2, fuzzy: true, tileId: 'diff', anchor: { side: 'additions', line: 3 } });
  Reveal.clearDiffTargetForTile('s', 'other');
  assert.equal(Reveal.diffTarget('s').nonce, 2, 'another tile leaves it');
  Reveal.clearDiffTargetForTile('s', 'diff');
  assert.equal(Reveal.diffTarget('s'), undefined);
  Reveal.scrollDiffTarget('s', 'src/a.js');
  assert.equal(Reveal.diffTarget('s').nonce, 1, 'the nonce restarts once the target is gone');
  Reveal.clearDiffTarget('s');
  Reveal.clearDiffTarget('s');
  Reveal.scrollDiffTarget(undefined, 'src/a.js');
  assert.equal(calls, 5, 'every set / clear notifies, a no-op clear does not');
  stop();
  // Vo's selector.
  const plain = { filePath: 'a', nonce: 1 };
  assert.equal(Reveal.diffTreeJumpTarget(plain, undefined, 'a'), plain);
  assert.equal(Reveal.diffTreeJumpTarget(plain, undefined, 'b'), undefined);
  assert.equal(Reveal.diffTreeJumpTarget({ ...plain, fuzzy: true }, undefined, 'a'), undefined);
  assert.equal(Reveal.diffTreeJumpTarget({ ...plain, anchor: { side: 'additions', line: 1 } }, undefined, 'a'), undefined);
  assert.equal(Reveal.diffTreeJumpTarget({ ...plain, tileId: 'diff:2' }, 'diff', 'a'), undefined);
  assert.ok(Reveal.diffTreeJumpTarget({ ...plain, tileId: 'diff' }, 'diff', 'a'));
  assert.equal(Reveal.diffTreeJumpTarget(undefined, undefined, 'a'), undefined);
  // The request keeps its anchor for the pane; takeDiffReveal still answers the path.
  Reveal.requestDiffReveal('/repo/lib/b.js', { fuzzy: true, tileId: 'diff', anchor: { side: 'additions', line: 3 } });
  assert.deepEqual(Reveal.takeDiffRevealRequest(['src/a.js', 'lib/b.js']), { path: 'lib/b.js', anchor: { side: 'additions', line: 3 } });
  Reveal.requestDiffReveal('src/a.js');
  assert.deepEqual(Reveal.takeDiffRevealRequest(['lib/b.js']), null, 'no match keeps it waiting');
  assert.equal(Reveal.takeDiffReveal(['src/a.js']), 'src/a.js');
  Reveal.resetDiffReveal();
});

test('Vo (useDiffTreeJumps): counts each new plain target for the active file; fuzzy, anchored, other files and tiles do not', () => {
  Reveal.resetDiffReveal();
  const props = { sessionId: 's-jumps', tileId: undefined, activePath: 'src/a.js' };
  const vo = hookFixture(Diff.useDiffTreeJumps, props);
  assert.equal(vo.result, 0);
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js');
  assert.equal(vo.settle(), 1, 'a jump to the active file');
  assert.equal(vo.settle(), 1, 'the same target counts once');
  Reveal.clearDiffTarget('s-jumps');
  assert.equal(vo.settle(), 1, 'the pane took it');
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js');
  assert.equal(vo.settle(), 2, 'asking again for the same file is another jump');
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js', { fuzzy: true });
  assert.equal(vo.settle(), 2, 'fuzzy');
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js', { anchor: { side: 'additions', line: 4 } });
  assert.equal(vo.settle(), 2, 'anchored (a finding or comment)');
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js', { tileId: 'diff:2' });
  assert.equal(vo.settle(), 2, 'another tile');
  Reveal.scrollDiffTarget('s-jumps', 'lib/b.js');
  assert.equal(vo.settle(), 2, 'another file');
  Reveal.scrollDiffTarget('s-other', 'src/a.js');
  assert.equal(vo.settle(), 2, 'another session');
  Reveal.scrollDiffTarget('s-jumps', 'src/a.js');
  assert.equal(vo.settle(), 3);
  assert.equal(hookFixture(Diff.useDiffTreeJumps, { ...props, sessionId: undefined }).result, 0);
  Reveal.resetDiffReveal();
});

test('Ho (useDiffTreeCollapsed): a new jump re-opens the folders hiding the same active file', () => {
  const session = 's-jump-folders';
  // The session left `src` collapsed while src/a.js was active (Uo keeps it: the active file is the remembered one).
  Memory.writeTreeCollapsed(session, 'source', { collapsed: new Set(['src']), activePath: 'src/a.js' }, undefined);
  const props = { sessionId: session, tileId: undefined, scope: 'source', activePath: 'src/a.js', holdsActive: true, jumps: 0 };
  const ho = hookFixture(Diff.useDiffTreeCollapsed, props);
  assert.deepEqual([...ho.result[0]], ['src']);
  assert.deepEqual([...ho.settle(props)[0]], ['src'], 'nothing new: it stays collapsed');
  assert.deepEqual([...ho.settle({ ...props, jumps: 1 })[0]], [], 'the jump opens src');
  // Without holdsActive (the active file is in a kind section) the jump leaves this scope alone.
  Memory.writeTreeCollapsed(`${session}-2`, 'source', { collapsed: new Set(['src']), activePath: 'src/a.js' }, undefined);
  const other = hookFixture(Diff.useDiffTreeCollapsed, { ...props, sessionId: `${session}-2`, holdsActive: false });
  assert.deepEqual([...other.settle({ ...props, sessionId: `${session}-2`, holdsActive: false, jumps: 1 })[0]], ['src']);
});

test('host wiring: SourceDiff records picks and taken requests as the session target, takes it back; the tree passes jumps', () => {
  const jsx = source('src/source-diff.jsx');
  assert.match(jsx, /const targetSession = changes \? fileList\?\.sessionId \?\? undefined : undefined;/);
  assert.match(jsx, /scrollDiffTarget\(targetSession, path, anchor \? \{ anchor \} : undefined\);/);
  assert.match(jsx, /const request = takeDiffRevealRequest\(entries\.map\(\(entry\) => entry\.filePath\)\); if \(request\) selectFile\(request\.path, request\.anchor\);/);
  assert.match(jsx, /if \(!target \|\| target\.fuzzy \|\| target\.tileId \|\| !entries\.some\(\(entry\) => entry\.filePath === target\.filePath\)\) return;\n\s+clearDiffTarget\(targetSession\);/);
  assert.match(jsx, /const jumps = useDiffTreeJumps\(\{ sessionId, tileId, activePath \}\);\n\s+const \[collapsed, toggle\] = useDiffTreeCollapsed\(\{ sessionId, tileId, scope: 'source', activePath, holdsActive, jumps \}\);/);
  assert.match(jsx, /\}, \[activePath, jumps, tree, list\]\);/);
  assert.match(jsx, /<DiffTreeKindSection key=\{section\.kind\} section=\{section\} sessionId=\{sessionId\} tileId=\{tileId\} jumps=\{jumps\} rowProps=\{rowProps\} \/>/);
  assert.match(jsx, /useDiffTreeCollapsed\(\{ sessionId, tileId, scope: section\.kind, activePath, holdsActive, jumps \}\)/);
  assert.match(jsx, /\} else if \(activePath !== seen\.activePath \|\| jumps !== seen\.jumps\) \{\n\s+setSeen\(\{ sessionId, tileId, activePath, jumps \}\);\n\s+if \(holdsActive\) setOpen\(true\);/);
  // A review finding's reveal carries its anchor, so it is not a plain jump (cccc2cf0a / cc8941b7b pass anchor + fuzzy).
  assert.match(source('src/source-review-findings-adapters.jsx'), /requestDiffReveal\(filePath, options\);/);
});
