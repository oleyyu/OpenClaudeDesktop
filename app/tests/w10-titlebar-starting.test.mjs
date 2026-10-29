// w10-shell-titlebar (3.6556.2): the Code session titlebar's readiness as cc43287c9 oG derives it, over the host state.
//   notdone 20  oG's N (isSessionNotFound): `G=(te||!t&&!o)&&!N`, `ae=G||ie&&!o&&!re.origin&&!N`, the lead `N?null:…`,
//               FW mounted for `ae||o||re.origin`, ⋮ for `ae&&t&&…`; the host's N is main.jsx historyUnavailable.
//   TF-O1       the starting owner: `le=!ae&&!N&&ce?oe:void 0`, `ue=!G&&le===void 0`, FW `{id:i,type:"starting"}`, which
//               c73f45bc3 x_ reads as the landing (c5da7eb42 Am → Dm) with Files kept (`y=Rs(t?.type==="starting")`).
// Source-only: official chunks are read as text, the titlebar renders through react-dom/server. No Electron, no browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { titlebarOwnerSpecs, titlebarSessionState, titlebarToggleSpecs } from '../src/titlebar-controls-model.mjs';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

const app = path.resolve(import.meta.dirname, '..');
const official3 = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles) => { for (const needle of needles) assert.equal(count(text, needle), 1, needle); };
const h = React.createElement;

let server, T;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  T = await server.ssrLoadModule('/src/source-titlebar.jsx');
});
after(async () => { await server?.close(); });

const SESSION = { id: 'a', name: 'A title', cwd: '/tmp/work' };
const rail = (over = {}) => ({ onScreen: false, raises: false, panelId: 'rail-panel', onToggle() {}, ...over });
const render = (props = {}) => renderToStaticMarkup(h(T.SourceTitlebar, { section: 'new', session: SESSION, onRename() {},
  terminalAvailable: true, previewAvailable: true, filesAvailable: true, ...props }));
const trailingOf = (html) => html.slice(html.indexOf('st-trailing'));
const leadOf = (html) => html.slice(html.indexOf('<div class="st-lead'), html.indexOf('<div class="st-trailing'));
const toggles = (html) => [...html.matchAll(/data-pane-toggle="([a-z]+)"/g)].map((match) => match[1]);
const group = (html) => trailingOf(html).match(/<div class="flex items-center gap-1 empty:hidden"[^>]*>/)?.[0];
const railButton = (html) => html.match(/<button[^>]*aria-label="Session rail"[^>]*>/)?.[0];
const RULE = '<span role="separator" aria-orientation="vertical" class="h-4 w-px shrink-0 bg-border"></span>';

test('official 3.6556.2: oG N / le / ue, FW\'s starting owner, x_ reads it as the landing with Files', () => {
  pin(official3('cc43287c9-Me-M2ucD.js'), [
    'G=(te||!t&&!o)&&!N',
    'ie=db(t),ae=G||ie&&!o&&!re.origin&&!N',
    'e.currentSessionId===oe&&(e.ownerStarting||ie)',
    'ce=aT(se)',
    'le=!ae&&!N&&ce?oe:void 0,ue=!G&&le===void 0',
    'He=te&&!N,Ue=ae&&t!==null',
    'N?null:t&&q?',
    '(ae||o||re.origin)&&p(FW,{sessionRef:ae?t:null,hiddenCount:ae&&t?$e:0,held:ue,startingId:le,paneIndex:k})',
    'p("div",{ref:we,inert:ue,className:"flex items-center gap-1 empty:hidden",children:_t})',
    'ae&&t&&be.overflowMenuProps&&p(cP,',
    // FW: the landing owner u, or the starting owner while oG hands it a startingId.
    'u=eb(!t&&c===0&&!l)',
    't??(u!==null&&i!==void 0?{id:i,type:"starting"}:u)',
    'Hi as eb',
  ]);
  pin(official3('c5da7eb42-XijZdwf1.js'), [
    'function Am(e){return e?.type==="starting"?Dm:e??null}',
    'Dm={id:nn,type:"landing"}',
    'function Pm(e){let t=Nm();return e&&t?Dm:null}',
    'Am as Ri',
    'Pm as Hi',
  ]);
  pin(official3('c73f45bc3-B7hbL7H9.js'), [
    'Ri as Mi',
    's=i?.type==="landing"',
    'y=Rs(t?.type==="starting")',
    'v||y||!s&&(b&&_||x||f.has("file")))',
    'if(s){le=J3($,83,o,n,a)?K3($,83,o,n,a,[...a,...n,...o]):$[86];break bb0}',
    'nt as Rs',
  ]);
  pin(official3('c0fbbe82d-COsmfHJY.js'), ['function sr(e){return cr(e)!==null}', 'sr as nt']);
});

