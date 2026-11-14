// The "ultracode" keyword and the hidden workflow messages, shared by the composer (renderer) and main.
// findKeywordMatches is Claude Code 2.1.280's keyword detector `dm(text, keyword)` ported line for line: a match
// counts only in a human-typed prompt that doesn't start with "/", outside quotes, backticks, brackets, braces,
// parentheses and <tags>, not preceded by / \ - and not followed by / \ - ? or by "." and a word character.

const OPEN_TO_CLOSE = { "`": "`", '"': '"', "<": ">", "{": "}", "[": "]", "(": ")", "'": "'" };
const isWordChar = (ch) => !!ch && /[\p{L}\p{N}_]/u.test(ch);

/** Every standalone occurrence of `keyword`: [{word, start, end}]. */
export function findKeywordMatches(text, keyword) {
  const value = typeof text === "string" ? text : "";
  if (!new RegExp(keyword, "i").test(value)) return [];
  if (value.startsWith("/")) return [];
  const spans = [];
  let opener = null, spanStart = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (opener) {
      if (opener === "[" && ch === "[") { spanStart = i; continue; }
      if (ch !== OPEN_TO_CLOSE[opener]) continue;
      if (opener === "'" && isWordChar(value[i + 1])) continue;
      spans.push({ start: spanStart, end: i + 1 });
      opener = null;
    } else if ((ch === "<" && i + 1 < value.length && /[a-zA-Z/]/.test(value[i + 1])) || (ch === "'" && !isWordChar(value[i - 1])) || (ch !== "<" && ch !== "'" && ch in OPEN_TO_CLOSE)) {
      opener = ch;
      spanStart = i;
    }
  }
  const out = [];
  for (const match of value.matchAll(new RegExp(`\\b${keyword}\\b`, "gi"))) {
    if (match.index === undefined) continue;
    const start = match.index, end = start + match[0].length;
    if (spans.some((span) => start >= span.start && start < span.end)) continue;
    const before = value[start - 1], after = value[end];
    if (before === "/" || before === "\\" || before === "-") continue;
    if (after === "/" || after === "\\" || after === "-" || after === "?") continue;
    if (after === "." && isWordChar(value[end + 1])) continue;
    out.push({ word: match[0], start, end });
  }
  return out;
}
export const ultracodeMatches = (text) => findKeywordMatches(text, "ultracode");
export const hasUltracodeKeyword = (text) => ultracodeMatches(text).length > 0;

// A turn's hidden reminders and a finished workflow's notification reach the model as <system-reminder> text
// (electron/workflow-tool-model.mjs); the transcript never shows them as the user's words.
const REMINDER = /<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g;
export const isWorkflowNotificationText = (text) => typeof text === "string" && text.startsWith("<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]") && text.includes("<task-notification>");
/** The user's own text with hidden reminder blocks removed. */
export const withoutSystemReminders = (text) => typeof text === "string" && text.includes("<system-reminder>") ? text.replace(REMINDER, "").trim() : text;
/** The parts of a workflow notification the transcript shows: {status, summary, taskId} and, when the notification
 * carries one (<usage><duration_ms>), durationMs (the row's 'took {elapsed}'). */
export function workflowNotificationSummary(text) {
  if (!isWorkflowNotificationText(text)) return null;
  const tag = (name) => text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&") ?? null;
  const summary = { status: tag("status"), summary: tag("summary"), taskId: tag("task-id") };
  const duration = Number(tag("duration_ms"));
  if (tag("duration_ms") !== null && Number.isFinite(duration) && duration >= 0) summary.durationMs = duration;
  // A workflow agent's blocking question to the main agent, and a run's stall (the ZCode bridge's notices: <kind>).
  const kind = tag("kind");
  if (kind === "escalation" || kind === "stall" || kind === "settings") {
    summary.kind = kind;
    for (const [key, name] of [["workflow", "workflow"], ["agent", "agent"], ["question", "question"], ["context", "context"], ["reason", "reason"]]) {
      const value = tag(name);
      if (value !== null && value.trim()) summary[key] = value.trim();
    }
    const stalled = Number(tag("stalled_ms"));
    if (tag("stalled_ms") !== null && Number.isFinite(stalled) && stalled >= 0) summary.stalledMs = stalled;
  }
  return summary;
}
