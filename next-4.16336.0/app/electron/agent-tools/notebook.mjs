// NotebookEdit: Claude Code's tool for editing a Jupyter notebook cell (replace, insert or delete), for a core without
// one (MiMo and Qwen edit notebooks themselves and list NotebookEdit in nativeTools). Only notebooks inside the
// session's working folder. It follows the session's Mode as a core's own edits do: refused in a read-only Mode (Plan,
// Ask), made without asking in Accept edits and Bypass permissions, and otherwise asked in the session's approval
// card (the notebook-edit kind). The file is written in Jupyter's own layout (one-space indent), so the Changes pane
// shows a readable diff.
// ctx.access: { get() → Promise<{access: "read-only"|"workspace-write"|"danger-full-access", permission}> }  (main.cjs)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const group = "notebook";
export const native = "NotebookEdit";
export const MAX_NOTEBOOK_BYTES = 50 * 1024 * 1024;

/** A notebook path the agent names, as a real .ipynb file inside the session folder. */
export function notebookFile(requested, root) {
  if (typeof requested !== "string" || !requested.trim() || requested.includes("\0")) throw new Error("notebook_path is required.");
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("This session has no working folder.");
  const raw = requested.trim();
  if (path.extname(raw).toLowerCase() !== ".ipynb") throw new Error("File must be a Jupyter notebook (.ipynb file). For editing other file types, use your file edit tool.");
  let real, realRoot;
  try { realRoot = fs.realpathSync(root); } catch { throw new Error("The session’s working folder doesn’t exist."); }
  try { real = fs.realpathSync(path.resolve(realRoot, raw)); } catch { throw new Error(`Notebook file does not exist: ${raw}`); }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) throw new Error(`${raw} is outside the session’s working folder, so it can’t be edited here.`);
  const stat = fs.statSync(real);
  if (!stat.isFile()) throw new Error(`${raw} is not a file.`);
  if (stat.size > MAX_NOTEBOOK_BYTES) throw new Error(`${raw} is too large to edit (over 50 MB).`);
  return real;
}

/** The index of the cell `id` names: its id, or Claude Code's "cell-N" (0-based) for a notebook without ids. */
export function cellIndex(cells, id) {
  const at = cells.findIndex((cell) => cell && cell.id === id);
  if (at >= 0) return at;
  const numbered = /^cell-(\d+)$/.exec(id);
  if (numbered && Number(numbered[1]) < cells.length) return Number(numbered[1]);
  return -1;
}

const newCellId = () => crypto.randomBytes(4).toString("hex");
const sourceLines = (text) => (text === "" ? [] : text.split(/(?<=\n)/));

/**
 * The notebook after one edit: {notebook, cellId, mode} or throws what is wrong. Pure (for the handler and tests).
 * replace: the cell's source (and type); a code cell's outputs and execution count are cleared, as Jupyter does.
 * insert: a new cell after cell_id (at the start without one); cell_type is required. delete: the cell.
 */
export function editNotebook(notebook, { cell_id: id, new_source: source, cell_type: type, edit_mode: mode = "replace" } = {}) {
  if (!notebook || typeof notebook !== "object" || !Array.isArray(notebook.cells)) throw new Error("Notebook is not valid JSON with a cells list.");
  if (!["replace", "insert", "delete"].includes(mode)) throw new Error("Edit mode must be replace, insert, or delete.");
  if (type !== undefined && !["code", "markdown"].includes(type)) throw new Error("cell_type must be code or markdown.");
  if (mode !== "delete" && typeof source !== "string") throw new Error("new_source is required.");
  if (mode === "insert" && !type) throw new Error("Cell type is required when using edit_mode=insert.");
  const cells = notebook.cells.slice();
  const withIds = Number(notebook.nbformat) > 4 || (Number(notebook.nbformat) === 4 && Number(notebook.nbformat_minor) >= 5);
  let at = -1;
  if (typeof id === "string" && id) {
    at = cellIndex(cells, id);
    if (at < 0) throw new Error(`Cell with ID "${id}" not found in notebook.`);
  } else if (mode !== "insert") throw new Error("cell_id is required unless inserting a cell at the start.");
  if (mode === "delete") {
    const [removed] = cells.splice(at, 1);
    return { notebook: { ...notebook, cells }, cellId: removed?.id ?? id, mode };
  }
  if (mode === "insert") {
    const cell = { cell_type: type, ...(withIds ? { id: newCellId() } : {}), metadata: {}, source: sourceLines(source), ...(type === "code" ? { execution_count: null, outputs: [] } : {}) };
    cells.splice(at + 1, 0, cell);
    return { notebook: { ...notebook, cells }, cellId: cell.id ?? `cell-${at + 1}`, mode };
  }
  const previous = cells[at];
  const cellType = type ?? previous.cell_type;
  const cell = { ...previous, cell_type: cellType, source: sourceLines(source) };
  if (cellType === "code") { cell.execution_count = null; cell.outputs = []; }
  else { delete cell.execution_count; delete cell.outputs; }
  cells[at] = cell;
  return { notebook: { ...notebook, cells }, cellId: previous.id ?? id, mode };
}

