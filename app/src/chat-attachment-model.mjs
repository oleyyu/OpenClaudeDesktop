// w13-chatfn-attachments: what a Chat attachment becomes on its way to the model, and the Chat image budget.
// Pure: no DOM, no file system, no IPC (electron/document-convert.cjs does the conversion and the capture).
//
// Official 3.6556.2 evidence (research/w13-chatfn.md C2, C5, C6):
//  - C5 convert_document (shared-182 kM `/api/organizations/${t}/convert_document`): a PDF / Word / RTF / HTML / ODT file
//    is sent as its extracted text; the tile's file-type tag says "PDF converted to text" for a PDF (shared-7 "A/pPpSVBy1").
//    Here the text rides in the turn as one model-facing block, `<document name="…" path="…">…</document>`, and the
//    transcript shows the file again instead of the block (userMessageContent / shownPreview read it back).
//  - C6 image budget (shared-7 Cv / wv, shared-52 Fb {maxImagesPerConversation: 100, approachingImagesPerConversation: 80},
//    Xb `max_images_per_conversation` with serverCeiling 100): from ceil(max * 80 / 100) images on, the composer warns;
//    PDF pages count as images only behind `claudeai_image_cap_client_precheck` (shared-52 Ib; shared-182 xM adds a
//    SanitizedDocument's page_count). That gate is a new GrowthBook key and stays off here (D29/D31, R15).
//  - C2 Take a screenshot (c752b32f8 Fs: label "Take a screenshot", icon "Camera", testid "add-menu-screenshot" from na,
//    the capture's failure "Could not capture screen.").
import { t } from "../electron/i18n/index.mjs";

export const CONVERTIBLE_EXTENSIONS = Object.freeze(["pdf", "docx", "doc", "rtf", "html", "htm", "odt"]);
export const SCREENSHOT_LABEL = "Take a screenshot";
export const SCREENSHOT_ICON = "Camera";
export const SCREENSHOT_TESTID = "add-menu-screenshot";
export const SCREENSHOT_ERROR = "Could not capture screen.";
export const PDF_CONVERTED = "PDF converted to text";
export const IMAGE_LIMITS = Object.freeze({ max: 100, approaching: 80 });
export const IMAGE_PAGES_GATE = "claudeai_image_cap_client_precheck";
// Model-facing, never translated (like the attachment note): the block's tag and the cut marker.
export const DOCUMENT_TAG = "document";
// G5 (chatfn-attachments-05): the host's own mark on a block it wrote. Read-back only takes an opener that carries it,
// so a `<document name="…" path="…">` the user typed into the message stays text.
export const DOCUMENT_SOURCE = 'source="attachment"';
export const TRUNCATED_MARK = "[…truncated]";

export function extensionOf(name = "") {
  const base = String(name ?? "").split(/[\\/]/).pop() || "";
  const at = base.lastIndexOf(".");
  return at > 0 ? base.slice(at + 1).toLowerCase() : "";
}

/** A staged file Chat converts to text: a ready file entry (not a folder) with a convertible extension. */
export function isConvertibleEntry(entry) {
  return entry?.kind === "file" && entry.isDirectory !== true && typeof entry.path === "string" && !!entry.path
    && CONVERTIBLE_EXTENSIONS.includes(extensionOf(entry.name || entry.path));
}

/** Entries still waiting for a conversion: Chat only, not converted or refused yet, not already in flight. */
export function pendingConversions(entries, { surface, inFlight } = {}) {
  if (surface !== "chat") return [];
  const busy = inFlight instanceof Set ? inFlight : new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => isConvertibleEntry(entry) && entry.status === "ready"
    && !entry.converted && !entry.conversion && !busy.has(entry.id));
}

/** The markReady patch for a convert-document answer: {converted} on success, else {conversion: reason}. */
export function conversionPatch(result) {
  if (result?.ok === true && typeof result.text === "string" && result.text.trim()) {
    return { converted: { fileType: typeof result.fileType === "string" ? result.fileType : "", text: result.text,
      pages: Number.isFinite(result.pages) ? result.pages : null, truncated: result.truncated === true } };
  }
  return { conversion: typeof result?.reason === "string" && result.reason ? result.reason : "unreadable" };
}

/** The tile tooltip the official file tag carries for a converted PDF; null otherwise. */
export function convertedTooltip(entry) {
  return entry?.converted?.fileType === "pdf" ? t("PDF converted to text") : null;
}

const escapeAttribute = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/[\r\n]+/g, " ");
const unescapeAttribute = (value) => String(value ?? "").replace(/&lt;/g, "<").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
const CLOSE = `\n</${DOCUMENT_TAG}>`;
// Opener: "\n\n" (or the start of the text), the tag with name and path, optional pages / truncated attributes.
const OPENER = new RegExp(`(?:^|\\n\\n)<${DOCUMENT_TAG} name="([^"\\n]*)" path="([^"\\n]*)" ${DOCUMENT_SOURCE}((?: [a-z]+="[^"\\n]*")*)>\\n`, "gu");
const OPENER_AT = new RegExp(`(?:\\n\\n|^)<${DOCUMENT_TAG} name="([^"\\n]*)" path="([^"\\n]*)" ${DOCUMENT_SOURCE}((?: [a-z]+="[^"\\n]*")*)>\\n`, "uy");
// An opener whose attributes are complete (it reaches `>`) but lack the host's mark: typed by the user, not a block.
const UNMARKED_OPENER = new RegExp(`^<${DOCUMENT_TAG} name="[^"\\n]*" path="[^"\\n]*"(?! ${DOCUMENT_SOURCE})(?: [a-z]+="[^"\\n]*")*>`, "u");

/**
 * The model-facing block for one converted document. It opens with a blank line so it stays its own paragraph when a
 * core joins a message's text items, and a closing tag inside the text is neutralized so the block reads back whole.
 */
