import test from 'node:test';
import assert from 'node:assert/strict';
import { buttonPressScale, buttonPressInset } from '../src/generated/code-current/button-press.mjs';
import { buttonPointerPress, buttonKeyPress } from '../src/button-press.mjs';

function fixture({ width = 119, height = 31, buttonHeight = 32 } = {}) {
  const writes = [];
  const squish = { offsetWidth: width, offsetHeight: height, style: { setProperty: (...args) => writes.push(args) } };
  const button = { offsetHeight: buttonHeight, querySelector: () => ({ parentElement: squish }) };
  return { button, squish, writes };
}

test('official press geometry bounds the inset and handles narrow or hidden buttons', () => {
  assert.equal(buttonPressInset(8), .5);
  assert.equal(buttonPressInset(24), .75);
  assert.equal(buttonPressInset(64), 1.5);
  assert.deepEqual(buttonPressScale(120, 32, 1), { sx: 118 / 120, sy: 30 / 32 });
  assert.deepEqual(buttonPressScale(2, 2, 1.5), { sx: .8, sy: .8 });
  assert.equal(buttonPressScale(0, 32, 1), null);
});

test('pointer press measures the paint wrapper every time and Space measures only once', () => {
  const { button, squish, writes } = fixture();
  buttonPointerPress({ currentTarget: button });
  assert.deepEqual(writes, [['--cds-btn-press-sx', String(1 - 2 / 119)], ['--cds-btn-press-sy', String(1 - 2 / 31)]]);
  squish.offsetWidth = 239;
  buttonPointerPress({ currentTarget: button });
  assert.equal(writes.at(-2)[1], String(1 - 2 / 239));
  let prevented = 0;
  const key = (value, repeat = false) => buttonKeyPress({ currentTarget: button, key: value, repeat, preventDefault() { prevented++; } });
  key('Enter'); key('ArrowDown');
  assert.equal(writes.length, 4);
  key(' ');
  assert.equal(writes.length, 6);
  key(' ', true); key('Enter', true);
  assert.equal(writes.length, 6);
  assert.equal(prevented, 2);
  squish.offsetWidth = 0;
  buttonPointerPress({ currentTarget: button });
  assert.equal(writes.length, 6, 'a hidden wrapper retains its previous scale');
});

test('native settings and approval buttons retain callbacks while installing press geometry', async context => {
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: new URL('../', import.meta.url).pathname, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  context.after(() => server.close());
  const { SourceSettingsButton } = await server.ssrLoadModule('/src/source-settings-button.jsx');
  const { ActionButton } = await server.ssrLoadModule('/src/source-approval-card.jsx');
  let pointerCalls = 0, keyCalls = 0, actions = 0;
  const control = SourceSettingsButton.render({ onPointerDownCapture: () => pointerCalls++, onKeyDown: () => keyCalls++ }, null);
  const { button, writes } = fixture();
  const event = { currentTarget: button, key: ' ', repeat: false, preventDefault() {}, stopPropagation() {} };
  control.props.onPointerDownCapture(event);
  control.props.onKeyDown(event);
  assert.deepEqual([pointerCalls, keyCalls, writes.length], [1, 1, 4]);
  const busy = SourceSettingsButton.render({ busy: true, onKeyDown: () => keyCalls++ }, null);
  busy.props.onKeyDown(event);
  assert.equal(writes.length, 4, 'busy keyboard activation does not measure or call the host');
  assert.equal(keyCalls, 1);
  const approval = ActionButton({ action: { key: 'allow', label: 'Allow once' }, enabled: true, onAction: () => actions++ });
  approval.props.onPointerDownCapture(event);
  approval.props.onClick(event);
  assert.equal(writes.length, 6);
  assert.equal(actions, 1);
});
