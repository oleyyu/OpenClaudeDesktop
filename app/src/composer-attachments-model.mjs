import { t, tn } from "../electron/i18n/index.mjs";
import { coreCapabilities, coreForEngine } from "../electron/core-registry.mjs";
import { withoutSystemReminders, workflowNotificationSummary } from "../electron/prefs/workflow-keyword.mjs";

// Composer attachment staging (2.2553.1 c099c328d :1520-1625 image lane and
// :2947-2975 image/file pills), reduced to what the local Codex backend can
// carry: an image becomes {type:"localImage",path}, any other file becomes a
// {type:"mention",name,path} reference, plus an attachment note the model can
// read on a core that drops file mentions (attachmentInputs). Nothing here
// touches the DOM or the file system; the caller supplies name/size/type/path facts.
export const IMAGE_TYPES = Object.freeze(["image/png", "image/jpeg", "image/gif", "image/webp"]);
export const IMAGE_MAX_BYTES = 31457280;
export const IMAGE_CAP = 5;
export const IMAGE_TYPE_ERROR = t("Only PNG, JPEG, GIF, and WebP images are supported.");
export const IMAGE_SIZE_ERROR = t("Some images were too large to attach. Maximum size is 30 MB.");
export const IMAGE_PROCESS_ERROR = t("Failed to process image. You can try again.");
// Local addition for a catalog model without image input (the DeepSeek core
// rejects such a turn); Codex catalogs either list "image" or say nothing.
export const IMAGE_MODEL_ERROR = t("The selected model doesn’t support image input.");
// Image input turned off for the model in Settings › Models (prefs/model-settings.mjs images:false → model.imagesOff).
export const IMAGE_OFF_ERROR = t("Image input is off for this model. Turn it on in Settings › Models.");
/** The notice for an image the chosen model refuses: the user's own switch, else the catalog's text-only model. */
export const imageRefusedNotice = (model) => (model?.imagesOff === true ? IMAGE_OFF_ERROR : IMAGE_MODEL_ERROR);
// A core that hands images to a vision model itself when the chosen model has none (capabilities.imageFallback 'path':
// MiMo's read tool and its vision sub-agent): the image goes as a file reference instead of being refused.
export const IMAGE_FALLBACK_NOTE = t("This model can’t see images. DeepSeek will ask a vision model to look at them.");
const EXTENSION_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

// c099c328d-CbkcmYSW.js:1565-1577 notifyMaxImages: an add or paste past the image budget says so (addError with the
// nl = 8e3 timeout, MAX_IMAGES_TIMEOUT); trimMessage is only for staged images trimmed when the session's cap shrinks.
export const MAX_IMAGES_TIMEOUT = 8000;
export function maxImagesMessage(max) {
  return t("Maximum of {max} images allowed.", { max });
}

/** Whether a staging notice is the max-images one (it auto-dismisses after MAX_IMAGES_TIMEOUT). */
export function isMaxImagesNotice(notice, max = IMAGE_CAP) {
  return notice === maxImagesMessage(max);
}

export function trimMessage(removed, max) {
  return tn(removed, "Removed {count} image — this session allows up to {max}.", "Removed {count} images — this session allows up to {max}.", { max });
}

export function basename(path = "") {
  return String(path).split(/[\\/]/).filter(Boolean).pop() || String(path);
}

export function extensionOf(name = "") {
  const at = String(name).lastIndexOf(".");
  return at > 0 ? String(name).slice(at + 1).toLowerCase() : "";
}

// MIME by declared type first, then by extension. Anything else is "" (a file).
export function imageMime(file) {
  const type = typeof file?.type === "string" ? file.type.toLowerCase() : "";
  if (IMAGE_TYPES.includes(type)) return type;
  return EXTENSION_TYPES[extensionOf(file?.name || file?.path)] || "";
}

export function isImageFile(file) {
  if(file?.isDirectory)return false;
  return imageMime(file) !== "";
}

// Codex Model.inputModalities: images are refused only when the catalog lists
// modalities without "image"; an absent list (fixtures, older servers) allows them.
export function modelAcceptsImages(model) {
  const modalities = model?.inputModalities;
  return !Array.isArray(modalities) || modalities.includes("image");
}

function nextId(make, index) {
  return typeof make === "function" ? make(index) : `attachment-${Date.now().toString(36)}-${index}`;
}

