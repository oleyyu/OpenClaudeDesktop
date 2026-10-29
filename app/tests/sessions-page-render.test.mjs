// w10-ccres-hf-host (with w10-trans-sessions-view-host, E44): the Code Sessions page markup the host renders is the
// 3.6556.2 cbd6c85c8 Hf. Each check pins the official raw text in the chunk and the markup it produces in the host.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup as renderServerMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

const root = new URL('..', import.meta.url).pathname;
const chunk = fs.readFileSync(path.join(ionSource, 'cbd6c85c8-D1xuycDy.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
let server, Host;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/source-sessions-page.jsx');
});
after(() => server?.close());
// The Sessions table reads its row selection with useSyncExternalStore and no server snapshot (client-only); read it the
// way a client's first render does (as tests/sessions-page-current.test.mjs).
const render = props => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, server) => d.useSyncExternalStore(s, g, server ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderServerMarkup(React.createElement(Host.SourceSessionsPage, props)); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};
const now = Date.now();
const sessions = [{ id: 'live', name: 'Live task', updatedAtMs: now }, { id: 'stored', name: 'Stored task', archived: true, updatedAtMs: now }];

test('the Code page calls Hf with codeScoped, hp row actions and Qu row links', () => {
  assert.equal(count(chunk, 'a(Hf,{codeScoped:!0,renderCodeRowActions:hp,codeRowLinkComponent:l?Qu:void 0})'), 1);
  assert.equal(count(chunk, 'function hp(e){return a(Xu,{item:e})}'), 1);
  assert.equal(count(chunk, 'Xu=m(function(e){let $=J9(2),{item:t}=e;return J1($,0,t)?K1($,0,t,a(js,{children:a(Zu,{item:t})})):$[1]})'), 1);
});

test('primary action: the New session CDS link card (slot 441)', () => {
  assert.equal(count(chunk, 'href:m?k:"/new",className:"df-link-card"'), 1);
  assert.equal(count(chunk, 'defaultMessage:"New session",id:"Ajmo+3Cu3b"'), 2);
  const html = render({ sessions });
  assert.equal(count(html, ' df-link-card" href="/code"'), 1);
  assert.match(html, /<a data-cds="Button" data-cds-compactable=""[^>]*href="\/code"[^>]*>.*?>New session<\/span><\/a>/);
});

test('tabs and panel: Active / Archived tabs control the labelled panel (slots 303, 486)', () => {
  assert.equal(count(chunk, 'id:`${ki}-${e}`,value:e,"aria-controls":Ai'), 1);
  assert.equal(count(chunk, 'id:Ai,role:Qa,"aria-labelledby":$a,"data-stale":eo,className:"flex flex-col"'), 1);
  const html = render({ sessions });
  const [, base] = html.match(/<div id="([^"]+)-panel" role="tabpanel" aria-labelledby="[^"]+-code" class="flex flex-col">/) ?? [];
  assert.ok(base, 'panel');
  assert.match(html, new RegExp(`role="tab" aria-controls="${base}-panel" aria-selected="true" id="${base}-code"[^>]*>Active</button>`));
  assert.match(html, new RegExp(`role="tab" aria-controls="${base}-panel" aria-selected="false" id="${base}-archived"[^>]*>Archived</button>`));
  assert.match(render({ sessions, initialSurface: 'archived' }), /aria-labelledby="[^"]+-archived" class="flex flex-col">/);
});

test('search: the collapsed "Search sessions" control (slot 383/389)', () => {
  assert.equal(count(chunk, 'defaultMessage:"Search sessions",id:"aWZzyB3FYG"'), 2);
  assert.match(render({ sessions }), /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost=""[^>]*aria-label="Search sessions"/);
});

test('rows: the router link carries data-primary inside the row link wrapper (Bf, linkComponent)', () => {
  assert.equal(count(chunk, 'a(V,{"data-primary":!0,...e,onClick:n})'), 1);
  assert.equal(count(chunk, 'linkComponent:Bf'), 1);
  assert.equal(count(chunk, 'a(Ps.Provider,{value:Dr,children:fo})'), 1);
  const html = render({ sessions, onSessionMenu() {} });
  assert.match(html, /<span class="contents"><a data-primary="true" aria-label="Live task" class="cds-reset absolute inset-0 z-\[1\][^"]*" href="#code-session\/live"><\/a><\/span>/);
  assert.doesNotMatch(html, /Stored task/);
});

test('empty states: the official paragraph and Code copy (slot 339)', () => {
  for (const text of ['className:"text-body text-muted-as-secondary whitespace-normal wrap-anywhere"', 'defaultMessage:"Sessions you start will show up here.",id:"QyOfAD0vTP"', 'defaultMessage:"Archived sessions will show up here.",id:"oU9aPLpjtv"'])
    assert.equal(count(chunk, text), 1, text);
  assert.match(render({}), /<p class="text-body text-muted-as-secondary whitespace-normal wrap-anywhere">Sessions you start will show up here\.<\/p>/);
  assert.match(render({ initialSurface: 'archived' }), /<p class="text-body text-muted-as-secondary whitespace-normal wrap-anywhere">Archived sessions will show up here\.<\/p>/);
});
