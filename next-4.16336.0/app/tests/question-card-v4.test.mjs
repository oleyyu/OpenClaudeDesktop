import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractQuestionCardV4, ROOTS, LINKED_ROOTS, INNER, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256, QUESTION } from '../scripts/extract-question-card-v4.mjs';

// account2 prestage, region question-card: the 4.16336.0 AskUserQuestion card originals (scripts/extract-question-card-v4.mjs
// -> src/generated/question-card-v4, staged next to the 3.6556.2 src/generated/question-card the host still renders).
// Source only: manifest, the generator's --check, the official chunk text, D1 links, SSR of the rows / title / primary
// button through Vite, and the cut digit listener / row press handlers driven with fakes.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const out = 'src/generated/question-card-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const areaName = a => (typeof a === 'string' ? a : a.area);

let server, gen, facades;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  facades = {};
  for (const file of ['option-row', 'digit-shortcuts', 'row-pointer', 'primary-button', 'card-header', 'answer-option'])
    facades[file] = await server.ssrLoadModule(`/${out}/${file}.mjs`);
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-question-card-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-question-card-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas.map(areaName), ['approval-landing-v4', 'btw-pane-v4', 'routines-shared-v4', 'proposal-group-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const a of manifest.linkedAreas)
    assert.equal(provenance.linkedAreas[areaName(a)].manifestSha256, sha(fs.readFileSync(path.join(app, `src/generated/${areaName(a)}/manifest.json`))), areaName(a));
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractQuestionCardV4({ check: true });
});

test('roots: AST-located, pinned, exported as reviewed; the 3.6556.2 public names exist under the same file names', () => {
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    const spec = r.linkedFrom ? LINKED_ROOTS[`${r.file}#${r.local}`] : ROOTS[r.file][r.local];
    assert.ok(official(r.file).includes(spec.probe), `${r.file}#${r.local} probe`);
    if (r.export) assert.match(official(r.file), new RegExp(`\\b${r.local.replace('$', '\\$')} as ${r.export.replace('$', '\\$')}\\b`), `${r.file} export ${r.export}`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  // Every semantic name a 3.6556.2 module of src/generated/question-card exports is exported by the v4 module of the
  // same file name (the host's import paths only change folder at cutover).
  const old = JSON.parse(local('src/generated/question-card/manifest.json'));
  for (const mod of old.modules) {
    const names = Object.entries(mod.exports).filter(([l, n]) => l !== n || INNER.some(x => x.name === n)).map(([, n]) => n);
    if (!names.length) continue;
    const v4 = facades[mod.target.replace(/\.mjs$/, '')];
    assert.ok(v4, `v4 ${mod.target}`);
    for (const name of names) assert.notEqual(v4[name], undefined, `${mod.target} ${name}`);
  }
});

test('D1: the landing guard, the primary button and every shared state are linked, never cut here', () => {
  const held = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const key of ['c6dc54e94-Ci7MQEoh.js#j', 'c6dc54e94-Ci7MQEoh.js#P', 'c6dc54e94-Ci7MQEoh.js#F', 'c30607cef-DbSe2rPb.js#i',
    'shared-183-B2N6Zy4J.js#AG', 'shared-183-B2N6Zy4J.js#jG', 'shared-26-B-POtn5S.js#qC', 'shared-26-B-POtn5S.js#mC', 'shared-26-B-POtn5S.js#pC',
    'shared-33-DtdykY0y.js#BW', 'cb8c5a88f-Cxti0pWl.js#si', 'cb8c5a88f-Cxti0pWl.js#Zi'])
    assert.ok(!held.has(key), key);
  assert.ok(!manifest.modules.some(m => m.source === 'c6dc54e94-Ci7MQEoh.js' || m.source === 'c30607cef-DbSe2rPb.js'));
  const digits = local(`${out}/digit-shortcuts.mjs`);
  assert.match(digits, /import \{\s*deliberateCardKey as lt,\s*isLandedCard as ut,\s*\} from "\.\.\/approval-landing-v4\/card-landing\.mjs";/);
  assert.match(digits, /export \{ isLandedCard as onLandedCard \} from "\.\.\/approval-landing-v4\/card-landing\.mjs";/);
  assert.match(local(`${out}/primary-button.mjs`), /export \{ i as QuestionPrimaryButton \} from "\.\.\/proposal-group-v4\/c30607cef\.mjs";/);
  const imports = manifest.modules.flatMap(m => m.imports);
  assert.ok(imports.some(i => i.via === 'shared-33-DtdykY0y.js#BW' && i.from === '../cds-core/shared-33.mjs'), 'the compact-header context is cds-core\'s');
  assert.ok(imports.some(i => i.original === 'AG' && i.from === '../cds-core/shared-183.mjs'), 'the soft-prevent registry is cds-core\'s');
});

