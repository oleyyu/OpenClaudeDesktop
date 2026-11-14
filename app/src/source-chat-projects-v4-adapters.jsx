// Host side of the 4.16336.0 projects graph (src/generated/chat-projects-v4, scripts/extract-chat-projects-v4.mjs).
// Every export stands in for one official binding named in the generator's HOST_ADAPTERS table (file#local, pinned by
// features and declaration sha256) and in the manifest's imports.
//
// The boundaries are the same official services the 3.6556.2 projects graph adapts (src/source-project-v3-adapters.jsx:
// the local project through LocalProjectContext, the local memory, the host tools, the closed claude.ai services), now in
// their 4.16336.0 chunks / locals, plus the services other 4.16336.0 graphs adapt for the same bindings (intl, router
// link, account, errors, analytics, hub, lazy surfaces, navigation marks, GrowthBook). They are re-exported unchanged.
// Declared here: the four 3.6556.2 host adapters that render, ported onto the cds-core 4.16336.0 facade (the 3.6556.2 ones
// render the 3.6556.2 view-tabs components): the same logic and the same official items, over the components of the
// graph that renders them. Nothing official is executed here; nothing is hand-rendered in place of an official component.
import { useContext } from 'react';
import { CdsDropdown, CdsIcon, CdsRelativeTime, SessionsDateLayout, SessionsRowLayout } from './cds-core.mjs';
import { LocalProjectContext } from './source-project-v3-adapters.jsx';
import { getLocale, t } from '../electron/i18n/index.mjs';

export {
  ProjectHeaderGatedSlot, useLocalSpaceSelector, useRenameConversation, useProjectToolOptions, useRecommendedToolConfigs,
  useProjectMutation, useIntegrationsAvailable, useSettingsLinkClick, useProjectDynamicConfigValue, zodArraySchema,
  zodStringSchema, useProjectQueriesInvalidate, ProjectMemoryDialog, useMemoryAvailable, useProjectMemoryModal,
  useProjectMemoryQuery, useMemoryResynthesizeEnabled, useMemoryResynthesize, ProjectCoworkRowLink, SpaceMenu,
  DeferredProjectMenu, useProjectPermissions, useProjectStarToggle, useProjectShareEligible, projectShareModal,
  ProjectShareDialog, useProjectSubtitle, useProjectOptimisticUpdate, ExampleProjectTooltip, NamedPictogram,
  loadExtensionMimes,
} from "./source-project-v3-adapters.jsx";
export { useIntl, FormattedMessage, RouterLink, useCurrentAccount, useErrors, useAnalytics, useHubAvailable } from "./source-routines-shared-adapters.jsx";
export { useLazySurfacePending } from "./source-code-routines-adapters.jsx";
export { useHomePinsEnabled } from "./source-cowork-home-v3-adapters.jsx";
export { markNavigation } from "./source-sessions-page-hf-adapters.jsx";
export { markConversationNavigationIntent } from "./source-sessions-page-v4-adapters.jsx";
export { useGrowthBookFeatureOn } from "./settings-nav-adapter.mjs";

// shared-123 PD (3.6556.2 shared-78 WF): a connector's favicon through a remote favicon service; no such request here
// (E59), so the official fallback renders: the caller's fallbackSvg (Ie passes the letter avatar), else PD's own Globe
// (`name: "Globe", customSize: l + 2`, l the size, 12 by default).
export function ConnectorFavicon({ fallbackSvg, size = 12 }) {
  return fallbackSvg || <CdsIcon name="Globe" customSize={size + 2} className="text-[color:var(--muted-as-secondary,var(--cds-text-muted))]" />;
}

