// Global type tokens: Claude has no --cds-font-code; local rules that read it must get the
// design-system mono chain (--cds-font-mono, design-system.css:206 --font-anthropic-mono) even
// when the user has not picked a Code font (main.jsx only sets it inline for a custom font).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('style.css :root defines --cds-font-code as the CDS mono chain', () => {
  const root = style.match(/(^|\n):root\s*\{([^}]*)\}/);
  assert.ok(root, ':root block present');
  assert.match(root[2], /--cds-font-code:\s*var\(--cds-font-mono\)\s*;/);
});
