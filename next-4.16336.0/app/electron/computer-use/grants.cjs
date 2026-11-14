// Per-session app grants for computer use: (bundleId, tier), tier from the app's category (docs/02 授权分级).
//
//   browsers           "read"   visible in screenshots; clicks and typing refused
//   terminals and IDEs "click"  visible, left-click and scroll; typing, keys, right-click, modifier-clicks, drag refused
//   everything else    "full"
//
// Apps outside the grant list are not captured, clicked or typed into. Grants only come from the user's answer to
// request_access (main process); nothing the renderer or the agent sends can add one. The app itself is never granted
// (`refuse`): its windows — the screen glow over every display among them — stay out of every capture.
// W14-code r2-shared-11: Settings › Computer use › Denied apps (official c71860c77 Bt, chicagoUserDeniedBundleIds: "Any
// request Claude makes to access these apps is automatically rejected") is `denied`, read live: a denied app is never
// granted, and one granted before it was denied stops counting as granted.
const BROWSERS = new Set([
  "com.apple.Safari", "com.apple.SafariTechnologyPreview",
  "com.google.Chrome", "com.google.Chrome.beta", "com.google.Chrome.dev", "com.google.Chrome.canary", "org.chromium.Chromium",
  "org.mozilla.firefox", "org.mozilla.firefoxdeveloperedition", "org.mozilla.nightly",
  "com.microsoft.edgemac", "com.microsoft.edgemac.Beta", "com.microsoft.edgemac.Dev", "com.microsoft.edgemac.Canary",
  "company.thebrowser.Browser", "com.brave.Browser", "com.operasoftware.Opera", "com.vivaldi.Vivaldi",
]);
const TERMINALS_AND_IDES = new Set([
  "com.apple.Terminal", "com.googlecode.iterm2", "dev.warp.Warp-Stable", "net.kovidgoyal.kitty", "io.alacritty",
  "com.github.wez.wezterm", "com.mitchellh.ghostty",
  "com.microsoft.VSCode", "com.microsoft.VSCodeInsiders", "com.vscodium", "com.todesktop.230313mzl4w4u92",
  "com.exafunction.windsurf", "dev.zed.Zed", "com.sublimetext.4", "com.apple.dt.Xcode", "com.google.android.studio",
]);
const TERMINAL_IDE_PREFIXES = ["com.jetbrains."];

const TIERS = Object.freeze(["read", "click", "full"]);

/** The tier an app gets by category. */
function tierFor(bundleId) {
  if (BROWSERS.has(bundleId)) return "read";
  if (TERMINALS_AND_IDES.has(bundleId) || TERMINAL_IDE_PREFIXES.some((prefix) => bundleId.startsWith(prefix))) return "click";
  return "full";
}

// What each tier allows. "see" covers screenshots, zoom, window lists and the AX summary.
const ALLOWED = Object.freeze({
  read: new Set(["see"]),
  click: new Set(["see", "left_click", "scroll"]),
  full: new Set(["see", "left_click", "scroll", "click", "type", "key", "right_click", "middle_click", "modifier_click", "drag", "menu"]),
});
const allows = (tier, op) => Boolean(ALLOWED[tier]?.has(op));

const validBundleId = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9.-]{0,254}$/.test(value);

/**
 * @param {{refuse?: Iterable<string>, denied?: () => Iterable<string>}} [options]  refuse: bundle ids never granted (the
 *   app's own); denied: the user's deny list, read on every check.
 */
function createGrants({ refuse = [], denied = () => [] } = {}) {
  const refused = new Set(refuse);
  const denies = (bundleId) => { try { return new Set(denied() ?? []).has(bundleId); } catch { return false; } };
  const live = () => [...apps.values()].filter((record) => !denies(record.bundleId));
  const apps = new Map();   // bundleId → { bundleId, tier, displayName }
  const flags = { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false };
  return {
    /** Records the apps the user approved; returns their entries. Previously granted apps stay granted. */
    grant(entries = [], approvedFlags = {}) {
      const added = [];
      for (const entry of entries) {
        const bundleId = typeof entry === "string" ? entry : entry?.bundleId;
        if (!validBundleId(bundleId) || refused.has(bundleId) || denies(bundleId)) continue;
        const record = { bundleId, tier: tierFor(bundleId), displayName: typeof entry?.displayName === "string" ? entry.displayName : undefined };
        apps.set(bundleId, record);
        added.push(record);
      }
      for (const key of Object.keys(flags)) if (approvedFlags[key] === true) flags[key] = true;
      return added;
    },
    revoke(bundleId) { return apps.delete(bundleId); },
    clear() { apps.clear(); for (const key of Object.keys(flags)) flags[key] = false; },
    has: (bundleId) => apps.has(bundleId) && !denies(bundleId),
    tierOf: (bundleId) => (denies(bundleId) ? null : apps.get(bundleId)?.tier ?? null),
    /** Whether the user's deny list rejects this app (request_access answers it without a card). */
    denies,
    list: () => live().map((record) => ({ ...record })),
    /** Every granted app, any tier: read-tier apps are visible in screenshots too. */
    allowedBundleIds: () => live().map((record) => record.bundleId),
    flags: () => ({ ...flags }),
  };
}

module.exports = { TIERS, tierFor, allows, validBundleId, createGrants };
