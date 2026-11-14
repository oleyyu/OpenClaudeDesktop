import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommandFile, serializeCommandFile, expandCommand, mergeCommands, commandSummary, validateCommandName } from '../src/custom-commands-model.mjs';
import { createCustomCommandsStore } from '../src/custom-commands-store.mjs';
import { matchCommands, parseSessionCommand, slashSkills, slashCustomCommands, commandArgumentHint } from '../src/session-command-model.mjs';
import { normalizeCustomCommands, validateCustomCommands, CUSTOM_COMMANDS_DEFAULT } from '../electron/prefs/custom-commands.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
import { composerDocument, commandTransaction } from '../src/composer-editor-model.mjs';
import { EditorState } from 'prosemirror-state';

test('parseCommandFile reads frontmatter, tolerates a malformed one and plain files', () => {
  assert.deepEqual(parseCommandFile('---\ndescription: Review a PR\nargument-hint: [number]\n---\n\nReview PR $ARGUMENTS.\n'),
    { description: 'Review a PR', argumentHint: '[number]', body: 'Review PR $ARGUMENTS.' });
  // An unquoted ': ' is invalid YAML; the loose reader still finds the keys.
  assert.deepEqual(parseCommandFile('---\ndescription: Fix: the bug\nargument-hint: "[file]"\n---\nFix {{args}}'),
    { description: 'Fix: the bug', argumentHint: '[file]', body: 'Fix {{args}}' });
  assert.deepEqual(parseCommandFile('Just a prompt\r\nline two'), { description: '', argumentHint: '', body: 'Just a prompt\nline two' });
  assert.deepEqual(parseCommandFile('---\n---\nBody'), { description: '', argumentHint: '', body: 'Body' });
  assert.equal(parseCommandFile('---\ndescription: [a, b]\n---\nx').description, '');
  assert.equal(commandSummary(parseCommandFile('# Summarize the file\n\nmore')), 'Summarize the file');
});

test('serializeCommandFile round-trips and quotes values with : or #', () => {
  const text = serializeCommandFile({ description: 'Deploy: staging #1', argumentHint: '[env]', body: 'Deploy $ARGUMENTS\n\n' });
  assert.equal(text, '---\ndescription: "Deploy: staging #1"\nargument-hint: "[env]"\n---\n\nDeploy $ARGUMENTS\n');
  assert.deepEqual(parseCommandFile(text), { description: 'Deploy: staging #1', argumentHint: '[env]', body: 'Deploy $ARGUMENTS' });
  assert.equal(serializeCommandFile({ body: 'Plain' }), 'Plain\n');
});

test('expandCommand replaces every placeholder or appends the arguments', () => {
  assert.equal(expandCommand('A $ARGUMENTS and {{args}} and {{ args }}', 'x y'), 'A x y and x y and x y');
  assert.equal(expandCommand('No placeholder', 'extra'), 'No placeholder\n\nextra');
  assert.equal(expandCommand('No placeholder', '  '), 'No placeholder');
  assert.equal(expandCommand('Cost $ARGUMENTS', '$& $1'), 'Cost $& $1');
  assert.equal(expandCommand('Only $ARGUMENTS', ''), 'Only ');
});

test('validateCommandName', () => {
  assert.equal(validateCommandName('review-pr_2'), '');
  assert.match(validateCommandName(''), /Enter/);
  assert.match(validateCommandName('-x'), /letters/);
  assert.match(validateCommandName('a/b'), /letters/);
  assert.match(validateCommandName('x'.repeat(65)), /letters/);
});

const file = (name, text, dir = '/g') => ({ name, path: `${dir}/${name}.md`, text, mtimeMs: 1 });
test('mergeCommands precedence: built-in > project > global > skills', () => {
  const rows = mergeCommands({
    global: { files: [file('deploy', 'global deploy'), file('review', 'mine'), file('notes', '---\ndescription: Notes\n---\nN')] },
    project: { files: [file('deploy', '---\ndescription: Project deploy\nargument-hint: [env]\n---\nDeploy $ARGUMENTS', '/p'), file('pdf', 'p', '/p')] },
    builtinIds: ['review', 'compact'], skillNames: ['pdf'],
  });
  const by = (scope, name) => rows.find(row => row.scope === scope && row.name === name);
  assert.equal(by('project', 'deploy').shadowedBy, undefined);
  assert.equal(by('project', 'deploy').description, 'Project deploy');
  assert.equal(by('global', 'deploy').shadowedBy, 'project');
  assert.equal(by('global', 'review').shadowedBy, 'built-in');
  assert.equal(by('project', 'pdf').hidesSkill, true);
  assert.equal(by('global', 'notes').description, 'Notes');
  assert.deepEqual(slashCustomCommands(rows).map(row => row.name), ['deploy', 'pdf', 'notes']);
});

