import { sidebarDescription, sidebarFolder, sidebarBranch, sidebarRemoteEnvironment } from './generated/code-current/sidebar-details-model.mjs';

// Bridge the host's actual session/repository records to shared-20's row data.
// No remote environment or branch is inferred from the session title.
export function currentSidebarDetails(session, view, { preferences = {}, group, pinned = false, nested = false, repoIdentity } = {}) {
  const data = {
    ...session,
    type: ['local', 'cli', 'remote', 'bridge'].includes(session.type) ? session.type : 'local',
    repoInfo: session.repoInfo ?? repoIdentity,
    ownBranch: session.ownBranch ?? session.prInfo?.headRefName ?? session.gitInfo?.branch ?? session.branch,
  };
  const status = ({ ready: 'unread', running: 'working', awaiting: 'blocked', error: 'error' })[view.mark] ?? 'idle';
  const pr = pinned ? undefined : view.pr;
  const env = pinned || preferences.groupBy === 'project' && !group?.ownSection ? undefined : sidebarRemoteEnvironment(data);
  const folderOnly = group?.plainHeading === true && !preferences.showMetadata && !nested;
  const description = (preferences.showMetadata || folderOnly) && !pinned ? sidebarDescription({
    status, underNeedsInput: group?.key === 'state-blocked', pr,
    branch: sidebarBranch(data), folder: sidebarFolder(data), heading: group?.label, folderOnly,
  }) : undefined;
  return { status, pr, env, description, showPrTail: (description === undefined || folderOnly) && pr !== undefined };
}
