import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';

// R4f-proposal P1 (tasks-proposal-group-card WI-1): the transcript's inline proposal group card is generated from
// 2.42304.0 (scripts/extract-proposal-group.mjs → src/generated/proposal-group, one module per source chunk, public names
// in index.mjs) over the host services of src/source-proposal-group-adapters.jsx. This file pins the generator, the
// installed source the card follows, the closure's boundaries and the contracts with the host model (P2,
// proposal-group-model.mjs) and the host spawner (P3, proposal-spawner.mjs). No browser, no Electron, no network.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/proposal-group');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const C96 = 'c96d752d0-BOCqU7c2.js', C227 = 'c227f4d5e-Ba-r--Rl.js';

let server, G, A, Model, Spawner;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  G = await server.ssrLoadModule('/src/generated/proposal-group/index.mjs');
  A = await server.ssrLoadModule('/src/source-proposal-group-adapters.jsx');
  Model = await server.ssrLoadModule('/src/proposal-group-model.mjs');
  Spawner = await server.ssrLoadModule('/src/proposal-spawner.mjs');
});
after(async () => { await server?.close(); });

test('generator: every module is the installed 2.42304.0 closure (generator --check), with verify-gen and the index', async () => {
  const { extractProposalGroup } = await import('../scripts/extract-proposal-group.mjs');
  const checked = await extractProposalGroup({ check: true });
  assert.deepEqual(checked, manifest);
  assert.equal(manifest.referenceVersion, '2.42304.0');
  for (const entry of manifest.modules) {
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(entry.sha256, sha(fs.readFileSync(path.join(directory, entry.source))), entry.source);
    // Every emitted binding is a top-level declaration of its chunk; --check re-slices them (the manifest's per-binding
    // hashes are of the installed declaration text).
    assert.ok(entry.bindings.length > 0, entry.source);
  }
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.source), 'index.mjs', 'manifest.json'].sort());
  assert.equal(fs.readFileSync(path.join(app, 'scripts/verify-gen-proposal-group.mjs'), 'utf8'),
    "import { extractProposalGroup } from './extract-proposal-group.mjs';\nawait extractProposalGroup({ check: true });\n");
  // index.mjs publishes exactly the manifest's public names, each the named local of its chunk module.
  assert.deepEqual(Object.keys(G).sort(), Object.keys(manifest.publicNames).sort());
  for (const [name, entry] of Object.entries(manifest.publicNames)) {
    assert.equal(manifest.modules.find(m => m.source === entry.file).publicNames[entry.local], name);
    if (entry.export) assert.match(raw(entry.file), new RegExp(`[{,]${entry.local.replace(/\$/g, '\\$')} as ${entry.export.replace(/\$/g, '\\$')}[,}]`), name);
  }
});

