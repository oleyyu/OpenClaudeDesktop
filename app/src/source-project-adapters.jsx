import React, { createContext, useContext } from 'react';
import { HostMenuButton } from './source-chat-adapters.jsx';
import { t, getLocale } from '../electron/i18n/index.mjs';
import { useStartIntl } from './source-code-start-adapters.jsx';
export { HostButton, LocalizedMessage, useDesktopFrame, ThemePortal } from './source-chat-adapters.jsx';

// The source header owns its layout; account services are replaced at this boundary.
export const LocalProjectContext = createContext(null);
export const useProjectAnalytics = () => ({ track() {} });
export const useProjectIntl = useStartIntl;
export const useNoProjectSharing = () => false;
export const NoProjectSharing = () => null;
export const LocalProjectMarker = () => null;
export const projectSubtitle = () => null;
export const ProjectTypes = { Haystack: 'haystack' };
export const ProjectArchivedBadge = () => null;
export const useLocalSpaceSelector = select => select({ starredIds: [], toggleStarred() {} });
export function useProjectMutation() {
  const host = useContext(LocalProjectContext);
  return { mutateAsync: patch => host.update({ isStarred: patch.is_starred }) };
}
export function useProjectOptimisticUpdate() {
  const host = useContext(LocalProjectContext);
  return (_project, isStarred) => host.optimistic({ isStarred });
}
export function LocalProjectMenu() {
  const host = useContext(LocalProjectContext);
  return <HostMenuButton variant="ghost" size="sm" iconOnly icon="DotsHorizontal" aria-label={t('Project options')} items={[
    { label: t('Edit project'), icon: 'Pencil', onSelect: () => host.edit('details') },
    { label: t('Project instructions'), icon: 'File', onSelect: () => host.edit('instructions') },
    { label: t('Open folder'), icon: 'Folder', onSelect: host.reveal },
  ]} />;
}
