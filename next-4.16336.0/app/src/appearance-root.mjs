// The appearance a window's <html> carries (main window App and popped-out pane windows alike): Settings ›
// Appearance's interface font, code font, code themes, Reduce motion and transcript text size/width. Official
// windows share one renderer and a popout copies the opener's html attributes and these properties (cd377abb5
// Yn over qn/Jn); a local pane window is its own renderer, so it writes the same attributes from the same saved
// preferences (electron/preferences.mjs appearancePreferences) through this one function.

/** Official rg/sR: cds-root's data-font — anthropic → "sans", otherwise the system branch. */
export const cdsFontFor = (prefs) => (prefs?.interfaceFont === "anthropic" ? "sans" : "system");

/**
 * Write prefs onto root (document.documentElement). setThemes is code-theme-store setCodeThemes (the renderer's
 * tokenizer pair; it returns the normalized pair) and colors the generated code-theme-colors table.
 * Returns the code theme pair in effect.
 */
export function applyAppearanceRoot(root, prefs, { setThemes, colors }) {
  root.dataset.localMotion = prefs.motion;
  // shared-20 Gh (3.6556.2): html carries the transcript text size and width as data-chat-text-size / data-transcript-width
  // (s / m / l), which the loaded CSS keys on (c6a992d55 [data-chat-text-size=s] .epitaxy-root --prompt-text-size, Cg's
  // [[data-transcript-width=m]_&]:[--max-content-width…], the session rail measure) and the host's own rules follow.
  root.dataset.chatTextSize = prefs.transcriptSize;
  root.dataset.transcriptWidth = prefs.transcriptWidth;
  // scroll-shared-10-current.js:17688-17708 CM/DM: the in-app Reduce motion setting is html[data-reduce-motion="true"],
  // which the loaded CSS's motion-reduce variants and local reduce rules key on; data-local-motion stays as an alias
  // for the older local rules.
  if (prefs.motion === "reduce") root.dataset.reduceMotion = "true";
  else delete root.dataset.reduceMotion;
  root.toggleAttribute("data-system-font", prefs.interfaceFont === "system");
  root.toggleAttribute("data-dyslexic-font", prefs.interfaceFont === "dyslexic");
  root.dataset.font = cdsFontFor(prefs);
  for (const key of ["--cds-font-code", "--cds-font-mono"]) {
    if (prefs.codeFont) root.style.setProperty(key, JSON.stringify(prefs.codeFont) + ", anthropic-mono, monospace");
    else root.style.removeProperty(key);
  }
  // Official c6e73333a: the selected themes' editor/selection colors become --code-theme-* variables; the worker
  // tokenizes under the same pair.
  const pair = setThemes({ light: prefs.codeThemeLight, dark: prefs.codeThemeDark });
  // c66fe388e he(): html carries the pair as data-code-theme-light/-dark, which the claude-light/claude-dark code-box
  // ring keys on (design-system.css:56758-56768).
  root.dataset.codeThemeLight = pair.light;
  root.dataset.codeThemeDark = pair.dark;
  for (const mode of ["light", "dark"]) {
    const entry = colors[pair[mode]];
    if (!entry) continue;
    root.style.setProperty(`--code-theme-${mode}-bg`, entry.bg);
    root.style.setProperty(`--code-theme-${mode}-fg`, entry.fg);
    root.style.setProperty(`--code-theme-${mode}-selection-bg`, entry.selection);
  }
  if (colors[pair.light] && colors[pair.dark])
    root.style.setProperty("--cds-code-text-selection-bg", `light-dark(${colors[pair.light].selection}, ${colors[pair.dark].selection})`);
  return pair;
}
