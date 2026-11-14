import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionSurface, surfaceSessions, surfaceDraftKey, surfaceInstructions, takeSurface } from '../electron/surface-policy.mjs';
import { threadPermissionParams, turnPermissionParams, workflowAccess } from '../electron/permission-policy.mjs';

test('existing history stays in Code; Chat and Cowork share their non-Code history', () => {
  const metadata = { a: { surface: 'chat' }, b: { surface: 'cowork' }, invalid: { surface: 'unknown' } };
  const sessions = ['a', 'b', 'old', 'invalid'].map(id => ({ id }));
  assert.deepEqual(surfaceSessions(sessions, 'code', metadata).map(s => s.id), ['old', 'invalid']);
  assert.deepEqual(surfaceSessions(sessions, 'chat', metadata).map(s => s.id), ['a', 'b']);
  assert.equal(sessionSurface('b', metadata), 'cowork');
});

test('surface and split drafts cannot overwrite one another, while Code keeps its existing storage key', () => {
  const keys = ['code', 'chat', 'cowork'].flatMap(surface => [0, 1].map(side => surfaceDraftKey(surface, side)));
  assert.equal(new Set(keys).size, 6);
  assert.equal(surfaceDraftKey('code'), 'epitaxy-draft');
});

test('local routing metadata is consumed without losing tool selection or permission hints', () => {
  const params = { codeDesktop: { surface: 'cowork', tools: ['read'], permissionMode: 'ask' } };
  assert.equal(takeSurface(params), 'cowork');
  assert.deepEqual(params.codeDesktop, { tools: ['read'], permissionMode: 'ask' });
  const native = { codeDesktop: { surface: 'chat' } };
  assert.equal(takeSurface(native), 'chat');
  assert.equal(native.codeDesktop, undefined);
  assert.throws(() => takeSurface({ codeDesktop: { surface: 'unknown' } }));
});

test('Chat stays read-only; Cowork can produce files and uses the same plan and approval policy as Code', () => {
  for (const hints of [true, false]) {
    assert.equal(threadPermissionParams({ mode: 'chat', permission: 'bypass', hints }).sandbox, 'read-only');
    assert.deepEqual(threadPermissionParams({ mode: 'cowork', permission: 'auto', hints }), threadPermissionParams({ mode: 'code', permission: 'auto', hints }));
    assert.deepEqual(turnPermissionParams({ mode: 'cowork', permission: 'plan', cwd: '/work', hints }), turnPermissionParams({ mode: 'code', permission: 'plan', cwd: '/work', hints }));
  }
  assert.equal(workflowAccess({ mode: 'cowork' }), 'workspace-write');
  assert.equal(workflowAccess({ mode: 'chat' }), 'read-only');
  assert.match(surfaceInstructions('cowork'), /actual file paths/);
  assert.match(surfaceInstructions('chat'), /Answer the user directly/);
});
