// w13-surfaces-nav (3.6556.2): the Chat / Cowork sidebar navigation rows follow shared-21 bH over the hH table
// (surface-nav-model.mjs): no Design row (I = EV(t, a) is null without the claude.ai Design entry), no Scheduled in
// chat (modes ["cowork","code"]), no chat Artifacts (i = Jp() is shared-18 CH() `return !1`), no "New" badge on
// Projects (N = O && M, hub look off). Research: research/w13-surfaces.md §1.2 O13–O15, surf-09/10/11/12.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { surfaceNavRows, surfaceNavGates, SURFACE_NAV_ITEMS } from '../src/surface-nav-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2');
const official = file => fs.readFileSync(path.join(readable, file), 'utf8');
const source = file => fs.readFileSync(path.join(app, file), 'utf8');
const keys = rows => rows.map(row => row[2]);
const labels = rows => rows.map(row => row[0]);

let server, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(async () => { await server?.close(); });

test('official text: hH entries, their order and modes', () => {
  const s = official('shared-21-R7LldJ05.js');
  const table = s.slice(s.indexOf('  hH = ['), s.indexOf('function gH(e) {'));
  assert.ok(table.length > 0);
  const at = needle => { const i = table.indexOf(needle); assert.ok(i >= 0, needle); return i; };
  const order = [
    '{ id: "projects", surface: "projects", icon: "Projects", label: dH.projects, modes: ["chat", "cowork"] }',
    'id: "cowork-artifacts",',
    'id: "scheduled",',
    'id: "dispatch",',
    'id: "artifacts",',
    'label: dH.design,',
    '{ id: "customize", surface: "customize", icon: "Tool", label: dH.customize }',
  ].map(at);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'hH order');
  const entry = needle => { const i = at(needle); return table.slice(table.lastIndexOf('{', i), table.indexOf('}', i) + 1); };
  const scheduled = entry('id: "scheduled",');
  assert.ok(scheduled.includes('gate: "scheduled",') && scheduled.includes('modes: ["cowork", "code"]'), scheduled);
  const coworkArtifacts = entry('id: "cowork-artifacts",');
  assert.ok(coworkArtifacts.includes('gate: "cowork-artifacts",') && coworkArtifacts.includes('modes: ["cowork"]'));
  const artifacts = entry('id: "artifacts",');
  assert.ok(artifacts.includes('gate: "artifacts",') && artifacts.includes('modes: ["chat"]'));
  const design = entry('label: dH.design,');
  assert.ok(design.includes('icon: "Palette",') && design.includes('gate: "design",') && design.includes('modes: ["chat", "cowork"]'));
  const dispatch = entry('id: "dispatch",');
  assert.ok(dispatch.includes('gate: "dispatch",') && dispatch.includes('modes: ["cowork"]'));
  // The model's table follows the same order and modes for the rows it keeps.
  assert.deepEqual(SURFACE_NAV_ITEMS.map(item => item.id), ['projects', 'cowork-artifacts', 'scheduled', 'dispatch', 'artifacts', 'design', 'customize']);
});