// Stage a batch of files. Options:
//   imagesOnly — the paste/drop image lane (official q): non-images are rejected
//                with the type toast instead of becoming file entries.
//   maxImages  — official min(maxImages ?? 5, lane cap); 5 here.
//   imagesAllowed — false when the chosen model takes no image input
//                (modelAcceptsImages): images are refused with imageNotice (IMAGE_MODEL_ERROR, or IMAGE_OFF_ERROR
//                when the user turned image input off: imageRefusedNotice).
//   makeId     — injectable id factory for deterministic tests.
// Returns the next entries, the added entries and the toast notices in the
// official order: type, size, then the cap trim (the model notice first).
// imageFallback — the model takes no images but the core reads them as files (IMAGE_FALLBACK_NOTE in infos): images
//                are staged as before and marked asFile, so attachmentInputs sends them as file mentions.
export function stageFiles(entries, files, { imagesOnly = false, imagesAllowed = true, imageFallback = false, imageNotice = IMAGE_MODEL_ERROR, maxImages = IMAGE_CAP, makeId } = {}) {
  const notices = [], infos = [];
  const asFile = !imagesAllowed && imageFallback;
  if (asFile) imagesAllowed = true;
  const added = [];
  const list = Array.isArray(files) ? files : [];
  const images = [], others = [];
  for (const file of list) (isImageFile(file) ? images : others).push(file);
  if (!imagesAllowed && images.length > 0) { notices.push(imageNotice); images.length = 0; }
  else if (imagesOnly && list.length > 0 && images.length === 0) notices.push(IMAGE_TYPE_ERROR);
  let tooLarge = false;
  const accepted = [];
  for (const file of images) {
    if (Number.isFinite(file.size) && file.size > IMAGE_MAX_BYTES) { tooLarge = true; continue; }
    accepted.push(file);
  }
  if (tooLarge) notices.push(IMAGE_SIZE_ERROR);
  const cap = Math.max(0, Math.min(maxImages ?? IMAGE_CAP, IMAGE_CAP));
  const imageCount = entries.filter((entry) => entry.kind === "image").length;
  const room = cap - imageCount;
  const kept = accepted.slice(0, Math.max(0, room));
  if (accepted.length > Math.max(0, room)) notices.push(maxImagesMessage(cap));
  let next = entries.slice();
  const known = new Set(next.map((entry) => entry.path).filter(Boolean));
  let index = 0;
  const push = (file, kind) => {
    if (file.path && known.has(file.path)) return;
    const entry = {
      id: nextId(makeId, index++),
      kind,
      ...(file.isDirectory?{isDirectory:true}:{}),
      name: file.name || basename(file.path),
      path: file.path || "",
      size: Number.isFinite(file.size) ? file.size : null,
      mime: kind === "image" ? imageMime(file) : (file.type || ""),
      // Official entries start "loading" until the image is processed; a file
      // reference with a real path is ready immediately.
      status: kind === "image" ? "loading" : "ready",
      previewUrl: file.previewUrl || "",
      ...(kind === "image" && asFile ? { asFile: true } : {}),
    };
    if (file.path) known.add(file.path);
    next.push(entry);
    added.push(entry);
  };
  for (const file of kept) push(file, "image");
  if (!imagesOnly) for (const file of others) push(file, "file");
  if (asFile && kept.length) infos.push(IMAGE_FALLBACK_NOTE);
  return { entries: next, added, notices, infos };
}

export function markReady(entries, id, patch = {}) {
  return entries.map((entry) => (entry.id === id ? { ...entry, ...patch, status: "ready" } : entry));
}

// Official failure path (:1590-1615): the entry is removed and the caller
// shows IMAGE_PROCESS_ERROR. Returns the entries unchanged when unknown.
export function markFailed(entries, id) {
  const exists = entries.some((entry) => entry.id === id);
  return { entries: exists ? entries.filter((entry) => entry.id !== id) : entries, notice: exists ? IMAGE_PROCESS_ERROR : null };
}

