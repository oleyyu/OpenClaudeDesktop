// Host answers for the imports scripts/extract-code-composer.mjs maps to this module (research/composer.md §4.1,
// work item composer-gen). The composer pieces themselves are the original 2.42304.0 bindings in
// src/generated/code-composer; this module only supplies what they read from react-intl, and the host store the Send cell
// reads its draft through, plus the one CDS-root piece of the ChatComposer shell the host never reaches (the page drop
// scrim's surface). Each export names the original binding it stands in for.
// The CDS components are not answered here: the generated modules import CdsButton / CdsIcon / CdsTooltipProvider and,
// since R3 (D24, R3-composer composer-row-chin step), CdsTooltip / CdsShortcut / CdsSplitDropdownButton / cdsClassNames
// from view-tabs by their semantic names, so they share its React contexts. The former stand-ins (ComposerTooltip over
// SourceTooltip, ComposerShortcut over SourceShortcut, ComposerSplitDropdownButton as a CdsButton + CdsDropdown pair for
// lM's coarse-pointer Send) were removed with that step.
import { useStartIntl } from './source-code-start-adapters.jsx';

// vendor-intl `p` (react-intl useIntl): the local catalog, English copy looked up in zh-CN (as every Code surface).
export const useComposerIntl = useStartIntl;

// c227f4d5e QO reads `hasTextStore.readOutsideRender()` through useSyncExternalStore with shared-25's no-op subscribe and
// re-renders on `subscribe` notifications. The host composer keeps its draft in React state (and re-renders on every
// change), so its store answers the current value and has nothing extra to notify.
export function composerTextStore(read) {
  return { readOutsideRender: read, subscribe: () => () => {} };
}

// R3-composer step 3 (composer-shell): shared-frame gf (exported `Fc`), the CDS surface root the shell's page-scope drop
// scrim (shared-5 yd: "Drop files here" over the whole window) portals into. The scrim renders only while files are
// dragged over the page and the shell was given `onFileDrop`; the host card keeps its own drop / paste handling and gives
// the shell no onFileDrop (tests/source-composer-shell.test.mjs), so this is never rendered. A stand-in that renders
// anyway would draw the scrim without the CDS root's density / colour store / layer catcher, so it refuses instead.
export function ComposerPageDropSurface() {
  throw new Error('ComposerPageDropSurface: the page drop scrim (shared-5 yd) is not wired in the host; the composer keeps its own drop handling');
}