test('inner expressions: each is the one official arrow of vt, cut byte for byte with vt\'s locals as parameters', () => {
  const text = official(QUESTION);
  for (const x of provenance.inner) {
    const spec = INNER.find(s => s.name === x.name);
    assert.equal(x.sha256, spec.sha256);
    for (const f of spec.features) assert.ok(text.includes(f), `${x.name}: ${f}`);
    assert.deepEqual(x.params, spec.params);
    const file = local(`${out}/${x.module}`);
    assert.match(file, new RegExp(`var ${x.name} =\\s*\\(\\{ ${x.params.map(p => p.replace('$', '\\$')).join(', ')} \\}\\) =>`));
  }
  assert.deepEqual(provenance.inner.map(x => x.name), ['questionDigitShortcuts', 'questionRowMouseDown', 'questionEndsDragSelect']);
});

test('_t: the option row is the shared answer button with the keycap on single-select rows, the CDS checkbox on multiSelect rows', () => {
  const row = props => renderToStaticMarkup(h(gen.QuestionOptionRow, { option: { label: 'Postgres', description: 'Server' },
    index: 1, isSelected: false, isHighlighted: false, isMultiSelect: false, showDigitHint: true, onRowMouseDown() {}, endsDragSelect: () => false,
    onOptionClick() {}, ...props }));
  const single = row();
  assert.match(single, /^<button type="button" data-question-answer="" class="flex items-center gap-sm rounded-\[5px\] px-md py-md text-start bg-alpha-1 hover:bg-alpha-2 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus">/);
  assert.match(single, /<div id="[^"]+" class="relative flex min-w-0 flex-1 flex-col select-text gap-0\.5">/);
  assert.match(single, /class="whitespace-pre-wrap text-footnote text-muted-as-secondary [^"]*">Server</);
  assert.match(single, /<span class="pointer-events-none flex pointer-coarse:hidden"><span data-cds="Shortcut"[^>]*>/);
  assert.doesNotMatch(single, /aria-pressed/, 'single-select rows carry no aria-pressed');
  assert.doesNotMatch(row({ showDigitHint: false }), /data-cds="Shortcut"/);
  const multi = row({ isMultiSelect: true, isSelected: true });
  assert.match(multi, /aria-pressed="true"/);
  assert.ok(multi.includes(gen.selectedRowClass));
  assert.match(multi, /<span data-size="sm" class="flex shrink-0">/);
  assert.match(row({ isMultiSelect: true, isHighlighted: true }), / bg-alpha-2 /);
});

test('hr: a description with a URL takes the presentation layout; the painter is the pending host boundary', () => {
  const html = renderToStaticMarkup(h(gen.QuestionOptionRow, { option: { label: 'Docs', description: 'See https://example.com/x' },
    index: 0, isSelected: false, isHighlighted: false, isMultiSelect: false, showDigitHint: false, onRowMouseDown() {}, endsDragSelect: () => false, onOptionClick() {} }));
  assert.match(html, /^<div role="presentation" data-question-answer-row="" class="relative cursor-interactive flex items-center/);
  assert.match(html, /<button type="button" data-question-answer="" aria-labelledby="[^"]+" class="absolute inset-0 rounded-\[inherit\] /);
  assert.ok(html.includes('See https://example.com/x'));
  assert.deepEqual(Object.keys(HOST_ADAPTERS), ['cb8c5a88f-Cxti0pWl.js#Zi']);
  assert.ok(manifest.modules.flatMap(m => m.imports).some(i => i.kind === 'adapter' && i.name === 'paintTranscriptText' && i.via === 'cb8c5a88f-Cxti0pWl.js:f'));
});

