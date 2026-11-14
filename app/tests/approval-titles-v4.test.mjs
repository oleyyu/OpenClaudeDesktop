// Region batch 3 (4.16336.0 migration, approval-titles): the 3.6556.2 production graph src/generated/approval-titles stays
// byte for byte (approval-elicitation, code-editor, cowork-approval and sidebar-hover-card link it by original chunk
// identity, region-plan cutover.oldConsumersAtGeneration; productionSwitchNotBeforeBatch 11) and the same generator cuts
// an isolated 4.16336.0 graph, src/generated/approval-titles-v4, from the frozen snapshot over cds-core, linking
// routines-shared-v4 (dependency region) and r3b-tasks (D1 owner of shared-0 Tl). Source checks read official chunk bytes
// only; the calls run the generated copy (plain node; vite SSR while D1 links are pending) with an intl that formats through the host's t() (as
// approval-card-model.mjs does) and records the message ids it was asked for.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as official4 from '../scripts/official-4.16336.0.mjs';
import { t } from '../electron/i18n/index.mjs';
import { contract4, contractVersions, extractApprovalTitles, extractContract4 } from '../scripts/extract-approval-titles.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const V4 = official4.referenceVersion;
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated');
const dir = path.join(generated, 'approval-titles-v4');
const legacyDir = path.join(generated, 'approval-titles');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const rootChunk = 'cc32965c2-CpdpcYvh.js';
const raw = fs.readFileSync(path.join(official4.ionSource, rootChunk), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const read = (file) => fs.readFileSync(file, 'utf8');
const modulesIn = (folder) => fs.readdirSync(folder).filter((name) => name.endsWith('.mjs'));
const staticImports = (text) => [...text.matchAll(/^import\s*\{[^}]*\}\s*from\s*"([^"]+)";/gm)].map((m) => m[1]);

// D1 pending (shared-62 kI / OF linked from routines-shared-v4 until cds-core wave 5 publishes them): that module imports a
// .jsx adapter, so the graph is loaded through vite SSR meanwhile; with nothing pending plain node loads it (E42).
let manifest, titles, messages, server;
const cdsPublished = () => new Set(Object.values(JSON.parse(read(path.join(generated, 'cds-core/manifest.json'))).publicNames).map((e) => `${e.file}#${e.local}`));
before(async () => {
  manifest = await extractApprovalTitles({ check: true, version: V4 });
  if (manifest.d1Pending.length === 0) {
    titles = await import('../src/generated/approval-titles-v4/tool-titles.mjs');
    messages = await import('../src/generated/approval-titles-v4/messages.mjs');
    return;
  }
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  titles = await server.ssrLoadModule('/src/generated/approval-titles-v4/tool-titles.mjs');
  messages = await server.ssrLoadModule('/src/generated/approval-titles-v4/messages.mjs');
});
after(() => server?.close());

function recordingIntl() {
  const ids = [];
  return {
    ids,
    formatMessage: (message, values) => { ids.push(message.id); return t(message.defaultMessage, values); },
    formatDate: (date) => String(date),
    formatList: (list) => list.join(', '),
  };
}
const ctx = (toolName, extra = {}) => ({ targets: [], consentStamped: false, archivedWithTarget: false, toolName, awayFromSession: false, connectors: [], ...extra });
const title = (toolName, args, extra) => {
  const intl = recordingIntl();
  const result = titles.approvalToolTitle(intl, titles.approvalToolSpec(toolName), args, ctx(toolName, extra));
  return result && { ...result, ids: intl.ids };
};

