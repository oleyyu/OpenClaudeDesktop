// Which transcript items are computer-use steps, and what each one does: shared by the renderer (src/computer-use-model.mjs,
// the step rows) and the main process (in-use.cjs, the docked strip and the screen glow), so both read the same shapes.
// A core reports a step either as OpenClaude Desktop's own item {type: "computerUse", id, status, action, screenshot?,
// app?, display?}, or as an ordinary tool call in one of the shapes agents use:
//   Anthropic computer tool   name "computer", {action: "left_click", coordinate: [x, y], text?, scroll_direction?, …}
//   OpenAI computer use       {action: {type: "click", x, y, button?} | {type: "type", text} | {type: "keypress", keys} | …}
//   computer-use MCP servers  tools named left_click / type / key / scroll / screenshot / … with {coordinate: [x, y]} or {x, y}
//   OpenClaude Desktop's own  request_access and app_* on its code_desktop server (electron/agent-tools/computer-use.mjs)
// computerUseAction() normalizes all of them to one action, or null for anything else. Pure: no i18n, no DOM.
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const num = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null);
const str = (value) => (typeof value === "string" ? value : "");

// Action names across the shapes → one kind.
const KINDS = {
  click: "click", left_click: "click", leftclick: "click", mouse_click: "click", tap: "click",
  double_click: "double_click", doubleclick: "double_click", triple_click: "triple_click",
  right_click: "right_click", rightclick: "right_click", middle_click: "middle_click",
  type: "type", type_text: "type", input_text: "type", write: "type",
  key: "key", keypress: "key", key_press: "key", hotkey: "key", press: "key",
  scroll: "scroll", mouse_scroll: "scroll",
  mouse_move: "move", move: "move", hover: "move", move_mouse: "move",
  left_click_drag: "drag", drag: "drag", left_mouse_drag: "drag",
  screenshot: "screenshot", take_screenshot: "screenshot", capture_screen: "screenshot",
  zoom: "zoom", wait: "wait", sleep: "wait",
  open_app: "open_app", open_application: "open_app", launch_app: "open_app",
  cursor_position: "cursor", get_cursor_position: "cursor",
  hold_key: "hold_key", left_mouse_down: "mouse_down", mouse_down: "mouse_down", left_mouse_up: "mouse_up", mouse_up: "mouse_up",
  request_access: "request_access",
};
// The app-scope tools (docs/02 app_*): the same action on one granted app's window, marked scope "app".
export const APP_KINDS = {
  app_click: "click", app_type: "type", app_key: "key", app_scroll: "scroll", app_drag: "drag", app_zoom: "zoom",
  app_screenshot: "window_screenshot", app_ax_find: "find", app_list_windows: "list_windows", app_menu: "menu", app_focus: "focus",
  app_release: "release",
};
const TOOL_NAMES = /^(computer|computer_use|computer-use|computer_20\d{6})$/i;
export const SERVER_NAMES = /computer[-_ ]?use|^computer$|desktop[-_ ]?control/i;
// The app's own server (agent-tools-host.cjs SERVER_NAME) carries other tools too: only these names are computer use.
const OWN_SERVER = "code_desktop";
const OWN_TOOLS = new Set(["request_access", "app_list_windows", "app_screenshot", "app_ax_find", "app_click", "app_type", "app_release"]);
/** The computer-use tool an item of the app's own server calls (by server, or OpenCode's "code_desktop_" prefix), or null. */
export function ownComputerUseTool(item) {
  const tool = str(item?.tool) || str(item?.name), server = str(item?.server) || str(item?.namespace);
  const name = server === OWN_SERVER || server === `mcp__${OWN_SERVER}` ? tool
    : !server && tool.startsWith(`mcp__${OWN_SERVER}__`) ? tool.slice(OWN_SERVER.length + 7)
      : !server && tool.startsWith(`${OWN_SERVER}_`) ? tool.slice(OWN_SERVER.length + 1) : null;
  return name !== null && OWN_TOOLS.has(name) ? name : null;
}

