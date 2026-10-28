import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenLines, previewHunks, fileHighlightLanguage } from '../src/file-preview-model.mjs';
import { changePreview } from '../src/file-tool-model.mjs';

test('file tokens retain multi-line styling, blank lines, Unicode and literal HTML without losing copy text', () => {
  const paint = { color: '#abcdef', fontStyle: 1 };
  const text = '/* 😀\r\n\n comment */\n<script>x</script>\n';
  const tokens = [{ text: '/* 😀\r\n\n comment */', light: paint, dark: paint }, { text: '\n<script>x</script>\n' }];
  const lines = tokenLines(tokens, text);
  assert.equal(lines.map(row => row.map(token => token.text).join('')).join('\n'), text);
  assert.equal(lines[2][0].light, paint);
  assert.deepEqual(lines[1], []);
  assert.deepEqual(lines.at(-1), []);
  assert.equal(lines[3][0].text, '<script>x</script>');
});
test('stale token streams cannot substitute another file or partial text', () => {
  const text = 'const exact = 1;\n';
  for (const tokens of [null, [{ text: 'old code' }], [{ text: 'const' }]]) {
    assert.deepEqual(tokenLines(tokens, text), [[{ text: 'const exact = 1;' }], [{ text: '' }]]);
  }
});
test('diff syntax documents keep old/new line alignment and isolate missing hunk context', () => {
  const raw = '@@ -4,3 +4,4 @@\n const before = 1;\n-old();\n+newCall();\n+more();\n done();\n@@ -30 +31 @@\n-/* old */\n+/* new */\n';
  const preview = changePreview({ kind: 'update', diff: raw });
  const hunks = previewHunks(preview.rows);
  assert.equal(hunks.length, 2);
  assert.equal(hunks[0].before, 'const before = 1;\nold();\ndone();');
  assert.equal(hunks[0].after, 'const before = 1;\nnewCall();\nmore();\ndone();');
  assert.equal(hunks[1].before, '/* old */');
  assert.equal(hunks[1].after, '/* new */');
  assert.equal(hunks[1].rows[0].oldLine, 30);
  assert.equal(hunks[1].rows[1].newLine, 31);
  for (const hunk of hunks) for (const row of hunk.rows) {
    if (row.side) assert.equal(hunk[row.side].split('\n')[row.line], row.text);
  }
  assert.equal(preview.raw, raw);
});
test('no-newline notes never enter source documents, while empty added/removed lines still do', () => {
  const rows = [{ type: 'removed', text: '' }, { type: 'added', text: '' }, { type: 'added', text: 'end' }, { type: 'note', text: '\\ No newline at end of file' }];
  const [hunk] = previewHunks(rows);
  assert.equal(hunk.before, ''); assert.equal(hunk.after, '\nend');
  assert.equal(hunk.rows.at(-1).side, null); assert.equal(hunk.rows.at(-1).text, rows.at(-1).text);
});

test('file highlight language handles both sides of a rename, uppercase suffixes, and unsupported paths honestly', () => {
  assert.equal(fileHighlightLanguage('old/name.py'), 'python');
  assert.equal(fileHighlightLanguage('new/name.TS'), 'typescript');
  assert.equal(fileHighlightLanguage('C:\\src\\app.js'), 'javascript');
  assert.equal(fileHighlightLanguage('unknown.extension'), 'text');
  assert.equal(fileHighlightLanguage('/parent.ts/no-extension'), 'text');
});