test('two source contracts: 3.6556.2 production (unchanged) and the 4.16336.0 isolated graph (--check, pins)', () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-approval-titles.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['routines-shared-v4', 'r3b-tasks']);
  assert.deepEqual(manifest.isolatedGraph, { productionOutput: 'src/generated/approval-titles', productionSwitchNotBeforeBatch: 11,
    heldBy: ['approval-elicitation', 'code-editor', 'cowork-approval', 'sidebar-hover-card', 'src/approval-card-model.mjs', 'src/source-approval-card.jsx'] });
  const onDisk = JSON.parse(read(path.join(dir, 'manifest.json')));
  assert.deepEqual(onDisk, manifest);
  assert.deepEqual(manifest.modules.map((m) => m.target).sort(), modulesIn(dir).sort());
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, V4, m.target);
    assert.equal(sha(fs.readFileSync(path.join(official4.ionSource, m.source))), m.sourceSha256, m.target);
    assert.equal(sha(read(path.join(dir, m.target))), m.sha256, m.target);
    assert.ok(m.bindings.length > 0, m.target);
    assert.match(read(path.join(dir, m.target)), new RegExp(`^// Original Claude Desktop ${V4.replace(/\./g, '\\.')} bindings from ${m.source.replace(/[.$]/g, '\\$&')}; generated by extract-approval-titles\\.mjs`));
  }
  // 3.6556.2 → 4.16336.0 roots: same exported names, renamed private locals of cc32965c2.
  const locals = { approvalToolTitle: 'np', approvalToolSpecs: 'rp', approvalToolSpec: 'ip', sessionMgmtApprovalTitle: 'Jd', pullRequestApprovalTitle: 'Qd',
    hostApprovalTitle: 'df', connectorsApprovalTitle: 'pf', sidebarApprovalTitle: 'hf', sessionApprovalTitle: 'Ff', settingsApprovalTitle: 'Bf',
    terminalApprovalTitle: 'Xf', scheduledTaskApprovalTitle: 'tp', fallbackApprovalTitle: 'Pd', argsMatchShape: 'xd', quotedName: 'Ed',
    singleLineText: 'Sd', plainIdentifier: 'wd' };
  assert.deepEqual(manifest.roots, Object.fromEntries(Object.entries(locals).map(([name, local]) => [name, { file: rootChunk, local, alias: null }])));
  const legacy = JSON.parse(read(path.join(legacyDir, 'manifest.json')));
  assert.deepEqual(Object.keys(manifest.roots), Object.keys(legacy.roots));
  assert.deepEqual(Object.keys(manifest.messageTables).sort(), Object.keys(legacy.messageTables).sort());
});

// round3 integrate-gates (same derivation as round3/legacy-prep.json "linker-whitelists" for cowork-scheduled-v4 and
// session-rail-kit-v4): the old `importers === []` was a staging-time snapshot. Under D1 the later 4.16336.0 regions that
// share a binding this graph holds (approval-elicitation-v4, cowork-approval-v4, …) link it through manifest.linkedAreas,
// so the linker set grows. What the test guards is the isolation, now derived from the manifests (stricter than the
// file-name check): no host file (src/ outside src/generated, electron/) names the graph; every generated linker is a
// 4.16336.0 graph that declares approval-titles-v4 in linkedAreas and imports it only by kind 'linked'.
test('the production graph and its 3.6556.2 consumers are untouched: no host file imports the -v4 graph; only 4.16336.0 graphs link it, each by a D1 declaration', () => {
  const legacy = JSON.parse(read(path.join(legacyDir, 'manifest.json')));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const name of modulesIn(legacyDir)) assert.doesNotMatch(read(path.join(legacyDir, name)), /approval-titles-v4|-v4\//, name);
  const importers = [];
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) { if (full !== dir && entry.name !== 'node_modules') walk(full); continue; }
      if (/\.(mjs|jsx|js|cjs)$/.test(entry.name) && read(full).includes('approval-titles-v4')) importers.push(path.relative(app, full));
    }
  };
  walk(path.join(app, 'src'));
  walk(path.join(app, 'electron'));
  const inGenerated = (file) => !path.relative(generated, path.join(app, file)).startsWith('..');
  assert.deepEqual(importers.filter((file) => !inGenerated(file)), [], 'no host file names approval-titles-v4');
  const linkedNames = (m) => { const la = m?.linkedAreas; return !la ? [] : Array.isArray(la) ? la.map((e) => (typeof e === 'string' ? e : e.area)) : Object.keys(la); };
  const linkers = new Map();
  for (const file of importers.filter(inGenerated)) {
    const area = path.relative(generated, path.join(app, file)).split(path.sep)[0];
    if (!linkers.has(area)) linkers.set(area, []);
    linkers.get(area).push(path.basename(file));
  }
  for (const [area, files] of linkers) {
    const m = JSON.parse(read(path.join(generated, area, 'manifest.json')));
    assert.equal(m.referenceVersion, V4, `${area} is a 4.16336.0 graph`);
    assert.ok(linkedNames(m).includes('approval-titles-v4'), `${area} declares approval-titles-v4 in linkedAreas`);
    const linkedTargets = new Set();
    for (const mod of m.modules) for (const i of mod.imports ?? [])
      if (/^\.\.\/approval-titles-v4\//.test(i.from ?? '')) { assert.equal(i.kind, 'linked', `${area}/${mod.target} -> ${i.from}`); linkedTargets.add(mod.target); }
    for (const name of files) assert.ok(linkedTargets.has(name), `${area}/${name} names approval-titles-v4 only through a manifest 'linked' import`);
  }
  // The -v4 graph never reaches a 3.6556.2 graph.
  for (const name of modulesIn(dir))
    for (const from of staticImports(read(path.join(dir, name))))
      assert.ok(!/^\.\.\/(routines-shared|code-routines|view-tabs|approval-titles)\//.test(from), `${name}: ${from}`);
});

