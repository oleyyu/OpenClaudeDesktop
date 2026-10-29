// SendUserFile: Claude Code's tool for handing the user files — a report, a screenshot, a built artifact. The
// transcript shows each one as a file card with Open and Show in Finder (src/source-deliverables.jsx, the cards of
// the DeepSeek core's own `present` tool, so that core lists SendUserFile in nativeTools and never gets this one).
// Only files inside the session's working folder: the cards open them through main.cjs open-tool-file /
// reveal-tool-file, which are scoped to that folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const group = "files";
export const native = "SendUserFile";
// w13-close-main-process (E63 coworkfn-tools-06): a Cowork session hands the user files with present_files only (the
// official Cowork server, h5i, has no SendUserFile; agent-tools/cowork.mjs), so this tool serves Chat and Code sessions.
export const surfaces = ["chat", "code"];
export const MAX_FILES = 20;

/** A path the agent names (absolute, ~ or relative to the session folder) as a real file inside that folder. */
export function sessionFile(requested, root) {
  if (typeof requested !== "string" || !requested.trim() || requested.includes("\0")) throw new Error("Each file must be a path.");
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("This session has no working folder.");
  const raw = requested.trim();
  const expanded = raw === "~" ? os.homedir() : raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : raw;
  let real, realRoot;
  try { realRoot = fs.realpathSync(root); } catch { throw new Error("The session’s working folder doesn’t exist."); }
  try { real = fs.realpathSync(path.resolve(realRoot, expanded)); } catch { throw new Error(`${raw} doesn’t exist.`); }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error(`${raw} is outside the session’s working folder, so it can’t be sent. Copy it into the folder first.`);
  if (!fs.statSync(real).isFile()) throw new Error(`${raw} is not a file.`);
  return real;
}

export const tools = [
  {
    name: "SendUserFile",
    title: "Send files to the user",
    description: "Hand the user files you made or found — a report, a generated diagram, a screenshot, a built artifact — shown in the transcript as file cards they can open or show in Finder. Use it for deliverables, not for routine working files or every intermediate save. Files must be inside the session's working folder. Add a short caption when one line of context helps.",
    inputSchema: {
      type: "object",
      properties: {
        files: { type: "array", minItems: 1, maxItems: MAX_FILES, items: { type: "string" }, description: "Paths of the files to send: absolute, ~, or relative to the session's working folder (at most 20)." },
        caption: { type: "string", description: "Optional one-line caption shown with the files." },
      },
      required: ["files"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const list = Array.isArray(args.files) ? args.files : typeof args.files === "string" ? [args.files] : [];
      if (!list.length) throw new Error("files must name at least one file.");
      if (list.length > MAX_FILES) throw new Error(`Send at most ${MAX_FILES} files at once.`);
      const caption = typeof args.caption === "string" ? args.caption.replace(/\s+/g, " ").trim().slice(0, 300) : "";
      const seen = new Set(), deliverables = [];
      for (const entry of list) {
        const file = sessionFile(entry, ctx?.cwd);
        if (seen.has(file)) continue;
        seen.add(file);
        deliverables.push({ path: file, ...(caption ? { description: caption } : {}) });
      }
      const names = deliverables.map((entry) => path.basename(entry.path));
      return {
        content: [{ type: "text", text: `Sent ${deliverables.length === 1 ? "1 file" : `${deliverables.length} files`} to the user: ${names.join(", ")}.` }],
        structuredContent: { deliverables },
      };
    },
  },
];
