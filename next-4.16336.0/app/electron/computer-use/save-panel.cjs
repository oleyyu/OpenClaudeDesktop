// savePanelProbe / save_panel_restricted (official 3.6556.2; spec §1.4.5 "存储面板 / 文件对话框等子检查"): before a
// keystroke, click, drag or held press reaches a Mac window, what that window shows is read (native savePanelProbe,
// SavePanel.swift) and judged here, so that computer use cannot save, rename or move a file to where it would run by
// itself later (shell start-up files, launch agents, git hooks, hidden folders, files that act when opened, files an
// app runs when it starts) nor type into a window that edits such a file.
//
// Port of the official guard, by part (3.6556.2 asar .vite/build; the "Official X" names further down are 2.42304.0's,
// muI2IV6k / BEf0UhNC, and map one to one onto the 3.6556.2 names listed here):
//   names and paths    jPKPzV-P wCr … Cwr (2.42304.0 muI2IV6k Kar … Kor: the protected names, folders and path
//                      patterns; NH / ywr / bwr / Cwr = eH / Hor / Uor / Kor). The lists changed in 3.6556.2 and are
//                      taken entry by entry: wCr / TCr / DCr / LCr / RCr / BCr / JCr (Kar / qar / Yar / aor / oor / cor /
//                      _or) gained app start-up files (SuperCollider, REAPER, iTerm AutoLaunch, QGIS, Maya userSetup,
//                      ImageJ / Fiji macros, Blender, SketchUp, FreeCAD, KiCad, Igor), git rr-cache / MERGE_RR and the
//                      antidote / antibody caches; every other function there is the same apart from minified names.
//   protected index    jPKPzV-P $Hi / nUi / eUi / tUi / XHi (muI2IV6k ONr / jNr / kNr / ANr / TNr: what the home folder
//                      links to where, resolved once), the same apart from minified names
//   probe              the darwin executor's savePanelProbe (documentPathIsProtected, saveTargetPathIsProtected,
//                      resolvedProtectedTargets, fallbackMayHideProtectedTarget added to the native answer), in jPKPzV-P
//                      the same apart from minified names
//   gates              Cgwbta3N wt / jt (BEf0UhNC St / Ot: keys, typing), Gt / Wt (Ht / Vt: a click or drag at a point),
//                      Mt (kt: a held press), Kt (Ut: the app_* tools on a window), kt / Vt (Et / Rt: a Return or Save in
//                      a save sheet: its folder's parents read from the folder pop-up), K / Ft / q (q / J / Ft: 750 ms
//                      for the sheet to settle after the last input); the same apart from minified and imported names
// Every refusal is reason code save_panel_restricted with the official wording. Only macOS: elsewhere the guard is off.
// The guard turns off only when the host has no probe (unknown_method / native_unavailable). A probe that fails
// otherwise refuses the screen-wide input (official St / Vt / kt let gt()'s throw end the call: fail closed) and, for
// the app_* tools, judges nothing this call (official Ut: gt().catch(() => null)); either way the guard stays on.
const path = require("node:path");
const fsp = require("node:fs/promises");
const os = require("node:os");
const { fileURLToPath } = require("node:url");
const { parseCombo } = require("./keys.cjs");

