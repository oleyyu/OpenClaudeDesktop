// Computer use in the transcript (source-computer-use.jsx). Which items are computer-use steps and what each does is
// electron/computer-use/actions.mjs (shared with the main process); this module adds the official verbs, the tool names
// the original rows read, the screenshot and the request_access card's model.
import { toolOutputImages } from "./generic-tool-model.mjs";
import { APP_KINDS, SERVER_NAMES, computerUseAction } from "../electron/computer-use/actions.mjs";
import { t } from "../electron/i18n/index.mjs";

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");

// Each kind's official tool name (2.42304.0 shared-130 jI / the mcp__computer-use__ tables): what an engine item is
// called in the original tool group (transcript-sdk-tools.mjs), so the original rows read the original verbs.
const OFFICIAL_TOOLS = {
  click: "left_click", double_click: "double_click", triple_click: "triple_click", right_click: "right_click", middle_click: "middle_click",
  type: "type", key: "key", hold_key: "hold_key", scroll: "scroll", move: "mouse_move", drag: "left_click_drag", screenshot: "screenshot",
  zoom: "zoom", wait: "wait", open_app: "open_application", cursor: "cursor_position", mouse_down: "left_mouse_down", mouse_up: "left_mouse_up",
  request_access: "request_access",
};
const OFFICIAL_APP_TOOLS = { ...Object.fromEntries(Object.entries(APP_KINDS).map(([tool, kind]) => [kind, tool])) };
/** The official computer-use tool name for an action ("left_click", "app_click", …), or null. */
export function computerUseToolName(action) {
  if (!action) return null;
  if (action.scope === "app") return OFFICIAL_APP_TOOLS[action.kind] ?? null;
  return OFFICIAL_TOOLS[action.kind] ?? null;
}
export { computerUseAction };

/** The step's screenshot (a data URL), or null: the item's own, else the tool's last output image. */
export function computerUseScreenshot(item) {
  if (typeof item?.screenshot === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(item.screenshot)) return item.screenshot;
  if (record(item?.screenshot) && typeof item.screenshot.dataUrl === "string") return item.screenshot.dataUrl;
  return toolOutputImages(item).at(-1) ?? null;
}

const KEY_GLYPHS = { cmd: "⌘", command: "⌘", super: "⌘", meta: "⌘", ctrl: "⌃", control: "⌃", alt: "⌥", option: "⌥", shift: "⇧", enter: "↩", return: "↩", tab: "⇥", escape: "⎋", esc: "⎋", backspace: "⌫", delete: "⌦", space: "Space", up: "↑", down: "↓", left: "←", right: "→" };
/** "cmd+shift+4" / ["CTRL","C"] → "⌘⇧4" / "⌃C". */
export function keyLabel(keys = []) {
  return keys.flatMap((key) => String(key).split("+")).map((part) => KEY_GLYPHS[part.trim().toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part)).join("");
}

const truncate = (text, max = 48) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// The official Code-tab wording per kind (2.42304.0 shared-130 jI and the mcp__computer-use__ running / done tables,
// c52b02f3f the "Failed to …" one per running verb). No coordinates, as the original.
const VERBS = {
  screenshot: () => [t("Capturing screen"), t("Captured screen"), t("Failed to capture screen")],
  window_screenshot: () => [t("Capturing window"), t("Captured window"), t("Failed to capture window")],
  click: () => [t("Clicking"), t("Clicked"), t("Failed to click")],
  type: () => [t("Typing"), t("Typed"), t("Failed to type")],
  key: () => [t("Pressing key"), t("Pressed key"), t("Failed to press key")],
  hold_key: () => [t("Holding key"), t("Held key"), t("Failed to hold key")],
  scroll: () => [t("Scrolling"), t("Scrolled"), t("Failed to scroll")],
  move: () => [t("Hovering"), t("Hovered"), t("Failed to hover")],
  drag: () => [t("Dragging"), t("Dragged"), t("Failed to drag")],
  zoom: () => [t("Zooming in"), t("Zoomed in"), t("Failed to zoom in")],
  wait: () => [t("Waiting"), t("Waited"), t("Failed to wait")],
  open_app: () => [t("Opening app"), t("Opened app"), t("Failed to open app")],
  cursor: () => [t("Checking pointer position"), t("Checked pointer position"), t("Failed to check pointer position")],
  mouse_down: () => [t("Pressing mouse button"), t("Pressed mouse button"), t("Failed to press mouse button")],
  mouse_up: () => [t("Releasing mouse button"), t("Released mouse button"), t("Failed to release mouse button")],
  list_windows: () => [t("Listing windows"), t("Listed windows"), t("Failed to list windows")],
  find: () => [t("Finding in window"), t("Found in window"), t("Failed to find in window")],
  menu: () => [t("Using menu bar"), t("Used menu bar"), t("Failed to use menu bar")],
  focus: () => [t("Moving keyboard focus"), t("Moved keyboard focus"), t("Failed to move keyboard focus")],
  request_access: () => [t("Asking to use apps on your computer"), t("Asked to use apps on your computer"), t("Failed to ask to use apps")],
};
const CLICKS = new Set(["click", "double_click", "triple_click", "right_click", "middle_click"]);

