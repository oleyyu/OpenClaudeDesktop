// Extracted from installed Claude Desktop 2.31226.0. Do not edit.

function Fb(e,t=!1,n=!1){return t||e.liveStatus==="awaiting"?"awaiting":e.liveStatus?e.liveStatus:!n&&e.pendingToolPermissions?.length?"awaiting":e.isRunning?"running":"idle"}

export { Fb };
