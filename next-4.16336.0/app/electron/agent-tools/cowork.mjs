// w13-coworkfn-tools (research/w13-coworkfn.md §1.4 O-26~O-28/O-30, cwf-23~27): Cowork's built-in tools on the connected
// core, the official cowork MCP server (3.6556.2 asar index.chunk-h5ilKUwe.js `function Ue(e,n){let{createSdkMcpServer:r,
// tool:i}=e` and `function T({tool:e})`, names jPKPzV-P `v7t="request_cowork_directory"`, `y7t="allow_cowork_file_delete"`,
// `b7t="present_files"`, `T7t="launch_code_session"`) in its host-loop form (3P keepsSessionCliOnHost, engine-policy.mjs):
//   request_cowork_directory  connect a folder: a path the user approves on the session's card (none when the folder is
//                             attached already, O-22, or trusted, O-16), else the native picker
//   allow_cowork_file_delete  turn on deleting in one connected folder for the rest of the task, on the user's card
//   present_files             show files from the outputs folder, the uploads folder or a connected folder as cards
//                             (cowork-runtime/outputs.mjs; the cards come at the turn's end, as the official ones come
//                             "at the end of your reply")
//   launch_code_session       hand a coding task to a new Code session the user approves and places
// Offered to Cowork sessions only (`surfaces`, agent-tools-host.cjs). The descriptions are the official ones word for
// word; a parameter or result sentence that names the official VM ("/sessions/…", "the VM path") says the host path
// instead, since the connected core has no VM. The cards' copy is the official renderer's (ion-dist ca44d5dae).
// request_cowork_directory and allow_cowork_file_delete always ask (jPKPzV-P V7t "This tool requires explicit approval
// regardless of permission mode."): their cards are the `other` kind, which Bypass permissions never skips (main.cjs
// BYPASS_KINDS).
//
// ctx.cowork (main.cjs agentTools.provide("cowork", …)):
//   { userData, t(text, values), meta() → the session's sessionMetadata, update(change(meta) → meta), approveRoot(dir),
//     trusted(dir) → Promise<boolean>, pickFolder({title, message, defaultPath}) → Promise<string|null>,
//     presented(paths), rpc(method, params) → Promise, codeDefaults() → {model, effort, permission, hints, customization, networkAccess} }
import nodeOs from "node:os";
import nodePath from "node:path";
import { coreCoworkMetadata, coworkStoragePaths } from "../cowork-runtime/core-cowork.mjs";
import { addSessionFolder, folderMountSatisfied, judgeFolder, protectedSubpathRefusal, sessionGrants } from "../cowork-runtime/folder-policy.mjs";
import { outputsDir, presentable, presentRefusal } from "../cowork-runtime/outputs.mjs";
import { threadPermissionParams, turnPermissionParams } from "../permission-policy.mjs";
import { rejectionMessage } from "../cowork-runtime/approval-policy.mjs";
import { CODE_ROUTINE_INSTRUCTIONS } from "../routine-runner.mjs";

export const group = "cowork";
export const surfaces = ["cowork"];

// h5i, word for word.
export const DESCRIPTIONS = Object.freeze({
  request_cowork_directory: "Request access to a directory on the user's computer. If you know the path, pass it — the user sees the path and approves, then it's mounted. If you omit path, a native folder picker opens — but only in local sessions. In remote sessions the path is required. Use this whenever the user asks you to work with files you don't currently have access to. Do not call it for a folder the system prompt says you already have access to, or for anything inside such a folder. This is the primary way to gain file system access.",
  allow_cowork_file_delete: "Request permission to delete files in a connected folder (your outputs folder never needs it). IMPORTANT: call this tool whenever a delete operation (such as rm) fails with 'Operation not permitted', rather than telling the user it is impossible. If approved, file deletion will be enabled for that whole folder for the rest of the task.",
  present_files: "Present files to the user with interactive cards in the chat. Use this after creating files the user should see. The files will be displayed as clickable cards with appropriate actions. Files ending in `.skill` (a zip archive of a skill directory containing SKILL.md) render with a 'Save skill' install button — to share a skill, zip the directory with a `.skill` extension before presenting. The file cards appear at the end of your reply if it ends with text, otherwise under the step that presented them; say they are below only if you finish the reply with text. Only files under your outputs folder, the uploads folder, or a connected folder can be presented — if a shell command wrote a file elsewhere in its Linux environment, copy it into one of those first.",
  launch_code_session: "Suggest launching a dedicated Claude Code session for a coding task. Use this when the user asks for a change to a codebase that would benefit from a full code editor, terminal, and file system — e.g. adding a feature, fixing a bug across files, or running tests. Write a concise spec (task statement + any context you've gathered in this conversation). The user reviews the spec, picks where to run it (local folder or cloud environment), and launches. Do not call this for simple single-file edits or pure questions.",
});

