// R3-files FT-05 (files-27): the 2.42304.0 editor-path rule (shared-28 Fk over shared-104 bP; extract-files-changes.mjs).
import { canOpenFileInEditor } from "./generated/files-changes/file-editor-path.mjs";
// File items of the Files pane menus (2.2553.1). Mn
// (ion-dist/assets/v1/c856385e2-k3utJqnh.js, prettier-formatted, :962-1060):
// "Attach as context" while a composer exists, the "Copy" submenu (Absolute
// path when resolved, Relative path unless the path is absolute, Filename),
// then the reveal item ("Show in Finder", c18ab0d94) with separatorBefore when
// there is no "Open in" submenu (kn :903-933). Tree rows use surface
// "file_browser" (readable/panes-tile-current.js:5691-5700 jc); file tabs use
// "file_tab" (l_ :6809-6862), whose extra "reveal" section — "Reveal in file
// tree", only for a path inside the working directory that is not missing —
// Gg (:6030-6048) renders after the items behind a separator.
// Pure: entries are {kind:"item"|"submenu"|"separator", ...}; the pane maps
// actions to handlers. "Open in" (kn) lists the installed editors (main.cjs
// installed-editors) when there are any; a directory row ends with "Open in
// terminal" (a tab in the built-in terminal pane in that folder; the 2.2553.1
// release notes' "Right-click any folder in the file tree → Open in terminal")
// when the caller can open one (canOpenTerminal).
import { absoluteDiffPath, copyChoices, splitPosixPath, stripClipboardControls } from "./diff-file-header-model.mjs";
import { tabRelativePath } from "./file-tab-menu-model.mjs";
import { t } from "../electron/i18n/index.mjs";

export const FILE_MENU_LABELS = Object.freeze({
  attach: t("Attach as context"),
  copy: t("Copy"),
  absolutePath: t("Absolute path"),
  relativePath: t("Relative path"),
  filename: t("Filename"),
  showInFinder: t("Show in Finder"),
  revealInTree: t("Reveal in file tree"),
  openIn: t("Open in"),
  openInTerminal: t("Open in terminal"),
});
export const FILE_MENU_SURFACES = Object.freeze(["file_browser", "file_tab", "file_viewer", "file_breadcrumb"]);

// Rg/zg (readable/panes-tile-current.js:5572-5588): the symlink mark's alt and
// the tree row tooltip detail; "Symbolic link" when the target is unknown.
const LINK_LABELS = Object.freeze({
  ok: t("Link to {target}"),
  external: t("Link to {target}, outside the working directory"),
  dangling: t("Broken link to {target}"),
  cycle: t("Circular link to {target}"),
});
export function fileLinkLabel(link) {
  const target = typeof link?.target === "string" ? link.target : "";
  return target !== "" && Object.hasOwn(LINK_LABELS, link?.state) ? LINK_LABELS[link.state].replace("{target}", target) : t("Symbolic link");
}

const isAbsolute = (value) => /^(?:\/|[A-Za-z]:[\\/]|~(?:$|[\\/]))/.test(value);

/** Copy values for one pane path: cwd-relative when inside the working directory. */
export function fileCopyChoices(root, path) {
  const relative = tabRelativePath(path, root);
  const absolute = absoluteDiffPath(root, relative);
  const filename = splitPosixPath((absolute ?? relative).replace(/\/+$/, ""))[1];
  return {
    absolute: absolute ?? null,
    relative: relative && !isAbsolute(relative) ? relative : null,
    filename,
  };
}

