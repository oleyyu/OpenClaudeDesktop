// R4i-transcript TR2: one focus ring on a landed approval card. The official card's outline is on the frame as
// utilities (3.6556.2 c2d1aeb56 G on cc32965c2's tool card; 2.42304.0 c12c146ad R on c96d752d0's); the slot's landing
// (c6dc54e94 I with h, 2.42304.0 c227f4d5e Zw with Yw) adds focus-visible:outline-none and an ::after ring, and the
// compiled sheet orders outline-none after outline-1, so only the ring shows. A local .sac-card:focus-visible rule drew
// the outline under that ring as well.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = file => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('the official card outline is c2d1aeb56 G on the tool card frame, and the landing focuses with h on a positioned card', () => {
  const frame = read(path.join(v3, 'c2d1aeb56-BwMYdDs2.js'));
  assert.equal(count(frame, 'G="focus-visible:outline-1 focus-visible:outline-fill-accent focus-visible:outline-offset-2"'), 1);
  assert.equal(count(frame, 'G as n,'), 1);
  const feed = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  assert.equal(count(feed, 'n as co,'), 1);
  assert.equal(count(feed, 'aa=Kn==="card"&&"w-full max-w-[480px]",oa=J1($,268,aa)?K1($,268,aa,y("gap-[24px]",co,aa))'), 1);
  const shell = read(path.join(v3, 'c6dc54e94-E5GA6ry5.js'));
  assert.equal(count(shell, 'h="focus-visible:outline-none focus-visible:after:pointer-events-none'), 1);
  const landing = read(path.join(app, 'src/generated/approval-landing/card-landing.mjs'));
  assert.equal(count(landing, 'He(t, e ? Ve : Ue);'), 1);
  assert.match(landing, /ringClassesPositioned as Ve,\s+focusWithRing as He,\s+ringClasses as Ue,\s+\} from "\.\/focus-ring\.mjs";/);
});

test('the compiled sheet lets h\'s outline-none win over the card outline, and the host card carries the utilities', () => {
  const css = read(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'));
  const one = css.indexOf('.focus-visible\\:outline-1:focus-visible'), none = css.indexOf('.focus-visible\\:outline-none:focus-visible');
  assert.ok(one >= 0 && none > one, 'outline-none comes after outline-1');
  for (const name of ['outline-fill-accent', 'outline-offset-2', 'after\\:shadow-focus', 'after\\:absolute'])
    assert.ok(css.includes(`.focus-visible\\:${name}:focus-visible`), name);
  const local = read(path.join(app, 'src/source-approval-card.css'));
  assert.doesNotMatch(local, /\.sac-card:focus-visible/, 'no local outline rule');
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  assert.equal(count(card, 'export const CARD_FOCUS_OUTLINE = "focus-visible:outline-1 focus-visible:outline-fill-accent focus-visible:outline-offset-2";'), 1);
  assert.equal(count(card, 'className={`source-message sac-card ${CARD_FOCUS_OUTLINE} ${className}`.trim()}'), 1);
  // The card is position: relative, so the landing takes h (the ::after ring) rather than m.
  assert.match(local, /\.sac-card \{\n  position: relative;/);
});
