// w13-close-cowork-misc (plan-w13-closeout §0c E76 / E77): the Chat title menu's tool groups, the CLAUDE.md write
// hardening, the Scheduled page's Cowork guard, the project page's Composer mode gate and project memory dialog.
// Source-only: official chunks are read as text (never executed); main-process pieces run on a temp folder.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { asarSource, ionSource } from '../scripts/official-3.6556.2.mjs';
import { coworkClaudeMd } from '../electron/cowork-runtime/claude-md.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const local = file => fs.readFileSync(path.join(app, file), 'utf8');
const asar = name => fs.readFileSync(path.join(asarSource, name), 'utf8');
const ion = prefix => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find(name => name.startsWith(prefix + '-') && name.endsWith('.js'))), 'utf8');
const once = (haystack, needle) => assert.equal(haystack.split(needle).length - 1, 1, needle);

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, location: { pathname: '/projects', search: '', hash: '', href: 'app://local/projects' },
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let server, adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  adapters = await server.ssrLoadModule('/src/source-project-v3-adapters.jsx');
});
after(() => server?.close());

// E76: an official chat session (local agent mode, sessionType "chat") has neither the scheduled-tasks tools nor the
// skill tools, so the host's groups stay Cowork-only and the title menu's Schedule / Turn into skill only fill the composer.
test('E76: official chat sessions have no scheduled-task or skill tools; the host groups stay Cowork-only', () => {
  const lam = asar('index.chunk-Dl8NPgw7.js'), index = asar('index.chunk-jPKPzV-P.js'), cowork = asar('index.chunk-h5ilKUwe.js');
  // The scheduled-tasks server is mounted for every local agent mode session (no sessionType test) …
  once(lam, 'if(t._s.schedulingAllowed())try{let{createScheduledTasksServer:n}=');
  // … and the cowork server's save_skill / propose_skills ride on canSaveSkill / canProposeSkills …
  once(cowork, 'n.canSaveSkill&&R.push(re(e,n.sessionId,n.account,n.saveAttendance)),n.canProposeSkills&&R.push(ee(e))');
  // … but a chat session (Ge) gets the chat tool set, and every one of those tools disallowed.
  once(lam, 'Ge=s.sessionType===t.SZ');
  once(lam, 'Ge&&Ot){Y.tools=[...t.TY,...jt?["Glob"]:[]]');
  once(lam, 'Y.disallowedTools=[...Y.disallowedTools??[],t.IX,t.vX,...de?[]:[t.$X],t.EX,t.LX,t.MX,t.BX,t.ZZ,t.aQ,t.QZ,t.$Z,t.nQ,t.rQ,t.DX,t.ZX,t.QX,t.YX,t.JX,t.KX,t.qX,t.GX,t.WX]');
  const exported = alias => index.match(new RegExp(`Object\\.defineProperty\\(exports,"${alias.replace('$', '\\$')}",\\{enumerable:!0,get:function\\(\\)\\{return ([\\w$]+)\\}\\}\\)`))?.[1];
  const declared = (binding, value) => once(index, `${binding}=${value}`);
  assert.equal(exported('SZ'), 'V5t'); declared('V5t', '"chat"');
  assert.equal(exported('TY'), 'e9t'); declared('e9t', '["WebSearch","AskUserQuestion","Read","Write","Edit","Skill","ToolSearch"]');
  for (const [alias, binding, value] of [['ZZ', 'mw', '`${pw}create_scheduled_task`'], ['aQ', 'hw', '`${pw}update_scheduled_task`'],
    ['QZ', 'x5t', '`${pw}delete_scheduled_task`'], ['$Z', 'S5t', '`${pw}list_scheduled_tasks`'], ['LX', 'O7t', '`mcp__${xw}__${D7t}`'],
    ['MX', 'A7t', '`mcp__${xw}__${k7t}`']]) { assert.equal(exported(alias), binding, alias); declared(binding, value); }
  declared('D7t', '"save_skill"'); declared('k7t', '"propose_skills"'); declared('b5t', '"scheduled-tasks"');
  // Host: both groups are Cowork-only (agent-tools-host.cjs serves a group to its surfaces' sessions only).
  for (const file of ['electron/agent-tools/scheduled-tasks.mjs', 'electron/agent-tools/skills-cowork.mjs']) {
    const source = local(file);
    assert.match(source, /^export const surfaces = \["cowork"\];$/m, file);
    assert.match(source, /w13-close-cowork-misc \(E76\): Cowork only, as the official chat sessions have it\./, file);
  }
  // The menu items only fill the composer (Bae Fi / Ii), as w13-close-cowork-sidebar wired them.
  const bae = ion('ca2ef848d');
  once(bae, 'setContent("Turn this task into a skill",[],[])');
});