// h5i (and Dl8 for the rejection), word for word unless noted.
export const TEXT = Object.freeze({
  pickerTitle: "Select Directory to Share",
  pickerMessage: "Select a directory to share with the agent",
  cancelled: "Directory selection was cancelled by the user.",
  deleteOutputs: "Deleting inside your outputs folder needs no permission; it is already allowed. Run the delete again; if it still fails, report that error instead.",
  launchDismissed: "The launch card was approved but no session was created. The user may have dismissed the picker — you can ask if they'd like to try again.",
});

// The cards (3.6556.2 ion-dist ca44d5dae-lEflPFFi.js): i18n keys, translated by ctx.cowork.t.
export const CARDS = Object.freeze({
  folderTitle: "Claude would like to add this folder to the session:", // C7fneNDWNj
  deleteTitle: "Allow Claude to permanently delete files in your {folderName} folder during this task?", // hkclihVpsD
  deleteReason: "Claude is asking because it wants to delete {file}. Allowing covers the whole folder.", // jVcy5dDESy
  deleteWarning: "Once allowed, this permission can’t be revoked without starting a new task. Deleted files can’t be restored.", // yxsRbEUkNf
  launchTitle: "Claude wants to send this to Claude Code", // e/Ma2VO6zk (its <bold> markup is the renderer's)
  launchPicker: "Choose folder",
});

const error = (text) => ({ content: [{ type: "text", text }], isError: true });
const text = (value) => ({ content: [{ type: "text", text: value }] });
// Dl8 respondToToolPermission's deny: `User rejected ${Jh(toolName)} ${qh(input)}. Please acknowledge …` (approval-policy.mjs
// rejectionMessage, kOi / AOi word for word), the tool named as the core calls it: the app's MCP server's
// (agent-tools-host.cjs SERVER_NAME), as the official names its cowork server's (w13-close-main-process).
const APP_SERVER = "code_desktop";
const rejected = (tool, input) => error(rejectionMessage(`mcp__${APP_SERVER}__${tool}`, input));
const expand = (value, home = nodeOs.homedir()) => value === "~" ? home : value.startsWith("~/") ? nodePath.join(home, value.slice(2)) : value;
const inside = (file, root) => file === root || file.startsWith(root.endsWith(nodePath.sep) ? root : root + nodePath.sep);
const tildePath = (dir, home = nodeOs.homedir()) => dir === home ? "~" : inside(dir, home) ? `~/${nodePath.relative(home, dir).split(nodePath.sep).join("/")}` : dir;

function service(ctx) {
  const cowork = ctx?.cowork;
  if (!cowork || typeof cowork.meta !== "function") throw new Error("This tool works only in a Cowork session.");
  return cowork;
}
/** The calling session's Cowork metadata on the connected core (core-cowork.mjs coreCoworkMetadata), or a thrown error. */
function coworkOf(cowork) {
  const meta = cowork.meta();
  const data = coreCoworkMetadata(meta);
  if (!data) throw new Error("This tool works only in a Cowork session.");
  return { meta, data, storage: coworkStoragePaths(cowork.userData, data.storage) };
}
async function approved(ctx, request) {
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  const answer = typeof ctx.requestApproval === "function" ? await ctx.requestApproval(request) : false;
  if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
  return answer === true || answer?.approved === true;
}
const say = (cowork, key, values) => typeof cowork.t === "function" ? cowork.t(key, values) : key.replace(/\{(\w+)\}/g, (match, name) => values?.[name] ?? match);

