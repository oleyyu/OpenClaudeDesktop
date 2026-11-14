// Host-side compatibility (NOT official code): the v0.3 host's settings tab ids (src/source-settings.jsx `tabs`, used as
// initialSection 'tab' / 'tab#row' by the Mode menu, account menu, /usage, low-disk toast, palette and settings search)
// mapped onto the 4.16336.0 official section ids / routes that useSettingsSections (shared-55 Kg, generated/settings-nav)
// produces, and back (the official settings modal store's section → the host page that draws it while the official
// pages are not sliced, productionPlan P3). OpenClaude's local extension groups have no official counterpart: their ids
// are kept unchanged so existing 'tab#row' anchors keep resolving, and they are shown after the official groups.

// Official sections (Kg ids and hrefs; `/customize/memory` is the official Memory route).
export const OFFICIAL_ROUTES = Object.freeze({
  general: '/settings/general',
  'data-privacy-controls': '/settings/data-privacy-controls',
  usage: '/settings/usage',
  memory: '/customize/memory',
  'claude-code': '/settings/claude-code',
  cowork: '/settings/cowork',
  import: '/settings/import',
  desktop: '/settings/desktop',
  'desktop/developer': '/settings/desktop/developer',
  'customize-skills': '/customize/skills',
  'customize-connectors': '/customize/connectors',
  'customize-plugins': '/customize/plugins',
});

// shared-183 Uh("untargeted") = "general": the official store's open() with no section (Cmd+, the account menu's
// Settings, the palette's Settings) opens General.
export const UNTARGETED_SECTION = 'general';

// Local extension groups (OpenClaude; no official section), drawn with the official group/row component (J_ / q_) and
// titled as OpenClaude so they are never mistaken for official pages. Codex, MCP (Developer is official), permission
// profiles, hooks, harness, cores, models, commands, instructions and theme all stay reachable here.
export const LOCAL_EXTENSION_GROUPS = Object.freeze([
  Object.freeze({ id: 'openclaude', title: 'OpenClaude', sections: Object.freeze(['theme', 'instructions', 'commands', 'models']) }),
  Object.freeze({ id: 'openclaude-computer', title: 'OpenClaude · This computer', sections: Object.freeze(['cores']) }),
  Object.freeze({ id: 'openclaude-advanced', title: 'OpenClaude · Advanced', sections: Object.freeze(['advanced', 'harness', 'customize-hooks', 'profiles']) }),
]);
export const LOCAL_SECTIONS = Object.freeze(LOCAL_EXTENSION_GROUPS.flatMap(g => g.sections));
const LOCAL = new Set(LOCAL_SECTIONS);
export const isLocalSection = id => LOCAL.has(id);

// Old host tab id -> official section id. 'preferences' was the host's General; 'general' was its System page.
const OLD_TO_OFFICIAL = Object.freeze({
  preferences: 'general',
  privacy: 'data-privacy-controls',
  usage: 'usage',
  memory: 'memory',
  code: 'claude-code',
  cowork: 'cowork',
  general: 'desktop',
  developer: 'desktop/developer',
  'customize-skills': 'customize-skills',
  'customize-connectors': 'customize-connectors',
  'customize-plugins': 'customize-plugins',
});

// Official section -> the host page that draws it (and the row it lands on). The official Import & export page is not
// sliced; the host's import is Claude Code › Model and permissions › Import from Claude Code (codexImport,
// ClaudeImportDialog; source-settings.jsx declares the row in the {tab:'code'} group), offered while the Codex core is
// connected (settingsNavHostValue useImportSection).
const OFFICIAL_TO_HOST = Object.freeze({
  ...Object.fromEntries(Object.entries(OLD_TO_OFFICIAL).map(([host, section]) => [section, { tab: host }])),
  import: Object.freeze({ tab: 'code', anchor: 'codexImport' }),
});

// Row anchors whose meaning changed with the route (the rest pass through as the host row anchor).
const ANCHOR_ACTIONS = Object.freeze({
  // Low-disk toast: shared-3 pushes /settings/desktop?open_storage=true, the desktop page's open-storage action.
  'general#open-storage': { section: 'desktop', action: 'open-storage', href: '/settings/desktop?open_storage=true' },
});

export const HOST_TAB_IDS = Object.freeze([...Object.keys(OLD_TO_OFFICIAL), ...LOCAL]);

// 'tab' or 'tab#row' -> { kind: 'official' | 'local', section, anchor?, href?, action?, untargeted? }.
// undefined / null / '' (setSettings(true): Cmd+, the account menu's Settings, the palette) is the official untargeted
// open → General. An id neither table knows throws: a caller passing it is a wiring error, not a reason to fall back to
// General silently (the host reports it, source-settings.jsx openHostTab).
export function resolveHostTab(initialSection) {
  const text = initialSection == null ? '' : String(initialSection);
  if (text === '') return { kind: 'official', section: UNTARGETED_SECTION, href: OFFICIAL_ROUTES[UNTARGETED_SECTION], untargeted: true };
  if (Object.hasOwn(ANCHOR_ACTIONS, text)) return { kind: 'official', ...ANCHOR_ACTIONS[text] };
  const hash = text.indexOf('#');
  const tab = hash === -1 ? text : text.slice(0, hash), anchor = hash === -1 ? '' : text.slice(hash + 1);
  if (LOCAL.has(tab)) return { kind: 'local', section: tab, ...(anchor ? { anchor } : {}) };
  if (!Object.hasOwn(OLD_TO_OFFICIAL, tab)) throw Error(`settings: unknown host tab id ${JSON.stringify(tab)}`);
  const section = OLD_TO_OFFICIAL[tab];
  return { kind: 'official', section, href: OFFICIAL_ROUTES[section] + (anchor ? `#${anchor}` : ''), ...(anchor ? { anchor } : {}) };
}

// The official store's section (or a local extension id) -> { tab, anchor? }: the host page shown for it. null for a
// section the host has no page for (the official nav never offers one: its gates answer false).
export function hostTabForSection(section) {
  if (section == null) return null;
  if (LOCAL.has(section)) return { tab: section };
  return OFFICIAL_TO_HOST[section] ?? null;
}
