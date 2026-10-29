import React, { useMemo, useRef } from "react";
import { SourceViewTabBar } from "./source-view-tabs.jsx";
import { CdsDropdown, useDirection } from "./generated/view-tabs/index.js";
// c96d752d0 LH (cccc2cf0a `jo`) is generated once, in r3b-transcript; its R0e runs LH over {path, label: basename,
// detail: the folder} rows and returns the descriptions by path (D1: no second copy).
import { turnEditFolderHints } from "./generated/r3b-transcript/turn-edits-card.mjs";
import { FILE_TAB_LABELS, tabDetail, tabRelativePath } from "./file-tab-menu-model.mjs";
import { t } from "../electron/i18n/index.mjs";

// W12c files-tabbar (W12b cf-09 / TPT-9): the Files pane's open-file strip is 3.6556.2 cccc2cf0a ND's `ey` — the shared
// ViewTabBar (cfe7c4b3b t, through SourceViewTabBar like the Terminal and Preview strips):
//   u(ey,{ref:T,className:"min-w-0 flex-1","aria-label":…"Open files"(JTAjM0f0bY),tabs:Ke,activeId:s??"",
//     onActivate:fe,onReselect:le,onKeep:_?g:void 0,onClose:O,onCloseOthers:k,onCloseToRight:j?A:void 0,
//     onReorder:N?M:void 0,onCloseAll:F,renderTabMenuItems:pe,labels:Ge,minTabWidth:104})
// The bar owns the tab look, the 104px floor, the "More files" overflow menu (ArrowRight closes a row), the right-click
// menu (Keep open / Close file / Close other files / Close files to the right|left / Close all files), pointer and
// Control+Shift+Arrow reordering, Delete/Backspace and middle-click close, the 700ms tooltips and the focus it keeps on
// the strip when a tab closes or hides. Host facts:
//   - j = _E() is c51596d2b S("__gb__2327917146"), `t||!r`: on without GrowthBook; N = cf550b864 a, `!p(…)`: on.
//   - _ = Od() (c51596d2b Ke: the preview-tabs gate and preference) is the host's previewTabs view setting.
//   - icon: ll() (c280f9bbb L) needs GrowthBook "__gb__2954460583", off here, so tabs carry no file icon; the host
//     never opens a folder as a tab (no "folder" status).
//   - deleted: the host's read result `unavailable === "missing"` (TD reads the same "missing" answer from its query).
//   - le/fe hand focus to the file view unless the strip shows a keyboard focus ring (G "ring"); the host's file-focus
//     request (B33 Db fileFocusRequest) focuses the view once it is shown and read.

const basename = (path) => String(path ?? "").split(/[\\/]/).filter(Boolean).at(-1) || String(path ?? "");

// ND je + Ke: {id, label, detail, closable, preview, deleted}, then jo's descriptions for repeated basenames.
export function fileTabRows(tabs, { cwd, previewTabs = true } = {}) {
  const list = Array.isArray(tabs) ? tabs : [];
  const rows = list.map((file) => ({
    id: file.path,
    label: basename(file.path),
    detail: tabDetail(file.path, cwd),
    closable: true,
    preview: previewTabs && file.preview === true,
    deleted: file.unavailable === "missing",
  }));
  const relative = list.map((file) => tabRelativePath(file.path, cwd));
  const hints = turnEditFolderHints(relative.map((path) => ({ path })));
  return hints.size === 0 ? rows : rows.map((row, index) => {
    const description = hints.get(relative[index]);
    return description === undefined ? row : { ...row, description };
  });
}

// cccc2cf0a vE ends in `u(lv,{items:V,extraSections:G})`: the file items, then the "reveal" section ("Reveal in file
// tree"). The host's fileContextMenu list is flat, so the trailing separator + reveal item is that extra section.
export function fileTabMenuSections(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const at = list.findIndex((entry, index) => entry.kind === "separator" && list[index + 1]?.action === "reveal-in-tree");
  return at < 0 ? { items: list, extraSections: [] } : { items: list.slice(0, at), extraSections: [{ key: "reveal", items: list.slice(at + 1) }] };
}