test('official text: bH gates and the projects / badge rules', () => {
  const s = official('shared-21-R7LldJ05.js');
  for (const needle of [
    'u = t === "code" ? c.codeEnabled : c.coworkEnabled || l,',
    '(u && l.add("scheduled"),',
    'r && a && l.add("dispatch"),',
    'i && l.add("artifacts"),',
    '(k || (a && i)) && l.add("cowork-artifacts"),',
    'I !== null && l.add("design"),',
    'i = Jp(),', 'k = Gc(),', 'I = EV(t, a),', 'M = Nc(),', 'N = O && M,', 'P = Vs(),',
    'let r = P && n.id === "scheduled";',
    '(n.modes !== void 0 && !n.modes.includes(t) && !r) ||',
    '(n.id === "projects" && t === "chat" && !Yc)',
    'r.id === "projects" && N && (y = "new-neutral")',
    'x = r.hideFromSidebar || (M && t !== "code" && !b)',
  ]) assert.ok(s.includes(needle), needle);
  // Import bindings: Jp / Yc / Gc / Nc / Vs.
  const imports = (from) => { const end = s.indexOf(`} from "./${from}";`); return s.slice(s.lastIndexOf('import {', end), end); };
  assert.match(imports('shared-18-D3y8YMFN.js'), /\n  Yn as Jp,\n/);
  const s78 = imports('shared-78-D5Fw2h0a.js');
  for (const binding of ['rn as Yc', 'pv as Gc', 'kw as Nc', 'Ow as Vs']) assert.ok(s78.includes(`  ${binding},`), binding);
  // shared-18 CH (exported as Yn) is a constant false in the desktop bundle: no chat Artifacts row.
  const s18 = official('shared-18-D3y8YMFN.js');
  assert.ok(s18.includes('function CH() {\n  return !1;\n}'));
  assert.ok(s18.slice(s18.indexOf('export {')).includes('  CH as Yn,'));
  // shared-78: Gc = SE (coworkArtifacts on unless the app says otherwise), Nc = cp (hub look, tp = !1),
  // Vs = lp (np = !1), Yc = P1 = shared-52 tk (chatIn3p).
  const t78 = official('shared-78-D5Fw2h0a.js');
  const exports78 = t78.slice(t78.indexOf('export {'));
  for (const binding of ['SE as pv', 'cp as kw', 'lp as Ow', 'P1 as rn']) assert.ok(exports78.includes(`  ${binding},`), binding);
  assert.ok(t78.includes('return e ? e.coworkArtifacts === void 0 || e.coworkArtifacts.status === "supported" : !1;'));
  assert.ok(t78.includes('function cp() {\n  return C($f) ?? tp;\n}') && t78.includes('  tp = !1,\n  np = !1,'));
  assert.ok(t78.includes('function lp() {\n  return C(ep) ?? np;\n}'));
  assert.ok(t78.includes('  P1 = aa,') && t78.includes('  ju as aa,'));
  const t52 = official('shared-52-uHFNjl7C.js');
  assert.ok(t52.includes('var tk = globalThis.desktopBootFeatures?.chatIn3p?.status === "supported";'));
  assert.ok(t52.slice(t52.indexOf('export {')).includes('  tk as ju,'));
});

test('model: chat and cowork rows over coworkEnabled and the gates', () => {
  const chat = surfaceNavRows('chat', { coworkEnabled: false });
  assert.deepEqual(chat, [["New", "Add", "new"], ["Projects", "Projects", "projects"], ["Customize", "Tool", "customize"]]);
  assert.deepEqual(surfaceNavRows('chat', { coworkEnabled: true }), chat, 'chat ignores the cowork gate');
  for (const rows of [chat, surfaceNavRows('chat', { coworkEnabled: true })]) {
    assert.ok(!keys(rows).includes('routines'), 'no Scheduled in chat');
    assert.ok(!keys(rows).includes('design'), 'no Design');
  }
  const cowork = surfaceNavRows('cowork', { coworkEnabled: true });
  assert.deepEqual(cowork, [["New", "Add", "new"], ["Projects", "Projects", "projects"], ["Artifacts", "Artifacts", "artifacts"], ["Scheduled", "Clock", "routines"], ["Customize", "Tool", "customize"]]);
  assert.ok(!keys(cowork).includes('design'));
  // w13-close-main-jsx-tests (surfaces-nav-02): without Cowork, mY has no cowork surface; a cowork mode falls back to
  // the Chat rows (never an empty sidebar, not even New).
  assert.deepEqual(surfaceNavRows('cowork', { coworkEnabled: false }), chat, 'Chat rows without Cowork');
  assert.deepEqual(surfaceNavRows('cowork'), chat);
  assert.ok(!keys(surfaceNavRows('cowork', { coworkEnabled: false, dispatch: true })).includes('dispatch'), 'no Cowork-only row');
  assert.deepEqual(surfaceNavRows('code', { coworkEnabled: true }), [], 'Code keeps its own table');
  // Official alternatives stay reachable through the gate options.
  assert.deepEqual(labels(surfaceNavRows('chat', { chatArtifacts: true })), ['New', 'Projects', 'Artifacts', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('chat', { chatIn3p: false })), ['New', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('chat', { design: true })), ['New', 'Projects', 'Design', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { coworkEnabled: true, coworkArtifacts: false })), ['New', 'Projects', 'Scheduled', 'Customize']);
  assert.deepEqual(labels(surfaceNavRows('cowork', { coworkEnabled: true, coworkArtifacts: false, chatArtifacts: true })), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Customize'], '(k || (a && i))');
  assert.deepEqual([...surfaceNavGates({ coworkEnabled: true })], ['scheduled', 'cowork-artifacts']);
  assert.deepEqual([...surfaceNavGates()], ['cowork-artifacts']);
});