// R3-files FT-05 (files-11 / files-v01): `gone` is the right-click check of 2.42304.0 (c856385e2 V, answered before the
// menu opens). xn: `d = n.openIn !== false && n.gone !== true` gates gn (the "Open in" submenu and the reveal item) and
// wn (the folder's "Open in terminal"), so a path that no longer exists keeps only Attach and Copy (and a tab's reveal).
export function fileContextMenu({ surface = "file_browser", root, path, canAttach = false, canShowInFinder = false, canRevealInTree = false, editors = [], canOpenTerminal = false, directory = false, line, gone = false } = {}) {
  if (gone === true) { editors = []; canShowInFinder = false; canOpenTerminal = false; }
  // R3-files FT-06: cd2efac6e Ps (the breadcrumb segment's items) adds its "Reveal in file tree" section only when
  // `!h && …`, h being the segment's gone answer from cfac349aa Jt.
  if (gone === true && surface === "file_breadcrumb") canRevealInTree = false;
  const choices = fileCopyChoices(root, path);
  const copy = (label, value) => value ? { kind: "item", action: "copy", label, value: stripClipboardControls(value) } : null;
  const entries = [];
  if (canAttach) entries.push({ kind: "item", action: "attach", label: FILE_MENU_LABELS.attach, ...(directory?{directory:true}:{}) });
  entries.push({ kind: "submenu", label: FILE_MENU_LABELS.copy, items: [
    copy(FILE_MENU_LABELS.absolutePath, choices.absolute),
    copy(FILE_MENU_LABELS.relativePath, choices.relative),
    copy(FILE_MENU_LABELS.filename, choices.filename),
  ].filter(Boolean) });
  // kn: an "Open in" submenu of the installed editors (separatorBefore), then the reveal item, which has its own
  // separator only when there is no "Open in".
  const openIn = Array.isArray(editors) && editors.length > 0 && choices.absolute && (directory || canOpenFileInEditor(choices.absolute));
  if (openIn) entries.push({ kind: "separator" }, { kind: "submenu", label: FILE_MENU_LABELS.openIn,
    items: editors.map((editor) => ({ kind: "item", action: "open-in-editor", label: editor.name, value: choices.absolute, editor: editor.type, ...(!directory && Number.isInteger(line) && line > 0 ? {line} : {}) })) });
  if (canShowInFinder && choices.absolute) entries.push(...(openIn ? [] : [{ kind: "separator" }]), { kind: "item", action: "show-in-finder", label: FILE_MENU_LABELS.showInFinder, value: choices.absolute });
  if (surface === "file_tab" && canRevealInTree && choices.relative)
    entries.push({ kind: "separator" }, { kind: "item", action: "reveal-in-tree", label: FILE_MENU_LABELS.revealInTree, value: choices.relative });
  if (surface === "file_browser" && canOpenTerminal && choices.absolute)
    entries.push({ kind: "separator" }, { kind: "item", action: "open-in-terminal", label: FILE_MENU_LABELS.openInTerminal, value: choices.absolute });
  // B32 ko (cd2efac6e readable :1354-1400): a breadcrumb segment's extra sections — Zt's "Open in terminal" for a
  // folder, then "Reveal in file tree" (a folder as `${dir}/`, so its own row is revealed) for a path inside the
  // working directory.
  if (surface === "file_breadcrumb") {
    if (directory && canOpenTerminal && choices.absolute)
      entries.push({ kind: "separator" }, { kind: "item", action: "open-in-terminal", label: FILE_MENU_LABELS.openInTerminal, value: choices.absolute });
    const relative = choices.relative?.replace(/\/+$/, "");
    if (canRevealInTree && relative)
      entries.push({ kind: "separator" }, { kind: "item", action: "reveal-in-tree", label: FILE_MENU_LABELS.revealInTree, value: directory ? `${relative}/` : relative });
  }
  return entries;
}


// B13: the right-click menu of a viewer body that is not the editor (2.31226.0 cd2efac6e im, readable
// :5945-6030, its no-selection branch over the Markdown/CSV preview, media, the unavailable card and read-only
// code): Attach as context (Rd), the Tn "Copy" submenu (qd), Yd (separator, "Open in" editors, Show in Finder),
// then — after a separator when anything came before — "Copy file contents" (Cl: the text is loaded) and
// "Download file" (yd). `entries` are the pane's fileContextMenu entries for surface "file_viewer".
export function fileViewerMenu(entries = [], { canCopyContents = false, canCopyImage = false, canDownload = false, downloading = false } = {}) {
  const items = (Array.isArray(entries) ? entries : []).filter(entry => !(canCopyImage && entry.kind === 'submenu' && entry.label === FILE_MENU_LABELS.copy));
  while (items[0]?.kind === 'separator') items.shift();
  const tail = [];
  if (canCopyContents) tail.push({ kind: "item", action: "copy-file-contents", label: t("Copy file contents") });
  if (canCopyImage) tail.push({ kind: 'item', action: 'copy-image', label: t('Copy image') });
  if (canDownload) tail.push({ kind: "item", action: "download-file", label: t("Download file"), ...(downloading ? { disabled: true, disabledReason: t('Downloading…') } : {}) });
  if (tail.length && items.length) items.push({ kind: "separator" });
  return [...items, ...tail];
}

