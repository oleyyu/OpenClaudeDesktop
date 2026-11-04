// W14-code composer review fixes: composer-15 Saved draft (c227f4d5e tD / shared-1 GC, c0fbbe82d Go's text pill, the
// ca / sa dialog generated as composer-held-text-dialog.mjs, c4d199b75 xe's send order) and the Code card's drop panel
// outside a pane (shared-5 vm ChatComposerDropPanel over Uf: qf off target, Kf / Jf on target, Xd fade-in). Source and SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { HELD_TEXT_MAX, editHeldText, isHeldText, makeHeldText, withHeldText } from '../src/composer-attachments-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFile(path.join(app, file), 'utf8');
const chunk = (name) => fs.readFile(path.join(assets, name), 'utf8');
const h = React.createElement;
let server, Tiles, Adapters, Dialog;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Tiles = await server.ssrLoadModule('/src/source-composer-tiles.jsx');
  Adapters = await server.ssrLoadModule('/src/source-composer-attachment-adapters.jsx');
  Dialog = await server.ssrLoadModule('/src/generated/code-composer/composer-held-text-dialog.mjs');
});
after(() => server?.close());

test('held text model: shared-1 GC (length > 1e6), the tD pill shape and xe order', async () => {
  const shared1 = await chunk('shared-1-BJhqMmkf.js');
  assert.ok(shared1.includes('WC=1e6') && shared1.includes('function GC(e){return e.length>WC}'));
  assert.equal(HELD_TEXT_MAX, 1e6);
  assert.equal(isHeldText('x'.repeat(1e6)), false);
  assert.equal(isHeldText('x'.repeat(1e6 + 1)), true);
  const pill = makeHeldText('long', { id: 'a' });
  assert.deepEqual(pill, { id: 'a', kind: 'text', status: 'ready', text: 'long' });
  // W14-code r4 gen-final-4: the test-only hasHeldText is deleted.
  // xe: each non-empty held text, then the composer text when not empty, joined by a blank line.
  assert.equal(withHeldText([pill, makeHeldText('', { id: 'b' }), { kind: 'snippet', text: 'q' }], 'typed'), 'long\n\ntyped');
  assert.equal(withHeldText([pill], ''), 'long');
  assert.equal(withHeldText([], 'typed'), 'typed');
  assert.deepEqual(editHeldText([pill], 'a', 'new'), [{ ...pill, text: 'new' }]);
  const xe = await chunk('c4d199b75-D3cQB-UP.js');
  assert.ok(xe.includes('t.kind==="text"?t.text!==""&&r.push(R(String(t.text)))'), 'xe pushes the held text before the composer text');
});

test('wiring: queue take-back makes the pill, the send body carries it, the dialog Save edits it', async () => {
  const main = await read('src/main.jsx'), composer = await read('src/source-composer.jsx');
  assert.ok(main.includes('if (isHeldText(restored.text)) setAttachments((entries) => [...entries, makeHeldText(restored.text)]);'));
  // W14-code r2 R2T-TA5: snippetText takes the attach-marker option (c4d199b75 xe's `<!-- attach: label -->`); r4 R4T-08f:
  // every Code send carries them (c4d199b75 be does not look at the renderer), not only while the renderer is on.
  assert.ok(main.includes('snippetText(attachments, { attachMarkers: mode === "code" /* W14-code r2 R2T-TA5; r4 R4T-08f: c4d199b75 be writes them in every Code send */ }) + withHeldText(attachments, agentMentionText('));
  assert.ok(main.includes('onEditHeldText={(id, text) => setAttachments((entries) => editHeldText(entries, id, text))}'));
  assert.ok(composer.includes('onEditHeldText={onEditHeldText}'));
});

