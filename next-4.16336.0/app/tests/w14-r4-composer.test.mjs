// W14-code round 4, composer lane: the Code editor's name, the draft-group footnote / chip, the skill and mention chips.
// Official evidence (3.6556.2 snapshot): c227f4d5e wF (Prompt + enterkeyhint), cc43287c9 n7 / i7 / xle / wle / a7 / Cle,
// shared-9 GS / WS / VS / BS / zS, shared-28 vS.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { find, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const noop = () => {};
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
let server, C, Editor, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  Editor = await server.ssrLoadModule('/src/source-composer-editor.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => server?.close());

const model = { model: 'fixture', displayName: 'Fixture', supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'high' }] };
const base = { draft: 'hello', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false, permission: 'auto', model, effort: 'high', workdir: '/tmp/fixture/project' };
const render = (props = {}) => renderToStaticMarkup(h(C.SourceComposer, { ...base, ...props }));
const cls = (node) => String(node?.attrs?.class ?? '');
const text = (node) => `${node?.text ?? ''}${(node?.children ?? []).map(text).join('')}`;
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/[\uE000-\uF8FF]/g, ''); // Anthropicons glyphs are private-use text
const group = { id: 'g1', name: 'Research' };

test('r4-composer-01: the Code editor is named "Prompt" with enterkeyhint "enter" (c227f4d5e wF); the side chat card too', () => {
  for (const props of [{}, { embedded: true, codeLayout: 'side-session' }]) {
    const nodes = parseMarkup(render(props));
    const input = find(nodes, (n) => n.attrs?.role === 'textbox');
    assert.equal(input.attrs['aria-label'], 'Prompt');
    assert.equal(input.attrs.enterkeyhint ?? input.attrs.enterKeyHint, 'enter');
  }
  assert.match(read('src/source-response-table.jsx'), /\[data-cds="ChatComposerEditor"\]\[role="textbox"\], \[data-cds="ChatComposerEditor"\] \[role="textbox"\]/,
    'the table dialog hands focus back to the composer by its data-cds box, not by the old host name');
  assert.doesNotMatch(read('src/source-response-table.jsx'), /Message DeepSeek/);
});

test('css4-draft-group-presets: presets draws i7 (block footnote + "Don’t add" TextLink), never the host chip', () => {
  // With a line on the rail (ka !== null), i7 is the block under it.
  const html = render({ codeLayout: 'presets', showContext: true, draftGroup: group, onClearDraftGroup: noop, environmentLine: { kind: 'blocking', content: 'x' } });
  const nodes = parseMarkup(html);
  const notice = find(nodes, (n) => n.tag === 'p' && n.attrs?.['data-draft-group'] === 'g1');
  assert.equal(cls(notice), 'text-center text-balance text-footnote text-secondary');
  const name = find([notice], (n) => n.tag === 'span' && cls(n) === 'font-medium text-primary');
  assert.equal(text(name), 'Research');
  assert.match(plain(html.match(/<p [^>]*data-draft-group="g1"[^>]*>[\s\S]*?<\/p>/)[0]), /^This session will be added to Research in the sidebar when you start it\. Don’t add$/);
  const link = find([notice], (n) => n.attrs?.['data-cds'] === 'TextLink');
  assert.equal(link.attrs['aria-label'], 'Don’t add to Research');
  assert.match(cls(link), /shrink-0 whitespace-nowrap/);
  assert.equal(find(nodes, (n) => cls(n).includes('sc-context-row')), null, 'no context row in the presets layout');
  assert.equal(find(nodes, (n) => cls(n).includes('sc-draft-group')), null);
});

