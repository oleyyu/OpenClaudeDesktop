// Watch-record, "Record a skill" (docs/computer-use-official-spec-20261021.md §2.4): the renderer's pure pieces.
//
//   - the start answer → what the entry does (official shared-6 Sz `re`: needs-mac-permissions opens the permissions
//     dialog, needs-cu-opt-in / remote-session-unsupported show their notice, started arms the delivery);
//   - the delivered message → the "Recorded demonstration · N.Ns" card (official cc1aae219 bO and its parser, shared-52
//     Bz zz Lz qz Jz Xz Nz Yz; cc1aae219 lO uO gO).
//
// The parser reads a Codex userMessage's content (text, localImage {path}, image {url}) instead of Anthropic content
// blocks: an image part is turned into a src as it is read. Codex keeps a live message's parts in the order they were
// sent, so a message whose images sit between its texts is read in content order; a message whose images all come after
// the text (a core that joins the text when it reads history back) is reflowed as the original reflows a flattened
// {message, images} (Xz: images spread evenly over the "full screen" / "changed region" lines).
import { localImageSource } from "./media-item-model.mjs";

// A_ (main) and the renderer's own legacy codes.
export const START_RESULT = Object.freeze({ Started: "started", Cancelled: "cancelled", NeedsMacPermissions: "needs-mac-permissions",
  RemoteSessionUnsupported: "remote-session-unsupported" });

/**
 * re's switch over startWatchRecording's answer: {kind: "permissions"} opens the macOS permissions dialog (and the
 * dialog's Continue retries with resumeRecord), {kind: "notice", message} shows a notice, {kind: "started"} arms the
 * delivery; anything else (cancelled, a dismissed chooser) does nothing.
 */
export function startOutcome(result) {
  if (result === START_RESULT.NeedsMacPermissions || result === "needs-screen-recording" || result === "needs-accessibility") return { kind: "permissions" };
  if (result === "needs-cu-opt-in") return { kind: "notice", message: "needsCuOptIn" };
  if (result === START_RESULT.RemoteSessionUnsupported) return { kind: "notice", message: "remoteSessionUnsupported" };
  if (result === START_RESULT.Started) return { kind: "started" };
  return { kind: "none" };
}

// ---- the demonstration message (shared-52) ----

// xz / Sz
export const TAG = "watch-record-demonstration";
// wz Tz Ez Dz Oz: the leads, short and full.
export const SKILL_LEAD_SHORT = "I recorded a demonstration of a desktop workflow for you to learn from.";
export const SKILL_LEAD = `${SKILL_LEAD_SHORT} The blocks below are a chronological trajectory: timestamped action descriptions interleaved with images of the screen state.`;
export const EVENTS_LEAD = "I recorded a demonstration for you to learn from.";
export const CONTEXT_LEAD_SHORT = "I'm showing you my screen and talking you through it as context for what I'm asking.";
export const CONTEXT_LEAD = `${CONTEXT_LEAD_SHORT} The blocks below are what I showed and said, in order: timestamped action descriptions interleaved with images of the screen state, trimmed to the parts I kept.`;
// cc1aae219 aO (the lead shown above the card) and oO (lines the card leaves out once that lead is shown).
const SHOWN_LEADS = [SKILL_LEAD_SHORT, EVENTS_LEAD, CONTEXT_LEAD_SHORT];
const HIDDEN_LEADS = [SKILL_LEAD, SKILL_LEAD_SHORT, EVENTS_LEAD, CONTEXT_LEAD, CONTEXT_LEAD_SHORT];

// Fz / Iz
const OPEN_TAG = new RegExp(String.raw`<${TAG}(?=[\s>])([^<>\n]*)>`, "y");
const CLOSING = /<\/watch-record-demonstration>\s*(?:<system-reminder>[^<]*<\/system-reminder>\s*)?$|<system-reminder>[^<]*<\/system-reminder>\s*$/;

