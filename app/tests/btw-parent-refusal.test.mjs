import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { btwParentRefusal } from '../src/btw-parent-refusal-model.mjs';

const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const count = (text, needle) => text.split(needle).length - 1;

// w10-ccres-e31-btw: c73f45bc3 ip/ap, the parent refusal that hides qP's "New side chat" (Op `!u`).
test('the parent refusal follows c73f45bc3 ap over the host thread and metadata', async () => {
  const chunk = await readFile(path.join(v1, 'c73f45bc3-B7hbL7H9.js'), 'utf8');
  assert.equal(count(chunk, 'function ap(e){if(e.isArchived===!0)return"archived_parent";if(rp.has(e.errorCategory??""))return"parent_folder_gone";if(e.scheduledTaskId!==void 0||e.agentDispatched===!0)return"unattended_parent";if(e.remoteTarget!==void 0&&e.btwChildRemoteKept!==!1)return"remote_parent";if(e.spawnedFrom?.sideSession===!0&&!e.lineageDetached)return"parent_is_side_session";'), 1);
  assert.equal(count(chunk, 'rp=new Set(["cwd_not_found","cwd_too_long","remote_cwd_missing"])'), 1);
  assert.equal(count(chunk, 'l=J1($,3,e)?K1($,3,e,()=>!!ip(e)):$[4],u=Jr(l)'), 1);
  const thread = { id: 'parent', cwd: '/repo' };
  assert.equal(btwParentRefusal(thread, {}), null);
  assert.equal(btwParentRefusal(undefined, undefined), null, 'an unknown record is not refused (ip: no record, no reason)');
  assert.equal(btwParentRefusal({ ...thread, archived: true }, {}), 'archived_parent');
  for (const errorCategory of ['cwd_not_found', 'cwd_too_long', 'remote_cwd_missing']) assert.equal(btwParentRefusal({ ...thread, errorCategory }, {}), 'parent_folder_gone');
  assert.equal(btwParentRefusal({ ...thread, errorCategory: 'other' }, {}), null);
  assert.equal(btwParentRefusal(thread, { scheduledTaskId: 'task' }), 'unattended_parent');
  assert.equal(btwParentRefusal(thread, { agentDispatched: true }), 'unattended_parent');
  assert.equal(btwParentRefusal({ ...thread, sshConfig: {} }, {}), 'remote_parent');
  assert.equal(btwParentRefusal(thread, { spawnedFrom: { sideSession: true } }), 'parent_is_side_session');
  assert.equal(btwParentRefusal(thread, { spawnedFrom: { sideSession: true }, lineageDetached: true }), null, 'a detached side session is a top-level parent');
  assert.equal(btwParentRefusal({ ...thread, harnessCwd: '/repo/.claude/worktrees/x' }, {}), 'claude_entered_worktree');
});