test('roots: private, unique by features in cc32965c2, the same server switch and tool table (read_cloud_session added)', () => {
  const exported = new Set([...raw.matchAll(/export\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' as ')[0])));
  for (const { local } of Object.values(manifest.roots)) assert.ok(!exported.has(local), `${local} is private`);
  const servers = ['ccd_session_mgmt', 'ccd_pr', 'ccd_host', 'ccd_connectors', 'ccd_sidebar', 'ccd_session', 'ccd_settings', 'terminal', 'scheduled-tasks'];
  const generatedTitles = read(path.join(dir, 'tool-titles.mjs'));
  for (const server of servers) {
    assert.equal(count(raw, `case"${server}":`), 1, `official ${server}`);
    assert.equal(count(generatedTitles, `case ${JSON.stringify(server)}:`), 1, `generated ${server}`);
  }
  assert.equal(count(raw, '"Allow Claude to <b>pin</b> <glued>{session}?</glued>",id:"+O33CWUgVt"'), 1);
  assert.deepEqual(messages.sidebarTitleMessages.pinTitle, { defaultMessage: 'Allow Claude to <b>pin</b> <glued>{session}?</glued>', id: '+O33CWUgVt' });
  // 4.16336.0 re-hashed ids with the same English (messages.mjs finds each table by its 4.16336.0 key + id).
  assert.deepEqual(messages.terminalTitleMessages.run, { defaultMessage: 'run a command in your terminal', id: 't8vlt67Y4o' });
  assert.equal(count(raw, 'run:{defaultMessage:"run a command in your terminal",id:"t8vlt67Y4o"}'), 1);
  assert.equal(messages.toolActionMessages.archiveSession.id, 'n3eUhTbU5V');
  assert.equal(messages.sessionMgmtTitleMessages.archiveSelf.id, 'Vr1IhXt5Sg');
  assert.equal(count(raw, '/[\\r\\n\\u0085\\u2028\\u2029]/u.test('), 1);

  assert.deepEqual(titles.approvalToolSpec('mcp__terminal__run_in_terminal'), { server: 'terminal', kind: 'runInTerminal' });
  assert.deepEqual(titles.approvalToolSpec('mcp__ccd_session_mgmt__read_cloud_session'), { server: 'ccd_session_mgmt', kind: 'readCloudSession', sessionRefs: 'session_id' });
  assert.equal(titles.approvalToolSpec('mcp__unknown__tool'), undefined);
  assert.equal(titles.approvalToolSpec('hasOwnProperty'), undefined);
  assert.equal(Object.keys(titles.approvalToolSpecs).length, 51);
  for (const [name, spec] of Object.entries(titles.approvalToolSpecs))
    assert.ok(raw.includes(`${JSON.stringify(name).replace(/^"(\w+)"$/, '$1')}:{server:"${spec.server}",kind:"${spec.kind}"`), name);
});

