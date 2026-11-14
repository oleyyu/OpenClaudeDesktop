import { t } from "../electron/i18n/index.mjs";

// Appearance model (pure): the /theme argument, the resolved light/dark mode
// and which running transitions a mode flip finishes.

// cc43287c9-Bchz60VT.js:34306-34325 t4/n4/r4 (2.31226.0): "/theme <arg>" sets light, dark or follow-system;
// "auto" is the source's own name for system, so both map to the local "system" preference. Besides the
// English words, r4 takes the interface language's own names for the three choices (c4 :34659-34666 passes a
// Map of formatMessage(SF.auto|light|dark).toLowerCase(), ce2be2435 SF: System / Light / Dark), so 浅色 /
// 深色 / 跟随系统 work under zh-CN. Text on more than one line is {extraLines} (the source's "extra_lines":
// c4 shows the shared single-line notice and keeps the draft). No argument or an unknown word opens the
// picker (the source opens Settings > General with "Theme" highlighted); locally Appearance lives on the
// Preferences page.
const THEME_ARGUMENTS = new Map([["light", "light"], ["dark", "dark"], ["system", "system"], ["auto", "system"]]);
// The localized names (lower-cased): read per call, after the locale is fixed for this window.
export const localizedThemeWords = () => new Map([[t("System").toLowerCase(), "system"], [t("Light").toLowerCase(), "light"], [t("Dark").toLowerCase(), "dark"]]);
export function parseThemeCommand(args, localized = localizedThemeWords()) {
  const text = typeof args === "string" ? args : "";
  // r4 trims the whole input, then tests the rest after "/theme": a line break before the word counts, a trailing one does not.
  if (/[\r\n]/.test(text.trimEnd())) return { extraLines: true };
  const word = text.trim().toLowerCase();
  const theme = THEME_ARGUMENTS.get(word) ?? localized?.get(word);
  return theme ? { set: theme } : { open: "appearance" };
}

// shared-7 Bh: follow-system resolves through prefers-color-scheme; an
// explicit choice is used as is. Anything unknown follows the system, which is
// the default preference (shared-7 bi("userThemeMode","auto")).
export function resolveThemeMode(theme, prefersDark) {
  if (theme === "light" || theme === "dark") return theme;
  return prefersDark ? "dark" : "light";
}
// The preload's synchronous {theme, mode} (main process config + nativeTheme)
// seeds the first render so a dark profile never paints a light frame; without
// the bridge (fixtures, SSR) the media query decides.
export function initialAppearance(bridge, prefersDark) {
  const theme = ["light", "dark", "system"].includes(bridge?.theme) ? bridge.theme : "system";
  const mode = bridge?.mode === "light" || bridge?.mode === "dark" ? bridge.mode : resolveThemeMode(theme, prefersDark);
  return { theme, mode };
}

// shared-7-DsClUbcz.js wh/jh/Ph: after html[data-mode] flips between light
// and dark, the next frame finishes every running colour transition so the
// whole surface switches at once. Writes from or to an unresolved value
// (undefined/"system") skip it.
export const isColorTransitionProperty = (property) =>
  property.endsWith("color") || property === "box-shadow" || property === "text-shadow" || property === "fill" || property === "stroke"
  || property === "--tw-gradient-from" || property === "--tw-gradient-via" || property === "--tw-gradient-to";
export const finishesColorTransitions = (from, to) =>
  (from === "light" || from === "dark") && (to === "light" || to === "dark") && from !== to;
export function finishColorTransitions(doc) {
  if (typeof doc?.getAnimations !== "function") return 0;
  const running = doc.getAnimations().filter((animation) => typeof animation.transitionProperty === "string"
    && isColorTransitionProperty(animation.transitionProperty) && animation.playbackRate > 0 && animation.playState !== "paused");
  for (const animation of running) animation.finish();
  return running.length;
}
// Writes the resolved mode to html[data-mode] (never "system") and schedules
// the colour-transition finish for a real flip.
export function writeThemeMode(doc, mode, schedule = (callback) => requestAnimationFrame(callback)) {
  const root = doc.documentElement, previous = root.dataset.mode;
  if (previous === mode) return false;
  root.dataset.mode = mode;
  if (finishesColorTransitions(previous, mode)) schedule(() => finishColorTransitions(doc));
  return true;
}