test('model: titlebarSessionState is oG\'s G / ae / le / ue / He / Ue over the host state', () => {
  const state = (input) => titlebarSessionState(input);
  // A ready session: live, seen, not held; FW's owner is the session.
  assert.deepEqual(state({ session: SESSION }), { live: true, seen: true, startingShown: false, held: false, togglesMounted: true,
    toggleOwner: 'session', interactive: true, clusterMounted: true });
  // Loading (te false): not live, still seen (ie), held.
  assert.deepEqual(state({ session: SESSION, loading: true }), { live: false, seen: true, startingShown: false, held: true,
    togglesMounted: true, toggleOwner: 'session', interactive: false, clusterMounted: true });
  // Not found (N): neither live nor seen; FW not mounted (no spawn), no lead (source-titlebar), held.
  assert.deepEqual(state({ session: SESSION, sessionNotFound: true }), { live: false, seen: false, startingShown: false, held: true,
    togglesMounted: false, toggleOwner: null, interactive: false, clusterMounted: false });
  assert.deepEqual(state({ session: SESSION, loading: true, sessionNotFound: true }).toggleOwner, null);
  // The landing (no session, no spawn): live, the landing owner.
  assert.deepEqual(state({}), { live: true, seen: true, startingShown: false, held: false, togglesMounted: true,
    toggleOwner: 'landing', interactive: false, clusterMounted: false });
  // A spawn without a starting owner: FW mounted (o) on the landing owner, held.
  assert.deepEqual(state({ spawning: true }), { live: false, seen: false, startingShown: false, held: true, togglesMounted: true,
    toggleOwner: 'landing', interactive: false, clusterMounted: false });
  // TF-O1: a spawn whose owner is starting: the starting owner, not held.
  assert.deepEqual(state({ spawning: true, starting: true }), { live: false, seen: false, startingShown: true, held: false,
    togglesMounted: true, toggleOwner: 'starting', interactive: false, clusterMounted: false });
  // le needs !ae: with the landing shown, starting changes nothing.
  assert.equal(state({ starting: true }).toggleOwner, 'landing');
});

test('model: a starting owner lists the landing toggles (Am → Dm), Files kept by Rs (the host filesAvailable)', () => {
  const input = { surface: 'code', terminalAvailable: true, previewAvailable: true, filesAvailable: true };
  const order = (specs) => specs.map((spec) => spec.pane);
  assert.deepEqual(order(titlebarOwnerSpecs('starting', input)), ['terminal', 'preview', 'files']);
  assert.deepEqual(titlebarOwnerSpecs('starting', input), titlebarToggleSpecs({ ...input, session: false }));
  assert.deepEqual(titlebarOwnerSpecs('landing', input), titlebarToggleSpecs({ ...input, session: false }));
  assert.deepEqual(order(titlebarOwnerSpecs('session', input)), ['terminal', 'changes', 'preview', 'files']);
  // y = Rs(starting) is the landing's folder listing: without a folder there is no Files row.
  assert.deepEqual(order(titlebarOwnerSpecs('starting', { ...input, filesAvailable: false })), ['terminal', 'preview']);
});

test('SSR TF-O1: while the draft starts its session, the landing toggles (Files included) are live; a spawn without a starting owner holds them', () => {
  const startingHtml = render({ session: null, spawning: true, starting: true });
  assert.deepEqual(toggles(startingHtml), ['terminal', 'preview', 'files']);
  assert.doesNotMatch(group(startingHtml), /\sinert=/);
  assert.doesNotMatch(startingHtml, /data-pane-title/, 'still no draft title while spawning (shared-20 ah)');
  assert.doesNotMatch(startingHtml, /View options/, 'no ⋮ without a session');
  const held = render({ session: null, spawning: true });
  assert.deepEqual(toggles(held), ['terminal', 'preview', 'files']);
  assert.match(group(held), /\sinert=""/);
  // The landing itself is never held.
  assert.doesNotMatch(group(render({ session: null })), /\sinert=/);
});

test('SSR notdone 20: a session the core has no history for draws an empty lead, no toggles, no ⋮; the rail toggle is inert and unseen', () => {
  const html = render({ sessionNotFound: true, railToggle: rail() });
  const lead = leadOf(html);
  assert.match(lead, /^<div class="st-lead group\/lead"><\/div>$/);
  assert.doesNotMatch(lead, /A title|st-origin|st-folder|st-session-caret/);
  assert.deepEqual(toggles(html), []);
  assert.doesNotMatch(trailingOf(html), /aria-label="Changes"/);
  assert.match(trailingOf(html), /<div class="flex items-center gap-1 empty:hidden" inert=""><\/div>/);
  assert.doesNotMatch(html, /View options/);
  const toggle = railButton(html);
  assert.ok(toggle, 'TH stays mounted (oG `x&&!Qe&&…`)');
  assert.match(toggle, /\sinert=""/);
  assert.match(toggle, /opacity:0/);
  assert.equal(count(html, RULE), 0, 'ae && !Ee && Fne');
  // Found: the lead, the toggles and ⋮ are back; the rail toggle is live with its rule.
  const found = render({ sessionNotFound: false, railToggle: rail() });
  assert.match(leadOf(found), /A title/);
  assert.deepEqual(toggles(found), ['terminal', 'preview', 'files']);
  assert.match(found, /View options/);
  assert.doesNotMatch(railButton(found), /\sinert=|opacity:0/);
  assert.equal(count(found, RULE), 1);
  // N belongs to the Code session titlebar (oG): another surface keeps its title.
  assert.match(leadOf(render({ surface: 'cowork', sessionNotFound: true })), /A title/);
});

test('main.jsx hands the titlebar its not-found and starting state', () => {
  const main = read('src/main.jsx');
  assert.equal(count(main, 'sessionNotFound={!!current && historyUnavailable === current} starting={!current && !!spawnPhase}'), 1);
  // The same not-found the rail gets.
  assert.equal(count(main, 'sessionNotFound: !!current && historyUnavailable === current, besidePane'), 1);
  const titlebar = read('src/source-titlebar.jsx');
  pin(titlebar, [
    'const sessionState = titlebarSessionState({ session, loading, spawning, sessionNotFound: notFound, starting });',
    'inert={sessionState.held}',
    '{sessionState.seen && <>',
  ]);
  assert.equal(count(titlebar, 'does not hand the titlebar isSessionNotFound'), 0);
});
