import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

// w12-viewtabs: names view-tabs publishes in W12 (items 8-10 of PROMPT-w12-visible.md) and the D1 copies they retire.
// - item 8 (publish only): shared-frame dV / aV / iV (CDS RadioGroup, its item and indicator), vP / yP (CDS Combobox and
//   its Field wrapper), the Field parts and the Base UI Combobox parts code-routines / cowork-scheduled read.
// - item 9: shared-frame yo / Sh / Ch / wh / Jg / Lo and shared-25 QV, so artifact-library, working-line, code-composer,
//   transcript-rows and sessions-page import them instead of keeping copies; session-rail imports code-current's UV.
// - item 10: cfe7c4b3b se / L / ie, so code-current terminal-tab-overflow.mjs re-exports instead of slicing.
// Official chunks are read as text, never executed. SSR in middleware mode only.
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const official = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
const manifest = JSON.parse(read('src/generated/view-tabs/manifest.json'));
const SF = 'shared-frame-6jtSkIit.js', VF = 'vendor-frame-CnSY1sxv.js';
const published = {
  CdsRadioGroup: [SF, 'dV', 'yt'], CdsRadioGroupItem: [SF, 'aV'], CdsRadioIndicator: [SF, 'iV'],
  CdsCombobox: [SF, 'vP', 'Ci'], CdsComboboxField: [SF, 'yP', 'Si'],
  CdsLabeledField: [SF, 'Qj', 'Ni'], CdsField: [SF, 'Jj', 'Mi'], CdsFieldLabel: [SF, 'Yj', 'ji'], CdsFieldDescription: [SF, 'Xj', 'ki'],
  CdsFieldError: [SF, 'Zj', 'Ai'], useCdsFieldLabelId: [SF, 'GS', 'js'], cdsControlBaseClass: [SF, 'QS', 'Es'],
  cdsFieldSurfaceHoverClass: [SF, '$S', 'Ds'], cdsFieldIconSlotClass: [SF, 'eC', 'Os'], cdsComboboxItemMatches: [SF, 'nN', 'wi'],
  useCdsRootRemPx: [SF, 'Lo', 'pd'],
  cdsIconAliases: [SF, 'yo', 'md'], reducedMotionQuery: [SF, 'Sh'], reduceMotionAttribute: [SF, 'Ch'], prefersReducedMotion: [SF, 'wh', 'Hl'],
  CdsSpark: [SF, 'Jg', 'bl'], setToggle: ['shared-25-DOWZRSlq.js', 'QV', 'Zn'],
  BaseComboboxRoot: [VF, 'P_', 'J'], BaseComboboxInput: [VF, 'Z_', 'W'], BaseComboboxTrigger: [VF, '$_', 'U'], BaseComboboxStatus: [VF, 'cv', 'B'],
  BaseComboboxEmpty: [VF, 'Nv', 'k'], BaseComboboxItem: [VF, 'Tv', 'P'], BaseComboboxItemIndicator: [VF, 'Ev', 'N'], BaseComboboxGroup: [VF, '_v', 'I'],
  BaseComboboxGroupLabel: [VF, 'vv', 'F'], BaseComboboxList: [VF, 'iv', 'V'], BaseComboboxPopup: [VF, 'mv', 'L'], BaseComboboxPositioner: [VF, 'fv', 'R'],
  BaseComboboxPortal: [VF, 'dv', 'z'],
  viewTabRtlArrowKey: ['cfe7c4b3b-BF79K6ux.js', 'L'], viewTabOverflowTypeaheadResetKeys: ['cfe7c4b3b-BF79K6ux.js', 'ie'],
  // w12 viewtabs-cont: for the settings / diff / side-chat lanes.
  CdsTextInputField: [SF, 'eM', 'Oi'], CdsTextAreaField: [SF, 'tM', 'Di'], cdsCheckboxRowClass: [SF, 'DS', 'Fs'],
  cdsCheckboxTopAlignClass: [SF, 'OS', 'Ls'], cdsCheckboxDescriptionClass: [SF, 'kS', 'Is'], preventMultiClickSelection: [SF, 'Ks', '$u'],
  CdsCheckboxRow: ['c09817156-D4yWRk21.js', 'h', 't'], cdsDropdownGroupLabelClass: [SF, 'hT', 'qo'], CdsButtonGroup: [SF, 'lF', 'yi'],
  cdsOpenWindow: [SF, 'ua', 'Ud'],
};
let vt;
before(async () => {
  const server = await createServer({ configFile: false, root, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try { vt = await server.ssrLoadModule('/src/generated/view-tabs/index.js'); } finally { await server.close(); }
});

test('each W12 name is published once, at its official local and export alias', () => {
  for (const [name, [file, local, alias]] of Object.entries(published)) {
    assert.deepEqual(manifest.publicNames[name], { file, local, ...(alias ? { export: alias } : {}) }, name);
    const raw = official(file), exportList = raw.slice(raw.lastIndexOf('export{'));
    if (alias) assert.ok(exportList.includes(`${local} as ${alias},`) || exportList.includes(`${local} as ${alias}}`), `${file} exports ${local} as ${alias}`);
    else assert.ok(!new RegExp(`[{,]${local.replace(/\$/g, '\\$')} as `).test(exportList), `${file} does not export ${local}`);
    assert.ok(read(`src/generated/view-tabs/${file}`).includes(`${local} as ${name}`), `${file}: ${local} as ${name}`);
    assert.equal(typeof vt[name] === 'undefined', false, `facade exports ${name}`);
  }
});

test('official 3.6556.2 text of the RadioGroup, Combobox field and Spark', () => {
  const frame = official(SF);
  assert.ok(frame.includes('dV=Object.assign(lV,{Root:uV,Item:oV,Card:cV})'));
  assert.ok(frame.includes('Q("cds-reset group/rd inline-flex",m,"gap-2 border-0 outline-none focus-visible:outline-hidden text-start text-body font-normal text-primary data-[disabled]:opacity-disabled",o)'));
  assert.equal(frame.split('"data-cds":"RadioGroup"').length - 1, 2);
  assert.ok(frame.includes('o.mode!=="input"&&o.triggerMode!=="chips"'));
  assert.ok(frame.includes('Sh="(prefers-reduced-motion: reduce)",Ch="data-reduce-motion";function wh(){'));
  assert.ok(frame.includes('"data-cds":"Spark",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 100 100"'));
  assert.ok(official('shared-25-DOWZRSlq.js').includes('function QV(e,t){return ZV(e,t,!e.has(t))}'));
});

test('SSR: CdsRadioGroup renders the official radio items; CdsSpark the official svg', () => {
  const html = renderToStaticMarkup(React.createElement(vt.CdsRadioGroup, {
    value: 'a', onChange() {}, options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', description: 'Second', disabled: true }] }));
  assert.match(html, /data-cds="RadioGroup"/);
  assert.match(html, /class="flex flex-col gap-2 font-sans"/);
  assert.equal(html.split('role="radio"').length - 1, 2);
  assert.match(html, /cds-reset group\/rd inline-flex items-center gap-2 border-0 outline-none/);
  assert.match(html, /cds-reset group\/rd inline-flex items-start gap-2/, 'an item with a description aligns to the start');
  assert.match(html, /<span[^>]*>Alpha<\/span>/);
  assert.match(html, /aria-checked="true"/);
  const spark = renderToStaticMarkup(React.createElement(vt.CdsSpark, { size: 24 }));
  assert.match(spark, /^<svg data-cds="Spark"/);
  assert.match(spark, /fill="var\(--cds-clay, #d97757\)"/);
  assert.match(spark, /--cds-spark-size/);
});

test('pure helpers behave as the official ones', () => {
  assert.deepEqual([...vt.setToggle(new Set(['a']), 'a')], []);
  assert.deepEqual([...vt.setToggle(new Set(['a']), 'b')], ['a', 'b']);
  assert.equal(vt.reducedMotionQuery, '(prefers-reduced-motion: reduce)');
  assert.equal(vt.reduceMotionAttribute, 'data-reduce-motion');
  assert.equal(vt.viewTabRtlArrowKey('ArrowLeft'), 'ArrowRight');
  assert.deepEqual([...vt.viewTabOverflowTypeaheadResetKeys], ['ArrowUp', 'ArrowDown', 'Home', 'End', 'ArrowRight', 'Delete']);
  assert.equal(vt.cdsIconAliases.Animation, 'PlayCircle');
  assert.ok(vt.cdsComboboxItemMatches({ label: 'Café', value: 'x' }, 'cafe'));
});

test('D1: the consumers import these names instead of keeping copies', () => {
  const artifact = JSON.parse(read('src/generated/artifact-library/manifest.json'));
  assert.deepEqual(artifact.viewTabsCopies, [], 'artifact-library copies no view-tabs binding');
  assert.match(read('src/generated/sessions-page/sessions-page-hf.mjs'), /import \{ setToggle as ce \} from "\.\.\/view-tabs\/shared-25-DOWZRSlq\.js";/);
  assert.doesNotMatch(read('src/generated/sessions-page/pure-shared-25.mjs'), /QV|setToggle/);
  assert.match(read('src/generated/working-line/shared-frame.mjs'), /CdsSpark as Jg/);
  assert.match(read('src/generated/session-rail/saved-output.mjs'), /forwardSlashes as UV,[\s\S]*\} from "\.\.\/code-current\/file-output-paths\.mjs";/);
  assert.doesNotMatch(read('src/generated/session-rail/saved-output.mjs'), /function UV\(/);
  assert.match(read('src/generated/code-current/file-output-paths.mjs'), /UV as forwardSlashes/);
  for (const area of ['code-routines', 'cowork-scheduled']) {
    const keys = new Set(JSON.parse(read(`src/generated/${area}/manifest.json`)).modules.flatMap(m => (m.bindings ?? []).map(b => `${path.basename(m.source ?? '')}#${typeof b === 'string' ? b : b.name}`)));
    for (const local of ['yP', 'vP', 'pN', 'Qj', 'Jj']) assert.ok(!keys.has(`${SF}#${local}`), `${area} no longer slices ${local}`);
  }
  // code-composer's frame no longer roots aa / wh (view-tabs cdsNodeOwnerWindow / prefersReducedMotion).
  const frame = read('src/generated/code-composer/chat-composer-frame.mjs');
  assert.doesNotMatch(frame, /\bwh as prefersReducedMotion\b|\baa as ownerWindowOf\b/);
});

// w12 viewtabs-cont: the labeled text field (eM, official `Oi`), the checkbox row (c09817156 h) and the button group (lF).
test('SSR: CdsTextInputField, CdsCheckboxRow and CdsButtonGroup render the official markup', () => {
  const frame = official(SF), row = official('c09817156-D4yWRk21.js');
  assert.ok(frame.includes('b(uC,{ref:t,required:o,...s})'));
  assert.ok(row.includes('s(o,"group/cb items-start self-start",E,h)'));
  assert.ok(frame.includes('DS="inline-flex gap-xs text-start font-sans text-body font-normal text-primary"'));
  const field = renderToStaticMarkup(React.createElement(vt.CdsTextInputField, { label: 'Name', hint: 'Shown to others', defaultValue: 'x' }));
  assert.match(field, /data-cds="Field"/);
  assert.match(field, />Name</);
  assert.match(field, />Shown to others</);
  assert.match(field, /<input[^>]*value="x"/);
  const checkbox = renderToStaticMarkup(React.createElement(vt.CdsCheckboxRow, { label: 'Notify me', description: 'By email', checked: true, onCheckedChange() {} }));
  assert.match(checkbox, /^<div data-cds="Field"/, 'the row sits in Qj (CdsLabeledField) as the official one does');
  assert.match(checkbox, /<label class="inline-flex gap-xs text-start font-sans text-body font-normal text-primary group\/cb items-start self-start cursor-interactive"/);
  assert.match(checkbox, /<span id="[^"]+">Notify me<\/span>/);
  assert.match(checkbox, /class="text-footnote leading-snug [^"]*">By email</);
  assert.match(checkbox, /aria-checked="true"/);
  assert.equal(typeof vt.CdsButtonGroup, 'function');
  assert.equal(vt.preventMultiClickSelection({ detail: 1, button: 0 }), undefined);
  // ua: opens through the node's owner window with the official defaults.
  const opened = [];
  const node = { isConnected: true, ownerDocument: { defaultView: { open: (...a) => opened.push(a) } } };
  assert.equal(vt.cdsOpenWindow(node, 'https://example.com'), true);
  assert.deepEqual(opened, [['https://example.com', '_blank', 'noopener']]);
});

test('D1: code-routines and cowork-scheduled import CdsTextInputField instead of slicing eM', () => {
  for (const area of ['code-routines', 'cowork-scheduled']) {
    const keys = new Set(JSON.parse(read(`src/generated/${area}/manifest.json`)).modules.flatMap(m => (m.bindings ?? []).map(b => `${path.basename(m.source ?? '')}#${typeof b === 'string' ? b : b.name}`)));
    assert.ok(!keys.has(`${SF}#eM`), `${area} no longer slices eM`);
  }
});
