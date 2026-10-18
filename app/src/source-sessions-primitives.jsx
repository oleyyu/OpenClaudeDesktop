import React from 'react';
import {CdsPage as CurrentPage} from './generated/view-tabs/c193cfc9b-DSvIG0kE.js';
import {sessionsPageBand} from './generated/code-current/sessions-page-band.mjs';
import {SidebarStatusLayout} from './generated/code-current/sidebar-status-glyph.mjs';
export {CdsButton as currentSessionsButton,CdsConfirmationDialog as currentSessionsConfirm,CdsDropdown as currentSessionsDropdown,CdsBadge as currentSessionsBadge} from './generated/view-tabs/shared-frame-BfjMqbuN.js';
export {CdsTabs as currentSessionsTabs} from './generated/view-tabs/shared-10-THQui8pC.js';
export {CdsSelectableTable as currentSessionsTable,useRowSelection as useSessionsSelection} from './generated/view-tabs/c9c7785eb-D11Dl0qm.js';
export {SessionsRowLayout,SessionsDateLayout,SessionsMoreButton} from './generated/view-tabs/c75e89812-B96Fecq3.js';
export {SessionsMenuContext as currentSessionsMenuContext,SessionsRowRail,SessionsActionsRail} from './generated/view-tabs/cc18d27d7-CqmzUQPM.js';
export {SessionsArchivedBadge} from './generated/view-tabs/ce58a0513-BLDzNrSI.js';
export {SessionsHighlight} from './generated/view-tabs/c1ea8a271-DQNA8ZHR.js';
export {findSessionTitleMatch} from './generated/view-tabs/cdfb0c433-OOm3enZf.js';
export {CdsRelativeTime as SessionsRelativeTime} from './generated/view-tabs/shared-2-Cb74JByF.js';
// 2.42304.0 cd75b47e6 l: the band comes from its host (shared-18 ef -> ey), banner
// passes through to the page header, the desktop panel is a div (shared-6 tr) and
// still declares data-scrolls-under-page-header (void 0, so no attribute). The
// fizzy-lake "panels" wrapper (n("panels")) stays closed in OpenClaude.
export function SessionsPageShell({children,banner,...props}) {
  return <CurrentPage band={sessionsPageBand({hasFrameShell:false,hasDesktopTopBar:true,isClaudeApp:true})} banner={banner} {...props}><div data-scrolls-under-page-header={undefined} className="flex flex-1 flex-col" style={{'--list-header-scroll-offset':'var(--cds-page-header-scroll-offset)'}}>{children}</div></CurrentPage>;
}
export function SessionsCodeScope({children}) {
  return <SidebarStatusLayout value={{}}>{children}</SidebarStatusLayout>;
}