// R09: the original resolver (c41eb0199-C-RzbqEe.js `n` + r(), wrapped by g() in code-language-current.js:78-85).
test('file highlight language follows the original 345-key map: exact name, compound suffix, last extension, else text', async () => {
  const { FILE_EXTENSION_LANGUAGES, LOCKFILE_LANGUAGES } = await import('../src/highlight-languages.mjs');
  const { normalizeLanguage } = await import('../src/highlight-model.mjs');
  const cases = {
    'a.mjs': 'javascript', 'b.cjs': 'javascript', 'x.go': 'go', 'src/lib.rs': 'rust', '.github/ci.yml': 'yml', 'k.yaml': 'yaml',
    'Dockerfile': 'dockerfile', 'CMakeLists.txt': 'cmake', 'CODEOWNERS': 'codeowners', 'Makefile': 'makefile', 'Gemfile': 'ruby',
    'app.component.ts': 'angular-ts', 'src/app/app.component.html': 'angular-html', 'view.blade.php': 'blade', 'x.vine.ts': 'vue-vine',
    'run.sh': 'zsh', 'cfg.toml': 'toml', 'Main.java': 'java', 'a.kt': 'kotlin', 'x.h': 'objective-cpp', 'x.cpp': 'cpp',
    'v.swift': 'swift', 'r.rb': 'ruby', 'i.php': 'php', 's.scss': 'scss', 'c.vue': 'vue', 'q.sql': 'sql', 'm.lua': 'lua',
    'x.unknown': 'text', 'notes.txt': 'text', 'jquery.min.js': 'javascript', 'a.b.component.ts': 'typescript',
    // Lockfiles first (c8a544a8c, lowercased), then the lowercase retry of g().
    'yarn.lock': 'yaml', 'Cargo.lock': 'toml', 'Pipfile.lock': 'json', 'X.PY': 'python', 'DOCKERFILE': 'dockerfile',
  };
  for (const [file, language] of Object.entries(cases)) assert.equal(fileHighlightLanguage(file), language, file);
  assert.equal(fileHighlightLanguage(''), 'text');
  assert.equal(fileHighlightLanguage('constructor'), 'text', 'own keys only');
  assert.equal(Object.keys(FILE_EXTENSION_LANGUAGES).length, 345);
  assert.equal(Object.keys(LOCKFILE_LANGUAGES).length, 16);
  for (const [key, value] of [...Object.entries(FILE_EXTENSION_LANGUAGES), ...Object.entries(LOCKFILE_LANGUAGES)])
    assert.ok(normalizeLanguage(value), `${key} -> ${value} normalizes`);
});

