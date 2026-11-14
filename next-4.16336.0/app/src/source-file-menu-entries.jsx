import React from "react";
import { SourceMenu } from "./source-menu.jsx";

// Original file-menu entries shared by tree rows, tabs and search results.
export function SourceFileMenuEntries({ entries, onSelect }) {
  return entries.map((entry, index) => entry.kind === "separator" ? <SourceMenu.Separator key={index} />
    : entry.kind === "submenu" ? <SourceMenu.Submenu key={index}>
        <SourceMenu.SubmenuTrigger>{entry.label}</SourceMenu.SubmenuTrigger>
        <SourceMenu.Popup label={entry.label} side="right" align="start" sideOffset={-4}>
          <SourceFileMenuEntries entries={entry.items} onSelect={onSelect} />
        </SourceMenu.Popup>
      </SourceMenu.Submenu>
    : <SourceMenu.Item key={index} disabled={entry.disabled} disabledReason={entry.disabledReason} description={entry.description} onClick={() => onSelect(entry)}>{entry.label}</SourceMenu.Item>);
}

