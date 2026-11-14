import { grammarFailed, loadGrammar } from "./highlight-engine.mjs";
import { streamLightTheme, streamDarkTheme } from "./highlight-themes.mjs";
import { STREAM_LIMITS } from "./highlight-stream-model.mjs";

// Incremental fence tokenizer (official shiki-highlight worker oa/fa). One
// session per stream keeps the TextMate grammar state after each closed line
// and retokenizes the open line on every push; `recall` tells the client how
// many provisional open-line tokens to drop before appending the batch.
// Messages: {kind:"open",streamId,language} {kind:"push",streamId,seq,text}
// {kind:"close",streamId}. Replies: {kind:"batch",streamId,seq,recall,tokens}
// or {kind:"error",streamId,seq,reason}. Pushes are processed in arrival order.
const sessions = new Map();
const THEMES = { light: streamLightTheme.name, dark: streamDarkTheme.name };
const fallback = { light: streamLightTheme.colors["editor.foreground"], dark: streamDarkTheme.colors["editor.foreground"] };
const style = (variant, theme) => ({
  color: typeof variant?.color === "string" && variant.color ? variant.color.toLowerCase() : fallback[theme],
  fontStyle: Math.max(0, Number.isInteger(variant?.fontStyle) ? variant.fontStyle : 0),
});
const separator = (text) => ({ text, light: style(null, "light"), dark: style(null, "dark") });

function tokenizeLine(instance, session, line) {
  if (line === "") return [];
  const result = instance.codeToTokensWithThemes(line, {
    lang: session.language, themes: THEMES,
    ...(session.grammarState ? { grammarState: session.grammarState } : {}),
    tokenizeMaxLineLength: STREAM_LIMITS.maxLineUnits + 1,
    // Shiki's per-line default (500ms) can return a truncated line; the
    // client's text validation then ends the stream rather than showing gaps.
  });
  const tokens = [];
  for (const token of result[0] ?? []) {
    if (!token.content) continue;
    tokens.push({ text: token.content, light: style(token.variants?.light, "light"), dark: style(token.variants?.dark, "dark") });
  }
  return { tokens, grammarState: instance.getLastGrammarState(result) };
}

// (openLine + chunk).split("\n"): closed lines advance the grammar state; the
// trailing partial line is provisional and fully re-emitted next time.
function tokenizeChunk(instance, session, chunk) {
  const parts = (session.openLine + chunk).split("\n");
  const out = [];
  for (let index = 0; index < parts.length - 1; index += 1) {
    const raw = parts[index];
    const cr = raw.endsWith("\r");
    const line = cr ? raw.slice(0, -1) : raw;
    const result = tokenizeLine(instance, session, line);
    if (Array.isArray(result)) out.push(separator(cr ? "\r\n" : "\n"));
    else { out.push(...result.tokens); if (result.grammarState) session.grammarState = result.grammarState; out.push(separator(cr ? "\r\n" : "\n")); }
  }
  const open = parts[parts.length - 1];
  const result = tokenizeLine(instance, session, open);
  const openTokens = Array.isArray(result) ? result : result.tokens;
  out.push(...openTokens);
  const recall = session.openTokenCount;
  session.openLine = open;
  session.openTokenCount = openTokens.length;
  return { recall, tokens: out };
}

let queue = Promise.resolve();
async function handle(data) {
  if (data.kind === "close") { sessions.delete(data.streamId); return; }
  if (data.kind === "open") {
    if (typeof data.language !== "string" || sessions.has(data.streamId)) return;
    sessions.set(data.streamId, { language: data.language, ready: loadGrammar(data.language), grammarState: undefined, openLine: "", openTokenCount: 0 });
    return;
  }
  if (data.kind !== "push") return;
  const session = sessions.get(data.streamId);
  if (!session) { self.postMessage({ kind: "error", streamId: data.streamId, seq: data.seq, reason: "unknown-stream" }); return; }
  try {
    if (typeof data.text !== "string") throw new Error("invalid-text");
    const instance = await session.ready;
    if (!instance) throw new Error(grammarFailed(session.language) ? "grammar-error" : "unknown-language");
    const { recall, tokens } = tokenizeChunk(instance, session, data.text);
    self.postMessage({ kind: "batch", streamId: data.streamId, seq: data.seq, recall, tokens });
  } catch (error) {
    sessions.delete(data.streamId);
    self.postMessage({ kind: "error", streamId: data.streamId, seq: data.seq, reason: String(error?.message ?? "tokenizer-error").slice(0, 80) });
  }
}
self.addEventListener("message", ({ data }) => {
  if (!data || typeof data.kind !== "string" || !Number.isSafeInteger(data.streamId)) return;
  queue = queue.then(() => handle(data)).catch(() => {});
});
