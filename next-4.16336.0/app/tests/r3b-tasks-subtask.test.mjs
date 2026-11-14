// R3b-tasks step 2, tasks-05 (2.42304.0): /subtask <task> — a fork that gets the task in the background, the success
// toast, and the hand-backs when the fork or the send fails (r3b-tasks-subtask.mjs over the host fork), the command row
// and its parse (session-command-model.mjs), the generated originals (scripts/extract-r3b-tasks.mjs) and the main.jsx
// wiring. Injected stubs only: nothing forks, sends or names a real session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { parseSessionCommand, matchCommands, sessionCommands, commandUnavailable, commandArgumentHint } from '../src/session-command-model.mjs';
import { runSubtask, subtaskRefusal, SUBTASK_MESSAGES } from '../src/r3b-tasks-subtask.mjs';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { subtaskTitle } from '../src/generated/r3b-tasks/subtask-title.mjs';
import { startsWithCommand, stripLeadingInvisible, startsWithCommandAfterInvisible, stripLeadingHidden } from '../src/generated/r3b-tasks/command-prefix.mjs';
import { isInvisibleCharacter, isHiddenCharacter } from '../src/generated/r3b-tasks/invisible-character.mjs';
import { extractR3bTasks, modules as contract, callSites as contractCallSites } from '../scripts/extract-r3b-tasks.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const official = name => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
// The generated helpers (scripts/extract-r3b-tasks.mjs) moved to 3.6556.2 in w1-routines-a (RC-21) and to 4.16336.0 in
// region batch 2a (production directly: no generated area links them); the host /subtask port itself still mirrors the
// 2.42304.0 send handler checked by 'tasks-05 official'.
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official3 = name => fs.readFileSync(path.join(v3, name), 'utf8');
const v4 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const official4 = name => fs.readFileSync(path.join(v4, name), 'utf8');
const sha = text => createHash('sha256').update(text).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;
const u = text => text.replaceAll('’', '\\u2019'); // the minified chunks spell ’ as ’

test('tasks-05 official: the /subtask row, its gate, the send handler refusals and the background fork', () => {
  const commands = official('cc183b3ab-BlACljsv.js');
  for (const text of ['{name:"subtask",description:E.subtask,argumentHint:"<task>",neverReachesCli:!0,enableGate:"subtaskCommand",gate:e=>O(e)&&e.canForkSession&&e.subtaskCommand}',
    'subtask:{defaultMessage:"Fork this session to work on a task while you stay here",id:"5B10ybRftQ"}',
    'function O(e){return e.hostInterceptSurface&&e.isLocalSession}'])
    assert.equal(count(commands, text), 1, text);
  const session = official('cc43287c9-DAfOi8yP.js');
  for (const text of ['t.match(/^\\/subtask(?:\\s+(.*))?$/is)', 'defaultMessage:"Add a task after /subtask, then send it again.",id:"MbpoOYe8Db"',
    u('defaultMessage:"Subtasks aren’t available for this session.",id:"Enaro/mK/n"'),
    'defaultMessage:"A fork of this session is still starting. Send this again in a moment.",id:"2veOTDyV4r"',
    u('defaultMessage:"A subtask can’t start with a command, so nothing was sent. Describe the task in words.",id:"vYLcZuUvrF"'),
    u('defaultMessage:"A subtask takes text only, so nothing was sent. Remove what’s attached and any session mentions, or use /fork.",id:"fIPp4d6ViY"'),
    u('defaultMessage:"The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box.",id:"YlU3KKWvMl"'),
    'if(s&&c&&$j(c))', 'import{t as $j}from"./c8f38bf1f-D_EZalnr.js"', 'Ui=v_()'])
    assert.equal(count(session, text), 1, text);
  const fork = official('caec4a2d4-Cky7Rmpu.js');
  for (const text of ['defaultMessage:"Started the subtask in a new session.",id:"CAp88u+zH7"', 'if(!a.sendInBackground&&(t.current||r))',
    'import{g as Ot,l as kt}from"./cef1e6037-8DivyY4m.js"', 'taskSent:kt(n,l).then(', 'Mt(r,"subtask_send_error")'])
    assert.equal(count(fork, text), 1, text);
  // subtaskCommand = shared-11 Mu: appFeatures.sideSessions supported, which the main process answers from GrowthBook
  // 2371478310 (statically "unavailable" in its other branch); the slash menu badges the row "Ant only" for an
  // Anthropic account (shared-52 Lm).
  assert.equal(count(official('shared-11-BuQ3CK5I.js'), 'Ou=e=>e.appFeatures?.sideSessions?.status==="supported"'), 1);
  assert.equal(count(official('c5cd1b4dc-jDcYG_fG.js'), 'badge:Ut&&(e.name==="send-to-project"||e.name==="subtask")?W.formatMessage({defaultMessage:"Ant only",id:"7QT7WO8Wtz"}):void 0'), 1);
  const main = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  for (const text of ['bW((()=>_W("sideSessions",(()=>hy("2371478310")))))', 'sideSessions:{status:"unavailable"}', 'sideSessions:a,'])
    assert.equal(count(main, text), 1, text);
});

