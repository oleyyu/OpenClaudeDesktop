// Host answers for the imports scripts/extract-code-composer.mjs maps to this module (research/composer.md §4.1,
// work item composer-gen). The composer pieces themselves are the original 3.6556.2 bindings in
// src/generated/code-composer; this module only supplies what they read from react-intl, and the host store the Send cell
// reads its draft through. Each export names the original binding it stands in for.
// The CDS components are not answered here: the generated modules import CdsButton / CdsIcon / CdsTooltipProvider and,
// since R3 (D24, R3-composer composer-row-chin step), CdsTooltip / CdsShortcut / CdsSplitDropdownButton / cdsClassNames
// from view-tabs by their semantic names, so they share its React contexts. The former stand-ins (ComposerTooltip over
// SourceTooltip, ComposerShortcut over SourceShortcut, ComposerSplitDropdownButton as a CdsButton + CdsDropdown pair for
// lM's coarse-pointer Send) were removed with that step.
import { useStartIntl } from './source-code-start-adapters.jsx';

// vendor-intl-DYfox5Co `p` (react-intl useIntl): the local catalog, English copy looked up in zh-CN (as every Code surface).
export const useComposerIntl = useStartIntl;

// c227f4d5e Gk (2.42304.0 QO) reads `hasTextStore.readOutsideRender()` through useSyncExternalStore with shared-25's no-op subscribe and
// re-renders on `subscribe` notifications. The host composer keeps its draft in React state (and re-renders on every
// change), so its store answers the current value and has nothing extra to notify.
export function composerTextStore(read) {
  return { readOutsideRender: read, subscribe: () => () => {} };
}

// 3.6556.2 (w2-composer-gen): the page drop scrim's CDS portal root (shared-frame hp, 2.42304.0 gf / `Fc`) is view-tabs
// CdsPortalRoot now, so the generated shell imports it by that name; the throwing ComposerPageDropSurface stand-in is gone.
// The scrim still renders only with `onFileDrop`, which the host card does not pass (it keeps its own drop handling).
