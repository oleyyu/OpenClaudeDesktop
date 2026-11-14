// Host services for the generated MCP Apps host library (src/generated/mcp-app-host, scripts/extract-mcp-app-host.mjs,
// R4g-mcp MA-5; 3.6556.2 since w2-mcp-host). Each export answers one import of the 3.6556.2 originals; the extractor pins
// the original declaration it replaces (chunk, export alias, local name and text features), so a changed original fails
// generation instead of silently binding this module.
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { useMemo, useSyncExternalStore } from 'react';
import { useStartIntl } from './source-code-start-adapters.jsx';

// shared-25 fs (Yh) and shared-0 Ko (_b): GrowthBook reads. The host has no GrowthBook (D29/D31), so every gate is off:
// _keepMenuClear (__gb__1130162093), findServerTool (__gb__585138862), forceStableOrigin (__gb__108722899), the
// text-size ladder (__gb__4158246511), the deny-connectors gate (__gb__4291763747, menus N5), the cai_* origin rewrites
// of cbc7fd025.
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function readGrowthBookGate(flag) { return hostGrowthBookFlag(flag); }
export function isGrowthBookFeatureOn(flag) { return hostGrowthBookFlag(flag); }
// shared-25 Rs (Vh): a GrowthBook dynamic config (the deny-connectors list __gb__1932634900). Without GrowthBook every
// config is the caller's default (null there), and cc0e3547f Yt answers `gate && Kt` = false either way.
export function readGrowthBookConfig(name, fallback) { return fallback; }

// shared-25 cc (vh): whether this client is the Claude desktop app. The host is a desktop app: hostContext.platform is
// "desktop".
export function isDesktopClient() { return true; }

// shared-52 th (og): a fizzy-lake part is on only when the root's data-cds-fizzy-lake names it and the allow-list Qm has
// it. 3.6556.2 ships `Qm = []` and the host keeps fizzy-lake off (E12/R15), so the comfortable type steps stay off.
export const isFizzyLakePart = () => false;

// shared-1 NS (Eu): the theme context, defaulting to MS ({theme:"claude", mode:"auto", resolvedMode:"light"}). The host's
// resolved mode is html[data-mode] (main.jsx writes "light" or "dark" from the appearance setting; "system" or nothing
// falls back to prefers-color-scheme, as the loaded CSS does).
const DEFAULT_THEME = { theme: 'claude', mode: 'auto', resolvedMode: 'light', mounted: true, setTheme() {}, setMode() {} };
export function resolvedHostMode(win = globalThis.window) {
  const mode = win?.document?.documentElement?.dataset?.mode;
  if (mode === 'light' || mode === 'dark') return mode;
  return win?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function subscribeHostMode(onChange) {
  const win = globalThis.window;
  if (!win?.document) return () => {};
  const observer = new win.MutationObserver(onChange);
  observer.observe(win.document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  const media = win.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', onChange);
  return () => { observer.disconnect(); media?.removeEventListener?.('change', onChange); };
}
export function useHostTheme() {
  const resolvedMode = useSyncExternalStore(subscribeHostMode, () => resolvedHostMode(), () => DEFAULT_THEME.resolvedMode);
  return useMemo(() => ({ ...DEFAULT_THEME, mode: resolvedMode, resolvedMode }), [resolvedMode]);
}

// shared-frame Lo (pd): the user's text-size step. c06a5ffab p uses it only when __gb__4158246511 is on (never here) and
// otherwise the base 16; the host has no text-size preference, so it answers that base.
export function useHostTextSize() { return 16; }

// shared-156 Z (ff): the MCP servers/tools store cc0e3547f _t reads for findServerTool. gt only calls _t when
// __gb__585138862 is on, which the host keeps off; reaching this store is a bug, not an empty answer.
export const mcpToolsStore = {
  getState() { throw Error('findServerTool is gated off (__gb__585138862) in this host; the MCP tools store is not available'); },
};

// vendor-intl q (p): react-intl useIntl over the local catalog (the start card's adapter). c06a5ffab m formats the
// visualize _hostStrings with it; its `messages` is empty, so the optional zoom / open-larger labels (shared-78 SG) are
// left out, as the official build does for ids missing from its catalog.
export function useMcpAppIntl() { return useStartIntl(); }

// preload-helper s (t): Vite's chunk preloader (modulepreload links, vite:preloadError, chunk-load retries). The host's
// bundler preloads its own chunks (shared-78 dI asks for no deps), so the loader runs as is.
export function preloadChunk(load) { return load(); }

// shared-0 _3 (p): the authenticated claude.ai API fetch. cc0e3547f Ut would open the widget view-state store over it
// (POST /api/frame/mcpapp/widget-state, menus N4). The host has no claude.ai account (D17/E24): the card gives Ut no
// account key, so Ut takes its refuse branch (Ht: anthropic/set-view-state is rejected) and never calls this; if
// anything does, the request fails and the store reads "unavailable".
const refusedFetch = () => Promise.reject(Error('the claude.ai API is not available in this host (no account)'));
export function useClaudeApiFetch() { return refusedFetch; }

// shared-3 Nh (Uh): the X-Frame-* headers of a claude.ai API request (cc0e3547f Oe). Only reached with an account; the
// host sends none.
export function frameRequestHeaders() { return {}; }

// cbc4150d0 n (t): the @font-face text cc0e3547f Tt sends as hostContext.styles.css.fonts. Its fonts are served from
// assets.claude.ai, which the host does not load (X1 G4); no font faces are sent and widgets use their fallback stacks.
export const hostFontFaces = '';

// cbc7fd025 A (i): give the sandbox URL the conversation's origin (cd9b7fccf w). The original rewrites the first label of
// a *.claudemcpcontent.com host and returns any other URL unchanged; the host's sandbox is the local oc-mcp-sandbox:
// scheme (X1 MA-3), whose host is the same 32-hex conversation hash (cbc7fd025 x), `staging-` prefixed like the original.
const MCP_SANDBOX_PROTOCOL = 'oc-mcp-sandbox:';
export function withConversationOrigin(base, hash, staging) {
  const url = new URL(base.href);
  if (url.protocol !== MCP_SANDBOX_PROTOCOL) return url;
  url.hostname = staging ? `staging-${hash}` : hash;
  return url;
}
