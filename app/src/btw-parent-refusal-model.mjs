// 3.6556.2 c73f45bc3 ip / ap: why a parent session cannot get a /btw child, read from the renderer's session record.
// Op (qP's `onCreate`, cccc2cf0a `P=Ph(t)`) offers "New side chat" only while `!!ip(e)` is false:
//   ap(e){if(e.isArchived===!0)return"archived_parent";if(rp.has(e.errorCategory??""))return"parent_folder_gone";
//   if(e.scheduledTaskId!==void 0||e.agentDispatched===!0)return"unattended_parent";
//   if(e.remoteTarget!==void 0&&e.btwChildRemoteKept!==!1)return"remote_parent";
//   if(e.spawnedFrom?.sideSession===!0&&!e.lineageDetached)return"parent_is_side_session";
//   if(e.btwChildSharesTree!==!0)return …"lazy_worktree_parent"|"worktree_branch_only"|"origin_folder_differs"|"claude_entered_worktree"…}
//   rp=new Set(["cwd_not_found","cwd_too_long","remote_cwd_missing"])
// Host record: the thread plus its session metadata, the same fields main's btw-session op 'start' refuses on
// (electron/btw-sessions.cjs parentRefusal). The worktree branch is narrowed to `harnessCwd`: the renderer does not hold
// main's worktree origins, so "origin_folder_differs" is left to main's refusal, which hands back to the floating side
// chat as Tp's handBack does for a refused start.
const FOLDER_GONE = new Set(['cwd_not_found', 'cwd_too_long', 'remote_cwd_missing']);

export function btwParentRefusal(thread, meta) {
  if (!thread) return null;
  if (thread.archived === true) return 'archived_parent';
  if (FOLDER_GONE.has(thread.errorCategory ?? '')) return 'parent_folder_gone';
  if (meta?.scheduledTaskId != null || meta?.agentDispatched === true) return 'unattended_parent';
  if (thread.remoteTarget || thread.sshConfig || thread.wslConfig || meta?.remoteTarget) return 'remote_parent';
  if (thread.source?.subAgent || (meta?.spawnedFrom?.sideSession === true && !meta.lineageDetached)) return 'parent_is_side_session';
  if (meta?.surface && meta.surface !== 'code') return 'other_surface';
  if (thread.harnessCwd) return 'claude_entered_worktree';
  return null;
}
