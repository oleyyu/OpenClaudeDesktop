import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SKILL_FILTER, compareFacts, createdByOptions, filterCount, groupBySection, marketplaceInstalledPlugins, marketplaceLabel,
  marketplaceRemovalDescription, marketplaceUpgradeToast, normalizeSkillFilter, pluginListView, pluginRowFacts, recentReason, recentTooltip,
  sectionLabel, sectionRuns, skillCredit, skillListView, skillOwner, skillPluginOptions, skillSection, skillSortOptions, sortFacts,
} from '../src/customize-list-model.mjs';

const skill = (name, extra = {}) => ({ kind: 'skill', id: `/${name}/SKILL.md`, path: `/${name}/SKILL.md`, name, skillName: name, description: '', scope: 'user', enabled: true, pluginId: null, updatedAt: null, ...extra });
const plugin = (id, extra = {}) => ({ id, pluginName: id, name: id, description: '', author: '', enabled: true, marketplaceName: 'Market', marketplaceId: 'market', skillCount: 0, updatedAt: null, ...extra });

test('c5e558aae hr / Q: owners and sections from the local scope, the plugin, or a load error', () => {
  const plugins = [plugin('core-p', { official: true }), plugin('mine', { sourcePath: '/p/mine' }), plugin('third')];
  assert.deepEqual(skillOwner(skill('a')), { createdBy: 'you', pluginId: null });
  assert.deepEqual(skillOwner(skill('r', { scope: 'repo' })), { createdBy: 'you', pluginId: null });
  assert.deepEqual(skillOwner(skill('s', { scope: 'system' })), { createdBy: 'anthropic', pluginId: null });
  assert.deepEqual(skillOwner(skill('m', { scope: 'admin' })), { createdBy: 'org', pluginId: null });
  assert.deepEqual(skillOwner(skill('o', { pluginId: 'core-p' }), plugins), { createdBy: 'anthropic', pluginId: 'core-p' });
  assert.deepEqual(skillOwner(skill('x', { pluginId: 'third' }), plugins), { createdBy: null, pluginId: 'third' }, 'a marketplace plugin’s author is unknown');
  assert.deepEqual(skillOwner({ kind: 'error' }), { createdBy: null, pluginId: null });
  assert.deepEqual([skill('a'), skill('r', { scope: 'repo' }), skill('m', { scope: 'admin' }), skill('s', { scope: 'system' }), skill('o', { pluginId: 'core-p' }),
    skill('y', { pluginId: 'mine' }), skill('x', { pluginId: 'third' }), { kind: 'error' }].map((row) => skillSection(row, plugins)),
    ['createdByYou', 'project', 'organization', 'anthropic', 'anthropic', 'createdByYou', 'marketplaces', 'attention']);
  assert.equal(sectionLabel('anthropic', { name: 'Codex' }), 'From Codex', 'the core is named where the source says Anthropic');
  assert.equal(sectionLabel('marketplaces'), 'From marketplaces you added');
});

test('c6a2a31c4 Fc / Ic: sections follow Nc order; a held sort is one untitled run', () => {
  const rows = [{ s: 'marketplaces', n: 'b' }, { s: 'attention', n: 'z' }, { s: 'createdByYou', n: 'c' }, { s: 'createdByYou', n: 'a' }];
  const groups = groupBySection(rows, (row) => row.s);
  assert.deepEqual([...groups.keys()], ['attention', 'createdByYou', 'marketplaces']);
  const byName = (a, b) => a.n.localeCompare(b.n);
  assert.deepEqual(sectionRuns(groups, byName, { flat: false }).map((run) => [run.section, run.rows.map((row) => row.n)]),
    [['attention', ['z']], ['createdByYou', ['a', 'c']], ['marketplaces', ['b']]]);
  assert.deepEqual(sectionRuns(groups, byName, { flat: true }).map((run) => [run.section, run.rows.map((row) => row.n)]), [[null, ['a', 'b', 'c', 'z']]]);
  assert.deepEqual(sectionRuns(new Map(), byName, { flat: true }), []);
});

