import test from 'node:test';
import assert from 'node:assert/strict';
import { pluginDetailTabs, pluginDetailView } from '../src/plugin-detail-model.mjs';

test('plugin contents use reported data only, sort skills and preserve hook order', () => {
  const detail = { skills: [{ name: 'zeta' }, { name: 'Alpha', enabled: false }], hooks: [{ key: 'z', eventName: 'PreToolUse' }, { key: 'a', eventName: 'Stop' }], mcpServers: ['z-server', 'A-server'] };
  const tabs = pluginDetailTabs(detail, 'plugin');
  assert.deepEqual(tabs.map(tab => tab.id), ['skills', 'connectors', 'hooks']);
  assert.deepEqual(tabs[0].items.map(item => item.label), ['/Alpha', '/zeta']);
  assert.equal(tabs[0].items[0].disabled, true);
  assert.deepEqual(tabs[1].items.map(item => item.name), ['A-server', 'z-server']);
  assert.deepEqual(tabs[2].items.map(item => [item.label, item.description]), [['PreToolUse', 'z'], ['Stop', 'a']]);
  assert.deepEqual(detail.skills.map(skill => skill.name), ['zeta', 'Alpha'], 'do not mutate protocol data');
  assert.deepEqual(pluginDetailTabs(null, 'plugin'), []);
  assert.deepEqual(pluginDetailTabs({ skills: [], agents: ['untrusted'], mcpServers: [null, ''], hooks: [null, {}] }, 'plugin'), []);
});

test('only unambiguous skills/list paths in the owning plugin are actionable', () => {
  const known = [{ pluginId: 'p', skillName: 'audit', path: '/a/SKILL.md' }, { pluginId: 'q', skillName: 'other', path: '/q/SKILL.md' }];
  const resolve = skill => pluginDetailTabs({ skills: [skill] }, 'p', known)[0].items[0].path;
  assert.equal(resolve({ name: 'audit' }), '/a/SKILL.md');
  assert.equal(resolve({ name: 'other', path: '/q/SKILL.md' }), null);
  assert.equal(resolve({ name: 'audit', path: '/missing/SKILL.md' }), null, 'no name fallback when a conflicting path is reported');
  known.push({ pluginId: 'p', skillName: 'audit', path: '/b/SKILL.md' });
  assert.equal(resolve({ name: 'audit' }), null, 'ambiguous paths cannot open an arbitrary file');
  assert.equal(resolve({ name: 'audit', path: '/b/SKILL.md' }), '/b/SKILL.md');
});

test('search starts above five items, uses description, and removed tabs fall back to first real tab', () => {
  const skills = Array.from({ length: 6 }, (_, i) => ({ name: `skill${i}`, description: i === 4 ? 'Audit changes' : '' }));
  const tabs = pluginDetailTabs({ skills }, 'p');
  const search = pluginDetailView(tabs, 'skills', ' AUDIT ');
  assert.equal(search.searchable, true); assert.deepEqual(search.items.map(item => item.name), ['skill4']);
  assert.equal(pluginDetailView(tabs, 'hooks', 'skill1').tab.id, 'skills');
  assert.equal(pluginDetailView(tabs, 'skills', 'missing').items.length, 0);
  const small = pluginDetailTabs({ skills: skills.slice(0, 5) }, 'p');
  assert.equal(pluginDetailView(small, 'skills', 'missing').searchable, false);
  assert.equal(pluginDetailView(small, 'skills', 'missing').items.length, 5, 'a hidden search cannot suppress rows');
  assert.deepEqual(pluginDetailView([], 'hooks', 'text'), { tab: null, searchable: false, items: [] });
});

test('R04 tab copy follows customizeCore (Claude → DeepSeek) and connector items resolve the Customize mcp rows', () => {
  const detail = { skills: [{ name: 's' }], mcpServers: ['fx-off', 'fx-on', 'fx-unknown'], hooks: [{ key: 'h', eventName: 'Stop' }] };
  const tabs = pluginDetailTabs(detail, 'p', [], { mcpRows: [{ name: 'fx-on', title: 'Fixture On', kind: 'connected' }, { name: 'fx-off', title: 'fx-off', kind: 'unreachable' }] });
  assert.doesNotMatch(JSON.stringify(tabs), /Claude/);
  assert.deepEqual(tabs.map(tab => tab.description), [
    'Invoke by typing / in chat, or let Codex use them automatically for relevant tasks.',
    'Tools and data sources this plugin connects to. Connect each one so Codex can use it.',
    'Commands this plugin runs automatically — on session events, or when its skills are used.',
  ]);
  assert.deepEqual(tabs[1].items.map(item => [item.connectorName, item.label, item.description, item.connected]), [
    ['fx-off', 'fx-off', 'Server not responding', false],
    ['fx-on', 'Fixture On', 'Connected', true],
    ['fx-unknown', 'fx-unknown', '', false],
  ]);
  // A search matches the resolved title.
  assert.deepEqual(pluginDetailView([{ ...tabs[1], items: [...tabs[1].items, ...tabs[1].items.map(item => ({ ...item, key: `${item.key}-2` }))] }], 'connectors', 'fixture on').items.map(item => item.connectorName), ['fx-on', 'fx-on']);
  // Explicit descriptions win (customizeCore copy passed by PluginDetail).
  assert.equal(pluginDetailTabs({ skills: [{ name: 's' }] }, 'p', [], { descriptions: { skills: 'X' } })[0].description, 'X');
});

test('B24 c24c8737b / c99ed1520: Commands (skills of type command), Monitors and Agents tabs when plugin/read reports them', () => {
  const detail = {
    skills: [{ name: 'review' }, { name: 'ship', type: 'command', description: 'Ship it' }],
    commands: [{ name: 'deploy' }, { nope: true }],
    agents: [{ name: 'tester', model: 'sonnet' }, { name: 'Auditor', description: 'Audits code' }, 'untrusted'],
    monitors: [{ command: 'tail -f log', when: 'on-skill-invoke:review', description: 'Logs' }, { name: 'watch', when: 'always' }, null],
  };
  const tabs = pluginDetailTabs(detail, 'p');
  assert.deepEqual(tabs.map(tab => tab.id), ['skills', 'commands', 'monitors', 'agents'], 'source tab order');
  assert.deepEqual(tabs[0].items.map(item => item.label), ['/review'], 'a command is not a skill');
  assert.deepEqual(tabs[1].items.map(item => [item.label, item.path]), [['/deploy', null], ['/ship', null]]);
  assert.deepEqual(tabs[2].items.map(item => [item.label, item.description, item.command]), [
    ['Monitor 1', 'When the review skill is first invoked (Logs)', 'tail -f log'],
    ['watch', 'Every session, from session start', ''],
  ], 'monitors keep their order; an unnamed one is numbered');
  assert.deepEqual(tabs[3].items.map(item => [item.label, item.description]), [['Auditor', 'Audits code'], ['tester', 'Model: sonnet']]);
  assert.equal(tabs[3].description, 'Specialized AI assistants that can be invoked to handle specific types of tasks.');
  assert.equal(tabs[2].description, 'Background commands that run automatically during your session.');
  assert.equal(pluginDetailView(tabs, 'agents').tab.id, 'agents');
});