// The row icon (2.42304.0 shared-130: each computer-use tool's icon key; cc1aae219 RW: key → icon name). The Code tab's
// TurnStatus rows have no icon of their own; this follows the chat renderer's computer-use rows (user's call, 2026-10-20).
const ICON_KEYS = {
  screenshot: "camera", window_screenshot: "camera", type: "keyboard", key: "keyboard", hold_key: "keyboard", focus: "keyboard",
  drag: "drag", zoom: "zoom", wait: "timer", menu: "menu", find: "search", list_windows: "eye",
};
const ICON_NAMES = { camera: "Camera", keyboard: "Keyboard", timer: "Timer", eye: "Eye", search: "Search", click: "Cursor",
  "scroll-up": "ArrowUp", "scroll-down": "ArrowDown", "scroll-left": "ArrowLeft", "scroll-right": "ArrowRight", drag: "Reorder",
  zoom: "SearchCircle", computer: "Computer", menu: "Menu" };
/** The row icon for an action: {name, dir} (zW: the side arrows keep dir="ltr"). */
export function computerUseIcon(action) {
  const key = !action ? "computer"
    : CLICKS.has(action.kind) || action.kind === "mouse_down" || action.kind === "mouse_up" ? "click"
      : action.kind === "scroll" ? `scroll-${["up", "down", "left", "right"].includes(action.direction) ? action.direction : "down"}`
        : ICON_KEYS[action.kind] ?? "computer";
  return { name: ICON_NAMES[key] ?? "Computer", dir: key === "scroll-left" || key === "scroll-right" ? "ltr" : undefined };
}

/** The row's verb and meta for a state ("busy" | "done" | "failed" | …): the official verbs; meta is what was typed or pressed. */
export function computerUseLabel(action, state = "done") {
  const busy = state === "busy" || state === "blocked", failed = state === "failed";
  const verbs = (VERBS[CLICKS.has(action.kind) ? "click" : action.kind] ?? (() => [t("Using your computer"), t("Used your computer"), t("Couldn’t use your computer")]))();
  const label = busy ? verbs[0] : failed ? verbs[2] : verbs[1];
  switch (action.kind) {
    case "type": return { label, meta: action.text ? `“${truncate(action.text)}”` : null };
    case "key": case "hold_key": return { label, meta: keyLabel(action.keys) || null };
    case "open_app": return { label, meta: action.app || null };
    default: return { label, meta: null };
  }
}

// ── request_access: the access card (computer-use-approval-card.jsx; docs/computer-use-ui-css-source-20261020.md §1).
// The request reaches the app as an MCP tool-call approval (mcpServer/elicitation/request, _meta.codex_approval_kind
// "mcp_tool_call") for a computer-use server's request_access. What the official main process resolves before the card
// (2.42304.0 BEf0UhNC: apps with name, tier and icon; the requested flags; the reason) travels in
// _meta.computer_use_access {apps: [{bundleId, displayName, tier, iconDataUrl?, installed?, alreadyGranted?}], flags,
// reason}. Without it, the call's own arguments ({apps: [names], reason, clipboardRead, clipboardWrite,
// systemKeyCombos}) still describe the request, with no tier or icon.

// Official ca31fdde5 Pi (macOS sets, verbatim): apps whose grant means more than its tier says.
const SHELL_APPS = new Set(["com.apple.Terminal", "com.googlecode.iterm2", "com.microsoft.VSCode", "dev.warp.Warp-Stable",
  "com.github.wez.wezterm", "org.alacritty", "io.alacritty", "net.kovidgoyal.kitty", "co.zeit.hyper", "com.mitchellh.ghostty",
  "com.todesktop.230313mzl4w4u92", "com.vscodium", "com.exafunction.windsurf", "dev.zed.Zed", "org.tabby", "com.jetbrains.intellij",
  "com.jetbrains.pycharm", "com.raphaelamorim.rio", "org.contourterminal.Contour", "com.neovide.neovide"]);
const FILESYSTEM_APPS = new Set(["com.apple.finder"]);
const SETTINGS_APPS = new Set(["com.apple.systempreferences"]);

/** "shell" | "filesystem" | "system_settings" | null for a bundle id. */
export function computerUseAppRisk(bundleId) {
  if (SHELL_APPS.has(bundleId)) return "shell";
  if (FILESYSTEM_APPS.has(bundleId)) return "filesystem";
  if (SETTINGS_APPS.has(bundleId)) return "system_settings";
  return null;
}

