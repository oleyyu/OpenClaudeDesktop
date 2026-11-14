import test from 'node:test';
import assert from 'node:assert/strict';
import { INFOTIP_DEFAULTS, infoTipNext } from '../src/infotip-model.mjs';

// B37: shared-frame pw — a Popover trigger with openOnHover (delay 300) that a click keeps open.
test('InfoTip defaults follow pw: side top, align center, offset 6, hover delay 300', () => {
  assert.deepEqual({ ...INFOTIP_DEFAULTS }, { side: 'top', align: 'center', sideOffset: 6, delay: 300 });
});

test('hover opens and leaving closes; a click keeps it open until a second click or a dismissal', () => {
  assert.equal(infoTipNext(null, 'hover-open'), 'hover');
  assert.equal(infoTipNext('hover', 'hover-leave'), null);
  assert.equal(infoTipNext('hover', 'click'), 'click', 'stickIfOpen: a click on a hover-opened tip keeps it');
  assert.equal(infoTipNext('click', 'hover-leave'), 'click', 'leaving does not close a clicked tip');
  assert.equal(infoTipNext('click', 'hover-open'), 'click');
  assert.equal(infoTipNext('click', 'click'), null);
  assert.equal(infoTipNext(null, 'click'), 'click', 'keyboard Enter/Space and a plain click open it');
  for (const state of [null, 'hover', 'click']) assert.equal(infoTipNext(state, 'dismiss'), null);
});