test('source: the group card, its rows and gates are the 2.42304.0 strings the research pinned (grep counts)', () => {
  const c96 = raw(C96), c227 = raw(C227), cf74 = raw('cf74bc599-D9NZWRyl.js');
  const pins = [
    [c96, 'yulgEBYVAR', 1], [c96, '3EyqDGYYSx', 1], [c96, '7HOJW6dDhv', 1], [c96, 'uniqueKey:"start-all-left-out"', 1], [c96, 'via:"start_all"', 1],
    [c96, 'requestSpawnAll(e)', 1], [c96, 'epitaxy-card-outline flex w-full max-w-[480px] select-text flex-col overflow-clip rounded-card', 1],
    [c96, 'Date.now()+400<n||Xl(e)-n>=400', 1], [c96, '$e?.popBackgroundTaskSuggestionById!==void 0', 1], [c96, 'data-proposed-task-state', 4],
    [c96, 'Ya6NvW8Shh', 1], [c96, 'aGLJDnT0lI', 2], [c96, 'idHR+W+hmS', 1], [c96, 'UuCP/YMcXP', 1], [c96, 'TDUfVk3Q+J', 2], [c96, 'TPp5keYrfx', 1],
    [c96, 'dqfK1klFfH', 1], [c96, '/oIEN9p4Q2', 1], [c96, 'Start this in its own session?', 1], [c96, 'Z184O6N3fq', 4], [c96, 'N$=5', 1],
    [c96, '"data-options-toggle"', 1], [c96, 'className:"epitaxy-root flex w-114 max-w-[90vw] flex-col break-words"', 1],
    [c96, 'kind:"turnSuggestions"', 1], [c96, 'kind:"unplacedSuggestions"', 2], [c96, 'qQ=E(null)', 1],
    [c227, 'K7kuIZkkhY', 1], [c227, 'tOCeMArEBM', 2], [c227, 'Cqp4C6aPD2', 2], [c227, 'rhSI1/3g21', 2], [c227, 'VKZ/U8vAsk', 2], [c227, 'bpmu8yHqXJ', 2],
    [c227, 'aD2X1yB2+e', 1], [c227, 'hj/DGXIO/C', 1],
    [cf74, 'inlineCards:!0', 1], [cf74, 'onSpawner:s', 1], [cf74, 'Or&&t&&dr&&!lr&&u(lb', 1],
  ];
  for (const [text, needle, count] of pins) assert.equal(occurrences(text, needle), count, needle);
  // The generated card carries them in its prettier form.
  const card = generated(C96), form = generated(C227);
  for (const needle of ['id: "yulgEBYVAR"', 'id: "3EyqDGYYSx"', '{ uniqueKey: "start-all-left-out" }', 'via: "start_all"', 'return Date.now() + 400 < n || Xl(e) - n >= 400;',
    '"data-options-toggle": ""', '"epitaxy-root flex w-114 max-w-[90vw] flex-col break-words"', 'var N$ = 5;', 'defaultMessage: "{mode} mode", id: "aGLJDnT0lI"'])
    assert.ok(card.includes(needle) || card.replace(/\s+/g, ' ').includes(needle), needle);
  for (const needle of ['id: "K7kuIZkkhY"', 'id: "Cqp4C6aPD2"', 'id: "bpmu8yHqXJ"', 'id: "aD2X1yB2+e"', 'id: "hj/DGXIO/C"']) assert.ok(form.includes(needle), needle);
});

