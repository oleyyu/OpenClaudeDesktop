// Preview tools for the agent (OpenClaude Desktop's local MCP server, agent-tools-host.cjs). They act on THIS session's
// preview only: ctx.preview is preview-service.cjs forSession(session), and every call goes through it.
// Modeled on the 2.2553.1 preview tools (preview_start / preview_stop / preview_list / preview_logs, and the browser
// tools navigate / read_page / get_page_text / read_console_messages / read_network_requests / resize_window).
import { LAUNCH_EXAMPLE, LAUNCH_HELP } from "../preview-launch.mjs";

export const group = "preview";

const object = (properties = {}, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });
const preview = (ctx) => {
  if (!ctx.preview) throw new Error("The preview isn't available in this session.");
  return ctx.preview;
};
const lines = (list) => list.join("\n");
// preview-service.cjs RECLAIMED_NOTE: the page was closed after five minutes unseen, so its earlier output is gone.
const RECLAIMED = "Preview view was reclaimed while hidden, so its earlier console and network output is gone. Interact with the preview (navigate or screenshot) and re-read to collect fresh entries.";
// A click or key press whose navigation to an outside site was held (preview-service.cjs holdOutside).
const blockedNote = (result) => (!result?.blocked ? "" : result.blocked.declined
  ? ` The page tried to open ${result.blocked.host}, which the user didn’t allow in the preview, so it stayed here.`
  : ` The page tried to open ${result.blocked.host}; the user is being asked whether to allow it, and the preview stays here until they do.`) + dialogNote(result);
// A click or key press that made the page call alert() / confirm() / prompt(), which the preview never shows
// (preview-service.cjs Page.javascriptDialogOpening).
const dialogNote = (result) => !result?.dialog ? "" : ` The page opened a ${result.dialog.type}() dialog (${JSON.stringify(result.dialog.message)}), which the preview doesn’t show: ${result.dialog.returned}.`;
const configHelp = (file) => `Create ${file} in the project to describe its dev servers:\n${LAUNCH_EXAMPLE}\n${LAUNCH_HELP}`;

function startText(result, name) {
  if (!result.server) return `Opened ${result.page?.url ?? "the page"} in the preview${result.page?.title ? ` (“${result.page.title}”)` : ""}.`;
  const { server } = result;
  const parts = [];
  if (server.attach) parts.push(`Attached the preview to the configured url (${server.url}); no process was started.`);
  else if (result.reused) parts.push(`Server “${server.name}” was already running and has been reused. No new process was started.`);
  // R4e-preview (preview-01): the original's three ways to say it started (2.42304.0 index.chunk-D7qSpOOc.js
  // preview_start: D3i's `configuredPort` — here movedFrom — when the scan moved it, else whether the port changed).
  else if (result.movedFrom !== undefined && result.movedFrom !== null) parts.push(`Server started. Configured port ${result.movedFrom} was unavailable, so port ${server.port} was assigned instead. The preview is available at http://localhost:${server.port}. If this server needs port ${result.movedFrom} specifically (e.g. OAuth callbacks, webhooks, CORS): free it if another process holds it, or pick a different "port" in .claude/launch.json if the OS reserves it; setting "autoPort": false there makes the start fail instead of moving.`);
  else if (result.configuredPort && server.port !== result.configuredPort) parts.push(`Server started. Configured port ${result.configuredPort} was unavailable, so port ${server.port} was assigned instead (autoPort is enabled). The preview is available at http://localhost:${server.port}.`);
  else parts.push(`Server started on port ${server.port}.`);
  if (result.page) parts.push(result.page.ok === false ? `The page at ${result.page.url} failed to load: ${result.page.description}.` : `The preview shows ${result.page.url}${result.page.title ? ` (“${result.page.title}”)` : ""}.`);
  parts.push("Use read_page (or screenshot, if you can see images) to check it, and preview_logs if something looks wrong.");
  return parts.join(" ");
}

