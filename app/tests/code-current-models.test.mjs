import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFileView, rememberFileView } from '../src/generated/code-current/file-view-memory.mjs';
import { terminalAttachmentText } from '../src/generated/code-current/terminal-selection.mjs';
import { terminalDescription } from '../src/generated/code-current/terminal-description.mjs';
import { splitFrontmatter } from '../src/file-markdown-model.mjs';

test('file view memory separates sessions, bounds retention to 32 and drops defaults', () => {
  rememberFileView('s1\0notes.md', { source: true, forcedText: false });
  assert.equal(readFileView('s1\0notes.md').source, true);
  assert.equal(readFileView('s2\0notes.md'), undefined);
  rememberFileView('s1\0notes.md', { source: false, forcedText: false });
  assert.equal(readFileView('s1\0notes.md'), undefined);
  for (let i=0;i<33;i++) rememberFileView(`bounded\0${i}`, { source: false, forcedText: true });
  assert.equal(readFileView('bounded\u00000'), undefined);
  assert.equal(readFileView('bounded\u000032').forcedText, true);
  rememberFileView(null, { source: true, forcedText: true });
  assert.equal(readFileView(null), undefined);
  // 2.42304.0 cd2efac6e qs (old oc) also keeps an entry whose only non-default is mediaAsText (the media card's
  // "View as text anyway", Oh → Pi(!0)); locally that action is a forced read, remembered as forcedText.
  rememberFileView('s1\0photo.png', { source: false, forcedText: false, mediaAsText: true });
  assert.deepEqual(readFileView('s1\0photo.png'), { source: false, forcedText: false, mediaAsText: true });
  rememberFileView('s1\0photo.png', { source: false, forcedText: false, mediaAsText: false });
  assert.equal(readFileView('s1\0photo.png'), undefined);
  const generated = fs.readFileSync(new URL('../src/generated/code-current/file-view-memory.mjs', import.meta.url), 'utf8');
  assert.match(generated, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  assert.match(generated, /!\(!t\.source && !t\.forcedText && !t\.mediaAsText\)/);
  const viewer = fs.readFileSync(new URL('../src/source-file-viewer.jsx', import.meta.url), 'utf8');
  assert.match(viewer, /rememberFileView\(memoryKey, \{ source: showSource && !sourceFirst && !dirty, forcedText: !!file\.forcedText \}\)/);
  const session = fs.readFileSync(new URL('../src/source-session.jsx', import.meta.url), 'utf8');
  assert.match(session, /onViewAsText=\{\(\) => loadFile\(preview\.path, \{ force: true \}\)\}/);
  assert.match(session, /!!readFileView\(sessionId \? `\$\{sessionId\}\\u0000\$\{path\}` : null\)\?\.forcedText/);
});
test('terminal attachment drops leading blank lines but preserves indentation of the first content line', () => {
  assert.equal(terminalAttachmentText('\n\n    const value = 1;\n      use(value);  \n'), '    const value = 1;\n      use(value);');
  assert.equal(terminalAttachmentText('    indented'), '    indented');
  assert.equal(terminalAttachmentText('   \n\t'), '');
});
test('terminal descriptions handle home, root, Windows paths and non-path titles', () => {
  for (const [input, expected] of [['~','~'],['/','/'],['zsh: /work/repo','repo'],['C:\\work\\repo','repo'],['npm test','npm test']]) assert.equal(terminalDescription(input), expected);
});
test('empty frontmatter never consumes a later horizontal rule and rejects another delimiter or BOM as body', () => {
  assert.deepEqual(splitFrontmatter('---\n---\n\n# Body\n\n---\nEnd'), { fields: [], body: '# Body\n\n---\nEnd' });
  assert.deepEqual(splitFrontmatter('---\r\n--- \t\r\nBody'), { fields: [], body: 'Body' });
  assert.deepEqual(splitFrontmatter('---\n---'), { fields: [], body: '' });
  assert.equal(splitFrontmatter('---\n---\n---\nBody'), null);
  assert.equal(splitFrontmatter('---\n---\n\uFEFFBody'), null);
});
