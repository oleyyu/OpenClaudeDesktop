// DM-P4 (3.6556.2 migration, wave 10): where the computer-use code this app copies or ports went in 3.6556.2, read
// from the shipped bundles as text and AST only (rolldown parseAst) — no official chunk is executed, nothing touches the
// keyboard, the mouse or window focus.
//
//   glow page        2.42304.0 muI2IV6k tIr / eIr              → 3.6556.2 jPKPzV-P CNa / SNa      (glow-page.cjs)
//   teach page       2.42304.0 muI2IV6k rFa() / nFa / tFa / iFa → 3.6556.2 jPKPzV-P tPa() / ePa / $Na / nPa (teach-page.cjs)
//   watch-record     2.42304.0 muI2IV6k lIa() / lRa() / rRa     → 3.6556.2 DinDpVtd f() / Be() / Pe (watch-record-pages.cjs)
//   preloads         computerUseTeach.js / computerUseWatchRecord.js / watchRecordChooser.js: the same files
//   main-side ports  the functions the other computer-use files cite, old name → new name, same code apart from names
//                    (the header pins of glow.cjs, teach.cjs, side-panel.cjs, full-control.cjs, keys.cjs, focus-guard.cjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { asarSource, previousAsarSource } from '../scripts/official-3.6556.2.mjs';

const require = createRequire(import.meta.url);
const { parseAst } = require('rolldown/parseAst');
const CU = new URL('../electron/computer-use/', import.meta.url);
const hostText = (name) => fs.readFileSync(new URL(name, CU), 'utf8');
const { GLOW_PAGE, DEFAULT_LABEL } = require('../electron/computer-use/glow-page.cjs');
const { TEACH_PAGE, LOGO_PATH, SPINNER_PATHS } = require('../electron/computer-use/teach-page.cjs');
const pages = require('../electron/computer-use/watch-record-pages.cjs');
const { HIDE_MS: GLOW_HIDE_MS } = require('../electron/computer-use/glow.cjs');
const { HIDE_MS: TEACH_HIDE_MS } = require('../electron/computer-use/teach.cjs');

// A chunk's text and its top-level bindings (function declarations and variable declarators); a name bound more than
// once at the top level is ambiguous and cannot be looked up.
function chunk(dir, file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const ast = parseAst(text);
  const bindings = new Map();
  const add = (name, node, whole) => bindings.set(name, bindings.has(name) ? null : { node, text: text.slice(whole.start, whole.end) });
  for (const statement of ast.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id) add(statement.id.name, statement, statement);
    if (statement.type === 'VariableDeclaration') {
      for (const d of statement.declarations) if (d.id.type === 'Identifier' && d.init) add(d.id.name, d.init, d.init);
    }
  }
  const find = (predicate, what) => {
    const hits = [...bindings].filter(([name, binding]) => binding && predicate(binding, name));
    assert.equal(hits.length, 1, `${file}: exactly one ${what}`);
    return { name: hits[0][0], ...hits[0][1] };
  };
  const get = (name) => {
    const binding = bindings.get(name);
    assert.ok(binding, `${file}: ${name} is bound exactly once at the top level`);
    return binding;
  };
  return { file, text, bindings, find, get };
}

const OLD = chunk(previousAsarSource, 'index.chunk-muI2IV6k.js');
const NEW = chunk(asarSource, 'index.chunk-jPKPzV-P.js');
const WATCH = chunk(asarSource, 'index.chunk-DinDpVtd.js');

// A template literal's text as the engine would cook it, each ${identifier} replaced by `value(identifier)`.
function cook(template, value) {
  assert.equal(template.type, 'TemplateLiteral');
  let out = template.quasis[0].value.cooked;
  template.expressions.forEach((expression, index) => {
    assert.equal(expression.type, 'Identifier', 'only plain identifiers are interpolated');
    out += value(expression.name) + template.quasis[index + 1].value.cooked;
  });
  return out;
}
const literal = (binding) => {
  assert.equal(binding.node.type, 'Literal');
  return binding.node.value;
};
// The source with every minified-length identifier (up to 4 characters, not after a member dot) folded to `#`:
// two functions that differ only in the names a minifier picked compare equal.
const renamed = (source) => source.replace(/(?<![\w$])(?:(?<=\.\.\.)|(?<!\.))[A-Za-z_$][\w$]{0,3}(?![\w$])/g, '#');

