// Host services for the generated MCP Apps host library (src/generated/mcp-app-host, scripts/extract-mcp-app-host.mjs,
// R4g-mcp MA-5). Each export answers one import of the 2.42304.0 originals; the extractor pins the original declaration
// it replaces (chunk, export alias, local name and text features), so a changed original fails generation instead of
// silently binding this module.
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { useMemo, useSyncExternalStore } from 'react';
import { useStartIntl } from './source-code-start-adapters.jsx';

// shared-25 Zs (Th) and shared-0 Za (my): GrowthBook reads. The host has no GrowthBook (D29/D31), so every gate is off:
// _keepMenuClear (__gb__1130162093), findServerTool (__gb__585138862), forceStableOrigin (__gb__108722899), the
// text-size ladder (__gb__4158246511), the cai_* origin rewrites of cbc7fd025.
// The answers come from the one host table (host-growthbook.mjs); any flag it does not list is off.
export function readGrowthBookGate(flag) { return hostGrowthBookFlag(flag); }
export function isGrowthBookFeatureOn(flag) { return hostGrowthBookFlag(flag); }

// shared-25 ml (Rm): whether this client is the Claude desktop app. The host is a desktop app: hostContext.platform is
// "desktop".
export function isDesktopClient() { return true; }

// shared-1 nx (Hl): the theme context, defaulting to tx ({theme:"claude", mode:"auto", resolvedMode:"light"}). The host's
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

// shared-frame So (Yl): the user's text-size step. c06a5ffab m uses it only when __gb__4158246511 is on (never here) and
// otherwise the base 16; the host has no text-size preference, so it answers that base.
export function useHostTextSize() { return 16; }

// shared-156 Z (Sd): the MCP servers/tools store c8e12f1a8 je reads for findServerTool. Ae only calls je when
// __gb__585138862 is on, which the host keeps off; reaching this store is a bug, not an empty answer.
export const mcpToolsStore = {
  getState() { throw Error('findServerTool is gated off (__gb__585138862) in this host; the MCP tools store is not available'); },
};

// vendor-intl q (p): react-intl useIntl over the local catalog (the start card's adapter). c06a5ffab h formats the
// visualize _hostStrings with it; its `messages` is empty, so the optional zoom / open-larger labels (shared-104 nu) are
// left out, as the official build does for ids missing from its catalog.
export function useMcpAppIntl() { return useStartIntl(); }

// preload-helper s (t): Vite's chunk preloader (modulepreload links, vite:preloadError). The host's bundler preloads its
// own chunks, so the loader runs as is.
export function preloadChunk(load) { return load(); }

// cbc4150d0 n (t): the @font-face text c8e12f1a8 Pe sends as hostContext.styles.css.fonts. Its fonts are served from
// assets.claude.ai, which the host does not load (X1 G4); no font faces are sent and widgets use their fallback stacks.
export const hostFontFaces = '';

// cbc7fd025 A (i): give the sandbox URL the conversation's origin. The original rewrites the first label of a
// *.claudemcpcontent.com host and returns any other URL unchanged; the host's sandbox is the local oc-mcp-sandbox: scheme
// (X1 MA-3), whose host is the same 32-hex conversation hash (cbc7fd025 x), `staging-` prefixed like the original.
export const MCP_SANDBOX_PROTOCOL = 'oc-mcp-sandbox:';
export function withConversationOrigin(base, hash, staging) {
  const url = new URL(base.href);
  if (url.protocol !== MCP_SANDBOX_PROTOCOL) return url;
  url.hostname = staging ? `staging-${hash}` : hash;
  return url;
}
