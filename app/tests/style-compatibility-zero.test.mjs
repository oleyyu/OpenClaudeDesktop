// w10-cleanup-final (research/w10-cleanup.md compat-zero, E34 close-out): every generator that referenced a utility
// the 3.6556.2 Tailwind build dropped has moved to 3.6556.2, so the compatibility layer is empty. This test locks it:
//   - the published manifest (public/style-compatibility.json) retains no prior-snapshot rule and no theme token;
//   - public/assets/legacy-utilities.css holds no rule and no declaration (only the empty `@layer utilities{}`);
//   - a dry run of the scanner over today's src still retains nothing, so a new reference to an absent prior utility
//     fails here instead of being kept alive by the layer (the fix is the owning generator or CDS/official classes,
//     never host styling: memory rule "UI follows official design only");
//   - the E34 frozen legacy inputs (scripts/*-legacy-2.42304.0.json) and generated `legacy` sections are gone.
// The baseline chain (2.42304.0, 2.37337.1) stays in prepare-style-compatibility.mjs on purpose: it is what the dry run
// compares against; without it the lock would be vacuous. index.html keeps the (empty) stylesheet link, as
// tests/current-design-assets.test.mjs and tests/curchat-retired.test.mjs expect. Source only; nothing renders.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
import {prepareStyleCompatibility} from '../scripts/prepare-style-compatibility.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const manifest = JSON.parse(read('public/style-compatibility.json'));
const css = read('public/assets/legacy-utilities.css');

test('the published compatibility manifest retains no rule and no theme token', () => {
  assert.equal(manifest.currentVersion, '3.6556.2');
  assert.deepEqual(manifest.rules, []);
  assert.deepEqual(manifest.tokens, []);
  assert.equal(manifest.output, 'assets/legacy-utilities.css');
  assert.equal(manifest.outputSha256, createHash('sha256').update(css).digest('hex'));
  assert.deepEqual(manifest.scanner.warnings, []);
});

test('legacy-utilities.css is an empty utilities layer', () => {
  const ast = postcss.parse(css);
  let rules = 0, decls = 0;
  ast.walkRules(() => { rules += 1; });
  ast.walkDecls(() => { decls += 1; });
  assert.equal(rules, 0);
  assert.equal(decls, 0);
  const layers = ast.nodes.filter(node => node.type === 'atrule');
  assert.deepEqual(layers.map(node => [node.name, node.params, node.nodes.length]), [['layer', 'utilities', 0]]);
  assert.doesNotMatch(css, /@layer theme/);
});

test('a dry run over the current sources still retains nothing (no new reference to an absent prior utility)', async () => {
  const fresh = await prepareStyleCompatibility({dryRun: true});
  const held = fresh.rules.map(rule => `${rule.selector} <- ${rule.references.flatMap(ref => ref.hits.map(hit => `${hit.file} ${hit.binding}`)).join(', ')}`);
  assert.deepEqual(held, []);
  assert.deepEqual(fresh.tokens.map(token => token.property), []);
  assert.equal(fresh.outputSha256, manifest.outputSha256);
});

test('the E34 frozen 2.42304.0 legacy inputs and generated legacy sections are gone', () => {
  assert.deepEqual(fs.readdirSync(path.join(app, 'scripts')).filter(name => /-legacy-2\.42304\.0\.json$/.test(name)), []);
  for (const dir of ['src/generated', 'electron/generated']) {
    const base = path.join(app, dir);
    for (const area of fs.readdirSync(base, {withFileTypes: true}).filter(entry => entry.isDirectory())) {
      const file = path.join(base, area.name, 'manifest.json');
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!data || Array.isArray(data)) continue;
      for (const key of ['legacy', 'legacyImporters']) {
        if (!(key in data)) continue;
        const value = data[key];
        assert.equal(Array.isArray(value) ? value.length : Object.keys(value ?? {}).length, 0, `${dir}/${area.name} ${key}`);
      }
    }
  }
});
