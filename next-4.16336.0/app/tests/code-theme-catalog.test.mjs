import test from "node:test";
import assert from "node:assert/strict";
import { CODE_THEMES, DEFAULT_CODE_THEMES, lightThemes, darkThemes, isTheme, themeLabel, normalizeCodeThemes } from "../src/code-theme-catalog.mjs";
import colors from "../src/generated/code-theme-colors.json" with { type: "json" };

test("catalog transcribes the official order minus the two unsourced Pierre entries", () => {
  assert.equal(CODE_THEMES.length, 26);
  assert.deepEqual(lightThemes().map((entry) => entry.value), ["claude-light", "github-light", "one-light", "catppuccin-latte", "solarized-light", "vitesse-light", "min-light", "rose-pine-dawn", "slack-ochin"]);
  assert.deepEqual(darkThemes().map((entry) => entry.value), ["claude-dark", "github-dark", "github-dark-dimmed", "one-dark-pro", "dracula", "dracula-soft", "catppuccin-mocha", "nord", "solarized-dark", "vitesse-dark", "min-dark", "monokai", "tokyo-night", "night-owl", "rose-pine", "ayu-dark", "slack-dark"]);
  assert.equal(lightThemes()[0].label, "Claude Light"); assert.equal(darkThemes()[0].label, "Claude Dark");
  assert.equal(themeLabel("rose-pine"), "Rosé Pine"); assert.equal(themeLabel("pierre-dark"), null);
  assert.ok(Object.isFrozen(CODE_THEMES) && CODE_THEMES.every(Object.isFrozen));
});
test("isTheme is mode-aware and normalization falls back per column", () => {
  assert.equal(isTheme("github-dark", "dark"), true); assert.equal(isTheme("github-dark", "light"), false);
  assert.equal(isTheme("github-dark"), true); assert.equal(isTheme("pierre-light", "light"), false); assert.equal(isTheme(42, "dark"), false);
  assert.deepEqual(normalizeCodeThemes({ light: "github-dark", dark: "github-dark" }), { light: DEFAULT_CODE_THEMES.light, dark: "github-dark" });
  assert.deepEqual(normalizeCodeThemes(undefined), { light: "claude-light", dark: "claude-dark" });
  assert.ok(Object.isFrozen(normalizeCodeThemes()));
});
test("generated color table covers the catalog with valid editor colors", () => {
  for (const entry of CODE_THEMES) {
    const item = colors[entry.value];
    assert.ok(item, entry.value); assert.equal(item.mode, entry.mode);
    for (const key of ["bg", "fg", "selection"]) assert.match(item[key], /^#[0-9a-f]{6}([0-9a-f]{2})?$/, `${entry.value}.${key}`);
  }
  assert.equal(colors["claude-light"].bg, "#ffffff"); assert.equal(colors["claude-dark"].bg, "#1a1a19");
  assert.equal(colors["claude-light"].selection, "#0073e640"); assert.equal(colors["claude-dark"].selection, "#0099ff4d");
  // Themes without editor.selectionBackground take the Claude selection of their mode (official c6e73333a g()).
  for (const id of ["github-dark-dimmed", "min-dark", "slack-dark"]) assert.equal(colors[id].selection, "#0099ff4d", `${id} selection`);
  assert.equal(colors["min-light"].selection, "#0073e640");
  assert.equal(colors["github-dark"].selection, "#3392ff44", "a theme with its own selection keeps it");
  assert.equal(Object.keys(colors).length, CODE_THEMES.length);
});
