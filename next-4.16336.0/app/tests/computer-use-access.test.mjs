import test from 'node:test';
import assert from 'node:assert/strict';
import { computerUseAccessRequest, computerUseAccessRows, computerUseAccessTitle, computerUseAppRisk } from '../src/computer-use-model.mjs';
import { approvalCardModel, approvalKeyIntent, ELICITATION } from '../src/approval-card-model.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

// The request_access access card's model (docs/computer-use-ui-css-source-20261020.md §1).
const meta = (access) => ({ codex_approval_kind: 'mcp_tool_call', persist: ['session'], ...(access ? { computer_use_access: access } : {}) });
const access = {
  reason: 'Write the report',
  flags: { clipboardRead: true, systemKeyCombos: true },
  apps: [
    { bundleId: 'com.apple.TextEdit', displayName: 'TextEdit', tier: 'full', installed: true },
    { bundleId: 'com.apple.Terminal', displayName: 'Terminal', tier: 'click', installed: true },
    { bundleId: 'com.apple.finder', displayName: 'Finder', tier: 'full', alreadyGranted: true },
    { displayName: 'Figma', installed: false },
  ],
};

test('rows: capabilities first, granted apps left out, risky apps first, tier text only when installed', () => {
  const rows = computerUseAccessRows(computerUseAccessRequest({ _meta: meta(access) }, null));
  assert.deepEqual(rows.flags.map((f) => f.key), ['clipboardRead', 'systemKeyCombos']);
  assert.deepEqual(rows.apps.map((a) => a.name), ['Terminal', 'TextEdit', 'Figma']);
  assert.deepEqual(rows.apps.map((a) => a.tierLabel), ['Click only', 'All', null]);
  assert.equal(rows.apps[0].riskLabel, 'Can run commands on your computer');
  assert.equal(rows.apps[2].installed, false);
});

test('risk classes follow the official macOS sets', () => {
  assert.equal(computerUseAppRisk('com.apple.Terminal'), 'shell');
  assert.equal(computerUseAppRisk('com.apple.finder'), 'filesystem');
  assert.equal(computerUseAppRisk('com.apple.systempreferences'), 'system_settings');
  assert.equal(computerUseAppRisk('com.apple.TextEdit'), null);
});

test('title variants', () => {
  const titleFor = (a) => computerUseAccessTitle(computerUseAccessRows(computerUseAccessRequest({ _meta: meta(a) }, null)), 'Claude');
  assert.equal(titleFor({ apps: [{ displayName: 'Notes' }] }).text, 'Allow Claude to use Notes?');
  assert.equal(titleFor({ apps: [{ displayName: 'Notes' }, { displayName: 'Maps' }] }).text, 'Allow Claude to use 2 apps?');
  assert.equal(titleFor(access).text, 'Allow Claude to use these capabilities?');
  assert.equal(titleFor({ apps: [] }).text, 'Allow Claude to use your computer?');
});

test('only a computer-use request_access call is an access request', () => {
  const call = { type: 'mcpToolCall', server: 'computer-use', tool: 'request_access', arguments: { apps: ['Notes'] } };
  assert.equal(computerUseAccessRequest({ _meta: meta() }, call).apps[0].name, 'Notes');
  assert.equal(computerUseAccessRequest({ _meta: meta() }, { ...call, tool: 'left_click' }), null);
  assert.equal(computerUseAccessRequest({ _meta: { codex_approval_kind: 'other', computer_use_access: access } }, null), null);
});

test('card model: reason, Deny and one Allow for this session', () => {
  const request = { method: ELICITATION, id: 'a1', params: { serverName: 'computer-use', mode: 'form', message: 'Allow?',
    requestedSchema: { type: 'object', properties: {} }, _meta: meta(access) } };
  const model = approvalCardModel(request, null);
  assert.equal(model.reason, 'Write the report');
  assert.equal(model.deny.label, 'Deny');
  assert.deepEqual(model.allows.map((a) => [a.key, a.label]), [['acceptForSession', 'Allow for this session']]);
  assert.equal(model.access.title.kind, 'capabilities');
});

test('zh-CN covers the card strings', () => {
  for (const key of ['View only', 'Click only', 'All', 'Read your clipboard', 'Use system shortcuts (⌘Q, ⌘Tab, and similar)', '(not installed)',
    'Can run commands on your computer', 'use', 'use your computer', 'Allow {name} to {use} {app}?', 'Allow {name} to {use} {count} apps?',
    'Allow {name} to {use} these capabilities?', 'Allow {name} to {useYourComputer}?', 'Allow for this session', 'Deny']) {
    assert.equal(typeof zh[key], 'string', key);
  }
});

test('⌘↵ takes the access card\'s one allow; Esc denies', () => {
  const request = { method: ELICITATION, id: 'a2', params: { serverName: 'computer-use', mode: 'form', message: 'Allow?',
    requestedSchema: { type: 'object', properties: {} }, _meta: meta(access) } };
  const model = approvalCardModel(request, null);
  const key = (init) => approvalKeyIntent({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, ...init }, { target: 'content', model });
  assert.deepEqual(key({ metaKey: true }), { type: 'action', action: 'acceptForSession' });
  assert.deepEqual(key({ key: 'Escape' }), { type: 'action', action: 'decline' });
});
