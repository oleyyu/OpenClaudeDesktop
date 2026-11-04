// Transcript feed keyboard/screen-reader structure, the pure half of
// use-transcript-feed-nav.js. Claude 2.2553.1 scroll-messages-current.js:
// N9 (:60985-61288: roving article, arrow/Home/End keys, End re-pin, Escape,
// 'Message {position}', 'Currently streaming message', the instructions),
// j9/A9 (:60976-60981: only the first row of an assistant entry's item rows is
// an article), :63471 'Chat messages', :63957-63966 role=feed, :61757-61761
// article props, :56941-56953 x5 'Claude responded: {summary}', :39513-39521
// 'You said: {prompt}', and the af summary (c2fb08a02-DWV0GyaQ.js L/N).

export const FEED_LABEL = t("Chat messages"); // :63471 SCYmnElliz
export const FEED_INSTRUCTIONS = t("Use the up and down arrow keys to move between messages."); // :61282 ps3R1JlOBy
export const STREAMING_LABEL = t("Currently streaming message"); // :61239 QU+nmAt+Zt
// C2 persona: the visible copy reads the live assistant name (default "DeepSeek").
import { assistantName } from "./persona-store.mjs";
import { t } from "../electron/i18n/index.mjs";
export function messageLabel(position) {
  return t("Message {position}", { position }); // :61228 I6ViGOLib6
}
export function articleLabel({ position, streaming = false }) {
  return streaming ? STREAMING_LABEL : messageLabel(position);
}

// Rows in DOM order: {key, kind: 'user' | 'response' | 'boundary', hidden,
// turnStart}. A user row is one article. Consecutive response rows (tool
// steps, groups, thinking, assistant text) are one assistant entry split into
// item rows, and only the first visible one is the article (j9:
// !(IZ(e) && !e.isFirst)). A boundary (turn footer, error card, local command,
// approval, status) or a row that opens another turn ends the run; hidden rows
// are skipped without ending it.
export function feedArticles(rows) {
  const articles = [];
  let run = null;
  rows.forEach((row, rowIndex) => {
    if (row.kind === "boundary") { run = null; return; }
    if (row.hidden) return;
    if (row.kind === "user") {
      run = null;
      articles.push({ key: row.key, rowIndex, kind: "user", rows: [row.key] });
      return;
    }
    if (run && !row.turnStart) { run.rows.push(row.key); return; }
    run = { key: row.key, rowIndex, kind: "response", rows: [row.key] };
    articles.push(run);
  });
  return articles;
}

// N9 O: the remembered article while it is still a row, otherwise the last.
export function currentArticleIndex(articles, activeKey) {
  if (articles.length === 0) return -1;
  const found = activeKey == null ? -1 : articles.findIndex((article) => article.key === activeKey);
  return found >= 0 ? found : articles.length - 1;
}

// N9 G: the live tail answer while the turn responds.
export function isStreamingArticle(articles, index, responding) {
  return !!responding && index === articles.length - 1 && articles[index]?.kind === "response";
}

// cb50b3202 a (Bb): a plain, first, uncomposed Escape.
export function plainEscape(event) {
  return event.key === "Escape" && !event.repeat && !event.defaultPrevented && !event.isComposing
    && event.keyCode !== 229 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

// N9 I: what a feed keydown does.
//   null              — not ours (the browser keeps its default)
//   {type:'escape'}   — Escape inside an article (the hook checks ownership)
//   {type:'repin'}    — End on the focused last article: back to the tail
//   {type:'move', index, last} — focus another article (last: re-pin)
// ArrowUp/ArrowDown need the focus inside an article that was not just
// focused by a pointer; Home/End (also with Ctrl) work anywhere in the feed.
// Editable targets and focusable scrollers keep their keys.
export function feedKeyAction(event, { count, current, inArticle = false, focusInCurrent = false, pointerFocus = false, editable = false, scroller = false }) {
  if (event.key === "Escape") return inArticle ? { type: "escape" } : null;
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return null;
  const ctrlJump = event.ctrlKey && (event.key === "Home" || event.key === "End");
  if (event.shiftKey || event.altKey || event.metaKey || (event.ctrlKey && !ctrlJump) || editable || event.defaultPrevented) return null;
  if (scroller || count === 0) return null;
  const last = count - 1;
  const from = current < 0 || current > last ? last : current;
  const arrows = inArticle && !pointerFocus;
  let target;
  if (event.key === "ArrowDown") { if (!arrows) return null; target = Math.min(from + 1, last); }
  else if (event.key === "ArrowUp") { if (!arrows) return null; target = Math.max(from - 1, 0); }
  else target = event.key === "Home" ? 0 : last;
  if (target === from && focusInCurrent) return target === last && event.key === "End" ? { type: "repin" } : null;
  return { type: "move", index: target, last: target === last };
}

// N: strip a leading blank run and a leading fence, cap at 2000 units, and
// drop Markdown list/heading markers, code ticks, emphasis and link syntax.
function plainText(text) {
  const lines = text.split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") index += 1;
  if (lines[index]?.trimStart().startsWith("```")) {
    for (index += 1; index < lines.length && !lines[index].trimStart().startsWith("```");) index += 1;
    index += 1;
  }
  while (index < lines.length && lines[index].trim() === "") index += 1;
  return lines.slice(index).join("\n").slice(0, 2000)
    .replace(/^[ \t>]*(?:[#]{1,6}|[-*+]|\d+\.)\s+/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
}
// af (L): the first sentence of the first plain-text line, 160 units at most.
export function messageSummary(text) {
  if (typeof text !== "string" || text === "") return "";
  const plain = plainText(text).trimStart();
  const first = ((/^[^\n]*?[.!?](?=[\s\p{Pe}\p{Pf}\p{Pi}"']|$)/u.exec(plain) ?? /^[^\n]*/.exec(plain))?.[0] ?? plain).trim();
  return first.length > 160 ? `${first.slice(0, 159)}…` : first;
}
// :39513-39521 (Fe = af(prompt)) and :56941-56953 x5 with uQ's heading
// (af of the first 600 units of the entry's first text). No heading without
// a summary, and none on the answer that is still streaming (ahe).
export function promptHeading(text) {
  const summary = messageSummary(text);
  return summary ? t("You said: {summary}", { summary }) : null;
}
export function responseHeading(text, { streaming = false } = {}) {
  if (streaming || typeof text !== "string") return null;
  const summary = messageSummary(text.slice(0, 600));
  return summary ? t("{name} responded: {summary}", { name: assistantName(), summary }) : null;
}

// jumpPrevPrompt / jumpNextPrompt "cmd+alt+up" / "cmd+alt+down" (shared-21-D098Wd--.js:14186-14268, :15157-15170):
// the index of the user prompt to bring to the top, from each prompt's top edge relative to the scroller's top
// (in DOM order). Previous: the last prompt starting above the top band; next: the first starting below it. -1: none.
export function promptJumpIndex(tops, direction, band = 4) {
  if (!Array.isArray(tops) || !tops.length) return -1;
  if (direction < 0) {
    for (let index = tops.length - 1; index >= 0; index -= 1) if (tops[index] < -band) return index;
    return -1;
  }
  return tops.findIndex((top) => top > band);
}