// cd2efac6e q over CdsDropdown's parts (k = shared-frame Jo, the parts CdsContextMenu shares): a submenu opens at
// `vn("inline-end", n)` (shared-28 $h: right, left under rtl), align start, sideOffset -4; an item carries
// description, disabled, disabledReason and onSelect.
function FileTabMenuList({ entries, onSelect }) {
  const direction = useDirection();
  return entries.map((entry, index) => entry.kind === "separator" ? <CdsDropdown.Separator key={index} />
    : entry.kind === "submenu" ? <CdsDropdown.Submenu key={index}>
        <CdsDropdown.SubmenuTrigger>{entry.label}</CdsDropdown.SubmenuTrigger>
        <CdsDropdown.Popup side={direction === "rtl" ? "left" : "right"} align="start" sideOffset={-4}>
          <FileTabMenuList entries={entry.items ?? []} onSelect={onSelect} />
        </CdsDropdown.Popup>
      </CdsDropdown.Submenu>
    : <CdsDropdown.Item key={index} description={entry.description} disabled={entry.disabled} disabledReason={entry.disabledReason}
        onClick={() => onSelect(entry)}>{entry.label}</CdsDropdown.Item>);
}

// cd2efac6e bc (cccc2cf0a lv): the items, then each extra section as a Group led by a separator (when anything came
// before it) and its optional header.
export function SourceFileTabMenuItems({ entries, onSelect }) {
  const { items, extraSections } = fileTabMenuSections(entries);
  return <>
    <FileTabMenuList entries={items} onSelect={onSelect} />
    {extraSections.map((section, index) => <CdsDropdown.Group key={`s-${index}`}>
      {(items.length > 0 || index > 0) && <CdsDropdown.Separator />}
      {section.header && <CdsDropdown.GroupLabel>{section.header}</CdsDropdown.GroupLabel>}
      <FileTabMenuList entries={section.items} onSelect={onSelect} />
    </CdsDropdown.Group>)}
  </>;
}

// cccc2cf0a DD + G: whether focus sits in the strip with a keyboard focus ring.
function ringFocused(strip) {
  const node = strip?.current, focused = node?.ownerDocument.activeElement;
  if (!node || !focused || !node.contains(focused)) return false;
  try { return focused.matches(":focus-visible"); } catch { return false; }
}

export function SourceFileTabs({ tabs = [], cwd, activePath = null, previewTabs = true, fileMenu = null, onActivate, onClose,
  onCloseOthers, onCloseToRight, onCloseAll, onKeep, onReorder, onFocusFile }) {
  const strip = useRef(null);
  const rows = useMemo(() => fileTabRows(tabs, { cwd, previewTabs }), [tabs, cwd, previewTabs]);
  // le: a pressed (not keyboard-focused) open tab hands focus to its file view.
  const reselect = (path) => { if (!ringFocused(strip)) onFocusFile?.(path); };
  // fe: activate the tab, then the same hand-off for the file it shows.
  const activate = (path) => { onActivate(path); reselect(path); };
  // pe = vE: the tab's file items (surface "file_tab") ahead of the bar's own Keep open / Close items.
  const renderTabMenuItems = fileMenu ? (path) => {
    const entries = fileMenu.entries(path, { surface: "file_tab", unavailable: tabs.find((file) => file.path === path)?.unavailable });
    return entries?.length ? <SourceFileTabMenuItems entries={entries} onSelect={(item) => fileMenu.select(item, path)} /> : null;
  } : undefined;
  return <SourceViewTabBar ref={strip} className="min-w-0 flex-1" aria-label={t("Open files")} tabs={rows} activeId={activePath ?? ""}
    onActivate={activate} onReselect={reselect} onKeep={previewTabs ? onKeep : undefined} onClose={onClose}
    onCloseOthers={onCloseOthers} onCloseToRight={onCloseToRight} onReorder={onReorder} onCloseAll={onCloseAll}
    renderTabMenuItems={renderTabMenuItems} labels={FILE_TAB_LABELS} minTabWidth={104} />;
}