const navRows = html => {
  const primary = html.slice(html.indexOf('class="source-sidebar-primary"'));
  const block = primary.slice(0, primary.indexOf('</div>'));
  return [...block.matchAll(/<button[^>]*class="source-sidebar-nav-row[^"]*"[^>]*>([\s\S]*?)<\/button>/g)]
    .map(m => m[1].replace(/<kbd[\s\S]*?<\/kbd>/g, '').replace(/<[^>]+>/g, '').replace(/[\uE000-\uF8FF]/g, '').trim()); // icon-font glyphs
};

test('SSR: the sidebar draws the hH rows for chat, cowork and a chat session on the merged home', () => {
  const thread = { id: 's1', name: 'Session s1', cwd: '/fixture/work', createdAt: 1, updatedAt: 1 };
  const render = props => renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread], knownFolders: ['/fixture/work'], onMode() {}, ...props }));
  const chat = render({ mode: 'chat', homeMode: 'chat' });
  assert.deepEqual(navRows(chat), ['New', 'Projects', 'Customize']);
  const cowork = render({ mode: 'cowork', homeMode: 'cowork' });
  assert.deepEqual(navRows(cowork), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Customize']);
  const merged = render({ mode: 'chat', homeMode: 'cowork' });
  assert.deepEqual(navRows(merged), ['New', 'Projects', 'Artifacts', 'Scheduled', 'Customize']);
  for (const html of [chat, cowork, merged]) {
    assert.doesNotMatch(html, /surface-new-badge/);
    assert.doesNotMatch(html, />Design</);
    assert.match(html, /<span>Projects<\/span><\/button>/, 'Projects carries no badge');
  }
  // Code mode is untouched: only New above the list, the rest in the pins block.
  const code = render({ mode: 'code', homeMode: 'chat' });
  assert.deepEqual(navRows(code), ['New']);
  assert.match(code, /data-testid="nav-pin-rows"/);
  const sidebar = source('src/source-sidebar.jsx');
  assert.ok(sidebar.includes("import { surfaceNavRows } from \"./surface-nav-model.mjs\";"));
  assert.ok(sidebar.includes(": surfaceNavRows(homeMode === 'cowork' ? 'cowork' : mode, { coworkEnabled: homeMode === 'cowork' });"));
  assert.doesNotMatch(sidebar, /surface-new-badge|\["Design", "Palette", "design"\]/);
});

test('official raw chunks carry the same gates (byte text, not the prettier cache)', () => {
  const raw = file => fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', file), 'utf8');
  const s21 = raw('shared-21-R7LldJ05.js');
  for (const needle of ['I!==null&&l.add("design")', 'i&&l.add("artifacts")', '(k||a&&i)&&l.add("cowork-artifacts")',
    'n.id==="projects"&&t==="chat"&&!Yc', 'r.id==="projects"&&N&&(y="new-neutral")']) assert.ok(s21.includes(needle), needle);
  assert.ok(raw('shared-18-D3y8YMFN.js').includes('function CH(){return!1}'));
});
