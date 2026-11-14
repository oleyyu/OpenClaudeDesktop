// Code theme catalog transcribed as data from the current Code settings theme
// provider (panes-diff-theme-current.js:312–339). The two Claude themes are the
// local CDS transcriptions in highlight-themes.mjs; every other entry is loaded
// on demand from the pinned @shikijs/themes package by highlight-theme-loaders.
// Pierre Light/Dark are in the official catalog but are Anthropic-bundled data
// from @pierre/diffs with no standalone data source, so they are omitted here
// rather than shipped as placeholders (see analysis/settings-rest-20260920).
export const CODE_THEMES = Object.freeze([
  { value: "claude-light", label: "Claude Light", mode: "light" },
  { value: "claude-dark", label: "Claude Dark", mode: "dark" },
  { value: "github-light", label: "GitHub Light", mode: "light" },
  { value: "github-dark", label: "GitHub Dark", mode: "dark" },
  { value: "github-dark-dimmed", label: "GitHub Dark Dimmed", mode: "dark" },
  { value: "one-dark-pro", label: "One Dark Pro", mode: "dark" },
  { value: "one-light", label: "One Light", mode: "light" },
  { value: "dracula", label: "Dracula", mode: "dark" },
  { value: "dracula-soft", label: "Dracula Soft", mode: "dark" },
  { value: "catppuccin-latte", label: "Catppuccin Latte", mode: "light" },
  { value: "catppuccin-mocha", label: "Catppuccin Mocha", mode: "dark" },
  { value: "nord", label: "Nord", mode: "dark" },
  { value: "solarized-dark", label: "Solarized Dark", mode: "dark" },
  { value: "solarized-light", label: "Solarized Light", mode: "light" },
  { value: "vitesse-dark", label: "Vitesse Dark", mode: "dark" },
  { value: "vitesse-light", label: "Vitesse Light", mode: "light" },
  { value: "min-dark", label: "Min Dark", mode: "dark" },
  { value: "min-light", label: "Min Light", mode: "light" },
  { value: "monokai", label: "Monokai", mode: "dark" },
  { value: "tokyo-night", label: "Tokyo Night", mode: "dark" },
  { value: "night-owl", label: "Night Owl", mode: "dark" },
  { value: "rose-pine", label: "Rosé Pine", mode: "dark" },
  { value: "rose-pine-dawn", label: "Rosé Pine Dawn", mode: "light" },
  { value: "ayu-dark", label: "Ayu Dark", mode: "dark" },
  { value: "slack-dark", label: "Slack Dark", mode: "dark" },
  { value: "slack-ochin", label: "Slack Ochin", mode: "light" },
].map((entry) => Object.freeze(entry)));

export const DEFAULT_CODE_THEMES = Object.freeze({ light: "claude-light", dark: "claude-dark" });

export function lightThemes() { return CODE_THEMES.filter((entry) => entry.mode === "light"); }
export function darkThemes() { return CODE_THEMES.filter((entry) => entry.mode === "dark"); }
export function isTheme(value, mode) {
  return typeof value === "string" && CODE_THEMES.some((entry) => entry.value === value && (mode === undefined || entry.mode === mode));
}
export function themeLabel(value) { return CODE_THEMES.find((entry) => entry.value === value)?.label ?? null; }

/** A validated {light, dark} pair; unknown or cross-mode ids fall back to the Claude defaults. */
export function normalizeCodeThemes(pair) {
  return Object.freeze({
    light: isTheme(pair?.light, "light") ? pair.light : DEFAULT_CODE_THEMES.light,
    dark: isTheme(pair?.dark, "dark") ? pair.dark : DEFAULT_CODE_THEMES.dark,
  });
}
