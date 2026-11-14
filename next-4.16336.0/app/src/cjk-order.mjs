// CJK glyph order for html[data-cjk-order] (pure).
//
// ion-dist/index.html (2.31226.0) inline script: the first preferred language
// that is Chinese, Japanese or Korean picks the order; the loaded design-system
// CSS (c6a992d55-C0zTICcS.css) then reorders --font-cjk-sans/serif-fallback
// (zh-hant, ja, ko; zh-hans keeps the default SC-first chain) and, for any
// value, adds the CJK chain to --cds-font-system (Interface font = System).
// The languages are window.desktopPreferredLanguages (the main process's
// app.getPreferredSystemLanguages(), normalised by JDr), else navigator.languages.
const TRADITIONAL_REGIONS = new Set(["tw", "hk", "mo"]);

// index.html e(): one BCP-47-ish tag to its CJK order, or null.
export function cjkOrderOf(tag) {
  if (typeof tag !== "string") return null;
  const [language, ...rest] = tag.toLowerCase().split(/[-_]/);
  if (language === "ja") return "ja";
  if (language === "ko") return "ko";
  if (language !== "zh" && language !== "yue") return null;
  const script = rest.find((part) => part.length === 4);
  if (script === "hant") return "zh-hant";
  if (script === "hans") return "zh-hans";
  const region = rest.find((part) => part.length === 2);
  return (region !== undefined && TRADITIONAL_REGIONS.has(region)) || language === "yue" ? "zh-hant" : "zh-hans";
}

// index.html: desktopPreferredLanguages when it is a non-empty string list, else navigator.languages.
export function preferredLanguages(desktopLanguages, navigatorLanguages) {
  const desktop = Array.isArray(desktopLanguages) ? desktopLanguages.filter((tag) => typeof tag === "string") : [];
  if (desktop.length > 0) return desktop;
  return Array.isArray(navigatorLanguages) ? navigatorLanguages.filter((tag) => typeof tag === "string") : [];
}

// The first CJK language decides. Local addition: with no CJK system language, a CJK interface
// language (the zh-CN dictionary) decides, so the Chinese UI gets the SC-first chain as well.
export function cjkOrder(languages, uiLocale = null) {
  for (const tag of Array.isArray(languages) ? languages : []) {
    const order = cjkOrderOf(tag);
    if (order !== null) return order;
  }
  return cjkOrderOf(uiLocale);
}

// Writes (or clears) html[data-cjk-order]; returns the value written.
export function applyCjkOrder(root, { desktopLanguages, navigatorLanguages, uiLocale } = {}) {
  const order = cjkOrder(preferredLanguages(desktopLanguages, navigatorLanguages), uiLocale);
  if (!root?.setAttribute) return order;
  if (order === null) root.removeAttribute?.("data-cjk-order");
  else root.setAttribute("data-cjk-order", order);
  return order;
}