const TIER_LABELS = { read: () => t("View only"), click: () => t("Click only"), full: () => t("All") };
const RISK_LABELS = {
  shell: () => t("Can run commands on your computer"),
  filesystem: () => t("Can open, change, or delete any file, and run apps and scripts"),
  system_settings: () => t("Can change system settings"),
};

function accessApp(entry, index) {
  if (typeof entry === "string") {
    const name = entry.trim();
    return name ? { key: `requested-${index}`, name, bundleId: null, tier: null, iconDataUrl: null, installed: null, alreadyGranted: false } : null;
  }
  if (!record(entry)) return null;
  const bundleId = str(entry.bundleId) || str(entry.bundle_id) || null;
  const name = (str(entry.displayName) || str(entry.display_name) || bundleId || str(entry.requestedName) || str(entry.name)).trim();
  if (!name) return null;
  const tier = Object.hasOwn(TIER_LABELS, entry.tier) ? entry.tier : null;
  const icon = typeof entry.iconDataUrl === "string" && /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(entry.iconDataUrl) ? entry.iconDataUrl : null;
  return { key: bundleId ?? `requested-${index}`, name, bundleId, tier, iconDataUrl: icon,
    installed: typeof entry.installed === "boolean" ? entry.installed : null, alreadyGranted: entry.alreadyGranted === true };
}

const isAccessCall = (item) => item?.type === "mcpToolCall" && SERVER_NAMES.test(str(item.server)) && str(item.tool).replace(/^computer_/, "") === "request_access";

/**
 * The access request an MCP tool-call approval stands for, or null.
 * @returns {{apps: object[], flags: {clipboardRead: boolean, clipboardWrite: boolean, systemKeyCombos: boolean}, reason: string | null} | null}
 */
export function computerUseAccessRequest(params, item) {
  const meta = record(params?._meta) ? params._meta : {};
  if (meta.codex_approval_kind !== "mcp_tool_call") return null;
  const resolved = record(meta.computer_use_access) ? meta.computer_use_access : null;
  if (!resolved && !isAccessCall(item)) return null;
  const args = record(meta.tool_params) ? meta.tool_params : record(item?.arguments) ? item.arguments : {};
  const source = resolved ?? args;
  const flagsIn = record(source.flags) ? source.flags : record(source.requestedFlags) ? source.requestedFlags : source;
  const apps = (Array.isArray(source.apps) ? source.apps : []).slice(0, 64).map(accessApp).filter(Boolean);
  const reason = str(source.reason).trim() || str(args.reason).trim() || null;
  return { apps, reason,
    flags: { clipboardRead: flagsIn.clipboardRead === true, clipboardWrite: flagsIn.clipboardWrite === true, systemKeyCombos: flagsIn.systemKeyCombos === true } };
}

/** The card's rows: flags first (official order), then the apps not granted yet, risky ones first. */
export function computerUseAccessRows(access) {
  const flags = [
    access.flags.clipboardRead && { key: "clipboardRead", icon: "Clipboard", label: t("Read your clipboard") },
    access.flags.clipboardWrite && { key: "clipboardWrite", icon: "Copy", label: t("Write to your clipboard") },
    access.flags.systemKeyCombos && { key: "systemKeyCombos", icon: "Keyboard", label: t("Use system shortcuts (⌘Q, ⌘Tab, and similar)") },
  ].filter(Boolean);
  const apps = access.apps.filter((app) => !app.alreadyGranted)
    .map((app) => { const risk = app.bundleId ? computerUseAppRisk(app.bundleId) : null;
      return { ...app, risk, riskLabel: risk ? RISK_LABELS[risk]() : null, tierLabel: app.tier && app.installed !== false ? TIER_LABELS[app.tier]() : null }; })
    .sort((a, b) => Number(b.risk !== null) - Number(a.risk !== null));
  return { flags, apps };
}

/**
 * The title variant (official ZEe): one app and no flags names the app; several apps count them; flags make it
 * "these capabilities"; nothing at all is "your computer". `text` is the plain title (aria label, announcement).
 */
export function computerUseAccessTitle(rows, who) {
  const flags = rows.flags.length > 0, count = rows.apps.length;
  if (count === 1 && !flags) return { kind: "app", app: rows.apps[0].name, text: t("Allow {name} to use {app}?", { name: who, app: rows.apps[0].name }) };
  if (count > 1 && !flags) return { kind: "apps", count, text: t("Allow {name} to use {count} apps?", { name: who, count }) };
  if (count > 0 || flags) return { kind: "capabilities", text: t("Allow {name} to use these capabilities?", { name: who }) };
  return { kind: "computer", text: t("Allow {name} to use your computer?", { name: who }) };
}