test('closure: React, the view-tabs CDS names (D1/D24), the adapters and this folder — nothing else; no second context', () => {
  const imports = manifest.modules.flatMap(m => m.imports.map(i => ({ ...i, module: m.source })));
  assert.deepEqual([...new Set(imports.map(i => i.kind))].sort(), ['adapter', 'generated', 'react', 'view-tabs']);
  for (const i of imports) {
    if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime'].includes(i.from), `${i.module}:${i.local}`);
    if (i.kind === 'adapter') assert.equal(i.from, '../../source-proposal-group-adapters.jsx');
    if (i.kind === 'generated') assert.ok(manifest.modules.some(m => `./${m.source}` === i.from), i.from);
    if (i.kind === 'view-tabs') assert.ok(i.from.startsWith('../view-tabs/'), i.from);
  }
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.deepEqual([...new Set(imports.filter(i => i.kind === 'view-tabs').map(i => i.name))].sort(), ['CdsButton', 'CdsDisabledReason', 'CdsDropdown', 'CdsIcon',
    'CdsInfoTooltip', 'CdsOverflowTooltip', 'CdsPopover', 'CdsShimmer', 'CdsSwitch', 'CdsTooltipProvider', 'cdsClassNames', 'isFizzyLakePartEnabled', 'useDirection']);
  for (const i of imports.filter(i => i.kind === 'view-tabs')) assert.equal(viewTabs.publicNames[i.name].local, i.original, i.name);
  // Each adapter is an export of the adapter module, and the module imports nothing from this folder (no cycle).
  for (const i of imports.filter(i => i.kind === 'adapter')) assert.ok(i.name in A, i.name);
  assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/source-proposal-group-adapters.jsx'), 'utf8'), /from\s+["'][^"']*generated\/proposal-group/);
  // The two same-chunk host answers: the generic tool row (Uz) and the model selector (LK).
  assert.deepEqual(imports.filter(i => i.kind === 'adapter' && i.via.includes('#')).map(i => `${i.name}<-${i.via}`).sort(),
    ['ProposalModelSelector<-c227f4d5e-Ba-r--Rl.js#LK', 'ProposalToolFallback<-c96d752d0-BOCqU7c2.js#Uz']);
  // The official spawner F1e (20 KB, bound to the desktop bridge and cloud) is not extracted.
  assert.equal(manifest.modules.find(m => m.source === C96).bindings.some(b => b.name === 'F1e'), false);
  // Contexts created here: the spawner context and the offer chord context of the card chunk, and the two Markdown
  // contexts JQ provides as null; none is one view-tabs instantiates.
  const held = new Set(viewTabs.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b}`)));
  const contexts = manifest.modules.flatMap(m => m.contexts.map(name => `${m.source}#${name}`));
  assert.deepEqual(contexts.sort(), ['c02b04696-cOrTvyA6.js#n', 'c19e90103-muBq-gyt.js#Zg', 'c96d752d0-BOCqU7c2.js#YQ', 'c96d752d0-BOCqU7c2.js#qQ']);
  for (const key of contexts) assert.equal(held.has(key), false, key);
  // Pinned call sites the host wiring follows (Lb / Ib in the session pane, the feed rows, Xx's inline gate).
  assert.deepEqual(manifest.callSites.map(s => s.binding ?? `${s.source} (raw)`), ['Lb', 'Ib', `${C96} (raw)`, 'cf74bc599-D9NZWRyl.js (raw)']);
});

test('module evaluation has no host side effect: no localStorage, no DOM, no window read at import time', () => {
  for (const entry of [...manifest.modules.map(m => m.source), 'index.mjs']) {
    // Top-level statements are imports, declarations and the export: no statement of the chunk runs on import.
    const kinds = new Set(parsers.babel.parse(generated(entry), {}).program.body.map(node => node.type));
    for (const kind of kinds) assert.ok(['ImportDeclaration', 'ExportNamedDeclaration', 'VariableDeclaration', 'FunctionDeclaration', 'ClassDeclaration'].includes(kind), `${entry}: ${kind}`);
  }
  // The sent-here store (kQ) persists into the adapter's storage, not the window's localStorage.
  assert.ok(generated(C96).includes('storage: fc(() => za),'));
  assert.equal(manifest.modules.find(m => m.source === C96).imports.find(i => i.local === 'za').name, 'sentHereStorage');
});