test('Wr / Dr: the card-presentation answer row over hr with the radio mark (single) or checkbox (multi)', () => {
  const html = renderToStaticMarkup(h(gen.QuestionAnswerOption, { option: { label: 'Yes', description: 'Ship it' }, index: 0, isSelected: true,
    isMultiSelect: false, disabled: false, onSelect() {} }));
  assert.match(html, /^<button type="button" aria-pressed="true" data-question-answer="" class="epitaxy-answer-option flex w-full items-start gap-md px-lg py-lg text-start /);
  assert.match(html, /<span aria-hidden="true" data-checked="" class="epitaxy-radio-mark [^"]*"><span class="epitaxy-radio-mark-dot"><\/span><\/span>/);
  assert.match(html, /class="whitespace-pre-wrap text-body text-secondary [^"]*">Ship it</);
  assert.equal(gen.answerOptionInset, 'px-lg');
  const multi = renderToStaticMarkup(h(gen.QuestionAnswerOption, { option: { label: 'A' }, index: 0, isSelected: false,
    isMultiSelect: true, disabled: false, onSelect() {} }));
  assert.doesNotMatch(multi, /epitaxy-radio-mark/, 'multiSelect rows take the checkbox, not the radio mark');
  assert.match(multi, /aria-pressed="false"/);
});

test('rG: the title row (compact header off by default: the semibold title in a contents wrapper)', () => {
  const html = renderToStaticMarkup(h(gen.QuestionCardHeader, { titleNamesCard: true, subtitle: 'Pick one', trailing: h('span', null, 'x') }, 'Which database?'));
  assert.match(html, /^<div class="contents"><div class="text-primary min-h-\[24px\] shrink-0 flex items-center gap-1"><span class="flex flex-1 min-w-0 flex-col gap-\[2px\]">/);
  assert.match(html, /<span data-question-stop-name="" class="text-body-semibold min-w-0 break-words">Which database\?<\/span>/);
  assert.match(html, /<div class="text-body text-muted-as-secondary">Pick one<\/div>/);
  assert.match(html, /<span class="shrink-0 self-center"><span>x<\/span><\/span>/);
  assert.equal(gen.questionDisplayText('  Which​ database?  ').includes('Which'), true);
});

// The digit listener under fakes: a window with capture keydown listeners, a document, the card root and a target.
function digitWorld() {
  const listeners = [];
  const doc = { querySelectorAll: () => [], activeElement: null, body: null };
  const win = { document: doc, addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn) => { const i = listeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); } };
  doc.defaultView = win;
  const attrs = new Map();
  const element = (fields = {}) => ({ nodeType: 1, ownerDocument: doc, matches: () => false, closest: () => null, contains: () => false,
    shadowRoot: null, textContent: '', ...fields });
  const root = element({ setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k) });
  const outside = element();
  const key = (key, fields = {}) => {
    const event = { type: 'keydown', key, target: outside, repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
      isComposing: false, keyCode: 0, defaultPrevented: false, timeStamp: performance.now(), composedPath: () => [fields.target ?? outside],
      prevented: false, stopped: false, preventDefault() { this.prevented = true; this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { this.stopped = true; }, ...fields };
    for (const l of listeners.filter(l => l.type === 'keydown' && l.capture)) l.fn(event);
    return event;
  };
  return { listeners, attrs, root, element, key };
}
// vt's locals: _ isPanelActive, v isFocusedPane, P / R / w the submitted / no-question / collapsed guards, y
// enableDigitShortcuts, O the card root ref, z the page's option count, Bt the composer popup test, gn the time the card
// became active, sn the "focus the card" ref, I handleOptionClick.
const digitProps = (world, picks, fields = {}) => ({ _: true, v: true, P: false, R: false, w: false, y: true, O: { current: world.root }, z: 2,
  Bt: () => false, gn: { current: -1 / 0 }, sn: { current: true }, I: index => picks.push(index), ...fields });

