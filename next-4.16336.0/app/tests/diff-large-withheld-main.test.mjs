// R4i-files FI2 (diffgit-08-lazy): the main process's inline patch budget and per-file patch (electron/git-status.cjs),
// ported from 2.42304.0 heavyWorkWorker (`var bv=300,xv=1048576,Sv=5242880`, _y, vy, Fy) and CxZMGoHL patchInclusion.
// Git never runs: a fixture runner (the `exec` test seam of git()) answers each argv with fixture diff output, inside a
// temporary directory that holds only the untracked files' bytes. No network, no Electron, no listening port.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseUnifiedDiff } from '../src/diff-model.js';
import { withComparisonFiles } from '../src/diff-file-list-model.mjs';

const git = createRequire(import.meta.url)('../electron/git-status.cjs');
const { workspaceGitDiff, workspaceGitFilePatch, patchInclusion, patchBudget, headerOnlyPatch, PATCH_BUDGET } = git;
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const read = (rel) => fs.readFileSync(rel, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const HEAD = 'a'.repeat(40);

function workspace(t, files = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'fi2-budget-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  return dir;
}
const hunk = (name, added, removed = 1) => [`diff --git a/${name} b/${name}`, 'index 1111111..2222222 100644', `--- a/${name}`, `+++ b/${name}`,
  `@@ -1,${removed} +1,${added} @@`, ...Array.from({ length: removed }, (_, i) => `-old ${i}`), ...Array.from({ length: added }, (_, i) => `+new ${i}`)].join('\n') + '\n';
const addition = (name, text) => {
  const lines = text.split('\n'); if (lines.at(-1) === '') lines.pop();
  return [`diff --git a/${name} b/${name}`, 'new file mode 100644', 'index 0000000..3333333', '--- /dev/null', `+++ b/${name}`,
    `@@ -0,0 +1,${lines.length} @@`, ...lines.map((line) => `+${line}`)].join('\n') + '\n';
};
// tracked: [{path, added, removed, status?, oldPath?, patch?, binary?, modes?}]; untracked: names (their bytes are on disk).
function fixtureGit(dir, { tracked = [], untracked = [], patch, full, filePatch, lsFiles = '' } = {}) {
  const calls = [];
  const numstat = tracked.map((file) => {
    const counts = file.binary ? '-\t-' : `${file.added}\t${file.removed}`;
    return file.oldPath ? `${counts}\t\0${file.oldPath}\0${file.path}\0` : `${counts}\t${file.path}\0`;
  }).join('');
  const raw = tracked.map((file) => {
    const status = file.status ?? 'M';
    const modes = file.modes ?? (status === 'A' ? '000000 100644' : status === 'D' ? '100644 000000' : '100644 100644');
    return `:${modes} 1111111 2222222 ${status}${status === 'R' ? '100' : ''}\0${file.oldPath ? `${file.oldPath}\0` : ''}${file.path}\0`;
  }).join('');
  const exec = (args, { maxBuffer }) => {
    calls.push({ args, maxBuffer });
    const [command] = args;
    if (command === 'rev-parse' && args[1] === '--show-toplevel') return { stdout: `${dir}\n` };
    if (command === 'config') return { code: 1 };
    if (command === 'rev-parse' && args.includes('HEAD^{commit}')) return { stdout: `${HEAD}\n` };
    if (command === 'status') return { stdout: untracked.map((name) => `?? ${name}\0`).join('') };
    if (command === 'check-attr') return { stdout: '' };
    if (command === 'ls-files') return { stdout: lsFiles };
    if (command === 'diff' && args.includes('--no-index')) {
      const name = args.at(-1);
      return { stdout: addition(name, fs.readFileSync(path.join(dir, name), 'utf8')), code: 1 };
    }
    if (command === 'diff' && args.includes('--numstat')) return { stdout: numstat };
    if (command === 'diff' && args.includes('--raw')) return { stdout: raw };
    if (command === 'diff') {
      const paths = args.slice(args.indexOf('--') + 1);
      if (paths.length) return { stdout: typeof filePatch === 'function' ? filePatch(paths) : filePatch ?? '' };
      if (args.includes('--unified=2147483647')) return { stdout: full ?? patch ?? tracked.map((file) => file.patch ?? hunk(file.path, file.added, file.removed)).join('') };
      return { stdout: patch ?? tracked.map((file) => file.patch ?? hunk(file.path, file.added, file.removed)).join('') };
    }
    return { code: 1 };
  };
  return { exec, calls, plainDiffs: () => calls.filter(({ args }) => args[0] === 'diff' && !args.some((arg) => arg === '--numstat' || arg === '--raw' || arg === '--no-index')) };
}
const BUDGET = { includePatches: false, inlinePatchesMaxChangedLines: 20000 };

test('official budget constants and the two pure steps (patchInclusion, _y counts) match 2.42304.0', () => {
  const worker = read(path.join(reference, 'asar/.vite/build/heavy-work-worker/heavyWorkWorker.js'));
  assert.equal(count(worker, 'var bv=300,xv=1048576,Sv=5242880,'), 1);
  assert.equal(count(worker, 'if(r.size+a.length>bv)return{include:!1};let o=Qv(a);for(let e of r.values())o+=e.additions+e.deletions;if(o>e.inlineMaxChangedLines)return{include:!1};'), 1);
  assert.equal(count(worker, 'return{include:!0,maxBytes:Math.max(0,xv-s)}}function vy(e,t){return e===!0?{}:{patches_withheld:!t}}'), 1);
  assert.equal(count(worker, 'if(s.includes(`\\ndiff --git `))return"";if(s.trim())return s;'), 1);
  assert.equal(count(read(path.join(reference, 'asar/.vite/build/index.chunk-CxZMGoHL.js')),
    'static patchInclusion(e){if(e?.includePatches!==!1)return!0;let t=e.inlinePatchesMaxChangedLines;return t!==void 0&&Number.isFinite(t)&&t>=0?{inlineMaxChangedLines:t}:!1}'), 1);
  assert.deepEqual(PATCH_BUDGET, { files: 300, prefillBytes: 1048576, filePatchBytes: 5242880 });
  assert.equal(patchInclusion(undefined), true);
  assert.equal(patchInclusion({ includePatches: true, inlinePatchesMaxChangedLines: 5 }), true);
  assert.deepEqual(patchInclusion(BUDGET), { inlineMaxChangedLines: 20000 });
  assert.equal(patchInclusion({ includePatches: false }), false);
  assert.equal(patchInclusion({ includePatches: false, inlinePatchesMaxChangedLines: -1 }), false);
  assert.equal(patchInclusion({ includePatches: false, inlinePatchesMaxChangedLines: Infinity }), false);
  const record = (added, removed = 0) => ({ added, removed });
  const budget = { inlineMaxChangedLines: 20000 };
  assert.equal(patchBudget(true, [], []).include, true);
  assert.equal(patchBudget(false, [], []).include, false);
  assert.equal(patchBudget(budget, Array.from({ length: 200 }, () => record(1)), Array.from({ length: 100 }, () => record(1))).include, true, '300 files fit');
  assert.equal(patchBudget(budget, Array.from({ length: 200 }, () => record(1)), Array.from({ length: 101 }, () => record(1))).include, false, '301 files withhold');
  assert.equal(patchBudget(budget, [record(10000, 5000)], [record(5000)]).include, true, '20000 lines fit');
  assert.equal(patchBudget(budget, [record(10000, 5000)], [record(5001)]).include, false, '20001 lines withhold');
});

test('within the budget: the inline patch (tracked, then untracked additions), patches_withheld false and the files list', async (t) => {
  const dir = workspace(t, { 'new.txt': 'one\ntwo\n' });
  const run = fixtureGit(dir, { tracked: [{ path: 'a.js', added: 2, removed: 1 }, { path: 'b.js', added: 0, removed: 1, status: 'D' }], untracked: ['new.txt'] });
  const result = await workspaceGitDiff(dir, { scope: 'uncommitted', ...BUDGET, exec: run.exec });
  assert.equal(result.patches_withheld, false);
  assert.equal(result.completeContext, false);
  assert.equal(result.patch, hunk('a.js', 2, 1) + hunk('b.js', 0, 1) + addition('new.txt', 'one\ntwo\n'));
  assert.deepEqual(result.files, [
    { filename: 'a.js', status: 'modified', additions: 2, deletions: 1, changes: 3 },
    { filename: 'b.js', status: 'removed', additions: 0, deletions: 1, changes: 1 },
    { filename: 'new.txt', status: 'added', additions: 2, deletions: 0, changes: 2 },
  ]);
  // The tracked patch ran under the prefill left after the untracked bodies (xv - s).
  const [inline] = run.plainDiffs();
  assert.equal(inline.maxBuffer, PATCH_BUDGET.prefillBytes - Buffer.byteLength(addition('new.txt', 'one\ntwo\n')));
  // completeContext: the whole-file patch when it fits the existing raw-patch limits.
  const complete = await workspaceGitDiff(dir, { scope: 'uncommitted', completeContext: true, ...BUDGET, exec: fixtureGit(dir, {
    tracked: [{ path: 'a.js', added: 2, removed: 1 }], untracked: ['new.txt'], full: hunk('a.js', 2, 1).replace('@@ -1,1 +1,2 @@', '@@ -1,1 +1,2 @@') }).exec });
  assert.equal(complete.completeContext, true);
  assert.equal(complete.patches_withheld, false);
});

test('past 300 files or past the changed-line budget every patch is withheld: header-only blocks plus counts, no patch read', async (t) => {
  const dir = workspace(t);
  const many = Array.from({ length: 301 }, (_, i) => ({ path: `f${String(i).padStart(3, '0')}.js`, added: 1, removed: 0 }));
  const run = fixtureGit(dir, { tracked: many });
  const result = await workspaceGitDiff(dir, { scope: 'uncommitted', completeContext: true, ...BUDGET, exec: run.exec });
  assert.equal(result.patches_withheld, true);
  assert.equal(result.completeContext, false);
  assert.equal(result.files.length, 301);
  assert.equal(run.plainDiffs().length, 0, 'the patch itself is never read');
  const sections = parseUnifiedDiff(result.patch).sections;
  assert.equal(sections.length, 301);
  assert.ok(sections.every((section) => section.type === 'file' && section.hunks.length === 0));
  assert.equal(sections[0].path, 'f000.js');

  const lines = fixtureGit(dir, { tracked: [{ path: 'huge.js', added: 15000, removed: 5001 }] });
  const big = await workspaceGitDiff(dir, { scope: 'uncommitted', ...BUDGET, exec: lines.exec });
  assert.equal(big.patches_withheld, true);
  assert.deepEqual(big.files, [{ filename: 'huge.js', status: 'modified', additions: 15000, deletions: 5001, changes: 20001 }]);
  assert.equal(big.patch, 'diff --git a/huge.js b/huge.js\n');
  assert.equal(lines.plainDiffs().length, 0);
  // includePatches:false without a line budget: nothing inline (patchInclusion false).
  const none = await workspaceGitDiff(dir, { scope: 'uncommitted', includePatches: false, exec: fixtureGit(dir, { tracked: [{ path: 'a.js', added: 1, removed: 0 }] }).exec });
  assert.equal(none.patches_withheld, true);
});

test('past the 1 MiB prefill, and past the old 16 MiB bound, the diff is withheld instead of failing', async (t) => {
  const dir = workspace(t);
  const tracked = [{ path: 'wide.js', added: 10, removed: 0 }];
  for (const size of [PATCH_BUDGET.prefillBytes + 1, 17 * 1024 * 1024]) {
    const run = fixtureGit(dir, { tracked, patch: 'x'.repeat(size) });
    const result = await workspaceGitDiff(dir, { scope: 'uncommitted', completeContext: true, ...BUDGET, exec: run.exec });
    assert.equal(result.patches_withheld, true, String(size));
    assert.equal(result.patch, 'diff --git a/wide.js b/wide.js\n');
    assert.equal(run.plainDiffs()[0].maxBuffer, PATCH_BUDGET.prefillBytes);
  }
  // Untracked bodies spend the prefill first: one larger than it withholds before the tracked patch is read.
  const fat = workspace(t, { 'blob.txt': `${'y'.repeat(PATCH_BUDGET.prefillBytes)}\n` });
  const run = fixtureGit(fat, { tracked, untracked: ['blob.txt'] });
  const result = await workspaceGitDiff(fat, { scope: 'uncommitted', ...BUDGET, exec: run.exec });
  assert.equal(result.patches_withheld, true);
  assert.equal(run.plainDiffs().length, 0);
  assert.deepEqual(result.files.map((file) => [file.filename, file.status, file.additions]), [['wide.js', 'modified', 10], ['blob.txt', 'added', 1]]);
  assert.match(result.patch, /diff --git a\/blob\.txt b\/blob\.txt\nnew file mode 100644\n/);
  // Without the budget (every patch asked for) the old contract stays: a plain string, no patches_withheld (vy(true) = {}).
  const plain = await workspaceGitDiff(dir, { scope: 'uncommitted', exec: fixtureGit(dir, { tracked: [{ path: 'a.js', added: 1, removed: 0 }] }).exec });
  assert.equal(typeof plain, 'string');
  assert.equal(plain, hunk('a.js', 1, 0));
});

test('headerOnlyPatch: renamed, added and removed headers parse back to the same file and status', () => {
  const renamed = parseUnifiedDiff(headerOnlyPatch({ filename: 'dir/new name.js', previous_filename: 'dir/old.js', status: 'renamed' })).sections[0];
  assert.equal(renamed.path, 'dir/new name.js'); assert.equal(renamed.status, 'renamed'); assert.equal(renamed.renamedFrom, 'dir/old.js');
  assert.equal(renamed.fallbackReason, null);
  const added = parseUnifiedDiff(headerOnlyPatch({ filename: 'link', status: 'added', mode: '120000' })).sections[0];
  assert.equal(added.status, 'added'); assert.equal(added.newMode, '120000');
  assert.equal(parseUnifiedDiff(headerOnlyPatch({ filename: 'gone.txt', status: 'removed' })).sections[0].status, 'deleted');
  assert.equal(headerOnlyPatch({ filename: 'tab\there', status: 'modified' }), 'diff --git "a/tab\\011here" "b/tab\\011here"\n');
});

// R4i-files review fix: a withheld modified binary file and a mode-only change keep Git's own metadata lines, so the
// Changes body shows them as binary / mode rows (as unwithheld), not as a header-only parse fallback (RawPatch).
test('withheld binary and mode-only files keep "Binary files … differ" and old / new mode lines', async (t) => {
  const dir = workspace(t, { 'blob.bin': 'a\0b' });
  const run = fixtureGit(dir, { untracked: ['blob.bin'], tracked: [
    { path: 'img.png', added: 0, removed: 0, binary: true },
    { path: 'run.sh', added: 0, removed: 0, modes: '100644 100755' },
    { path: 'a.js', added: 3, removed: 1, modes: '100644 100755' },
    { path: 'gone.png', added: 0, removed: 0, binary: true, status: 'D' }] });
  const result = await workspaceGitDiff(dir, { scope: 'uncommitted', includePatches: false, inlinePatchesMaxChangedLines: 0, exec: run.exec });
  assert.equal(result.patches_withheld, true);
  assert.equal(result.patch, ['diff --git a/img.png b/img.png', 'Binary files a/img.png and b/img.png differ',
    'diff --git a/run.sh b/run.sh', 'old mode 100644', 'new mode 100755',
    'diff --git a/a.js b/a.js', 'old mode 100644', 'new mode 100755',
    'diff --git a/gone.png b/gone.png', 'deleted file mode 100644', 'Binary files a/gone.png and /dev/null differ',
    'diff --git a/blob.bin b/blob.bin', 'new file mode 100644', 'Binary files /dev/null and b/blob.bin differ'].join('\n') + '\n');
  // The files list keeps the official shape (no internal mode / binary fields).
  assert.ok(result.files.every((file) => !('binary' in file) && !('oldMode' in file) && !('mode' in file)));
  const sections = withComparisonFiles(parseUnifiedDiff(result.patch).sections, result.files);
  assert.deepEqual(sections.map((s) => [s.path, s.binary, s.fallbackReason ?? null, s.oldMode ?? null, s.newMode ?? null, !!s.lazyPatch]), [
    ['img.png', true, null, null, null, false], ['run.sh', false, null, '100644', '100755', false], ['a.js', false, null, '100644', '100755', true],
    ['gone.png', true, null, '100644', null, false], ['blob.bin', true, null, null, '100644', false]]);
  assert.equal(sections.find((s) => s.path === 'a.js').lazyPatch.hashInput, 'modified:3:1:');
});

test('workspaceGitFilePatch (Fy): one file under 5 MiB, renames name both paths, other outcomes are "" or null', async (t) => {
  const dir = workspace(t, { 'fresh.txt': 'hello\n' });
  const one = fixtureGit(dir, { filePatch: hunk('a.js', 2, 1) });
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'a.js', scope: 'uncommitted', exec: one.exec }), hunk('a.js', 2, 1));
  const call = one.plainDiffs()[0];
  assert.deepEqual(call.args.slice(-3), [HEAD, '--', 'a.js']);
  assert.equal(call.maxBuffer, PATCH_BUDGET.filePatchBytes);
  const renamed = fixtureGit(dir, { filePatch: (paths) => `diff --git a/${paths[0]} b/${paths[1]}\nrename from ${paths[0]}\nrename to ${paths[1]}\n` });
  await workspaceGitFilePatch(dir, { filePath: 'new.js', previousPath: 'old.js', scope: 'uncommitted', exec: renamed.exec });
  assert.deepEqual(renamed.plainDiffs()[0].args.slice(-3), ['--', 'old.js', 'new.js']);
  // Over the cap: "" (the row stays without hunks).
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'a.js', scope: 'uncommitted', exec: fixtureGit(dir, { filePatch: 'z'.repeat(PATCH_BUDGET.filePatchBytes + 1) }).exec }), '');
  // Output naming a second file: "".
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'a.js', scope: 'uncommitted', exec: fixtureGit(dir, { filePatch: hunk('a.js', 1) + hunk('b.js', 1) }).exec }), '');
  // No output, tracked: "" ; no output, untracked: its addition patch.
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'same.js', scope: 'uncommitted', exec: fixtureGit(dir, { filePatch: '', lsFiles: 'same.js\0' }).exec }), '');
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'fresh.txt', scope: 'uncommitted', exec: fixtureGit(dir, { filePatch: '' }).exec }), addition('fresh.txt', 'hello\n'));
  assert.equal(await workspaceGitFilePatch(dir, { filePath: 'missing.txt', scope: 'uncommitted', exec: fixtureGit(dir, { filePatch: '' }).exec }), null);
  // Lv: unsafe paths, and a commit scope (never withheld), are null without any Git call.
  for (const options of [{ filePath: '../x' }, { filePath: '/etc/passwd' }, { filePath: '' }, { filePath: 'C:/x' }, { filePath: 'a.js', previousPath: '../b' }, { filePath: 'a.js', scope: 'commit:abcdef0' }]) {
    const guarded = fixtureGit(dir, { filePatch: hunk('a.js', 1) });
    assert.equal(await workspaceGitFilePatch(dir, { scope: 'uncommitted', ...options, exec: guarded.exec }), null, JSON.stringify(options));
    assert.equal(guarded.calls.length, 0);
  }
});

