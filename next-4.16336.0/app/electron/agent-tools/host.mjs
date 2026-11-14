// Claude Desktop's ccd_host tools that hand the user a file (2.2553.1 index.chunk-uZRTWaFR.js): reveal_path (Finder,
// with the item selected) and open_in_editor (the code editors of the app's Open in menu, electron/editors.cjs).
// Only paths inside the session's working folder; the user approves each one on the session's approval card (the
// open-path kind) unless the session runs in Bypass permissions, as Claude asks in its default mode.
// ctx.host: { editors() → [{type, name}], reveal(path), openInEditor(path, type, {line, column}) }  (main.cjs)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const group = "host";

/** A path the agent names (absolute, ~ or relative to the session folder) as a real path inside that folder. */
export function sessionPath(requested, root) {
  if (typeof requested !== "string" || !requested.trim() || requested.includes("\0")) throw new Error("path is required.");
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("This session has no working folder.");
  const raw = requested.trim();
  const expanded = raw === "~" ? os.homedir() : raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : raw;
  let real, realRoot;
  try { realRoot = fs.realpathSync(root); } catch { throw new Error("The session’s working folder doesn’t exist."); }
  try { real = fs.realpathSync(path.resolve(realRoot, expanded)); } catch { throw new Error(`${raw} doesn’t exist.`); }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error(`${raw} is outside the session’s folders.`);
  return real;
}

async function approved(ctx, request) {
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  const answer = typeof ctx.requestApproval === "function" ? await ctx.requestApproval(request) : false;
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  return answer === true || answer?.approved === true;
}
function service(ctx) {
  if (!ctx?.host || typeof ctx.host.reveal !== "function") throw new Error("This isn’t available in this session.");
  return ctx.host;
}

export const tools = [
  {
    name: "reveal_path",
    title: "Show in Finder",
    description: "Show a file or folder from this session's project in Finder, selected inside its parent folder. Use when the user wants to get at a file outside this app: drag it somewhere, attach it to an email, look at a build output. `path` is absolute or relative to the session's working directory, and must be inside it; it may name a folder. The user approves each reveal on a card that shows the resolved path (Bypass permissions doesn't ask).",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "File or folder to reveal: absolute, or relative to the session's working directory." } },
      required: ["path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const host = service(ctx);
      const target = sessionPath(args.path, ctx.cwd);
      if (!(await approved(ctx, { kind: "open-path", action: "reveal", path: target }))) throw new Error("The user declined. Nothing was shown.");
      await host.reveal(target);
      return `Shown ${target} in Finder.`;
    },
  },
  {
    name: "open_in_editor",
    title: "Open in editor",
    description: "Open a file from this session's project in the user's code editor (one of those in this app's \"Open in\" menu, such as VS Code, Cursor, Windsurf or Zed), optionally at a line and column. Use it to hand work back to the user: after a change they'll want to inspect or finish by hand, or when they ask you to open something.\n\n`path` is absolute or relative to the session's working directory, and must be inside it. If the user has several editors installed, the call fails and lists them: ask which they prefer and pass it as `editor`. Files only: to show the user a folder, use reveal_path. The user approves each open on a card that shows the resolved path (Bypass permissions doesn't ask). Returns once the editor has been asked to open the file; it doesn't report what happens inside the editor.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File to open: absolute, or relative to the session's working directory." },
        line: { type: "number", description: "1-based line to reveal (files only)." },
        column: { type: "number", description: "1-based column on that line. Ignored without `line`." },
        editor: { type: "string", description: "Only when the user told you which editor to use, or after a previous call listed several (the type it gave, e.g. vscode, cursor, windsurf, zed). Otherwise omit it." },
      },
      required: ["path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const host = service(ctx);
      const target = sessionPath(args.path, ctx.cwd);
      if (!fs.statSync(target).isFile()) throw new Error(`${args.path} is a folder. To show the user a folder, use reveal_path.`);
      const editors = host.editors();
      if (!editors.length) throw new Error("No code editor this app can open files in is installed (VS Code, Cursor, Windsurf, Zed and others). Use reveal_path to show the file in Finder instead.");
      let editor = null;
      if (typeof args.editor === "string" && args.editor) {
        editor = editors.find((entry) => entry.type === args.editor);
        if (!editor) throw new Error(`${args.editor} isn’t installed. Installed: ${editors.map((entry) => `${entry.type} (${entry.name})`).join(", ")}.`);
      } else if (editors.length === 1) editor = editors[0];
      else throw new Error(`Several editors are installed: ${editors.map((entry) => `${entry.type} (${entry.name})`).join(", ")}. Ask the user which they prefer and pass it as editor.`);
      const line = Number.isInteger(args.line) && args.line > 0 ? args.line : null;
      const column = line && Number.isInteger(args.column) && args.column > 0 ? args.column : null;
      if (!(await approved(ctx, { kind: "open-path", action: "editor", path: target, editor: editor.name, ...(line ? { line } : {}) }))) throw new Error("The user declined. Nothing was opened.");
      const at = await host.openInEditor(target, editor.type, { line, column });
      return `Asked ${editor.name} to open ${target}${line ? (at?.line === false ? ` (it can’t be opened at a line from here, so it opened at the top)` : ` at line ${line}${column ? `, column ${column}` : ""}`) : ""}.`;
    },
  },
];
