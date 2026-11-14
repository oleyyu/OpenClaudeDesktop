// Input is the existing react-markdown v10 HAST pre node, not raw HTML.
// Keep parsing in react-markdown; this adapter only reads its text-only code child.
export function readMarkdownCodeBlock(node, source = "", isStreaming = false) {
  if (node?.type !== "element" || node.tagName !== "pre" || node.children?.length !== 1) return null;
  const code = node.children[0];
  if (code?.type !== "element" || code.tagName !== "code" || !Array.isArray(code.children)
    || code.children.some((child) => child.type !== "text" || typeof child.value !== "string")) return null;
  const rendered = code.children.map((child) => child.value).join("");
  // mdast-util-to-hast adds exactly one newline to nonempty code values.
  // Official ci uses the same single-newline removal, never trim/trimEnd.
  const text = rendered.endsWith("\n") ? rendered.slice(0, -1) : rendered;
  const classes = code.properties?.className;
  const languageClass = (Array.isArray(classes) ? classes : typeof classes === "string" ? classes.split(/\s+/) : [])
    .find((value) => typeof value === "string" && /^language-\S+$/.test(value));
  const language = languageClass?.slice(9) || "text";
  return { text, language, ...getCodeBlockState(node.position, source, isStreaming) };
}

export function getCodeBlockState(position, source, isStreaming) {
  if (!isStreaming) return { isFrontier: false, languageSettled: true, stateEvidence: "message-finished" };
  const start = position?.start?.offset;
  const end = position?.end?.offset;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > source.length)
    return { isFrontier: true, languageSettled: true, stateEvidence: "unknown-position" };
  if (source.slice(end).trim() !== "")
    return { isFrontier: false, languageSettled: true, stateEvidence: "later-content" };
  const tail = source.slice(start);
  const opening = /^(`{3,}|~{3,})[^\r\n]*/.exec(tail);
  if (!opening) return { isFrontier: true, languageSettled: true, stateEvidence: "tail-indented-or-unknown" };
  const languageSettled = /[\r\n]/.test(tail);
  if (!languageSettled)
    return { isFrontier: true, languageSettled: false, stateEvidence: "unfinished-opening-line" };
  const lineStart = Math.max(source.lastIndexOf("\n", start - 1), source.lastIndexOf("\r", start - 1)) + 1;
  const prefix = source.slice(lineStart, start);
  // Only certify a top-level closing fence. Nested blockquote/list containers
  // remain conservatively frontier until later content or message completion;
  // avoid guessing container syntax from delimiters inside literal code.
  if (!/^ {0,3}$/.test(prefix))
    return { isFrontier: true, languageSettled: true, stateEvidence: "nested-tail-conservative" };
  const lines = source.slice(start, end).split(/\r\n|\r|\n/);
  const last = lines.at(-1);
  const marker = opening[1][0];
  const closing = new RegExp(`^ {0,3}${marker}{${opening[1].length},}[\\t ]*$`);
  const closed = lines.length > 1 && closing.test(last);
  return { isFrontier: !closed, languageSettled: true, stateEvidence: closed ? "closing-fence" : "open-tail-fence" };
}