test('DM-P4: 3.6556.2 keeps the glow and teach pages in index.chunk-jPKPzV-P.js and moves the watch-record pages to index.chunk-DinDpVtd.js', () => {
  assert.equal(NEW.text.split('"cu-glow.html"').length - 1, 1);
  assert.equal(NEW.text.split('<title>Teaching</title>').length - 1, 1);
  assert.equal(NEW.text.includes('inputProtectionMs'), false, 'the chooser page is no longer in the main chunk');
  assert.equal(OLD.text.includes('inputProtectionMs'), true);
  assert.equal(WATCH.text.split('inputProtectionMs').length - 1, 2);
  assert.match(WATCH.text, /^"use strict";[\s\S]*?const e=require\("\.\/index\.chunk-BjdXj7EG\.js"\),t=require\("\.\/index\.chunk-jPKPzV-P\.js"\)/);
});

test('glow-page.cjs is the 3.6556.2 CNa with its default label SNa, character for character', () => {
  const page = NEW.find((b) => b.node.type === 'TemplateLiteral' && b.text.includes('id="badge-label"') && b.text.includes('#overlay'), 'glow page template');
  assert.equal(page.name, 'CNa');
  const [label] = page.node.expressions.map((e) => e.name);
  assert.equal(label, 'SNa');
  assert.equal(literal(NEW.get(label)), 'Claude is using your computer');
  assert.equal(DEFAULT_LABEL, literal(NEW.get(label)));
  assert.equal(GLOW_PAGE, cook(page.node, (name) => literal(NEW.get(name))));
  // The same text as 2.42304.0 (tIr / eIr), so tests/computer-use-glow.test.mjs stays right.
  assert.equal(cook(OLD.get('tIr').node, (name) => literal(OLD.get(name))), GLOW_PAGE);
  // The hide delay right before the label (xNa = 320), as glow.cjs HIDE_MS.
  assert.match(NEW.text, /var xNa=320,SNa="Claude is using your computer",CNa=`/);
  assert.equal(GLOW_HIDE_MS, literal(NEW.get('xNa')));
  assert.match(hostText('glow-page.cjs'), /the 3\.6556\.2 original, character for character\n\/\/ \(asar index\.chunk-jPKPzV-P\.js CNa, with its default label SNa;/);
});

test('teach-page.cjs is the 3.6556.2 tPa() with the Claude mark ePa and the Spinner master16 path $Na, character for character', () => {
  const page = NEW.find((b) => b.node.type === 'FunctionDeclaration' && b.text.includes('<title>Teaching</title>'), 'teach page function');
  assert.equal(page.name, 'tPa');
  const body = page.node.body.body;
  assert.equal(body.length, 1);
  assert.equal(body[0].type, 'ReturnStatement');
  const template = body[0].argument;
  assert.deepEqual(template.expressions.map((e) => e.name), ['ePa', '$Na']);
  assert.equal(LOGO_PATH, literal(NEW.get('ePa')));
  // $Na = {name: "Spinner", master16: [{d}], master20: [...]}.master16.map(e => "d" in e ? `<path …/>` : "").join("")
  const spinner = NEW.get('$Na');
  assert.match(spinner.text, /^\{name:"Spinner",master16:\[\{d:"[^"]+"\}\],master20:\[\{d:"[^"]+"\}\]\}\.master16\.map\(\(e=>"d"in e\?`<path d="\$\{e\.d\}" vector-effect="non-scaling-stroke" \/>`:""\)\)\.join\(""\)$/);
  const icon = spinner.node.callee.object.callee.object.object;
  const master16 = icon.properties.find((p) => p.key.name === 'master16').value.elements;
  const paths = master16.map((entry) => entry.properties.find((p) => p.key.name === 'd').value.value);
  assert.equal(SPINNER_PATHS, paths.map((d) => `<path d="${d}" vector-effect="non-scaling-stroke" />`).join(''));
  const values = { ePa: LOGO_PATH, $Na: SPINNER_PATHS };
  assert.equal(TEACH_PAGE, cook(template, (name) => values[name]));
  // The window hides nPa = 320 ms after the page's fade-out starts, as teach.cjs HIDE_MS.
  assert.equal(NEW.text.split('`}var nPa=320,').length - 1, 1);
  assert.equal(TEACH_HIDE_MS, literal(NEW.get('nPa')));
  // 2.42304.0 rFa has the same text.
  assert.equal(OLD.get('rFa').text.replace(/^function rFa\(/, 'function tPa(').replace('${nFa}', '${ePa}').replace('${tFa}', '${$Na}'), page.text);
  assert.match(hostText('teach-page.cjs'), /the 3\.6556\.2 original, character for\n\/\/ character \(asar index\.chunk-jPKPzV-P\.js tPa\(\), with the Claude mark ePa and the Spinner icon's master16 path \$Na;/);
});

test('watch-record-pages.cjs is the 3.6556.2 DinDpVtd f() (chooser) and Be() (pill, inset Pe), character for character', () => {
  const chooser = WATCH.find((b) => b.node.type === 'FunctionDeclaration' && /^function [\w$]+\(e\)\{let\{inputProtectionMs:/.test(b.text), 'chooser page');
  assert.equal(chooser.name, 'f');
  assert.equal(pages.chooserPage.toString().replace(/^function chooserPage\(/, 'function f('), chooser.text);
  const pill = WATCH.find((b) => b.node.type === 'FunctionDeclaration' && b.text.startsWith('function Be(e){return`<!DOCTYPE html>'), 'pill page');
  const inset = /PILL_INSET_PX/.exec(pages.pillPage.toString());
  assert.ok(inset);
  const insetName = pill.text.slice(inset.index - 'function pillPage('.length + 'function Be('.length).match(/^[A-Za-z_$][\w$]*/)[0];
  assert.equal(insetName, 'Pe');
  assert.equal(pages.pillPage.toString().replace(/^function pillPage\(/, 'function Be(').replaceAll('PILL_INSET_PX', insetName), pill.text);
  assert.equal(pages.PILL_INSET_PX, literal(WATCH.get(insetName)));
  // 2.42304.0 lIa / lRa (rRa) are the same functions.
  assert.equal(OLD.get('lIa').text.replace(/^function lIa\(/, 'function f('), chooser.text);
  assert.equal(OLD.get('lRa').text.replace(/^function lRa\(/, 'function Be(').replaceAll('rRa', 'Pe'), pill.text);
  const header = hostText('watch-record-pages.cjs');
  assert.match(header, /asar \.vite\/build\/index\.chunk-DinDpVtd\.js f\(\) \(the chooser/);
  assert.match(header, /\n\/\/ Pe \(2\.42304\.0 rRa\)\nconst PILL_INSET_PX = 32;\n/);
});

test('the teach and watch-record preloads are the same files in 3.6556.2 (only the Sentry release and debug ids change)', () => {
  const strip = (text) => text.replace(/SENTRY_RELEASE=\{id:"[0-9a-f]+"\}/, 'SENTRY_RELEASE={id:""}').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '');
  for (const file of ['computerUseTeach.js', 'computerUseWatchRecord.js', 'watchRecordChooser.js']) {
    const before = fs.readFileSync(path.join(previousAsarSource, file), 'utf8');
    const after = fs.readFileSync(path.join(asarSource, file), 'utf8');
    assert.notEqual(before, after, `${file} was rebuilt`);
    assert.equal(strip(after), strip(before), `${file} is unchanged apart from its Sentry ids`);
    for (const name of ['next', 'exit', 'mouseEnter', 'mouseLeave']) assert.match(after, new RegExp(`"CuTeach_\\$_${name}"`));
    for (const name of ['choose', 'micState', 'setMicPreview', 'stopMicPreview', 'inputDevices', 'reportContentShortfall']) assert.match(after, new RegExp(`"CuWatchRecordChooser_\\$_${name}"`));
    for (const name of ['done', 'discard', 'toggleMic', 'micState', 'micError', 'processing', 'timeWarning', 'reportProcessingWidth']) assert.match(after, new RegExp(`"CuWatchRecordPill_\\$_${name}"`));
  }
});

// The official functions the main-side ports cite: 2.42304.0 muI2IV6k name → 3.6556.2 jPKPzV-P name, same code
// apart from names. [host file, old, new, what].
const RELOCATED = [
  ['glow.cjs', 'dIr', 'kNa', 'glow: move it to a display'],
  ['glow.cjs', 'uPr', 'IUi', 'own window (kept out of window-wide handling)'],
  ['teach.cjs', 'hFa', 'pPa', 'teach overlay: create'],
  ['teach.cjs', 'gFa', 'mPa', 'teach overlay: show'],
  ['teach.cjs', '_Fa', 'hPa', 'teach overlay: hide'],
  ['teach.cjs', 'vFa', 'gPa', 'teach overlay: fade the tooltip'],
  ['teach.cjs', 'yFa', '_Pa', 'teach overlay: show a step'],
  ['teach.cjs', 'bFa', 'vPa', 'teach overlay: Working…'],
  ['teach.cjs', 'dFa', 'lPa', 'teach overlay: move to a display'],
  ['teach.cjs', 'EFa', 'wPa', 'teach controller'],
  ['side-panel.cjs', 'NFa', 'jPa', 'dockedBounds'],
  ['side-panel.cjs', 'MFa', 'APa', 'moveTo'],
  ['side-panel.cjs', 'PFa', 'MPa', 'float'],
  ['side-panel.cjs', 'FFa', 'NPa', 'dock'],
  ['side-panel.cjs', 'IFa', 'PPa', 'dock'],
  ['side-panel.cjs', 'LFa', 'FPa', 'restore'],
  ['side-panel.cjs', 'RFa', 'IPa', 'lockChanged'],
  ['side-panel.cjs', 'tR', 'Fnr', 'CuDockStateChanged dispatch'],
  ['full-control.cjs', 'KW', 'EW', 'the lock manager'],
  ['full-control.cjs', 'GNr', 'gUi', 'Esc: absorbed or stop'],
  ['full-control.cjs', 'qNr', 'vUi', 'Esc: stop the holders'],
  ['keys.cjs', 'nH', 'PH', 'parse'],
  ['keys.cjs', 'gn', 'bn', 'normalize'],
  ['keys.cjs', 'Asr', 'dTr', 'system combos'],
  ['keys.cjs', 'ksr', 'uTr', 'system combos'],
  ['focus-guard.cjs', 'xFr', 'qWi', 'armFocusStealGuard'],
  ['clipboard.cjs', 'DPr', '$Ui', 'paste through the clipboard'],
  ['clipboard.cjs', 'rPr', 'kUi', "Electron's clipboard"],
  ['clipboard.cjs', 'vlr', 'bDr', 'sub-gate defaults'],
  ['clipboard.cjs', 'EPr', 'QUi', '⌘V'],
  ['cursor.cjs', 'IPa', 'bNa', '[cu-app-indicator]: the phantom cursor on locked windows'],
  ['click-through.cjs', 'yPr', 'GUi', 'click-through: windows near the points'],
  ['click-through.cjs', '_Pr', 'UUi', 'click-through'],
  ['click-through.cjs', 'vPr', 'WUi', 'click-through'],
  ['click-through.cjs', 'TPr', 'ZUi', 'click-through'],
  ['click-through.cjs', 'gPr', 'HUi', 'click-through'],
  ['click-through.cjs', 'CPr', 'YUi', 'click-through'],
];

test('the main-side functions the computer-use ports cite are the same code in 3.6556.2, renamed', () => {
  for (const [host, before, after, what] of RELOCATED) {
    const old = OLD.get(before), now = NEW.get(after);
    assert.ok(old.text.length > 30, `${before} is more than a constant`);
    assert.equal(renamed(now.text), renamed(old.text), `${host}: ${before} → ${after} (${what})`);
    assert.ok(fs.existsSync(new URL(host, CU)), host);
  }
  // Side panel constants (DFa / OFa / kFa / AFa → TPa / EPa / DPa / OPa).
  assert.match(NEW.text, /var TPa=520,EPa=720,DPa=20,OPa=220,/);
  assert.match(OLD.text, /var DFa=520,OFa=720,kFa=20,AFa=220,/);
});

test('glow: 3.6556.2 ANa / jNa / MNa create, show and hide the window as 2.42304.0 fIr / pIr / mIr, without its visibility observable', () => {
  const strings = (binding) => {
    const out = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === 'Literal' && typeof node.value === 'string') out.push(node.value);
      if (node.type === 'TemplateElement') out.push(node.value.cooked);
      for (const key of Object.keys(node)) if (key !== 'type') walk(node[key]);
    };
    walk(binding.node);
    return out;
  };
  for (const [before, after] of [['fIr', 'ANa'], ['pIr', 'jNa'], ['mIr', 'MNa']]) {
    assert.deepEqual(strings(NEW.get(after)), strings(OLD.get(before)), `${before} → ${after}: the same strings and scripts`);
  }
  const options = (text) => (/# #\.BrowserWindow\(\{[^)]*\}\)/.exec(renamed(text))?.[0] ?? '');
  assert.notEqual(options(NEW.get('ANa').text), '');
  assert.equal(options(NEW.get('ANa').text), options(OLD.get('fIr').text), 'the same BrowserWindow options');
  // 2.42304.0's HG(visible) observable (oIr / sIr, read by the main window's background throttling) is gone; glow.cjs
  // never had it.
  assert.match(OLD.text, /,iIr=!1,aIr=new Set;function oIr\(\)\{return iIr\}function sIr\(e\)\{return aIr\.add\(e\),\(\)=>\{aIr\.delete\(e\)\}\}function HG\(e\)\{if\(e!==iIr\)\{iIr=e;for\(let e of aIr\)e\(iIr\)\}\}/);
  assert.match(OLD.get('pIr').text, /;HG\(!0\);/);
  const glowModule = NEW.text.slice(NEW.text.indexOf('var xNa=320,'), NEW.text.indexOf(NEW.get('MNa').text) + NEW.get('MNa').text.length);
  assert.ok(glowModule.includes('"cu-glow.html"'));
  assert.doesNotMatch(glowModule, /\.add\(e\),\(\)=>\{/, 'no listener set next to the 3.6556.2 glow window');
  assert.doesNotMatch(hostText('glow.cjs'), /subscribe|onVisibleChange/);
});

test('the computer-use files name the 3.6556.2 chunk in their header pins', () => {
  assert.match(hostText('glow.cjs'), /log tag \[cu-glow\]; 3\.6556\.2 jPKPzV-P ANa \/ jNa \/ MNa \/ kNa\)/);
  assert.match(hostText('teach.cjs'), /log tag \[cu-teach\]; the same code in 3\.6556\.2 jPKPzV-P/);
  assert.match(hostText('side-panel.cjs'), /@6423900–6425800, 3\.6556\.2 jPKPzV-P TPa…IPa \/ Fnr/);
  assert.match(hostText('full-control.cjs'), /the lock manager KW in index\.chunk-muI2IV6k\.js, EW in 3\.6556\.2 jPKPzV-P/);
  assert.match(hostText('keys.cjs'), /muI2IV6k nH \/ gn \/ Asr \/ ksr, 3\.6556\.2 jPKPzV-P PH \/ bn \/ dTr \/ uTr/);
  assert.match(hostText('focus-guard.cjs'), /2\.42304\.0 muI2IV6k xFr, 3\.6556\.2 jPKPzV-P qWi/);
  assert.match(hostText('cursor.cjs'), /\(official 2\.42304\.0 §2\.6; 3\.6556\.2 jPKPzV-P bNa \[cu-app-indicator\], the same\)/);
  assert.match(hostText('click-through.cjs'), /CPr; 3\.6556\.2 jPKPzV-P N4, GUi, UUi, WUi, ZUi, HUi, YUi, the same apart from N4's D4\(\) \/ O4\(\)/);
  assert.match(hostText('clipboard.cjs'), /the same in 3\.6556\.2 \(ot\(\) and its callers in BEf0UhNC → st\(\) in Cgwbta3N; DPr \/ rPr \/ vlr \/ EPr in muI2IV6k → \$Ui \/ kUi \/ bDr \/ QUi in jPKPzV-P\)/);
});

// Every write to a top-level binding (assignment or ++/--) anywhere in a chunk's AST.
function writesTo(text, name) {
  let writes = 0, reads = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'Identifier' && node.name === name) reads++;
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && node.left.name === name) writes++;
    if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' && node.argument.name === name) writes++;
    for (const key of Object.keys(node)) if (key !== 'type') walk(node[key]);
  };
  walk(parseAst(text).body);
  return { writes, reads };
}

test('click-through: 3.6556.2 N4 is 2.42304.0 NG plus the D4() / O4() Claude-dialog checks, which cannot fire in that build', () => {
  const ng = OLD.get('NG').text, n4 = NEW.get('N4').text;
  assert.notEqual(renamed(n4), renamed(ng), 'N4 is not NG renamed');
  // The two additions: stop the pass when a Claude dialog waits (after the native window list), and throw after the wait.
  assert.equal(n4.split('if(D4())return;').length - 1, 1);
  assert.equal(n4.split('O4(),').length - 1, 1);
  assert.match(n4, /let t=await\(i\?\.nativeWindows\(\)\)\?\?\[\];if\(D4\(\)\)return;let n=a\.BrowserWindow\.getAllWindows\(\)/);
  assert.match(n4, /f=async e=>\{if\(await d\(e\),O4\(\),/);
  const without = n4.replace(';if(D4())return;let ', ',').replace('O4(),', '');
  assert.equal(renamed(without), renamed(ng), 'apart from the two checks N4 is NG renamed');
  // D4 reads a counter CUi that nothing writes: the chunk has two references to it (its declaration and D4's body),
  // no assignment and no ++/--, and no export getter can hand it out. D4() is always false in 3.6556.2, O4() never
  // throws, and the pass behaves as NG — which click-through.cjs ports.
  assert.equal(NEW.get('D4').text, '()=>CUi>0');
  assert.match(NEW.get('O4').text, /^function O4\(\)\{if\(D4\(\)\)throw Error\("A Claude dialog is waiting for the user, so the input was not sent\. Ask the user to answer it, then try again\."\)\}$/);
  assert.equal(literal(NEW.get('CUi')), 0);
  assert.deepEqual(writesTo(NEW.text, 'CUi'), { writes: 0, reads: 2 });
  assert.doesNotMatch(NEW.text, /get:function\(\)\{return CUi\}/);
});

test('clipboard guard: 2.42304.0 BEf0UhNC ot() and its callers are 3.6556.2 Cgwbta3N st() and its callers', () => {
  const OLD_GATES = chunk(previousAsarSource, 'index.chunk-BEf0UhNC.js');
  const NEW_GATES = chunk(asarSource, 'index.chunk-Cgwbta3N.js');
  assert.match(OLD_GATES.get('ot').text, /^async function ot\(e,t,n\)\{let r=t\.getClipboardStash\?\.\(\);/);
  assert.equal(NEW_GATES.get('st').text, OLD_GATES.get('ot').text.replace(/^async function ot\(/, 'async function st('));
  for (const [before, after] of [['U', 'W'], ['Oi', 'Mi'], ['Ai', 'Pi']]) {
    assert.equal(renamed(NEW_GATES.get(after).text), renamed(OLD_GATES.get(before).text), `${before} → ${after}`);
  }
  // V → H also calls the guard; the only change is the name of one import from another chunk (t.jA → t.rk).
  const v = OLD_GATES.get('V').text, h = NEW_GATES.get('H').text;
  assert.ok(v.includes('if(r.clipboardGuard&&await ot('));
  assert.ok(h.includes('if(r.clipboardGuard&&await st('));
  const crossChunk = (text) => renamed(text).replace(/#\.[A-Za-z_$][\w$]{0,3}(?![\w$])/g, '#.#');
  assert.notEqual(renamed(h), renamed(v));
  assert.equal(crossChunk(h), crossChunk(v));
  assert.equal(v.split('.jA(').length - 1, 1);
  assert.equal(h.split('.rk(').length - 1, 1);
});