/** Nz: `count` evenly spaced indexes out of `total`. */
export function evenlySpaced(total, count) {
  if (total <= 0 || count <= 0) return [];
  if (total <= count) return Array.from({ length: total }, (_value, index) => index);
  if (count === 1) return [0];
  const out = [];
  for (let index = 0; index < count; index++) out.push(Math.round((index * (total - 1)) / (count - 1)));
  return out;
}
/** zz: the opening tag at `at` and its attributes, or null. */
function tagAt(text, at) {
  OPEN_TAG.lastIndex = at;
  const match = OPEN_TAG.exec(text);
  if (!match) return null;
  const attrs = match[1];
  const duration = attrs.match(/\bdurationMs="(\d+)"/)?.[1], steps = attrs.match(/\bsteps="(\d+)"/)?.[1];
  const images = attrs.match(/\bimages="(\d+)"/)?.[1], purpose = attrs.match(/\bpurpose="(context)"/)?.[1];
  if (duration === undefined || steps === undefined) return null;
  return { durationMs: Number(duration), steps: Number(steps), imageCount: images === undefined ? 0 : Number(images), imageCountDeclared: images !== undefined,
    ...(purpose === "context" ? { purpose } : {}), body: text.slice(at + match[0].length) };
}
/** Bz: the first opening tag that starts the text or a line. */
export function findDemonstrationTag(text) {
  if (typeof text !== "string") return null;
  const open = `<${TAG}`, first = text.search(/\S/);
  for (let at = text.indexOf(open); at >= 0; at = text.indexOf(open, at + 1)) {
    const tag = at === first || text[at - 1] === "\n" ? tagAt(text, at) : null;
    if (tag) return { at, tag };
  }
  return null;
}
/** Lz: the text without the closing tag and its system reminder. */
const withoutClosing = (text) => text.replace(CLOSING, "");

/** An image part of a Codex userMessage (or an Anthropic block, as the original reads) → its src, or null. */
export function imageSource(part) {
  if (!part || typeof part !== "object") return null;
  if (part.type === "localImage") return localImageSource(part.path) ?? (typeof part.imageUrl === "string" ? part.imageUrl : null);
  if (part.type === "image") {
    if (typeof part.url === "string" && part.url) return part.url;
    if (typeof part.image_url === "string" && part.image_url) return part.image_url;
    if (part.source?.type === "base64" && typeof part.source.data === "string" && typeof part.source.media_type === "string") return `data:${part.source.media_type};base64,${part.source.data}`;
  }
  return null;
}
const isText = (part) => part?.type === "text" && typeof part.text === "string";
const isImage = (part) => imageSource(part) !== null;

// Yz: the meta line before each picture.
const IMAGE_META = /^\[\d+(?:\.\d+)?s\] (?:full screen|changed region) .+\):$/;
/** Xz: the text lines, with the images spread evenly over the picture meta lines (a flattened message). */
function reflow(blocks) {
  const images = [], lines = [];
  for (const block of blocks) {
    if (block.type === "image") images.push(block.src);
    else for (const line of block.text.split("\n")) { const trimmed = line.trim(); if (trimmed) lines.push(trimmed); }
  }
  const metaCount = lines.filter((line) => IMAGE_META.test(line)).length;
  const placed = new Set(evenlySpaced(metaCount, images.length));
  const out = [];
  let next = 0, meta = 0;
  for (const line of lines) {
    out.push({ type: "text", text: line });
    if (IMAGE_META.test(line) && placed.has(meta++) && next < images.length) out.push({ type: "image", src: images[next++] });
  }
  while (next < images.length) out.push({ type: "image", src: images[next++] });
  return out;
}

/**
 * qz over a userMessage's content: {durationMs, steps, imageCount, purpose?, userText?, blocks [{type: text|image}],
 * modelText} or null when the message is not a recorded demonstration. `order`: "content" keeps the parts' order,
 * "reflow" spreads the images over the meta lines, "auto" (default) reads content order when an image sits between
 * texts.
 */
export function parseDemonstration(content, { order = "auto" } = {}) {
  if (!Array.isArray(content)) return null;
  let tagIndex = -1, tag = null;
  const before = [];
  let userText = "";
  for (let index = 0; index < content.length && tag === null; index++) {
    const part = content[index];
    if (!isText(part)) continue;
    const found = findDemonstrationTag(part.text);
    if (found === null) { before.push(part.text); continue; }
    tag = found.tag;
    tagIndex = index;
    before.push(part.text.slice(0, found.at));
    userText = before.join("\n").trim();
  }
  if (tag === null) return null;
  // The original reads a message with words before the tag, or a part that is neither text nor image, as not a card.
  if (before.join("").trim() !== "" || content.some((part) => !isText(part) && !isImage(part))) return null;
  const imageAfterText = content.some((part, index) => isImage(part) && content.slice(index + 1).some(isText));
  const contentOrder = order === "content" || (order === "auto" && imageAfterText);
  const blocks = [], modelText = [];
  for (let index = 0; index < content.length; index++) {
    const part = content[index];
    if (isText(part)) modelText.push(part.text);
    if (index < tagIndex) continue;
    if (isText(part)) {
      const text = withoutClosing(index === tagIndex ? tag.body : part.text).trim();
      if (text) blocks.push({ type: "text", text });
    } else blocks.push({ type: "image", src: imageSource(part) });
  }
  return { durationMs: tag.durationMs, steps: tag.steps, imageCount: tag.imageCount, ...(tag.purpose ? { purpose: tag.purpose } : {}),
    ...(userText ? { userText } : {}), blocks: contentOrder ? blocks : reflow(blocks), modelText: modelText.join("\n") };
}

