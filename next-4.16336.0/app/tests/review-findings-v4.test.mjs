// Region batch 2a (review-findings, region-plan G6): the isolated 4.16336.0 graph of the Changes pane's review finding
// card (src/generated/review-findings-v4, scripts/extract-review-findings.mjs version 4.16336.0, sharedGraph cds-core).
// The 3.6556.2 graph (src/generated/review-findings) keeps serving the host and pierre-changes, which links it by
// original identity, until the cutover; tests/review-findings*.test.mjs keep pinning it. Official code is never executed
// here: the generated modules are imported, the chunks only read as text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-4.16336.0.mjs';
import { contracts, extractReviewFindings } from '../scripts/extract-review-findings.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

const app = path.resolve(import.meta.dirname, '..');
const out = path.join(app, 'src/generated/review-findings-v4');
const legacyOut = path.join(app, 'src/generated/review-findings');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const chunk = name => readFileSync(path.join(official.ionSource, name), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const cdsCore = JSON.parse(readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
const quiet = async run => { const log = console.log; console.log = () => {}; try { return await run(); } finally { console.log = log; } };

// The adapters are .jsx: the graph loads through Vite SSR (one module graph, as tests/review-findings.test.mjs).
const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = target => server.ssrLoadModule(`/src/generated/review-findings-v4/${target}`);
const adapters = await server.ssrLoadModule('/src/source-review-findings-adapters.jsx');

// A top-level declaration in the unformatted chunk bytes: the text cds-core (runSlicer) hashes its bindings by.
function rawDeclaration(file, name) {
  const text = chunk(file);
  const node = parsers.babel.parse(text, {}).program.body.flatMap(n => (n.type === 'FunctionDeclaration' ? [n]
    : n.type === 'VariableDeclaration' ? n.declarations : [])).find(n => n.id?.name === name);
  assert.ok(node, `${file}: no top-level declaration ${name}`);
  return text.slice(node.start, node.end);
}

test('the 4.16336.0 contract regenerates byte for byte, beside the unchanged 3.6556.2 graph', async () => {
  assert.deepEqual(Object.keys(contracts), ['3.6556.2', '4.16336.0']);
  assert.deepEqual(await quiet(() => extractReviewFindings({ check: true, version: '4.16336.0' })), manifest);
  const legacy = await quiet(() => extractReviewFindings({ check: true }));
  assert.equal(legacy.referenceVersion, '3.6556.2', 'the default contract stays the production 3.6556.2 graph');
  assert.deepEqual(JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8')), legacy);
  assert.equal(legacy.sharedGraph, undefined);
  assert.equal(legacy.isolatedGraph, undefined);
  assert.deepEqual(readdirSync(legacyOut).sort(), ['finding-category.mjs', 'manifest.json', 'pane-focus-return.mjs', 'review-finding-card.mjs']);
  await assert.rejects(extractReviewFindings({ version: '4.16336.0', contract: contracts['4.16336.0'] }), /check: true only/);
  await assert.rejects(extractReviewFindings({ check: true, version: '9.9.9' }), /no 9\.9\.9 source contract/);
});

test('manifest: 4.16336.0 snapshot, cds-core shared graph, isolated until pierre-changes moves', () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.isolatedGraph, { productionOutput: 'src/generated/review-findings', productionSwitchNotBeforeBatch: 11, heldBy: ['pierre-changes'] });
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source, m.bindings.map(b => b.name).join(',')]), [
    // wave 7: shared-frame I4 is the cds-core publicName state_sharedframe_I4 (module state), linked instead of cut.
    ['compiler-helpers.mjs', official.sharedFrame, 'J9,J8,J0,J1,J2,J3,J4,J5,K0,K1,K2,K3,K4,K5,I1,I2,I3,Z1'],
    ['pane-focus-return.mjs', 'shared-1-D1bGaTaN.js', 'uI,dI,fI,mI,hI'],
    ['finding-category.mjs', 'cd4f82e77-Cuw99s6A.js', 'dr,fr'],
    ['inline-code-split.mjs', 'c96d6655d-BjCrWdGK.js', 'e,t'],
    ['inline-code.mjs', 'c2ed6676f-Bf5-wRdo.js', 'i,o'],
    ['review-finding-card.mjs', 'c44d00c7f-DNez7133.js', 'll,pl,Pl,Fl'],
  ]);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, '4.16336.0');
    assert.equal(m.sourceSha256, sha(readFileSync(path.join(official.ionSource, m.source))), m.source);
    assert.equal(m.sha256, sha(readFileSync(path.join(out, m.target))), m.target);
    assert.match(readFileSync(path.join(out, m.target), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
    for (const i of m.imports) assert.doesNotMatch(i.from, /view-tabs|\/review-findings\/|r4e-findings/, `${m.target} ${i.local}: no 3.6556.2 graph`);
  }
  assert.deepEqual(manifest.callSites.map(site => site.binding ?? `${site.source} (raw)`), ['Gl', 'Il', 'pr', 'c96d752d0-D9VB6ArX.js (raw)']);
  assert.ok(manifest.callSites.every(site => site.sourceSha256 === sha(readFileSync(path.join(official.ionSource, site.source)))));
});