test('links: cds-core publicNames, the plain routines-shared-v4 chunks (Tl among them), D1-pending kI / OF', () => {
  // Since cds-core wave 5 routines-shared-v4 cuts the pure shared-0 Tl itself (cds-core holds it without a publicName) and
  // no longer links r3b-tasks lazy-value.mjs, so this graph takes Tl from routines-shared-v4 shared-0 like its other links.
  const plain = ['../routines-shared-v4/shared-0-CnnWnVrT.mjs', '../routines-shared-v4/c0958e5bf-BxTMNpvT.mjs',
    '../routines-shared-v4/shared-4-C_EiQb9h.mjs'];
  const pending = manifest.d1Pending.map((d) => d.linkedFrom.split(':')[0]);
  const allowed = new Set(['react/jsx-runtime', ...plain, ...pending]);
  for (const name of modulesIn(dir))
    for (const from of staticImports(read(path.join(dir, name))))
      assert.ok(from.startsWith('./') || allowed.has(from) || /^\.\.\/cds-core\/[\w-]+\.mjs$/.test(from), `${name}: ${from}`);
  // The linked routines-shared-v4 modules for pure bindings load in plain node (they reach no .jsx adapter).
  for (const from of plain) assert.doesNotMatch(read(path.join(dir, from)), /\.jsx"/, from);
  // D1 pending: exactly the shared-62 kI / OF links, and only while cds-core does not publish them.
  const published = cdsPublished();
  const expected = ['kI', 'OF'].filter((name) => !published.has(`shared-62-DoCqVpIq.js#${name}`))
    .map((name) => ({ binding: `shared-62-DoCqVpIq.js#${name}`, linkedFrom: `../routines-shared-v4/shared-62-DoCqVpIq.mjs:${name}` }));
  assert.deepEqual(manifest.d1Pending.map(({ binding, linkedFrom }) => ({ binding, linkedFrom })), expected);
  // shared-8 Pe (the permission mode descriptor's icon) is the cds-core publicName CdsIcon.
  assert.match(read(path.join(dir, 'shared-8-BqfCbkJd.mjs')), /^import \{ CdsIcon as Pe \} from "\.\.\/cds-core\/shared-frame\.mjs";$/m);
  const imports = manifest.modules.flatMap((m) => m.imports.map((i) => ({ ...i, target: m.target })));
  for (const i of imports.filter((x) => x.kind === 'shared-graph' || x.kind === 'linked')) assert.match(i.linkedSha256, /^[0-9a-f]{64}$/, `${i.target} ${i.local}`);
  // D1: shared-0 Tl comes from routines-shared-v4 only (a pure lazy-value factory, one declaration it holds); kI / OF
  // (cds-core wave 5) from cds-core; none is declared here.
  const rsShared0 = JSON.parse(read(path.join(generated, 'routines-shared-v4/manifest.json'))).modules.find((m) => m.target === 'shared-0-CnnWnVrT.mjs');
  assert.ok(rsShared0.bindings.some((b) => b.name === 'Tl'), 'routines-shared-v4 shared-0 holds Tl');
  const tlImports = imports.filter((i) => i.original === 'Tl' || i.via?.endsWith('#Tl'));
  assert.ok(tlImports.length > 0);
  for (const i of tlImports) assert.deepEqual([i.from, i.name], ['../routines-shared-v4/shared-0-CnnWnVrT.mjs', 'Tl'], `${i.target} Tl`);
  assert.ok(!imports.some((i) => i.from.startsWith('../r3b-tasks/')), 'no r3b-tasks link is left');
  for (const i of imports.filter((x) => x.original === 'kI' || x.original === 'OF'))
    assert.equal(i.kind, published.has(`shared-62-DoCqVpIq.js#${i.original}`) ? 'shared-graph' : 'linked', `${i.target} ${i.original}`);
  for (const m of manifest.modules) for (const b of m.bindings)
    assert.ok(!(m.source === 'shared-0-CnnWnVrT.js' && b.name === 'Tl') && !(m.source === 'shared-62-DoCqVpIq.js' && ['kI', 'OF'].includes(b.name)), `${m.target} ${b.name}`);
  assert.equal(typeof titles.approvalToolTitle, 'function');
});

test('D1 / D46: no module state of this graph is held by another 4.16336.0 graph; cds-core held bindings are pure', () => {
  const others = new Map();
  for (const area of fs.readdirSync(generated)) {
    if (area === 'approval-titles-v4') continue;
    let other; try { other = JSON.parse(read(path.join(generated, area, 'manifest.json'))); } catch { continue; }
    for (const m of Array.isArray(other.modules) ? other.modules : []) {
      if ((m.referenceVersion ?? other.referenceVersion) !== V4 || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!others.has(key)) others.set(key, new Set());
        others.get(key).add(area);
      }
    }
  }
  const states = [];
  for (const m of manifest.modules) {
    const text = read(path.join(dir, m.target));
    babel.traverse(babel.babelParse(text, m.target, true), { Program(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) {
        if (b.kind === 'module') continue;
        const init = b.path.isVariableDeclarator() ? b.path.node.init : null;
        if (b.constantViolations.length || (init?.type === 'NewExpression' && /^(Weak)?(Map|Set)$/.test(init.callee.name))) states.push(`${m.source}#${name}`);
      }
      p.stop();
    } });
  }
  assert.ok(states.length > 0);
  for (const key of states) assert.deepEqual([...(others.get(key) ?? [])], [], `${key} is module state another graph holds`);
  for (const m of manifest.modules) for (const name of m.heldByCdsCore) assert.ok(!states.includes(`${m.source}#${name}`), `${m.target} ${name}`);
  // shared-62 Zk is written only by the hook Qk and shared-0 NY only by FY (exported Pa); no 4.16336.0 graph cuts either
  // writer: reported in the manifest, never hidden, while this graph holds the state. Since cds-core wave 5b both states
  // are cds-core publicNames (servedDeploymentConfig, selfHostedSessionsSupported): linked, so nothing is reported.
  const published = cdsPublished();
  assert.deepEqual(manifest.stateWritersNotCut, [{ binding: 'shared-62-DoCqVpIq.js#Zk', writers: ['Qk'] }, { binding: 'shared-0-CnnWnVrT.js#NY', writers: ['FY'] }]
    .filter(({ binding }) => !published.has(binding)));
  for (const key of ['shared-62-DoCqVpIq.js#Zk', 'shared-0-CnnWnVrT.js#NY'])
    if (published.has(key)) assert.ok(!manifest.modules.some((m) => m.source === key.split('#')[0] && m.bindings.some((b) => b.name === key.split('#')[1])), `${key} is linked, not held`);
  for (const { binding } of manifest.stateWritersNotCut) assert.deepEqual([...(others.get(binding) ?? [])], [], binding);
});