// ── Names (official ZV / vor / QV) ──
const fold = (text) => String(text).normalize("NFKC").replace(/\p{Default_Ignorable_Code_Point}/gu, "").toLowerCase().toUpperCase().toLowerCase();
function unquote(text) {
  let t = String(text).trim();
  while (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
  return t;
}
const foldName = (text) => fold(unquote(text));
const baseName = (p) => p.slice(p.lastIndexOf("/") + 1);
const dirName = (p) => { const i = p.lastIndexOf("/"); return i === -1 ? "" : p.slice(0, i); };

// ── What may not be written (official Kar / qar / Jar / Yar / ior / aor / oor / sor / cor / lor; 3.6556.2 jPKPzV-P
//    wCr / TCr / ECr / DCr / ICr / LCr / RCr / zCr / BCr / VCr, each list entry for entry and in the official order) ──
// wCr: home-relative files a shell, terminal or app runs when it starts (their last part is also a protected name).
const SHELL_FILES = [".zshrc", ".zshenv", ".zprofile", ".zlogin", ".zlogout", ".bashrc", ".bash_profile", ".bash_login", ".bash_logout", ".profile",
  ".wezterm.lua", "Library/Application Support/SuperCollider/startup.scd", "Library/Application Support/REAPER/Scripts/__startup.lua",
  "Library/Application Support/REAPER/Scripts/__startup.eel", ".config/fish/config.fish", ".config/fish/fish_variables", ".config/starship.toml",
  "Library/Application Support/iTerm2/Scripts/AutoLaunch.scpt", "Library/Application Support/iTerm/Scripts/AutoLaunch.scpt", ".gitconfig", ".zcompdump",
  ".cache/prezto/zcompdump", ".cache/zsh4humans/v5/z4h.zsh"];
// TCr: names refused anywhere (git internals, and the start-up scripts of Maya and ImageJ / Fiji).
const GIT_NAMES = [".git", "userSetup.py", "userSetup.mel", "StartupMacros.txt", "StartupMacros.ijm", "StartupMacros.fiji.ijm", "RunAtStartup.ijm",
  "gitdir", "commondir", "__fish_build_paths.fish", "Breakpoints_v2.xcbkptlist", "MERGE_RR"];
const OPENS_AND_RUNS = [".terminal", ".term", ".fileloc", ".inetloc", ".webloc", ".ftploc", ".afploc", ".smbloc", ".vncloc", ".mailloc", ".newsloc",
  ".mobileconfig", ".webarchive", ".command", ".tool"];
// DCr: home-relative files refused under their own name in their own folder (git's user config, QGIS's start-up script).
const GIT_USER_CONFIG = [".config/git/config", "Library/Application Support/QGIS/QGIS3/startup.py"];
const ALWAYS = () => true;
const endsWithAny = (...suffixes) => (name) => { const n = name.replace(/[. ]+$/, ""); return suffixes.some((s) => n.endsWith(s)); };
const GIT_HOOKS = new Set(("applypatch-msg.pre-applypatch.post-applypatch.pre-commit.pre-merge-commit.prepare-commit-msg.commit-msg.post-commit." +
  "pre-rebase.post-checkout.post-merge.pre-push.pre-receive.update.proc-receive.post-receive.post-update.reference-transaction.push-to-checkout." +
  "pre-auto-gc.post-rewrite.sendemail-validate.fsmonitor-watchman.post-index-change.p4-changelist.p4-prepare-changelist.p4-post-changelist.p4-pre-submit")
  .split(".").map(fold));
const isGitHook = (name) => GIT_HOOKS.has(name);
const VENV_ACTIVATE = new Set(["activate", "activate.csh", "activate.fish", "activate.nu", "activate.ps1"].map(fold));
const isVenvActivate = (name) => VENV_ACTIVATE.has(name);
const isFish = endsWithAny(".fish");
const isPlist = (name) => name.replace(/[. ]+$/, "").endsWith(".plist");
const isYaml = endsWithAny(".yml", ".yaml");
const isZsh = endsWithAny(".zsh");
const isZshTheme = endsWithAny(".zsh-theme");
const HOME_FOLDERS = [
  [".ssh", ALWAYS], ["Library/LaunchAgents", ALWAYS], ["Library/LaunchDaemons", ALWAYS], ["Library/Preferences", isPlist],
  ["Library/Preferences/ByHost", isPlist], [".hammerspoon", ALWAYS], [".zsh_sessions", ALWAYS], [".bash_sessions", ALWAYS],
  [".config/wezterm", ALWAYS], [".config/kitty", ALWAYS], [".config/alacritty", ALWAYS], [".config/ghostty", ALWAYS],
  [".config/fish/conf.d", isFish], [".config/fish/functions", isFish], [".config/fish/completions", isFish], [".config/mise", ALWAYS],
  [".local/share/fish/vendor_conf.d", ALWAYS], [".local/share/fish/vendor_functions.d", ALWAYS], [".local/share/fish/vendor_completions.d", ALWAYS],
  [".cache/zsh4humans", ALWAYS], [".config/karabiner", ALWAYS], [".config/skhd", ALWAYS], [".config/yabai", ALWAYS],
  [".config/espanso/match", isYaml], ["Library/Application Support/espanso/match", isYaml], [".oh-my-zsh/custom", endsWithAny(".zsh", ".zsh-theme")],
  [".oh-my-zsh/custom/themes", isZshTheme], [".oh-my-zsh/lib", isZsh], [".zprezto/runcoms", ALWAYS],
  ["Library/Application Support/iTerm2/Scripts/AutoLaunch", ALWAYS], ["Library/Application Support/com.mitchellh.ghostty", ALWAYS],
  ["Library/Developer/Xcode/UserData/xcdebugger", ALWAYS],
].map(([homeRelativePath, refusedSaveNames]) => ({ homeRelativePath, refusedSaveNames }));
const TOOL_PREFIXES = ["opt/homebrew", "usr/local/homebrew", "usr/local/cellar", "share/zsh/site-functions", "share/zsh-completions", "etc/bash_completion.d",
  "etc/profile.d", "share/zsh-autosuggestions", "share/zsh-syntax-highlighting", "rr-cache"];
// RCr: folders anywhere whose files a tool loads (plugin caches, bash completions); no folder-name rule of their own.
const BASH_COMPLETIONS = ["caches/antidote", "caches/antibody", "share/bash-completion/completions"];
const GIT_REPO_CONFIG = [".git/config"];
const PATH_PATTERNS = [
  /(?:^|\/)[^/]*\.git\/(?:modules\/.+\/)?(?:worktrees\/[^/]+\/)?(?:commondir|gitdir|config(?:\.worktree)?)$/,
  /(?:^|\/)[^/]*\.git\/(?:modules\/.+\/)?hooks\/[^/]+$/,
  /(?:^|\/)[^/]*\.git\/(?:modules\/.+\/)?(?:worktrees\/[^/]+\/)?merge_rr$/,
  /(?:^|\/)\.git$/,
  /\/bin\/activate(?:\.(?:csh|fish|nu|ps1))?$/,
  /\/share\/fish\/(?:(?:vendor_(?:conf|functions|completions)\.d|functions|completions)\/[^/]+|config|__fish_build_paths)\.fish$/,
  /\/etc\/fish\/(?:config|(?:conf\.d|functions|completions)\/[^/]+)\.fish$/,
  /\/etc\/gitconfig$/,
  /\/bin\/brew$/,
  /\/xcdebugger\/[^/]+$/,
  /\/\.cache\/fish\/(?:generated_completions|completions)\/[^/]+\.fish$/,
  /\/library\/application support\/blender\/[^/]+\/scripts\/startup\/(?:[^/]+\/__init__|[^/]+)\.py$/,
  /\/library\/application support\/sketchup \d{4}\/sketchup\/plugins\/[^/]+\.rb$/,
  /\/library\/application support\/freecad\/(?:[^/]+\/)?mod\/[^/]+\/init(?:gui)?\.py$/,
  /\/documents\/kicad\/\d+\.\d+\/(?:scripting|scripting\/plugins|3rdparty\/plugins)\/(?:[^/]+\/__init__|[^/]+)\.py$/,
  /\/igor procedures\/(?:[^/]+\/)*[^/]+\.ipf$/,
  /\/fiji(?:\.app)?\/macros\/autorun\/[^/]+\.ijm$/,
  /\/(?:fiji|imagej)(?:\.app)?\/macros\/(?:startupmacros(?:\.fiji)?\.(?:ijm|txt)|runatstartup\.ijm)$/,
  /\/\.cache\/p10k-(?:instant-prompt|dump)-[^/]+\.zsh$/,
  /(?:^|\/)\.zcompdump[^/]*$/,
];
const SSH_NAMES = ["authorized_keys", "known_hosts", "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"];
const HOME_FILES = [...SHELL_FILES, ...GIT_USER_CONFIG];
const HOME_FOLDER_PATHS = HOME_FOLDERS.map((e) => e.homeRelativePath);

/** Official por(): a path a tool reads as configuration or runs (git internals, venv activate, fish, brew, …). */
function pathIsProtectedByPattern(p) {
  const parts = p.replace(/\/+$/, "").split(/\/+/);
  return [parts.join("/").toLowerCase(), parts.map((part) => fold(part).replaceAll("/", "／")).join("/")].some(
    (s) => PATH_PATTERNS.some((re) => re.test(s)) || [...TOOL_PREFIXES, ...BASH_COMPLETIONS].some((pre) => s.includes(`/${pre}/`)));
}

const PROTECTED_NAMES = new Set([...SHELL_FILES.map(baseName), ...SSH_NAMES, ...GIT_NAMES].map(fold));
const PROTECTED_PREFIXES = ["p10k-instant-prompt-", "p10k-dump-", ".zcompdump"].map(fold);
// Official _or (3.6556.2 JCr): a folder name → the names that may not be saved in it (later entries win, as in the
// original Map).
const FOLDER_RULES = new Map([
  ["bin", (name) => isVenvActivate(name) || name === "brew"],
  ["hooks", isGitHook],
  ["generated_completions", isFish],
  ["etc", (name) => name === "gitconfig"],
  ["scripts", (name) => name === "autolaunch"],
  ["igor procedures", endsWithAny(".ipf")],
  ...HOME_FOLDERS.map((e) => [fold(baseName(e.homeRelativePath)), e.refusedSaveNames]),
  ...TOOL_PREFIXES.map((e) => [baseName(e), ALWAYS]),
  ["completions", (name) => isFish(name) || name.endsWith(".bash") || !name.includes(".")],
  ...[...GIT_USER_CONFIG, ...GIT_REPO_CONFIG].map((e) => {
    const file = fold(baseName(e)), worktree = file === "config" ? "config.worktree" : undefined;
    return [fold(baseName(dirName(e))), (name) => name === file || name === worktree];
  }),
]);
const opensAndRuns = (name) => { const n = name.replace(/[. ]+$/, ""); return OPENS_AND_RUNS.some((s) => n.endsWith(s)); };
const isProtectedFoldedName = (name) => PROTECTED_NAMES.has(name) || PROTECTED_PREFIXES.some((p) => name.startsWith(p)) || opensAndRuns(name);
/** Official $V(): a hidden name (a leading dot), a shell / git / ssh file, or a file type that acts when opened. */
function isProtectedName(name) { const n = foldName(name); return n.startsWith(".") || isProtectedFoldedName(n); }
const HOME_ENTRIES_ALLOWED = new Set([".trash"]);
/** Official Eor(): a hidden entry of the home folder (the Trash excepted). */
const isHiddenHomeEntry = (name) => fold(name).startsWith(".") && !HOME_ENTRIES_ALLOWED.has(String(name).toLowerCase());
const DOT_PROFILE_OK = new Set(["profile"].map(fold));
const hiddenOrGitRule = (folder) => (folder.startsWith(".") && folder !== ".git" ? ALWAYS : folder.endsWith(".git") ? FOLDER_RULES.get(".git") : undefined);
const folderRule = (folder) => FOLDER_RULES.get(folder) ?? hiddenOrGitRule(folder);

/** Official Oor(): what the protected folders and files the home folder links to elsewhere say about this folder / name. */
function relocatedVerdict(folder, name, targets) {
  if (!targets.length) return null;
  const nameAsDotFile = isProtectedFoldedName(`.${name}`) && !DOT_PROFILE_OK.has(name);
  let verdict = null;
  for (const target of targets) {
    const same = folder !== null && foldName(target.folderName) === folder;
    if ("hiddenHomeEntryName" in target) {
      if (same && isHiddenHomeEntry(target.hiddenHomeEntryName)) return "folder";
    } else if (target.fileName === null) {
      const rule = same ? folderRule(foldName(target.canonicalFolderName)) : undefined;
      if (rule === ALWAYS) return "folder";
      if (rule !== undefined && rule(name)) verdict = "name_in_folder";
    } else if ((same || nameAsDotFile) && foldName(target.fileName) === name) verdict = "name_in_folder";
  }
  return verdict;
}
/** Official eH(): "folder" (nothing may be saved there), "name_in_folder" (not under this name there) or null. */
function saveVerdict(folder, name, targets = []) {
  const f = folder === null ? null : foldName(folder);
  const rule = f === null ? undefined : folderRule(f);
  if (rule === ALWAYS) return "folder";
  const n = foldName(name);
  const relocated = relocatedVerdict(f, n, targets);
  return relocated === "folder" ? "folder" : relocated === "name_in_folder" || (rule !== undefined && rule(n)) ? "name_in_folder" : null;
}
// Official Mor / Nor: the protected folders as chains of names, innermost first, for a folder's parents.
const PARENT_CHAINS = [...HOME_FOLDERS.map((e) => [e.homeRelativePath, e.refusedSaveNames]), ...[...TOOL_PREFIXES, ...BASH_COMPLETIONS].map((e) => [e, ALWAYS])]
  .map(([p, rule]) => ({ namesInnermostFirst: p.split("/").map(fold).reverse(), refusedSaveNames: rule }))
  .filter((e) => e.namesInnermostFirst.every((n) => !n.startsWith(".")));
function rulesAt(names, index) {
  const own = hiddenOrGitRule(names[index]);
  return [...(own === undefined ? [] : [own]),
    ...PARENT_CHAINS.filter((chain) => chain.namesInnermostFirst.every((n, k) => names[index + k] === n)).map((chain) => chain.refusedSaveNames)];
}

// ── Judging a probe (official Por / For / Ior / Lor / Ror / zor / Hor / Uor / Wor / Gor / Kor / yor / bor / xor / Sor) ──
const SAVE_PANEL = "save-panel", GO_TO_FOLDER = "GoToWindow", NAME_FIELD = "saveAsNameTextField", CANCEL = "CancelButton";
const MOVE_CANCEL = "Cancel Button", DISCLOSURE = "NS_OPEN_SAVE_DISCLOSURE_TRIANGLE", GO_TO_PATH_FIELD = "PathTextField", SEARCH = "Search";
const saveSheetUp = (p) => p.sheetIdentifiers.includes(SAVE_PANEL);
const goToFolderUp = (p) => p.sheetIdentifiers.includes(GO_TO_FOLDER);
const hitIsTypingField = (p) => p.hitIdentifier === NAME_FIELD || p.hitIdentifier === SEARCH;
const firstSheetIsSave = (p) => p.sheetIdentifiers[0] === SAVE_PANEL;
function documentVerdict(p) {
  return p.windowDocumentReadFailed ? { allowed: false, reason: "document_read_failed" }
    : p.documentPathIsProtected ? { allowed: false, reason: "protected_document" } : { allowed: true };
}
/** Official For(): a sheet or popover state that refuses this input outright (a key of the ht() messages), or null. */
function sheetBlocker(p, action, typedText) {
  if (p.moveSheetIsUp) return action?.kind === "click" && action.button === "left" && (action.count ?? 1) === 1 && p.hitIdentifier === MOVE_CANCEL ? null : "move_sheet";
  const popover = popoverBlocker(p, typedText);
  if (popover) return popover;
  if (p.popoverFolderMenuIsOpen) return "folder_menu";
  if ((p.popoverPopUpValues ?? []).length === 0) return null;
  if (action?.kind === "drag" && action.probeIsOfTheFocus) return "background_drag_beside_a_pop_up";
  if (p.hitTestFellBack && (action?.kind === "drag" || (action?.kind === "click" && (action.count ?? 1) > 1))) return "unseen_point_beside_a_pop_up";
  if (p.focusRole !== "AXPopUpButton") return null;
  if (action?.kind === "drag") return "pop_up_drag";
  if (action?.kind === "click" && (action.count ?? 1) > 1) return "pop_up_multi_click";
  return typedText !== undefined && Array.from(typedText).length > 1 ? "pop_up_burst" : null;
}
/** Official Ior(): the title-bar popover's name box and folder pop-up. */
function popoverBlocker(p, typedText) {
  if (p.popoverTextFieldIsUnreadable) return "unreadable_name";
  const texts = p.popoverTextFieldValues ?? [], popUps = p.popoverPopUpValues ?? [];
  const verdict = (name, folder) => saveVerdict(folder, name, p.resolvedProtectedTargets);
  if (texts.length > 0 && popUps.some((folder) => verdict("", folder) === "folder")) return "protected_folder_shown";
  const refused = (name) => isProtectedName(name) || popUps.some((folder) => verdict(name, folder) === "name_in_folder");
  if (texts.some((text) => text !== "" && refused(text))) return "new_name";
  if (typedText === undefined || !popoverHoldsTyping(p)) return null;
  return [typedText, ...texts.map((text) => text + typedText)].some(refused) ? "new_name" : null;
}
const popoverHoldsTyping = (p) => p.popoverHoldsTheFocus === true && (p.popoverTextFieldValues ?? []).length > 0;
const nameIsPath = (name) => { const t = unquote(name); return t.includes("/") || t.startsWith("..") || t.startsWith("~"); };
/** Official zor(): may this text be typed where the save sheet's keyboard focus is? */
function typingVerdict(p, text) {
  if (goToFolderUp(p) && p.focusIdentifier === GO_TO_PATH_FIELD) return { allowed: false, reason: "goto_path_unverifiable" };
  if (p.focusIdentifier === NAME_FIELD) {
    if (text === null) return { allowed: true };
    if (nameIsPath(text)) return { allowed: false, reason: "name_is_path" };
    if (isProtectedName(text) || saveVerdict(p.saveWhereDisplayName, text, p.resolvedProtectedTargets) === "name_in_folder") return { allowed: false, reason: "name_protected" };
    return { allowed: true };
  }
  return p.focusIdentifier === SEARCH ? { allowed: true } : { allowed: false, reason: "not_a_typing_field" };
}
const NAVIGATION_KEYS = new Set(["up", "down", "left", "right", "home", "end", "delete", "backspace", "forwarddelete", "pageup", "pagedown", "page_up", "page_down"]);
const SAVE_SHEET_KEYS = new Set(["return", "enter", "kp_enter", "escape", "tab", ...NAVIGATION_KEYS]);
const RETURN_KEYS = new Set(["return", "enter", "kp_enter"]);
/** Official Hor(): would confirming the save sheet now save under a protected name or into a protected folder? */
function confirmVerdict(p, count = 1) {
  if (count > 1 && !hitIsTypingField(p)) return { allowed: false, reason: "confirm_multi_click" };
  const name = p.saveNameValue, folder = p.saveWhereDisplayName;
  if (name === null || folder === null) return { allowed: false, reason: "confirm_target_unreadable" };
  const verdict = saveVerdict(folder, name, p.resolvedProtectedTargets);
  return verdict === "folder" ? { allowed: false, reason: "confirm_folder_protected" }
    : verdict === "name_in_folder" || isProtectedName(name) || nameIsPath(name) ? { allowed: false, reason: "confirm_name_protected" } : { allowed: true };
}
/** Official Wor(): the save target's parent folders (innermost first) against the protected folder chains. */
function parentsVerdict(name, parents) {
  const names = parents.map(foldName);
  const rules = names.flatMap((_, i) => rulesAt(names, i));
  if (rules.includes(ALWAYS)) return { allowed: false, reason: "confirm_folder_protected" };
  const n = foldName(name);
  return rules.some((rule) => rule(n)) ? { allowed: false, reason: "confirm_name_protected" } : { allowed: true };
}
/** Official Uor(): with the folder pop-up's path (the shown folder, then its parents). */
function pathVerdict(p, names) {
  const name = p.saveNameValue, folder = p.saveWhereDisplayName;
  if (name === null || folder === null || !names?.length) return { allowed: false, reason: "confirm_target_unreadable" };
  const [shown, ...parents] = names;
  return foldName(shown) === foldName(folder) ? parentsVerdict(name, parents) : { allowed: false, reason: "confirm_target_unreadable" };
}
/** Official Gor(): "file:///a/b/" → ["b", "a"] (innermost first), or null. */
function folderNamesOf(url) {
  if (typeof url !== "string" || !url.startsWith("file:///")) return null;
  try {
    const names = url.slice(7).split("/").filter((part) => part !== "").map(decodeURIComponent);
    return names.some((part) => part === "." || part === ".." || part.includes("/")) ? null : names.reverse();
  } catch { return null; }
}
/** Official Kor(): in the background, the folder is read from the sheet's file list. */
function listedFolderVerdict(p) {
  const names = folderNamesOf(p.saveShownFolderUrl);
  if (names === null) return { allowed: false, reason: "confirm_folder_not_shown" };
  if (p.saveNameValue === null || p.saveWhereDisplayName === null) return { allowed: false, reason: "confirm_target_unreadable" };
  if (p.saveTargetPathIsProtected) return { allowed: false, reason: "confirm_folder_protected" };
  const [shown = p.saveWhereDisplayName, ...parents] = names;
  const verdict = confirmVerdict({ ...p, saveWhereDisplayName: shown });
  return verdict.allowed ? parentsVerdict(p.saveNameValue, parents) : verdict;
}

// ── The refusals (official wording, BEf0UhNC z / mt / G / ht / _t and the inline ones) ──
const REASON = "save_panel_restricted";
const NO_WORKAROUND = " Do not attempt to work around this restriction — never use scripting, automation tools, shell commands, or any other method to send clicks or keystrokes to this app.";
const PROTECTED_FILE = "protected file (under a hidden entry of the home folder, or a launch-agent or similar path)";
const OFF_LIMITS = ' Hidden files and folders (names that start with "."), shell-cache files, launch agents, git / fish config files and hooks, and file types that run when opened (Terminal settings and command files, location files, configuration profiles, web archives) are off-limits: they run automatically at login, on the next shell, git or tool launch, or when the file is opened, or they hold credentials. Save the document under an ordinary name in an ordinary folder (Documents, Desktop) instead.' + NO_WORKAROUND;
const refuse = (message, extra = {}) => ({ outcome: "unsupported", reasonCode: REASON, errorKind: REASON, message, ...extra });
const SHEET_MESSAGES = {
  move_sheet: "Moving a document with File > Move To… is not available to computer use: nothing checks where the file would land. Click the sheet's Cancel button (allowed). To put a copy somewhere else use File > Duplicate and save it, or ask the user to move the file.",
  folder_menu: "Choosing a folder here would move the document at once, and nothing checks where it would land, so it is not available to computer use. Close the menu by pressing escape with the full-screen key tool (allowed; clicks and the app_* tools are refused while it is open), or ask the user to move the file.",
  new_name: "Giving the document this name from its title bar is not allowed: it is a protected name. Press escape with the full-screen key tool, which puts the old name back (allowed; app_key escape and every other input would commit the name), then choose another name, or ask the user.",
  unreadable_name: "Could not read what a popover's text field holds, so the name it would give the document cannot be checked. Press escape with the full-screen key tool to close the popover (allowed), or ask the user.",
  protected_folder_shown: "This popover would put the document into a folder named like a protected one, and the folders above it cannot be seen from here. Press escape with the full-screen key tool to close the popover (allowed; every other input would commit it). Save a new document with cmd+s instead, or ask the user.",
  pop_up_multi_click: "A double or triple click on a pop-up button is not available to computer use: the first press opens its menu and the next would pick in it before anything can check it. Click it once.",
  background_multi_click_beside_a_pop_up: "A double or triple app_click is not available while a popover with a pop-up button is open in this app: what lies under the pointer cannot be checked in the background. Click once, or close the popover first.",
  unseen_point_beside_a_pop_up: "What lies under the pointer could not be read while a popover with a pop-up button is open, so a drag or a double or triple click cannot be checked. Click once, or close the popover first.",
  background_drag_beside_a_pop_up: "app_drag is not available while a popover with a pop-up button is open in this app: what lies under the drag's ends cannot be checked in the background. Close the popover first, or use left_click_drag.",
  pop_up_drag: "Dragging from or onto a pop-up button is not available to computer use: the release would pick a menu item before anything can check it. Click the pop-up to open its menu instead.",
  pop_up_burst: "Typing text while a pop-up button holds the keyboard focus is not available to computer use: the first key opens its menu and the rest would pick in it before anything can check it. Press one key at a time, or click the pop-up.",
};
const sheetRefusal = (key) => refuse(SHEET_MESSAGES[key] + (key === "new_name" ? OFF_LIMITS : NO_WORKAROUND), { saveGuard: key });
function targetRefusal(verdict, kind) {
  const what = kind === "click" ? "this click" : "the save";
  if (verdict.reason === "confirm_target_unreadable") {
    return refuse(`Could not read the save sheet's current target folder and file name, so ${what} cannot be verified. If a menu is open, close it (click the file-name box) and retry; otherwise click Cancel, reopen the sheet, and retry.${OFF_LIMITS}`, { saveGuard: verdict.reason });
  }
  if (verdict.reason === "confirm_folder_not_shown") {
    return refuse(`${kind === "click" ? "This click" : "This"} could confirm a save, and the sheet as it stands does not tell which folder it would go to: in the background that is read from the sheet's file list. If the sheet is compact, click the arrow button beside the folder pop-up to expand it (allowed), then retry. If it is already expanded, it shows an empty folder or search results: call request_full_control and confirm there, or click Cancel (allowed).${OFF_LIMITS}`, { saveGuard: verdict.reason });
  }
  if (verdict.reason === "confirm_multi_click") {
    return refuse("A double- or triple-click is not allowed in a save sheet: on an existing file it takes that file's name and presses Save in the same gesture. Use single clicks — the sidebar, the folder pop-up above the list, or column view (click a folder once; arrow keys move between columns) — and press Save with its own left_click. Double-clicking inside the name box to select text is fine." + NO_WORKAROUND, { saveGuard: verdict.reason });
  }
  const { what: target, howToRecover } = verdict.reason === "confirm_folder_protected"
    ? { what: "a protected folder — a hidden folder or one inside it, or a launch-agent, zsh4humans, fish vendor or similar location where nothing may be saved", howToRecover: "Click Cancel (allowed) and start over." }
    : { what: "a protected file name — a hidden name, a shell-cache file, a git / fish config or completion file or git hook that runs automatically from a folder of this name, or a file type that runs or acts on its contents as soon as it is opened (a different file name here may be allowed)",
      howToRecover: "To replace the name in the box: press Down, then shift+Home (one key per action; selects the whole name), then type the new name and press Return; or click Cancel (allowed) and start over." };
  return refuse(kind === "click" ? `This click could confirm a save to ${target}. ${howToRecover}${OFF_LIMITS}` : `Saving here is not allowed: the target is ${target}. ${howToRecover}${OFF_LIMITS}`, { saveGuard: verdict.reason });
}
const TYPING_REASONS = {
  name_is_path: 'the file-name box may only hold a plain name — no "/" and no leading ".." or "~" (those turn it into a path)',
  name_protected: "that file name is protected (a hidden name, a shell-cache file, a git / fish config or completion file or git hook in this folder, or a file type that runs or acts on its contents as soon as it is opened). Save it under a different name (for example notes.txt) and tell the user, or ask the user to save it themselves",
  goto_path_unverifiable: "the Go-to-Folder box's contents cannot be verified. Click the save sheet's Cancel button (allowed) or ask the user to dismiss the box, then use the file browser instead",
  not_a_typing_field: "keyboard focus is not on the file-name box or the search field",
};
// Refusals the gate retries itself (official Nt / Lt): the sheet still settling, or the folder's parents not read yet.
const SETTLE = "last_input_to_settle";
const settleRefusal = () => refuse("The save sheet's target could not be verified this soon after the previous input. Retry the action." + NO_WORKAROUND, { retry: SETTLE });
const parentsRefusal = (pid) => refuse("The folders above the one this save sheet shows could not be checked before the sheet changed. Retry the action." + NO_WORKAROUND, { retry: { parentFoldersOfPid: pid } });

// ── Keys (official xA / SA / gA / hA / bt / CA) ──
const modsOf = (chord) => parseCombo(chord).mods;
const keysOf = (chord) => parseCombo(chord).keys;
/** Official hA(): shift at most, and only navigation / delete keys (a repeat of it needs no new check). */
const navigationOnly = (chord) => modsOf(chord).every((m) => m === "shift") && keysOf(chord).every((k) => NAVIGATION_KEYS.has(k));
const WINDOW_NAV = new Set(["escape", "up", "down", "left", "right", "home", "end", "pageup", "pagedown", "page_up", "page_down"]);
const WINDOW_SHORTCUTS = new Set(["n", "o", "w", "`", "m", "h", ",", "f", "g", "p", "a", "c"]);
/** Official bt(): a key that only moves or opens / closes windows, allowed in a window editing a protected file. */
function movesOrWindows(chord) {
  const mods = modsOf(chord), keys = keysOf(chord);
  if (keys.length !== 1) return false;
  if (WINDOW_NAV.has(keys[0])) return !mods.includes("ctrl");
  return mods.includes("meta") && mods.every((m) => m === "meta" || m === "shift") && WINDOW_SHORTCUTS.has(keys[0]);
}
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029\uF700-\uF8FF]/;
const hasControlChars = (text) => CONTROL_CHARS.test(text);

