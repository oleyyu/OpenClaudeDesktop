// The host's engine items as the entries the 3.6556.2 CodeTranscriptRenderer reads (W14-code renderer-core, E86). The
// desktop builds them from its SDK message stream (c06cf64bb: one entry per message, `{id, author, sourceUuid, items}`,
// items of kind text / thinking / tools / bash / turn_error, the streaming entry carrying `provisionalMessageId`); the
// renderer's own warm pass (c96d752d0 L3 / n9e) is the smallest such feed. This host derives them from its engine items
// (every core projects to the Codex item shapes), so the original renderer (generated/code-transcript) draws them.
// Pure: no React (task-event-model's workflowTaskEvent reads no catalog).
//
//   userMessage                 a user entry (W14-code r2 R2T-01 / R2T-02, c06cf64bb's user items): the message as the
//                               app shows it (composer-attachments-model shownUserItem: hidden <system-reminder> text
//                               and the attachment note left out), its pasted images (`{kind: "image", data, mimeType}`),
//                               file mentions (`{kind: "file", path, fileName, isDirectory}`) and local images
//                               (`{kind: "pathImage", path, fileName}`), then its text. W14-code r4 (E95): a message
//                               with selected page elements is a user entry too — its text without the element markup,
//                               the elements' screenshots left out (c96d752d0 fF draws `elementContext` only under gate
//                               448605362, not in Uon). W14-code r5 R5T-REG-02: a recorded demonstration is one
//                               watchRecord item (c96d752d0 DI → JF). A workflow's notification turn: see workflowNotificationEvent.
//   userShell                   a user entry with one bash item (c96d752d0 `km(t.items) === "bash"`: the user's own `!`
//                               command; output once it ran).
//   agentMessage                a text item of the turn's assistant entry.
//   reasoning                   a thinking item (transcript-item-visibility reasoningText).
//   tool items                  one tools item per run of consecutive tool calls: the SDK tool objects of
//                               transcript-sdk-tools.mjs (the names the official rows dispatch on).
//   a turn's error              a turn_error item (c06cf64bb: `{kind:"turn_error", id, subtype, errors, apiErrorStatus?}`).
//   a turn's task events        (W14-code r2 R2T-11) each background task that settled during the turn (task-event-model
//                               backgroundTaskEventsByTurn) is a `{kind: "task_event", id, taskId, taskType, status,
//                               description, durationMs}` item at the end of the turn's assistant entry (c06cf64bb parses
//                               a <task-notification> into that item); R3 `case "task_event"` draws a run of them as one
//                               "code.task_events" card (J4e → fX).
//   contextCompaction           (R2T-04) once done, a `{kind: "compacted", id, preTokens, postTokens}` item of the turn's
//                               assistant entry (c06cf64bb compact_boundary → `M("assistant", [{kind: "compacted", …}])`);
//                               running, stopped or failed, nothing (the desktop inserts the marker only once done;
//                               c96d752d0 HW's divider is `state: "done"` only). W14-code r4 R4T-08g (E95): one the core
//                               reports the compacted items / summary of (the DeepSeek bridge's codeDesktop) is the same
//                               marker, the host's count / summary not shown.
//   plan                        (R2T-05 / W14-code r4 R4T-08e, E95) a Codex plan item: an ExitPlanMode call in the turn's
//                               tools (transcript-sdk-tools codexPlanTool, `input.plan`), the official "Proposed plan"
//                               row (c96d752d0 `exit_plan_mode: {rollUp: "stands-alone"}`).
//   review mode                 (R4T-03, E95) c06cf64bb has no review item: exitedReviewMode's review is a text item of
//                               the turn's reply; enteredReviewMode shows nothing.
//   local /status               (R4T-08c) a user entry "/status" and an assistant entry `{kind: "status", id}`
//                               (c06cf64bb `<session-status/>` → `[{kind: "status", id: `${t}-status`}]`; R3 → WG).
//   workflow run                (R4T-08b) with options.officialWorkflow, a Workflow call in the turn's tools (the run on
//                               its hostItem); otherwise the host's row.
//   anything else               a host row (`{author: "host", row}`): the caller draws it in place, between entries.
//
// The running state (RUNLOG 插单 10-29, "two spinners"): a tool is running only while the transcript live scope says so
// (transcript-rows-model transcriptLiveScope: the window after the last answered user row, and no model output after
// the call); a host "inProgress" call outside it reads completed, as the desktop reads a call whose result reached the
// model (c62da1b56 pt). The streaming assistant entry of the running turn carries provisionalMessageId (the renderer
// holds its live text, 2714218019 code_stream_live_text).
import { codexPlanTool, sdkToolName, sdkTools, workflowRunTool } from "./transcript-sdk-tools.mjs";
import { isHiddenTranscriptItem, reasoningText } from "./transcript-item-visibility.mjs";
import { basename, shownUserItem, userMessageContent } from "./composer-attachments-model.mjs";
import { commandText } from "./shell-command-model.mjs";
import { parseSelectedElementMessage } from "./generated/code-editor/preview-element-parser.mjs";
import { workflowTaskEvent } from "./task-event-model.mjs";
import { demonstrationOf } from "./watch-record-model.mjs";

