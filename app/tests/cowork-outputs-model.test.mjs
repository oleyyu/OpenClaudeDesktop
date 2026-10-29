import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  coworkOutputsData, coworkOutputEvents, coworkOutputsByFolder, coworkDownloadableOutputs, coworkOutputsFolderPath,
  coworkFolderExpanded, toggleCoworkFolder, isOutputEvent, FILE_EXPLORER_GATE, CLAUDE_MD_CONFIG_KEY, COWORK_CLAUDE_MD_CONFIG,
} from '../src/cowork-outputs-model.mjs';
import { itemDeliverables } from '../src/deliverable-records.mjs';

// w13-coworkui-outputs: the pure data model behind the 3.6556.2 Outputs / Working folder section (c21f11e6d xT), checked
// against the official AT derivations (readable c21f11e6d :11655-12292) by their raw text.
const app = path.resolve(import.meta.dirname, '..');
const c21 = fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c21f11e6d-Cyd8_HO8.js'), 'utf8');
const cwd = '/Users/me/Project';
const change = (id, changes, extra = {}) => ({ id, type: 'fileChange', status: 'completed', changes, ...extra });

test('the official derivations the model follows (raw text)', () => {
  for (const s of ['lT=new Set(["mcp_tool","cli_tool","web_search","web_fetch","skill_invoked","command_invoked","memory"])', 'uT=new Set(["device_commit","project_file"])',
    'Pe("claudeai_cowork_file_explorer_main")', 'enableAdditionalDirectoriesClaudeMd??!1', 'groups:[],ungrouped:[]', 'openWith:{via:"path"}'])
    assert.ok(c21.includes(s), s);
  assert.match(c21, /\(e,t\)=>[\w$]+\[e\]\?\?t===0/, 'En: stored choice, else the first group open');
  assert.match(c21, /\.via==="uuid"\?[\w$]+\.set\([\w$]+,\{filePath:[\w$]+,fileUuid:[\w$]+\.uuid\}\):[\w$]+\.via==="url"&&[\w$]+\.set\([\w$]+,\{filePath:[\w$]+,servedUrl:[\w$]+\.url\}\)/, 'Yn');
  assert.equal(FILE_EXPLORER_GATE, 'claudeai_cowork_file_explorer_main');
  assert.equal(CLAUDE_MD_CONFIG_KEY, 'enableAdditionalDirectoriesClaudeMd');
});

test('file events: completed file changes (add → create, update → edit, delete drops) and delivered files, relative to the folder', () => {
  const items = [
    change('a', [{ path: 'outputs/a.md', kind: { type: 'add' } }, { path: 'notes.txt', kind: { type: 'update' } }], { completedAt: 2 }),
    { id: 'b', type: 'fileChange', status: 'inProgress', changes: [{ path: 'skip.md', kind: { type: 'add' } }] },
    change('c', [{ path: 'notes.txt', kind: { type: 'delete' } }]),
    { id: 'd', type: 'dynamicToolCall', status: 'completed', codeDesktop: { deliverables: [{ path: `${cwd}/outputs/b.pdf` }] } },
  ];
  const events = coworkOutputEvents(items, { cwd, deliverables: itemDeliverables });
  assert.deepEqual(events.map(e => [e.filePath, e.operation, e.fileName, e.openWith.via]), [
    [`${cwd}/outputs/a.md`, 'create', 'a.md', 'path'], [`${cwd}/outputs/b.pdf`, 'create', 'b.pdf', 'path']]);
  assert.equal(events[0].timestamp, 2);
  assert.equal(events[0].id, `a:${cwd}/outputs/a.md`);
});

