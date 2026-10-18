import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { parseCsvPreview } from '../src/generated/code-current/csv-parser.mjs';
import { v as isMissing, b as number, re as columnType, ie as sortedRows, ae as searchRows, oe as filteredRows, ue as numericColumns } from '../src/generated/code-current/csv-model.mjs';

let server, Csv, Breadcrumb;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceFileCsv: Csv, SourceFileBreadcrumb: Breadcrumb } = await server.ssrLoadModule('/src/source-file-viewer.jsx'));
});
after(() => server?.close());

test('formatted amounts remain numeric while versions and IP addresses remain text', () => {
  for (const [input, expected] of [['1,234.50', 1234.5], ['1.234,50', 1234.5], ['1.234.567', 1234567], ['($2,000)', -2000], ['1.5k', 1500], ['12%', 12]]) assert.equal(number(input), expected);
  for (const input of ['1.2.3', '192.168.1.1', '1,23,456', 'text']) assert.ok(Number.isNaN(number(input)), input);
  const rows = [['12', '1.2.3', '192.168.1.1', 'none'], ['—', '1.2.4', '10.0.0.1', 'NULL'], ['1.234.567', '-', 'N/A', '']];
  assert.deepEqual([...numericColumns(rows)], [0]);
  assert.equal(columnType(rows, 0), 'number');
  assert.equal(columnType(rows, 1), 'text');
  assert.equal(columnType(rows, 3), 'text');
  for (const input of ['', '-', '–', '—', 'N/A', 'na', 'null', 'NaN', 'none']) assert.equal(isMissing(input), true);
});

test('sorting is stable, natural and leaves missing values last in both directions', () => {
  const rows = [['$10'], ['—'], ['$2'], ['$2'], ['none'], ['($5)']];
  assert.deepEqual(sortedRows(rows, { column: 0, direction: 'asc' }, 'number', 'en'), [5, 2, 3, 0, 1, 4]);
  assert.deepEqual(sortedRows(rows, { column: 0, direction: 'desc' }, 'number', 'en'), [0, 2, 3, 5, 1, 4]);
  assert.deepEqual(sortedRows([['file10'], ['File2'], ['file2'], ['']], { column: 0, direction: 'asc' }, 'text', 'en'), [1, 2, 0, 3]);
  const dates = [['2026-10-15'], ['Oct 1st, 2026'], ['—'], ['2026-10-02']];
  assert.equal(columnType(dates, 0), 'date');
  assert.deepEqual(sortedRows(dates, { column: 0, direction: 'asc' }, 'date', 'en'), [1, 3, 0, 2]);
});

test('row filtering preserves sorted order and searches every cell case-insensitively', () => {
  const rows = [['Alpha', '9'], ['Beta', '2'], ['ALPHA', '1'], ['gamma', '3']];
  const sorted = sortedRows(rows, { column: 1, direction: 'asc' }, 'number', 'en');
  assert.deepEqual(filteredRows(searchRows(rows), sorted, 'alpha'), [2, 0]);
  assert.deepEqual(filteredRows(searchRows(rows), sorted, '2'), [1]);
  assert.deepEqual(filteredRows(searchRows(rows), sorted, 'absent'), []);
});

test('current parser retains quoted multiline cells and never truncates inside a surrogate pair', () => {
  const result = parseCsvPreview('name,count\n"a\nb",1\n"x""y",2\n', ',');
  assert.deepEqual(result.parsed.rows, [['name', 'count'], ['a\nb', '1'], ['x"y', '2']]);
  const cell = parseCsvPreview('a'.repeat(299) + '😀z,1', ',').parsed;
  assert.equal(cell.rows[0][0], 'a'.repeat(299) + '…');
  assert.equal(cell.cellsTruncated, true);
  const partial = parseCsvPreview('name,count\nfirst,1\n"unfinished', ',').parsed;
  assert.deepEqual(partial.rows, [['name', 'count'], ['first', '1']]);
  assert.equal(partial.rowsTruncated, true);
});

