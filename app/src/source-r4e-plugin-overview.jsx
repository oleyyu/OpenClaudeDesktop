// R4e-plugin (settings-14): the plugin page's Overview tab, 4.16336.0 c12456454 oo (rendered by c24c8737b pu for
// `In === "overview"`) over plugin/read's data (plugin-detail-model.mjs pluginOverview). Every part is the original,
// emitted by scripts/extract-r4e-plugin.mjs: the shared-19 iv layout (main + rail), cae01a6fc W (Description, through the
// c79fa23ba linkifier), the shared-19 av rail card and cae01a6fc ie (Connectors & tools, X rows); the CDS primitives
// under them are cds-core's (the generated modules import them by publicName).
import React from "react";
import { CdsIcon } from "./cds-core.mjs";
import { OverviewRailCard, PluginOverviewLayout } from "./generated/r4e-plugin/overview-layout.mjs";
import { OverviewConnectorsAndTools, OverviewDescription } from "./generated/r4e-plugin/overview-sections.mjs";

// cae01a6fc ne draws each server's icon with cd85e132d t (size Q, glyph 12); a server without an icon URL — every local
// MCP server — falls back (cd85e132d d) to c28f9f509 u: the kind glyph (connector: "Connectors") at the glyph size,
// "text-muted-as-secondary": `e(t, { name: s, customSize: i, className: "text-muted-as-secondary" })`, t = shared-frame lf
// (the CDS Icon, cds-core CdsIcon). The host draws that fallback glyph directly in X's size-5 tile.
const SERVER_GLYPH = <CdsIcon name="Connectors" customSize={12} className="text-muted-as-secondary" />;

// c79fa23ba b draws each allowed description URL as cds-core CdsTextLink (external, target _blank) with c4acc1503 g as
// onClick / onAuxClick; g preventDefaults only a "block" / "reroute" verdict and leaves an ordinary http(s) link "native"
// (to the browser's new tab). The host windows deny window.open and in-window navigation (electron/main.cjs
// setWindowOpenHandler deny / will-navigate), so a native link would open nothing: like the other areas
// (source-routine-cowork-page-adapters.jsx openExternalLinkClick, source-code-transcript-adapters.jsx openDesktopHref),
// the URL goes to the host's "external" call. The wrapper listens in the bubble phase, so g's verdict runs first and a
// link g already prevented is left alone; a primary click (onClick) or a middle click (onAuxClick, button 1) only.
export function openOverviewExternalLink(event, host = globalThis.desktop) {
  if (event.defaultPrevented || event.button > 1) return false;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor || (event.currentTarget?.contains && !event.currentTarget.contains(anchor))) return false;
  const href = anchor.getAttribute?.('href');
  if (!href || !/^https?:\/\//i.test(href)) return false;
  event.preventDefault();
  if (typeof host?.call === 'function') void Promise.resolve().then(() => host.call('external', { url: href })).catch(error => host.error?.(error?.message));
  return true;
}
const openOverviewLink = event => void openOverviewExternalLink(event);

// `onOpenConnectors`: pu passes `Fn.some(mu) ? xr : void 0`, xr switching to the Connectors tab, as every row's onClick
// (a ghost xs flush-both button; a plain row without it).
// Host layout difference: the classic page's .cz-plugin-contents already supplies the 24px gutter that iv's px-xl
// draws on the official page, so the Overview cancels it (-mx-6) instead of indenting twice.
export function PluginOverview({ overview, onOpenConnectors }) {
  const rows = (overview?.connectorRows || []).map(({ key, label, note }) => ({ key, icon: SERVER_GLYPH, label, note, onClick: onOpenConnectors }));
  // oo rail: `pe === !0 ? r(Me, { children: [oe, B.length > 0 && n(Wt, { rows: B })] }) : S ? void 0 : …` — the shared
  // credit oe is null (no shared plugins here) and plugin/read has settled, so without rows there is no rail. The main
  // column's description is W over lo (the item's own description; no directory listing or signed-in record here).
  const rail = rows.length > 0 ? <OverviewRailCard><OverviewConnectorsAndTools rows={rows} /></OverviewRailCard> : undefined;
  return <div className="-mx-6" data-plugin-overview="" onClick={openOverviewLink} onAuxClick={openOverviewLink}>
    <PluginOverviewLayout main={<OverviewDescription description={overview?.description || ""} />} rail={rail} />
  </div>;
}
