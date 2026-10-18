// R4e-plugin (settings-14): the plugin page's Overview tab, 2.42304.0 c12456454 ni (rendered by c24c8737b pc for
// `qt === "overview"`) over plugin/read's data (plugin-detail-model.mjs pluginOverview). Every part is the original,
// emitted by scripts/extract-r4e-plugin.mjs: the shared-19 kD layout (main + rail), cae01a6fc W (Description), the
// shared-19 AD rail card and cae01a6fc se (Connectors & tools, X rows); the CDS primitives under them are the host
// stand-ins of source-r4e-plugin-adapters.jsx.
import React from "react";
import { Icon } from "./icons.jsx";
import { OverviewRailCard, PluginOverviewLayout } from "./generated/r4e-plugin/overview-layout.mjs";
import { OverviewConnectorsAndTools, OverviewDescription } from "./generated/r4e-plugin/overview-sections.mjs";

// cae01a6fc ae draws each server's icon with cd85e132d (size 14, glyph 12); a server without an icon URL — every local
// MCP server — falls back to c28f9f509 u: the kind glyph (connector: "Connectors") at the glyph size,
// "text-muted-as-secondary". The host draws that fallback glyph (host Icon) directly in X's size-5 tile.
const SERVER_GLYPH = <Icon name="Connectors" size={12} className="text-muted-as-secondary" />;

// `onOpenConnectors`: pc passes `Kt.some(e => e.id === "connectors") ? Dn : void 0`, Dn switching to the Connectors
// tab, as every row's onClick (a ghost xs flush-both button; a plain row without it).
// Host layout difference: the classic page's .cz-plugin-contents already supplies the 24px gutter that kD's px-xl
// draws on the official page, so the Overview cancels it (-mx-6) instead of indenting twice.
export function PluginOverview({ overview, onOpenConnectors }) {
  const rows = (overview?.connectorRows || []).map(({ key, label, note }) => ({ key, icon: SERVER_GLYPH, label, note, onClick: onOpenConnectors }));
  // ni rail: `ue === !0 ? n(w, { children: [k, O.length > 0 && i(yt, { rows: O })] }) : y ? void 0 : …` — the shared
  // credit k is null (no shared plugins here) and plugin/read has settled, so without rows there is no rail.
  const rail = rows.length > 0 ? <OverviewRailCard><OverviewConnectorsAndTools rows={rows} /></OverviewRailCard> : undefined;
  return <div className="-mx-6" data-plugin-overview="">
    <PluginOverviewLayout main={<OverviewDescription description={overview?.description || ""} />} rail={rail} />
  </div>;
}