/**
 * h5i's host-loop answer once a folder is connected (`Folder connected: ${s}\n\nUse this exact path with ${r}.\n\n…`),
 * r = "Read/Write/Edit/Grep/Glob". The last sentence differs: the connected core's sandbox takes the new writable root
 * with the next turn (core-cowork.mjs decorateCoworkTurn), so only reading is immediate.
 */
export const folderConnected = (dir) => `Folder connected: ${dir}\n\nUse this exact path with Read/Write/Edit/Grep/Glob.\n\nRead/Grep/Glob can use this folder immediately; Write/Edit can change files in it from the next turn.`;

/**
 * Whether file is inside a connected folder whose deletes the user allowed (allow_cowork_file_delete), for the approvals'
 * delete guard (cowork-runtime/approval-policy.mjs createCoworkDeleteGuard, main.cjs receive): a delete the core asks to
 * approve in a connected folder without this is declined. A known gap (E71, reports/W13/w13-coworkfn-approvals.md
 * 「未完成项」1 and reports/W13/w13-close-main-process.md): the connected core's workspaceWrite sandbox
 * (decorateCoworkTurn) lets `rm` / apply_patch delete inside its writable roots without asking, so those deletes are
 * not seen and not blocked; closing it needs the core's sandbox to tell deleting from writing.
 */
export function deleteAllowed(meta, file, options) {
  const data = coreCoworkMetadata(meta);
  if (!data || typeof file !== "string" || !nodePath.isAbsolute(file)) return false;
  const allowed = Array.isArray(data.deleteFolders) ? data.deleteFolders : [];
  const grants = sessionGrants(meta, options);
  return allowed.some((folder) => grants.includes(folder) && inside(nodePath.normalize(file), folder));
}

/** Starts a Code session on the connected core with spec as its first message (as a Code routine starts, routine-runner.mjs). */
export async function launchCodeSession({ rpc, spec, cwd, defaults = {} }) {
  const permission = { mode: "code", permission: defaults.permission ?? "auto", hints: defaults.hints === true, autoReview: false };
  const thread = threadPermissionParams(permission);
  const start = await rpc("thread/start", { cwd, ...(defaults.model ? { model: defaults.model } : {}), ...thread,
    ...(defaults.customization === true ? {} : { developerInstructions: CODE_ROUTINE_INSTRUCTIONS }),
    codeDesktop: { ...thread.codeDesktop, surface: "code" } });
  const threadId = start?.thread?.id;
  if (typeof threadId !== "string" || !threadId) throw new Error("The core did not create a session.");
  const turn = turnPermissionParams({ ...permission, cwd, networkAccess: defaults.networkAccess === true });
  await rpc("turn/start", { threadId, cwd, ...(defaults.model ? { model: defaults.model } : {}), ...(defaults.effort ? { effort: defaults.effort } : {}),
    input: [{ type: "text", text: spec }], ...turn });
  return { threadId, cwd };
}

