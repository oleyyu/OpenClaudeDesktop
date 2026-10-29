// Host adapters of the 3.6556.2 project graph (scripts/extract-chat-projects.mjs, w10-curchat-projects).
// Each export answers one original declaration the extractor names (its features pin the original); the manifest's
// `hostDifferences` repeats why. Projects here are this machine's local projects (electron/local-projects.mjs), so the
// claude.ai project services (sharing, raven eligibility, org permissions, gated header slots, the official project
// edit / archive / delete / report dialogs) have no data; the host pages own their dialogs through LocalProjectContext.
import React, { createContext, useCallback, useContext } from 'react';
import { CdsDropdown, CdsIcon, CdsRelativeTime, SessionsDateLayout, SessionsRowLayout } from './generated/view-tabs/index.js';
import { offRecommendedToolIds, projectToolOptions, recommendedToolConfigs, recommendedToolsChange } from './chat-tools-model.mjs';
import { SourcePictogram } from './source-pictogram.jsx';
import { MemoryManageDialog } from './source-settings-memory.jsx';
import { RouterLink } from './source-routines-shared-adapters.jsx';
import { getLocale, t } from '../electron/i18n/index.mjs';

// The host project page provides { update(patch), save(patch), optimistic(patch), edit(kind), reveal() } (source-projects.jsx);
// save is update without the page's own error line (the official caller reports its failure itself).
// The 3.6556.2 header reads it (the 2.31226.0 current-chat header that shared it is retired; source-project-adapters.jsx
// still re-exports it for its last test caller, w11-sweep-curchat).
export const LocalProjectContext = createContext(null);

// shared-1 xR: the CDS Pictogram by name (lazy def loader over the pictogram_def_loaders chunk, then As). The host
// bundles its defs (source-pictogram.jsx, HandBlocks from its own chunk), so the svg renders on first paint.
export function NamedPictogram({ name, size = 'md', className }) {
  return <SourcePictogram name={name} size={size} className={className} />;
}

// c71dee58b Tu: the header subtitle and share descriptor. Its first branch, `if (!e || !n) return { subTitle: null }`,
// is taken when raven (`ae`, a team plan) is off, as it is without an account.
const noSubtitle = Object.freeze({ subTitle: null });
export const useProjectSubtitle = () => noSubtitle;

// c71dee58b Jo: the lazy project_share_modal entry (handle + Component). Nothing to load: the share button needs raven.
export const projectShareModal = Object.freeze({ handle: null, Component: () => null });

// c71dee58b wu: the "Share project" link dialog, opened only from the Share button (hidden without an account).
export const ProjectShareDialog = () => null;

// shared-182 Oz: the project PATCH mutation (`/api/organizations/${org}/projects/${uuid}`). The header uses it for
// is_starred, the instructions dialog (c9b54eb90 ze) for prompt_template; the host keeps them as the local project's
// isStarred and instructions (local-projects update).
const projectPatch = patch => ({
  ...(Object.hasOwn(patch ?? {}, 'is_starred') ? { isStarred: !!patch.is_starred } : {}),
  ...(Object.hasOwn(patch ?? {}, 'prompt_template') ? { instructions: String(patch.prompt_template ?? '') } : {}),
  // w13-chatfn-tools (chatfn-23): c9b54eb90 _e's `n({settings:o})`, the project's recommended tools.
  ...(Object.hasOwn(patch ?? {}, 'settings') ? { settings: patch.settings } : {}),
});
export function useProjectMutation() {
  const host = useContext(LocalProjectContext);
  // The dialog reports its own failure (a toast), so its save skips the page's error line; the header's pin keeps it.
  const mutateAsync = patch => (Object.hasOwn(patch ?? {}, 'prompt_template') ? host.save ?? host.update : host.update)(projectPatch(patch));
  // _e's fire-and-forget `mutate` (the recommended tools): a failure shows on the page's error line (host.update).
  return { mutateAsync, mutate: patch => { mutateAsync(patch).catch(() => {}); } };
}

// shared-182 Hz: the project query invalidation the dialog runs when its optimistic save fails. The host changes the
// local project only when local-projects update succeeds, so there is nothing to roll back.
export const useProjectQueriesInvalidate = () => noInvalidate;
function noInvalidate() {}

