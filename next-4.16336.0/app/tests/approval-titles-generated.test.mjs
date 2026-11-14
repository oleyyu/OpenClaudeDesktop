// V3-w10-trans-approval-titles-gen (research/w10-trans.md CI-20): the 3.6556.2 approval card tool title builders
// (cc32965c2 cd and what it reaches) are generated into src/generated/approval-titles and can be called from plain node.
// Source checks read the official chunk bytes only (never executed); the calls run the generated copy with an intl that
// formats through the host's t() (as approval-card-model.mjs does) and records the message ids it was asked for.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as official from '../scripts/official-3.6556.2.mjs';
import { t } from '../electron/i18n/index.mjs';
import { approvalToolTitle, approvalToolSpec, approvalToolSpecs, terminalApprovalTitle } from '../src/generated/approval-titles/tool-titles.mjs';
import * as messages from '../src/generated/approval-titles/messages.mjs';

const app = path.resolve(import.meta.dirname, '..');
const dir = path.join(app, 'src/generated/approval-titles');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = fs.readFileSync(path.join(official.ionSource, 'cc32965c2-BQu1bA_w.js'), 'utf8');
const generated = fs.readFileSync(path.join(dir, 'tool-titles.mjs'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

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
  return { ...approvalToolTitle(intl, approvalToolSpec(toolName), args, ctx(toolName, extra)), ids: intl.ids };
};

test('manifest: 3.6556.2, every module cut from the official bytes and unchanged since', () => {
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.equal(manifest.generator, 'scripts/extract-approval-titles.mjs');
  assert.deepEqual(manifest.roots.approvalToolTitle, { file: 'cc32965c2-BQu1bA_w.js', local: 'cd' });
  assert.deepEqual(manifest.roots.terminalApprovalTitle, { file: 'cc32965c2-BQu1bA_w.js', local: 'nd' });
  const files = fs.readdirSync(dir).filter((name) => name !== 'manifest.json').sort();
  assert.deepEqual(manifest.modules.map((m) => m.target).sort(), files);
  for (const module of manifest.modules) {
    assert.equal(sha(fs.readFileSync(path.join(official.ionSource, module.source))), module.sourceSha256, module.target);
    assert.equal(sha(fs.readFileSync(path.join(dir, module.target), 'utf8')), module.sha256, module.target);
    assert.ok(module.bindings.length > 0, module.target);
  }
});

test('cd dispatches each server once, in the official chunk and in the generated copy', () => {
  const servers = ['ccd_session_mgmt', 'ccd_pr', 'ccd_host', 'ccd_connectors', 'ccd_sidebar', 'ccd_session', 'ccd_settings', 'terminal', 'scheduled-tasks'];
  for (const server of servers) {
    assert.equal(count(raw, `case"${server}":`), 1, `official ${server}`);
    assert.equal(count(generated, `case ${JSON.stringify(server)}:`), 1, `generated ${server}`);
  }
  assert.equal(count(raw, '"Allow Claude to <b>pin</b> <glued>{session}?</glued>",id:"+O33CWUgVt"'), 1);
  assert.equal(messages.sidebarTitleMessages.pinTitle.id, '+O33CWUgVt');
  assert.equal(messages.sidebarTitleMessages.pinTitle.defaultMessage, 'Allow Claude to <b>pin</b> <glued>{session}?</glued>');
  assert.equal(count(raw, '/[\\r\\n\\u0085\\u2028\\u2029]/u.test('), 1);
});

test('the tool table: names the desktop serves map to {server, kind}', () => {
  assert.deepEqual(approvalToolSpec('mcp__terminal__run_in_terminal'), { server: 'terminal', kind: 'runInTerminal' });
  assert.deepEqual(approvalToolSpec('mcp__ccd_host__reveal_path'), { server: 'ccd_host', kind: 'revealPath' });
  assert.deepEqual(approvalToolSpec('mcp__ccd_session_mgmt__set_session_title'), { server: 'ccd_session_mgmt', kind: 'setSessionTitle', sessionRefs: 'session_id' });
  assert.equal(approvalToolSpec('mcp__unknown__tool'), undefined);
  assert.equal(approvalToolSpec('hasOwnProperty'), undefined);
  for (const [name, spec] of Object.entries(approvalToolSpecs)) assert.ok(raw.includes(`${JSON.stringify(name).replace(/^"(\w+)"$/, '$1')}:{server:"${spec.server}",kind:"${spec.kind}"`), name);
});

test('plain-node module: no static view-tabs import; CdsIcon is a lazy reference', () => {
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mjs'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const statics = [...text.matchAll(/^import [^;]* from "([^"]+)";/gm)].map((m) => m[1]);
    // code-routines' shared-156 (the display-safety helpers, D1 w13-close-gen-dedup) imports only routines-shared's
    // import-free shared-0, so the graph stays plain; that shared-0 (Pa, jL / ML, Vy … hb) is linked directly too.
    for (const from of statics) assert.ok(from.startsWith('./') || from === 'react' || from === 'react/jsx-runtime' || from === '../view-tabs/rolldown-runtime-C3OYiQ02.js'
      || from === '../code-routines/shared-156-BLTosN8U.mjs' || from === '../routines-shared/shared-0-DDOOdL6P.mjs', `${file}: ${from}`);
  const linkedText = fs.readFileSync(path.join(dir, '../code-routines/shared-156-BLTosN8U.mjs'), 'utf8');
  assert.deepEqual([...linkedText.matchAll(/^import [^;]* from "([^"]+)";/gm)].map((m) => m[1]), ['../routines-shared/shared-0-DDOOdL6P.mjs']);
  assert.equal(/^import /m.test(fs.readFileSync(path.join(dir, '../routines-shared/shared-0-DDOOdL6P.mjs'), 'utf8')), false);
  }
  // D1: no second copy of routines-shared's shared-0 bindings in this graph's shared-0 module.
  const own0 = fs.readFileSync(path.join(dir, 'shared-0-DDOOdL6P.mjs'), 'utf8');
  for (const name of ['Pa', 'Vy', 'Hy', 'Ky', 'sb', 'fb', 'mb', 'hb']) assert.doesNotMatch(own0, new RegExp(`^function ${name}\\(`, 'm'), name);
  for (const name of ['ib', 'ab', 'ob', 'cb', 'ub', 'db', 'jL', 'ML']) assert.doesNotMatch(own0, new RegExp(`^var ${name} =`, 'm'), name);
  const shared8 = fs.readFileSync(path.join(dir, 'shared-8-Db1QN4mf.mjs'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(shared8.includes('var we = lazy(() => import("../view-tabs/shared-frame-6jtSkIit.js").then((m) => ({ default: m.CdsIcon, })), );'));
  assert.ok(shared8.includes('icon: _(we, { name: e, customSize: n })'));
});

test('runInTerminal: a new tab, an open tab, a folder', () => {
  const plain = title('mcp__terminal__run_in_terminal', { command: 'npm test' });
  assert.equal(plain.action, 'run a command in your terminal');
  assert.equal(plain.meta, undefined);
  assert.equal(plain.detail, 'npm test');
  assert.equal(plain.overrideDescription, undefined);
  assert.equal(plain.clampTitle, true);
  assert.deepEqual(plain.detailReadGate, { label: 'Command', hint: 'Scroll through the whole command to allow it.' });
  assert.ok(plain.ids.includes('HL7kBz9ncy'));
  assert.ok(raw.includes('run:{defaultMessage:"run a command in your terminal",id:"HL7kBz9ncy"}'));

  const open = title('mcp__terminal__run_in_terminal', { command: 'npm test', tab_id: 'tab-1' });
  assert.equal(open.action, 'run a command in your terminal');
  assert.equal(open.overrideDescription, 'In a tab that’s already open');
  assert.equal(open.ownProse, true);
  assert.equal(open.descriptionAsTooltip, true);
  assert.ok(open.ids.includes('ZGr6xKQ8Eq'));
  // A tab and a folder at once is not a shape the builder accepts: the generic card answers.
  assert.equal(terminalApprovalTitle(recordingIntl(), approvalToolSpec('mcp__terminal__run_in_terminal'), { command: 'ls', tab_id: 'x', cwd: '/tmp' }, ctx('mcp__terminal__run_in_terminal')), null);
  const fallback = title('mcp__terminal__run_in_terminal', { command: 'ls', tab_id: 'x', cwd: '/tmp' });
  assert.equal(fallback.fallback, true);
  assert.equal(fallback.clickOnly, true);

  const folder = title('mcp__terminal__run_in_terminal', { command: 'npm test', cwd: '/tmp/project' });
  assert.equal(folder.overrideDescription, 'In “/tmp/project”');
  assert.equal(folder.folderLine, '/tmp/project');
  assert.ok(folder.ids.includes('LhWcwAzX+V'));
  const inSession = title('mcp__terminal__run_in_terminal', { command: 'npm test', cwd: '/tmp/project', cwd_outside_session: false });
  assert.equal(inSession.folderLine, undefined);
  // Multi-line commands are not titled.
  assert.equal(terminalApprovalTitle(recordingIntl(), approvalToolSpec('mcp__terminal__run_in_terminal'), { command: 'a\nb' }, ctx('mcp__terminal__run_in_terminal')), null);
  assert.equal(title('mcp__terminal__list_terminal_tabs', {}).action, 'see your open terminal tabs');
});

test('reveal_path and open_in_editor (ccd_host)', () => {
  const reveal = title('mcp__ccd_host__reveal_path', { path: '/tmp/project/a.txt' });
  assert.equal(reveal.action, 'open the folder containing');
  assert.equal(reveal.meta, 'a.txt');
  assert.equal(reveal.detail, '/tmp/project/a.txt');
  assert.equal(reveal.ownProse, true);
  // w11-sweep-trans: the ids are the official ones (cu.reveal), not just the same English.
  assert.deepEqual(reveal.ids, ['EXR0xlYruE']);
  assert.equal(count(raw, 'reveal:{defaultMessage:"open the folder containing",id:"EXR0xlYruE"}'), 1);
  const open = title('mcp__ccd_host__open_in_editor', { path: '/tmp/project/a.txt' });
  assert.equal(open.action, 'open');
  assert.equal(open.meta, 'a.txt');
  assert.ok(open.ids.includes('Wf3CfBI1fe'));
});

test('set_session_title: this session, another session, no target', () => {
  const args = { session_id: 's1', title: 'New name' };
  const self = title('mcp__ccd_session_mgmt__set_session_title', args, { targets: [{ id: 's1', isSelf: true }] });
  assert.equal(self.action, 'rename this session to “New name”');
  assert.equal(self.meta, undefined);
  // w11-sweep-trans: Q.renameTail / Q.renameSelf / Q.rename / Q.renameVoiced, as cc32965c2 setSessionTitle asks for them.
  for (const id of ['0j8UztmAqH', 'Hcv2gsJA8w', 'IProu954Xz', 'vvaa5HdU49']) assert.ok(self.ids.includes(id), id);
  for (const pin of ['renameTail:{defaultMessage:"to {title}",id:"0j8UztmAqH"}', 'renameSelf:{defaultMessage:"rename this session {tail}",id:"Hcv2gsJA8w"}',
    'rename:{defaultMessage:"rename",id:"IProu954Xz"}', 'renameVoiced:{defaultMessage:"rename a session",id:"vvaa5HdU49"}']) assert.equal(count(raw, pin), 1, pin);
  const replaces = title('mcp__ccd_session_mgmt__set_session_title', { ...args, current_title: 'Old' }, { targets: [{ id: 's1', isSelf: true }] });
  assert.deepEqual(replaces.footnote, ['This replaces the name you gave it yourself.']);
  assert.ok(replaces.ids.includes('IH61GcBjZX'));
  const other = title('mcp__ccd_session_mgmt__set_session_title', args, { targets: [{ id: 's2', isSelf: false, title: 'Other work' }] });
  assert.equal(other.meta, 'Other work');
  assert.equal(other.session.action, 'rename');
  assert.equal(other.session.tail, 'to “New name”');
  assert.equal(other.session.target.id, 's2');
  const none = title('mcp__ccd_session_mgmt__set_session_title', args);
  assert.equal(none.action, 'rename a session');
  assert.equal(none.fallback, true);
  assert.ok(none.ids.includes('vvaa5HdU49'));
  assert.ok(raw.includes('setSessionTitle:{defaultMessage:"rename a session"'));
});
