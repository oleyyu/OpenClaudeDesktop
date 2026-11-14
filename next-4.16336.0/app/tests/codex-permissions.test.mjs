import test from 'node:test';
import assert from 'node:assert/strict';
import { customProfiles, effectiveProfile, applyCodexPermissions, validateProfileChoice } from '../electron/codex-permissions.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
import { turnPermissionParams, threadPermissionParams } from '../electron/permission-policy.mjs';

// Real codex 0.155.1 permissionProfile/list with default_permissions = "devbox" (temp CODEX_HOME probe).
const listed = { data: [{ id: ':read-only', description: null, allowed: true }, { id: ':workspace', description: null, allowed: true },
  { id: ':danger-full-access', description: null, allowed: true }, { id: 'devbox', description: 'Workspace plus scratch, network on', allowed: true }, { id: 'locked', description: null, allowed: false }] };

test('Codex permission profiles: custom ones listed, config.toml followed unless the user chose', () => {
  assert.deepEqual(customProfiles(listed), [{ id: 'devbox', description: 'Workspace plus scratch, network on', allowed: true }, { id: 'locked', description: null, allowed: false }]);
  assert.equal(effectiveProfile(undefined, 'devbox'), 'devbox');
  assert.equal(effectiveProfile(null, 'devbox'), 'devbox');
  assert.equal(effectiveProfile('', 'devbox'), null, 'OpenClaude Desktop sandbox chosen');
  assert.equal(effectiveProfile('other', 'devbox'), 'other');
  assert.equal(effectiveProfile(undefined, ':workspace'), null, 'a built-in default keeps the mode sandbox');
  assert.equal(validateProfileChoice(null), null);
  assert.throws(() => validateProfileChoice(':danger-full-access'), /profile/);
  assert.equal(settingsPatch({}, { codexPermissionProfile: 'devbox' }).codexPermissionProfile, 'devbox');
  assert.equal('codexPermissionProfile' in settingsPatch({ codexPermissionProfile: 'devbox' }, { codexPermissionProfile: null }), false);
});

test('a profile replaces only the workspace-write sandbox; config.toml roots and network are merged otherwise', () => {
  const turn = turnPermissionParams({ permission: 'auto', cwd: '/w' });
  assert.deepEqual(applyCodexPermissions('turn/start', { ...turn }, { profile: 'devbox' }), { approvalsReviewer: 'user', approvalPolicy: 'on-request', collaborationMode: { mode: 'default' }, permissions: 'devbox' });
  const thread = threadPermissionParams({ permission: 'ask' });
  assert.deepEqual(applyCodexPermissions('thread/start', { ...thread }, { profile: 'devbox' }), { approvalsReviewer: 'user', approvalPolicy: 'untrusted', permissions: 'devbox' });
  // Plan (read-only) and Bypass (danger-full-access) keep their own sandbox.
  for (const permission of ['plan', 'bypass']) {
    const params = turnPermissionParams({ permission, cwd: '/w' });
    assert.equal('permissions' in applyCodexPermissions('turn/start', { ...params }, { profile: 'devbox' }), false, permission);
  }
  const merged = applyCodexPermissions('turn/start', turnPermissionParams({ permission: 'acceptEdits', cwd: '/w' }), { workspaceWrite: { writable_roots: ['/scratch', 'relative', '/w'], network_access: true } });
  assert.deepEqual(merged.sandboxPolicy.writableRoots, ['/w', '/scratch']);
  assert.equal(merged.sandboxPolicy.networkAccess, true);
});

test('workflow agents on Codex get the session\'s own sandbox as -c overrides: profile, network access, writable roots', async () => {
  const { codexWorkflowArgs } = await import('../electron/codex-permissions.mjs');
  assert.deepEqual(codexWorkflowArgs({ access: 'read-only', turn: { permissions: 'devbox' } }), [], 'read-only agents get nothing');
  assert.deepEqual(codexWorkflowArgs({ access: 'danger-full-access', networkAccess: true }), []);
  assert.deepEqual(codexWorkflowArgs({ access: 'workspace-write', turn: { permissions: 'devbox' }, networkAccess: true }),
    ['-c', 'default_permissions="devbox"', '-c', 'sandbox_workspace_write.network_access=true']);
  assert.deepEqual(codexWorkflowArgs({ access: 'workspace-write', turn: { sandboxPolicy: { type: 'workspaceWrite', networkAccess: true, writableRoots: ['/w', '/extra', 'relative', '/w'] } }, networkAccess: false }),
    ['-c', 'sandbox_workspace_write.network_access=true', '-c', 'sandbox_workspace_write.writable_roots=["/w","/extra"]']);
  assert.deepEqual(codexWorkflowArgs({ access: 'workspace-write', turn: { sandboxPolicy: { type: 'workspaceWrite', networkAccess: false, writableRoots: [] } }, networkAccess: true }), [], 'the turn as sent decides');
  assert.deepEqual(codexWorkflowArgs({ access: 'workspace-write', turn: null, networkAccess: true, profile: 'devbox' }),
    ['-c', 'default_permissions="devbox"', '-c', 'sandbox_workspace_write.network_access=true'], 'no turn yet: Settings');
  assert.deepEqual(codexWorkflowArgs({ access: 'workspace-write', turn: { permissions: ':workspace' } }), [], 'built-in profiles are the runner\'s own sandbox');
});