// w13-chatfn-tools (chatfn-23): the recommended tools strip (c9b54eb90 De) and the dialog's tools view (je) are sliced;
// their claude.ai services answer from the host page's `tools` (LocalProjectContext: source-projects.jsx, fed by
// main.jsx) — { support, thinking, connectors, settings, selection, globalMode, apply(change) }; chat-tools-model.mjs
// has the rules.
const noTools = Object.freeze({ support: { kind: 'none' }, thinking: false, connectors: Object.freeze([]), settings: Object.freeze({}), selection: null, globalMode: null, apply() {} });
const hostTools = host => host?.tools ?? noTools;

// c9b54eb90 pe: the tools a project can recommend ({ tools, enable, createInPlace }): Web search and Research when the
// running core can search, Extended thinking, the customize connectors. Nothing to enable or create in place.
export function useProjectToolOptions() {
  const tools = hostTools(useContext(LocalProjectContext));
  return { tools: projectToolOptions({ support: tools.support, thinking: tools.thinking, connectors: tools.connectors, label: message => t(message.defaultMessage) }),
    enable: noEnable, createInPlace: noCreateInPlace };
}
async function noEnable() {}
const noCreateInPlace = Object.freeze({ create: async () => ({ kind: 'failed', error: new Error('Unavailable.') }) });

// The host page's _e (the generated useProjectRecommendations, called once by source-projects.jsx): ye below reads the
// same list (an adapter can't import the graph that imports it).
export const ProjectRecommendationsContext = createContext(Object.freeze({ recommendations: Object.freeze([]) }));

// c9b54eb90 ye: the strip's configs and handlers. The conversation it switches is the project page's New chat
// (enableTool / disableTool / enableAllTools → tools.apply: main.cjs "chat-tools" set with threadId null, a connector's
// customize switch); a disconnected connector has no connect flow here (connectTool does nothing).
export function useRecommendedToolConfigs() {
  const tools = hostTools(useContext(LocalProjectContext));
  const { recommendations } = useContext(ProjectRecommendationsContext);
  const input = { support: tools.support, settings: tools.settings, selection: tools.selection, globalMode: tools.globalMode };
  const toolConfigs = recommendedToolConfigs({ ...input, recommendations });
  const change = (ids, on) => tools.apply(recommendedToolsChange({ ...input, configs: toolConfigs }, ids, on));
  return { toolConfigs, connectTool: noConnect, enableTool: id => change([id], true), disableTool: id => change([id], false),
    enableAllTools: () => change(offRecommendedToolIds(toolConfigs), true), finishInAppHost: null };
}
function noConnect() {}

// shared-25 zs (Hh): a Statsig dynamic config value; none here, so the caller's fallback (je: [] first-party integrations).
export function useProjectDynamicConfigValue(_name, _key, fallback) { return fallback; }
// vendor-zod cc / vs: the schema je hands zs, never consulted (zs above answers the fallback).
export const zodArraySchema = () => inertSchema;
export const zodStringSchema = () => inertSchema;
const inertSchema = Object.freeze({});

// shared-182 kG: integrations available, `va("haystack").isAvailable` (the shared-78 haystack org feature under the
// GrowthBook haystack_enabled gate). E69 (w13-close-chat-project-rows): off, as the official default without an account
// (E49), so the recommended tools strip (c9b54eb90 De: `if (!Z() || …) return null`) renders nothing under the
// instructions. Its model (pe / ye above, chat-tools-model.mjs) stays; this one constant turns it on.
export const HAYSTACK_AVAILABLE = false;
export const useIntegrationsAvailable = () => HAYSTACK_AVAILABLE;

// shared-78 WF: a connector's favicon through a remote favicon service; no such request here (E59), so the official
// fallback renders (Ee passes the letter avatar; WF's own fallback is the Globe icon).
export function ConnectorFavicon({ fallbackSvg, size = 12 }) {
  return fallbackSvg || <CdsIcon name="Globe" customSize={size + 2} className="text-[color:var(--muted-as-secondary,var(--cds-text-muted))]" />;
}