test('tasks-05 3.6556.2 call sites (history): the send handler and the fork used the then-generated helpers', () => {
  // cc43287c9 imports c8f38bf1f's `t` (startsWithCommand) and refuses a command-led task with it; caec4a2d4 imports
  // cef1e6037's `_` (subtaskTitle, Bn) and titles the background fork with it.
  const session = official3('cc43287c9-Me-M2ucD.js');
  for (const text of ['import{t as oN}from"./c8f38bf1f-Ba2QaQov.js"', 'if(s&&c&&oN(c))',
    u('defaultMessage:"A subtask can’t start with a command, so nothing was sent. Describe the task in words.",id:"vYLcZuUvrF"')])
    assert.equal(count(session, text), 1, text);
  const fork = official3('caec4a2d4-6hekX2da.js');
  for (const text of ['import{_ as qt,u as Jt}from"./cef1e6037-C9OZ_iaL.js"', 'let o=qt(e.sendInBackground?.text)',
    'defaultMessage:"Started the subtask in a new session.",id:"CAp88u+zH7"'])
    assert.equal(count(fork, text), 1, text);
  assert.equal(count(official3('cef1e6037-C9OZ_iaL.js'), 'Bn as _'), 1);
  assert.equal(count(official3('c8f38bf1f-Ba2QaQov.js'), 'export{r as n,i as t}'), 1);
});

test('tasks-05 4.16336.0 call sites: the /subtask refusal calls c8f38bf1f l (`n`), the background fork titles with cef1e6037 yr (`v`)', () => {
  const session = official4('cc43287c9-dzfX-J5i.js');
  for (const text of ['import{i as ZC,n as QC}from"./c8f38bf1f-B4N4qS0l.js"', 'if(s&&c&&QC(c))',
    u('defaultMessage:"A subtask can’t start with a command, so nothing was sent. Describe the task in words.",id:"vYLcZuUvrF"'),
    'defaultMessage:"Add a task after /subtask, then send it again.",id:"MbpoOYe8Db"',
    'defaultMessage:"A fork of this session is still starting. Send this again in a moment.",id:"2veOTDyV4r"'])
    assert.equal(count(session, text), 1, text);
  const fork = official4('caec4a2d4-BQDPvHyW.js');
  for (const text of ['import{u as ln,v as un}from"./cef1e6037-Dm5Rlsox.js"', 'let o=un(e.sendInBackground?.text)',
    'defaultMessage:"Started the subtask in a new session.",id:"CAp88u+zH7"'])
    assert.equal(count(fork, text), 1, text);
  assert.equal(count(official4('cef1e6037-Dm5Rlsox.js'), 'yr as v'), 1);
  assert.equal(count(official4('c8f38bf1f-B4N4qS0l.js'), 'export{c as i,l as n,o as r,s as t};'), 1);
  // The generator found the same calls by AST (manifest callSites), with the caller bytes pinned.
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.callSites.map(site => [site.caller, site.from, site.alias, site.root, site.call]), [
    ['cc43287c9-dzfX-J5i.js', 'c8f38bf1f-B4N4qS0l.js', 'n', 'l', 'QC(c)'],
    ['caec4a2d4-BQDPvHyW.js', 'cef1e6037-Dm5Rlsox.js', 'v', 'yr', 'un(e.sendInBackground?.text)']]);
  for (const site of manifest.callSites) assert.equal(site.callerSha256, sha(official4(site.caller)), site.caller);
});

