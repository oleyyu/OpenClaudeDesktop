import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { toFileMentionOption } from '../src/generated/code-current/mention-output-files.mjs';
import { composerHelperPins } from '../scripts/code-current-composer-pins.mjs';
import { FileIndex } from '../src/generated/code-current/file-index.mjs';
import { sessionOutputFiles, mergeSessionOutputMatches } from '../src/mention-output-model.mjs';
import { mentionOptions, optionHighlights } from '../src/mention-model.mjs';

const write = (...paths) => ({ type: 'fileChange', status: 'completed', changes: paths.map(path => ({ path, kind: 'add' })) });
const deliver = (...paths) => ({ type: 'dynamicToolCall', status: 'completed', codeDesktop: { deliverables: paths.map(path => ({ path })) } });

test('current FileIndex keeps basename matches and original UTF-16 highlight positions', () => {
  const index = new FileIndex();
  index.loadFromFileList(['src/file-index.ts', 'file.ts', 'f/i/l/e.ts', 'file.ts', '资料/报告.pdf']);
  const matches = index.search('file', 20);
  assert.equal(matches.length, 3);
  assert.deepEqual(matches.find(match => match.path === 'src/file-index.ts').positions, [4, 5, 6, 7]);
  assert.deepEqual(index.search('报告', 20)[0].positions, [3, 4]);
  assert.deepEqual(index.search('missing', 20), []);
});
test('output candidates follow current recency, file-kind, temporary-directory and private-path rules', () => {
  const outputs = sessionOutputFiles([
    write('/repo/report.md', '/repo/app.js', '/repo/old.pdf'),
    write('/tmp/unrelated.txt', '/tmp/claude-123/hidden.md', '/repo/.claude/memory.md'),
    write('/repo/report.md', '/tmp/allowed/output.csv'),
    deliver('/repo/export.json', '/mnt/user-data/outputs/download.pdf'),
    { ...write('/repo/pending.pdf'), status: 'inProgress' },
    { ...write('/repo/failed.pdf'), status: 'failed' },
  ], { workingDir: '/repo', additionalDirectories: ['/tmp/allowed'] });
  assert.deepEqual(outputs.map(file => file.shownPath), ['export.json', '/tmp/allowed/output.csv', 'report.md', 'old.pdf']);
  assert.deepEqual(sessionOutputFiles([write('/private/tmp/project/report.md')], { workingDir: '/tmp/project' }), [{ path: '/private/tmp/project/report.md', shownPath: 'report.md' }]);
});
test('displayed output paths keep home abbreviation and platform-specific root handling', () => {
  assert.deepEqual(sessionOutputFiles([deliver('/Users/me/docs/report.pdf')], { workingDir: '/repo', homePath: '/Users/me' }), [{ path: '/Users/me/docs/report.pdf', shownPath: '~/docs/report.pdf' }]);
  assert.deepEqual(sessionOutputFiles([write('C:\\Work\\repo\\report.md')], { workingDir: 'c:\\Work\\repo', platform: 'win32' }), [{ path: 'C:/Work/repo/report.md', shownPath: 'report.md' }]);
  assert.deepEqual(sessionOutputFiles([deliver('C:/Work/report.md')], { workingDir: '/repo', platform: 'darwin' }), []);
  assert.deepEqual(sessionOutputFiles([deliver('/repo/a b.pdf', '/repo/e\u0301.pdf', '/repo/report\uFE0F.pdf', '/repo/dir/')], { workingDir: '/repo' }), []);
});
test('session outputs appear only for a filename query and preserve an existing indexed option', () => {
  const existing = [{ path: 'docs/report.pdf', positions: [5, 6] }];
  const outputs = [{ path: '/repo/docs/report.pdf', shownPath: 'docs/report.pdf' }, { path: '/tmp/results/report.csv', shownPath: '/tmp/results/report.csv' }];
  assert.equal(mergeSessionOutputMatches('', existing, outputs), existing);
  assert.equal(mergeSessionOutputMatches('docs', existing, outputs), existing, 'directory-only query must not introduce an output');
  const merged = mergeSessionOutputMatches('report', existing, outputs);
  assert.equal(merged.filter(file => file.shownPath === 'docs/report.pdf').length, 1);
  assert.equal(merged.find(file => file.shownPath === 'docs/report.pdf').path, 'docs/report.pdf');
  assert.equal(merged.find(file => file.shownPath === '/tmp/results/report.csv').path, '/tmp/results/report.csv');
});
test('output option highlights its shown path while insertion keeps the absolute path', () => {
  const [option] = mentionOptions(mergeSessionOutputMatches('report', [], [{ path: '/Users/me/repo/report.pdf', shownPath: 'report.pdf' }]));
  assert.equal(option.label, 'report.pdf'); assert.equal(option.description, undefined);
  assert.equal(option.path, '/Users/me/repo/report.pdf'); assert.equal(option.renderedText, option.path);
  assert.deepEqual(optionHighlights(option).label, [{ text: 'report', lit: true }, { text: '.pdf', lit: false }]);
});
test('output collection and merged options stay bounded at fifty most recent files', () => {
  const outputs = sessionOutputFiles([write(...Array.from({ length: 100 }, (_, i) => `/repo/report${i}.pdf`))], { workingDir: '/repo' });
  assert.equal(outputs.length, 50); assert.equal(outputs[0].shownPath, 'report99.pdf'); assert.equal(outputs.at(-1).shownPath, 'report50.pdf');
  assert.equal(mergeSessionOutputMatches('report', [], outputs).length, 50);
});