test('generated Saved draft dialog: c0fbbe82d ca / sa, Hr answered by the host editor adapter', async () => {
  const text = await read('src/generated/code-composer/composer-held-text-dialog.mjs');
  for (const s of ['defaultMessage: "Saved draft"', '"Saved draft text"', '"Discard changes?"', '"Your edits won\\u2019t be saved."', '"Keep editing"',
    '"Remove saved draft?"', '"This is the only copy of this text."', 'size: "3xl"', '"flex max-h-64 flex-col overflow-hidden rounded border border-alpha-3"',
    'className: "min-h-0 flex-1 text-code"', 'confirmVariant: "danger"'])
    assert.ok(text.includes(s), s);
  assert.match(text, /ComposerHeldTextEditor as Hr/);
  assert.doesNotMatch(text, /import\(|EpitaxyCodeMirrorText/);
  const manifest = JSON.parse(await read('src/generated/code-composer/manifest.json'));
  const module = manifest.modules.find((m) => m.target === 'composer-held-text-dialog.mjs');
  assert.deepEqual(module.bindings.map((b) => b.name), ['sa', 'ca']);
  assert.deepEqual(module.imports.filter((i) => i.kind === 'adapter').map((i) => `${i.via}=${i.name}`).sort(),
    ['c0fbbe82d-COsmfHJY.js:Hr=ComposerHeldTextEditor', 'vendor-intl-DYfox5Co.js:l=ComposerMessage', 'vendor-intl-DYfox5Co.js:p=useComposerIntl']);
  assert.equal(typeof Dialog.HeldTextDialog, 'function');
  // ka's box: `cn("flex flex-col", className)` around the content, with the aria-label and readOnly.
  const html = renderToStaticMarkup(h(Adapters.ComposerHeldTextEditor, { initialValue: 'abc', readOnly: true, ariaLabel: 'Saved draft text', className: 'min-h-0 flex-1 text-code' }));
  assert.match(html, /^<div class="flex flex-col min-h-0 flex-1 text-code"><textarea[^>]*readOnly=""[^>]*aria-label="Saved draft text"/);
  assert.match(html, />abc<\/textarea>/);
});

test('Saved draft pill: Go ko {quiet, opensDialog, Note, wideLabel, 1ztYc4dAWB, Click to edit.}', async () => {
  const go = await chunk('c0fbbe82d-COsmfHJY.js');
  for (const s of ['defaultMessage:"Saved draft",id:"dxXfrwuTJF"', 'id:"1ztYc4dAWB"', 'defaultMessage:"Click to edit.",id:"Z3sULMIWJx"', 'quiet:!0,opensDialog:!0'])
    assert.ok(go.includes(s), s);
  const html = renderToStaticMarkup(h(Tiles.ComposerAttachmentTiles, { entries: [makeHeldText('x'.repeat(1_200_001), { id: 'held' })], onRemove() {}, onEditHeldText() {} }));
  assert.match(html, /Saved draft/);
  assert.match(html, /aria-label="Saved draft · 1\.2 million characters"/);
  assert.match(html, /data-cds="Icon"/);
  assert.doesNotMatch(html, /Excerpt/);
});

test('Code card outside a pane: the shell draws ChatComposerDropPanel (qf / Kf / Jf), no host drag ring', async () => {
  const composer = await read('src/source-composer.jsx'), css = await read('src/source-composer.css');
  const shell = await read('src/generated/code-composer/chat-composer-shell.mjs');
  assert.ok(composer.includes('const cardFileDrop = mode === "code" && !paneDrop && acceptsFiles ?'));
  assert.ok(composer.includes('onFileDrop={cardFileDrop}'));
  for (const s of ['"data-cds": "ChatComposerDropPanel"', '"border border-dashed border-[color:var(--cds-fill-accent)]"', '"shadow-[inset_0_0_0_2px_var(--cds-fill-accent)]"',
    '"motion-safe:animate-[cds-fade-in_0.2s_cubic-bezier(0.215,0.61,0.355,1)_0.08s_backwards]"', 's(r ? "on-target" : "off-target");', 'e.addEventListener("dragover", r, !0)'])
    assert.ok(shell.includes(s), s);
  assert.ok(!css.includes('.sc-composer[data-drag-over] [data-cds="ChatComposer"] > .sc-card'));
  const sheet = await fs.readFile(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8');
  for (const s of ['.border-dashed{', '.border-\\[color\\:var\\(--cds-fill-accent\\)\\]{', '.shadow-\\[inset_0_0_0_2px_var\\(--cds-fill-accent\\)\\]{', '@keyframes cds-fade-in{'])
    assert.ok(sheet.includes(s), s);
});