// E77 (E60 hardening, w13-close-cowork-ui review low 2): a CLAUDE.md that is a second name (hard link) of a file elsewhere,
// or a FIFO, is neither read nor written through.
async function claudeMdFixture(t) {
  const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'cowork-misc-claude-md-')));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const userData = path.join(root, 'userData'), granted = path.join(root, 'project'), other = path.join(root, 'other');
  for (const dir of [userData, granted, other]) await fsp.mkdir(dir, { recursive: true });
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: '0f8fad5b-d9cb-469f-a165-70867728950e', folders: [granted] } };
  return { userData, granted, other, options: { userData, metadata: id => (id === 'T' ? meta : undefined), vmFolder: () => null } };
}
const refusedWith = (promise) => assert.rejects(Promise.resolve().then(() => promise), /can’t be opened here/);

test('E77 CLAUDE.md: a hard link to a file outside the folder is neither read nor written', async t => {
  const f = await claudeMdFixture(t);
  const secret = path.join(f.other, 'secret.md'), file = path.join(f.granted, 'CLAUDE.md');
  await fsp.writeFile(secret, 'secret');
  await fsp.link(secret, file);
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file }, f.options));
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file, content: 'overwrite' }, f.options));
  assert.equal(await fsp.readFile(secret, 'utf8'), 'secret');
  // Once it is the folder's own file again (one link), it reads and writes as before.
  await fsp.unlink(secret);
  assert.deepEqual(await coworkClaudeMd({ threadId: 'T', path: file }, f.options), { content: 'secret' });
  assert.equal(await coworkClaudeMd({ threadId: 'T', path: file, content: 'mine' }, f.options), true);
  assert.equal(await fsp.readFile(file, 'utf8'), 'mine');
});

test('E77 CLAUDE.md: opened with O_NONBLOCK | O_NOFOLLOW, and a non-file (FIFO) is refused without waiting', async t => {
  const f = await claudeMdFixture(t);
  const file = path.join(f.granted, 'CLAUDE.md'), flags = [];
  // A FIFO stand-in: open answers at once (as O_NONBLOCK makes a real FIFO do) with a handle that is not a plain file.
  const fifo = { ...fsp, open: async (target, flag) => { flags.push(flag); return { stat: async () => ({ isFile: () => false, nlink: 1, size: 0 }),
    readFile: async () => { throw new Error('read a FIFO'); }, truncate: async () => { throw new Error('truncated a FIFO'); },
    writeFile: async () => { throw new Error('wrote a FIFO'); }, close: async () => {} }; } };
  const options = { ...f.options, fs: fifo };
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file }, options));
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file, content: 'x' }, options));
  const { O_NONBLOCK, O_NOFOLLOW, O_WRONLY, O_CREAT } = fs.constants;
  assert.equal(flags.length, 2);
  for (const flag of flags) assert.ok((flag & O_NONBLOCK) && (flag & O_NOFOLLOW), String(flag));
  assert.ok((flags[1] & O_WRONLY) && (flags[1] & O_CREAT));
  const source = local('electron/cowork-runtime/claude-md.mjs');
  assert.match(source, /const ownFile = stat => stat\.isFile\(\) && stat\.nlink === 1;/);
  assert.match(source, /O_RDONLY \| NOFOLLOW \| NONBLOCK/);
  assert.match(source, /O_WRONLY \| nodeFs\.constants\.O_CREAT \| NOFOLLOW \| NONBLOCK/);
});

test('E77 CLAUDE.md: a real FIFO named CLAUDE.md is refused at once (read and write)', async t => {
  const f = await claudeMdFixture(t);
  const file = path.join(f.granted, 'CLAUDE.md');
  try { (await import('node:child_process')).execFileSync('/usr/bin/mkfifo', [file]); }
  catch (error) { t.skip(`mkfifo unavailable here (${error.code ?? error.message})`); return; }
  // Without O_NONBLOCK both opens would wait for a peer and this test would time out.
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file }, f.options));
  await refusedWith(coworkClaudeMd({ threadId: 'T', path: file, content: 'x' }, f.options));
});

