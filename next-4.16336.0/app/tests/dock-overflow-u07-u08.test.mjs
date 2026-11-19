import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDING_OVERFLOWS_ATTR, LANDING_SCROLL_CLASS, landingOverflows } from '../src/landing-overflow.mjs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('U-07: the Code landing row scrolls (shared-38 nr) and Zke marks it when the dock column passes its height', () => {
  assert.equal(LANDING_OVERFLOWS_ATTR, 'data-landing-overflows');
  assert.equal(LANDING_SCROLL_CLASS, 'relative overflow-x-hidden overflow-y-auto u-hidden-scrollbar scroll-py-(--cds-scroll-fade-size) data-[landing-overflows]:scroll-fade-y');
  const row = { clientHeight: 507 };
  const column = (top, height) => ({ offsetHeight: height, offsetTop: top, offsetParent: row });
  assert.equal(landingOverflows(column(45, 651), row), true);
  assert.equal(landingOverflows(column(300, 200), row), false);
  assert.equal(landingOverflows(column(300, 209), row), false, 'Zke allows 2px');
  assert.equal(landingOverflows(null, row), false);
  const main = read('src/main.jsx');
  assert.match(main, /const codeLanding = !current && mode === 'code' && section === 'new';\n  const landingColumnRef = useLandingOverflow\(codeLanding\);/);
  assert.match(main, /homeScrollClass : codeLanding \? LANDING_SCROLL_CLASS : ''/);
  assert.match(main, /<div ref=\{landingColumnRef\} className=\{mode === "code" \? "code-dock-column flex min-w-0 shrink-0 flex-col" : "contents"\}/);
});

test('U-08: the notice stack is bounded and scrolls itself', () => {
  const css = read('src/source-session-notices.css');
  assert.match(css, /\[data-code-column-notices\] \{\n  max-height: min\(40vh, 16rem\);\n  overflow-y: auto;\n  overscroll-behavior: contain;/);
});
