import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

// R3-terminal FT-09 (diffgit-01), w2-tr-findings: the Changes pane's finding card is generated from 3.6556.2 by
// scripts/extract-review-findings.mjs (D0: own generator, verify-gen-review-findings.mjs). The generator re-derives
// every module (closure, features, adapters, call sites) and compares it with the files on disk.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const output = path.join(app, 'src/generated/review-findings');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (file) => readFileSync(path.join(app, file), 'utf8');

test('the generated card, focus return and category label are the 3.6556.2 originals (generator --check)', async () => {
  const { extractReviewFindings } = await import('../scripts/extract-review-findings.mjs');
  const manifest = await extractReviewFindings({ check: true });
  assert.deepEqual(JSON.parse(read('src/generated/review-findings/manifest.json')), manifest);
  assert.deepEqual(manifest.modules.map((m) => [m.target, m.source, m.bindings.map((b) => b.name).join(',')]), [
    // 2.42304.0 cae42d46f (o,s,c,u,d) is gone; the same five declarations live in shared-1 (research §1.2).
    ['pane-focus-return.mjs', 'shared-1-BJhqMmkf.js', 'tC,nC,rC,aC,oC'],
    ['finding-category.mjs', 'c227f4d5e-B-FYKrwT.js', 'b1'],
    ['review-finding-card.mjs', 'c44d00c7f-Cr1FDL2F.js', '$s,nc,Cc,wc'],
  ]);
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  for (const entry of manifest.modules) {
    assert.equal(entry.referenceVersion, '3.6556.2');
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(entry.sha256, sha(readFileSync(path.join(output, entry.target))), entry.target);
  }
  // The card's imports: React (R3 aliases), the view-tabs CDS components and React Compiler helpers by semantic name
  // (D1/E3, never a second copy), the generated focus return, and the five host adapters (intl, the review store's
  // current/status, the spark).
  const card = manifest.modules.find((m) => m.target === 'review-finding-card.mjs');
  const byKind = (kind) => card.imports.filter((i) => i.kind === kind).map((i) => `${i.name}<-${i.via}`).sort();
  assert.deepEqual(byKind('react'), ['jsx<-vendor-frame-CnSY1sxv.js:Ha', 'jsxs<-vendor-frame-CnSY1sxv.js:Ua', 'memo<-vendor-frame-CnSY1sxv.js:so', 'useRef<-vendor-frame-CnSY1sxv.js:Co']);
  const viewTabs = byKind('view-tabs');
  assert.deepEqual(viewTabs.filter((name) => !name.startsWith('memo') && !name.startsWith('reactMemoCache')), ['CdsBadge<-shared-frame-6jtSkIit.js:ad', 'CdsButton<-shared-frame-6jtSkIit.js:Eu',
    'CdsOverflowTooltip<-shared-frame-6jtSkIit.js:Gl', 'CdsTooltipProvider<-shared-frame-6jtSkIit.js:ql', 'clsx<-vendor-frame-CnSY1sxv.js:Ba']);
  assert.ok(viewTabs.includes('reactMemoCache<-shared-frame-6jtSkIit.js:ip'));
  assert.ok(card.imports.every((i) => i.kind !== 'view-tabs' || i.from === `../view-tabs/${i.via.split(':')[0]}`), 'concrete 3.6556.2 view-tabs files (R6)');
  assert.deepEqual(byKind('adapter'), ['FormattedMessage<-vendor-intl-DYfox5Co.js:l', 'ReviewSpark<-shared-frame-6jtSkIit.js:fa',
    'useFindingStatus<-cc8941b7b-DAgMZRvX.js:tt', 'useIntl<-vendor-intl-DYfox5Co.js:p', 'useIsCurrentFinding<-cc8941b7b-DAgMZRvX.js:Z']);
  assert.deepEqual(byKind('generated'), ['focusReturnRegion<-shared-1-BJhqMmkf.js:cu', 'returnFocusSoon<-shared-1-BJhqMmkf.js:mu']);
  assert.deepEqual(manifest.callSites.map((site) => site.binding ?? `${site.source} (raw)`), ['Pc', 'Tc', 'x1', 'c96d752d0-CWv_7-n9.js (raw)']);
  assert.ok(readdirSync(path.join(app, 'scripts')).includes('verify-gen-review-findings.mjs'));
});

test('nc and b1 run as shipped', async () => {
  const { findingCategoryLabel } = await import('../src/generated/review-findings/finding-category.mjs');
  assert.equal(findingCategoryLabel('resource_leak'), 'Resource leak');
  assert.equal(findingCategoryLabel('off-by-one'), 'Off by one');
  assert.equal(findingCategoryLabel('  '), undefined);
  assert.equal(findingCategoryLabel(3), undefined);
  assert.equal(findingCategoryLabel('x'.repeat(60)).length, 40);
  const text = read('src/generated/review-findings/review-finding-card.mjs');
  assert.match(text, /defaultMessage: "Lines \{start\}\\u2013\{end\}", id: "LkSZyjr77o"/);
  assert.match(text, /export \{\s*wc as ReviewFindingCard,\s*nc as findingLinesLabel,\s*\$s as DIFF_WIDGET_CARD,\s*\};/);
  // T13: the 3.6556.2 ids of Fixed / Plausible (the catalog is keyed by English text, so zh is unchanged).
  assert.match(text, /defaultMessage: "Fixed",\s*id: "BNEz9MFGbU"/);
  assert.match(text, /defaultMessage: "Plausible",\s*id: "FNzj2neHoF"/);
  assert.doesNotMatch(text, /jzcSPWIERo|yGFFVQ5iEZ/);
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