test('c5e558aae yr / br: Last edited is newest first with undated rows last; Plugin name groups plugin skills', () => {
  const facts = [sortFacts(skill('b', { updatedAt: 10 })), sortFacts(skill('a', { updatedAt: null })), sortFacts(skill('c', { updatedAt: 30 })),
    sortFacts(skill('p2', { pluginId: 'q', updatedAt: 30 }), 'Quill'), sortFacts(skill('p1', { pluginId: 'p', updatedAt: null }), 'Pen')];
  const order = (sort) => [...facts].sort((x, y) => compareFacts(sort, x, y)).map((fact) => fact.name);
  assert.deepEqual(order('updated'), ['c', 'p2', 'b', 'a', 'p1'], 'same time: a skill before a plugin skill (kindRank)');
  assert.deepEqual(order('name'), ['a', 'b', 'c', 'p1', 'p2']);
  assert.deepEqual(order('plugin'), ['p1', 'p2', 'a', 'b', 'c'], 'plugin skills first by plugin name, then the rest by name');
  assert.deepEqual(skillSortOptions().map((option) => option.label), ['Last edited', 'Name']);
  assert.deepEqual(skillSortOptions({ plugin: true }).map((option) => option.value), ['updated', 'name', 'plugin']);
});

test('skillListView: search, Created by / Plugin filter, grouped sections, held sort and the reset state', () => {
  const plugins = [plugin('pa', { name: 'Alpha Pack' }), plugin('pb', { name: 'Beta Pack', official: true })];
  const skills = [skill('mine', { updatedAt: 100 }), skill('repo', { scope: 'repo', updatedAt: 300 }), skill('sys', { scope: 'system' }),
    skill('from-a', { pluginId: 'pa', updatedAt: 200 }), skill('from-b', { pluginId: 'pb' })];
  const errors = [{ kind: 'error', id: 'error:/bad/SKILL.md', path: '/bad/SKILL.md', name: 'bad', message: 'invalid front matter' }];
  const view = skillListView({ skills, errors, plugins });
  assert.equal(view.total, 6);
  assert.deepEqual(view.sections.map((run) => [run.section, run.rows.map((row) => row.name)]),
    [['attention', ['bad']], ['project', ['repo']], ['createdByYou', ['mine']], ['anthropic', ['sys', 'from-b']], ['marketplaces', ['from-a']]]);
  assert.deepEqual(view.pluginOptions, [{ id: 'pa', label: 'Alpha Pack' }, { id: 'pb', label: 'Beta Pack' }]);
  assert.equal(view.resettable, false);
  const you = skillListView({ skills, errors, plugins, filter: { plugin: null, createdBy: 'you' } });
  assert.deepEqual(you.sections.flatMap((run) => run.rows.map((row) => row.name)), ['repo', 'mine'], 'the error row has no owner');
  assert.equal(you.filterCount, 1); assert.equal(you.resettable, true);
  const pack = skillListView({ skills, errors, plugins, filter: { plugin: 'pa', createdBy: null }, sort: 'name' });
  assert.deepEqual(pack.sections, [{ section: null, rows: [skills[3]] }], 'a held sort lists one flat run');
  assert.equal(pack.held, true);
  // A sort whose rows are gone falls back; a filter for a plugin no longer listed is dropped.
  assert.equal(skillListView({ skills: [skill('x')], sort: 'plugin' }).sort, 'updated');
  assert.deepEqual(skillListView({ skills: [skill('x')], filter: { plugin: 'gone', createdBy: null } }).filter, { plugin: null, createdBy: null });
  const searched = skillListView({ skills, errors, plugins, query: 'front matter' });
  assert.deepEqual([searched.searched, searched.matched], [1, 1]);
  const hidden = skillListView({ skills, errors, plugins, query: 'mine', filter: { plugin: null, createdBy: 'org' } });
  assert.deepEqual([hidden.searched, hidden.matched], [1, 0], 'filters hide the search hit: the no-match reset state');
});

test('c3c3eda79 Y / gt / J: filter count, normalisation and the Created by options without partners', () => {
  assert.equal(filterCount(DEFAULT_SKILL_FILTER), 0);
  assert.equal(filterCount({ plugin: 'p', createdBy: 'you' }), 2);
  assert.deepEqual(normalizeSkillFilter({ plugin: null, createdBy: 'partners' }, [], false), { plugin: null, createdBy: null });
  const same = { plugin: 'p', createdBy: null };
  assert.equal(normalizeSkillFilter(same, [{ id: 'p', label: 'P' }]), same, 'an unchanged filter keeps its identity');
  assert.deepEqual(createdByOptions(), ['you', 'org', 'anthropic']);
  assert.deepEqual(skillPluginOptions([skill('a', { pluginId: 'x' }), skill('b', { pluginId: 'y' })], [plugin('x', { name: 'Same', marketplaceName: 'One' }), plugin('y', { name: 'Same', marketplaceName: 'Two' })]),
    [{ id: 'x', label: 'Same (One)' }, { id: 'y', label: 'Same (Two)' }]);
});

