// w13-surfaces-modes (3.6556.2): the host mode model follows the official desktop surface list (shared-78 mY), the Home
// segment's mode (shared-21 rT over shared-78 DY) and name (shared-21 cT / Vw); the host's own "More ▸ Chat / Cowork"
// menu is gone, and startup restore / switchMode never land on a surface the original does not list.
// Research: analysis/claude-3.6556.2-migrate-20261025/research/w13-surfaces.md §1.1 O5–O7, surf-02/03/04/05/16/29.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { desktopSurfaces, homeModeFor, homeNameFor, resolveSurface } from '../src/app-switch-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2');
const official = file => fs.readFileSync(path.join(readable, file), 'utf8');
const source = file => fs.readFileSync(path.join(app, file), 'utf8');

let server, Host, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/source-app-switch.jsx');
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(async () => { await server?.close(); });

const radios = html => [...html.matchAll(/<span[^>]*role="radio"[^>]*>/g)].map(m => m[0]);
const hiddenInputs = html => [...html.matchAll(/<input type="radio"[^>]*>/g)].map(m => m[0]);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

test('official text: mY merges chat into cowork, rT picks the Home mode, cT names it', () => {
  const shared21 = official('shared-21-R7LldJ05.js');
  const shared78 = official('shared-78-D5Fw2h0a.js');
  assert.ok(shared21.includes('return _s() ? "cowork" : "chat"'), 'rT');
  assert.ok(shared21.includes('t === "cowork" ? n : e.formatMessage({ defaultMessage: "Chat", id: "WTrOy36sdu" })'), 'cT');
  assert.ok(shared78.includes('_ = i(["cowork", ...u.filter(hY)])'), 'mY desktop merge');
  assert.ok(shared78.includes('(a && u.push("cowork"), r !== !1 && u.push("code"), u.includes("chat") && (a ||'), 'mY desktop list');
  assert.ok(shared78.includes('return e !== "chat" && e !== "cowork";'), 'hY');
  assert.ok(shared78.includes('!e.includes("chat") && e.includes("cowork") && (t.isAvailable || t.status === "blocked_by_entitlement")'), 'DY');
});

test('desktopSurfaces / homeModeFor / homeNameFor / resolveSurface over coworkEnabled × mode', () => {
  assert.deepEqual(desktopSurfaces({ coworkEnabled: true }), ['cowork', 'code']);
  assert.deepEqual(desktopSurfaces({ coworkEnabled: false }), ['chat', 'code']);
  assert.deepEqual(desktopSurfaces(), ['chat', 'code']);
  assert.equal(homeModeFor({ coworkEnabled: true }), 'cowork');
  assert.equal(homeModeFor({ coworkEnabled: false }), 'chat');
  assert.equal(homeModeFor(), 'chat');
  assert.equal(homeNameFor('cowork'), 'Claude');
  assert.equal(homeNameFor('chat'), 'Chat');
  const seen = [];
  const intl = { formatMessage: message => (seen.push(message), `«${message.defaultMessage}»`) };
  assert.equal(homeNameFor('cowork', intl), '«Claude»');
  assert.equal(homeNameFor('chat', intl), '«Chat»');
  assert.deepEqual(seen, [{ defaultMessage: 'Claude', id: '4PjoX4rZSt' }, { defaultMessage: 'Chat', id: 'WTrOy36sdu' }]);
  const table = [];
  for (const coworkEnabled of [true, false]) for (const mode of ['chat', 'cowork', 'code']) table.push([coworkEnabled, mode, resolveSurface(mode, { coworkEnabled })]);
  assert.deepEqual(table, [
    [true, 'chat', 'chat'], [true, 'cowork', 'cowork'], [true, 'code', 'code'],
    [false, 'chat', 'chat'], [false, 'cowork', 'chat'], [false, 'code', 'code'],
  ]);
  assert.equal(resolveSurface('cowork'), 'chat', 'no Cowork without the flag');
});