test('wiring: main.cjs passes the budget and serves workspace-git-file-patch; the renderer asks for both only in working-tree scopes', () => {
  const main = read(path.join(app, 'electron/main.cjs'));
  assert.equal(count(main, 'case "workspace-git-file-patch": {'), 1);
  assert.equal(count(main, '"workspace-git-diff", "workspace-git-file-patch", "workspace-git-image"'), 1, 'the popout may call it (POPOUT_ACTIONS)');
  assert.equal(count(main, '...(p.includePatches === false ? { includePatches: false } : {}),'), 1);
  const renderer = read(path.join(app, 'src/main.jsx'));
  assert.equal(count(renderer, '...(lazyDiffScope(diffScope.param) ? INLINE_PATCH_BUDGET : {}) })'), 1);
  assert.equal(count(renderer, '...(lazyDiffScope(popoutScope.param) ? INLINE_PATCH_BUDGET : {}) })'), 1);
  assert.equal(count(renderer, 'call("workspace-git-file-patch"'), 2);
  assert.equal(count(read(path.join(app, 'src/source-session.jsx')), 'comparisonFiles={Array.isArray(diff?.files) ? diff.files : undefined}'), 1);
  // c5da7eb42: the budget and lazy hunks go together, only for the local working-tree diff.
  assert.equal(count(read(path.join(reference, 'ion-dist/assets/v1/c5da7eb42-B8cTG8SI.js')),
    'let e=!s&&!o&&!r&&!!V?.getGitDiffFilePatch;return md((s?await V?.getRemoteGitDiff?.({kind:"wsl",distro:s},t,n,r):o?await V?.getSSHGitDiff?.(o,t,n,r):await V?.getGitDiff?.(t,n,r,e?{includePatches:!1,inlinePatchesMaxChangedLines:2e4}:void 0))??null,e)'), 1);
});