async function permitted(ctx, file, args) {
  let facts = null;
  try { facts = await ctx.access?.get?.(); } catch { facts = null; }
  const access = facts?.access ?? "read-only";
  if (access === "read-only") throw new Error("This session is in a read-only mode (Plan or Ask), so the notebook wasn’t changed. Switch the session’s mode to make edits.");
  if (access === "danger-full-access" || facts?.permission === "acceptEdits" || facts?.permission === "bypass") return;
  if (ctx.signal?.aborted) throw new Error("The turn was stopped. The notebook wasn’t changed.");
  const answer = typeof ctx.requestApproval === "function"
    ? await ctx.requestApproval({ kind: "notebook-edit", path: file, mode: args.edit_mode ?? "replace", cellId: typeof args.cell_id === "string" ? args.cell_id : undefined, source: typeof args.new_source === "string" ? args.new_source : undefined })
    : false;
  if (ctx.signal?.aborted) throw new Error("The turn was stopped. The notebook wasn’t changed.");
  if (!(answer === true || answer?.approved === true)) throw new Error("The user declined. The notebook wasn’t changed.");
}

export const tools = [
  {
    name: "NotebookEdit",
    title: "Edit notebook",
    description: "Completely replaces the contents of a specific cell in a Jupyter notebook (.ipynb file) with new source. Jupyter notebooks are interactive documents that combine code, text, and visualizations, commonly used for data analysis and scientific computing. The notebook_path parameter must be a path inside the session's working folder (absolute or relative to it). The cell_id is the ID of the cell to edit (or cell-N, 0-based, for a notebook without cell IDs). When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified. Use edit_mode=insert to add a new cell (cell_type is then required). Use edit_mode=delete to delete the cell at cell_id. Replacing a code cell clears its outputs.",
    inputSchema: {
      type: "object",
      properties: {
        notebook_path: { type: "string", description: "The path to the Jupyter notebook file to edit (absolute, or relative to the session's working folder)." },
        cell_id: { type: "string", description: "The ID of the cell to edit. When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified." },
        new_source: { type: "string", description: "The new source for the cell." },
        cell_type: { type: "string", enum: ["code", "markdown"], description: "The type of the cell (code or markdown). If not specified, it defaults to the current cell type. If using edit_mode=insert, this is required." },
        edit_mode: { type: "string", enum: ["replace", "insert", "delete"], description: "The type of edit to make (replace, insert, delete). Defaults to replace." },
      },
      required: ["notebook_path", "new_source"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const file = notebookFile(args.notebook_path, ctx?.cwd);
      let notebook;
      try { notebook = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw new Error("Notebook is not valid JSON."); }
      // Validated before asking: an edit that can't apply never shows a card.
      const edited = editNotebook(notebook, args);
      await permitted(ctx, file, args);
      // Unchanged on disk since it was read: a notebook the user saved meanwhile isn't overwritten.
      let current;
      try { current = JSON.parse(fs.readFileSync(file, "utf8")); } catch { current = null; }
      const result = JSON.stringify(current) === JSON.stringify(notebook) ? edited : editNotebook(current, args);
      fs.writeFileSync(file, `${JSON.stringify(result.notebook, null, 1)}\n`, "utf8");
      // Claude Code's results.
      const shown = String(args.new_source ?? "").slice(0, 2000);
      if (result.mode === "delete") return `Deleted cell ${result.cellId}`;
      if (result.mode === "insert") return `Inserted cell ${result.cellId} with ${shown}`;
      return `Updated cell ${result.cellId} with ${shown}`;
    },
  },
];