test('pluginListView: Show filter, Last edited / Name sort, sections and the display-name suffix', () => {
  const rows = [plugin('z-tool', { name: 'Zed' }), plugin('a-tool', { name: 'Ant', enabled: false }), plugin('local', { name: 'Mine', sourcePath: '/p' })];
  const all = pluginListView({ rows });
  assert.deepEqual(all.sections.map((run) => [run.section, run.rows.map((row) => row.name)]), [['createdByYou', ['Mine']], ['marketplaces', ['Ant', 'Zed']]]);
  assert.deepEqual(all.sortOptions.map((option) => option.label), ['Last edited', 'Name']);
  const off = pluginListView({ rows, show: 'disabled' });
  assert.deepEqual(off.sections.flatMap((run) => run.rows.map((row) => row.id)), ['a-tool']);
  assert.equal(off.resettable, true);
  assert.deepEqual(pluginListView({ rows, show: 'enabled', query: 'ant' }).matched, 0);
  assert.deepEqual(pluginListView({ rows, sort: 'name' }).sections.map((run) => run.section), [null]);
  assert.equal(pluginListView({ rows, show: 'bogus' }).show, 'all');
  assert.deepEqual(pluginRowFacts(plugin('p', { author: 'Acme', description: '' , skillCount: 2 })), { credit: 'by Acme', detail: '2 skills' });
  assert.deepEqual(pluginRowFacts(plugin('p', { description: 'Does things' })), { credit: null, detail: 'Does things' });
});

test('c27f32a39 ze / Be: New within 14 days of the update, never for a future or older stamp', () => {
  const now = Date.UTC(2026, 9, 14);
  assert.equal(recentReason({ updatedAt: now / 1000 - 3600 }, now), 'updated');
  assert.equal(recentReason({ createdAt: now / 1000 - 86400, updatedAt: now / 1000 }, now), 'added');
  assert.equal(recentReason({ updatedAt: now / 1000 - 15 * 86400 }, now), null);
  assert.equal(recentReason({ updatedAt: now / 1000 + 60 }, now), null);
  assert.equal(recentReason({ updatedAt: null }, now), null);
  assert.equal(recentTooltip('updated'), 'Added or updated in the last 14 days');
  assert.equal(skillCredit(skill('a')), 'by you');
  assert.equal(skillCredit(skill('s', { scope: 'system' }), [], { name: 'Codex' }), 'by Codex');
  assert.equal(skillCredit(skill('m', { scope: 'admin' })), null);
  assert.equal(skillCredit(skill('p', { pluginId: 'x' }), [plugin('x', { author: 'Acme' })]), 'by Acme');
});

test('c6a2a31c4 Ss / ys and the c3bb81cd1 refresh toast over the local marketplace operations', () => {
  const plugins = [plugin('a@market', { name: 'A', marketplaceId: 'market', marketplaceName: 'The Market' }), plugin('b@other', { name: 'B', marketplaceId: 'other' })];
  assert.equal(marketplaceLabel({ name: 'market' }, plugins), 'The Market');
  assert.equal(marketplaceLabel({ name: 'empty' }, plugins), 'empty');
  assert.deepEqual(marketplaceInstalledPlugins(plugins, 'market'), [{ id: 'a@market', label: 'A' }]);
  assert.equal(marketplaceRemovalDescription(1), 'This will also uninstall 1 plugin from this marketplace:');
  assert.equal(marketplaceRemovalDescription(0), 'This will remove the marketplace from your list.');
  assert.deepEqual(marketplaceUpgradeToast({ ok: true, result: { upgradedRoots: ['/m'], errors: [] } }), { variant: 'neutral', text: 'Marketplace updated.' });
  assert.deepEqual(marketplaceUpgradeToast({ ok: true, result: { upgradedRoots: [], errors: [] } }), { variant: 'neutral', text: 'Already up to date.' });
  assert.equal(marketplaceUpgradeToast({ ok: true, result: { errors: [{ message: 'x' }] } }).variant, 'danger');
  assert.equal(marketplaceUpgradeToast({ ok: false, message: 'boom' }).text, 'Couldn’t check for updates. Try again.');
});
