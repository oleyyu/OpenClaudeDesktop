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

// composer-helpers-latest: ca80fca8d no longer ships in 2.42304.0; the @ output merge is c227f4d5e pD/JD/tO/rO/uO.
test('2.42304.0: the output merge is sliced from the shipped c227f4d5e with the same option shape', () => {
  const app = path.resolve(import.meta.dirname, '..'), reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/code-current/manifest.json'), 'utf8'));
  const entry = manifest.modules.find(module => module.target === 'mention-output-files.mjs');
  assert.equal(entry.referenceVersion, '2.42304.0');
  assert.equal(path.basename(entry.source), 'c227f4d5e-Ba-r--Rl.js');
  assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, 'c227f4d5e-Ba-r--Rl.js'))));
  assert.equal(entry.sha256, sha(readFileSync(path.join(app, 'src/generated/code-current/mention-output-files.mjs'), 'utf8')));
  assert.deepEqual(entry.bindings, ['pD', 'JD', 'tO', 'rO', 'uO']);
  assert.deepEqual(entry.bindings, composerHelperPins['mention-output-files.mjs'].bindings);
  // oO/aO (CDS Folder/File icons) are carried by name, as the host mention rows draw icons by name.
  assert.deepEqual(toFileMentionOption({ path: 'docs/report.pdf', isDirectory: false, positions: [5] }), {
    id: 'file-docs/report.pdf', label: 'report.pdf', description: 'docs', icon: 'File', category: 'Files',
    metadata: { path: 'docs/report.pdf', isDirectory: false, positions: [5] }, providerId: 'ccd-files', renderedText: 'docs/report.pdf',
  });
  assert.equal(toFileMentionOption({ path: 'docs', isDirectory: true }).icon, 'Folder');
});