// w13-chatui-project-detail (review fix): the classic page's header (c71dee58b Eu), drop zone (cf2f34ee4 qr) and project
// memory section (cf2f34ee4 Jr) services.
// shared-4 Xb: Eu's pin toggle (`!is_starred`, optimistic, rolled back on failure) over the local project's isStarred.
export function useProjectStarToggle() {
  const host = useContext(LocalProjectContext);
  return host.toggleStarred;
}
// cf2f34ee4 ur: the Example project badge's tooltip (and its project-limit upsell). Only a claude.ai starter project shows
// the badge; a local project never is one, so the badge (if ever given) renders without the tooltip.
export function ExampleProjectTooltip({ children }) {
  return <>{children}</>;
}
// cb4e4d5b7 te: the lazy extension-to-MIME table (c911e1a3d). Not loaded: it only refines `accept`, which the project
// drop zone does not set.
export const loadExtensionMimes = () => noMimes;
const noMimes = Promise.resolve();
// c274117ff _ (zt): memory available — this machine's memory (chat-memory) on and not paused (the page's `memory`).
export function useMemoryAvailable() {
  return useContext(LocalProjectContext)?.memory?.available === true;
}
// shared-182 $k (Ye): the project memory query ({ data: {memory, updated_at}, refetch, isFetching, errorUpdateCount }) over
// the local store (<userData>/memory/projects/<id>.md), which the page reads through chat-memory state.
const noMemory = Object.freeze({ data: undefined, refetch: async () => {}, isFetching: false, errorUpdateCount: 0 });
export function useProjectMemoryQuery() {
  return useContext(LocalProjectContext)?.memory?.query ?? noMemory;
}
// shared-182 SA / tA: the team-only "Resynthesize memory" flag (claudeai_saffron_frontend.resynthesize_enabled, default
// false) and its claude.ai mutation; off here, so the button never renders.
export const useMemoryResynthesizeEnabled = () => false;
const noResynthesize = Object.freeze({ resynthesizeMemory() {}, isResynthesizingMemory: false });
export const useMemoryResynthesize = () => noResynthesize;
// c274117ff v (Rt): the memory dialog state ({ modalOpen, setModalOpen, modalView, setModalView }); the official keeps it
// in the ?modal=memory search parameter, the host in the section (closing returns the view to "synthesis").
export function useProjectMemoryModal() {
  const [modalOpen, setOpen] = React.useState(false), [modalView, setModalView] = React.useState('synthesis');
  const setModalOpen = React.useCallback(open => { setOpen(open); if (!open) setModalView('synthesis'); }, []);
  return { modalOpen, setModalOpen, modalView, setModalView };
}
// c274117ff O (Bt): the project's "Manage memory" dialog: the host's (source-settings-memory.jsx, the c274117ff O layout)
// over the project memory; its edits go to chat-memory controls with the project id. cf2f34ee4 hands it
// `{ projectUuid: n, ...o }`; O reads `projectUuid: r` for its project wording (r ? "Manage project memory" and the
// project description "Claude regenerates project memory every evening…" : the account ones), so the project id goes on
// to MemoryManageDialog's projectId (w13-close-cowork-misc, E77).
export function ProjectMemoryDialog({ projectUuid, modalOpen, setModalOpen }) {
  const memory = useContext(LocalProjectContext)?.memory;
  if (!memory) return null;
  return <MemoryManageDialog open={modalOpen} onClose={() => setModalOpen(false)} memory={memory.query?.data} busy={memory.busy === true}
    error={memory.error ?? ''} onControls={memory.controls} projectId={projectUuid ?? null} />;
}

// shared-156 ch: the in-app settings link's click (router navigation to /settings/<page>). ze's "profile instructions"
// link (`/settings/${bm.instructions}`) opens the host page that holds the global instructions, Settings > Instructions
// (the host's openSettings, main.jsx setSettings); the window never navigates to the claude.ai route.
export function useSettingsLinkClick() {
  const openSettings = useContext(LocalProjectContext)?.openSettings;
  return useCallback(event => { event?.preventDefault?.(); openSettings?.(PROFILE_INSTRUCTIONS_PAGE); }, [openSettings]);
}
export const PROFILE_INSTRUCTIONS_PAGE = 'instructions';

// shared-182 Mz: the optimistic list update (project, isStarred, { rollback }) that precedes the mutation.
export function useProjectOptimisticUpdate() {
  const host = useContext(LocalProjectContext);
  return (_project, isStarred) => host.optimistic({ isStarred: !!isStarred });
}

// shared-8 xq: the cowork-starred-spaces store ({ starredIds, toggleStarred }). The space card (c17beaa76 Fn, via
// shared-8 Cq) reads the starred ids for its pin mark; the host projects page provides its pinned local projects here.
// The header reads it only for a space (its `r` branch); for a project it uses is_starred.
const noSpaces = Object.freeze({ starredIds: Object.freeze([]), toggleStarred() {} });
export const LocalProjectSpacesContext = createContext(noSpaces);
export function useLocalSpaceSelector(select) {
  return select(useContext(LocalProjectSpacesContext));
}