// W14-code r8 R8T-02: Codex's sleep item is a tool call like imageGeneration (transcript-sdk-tools: no SDK counterpart, its
// host name through the original rows' generic fallback, c96d752d0 K1e / m2e), so it joins the reply's tool run instead
// of cutting it with a host row (the host's "Waited {seconds}s" step).
const TOOL_TYPES = new Set(["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "collabAgentToolCall", "webSearch", "computerUse",
  "imageGeneration", "imageView", "sleep"]);
const str = (value) => (typeof value === "string" ? value : "");

// W14-code r8 R8T-REG-02: c96d752d0 A7 offers a user entry's Rewind / Fork only when jN holds (`e.waitingLane !== "parked"
// && AN.test(e.id)`, AN the UUID shape: the desktop's entry ids are SDK message uuids). The host's user entries are its
// engine items, whose ids are not always UUIDs (Codex's resumed history, the bridged cores), so jN would drop the actions
// these turns had in the host's menu. Such an entry's id is a UUID-shaped id derived from the engine id (stable across
// renders and reloads); sourceUuid and rows keep the engine id, and the action host reads the turn back by the entry's id.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function userEntryId(engineId) {
  const id = str(engineId);
  if (!id || UUID_SHAPE.test(id)) return id;
  // Four 32-bit FNV-1a lanes over the engine id, each seeded apart, as 128 bits in the 8-4-4-4-12 shape (version 8,
  // RFC 9562's custom layout, variant 10).
  const lanes = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map((seed) => {
    let hash = seed >>> 0;
    for (let index = 0; index < id.length; index++) { hash ^= id.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0; }
    hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b) >>> 0; hash ^= hash >>> 13;
    return (hash >>> 0).toString(16).padStart(8, "0");
  });
  const hex = lanes.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const isoSeconds = (seconds) => (Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1e3).toISOString() : null);

const RENDERER_TYPES = new Set(["userMessage", "agentMessage", "reasoning", "plan", "contextCompaction", "enteredReviewMode", "exitedReviewMode", ...TOOL_TYPES]);
const BUSY = new Set(["inProgress", "running"]);
const STOPPED = new Set(["interrupted", "cancelled", "canceled", "stopped"]);
/**
 * W14-code r3 R3T-NEW-01: a workflow's <task-notification> turn as c06cf64bb parses it: `r = {kind: "task_event", id: P,
 * taskId: L.taskId, description: n?.description, taskType: L.taskType ?? n?.taskType, status: L.status, summary:
 * L.summary, durationMs: L.durationMs, …}` → `M("assistant", [r], P)`, its own assistant entry (c96d752d0 FI reads
 * `local_workflow` as "workflow"). The host's notification (task-event-model workflowTaskEvent) supplies the fields; a
 * Monitor event without a status is no item (the model reads it, the transcript shows nothing, as c06cf64bb Hl drops it).
 * The host's Monitor ends read as FI's "monitor" (monitor_mcp / monitor_ws both are). null for any other message.
 * W14-code r4 R4T-08g (E95): a ZCode run's escalation / stall / settings notice (`<kind>`, statuses question / stalled /
 * changed) is no item either: the desktop's task_event row knows only running / completed / failed / stopped (c96d752d0
 * RI and xOe), so it has no row for them; the model reads the notice and answers in its reply.
 */
export function workflowNotificationEvent(item) {
  if (item?.type !== "userMessage") return null;
  const notice = shownUserItem(item)?.workflowNotification;
  if (!notice) return null;
  if (notice.kind) return { none: true };
  const event = workflowTaskEvent(notice);
  if (!event) return { none: true };
  const id = str(item.id);
  return { kind: "task_event", id: `${id}:task-event`, taskId: str(event.taskId) || id,
    taskType: event.taskType === "monitor" ? "monitor_mcp" : event.taskType, status: event.status,
    ...(event.description ? { description: event.description } : {}), ...(str(notice.summary) ? { summary: notice.summary } : {}),
    ...(Number.isFinite(event.durationMs) ? { durationMs: event.durationMs } : {}) };
}
/**
 * Whether the renderer draws a displayed row (W14 E86): a user message, a user `!` command, an answer, a thought, a plan,
 * a compaction, review mode, a run of tool calls (a host tool group / file run whose members all are) and (W14-code r4
 * R4T-08c) the local /status row. The host's own rows — a workflow run (unless `officialWorkflow`: R4T-08b), the settled
 * turn box and engine items the renderer has no entry kind for — stay the host's, drawn in place.
 */
