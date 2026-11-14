"use strict";
// 'Open in' editors (official getInstalledEditors / openInEditor, ion-dist c856385e2 wn/kn): the code editors installed on
// this Mac, offered above Finder in a session row's Open in submenu, the Files pane's file menus and the folder chip's
// menu. Detected by their app bundle in /Applications or ~/Applications (JetBrains Toolbox installs under
// ~/Applications/JetBrains Toolbox); Xcode is left out, as upstream leaves it out. A path opens with `open -a <app>`.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const { editorLocationURI } = require("./generated/editor-location.cjs");
const EDITOR_URL_SCHEMES = Object.freeze({vscode:"vscode://",vscodeInsiders:"vscode-insiders://",cursor:"cursor://",windsurf:"windsurf://",zed:"zed://"});

const EDITORS = Object.freeze([
  { type: "vscode", name: "VS Code", apps: ["Visual Studio Code.app"] },
  { type: "vscodeInsiders", name: "VS Code Insiders", apps: ["Visual Studio Code - Insiders.app"] },
  { type: "cursor", name: "Cursor", apps: ["Cursor.app"] },
  { type: "windsurf", name: "Windsurf", apps: ["Windsurf.app"] },
  { type: "zed", name: "Zed", apps: ["Zed.app", "Zed Preview.app"] },
  { type: "sublime", name: "Sublime Text", apps: ["Sublime Text.app"] },
  { type: "nova", name: "Nova", apps: ["Nova.app"] },
  { type: "bbedit", name: "BBEdit", apps: ["BBEdit.app"] },
  { type: "intellij", name: "IntelliJ IDEA", apps: ["IntelliJ IDEA.app", "IntelliJ IDEA Ultimate.app", "IntelliJ IDEA CE.app"] },
  { type: "webstorm", name: "WebStorm", apps: ["WebStorm.app"] },
  { type: "pycharm", name: "PyCharm", apps: ["PyCharm.app", "PyCharm Professional Edition.app", "PyCharm CE.app", "PyCharm Community Edition.app"] },
  { type: "goland", name: "GoLand", apps: ["GoLand.app"] },
  { type: "rustrover", name: "RustRover", apps: ["RustRover.app"] },
  { type: "phpstorm", name: "PhpStorm", apps: ["PhpStorm.app"] },
  { type: "rubymine", name: "RubyMine", apps: ["RubyMine.app"] },
  { type: "clion", name: "CLion", apps: ["CLion.app"] },
  { type: "fleet", name: "Fleet", apps: ["Fleet.app"] },
  { type: "androidStudio", name: "Android Studio", apps: ["Android Studio.app"] },
]);

const searchDirs = (home) => ["/Applications", path.join(home, "Applications"), path.join(home, "Applications", "JetBrains Toolbox"), "/Applications/Setapp"];

/** Where an editor's app bundle is, or null. exists: injectable for tests. */
function editorApp(editor, { home = os.homedir(), exists = fs.existsSync } = {}) {
  for (const dir of searchDirs(home)) for (const app of editor.apps) {
    const candidate = path.join(dir, app);
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** The installed editors [{type, name}], sorted by name as upstream sorts them. */
function installedEditors(options = {}) {
  return EDITORS.filter((editor) => editorApp(editor, options)).map(({ type, name }) => ({ type, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

/** Opens a file or folder in one installed editor; refuses an unknown editor or a path that doesn't exist. */
async function openInEditor(target, type, { home = os.homedir(), exists = fs.existsSync, run = execFile, line, column, openExternal } = {}) {
  const editor = EDITORS.find((entry) => entry.type === type);
  if (!editor) throw new Error("Unknown editor.");
  if (typeof target !== "string" || !path.isAbsolute(target) || target.includes("\0")) throw new Error("Invalid file path.");
  let info;
  try { info = await fs.promises.stat(target); } catch { throw new Error("The file or folder no longer exists."); }
  const app = editorApp(editor, { home, exists });
  if (!app) throw new Error("That editor is no longer installed.");
  if (info.isFile() && Number.isInteger(line) && line > 0 && EDITOR_URL_SCHEMES[type]) {
    const uri = editorLocationURI(EDITOR_URL_SCHEMES[type], target, line, column);
    await (openExternal ?? require("electron").shell.openExternal)(uri);
    return true;
  }
  await new Promise((resolve, reject) => run("/usr/bin/open", ["-a", app, target], { timeout: 15000 }, (error) => error ? reject(error) : resolve()));
  return true;
}

module.exports = { EDITORS, EDITOR_URL_SCHEMES, editorApp, installedEditors, openInEditor };