test('css4-draft-group-presets: the rail note is the i7 line form (xle); no classic wle chip (r8)', () => {
  const line = parseMarkup(renderToStaticMarkup(h(C.DraftGroupNotice, { group, onClear: noop, placement: 'line' })));
  const outer = line[0];
  assert.equal(cls(outer), 'flex min-w-0 items-baseline gap-1 whitespace-nowrap');
  const [sentence, link] = outer.children.filter((n) => n.tag);
  assert.equal(cls(sentence), 'flex min-w-0 items-baseline overflow-hidden');
  const parts = sentence.children.filter((n) => n.tag);
  assert.deepEqual(parts.map(cls), ['shrink-0 whitespace-pre', 'flex min-w-0 font-medium text-primary', 'shrink-0 whitespace-pre']);
  assert.equal(link.attrs['data-cds'], 'TextLink');
  assert.equal(text(link), 'Don’t add');

  // W14-code r8 css8-classic-context-row-dead (E95): the classic row's wle chip (DraftGroupChip) went with that row; a
  // classic-layout render shows no draft-group chip, and the module no longer exports it.
  const nodes = parseMarkup(render({ codeLayout: 'classic', showContext: true, draftGroup: group, onClearDraftGroup: noop }));
  assert.equal(find(nodes, (n) => n.tag === 'span' && n.attrs?.['data-draft-group'] === 'g1'), null);
  assert.equal(C.DraftGroupChip, undefined); assert.equal(C.draftGroupChipLook, undefined); assert.equal(C.DRAFT_GROUP_PILL_CLASS, undefined);
  assert.doesNotMatch(read('src/source-composer.css').replace(/\/\*[\s\S]*?\*\//g, ''), /sc-draft-group/);
});

test('css4-skill-chip-card: zS subtitles and the WS / VS / BS class strings', () => {
  assert.equal(Editor.skillChipSubtitle('compact'), 'Skill');
  assert.equal(Editor.skillChipSubtitle('my-plugin:review'), 'My plugin  ·  Skill');
  assert.equal(Editor.skillChipSubtitle('my-plugin:review', { wrapped: true }), 'Skill');
  assert.equal(Editor.skillChipSubtitle('x', { source: 'mcp', mcpServerName: 'github' }), 'github  ·  Skill');
  assert.equal(Editor.skillChipSubtitle('0123abcd-0000-1111-2222-0123456789ab:tool'), 'Connector  ·  Skill');
  I18n.setLocale?.('zh-CN');
  try { assert.equal(Editor.skillChipSubtitle('compact'), '技能'); } finally { I18n.setLocale?.('en-US'); }
  const source = read('src/source-composer-editor.jsx');
  for (const literal of ["'group/chip inline-flex relative cursor-interactive text-accent'", '"inline-flex relative cursor-interactive"',
    "`absolute -inset-y-0.5 -start-0.5 -end-1 rounded-md pointer-events-none ", "'bg-accent':'group-hover/chip:bg-accent group-data-[card-open]/chip:bg-accent'",
    '"relative ps-2"', "'absolute top-1/2 -translate-y-1/2 start-0 w-2 h-5 flex items-center justify-center font-base-bold opacity-50 select-none'",
    "'rounded-xl border-0.5 border-border-300 bg-surface-3 shadow-lg font-base w-[178px] p-2 flex flex-col gap-2'",
    "'text-muted-as-secondary font-small bg-surface-1 rounded-lg p-2'", '"line-clamp-5"', '"text-muted-as-secondary font-small"'])
    assert.ok(source.includes(literal), literal);
  assert.match(source, /\{open&&<CommandCard /, 'VS opens without a description (GS always passes a subtitle)');
  assert.doesNotMatch(source, /open&&command\.description&&/);
});

test('css4-mention-chip-wrap: the vS class strings, the hand-copied rules gone; css4-editor-disabled-before: the dead ::before rule gone', () => {
  const source = read('src/source-composer-editor.jsx');
  for (const literal of ["'inline-flex relative cursor-interactive group/mention mx-0.5 [overflow-wrap:anywhere] max-w-[calc(100%-0.25rem)] text-accent'",
    '"inline-flex relative min-w-0 max-w-full"', '"relative min-w-0 max-w-full"', '"relative [&::selection]:bg-transparent"',
    "`absolute -inset-y-0.5 -left-0.5 -right-1 rounded-md pointer-events-none ${selected?'bg-accent':'group-hover/mention:bg-fill-ghost-hover'}`"])
    assert.ok(source.includes(literal), literal);
  const css = read('src/source-composer-editor.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.sc-mention-chip|\.sc-command-chip|\.sc-command-card/);
  assert.doesNotMatch(css, /\[aria-disabled=true\]::before/);
  assert.doesNotMatch(read('src/source-composer.jsx'), /MODE_MENU_SHORTCUT/);
});