// Context snippets (c099c328d-CbkcmYSW.js:2252 addSnippet, :3364-3385 the Quote pill; cc43287c9 attachAsContext(text,
// label, terminalTabId, key)): a pane's 'Add to prompt' or the terminal's selection rides along as a removable pill, not
// as draft text. Il (:2855): the label is the first non-blank line, 40 characters at most (39 and an ellipsis).
export const SNIPPET_LABEL_MAX = 40;
export function snippetLabel(text) {
  const value = String(text ?? "");
  const line = (value.split("\n").find((entry) => entry.trim()) ?? value).trim();
  return line.length > SNIPPET_LABEL_MAX ? `${line.slice(0, SNIPPET_LABEL_MAX - 1)}\u2026` : line;
}
let snippetSeq = 0;
/** A snippet entry; null for empty text. `key` names its source so a second add from it replaces the first. */
export function makeSnippet(text, { label, key, terminalTabId, id, sourceFile } = {}) {
  const body = String(text ?? "").replace(/\s+$/, "").replace(/^\n+/, "");
  if (!body.trim()) return null;
  return { id: id ?? `snippet-${Date.now().toString(36)}-${snippetSeq++}`, kind: "snippet", status: "ready", text: body,
    label: typeof label === "string" && label.trim() ? label.trim() : snippetLabel(body),
    ...(typeof sourceFile === "string" && sourceFile ? { sourceFile } : {}),
    ...(key ? { key } : {}), ...(terminalTabId ? { terminalTabId } : {}) };
}
export function addSnippet(entries, snippet) {
  const list = Array.isArray(entries) ? entries : [];
  if (!snippet) return list;
  const at = snippet.key ? list.findIndex((entry) => entry.kind === "snippet" && entry.key === snippet.key) : -1;
  return at >= 0 ? list.map((entry, index) => (index === at ? { ...snippet, id: entry.id } : entry)) : [...list, snippet];
}
/** removeSnippetByKey: the source context went away (detachContext). */
export function removeSnippetByKey(entries, key) {
  return (Array.isArray(entries) ? entries : []).filter((entry) => !(entry.kind === "snippet" && entry.key === key));
}
// be (c4d199b75): the snippets go first, each a Markdown quote, blank-line separated, then the message. The local
// transcript shows user text as typed, so the quote goes without Claude's '<!-- attach: label -->' marker line.
export function snippetText(entries) {
  const quotes = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.kind === "snippet" && typeof entry.text === "string" && entry.text.trim())
    .map((entry) => (entry.sourceFile ? `${entry.sourceFile}\n\n${entry.text}` : entry.text).split("\n").map((line) => (line.length ? `> ${line}` : ">")).join("\n"));
  return quotes.length ? `${quotes.join("\n\n")}\n\n` : "";
}

export function removeAttachment(entries, id) {
  return entries.filter((entry) => entry.id !== id);
}

// Skill chip → protocol input. The Add › Skills row and the '/' list insert the editor's skill chip
// (scroll-shared-10-current.js:8667-8722 wv/Ev; shared-14 :18578-18600 renders it as '/name'), so a
// draft whose leading token is the chosen skill becomes the {type:"skill",name,path} item the bridge
// maps to Harness's '/name' gesture (Codex injects the skill from it). The token and its one separator
// leave the message text; nothing else changes.
export function skillChipInput(text, skill) {
  if (!skill || typeof skill.name !== "string" || !skill.name || typeof skill.path !== "string" || !skill.path) return null;
  const value = String(text ?? "").replace(/^\s+/, ""), token = `/${skill.name}`;
  if (!value.startsWith(token)) return null;
  const rest = value.slice(token.length);
  if (rest && !/^\s/.test(rest)) return null;
  return { text: rest.replace(/^[ \u00a0]/, ""), item: { type: "skill", name: skill.name, path: skill.path } };
}

export function attachmentsReady(entries) {
  return entries.every((entry) => entry.status === "ready" && !!entry.path);
}

// A file mention reaches the model only where the core translates it: the
// builtin and bridge adapters map {type:"mention",path} to their agent's file
// input (DeepSeek "[Referenced: P]", ZCode file attachment, OpenCode file part,
// ACP resource / resource_link). A core speaking the protocol natively follows
// Codex, where Mention.path names an app:// or plugin:// target and adds no
// model content (protocol/src/models.rs UserInput::Mention => Vec::new()), so a
// file path there must travel as text. A reported or implied `fileMentions`
// capability wins over the descriptor's kind; an unknown engine gets the note.
export function coreTakesFileMentions(core) {
  const reported = coreCapabilities(core).fileMentions;
  if (typeof reported === "boolean") return reported;
  const engine = typeof core === "string" ? core : core?.engine;
  const kind = coreForEngine(engine)?.kind;
  return kind === "builtin" || kind === "bridge";
}

