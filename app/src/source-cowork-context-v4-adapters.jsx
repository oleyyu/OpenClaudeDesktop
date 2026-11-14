// Host boundaries of the 4.16336.0 Cowork activity panel's Context section (src/generated/cowork-context-v4,
// scripts/extract-cowork-context-v4.mjs; round2 unit cowork-context). Re-exports only: each name is the existing host
// adapter that already answers the same official binding (3.6556.2 local -> 4.16336.0 local, pinned by the generator).
//   c21f11e6d Qy (3.6556.2 Fy)  CoworkAddFolderAction               remote sessions only (gE `s && !P`)
//   c21f11e6d mT (3.6556.2 ww)  CoworkMountedProjects               mounted claude.ai projects only; null for none
//   c21f11e6d sT (3.6556.2 _w)  CoworkContextKindGroupsWithBrowser  groupContextByKind only (xE default false, no caller)
//   c21f11e6d iT (3.6556.2 mw)  CoworkContextKindGroups             same
//   c21f11e6d iC (3.6556.2 _S)  CoworkRemoteContextSources          remote sessions only (gE `s && …`)
//   c21f11e6d IT (3.6556.2 Kw)  CoworkSuggestedConnectors           null while the claude.ai connector directory is empty
export { CoworkAddFolderAction, CoworkMountedProjects, CoworkContextKindGroupsWithBrowser, CoworkContextKindGroups, CoworkRemoteContextSources, CoworkSuggestedConnectors } from "./source-cowork-context-adapters.jsx";
// shared-36 Db: the connector server icon of FT's rows (cowork-progress-v4 re-exports the same adapter).
export { ConnectorServerIcon } from "./source-routine-cowork-adapters.jsx";
// vendor-intl q / Gt (routines-shared-v4 adapts the same bindings).
export { useIntl, FormattedMessage } from "./source-routines-shared-adapters.jsx";