test('cds-core: CDS names are linked, held compiler helpers are identical pure copies, no module state is copied (D46)', () => {
  const card = mod('review-finding-card.mjs');
  const linked = card.imports.filter(i => i.kind === 'shared-graph').map(i => `${i.name}<-${i.via}`).sort();
  assert.deepEqual(linked, [`CdsBadge<-${official.sharedFrame}:Pu`, `CdsButton<-${official.sharedFrame}:Id`, `CdsOverflowTooltip<-${official.sharedFrame}:sd`,
    `CdsTooltipProvider<-${official.sharedFrame}:ld`, `I4<-${official.sharedFrame}:om`, `clsx<-${official.vendorFrame}:Fa`]);
  for (const i of card.imports.filter(i => i.kind === 'shared-graph')) {
    // a component is imported under its publicName; a wave-5+ binding (state_sharedframe_I4) under its export name (its local)
    const entry = cdsCore.publicNames[i.name] ?? Object.values(cdsCore.publicNames).find(e => e.file === i.via.split(':')[0] && e.exportName === i.name && e.local === i.name);
    assert.ok(entry, `${i.name} is a cds-core publicName`);
    assert.equal(i.from, `../cds-core/${entry.target}`);
    assert.equal(i.original, entry.local);
    assert.equal(entry.file, i.via.split(':')[0]);
  }
  const held = new Map(cdsCore.modules.filter(m => path.basename(m.source) === official.sharedFrame).flatMap(m => m.bindings.map(b => [b.name, b.sha256])));
  const helpers = mod('compiler-helpers.mjs');
  assert.deepEqual([...helpers.heldByCdsCore].sort(), helpers.bindings.map(b => b.name).sort());
  for (const name of helpers.heldByCdsCore) assert.equal(held.get(name), sha(rawDeclaration(official.sharedFrame, name)), name);
  const proved = official.assertCompilerHelpers(chunk(official.sharedFrame));
  for (const [local, name] of Object.entries(helpers.exports)) assert.equal(proved[name].local, local, name);
  for (const m of manifest.modules.filter(m => m.target !== 'compiler-helpers.mjs')) assert.deepEqual(m.heldByCdsCore, [], m.target);
  // The host spark: the CdsAnimatedSpark import (shared-frame Wa = dM) is the ReviewSpark adapter (SourceSpark, persona C2).
  assert.equal(cdsCore.publicNames.CdsAnimatedSpark.local, 'dM');
  const adapterImports = card.imports.filter(i => i.kind === 'adapter').map(i => `${i.name}<-${i.via}`).sort();
  assert.deepEqual(adapterImports, ['FormattedMessage<-vendor-intl-BJgYK7RA.js:l', `ReviewSpark<-${official.sharedFrame}:Wa`,
    'useFindingStatus<-cc8941b7b-C4hsxbbb.js:st', 'useIntl<-vendor-intl-BJgYK7RA.js:p', 'useIsCurrentFinding<-cc8941b7b-C4hsxbbb.js:rt']);
  for (const i of card.imports.filter(i => i.kind === 'adapter')) assert.ok(adapters[i.name], `adapter ${i.name} is exported by the host module`);
});

