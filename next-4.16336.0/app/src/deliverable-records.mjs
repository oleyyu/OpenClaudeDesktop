import { appToolCall } from './agent-tool-titles.mjs';

/**
 * The files a finished SendUserFile call (OpenClaude Desktop's agent tools, agent-tools/files.mjs) sent: its result's
 * structuredContent.deliverables, or — for a core that drops structured content from its tool items (the bridges) —
 * the call's own `files`, each with the caption (the cards open them relative to the session folder). null otherwise.
 */
function sentFiles(item) {
  if (appToolCall(item)?.tool !== "SendUserFile" || item.status !== "completed" || item.result?.isError === true || item.error) return null;
  const structured = item.result?.structuredContent?.deliverables;
  if (Array.isArray(structured)) return structured;
  const files = Array.isArray(item.arguments?.files) ? item.arguments.files : typeof item.arguments?.files === "string" ? [item.arguments.files] : [];
  const caption = typeof item.arguments?.caption === "string" ? item.arguments.caption.trim() : "";
  return [...new Set(files.filter((file) => typeof file === "string" && file.trim()).map((file) => file.trim()))].map((file) => ({ path: file, ...(caption ? { description: caption } : {}) }));
}

/**
 * w13-close-main-process (closeout coworkfn-tools-02): the files a finished present_files call (Cowork's tool,
 * agent-tools/cowork.mjs) showed — its result's structuredContent.deliverables, or, for a core that drops structured
 * content, the absolute paths its result text lists (one per content part, the tool's own answer). The call is in the
 * core's history, so its cards come back when the session is reopened (the turn-end `present` card is the app's own).
 */
function presentedFiles(item) {
  if (appToolCall(item)?.tool !== "present_files" || item.status !== "completed" || item.result?.isError === true || item.error) return null;
  const structured = item.result?.structuredContent?.deliverables;
  if (Array.isArray(structured)) return structured;
  const paths = (Array.isArray(item.result?.content) ? item.result.content : []).filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim()).filter((text) => text.startsWith("/") && !text.includes("\n"));
  return [...new Set(paths)].map((file) => ({ path: file, title: file.split("/").pop() || file }));
}

/** The deliverables of a `present` call item (codeDesktop.deliverables), a SendUserFile or a present_files call, or null. */
export function itemDeliverables(item) {
  const files = (item?.type === "dynamicToolCall" ? item.codeDesktop?.deliverables : null) ?? (item?.type === "mcpToolCall" || item?.type === "dynamicToolCall" ? sentFiles(item) ?? presentedFiles(item) : null);
  return Array.isArray(files) && files.some((file) => typeof file?.path === "string" && file.path) ? files.filter((file) => typeof file?.path === "string" && file.path) : null;
}