// ---- P2 contract: the host model's rewrites answer what the generated originals answer.
const SPAWN = 'mcp__ccd_session__spawn_task';
const records = [
  { id: 'a', name: SPAWN, input: {}, output: 'Noted (position 1, task_id: task_0000000a).', status: 'completed', isError: false },
  { id: 'b', name: SPAWN, input: {}, output: undefined, status: 'running', isError: false },
  { id: 'c', name: SPAWN, input: {}, output: 'boom', status: 'error', isError: true },
  { id: 'd', name: SPAWN, input: {}, output: 'task_id: task_0000000d', status: 'completed', isError: true },
  { id: 'e', name: SPAWN, input: {}, output: 'x', status: 'error', isError: true, interrupted: true },
  { id: 'f', name: SPAWN, input: {}, output: 'x', status: 'error', isError: true, rejected: true },
  { id: 'g', name: 'mcp__other__tool', input: {}, output: 'task_id: task_0000000f', status: 'completed', isError: false },
  { id: 'h', name: SPAWN, input: {}, output: 'Noted (position 2, task_id: task_ABCDEF12).', status: 'completed', isError: false },
];
test('P2 contract: proposal-group-model.mjs pL / hL / gL / mL / PPe and the tool constants equal the generated originals', () => {
  assert.equal(Model.SPAWN_TASK_TOOL, G.SPAWN_TASK_TOOL);
  assert.equal(String(Model.TASK_ID_PATTERN), String(G.TASK_ID_PATTERN));
  assert.equal(G.PROPOSAL_SESSION_SERVER, Model.PROPOSAL_SERVER);
  for (const record of records) {
    assert.equal(Model.proposalTaskId(record), G.proposalTaskId(record), `pL ${record.id}`);
    assert.equal(Model.isProposingTool(record), G.isProposingTool(record), `hL ${record.id}`);
    assert.equal(Model.isPlacedProposal(record), G.isPlacedProposal(record), `gL ${record.id}`);
    assert.equal(Model.proposalToolFailed(record), G.proposalToolFailed(record), `mL ${record.id}`);
  }
  for (const list of [records, records.slice(1, 3), []]) {
    const official = G.proposingTools([{ kind: 'tools', tools: list }]), host = Model.proposingTools(list);
    assert.deepEqual(official.tools.map(r => r.id), host.tools.map(r => r.id));
    assert.equal(official.firstProposingCallId, host.firstProposingCallId);
  }
  assert.equal(G.taskIdLine('task_0000000a'), 'task_id: task_0000000a');
  assert.equal(G.taskIdFromResult('Noted (position 1, task_id: task_0000000a).'), 'task_0000000a');
});

// ---- P3 contract: the host spawner takes the generated helpers and stores, and the card reads what it writes.
test('P3 contract: proposal-spawner.mjs runs on the generated helpers; spawning and outcomes land in the stores the rows read', async () => {
  const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? '') };
  const starts = [];
  const queue = [{ id: 'task_0000c0de', title: 'Fix the flaky test', prompt: 'Fix it', tldr: 'Flaky', cwd: '/repo', createdAt: 1 }];
  const parent = 'local_p3';
  let release;
  const spawner = Spawner.createProposalSpawner({
    official: { proposalKey: G.proposalKey, isOffer: G.isOfferProposal, crossRepoCwdOf: G.crossRepoCwdOf, keepSessionMode: G.keepSessionMode,
      resolvePermissionMode: G.resolveStartPermissionMode, needsModeConsent: G.startModeNeedsConsent, hereText: r => G.proposalHereText(intl, r) },
    spawning: { visible: (q, p) => G.visibleProposalQueue(q, G.spawningTaskIds(p)), mark: G.markProposalSpawning, clear: G.clearProposalSpawning },
    results: { record: G.recordProposalOutcome, clear: G.clearProposalOutcome },
    bridge: { popById: async () => true, sendMessage: async () => {}, start: request => { starts.push(request); return new Promise(r => { release = r; }); } },
    notify: () => {},
  });
  spawner.setHost({ sessionId: parent, available: true, queue, session: { originCwd: '/repo', cwd: '/repo', model: 'gpt-5.5', effort: 'high', permissionMode: 'default' } });
  const snapshot = spawner.getSnapshot();
  assert.equal(snapshot.primaryTarget, 'worktree');
  assert.equal(snapshot.crossRepoCwdOf('/repo'), undefined);
  assert.equal(snapshot.crossRepoCwdOf('/other'), '/other');
  const started = snapshot.requestSpawn('worktree', { key: 'task_0000c0de', cwd: '/repo' }, undefined);
  await new Promise(r => setTimeout(r, 0));
  // While it starts, c227f4d5e's spawning set (tG) holds it and YW hides it from the visible queue.
  assert.deepEqual([...G.spawningTaskIds(parent)], ['task_0000c0de']);
  assert.deepEqual(snapshot.readVisibleQueue(), []);
  assert.equal(starts[0].useWorktree, true);
  assert.equal(starts[0].permissionMode, 'default');
  release({ sessionId: 'local_child' });
  await started;
  assert.equal(G.spawningTaskIds(parent).size, 0);
  // Outcomes go through MQ / NQ into EQ, the store the rows read (PQ).
  G.recordProposalOutcome(parent, 'task_0000c0de', 'dismissed');
  assert.deepEqual(G.proposalOutcomeStore.getState().byParent[parent], { task_0000c0de: 'dismissed' });
  G.clearProposalOutcome(parent, 'task_0000c0de');
  assert.deepEqual(G.proposalOutcomeStore.getState().byParent[parent], {});
  // w1e: the "Do it here" message the spawner sends into this session.
  assert.match(G.proposalHereText(intl, queue[0]), /Fix the flaky test/);
  // The labels P1e gives the local parent's menu.
  assert.deepEqual(G.proposalStartLabels(intl, undefined, false), { startLocally: 'Start locally', startWithWorktree: 'Start with worktree', sendToCloud: 'Send to cloud', fixHere: 'Do it here' });
  // g1e: on for a local session once the presets flag is on (D10) and the bridge can pop by id.
  assert.equal(G.inlineSpawnerGate(true, { type: 'local', id: parent }), true);
  assert.equal(G.inlineSpawnerGate(false, { type: 'local', id: parent }), false);
  assert.equal(G.inlineSpawnerGate(true, { type: 'remote', id: parent }), false);
  // zG / AI: the start keeps the session's mode unless Options picked one; bypass and auto ask for consent.
  assert.equal(G.resolveStartPermissionMode({}, 'acceptEdits'), 'acceptEdits');
  assert.equal(G.resolveStartPermissionMode({ overrides: { permissionMode: 'plan' } }, 'acceptEdits'), 'plan');
  assert.equal(G.startModeNeedsConsent('bypassPermissions'), true);
  assert.equal(G.startModeNeedsConsent('auto'), true);
  assert.equal(G.startModeNeedsConsent('plan'), false);
});

