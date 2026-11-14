// Host services of the 4.16336.0 proposal group card (src/generated/proposal-group-v4,
// scripts/extract-proposal-group-v4.mjs). Staged graph: nothing imports it until the proposal-group cutover.
// Every name here is an existing host adapter of the 3.6556.2 graph re-exported unchanged; the generator pins, for each,
// the 4.16336.0 declaration it replaces (features + raw declaration sha256) and records it in provenance.json `adapters`.
// The semantics are the ones documented at the original export (the same official service moved to a new chunk/local).
// One adapter is defined here because its official interface grew in 4.16336.0: useModelCatalog (below).
import { useContext, useMemo } from "react";
import { ProposalHost, useModelCatalog as useHostModelCatalog } from "./source-proposal-group-adapters.jsx";

export {
  useIntl, FormattedMessage, useSessionsStore, updateSession, useSessionsNeedingInput, useErrors, sentHereStorage,
  useProposalPicks, useProposalWorktreePick, useOfferCloudStart, useOpenSession, TaskPromptMarkdown,
  useAutoModeAvailability, supportedEffortOptions, effortMessages, ModelSelectorParts,
  useDesktopConfig, getDesktopConfig, useGrowthBookFlag, isDesktopClient, toggleStarredEnvironment, desktopBridge,
  useSessionChip, useSessionPrState, SessionPrChip, SessionEnvChip, errorCopy, useSessionHref, routePreloadProps,
  useLayerInOtherWindow, appPreferences, useAppRouter, settingsPageStore, useOfferChords, isOwnComposer,
  logProposalStart, logProposalImpression, logProposalDismiss, useExposureOnce, ProposalToolFallback, ProposalModelSelector,
} from "./source-proposal-group-adapters.jsx";

// shared-1 R1 (exported ci; 3.6556.2 ER): the model catalog. 4.16336.0's catalog (shared-212's factory, the object R1
// spreads) adds autoModeCompatible / autoModeUnavailableNote, which the Options form reads through shared-212 hJ
// (`e.autoModeCompatible(t)` → ok, else locked with `byRow: entryFor(t).auto_permission_mode === "unavailable"` and the
// note). Official definitions: `autoModeCompatible: e => pJ(e, m(e))` with pJ = `t?.auto_permission_mode !==
// "unavailable" && fJ(e)` (fJ: the Claude model-name test), `autoModeUnavailableNote: e => (m(e), void 0)`. Here the
// host catalog of src/source-proposal-group-adapters.jsx, with the auto-mode answer taken from the kernel
// (ProposalHost.permissionModes.auto, the same source useAutoModeAvailability reads) instead of the Claude model-name
// test, the row's own `auto_permission_mode` kept as in pJ, and no note, as shipped.
export function useModelCatalog() {
  const catalog = useHostModelCatalog();
  const auto = useContext(ProposalHost)?.permissionModes?.auto === true;
  return useMemo(() => ({
    ...catalog,
    autoModeCompatible: (id) => auto && catalog.entryFor(id)?.auto_permission_mode !== "unavailable",
    autoModeUnavailableNote: () => undefined,
  }), [catalog, auto]);
}