// composer-helpers-latest (w3-composer-host): the @ output merge is 3.6556.2 c227f4d5e QD/FO/HO/WO/ZO (2.42304.0
// pD/JD/tO/rO/uO; the failure latch JD is FO by its call site in WO).
test('3.6556.2: the output merge is sliced from the shipped c227f4d5e with the same option shape', () => {
  const app = path.resolve(import.meta.dirname, '..'), reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  const entry = manifest.modules.find(module => module.target === 'mention-output-files.mjs');
  assert.equal(entry.referenceVersion, '3.6556.2');
  assert.equal(path.basename(entry.source), 'c227f4d5e-B-FYKrwT.js');
  assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, 'c227f4d5e-B-FYKrwT.js'))));
  assert.equal(entry.sha256, sha(readFileSync(path.join(app, 'src/generated/code-current/mention-output-files.mjs'), 'utf8')));
  assert.deepEqual(entry.bindings, ['QD', 'FO', 'HO', 'WO', 'ZO']);
  assert.deepEqual(entry.bindings, composerHelperPins['mention-output-files.mjs'].bindings);
  // qO/KO (CDS Folder/File icons, was oO/aO) are carried by name, as the host mention rows draw icons by name.
  assert.deepEqual(toFileMentionOption({ path: 'docs/report.pdf', isDirectory: false, positions: [5] }), {
    id: 'file-docs/report.pdf', label: 'report.pdf', description: 'docs', icon: 'File', category: 'Files',
    metadata: { path: 'docs/report.pdf', isDirectory: false, positions: [5] }, providerId: 'ccd-files', renderedText: 'docs/report.pdf',
  });
  assert.equal(toFileMentionOption({ path: 'docs', isDirectory: true }).icon, 'Folder');
  // 3.6556.2 ZO(e, t = !0): backslashes split too (HO passes its third argument, default !0).
  assert.deepEqual([toFileMentionOption({ path: 'docs\\report.pdf', isDirectory: false }).label, toFileMentionOption({ path: 'docs\\report.pdf', isDirectory: false }).description], ['report.pdf', 'docs']);
});

// cc-rest-files: FileIndex and the output-path helpers are 3.6556.2 renames (c30db9bec, shared-26/28/130, c73f45bc3);
// c30db9bec Zn (2.42304.0 ql) waits on the injectable clock `n?.clock ?? Xn` (Xn = new Yn()).
test('3.6556.2: FileIndex and the @ output-path helpers come from the shipped chunks', async () => {
  const app = path.resolve(import.meta.dirname, '..'), reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  const expected = {
    'file-index.mjs': ['c30db9bec-CdR1oH22.js', ['Yn', 'Xn', 'Zn', 'er', 'tr', 'nr', 'rr', 'ir', 'ar', 'or', 'sr', 'cr', 'lr', 'ur', 'fr', 'pr', 'mr', 'hr', 'gr', '_r', 'vr', 'yr', 'dr']],
    'file-output-root.mjs': ['shared-26-CGuBxVt9.js', ['DS', 'OS', 'AS']],
    'file-output-normalize.mjs': ['shared-28-DNYlf4wu.js', ['_M', 'EM', 'SM']],
    'file-output-paths.mjs': ['shared-130-dWztbTO1.js', ['UV', 'WV', 'XV', 'ZV', 'VH', 'HH', 'UH', 'WH', 'JH', '$H', 'eU', 'tU', 'zH', 'YH', 'XH', 'ZH', 'QH']],
    'file-output-order.mjs': ['c73f45bc3-B7hbL7H9.js', ['Ub', 'Kb', 'qb', 'Jb', 'Yb', 'Xb', 'Zb', 'Qb', '$b', 'ex', 'rx']],
  };
  for (const [target, [file, bindings]] of Object.entries(expected)) {
    const entry = manifest.modules.find(module => module.target === target);
    assert.equal(entry.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry.source), file, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const generated = readFileSync(path.join(app, 'src/generated/code-current', target), 'utf8');
    assert.equal(entry.sha256, sha(generated), target);
    assert.match(generated, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/, target);
  }
  const fileIndex = readFileSync(path.join(app, 'src/generated/code-current/file-index.mjs'), 'utf8');
  assert.match(fileIndex, /let a = \(n\?\.clock \?\? Xn\)\.setTimeout\(/);
  assert.match(fileIndex, /var Xn = new Yn\(\);/);
  assert.match(fileIndex, /return \(n\?\.unref && r\.unref\(\), \(\) => clearTimeout\(r\)\);/);
  assert.match(fileIndex, /export \{ dr as FileIndex \};/);
  assert.ok(readFileSync(path.join(reference, 'c30db9bec-CdR1oH22.js'), 'utf8').includes('let a=(n?.clock??Xn).setTimeout(()=>{t?.removeEventListener("abort",o),r()},e,{unref:n?.unref})'));
  // The async build yields through er (setImmediate here) and still finds every path.
  const index = new FileIndex();
  const { queryable, done } = index.loadFromFileListAsync(['src/a.ts', 'src/b.ts', 'src/a.ts']);
  await queryable;
  assert.equal(await done, true);
  assert.deepEqual(index.search('b', 5).map(match => match.path), ['src/b.ts']);
});