// ---- the card's rows (cc1aae219) ----

// sO
const STAMPED = /^\[(\d+(?:\.\d+)?)s\]\s*(.*)$/;
/** cO: a JSON-quoted string read back, or the text as it is. */
function unquote(value) {
  if (!value) return value;
  try { const parsed = JSON.parse(value); return typeof parsed === "string" ? parsed : value; } catch { return value; }
}
/** lO: a timestamped action line → {tSec, icon, verb, app?, typed?}, or null. */
export function actionRow(text) {
  const match = text.match(STAMPED);
  if (!match) return null;
  const tSec = match[1], rest = match[2];
  const inApp = rest.match(/ in ("(?:[^"\\]|\\.)*")\s*$/);
  const app = unquote(inApp?.[1]);
  const action = inApp ? rest.slice(0, inApp.index) : rest;
  if (/^right-clicked\b/.test(action)) return { tSec, icon: "Cursor", verb: "Right-clicked", app };
  if (/^clicked\b/.test(action)) return { tSec, icon: "Cursor", verb: "Clicked", app };
  if (/^dragged\b/.test(action)) return { tSec, icon: "Cursor", verb: "Dragged", app };
  if (/^scrolled( up| down)?\b/.test(action)) return { tSec, icon: "Scroll", verb: `Scrolled${action.match(/^scrolled( up| down)?/)?.[1] ?? ""}`, app };
  const typed = action.match(/^typed ("(?:[^"\\]|\\.)*")/);
  if (typed) return { tSec, icon: "Keyboard", verb: "Typed", typed: unquote(typed[1]) };
  if (/^pressed\b/.test(action)) return { tSec, icon: "Keyboard", verb: action.replace(/^p/, "P") };
  const switched = action.match(/^switched to ("(?:[^"\\]|\\.)*")/);
  return switched ? { tSec, icon: "ArrowRight", verb: "Switched to", app: unquote(switched[1]) } : null;
}
/** uO: a picture's meta line → "Screenshot · 3.2s" / "Changed region · 3.2s", or null. */
export function captionRow(text) {
  const match = text.match(STAMPED);
  if (!match) return null;
  return /^full screen\b/.test(match[2]) ? `Screenshot · ${match[1]}s` : /^changed region\b/.test(match[2]) ? `Changed region · ${match[1]}s` : null;
}
/** gO: the card's rows — image, action, caption or note (a lead the bubble already shows is left out). */
export function demonstrationRows(parsed, shownLead) {
  const rows = [];
  for (const block of parsed.blocks) {
    if (block.type === "image") { rows.push({ kind: "image", src: block.src }); continue; }
    const action = actionRow(block.text);
    if (action) { rows.push({ kind: "action", action }); continue; }
    const caption = captionRow(block.text);
    if (caption) { rows.push({ kind: "caption", text: caption }); continue; }
    if (shownLead && HIDDEN_LEADS.includes(block.text)) continue;
    rows.push({ kind: "note", text: block.text });
  }
  return rows;
}
/** bO's S: the user's own words before the tag, else the lead the first text block starts with. */
export function demonstrationLead(parsed) {
  const first = parsed.blocks.find((block) => block.type === "text");
  return parsed.userText ?? (first ? SHOWN_LEADS.find((lead) => first.text.startsWith(lead)) ?? null : null);
}
/** dO's label: "Clicked in " + app, "Switched to " + app, or the verb alone. */
export function actionLabel(action) {
  return action.app ? `${action.verb}${action.verb === "Switched to" ? " " : " in "}` : action.verb;
}
/** Mz's title for a session a recording starts: "Recorded demonstration (12.3s)". */
export function demonstrationTitle(durationMs) {
  return Number.isFinite(durationMs) ? `Recorded demonstration (${(durationMs / 1e3).toFixed(1)}s)` : "Recorded demonstration";
}
/** The duration in the message's own header (uc(e.message)?.durationMs), or undefined. */
export function demonstrationDuration(message) {
  return findDemonstrationTag(typeof message === "string" ? message : "")?.tag.durationMs;
}

// A transcript userMessage → its parsed demonstration, or null (cached per content array; most messages are rejected
// by a substring check before any parsing).
const parsedByContent = new WeakMap();
export function demonstrationOf(item) {
  const content = item?.type === "userMessage" ? item.content : null;
  if (!Array.isArray(content) || !content.some((part) => part?.type === "text" && typeof part.text === "string" && part.text.includes(`<${TAG}`))) return null;
  if (!parsedByContent.has(content)) parsedByContent.set(content, parseDemonstration(content));
  return parsedByContent.get(content);
}