test('tasks-05 generated: yr (the fork\'s provisional title) and c8f38bf1f l (starts with a command) are the 4.16336.0 originals', async () => {
  await extractR3bTasks({ check: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.modules.map(entry => [entry.target, entry.source]), [
    ['lazy-value.mjs', 'shared-0-CnnWnVrT.js'], ['invisible-character.mjs', 'shared-212-BHMAi0oa.js'],
    ['mention-prefix.mjs', 'shared-5-u8kha2eH.js'], ['path-basename.mjs', 'shared-92-BOgyxePb.js'],
    ['command-prefix.mjs', 'c8f38bf1f-B4N4qS0l.js'], ['subtask-title.mjs', 'cef1e6037-Dm5Rlsox.js']]);
  assert.deepEqual(manifest.modules.map(entry => entry.exports), [{ Tl: 'lazyValue' }, { M_: 'isInvisibleCharacter', kv: 'isHiddenCharacter' },
    { ID: 'quotedMentionPrefix' }, { mk: 'pathBasename' },
    { o: 'stripLeadingInvisible', s: 'startsWithCommandAfterInvisible', c: 'stripLeadingHidden', l: 'startsWithCommand' }, { yr: 'subtaskTitle' }]);
  assert.deepEqual(manifest.modules.map(entry => entry.bindings.map(b => b.name)), [['Tl'], ['j_', 'M_', 'yv', 'Cv', 'Dv', 'kv'], ['ID'], ['mk'],
    ['r', 'i', 'a', 'o', 's', 'c', 'l'], ['yr']]);
  // Every binding is the official declaration, byte for byte; every module matches its recorded hash; only generated
  // imports (routines-shared is 3.6556.2, so shared-0 Tl is cut here again). Since cds-core wave 5 cds-core holds Tl too
  // (pure, without a publicName: shared-62 jF reads it), so lazy-value.mjs records it as held; nothing else is.
  for (const entry of manifest.modules) {
    const chunk = official4(entry.source);
    assert.equal(entry.sourceSha256, sha(chunk), entry.source);
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks', entry.target), 'utf8')), entry.sha256, entry.target);
    const declarations = new Map(parsers.babel.parse(chunk, {}).program.body.flatMap(node => node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.map(d => [d.id.name, d]) : []));
    for (const binding of entry.bindings) {
      const node = declarations.get(binding.name);
      assert.ok(node, `${entry.source} declares ${binding.name}`);
      assert.equal(binding.sha256, sha(chunk.slice(node.start, node.end)), `${entry.target} ${binding.name}`);
    }
    assert.deepEqual(entry.heldByCdsCore, entry.target === 'lazy-value.mjs' ? ['Tl'] : [], entry.target);
    for (const imported of entry.imports) assert.equal(imported.kind, 'generated', `${entry.target} ${imported.local}`);
  }
  for (const entry of manifest.modules) assert.doesNotMatch(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks', entry.target), 'utf8'), /routines-shared|3\.6556\.2/);
  // D1: no other 4.16336.0 graph slices these bindings (one copy). The one exception is the region-plan
  // resliceInsteadOfLink pure function shared-0 Tl (lazyValue, which replaces the routines-shared Pa link): r4e-plugin
  // (url-safety.mjs) re-cuts it under the same plan entry. That copy is allowed only from r4e-plugin, only while cds-core
  // does not publish Tl (then both regions must link it), and only byte for byte the same declaration. cds-core holding
  // it unpublished (wave 5) cannot be linked; its copy must be the same declaration.
  const mine = new Map(manifest.modules.flatMap(entry => entry.bindings.map(b => [`${entry.source}#${b.name}`, b.sha256])));
  // cds-core wave 5: cds-core itself holds Tl (pure, unpublished: it cannot be linked) and routines-shared-v4, whose link to
  // lazy-value.mjs the generator now refuses ("cds-core holds it; link cds-core"), cuts it as cds-core's declaration.
  // round5 integration (real-b): settings-desktop-v4 / settings-account-v4 (settings lane, 4.16 c71860c77 Vs / cf4f70727 pn
  // closures) and transcript-rows-v4 (UserBashRun c19e90103 k_ closure) reach shared-0 Tl too; cds-core still holds it
  // unpublished, so by the rule above they cannot link it and cut the same declaration (byte-identity is asserted below).
  // When cds-core publishes Tl (addendum queue), every area here must link it instead and this set shrinks back.
  // was: new Set(['r4e-plugin', 'cds-core', 'routines-shared-v4'])
  const resliceAllowed = new Map([['shared-0-CnnWnVrT.js#Tl', new Set(['r4e-plugin', 'cds-core', 'routines-shared-v4', 'settings-desktop-v4', 'settings-account-v4', 'transcript-rows-v4'])]]);
  const cdsCore = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  for (const key of resliceAllowed.keys()) {
    const [file, local] = key.split('#');
    assert.ok(mine.has(key), `${key} is one of the r3b-tasks bindings`);
    assert.equal(Object.values(cdsCore.publicNames).some(entry => entry.file === file && entry.local === local), false, `cds-core publishes ${key}: link it`);
    const held = cdsCore.modules.find(entry => path.basename(entry.source ?? '') === file)?.bindings.find(b => b.name === local);
    if (held) assert.equal(held.sha256, mine.get(key), `cds-core holds ${key} as the same declaration`);
  }
  // Every violation is collected first and asserted once, so an old re-cut cannot hide a new one (cds-integrate wave5b fix).
  const violations = [];
  const generated = path.join(app, 'src/generated');
  for (const area of fs.readdirSync(generated, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'r3b-tasks').map(d => d.name)) {
    const file = path.join(generated, area, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    let other; try { other = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    if (!Array.isArray(other.modules)) continue;
    for (const entry of other.modules) {
      if ((entry.referenceVersion ?? other.referenceVersion) !== '4.16336.0' || typeof entry.source !== 'string') continue;
      for (const b of entry.bindings ?? []) {
        const key = `${path.basename(entry.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!mine.has(key)) continue;
        if (!resliceAllowed.get(key)?.has(area)) violations.push(`${area}/${entry.target} ${key}`);
        if ((typeof b === 'string' ? undefined : b.sha256) !== mine.get(key)) violations.push(`${area}/${entry.target} ${key} is not the same declaration`);
      }
    }
  }
  assert.deepEqual(violations, [], 'other 4.16336.0 graphs re-cut r3b-tasks bindings');

  // Behaviour of the originals (4.16336.0).
  assert.equal(subtaskTitle('  Fix the flaky login test in the auth service  '), 'Fix the flaky login test in');
  assert.equal(subtaskTitle('Investigate\nwhy   it\tfails'), 'Investigate why it fails');
  const long = 'Supercalifragilisticexpialidocious-and-then-some-more-words-in-one-token here';
  assert.equal(subtaskTitle(long), `${Array.from(long.split(' ')[0] + ' here').slice(0, 59).join('')}…`);
  assert.equal(subtaskTitle('   '), undefined);
  assert.equal(subtaskTitle(undefined), undefined);
  // New in 4.16336.0: leading @"<path>" mentions are dropped from the words, and name the title when nothing else is left.
  assert.equal(subtaskTitle('@"src/app/main.jsx" Fix the crash'), 'Fix the crash');
  assert.equal(subtaskTitle('@"src/app/main.jsx" @"C:\\work\\notes.md"'), 'main.jsx, notes.md');
  for (const text of ['/review the diff', '!ls', '\u200b/compact', '\ufeff !rm', '\ue000/compact', '\u2800!ls']) assert.equal(startsWithCommand(text), true, JSON.stringify(text));
  for (const text of ['Fix /etc/hosts', 'a/b', '', 'Review it']) assert.equal(startsWithCommand(text), false, JSON.stringify(text));
  // The /subtask check (l) also skips hidden characters (private use, U+2800 …); s, the 3.6556.2 shape, does not.
  assert.equal(startsWithCommandAfterInvisible('\ue000/compact'), false);
  assert.equal(startsWithCommandAfterInvisible('\u200b/compact'), true);
  assert.equal(stripLeadingInvisible('\u200b\u2060  task'), 'task');
  assert.equal(stripLeadingHidden('\u2800\ue000 task'), 'task');
  assert.equal(stripLeadingInvisible('\u2800task'), '\u2800task');
  // 4.16336.0 M_ no longer counts \n \r \t as invisible (the 3.6556.2 expression did, through \p{Cc}).
  for (const char of ['\n', '\r', '\t']) assert.equal(isInvisibleCharacter(char), false, JSON.stringify(char));
  for (const char of ['\u200b', '\u0000', '\ufff9']) assert.equal(isInvisibleCharacter(char), true, JSON.stringify(char));
  for (const char of ['\ue000', '\u2800', '\ufffc', '\u{1D159}', '\u{13430}']) assert.equal(isHiddenCharacter(char), true, JSON.stringify(char));
  assert.equal(isHiddenCharacter('a'), false);
});

test('tasks-05 generator fails closed: an ambiguous root, a re-pointed call site or a moved export stops generation', async () => {
  const replace = (target, change) => contract.map(spec => (spec.target === target ? change(spec) : spec));
  // s and l share `return/^[/!]/.test(x(e))`; without the `reads` feature neither is unique.
  const ambiguous = replace('command-prefix.mjs', spec => ({ ...spec, features: { ...spec.features, l: ['/^[/!]/.test(', { loose: 'return/^[/!]/.test(c(e))' }] } }));
  await assert.rejects(extractR3bTasks({ check: true, modules: ambiguous }), /root l is not the unique declaration of c8f38bf1f-B4N4qS0l\.js with its features \((s, l|l, s)\)/);
  // The /subtask refusal calls l (`n`), not s (`t`, the 3.6556.2 shape).
  const repointed = contractCallSites.map(site => (site.root === 'l' ? { ...site, root: 's' } : site));
  await assert.rejects(extractR3bTasks({ check: true, callSites: repointed }), /calls c8f38bf1f-B4N4qS0l\.js:n \(l\), not s/);
  const moved = replace('subtask-title.mjs', spec => ({ ...spec, officialExports: { _: 'yr' } }));
  await assert.rejects(extractR3bTasks({ check: true, modules: moved }), /official export _ is .*, not yr/);
  // The old (3.6556.2) title shape is not the 4.16336.0 declaration.
  const oldShape = replace('subtask-title.mjs', spec => ({ ...spec, features: { yr: ['Array.from(t.slice(0,6).join(" "))'] } }));
  await assert.rejects(extractR3bTasks({ check: true, modules: oldShape }), /subtask-title\.mjs: cef1e6037-Dm5Rlsox\.js:yr lacks/);
  // A replaced contract is never written.
  await assert.rejects(extractR3bTasks({ modules: moved }), /only checked, never written/);
});

const ready = { current: 't', connected: true, hasHistory: true };
test('tasks-05 command row: /subtask <task> parses (multi-line too), lists after /fork and keeps the fork gates', () => {
  const ids = sessionCommands.map(command => command.id);
  assert.equal(ids.indexOf('subtask'), ids.indexOf('fork') + 1);
  const row = sessionCommands.find(command => command.id === 'subtask');
  assert.deepEqual({ argumentHint: row.argumentHint, description: row.description, session: row.session, idle: row.idle },
    { argumentHint: '<task>', description: 'Fork this session to work on a task while you stay here', session: true, idle: true });
  assert.deepEqual(parseSessionCommand('/subtask Fix the parser'), { id: 'subtask', args: 'Fix the parser', requested: 'subtask', command: row, suggestion: null, error: null, errorSurface: null });
  // cc43287c9 /is: the task may span lines; other commands still refuse extra lines.
  assert.equal(parseSessionCommand('/subtask Fix the parser\nthen add a test').args, 'Fix the parser\nthen add a test');
  assert.equal(parseSessionCommand('/subtask Fix the parser\nthen add a test').error, null);
  assert.match(parseSessionCommand('/fork a\nb').error, /only works on a single line/);
  assert.equal(parseSessionCommand('/subtask').args, '');
  assert.equal(commandArgumentHint('/subtask '), '<task>');
  const listed = matchCommands('sub', ready);
  assert.equal(listed[0].id, 'subtask');
  assert.equal(listed[0].argumentHint, '<task>');
  assert.equal(commandUnavailable(row, ready), '');
  assert.equal(commandUnavailable(row, { ...ready, hasHistory: false }), 'Send a message first');
  assert.equal(commandUnavailable(row, { ...ready, running: true }), 'Wait for the current task to finish or stop it');
  assert.equal(commandUnavailable(row, { ...ready, unsupportedMethods: ['thread/fork'] }), 'Not available with this core yet');
  assert.equal(commandUnavailable(row, { ...ready, subtaskCommand: false }), 'Subtasks aren’t available for this session.');
  assert.deepEqual(matchCommands('sub', { ...ready, subtaskCommand: false }).filter(command => command.id === 'subtask'), []);
  assert.equal(commandUnavailable(row, {}), 'Open a session first');
});

// Records the order in which runSubtask calls the host.
function host({ forkResult = { thread: { id: 'fork-1', cwd: '/work' } }, forkError = null, sendError = null } = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      clear: () => calls.push(['clear']),
      restore: () => calls.push(['restore']),
      fork: async (options) => { calls.push(['fork', options]); if (forkError) throw forkError; return forkResult; },
      send: async (thread, text) => { calls.push(['send', thread.id, text]); if (sendError) throw sendError; },
      requestTitle: (thread, name, text) => calls.push(['title', thread.id, name, text]),
      prefill: (thread, text) => calls.push(['prefill', thread.id, text]),
      notify: (message, options) => calls.push(['notify', message, options.variant]),
    },
  };
}

test('tasks-05 refusals: empty, a fork still starting, a command, attachments or mentions — a danger toast, nothing sent', async () => {
  assert.equal(subtaskRefusal({ task: '  ' }), 'empty');
  assert.equal(subtaskRefusal({ task: 'Fix it', forkStarting: true }), 'forkStarting');
  assert.equal(subtaskRefusal({ task: ' /review now' }), 'command');
  assert.equal(subtaskRefusal({ task: 'Fix it', attachments: [{ kind: 'image' }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix it', mentions: [{ session: { id: 's2' } }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix it', mentions: [{ path: 'src/a.js' }] }), 'attachments');
  assert.equal(subtaskRefusal({ task: 'Fix @mcp:github', mentions: [{ literal: true }] }), null);
  // The official order: empty before a starting fork, a starting fork before the command check.
  assert.equal(subtaskRefusal({ task: '', forkStarting: true }), 'empty');
  assert.equal(subtaskRefusal({ task: '/x', forkStarting: true, attachments: [{}] }), 'forkStarting');
  for (const [task, extra, reason] of [['', {}, 'empty'], ['/review', {}, 'command'], ['Fix it', { attachments: [{}] }, 'attachments']]) {
    const { calls, deps } = host();
    const result = await runSubtask({ task, ...extra, ...deps });
    assert.deepEqual(result, { status: 'refused', reason });
    assert.deepEqual(calls, [['notify', SUBTASK_MESSAGES[reason], 'danger']], 'the draft stays: no clear, no fork');
  }
});

test('tasks-05 sent: clear, fork (Sn title, no navigation), title request, background send, then "Started the subtask in a new session."', async () => {
  const { calls, deps } = host();
  const result = await runSubtask({ task: '  Add a regression test for the parser crash on empty input  ', attachments: [], mentions: [], ...deps });
  assert.equal(result.status, 'sent');
  assert.equal(result.thread.id, 'fork-1');
  const text = 'Add a regression test for the parser crash on empty input';
  assert.deepEqual(calls, [
    ['clear'],
    ['fork', { name: 'Add a regression test for the' }],
    ['title', 'fork-1', 'Add a regression test for the', text],
    ['send', 'fork-1', text],
    ['notify', 'Started the subtask in a new session.', 'neutral'],
  ]);
  // A fork that kept its default title says so; the subtask still goes out.
  const warned = host({ forkResult: { thread: { id: 'fork-2' }, warning: 'The fork was created, but its title could not be updated.' } });
  await runSubtask({ task: 'Fix it', ...warned.deps, requestTitle: null });
  assert.deepEqual(warned.calls.map(call => call[0] === 'notify' ? [call[1], call[2]] : call[0]), ['clear', 'fork',
    ['The fork was created, but its title could not be updated.', 'warning'], 'send', ['Started the subtask in a new session.', 'neutral']]);
});

test('tasks-05 hand-backs: a failed send waits in the fork\'s message box; a failed fork puts the command back here', async () => {
  const sendFailed = host({ sendError: new Error('Reconnect to DeepSeek first') });
  const result = await runSubtask({ task: 'Fix it', ...sendFailed.deps });
  assert.equal(result.status, 'send-failed');
  assert.deepEqual(sendFailed.calls.slice(-2), [['prefill', 'fork-1', 'Fix it'],
    ['notify', 'The subtask’s session started, but the task wasn’t sent. It’s waiting in that session’s message box.', 'danger']]);
  assert.equal(sendFailed.calls.some(call => call[1] === SUBTASK_MESSAGES.started), false);
  const forkFailed = host({ forkError: new Error('This session is still running. Wait or stop it first.') });
  assert.equal((await runSubtask({ task: 'Fix it', ...forkFailed.deps })).status, 'fork-failed');
  assert.deepEqual(forkFailed.calls, [['clear'], ['fork', { name: 'Fix it' }], ['restore'],
    ['notify', 'This session is still running. Wait or stop it first.', 'danger']]);
  const noThread = host({ forkResult: {} });
  await runSubtask({ task: 'Fix it', ...noThread.deps });
  assert.deepEqual(noThread.calls.slice(-2), [['restore'], ['notify', 'Couldn’t fork this session.', 'danger']]);
});

test('tasks-05 zh-CN: the official strings are translated in the R3b-tasks block', async (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  const { calls, deps } = host();
  await runSubtask({ task: 'Fix it', ...deps });
  assert.deepEqual(calls.at(-1), ['notify', '已在新会话中开始子任务。', 'neutral']);
  const refused = host();
  await runSubtask({ task: '/x', ...refused.deps });
  assert.deepEqual(refused.calls, [['notify', '子任务不能以命令开头，因此未发送任何内容。请用文字描述任务。', 'danger']]);
  const table = fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/session.mjs'), 'utf8');
  const block = table.slice(table.indexOf('// R3b-tasks:'), table.indexOf('// R3b-tasks end.'));
  for (const key of [...Object.values(SUBTASK_MESSAGES).filter(key => key !== SUBTASK_MESSAGES.forkFailed), 'Subtask',
    'Fork this session to work on a task while you stay here', 'Subtasks aren’t available for this session.'])
    assert.ok(block.includes(JSON.stringify(key)), key);
  assert.match(fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/app.mjs'), 'utf8'), /'Couldn’t fork this session\.': '无法分叉此会话。'/);
});

test('tasks-05 wiring: executeCommand runs /subtask through runSubtask on a fork that stays here', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(count(main, 'import { runSubtask } from "./r3b-tasks-subtask.mjs";'), 1);
  // W14-code r3 css3-operation-status-band: performOperation also takes autoSubmit (caec4a2d4 lr's "Forking session with
  // your prompt…" toast for /fork <prompt>); stay is unchanged.
  assert.equal(count(main, 'async function performOperation(operation, extra = {}, { stay = false, autoSubmit = false } = {}) {'), 1);
  assert.equal(count(main, 'if (!stay && sequence === loadSeq.current && expected.connectionId === stopLive.current.connectionId && stopLive.current.connected) {'), 1);
  const branch = main.slice(main.indexOf('else if (id === "subtask") {'), main.indexOf('else if (id === "fork") {'));
  assert.ok(branch.length > 0 && branch.length < 2400, 'the subtask branch sits before the fork branch');
  for (const text of ['await runSubtask({task:args,attachments,mentions,forkStarting:actionLock.current.has(origin),notify:notice,clear:clearCommand,',
    'fork:({name})=>performOperation("fork",{name},{stay:true})',
    'send:async(thread,text)=>{await ensureResumed(thread.id);await rpc("turn/start",{threadId:thread.id,input:[{type:"text",text,text_elements:[]}],...options,cwd:thread.cwd||originCwd});}',
    'requestTitle:coreSupports(boot?.core,"titleRequest")?(thread,name,text)=>{void requestThreadTitle(thread.id,name,text,thread.cwd||originCwd);}:null',
    'prefill:(thread,text)=>putDraft(thread.id,text)', 'restore:()=>{if(sourceDraft!==undefined)putDraft(origin,sourceDraft);}'])
    assert.ok(branch.includes(text), text);
  assert.doesNotMatch(branch, /navigate\(/, 'the subtask never opens the fork');
  // The host fork names the fork with payload.name (session-operations thread/name/set).
  const operations = fs.readFileSync(path.join(app, 'electron/session-operations.cjs'), 'utf8');
  assert.match(operations, /const name = typeof payload\.name === 'string' && payload\.name\.trim\(\) \? payload\.name\.trim\(\)\.slice\(0, 120\)/);
});

test('E81 (overrides D29): main.jsx opens /subtask as the 3.6556.2 desktop forces sideSessions on with no account', () => {
  const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.equal(main.split('    subtaskCommand: true };').length - 1, 1);
  assert.equal(main.split('    subtaskCommand: false };').length - 1, 0);
  // jPKPzV-P: Hon forces 2371478310 on and appFeatures.sideSessions reads it.
  const desktop = fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  for (const text of ['2371478310:{rule:"forced",value:!0}', 'QU("sideSessions",(()=>Pb("2371478310")))'])
    assert.equal(desktop.split(text).length - 1, 1, text);
});
