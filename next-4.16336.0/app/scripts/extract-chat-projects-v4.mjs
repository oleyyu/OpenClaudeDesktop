// Projects pages, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 7, region chat-projects):
// the same semantic roots extract-chat-projects.mjs cuts from 3.6556.2 into src/generated/chat-projects, cut from the
// frozen 4.16336.0 snapshot into the isolated graph src/generated/chat-projects-v4. Staged double output: the 3.6556.2
// output is untouched and the host keeps reading src/generated/chat-projects (no production switch).
// (exploration scaffold; the reviewed tables follow)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_PROJECTS_V4_OUTPUT = 'src/generated/chat-projects-v4';
const ADAPTER_FILE = 'src/source-chat-projects-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

const SPACES = 'c17beaa76-CF6cnZoR.js', EMPTY = 'cbef3b9e7-CCVzzPIb.js', KEYS = 'c444bcdd7-BCWTQytB.js', S140 = 'shared-140-DfG6VwpK.js';
const TOOLS = 'c9b54eb90-D0FvVL5w.js', RAIL = 'cf2f34ee4-CGe8SQnD.js', PROJECT = 'c71dee58b-CV9X9s_h.js';
const S19 = 'shared-19-UalAfDtn.js'; const REMOVAL = 'c9260427e-CQ_106hh.js';