test('roots are located, never guessed: the memo wrapper, unique features, and a failure stops generation', async () => {
  const card = chunk('c44d00c7f-DNez7133.js');
  // region-plan's v4Roots guessed `fo` (shape-equal-ambiguous); fo is another memo() and is not this card.
  assert.ok(/(?<![\w$])Fl=[\w$]{1,3}\(Pl\)/.test(card), 'Fl = memo(Pl)');
  assert.ok(/(?<![\w$])fo=[\w$]{1,3}\(co\)/.test(card), 'fo = memo(co), another component');
  assert.ok(!mod('review-finding-card.mjs').bindings.some(b => b.name === 'fo' || b.name === 'co'));
  const v4 = contracts['4.16336.0'];
  const variant = (edit) => { const copy = structuredClone({ ...v4, official: undefined }); copy.official = official; edit(copy); return copy; };
  // Pl without its distinguishing features: other components of the chunk match too, so generation stops.
  await assert.rejects(extractReviewFindings({ check: true, contract: variant(c => { c.modules.at(-1).features.Pl = ['defaultMessage:']; }) }),
    /root Pl is not the unique declaration with its features/);
  // The memo root must wrap the located component.
  await assert.rejects(extractReviewFindings({ check: true, contract: variant(c => { c.modules.at(-1).memoOf = { Fl: 'pl' }; }) }),
    /root Fl is not the one memo\(pl\)/);
  // A feature the official text no longer carries fails generation.
  await assert.rejects(extractReviewFindings({ check: true, contract: variant(c => { c.modules.at(-1).features.Pl.push('defaultMessage: "Fix all",'); }) }),
    /lacks|not the unique declaration/);
  // D46: module state cds-core holds without a publicName (shared-frame Fc, a WeakSet; dn, the probe before, is published
  // since cds-core wave 4) is reported, never copied.
  const d46 = await extractReviewFindings({ check: true, contract: variant(c => {
    c.uniqueRoots = false; c.modules = [{ target: 'probe.mjs', source: official.sharedFrame, exports: { Fc: 'probe' } }]; c.callSites = []; c.rawCallSites = [];
  }) }).then(() => null, error => error);
  assert.match(d46?.message ?? '', /D46/);
  assert.deepEqual(d46.stateConflicts.map(c => [c.binding, c.reachedBy]), [[`${official.sharedFrame}#Fc`, 'probe.mjs:probe -> Fc']]);
  assert.match(d46.stateConflicts[0].text, /^Fc\s*=\s*new WeakSet/);
});

test('the sliced helpers run as shipped (category, scenario, inline code, focus return)', async () => {
  const { findingCategoryLabel, findingScenario } = await load('finding-category.mjs');
  assert.equal(findingCategoryLabel('resource_leak'), 'Resource leak');
  assert.equal(findingCategoryLabel('off-by-one'), 'Off by one');
  assert.equal(findingCategoryLabel('  '), undefined);
  assert.equal(findingCategoryLabel(3), undefined);
  assert.equal(findingCategoryLabel('x'.repeat(60)).length, 40);
  assert.equal(findingScenario(' - '), undefined);
  assert.equal(findingScenario(''), undefined);
  assert.equal(findingScenario(undefined), undefined);
  assert.equal(findingScenario('  n = 0 '), 'n = 0');
  const { splitInlineCode } = await load('inline-code-split.mjs');
  assert.deepEqual(splitInlineCode('call `f()` now'), [{ text: 'call ', isCode: false }, { text: 'f()', isCode: true }, { text: ' now', isCode: false }]);
  const focus = await load('pane-focus-return.mjs');
  assert.deepEqual(Object.keys(focus).sort(), ['focusReturnRegion', 'paneFocusTarget', 'paneRootOf', 'returnFocusSoon', 'returnFocusSoonTo']);
  const body = { matches: s => s.includes('data-diff-pane-body'), querySelector: () => null };
  assert.equal(focus.paneFocusTarget(body), body);
  const root = { matches: () => false, querySelector: s => (s === '[data-diff-pane-body]' ? body : null) };
  assert.equal(focus.paneFocusTarget(root), body);
  assert.equal(focus.focusReturnRegion({ closest: s => (s.includes('data-diff-pane-body') ? body : null) }), body);
  assert.equal(focus.paneRootOf(null), null);
});