test('SSR: the Home segment is "Chat" on the chat home and "Claude" on the merged cowork home', () => {
  const render = props => renderToStaticMarkup(React.createElement(Host.SourceAppSwitch, { onMode() {}, ...props }));
  const chat = render({ mode: 'chat', homeMode: 'chat' });
  assert.deepEqual(hiddenInputs(chat).map(i => attr(i, 'value')), ['chat', 'code']);
  assert.deepEqual(radios(chat).map(r => attr(r, 'aria-label')), ['Chat', 'Code']);
  const cowork = render({ mode: 'cowork', homeMode: 'cowork' });
  assert.deepEqual(hiddenInputs(cowork).map(i => attr(i, 'value')), ['cowork', 'code']);
  assert.deepEqual(radios(cowork).map(r => attr(r, 'aria-label')), ['Claude', 'Code']);
  // A chat session opened on the merged home keeps the Home segment (cowork) selected.
  const merged = render({ mode: 'chat', homeMode: 'cowork' });
  assert.deepEqual(radios(merged).map(r => attr(r, 'aria-checked')), ['true', 'false']);
  // Without a homeMode the switch answers rT with Cowork unavailable.
  const fallback = render({ mode: 'code' });
  assert.deepEqual(hiddenInputs(fallback).map(i => attr(i, 'value')), ['chat', 'code']);
  assert.equal(attr(radios(fallback)[0], 'aria-label'), 'Chat');
});

test('SSR: the sidebar passes homeMode to the switch and has no host More ▸ Chat / Cowork menu', () => {
  const thread = { id: 's1', name: 'Session s1', cwd: '/fixture/work', createdAt: 1, updatedAt: 1 };
  for (const [mode, homeMode, name] of [['chat', 'chat', 'Chat'], ['cowork', 'cowork', 'Claude'], ['chat', 'cowork', 'Claude'], ['code', 'chat', 'Chat']]) {
    const html = renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread], knownFolders: ['/fixture/work'], mode, homeMode, onMode() {} }));
    assert.deepEqual(hiddenInputs(html).map(i => attr(i, 'value')), [homeMode, 'code'], `${mode}/${homeMode}`);
    assert.equal(attr(radios(html)[0], 'aria-label'), name, `${mode}/${homeMode}`);
    assert.doesNotMatch(html, /surface-more/, `${mode}/${homeMode}`);
  }
  const sidebar = source('src/source-sidebar.jsx');
  assert.doesNotMatch(sidebar, /surface-more|surfaceMenu|lastChatSurface/);
  assert.match(sidebar, /\{!collapsed && <SourceAppSwitch mode=\{mode\} homeMode=\{homeMode\} onMode=\{onMode\} chord \/>\}/);
  assert.match(sidebar, /\{collapsed && <SourceAppSwitch placement="peek" mode=\{mode\} homeMode=\{homeMode\} onMode=\{onMode\} chord \/>\}/);
});

test('main.jsx: startup restore, switchMode and the sidebar follow the 3.6556.2 surface list', () => {
  const main = source('src/main.jsx');
  assert.ok(main.includes("import { desktopSurfaces, homeModeFor, resolveSurface } from './app-switch-model.mjs';"));
  assert.ok(main.includes("const next = NO_SIDEBAR ? 'code' : validSurface(b.config.mode) ? resolveSurface(b.config.mode, { coworkEnabled: b.coworkEnabled === true }) : 'code';"));
  const guard = "if (!desktopSurfaces({ coworkEnabled: boot?.coworkEnabled === true }).includes(next) && next !== 'chat') return;";
  const switchMode = main.slice(main.indexOf('async function switchMode(next) {'));
  assert.ok(switchMode.indexOf(guard) > 0 && switchMode.indexOf(guard) < switchMode.indexOf('++surfaceNavigation.current'), 'guard before navigating');
  assert.match(main, /<SourceSidebar\n\s+homeMode=\{homeModeFor\(\{ coworkEnabled: boot\?\.coworkEnabled === true \}\)\}/);
  const appSwitch = source('src/source-app-switch.jsx');
  assert.ok(appSwitch.includes('const homeName = homeNameFor(homeMode, intl);'));
  assert.ok(appSwitch.includes("homeMode = homeModeFor(), onMode,"));
  assert.doesNotMatch(appSwitch, /homeMode = 'cowork'/);
});