test('generated map keeps the generated header and the grammar loaders file untouched by the map', async () => {
  const fs = await import('node:fs');
  const languages = fs.readFileSync(new URL('../src/highlight-languages.mjs', import.meta.url), 'utf8');
  assert.match(languages, /^\/\/ Generated by scripts\/generate-highlight-languages\.mjs from the original\n/);
  assert.match(languages, /export const FILE_EXTENSION_LANGUAGES = Object\.freeze\(\{\n  __proto__: null,\n  "1c": "1c",/);
  const loaders = fs.readFileSync(new URL('../src/highlight-grammar-loaders.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(loaders, /FILE_EXTENSION_LANGUAGES|c41eb0199/);
});

test('preview kinds, media kinds and the file:// preview URL', async () => {
  const { filePreviewKind, fileMediaKind, filePreviewUrl } = await import('../src/file-preview-model.mjs');
  assert.deepEqual(filePreviewKind('docs/README.md'), { kind: 'markdown', delimiter: null });
  assert.deepEqual(filePreviewKind('a.MDX'), { kind: 'markdown', delimiter: null });
  assert.deepEqual(filePreviewKind('data.csv'), { kind: 'csv', delimiter: ',' });
  assert.deepEqual(filePreviewKind('data.tsv'), { kind: 'csv', delimiter: '\t' });
  assert.equal(filePreviewKind('app.js'), null);
  for (const [file, kind] of [['photo.PNG', 'image'], ['a.jpeg', 'image'], ['b.avif', 'image'], ['c.svg', null], ['clip.mp4', 'video'], ['clip.MOV', 'video'],
    ['song.mp3', 'audio'], ['x.oga', 'audio'], ['x.mkv', null], ['notes.txt', null]]) assert.equal(fileMediaKind(file), kind, file);
  assert.equal(filePreviewUrl('/w/a b/photo.png'), 'file:///w/a%20b/photo.png');
  assert.equal(new URL(filePreviewUrl('/w/shot #1?.png')).pathname, '/w/shot%20%231%3F.png', "'#' and '?' stay in the path");
});

// B13 (2.31226.0 cd2efac6e Ql :6783-6799): .htm/.html and .svg take the sandbox arm; a PDF is shown like media.
test('B13 preview kinds: html and svg previews, pdf media, the SVG image URL and the frame link message', async () => {
  const { filePreviewKind, fileMediaKind, svgPreviewUrl, previewFrameLink, PREVIEW_FRAME_LINK } = await import('../src/file-preview-model.mjs');
  assert.deepEqual(filePreviewKind('site/index.html'), { kind: 'html', delimiter: null });
  assert.deepEqual(filePreviewKind('OLD.HTM'), { kind: 'html', delimiter: null });
  assert.deepEqual(filePreviewKind('logo.SVG'), { kind: 'svg', delimiter: null });
  assert.equal(filePreviewKind('page.xhtml'), null);
  assert.equal(filePreviewKind('index.html.bak'), null);
  assert.equal(fileMediaKind('docs/Spec.PDF'), 'pdf');
  assert.equal(fileMediaKind('logo.svg'), null, 'svg is text with a preview, not media');
  assert.equal(svgPreviewUrl('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E');
  assert.deepEqual(previewFrameLink({ type: PREVIEW_FRAME_LINK, href: 'https://example.com/a?b#c', metaKey: true, button: 0 }),
    { href: 'https://example.com/a?b#c', event: { button: 0, metaKey: true, ctrlKey: false, shiftKey: false, altKey: false } });
  assert.equal(previewFrameLink({ type: PREVIEW_FRAME_LINK, href: 'http://localhost:5173/', button: 1 }).event.button, 1);
  for (const data of [null, 'x', { type: 'other', href: 'https://a.b/' }, { type: PREVIEW_FRAME_LINK, href: 'javascript:alert(1)' },
    { type: PREVIEW_FRAME_LINK, href: 'file:///etc/passwd' }, { type: PREVIEW_FRAME_LINK, href: 'not a url' }, { type: PREVIEW_FRAME_LINK, href: 1 }])
    assert.equal(previewFrameLink(data), null, JSON.stringify(data));
});

test('B13 review: the frame link "ask" checks (cd2efac6e za, cfdfec14c U/W)', async () => {
  const { previewLinkWritten, externalLinkWarnings } = await import('../src/file-preview-model.mjs');
  const html = '<p><a class="x" href="https://example.com/a?b=1">a</a> <a href=\'http://b.org\'>b</a> <a href=rel.html>r</a></p>';
  assert.equal(previewLinkWritten(html, 'https://example.com/a?b=1'), true);
  assert.equal(previewLinkWritten(html, 'http://b.org/'), true, 'compared as resolved hrefs');
  assert.equal(previewLinkWritten(html, 'https://evil.example/'), false, 'a link a script made up is not written');
  const many = Array.from({ length: 257 }, (_, i) => `<a href="https://e.com/${i}">x</a>`).join('');
  assert.equal(previewLinkWritten(many, 'https://e.com/0'), false, 'more than Ia = 256 written links always ask');
  assert.deepEqual(externalLinkWarnings('https://xn--mnchen-3ya.de/x'), { hasPunycode: true, decodedHostname: 'münchen.de', hasUserinfo: false, host: null });
  assert.deepEqual(externalLinkWarnings('https://user:pw@evil.com:8443/'), { hasPunycode: false, decodedHostname: null, hasUserinfo: true, host: 'evil.com:8443' });
  assert.deepEqual(externalLinkWarnings('https://example.com/'), { hasPunycode: false, decodedHostname: null, hasUserinfo: false, host: null });
});

test('CSV preview parse (c02d6193d p): header detection, quotes, delimiter sniffing and the limits', async () => {
  const { parseCsvPreview, csvTruncationCaption } = await import('../src/file-preview-model.mjs');
  assert.deepEqual(parseCsvPreview('name,count\nalpha,1\n"b, c",2\n', ','),
    { kind: 'ok', parsed: { rows: [['name', 'count'], ['alpha', '1'], ['b, c', '2']], hasHeader: true, rowsTruncated: false, colsTruncated: false, cellsTruncated: false } });
  assert.equal(parseCsvPreview('a,b\n1,2\n', ',').parsed.hasHeader, true);
  assert.equal(parseCsvPreview('1,2\n3,4\n', ',').parsed.hasHeader, false, 'numbers are not labels');
  assert.deepEqual(parseCsvPreview('a;b;c\nx;y;z\n', ',').parsed.rows[0], ['a', 'b', 'c'], 'semicolons sniffed');
  assert.deepEqual(parseCsvPreview('"say ""hi""",x\n\n\nlast', ',').parsed.rows, [['say "hi"', 'x'], ['last', '']], 'escaped quotes, empty lines skipped, rows padded');
  assert.deepEqual(parseCsvPreview('', ','), { kind: 'empty' });
  // relax_quotes (c63ad9d34 CSV_INVALID_CLOSING_QUOTE branch): text after a
  // closing quote keeps both quotes in the field; a bare quote mid-field is text.
  assert.deepEqual(parseCsvPreview('"a"b,c\n', ',').parsed.rows, [['"a"b', 'c']], 'text after a closing quote');
  assert.deepEqual(parseCsvPreview('x,"a" "b"\nsay "hi",2\n', ',').parsed.rows, [['x', '"a" "b"'], ['say "hi"', '2']]);
  // skip_empty_lines keeps a line whose one field was quoted (wasQuoting).
  assert.deepEqual(parseCsvPreview('a\n""\n\nb\n', ',').parsed.rows, [['a'], [''], ['b']]);
  // The only error left with relax_quotes: an unclosed quote with no complete record before it.
  assert.deepEqual(parseCsvPreview('"a,b\n', ','), { kind: 'error' });
  const open = parseCsvPreview('a,b\n"unterminated,c\n', ',');
  assert.deepEqual([open.kind, open.parsed.rows, open.parsed.rowsTruncated], ['ok', [['a', 'b']], true], 'an unclosed quote keeps the complete records');
  const many = parseCsvPreview(Array.from({ length: 600 }, (_, index) => `r${index},${'x'.repeat(index === 1 ? 400 : 1)}`).join('\n'), ',');
  assert.equal(many.parsed.rows.length, 500);
  assert.deepEqual([many.parsed.rowsTruncated, many.parsed.cellsTruncated], [true, true]);
  assert.equal(many.parsed.rows[1][1].length, 301);
  const wide = parseCsvPreview(Array.from({ length: 70 }, (_, index) => `c${index}`).join(','), ',');
  assert.deepEqual([wide.parsed.rows[0].length, wide.parsed.colsTruncated], [64, true]);
  assert.equal(csvTruncationCaption({ rowCount: 500, columnCount: 64, rowsTruncated: true, colsTruncated: true, cellsTruncated: true }),
    'Showing the first 500 rows and 64 columns. Long cells are shortened. Switch to Source to see more.');
  assert.equal(csvTruncationCaption({ rowCount: 1, columnCount: 2, rowsTruncated: true, colsTruncated: false, cellsTruncated: false }), 'Showing the first 1 row. Switch to Source to see more.');
  assert.equal(csvTruncationCaption({ rowCount: 3, columnCount: 64, rowsTruncated: false, colsTruncated: true, cellsTruncated: false }), 'Showing the first 64 columns. Switch to Source to see more.');
  assert.equal(csvTruncationCaption({ rowCount: 3, columnCount: 2, rowsTruncated: false, colsTruncated: false, cellsTruncated: true }), 'Long cells are shortened. Switch to Source to see more.');
});