test('dT / Xn / Yn / sa / En: outputs inside the folder, grouped, nothing downloadable, the first output folder', () => {
  const folders = [cwd];
  const inside = { filePath: `${cwd}/outputs/a.md`, operation: 'create', openWith: { via: 'path' } };
  const outside = { filePath: '/tmp/x.md', operation: 'create', openWith: { via: 'path' } };
  const uploaded = { filePath: '/tmp/up.md', operation: 'create', openWith: { via: 'uuid', uuid: 'u1' } };
  assert.equal(isOutputEvent(inside, folders), true);
  assert.equal(isOutputEvent(outside, folders), false);
  assert.equal(isOutputEvent(uploaded, folders), true);
  assert.equal(isOutputEvent({ ...inside, operation: 'mcp_tool' }, folders), false);
  assert.equal(isOutputEvent({ ...inside, operation: 'project_file' }, folders), false);
  assert.deepEqual(coworkOutputsByFolder([inside, uploaded], folders), { groups: [{ folder: cwd, activities: [inside] }], ungrouped: [uploaded] });
  assert.deepEqual(coworkOutputsByFolder([inside], []), { groups: [], ungrouped: [] });
  assert.deepEqual(coworkDownloadableOutputs([inside]), []);
  assert.deepEqual(coworkDownloadableOutputs([uploaded, { filePath: '/s', openWith: { via: 'url', url: 'https://x' } }]),
    [{ filePath: '/tmp/up.md', fileUuid: 'u1' }, { filePath: '/s', servedUrl: 'https://x' }]);
  assert.equal(coworkOutputsFolderPath([inside]), `${cwd}/outputs/`);
  assert.equal(coworkOutputsFolderPath([]), null);
  assert.equal(coworkFolderExpanded({}, cwd, 0), true);
  assert.equal(coworkFolderExpanded({}, '/b', 1), false);
  assert.deepEqual(toggleCoworkFolder({}, cwd, 0), { [cwd]: false });
  assert.equal(coworkFolderExpanded(toggleCoworkFolder({}, '/b', 1), '/b', 1), true);
});

test('section data: one working folder, gates off by default (Browse files and the CLAUDE.md row hidden), empty local subsections', () => {
  const data = coworkOutputsData({ cwd, sessionId: 's1', items: [change('a', [{ path: 'outputs/a.md', kind: { type: 'add' } }])] });
  assert.deepEqual(data.userSelectedFolders, [cwd]);
  assert.equal(data.hasSelectedFolders, true);
  assert.equal(data.hasMultipleFolders, false);
  assert.equal(data.outputResourcesActivity.length, 1);
  assert.equal(data.outputsByFolder.groups[0].activities.length, 1);
  assert.deepEqual(data.downloadableOutputs, []);
  assert.equal(data.fileExplorerAvailable, false);
  // w13-coworkui-settings: one host answer for enableAdditionalDirectoriesClaudeMd, shared with Settings › Cowork (E67: on;
  // the row's bridge writeLocalFile is main "cowork-claude-md", w13-close-cowork-ui).
  assert.equal(data.enableAdditionalDirectoriesClaudeMd, COWORK_CLAUDE_MD_CONFIG);
  assert.equal(coworkOutputsData({ cwd, gates: { [CLAUDE_MD_CONFIG_KEY]: false } }).enableAdditionalDirectoriesClaudeMd, false);
  assert.equal(data.isRemote, false, 'cwui-18: local sessions are never remote (ST not rendered)');
  assert.deepEqual([data.scratchpadResourceActivity, data.nonFileOutputs, data.hasConnectedOfficeFiles, data.hasWorkingDocuments], [[], [], false, false], 'cwui-17');
  assert.equal(coworkOutputsData({ cwd, sessionId: 's1', gates: { [FILE_EXPLORER_GATE]: true }, fileSystem: { listFilesInFolder() {} } }).fileExplorerAvailable, true);
  assert.equal(coworkOutputsData({ cwd, gates: { [FILE_EXPLORER_GATE]: true }, fileSystem: { listFilesInFolder() {} } }).fileExplorerAvailable, false, 'needs a session');
  const none = coworkOutputsData({ sessionId: 's1' });
  assert.deepEqual([none.userSelectedFolders, none.hasSelectedFolders, none.outputsFolderPath], [[], false, null]);
});