// The attachment note: one "[Attached file: /abs/path]" line per file, opened by
// a blank line so it stays its own paragraph when Codex joins a message's text
// items into one history string (UserMessageItem::message joins with ""). It is
// model-facing protocol text, never translated, and splitAttachmentNote reads it back.
const NOTE_OPEN = "[Attached file: ";
const NOTE_LINE = /^\[Attached file: ([^\n]+)\]$/u;
const NOTE_BLOCK = /(?:^|\n\n)(\[Attached file: [^\n]+\](?:\n\[Attached file: [^\n]+\])*)$/u;

export function attachmentNote(paths = []) {
  const lines = paths.filter((path) => typeof path === "string" && path && !/[\r\n]/.test(path)).map((path) => `${NOTE_OPEN}${path}]`);
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

// The text without a trailing attachment note, and the note's paths in order.
export function splitAttachmentNote(text) {
  const value = typeof text === "string" ? text : "";
  const match = NOTE_BLOCK.exec(value);
  if (!match) return { text: value, paths: [] };
  const paths = match[1].split("\n").map((line) => NOTE_LINE.exec(line)?.[1]).filter(Boolean);
  return { text: value.slice(0, match.index), paths };
}

// A userMessage's content as the transcript shows it: the attachment note
// leaves the text (a part left empty is dropped) and each noted file not
// already sent as a mention becomes a {type:"mention"} part, so the file card
// renders from the live echo (note item + mention) and from Codex history,
// which keeps only the joined text.
export function userMessageContent(content = []) {
  const parts = Array.isArray(content) ? content : [];
  const mentioned = new Set(parts.filter((part) => part?.type === "mention" && part.path).map((part) => part.path));
  const shown = [], noted = [];
  for (const part of parts) {
    if (part?.type !== "text" || typeof part.text !== "string") { shown.push(part); continue; }
    const split = splitAttachmentNote(part.text);
    if (!split.paths.length) { shown.push(part); continue; }
    noted.push(...split.paths);
    // The note's byte ranges are past the kept text, so the span list stays valid.
    if (split.text) shown.push({ ...part, text: split.text });
  }
  for (const path of noted) {
    if (mentioned.has(path)) continue;
    mentioned.add(path);
    shown.push({ type: "mention", name: basename(path), path });
  }
  return shown;
}

const hasNote = (content) => Array.isArray(content) && content.some((part) => part?.type === "text" && typeof part.text === "string" && splitAttachmentNote(part.text).paths.length > 0);

// A turn's hidden workflow reminders (<system-reminder> text the app adds for the model: the "ultracode" keyword,
// ultracode mode) and a finished workflow's notification turn (electron/prefs/workflow-keyword.mjs) are not the
// user's words: the reminders are dropped from what the app shows, and a notification turn becomes a system notice
// (item.workflowNotification {status, summary}) with no user text.
const hasReminder = (content) => Array.isArray(content) && content.some((part) => part?.type === "text" && typeof part.text === "string" && part.text.includes("<system-reminder>"));
// A prompt OpenClaude Desktop's scheduler fired (electron/schedule-service.cjs firedText) carries this note: the bubble gets
// Claude's 'Scheduled prompt · {time}' row (codeDesktop.origin, as the MiMo bridge marks its own cron fires).
const SCHEDULED_NOTE = /<system-reminder>\nThis prompt was scheduled with CronCreate \(job ([0-9a-f]{1,32})[^)\n]*\) and fired at (\S+)\. It is not a new message from the user\.\n<\/system-reminder>/;
export function scheduledOrigin(content) {
  for (const part of Array.isArray(content) ? content : []) {
    const match = part?.type === "text" && typeof part.text === "string" ? SCHEDULED_NOTE.exec(part.text) : null;
    if (!match) continue;
    const firedAt = Date.parse(match[2]);
    return { kind: "cron", jobId: match[1], ...(Number.isFinite(firedAt) ? { firedAt } : {}) };
  }
  return null;
}
function withoutReminders(item) {
  const notice = item.content.map((part) => part?.type === "text" ? workflowNotificationSummary(part.text) : null).find(Boolean);
  if (notice) return { ...item, content: [], workflowNotification: notice };
  const origin = item.codeDesktop?.origin ? null : scheduledOrigin(item.content);
  const content = item.content.map((part) => part?.type === "text" && typeof part.text === "string" && part.text.includes("<system-reminder>") ? { ...part, text: withoutSystemReminders(part.text) } : part)
    .filter((part) => !(part?.type === "text" && part.text === ""));
  return { ...item, content, ...(origin ? { codeDesktop: { ...(item.codeDesktop ?? {}), origin } } : {}) };
}
// A userMessage item as the app shows and reuses it (transcript, ArrowUp recall, Copy message, rewind and export):
// its content through userMessageContent, without hidden reminders. Other items are returned as they are.
export function shownUserItem(item) {
  if (item?.type !== "userMessage") return item;
  const visible = hasReminder(item.content) ? withoutReminders(item) : item;
  return hasNote(visible.content) ? { ...visible, content: userMessageContent(visible.content) } : visible;
}
export function shownUserItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  return list.some((item) => item?.type === "userMessage" && (hasNote(item.content) || hasReminder(item.content))) ? list.map(shownUserItem) : list;
}
// Turns (thread/read, history pages) with their user messages shown the same way.
export function shownTurns(turns = []) {
  return (Array.isArray(turns) ? turns : []).map((turn) => {
    const items = shownUserItems(turn?.items);
    return items === turn?.items ? turn : { ...turn, items };
  });
}
// A thread/queue/list answer whose entries' input reads as the user wrote it: 'Edit in composer' then restores the
// text without the note (the next send adds a fresh one for the files it stages again) and the preview shows the files.
export function shownQueueList(response) {
  const shown = (entries) => entries.map((entry) => (entry && hasNote(entry.input) ? { ...entry, input: userMessageContent(entry.input) } : entry));
  if (Array.isArray(response?.data)) return { ...response, data: shown(response.data) };
  if (Array.isArray(response?.entries)) return { ...response, entries: shown(response.entries) };
  return response;
}