test('adapters: the host answers for the GrowthBook gates, cloud, telemetry and the sent-here storage', () => {
  assert.equal(A.useGrowthBookFlag('ccr_plan_mode_enabled'), false);
  assert.equal(A.useOfferCloudStart(), false);
  assert.equal(A.isDesktopClient(), true);
  assert.equal(A.appPreferences, undefined);
  assert.deepEqual(A.useDesktopConfig(), { permission_modes: { available: undefined }, errors: { reason_vocab: undefined } });
  assert.equal(A.getDesktopConfig(), A.useDesktopConfig());
  assert.deepEqual(A.errorCopy(), { title: undefined, isKnownCategory: false });
  assert.equal(A.useSessionHref()('local_x'), null);
  assert.deepEqual(Object.keys(A.routePreloadProps(null)), ['onPointerEnter', 'onPointerLeave', 'onPointerDown', 'onFocus', 'onBlur']);
  assert.equal(typeof A.desktopBridge.popBackgroundTaskSuggestionById, 'function');
  // The official five effort labels as shipped; other kernel levels read as the host's composer names them.
  assert.deepEqual(A.effortMessages.xhigh, { defaultMessage: 'Extra high', id: 'kDEj60CmLq' });
  assert.deepEqual(A.effortMessages.minimal, { id: 'host-effort.minimal', defaultMessage: 'Minimal' });
  assert.equal(A.effortMessages.off.defaultMessage, 'Thinking off');
  assert.deepEqual(A.supportedEffortOptions([{ id: 'minimal' }, { id: 'xhigh' }]), [{ id: 'minimal' }, { id: 'xhigh' }]);
  A.sentHereStorage.setItem('k', '{"a":1}');
  assert.equal(A.sentHereStorage.getItem('k'), '{"a":1}');
  A.sentHereStorage.removeItem('k');
  assert.equal(A.sentHereStorage.getItem('k'), null);
});