test('session commands: custom rows, parse, hints and skill hiding', () => {
  const customCommands = mergeCommands({ project: [file('deploy', '---\ndescription: Ship it\nargument-hint: [env]\n---\nDeploy to $ARGUMENTS', '/p')],
    global: [file('pdf', 'my pdf'), file('compact', 'shadowed')], builtinIds: ['compact'] });
  const context = { customCommands, skills: [{ name: 'pdf', path: '/s/pdf' }, { name: 'docx', path: '/s/docx' }] };
  const all = matchCommands('', context), firstCustom = all.findIndex(row => row.kind === 'custom');
  assert.ok(firstCustom > 0 && all.slice(0, firstCustom).every(row => !row.kind));
  assert.deepEqual(all.filter(row => row.kind === 'custom').map(row => [row.id, row.scope]), [['deploy', 'project'], ['pdf', 'global']]);
  assert.deepEqual(all.filter(row => row.kind === 'skill').map(row => row.id), ['docx']);
  assert.deepEqual(matchCommands('dep', context).map(row => row.id), ['deploy']);
  assert.deepEqual(matchCommands('deploy prod', context), []);
  assert.deepEqual(slashSkills(context.skills, customCommands).map(skill => skill.name), ['docx']);
  const parsed = parseSessionCommand('/Deploy prod', context);
  assert.equal(parsed.custom.name, 'deploy'); assert.equal(parsed.args, 'prod'); assert.equal(parsed.error, null); assert.equal(parsed.skill, null);
  assert.equal(expandCommand(parsed.custom.body, parsed.args), 'Deploy to prod');
  assert.equal(parseSessionCommand('/compact', context).command.id, 'compact');
  assert.equal(parseSessionCommand('/pdf x', context).custom.name, 'pdf');
  assert.equal(parseSessionCommand('/docx', context).skill.name, 'docx');
  assert.equal(commandArgumentHint('/deploy ', context), '[env]');
  assert.equal(parseSessionCommand('/deploy', {}).error, '/deploy isn’t a command here.');
});

test('composer chips keep kind custom', () => {
  const doc = composerDocument('/deploy prod', { chips: [{ id: 'deploy', kind: 'custom', argumentHint: '[env]' }] });
  assert.equal(doc.firstChild.firstChild.attrs.kind, 'custom');
  const state = EditorState.create({ doc: composerDocument('') });
  assert.equal(commandTransaction(state, { id: 'deploy', kind: 'custom' }).doc.firstChild.firstChild.attrs.kind, 'custom');
});

test('customCommands preference', () => {
  assert.deepEqual(normalizeCustomCommands(undefined), CUSTOM_COMMANDS_DEFAULT);
  assert.deepEqual(normalizeCustomCommands({ globalDir: 'relative', projectEnabled: false }), { globalDir: '', projectEnabled: false });
  assert.deepEqual(validateCustomCommands({ globalDir: '/x/cmds' }), { globalDir: '/x/cmds', projectEnabled: true });
  assert.equal(validateCustomCommands(null), null);
  assert.throws(() => validateCustomCommands({ globalDir: 'x' }), /absolute/);
  assert.throws(() => validateCustomCommands({ projectEnabled: 'yes' }), /Invalid/);
  assert.deepEqual(settingsPatch({}, { customCommands: { globalDir: '', projectEnabled: false } }).customCommands, { globalDir: '', projectEnabled: false });
  assert.equal('customCommands' in settingsPatch({ customCommands: { globalDir: '/a', projectEnabled: true } }, { customCommands: null }), false);
});

test('store loads per cwd and reloads on change events', async () => {
  const calls = [], handlers = [];
  const store = createCustomCommandsStore({
    call: async (action, params) => { calls.push([action, params]); return { global: { dir: '/g', exists: true, files: [file('a', 'A')] }, project: params.cwd ? { dir: `${params.cwd}/.code-desktop/commands`, exists: false, files: [] } : null }; },
    onEvent: handler => { handlers.push(handler); return () => handlers.splice(handlers.indexOf(handler), 1); },
  });
  let notified = 0;
  const unsubscribe = store.subscribe(() => notified++);
  await store.load('/w');
  await store.load('/w');
  assert.equal(calls.length, 1);
  assert.equal(store.entry('/w').status, 'ready');
  assert.equal(store.entry('/w').global.files[0].name, 'a');
  handlers[0]({ kind: 'custom-commands-changed', scope: 'project', cwd: '/other' });
  assert.equal(calls.length, 1);
  handlers[0]({ kind: 'custom-commands-changed', scope: 'project', cwd: '/w' });
  handlers[0]({ kind: 'custom-commands-changed', scope: 'global', cwd: null });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(calls.length >= 2);
  assert.ok(notified >= 2);
  unsubscribe();
  assert.equal(handlers.length, 0);
});
