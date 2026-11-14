import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// SSR of the titlebar Changes toggle on 4.16336.0: c73f45bc3 hy's diff spec `{pane: "diff", icon: vl.diff, label:
// "Changes" (dgqhUM6BxJ), shortcut: Ce("toggleDiff", E), active: h, toggle}` drawn by cc43287c9 SY (generated/titlebar
// TitlebarPaneToggle). hy's spec has no indicator, so 3.6556.2 cl's sl dot (and the host D15 dot) is gone.
let server, T;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
});
after(() => server?.close());
const session = { id: 'a', name: 'A', cwd: '/tmp/work' };
const render = props => renderToStaticMarkup(React.createElement(T.SourceTitlebar, { section: 'new', session, ...props }));
const changes = html => {
  const start = html.lastIndexOf('<button', html.indexOf('aria-label="Changes"'));
  return html.slice(start, html.indexOf('</button>', start) + 9);
};
const v4 = name => fs.readFileSync(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1', name), 'utf8');

test('hy diff spec through SY: constant "Changes" label, aria-pressed follows the pane, ⇧⌘D, no native title', () => {
  for (const open of [false, true]) {
    const button = changes(render({ panes: new Set(open ? ['changes'] : []) }));
    const tag = button.slice(0, button.indexOf('>'));
    assert.match(tag, /data-cds="Button" data-cds-icon-only="" data-cds-ghost=""/);
    assert.match(tag, new RegExp(`aria-pressed="${open}" aria-label="Changes" aria-keyshortcuts="(?:Meta|Control)\\+Shift\\+d"`));
    assert.doesNotMatch(tag, /title=/);
  }
  assert.doesNotMatch(render({}), /Show changes/);
});

test('the toggle calls main.jsx with the host pane kind', () => {
  const calls = [];
  const spec = T.paneToggleSpec({ pane: 'changes', icon: 'ChangesPlusMinus', label: 'Changes', shortcut: 'cmd+shift+d', active: false }, (pane) => calls.push(pane));
  spec.toggle();
  assert.deepEqual(calls, ['changes']);
  assert.deepEqual({ ...spec, toggle: undefined }, { pane: 'changes', icon: 'ChangesPlusMinus', label: 'Changes', shortcut: 'cmd+shift+d', active: false, toggle: undefined });
  const hy = v4('c73f45bc3-C7dtUSq8.js');
  assert.ok(hy.includes('pane:`diff`,icon:vl.diff,label:l,shortcut:u,active:h,toggle:d') || hy.includes('pane:"diff",icon:vl.diff,label:l,shortcut:u,active:h,toggle:d'));
});

test('no activity indicator: hy specs and SY carry none, dirty tree or not', () => {
  for (const props of [{ changesDirty: true }, { changesDirty: false }, {}, { changesDirty: true, panes: new Set(['changes']) }]) {
    const button = changes(render(props));
    assert.doesNotMatch(button, /data-cds-part="indicator"|st-indicator/);
    assert.match(button, /data-cds="Icon"/);
  }
  assert.doesNotMatch(render({ session: null, changesDirty: true }), /aria-label="Changes"|data-cds-part="indicator"/);
  const sy = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/titlebar/pane-toggle.mjs'), 'utf8');
  assert.doesNotMatch(sy, /indicator/);
});