export function rendererDrawsRow(row, { officialWorkflow = false } = {}) {
  if (!row || typeof row !== "object" || row.settledTurnBox) return false;
  if (row.localCommand) return true;
  if (row.workflowRun) return officialWorkflow && typeof row.workflowRun === "object";
  // A scheduled prompt is the list's event row (scheduledPromptEvent), drawn in place by source-code-transcript.jsx.
  if (scheduledPromptEvent(row)) return false;
  const members = Array.isArray(row.toolGroup) && row.toolGroup.length ? row.toolGroup : [row];
  return members.every((member) => (Array.isArray(member?.fileRun) && member.fileRun.length ? member.fileRun : [member])
    .every((one) => RENDERER_TYPES.has(one?.type) && !one.workflowRun));
}

/**
 * W14-code transcript-rest TA-3: a prompt the core's scheduler fired (codeDesktop.origin cron: MiMo cron / loop) as the
 * desktop's scheduled_task_fire item (c06cf64bb: `M("user", [{kind: "event", id, eventType: "trigger", content}])`),
 * which c96d752d0 IF → PF draws as the Clock event row "Scheduled check-in" with the prompt behind it, not a bubble.
 * null for any other row.
 */
export function scheduledPromptEvent(row) {
  if (row?.type !== "userMessage") return null;
  // R2T-02: the host scheduler's own fires carry their origin in a hidden reminder (shownUserItem → codeDesktop.origin).
  if ((row.codeDesktop?.origin ?? shownUserItem(row)?.codeDesktop?.origin)?.kind !== "cron") return null;
  return { kind: "event", id: `${str(row.id)}:event`, eventType: "trigger", content: userEntryText(row) };
}

/** The text a host user message shows (its text parts, hidden reminders and the attachment note left out). */
export function userEntryText(item) {
  return userMessageContent(shownUserItem(item)?.content || []).filter((part) => part?.type === "text").map((part) => str(part.text)).join("\n").trim();
}

// A shown user message's parts: its text (joined as the host bubble joins it), the selected page elements in it
// (the official parser, generated/code-editor) and its attachments.
const DATA_IMAGE = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
function userEntryParts(shown) {
  const content = userMessageContent(shown?.content || []);
  const raw = content.filter((part) => part?.type === "text").map((part) => str(part.text)).join("\n");
  const parsed = raw.includes("<") ? parseSelectedElementMessage(raw) : { text: raw, views: [] };
  return { content, text: parsed.text.trim(), views: parsed.views };
}

/**
 * R2T-01: a user message's items as c06cf64bb builds a user entry's (its array branch: the pasted images in order, then
 * `ep(…, {liftImages: true})`'s files and path images, then the text): c96d752d0 fF draws the images and files of
 * `entry.items` as the attachments tile row (`code.user.attachments`, M6e → $C). A local image is a pathImage (the
 * session's image loader, source-code-transcript.jsx, serves it); a pasted image's data URL is an image item; a file
 * mention is a file item; an image URL that is neither is a pathImage of that URL.
 */