export const ROOTS = {
  [SPACES]: {
    // 3.6556.2 c17beaa76 Fn: the cowork space card the projects page lists (ProjectCard with the pin mark, the date, the
    // folder chip and the "Runs on this computer" badge).
    tr: { name: 'ProjectSpaceCard', export: null, probe: 'Runs on this computer', features: ['showLocalBadge: l,', 'defaultMessage: "Runs on this computer",',
      'name: h ? "PinFilled" : "StarFilled",', 'footerClassName: "mt-auto items-center",', '"inline-flex min-w-0 max-w-40 items-center gap-1 text-secondary",'] },
    // 4.16336.0 c17beaa76 Sr: the search announcement messages the projects page passes to c365fd3fe n (fn(count, query,
    // Sr)); 4.16336.0 moved this copy from the hook to the caller (3.6556.2 n built "No {plural} match" itself).
    Sr: { name: 'projectsSearchMessages', export: null, probe: 'yZCgW45frU', features: ['defaultMessage: "No projects match \\u201C{query}\\u201D",',
      'id: "yZCgW45frU",', 'id: "QqdHdTRDWT",'] },
  },
  [EMPTY]: {
    // 3.6556.2 cbef3b9e7 s: the CDS empty state (pictogram by variant, headline, description, CTA).
    s: { name: 'ProjectsEmptyState', export: 't', probe: 'ctaBusyLabel', features: ['headlineLevel: l,', '"items-start pb-12 text-start"',
      '"items-center justify-center px-md py-12 text-center"', '"max-w-xs font-medium text-secondary"', '"max-w-xs text-footnote text-secondary"'] },
  },
  [KEYS]: {
    // 3.6556.2 c444bcdd7 t: the search keyboard hook (ArrowDown into the results, ArrowUp / Escape back to the input).
    n: { name: 'useProjectsSearchKeys', export: 't', probe: 'onResultsKeyDown', features: ['if (e.nativeEvent.isComposing) return;',
      'if (t.key !== "ArrowDown" && t.key !== "ArrowUp") return;', 'u.closest("li")?.scrollIntoView({ block: "nearest" }),', '{ onInputKeyDown: o, onResultsKeyDown: s }'] },
  },
  [S140]: {
    // 3.6556.2 shared-16 hu: the conversation menu's "Rename chat" dialog (name-chat field, Cancel / Save).
    ts: { name: 'RenameChatDialog', export: 'Di', probe: 'name-chat-submit', features: ['onRenamed: c,', 'f.renameDialogTitle', '"data-testid": "name-chat",',
      '"data-testid": "name-chat-submit",', 'defaultMessage: "Save",'] },
  },
  [TOOLS]: {
    // 3.6556.2 c9b54eb90 _e: the project's recommendations ({ tool, recommended }) and their update.
    Se: { name: 'useProjectRecommendations', export: null, probe: 'recommended_mcp_servers', features: ['e.id === "builtin:extended-thinking" ||',
      't = r?.recommended_mcp_servers?.includes(n) || !1;', 'n({ settings: o }));', '{ recommendations: i, update: a }'] },
    // 3.6556.2 c9b54eb90 je: the dialog's tools view (Tools / Connectors switches, Cancel / Save).
    Ie: { name: 'ProjectToolsView', export: null, probe: 'No available tools.', features: ['defaultMessage: "No available tools.",',
      '"flex max-h-[60vh] flex-col gap-4 overflow-y-auto"', 'className: "rounded-lg border p-4",', 'defaultMessage: "Connectors",'] },
    // 3.6556.2 c9b54eb90 ze: the "Set project instructions" dialog (instructions view and tools view).
    We: { name: 'ProjectInstructionsDialog', export: 't', probe: 'Set project instructions', features: ['defaultMessage: "Set project instructions",',
      'defaultMessage: "Project instructions",', 'defaultMessage: "Error saving instructions, please try again later",', 'size: "md",',
      'B({ prompt_template: e }).catch((e) => {', 'G = `/settings/${H("instructions")}`,'] },
  },
  [RAIL]: {
    // 3.6556.2 cf2f34ee4 ri: the knowledge rail's Instructions section.
    Ki: { name: 'ProjectInstructionsSection', export: null, probe: 'Add instructions to tailor', features: ['defaultMessage: "Instructions",',
      'defaultMessage: "Edit instructions",', 'defaultMessage: "View instructions",', 'defaultMessage: "Add instructions to tailor Claude\\u2019s responses",',
      'defaultMessage: "Couldn\\u2019t load instructions.",', 'className: "opacity-60",', '"flex flex-row items-center justify-between gap-4 mt-1"'] },
    // 3.6556.2 cf2f34ee4 Yt: the rail divider.
    hn: { name: 'ProjectRailDivider', export: 'A', probe: 'h-[0.5px] w-full bg-border', features: ['"h-[0.5px] w-full bg-border"'] },
    // 3.6556.2 cf2f34ee4 qr: the drop zone around the rail (zone props, the drop overlay, the picker provider).
    Ii: { name: 'ProjectKnowledgeDropZone', export: 'l', probe: 'getZoneProps({className', features: ['u.getZoneProps({ className: a })',
      'l ? null : i(qi, { dragState: u.dragState, message: s }),', 'i(Cn, { onFiles: t, disabled: l, control: r, children: c }),'] },
    // 3.6556.2 cf2f34ee4 Jr: the project memory section ("Memory", "Only you", the memory text, "Edit memory").
    Li: { name: 'ProjectMemorySection', export: null, probe: 'load project memory', features: ['defaultMessage: "Couldn\\u2019t load project memory.",',
      'defaultMessage: "Edit memory",', '"Resynthesize memory (team only)"', 'a.memoryAfterAFew', 'defaultMessage: "Last updated {time}",'] },
  },
  [REMOVAL]: {
    // 4.16336.0 c9260427e ue (exported s): the knowledge rail's remove confirmation. c52b32660 ge/_e pass onAskToRemove,
    // which keeps { fileName, remove }; xe renders ue over it: I is shared-frame Jl (CdsConfirmationDialog) titled
    // "Remove {name}?", "This can’t be undone.", confirm "Remove file" (danger, closeOnConfirm). library-pages r3-02.
    ue: { name: 'KnowledgeRemoveDialog', export: 's', probe: '{removal:t,onClose:r}=e', features: ['{ removal: t, onClose: r } = e,',
      'n(I, { removal: o, isOpen: s.open, onClose: r })'] },
  },
  [S19]: {
    // 4.16336.0 shared-19 NI (exported W): the project's "Edit details" dialog the projects page card menu (c17beaa76 wr
    // `t(ot,{isOpen,onClose,spaceId,spaceName,spaceDescription})`) and the space menu open: Dialog md over FI (Name
    // TextInputField maxLength 100, Description TextAreaField rows 6, Cancel / Save) saving through CoworkSpaces.updateSpace
    // (shared-0 PO, the host bridge src/source-project-spaces-bridge.mjs). library-pages r2-02.
    NI: { name: 'ProjectEditDetailsDialog', export: 'W', probe: 'spaceDescription:a', features: ['spaceDescription: a,', 'defaultMessage: "Edit details",',
      'v(ce.Popup, { size: "md", initialFocus: o, children: [l, u] }),'] },
  },
  [PROJECT]: {
    // 3.6556.2 c71dee58b Ol: the SpaceSessionTable (CdsDataTable over one content column, chat / cowork rows).
    zl: { name: 'ProjectSessionTable', export: null, probe: 'plainRows', features: ['{ items: t, onPreviewFile: n, analyticsSource: r, plainRows: i } = e,',
      'getRowLinkLabel: m,', 'flush: !0,', 'defaultMessage: "Local task",', '"claudeai.conversation.recent.opened"'] },
    // 3.6556.2 c71dee58b Eu: the classic page's own header (h1, archived / Example project badges, Pin, menu, description).
    Mu: { name: 'ProjectPageHeader', export: null, probe: 'Example project"', features: ['"mt-0.5 min-w-0 font-heading text-secondary gap-1.5 text-start line-clamp-2 break-words"',
      'defaultMessage: "Example project",', 'icon: t.is_starred ? "PinFilled" : "Pin",', 'buttonSize: "icon_sm"', 'source: "project_header",'] },
    // 3.6556.2 c71dee58b nc: the breadcrumb ("All projects" link card in the page title row, or in place).
    mc: { name: 'ProjectBreadcrumb', export: null, probe: 'liftInto', features: ['includeLinkToProjects: t,', 'liftInto: u,', 'defaultMessage: "All projects",',
      '"df-link-card inline-flex h-6 shrink-0 select-none items-center gap-1 rounded-md px-1.5 text-[13px] text-secondary-control transition-colors hover:bg-neutral-30 hover:text-primary"',
      'contentEndsWithRow: !0,'] },
    // 3.6556.2 c71dee58b Ql: the conversation section heading (plain or collapsible with Show / Hide).
    iu: { name: 'ProjectSessionsHeading', export: null, probe: 'group/header flex items-center justify-between gap-2 text-start', features: ['isCollapsible: n,', 'onToggleCollapse: i',
      '"group/header flex items-center justify-between gap-2 text-start"', 'defaultMessage: "Show",', 'defaultMessage: "Hide",',
      '"text-xs text-muted-as-secondary opacity-0 group-hover/header:opacity-75 transition-opacity"'] },
    // 3.6556.2 c71dee58b id: the project header (name, archived badge, pin / star toggle, project menu, description).
    Ad: { name: 'ProjectHeader', export: null, probe: 'menuInCrumb', features: ['menuInCrumb: h,', 'hidePin: g,', 'defaultMessage: "Unpin project",', 'icon: "PinFilled",',
      'defaultMessage: "Pin project",', '"font-heading text-primary line-clamp-2 break-words min-w-0"', '"mt-1 text-body text-secondary whitespace-pre-line line-clamp-3 break-words"'] },
  },
};

