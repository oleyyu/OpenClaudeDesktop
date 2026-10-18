import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// R3-terminal FT-09 (diffgit-01): the Changes pane's finding card is generated from 2.42304.0 by
// scripts/extract-review-findings.mjs (D0: own generator, verify-gen-review-findings.mjs). The generator re-derives
// every module (closure, features, adapters, call sites) and compares it with the files on disk.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const output = path.join(app, 'src/generated/review-findings');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (file) => readFileSync(path.join(app, file), 'utf8');

test('the generated card, focus return and category label are the 2.42304.0 originals (generator --check)', async () => {
  const { extractReviewFindings } = await import('../scripts/extract-review-findings.mjs');
  const manifest = await extractReviewFindings({ check: true });
  assert.deepEqual(JSON.parse(read('src/generated/review-findings/manifest.json')), manifest);
  assert.deepEqual(manifest.modules.map((m) => [m.target, m.source, m.bindings.map((b) => b.name).join(',')]), [
    ['pane-focus-return.mjs', 'cae42d46f-8Va5mKUX.js', 'o,s,c,u,d'],
    ['finding-category.mjs', 'c227f4d5e-Ba-r--Rl.js', 'jq'],
    ['review-finding-card.mjs', 'c44d00c7f-zUAG9XyS.js', 'Zi,ea,ya,ba'],
  ]);
  for (const entry of manifest.modules) {
    assert.equal(entry.referenceVersion, '2.42304.0');
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(entry.sha256, sha(readFileSync(path.join(output, entry.target))), entry.target);
  }
  // The card's imports: React, the view-tabs CDS components by semantic name (D1), the generated focus return, and the
  // five host adapters (intl, the review store's current/status, the spark).
  const card = manifest.modules.find((m) => m.target === 'review-finding-card.mjs');
  const byKind = (kind) => card.imports.filter((i) => i.kind === kind).map((i) => `${i.name}<-${i.via}`).sort();
  assert.deepEqual(byKind('view-tabs'), ['CdsBadge<-shared-frame-BfjMqbuN.js:Vl', 'CdsButton<-shared-frame-BfjMqbuN.js:cl', 'CdsOverflowTooltip<-shared-frame-BfjMqbuN.js:Dc',
    'CdsTooltipProvider<-shared-frame-BfjMqbuN.js:kc', 'clsx<-vendor-frame-DfPJ1QmD.js:za']);
  assert.deepEqual(byKind('adapter'), ['FormattedMessage<-vendor-intl-Db7hDWRO.js:l', 'ReviewSpark<-shared-frame-BfjMqbuN.js:$i',
    'useFindingStatus<-cc8941b7b-CZT9QwXr.js:tt', 'useIntl<-vendor-intl-Db7hDWRO.js:p', 'useIsCurrentFinding<-cc8941b7b-CZT9QwXr.js:Q']);
  assert.deepEqual(byKind('generated'), ['focusReturnRegion<-cae42d46f-8Va5mKUX.js:r', 'returnFocusSoon<-cae42d46f-8Va5mKUX.js:l']);
  assert.deepEqual(manifest.callSites.map((site) => site.binding ?? `${site.source} (raw)`), ['Aa', 'xa', 'Mq', 'c96d752d0-BOCqU7c2.js (raw)']);
  assert.ok(readdirSync(path.join(app, 'scripts')).includes('verify-gen-review-findings.mjs'));
});

test('ea and jq run as shipped', async () => {
  const { findingCategoryLabel } = await import('../src/generated/review-findings/finding-category.mjs');
  assert.equal(findingCategoryLabel('resource_leak'), 'Resource leak');
  assert.equal(findingCategoryLabel('off-by-one'), 'Off by one');
  assert.equal(findingCategoryLabel('  '), undefined);
  assert.equal(findingCategoryLabel(3), undefined);
  assert.equal(findingCategoryLabel('x'.repeat(60)).length, 40);
  const text = read('src/generated/review-findings/review-finding-card.mjs');
  assert.match(text, /defaultMessage: "Lines \{start\}\\u2013\{end\}", id: "LkSZyjr77o"/);
  assert.match(text, /export \{\s*ba as ReviewFindingCard,\s*ea as findingLinesLabel,\s*Zi as DIFF_WIDGET_CARD,\s*\};/);
});

test('the Changes pane renders the generated card; the hand-written card and "Next →" are gone', async () => {
  const pane = read('src/source-pane-review.jsx');
  assert.match(pane, /from "\.\/generated\/review-findings\/review-finding-card\.mjs"/);
  assert.match(pane, /<ReviewFindingCard sessionId=\{null\} annotation=\{annotation\} onDismiss=\{onDismiss\} onFix=\{onFix \?\? undefined\} onNext=\{onNext \?\? undefined\} \/>/);
  assert.doesNotMatch(pane, /spr-fix|spr-next|spr-summary|function Badge/);
  assert.doesNotMatch(read('src/source-pane-review.css'), /\.spr-card \{|\.spr-badge|\.spr-fix/);
  for (const name of readdirSync(path.join(app, 'src')).filter((n) => /\.(m?js|jsx)$/.test(n))) assert.ok(!read(`src/${name}`).includes('Next →'), name);
  const zh = (await import('../electron/i18n/zh-CN/panes.mjs')).default;
  assert.equal(typeof zh['Next finding after the one on line {line}'], 'string');
  assert.ok(!('Next →' in zh));
  for (const key of ['Line {line}', 'Lines {start}–{end}', 'Next finding', 'Dismiss finding', 'Fix this one', 'Fixing…', 'Confirmed', 'Plausible'])
    assert.equal(typeof zh[key], 'string', key);
});
