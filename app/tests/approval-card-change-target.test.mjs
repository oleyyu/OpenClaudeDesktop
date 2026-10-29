// w10-ccres-approval-card: the 3.6556.2 change card (cc32965c2-BQu1bA_w.js Wh change branches, the body's se / me / he
// / xe blocks and Re's read gate around [he, xe]) in approval-card-model.mjs approvalChangeCard and the card's
// ApprovalChangeBlock / ApprovalFootnote / ApprovalServedText.
//  1. the official source the shape follows (read only, never executed), including why no local source builds one:
//     the builders' lines are `secret:` messages that only the account service delivers (ion-dist/i18n has none);
//  2. the model (fields, allows, gate key, announcement);
//  3. SSR of SourceApprovalCardView for a change card (gated, held), a switch (served text) and a plain footnote.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { approvalAnnouncement, approvalCardModel, approvalChangeCard, changeGroupsSigned, changeLineParts, changeLineText, changeRowsGated, changeRowsGateKey } from '../src/approval-card-model.mjs';
import { createReadGateStore, readGateKey } from '../src/approval-read-gate-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const v3 = path.join(snapshot, 'assets/v1');
const read = file => fs.readFileSync(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const HINT = 'Scroll through what Claude sent to allow it.';

// ---- 1. the official source ----------------------------------------------------------------------------------------

test('cc32965c2 Wh builds the change card from v (update / create) and y (switch, servedText or target)', () => {
  const card = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  assert.equal(count(card, '{action:v.heading,heading:v.heading,overrideDescription:"",changeTarget:v.target,changeGroups:v.changeGroups,footnote:v.footnote,onceLabel:v.allowLabel,..._p,rowsReadGate:{hint:e.formatMessage(Ju.rowsHint),loose:!0}}'), 1);
  assert.equal(count(card, '..."servedText"in y?{servedText:y.servedText}:{changeTarget:y.target,changeGroups:y.changeGroups},footnote:y.footnote,onceLabel:y.allowLabel,..._p}'), 1);
  assert.equal(count(card, '_p={suppressScopeTooltip:!0,disableAlwaysAllow:!0}'), 1);
  // I_ / L_: the change block is gated by the JSON of target, groups and footnote; Re wraps [he, xe] in jc.
  assert.equal(count(card, 'return!e.rows?.length&&!!e.changeGroups?.length'), 1);
  assert.equal(count(card, 'JSON.stringify([e.changeTarget,e.changeGroups,e.footnote])'), 1);
  assert.equal(count(card, 'headIsFirstLine:!0,onReadState:x,onFits:S,children:a("div",{className:"flex flex-col gap-md",children:[he,xe]})'), 1);
  assert.equal(count(card, 'Ve=F===void 0?xe:null'), 1);
  // The blocks' markup.
  for (const needle of ['"data-testid":`approval-change-target`', 'className:`flex flex-col gap-md rounded-lg border border-alpha-2 p-md`',
    'className:`text-body text-secondary select-text break-words [unicode-bidi:plaintext]`,children:Y(i.footnote.join(` `))',
    'className:`rounded bg-alpha-1 px-lg py-md text-body select-text break-words`', 'name:`Cloud`',
    'add:{icon:`Add`,className:`text-git-added`},remove:{icon:`Minus`,className:`text-git-removed`},change:{icon:`ArrowClockwise`,className:`text-muted-as-secondary`}'])
    assert.equal(count(card, needle.replaceAll('`', '"')), 1, needle);
});

test('the builders need the account catalog: o_ delivered() and secret ids absent from ion-dist/i18n', () => {
  const card = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  assert.equal(count(card, 'if(!t.delivered()||i===0'), 1, 'p_ returns null unless every message was delivered');
  assert.equal(count(card, 'delivered:()=>t'), 1);
  assert.equal(count(card, 'updateHeading:"1ew0lwy"'), 1);
  assert.equal(count(card, 'footnoteShared:"mt4syb"'), 1);
  const shared = read(path.join(v3, 'shared-78-D5Fw2h0a.js'));
  assert.equal(count(shared, 'var Hj="claude-code-remote",Uj="bf7c680d-5fdc-5ef4-b4a0-abadb619bf0a"'), 1);
  for (const dir of ['i18n', 'i18n/dynamic']) {
    const en = read(path.join(snapshot, dir, 'en-US.json'));
    for (const id of ['1ew0lwy', 'mt4syb', '1dcpm1d', '1e1vhwd']) assert.equal(en.includes(`"${id}"`), false, `${dir} ${id}`);
  }
});

// ---- 2. the model --------------------------------------------------------------------------------------------------

const base = () => approvalCardModel({ id: 7, method: 'item/commandExecution/requestApproval', params: { command: 'true', reason: 'Because', cwd: '/w' } });
const built = () => ({
  heading: 'Update environment?',
  target: { name: 'staging', scope: 'Personal', scopeIcon: 'User', spoken: 'Environment staging, personal' },
  changeGroups: [
    { heading: 'Network', lines: [{ text: 'Allow <code>api.example.com</code>', sign: 'add' }, { text: 'Stop <b>npm</b><sr> (package managers)</sr>', sign: 'remove' }] },
    { heading: 'Variables', lines: [], exactLines: [{ name: 'TOKEN', literal: '"a b"' }] },
  ],
  footnote: ['Applies to new sessions.', 'Shared with your organization.'],
  allowLabel: 'Update',
});

test('approvalChangeCard: heading as the title, target / groups / footnote, one once allow, a loose rows gate', () => {
  const model = approvalChangeCard(base(), built());
  assert.equal(model.title, 'Update environment?');
  assert.equal(model.ownHeading, 'Update environment?');
  assert.equal(model.heading, undefined);
  assert.equal(model.detail, null);
  assert.deepEqual(model.context, []);
  assert.equal(model.reason, 'Because');
  assert.equal(model.changeTarget.name, 'staging');
  assert.equal(model.changeGroups.length, 2);
  assert.deepEqual(model.footnote, ['Applies to new sessions.', 'Shared with your organization.']);
  assert.deepEqual(model.allows, [{ key: 'accept', label: 'Update', primary: true }]);
  assert.deepEqual(model.rowsReadGate, { hint: HINT, loose: true });
  assert.equal(changeGroupsSigned(model), true);
  assert.equal(changeRowsGated(model), true);
  assert.equal(changeRowsGateKey('ticket', model), `ticket\nrows\n${JSON.stringify([model.changeTarget, model.changeGroups, model.footnote])}`);
  assert.equal(readGateKey('ticket', model), null, 'the rows key needs a detail');
  // y (switch) with served text: no target, no groups, no gate.
  const served = approvalChangeCard(base(), { heading: 'Move this session?', servedText: { label: 'Settings', body: 'env: x; hosts: none' }, footnote: ['Later.'], allowLabel: 'Move' }, { rowsGate: false });
  assert.deepEqual(served.servedText, { label: 'Settings', body: 'env: x; hosts: none' });
  assert.equal('changeTarget' in served, false);
  assert.equal(served.rowsReadGate, undefined);
  assert.equal(changeRowsGateKey('ticket', served), null);
  const plain = base();
  assert.equal(approvalChangeCard(plain, null), plain, 'no builder result keeps the card');
});

test('change lines keep the <b> / <code> / <sr> parts; the announcement reads target, lines, the elision and the footnote', () => {
  assert.deepEqual(changeLineParts('Stop <b>npm</b><sr> (pm)</sr> now'), [
    { tag: null, text: 'Stop ' }, { tag: 'b', text: 'npm' }, { tag: 'sr', text: ' (pm)' }, { tag: null, text: ' now' }]);
  assert.deepEqual(changeLineParts('a <i>b</i>'), [{ tag: null, text: 'a <i>b</i>' }]);
  assert.equal(changeLineText({ text: 'Allow <code>x.y</code>' }), 'Allow x.y');
  const text = approvalAnnouncement(approvalChangeCard(base(), built()));
  assert.equal(text, 'Permission requested: Update environment?. Environment staging, personal. Allow api.example.com. Stop npm (package managers). Variables. '
    + 'Some of what was sent can’t be read out here. It is listed on the card.. Because. Applies to new sessions. Shared with your organization.');
});

// ---- 3. SSR --------------------------------------------------------------------------------------------------------

let server, A;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
});
after(() => server?.close());