const V3 = 'src/source-project-v3-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', CR = 'src/source-code-routines-adapters.jsx';
const CH = 'src/source-cowork-home-v3-adapters.jsx', SP = 'src/source-sessions-page-hf-adapters.jsx', SP4 = 'src/source-sessions-page-v4-adapters.jsx';
export const HOST_ADAPTERS = {
  'shared-26-B-POtn5S.js#EX': { name: 'ProjectHeaderGatedSlot', from: V3, features: ['children: u(TX, { surface: "header", project: t }),'] },
  'shared-8-BqfCbkJd.js#WJ': { name: 'useLocalSpaceSelector', from: V3, features: ['var WJ = Si("cowork-starred-spaces");'] },
  'shared-153-DMw2VzSq.js#Cx': { name: 'useRenameConversation', from: V3, features: ['/chat_conversations/${c}`', '"PUT"'] },
  'c9b54eb90-D0FvVL5w.js#ve': { name: 'useProjectToolOptions', from: V3, features: ['"claude_ai_haystack_integrations"', 'id: "builtin:web-search"', 'id: "builtin:research"', 'id: "builtin:extended-thinking"', 'web_search_enabled: !0'] },
  'c9b54eb90-D0FvVL5w.js#we': { name: 'useRecommendedToolConfigs', from: V3, features: ['toggleConversationSetting: O', 'batchToggleConversationSettingsAndMCPTools: M', 'enableAllTools: G,', 'source: ee.RecommendedToolConnect'] },
  'shared-212-BHMAi0oa.js#qW': { name: 'useProjectMutation', from: V3, features: ['`/api/organizations/${n}/projects/${e}`'] },
  'shared-212-BHMAi0oa.js#k1': { name: 'useIntegrationsAvailable', from: V3, features: ['return El("haystack").isAvailable;'] },
  'shared-183-B2N6Zy4J.js#kg': { name: 'useSettingsLinkClick', from: V3, features: ['Og(n) && c_(e, t) && n.preventDefault();'] },
  'shared-25-D-aF0gt9.js#as': { name: 'useProjectDynamicConfigValue', from: V3, features: ['type: "dynamic_config_value",'] },
  'shared-123-1Hc1RTKl.js#PD': { name: 'ConnectorFavicon', from: null, features: ['disableServerUrlLookups: t,', 'skipPrivateSuffixHosts: o,', 'name: "Globe",'] },
  'vendor-zod-fszujTq6.js#cc': { name: 'zodArraySchema', from: V3, features: ['return Aa(sc, e, t);'] },
  'vendor-zod-fszujTq6.js#vs': { name: 'zodStringSchema', from: V3, features: ['return Oi(_s, e);'] },
  'shared-212-BHMAi0oa.js#sG': { name: 'useProjectQueriesInvalidate', from: V3, features: ['"removeQueries" : "invalidateQueries"', '[cn, { orgUuid: t, projectUuid: e }],'] },
  'c274117ff-CGNUUDgh.js#O': { name: 'ProjectMemoryDialog', from: V3, features: ['modalView: l,', 'setModalView: u,', 'bottomCTA: f,', 'backdropClassName: g,'] },
  'c274117ff-CGNUUDgh.js#_': { name: 'useMemoryAvailable', from: V3, features: ['e === "project" && n === "disabled_by_user" && r === !0'] },
  'c274117ff-CGNUUDgh.js#v': { name: 'useProjectMemoryModal', from: V3, features: ['e.get("modal")', '[o, s] = r("synthesis"),', 't("modal", e ? "memory" : null)'] },
  'shared-212-BHMAi0oa.js#Oz': { name: 'useProjectMemoryQuery', from: V3, features: ['memory?project_uuid=${e}', 'includeProjectImport: c'] },
  'shared-212-BHMAi0oa.js#iB': { name: 'useMemoryResynthesizeEnabled', from: V3, features: ['"claudeai_saffron_frontend",', '"resynthesize_enabled",'] },
  'shared-212-BHMAi0oa.js#kz': { name: 'useMemoryResynthesize', from: V3, features: ['`/api/organizations/${r}/memory/synthesize`', 'defaultMessage: "Couldn\\u2019t regenerate memory right now",'] },
  'c71dee58b-CV9X9s_h.js#Ml': { name: 'ProjectCoworkRowLink', from: V3, features: ['{ session: t, analyticsSource: n, linkProps: r } = e,', '{ menuProps: i } = Al(t, n),', 'contextMenuTrigger: a'] },
  'c71dee58b-CV9X9s_h.js#Ul': { name: 'ProjectCoworkSessionRow', from: null, features: ['scheduledTask: r,', 'plain: o,', 'canShowReviewPopover: b,', 'defaultMessage: "Needs attention",'] },
  'shared-140-DfG6VwpK.js#Il': { name: 'ProjectConversationMenu', from: null, features: ['n = J(e.onSelectForBulk),', 'i = J(e.onRenameStart);'] },
  'shared-19-UalAfDtn.js#YL': { name: 'useProjectMenuItems', from: null, features: ['showEditItems: r,', 'showDebugItems: i,', 'hasDebugMenu: P'] },
  'shared-19-UalAfDtn.js#II': { name: 'SpaceMenu', from: V3, features: ['space: t,', 'buttonSize: n,', 'contextMenuTrigger: o,'] },
  'shared-19-UalAfDtn.js#ZL': { name: 'DeferredProjectMenu', from: V3, features: ['contextMenuTrigger: n,', 'openEvent: p'] },
  'shared-19-UalAfDtn.js#XL': { name: 'DeferredProjectMenu', from: V3, features: ['requestBody: _,', 'mode: "dropdown",'] },
  'shared-4-C_EiQb9h.js#gL': { name: 'useProjectPermissions', from: V3, features: ['{ projectUuid: t, enabled: n, placeholderFromLists: r } = e,'] },
  'shared-4-C_EiQb9h.js#hL': { name: 'useProjectStarToggle', from: V3, features: ['t({ is_starred: e }).catch(() => i?.());'] },
  'c0e977562-BTa72GuX.js#t': { name: 'useProjectShareEligible', from: V3, features: ['return e();'] },
  'c71dee58b-CV9X9s_h.js#cs': { name: 'projectShareModal', from: V3, features: ['id: "project_share_modal",', 'pick: (e) => e.ProjectShareModal,'] },
  'c71dee58b-CV9X9s_h.js#Au': { name: 'ProjectShareDialog', from: V3, features: ['defaultMessage: "Share project",', 'surface: "project",'] },
  'c71dee58b-CV9X9s_h.js#ju': { name: 'useProjectSubtitle', from: V3, features: ['if (!e || !n)', 'subTitle: null', 'defaultMessage: "Shared with your organization",'] },
  'shared-212-BHMAi0oa.js#ZW': { name: 'useProjectOptimisticUpdate', from: V3, features: ['{ ...e, is_starred: r }', '[{ ...n, is_starred: !0 }, ...e]', 'predicate: (e) => !i(e) },'] },
  'cf2f34ee4-CGe8SQnD.js#$r': { name: 'ExampleProjectTooltip', from: V3, features: ['defaultMessage: "This is an example project. Create a new project to work with your own documents.",', 'n.push("/projects/create")'] },
  'shared-1-D1bGaTaN.js#K$': { name: 'NamedPictogram', from: V3, features: ['m(q$, { ...e }, e.name)'] },
  'cb4e4d5b7-BCjE4rlU.js#te': { name: 'loadExtensionMimes', from: V3, features: ['e?.mimes !== void 0'] },
  // The same host services other graphs adapt for these bindings (3.6556.2 chat-projects sharedAdapters).
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
  'shared-25-D-aF0gt9.js#Ky': { name: 'RouterLink', from: RS, features: ['href: t,', 'replace: a,', 'prefetch: r,'] },
  'shared-25-D-aF0gt9.js#Z': { name: 'useCurrentAccount', from: RS, features: ['"Must call inside CurrentAccountProvider"'] },
  'shared-62-DoCqVpIq.js#rP': { name: 'useErrors', from: RS, features: ['"Must be called within ErrorsProvider"'] },
  'shared-62-DoCqVpIq.js#OT': { name: 'useAnalytics', from: RS, features: ['return ZS;'] },
  'shared-123-1Hc1RTKl.js#_h': { name: 'useHubAvailable', from: RS, features: ['hubEngineAllowed: r,'] },
  'shared-6-2QYRw_Wv.js#zy': { name: 'useLazySurfacePending', from: CR, features: ['e.state !== "loaded" ? Ly(e, n) : Iy'] },
  'shared-123-1Hc1RTKl.js#_L': { name: 'useHomePinsEnabled', from: CH, features: ['t = cL(),', 'return gn(i);'] },
  'shared-183-B2N6Zy4J.js#Lh': { name: 'markNavigation', from: SP, features: ['performance.mark(Cn);', 'case "new-chat":'] },
  'shared-25-D-aF0gt9.js#Jo': { name: 'useGrowthBookFeatureOn', from: 'src/settings-nav-adapter.mjs', features: ['t = _(Jr);', '.on;'] },
  'shared-2-CsjIBQD8.js#Ly': { name: 'markConversationNavigationIntent', from: SP4, features: ['t.metaKey === !0 ||'] },
  // shared-0 PO (globalThis["claude.web"].CoworkSpaces): the local projects as cowork spaces; NI's FI saves through
  // updateSpace (library-pages r2-02).
  'shared-0-CnnWnVrT.js#PO': { name: 'CoworkSpaces', from: 'src/source-project-spaces-bridge.mjs', features: ['PO = globalThis["claude.web"]?.CoworkSpaces'] },
};
export const LINKED_AREAS = ['code-routines-v4', 'cowork-scheduled-v4', 'routines-shared-v4', 'working-line-v4', 'cowork-runs-v4', 'sessions-page-v4',
  { area: 'code-current-v4', modules: ['chunk-shared-2.mjs'] }];
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z0-9]+|c[0-9a-f]+|preload-helper|rolldown-runtime)-/.exec(file)[1]}.mjs`;
// The originals the roots read, one module per chunk (listing a chunk the closure never enters, or entering one not
// listed, stops generation).
export const CHUNKS = [
  'cb4e4d5b7-BCjE4rlU.js', 'c9260427e-CQ_106hh.js', 'c1883549e-LUBWCQ3P.js', 'c409e37e0-B2oDxzoO.js', 'shared-0-CnnWnVrT.js', 'shared-1-D1bGaTaN.js',
  'shared-2-CsjIBQD8.js', 'shared-8-BqfCbkJd.js', 'shared-18-Cfqwgjc5.js', 'shared-19-UalAfDtn.js', 'shared-25-D-aF0gt9.js', 'shared-31-C9BqSSuD.js',
  'shared-33-DtdykY0y.js', 'shared-36-fqRFYwOb.js', 'shared-62-DoCqVpIq.js', 'shared-183-B2N6Zy4J.js', 'shared-212-BHMAi0oa.js', official.sharedFrame,
  'shared-123-1Hc1RTKl.js',
];

// Roots another 4.16336.0 graph already slices (D1: one copy): the index re-exports them from that graph's module, after
// checking the official declaration (features, sha256) and that the linked module holds and exports it.
export const LINKED_ROOTS = {
  // 3.6556.2 cd75b47e6 l (code-routines): the gallery page layout the projects and chats pages render.
  GalleryPageLayout: { key: 'cd75b47e6-BcflIwff.js#C', export: 't', area: 'code-routines-v4', target: 'cd75b47e6-BcflIwff.mjs',
    features: ['"--list-header-scroll-offset": `var(${ee})`', 't(x, { band: o, translucentHeader: d, banner: f, ...a, children: g }),'] },
  // 3.6556.2 cf8745532 u (routines-shared): the project / space card.
  ProjectCard: { key: 'cf8745532-CfAsJsxA.js#u', export: 'n', area: 'routines-shared-v4', target: 'cf8745532-CfAsJsxA.mjs',
    features: ['titleEnd: u,', 'footerClassName: m,', '"df-link-card",', '"data-grid-cell": "",'] },
  // 3.6556.2 shared-18 aC (code-routines): the loading skeleton grid.
  ProjectsLoadingSkeleton: { key: 'shared-18-Cfqwgjc5.js#nE', export: 'Ud', area: 'code-routines-v4', target: 'shared-18-Cfqwgjc5.mjs',
    features: ['typeChip: o,', 'gridClassName: l,'] },
  // 3.6556.2 c365fd3fe n (code-routines): the search result announcement. 4.16336.0 takes the messages as an argument
  // ((count, query, messages, { delay, override })); 3.6556.2 held its own "No {plural} match" copy.
  useProjectsSearchAnnouncement: { key: 'c365fd3fe-BLyjNvkI.js#n', export: 't', area: 'code-routines-v4', target: 'c365fd3fe-BLyjNvkI.mjs',
    features: ['c = o === void 0 ? 500 : o,', 'l.formatMessage(i.noMatch, { query: r })'] },
};
export const LINKED_ROOT_PINS = {
  'cd75b47e6-BcflIwff.js#C': '1bc2f2fb8eda7a8ecbe732ec356abc957bcc7670bae3d172e246197d7f132487',
  'cf8745532-CfAsJsxA.js#u': '044a1def9c075ead6ed12d5760c8833cfaa082d90094eff2c02f914b749067a2',
  'shared-18-Cfqwgjc5.js#nE': '397eb4ed00ed06c87c3438a599b2d8df76969d6137037b2cec6d72b74a5b57d2',
  'c365fd3fe-BLyjNvkI.js#n': '8e56d65a23cda685faebafd383adf06125ed496a43088997c54ba4ac69c9ebb8',
};

// Pinned on the minified bytes (each exactly once): how the 4.16336.0 pages mount these roots, which the host pages
// compose the same way.
const rawCallSites = [
  { source: PROJECT, role: 'The project page lists its Pinned and Recents rows through zl (ProjectSessionTable)',
    features: ['!T&&c(zl,{items:N,onPreviewFile:y,analyticsSource:h,plainRows:v})', 'F.length>0&&c(zl,{items:F,onPreviewFile:y,analyticsSource:h,plainRows:v})'] },
  { source: PROJECT, role: 'The classic project page leads with its own header Mu, and the hub header Ad; the breadcrumb mc carries the All projects link (in the frame title row, or inline without the desktop frame)',
    features: ['K1($,38,_,c(Mu,{project:_}))', 'c(Ad,{primary:t,project:w,space:r,frameActionsPrefix:pr',
      'h&&c(Rp,{children:e=>c(mc,{includeLinkToProjects:!0,allProjectsHref:fr,crumbName:hr,onRenameCrumb:xr,',
      '!h&&c(mc,{includeLinkToProjects:!0,allProjectsHref:fr,crumbName:hr,onRenameCrumb:xr,crumbMenu:Er,plainCrumb:_t})'] },
  { source: PROJECT, role: 'The classic project page grid: the knowledge rail column',
    features: ['s("col-span-7 xl:col-span-5 mt-4 xl:mt-0 xl:ps-12 xl:pe-4",u,d)'] },
  { source: 'shared-26-B-POtn5S.js', role: 'The gate that sends the project route to the newer hub page; off on this host (GrowthBook, D29 / D31)',
    features: ['function QI(){let $=J9(2),e=q("yukon_silver_dramatic_shrimp_atrium");return J1($,0,e)?K1($,0,e,AI):$[1]}'] },
  { source: RAIL, role: 'The knowledge rail: one bordered column of sections inside the drop zone Ii, led by the memory section Li for the "saffron" kind',
    features: ['className:"border-0.5 border-border-300 rounded-2xl flex flex-col",children:[B,be,de,xe,Se,ke,Ae]',
      'i(Ii,{onFiles:L,className:"relative",disabled:N,control:P,message:ye,children:je})', 'D==="saffron"?i(Li,{projectUuid:t.uuid,canEditMemory:M})'] },
  { source: SPACES, role: 'The projects page sorts recent / created / alphabetical and lists tr cards; the card menu (Pin / Unpin, Edit details, Archive)',
    features: ['var Dr=["recent","created","alphabetical"]', 't(tr,{space:r.space,sortBy:_==="created"?"created_at":"updated_at"', '"data-testid":"star-space-trigger"',
      '"data-testid":"archive-space-trigger"'] },
  { source: SPACES, role: 'The projects page card menu opens the Edit details dialog (shared-19 NI, imported as ot)',
    features: ['t(ot,{isOpen:h,onClose:P,spaceId:a.id,spaceName:a.name,spaceDescription:a.description})'] },
];
const modules = () => [
  ...Object.entries(ROOTS).map(([file, roots]) => ({
    source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
    exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
    features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
  })),
  ...CHUNKS.filter(source => !ROOTS[source]).map(source => ({ source, target: target(source) })),
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
// Reviewed pins: raw declaration sha256 (official bytes) of every root and adapted original (`--locate` prints them;
// never refreshed by a script).
export const ROOT_PINS = {
  'c17beaa76-CF6cnZoR.js#tr': '90bfd1c07ba16fd17ef2030ce933b0bf1b4096a80eea6870b5e4a9849ef138d5',
  'c17beaa76-CF6cnZoR.js#Sr': '49c0c6e62f0696779f174e5d640a84f96030eab0a82e013862338ba319a629eb',
  'cbef3b9e7-CCVzzPIb.js#s': 'e5553ac4ed87e3270e8d9bc81d28ab1be0732f7d2b0ff4ae3026c385853a7566',
  'c444bcdd7-BCWTQytB.js#n': 'ec261f94c384290d05abda905f3bf8edef24375157da4e368c51fc0f1c6f5626',
  'shared-140-DfG6VwpK.js#ts': 'fb19520a20ea8a9fb5760a1d7c61e9a723c6c65f351a1e3bf4e0e04094b4da49',
  'c9b54eb90-D0FvVL5w.js#Se': '8c2e797be8c6977f9c75b5fb6cbe725a36ec4f2de77408fd85eb32475d91ccf3',
  'c9b54eb90-D0FvVL5w.js#Ie': '0d6fc93eff8c0653b8075ba5e086a6ad28fb07b48dbe07e43941c75a68520b41',
  'c9b54eb90-D0FvVL5w.js#We': 'e5cf497caa0fd1ce39060b02239bda032f49a613b2b6f2611f5086c52cc1be68',
  'cf2f34ee4-CGe8SQnD.js#Ki': '701f4b12c2a90e50fc28f26c92f3adb0f3331f07a1be00e8e2f94f135842566d',
  'cf2f34ee4-CGe8SQnD.js#hn': 'c61d83966ff7744244f1ebabf1e982b2e0892768ae0273c5af1cab621c63b6f4',
  'cf2f34ee4-CGe8SQnD.js#Ii': 'bc70c27660f587ea6d5800a6693be7740aa7f3653bab6644971650a1c6ee7a25',
  'cf2f34ee4-CGe8SQnD.js#Li': '4b35e7b2743d3852941c630660e31c2e48932c2ec2a993f6663d684f102ffd2f',
  'c71dee58b-CV9X9s_h.js#zl': '720e783e1a661fa2a53824c47685a27168be457c70af2d5a22ce81b93617d105',
  'c71dee58b-CV9X9s_h.js#Mu': '7053c38487562c7ba779a47acc6c6aabaf00590c28f38b0f12f86e4470fdfbda',
  'c71dee58b-CV9X9s_h.js#mc': '5b1903b5f8ea9759c0e543094822d86ddc71ccfbee85ce3189752e5a5d0d6925',
  'c71dee58b-CV9X9s_h.js#iu': '7c2492f83a36a559eb52905fa59e0c7b9053b41ca91e4985045b36266575fc4f',
  'c71dee58b-CV9X9s_h.js#Ad': '0894a48b25c088c5279cded10fe7f30d63b5765632353096aa0e3718669dbb15',
  'shared-19-UalAfDtn.js#NI': '8308edb22fca95a5b58467e8cb28491707f67f29928d33eca8c831a541d49ed0',
  'c9260427e-CQ_106hh.js#ue': 'd81b97cf705df6ed288eea21266a1b674a8a67d73354fdd395d70bc193e3b297',
};
export const ADAPTER_PINS = {
  'shared-26-B-POtn5S.js#EX': '246834f1d16d3b31bc99770e6d5b9df80aaaf8d30e5a6d50ddfa2bd800656054',
  'shared-8-BqfCbkJd.js#WJ': '5f894919043821056d0065af74718e43313f5c523682b90cb7dddb694075ad61',
  'shared-153-DMw2VzSq.js#Cx': '90a61213f8ce185288637f3653294e4d3c09f06d45d6ac42a299819a45cc91a5',
  'c9b54eb90-D0FvVL5w.js#ve': '935fe18fcb1ecbe20f58ffb6158a0a2f82dae423aae18690c7913f9944d00e82',
  'c9b54eb90-D0FvVL5w.js#we': '15d756f869ca32811b5ab9a9423c48bb6e9d8c6b01dac8b8a9759c6c7927bf46',
  'shared-212-BHMAi0oa.js#qW': 'cc49ba1297a70318978a1598e36b194851328a0c87db5c7bd412ff9f81b9b0ac',
  'shared-212-BHMAi0oa.js#k1': '182cfc6ec6efc25fc233f1a4d737a421456ccffb716a233a7e218a20439e2db8',
  'shared-183-B2N6Zy4J.js#kg': 'ce129837cfe61f343c9c08b86d99b3a3632c3a8593a6dbfe367576912bb6de8a',
  'shared-25-D-aF0gt9.js#as': '99a6b8522f37def886cc53d66ce86257bcd0a6fcff6381a9bc258293da9f4fc2',
  'shared-123-1Hc1RTKl.js#PD': '9729566c62397233832f901a1d7569f9fb89894088b012fde701b1190bd99c71',
  'vendor-zod-fszujTq6.js#cc': 'ccddaa2f74591fe9cd80ddbb94d60df6875fad27c631af1eaa587383904a6a9f',
  'vendor-zod-fszujTq6.js#vs': '40af61e49f04afaf4c9e24c38d2ecd2e53f586cc095390e234c17351db2b6db0',
  'shared-212-BHMAi0oa.js#sG': '3164ea8656ffba938ecbae1bf9b044b7da6b69e6eb68dedefd225ae437602e6b',
  'c274117ff-CGNUUDgh.js#O': 'cc14bf935e6a8e3bd1fad1f1878185e765e34dfb49846aebbd4d93db2488fc9b',
  'c274117ff-CGNUUDgh.js#_': 'fb853975d5c0e866c23482e09c02e0785f26858553b2e761fbb8fba1847bdfba',
  'c274117ff-CGNUUDgh.js#v': '92c49a17b61d7758c2e170ded34502346e9b914e95d1ca68e8adafe55373b6e9',
  'shared-212-BHMAi0oa.js#Oz': 'dc1fb761c90a74da91e5385f9e5efcb2fb58c004149fa020c033a09514f4fb4a',
  'shared-212-BHMAi0oa.js#iB': '6d0fbcb0d834570cc65e74cd33855ab2075591db5f36484cb20036eccf2d5aac',
  'shared-212-BHMAi0oa.js#kz': '4cacba11d6dbccbaa69c853b555aad821e639a34bf86d1cb0914f6d6b9bbf7a7',
  'c71dee58b-CV9X9s_h.js#Ml': '77b3b13f1cffddcf026cd5facd307e30a5fe3fccb35bb03bf0f5aa2ed896326c',
  'c71dee58b-CV9X9s_h.js#Ul': 'f25fe9033e3e178eb10e8b362b35a96cbb86f908a3261343cb109c24b379d798',
  'shared-140-DfG6VwpK.js#Il': 'ba5a2bf5a662f69e97c76620e46a5b6f8c491b476dc4d71839df214751eed99b',
  'shared-19-UalAfDtn.js#YL': 'f6c6427ad1566d9f15042e05388b9d009bc073c18fd710a3936ef358409a6519',
  'shared-19-UalAfDtn.js#II': 'cdb604961534de916b018adc912ff217affe23a4ed6a7d6cfa7ea48ae894a23e',
  'shared-19-UalAfDtn.js#ZL': '40a82df41462ddfed43aef73089c855a40b5afc9e3b1b29b5c8050531dc94678',
  'shared-19-UalAfDtn.js#XL': '744899524cbf86300fb730a6ba83e9341388bf52e645df58f15b37af059fc4e4',
  'shared-4-C_EiQb9h.js#gL': '5f3a3c91255956f98dde74c478c6e7d6bc1e72b6c4f86e18a69ece491aeabfff',
  'shared-4-C_EiQb9h.js#hL': '8b30c0ff69f53125b1ef20755969d17875c999594e5a1f5f61476a77f2eff155',
  'c0e977562-BTa72GuX.js#t': '7eb5adce8831b31fb8f749e07c87b17180e64b1e16d30e11a68985f67d6c4e58',
  'c71dee58b-CV9X9s_h.js#cs': '608e32b370f8cb7f1e4b2c3811e5fa05fcadca2438759969ea61b694e73794d3',
  'c71dee58b-CV9X9s_h.js#Au': '5df1b92cd193d566958e1f03c9a74905ed74e970a81626748ca313478705a9f2',
  'c71dee58b-CV9X9s_h.js#ju': 'aeec034ffa37e0dc495d8f86d5bab7df1329dafbcc6801c9e0bf380c83cc1103',
  'shared-212-BHMAi0oa.js#ZW': '8c02df63bfbf9a2df86f8e5d0330a2d2c788fc15705c701433b975765fa8687f',
  'cf2f34ee4-CGe8SQnD.js#$r': '1094d50cb033710a7551d83fa38c502823c20d1ae70748193af1fab3a3275fe6',
  'shared-1-D1bGaTaN.js#K$': 'd833a49cd6bad0119454f0f010aa0fda2462880a99f154a41b5d97f6ee34bdaa',
  'cb4e4d5b7-BCjE4rlU.js#te': 'a2a3401623001f6ef9d563eecf1cfba9d01487539703e55edd6a9b1c2b1accf7',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
  'shared-25-D-aF0gt9.js#Ky': '4884879fdd5f05cd45263c786ab487acc75ba4998798ae34e579b75402024130',
  'shared-25-D-aF0gt9.js#Z': '65456efed4ffae1a16e739336c231a59f0f8fd4f0523de0d58b1ae8c18f0eb74',
  'shared-62-DoCqVpIq.js#rP': '8cc2e61ff0e38fe5049f326f836c21d0376246138aa501f16e392a882f9a8129',
  'shared-62-DoCqVpIq.js#OT': '3c633717a8860b212c950b6eae2980d9f443be740871672219540c921d1525e1',
  'shared-123-1Hc1RTKl.js#_h': 'e135825d8d8e199c2391692ca9b803efdf7ae8ea7bf2847a0f9ba9ca85a7f222',
  'shared-6-2QYRw_Wv.js#zy': 'b649315d9df7db0d81ada27110d1bda5c6a0272a0690b29b29a470ef1b82e93e',
  'shared-123-1Hc1RTKl.js#_L': '0783ed367cf5de2bfa80c4046f05108112d45505b9ebbd4d876a10e482a4fb2a',
  'shared-183-B2N6Zy4J.js#Lh': 'a49e5bc888633cc9f6ecffeceaec30ae58e94b145945991006c56425cb061a9f',
  'shared-25-D-aF0gt9.js#Jo': '0b5c05bc16d74da69449d73ac79d66fccd5e0ee2ec8259fa9e9787deed4aa96d',
  'shared-2-CsjIBQD8.js#Ly': 'c585df371a4918a63ce998eec5c5e49619716b1fcea1a57266915e3dea3f9e3d',
  'shared-0-CnnWnVrT.js#PO': '98d12052c76deb8deb299b35cc8777a8662452bbfe0407a19a8433ecad9f150e',
};

// AST location of every root (the only top-level declaration of its chunk whose raw text has the probe and whose
// prettier form carries every feature, under the reviewed local and export alias, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map(), { report = false } = {}) {
  const found = [], problems = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) { problems.push(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`); continue; }
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) { problems.push(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`); continue; }
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (alias !== spec.export) problems.push(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      if (!pin) problems.push(`${file}#${local}: no reviewed pin`);
      else if (pin !== declarationSha256) problems.push(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256 });
    }
  }
  if (problems.length && !report) throw Error(problems.join('\n'));
  return { found, problems };
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map(), { report = false } = {}) {
  const out = [], problems = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') { problems.push(`adapter ${key} is not a declaration`); continue; }
    if (!spec.features.length) problems.push(`adapter ${key}: no features`);
    try { assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features); } catch (e) { problems.push(e.message); }
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (!pin) problems.push(`adapter ${key}: no reviewed pin`);
    else if (pin !== declarationSha256) problems.push(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256 });
  }
  if (problems.length && !report) throw Error(problems.join('\n'));
  return { found: out, problems };
}