// Thread.preview without the attachment note. Codex builds it from the first user message's text items joined into
// one string (app-server preview_from_rollout_items), so on a core that gets the note the sidebar, title bar and
// rename field would read "[Attached file: /abs/path]". A preview cut inside the note loses the partial line too; a
// message that was only files reads as their names.
const PARTIAL_NOTE = /\n\n\[Attached file: [^\n]*$/u;
export function shownPreview(preview) {
  if (typeof preview !== "string" || !preview.includes(NOTE_OPEN)) return preview;
  const split = splitAttachmentNote(preview);
  const text = (split.paths.length ? split.text : preview.replace(PARTIAL_NOTE, "")).trim();
  return text || split.paths.map(basename).join(", ");
}
export function shownThread(thread) {
  if (!thread || typeof thread.preview !== "string") return thread;
  const preview = shownPreview(thread.preview);
  return preview === thread.preview ? thread : { ...thread, preview };
}

// The name a session started from the composer gets (thread/name/set): the draft's first characters, else, for a
// message that is only attachments, the files' names (a core refuses an empty name: Codex "thread name must not be
// empty"). "" only when there is nothing to name it by.
export function firstMessageName(text, entries = [], { max = 64, firstLine = false } = {}) {
  const typed = String(text ?? "");
  const name = (firstLine ? typed.split("\n")[0] : typed).slice(0, max);
  if (name.trim()) return name;
  return (Array.isArray(entries) ? entries : []).map((entry) => entry?.name || basename(entry?.path || "")).filter(Boolean).join(", ").slice(0, max);
}

// turn/start | turn/steer | thread/queue/add input items for the staged files.
// Images are localImage parts; other files are mention references, which keep
// the file card in the live transcript. fileMentions (coreTakesFileMentions) is
// false for a core that drops a file mention: the files' paths then also go as
// an attachment-note text item, ahead of the parts, so the model sees them.
export function attachmentInputs(entries, { fileMentions = true } = {}) {
  const ready = entries.filter((entry) => entry.kind !== "elementContext" && entry.status === "ready" && entry.path);
  // An image for a model without vision on a core that reads it itself (asFile): a file mention, which the core
  // routes to its vision model.
  const parts = ready.map((entry) => (entry.kind === "image" && !entry.asFile
    ? { type: "localImage", path: entry.path }
    : { type: "mention", name: entry.name || basename(entry.path), path: entry.path }));
  const note = fileMentions ? "" : attachmentNote(ready.filter((entry) => entry.kind !== "image").map((entry) => entry.path));
  return note ? [{ type: "text", text: note, text_elements: [] }, ...parts] : parts;
}

export function attachmentLabel(entry) {
  return entry.kind === "image" ? entry.name : (entry.relativePath || entry.name);
}

// Pill click routing (c099c328d :3542-3590: Kl image pill → Ue, ql file pill → Gl). A ready
// image opens the image viewer on its preview; nothing happens while it is still loading. A
// file with a real path opens in the Files pane, the desktop's file viewer (the source's
// FilePreviewModal / new tab have no local counterpart); a directory is revealed instead.
export function attachmentOpenAction(entry) {
  if (!entry || entry.status === "loading") return null;
  if (entry.kind === "image") return entry.previewUrl ? "view" : null;
  if (!entry.path) return null;
  return entry.isDirectory ? "reveal" : "file";
}

// The open image viewer ({id, origin, …}) as it should show now: on its entry's current preview and
// name while that entry is still attached and viewable, otherwise null (the entry was removed, sent,
// swapped out with its draft or emptied), so the viewer never outlives or reopens on a stale entry.
export function attachmentViewerState(viewer, entries = []) {
  if (!viewer) return null;
  const entry = entries.find((candidate) => candidate.id === viewer.id);
  return entry && attachmentOpenAction(entry) === "view" ? { ...viewer, src: entry.previewUrl, alt: entry.name } : null;
}

// ── Folder intake (B01) ─────────────────────────────────────────────────────────────────────────────────────
// shared-50 kk (exported to cc43287c9 as Go): a paste/drop DataTransfer split into folder Files (an item whose
// webkitGetAsEntry() reports isDirectory) and plain Files; without an item list every File counts as a file.
export function splitClipboardFolders(items, files) {
  const folders = [], plain = [];
  if (!items) return { folders, files: Array.from(files ?? []) };
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item?.kind !== "file") continue;
    const file = item.getAsFile?.();
    if (!file) continue;
    (item.webkitGetAsEntry?.()?.isDirectory ? folders : plain).push(file);
  }
  return { folders, files: plain };
}