const LET_THROUGH = Symbol("save let through");

// ── The protected index (official ONr / wNr / TNr / ANr / jNr / kNr) ──
function stripDataVolume(p) {
  if (process.platform !== "darwin") return null;
  const parts = p.split("/"), prefix = "/System/Volumes/Data".split("/");
  if (parts.length < prefix.length) return null;
  for (let i = 0; i < prefix.length; i++) if (parts[i].toLowerCase() !== prefix[i].toLowerCase()) return null;
  const rest = parts.slice(prefix.length).join("/");
  return rest === "" ? "/" : `/${rest}`;
}
const firm = (p) => stripDataVolume(p) ?? p;
const segmentKey = (segment) => { const t = segment.normalize("NFKC").replaceAll("/", "／").toLowerCase(); return t === "" || t === "." || t === ".." ? segment.toLowerCase() : t; };
const pathKey = (p) => firm(p).split("/").map(segmentKey).join("/");
function inside(child, parent, { allowEqual = true } = {}) {
  const rel = path.relative(parent, child);
  return rel.length === 0 ? allowEqual : !path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${path.sep}`);
}
async function realish(p) {
  try { return await fsp.realpath(p); } catch {
    let target = p;
    try { target = path.resolve(path.dirname(p), await fsp.readlink(p)); } catch {}
    try { return path.join(await fsp.realpath(path.dirname(target)), path.basename(target)); } catch { return target; }
  }
}

function createProtectedIndex({ home = os.homedir() } = {}) {
  let homeKeys = null, index = null;
  const keysOfHome = () => (homeKeys ??= fsp.realpath(home).then((real) => [...new Set([home, real].map((p) => pathKey(path.resolve(p))))], () => { homeKeys = null; return [pathKey(path.resolve(home))]; }));
  const resolvedRel = async (rel) => pathKey(await realish(path.join(home, rel)));
  const resolvedEntry = async (p) => {
    const [real, isDirectory] = await Promise.all([realish(p), fsp.stat(p).then((s) => s.isDirectory(), () => false)]);
    return { resolved: pathKey(real), isDirectory };
  };
  const linksIn = async (dir) => {
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    return Promise.all(entries.filter((e) => e.isSymbolicLink()).map((e) => resolvedEntry(path.join(dir, e.name))));
  };
  /** Official TNr: the path is under a hidden entry of the home folder. */
  const underHiddenHomeEntry = (p, keys) => {
    const resolved = firm(path.resolve(p)), key = pathKey(resolved), parts = resolved.split("/");
    return keys.some((homeKey) => inside(key, homeKey, { allowEqual: false }) && isHiddenHomeEntry(parts[homeKey.split("/").length] ?? ""));
  };
  const hiddenHomeLinks = async () => {
    const entries = (await fsp.readdir(home, { withFileTypes: true }).catch(() => [])).filter((e) => isHiddenHomeEntry(e.name));
    const each = await Promise.all(entries.map(async (e) => {
      const full = path.join(home, e.name);
      const found = e.isSymbolicLink() ? [await resolvedEntry(full)] : e.isDirectory() ? await linksIn(full) : [];
      return found.map((entry) => ({ ...entry, hiddenHomeEntryName: e.name }));
    }));
    return each.flat();
  };
  const build = () => (index ??= (async () => {
    const keys = await keysOfHome();
    const isInsideHome = (p) => keys.some((k) => inside(k, p));
    const files = await Promise.all(HOME_FILES.map(resolvedRel));
    const folders = (await Promise.all(HOME_FOLDER_PATHS.map(async (rel) => ({ rel, resolved: await resolvedRel(rel), members: await linksIn(path.join(home, rel)) }))))
      .filter((f) => !isInsideHome(f.resolved));
    const underHome = (rel) => keys.map((k) => path.join(k, pathKey(rel)));
    const homeFileKeys = new Set(HOME_FILES.flatMap(underHome));
    const knownByName = (p) => homeFileKeys.has(p) || isProtectedName(path.basename(p)) || saveVerdict(path.basename(path.dirname(p)), path.basename(p)) !== null;
    const relocated = [];
    const note = (p) => { if (!knownByName(p)) relocated.push({ folderName: path.basename(path.dirname(p)), fileName: path.basename(p) }); };
    for (const f of files) note(f);
    for (const { rel, resolved, members } of folders) {
      if (!underHome(rel).includes(resolved) && path.basename(resolved) !== pathKey(path.basename(rel))) {
        relocated.push({ folderName: path.basename(resolved), fileName: null, canonicalFolderName: pathKey(path.basename(rel)) });
      }
      for (const m of members) note(m.resolved);
    }
    const hidden = (await hiddenHomeLinks()).filter(({ resolved }) => !isInsideHome(resolved));
    const outside = hidden.filter(({ resolved }) => !underHiddenHomeEntry(resolved, keys));
    for (const { resolved, isDirectory } of hidden) if (!isDirectory) note(resolved);
    const folderKeys = new Set(folders.map((f) => f.resolved));
    for (const { hiddenHomeEntryName, resolved, isDirectory } of outside) {
      if (isDirectory && !folderKeys.has(resolved)) relocated.push({ folderName: path.basename(resolved), fileName: null, hiddenHomeEntryName });
    }
    const seen = new Set();
    return {
      files: new Set([...homeFileKeys, ...files, ...folders.flatMap((f) => f.members.map((m) => m.resolved))]),
      dirs: [...new Set([...HOME_FOLDER_PATHS.flatMap(underHome), ...folders.map((f) => f.resolved), ...outside.map((h) => h.resolved)])],
      relocatedTargets: relocated.filter((t) => { const k = JSON.stringify(t); if (seen.has(k)) return false; seen.add(k); return true; }),
    };
  })());
  return {
    /** Official jNr: is the file a URL names protected (under a hidden home entry, a protected file or folder, a pattern)? */
    async isProtectedUrl(url) {
      let p;
      try { p = fileURLToPath(url); } catch { return false; }
      const candidates = [p, await realish(p)];
      const keys = await keysOfHome();
      if (candidates.some((c) => underHiddenHomeEntry(c, keys))) return true;
      const { files, dirs } = await build();
      return candidates.some((c) => { const key = pathKey(c); return files.has(key) || dirs.some((d) => inside(key, d)) || pathIsProtectedByPattern(c); });
    },
    /** Official kNr: the protected folders and files the home folder links to elsewhere. */
    async relocatedTargets() { return (await build()).relocatedTargets; },
    /** Official YFr: would saving this name into this folder (a file URL) hit a protected path? */
    async targetIsProtected(folderUrl, name) {
      if (folderUrl === undefined || folderUrl === null || name === undefined || name === null) return false;
      return (await Promise.all([name, unquote(name)].map((n) => this.isProtectedUrl(folderUrl + encodeURIComponent(n))))).some(Boolean);
    },
  };
}

// ── The guard ──
const SETTLE_MS = 750;      // official At: the sheet settles this long after the last input
const RETRIES = 2;          // official Pt
const POLL_MS = 50;
const UNAVAILABLE = new Set(["unknown_method", "native_unavailable"]);
/** probe()'s answer when the native probe failed (not missing): the screen-wide gates refuse (fail closed); app() lets it be. */
const PROBE_FAILED = Object.freeze({ probeFailed: true });
const probeFailedRefusal = () => refuse("Could not verify which document this window is editing. Take a fresh screenshot and retry.");

/**
 * native: {call(method, params)} (native.cjs). platform: process.platform. now: ms clock. wait(ms). index: a
 * createProtectedIndex(). Returns the gates the service runs; on another platform, or when the native module has no
 * savePanelProbe, every gate answers null (nothing to judge).
 */
function createSavePanelGuard({ native, log = console, platform = process.platform, now = () => performance.now(), wait, index = createProtectedIndex() } = {}) {
  const pause = wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let available = platform === "darwin" && !!native;
  let lastInputAt = -Infinity;
  let pass = 0;                 // official wt: the input gate's passes
  let parents = null;           // official Tt: {ownerPid, pass, answer}
  const settleLeft = () => Math.max(0, lastInputAt + SETTLE_MS - now());
  const popoverSettling = (p) => (p.popoverTextFieldValues ?? []).length > 0 && settleLeft() > 0;

  const guard = {
    get available() { return available; },
    settleLeft,
    /** Official q(): an input went out (its delivery finished): the sheet gets SETTLE_MS before a Return / Save. */
    inputDone() { lastInputAt = now(); },
    /** Runs an input delivery and marks its end (official q()). */
    async input(run) { try { return await run(); } finally { lastInputAt = now(); } },
    /**
     * The native probe with the protected-path facts added (the darwin executor's savePanelProbe); null when the host
     * has no probe (the guard turns off), PROBE_FAILED when the probe failed (the guard stays on; see PROBE_FAILED).
     */
    async probe(params = {}) {
      if (!available) return null;
      let raw;
      try { raw = (await native.call("savePanelProbe", params))?.probe ?? null; } catch (error) {
        // Only a host without the probe (an older native module, no native module at all) turns the guard off, as the
        // official executor without savePanelProbe does. Any other failure fails closed: the official gate lets the
        // probe's throw end the call, so nothing is delivered; here the input is refused and the guard stays on.
        if (UNAVAILABLE.has(error?.code)) { available = false; return null; }
        log.warn?.("[computer-use] savePanelProbe failed", error?.message ?? error);
        return PROBE_FAILED;
      }
      if (!raw || typeof raw !== "object") return null;
      const url = typeof raw.windowDocumentUrl === "string" ? raw.windowDocumentUrl : null;
      const others = Array.isArray(raw.otherWindowDocumentUrls) ? raw.otherWindowDocumentUrls.filter((u) => typeof u === "string") : [];
      const str = (v) => (typeof v === "string" ? v : null);
      const strings = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []);
      const fellBack = raw.hitTestFellBack === true;
      return {
        ownerPid: Number.isInteger(raw.ownerPid) ? raw.ownerPid : null,
        hitIdentifier: str(raw.hitIdentifier),
        hitTestFellBack: fellBack,
        fallbackMayHideProtectedTarget: fellBack && (raw.otherWindowHasSaveSheet === true || (await Promise.all(others.map((u) => index.isProtectedUrl(u)))).some(Boolean)),
        focusRole: str(raw.focusRole),
        focusIdentifier: str(raw.focusIdentifier),
        sheetIdentifiers: strings(raw.sheetIdentifiers),
        windowDocumentUrl: url,
        windowDocumentReadFailed: raw.windowDocumentReadFailed === true,
        documentPathIsProtected: url !== null && await index.isProtectedUrl(url),
        saveNameValue: str(raw.saveNameValue),
        saveWhereDisplayName: str(raw.saveWhereDisplayName),
        saveShownFolderUrl: str(raw.saveShownFolderUrl),
        saveTargetPathIsProtected: await index.targetIsProtected(str(raw.saveShownFolderUrl), str(raw.saveNameValue)),
        resolvedProtectedTargets: await index.relocatedTargets().catch((error) => { log.debug?.(`[computer-use] resolved protected targets unavailable: ${String(error)}`); return []; }),
        moveSheetIsUp: raw.moveSheetIsUp === true,
        popoverFolderMenuIsOpen: raw.popoverFolderMenuIsOpen === true,
        popoverTextFieldValues: strings(raw.popoverTextFieldValues),
        popoverPopUpValues: strings(raw.popoverPopUpValues),
        popoverTextFieldIsUnreadable: raw.popoverTextFieldIsUnreadable === true,
        popoverHoldsTheFocus: raw.popoverHoldsTheFocus === true,
      };
    },

    /** Official Ot(): one key / chord / text against the probe. LET_THROUGH: a Return that confirms a save sheet. */
    keyCheck(p, gateKind, { chord, typedText, held = false } = {}) {
      let confirms = false;
      const blocker = sheetBlocker(p, undefined, typedText);
      const loneEscape = chord !== undefined && !held && modsOf(chord).length === 0 && keysOf(chord).join() === "escape";
      if (blocker && !(loneEscape && ["new_name", "unreadable_name", "protected_folder_shown", "folder_menu"].includes(blocker))) return sheetRefusal(blocker);
      if (typedText === undefined && !loneEscape && popoverSettling(p)) return settleRefusal();
      if (typedText !== undefined && popoverHoldsTyping(p) && hasControlChars(typedText)) {
        return refuse("Typed text that holds a tab, a newline or another control character is not available while a popover's text field has the keyboard focus: it would commit the field before it can be checked. Type the text without it, then press the key with a key call." + NO_WORKAROUND);
      }
      const doc = documentVerdict(p);
      if (!doc.allowed) {
        if (doc.reason === "protected_document" && gateKind === "keyboard" && chord !== undefined && typedText === undefined && movesOrWindows(chord)) return null;
        return refuse(doc.reason === "document_read_failed" ? "Could not verify which document this window is editing. Take a fresh screenshot and retry."
          : `Typing into this window is not allowed: it is editing a ${PROTECTED_FILE}. Navigation and window shortcuts (cmd+n, cmd+o, cmd+w, cmd+\`) still work; anything that edits, pastes, or saves does not. Close it with cmd+w or ask the user.${OFF_LIMITS}`);
      }
      if (!saveSheetUp(p)) return null;
      if (chord !== undefined) {
        const keys = keysOf(chord);
        if (!modsOf(chord).every((m) => m === "shift") || !(keys.length === 1 && SAVE_SHEET_KEYS.has(keys[0]))) {
          return refuse(`Key "${chord}" is not one of the allowed navigation keys while a save sheet is open. Use \`type\` for the file name (it replaces the pre-selected name; to re-select, double-click the name box or press shift+home), click to navigate, and press a single Return, Tab, or arrow key to move.${OFF_LIMITS}`);
        }
        if (goToFolderUp(p) && RETURN_KEYS.has(keys[0])) {
          return refuse("Return in the Go-to-Folder box is not allowed: its contents cannot be verified. Click the save sheet's Cancel button (allowed) or ask the user to dismiss the box, then use the file browser instead." + OFF_LIMITS);
        }
        if (RETURN_KEYS.has(keys[0])) {
          if (settleLeft() > 0) return settleRefusal();
          const verdict = confirmVerdict(p);
          if (!verdict.allowed) return targetRefusal(verdict, "key");
          confirms = firstSheetIsSave(p);
        }
      }
      if (gateKind === "keyboard" && typedText !== undefined && hasControlChars(typedText)) {
        return refuse("Text may not contain tab, newline or other control characters while a save sheet is open — a Return here would confirm the save. Type the file name only, then press Return as a separate action." + OFF_LIMITS);
      }
      if (gateKind === "keyboard" && typedText !== undefined) {
        const verdict = typingVerdict(p, typedText);
        if (!verdict.allowed) return refuse(`Typing this into the save sheet is not allowed: ${TYPING_REASONS[verdict.reason]}.${OFF_LIMITS}`, { saveGuard: verdict.reason });
      }
      return confirms ? LET_THROUGH : null;
    },

    /** Official Ht(): a click or drag at a point against the probe. LET_THROUGH: a click that may confirm a save sheet. */
    pointCheck(p, action) {
      if (p.hitTestFellBack && p.fallbackMayHideProtectedTarget) return refuse(`Could not verify which window this ${action.kind === "click" ? "click" : "drag"} lands on. Take a fresh screenshot and retry.`);
      const doc = documentVerdict(p);
      if (!doc.allowed) {
        return refuse(doc.reason === "document_read_failed" ? "Could not verify which document this window is editing. Take a fresh screenshot and retry."
          : `Pointer input into this window is not allowed: it is editing a ${PROTECTED_FILE}. Close it with cmd+w, click a different app's window, or ask the user to close it.${OFF_LIMITS}`);
      }
      const blocker = sheetBlocker(p, action);
      if (blocker) return sheetRefusal(blocker);
      if (popoverSettling(p)) return settleRefusal();
      const moveSheet = p.moveSheetIsUp === true;
      if (!saveSheetUp(p) && !moveSheet) return null;
      if (action.kind === "click" && settleLeft() > 0) return settleRefusal();
      if (action.kind === "click" && (action.button !== "left" || (action.chord !== undefined && !modsOf(action.chord).every((m) => m === "shift")))) {
        return refuse("Only a left click, holding shift at most, is allowed in a save sheet: a right, middle or ctrl click opens a context menu whose actions cannot be checked." + OFF_LIMITS);
      }
      if (moveSheet || (action.kind === "click" && (action.count ?? 1) === 1 && p.hitIdentifier === CANCEL)) return null;
      if (action.kind === "drag") return refuse("A held press or drag is not allowed while a save sheet is open. Use a single left_click (Save is checked; Cancel is always allowed)." + OFF_LIMITS);
      if (goToFolderUp(p)) return refuse("Clicks are not allowed while the Go-to-Folder box is open: its contents cannot be verified. Click the save sheet's Cancel button (allowed) to back out, or ask the user to dismiss the box." + OFF_LIMITS);
      const verdict = confirmVerdict(p, action.count ?? 1);
      if (!verdict.allowed) return targetRefusal(verdict, "click");
      return hitIsTypingField(p) || !firstSheetIsSave(p) ? null : LET_THROUGH;
    },

    /**
     * Official Et(): a Return / Save the sheet would confirm — its folder's parents, read from the folder pop-up
     * (native saveSheetFolderAndParents, fetched by the retry), against the protected chains.
     */
    async confirmThrough(p, kind) {
      const cached = parents;
      if (!cached || cached.ownerPid !== p.ownerPid || cached.pass !== pass) return parentsRefusal(p.ownerPid);
      if (cached.answer === "a_menu_is_open") {
        return kind === "key" ? null : refuse("A menu of this save sheet is open. Choose from it with the arrow keys and Return, or click the file-name box to close it, then retry." + NO_WORKAROUND);
      }
      const verdict = pathVerdict(p, cached.answer);
      return verdict.allowed ? null : targetRefusal(verdict, kind);
    },

    /** Official Rt(): wait for the sheet to settle; for a parents retry, read them now (good for the next pass only). */
    async beforeRetry(refusal, { signal, what = "Input" } = {}) {
      for (let left = settleLeft(); left > 0; left = settleLeft()) {
        if (signal?.aborted) return refuse(`${what} aborted (user interrupt).`, { reasonCode: "aborted", errorKind: "aborted" });
        await pause(Math.min(POLL_MS, left));
      }
      const retry = refusal?.retry;
      if (!retry || retry === SETTLE) return null;
      if (signal?.aborted) return refuse(`${what} aborted (user interrupt).`, { reasonCode: "aborted", errorKind: "aborted" });
      const nextPass = pass + 1;
      let answer = null;
      try {
        const got = (await native.call("saveSheetFolderAndParents", { pid: retry.parentFoldersOfPid }))?.answer ?? null;
        answer = got?.menuWasOpen === true ? "a_menu_is_open" : Array.isArray(got?.names) ? got.names.filter((n) => typeof n === "string") : null;
      } catch (error) {
        if (UNAVAILABLE.has(error?.code)) { log.warn?.("[computer-use] save sheet confirmed without its parent folders: this host cannot read them"); answer = undefined; }
      }
      if (signal?.aborted) return refuse(`${what} aborted (user interrupt).`, { reasonCode: "aborted", errorKind: "aborted" });
      parents = answer === undefined ? { ownerPid: retry.parentFoldersOfPid, pass: nextPass, answer: null, unsupported: true } : { ownerPid: retry.parentFoldersOfPid, pass: nextPass, answer };
      return null;
    },

    /** Runs a gate, retrying it after a settle / parents refusal (official Bt / zt: at most RETRIES more times). */
    async retrying(run, options = {}) {
      let result = await run();
      for (let i = 0; i < RETRIES && result?.retry; i++) {
        const stop = await guard.beforeRetry(result, options);
        if (stop) return stop;
        result = await run();
      }
      return result ? strip(result) : null;
    },

    /**
     * The screen-wide keyboard's gate (official St() inside V()): gateKind "keyboard" for type / key / hold_key, a
     * pointer gate kind for a click holding `chord`. The frontmost app's focused window is probed.
     */
    async keyboard(gateKind, { chord, typedText, held = false, signal, what = "Key press" } = {}) {
      if (gateKind !== "keyboard" && chord === undefined) return null;
      return guard.retrying(async () => {
        // One pass per input gate (official wt in V()); a click's pass is counted by its hit test (pointer()).
        if (gateKind === "keyboard") pass += 1;
        const p = await guard.probe();
        if (!p) return null;
        if (p === PROBE_FAILED) return probeFailedRefusal();
        if (gateKind !== "keyboard" && chord !== undefined && keysOf(chord).length > 0) {
          return refuse(`A click may hold modifier keys only here, and "${chord}" also presses a key. Send that key as its own \`key\` action, then click.`);
        }
        if (chord !== undefined && keysOf(chord).length > 1 && !navigationOnly(chord)) {
          return refuse(`"${chord}" presses more than one key in a single action, which is not allowed here. Send one key (with its modifiers) per call; each is checked on its own.`);
        }
        const verdict = guard.keyCheck(p, gateKind, { chord, typedText, held });
        return verdict === LET_THROUGH ? guard.confirmThroughOrSkip(p, "key") : verdict;
      }, { signal, what });
    },
    async confirmThroughOrSkip(p, kind) {
      if (parents?.unsupported && parents.ownerPid === p.ownerPid && parents.pass === pass) return null;
      return guard.confirmThrough(p, kind);
    },

    /** Official kt(): a held press (left_mouse_down) while the frontmost window shows a save sheet or edits a protected file. */
    async heldPress() {
      const p = await guard.probe();
      if (!p) return null;
      if (p === PROBE_FAILED) return probeFailedRefusal();
      if (p.windowDocumentReadFailed) return refuse("Could not read the frontmost app's window, so a held press cannot be checked. Take a fresh screenshot and retry. If this message repeats, stop: bring a different app to the front or ask the user.");
      const blocker = sheetBlocker(p);
      if (blocker) return sheetRefusal(blocker);
      return saveSheetUp(p) ? refuse("A held press is not allowed while a save sheet is open. Use a single left_click (Save is checked; Cancel is always allowed)." + OFF_LIMITS) : null;
    },

    /**
     * A screen-wide click / drag at a global point (official Vt() in U(), and h() = Et() once the hit test passed):
     * {refusal} now, or {refusal: null, confirm} where confirm() runs the parents check last. menuBar: the point is on
     * the menu bar (the frontmost app's window is probed, no point).
     */
    async pointer({ bundleId, point, menuBar = false, kind, button, count, chord } = {}) {
      pass += 1;
      const p = await guard.probe(menuBar ? {} : { bundleId, point });
      if (!p) return { refusal: null, confirm: async () => null };
      if (p === PROBE_FAILED) return { refusal: probeFailedRefusal(), confirm: async () => null };
      const verdict = guard.pointCheck(p, { kind, button, count, chord });
      if (verdict === LET_THROUGH) return { refusal: null, confirm: () => guard.confirmThroughOrSkip(p, "click") };
      return { refusal: verdict, confirm: async () => null };
    },

    /**
     * The app_* tools on a window (official Ut()): action {kind: click | type | key | drag | focus | menu, button?, count?,
     * text?, combo?, window?: "locked" | "main"}; point: the action's global point, none for the focused element.
     */
    async app({ windowId, bundleId, point, action, signal } = {}) {
      if (!available || windowId === undefined || windowId === null) return null;
      let documentSeen = false;
      const judge = (p) => {
        if (p.windowDocumentReadFailed) {
          return refuse("Could not read which file this window is editing (the app did not answer, or returned an accessibility error), so nothing was done. If this message repeats, stop: work in a different window or ask the user.");
        }
        const blocker = sheetBlocker(p);
        if (["new_name", "unreadable_name", "protected_folder_shown", "folder_menu"].includes(blocker)) return sheetRefusal(blocker);
        if (action.kind === "click" && (action.count ?? 1) > 1 && (p.popoverPopUpValues ?? []).length > 0) return sheetRefusal("background_multi_click_beside_a_pop_up");
        if (action.kind !== "type" && popoverSettling(p)) return settleRefusal();
        const listed = (v, kind) => {
          if (v !== LET_THROUGH) return v;
          const verdict = listedFolderVerdict(p);
          return verdict.allowed ? null : targetRefusal(verdict, kind);
        };
        switch (action.kind) {
          case "focus": return null;
          case "type": { const v = guard.keyCheck(p, "keyboard", { typedText: action.text }); return v === LET_THROUGH ? null : v; }
          case "key": return listed(guard.keyCheck(p, "keyboard", { chord: action.combo }), "key");
          case "drag": { const v = guard.pointCheck(p, { kind: "drag", probeIsOfTheFocus: true }); return v === LET_THROUGH ? null : v; }
          case "click": {
            const v = guard.pointCheck(p, { kind: "click", button: action.button ?? "left", count: action.count });
            return p.hitIdentifier === DISCLOSURE ? (v === LET_THROUGH ? null : v) : listed(v, "click");
          }
          case "menu": return listed(guard.pointCheck(p, { kind: "click", button: "left", count: 1 }), "click");
          default: return null;
        }
      };
      const check = async (main) => {
        const params = main ? { bundleId, mainWindow: true } : { windowId, ...(point ? { point } : {}) };
        // Official Ut: `await gt(t, d).catch(() => null)` — for the app_* tools a failed probe judges nothing this call
        // (unlike the screen-wide St / Vt / kt, where the throw ends the call); the guard itself stays on.
        const probed = await guard.probe(params);
        const p = probed === PROBE_FAILED ? null : probed;
        documentSeen = typeof p?.windowDocumentUrl === "string";
        const refusal = p && judge(p);
        if (!refusal || !main || refusal.retry) return refusal;
        return { ...refusal, message: `A background menu command can act on the app's main window, so the main window was checked too, and what follows is about it, not the window this call is aimed at. Aiming at another window of this app may not help while the app's main window stays the same. ${refusal.message}` };
      };
      const main = action.kind === "menu" && action.window === "main";
      let refusal = await check(main);
      if (refusal?.retry) {
        const stop = await guard.beforeRetry(refusal, { signal, what: action.kind === "type" ? "Typing" : action.kind === "key" ? "Key press" : "Click" });
        refusal = stop ?? await check(main);
      }
      if (refusal) return strip(refusal);
      if (action.kind === "menu" && action.window !== "main" && !documentSeen) return guard.app({ windowId, bundleId, action: { ...action, window: "main" }, signal });
      return null;
    },
  };
  return guard;
}
/** A refusal as the agent sees it (the retry marker is internal). */
function strip(refusal) {
  if (!refusal || typeof refusal !== "object") return refusal;
  const { retry: _retry, ...rest } = refusal;
  return rest;
}

module.exports = {
  createSavePanelGuard, createProtectedIndex, LET_THROUGH, SAVE_PANEL_REASON: REASON, SETTLE_MS,
  // The policy, for tests.
  policy: { isProtectedName, saveVerdict, confirmVerdict, pathVerdict, listedFolderVerdict, typingVerdict, sheetBlocker, documentVerdict,
    parentsVerdict, folderNamesOf, pathIsProtectedByPattern, navigationOnly, movesOrWindows, fold, foldName, pathKey },
  // The protected lists, for the entry-by-entry comparison with the official build (tests/w11-cu-protected-names.test.mjs).
  lists: { SHELL_FILES, GIT_NAMES, OPENS_AND_RUNS, GIT_USER_CONFIG, HOME_FOLDERS, TOOL_PREFIXES, BASH_COMPLETIONS, GIT_REPO_CONFIG, PATH_PATTERNS,
    SSH_NAMES, FOLDER_RULES, PROTECTED_PREFIXES, ALWAYS },
};
