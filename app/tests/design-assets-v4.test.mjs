import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { prepareDesignV4 } from '../scripts/prepare-design-v4.mjs';
import * as official from '../scripts/official-4.16336.0.mjs';
let output, manifest;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
before(async () => { output = await fs.mkdtemp(path.join(os.tmpdir(), 'design-v4-')); manifest = await prepareDesignV4({ output }); });
after(() => fs.rm(output, { recursive: true, force: true }));

test('staged CSS uses the exact target, original load order and independently pinned design hashes', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.deepEqual(manifest.entryStylesheets, ['shared-frame-BRemtw6F.css', 'shared-styles-C9nbzN1z.css', 'c6a992d55-_JRfOmTh.css']);
  assert.equal(manifest.componentStylesheets.length, 22);
  assert.equal(manifest.rootAttributes['data-density'], 'comfortable');
  assert.equal(manifest.rootAttributes['data-cds-fizzy-lake'], 'color panels type');
  const hashes = {
    'shared-frame-BRemtw6F.css': 'b2e2c88a748ea2603199b40a2ab58124ed843750ef36a1f8b57c2631760259a0',
    'shared-styles-C9nbzN1z.css': '97e65601ccfc00a8fbea1fb7c1aab3658e79b100a6346746eb3dd5f57ae96687',
    'c6a992d55-_JRfOmTh.css': 'e704135f9b14bd261438f0c2f3b4a5eb604a92418c8edee4c9d5580cba70e161',
  };
  for (const file of manifest.files.filter(file => file.kind === 'css')) {
    const source = await fs.readFile(path.join(official.ionSource, file.source), 'utf8');
    const actual = await fs.readFile(path.join(output, file.target), 'utf8');
    assert.equal(actual, source.replaceAll('/assets/v1/', './'));
    if (hashes[file.source]) assert.equal(file.sourceSha256, hashes[file.source]);
    for (const dependency of file.references) await fs.access(path.join(output, 'assets/v1', dependency));
  }
});

test('new icon font and both numeric maps are staged together with every CSS font byte-identical', async () => {
  assert.equal(manifest.files.filter(file => file.kind === 'font').length, 81);
  for (const file of manifest.files.filter(file => file.kind === 'font')) {
    const source = await fs.readFile(path.join(official.ionSource, file.source));
    const actual = await fs.readFile(path.join(output, file.target));
    assert.deepEqual(actual, source);
    assert.equal(sha(actual), file.sha256);
  }
  const font = await fs.readFile(path.join(output, 'assets/v1/c0f671921-DhLyA8zC.woff2'));
  assert.equal(font.length, 155488);
  const icons = JSON.parse(await fs.readFile(path.join(output, 'reference/anthropicons-v4.json'), 'utf8'));
  assert.equal(Object.keys(icons.icons).length, 412);
  assert.equal(Object.keys(icons.secondary).length, 24);
  assert.equal(icons.icons.CaretDownSmall, 0xf003);
  assert.equal(icons.icons.Reply, 0xf087);
});

test('regeneration detects modified and extra staged files', async () => {
  await prepareDesignV4({ output, check: true });
  const css = path.join(output, 'assets/v1/shared-styles-C9nbzN1z.css');
  const original = await fs.readFile(css);
  await fs.appendFile(css, '\n/* tamper */');
  await assert.rejects(prepareDesignV4({ output, check: true }), /Staged design mismatch/);
  await fs.writeFile(css, original);
  const extra = path.join(output, 'extra.css');
  await fs.writeFile(extra, '');
  await assert.rejects(prepareDesignV4({ output, check: true }), /inventory differs/);
  await fs.rm(extra);
  await prepareDesignV4({ output, check: true });
});