test('runInTerminal: a new tab, an open tab, a folder (4.16336.0 copy)', () => {
  const plain = title('mcp__terminal__run_in_terminal', { command: 'npm test' });
  assert.equal(plain.action, 'run a command in your terminal');
  assert.equal(plain.meta, undefined);
  assert.equal(plain.detail, 'npm test');
  assert.equal(plain.overrideDescription, undefined);
  assert.equal(plain.clampTitle, true);
  assert.equal(plain.detailFirst, true);
  assert.deepEqual(plain.detailReadGate, { label: 'Command', hint: 'Scroll through the whole command to allow it.' });
  assert.deepEqual(plain.redundantReasons, ["Starting a shell or running a command in the user's terminal requires explicit approval."]);
  assert.ok(plain.reasonLines instanceof Map);
  assert.ok(plain.ids.includes('t8vlt67Y4o'));

  const open = title('mcp__terminal__run_in_terminal', { command: 'npm test', tab_id: 'tab-1' });
  assert.equal(open.overrideDescription, 'In a tab that’s already open');
  assert.equal(open.ownProse, true);
  assert.ok(open.ids.includes('ZGr6xKQ8Eq'));
  assert.equal(titles.terminalApprovalTitle(recordingIntl(), titles.approvalToolSpec('mcp__terminal__run_in_terminal'), { command: 'ls', tab_id: 'x', cwd: '/tmp' }, ctx('mcp__terminal__run_in_terminal')), null);
  const fallback = title('mcp__terminal__run_in_terminal', { command: 'ls', tab_id: 'x', cwd: '/tmp' });
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.clickOnly, true);
  assert.deepEqual(fallback.rows, [{ label: 'Command', value: 'ls' }, { label: 'Tab id', value: 'x' }, { label: 'Folder', value: '/tmp' }]);
  assert.deepEqual(fallback.rowsReadGate, { hint: 'Scroll to the end to allow this.' });

  const folder = title('mcp__terminal__run_in_terminal', { command: 'npm test', cwd: '/tmp/project' });
  assert.equal(folder.overrideDescription, undefined);
  assert.equal(folder.folderLine, '/tmp/project');
  const inSession = title('mcp__terminal__run_in_terminal', { command: 'npm test', cwd: '/tmp/project', cwd_outside_session: false });
  assert.equal(inSession.folderLine, undefined);
  assert.equal(inSession.overrideDescription, 'In “/tmp/project”');
  assert.ok(inSession.ids.includes('LhWcwAzX+V'));
  assert.equal(titles.terminalApprovalTitle(recordingIntl(), titles.approvalToolSpec('mcp__terminal__run_in_terminal'), { command: 'a\nb' }, ctx('mcp__terminal__run_in_terminal')), null);
  assert.equal(title('mcp__terminal__list_terminal_tabs', {}).action, 'see your open terminal tabs');
});

