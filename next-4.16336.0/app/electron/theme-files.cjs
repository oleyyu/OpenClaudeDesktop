// Theme import/export (C4) through native file dialogs. The renderer validates
// the JSON (src/theme-custom-model.mjs importThemeFile) and saves it as one
// ordinary settings patch; this module only moves bytes. node:* and electron only.
const fs = require("node:fs/promises");
const path = require("node:path");

const THEME_FILE_LIMIT = 256 * 1024;
const SUFFIX = ".code-desktop-theme.json";

function themeFileName(name) {
  const base = String(typeof name === "string" && name.trim() ? name : "theme")
    .replace(/[\0-\x1f\x7f/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "theme";
  return base + SUFFIX;
}

function createThemeFiles({ dialog, getWindow, fsImpl = fs }) {
  const parent = () => { const win = getWindow?.(); return win && !win.isDestroyed?.() ? win : undefined; };
  const show = (kind, options) => { const win = parent(); return win ? dialog[kind](win, options) : dialog[kind](options); };
  async function importTheme() {
    const picked = await show("showOpenDialog", { title: "Import theme", properties: ["openFile"], filters: [{ name: "Theme", extensions: ["json"] }] });
    if (picked.canceled || !picked.filePaths?.[0]) return null;
    const file = picked.filePaths[0], stat = await fsImpl.stat(file);
    if (!stat.isFile()) throw new Error("Choose a theme file.");
    if (stat.size > THEME_FILE_LIMIT) throw new Error("This theme file is too large.");
    const text = await fsImpl.readFile(file, "utf8");
    let theme;
    try { theme = JSON.parse(text.replace(/^﻿/, "")); } catch { throw new Error("This file isn’t valid JSON."); }
    if (!theme || typeof theme !== "object" || Array.isArray(theme)) throw new Error("This isn’t an OpenClaude Desktop theme file.");
    return { theme, name: path.basename(file) };
  }
  async function exportTheme({ theme, name }) {
    if (!theme || typeof theme !== "object" || Array.isArray(theme) || theme.format !== "code-desktop-theme") throw new Error("Invalid theme.");
    const text = JSON.stringify(theme, null, 2) + "\n";
    if (Buffer.byteLength(text) > THEME_FILE_LIMIT) throw new Error("This theme is too large to export.");
    const result = await show("showSaveDialog", { title: "Export theme", defaultPath: themeFileName(name ?? theme.name), filters: [{ name: "Theme", extensions: ["json"] }] });
    if (result.canceled || !result.filePath) return null;
    await fsImpl.writeFile(result.filePath, text, "utf8");
    return { path: result.filePath };
  }
  return {
    run(p = {}) {
      if (p.op === "import") return importTheme();
      if (p.op === "export") return exportTheme(p);
      throw new Error("Unsupported theme file operation.");
    },
  };
}

module.exports = { createThemeFiles, themeFileName, THEME_FILE_LIMIT };
