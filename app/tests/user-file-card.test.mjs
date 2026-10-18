import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// R2-topbar TT-07 / cov3-01 (2.42304.0 shared-2-Cb74JByF.js Pp → jp → Np): a user message's file card names the file
// in up to 4 adaptive lines (Pp `m`: no description, never failed), splitting a long name into a head clamped to
// 3 lines, "…", the last 12 graphemes and the whole extension. Server-rendered: Np's overflow probe (Mp) is a layout
// effect, so the split shown here is the length-based one (`r.length > 13 * lines`).
const app = path.resolve(import.meta.dirname, '..');
let server, C, S;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  C = await server.ssrLoadModule('/src/source-user-file-card.jsx');
  S = await server.ssrLoadModule('/src/source-session.jsx');
});
after(() => server?.close());
const card = (name, filePath = `/w/${name}`) => renderToStaticMarkup(React.createElement(C.SourceUserFileCard, { name, path: filePath }));
const official = (name) => fs.readFileSync(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1', name), 'utf8');

test('a short name is one clamped <bdi> at 4 lines, after the sr-only name, with the extension badge below', () => {
  const html = card('notes.txt');
  assert.match(html, /^<div data-cds="MessageAttachmentsFile" class="source-user-attachment-file" title="\/w\/notes\.txt"><div data-cds="Card" class="source-user-attachment-card">/);
  assert.ok(html.includes('<span class="sr-only">notes.txt</span><div class="source-user-attachment-file-body"><div class="flex min-w-0 flex-col">'), html);
  assert.ok(html.includes('<span aria-hidden="true" title="notes.txt" class="text-footnote font-normal text-primary line-clamp-4 break-words [overflow-wrap:anywhere]"><bdi>notes.txt</bdi></span>'), html);
  assert.equal((html.match(/<bdi>/g) || []).length, 2, 'the name and the badge');
  assert.match(html, /<span class="source-user-attachment-badge"><bdi>TXT<\/bdi><\/span><\/div><\/div><\/div>$/);
  assert.doesNotMatch(html, /source-user-attachment-name|line-clamp-2/);
  assert.equal(C.USER_FILE_NAME_LINES, 4);
});

test('an 80-character .tsx name renders the head (max-h-[3lh]), "…", the 12-grapheme tail stem and .tsx', () => {
  const name = `${'a'.repeat(72)}Card.tsx`;
  const html = card(name);
  assert.ok(html.includes(`<span aria-hidden="true" title="${name}" class="text-footnote font-normal text-primary flex min-w-0 flex-col">`), html);
  assert.ok(html.includes(`<bdi class="max-h-[3lh] overflow-hidden break-words [overflow-wrap:anywhere]">${'a'.repeat(68)}</bdi>`), html);
  assert.ok(html.includes(`<span class="flex min-w-0 before:shrink-0 before:content-[&#x27;…&#x27;]"><bdi class="truncate py-[0.125em] -my-[0.125em]">aaaaCard</bdi><span class="shrink-0">.tsx</span></span>`), html);
  // The sr-only name stays whole, and the badge is TSX.
  assert.ok(html.includes(`<span class="sr-only">${name}</span>`));
  assert.match(html, /<bdi>TSX<\/bdi>/);
  // 52 graphemes (13 × 4) still fit by length; 53 split.
  assert.doesNotMatch(card('b'.repeat(52)), /max-h-\[3lh\]/);
  assert.match(card('b'.repeat(53)), /max-h-\[3lh\]/);
});

test('the shown name and badge follow np / ap: control characters dropped, no badge for a dotfile or a bare name', () => {
  const html = card('re‮port\u0007.md');
  assert.ok(html.includes('<span class="sr-only">report.md</span>'), html);
  assert.ok(html.includes('<bdi>report.md</bdi>'));
  assert.match(html, /<bdi>MD<\/bdi>/);
  for (const name of ['.env', 'Dockerfile', 'trailing.']) assert.doesNotMatch(card(name), /source-user-attachment-badge/, name);
  // ap keeps any extension after the last dot (the old /\.([A-Za-z0-9]{1,8})$/ dropped these).
  assert.match(card('archive.tar.gz'), /<bdi>GZ<\/bdi>/);
  assert.match(card('数据.表格'), /<bdi>表格<\/bdi>/);
  assert.match(card('trace.longextension'), /<bdi>LONGEXTENSION<\/bdi>/);
});

test('SourceMessage draws a user file part through the card; the fixed two-line rule is gone', () => {
  const item = { type: 'userMessage', id: 'u1', content: [{ type: 'text', text: 'Look at this' }, { type: 'mention', name: 'Widget.tsx', path: '/w/src/Widget.tsx' }] };
  const html = renderToStaticMarkup(React.createElement(S.SourceMessage, { item, sessionKey: 's1', cwd: '/w' }));
  const attachments = html.slice(html.indexOf('data-cds="MessageAttachments"'));
  assert.match(attachments, /data-cds="MessageAttachmentsFile" class="source-user-attachment-file" title="\/w\/src\/Widget\.tsx"/);
  assert.match(attachments, /class="text-footnote font-normal text-primary line-clamp-4 break-words \[overflow-wrap:anywhere\]"><bdi>Widget\.tsx<\/bdi>/);
  const css = fs.readFileSync(path.join(app, 'src/source-session.css'), 'utf8');
  assert.doesNotMatch(css, /\.source-user-attachment-name\s*\{/);
  assert.doesNotMatch(css, /-webkit-line-clamp:\s*2;/);
  const body = css.slice(css.indexOf('.source-user-attachment-file-body {'), css.indexOf('}', css.indexOf('.source-user-attachment-file-body {')));
  assert.match(body, /justify-content: space-between;/);
  assert.match(body, /min-height: 0;/);
  const jsx = fs.readFileSync(path.join(app, 'src/source-session.jsx'), 'utf8');
  assert.match(jsx, /return <SourceUserFileCard name=\{basename\(part\.path\)\} path=\{part\.path\} \/>;/);
  assert.doesNotMatch(jsx, /function extensionBadge/);
});

test('the official card: Pp lines, its content column, the keyed Np and its tail', () => {
  const shared2 = official('shared-2-Cb74JByF.js');
  for (const signature of ['"data-cds":"MessageAttachmentsFile"', 'm=f&&p?2:f||p?3:4', 'flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-xs',
    'h(Np,{name:l,lines:m},`${m}:${l}`)', "before:content-['\\u2026']"]) assert.ok(shared2.includes(signature) || shared2.includes(signature.replace('\\u2026', '…')), signature);
  const source = fs.readFileSync(path.join(app, 'src/source-user-file-card.jsx'), 'utf8');
  assert.match(source, /<AttachmentFileName key=\{`\$\{lines\}:\$\{shown\}`\} name=\{shown\} lines=\{lines\} \/>/);
});