// E77 (coworkui-placeholder-02 third site): the Scheduled page reaches Cowork only when Cowork is a listed surface.
test('E77 Scheduled page: coworkStartable and the two handlers carry the Cowork surface guard', () => {
  const main = local('src/main.jsx');
  const mount = main.match(/<SourceRoutines call=\{call\}[\s\S]*?\/> :/)?.[0] ?? '';
  assert.ok(mount.includes('coworkStartable={coworkSurfaceListed()}'));
  assert.ok(mount.includes("onCreateWithClaude={async prompt => { if (!coworkSurfaceListed()) return; await switchMode('cowork');"));
  assert.ok(mount.includes("onStartTemplate={async (prompt, { title } = {}) => { if (!coworkSurfaceListed()) return; await switchMode('cowork');"));
  assert.match(main, /const coworkSurfaceListed = \(\) => desktopSurfaces\(\{ coworkEnabled: boot\?\.coworkEnabled === true \}\)\.includes\('cowork'\);/);
  once(ion('ccd3f68fe'), 'i(kr,{onCreateWithClaude:tn?mr:void 0,onSetUpManually:pr})');
});

// E77 (w13-close-chat-projects-memory crossLane): td's Cowork segment follows the host's Cowork switch, and the project's
// memory dialog carries the project id (c274117ff O `projectUuid: r` → "Manage project memory").
test('E77 project page: Composer mode gets gates={{ coworkBlocked }}, ProjectMemoryDialog passes the project id', () => {
  const page = local('src/source-projects.jsx'), main = local('src/main.jsx');
  assert.ok(page.includes('<SourceProjectComposerMode value={composerMode} onChange={onComposerMode} gates={{ coworkBlocked }} />'));
  assert.ok(page.includes('composerMode={composerMode} coworkBlocked={coworkBlocked} onComposerMode='));
  const tag = main.slice(main.indexOf('<SourceProjects '), main.indexOf('/>', main.indexOf('<SourceProjects ')));
  assert.ok(tag.includes('coworkBlocked={!coworkSurfaceListed()}'));
  const c71 = ion('c71dee58b');
  assert.ok(/_=!h/.test(c71) && c71.includes('x.length>1'));
  // cf2f34ee4 hands Bt `{ projectUuid: n, ...o }`; O names the project wording off projectUuid.
  once(local('src/generated/chat-projects/cf2f34ee4-uPxXNyjx.mjs'), 'r(Bt, { projectUuid: n, ...o }, n)');
  const o = ion('c274117ff');
  once(o, 'r?t(f,{defaultMessage:"Manage project memory",id:"PG2tpcuuml"}):t(f,{defaultMessage:"Manage memory",id:"v7MnWPl5dR"})');
  let dialog;
  const memory = { query: { data: { memory: 'Prefers metric units.', controls: [] } }, busy: false, controls() {} };
  const Probe = () => { dialog = adapters.ProjectMemoryDialog({ projectUuid: 'p1', modalOpen: true, setModalOpen() {} }); return null; };
  renderToStaticMarkup(h(adapters.LocalProjectContext.Provider, { value: { memory } }, h(Probe)));
  assert.equal(dialog.props.projectId, 'p1');
  assert.equal(dialog.props.open, true);
  let none;
  const Bare = () => { none = adapters.ProjectMemoryDialog({ modalOpen: true, setModalOpen() {} }); return null; };
  renderToStaticMarkup(h(adapters.LocalProjectContext.Provider, { value: { memory } }, h(Bare)));
  assert.equal(none.props.projectId, null);
});

// E77 stale comments: source-surfaces.jsx's Computer use row and extract-chat-knowledge.mjs's rc boundary.
test('E77 comments: Computer use is on (E63 B); the memory text goes through the sliced rc', () => {
  const surfaces = local('src/source-surfaces.jsx');
  assert.doesNotMatch(surfaces, /cowork_computer_use_side_panel_card, off by default \(R15\)/);
  assert.match(surfaces, /8 Computer use \(bb\)\s+`Vn && …` — GrowthBook cowork_computer_use_side_panel_card; main\.jsx turns it on/);
  assert.match(local('src/main.jsx'), /const COWORK_PANEL_GATES = Object\.freeze\(\{ cowork_computer_use_side_panel_card: true \}\);/);
  const generator = local('scripts/extract-chat-knowledge.mjs');
  assert.doesNotMatch(generator, /the c18fe02d2 tree over the sliced chat-markdown parts/);
  assert.match(generator, /renders c89efce1a rc itself as w13-close-chat-renderer sliced it/);
  const manifest = JSON.parse(local('src/generated/chat-knowledge/manifest.json'));
  assert.ok(JSON.stringify(manifest).includes('renders c89efce1a rc itself as w13-close-chat-renderer sliced it'));
  assert.match(local('src/source-chat-markdown.jsx'), /import \{ ChatTextMarkdown \} from '\.\/generated\/chat-renderer\/chat-text\.mjs';/);
});