export const tools = [
  {
    name: "preview_start",
    title: "Start preview",
    description: "Start a dev server by name from the project's .claude/launch.json and open it in the user's Preview pane, or open a url there. ALWAYS use this instead of running dev servers with a shell command: the user sees the page, and the other preview tools can inspect it. If a server with that name is already running it is reused. Starting a server's command asks the user first (once per configuration in this session; again after launch.json changes). Without a launch.json, the result explains how to write one.",
    inputSchema: object({
      name: { type: "string", description: "The server's name in .claude/launch.json." },
      url: { type: "string", description: "Open this address instead of starting a server (http(s), or a file in the project)." },
    }),
    annotations: { title: "Start preview", openWorldHint: true },
    async handler({ name, url }, ctx) {
      const tools = preview(ctx);
      if (!name && !url) {
        const info = tools.list();
        if (!info.exists) return { content: [{ type: "text", text: `No dev servers are configured. ${configHelp(info.launchFile)}` }], isError: true };
        if (info.servers.length !== 1) return { content: [{ type: "text", text: `Name the server to start. Configured: ${info.servers.map((server) => server.name).join(", ") || "none"}.` }], isError: true };
        name = info.servers[0].name;
      }
      try {
        return startText(await tools.start({ name, url }), name);
      } catch (error) {
        if (error.code === "no-config") return { content: [{ type: "text", text: `${error.message} ${configHelp(tools.launchInfo().file)}` }], isError: true };
        if (error.code === "declined" || /^The turn was stopped/.test(error.message)) return { content: [{ type: "text", text: error.message }], isError: true };
        const log = Array.isArray(error.logs) && error.logs.length ? `\nLast output:\n${error.logs.join("\n")}` : "";
        return { content: [{ type: "text", text: `${error.message}${log}\nFix the problem, then call preview_start again.` }], isError: true };
      }
    },
  },
  {
    name: "preview_stop",
    title: "Stop preview",
    description: "Stop a dev server started with preview_start.",
    inputSchema: object({ name: { type: "string", description: "The server's name." } }, ["name"]),
    async handler({ name }, ctx) {
      await preview(ctx).stop(name);
      return `Stopped “${name}”.`;
    },
  },
  {
    name: "preview_list",
    title: "List previews",
    description: "List the dev servers configured in .claude/launch.json with their status and port, and the page the preview shows.",
    inputSchema: object(),
    annotations: { readOnlyHint: true },
    async handler(_args, ctx) {
      const info = preview(ctx).list();
      if (!info.exists) return `No dev servers are configured. ${configHelp(info.launchFile)}${info.page ? `\nThe preview shows ${info.page.url}.` : ""}`;
      const out = info.servers.map((server) => `- ${server.name}: ${server.status}${server.port ? ` · port ${server.port}` : ""} · ${server.url}${server.attach ? " (attach)" : ""}`);
      if (info.problems?.length) out.push(`Problems in launch.json: ${info.problems.join("; ")}`);
      out.push(info.page ? `The preview shows ${info.page.url}${info.page.title ? ` (“${info.page.title}”)` : ""}${info.page.loading ? " (loading)" : ""}${info.page.reclaimed ? " (closed after five minutes unseen; the next screenshot or other page tool reopens it there)" : ""}.` : "Nothing is open in the preview.");
      if (info.viewport.preset !== "responsive") out.push(`Viewport: ${info.viewport.preset} ${info.viewport.width}×${info.viewport.height}.`);
      return lines(out);
    },
  },
  {
    name: "preview_logs",
    title: "Read server logs",
    description: "Read a dev server's recent output (stdout and stderr).",
    inputSchema: object({
      name: { type: "string", description: "The server's name (default: the one last started)." },
      level: { type: "string", enum: ["all", "error"], description: "error: only lines that look like errors." },
      lines: { type: "integer", minimum: 1, maximum: 500, description: "How many lines (default 50)." },
      search: { type: "string", description: "Only lines containing this text." },
    }),
    annotations: { readOnlyHint: true },
    async handler({ name, level = "all", lines: count = 50, search = "" }, ctx) {
      const logs = preview(ctx).logs(name, { lines: 1000 });
      if (!logs.status) return `No output from ${name ? `“${name}”` : "a server"} yet. Start it with preview_start.`;
      let list = logs.lines;
      if (level === "error") list = list.filter((line) => /\berror\b|\berr!|\bfatal\b|\bfail(?:ed|ure)?\b|\bexception\b/i.test(line));
      if (search) list = list.filter((line) => line.toLowerCase().includes(String(search).toLowerCase()));
      list = list.slice(-Math.max(1, Math.min(500, count)));
      return `${logs.name} (${logs.status})${logs.error ? ` — ${logs.error.message}` : ""}:\n${list.join("\n") || "(no matching output)"}`;
    },
  },
  {
    name: "navigate",
    title: "Open page",
    description: "Open an address in the preview (http(s); localhost needs no confirmation, other sites ask the user once per session, and a site the user declined stays closed to you in this session, including through links and redirects). \"back\" and \"forward\" go through the history.",
    inputSchema: object({ url: { type: "string", description: "The address, or \"back\" / \"forward\"." } }, ["url"]),
    annotations: { openWorldHint: true },
    async handler({ url }, ctx) {
      const result = await preview(ctx).navigate(url);
      if (result.ok === false) return { content: [{ type: "text", text: `${result.url} failed to load: ${result.description} (${result.code}).` }], isError: true };
      return `The preview shows ${result.url}${result.title ? ` (“${result.title}”)` : ""}.`;
    },
  },
  {
    name: "screenshot",
    title: "Capture page",
    description: "Take a screenshot of the page in the preview, as the user sees it (including the viewport preset). The user sees it in the transcript too. If your model can't read images, the picture won't reach you: check the page with read_page, get_page_text and preview_inspect instead.",
    inputSchema: object({ quality: { type: "integer", minimum: 30, maximum: 95, description: "JPEG quality (default 80)." } }),
    annotations: { readOnlyHint: true },
    async handler({ quality }, ctx) {
      const shot = await preview(ctx).screenshot({ quality });
      // R4f-preview-coords (2.42304.0 k4i, screenshot): the image, then its size — the pixels a point for click, hover
      // or scroll is given in (`Screenshot size: ${o.width}x${o.height}`; no scale or capture origin here).
      if (shot.width > 0 && shot.height > 0) return { content: [{ type: "image", data: shot.data, mimeType: shot.mimeType || "image/jpeg" }, { type: "text", text: `Screenshot size: ${shot.width}x${shot.height}` }] };
      return { image: shot };
    },
  },
  {
    name: "read_page",
    title: "Read page",
    description: "Read the page in the preview as an accessibility-style outline: roles, names, values and states. Interactive elements carry ref ids (ref_1, ref_2, …) for click and type. Refs last until the page changes; read again after navigating.",
    inputSchema: object({
      filter: { type: "string", enum: ["all", "interactive"], description: "interactive: only elements you can click or type into." },
      max_chars: { type: "integer", minimum: 1000, maximum: 200000, description: "Output limit (default 50000)." },
    }),
    annotations: { readOnlyHint: true },
    async handler({ filter = "all", max_chars: maxChars = 50000 }, ctx) {
      const page = await preview(ctx).readPage({ filter, maxChars });
      return `${page.title ? `Page: ${page.title}\n` : ""}URL: ${page.url}\n${page.text || "(no readable content)"}${page.truncated ? "\n… (truncated; use filter \"interactive\" or a larger max_chars)" : ""}`;
    },
  },
  {
    name: "get_page_text",
    title: "Read page text",
    description: "Get the visible text of the page in the preview (the main or article content when there is one).",
    inputSchema: object({ max_chars: { type: "integer", minimum: 1000, maximum: 200000, description: "Output limit (default 50000)." } }),
    annotations: { readOnlyHint: true },
    async handler({ max_chars: maxChars = 50000 }, ctx) {
      const page = await preview(ctx).pageText({ maxChars });
      return `${page.title ? `Page: ${page.title}\n` : ""}URL: ${page.url}\n\n${page.text || "(no text)"}${page.truncated ? "\n… (truncated)" : ""}`;
    },
  },
  {
    name: "click",
    title: "Click",
    description: "Click an element in the preview: a ref from read_page, a CSS selector, or a point (x, y in the pixels of your last screenshot, whose result gives its size).",
    inputSchema: object({
      ref: { type: "string", description: "A ref from read_page, e.g. ref_3." },
      selector: { type: "string", description: "A CSS selector." },
      x: { type: "number" },
      y: { type: "number" },
      double_click: { type: "boolean" },
    }),
    async handler({ ref, selector, x, y, double_click: doubleClick = false }, ctx) {
      const result = await preview(ctx).click({ ref, selector, x, y, doubleClick });
      return `Clicked ${result.clicked}. The preview shows ${result.url}.${blockedNote(result)}`;
    },
  },
  {
    name: "type",
    title: "Type",
    description: "Type text into the preview: into an element (ref or selector, which gets focus first) or wherever the focus is. clear replaces the field's text; submit presses Enter afterwards.",
    inputSchema: object({
      text: { type: "string" },
      ref: { type: "string" },
      selector: { type: "string" },
      clear: { type: "boolean" },
      submit: { type: "boolean" },
    }, ["text"]),
    async handler({ text, ref, selector, clear = false, submit = false }, ctx) {
      await preview(ctx).type({ text, ref, selector, clear, submit });
      return `Typed ${text.length} character${text.length === 1 ? "" : "s"}${submit ? " and pressed Enter" : ""}.`;
    },
  },
  {
    name: "press",
    title: "Press keys",
    description: "Press keys in the preview, e.g. \"Enter\", \"Tab\", \"Escape\", \"ArrowDown\", \"cmd+a\". Separate several presses with spaces.",
    inputSchema: object({ keys: { type: "string", description: "Space-separated keys or combinations." } }, ["keys"]),
    async handler({ keys }, ctx) {
      const result = await preview(ctx).press({ keys });
      return `Pressed ${result.pressed.join(" ")}.${blockedNote(result)}`;
    },
  },
  {
    name: "preview_inspect",
    title: "Inspect element",
    description: "Read an element's computed CSS values, box and attributes in the preview (a ref from read_page or a CSS selector). Use it to confirm a style change (color, spacing, size, layout) instead of guessing from a screenshot.",
    inputSchema: object({
      ref: { type: "string", description: "A ref from read_page, e.g. ref_3." },
      selector: { type: "string", description: "A CSS selector." },
      properties: { type: "array", items: { type: "string" }, maxItems: 80, description: "CSS properties to read, e.g. [\"color\", \"padding-top\"] (default: a common set)." },
    }),
    annotations: { readOnlyHint: true },
    async handler({ ref, selector, properties = [] }, ctx) {
      const result = await preview(ctx).inspect({ ref, selector, properties });
      const attributes = Object.entries(result.attributes ?? {}).map(([name, value]) => `${name}="${value}"`).join(" ");
      return lines([`<${result.tag}${attributes ? ` ${attributes}` : ""}> at (${result.box.x}, ${result.box.y}), ${result.box.width}×${result.box.height}`,
        ...(result.text ? [`Text: ${result.text}`] : []), ...Object.entries(result.styles ?? {}).map(([name, value]) => `${name}: ${value}`)]);
    },
  },
  {
    name: "preview_fill",
    title: "Fill field",
    description: "Set the value of a form field in the preview (a ref from read_page or a CSS selector): text inputs and text areas, a <select> option (by value or label), or a checkbox / radio (\"true\" / \"false\"). The page sees input and change events, as when the user types.",
    inputSchema: object({
      ref: { type: "string" },
      selector: { type: "string" },
      value: { type: "string" },
    }, ["value"]),
    async handler({ ref, selector, value }, ctx) {
      const result = await preview(ctx).fill({ ref, selector, value });
      return `Set the ${result.filled} to ${JSON.stringify(result.value)}.`;
    },
  },
  {
    name: "preview_eval",
    title: "Run JavaScript",
    description: "Run a JavaScript expression in the preview page and return its value as JSON (promises are awaited). For debugging only, such as reading application state; check what the user sees with read_page, preview_inspect and screenshot, and act with click, type and preview_fill.",
    inputSchema: object({ expression: { type: "string", description: "The expression (or statements; the last value is returned)." } }, ["expression"]),
    async handler({ expression }, ctx) {
      const result = await preview(ctx).evaluate({ expression });
      return result.text;
    },
  },
  {
    name: "read_console_messages",
    title: "Read console",
    description: "Read the preview page's console messages and uncaught errors (newest last).",
    inputSchema: object({
      level: { type: "string", enum: ["all", "error", "warn"], description: "warn includes errors." },
      lines: { type: "integer", minimum: 1, maximum: 500, description: "How many (default 50)." },
      pattern: { type: "string", description: "Only messages containing this text." },
      clear: { type: "boolean", description: "Forget the messages after reading them." },
    }),
    annotations: { readOnlyHint: true },
    async handler({ level = "all", lines: count = 50, pattern = "", clear = false }, ctx) {
      const list = preview(ctx).consoleMessages({ level, lines: count, pattern, clear });
      if (list === null) return RECLAIMED;
      if (!list.length) return "No console messages.";
      return lines(list.map((line) => `[${line.level}] ${line.text}${line.url ? ` (${line.url}${line.line ? `:${line.line}` : ""})` : ""}`));
    },
  },
  {
    name: "read_network_requests",
    title: "Read network activity",
    description: "List the preview page's recent network requests with status codes; failed shows only failures and HTTP errors.",
    inputSchema: object({
      filter: { type: "string", enum: ["all", "failed"] },
      limit: { type: "integer", minimum: 1, maximum: 300, description: "How many (default 50)." },
      url_pattern: { type: "string", description: "Only URLs containing this text." },
    }),
    annotations: { readOnlyHint: true },
    async handler({ filter = "all", limit = 50, url_pattern: urlPattern = "" }, ctx) {
      const list = preview(ctx).networkRequests({ filter, limit, urlPattern });
      if (list === null) return RECLAIMED;
      if (!list.length) return filter === "failed" ? "No failed requests." : "No requests recorded.";
      return lines(list.map((request) => `${request.method} ${request.url} → ${request.failed ? `failed (${request.failed})` : request.status ?? "pending"}${request.type ? ` [${request.type}]` : ""}`));
    },
  },
  {
    name: "resize_window",
    title: "Resize preview",
    description: "Change the preview's viewport: desktop (fills the pane), tablet (768×1024), mobile (375×812, emulates a touch phone), or a custom width and height; and/or emulate the light or dark color scheme (system follows the app).",
    inputSchema: object({
      preset: { type: "string", enum: ["desktop", "tablet", "mobile"] },
      width: { type: "integer", minimum: 200, maximum: 4000 },
      height: { type: "integer", minimum: 200, maximum: 4000 },
      colorScheme: { type: "string", enum: ["light", "dark", "system"] },
    }),
    async handler({ preset, width, height, colorScheme }, ctx) {
      if (preset === undefined && colorScheme === undefined && !(Number.isFinite(width) && Number.isFinite(height))) return { content: [{ type: "text", text: "Give a preset, a width and height, or a colorScheme." }], isError: true };
      const viewport = await preview(ctx).resize({ preset, width, height, colorScheme });
      const size = viewport.preset === "responsive" ? "desktop (fills the pane)" : `${viewport.preset} ${viewport.width}×${viewport.height}`;
      return `Viewport: ${size}; color scheme: ${viewport.colorScheme}.`;
    },
  },
  {
    name: "scroll",
    title: "Scroll",
    description: "Scroll the page in the preview. Without a direction, scrolls an element (a ref from read_page or a CSS selector) into view. With a direction, scrolls the scrollable area holding that element or the point (x, y in the pixels of your last screenshot), else the page, by amount wheel ticks (about 100 px each).",
    inputSchema: object({
      ref: { type: "string", description: "A ref from read_page or find, e.g. ref_3." },
      selector: { type: "string", description: "A CSS selector." },
      x: { type: "number" },
      y: { type: "number" },
      direction: { type: "string", enum: ["up", "down", "left", "right"] },
      amount: { type: "integer", minimum: 1, maximum: 20, description: "Wheel ticks (default 3)." },
    }),
    async handler({ ref, selector, x = null, y = null, direction = null, amount = 3 }, ctx) {
      const result = await preview(ctx).scroll({ ref, selector, x, y, direction, amount });
      if (result.into) return `Scrolled ${ref || selector} into view. The page is at (${result.scrollX}, ${result.scrollY}).`;
      const where = result.page ? "The page" : `The scrollable <${result.tag}>`;
      return `${result.moved ? `Scrolled ${direction}.` : `Couldn’t scroll ${direction}: already at the edge.`} ${where} is at (${result.scrollX}, ${result.scrollY}) of ${result.maxY} px.`;
    },
  },
  {
    name: "hover",
    title: "Hover",
    description: "Move the pointer over an element in the preview (a ref from read_page or find, a CSS selector, or a point x, y in the pixels of your last screenshot) without clicking, e.g. to reveal a tooltip or a hover menu. Take a screenshot or read the page afterwards to see what appeared.",
    inputSchema: object({
      ref: { type: "string", description: "A ref from read_page or find, e.g. ref_3." },
      selector: { type: "string", description: "A CSS selector." },
      x: { type: "number" },
      y: { type: "number" },
    }),
    async handler({ ref, selector, x, y }, ctx) {
      const result = await preview(ctx).hover({ ref, selector, x, y });
      return `Hovering over ${result.hovered}.`;
    },
  },
  {
    name: "find",
    title: "Find on page",
    description: "Find elements on the page in the preview whose role, accessible name or text contains the query (case-insensitive), with refs you can pass to click, type, hover, scroll and preview_fill. Faster than reading the whole page when you know what you are looking for.",
    inputSchema: object({
      query: { type: "string", description: "Text to look for, e.g. \"Sign in\", \"search\", \"Add to cart\"." },
      limit: { type: "integer", minimum: 1, maximum: 50, description: "At most this many matches (default 20)." },
    }, ["query"]),
    annotations: { readOnlyHint: true },
    async handler({ query, limit = 20 }, ctx) {
      const result = await preview(ctx).find({ query, limit });
      if (!result.matches.length) return `Nothing on ${result.url} matches “${query}”.`;
      return lines([...result.matches, ...(result.more ? [`(More matches not shown; narrow the query.)`] : [])]);
    },
  },
];

