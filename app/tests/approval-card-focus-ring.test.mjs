// R4i-transcript TR2: one focus ring on a landed approval card. 2.42304.0 puts the card's outline on the frame as utilities
// (c12c146ad R, on c96d752d0's tool card); qj's landing (c227f4d5e Zw with Yw) adds focus-visible:outline-none and an
// ::after ring, and the compiled sheet orders outline-none after outline-1, so only the ring shows. A local
// .sac-card:focus-visible rule drew the outline under that ring as well.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = file => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('the official card outline is c12c146ad R on the tool card frame, and Zw lands with Yw on a positioned card', () => {
  const frame = read(path.join(v1, 'c12c146ad-CuJdg7K3.js'));
  assert.equal(count(frame, 'R="focus-visible:outline-1 focus-visible:outline-fill-accent focus-visible:outline-offset-2"'), 1);
  assert.equal(count(frame, 'R as s,'), 1);
  const feed = read(path.join(v1, 'c96d752d0-BOCqU7c2.js'));
  assert.equal(count(feed, 's as SCe,'), 1);
  assert.equal(count(feed, 'className:Us("gap-[24px]",SCe,Ot==="card"&&"w-full max-w-[480px]")'), 1);
  const shell = read(path.join(v1, 'c227f4d5e-Ba-r--Rl.js'));
  assert.equal(count(shell, 'Yw="focus-visible:outline-none focus-visible:after:pointer-events-none'), 1);
  const landing = read(path.join(app, 'src/generated/approval-landing/card-landing.mjs'));
  assert.equal(count(landing, 'Ole(t, e ? wle : Sle);'), 1);
});

test('the compiled sheet lets Yw\'s outline-none win over the card outline, and the host card carries the utilities', () => {
  const css = read(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'));
  const one = css.indexOf('.focus-visible\\:outline-1:focus-visible'), none = css.indexOf('.focus-visible\\:outline-none:focus-visible');
  assert.ok(one >= 0 && none > one, 'outline-none comes after outline-1');
  for (const name of ['outline-fill-accent', 'outline-offset-2', 'after\\:shadow-focus', 'after\\:absolute'])
    assert.ok(css.includes(`.focus-visible\\:${name}:focus-visible`), name);
  const local = read(path.join(app, 'src/source-approval-card.css'));
  assert.doesNotMatch(local, /\.sac-card:focus-visible/, 'no local outline rule');
  const card = read(path.join(app, 'src/source-approval-card.jsx'));
  assert.equal(count(card, 'export const CARD_FOCUS_OUTLINE = "focus-visible:outline-1 focus-visible:outline-fill-accent focus-visible:outline-offset-2";'), 1);
  assert.equal(count(card, 'className={`source-message sac-card ${CARD_FOCUS_OUTLINE} ${className}`.trim()}'), 1);
  // The card is position: relative, so Zw takes Yw (the ::after ring) rather than Jw.
  assert.match(local, /\.sac-card \{\n  position: relative;/);
});