export const tools = [
  {
    name: "request_cowork_directory",
    title: "Request a folder",
    description: DESCRIPTIONS.request_cowork_directory,
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Host path to mount (e.g. ~/Downloads). Required in remote sessions; omit in local sessions to show the native folder picker." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cowork = service(ctx);
      const { meta, storage } = coworkOf(cowork);
      const options = { userData: cowork.userData };
      const given = typeof args.path === "string" && args.path.trim() ? args.path.trim() : null;
      let folder;
      if (given) {
        const requested = expand(given);
        if (nodePath.isAbsolute(requested)) {
          // A protected location inside a connected folder is never handed over (folder-policy.mjs fri).
          const carved = await protectedSubpathRefusal(meta, requested, options);
          if (carved) return error(carved.message);
          // O-22: "Allowing request_cowork_directory without a card: the folder is already attached to the session".
          if (folderMountSatisfied(meta, requested, options)) return text(folderConnected(nodePath.normalize(requested)));
        }
        const judged = await judgeFolder(given, { ...options, sessionStorageDirs: [storage.root], mode: "tool" });
        if (!judged.ok) return error(judged.message);
        // O-16: a trusted folder (or one inside it) is used without the Allow prompt.
        if (!(await cowork.trusted?.(judged.canonical))
          && !(await approved(ctx, { kind: "other", tool: "request_cowork_directory", title: say(cowork, CARDS.folderTitle), detail: judged.canonical, cwd: judged.canonical }))) return rejected("request_cowork_directory", { path: judged.canonical });
        folder = judged.canonical;
      } else {
        const picked = await cowork.pickFolder({ title: say(cowork, TEXT.pickerTitle), message: say(cowork, TEXT.pickerMessage) });
        if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
        if (!picked) return text(TEXT.cancelled);
        // Chosen in the picker: the official allowPickerVouch (folder-policy.mjs judgeFolder vouched).
        const judged = await judgeFolder(picked, { ...options, sessionStorageDirs: [storage.root], mode: "tool", vouched: true });
        if (!judged.ok) return error(judged.message);
        folder = judged.canonical;
      }
      // The session may have changed while the card or the picker was open: add to what it is now.
      cowork.update((current) => addSessionFolder(current, folder));
      cowork.approveRoot?.(folder);
      return text(folderConnected(folder));
    },
  },
  {
    name: "allow_cowork_file_delete",
    title: "Allow deleting files",
    description: DESCRIPTIONS.allow_cowork_file_delete,
    inputSchema: {
      type: "object",
      // h5i: "The VM path of the file you're trying to delete" (the connected core has no VM: its host path).
      properties: { file_path: { type: "string", description: "The path of the file you're trying to delete" } },
      required: ["file_path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cowork = service(ctx);
      const { meta, data, storage } = coworkOf(cowork);
      const options = { userData: cowork.userData };
      const given = typeof args.file_path === "string" ? args.file_path : "";
      // h5i X's refusals, on host paths.
      if (!given) return error("No file_path given. Pass the path of the file you want to delete.");
      const expanded = expand(given);
      if (!nodePath.isAbsolute(expanded)) return error(`${given} is not an absolute path. Pass the file's exact path.`);
      if (nodePath.normalize(expanded) !== expanded || (expanded.length > 1 && expanded.endsWith("/")))
        return error(`${given} is not a normalized path: drop any "." or ".." segment, doubled slash or trailing slash and pass the file's exact path.`);
      if (inside(expanded, storage.outputs)) return error(TEXT.deleteOutputs);
      const grants = sessionGrants(meta, options);
      const outputsLine = `Files in your outputs folder (${storage.outputs}/) can be deleted without asking.`;
      const folder = grants.filter((grant) => inside(expanded, grant)).sort((a, b) => b.length - a.length)[0];
      if (!folder) return error(grants.length
        ? `${given} is not inside a connected folder. To enable deletes in a connected folder, pass the path of a file inside one of: ${grants.join(", ")}. ${outputsLine}`
        : `${given} is not inside a connected folder, and no folder is connected to this task, so there is nothing to enable deletes for. ${outputsLine}`);
      const carved = await protectedSubpathRefusal(meta, expanded, options);
      if (carved) return error(carved.message);
      const name = nodePath.basename(folder) || folder;
      const done = text(`File deletion is now enabled for the "${name}" folder.`);
      if ((Array.isArray(data.deleteFolders) ? data.deleteFolders : []).includes(folder)) return done;
      const detail = `${say(cowork, CARDS.deleteReason, { file: expanded })}\n\n${say(cowork, CARDS.deleteWarning)}`;
      if (!(await approved(ctx, { kind: "other", tool: "allow_cowork_file_delete", title: say(cowork, CARDS.deleteTitle, { folderName: name }), detail, cwd: folder }))) return rejected("allow_cowork_file_delete", { file_path: expanded });
      // For the rest of the task: kept with the session (a new task starts without it).
      cowork.update((current) => {
        const now = coreCoworkMetadata(current);
        if (!now) return current;
        return { ...current, cowork: { ...now, deleteFolders: [...new Set([...(Array.isArray(now.deleteFolders) ? now.deleteFolders : []), folder])] } };
      });
      return done;
    },
  },
  {
    name: "present_files",
    title: "Present files",
    description: DESCRIPTIONS.present_files,
    // A core with its own file cards (capabilities.nativeTools SendUserFile: the DeepSeek core's `present`) keeps those.
    native: "SendUserFile",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          minItems: 1,
          items: { type: "object", properties: { file_path: { type: "string", description: "Path to the file; a relative path resolves against your outputs folder" } }, required: ["file_path"], additionalProperties: false },
          description: "Files to present to the user",
        },
      },
      required: ["files"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cowork = service(ctx);
      const { meta } = coworkOf(cowork);
      const outputs = outputsDir(meta, cowork.userData);
      const list = (Array.isArray(args.files) ? args.files : []).map((entry) => typeof entry === "string" ? entry : entry?.file_path).filter((entry) => typeof entry === "string" && entry);
      if (!list.length) return error("files must name at least one file.");
      const missing = [], notFile = [], outside = [], fine = [], paths = [];
      for (const file of list) {
        const judged = await presentable(file, meta, { userData: cowork.userData });
        if (judged.ok) { fine.push(file); if (!paths.includes(judged.path)) paths.push(judged.path); }
        else (judged.kind === "missing" ? missing : judged.kind === "not_file" ? notFile : outside).push(file);
      }
      if (missing.length + notFile.length + outside.length) return error(presentRefusal({ missing, notFile, outside, fine }, outputs));
      cowork.presented?.(paths);
      return { content: paths.map((file) => ({ type: "text", text: file })), structuredContent: { deliverables: paths.map((file) => ({ path: file, title: nodePath.basename(file) })) } };
    },
  },
  {
    name: "launch_code_session",
    title: "Open Claude Code",
    description: DESCRIPTIONS.launch_code_session,
    // h5i also has launched_session ("Do not set this — it's populated by the UI after the user launches."): here the
    // app launches the session inside the call, so nothing is populated later.
    inputSchema: {
      type: "object",
      properties: {
        spec: { type: "string", description: "A self-contained task spec for the code session's first message. Include: what to build/fix, any relevant context from this conversation, and acceptance criteria. Written as if you're briefing yourself — the code session won't see this chat." },
        suggested_cwd: { type: "string", description: "Optional: a directory path if you've already discovered where the code lives (e.g. via request_cowork_directory). POSIX (~/... or absolute). Shown as a hint in the folder picker." },
      },
      required: ["spec"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => {
      const cowork = service(ctx);
      coworkOf(cowork);
      const spec = typeof args.spec === "string" ? args.spec.trim() : "";
      if (!spec) return error("spec is required.");
      const hint = typeof args.suggested_cwd === "string" && args.suggested_cwd.trim() ? expand(args.suggested_cwd.trim()) : null;
      // The user reviews the spec, then picks where it runs (the official launch card's "Set up…").
      if (!(await approved(ctx, { kind: "other", tool: "launch_code_session", title: say(cowork, CARDS.launchTitle), detail: spec }))) return rejected("launch_code_session", { spec });
      const cwd = await cowork.pickFolder({ title: say(cowork, CARDS.launchPicker), ...(hint && nodePath.isAbsolute(hint) ? { defaultPath: hint } : {}) });
      if (ctx.signal?.aborted) throw new Error("The turn was stopped.");
      if (!cwd) return error(TEXT.launchDismissed);
      cowork.approveRoot?.(cwd);
      const launched = await launchCodeSession({ rpc: cowork.rpc, spec, cwd, defaults: cowork.codeDefaults?.() ?? {} });
      return text(JSON.stringify({ spec, launched: { session_id: launched.threadId, target: "ccd", display_path: tildePath(launched.cwd) } }));
    },
  },
];
