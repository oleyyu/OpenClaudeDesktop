import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// W10 (w10-chat-tests): the 2.2553.1 chat field family (shared-frame _y / vy / yy / by / Bh / $v and the TextField Sy)
// was retired with the chat generator's move to 3.6556.2 (chat:M12); its five subtests went with it. The host
// native-field boundary is still exercised: a NativeFieldControl inside the NativeField-wired 3.6556.2 field family that
// code-current publishes (environment-field-controls: shared-frame Jj / Yj over NativeFieldRoot / NativeFieldLabel),
// and the slotted search below. w10-curchat-retire: the search is the 3.6556.2 view-tabs CdsTextInput (shared-frame uC),
// the copy the project page renders, in place of the retired 2.31226.0 current-chat shared-frame yy.
// w10-cleanup-final: the 2.31226.0 routine form adapter FormSelect (source-routine-form-adapters.jsx) had no importer and
// was deleted; the boundary is checked through NativeFieldControl, the native-control boundary the field family exports.
let server, ViewTabs, Env, NativeFieldControl;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  Env = await server.ssrLoadModule('/src/generated/code-current/environment-field-controls.mjs');
  ({ NativeFieldControl } = await server.ssrLoadModule('/src/source-field-adapters.jsx'));
});
after(() => server?.close());
const h = React.createElement;
const render = node => renderToStaticMarkup(node);
const tag = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`))?.[0];
const attr = (html, name) => html?.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

const nativeControl = () => h(NativeFieldControl, { render: h('button', { type: 'button' }, 'Daily') });
test('a native field provider carries disabled state and the label link to the native control boundary', () => {
  const html = render(h(Env.EnvironmentField, { disabled: true }, h(Env.EnvironmentLabel, null, 'Frequency'), nativeControl()));
  const control = tag(html, 'button'), label = tag(html, 'label');
  assert.match(control, /disabled=""/);
  assert.equal(attr(control, 'aria-labelledby'), attr(label, 'id'));
  assert.equal(attr(control, 'id'), attr(label, 'for'));
  assert.match(tag(html, 'div'), /data-cds="Field"/);
  // Without a field the control keeps its own (unlinked) props.
  const bare = tag(render(nativeControl()), 'button');
  assert.equal(attr(bare, 'aria-labelledby'), undefined);
  assert.doesNotMatch(bare, /disabled=""/);
});

// Slotted controls pass disabled and hint attributes to the native-control boundary.
test('view-tabs slotted search retains disabled, hint and invalid semantics', () => {
  const html = render(h(ViewTabs.CdsTextInput, { id: 'current-search', 'aria-label': 'Search projects',
    'aria-describedby': 'search-hint', 'aria-invalid': true, disabled: true,
    slotStart: h('span', null, 'Search'), clearable: 'always', value: 'query', onChange() {} }));
  const input = tag(html, 'input');
  assert.match(input, /disabled=""/);
  assert.equal(attr(input, 'id'), 'current-search');
  assert.equal(attr(input, 'aria-describedby'), 'search-hint');
  assert.equal(attr(input, 'aria-invalid'), 'true');
  assert.doesNotMatch(html, /<button/);
});