export function documentBlock({ name, path, text, pages, truncated } = {}) {
  const body = String(text ?? "").split(CLOSE.slice(1)).join(`<\\/${DOCUMENT_TAG}>`);
  const attributes = `${Number.isFinite(pages) && pages > 0 ? ` pages="${pages}"` : ""}${truncated ? ` truncated="true"` : ""}`;
  return `\n\n<${DOCUMENT_TAG} name="${escapeAttribute(name || extensionOf(path) || "document")}" path="${escapeAttribute(path)}" ${DOCUMENT_SOURCE}${attributes}>\n`
    + `${body}${truncated ? `\n${TRUNCATED_MARK}` : ""}${CLOSE}`;
}

/** The turn input item for a converted entry. */
export function documentInput(entry) {
  const converted = entry?.converted ?? {};
  return { type: "text", text: documentBlock({ name: entry?.name, path: entry?.path, text: converted.text, pages: converted.pages, truncated: converted.truncated }), text_elements: [] };
}

function parseChain(text, start) {
  const documents = [];
  let at = start;
  while (at < text.length) {
    OPENER_AT.lastIndex = at;
    const open = OPENER_AT.exec(text);
    if (!open) return null;
    const bodyAt = OPENER_AT.lastIndex;
    const close = text.indexOf(CLOSE, bodyAt);
    if (close < 0) return null;
    const pages = /\bpages="(\d+)"/.exec(open[3] || "");
    documents.push({ name: unescapeAttribute(open[1]), path: unescapeAttribute(open[2]), ...(pages ? { pages: Number(pages[1]) } : {}) });
    at = close + CLOSE.length;
  }
  return documents;
}

/** The text without its trailing document blocks, and the documents in order ({name, path, pages?}). */
export function splitDocumentBlocks(text) {
  const value = typeof text === "string" ? text : "";
  if (!value.includes(`<${DOCUMENT_TAG} name="`)) return { text: value, documents: [] };
  OPENER.lastIndex = 0;
  for (let match = OPENER.exec(value); match; match = OPENER.exec(value)) {
    const documents = parseChain(value, match.index);
    if (documents?.length) return { text: value.slice(0, match.index), documents };
  }
  return { text: value, documents: [] };
}

export function hasDocumentBlock(text) {
  return splitDocumentBlocks(text).documents.length > 0;
}

/** A thread preview cut anywhere inside the blocks: the text before them (cut), and the documents' names that are whole. */
export function previewWithoutDocuments(preview) {
  if (typeof preview !== "string") return { text: preview, names: [], cut: false };
  const marker = `<${DOCUMENT_TAG} name="`;
  let first = preview.indexOf(marker);
  // Skip openers the user typed: whole (they reach `>`) and without the host's mark. A cut opener can't be told apart.
  while (first >= 0 && UNMARKED_OPENER.test(preview.slice(first))) first = preview.indexOf(marker, first + marker.length);
  if (first < 0) return { text: preview, names: [], cut: false };
  const cut = first >= 2 && preview.slice(first - 2, first) === "\n\n" ? first - 2 : first;
  const names = [...preview.slice(first).matchAll(new RegExp(`<${DOCUMENT_TAG} name="([^"\\n]*)"`, "gu"))].map((match) => unescapeAttribute(match[1])).filter(Boolean);
  return { text: preview.slice(0, cut), names, cut: true };
}

const imageParts = (content) => (Array.isArray(content) ? content : []).filter((part) => part?.type === "localImage" || part?.type === "image").length;
const pageParts = (content) => (Array.isArray(content) ? content : []).reduce((sum, part) => (part?.type === "text" && typeof part.text === "string"
  ? sum + splitDocumentBlocks(part.text).documents.reduce((pages, entry) => pages + (entry.pages ?? 1), 0) : sum), 0);

/**
 * Images in the conversation plus the staged ones (Cv's o: Tv(files) + Tv(conversationFiles)); with `countPdfPages`
 * (the IMAGE_PAGES_GATE branch, xM) a converted PDF adds its page count, any other converted document one.
 */
export function conversationImageCount({ items = [], entries = [], countPdfPages = false } = {}) {
  let count = 0;
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.type !== "userMessage") continue;
    count += imageParts(item.content);
    if (countPdfPages) count += pageParts(item.content);
  }
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry?.kind === "image") count += 1;
    else if (countPdfPages && entry?.converted) count += entry.converted.fileType === "pdf" ? (entry.converted.pages ?? 1) : 1;
  }
  return count;
}

/** wv: the count the warning starts at, ceil(max * approaching / max-default). */
export function approachingImageCount(max = IMAGE_LIMITS.max) {
  return Math.ceil((max * IMAGE_LIMITS.approaching) / IMAGE_LIMITS.max);
}

/**
 * Cv's warning for `count` images: null below the threshold (or with no budget), else {key, text} where key is
 * "approaching" or "max" (Cv dismisses the two separately: `${conversation}` and `${conversation}:max`).
 */
export function imageLimitNotice(count, { max = IMAGE_LIMITS.max, countPdfPages = false } = {}) {
  if (!(max > 0) || !Number.isFinite(count) || count < approachingImageCount(max)) return null;
  const reached = count >= max;
  const text = countPdfPages
    ? (reached ? t("This chat has reached the {max}-image limit (including PDF pages). Start a new chat to add more.", { max })
      : t("This chat has {count} of {max} images (including PDF pages). Consider starting a new chat.", { count, max }))
    : (reached ? t("This chat has {max} or more images. If new images don’t send, start a new chat.", { max })
      : t("This chat has {count} of {max} images. Consider starting a new chat.", { count, max }));
  return { key: reached ? "max" : "approaching", text };
}