// cc43287c9 cB: a folder is "outside" the working folder unless it is that folder or below it (separators
// normalized, trailing slashes dropped). No working folder → nothing is outside.
export function isOutsideFolder(folder, root) {
  if (!root) return false;
  const normal = (value) => String(value).replace(/\\/g, "/").replace(/\/+$/, "");
  const child = normal(folder), parent = normal(root);
  return child !== parent && !child.startsWith(parent + "/");
}

// cc43287c9 Hm (:39615-39660), the one route every added folder takes (Add › Add folder, a pasted or dropped
// folder): with no session yet, a folder outside the working folder joins the draft's extra folders (Zd → nu);
// otherwise it becomes a folder chip, and in a session a chip outside the working folder is also granted to the
// session (addDirectories; on refusal its chip leaves again).
export function planFolderIntake(paths, { workdir = "", sessionOpen = false } = {}) {
  const chips = [], grant = [], draftFolders = [];
  for (const folder of Array.isArray(paths) ? paths : []) {
    if (typeof folder !== "string" || !folder) continue;
    const outside = isOutsideFolder(folder, workdir);
    if (!sessionOpen && outside) { if (!draftFolders.includes(folder)) draftFolders.push(folder); continue; }
    if (!chips.includes(folder)) chips.push(folder);
    if (outside && sessionOpen && !grant.includes(folder)) grant.push(folder);
  }
  return { chips, grant, draftFolders };
}

// cc43287c9 sg (:42384-42395): pasted/dropped folders. A draft with no working folder takes the first one as its
// working folder (Id); anything else goes through planFolderIntake (Hm).
export function planFolderPaste(paths, { draft = false, workdir = "", sessionOpen = false } = {}) {
  const list = (Array.isArray(paths) ? paths : []).filter((folder) => typeof folder === "string" && folder);
  if (!list.length) return null;
  if (draft && !workdir) return { workingFolder: list[0] };
  return planFolderIntake(list, { workdir, sessionOpen });
}

// CNiYa5WL8N: the addDirectories refusal toast.
export function folderGrantError(count) {
  return tn(count, "Couldn’t add {count} folder to this session", "Couldn’t add {count} folders to this session");
}
