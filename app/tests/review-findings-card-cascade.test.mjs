import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, append, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';

// R4e-findings (toolcards-18): the transcript findings card (2.42304.0 c96d752d0 X$ / h0e) styles itself only with the
// official @layer utilities of c6a992d55. Resolved through every sheet the renderer loads (tests/fixtures/
// transcript-css-cascade.mjs), no unlayered host rule may beat the category badge's truncation at 7rem, the rows' list
// indent and the row buttons' padding (D26's class of bug).
const ROOT = path.resolve(import.meta.dirname, '..');
let server, Card;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Card = await server.ssrLoadModule('/src/source-findings-card.jsx');
});
after(() => server?.close());

const call = { id: 'rf1', turnId: 't1', type: 'mcpToolCall', server: 'code_desktop', tool: 'ReportFindings', status: 'completed', error: null,
  result: { content: [{ type: 'text', text: 'Reported.' }] },
  arguments: { findings: [{ file: 'src/a.js', line: 3, summary: 'On three', failure_scenario: 'Why', category: 'resource_leak_under_concurrent_retries' },
    { file: 'src/b.js', summary: 'Two', failure_scenario: 'Why', verdict: 'PLAUSIBLE' }] } };
function tree() {
  const host = { sessionKey: 's1', running: false, canViewChanges: true, fileInChanges: () => true, openChanges() {}, send: async () => true, rerun() {}, prefill() {} };
  const html = renderToStaticMarkup(React.createElement(Card.FindingsCardHost.Provider, { value: host },
    React.createElement(Card.SourceFindingsCard, { item: call, sessionKey: 's1', items: [call] })));
  const transcript = element('div', { class: 'source-transcript-content' });
  for (const node of parseMarkup(html)) append(transcript, node);
  const root = element('div', { id: 'root' }, [transcript]);
  transcript.parent = root;
  return element('html', { lang: 'en', class: 'cds-root', 'data-theme': 'claude', 'data-mode': 'system', 'data-density': 'comfortable',
    'data-platform': 'desktop', 'data-color-version': 'v2', 'data-dframe': '' }, [element('body', {}, [root])]);
}
const hasClass = (node, name) => (node.attrs.class ?? '').split(/\s+/).includes(name);

test('real cascade: the category badge truncates at 7rem, the rows keep their indent and padding', () => {
  const doc = tree();
  const cascade = loadCascade(appSheets(ROOT));
  const value = (node, property) => computed(cascade, node, property);
  const official = (result, label) => {
    assert.match(result.from?.sheet ?? '', /c6a992d55/, `${label}: from the official utilities, not ${result.from?.sheet}`);
    assert.match(result.from?.layer?.join?.('.') ?? String(result.from?.layer), /utilities/, label);
  };
  const badge = find(doc, (n) => n.attrs?.['data-cds'] === 'Badge' && hasClass(n, 'max-w-[7rem]'));
  assert.ok(badge, 'the category badge');
  official(value(badge, 'max-width'), 'badge max-width');
  assert.equal(value(badge, 'max-width').value, '7rem');
  official(value(badge, 'min-width'), 'badge min-width');
  const clip = badge.children[0];
  assert.ok(hasClass(clip, 'overflow-x-clip') && hasClass(clip, 'text-ellipsis'));
  official(value(clip, 'overflow-x'), 'badge ellipsis span');
  assert.equal(value(clip, 'overflow-x').value, 'clip');
  const tooltip = clip.children[0];
  assert.equal(tooltip.attrs['data-cds'], 'OverflowTooltip');
  assert.equal(value(tooltip, 'overflow-x').value, 'clip');
  const list = find(doc, (n) => n.tag === 'ul' && n.attrs.role === 'list');
  official(value(list, 'padding-left'), 'the list indent');
  assert.equal(value(list, 'padding-left').value, 'calc(var(--cds-pad-lg) + var(--cds-pad-xs))');
  const row = find(doc, (n) => n.tag === 'button' && n.attrs['aria-expanded'] === 'false');
  official(value(row, 'padding-left'), 'row button padding');
  // At rest the row has no background class (only hover:bg-fill-ghost-hover): the button reset of @layer base leaves it
  // transparent, as the official preflight does, and no unlayered rule paints it.
  const background = value(row, 'background-color');
  assert.match(String(background.value), /^transparent$/);
  assert.match(background.from?.layer?.join?.('.') ?? String(background.from?.layer), /base/);
  const summary = find(doc, (n) => n.tag === 'span' && hasClass(n, 'flex-1') && hasClass(n, 'truncate'));
  official(value(summary, 'color'), 'row summary colour');
  official(value(summary, 'overflow-x'), 'row summary truncation');
  const header = find(doc, (n) => n.tag === 'span' && hasClass(n, 'text-primary') && hasClass(n, 'shrink-0'));
  official(value(header, 'font-size'), '"Code review" text size');
});