function pointOf(input) {
  if (Array.isArray(input?.coordinate) && input.coordinate.length >= 2) return { x: num(input.coordinate[0]), y: num(input.coordinate[1]) };
  if (num(input?.x) !== null && num(input?.y) !== null) return { x: num(input.x), y: num(input.y) };
  return null;
}

function normalize(kind, input = {}) {
  const point = pointOf(input);
  const action = { kind, ...(point ?? {}) };
  if (kind === "drag") {
    const start = Array.isArray(input.start_coordinate) ? { x: num(input.start_coordinate[0]), y: num(input.start_coordinate[1]) }
      : Array.isArray(input.path) && input.path.length ? pointOf(input.path[0]) : null;
    const end = Array.isArray(input.path) && input.path.length > 1 ? pointOf(input.path.at(-1)) : point;
    if (start) Object.assign(action, { x: start.x, y: start.y });
    if (end) Object.assign(action, { x2: end.x, y2: end.y });
  }
  if (kind === "drag" && Array.isArray(input.to_coordinate)) Object.assign(action, { x2: num(input.to_coordinate[0]), y2: num(input.to_coordinate[1]) });
  if (kind === "type") action.text = str(input.text) || str(input.value);
  if (kind === "key" || kind === "hold_key") action.keys = Array.isArray(input.keys) ? input.keys.map(String)
    : str(input.combo) || str(input.text) || str(input.key) ? [str(input.combo) || str(input.text) || str(input.key)] : [];
  if (kind === "scroll") {
    action.direction = str(input.scroll_direction) || str(input.direction) || (num(input.scroll_y) ? (input.scroll_y > 0 ? "down" : "up") : num(input.scroll_x) ? (input.scroll_x > 0 ? "right" : "left")
      : num(input.dy) ? (input.dy > 0 ? "down" : "up") : "");
    action.amount = num(input.scroll_amount) ?? num(input.amount) ?? (num(input.scroll_y) !== null ? Math.abs(input.scroll_y) : null);
  }
  if (kind === "wait") action.seconds = num(input.duration) ?? num(input.seconds) ?? null;
  if (kind === "open_app") action.app = str(input.app) || str(input.name) || str(input.bundle_id);
  if (kind === "menu" && Array.isArray(input.path)) action.path = input.path.map(String);
  if (kind === "zoom" && Array.isArray(input.region)) action.region = input.region.slice(0, 4).map(num);
  return action;
}

/** The computer-use action a transcript item stands for, or null. */
export function computerUseAction(item) {
  if (!record(item)) return null;
  if (item.type === "computerUse") {
    const action = record(item.action) ? item.action : {};
    const kind = KINDS[str(action.kind || action.type).toLowerCase()] ?? (str(action.kind) || "other");
    return { ...normalize(kind, action), app: str(item.app) || str(action.app) || undefined };
  }
  if (item.type !== "mcpToolCall" && item.type !== "dynamicToolCall") return null;
  const tool = str(item.tool) || str(item.name);
  const server = str(item.server) || str(item.namespace);
  const input = record(item.arguments) ? item.arguments : {};
  // Anthropic / OpenAI single computer tool: the action is inside the input.
  if (TOOL_NAMES.test(tool)) {
    const inner = record(input.action) ? input.action : input;
    const kind = KINDS[str(record(input.action) ? input.action.type : input.action).toLowerCase()];
    return kind ? normalize(kind, inner) : { kind: "other", label: str(input.action) || tool };
  }
  // A computer-use MCP server: the tool name is the action; app_* tools act on one app's window.
  const serverTool = SERVER_NAMES.test(server) ? tool : /^mcp__computer-use__/.test(tool) ? tool.slice("mcp__computer-use__".length) : ownComputerUseTool(item);
  if (serverTool !== null) {
    const name = serverTool.toLowerCase().replace(/^computer_/, "");
    if (Object.hasOwn(APP_KINDS, name)) return { ...normalize(APP_KINDS[name], input), scope: "app", ...(str(input.app) ? { app: str(input.app) } : {}) };
    const kind = KINDS[name];
    return kind ? normalize(kind, input) : null;
  }
  return null;
}

