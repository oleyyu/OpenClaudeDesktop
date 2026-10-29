import React from 'react';
// R6 (3.6556.2): view-tabs through its facade, by semantic name. CdsPage (c193cfc9b-C3NZYkrZ _) keeps "sticky top-0
// bg-page" because its translucent/page-header-ground branch needs translucentHeader and fizzy-lake panels (cds:C21,
// E12). The Sessions page itself is the generated 3.6556.2 Hf (source-sessions-page.jsx); this shell serves the
// Scheduled page (source-routines.jsx).
import {CdsPage as CurrentPage} from './generated/view-tabs/index.js';
import {sessionsPageBand} from './generated/code-current/sessions-page-band.mjs';
// 2.42304.0 cd75b47e6 l: the band comes from its host (shared-18 ef -> ey), banner
// passes through to the page header, the desktop panel is a div (shared-6 tr) and
// still declares data-scrolls-under-page-header (void 0, so no attribute). The
// fizzy-lake "panels" wrapper (n("panels")) stays closed in OpenClaude.
export function SessionsPageShell({children,banner,...props}) {
  return <CurrentPage band={sessionsPageBand({hasFrameShell:false,hasDesktopTopBar:true,isClaudeApp:true})} banner={banner} {...props}><div data-scrolls-under-page-header={undefined} className="flex flex-1 flex-col" style={{'--list-header-scroll-offset':'var(--cds-page-header-scroll-offset)'}}>{children}</div></CurrentPage>;
}
