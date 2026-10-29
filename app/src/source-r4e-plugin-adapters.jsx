// R4e-plugin (settings-14): host services for the original 3.6556.2 plugin Overview parts that
// scripts/extract-r4e-plugin.mjs emits (generated/r4e-plugin/overview-sections.mjs = cae01a6fc G / K / X / Y / oe,
// generated/r4e-plugin/overview-layout.mjs = shared-19 w_ / T_ / C_). Each export replaces one import of the original
// and is feature-checked by the extractor against the declaration it stands for. The CDS primitives the parts import
// from shared-frame (Eu Button, od Icon, Gl OverflowTooltip, la InfoTip, Tu Card) are those very components of the
// 3.6556.2 view-tabs graph, re-exported here under the extractor's adapter names through the version-independent
// facade (R6: nothing in the chat / composer / menu graphs imports this file, so E41 does not apply). The React
// Compiler helpers come from the same graph (E3).
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";

// shared-frame Uu (exported Eu) Button, us (od) Icon, hh (Gl) OverflowTooltip, Tk (la) InfoTip and
// cd = Object.assign(td, { Link: rd, Media: sd }) (Tu) Card. X passes a ghost xs flush-both Button with an onClick and a
// size-xs Icon / InfoTip only for string icons and hinted reach rows (plugin/read yields neither); T_ (OD) passes the Card
// a backgroundClassName, so td adds none of its fizzy-lake `stacks:` classes (Zu, E12/R15).
export {
  CdsButton as OverviewButton,
  CdsIcon as OverviewIcon,
  CdsOverflowTooltip as OverviewOverflowText,
  CdsInfoTooltip as OverviewInfoTip,
  CdsCard as OverviewCard,
} from "./generated/view-tabs/index.js";

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog, as the other generators do.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-52 QL (exported uo): `ze(ZL)`, ZL = <gate 2406162393>, the unified plugins UI. The host has no GrowthBook, so the
// gate is closed (D29/D31): headings are the classic "text-caption text-secondary" ones and c24c8737b xs never enables
// the Tool permissions servers.
export function useUnifiedPluginsUi() {
  return false;
}

// shared-5 Qg (exported xc): `A(Wg)?.pageLayout === !0`. Customize lives in the classic settings dialog here
// (pageLayout=false, see source-customize.jsx), so a row's icon tile is "bg-fill-control".
export function usePageLayout() {
  return false;
}

// c79fa23ba g (exported r): GrowthBook gate 1063785924, linkified plugin descriptions. Closed on the host, so the
// description paragraph keeps its plain sanitized text and `linkifyDescription` (c79fa23ba _, exported t) is never
// reached; it returns the text unchanged rather than inventing a second link renderer.
export function useLinkifiedDescription() {
  return false;
}
export function linkifyDescription(text) {
  return text;
}