test('the card renders the 4.16336.0 layout through the host adapters', async () => {
  const { ReviewFindingCard, findingLinesLabel, DIFF_WIDGET_CARD } = await load('review-finding-card.mjs');
  assert.equal(ReviewFindingCard.$$typeof, Symbol.for('react.memo'));
  assert.match(DIFF_WIDGET_CARD, /^rounded border border-\[var\(--diff-widget-border/);
  const intl = { formatMessage: (m, v) => m.defaultMessage.replace(/\{(\w+)\}/g, (_, k) => v[k]) };
  assert.equal(findingLinesLabel(3, 3, intl), 'Line 3');
  assert.equal(findingLinesLabel(3, 5, intl), 'Lines 3–5');
  const annotation = { id: 'finding-t-0', startLine: 3, endLine: 5, line: 3, body: 'Use `close()` here', detail: 'Leaks a `fd`', category: 'Resource leak', verdict: 'CONFIRMED' };
  const render = (state, props) => renderToStaticMarkup(React.createElement(adapters.ReviewFindingStateContext.Provider, { value: state },
    React.createElement(ReviewFindingCard, { sessionId: null, annotation, onDismiss() {}, onFix() {}, onNext() {}, ...props })));
  const open = render({ current: true, status: 'open' });
  assert.match(open, /aria-current="true"/);
  assert.match(open, /border-accent ring-1 ring-accent/);
  assert.match(open, />Claude</);
  assert.match(open, />Lines 3–5</);
  assert.match(open, />Confirmed</);
  assert.match(open, /aria-label="Next finding after the one on line 3"/);
  assert.match(open, /aria-label="Dismiss finding"/);
  assert.match(open, />Fix this one</);
  assert.match(open, /<code dir="ltr" class="rounded-chip bg-alpha-1 px-xs text-code-regular">close\(\)<\/code>/);
  assert.match(open, /<code dir="ltr" class="rounded-chip bg-alpha-1 px-xs text-code-regular">fd<\/code>/);
  // 4.16336.0: the category badge sits in the footer, before Fix this one.
  assert.ok(open.indexOf('Resource leak') > open.indexOf('Leaks a'), 'category after the body');
  assert.ok(open.indexOf('Resource leak') < open.indexOf('Fix this one'));
  assert.match(open, /border-t border-\[var\(--diff-widget-border,var\(--cds-border\)\)\] ps-md pe-sm py-xs/);
  // An open finding without Fix keeps its footer for the category; with neither, no footer.
  assert.match(render({ current: false, status: 'open' }, { onFix: undefined }), /Resource leak/);
  assert.doesNotMatch(render({ current: false, status: 'open' }, { onFix: undefined, annotation: { ...annotation, category: undefined } }), /border-t/);
  // Statuses: unchanged is new in 4.16336.0; addressed / fixing as before; a settled finding has no Next.
  assert.match(render({ current: false, status: 'unchanged' }), />No change needed</);
  assert.match(render({ current: false, status: 'addressed' }), />Fixed</);
  assert.match(render({ current: false, status: 'fixing' }), />Fixing…</);
  assert.doesNotMatch(render({ current: false, status: 'addressed' }), /Next finding|Fix this one/);
  // A lineless finding has no line label; a blank / "-" scenario renders no second paragraph.
  const lineless = render({ current: false, status: 'open' }, { annotation: { ...annotation, line: undefined, detail: '-' } });
  assert.doesNotMatch(lineless, /Lines 3/);
  assert.equal((lineless.match(/whitespace-pre-wrap/g) ?? []).length, 1);
  assert.match(lineless, /aria-label="Next finding"/);
});
