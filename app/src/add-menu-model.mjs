// Composer Add menu entries (ca80fca8d jN :11976-12480), kept pure so the decisions can be tested without the
// portal-based SourceMenu. Rows come from the customize store: mcp rows {id, name, title, kind} and the core's
// per-connector settings ({enabled, editable}) where it has them.

// re (:12093-12290) over the local connector rows:
// - while the list loads with nothing to show: the 'Connectors' loading row (S && !i);
// - nothing to show: a plain 'Manage connectors' row (icon Connectors) that opens the connectors page;
// - otherwise the 'Connectors' submenu: 'Manage connectors' (icon Tool), a separator, then the rows (icon
//   Connectors), the ones that need a sign-in again (icon CloudSlash, description 'Reconnect'), and 'Connecting…'
//   when only connecting servers exist; the trigger's hint counts the reconnect rows.
// A connected server is a row; one still connecting is only counted (n++); any other server that is not connected
// (not started, unreachable, waiting for folder trust) is left out, as `!r.isConnected` rows are. Local addition: a
// connector the core's config can switch (setting.editable) is a switch row whatever its status, so a turned-off
// server can be turned back on here.
export function addConnectorsEntry({ rows = [], status = "ready", settingFor = () => null } = {}) {
  const shown = [], reconnect = [];
  let connecting = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const setting = settingFor(row);
    if (row.kind === "signIn") { reconnect.push({ type: "reconnect", row }); continue; }
    if (setting?.editable) { shown.push({ type: "toggle", row, setting }); continue; }
    if (row.kind === "connecting") { connecting++; continue; }
    if (row.kind === "connected") shown.push({ type: "link", row });
  }
  const listed = shown.length > 0 || reconnect.length > 0;
  if (status === "loading" && !listed && connecting === 0) return { kind: "loading" };
  if (!listed && connecting === 0) return { kind: "manage" };
  return { kind: "submenu", reconnectCount: reconnect.length,
    items: [...shown, ...reconnect, ...(connecting > 0 && !listed ? [{ type: "connecting" }] : [])] };
}

// oe (:12313-12440) for the local plugin rows: a skeleton while they load with none ready; with no plugin that brings
// skills, the on-this-device branch's plain 'Add plugins' row (c5cd1b4dc Es gives "local", so `n = e === "org"` is
// false), which opens Settings › Plugins, where the core's marketplaces offer more; otherwise the 'Plugins' submenu.
// A core whose plugin list failed shows nothing (e === null).
export function addPluginsEntry({ loading = false, status = "ready", groups = [] } = {}) {
  if (Array.isArray(groups) && groups.length > 0) return { kind: "submenu" };
  if (loading) return { kind: "loading" };
  return status === "ready" ? { kind: "add" } : { kind: "hidden" };
}

// 3.6556.2 c752b32f8-mYZAs6yC Gi, the popup of an Add menu submenu (zi → Ui, `frame = {align, className:
// submenuClassName, maxVisibleItems}`): `_ = s?.includes("max-h-") ? void 0 : (g ?? 8.5)` caps the list at 8.5 rows
// unless the submenu brings its own max-h class, and the footer items sit after a Separator in the popup's fixed footer
// (`footer: p.length > 0 ? [Separator, ...p] : void 0`). The class joins the CDS popup's through Q (tailwind-merge), so a
// `max-h-[Npx]` replaces `max-h-[var(--available-height)]`; the host popup's own max-height lives in source-menu.css,
// so the same value goes inline as well (w12b-slash-plugin-groups).
export const ADD_SUBMENU_MAX_VISIBLE_ITEMS = 8.5;
export function addSubmenuFrame(className, maxVisibleItems) {
  const fixed = /(?:^|\s)max-h-\[(\d+(?:\.\d+)?px)\](?=\s|$)/.exec(className ?? "");
  return {
    className,
    maxVisibleItems: className?.includes("max-h-") ? undefined : (maxVisibleItems ?? ADD_SUBMENU_MAX_VISIBLE_ITEMS),
    style: fixed ? { maxHeight: fixed[1] } : undefined,
  };
}
