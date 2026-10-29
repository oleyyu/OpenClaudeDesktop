// w10-curchat-projects (3.6556.2 migration wave 10, research/w10-curchat.md CC-11 / CC-15, plan-w10.md
// "w10-curchat-projects"): extract the 3.6556.2 projects page parts without executing any desktop runtime (decision D0:
// own generator, own output folder src/generated/chat-projects, own scripts/verify-gen-chat-projects.mjs). Replaces the
// 2.31226.0 current-chat slices c193cfc9b _, cf8745532 l, cbef3b9e7 s, c71dee58b pu and c75e89812 i / a that
// src/source-projects.jsx rendered.
//
//   cbef3b9e7  s (export t), the CDS empty state (pictogram by variant, headline, description, CTA) the projects page
//              shows with variant "projects" / "error".
//   c71dee58b  id, the project header (name h1, archived badge, pin / star toggle, project menu, description). Its
//              services (sharing, raven, the project PATCH, the menu body) are host adapters below.
//   c17beaa76  Fn, the cowork space card the projects page (cr) lists: ProjectCard with the pin mark, the date
//              (CdsRelativeTime) and the folder chip; the host feeds it its local projects as spaces.
//   c444bcdd7  t / c365fd3fe n: the search keyboard hook (ArrowDown into results, Escape back) and the result count
//              announcement cr passes to the page status.
//   cd75b47e6 l (code-routines), cf8745532 u (routines-shared), shared-18 aC (the loading skeleton) are held by other
//              3.6556.2 graphs; the index re-exports them under semantic names (D1: one copy).
// cr itself (account routing, the claude.ai project list, the space create flow) is not sliced: the host page composes
// these parts the way cr does (rawCallSites pin that composition).
//
// The engine is the code-routines one (scripts/extract-code-routines.mjs): every emitted binding is an original
// top-level declaration sliced from the 3.6556.2 chunk; the bindings of each chunk are the reachable closure of the roots
// across chunks. A binding resolves, in this order, to: a named host adapter in src/source-project-v3-adapters.jsx (its
// original declaration must carry `features`), an adapter another 3.6556.2 graph already answers it with (that graph's
// adapter module, the same host service), a vendor-frame React export (official-3.6556.2.mjs reactAliases, checked with
// assertVendorAlias; R3), a semantic public name of view-tabs (D1/E3), a binding another 3.6556.2 graph holds
// (routines-shared, code-routines, cowork-scheduled: imported from its generated module under the original local name,
// so contexts stay one object each), or a copy in this graph's module for its chunk. Features (R2/E5) match the
// declaration's prettier form as text or through looseFeature().
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/chat-projects');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-project-v3-adapters.jsx';
// Other 3.6556.2 graphs whose slices this graph imports instead of copying (D1), in priority order.
const heldGraphs = ["routines-shared", "code-routines", "cowork-scheduled", "artifact-library", "cowork-home", "cowork-progress", "sessions-page"];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. A root another 3.6556.2 graph already holds
// (cd75b47e6 l in code-routines, cf8745532 u in routines-shared) is re-exported from that graph's module (D1).
const roots = {
  'cd75b47e6-D74qtVoh.js': {
    l: { name: 'GalleryPageLayout', export: 't', features: ['band: p, translucentHeader: v, banner: y, ...f, children: x', '"--list-header-scroll-offset": `var(${s})`'] },
  },
  'cf8745532-5Ehsv_zP.js': {
    u: { name: 'ProjectCard', export: 'n', features: ['titleEnd: u,', 'footerClassName: m,', '"df-link-card",', '"data-grid-cell": "",'] },
  },
  'c17beaa76-B-uF-Ixb.js': {
    Fn: { name: 'ProjectSpaceCard', features: ['showLocalBadge: l,', 'defaultMessage: "Runs on this computer",',
      'name: h ? "PinFilled" : "StarFilled",', 'footerClassName: "mt-auto items-center",', '"inline-flex min-w-0 max-w-40 items-center gap-1 text-secondary",'] },
  },
  'cbef3b9e7-D1tReYw7.js': {
    s: { name: 'ProjectsEmptyState', export: 't', features: ['headlineLevel: l,', 'ctaBusyLabel: S,', '"items-start pb-12 text-start"', '"items-center justify-center px-md py-12 text-center"',
      '"max-w-xs font-medium text-secondary"', '"max-w-xs text-footnote text-secondary"'] },
  },
  'shared-18-D3y8YMFN.js': {
    aC: { name: 'ProjectsLoadingSkeleton', export: 'Ou', features: ['gridClassName: l,', 'typeChip: o,'] },
  },
  'c444bcdd7-DSxXMeFI.js': {
    t: { name: 'useProjectsSearchKeys', export: 't', features: ['querySelectorAll("[data-primary]")', 'e.key !== "ArrowDown" && e.key !== "ArrowUp"'] },
  },
  'c365fd3fe-Kq3IZlO6.js': {
    n: { name: 'useProjectsSearchAnnouncement', export: 't', features: ['defaultMessage: "No {plural} match \\u201C{query}\\u201D",'] },
  },
  // w13-chatui-project-detail (research/w13-chatui.md P2 / P3): the knowledge rail's Instructions section (cf2f34ee4 ri:
  // header, the Edit / Add button, the instructions text or its placeholder) opening c9b54eb90 ze (exported t, the
  // "Set project instructions" dialog over Be: the textarea, Cancel, "Save instructions" / "Clear instructions"); the
  // rail divider (cf2f34ee4 Yt) and the project page's conversation section heading (c71dee58b Ql: plain or
  // collapsible with Show / Hide), which the host page composes the way c71dee58b Up / Wp / Zl do (rawCallSites).
  // w13-close-chat-project-rows: the conversation menu's Rename dialog (shared-16 hu: "Rename chat" over the name field
  // name-chat, Cancel / Save name-chat-submit), which the host page opens for the row menu's Rename (Ff startRename).
  'shared-16-ByfgAyLr.js': {
    hu: { name: 'RenameChatDialog', features: ['conversationUuid: o,', 'onRenamed: c,', '} = ti(o, s),',
      'f.renameDialogTitle', '"data-testid": "name-chat",', '"data-testid": "name-chat-submit",', 'defaultMessage: "Save",'] },
  },
  'c9b54eb90-C9rXk4ZP.js': {
    // w13-chatfn-tools (chatfn-23): _e, the project's recommendations ({ tool, recommended } over pe's tools, skipping
    // builtin:extended-thinking) and their update (`n({settings:o})`). The rail and the dialog reach it through De / je;
    // the host page also calls it once to hand the strip's ye adapter the same list (an adapter can't import this graph).
    _e: { name: 'useProjectRecommendations', features: ['e.id === "builtin:extended-thinking" ||', 't = r?.recommended_mcp_servers?.includes(n) || !1;',
      'n({ settings: o }));', '{ recommendations: i, update: a }'] },
    // je, the dialog's tools view (ze's `tools` view: "Power your project with tools", the builtin Tools and the
    // Connectors as switches, Cancel / Save → _e update); a root so the host tests can render it outside ze's portal.
    je: { name: 'ProjectToolsView', features: ['defaultMessage: "Power your project with tools",', 'defaultMessage: "No available tools.",', '{ recommendations: h, update: v } = _e(s),',
      '"flex max-h-[60vh] flex-col gap-4 overflow-y-auto"'] },
    ze: { name: 'ProjectInstructionsDialog', export: 't', features: ['defaultMessage: "Set project instructions",', 'defaultMessage: "Project instructions",',
      'defaultMessage: "Error saving instructions, please try again later",', 'N({ prompt_template: e })', 'v.instructionsProvide', 'v.instructionsWorkAlongside',
      'U("instructions")', 'size: "md",'] },
  },
  'cf2f34ee4-uPxXNyjx.js': {
    ri: { name: 'ProjectInstructionsSection', features: ['hideRecommendedTools: c,', 'defaultMessage: "Instructions",', 'defaultMessage: "Edit instructions",',
      'defaultMessage: "View instructions",', 'defaultMessage: "Add instructions to tailor Claude\\u2019s responses",', 'defaultMessage: "Couldn\\u2019t load instructions.",',
      'name: h ? "Edit" : "Add",', 'className: "opacity-60",', '"flex flex-row items-center justify-between gap-4 mt-1"'] },
    Yt: { name: 'ProjectRailDivider', features: ['"h-[0.5px] w-full bg-border"'] },
    // w13-chatui-project-detail (review fix): Gr's drop zone around the whole rail (qr: the zone props, the drop overlay ii
    // "Drop files here to add to project knowledge", the picker provider rn) and the project memory section Gr shows for
    // Ir(t.uuid).kind "saffron" (Jr: "Memory" header with the "Only you" badge Zt, the memory text or its placeholder,
    // "Edit memory", "Last updated {time}"); the host composes them the way Gr does (rawCallSites).
    qr: { name: 'ProjectKnowledgeDropZone', features: ['onFiles: t, disabled: n, control: i, className: a, message: o, children: c,', 'u.getZoneProps({ className: a })',
      'r(ii, { dragState: u.dragState, message: o })'] },
    Jr: { name: 'ProjectMemorySection', features: ['{ projectUuid: n, canEditMemory: i } = e,', 'defaultMessage: "Couldn\\u2019t load project memory.",', 'defaultMessage: "Edit memory",',
      '"Resynthesize memory (team only)"', 'a.memoryAfterAFew', '"font-small text-muted-as-secondary opacity-60 pt-0.5"', 'r(Zt, { variant: "private" })'] },
  },
  'c71dee58b-CFm4FCDB.js': {
    // w13-close-chat-project-rows: Zl's row list Ol (the SpaceSessionTable): view-tabs' CdsDataTable (ce802b15a Mo, `bo`)
    // over the one-column Tl (wl: Nl for a chat row, Ml for a cowork row), keyed by _l, linked by vl through the row link
    // Sl, flush; the host page hands it Zl's items ({kind:"chat", conversation} / {kind:"cowork", session}).
    Ol: { name: 'ProjectSessionTable', features: ['{ items: t, onPreviewFile: n, analyticsSource: r, plainRows: i } = e,', 'getRowLinkLabel: m,', 'linkComponent: Sl,', 'flush: !0,',
      'defaultMessage: "Local task",', '"claudeai.conversation.recent.opened"'] },
    // w13-chatui-project-detail (review fix): the classic page Up's own header (Eu: the h1, the archived badge, the Example
    // project badge, the Pin button shared-78 gK chooses, the project menu Ui, the collapsible description) and its
    // breadcrumb (nc with gK true: the "All projects" link card inside the page title row sn).
    Eu: { name: 'ProjectPageHeader', features: ['"mt-0.5 min-w-0 font-heading text-secondary gap-1.5 text-start line-clamp-2 break-words"', 'defaultMessage: "Example project",',
      'icon: t.is_starred ? "PinFilled" : "Pin",', 'buttonSize: "icon_sm"', '"flex flex-row justify-between gap-4 text-muted-as-secondary mt-2 font-small"', 'source: "project_header",'] },
    nc: { name: 'ProjectBreadcrumb', features: ['includeLinkToProjects: t,', 'liftInto: c,', 'defaultMessage: "All projects",',
      '"df-link-card inline-flex h-6 shrink-0 select-none items-center gap-1 rounded-md px-1.5 text-[13px] text-secondary-control transition-colors hover:bg-neutral-30 hover:text-primary"',
      'contentEndsWithRow: !0,'] },
    Ql: { name: 'ProjectSessionsHeading', features: ['isCollapsible: n,', 'onToggleCollapse: i', '"group/header flex items-center justify-between gap-2 text-start"',
      'defaultMessage: "Show",', 'defaultMessage: "Hide",', '"text-xs text-muted-as-secondary opacity-0 group-hover/header:opacity-75 transition-opacity"'] },
    id: { name: 'ProjectHeader', features: ['menuInCrumb: m,', 'hidePin: h,', 'defaultMessage: "Unpin project",', 'icon: "PinFilled",', 'defaultMessage: "Pin project",',
      '"font-heading text-primary line-clamp-2 break-words min-w-0"', '"mt-1 text-body text-secondary whitespace-pre-line line-clamp-3 break-words"'] },
  },
};
const lazyImports = {};
const vendorCopies = {};
// w13-chatui-project-detail: vendor-motion bindings (framer-motion as the desktop ships it) the drop overlay (cf2f34ee4 ii)
// renders with: motion (fd) and AnimatePresence (ul). working-line slices vendor-motion once and exports them (D1).
const linkedVendors = {
  'vendor-motion-DlXQpU4V.js#fd': { graph: 'working-line', target: 'vendor-motion.mjs' },
  'vendor-motion-DlXQpU4V.js#ul': { graph: 'working-line', target: 'vendor-motion.mjs' },
  // w13-close-chat-project-rows: Ol's cowork href prefix (vl's `et`, shared-52 gl = "/cowork"), which cowork-runs slices
  // and exports (D1: imported, not copied).
  'shared-52-uHFNjl7C.js#gl': { graph: 'cowork-runs', target: 'shared-52-uHFNjl7C.mjs' },
};
const adapterTable = {
  // w13-chatui-project-detail: the instructions section's services. w13-chatfn-tools (chatfn-23, the review's 补做): the
  // recommended tools strip De (with Ae / Ee) and the dialog's tools view je (with Re) are sliced; their claude.ai
  // services are these adapters (local projects' settings, this machine's cores and connectors).
  'c9b54eb90-C9rXk4ZP.js': {
    pe: { name: 'useProjectToolOptions', features: ['"claude_ai_haystack_integrations"', 'id: "builtin:web-search"', 'id: "builtin:research"', 'id: "builtin:extended-thinking"',
      'web_search_enabled: !0'],
      boundary: 'The tools a project can recommend are this machine\'s: Web search and Research when the running core can search (chat-tools-model.mjs searchSupport), Extended thinking (which _e skips), and the customize connectors (MCP servers); no claude.ai org features, first-party integrations or directory servers.' },
    ye: { name: 'useRecommendedToolConfigs', features: ['toggleConversationSetting: O', 'batchToggleConversationSettingsAndMCPTools: j', 'enableAllTools: J,', 'source: G.RecommendedToolConnect'],
      boundary: 'The conversation the strip switches is the project page\'s New chat (config.chatTools defaults through main.cjs "chat-tools" set), a connector\'s tools are its customize MCP server switch; no claude.ai connect flow (a disconnected connector opens nothing).' },
  },
  // w13-close-chat-project-rows: Ol's chat cell Nl (and the row link Sl) open the conversation menu (shared-16 Lf → Rf →
  // Mf / Ff); hu's rename mutation.
  'shared-16-ByfgAyLr.js': {
    Lf: { name: 'ProjectConversationMenu', features: ['n = Te(e.onSelectForBulk),', 'onRenameStart: i,'],
      also: { Ff: ['"data-testid": "star-chat-trigger",', 'icon: t.is_starred ? "PinSlash" : "Pin",', '"data-testid": "rename-chat-trigger",', '"data-testid": "delete-chat-trigger",',
        'shortcut: "d",', 'J.set("d", e)'], zf: ['onKeyDownCapture: g'] },
      boundary: 'The conversation menu (Ff\'s items for a project page row: Pin / Unpin, Rename, Delete, with their p / r / d keys) acts on the local session (main.jsx sessionAction pin / unpin, the sliced Rename chat dialog, the host Delete chat confirmation); its project, artifact, archive and read-state items (claude.ai services or props this caller does not pass) and the right-click variant are not offered.' },
  },
  'shared-130-dWztbTO1.js': {
    B_: { name: 'useRenameConversation', features: ['`/api/organizations/${a}/chat_conversations/${s}`', '"PUT"'],
      boundary: 'Renaming a chat renames the local session (main.jsx sessionAction rename) instead of PUTting the claude.ai conversation.' },
  },
  'shared-25-DOWZRSlq.js': {
    zs: { name: 'useProjectDynamicConfigValue', features: ['type: "dynamic_config_value",'],
      boundary: 'No Statsig dynamic configs: claude_ai_haystack_integrations answers its fallback ([]), so the tools view lists no first-party integrations.' },
  },
  'vendor-zod-fszujTq6.js': {
    cc: { name: 'zodArraySchema', features: ['return Aa(sc, e, t);'], boundary: 'The zod schema je hands the dynamic config hook is never consulted (no dynamic configs): an inert schema.' },
    vs: { name: 'zodStringSchema', features: ['return Oi(_s, e);'], boundary: 'The zod schema je hands the dynamic config hook is never consulted (no dynamic configs): an inert schema.' },
  },
  'shared-78-D5Fw2h0a.js': {
    WF: { name: 'ConnectorFavicon', features: ['disableServerUrlLookups: t,', 'skipPrivateSuffixHosts: o,', 'name: "Globe",'],
      boundary: 'A connector\'s favicon is looked up through a remote favicon service; this host makes no such request (E59), so the official fallback (the letter avatar Ee passes) renders.' },
  },
  'cf2f34ee4-uPxXNyjx.js': {
    // w13-chatui-project-detail (review fix): Zt (the audience badge) is sliced: the memory section Jr shows its "private"
    // variant ("Only you"), and ri renders it only for a shared project (never here).
    // w13-chatui-project-detail (review fix): the classic header Eu's Example project badge wrapper.
    ur: { name: 'ExampleProjectTooltip', features: ['defaultMessage: "This is an example project. Create a new project to work with your own documents.",', 'n.push("/projects/create")'],
      boundary: 'The example-project tooltip (and the project-limit upsell it can open, shared-3 UR over the lazy ca3e55b0e chunk) wraps the Example project badge, which only a claude.ai starter project shows; a local project never is one, so the badge renders as is.' },
  },
  // w13-chatui-project-detail (review fix): the drop zone's file hook (cb4e4d5b7 Q) and the project memory section's services.
  'cb4e4d5b7-JEa8C518.js': {
    te: { name: 'loadExtensionMimes', features: ['import("./c911e1a3d-BSO9zB2d.js")', 'e?.mimes !== void 0'],
      boundary: 'The extension-to-MIME table chunk (c911e1a3d) is not loaded: it only refines `accept` filtering, and the project drop zone accepts any file (main converts or refuses each one).' },
  },
  'c274117ff-D-nlAnp_.js': {
    v: { name: 'useProjectMemoryModal', features: ['e.get("modal")', 'o("synthesis")', 't("modal", e ? "memory" : null)'],
      boundary: 'The memory dialog\'s open state lives in the project page instead of the ?modal=memory search parameter (the host has no URL router).' },
    _: { name: 'useMemoryAvailable', features: ['e === "project" && n === "disabled_by_user" && r === !0'],
      boundary: 'Memory is available when this machine\'s local memory (electron/chat-memory.mjs, Settings > Memory) is on and not paused.' },
    O: { name: 'ProjectMemoryDialog', features: ['modalView: l,', 'setModalView: d,', 'bottomCTA: p,', 'backdropClassName: h,'],
      boundary: 'The project\'s "Manage memory" dialog is the host one (source-settings-memory.jsx MemoryManageDialog, the c274117ff O layout) over the local project memory (chat-memory controls with projectId).' },
  },
  'shared-156-BLTosN8U.js': {
    ch: { name: 'useSettingsLinkClick', features: ['sh(t) && Nh(e) && t.preventDefault();'],
      boundary: 'The "profile instructions" link (/settings/general) opens the host Settings page holding the profile (global) instructions, Settings > Instructions (bm.instructions; the host page id "instructions"): the click is prevented, so the window never navigates to a claude.ai route.' },
  },
  'shared-1-BJhqMmkf.js': {
    xR: { name: 'NamedPictogram', features: ['f(SR, { ...e }, e.name)'], also: { SR: ['"animate-lazy-pictogram-fade-in"', 'flexShrink: 0'], pR: ['import("./c79901f9f-Cm-j1Fuc.js")'] },
      boundary: 'Pictogram defs are bundled on the host (source-pictogram.jsx) instead of the lazy pictogram_def_loaders chunk, so there is no empty placeholder frame or fade-in.' },
  },
  'c71dee58b-CFm4FCDB.js': {
    // w13-close-chat-project-rows: Ol's cowork cells. Ml (the hub session row: live status dot, review popover, the files
    // strip, the inline tool approval and the session menu yl) reads the claude.ai session stores; xl (the row link with
    // yl's context menu) is what Sl renders for a cowork href.
    Ml: { name: 'ProjectCoworkSessionRow', features: ['scheduledTask: r,', 'plain: c,',
      'canShowReviewPopover: v', 'defaultMessage: "Needs attention",'],
      boundary: 'A cowork session filed in a local project is a row of the official row layout (c75e89812 jo) with its title ("Local task" when untitled) and relative date; no live status dot, review popover, files strip, inline approval or session menu (those read the claude.ai session stores).' },
    xl: { name: 'ProjectCoworkRowLink', features: ['{ session: t, analyticsSource: n, linkProps: r } = e,', '{ menuProps: i } = yl(t, n),', 'contextMenuTrigger: a'],
      boundary: 'A cowork row\'s link is the router link alone, without yl\'s session context menu (claude.ai archive / rename / delete services).' },
    Tu: { name: 'useProjectSubtitle', features: ['if (!e || !n)', 'subTitle: null', 'defaultMessage: "Shared with your organization",'],
      boundary: 'No subtitle or share descriptor: Tu returns { subTitle: null } when raven (team plan) is off, which it is without an account.' },
    Jo: { name: 'projectShareModal', features: ['id: "project_share_modal",', 'pick: (e) => e.ProjectShareModal,'],
      boundary: 'The project share modal chunk (c8d15a635) is not loaded: the share button it serves needs raven.' },
    wu: { name: 'ProjectShareDialog', features: ['defaultMessage: "Share project",', 'surface: "project",'],
      boundary: 'The share-link dialog is not rendered: it opens only from the Share button, which needs an account.' },
  },
  'shared-182-BI1KJccu.js': {
    // w13-close-chat-project-rows (E69): kG off, as the official default without an account (E49).
    kG: { name: 'useIntegrationsAvailable', features: ['return va("haystack").isAvailable;'],
      boundary: 'Integrations (haystack: the shared-78 org feature under the GrowthBook haystack_enabled gate) are off, as without an account (E49/E69), so the recommended tools strip (c9b54eb90 De) renders nothing; its model stays (one constant turns it on).' },
    // w13-chatui-project-detail (review fix): the project memory section (cf2f34ee4 Jr) reads these.
    SA: { name: 'useMemoryResynthesizeEnabled', features: ['"claudeai_saffron_frontend"', '"resynthesize_enabled"'],
      boundary: 'The team-only "Resynthesize memory" button stays hidden: its GrowthBook flag (claudeai_saffron_frontend.resynthesize_enabled, default false) is off here (D29/D31).' },
    tA: { name: 'useMemoryResynthesize', features: ['`/api/organizations/${r}/memory/synthesize`', 'resynthesizeMemory: f, isResynthesizingMemory: p'],
      boundary: 'No claude.ai memory synthesis endpoint: the button that calls it is hidden (resynthesize_enabled off).' },
    $k: { name: 'useProjectMemoryQuery', features: ['memory?project_uuid=${e}', 'includeProjectImport: c'],
      boundary: 'The project memory ({memory, updated_at}) is read from the local memory store (<userData>/memory/projects/<id>.md, chat-memory state with projectId) instead of /api/organizations/<org>/memory.' },
    Hz: { name: 'useProjectQueriesInvalidate', features: ['"removeQueries" : "invalidateQueries"', '[Vt, { orgUuid: t, projectUuid: e }],'],
      boundary: 'No claude.ai project queries to invalidate or remove: the local project record is updated only when the save succeeds.' },
    Oz: { name: 'useProjectMutation', features: ['`/api/organizations/${n}/projects/${e}`'],
      boundary: 'The pin toggle, the instructions and the recommended tools write the local project (local-projects update isStarred / instructions / settings) instead of PATCHing the claude.ai project.' },
    // w11-sweep-curchat (R2/E5): the starred-project query rewrites tell Mz apart, not only its rollback guard.
    Mz: { name: 'useProjectOptimisticUpdate', features: ['i?.rollback', '{ ...e, is_starred: r }', '[{ ...n, is_starred: !0 }, ...e]', 'predicate: (e) => !a(e) },'],
      boundary: 'The optimistic pin update patches the host project record instead of the claude.ai project list queries.' },
  },
  'shared-8-Db1QN4mf.js': {
    xq: { name: 'useLocalSpaceSelector', features: ['xq = ci("cowork-starred-spaces")'],
      boundary: 'The starred-spaces store is the host projects page context (its pinned local projects); nothing is persisted per space.' },
  },
  'shared-26-CGuBxVt9.js': {
    Gz: { name: 'ProjectHeaderGatedSlot', features: ['surface: "header", project: t'],
      boundary: 'The gated header slot (cai_calm_dusk gated import) renders nothing: no gated imports are served to this host.' },
  },
  'c0e977562-DIKf9x9v.js': {
    // The whole two-function module is pinned byte for byte by its raw call site below (R2/E5, w11-sweep-curchat).
    t: { name: 'useProjectShareEligible', features: ['return e();'],
      boundary: 'Raven eligibility (/api/account/raven_eligible) is false without an account, so the Share upsell button is hidden.' },
  },
  'shared-19-DIKJVT7c.js': {
    PF: { name: 'SpaceMenu', features: ['space: t,', 'buttonSize: n,', 'contextMenuTrigger: o,'],
      boundary: 'The cowork space menu is not rendered: the header renders it only for a space.' },
    DI: { name: 'DeferredProjectMenu', features: ['contextMenuTrigger: n,', 'openEvent: p'],
      boundary: 'The deferred-body project context menu is unreachable: the header passes no deferMenuBody.' },
    EI: { name: 'DeferredProjectMenu', features: ['requestBody: _,', 'mode: "dropdown",'],
      boundary: 'The deferred-body project dropdown is unreachable: the header passes no deferMenuBody.' },
    TI: { name: 'useProjectMenuItems', features: ['showEditItems: r,', 'showDebugItems: i,', 'hasDebugMenu: P'], also: { AI: ['defaultMessage: "Edit details",', '"data-testid": "rename-project-trigger",', 'defaultMessage: "Archive",'] },
      boundary: 'The project menu keeps the official Edit details item and adds the host Project instructions and Open folder items; Report, Archive and Delete (claude.ai project APIs) and the official dialogs are not offered.' },
  },
  'shared-4-DUB1Oi0O.js': {
    Zb: { name: 'useProjectPermissions', features: ['{ projectUuid: t, enabled: n, placeholderFromLists: r } = e,'],
      boundary: 'Local projects are always editable (hasSettingsEditPermission true); there is no org permission query.' },
    // w13-chatui-project-detail (review fix): the classic header Eu's pin toggle (imported there as en).
    Xb: { name: 'useProjectStarToggle', features: ['t({ is_starred: e }).catch(', 'r(n, !e, { rollback: !0 });'],
      boundary: 'The header Pin button toggles the local project\'s isStarred (local-projects update) instead of the claude.ai project PATCH with its optimistic list update.' },
  },
};
const rawCallSites = [
  // w13-chatui-project-detail: without yukon_silver_dramatic_shrimp_atrium (shared-26 ak, a GrowthBook gate the host
  // leaves off, D29/D31) the project route (c71dee58b Hp) renders the classic page Up; the host page composes Up's grid:
  // the left column Gp (header, composer, conversations in pb-20 under Su), the knowledge rail Wp ({role:"region",
  // "aria-label":"Project knowledge"} from ns) holding cf2f34ee4 Gr's bordered rail; Zl's Pinned / Recents sections,
  // its 20-row paging and its empty state with Su's message su.
  { source: 'c71dee58b-CFm4FCDB.js', role: 'The classic project page (Up) and its parts the host page composes: the grid, the left column, the knowledge rail, the conversation sections and their empty state',
    features: ['!i){let e=J2($,35,d,t)?K2($,35,d,t,l(Up,{uuid:t,composer:d})):$[37]', 'se=!U&&"max-lg:overflow-y-auto"', 's("flex-1 min-w-0 overflow-y-auto",ue,gr,de)',
      'ue=U?"min-h-0":"h-full max-lg:flex-none max-lg:h-auto max-lg:overflow-y-visible"', 'l(Pr,{className:"grid grid-cols-7 xl:grid-cols-12"', '"col-span-7 flex flex-col gap-4"',
      '"col-span-7 xl:col-span-5 mt-4 xl:mt-0 xl:ps-12 xl:pe-4"', '{role:"region","aria-label":i}', 'l(Ha,{project:g,hasEditPermissions:C,isProjectShared:S})',
      'l("div",{className:"col-span-7 flex flex-col mt-2 gap-4",children:l(Su,{projectUuid:t,isArchived:w})', 'className:"pb-20"', 'Xl=20', 'xe.COWORK_SPACE_STARRED_COLLAPSED',
      'className:"flex flex-col items-center justify-center gap-sm py-16 text-center"', 'name:"Chat",size:"xxl",className:"text-muted-as-secondary"',
      'defaultMessage:"Claude references the same knowledge every time you talk to it in this project.",id:"8vqFHSl3AB"',
      'className:"self-center text-sm text-muted-as-secondary hover:text-secondary transition-colors py-2 disabled:opacity-50"'] },
  // w13-close-chat-project-rows: both Zl sections render their rows through Ol (the host page builds the same items).
  { source: 'c71dee58b-CFm4FCDB.js', role: 'Zl renders the Pinned and Recents rows through Ol, over items a chat row maps to {kind:"chat", conversation, hasBeenShared} and a session to {kind:"cowork", session, isUnread}',
    features: ['!w&&l(Ol,{items:N,onPreviewFile:v,analyticsSource:m,plainRows:_})', 'F.length>0&&l(Ol,{items:F,onPreviewFile:v,analyticsSource:m,plainRows:_})',
      'e=>e.kind==="chat"?{kind:"chat",conversation:e.conversation,hasBeenShared:u?.has(e.conversation.uuid)??!1}:{kind:"cowork",session:e.session,isUnread:Pn(e.session,y)}'] },
  { source: 'shared-18-D3y8YMFN.js', role: 'The page frame Up imports as gr (Fv, the stable scrollbar gutter of its scroll column) and Pr (AC, the centred max-w-7xl content box its grid sits in)',
    features: ['Fv="[scrollbar-gutter:stable]"', 'f("mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6",a,n)'] },
  { source: 'shared-26-CGuBxVt9.js', role: 'The gate (ak, exported po) that sends the project route to the newer hub page jp; off on this host',
    features: ['function ak(){let $=J9(2),e=W("yukon_silver_dramatic_shrimp_atrium");return J1($,0,e)?K1($,0,e,zO):$[1]}'] },
  { source: 'cf2f34ee4-uPxXNyjx.js', role: 'Gr, the knowledge rail: one bordered column of sections (memory, instructions, tags, files)',
    features: ['className:"border-0.5 border-border-300 rounded-2xl flex flex-col"', 'children:[V,ve,le,ye,Se,De,Oe]'] },
  // w13-chatui-project-detail (review fix): how Gr places the drop zone and the memory section the host composes.
  { source: 'cf2f34ee4-uPxXNyjx.js', role: 'Gr wraps the bordered rail in the drop zone qr and leads it with the memory slot Zr (Jr for the "saffron" kind, a divider after it)',
    features: ['r(qr,{onFiles:R,className:"relative",disabled:N,control:P,message:_e,children:ke})',
      've=J5($,48,se,X,g,ge,fe)?K5($,48,se,X,g,ge,fe,!g&&r(Zr,{...ge,dividerBefore:!1,dividerAfter:X||se||!!fe})):$[53]',
      'D==="melange"?r($r,{project:t}):D==="saffron"?r(Jr,{projectUuid:t.uuid,canEditMemory:M})'] },
  { source: 'c71dee58b-CFm4FCDB.js', role: 'Up renders its own header Eu first in Gp, and the breadcrumb nc, in place over a scroll column padded by the title row when nothing lifts it',
    features: ['xe=J1($,38,g)?K1($,38,g,l(Eu,{project:g})):$[39]', 'l(nc,{includeLinkToProjects:!0,allProjectsHref:G,plainCrumb:a,liftInto:H})', '!ee&&"pt-frame-row"'] },
  { source: 'shared-16-ByfgAyLr.js', role: 'ia (Es): the title-row lift slot Up asks for; null unless the frame registers a title row (Ts), so nc renders in place',
    features: ['function Es(e){let $=J9(3),t=e===void 0||e,n=On(),r=rr(),i=V(),a=Ts(t&&n&&r&&!i),o=a!==null;'] },
  // c17beaa76 ir: the project card's overlay menu (shared-78 gK is true, so Pin / Unpin with Pin / PinSlash); its Archive
  // item and confirmation delete the claude.ai space, which the host does not offer.
  { source: 'c17beaa76-B-uF-Ixb.js', role: 'The project card menu (ir) the host card renders as its overlay: Pin / Unpin, Edit details; Archive is not offered',
    features: ['overlay:n(ir,{space:t.space,isStarred:K.has(t.space.id)})', 'icon:"DotsVertical",variant:"ghost",tooltip:!1,className:"pointer-events-auto"',
      'defaultMessage:"More options for {label}",id:"rKQPgfPvWS"', 'w=d?r?"PinSlash":"Pin":r?"StarSlash":"Star"', '"data-testid":"star-space-trigger"',
      '"data-testid":"rename-space-trigger"', '"data-testid":"archive-space-trigger"'] },
  { source: 'c17beaa76-B-uF-Ixb.js', role: 'The 3.6556.2 projects page (cr, exported r) the host page composes: the gallery layout with contentGap "lg", search, the sort icon action over recent / created / alphabetical, the space card grid and the no-match line',
    features: ['contentGap:"lg",title:je,search:Le,iconActions:Be,primaryAction:Ve,status:He', '[{key:"sort",icon:"Sort",label:Re,items:ge}]', 'sr=["recent","created","alphabetical"]',
      'className:"grid grid-cols-1 gap-x-3 md:grid-cols-2 md:gap-x-6"', 'className:"row-span-2 mb-3 grid grid-rows-subgrid md:mb-6"', 'sortBy:_==="created"?"created_at":"updated_at"',
      'n(qe,{count:8,columns:"two"})', 'variant:k?"projects":"locked"', 'export{vi as n,cr as r,_i as t}'] },
  { source: 'c0e977562-DIKf9x9v.js', role: 'Raven eligibility (t, exported n) over shared-25 Lr (iV); the header gates its Share upsell on it',
    features: ['import{Lr as e}from"./shared-25-DOWZRSlq.js";', 'function t(){return e()}function n(t){let n=e(t);return t&&n}export{t as n,n as t}'] },
  { source: 'c71dee58b-CFm4FCDB.js', role: 'The project header (id) renders the project menu without deferMenuBody, so xI takes the eager kI dropdown',
    features: ['l(Ui,{project:n,star:!1,buttonSize:"icon",onActivity:d})'] },
];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'NodeFilter', 'Event', 'BigInt', 'WeakRef', 'CSS', 'Float64Array', 'Image', 'matchMedia']);

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk.
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern.
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Follow an import (and re-export chains) to the declaring chunk.
async function resolveImport(entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function heldGraph(dir, label) {
  const manifest = label === 'view-tabs' ? await viewTabsManifestFor(referenceVersion) : label === 'routines-shared' ? await routinesSharedManifestFor(referenceVersion) : JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const adapterFrom = manifest.adapterModule ? `../../${path.basename(manifest.adapterModule)}` : null;
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${label} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  // A module with an `exports` map (sessions-page) publishes only those bindings, under those names; the rest are its own.
  const held = new Map();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) {
    const local = typeof b === 'string' ? b : b.name;
    if (mod.exports && !Object.hasOwn(mod.exports, local)) continue;
    held.set(`${mod.source}#${local}`, { target: mod.target ?? mod.source, name: mod.exports?.[local] ?? local });
  }
  const adapted = new Map();
  for (const a of manifest.adapters ?? []) adapted.set(a.original, a.name);
  // D46: names extract-view-tabs.mjs has settled but not published yet (other areas still slice those bindings).
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { label, published, held, adapted, adapterFrom, pending, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractChatProjects({ check = false, survey = false, extraAdapters = {} } = {}) {
  const cache = new Map();
  // extraAdapters (tests only, with check): merged into the table, so an adapter the closure never reaches stops generation.
  const adapters = Object.fromEntries([...new Set([...Object.keys(adapterTable), ...Object.keys(extraAdapters)])]
    .map(file => [file, { ...adapterTable[file], ...extraAdapters[file] }]));
  const vt = await heldGraph(viewTabs, 'view-tabs');
  const graphs = [];
  for (const label of heldGraphs) graphs.push(await heldGraph(path.join(root, 'src/generated', label), label));
  const heldBy = key => graphs.find(g => g.held.has(key));
  const adaptedBy = key => graphs.find(g => g.adapted.has(key));
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map();
  const viewTabsCopies = new Set();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), held: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      if (heldBy(key) || vt.held.has(key)) throw Error(`adapter ${key} replaces a binding another graph holds; import it instead`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (adaptedBy(key)) {
      const g = adaptedBy(key);
      result = { kind: 'shared-adapter', name: g.adapted.get(key), from: g.adapterFrom, graph: g.label };
    } else if (file === official.vendorFrame && !vt.published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (vt.published.has(key)) {
      result = { kind: 'view-tabs', name: vt.published.get(key), from: `../view-tabs/${file}` };
    } else if (heldBy(key)) {
      const g = heldBy(key);
      result = { kind: 'held', name: g.held.get(key).name, from: `../${g.label}/${g.held.get(key).target}`, graph: g.label };
    } else if (vt.held.has(key) && vt.pending.has(key)) {
      // D1/D46: a name view-tabs still holds back (`pendingNames`) is imported by its local until it is published.
      result = { kind: 'view-tabs-held', name: local, from: `../view-tabs/${file}`, pendingName: vt.pending.get(key) };
    } else if (linkedVendors[key]) {
      // The linked graph's manifest lists the binding in that module and the module exports it under its local name.
      const link = linkedVendors[key];
      const linked = JSON.parse(await fs.readFile(path.join(root, 'src/generated', link.graph, 'manifest.json'), 'utf8'));
      const mod = (linked.modules ?? []).find(m => m.target === link.target && m.source === file);
      if (linked.referenceVersion !== referenceVersion || !mod?.bindings?.some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`${key}: ${link.graph}/${link.target} does not hold it`);
      const text = await fs.readFile(path.join(root, 'src/generated', link.graph, link.target), 'utf8');
      if (![...text.matchAll(/export\s*\{([^}]*)\}/g)].some(m => m[1].split(',').map(s => s.trim()).includes(local))) throw Error(`${key}: ${link.graph}/${link.target} does not export ${local}`);
      result = { kind: 'held', name: local, from: `../${link.graph}/${link.target}`, graph: link.graph };
    } else if (file.startsWith('vendor-') && !file.startsWith('vendor-frame-') && !vendorCopies[key]) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const pins = lazyImports[key];
        if (!pins) throw Error(`${key} has a dynamic import (${text.slice(0, 160)}); give it an adapter`);
        let rest = text;
        for (const target of Object.keys(pins)) {
          const spec = `import("./${target}")`;
          if (rest.split(spec).length - 1 !== 1) throw Error(`${key}: expected one ${spec}`);
          rest = rest.split(spec).join('');
        }
        if (/\bimport\s*\(/.test(rest)) throw Error(`${key}: unpinned dynamic import`);
      }
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      if (vt.held.has(key)) viewTabsCopies.add(key);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') {
      const bucket = { adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', held: 'held' }[cls.kind];
      used[bucket].add(key);
      return;
    }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    const reads = new Set();
    edges.set(key, reads);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      try { assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features); }
      catch (error) { if (!survey) throw error; problems.push(error.message); }
      if (survey && !spec.features.length) problems.push(`root ${file}#${local} has no features`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const [key, pins] of Object.entries(lazyImports)) {
    if (!edges.has(key)) { if (!survey) throw Error(`lazy declaration ${key} is not reached`); problems.push(`unreached lazy ${key}`); continue; }
    for (const [target, alias] of Object.entries(pins)) {
      const src = await readSource(target, cache);
      const local = src.exported.get(alias);
      if (!local || !chunks.get(target)?.has(local)) { if (!survey) throw Error(`lazy ${key}: ${target} ${alias} is not in this graph`); problems.push(`lazy ${key}: ${target} ${alias} missing`); }
    }
  }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    for (const k of (process.env.SURVEY_SHOW ?? '').split(',').filter(Boolean)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('SHOW', k, '\n' + (await featureText(s, s.top.get(l))).split('\n').slice(0, +(process.env.SURVEY_LINES ?? 1e9)).join('\n')); }
    for (const k of (process.env.SURVEY_DEPS ?? '').split(',').filter(Boolean)) {
      const [f, l] = k.split('#'); const s = await readSource(f, cache);
      const rows = [];
      for (const dep of declarationDeps(s, l)) {
        const e = s.top.get(dep);
        const t = e.kind === 'import' ? await resolveImport(e, cache, k) : { file: f, local: dep };
        const tk = `${t.file}#${t.local}`, c = resolved.get(tk);
        const ts = await readSource(t.file, cache), te = ts.top.get(t.local);
        rows.push(`${dep} -> ${tk} [${c?.kind ?? '?'}${c?.name ? ' ' + c.name : ''}] ${te ? declarationText(ts, te).slice(0, +(process.env.SURVEY_WIDTH ?? 140)).replace(/\s+/g, ' ') : ''}`);
      }
      console.log('DEPS', k, '\n  ' + rows.join('\n  '));
    }
    if (process.env.SURVEY_USED) for (const [k, v] of Object.entries(used)) console.log('USED', k, [...v].join(' '));
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return null;
  }
  // Emit one module per source chunk.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-projects.mjs', adapterModule: 'src/source-project-v3-adapters.jsx', heldGraphs,
    publicNames: {}, modules: [], contexts: [], lazyImports: [], callSites: [], adapters: [], sharedAdapters: [], hostDifferences: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const lazyAliases = new Map(); // target chunk -> Map(alias -> local)
  for (const pins of Object.values(lazyImports)) for (const [target, alias] of Object.entries(pins)) {
    const src = await readSource(target, cache);
    if (!lazyAliases.has(target)) lazyAliases.set(target, new Map());
    lazyAliases.get(target).set(alias, src.exported.get(alias));
  }
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: cls.from, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held' || cls.kind === 'held') spec = { from: cls.from, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      const calleeKey = `${target.file}#${target.local}`;
      const calleeSrc = await readSource(target.file, cache), calleeDecl = calleeSrc.top.get(target.local);
      const isCreateContext = createContextKeys.has(calleeKey)
        || (target.file.startsWith('vendor-frame-') && calleeDecl?.kind === 'var' && /^[\w$]+=[\w$]+\.createContext$/.test(declarationText(calleeSrc, calleeDecl)));
      if (isCreateContext) manifest.contexts.push(`${file}#${local}`);
    }
    const groups = new Map();
    for (const [local, spec] of imports) {
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const blocks = order.map(([local, entry]) => {
      let text = emittedText(src, entry);
      const pins = lazyImports[`${file}#${local}`];
      if (pins) for (const target of Object.keys(pins)) text = text.split(`import("./${target}")`).join(`import("./${moduleName(target)}")`);
      return text;
    });
    let exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const aliases = lazyAliases.get(file);
    if (aliases) {
      for (const alias of aliases.keys()) if (locals.has(alias)) throw Error(`${file}: export alias ${alias} collides with a local`);
      exportText += `\nexport { ${[...aliases].map(([alias, local]) => `${local} as ${alias}`).join(', ')} };`;
    }
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-chat-projects.mjs.\n// Edit the extractor or src/source-project-v3-adapters.jsx, never this file.\n`;
    const target = moduleName(file);
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
    });
  }
  const copiedContexts = manifest.contexts.filter(k => viewTabsCopies.has(k));
  if (copiedContexts.length) throw Error(`view-tabs holds these contexts without a semantic name; publish them in extract-view-tabs.mjs (D46): ${copiedContexts.join(', ')}`);
  manifest.viewTabsCopies = [...viewTabsCopies].sort();
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    // A root another graph holds is re-exported from that graph's module (D1: one copy); the rest from this graph.
    const bySource = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      if (cls.kind !== 'generated' && cls.kind !== 'held') throw Error(`root ${file}#${local} (${spec.name}) resolves to ${cls.kind}; only sliced or held roots are exported`);
      const from = cls.kind === 'held' ? cls.from : `./${moduleName(file)}`;
      manifest.publicNames[spec.name] = cls.kind === 'held' ? { file, local, heldBy: cls.graph } : { file, local };
      if (!bySource.has(from)) bySource.set(from, []);
      bySource.get(from).push(`${cls.kind === 'held' ? cls.name : local} as ${spec.name}`);
    }
    for (const [from, specs] of bySource) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the chat-projects roots; generated by extract-chat-projects.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals)) {
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
    if (spec.boundary) manifest.hostDifferences.push({ original: `${file}#${local}`, adapter: spec.name, difference: spec.boundary });
  }
  for (const key of [...used.sharedAdapters].sort()) manifest.sharedAdapters.push({ original: key, name: resolved.get(key).name, graph: resolved.get(key).graph, from: resolved.get(key).from });
  for (const [key, pins] of Object.entries(lazyImports)) for (const [target, alias] of Object.entries(pins))
    manifest.lazyImports.push({ declaration: key, target: moduleName(target), alias });
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Chat projects output set changed: ${present.join(',')}. Run scripts/extract-chat-projects.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Chat projects source mismatch: ${name}. Run scripts/extract-chat-projects.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} chat projects modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractChatProjects({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