// 2.31226.0 c856385e2 Yt: shared multi-selection file actions. Copy is
// unbounded; attach/open are capped at 100, and there is no bulk Finder item.
export function multiFileContextMenu({root,paths=[],directories=[],canAttach=false,editors=[]}={}){
  const choices=paths.map(path=>fileCopyChoices(root,path));
  const disabled=paths.length>100;
  const bounded=disabled?{disabled:true,description:t('Up to {limit} items at a time',{limit:100})}:{};
  const copy=(label,key)=>({kind:'item',action:'copy',label:t(label),value:choices.map(choice=>stripClipboardControls(choice[key])).join('\n')});
  const entries=[];
  if(canAttach)entries.push({kind:'item',action:'attach-many',label:FILE_MENU_LABELS.attach,paths:choices.map(c=>c.absolute),directories:directories.map(path=>fileCopyChoices(root,path).absolute),...bounded});
  entries.push({kind:'submenu',label:FILE_MENU_LABELS.copy,items:[
    ...(choices.every(c=>c.absolute)?[copy('Absolute paths','absolute')]:[]),
    ...(choices.every(c=>c.relative)?[copy('Relative paths','relative')]:[]),
    copy('Filenames','filename'),
  ]});
  const editorPaths=choices.map(c=>c.absolute).filter(path=>path&&(directories.some(dir=>fileCopyChoices(root,dir).absolute===path)||canOpenFileInEditor(path)));
  if(editors.length&&editorPaths.length)entries.push({kind:'separator'},{kind:'submenu',label:FILE_MENU_LABELS.openIn,
    items:editors.map(editor=>({kind:'item',action:'open-many-in-editor',label:editor.name,editor:editor.type,paths:editorPaths,...bounded}))});
  return entries;
}

// My.onOpenChange reorders selected rows before Ue snapshots them for the menu.
export function fileMenuSelection(matches,selected,clicked){
  return selected.has(clicked)?matches.filter(entry=>selected.has(entry.path)).map(entry=>entry.path):[clicked];
}

// 2.31226.0 c219730b0 Gt (readable :534-566), the Changes file header menu and the Changed files row menu (c44d00c7f
// Sc, :6154-6170): Attach as context, Copy ▸ (Absolute path when resolved, Relative path, Filename), separator + Open
// file, then renderFileMenuItems (cccc2cf0a Ad = c856385e2 cn/rn/tn, :1122-1133, :1050-1082, :965-1049) with separatorBefore
// = !Open file: its separator, Open in ▸ installed editors (Ut, only a file the editor can open), Show in Finder.
// Diff paths are relative to the patch root (diff-file-header-model copyChoices). Pure.
export function changedFileMenu({ root, path, canAttach = false, canOpenFile = false, editors = [], canShowInFinder = false } = {}) {
  const choices = copyChoices(root, path);
  const copy = (label, value) => value ? { kind: "item", action: "copy", label, value: stripClipboardControls(value) } : null;
  const entries = [];
  if (canAttach) entries.push({ kind: "item", action: "attach", label: FILE_MENU_LABELS.attach, value: path });
  entries.push({ kind: "submenu", label: FILE_MENU_LABELS.copy, items: [
    copy(FILE_MENU_LABELS.absolutePath, choices.absolute),
    copy(FILE_MENU_LABELS.relativePath, choices.relative),
    copy(FILE_MENU_LABELS.filename, choices.filename),
  ].filter(Boolean) });
  if (canOpenFile) entries.push({ kind: "separator" }, { kind: "item", action: "open-file", label: t("Open file"), value: path });
  const absolute = choices.absolute;
  const openIn = Array.isArray(editors) && editors.length > 0 && absolute && canOpenFileInEditor(absolute)
    ? { kind: "submenu", label: FILE_MENU_LABELS.openIn, items: editors.map((editor) => ({ kind: "item", action: "open-in-editor", label: editor.name, value: absolute, editor: editor.type })) }
    : null;
  const reveal = canShowInFinder && absolute ? { kind: "item", action: "show-in-finder", label: FILE_MENU_LABELS.showInFinder, value: absolute } : null;
  if ((openIn || reveal) && !canOpenFile) entries.push({ kind: "separator" });
  if (openIn) entries.push(openIn);
  if (reveal) entries.push(reveal);
  return entries;
}

// B32 Zs/qs (cd2efac6e readable :2157-2199): the target of each breadcrumb segment's context menu — a folder segment
// is that folder, the name segment is the file. Inside the working directory the paths stay cwd-relative; a path
// shown absolute keeps its absolute prefixes; a "~" path (not absolute) has no menu.
export function breadcrumbSegmentTargets(displayPath) {
  const value = String(displayPath ?? "");
  if (!value || /^~(?:$|[\\/])/.test(value)) return { dirs: [], name: null };
  const lead = /^[A-Za-z]:[\\/]/.exec(value)?.[0] ?? /^\/+/.exec(value)?.[0] ?? "";
  const outside = lead !== "";
  const parts = value.slice(lead.length).split(/[\\/]/).filter((part) => part !== "");
  if (!parts.length) return { dirs: [], name: null };
  const join = (count) => lead + parts.slice(0, count).join("/");
  return {
    dirs: parts.slice(0, -1).map((label, index) => ({ label, path: join(index + 1), directory: true, outside })),
    name: { label: parts.at(-1), path: join(parts.length), directory: false, outside },
  };
}