const ARM = 'ticket-1';
const request = { id: 7, method: 'item/commandExecution/requestApproval', params: { command: 'true' } };
const render = (model, snapshot) => {
  const store = createReadGateStore();
  if (snapshot) store.set({ key: changeRowsGateKey(ARM, model), ...snapshot });
  return renderToStaticMarkup(React.createElement(A.SourceApprovalCardView, { request, model, armKey: ARM, onAction: () => {}, readGateStore: store }));
};

test('SSR: the change block and the footnote read together inside ApprovalReadRows, before the reason', () => {
  const html = render(approvalChangeCard(base(), built()));
  assert.match(html, /<div class="sac-heading"><span><span class="text-primary \[unicode-bidi:plaintext\]">Update environment\?<\/span><\/span><\/div>/);
  const gated = html.match(/<div data-testid="approval-read-rows"><div class="flex flex-col gap-md">([\s\S]*?)<\/div><\/div><div class="sac-reason/);
  assert.ok(gated, 'the gated block precedes the reason');
  const block = gated[1];
  assert.match(block, /^<div class="flex flex-col gap-md rounded-lg border border-alpha-2 p-md"><span class="sr-only">Environment staging, personal<\/span><div aria-hidden="true" class="flex items-start gap-md text-body">/);
  assert.match(block, /<span class="flex h-\[1lh\] w-4 shrink-0 items-center"><span aria-hidden="true" data-cds="Icon" class=""[^>]*>[^<]*<\/span><\/span><span data-testid="approval-change-target" class="min-w-0 select-text break-words \[unicode-bidi:plaintext\]">staging<\/span>/);
  assert.match(block, /<span class="flex shrink-0 gap-xs text-secondary"><span class="flex h-\[1lh\] w-4 shrink-0 items-center"><span[^>]*data-cds="Icon"[^>]*>[^<]*<\/span><\/span>Personal<\/span>/);
  assert.match(block, /<div id="[^"]+-0" class="text-footnote text-muted-as-secondary select-text \[unicode-bidi:plaintext\]">Network<\/div><ul role="list" aria-labelledby="[^"]+-0" class="flex flex-col gap-0.75">/);
  assert.match(block, /<li data-sign="add" class="flex gap-sm text-body text-secondary"><span class="flex h-\[1lh\] w-4 shrink-0 items-center"><span aria-hidden="true" data-cds="Icon" class="text-git-added"/);
  assert.match(block, /<span class="min-w-0 select-text break-words \[unicode-bidi:plaintext\]">Allow <code class="text-code-medium text-primary \[unicode-bidi:plaintext\]">api.example.com<\/code><\/span>/);
  assert.match(block, /Stop <span class="text-primary \[unicode-bidi:plaintext\]">npm<\/span><span class="sr-only"> \(package managers\)<\/span>/);
  assert.match(block, /<div role="group" aria-labelledby="[^"]+-1" data-testid="approval-exact-lines" class="overflow-hidden rounded-\[5px\] bg-alpha-1"><pre dir="ltr" class="py-md pe-lg text-code text-secondary whitespace-break-spaces break-words select-text \[unicode-bidi:bidi-override\]"><span data-line="1" class="relative block ps-\[6ch\][^"]*">TOKEN=&quot;a b&quot;<\/span><\/pre><\/div>/);
  // xe last inside the gate, after the target box.
  assert.match(block, /<\/div><p class="text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">Applies to new sessions\. Shared with your organization\.<\/p>$/);
  assert.equal(count(html, 'Applies to new sessions.'), 1, 'the footnote is not repeated outside the gate');
  // The gated footer and one once allow with the builder's label.
  assert.match(html, /<div class="flex flex-col gap-sm"><p aria-live="polite" class="sr-only"><\/p><footer class="sac-actions">/);
  assert.deepEqual([...html.matchAll(/data-approval-action="(accept[^"]*)"/g)].map(match => match[1]), ['accept']);
  assert.match(html, /<span class="sac-button-label">Update<\/span>/);
});

test('SSR: held, the once allow carries the hint; Deny stays open', () => {
  const html = render(approvalChangeCard(base(), built()), { state: 'unread', hinted: true, fits: false });
  assert.match(html, /<button[^>]*data-approval-action="accept" disabled=""[^>]*aria-disabled="true"/);
  assert.match(html, /data-testid="approval-read-hint" class="epitaxy-approval-read-hint text-footnote text-muted-as-secondary text-end text-balance">Scroll through what Claude sent to allow it\.<\/p>/);
  assert.doesNotMatch(html.match(/<button[^>]*data-approval-action="decline"[^>]*>/)[0], / disabled=""/);
});

test('SSR: a switch shows its served text group, no gate; a plain card\'s footnote sits before its detail', () => {
  const served = render(approvalChangeCard(base(), { heading: 'Move this session?', servedText: { label: 'Settings', body: 'env: x\nhosts: none' }, footnote: ['Later.'], allowLabel: 'Move' }, { rowsGate: false }));
  assert.match(served, /<div class="sac-content"><div role="group" aria-label="Settings" class="rounded bg-alpha-1 px-lg py-md text-body select-text break-words"><p class="whitespace-pre-wrap text-secondary \[unicode-bidi:plaintext\]">env: x\nhosts: none<\/p><\/div>/);
  assert.equal(served.includes('approval-read-rows'), false);
  assert.match(served, /<p class="text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">Later\.<\/p>/);
  const plain = render({ ...base(), footnote: ['Runs every hour.'] });
  assert.match(plain, /<p class="text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">Runs every hour\.<\/p><div id="[^"]+" class="sac-details">/);
  const none = render(base());
  assert.equal(none.includes('approval-change-target'), false);
  assert.equal(none.includes('Runs every hour.'), false);
});

// w11-sweep-ccres (w10-ccres-approval-card review item 1): the two loose-footnote branches the SSR above leaves out.
// cc32965c2 Ge `[…, ze, Be, Ve, He, I, Ee, ke, H, Ue, We]` with `Be = i.rowsLead || i.rowsTrail ? null : ve`,
// `Ve = F === void 0 ? xe : null` and `H` the rows when `i.rowsTrail`: the footnote follows gated rows, and precedes
// rows that trail.
test('SSR: a loose footnote follows gated rows (Be, Ve) and precedes trailing rows (Ve, H)', () => {
  const card = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  assert.equal(count(card, 'Be=i.rowsLead||i.rowsTrail?null:ve,Ve=F===void 0?xe:null'), 1);
  const gated = { ...base(), rowsReadGate: { hint: 'Scroll through what Claude sent to allow it.' }, footnote: ['After the rows.'] };
  const after = render(gated);
  assert.match(after, /class="sac-details"[^>]*><div data-testid="approval-read-rows">[\s\S]*?<\/div><\/div><\/div><\/div><p class="text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">After the rows\.<\/p>/);
  const trailing = render({ ...gated, rowsTrail: true, footnote: ['Before the rows.'] });
  assert.match(trailing, /<p class="text-body text-secondary select-text break-words \[unicode-bidi:plaintext\]">Before the rows\.<\/p><div id="[^"]+" class="sac-details"[^>]*><div data-testid="approval-read-rows">/);
  assert.equal(count(after, 'After the rows.'), 1);
  assert.equal(count(trailing, 'Before the rows.'), 1);
});

// w11-sweep-ccres (review item 2): the change block, footnote and served text go through the card's display escapes,
// cc32965c2 `Y(i.changeTarget.name)`, `Y(e.heading)`, `Y(i.footnote.join(" "))`, `J(i.servedText.body)` (Y = shared-9 S /
// LO, J = shared-18 G / nq), imported from approval-titles' one copy.
test('SSR: names, headings, lines, footnote and served text show bidi / control characters escaped (Y / J)', () => {
  const card = read(path.join(v3, 'cc32965c2-BQu1bA_w.js'));
  for (const needle of ['children:Y(i.changeTarget.name)', 'children:Y(e.heading)', 'children:Y(i.footnote.join(" "))', 'children:J(i.servedText.body)'])
    assert.equal(count(card, needle), 1, needle);
  const tricky = { ...built(), target: { ...built().target, name: 'stag‮ing' }, footnote: ['Note⁦x'],
    changeGroups: [{ heading: 'Net‏work', lines: [{ text: 'Allow <code>a‭b</code>', sign: 'add' }] }] };
  const html = render(approvalChangeCard(base(), tricky));
  assert.match(html, /data-testid="approval-change-target"[^>]*>stag\\u202eing<\/span>/);
  assert.match(html, />Net\\u200fwork<\/div>/);
  assert.match(html, /<code class="text-code-medium text-primary \[unicode-bidi:plaintext\]">a\\u202db<\/code>/);
  assert.match(html, />Note\\u2066x<\/p>/);
  const served = render(approvalChangeCard(base(), { heading: 'Move?', servedText: { label: 'Settings', body: 'a\u0007b\nc' }, allowLabel: 'Move' }, { rowsGate: false }));
  assert.equal(served.includes('\u0007'), false, 'a control character is not rendered raw');
  assert.match(served, /<p class="whitespace-pre-wrap text-secondary \[unicode-bidi:plaintext\]">a[^<]*b\nc<\/p>/);
});
