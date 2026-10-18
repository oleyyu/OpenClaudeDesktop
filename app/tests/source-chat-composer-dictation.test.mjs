import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// R4g-composer CP7 (cov0-03): 2.42304.0 c227f4d5e-Ba-r--Rl.js CQ `return e?null:…` (hideDictation hides the whole
// microphone slot), Code passes hideDictation:!Lf (cc43287c9-DAfOi8yP.js), and shared-8's voice control returns only
// its portal host when neither dictation nor voice mode is available (`if(!p&&!y)return G.host`). This host has
// neither, so the Chat / Cowork composer renders no disabled Microphone / Voice button, no CaretDown beside them and
// no host-written 'Voice is not available with this provider' tooltip, in the new-chat form or the reply form.
let server, C;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-chat-composer.jsx');
});
after(() => server?.close());
const noop = () => {};
// The real editor takes inputRef (Editor clones it in); keep it off the DOM node in this fixture.
const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
const render = props => renderToStaticMarkup(React.createElement(C.SourceChatComposer, {
  editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'How can I help you today?' }),
  draft: '', scope: 'chat:fixture', mode: 'chat', onMode: noop, onMenu: noop, onStop: noop, onFolder: noop,
  disabled: false, busy: false, sending: false, canSend: false, showStop: false,
  model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', ...props }));
const leadingChin = html => {
  const chin = html.indexOf('data-cds="ChatComposerChin"');
  assert.ok(chin >= 0, 'chin rendered');
  return html.slice(chin);
};

for (const [name, props] of [['new chat', {}], ['new cowork', { mode: 'cowork' }], ['reply', { current: true }],
  ['reply while running', { current: true, busy: true, showStop: true }], ['sending', { sending: true, canSend: true, draft: 'x' }]])
  test(`${name} composer renders no dictation or voice slot`, () => {
    const html = render(props);
    assert.match(html, /data-cds="ChatComposerActions"/);
    assert.doesNotMatch(html, /Dictat|Use voice mode|Voice is not available/, 'no dictation / voice label or host tooltip');
    assert.doesNotMatch(html, /source-chat-voice|SplitDropdownButton/);
    assert.doesNotMatch(html, /data-cds-part="idle-slot"/, 'no idle slot: Actions gets idle=null, as with hideDictation');
    const labels = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(match => match[1]);
    assert.ok(!labels.some(label => /Dictat|voice/i.test(label)), `no microphone or voice button (${labels.join(', ')})`);
  });

test('the reply chin leading holds the Add control alone (no Microphone + CaretDown pair)', () => {
  const chin = leadingChin(render({ current: true }));
  const labels = [...chin.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(match => match[1]);
  assert.equal(labels[0], 'Add');
  assert.ok(!labels.includes('Dictate'));
  assert.equal(chin.split('data-cds="ChatComposerChin"').length - 1, 1);
});
