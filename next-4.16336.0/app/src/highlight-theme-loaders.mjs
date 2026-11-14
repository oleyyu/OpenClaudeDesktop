import { lightTheme, darkTheme } from "./highlight-themes.mjs";
import { CODE_THEMES, DEFAULT_CODE_THEMES } from "./code-theme-catalog.mjs";

// Explicit per-theme lazy imports (official panes-diff-theme-current.js:29–78
// loads its 24 third-party themes from one chunk; here each is its own chunk
// from the pinned @shikijs/themes package, and there is no barrel import). Only
// the settled worker imports this module; the stream worker keeps the two
// built-in stream palettes.
const loaders = {
  "github-light": () => import("@shikijs/themes/github-light"),
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-dark-dimmed": () => import("@shikijs/themes/github-dark-dimmed"),
  "one-dark-pro": () => import("@shikijs/themes/one-dark-pro"),
  "one-light": () => import("@shikijs/themes/one-light"),
  dracula: () => import("@shikijs/themes/dracula"),
  "dracula-soft": () => import("@shikijs/themes/dracula-soft"),
  "catppuccin-latte": () => import("@shikijs/themes/catppuccin-latte"),
  "catppuccin-mocha": () => import("@shikijs/themes/catppuccin-mocha"),
  nord: () => import("@shikijs/themes/nord"),
  "solarized-dark": () => import("@shikijs/themes/solarized-dark"),
  "solarized-light": () => import("@shikijs/themes/solarized-light"),
  "vitesse-dark": () => import("@shikijs/themes/vitesse-dark"),
  "vitesse-light": () => import("@shikijs/themes/vitesse-light"),
  "min-dark": () => import("@shikijs/themes/min-dark"),
  "min-light": () => import("@shikijs/themes/min-light"),
  monokai: () => import("@shikijs/themes/monokai"),
  "tokyo-night": () => import("@shikijs/themes/tokyo-night"),
  "night-owl": () => import("@shikijs/themes/night-owl"),
  "rose-pine": () => import("@shikijs/themes/rose-pine"),
  "rose-pine-dawn": () => import("@shikijs/themes/rose-pine-dawn"),
  "ayu-dark": () => import("@shikijs/themes/ayu-dark"),
  "slack-dark": () => import("@shikijs/themes/slack-dark"),
  "slack-ochin": () => import("@shikijs/themes/slack-ochin"),
};
const builtIn = { [DEFAULT_CODE_THEMES.light]: lightTheme, [DEFAULT_CODE_THEMES.dark]: darkTheme };
for (const entry of CODE_THEMES) {
  if (!Object.hasOwn(loaders, entry.value) && !Object.hasOwn(builtIn, entry.value)) throw new Error(`Catalog theme without a loader: ${entry.value}`);
}

/** Registered shiki theme name for a catalog id (Claude ids map to the local transcriptions). */
export function registeredThemeName(id) {
  return builtIn[id]?.name ?? id;
}

/** Ensure the catalog theme is registered on the shared highlighter; returns its registered name. */
export async function ensureTheme(instance, id) {
  const name = registeredThemeName(id);
  if (instance.getLoadedThemes().includes(name)) return name;
  const loader = Object.hasOwn(loaders, id) ? loaders[id] : null;
  if (!loader) throw new Error(`Unknown code theme: ${id}`);
  const module = await loader();
  const theme = structuredClone(module.default);
  if (theme.name !== id) theme.name = id;
  await instance.loadTheme(theme);
  return name;
}

/** A catalog theme's VS Code colour map (the terminal pane's xterm theme); null for the built-in Claude themes. */
export async function themeColors(id) {
  const loader = Object.hasOwn(loaders, id) ? loaders[id] : null;
  if (!loader) return null;
  const module = await loader();
  return module.default?.colors ?? null;
}