export function userEntryItems(item) {
  const id = str(item?.id);
  // W14-code r5 R5T-REG-02 (corrects R4T-08g): a recorded demonstration is the desktop's watchRecord user item
  // (c4d199b75 ot `case "watchRecord": return "watchRecord"`; c96d752d0 DI `ii === "watchRecord"` → JF, "Recorded
  // demonstration" / "Shared screen"), parsed as shared-52 hK parses it (watch-record-model parseDemonstration).
  const demonstration = demonstrationOf(item);
  if (demonstration) return [{ kind: "watchRecord", id: `${id}:watchRecord`, durationMs: demonstration.durationMs, steps: demonstration.steps,
    imageCount: demonstration.imageCount, blocks: demonstration.blocks, ...(demonstration.purpose ? { purpose: demonstration.purpose } : {}),
    ...(demonstration.userText ? { userText: demonstration.userText } : {}),
    ...(demonstration.leadImages?.length ? { leadImages: demonstration.leadImages } : {}) }];
  const { content, text, views } = userEntryParts(shownUserItem(item));
  const images = [], files = [], pathImages = [], skills = [];
  // W14-code r4 R4T-08a: the selected elements' screenshots (one per view that has one, ahead of the other images, as
  // the preview sends them) are the elementContext item's, which the desktop does not draw here: left out.
  let screenshots = views.filter((view) => view?.hasScreenshot).length;
  for (const part of content) {
    if (!part || typeof part !== "object" || part.type === "text") continue;
    if (screenshots > 0 && ((typeof part.type === "string" && part.type.toLowerCase().includes("image")) || part.name === "element-screenshot.png")) { screenshots--; continue; }
    // W14-code r3 R3T-REG-03: a skill chip's part (composer-attachments-model skillChipInput: `{type: "skill", name, path}`,
    // the '/name' token taken out of the text) is the message's leading slash command, as the desktop sends it (c06cf64bb
    // keeps a `<command-name>` message as one text item; cb6930dae Bs draws its leading `/name` as the command pill, Zt).
    if (part.type === "skill") { if (str(part.name)) skills.push(`/${part.name}`); continue; }
    const path = str(part.path);
    if (part.type === "mention" && path) {
      files.push({ kind: "file", id: `${id}-filem${files.length}`, path, fileName: str(part.name) || basename(path), isDirectory: /[/\\]$/.test(path) });
      continue;
    }
    if (!(typeof part.type === "string" && part.type.toLowerCase().includes("image"))) continue;
    if (path) { pathImages.push({ kind: "pathImage", id: `${id}-pimg${pathImages.length}`, path, fileName: basename(path) }); continue; }
    const url = str(part.imageUrl) || str(part.url) || str(part.image_url);
    const data = DATA_IMAGE.exec(url);
    if (data) images.push({ kind: "image", id: `${id}-img${images.length}`, data: data[2], mimeType: data[1] });
    else if (/^https?:/i.test(url)) pathImages.push({ kind: "pathImage", id: `${id}-pimg${pathImages.length}`, path: url, fileName: basename(url.split(/[?#]/)[0]) || url });
  }
  const body = [...skills, ...(text ? [text] : [])].join(" ");
  return [...images, ...files, ...pathImages, ...(body ? [{ kind: "text", id: `${id}:text`, text: body }] : [])];
}

/**
 * W14-code r2 R2T-07 / gates-r2-03: the host's own user messages that are not in the transcript yet, as the desktop's
 * entries (c06cf64bb's echo of a send and its queue):
 *   sends    pending-send-model pendingUserRow rows (`localDelivery {status, sentAt, onRetry, onDiscard}`). While turn/start
 *            is pending, a user entry with `deliveryStatus: "sending"` among the entries (the renderer's bridge makes it the
 *            turn's delivery `{state: "sending"}` — c4a9ee384 Lf's pending prompt; past the streaming entry, DI's
 *            "Sending…"). A refused one is a failed send (bat's `failedSendEntries`, after every entry: mat → DI
 *            `failedSend {sentAt, onRetry, onDiscard}`, "Not delivered · {time}" with Retry / Discard).
 *   steers   the messages steered into the running turn (turn/steer) the transcript does not show yet: a user entry
 *            waiting to be picked up, `{awaitingPickup: true, waitingLane: "steer"}` (DI's Jn / $n under hd(), E92).
 * @returns {{entries: object[], failed: {entry, sentAt, onRetry, onDiscard}[]}} `entries` go after the session's entries.
 */
export function localUserEntries(sends = [], steers = []) {
  const entries = [], failed = [];
  for (const row of Array.isArray(sends) ? sends : []) {
    if (!row || typeof row !== "object") continue;
    const items = userEntryItems(row);
    if (!items.length) continue;
    const delivery = row.localDelivery ?? {};
    const entry = { id: str(row.id), author: "user", sourceUuid: str(row.id), turnId: null, rows: [row], items, local: true };
    if (delivery.status === "failed") failed.push({ entry, sentAt: Number.isFinite(delivery.sentAt) ? delivery.sentAt : null,
      onRetry: typeof delivery.onRetry === "function" ? delivery.onRetry : undefined, onDiscard: typeof delivery.onDiscard === "function" ? delivery.onDiscard : undefined });
    else entries.push({ ...entry, deliveryStatus: "sending" });
  }
  for (const steer of Array.isArray(steers) ? steers : []) {
    if (!steer || typeof steer !== "object" || !str(steer.id)) continue;
    const row = { id: str(steer.id), type: "userMessage", content: Array.isArray(steer.input) ? steer.input : [] };
    const items = userEntryItems(row);
    if (items.length) entries.push({ id: row.id, author: "user", sourceUuid: row.id, turnId: null, rows: [row], items, local: true,
      awaitingPickup: true, waitingLane: "steer" });
  }
  return { entries, failed };
}

/**
 * W14-code r2 R2T-TM3: the sub-agents of a session's Task calls, by tool id — what c96d752d0 BOe reads besides the call:
 * the background task status (cea7057eb L through Qhe: `le = oe === "completed" ? ce : void 0, ue = oe === "running" ||
 * le === "running"`, so a Codex spawnAgent call that completed at once while its thread still works draws as running),
 * and the call's subagentActivity ({latestToolName, toolCallCount, model}: the running row's heartbeat and model).
 * `viewOf(item)` is agent-model's agentView for the call ({status, items, toolCallCount, model}).
 * @returns Map(toolId → {status, activity})
 */
export function codeSubagents(items, viewOf) {
  const out = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.type !== "collabAgentToolCall" || sdkToolName(item) !== "Task" || typeof viewOf !== "function") continue;
    const view = viewOf(item);
    if (!view || !["running", "completed", "failed", "stopped"].includes(view.status)) continue;
    const latest = (Array.isArray(view.items) ? view.items : []).map((one) => sdkToolName(one)).filter(Boolean).at(-1);
    out.set(str(item.id), { status: view.status, activity: { toolCallCount: Number.isFinite(view.toolCallCount) ? view.toolCallCount : 0,
      ...(latest ? { latestToolName: latest } : {}), ...(str(view.model) ? { model: view.model } : {}) } });
  }
  return out;
}

/** R2T-TS8: the files a finished SendUserFile call sent (agent-tools/files.mjs structuredContent.deliverables, each with
 * its byte size) as the desktop's attachment records; a file whose size is unknown is left out (c289d7154 D needs it). */
const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp|bmp|heic|avif)$/i;
export function sentFileAttachments(item) {
  const list = item?.result?.structuredContent?.deliverables;
  return (Array.isArray(list) ? list : []).filter((entry) => str(entry?.path) && Number.isFinite(entry?.size))
    .map((entry) => ({ path: entry.path, size: entry.size, isImage: IMAGE_FILE.test(entry.path) }));
}

/** R2T-11: a turn's task events (task-event-model's) as the desktop's task_event items. */
export function taskEventItems(turnId, taskEvents) {
  const list = turnId && taskEvents ? (typeof taskEvents.get === "function" ? taskEvents.get(turnId) : taskEvents[turnId]) : null;
  const out = [];
  for (const event of Array.isArray(list) ? list : []) {
    const taskId = str(event?.taskKey) || str(event?.taskId);
    if (!taskId) continue;
    out.push({ kind: "task_event", id: `${turnId}:task-event:${taskId}`, taskId, ...(str(event.taskType) ? { taskType: event.taskType } : {}),
      status: str(event.status) || "completed", ...(str(event.description) ? { description: event.description } : {}),
      ...(Number.isFinite(event.durationMs) ? { durationMs: event.durationMs } : {}) });
  }
  return out;
}

/**
 * The renderer's entries for a host transcript.
 * @param items       the session's displayed rows in transcript order (engine items; a host tool group's `toolGroup` and a
 *                    file run's `fileRun` are read as their members)
 * @param options     { view, responding, activeTurnId, liveRunningToolIds: Set, awaitingIds: Set, turnErrors: {turnId: {message}},
 *                    taskEvents: Map(turnId → [{taskKey | taskId, taskType, status, description, durationMs}]),
 *                    hostRow(row) → true for a row the host draws itself (it splits the reply there) }
 * @returns entries; a host row is `{author: "host", id, row}` (not the renderer's: the caller draws it in place). Each
 *          entry's `rows` lists the displayed rows it came from (for what the host draws after them).
 */
export function codeTranscriptEntries(items, { view = "normal", responding = false, activeTurnId = null, liveRunningToolIds = new Set(),
  awaitingIds = new Set(), turnErrors = {}, hostRow = null, promptBlocks = null, subagents = null, taskEvents = null, ownStatus = false,
  turnTimes = null, hookNotices = null, officialWorkflow = false } = {}) {
  // W14-code transcript-rest TA-2: UserPromptSubmit hook blocks (state.js promptBlocks), each the desktop's
  // `{kind: "prompt_blocked", id, reason, originalPrompt}` item at the end of its turn (c06cf64bb), or at the end.
  const blocks = Object.values(promptBlocks && typeof promptBlocks === "object" ? promptBlocks : {}).filter((block) => block && typeof block.id === "string");
  const placed = new Set();
  const notices = (Array.isArray(hookNotices) ? hookNotices : []).filter((notice) => notice && str(notice.id) && str(notice.message));
  const noticeItem = (notice) => ({ kind: "hook_notice", id: notice.id, notices: [{ id: notice.id, message: notice.message, level: notice.level === "warning" ? "warning" : "notice" }] });
  const noticesFor = (turnId) => notices.filter((notice) => notice.turnId === turnId && !placed.has(notice.id)).map((notice) => (placed.add(notice.id), noticeItem(notice)));
  const blockItem = (block) => ({ kind: "prompt_blocked", id: block.id, reason: str(block.reason),
    ...(str(block.originalPrompt) ? { originalPrompt: block.originalPrompt } : {}) });
  const entries = [];
  let assistant = null, tools = null;
  const close = () => {
    tools = null;
    if (assistant?.items.length) entries.push(assistant);
    assistant = null;
  };
  const errorFor = (turnId) => {
    const error = turnId ? turnErrors?.[turnId] : null;
    if (!error) return null;
    const message = str(error.message) || str(error);
    // W14-code r5 R5T-02 (c06cf64bb `...(Xn(r) !== void 0 && { apiErrorStatus: Xn(r) })`): the HTTP status, when known.
    return { kind: "turn_error", id: `${turnId}:turn-error`, subtype: "error_during_execution", errors: message ? [message] : [],
      ...(Number.isInteger(error.status) ? { apiErrorStatus: error.status } : {}) };
  };
  const flushed = new Set();
  const flushError = (turnId) => {
    if (flushed.has(turnId)) return;
    flushed.add(turnId);
    for (const block of blocks) if (block.turnId === turnId && !placed.has(block.id)) {
      placed.add(block.id);
      open(turnId).items.push(blockItem(block));
      tools = null;
    }
    // W14-code r3 R3T-NEW-02: the turn's hooks that blocked or failed (not a UserPromptSubmit block: prompt_blocked above),
    // each the desktop's `{kind: "hook_notice", id, notices: [{id, message, level}]}` (c06cf64bb `M("assistant",
    // [{kind: "hook_notice", …, level: o === "warning" ? "warning" : "notice"}])`; R3 → "code.hook_notice" → G3e).
    for (const notice of noticesFor(turnId)) {
      open(turnId).items.push(notice);
      tools = null;
    }
    // R2T-11: the turn's settled background tasks, each a task_event item (fields left out when unknown: sXe reads
    // `t.durationMs !== void 0` for its "took {elapsed}" and `t.description ?? t.summary`).
    for (const event of taskEventItems(turnId, taskEvents)) {
      open(turnId).items.push(event);
      tools = null;
    }
    const error = errorFor(turnId);
    if (!error) return;
    open(turnId).items.push(error);
    tools = null;
  };
  const open = (turnId, id, row) => {
    if (!assistant) assistant = { id: `${id ?? turnId}:reply`, author: "assistant", sourceUuid: `${id ?? turnId}:reply`, turnId, items: [], rows: [] };
    if (row && assistant.rows.at(-1) !== row) assistant.rows.push(row);
    return assistant;
  };
  let lastTurn = null, row = null;
  const flat = [];
  for (const shown of Array.isArray(items) ? items : []) {
    if (!shown || typeof shown !== "object") continue;
    if (hostRow?.(shown)) { flat.push({ host: shown }); continue; }
    // R4T-08c: the local /status row; R4T-08b: a workflow run with officialWorkflow (else the host's row, below).
    if (shown.localCommand) { flat.push({ status: shown }); continue; }
    if (shown.workflowRun) { flat.push(officialWorkflow && typeof shown.workflowRun === "object" ? { item: shown, row: shown, workflow: true } : { host: shown }); continue; }
    const members = Array.isArray(shown.toolGroup) && shown.toolGroup.length ? shown.toolGroup : [shown];
    for (const member of members) for (const one of Array.isArray(member?.fileRun) && member.fileRun.length ? member.fileRun : [member]) flat.push({ item: one, row: shown });
  }
  for (const { item, row: shownRow, host, status, workflow } of flat) {
    if (host) {
      close();
      entries.push({ id: str(host.id), author: "host", row: host });
      continue;
    }
    // W14-code r4 R4T-08c: /status as the desktop's local command (c06cf64bb: the "/status" user message, then
    // `M("assistant", [{kind: "status", id: `${t}-status`}], t)` for its `<session-status/>` stdout; c96d752d0 R3 →
    // "code.status" → V4e → WG, the Session info card). Its data is the card's own store (source-code-transcript-adapters).
    // No `rows`: the row is no turn of the session (no Rewind / Fork to map back), and the host draws nothing after it.
    if (status) {
      close();
      const id = str(status.id);
      entries.push({ id: `${id}:command`, author: "user", sourceUuid: `${id}:command`, turnId: null, rows: [], items: [{ kind: "text", id: `${id}:command:text`, text: "/status" }] });
      entries.push({ id, author: "assistant", sourceUuid: id, turnId: null, rows: [], items: [{ kind: "status", id: `${id}-status` }] });
      continue;
    }
    row = shownRow;
    if (lastTurn && item.turnId !== lastTurn && item.type !== "userMessage") { flushError(lastTurn); }
    if (item.type === "userMessage") {
      if (lastTurn) flushError(lastTurn);
      close();
      // R3T-NEW-01: a workflow's notification turn is its task_event item, an assistant entry of its own (M("assistant",
      // [r], P)) the turn's reply follows.
      const notified = workflowNotificationEvent(item);
      if (notified) {
        if (!notified.none) assistant = { id: `${str(item.id)}:task-event`, author: "assistant", sourceUuid: `${str(item.id)}:task-event`,
          turnId: item.turnId ?? null, items: [notified], rows: [row ?? item] };
        lastTurn = item.turnId ?? null;
        continue;
      }
      // A message left with nothing to show (only hidden reminders) draws nothing, as the host bubble did.
      const userItems = userEntryItems(item);
      if (userItems.length) entries.push({ id: userEntryId(item.id), author: "user", sourceUuid: str(item.id), turnId: item.turnId ?? null, rows: [row], items: userItems });
      lastTurn = item.turnId ?? null;
      continue;
    }
    if (item.type === "commandExecution" && item.source === "userShell") {
      close();
      const ran = !["inProgress", "running"].includes(item.status);
      entries.push({ id: userEntryId(item.id), author: "user", sourceUuid: str(item.id), turnId: item.turnId ?? null, rows: [row],
        items: [{ kind: "bash", id: str(item.id), command: commandText(item.command ?? ""),
          ...(ran ? { output: str(item.aggregatedOutput).trim() } : {}) }] });
      continue;
    }
    lastTurn = item.turnId ?? lastTurn;
    if (isHiddenTranscriptItem(item, view)) continue;
    if (item.type === "agentMessage") {
      tools = null;
      open(item.turnId, item.id, row).items.push({ kind: "text", id: str(item.id), text: str(item.text) });
      continue;
    }
    // W14-code r4 R4T-03 (E95): review mode has no desktop item; the review is the turn's reply prose.
    if (item.type === "enteredReviewMode") continue;
    if (item.type === "exitedReviewMode") {
      tools = null;
      if (str(item.review).trim()) open(item.turnId, item.id, row).items.push({ kind: "text", id: str(item.id), text: str(item.review) });
      continue;
    }
    // R2T-04: a finished compaction is the turn's compacted marker (c96d752d0 y0 → VE: TurnStatus "Compacted session …").
    // R4T-08g: a failed one has no desktop marker (HW is "done" only; the turn's error says it), a counted one is the same.
    if (item.type === "contextCompaction") {
      if (BUSY.has(item.status) || STOPPED.has(item.status) || item.status === "failed") continue;
      tools = null;
      open(item.turnId, item.id, row).items.push({ kind: "compacted", id: str(item.id),
        ...(Number.isFinite(item.preTokens) ? { preTokens: item.preTokens } : {}), ...(Number.isFinite(item.postTokens) ? { postTokens: item.postTokens } : {}) });
      continue;
    }
    if (item.type === "reasoning") {
      tools = null;
      open(item.turnId, item.id, row).items.push({ kind: "thinking", id: str(item.id), text: reasoningText(item) });
      continue;
    }
    // R2T-05 / W14-code r4 R4T-08e: a Codex plan is an ExitPlanMode call (the "Proposed plan" row, stands-alone);
    // R4T-08b: a workflow run (officialWorkflow) is its Workflow call.
    if (TOOL_TYPES.has(item.type) || item.type === "plan" || workflow) {
      const calls = workflow ? workflowRunTool(item, { awaiting: awaitingIds.has(item.id) }) : item.type === "plan" ? codexPlanTool(item)
        : sdkTools(item, { awaiting: awaitingIds.has(item.id) });
      if (!calls) continue;
      for (const call of calls) {
        const { hostItem, ...tool } = call;
        // W14-code r3 R3T-REG-01: the engine item stays on the call, not enumerable (the renderer's entry sharing compares
        // and copies the SDK fields only): the host's cards (renderCard: answered questions, findings, MCP Apps) read it.
        if (hostItem) Object.defineProperty(tool, "hostItem", { value: hostItem, enumerable: false, configurable: true, writable: true });
        // A host call the live scope does not hold is not running (its result reached the model, or the turn ended).
        // W14-code r3 R3T-REG-05: not for a session the window does not own (a sub-agent's thread, cccc2cf0a PP: only the
        // streaming prose is off, `isStreaming: !1`; the tool states are the entry's own).
        if (tool.status === "running" && !ownStatus && !(responding && liveRunningToolIds.has(str(item.id)))) tool.status = "completed";
        // R2T-TM3: a Task call's sub-agent activity (BOe's heartbeat while its background task runs).
        // R2T-TS7: an MCP result's _meta as the desktop's `resultMcpMeta` (c52b02f3f Mt reads
        // `resultMcpMeta._meta.ccdSessionRenamed`: set_session_title's rename card, cb6930dae bc). Code renderer only.
        if (hostItem && typeof hostItem.result === "object" && hostItem.result && !Array.isArray(hostItem.result)
          && hostItem.result._meta && typeof hostItem.result._meta === "object" && !Array.isArray(hostItem.result._meta)) tool.resultMcpMeta = { _meta: hostItem.result._meta };
        // R2T-TS8: a SendUserFile call's files as the desktop's attachment records (`toolUseResult.attachments`, c289d7154
        // u / D: {path, size, isImage}), which c96d752d0 W1 → cb6930dae Xu draws as the sent files' block. Code renderer only.
        if (tool.name === "SendUserFile" && tool.status === "completed" && !tool.toolUseResult) {
          const attachments = sentFileAttachments(hostItem);
          if (attachments.length) tool.toolUseResult = { attachments };
        }
        const subagent = subagents?.get?.(tool.id);
        if (subagent?.activity && (tool.name === "Task" || tool.name === "Agent")) tool.subagentActivity = subagent.activity;
        if (!tools) {
          tools = { kind: "tools", id: tool.id, tools: [] };
          open(item.turnId, item.id, row).items.push(tools);
        } else open(item.turnId, item.id, row);
        tools.tools.push(tool);
      }
      continue;
    }
    // Any other engine item (one the renderer has no entry kind for) is the host's own row, in place.
    close();
    entries.push({ id: str(item.id), author: "host", row: row ?? item });
  }
  if (lastTurn) flushError(lastTurn);
  close();
  // A block whose turn shows no rows (the prompt never reached the core): its own entry at the end.
  for (const block of blocks) if (!placed.has(block.id)) {
    placed.add(block.id);
    entries.push({ id: `${block.id}:entry`, author: "assistant", sourceUuid: `${block.id}:entry`, turnId: block.turnId ?? null, items: [blockItem(block)], rows: [] });
  }
  // R3T-NEW-02 / W14-code r4 R4T-REG-01: a hook notice whose turn shows no rows goes where it arrived (c06cf64bb
  // `M("assistant", [{kind: "hook_notice", …}], g)`, which joins the last entry when that one is the assistant's): one
  // from before any turn (state.js keeps its turnId null: SessionStart) ahead of the first entry, any other at the end.
  const leading = [];
  for (const notice of notices) if (!placed.has(notice.id)) {
    placed.add(notice.id);
    const last = notice.turnId ? entries.at(-1) : leading.at(-1);
    if (last?.author === "assistant") { last.items.push(noticeItem(notice)); continue; }
    const entry = { id: `${notice.id}:entry`, author: "assistant", sourceUuid: `${notice.id}:entry`, turnId: notice.turnId ?? null, items: [noticeItem(notice)], rows: [] };
    (notice.turnId ? entries : leading).push(entry);
  }
  if (leading.length) entries.unshift(...leading);
  // W14-code r3 R3T-REG-04: the turn times as the entries' timestamps (c06cf64bb `T && !o && (s.timestamp = T)`, an ISO
  // string): a turn's user entry carries its start (DI's row time, `f(MA, {timestamp: t.timestamp, rowTime: !0})`), its
  // last assistant entry its end once the turn is over (the bridge's `endedAt: n.timestamp`, u6e's MessageActions
  // timestamp `t.endedAt ?? n.turnTailMeta?.timestamp`). `turnTimes`: {turnId: {startedAt, completedAt}} in seconds.
  if (turnTimes && typeof turnTimes === "object") {
    const lastReply = new Map();
    entries.forEach((entry, index) => { if (entry.author === "assistant" && entry.turnId) lastReply.set(entry.turnId, index); });
    entries.forEach((entry, index) => {
      const times = entry.turnId ? turnTimes[entry.turnId] : null;
      if (!times) return;
      const at = entry.author === "user" ? isoSeconds(times.startedAt)
        : entry.author === "assistant" && lastReply.get(entry.turnId) === index && !(responding && entry.turnId === activeTurnId) ? isoSeconds(times.completedAt) : null;
      if (at) entries[index] = { ...entry, timestamp: at };
    });
  }
  // The running turn's reply is the streaming message (c06cf64bb: the provisional entry while the stream is open).
  if (responding && activeTurnId) {
    // R4T-REG-01: another turn's assistant entry (a hook notice placed where it arrived) is not the stream.
    const at = entries.findLastIndex((entry) => entry.author !== "host" && !(entry.author === "assistant" && entry.turnId !== activeTurnId));
    const last = entries[at];
    if (last?.author === "assistant" && last.turnId === activeTurnId) entries[at] = { ...last, provisionalMessageId: last.id };
  }
  return entries;
}