// preview_batch (Claude's browser_batch): several preview tools in one call, in order, stopping at the first error.
// Each step is the tool itself, so its own checks and approvals apply (a new outside site still asks).
export const MAX_BATCH = 20;
function stepContent(value) {
  if (typeof value === "string") return { content: [{ type: "text", text: value }] };
  if (value && Array.isArray(value.content)) return value;
  if (value?.image) return { content: [...(value.text ? [{ type: "text", text: value.text }] : []), { type: "image", data: value.image.data, mimeType: value.image.mimeType || "image/png" }] };
  return { content: [{ type: "text", text: value === undefined || value === null ? "Done." : JSON.stringify(value) }] };
}
tools.push({
  name: "preview_batch",
  title: "Run preview steps",
  description: "Run several preview tools in one call, in order, stopping at the first error: e.g. navigate, click a field, type, press Enter, screenshot. Each action is {name, input} where input is exactly what you would pass to that tool on its own (any preview tool except preview_batch). Use it when you can predict two or more steps ahead. Coordinates in a step refer to the screenshot taken before this call.",
  inputSchema: object({
    actions: {
      type: "array", minItems: 1, maxItems: MAX_BATCH,
      items: { type: "object", properties: { name: { type: "string" }, input: { type: "object" } }, required: ["name"], additionalProperties: false },
      description: `The steps, at most ${MAX_BATCH}.`,
    },
  }, ["actions"]),
  async handler({ actions }, ctx) {
    if (!Array.isArray(actions) || !actions.length) throw new Error("actions must list at least one step.");
    if (actions.length > MAX_BATCH) throw new Error(`At most ${MAX_BATCH} steps in one batch.`);
    const byName = new Map(tools.filter((tool) => tool.name !== "preview_batch").map((tool) => [tool.name, tool]));
    for (const [index, action] of actions.entries()) {
      if (!byName.has(action?.name)) throw new Error(`Step ${index + 1}: ${action?.name ? `${action.name} isn’t a preview tool` : "name the tool"}. Nothing was run.`);
    }
    const content = [];
    for (const [index, action] of actions.entries()) {
      if (ctx.signal?.aborted) { content.push({ type: "text", text: `Stopped before step ${index + 1}: the turn was stopped.` }); return { content, isError: true }; }
      let result;
      try { result = stepContent(await byName.get(action.name).handler(action.input && typeof action.input === "object" ? action.input : {}, ctx)); }
      catch (error) { result = { content: [{ type: "text", text: String(error?.message || error) }], isError: true }; }
      const parts = result.content.filter((part) => part && typeof part.type === "string");
      const text = parts.filter((part) => part.type === "text").map((part) => part.text).join("\n");
      content.push({ type: "text", text: `${index + 1}. ${action.name}${result.isError ? " failed" : ""}: ${text || (parts.length ? "(image)" : "Done.")}` });
      content.push(...parts.filter((part) => part.type !== "text"));
      if (result.isError) {
        if (index + 1 < actions.length) content.push({ type: "text", text: `Stopped: the remaining ${actions.length - index - 1 === 1 ? "step was" : `${actions.length - index - 1} steps were`} not run.` });
        return { content, isError: true };
      }
    }
    return { content };
  },
});