export function chatProjectsV4Config() {
  return {
    name: 'chat projects (4.16336.0)', generator: 'extract-chat-projects-v4.mjs', output: path.join(root, CHAT_PROJECTS_V4_OUTPUT),
    adapterModule: '../../source-chat-projects-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: modules(), rawCallSites, linkedCopies: {}, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = chatProjectsV4Config;

// Each linked root: the official declaration carries its features and hashes as pinned, the linked graph's manifest
// holds the binding in the reviewed module (same chunk), and that module exports it under its own name.
export async function pinLinkedRoots(cache = new Map(), { report = false } = {}) {
  const out = [], problems = [];
  for (const [name, spec] of Object.entries(LINKED_ROOTS)) {
    const [file, local] = spec.key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') { problems.push(`linked root ${spec.key} is not a declaration`); continue; }
    try { assertFeatures(`linked root ${spec.key}`, await featureText(src, entry), spec.features); } catch (e) { problems.push(e.message); }
    const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
    if (alias !== spec.export) problems.push(`${spec.key}: export alias ${alias}, reviewed ${spec.export}`);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = LINKED_ROOT_PINS[spec.key];
    if (!pin) problems.push(`linked root ${spec.key}: no reviewed pin`);
    else if (pin !== declarationSha256) problems.push(`linked root ${spec.key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, spec.area, 'manifest.json'), 'utf8'));
    const mod = manifest.modules.find(m => m.target === spec.target);
    if (!mod || path.basename(mod.source) !== file) problems.push(`${spec.area}/${spec.target} does not slice ${file}`);
    else if (!(mod.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) problems.push(`${spec.area}/${spec.target} does not hold ${local}`);
    const text = await fs.readFile(path.join(generatedRoot, spec.area, spec.target), 'utf8');
    if (!new RegExp(`export \\{[^}]*(?:^|[\\s,])${local.replace('$', '\\$')}(?:[\\s,]|$)[^}]*\\}`, 'm').test(text)) problems.push(`${spec.area}/${spec.target} does not export ${local}`);
    out.push({ name, original: spec.key, area: spec.area, target: spec.target, declarationSha256 });
  }
  if (problems.length && !report) throw Error(problems.join('\n'));
  return { found: out, problems };
}

// The host adapter module exports exactly the adapted names: re-exported from the host adapter that documents it, or
// (from: null) declared by the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const reexported = new Map(), own = new Set();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const part of m[1].split(',').map(x => x.trim()).filter(Boolean)) reexported.set(part.split(/\s+as\s+/).pop(), `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:const|function|async function|class) ([\w$]+)/gm)) own.add(m[1]);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted)
    if (from === null ? !own.has(name) : reexported.get(name) !== from) throw Error(`${ADAPTER_FILE}: ${name} is not ${from === null ? 'declared' : `re-exported from ${from}`}`);
  for (const name of [...reexported.keys(), ...own]) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (from === null) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function|class) ${name.replace('$', '\\$')}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-projects-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export async function extractChatProjectsV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const { found: roots } = await locateRoots(cache);
  const { found: adapters } = await pinAdapters(cache);
  const { found: linkedRoots } = await pinLinkedRoots(cache);
  await assertAdapterModule();
  const linked = {};
  for (const l of LINKED_AREAS) { const area = typeof l === 'string' ? l : l.area; linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'))); }
  const cfg = {
    ...chatProjectsV4Config(),
    async artifacts(m) {
      // Every adapter is used (an unused entry would hide a binding that moved).
      const used = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.includes('#') ? i.via.split('#')[0] : i.via.split(':')[0]}#${i.original}`)));
      const unused = Object.keys(HOST_ADAPTERS).filter(k => !used.has(k));
      if (unused.length) throw Error(`unused adapters: ${unused.join(', ')}`);
      const names = [...Object.values(ROOTS).flatMap(rs => Object.values(rs).map(r => r.name)), ...Object.keys(LINKED_ROOTS)];
      if (new Set(names).size !== names.length) throw Error('a semantic name is used twice');
      return {
        'index.mjs': `// Semantic names for the chat-projects roots (${official.referenceVersion}); generated by extract-chat-projects-v4.mjs.\n`
          + Object.entries(LINKED_ROOTS).map(([name, l]) => `export { ${l.key.split('#')[1]} as ${name} } from "../${l.area}/${l.target}";`).join('\n') + '\n'
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-projects-v4.mjs',
          previous: { generator: 'scripts/extract-chat-projects.mjs', output: 'src/generated/chat-projects', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, roots, linkedRoots, adapters,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const r = await locateRoots(new Map(), { report: true }), a = await pinAdapters(new Map(), { report: true }), l = await pinLinkedRoots(new Map(), { report: true });
    for (const f of r.found) console.log('root', `${f.file}#${f.local}`, f.export, f.declarationSha256);
    for (const f of a.found) console.log('adapter', f.original, f.declarationSha256);
    for (const f of l.found) console.log('linked', f.original, f.declarationSha256);
    for (const p of [...r.problems, ...a.problems, ...l.problems].filter(p => !/no reviewed pin/.test(p))) console.log('PROBLEM', p);
  } else await extractChatProjectsV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