// shared-26 Gz: the gated header slot (cai_calm_dusk gated import). No gated imports are served to this host.
export const ProjectHeaderGatedSlot = () => null;

// c0e977562 t (exported n): raven eligibility (free / pro / max accounts ask /api/account/raven_eligible). No account.
export const useProjectShareEligible = () => false;

// shared-19 PF: the space menu (cowork spaces). The header renders it only for `space`, never for a project.
export const SpaceMenu = () => null;

// shared-19 DI / EI: the deferred-body context-menu and dropdown variants of the project menu (deferMenuBody). The
// header passes no deferMenuBody, so xI always takes kI (the eager dropdown).
export const DeferredProjectMenu = () => null;

// shared-4 Zb: the project query's permissions. A local project is always editable by this machine's user.
const localPermissions = Object.freeze({ hasSettingsEditPermission: true });
export const useProjectPermissions = () => localPermissions;

// shared-19 TI: the project menu body ({ items, modals, hasDebugMenu }) the official kI dropdown renders. The official
// items (Edit details, Report, Archive, Delete) and their dialogs are claude.ai project APIs; the host keeps the
// official "Edit details" item and its own Open folder item, with its own dialog. The instructions are edited from the
// knowledge rail's Instructions section (cf2f34ee4 ri, w13-chatui-project-detail), as on the official page.
export function useProjectMenuItems({ showEditItems }) {
  const host = useContext(LocalProjectContext);
  const items = <>
    {showEditItems && <CdsDropdown.Item data-testid="rename-project-trigger" icon="Edit" onClick={() => host.edit('details')}>{t('Edit details')}</CdsDropdown.Item>}
    <CdsDropdown.Item icon="Folder" onClick={host.reveal}>{t('Open folder')}</CdsDropdown.Item>
  </>;
  return { items, modals: null, hasDebugMenu: false };
}

// w13-close-chat-project-rows: the conversation rows of the project page (c71dee58b Ol, sliced) and their services. The
// host page (source-projects.jsx) provides, through LocalProjectContext, sessionAction(action, sessionId) (main.jsx
// sessionAction: pin / unpin / rename), renameChat({ uuid, name }) (opens the sliced shared-16 hu) and deleteChat(uuid)
// (the host Delete chat confirmation, source-chats-page.jsx ChatDeleteDialog, as shared-11 OE).
// shared-16 Lf (→ Rf → Bf / zf, Mf's items Ff): the conversation's menu. Nl passes {conversation, initialName, open,
// onOpenChange, trigger} (no read state, bulk select, organize / reorder items), so Ff renders Pin / Unpin
// (star-chat-trigger, shared-78 gK true: Pin / PinSlash), Rename (rename-chat-trigger, opening hu 100 ms later as Mf's
// startRename does), a separator and Delete (delete-chat-trigger, danger); zf hands the popup Ff's letter keys
// (`onKeyDownCapture`: p, r, d). Not offered: yf's project items, cu (artifacts), Pf (archive), and Sl's right-click
// variant (a contextMenuTrigger renders as is).
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
  // shared-16 Df / Ef: a plain letter (no modifier) the map holds runs its action and is consumed.
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
// shared-130 B_: the conversation rename mutation hu saves with (`p({name})`); the local session's rename.
export function useRenameConversation(conversationUuid) {
  const host = useContext(LocalProjectContext);
  return { mutateAsync: async ({ name }) => { await host.sessionAction('rename', conversationUuid, { name }); }, isPending: false };
}
// c71dee58b Ml: a cowork session filed in a local project, as the official row layout (c75e89812 jo) with Ml's title
// (`t.title ?? "Local task"`) and date rail (Ao over CdsRelativeTime of `lastActivityAt ?? createdAt`).
export function ProjectCoworkSessionRow({ session }) {
  const at = session.lastActivityAt ?? session.createdAt;
  return <SessionsRowLayout title={session.title ?? t('Local task')}
    rail={at ? <SessionsDateLayout><CdsRelativeTime date={new Date(at).toISOString()} locale={getLocale()} /></SessionsDateLayout> : null} />;
}
// c71dee58b xl: a cowork row's link (Sl's props) without yl's session context menu.
export function ProjectCoworkRowLink({ linkProps }) {
  return <RouterLink {...linkProps} />;
}
