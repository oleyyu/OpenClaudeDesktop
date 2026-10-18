// R4g-sidebar SB3 (X7-06, ledger sidebar-04 / sidebar-02): the menu parts code-current's sidebar menu rows render.
//
// 2.42304.0 shared-16 imports the CDS Dropdown as their `K` (`qa as K` from shared-frame, i.e. shared-frame EC) and
// renders au (SidebarMenuItem) as `K.Item`, cu (SidebarMenuSection) and uu (lu's group) with `K.Separator` / `K.Group`.
// The section header menu (shared-20 yx), the reorder menu (shared-19 g$) and the blank-area menu (shared-21 _B) put
// those rows inside the CDS ContextMenu (shared-frame iD, whose Item / Separator / Group are EC's own), so they are
// Base UI menu items of that one menu.
//
// The host still has menus of its own made of the same rows on the host SourceMenu (the classic sidebar's row, group,
// blank-area and Older menus, all inside SourceSidebarMenu), and a Base UI item does not work in a SourceMenu popup
// (nor a SourceMenu item in a Base UI popup). So `K` is this kit: by default it is the official CdsDropdown parts
// (view-tabs EC), as shared-16 has it; inside <SourceMenuRows> (SourceSidebarMenu's body) it is the host SourceMenu.
// Host difference, to retire when the host menus move to the CDS Dropdown: then `K` maps to view-tabs CdsDropdown
// directly (scripts/extract-code-ui-current.mjs, target sidebar-menu-groups.mjs) and this module goes away.
import React, { createContext, useContext } from 'react';
import { CdsDropdown } from './generated/view-tabs/shared-frame-BfjMqbuN.js';
import { SourceMenu } from './source-menu.jsx';

const cdsRows = Object.freeze({ Item: CdsDropdown.Item, Separator: CdsDropdown.Separator, Group: CdsDropdown.Group });
const sourceMenuRows = Object.freeze({ Item: SourceMenu.Item, Separator: SourceMenu.Separator, Group: SourceMenu.Group });
const SidebarMenuRowsContext = createContext(cdsRows);

/** The host SourceMenu body: code-current's sidebar menu rows inside it render as SourceMenu parts. */
export function SourceMenuRows({ children }) {
  return <SidebarMenuRowsContext.Provider value={sourceMenuRows}>{children}</SidebarMenuRowsContext.Provider>;
}

/** Which parts the rows render here: 'cds' (the official CdsDropdown parts) or 'source-menu' (the host SourceMenu). */
export function useSidebarMenuRowsKind() {
  return useContext(SidebarMenuRowsContext) === sourceMenuRows ? 'source-menu' : 'cds';
}

// Each part forwards its props (React 19: `ref` included) to the menu's own part.
function part(name) {
  function SidebarMenuPart(props) {
    const Part = useContext(SidebarMenuRowsContext)[name];
    return <Part {...props} />;
  }
  SidebarMenuPart.displayName = `SidebarMenuKit.${name}`;
  return SidebarMenuPart;
}

/** shared-16 `K` (shared-frame EC, exported `qa`): Item, Separator and Group, the parts au / cu / uu render. */
export const SidebarMenuKit = Object.freeze({ Item: part('Item'), Separator: part('Separator'), Group: part('Group') });
export { cdsRows as sidebarCdsMenuRows, sourceMenuRows as sidebarSourceMenuRows };