test('ccd_host, set_session_title, read_cloud_session (new), sidebar pin, scheduled task', () => {
  const reveal = title('mcp__ccd_host__reveal_path', { path: '/tmp/project/a.txt' });
  assert.equal(reveal.action, 'open the folder containing');
  assert.equal(reveal.meta, 'a.txt');
  assert.equal(reveal.detail, '/tmp/project/a.txt');
  assert.deepEqual(reveal.ids, ['EXR0xlYruE']);
  const open = title('mcp__ccd_host__open_in_editor', { path: '/tmp/project/a.txt' });
  assert.equal(open.action, 'open');
  assert.deepEqual(open.redundantReasons, ['Opens this file in your code editor.']);

  const args = { session_id: 's1', title: 'New name' };
  const self = title('mcp__ccd_session_mgmt__set_session_title', args, { targets: [{ id: 's1', isSelf: true }] });
  assert.equal(self.action, 'rename this session to “New name”');
  for (const id of ['0j8UztmAqH', 'Hcv2gsJA8w', 'IProu954Xz', 'vvaa5HdU49']) assert.ok(self.ids.includes(id), id);
  const replaces = title('mcp__ccd_session_mgmt__set_session_title', { ...args, current_title: 'Old' }, { targets: [{ id: 's1', isSelf: true }] });
  assert.deepEqual(replaces.footnote, ['This replaces the name you gave it yourself.']);
  const other = title('mcp__ccd_session_mgmt__set_session_title', args, { targets: [{ id: 's2', isSelf: false, title: 'Other work' }] });
  assert.equal(other.action, 'rename a session to “New name”');
  assert.equal(other.meta, 'Other work');
  assert.equal(other.session.tail, 'to “New name”');
  const none = title('mcp__ccd_session_mgmt__set_session_title', args);
  assert.equal(none.action, 'rename a session');
  assert.equal(none.fallback, true);

  const cloud = title('mcp__ccd_session_mgmt__read_cloud_session', { session_id: 's2' }, { targets: [{ id: 's2', isSelf: false, title: 'Other work' }] });
  assert.equal(cloud.action, 'read the transcript of your cloud session');
  assert.equal(cloud.meta, 'Other work');
  assert.deepEqual(cloud.footnote, ['Claude will see that session’s title, its replies there, and the names of tools it used.']);
  assert.deepEqual(cloud.redundantReasons, ['This brings part of another session into this one, so Claude asks first, even in auto mode.']);

  const pin = title('mcp__ccd_sidebar__set_pinned', { session_id: 's2', pinned: true }, { targets: [{ id: 's2', isSelf: false, title: 'Other work' }] });
  assert.equal(pin.action, 'pin a session');
  assert.equal(pin.session.action, 'pin');
  const routine = title('mcp__scheduled-tasks__create_scheduled_task', { title: 'Daily', prompt: 'p', cronExpression: '0 9 * * *' });
  assert.equal(routine.action, 'create the routine');
  assert.equal(routine.meta, '“Daily”');
  assert.ok(routine.ids.includes('RNj8X+QKww'));
});

test('fail-stop: drifted features, an ambiguous root, a variant that would write', async () => {
  const variant = (patch) => ({ ...contract4, ...patch });
  await assert.rejects(extractContract4(variant({ features: { ...contract4.features, np: [...contract4.features.np, 'case "ccd_gone":'] } }), { check: true }),
    /root np lacks "case \\"ccd_gone\\":"/);
  await assert.rejects(extractContract4(variant({ features: { ...contract4.features, Sd: ['singleLine: !0'] } }), { check: true }),
    /root Sd is not the unique declaration with its features/);
  await assert.rejects(extractContract4(variant({}), { check: false }), /a contract variant runs with check: true only/);
  await assert.rejects(extractApprovalTitles({ check: true, version: '9.9.9' }), /no 9\.9\.9 source contract/);
});