test('document CSV exposes numeric cells and sort controls; pane mode retains its simple table', () => {
  const props = { text: 'name,count\na,1\nb,2', delimiter: ',' };
  const document = renderToStaticMarkup(React.createElement(Csv, { ...props, presentation: 'document', truncatedUpstream: true }));
  assert.match(document, /data-pane-line=""/);
  assert.match(document, /epitaxy-document-csv-page epitaxy-document-page/);
  assert.match(document, /epitaxy-document-column" data-width="content"/);
  assert.match(document, /aria-label="Sort by count"/);
  assert.equal((document.match(/aria-sort="none"/g) ?? []).length, 2);
  assert.match(document, /<td data-numeric="true">2<\/td>/);
  assert.match(document, /This preview may be missing its end\./);
  assert.match(document, /aria-describedby="[^"]+-tail"/);
  const pane = renderToStaticMarkup(React.createElement(Csv, props));
  assert.doesNotMatch(pane, /aria-sort|data-numeric|data-pane-line/);
  assert.match(pane, /class="h-full epitaxy-markdown"/);
});

test('2.42304.0 cd5fd9055 D: footnotes are text-muted-as-secondary; sort buttons and the filter field are the original CdsButton/CdsIcon/CdsTextInput', async () => {
  const official = fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/cd5fd9055-CiZdOOG4.js'), 'utf8');
  assert.equal(official.split('text-footnote text-muted-as-secondary').length - 1, 3);
  assert.doesNotMatch(official, /text-footnote text-muted[ "]/);
  assert.match(official, /import\{Hl as l,cl as u,ho as d\}from"\.\/shared-frame-BfjMqbuN\.js"/);
  const generated = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/csv-view.mjs'), 'utf8');
  assert.match(generated, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  assert.match(generated, /import \{ clsx as s \} from "\.\.\/view-tabs\/vendor-frame-DfPJ1QmD\.js";/);
  // R3-files FT-18: the filter field is shared-frame ho (local tx), view-tabs CdsTextInput (R3-graph, D24), no longer the
  // chat generator's 2.2553.1 Bh.
  assert.match(generated, /CdsButton as u,\s*CdsIcon as l,\s*CdsTextInput as d,?\s*\} from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js";/);
  assert.doesNotMatch(generated, /CsvTextInput|generated\/chat/);
  const names = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
  assert.deepEqual([names.CdsButton.export, names.CdsIcon.export, names.clsx.export, names.CdsTextInput.export], ['cl', 'Hl', 'za', 'ho']);
  assert.deepEqual([names.CdsTextInput.file, names.CdsTextInput.local], ['shared-frame-BfjMqbuN.js', 'tx']);
  const adapters = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-csv-adapters.jsx'), 'utf8');
  assert.doesNotMatch(adapters, /CsvButton|CsvIcon|SourceSettingsButton/);
  // The field D renders (after paint, so not in SSR): CdsTextInput sm, w-[14rem], clearable, the Search icon slot.
  const { CdsTextInput, CdsIcon } = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  const field = (value) => renderToStaticMarkup(React.createElement(CdsTextInput, { size: 'sm', fullWidth: false, className: 'w-[14rem]', value, onChange() {}, clearable: true, onClear() {},
    slotStart: React.createElement(CdsIcon, { name: 'Search', size: 'sm', 'aria-hidden': true }), placeholder: 'Filter rows', 'aria-label': 'Filter rows', 'aria-controls': 'x-table' }));
  const empty = field('');
  assert.match(empty, /^<div data-cds="TextInput" data-size="sm"[^>]*class="[^"]*w-\[14rem\][^"]*"><span class="flex shrink-0 items-center [^"]*"><span data-cds="Icon"/);
  assert.match(empty, /<input[^>]*aria-label="Filter rows"[^>]*aria-controls="x-table"/);
  assert.doesNotMatch(empty, /aria-label="Clear"/, 'clearable shows the X only with a value');
  assert.match(field('a'), /<button type="button" data-cds="Button"[^>]*aria-label="Clear"/);

  const document = renderToStaticMarkup(React.createElement(Csv, { text: 'name,count\na,1\nb,2', delimiter: ',', presentation: 'document', truncatedUpstream: true }));
  assert.match(document, /<span class="text-footnote text-muted-as-secondary tabular-nums" aria-live="polite">2 rows<\/span>/);
  assert.match(document, /<p id="[^"]+-tail" class="text-footnote text-muted-as-secondary px-xl py-sm">This preview may be missing its end\.<\/p>/);
  const sort = document.match(/<button type="button" data-cds="Button"[^>]*aria-label="Sort by count">.*?<\/button>/)?.[0];
  assert.ok(sort, 'the count header carries the CDS sort button');
  assert.match(sort, /data-cds-icon-only="" data-cds-ghost="" data-size="xs"/);
  assert.match(sort, / text-muted" aria-label=/);
  assert.match(sort, /<span data-cds="Icon"[^>]*aria-hidden="true">\u{E02C}<\/span>/u); // CaretUpDown, unsorted
  const pane = renderToStaticMarkup(React.createElement(Csv, { text: 'a,b\nx,y', delimiter: ',', truncatedUpstream: true }));
  assert.match(pane, /<p id="[^"]+-tail" class="text-footnote text-muted-as-secondary px-0\.75">/);
  // The class is an official @layer utilities rule; no unlayered local rule targets the CSV text or the class.
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8'), /\.text-muted-as-secondary\{color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\}/);
  const srcDir = path.resolve(import.meta.dirname, '../src');
  for (const file of fs.readdirSync(srcDir).filter(name => name.endsWith('.css')))
    assert.doesNotMatch(fs.readFileSync(path.join(srcDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /\.text-muted-as-secondary|epitaxy-document-csv|data-file-preview=["']?csv/, file);
});

test('the current breadcrumb copy control labels its full path and uses control typography', () => {
  const markup = renderToStaticMarkup(React.createElement(Breadcrumb, { displayPath: 'a.txt', fullPath: '/repo/a.txt', onCopyPath() {} }));
  assert.match(markup, /font-normal font-control/);
  assert.match(markup, /hover:bg-fill-ghost-hover/);
  assert.match(markup, /aria-label="Copy path \/repo\/a.txt"/);
  assert.doesNotMatch(markup, /title=/);
});