test('questionDigitShortcuts: a digit typed outside the card picks (N+1 is Other), marks data-question-card-digits, unmounts cleanly', () => {
  const world = digitWorld(), picks = [];
  const props = digitProps(world, picks);
  const dispose = gen.questionDigitShortcuts(props)();
  assert.equal(world.attrs.get('data-question-card-digits'), '3', 'shared-183 aG = options + 1');
  const two = world.key('2');
  assert.deepEqual(picks.splice(0), [1]);
  assert.ok(two.prevented && two.stopped);
  assert.equal(props.sn.current, false, 'a digit pick drops the focus-the-card flag');
  world.key('3');
  assert.deepEqual(picks.splice(0), [-1], 'N+1 is Other');
  assert.equal(world.key('4').prevented, false, 'past Other the key is left alone');
  assert.equal(world.key('1', { metaKey: true }).prevented, false, 'modified digits are not the card\'s');
  assert.equal(world.key('1', { repeat: true }).prevented, true, 'a held digit is swallowed but does not pick');
  assert.deepEqual(picks.splice(0), []);
  const field = world.element({ matches: s => s.startsWith('input,textarea') });
  assert.equal(world.key('1', { target: field }).prevented, false, 'digits type into a field');
  dispose();
  assert.equal(world.attrs.has('data-question-card-digits'), false);
  assert.equal(world.listeners.length, 0);
});

test('questionDigitShortcuts: off while inactive, unfocused, submitted, without questions, collapsed or disabled; held by a popup and for 400ms', () => {
  for (const off of [{ _: false }, { v: false }, { P: true }, { R: true }, { w: true }, { y: false }]) {
    const world = digitWorld();
    assert.equal(gen.questionDigitShortcuts(digitProps(world, [], off))(), undefined, JSON.stringify(off));
    assert.equal(world.listeners.length, 0);
  }
  const world = digitWorld(), picks = [];
  let popup = true;
  const props = digitProps(world, picks, { Bt: () => popup, gn: { current: Date.now() } });
  const dispose = gen.questionDigitShortcuts(props)();
  assert.equal(world.key('1').prevented, false, 'a composer popup keeps its digits');
  popup = false;
  assert.equal(world.key('1').prevented, false, 'right after the card became active');
  props.gn.current = Date.now() - 1000;
  world.key('1');
  assert.deepEqual(picks, [0]);
  dispose();
});

test('questionRowMouseDown / questionEndsDragSelect: a plain click is a pick, a drag-select press is not', () => {
  const An = { current: null }, jn = { current: null };
  const listeners = [];
  const doc = { getSelection: () => ({ isCollapsed: true, rangeCount: 0 }), activeElement: null,
    addEventListener: (type, fn) => listeners.push({ type, fn }) };
  const row = { ownerDocument: doc, contains: () => true };
  gen.questionRowMouseDown({ jn, An })({ button: 0, currentTarget: row, shiftKey: false, clientX: 0, clientY: 0 });
  assert.equal(listeners.length, 1);
  assert.deepEqual(An.current, { dragSelected: false });
  listeners[0].fn({ button: 0, clientX: 1, clientY: 1, detail: 1, target: row });
  assert.equal(gen.questionEndsDragSelect({ An })({ detail: 1 }), false);
  assert.equal(An.current, null);
  gen.questionRowMouseDown({ jn, An })({ button: 0, currentTarget: row, shiftKey: false, clientX: 0, clientY: 0 });
  doc.getSelection = () => ({ isCollapsed: false, rangeCount: 1, anchorNode: {}, empty() {} });
  listeners[1].fn({ button: 0, clientX: 40, clientY: 0, detail: 1, target: row });
  assert.equal(An.current.dragSelected, true);
  assert.equal(gen.questionEndsDragSelect({ An })({ detail: 1 }), true);
  assert.equal(gen.dragSelectThreshold, 4);
});