test('fail-stop D1: a module state a linked area holds is never cut a second time', async () => {
  // A module-level Map / Set routines-shared-v4 holds in shared-62 that cds-core neither publishes nor holds, used as the
  // root of a check-only variant: generation must stop instead of cutting a second copy.
  const area = JSON.parse(read(path.join(generated, 'routines-shared-v4/manifest.json')));
  const cdsCore = JSON.parse(read(path.join(generated, 'cds-core/manifest.json')));
  const file = 'shared-62-DoCqVpIq.js';
  const cdsHeld = new Set(cdsCore.modules.filter((m) => path.basename(m.source) === file).flatMap((m) => m.bindings.map((b) => (typeof b === 'string' ? b : b.name))));
  const text = fs.readFileSync(path.join(official4.ionSource, file), 'utf8');
  const exported = new Set([...text.matchAll(/export\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(' as ')[0])));
  const esc = (name) => name.replace(/\$/g, '\\$');
  const candidate = area.modules.filter((m) => m.source === file).flatMap((m) => m.bindings.map((b) => b.name))
    .find((name) => !cdsHeld.has(name) && !exported.has(name) && new RegExp(`[,;{]${esc(name)}=new (WeakMap|Map|Set|WeakSet)\\(?\\)?[,;]`).test(text));
  if (!candidate) return; // no such state left in routines-shared-v4's shared-62: nothing to prove here.
  const kind = new RegExp(`[,;{]${esc(candidate)}=new (WeakMap|Map|Set|WeakSet)`).exec(text)[1];
  const variant = { ...contract4, rootChunk: file, roots: { [candidate]: 'probe' }, features: { [candidate]: [`${candidate} = new ${kind}()`] } };
  await assert.rejects(extractContract4(variant, { check: true }), new RegExp(`D1: ${esc(file.replace(/[.]/g, '\\.'))}#${esc(candidate)} is module state routines-shared-v4/`));
});

test('fail-stop D46: module state cds-core holds without a publicName stops generation with binding, text and chain', async () => {
  const cdsCore = JSON.parse(read(path.join(generated, 'cds-core/manifest.json')));
  const published = new Set(Object.values(cdsCore.publicNames).map((e) => `${e.file}#${e.local}`));
  const file = official4.sharedFrame;
  const text = fs.readFileSync(path.join(official4.ionSource, file), 'utf8');
  const exported = new Set([...text.matchAll(/export\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(' as ')[0])));
  const held = cdsCore.modules.find((m) => m.source === file).bindings.map((b) => b.name);
  const candidate = held.find((name) => !published.has(`${file}#${name}`) && !exported.has(name)
    && new RegExp(`[,;{]${name.replace(/\$/g, '\\$')}=new (WeakMap|WeakSet)\\b`).test(text));
  if (!candidate) return; // cds-core names every module state it holds: D46 cannot trigger.
  const kind = new RegExp(`[,;{]${candidate.replace(/\$/g, '\\$')}=new (WeakMap|WeakSet)\\b`).exec(text)[1];
  const variant = { ...contract4, rootChunk: file, roots: { [candidate]: 'probe' }, features: { [candidate]: [`${candidate} = new ${kind}()`] } };
  const survey = await extractContract4(variant, { survey: true });
  assert.deepEqual(survey.stateConflicts.map((c) => [c.binding, c.heldBy, c.kind]), [[`${file}#${candidate}`, 'cds-core/shared-frame.mjs', `module ${kind}`]]);
  assert.match(survey.stateConflicts[0].text, new RegExp(`^${candidate} = new ${kind}\\(\\)`));
  assert.deepEqual(survey.stateConflicts[0].reachedBy, ['root']);
  await assert.rejects(extractContract4(variant, { check: true }), (error) => {
    assert.match(error.message, /module state cds-core holds without a semantic name \(add it to cds-core publicNames, D46\)/);
    assert.equal(error.stateConflicts[0].binding, `${file}#${candidate}`);
    return true;
  });
});