// shared-19 YL (3.6556.2 TI): the project menu body ({ items, modals, hasDebugMenu }) the official dropdown renders. The
// official items (Edit details, Report, Archive, Delete) and their dialogs are claude.ai project APIs; the host keeps the
// official "Edit details" item and its own Open folder item, with its own dialog (LocalProjectContext edit / reveal).
export function useProjectMenuItems({ showEditItems }) {
  const host = useContext(LocalProjectContext);
  const items = <>
    {showEditItems && <CdsDropdown.Item data-testid="rename-project-trigger" icon="Edit" onClick={() => host.edit('details')}>{t('Edit details')}</CdsDropdown.Item>}
    <CdsDropdown.Item icon="Folder" onClick={host.reveal}>{t('Open folder')}</CdsDropdown.Item>
  </>;
  return { items, modals: null, hasDebugMenu: false };
}

// shared-140 Il (3.6556.2 shared-16 Lf): the conversation's menu a project page row opens (c71dee58b Nl passes
// { conversation, initialName, open, onOpenChange, trigger } or a contextMenuTrigger). Its items for such a row (Fl):
// Pin / Unpin (star-chat-trigger, Pin / PinSlash, p), Rename (rename-chat-trigger, Edit, r: the sliced shared-140 ts
// opens 100 ms later, as the official startRename), a separator and Delete (delete-chat-trigger, danger, Trash, d), with
// the letter keys on the popup. They act on the local session (LocalProjectContext sessionAction / renameChat /
// deleteChat). Not offered: the read-state, bulk-select, project, artifact and archive items (claude.ai services or props
// this caller does not pass) and the right-click variant (a contextMenuTrigger renders as is).
export function ProjectConversationMenu({ conversation, initialName, open, onOpenChange, trigger, contextMenuTrigger }) {
  const host = useContext(LocalProjectContext);
  if (contextMenuTrigger) return contextMenuTrigger;
  const starred = conversation.is_starred === true;
  const close = () => onOpenChange?.(false);
  const actions = {
    p: () => host?.sessionAction?.(starred ? 'unpin' : 'pin', conversation.uuid),
    r: () => setTimeout(() => host?.renameChat?.({ uuid: conversation.uuid, name: initialName ?? conversation.name ?? '' }), 100),
    d: () => host?.deleteChat?.(conversation.uuid),
  };
  const run = key => { close(); actions[key](); };
  // A plain letter (no modifier) the map holds runs its action and is consumed.
  const onKeyDownCapture = event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.key?.length !== 1) return;
    const key = event.key.toLowerCase();
    if (!Object.hasOwn(actions, key)) return;
    event.preventDefault(); event.stopPropagation();
    run(key);
  };
  return <CdsDropdown.Root open={open} onOpenChange={onOpenChange}>
    <CdsDropdown.Trigger render={trigger} />
    <CdsDropdown.Popup align="end" onKeyDownCapture={onKeyDownCapture}>
      <CdsDropdown.Item data-testid="star-chat-trigger" onClick={() => run('p')} icon={starred ? 'PinSlash' : 'Pin'} shortcut="p">{t(starred ? 'Unpin' : 'Pin')}</CdsDropdown.Item>
      <CdsDropdown.Item data-testid="rename-chat-trigger" onClick={() => run('r')} icon="Edit" shortcut="r">{t('Rename')}</CdsDropdown.Item>
      <CdsDropdown.Separator />
      <CdsDropdown.Item variant="danger" data-testid="delete-chat-trigger" onClick={() => run('d')} icon="Trash" shortcut="d">{t('Delete')}</CdsDropdown.Item>
    </CdsDropdown.Popup>
  </CdsDropdown.Root>;
}

// c71dee58b Ul (3.6556.2 Ml): a cowork session filed in a local project, as the official row layout (c75e89812 a) with
// Ul's title (`t.title ?? "Local task"`) and date rail (c75e89812 o over CdsRelativeTime of `lastActivityAt ?? createdAt`);
// no live status dot, review popover, files strip, inline approval or session menu (those read the claude.ai session
// stores).
export function ProjectCoworkSessionRow({ session }) {
  const at = session.lastActivityAt ?? session.createdAt;
  return <SessionsRowLayout title={session.title ?? t('Local task')}
    rail={at ? <SessionsDateLayout><CdsRelativeTime date={new Date(at).toISOString()} locale={getLocale()} /></SessionsDateLayout> : null} />;
}
