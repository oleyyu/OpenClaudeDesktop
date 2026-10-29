import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { viewTabsManifestFor } from '../scripts/view-tabs-compat.mjs';
import { parseCsvPreview } from '../src/generated/code-current/csv-parser.mjs';
import { v as isMissing, b as number, E as dateValue, re as columnType, ie as sortedRows, ae as searchRows, oe as filteredRows, ue as numericColumns } from '../src/generated/code-current/csv-model.mjs';

const officialDir = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const officialCsv = 'cd5fd9055-BXQRn_nx.js';

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

test('3.6556.2 cd5fd9055 y: an ISO date keeps its fraction as milliseconds (first three digits, right-padded)', () => {
  const official = fs.readFileSync(path.join(officialDir, officialCsv), 'utf8');
  assert.ok(official.includes('Number(l.slice(0,3).padEnd(3,"0"))'));
  assert.ok(official.includes('(?::(\\d{2})(?:[.,](\\d+))?)?'));
  const model = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/csv-model.mjs'), 'utf8');
  assert.match(model, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  const base = new Date(2026, 9, 15, 10, 0, 0).getTime();
  assert.equal(dateValue('2026-10-15 10:00:00'), base);
  assert.equal(dateValue('2026-10-15 10:00:00.5'), base + 500);
  assert.equal(dateValue('2026-10-15T10:00:00,25'), base + 250);
  assert.equal(dateValue('2026-10-15 10:00:00.123456'), base + 123);
  const stamps = [['2026-10-15 10:00:00.900'], ['2026-10-15 10:00:00.1'], ['2026-10-15 10:00:00.45']];
  assert.equal(columnType(stamps, 0), 'date');
  assert.deepEqual(sortedRows(stamps, { column: 0, direction: 'asc' }, 'date', 'en'), [1, 2, 0]);
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

test('3.6556.2 cd5fd9055 b: footnotes and the unsorted sort button are text-muted-as-secondary; the filter field holds its w-56 width until it lands', async () => {
  const official = fs.readFileSync(path.join(officialDir, officialCsv), 'utf8');
  assert.equal(official.split('text-footnote text-muted-as-secondary').length - 1, 3);
  assert.ok(official.includes('className:i===null?"text-muted-as-secondary":"text-primary"'));
  assert.doesNotMatch(official, /"text-muted"|w-\[14rem\]/);
  assert.ok(official.includes('ve="w-56"'));
  assert.ok(official.includes('"aria-hidden":!0,"data-testid":"csv-filter-field-hold",className:`${ve} shrink-0`'));
  // Every import alias the slice binds, as the official chunk imports it.
  assert.ok(official.includes('import{Ba as e,Co as t,Ha as n,Ua as r,_o as i,mo as a,wo as o}from"./vendor-frame-CnSY1sxv.js"'));
  assert.match(official, /import\{\$f as J2,Eu as s,Jf as I3,Qf as J1,Xf as I5,Zf as J0,ap as K0,cp as K3,dp as Z1,ep as J3,ip as J9,lp as K4,np as J5,od as c,op as K1,sp as K2,tp as J4,up as K5,vs as l\}from"\.\/shared-frame-6jtSkIit\.js"/);
  assert.ok(official.includes('import{nS as u}from"./shared-78-D5Fw2h0a.js"'));
  assert.ok(official.includes('import{l as d,p as ee}from"./vendor-intl-DYfox5Co.js"'));
  assert.ok(official.includes('import{Vs as te}from"./shared-156-BLTosN8U.js"'));
  assert.ok(official.includes('import{gn as ne,hn as re}from"./c68c4283d-CWbOoVxS.js"'));
  assert.ok(official.includes('import{t as ie}from"./cc0a875c8-Ba9KI-Fw.js"'));
  assert.ok(official.includes('import{l as ae,m as oe}from"./c3fde7009-LYGOoUpG.js"'));
  assert.ok(official.includes('import{t as se}from"./c02d6193d-C2yr-dVD.js"'));
  const frame = fs.readFileSync(path.join(officialDir, 'c3fde7009-LYGOoUpG.js'), 'utf8');
  assert.match(frame, /export\{[^}]*\bcn as l\b[^}]*\}/);
  assert.match(frame, /export\{[^}]*\blt as m\b[^}]*\}/);
  assert.ok(frame.includes('className:"epitaxy-document-column","data-width":i,children:t'));
  const generated = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/csv-view.mjs'), 'utf8');
  assert.match(generated, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  assert.match(generated, /import \{ clsx as e \} from "\.\.\/view-tabs\/vendor-frame-CnSY1sxv\.js";/);
  assert.match(generated, /CdsButton as s,\s*CdsIcon as c,\s*CdsTextInput as l,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(generated, /reactMemoCache as J9,[\s\S]*memoStoreDeps1 as Z1,?\s*\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.doesNotMatch(generated, /CsvTextInput|generated\/chat|view-tabs\/index\.js/);
  const frameOut = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/document-frame.mjs'), 'utf8');
  assert.match(frameOut, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  assert.match(frameOut, /export \{ ct as PrintContext, lt as usePrintRegistration, cn as DocumentColumn \};/);
  // view-tabs publishes these names from the 3.6556.2 graph the slice imports.
  const names = (await viewTabsManifestFor('3.6556.2')).publicNames;
  assert.deepEqual([names.CdsButton.export, names.CdsIcon.export, names.clsx.export, names.CdsTextInput.export], ['Eu', 'od', 'Ba', 'vs']);
  assert.deepEqual([names.CdsTextInput.file, names.CdsButton.file, names.clsx.file], ['shared-frame-6jtSkIit.js', 'shared-frame-6jtSkIit.js', 'vendor-frame-CnSY1sxv.js']);
  const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/code-current/manifest.json'), 'utf8'));
  for (const [target, source] of [['csv-model.mjs', officialCsv], ['csv-view.mjs', officialCsv], ['document-frame.mjs', 'c3fde7009-LYGOoUpG.js']]) {
    const entry = manifest.modules.find(module => module.target === target);
    assert.equal(entry.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry.source), source, target);
  }
  const adapters = fs.readFileSync(path.resolve(import.meta.dirname, '../src/source-csv-adapters.jsx'), 'utf8');
  assert.doesNotMatch(adapters, /CsvButton|CsvIcon|SourceSettingsButton/);
  // The field b renders (after paint, so not in SSR): CdsTextInput sm, w-56, clearable, the Search icon slot.
  const { CdsTextInput, CdsIcon } = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  const field = (value) => renderToStaticMarkup(React.createElement(CdsTextInput, { size: 'sm', fullWidth: false, className: 'w-56', value, onChange() {}, clearable: true, onClear() {},
    slotStart: React.createElement(CdsIcon, { name: 'Search', size: 'sm', 'aria-hidden': true }), placeholder: 'Filter rows', 'aria-label': 'Filter rows', 'aria-controls': 'x-table' }));
  const empty = field('');
  assert.match(empty, /^<div data-cds="TextInput" data-size="sm"[^>]*class="[^"]*w-56[^"]*"><span class="flex shrink-0 items-center [^"]*"><span data-cds="Icon"/);
  assert.match(empty, /<input[^>]*aria-label="Filter rows"[^>]*aria-controls="x-table"/);
  assert.doesNotMatch(empty, /aria-label="Clear"/, 'clearable shows the X only with a value');
  assert.match(field('a'), /<button type="button" data-cds="Button"[^>]*aria-label="Clear"/);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8'), /\.w-56\{width:calc\(var\(--spacing\) \* 56\)\}/);

  const document = renderToStaticMarkup(React.createElement(Csv, { text: 'name,count\na,1\nb,2', delimiter: ',', presentation: 'document', truncatedUpstream: true }));
  assert.match(document, /<span class="text-footnote text-muted-as-secondary tabular-nums" aria-live="polite">2 rows<\/span>/);
  assert.match(document, /<p id="[^"]+-tail" class="text-footnote text-muted-as-secondary px-xl py-sm">This preview may be missing its end\.<\/p>/);
  // Before the field lands (SSR never paints) its slot is the aria-hidden w-56 hold, then the row count.
  assert.match(document, /<div data-pane-line="" class="[^"]*"><span aria-hidden="true" data-testid="csv-filter-field-hold" class="w-56 shrink-0"><\/span><span class="text-footnote text-muted-as-secondary tabular-nums"/);
  assert.doesNotMatch(document, /data-cds="TextInput"/);
  const sort = document.match(/<button type="button" data-cds="Button"[^>]*aria-label="Sort by count">.*?<\/button>/)?.[0];
  assert.ok(sort, 'the count header carries the CDS sort button');
  assert.match(sort, /data-cds-icon-only="" data-cds-ghost="" data-size="xs"/);
  assert.match(sort, / text-muted-as-secondary" aria-label=/);
  assert.match(sort, /<span data-cds="Icon"[^>]*aria-hidden="true">\u{E02C}<\/span>/u); // CaretUpDown, unsorted
  const pane = renderToStaticMarkup(React.createElement(Csv, { text: 'a,b\nx,y', delimiter: ',', truncatedUpstream: true }));
  assert.match(pane, /<p id="[^"]+-tail" class="text-footnote text-muted-as-secondary px-0\.75">/);
  // The class is an official @layer utilities rule; no unlayered local rule targets the CSV text or the class.
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8'), /\.text-muted-as-secondary\{color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\}/);
  const srcDir = path.resolve(import.meta.dirname, '../src');
  for (const file of fs.readdirSync(srcDir).filter(name => name.endsWith('.css')))
    assert.doesNotMatch(fs.readFileSync(path.join(srcDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), /\.text-muted-as-secondary|epitaxy-document-csv|data-file-preview=["']?csv/, file);
});

test('3.6556.2 cd5fd9055 b/he: the empty state and the shortened-cells notices render through the compiled branches', () => {
  const empty = renderToStaticMarkup(React.createElement(Csv, { text: '', delimiter: ',', presentation: 'document' }));
  assert.match(empty, /This file is empty/);
  assert.doesNotMatch(empty, /Switch to Source to view the raw text\.|<table/);
  const long = 'name,count\n' + 'a'.repeat(400) + ',1\n';
  const document = renderToStaticMarkup(React.createElement(Csv, { text: long, delimiter: ',', presentation: 'document' }));
  assert.match(document, /<p id="[^"]+-cap" class="text-footnote text-muted-as-secondary px-xl py-sm">Long cells are shortened\. Switch to Source to see more\.<\/p>/);
  assert.match(document, /<p class="epitaxy-document-print-note"> Long cells are shortened\.<\/p>/);
  assert.match(document, /aria-describedby="[^"]+-cap"/);
  const pane = renderToStaticMarkup(React.createElement(Csv, { text: long, delimiter: ',' }));
  assert.match(pane, /<p id="[^"]+-cap" class="text-footnote text-muted-as-secondary px-0\.75">Long cells are shortened\. Switch to Source to see more\.<\/p>/);
  assert.doesNotMatch(pane, /epitaxy-document-print-note|csv-filter-field-hold/);
});

test('the current breadcrumb copy control labels its full path and uses control typography', () => {
  const markup = renderToStaticMarkup(React.createElement(Breadcrumb, { displayPath: 'a.txt', fullPath: '/repo/a.txt', onCopyPath() {} }));
  assert.match(markup, /font-normal font-control/);
  assert.match(markup, /hover:bg-fill-ghost-hover/);
  assert.match(markup, /aria-label="Copy path \/repo\/a.txt"/);
  assert.doesNotMatch(markup, /title=/);
});
