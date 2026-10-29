// Host permission mode names (ask / bypass) to the official form's (default / bypassPermissions). The 2.31226.0
// current-chat routine form these adapters served is retired (w10-curchat-retire); its adapter exports had no importer
// left and were removed by w10-cleanup-final. Only this mapping is still read (src/source-routines.jsx).
export const toFormPermission = value => ({ ask: 'default', bypass: 'bypassPermissions' }[value] ?? value);
