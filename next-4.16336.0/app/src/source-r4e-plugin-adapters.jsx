// R4e-plugin (settings-14): host services for the original 4.16336.0 plugin Overview parts that
// scripts/extract-r4e-plugin.mjs emits (generated/r4e-plugin/overview-sections.mjs = cae01a6fc U / W / X / J / ie,
// generated/r4e-plugin/overview-layout.mjs = shared-19 iv / av / rv). Each export replaces one import of the original
// and is feature-checked by the extractor against the declaration it stands for. The CDS primitives the parts draw
// (Button, Icon, OverflowTooltip, InfoTip, Card, TextLink) and clsx are no longer adapters: the generated modules import
// them from cds-core by their publicNames, and the React Compiler helpers are sliced into generated/r4e-plugin/shared-frame.mjs.
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog, as the other generators do.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-62 bP (exported Dl): `Fr(yP)`, yP = "__gb__2406162393", the unified plugins UI. The host has no GrowthBook client;
// host-growthbook.mjs is the one table every area's gate readers answer from, and this flag is not listed there (off,
// D29/D31): headings are the classic "text-caption text-secondary" ones and c24c8737b el never enables the Tool
// permissions servers.
export function useUnifiedPluginsUi() {
  return hostGrowthBookFlag("__gb__2406162393");
}

// shared-33 Nv (exported ou): `C(Tv)?.pageLayout === !0`. Customize lives in the classic settings dialog here
// (pageLayout=false, see source-customize.jsx), so a row's icon tile is "bg-fill-control" and av's card fill "bg-surface-1".
export function usePageLayout() {
  return false;
}
