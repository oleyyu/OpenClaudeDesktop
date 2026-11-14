import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as v4 from '../scripts/official-4.16336.0.mjs';
import { CHAT_EXPORT, CHAT_EXPORT_V4, CHAT_EXPORT_V4_OUTPUT, locateRootsV4, extractChatExportV4, surveyChatExportV4 } from '../scripts/extract-chat-export.mjs';

// Settings › Privacy › Export data, the custom range (scripts/extract-chat-export.mjs), on 4.16336.0: the isolated
// contract CHAT_EXPORT_V4 -> src/generated/chat-export-v4 next to the 3.6556.2 production graph src/generated/chat-export
// (unchanged on disk; since the round 3 S1 cutover the host imports the 4.16336.0 graph). Official chunks are read as text only, never executed.
const app = path.resolve(import.meta.dirname, '..');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const chunk = name => fs.readFileSync(path.join(v4.ionSource, name), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const staged = fs.existsSync(path.join(app, CHAT_EXPORT_V4_OUTPUT));

test('two contracts: 3.6556.2 kept on disk (cowork-scheduled date picker); 4.16336.0 is the host graph since S1, sharedGraph cds-core, the cowork-scheduled-v4 date picker', () => {
  assert.equal(CHAT_EXPORT.referenceVersion, '3.6556.2');
  assert.equal(path.relative(app, CHAT_EXPORT.output), 'src/generated/chat-export');
  assert.deepEqual(CHAT_EXPORT.linkedAreas, [{ area: 'cowork-scheduled', modules: ['cff2bf6cb-PfnEo01t.mjs'] }]);
  assert.equal(JSON.parse(local('src/generated/chat-export/manifest.json')).referenceVersion, '3.6556.2');
  assert.equal(CHAT_EXPORT_V4.referenceVersion, '4.16336.0');
  assert.equal(CHAT_EXPORT_V4.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(CHAT_EXPORT_V4.sourceContract, v4);
  assert.equal(CHAT_EXPORT_V4.sharedGraph, 'cds-core');
  assert.equal(path.relative(app, CHAT_EXPORT_V4.output), 'src/generated/chat-export-v4');
  // cds-core wave 5b (cds-wave5b region-changes chat-export.link-date-picker): cff2bf6cb holds module state cowork-scheduled-v4
  // also cuts; cowork-scheduled is its region owner, so DatePicker (cff2bf6cb nu) is linked from cowork-scheduled-v4 (no
  // 3.6556.2 area is linked) and no longer sliced here, nor the vendor-frame / rolldown chunks only its closure entered.
  assert.deepEqual(CHAT_EXPORT_V4.linkedAreas, [{ area: 'cowork-scheduled-v4', modules: ['cff2bf6cb-HE-LaYyC.mjs'] }]);
  assert.deepEqual(CHAT_EXPORT_V4.modules.map(m => [m.target, m.source]), [
    ['date-range.mjs', 'c1751bc30-CvXSylS4.js'], ['date-field.mjs', 'cb499b8fa-BHm49DAk.js'], ['date-range-selector.mjs', 'c71ba149d-BCmc0sgr.js'],
    ['shared-frame.mjs', v4.sharedFrame]]);
  // vendor-frame's CommonJS React loader is the host's React (as in cds-core), never a second React.
  assert.deepEqual(CHAT_EXPORT_V4.localAdapters, { [`${v4.vendorFrame}#i`]: { name: 'loadHostReact', features: ['t.exports = r();'] } });
  assert.match(local('src/source-chat-export-adapters.jsx'), /^export \{ loadHostReact \} from "\.\/cds-core-adapter\.mjs";$/m);
  assert.match(local('src/cds-core-adapter.mjs'), /export function loadHostReact\(\) \{\n  return React;\n\}/);
  assert.deepEqual(Object.keys(CHAT_EXPORT_V4.adapters[v4.vendorIntl]), ['p', 'l']);
  assert.deepEqual(Object.keys(CHAT_EXPORT_V4.extraGlobals).sort(), ['HTMLSelectElement', 'IS_REACT_ACT_ENVIRONMENT', 'MessagePort', 'jest']);
  // Round 3 S1 cutover (regions/batch2a/chat-export/patches/host-cutover-to-chat-export-v4.patch): the host imports the
  // 4.16336.0 graph; the 3.6556.2 graph stays byte-identical on disk (verify-gen-chat-export still checks it) but the
  // host no longer imports it.
  const privacy = local('src/source-settings-privacy.jsx');
  assert.match(privacy, /^import \{ DateRangeSelector \} from '\.\/generated\/chat-export-v4\/date-range-selector\.mjs';$/m);
  assert.match(privacy, /^import \{ isValidDateRange \} from '\.\/generated\/chat-export-v4\/date-range\.mjs';$/m);
  assert.doesNotMatch(privacy, /from '\.\/generated\/chat-export\//);
});

test('4.16336.0 roots and call sites are each the only declaration carrying their features, under the pinned local, alias and bytes', async () => {
  const located = await locateRootsV4();
  assert.deepEqual(Object.fromEntries(Object.entries(located.roots).map(([name, r]) => [name, `${r.chunk}#${r.local} as ${r.alias} ${r.sha256.slice(0, 16)}`])), {
    isValidDateRange: 'c1751bc30-CvXSylS4.js#o as r 2ed7f0a06faa57ca',
    DateField: 'cb499b8fa-BHm49DAk.js#c as t acf79f78ed9f48b6',
    DateRangeSelector: 'c71ba149d-BCmc0sgr.js#u as DateRangeSelector b809cb569050f8ab',
    DatePicker: 'cff2bf6cb-HE-LaYyC.js#nu as t 7a412b3c438fcbcb',
  });
  // isValidDateRange and DateRangeSelector are byte-identical to 3.6556.2's (manifest binding hashes).
  const old = JSON.parse(local('src/generated/chat-export/manifest.json')).modules.flatMap(m => m.bindings.map(b => [`${m.source}#${b.name}`, b.sha256]));
  const oldSha = Object.fromEntries(old);
  assert.equal(located.roots.isValidDateRange.sha256, oldSha['c1751bc30-D9BmGCFy.js#o']);
  assert.equal(located.roots.DateRangeSelector.sha256, oldSha['c71ba149d-CFslfKFj.js#u']);
  assert.deepEqual(Object.fromEntries(Object.entries(located.callSites).map(([name, c]) => [name, c.sha256.slice(0, 16)])),
    { G2e: 'd25da81b38f91187', U2e: 'b0cf8c4de1105708', LL: '6f507cd5bf891145' });
  assert.deepEqual(located.imports, {
    'c71ba149d-BCmc0sgr.js': { a: 'cb499b8fa-BHm49DAk.js:t', o: 'c1751bc30-CvXSylS4.js:a', s: 'c1751bc30-CvXSylS4.js:i' },
    'cb499b8fa-BHm49DAk.js': { o: 'cff2bf6cb-HE-LaYyC.js:t' },
    'cf400e6a4-Czw_18bE.js': { gHe: 'c1751bc30-CvXSylS4.js:t', hHe: 'c1751bc30-CvXSylS4.js:r', mHe: 'c1751bc30-CvXSylS4.js:n' },
  });
  assert.equal(located.lazySelector.sha256.slice(0, 16), '3329b549412e5dbe');
});

test('4.16336.0 dialog text the host follows (cf400e6a4 G2e / U2e / LL): same custom range, defaults and check; "File content" as in 3.6556.2 (LL passes no ownDataOnly)', () => {
  const settings = chunk('cf400e6a4-Czw_18bE.js');
  assert.ok(settings.includes('f==="custom"&&b(gHe,{fromDate:r,toDate:a,onFromDateChange:i,onToDateChange:o,maxDate:c})'));
  assert.ok(settings.includes('{value:"custom",label:t.formatMessage({defaultMessage:"Custom",id:"Sjo1P44FYy"})}'));
  assert.ok(settings.includes('f=E(()=>{let e=new Date(`${d}T00:00:00`);return e.setDate(e.getDate()-180),No(e)},[d])'));
  assert.ok(settings.includes('O=(e?w:S)==="custom"&&!hHe({fromDate:_,toDate:v,minDate:e?f:void 0,maxDate:d})'));
  assert.ok(settings.includes('r.conversations_start_date=new Date(`${_}T00:00:00`).toISOString();let e=new Date(`${v}T00:00:00`);e.setDate(e.getDate()+1),r.conversations_end_date=e.toISOString()'));
  assert.ok(settings.includes('showIncludeFileContent:o&&!e&&!t'));
  // Unchanged from 3.6556.2 cYe / uL: the same flag and condition, and the member dialog's only caller passes no ownDataOnly.
  const old = fs.readFileSync(path.join(CHAT_EXPORT.source, 'cf400e6a4-BID2ahY5.js'), 'utf8');
  for (const text of ['o=nn("data_export_skip_files")', 'showIncludeFileContent:o&&!e&&!t', 'return e.setDate(e.getDate()-180),ao(e)},[s])', 'a=cYe({isAuditLogs:!!e})']) assert.ok(old.includes(text), text);
  assert.ok(settings.includes('a=U2e({isAuditLogs:!!e})'));
  assert.equal(settings.split('U2e(').length - 1, 2);
  assert.ok(settings.includes('m&&b(LL,{})'));
  assert.ok(settings.includes('b(K,{variant:"primary",disabled:a.customRangeInvalid,onClick:()=>{s(!1),a.submit()},"data-testid":"export-confirm-button"'));
  assert.ok(chunk('c71ba149d-BCmc0sgr.js').includes('t("div",{className:"flex gap-md",children:[L,W]})'));
  assert.ok(chunk('c1751bc30-CvXSylS4.js').includes('function o({fromDate:e,toDate:t,minDate:n,maxDate:r}){return!!(e&&t)&&!a(e,t)&&!i(e,n,r)&&!i(t,n,r)}'));
});

// Surveyed against 3e4b3979 (blocked by D46: dn / un / Hm / Rm / Wm held without a name); cds-core wave 4 publishes them
// (cds-integrate/wave4), and the staged graph is generated against that owner (e14252ee: the 13 states fallback names
// renamed from the official provider / reader text; bindings and modules as in c868ae21).
test('cds-core is the wave-4 graph (e14252ee) this contract is generated against', () => {
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c');
});

test(staged ? 'the staged 4.16336.0 graph matches its generator' : 'D46: the 4.16336.0 graph stops on cds-core module state without a publicName, and nothing is written', async () => {
  if (staged) {
    await extractChatExportV4({ check: true });
    const manifest = JSON.parse(local(`${CHAT_EXPORT_V4_OUTPUT}/manifest.json`));
    assert.equal(manifest.referenceVersion, '4.16336.0');
    assert.equal(manifest.sharedGraph, 'cds-core');
    // DateField's DatePicker is cowork-scheduled-v4's cff2bf6cb nu (one copy of the date-field state), imported by original name.
    assert.deepEqual(manifest.modules.map(m => m.target).sort(), ['date-field.mjs', 'date-range-selector.mjs', 'date-range.mjs', 'shared-frame.mjs']);
    assert.match(local(`${CHAT_EXPORT_V4_OUTPUT}/date-field.mjs`), /^import \{ nu as o \} from "\.\.\/cowork-scheduled-v4\/cff2bf6cb-HE-LaYyC\.mjs";$/m);
    const owner = JSON.parse(local('src/generated/cowork-scheduled-v4/manifest.json')).modules.find(m => m.target === 'cff2bf6cb-HE-LaYyC.mjs');
    assert.ok(owner.bindings.some(b => (b.name ?? b) === 'nu'), 'cowork-scheduled-v4 holds cff2bf6cb nu');
    assert.ok(!fs.existsSync(path.join(app, CHAT_EXPORT_V4_OUTPUT, 'date-picker.mjs')));
    return;
  }
  await assert.rejects(extractChatExportV4({ dryRun: true }), /^Error: module state cds-core holds without a semantic name \(add it to cds-core publicNames, D46\):\n  shared-frame\.mjs: shared-frame-CJdE5Ria\.js#dn$/);
  const { stateConflicts } = await surveyChatExportV4();
  assert.deepEqual(stateConflicts.map(c => [c.binding, c.text.slice(0, 24)]), [
    ['shared-frame-CJdE5Ria.js#dn', 'var dn=new WeakSet'],
    ['vendor-frame-BckkO60Y.js#Hm', 'var Hm=C({elementRef:{cu'],
    ['vendor-frame-BckkO60Y.js#Rm', 'var Rm=C(Lm)'],
    ['vendor-frame-BckkO60Y.js#Wm', 'var Wm=C({controlId:void'],
    ['shared-frame-CJdE5Ria.js#un', 'var un=ln'],
  ]);
  assert.deepEqual(stateConflicts[0].reachedBy, ['shared-frame-CJdE5Ria.js#hn', 'cff2bf6cb-HE-LaYyC.js#x', 'cff2bf6cb-HE-LaYyC.js#lu', 'cff2bf6cb-HE-LaYyC.js#nu',
    'cb499b8fa-BHm49DAk.js#o', 'cb499b8fa-BHm49DAk.js#c', 'c71ba149d-BCmc0sgr.js#a', 'c71ba149d-BCmc0sgr.js#u']);
  for (const conflict of stateConflicts) assert.equal(conflict.reachedBy.at(-1), 'c71ba149d-BCmc0sgr.js#u', conflict.binding);
  assert.equal(fs.existsSync(path.join(app, CHAT_EXPORT_V4_OUTPUT)), false);
});
